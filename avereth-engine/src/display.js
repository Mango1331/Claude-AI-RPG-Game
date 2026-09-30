// What the player sees of the mechanics: a System block at the top of a reply, rendered from the engine's own records,
// so the numbers on screen are exactly the numbers that were rolled and applied (Initiative, Turn order, every roll,
// HP before - damage = HP after, everyone's HP and distance, Alaric's resources, checks, and what the reply changed:
// coin, items, quests, XP, rest). host.js shows it through SillyTavern's extra.display_text: display only; the prompt
// keeps the plain reply (the model already gets these numbers in the engine block, and a numbers block in the chat
// history would invite it to write its own).
import { playerLabel } from './knowledge.js';
import { deriveCharacter } from './derived.js';
import { formatCoin } from './economy.js';
import { bandIndex, itemLabel } from './util.js';
import { damagePreview, combatTargets, targetLabel } from './combat.js';
import { sceneHandle } from './v4/scene_handles.js';

const sys = (text) => `\`${text}\``;
// a combatant by its target label (from the board of that step, which outlives the fight), anyone else as the player knows them
const namer = (state, board) => (id) => board?.labels?.[id] || targetLabel(state, id, (x) => playerLabel(state, x));
const targetsText = (targets) => `COMBAT TARGETS — ${targets.map((x) => `${x.label} [${x.band}${x.cover && x.cover !== 'none' ? `, ${x.cover} cover` : ''}]`).join(' · ')}`;

/**
 * The System block for the reply to this player turn ('' when nothing was resolved).
 * @param {object} state state after the player's turn (its outcome is state.last.outcome)
 * @param {object} [narratorCheck] a Core #7 check the reply resolved with the CHECK DIE (as the engine recomputed it)
 * @param {object} [reply] the processed reply (engine.narratorReply): its events and state, and the fight its report
 *   opened (Initiative, Turn order and HP are shown before anyone acts)
 */
export function turnPanel(state, content, narratorCheck = null, reply = null) {
    const o = state.last?.outcome;
    const lines = [];
    // a combat step in which nothing happened is not shown when the reply's own fight lines follow (someone joined)
    const idle = o?.kind === 'combat' && !o.records?.length && !o.note && !o.illegal && !o.started && !o.ended;
    if (o?.kind === 'combat' && !(idle && reply?.opened)) lines.push(...combatLines(state, content, o));
    if (o?.kind === 'check' && o.check) lines.push(checkLine(o.check));
    if (o?.kind === 'note' && o.notice) lines.push(sys(o.notice));
    if (narratorCheck) lines.push(sys(`CHECK — ${narratorCheck.what}: ${narratorCheck.chance}% · d100 ${narratorCheck.roll} → ${narratorCheck.success ? 'SUCCESS' : 'FAILURE'}`));
    // what the report changed; the fight it opened shows its own steps and HP below
    if (reply?.events && reply.state) lines.push(...changeLines(state, reply.state, content, reply.opened ? reply.events.slice(0, reply.opened.from) : reply.events));
    if (reply?.opened && reply.state) lines.push(...openedLines(reply.state, content, reply.opened));
    // Test 5 run: six replies without a report left place, people and the quest behind the story, unseen by the player
    // (never the tag itself in display text: the streaming regex hides everything from "<avereth>" on, the HUD included)
    // Test 5 run 2: the missing report is asked for separately (host.js reportRequest) while the player reads
    const secs = reply?.recovery?.ms ? ` (${(reply.recovery.ms / 1000).toFixed(1)} s)` : '';
    if (reply && reply.report_error) {
        const why = reply.report_error === 'no <avereth> report' ? '' : ` (${String(reply.report_error).replace(/[<>]/g, '')})`;
        if (reply.recovery === 'pending') lines.push(sys(`NO FACT REPORT${why}: asking for it separately, the HUD follows in a moment.`));
        else if (reply.recovery?.late) lines.push(sys(`NO FACT REPORT${why}, and the separate request came too late${secs}: the next turn had started without it. Nothing this reply established was recorded; the next report may add it.`));
        else lines.push(sys(`NO FACT REPORT${why}${reply.recovery?.failed ? `, and the separate request brought none${secs}` : ''}: nothing this reply established was recorded, the HUD may lag behind the story. Swipe to retry, or go on: the next report may add it.`));
    } else if (reply?.recovery?.from && reply.recovery.from !== 'attackers' && reply.recovery.from !== 'place') {
        lines.push(sys(`REPORT RECOVERED: the reply had no fact report, a separate request supplied it${secs}.`));
    }
    // attackers the report committed without identifying them (delta.js: "rat pack — …"): never one silent combatant
    if (reply?.attackers?.length) {
        const cut = (t) => (t.length > 80 ? `${t.slice(0, 80).replace(/\s+\S*$/, '')} …` : t);
        const who = reply.attackers.map((a) => `"${cut(String(a.by).replace(/[<>]/g, ''))}"`).join(', ');
        if (reply.recovery === 'pending') lines.push(sys(`ATTACKERS NOT IDENTIFIED YET — ${who}: asking for them separately; the fight and its target list follow in a moment.`));
        else lines.push(sys(`ATTACKERS NOT IDENTIFIED — ${who}${reply.recovery?.from === 'attackers' ? `, and the separate request named none${reply.recovery.late ? ' in time' : ''}${secs}` : ''}: they are not in the fight. The next report may introduce them.`));
    } else if (reply?.recovery?.from === 'attackers') lines.push(sys(`ATTACKERS IDENTIFIED: a separate request named them${secs}.`));
    // the city reached from the start without a spot in it (delta.js): where the reply ends is asked for separately
    if (reply?.unplaced) {
        const city = String(reply.unplaced.city).replace(/[<>]/g, '');
        if (reply.recovery === 'pending') lines.push(sys(`PLACE NOT REPORTED YET — the report named ${city}, not the spot Alaric is at: asking for it separately; the HUD follows in a moment.`));
        else lines.push(sys(`PLACE NOT REPORTED — the report named ${city}, not the spot${reply.recovery?.from === 'place' ? `, and the separate request named none${reply.recovery.late ? ' in time' : ''}${secs}` : ''}: Alaric's place is ${city}, and everyone the reply met is listed with him. The next report may name the spot.`));
    } else if (reply?.recovery?.from === 'place') lines.push(sys(`PLACE REPORTED: ${String(reply.state?.scene.place || '').replace(/[<>]/g, '')}, named by a separate request${secs}.`));
    return lines.join('\n');
}

