/** Private, synthetic appointment/supply/handoff coordination; no cat status writes. */
const TEAM = new Set(['admin', 'coordinator', 'volunteer']);
const MANAGERS = new Set(['admin', 'coordinator']);
const AREAS = new Set(['Little Havana', 'Little River', 'North Miami', 'Fort Lauderdale', 'Miami Beach', 'Hialeah', 'Homestead', 'Hollywood / Broward']);

function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function user(session, manager = false) {
  const id = Number(session?.user?.id ?? session?.userId);
  const role = session?.user?.role;
  if (!Number.isInteger(id) || id < 1 || !TEAM.has(role) || (manager && !MANAGERS.has(role))) fail(manager ? 'Coordinator or admin access required' : 'Internal team access required', 403);
  return { id, role, manager: MANAGERS.has(role) };
}
function value(value, choices, label) { if (!choices.includes(value)) fail(`Invalid ${label}`); return value; }
function id(value, label) { const result = String(value ?? '').trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(result)) fail(`Invalid ${label}`); return result; }
function copy(value, label, max = 1000) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max) fail(`Invalid ${label}`);
  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}|\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b|-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}|(?:lat(?:itude)?|lon(?:gitude)?|lng)\s*[:=]?\s*-?\d/i.test(result)) fail('Use fictional details without contacts, street addresses, or coordinates');
  return result;
}
function timestamp(value, label) { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail(`Invalid ${label}`); return new Date(value).toISOString(); }
function positive(value, label, zero = false) { if (value == null || String(value).trim() === '') fail(`Invalid ${label}`); const result = Number(value); if (!Number.isInteger(result) || result < (zero ? 0 : 1) || result > 500) fail(`Invalid ${label}`); return result; }
function synthetic(input) { if (input?.synthetic !== true) fail('Only explicitly fictional demo records are accepted'); }
function stmt(db, sql, ...params) { if (!db?.prepare) fail('Database unavailable', 503); return db.prepare(sql).bind(...params); }
async function first(db, sql, ...params) { return await stmt(db, sql, ...params).first(); }
async function all(db, sql, ...params) { return (await stmt(db, sql, ...params).all()).results ?? []; }
async function batch(db, statements) { if (!db?.batch) fail('Atomic database updates required', 503); return db.batch(statements); }
function changes(result) { return Number(result?.meta?.changes ?? 0); }
function event(db, kind, entityId, actorId, action, details, now, conditional = false) {
  return stmt(db, `INSERT INTO field_tool_events(id,entity_kind,entity_id,actor_id,action,detail_json,created_at) SELECT ?,?,?,?,?,?,?${conditional ? ' WHERE changes()=1' : ''}`, crypto.randomUUID(), kind, entityId, actorId, action, JSON.stringify(details), now);
}
async function member(db, input) {
  const memberId = positive(input, 'assigned team member');
  const found = await first(db, "SELECT id FROM users WHERE id=? AND role IN ('admin','coordinator','volunteer') AND disabled_at IS NULL", memberId);
  if (!found) fail('Assigned team member unavailable', 409);
  return memberId;
}
async function cat(db, input) {
  const key = id(input, 'cat record');
  if (!await first(db, "SELECT cat_key FROM canonical_cats WHERE cat_key=? AND canonical_cat_key=cat_key AND status IN ('active','missing')", key)) fail('Choose an active canonical cat record', 409);
  return key;
}
async function colony(db, input) {
  const key = id(input, 'colony');
  if (!await first(db, "SELECT colony_key FROM canonical_colonies WHERE colony_key=? AND status!='inactive'", key)) fail('Choose an active stored colony', 409);
  return key;
}

