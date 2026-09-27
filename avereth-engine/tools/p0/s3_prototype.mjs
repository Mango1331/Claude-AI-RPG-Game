// Runtime V4, P0 / S3: throwaway domain prototype of the V12 path (plan §16 S3, §11.1). Not product code: nothing
// in src/ imports it, and P1 builds the real reducers. It replays tests/testrun_v12/gold_v4.json through both paths
// (B: the gold inline blocks; A: the gold recovery answers), checks the twelve expectations of plan §11.1, the extra
// checks (registration, Guild hall, generator failure, coercion, old report keys) and the end state, and lists the
// boundary decisions the data needed.
//
//   node tools/p0/s3_prototype.mjs        no key, no network; writes p0_out/s3/summary.md and results.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ENGINE_ROOT, OUT_ROOT, parseArgs, readJson, writeJson, writeText, nowIso, mdTable } from './lib/util.mjs';
import { loadDeltaVocab, deltaSchema, checkBlock } from './lib/deltas.mjs';

export const TOOL = 's3_prototype';
export const TOOL_VERSION = 1;
export const GOLD_FILE = path.join(ENGINE_ROOT, 'tests', 'testrun_v12', 'gold_v4.json');

export const RULES = {
    registration_fee_cp: 20,
    branch_kinds: ['city', 'capital'],
    ranks: ['Novice', 'Proven', 'Veteran', 'Elite', 'Master', 'Grandmaster', 'Legend'],
    rank_levels: { Novice: [1, 14], Proven: [15, 29], Veteran: [30, 44], Elite: [45, 59], Master: [60, 74], Grandmaster: [75, 89], Legend: [90, 104] },
    default_cap_min: 120,
    travel_cap_min: 7 * 1440,
    until: { noon: 720, evening: 1080, end_of_day: 1200, night: 1320, dawn: 360, morning: 480 },
    done_min: 720,
    quest_base_per_level: 10,
    quest_type: { minor: 1.5, standard: 2, dangerous: 3, major: 5 },
    blocked_fact_predicates: ['takes', 'carries', 'has', 'holds', 'lacks', 'owns', 'price', 'guild_rank', 'located', 'intent'],
    parents: { site: ['settlement', 'district', 'region', 'wilderness', 'site'], interior: ['site', 'district', 'settlement'], district: ['settlement'], settlement: ['realm', 'region'], region: ['realm', 'region'], wilderness: ['realm', 'region'] },
};

const VERBS = { rest: 'RESTS', sleep: 'SLEEPS', wait: 'WAITS', work: 'WORKS', train: 'TRAINS', study: 'STUDIES', craft: 'CRAFTS', search: 'SEARCHES', gather: 'GATHERS', errand: 'RUNS ERRANDS' };

