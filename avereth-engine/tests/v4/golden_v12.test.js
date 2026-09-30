// Runtime V4, golden path (plan §11.1): the live run of 27.09.2026 07:10 (V12, eight story turns: Guild hall,
// registration, board, two contracts, reedbeds, gathering, turn-in, inn) played through the product's host path with
// the narrator's recorded prose (tests/eval/deltas.jsonl, run V12) and the gold of P0/S3 (tests/testrun_v12/gold_v4.json):
// the interpreter answers the gold commands, the extractor the gold answers of variant A, the Board generator the gold
// listings. It checks what S3 checked on its throwaway prototype, now on the product: resolutions, PLAYER ACTIONS, the
// state after each message and reply, the twelve expectations E1–E12, the extra checks X1–X6 and the end state, the
// invariants after every step, and that the narrator is never asked for a fact report.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { validateState } from '../../src/validate.js';
import { pathNames } from '../../src/v4/domain.js';
import { checkProof } from '../../src/v4/guild.js';
import { questXp } from '../../src/progression.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { V4_OUTPUT_LINE } from '../../src/context.js';
import { formatClock } from '../../src/util.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const v12 = fs.readFileSync(path.join(ROOT, 'tests/eval/deltas.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((t) => t.run === 'V12');
const PROSE = new Map(gold.turns.map((t, i) => [t.id, v12[i].reply]));
const T = (id) => gold.turns.find((t) => t.id === id);

/**
 * The gold answer in the product's vocabulary. The gold was written in the P0 draft (delta-0.1); delta-0.2 added
 * fields that are nullable or have a neutral value (person.new/creature.new band, creature.new count/anchor, buy/pay
 * taken_anyway): they are filled from the established species/body-plan where needed, nothing else changes.
 */
export function toProduct(answer, expectedKeys = {}) {
    const a = structuredClone(answer);
    const vocab = content.deltaVocab;
    for (const d of a.deltas || []) {
        const spec = vocab.deltas.find((x) => x.type === d.type);
        for (const [k, f] of Object.entries(spec?.fields || {})) {
            if (d[k] !== undefined) continue;
            if (f.nullable) d[k] = null;
            else if (k === 'count') d[k] = 1;
            else if (k === 'anchor' && d.type === 'creature.new') {
                d[k] = [...content.anchors.values()].find((a) => a.aliases.some((x) => x.toLowerCase() === String(d.species || '').toLowerCase()))?.id || 'rat';
            }
        }
    }
    for (const [k, t] of Object.entries(expectedKeys)) if ((t === 'buy' || t === 'pay') && a.expected?.[k] && a.expected[k].taken_anyway === undefined) a.expected[k].taken_anyway = false;
    return a;
}
const answerOf = (turn, which = 'recovery') => toProduct(turn[which], turn.expected_keys);

function excerpt(s) {
    return {
        clock: formatClock(s.clock.minute).split(' (')[0],
        coin_cp: s.entities.pc.sheet.coin_cp,
        xp: s.entities.pc.sheet.xp,
        member: s.guild.membership?.rank ?? null,
        scene_at: s.scene.at,
        scene_path: pathNames(s, s.scene.at),
        present: s.scene.present.filter((x) => x !== 'pc'),
        quests: Object.fromEntries(Object.values(s.quests).filter((q) => !['listed', 'taken_by_other'].includes(q.status)).map((q) => [q.id, q.status])),
        listings: Object.fromEntries(Object.values(s.quests).filter((q) => q.kind === 'guild_contract' && (q.status === 'listed' || q.status === 'taken_by_other' || (q.history || []).some((h) => h.status === 'listed'))).map((q) => [q.id, q.status])),
        objects: Object.fromEntries(Object.values(s.objects).map((o) => [o.id, o.holder?.entity ?? o.holder?.loc ?? (o.holder?.consumed ? 'consumed' : null)])),
        offers: Object.fromEntries(Object.values(s.offers).map((o) => [o.id, o.status])),
        offers_open_lines: Object.values(s.offers).filter((o) => o.status === 'open' && !o.canon).flatMap((o) => o.lines.map((l) => l.price_cp)),
        decisions: s.decisions.map((d) => d.kind),
        novice_contracts_done: Object.values(s.quests).filter((q) => q.kind === 'guild_contract' && q.rank === 'Novice' && q.status === 'completed').length,
    };
}