/**
 * The engine's own answer to an attack in a fight whose target is unclear (engine.js playerTurn): a System panel in
 * place of a story turn. Nothing was spent or rolled; the fight waits for the player to name a target by its label.
 */
export function targetQuestion(state, content, intent) {
    const name = namer(state, null);
    const skill = content.skills.get(intent.skill)?.name || 'Attack';
    if (!state.encounter) {
        const scene = (state.scene?.present || []).filter((id) => id !== 'pc' && state.entities[id]?.status !== 'dead').map((id) => {
            const e = state.entities[id];
            const pos = state.scene.positions?.[id];
            return { id, label: sceneHandle(state, content, id), band: pos?.band || null, hp: e.profile?.hp ?? e.sheet?.hp ?? null, max: e.profile?.max_hp ?? null };
        });
        const ask = intent.kind === 'ambiguous_target'
            ? `which target — ${intent.candidates.map((id) => sceneHandle(state, content, id)).join(' or ')}?`
            : intent.ref ? `"${intent.ref}" is not a valid target in the active scene.` : 'there is no valid target in the active scene.';
        return [
            '[SYSTEM // ATTACK — TARGET NEEDED]',
            `${name('pc')}'s ${skill}: ${ask} Nothing was spent or rolled.`,
            scene.length ? `ACTIVE SCENE — ${scene.map((x) => `${x.label}${x.hp !== null ? ` · HP ${x.hp}/${x.max ?? x.hp}` : ''}${x.band ? ` · ${x.band}` : ''}`).join(' | ')}` : 'ACTIVE SCENE — no targetable actor',
        ].join('\n');
    }
    const targets = combatTargets(state.encounter);
    const ask = intent.kind === 'ambiguous_target' ? `which target — ${intent.candidates.map(name).join(' or ')}?`
        : intent.ref ? `"${intent.ref}" is not a target in this fight.` : 'no target in this fight.';
    return [
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        `${name('pc')}'s ${skill}: ${ask} Nothing was spent or rolled.`,
        targets.length ? targetsText(targets) : 'COMBAT TARGETS — none left',
        targets.length ? `Name one, for example: *${skill} on ${targets[0].label}*` : '',
    ].filter(Boolean).join('\n');
}

