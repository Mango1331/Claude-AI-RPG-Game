// Player HUD (Runtime V3, docs/RUNTIME_V3.md): the Character and World panels the player sees under each reply,
// rendered from the canonical state and nothing else. It replaces the tracker blocks the narrator used to write
// (Megumin <Character_Sheet> / <World_State>), which cost a third of every reply and drifted from the engine.
//
// A view, never a second state: renderHud(state) is a pure function of the fold. It is shown through SillyTavern's
// extra.display_text (like the System block above the reply) and never enters a prompt, which quotes the plain
// message text. It shows only what the player may know: no NPC attitudes, agendas, secrets or hidden numbers.
import { deriveCharacter, weaponAttackOf } from './derived.js';
import { rulesetOf, skillOf } from './content.js';
import { skillCostAmount } from './passives.js';
import { currentThreads, threadHere, LOCAL_KINDS } from './threads.js';
import { goalLines } from './v4/intents.js';
import { formatCoin } from './economy.js';
import { playerLabel, statusOf, truth, currentFacts, propText } from './knowledge.js';
import { targetLabel } from './combat.js';
import { bandIndex, formatClock, itemLabel, normText, roundHalfUp } from './util.js';
import { sceneHandle } from './v4/scene_handles.js';
import { dungeonOf, trueDungeonOf, dungeonText, exitsFrom, exitText } from './v4/dungeon.js';
import { hudRows as livingRows } from './v4/living.js';
import { goalText } from './v4/guild.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const list = (xs, none = '—') => (xs.length ? xs.join(' · ') : none);

// Patch 10A: consistent, non-repeating location names in expanded and collapsed HUD.
function locationLabels(state, content) {
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location) || state.places?.[state.scene.location];
    const name = loc?.name || 'unknown';
    const realm = loc?.realm ? content.factions.get(loc.realm)?.name || null : null;
    const parts = [name];
    if (realm && normText(realm) !== normText(name)) parts.push(realm);
    const spot = String(state.scene.place || '').trim();
    const detail = spot && !parts.some((part) => normText(part) === normText(spot)) ? ` — ${spot}` : '';
    return { full: `${parts.join(', ')}${detail}`, brief: `${name}${detail}` };
}

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
    const skills = Object.entries(s.skills).map(([id, v]) => `${skillOf(content, id, state)?.name || id} P${v.prof}`);
    const weapon = weaponAttackOf(s, content, rulesetOf(state)); // Patch 9A: his weapon's own attack, no learned Skill
    if (weapon) skills.push(`${weapon.skill.name} (weapon)`);
    const equip = Object.values(s.equipment || {}).map((r) => (typeof r === 'string' ? content.items.get(r)?.name || r : r.name));
    const inv = Object.entries(s.inventory || {}).map(([k, q]) => `${itemLabel(state, content, k)}${q > 1 ? ` ×${q}` : ''}`);
    const quests = Object.values(state.quests).filter((q) => q.status === 'active' || q.status === 'offered')
        .map((q) => `${q.title} (${[q.status, q.rank, q.giver ? playerLabel(state, q.giver) : null, q.reward ? `reward ${q.reward}` : null].filter(Boolean).join(' · ')})`);
    // Patch 10A.3: keep the expanded sheet scannable as a campaign accumulates gear and contracts.
    const brief = (items, limit, command) => `${list(items.slice(0, limit))}${items.length > limit ? ` · +${items.length - limit} more (${command})` : ''}`;
    const fx = state.encounter?.combatants?.pc?.current?.effects || [];
    return [
        ['Level', `${s.level} ${cls} · Power Rank ${dv.rank} · Guild Rank ${guildRankOf(state) || '— (not registered)'}${e.status === 'dead' ? ' · DEAD' : ''}`],
        ['Resources', `HP ${s.hp}/${dv.maxHp} (${condition(s.hp, dv.maxHp)}) · MP ${s.mp}/${dv.maxMp} · STA ${s.sta}/${dv.maxSta} · XP ${s.xp}/${s.level * per}`],
        ['Stats', `STR ${s.stats.STR} · VIT ${s.stats.VIT} · AGI ${s.stats.AGI} · INT ${s.stats.INT} · PER ${s.stats.PER} · WIL ${s.stats.WIL}${s.free_points ? ` · Free Stat Points ${s.free_points}` : ''}`],
        ['Combat', `ATK ${dv.atk} · MATK ${dv.matk} · DEF ${dv.def} · MDEF ${dv.mdef} · Initiative ${dv.init}`],
        ['Skills', list(skills)],
        ['Equipped', list(equip)],
        ['Carried', brief(inv, 8, '#bag')],
        ['Coin', formatCoin(s.coin_cp, content)],
        ['Quests', brief(quests, 3, '#quests')],
        ['Effects', list(fx.map((x) => x.name))],
    ];
}

