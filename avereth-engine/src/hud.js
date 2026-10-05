// Player HUD (Runtime V3, docs/RUNTIME_V3.md): the Character and World panels the player sees under each reply,
// rendered from the canonical state and nothing else. It replaces the tracker blocks the narrator used to write
// (Megumin <Character_Sheet> / <World_State>), which cost a third of every reply and drifted from the engine.
//
// A view, never a second state: renderHud(state) is a pure function of the fold. It is shown through SillyTavern's
// extra.display_text (like the System block above the reply) and never enters a prompt, which quotes the plain
// message text. It shows only what the player may know: no NPC attitudes, agendas, secrets or hidden numbers.
import { deriveCharacter } from './derived.js';
import { formatCoin } from './economy.js';
import { playerLabel, statusOf, truth, currentFacts, propText } from './knowledge.js';
import { targetLabel } from './combat.js';
import { bandIndex, formatClock, itemLabel, normText } from './util.js';
import { sceneHandle } from './v4/scene_handles.js';

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
        .map((q) => `${q.title} (${[q.status, q.rank, q.giver ? playerLabel(state, q.giver) : null, q.reward ? `reward ${q.reward}` : null].filter(Boolean).join(' · ')})`);
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
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location) || state.places?.[state.scene.location];
    const realm = loc?.realm ? content.factions.get(loc.realm)?.name || null : null;
    const status = statusOf(state, state.scene.location);
    const rows = [
        ['Time', formatClock(state.clock.minute)],
        ['Location', `${loc ? loc.name : 'unknown'}${realm ? `, ${realm}` : ''}${state.scene.place ? ` — ${state.scene.place}` : ''}${status !== 'exists' && status !== 'alive' ? ` (${String(status).toUpperCase()})` : ''}`],
    ];
    const weather = truth(state, state.scene.location, 'weather')[0];
    if (weather) rows.push(['Weather', weather.o]);
    const enc = state.encounter;
    // in a fight everyone by the target label the combat panel shows (Cellar Rat A), else as the player knows them
    // Runtime V4 shows the stable scene handle before a fight (Wolf A); V3 as the player knows them
    const label = (id) => enc || state.meta?.runtime !== 'v4' ? targetLabel(state, id, (x) => playerLabel(state, x)) : sceneHandle(state, content, id);
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id]).map((id) => {
        const e = state.entities[id];
        const c = enc?.combatants?.[id];
        const role = e.kind === 'npc' ? truth(state, id, 'occupation')[0]?.o : null;
        const band = c?.current?.band || state.scene.positions[id]?.band;
        const cover = c?.current?.cover || state.scene.positions[id]?.cover;
        const bits = [role, statusOf(state, id) === 'dead' ? 'dead' : c ? `HP ${c.current.hp}/${c.fixed.max_hp}` : null, band ? `${band}${cover && cover !== 'none' ? `, ${cover} cover` : ''}` : null].filter(Boolean);
        return `${label(id)}${bits.length ? ` (${bits.join(', ')})` : ''}`;
    });
    rows.push(['Present', list(present, 'nobody besides Alaric')]);
    if (enc) {
        const current = enc.round === 0 ? 'starting' : `Round ${enc.round}, ${label(enc.current)} to act`;
        rows.push(['Combat', `${current} · Turn order ${enc.order.map(label).join(' › ')}`]);
    } else if ((state.pending_combat || []).length) {
        rows.push(['Combat', `${state.pending_combat.map((p) => label(p.by)).join(', ')} committed to attack`]);
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

function combatHud(state, content) {
    const enc = state.encounter;
    if (!enc) return '';
    const pc = enc.combatants.pc;
    const name = (id) => targetLabel(state, id, (x) => playerLabel(state, x));
    const foes = Object.values(enc.combatants)
        .filter((x) => x.side === 'hostile' && !x.current.defeated && !x.current.escaped && !x.current.surrendered)
        .sort((a, b) => bandIndex(a.current.band) - bandIndex(b.current.band) || name(a.id).localeCompare(name(b.id)));
    const range = (b) => `<span class="avereth-range avereth-range-${String(b || 'unknown').toLowerCase()}">${esc(b || '—')}</span>`;
    const rows = foes.map((x) => `<div class="avereth-combat-row"><span class="avereth-combat-name">${esc(name(x.id))}</span><span class="avereth-combat-hp">${x.current.hp}/${x.fixed.max_hp}</span><span class="avereth-combat-range">${range(x.current.band)}</span><span class="avereth-combat-cover">${esc(x.current.cover && x.current.cover !== 'none' ? x.current.cover : '—')}</span></div>`).join('');
    // Keep tactical context the player can already see even when those actors have not formally joined the encounter yet.
    // This is display-only: it never makes a bystander hostile or inserts them into Initiative.
    const visible = (state.scene?.present || []).filter((id) => id !== 'pc' && state.entities?.[id] && !enc.combatants[id] && statusOf(state, id) !== 'dead')
        .map((id) => ({ id, band: state.scene.positions?.[id]?.band || null, cover: state.scene.positions?.[id]?.cover || 'none' }))
        .filter((x) => x.band)
        .sort((a, b) => bandIndex(a.band) - bandIndex(b.band) || sceneHandle(state, content, a.id).localeCompare(sceneHandle(state, content, b.id)));
    const visibleRows = visible.map((x) => `<div class="avereth-combat-row avereth-combat-visible-row"><span class="avereth-combat-name">${esc(sceneHandle(state, content, x.id))}</span><span class="avereth-combat-hp">—</span><span class="avereth-combat-range">${range(x.band)}</span><span class="avereth-combat-cover">${esc(x.cover && x.cover !== 'none' ? x.cover : '—')}</span></div>`).join('');
    const order = enc.order.filter((id) => enc.combatants[id] && !enc.combatants[id].current.defeated && !enc.combatants[id].current.escaped && !enc.combatants[id].current.surrendered)
        .map((id) => id === enc.current ? `<strong>${esc(name(id))}</strong>` : esc(name(id))).join(' <span class="avereth-turn-arrow">›</span> ');
    const attacks = Object.keys(pc.fixed.actions || {}).map((sid) => content.skills.get(sid)).filter((s) => s?.attack)
        .map((s) => `${esc(s.name)} <span class="avereth-skill-range">${range(s.range?.band)}${(s.effects || []).some((e) => e.kind === 'area') ? ' AoE' : ''}</span>`).join(' · ');
    const current = enc.current === 'pc' ? "Alaric's turn" : `${name(enc.current)} to act`;
    const arrows = Object.values(pc.current.ammo || {}).reduce((a, n) => a + n, 0);
    const arrowText = arrows || state.entities.pc?.sheet?.equipment?.quiver ? ` · Arrows ${arrows}` : '';
    return `<details class="avereth-hud avereth-combat-hud" open><summary>⚔ COMBAT · Round ${enc.round} · ${esc(current)}</summary><div class="avereth-combat-body">
<div class="avereth-combat-resources"><strong>Alaric</strong> · HP ${pc.current.hp}/${pc.fixed.max_hp} · MP ${pc.current.mp}/${pc.fixed.max_mp} · STA ${pc.current.sta}/${pc.fixed.max_sta}${arrowText}</div>
<div class="avereth-combat-table"><div class="avereth-combat-row avereth-combat-head"><span>Target</span><span>HP</span><span>Range</span><span>Cover</span></div>${rows || '<div class="avereth-combat-empty">No active enemies</div>'}${visibleRows ? `<div class="avereth-combat-subhead">Visible · not in the fight yet</div>${visibleRows}` : ''}</div>
<div class="avereth-combat-meta"><strong>Turn order</strong> · ${order}</div>
<div class="avereth-combat-meta"><strong>Attack reach</strong> · ${attacks || '—'}</div>
</div></details>`;
}

/**
 * The HUD shown under a reply: the Character panel and the World panel. mode: 'closed' (folded, the summary line
 * shows the essentials), 'open', or 'off' (''). Empty before the campaign has a character.
 */
export function renderHud(state, content, mode = 'closed') {
    if (mode === 'off' || !state.meta?.started || !state.entities.pc?.sheet) return '';
    if (state.encounter) return combatHud(state, content);
    const s = state.entities.pc.sheet;
    const dv = deriveCharacter(s, content);
    const open = mode === 'open';
    const cls = s.class ? content.classes.get(s.class)?.name || s.class : 'no Class';
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location) || state.places?.[state.scene.location];
    const others = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead').length;
    const charSummary = `L${s.level} ${cls} · HP ${s.hp}/${dv.maxHp} · MP ${s.mp}/${dv.maxMp} · STA ${s.sta}/${dv.maxSta} · ${formatCoin(s.coin_cp, content)}`;
    const worldSummary = `${formatClock(state.clock.minute).split(' (')[0]} · ${loc?.name || 'unknown'}${state.scene.place ? ` — ${state.scene.place}` : ''}${state.encounter ? ' · COMBAT' : ''}${others ? ` · ${others} present` : ''}`;
    return [
        panel(state.entities.pc.name || 'Alaric', charSummary, characterRows(state, content), open),
        panel('World', worldSummary, worldRows(state, content), open),
    ].join('\n');
}
