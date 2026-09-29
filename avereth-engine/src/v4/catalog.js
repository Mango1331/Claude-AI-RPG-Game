// Runtime V4: the CATALOG (docs/RUNTIME_V4_PLAN.md §4.2) the interpreter and the extractor read, built from the state:
// where Alaric is, who is present, the places, quests, Guild board, offers and objects he may refer to, the open
// decisions. It has the shape of tests/eval/scenes.json, the scenes P0/S1 measured the interpreter on, and it lists
// only ids: every reference in an answer is one of them or {new: …}. guardContext() gives the agency guard
// (src/v4/agency.js) the same view.
import { truth, entityLabel, statusOf } from '../knowledge.js';
import { deriveCharacter } from '../derived.js';
import { formatClock, normText } from '../util.js';
import { sceneHandle } from './scene_handles.js';
import {
    placePath, placeName, settlementOf, realmOf, hallOf, hallOfSettlement, childrenOf, heldBy, lyingAt, openOffers,
    membership, listingsOf, today,
} from './domain.js';
import { catalogText } from './interpret.js';

/** A person or creature as the catalog labels it: name, role, look ("Marta, Guild receptionist"). */
export function personLabel(state, content, id) {
    const e = state.entities[id];
    if (!e) return String(id);
    if (e.kind === 'creature') return [e.species || e.descriptors?.[0] || 'creature', ...(e.descriptors || []).filter((d) => d !== e.species).slice(0, 2)].join(', ');
    const role = truth(state, id, 'occupation')[0]?.o || (e.template && e.template !== 'commoner' ? content.templates.get(e.template)?.label?.toLowerCase() : null) || e.role || null;
    const look = e.traits ? String(e.traits).split(/[;,.]/)[0].trim() : (e.descriptors || []).find((d) => normText(d) !== normText(role || ''));
    return [e.name, role, look].filter(Boolean).filter((x, i, a) => a.findIndex((y) => normText(y) === normText(x)) === i).join(', ') || entityLabel(state, id);
}

function settlementName(state, id) {
    const p = state.places[id];
    const realm = realmOf(state, id);
    return `${p.name}, ${p.sub || 'settlement'}${realm ? ` in ${state.places[realm].name}` : ''}`;
}

function placeEntry(state, id) {
    const p = state.places[id];
    if (p.kind === 'settlement') return { id, name: settlementName(state, id) };
    if ((p.tags || []).includes('guild_hall')) return { id, name: placeName(state, id) };
    const parent = p.parent && state.places[p.parent];
    return { id, name: parent && parent.kind !== 'realm' ? `${p.name} (in ${parent.name})` : p.name };
}

/** The places worth naming from here: parent, children, siblings, the settlement and its Guild hall, the realm's other settlements. */
export function catalogPlaces(state, extra = []) {
    const at = state.scene.at;
    const ids = [];
    const add = (id) => { if (id && state.places[id] && id !== at && !ids.includes(id) && state.places[id].kind !== 'realm') ids.push(id); };
    const here = state.places[at];
    add(here?.parent);
    for (const c of childrenOf(state, at)) add(c);
    if (here?.parent) for (const c of childrenOf(state, here.parent)) add(c);
    const town = settlementOf(state, at);
    add(town);
    add(town && hallOfSettlement(state, town));
    // the places play created in this settlement (the reedbeds, the inn), newest first, a few
    if (town) Object.values(state.places).filter((p) => p.by === 'reply' && settlementOf(state, p.id) === town).slice(-6).reverse().forEach((p) => add(p.id));
    const realm = realmOf(state, at);
    if (realm) Object.values(state.places).filter((p) => p.kind === 'settlement' && p.parent === realm).slice(0, 4).forEach((p) => add(p.id));
    for (const id of extra) add(id);
    return ids.map((id) => placeEntry(state, id));
}

function proofText(q) {
    return (q.proof || []).map((p) => (p.kind === 'object' ? `${p.qty ?? 1} ${p.unit ?? ''} of ${p.what}`.replace(/\s+/g, ' ') : p.kind === 'mark' ? `"${p.what}" on the ${p.on || 'slip'}` : String(p.what || p))).join(' and ');
}

function objectiveText(q) {
    return (q.objectives || []).map((o) => {
        const qty = o.qty !== null && o.qty !== undefined ? `${o.qty}${o.unit ? ` ${o.unit}` : ''} ` : '';
        return `${String(o.verb || 'DO').toUpperCase()} ${qty}${o.what || 'the objective'}${o.where ? ` at ${o.where}` : ''}`.replace(/\s+/g, ' ').trim();
    }).join('; ');
}

