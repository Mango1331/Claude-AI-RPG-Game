// Narrator fact report -> validated events: tolerant parsing, engine-owned values rejected, knowledge rules,
// hard facts, coin/items/quests consistency, CHECK DIE recomputation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { extractReport, tolerantJson, reportToEvents } from '../../src/delta.js';
import { truth, knowledgeOf, statusOf, knows, PC_NAME_FACT, pcIdentityFor } from '../../src/knowledge.js';

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

test('JSON a model got almost right is repaired: a root closed too early, brackets left open, a stray closer', () => {
    // Test 5 run, turn 11: one "}" too many closed the report before "check", and the whole report was lost
    assert.deepEqual(tolerantJson('{"time":12,"combat":{"by":"rats"}},"check":{"what":"x","success":true}').value, { time: 12, combat: { by: 'rats' }, check: { what: 'x', success: true } });
    assert.deepEqual(tolerantJson('{"time":5,"new":[{"ref":"boy","kind":"npc"').value, { time: 5, new: [{ ref: 'boy', kind: 'npc' }] }, 'a reply cut off after a value');
    assert.deepEqual(tolerantJson('{"time":5}}').value, { time: 5 });
    assert.equal(tolerantJson('{"memory":[{"text":"he said \\"{no}\\", then left","imp":6}]}').value.memory[0].text, 'he said "{no}", then left', 'brackets inside strings are text');
    assert.equal(tolerantJson('{"memory":[{"text":"cut off mid-sent').error, 'report is not valid JSON', 'an unterminated string is not guessed');
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

test('combat commitment by an NPC is fixed at once (Initiative, Turn order); the Turns before Alaric\'s resolve with it', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'MEDIUM' }] });
    g.reply({ combat: { by: 'wolf' } });
    assert.deepEqual(g.state.pending_combat, []);
    assert.deepEqual(Object.keys(g.state.encounter.combatants).sort(), ['mon.wolf', 'pc']);
    // the wolf is faster: its Round 1 Turn (the trigger action on its Turn, Core #24) is played now, Alaric's waits
    const enc = g.state.encounter;
    assert.ok(enc.combatants['mon.wolf'].fixed.init > enc.combatants.pc.fixed.init);
    assert.deepEqual([enc.round, enc.current, enc.log.map((r) => r.actor)], [1, 'pc', ['mon.wolf']]);
    const t = g.input('I shout at it to go away');
    assert.equal(t.outcome.kind, 'combat');
    assert.equal(g.state.mode, 'combat');
    assert.deepEqual(g.state.pending_combat, []);
    // the narrator hears of the start and of the wolf's Turn now; the panel showed it with the reply already
    assert.deepEqual([t.outcome.started?.previewed, t.outcome.records.map((r) => r.actor), t.outcome.shown], [true, ['mon.wolf'], 1]);
    assert.equal(g.state.encounter.log.length, 1, 'no Turn is played twice');
});

test('Quest XP (Core #25): locked when offered, awarded once on completion through the Level-up loop', () => {
    const g = ready();
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'offered', giver: 'innkeeper', level: 3, type: 'minor', reward: '5 silver' }] });
    g.input('"Deal, I\'ll do it."');
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'active', level: 9, type: 'major', reward: '4 silver' }] });
    const q = g.state.quests['quest.rats_in_the_cellar'];
    assert.deepEqual([q.rec_level, q.qtype], [3, 'minor'], 'rewards cannot be inflated after the offer');
    // the posted reward stays as posted (live run 24.09. 23:23: 5 silver on the board, "four" at the hand-in)
    assert.equal(q.reward, '5 silver');
    assert.match(g.context().text, /Quest \(active\): Rats in the Cellar — from [^\n]* — reward: 5 silver/);
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'completed' }] });
    assert.equal(g.state.entities.pc.sheet.xp, 45); // 3 × 10 × 1.5
    g.reply({ quests: [{ title: 'Rats in the Cellar', status: 'completed' }] });
    assert.equal(g.state.entities.pc.sheet.xp, 45, 'awarded once');
    // a new quest without its Level and type is not recorded: its Quest XP could never be fixed (Testrun 3 rat quest)
    const r = g.reply({ quests: [{ title: 'Escort the Carter', status: 'active', type: 'escort' }] });
    assert.match(reasons(r), /^new quest "Escort the Carter" needs level \(its hidden XP basis: the Level the task suits, a whole number from 1\) and type \(minor\|standard\|dangerous\|major\), which fix its Quest XP; missing: level and type\. Report the quest again with both$/);
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
    assert.match(miss.corrections.join(' '), /Write it right after the story text;/);
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

