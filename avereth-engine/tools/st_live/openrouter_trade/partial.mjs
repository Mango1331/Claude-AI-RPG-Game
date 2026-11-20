// Evidence from the two incomplete live attempts. Does not run a model or write to either chat.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const [root,ref,suite]=process.argv.slice(2);
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const chat=name=>read(name).trim().split('\n').slice(1).map(JSON.parse);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const output={},markets=[],conditions={};
for(const [arm,dir] of Object.entries({A:ref,B:suite})){
    const mod=p=>import(pathToFileURL(path.join(dir,'avereth-engine',p)));
    const {foldChat}=await mod('src/host.js');
    const {openConditionNear}=await mod('src/v4/finance_evidence.js');
    const quote='Sixty-four copper for this fine buckler';
    conditions[arm]=[quote+'.',quote+'. She promised to meet him at the old ford tomorrow.',quote+', only after the guild seals your permit.']
        .map(text=>({text,flag:openConditionNear(text,0,16)}));
    assert.deepEqual(conditions[arm].map(x=>x.flag),[null,'tomorrow','after the']);
    const {loadContentPack}=await mod('src/content.js');
    const c=await loadContentPack(k=>JSON.parse(fs.readFileSync(path.join(dir,'avereth-engine/content',k))));
    const {gearMarketText,gearOfferProfile,gearRetailPrice}=await mod('src/v4/items.js');
    markets.push(gearMarketText(c,false,'catalog'));
    const profile=gearOfferProfile(c,{base:'hand_axe',quality:'fine'});
    const samples=['guild-seed.jsonl','incomplete-first-attempt.jsonl','interrupted-second-attempt.jsonl'];
    const worlds=samples.map(name=>{
        const messages=chat(name),f=foldChat(messages);
        assert.deepEqual(f.errors,[]);
        const m=messages.at(-1),record=m.extra?.avereth||{};
        return {file:name,messages:messages.length,lastUser:m.is_user,worldHash:hash(f.state),eventsHash:hash(messages.map(m=>m.extra?.avereth?.events||[])),
            handAxeOffers:Object.values(f.state.offers).flatMap(o=>o.lines.filter(l=>l.base==='hand_axe')),money:f.state.entities.pc.sheet.coin_cp,
            lastStatus:record.extraction?.status,panel:record.panel,eventsAfterSeed:messages.slice(chat('guild-seed.jsonl').length).flatMap(m=>m.extra?.avereth?.events||[])};
    });
    output[arm]={profile,referencePrice:gearRetailPrice(c,profile),worlds};
}
assert.deepEqual(output.A,output.B);
fs.writeFileSync(path.join(root,'tomorrow.json'),JSON.stringify(conditions,null,2)+'\n');
const starts=read('physical.jsonl').trim().split('\n').map(JSON.parse).filter(r=>r.kind==='start' && r.role==='planner');
assert(starts.every(r=>r.body.messages.filter(m=>m.content.includes(markets[0])).length===1));
fs.writeFileSync(path.join(root,'markets.json'),JSON.stringify(markets));
fs.writeFileSync(path.join(root,'partial-worlds.json'),JSON.stringify(output,null,2)+'\n');
