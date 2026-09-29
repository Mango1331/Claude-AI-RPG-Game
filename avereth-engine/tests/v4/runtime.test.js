// Runtime V4 on the chat (src/v4/runtime.js): the commit barrier and its gap, failures of the interpreter and the
// extractor, swipes, edits, resuming after a reload, V3 campaigns untouched, and a fight in a V4 campaign (the V3
// combat engine, unchanged; the reply read by the extractor like every other).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4, GREETING } from './harness.js';
import { ensureCampaign, foldChat, prepareGeneration, rec } from '../../src/host.js';
import {
    prepareGenerationAsync, processReplyAny, runExtraction, applyExtraction, extractionRequest, pendingExtraction, campaignRuntime,
    onEditedV4, LATE_CORRECTION, FAILED_CORRECTION,
} from '../../src/v4/runtime.js';
import { routeTurn } from '../../src/v4/turn.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const T = (id) => gold.turns.find((t) => t.id === id);
const fill = (answer) => {
    const a = structuredClone(answer);
    for (const d of a.deltas || []) {
        const spec = content.deltaVocab.deltas.find((x) => x.type === d.type);
        for (const [k, f] of Object.entries(spec?.fields || {})) if (d[k] === undefined) {
            if (f.nullable) d[k] = null;
            else if (k === 'count') d[k] = 1;
            else if (k === 'anchor' && d.type === 'creature.new') {
                d[k] = [...content.anchors.values()].find((a) => a.aliases.some((x) => x.toLowerCase() === String(d.species || '').toLowerCase()))?.id || 'rat';
            }
        }
    }
    return a;
};