export const slug = (s) => String(s ?? '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export function clockText(m) {
    const day = Math.floor(m / 1440) + 1;
    const t = m % 1440;
    return `Day ${day}, ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
const bySeq = (a, b) => (a.seq ?? 0) - (b.seq ?? 0);

// ------------------------------------------------------------------------------------------------ state
export function newState(initial, { generator = null, generatorFails = false } = {}) {
    const st = {
        clock: initial.clock,
        turn: 0,
        pc: { coin: initial.coin_cp, xp: initial.xp, level: initial.level, power: initial.power_rank, guild: null },
        locations: structuredClone(initial.locations),
        scene: { at: initial.scene_at, present: [] },
        entities: {}, knowledge: {}, memories: {}, facts: [],
        quests: {}, boards: {}, objects: {}, offers: {}, decisions: [],
        corrections: [], system: [], events: [],
        opts: { generator, generatorFails },
    };
    for (const [id, l] of Object.entries(st.locations)) {
        if (l.kind === 'settlement' && RULES.branch_kinds.includes(l.sub)) addLocation(st, `${id}.guild_hall`, { name: "Adventurers' Guild hall", kind: 'site', parent: id, tags: ['guild_hall'] }, 'engine');
    }
    return st;
}

function emit(st, t, d = {}) {
    st.events.push({ t, turn: st.turn, d });
}

function addLocation(st, id, loc, by) {
    st.locations[id] = { ...loc, tags: loc.tags || [] };
    emit(st, 'location.created', { id, name: loc.name, parent: loc.parent, by });
    return id;
}

export function settlementOf(st, id) {
    let cur = id;
    for (let i = 0; cur && i < 12; i++) {
        if (st.locations[cur]?.kind === 'settlement') return cur;
        cur = st.locations[cur]?.parent;
    }
    return null;
}

/** The Guild hall node that contains a place (the hall itself or anything below it), or null. */
export function hallOf(st, id) {
    let cur = id;
    for (let i = 0; cur && i < 12; i++) {
        if ((st.locations[cur]?.tags || []).includes('guild_hall')) return cur;
        cur = st.locations[cur]?.parent;
    }
    return null;
}

export function pathNames(st, id) {
    const out = [];
    let cur = id;
    for (let i = 0; cur && i < 12; i++) {
        out.push(st.locations[cur]?.name);
        cur = st.locations[cur]?.parent;
    }
    return out;
}

/** Resolve a place reference; {new: {name, kind, parent}} creates it (same name under the same parent = same place). */
function resolvePlace(st, ref, depth = 0) {
    if (typeof ref === 'string') return st.locations[ref] ? { id: ref } : { error: `unknown place ${ref}` };
    const n = ref?.new;
    if (!n || typeof n !== 'object') return { error: 'a place needs an id or {new: {name, kind, parent}}' };
    if (depth > 1) return { error: 'at most one level of new parents' };
    if (/guild/i.test(n.name) && /hall/i.test(n.name)) return { error: 'Guild halls are engine nodes; the block cannot create one' };
    const parent = n.parent === null || n.parent === undefined ? { error: 'a new place needs a parent' } : resolvePlace(st, n.parent, depth + 1);
    if (parent.error) return parent;
    const pk = st.locations[parent.id].kind;
    if (!(RULES.parents[n.kind] || []).includes(pk)) return { error: `a ${n.kind} cannot lie in a ${pk}` };
    const same = Object.entries(st.locations).find(([, l]) => l.parent === parent.id && l.name.toLowerCase() === String(n.name).toLowerCase());
    if (same) return { id: same[0] };
    const base = parent.id.startsWith('loc.') ? parent.id : 'loc';
    return { id: addLocation(st, `${base}.${slug(n.name)}`, { name: n.name, kind: n.kind, parent: parent.id }, 'reply') };
}

function resolvePerson(st, who, refs) {
    if (!who) return null;
    if (st.entities[who]) return who;
    if (refs?.has(who)) return refs.get(who);
    const w = String(who).toLowerCase().replace(/^the (same )?/, '').trim();
    const hits = Object.values(st.entities).filter((e) => [e.name, e.role].filter(Boolean).some((x) => x.toLowerCase() === w || x.toLowerCase().endsWith(w) || w.endsWith(x.toLowerCase().split(' ').pop())));
    return hits.length === 1 ? hits[0].id : null;
}

function witness(st, fact, step) {
    for (const who of st.scene.present) {
        (st.knowledge[who] = st.knowledge[who] || []).push({ ...fact, how: 'witnessed', turn: st.turn, step });
        emit(st, 'knowledge.gained', { who, ...fact, how: 'witnessed', step });
    }
}

function enterScene(st, id) {
    if (st.scene.present.includes(id)) return;
    st.scene.present.push(id);
    emit(st, 'scene.entered', { id, at: st.scene.at });
    const knows = (st.knowledge[id] || []).some((k) => k.s === 'pc' && k.p === 'appearance');
    if (!knows) {
        (st.knowledge[id] = st.knowledge[id] || []).push({ s: 'pc', p: 'appearance', o: 'seen', how: 'witnessed', turn: st.turn });
        emit(st, 'knowledge.gained', { who: id, s: 'pc', p: 'appearance', how: 'witnessed' });
        (st.memories[id] = st.memories[id] || []).push(`first saw Alaric at ${st.locations[st.scene.at]?.name}`);
        emit(st, 'memory.added', { who: id, text: 'first saw Alaric' });
    }
}

const listingsOf = (st, branch, rank) => (st.boards[`${branch}|${rank}`]?.listings || []).map((id) => st.quests[id]).filter((q) => q && q.status === 'listed');

/** Board generator (plan §6.4): canonical first. Validates hard limits, books listings; a failure books nothing. */
function runGenerator(st, branch, rank) {
    const g = st.opts.generator;
    if (st.opts.generatorFails || !g || g.branch !== branch || g.rank !== rank) {
        if (!st.system.includes('BOARD GENERATION FAILED')) st.system.push('BOARD GENERATION FAILED');
        emit(st, 'board.generation_failed', { branch, rank });
        return { ok: false };
    }
    const [lo, hi] = RULES.rank_levels[rank];
    const ok = g.listings.filter((l) => l.rank === rank && Number.isInteger(l.level) && l.level >= lo && l.level <= hi && Number.isInteger(l.payout_cp) && l.payout_cp >= 0
        && l.objectives?.length >= 1 && l.objectives.length <= 4 && l.proof?.length >= 1);
    emit(st, 'board.generated', { branch, rank, count: ok.length, rejected: g.listings.length - ok.length });
    for (const l of ok) {
        st.quests[l.id] = { ...structuredClone(l), kind: 'guild_contract', source: { board: `${branch}.guild_hall`, listed: { turn: st.turn, minute: st.clock } }, status: 'listed', taker: null, history: [{ turn: st.turn, status: 'listed' }], schedule: { starts_at: null }, details: [] };
        emit(st, 'quest.created', { id: l.id, status: 'listed', rank, payout_cp: l.payout_cp });
    }
    st.boards[`${branch}|${rank}`] = { day: Math.floor(st.clock / 1440) + 1, listings: ok.map((l) => l.id) };
    emit(st, 'board.refreshed', { branch, rank, listings: ok.map((l) => l.id) });
    return { ok: true };
}

function heldBy(st, who) {
    return Object.values(st.objects).filter((o) => o.holder?.entity === who);
}

/** Proof check at the desk (plan §6.3): objects in the quest's unit, marks on a held document. */
function checkProof(st, q) {
    const consume = [];
    for (const p of q.proof || []) {
        if (p.kind === 'object') {
            const o = heldBy(st, 'pc').find((x) => x.name.toLowerCase().includes(String(p.what).toLowerCase()) && (x.unit || null) === (p.unit || null) && (x.qty ?? 1) >= (p.qty ?? 1));
            if (!o) return { ok: false, reason: `${p.qty ?? 1} ${p.unit ?? ''} ${p.what} missing`.replace(/\s+/g, ' ') };
            if (p.consume) consume.push(o.id);
        } else if (p.kind === 'mark') {
            const doc = heldBy(st, 'pc').find((x) => (x.marks || []).some((m) => m.text.toLowerCase().includes(String(p.what).toLowerCase())));
            if (!doc) return { ok: false, reason: `the mark "${p.what}" is missing` };
        }
    }
    return { ok: true, consume };
}

function proofText(q) {
    return (q.proof || []).map((p) => (p.kind === 'object' ? `${p.qty ?? 1} ${p.unit ?? ''} of ${p.what}`.replace(/\s+/g, ' ') : `"${p.what}" on the ${p.on}`)).join(' and ');
}

function completeContract(st, q, step) {
    const pr = checkProof(st, q);
    emit(st, 'proof.checked', { quest: q.id, ok: pr.ok, reason: pr.reason ?? null });
    if (!pr.ok) return pr;
    for (const id of pr.consume) {
        st.objects[id].holder = { consumed: 'guild' };
        emit(st, 'object.consumed', { id, by: 'guild' });
    }
    st.pc.coin += q.payout_cp;
    emit(st, 'coin.changed', { delta: q.payout_cp, why: `Guild payout: ${q.title}`, by: 'guild' });
    const xp = Math.round(RULES.quest_base_per_level * q.level * RULES.quest_type[q.qtype]);
    st.pc.xp += xp;
    emit(st, 'xp.gained', { xp, why: `Quest XP: ${q.title}` });
    q.status = 'completed';
    q.history.push({ turn: st.turn, status: 'completed', at: st.scene.at, step });
    emit(st, 'quest.status', { id: q.id, from: 'active', to: 'completed', at: st.scene.at, step });
    return pr;
}

function register(st, step) {
    const hall = hallOf(st, st.scene.at);
    st.pc.guild = { rank: 'Novice', since: st.turn, branch: settlementOf(st, hall) };
    emit(st, 'guild.registered', { rank: 'Novice', branch: st.pc.guild.branch, power_rank: st.pc.power });
    st.objects['obj.guild_plate'] = { id: 'obj.guild_plate', name: 'Guild registration plate', kind: 'document', qty: 1, unit: null, holder: { entity: 'pc' }, marks: [{ text: 'Novice stamp', by: 'guild' }], for_quests: [] };
    emit(st, 'object.created', { id: 'obj.guild_plate', holder: 'pc' });
    witness(st, { s: 'pc', p: 'registered', o: 'Novice' }, step);
}

// ------------------------------------------------------------------------------------------------ commands (plan §4)
const COMMANDS = {
    go(st, c, ctx) {
        const known = typeof c.to === 'string';
        if (known && !st.locations[c.to]) return { status: 'refused', reason: 'unknown place', line: 'CANNOT GO — unknown place.' };
        if (known && c.to === st.scene.at) return { status: 'refused', reason: 'already here', line: 'NOTHING TO DO — he is already there.' };
        const name = known ? st.locations[c.to].name : String(c.to?.new ?? 'somewhere');
        const local = !known || settlementOf(st, c.to) === settlementOf(st, st.scene.at);
        ctx.auth.go = { seq: c.seq, to: known ? c.to : null, name, hall: known && !!hallOf(st, c.to) };
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, local ? RULES.default_cap_min : RULES.travel_cap_min);
        ctx.expectedKeys[String(c.seq)] = 'go';
        return { status: 'authorized', line: `GOES — to ${name} (report whether he arrives and where).` };
    },
    'quest.accept'(st, c) {
        const q = typeof c.quest === 'string' ? st.quests[c.quest] : null;
        if (!q) return { status: c.quest === null ? 'clarify' : 'refused', reason: 'no such contract', line: `CANNOT ACCEPT — no such contract${c.quest?.new ? ` ("${c.quest.new}")` : ''} is on the board.` };
        if (q.kind !== 'guild_contract') return { status: 'refused', reason: 'private jobs are not in this prototype' };
        if (q.status !== 'listed') return { status: 'refused', reason: `the listing is ${q.status}`, line: `CANNOT ACCEPT — "${q.title}" is no longer on the board.` };
        if (hallOf(st, st.scene.at) !== q.source.board) return { status: 'refused', reason: 'not at the Guild hall of that board', line: `CANNOT ACCEPT — "${q.title}" is taken at its Guild hall.` };
        if (!st.pc.guild) return { status: 'refused', reason: 'not a Guild member', line: `CANNOT ACCEPT — "${q.title}": he is not a Guild member.` };
        if (RULES.ranks.indexOf(q.rank) > RULES.ranks.indexOf(st.pc.guild.rank)) return { status: 'refused', reason: 'rank too high' };
        q.status = 'active';
        q.taker = 'pc';
        q.history.push({ turn: st.turn, status: 'active', at: st.scene.at, step: c.seq, witnesses: [...st.scene.present] });
        const b = st.boards[`${settlementOf(st, st.scene.at)}|${q.rank}`];
        if (b) b.listings = b.listings.filter((id) => id !== q.id);
        emit(st, 'quest.status', { id: q.id, from: 'listed', to: 'active', at: st.scene.at, step: c.seq });
        witness(st, { s: 'pc', p: 'accepted', o: q.id }, c.seq);
        return { status: 'resolved', line: `ACCEPTS — "${q.title}" at the Guild desk; the clerk logs it (the Guild pays ${q.payout_cp} cp on completion).` };
    },
    'quest.turn_in'(st, c, ctx) {
        let id = typeof c.quest === 'string' ? c.quest : null;
        if (c.quest === null || c.quest === undefined) {
            const active = Object.values(st.quests).filter((q) => q.kind === 'guild_contract' && q.status === 'active');
            if (active.length !== 1) return { status: 'clarify', reason: 'which contract?', line: 'CLARIFY — which contract does he turn in?' };
            id = active[0].id;
        }
        const q = st.quests[id];
        if (!q) return { status: 'refused', reason: 'unknown contract' };
        if (q.status === 'completed') return { status: 'refused', reason: 'already_completed', line: `NOTHING TO DO — "${q.title}" is already turned in.` };
        if (q.status !== 'active') return { status: 'refused', reason: `the contract is ${q.status}` };
        if (hallOf(st, st.scene.at)) {
            const r = completeContract(st, q, c.seq);
            return r.ok ? { status: 'resolved', line: `TURNS IN — "${q.title}": accepted; the Guild pays ${q.payout_cp} cp.` } : { status: 'refused', reason: r.reason, line: `TURNS IN — "${q.title}": refused, ${r.reason}.` };
        }
        if (ctx.auth.go?.hall && ctx.auth.go.seq < c.seq) {
            const pre = checkProof(st, q);
            ctx.conditionals.push({ seq: c.seq, quest: q.id, condition: 'arrive_guild_hall', done: false });
            return {
                status: 'conditional', condition: 'arrive_guild_hall',
                line: `TURNS IN, when he reaches the Guild hall — "${q.title}": the desk checks ${proofText(q)} → ${pre.ok ? `accepted; the Guild pays ${q.payout_cp} cp` : `refused: ${pre.reason}`}. If the reply does not reach the hall, nothing is turned in.`,
            };
        }
        return { status: 'refused', reason: 'not at a Guild hall', line: `CANNOT TURN IN — "${q.title}": contracts are turned in at a Guild hall.` };
    },
    'guild.register'(st, c) {
        if (!hallOf(st, st.scene.at)) return { status: 'refused', reason: 'not at a Guild hall', line: 'CANNOT REGISTER — only at a Guild hall.' };
        if (st.pc.guild) return { status: 'refused', reason: 'already a member', line: 'NOTHING TO DO — he is already a member.' };
        const fee = RULES.registration_fee_cp;
        st.offers['offer.registration'] = { id: 'offer.registration', seller: 'guild', at: st.scene.at, status: 'open', canon: true, lines: [{ id: 'l1', what: 'Guild registration fee', kind: 'service', service: 'guild_registration', qty: 1, price_cp: fee }] };
        emit(st, 'offer.created', { id: 'offer.registration', canon: true, price_cp: fee });
        st.decisions.push({ id: 'dec.registration', kind: 'registration', offer: 'offer.registration' });
        emit(st, 'decision.opened', { id: 'dec.registration', kind: 'registration' });
        return { status: 'pending', reason: 'fee', line: `REGISTERS — pending: the Guild's registration fee is 2 silver (${fee} cp), one-time. Let the clerk name it and explain; stop there: he has not agreed to pay.` };
    },
    'offer.accept'(st, c) {
        const o = st.offers[c.offer];
        if (!o || o.status !== 'open') return { status: 'refused', reason: 'no open offer', line: 'CANNOT ACCEPT — there is no such open offer.' };
        const lines = Array.isArray(c.lines) && c.lines.length ? o.lines.filter((l) => c.lines.includes(l.id)) : o.lines;
        const price = lines.reduce((n, l) => n + l.price_cp * (l.qty || 1), 0);
        if (st.pc.coin < price) return { status: 'refused', reason: 'not enough coin', line: `CANNOT PAY — ${price} cp needed.` };
        st.pc.coin -= price;
        emit(st, 'transaction.completed', { offer: o.id, lines: lines.map((l) => l.id), cp: price });
        emit(st, 'coin.changed', { delta: -price, why: lines.map((l) => l.what).join(', ') });
        const reg = lines.some((l) => l.service === 'guild_registration');
        if (reg) register(st, c.seq);
        o.status = 'accepted';
        emit(st, 'offer.closed', { id: o.id, status: 'accepted' });
        for (const d of st.decisions.filter((x) => x.offer === o.id)) emit(st, 'decision.closed', { id: d.id });
        st.decisions = st.decisions.filter((x) => x.offer !== o.id);
        return { status: 'resolved', line: reg ? `PAYS — the Guild registration fee, ${price} cp: registered, Guild Rank Novice; the crystal reads Power Rank ${st.pc.power}; he receives his Guild plate.` : `ACCEPTS the offer — ${lines.map((l) => l.what).join(', ')} for ${price} cp.` };
    },
    pay(st, c, ctx) {
        const reg = st.offers['offer.registration'];
        if (reg && reg.status === 'open' && (c.amount_cp === null || c.amount_cp === undefined || c.amount_cp === RULES.registration_fee_cp)) {
            return COMMANDS['offer.accept'](st, { ...c, type: 'offer.accept', offer: 'offer.registration', lines: null }, ctx);
        }
        return { status: 'refused', reason: 'generic payments are not in this prototype' };
    },
    'board.read'(st, c) {
        const hall = hallOf(st, st.scene.at);
        if (!hall) return { status: 'refused', reason: 'no Guild board here', line: 'CANNOT READ — the Guild board is in the Guild hall.' };
        const rank = c.rank || st.pc.guild?.rank || 'Novice';
        const branch = settlementOf(st, hall);
        if (!listingsOf(st, branch, rank).length && !runGenerator(st, branch, rank).ok) {
            return { status: 'resolved', reason: 'generator_failed', line: 'READS the board — BOARD: no new official contracts can be shown right now; invent none.' };
        }
        const listed = listingsOf(st, branch, rank);
        emit(st, 'board.shown', { branch, rank, listings: listed.map((q) => q.id) });
        return { status: 'resolved', line: `READS the ${rank} board — BOARD (canonical; show exactly these, invent no other official contract): ${listed.map((q) => `${q.title} · ${q.payout_cp} cp`).join(' | ')}.` };
    },
    take(st, c, ctx) {
        const o = typeof c.object === 'string' ? st.objects[c.object] : null;
        if (!o) {
            if (!c.object?.new) return { status: 'refused', reason: 'unknown object' };
            ctx.auth.take.push(c.seq);
            ctx.expectedKeys[String(c.seq)] = 'take';
            return { status: 'authorized', line: `TAKES — ${c.object.new}, if it is there.` };
        }
        if (o.holder?.entity === 'pc') return { status: 'refused', reason: 'he holds it already' };
        if (o.holder?.loc !== st.scene.at) return { status: 'refused', reason: 'it is not here', line: `CANNOT TAKE — ${o.name} is not here.` };
        o.holder = { entity: 'pc' };
        emit(st, 'object.moved', { id: o.id, to: 'pc' });
        return { status: 'resolved', line: `TAKES — ${o.name} (${o.qty} ${o.unit}) along.` };
    },
    activity(st, c, ctx) {
        let cap;
        if (c.until === 'done') cap = RULES.done_min;
        else if (c.until) {
            const target = RULES.until[c.until];
            const now = st.clock % 1440;
            cap = target > now ? target - now : target + 1440 - now;
        } else if (c.minutes) cap = Math.ceil(c.minutes * 1.25);
        else cap = RULES.default_cap_min;
        ctx.auth.timeCap = Math.max(ctx.auth.timeCap, cap);
        if (c.kind === 'gather') ctx.auth.gather = true;
        ctx.expectedKeys[String(c.seq)] = 'activity';
        const until = c.until === 'end_of_day' ? 'until the end of the day' : c.until ? `until ${c.until}` : c.minutes ? `for ${c.minutes} minutes` : 'for a while';
        return { status: 'authorized', cap, line: `${VERBS[c.kind] || c.kind.toUpperCase()} ${c.what ? `${c.what} ` : ''}${until} (at most ${cap} minutes; the story decides how long it takes and what it yields).` };
    },
    buy(st, c, ctx) {
        const d = { id: `dec.t${st.turn}.${c.seq}`, kind: 'purchase', what: c.what, offer: null, priced: false };
        st.decisions.push(d);
        emit(st, 'decision.opened', { id: d.id, kind: 'purchase', what: c.what });
        ctx.expectedKeys[String(c.seq)] = 'buy';
        ctx.pendingBuy = d;
        return {
            status: 'pending', reason: 'no_price', line: `WANTS — ${c.what}; no price is known.`,
            extra: [`OPEN DECISION — Alaric wants ${c.what}; no price is known. Let the seller name the prices, then stop: he has not agreed to pay.`],
        };
    },
};

