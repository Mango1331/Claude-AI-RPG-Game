// Player HUD (Runtime V3, docs/RUNTIME_V3.md): the Character and World panels the player sees under each reply,
// rendered from the canonical state and nothing else. It replaces the tracker blocks the narrator used to write
// (Megumin <Character_Sheet> / <World_State>), which cost a third of every reply and drifted from the engine.
//
// A view, never a second state: renderHud(state) is a pure function of the fold. It is shown through SillyTavern's
// extra.display_text (like the System block above the reply) and never enters a prompt, which quotes the plain
// message text. It shows only what the player may know: no NPC attitudes, agendas, secrets or hidden numbers.
import { deriveCharacter } from './derived.js';
import { formatCoin } from './economy.js';
import { entityLabel, statusOf, truth, currentFacts, propText } from './knowledge.js';
import { formatClock, itemLabel } from './util.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const list = (xs, none = '—') => (xs.length ? xs.join(' · ') : none);

function condition(hp, max) {
    const r = hp / max;
    if (hp <= 0) return 'dead';
    if (r >= 0.99) return 'unhurt';
    if (r >= 0.7) return 'lightly wounded';
    if (r >= 0.4) return 'wounded';
    if (r >= 0.15) return 'badly wounded';
    return 'near death';
}

/** Guild Rank as the Guild established it (fact pc guild_rank), or null for a non-member. */
export function guildRankOf(state) {
    return truth(state, 'pc', 'guild_rank')[0]?.o || null;
}

/** Alaric's sheet as rows [label, value] (tests read these; the HTML is only their layout). */
export function characterRows(state, content) {
    const e = state.entities.pc;
    const s = e.sheet;
    const dv = deriveCharacter(s, content);
    const cls = s.class ? content.classes.get(s.class)?.name || s.class : 'no Class yet';
    const per = content.rules.progression.xp_to_next_per_level;
    const skills = Object.entries(s.skills).map(([id, v]) => `${content.skills.get(id)?.name || id} P${v.prof}`);
    const equip = Object.values(s.equipment || {}).map((r) => (typeof r === 'string' ? content.items.get(r)?.name || r : r.name));
    const inv = Object.entries(s.inventory || {}).map(([k, q]) => `${itemLabel(state, content, k)}${q > 1 ? ` ×${q}` : ''}`);
    const quests = Object.values(state.quests).filter((q) => q.status === 'active' || q.status === 'offered')
        .map((q) => `${q.title} (${[q.status, q.rank, q.giver ? entityLabel(state, q.giver) : null].filter(Boolean).join(' · ')})`);
    const fx = state.encounter?.combatants?.pc?.current?.effects || [];
    return [
        ['Level', `${s.level} ${cls} · Power Rank ${dv.rank} · Guild Rank ${guildRankOf(state) || '— (not registered)'}${e.status === 'dead' ? ' · DEAD' : ''}`],
        ['Resources', `HP ${s.hp}/${dv.maxHp} (${condition(s.hp, dv.maxHp)}) · MP ${s.mp}/${dv.maxMp} · STA ${s.sta}/${dv.maxSta} · XP ${s.xp}/${s.level * per}`],
        ['Stats', `STR ${s.stats.STR} · VIT ${s.stats.VIT} · AGI ${s.stats.AGI} · INT ${s.stats.INT} · PER ${s.stats.PER} · WIL ${s.stats.WIL}${s.free_points ? ` · Free Stat Points ${s.free_points}` : ''}`],
        ['Combat', `ATK ${dv.atk} · MATK ${dv.matk} · DEF ${dv.def} · MDEF ${dv.mdef} · Initiative ${dv.init}`],
        ['Skills', list(skills)],
        ['Equipped', list(equip)],
        ['Carried', list(inv)],
        ['Coin', formatCoin(s.coin_cp, content)],
        ['Quests', list(quests)],
        ['Effects', list(fx.map((x) => x.name))],
    ];
}

