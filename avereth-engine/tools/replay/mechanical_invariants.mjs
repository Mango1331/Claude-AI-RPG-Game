import assert from 'node:assert/strict';

export function checkEvents(E,prior,events,id){
    const s=structuredClone(prior);
    const closures = new Set(events.filter(e => e.t === 'quest.status' && e.d.to === 'completed').map(e => e.d.id));
    const guildPaid = new Set(), awarded = new Set();
    // Match each priced purchase, sale and guild receipt to its own booked change.
    // Other legitimate changes (e.g. an involuntary loss) have their own product paths.
    const booked = events.filter(e => e.t === 'coin.changed' && e.d.id === 'pc').map(e => e.d.delta);
    for (const {t,d} of events) {
        if (t !== 'transaction.completed' || !(d.cp > 0)) continue;
        const signed = d.to === 'pc' ? d.cp : d.offer && d.seller ? -d.cp : null;
        if (signed === null) continue;
        const index = booked.indexOf(signed);
        assert.ok(index >= 0, id+' transaction debit/credit');
        booked.splice(index,1);
    }
    for(const e of events){
        const d=e.d||{}, sheet=s.entities[d.id]?.sheet;
        if(e.t==='coin.changed' && Number.isInteger(d.delta))assert.equal(d.value,sheet.coin_cp+d.delta,id+' money');
        if(e.t==='xp.changed')assert.equal(d.xp,sheet.xp+d.amount,id+' XP');
        if(e.t === 'transaction.completed' && d.from === 'guild' && d.quest) {
            assert.ok(closures.has(d.quest) && !guildPaid.has(d.quest), id+' guild settlement');
            assert.equal(d.cp, s.quests[d.quest]?.payout_cp, id+' amount of guild payout');
            guildPaid.add(d.quest);
        }
        if(e.t === 'xp.changed' && d.quest) {
            const q = s.quests[d.quest], key = d.quest+'/'+d.id;
            const presentAtWork = q?.party_work ? Object.values(q.party_work).flat().includes(d.id) : d.id === 'pc';
            assert.ok(q?.status === 'active' && presentAtWork && closures.has(d.quest) && !awarded.has(key)
                && s.entities[d.id]?.status !== 'dead', id+' eligible quest XP');
            awarded.add(key);
        }
        const holder = e.t === 'object.moved' ? d.to : e.t === 'object.created' ? d.object.holder : null;
        if (holder) assert.ok(!(holder.entity && holder.loc), id+' conflicting holders');
        if (e.t === 'quest.status' && d.from) assert.equal(s.quests[d.id]?.status,d.from,id+' prior quest status');
        if(e.t === 'object.moved' && d.split) assert.ok(!s.objects[d.split], id+' existing split object');
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
