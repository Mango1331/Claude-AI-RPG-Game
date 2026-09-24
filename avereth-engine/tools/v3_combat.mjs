// Combat V3 content migration (docs/REVIEW_V3.md, section 3): applied on top of the v1.24 migration
// (tools/migrate_content.py), so the v1.24 baseline stays reproducible and every V3 deviation is listed here.
//
//   * no generic Hit roll: legal attacks connect (rules.hit, Skill hit_mod, monster Hit, Proficiency hit_pp removed);
//   * no random Crit: only a true Ambush Opening Action crits (guaranteed ×1.5, every strike, PC and monsters alike);
//   * PER out of combat math: Initiative = floor(1.5 × AGI); the Ranger's PER scaling moves onto AGI;
//   * Partial Cover = -25% damage for that attack (Aimed Shot / Precision Thrust ignore it); Full Cover stays illegal;
//   * defensive Hit penalties become incoming-damage reductions of the same strength (20pp -> 25%, 15pp -> 20%);
//   * prepared attacks (Focus Aim, Feint): +20pp Hit and +10% Power -> +35% Power (the same expected value);
//   * Proficiency P3-P5: +5pp Hit -> Modified Power ×1.05 / ×1.15 / ×1.20.
// Monster ATK, HP and damage variance are unchanged (decided after Test 5).
//
// Idempotent: run `node tools/v3_combat.mjs` from avereth-engine/; a second run changes nothing.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = (name) => path.join(ROOT, 'content', name);
const load = (name) => JSON.parse(readFileSync(file(name), 'utf8'));
const save = (name, data) => writeFileSync(file(name), `${JSON.stringify(data, null, 2)}\n`);

/** Replace one exact line/fragment; it must be there (or its replacement already is): drift must be loud. */
function swap(text, from, to, where) {
    if (text.includes(from)) return text.replace(from, to);
    if (!to || text.includes(to)) return text; // already applied (a removal leaves nothing to find)
    throw new Error(`${where}: "${from.slice(0, 60)}" not found`);
}

// ------------------------------------------------------------------------------------------------ rules.json
const rules = load('rules.json');
delete rules.hit;
rules.cover = { src: 'Core #12 (V3)', full: 'illegal', partial_damage_reduction_pct: 25 };
rules.crit = { src: 'Core #11, #24 (V3)', multiplier: 1.5, only: 'true_ambush_opening_action' };
rules.derived.init = { agi_factor: 1.5, floor: true };
for (const [lvl, power] of Object.entries({ 1: 1, 2: 1, 3: 1.05, 4: 1.15, 5: 1.2 })) {
    delete rules.proficiency.levels[lvl].hit_pp;
    rules.proficiency.levels[lvl].power = power;
}
save('rules.json', rules);

// ------------------------------------------------------------------------------------------------ classes.json
const classes = load('classes.json');
const PER_TO_AGI = new Set(['ranger.basic_attack', 'ranger.aimed_shot', 'ranger.power_shot', 'ranger.quick_shot', 'ranger.twin_shot']);
const IGNORES_COVER = new Set(['ranger.aimed_shot', 'duelist.precision_thrust']);
const REDUCTION = { 20: 25, 15: 20 }; // incoming Hit penalty (pp) -> incoming damage reduction (%)
const coefText = (c) => (Number.isInteger(c * 4) ? c.toFixed(2) : String(c));
for (const s of classes.skills) {
    let src = s.source_text;
    if (s.attack) {
        if ('hit_mod' in s.attack) {
            src = src.replace(/\nHit Modifier: [^\n]*/, '');
            delete s.attack.hit_mod;
        }
        if (PER_TO_AGI.has(s.id) && s.attack.scaling.some((t) => t.stat === 'PER')) {
            const coef = s.attack.scaling.reduce((a, t) => a + t.coef, 0);
            const old = `Scaling: ${s.attack.scaling.map((t) => `${t.stat} × ${t.text}`).join(' + ')}`;
            s.attack.scaling = [{ stat: 'AGI', coef, text: coefText(coef) }];
            src = swap(src, old, `Scaling: AGI × ${coefText(coef)}`, s.id);
        }
        // multi-hit: every strike connects; damage (variance, DEF) per strike; an Ambush Opening Action crits them all
        const MULTI = 'Each strike performs its own hit and critical check.';
        const MULTI_V3 = 'Each strike connects and resolves its own damage; in a true Ambush Opening Action every strike crits.';
        if (s.effect_text?.includes(MULTI)) s.effect_text = s.effect_text.replace(MULTI, MULTI_V3);
        if (src.includes(MULTI)) src = src.replace(MULTI, MULTI_V3);
        if (IGNORES_COVER.has(s.id) && !s.attack.ignores_partial_cover) {
            s.attack.ignores_partial_cover = true;
            s.effect_text = 'ignores Partial Cover.';
            src = swap(src, 'Effect: none.', 'Effect: ignores Partial Cover.', s.id);
        }
    }
    for (const e of s.effects) {
        if (e.kind === 'incoming_hit_penalty') {
            const pct = REDUCTION[e.pp];
            if (!pct) throw new Error(`${s.id}: no reduction for ${e.pp}pp`);
            const oldText = `incoming attacks suffer -${e.pp} percentage points Hit Chance`;
            const newText = `incoming damage is reduced by ${pct}%`;
            e.kind = 'incoming_damage_reduction';
            e.pct = pct;
            delete e.pp;
            s.effect_text = swap(s.effect_text, oldText, newText, s.id);
            src = swap(src, oldText, newText, s.id);
        }
        if (e.kind === 'next_attack_buff' && 'hit_pp' in e) {
            const oldText = `gains +${e.hit_pp} percentage points Hit Chance and +${e.power_pct}% Modified Power`;
            delete e.hit_pp;
            e.power_pct = 35;
            s.effect_text = swap(s.effect_text, oldText, 'gains +35% Modified Power', s.id);
            src = swap(src, oldText, 'gains +35% Modified Power', s.id);
        }
    }
    s.source_text = src;
}
save('classes.json', classes);

