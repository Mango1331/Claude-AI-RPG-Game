// The System block the player sees above a reply (src/display.js): every line comes from the engine's records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { turnPanel } from '../../src/display.js';

const content = await loadContent();

function withOutcome(outcome) {
    const g = new Game(content).ranger();
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'npc.bram', kind: 'npc', name: 'Bram', descriptors: [], status: 'alive', location: g.state.scene.location } } });
    g.state.last = { ...g.state.last, outcome };
    return g.state;
}
const board = (bramHp, pcHp = 80) => ({
    round: 2, order: [{ id: 'pc', init: 9 }, { id: 'npc.bram', init: 8 }],
    hp: [{ id: 'pc', hp: pcHp, max: 80, state: null }, { id: 'npc.bram', hp: bramHp, max: 105, state: bramHp === 0 ? 'defeated' : null }],
    pc: { mp: 60, max_mp: 60, sta: 76, max_sta: 100, arrows: 18 },
});
const shot = (strikes, extra = {}) => ({ round: 1, actor: 'pc', kind: 'attack', target: 'npc.bram', skill_name: 'Power Shot', cost: { resource: 'sta', amount: 12, before: 88, after: 76 }, ammo: { item: 'standard_arrow', used: 1 }, strikes, ...extra });

test('combat start: Initiative, Turn order, each action with its damage, HP before - damage = after, everyone\'s HP', () => {
    const state = withOutcome({
        kind: 'combat', started: { reason: 'x', order: 'Alaric > Bram', ambush: false }, next: "Alaric's Turn (Round 2)", board: board(71, 64),
        records: [
            shot([{ target: 'npc.bram', final: 34, absorbed: 0, hp_before: 105, hp_after: 71 }]),
            { round: 1, actor: 'npc.bram', kind: 'attack', target: 'pc', skill_name: 'Basic Attack', cost: { resource: 'sta', amount: 5, before: 100, after: 95 }, strikes: [{ target: 'pc', final: 16, absorbed: 0, hp_before: 80, hp_after: 64 }] },
        ],
    });
    const lines = turnPanel(state, content).split('\n');
    assert.deepEqual(lines, [
        '`COMBAT START`',
        '`Initiative: Alaric 9 · Bram 8 → Turn order: Alaric › Bram`',
        '`— Round 1 —`',
        '`Alaric: Power Shot → Bram · STA 88 - 12 = 76 · 1 arrow`',
        '`  34 damage → Bram HP 105 - 34 = 71`',
        '`Bram: Basic Attack → Alaric`',
        '`  16 damage → Alaric HP 80 - 16 = 64`',
        '`HP: Alaric 64/80 · Bram 71/105`',
        '`Alaric: MP 60/60 · STA 76/100 · Arrows 18`',
        "`Next: Alaric's Turn (Round 2)`",
    ]);
});

test('a fighter without a bow or quiver sees no arrow count (the Warrior\'s fight showed "Arrows 0")', () => {
    const g = new Game(content);
    g.turn('Warrior');
    g.turn('Power Strike + Guard');
    g.state.last = { ...g.state.last, outcome: { kind: 'combat', started: { reason: 'x', order: 'Alaric', ambush: false }, board: { ...board(71), pc: { mp: 60, max_mp: 60, sta: 88, max_sta: 100, arrows: 0 } }, records: [] } };
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'npc.bram', kind: 'npc', name: 'Bram', descriptors: [], status: 'alive', location: g.state.scene.location } } });
    assert.ok(turnPanel(g.state, content).split('\n').includes('`Alaric: MP 60/60 · STA 88/100`'));
});