/** Where and when, who is here, the fight, the open threads: as rows [label, value]. Only player-knowable things. */
export function worldRows(state, content) {
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location);
    const realm = loc?.realm ? content.factions.get(loc.realm)?.name || null : null;
    const status = statusOf(state, state.scene.location);
    const rows = [
        ['Time', formatClock(state.clock.minute)],
        ['Location', `${loc ? loc.name : 'unknown'}${realm ? `, ${realm}` : ''}${state.scene.place ? ` — ${state.scene.place}` : ''}${status !== 'exists' && status !== 'alive' ? ` (${String(status).toUpperCase()})` : ''}`],
    ];
    const weather = truth(state, state.scene.location, 'weather')[0];
    if (weather) rows.push(['Weather', weather.o]);
    const enc = state.encounter;
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id]).map((id) => {
        const e = state.entities[id];
        const c = enc?.combatants?.[id];
        const role = e.kind === 'npc' ? truth(state, id, 'occupation')[0]?.o : null;
        const band = c?.current?.band || state.scene.positions[id]?.band;
        const cover = c?.current?.cover || state.scene.positions[id]?.cover;
        const bits = [role, statusOf(state, id) === 'dead' ? 'dead' : c ? `HP ${c.current.hp}/${c.fixed.max_hp}` : null, band ? `${band}${cover && cover !== 'none' ? `, ${cover} cover` : ''}` : null].filter(Boolean);
        return `${entityLabel(state, id)}${bits.length ? ` (${bits.join(', ')})` : ''}`;
    });
    rows.push(['Present', list(present, 'nobody besides Alaric')]);
    if (enc) {
        const current = enc.round === 0 ? 'starting' : `Round ${enc.round}, ${entityLabel(state, enc.current)} to act`;
        rows.push(['Combat', `${current} · Turn order ${enc.order.map((id) => entityLabel(state, id)).join(' › ')}`]);
    } else if ((state.pending_combat || []).length) {
        rows.push(['Combat', `${state.pending_combat.map((p) => entityLabel(state, p.by)).join(', ')} committed to attack`]);
    }
    const quests = Object.values(state.quests).filter((q) => q.status === 'active').map((q) => q.title);
    if (quests.length) rows.push(['Active quests', list(quests)]);
    const threads = Object.values(state.threads).filter((t) => t.status === 'open');
    const deadlines = threads.filter((t) => t.kind === 'deadline').map((t) => t.text);
    if (deadlines.length) rows.push(['Deadlines', list(deadlines)]);
    const open = threads.filter((t) => t.kind !== 'deadline').slice(-5).map((t) => `${t.text} (${t.kind})`);
    if (open.length) rows.push(['Open threads', list(open)]);
    // world events Alaric can know where he stands: the hard facts about this place (a burned bridge, a sealed gate)
    const known = currentFacts(state, (f) => f.hard && f.visibility !== 'secret' && f.s === state.scene.location).slice(-3).map((f) => propText(state, f, content));
    if (known.length) rows.push(['Known here', list(known)]);
    return rows;
}

function panel(title, summary, rows, open) {
    const body = rows.map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join('<br>');
    return `<details class="avereth-hud"${open ? ' open' : ''}><summary>${esc(title)} — ${esc(summary)}</summary><div class="avereth-hud-body">${body}</div></details>`;
}

/**
 * The HUD shown under a reply: the Character panel and the World panel. mode: 'closed' (folded, the summary line
 * shows the essentials), 'open', or 'off' (''). Empty before the campaign has a character.
 */
export function renderHud(state, content, mode = 'closed') {
    if (mode === 'off' || !state.meta?.started || !state.entities.pc?.sheet) return '';
    const s = state.entities.pc.sheet;
    const dv = deriveCharacter(s, content);
    const open = mode === 'open';
    const cls = s.class ? content.classes.get(s.class)?.name || s.class : 'no Class';
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location);
    const others = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead').length;
    const charSummary = `L${s.level} ${cls} · HP ${s.hp}/${dv.maxHp} · MP ${s.mp}/${dv.maxMp} · STA ${s.sta}/${dv.maxSta} · ${formatCoin(s.coin_cp, content)}`;
    const worldSummary = `${formatClock(state.clock.minute).split(' (')[0]} · ${loc?.name || 'unknown'}${state.scene.place ? ` — ${state.scene.place}` : ''}${state.encounter ? ' · COMBAT' : ''}${others ? ` · ${others} present` : ''}`;
    return [
        panel(state.entities.pc.name || 'Alaric', charSummary, characterRows(state, content), open),
        panel('World', worldSummary, worldRows(state, content), open),
    ].join('\n');
}
