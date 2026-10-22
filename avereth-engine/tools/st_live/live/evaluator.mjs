// The evaluation of a run (docs/LIVE_RUNNER.md §7), from the chat with the engine's records: the full fold, the events,
// the telemetry. It decides which of the guide's milestones were reached and when, how every fight began (who of a
// group joined it), what became of the quests, and what went wrong. It is for the test and its report only: the
// player never sees any of it (players.mjs gets driver.mjs view()). The runner uses it between turns only to end a run
// (the last milestone reached, a defeat, a milestone that takes far too long).
import { foldChat, rec } from '../../../src/host.js';
import { floorAt } from '../../../src/v4/living.js';
import { hallOf, placeName } from '../../../src/v4/domain.js';

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
};
const PANEL_MARKS = { clarify: /\bCLARIFY\b/, not_taken: /\bNOT TAKEN\b/, refused: /\bREFUSED\b/, blocked: /\bBLOCKED\b/, failed: /\bFAILED\b/, not_recorded: /\bNOT RECORDED\b/ };
const FOLD_ON = new Set(['scene.moved', 'quest.status', 'entity.status']);

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
        if (m.is_user && r) {
            if (r.plan?.failed || r.interp?.failed) issue(i, 'planner_failed', `the planner failed${r.plan?.error ? `: ${r.plan.error}` : ''}`);
            if (r.plan?.repaired || r.interp?.repaired) issue(i, 'planner_repaired', 'the planner\'s first answer needed a repair');
            if (r.board?.failed) issue(i, 'board_failed', 'the board generator failed');
        }
        for (const c of recordCalls(r)) if (c.finish && c.finish !== 'stop') issue(i, 'finish', `${c.purpose} ended with finish_reason "${c.finish}"`);
        if (!ev.length) continue;

        const before = ev.some((e) => e.t === 'encounter.started' || e.t === 'entity.status') ? foldChat(chat, i).state : null;
        const after = ev.some((e) => FOLD_ON.has(e.t)) ? foldChat(chat, i + 1).state : null;
        for (const e of ev) {
            const d = e.d || {};
            switch (e.t) {
                case 'creation.completed': hit('creation_complete', i, { skills: d.skills }); break;
                case 'guild.registered': hit('guild_registered', i, { rank: d.rank, branch: d.branch }); break;
                case 'board.shown': hit('board_shown', i, { listings: d.listings?.length || 0 }); break;
                case 'quest.created': {
                    const q = d.quest || {};
                    quests[q.id] = { id: q.id, title: q.title, kind: q.kind, dungeon: q.dungeon || null, floor: q.floor ?? null, task: q.task || null, end_state: q.desired_end_state || null, created: i, statuses: [] };
                    break;
                }
                case 'quest.status': {
                    const q = (quests[d.id] ||= { id: d.id, statuses: [] });
                    q.statuses.push({ to: d.to, at: i, turn: turnAt[i] });
                    const sq = after?.quests?.[d.id];
                    if (sq) Object.assign(q, { title: sq.title, dungeon: sq.dungeon || null, floor: sq.floor ?? null, task: sq.task, end_state: sq.desired_end_state });
                    if (d.to === 'active' && (d.taker || 'pc') === 'pc' && (sq?.dungeon || q.dungeon)) hit('dungeon_quest_active', i, { quest: d.id, title: q.title });
                    if (d.to === 'completed') hit('quest_completed', i, { quest: d.id, title: q.title });
                    break;
                }
                case 'quest.ready': hit('quest_ready', i, { quest: d.id }); (quests[d.id] ||= { id: d.id, statuses: [] }).ready = i; break;
                case 'dungeon.cleared': hit('floor_cleared', i, { dungeon: d.dungeon || d.id || null, floor: d.floor ?? null }); break;
                case 'scene.moved': {
                    const at = after?.scene?.at;
                    if (!at) break;
                    const floor = floorAt(after, at);
                    if (floor >= 1) { inside = true; hit('inside_dungeon', i, { place: at, floor }); }
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
                    if (out.length && !concealed) issue(i, 'group_stayed_out', `fight ${enc.id}: ${out.length} member(s) of the fought group stayed out though he was not hidden (${out.join(', ')})`);
                    break;
                }
                case 'encounter.ended': {
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
                    if (d.status === 'dead' && (role === 'guard' || role === 'boss')) hit('guardian_defeated', i, { id: d.id, role });
                    break;
                }
                case 'delta.rejected': counts.rejected[d.rule || '?'] = (counts.rejected[d.rule || '?'] || 0) + 1; break;
                default: break;
            }
        }
    }

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
    const list = (guide?.milestones || Object.keys(CHECKS).map((id) => ({ id, check: id, required: false }))).map((ms) => ({ id: ms.id, check: ms.check || ms.id, required: ms.required !== false, goal: ms.goal || CHECKS[ms.check || ms.id], ...(reached[ms.check || ms.id] ? { reached: true, ...reached[ms.check || ms.id] } : { reached: false }) }));
    return { milestones: list, reached, encounters, quests: Object.values(quests), defeat, issues, counts, turns };
}

/** The guide's next required milestone not reached yet (the run's progress), or null when all are. */
export function nextMilestone(ev) { return ev.milestones.find((m) => m.required && !m.reached) || null; }
/** Is the guide's last required milestone reached (the run is done)? */
export function finished(ev) { const req = ev.milestones.filter((m) => m.required); return req.length > 0 && req.every((m) => m.reached); }