// ------------------------------------------------------------------------------------------------ monsters.json
const monsters = load('monsters.json');
for (const a of monsters.anchors) {
    if ('hit' in a) {
        const cols = a.source_line.split(' | ')[0].split(' / ');
        if (cols.length === 6) a.source_line = [[...cols.slice(0, 4), cols[5]].join(' / '), ...a.source_line.split(' | ').slice(1)].join(' | ');
        monsters.fauna_text = monsters.fauna_text.replace(`${cols.join(' / ')} |`, `${[...cols.slice(0, 4), cols[5]].join(' / ')} |`);
        delete a.hit;
    }
}
monsters.fauna_text = monsters.fauna_text
    .replace('Level | Rank | HP | ATK | DEF | MDEF | Hit | Initiative | Attack Type | Attack Range Band.', 'Level | Rank | HP | ATK | DEF | MDEF | Initiative | Attack Type | Attack Range Band.')
    .replace('- Base Hit Chance = Hit\n', '- a legal attack connects (no Hit roll)\n')
    .replace('Format: HP / ATK / DEF / MDEF / Hit / Init | default natural attack', 'Format: HP / ATK / DEF / MDEF / Init | default natural attack')
    .replace('Hit = min(95, Hit1 + 2×floor(g/15))\n', '')
    .replace('- Hit ±5 percentage points;\n', '');
delete monsters.scaling.hit;
monsters.scaling.text = monsters.scaling.text.replace('Hit = min(95, Hit1 + 2×floor(g/15))\n', '');
for (const k of ['elite', 'boss', 'variation']) delete monsters[k].hit_pp;
monsters.elite_boss_text = monsters.elite_boss_text.replace('DEF/MDEF ×1.10; Hit +5pp; Init +2.', 'DEF/MDEF ×1.10; Init +2.').replace('DEF/MDEF ×1.20; Hit +5pp; Init +3.', 'DEF/MDEF ×1.20; Init +3.');
save('monsters.json', monsters);

// ------------------------------------------------------------------------------------------------ rules_text.json
const rt = load('rules_text.json');
const entry = (id) => rt.entries.find((e) => e.id === id);
const edit = (id, pairs) => {
    const e = entry(id);
    for (const [from, to] of pairs) e.text = swap(e.text, from, to, id);
};

