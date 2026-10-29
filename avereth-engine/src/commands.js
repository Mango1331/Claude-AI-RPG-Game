import { questVisible, starterPool } from './content.js';
// System commands (System #1-#10) answered by the engine from state + content: zero LLM calls, zero story time,
// no combat Turn advance. Only #assign changes state (an explicitly defined state-changing command, System #1).
// #system <question> is the one natural-language query; it is passed to the narrator in System-only mode.
import { deriveCharacter, rawPowerText, itemOf, actionsOf, weaponAttackOf } from './derived.js';
import { goalLines } from './v4/growth.js';
import { skillOfferLines, lineageText } from './v4/skill_growth.js';
import { classLines, className } from './v4/class_growth.js';
import { featLines } from './v4/feats.js';
import { profileOf, sourceText } from './v4/items.js';
import { formatCoin } from './economy.js';
import { findSkill, rulesetOf, startClasses, skillOf, kitOf } from './content.js';
import { passiveTotals, skillCostAmount, passivesOf, passiveText, effectiveStats, statsText, passiveSlots } from './passives.js';
import { passiveLines, passiveOffers } from './v4/passive_growth.js';
import { promotionPp, effectValue, effectFactor, flatEffectValue, affinityFor } from './skills.js';
import { assignStat } from './progression.js';
import { knowledgeOf, memoriesOf, memoryText, propText, playerLabel, statusOf } from './knowledge.js';
import { applyEvent } from './state.js';
import { skillSummary } from './context.js';
import { clone, itemLabel, joinList, normText, formatClock, roundHalfUp, ENGINE_VERSION } from './util.js';
import { currentThreads, threadHere } from './threads.js';
import { knownNote } from './v4/known.js';
import { dungeonOf, mapText } from './v4/dungeon.js';

const HELP = [
    ['#status', 'full current status (alias #stats)'], ['#skills', 'all known Skills'], ['#skill <name>', 'full Skill definition with current values'],
    ['#feats', 'lifetime career and exceptional deeds'], ['#class', 'Base Class, growth, evolution'], ['#passives', 'Passive slots, his Passives and developments offered to him'], ['#domain', 'Domain state'], ['#equipment', 'equipped Gear and totals'],
    ['#bag', 'inventory and coin (alias #inventory)'], ['#item <name>', 'Item definition'], ['#quests', 'known Quests'],
    ['#quest <name>', 'Quest details'], ['#effects', 'active effects'], ['#effect <name>', 'effect details'],
    ['#combat', 'encounter audit (read-only)'], ['#system <question>', 'mechanics question answered by the System'],
    ['#assign <STAT> <n>', 'spend free Stat Points (state-changing)'], ['#npc <name>', 'what Alaric knows about someone'],
    ['#log [n]', "Alaric's recent memories"], ['#journal', 'goals, places known by report, open and settled threads'], ['#map', 'the rooms and ways of the dungeon you are in, as far as you know them'], ['#audit', 'rolls, rejected reports and corrections of the last turn'], ['#help', 'this list'],
];

/** Split "#status #skill Power Shot" into commands (left to right, System #1). */
export function splitCommands(text) {
    const out = [];
    const re = /#([a-z]+)([^#]*)/gi;
    let m;
    while ((m = re.exec(String(text)))) out.push({ name: m[1].toLowerCase(), arg: m[2].trim() });
    return out;
}

function pcSheet(state) {
    return state.entities.pc.sheet;
}

function skillCost(skill, prof, content, sheet = null, meaningfulMastery = false) {
    if (!skill.cost) return 'none';
    // Patch 9B-2: what the fight books, his Passives' cost reductions too (src/passives.js skillCostAmount)
    const mods = sheet ? passiveTotals(sheet, content).cost : null;
    const amount = skillCostAmount(content, skill, prof, mods, meaningfulMastery);
    const mult = content.rules.proficiency.levels[String(prof || 1)].cost;
    return `${amount} ${skill.cost.resource.toUpperCase()}${mult !== 1 || amount !== skill.cost.amount ? ` (base ${skill.cost.amount})` : ''}`;
}

/** Patch 9B-1: what a Skill's numeric effects give at this Proficiency, as the combat engine books them. */
function effectsNow(content, sk, stats, prof, ruleset) {
    return (sk.effects || []).map((e) => {
        if (e.kind === 'temp_def' || e.kind === 'temp_mdef') return `${e.kind === 'temp_def' ? 'DEF' : 'MDEF'} +${effectValue(content, e, stats, prof, ruleset)}`;
        if (e.kind === 'barrier') return `Barrier ${effectValue(content, e, stats, prof, ruleset)} HP`;
        if (e.kind === 'post_attack_temp_def') return `DEF +${flatEffectValue(content, e.flat, prof, ruleset)} after the attack`;
        return null;
    }).filter(Boolean);
}

