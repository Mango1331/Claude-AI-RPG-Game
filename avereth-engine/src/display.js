// What the player sees of the mechanics: a System block at the top of a reply, rendered from the engine's own records,
// so the numbers on screen are exactly the numbers that were rolled and applied (Initiative, Turn order, every roll,
// HP before - damage = HP after, everyone's HP, Alaric's resources, checks). host.js shows it through SillyTavern's
// extra.display_text: display only; the prompt keeps the plain reply (the model already gets these numbers in the
// engine block, and a numbers block in the chat history would invite it to write its own).
import { entityLabel } from './knowledge.js';

const sys = (text) => `\`${text}\``;

/**
 * The System block for the reply to this player turn ('' when nothing was resolved).
 * @param {object} state state after the player's turn (its outcome is state.last.outcome)
 * @param {object} [narratorCheck] a Core #7 check the reply resolved with the CHECK DIE (as the engine recomputed it)
 */
export function turnPanel(state, content, narratorCheck = null) {
    const o = state.last?.outcome;
    const lines = [];
    if (o?.kind === 'combat') lines.push(...combatLines(state, content, o));
    if (o?.kind === 'check' && o.check) lines.push(checkLine(o.check));
    if (narratorCheck) lines.push(sys(`CHECK — ${narratorCheck.what}: ${narratorCheck.chance}% · d100 ${narratorCheck.roll} → ${narratorCheck.success ? 'SUCCESS' : 'FAILURE'}`));
    return lines.join('\n');
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
    if (o.started && b) {
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
    if (o.note) out.push(sys(o.note));
    if (o.illegal) out.push(sys(`${name('pc')}: not possible — ${o.illegal} (nothing spent, nothing rolled)`));
    if (b) {
        out.push(sys(`HP: ${b.hp.map((x) => `${name(x.id)} ${x.hp}/${x.max}${x.state ? ` (${x.state})` : ''}`).join(' · ')}`));
        out.push(sys(`${name('pc')}: MP ${b.pc.mp}/${b.pc.max_mp} · STA ${b.pc.sta}/${b.pc.max_sta} · Arrows ${b.pc.arrows}`));
    }
    if (o.ended) {
        const e = o.ended;
        const fates = [...e.defeated.map((id) => `${name(id)} defeated`), ...e.escaped.filter((id) => id !== 'pc').map((id) => `${name(id)} escaped`)];
        if (e.pc_dead) fates.push(`${name('pc')} is dead`);
        if (e.pc_escaped) fates.push(`${name('pc')} escaped`);
        const sheet = state.entities.pc.sheet;
        const xp = e.xp_awarded ? ` · +${e.xp_awarded} XP → XP ${sheet.xp}/${sheet.level * content.rules.progression.xp_to_next_per_level}` : '';
        out.push(sys(`COMBAT END${fates.length ? ` — ${fates.join(', ')}` : ''}${xp}`));
        for (const lv of o.levelups || []) out.push(sys(`LEVEL UP → ${lv} (+5 free Stat Points)`));
    } else if (o.next) out.push(sys(`Next: ${o.next}`));
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
        const lines = [sys(`${who}${move}: ${r.skill_name}${r.opening ? ' (AMBUSH opening)' : ''} → ${name(r.strikes?.[0]?.target || r.target)}${cost}${ammo}`)];
        const many = (r.strikes || []).length > 1;
        for (const [i, s] of (r.strikes || []).entries()) {
            const pre = many ? `${name(s.target)}${r.strikes.every((x) => x.target === s.target) ? ` #${i + 1}` : ''}: ` : '';
            if (!s.hit?.success) { lines.push(sys(`  ${pre}MISS (hit ${s.hit?.chance}% · d100 ${s.hit?.roll})`)); continue; }
            const crit = s.crit?.success ? ` CRIT ×${content.rules.crit.multiplier} (crit ${s.crit.chance}% · d100 ${s.crit.roll})` : '';
            // HP before - damage = HP after; a Barrier takes its share first, and HP never go below 0 (shown as "→ 0")
            const toHp = s.final - (s.absorbed || 0);
            const barrier = s.absorbed ? ` (${s.absorbed} absorbed by Barrier)` : '';
            const hp = s.hp_before - toHp < 0 ? `${s.hp_before} - ${toHp} → ${s.hp_after}` : `${s.hp_before} - ${toHp} = ${s.hp_after}`;
            lines.push(sys(`  ${pre}HIT (hit ${s.hit.chance}% · d100 ${s.hit.roll})${crit} → ${s.final} damage${barrier} → ${name(s.target)} HP ${hp}${s.defeated ? ' DEFEATED' : ''}`));
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