/** Gold values that name people or objects by the prototype's ids are compared by what they mean. */
function subsetDiff(want, got, g, pathName = '') {
    const out = [];
    for (const [k, v] of Object.entries(want || {})) {
        if (k === 'present') {
            // the prototype named people by role, the product by the ref it was introduced with (V3 rules): count them
            if ((got.present || []).length !== v.length) out.push(`present: expected ${v.length}, got ${JSON.stringify(got.present)}`);
            continue;
        }
        const gv = got?.[k];
        // Gold V12 records the historical 15 XP; keep its original file immutable,
        // while testing current configured Quest-XP balance for the identical minor L1 job.
        const expected = k === 'xp' && v === 15 ? questXp(1, 'minor', content) : v;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const mapped = Object.fromEntries(Object.entries(v).map(([id, x]) => [g.ids.get(id) || id, x]));
            out.push(...subsetDiff(mapped, gv, g, `${pathName}${k}.`));
        } else if (JSON.stringify(expected) !== JSON.stringify(gv)) out.push(`${pathName}${k}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(gv)}`);
    }
    return out;
}

async function newGame(opts = {}) {
    const g = new Chat4(content, { listings: gold.board_generator.listings, ...opts });
    const w = content.classes.get('warrior');
    const skills = w.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and ');
    await g.player('Warrior');
    await g.player(skills);
    return g;
}

/** Play the gold turns; returns per turn: the prepare result, the state after the message and after the reply. */
async function play(g, { stopAt = null, override = {} } = {}) {
    const out = [];
    for (const t of gold.turns) {
        const o = override[t.id] || {};
        const prep = await g.player(o.player ?? t.player, o.commands ?? t.commands);
        const afterPlayer = g.state();
        const problemsP = validateState(afterPlayer, content);
        const rep = prep.action === 'context' ? await g.reply(PROSE.get(t.id), o.answer ?? answerOf(t)) : null;
        const afterReply = g.state();
        const problemsR = validateState(afterReply, content);
        out.push({ id: t.id, prep, afterPlayer, afterReply, rep, outcome: afterPlayer.last.outcome, problems: [...problemsP, ...problemsR] });
        if (stopAt === t.id) break;
    }
    return out;
}

const main = await newGame();
const run = await play(main);
const R = (id) => run.find((x) => x.id === id);

// the one refusal on the golden path: the 3.1.7 narrator's "Novices may take only Novice contracts without a desk-clerk
// waiver" (gold t2, seq 1) invents a contract rule the engine does not have; since the live run of 28.09.2026 the
// Guild's ranks and rules are the engine's canon and such a fact is refused (guild_canon)
const EXPECTED_REFUSALS = { t2: [{ seq: 1, type: 'fact', rule: 'guild_canon' }] };

test('V12 golden path: every turn resolves as gold, PLAYER ACTIONS as gold, state as gold, no refusal but the expected one, invariants hold', () => {
    const problems = [];
    for (const t of gold.turns) {
        const r = R(t.id);
        assert.equal(r.prep.action, 'context', `${t.id}: a story turn with a narrator reply`);
        const res = r.outcome.resolutions.map((x) => ({ seq: x.seq, status: x.status, ...(x.reason ? { reason: x.reason } : {}), ...(x.cap ? { cap: x.cap } : {}), ...(x.condition ? { condition: x.condition } : {}) }));
        for (const w of t.resolutions) {
            const got = res.find((x) => x.seq === w.seq);
            for (const [k, v] of Object.entries(w)) if (got?.[k] !== v) problems.push(`${t.id} resolution ${w.seq}.${k}: expected ${v}, got ${got?.[k]}`);
        }
        const text = [...r.outcome.actions, ...(r.outcome.extra || [])].join('\n');
        for (const s of t.actions_contains || []) if (!text.includes(s)) problems.push(`${t.id}: PLAYER ACTIONS lack "${s}"`);
        problems.push(...subsetDiff(t.after_player || {}, excerpt(r.afterPlayer), main).map((x) => `${t.id} after message: ${x}`));
        const rec = r.rep.record;
        problems.push(...subsetDiff(t.after_reply || {}, { ...excerpt(r.afterReply), corrections: (rec.corrections || []).length }, main).map((x) => `${t.id} after reply: ${x}`));
        if (rec.extraction?.status !== 'applied') problems.push(`${t.id}: extraction ${rec.extraction?.status}`);
        const refused = (rec.rejected || []).map((x) => ({ seq: x.seq, type: x.type, rule: x.rule }));
        if (JSON.stringify(refused) !== JSON.stringify(EXPECTED_REFUSALS[t.id] || [])) problems.push(`${t.id}: refused ${JSON.stringify(rec.rejected)}`);
        problems.push(...r.problems.map((x) => `${t.id} invariant: ${x}`));
    }
    assert.deepEqual(problems, []);
});