edit('core.2', [
    ['PER = accuracy/precision/crit/detection.', 'PER = perception: tracking, search, detection, reading behaviour and danger (checks, not combat math).'],
    ['Initiative = AGI + floor(PER/2)', 'Initiative = floor(1.5 × AGI)'],
    ['Character Crit = 5% + PER/10 percentage points, only for profiles that use Crit.\n', ''],
    ['There is no passive Evasion score. AGI does not automatically reduce incoming Hit Chance.', 'There is no passive Evasion score and no Hit Chance: a legal attack connects (Core #10).'],
]);
edit('core.5', [
    ['Power/scaling, ATK/MATK use, Cost, Range, Hit modifier and explicit Effects.', 'Power/scaling, ATK/MATK use, Cost, Range and explicit Effects (no Hit modifier: legal attacks connect).'],
    ['P3: Cost ×0.95; attacks +5pp Hit; non-hit primary numeric effect ×1.05 when meaningful.', 'P3: Cost ×0.95; damaging Modified Power ×1.05; other primary numeric effect ×1.05 when meaningful.'],
    ['P4: Cost ×0.925; damaging Modified Power ×1.10; attacks retain +5pp Hit; comparable non-damage effect ×1.10.', 'P4: Cost ×0.925; damaging Modified Power ×1.15; comparable non-damage effect ×1.10.'],
    ['P5: Cost ×0.90; damaging Modified Power ×1.15; attacks retain +5pp Hit; comparable non-damage effect ×1.15;', 'P5: Cost ×0.90; damaging Modified Power ×1.20; comparable non-damage effect ×1.15;'],
]);
edit('core.9', [
    ['Standard checks, hit checks, and critical checks use d100 unless a specific mechanic says otherwise.', 'Standard checks use d100 unless a specific mechanic says otherwise. Attacks roll no Hit and no Crit (Core #10, #11).'],
]);
entry('core.10').title = '[COMBAT] Attack Legality and Connection (no Hit Chance)';
entry('core.10').text = [
    'ATTACKS CONNECT',
    'There is no generic Hit Chance and no Hit roll. A legal attack connects and deals damage (Core #11).',
    'PER, AGI, Level, Skill choice and situational advantage never add or subtract a Hit percentage.',
    '',
    'LEGALITY (checked before any cost, ammunition or roll)',
    'An attack fails, costs nothing and rolls nothing when it is not legal:',
    '- no valid target (not in the fight, dead, escaped, surrendered, or not the one named);',
    '- out of range after the one legal band movement (Core #12);',
    '- no line of sight: Full Cover blocks direct attacks;',
    '- missing resources or ammunition;',
    '- an explicit mechanic that makes the target untargetable, or an explicit dodge/parry effect that says it stops the attack.',
    '',
    'PARTIAL COVER',
    'Line of sight exists; the covered target takes -25% damage from that attack (a Final Damage reduction, Core #11 step 11).',
    'Aimed Shot and Precision Thrust ignore Partial Cover.',
    '',
    'DEFENSIVE EFFECTS',
    'Defensive Skills reduce incoming damage by their written percentage until their written expiry (e.g. Deflect -25%, Quickstep -20%).',
    '',
    'NO REPLACEMENT ACCURACY SYSTEM',
    'Do not invent misses, grazes, glancing blows or hidden accuracy modifiers. Narration shows every resolved attack landing as resolved.',
].join('\n');
edit('core.11', [
    ['10. Critical Damage, default ×1.50, only if the profile/attack uses Crit.', '10. Critical Damage ×1.50, only for the attacks of a true Ambush Opening Action (Core #24).'],
    ['11. Explicit Final Damage modifiers/reductions.', '11. Explicit Final Damage modifiers/reductions (Partial Cover -25%, defensive reductions, Endure).'],
    [
        'CRITICALS\nFor combatants using the Character Crit model:\nBase Crit Chance = 5% + (PER ÷10) percentage points. No cap on the PER-derived portion is defined; do not invent one.\nDefault Critical Damage = ×1.50.\n\nDIRECT-STAT MONSTER CRIT LOCK\nGeneric direct-stat Monsters have Crit:none by default.\nDo not roll Crit for them unless their fixed authored profile explicitly says they use Crit.',
        'CRITICALS\nThere is no Crit Chance and no Crit roll.\nA Critical Hit happens only in a true Ambush Opening Action (Core #24): every strike of that one action, against every target it hits, deals Critical Damage ×1.50. This applies to characters and Monsters alike.',
    ],
    ['12.25 Raw vs DEF2, variance1.08, Crit×1.5: (12.25-2)×1.08×1.5 = 16.605 -> 17.', '12.25 Raw vs DEF2, variance1.08, Ambush Crit×1.5: (12.25-2)×1.08×1.5 = 16.605 -> 17.'],
]);
edit('core.12', [
    [
        'Unless the Skill explicitly says otherwise:\n- each strike makes its own Hit roll,\n- each successful strike makes its own Crit roll,\n- each strike resolves defense/resistance separately.',
        'Unless the Skill explicitly says otherwise:\n- every strike connects (no Hit roll),\n- each strike resolves defense/resistance/variance separately,\n- in a true Ambush Opening Action every strike deals Critical Damage.',
    ],
    ['The Skill defines each strike\'s power, Hit modifier, targeting, and equipment contribution.', 'The Skill defines each strike\'s power, targeting, and equipment contribution.'],
    [
        'An AoE attack uses ONE shared Hit roll for the entire AoE unless the Skill explicitly says it automatically hits or resolves separately.\n\nIf the shared Hit roll succeeds, all valid targets in the AoE are hit.\nIf it fails, all valid targets in the AoE are missed.\n\nAfter a successful shared Hit roll, make ONE shared Crit roll for the AoE.\nIf it Crits, all targets successfully hit by that AoE take the Skill\'s normal Critical Damage.\nEven with shared Hit/Crit rolls, each target resolves its own DEF/MDEF, Resistance, Immunity, Final Damage modifiers, Barrier and HP separately.',
        'An AoE attack hits every valid target in its area (no Hit roll).\nIn a true Ambush Opening Action every target it hits takes Critical Damage.\nEach target resolves its own DEF/MDEF, Resistance, Immunity, variance, Final Damage modifiers, Barrier and HP separately.',
    ],
    ['- attacks against that target suffer -20 percentage points Hit Chance.', '- attacks against that target deal -25% damage (Aimed Shot and Precision Thrust ignore it).'],
    [
        'TACTICAL ADVANTAGE\nConcrete positioning may justify standardized Hit Chance modifiers.\n\nDefault attack Hit Chance modifiers:\nMinor advantage/disadvantage: ±10 percentage points.\nStrong advantage/disadvantage: ±20 percentage points.\nExtreme advantage/disadvantage: ±35 percentage points.\n\nPartial Cover has its specific -20 percentage-point Hit rule above.\nThese combat Hit modifiers are separate from percentage-based Actor/Opposition Score modifiers used by generic non-combat Checks.\n\n',
        'TACTICAL ADVANTAGE\nThere are no Hit Chance modifiers. Partial Cover has its specific -25% damage rule above.\n\n',
    ],
    [
        'AMBUSH EXCEPTION\nAmbush itself does NOT grant a direct tactical Damage multiplier.\nUse the dedicated Ambush rules:\n- one Opening Action on a successful true Ambush,\n- +25 percentage points Crit Chance for eligible attacks in that Opening Action,\n- then normal Initiative.\nDo not add an automatic Ambush Hit or Damage bonus.',
        'AMBUSH EXCEPTION\nAmbush grants no tactical Damage multiplier beyond its Critical Hit.\nUse the dedicated Ambush rules:\n- one Opening Action on a successful true Ambush,\n- every attack/strike of that Opening Action is a Critical Hit (×1.50),\n- then normal Initiative.',
    ],
]);
edit('core.24', [
    ['Core-stat combatant: Initiative = AGI + floor(PER/2).', 'Core-stat combatant: Initiative = floor(1.5 × AGI).'],
    ['Tie: higher PER when both profiles possess PER; otherwise resolve the tie once without bias and lock it.', 'Tie: resolve the tie once without bias and lock it.'],
    ['Eligible attack in that Opening Action gains +25 percentage points Crit Chance.', 'Every attack/strike of that Opening Action is a guaranteed Critical Hit (×1.50), for Alaric and for Monsters/NPCs alike.'],
    ['Ambush grants no universal Hit or Damage bonus beyond explicit rules.', 'A successful perception or stealth check can create the opportunity; it never creates the Ambush by itself.'],
]);
edit('core.26', [
    ['| Base/TOTAL DEF MDEF | Base Hit | Crit | Initiative |', '| Base/TOTAL DEF MDEF | Initiative |'],
    ['| MaxHP | ATK | DEF | MDEF | Hit | Initiative |', '| MaxHP | ATK | DEF | MDEF | Initiative |'],
    ['| Crit:none unless explicitly authored |', '|'],
    ['For generic direct-stat natural attack: Raw=ATK, Base Hit=Hit, maximum Range=profile Range Band, Crit:none, no MP/STA cost.', 'For generic direct-stat natural attack: Raw=ATK, maximum Range=profile Range Band, no MP/STA cost.'],
    ['(eligible attacks +25 percentage points Crit Chance; no Hit or Damage bonus; then normal Initiative)', '(every strike a Critical Hit ×1.50; then normal Initiative)'],
]);
edit('core.27', [
    ['Do not regenerate Level, MaxHP, ATK/DEF/MDEF/Hit/Init,', 'Do not regenerate Level, MaxHP, ATK/DEF/MDEF/Init,'],
    [
        '7. HIT\nCore-stat Base Hit = 70 + PER*0.50.\nDirect-stat Monster Base Hit = locked Hit.\nFinal Hit = Base Hit + explicit action/attacker modifiers - explicit avoidance/cover modifiers +/- established situational modifiers; clamp uncertain attacks 20%-95%.\nRoll one d100. <= Final Hit = hit.\nENGAGED/SHORT range, target size, low HP, charging or dramatic preference never auto-hit an active target.\n\n8. CRIT\nOnly on a hit and only if profile uses Crit.\nCharacter Crit = 5% + PER/10 percentage points unless explicit mechanics modify it.\nGeneric direct-stat Monster Crit:none.\nRoll one d100 once.',
        '7. CONNECT\nA legal attack connects. There is no Hit roll.\n\n8. CRIT\nOnly the strikes of a true Ambush Opening Action crit (×1.50). There is no Crit roll.',
    ],
    ['-> one variance 0.90-1.10 -> Crit x1.5 if eligible -> Final modifiers ->', '-> one variance 0.90-1.10 -> Ambush Crit x1.5 if eligible -> Final modifiers (Partial Cover -25%, defensive reductions) ->'],
    ['Separate strikes use separate Hit/Crit/damage when the action says so.', 'Separate strikes use separate damage/variance when the action says so.'],
    ['adjacent band movement/range; Hit; Crit; full-precision Raw;', 'adjacent band movement/range; Ambush Crit; full-precision Raw;'],
]);
edit('core.29', [
    ['- Hit/Crit/variance were generated once and never rerolled in audit;', '- variance was generated once and never rerolled in audit; no Hit or Crit roll was made;'],
    ['- no active target auto-missed/auto-hit because of prose, range closeness, low HP or dramatic preference;', '- no legal attack was narrated as a miss, and no illegal attack as a hit;'],
]);
edit('core.19', [
    ['- Hit Chance -15 percentage points\n', '- outgoing final damage -20%\n'],
    ['- the Domain owner gains +15 percentage points Hit Chance against that creature', '- the Domain owner deals +20% final damage to that creature'],
    ['is also subject to the ×0.65 Modified Power and -15 percentage-point Hit penalties where mechanically applicable.', 'is also subject to the ×0.65 Modified Power and -20% final damage penalties where mechanically applicable.'],
]);
edit('system.3', [['Initiative\nCrit Chance\n', 'Initiative\n']]);
edit('system.4', [['- Hit Modifier\n- Crit interaction\n', '- Partial Cover interaction\n']]);
edit('system.8', [
    ['- Base Hit, Crit when applicable, Initiative;', '- Initiative;'],
    ['with Cost, maximum Range Band, Hit modifier, Power/scaling and effects.', 'with Cost, maximum Range Band, Power/scaling and effects.'],
    ['- ATK/DEF/MDEF/Hit/Initiative;', '- ATK/DEF/MDEF/Initiative;'],
    ['Never invent Human Stats, MP/STA, Character Crit, Movement stat,', 'Never invent Human Stats, MP/STA, Movement stat,'],
]);
edit('system.9', [['→ Initiative = AGI + floor(PER / 2)', '→ Initiative = floor(1.5 × AGI)']]);
edit('system.14', [
    ['- Hit calculation: Base Hit + explicit modifiers = Final Hit; d100 roll; HIT/MISS;\n- Crit chance/modifiers; d100 roll; CRIT/NO CRIT when eligible;\n', '- legality (target, range, line of sight, resources);\n- Ambush Critical Hit if this is the Opening Action;\n'],
    ['- Crit multiplier/final modifiers if any;', '- Ambush Crit multiplier and final modifiers (Partial Cover, defensive reductions) if any;'],
]);
edit('content.6', [
    ['Accuracy, LONG range, extra Range-Band movement,', 'LONG range, ignoring Partial Cover, extra Range-Band movement,'],
    ['Do not simultaneously inflate Base Power, scaling, range, accuracy, area and control with no trade-off.', 'Do not simultaneously inflate Base Power, scaling, range, area and control with no trade-off. Never design Hit/Crit modifiers or PER damage scaling (Combat V3).'],
]);
save('rules_text.json', rt);
console.log('Combat V3 content migration applied.');