function questInfo(state, content, q) {
    if (q.kind === 'guild_contract') {
        const progress = (q.progress || []).slice(-3).map((p) => `${p.objective}: ${p.status}`).join('; ');
        return ['Guild contract', q.status, q.rank, q.payout_cp !== null && q.payout_cp !== undefined ? `${q.payout_cp} cp` : null,
            q.desired_end_state ? `desired outcome: ${q.desired_end_state}` : null,
            (q.objectives || []).length ? `job memory: ${objectiveText(q)}` : null,
            progress ? `progress: ${progress}` : null,
            q.ready ? `READY FOR TURN-IN: ${q.ready_note || 'desired outcome achieved'}` : null,
            (q.proof || []).length ? `verification example: ${proofText(q)}` : null].filter(Boolean).join(' · ');
    }
    const giver = q.giver && state.entities[q.giver] ? personLabel(state, content, q.giver) : q.giver;
    return ['private', q.status, giver ? `from ${giver}` : null, q.payout_cp ? `reward ${q.payout_cp} cp` : null].filter(Boolean).join(' · ');
}

/** "Guild member, Novice · 30 cp" and HP when hurt. */
export function alaricLine(state, content) {
    const m = membership(state);
    const s = state.entities.pc?.sheet;
    if (!s) return m ? `Guild member, ${m.rank}` : 'not a Guild member';
    const dv = deriveCharacter(s, content);
    return [m ? `Guild member, ${m.rank}` : 'not a Guild member', `${s.coin_cp} cp`, s.hp < dv.maxHp ? `HP ${s.hp}/${dv.maxHp}` : null].filter(Boolean).join(' · ');
}

/** What Alaric's own sheet carries (template items: pouch, arrows) as catalog objects "item.<template>". */
function sheetObjects(state, content) {
    const sheet = state.entities.pc?.sheet || {};
    const inv = sheet.inventory || {};
    const carried = Object.entries(inv).filter(([k]) => !k.startsWith('obj.')).map(([k, q]) => ({ id: `item.${k}`, name: content.items.get(k)?.name || state.item_names?.[k] || k, qty: q > 1 ? q : undefined }));
    const equipped = Object.entries(sheet.equipment || {}).map(([slot, ref]) => {
        if (typeof ref !== 'string') return ref?.id ? { id: `item.${ref.id}`, name: ref.name || ref.id, state: `equipped: ${slot}` } : null;
        return { id: `item.${ref}`, name: content.items.get(ref)?.name || ref, state: `equipped: ${slot}` };
    }).filter(Boolean);
    return [...equipped, ...carried.filter((o) => !equipped.some((e) => e.id === o.id))];
}

function objectEntry(state, content, o) {
    const holder = o.holder?.entity === 'pc' ? undefined : o.holder?.loc ? 'here' : o.holder?.entity ? personLabel(state, content, o.holder.entity) : undefined;
    return { id: o.id, name: o.name, qty: o.stack || (o.qty ?? 1) > 1 ? o.qty : undefined, unit: o.unit || undefined, holder, state: (o.marks || []).length ? `marked: ${o.marks.map((m) => m.text).join('; ')}` : undefined };
}

/** The open decisions at this place, as the catalog and the engine block name them. */
export function openDecisionTexts(state) {
    return (state.decisions || []).filter((d) => !d.at || d.at === state.scene.at).map((d) => {
        if (d.kind === 'registration') return `registration: the Guild's fee ${d.price_cp} cp is due (${d.offer}); he has not paid yet`;
        if (d.kind === 'purchase') return `purchase: ${d.what}${d.max_cp !== null && d.max_cp !== undefined ? ` (at most ${d.max_cp} cp)` : d.any_price ? ' (any price)' : ''}; ${d.priced ? 'priced, not agreed' : 'no price known yet'}`;
        if (d.kind === 'sale') return `sale: ${d.what}${d.min_cp ? ` (at least ${d.min_cp} cp)` : ''}; no price agreed yet`;
        if (d.kind === 'payment') return `payment: ${d.what}; the amount is not known yet`;
        return `${d.kind}: ${d.what}`;
    });
}

/**
 * The catalog of the current state (the scenes.json shape).
 * @param {{extraPlaces?: string[], rankLook?: string}} [opts] extraPlaces: place ids to list besides the default ones
 *   (a go target of this turn, for the extractor)
 */
