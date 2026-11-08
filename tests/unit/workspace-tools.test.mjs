import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {searchWorkspace,getMyShift} from '../../worker/workspace-tools.js';
import {importSyntheticFixture} from '../../worker/intake.js';
import {seedCanonicalCatsFromObservations,materializeCanonicalCensus} from '../../worker/census.js';
import {createAppointment,createHandoff} from '../../worker/field-tools.js';

const coordinator={user:{id:1,role:'coordinator'}},volunteer={user:{id:2,role:'volunteer'}},sponsor={user:{id:3,role:'sponsor'}};
async function database(){
  const sqlite=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../../migrations',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../../migrations/'+file,import.meta.url),'utf8'));
  sqlite.exec("INSERT INTO users(id,email,password_hash,role,created_at,updated_at) VALUES(1,'coordinator@demo.test','x','coordinator',1,1),(2,'volunteer@demo.test','x','volunteer',1,1),(3,'sponsor@demo.test','x','sponsor',1,1)");
  const prepare=sql=>{const query=sqlite.prepare(sql);const bind=(...params)=>({async run(){const result=query.run(...params);return{meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};},async first(){return query.get(...params)??null;},async all(){return{results:query.all(...params)}}});return{bind,first:()=>bind().first(),all:()=>bind().all(),run:()=>bind().run()};};
  const db={prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  const fixture=JSON.parse(readFileSync(new URL('../../public/demo-data/synthetic-intake-batch.json',import.meta.url),'utf8'));
  await importSyntheticFixture({db,fixture});await seedCanonicalCatsFromObservations(db);await materializeCanonicalCensus(db);
  return{db,sqlite};
}
test('private search finds canonical names and source evidence, bounds input and treats SQL wildcards literally',async()=>{
  const{db,sqlite}=await database();
  const cats=await searchWorkspace({db,session:volunteer,query:'Marmalade',kind:'cats'});
  assert.ok(cats.results.some(row=>row.kind==='cat'&&row.id==='CAT-02'));
  const reports=await searchWorkspace({db,session:coordinator,query:'kitten',kind:'reports'});
  assert.ok(reports.results.length>0);assert.ok(reports.results.every(row=>row.view==='intake-review'&&row.id.startsWith('OBS:')));
  assert.equal((await searchWorkspace({db,session:coordinator,query:'%%',kind:'reports'})).results.length,0);
  await assert.rejects(()=>searchWorkspace({db,session:sponsor,query:'Marmalade'}),error=>error.status===403);
  await assert.rejects(()=>searchWorkspace({db,session:volunteer,query:'x'}),error=>error.status===400);
  sqlite.close();
});
test('my shift combines assigned feeding, appointments and handoffs without exposing another user assignments',async()=>{
  const{db,sqlite}=await database();const now='2026-11-08T18:00:00Z';
  sqlite.prepare("INSERT INTO feeding_assignments(id,colony_key,assigned_user_id,due_at,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)").run('mine','COL-04',2,'2026-11-08T17:00:00Z','scheduled',1,now);
  sqlite.prepare("INSERT INTO feeding_assignments(id,colony_key,assigned_user_id,due_at,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)").run('other','COL-04',1,'2026-11-08T17:00:00Z','scheduled',1,now);
  await createAppointment({db,session:coordinator,now,input:{synthetic:true,catKey:'CAT-04',kind:'vet',title:'Fictional follow-up',clinicLabel:'Demo care partner',broadArea:'Little Havana',dueAt:'2026-11-08T19:00:00Z',assignedUserId:2}});
  await createHandoff({db,session:coordinator,now,input:{synthetic:true,catKey:'CAT-04',colonyKey:'COL-04',title:'Fictional handoff',detail:'Check assigned records before the next visit.',priority:'normal',ownerUserId:2}});
  const agenda=await getMyShift({db,session:volunteer,now});assert.ok(agenda.items.some(item=>item.id==='mine'&&item.overdue));assert.ok(!agenda.items.some(item=>item.id==='other'));assert.ok(agenda.items.some(item=>item.kind==='appointment'));assert.ok(agenda.items.some(item=>item.kind==='handoff'));assert.equal(agenda.counts.overdue,1);
  const manager=await getMyShift({db,session:coordinator,now});assert.ok(!manager.items.some(item=>item.id==='mine'));
  await assert.rejects(()=>getMyShift({db,session:sponsor,now}),error=>error.status===403);sqlite.close();
});
