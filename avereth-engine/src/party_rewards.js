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

export function claim(s, emit, agreement, source, amount) {
    const id = agreement.id + '/' + source;
    const existing = s.party.claims[id];
    if (!existing) emit({t:'party.claim',d:{id,who:agreement.who,agreement:agreement.id,
        source,amount,paid:0,previous:0}});
    return s.party.claims[id];
}

export function payClaim(s, emit, row, cp) {
    if (!row || row.revision !== s.party?.claims[row.id]?.revision || !Number.isSafeInteger(cp) || cp <= 0 || cp > row.amount - row.paid ||
        !s.scene.present.includes(row.who) || s.entities[row.who]?.status === 'dead' ||
        !s.entities[row.who]?.sheet || s.entities.pc.sheet.coin_cp < cp) return false;
    const why = 'Party agreement ' + row.agreement;
    for (const [id,delta] of [['pc',-cp],[row.who,cp]])
        emit({t:'coin.changed',d:{id,value:s.entities[id].sheet.coin_cp + delta,delta,why}});
    emit({t:'transaction.completed',d:{from:'pc',to:row.who,cp,for:why,at:s.scene.at,claim:row.id}});
    emit({t:'party.claim',d:{...row,paid:row.paid + cp,previous:row.revision}});
    return true;
}

export function settleQuest(s, emit, q) {
    vestQuest(s, emit, q);
    for (const row of Object.values(s.party?.claims || {}))
        if (row.source === q.id) payClaim(s, emit, row, row.amount - row.paid);
}
