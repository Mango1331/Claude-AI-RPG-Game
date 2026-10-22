// The evaluation of a run (docs/LIVE_RUNNER.md §7), from the chat with the engine's records: the full fold, the events,
// the telemetry. It decides which of the guide's milestones were reached and when, how every fight began (who of a
// group joined it), what became of the quests, and what went wrong. It is for the test and its report only: the
// player never sees any of it (players.mjs gets driver.mjs view()). The runner uses it between turns only to end a run
// (the last milestone reached, a defeat, a milestone that takes far too long).
import { foldChat, rec } from '../../../src/host.js';
import { floorAt } from '../../../src/v4/living.js';
import { hallOf, placeName } from '../../../src/v4/domain.js';
import { trueDungeonOf } from '../../../src/v4/dungeon.js';
import { spendsStatPoints } from '../../../src/commands.js';

const STATS = { rules: { stats: ['STR', 'VIT', 'AGI', 'INT', 'PER', 'WIL'] } };
const KILLS = new Set(['ATTACK', 'DEFEAT']);
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** The counts a contract text says (digits and number words), "level 1" and the like left out. */
function countsIn(text) {
    const t = String(text || '').toLowerCase().replace(/\blevels?\s+\d+\b/g, ' ');
    const out = new Set();
    for (const m of t.matchAll(/\b(\d+)\b/g)) out.add(Number(m[1]));
    for (const [i, w] of NUMBER_WORDS.entries()) if (new RegExp(`\\b${w}\\b`).test(t)) out.add(i);
    return [...out];
}

export const CHECKS = {
    creation_complete: 'the character is created (creation.completed)',
    guild_registered: 'registered with the Guild (guild.registered)',
    board_shown: 'a Guild board was shown (board.shown)',
    dungeon_quest_active: 'a contract with a Dungeon became his (quest.status → active, quest.dungeon set)',
    inside_dungeon: 'inside a true Dungeon past its gate (level ≥ 1)',
    fight_started: 'a fight began (encounter.started)',
    fight_won: 'a fight ended with foes defeated and him alive (encounter.ended)',
    group_fight: 'a fight with two or more foes at once',
    guardian_defeated: 'a level guardian or the boss defeated (entity.status dead, slot role guard/boss)',
    floor_cleared: 'a Dungeon level cleared (dungeon.cleared)',
    quest_ready: 'a contract reached its end state (quest.ready)',
    returned_to_guild: 'back in a Guild hall after the Dungeon',
    quest_completed: 'a contract turned in (quest.status → completed)',
    // Patch 8.4.1: the two cases of Patch 8.4 a run has to reach to say something about it
    open_group_attack: 'his open attack (not hidden) on one of a group unaware of him: the whole group in the fight from its start',
    numeric_cull_active: 'a cull contract that names its number of foes became his (a DEFEAT/ATTACK objective with a count)',
    // Patch 8.4.2: a full Living Dungeon expedition, each from what the engine booked for the target Dungeon (the one of
    // his Dungeon contract, else the first he went into) and its level (the contract's, else 1); never the story's words
    guild_registered_fee: 'registered with the Guild, its fee booked once and in full (no other registration payment)',
    dungeon_gate: 'on level 1 or deeper of the target Dungeon, its gate fee booked at most once and as the gate names it',
    dungeon_population: 'the engine\'s population of the target level met: an encounter of the level booked with its creatures (dungeon.slot)',
    dungeon_group_fight: 'a fight on the target level with two or more members of one engine encounter, all in it from its start',
    dungeon_open_group_attack: 'his open attack (not hidden) on an engine group of the target level, two or more unaware of him: all in the fight from its start, one opening at most, each acts on its own turn (or dies first)',
    dungeon_guardian: 'the target level\'s guardian (its guard or boss) dead by the engine\'s status',
    dungeon_floor_cleared: 'the target level cleared by him (dungeon.cleared, his credit)',
    dungeon_quest_ready: 'the Dungeon contract reached its end state (quest.ready)',
    dungeon_quest_completed: 'the Dungeon contract turned in at a Guild hall, its payout booked',
};
// what a payment at a Dungeon's gate is for: its entry (the gate's own offer is "Entry to <Dungeon>")
const ENTRY_PAID = /\b(?:entry|enter(?:ing)?|entrance|admission|toll|fee|pass(?:age)?)\b/i;