function status(state, content) {
    const e = state.entities.pc;
    const s = e.sheet;
    const dv = deriveCharacter(s, content);
    const cls = s.class ? className(s, content) : 'none (Character Creation)';
    const fx = pcEffects(state);
    return [
        '[SYSTEM // STATUS]',
        `${e.name} | ${e.race || 'Human'} | Level ${s.level} | XP ${s.xp}/${s.level * content.rules.progression.xp_to_next_per_level} | Power Rank ${dv.rank} | Class: ${cls}`,
        `HP ${s.hp}/${dv.maxHp} | MP ${s.mp}/${dv.maxMp} | STA ${s.sta}/${dv.maxSta}`,
        `${statsText(s, content)} | Free Stat Points ${s.free_points}`,
        `ATK ${dv.atk} | MATK ${dv.matk} | DEF ${dv.def} (base ${dv.baseDef}) | MDEF ${dv.mdef} (base ${dv.baseMdef}) | Initiative ${dv.init} (floor(1.5 × AGI))`,
        `Active Effects: ${fx.length ? fx.map((x) => x.name).join(', ') : 'none'} | Domain: NOT YET UNLOCKED`,
        // Patch 9B-2: his Passives (their lasting bonuses are in the values above), only when he has any
        ...(passivesOf(s).length ? [`Passives: ${passivesOf(s).map((p) => p.name).join(', ')} (#class for what they do)`] : []),
        `Equipment: ${equipmentList(s, content).join(', ') || 'none'}`,
    ].join('\n');
}

/**
 * Character creation answered by the engine as a System panel, like a command: no narrator call (System #12 is a
 * menu, not a scene). Pre-Test-5 run: a narrator shown the real Warrior pool presented an invented one, then narrated
 * "CHARACTER CREATION COMPLETE" over the engine's rejection; the campaign stayed in creation without anyone seeing it.
 * The panel shows the real step, the real pool with values, what was recognized and, at the end, the finished sheet.
 */
export function creationPanel(state, content, outcome) {
    const s = pcSheet(state);
    const dv = deriveCharacter(s, content);
    const step = state.mode === 'creation' ? state.creation.step : 3;
    const cls = s.class ? content.classes.get(s.class) : null;
    const classMenu = () => [
        'Choose your Base Class (reply with its name, for example "Warrior"):',
        // Patch 9A: the starting classes of this campaign's ruleset (a new campaign: Warrior, Mage, Rogue)
        ...startClasses(content, rulesetOf(state)).map((c) => `- ${c.name} — Favored Stats ${c.favored.join(' / ')}`),
    ];
    const poolMenu = () => {
        const pool = starterPool(content, cls.id, state).map((id) => content.skills.get(id));
        return [
            `Choose exactly ${content.start.creation.choose_skills} Skills from the ${cls.name} Base Pool (for example "${pool[0].name} + ${pool[1].name}"):`,
            ...pool.map((sk) => `- ${skillSummary(sk)}`),
            `Starter Gear, equipped when Step 2 is complete: ${kitOf(content, cls.id, rulesetOf(state)).map((id) => gearText(content.items.get(id))).join(', ')}.`,
        ];
    };
    if (outcome?.kind === 'creation.complete') {
        const st = status(state, content).split('\n').slice(1);
        return [
            '[SYSTEM // CHARACTER CREATION COMPLETE]',
            `SKILLS SELECTED: ${outcome.skills.map((id) => `${content.skills.get(id).name} (P1)`).join(', ')}`,
            `STARTER GEAR EQUIPPED: ${outcome.kit.map((id) => gearText(content.items.get(id))).join(', ')}`,
            ...st,
            `Carried: ${Object.entries(s.inventory).map(([k, q]) => `${itemLabel(state, content, k)}${q > 1 ? ` ×${q}` : ''}`).join(', ') || 'nothing'} | Coin ${formatCoin(s.coin_cp, content)}`,
            'The story begins with your next message: write what Alaric does.',
        ].join('\n');
    }
    if (outcome?.kind === 'creation.step2') {
        return [
            '[SYSTEM // CHARACTER CREATION — STEP 2/2]',
            `CLASS SELECTED: ${cls.name.toUpperCase()} — favored ${cls.favored.join(' +1, ')} +1 · Basic Attack granted (P1)`,
            `STR ${s.stats.STR} | VIT ${s.stats.VIT} | AGI ${s.stats.AGI} | INT ${s.stats.INT} | PER ${s.stats.PER} | WIL ${s.stats.WIL} | Max HP ${dv.maxHp} | Max MP ${dv.maxMp} | Max STA ${dv.maxSta} | Initiative ${dv.init}`,
            ...poolMenu(),
        ].join('\n');
    }
    // not a valid choice: say why and show the current step again
    const recognized = outcome?.recognized?.length ? ` Recognized: ${outcome.recognized.map((id) => content.skills.get(id)?.name || id).join(', ')}.` : '';
    return [
        `[SYSTEM // CHARACTER CREATION — STEP ${step}/2]`,
        `Not a valid ${step === 1 ? 'Base Class' : 'Skill'} choice: ${String(outcome?.reason || 'nothing chosen').replace(/\.$/, '')}.${recognized}`,
        ...(step === 1 ? classMenu() : poolMenu()),
        'The story begins once character creation is complete.',
    ].join('\n');
}