export function resolveCommands(st, turnNo, commands) {
    st.turn = turnNo;
    const ctx = { auth: { go: null, gather: false, take: [], timeCap: RULES.default_cap_min }, conditionals: [], expectedKeys: {}, actions: [], resolutions: [], pendingBuy: null, timeUsed: 0 };
    const start = st.events.length;
    emit(st, 'cmd.interpreted', { commands: commands.length });
    for (const c of [...commands].sort(bySeq)) {
        const r = COMMANDS[c.type] ? COMMANDS[c.type](st, c, ctx) : { status: 'refused', reason: `unknown command ${c.type}` };
        ctx.resolutions.push({ seq: c.seq, status: r.status, ...(r.reason ? { reason: r.reason } : {}), ...(r.cap ? { cap: r.cap } : {}), ...(r.condition ? { condition: r.condition } : {}) });
        emit(st, 'cmd.resolved', { seq: c.seq, type: c.type, status: r.status, reason: r.reason ?? null });
        if (r.line) ctx.actions.push(`${c.seq}. ${r.line}`);
        if (r.extra) ctx.actions.push(...r.extra);
    }
    ctx.playerEvents = st.events.slice(start);
    return ctx;
}

// ------------------------------------------------------------------------------------------------ deltas (plan §5)
const DELTAS = {
    time(st, d, ctx) {
        if (ctx.timeUsed + d.minutes > ctx.auth.timeCap) return { reject: `${d.minutes} min exceed the cap of ${ctx.auth.timeCap} min of this turn` };
        ctx.timeUsed += d.minutes;
        st.clock += d.minutes;
        emit(st, 'time.advanced', { minutes: d.minutes });
        return null;
    },
    arrive(st, d, ctx) {
        if (!ctx.auth.go) return { reject: 'arrive without a GOES action' };
        const at = resolvePlace(st, d.at);
        if (at.error) return { reject: at.error };
        st.scene.at = at.id;
        st.scene.present = [];
        emit(st, 'scene.arrived', { at: at.id });
        ctx.arrived = at.id;
        if (hallOf(st, at.id)) {
            ctx.arrivedHall = hallOf(st, at.id);
            for (const k of ctx.conditionals.filter((x) => !x.done && x.condition === 'arrive_guild_hall')) {
                k.done = true;
                const r = completeContract(st, st.quests[k.quest], k.seq);
                emit(st, 'cmd.completed', { seq: k.seq, ok: r.ok });
            }
        }
        return null;
    },
    'person.new'(st, d, ctx, refs) {
        const id = `npc.${slug(d.name || d.role)}`;
        if (!st.entities[id]) {
            let at = null;
            if (d.present) at = st.scene.at;
            else if (d.at) {
                const p = resolvePlace(st, d.at);
                if (p.error) return { reject: p.error };
                at = p.id;
            }
            st.entities[id] = { id, name: d.name, role: d.role, desc: d.desc, at };
            emit(st, 'entity.created', { id, present: d.present, at });
        }
        refs.set(d.ref, id);
        if (d.present) enterScene(st, id);
        return null;
    },
    enter(st, d, ctx, refs) {
        const id = resolvePerson(st, d.who, refs);
        if (!id) return { reject: `unknown person ${d.who}` };
        enterScene(st, id);
        return null;
    },
    leave(st, d, ctx, refs) {
        const id = resolvePerson(st, d.who, refs);
        if (!id || !st.scene.present.includes(id)) return { reject: `${d.who} is not present` };
        st.scene.present = st.scene.present.filter((x) => x !== id);
        emit(st, 'scene.left', { id });
        return null;
    },
    fact(st, d) {
        if (RULES.blocked_fact_predicates.includes(String(d.p).toLowerCase())) return { reject: `the predicate "${d.p}" belongs to a domain, not to a fact` };
        st.facts.push({ s: d.s, p: d.p, o: d.o, turn: st.turn });
        emit(st, 'fact.added', { s: d.s, p: d.p });
        return null;
    },
    'object.new'(st, d, ctx, refs) {
        let holder;
        if (d.holder === 'here') holder = { loc: st.scene.at };
        else if (st.locations[d.holder]) holder = { loc: d.holder };
        else if (d.holder === 'pc' || /alaric/i.test(d.holder)) {
            if (!ctx.auth.gather && !ctx.auth.take.length) return { reject: 'Alaric holds a new object only after his TAKES or GATHERS action' };
            holder = { entity: 'pc' };
        } else {
            const who = resolvePerson(st, d.holder, refs);
            if (!who) return { reject: `unknown holder ${d.holder}` };
            holder = { entity: who };
        }
        const id = `obj.t${st.turn}.${slug(d.name)}`;
        st.objects[id] = { id, name: d.name, kind: d.kind, qty: d.qty, unit: d.unit, holder, marks: [], for_quests: typeof d.for_quest === 'string' ? [d.for_quest] : [] };
        emit(st, 'object.created', { id, holder });
        return null;
    },
    offer(st, d, ctx, refs) {
        const seller = resolvePerson(st, d.seller, refs);
        if (!seller || !st.scene.present.includes(seller)) return { reject: `the seller ${d.seller} is not present` };
        const id = `offer.t${st.turn}.${Object.keys(st.offers).length + 1}`;
        st.offers[id] = { id, seller, at: st.scene.at, status: 'open', lines: d.lines.map((l, i) => ({ id: `l${i + 1}`, ...l })) };
        emit(st, 'offer.created', { id, seller, lines: d.lines.length });
        ctx.counterparts.add(seller);
        if (ctx.pendingBuy) Object.assign(ctx.pendingBuy, { offer: id, priced: true });
        return null;
    },
    'listing.gone'(st, d) {
        const q = typeof d.listing === 'string' ? st.quests[d.listing] : null;
        if (!q || q.status !== 'listed') return { reject: 'no such listing on the board' };
        q.status = d.why;
        q.history.push({ turn: st.turn, status: d.why });
        for (const b of Object.values(st.boards)) b.listings = b.listings.filter((x) => x !== q.id);
        emit(st, 'quest.status', { id: q.id, from: 'listed', to: d.why });
        return null;
    },
    'quest.detail'(st, d) {
        const q = typeof d.quest === 'string' ? st.quests[d.quest] : null;
        if (!q) return { reject: 'unknown quest' };
        q.details.push({ note: d.note, schedule: d.schedule, turn: st.turn });
        if (d.schedule) q.schedule.starts_at = d.schedule;
        emit(st, 'quest.detailed', { id: q.id, schedule: d.schedule });
        return null;
    },
    'quest.offer'(st, d) {
        if (/guild|board/i.test(d.giver)) return { reject: 'official Guild contracts come only from the board generator (canonical first, prose second)' };
        return { reject: 'private jobs are not in this prototype' };
    },
    'coin.gift'(st, d) {
        if (/guild/i.test(d.from)) return { reject: 'the Guild payout is booked by the engine' };
        st.pc.coin += d.cp;
        emit(st, 'coin.changed', { delta: d.cp, why: d.why, by: d.from });
        return null;
    },
    coerce(st, d, ctx, refs) {
        const by = resolvePerson(st, d.by, refs);
        if (!by || !st.scene.present.includes(by)) return { reject: 'the perpetrator is not present' };
        const seller = ctx.counterparts.has(by) || Object.values(st.offers).some((o) => o.status === 'open' && o.seller === by);
        if (seller) return { reject: 'the other side of a sale or an open offer cannot coerce (a sale is never a confiscation)' };
        return { reject: 'coercion is not needed in this prototype' };
    },
    overreach(st, d) {
        st.corrections.push({ turn: st.turn, kind: d.kind, what: d.what });
        emit(st, 'overreach.noted', { kind: d.kind, what: d.what });
        return null;
    },
};

