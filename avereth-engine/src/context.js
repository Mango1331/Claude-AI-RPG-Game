// Context Builder: turns the campaign state into the smallest high-signal prompt block for this turn
// ("smallest possible set of high-signal tokens", Anthropic context engineering). Sections are prioritised and
// packed under a token budget; the most important section (RESOLVED) is placed last, closest to generation
// (Lost-in-the-Middle). NPC cards contain ONLY that NPC's own knowledge -> knowledge boundaries by construction.
import { deriveCharacter } from './derived.js';
import { formatCoin } from './economy.js';
import {
    knowledgeOf, memoriesOf, memoryText, entityLabel, anyLabel, propText, currentFacts, statusOf, pcIdentityFor,
    PC_NAME_FACT, PC_LOOK_FACT,
} from './knowledge.js';
import { rank, pack, Bm25 } from './retrieval.js';
import { estimateTokens, formatClock, joinList, normText, tokenize } from './util.js';

export const DEFAULT_BUDGET = 1400;
export const DEFAULT_RULES_BUDGET = 800;
export const DEFAULT_RECENT_TURNS = 4; // turns still visible in the chat history are not retrieved again
const IDENTITY_FACTS = new Set([PC_NAME_FACT, PC_LOOK_FACT]);

function attitudeLabel(v) {
    if (v === undefined || v === null) return 'no established attitude';
    if (v <= -60) return `hostile (${v})`;
    if (v <= -20) return `wary/unfriendly (${v})`;
    if (v < 20) return `neutral (${v >= 0 ? '+' : ''}${v})`;
    if (v < 60) return `friendly (+${v})`;
    return `trusting (+${v})`;
}

function conditionLabel(hp, max) {
    const r = hp / max;
    if (hp <= 0) return 'dead';
    if (r >= 0.99) return 'unhurt';
    if (r >= 0.7) return 'lightly wounded';
    if (r >= 0.4) return 'wounded';
    if (r >= 0.15) return 'badly wounded';
    return 'near death';
}

function day(minute) {
    return formatClock(minute).split(' (')[0];
}

export function pcLine(state, content) {
    const e = state.entities.pc;
    const s = e.sheet;
    const dv = deriveCharacter(s, content);
    const cls = s.class ? content.classes.get(s.class).name : 'no Class yet';
    const skills = Object.entries(s.skills).map(([id, v]) => `${content.skills.get(id)?.name || id} P${v.prof}`);
    const arrows = s.inventory.standard_arrow;
    const inv = Object.entries(s.inventory).filter(([k]) => k !== 'standard_arrow').map(([k, q]) => `${content.items.get(k)?.name || k}${q > 1 ? ` ×${q}` : ''}`);
    const equip = Object.values(s.equipment).map((r) => (typeof r === 'string' ? content.items.get(r)?.name || r : r.name));
    return [
        `${e.name} — Level ${s.level} Rank ${dv.rank} ${cls} | HP ${s.hp}/${dv.maxHp} MP ${s.mp}/${dv.maxMp} STA ${s.sta}/${dv.maxSta} | XP ${s.xp}/${s.level * content.rules.progression.xp_to_next_per_level}${s.free_points ? ` | Free Stat Points ${s.free_points}` : ''}${e.status === 'dead' ? ' | DEAD' : ''}`,
        `STR ${s.stats.STR} VIT ${s.stats.VIT} AGI ${s.stats.AGI} INT ${s.stats.INT} PER ${s.stats.PER} WIL ${s.stats.WIL} | ATK ${dv.atk} MATK ${dv.matk} DEF ${dv.def} MDEF ${dv.mdef} | Init ${dv.init} | Base Hit ${dv.baseHit}% | Crit ${dv.crit}%`,
        `Skills: ${joinList(skills)} | Equipped: ${joinList(equip)}${arrows !== undefined ? ` | Arrows ${arrows}` : ''} | Carried: ${joinList(inv)} | Coin ${formatCoin(s.coin_cp, content)}`,
    ].join('\n');
}