/**
 * Coin, items, rest, quests and Quest XP the reply's fact report changed for Alaric, one line each, like a game's
 * loot log: "COIN +30 Copper → 7 Silver 8 Copper · ear bounty".
 */
function changeLines(before, after, content, events) {
    const out = [];
    const sheet = before.entities.pc?.sheet;
    if (!sheet) return out;
    const inv = { ...sheet.inventory };
    const now = { hp: sheet.hp, mp: sheet.mp, sta: sheet.sta };
    let lvl = sheet.level;
    const dv = deriveCharacter(after.entities.pc.sheet, content);
    const max = { hp: dv.maxHp, mp: dv.maxMp, sta: dv.maxSta };
    const per = content.rules.progression.xp_to_next_per_level;
    const label = (id) => (after.entities[id] ? playerLabel(after, id) : String(id));
    const why = (d) => (d.why ? ` · ${d.why}` : '');
    const QUEST = { offered: 'OFFERED', active: 'ACCEPTED', completed: 'COMPLETED', failed: 'FAILED', abandoned: 'GIVEN UP' };
    for (const [i, e] of events.entries()) {
        const d = e.d || {};
        if (e.t === 'coin.changed' && d.id === 'pc') out.push(sys(`COIN ${d.delta < 0 ? '-' : '+'}${formatCoin(Math.abs(d.delta), content)} → ${formatCoin(d.value, content)}${why(d)}`));
        else if (e.t === 'item.changed' && d.id === 'pc') {
            inv[d.item] = (inv[d.item] || 0) + d.qty;
            out.push(sys(`ITEM ${d.qty < 0 ? '-' : '+'}${Math.abs(d.qty)} ${d.name || itemLabel(after, content, d.item)} → ${Math.max(0, inv[d.item])} carried${why(d)}`));
        } else if (e.t === 'resource.changed' && d.id === 'pc' && now[d.resource] !== undefined) {
            out.push(sys(`${d.resource.toUpperCase()} ${now[d.resource]} + ${d.value - now[d.resource]} = ${d.value}/${max[d.resource]}${why(d)}`));
            now[d.resource] = d.value;
        } else if (e.t === 'quest.set' && d.held) {
            // reported completed, not turned in: the contract stays active until it is (delta.js)
            out.push(sys(d.held === 'turn-in by name' ? `QUEST STILL ACTIVE — ${d.quest.title}: more than one Guild contract is active; one is turned in by its name`
                : `QUEST STILL ACTIVE — ${d.quest.title}: a Guild contract is completed when it is turned in at a Guild front desk`));
        } else if (e.t === 'quest.set' && before.quests[d.quest.id]?.status !== d.quest.status) {
            const tags = [d.quest.rank, d.quest.giver ? label(d.quest.giver) : null].filter(Boolean);
            out.push(sys(`QUEST ${QUEST[d.quest.status] || d.quest.status.toUpperCase()} — ${d.quest.title}${tags.length ? ` (${tags.join(' · ')})` : ''}`));
        } else if (e.t === 'xp.changed' && d.id === 'pc') {
            // the award and where it lands: level-ups that follow it carry the final Level and XP
            let [level, xp] = [lvl, d.xp];
            for (const x of events.slice(i + 1)) {
                if (x.t !== 'level.up') break;
                [level, xp] = [x.d.level, x.d.xp_after];
            }
            out.push(sys(`+${d.amount} XP → XP ${xp}/${level * per}${d.reason ? ` · ${d.reason}` : ''}`));
        } else if (e.t === 'level.up' && d.id === 'pc') {
            lvl = d.level;
            out.push(sys(`LEVEL UP → Level ${d.level} (+${d.free_points} free Stat Points)`));
        } else if (e.t === 'quest.ready') {
            const q = after.quests[d.id];
            out.push(sys(`QUEST READY FOR TURN-IN — ${q?.title || d.id}${d.note ? ` · ${d.note}` : ''}`));
        } else if (e.t === 'quest.status' && QUEST[d.to] && d.to !== 'offered') {
            const q = after.quests[d.id];
            out.push(sys(`QUEST ${QUEST[d.to]} — ${q?.title || d.id}${q?.rank ? ` (${q.rank})` : ''}`));
        } else if (e.t === 'quest.created' && d.quest.status === 'offered') {
            out.push(sys(`QUEST OFFERED — ${d.quest.title}${d.quest.giver ? ` (${label(d.quest.giver)})` : ''}`));
        } else if (e.t === 'guild.registered') {
            out.push(sys(`GUILD — registered, Guild Rank ${d.rank} · Power Rank ${d.power_rank}`));
        } else if (e.t === 'guild.promoted') {
            out.push(sys(`GUILD — promoted to ${d.rank}`));
        } else if (e.t === 'object.created' && d.object.holder?.entity === 'pc') {
            out.push(sys(`ITEM + ${d.object.name}${d.object.qty > 1 || d.object.unit ? ` (${d.object.qty}${d.object.unit ? ` ${d.object.unit}` : ''})` : ''}`));
        } else if (e.t === 'object.moved' && (d.to?.entity === 'pc' || before.objects?.[d.id]?.holder?.entity === 'pc')) {
            const o = after.objects[d.split || d.id] || before.objects?.[d.id];
            out.push(sys(d.to?.entity === 'pc' ? `ITEM + ${o?.name || d.id}` : `ITEM - ${o?.name || d.id} → ${d.to?.entity ? label(d.to.entity) : 'left here'}`));
        } else if (e.t === 'object.consumed' && before.objects?.[d.id]?.holder?.entity === 'pc') {
            out.push(sys(`ITEM - ${before.objects[d.id].name}${d.by === 'guild' ? ' → handed in at the desk' : ' (used)'}`));
        } else if (e.t === 'service.granted') {
            out.push(sys(`SERVICE — ${d.what || d.service}${d.by ? ` (${label(d.by)})` : ''}`));
        }
    }
    return out;
}