/** Apply one block or recovery answer step by step (plan §5.2). */
export function applyReply(st, turnNo, answer, ctx, vocab) {
    st.turn = turnNo;
    const start = st.events.length;
    const catalog = { places: Object.keys(st.locations), quests: Object.keys(st.quests), objects: Object.keys(st.objects) };
    const chk = checkBlock(JSON.stringify(answer), deltaSchema(vocab, catalog, ctx.expectedKeys), ctx.expectedKeys);
    const out = { valid: chk.valid, complete: chk.complete, errors: chk.errors, missing: chk.missing, rejected: [], system: [] };
    if (!chk.valid || !chk.complete) return { ...out, events: [] };
    ctx.counterparts = new Set();
    const refs = new Map();
    for (const d of [...answer.deltas].sort(bySeq)) {
        const r = DELTAS[d.type] ? DELTAS[d.type](st, d, ctx, refs) : { reject: `the delta ${d.type} is not in this prototype` };
        if (r?.reject) {
            out.rejected.push({ seq: d.seq, type: d.type, why: r.reject });
            emit(st, 'delta.rejected', { seq: d.seq, type: d.type, why: r.reject });
        }
    }
    for (const [k, t] of Object.entries(ctx.expectedKeys)) {
        if (t === 'go' && answer.expected[k]?.arrived === true && !ctx.arrived) out.rejected.push({ seq: 0, type: 'expected', why: `expected ${k} says arrived but no arrive delta` });
        if (t === 'go' && answer.expected[k]?.arrived === false && ctx.arrived) out.rejected.push({ seq: 0, type: 'expected', why: `expected ${k} says not arrived but an arrive delta exists` });
    }
    for (const k of ctx.conditionals.filter((x) => !x.done)) {
        k.done = true;
        emit(st, 'cmd.expired', { seq: k.seq, reason: 'the condition did not happen in this reply' });
    }
    if (ctx.arrivedHall) {
        const branch = settlementOf(st, ctx.arrivedHall);
        const rank = st.pc.guild?.rank || 'Novice';
        if (!listingsOf(st, branch, rank).length) runGenerator(st, branch, rank);
    }
    for (const c of st.corrections.filter((x) => x.turn === turnNo)) out.system.push(`NOT APPLIED — ${c.what}`);
    out.events = st.events.slice(start);
    return out;
}

