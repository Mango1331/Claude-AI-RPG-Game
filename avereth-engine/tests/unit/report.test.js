// Narrator fact report -> validated events: tolerant parsing, engine-owned values rejected, knowledge rules,
// hard facts, coin/items/quests consistency, CHECK DIE recomputation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { extractReport, tolerantJson, reportToEvents } from '../../src/delta.js';
import { truth, knowledgeOf, statusOf } from '../../src/knowledge.js';

const content = await loadContent();
const ready = () => new Game(content).ranger();
const reasons = (r) => r.rejected.map((x) => x.reason).join(' | ');

test('the report is found, parsed tolerantly and removed from the visible text', () => {
    const text = 'Prose.\n\n<avereth>```json\n{“time”: 5, new: [{"ref":"cat","kind":"creature","species":"cat",}],}\n```</avereth>';
    const r = extractReport(text);
    assert.equal(r.clean, 'Prose.');
    assert.equal(r.report.time, 5);
    assert.equal(r.report.new[0].species, 'cat');
    assert.equal(extractReport('no report here').report, null);
    assert.equal(tolerantJson('[1,2]').error, 'report is not a JSON object');
    assert.equal(tolerantJson('{broken').error, 'report is not valid JSON');
});

test('engine-owned values and unknown keys are rejected with a reason', () => {
    const g = ready();
    const r = reportToEvents({ hp: 10, xp: 500, damage: 30, rolls: [3], mood: 'grim', time: 5 }, g.state, content);
    assert.equal(r.rejected.length, 5);
    assert.match(reasons(r), /"hp" is engine-owned/);
    assert.match(reasons(r), /unknown report key "mood"/);
    assert.deepEqual(r.events.map((e) => e.t), ['time.advanced']);
});

test('new people get a template, creatures need a real body plan, known people are not duplicated', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'guard', kind: 'npc', desc: ['gate guard'], band: 'SHORT' }, { ref: 'glow', kind: 'creature', species: 'eldritch glow' }] });
    const guard = Object.values(g.state.entities).find((e) => e.descriptors?.includes('gate guard'));
    assert.equal(guard.template, 'guard');
    assert.equal(g.state.scene.positions[guard.id].band, 'SHORT');
    assert.equal(Object.values(g.state.entities).filter((e) => e.kind === 'creature').length, 0);
    const before = Object.keys(g.state.entities).length;
    g.reply({ new: [{ ref: 'gate guard', kind: 'npc' }] });
    assert.equal(Object.keys(g.state.entities).length, before, 'the same guard is not created twice');
});

test('learning never rewrites world truth; secrets spread only by telling or witnessing', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['smith'] }, { ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['innkeeper'] }],
        facts: [{ s: 'Brom', p: 'member_of', o: 'the Black Hand', vis: 'secret' }, { s: 'Tidecross', p: 'status', o: 'besieged' }] });
    const brom = 'npc.brom';
    assert.ok(knowledgeOf(g.state, brom).some((k) => k.o === 'the Black Hand'), 'Brom knows his own secret');
    const r1 = g.reply({ learn: [{ who: 'Mara', s: 'Brom', p: 'member_of', o: 'the Black Hand', how: 'rumor' }] });
    assert.match(reasons(r1), /secret/);
    g.reply({ learn: [{ who: 'Mara', s: 'Tidecross', p: 'status', o: 'peaceful', how: 'told' }] });
    assert.equal(statusOf(g.state, 'loc.tidecross'), 'besieged', 'being told never changes the world');
    assert.equal(knowledgeOf(g.state, 'npc.mara').find((k) => k.o === 'peaceful').true, false, 'she now holds a false belief');
    g.reply({ learn: [{ who: 'Mara', s: 'King Aldren', p: 'status', o: 'dead', how: 'told' }] });
    assert.deepEqual(truth(g.state, 'King Aldren', 'status'), [], 'hearsay about an unknown matter creates no world fact');
    assert.equal(knowledgeOf(g.state, 'npc.mara').find((k) => k.o === 'dead').stance, 'believes');
    g.reply({ believe: [{ who: 'Mara', s: 'Tidecross', p: 'status', o: 'peaceful' }] });
    const belief = knowledgeOf(g.state, 'npc.mara').find((k) => k.stance === 'believes');
    assert.equal(belief.true, false, 'a belief contradicting the world is recorded as false');
    g.reply({ learn: [{ who: 'Mara', s: 'Brom', p: 'member_of', o: 'the Black Hand', how: 'told', from: 'Brom' }] });
    assert.ok(knowledgeOf(g.state, 'npc.mara').some((k) => k.o === 'the Black Hand' && k.source === 'told:npc.brom'));
});