function npcCard(state, content, id, focusWords) {
    const e = state.entities[id];
    const lines = [];
    const kind = e.kind === 'creature'
        ? `creature (${e.species || content.anchors.get(e.anchor)?.name || 'unknown'})`
        : `person${e.template ? `, ${(content.templates.get(e.template)?.label || e.template).toLowerCase()}` : ''}`;
    const pos = state.scene.positions[id];
    const c = state.encounter && state.encounter.combatants[id];
    const hp = c ? `${conditionLabel(c.current.hp, c.fixed.max_hp)} (HP ${c.current.hp}/${c.fixed.max_hp})` : statusOf(state, id) === 'dead' ? 'dead' : '';
    const band = c ? c.current.band : pos?.band;
    const cover = c ? c.current.cover : pos?.cover;
    lines.push(`• ${entityLabel(state, id)} — ${kind}${e.traits ? `; ${e.traits}` : ''}${hp ? `; ${hp}` : ''}${band ? `; ${band}${cover && cover !== 'none' ? `, ${cover} cover` : ''}` : ''}`);
    if (statusOf(state, id) === 'dead') return lines[0];
    const aware = state.scene.awareness[id];
    const unseen = state.scene.concealed.includes('pc');
    if (e.kind === 'creature') {
        lines.push(`  awareness of Alaric: ${aware || 'not established'}${unseen ? '; Alaric is currently UNSEEN' : ''}`);
    } else {
        const rel = state.relations[`rel.${id}.attitude.pc`];
        const last = rel?.history?.at(-1);
        const ident = pcIdentityFor(state, id);
        const idText = ident.level === 'name' ? 'knows him by name' : ident.level === 'seen' ? 'has seen him, does NOT know his name' : 'has never seen him';
        lines.push(`  toward Alaric: ${attitudeLabel(rel?.value)}${last?.why ? ` (last change: ${last.why})` : ''}; ${idText}${aware ? `; awareness: ${aware}` : ''}${unseen ? '; Alaric is currently UNSEEN by others' : ''}`);
        const subjects = ['pc', ...state.scene.present, state.scene.location];
        const rows = knowledgeOf(state, id).filter((r) => !IDENTITY_FACTS.has(r.about) && r.visibility !== 'secret'
            && (subjects.includes(r.s) || subjects.includes(r.o) || tokenize(propText(state, r, content)).some((w) => focusWords.has(w))));
        const known = rows.filter((r) => r.stance === 'knows').slice(-5).map((r) => `${propText(state, r, content)}${r.outdated ? ' (OUTDATED: the world changed since)' : ''} [${r.source}]`);
        const believed = rows.filter((r) => r.stance !== 'knows').slice(-3).map((r) => `${propText(state, r, content)} [${r.stance}${r.true === false ? ' — actually FALSE' : ''}]`);
        if (known.length) lines.push(`  knows: ${known.join('; ')}`);
        if (believed.length) lines.push(`  believes/suspects: ${believed.join('; ')}`);
        const mems = memoriesOf(state, id)
            .map((m) => {
                const withPc = (m.who || []).includes('pc') || (m.witnesses || []).includes('pc');
                const overlap = tokenize(m.text).filter((w) => focusWords.has(w)).length;
                return { m, score: (m.importance || 3) + (withPc ? 3 : 0) + Math.min(3, overlap) * 2 + m.turn / 1e6 };
            })
            .sort((a, b) => b.score - a.score).slice(0, 3).map(({ m }) => `[${day(m.minute)}] ${memoryText(state, m, id)}`);
        if (mems.length) lines.push(`  remembers: ${mems.join(' | ')}`);
        const secrets = knowledgeOf(state, id).filter((r) => r.is_fact && !r.outdated && r.visibility === 'secret' && r.s !== 'pc');
        if (secrets.length) lines.push(`  keeps secret: ${secrets.map((r) => `${propText(state, r, content)} [${r.source}]`).join('; ')} (reveals it only for its own reasons)`);
    }
    const intent = state.encounter?.intents?.[id] || state.pending_intents?.[id];
    if (intent) lines.push(`  declared intent for its next turn: ${intent}`);
    return lines.join('\n');
}

