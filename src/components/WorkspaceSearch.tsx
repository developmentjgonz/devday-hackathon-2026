import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import './WorkspaceTools.css';

type Result={kind:string;id:string;title:string;detail:string;context:string;at:string|null;view:string};
export function WorkspaceSearch(){
  const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[area,setArea]=useState('');
  const [results,setResults]=useState<Result[]>([]),[areas,setAreas]=useState<string[]>([]),[notice,setNotice]=useState('Search your private cats, colonies, and source reports.'),[busy,setBusy]=useState(false);
  async function search(event:React.FormEvent){event.preventDefault();setBusy(true);try{
    const response=await fetch('/api/private/workspace-search?'+new URLSearchParams({q:query,kind,area}),{credentials:'same-origin'});
    const body=await response.json();if(!response.ok)throw Error(body.error||'Search unavailable');setResults(body.results);setAreas(body.areas);setNotice(`${body.results.length} result(s). Up to ${body.limitPerKind} per category. ${body.disclaimer}`);
  }catch(error){setResults([]);setNotice(error instanceof Error?error.message:'Unable to search.');}finally{setBusy(false);}}
  function open(item:Result){if(item.kind==='cat')sessionStorage.setItem('mews-selected-cat',item.id);if(item.kind==='colony')sessionStorage.setItem('mews-map-focus',item.id);if(item.kind==='report')sessionStorage.setItem('mews-review-observation',item.id);location.hash=item.view;}
  return <section className="workspace-tool panel"><p className="eyebrow">Private team search</p><h1>Find the record, follow the evidence.</h1><form className="workspace-search-form" onSubmit={search}><label>Cat, marking, colony, or message<input autoComplete="off" minLength={2} maxLength={120} required placeholder="Try Marmalade, kittens, or Miami Beach" value={query} onChange={event=>setQuery(event.target.value)}/></label><label>Category<select value={kind} onChange={event=>setKind(event.target.value)}><option value="all">All records</option><option value="cats">Cats</option><option value="colonies">Colonies</option><option value="reports">Source reports</option></select></label><label>Broad area<select value={area} onChange={event=>setArea(event.target.value)}><option value="">All areas</option>{areas.map(value=><option key={value}>{value}</option>)}</select></label><button className="primary-button" disabled={busy}><Search size={16}/>{busy?'Searching…':'Search records'}</button></form><p role="status">{notice}</p><div className="workspace-result-list">{results.map(item=><button className="workspace-result" key={`${item.kind}:${item.id}`} onClick={()=>open(item)}><div><span className="eyebrow">{item.kind} · {item.context}</span><h3>{item.title}</h3><p>{item.detail}</p>{item.at&&<small>{new Date(item.at).toLocaleString()}</small>}</div><ArrowRight size={18}/></button>)}</div></section>;
}
