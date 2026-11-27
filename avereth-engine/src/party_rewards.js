import { splitPool } from './progression.js';

export function workAgreement(s,who,quest) {
    const m=s.party?.members[who];
    const current=s.party?.agreements[m?.agreement];
    return current?.terms.quest===quest ? current : s.party?.agreements[m?.quest_agreements?.[quest]];
}
export function questFee(quest, terms) {
    return terms.half ? Math.floor((quest?.payout_cp || 0)/2) : terms.cp || 0;
}

export function recordWork(s, emit, quest, source, members) {
    if (!quest || quest.status !== 'active' || !members.length || quest.party_work?.[source]) return;
    const standard=members.filter(id=>id!=='pc' && !workAgreement(s,id,quest.id) && s.party?.members[id]);
    emit({t:'quest.party_work', d:{id:quest.id, source, members:[...new Set(members)],...(standard.length?{standard}: {})}});
    for (const who of members) {
        const a = workAgreement(s,who,quest.id);
        if (a?.phase === 'accepted' && a.terms.quest === quest.id && a.terms.due === 'partial')
            claim(s,emit,a,quest.id,a.terms.installment ?? a.terms.cp);
    }
}

export function vestQuest(s, emit, quest) {
    if (!quest?.party_work) return;
    const worked = new Set(Object.values(quest.party_work).flat());
    for (const m of Object.values(s.party?.members || {})) {
        const a = workAgreement(s,m.who,quest.id);
        if (!worked.has(m.who) || m.mode === 'left' || a?.phase !== 'accepted' || a.terms.quest !== quest.id) continue;
        const amount = questFee(quest,a.terms);
        if (amount) claim(s, emit, a, quest.id, amount);
    }
}

export function questEntitlement(rows) {
    return Math.max(0,...rows.map(r=>r.entitlement ?? r.amount),rows.reduce((n,r)=>n+r.paid,0));
}

export function claim(s, emit, agreement, source, amount, {amend=false}={}) {
    // A payout belongs to one worker on one quest. Actual sales keep their independent sale IDs.
    const quest=source===agreement.terms.quest && !!s.quests[source];
    const prior=quest ? Object.values(s.party.claims).filter(r=>r.source===source && r.who===agreement.who) : [];
    const id=prior[0]?.id || (quest ? source+'/'+agreement.who : agreement.id+'/'+source);
    const existing=s.party.claims[id];
    if (prior.length) {
        // .217 could create several versions for one fee. Preserve every payment and ID.
        const total=amend ? Math.max(amount,prior.reduce((n,row)=>n+row.paid,0)) : Math.max(amount,questEntitlement(prior));
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
    const same=s.quests[row.source] ? Object.values(s.party.claims).filter(r=>r.source===row.source && r.who===row.who) : [];
    if (same.length && same.reduce((n,r)=>n+r.paid,cp)>questEntitlement(same)) return false;
    const why = row.agreement ? 'Party agreement ' + row.agreement : 'Shared quest reward '+row.source;
    for (const [id,delta] of [['pc',-cp],[row.who,cp]])
        emit({t:'coin.changed',d:{id,value:s.entities[id].sheet.coin_cp + delta,delta,why}});
    emit({t:'transaction.completed',d:{from:'pc',to:row.who,cp,for:why,at:s.scene.at,claim:row.id}});
    emit({t:'party.claim',d:{...row,paid:row.paid + cp,previous:row.revision}});
    if (same.length>1) claim(s,emit,s.party.agreements[row.agreement],row.source,questEntitlement(same));
    return true;
}

export function settleQuest(s, emit, q) {
    vestQuest(s, emit, q);
    const rows=Object.values(s.party?.claims || {}).filter(r=>r.source===q.id);
    const reserved=new Set(rows.filter(r=>r.agreement).map(r=>r.who));
    const earned=[...reserved].reduce((n,id)=>n+questEntitlement(rows.filter(r=>r.who===id)),0);
    const ordinary=(q.standard_workers || []).filter(id=>!reserved.has(id) && !workAgreement(s,id,q.id));
    const shares=splitPool(Math.max(0,(q.payout_cp || 0)-earned),['pc',...ordinary]);
    for(const who of ordinary) {
        const id=q.id+'/'+who;
        if(shares[who] && !s.party.claims[id]) emit({t:'party.claim',d:{id,who,source:q.id,
            agreement:null,amount:shares[who],paid:0,previous:0}});
    }
    const workers=new Set(Object.values(s.party?.claims || {}).filter(r=>r.source===q.id).map(r=>r.who));
    for (const who of workers) {
        const row=Object.values(s.party.claims).find(r=>r.who===who && r.source===q.id);
        // Also reconcile an older vested fee when its owner has already left.
        const due=row.agreement ? claim(s,emit,s.party.agreements[row.agreement],q.id,row.amount) : row;
        payClaim(s,emit,due,due.amount-due.paid);
    }
}
