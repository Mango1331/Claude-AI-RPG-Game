// The NPC/PULSE evaluation of a natural run (guides/npc_pulse_test.json, docs/LIVE_RUNNER.md §7a). It reads only what
// the run saved: the chat with the engine's records (events, narrator context diagnostics, the extractor's raw answer)
// and, when given, the Chat Completion requests (chat-completions.jsonl). It never calls a model and never changes a
// record. Three kinds of findings:
//   - observations: what actually happened (meetings, returns, agreements, anchors, shared travel, PULSE windows);
//   - violations: only invariants the records carry reliably (an anchor without an earlier encounter, a trait changed
//     twice in one presence, Alaric bound to an agreement nobody of it was present for, two PULSE decisions for one
//     message, a forced PULSE draw in a natural run, fold errors);
//   - review: semantic doubts with the original passage, for the later independent review (an open window the story
//     did not show, new creatures in a closed one, a person on an arrival card named in the story but not present, a
//     stored trait and the story that followed, refused presences and traits).
// A test goal that did not occur is missing coverage, never a pass or a failure.
//
//   node tools/st_live/live/npc_pulse.mjs <run folder>     writes npc-pulse.json and npc-pulse.md into that folder
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { foldChat, rec } from '../../../src/host.js';
import { normText } from '../../../src/util.js';
import { readChatJsonl } from './export.mjs';