// ------------------------------------------------------------------------------------------------ excerpts and replay
export function excerpt(st) {
    const quests = Object.fromEntries(Object.values(st.quests).filter((q) => q.status !== 'listed' && q.status !== 'taken_by_other').map((q) => [q.id, q.status]));
    const listings = Object.fromEntries(Object.values(st.quests).filter((q) => q.kind === 'guild_contract' && (q.status === 'listed' || q.status === 'taken_by_other' || q.history.some((h) => h.status === 'listed'))).map((q) => [q.id, q.status]));
    return {
        clock: clockText(st.clock),
        coin_cp: st.pc.coin,
        xp: st.pc.xp,
        member: st.pc.guild?.rank ?? null,
        scene_at: st.scene.at,
        scene_path: pathNames(st, st.scene.at),
        present: [...st.scene.present],
        quests,
        listings,
        objects: Object.fromEntries(Object.values(st.objects).map((o) => [o.id, o.holder?.entity ?? o.holder?.loc ?? (o.holder?.consumed ? 'consumed' : null)])),
        offers: Object.fromEntries(Object.values(st.offers).map((o) => [o.id, o.status])),
        offers_open_lines: Object.values(st.offers).filter((o) => o.status === 'open' && !o.canon).flatMap((o) => o.lines.map((l) => l.price_cp)),
        decisions: st.decisions.map((d) => d.kind),
        corrections: st.corrections.length,
        novice_contracts_done: Object.values(st.quests).filter((q) => q.kind === 'guild_contract' && q.rank === 'Novice' && q.status === 'completed').length,
    };
}

