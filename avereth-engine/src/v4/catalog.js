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
    membership, listingsOf, today, contracts, listedToday,
} from './domain.js';
import { catalogText } from './interpret.js';
import { defeatTally, tallyText, readyText, proofMemory } from './guild.js';

/** A person or creature as the catalog labels it: name, role, look ("Marta, Guild receptionist"). */
export function personLabel(state, content, id) {
    const e = state.entities[id];
    if (!e) return String(id);
    if (e.kind === 'creature') return [e.species || e.descriptors?.[0] || 'creature', ...(e.descriptors || []).filter((d) => d !== e.species).slice(0, 2)].join(', ');
    const role = truth(state, id, 'occupation')[0]?.o || (e.template && e.template !== 'commoner' ? content.templates.get(e.template)?.label?.toLowerCase() : null) || e.role || null;
    const look = e.traits ? String(e.traits).split(/[;,.]/)[0].trim() : (e.descriptors || []).find((d) => normText(d) !== normText(role || ''));
    return [e.name, role, look].filter(Boolean).filter((x, i, a) => a.findIndex((y) => normText(y) === normText(x)) === i).join(', ') || entityLabel(state, id);
}

/**
 * Prototype C (4.3.0-c.6): the people Alaric met at a place and left there (entity.at, src/v4/world.js arrive), for a
 * GO back to it: when the story shows that place's people, they are these, not new ones (live 04.10.2026 16:35: back
 * at the Guild desk, a new "Guild desk clerk" was invented and stored beside the two clerks he had met there)
 */
export function knownAt(state, content, place) {
    return Object.values(state.entities).filter((e) => e.kind === 'npc' && e.at === place && !state.scene.present.includes(e.id) && statusOf(state, e.id) !== 'dead')
        .slice(-4).map((e) => ({ id: e.id, label: personLabel(state, content, e.id) }));
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
    const towns = realm ? Object.values(state.places).filter((p) => p.kind === 'settlement' && p.parent === realm).slice(0, 4) : [];
    towns.forEach((p) => add(p.id));
    // out in the wilds the way back matters: the Guild halls of those towns and the places play created in this realm,
    // newest first (live 30.09.2026 14:56: at the weirs, "back to the city and to the guild building" found no hall)
    if (!town) {
        towns.forEach((p) => add(hallOfSettlement(state, p.id)));
        Object.values(state.places).filter((p) => p.by === 'reply' && realmOf(state, p.id) === realm).slice(-4).reverse().forEach((p) => add(p.id));
    }
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

function questInfo(state, content, q, { c = false } = {}) {
    if (q.kind === 'guild_contract') {
        const progress = (q.progress || []).slice(-3).map((p) => `${p.objective}: ${p.status}`).join('; ');
        return ['Guild contract', q.status, q.rank, q.payout_cp !== null && q.payout_cp !== undefined ? `${q.payout_cp} cp` : null,
            q.desired_end_state ? `desired outcome: ${q.desired_end_state}` : null,
            (q.objectives || []).length ? `job memory: ${objectiveText(q)}` : null,
            progress ? `progress: ${progress}` : null,
            q.status === 'active' && defeatTally(state, content, q).length ? `defeated (engine count): ${tallyText(defeatTally(state, content, q))}` : null,
            readyText(state, content, q, { c }),
            // Prototype C (4.3.0-c.6): a hunt is proven by its slip, goods by the goods themselves
            c ? proofMemory(state, content, q) : (q.proof || []).length ? `verification example: ${proofText(q)}` : null].filter(Boolean).join(' · ');
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
        if (d.kind === 'purchase') return `purchase: ${d.qty > 1 ? `${d.qty} × ` : ''}${d.what}${d.max_cp !== null && d.max_cp !== undefined ? ` (at most ${d.max_cp} cp)` : d.any_price ? ' (any price)' : ''}; ${d.priced ? 'priced, not agreed' : 'no price known yet'}`;
        if (d.kind === 'sale') return `sale: ${d.qty > 1 ? `${d.qty} × ` : ''}${d.what}${d.min_cp ? ` (at least ${d.min_cp} cp)` : ''}; no price agreed yet`;
        if (d.kind === 'payment') return `payment: ${d.what}; the amount is not known yet`;
        return `${d.kind}: ${d.what}`;
    });
}

