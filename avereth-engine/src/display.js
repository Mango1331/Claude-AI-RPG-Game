// What the player sees of the mechanics: a System block at the top of a reply, rendered from the engine's own records,
// so the numbers on screen are exactly the numbers that were rolled and applied (Initiative, Turn order, every roll,
// HP before - damage = HP after, everyone's HP and distance, Alaric's resources, checks, and what the reply changed:
// coin, items, quests, XP, rest). host.js shows it through SillyTavern's extra.display_text: display only; the prompt
// keeps the plain reply (the model already gets these numbers in the engine block, and a numbers block in the chat
// history would invite it to write its own).
import { entityLabel } from './knowledge.js';
import { deriveCharacter } from './derived.js';
import { formatCoin } from './economy.js';
import { bandIndex, itemLabel } from './util.js';
import { damagePreview } from './combat.js';

const sys = (text) => `\`${text}\``;

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
    if (reply?.events && reply.state) lines.push(...changeLines(state, reply.state, content, reply.events));
    if (reply?.opened && reply.state) lines.push(...openedLines(reply.state, content, reply.opened));
    return lines.join('\n');
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
    const label = (id) => (after.entities[id] ? entityLabel(after, id) : String(id));
    const why = (d) => (d.why ? ` · ${d.why}` : '');
    const QUEST = { offered: 'OFFERED', active: 'ACCEPTED', completed: 'COMPLETED', failed: 'FAILED' };
    for (const [i, e] of events.entries()) {
        const d = e.d || {};
        if (e.t === 'coin.changed' && d.id === 'pc') out.push(sys(`COIN ${d.delta < 0 ? '-' : '+'}${formatCoin(Math.abs(d.delta), content)} → ${formatCoin(d.value, content)}${why(d)}`));
        else if (e.t === 'item.changed' && d.id === 'pc') {
            inv[d.item] = (inv[d.item] || 0) + d.qty;
            out.push(sys(`ITEM ${d.qty < 0 ? '-' : '+'}${Math.abs(d.qty)} ${d.name || itemLabel(after, content, d.item)} → ${Math.max(0, inv[d.item])} carried${why(d)}`));
        } else if (e.t === 'resource.changed' && d.id === 'pc' && now[d.resource] !== undefined) {
            out.push(sys(`${d.resource.toUpperCase()} ${now[d.resource]} + ${d.value - now[d.resource]} = ${d.value}/${max[d.resource]}${why(d)}`));
            now[d.resource] = d.value;
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
        }
    }
    return out;
}

/** A fight the reply's report started (or someone joining it): the fixed order and everyone's HP before anyone acts. */
function openedLines(state, content, op) {
    const name = (id) => entityLabel(state, id);
    const b = op.board;
    const out = [];
    const order = b.order.map((x) => name(x.id)).join(' › ');
    const who = op.ids.map(name).join(', ');
    if (op.kind === 'started') {
        out.push(sys(`COMBAT START${b.first?.ambush ? ' — AMBUSH' : ''} — ${who} ${op.ids.length > 1 ? 'attack' : 'attacks'} ${name('pc')}`));
        out.push(sys(`Initiative: ${b.order.map((x) => `${name(x.id)} ${x.init}`).join(' · ')} → Turn order: ${order}`));
    } else out.push(sys(`COMBAT — ${who} ${op.ids.length > 1 ? 'join' : 'joins'} the fight (Initiative ${op.ids.map((id) => b.order.find((x) => x.id === id)?.init).join(', ')}) → Turn order: ${order}`));
    out.push(...boardLines(state, b));
    if (!b.first) out.push(sys(`Next: ${name('pc')}'s Turn (Round ${b.round})`));
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
    return [sys(`${entityLabel(state, 'pc')}'s attacks vs ${entityLabel(state, near.id)}${cover}: ${opts.map((o) => `${o.name} ${dmg(o)}`).join(' · ')} damage`)];
}

/** Everyone's HP, the distance of each opponent to Alaric (Range Band, cover) and Alaric's resources. */
function boardLines(state, b) {
    const name = (id) => entityLabel(state, id);
    const out = [sys(`HP: ${b.hp.map((x) => `${name(x.id)} ${x.hp}/${x.max}${x.state ? ` (${x.state})` : ''}`).join(' · ')}`)];
    const range = b.hp.filter((x) => x.band && !x.state);
    if (range.length) out.push(sys(`Range: ${range.map((x) => `${name(x.id)} ${x.band}${x.cover && x.cover !== 'none' ? ` (${x.cover} cover)` : ''}`).join(' · ')}`));
    out.push(sys(`${name('pc')}: MP ${b.pc.mp}/${b.pc.max_mp} · STA ${b.pc.sta}/${b.pc.max_sta} · Arrows ${b.pc.arrows}`));
    return out;
}

function checkLine(c) {
    if (c.automatic) return sys(`CHECK — ${c.label}: automatic success (${String(c.note || 'uncontested').replace(/ \(automatic, no roll\)$/, '')})`);
    return sys(`CHECK — ${c.label}: ${c.chance}% · d100 ${c.roll} → ${c.success ? 'SUCCESS' : 'FAILURE'}`);
}

function combatLines(state, content, o) {
    const name = (id) => entityLabel(state, id);
    if (o.not_started) return [sys(`COMBAT — not possible: ${o.illegal}. Nothing spent, nothing rolled.`)];
    const b = o.board;
    const out = [];
    // a start the previous reply already showed (the fight its report opened) is not repeated
    if (o.started && b && !o.started.previewed) {
        out.push(sys(o.started.joined ? `COMBAT — ${o.started.reason}` : `COMBAT START${o.started.ambush ? ' — AMBUSH' : ''}`));
        out.push(sys(`Initiative: ${b.order.map((x) => `${name(x.id)} ${x.init}`).join(' · ')} → Turn order: ${b.order.map((x) => name(x.id)).join(' › ')}`));
    }
    let round = null;
    for (const r of o.records) {
        if (r.round !== round) {
            round = r.round;
            out.push(sys(`— Round ${round} —`));
        }
        out.push(...recordLines(state, content, r));
    }
    if (o.note) out.push(sys(o.notice || o.note));
    if (o.illegal) out.push(sys(`${name('pc')}: not possible — ${o.illegal} (nothing spent, nothing rolled)`));
    if (b) out.push(...boardLines(state, b));
    if (o.ended) {
        const e = o.ended;
        const fates = [...e.defeated.map((id) => `${name(id)} defeated`), ...e.escaped.filter((id) => id !== 'pc').map((id) => `${name(id)} escaped`)];
        if (e.pc_dead) fates.push(`${name('pc')} is dead`);
        if (e.pc_escaped) fates.push(`${name('pc')} escaped`);
        const sheet = state.entities.pc.sheet;
        const xp = e.xp_awarded ? ` · +${e.xp_awarded} XP → XP ${sheet.xp}/${sheet.level * content.rules.progression.xp_to_next_per_level}` : '';
        out.push(sys(`COMBAT END${fates.length ? ` — ${fates.join(', ')}` : ''}${xp}`));
        for (const lv of o.levelups || []) out.push(sys(`LEVEL UP → ${lv} (+5 free Stat Points)`));
    } else if (o.next) {
        out.push(sys(`Next: ${o.next}`));
        if (state.encounter?.current === 'pc') out.push(...optionsLine(state, content));
    }
    return out;
}

function recordLines(state, content, r) {
    const name = (id) => entityLabel(state, id);
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