const STATUS_WORD = { resolved: 'booked', authorized: 'allowed', conditional: 'if', pending: 'open', refused: 'refused', clarify: 'unclear' };

/**
 * Runtime V4: what the engine understood of the player's message and how it resolved each command (with the words it
 * rests on), what it did not take as a decision, and what the reply's world changes were (src/v4/runtime.js).
 */
function commandLines(o) {
    const out = [];
    if (o.interp_failed) out.push(sys('INTERPRETER FAILED — nothing Alaric decided could be read; Regenerate tries again.'));
    for (const r of o.resolutions || []) {
        const quote = r.quote ? `"${String(r.quote).replace(/[<>`]/g, '').slice(0, 70)}" → ` : '';
        out.push(sys(`UNDERSTOOD — ${quote}${r.type} (${STATUS_WORD[r.status] || r.status}${r.reason ? `: ${r.reason}` : ''})`));
    }
    for (const x of o.dropped || []) out.push(sys(`NOT A DECISION — ${x.quote ? `"${String(x.quote).replace(/[<>`]/g, '').slice(0, 70)}" ` : ''}(${x.type}: ${x.rule})`));
    return out;
}

/**
 * The System block of a reply in a V4 campaign: the commands of the turn (or the V3 resolution of a fight or a check),
 * then what the reply changed once the extractor has read it, what the engine refused, a fight the reply opened.
 * reply: {pending} while the extractor reads, {failed} when it could not, else the world result (src/v4/world.js).
 */