test('hard facts (destroyed, dead) change only with a stated cause', () => {
    const g = ready();
    g.reply({ facts: [{ s: 'Glassmere', p: 'status', o: 'destroyed', because: 'a dragon burned it' }] });
    assert.equal(truth(g.state, 'loc.glassmere', 'status')[0].hard, true);
    const r = g.reply({ facts: [{ s: 'Glassmere', p: 'state', o: 'thriving' }] });
    assert.match(reasons(r), /contradicts established fact/);
    g.reply({ facts: [{ s: 'Glassmere', p: 'status', o: 'rebuilt', because: 'ten years of royal funding' }] });
    assert.equal(statusOf(g.state, 'loc.glassmere'), 'rebuilt');
    assert.equal(Object.values(g.state.facts).filter((f) => f.s === 'loc.glassmere').length, 2, 'the destroyed fact stays as history');
});

test('coin, items and quests stay consistent', () => {
    const g = ready();
    g.input('"Here is your coin for the room, and take these arrows."');
    const r = g.reply({ coin: [{ who: 'pc', cp: -60, why: 'room' }], items: [{ from: 'pc', to: 'innkeeper', item: 'standard_arrow', qty: 25 }], quests: [{ title: 'Lost Ring', status: 'completed' }] });
    assert.match(reasons(r), /insufficient coin/);
    assert.match(reasons(r), /does not carry 25/);
    assert.match(reasons(r), /never offered/);
    g.input('"Fine, I pay the toll. And I\'ll take the job."');
    g.reply({ coin: [{ cp: -10, why: 'toll' }], quests: [{ title: 'Lost Ring', status: 'active', giver: 'Mara' }] });
    assert.equal(g.state.entities.pc.sheet.coin_cp, 40);
    g.reply({ quests: [{ title: 'Lost Ring', status: 'failed' }] });
    const r2 = g.reply({ quests: [{ title: 'Lost Ring', status: 'completed' }] });
    assert.match(reasons(r2), /already failed/);
});

test('CHECK DIE: the engine recomputes the check and corrects a narrated result that contradicts the die', () => {
    const g = ready();
    const p = g.input('I try to climb the slick wall');
    const die = p.outcome.check_die;
    assert.ok(die >= 1 && die <= 100);
    // Actor AGI 6 vs Difficulty 6 -> 50%
    const claimed = !(die <= 50);
    const r = g.reply({ check: { what: 'climb', stat: 'AGI', actor: 6, opposition: 6, success: claimed } });
    assert.equal(g.state.last.check.chance, 50);
    assert.equal(g.state.last.check.success, die <= 50);
    assert.match(r.corrections.join(' '), /narrated the opposite/);
    const r2 = g.reply({ check: { what: 'again', actor: 6, opposition: 6 } });
    assert.equal(r2.accepted.filter((a) => a.startsWith('check')).length, 1, 'the same die is not a new roll');
});

test('combat commitment by an NPC becomes PENDING and is resolved by the engine next turn', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    g.reply({ combat: { by: 'wolf' } });
    assert.deepEqual(g.state.pending_combat.map((p) => p.by), ['mon.wolf']);
    const t = g.input('I shout at it to go away');
    assert.equal(t.outcome.kind, 'combat');
    assert.equal(g.state.mode, 'combat');
    assert.deepEqual(g.state.pending_combat, []);
    assert.ok(t.outcome.records.some((r) => r.actor === 'mon.wolf'), 'the wolf acted on its turn');
});

test('Quest XP (Core #25): locked when offered, awarded once on completion through the Level-up loop', () => {
    const g = ready();
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'offered', giver: 'innkeeper', level: 3, type: 'minor' }] });
    g.input('"Deal, I\'ll do it."');
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'active', level: 9, type: 'major' }] });
    const q = g.state.quests['quest.rats_in_the_cellar'];
    assert.deepEqual([q.rec_level, q.qtype], [3, 'minor'], 'rewards cannot be inflated after the offer');
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'completed' }] });
    assert.equal(g.state.entities.pc.sheet.xp, 45); // 3 × 10 × 1.5
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'completed' }] });
    assert.equal(g.state.entities.pc.sheet.xp, 45, 'awarded once');
    g.reply({ quests: [{ title: 'Escort the Carter', status: 'active' }] });
    const r = g.reply({ quests: [{ title: 'Escort the Carter', status: 'completed' }] });
    assert.match(r.corrections.join(' '), /grants no Quest XP/);
    g.reply({ quests: [{ title: 'Big Job', status: 'offered', level: 10, type: 'dangerous' }] });
    g.reply({ quests: [{ title: 'Big Job', status: 'completed' }] });
    const s = g.state.entities.pc.sheet;
    assert.deepEqual([s.level, s.xp], [3, 45 + 300 - 100 - 200], '345 XP: Level 1 -> 3 with carry-over');
});