export function combatBlock(state) {
    const enc = state.encounter;
    if (!enc) return '';
    const order = enc.order.map((id) => entityLabel(state, id)).join(' > ');
    const lines = [enc.round === 0 ? `COMBAT STARTING — Turn order fixed: ${order}; Round 1 resolves with the next player message` : `COMBAT ACTIVE — Round ${enc.round}; current actor: ${entityLabel(state, enc.current)}; Turn order: ${order}`];
    for (const c of Object.values(enc.combatants)) {
        if (c.id === 'pc') continue;
        const st = c.current.defeated ? 'DEFEATED' : c.current.escaped ? 'ESCAPED' : c.current.surrendered ? 'SURRENDERED' : `HP ${c.current.hp}/${c.fixed.max_hp}, ${c.current.band}${c.current.cover !== 'none' ? `, ${c.current.cover} cover` : ''}`;
        const fx = c.current.effects.length ? `; effects: ${c.current.effects.map((x) => x.name).join(', ')}` : '';
        lines.push(`  ${entityLabel(state, c.id)}: L${c.fixed.level} ${c.fixed.rank} ${c.model === 'creature' ? c.fixed.body_plan : 'core-stat'}; ${st}; locked DefeatXP ${c.fixed.defeat_xp ?? '-'}${fx}`);
    }
    const pcfx = enc.combatants.pc.current.effects;
    if (pcfx.length) lines.push(`  Alaric effects: ${pcfx.map((x) => x.name).join(', ')}`);
    lines.push(`  Pending Combat XP: ${enc.pending_xp} (awarded only when the fight ends)`);
    // Testrun 3: bystanders kept up a running commentary during the rat fight (the player: the sponsor's calls made
    // sense, the building owner's did not)
    const bystanders = state.scene.present.filter((id) => id !== 'pc' && !enc.combatants[id] && state.entities[id]?.kind === 'npc' && state.entities[id].status !== 'dead');
    lines.push(`  Combat focus: ${bystanders.length ? `${bystanders.map((id) => entityLabel(state, id)).join(', ')} (not fighting) ${bystanders.length > 1 ? 'stay' : 'stays'}` : 'anyone outside the Turn order stays'} in the background — no running commentary; at most one short call per reply from someone with a direct stake in the fight (a sponsor, a companion); owners, onlookers and passers-by stay silent.`);
    return lines.join('\n');
}

/** One line per resolved step, with rolls, so the narration can follow exactly (and the player can audit). */
export function recordLine(state, r) {
    const who = entityLabel(state, r.actor);
    if (r.kind === 'attack') {
        const parts = [];
        if (r.move) parts.push(`moves ${r.move.from} -> ${r.move.to}`);
        const head = `${who}: ${r.skill_name}${r.opening ? ' (AMBUSH Opening Action)' : ''} -> ${entityLabel(state, r.strikes?.[0]?.target || r.target)}`;
        if (r.cost) parts.push(`${r.cost.resource.toUpperCase()} ${r.cost.before}->${r.cost.after}`);
        if (r.ammo) parts.push(`${r.ammo.used} arrow${r.ammo.used > 1 ? 's' : ''} fired`);
        const strikes = (r.strikes || []).map((s, i) => {
            const pre = r.strikes.length > 1 ? `strike ${i + 1}: ` : '';
            if (!s.hit.success) return `${pre}MISS (hit ${s.hit.chance}%, d100 ${s.hit.roll})`;
            const crit = s.crit && s.crit.roll !== null ? `, crit ${s.crit.chance}% d100 ${s.crit.roll}${s.crit.success ? ' CRIT' : ''}` : '';
            return `${pre}HIT (hit ${s.hit.chance}%, d100 ${s.hit.roll}${crit}) ${s.final} damage${s.absorbed ? ` (${s.absorbed} absorbed)` : ''} -> ${entityLabel(state, s.target)} HP ${s.hp_before}->${s.hp_after}${s.defeated ? ' DEFEATED (dead)' : ''}`;
        });
        return `${head}${parts.length ? ` [${parts.join('; ')}]` : ''}: ${strikes.join('; ')}${r.pending_xp_added ? ` (Pending XP +${r.pending_xp_added})` : ''}`;
    }
    if (r.kind === 'skill') return `${who}: ${r.skill_name} [${r.cost ? `${r.cost.resource.toUpperCase()} ${r.cost.before}->${r.cost.after}` : 'no cost'}]: ${r.effects.join('; ')}`;
    if (r.kind === 'move' || r.kind === 'flee') return `${who}: ${r.kind === 'flee' ? 'flees' : `moves ${r.dir}`} (${r.change || ''})${r.escaped ? ' — ESCAPED' : ''}${r.why ? ` — ${r.why}` : ''}`;
    if (r.kind === 'cover') return `${who}: takes cover (${r.change})${r.why ? ` — ${r.why}` : ''}`;
    if (r.kind === 'surrender') return `${who}: SURRENDERS${r.pending_xp_added ? ` (Pending XP +${r.pending_xp_added})` : ''}`;
    if (r.kind === 'hold') return `${who}: holds (${r.why || 'no action'})`;
    return `${who}: ${r.kind}`;
}

