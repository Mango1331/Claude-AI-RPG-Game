// Patch 7.2C (4.3.0-c.6.6.21): no story store keeps a fight's dead the engine has not booked as the world's truth.
// Live Glimmerdeep: the narrator had four beetles die that the engine never struck; their deaths were refused as
// state, but a story thread kept "four beetles were killed". One check (src/v4/combat_truth.js) guards facts, memories,
// threads (new, updated, resolved) and quest notes; it takes out the clause, keeps the rest, and the narrator hears the
// engine's count. What someone says or believes, a rumour, and a fight remembered without a false count all stay.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { combatTruth } from '../../src/v4/combat_truth.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020.json'), 'utf8'));
const BEETLE = (n) => `mon.crystal_beetle_swarm_${n}`;

/** The live chat up to `n`, with beetles `dead` killed by the engine as well (beetle E fell in the live fight, #33). */
async function live(n, dead = []) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    const m = g.chat.at(-1);
    m.extra.avereth.events.splice(-1, 0, ...dead.map((x) => ({ t: 'entity.status', d: { id: BEETLE(x), status: 'dead' } })));
    g.chat.push({ mes: '*i look around the chamber*', is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'wait', what: 'looking around', minutes: 1, until: null, quote: 'i look around the chamber' }] })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return g;
}
const reply = (g, prose, deltas) => g.reply(prose, { expected: {}, deltas: deltas.map((d, i) => ({ seq: i + 1, ...d })) });
const deadBeetles = (s) => Object.values(s.entities).filter((e) => e.id.startsWith('mon.crystal_beetle') && e.status === 'dead').length;
const threads = (s) => Object.values(s.threads || {}).map((t) => t.text);
const rejected = (r) => (r.record.rejected || []).map((x) => x.rule);
const THREAD = (text, more = {}) => ({ type: 'thread', id: null, text, kind: 'threat', status: 'open', resolution: null, ...more });

test('patch 7.2C: "four beetles were killed" with none, two or four booked: refused with none or two, kept with four; the engine\'s dead are never changed', async () => {
    for (const [n, dead, kept] of [[31, [], false], [37, [2], false], [37, [2, 3, 4], true]]) {
        const g = await live(n, dead);
        const before = deadBeetles(g.state());
        const r = await reply(g, 'Four beetles were killed in the fight at the vein.', [THREAD('Four beetles were killed at the vein; the rest of the swarm watches Alaric.')]);
        const s = g.state();
        assert.equal(deadBeetles(s), before, 'no death is booked by a story store');
        const t = threads(s).find((x) => /rest of the swarm/.test(x));
        if (kept) assert.equal(t, 'Four beetles were killed at the vein; the rest of the swarm watches Alaric.', `${before} dead`);
        else {
            assert.equal(t, 'the rest of the swarm watches Alaric.', `${before} dead: the false clause goes, the rest stays`);
            assert.ok(r.record.corrections.some((c) => new RegExp(`The engine's fights have ${before ? `killed ${before}` : 'killed none'} of the beetles`).test(c)), r.record.corrections.join('\n'));
        }
    }
});