test('Guild contracts carry a Quest Rank; the hidden XP level must lie in that rank\'s band (lorebook v0.11)', () => {
    const g = ready();
    assert.deepEqual(g.reply({ quests: [{ title: 'Cellar Rats', status: 'offered', level: 2, type: 'minor', rank: 'novice' }] }).rejected, []);
    assert.equal(g.state.quests['quest.cellar_rats'].rank, 'Novice');
    assert.match(reasons(g.reply({ quests: [{ title: 'Wyvern Nest', status: 'offered', level: 20, type: 'dangerous', rank: 'Novice' }] })),
        /^quest "Wyvern Nest": a Novice contract's level lies in 1-14 \(Power Rank F\); reported level 20/);
    assert.match(reasons(g.reply({ quests: [{ title: 'Odd Job', status: 'offered', level: 2, type: 'minor', rank: 'Copper' }] })), /is not a Guild Quest Rank/);
    assert.deepEqual(g.reply({ quests: [{ title: 'Border Patrol', status: 'offered', level: 17, type: 'standard', rank: 'Proven' }] }).rejected, []);
    assert.deepEqual(g.reply({ quests: [{ title: 'Private Errand', status: 'offered', level: 1, type: 'minor' }] }).rejected, [], 'work outside the Guild has no rank');
    g.input('"I\'ll take the rat job."');
    g.reply({ quests: [{ title: 'Cellar Rats', status: 'active', rank: 'Master', level: 70 }] });
    assert.deepEqual([g.state.quests['quest.cellar_rats'].rank, g.state.quests['quest.cellar_rats'].rec_level], ['Novice', 2], 'locked when offered');
    assert.deepEqual(g.reply({ quests: [{ title: 'Cellar Rats', status: 'completed', rank: 'F' }] }).rejected, [], 'a stray rank never blocks a known quest');
    assert.equal(g.state.quests['quest.cellar_rats'].status, 'completed');
    assert.match(reasons(g.reply({ quests: [{ title: 'Dragon Hunt', status: 'offered', level: 40, type: 'major', rank: 'Legend' }] })), /a Legend contract's level lies in 90\+ \(Power Rank S\)/);
});

test('money is never an item (Testrun 4: three silver came as an item and as coin); unknown items keep their name', () => {
    const g = ready();
    for (const item of ['silver', '3 silver', 'copper coins', 'gold', 'coins']) {
        assert.match(reasons(g.reply({ items: [{ item, qty: 3, from: 'guard', to: 'pc' }] })), /money is not an item/, item);
    }
    g.reply({ items: [{ item: 'Guild registration tag (lead, stamped, numbered)', qty: 1, to: 'pc', why: 'registration' }] });
    assert.equal(g.state.item_names.guild_registration_tag, 'Guild registration tag');
    assert.equal(g.state.entities.pc.sheet.inventory.guild_registration_tag, 1);
});

test('a person the reply names with a capitalised name is adopted, a descriptor is not (Testrun 4: "Fennick")', () => {
    const g = ready();
    const r = g.reply({ aware: [{ who: 'fennick', level: 'aware' }, { who: 'guard2', level: 'aware' }] }, 'From the stairs Fennick calls down. The guard watches.');
    assert.ok(r.accepted.includes('named in the story: Fennick (npc.fennick)'));
    assert.ok(g.state.scene.present.includes('npc.fennick'));
    assert.deepEqual(r.rejected.map((x) => x.reason), ['aware: unknown person (introduce new people via "new")'], 'a lower-case word stays unknown');
});

test('a "status" fact sets the entity status of a person only to alive/dead; Alaric\'s life stays the engine\'s', () => {
    const g = ready();
    g.reply({ new: [{ ref: 'guard', kind: 'npc', desc: ['guard'], band: 'SHORT' }] });
    // Testrun 4: "registered Guild member, Rank F / Novice" replaced Alaric's "alive"
    const r = g.reply({ facts: [{ s: 'Alaric', p: 'status', o: 'registered Guild member, Rank F / Novice' }, { s: 'guard', p: 'status', o: 'off duty' }] });
    assert.deepEqual(r.rejected, []);
    assert.deepEqual([g.state.entities.pc.status, g.state.entities['npc.guard'].status], ['alive', 'alive']);
    assert.ok(Object.values(g.state.facts).some((f) => f.s === 'pc' && f.p === 'status' && f.o === 'registered Guild member, Rank F / Novice'), 'kept as an ordinary fact');
    assert.match(reasons(g.reply({ facts: [{ s: 'Alaric', p: 'status', o: 'dead' }] })), /Alaric's life is engine-owned/);
    assert.equal(g.state.entities.pc.status, 'alive');
    g.reply({ facts: [{ s: 'guard', p: 'status', o: 'dead', because: 'a crossbow bolt from the wall' }] });
    assert.equal(g.state.entities['npc.guard'].status, 'dead');
});


test('Alaric under a full name the story gave him is Alaric (his Guild Rank is his), and an id-like ref finds its name', () => {
    // Test 5 run 2: the player said "put down Red"; the registration report said {"s":"Alaric Red","p":"guild_rank"}
    // and the rank went to a stranger called "Alaric Red": the HUD kept "(not registered)"
    const g = ready();
    const r = g.reply({ facts: [{ s: 'Alaric Red', p: 'guild_rank', o: 'Novice' }] });
    assert.deepEqual(r.rejected, []);
    assert.equal(truth(g.state, 'pc', 'guild_rank')[0].o, 'Novice');
    assert.equal(g.state.entities.pc.name, 'Alaric', 'the story\'s full name never renames the player\'s character');
    assert.deepEqual(truth(g.state, 'Alaric Red', 'guild_rank'), []);
    // "lean_guard" for the Lean Guard (the same run: the fact stayed on an unknown subject "lean_guard")
    g.reply({ new: [{ ref: 'guard_lean', kind: 'npc', name: 'Lean Guard', desc: ['gate guard'], band: 'SHORT' }] });
    g.reply({ facts: [{ s: 'lean_guard', p: 'voice', o: 'mild as milk' }] });
    assert.equal(truth(g.state, 'npc.lean_guard', 'voice')[0].o, 'mild as milk');
    // someone else of that first name present: "Alaric Red" is ambiguous and finds nobody
    g.reply({ new: [{ ref: 'Alaric', kind: 'npc', name: 'Alaric', desc: ['farmhand'], band: 'SHORT' }] });
    assert.match(reasons(g.reply({ attitude: [{ who: 'Alaric Red', delta: 5, why: 'x' }] })), /unknown/);
});

test('"Alaric", "Alaric Red" and "alaric_red" are Alaric in facts and learn; whoever learns a fact naming him knows his name', () => {
    // live run 26.09. 23:09: {"s":"alaric_red","p":"guild_rank"} and the clerk's {"s":"alaric_red","p":"registered_name",
    // "o":"Alaric Red"} stayed on a subject "alaric_red": no Guild Rank in the HUD, and the clerk "did not know his name"
    for (const ref of ['Alaric', 'Alaric Red', 'alaric_red']) {
        const g = ready();
        g.reply({ new: [{ ref: 'clerk', kind: 'npc', desc: ['guild clerk'], band: 'ENGAGED' }] });
        const r = g.reply({ facts: [{ s: ref, p: 'guild_rank', o: 'Novice' }], learn: [{ who: 'clerk', s: ref, p: 'registered_name', o: 'Alaric Red', how: 'witnessed' }] });
        assert.deepEqual(r.rejected, [], ref);
        assert.equal(truth(g.state, 'pc', 'guild_rank')[0]?.o, 'Novice', ref);
        assert.equal(truth(g.state, 'pc', 'registered_name')[0]?.o, 'Alaric Red', ref);
        assert.ok(knows(g.state, 'npc.clerk', PC_NAME_FACT), ref);
        assert.deepEqual(Object.values(g.state.facts).filter((f) => f.s !== 'pc' && /alaric/i.test(f.s)), [], `${ref}: no stranger subject`);
        assert.equal(g.state.entities.pc.name, 'Alaric', ref);
    }
    // a name he may not go by is no knowledge of his name: an alias stays the fact it is
    const g = ready();
    g.reply({ new: [{ ref: 'clerk', kind: 'npc', desc: ['guild clerk'], band: 'ENGAGED' }] });
    g.reply({ learn: [{ who: 'clerk', s: 'alaric_red', p: 'registered_name', o: 'John Smith', how: 'witnessed' }] });
    assert.equal(truth(g.state, 'pc', 'registered_name')[0]?.o, 'John Smith');
    assert.ok(!knows(g.state, 'npc.clerk', PC_NAME_FACT));
    // a person's name written like an id finds that person and never renames her ("hesta_gault" for Hesta)
    g.reply({ new: [{ ref: 'Hesta', kind: 'npc', name: 'Hesta', desc: ['guild sponsor'], band: 'SHORT' }] });
    const h = g.reply({ facts: [{ s: 'hesta_gault', p: 'occupation', o: 'sponsor' }] });
    assert.deepEqual(h.rejected, []);
    assert.equal(truth(g.state, 'npc.hesta', 'occupation')[0]?.o, 'sponsor');
    assert.equal(g.state.entities['npc.hesta'].name, 'Hesta');
});

test('Alaric\'s name fact stays the player\'s: his full name keeps it, another name is refused, whoever knew his name still does', () => {
    // {"s":"Alaric","p":"full_name","o":"Alaric Red"} used to end f.pc.name (on which every "knows his name" rests) and
    // set "pc name pc" (the object resolved to Alaric)
    const g = ready();
    g.reply({ new: [{ ref: 'clerk', kind: 'npc', desc: ['guild clerk'], band: 'ENGAGED' }] });
    g.reply({ learn: [{ who: 'clerk', s: 'alaric_red', p: 'registered_name', o: 'Alaric Red', how: 'witnessed' }] });
    for (const f of [{ s: 'Alaric', p: 'full_name', o: 'Alaric Red' }, { s: 'alaric_red', p: 'name', o: 'Alaric Red' }, { s: 'pc', p: 'called', o: 'Alaric' }]) {
        const r = g.reply({ facts: [f] });
        assert.deepEqual(r.rejected, [], JSON.stringify(f));
        assert.deepEqual(r.events.filter((e) => e.t.startsWith('fact.')), [], `${JSON.stringify(f)}: the same name changes nothing`);
    }
    const other = g.reply({ facts: [{ s: 'Alaric', p: 'name', o: 'John Smith' }] });
    assert.match(reasons(other), /^Alaric's name is the player's and stays as it is; a name he goes by is a fact of its own \(p "alias"\)/);
    assert.equal(g.state.facts[PC_NAME_FACT].until, null);
    assert.deepEqual(truth(g.state, 'pc', 'name').map((f) => [f.id, f.o]), [[PC_NAME_FACT, 'Alaric']]);
    assert.ok(knows(g.state, 'npc.clerk', PC_NAME_FACT));
    assert.equal(pcIdentityFor(g.state, 'npc.clerk').level, 'name', 'the clerk knows him by name');
    assert.equal(g.state.entities.pc.name, 'Alaric');
    // a name he goes by is a fact of its own
    g.reply({ facts: [{ s: 'Alaric', p: 'alias', o: 'John Smith' }] });
    assert.equal(truth(g.state, 'pc', 'alias')[0]?.o, 'John Smith');
    assert.equal(truth(g.state, 'pc', 'name')[0].id, PC_NAME_FACT);
});

test('the city reached from the start: by the player\'s decision he left the verge for the city; anywhere else the city named again says nothing (live run 27.09. 02:30)', () => {
    const g = ready(); // at the public roadside verge outside Tidecross
    g.reply({ new: [{ ref: 'carter', kind: 'npc', desc: ['carter'], band: 'SHORT' }] });
    // the city named without anyone going anywhere changes nothing
    g.input('I wait by the road.');
    assert.deepEqual(g.reply({ location: 'Tidecross, Solmere' }).accepted, []);
    assert.equal(g.state.scene.place, 'public roadside verge outside Tidecross');
    // he goes into the city and the Guild; the report names the city and no spot: the spot is asked for (host.js)
    g.input('*I walk into the city and go to the adventurers guild*');
    const r = g.reply({ location: 'Tidecross, Solmere', new: [{ ref: 'marta', kind: 'npc', name: 'Marta', desc: ['guild receptionist'] }] });
    assert.deepEqual(r.accepted.slice(0, 2), ['place: Tidecross', 'new npc Marta (npc.marta)']);
    assert.ok(r.accepted.includes('npc.carter stays behind'));
    assert.deepEqual(r.unplaced, { city: 'Tidecross' });
    assert.deepEqual([g.state.scene.place, g.state.scene.present], ['Tidecross', ['pc', 'npc.marta']]);
    assert.match(g.context().text, /\| Tidecross, Solmere — Tidecross \| mode: story/);
    // in the Guild hall, the city named again with no spot is no move: "I walk over to the quest board" keeps the hall
    g.input('Hello, I am here to register.');
    g.reply({ place: "Adventurers' Guild hall" });
    g.input('*I walk over to the quest board*');
    const e = g.reply({ location: 'Tidecross' });
    assert.deepEqual([e.accepted, e.unplaced], [[], null]);
    assert.deepEqual([g.state.scene.place, g.state.scene.present], ["Adventurers' Guild hall", ['pc', 'npc.marta']]);
});

test('a place that is only the city names no spot: the spot a report names is where he is, or after a move a new one that the others do not follow into', () => {
    const inCity = () => {
        const g = ready();
        g.input('*I walk into the city*');
        g.reply({ location: 'Tidecross', new: [{ ref: 'marta', kind: 'npc', name: 'Marta', desc: ['guild receptionist'] }] });
        return g;
    };
    const g = inCity();
    g.input('Hello, I am here to register.');
    assert.deepEqual(g.reply({ place: "Adventurers' Guild hall, Tidecross" }).rejected, []);
    assert.deepEqual([g.state.scene.place, g.state.scene.present], ["Adventurers' Guild hall, Tidecross", ['pc', 'npc.marta']]);
    const h = inCity();
    h.input('*I walk to the Blue Ox Tavern*');
    const r = h.reply({ place: 'Blue Ox Tavern cellar (Tidecross, Copperlane)', new: [{ ref: 'bren', kind: 'npc', name: 'Bren', desc: ['cellarman'] }] });
    assert.ok(r.accepted.includes('npc.marta stays behind'));
    assert.deepEqual(h.state.scene.present, ['pc', 'npc.bren']);
});

test('a quest rank given as a number is the Quest Rank of the quest\'s level; the quest is kept and taken later offered → active (live run 27.09. 02:30)', () => {
    const g = ready();
    const r = g.reply({ quests: [
        { title: 'Rats — Cellar of the Blue Ox Tavern', status: 'offered', giver: 'Blue Ox Tavern', reward: '4 silver and a hot meal', level: 1, type: 'minor', rank: 1 },
        { title: 'Wormhole Delve', status: 'offered', level: 2, type: 'standard', rank: '1' },
        { title: 'Border Patrol', status: 'offered', level: 17, type: 'standard', rank: 2 },
    ] });
    assert.deepEqual(r.rejected, []);
    assert.deepEqual(Object.values(g.state.quests).map((q) => [q.title, q.rank]), [['Rats — Cellar of the Blue Ox Tavern', 'Novice'], ['Wormhole Delve', 'Novice'], ['Border Patrol', 'Proven']]);
    assert.ok(r.accepted.includes('quest Border Patrol: offered (rank 2: Proven, by its level)'));
    // a rank that is neither a rank name nor a number is still refused
    assert.match(reasons(g.reply({ quests: [{ title: 'Odd Job', status: 'offered', level: 2, type: 'minor', rank: 'Copper' }] })), /is not a Guild Quest Rank/);
    g.input('*I take the Rats quest and go to the front desk*');
    g.reply({ quests: [{ title: 'Rats — Cellar of the Blue Ox Tavern', status: 'active', rank: 'Novice', level: 1, type: 'minor' }] });
    const q = g.state.quests['quest.rats_cellar_of_the_blue_ox_tavern'];
    assert.deepEqual([q.status, q.history.map((h) => h.status), q.reward], ['active', ['offered', 'active'], '4 silver and a hot meal']);
});

test('a creature the report could not create names nothing: a fact about it keeps its words (live run 27.09. 02:30: mon.cellar_gnawer_pups)', () => {
    const g = ready();
    const r = g.reply({ new: [{ ref: 'pups', kind: 'creature', name: 'Cellar Gnawer pups', species: 'Cellar Gnawer', desc: ['blind nestlings, pink-bellied, fist-sized'] }],
        facts: [{ s: 'Cellar Gnawer pups', p: 'alive in nest at end of', o: 'right-hand passage' }] });
    assert.match(reasons(r), /^creature needs a species that maps to an F1 body-plan anchor/);
    assert.ok(r.accepted.includes('fact Cellar Gnawer pups alive_in_nest_at_end_of right-hand passage'));
    assert.deepEqual(Object.values(g.state.facts).filter((f) => f.s.startsWith('mon.')), []);
});

// Live run 27.09.2026 04:11: the wolf contract of Millbrook Hamlet was reported completed in the hamlet, the reeve's
// signature still to come, and its "8 silver" were paid there as 800 Copper. A Guild contract (a quest with a Quest Rank)
// is taken at the Guild and completed only at a Guild front desk, where the engine pays its posted reward.
const WOLF_BOARD = { title: 'Wolf Problem — Millbrook Hamlet', status: 'offered', giver: 'Millbrook Hamlet', reward: '8 silver on proof of at least two wolves', level: 1, type: 'standard', rank: 'Novice' };

test('a Guild contract is completed only at a Guild front desk, where the engine pays its posted reward and its Quest XP once; in the field it stays active and no coin is booked for it (live run 27.09. 04:11)', () => {
    const g = ready(); // outside Tidecross, a city with a Guild branch
    g.reply({ quests: [WOLF_BOARD] });
    assert.equal(reasons(g.reply({ quests: [{ title: 'Wolf Problem', status: 'completed' }] })), 'the Guild contract "Wolf Problem — Millbrook Hamlet" was never taken: it is taken at the Guild ("active") before it is turned in');
    g.input('*I take the Wolf Problem quest*');
    g.reply({ quests: [{ title: 'Wolf Problem', status: 'active' }] });
    g.input('*I walk to Millbrook Hamlet*');
    g.reply({ location: 'Millbrook Hamlet' });
    // in the hamlet: reported completed, the reeve pays; the contract stays active, the proof is kept, the coin is not booked
    g.input('*I show the reeve the heads and ask for his signature*');
    const r = g.reply({ quests: [{ title: 'Wolf Problem', status: 'completed', note: 'the reeve signed the proof' }], coin: [{ cp: 800, why: 'the reeve pays out' }], items: [{ item: 'signed proof', qty: 1, to: 'pc', why: 'the reeve signed it' }] });
    assert.ok(r.accepted.includes('quest Wolf Problem — Millbrook Hamlet: active (turned in only at a Guild front desk)'));
    assert.ok(r.accepted.includes('item signed proof ×1 to pc'));
    assert.equal(reasons(r), 'the reward of the Guild contract "Wolf Problem — Millbrook Hamlet" is paid by the Guild when Alaric turns it in at a Guild front desk: the engine books the posted 8 Silver then, so no coin is reported for it');
    assert.match(r.corrections.join('\n'), /quest "Wolf Problem — Millbrook Hamlet" stays active: a Guild contract is completed only when Alaric turns it in at a Guild front desk/);
    const wolf = () => g.state.quests['quest.wolf_problem_millbrook_hamlet'];
    const pc = () => g.state.entities.pc.sheet;
    assert.deepEqual([wolf().status, wolf().notes.at(-1), pc().xp, pc().coin_cp], ['active', 'the reeve signed the proof', 0, 50]);
    // what he earns otherwise is his; coin that names the contract is its reward, whenever it comes
    g.input('*I sell a wolf pelt to the tanner*');
    assert.deepEqual(g.reply({ coin: [{ cp: 30, why: 'wolf pelt sold to the tanner' }] }).rejected, []);
    assert.match(reasons(g.reply({ coin: [{ cp: 80, why: 'bounty for the Wolf Problem, as posted' }] })), /^the reward of the Guild contract "Wolf Problem — Millbrook Hamlet" is paid by the Guild/);
    // turned in at the Guild of Tidecross: completed, the posted 8 silver instead of the report's coin, its Quest XP
    g.input('*I walk back to Tidecross and turn in the Wolf Problem quest at the Guild front desk*');
    const t = g.reply({ location: 'Tidecross', place: "Adventurers' Guild hall, front desk", quests: [{ title: 'Wolf Problem', status: 'completed' }], coin: [{ cp: 80, why: 'payout from the clerk' }] });
    assert.deepEqual(t.accepted.filter((a) => /^(?:location|quest|Guild reward|Quest XP|coin)/.test(a)), ['location -> Tidecross', 'quest Wolf Problem — Millbrook Hamlet: completed', 'Guild reward +80 cp', 'Quest XP +20']);
    assert.equal(reasons(t), 'the Guild pays the posted 8 Silver of the Guild contract "Wolf Problem — Millbrook Hamlet" with this turn-in, and the engine books it: no coin is reported for it');
    assert.deepEqual([wolf().status, pc().coin_cp, pc().xp], ['completed', 50 + 30 + 80, 20]);
    // reported completed again, and its reward: nothing is paid twice
    const again = g.reply({ quests: [{ title: 'Wolf Problem — Millbrook Hamlet', status: 'completed' }], coin: [{ cp: 80, why: 'Wolf Problem reward' }] });
    assert.equal(reasons(again), 'the Guild paid the posted 8 Silver of the Guild contract "Wolf Problem — Millbrook Hamlet" when it was turned in, and the engine booked it: no coin is reported for it');
    assert.deepEqual([pc().coin_cp, pc().xp], [160, 20]);
});

test('the Guild pays the first amount its posted reward names; a reward without an amount is paid by nobody; work without a Quest Rank is private and settles where it is done', () => {
    const g = ready();
    g.reply({ quests: [
        { title: 'Cart Guard', status: 'offered', reward: '6 silver plus a meal', level: 1, type: 'standard', rank: 'Novice' },
        { title: 'Boar Damage', status: 'offered', reward: '6 silver flat (+2 silver farmer\'s purse)', level: 1, type: 'minor', rank: 'Novice' },
        { title: 'Night Watch', status: 'offered', reward: 'a hot meal and a bunk', level: 1, type: 'minor', rank: 'Novice' },
    ] });
    g.input('"I take the Cart Guard and the Boar Damage and the Night Watch quests."');
    g.reply({ quests: ['Cart Guard', 'Boar Damage', 'Night Watch'].map((title) => ({ title, status: 'active' })) });
    g.input('*I turn them in at the front desk*');
    const r = g.reply({ quests: ['Cart Guard', 'Boar Damage', 'Night Watch'].map((title) => ({ title, status: 'completed' })) });
    assert.deepEqual(r.accepted.filter((a) => a.startsWith('Guild reward')), ['Guild reward +60 cp', 'Guild reward +60 cp']);
    assert.equal(g.state.entities.pc.sheet.coin_cp, 50 + 120);
    // private work: completed where it is done, paid by whoever hired him
    g.input('*I walk to Millbrook Hamlet*');
    g.reply({ location: 'Millbrook Hamlet' });
    g.reply({ quests: [{ title: 'Mend the Mill Fence', status: 'offered', giver: 'miller', reward: '2 silver', level: 1, type: 'minor' }] });
    g.input('"I\'ll do it."');
    g.reply({ quests: [{ title: 'Mend the Mill Fence', status: 'active' }] });
    g.input('*I mend the fence and take the miller\'s coin*');
    const p = g.reply({ quests: [{ title: 'Mend the Mill Fence', status: 'completed' }], coin: [{ cp: 20, why: 'the miller pays for the mended fence' }] });
    assert.deepEqual(p.rejected, []);
    assert.ok(p.accepted.includes('quest Mend the Mill Fence: completed') && p.accepted.includes('coin pc +20 cp'));
    assert.ok(!p.accepted.some((a) => a.startsWith('Guild reward')));
    assert.equal(g.state.entities.pc.sheet.coin_cp, 190);
});

test('a quest named by a shorter title is the one open quest whose title holds all its words; otherwise it is a new quest (live run 27.09. 04:11)', () => {
    const g = ready();
    g.reply({ quests: [WOLF_BOARD, { title: 'Herb Run', status: 'offered', level: 1, type: 'minor', rank: 'Novice', reward: '4 silver' }] });
    g.input('*I take the Wolf Problem quest*');
    const r = g.reply({ quests: [{ title: 'Wolf Problem', status: 'active', reward: '8 silver', level: 1, type: 'minor', rank: 'Novice' }] });
    assert.deepEqual(r.rejected, []);
    assert.ok(r.accepted.includes('quest Wolf Problem — Millbrook Hamlet: active'));
    assert.deepEqual(Object.keys(g.state.quests), ['quest.wolf_problem_millbrook_hamlet', 'quest.herb_run']);
    const q = g.state.quests['quest.wolf_problem_millbrook_hamlet'];
    assert.deepEqual([q.title, q.history.map((h) => h.status), q.reward, q.qtype], [WOLF_BOARD.title, ['offered', 'active'], WOLF_BOARD.reward, 'standard']);
    // a longer title is another quest; two open quests holding the words are neither; a finished quest is never meant
    g.reply({ quests: [{ title: 'Herb Run — Greyfen', status: 'offered', level: 1, type: 'minor' }, { title: 'Wolf Problem — Eastfields', status: 'offered', level: 1, type: 'standard', rank: 'Novice' }] });
    g.reply({ quests: [{ title: 'Wolf Problem', status: 'offered', level: 1, type: 'minor' }] });
    assert.deepEqual(Object.keys(g.state.quests).slice(2), ['quest.herb_run_greyfen', 'quest.wolf_problem_eastfields', 'quest.wolf_problem']);
    g.reply({ quests: [{ title: 'Lost Ring', status: 'offered', level: 1, type: 'minor' }] });
    g.input('"I\'ll do it."');
    g.reply({ quests: [{ title: 'Lost Ring', status: 'active' }] });
    g.reply({ quests: [{ title: 'Lost Ring', status: 'completed' }] });
    g.reply({ quests: [{ title: 'Ring', status: 'offered', level: 1, type: 'minor' }] });
    assert.deepEqual([g.state.quests['quest.lost_ring'].status, g.state.quests['quest.ring'].status], ['completed', 'offered']);
});

test('the Guild registration is no quest: no Quest XP, no completed contract; its rank, fee and medallion are recorded as such (live run 27.09. 04:11)', () => {
    const g = ready();
    const NO = 'the Guild registration is no quest: it is recorded by its facts (guild_rank), coin and items';
    assert.equal(reasons(g.reply({ quests: [{ title: 'Guild registration', status: 'offered', level: 1, type: 'minor' }] })), NO);
    g.input('"Alaric. I can read and write." *I pay the two silver*');
    const r = g.reply({ quests: [{ title: 'Guild Registration', status: 'completed', level: 1, type: 'minor' }], facts: [{ s: 'pc', p: 'guild_rank', o: 'Novice' }],
        coin: [{ cp: -20, why: 'registration fee' }], items: [{ item: 'Novice Guild medallion', qty: 1, to: 'pc', why: 'registration' }] });
    assert.equal(reasons(r), NO);
    assert.deepEqual([Object.keys(g.state.quests), g.state.entities.pc.sheet.xp, g.state.entities.pc.sheet.coin_cp], [[], 0, 30]);
    assert.equal(truth(g.state, 'pc', 'guild_rank')[0].o, 'Novice');
    assert.equal(g.state.entities.pc.sheet.inventory.novice_guild_medallion, 1);
});

test('a new location has a name: a description ("town with guild hall") creates none, and a place\'s name or a group is no person (live run 27.09. 04:11)', () => {
    const g = ready();
    g.input('*I walk back to town*');
    assert.equal(reasons(g.reply({ location: 'town with guild hall' })), 'location "town with guild hall" names no known city or region and no new one: a location is reported by its name; a spot inside the current one is "place"');
    assert.deepEqual([g.state.scene.location, Object.values(g.state.entities).filter((e) => e.kind === 'location')], ['loc.tidecross', []]);
    g.input('*I walk to Millbrook Hamlet*');
    assert.ok(g.reply({ location: 'Millbrook Hamlet' }).accepted.includes('new location Millbrook Hamlet'));
    g.input('*I walk up into the woods*');
    assert.ok(g.reply({ location: 'eastern woods above Millbrook Hamlet' }).accepted.includes('new location eastern woods above Millbrook Hamlet'));
    // "Millbrook villagers" are villagers, Millbrook and Tidecross are places; Harl is a man
    const r = g.reply({ aware: ['Millbrook villagers', 'Millbrook', 'Tidecross', 'Harl'].map((who) => ({ who, level: 'aware' })) }, 'The Millbrook villagers stare. Harl, the shepherd, nods. Millbrook is quiet; Tidecross is far.');
    assert.deepEqual(r.rejected.map((x) => x.reason), Array(3).fill('aware: unknown person (introduce new people via "new")'));
    assert.ok(r.accepted.includes('named in the story: Harl (npc.harl)'));
    assert.deepEqual(Object.values(g.state.entities).filter((e) => e.kind === 'npc').map((e) => e.name), ['Harl']);
});