async function created(opts = {}) {
    const g = new Chat4(content, { listings: gold.board_generator.listings, ...opts });
    const w = content.classes.get('warrior');
    await g.player('Warrior');
    await g.player(w.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}

test('the campaign runtime: new V4 campaigns carry it; a V3 chat stays V3 and never calls an LLM', async () => {
    const g = await created();
    assert.equal(campaignRuntime(g.chat), 'v4');
    assert.equal(g.state().meta.runtime, 'v4');
    const chat = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    ensureCampaign(chat, content, { seed: 7 });
    assert.equal(campaignRuntime(chat), 'v3');
    chat.push({ mes: 'Warrior', is_user: true, is_system: false, extra: {} });
    let called = 0;
    const v3 = prepareGeneration(structuredClone(chat), content, {});
    const r = await prepareGenerationAsync(chat, content, { llm: async () => { called += 1; return null; } });
    assert.equal(r.action, v3.action);
    assert.equal(called, 0);
});

test('the greeting of a new chat starts the campaign in the runtime set for new campaigns (SillyTavern 1.19 sends MESSAGE_RECEIVED "first_message" for it)', () => {
    const v4 = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    assert.equal(processReplyAny(v4, 0, content, { seed: 7, runtime: 'v4' }).changed, true);
    assert.equal(campaignRuntime(v4), 'v4');
    assert.equal(foldChat(v4).state.scene.at, 'loc.redmarch.verge');
    const v3 = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    processReplyAny(v3, 0, content, { seed: 7 });
    assert.equal(campaignRuntime(v3), 'v3', 'no runtime given: V3, as before');
});

test('the router: commands, creation, combat and stealth stay with the V3 engine; everything else is a story turn', async () => {
    const g = await created();
    const s = g.state();
    assert.equal(routeTurn(s, content, '#status'), 'v3');
    assert.equal(routeTurn(s, content, '*i sneak along the hedge*'), 'v3');
    assert.equal(routeTurn(s, content, '*i walk to the guild*'), 'v4');
    const fresh = new Chat4(content);
    assert.equal(routeTurn(fresh.state(), content, 'Warrior'), 'v3', 'character creation');
});

test('barrier: a reply not read before the next message is a recorded gap; its late answer is dropped; the next block corrects', async () => {
    const g = await created();
    const t = T('t1');
    await g.player(t.player, t.commands);
    // the reply arrives, its extraction is pending ...
    g.chat.push({ mes: 'He walks up to the Guild hall.', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    assert.equal(processReplyAny(g.chat, id, content, {}).extract, true);
    const req = extractionRequest(g.chat, id, content);
    assert.ok(req);
    // ... and the player sends the next message before it was committed
    const next = await g.player(T('t2').player, T('t2').commands);
    const r = rec(g.chat[id]);
    assert.equal(r.extraction.status, 'late');
    assert.equal(r.events[0].t, 'extract.failed');
    assert.deepEqual(r.corrections, [LATE_CORRECTION]);
    assert.ok(next.context.text.includes(LATE_CORRECTION), 'the next engine block says what was not recorded');
    const late = applyExtraction(g.chat, id, content, { valid: true, complete: true, value: fill(t.recovery), missing: [], errors: [] }, { hash: req.hash });
    assert.equal(late.changed, false, 'a late answer never lands behind a later turn');
    assert.deepEqual(validateState(g.state(), content), []);
});

test('an extractor that answers nothing valid gets one primary call plus one repair, then fails closed', async () => {
    const g = await created();
    const t = T('t1');
    await g.player(t.player, t.commands);
    const r = await g.reply('He walks up to the Guild hall.', 'Sure! He arrived at the hall and met a clerk.');
    assert.equal(r.record.extraction.status, 'failed');
    assert.deepEqual(r.record.events.map((e) => e.t), ['extract.failed']);
    assert.equal(g.calls.filter((c) => c.purpose.startsWith('extract')).length, 2, 'one primary extraction plus one repair only');
    assert.equal(g.state().scene.at, 'loc.redmarch.verge', 'nothing moved');
    assert.match(g.chat[r.id].extra.display_text, /WORLD NOT RECORDED/);
    const next = await g.player(T('t2').player, []);
    assert.ok(next.context.text.includes(FAILED_CORRECTION));
});

test('arriving at a Guild hall does not preload its board; the first explicit board.read generates it', async () => {
    const g = await created();
    const t1 = T('t1');
    await g.player(t1.player, t1.commands);
    await g.reply('He reaches the Guild hall.', fill(t1.recovery));
    assert.equal(g.state().scene.at, 'loc.redmarch.guild_hall');
    assert.equal(g.calls.filter((x) => x.purpose === 'board').length, 0, 'arrival alone does not spend an LLM call on unseen listings');
    assert.equal(Object.values(g.state().quests).filter((q) => q.status === 'listed').length, 0, 'unseen listings do not exist yet');

    const p = await g.player('I read the Novice board.', [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'read the Novice board' }]);
    assert.equal(p.action, 'context');
    assert.equal(g.calls.filter((x) => x.purpose === 'board').length, 1, 'board generation is on-demand');
    assert.ok(Object.values(g.state().quests).some((q) => q.status === 'listed'));
    assert.match(p.context.text, /these listings now become canonical because Alaric actually reads them/);
});

test('an interpreter transport/schema failure aborts narration and is asked again on Regenerate (no cache)', async () => {
    const g = await created();
    const base = g.llm;
    let fail = true;
    g.llm = async (req) => (req.purpose.startsWith('interpret') && fail ? 'I think he wants to go to the guild.' : base(req));
    const p = await g.player(T('t1').player, T('t1').commands);
    const r = rec(g.chat.at(-1));
    assert.equal(p.action, 'abort');
    assert.match(p.notice, /interpreter failed/i);
    assert.equal(r.interp.failed, true);
    assert.deepEqual(r.events, [], 'a failed interpreter does not create a story turn or world events');
    const continued = await prepareGenerationAsync(g.chat, content, { type: 'continue', llm: g.llm });
    assert.equal(continued.action, 'abort', 'Continue cannot bypass a failed interpretation');
    fail = false;
    const again = await prepareGenerationAsync(g.chat, content, { type: 'regenerate', llm: g.llm });
    assert.equal(again.action, 'context');
    assert.deepEqual(g.state().last.outcome.resolutions.map((x) => x.status), ['authorized']);
});

test('a Board generation that failed is not cached: Regenerate asks for the board again, with the same interpretation and dice (plan §3.4, D3)', async () => {
    const g = await created({ boardFails: true });
    for (const id of ['t1', 't2']) {
        const t = T(id);
        await g.player(t.player, t.commands);
        await g.reply('The story goes on.', fill(t.recovery));
    }
    const t3 = T('t3');
    await g.player(t3.player, t3.commands);
    const failed = g.state().last.outcome;
    assert.ok(failed.actions.some((a) => a.includes('invent none')), 'no listing, the narrator invents none');
    const die = failed.check_die;
    const interprets = g.calls.filter((c) => c.purpose.startsWith('interpret')).length;
    const boards = g.calls.filter((c) => c.purpose === 'board').length;
    g.boardFails = false;
    const again = await prepareGenerationAsync(g.chat, content, { type: 'regenerate', llm: g.llm });
    assert.equal(again.action, 'context');
    const o = g.state().last.outcome;
    assert.ok(o.actions.some((a) => a.includes('READS the Novice board — BOARD')), 'the board is canonical now');
    assert.ok(again.context.text.includes("Miller's Run Escort · 80 cp"));
    assert.equal(g.calls.filter((c) => c.purpose.startsWith('interpret')).length, interprets, 'the interpretation is kept');
    assert.ok(g.calls.filter((c) => c.purpose === 'board').length > boards, 'the board was asked for again');
    assert.equal(o.check_die, die);
    assert.equal(g.state().guild.membership?.rank, 'Novice', 'the fee is paid once');
    // a board that was generated is kept: the next Regenerate asks nothing
    const calls = g.calls.length;
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', llm: g.llm });
    assert.equal(g.calls.length, calls);
    assert.deepEqual(validateState(g.state(), content), []);
});

test('a swipe is a new reply: its own extraction; the player\'s commands, their resolution and the dice stay as they were', async () => {
    const g = await created();
    const t = T('t1');
    await g.player(t.player, t.commands);
    const die = g.state().last.outcome.check_die;
    const first = await g.reply('He walks up to the Guild hall.', fill(t.recovery));
    assert.equal(g.state().scene.at, 'loc.redmarch.guild_hall');
    const interprets = g.calls.filter((c) => c.purpose === 'interpret').length;
    // the swipe: SillyTavern copies extra into the new swipe, the text changes
    const msg = g.chat[first.id];
    msg.mes = 'He stays on the verge a while, watching the gate.';
    const again = await prepareGenerationAsync(g.chat.slice(0, first.id), content, { type: 'swipe', llm: g.llm });
    assert.equal(again.action, 'context');
    assert.equal(g.calls.filter((c) => c.purpose === 'interpret').length, interprets, 'no second interpretation');
    assert.equal(processReplyAny(g.chat, first.id, content, {}).extract, true);
    g.answer = fill({ expected: { 1: { arrived: false, at: null } }, deltas: [{ seq: 1, type: 'time', minutes: 15 }] });
    await runExtraction(g.chat, first.id, content, g.llm);
    const s = g.state();
    assert.equal(s.scene.at, 'loc.redmarch.verge', 'this swipe did not arrive');
    assert.equal(s.last.outcome.check_die, die);
});

test('an edited reply keeps what its extraction committed; a reload resumes a pending extraction', async () => {
    const g = await created();
    const t = T('t1');
    await g.player(t.player, t.commands);
    const r = await g.reply('He walks up to the Guild hall.', fill(t.recovery));
    g.chat[r.id].mes = 'He walks up to the Guild hall, tired.';
    assert.equal(onEditedV4(g.chat, r.id).changed, true);
    assert.equal(g.state().scene.at, 'loc.redmarch.guild_hall');
    await g.player(T('t2').player, T('t2').commands);
    g.chat.push({ mes: 'The clerk names the fee.', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    assert.equal(pendingExtraction(g.chat), id, 'index.js restarts it after a reload');
});

test('a fight in a V4 campaign: an attack goes to the V3 combat engine; a committed attacker opens the fight exactly as in V3', async () => {
    const g = await created();
    await g.player('*i walk down into the cellar*', [{ seq: 1, type: 'go', to: { new: 'cellar' }, quote: 'i walk down into the cellar' }]);
    const r1 = await g.reply('Two rats rush at him from the dark.', fill({ expected: { 1: { arrived: true, at: { new: { name: 'cellar', kind: 'site', parent: 'loc.redmarch' } } } }, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'cellar', kind: 'site', parent: 'loc.redmarch' } } },
        { seq: 2, type: 'creature.new', ref: 'cellar rat', species: 'rat', anchor: 'rat', desc: ['grey'], count: 2, present: true, band: 'SHORT' },
        { seq: 3, type: 'hostile', by: ['cellar rat'] },
    ] }));
    assert.equal(r1.record.extraction.status, 'applied');
    let s = g.state();
    assert.ok(s.encounter, 'the fight is open');
    assert.equal(Object.values(s.encounter.combatants).filter((c) => c.id !== 'pc').length, 2, 'two individual rats, no group creature');
    assert.match(g.chat[r1.id].extra.display_text, /COMBAT START/);
    // the player's attack is resolved by the V3 engine: no interpreter call
    const interprets = g.calls.filter((c) => c.purpose === 'interpret').length;
    const target = s.encounter.combatants[s.encounter.order.find((id) => id !== 'pc')].label;
    const w = content.classes.get('warrior');
    const skill = content.skills.get(w.basic_attack).name;
    const p = await g.player(`${skill} on ${target}`, []);
    assert.equal(g.calls.filter((c) => c.purpose === 'interpret').length, interprets);
    assert.equal(g.state().last.outcome.kind, 'combat');
    assert.match(p.context.text, /RESOLVED THIS TURN/);
    assert.doesNotMatch(p.context.text, /FACT REPORT:|write the fact report|report is still due/i);
    assert.ok(p.context.text.includes('No <avereth> block'), 'prose only, in combat too');
    // the combat reply is read too: no travel while the fight runs
    const r2 = await g.reply('He strikes; the rat squeals.', fill({ expected: {}, deltas: [{ seq: 1, type: 'arrive', at: 'loc.redmarch.guild_hall' }] }));
    assert.ok((r2.record.rejected || []).some((x) => x.rule === 'no_go' || x.rule === 'combat'));
    s = g.state();
    assert.notEqual(s.scene.at, 'loc.redmarch.guild_hall');
    assert.deepEqual(validateState(s, content), []);
});