export async function listFieldTools({ db, session, now = new Date().toISOString() }) {
  const actor = user(session);
  const appointments = await all(db, `SELECT a.*,u.email AS assigned_email FROM field_appointments a JOIN users u ON u.id=a.assigned_user_id ${actor.manager ? '' : 'WHERE a.assigned_user_id=?'} ORDER BY CASE a.status WHEN 'scheduled' THEN 0 WHEN 'arrived' THEN 1 ELSE 2 END,julianday(a.due_at) LIMIT 200`, ...(actor.manager ? [] : [actor.id]));
  const supplies = await all(db, 'SELECT s.*,c.broad_area,COALESCE((SELECT SUM(p.quantity) FROM supply_pledges p WHERE p.request_id=s.id),0) AS pledged_quantity,COALESCE((SELECT p.quantity FROM supply_pledges p WHERE p.request_id=s.id AND p.user_id=?),0) AS my_pledge FROM supply_requests s JOIN canonical_colonies c ON c.colony_key=s.colony_key ORDER BY CASE s.status WHEN \'open\' THEN 0 ELSE 1 END,julianday(s.needed_by) LIMIT 200', actor.id);
  const handoffs = await all(db, 'SELECT h.*,u.email AS owner_email,(SELECT COUNT(*) FROM handoff_acknowledgements a WHERE a.handoff_id=h.id) AS acknowledgement_count,EXISTS(SELECT 1 FROM handoff_acknowledgements a WHERE a.handoff_id=h.id AND a.user_id=?) AS acknowledged_by_me FROM daily_handoffs h JOIN users u ON u.id=h.owner_user_id ORDER BY CASE h.status WHEN \'open\' THEN 0 ELSE 1 END,CASE h.priority WHEN \'urgent\' THEN 0 ELSE 1 END,h.created_at DESC LIMIT 200', actor.id);
  return {
    synthetic: true, role: actor.role, userId: actor.id,
    appointments: appointments.map(item => ({ ...item, reminder: ['scheduled','arrived'].includes(item.status) ? Date.parse(item.due_at) < Date.parse(now) ? 'overdue_confirmation' : Date.parse(item.due_at)-Date.parse(now) <= 86400000 ? 'due_within_24h' : 'upcoming' : null })),
    supplies: supplies.map(item => ({ ...item, unpledged_quantity: Math.max(0,item.quantity-item.pledged_quantity) })),
    handoffs,
    disclaimer: 'Fictional team coordination only. Appointment completion does not document medical or TNR outcomes. Reminders appear here; no messages are sent.'
  };
}

export async function createAppointment({ db, session, input, now = new Date().toISOString() }) {
  const actor = user(session, true); synthetic(input);
  const catKey = await cat(db, input.catKey), assignedUserId = await member(db,input.assignedUserId);
  const kind = value(input.kind, ['vet','tnr','follow_up'], 'appointment type');
  const title = copy(input.title,'appointment title',140), clinic = copy(input.clinicLabel,'fictional clinic label',120);
  if (!AREAS.has(input.broadArea)) fail('Choose a supported broad demo area');
  const dueAt = timestamp(input.dueAt,'appointment time'), appointmentId = crypto.randomUUID();
  await batch(db,[stmt(db,"INSERT INTO field_appointments(id,cat_key,kind,title,clinic_label,broad_area,due_at,assigned_user_id,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",appointmentId,catKey,kind,title,clinic,input.broadArea,dueAt,assignedUserId,actor.id,now,now),event(db,'appointment',appointmentId,actor.id,'created',{catKey,kind,assignedUserId,dueAt},now)]);
  return { ok:true,id:appointmentId,status:'scheduled' };
}

export async function updateAppointment({ db, session, input, now = new Date().toISOString() }) {
  const actor = user(session); const appointmentId = id(input?.id,'appointment');
  const action = value(input.action,['arrive','complete','cancel'],'appointment action');
  if (action !== 'arrive' && !actor.manager) fail('A manager records completion or cancellation',403);
  const evidence = copy(input.evidence,'appointment evidence',700);
  const next = { arrive:'arrived',complete:'completed',cancel:'cancelled' }[action];
  const update = stmt(db,"UPDATE field_appointments SET status=?,evidence_note=?,updated_at=? WHERE id=? AND status IN ('scheduled','arrived') AND (?=1 OR assigned_user_id=?) AND (?!='arrive' OR status='scheduled')",next,evidence,now,appointmentId,actor.manager?1:0,actor.id,action);
  const results = await batch(db,[update,event(db,'appointment',appointmentId,actor.id,action,{evidence},now,true)]);
  if(changes(results[0])!==1) fail('Appointment is closed, already updated, or not assigned to you',409);
  return {ok:true,id:appointmentId,status:next};
}

export async function createSupplyRequest({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session); synthetic(input);
  const colonyKey=await colony(db,input.colonyKey),kind=value(input.itemKind,['dry_food','wet_food','trap','carrier','litter','other'],'supply type');
  const quantity=positive(input.quantity,'supply quantity'),note=copy(input.note,'supply note',700),neededBy=timestamp(input.neededBy,'needed-by time'),requestId=crypto.randomUUID();
  await batch(db,[stmt(db,'INSERT INTO supply_requests(id,colony_key,item_kind,quantity,note,needed_by,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)',requestId,colonyKey,kind,quantity,note,neededBy,actor.id,now),event(db,'supply',requestId,actor.id,'requested',{colonyKey,kind,quantity},now)]);
  return {ok:true,id:requestId,status:'open'};
}

