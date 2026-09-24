// Content pack integrity: schemas, cross references, verbatim sources, and rule constants tied to their Core text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadContent, readJson, ROOT } from '../helpers.js';
import { validateSchema } from '../../src/validate.js';
import { REPORT_KEYS } from '../../src/delta.js';

const FILES = ['classes', 'monsters', 'npc_templates', 'gear', 'lore', 'rules_text', 'narrator', 'campaign_start', 'rules'];

test('every content file validates against its JSON Schema', async () => {
    for (const f of FILES) {
        const data = await readJson(`content/${f}.json`);
        const schema = await readJson(`schemas/${f}.schema.json`);
        assert.deepEqual(validateSchema(data, schema), [], `${f}.json`);
    }
});

test('schema validator rejects malformed content', async () => {
    const schema = await readJson('schemas/classes.schema.json');
    const bad = { classes: [{ id: 'X', name: '', favored: ['STR'], basic_attack: 'x', skill_pool: [], growth_text: '' }], skills: [], affinity: {} };
    const errors = validateSchema(bad, schema);
    assert.ok(errors.length >= 4, errors.join('\n'));
});

test('cross references resolve (classes, skills, kits, items, templates, locations)', async () => {
    const c = await loadContent();
    for (const cls of c.classes.values()) {
        assert.ok(c.skills.has(cls.basic_attack), cls.basic_attack);
        for (const sid of cls.skill_pool) assert.ok(c.skills.has(sid), sid);
        for (const item of c.kits[cls.id]) assert.ok(c.items.has(item), item);
    }
    for (const s of c.skills.values()) if (s.ammo) assert.ok(c.items.has(s.ammo.item), s.ammo.item);
    for (const t of c.templates.values()) for (const sid of t.skills || []) assert.ok(c.skills.has(sid), `${t.id}: ${sid}`);
    for (const sid of Object.values(c.npc.weapon_family_basic)) assert.ok(c.skills.has(sid), sid);
    for (const l of c.locations.values()) assert.ok(c.factions.has(l.realm), l.realm);
    for (const id of c.start.start_locations) assert.ok(c.locations.has(id), id);
    for (const item of c.gear.bootstrap.items) assert.ok(c.items.has(item), item);
});

test('narrator.json embeds the contract file verbatim and its report keys equal the validator keys', async () => {
    const c = await loadContent();
    const txt = await readFile(path.join(ROOT, 'content', c.narrator.contract_file), 'utf8');
    assert.equal(c.narrator.contract_text, txt);
    assert.deepEqual(Object.keys(c.narrator.report.keys).sort(), [...REPORT_KEYS].sort());
    assert.match(txt, /ENGINE AUTHORITY/);
    assert.match(txt, /CHECK DIE/);
});

