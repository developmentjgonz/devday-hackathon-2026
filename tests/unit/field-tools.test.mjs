import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { acknowledgeHandoff, closeHandoff, createAppointment, createHandoff, createSupplyRequest, listFieldTools, pledgeSupply, updateAppointment, updateSupply } from '../../worker/field-tools.js';

function d1(sqlite) {
  return {
    prepare(sql) { const statement=sqlite.prepare(sql); return { bind(...values) { return {
      run:async()=>{const result=statement.run(...values);return {meta:{changes:result.changes}};},
      first:async()=>statement.get(...values)??null,
      all:async()=>({results:statement.all(...values)})
    };} };},
    async batch(statements) {sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}
  };
}
const coordinator={user:{id:1,role:'coordinator'}},volunteer={user:{id:2,role:'volunteer'}},other={user:{id:3,role:'volunteer'}},sponsor={user:{id:4,role:'sponsor'}};
const NOW='2026-11-08T12:00:00.000Z';
async function setup(t) {
  const sqlite=new DatabaseSync(':memory:'); t.after(()=>sqlite.close());
  sqlite.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,role TEXT,disabled_at TEXT);CREATE TABLE canonical_cats(cat_key TEXT PRIMARY KEY,canonical_cat_key TEXT,status TEXT);CREATE TABLE canonical_colonies(colony_key TEXT PRIMARY KEY,broad_area TEXT,status TEXT);");
  sqlite.exec(await readFile(new URL('../../migrations/0013_field_tools.sql',import.meta.url),'utf8'));
  sqlite.exec("INSERT INTO users VALUES(1,'coordinator@demo','coordinator',NULL),(2,'volunteer@demo','volunteer',NULL),(3,'second@demo','volunteer',NULL),(4,'sponsor@demo','sponsor',NULL);INSERT INTO canonical_cats VALUES('CAT-01','CAT-01','active'),('CAT-ALT','CAT-01','merged');INSERT INTO canonical_colonies VALUES('COL-01','Miami Beach','active');");
  return {sqlite,db:d1(sqlite)};
}
function countEvents(sqlite){return sqlite.prepare('SELECT COUNT(*) AS n FROM field_tool_events').get().n;}

test('care appointments enforce assignment, manager completion, due reminders and separate medical status',async t=>{
  const {sqlite,db}=await setup(t);
  const input={synthetic:true,catKey:'CAT-01',kind:'tnr',title:'Fictional TNR transport',clinicLabel:'Demo care partner',broadArea:'Miami Beach',dueAt:'2026-11-08T11:00:00Z',assignedUserId:2};
  await assert.rejects(()=>createAppointment({db,session:volunteer,input}),error=>error.status===403);
  await assert.rejects(()=>createAppointment({db,session:coordinator,input:{...input,catKey:'CAT-ALT'}}),/canonical/);
  const created=await createAppointment({db,session:coordinator,input,now:NOW});
  const mine=await listFieldTools({db,session:volunteer,now:NOW});
  assert.equal(mine.appointments.length,1); assert.equal(mine.appointments[0].reminder,'overdue_confirmation');
  assert.equal((await listFieldTools({db,session:other})).appointments.length,0);
  await assert.rejects(()=>updateAppointment({db,session:other,input:{id:created.id,action:'arrive',evidence:'Fictional arrival'}}),error=>error.status===409);
  await updateAppointment({db,session:volunteer,input:{id:created.id,action:'arrive',evidence:'Fictional transport arrived'},now:NOW});
  await assert.rejects(()=>updateAppointment({db,session:volunteer,input:{id:created.id,action:'complete',evidence:'Fictional visit over'}}),error=>error.status===403);
  await updateAppointment({db,session:coordinator,input:{id:created.id,action:'complete',evidence:'Fictional transport completed; care outcome not entered'},now:NOW});
  const eventCount=countEvents(sqlite);
  await assert.rejects(()=>updateAppointment({db,session:coordinator,input:{id:created.id,action:'complete',evidence:'Duplicate attempt'},now:NOW}),error=>error.status===409);
  assert.equal(countEvents(sqlite),eventCount); assert.equal(sqlite.prepare("SELECT status FROM canonical_cats WHERE cat_key='CAT-01'").get().status,'active');
  assert.equal((await listFieldTools({db,session:volunteer,now:NOW})).appointments[0].reminder,null);
  await assert.rejects(()=>listFieldTools({db,session:sponsor}),error=>error.status===403);
});