function gearText(it) {
    const bits = ['atk', 'matk', 'def', 'mdef'].filter((k) => it[k]).map((k) => `${k.toUpperCase()} ${it[k]}`);
    return `${it.name}${it.rank ? ` [${it.rank}]` : ''}${bits.length ? ` (${bits.join(', ')})` : ''}`;
}

function equipmentList(s, content) {
    return Object.values(s.equipment).map((ref) => {
        const it = itemOf(ref, content);
        const bits = ['atk', 'matk', 'def', 'mdef'].filter((k) => it[k]).map((k) => `${k.toUpperCase()} ${it[k]}`);
        const contents = it.slot === 'quiver' ? `Standard Arrow ×${s.inventory.standard_arrow || 0}` : '';
        return `${it.name}${it.rank ? ` [${it.rank}]` : ''}${bits.length || contents ? ` (${[...bits, contents].filter(Boolean).join(', ')})` : ''}`;
    });
}

function skills(state, content) {
    const s = pcSheet(state);
    const lines = ['[SYSTEM // SKILLS]'];
    for (const [id, v] of Object.entries(s.skills)) {
        const sk = skillOf(content, id, state);
        if (!sk) { lines.push(`${id} | UNKNOWN DEFINITION`); continue; }
        lines.push(`${sk.name}${sk.dynamic ? ' (learned in this campaign)' : ''} | ${sk.category} | Rank ${sk.rank || '-'} | Complexity ${sk.complexity || '-'} | P${v.prof} (${ppText(content, sk, v, state)}) | Tags ${joinList(sk.tags, '-')}${aspectsText(sk)} | Cost ${skillCost(sk, v.prof, content, s, state.meta.f_progression === true)}`);
    }
    if (lines.length === 1) lines.push('No Skills known yet.');
    // Patch 9A: the plain attack of the weapon he holds, no learned Skill (it comes and goes with the weapon)
    const w = weaponAttackOf(s, content, rulesetOf(state));
    if (w) lines.push(`${w.skill.name} | weapon attack of the equipped ${w.weapon.name} (not a learned Skill) | Cost ${skillCost(w.skill, 1, content, s, state.meta.f_progression === true)}${w.skill.ammo ? ` + ${w.skill.ammo.qty} arrow` : ''}`);
    // Patch 9C-1: the techniques he is learning, with their source and Learning Progress (src/v4/growth.js)
    const goals = goalLines(state);
    if (goals.length) lines.push('LEARNING:', ...goals);
    // 9C completion (src/v4/skill_growth.js): the Skills offered to him, and the Skills his own evolved from
    const offered = rulesetOf(state) >= 2 ? skillOfferLines(state, content) : [];
    if (offered.length) lines.push(...offered);
    lines.push('Use #skill <Skill Name> for full details.');
    return lines.join('\n');
}

/** Review of 9B-1: a dynamic Skill's thematic aspects (metadata, no effect), when it has any. */
const aspectsText = (sk) => (sk.aspects?.length ? ` | Aspects ${sk.aspects.join(', ')}` : '');

/** Patch 9B-1: his PP toward the next Proficiency (its threshold by the Skill's Complexity), "max" at P5. */
function ppText(content, sk, v, state) {
    return v.prof >= 5 ? 'PP max' : `PP ${v.pp || 0}/${promotionPp(content, sk, state)}`;
}