/** Where and when, who is here, the fight, the open threads: as rows [label, value]. Only player-knowable things. */
export function worldRows(state, content) {
    const location = locationLabels(state, content);
    const status = statusOf(state, state.scene.location);
    const rows = [
        ['Time', formatClock(state.clock.minute)],
        ['Location', `${location.full}${status !== 'exists' && status !== 'alive' ? ` (${String(status).toUpperCase()})` : ''}`],
    ];
    const weather = truth(state, state.scene.location, 'weather')[0];
    if (weather) rows.push(['Weather', weather.o]);
    // Patch 7: in a dungeon, the ways from here he knows (never a hidden one); the whole of it is #map
    // review of Patch 7: a true Dungeon as he knows it (Rank, theme; nothing hidden from him)
    const real = trueDungeonOf(state, state.scene.at);
    const classed = real ? dungeonText(state, real) : null;
    if (classed) rows.push(['Dungeon', `${state.places[real].name} — ${classed.replace(/^a Dungeon: /, '')}`]);
    if (dungeonOf(state, state.scene.at)) rows.push(['Exits', list(exitsFrom(state, state.scene.at).map((e) => exitText(state, e, { ids: false })), 'none known yet (#map)')]);
    // Patch 8: a Living Dungeon's levels as he knows them, its cycle and how many are inside (src/v4/living.js)
    rows.push(...livingRows(state));
    const enc = state.encounter;
    // in a fight everyone by the target label the combat panel shows (Cellar Rat A), else as the player knows them
    // Runtime V4 shows the stable scene handle before a fight (Wolf A); V3 as the player knows them
    const label = (id) => enc || state.meta?.runtime !== 'v4' ? targetLabel(state, id, (x) => playerLabel(state, x)) : sceneHandle(state, content, id);
    const present = state.scene.present.filter((id) => id !== 'pc' && state.entities[id]).map((id) => {
        const e = state.entities[id];
        const c = enc?.combatants?.[id];
        const role = e.kind === 'npc' ? truth(state, id, 'occupation')[0]?.o : null;
        // Patch 8.4.2: the dead lie where they fell, at no range band and in no cover (no fighting target)
        const dead = statusOf(state, id) === 'dead';
        const band = dead ? null : c?.current?.band || state.scene.positions[id]?.band;
        const cover = c?.current?.cover || state.scene.positions[id]?.cover;
        const bits = [role, dead ? 'dead' : c ? `HP ${c.current.hp}/${c.fixed.max_hp}` : null, band ? `${band}${cover && cover !== 'none' ? `, ${cover} cover` : ''}` : null].filter(Boolean);
        return `${label(id)}${bits.length ? ` (${bits.join(', ')})` : ''}`;
    });
    rows.push(['Present', list(present, 'nobody besides Alaric')]);
    if (enc) {
        const current = enc.round === 0 ? 'starting' : `Round ${enc.round}, ${label(enc.current)} to act`;
        rows.push(['Combat', `${current} · Turn order ${enc.order.map(label).join(' › ')}`]);
    } else if ((state.pending_combat || []).length) {
        rows.push(['Combat', `${state.pending_combat.map((p) => label(p.by)).join(', ')} committed to attack`]);
    }
    const quests = Object.values(state.quests).filter((q) => q.status === 'active').map((q) => `${q.title}${state.meta?.runtime === 'v4' && q.kind === 'guild_contract' ? goalText(state, content, q) : ''}`);
    if (quests.length) rows.push(['Active quests', `${list(quests.slice(0, 3))}${quests.length > 3 ? ` · +${quests.length - 3} more (#quests)` : ''}`]);
    // Patch 2: his goals; the hints of this place; a few lasting leads. Everything else is in #journal
    const goals = goalLines(state, { max: 3, ids: false }).map((g) => `${g.status === 'paused' ? '(paused) ' : ''}${g.text}`);
    if (goals.length) {
        const total = Object.values(state.intents || {}).filter((i) => i.status === 'active' || i.status === 'paused').length;
        rows.push(['Goals', `${list(goals)}${total > goals.length ? ` · +${total - goals.length} more (#journal)` : ''}`]);
    }
    const current = currentThreads(state);
    const deadlines = current.filter((t) => t.kind === 'deadline').map((t) => t.text);
    if (deadlines.length) rows.push(['Deadlines', list(deadlines)]);
    const here = current.filter((t) => t.kind !== 'deadline' && threadHere(state, t)).slice(0, 3);
    if (here.length) rows.push(['Here', list(here.map((t) => `${t.text} (${t.kind})`))]);
    const leads = current.filter((t) => t.kind !== 'deadline' && !here.includes(t) && !LOCAL_KINDS.has(t.kind)).slice(0, 3);
    if (leads.length) rows.push(['Leads', list(leads.map((t) => `${t.text} (${t.kind})`))]);
    const more = Object.values(state.threads).length - here.length - leads.length - deadlines.length;
    if (more > 0) rows.push(['Journal', `${more} more (older or settled): #journal`]);
    // world events Alaric can know where he stands: the hard facts about this place (a burned bridge, a sealed gate)
    const known = currentFacts(state, (f) => f.hard && f.visibility !== 'secret' && (f.s === state.scene.at || f.s === state.scene.location)).slice(-3).map((f) => propText(state, f, content));
    if (known.length) rows.push(['Known here', list(known)]);
    return rows;
}

function panel(title, summary, rows, open) {
    const body = rows.map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join('<br>');
    return `<details class="avereth-hud"${open ? ' open' : ''}><summary>${esc(title)} — ${esc(summary)}</summary><div class="avereth-hud-body">${body}</div></details>`;
}

/** Patch 9A: a skill's kind in the combat HUD: it attacks; else a defense ("Defensive", also "Defensive / Utility"); else a utility. */
function skillKind(skill) {
    if (skill.attack) return 'attack';
    return /Defensive/.test(skill.category || '') ? 'defense' : 'utility';
}

/** What an action costs him now (its Proficiency's cost factor), or null. */
function skillCostOf(skill, known, content, mods = null) {
    if (!skill.cost || !skill.cost.amount) return null;
    // Patch 9B-2: the cost the fight books, his Passives' reductions too
    return { resource: skill.cost.resource, amount: skillCostAmount(content, skill, known?.prof || 1, mods) };
}

/** A few words of what a defense or utility does (from its effects; the full text is #skill). */
function effectShort(skill) {
    const until = (e) => (/next_turn/.test(e.until || '') ? ' till his next turn' : '');
    const words = (skill.effects || []).map((e) => {
        switch (e.kind) {
            case 'temp_def': return `+DEF${until(e)}`;
            case 'temp_mdef': return `+MDEF${until(e)}`;
            case 'barrier': return `barrier${until(e)}`;
            case 'incoming_damage_reduction': case 'damage_reduction_next': return `−${e.pct}% damage taken${until(e)}`;
            case 'reposition': return `move ${e.bands || 1} band`;
            case 'next_attack_buff': return `next attack +${e.power_pct}%`;
            // Patch 9B-2
            case 'heal': return 'restores HP';
            case 'restore': return `restores ${e.resource.toUpperCase()}`;
            default: return null;
        }
    }).filter(Boolean);
    return words.join(', ') || null;
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
    // Patch 10A: non-hostile combatants already in Initiative also deserve a row.
    // This is presentation-only: it never creates an ally or changes the encounter.
    const othersInFight = Object.values(enc.combatants)
        .filter((x) => x.id !== 'pc' && x.side !== 'hostile' && !x.current.defeated && !x.current.escaped && !x.current.surrendered)
        .sort((a, b) => bandIndex(a.current.band) - bandIndex(b.current.band) || name(a.id).localeCompare(name(b.id)));
    const otherRows = othersInFight.map((x) => `<div class="avereth-combat-row avereth-combat-other-row"><span class="avereth-combat-name">${esc(name(x.id))}</span><span class="avereth-combat-hp">${x.current.hp}/${x.fixed.max_hp}</span><span class="avereth-combat-range">${range(x.current.band)}</span><span class="avereth-combat-cover">${esc(x.current.cover && x.current.cover !== 'none' ? x.current.cover : '—')}</span></div>`).join('');
    // Keep tactical context the player can already see even when those actors have not formally joined the encounter yet.
    // This is display-only: it never makes a bystander hostile or inserts them into Initiative.
    const visible = (state.scene?.present || []).filter((id) => id !== 'pc' && state.entities?.[id] && !enc.combatants[id] && statusOf(state, id) !== 'dead')
        .map((id) => ({ id, band: state.scene.positions?.[id]?.band || null, cover: state.scene.positions?.[id]?.cover || 'none' }))
        .filter((x) => x.band)
        .sort((a, b) => bandIndex(a.band) - bandIndex(b.band) || sceneHandle(state, content, a.id).localeCompare(sceneHandle(state, content, b.id)));
    const visibleRows = visible.map((x) => `<div class="avereth-combat-row avereth-combat-visible-row"><span class="avereth-combat-name">${esc(sceneHandle(state, content, x.id))}</span><span class="avereth-combat-hp">—</span><span class="avereth-combat-range">${range(x.band)}</span><span class="avereth-combat-cover">${esc(x.cover && x.cover !== 'none' ? x.cover : '—')}</span></div>`).join('');
    const order = enc.order.filter((id) => enc.combatants[id] && !enc.combatants[id].current.defeated && !enc.combatants[id].current.escaped && !enc.combatants[id].current.surrendered)
        .map((id) => id === enc.current ? `<strong>${esc(name(id))}</strong>` : esc(name(id))).join(' <span class="avereth-turn-arrow">›</span> ');
    // Patch 9A: every action he has in this fight (his Skills and his weapon's attack), by kind: attacks with reach and
    // cost, defenses and utilities with cost and a short effect; one he cannot pay now stays listed, marked
    const known = Object.entries(pc.fixed.actions || {}).map(([sid, v]) => [skillOf(content, sid, state), v]).filter(([s]) => s);
    const skillRow = (kind) => known.filter(([s]) => skillKind(s) === kind).map(([s, v]) => {
        const cost = skillCostOf(s, v, content, pc.fixed.passive?.cost);
        const short = cost && Number(pc.current[cost.resource] ?? 0) < cost.amount ? cost.resource.toUpperCase()
            : s.ammo && pc.fixed.weapon_family === 'bow' && (pc.current.ammo?.[s.ammo.item] || 0) < s.ammo.qty ? 'arrows' : null;
        const bits = [cost ? `${cost.amount} ${cost.resource.toUpperCase()}` : null, s.ammo && pc.fixed.weapon_family === 'bow' ? `${s.ammo.qty} arrow` : null, kind === 'attack' ? null : effectShort(s)].filter(Boolean).join(', ');
        const reach = kind === 'attack' ? ` <span class="avereth-skill-range">${range(s.range?.band)}${(s.effects || []).some((e) => e.kind === 'area') ? ' AoE' : ''}</span>` : '';
        return `<span class="avereth-skill${short ? ' avereth-skill-unusable' : ''}">${esc(s.name)}${reach}${bits ? ` <span class="avereth-skill-cost">(${esc(bits)})</span>` : ''}${short ? ` <span class="avereth-skill-short">not enough ${esc(short)}</span>` : ''}</span>`;
    }).join(' · ');
    const attacks = skillRow('attack');
    const defenses = skillRow('defense');
    const utilities = skillRow('utility');
    const current = enc.current === 'pc' ? "Alaric's turn" : `${name(enc.current)} to act`;
    const arrows = Object.values(pc.current.ammo || {}).reduce((a, n) => a + n, 0);
    const arrowText = arrows || state.entities.pc?.sheet?.equipment?.quiver ? ` · Arrows ${arrows}` : '';
    return `<details class="avereth-hud avereth-combat-hud" open><summary>⚔ COMBAT · Round ${enc.round} · ${esc(current)}</summary><div class="avereth-combat-body">
<div class="avereth-combat-resources"><strong>Alaric</strong> · HP ${pc.current.hp}/${pc.fixed.max_hp} · MP ${pc.current.mp}/${pc.fixed.max_mp} · STA ${pc.current.sta}/${pc.fixed.max_sta}${arrowText}</div>
<div class="avereth-combat-table"><div class="avereth-combat-row avereth-combat-head"><span>Target</span><span>HP</span><span>Range</span><span>Cover</span></div>${rows || '<div class="avereth-combat-empty">No active enemies</div>'}${otherRows ? `<div class="avereth-combat-subhead">Other combatants · not hostile</div>${otherRows}` : ''}${visibleRows ? `<div class="avereth-combat-subhead">Visible · not in the fight yet</div>${visibleRows}` : ''}</div>
<div class="avereth-combat-meta"><strong>Turn order</strong> · ${order}</div>
<div class="avereth-combat-meta"><strong>Attack</strong> · ${attacks || '—'}</div>
${defenses ? `<div class="avereth-combat-meta"><strong>Defense</strong> · ${defenses}</div>\n` : ''}${utilities ? `<div class="avereth-combat-meta"><strong>Utility</strong> · ${utilities}</div>\n` : ''}</div></details>`;
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
    const location = locationLabels(state, content);
    const others = state.scene.present.filter((id) => id !== 'pc' && state.entities[id] && statusOf(state, id) !== 'dead').length;
    const charSummary = `L${s.level} ${cls} · HP ${s.hp}/${dv.maxHp} · MP ${s.mp}/${dv.maxMp} · STA ${s.sta}/${dv.maxSta} · ${formatCoin(s.coin_cp, content)}`;
    const worldSummary = `${formatClock(state.clock.minute).split(' (')[0]} · ${location.brief}${others ? ` · ${others} present` : ''}`;
    return [
        panel(state.entities.pc.name || 'Alaric', charSummary, characterRows(state, content), open),
        panel('World', worldSummary, worldRows(state, content), open),
    ].join('\n');
}