export function worldPanel(state, content, reply = {}) {
    const o = state.last?.outcome;
    const lines = [];
    // A creature becoming concretely visible is gameplay-relevant before Combat. Show its canonical handle, locked HP
    // and Range immediately above the same narration that revealed it. This is NOT Initiative and does not start combat.
    if (reply?.state && reply?.events) {
        const before = new Set(state.scene?.present || []);
        const revealed = (reply.state.scene?.present || []).filter((id) => {
            const e = reply.state.entities?.[id];
            if (!e || e.kind !== 'creature' || !e.profile) return false;
            return !before.has(id) || !state.entities?.[id]?.profile;
        });
        for (const id of revealed) {
            const e = reply.state.entities[id];
            const pos = reply.state.scene.positions?.[id];
            const hp = e.profile.hp ?? e.profile.max_hp;
            lines.push(sys(`ACTIVE SCENE — ${sceneHandle(reply.state, content, id)} · HP ${hp}/${e.profile.max_hp} · ${pos?.band || 'Range unknown'}${pos?.cover && pos.cover !== 'none' ? ` · ${pos.cover} cover` : ''}`));
        }
    }
    if (o?.kind === 'v4') lines.push(...commandLines(o));
    else if (o?.kind === 'combat') lines.push(...combatLines(state, content, o));
    else if (o?.kind === 'check' && o.check) lines.push(checkLine(o.check));
    else if (o?.kind === 'note' && o.notice) lines.push(sys(o.notice));
    if (reply.failed) lines.push(sys(`WORLD NOT RECORDED — ${String(reply.failed).replace(/[<>`]/g, '')}. Nothing of this reply changed the game state; swipe to retry, or go on.`));
    if (reply.events && reply.state) {
        lines.push(...changeLines(state, reply.state, content, reply.opened ? reply.events.slice(0, reply.opened.from) : reply.events));
        const check = reply.events.find((e) => e.t === 'check.recorded' && e.d.by === 'narrator');
        if (check) lines.push(sys(`CHECK — ${check.d.what}${check.d.stat ? ` (${check.d.stat})` : ''}: d100 ${check.d.roll} → ${check.d.success ? 'SUCCESS' : 'FAILURE'} (as the story judged it)`));
    }
    for (const x of reply.system || []) lines.push(sys(String(x).replace(/[<>`]/g, '')));
    if (reply.rejected?.length) lines.push(sys(`ENGINE REFUSED ${reply.rejected.length} reported change${reply.rejected.length > 1 ? 's' : ''} (${[...new Set(reply.rejected.map((r) => r.rule))].join(', ')}): see #audit or the event export`));
    if (reply.opened && reply.state) lines.push(...openedLines(reply.state, content, reply.opened));
    return lines.join('\n');
}

/**
 * A fight the reply's report started (or someone joining it): the fixed order, the Turns before Alaric's first one
 * (engine.js openCommitted), everyone's HP, and who acts next.
 */
function openedLines(state, content, op) {
    const b = op.board;
    const name = namer(state, b);
    const out = [];
    const order = b.order.map((x) => name(x.id)).join(' › ');
    const who = op.ids.map(name).join(', ');
    const ambush = b.first?.ambush || op.records?.some((r) => r.opening);
    if (op.kind === 'started') {
        out.push(sys(`COMBAT START${ambush ? ' — AMBUSH' : ''} — ${who} ${op.ids.length > 1 ? 'attack' : 'attacks'} ${name('pc')}`));
        out.push(sys(`Initiative: ${b.order.map((x) => `${name(x.id)} ${x.init}`).join(' · ')} → Turn order: ${order}`));
    } else out.push(sys(`COMBAT — ${who} ${op.ids.length > 1 ? 'join' : 'joins'} the fight (Initiative ${op.ids.map((id) => b.order.find((x) => x.id === id)?.init).join(', ')}) → Turn order: ${order}`));
    // the Turns before Alaric's first one, then the targets and positions as he meets them
    out.push(...roundLines(name, op.records || []), ...targetsLine(b), ...boardLines(state, b));
    if (op.ended) out.push(...endLines(state, content, name, op.ended, op.levelups));
    else if (!b.first) out.push(sys(`Next: ${name('pc')}'s Turn (Round ${b.round})`));
    else {
        const pre = b.first.ambush ? `${name(b.first.ambush)}'s Opening Action (Ambush), then ` : '';
        const before = b.first.before;
        out.push(sys(`Next: ${pre}Round 1 — ${before.length ? `${before.map(name).join(' › ')} ${before.length > 1 ? 'act' : 'acts'} before ${name('pc')}` : `${name('pc')} acts first`}`));
    }
    out.push(...optionsLine(state, content));
    return out;
}

/**
 * Alaric's usable attacks and the damage each deals to the nearest opponent right now (display only, nothing rolled):
 * every legal attack lands (Combat V3), so the choice is about damage, cost and cover.
 */
