// Audit the completed, explicitly local ST replay and probe purchase eligibility on copies of each saved world.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parseServerLog} from '../../run_report.mjs';
const [root,ref,suite]=process.argv.slice(2);
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const evidence=JSON.parse(read('offline-result.json'));
const markets={};
for(const [arm,repo] of Object.entries({A:ref,B:suite})){
    const mod=p=>import(pathToFileURL(path.join(repo,'avereth-engine',p)));
    const {loadContentPack}=await mod('src/content.js');
    const content=await loadContentPack(k=>JSON.parse(fs.readFileSync(path.join(repo,'avereth-engine/content',k))));
    const {gearMarketText}=await mod('src/v4/items.js');
    const market=gearMarketText(content,false,'catalog');
    const {pairs}=parseServerLog(read(arm+'st.log'));
    markets[arm]=pairs.filter(p=>p.req.messages.some(m=>m.content.includes(market))).map(p=>{
        const roles=p.req.messages[0].content.startsWith('You read one reply')?'extractor':'planner';
        const messages=p.req.messages;
        assert.equal(messages.reduce((n,m)=>n+m.content.split(market).length-1,0),1);
        return {role:roles,messages,normalized:createHash('sha256').update(JSON.stringify(messages.map(m=>({...m,content:m.content.replace(market,'[GEAR CATALOG]')})))).digest('hex')};
    });
    const w=JSON.parse(read('turn-'+arm+'1.json')).world;
    const offer=Object.values(w.offers).find(o=>o.lines.some(l=>l.base==='hand_axe'));
    const line=offer.lines.find(l=>l.base==='hand_axe');
    const {resolveCommands}=await mod('src/v4/commands.js'), {applyEvent}=await mod('src/state.js');
    const text='I buy the fine hand-axe now.', events=[];
    const receipt=resolveCommands(w,content,[{seq:1,type:'offer.accept',offer:offer.id,lines:[line.id],qty:1,quote:text}],
        e=>{events.push(e);applyEvent(w,e);},{c:true,msg:21,text});
    assert.equal(w.entities.pc.sheet.coin_cp,30);
    assert(!events.some(e=>e.t==='coin.changed'||e.t==='offer.accepted'));
    evidence[arm]={line,balance:30,explicitAcceptanceOnCopy:receipt.actions,events:events.map(e=>e.t),normalized:markets[arm].map(p=>[p.role,p.normalized])};
}
assert.deepEqual(evidence.A,evidence.B);
fs.writeFileSync(path.join(root,'offline-wire.json'),JSON.stringify(markets));
fs.writeFileSync(path.join(root,'offline-audit.json'),JSON.stringify(evidence,null,2)+'\n');