/**
 * Patch 8.4.1 (live 22.10.2026 05:43: two narrator replies without story text were played on as turns): what came back
 * for the player message at u. story: a narrator reply with text; narrator_empty: a narrator reply without it; system:
 * a command's System answer; engine: the engine's own answer instead of the narrator's (creation, a question back, a
 * refusal); missing: nothing.
 */
export function turnOutcome(chat, u) {
    const user = chat[u];
    const end = chat.findIndex((m, i) => i > u && m.is_user);
    const after = chat.slice(u + 1, end < 0 ? chat.length : end);
    const reply = after.find((m) => !m.is_user && !m.is_system);
    const panel = after.find((m) => m.is_system);
    const command = /^\s*#\s*[a-z]+/i.test(String(user?.mes || ''));
    if (reply) {
        const r = rec(reply);
        const empty = !String(reply.mes || '').trim() || !!r?.narration?.empty;
        return { kind: empty ? 'narrator_empty' : 'story', at: chat.indexOf(reply) };
    }
    if (panel) return { kind: command ? 'system' : 'engine', at: chat.indexOf(panel), reason: rec(user)?.ir?.reason || null };
    return { kind: 'missing', at: null };
}
const PANEL_MARKS = { clarify: /\bCLARIFY\b/, not_taken: /\bNOT TAKEN\b/, refused: /\bREFUSED\b/, blocked: /\bBLOCKED\b/, failed: /\bFAILED\b/, not_recorded: /\bNOT RECORDED\b/ };
const FOLD_ON = new Set(['scene.moved', 'quest.status', 'entity.status', 'entity.created', 'dungeon.slot']);

/** The record's LLM calls (Patch 8.2 telemetry): plan/interp, board, extraction. */
function recordCalls(r) {
    return [...(r?.plan?.llm || []), ...(r?.interp?.llm || []), ...(r?.board?.llm || []), ...(r?.extraction?.llm || [])];
}

/**
 * chat: SillyTavern's chat array (or a fixture's messages). guide: loaded guide (its milestones' checks), optional.
 * Returns {milestones, reached, encounters, quests, defeat, issues, counts, turns, perf}.
 */