function skill(state, content, arg) {
    const s = pcSheet(state);
    const sk = findSkill(content, arg, s.class, state);
    if (!sk) return `[SYSTEM // SKILL]\nUNKNOWN SKILL "${arg}".`;
    const known = actionsOf(s, content, rulesetOf(state), state)[sk.id]; // Patch 9A: his weapon's attack too
    // 9C completion: one he evolved from names what it became
    const became = (s.skill_history || []).find((h) => h.id === sk.id);
    if (!known && became) return `[SYSTEM // SKILL]\n${sk.name} evolved into ${skillOf(content, became.evolved_to, state)?.name || became.evolved_to}: #skill ${skillOf(content, became.evolved_to, state)?.name || became.evolved_to}.`;
    if (!known) return `[SYSTEM // SKILL]\n${sk.name} is not a Skill Alaric knows.`;
    const dv = deriveCharacter(s, content);
    const prof = content.rules.proficiency.levels[String(known.prof)];
    const lines = [`[SYSTEM // SKILL] ${sk.name}`, `Category ${sk.category} | Rank ${sk.rank || '-'} | Complexity ${sk.complexity || '-'} | ${known.weapon ? `weapon attack of the equipped ${known.weapon} (not a learned Skill)` : `Proficiency P${known.prof} (${ppText(content, sk, known, state)})`} | Tags ${joinList(sk.tags, '-')}${aspectsText(sk)}`];
    lines.push(`Cost: ${skillCost(sk, known.prof, content, s, state.meta.f_progression === true)}${sk.ammo ? ` | Ammo: ${sk.ammo.qty} ${content.items.get(sk.ammo.item)?.name || sk.ammo.item} when fired from a bow` : ''}`);
    if (sk.range) lines.push(`Range: ${sk.range.band}${sk.range.extra_band ? ' (EXTRA-BAND movement: may move one additional band and must end ENGAGED)' : ''}${sk.range.area ? ` | Area: ${sk.range.area}` : ''}`);
    if (sk.attack) {
        lines.push(`Base Power ${sk.attack.base} | Scaling ${sk.attack.scaling.map((t) => `${t.stat} ×${t.text ?? t.coef}`).join(' + ')} | Uses ${sk.attack.share === 1 ? '' : `${sk.attack.share * 100}% of `}${sk.attack.uses} | ${sk.attack.damage_type}`);
        lines.push(`A legal attack always lands (no Hit or Crit roll; only a true Ambush Opening Action crits ×${content.rules.crit.multiplier})${sk.attack.ignores_partial_cover ? ' | ignores Partial Cover' : ''}${sk.strikes > 1 ? ` | ${sk.strikes} strikes (separate damage each)` : ''}`);
        lines.push(`Current Raw Power: ${rawPowerText(sk, effectiveStats(s, content), dv)}${prof.power !== 1 ? ` (×${prof.power} Proficiency on Modified Power)` : ''}`);
    }
    if (sk.effect_text && !/^none\.?$/i.test(sk.effect_text)) lines.push(`Effect: ${sk.effect_text}`);
    if (sk.flavor) lines.push(`Description (appearance only, no mechanical effect): ${sk.flavor}`);
    // Patch 9B-1: the numbers its effects give now, at his Proficiency (the same values src/combat.js books)
    const now = effectsNow(content, sk, effectiveStats(s, content), known.prof, rulesetOf(state));
    if (now.length) lines.push(`Current effect: ${now.join(' | ')}${effectFactor(content, known.prof, rulesetOf(state)) !== 1 ? ` (×${effectFactor(content, known.prof, rulesetOf(state))} Proficiency, rounded)` : ''}`);
    if (!known.weapon && rulesetOf(state) >= 2 && s.class) lines.push(`Proficiency Progress: ${ppText(content, sk, known, state)} · Affinity ×${affinityFor(content, s.class, sk)} (highest of its tags)`);
    const lineage = rulesetOf(state) >= 2 ? lineageText(state, content, sk.id) : null;
    if (lineage) lines.push(lineage);
    return lines.join('\n');
}

function klass(state, content) {
    const s = pcSheet(state);
    if (!s.class) return '[SYSTEM // CLASS]\nNo Base Class selected yet (Character Creation).';
    const c = content.classes.get(s.class);
    const head = ['[SYSTEM // CLASS]', `Base Class: ${c.name} | Rank ${deriveCharacter(s, content).rank} | Favored Stats: ${c.favored.join(' / ')}`, `Class Growth: ${c.growth_text}`];
    // Patch 9A: no class evolution is tied to a Level any more; organic class growth is not unlocked yet (Patch 9D). A
    // legacy campaign keeps the panel it always showed
    // Patch 9B-2: the Passives he actually has, each with what it does and when
    const passives = passivesOf(s);
    const plist = passives.length ? ['Passives:', ...passives.map((p) => `- ${passiveText(p)}`)] : ['Passives: none'];
    // Patch 9C-2c: his slots and what is offered to him (src/v4/passive_growth.js)
    if (rulesetOf(state) >= 2) plist.push(`Passive slots: ${passives.length}/${passiveSlots(content)}${passiveOffers(state).length ? ` · ${passiveOffers(state).length} development${passiveOffers(state).length > 1 ? 's' : ''} offered` : ''} (#passives)`);
    if (rulesetOf(state) >= 2) return [...head, ...classLines(state, content), ...plist].join('\n');
    const next = [15, 30, 45, 60, 75, 90].find((l) => l > s.level);
    return [...head, 'Evolution history: none', `Next known evolution milestone: Level ${next ?? '-'}`].join('\n');
}

function equipment(state, content) {
    const s = pcSheet(state);
    const dv = deriveCharacter(s, content);
    const lines = ['[SYSTEM // EQUIPMENT]'];
    for (const [slot, ref] of Object.entries(s.equipment)) {
        const it = itemOf(ref, content);
        const bits = ['atk', 'matk', 'def', 'mdef'].filter((k) => it[k]).map((k) => `${k.toUpperCase()} ${it[k]}`);
        lines.push(`${slot}: ${it.name}${it.rank ? ` [${it.rank}]` : ''}${bits.length ? ` — ${bits.join(', ')}` : ''}${it.slot === 'quiver' ? ` — Standard Arrow ×${s.inventory.standard_arrow || 0}` : ''}`);
    }
    lines.push(`Totals from Gear: ATK ${dv.atk} | MATK ${dv.matk} | DEF +${dv.gearDef} | MDEF +${dv.gearMdef}`);
    return lines.join('\n');
}

function bag(state, content) {
    const s = pcSheet(state);
    const lines = ['[SYSTEM // BAG]'];
    for (const [id, q] of Object.entries(s.inventory)) {
        const it = content.items.get(id);
        // Patch 9C-2b: a Skill Stone or a manual says what it holds or teaches
        const src = sourceText(profileOf(content, state.objects?.[id]));
        lines.push(`${itemLabel(state, content, id)}${it?.rank ? ` [${it.rank}]` : ''} ×${q}${id === 'standard_arrow' && s.equipment.quiver ? ' (in quiver)' : ''}${src ? ` · ${src}` : ''}`);
    }
    if (lines.length === 1) lines.push('empty');
    lines.push(`Coin: ${formatCoin(s.coin_cp, content)} (${s.coin_cp} Copper)`);
    return lines.join('\n');
}

