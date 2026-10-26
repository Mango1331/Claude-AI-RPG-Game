// The evaluation of a run (docs/LIVE_RUNNER.md §7), from the chat with the engine's records: the full fold, the events,
// the telemetry. It decides which of the guide's milestones were reached and when, how every fight began (who of a
// group joined it), what became of the quests, and what went wrong. It is for the test and its report only: the
// player never sees any of it (players.mjs gets driver.mjs view()). The runner uses it between turns only to end a run
// (the last milestone reached, a defeat, a milestone that takes far too long).
import { foldChat, rec, messageEvents } from '../../../src/host.js';
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
    class_rank_e: 'an actual level.up reaches E',
    class_offered: 'the engine offers one class choice group',
    class_accepted: 'the engine books class.evolved after player choice',
    class_verified: '#class and #feats are answered after the class was accepted',
    class_trait_used: 'a post-evolution snapshot contains the selected class and the PC attacks with actual cost/raw resolution',

    creation_complete: 'the character is created (creation.completed)',
    open_run_duration: 'genuine open campaign reached the guide’s observation turn target after character creation',
    open_run_level: 'the naturally created player character reached the guide’s target level in recorded engine state',
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
    // Patch 9C-2c: a Passive development the engine offered him, a rare or legendary one, and a Passive it booked as his
    passive_offered: 'a Passive development offered to him by the engine (decision.opened kind passive)',
    rare_passive_offered: 'a Rare or Legendary Passive development offered to him by the engine',
    passive_gained: 'a Passive booked as his after his own acceptance (passive.gained for him)',
    // 4.3.0-c.6.6.50 (review of 9C-2c): the Ordinary path of the guide, bound to its quality and its training evidence,
    // and the checks the player makes after it (a run is not done before they were answered)
    ordinary_passive_offered: 'an Ordinary Passive offered from his own training (decision.opened kind passive, quality ordinary, evidence train:…)',
    ordinary_passive_gained: 'that Ordinary Passive of his training booked as his after his acceptance',
    passive_verified: 'after the Ordinary Passive was booked: #status, #passives and #skill Arcane Bolt asked and answered by the System',
    // 4.3.0-c.6.6.52 (9C completion): a Skill development from his own fights, his acceptance, his checks and its use;
    // a person's own technique (NPC signature) met and used. Each from the engine's events, never the story's words
    skill_pattern_noted: 'a qualifying fight noted the patterns of his Skills (growth.noted)',
    skill_development_offered: 'a Skill development offered to him by the engine from his fights (decision.opened kind skill: breakthrough, combination or evolution)',
    skill_development_accepted: 'an offered Skill development booked as his after his acceptance (growth.decided accepted, a Skill)',
    skill_development_verified: 'after it was booked: #skills and #skill <its name> asked and answered by the System',
    developed_skill_used: 'the developed Skill used by him in a fight after it was booked (a combat record of his with that Skill)',
    npc_signature_met: 'a trained person of Level 5 or more met whose sheet holds a technique of their own (entity.sheet_set, generated.signature)',
    npc_signature_used: 'such a person used their own technique in a fight (a combat record of theirs with it)',
};
// the System's answers the Passive checks wait for: the command he sends, and the head of its panel
const PASSIVE_CHECKS = [[/^#status\b/i, '[SYSTEM // STATUS]'], [/^#passives\b/i, '[SYSTEM // PASSIVES]'], [/^#skill\s+arcane bolt\b/i, '[SYSTEM // SKILL] Arcane Bolt']];
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
/**
 * 10B-4b: one turn's terminal failure, from records the Engine actually wrote.
 * Does not rewrite visible player history or alter the original turnOutcome API:
 * this is a runner-only diagnostic/stop decision, not a game rule.
 */
export function turnFailure(chat, u) {
    const o = turnOutcome(chat, u);
    if (o.kind === 'narrator_empty') return { kind: 'narrator_empty', at: o.at, reason: null };
    const player = rec(chat[u]);
    if (o.kind !== 'story' && (player?.plan?.failed || player?.interp?.failed)) {
        return {
            kind: player?.plan?.failed ? 'planner_failed' : 'interpreter_failed',
            at: u,
            reason: (player?.plan?.failed ? player.plan.error : player?.interp?.error) || null,
        };
    }
    if (o.kind === 'story') {
        const x = rec(chat[o.at])?.extraction;
        if (x?.status === 'failed' || x?.status === 'late') {
            return { kind: x.status === 'late' ? 'extractor_late' : 'extractor_failed', at: o.at, reason: x.error || null };
        }
    }
    if (o.kind === 'missing') return { kind: 'missing', at: null, reason: null };
    return null;
}
/**
 * 10B-4b.1: a failed Extractor may be logged as a soft observation only
 * when Engine-authored records PROVE no mechanical action was expected.
 * No heuristic NLP: absent/legacy data and any world event stay hard.
 */
export function softExtractionFailure(chat, u, fault) {
    if (fault?.kind !== 'extractor_failed') return false;
    const record = rec(chat[u]);
    if (!Array.isArray(record?.interp?.commands) || record.interp.commands.length) return false;
    const events = messageEvents(chat[u]);
    if (!events.length || events.some((e) => !['turn.begun', 'cmd.interpreted', 'outcome.recorded'].includes(e.t))) return false;
    const recorded = events.filter((e) => e.t === 'outcome.recorded');
    if (recorded.length !== 1) return false;
    const o = recorded[0].d?.outcome;
    if (o?.kind !== 'v4' || Object.keys(o.expected_keys || {}).length) return false;
    if (!Array.isArray(o.actions) || o.actions.length !== 1 || !String(o.actions[0]).startsWith('NOTHING TO BOOK')) return false;
    if ((o.resolutions || []).length || (o.conditionals || []).length || (o.booked || []).length) return false;
    return true;
}

/** Diagnose a Driver timeout only when the chat also proves the pending phase. */
export function driverFailure(chat, problem, extractionStatus = null) {
    const u = chat.findLastIndex((m) => m.is_user);
    if (u < 0) return null;
    if (problem === 'no reply after the message') {
        const fault = turnFailure(chat, u);
        return ['planner_failed', 'interpreter_failed'].includes(fault?.kind) ? fault : null;
    }
    // Prefer structured Driver.probe().extraction over its human-readable
    // timeout prose. Legacy callers without that field retain the old fallback.
    const timeout = String(problem).startsWith('the turn did not end within ');
    const pending = extractionStatus === 'pending' ||
        (extractionStatus == null && /^the turn did not end within .+\(busy .+, extraction pending\)$/.test(String(problem)));
    if (timeout && pending) {
        const outcome = turnOutcome(chat, u);
        if (outcome.kind === 'story' && rec(chat[outcome.at])?.extraction?.status === 'pending') {
            return { kind: 'extractor_timeout', at: outcome.at, reason: 'extraction remained pending at the turn timeout' };
        }
    }
    return null;
}

/** Runner-only end reason from an already-classified phase failure. */
export function failureEnd(fault, turn) {
    if (!fault) return null;
    const reasons = {
        missing: 'neither the narrator nor the engine answered',
        narrator_empty: `the narrator's reply has no story text (message ${fault.at})`,
        planner_failed: 'the semantic Planner failed before story generation',
        interpreter_failed: 'the V4 Interpreter failed before story generation',
        extractor_failed: `the World Extractor failed after story message ${fault.at}; its world changes were not committed`,
        extractor_late: `the World Extractor was too late after story message ${fault.at}; its world changes were not committed`,
        extractor_timeout: `the World Extractor remained pending after story message ${fault.at}; its world changes were not committed`,
    };
    return {
        kind: fault.kind === 'missing' ? 'ui' : fault.kind,
        why: `turn ${turn}: ${reasons[fault.kind] || fault.kind}${fault.reason ? ` (${String(fault.reason).slice(0, 160)})` : ''}`,
        turn,
    };
}
const PANEL_MARKS = { clarify: /\bCLARIFY\b/, not_taken: /\bNOT TAKEN\b/, refused: /\bREFUSED\b/, blocked: /\bBLOCKED\b/, failed: /\bFAILED\b/, not_recorded: /\bNOT RECORDED\b/ };
const FOLD_ON = new Set(['scene.moved', 'quest.status', 'entity.status', 'entity.created', 'dungeon.slot']);

/** The record's LLM calls (Patch 8.2 telemetry): plan/interp, board, extraction. */
function recordCalls(r) {
    return [...(r?.plan?.llm || []), ...(r?.interp?.llm || []), ...(r?.board?.llm || []), ...(r?.extraction?.llm || [])];
}

/**
 * Evidence-only Recovery observability. An empty post-recovery plan/report may
 * be legitimate or a hidden omission; it is NOT automatically an Engine error.
 * A failed recovery is counted as attempted, but never as a zero-result success.
 */
export function recoveryObservation(chat, u) {
    if (!chat?.[u]?.is_user) return { planner: null, extractor: null };
    const user = rec(chat[u]);
    const end = chat.findIndex((m, i) => i > u && m.is_user);
    const reply = chat.slice(u + 1, end < 0 ? chat.length : end)
        .find((m) => !m.is_user && !m.is_system);
    const replyRecord = reply ? rec(reply) : null;
    const pl = user?.plan;
    const ex = replyRecord?.extraction;
    const validType = x => x === 'empty' || x === 'transport';
    return {
        planner: validType(pl?.recovery) ? {
            type: pl.recovery,
            zeroCommands: !pl.failed && Array.isArray(user?.interp?.commands) && user.interp.commands.length === 0,
            failed: !!pl.failed,
        } : null,
        extractor: validType(ex?.recovery) ? {
            type: ex.recovery,
            zeroDeltas: ex.status === 'applied' && ex.deltas === 0,
            failed: ex.status === 'failed',
        } : null,
    };
}

/** Count only recorded recovery attempts, not plain JSON repairs or guessed recovery. */
export function recoverySummary(chat) {
    const summary = {
        planner: { empty: 0, transport: 0, zeroCommands: 0 },
        extractor: { empty: 0, transport: 0, zeroDeltas: 0 },
    };
    for (let i = 0; i < chat.length; i++) {
        if (!chat[i]?.is_user) continue;
        const o = recoveryObservation(chat, i);
        if (o.planner) {
            summary.planner[o.planner.type]++;
            if (o.planner.zeroCommands) summary.planner.zeroCommands++;
        }
        if (o.extractor) {
            summary.extractor[o.extractor.type]++;
            if (o.extractor.zeroDeltas) summary.extractor.zeroDeltas++;
        }
    }
    return summary;
}

/**
 * chat: SillyTavern's chat array (or a fixture's messages). guide: loaded guide (its milestones' checks), optional.
 * Returns {milestones, reached, encounters, quests, defeat, issues, counts, turns, perf}.
 */
export function evaluate(chat, { guide = null } = {}) {
    const reached = {};
    const passiveDefs = {}; // 4.3.0-c.6.6.50: the Passives defined in the run, by id (whose quality and source a gain has)
    const turnAt = [];
    let turn = 0;
    for (let i = 0; i < chat.length; i++) { if (chat[i].is_user) turn += 1; turnAt[i] = turn; }
    const hit = (id, i, extra = {}) => { if (!reached[id]) reached[id] = { at: i, turn: turnAt[i], ...extra }; };
    const quests = {};
    const encounters = [];
    const issues = [];
    const counts = { rejected: {}, panels: Object.fromEntries(Object.keys(PANEL_MARKS).map((k) => [k, 0])), events: 0, recovery: recoverySummary(chat) };
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
    // 4.3.0-c.6.6.52: the Skill developments of the run (the qualifying fights noted, the offers, the one he took) and
    // the people met with a technique of their own
    let evolvedClass = null;
    const growth = { noted: [], offers: [], accepted: null, signatures: {} };
    const skillNames = {};

    for (let i = 0; i < chat.length; i++) {
        const m = chat[i];
        const r = rec(m);
        const ev = r?.events || [];
        counts.events += ev.length;
        for (const e of ev) {
            if (e.t === 'level.up' && e.d.id === 'pc' && e.d.rank === 'E') hit('class_rank_e', i);
            if (e.t === 'decision.opened' && e.d.decision.kind === 'class') hit('class_offered', i);
            if (e.t === 'class.evolved' && e.d.id === 'pc') { evolvedClass = { ...e.d.profile, at:i }; hit('class_accepted',i,{name:e.d.profile.name}); }
        }
        if (evolvedClass && i > evolvedClass.at) {
            const snapshot = ev.find((e) => ['encounter.started','encounter.updated'].includes(e.t))?.d.encounter;
            const records = ev.findLast((e) => e.t === 'outcome.recorded')?.d.outcome?.records || [];
            if (snapshot?.combatants?.pc?.fixed?.evolution?.id === evolvedClass.id && records.some((r) => r.actor === 'pc' && r.kind === 'attack' && Number.isFinite(r.raw))) hit('class_trait_used',i,{name:evolvedClass.name});
        }

        // what the page showed: System panels (own messages, or the block above a reply)
        const shown = `${m.is_system ? m.mes || '' : ''}\n${m.extra?.display_text || ''}`;
        for (const [k, re] of Object.entries(PANEL_MARKS)) if (re.test(shown)) counts.panels[k] += 1;
        // the record's telemetry
        if (!m.is_user && !m.is_system && r) {
            if (r.narration?.empty) issue(i, 'empty_reply', 'the narrator\'s reply was empty (no extraction; the player saw the notice)');
            if (r.extraction?.status === 'failed') issue(i, 'extraction_failed', `the extractor failed${r.extraction.error ? `: ${r.extraction.error}` : ''}`);
            if (r.extraction?.status === 'late') issue(i, 'extraction_late', 'the extraction came late');
            if (r.extraction?.repaired) issue(i, 'extraction_repaired', 'the extractor\'s first answer needed a repair');
            if (['empty', 'transport'].includes(r.extraction?.recovery)) {
                issue(i, 'extractor_recovery', `the extractor required ${r.extraction.recovery} recovery (status ${r.extraction.status})`);
                if (r.extraction.status === 'applied' && r.extraction.deltas === 0)
                    issue(i, 'extractor_recovery_zero_deltas', 'recovery was applied with 0 deltas; review narrated world changes against the saved state (not necessarily an error)');
            }
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
            if (['empty', 'transport'].includes(r.plan?.recovery)) {
                issue(i, 'planner_recovery', `the planner required ${r.plan.recovery} recovery${r.plan.failed ? ' (failed)' : ''}`);
                if (!r.plan.failed && Array.isArray(r.interp?.commands) && r.interp.commands.length === 0)
                    issue(i, 'planner_recovery_zero_commands', 'recovery produced 0 commands; review player intent before accepting NOTHING TO BOOK (not necessarily an error)');
            }
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
                case 'decision.opened':
                    if (d.decision?.kind === 'skill') {
                        const o = { at: i, turn: turnAt[i], id: d.decision.id, skill: d.decision.skill?.id ?? null, name: d.decision.skill?.name ?? null, development: d.decision.development ?? null, replaces: d.decision.replaces ?? null };
                        growth.offers.push(o);
                        if (o.skill) skillNames[o.skill] = o.name;
                        hit('skill_development_offered', i, { name: o.name, development: o.development, skill: o.skill });
                        break;
                    }
                    if (d.decision?.kind !== 'passive') break;
                    hit('passive_offered', i, { name: d.decision.passive?.name ?? null, quality: d.decision.quality ?? null });
                    if (['rare', 'legendary'].includes(d.decision.quality)) hit('rare_passive_offered', i, { name: d.decision.passive?.name ?? null, quality: d.decision.quality });
                    if (d.decision.quality === 'ordinary' && String(d.decision.evidence || '').startsWith('train:')) hit('ordinary_passive_offered', i, { name: d.decision.passive?.name ?? null });
                    break;
                case 'passive.defined': passiveDefs[d.passive?.id] = d.passive; break;
                case 'skill.defined': if (d.skill?.id) skillNames[d.skill.id] = d.skill.name; break;
                case 'growth.noted': growth.noted.push({ at: i, turn: turnAt[i], fight: d.fight, marks: d.marks || {}, pairs: d.pairs || [] }); hit('skill_pattern_noted', i, { fight: d.fight }); break;
                case 'growth.decided':
                    if (d.status !== 'accepted' || !d.skill) break;
                    growth.accepted ||= { at: i, turn: turnAt[i], skill: d.skill, name: skillNames[d.skill] ?? null, key: d.key };
                    hit('skill_development_accepted', i, { skill: d.skill, name: skillNames[d.skill] ?? null });
                    break;
                case 'entity.sheet_set': {
                    const sig = d.sheet?.generated?.signature;
                    if (!sig || d.id === 'pc') break;
                    growth.signatures[d.id] ||= { at: i, turn: turnAt[i], id: d.id, skill: sig, name: skillNames[sig] ?? null, used: null };
                    hit('npc_signature_met', i, { entityId: d.id, skill: sig, name: skillNames[sig] ?? null });
                    break;
                }
                case 'passive.gained': {
                    if (d.id !== 'pc') break;
                    hit('passive_gained', i, { passive: d.passive });
                    const def = passiveDefs[d.passive];
                    if (def?.quality === 'ordinary' && def.origin?.kind === 'training') hit('ordinary_passive_gained', i, { passive: d.passive, name: def.name });
                    break;
                }
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
        const records = ev.filter((e) => e.t === 'outcome.recorded').flatMap((e) => e.d?.outcome?.records || []);
        const actors = records.map((r) => r.actor);
        // 4.3.0-c.6.6.52: the developed Skill in his hands after he took it, a person's own technique in theirs
        for (const r of records) {
            if (!r?.skill) continue;
            if (r.actor === 'pc' && growth.accepted && r.skill === growth.accepted.skill && i > growth.accepted.at) hit('developed_skill_used', i, { skill: r.skill, name: growth.accepted.name, kind: r.kind });
            const sg = growth.signatures[r.actor];
            if (sg && r.skill === sg.skill) { sg.used ||= i; hit('npc_signature_used', i, { entityId: r.actor, skill: r.skill, name: sg.name }); }
        }
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
    let finalState = null;
    let checkpoint = null;
    const users = chat.map((m, i) => (m.is_user ? i : -1)).filter((i) => i >= 0);
    for (const [k, u] of users.entries()) {
        const end = users[k + 1] ?? chat.length;
        const r = rec(chat[u]);
        const replies = chat.slice(u + 1, end);
        const reply = replies.find((m) => !m.is_user && !m.is_system);
        const x = reply ? rec(reply) : null;
        const s = foldChat(chat, end).state;
        finalState = s;
        const pc = s.entities?.pc;
        if (guide?.openRun?.checkpointTurns === k + 1) {
            checkpoint = { turn: k + 1, level: pc?.sheet?.level ?? null, xp: pc?.sheet?.xp ?? null, coin_cp: pc?.sheet?.coin_cp ?? null,
                hp: pc?.sheet?.hp ?? null, mp: pc?.sheet?.mp ?? null, place: s.scene?.at ?? null,
                equipment: structuredClone(pc?.sheet?.equipment || {}), skills: structuredClone(pc?.sheet?.skills || {}) };
        }
        turns.push({
            turn: k + 1, at: u, input: chat[u].mes, route: r?.route || null, system: replies.some((m) => m.is_system),
            place: s.scene?.at || null, placeName: s.scene?.at ? placeName(s, s.scene.at) : null, hp: pc?.current?.hp ?? pc?.sheet?.hp ?? null, mp: pc?.current?.mp ?? pc?.sheet?.mp ?? null, level: pc?.sheet?.level ?? null, encounter: !!s.encounter,
            events: [...(r?.events || []), ...replies.flatMap((m) => rec(m)?.events || [])].map((e) => e.t),
            perf: { wait: r?.perf?.wait_ms ?? null, engine: r?.perf?.engine_ms ?? null, plan: (r?.plan || r?.interp)?.ms ?? null, board: r?.board?.ms ?? null, narrator: x?.narration?.ms ?? null, extract: x?.extraction?.ms ?? null },
            calls: [...recordCalls(r), ...recordCalls(x)],
            recovery: recoveryObservation(chat, u),
        });
    }
    // 4.3.0-c.6.6.50: the checks after the Ordinary Passive, each a command of his answered by its System panel
    if (reached.ordinary_passive_gained) {
        const answered = PASSIVE_CHECKS.map(([cmd, head]) => {
            for (let j = reached.ordinary_passive_gained.at + 1; j < chat.length; j++) {
                if (!chat[j].is_user || !cmd.test(String(chat[j].mes || '').trim())) continue;
                const k = chat.slice(j + 1).findIndex((m) => !m.is_user && String(m.mes || '').includes(head));
                const next = chat.slice(j + 1).findIndex((m) => m.is_user);
                if (k >= 0 && (next < 0 || k < next)) return j + 1 + k;
            }
            return -1;
        });
        if (answered.every((x) => x >= 0)) hit('passive_verified', Math.max(...answered), { answered: answered.length });
    }
    // 4.3.0-c.6.6.52: the checks after the developed Skill was booked: #skills and #skill with its name, each answered
    if (growth.accepted?.name) {
        const at = answeredAfter(chat, growth.accepted.at, [[/^#skills\b/i, '[SYSTEM // SKILLS]'], [new RegExp(`^#skill\\s+${escapeRe(growth.accepted.name)}\\s*$`, 'i'), `[SYSTEM // SKILL] ${growth.accepted.name}`]]);
        if (at.every((x) => x >= 0)) hit('skill_development_verified', Math.max(...at), { name: growth.accepted.name });
    }
    if (evolvedClass) {
        const checks = answeredAfter(chat,evolvedClass.at,[[/^#class\b/i,'[SYSTEM // CLASS]'],[/^#feats\b/i,'[SYSTEM // FEATS]']]);
        if (checks.every((n) => n >= 0)) hit('class_verified',Math.max(...checks),{name:evolvedClass.name});
    }
    // Open long-run evaluation measures the observation window, never forces a quest, victory or predefined route.
    // Count real player messages only; a campaign cannot pass merely from its greeting or prepared story events.
    if (guide?.openRun && reached.creation_complete && turn >= guide.openRun.minTurns) {
        hit('open_run_duration', chat.length - 1, { playerTurns: turn });
    }
    const targetLevel = guide?.openRun?.targetLevel;
    const pc = finalState?.entities?.pc;
    const progression = targetLevel ? { targetLevel, currentLevel: pc?.sheet?.level ?? null, checkpointTurns: guide.openRun.checkpointTurns ?? null, checkpoint } : null;
    if (targetLevel && reached.creation_complete && pc?.sheet?.level >= targetLevel && pc.status === 'alive' && pc.sheet.hp > 0 && !defeat) {
        const first = turns.find(t => t.level >= targetLevel);
        const at = first ? (users[turns.indexOf(first) + 1] ?? chat.length) - 1 : chat.length - 1;
        hit('open_run_level', at, { level: pc.sheet.level });
    }
    const list = (guide?.milestones || Object.keys(CHECKS).map((id) => ({ id, check: id, required: false }))).map((ms) => {
        const check = ms.check || ms.id;
        if (reached[check]) return { ...reached[check], id: ms.id, check, required: ms.required !== false, goal: ms.goal || CHECKS[check], reached: true };
        return { id: ms.id, check, required: ms.required !== false, goal: ms.goal || CHECKS[check], reached: false, ...(unavailable[check] ? { unavailable: unavailable[check] } : {}) };
    });
    const dungeon = root ? { root, name: placeName(foldChat(chat, chat.length).state, root), floor: level, quest: mine?.id || null } : null;
    return { milestones: list, reached, encounters, quests: Object.values(quests), defeat, issues, counts, turns, dungeon, character, growth, progression };
}

const escapeRe = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** For each [command, panel head]: the index of the System answer to the first such command of his after `from`, or -1. */
function answeredAfter(chat, from, checks) {
    return checks.map(([cmd, head]) => {
        for (let j = from + 1; j < chat.length; j++) {
            if (!chat[j].is_user || !cmd.test(String(chat[j].mes || '').trim())) continue;
            const k = chat.slice(j + 1).findIndex((m) => !m.is_user && String(m.mes || '').includes(head));
            const next = chat.slice(j + 1).findIndex((m) => m.is_user);
            if (k >= 0 && (next < 0 || k < next)) return j + 1 + k;
        }
        return -1;
    });
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