/** Replay the gold turns through one path ('block' = variant B, 'recovery' = variant A). */
export function replay(gold, vocab, { answer = 'block', generatorFails = false, override = {} } = {}) {
    const st = newState(gold.initial, { generator: gold.board_generator, generatorFails });
    const turns = [];
    for (const t of gold.turns) {
        const commands = override[t.id]?.commands ?? t.commands;
        const ctx = resolveCommands(st, t.msg, commands);
        const afterPlayer = excerpt(st);
        const ans = override[t.id]?.answer ?? t[answer];
        const rep = applyReply(st, t.reply, ans, ctx, vocab);
        turns.push({ id: t.id, ctx, resolutions: ctx.resolutions, actions: ctx.actions, playerEvents: ctx.playerEvents, reply: rep, afterPlayer, afterReply: excerpt(st) });
        if (override[t.id]?.stop) break;
    }
    return { st, turns };
}

// ------------------------------------------------------------------------------------------------ checks
function subsequence(want, got) {
    let i = 0;
    for (const e of got) if (i < want.length && e.t === want[i]) i += 1;
    return i === want.length ? null : `missing from "${want[i]}" on (got ${got.map((e) => e.t).join(', ')})`;
}

function subsetDiff(want, got, pathName = '') {
    const out = [];
    for (const [k, v] of Object.entries(want || {})) {
        const g = got?.[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...subsetDiff(v, g, `${pathName}${k}.`));
        else if (JSON.stringify(v) !== JSON.stringify(g)) out.push(`${pathName}${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(g)}`);
    }
    return out;
}

export function runChecks(gold, vocab) {
    const B = replay(gold, vocab, { answer: 'block' });
    const A = replay(gold, vocab, { answer: 'recovery' });
    const T = (run, id) => run.turns.find((t) => t.id === id);
    const checks = [];
    const add = (id, title, ok, detail = '') => checks.push({ id, title, ok: !!ok, detail });

    const know = (st, who) => st.knowledge[who] || [];

    // per-turn gold: resolutions, PLAYER ACTIONS, events (B, in order), state excerpts, validity, rejections
    for (const run of [['B', B], ['A', A]]) {
        for (const t of gold.turns) {
            const r = T(run[1], t.id);
            const res = subsetDiff(Object.fromEntries(t.resolutions.map((x) => [x.seq, x])), Object.fromEntries(r.resolutions.map((x) => [x.seq, x])));
            const acts = (t.actions_contains || []).filter((s) => !r.actions.join('\n').includes(s));
            const state = [...subsetDiff(t.after_player, r.afterPlayer), ...subsetDiff(t.after_reply, r.afterReply)];
            const problems = [...res, ...acts.map((s) => `PLAYER ACTIONS lack "${s}"`), ...state];
            if (!r.reply.valid || !r.reply.complete) problems.push(`answer ${r.reply.valid ? 'incomplete' : 'invalid'}: ${[...r.reply.errors, ...r.reply.missing].join('; ')}`);
            if (r.reply.rejected.length) problems.push(`rejected: ${r.reply.rejected.map((x) => `${x.type} (${x.why})`).join('; ')}`);
            if (run[0] === 'B') {
                const pe = subsequence(t.events_player || [], r.playerEvents);
                const re = subsequence(t.events_reply || [], r.reply.events);
                if (pe) problems.push(`player events: ${pe}`);
                if (re) problems.push(`reply events: ${re}`);
            }
            add(`gold_${run[0]}_${t.id}`, `Pfad ${run[0]}, ${t.id} (Nachricht ${t.msg} → Antwort ${t.reply}): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand`, problems.length === 0, problems.join(' · '));
        }
    }
    try {
        expectations(gold, vocab, B, A, T, add, know);
    } catch (err) {
        add('CRASH', 'Prüfungen abgebrochen', false, err.message);
    }
    for (const id of CHECK_IDS) if (!checks.some((c) => c.id === id)) add(id, 'nicht ausgewertet', false, 'die Prüfungen brachen vorher ab');
    return { checks, B, A };
}