test('Ambush crits, cover, defensive reductions, Barrier, overkill and multi-hit read like a game log', () => {
    const state = withOutcome({
        kind: 'combat', started: null, next: null, board: board(0), ended: { defeated: ['npc.bram'], escaped: [], xp_awarded: 20, pc_dead: false, pc_escaped: false }, levelups: [],
        records: [
            shot([{ target: 'npc.bram', crit: { ambush: true, multiplier: 1.5 }, final: 51, absorbed: 10, hp_before: 105, hp_after: 64 }], { opening: true, round: 0 }),
            shot([{ target: 'npc.bram', cover: '-25%', reduced: ['Deflect -25%'], final: 17, absorbed: 0, hp_before: 64, hp_after: 47 }], { round: 1 }),
            { ...shot([
                { target: 'npc.bram', cover: 'ignored', final: 12, absorbed: 0, hp_before: 47, hp_after: 35 },
                { target: 'npc.bram', final: 40, absorbed: 0, hp_before: 35, hp_after: 0, defeated: true },
            ], { round: 2 }), skill_name: 'Twin Shot', ammo: { item: 'standard_arrow', used: 2 } },
        ],
    });
    state.entities.pc.sheet.xp = 20; // the award is already applied when the reply is processed
    const text = turnPanel(state, content);
    assert.match(text, /`Alaric: Power Shot \(AMBUSH opening\) → Bram · STA 88 - 12 = 76 · 1 arrow`\n` {2}51 damage AMBUSH CRIT ×1\.5 \(10 absorbed by Barrier\) → Bram HP 105 - 41 = 64`/);
    assert.match(text, /` {2}17 damage \(cover -25%, Deflect -25%\) → Bram HP 64 - 17 = 47`/);
    assert.match(text, /Twin Shot → Bram · STA 88 - 12 = 76 · 2 arrows/);
    assert.match(text, /Bram #1: 12 damage \(cover ignored\) → Bram HP 47 - 12 = 35/);
    assert.match(text, /Bram #2: 40 damage → Bram HP 35 - 40 → 0 DEFEATED/);
    assert.match(text, /`HP: Alaric 80\/80 · Bram 0\/105 \(defeated\)`/);
    assert.match(text, /`COMBAT END — Bram defeated · \+20 XP → XP 20\/100`/);
    assert.doesNotMatch(text, /MISS|HIT \(|d100|Next:/);
    // a record saved before Combat V3 (an encounter continued from an old chat) still reads correctly
    const old = withOutcome({ kind: 'combat', started: null, next: null, board: board(105), records: [shot([{ target: 'npc.bram', hit: { chance: 63, roll: 89, success: false } }])] });
    assert.match(turnPanel(old, content), /` {2}MISS \(hit 63% · d100 89\)`/);
});

test('checks show chance and roll; nothing resolved shows nothing', () => {
    const stealth = withOutcome({ kind: 'check', check: { label: 'Stealth (AGI 6) vs Detection of Bram (PER 5)', chance: 54.55, roll: 57, success: false } });
    assert.equal(turnPanel(stealth, content), '`CHECK — Stealth (AGI 6) vs Detection of Bram (PER 5): 54.55% · d100 57 → FAILURE`');
    const alone = withOutcome({ kind: 'check', check: { label: 'Stealth', automatic: true, success: true, note: 'nobody present to notice (automatic, no roll)' } });
    assert.equal(turnPanel(alone, content), '`CHECK — Stealth: automatic success (nobody present to notice)`');
    const told = withOutcome({ kind: 'narrative', check_die: 40 });
    assert.equal(turnPanel(told, content), '');
    assert.equal(turnPanel(told, content, { what: 'climb the wall', chance: 60, roll: 40, success: true }), '`CHECK — climb the wall: 60% · d100 40 → SUCCESS`');
});

test('coin, items, rest, quests and Quest XP a reply changed read like a game log (Testrun 3 request)', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    g.reply({ new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['fletcher'] }], quests: [{ title: 'Rats in the Cellar', status: 'offered', giver: 'Mara', level: 10, type: 'minor' }] });
    g.input('"Deal." *I buy three arrows from her for 6 copper.*');
    const before = g.state;
    const r = g.reply({
        quests: [{ title: 'Rats in the Cellar', status: 'active' }], coin: [{ who: 'pc', cp: -6, why: 'three arrows' }],
        items: [{ item: 'Standard Arrow', qty: 3, from: 'Mara', to: 'pc', why: 'bought' }],
    });
    assert.deepEqual(turnPanel(before, content, null, r).split('\n'), [
        '`ITEM +3 Standard Arrow → 23 carried · bought`',
        '`COIN -6 Copper → 4 Silver 4 Copper · three arrows`',
        '`QUEST ACCEPTED — Rats in the Cellar (Mara)`',
    ]);
    g.input('I clear out the cellar and rest.');
    const b2 = g.state;
    const r2 = g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'completed' }], recover: [{ sta: 5, why: 'short rest' }] }, 'Mara pays.');
    const lines = turnPanel(b2, content, null, r2).split('\n');
    // 10 × 10 × 1.5 = 150 Quest XP: Level 1 -> 2 with 50 carried over
    assert.deepEqual(lines, ['`QUEST COMPLETED — Rats in the Cellar (Mara)`', '`+150 XP → XP 50/200 · Quest XP: Rats in the Cellar (XP basis Level 10, minor)`', '`LEVEL UP → Level 2 (+5 free Stat Points)`']);
    assert.equal(turnPanel(b2, content, null, { ...r2, events: [] }), '', 'nothing changed, nothing shown');
});

test('an attack the reply reported is fixed and shown before anyone acts: Initiative, Turn order, HP, Range, who goes first', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    g.input('I watch the wolf.');
    const before = g.state;
    const r = g.reply({ combat: { by: 'wolf' } });
    const lines = turnPanel(before, content, null, r).split('\n');
    const init = r.state.encounter.combatants['mon.wolf'].fixed.init;
    assert.equal(lines[0], '`COMBAT START — the wolf attacks Alaric`');
    assert.match(lines[1], new RegExp(`^\`Initiative: .*the wolf ${init}.* → Turn order: `));
    assert.match(lines.join('\n'), /`Range: the wolf MEDIUM`/);
    assert.match(lines.at(-2), init > 9 ? /^`Next: Round 1 — the wolf acts before Alaric`$/ : /^`Next: Round 1 — Alaric acts first`$/);
    // every legal attack lands (Combat V3): the choice is shown as the damage each deals to the wolf (DEF 0, variance ±10%)
    assert.equal(lines.at(-1), '`Alaric\'s attacks vs the wolf: Basic Attack 16–19 · Aimed Shot 24–29 · Power Shot 30–37 damage`');
    assert.equal(r.state.encounter.round, 0, 'nothing resolved yet');
});
