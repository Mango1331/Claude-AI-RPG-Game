import assert from 'node:assert/strict';

export function checkEvents(E,prior,events,id){
    const s=structuredClone(prior);
    for(const e of events){
        const d=e.d||{}, sheet=s.entities[d.id]?.sheet;
        if(e.t==='coin.changed' && Number.isInteger(d.delta))assert.equal(d.value,sheet.coin_cp+d.delta,id+' money');
        if(e.t==='xp.changed')assert.equal(d.xp,sheet.xp+d.amount,id+' XP');
        if(e.t==='level.up'){
            assert.equal(d.level,sheet.level+1,id+' level');
            assert.equal(d.xp_after,sheet.xp-sheet.level*E.content.rules.progression.xp_to_next_per_level,id+' XP carry');
        }
        if(e.t==='object.moved' && d.qty!=null)assert.ok(d.qty>0 && d.qty<=s.objects[d.id].qty,id+' ownership');
        if(e.t==='quest.status' && d.to==='completed')assert.notEqual(s.quests[d.id]?.status,'completed',id+' repeated settlement');
        if(e.t==='party.claim' && (d.paid||0)>(s.party?.claims?.[d.id]?.paid||0))assert.notEqual(s.entities[d.who]?.status,'dead',id+' deceased creditor');
        if(e.t==='scene.moved' && d.at)assert.ok(s.places[d.at],id+' destination');
        if(e.rng_to!=null)assert.ok(e.rng_to>=s.rng.n,id+' RNG');
        if(e.t==='party.member'){
            assert.ok(s.entities[d.who],id+' party identity');
            if(d.mode==='wait')assert.ok(s.places[d.at],id+' waiting place');
        }
        E.state.applyEvent(s,e);
    }
}