const TRAVEL_WORDS = /\b(?:escort|journey|travel|road|cart|wagon|caravan|ship|boat|ferry|ride|guide|lead|depart|leave|deliver|destination|route|waystation)\b/i;
// Prototype C (4.3.0-c.6): a journey comes from the work itself, an escort or a delivery (a private job: escort, deliver,
// guide or accompany), never from road words in its notes (live 04.10.2026 16:35: the warden's directions to the boar
// den made "follow the directions" an established journey with him)
const journeyWork = (q) => (q.objectives || []).some((o) => (o.verb ? ['ESCORT', 'DELIVER'].includes(o.verb) : /^\s*(?:escort|deliver|guide|accompany)\b/i.test(o.what || '')));
// 4.3.0-c.6.6: who goes along is the escort's charge, not whoever handed over the parcel (live 07.10.2026: Brother
// Aldric gave the medicine bundle and stayed; the engine's own "journey … with Aldric" made the story and the extractor
// take him along to Thornwick and back)
const escortWork = (q) => (q.objectives || []).some((o) => (o.verb ? o.verb === 'ESCORT' : /^\s*(?:escort|guide|accompany)\b/i.test(o.what || '')));

/**
 * The journey Alaric can continue without naming where to ("wait, then we continue", live run 30.09.2026): a journey
 * the story stored in an active quest's notes or an open thread, with someone present whom it names; else the journey
 * of an active quest he has actually set off on (quest.journey: he agreed to continue it, or set off on it with its
 * people and left the settlement), whoever of its people the scene still shows, the one begun last first. A quest he
 * only accepted is no journey (review of 4.1.0: an escort accepted in Redmarch, Alaric alone in another town). The
 * interpreter sees it as JOURNEY READY; journey.continue is authorised by it.
 * @returns {{id: string, label: string, contact: string|null, why: string}|null}
 */
export function journeyReady(state, { c = false } = {}) {
    const sources = [
        // 4.3.0-c.6.6: a contract whose outcome is READY has reached its destination; its journey is over (live 07.10.2026:
        // the way back from Thornwick "continued" the delivery journey that had ended at the chapel)
        ...Object.values(state.quests).filter((q) => q.status === 'active' && (!c || (journeyWork(q) && !q.ready)))
            .map((q) => ({ id: q.id, label: q.title, text: [...(q.details || []).map((x) => (typeof x === 'string' ? x : x?.note)), ...(q.notes || [])].filter(Boolean).join(' ') })),
        ...(c ? [] : Object.values(state.threads || {}).filter((t) => t.status === 'open').map((t) => ({ id: t.id, label: t.text, text: t.text }))),
    ];
    for (const src of sources) {
        if (!TRAVEL_WORDS.test(src.text)) continue;
        const text = normText(src.text);
        const contact = state.scene.present.find((id) => {
            const e = state.entities[id];
            if (id === 'pc' || e?.kind !== 'npc' || e.status === 'dead') return false;
            return [e.name, truth(state, id, 'occupation')[0]?.o, ...(e.descriptors || [])].filter(Boolean).map(normText).some((x) => x.length >= 3 && text.includes(x));
        });
        if (contact) return { id: src.id, label: src.label, contact, companion: !c || escortWork(state.quests[src.id] || {}) ? contact : null, why: 'an established journey' };
    }
    const underway = Object.values(state.quests).filter((q) => q.status === 'active' && !q.ready && q.journey)
        .sort((a, b) => (b.journey.since ?? 0) - (a.journey.since ?? 0))[0];
    return underway ? { id: underway.id, label: underway.title, contact: null, companion: null, why: 'the contract\'s journey is underway' } : null;
}

/**
 * The catalog of the current state (the scenes.json shape).
 * @param {{extraPlaces?: string[], known?: boolean}} [opts] extraPlaces: place ids to list besides the default ones
 *   (a go target of this turn, for the extractor); known: the contracts listed on a Guild board elsewhere (Prototype C)
 */
