// Delivery receipts accompany player-authorised physical transfers, never extractor claims.
import { normText, clone } from '../util.js';
import { rulesetOf } from '../content.js';
import { truth } from '../knowledge.js';

const OMIT = new Set(['the', 'a', 'an', 'of', 'to', 'at', 'in', 'on', 'and', 'for', 'from', 'with', 'intact', 'delivered', 'deliver', 'left', 'leave']);
const words = t => normText(String(t || '')).replace(/'s\b/g, '').split(/[^a-z0-9]+/)
    .map(w => w.replace(/s$/, '')).filter(w => w.length > 2 && !OMIT.has(w));
const contains = (text, name) => {
    const a = new Set(words(text)), b = words(name);
    return b.length > 0 && b.every(w => a.has(w));
};
const CONFIRMS = /\b(?:confirm\w*|sign(?:s|ed|ing|ature|atures|-?off)?|countersign\w*|verif\w*|vouch\w*|witness(?:ed|ing)?\b(?!es)(?=\s+(?:the|it|his|that|their|its)\b|\s*$|[.,;])|witnessed|inspect\w*|attest\w*|receipt)\b/i;
const INQUIRY = /\b(?:about|where|which|whether|who|how|when|ask\w*|learn\w*|find\s+out|rumou?rs?|sightings?|tracks?|trail|lairs?|dens?|nests?)\b/i;
export const confirmsOnly = o => ['TALK', 'GET', 'GIVE'].includes(o.verb) && CONFIRMS.test(o.what || '') && !INQUIRY.test(o.what || '');
export const deliveryObjectives = q => (q.objectives || []).filter(o => ['DELIVER', 'GIVE'].includes(o.verb) && o.what && !confirmsOnly(o));

// A narrow generator check, not a READY bypass. Existing unsupported objectives still require cargo.
export function nonphysicalDelivery(o) {
    const text = normText(String(o.what || '')).replace(/^(?:a|an|the) /, '');
    return ['DELIVER', 'GIVE'].includes(o.verb) && !confirmsOnly(o)
        && (/\b(?:spoken|verbal|oral)\s+(?:warning|message|news|advice|information|word)\b/i.test(text)
            || /^(?:warning|message|news|advice|information|word)(?:$|\s+(?:of|for|to|about|from|that)\b)/i.test(text))
        && !/\b(?:letter|note|scroll|ledger|book|document|parcel|packet|paper|written|sealed)\b/i.test(text);
}

// Called per stripOwned clause. A wagon deadline is not a container return obligation.
export function additionalContainerReturn(q, clause) {
    const returnObject = /\b(?:return(?:ed)?|(?:bring|take|send)\s+back)\s+(?:(?:of|the|an?|his|her|their|all|empty|used|wooden|delivery)\s+){0,5}(?:crates?|boxes?|containers?|baskets?|casks?|bottles?|packaging|empties)\b/i;
    const objectReturned = /\b(?:crates?|boxes?|containers?|baskets?|casks?|bottles?|packaging|empties)\b(?:\s+(?:must|needs?|to|be|are|is|has|have|been|should)){0,5}\s+(?:return(?:ed)?|back|(?:go|brought|sent|taken)\s+back)\b/i;
    const containerReturn = text => returnObject.test(text || '') || objectReturned.test(text || '');
    const duty = text => /\b(?:must|required|requires?|needs?)\b/i.test(text)
        && containerReturn(text);
    return duty(clause) && ![q.task, q.desired_end_state].some(containerReturn);
}

function cargoMatches(s, q, o, x) {
    if (x.id?.startsWith('obj.slip.')) return false;
    const bound = x.for_quests?.includes(q.id);
    if (x.for_quests?.length && !bound) return false;
    const want = words(o.what), have = words(x.name);
    // Binding identifies the contract, not every associated item as cargo (Run 7 also bound an oiled cloth).
    // Retain a shared physical noun while allowing the objective's contents and the owner's name to differ.
    if (bound) {
        const documents = /\b(?:letter|note|receipt|slip|paper|document|chit|ledger|book|scroll|journal)\b/i;
        if (x.kind === 'document' && !documents.test(o.what)) return false;
        const modifiers = new Set(['locked', 'sealed', 'empty', 'full', 'small', 'large', 'wooden', 'signed']);
        return have.some(w => !modifiers.has(w) && want.includes(w));
    }
    if (have.length === 1 && want.length > 1) return false;
    if (!contains(o.what, x.name) && !contains(x.name, o.what)) return false;
    // A generic "crate" does not identify some other herb crate. Explicit cargo binding does.
    if (!bound && want.length === 1 && have.length > 1) return false;
    // Once the contract has identified its goods, an unbound lookalike is not a substitute.
    return bound || !Object.values(s.objects || {}).some(y => y.for_quests?.includes(q.id)
        && !y.id?.startsWith('obj.slip.') && words(y.name).some(w => want.includes(w)));
}
function under(s, at, target) {
    const seen = new Set();
    while (at && !seen.has(at)) {
        if (at === target) return true;
        seen.add(at); at = s.places[at]?.parent;
    }
    return false;
}

// Prefer an explicitly named child over its named parent; never guess between sibling places.
function destination(s, o) {
    if (s.places[o.where]) return o.where;
    const choices = Object.values(s.places).filter(p => contains(o.where, p.name));
    const leaves = choices.filter(p => !choices.some(other => other.id !== p.id && under(s, other.id, p.id)));
    const best = Math.max(0, ...leaves.map(p => words(p.name).length));
    const top = leaves.filter(p => words(p.name).length === best);
    const here = top.filter(p => under(s, s.scene.at, p.id));
    return top.length === 1 ? top[0].id : here.length === 1 ? here[0].id : null;
}
function dropTarget(s, q, o, to, at) {
    const end = q.desired_end_state || '';
    // "Left with the clerk" is a GIVE, and an unmodelled counter is not a place on the floor.
    if (!to.loc || to.loc !== at || /\bwith\b/i.test(end)) return false;
    const instruction = /^\s*(?:leave|deposit|place|stack|drop)\b/i.test(q.task || '');
    if (!instruction && !/\b(?:deposited|stacked)\b/i.test(end)) return false;
    const locatives = [...end.matchAll(/\b(?:at|in|inside|into|on|onto|behind|beneath|under)\s+(.+?)(?=\s+\b(?:at|in|inside|into|on|onto|behind|beneath|under)\b|[.;,]|$)/gi)];
    if (!locatives.length) return false;
    const named = [];
    for (const [, phrase] of locatives) {
        const label = normText(phrase).replace(/^the /, '');
        const matches = Object.values(s.places).filter(p => normText(p.name).replace(/^the /, '') === label);
        if (matches.length !== 1) return false;
        named.push(matches[0].id);
    }
    const point = destination(s, { where: end });
    return !!point && named.includes(point) && at === point && under(s, point, destination(s, o));
}
export function deliveryTarget(s, q, o, to, at = s.scene.at, { drop = false } = {}) {
    const dest = destination(s, o);
    if (!dest || !under(s, at, dest)) return false;
    if (drop) return dropTarget(s, q, o, to, at);
    if (!to.entity || to.entity === 'pc' || !s.scene.present.includes(to.entity)) return false;
    const target = s.entities[to.entity];
    if (!target || target.status === 'dead') return false;
    const terms = `${o.where || ''} ${q.desired_end_state || ''}`;
    const named = Object.values(s.entities).filter(e => e.kind === 'npc' && e.name && contains(terms, e.name));
    if (named.length) return named.length === 1 && named[0].id === target.id;
    const roles = [truth(s, target.id, 'occupation')[0]?.o, target.descriptors?.[0]].filter(Boolean);
    if (roles.some(role => contains(terms, role))) return true;
    // A priory can receive through its religious staff. Merely being a visitor at that place is insufficient.
    const placeWords = new Set(words(s.places[dest].name));
    const institutionOnly = words(o.where).every(w => placeWords.has(w));
    return institutionOnly && /\b(?:priory|monastery|abbey|temple|chapel)\b/i.test(s.places[dest].name)
        && roles.some(role => /\b(?:monk|nun|brother|sister|priest|priestess|abbot|abbess|warden|cleric)\b/i.test(role));
}

export function deliveryStatus(q) {
    const missing = deliveryObjectives(q).filter(o => (q.deliveries || []).filter(r => r.objective === (o.id || o.what))
        .reduce((n, r) => n + r.qty, 0) < (o.qty ?? 1));
    return missing.length ? {
        ok: false, mode: 'not_delivered',
        reason: `delivery not recorded at the agreed recipient/place: ${missing.map(o => `${o.what} → ${o.where || 'the agreed destination'}`).join('; ')}. The original contract is unchanged; no container return is required unless it was part of that contract`,
        consume: [],
    } : null;
}
export function deliveryHandover(s, id, to) {
    const x = s?.objects?.[id];
    if (!x) return false;
    return Object.values(s.quests || {}).some(q => q.kind === 'guild_contract' && q.status === 'active'
        && deliveryObjectives(q).some(o => cargoMatches(s, q, o, x) && deliveryTarget(s, q, o, { entity: to })));
}

// Active pre-patch saves can confirm current physical custody, never invent a historical transfer.
export function confirmDelivery(s, q, emit, quote, seq) {
    if ((q.deliveries || []).length || !/\b(?:confirm|verify|check)\b/i.test(quote || '')
        || !/\b(?:delivery|delivered|receipt)\b/i.test(quote || '')
        || /\b(?:not|never|tomorrow|later|would|could)\b/i.test(quote || '')) return false;
    const allocated = new Map(), pending = [];
    for (const o of deliveryObjectives(q)) {
        let left = o.qty ?? 1;
        for (const x of Object.values(s.objects || {})) {
            if (!left || !x.had_pc || !cargoMatches(s, q, o, x) || !deliveryTarget(s, q, o, x.holder)) continue;
            const qty = Math.min(left, (x.qty || 1) - (allocated.get(x.id) || 0));
            if (qty <= 0) continue;
            pending.push({ t: 'quest.delivered', d: { id: q.id, receipt: {
                key: `confirm:${s.turn}:${seq}:${o.id || o.what}:${x.id}`, objective: o.id || o.what,
                object: x.id, origin: x.delivery_origin || x.id, qty, to: clone(x.holder), at: s.scene.at,
                turn: s.turn, seq, confirmation: true,
            } } });
            left -= qty; allocated.set(x.id, (allocated.get(x.id) || 0) + qty);
        }
        if (left) return false;
    }
    pending.forEach(emit);
    return !deliveryStatus(q);
}

export function cargoProvenance(s, before, { objectId = before.id, qty = before.qty || 1 } = {}) {
    // A sheet template is a fungible count, not a physical batch identity. Its materialised outgoing units are.
    if (before.template) return { delivery_origin: objectId, delivery_capacity: qty };
    const root = before.delivery_origin || before.id;
    const capacity = Math.max(before.delivery_capacity || before.qty || 1,
        ...Object.values(s.objects || {}).filter(x => x.delivery_origin === root).map(x => x.delivery_capacity || 0),
        ...Object.values(s.quests || {}).flatMap(q => (q.deliveries || []).filter(r => r.origin === root).map(r => r.capacity || 0)));
    return { delivery_origin: root, delivery_capacity: capacity };
}

// Called only by GIVE/DROP and the authorised conditional GIVE, never generic object.move.
export function transferCargo(s, content, emit, object, to, qty, seq, { drop = false } = {}) {
    const before = clone(object), n = Math.min(qty || before.qty || 1, before.qty || 1);
    if (rulesetOf(s) < 2) {
        emit({ t: 'object.moved', d: { id: before.id, to, ...(n < (before.qty || 1) ? { qty: n, split: `${before.id}_${s.turn}` } : {}) } });
        return;
    }
    const provenance = cargoProvenance(s, before);
    const partial = n < (before.qty || 1);
    let split = `${before.id}_t${s.turn}_${seq}`;
    for (let i = 2; s.objects[split]; i++) split = `${before.id}_t${s.turn}_${seq}_${i}`;
    emit({ t: 'object.moved', d: { id: before.id, to, ...(partial ? { qty: n, split } : {}), ...provenance } });
    bookDelivery(s, emit, before, to, n, seq, { drop, objectId: partial ? split : before.id });
}

export function bookDelivery(s, emit, before, to, n, seq, { drop = false, objectId = before.id } = {}) {
    if (rulesetOf(s) < 2) return;
    const { delivery_origin: root, delivery_capacity: capacity } = cargoProvenance(s, before, { objectId, qty: n });
    let remaining = n;
    for (const q of Object.values(s.quests || {})) {
        if (q.kind !== 'guild_contract' || q.status !== 'active') continue;
        const used = (q.deliveries || []).filter(r => r.origin === root).reduce((sum, r) => sum + r.qty, 0);
        let available = Math.min(remaining, Math.max(0, capacity - used));
        for (const o of deliveryObjectives(q)) {
            if (!cargoMatches(s, q, o, before) || !deliveryTarget(s, q, o, to, s.scene.at, { drop })) continue;
            const done = (q.deliveries || []).filter(r => r.objective === (o.id || o.what)).reduce((sum, r) => sum + r.qty, 0);
            const count = Math.min(available, Math.max(0, (o.qty ?? 1) - done));
            if (!count) continue;
            const receipt = { key: `${s.turn}:${seq}:${objectId}:${o.id || o.what}`, objective: o.id || o.what,
                object: objectId, origin: root, capacity, qty: count, to: clone(to), at: s.scene.at, turn: s.turn, seq };
            emit({ t: 'quest.delivered', d: { id: q.id, receipt } });
            available -= count; remaining -= count;
        }
        if (remaining < n) break; // Never credit ambiguous cargo to several contracts.
    }
}
