// 4.3.0-c.6.6.52 (docs/PATCH9C_COMPLETION.md §13): the short live test of the 9C completion. The evaluator follows a
// Skill development from his own fights by the engine's events: the fights noted, the offer, his acceptance, his checks
// (#skills, #skill <name>) and its use in a later fight; a person's own technique (NPC signature) met and used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject, lastUser } from '../v4/patch8_lib.js';
import { scaleCreature } from '../../src/npcgen.js';
import { deriveCharacter } from '../../src/derived.js';
import { skillOffers } from '../../src/v4/skill_growth.js';
import { evaluate, finished } from '../../tools/st_live/live/evaluator.mjs';
import { loadGuide, guideErrors } from '../../tools/st_live/live/guide.mjs';

const content = await loadProductContent();
const reply = (g, prose = 'They fight.') => g.reply(prose, { expected: {}, deltas: [] });

async function hero() {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    const base = g.llm;
    g.llm = async (q) => (q.purpose.startsWith('forge') ? 'not json' : base(q));
    return g;
}
let N = 0;
/** A real fight against two wolves ENGAGED with him, his Skills by turn (plan(i)), until it is over. */
async function fight(g, plan) {
    N += 1;
    const dv = deriveCharacter(g.state().entities.pc.sheet, content);
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: dv.maxHp } }, { t: 'resource.changed', d: { id: 'pc', resource: 'sta', value: dv.maxSta } }]);
    const ids = [0, 1].map((i) => `mon.r${N}_${i}`);
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, ids.flatMap((id) => [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', group: `grp.r${N}`, status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: 50, hp: 50 } } } },
        { t: 'scene.entered', d: { id, band: 'ENGAGED', cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]));
    for (let i = 0; i < 16; i++) {
        const target = ids.find((id) => g.state().entities[id]?.status !== 'dead');
        if (!target) break;
        const skill = plan(i);
        const self = !content.skills.get(skill)?.attack && !g.state().skill_defs?.[skill]?.attack;
        await say(g, '*i fight on*', { type: 'use_skill', skill, target: self ? null : target, quote: 'i fight on' });
        if (!g.state().encounter && !(g.state().pending_combat || []).length) break;
        await reply(g);
    }
    assert.ok(lastUser(g).events.find((e) => e.t === 'encounter.ended'), 'the fight ended');
    await reply(g, 'Over.');
}
// a fight opens with an attack; Guard and Heavy Slash one after the other from then on (the pair is the same either way)
const guardThenSlash = (t) => (t % 2 ? 'warrior.guard' : 'warrior.heavy_slash');

test('.52 runner: current_test is the short 9C completion test: a Warrior, required development milestones, at most 35 turns', () => {
    const g = loadGuide('current_test');
    assert.deepEqual(guideErrors(g), []);
    assert.deepEqual(g.character, { class: 'Warrior', skills: ['Heavy Slash', 'Guard'] });
    assert.deepEqual(g.milestones.filter((m) => m.required !== false).map((m) => m.id), ['creation_complete', 'skill_development_offered', 'skill_development_accepted', 'skill_development_verified', 'developed_skill_used']);
    assert.ok(g.limits.maxTurns <= 35);
    // 4.3.0-c.6.6.53 (both .52 live runs ended in his death): survival before the pattern
    assert.match(g.brief, /Survival comes first, before any pattern/);
    assert.match(g.brief, /about 40% or below, stop the pattern and retreat/);
    assert.match(g.brief, /rest or sleep in a safe place until your HP is full/);
});

test('.52 runner: the evaluator follows a development from his fights: noted, offered, accepted, checked, used; not done before its use', async () => {
    const guide = loadGuide('current_test');
    const g = await hero();
    const ms = () => Object.fromEntries(evaluate(g.chat, { guide }).milestones.map((m) => [m.id, m.reached]));
    await fight(g, guardThenSlash);
    assert.equal(ms().skill_pattern_noted, true);
    assert.equal(ms().skill_development_offered, false, 'one fight offers nothing');
    await fight(g, guardThenSlash);
    await fight(g, guardThenSlash);
    const offer = skillOffers(g.state()).find((d) => d.development === 'combination');
    assert.ok(offer);
    const ev = evaluate(g.chat, { guide });
    assert.deepEqual([ev.reached.skill_development_offered.name, ev.reached.skill_development_offered.development, ev.growth.noted.length], [offer.skill.name, 'combination', 3]);
    assert.equal(ms().skill_development_accepted, false, 'offered is not his');
    await say(g, 'I accept it.', { type: 'development.accept', offer: offer.id, replace: null, quote: 'I accept it' });
    await reply(g, 'It is his.');
    assert.deepEqual([ms().skill_development_accepted, ms().skill_development_verified], [true, false]);
    assert.equal(evaluate(g.chat, { guide }).reached.skill_development_accepted.name, offer.skill.name);
    await say(g, '#skills');
    assert.equal(ms().skill_development_verified, false, 'one of two checks');
    await say(g, `#skill ${offer.skill.name.toLowerCase()}`);
    assert.equal(ms().skill_development_verified, true);
    assert.equal(finished(evaluate(g.chat, { guide })), false, 'not used yet');
    await fight(g, (t) => (t % 2 ? 'warrior.guard' : offer.skill.id));
    const done = evaluate(g.chat, { guide });
    assert.equal(done.reached.developed_skill_used.skill, offer.skill.id);
    assert.equal(finished(done), true);
});

test('.52 runner: a person with a technique of their own is seen when met and when they use it, never for him', async () => {
    const guide = { milestones: [{ id: 'npc_signature_met' }, { id: 'npc_signature_used' }] };
    const g = await hero();
    const sig = { id: 'dyn.sig_test', name: "Bren's Rushing Quick Slash" };
    inject(g, [{ t: 'entity.sheet_set', d: { id: 'pc', sheet: { generated: { signature: 'dyn.other' } } } }]);
    assert.deepEqual(evaluate(g.chat, { guide }).milestones.map((m) => m.reached), [false, false], 'his own sheet is no person of the world');
    inject(g, [{ t: 'skill.defined', d: { skill: sig } }, { t: 'entity.sheet_set', d: { id: 'npc.bren', sheet: { generated: { signature: sig.id } } } }]);
    let ev = evaluate(g.chat, { guide });
    assert.deepEqual([ev.reached.npc_signature_met.name, ev.reached.npc_signature_used], [sig.name, undefined]);
    inject(g, [{ t: 'outcome.recorded', d: { outcome: { records: [{ actor: 'npc.bren', kind: 'attack', skill: 'warrior.basic_attack' }] }, situations: [] } }]);
    assert.equal(evaluate(g.chat, { guide }).reached.npc_signature_used, undefined, 'another Skill of theirs');
    inject(g, [{ t: 'outcome.recorded', d: { outcome: { records: [{ actor: 'npc.bren', kind: 'attack', skill: sig.id }] }, situations: [] } }]);
    ev = evaluate(g.chat, { guide });
    assert.equal(ev.reached.npc_signature_used.entityId, 'npc.bren');
});