function outcomeBlock(state, content, outcome) {
    if (!outcome) return '';
    const lines = [];
    if (outcome.kind === 'combat') {
        if (outcome.not_started) {
            lines.push(`Alaric's declared attack is NOT possible: ${outcome.illegal}. No combat started; nothing was spent or rolled. It is still Alaric's decision.`);
            return lines.join('\n');
        }
        if (outcome.started) lines.push(`${outcome.started.joined ? outcome.started.reason : `Combat starts (${outcome.started.reason})`}. Turn order: ${outcome.started.order}.`);
        for (const r of outcome.records) lines.push(`- ${recordLine(state, r)}`);
        if (outcome.note) lines.push(`- ${outcome.note}`);
        if (outcome.illegal) lines.push(`- Alaric's declared action is NOT possible now: ${outcome.illegal}. Nothing was spent or rolled for it; it is still Alaric's decision.`);
        if (outcome.ended) {
            const s = outcome.ended;
            lines.push(`- Combat is over.${s.pc_dead ? ' Alaric is dead.' : ''}${s.xp_awarded ? ` Alaric gains ${s.xp_awarded} XP.` : ''}${outcome.levelups?.length ? ` LEVEL UP -> ${outcome.levelups.join(', ')} (+5 free Stat Points each; resources are not refilled).` : ''} Loot is only what the defeated actually carried or what can be harvested; nothing is taken automatically.`);
        } else if (outcome.next) lines.push(`- Next: ${outcome.next}. Stop the narration at Alaric's decision.`);
        if (outcome.records.length) lines.push('Narrate exactly these resolved steps in order: the same number of attacks/projectiles, the same hits and misses, no extra movement, attacks or combatants.');
    } else if (outcome.kind === 'creation.step2') {
        const cls = content.classes.get(outcome.class);
        const s = state.entities.pc.sheet;
        const dv = deriveCharacter(s, content);
        lines.push(`CLASS SELECTED: ${cls.name.toUpperCase()} — favored ${cls.favored.join(' +1, ')} +1; Basic Attack granted (P1/PP0).`);
        lines.push(`Stats now: STR ${s.stats.STR} VIT ${s.stats.VIT} AGI ${s.stats.AGI} INT ${s.stats.INT} PER ${s.stats.PER} WIL ${s.stats.WIL}; MaxHP ${dv.maxHp} MaxMP ${dv.maxMp} MaxSTA ${dv.maxSta}; Init ${dv.init}; Base DEF ${dv.baseDef} Base MDEF ${dv.baseMdef}; XP 0/100.`);
        lines.push('Show CHARACTER CREATION — STEP 2/2 and ask the player to Select exactly 2 Skills from this pool (present each with these exact values):');
        for (const sid of cls.skill_pool) lines.push(`  ${skillSummary(content.skills.get(sid))}`);
        lines.push('Starter Gear is granted only after Step 2. Story time stays frozen: no world narration.');
    } else if (outcome.kind === 'creation.complete') {
        const s = state.entities.pc.sheet;
        const dv = deriveCharacter(s, content);
        lines.push(`SKILLS SELECTED: ${outcome.skills.map((id) => content.skills.get(id).name).join(', ')} (P1/PP0). Starter kit equipped: ${outcome.kit.map((id) => content.items.get(id).name).join(', ')}${s.inventory.standard_arrow ? ` (${s.inventory.standard_arrow} Standard Arrows)` : ''}. Possessions kept: Simple Traveler's Clothes, Small Pouch, ${formatCoin(s.coin_cp, content)}.`);
        lines.push(`Derived: ATK ${dv.atk} MATK ${dv.matk} DEF ${dv.def} MDEF ${dv.mdef}; MaxHP ${dv.maxHp} MaxMP ${dv.maxMp} MaxSTA ${dv.maxSta}; Init ${dv.init}; XP 0/100.`);
        lines.push('Output CHARACTER CREATION COMPLETE. This reply stays System-only with ZERO world narration; story time resumes with the next player message.');
    } else if (outcome.kind === 'creation.invalid') {
        lines.push(`The player's reply is not a valid creation choice (${outcome.reason}). Repeat the current creation step; no world narration.`);
    } else if (outcome.kind === 'check') {
        const c = outcome.check;
        if (c.automatic) lines.push(`${c.label}: automatic success — ${c.note}. Alaric is now concealed.`);
        else lines.push(`${c.label}: chance ${c.chance}% (d100 ${c.roll}) -> ${c.success ? 'SUCCESS: Alaric is concealed' : 'FAILURE: he is noticed'}. Narrate this result; do not change it.`);
    } else if (outcome.kind === 'narrative') {
        lines.push(`No mechanic was triggered by the player's message. CHECK DIE for this reply: d100 = ${outcome.check_die}. Use it only if a Core #7 check is genuinely needed (uncertain AND consequential): Chance% = Actor ÷ (Actor + Opposition) × 100 (Actor = relevant stat + explicit bonuses; situational ±10/20/35 %); success if ${outcome.check_die} ≤ Chance%. Then add "check" to the fact report. Otherwise ignore the die.`);
    } else if (outcome.kind === 'note') {
        lines.push(outcome.text);
    }
    return lines.join('\n');
}

