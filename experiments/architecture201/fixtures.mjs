import fs from 'node:fs';
import zlib from 'node:zlib';
import { copy } from './journal.mjs';
import { linked } from './engine.mjs';
const json = url => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(url, import.meta.url))));
export const forestOriginal = json('./fixtures/forest200.json.gz');
const load = (label, dir = 'corpus191') => json(`../../avereth-engine/tests/replay/${dir}/${label}.json.gz`);
function history(name, label, i, dir) {
    const d = load(label, dir), answers = d.answers[String(i + 1)];
    return { name, origin: `${label} #${i}/${i+1}: recorded plan/prose; last recorded extractor answer selected (earlier repairs excluded)`,
        base: copy(d.chat.slice(0,i)), input: d.chat[i].mes, plans: d.answers[i].map(a => a.content), narration: d.chat[i+1].mes,
        world: JSON.parse(answers.at(-1).content) };
}
export function fixtures() {
    const original = forestOriginal.chat;
    const forest = { name: 'forest200', origin: 'Personal .200 #5/6: original plan/prose; NO successful original extraction; synthetic arrival control',
        base: copy(original.slice(0,5)), input: original[5].mes, plans: original[5].extra.avereth.plan.raw,
        narration: original[6].mes, world: { scene: { new: { name: 'the forest', parent: 'loc.alderwatch', kind: 'wilderness' } }, expected: { 1: { arrived: true, at: { new: { name: 'the forest', parent: 'loc.alderwatch', kind: 'wilderness' } }, with: null, met: null } },
            deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'the forest', parent: 'loc.alderwatch', kind: 'wilderness' } }, forced_by: null, with: null }] } };
    const known = copy(forest); Object.assign(known,{name:'known_move', origin:'Synthetic exact known GO on original .200 pre-state', input:'I go to Alderwatch.',
        plans:[JSON.stringify({commands:[{seq:1,type:'go',to:'loc.alderwatch',quote:'I go to Alderwatch'}]})], narration:'Alaric arrived in Alderwatch.',
        world:{scene:'loc.alderwatch',expected:{1:{arrived:true,at:'loc.alderwatch',with:null,met:null}},deltas:[{seq:1,type:'arrive',at:'loc.alderwatch',forced_by:null,with:null}]}});
    const npc = history('npc_return','w191',89);
    const personality = history('npc_personality','w191',91);
    const pulse = history('pulse_information','w191',41);
    const trade = history('bound_trade','b17-rogue',163,'corpus');
    // Explicit current-schema adaptation; the binding offer already fixes 65cp. No new coin gift is proposed.
    const sale = JSON.parse(trade.plans[0]); sale.commands[0].agreed_cp = 65; sale.commands[0].price_evidence = {basis:'total',quote:'sixty-five copper',currency_quote:'copper'}; trade.plans = [JSON.stringify(sale)];
    trade.world = { scene: 'loc.glassmere.dosss_broker_shed', expected: {}, deltas: [] };
    trade.origin += '; controlled .200 adaptation: price_evidence added to existing agreed_cp=65, settlement is engine-owned, no coin.gift';
    const w = load('w191');
    const promise = {name:'npc_promise',origin:'w191 state after #92 with recorded voice/history; synthetic later promise',base:copy(w.chat.slice(0,93)),
        input:'I ask Wat when we can talk again.',plans:[JSON.stringify({commands:[]})],narration:'Wat grinned. "Come back tomorrow. I will show you the old ford," he promised Alaric.',
        world:{scene:'loc.the_pen_gate_by_the_pond',expected:{},deltas:[{seq:1,type:'thread',id:null,text:'Wat promised Alaric to show him the old ford tomorrow',kind:'promise',status:'open',resolution:null,who:['pc','npc.wat']}]}};
    const newcomer = {name:'new_person',origin:'Synthetic free new NPC and promise on .200 roadside state',base:copy(forest.base),
        input:'I look around and listen.',plans:[JSON.stringify({commands:[]})],narration:'A woman with an axe on her shoulder came over. "Mira," she said. "I cut wood here. I will show you the old ford tomorrow," she promised Alaric.',
        world:{scene:'loc.alderwatch.verge',expected:{},deltas:[{seq:1,type:'person.new',ref:'mira',name:'Mira',role:'woodcutter',desc:['woman with an axe on her shoulder'],armed:null,present:true,relevant:true,threat:false,at:'loc.alderwatch.verge',band:'SHORT',distinct_from:null},
          {seq:2,type:'thread',id:null,text:'Mira promised Alaric to show him the old ford tomorrow',kind:'promise',status:'open',resolution:null,who:['pc','mira']}]}};
    return [forest,known,npc,personality,promise,pulse,trade,newcomer].map(f => ({...f,joint:linked(f.narration,f.world)}));
}
export function promptNarrator(f, prepared) {
    // Entire transport prompt used by THIS prototype, not a claim to reproduce every ST extension's injections.
    const initial = forestOriginal.narratorMessages.slice(0,4).map(({role,content}) => ({role,content}));
    return [...initial, ...prepared.chat.slice(-4).map(m=>({role:m.is_user?'user':'assistant',content:m.mes})),
        {role:'system',content:prepared.context.text},
        {role:'system',content:'Write a narrative draft. Engine results are binding. It is withheld until world validation and durable save.'}];
}
