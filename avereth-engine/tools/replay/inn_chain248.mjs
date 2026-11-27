import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {engineAt} from './replay.mjs';

const {runtime,host,content}=await engineAt(new URL('../..',import.meta.url).pathname);
function messages(run) {
    const file=path.join(process.argv[2],'openrouter-20261127-'+run,'chat.jsonl.gz');
    return gunzipSync(fs.readFileSync(file)).toString().trimEnd().split('\n').slice(1).map(JSON.parse);
}
const h=messages('birch-247'), l=messages('lantern-244'), inn='loc.alderwatch.the_slaked_lime';
// Original lodging and inn prose. Synthetic world answers vary the party field and complete the meal.
for(const native of [false,true]){
const ch=structuredClone(h.slice(0,77)),s=()=>host.foldChat(ch).state;
async function play(input,plan,reply,raw){ch.push({mes:input,is_user:true,extra:{}});const r=await runtime.prepareGenerationAsync(ch,content,{llm:async()=>{assert.ok(plan);return JSON.stringify(plan)}});if(r.action==='context'){ch.push({mes:reply,is_user:false,extra:{}});runtime.processReplyAny(ch,ch.length-1,content);await runtime.runExtraction(ch,ch.length-1,content,async()=>JSON.stringify(raw));}return r;}
await play(h[77].mes,JSON.parse(host.rec(h[77]).plan.raw.at(-1)),h[78].mes,host.rec(h[78]).extraction.raw);assert.ok(s().scene.at.startsWith(inn+'.'));
await play('#rest 30');const raw=structuredClone(host.rec(l[80]).extraction.raw);raw.expected={'1':{arrived:true,at:inn,with:[],met:null}};raw.deltas[0].with=[];await play(native?'#go '+inn:l[79].mes,JSON.parse(host.rec(l[79]).plan.raw.at(-1)),l[80].mes,raw);assert.equal(s().scene.at,inn);assert.ok(s().scene.present.includes('npc.madge'));assert.ok(s().scene.present.includes('npc.ossen'));
const offer=Object.values(s().offers).findLast(v=>v.at===inn&&v.status==='open'&&v.lines.some(l=>l.service==='meal'));assert.ok(offer);
const text='I buy one bowl of supper from Madge for three copper.',coin=s().entities.pc.sheet.coin_cp;
await play(text,{commands:[{type:'offer.accept',seq:1,offer:offer.id,lines:[offer.lines.find(l=>l.service==='meal').id],quote:text}]},'Madge handed Alaric his bowl of supper.',{scene:inn,expected:{},deltas:[]});
assert.equal(s().entities.pc.sheet.coin_cp,coin-3);
const market='loc.alderwatch.market_square',go='I go back to the market square.';
await play(native?'#go '+market:go,{commands:[{seq:1,type:'go',to:market,quote:go}]},'Alaric arrived at the market square with Ossen.',{scene:market,expected:{1:{arrived:true,at:market,with:[],met:null}},deltas:[{type:'arrive',seq:1,at:market,with:[],evidence:'Alaric arrived at the market square with Ossen.'}]});assert.equal(s().scene.at,market);assert.ok(s().scene.present.includes('npc.ossen'));console.log(native?'native':'natural','inn/rest/return/meal/market OK');
}