test('patch 7.2C: a false kill as a fact, a memory, a thread and a thread update is refused; a fact or memory of the fight without it stays', async () => {
    const g = await live(37); // beetle E dead, eleven alive
    const r = await reply(g, 'Alaric fought the beetles at the vein. Four beetles were killed.', [
        { type: 'fact', s: 'loc.glimmerdeep_grotto', p: 'holds', o: 'four dead crystal beetles' },
        { type: 'fact', s: 'loc.glimmerdeep_grotto', p: 'scarred_by', o: 'a fight with crystal beetles at the vein' },
        { type: 'memory', text: 'Alaric fought the beetles at the vein. Four beetles were killed.', who: ['pc'], imp: 7 },
        { type: 'memory', text: 'Four beetles were killed at the vein.', who: ['pc'], imp: 7 },
        THREAD('All the beetles were slain.'),
    ]);
    const s = g.state();
    assert.ok(rejected(r).filter((x) => x === 'engine_owned_fact').length === 1, JSON.stringify(r.record.rejected));
    assert.ok(Object.values(s.facts).some((f) => f.p === 'scarred_by'), 'the fight as a fact stays');
    assert.ok(!Object.values(s.facts).some((f) => /four dead/.test(String(f.o))));
    const mems = Object.values(s.memories || {}).map((m) => m.text);
    assert.ok(mems.some((m) => /^(?:Alaric|\{pc\}) fought the beetles at the vein\.$/.test(m)), mems.join(' | '));
    assert.ok(!mems.some((m) => /four beetles were killed/i.test(m)));
    assert.equal(rejected(r).filter((x) => x === 'engine_owned_combat').length, 2, 'the memory and the thread that held only the false deaths');
    assert.ok(!threads(s).some((t) => /slain/.test(t)));
    // an existing thread updated with a false count: the update keeps its rest, never the count
    const t = await reply(g, 'The swarm masses at the vein.', [THREAD('The swarm masses at the vein, watching Alaric.')]);
    const id = Object.values(g.state().threads).find((x) => /masses at the vein/.test(x.text)).id;
    await reply(g, 'Six beetles were killed; the rest scatter.', [{ ...THREAD('Six beetles were killed; the rest scatter.'), id }]);
    assert.equal(g.state().threads[id].text, 'the rest scatter.');
    await reply(g, 'Six beetles were killed.', [{ ...THREAD('The swarm masses at the vein, watching Alaric.'), id, status: 'resolved', resolution: 'Six beetles were killed.' }]);
    assert.equal(g.state().threads[id].status, 'open', 'not resolved by deaths that did not happen');
    assert.ok(t.record);
});

test('patch 7.2C: what someone believes or rumours stays theirs; a killed fighter the engine has alive is refused; an unknown kind killed by Alaric is no truth', async () => {
    const g = await live(37);
    const r = await reply(g, 'Marrec believes four beetles were killed down there.', [
        { type: 'memory', text: 'Marrec believes four beetles were killed in the grotto.', who: ['npc.npcthessaly_shopkeeper'], imp: 6 },
        THREAD('Word in Thessaly says Alaric slew a dozen beetles.', { kind: 'rumor' }),
        THREAD('Alaric slew twenty beetles in a single night.', { kind: 'rumor' }),
        THREAD('Crystal Beetle A was killed by the scroll.'),
        THREAD('Alaric killed two glimmerbats in the dark.'),
        THREAD('The hunter killed two deer last spring.', { kind: 'other' }),
    ]);
    const s = g.state();
    const mems = Object.values(s.memories || {}).map((m) => m.text);
    assert.ok(mems.includes('Marrec believes four beetles were killed in the grotto.'), 'his belief, attributed');
    assert.ok(threads(s).includes('Word in Thessaly says Alaric slew a dozen beetles.'), 'a rumour');
    assert.ok(threads(s).includes('Alaric slew twenty beetles in a single night.'), 'a rumour is a claim, whatever its words');
    assert.ok(!threads(s).some((t) => /Beetle A was killed/.test(t)), 'beetle A lives');
    assert.ok(!threads(s).some((t) => /glimmerbats/.test(t)), 'no glimmerbat the engine fought');
    assert.ok(threads(s).includes('The hunter killed two deer last spring.'), 'lore of the world, no fight of the engine');
    assert.ok(r.record.corrections.some((c) => /alive, as the engine has it/.test(c)));
});

test('patch 7.2C: four kills booked by the engine are remembered as told; the fold keeps the same stores', async () => {
    const g = await live(37, [2, 3, 4]); // E plus three more: four dead
    await reply(g, 'Four beetles were killed at the vein; the others retreated.', [
        { type: 'memory', text: 'Four beetles were killed at the vein; the others retreated.', who: ['pc'], imp: 7 },
        THREAD('The swarm lost four of its own and retreated deeper.'),
    ]);
    const s = g.state();
    assert.ok(Object.values(s.memories).some((m) => m.text === 'Four beetles were killed at the vein; the others retreated.'), 'kept as told');
    assert.deepEqual(foldChat(g.chat).state.memories, s.memories, 'the fold holds the same');
    const check = combatTruth(s, content);
    assert.equal(check('Four beetles were killed.'), null);
    assert.ok(check('Five beetles were killed.'));
    assert.equal(check('The merchant says five beetles were killed.'), null);
    assert.equal(check('Not one more beetle died.'), null);
});