function item(state, content, arg) {
    const s = pcSheet(state);
    const t = normText(arg);
    const owned = [...Object.values(s.equipment), ...Object.keys(s.inventory)].map((r) => itemOf(r, content));
    const it = owned.find((x) => normText(x.name) === t) || owned.find((x) => normText(x.name).includes(t));
    if (!it) return `[SYSTEM // ITEM]\nAlaric has no item called "${arg}".`;
    const lines = [`[SYSTEM // ITEM] ${it.name}`, `Rank ${it.rank || 'unranked'} | type ${it.slot || '-'}${it.family ? ` (${it.family.replace(/_/g, ' ')})` : ''}`];
    const bits = ['atk', 'matk', 'def', 'mdef'].filter((k) => it[k]).map((k) => `${k.toUpperCase()} ${it[k]}`);
    if (bits.length) lines.push(bits.join(' | '));
    if (it.contains) lines.push(`Contains: ${Object.entries(it.contains).map(([k]) => `${content.items.get(k)?.name || k} ×${s.inventory[k] || 0}`).join(', ')}`);
    if (it.note) lines.push(it.note);
    const equipped = Object.entries(s.equipment).find(([, r]) => itemOf(r, content).name === it.name);
    lines.push(equipped ? `Equipped (${equipped[0]})` : `Carried ×${s.inventory[it.id] || 1}`);
    return lines.join('\n');
}

function quests(state, content, arg) {
    const list = Object.values(state.quests).filter(q => questVisible(state, q));
    if (arg) {
        const q = list.find((x) => normText(x.title).includes(normText(arg)));
        if (!q) return `[SYSTEM // QUEST]\nNo known Quest "${arg}".`;
        return [`[SYSTEM // QUEST] ${q.title}`, `Status: ${q.status}${q.rank ? ` | Quest Rank: ${q.rank}` : ''}${q.giver ? ` | Issuer: ${playerLabel(state, q.giver)}` : ''}`, ...(q.task ? [`Task: ${q.task}`] : []), ...q.notes.map((n) => `- ${n}`),
            ...q.history.map((h) => `  ${formatClock(h.minute)}: ${h.status}`)].join('\n');
    }
    if (!list.length) return '[SYSTEM // QUESTS]\nNo Quests.';
    return ['[SYSTEM // QUESTS]', ...list.map((q) => `${q.title}${q.rank ? ` (${q.rank})` : ''} — ${q.status}${q.notes.length ? ` — ${q.notes.at(-1)}` : ''}`)].join('\n');
}

function pcEffects(state) {
    return state.encounter ? state.encounter.combatants.pc.current.effects : [];
}

function effects(state, content, arg) {
    const fx = pcEffects(state);
    const list = arg ? fx.filter((x) => normText(x.name).includes(normText(arg))) : fx;
    if (!list.length) return `[SYSTEM // EFFECTS]\n${arg ? `No active effect "${arg}".` : 'No active effects.'}`;
    return ['[SYSTEM // EFFECTS]', ...list.map((x) => `${x.name}: ${effectText(x)} | source ${x.source === 'pc' ? 'Alaric' : x.source} | until ${x.expires.replace(/_/g, ' ')}`)].join('\n');
}

function effectText(x) {
    if (x.kind === 'temp_def') return `DEF +${x.value}`;
    if (x.kind === 'temp_mdef') return `MDEF +${x.value}`;
    if (x.kind === 'barrier') return `Barrier ${x.hp} HP`;
    if (x.kind === 'incoming_damage_reduction') return `incoming damage -${x.pct}%`;
    if (x.kind === 'damage_reduction_next') return `next damage taken -${x.pct}%`;
    if (x.kind === 'next_attack_buff') return `next ${x.scope === 'ranged' ? 'ranged ' : ''}attack +${x.power_pct}% power`;
    return x.kind;
}