export const NPC_PULSE_VERSION = 2; // 2: card deliveries measured per current engine block (full/partial/none/unknown)
const ANCHORS = new Set(['voice', 'manner', 'interest']);
// rules of the engine that guard who is present or who may turn on Alaric (PULSE A/C/B and the Living Dungeon)
const PULSE_RULES = new Set(['pulse', 'road', 'pulse_take', 'envelope', 'dungeon_foe', 'dungeon_foe_thread', 'dungeon_presence', 'dungeon_slot', 'population', 'creature_continuity', 'attack_commitment', 'rest_cut']);
const NPC_RULE = /^(?:met_|desk_handler$|collective_person$|npc_|ambient$)/;
const LIST = 12; // entries per list in the Markdown report (the JSON keeps all)

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => (typeof x === 'string' ? x : x?.text || '')).join('\n') : '');
// P2-A (review of 2449990 §3): what a narrator request showed is read from its current engine block only, the last
// message that starts with the game state header (src/context.js); older chat, earlier sections and the engine's own
// bookkeeping requests (FACT REPORT REQUEST …) never count
const ENGINE_BLOCK = /^\[AVERETH ENGINE — authoritative game state\b/;
const engineBlock = (req) => (Array.isArray(req?.messages) ? req.messages.map((m) => textOf(m.content)).filter((t) => ENGINE_BLOCK.test(t.trimStart())).at(-1) ?? null : null);
const flat = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
/** The lines of one person's cards in an engine block: each "• … [id] …" line with the indented rows under it. */
function cardLines(block, id) {
    const out = [];
    let on = false;
    for (const line of String(block).split('\n')) {
        if (line.startsWith('• ')) on = line.split(' — ')[0].includes(`[${id}]`);
        else if (!line.startsWith('  ')) on = false;
        if (on) out.push(flat(line));
    }
    return out;
}
/**
 * How a card line carries a stored value after its label: "full" when the whole value stands there and ends with the
 * field ("; " or the line's end), "partial" when the card's cap cut it ("<a proper prefix of the value>…" ends the field),
 * else null. A longer different value that merely starts with it is no delivery. list: the row joins several values
 * with "; " (open between you: A; B).
 */
function carried(line, label, value, { list = false, after = null } = {}) {
    const v = flat(value);
    if (!v) return null;
    let best = null;
    for (let at = line.indexOf(label); at >= 0; at = line.indexOf(label, at + 1)) {
        if (after && !after.test(line.slice(0, at))) continue;
        const rest = line.slice(at + label.length);
        const starts = [0];
        if (list) for (let k = rest.indexOf('; '); k >= 0; k = rest.indexOf('; ', k + 1)) starts.push(k + 2);
        for (const s0 of starts) {
            const r = rest.slice(s0);
            if (r.startsWith(v) && (r.length === v.length || r[v.length] === ';')) return 'full';
            // the cap's "…" ends the line, or the field before a label the cap keeps (an arrival card's "; NOT YET SHOWN")
            const k = r.indexOf('…');
            if (k > 0 && k < v.length && (k === r.length - 1 || r[k + 1] === ';') && flat(r.slice(0, k)) && v.startsWith(r.slice(0, k))) best = 'partial';
        }
    }
    return best;
}
const anchorOn = (lines, a) => lines.reduce((b, l) => (b === 'full' ? b : carried(l, `${a.p}: `, a.o, { after: /(?:^|; )$/ }) || b), null);
// the compact attitude row (…; between you: X) and the detail row (open between you: X; Y); never a settled row
const agreementOn = (lines, a) => lines.reduce((b, l) => (b === 'full' ? b : carried(l, 'between you: ', a.text, { list: /^open between you: /.test(l), after: /(?:^open |; )$/ }) || b), null);
const shares = (m, x) => (m.who || []).includes(x) || (m.witnesses || []).includes(x);
const npcsIn = (s) => (s.scene?.present || []).filter((id) => s.entities?.[id]?.kind === 'npc');
const nameOf = (s, id) => s.entities?.[id]?.name || s.entities?.[id]?.known_name || null;
const labelOf = (s, id) => nameOf(s, id) || s.entities?.[id]?.descriptors?.[0] || s.entities?.[id]?.traits?.split(/[,;]/)[0] || id;

/** A short passage of the text around the first place it names `needle` (else its start). */
export function excerpt(text, needle = null, width = 240) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const at = needle ? t.toLowerCase().indexOf(String(needle).toLowerCase()) : -1;
    const from = at < 0 ? 0 : Math.max(0, at - Math.floor(width / 3));
    return `${from > 0 ? '…' : ''}${t.slice(from, from + width)}${from + width < t.length ? '…' : ''}`;
}
const names = (s, id) => [nameOf(s, id)].filter(Boolean);
const mentioned = (prose, s, id) => names(s, id).some((n) => new RegExp(`\\b${n.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(prose || ''));

/**
 * The evaluation of one run's chat. calls: [{role, turn, request}] (chat-completions.jsonl rows); without them the
 * checks of what the narrator was shown say "unknown".
 */
export function npcPulseAnalysis(chat, { calls = [] } = {}) {
    const n = chat.length;
    const states = [];
    for (let i = 0; i <= n; i++) states.push(foldChat(chat, i).state);
    const final = foldChat(chat);
    const userTurn = [];
    let users = 0;
    for (let i = 0; i < n; i++) { if (chat[i]?.is_user) users += 1; userTurn.push(users); }
    const narratorCall = (turn) => calls.filter((c) => c.role === 'narrator' && c.turn === turn).at(-1) || null;
    const e3 = states.some((s) => s.scene?.since); // a build with presence spans (NPC E3, .174 on)

    const people = {}, spans = {}, returns = [], companions = [], arrivals = [], desk = [], refusals = { npc: [], anchor: [], pulse: [], thread: [] };
    const agreements = {}, anchors = [], windows = [], violations = [], review = [];
    const extraction = {};
    let multiNpc = 0, maxNpc = 0, pauses = 0, restInterrupted = 0, lastUser = null;
    const spanCount = {};

    for (let i = 0; i < n; i++) {
        const m = chat[i];
        const r = rec(m);
        if (!r) continue;
        const ev = r.events || [];
        const before = states[i], after = states[i + 1];
        const turn = userTurn[i];
        if (m.is_user) {
            const outcome = ev.findLast((e) => e.t === 'outcome.recorded')?.d?.outcome || null;
            lastUser = { i, turn, outcome };
            const rolled = ev.filter((e) => e.t === 'pulse.rolled');
            if (rolled.length > 1) violations.push({ kind: 'pulse_two_decisions_one_message', msg: i, turn, why: `${rolled.length} PULSE decisions for one player message` });
            for (const e of rolled) {
                const d = e.d;
                if (d.forced) violations.push({ kind: 'pulse_forced_in_natural_run', msg: i, turn, why: 'a forced PULSE draw (rules.pulse.force) in a natural run' });
                windows.push({ msg: i, turn, exposure: d.exposure, frame: d.frame, phase: d.phase, p: d.p, roll: d.roll, open: !!d.open, kind: d.kind ?? null,
                    ...(d.interrupt ? { interrupt: d.interrupt } : {}), ...(d.wander ? { wander: true } : {}), ...(d.forced ? { forced: true } : {}), at: d.at, outcome: null });
            }
            pauses += ev.filter((e) => e.t === 'pulse.pause').length;
            continue;
        }
        if (m.is_system) continue;
        const prose = m.mes || '';
        const status = r.extraction?.status || 'none';
        extraction[status] = (extraction[status] || 0) + 1;
        restInterrupted += (r.corrections || []).filter((c) => /REST INTERRUPTED/.test(String(c))).length;
        const rejected = ev.filter((e) => e.t === 'delta.rejected');
        const raw = r.extraction?.raw || null;

        // people: who is new, who began a presence span (E3: scene.since; older builds: entering the scene)
        for (const e of ev.filter((x) => x.t === 'entity.created' && x.d.entity?.kind === 'npc')) {
            const id = e.d.entity.id;
            const same = Object.values(people).find((p) => p.name && normText(p.name) === normText(e.d.entity.name || ''));
            if (same) review.push({ kind: 'possible_duplicate_person', msg: i, turn, who: [same.id, id], why: `a new person with the name of ${same.id}`, passage: excerpt(prose, e.d.entity.name) });
            people[id] = { id, name: e.d.entity.name || null, label: labelOf(after, id), msg: i, turn };
        }
        const reset = ev.some((e) => e.t === 'scene.moved' && e.d.reset_present);
        const metIds = Object.values(raw?.expected || {}).flatMap((x) => (Array.isArray(x?.met) ? x.met.map((y) => y?.who) : [])).filter(Boolean);
        const metRefused = new Set(rejected.filter((e) => /^met_/.test(e.d.rule || '')).map((e) => e.d.item?.met?.who).filter(Boolean));
        const started = [];
        for (const id of npcsIn(after)) {
            const was = (before.scene?.present || []).includes(id);
            const newSpan = e3 ? after.scene?.since?.[id] != null && after.scene.since[id] !== before.scene?.since?.[id] : !was;
            if (!newSpan) continue;
            const kind = !(spans[id] || []).length && !people[id]?.seenBefore ? 'first' : was && reset ? 'companion' : 'return';
            (spans[id] ||= []).push({ msg: i, turn, kind, at: after.scene?.at || null });
            started.push({ id, kind });
            if (kind === 'return') returns.push({ msg: i, turn, who: id, label: labelOf(after, id), path: metIds.includes(id) && !metRefused.has(id) ? 'met' : 'enter_or_other', passage: excerpt(prose, nameOf(after, id)) });
        }
        if (reset) {
            const along = npcsIn(before).filter((id) => npcsIn(after).includes(id));
            if (along.length) companions.push({ msg: i, turn, who: along, from: before.scene?.at || null, to: after.scene?.at || null });
        }
        const npcCount = npcsIn(after).length;
        if (npcCount >= 2) multiNpc += 1;
        maxNpc = Math.max(maxNpc, npcCount);
        // arrival cards (E2-B): who was carded NOT YET SHOWN for this reply, and who the reply then showed
        const carded = r.narration?.context?.arrivalNpcIds || [];
        if (carded.length) {
            const shown = carded.filter((id) => started.some((x) => x.id === id));
            arrivals.push({ msg: i, turn, carded, shown, offered: lastUser?.outcome?.known_at || null });
            for (const id of carded.filter((x) => !shown.includes(x) && mentioned(prose, after, x))) {
                review.push({ kind: 'arrival_named_not_present', msg: i, turn, who: id, why: `${labelOf(after, id)} was on an arrival card and is named in the story, yet did not enter the scene`, passage: excerpt(prose, nameOf(after, id)) });
            }
        }
        // the Guild desk (E2-A handled_by)
        for (const [k, x] of Object.entries(raw?.expected || {})) {
            const who = x?.handled_by?.who;
            if (!who) continue;
            const refused = rejected.find((e) => e.d.rule === 'desk_handler' && String(e.d.item?.seq) === String(k));
            const knew = ev.some((e) => e.t === 'knowledge.gained' && e.d.who === who && /^f\.pc\.(?:accepted|completed)\./.test(e.d.about || ''));
            desk.push({ msg: i, turn, who, accepted: !refused && knew, ...(refused ? { refused: refused.d.reason } : {}) });
        }
        // agreements (E2-B R7): promise/debt threads, their parties and their course
        for (const e of ev.filter((x) => x.t === 'thread.set' && ['promise', 'debt'].includes(x.d.thread?.kind))) {
            const t = e.d.thread;
            const a = agreements[t.id] ||= { id: t.id, kind: t.kind, text: t.text, opened: { msg: i, turn }, course: [], who: null };
            const pcNew = (t.who || []).includes('pc') && !(a.who || []).includes('pc');
            if (pcNew && !(t.who || []).some((p) => p !== 'pc' && (after.scene?.present || []).includes(p))) {
                violations.push({ kind: 'agreement_pc_without_presence', msg: i, turn, why: `${t.id}: Alaric bound as a party while none of its other parties was present`, passage: excerpt(prose) });
            }
            a.course.push({ msg: i, turn, status: t.status, who: t.who || null, ...(t.resolution ? { resolution: t.resolution } : {}) });
            a.who = t.who || a.who;
            a.status = t.status;
        }
        for (const e of rejected.filter((x) => x.d.item?.type === 'thread' && /ambiguous thread/.test(x.d.reason || ''))) refusals.thread.push({ msg: i, turn, reason: e.d.reason, text: e.d.item.text });
        // anchors (E3 R10)
        for (const e of ev.filter((x) => x.t === 'fact.asserted' && ANCHORS.has(x.d.fact?.p) && after.entities?.[x.d.fact.s]?.kind === 'npc')) {
            const f = e.d.fact;
            const since = after.scene?.since?.[f.s];
            if (e3) {
                const earlier = since != null && (after.memories || []).some((mm) => (mm.turn ?? Infinity) < since && shares(mm, f.s) && shares(mm, 'pc'));
                if (!earlier) violations.push({ kind: 'anchor_without_earlier_encounter', msg: i, turn, why: `${f.s} ${f.p}: "${f.o}" stored without a shared moment before this presence`, passage: excerpt(prose, nameOf(after, f.s)) });
                const key = `${f.s}|${f.p}|${since}`;
                spanCount[key] = (spanCount[key] || 0) + 1;
                if (spanCount[key] > 1) violations.push({ kind: 'anchor_changed_twice_in_presence', msg: i, turn, why: `${f.s} ${f.p} set ${spanCount[key]} times in one presence`, passage: excerpt(prose, nameOf(after, f.s)) });
            }
            const replaced = ev.some((x) => x.t === 'fact.ended' && before.facts?.[x.d.id]?.s === f.s && before.facts?.[x.d.id]?.p === f.p);
            anchors.push({ msg: i, turn, who: f.s, label: labelOf(after, f.s), p: f.p, o: f.o, since: since ?? null, replaced, passage: excerpt(prose, nameOf(after, f.s)), later: null });
        }
        for (const e of rejected) {
            const rule = e.d.rule || '';
            const item = e.d.item || {};
            if (/^anchor_/.test(rule)) refusals.anchor.push({ msg: i, turn, rule, who: item.s, p: item.p, o: item.o, reason: e.d.reason, passage: excerpt(prose, nameOf(after, item.s)) });
            else if (NPC_RULE.test(rule)) refusals.npc.push({ msg: i, turn, rule, who: item.met?.who || item.who || item.ref || null, reason: e.d.reason, passage: excerpt(prose, item.met?.evidence || null) });
            else if (PULSE_RULES.has(rule)) refusals.pulse.push({ msg: i, turn, rule, reason: e.d.reason, passage: excerpt(prose) });
        }
        // PULSE: what this reply did with the turn's window (pulse.outcome, a heuristic of the engine)
        for (const e of ev.filter((x) => x.t === 'pulse.outcome')) {
            const w = windows.filter((x) => x.msg === lastUser?.i).at(-1);
            const o = e.d;
            if (w) w.outcome = { narrated: o.narrated ?? null, persisted: o.persisted || null };
            if (o.open && o.narrated === 'none') review.push({ kind: 'open_window_not_narrated', msg: i, turn, why: `an open ${o.kind} window the reply did not visibly use (engine heuristic)`, passage: excerpt(prose) });
            const p = o.persisted || {};
            if (o.rolled && !o.open && (p.creatures || p.persons || p.fight)) review.push({ kind: 'new_world_content_in_closed_window', msg: i, turn, why: `closed window, yet ${[p.persons && `${p.persons} new person(s)`, p.creatures && `${p.creatures} new creature(s)`, p.fight && 'a fight'].filter(Boolean).join(', ')} (may be his own doing)`, passage: excerpt(prose) });
        }
    }

    // what the narrator was shown later (P2-A): each stored anchor, and each open agreement of Alaric's, on that person's
    // card in the current engine block of every later narrator request, until the first whole delivery. A turn the
    // person was present for without a saved request leaves it unknown, unless a whole delivery was found.
    const story = new Map(); // turn → the current engine block of its (last) narrator request
    for (const c of calls) {
        if (c?.role !== 'narrator') continue;
        const b = engineBlock(c.request);
        if (b != null) story.set(c.turn, b);
    }
    const replyOf = (turn) => { for (let j = n - 1; j >= 0; j--) if (userTurn[j] === turn && !chat[j].is_user && !chat[j].is_system && rec(chat[j])) return j; return null; };
    function delivery({ who, from, to, due, on }) {
        const expected = [];
        for (let j = 0; j < n; j++) {
            const m = chat[j];
            if (userTurn[j] <= from || userTurn[j] > to || m.is_user || m.is_system || !rec(m)) continue;
            if ((states[j].scene?.present || []).some((x) => who.includes(x)) && due(states[j]) && !expected.includes(userTurn[j])) expected.push(userTurn[j]);
        }
        const turns = [...new Set([...expected, ...[...story.keys()].filter((t) => t > from && t <= to)])].sort((x, y) => x - y);
        const d = { status: null, fullAt: null, partialAt: null, checked: 0, missing: 0 };
        for (const t of turns) {
            const b = story.get(t);
            if (b == null) { if (expected.includes(t)) d.missing += 1; continue; }
            d.checked += 1;
            const r = who.reduce((x, id) => (x === 'full' ? x : on(cardLines(b, id)) || x), null);
            if (r === 'full') { d.fullAt = t; break; }
            if (r === 'partial' && d.partialAt == null) d.partialAt = t;
        }
        d.status = d.fullAt != null ? 'full' : d.partialAt != null ? 'partial' : d.missing ? 'unknown' : expected.length ? 'none' : null;
        if (!d.status) return null; // never present again and never on a card: nothing to measure
        const j = replyOf(d.fullAt ?? d.partialAt ?? expected[0]) ?? replyOf(expected[0]);
        // inPrompt (2449990's field): true only for a whole delivery
        return { ...d, inPrompt: d.status === 'unknown' ? 'unknown' : d.status === 'full', msg: j, turn: j == null ? null : userTurn[j] };
    }
    const SHOWN = { full: 'showed it whole', partial: 'showed it only cut by the card cap', none: 'did NOT show it', unknown: 'not checked (requests missing)' };
    for (const a of anchors) {
        const next = anchors.find((x) => x.msg > a.msg && x.who === a.who && x.p === a.p);
        a.later = delivery({ who: [a.who], from: a.turn, to: next ? next.turn : Infinity, due: () => true, on: (lines) => anchorOn(lines, a) });
        if (!a.later || a.later.msg == null) continue;
        const m = chat[a.later.msg];
        a.later.passage = excerpt(m.mes, nameOf(states[a.later.msg], a.who));
        review.push({ kind: 'anchor_use', msg: a.later.msg, turn: a.later.turn, who: a.who, why: `stored ${a.p} "${a.o}" (turn ${a.turn}); narrator card ${SHOWN[a.later.status]}${a.later.status === 'full' ? ` (turn ${a.later.fullAt})` : a.later.status === 'partial' ? ` (turn ${a.later.partialAt})` : ''}: does the story fit it?`, passage: a.later.passage });
    }
    const personal = Object.values(agreements).filter((a) => (a.who || []).includes('pc'));
    for (const a of personal) {
        const closed = a.course.find((c) => c.status !== 'open');
        a.onCard = delivery({ who: a.who.filter((x) => x !== 'pc'), from: a.opened.turn, to: closed ? closed.turn : Infinity, due: (s) => s.threads?.[a.id]?.status === 'open', on: (lines) => agreementOn(lines, a) });
        a.takenUp = a.course.some((c) => c.turn > a.opened.turn);
    }

    for (const e of final.errors || []) violations.push({ kind: 'fold_error', why: String(e?.message || e).slice(0, 200) });

    const count = (xs, f) => xs.filter(f).length;
    const byExposure = {};
    for (const w of windows) {
        const k = `${w.exposure}/${w.frame}`;
        const x = byExposure[k] ||= { rolled: 0, open: 0, kinds: {}, narrated: { likely: 0, none: 0 }, persisted: { persons: 0, creatures: 0, features: 0, objects: 0, places: 0, fights: 0, slots: 0 } };
        x.rolled += 1;
        if (w.open) { x.open += 1; x.kinds[w.kind] = (x.kinds[w.kind] || 0) + 1; }
        if (w.outcome?.narrated) x.narrated[w.outcome.narrated] = (x.narrated[w.outcome.narrated] || 0) + 1;
        const p = w.outcome?.persisted || {};
        for (const k2 of ['persons', 'creatures', 'features', 'objects', 'places', 'slots']) x.persisted[k2] += p[k2] || 0;
        if (p.fight) x.persisted.fights += 1;
    }
    const open = windows.filter((w) => w.open);
    const repeats = open.filter((w, k) => k > 0 && open[k - 1].kind === w.kind && w.turn - open[k - 1].turn <= 3).map((w) => ({ msg: w.msg, turn: w.turn, kind: w.kind }));
    const minutes = (final.state.clock?.minute ?? 0) - (states[0].clock?.minute ?? 0);
    const quests = Object.values(final.state.quests || {});
    const rules = {};
    for (const m of chat) for (const e of (rec(m)?.events || []).filter((x) => x.t === 'delta.rejected')) rules[e.d.rule || '?'] = (rules[e.d.rule || '?'] || 0) + 1;

    const covered = (id, what, value, more = {}) => ({ id, what, count: value, status: value > 0 ? 'observed' : 'not covered', ...more });
    const coverage = [
        covered('npc_first_meetings', 'people met for the first time', Object.keys(people).length),
        covered('npc_returns', 'a known person present again in a later presence (E2-A)', returns.length),
        covered('npc_return_met', 'a return the extractor reported as met and the engine took', count(returns, (x) => x.path === 'met')),
        covered('npc_met_refused', 'a reported presence the engine refused (met_*)', count(refusals.npc, (x) => /^met_/.test(x.rule))),
        covered('arrival_cards', 'turns with an arrival card NOT YET SHOWN (E2-B R6)', arrivals.length),
        covered('desk_handler', 'a Guild desk handler who learned his acceptance or turn-in (E2-A)', count(desk, (x) => x.accepted)),
        covered('multi_npc_scenes', 'replies with two or more people present', multiNpc),
        covered('shared_travel', 'people who travelled along with him', companions.length),
        covered('agreement_personal', 'agreements with Alaric as a party (E2-B R7)', personal.length),
        covered('agreement_taken_up', 'an agreement updated or settled in a later turn', count(personal, (a) => a.takenUp)),
        covered('agreement_settled', 'an agreement of his settled', count(personal, (a) => a.status === 'resolved')),
        covered('agreement_npc_only', 'agreements between other people only', count(Object.values(agreements), (a) => a.who && !a.who.includes('pc'))),
        covered('agreement_unbound', 'promise/debt threads stored without parties', count(Object.values(agreements), (a) => !a.who)),
        covered('agreement_on_card', 'an open agreement shown whole on a later narrator card (partial: only cut by the card cap)', count(personal, (a) => a.onCard?.status === 'full'), { partial: count(personal, (a) => a.onCard?.status === 'partial'), unknown: count(personal, (a) => a.onCard?.status === 'unknown') }),
        covered('anchor_stored', 'a personality anchor stored (E3 R10)', anchors.length),
        covered('anchor_changed', 'an anchor changed in a later presence', count(anchors, (a) => a.replaced)),
        covered('anchor_refused_first_contact', 'a trait refused at a first contact', count(refusals.anchor, (x) => x.rule === 'anchor_first_contact')),
        covered('anchor_refused_mood', 'a mood refused as a trait', count(refusals.anchor, (x) => x.rule === 'anchor_mood')),
        covered('anchor_on_card', 'a stored anchor shown whole on a later narrator card (partial: only cut by the card cap)', count(anchors, (a) => a.later?.status === 'full'), { partial: count(anchors, (a) => a.later?.status === 'partial'), unknown: count(anchors, (a) => a.later?.status === 'unknown') }),
        covered('pulse_travel', 'PULSE draws on the road', count(windows, (w) => w.exposure === 'travel')),
        covered('pulse_pause', 'PULSE draws while resting or waiting', count(windows, (w) => w.exposure === 'pause')),
        covered('pulse_scene', 'PULSE draws in a town or the wild', count(windows, (w) => w.exposure === 'scene' && w.frame !== 'dungeon')),
        covered('pulse_dungeon', 'PULSE draws in a dungeon', count(windows, (w) => w.frame === 'dungeon')),
        covered('pulse_open', 'open PULSE windows', open.length),
        covered('pulse_interrupt', 'a rest cut short by PULSE', count(windows, (w) => w.interrupt)),
        covered('pulse_wanderer', 'a dungeon wanderer bound by PULSE', count(windows, (w) => w.wander)),
        covered('pulse_threat_refused', 'a new threat the engine refused (pulse/road/envelope/dungeon rules)', refusals.pulse.length),
        covered('quest_completed', 'Guild contracts completed', count(quests, (q) => q.status === 'completed')),
    ];

    return {
        version: NPC_PULSE_VERSION, e3Records: e3,
        coverage, violations,
        review,
        npc: { people: Object.values(people).map((p) => ({ ...p, spans: (spans[p.id] || []).length, returns: count(returns, (x) => x.who === p.id), anchors: count(anchors, (a) => a.who === p.id) })),
            returns, companions, arrivals, desk, agreements: Object.values(agreements), anchors, multiNpcReplies: multiNpc, maxNpcPresent: maxNpc, refusals: { npc: refusals.npc, anchor: refusals.anchor, thread: refusals.thread } },
        pulse: { draws: windows.length, open: open.length, byExposure, pauseBlockTurns: pauses, restInterruptedCorrections: restInterrupted, repeats, refusals: refusals.pulse,
            density: { perTenInputs: users ? Math.round((open.length / users) * 100) / 10 : null, perEightHours: minutes > 0 ? Math.round((open.length / minutes) * 480 * 10) / 10 : null, minutes, inputs: users }, windows },
        integration: { extraction, foldErrors: (final.errors || []).length, quests: { active: count(quests, (q) => q.status === 'active'), completed: count(quests, (q) => q.status === 'completed') }, rejectedByRule: rules },
    };
}

const cell = (v) => String(v ?? '–').replace(/\|/g, '/').replace(/\s+/g, ' ');
const shownCell = (d) => (!d ? '–' : d.status === 'full' ? `voll (Zug ${d.fullAt})` : d.status === 'partial' ? `gekürzt (Zug ${d.partialAt})` : d.status === 'unknown' ? '?' : 'nein');
const countCell = (c) => `${c.count}${c.partial ? ` (+${c.partial} nur gekürzt)` : ''}${c.unknown ? ` (${c.unknown} ?)` : ''}`;
/** The Markdown report of an analysis. */
export function npcPulseMarkdown(a, { runId = null } = {}) {
    const L = [`# NPC/PULSE-Auswertung${runId ? ` – ${runId}` : ''}`, ''];
    L.push('> Automatisch aus den gespeicherten Chatrecords, Events und Requests, ohne Modellaufruf. Regelverletzungen nur, wo die Records sie sicher tragen; semantische Zweifelsfälle stehen mit Originalstelle unter „Zum Review“. Nicht erreichte Testziele sind **fehlende Abdeckung**, weder bestanden noch fehlgeschlagen.', '');
    if (!a.e3Records) L.push('> Hinweis: Die Records enthalten keine Anwesenheitsspannen (`scene.since`, ab .174); die E3-Prüfungen der Anker entfallen.', '');
    L.push('## Abdeckung', '', '| Testziel | Bedeutung | Anzahl | Status |', '|---|---|---:|---|', ...a.coverage.map((c) => `| ${c.id} | ${c.what} | ${countCell(c)} | ${c.status === 'observed' ? 'beobachtet' : '**nicht abgedeckt**'} |`), '');
    L.push('## Regelverletzungen (automatisch, belastbar)', '');
    L.push(...(a.violations.length ? a.violations.slice(0, LIST * 2).map((v) => `- **${v.kind}**${v.turn != null ? ` (Zug ${v.turn}, Nachricht ${v.msg})` : ''}: ${cell(v.why)}${v.passage ? ` — „${cell(v.passage)}“` : ''}`) : ['Keine gefunden.']), '');
    const N = a.npc;
    L.push('## NPC', '', `Personen: ${N.people.length} · Wiederbegegnungen: ${N.returns.length} · gemeinsame Reisen: ${N.companions.length} · Antworten mit ≥ 2 Personen: ${N.multiNpcReplies} (höchstens ${N.maxNpcPresent}) · Ankunftskarten: ${N.arrivals.length} · Gildenbearbeiter: ${N.desk.filter((d) => d.accepted).length}/${N.desk.length}`, '');
    if (N.people.length) L.push('| Person | erster Zug | Spannen | Rückkehr | Anker |', '|---|---:|---:|---:|---:|', ...N.people.slice(0, LIST * 2).map((p) => `| ${cell(p.label)} (${p.id}) | ${p.turn} | ${p.spans} | ${p.returns} | ${p.anchors} |`), '');
    if (N.returns.length) L.push('**Wiederbegegnungen**', '', ...N.returns.slice(0, LIST).map((r) => `- Zug ${r.turn}: ${cell(r.label)} — ${r.path === 'met' ? 'per `met` belegt' : 'Eintritt ohne `met`'} — „${cell(r.passage)}“`), '');
    if (N.agreements.length) L.push('**Absprachen**', '', '| Thread | Art | Parteien | eröffnet | Verlauf | später aufgegriffen | auf späterer Karte |', '|---|---|---|---:|---|---|---|',
        ...N.agreements.slice(0, LIST).map((x) => `| ${cell(x.text).slice(0, 90)} | ${x.kind} | ${cell((x.who || ['ohne']).join(', '))} | ${x.opened.turn} | ${x.course.map((c) => `${c.turn}:${c.status}`).join(' → ')} | ${x.takenUp ? 'ja' : x.who?.includes('pc') ? 'nein' : '–'} | ${shownCell(x.onCard)} |`), '');
    if (N.anchors.length) L.push('**Persönlichkeitsanker**', '', '| Zug | Person | Merkmal | Wert | ersetzt | spätere Karte |', '|---:|---|---|---|---|---|',
        ...N.anchors.slice(0, LIST).map((x) => `| ${x.turn} | ${cell(x.label)} | ${x.p} | ${cell(x.o)} | ${x.replaced ? 'ja' : 'nein'} | ${shownCell(x.later)} |`), '');
    const ar = [...N.refusals.anchor, ...N.refusals.npc, ...N.refusals.thread];
    if (ar.length) L.push('**Abgelehnte NPC-Meldungen** (Regel: Anzahl)', '', [...new Set(ar.map((x) => x.rule || 'ambiguous_thread'))].map((k) => `${k}: ${ar.filter((x) => (x.rule || 'ambiguous_thread') === k).length}`).join(' · '), '');
    const P = a.pulse;
    L.push('## PULSE', '', `Entscheidungen: ${P.draws} · offen: ${P.open} · offene je 10 Eingaben: ${P.density.perTenInputs ?? '–'} · je 8 Spielstunden: ${P.density.perEightHours ?? '–'} · Pausen-Folgezüge: ${P.pauseBlockTurns} · Rast-Unterbrechungen (Korrektur): ${P.restInterruptedCorrections} · gleiche Art kurz hintereinander: ${P.repeats.length}`, '');
    if (Object.keys(P.byExposure).length) L.push('| Exposition/Rahmen | Würfe | offen | Arten | erzählt (likely/none) | Weltfolgen |', '|---|---:|---:|---|---|---|',
        ...Object.entries(P.byExposure).map(([k, x]) => `| ${k} | ${x.rolled} | ${x.open} | ${cell(Object.entries(x.kinds).map(([a2, b]) => `${a2} ${b}`).join(', ') || '–')} | ${x.narrated.likely}/${x.narrated.none} | ${cell(Object.entries(x.persisted).filter(([, v]) => v).map(([a2, b]) => `${a2} ${b}`).join(', ') || '–')} |`), '');
    if (P.refusals.length) L.push('**Abgelehnte neue Bedrohungen** (Regel: Anzahl)', '', [...new Set(P.refusals.map((x) => x.rule))].map((k) => `${k}: ${P.refusals.filter((x) => x.rule === k).length}`).join(' · '), '');
    const I = a.integration;
    L.push('## Integration', '', `Extraktion: ${Object.entries(I.extraction).map(([k, v]) => `${k} ${v}`).join(', ') || '–'} · Foldfehler: ${I.foldErrors} · Verträge aktiv/abgeschlossen: ${I.quests.active}/${I.quests.completed}`, '',
        `Abgelehnte Deltas je Regel: ${Object.entries(I.rejectedByRule).sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k, v]) => `${k} ${v}`).join(', ') || '–'}`, '');
    L.push('## Zum Review (semantische Zweifelsfälle mit Originalstelle)', '');
    const kinds = [...new Set(a.review.map((x) => x.kind))];
    if (!kinds.length) L.push('Keine.', '');
    for (const k of kinds) {
        const xs = a.review.filter((x) => x.kind === k);
        L.push(`**${k}** (${xs.length})`, '', ...xs.slice(0, LIST).map((x) => `- Zug ${x.turn ?? '–'} (Nachricht ${x.msg ?? '–'}): ${cell(x.why)} — „${cell(x.passage)}“`), ...(xs.length > LIST ? [`- … ${xs.length - LIST} weitere in npc-pulse.json`] : []), '');
    }
    return L.join('\n');
}

/** The short section the run's report.md gets: the coverage and the counts, the details in npc-pulse.md. */
export function npcPulseSection(a) {
    const missing = a.coverage.filter((c) => c.status !== 'observed').map((c) => c.id);
    return ['', '## NPC/PULSE-Auswertung', '',
        `Abgedeckt: ${a.coverage.length - missing.length}/${a.coverage.length} Testziele; **nicht abgedeckt:** ${missing.join(', ') || '–'}.`,
        `Regelverletzungen (automatisch): ${a.violations.length}${a.violations.length ? ` (${[...new Set(a.violations.map((v) => v.kind))].join(', ')})` : ''}. Zum Review: ${a.review.length} Stellen.`,
        'Details, Tabellen und Originalstellen: [npc-pulse.md](npc-pulse.md), vollständig in npc-pulse.json.', ''].join('\n');
}

export const NPC_PULSE_FILES = ['npc-pulse.json', 'npc-pulse.md'];
/**
 * The evaluation step of a run whose guide asks for it (P2-B, review of 2449990 §4): the files to write and the status
 * run.json keeps. A failure writes no npc-pulse file (no file may pretend a result) and is recorded with its error; the
 * run's original exports are not touched here.
 */
export function npcPulseExports({ messages, calls = [], runId = null, analyse = npcPulseAnalysis }) {
    try {
        const analysis = analyse(messages, { calls });
        const files = [[NPC_PULSE_FILES[0], JSON.stringify(analysis, null, 1), 'die NPC-/PULSE-Auswertung (Abdeckung, Beobachtungen, Regelverletzungen, Review-Stellen)'],
            [NPC_PULSE_FILES[1], npcPulseMarkdown(analysis, { runId }), 'die NPC-/PULSE-Auswertung als Bericht']];
        return { ok: true, analysis, files, status: { id: 'npc_pulse', ok: true, files: [...NPC_PULSE_FILES] } };
    } catch (e) {
        return npcPulseFailed(e);
    }
}
export const npcPulseFailed = (e) => ({ ok: false, analysis: null, files: [], status: { id: 'npc_pulse', ok: false, error: String(e?.message || e).slice(0, 300) } });

/** The run's report.md with its evaluation: the short section, or, when it failed, a notice right under the title. */
export function withAnalysisReport(report, x) {
    if (!x) return report;
    if (x.ok) return report + npcPulseSection(x.analysis);
    const [title, ...rest] = String(report).split('\n');
    const notice = `> **NPC/PULSE-AUSWERTUNG FEHLGESCHLAGEN: ${cell(x.status?.error || 'unbekannter Fehler')}** — npc-pulse.json/.md fehlen; die Originalexporte (chat.jsonl, avereth-events.json, chat-completions.jsonl) sind vollständig. Nachträglich: \`npm run live:st:npc-eval -- <Laufordner>\`.`;
    return [title, '', notice, ...rest].join('\n');
}

/** The rows of chat-completions.jsonl as the analysis reads them. */
export function callsOf(text) {
    return String(text || '').split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { const j = JSON.parse(l); return { role: j.role, turn: j.turn, request: j.request }; } catch { return null; } }).filter(Boolean);
}

