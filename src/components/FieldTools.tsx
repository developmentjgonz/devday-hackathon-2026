import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Check, ClipboardList, Package, RefreshCw } from 'lucide-react';
import { privateJson } from '../lib/private-api';
import './FieldTools.css';

type Tab = 'appointments' | 'supplies' | 'handoffs';
type Cat = { cat_key: string; canonical_cat_key?: string; name: string; status: string };
type Colony = { colony_key: string; broad_area: string };
type Member = { id: number; email: string };
type Appointment = { id: string; cat_key: string; kind: string; title: string; clinic_label: string; broad_area: string; due_at: string; assigned_email: string; status: string; reminder: string | null; evidence_note: string | null };
type Supply = { id: string; colony_key: string; broad_area: string; item_kind: string; quantity: number; note: string; needed_by: string; status: string; pledged_quantity: number; unpledged_quantity: number; my_pledge: number; resolution_note: string | null };
type Handoff = { id: string; cat_key: string | null; colony_key: string | null; title: string; detail: string; priority: string; owner_email: string; status: string; created_at: string; acknowledgement_count: number; acknowledged_by_me: number; resolution_note: string | null };
type Data = { role: string; userId: number; appointments: Appointment[]; supplies: Supply[]; handoffs: Handoff[]; disclaimer: string };
type Action = { path: string; id: string; action?: string; title: string };
const AREAS = ['Little Havana', 'Little River', 'North Miami', 'Fort Lauderdale', 'Miami Beach', 'Hialeah', 'Homestead', 'Hollywood / Broward'];
const items: Record<string, string> = { dry_food:'Dry food bags', wet_food:'Wet food cans', trap:'Humane traps', carrier:'Cat carriers', litter:'Litter bags', other:'Other units' };
const label = (value: string) => value.replaceAll('_', ' ');
const date = (value: string) => new Date(value).toLocaleString();
function iso(value: string) { const parsed = new Date(value); if (!Number.isFinite(parsed.valueOf())) throw new Error('Choose a valid date and time.'); return parsed.toISOString(); }