function combat(state) {
    const enc = state.encounter;
    if (!enc) return `[SYSTEM // COMBAT]\nCombat: INACTIVE${state.pending_combat?.length ? ` (PENDING: ${state.pending_combat.map((p) => playerLabel(state, p.by)).join(', ')} committed an attack; resolved on the next story message)` : ''}. A dangerous scene stays INACTIVE until a hostile commitment.`;
    const name = (id) => enc.combatants[id]?.label || playerLabel(state, id); // the target labels of the combat panel
    const phase = enc.round === 0 ? 'STARTING | Turn order fixed; Round 1 resolves with the next story message' : `ACTIVE | Round ${enc.round} | Current actor: ${name(enc.current)}`;
    const lines = [`[SYSTEM // COMBAT] ${enc.id} | ${phase}`, `Turn order: ${enc.order.map(name).join(' > ')}`];
    for (const c of Object.values(enc.combatants)) {
        const f = c.fixed;
        const cur = c.current;
        const st = cur.defeated ? 'DEFEATED' : cur.escaped ? 'ESCAPED' : cur.surrendered ? 'SURRENDERED' : 'active';
        if (c.model === 'character') {
            lines.push(`${c.name} (${c.side}) L${f.level} ${f.rank} ${f.class || ''} | STR ${f.stats.STR} VIT ${f.stats.VIT} AGI ${f.stats.AGI} INT ${f.stats.INT} PER ${f.stats.PER} WIL ${f.stats.WIL} | HP ${cur.hp}/${f.max_hp} MP ${cur.mp}/${f.max_mp} STA ${cur.sta}/${f.max_sta} | ATK ${f.atk} MATK ${f.matk} DEF ${f.def} MDEF ${f.mdef} | Init ${f.init} | ${cur.band || 'PC'}${cur.cover !== 'none' ? ` ${cur.cover} cover` : ''} | ${st}${f.defeat_xp !== undefined ? ` | DefeatXP ${f.defeat_xp}` : ''}`);
            lines.push(`   actions: ${Object.entries(f.actions).map(([id, v]) => `${id} P${v.prof}`).join(', ')}`);
        } else {
            lines.push(`${c.name} (${f.body_plan}) L${f.level} ${f.rank} ${f.type} | HP ${cur.hp}/${f.max_hp} | ATK ${f.atk} DEF ${f.def} MDEF ${f.mdef} Init ${f.init} | ${f.attack.name} (${f.attack.damage_type}, ${f.attack.range}) | ${cur.band}${cur.cover !== 'none' ? ` ${cur.cover} cover` : ''} | ${st} | DefeatXP ${f.defeat_xp}`);
        }
        if (cur.effects.length) lines.push(`   effects: ${cur.effects.map((x) => `${x.name} (${effectText(x)})`).join(', ')}`);
    }
    lines.push(`Defeated: ${joinList(enc.defeated.map(name))} | Escaped: ${joinList(enc.escaped.map(name))} | Pending Combat XP: ${enc.pending_xp}`);
    return lines.join('\n');
}

function npc(state, content, arg) {
    const t = normText(arg);
    const e = Object.values(state.entities).find((x) => x.id !== 'pc' && x.kind !== 'location' && [x.name, ...(x.descriptors || [])].filter(Boolean).some((n) => normText(n) === t || normText(n).includes(t)));
    if (!e) return `[SYSTEM // NPC]\nAlaric knows nobody called "${arg}".`;
    const rows = knowledgeOf(state, 'pc', [e.id]).map((r) => `- ${propText(state, r, content)}${r.stance !== 'knows' ? ` (${r.stance})` : ''}${r.outdated ? ' (outdated)' : ''}`);
    const mems = memoriesOf(state, 'pc').filter((m) => (m.who || []).includes(e.id) || (m.witnesses || []).includes(e.id)).slice(-5)
        .map((m) => `- [${formatClock(m.minute).split(' (')[0]}] ${memoryText(state, m, 'pc')}`);
    const st = statusOf(state, e.id);
    // only as much of a name as the story has said (delta.js known_name)
    return [`[SYSTEM // NPC] ${playerLabel(state, e.id)}`, `Known as: ${[e.known_name ?? e.name, ...(e.descriptors || [])].filter(Boolean).join(', ')}${st === 'dead' ? ' | DEAD' : ''}${state.scene.present.includes(e.id) ? ' | present' : ''}`,
        rows.length ? `Alaric knows:\n${rows.join('\n')}` : 'Alaric knows nothing beyond what he has seen.', mems.length ? `Shared moments:\n${mems.join('\n')}` : ''].filter(Boolean).join('\n');
}

function log(state, content, arg) {
    const n = Math.min(30, Math.max(1, parseInt(arg, 10) || 8));
    const mems = memoriesOf(state, 'pc').slice(-n);
    if (!mems.length) return '[SYSTEM // LOG]\nNothing recorded yet.';
    return ['[SYSTEM // LOG]', ...mems.map((m) => `[${formatClock(m.minute).split(' (')[0]}] ${memoryText(state, m, 'pc')}`)].join('\n');
}

function audit(state, content) {
    const o = state.last.outcome;
    const lines = ['[SYSTEM // AUDIT] last resolved turn'];
    const name = (id) => o?.board?.labels?.[id] || playerLabel(state, id);
    if (o?.records) for (const r of o.records) for (const s of r.strikes || []) lines.push(`${name(r.actor)} ${r.skill_name || ''} -> ${name(s.target)}: ${s.hit ? `hit ${s.hit.chance}% d100 ${s.hit.roll} | ` : ''}${s.crit?.ambush ? 'AMBUSH CRIT | ' : ''}${s.steps ? s.steps.join(' → ') : `${s.final} damage`}`);
    if (o?.check) lines.push(`${o.check.label}: ${o.check.chance ?? '-'}% d100 ${o.check.roll ?? '-'} ${o.check.success ? 'SUCCESS' : 'FAILURE'}`);
    if (o?.check_die) lines.push(`Check die issued: d100 ${o.check_die}${state.last.check ? ` (used for "${state.last.check.what}": ${state.last.check.chance}% -> ${state.last.check.success ? 'SUCCESS' : 'FAILURE'})` : ' (unused)'}`);
    // V4's rejected deltas are saved after the reply: show rule and reason only on explicit audit.
    for (const r of state.last.rejected) lines.push(`Rejected world report [${r.rule || 'rule'}]: ${r.reason || 'not accepted'}`);
    if (state.last.extract_error) lines.push(`World report FAILED: ${state.last.extract_error} (world state not updated from the reply)`);
    for (const r of state.last.overreach || []) lines.push(`Narrator overreach [${r.kind}]: ${r.what} (not applied)`);
    if (lines.length === 1) lines.push('No rolls or recorded world-report problems in the last turn. This is normal.');
    lines.push(`RNG: seed ${state.rng.seed} | draws ${state.rng.n} | Engine ${ENGINE_VERSION}`);
    return lines.join('\n');
}

