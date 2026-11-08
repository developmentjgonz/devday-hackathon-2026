import { getCanonicalWorkspace } from './census.js';
import { listFieldTools } from './field-tools.js';

const TEAM = new Set(['admin', 'coordinator', 'volunteer']);
function identity(session) {
  const id=Number(session?.userId ?? session?.user?.id);
  if (!Number.isInteger(id) || id < 1 || !TEAM.has(session?.user?.role)) {
    const error=new Error('Internal team access required'); error.status=403; throw error;
  }
  return id;
}
const rows = async (db, sql, ...params) => (await db.prepare(sql).bind(...params).all()).results ?? [];
const includes = (value, query) => String(value ?? '').toLocaleLowerCase().includes(query);

/** Search is private and query-bounded. Source results remain linked to evidence. */
export async function searchWorkspace({db, session, query='', kind='all', area=''}) {
  identity(session);
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 120 || !['all','cats','colonies','reports'].includes(kind) || typeof area !== 'string' || area.length > 80) {
    const error=new Error('Enter 2–120 characters and a valid search category');error.status=400;throw error;
  }
  const q=query.trim().toLocaleLowerCase();
  const workspace=await getCanonicalWorkspace(db);
  const colonies=workspace.colonies.filter(row=>(!area||row.broad_area===area)&&includes(`${row.colony_key} ${row.broad_area}`,q));
  const cats=workspace.cats.filter(row=>row.status!=='merged'&&(!area||row.colonies.some(key=>workspace.colonies.some(colony=>colony.colony_key===key&&colony.broad_area===area)))&&includes(`${row.cat_key} ${row.name} ${row.description} ${row.tnr} ${row.medical} ${row.status}`,q));
  const escaped=q.replace(/[\\%_]/g, '\\$&');
  const reports=kind==='all'||kind==='reports' ? await rows(db, `SELECT o.id,m.trace_id,m.body_redacted,m.broad_area,m.received_at,o.urgency FROM intake_observations o JOIN intake_source_messages m ON m.id=o.source_message_id WHERE (lower(m.body_redacted) LIKE ? ESCAPE '\\' OR lower(m.trace_id) LIKE ? ESCAPE '\\') AND (?='' OR m.broad_area=?) ORDER BY julianday(m.received_at) DESC LIMIT 50`, `%${escaped}%`, `%${escaped}%`,area,area) : [];
  return { synthetic:true, query:query.trim(), areas:[...new Set(workspace.colonies.map(row=>row.broad_area))].sort(), results:[
    ...(kind==='all'||kind==='cats'?cats.slice(0,50).map(row=>({kind:'cat',id:row.cat_key,title:row.name,detail:row.description,context:`${row.status} · ${row.tnr} · ${row.colonies.join(', ')||'Unmatched colony'}`,at:row.last_seen_at,view:'cats'})):[]),
    ...(kind==='all'||kind==='colonies'?colonies.slice(0,50).map(row=>({kind:'colony',id:row.colony_key,title:row.colony_key,detail:row.broad_area,context:`${row.cat_count} identified cats · ${row.tnr_pending} TNR pending · ${row.needs_vet} care reviews`,at:row.last_fed_at,view:'map'})):[]),
    ...reports.map(row=>({kind:'report',id:row.id,title:row.trace_id,detail:row.body_redacted,context:`${row.broad_area} · ${row.urgency}`,at:row.received_at,view:'intake-review'})),
  ],limitPerKind:50,disclaimer:'Private synthetic records only. Search results are evidence leads, not identity confirmations.' };
}

/** A personal agenda never broadens a manager or volunteer's assignment scope. */
export async function getMyShift({db,session,now=new Date().toISOString()}) {
  const userId=identity(session);
  const [feedings,searches,clarifications,tools]=await Promise.all([
    rows(db,"SELECT id,colony_key,due_at,status FROM feeding_assignments WHERE assigned_user_id=? AND status='scheduled' ORDER BY julianday(due_at) LIMIT 100",userId),
    rows(db,"SELECT id,title,broad_area,due_at,status FROM search_tasks WHERE assigned_user_id=? AND status IN ('assigned','blocked') ORDER BY julianday(due_at) LIMIT 100",userId),
    rows(db,"SELECT c.id,c.observation_id,c.request_message,c.requested_at,m.broad_area FROM intake_clarifications c JOIN intake_observations o ON o.id=c.observation_id JOIN intake_source_messages m ON m.id=o.source_message_id WHERE c.assigned_user_id=? AND c.state='open' ORDER BY c.requested_at LIMIT 100",userId),
    listFieldTools({db,session,now}),
  ]);
  const items=[
    ...feedings.map(row=>({id:row.id,kind:'feeding',title:`Feeding visit · ${row.colony_key}`,area:row.colony_key,dueAt:row.due_at,status:row.status,view:'schedule'})),
    ...searches.map(row=>({id:row.id,kind:'search',title:row.title,area:row.broad_area,dueAt:row.due_at,status:row.status,view:'search-tasks'})),
    ...clarifications.map(row=>({id:row.id,observationId:row.observation_id,kind:'clarification',title:row.request_message,area:row.broad_area,dueAt:null,status:'reply_needed',view:'intake-review'})),
    ...tools.appointments.filter(row=>Number(row.assigned_user_id)===userId&&!['completed','cancelled'].includes(row.status)).map(row=>({id:row.id,kind:'appointment',title:row.title,area:row.broad_area,dueAt:row.due_at,status:row.status,view:'field-tools'})),
    ...tools.handoffs.filter(row=>Number(row.owner_user_id)===userId&&row.status==='open').map(row=>({id:row.id,kind:'handoff',title:row.title,area:row.colony_key||'Team handoff',dueAt:null,status:row.acknowledged_by_me?'acknowledged':'acknowledgement_needed',view:'field-tools'})),
  ].map(item=>({...item,overdue:Boolean(item.dueAt&&Date.parse(item.dueAt)<Date.parse(now))})).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.dueAt?Date.parse(a.dueAt):Infinity)-(b.dueAt?Date.parse(b.dueAt):Infinity));
  return {synthetic:true,userId,generatedAt:now,items,counts:{open:items.length,overdue:items.filter(item=>item.overdue).length,replyNeeded:clarifications.length},disclaimer:'Your assigned work only. An overdue confirmation is not proof a feeding was missed. Check current weather and public access before fieldwork.'};
}
