import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSyntheticSmsRelay,parseSyntheticWhatsAppExport} from '../../worker/raw-intake.js';

test('a kitten keyword cannot override the feeder shared Miami Beach area with a North Miami colony',()=>{
  const chat=parseSyntheticWhatsAppExport({batchId:'area-review-chat',provenance:'Deliberately fictional fixture',text:'11/8/26, 7:00 AM - Coordinator): Fictional training thread\n11/8/26, 7:01 AM - Demo Alex: Location shared: Miami Beach broad demo area\n11/8/26, 7:02 AM - Demo Alex: Maybe 3 kittens; I stayed back.'});
  const sms=parseSyntheticSmsRelay({batchId:'area-review-sms',provenance:'Deliberately fictional fixture',ndjson:JSON.stringify({id:'demo-1',from:'Synthetic Alex',body:'DEMO: I heard kittens near cover.',location:'Miami Beach broad demo area',received_at:'2026-11-08T12:00:00Z'})});
  for(const fixture of [chat,sms]){assert.equal(fixture.records[0].broadArea,'Miami Beach');assert.equal(fixture.records[0].proposedColonyKey,null);assert.ok(fixture.records[0].colonyConfidence<.75);assert.ok(fixture.records[0].flags.includes('kittens'));}
  const local=parseSyntheticSmsRelay({batchId:'area-review-local',provenance:'Fictional fixture',ndjson:JSON.stringify({id:'demo-2',from:'Synthetic Alex',body:'DEMO North Miami: kittens heard, no approach.',received_at:'2026-11-08T12:00:00Z'})});
  assert.equal(local.records[0].proposedColonyKey,'COL-07');
});
