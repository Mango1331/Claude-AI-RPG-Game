// Narrator fact report -> validated events: tolerant parsing, engine-owned values rejected, knowledge rules,
// hard facts, coin/items/quests consistency, CHECK DIE recomputation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { extractReport, tolerantJson, reportToEvents } from '../../src/delta.js';
import { truth, knowledgeOf, statusOf } from '../../src/knowledge.js';

const content = await loadContent();
// a created character in story mode: reports answer a story message (a reply to the creation turn itself is System-only)
const ready = () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    return g;
};
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
    g.reply({ coin: [{ cp: -10, why: 'toll' }], quests: [{ title: 'Lost Ring', status: 'active', giver: 'Mara', level: 1, type: 'minor' }] });
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

test('combat commitment by an NPC is fixed at once (Initiative, Turn order) and its Turns resolve next turn', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    g.reply({ combat: { by: 'wolf' } });
    assert.deepEqual(g.state.pending_combat, []);
    assert.deepEqual(Object.keys(g.state.encounter.combatants).sort(), ['mon.wolf', 'pc']);
    assert.deepEqual([g.state.encounter.round, g.state.encounter.log.length], [0, 0], 'nobody acted yet (Core #24 pending trigger)');
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
    // a new quest without its Level and type is not recorded: its Quest XP could never be fixed (Testrun 3 rat quest)
    const r = g.reply({ quests: [{ title: 'Escort the Carter', status: 'active', type: 'escort' }] });
    assert.match(reasons(r), /^new quest "Escort the Carter" needs level \(its recommended Level, a whole number from 1\) and type \(minor\|standard\|dangerous\|major\), which fix its Quest XP; missing: level and type\. Report the quest again with both$/);
    assert.ok(!g.state.quests['quest.escort_the_carter']);
    assert.deepEqual(g.reply({ quests: [{ title: 'Escort the Carter', status: 'active', level: 2, type: 'standard' }] }).rejected, [], 'the complete entry goes through');
    assert.deepEqual(g.reply({ quests: [{ title: 'Escort the Carter', status: 'active', level: 8, type: 'major' }] }).rejected, []);
    assert.deepEqual([g.state.quests['quest.escort_the_carter'].rec_level, g.state.quests['quest.escort_the_carter'].qtype], [2, 'standard'], 'a known quest keeps its locked values');
    g.reply({ quests: [{ title: 'Big Job', status: 'offered', level: 10, type: 'dangerous' }] });
    g.reply({ quests: [{ title: 'Big Job', status: 'completed' }] });
    const s = g.state.entities.pc.sheet;
    assert.deepEqual([s.level, s.xp], [3, 45 + 300 - 100 - 200], '345 XP: Level 1 -> 3 with carry-over');
});

test('a reply without a report: the next report may still record what the player decided in that turn (Testrun 3)', () => {
    const g = ready();
    g.reply({ quests: [{ title: 'Cellar Rats', status: 'offered', giver: 'innkeeper', level: 1, type: 'minor' }] });
    g.input('"I\'ll take the job." *I pay the innkeeper two copper for a candle.*');
    const miss = g.reply('The innkeeper nods and hands over a stub of candle.'); // no fact report
    assert.equal(miss.report_error, 'no <avereth> report');
    assert.match(miss.corrections.join(' '), /Write it right after the story text, before any tracker or status blocks/);
    g.input('I head for the cellar door.');
    const r = g.reply({ quests: [{ title: 'Cellar Rats', status: 'active' }], coin: [{ who: 'pc', cp: -2, why: 'candle' }] });
    assert.deepEqual(r.rejected, [], 'accepting and paying were the player\'s decisions one message earlier');
    assert.equal(g.state.quests['quest.cellar_rats'].status, 'active');
    g.input('I look around the cellar.');
    assert.match(reasons(g.reply({ coin: [{ who: 'pc', cp: -3, why: 'more candles' }] })), /PLAYER OWNERSHIP: spending coin/, 'only the turn without a report carries over');
});

test('names in refs, full names, bare combat names and people placed again (Testrun 3 report shapes)', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'hesta', kind: 'npc', desc: ['adventuress'], band: 'SHORT' }, { ref: 'gate_guard', kind: 'npc', desc: ['guard'] }] }, 'Hesta laughs. The guard yawns. "Hesta, again?"');
    assert.equal(g.state.entities['npc.hesta'].name, 'Hesta');
    assert.equal(g.state.entities['npc.gate_guard'].name, null, 'a descriptor ref is no name');
    const r = g.reply({ attitude: [{ who: 'Hesta Gault', delta: 5, why: 'polite' }] });
    assert.deepEqual(r.rejected, []);
    assert.equal(g.state.entities['npc.hesta'].name, 'Hesta Gault');
    assert.deepEqual(g.reply({ attitude: [{ who: 'Gault', delta: 1, why: 'x' }] }).rejected, [], 'a part of a known name finds the person');
    // someone known but not in the scene is brought back by a report that places them here
    g.reply({ leave: ['gate_guard'] });
    g.reply({ position: [{ who: 'gate_guard', band: 'MEDIUM' }] });
    assert.ok(g.state.scene.present.includes('npc.gate_guard'));
    // an unknown person points to "new"; a bare name commits like {by}
    assert.match(reasons(g.reply({ position: [{ who: 'Rennick', band: 'SHORT' }] })), /unknown person \(introduce new people via "new"\)/);
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    g.input('I watch the wolf.');
    const c = g.reply({ combat: ['wolf'] });
    assert.deepEqual(c.rejected, []);
    assert.ok(g.state.encounter.combatants['mon.wolf']);
    assert.ok(g.reply({ combat: { by: ['wolf'] } }).accepted.includes('mon.wolf fights on'), 'a combatant committing again is no error');
});
