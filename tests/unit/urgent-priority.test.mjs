import test from 'node:test';
import assert from 'node:assert/strict';
import { urgentCategory, sourceFlags } from '../../src/lib/urgent-priority.ts';

test('urgent display prioritizes structured source facts and supports the four intake languages',()=>{
  assert.equal(urgentCategory('A routine-looking translated note', ['injury','pregnancy']), 'Injury');
  assert.equal(urgentCategory('The earlier injury note is mentioned here', ['pregnancy']), 'Pregnancy');
  for(const message of ['Cat is limping','La gata cojea','Está mancándo','Chat la ap bwete, li blese']) assert.equal(urgentCategory(message),'Injury');
  assert.equal(urgentCategory('Mwen panse chat la ansent.'),'Pregnancy');
  assert.equal(urgentCategory('Mwen tande ti chat anba kouvèti a.'),'Kittens');
  assert.equal(urgentCategory('Pa gen moun pou bay manje demen.'),'Feeder gap');
  assert.equal(urgentCategory('A review is still needed.'),'Urgent review');
});
test('source fact decoding tolerates legacy or malformed metadata without inventing flags',()=>{
  assert.deepEqual(sourceFlags('["injury",42,null]'),['injury']);
  assert.deepEqual(sourceFlags('not json'),[]);assert.deepEqual(sourceFlags('{"injury":true}'),[]);assert.deepEqual(sourceFlags(null),[]);
});
