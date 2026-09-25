// System commands (System #1-#10) answered by the engine from state + content: zero LLM calls, zero story time,
// no combat Turn advance. Only #assign changes state (an explicitly defined state-changing command, System #1).
// #system <question> is the one natural-language query; it is passed to the narrator in System-only mode.
import { deriveCharacter, rawPowerText, itemOf } from './derived.js';
import { formatCoin } from './economy.js';
import { findSkill } from './content.js';
import { assignStat } from './progression.js';
import { knowledgeOf, memoriesOf, memoryText, propText, playerLabel, statusOf } from './knowledge.js';
import { applyEvent } from './state.js';
import { skillSummary } from './context.js';
import { clone, itemLabel, joinList, normText, formatClock, roundHalfUp } from './util.js';

const HELP = [
    ['#status', 'full current status (alias #stats)'], ['#skills', 'all known Skills'], ['#skill <name>', 'full Skill definition with current values'],
    ['#class', 'Base Class, growth, next milestone'], ['#domain', 'Domain state'], ['#equipment', 'equipped Gear and totals'],
    ['#bag', 'inventory and coin (alias #inventory)'], ['#item <name>', 'Item definition'], ['#quests', 'known Quests'],
    ['#quest <name>', 'Quest details'], ['#effects', 'active effects'], ['#effect <name>', 'effect details'],
    ['#combat', 'encounter audit (read-only)'], ['#system <question>', 'mechanics question answered by the System'],
    ['#assign <STAT> <n>', 'spend free Stat Points (state-changing)'], ['#npc <name>', 'what Alaric knows about someone'],
    ['#log [n]', "Alaric's recent memories"], ['#audit', 'rolls, rejected reports and corrections of the last turn'], ['#help', 'this list'],
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

function skillCost(skill, prof, content) {
    if (!skill.cost) return 'none';
    const mult = content.rules.proficiency.levels[String(prof || 1)].cost;
    return `${roundHalfUp(skill.cost.amount * mult)} ${skill.cost.resource.toUpperCase()}${mult !== 1 ? ` (base ${skill.cost.amount})` : ''}`;
}

function status(state, content) {
    const e = state.entities.pc;
    const s = e.sheet;
    const dv = deriveCharacter(s, content);
    const cls = s.class ? content.classes.get(s.class).name : 'none (Character Creation)';
    const fx = pcEffects(state);
    return [
        '[SYSTEM // STATUS]',
        `${e.name} | ${e.race || 'Human'} | Level ${s.level} | XP ${s.xp}/${s.level * content.rules.progression.xp_to_next_per_level} | Power Rank ${dv.rank} | Class: ${cls}`,
        `HP ${s.hp}/${dv.maxHp} | MP ${s.mp}/${dv.maxMp} | STA ${s.sta}/${dv.maxSta}`,
        `STR ${s.stats.STR} | VIT ${s.stats.VIT} | AGI ${s.stats.AGI} | INT ${s.stats.INT} | PER ${s.stats.PER} | WIL ${s.stats.WIL} | Free Stat Points ${s.free_points}`,
        `ATK ${dv.atk} | MATK ${dv.matk} | DEF ${dv.def} (base ${dv.baseDef}) | MDEF ${dv.mdef} (base ${dv.baseMdef}) | Initiative ${dv.init} (floor(1.5 × AGI))`,
        `Active Effects: ${fx.length ? fx.map((x) => x.name).join(', ') : 'none'} | Domain: NOT YET UNLOCKED`,
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
        ...[...content.classes.values()].map((c) => `- ${c.name} — Favored Stats ${c.favored.join(' / ')}`),
    ];
    const poolMenu = () => {
        const pool = cls.skill_pool.map((id) => content.skills.get(id));
        return [
            `Choose exactly ${content.start.creation.choose_skills} Skills from the ${cls.name} Base Pool (for example "${pool[0].name} + ${pool[1].name}"):`,
            ...pool.map((sk) => `- ${skillSummary(sk)}`),
            `Starter Gear, equipped when Step 2 is complete: ${content.kits[cls.id].map((id) => gearText(content.items.get(id))).join(', ')}.`,
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
        const sk = content.skills.get(id);
        if (!sk) { lines.push(`${id} | UNKNOWN DEFINITION`); continue; }
        const next = content.rules.proficiency.promotion_progress[String(v.prof)];
        lines.push(`${sk.name} | ${sk.category} | Rank ${sk.rank || '-'} | Complexity ${sk.complexity || '-'} | P${v.prof} (PP ${v.pp}${next ? `/${next}` : ''}) | Tags ${joinList(sk.tags, '-')} | Cost ${skillCost(sk, v.prof, content)}`);
    }
    if (lines.length === 1) lines.push('No Skills known yet.');
    lines.push('Use #skill <Skill Name> for full details.');
    return lines.join('\n');
}

function skill(state, content, arg) {
    const s = pcSheet(state);
    const sk = findSkill(content, arg, s.class);
    if (!sk) return `[SYSTEM // SKILL]\nUNKNOWN SKILL "${arg}".`;
    const known = s.skills[sk.id];
    if (!known) return `[SYSTEM // SKILL]\n${sk.name} is not a Skill Alaric knows.`;
    const dv = deriveCharacter(s, content);
    const prof = content.rules.proficiency.levels[String(known.prof)];
    const lines = [`[SYSTEM // SKILL] ${sk.name}`, `Category ${sk.category} | Rank ${sk.rank || '-'} | Complexity ${sk.complexity || '-'} | Proficiency P${known.prof} (PP ${known.pp}) | Tags ${joinList(sk.tags, '-')}`];
    lines.push(`Cost: ${skillCost(sk, known.prof, content)}${sk.ammo ? ` | Ammo: ${sk.ammo.qty} ${content.items.get(sk.ammo.item)?.name || sk.ammo.item} when fired from a bow` : ''}`);
    if (sk.range) lines.push(`Range: ${sk.range.band}${sk.range.extra_band ? ' (EXTRA-BAND movement: may move one additional band and must end ENGAGED)' : ''}${sk.range.area ? ` | Area: ${sk.range.area}` : ''}`);
    if (sk.attack) {
        lines.push(`Base Power ${sk.attack.base} | Scaling ${sk.attack.scaling.map((t) => `${t.stat} ×${t.text ?? t.coef}`).join(' + ')} | Uses ${sk.attack.share === 1 ? '' : `${sk.attack.share * 100}% of `}${sk.attack.uses} | ${sk.attack.damage_type}`);
        lines.push(`A legal attack always lands (no Hit or Crit roll; only a true Ambush Opening Action crits ×${content.rules.crit.multiplier})${sk.attack.ignores_partial_cover ? ' | ignores Partial Cover' : ''}${sk.strikes > 1 ? ` | ${sk.strikes} strikes (separate damage each)` : ''}`);
        lines.push(`Current Raw Power: ${rawPowerText(sk, s.stats, dv)}${prof.power !== 1 ? ` (×${prof.power} Proficiency on Modified Power)` : ''}`);
    }
    if (sk.effect_text && !/^none\.?$/i.test(sk.effect_text)) lines.push(`Effect: ${sk.effect_text}`);
    return lines.join('\n');
}

function klass(state, content) {
    const s = pcSheet(state);
    if (!s.class) return '[SYSTEM // CLASS]\nNo Base Class selected yet (Character Creation).';
    const c = content.classes.get(s.class);
    const next = [15, 30, 45, 60, 75, 90].find((l) => l > s.level);
    return ['[SYSTEM // CLASS]', `Base Class: ${c.name} | Rank ${deriveCharacter(s, content).rank} | Favored Stats: ${c.favored.join(' / ')}`,
        `Class Growth: ${c.growth_text}`, 'Evolution history: none', `Next known evolution milestone: Level ${next ?? '-'}`].join('\n');
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
        lines.push(`${itemLabel(state, content, id)}${it?.rank ? ` [${it.rank}]` : ''} ×${q}${id === 'standard_arrow' && s.equipment.quiver ? ' (in quiver)' : ''}`);
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
    const list = Object.values(state.quests);
    if (arg) {
        const q = list.find((x) => normText(x.title).includes(normText(arg)));
        if (!q) return `[SYSTEM // QUEST]\nNo known Quest "${arg}".`;
        return [`[SYSTEM // QUEST] ${q.title}`, `Status: ${q.status}${q.rank ? ` | Quest Rank: ${q.rank}` : ''}${q.giver ? ` | Issuer: ${playerLabel(state, q.giver)}` : ''}`, ...q.notes.map((n) => `- ${n}`),
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
    for (const r of state.last.rejected) lines.push(`Rejected report item: ${r.reason}`);
    if (lines.length === 1) lines.push('No rolls or rejections recorded for the last turn.');
    lines.push(`RNG: seed ${state.rng.seed} | draws ${state.rng.n}`);
    return lines.join('\n');
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
            case 'audit': panels.push(audit(s, content)); break;
            case 'help': panels.push(['[SYSTEM // HELP]', ...HELP.map(([c, d]) => `${c.padEnd(20)} — ${d}`)].join('\n')); break;
            case 'system': llm = { kind: 'system', question: arg }; break;
            case 'assign': {
                const pairs = [...arg.matchAll(/\b(STR|VIT|AGI|INT|PER|WIL)\b\s*\+?\s*(\d+)/gi)];
                if (!pairs.length) { panels.push('[SYSTEM // ASSIGN]\nUsage: #assign <STAT> <n> (e.g. #assign PER 3 AGI 2)'); break; }
                const lines = ['[SYSTEM // ASSIGN]'];
                if (s === state) s = clone(state);
                for (const [, stat, n] of pairs) {
                    const r = assignStat(pcSheet(s), stat.toUpperCase(), parseInt(n, 10), content);
                    if (r.errors) { lines.push(`${stat.toUpperCase()} +${n}: REJECTED — ${r.errors.join(' ')}`); continue; }
                    for (const e of r.events) { applyEvent(s, e); events.push(e); }
                    lines.push(`${stat.toUpperCase()} +${n} -> ${pcSheet(s).stats[stat.toUpperCase()]}`);
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