export function buildCatalog(state, content, { extraPlaces = [] } = {}) {
    const at = state.scene.at;
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead')
        .map((id) => ({ id, handle: sceneHandle(state, content, id), label: personLabel(state, content, id) }));
    const activeRaw = Object.values(state.quests).filter((q) => q.status === 'active' || q.status === 'offered');
    const quests = activeRaw.map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q) }));
    const travelRe = /\b(?:escort|journey|travel|road|cart|wagon|caravan|ship|boat|ferry|ride|guide|lead|depart|leave|deliver|destination|route|waystation)\b/i;
    const journeySources = [
        ...activeRaw.filter((q) => q.status === 'active' && [...(q.details || []), ...(q.notes || [])].length).map((q) => ({
            id: q.id, label: q.title,
            // Journey readiness comes only from story-persisted detail/note memory, never from generated objective text.
            text: [...(q.details || []), ...(q.notes || [])].filter(Boolean).join(' '),
        })),
        ...Object.values(state.threads || {}).filter((t) => t.status === 'open').map((t) => ({ id: t.id, label: t.text, text: t.text })),
    ];
    let journey_ready;
    for (const src of journeySources) {
        if (!travelRe.test(src.text)) continue;
        const text = normText(src.text);
        const contact = state.scene.present.find((id) => {
            if (id === 'pc' || !state.entities[id] || state.entities[id].kind !== 'npc') return false;
            const e = state.entities[id];
            const labels = [e.name, truth(state, id, 'occupation')[0]?.o, ...(e.descriptors || [])].filter(Boolean).map(normText);
            return labels.some((x) => x.length >= 3 && text.includes(x));
        });
        if (contact) {
            journey_ready = `${src.id} with ${sceneHandle(state, content, contact)} — an established journey/departure is ready to continue if Alaric clearly agrees`;
            break;
        }
    }
    const day = today(state);
    const completed = Object.values(state.quests).filter((q) => q.status === 'completed' && (q.history || []).some((h) => h.status === 'completed' && Math.floor((h.minute ?? 0) / 1440) + 1 === day))
        .map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q) }));
    const hall = hallOf(state, at);
    const town = hall ? settlementOf(state, hall) : null;
    const rank = membership(state)?.rank || 'Novice';
    const board = hall && town ? listingsOf(state, town, rank).map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q) })) : [];
    const offers = openOffers(state).filter((o) => o.canon ? (!o.at || hallOf(state, o.at) === hall) : state.scene.present.includes(o.seller))
        .map((o) => ({ id: o.id, seller: o.canon ? 'Guild' : personLabel(state, content, o.seller), lines: o.lines.map((l) => ({ id: l.id, what: l.what, price_cp: l.price_cp })) }));
    const objects = [
        ...heldBy(state, 'pc').map((o) => objectEntry(state, content, o)),
        ...sheetObjects(state, content),
        ...lyingAt(state, at).map((o) => objectEntry(state, content, o)),
        ...state.scene.present.filter((id) => id !== 'pc').flatMap((id) => heldBy(state, id)).map((o) => objectEntry(state, content, o)),
    ];
    return {
        here: { id: at, path: placePath(state, at) },
        time: formatClock(state.clock.minute).split(' (')[0].replace(/^Day/, 'day'),
        alaric: alaricLine(state, content),
        present,
        places: catalogPlaces(state, extraPlaces),
        quests,
        journey_ready,
        completed,
        board_label: hall ? `${rank} board of this hall` : undefined,
        board,
        offers,
        objects,
        open: openDecisionTexts(state),
    };
}

/** The catalog as text, and the ids the extractor's schema may use. */
export function extractorCatalog(state, content, opts = {}) {
    const c = buildCatalog(state, content, opts);
    return {
        text: catalogText(c),
        places: [...new Set([c.here.id, ...c.places.map((p) => p.id)].filter(Boolean))],
        quests: [...new Set([...c.quests, ...c.board, ...c.completed].map((q) => q.id))],
        objects: c.objects.map((o) => o.id),
        catalog: c,
    };
}

/** The agency guard's view (src/v4/agency.js): Guild halls, who is present by which names, what Alaric holds. */
export function guardContext(state, content, catalog = buildCatalog(state, content)) {
    const reg = (catalog.offers || []).find((o) => o.id === 'offer.registration');
    const objects = new Map();
    for (const o of catalog.objects) objects.set(o.id, { held: !o.holder, name: o.name });
    return {
        inGuildHall: !!hallOf(state, state.scene.at),
        guildHalls: new Set([catalog.here.id, ...catalog.places.map((p) => p.id)].filter((id) => hallOf(state, id) === id)),
        present: catalog.present.map((p) => ({ id: p.id, names: [p.handle, p.label, state.entities[p.id]?.name].filter(Boolean) })),
        objects,
        registrationPending: !!reg,
        registrationOffer: reg ? reg.id : null,
        member: !!membership(state),
    };
}