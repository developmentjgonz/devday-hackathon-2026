import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { hashDemoAccessCode, hashPassword, loginWithPassword, verifyDemoAccessCode, verifyPassword } from '../../worker/auth.js';

function code() { const bytes=crypto.getRandomValues(new Uint8Array(32));return Buffer.from(bytes).toString('base64url'); }
function d1(sqlite) {return {prepare(sql){const query=sqlite.prepare(sql);return {bind(...values){return {first:async()=>query.get(...values)??null,run:async()=>{const row=query.run(...values);return {meta:{changes:row.changes,last_row_id:Number(row.lastInsertRowid)}};}};}};}};}

test('hosted demo access codes are salted, strictly gated and never accepted as password hashes',async()=>{
  const secret=code(), changed=code();
  await assert.rejects(()=>hashDemoAccessCode('SyntheticMiami2026!'),/43 base64url/);
  await assert.rejects(()=>hashDemoAccessCode('x'.repeat(42)),/43 base64url/);
  await assert.rejects(()=>hashDemoAccessCode('!'.repeat(43)),/43 base64url/);
  const first=await hashDemoAccessCode(secret),second=await hashDemoAccessCode(secret);
  assert.match(first,/^mews-demo-code-v1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first,second,'random salts must produce distinct stored verifiers');
  assert.equal(await verifyDemoAccessCode(secret,first,{SYNTHETIC_HOSTED_DEMO:'true'}),true);
  assert.equal(await verifyDemoAccessCode(changed,first,{SYNTHETIC_HOSTED_DEMO:'true'}),false);
  assert.equal(await verifyDemoAccessCode(secret,first,{}),false);
  assert.equal(await verifyDemoAccessCode(secret,first,{SYNTHETIC_HOSTED_DEMO:false}),false);
  assert.equal(await verifyDemoAccessCode(secret,first,{SYNTHETIC_HOSTED_DEMO:true}),false);
  assert.equal(await verifyDemoAccessCode(secret,first+'$trailing',{SYNTHETIC_HOSTED_DEMO:'true'}),false);
  assert.equal(await verifyPassword(secret,first),false);
});

test('legacy password hashing remains PBKDF2-SHA256 at 600000 iterations',async()=>{
  const password='FictionalVerificationOnly2026!';
  const hash=await hashPassword(password);
  assert.match(hash,/^pbkdf2-sha256\$600000\$/);
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword('DifferentFictionalPassword!',hash),false);
});

test('login accepts demo codes only on the explicitly enabled hosted synthetic environment',async t=>{
  const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  sqlite.exec(await readFile(new URL('../../migrations/0002_auth.sql',import.meta.url),'utf8'));
  const secret=code(),hash=await hashDemoAccessCode(secret);
  sqlite.prepare('INSERT INTO users(id,email,password_hash,role,created_at,updated_at) VALUES(1,?,?,?,?,?)').run('admin@mangrovemews.demo',hash,'admin',1,1);
  const env={DB:d1(sqlite),APP_ORIGIN:'https://mews.example.demo',SYNTHETIC_HOSTED_DEMO:'true'};
  const request=new Request('https://mews.example.demo/api/auth/login',{method:'POST',headers:{Origin:env.APP_ORIGIN}});
  const result=await loginWithPassword(env,request,{email:'admin@mangrovemews.demo',password:secret});
  assert.equal(result?.user.role,'admin');assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM user_sessions').get().n,1);
  assert.equal(await loginWithPassword({...env,SYNTHETIC_HOSTED_DEMO:undefined},request,{email:'admin@mangrovemews.demo',password:secret}),null);
  assert.equal(await loginWithPassword(env,request,{email:'admin@mangrovemews.demo',password:code()}),null);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM user_sessions').get().n,1);
});
