// Private entitlements always refer to an accepted agreement and a real source.
export function recordWork(s, emit, quest, source, members) {
    if (!quest || quest.status !== 'active' || !members.length || quest.party_work?.[source]) return;
    emit({t:'quest.party_work', d:{id:quest.id, source, members:[...new Set(members)]}});
    for (const who of members) {
        const a = s.party?.agreements[s.party.members[who]?.agreement];
        if (a?.phase === 'accepted' && a.terms.quest === quest.id && a.terms.due === 'partial')
            claim(s,emit,a,quest.id,a.terms.cp);
    }
}

export function vestQuest(s, emit, quest) {
    if (!quest?.party_work) return;
    const worked = new Set(Object.values(quest.party_work).flat());
    for (const m of Object.values(s.party?.members || {})) {
        const a = s.party.agreements[m.agreement];
        if (!worked.has(m.who) || m.mode === 'left' || a?.phase !== 'accepted' || a.terms.quest !== quest.id) continue;
        const amount = a.terms.half ? Math.floor((quest.payout_cp || 0) / 2) : a.terms.cp;
        if (amount) claim(s, emit, a, quest.id, amount);
    }
}

export function questEntitlement(rows) {
    return Math.max(0,...rows.map(r=>r.entitlement ?? r.amount),rows.reduce((n,r)=>n+r.paid,0));
}

export function claim(s, emit, agreement, source, amount) {
    // A payout belongs to one worker on one quest. Actual sales keep their independent sale IDs.
    const quest=source===agreement.terms.quest && !!s.quests[source];
    const prior=quest ? Object.values(s.party.claims).filter(r=>r.source===source && r.who===agreement.who) : [];
    const id=prior[0]?.id || (quest ? source+'/'+agreement.who : agreement.id+'/'+source);
    const existing=s.party.claims[id];
    if (prior.length) {
        // .217 could create several versions for one fee. Preserve every payment and ID.
        const total=Math.max(amount,questEntitlement(prior));
        const vested=total-prior.slice(1).reduce((n,r)=>n+r.paid,0);
        for (const row of prior) {
            const due=row.id===id ? vested : row.paid;
            const combined=row.id===id && prior.length>1;
            if (row.amount!==due || combined && row.entitlement!==total)
                emit({t:'party.claim',d:{...row,amount:due,...combined?{entitlement:total}:{},agreement:agreement.id,previous:row.revision}});
        }
        return s.party.claims[id];
    }
    if (!existing) emit({t:'party.claim',d:{id,who:agreement.who,agreement:agreement.id,
        source,amount,paid:0,previous:0}});
    return s.party.claims[id];
}

export function payClaim(s, emit, row, cp) {
    if (!row || row.revision !== s.party?.claims[row.id]?.revision || !Number.isSafeInteger(cp) || cp <= 0 || cp > row.amount - row.paid ||
        !s.scene.present.includes(row.who) || s.entities[row.who]?.status === 'dead' ||
        !s.entities[row.who]?.sheet || s.entities.pc.sheet.coin_cp < cp) return false;
    if (s.quests[row.source]) {
        const same=Object.values(s.party.claims).filter(r=>r.source===row.source && r.who===row.who);
        if (same.reduce((n,r)=>n+r.paid,cp)>questEntitlement(same)) return false;
    }
    const why = 'Party agreement ' + row.agreement;
    for (const [id,delta] of [['pc',-cp],[row.who,cp]])
        emit({t:'coin.changed',d:{id,value:s.entities[id].sheet.coin_cp + delta,delta,why}});
    emit({t:'transaction.completed',d:{from:'pc',to:row.who,cp,for:why,at:s.scene.at,claim:row.id}});
    emit({t:'party.claim',d:{...row,paid:row.paid + cp,previous:row.revision}});
    return true;
}

export function settleQuest(s, emit, q) {
    vestQuest(s, emit, q);
    const workers=new Set(Object.values(s.party?.claims || {}).filter(r=>r.source===q.id).map(r=>r.who));
    for (const who of workers) {
        const row=Object.values(s.party.claims).find(r=>r.who===who && r.source===q.id);
        // Also reconcile an older vested fee when its owner has already left.
        const due=claim(s,emit,s.party.agreements[row.agreement],q.id,row.amount);
        payClaim(s,emit,due,due.amount-due.paid);
    }
}