/** The twelve expectations of plan §11.1, the extra checks, the end state and the A/B equality. */
function expectations(gold, vocab, B, A, T, add, know) {
    const sB = B.st;
    // twelve expectations (plan §11.1)
    const t3 = T(B, 't3');
    const pay = t3.afterPlayer.listings;
    add('E1', 'Fünf sichtbare Verträge sind kanonisch (nach Nachricht 9: 5 × listed, Novice, 80/150/40/20/50 cp; nach Antwort 10: Weasel taken_by_other)',
        Object.values(pay).filter((s) => s === 'listed').length === 5 && JSON.stringify(gold.board_generator.listings.map((l) => sB.quests[l.id]?.payout_cp)) === '[80,150,40,20,50]'
        && t3.afterReply.listings['quest.weasel_fenwick'] === 'taken_by_other', JSON.stringify(t3.afterReply.listings));
    const t4 = T(B, 't4');
    add('E2', "Miller's Run bleibt nach Nachricht 11 aktiv, Rang Novice aus dem Listing, kein delta.rejected", t4.afterPlayer.quests['quest.millers_run_escort'] === 'active' && sB.quests['quest.millers_run_escort']?.rank === 'Novice' && !B.turns.some((x) => x.reply.rejected.length));
    add('E3', 'Ossler existiert, ist nicht da und nicht getroffen', !!sB.entities['npc.ossler'] && !t4.afterReply.present.includes('npc.ossler') && !know(sB, 'npc.ossler').length && !(sB.memories['npc.ossler'] || []).length,
        `at ${sB.entities['npc.ossler']?.at}`);
    const t5 = T(B, 't5');
    add('E4', '„register the Herb Run“ ist Annahme in der Gildenhalle', t5.resolutions[0]?.status === 'resolved' && t5.afterPlayer.quests['quest.herb_run_marshmint'] === 'active');
    const clerkSaw = know(sB, 'npc.guild_clerk').find((k) => k.p === 'accepted' && k.o === 'quest.herb_run_marshmint');
    add('E5', 'Der Clerk hat die Annahme vor der Reise bezeugt (witnessed, Schritt 1, Nachricht 13)', clerkSaw && clerkSaw.how === 'witnessed' && clerkSaw.step === 1 && clerkSaw.turn === 13);
    add('E6', 'Reedbeds haben den richtigen Elternort (reedbeds › eastern mill leat › Redmarch › Veyrhold)', JSON.stringify(t5.afterReply.scene_path) === JSON.stringify(['reedbeds', 'eastern mill leat', 'Redmarch', 'Veyrhold']), JSON.stringify(t5.afterReply.scene_path));
    const t6 = T(B, 't6');
    add('E7', 'Langes Sammeln ist autorisiert (Deckel 560 min, time 300 angenommen)', t6.resolutions[0]?.cap === 560 && !t6.reply.rejected.length && t6.afterReply.clock === 'Day 1, 15:40');
    const t7 = T(B, 't7');
    add('E8', 'Marshmint existiert physisch (nach Antwort 16 in den Reedbeds, nach Nachricht 17 bei Alaric)', t6.afterReply.objects['obj.t16.marshmint'] === 'loc.redmarch.eastern_mill_leat.reedbeds' && t7.afterPlayer.objects['obj.t16.marshmint'] === 'pc');
    add('E9', '„carry it back to the Guild“ = take + go + bedingte Abgabe', JSON.stringify(t7.resolutions.map((x) => x.status)) === '["resolved","authorized","conditional"]');
    add('E10', 'Abgabe prüft den Beweis: Marshmint abgegeben, +40 cp, +15 XP, Herb Run completed, 1/5 Novice-Verträge',
        t7.afterReply.quests['quest.herb_run_marshmint'] === 'completed' && t7.afterReply.coin_cp === 70 && t7.afterReply.xp === 15 && t7.afterReply.objects['obj.t16.marshmint'] === 'consumed' && t7.afterReply.novice_contracts_done === 1);
    const t8 = T(B, 't8');
    add('E11', 'Gasthaussuche nimmt keinen Preis an: buy pending, Angebot 4/2/1 cp, Coin unverändert, overreach → Korrektur',
        t8.resolutions[2]?.status === 'pending' && [4, 2, 1].every((p) => t8.afterReply.offers_open_lines.includes(p)) && t8.afterReply.coin_cp === 70 && t8.afterReply.corrections === 1 && t8.reply.system.some((s) => s.startsWith('NOT APPLIED')));
    // E12: coercion by the seller and the old report key
    const co = replay(gold, vocab, { answer: 'block', override: { t8: { answer: { ...gold.turns[7].block, deltas: [...gold.turns[7].block.deltas, gold.variants.coerce_by_seller] } } } });
    const coT8 = T(co, 't8');
    const old = replay(gold, vocab, { answer: 'block', override: { t8: { answer: { ...gold.turns[7].block, deltas: [...gold.turns[7].block.deltas, gold.variants.old_report_key] } } } });
    const oldT8 = T(old, 't8');
    add('E12', '`coerce` durch den Anbieter eines offenen Angebots wird abgelehnt; ein alter `taken_by`-Schlüssel scheitert am Schema',
        coT8.reply.rejected.some((r) => r.type === 'coerce' && /sale/.test(r.why)) && coT8.afterReply.coin_cp === 70 && !oldT8.reply.valid && oldT8.reply.errors.some((e) => /taken_by|anyOf/.test(e)),
        `${coT8.reply.rejected.map((r) => r.why).join('; ')} | ${oldT8.reply.errors.slice(0, 2).join('; ')}`);
    // extras
    const t2 = T(B, 't2');
    add('X1', 'Registrierung: Nachricht 7 → pending mit Canon-Gebühr 20 cp; Nachricht 9 → −20 cp, Novice, Plakette',
        t2.resolutions[0]?.status === 'pending' && t2.afterReply.offers['offer.registration'] === 'open' && t3.afterPlayer.coin_cp === 30 && t3.afterPlayer.member === 'Novice' && t3.afterPlayer.objects['obj.guild_plate'] === 'pc');
    const viaPay = replay(gold, vocab, { override: { t3: { commands: gold.variants.pay_for_registration } } });
    add('X2', '`pay` an den Clerk bei offener Registrierung = Annahme der Canon-Gebühr', T(viaPay, 't3').afterPlayer.member === 'Novice' && T(viaPay, 't3').afterPlayer.coin_cp === 30);
    const outside = replay(gold, vocab, { override: { t7: { commands: gold.variants.turn_in_outside, answer: { expected: {}, deltas: [] }, stop: true } } });
    const out7 = T(outside, 't7');
    add('X3', 'Gildenhalle: Abgabe in den Reedbeds ohne go → refused; mit take + go → conditional (E9)',
        out7.resolutions[0]?.status === 'refused' && out7.resolutions[0]?.reason === 'not at a Guild hall' && t7.resolutions[2]?.status === 'conditional');
    const notArrived = replay(gold, vocab, { override: { t7: { answer: gold.variants.reply18_not_arrived, stop: true } } });
    const na7 = T(notArrived, 't7');
    add('X4', 'Erreicht die Antwort die Halle nicht, wird nichts abgegeben (Quest aktiv, keine Auszahlung, cmd.expired)',
        na7.afterReply.quests['quest.herb_run_marshmint'] === 'active' && na7.afterReply.coin_cp === 30 && na7.reply.events.some((e) => e.t === 'cmd.expired'));
    const missing = replay(gold, vocab, { override: { t7: { answer: gold.variants.reply18_missing_expected, stop: true } } });
    const m7 = T(missing, 't7');
    add('X5', 'Fehlt ein expected-Feld, ist der Block unvollständig (Variante B ruft dann die Recovery)', m7.reply.valid && !m7.reply.complete && m7.reply.missing.includes('2'));
    const fail = replay(gold, vocab, { generatorFails: true, override: {
        t3: { answer: gold.variants.generator_failure.reply10_recovery },
        t4: { commands: gold.variants.generator_failure.msg11_commands, answer: { expected: {}, deltas: [] }, stop: true },
    } });
    const f3 = T(fail, 't3');
    const f4 = T(fail, 't4');
    add('X6', 'Generator-Ausfall (Rev. 2.1): kein Listing, BOARD GENERATION FAILED, „invent none“, Prosa-Verträge nur overreach guild_listing, quest.offer der Gilde abgelehnt, keine Annahme',
        !Object.values(fail.st.quests).length && fail.st.system.includes('BOARD GENERATION FAILED') && f3.actions.some((a) => a.includes('invent none'))
        && fail.st.corrections.some((c) => c.kind === 'guild_listing') && f3.reply.rejected.some((r) => r.type === 'quest.offer' && /canonical first/.test(r.why)) && f4.resolutions[0]?.status === 'refused',
        `${fail.st.system.join(', ')} | ${f3.reply.rejected.map((r) => r.why).join('; ')}`);
    // end state and path equality
    const end = excerpt(sB);
    const endDiff = subsetDiff({ clock: gold.end_state.clock, coin_cp: gold.end_state.coin_cp, xp: gold.end_state.xp, scene_at: gold.end_state.scene_at, quests: gold.end_state.quests }, end);
    const proofOpen = sB.quests['quest.millers_run_escort'] ? checkProof(sB, sB.quests['quest.millers_run_escort']) : { ok: true, reason: "Miller's Run missing" };
    add('END', `Endzustand: ${gold.end_state.clock}, ${gold.end_state.coin_cp} cp, ${gold.end_state.xp} XP, Marsh Bell unter Redmarch, Miller's Run aktiv mit offenem Beweis`,
        !endDiff.length && !proofOpen.ok && /signed by the waystation master/.test(proofOpen.reason) && end.scene_path.slice(-2).join('|') === 'Redmarch|Veyrhold', [...endDiff, proofOpen.reason].join(' · '));
    const diffs = [];
    for (const t of gold.turns) {
        const a = T(A, t.id).afterReply;
        const b = T(B, t.id).afterReply;
        const keys = ['clock', 'coin_cp', 'xp', 'member', 'scene_at', 'quests', 'listings', 'objects', 'offers_open_lines', 'decisions', 'corrections', 'novice_contracts_done'];
        for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(`${t.id}.${k}: A ${JSON.stringify(a[k])} ≠ B ${JSON.stringify(b[k])}`);
    }
    add('AB', 'Pfad A (Recovery) und Pfad B (Block) ergeben nach jedem Zug denselben Domänenzustand', !diffs.length, diffs.join(' · '));
}