export function skillSummary(skill) {
    const bits = [`${skill.name} [${skill.category}]`];
    if (skill.cost) bits.push(`Cost ${skill.cost.amount} ${skill.cost.resource.toUpperCase()}`);
    if (skill.ammo) bits.push(`Ammo ${skill.ammo.qty} arrow${skill.ammo.qty > 1 ? 's' : ''} (bow)`);
    if (skill.range) bits.push(`Range ${skill.range.band}${skill.range.extra_band ? ' after movement (EXTRA-BAND)' : ''}${skill.range.area ? ' AREA around caster' : ''}`);
    if (skill.attack) {
        const f = `${skill.attack.base} + ${skill.attack.scaling.map((t) => `${t.stat} × ${t.text ?? t.coef}`).join(' + ')} + ${skill.attack.share === 1 ? skill.attack.uses : `${skill.attack.share * 100}% of ${skill.attack.uses}`}`;
        bits.push(`Hit ${skill.attack.hit_mod >= 0 ? '+' : ''}${skill.attack.hit_mod}`);
        bits.push(skill.strikes > 1 ? `${skill.strikes} strikes, each Raw = ${f}` : `Raw = ${f}`);
    }
    if (skill.effect_text && !/^none\.?$/i.test(skill.effect_text) && skill.effect_text !== 'no additional status effect.') bits.push(`Effect: ${skill.effect_text}`);
    return bits.join(' | ');
}

function isLocationId(state, content, id) {
    return content.locations.has(id) || state.entities[id]?.kind === 'location';
}

