import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {foldChat,rec} from '../../src/host.js';
import {processReplyAny,runExtraction,extractionRequest,prepareGenerationAsync} from '../../src/v4/runtime.js';
import {parseExtraction,worldVocab} from '../../src/v4/extract.js';
import {validateState} from '../../src/validate.js';
const content=await loadProductContent();
const f=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch27_repair.json.gz',import.meta.url))));
const short='obj.loot.wolf.fang.f',full=short+'.enc_t51';
function pending(kind,i){const chat=structuredClone(f[kind].slice(0,i+1));delete chat[i].extra.avereth;processReplyAny(chat,i,content);return chat;}
function valid(chat){const x=foldChat(chat);assert.deepEqual(x.errors,[]);assert.deepEqual(validateState(x.state,content),[]);return x.state;}
function parse(value,ids){return parseExtraction(JSON.stringify({...value,expected:{}}),worldVocab(content.deltaVocab,valid(f.rogue)),ids,{});}
for(const [i,n]of [[172,251],[174,256],[176,260]])test(`154 original Rogue I${i}: repair names exact field, bad value and canonical IDs; sale is once`,async()=>{
 const chat=pending('rogue',i),requests=[],cp=valid(chat).entities.pc.sheet.coin_cp;
 await runExtraction(chat,i,content,async req=>{requests.push(req);return requests.length===1?f.answers[n]:f.answers[n].replaceAll(short+'"',full+'"');});
 assert.equal(requests.length,2);const hint=requests[1].messages.at(-1).content;
 assert.ok(hint.includes('lines[')&&hint.includes('.object'));
 assert.ok(hint.includes(JSON.stringify(short))&&hint.includes(full));
 assert.equal(rec(chat[i]).extraction.status,'applied');const s=valid(chat);assert.equal(s.entities.pc.sheet.coin_cp,cp);
 const bid=Object.values(s.offers).findLast(o=>o.bid&&o.status==='open');assert.ok(bid);
 const text=`I accept the ${bid.price_cp} copper for these goods.`,plan=JSON.stringify({commands:[{seq:1,type:'offer.accept',offer:bid.id,lines:null,qty:null,quote:text}]});
 chat.push({mes:text,is_user:true,extra:{}});await prepareGenerationAsync(chat,content,{settings:{planner:true},llm:async()=>plan});
 assert.equal(valid(chat).entities.pc.sheet.coin_cp,cp+bid.price_cp);
 assert.equal(rec(chat.at(-1)).events.filter(e=>e.t==='transaction.completed').length,1);
 assert.equal(valid(JSON.parse(JSON.stringify(chat))).entities.pc.sheet.coin_cp,cp+bid.price_cp);
});
test('154 original Mage: unknown pricing repair names forbidden quote; independent totals stay 10/20 and no debit',async()=>{
 const chat=pending('mage',72),requests=[],cp=valid(chat).entities.pc.sheet.coin_cp;
 await runExtraction(chat,72,content,async req=>{requests.push(req);if(requests.length===1)return f.answers[98];const v=JSON.parse(f.answers[99]);v.deltas[1].lines[2].pricing={basis:'unknown'};return JSON.stringify(v);});
 const hint=requests[1].messages.at(-1).content;assert.ok(hint.includes('.lines[2].pricing')&&hint.includes('unknown')&&hint.includes('quote')&&hint.includes('only basis'));
 assert.equal(rec(chat[72]).extraction.status,'applied');const s=valid(chat);assert.equal(s.entities.pc.sheet.coin_cp,cp);
 const offer=Object.values(s.offers).find(o=>o.id==='offer.t72.5');assert.deepEqual(offer.lines.map(l=>l.price_cp),[10,20]);
});
test('154 invalid ID remains invalid after repeated bad repair; no salvage or booking',async()=>{
 const chat=pending('rogue',176),before=valid(chat),requests=[];
 await runExtraction(chat,176,content,async req=>{requests.push(req);return f.answers[260];});
 assert.equal(requests.length,2);assert.equal(rec(chat[176]).extraction.status,'failed');
 const s=valid(chat);assert.equal(s.entities.pc.sheet.coin_cp,before.entities.pc.sheet.coin_cp);assert.deepEqual(s.objects,before.objects);assert.deepEqual(s.offers,before.offers);
});
test('154 diagnostics preserve ambiguity, bound candidate count and never admit absent IDs',()=>{
 const v=JSON.parse(f.answers[260]),ids={objects:[...Array.from({length:30},(_,i)=>short+'.enc_t'+i),full]};
 const p=parse(v,ids);assert.equal(p.valid,false);const hint=p.errors.find(e=>e.includes('.lines[1].object'));
 assert.ok(hint.includes('multiple')&&hint.includes('Do not guess'));assert.ok(hint.length<2300);assert.ok(hint.includes('omitted'));
});
test('154 exact IDs and valid total/unknown structures produce no new diagnostic',()=>{
 const v=JSON.parse(f.answers[260]);v.deltas[0].lines[1].object=full;
 assert.equal(parse(v,{objects:[full,'obj.loot.wolf.pelt.f.enc_t51']}).valid,true);
 v.deltas[0].pricing={basis:'unknown'};assert.equal(parse(v,{objects:[full,'obj.loot.wolf.pelt.f.enc_t51']}).valid,true);
});
test('154 a missing optional catalog still returns an invalid report instead of throwing',()=>{
 const v=JSON.parse(f.answers[260]);v.expected={};
 assert.equal(parseExtraction(JSON.stringify(v),content.deltaVocab,undefined,{}).valid,false);
});
test('154 foreign catalogued object still fails World holder check; absent ID is not aliased',async()=>{
 const chat=pending('rogue',176),v=JSON.parse(f.answers[260]);
 const foreign={...structuredClone(valid(chat).objects[full]),id:'obj.test.foreign',holder:{entity:'npc.npctanners_apprentice'}};
 rec(chat[175]).events.push({t:'object.created',d:{object:foreign}});
 const req=extractionRequest(chat,176,content);assert.ok(req.ids.objects.includes(foreign.id));
 v.deltas[0].lines=[{object:foreign.id,qty:1}];await runExtraction(chat,176,content,async()=>JSON.stringify(v));
 const s=valid(chat);assert.equal(s.entities.pc.sheet.coin_cp,req.state.entities.pc.sheet.coin_cp);
 assert.equal(rec(chat[176]).events.some(e=>e.t==='transaction.completed'),false);
 assert.equal(Object.values(s.offers).some(o=>o.bid&&o.status==='open'&&o.lines.some(l=>l.object===foreign.id)),false);
});