export function evaluate(chat, { guide = null } = {}) {
    const reached = {};
    const turnAt = [];
    let turn = 0;
    for (let i = 0; i < chat.length; i++) { if (chat[i].is_user) turn += 1; turnAt[i] = turn; }
    const hit = (id, i, extra = {}) => { if (!reached[id]) reached[id] = { at: i, turn: turnAt[i], ...extra }; };
    const quests = {};
    const encounters = [];
    const issues = [];
    const counts = { rejected: {}, panels: Object.fromEntries(Object.keys(PANEL_MARKS).map((k) => [k, 0])), events: 0 };
    let defeat = null;
    let inside = false;
    const issue = (i, kind, text) => issues.push({ at: i, turn: turnAt[i], kind, text });
    // Patch 8.4.2: what the engine booked of each Dungeon he met, and of his registration
    const D = {};
    const dun = (root) => (D[root] ||= { root, entered: null, gateOffer: null, gatePaid: [], sets: [], fights: [], unawareSeen: null, candidates: [], open: null, guardians: [], clears: [] });
    const reg = { fee: null, paid: [], at: null };
    let dungeonListed = false;
    let boardSeen = false;
    // Patch 9A: the rules the campaign plays by (campaign.started ruleset; none: 1, legacy) and the character it made
    const character = { ruleset: null, class: null, skills: [] };

    for (let i = 0; i < chat.length; i++) {
        const m = chat[i];
        const r = rec(m);
        const ev = r?.events || [];
        counts.events += ev.length;
        // what the page showed: System panels (own messages, or the block above a reply)
        const shown = `${m.is_system ? m.mes || '' : ''}\n${m.extra?.display_text || ''}`;
        for (const [k, re] of Object.entries(PANEL_MARKS)) if (re.test(shown)) counts.panels[k] += 1;
        // the record's telemetry
        if (!m.is_user && !m.is_system && r) {
            if (r.narration?.empty) issue(i, 'empty_reply', 'the narrator\'s reply was empty (no extraction; the player saw the notice)');
            if (r.extraction?.status === 'failed') issue(i, 'extraction_failed', `the extractor failed${r.extraction.error ? `: ${r.extraction.error}` : ''}`);
            if (r.extraction?.status === 'late') issue(i, 'extraction_late', 'the extraction came late');
            if (r.extraction?.repaired) issue(i, 'extraction_repaired', 'the extractor\'s first answer needed a repair');
        }
        // Patch 8.4.1: Stat Points spent in words (only #assign spends them): for review, did the story tell them as done?
        if (m.is_user && !/^\s*#/.test(String(m.mes || '')) && spendsStatPoints(m.mes, STATS)) {
            const end = chat.findIndex((x, j) => j > i && x.is_user);
            const assigned = chat.slice(i, end < 0 ? chat.length : end).some((x) => (rec(x)?.events || []).some((e) => e.t === 'stat.assigned'));
            if (!assigned) issue(i, 'stat_words', `the player spent Stat Points in words, not with #assign; nothing was assigned (for review: did the story tell them as done?)`);
        }
        if (m.is_user && r) {
            if (r.plan?.failed || r.interp?.failed) issue(i, 'planner_failed', `the planner failed${r.plan?.error ? `: ${r.plan.error}` : ''}`);
            if (r.plan?.repaired || r.interp?.repaired) issue(i, 'planner_repaired', 'the planner\'s first answer needed a repair');
            if (r.board?.failed) issue(i, 'board_failed', 'the board generator failed');
        }
        for (const c of recordCalls(r)) if (c.finish && c.finish !== 'stop') issue(i, 'finish', `${c.purpose} ended with finish_reason "${c.finish}"`);
        if (!ev.length) continue;

        const before = ev.some((e) => e.t === 'encounter.started' || e.t === 'entity.status') ? foldChat(chat, i).state : null;
        const after = ev.some((e) => FOLD_ON.has(e.t)) ? foldChat(chat, i + 1).state : null;
        let atState = null;
        const stateAfter = () => after || (atState ||= foldChat(chat, i + 1).state);
        for (const e of ev) {
            const d = e.d || {};
            switch (e.t) {
                case 'campaign.started': character.ruleset = d.ruleset || 1; break;
                case 'creation.class_selected': character.class = d.class; break;
                case 'creation.completed': character.skills = d.skills; hit('creation_complete', i, { skills: d.skills, class: character.class }); break;
                case 'guild.registered': hit('guild_registered', i, { rank: d.rank, branch: d.branch }); if (reg.at == null) reg.at = i; break;
                case 'offer.created':
                    if (d.offer?.id === 'offer.registration') reg.fee = d.offer.lines?.[0]?.price_cp ?? reg.fee;
                    if (d.offer?.gate) dun(d.offer.gate).gateOffer = { at: i, cp: d.offer.lines?.[0]?.price_cp ?? 0 };
                    break;
                case 'coin.changed': {
                    if (d.id !== 'pc' || !(d.delta < 0)) break;
                    if (/regist/i.test(d.why || '')) { reg.paid.push({ at: i, cp: -d.delta, why: d.why }); break; }
                    if (!ENTRY_PAID.test(d.why || '')) break;
                    const st = stateAfter();
                    const root = st.scene?.at ? trueDungeonOf(st, st.scene.at) : null;
                    if (root && st.dungeons?.[root]) dun(root).gatePaid.push({ at: i, cp: -d.delta, why: d.why });
                    break;
                }
                case 'dungeon.slot': {
                    const ids = d.set?.entities || [];
                    if (!ids.length) break;
                    const alive = ids.filter((id) => after?.entities?.[id] && after.entities[id].status !== 'dead');
                    dun(d.id).sets.push({ at: i, turn: turnAt[i], floor: d.floor, slot: d.slot, n: ids.length, unaware: alive.filter((id) => after?.scene?.awareness?.[id] === 'unaware').length });
                    break;
                }
                case 'board.shown': hit('board_shown', i, { listings: d.listings?.length || 0 }); boardSeen = true; break;
                case 'quest.created': {
                    const q = d.quest || {};
                    if (q.dungeon) dungeonListed = true;
                    quests[q.id] = { id: q.id, title: q.title, kind: q.kind, dungeon: q.dungeon || null, floor: q.floor ?? null, task: q.task || null, end_state: q.desired_end_state || null, created: i, statuses: [] };
                    break;
                }
                case 'quest.status': {
                    const q = (quests[d.id] ||= { id: d.id, statuses: [] });
                    q.statuses.push({ to: d.to, at: i, turn: turnAt[i] });
                    const sq = after?.quests?.[d.id];
                    if (sq) Object.assign(q, { title: sq.title, dungeon: sq.dungeon || null, floor: sq.floor ?? null, task: sq.task, end_state: sq.desired_end_state });
                    if (d.to === 'active' && (d.taker || 'pc') === 'pc' && (sq?.dungeon || q.dungeon)) { hit('dungeon_quest_active', i, { quest: d.id, title: q.title }); q.mine = q.mine ?? i; }
                    if (d.to === 'completed') {
                        q.payout = ev.filter((x) => x.t === 'coin.changed' && x.d?.delta > 0 && /payout/i.test(x.d.why || '')).reduce((a, x) => a + x.d.delta, 0);
                        q.payout_cp = after?.quests?.[d.id]?.payout_cp ?? null;
                        q.atHall = !!(after?.scene?.at && hallOf(after, after.scene.at));
                    }
                    // Patch 8.4.1: a cull that names its number, and whether its texts say that number
                    const kill = (sq?.objectives || []).find((o) => KILLS.has(o.verb) && Number(o.qty) > 0);
                    if (d.to === 'active' && (d.taker || 'pc') === 'pc' && kill) {
                        hit('numeric_cull_active', i, { quest: d.id, title: q.title, count: Number(kill.qty), dungeon: sq.dungeon || null });
                        const said = countsIn(`${sq.title} ${sq.task || ''} ${sq.desired_end_state || ''}`);
                        if (said.some((n) => n !== Number(kill.qty))) issue(i, 'cull_count', `${q.title}: its objective counts ${kill.qty}, its texts say ${said.join(', ')} (for review)`);
                    }
                    if (d.to === 'completed') hit('quest_completed', i, { quest: d.id, title: q.title });
                    break;
                }
                case 'quest.ready': hit('quest_ready', i, { quest: d.id }); (quests[d.id] ||= { id: d.id, statuses: [] }).ready = i; break;
                case 'dungeon.cleared': hit('floor_cleared', i, { dungeon: d.dungeon || d.id || null, floor: d.floor ?? null }); dun(d.id).clears.push({ at: i, floor: d.floor, credit: d.credit }); break;
                case 'scene.moved': {
                    const at = after?.scene?.at;
                    if (!at) break;
                    const floor = floorAt(after, at);
                    if (floor >= 1) {
                        inside = true;
                        hit('inside_dungeon', i, { place: at, floor });
                        const root = trueDungeonOf(after, at);
                        if (root) dun(root).entered ||= { at: i, turn: turnAt[i], floor };
                    }
                    if (inside && hallOf(after, at)) hit('returned_to_guild', i, { place: at });
                    break;
                }
                case 'encounter.started': {
                    const enc = d.encounter || {};
                    const cs = Object.values(enc.combatants || {});
                    const foes = cs.filter((c) => c.side === 'hostile').map((c) => c.id);
                    const groups = [...new Set(foes.map((id) => before?.entities?.[id]?.group).filter(Boolean))];
                    // members of a fought group who were with him, alive, and not in the fight when it began
                    const out = (before?.scene?.present || []).filter((id) => id !== 'pc' && !enc.combatants?.[id] && groups.includes(before.entities[id]?.group) && before.entities[id]?.status !== 'dead');
                    const concealed = (before?.scene?.concealed || []).includes('pc');
                    const x = { id: enc.id, at: i, turn: turnAt[i], foes, groups, stayedOut: out, concealed, awareness: Object.fromEntries(out.map((id) => [id, before.scene.awareness?.[id] || null])) };
                    encounters.push(x);
                    hit('fight_started', i);
                    if (foes.length >= 2) hit('group_fight', i, { foes: foes.length });
                    // Patch 8.4.1: his own message opened it, on a group of whom two or more had not noticed him, while
                    // he was not hidden, and nobody of the group stayed out
                    const unaware = foes.filter((id) => before?.scene?.awareness?.[id] === 'unaware');
                    if (m.is_user && !concealed && unaware.length >= 2 && groups.length === 1 && !out.length) hit('open_group_attack', i, { foes: foes.length, unaware: unaware.length });
                    // Patch 8.4.2: a fight of the engine's own encounter in a Dungeon (every foe one of its booked creatures,
                    // booked before or by the reply that starts the fight)
                    const slotOf = (id) => (before?.entities?.[id] || stateAfter().entities?.[id])?.slot || null;
                    const root = foes.length ? slotOf(foes[0])?.dungeon || null : null;
                    if (root && foes.every((id) => slotOf(id)?.dungeon === root)) {
                        const xd = dun(root);
                        const floor = slotOf(foes[0]).floor;
                        if (unaware.length >= 2 && groups.length === 1) xd.unawareSeen ||= { at: i, floor };
                        const fought = [...new Set(foes.map((id) => (before?.entities?.[id] || stateAfter().entities?.[id])?.group).filter(Boolean))];
                        if (foes.length >= 2 && fought.length === 1 && !out.length) xd.fights.push({ at: i, turn: turnAt[i], floor, foes: foes.length, enc: enc.id });
                        if (m.is_user && !concealed && unaware.length >= 2 && groups.length === 1 && !out.length) {
                            const openings = ev.filter((y) => y.t === 'outcome.recorded').flatMap((y) => y.d?.outcome?.records || []).filter((r) => r.opening).length;
                            xd.candidates.push({ at: i, turn: turnAt[i], floor, enc: enc.id, members: foes, unaware: unaware.length, openings, acted: new Set(), dead: new Set(), ended: null });
                        }
                    }
                    if (out.length && !concealed) issue(i, 'group_stayed_out', `fight ${enc.id}: ${out.length} member(s) of the fought group stayed out though he was not hidden (${out.join(', ')})`);
                    break;
                }
                case 'encounter.ended': {
                    for (const x of Object.values(D)) for (const c of x.candidates) if (c.enc === d.id) c.ended = i;
                    const sm = d.summary || {};
                    const x = encounters.findLast((y) => y.id === d.id);
                    if (x) Object.assign(x, { ended: i, defeated: sm.defeated || [], escaped: sm.escaped || [], pcDead: !!sm.pc_dead, pcEscaped: !!sm.pc_escaped, xp: sm.xp_awarded ?? null });
                    if (sm.pc_dead) defeat = defeat || { at: i, turn: turnAt[i], why: 'he died in the fight' };
                    else if (!sm.pc_escaped && (sm.defeated || []).length) hit('fight_won', i, { encounter: d.id });
                    break;
                }
                case 'entity.status': {
                    if (d.id === 'pc' && d.status === 'dead') defeat = defeat || { at: i, turn: turnAt[i], why: 'he died' };
                    const role = (before || after)?.entities?.[d.id]?.slot?.role;
                    if (d.status === 'dead' && (role === 'guard' || role === 'boss')) hit('guardian_defeated', i, { entityId: d.id, role });
                    const slot = (before || after)?.entities?.[d.id]?.slot;
                    if (d.status === 'dead' && slot?.dungeon && (role === 'guard' || role === 'boss')) dun(slot.dungeon).guardians.push({ at: i, turn: turnAt[i], floor: slot.floor, id: d.id, role });
                    if (d.status === 'dead') for (const x of Object.values(D)) for (const c of x.candidates) if (!c.ended && c.members.includes(d.id) && !c.acted.has(d.id)) c.dead.add(d.id);
                    break;
                }
                case 'delta.rejected':
                    counts.rejected[d.rule || '?'] = (counts.rejected[d.rule || '?'] || 0) + 1;
                    if (d.rule === 'dungeon_foe') issue(i, 'dungeon_foe_refused', `the narrator brought a foe the Dungeon's engine did not (${d.item?.species || d.item?.ref || '?'}): refused, no fight (Patch 8.4.1 guard)`);
                    break;
                case 'entity.created': {
                    // a creature inside a Living Dungeon that is none of its encounters and no harmless one: for review
                    const en = d.entity || {};
                    const root = after?.scene?.at ? trueDungeonOf(after, after.scene.at) : null;
                    if (en.kind === 'creature' && root && after.dungeons?.[root] && after.scene.at !== root && !after.entities?.[en.id]?.slot && en.threat !== false) {
                        issue(i, 'unslotted_dungeon_creature', `${en.species || en.id} came into ${after.places[root]?.name || root} without an encounter of the engine (for review)`);
                    }
                    break;
                }
                default: break;
            }
        }
        // Patch 8.4.2: who of an open attack's group acted on his own turn (the records of this message's resolution)
        const actors = ev.filter((e) => e.t === 'outcome.recorded').flatMap((e) => e.d?.outcome?.records || []).map((r) => r.actor);
        for (const x of Object.values(D)) {
            for (const c of x.candidates) {
                if (c.done || (c.ended != null && c.ended < i)) continue;
                for (const a of actors) if (c.members.includes(a)) c.acted.add(a);
                const all = c.members.every((id) => c.acted.has(id) || c.dead.has(id)) && c.acted.size >= 1;
                if (all && c.openings <= 1) { c.done = true; x.open ||= { at: c.at, turn: c.turn, floor: c.floor, foes: c.members.length, unaware: c.unaware, acted: c.acted.size }; } else if (c.ended === i) {
                    c.done = true;
                    issue(c.at, 'group_turns', `fight ${c.enc}: ${c.openings > 1 ? `${c.openings} openings (an Ambush of its own for more than the target)` : `${c.members.filter((id) => !c.acted.has(id) && !c.dead.has(id)).join(', ')} of the group never acted on a turn of its own`}`);
                }
            }
        }
    }

    // Patch 8.4.2: the Dungeon expedition. The target Dungeon is the one of his Dungeon contract (else the first he went
    // into), the target level the contract's (else 1); only what the engine booked there counts
    const mine = Object.values(quests).filter((q) => q.mine != null && q.dungeon).sort((a, b) => a.mine - b.mine)[0] || null;
    const root = mine?.dungeon || Object.values(D).filter((x) => x.entered).sort((a, b) => a.entered.at - b.entered.at)[0]?.root || null;
    const level = mine?.floor ?? 1;
    const x = root ? D[root] || dun(root) : null;
    const unavailable = {};
    if (reg.at != null) {
        const fee = reg.fee ?? 20;
        const paid = reg.paid.reduce((a, p) => a + p.cp, 0);
        if (paid === fee) hit('guild_registered_fee', reg.at, { fee, paid, payments: reg.paid.length });
        else issue(reg.at, 'registration_fee', `registered for ${paid} cp in ${reg.paid.length} payment(s) (${reg.paid.map((p) => `${p.cp} cp: ${p.why}`).join('; ')}); the fee is ${fee} cp`);
    }
    if (x?.entered) {
        const before = x.gatePaid.filter((p) => p.at <= x.entered.at);
        const fee = x.gateOffer && x.gateOffer.at <= x.entered.at ? x.gateOffer.cp : null;
        if (before.length <= 1 && (!before.length || fee == null || before[0].cp === fee)) hit('dungeon_gate', x.entered.at, { dungeon: root, floor: x.entered.floor, fee: fee ?? 0, paid: before.reduce((a, p) => a + p.cp, 0) });
        else issue(x.entered.at, 'gate_fee', `the way into ${root}: ${before.length} entry payment(s) (${before.map((p) => `${p.cp} cp: ${p.why}`).join('; ')}) for a gate fee of ${fee ?? 0} cp`);
    }
    const onLevel = (list) => (list || []).find((y) => y.floor === level);
    if (x) {
        const set = onLevel(x.sets);
        if (set) hit('dungeon_population', set.at, { dungeon: root, floor: level, slot: set.slot, creatures: set.n });
        const fight = onLevel(x.fights);
        if (fight) hit('dungeon_group_fight', fight.at, { dungeon: root, floor: level, foes: fight.foes, encounter: fight.enc });
        if (x.open?.floor === level) hit('dungeon_open_group_attack', x.open.at, { dungeon: root, floor: level, foes: x.open.foes, unaware: x.open.unaware, acted: x.open.acted });
        const guard = onLevel(x.guardians);
        if (guard) hit('dungeon_guardian', guard.at, { dungeon: root, floor: level, entityId: guard.id, role: guard.role });
        const clear = x.clears.find((y) => y.floor === level && y.credit === 'pc');
        if (clear) hit('dungeon_floor_cleared', clear.at, { dungeon: root, floor: level });
        else if (x.clears.some((y) => y.floor === level)) issue(x.clears.find((y) => y.floor === level).at, 'floor_cleared_by_others', `level ${level} of ${root} was cleared, not by him (credit: others)`);
        if (x.entered) {
            const met = x.sets.filter((y) => y.floor === level);
            if (!met.some((y) => y.n >= 2) && !fight) unavailable.dungeon_group_fight = `no engine encounter of two or more was met on level ${level} of ${root}`;
            // Patch 8.4.3: what the engine booked, no more: aware, unaware and no awareness booked are not the same
            if (!met.some((y) => y.unaware >= 2) && x.unawareSeen?.floor !== level) unavailable.dungeon_open_group_attack = `no group of foes with at least two members booked as unaware was met on level ${level} of ${root}`;
        }
    }
    if (mine?.ready != null) hit('dungeon_quest_ready', mine.ready, { quest: mine.id, title: mine.title });
    const done = mine?.statuses.find((y) => y.to === 'completed');
    if (done && mine.payout > 0 && mine.atHall && (mine.payout_cp == null || mine.payout === mine.payout_cp)) hit('dungeon_quest_completed', done.at, { quest: mine.id, title: mine.title, payout: mine.payout });
    else if (done) issue(done.at, 'turn_in', `${mine.title}: turned in ${mine.atHall ? 'at a Guild hall' : 'outside a Guild hall'}, payout ${mine.payout ?? 0} cp booked${mine.payout_cp != null ? ` for a contract of ${mine.payout_cp} cp` : ''}`);
    if (boardSeen && !dungeonListed) for (const id of ['dungeon_quest_active', 'dungeon_quest_ready', 'dungeon_quest_completed']) unavailable[id] = 'the board he read offered no Dungeon contract';

    // the turns: the player's message, what came back, where he was and how he stood at the end of it
    const turns = [];
    const users = chat.map((m, i) => (m.is_user ? i : -1)).filter((i) => i >= 0);
    for (const [k, u] of users.entries()) {
        const end = users[k + 1] ?? chat.length;
        const r = rec(chat[u]);
        const replies = chat.slice(u + 1, end);
        const reply = replies.find((m) => !m.is_user && !m.is_system);
        const x = reply ? rec(reply) : null;
        const s = foldChat(chat, end).state;
        const pc = s.entities?.pc;
        turns.push({
            turn: k + 1, at: u, input: chat[u].mes, route: r?.route || null, system: replies.some((m) => m.is_system),
            place: s.scene?.at || null, placeName: s.scene?.at ? placeName(s, s.scene.at) : null, hp: pc?.current?.hp ?? pc?.sheet?.hp ?? null, mp: pc?.current?.mp ?? pc?.sheet?.mp ?? null, level: pc?.sheet?.level ?? null, encounter: !!s.encounter,
            events: [...(r?.events || []), ...replies.flatMap((m) => rec(m)?.events || [])].map((e) => e.t),
            perf: { wait: r?.perf?.wait_ms ?? null, engine: r?.perf?.engine_ms ?? null, plan: (r?.plan || r?.interp)?.ms ?? null, board: r?.board?.ms ?? null, narrator: x?.narration?.ms ?? null, extract: x?.extraction?.ms ?? null },
            calls: [...recordCalls(r), ...recordCalls(x)],
        });
    }
    const list = (guide?.milestones || Object.keys(CHECKS).map((id) => ({ id, check: id, required: false }))).map((ms) => {
        const check = ms.check || ms.id;
        if (reached[check]) return { ...reached[check], id: ms.id, check, required: ms.required !== false, goal: ms.goal || CHECKS[check], reached: true };
        return { id: ms.id, check, required: ms.required !== false, goal: ms.goal || CHECKS[check], reached: false, ...(unavailable[check] ? { unavailable: unavailable[check] } : {}) };
    });
    const dungeon = root ? { root, name: placeName(foldChat(chat, chat.length).state, root), floor: level, quest: mine?.id || null } : null;
    return { milestones: list, reached, encounters, quests: Object.values(quests), defeat, issues, counts, turns, dungeon, character };
}

/** The guide's next required milestone not reached yet and not out of reach (the run's progress), or null. */
export function nextMilestone(ev) { return ev.milestones.find((m) => m.required && !m.reached && !m.unavailable) || null; }
/** Are all of the guide's required milestones reached (the run is done)? */
export function finished(ev) { const req = ev.milestones.filter((m) => m.required); return req.length > 0 && req.every((m) => m.reached); }
/**
 * Patch 8.4.2: is the rest out of this run's reach? Its last required milestone is reached and every required one not
 * reached is out of reach (no unaware group met, no Dungeon contract on the board): the run ends incomplete, no turns
 * are played on for nothing.
 */
export function settled(ev) {
    const req = ev.milestones.filter((m) => m.required);
    return req.length > 0 && !!req.at(-1).reached && req.every((m) => m.reached || m.unavailable);
}
/** The required milestones not reached, with why where the run could not reach them. */
export function openMilestones(ev) { return ev.milestones.filter((m) => m.required && !m.reached).map((m) => ({ id: m.id, unavailable: m.unavailable || null })); }
