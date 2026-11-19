// Controlled continuation of the User06 combat scene. Run with MAIN SUITE REFERENCE.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [main,suite,reference]=process.argv.slice(2).map(p=>path.resolve(p));
const mod=(root,file)=>import(pathToFileURL(path.join(root,'avereth-engine',file)));
const {archived}=await mod(suite,'tools/bench_extract_archive.mjs');
const {pendingChat,worldEvidence}=await mod(suite,'tools/bench_extract.mjs');
const prep=(await archived(main)).find(p=>p.name==='U6');
const id=20, item=prep.items.find(i=>i.id===id);
const original=JSON.parse(item.resp.choices[0].message.content);
const price='Sixty-four copper for this fine buckler.';
const addition='A breathless armorer named Nessa came around the bend and caught the descending spear on her shield. "'+price+'" she called. She pressed a blue kerchief into Alaric’s hand and promised to meet him at the old ford tomorrow.';
const extra=[
    {type:'person.new',ref:'nessa',name:'Nessa',role:'armorer',desc:['blue sash'],present:true,relevant:true,band:'SHORT'},
    {type:'offer',seller:'nessa',lines:[{what:'fine buckler',kind:'goods',service:null,qty:1,price_cp:64,said:price,
        phase:'firm',condition:null,pricing:{basis:'total',quote:'Sixty-four copper'},equipment:true,base:'buckler',quality:'fine',teaches:null,effect:null}]},
    {type:'object.new',name:'blue kerchief',kind:'item',holder:'nessa',qty:1},
    {type:'object.move',object:{new:'blue kerchief'},to:'pc'},
    {type:'thread',kind:'promise',text:'Nessa promised Alaric to meet him at the old ford tomorrow.',status:'open',who:['pc','nessa']},
];
const answer=structuredClone(original);
for(const d of extra)answer.deltas.push({...d,seq:answer.deltas.length+1});
let expected;
for(const [root,compact] of [[reference,false],[suite,true]]){
    const {runExtraction,extractionRequest}=await mod(root,'src/v4/runtime.js');
    const {rec,foldChat}=await mod(root,'src/host.js');
    const chat=structuredClone(prep.chat);
    chat[id].mes+=' '+addition;
    if(chat[id].swipes)chat[id].swipes[chat[id].swipe_id||0]=chat[id].mes;
    const c=pendingChat(chat,id);
    const request=extractionRequest(c,id,prep.content);
    assert(request.state.encounter);
    const money=request.state.entities.pc.sheet.coin_cp, seen=[];
    await runExtraction(c,id,prep.content,r=>{
        seen.push(r.purpose);
        assert.equal(r.messages[0].content.includes('Write compact single-line JSON.'),compact);
        return JSON.stringify(answer,null,compact?0:2);
    },{compactOutput:compact});
    const record=rec(c[id]),state=foldChat(c).state;
    const evidence=worldEvidence(c,id);
    assert.deepEqual(seen,['extract']);
    assert.equal(record.extraction.status,'applied');
    const person=Object.values(state.entities).find(e=>e.name==='Nessa');
    assert(person && state.scene.present.includes(person.id));
    assert(Object.values(state.objects).some(o=>o.name==='blue kerchief' && o.holder?.entity==='pc'));
    assert(Object.values(state.threads).some(t=>t.text.includes('old ford tomorrow') && t.who.includes('pc') && t.who.includes(person.id)));
    const offer=Object.values(state.offers).find(o=>o.seller===person.id && o.lines.some(l=>l.base==='buckler'));
    assert(offer);
    assert.equal(offer.lines[0].quality,'fine');
    assert.equal(offer.lines[0].price_cp,64);
    assert.equal(offer.lines[0].terms,'firm');
    assert.equal(state.entities.pc.sheet.coin_cp,money);
    assert.deepEqual(worldEvidence(JSON.parse(JSON.stringify(c)),id),evidence);
    if(expected)assert.deepEqual(evidence,expected);
    expected=evidence;
}
console.log('User06 I20 controlled suffix: same fight, new NPC, priced equipment, physical gift, promise and reload in both arms.');