function mentioned(label, text) {
    const l = normText(label);
    return l.length > 2 && new RegExp(`(^|[^a-z0-9])${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(text);
}

function retrievalItems(state, content, pinnedIds, recentTurns) {
    const items = [];
    for (const m of state.memories) {
        if (m.turn > state.turn - recentTurns) continue; // still visible in the recent chat: do not duplicate it
        if (m.kind === 'meeting') continue; // "first saw Alaric" belongs on that NPC's card, not in the narrator's record
        const text = memoryText(state, m, null);
        items.push({ kind: 'memory', text, entities: [...(m.who || []), ...(m.about || [])], location: m.location, turn: m.turn, importance: (m.importance || 5) / 10, label: `[${day(m.minute)}] ${text}` });
    }
    for (const f of currentFacts(state, (x) => x.visibility !== 'secret' && !IDENTITY_FACTS.has(x.id) && !pinnedIds.has(x.id))) {
        const txt = propText(state, f, content);
        items.push({ kind: 'fact', text: txt, entities: [f.s, f.o].filter((x) => state.entities[x]), location: isLocationId(state, content, f.s) ? f.s : null, turn: f.since?.turn ?? 0, importance: f.importance ?? 0.5, label: `${f.hard ? 'HARD FACT: ' : ''}${txt}` });
    }
    for (const q of Object.values(state.quests)) {
        if (q.status !== 'active' && q.status !== 'offered') continue;
        items.push({ kind: 'quest', text: `${q.title} ${q.notes.join(' ')}`, entities: [q.giver].filter(Boolean), quests: [q.id], turn: q.history.at(-1)?.turn ?? 0, importance: 0.8, label: `Quest (${q.status}): ${q.title}${q.giver ? ` — from ${anyLabel(state, content, q.giver)}` : ''}${q.notes.length ? ` — ${q.notes.at(-1)}` : ''}` });
    }
    for (const t of Object.values(state.threads)) if (t.status === 'open') items.push({ kind: 'thread', text: t.text, entities: [], turn: t.updated?.turn ?? 0, importance: 0.7, label: `Open thread (${t.kind}): ${t.text}` });
    return items;
}

/**
 * Lore: the current realm's entry plus entries whose curated key phrases (proper nouns, topic names) occur in this
 * turn's text. Matching on whole key phrases, not on arbitrary words of the lore body, avoids the lexical misfires
 * seen in Testrun-v1 ("power" -> lifespan lore, "forest" -> a forest realm on the other side of the continent).
 */
function pickLore(content, realmId, scan, budget) {
    const hits = [];
    for (const l of content.lore) {
        const keyHits = l.keys.filter((k) => mentioned(k, scan)).length;
        const realmMatch = !!realmId && l.id === realmId;
        if (keyHits || realmMatch) hits.push({ l, score: keyHits * 2 + (realmMatch ? 1 : 0) });
    }
    hits.sort((a, b) => b.score - a.score);
    const out = [];
    let used = 0;
    for (const { l } of hits) {
        const t = estimateTokens(l.text);
        if (used + t > budget) continue;
        out.push(l.text);
        used += t;
    }
    return out;
}

/** Remove host tracker blocks (e.g. <Blocks>...</Blocks>) and code spans so only prose drives retrieval. */
function proseOnly(text) {
    return String(text || '').replace(/<([A-Za-z_][\w-]*)>[\s\S]*?<\/\1>/g, ' ').replace(/`[^`]*`/g, ' ');
}

const paragraphIndex = new WeakMap();

/** Top rule paragraphs (Core/Content, verbatim) for a System question, via BM25 over paragraphs. */
function ruleParagraphs(content, query, k) {
    let idx = paragraphIndex.get(content);
    if (!idx) {
        const paras = [];
        for (const r of content.rulesText.values()) {
            if (!/^(core|content)\./.test(r.id)) continue;
            for (const p of r.text.split(/\n\s*\n/)) if (p.trim().length > 20) paras.push({ id: r.id, text: `${r.title.replace(/^\[[^\]]+\]\s*/, '')} (${r.id}): ${p.trim()}` });
        }
        idx = { paras, bm: new Bm25(paras.map((p) => p.text)) };
        paragraphIndex.set(content, idx);
    }
    return idx.paras.map((p, i) => [p.text, idx.bm.score(query, i)]).filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]).slice(0, k).map(([t]) => t);
}