/** Patch 7: the dungeon he is in (or was in last), as far as he knows it (src/v4/dungeon.js). */
function dungeonMap(state) {
    const d = dungeonOf(state, state.scene.at) || [...(state.scene.history || [])].reverse().map((id) => dungeonOf(state, id)).find(Boolean);
    return d ? `[SYSTEM // MAP]\n${mapText(state, d)}` : '[SYSTEM // MAP]\nNo dungeon explored yet: #map shows the rooms and ways of one he is in.';
}

/**
 * Patch 2: the journal. Alaric's goals, the places he knows only by report, the threads that matter now, and the older
 * or settled ones: everything he can know, nothing an NPC keeps to themselves. Read-only.
 */
function journal(state, content) {
    const L = ['[SYSTEM // JOURNAL]'];
    const day = (m) => formatClock(m ?? 0).split(' (')[0];
    const goals = Object.values(state.intents || {});
    L.push('GOALS:');
    if (!goals.length) L.push('  none');
    for (const st of ['active', 'paused', 'done', 'dropped']) {
        for (const i of goals.filter((x) => x.status === st)) L.push(`  [${st}] ${i.goal}${i.place && state.places?.[i.place] ? ` → ${state.places[i.place].name}` : ''} (since ${day(i.since?.minute)})`);
    }
    const known = Object.values(state.places || {}).filter((p) => p.known === 'reported' || p.known === 'false');
    if (known.length) {
        L.push('PLACES KNOWN BY REPORT:');
        for (const p of known) L.push(`  ${p.name} — ${knownNote(state, p, (id) => playerLabel(state, id))}`);
    }
    const all = Object.values(state.threads || {});
    const current = currentThreads(state);
    L.push('OPEN THREADS:');
    if (!current.length) L.push('  none');
    for (const t of current) L.push(`  (${t.kind}) ${t.text}${threadHere(state, t) ? ' [here]' : ''}`);
    const faded = all.filter((t) => t.status === 'open' && !current.includes(t));
    if (faded.length) {
        L.push('NO LONGER CURRENT (signs and dangers of places he has left):');
        for (const t of faded.slice(-10)) L.push(`  (${t.kind}) ${t.text} — ${day(t.updated?.minute)}`);
    }
    const settled = all.filter((t) => t.status === 'resolved');
    if (settled.length) {
        L.push('SETTLED:');
        for (const t of settled.slice(-10)) L.push(`  (${t.kind}) ${t.text} — ${t.resolution || 'resolved'}`);
    }
    return L.join('\n');
}

/**
 * Run a '#' command line.
 * @returns {{panels: string[], events: object[], llm: null | {kind: 'system', question: string}}}
 */