export function FieldTools() {
  const [tab, setTab] = useState<Tab>(() => {
    const stored = sessionStorage.getItem('mews-field-tools-tab');
    sessionStorage.removeItem('mews-field-tools-tab');
    return stored === 'supplies' || stored === 'handoffs' ? stored : 'appointments';
  });
  const [data, setData] = useState<Data | null>(null);
  const [cats, setCats] = useState<Cat[]>([]), [colonies, setColonies] = useState<Colony[]>([]), [team, setTeam] = useState<Member[]>([]);
  const [notice, setNotice] = useState('Sign in with an internal team account to load field coordination.');
  const [busy, setBusy] = useState(false), [action, setAction] = useState<Action | null>(null), [evidence, setEvidence] = useState('');
  const [pledges, setPledges] = useState<Record<string,string>>({});
  const [appointment, setAppointment] = useState({ catKey:'', kind:'vet', title:'', clinicLabel:'', broadArea:'Miami Beach', dueAt:'', assignedUserId:'' });
  const [supply, setSupply] = useState({ colonyKey:'', itemKind:'dry_food', quantity:'1', note:'', neededBy:'' });
  const [handoff, setHandoff] = useState({ catKey:'', colonyKey:'', title:'', detail:'', priority:'normal', ownerUserId:'' });
  const manager = data?.role === 'admin' || data?.role === 'coordinator';
  const refresh = useCallback(async () => {
    try {
      const next = await privateJson('/api/private/field-tools') as Data; setData(next);
      const census = await privateJson('/api/private/census');
      const currentCats = (census.cats ?? []).filter((cat:Cat) => cat.status !== 'merged' && cat.status !== 'deceased');
      setCats(currentCats); setColonies(census.colonies ?? []);
      setAppointment(current => ({ ...current,catKey:current.catKey || currentCats[0]?.cat_key || '' }));
      setSupply(current => ({ ...current,colonyKey:current.colonyKey || census.colonies?.[0]?.colony_key || '' }));
      if (['admin','coordinator'].includes(next.role)) {
        const members = (await privateJson('/api/private/team')).members as Member[]; setTeam(members);
        setAppointment(current => ({ ...current,assignedUserId:current.assignedUserId || String(members[0]?.id ?? '') }));
        setHandoff(current => ({ ...current,ownerUserId:current.ownerUserId || String(members[0]?.id ?? '') }));
      }
      setNotice('Stored team records refreshed. Reminder badges are in-app only.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load field tools.'); }
  }, []);
  useEffect(() => { void refresh(); const interval=setInterval(() => void refresh(),30000); const updated=()=>void refresh(); addEventListener('mews-data-changed',updated); return()=>{clearInterval(interval);removeEventListener('mews-data-changed',updated);}; }, [refresh]);
  async function mutate(path:string, body:object, success:string) {
    if(busy)return false; setBusy(true);
    try { await privateJson('/api/private/field-tools'+path,body); await refresh();setNotice(success);dispatchEvent(new Event('mews-data-changed'));return true; }
    catch(error){setNotice(error instanceof Error?error.message:'Unable to save the record.');return false;}
    finally{setBusy(false);}
  }
  function prepare(path:string,id:string,title:string,action?:string){setAction({path,id,title,action});setEvidence('');}
  function name(key:string|null){return key ? cats.find(cat=>cat.cat_key===key)?.name ?? key : '';}
  function submitAppointment(event:React.FormEvent) {
    event.preventDefault();
    try { void mutate('/appointments',{...appointment,synthetic:true,assignedUserId:Number(appointment.assignedUserId),dueAt:iso(appointment.dueAt)},'Fictional appointment scheduled. No medical outcome was changed.').then(ok=>{if(ok)setAppointment(current=>({...current,title:'',clinicLabel:'',dueAt:''}));}); }
    catch(error){setNotice(error instanceof Error?error.message:'Choose a valid appointment time.');}
  }
  function submitSupply(event:React.FormEvent) {
    event.preventDefault();
    try { void mutate('/supplies',{...supply,synthetic:true,quantity:Number(supply.quantity),neededBy:iso(supply.neededBy)},'Supply request saved for the team.').then(ok=>{if(ok)setSupply(current=>({...current,note:'',quantity:'1',neededBy:''}));}); }
    catch(error){setNotice(error instanceof Error?error.message:'Choose a valid needed-by time.');}
  }
  return <section className="field-tools panel" aria-labelledby="field-tools-title">
    <header className="field-tools-heading"><div><p className="eyebrow">Less coordination, more care</p><h1 id="field-tools-title">Field coordination</h1><p>Appointments, shared supplies, and a clear handoff for the next shift.</p></div><button className="secondary-button" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={15}/>Refresh</button></header>
    <p className="field-tools-notice" role="status">{notice}</p>
    {data && <>
      <div className="field-tool-tabs" role="tablist" aria-label="Field coordination tools">
        <button role="tab" aria-selected={tab==='appointments'} onClick={()=>{setTab('appointments');setAction(null);}}><CalendarDays size={17}/>Care appointments<span>{data.appointments.filter(item=>['scheduled','arrived'].includes(item.status)).length}</span></button>
        <button role="tab" aria-selected={tab==='supplies'} onClick={()=>{setTab('supplies');setAction(null);}}><Package size={17}/>Supply requests<span>{data.supplies.filter(item=>item.status==='open').length}</span></button>
        <button role="tab" aria-selected={tab==='handoffs'} onClick={()=>{setTab('handoffs');setAction(null);}}><ClipboardList size={17}/>Daily handoff<span>{data.handoffs.filter(item=>item.status==='open').length}</span></button>
      </div>
      <p className="source-note">Use fictional details and broad areas only. No contacts or street addresses. Each saved action is linked to the signed-in team account.</p>
      {tab==='appointments' && <div className={`field-tool-layout ${!manager?'single':''}`}>
        {manager && <form className="field-tool-form" onSubmit={submitAppointment}><h2>Schedule care logistics</h2><p>Coordinate a visit or transport. Record medical/TNR outcomes separately in Care outcomes.</p>
          <label>Cat<select required value={appointment.catKey} onChange={e=>setAppointment({...appointment,catKey:e.target.value})}><option value="" disabled>Choose a stored cat</option>{cats.map(cat=><option key={cat.cat_key} value={cat.cat_key}>{cat.name}</option>)}</select></label>
          <label>Visit type<select value={appointment.kind} onChange={e=>setAppointment({...appointment,kind:e.target.value})}><option value="vet">Vet visit</option><option value="tnr">TNR appointment</option><option value="follow_up">Follow-up visit</option></select></label>
          <label>Appointment title<input required maxLength={140} placeholder="Fictional follow-up transport" value={appointment.title} onChange={e=>setAppointment({...appointment,title:e.target.value})}/></label>
          <label>Fictional clinic label<input required maxLength={120} placeholder="Demo care partner" value={appointment.clinicLabel} onChange={e=>setAppointment({...appointment,clinicLabel:e.target.value})}/></label>
          <label>Broad area<select value={appointment.broadArea} onChange={e=>setAppointment({...appointment,broadArea:e.target.value})}>{AREAS.map(area=><option key={area}>{area}</option>)}</select></label>
          <label>Appointment time<input required type="datetime-local" value={appointment.dueAt} onChange={e=>setAppointment({...appointment,dueAt:e.target.value})}/></label>
          <label>Assigned team member<select required value={appointment.assignedUserId} onChange={e=>setAppointment({...appointment,assignedUserId:e.target.value})}>{team.map(member=><option key={member.id} value={member.id}>{member.email}</option>)}</select></label>
          <button className="primary-button" disabled={busy||!cats.length||!team.length}>Schedule fictional visit</button>
        </form>}
        <div className="field-tool-records"><h2>{manager?'Team appointments':'My appointments'}</h2>{!data.appointments.length&&<p className="field-tool-empty">No stored appointments yet. A coordinator can schedule the next fictional visit.</p>}{data.appointments.map(item=><article key={item.id} className={`field-tool-card ${item.reminder==='overdue_confirmation'?'attention':''}`}><div className="field-tool-card-top"><span className="badge">{label(item.status)}</span>{item.reminder&&<span className={`badge ${item.reminder==='overdue_confirmation'?'coral':'violet'}`}>{label(item.reminder)}</span>}</div><h3>{item.title}</h3><p><b>{name(item.cat_key)}</b> · {label(item.kind)} · {item.clinic_label}</p><small>{date(item.due_at)} · {item.broad_area}<br/>{item.assigned_email}</small>{item.evidence_note&&<p className="field-tool-evidence">Latest evidence: {item.evidence_note}</p>}<div className="shared-actions">{item.status==='scheduled'&&<button className="secondary-button" disabled={busy} onClick={()=>prepare('/appointments/update',item.id,'Confirm arrival at the fictional visit','arrive')}>Confirm arrival</button>}{manager&&['scheduled','arrived'].includes(item.status)&&<><button className="secondary-button" disabled={busy} onClick={()=>prepare('/appointments/update',item.id,'Record logistics completed; this does not resolve medical care','complete')}>Complete logistics</button><button className="secondary-button" disabled={busy} onClick={()=>prepare('/appointments/update',item.id,'Cancel appointment with a reason','cancel')}>Cancel visit</button></>}</div></article>)}</div>
      </div>}
      {tab==='supplies' && <div className="field-tool-layout">
        <form className="field-tool-form" onSubmit={submitSupply}><h2>Ask for supplies</h2><p>Quantities are item counts: bags, cans, traps, or carriers. A pledge is a promise; a manager confirms delivery.</p>
          <label>Colony<select required value={supply.colonyKey} onChange={e=>setSupply({...supply,colonyKey:e.target.value})}><option value="" disabled>Choose a stored colony</option>{colonies.map(colony=><option key={colony.colony_key} value={colony.colony_key}>{colony.broad_area} · {colony.colony_key}</option>)}</select></label>
          <label>Supply type<select value={supply.itemKind} onChange={e=>setSupply({...supply,itemKind:e.target.value})}>{Object.entries(items).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>
          <label>How many units?<input required type="number" min="1" max="500" value={supply.quantity} onChange={e=>setSupply({...supply,quantity:e.target.value})}/></label>
          <label>Needed by<input required type="datetime-local" value={supply.neededBy} onChange={e=>setSupply({...supply,neededBy:e.target.value})}/></label>
          <label>Fictional request details<textarea required maxLength={700} value={supply.note} onChange={e=>setSupply({...supply,note:e.target.value})} placeholder="What is needed and how should the team coordinate?"/></label>
          <button className="primary-button" disabled={busy||!colonies.length}>Post supply request</button>
        </form>
        <div className="field-tool-records"><h2>Shared supply board</h2>{!data.supplies.length&&<p className="field-tool-empty">No requests yet. Add a fictional food or equipment request to begin.</p>}{data.supplies.map(item=><article className="field-tool-card" key={item.id}><div className="field-tool-card-top"><span className="badge">{item.status}</span><small>Needed {date(item.needed_by)}</small></div><h3>{item.quantity} {items[item.item_kind]??item.item_kind}</h3><small>{item.broad_area} · {item.colony_key}</small><p>{item.note}</p><div className="supply-coverage"><span style={{width:`${Math.min(100,item.pledged_quantity/item.quantity*100)}%`}}/></div><p><b>{item.pledged_quantity}/{item.quantity}</b> pledged · {item.unpledged_quantity} unpledged</p>{item.resolution_note&&<p className="field-tool-evidence">Delivery / closure: {item.resolution_note}</p>}{item.status==='open'&&<><form className="field-tool-inline" onSubmit={event=>{event.preventDefault();void mutate('/supplies/pledge',{id:item.id,quantity:Number(pledges[item.id]??item.my_pledge)},'Your pledge was updated. No delivery was recorded.');}}><label>My total pledge<input type="number" min="0" max={item.unpledged_quantity+item.my_pledge} required value={pledges[item.id]??String(item.my_pledge)} onChange={event=>setPledges({...pledges,[item.id]:event.target.value})}/></label><button className="secondary-button" disabled={busy}>Save pledge</button></form>{manager&&<div className="shared-actions"><button className="secondary-button" disabled={busy} onClick={()=>prepare('/supplies/update',item.id,'Confirm the full requested supply was delivered','fulfill')}>Confirm delivered</button><button className="secondary-button" disabled={busy} onClick={()=>prepare('/supplies/update',item.id,'Cancel supply request with a reason','cancel')}>Cancel request</button></div>}</>}</article>)}</div>
      </div>}
      {tab==='handoffs' && <div className="field-tool-layout">
        <form className="field-tool-form" onSubmit={event=>{event.preventDefault();void mutate('/handoffs',{...handoff,synthetic:true,ownerUserId:Number(handoff.ownerUserId)},'Handoff posted. Acknowledgement records that it was read, not that the work was completed.').then(ok=>{if(ok)setHandoff(current=>({...current,title:'',detail:''}));});}}><h2>Leave a clear handoff</h2><p>Link at least one cat or colony. Volunteers own their notes; coordinators can assign another team member.</p>
          <label>Related cat<select value={handoff.catKey} onChange={e=>setHandoff({...handoff,catKey:e.target.value})}><option value="">No cat selected</option>{cats.map(cat=><option key={cat.cat_key} value={cat.cat_key}>{cat.name}</option>)}</select></label>
          <label>Related colony<select value={handoff.colonyKey} onChange={e=>setHandoff({...handoff,colonyKey:e.target.value})}><option value="">No colony selected</option>{colonies.map(colony=><option key={colony.colony_key} value={colony.colony_key}>{colony.broad_area} · {colony.colony_key}</option>)}</select></label>
          <label>Short title<input required maxLength={140} value={handoff.title} onChange={e=>setHandoff({...handoff,title:e.target.value})}/></label>
          <label>What should the next shift know?<textarea required maxLength={1000} value={handoff.detail} onChange={e=>setHandoff({...handoff,detail:e.target.value})}/></label>
          <label>Priority<select value={handoff.priority} onChange={e=>setHandoff({...handoff,priority:e.target.value})}><option value="normal">Normal</option><option value="urgent">Urgent coordinator attention</option></select></label>
          {manager&&<label>Responsible team member<select required value={handoff.ownerUserId} onChange={e=>setHandoff({...handoff,ownerUserId:e.target.value})}>{team.map(member=><option key={member.id} value={member.id}>{member.email}</option>)}</select></label>}
          <button className="primary-button" disabled={busy||(!handoff.catKey&&!handoff.colonyKey)}>Post fictional handoff</button>
        </form>
        <div className="field-tool-records"><h2>Next-shift handoffs</h2>{!data.handoffs.length&&<p className="field-tool-empty">No handoffs yet. Leave a fictional note so the next shift has context.</p>}{data.handoffs.map(item=><article key={item.id} className={`field-tool-card ${item.status==='open'&&item.priority==='urgent'?'attention':''}`}><div className="field-tool-card-top"><span className={`badge ${item.priority==='urgent'?'coral':''}`}>{item.priority}</span><span className="badge">{item.status}</span></div><h3>{item.title}</h3><small>{[name(item.cat_key),item.colony_key].filter(Boolean).join(' · ')}<br/>Owner: {item.owner_email} · {date(item.created_at)}</small><p>{item.detail}</p><small>{item.acknowledgement_count} team acknowledgement{item.acknowledgement_count===1?'':'s'}</small>{item.resolution_note&&<p className="field-tool-evidence">Resolution: {item.resolution_note}</p>}{item.status==='open'&&<div className="shared-actions"><button className="secondary-button" disabled={busy||Boolean(item.acknowledged_by_me)} onClick={()=>void mutate('/handoffs/acknowledge',{id:item.id},'Handoff acknowledged. The work remains open.')}><Check size={15}/>{item.acknowledged_by_me?'Acknowledged':'I have read this'}</button>{manager&&<button className="secondary-button" disabled={busy} onClick={()=>prepare('/handoffs/close',item.id,'Close the handoff with a documented resolution')}>Close with resolution</button>}</div>}</article>)}</div>
      </div>}
      {action&&<form className="field-tool-confirm" onSubmit={event=>{event.preventDefault();void mutate(action.path,{id:action.id,action:action.action,evidence},'Human-reviewed update recorded.').then(ok=>{if(ok){setAction(null);setEvidence('');}});}}><h2>{action.title}</h2><label>Fictional evidence or reason<textarea autoFocus required maxLength={700} value={evidence} onChange={event=>setEvidence(event.target.value)}/></label><div className="shared-actions"><button className="primary-button" disabled={busy||!evidence.trim()}>Save reviewed update</button><button type="button" className="secondary-button" onClick={()=>setAction(null)}>Go back</button></div></form>}
      <footer>{data.disclaimer}</footer>
    </>}
  </section>;
}