test('every numeric rule constant is stated in the verbatim Core text it came from', async () => {
    const c = await loadContent();
    const r = c.rules;
    const text = (id) => c.rulesText.get(id).text;
    const has = (id, needle) => assert.ok(text(id).includes(needle), `${id} should contain "${needle}"`);
    has('core.2', `Max HP = ${r.derived.max_hp.base} + Level×${r.derived.max_hp.per_level} + VIT×${r.derived.max_hp.per_vit}`);
    has('core.2', `Max MP = INT×${r.derived.max_mp.per_int} + WIL×${r.derived.max_mp.per_wil}`);
    has('core.2', `Max STA = ${r.derived.max_sta_human}`);
    has('core.2', 'Initiative = floor(1.5 × AGI)');
    assert.deepEqual(r.derived.init, { agi_factor: 1.5, floor: true });
    has('core.2', `Base DEF = floor(VIT/${r.derived.base_def_divisor})`);
    has('core.2', `Base MDEF = floor(WIL/${r.derived.base_mdef_divisor})`);
    has('core.3', `XP_TO_NEXT = Current Level × ${r.progression.xp_to_next_per_level}`);
    has('core.3', `grant ${r.progression.free_points_per_level} free Stat Points`);
    has('core.3', 'Level-up does not refill');
    // Combat V3 (docs/REVIEW_V3.md): no Hit Chance, no Crit Chance, Partial Cover -25% damage, Ambush Crit ×1.50
    assert.equal(r.hit, undefined);
    has('core.10', 'There is no generic Hit Chance and no Hit roll. A legal attack connects');
    has('core.10', `the covered target takes -${r.cover.partial_damage_reduction_pct}% damage`);
    has('core.12', `deal -${r.cover.partial_damage_reduction_pct}% damage (Aimed Shot and Precision Thrust ignore it)`);
    has('core.11', 'There is no Crit Chance and no Crit roll.');
    has('core.11', 'deals Critical Damage ×1.50');
    assert.equal(r.crit.multiplier, 1.5);
    assert.deepEqual(Object.keys(r.crit).sort(), ['multiplier', 'only', 'src']);
    has('core.11', `Modified Power ×${r.damage.defense_floor_share.toFixed(2)}`);
    has('core.11', `${r.damage.variance_min.toFixed(2)} to ${r.damage.variance_max.toFixed(2)}`);
    has('core.11', `${r.damage.resistance_factor * 100}%`);
    has('core.24', 'guaranteed Critical Hit (×1.50), for Alaric and for Monsters/NPCs alike');
    has('core.24', 'Initiative = floor(1.5 × AGI)');
    has('core.25', `Base XP = defeated target Level*${r.xp.base_per_level}`);
    has('core.25', 'same x1; +1 x2; +2 x4; +3+ x8; -1 x0.5; -2 or lower x0.25');
    assert.deepEqual(r.xp.rank_gap, { '-2': 0.25, '-1': 0.5, 0: 1, 1: 2, 2: 4, 3: 8 });
    has('core.25', 'Normal x1; Elite x1.5; Boss x2.5');
    has('core.25', 'Minor/routine x1.5; Standard x2; Dangerous x3; Major/Dungeon/major objective x5');
    for (const v of ['P2: Cost ×0.95', 'P3: Cost ×0.95; damaging Modified Power ×1.05', 'P4: Cost ×0.925; damaging Modified Power ×1.15', 'P5: Cost ×0.90; damaging Modified Power ×1.20']) has('core.5', v);
    assert.deepEqual(Object.values(r.proficiency.levels).map((l) => l.power), [1, 1, 1.05, 1.15, 1.2]);
    assert.ok(Object.values(r.proficiency.levels).every((l) => !('hit_pp' in l)));
    for (const pct of Object.values(r.checks.modifier_pct)) has('core.8', `±${pct}%`);
    has('core.22', `${r.currency.copper_per_silver} Copper = 1 Silver`);
    has('core.22', `${r.currency.silver_per_gold} Silver = 1 Gold`);
    assert.equal(r.checks.difficulty_scores.status, 'proposed');
    assert.equal(r.checks.creature_detection.status, 'proposed');
});

test('skill numbers equal their verbatim source text (no transcription drift)', async () => {
    const c = await loadContent();
    for (const s of c.skills.values()) {
        if (s.cost) assert.match(s.source_text, new RegExp(`Cost: ${s.cost.amount} ${s.cost.resource.toUpperCase()}`), s.id);
        if (s.attack) {
            assert.match(s.source_text, new RegExp(`Base Power: ${s.attack.base}\\b`), s.id);
            for (const t of s.attack.scaling) assert.ok(s.source_text.includes(`${t.stat} × ${t.text}`), `${s.id} ${t.stat} × ${t.text}`);
        }
    }
});

test('Combat V3 content: no Hit or Crit value anywhere, no PER damage scaling, defensive Skills reduce damage', async () => {
    const c = await loadContent();
    for (const s of c.skills.values()) {
        if (s.attack) {
            assert.equal(s.attack.hit_mod, undefined, s.id);
            assert.ok(s.attack.scaling.every((t) => t.stat !== 'PER'), `${s.id}: PER never scales damage`);
        }
        for (const e of s.effects) {
            assert.notEqual(e.kind, 'incoming_hit_penalty', s.id);
            assert.equal(e.hit_pp, undefined, s.id);
        }
        assert.doesNotMatch(`${s.source_text}\n${s.effect_text || ''}`, /Hit Chance|Hit Modifier|Crit Chance|hit and critical check/i, s.id);
    }
    assert.deepEqual([...c.skills.values()].filter((s) => s.attack?.ignores_partial_cover).map((s) => s.id).sort(), ['duelist.precision_thrust', 'ranger.aimed_shot']);
    for (const a of c.anchors.values()) assert.equal(a.hit, undefined, a.id);
    assert.equal(c.monsters.scaling.hit, undefined);
    for (const k of ['elite', 'boss', 'variation']) assert.equal(c.monsters[k].hit_pp, undefined, k);
    assert.doesNotMatch(c.monsters.fauna_text, /Base Hit|Hit1|Hit ±|\/ Hit \/|\| Hit \|/);
    for (const r of c.rulesText.values()) assert.doesNotMatch(r.text, /PER\s*[×x*]\s*0\.5|PER\s*\/\s*10|floor\(PER|\+25 percentage points Crit|Base Hit Chance/, r.id);
});