test('V12 golden path: the narrator gets PLAYER ACTIONS and is never asked for a fact report; the reply stays prose', () => {
    for (const t of gold.turns) {
        const text = R(t.id).prep.context.text;
        assert.match(text, /PLAYER ACTIONS \(the engine resolved Alaric's message/);
        assert.ok(text.endsWith(V4_OUTPUT_LINE), `${t.id}: the prose-only line comes last`);
        assert.doesNotMatch(text, /FACT REPORT|End EVERY reply with <avereth>/);
        assert.doesNotMatch(text, /CHECK DIE for this reply/);
        assert.match(text, /ORDINARY WORLD FICTION|SEARCH RESOLUTION is already rolled and binding/);
    }
    // the interpreter and the extractor were called once per story turn (no repair was needed); the board once
    const purposes = main.calls.map((c) => c.purpose);
    assert.equal(purposes.filter((p) => p === 'interpret').length, 8);
    assert.equal(purposes.filter((p) => p === 'extract').length, 8);
    assert.equal(purposes.filter((p) => p === 'board').length, 1, 'the board is generated once, on the first arrival at the hall');
});

test('E1–E3: the board is canonical before it is shown; Miller\'s Run is Novice work from the listing; Ossler exists, not met', () => {
    const t3 = R('t3');
    const listed = Object.values(t3.afterPlayer.quests).filter((q) => q.status === 'listed');
    assert.equal(listed.length, 5);
    assert.deepEqual(gold.board_generator.listings.map((l) => t3.afterPlayer.quests[main.ids.get(l.id)]?.payout_cp), [80, 150, 40, 20, 50]);
    assert.equal(t3.afterReply.quests[main.ids.get('quest.weasel_fenwick')].status, 'taken_by_other');
    const m = main.ids.get('quest.millers_run_escort');
    assert.equal(R('t4').afterPlayer.quests[m].status, 'active');
    assert.equal(R('t4').afterPlayer.quests[m].rank, 'Novice');
    const s = R('t4').afterReply;
    assert.ok(s.entities['npc.ossler'], 'Ossler exists');
    assert.ok(!s.scene.present.includes('npc.ossler'), 'not here');
    assert.equal(Object.keys(s.knowledge['npc.ossler'] || {}).length, 0, 'he knows nothing of Alaric');
    assert.equal(s.memories.filter((x) => (x.who || []).includes('npc.ossler') || (x.witnesses || []).includes('npc.ossler')).length, 0, 'no meeting');
    assert.equal(s.entities['npc.ossler'].at, 'loc.redmarch.harrows_mill_yard');
});

test('E4–E6: "register the Herb Run" is an acceptance at the desk, witnessed by the clerk before he leaves; the reedbeds lie under the mill leat', () => {
    const t5 = R('t5');
    assert.equal(t5.outcome.resolutions[0].status, 'resolved');
    const herb = main.ids.get('quest.herb_run_marshmint');
    assert.equal(t5.afterPlayer.quests[herb].status, 'active');
    const k = t5.afterPlayer.knowledge['npc.guild_clerk']?.[`f.pc.accepted.${herb}`];
    assert.ok(k && k.source === 'witnessed' && k.turn === t5.afterPlayer.turn, 'witnessed in the turn of message 13, at the desk');
    assert.deepEqual(pathNames(t5.afterReply, t5.afterReply.scene.at), ['reedbeds', 'eastern mill leat', 'Redmarch', 'Veyrhold']);
});

test('E7–E10: a long gathering is authorised; the marshmint is an object; "carry it back to the Guild" is take + go + conditional turn-in; the desk checks the proof and pays', () => {
    const t6 = R('t6');
    assert.equal(t6.outcome.resolutions[0].cap, 560);
    assert.equal(excerpt(t6.afterReply).clock, 'Day 1, 15:40');
    assert.equal(t6.afterReply.objects['obj.t16.marshmint'].holder.loc, 'loc.redmarch.eastern_mill_leat.reedbeds');
    const t7 = R('t7');
    assert.equal(t7.afterPlayer.objects['obj.t16.marshmint'].holder.entity, 'pc');
    assert.deepEqual(t7.outcome.resolutions.map((x) => x.status), ['resolved', 'authorized', 'conditional']);
    const e = excerpt(t7.afterReply);
    assert.equal(e.quests[main.ids.get('quest.herb_run_marshmint')], 'completed');
    assert.equal(e.coin_cp, 70);
    assert.equal(e.xp, questXp(1, 'minor', content));
    assert.equal(e.objects['obj.t16.marshmint'], 'consumed');
    assert.equal(e.novice_contracts_done, 1);
    const ev = t7.rep.record.events.map((x) => x.t);
    const order = ['proof.checked', 'object.consumed', 'coin.changed', 'xp.changed', 'quest.status', 'cmd.completed'].map((x) => ev.indexOf(x));
    assert.ok(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), `proof before payout before completion: ${ev.join(', ')}`);
});

test('E11: looking for an inn books no price: buy pending, the inn\'s offer 4/2/1 cp, coin unchanged, the overreach is not applied and corrected', () => {
    const t8 = R('t8');
    assert.equal(t8.outcome.resolutions[2].status, 'pending');
    const e = excerpt(t8.afterReply);
    for (const p of [4, 2, 1]) assert.ok(e.offers_open_lines.includes(p));
    assert.equal(e.coin_cp, 70);
    assert.deepEqual(e.decisions, ['purchase'], 'the wish for a room waits for his agreement, at the inn');
    const rec = t8.rep.record;
    assert.ok(rec.system.some((x) => x.startsWith('NOT APPLIED')));
    assert.equal(rec.corrections.length, 1);
    assert.match(main.chat[t8.rep.id].extra.display_text, /NOT APPLIED/);
});

test('E12: a coercion by the seller of an open offer is refused; an old report key fails the schema', async () => {
    const t8 = T('t8');
    const g = await newGame();
    const a = answerOf(t8);
    a.deltas.push(toProduct({ deltas: [gold.variants.coerce_by_seller] }).deltas[0]);
    const run2 = await play(g, { override: { t8: { answer: a } } });
    const rec = run2.at(-1).rep.record;
    assert.ok((rec.rejected || []).some((r) => r.type === 'coerce' && /sale/.test(r.why)));
    assert.equal(excerpt(run2.at(-1).afterReply).coin_cp, 70);
    const bad = { ...answerOf(t8), deltas: [...answerOf(t8).deltas, gold.variants.old_report_key] };
    const p = parseExtraction(JSON.stringify(bad), content.deltaVocab, { places: ['loc.redmarch'], quests: [], objects: [] }, t8.expected_keys);
    assert.equal(p.valid, false);
});

test('X1, X2: the registration is pending with the canon fee, then paid (by accepting the offer, or by paying the clerk)', async () => {
    assert.equal(R('t2').outcome.resolutions[0].status, 'pending');
    assert.equal(excerpt(R('t2').afterReply).offers['offer.registration'], 'open');
    const e = excerpt(R('t3').afterPlayer);
    assert.equal(e.coin_cp, 30);
    assert.equal(e.member, 'Novice');
    assert.equal(e.objects['obj.guild_plate'], 'pc');
    const g = await newGame();
    const r2 = await play(g, { stopAt: 't3', override: { t3: { commands: gold.variants.pay_for_registration } } });
    assert.equal(excerpt(r2.at(-1).afterPlayer).member, 'Novice');
    assert.equal(excerpt(r2.at(-1).afterPlayer).coin_cp, 30);
});

test('X3, X4: a turn-in in the reedbeds without going to a hall is refused; a reply that does not reach the hall turns nothing in', async () => {
    const g = await newGame();
    // the variant's words are the message (the agency guard drops a command whose quote the message does not contain)
    const r3 = await play(g, { stopAt: 't7', override: { t7: { player: '*i turn the quest in*', commands: gold.variants.turn_in_outside, answer: { expected: {}, deltas: [] } } } });
    assert.equal(r3.at(-1).outcome.resolutions[0].status, 'refused');
    assert.equal(r3.at(-1).outcome.resolutions[0].reason, 'not at a Guild hall');
    const g2 = await newGame();
    const r4 = await play(g2, { stopAt: 't7', override: { t7: { answer: toProduct(gold.variants.reply18_not_arrived) } } });
    const last = r4.at(-1);
    assert.equal(excerpt(last.afterReply).quests[g2.ids.get('quest.herb_run_marshmint')], 'active');
    assert.equal(excerpt(last.afterReply).coin_cp, 30);
    assert.ok(last.rep.record.events.some((x) => x.t === 'cmd.expired'));
});

test('X5: an answer without an expected key is incomplete, not invalid; the repair asks for it, and what stays open is not done', async () => {
    const t7 = T('t7');
    const p = parseExtraction(JSON.stringify(gold.variants.reply18_missing_expected), content.deltaVocab, { places: ['loc.redmarch', 'loc.redmarch.guild_hall'], quests: [], objects: [] }, t7.expected_keys);
    assert.equal(p.valid, true);
    assert.equal(p.complete, false);
    assert.deepEqual(p.missing, ['2']);
    const g = await newGame();
    const r = await play(g, { stopAt: 't7', override: { t7: { answer: toProduct(gold.variants.reply18_missing_expected) } } });
    assert.equal(g.calls.filter((c) => c.purpose === 'extract_repair').length >= 1, true, 'the repair asked again');
    // the arrive delta itself is there: the hall is reached and the conditional turn-in fires
    assert.equal(excerpt(r.at(-1).afterReply).quests[g.ids.get('quest.herb_run_marshmint')], 'completed');
});

test('X6: when the Board generator fails there is no listing; the narrator is told to invent none; prose contracts are only overreach; no acceptance', async () => {
    const g = await newGame({ boardFails: true });
    const r = await play(g, {
        stopAt: 't4',
        override: {
            t3: { answer: toProduct(gold.variants.generator_failure.reply10_recovery) },
            t4: { commands: gold.variants.generator_failure.msg11_commands, answer: { expected: {}, deltas: [] } },
        },
    });
    const s = r.at(-1).afterReply;
    assert.equal(Object.values(s.quests).length, 0, 'no contract exists');
    assert.ok(r[2].outcome.actions.some((a) => a.includes('invent none')));
    const rec3 = r[2].rep.record;
    assert.ok(rec3.corrections.some((c) => /Official Guild contracts come only from the board/.test(c)));
    assert.ok((rec3.rejected || []).some((x) => x.type === 'quest.offer' && x.rule === 'guild_listing'));
    assert.equal(r[3].outcome.resolutions[0].status, 'refused');
    assert.ok(s.events === undefined);
    assert.ok(g.chat.some((m) => m.extra?.avereth?.events?.some((e) => e.t === 'board.failed')), 'the failed generation is on record');
});

test('END: day 1, 18:45, 70 cp, configured Quest XP, at the Marsh Bell under Redmarch; Miller\'s Run active with its proof still open', () => {
    const s = main.state();
    const e = excerpt(s);
    assert.equal(e.clock, gold.end_state.clock);
    assert.equal(e.coin_cp, gold.end_state.coin_cp);
    assert.equal(e.xp, questXp(1, 'minor', content));
    assert.equal(e.scene_at, gold.end_state.scene_at);
    assert.deepEqual(e.scene_path.slice(-2), ['Redmarch', 'Veyrhold']);
    const m = s.quests[main.ids.get('quest.millers_run_escort')];
    assert.equal(m.status, 'active');
    const p = checkProof(s, m);
    assert.equal(p.ok, false);
    assert.match(p.reason, /signed by the waystation master/);
});