export async function pledgeSupply({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session),requestId=id(input?.id,'supply request'),quantity=positive(input.quantity,'pledge quantity',true);
  // One pledge per person. The guarded upsert counts other pledges in the same
  // atomic statement, so two volunteers cannot promise beyond the request.
  const upsert=stmt(db,"INSERT INTO supply_pledges(id,request_id,user_id,quantity,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM supply_requests s WHERE s.id=? AND s.status='open' AND ?+COALESCE((SELECT SUM(p.quantity) FROM supply_pledges p WHERE p.request_id=s.id AND p.user_id!=?),0)<=s.quantity) ON CONFLICT(request_id,user_id) DO UPDATE SET quantity=excluded.quantity,updated_at=excluded.updated_at",crypto.randomUUID(),requestId,actor.id,quantity,now,requestId,quantity,actor.id);
  const results=await batch(db,[upsert,event(db,'supply',requestId,actor.id,'pledged',{quantity},now,true)]);
  if(changes(results[0])!==1) fail('Request is closed or the pledge exceeds the remaining quantity',409);
  return {ok:true,id:requestId,myPledge:quantity};
}

export async function updateSupply({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session,true),requestId=id(input?.id,'supply request'),action=value(input.action,['fulfill','cancel'],'supply action'),evidence=copy(input.evidence,'supply resolution evidence',700);
  const next=action==='fulfill'?'fulfilled':'cancelled';
  const results=await batch(db,[stmt(db,"UPDATE supply_requests SET status=?,resolution_note=?,closed_at=? WHERE id=? AND status='open'",next,evidence,now,requestId),event(db,'supply',requestId,actor.id,action,{evidence},now,true)]);
  if(changes(results[0])!==1) fail('Supply request is unavailable or already closed',409);
  return {ok:true,id:requestId,status:next};
}

export async function createHandoff({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session);synthetic(input);
  const catKey=input.catKey?await cat(db,input.catKey):null,colonyKey=input.colonyKey?await colony(db,input.colonyKey):null;
  if(!catKey&&!colonyKey)fail('Link a cat or colony before posting a handoff');
  const owner=actor.manager?await member(db,input.ownerUserId):actor.id;
  const title=copy(input.title,'handoff title',140),detail=copy(input.detail,'handoff detail',1000),priority=value(input.priority??'normal',['normal','urgent'],'handoff priority'),handoffId=crypto.randomUUID();
  await batch(db,[stmt(db,'INSERT INTO daily_handoffs(id,cat_key,colony_key,title,detail,priority,owner_user_id,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)',handoffId,catKey,colonyKey,title,detail,priority,owner,actor.id,now),event(db,'handoff',handoffId,actor.id,'posted',{catKey,colonyKey,priority,owner},now)]);
  return {ok:true,id:handoffId,status:'open'};
}

export async function acknowledgeHandoff({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session),handoffId=id(input?.id,'handoff');
  const insert=stmt(db,"INSERT INTO handoff_acknowledgements(id,handoff_id,user_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM daily_handoffs WHERE id=? AND status='open') ON CONFLICT(handoff_id,user_id) DO NOTHING",crypto.randomUUID(),handoffId,actor.id,now,handoffId);
  const results=await batch(db,[insert,event(db,'handoff',handoffId,actor.id,'acknowledged',{},now,true)]);
  if(changes(results[0])===0 && !await first(db,'SELECT id FROM handoff_acknowledgements WHERE handoff_id=? AND user_id=?',handoffId,actor.id))fail('Handoff is unavailable or closed',409);
  return {ok:true,id:handoffId,acknowledged:true};
}

export async function closeHandoff({ db, session, input, now = new Date().toISOString() }) {
  const actor=user(session,true),handoffId=id(input?.id,'handoff'),evidence=copy(input.evidence,'handoff resolution',700);
  const results=await batch(db,[stmt(db,"UPDATE daily_handoffs SET status='closed',resolution_note=?,closed_at=? WHERE id=? AND status='open'",evidence,now,handoffId),event(db,'handoff',handoffId,actor.id,'closed',{evidence},now,true)]);
  if(changes(results[0])!==1)fail('Handoff is unavailable or already closed',409);
  return {ok:true,id:handoffId,status:'closed'};
}