export const CHECK_IDS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'END', 'AB'];

export const BOUNDARIES = [
    ['Befehle `drop` und `use`', 'Ein Delta darf Alarics Besitz nie bewegen oder verbrauchen (§5.1). V11 „leave the heads on the floor“ und Tränke/Rationen brauchen deshalb Befehle. Aufgenommen in `tools/p0/draft/commands.json`; §4.1 ergänzen.'],
    ['Anwesenheit bei Rückkehr', 'Die Ankunft leert die Szene; wer da ist, meldet der Block mit `enter` oder `person.new`. Die Regel aus §6.2 „Ankunft an einem Ort mit dort Anwesenden“ würde Kulissenfiguren (den Abenteurer aus Antwort 10) bei der Rückkehr wieder anwesend machen.'],
    ['IDs neuer Personen', 'Die ID kommt aus Name oder Rolle (`npc.guild_clerk`, `npc.ossler`), nicht aus dem `ref` des Blocks. `ref` verbindet nur Deltas innerhalb eines Blocks. So ergeben Block (B) und Recovery (A) dieselben IDs.'],
    ['Erwartungsfeld bei `buy`/`pay` pending', '`{priced: bool}` statt `{offer: {…}}` (§5.3): Die Preise stehen im `offer`-Delta, das Feld fragt nur, ob einer genannt wurde.'],
    ['Abgabe eines erledigten Vertrags', '`refused` (already_completed) mit PLAYER-ACTIONS-Zeile „NOTHING TO DO“ (Nachricht 19).'],
    ['`pay` bei offener Registrierung', '`pay` an die Gilde oder den Clerk mit 20 cp oder ohne Betrag gilt als Annahme der Canon-Gebühr; gleichwertig zu `offer.accept offer.registration`.'],
    ['Auszahlung', 'Die Engine zahlt bei der bedingten Abgabe mit der Ankunft (Antwort 18), auch wenn die unveränderte 3.1.7-Prosa die Auszahlung in Antwort 20 erzählt. Ein `coin.gift` der Gilde wird abgelehnt.'],
    ['Aushang für Nicht-Mitglieder', 'Der Generator läuft schon bei der Ankunft in der Halle (Antwort 6), vor der Registrierung, für den Novice-Rang. Lesen darf jeder; annehmen nur ein Mitglied.'],
    ['Neue Orte mit neuem Elternort', 'Reedbeds unter dem neuen „eastern mill leat“, Marsh Bell unter der neuen Gasse: eine Ebene verschachtelter `new`-Eltern reicht für den Lauf (§5.1).'],
    ['Zeitdeckel', 'Lokales `go` 120 min; `activity until end_of_day` ab 10:40 = 560 min; die Deckel gelten für die Summe der `time`-Deltas einer Antwort.'],
    ['Zeugen', 'Die Engine bucht das Wissen der Anwesenden bei der Auflösung des Befehls (Schritt = seq), also vor der Reise im selben Zug (E5).'],
    ['`expected.go.arrived` und `arrive`', 'Beide müssen übereinstimmen; ein Widerspruch ist ein Validatorfehler.'],
];

function summaryMarkdown(result) {
    const { checks } = result;
    const ok = checks.filter((c) => c.ok).length;
    const L = [];
    L.push('# P0 / S3 Domänen-Prototyp (V12-Pfad): Ergebnis', '');
    L.push(`- Datum: ${nowIso()} · Werkzeug ${TOOL} v${TOOL_VERSION} · Gold ${result.goldVersion} · ohne Key, ohne Netz`);
    L.push(`- **${ok} von ${checks.length} Prüfungen erfüllt**${ok === checks.length ? ' · keine offene Grenzfrage' : ''}`);
    L.push('', '## Prüfungen', '');
    L.push(mdTable(['Prüfung', 'Inhalt', 'Ergebnis', 'Detail bei Abweichung'], checks.map((c) => [c.id, c.title, c.ok ? 'erfüllt' : 'NICHT erfüllt', c.ok ? '' : c.detail])));
    L.push('', '## PLAYER ACTIONS des Normalpfads (so bekäme sie der Erzähler)', '');
    for (const t of result.B.turns) L.push(`- **${t.id}**: ${t.actions.join(' / ')}`);
    L.push('', '## Grenzentscheidungen, die die Daten verlangten (vor P1 bestätigen)', '');
    for (const [k, v] of BOUNDARIES) L.push(`- **${k}:** ${v}`);
    L.push('');
    return L.join('\n');
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const log = deps.log ?? ((t) => console.log(t));
    const gold = deps.gold ?? readJson(a.gold ? path.resolve(String(a.gold)) : GOLD_FILE);
    const vocab = loadDeltaVocab();
    const { checks, B, A } = runChecks(gold, vocab);
    const result = { tool: TOOL, version: TOOL_VERSION, goldVersion: gold.version, created: nowIso(), checks, B, A };
    const summary = summaryMarkdown(result);
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, 's3');
    writeText(path.join(outDir, 'summary.md'), summary);
    writeJson(path.join(outDir, 'results.json'), {
        tool: TOOL, version: TOOL_VERSION, created: result.created, gold: gold.version, checks,
        B: B.turns.map((t) => ({ id: t.id, resolutions: t.resolutions, actions: t.actions, after_player: t.afterPlayer, after_reply: t.afterReply, rejected: t.reply.rejected })),
        A: A.turns.map((t) => ({ id: t.id, after_reply: t.afterReply, rejected: t.reply.rejected })),
        end_state: excerpt(B.st), events_B: B.st.events,
    });
    log(summary);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')}, results.json`);
    return checks.every((c) => c.ok) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.stack || err.message}`); process.exit(1); });
}