export function runCommands(state, content, text) {
    const panels = [];
    const events = [];
    let llm = null;
    let s = state;
    for (const { name, arg } of splitCommands(text)) {
        switch (name) {
            case 'status': case 'stats': panels.push(status(s, content)); break;
            case 'skills': panels.push(skills(s, content)); break;
            case 'skill': panels.push(arg ? skill(s, content, arg) : skills(s, content)); break;
            case 'class': panels.push(klass(s, content)); break;
            case 'passives': panels.push(['[SYSTEM // PASSIVES]', ...(rulesetOf(s) >= 2 ? passiveLines(s, content) : ['No dynamic Passives under these rules.'])].join('\n')); break;
            case 'feats': panels.push(featLines(state, content).join('\n')); break;
            case 'domain': panels.push('[SYSTEM // DOMAIN]\nSTATUS: NOT YET UNLOCKED'); break;
            case 'equipment': panels.push(equipment(s, content)); break;
            case 'bag': case 'inventory': panels.push(bag(s, content)); break;
            case 'item': panels.push(arg ? item(s, content, arg) : bag(s, content)); break;
            case 'quests': panels.push(quests(s, content, '')); break;
            case 'quest': panels.push(quests(s, content, arg)); break;
            case 'effects': case 'effect': panels.push(effects(s, content, name === 'effect' ? arg : '')); break;
            case 'combat': panels.push(combat(s)); break;
            case 'npc': panels.push(arg ? npc(s, content, arg) : '[SYSTEM // NPC]\nUsage: #npc <name>'); break;
            case 'log': panels.push(log(s, content, arg)); break;
            case 'journal': panels.push(journal(s, content)); break;
            case 'map': panels.push(dungeonMap(s)); break;
            case 'audit': panels.push(audit(s, content)); break;
            case 'help': panels.push(['[SYSTEM // HELP]', ...HELP.map(([c, d]) => `${c.padEnd(20)} — ${d}`)].join('\n')); break;
            case 'system': llm = { kind: 'system', question: arg }; break;
            case 'assign': {
                // "#assign INT 3" or "#assign INT 3 WIL 1 AGI 1": the whole command is checked first and applied whole
                // or not at all (no partial assignment); a stat named twice is refused, not added up
                const parsed = parseAssign(arg, content);
                const free = pcSheet(s).free_points;
                const total = parsed.pairs.reduce((a, p) => a + p.amount, 0);
                const error = parsed.error || (total > free ? `${total} points asked, only ${free} free Stat Point${free === 1 ? '' : 's'} available` : null);
                if (error) {
                    panels.push(`[SYSTEM // ASSIGN]\nNOT APPLIED — ${error}. Nothing was assigned.\nUsage: #assign <STAT> <n> [<STAT> <n> …] (e.g. #assign INT 3 WIL 1 AGI 1); stats: ${content.rules.stats.join(', ')}\nFree Stat Points: ${free}`);
                    break;
                }
                const lines = ['[SYSTEM // ASSIGN]'];
                if (s === state) s = clone(state);
                for (const { stat, amount } of parsed.pairs) {
                    const r = assignStat(pcSheet(s), stat, amount, content);
                    if (r.errors) throw new Error(`#assign: ${r.errors.join(' ')}`); // checked above
                    for (const e of r.events) { applyEvent(s, e); events.push(e); }
                    lines.push(`${stat} +${amount} -> ${pcSheet(s).stats[stat]}`);
                }
                lines.push(`Free Stat Points left: ${pcSheet(s).free_points} (current HP/MP/STA are not refilled)`);
                panels.push(lines.join('\n'));
                break;
            }
            default: panels.push(`[SYSTEM]\nUnknown command #${name}. Use #help.`);
        }
    }
    return { panels, events, llm };
}

// Patch 8.4.1 (live 22.10.2026 05:43, turn 19: "I put two of the five free points into WIL, two into INT, and the last
// one into VIT"): words that spend free Stat Points. Only #assign spends them (an explicitly state-changing command,
// System #1); words are no command. The planner booked them as "other", the narrator was told to tell them as they
// happen, and a better Alaric was told while his five points stayed free.
const SPEND = /\b(?:put|puts|putting|assign|assigns|assigning|spend|spends|spending|invest|invests|investing|allocate|allocates|allocating|distribute|distributes|distributing|add|adds|adding|place|places|placing|pour|pours|pouring|raise|raises|raising|increase|increases|increasing)\b/i;
const POINTS = /\b(?:free|stat|attribute|ability)\s+points?\b|\bpoints?\s+(?:into|in|to|on)\b/i;
const STAT_NAMES = ['strength', 'vitality', 'agility', 'intelligence', 'perception', 'willpower'];
/** Do these words spend free Stat Points ("two points into WIL", "assign my stat points")? */
export function spendsStatPoints(text, content) {
    const t = String(text || '');
    if (!SPEND.test(t)) return false;
    const stats = [...(content?.rules?.stats || []), ...STAT_NAMES].join('|');
    const pair = new RegExp(`\\b(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|the last one|the rest)\\b[^.;!?]{0,30}?\\b(?:into|in|to|on)\\s+(?:my\\s+)?(?:${stats})\\b`, 'i');
    return POINTS.test(t) || pair.test(t);
}
/** What the player is told when words spend Stat Points (the engine's refusal reason, the planner's note). */
export function assignHint(free) {
    return `Stat Points are spent only with the command #assign <STAT> <n>, e.g. #assign WIL 2 INT 2 VIT 1; Free Stat Points: ${free}`;
}

/**
 * The STAT/number pairs of #assign, in their order: "INT 3 WIL 1", "INT +3", "INT 3, WIL 1". Any token that is not part
 * of a valid pair makes the whole command invalid.
 * @returns {{pairs: {stat: string, amount: number}[], error: string|null}}
 */
export function parseAssign(arg, content) {
    const tokens = String(arg ?? '').replace(/,/g, ' ').replace(/\+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const pairs = [];
    if (!tokens.length) return { pairs, error: 'no stat given' };
    if (tokens.length % 2) return { pairs, error: `"${tokens.join(' ')}" is not a list of <STAT> <n> pairs` };
    for (let i = 0; i < tokens.length; i += 2) {
        const stat = tokens[i].toUpperCase();
        const n = tokens[i + 1];
        if (!content.rules.stats.includes(stat)) return { pairs, error: `unknown stat "${tokens[i]}"` };
        if (!/^\d+$/.test(n) || Number(n) <= 0) return { pairs, error: `${stat}: "${n}" is not a positive whole number` };
        if (pairs.some((p) => p.stat === stat)) return { pairs, error: `${stat} is named twice (name each stat once)` };
        pairs.push({ stat, amount: Number(n) });
    }
    return { pairs, error: null };
}