test('supply pledges cannot overfill and only managers confirm delivery with evidence',async t=>{
  const {sqlite,db}=await setup(t);
  const input={synthetic:true,colonyKey:'COL-01',itemKind:'carrier',quantity:4,note:'Fictional carriers for transport',neededBy:'2026-11-09T12:00:00Z'};
  const request=await createSupplyRequest({db,session:volunteer,input,now:NOW});
  await pledgeSupply({db,session:volunteer,input:{id:request.id,quantity:3},now:NOW});
  const before=countEvents(sqlite);
  await assert.rejects(()=>pledgeSupply({db,session:other,input:{id:request.id,quantity:2},now:NOW}),error=>error.status===409);
  assert.equal(countEvents(sqlite),before);
  await pledgeSupply({db,session:volunteer,input:{id:request.id,quantity:2},now:NOW});
  await pledgeSupply({db,session:other,input:{id:request.id,quantity:2},now:NOW});
  const view=await listFieldTools({db,session:volunteer});assert.equal(view.supplies[0].pledged_quantity,4);assert.equal(view.supplies[0].my_pledge,2);assert.equal(view.supplies[0].unpledged_quantity,0);
  await assert.rejects(()=>updateSupply({db,session:volunteer,input:{id:request.id,action:'fulfill',evidence:'Delivered'}}),error=>error.status===403);
  await assert.rejects(()=>updateSupply({db,session:coordinator,input:{id:request.id,action:'fulfill',evidence:''}}),/evidence/);
  await updateSupply({db,session:coordinator,input:{id:request.id,action:'fulfill',evidence:'Coordinator counted all four fictional carriers'},now:NOW});
  await assert.rejects(()=>pledgeSupply({db,session:volunteer,input:{id:request.id,quantity:0},now:NOW}),error=>error.status===409);
  assert.equal((await listFieldTools({db,session:volunteer})).supplies[0].status,'fulfilled');
});

test('handoffs preserve urgent priority, acknowledgements are idempotent, managers resolve with evidence',async t=>{
  const {sqlite,db}=await setup(t);
  const input={synthetic:true,catKey:'CAT-01',colonyKey:'COL-01',title:'Fictional next-shift check',detail:'Confirm the food pickup before heading out.',priority:'urgent',ownerUserId:3};
  const handoff=await createHandoff({db,session:volunteer,input,now:NOW});
  assert.equal(sqlite.prepare('SELECT owner_user_id FROM daily_handoffs').get().owner_user_id,2);
  await acknowledgeHandoff({db,session:other,input:{id:handoff.id},now:NOW});
  const before=countEvents(sqlite);await acknowledgeHandoff({db,session:other,input:{id:handoff.id},now:NOW});assert.equal(countEvents(sqlite),before);
  const view=(await listFieldTools({db,session:other})).handoffs[0];assert.equal(view.acknowledgement_count,1);assert.equal(view.acknowledged_by_me,1);assert.equal(view.priority,'urgent');assert.equal(view.status,'open');
  await assert.rejects(()=>closeHandoff({db,session:volunteer,input:{id:handoff.id,evidence:'Finished'}}),error=>error.status===403);
  await closeHandoff({db,session:coordinator,input:{id:handoff.id,evidence:'Fictional pickup completed and next shift notified in the demo'},now:NOW});
  assert.equal((await listFieldTools({db,session:other})).handoffs[0].status,'closed');
  assert.equal(sqlite.prepare("SELECT status FROM canonical_cats WHERE cat_key='CAT-01'").get().status,'active');
});

test('field tool creation requires synthetic disclosure, known references and redacted broad details',async t=>{
  const {db}=await setup(t);
  const base={synthetic:true,colonyKey:'COL-01',itemKind:'dry_food',quantity:2,note:'Fictional food bags',neededBy:'2026-11-09T12:00:00Z'};
  await assert.rejects(()=>createSupplyRequest({db,session:volunteer,input:{...base,synthetic:false}}),/fictional/);
  await assert.rejects(()=>createSupplyRequest({db,session:volunteer,input:{...base,colonyKey:'unknown'}}),error=>error.status===409);
  await assert.rejects(()=>createSupplyRequest({db,session:volunteer,input:{...base,note:'Call 305-555-1234'}}),/contacts/);
  await assert.rejects(()=>createSupplyRequest({db,session:volunteer,input:{...base,note:'Meet at 800 Washington Street'}}),/street addresses/);
  await assert.rejects(()=>createSupplyRequest({db,session:volunteer,input:{...base,quantity:''}}),/quantity/);
  await assert.rejects(()=>createHandoff({db,session:volunteer,input:{synthetic:true,title:'No link',detail:'Fictional note'}}),/Link a cat or colony/);
  await assert.rejects(()=>createHandoff({db,session:sponsor,input:{synthetic:true,catKey:'CAT-01'}}),error=>error.status===403);
});