/** The analysis of a run folder (chat.jsonl, chat-completions.jsonl), written next to them. */
export function analyseRunFolder(dir) {
    const chat = readChatJsonl(fs.readFileSync(path.join(dir, 'chat.jsonl'), 'utf8')).messages;
    const callsFile = path.join(dir, 'chat-completions.jsonl');
    const calls = fs.existsSync(callsFile) ? callsOf(fs.readFileSync(callsFile, 'utf8')) : [];
    const a = npcPulseAnalysis(chat, { calls });
    fs.writeFileSync(path.join(dir, 'npc-pulse.json'), JSON.stringify(a, null, 1));
    fs.writeFileSync(path.join(dir, 'npc-pulse.md'), npcPulseMarkdown(a, { runId: path.basename(dir) }));
    return a;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const dir = process.argv[2];
    if (!dir || !fs.existsSync(path.join(dir, 'chat.jsonl'))) { console.error('usage: node tools/st_live/live/npc_pulse.mjs <run folder with chat.jsonl>'); process.exit(1); }
    const a = analyseRunFolder(dir);
    console.log(`${path.join(dir, 'npc-pulse.md')}: ${a.coverage.filter((c) => c.status === 'observed').length}/${a.coverage.length} goals observed, ${a.violations.length} violations, ${a.review.length} review passages`);
}