// situational rule texts (state-triggered by the engine, never keyword-triggered by prose)
const SITUATION_RULES = { stealth: ['core.8'], loot: ['core.20'], trade: ['core.22'] };

/**
 * Build the per-turn engine block.
 * opts: {input, outcome, corrections: string[], budget, rulesBudget, recentTurns, situations: string[], weights, lastReply, systemQuery}
 */
export function buildContext(state, content, opts = {}) {
    const budget = opts.budget ?? DEFAULT_BUDGET;
    const input = opts.input || '';
    const lastReply = proseOnly(opts.lastReply).slice(-1500);
    const loc = state.entities[state.scene.location] || content.locations.get(state.scene.location);
    const realmId = loc?.realm || null;
    const realm = realmId ? content.factions.get(realmId)?.name || realmId : null;
    const locStatus = statusOf(state, state.scene.location);
    const sections = [];
    const add = (name, text, priority, own = false) => text && sections.push({ name, text, priority, own, tokens: estimateTokens(text) });

    add('header', `[AVERETH ENGINE — authoritative game state, turn ${state.turn}. Numbers, rolls, positions and knowledge below are binding; narrate, never recalculate.]\n${formatClock(state.clock.minute)} | ${loc ? `${loc.name}${realm ? `, ${realm}` : ''}` : 'unknown location'}${state.scene.place ? ` — ${state.scene.place}` : ''} | mode: ${state.mode}${locStatus !== 'exists' && locStatus !== 'alive' ? ` | LOCATION STATUS: ${String(locStatus).toUpperCase()}` : ''}\nSetting: Western-fantasy medieval material culture with mana/high magic; letters and messengers for distance; no modern technology.`, 0);
    add('pc', pcLine(state, content), 0);
    if (state.mode === 'creation') add('creation', `CHARACTER CREATION — STEP ${state.creation.step}/2 in progress. Story time is frozen.${state.creation.step === 1 ? ` Base Classes: ${[...content.classes.values()].map((c) => `${c.name} (${c.favored.join('/')})`).join(', ')}.` : ''}`, 0);

    const queryText = `${input} ${lastReply}`;
    const focusWords = new Set(tokenize(queryText));
    const others = state.scene.present.filter((id) => id !== 'pc' && state.entities[id]);
    if (others.length) add('present', `PRESENT (each NPC knows ONLY what its card lists):\n${others.map((id) => npcCard(state, content, id, focusWords)).join('\n')}`, 1);
    else if (state.mode !== 'creation') add('present', 'PRESENT: nobody besides Alaric.', 1);
    add('combat', combatBlock(state), 0);

    // hard facts about the current place, present people and anything named this turn are always shown (binding)
    const scan = normText(queryText);
    const pinned = currentFacts(state, (f) => f.hard && f.visibility !== 'secret').filter((f) => f.s === state.scene.location
        || state.scene.present.includes(f.s) || mentioned(anyLabel(state, content, f.s), scan)).slice(-6);
    if (pinned.length) add('facts', `ESTABLISHED FACTS (binding; they change only with an in-world cause):\n${pinned.map((f) => `- ${propText(state, f, content)} (since ${day(f.since.minute)}${f.source?.because ? `; cause: ${f.source.because}` : ''})`).join('\n')}`, 0);

    // relevant memories / facts / quests / threads
    const relStrength = new Map();
    for (const r of Object.values(state.relations)) if (r.b === 'pc' || r.a === 'pc') relStrength.set(r.a === 'pc' ? r.b : r.a, Math.min(1, Math.abs(r.value) / 100));
    const focus = {
        entities: [...others, 'pc'], location: state.scene.location, realm: realmId,
        quests: Object.values(state.quests).filter((q) => q.status === 'active').map((q) => q.id), turn: state.turn,
        query: `${queryText} ${others.map((id) => entityLabel(state, id)).join(' ')}`, relationStrength: relStrength,
    };
    const ranked = rank(retrievalItems(state, content, new Set(pinned.map((f) => f.id)), opts.recentTurns ?? DEFAULT_RECENT_TURNS), focus, { weights: opts.weights });
    const rel = pack(ranked.filter((s) => s.score > 1.2), Math.max(120, Math.floor(budget * 0.25)), (t) => estimateTokens(t) + 4);
    if (rel.items.length) add('relevant', `RELEVANT (retrieved from the campaign record):\n${rel.items.map((s) => `- ${s.item.label}`).join('\n')}`, 2);
    // lore: the current realm entry + entries whose key phrases occur in this turn's text
    const lorePicked = pickLore(content, realmId, scan, Math.max(100, Math.floor(budget * 0.2)));
    if (lorePicked.length) add('lore', `LORE:\n${lorePicked.join('\n---\n')}`, 3);
    // situational rules text (own allowance so they never crowd out scene state)
    const rulesIds = [...new Set((opts.situations || []).flatMap((s) => SITUATION_RULES[s] || []))];
    let rulesUsed = 0;
    const rulesTexts = [];
    const rulesCap = opts.rulesBudget ?? DEFAULT_RULES_BUDGET;
    if (opts.systemQuery) {
        // just-in-time retrieval: the few rule paragraphs that answer the question (not whole entries)
        for (const para of ruleParagraphs(content, opts.systemQuery, 4)) {
            if (rulesUsed + estimateTokens(para) > rulesCap) continue;
            rulesTexts.push(para);
            rulesUsed += estimateTokens(para);
        }
    }
    for (const id of rulesIds) {
        const t = content.rulesText.get(id)?.text;
        if (!t || rulesUsed + estimateTokens(t) > rulesCap) continue;
        rulesTexts.push(t);
        rulesUsed += estimateTokens(t);
    }
    if (rulesTexts.length) add('rules', `RULES (situational):\n${rulesTexts.join('\n---\n')}`, 0, true);
    if (opts.corrections && opts.corrections.length) add('corrections', `CORRECTIONS (the previous reply conflicted with the engine; keep the engine's version):\n${opts.corrections.map((c) => `- ${c}`).join('\n')}`, 1);
    if (opts.systemQuery) {
        add('resolved', `SYSTEM QUERY (#system): ${opts.systemQuery}\nAnswer ONLY as the System (neutral, private, computer-like): no narration, no NPC reactions, story time and combat stay frozen. Use the state above, Core rules and player-known content; show formulas and arithmetic when useful; say INSUFFICIENT INFORMATION when data is missing. Never reveal hidden NPC data.`, 0);
    } else {
        add('resolved', opts.outcome ? `RESOLVED THIS TURN (binding):\n${outcomeBlock(state, content, opts.outcome)}` : '', 0);
        add('report', reportInstruction(content), 0, true);
    }

    // pack by priority under budget (priority 0 always kept; sections with their own allowance don't count)
    let used = sections.filter((s) => s.priority === 0 && !s.own).reduce((a, s) => a + s.tokens, 0);
    const kept = new Set(sections.filter((s) => s.priority === 0));
    for (const s of sections.filter((x) => x.priority > 0).sort((a, b) => a.priority - b.priority)) {
        if (used + s.tokens <= budget) { kept.add(s); used += s.tokens; }
    }
    const order = ['header', 'pc', 'creation', 'present', 'combat', 'facts', 'relevant', 'lore', 'rules', 'corrections', 'resolved', 'report'];
    const final = order.map((n) => sections.find((s) => s.name === n && kept.has(s))).filter(Boolean);
    const text = final.map((s) => s.text).join('\n\n');
    return { text, sections: final.map(({ name, tokens }) => ({ name, tokens })), dropped: sections.filter((s) => !kept.has(s)).map((s) => s.name), tokens: estimateTokens(text) };
}

export function reportInstruction(content) {
    const r = content.narrator.report;
    return `FACT REPORT: ${r.instruction}\n${Object.entries(r.keys).map(([k, v]) => `${k}: ${v}`).join(' | ')}\nExample: ${r.example}`;
}