function optionsLine(state, content) {
    const enc = state.encounter;
    if (!enc) return [];
    const foes = Object.values(enc.combatants).filter((c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped && !c.current.surrendered && c.current.band);
    if (!foes.length) return [];
    const near = foes.sort((a, b) => bandIndex(a.current.band) - bandIndex(b.current.band))[0];
    const opts = damagePreview(enc, content, near.id);
    if (!opts.length) return [];
    const dmg = (o) => `${o.strikes > 1 ? `${o.strikes}×` : ''}${o.min === o.max ? o.min : `${o.min}–${o.max}`}${o.cover === 'ignored' ? ' (ignores cover)' : ''}`;
    const cover = near.current.cover === 'partial' ? ' (partial cover: -25%)' : '';
    return [sys(`${playerLabel(state, 'pc')}'s attacks vs ${near.label || playerLabel(state, near.id)}${cover}: ${opts.map((o) => `${o.name} ${dmg(o)}`).join(' · ')} damage`)];
}

/**
 * The opponents still fighting, by the labels the player targets them with, in the order they entered the fight
 * ("COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT]"): at the start, when someone joins or drops out.
 */
function targetsLine(b) {
    const hp = new Map(b.hp.map((x) => [x.id, x]));
    const targets = Object.entries(b.labels || {}).map(([id, label]) => ({ id, label, ...hp.get(id) })).filter((x) => x.hp !== undefined && !x.state);
    return targets.length ? [sys(targetsText(targets))] : [];
}

/** Everyone's HP, the distance of each opponent to Alaric (Range Band, cover) and Alaric's resources. */
function boardLines(state, b) {
    const name = namer(state, b);
    const out = [sys(`HP: ${b.hp.map((x) => `${name(x.id)} ${x.hp}/${x.max}${x.state ? ` (${x.state})` : ''}`).join(' · ')}`)];
    const range = b.hp.filter((x) => x.band && !x.state);
    if (range.length) out.push(sys(`Range: ${range.map((x) => `${name(x.id)} ${x.band}${x.cover && x.cover !== 'none' ? ` (${x.cover} cover)` : ''}`).join(' · ')}`));
    // arrows only for someone who carries a quiver or arrows (the Pre-Test-5 Warrior's fight showed "Arrows 0")
    const arrows = state.entities.pc?.sheet?.equipment?.quiver || b.pc.arrows > 0 ? ` · Arrows ${b.pc.arrows}` : '';
    out.push(sys(`${name('pc')}: MP ${b.pc.mp}/${b.pc.max_mp} · STA ${b.pc.sta}/${b.pc.max_sta}${arrows}`));
    return out;
}

function checkLine(c) {
    if (c.automatic) return sys(`CHECK — ${c.label}: automatic success (${String(c.note || 'uncontested').replace(/ \(automatic, no roll\)$/, '')})`);
    return sys(`CHECK — ${c.label}: ${c.chance}% · d100 ${c.roll} → ${c.success ? 'SUCCESS' : 'FAILURE'}`);
}

function combatLines(state, content, o) {
    if (o.not_started) return [sys(`COMBAT — not possible: ${o.illegal}. Nothing spent, nothing rolled.`)];
    const b = o.board;
    const name = namer(state, b);
    const out = [];
    // a start the previous reply already showed (the fight its report opened) is not repeated
    if (o.started && b && !o.started.previewed) {
        out.push(sys(o.started.joined ? `COMBAT — ${o.started.reason}` : `COMBAT START${o.started.ambush ? ' — AMBUSH' : ''}`));
        out.push(sys(`Initiative: ${b.order.map((x) => `${name(x.id)} ${x.init}`).join(' · ')} → Turn order: ${b.order.map((x) => name(x.id)).join(' › ')}`));
    }
    // the Turns the reply that opened the fight already showed (o.shown) are the narrator's to tell, not shown again
    const records = o.records.slice(o.shown || 0);
    out.push(...roundLines(name, records));
    if (o.note) out.push(sys(o.notice || o.note));
    if (o.illegal) out.push(sys(`${name('pc')}: not possible — ${o.illegal} (nothing spent, nothing rolled)`));
    // the targets again when the set changed: the start, a joiner, someone down, fled or surrendered
    const changed = (o.started && !o.started.previewed) || o.started?.joined || records.some((r) => r.escaped || r.kind === 'surrender' || (r.strikes || []).some((x) => x.defeated));
    if (b && !o.ended && changed) out.push(...targetsLine(b));
    if (b) out.push(...boardLines(state, b));
    if (o.ended) out.push(...endLines(state, content, name, o.ended, o.levelups));
    else if (o.next) {
        out.push(sys(`Next: ${o.next}`));
        if (state.encounter?.current === 'pc') out.push(...optionsLine(state, content));
    }
    return out;
}

/** Resolved steps under their Round headers ("— Round 1 —"; an Ambush Opening Action is Round 0). */
function roundLines(name, records) {
    const out = [];
    let round = null;
    for (const r of records) {
        if (r.round !== round) {
            round = r.round;
            out.push(sys(round === 0 ? '— Opening Action (Ambush) —' : `— Round ${round} —`));
        }
        out.push(...recordLines(name, r));
    }
    return out;
}

function endLines(state, content, name, e, levelups = []) {
    const fates = [...e.defeated.map((id) => `${name(id)} defeated`), ...e.escaped.filter((id) => id !== 'pc').map((id) => `${name(id)} escaped`)];
    if (e.pc_dead) fates.push(`${name('pc')} is dead`);
    if (e.pc_escaped) fates.push(`${name('pc')} escaped`);
    const sheet = state.entities.pc.sheet;
    const xp = e.xp_awarded ? ` · +${e.xp_awarded} XP → XP ${sheet.xp}/${sheet.level * content.rules.progression.xp_to_next_per_level}` : '';
    return [sys(`COMBAT END${fates.length ? ` — ${fates.join(', ')}` : ''}${xp}`), ...levelups.map((lv) => sys(`LEVEL UP → ${lv} (+5 free Stat Points)`))];
}

function recordLines(name, r) {
    const who = name(r.actor);
    // only Alaric's resources are shown; NPC costs stay in #combat / #audit
    const cost = r.actor === 'pc' && r.cost ? ` · ${r.cost.resource.toUpperCase()} ${r.cost.before} - ${r.cost.amount} = ${r.cost.after}` : '';
    const ammo = r.ammo ? ` · ${r.ammo.used} arrow${r.ammo.used > 1 ? 's' : ''}` : '';
    if (r.kind === 'attack') {
        const move = r.move ? ` (moves ${r.move.from} → ${r.move.to})` : '';
        const back = r.after_move ? ` · then steps back (${String(r.after_move.change).replace(/ -> /g, ' → ')})` : '';
        const lines = [sys(`${who}${move}: ${r.skill_name}${r.opening ? ' (AMBUSH opening)' : ''} → ${name(r.strikes?.[0]?.target || r.target)}${cost}${ammo}${back}`)];
        const many = (r.strikes || []).length > 1;
        for (const [i, s] of (r.strikes || []).entries()) {
            const pre = many ? `${name(s.target)}${r.strikes.every((x) => x.target === s.target) ? ` #${i + 1}` : ''}: ` : '';
            // a record from before Combat V3 may still carry a missed Hit roll
            if (s.hit && !s.hit.success) { lines.push(sys(`  ${pre}MISS (hit ${s.hit.chance}% · d100 ${s.hit.roll})`)); continue; }
            const crit = s.crit?.ambush ? ` AMBUSH CRIT ×${s.crit.multiplier}` : '';
            const mods = [s.cover === 'ignored' ? 'cover ignored' : s.cover ? `cover ${s.cover}` : null, ...(s.reduced || [])].filter(Boolean);
            // HP before - damage = HP after; a Barrier takes its share first, and HP never go below 0 (shown as "→ 0")
            const toHp = s.final - (s.absorbed || 0);
            const barrier = s.absorbed ? ` (${s.absorbed} absorbed by Barrier)` : '';
            const hp = s.hp_before - toHp < 0 ? `${s.hp_before} - ${toHp} → ${s.hp_after}` : `${s.hp_before} - ${toHp} = ${s.hp_after}`;
            lines.push(sys(`  ${pre}${s.final} damage${crit}${mods.length ? ` (${mods.join(', ')})` : ''}${barrier} → ${name(s.target)} HP ${hp}${s.defeated ? ' DEFEATED' : ''}`));
        }
        return lines;
    }
    if (r.kind === 'skill') return [sys(`${who}: ${r.skill_name}${cost}${r.effects?.length ? ` — ${r.effects.join('; ')}` : ''}`)];
    const change = String(r.change || '').replace(/ -> /g, ' → ');
    if (r.kind === 'move' || r.kind === 'flee') return [sys(`${who}: ${r.kind === 'flee' ? 'flees' : `moves ${r.dir}`}${change ? ` (${change})` : ''}${r.escaped ? ' — ESCAPED' : ''}${r.why ? ` — ${r.why}` : ''}`)];
    if (r.kind === 'cover') return [sys(`${who}: takes cover (${change})`)];
    if (r.kind === 'surrender') return [sys(`${who}: SURRENDERS`)];
    if (r.kind === 'hold') return [sys(`${who}: holds${r.why ? ` — ${r.why}` : ''}`)];
    return [sys(`${who}: ${r.kind}`)];
}