export function buildCatalog(state, content, { extraPlaces = [], known = false, c = false } = {}) {
    const at = state.scene.at;
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead')
        .map((id) => ({ id, handle: sceneHandle(state, content, id), label: personLabel(state, content, id) }));
    const activeRaw = Object.values(state.quests).filter((q) => q.status === 'active' || q.status === 'offered');
    const quests = activeRaw.map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q, { c }) }));
    const journey = journeyReady(state, { c });
    const journey_ready = journey ? `${journey.id} — "${journey.label}"${journey.companion ? ` with ${sceneHandle(state, content, journey.companion)}` : ''}: ${journey.why}; Alaric may continue it when he clearly agrees` : undefined;
    const day = today(state);
    const completed = Object.values(state.quests).filter((q) => q.status === 'completed' && (q.history || []).some((h) => h.status === 'completed' && Math.floor((h.minute ?? 0) / 1440) + 1 === day))
        .map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q, { c }) }));
    const hall = hallOf(state, at);
    const town = hall ? settlementOf(state, hall) : null;
    const rank = membership(state)?.rank || 'Novice';
    // Prototype C (4.3.0-c.6): the board of the day; a notice of an earlier day has come down
    const board = hall && town ? listingsOf(state, town, rank).filter((q) => !c || listedToday(state, q)).map((q) => ({ id: q.id, title: q.title, info: questInfo(state, content, q, { c }) })) : [];
    // Prototype C (4.3.0-c.5): the contracts still listed on a Guild board he is not at (he read them there), by id
    // for a message that names one; whether he can take one, and where, the engine decides
    // (4.3.0-c.6) and yesterday's notices that came down with their day, by id for a message that names one: known, not
    // to be taken
    const seen = known ? contracts(state).filter((q) => (c ? listedToday(state, q) : q.status === 'listed') && !board.some((b) => b.id === q.id))
        .map((q) => ({ id: q.id, title: q.title, info: `Guild contract · ${q.rank} · ${q.payout_cp} cp · on the board of ${placeName(state, q.source?.board)}` })) : [];
    if (known && c) {
        for (const q of contracts(state).filter((x) => (x.status === 'expired' || (x.status === 'listed' && !listedToday(state, x))) && (x.source?.listed?.day ?? 0) >= today(state) - 1)) {
            seen.push({ id: q.id, title: q.title, info: `Guild contract · ${q.rank} · no longer on the board (posted on day ${q.source?.listed?.day}; the Guild renews its board every day)` });
        }
    }
    const offers = openOffers(state).filter((o) => o.canon ? (!o.at || hallOf(state, o.at) === hall) : state.scene.present.includes(o.seller))
        .map((o) => ({ id: o.id, seller: o.canon ? 'Guild' : personLabel(state, content, o.seller), lines: o.lines.map((l) => ({ id: l.id, what: l.what, price_cp: l.price_cp, ...(l.qty > 1 ? { qty: l.qty } : {}) })) }));
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
        ...(known ? { known: seen } : {}),
        offers,
        objects,
        open: openDecisionTexts(state),
    };
}

/** The catalog as text, and the ids the extractor's schema may use. */
export function extractorCatalog(state, content, opts = {}) {
    const c = buildCatalog(state, content, opts);
    // 4.3.0-c.6.6: the land outside the settlements needs an id of its own. Without it the nearest town was the only
    // parent on offer (live 07.10.2026: the half-way waystation on the river road and Thornwick's chapel were stored
    // inside Ashbridge, and the 6-hour walk back was capped as a stroll inside one town)
    const realm = opts.c ? realmOf(state, state.scene.at) : null;
    if (realm && state.places[realm] && !c.places.some((p) => p.id === realm)) {
        c.places = [...c.places, { id: realm, name: `${state.places[realm].name} (the realm itself: the roads, wilds and land between and beyond its settlements)` }];
    }
    return {
        text: catalogText(c),
        places: [...new Set([c.here.id, ...c.places.map((p) => p.id)].filter(Boolean))],
        quests: [...new Set([...c.quests, ...c.board, ...c.completed, ...(c.known || [])].map((q) => q.id))],
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
