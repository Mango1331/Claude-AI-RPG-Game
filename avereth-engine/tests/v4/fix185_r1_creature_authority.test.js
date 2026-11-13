// Build .185 – Monster A1 review R1 (patch_plans_10b/REVIEW_MONSTER_A1_184_PRODUKTDIFF_GPT.md §2 R1): since .184 a new
// creature's full look (traits, up to 240 characters) is read by the World Envelope's role check, so a role word told
// after the 40 characters of a descriptor ("… bred in the hills as a guard", "… kept by a thief") made a creature an
// authority (fine, confiscation) or a robber. Reproduced on the host's reply path (User01 #66, Glassmere): a hound
// fined Alaric 5 cp. The guard: a role word counts only for a person (kind npc); a creature still takes what a fight
// with him gives it (pending combat, fighting him), and a real guard or thief keeps the envelope's rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { replyTurnV4 } from '../../src/v4/turn.js';
import { reactionEnvelope, mayTake } from '../../src/v4/envelope.js';

const content = await loadProductContent();
const u1 = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user01_e2b172.json.gz', import.meta.url)))).chat;
const GUARD_LOOK = 'a lean black hound with a scar on its snout, bred in the hills as a guard';
const THIEF_LOOK = 'a lean black hound with a scar on its snout, kept by a thief';
const reply = (s, deltas, prose, msg) => replyTurnV4(structuredClone(s), content, { scene: null, expected: {}, deltas }, { prose, msg });
const hound = (desc) => ({ seq: 1, type: 'creature.new', ref: 'hound', species: 'black hound', anchor: 'wolf', desc, count: 1, present: true, band: 'SHORT',
    cluster: null, stronger: null, threat: null, more: null, population: 'independent', life_stage: 'adult', scene: null });
const person = (role, desc, ref = 'watchman', name = 'Orrin') => ({ seq: 1, type: 'person.new', ref, name, role, desc, at: null, present: true, relevant: true, scene: null });
const take = (by, kind) => ({ seq: 1, type: 'coerce', kind, by, coin_cp: 5, object: null, because: 'he says it is owed at the gate', scene: null });
const rejectedRules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
/** Glassmere (User01 #66) with someone a reply before has brought in. */
function withActor(delta) {
    const s = reply(foldChat(structuredClone(u1), 66).state, [delta], 'Someone comes in.', 67).state;
    const id = Object.keys(s.entities).find((k) => s.entities[k].created?.msg === 67 || s.entities[k].source?.msg === 67)
        || Object.keys(s.entities).find((k) => ['mon.hound', 'npc.orrin', 'npc.nim'].includes(k));
    assert.ok(id && s.scene.present.includes(id), `present: ${id}`);
    return { s, id };
}

test('.185 R1 original path: a creature whose full look says "guard" fines nobody (.184: 87 → 82 cp, booked)', () => {
    const { s, id } = withActor(hound([GUARD_LOOK]));
    assert.equal(s.entities[id].kind, 'creature');
    assert.match(s.entities[id].traits, /as a guard$/, 'the look stays as .184 stores it');
    assert.ok(!s.entities[id].descriptors.some((d) => /guard/.test(d)), 'the role word is beyond the 40 characters of a descriptor');
    assert.equal(reactionEnvelope(s, content, { c: true }).actors.find((a) => a.id === id).fine, false);
    for (const kind of ['fine', 'confiscation']) {
        assert.equal(mayTake(s, id, kind).ok, false, kind);
        const r = reply(s, [take(id, kind)], 'The hound takes five copper from his purse.', 69);
        assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp, kind);
        assert.ok(!r.events.some((e) => e.t === 'coin.changed'), kind);
        assert.ok(rejectedRules(r).includes('coerce'), kind);
    }
});

test('.185 R1: a creature "kept by a thief" robs nobody; a short descriptor role word ("guard dog", already .183) no longer grants either', () => {
    const t = withActor(hound([THIEF_LOOK]));
    const r = reply(t.s, [take(t.id, 'robbery')], 'The hound snatches five copper.', 69);
    assert.equal(r.state.entities.pc.sheet.coin_cp, t.s.entities.pc.sheet.coin_cp);
    assert.ok(rejectedRules(r).includes('coerce'));
    const g = withActor(hound(['guard dog', 'thief\'s hound']));
    assert.equal(mayTake(g.s, g.id, 'fine').ok, false);
    assert.equal(mayTake(g.s, g.id, 'robbery').ok, false);
});

test('.185 R1 against: a real watchman (person) keeps his authority; a person "thief" keeps the robber rule', () => {
    const w = withActor(person('town guard', ['a broad watchman in a dented helmet']));
    assert.equal(w.s.entities[w.id].kind, 'npc');
    assert.equal(reactionEnvelope(w.s, content, { c: true }).actors.find((a) => a.id === w.id).fine, true);
    const r = reply(w.s, [take(w.id, 'fine')], 'The watchman takes a five copper fine.', 69);
    assert.equal(r.state.entities.pc.sheet.coin_cp, w.s.entities.pc.sheet.coin_cp - 5);
    const t = withActor(person('thief', ['a wiry cutpurse'], 'cutpurse', 'Nim'));
    assert.equal(mayTake(t.s, t.id, 'robbery').ok, true);
    assert.equal(mayTake(t.s, t.id, 'fine').ok, false, 'a thief is no authority');
});

test('.185 R1 against: a creature committed to a fight with him, or fighting him, keeps the combat rule for a robbery', () => {
    const { s, id } = withActor(hound([GUARD_LOOK]));
    assert.equal(mayTake(s, id, 'robbery').ok, false);
    const pending = structuredClone(s); pending.pending_combat = [{ by: id }];
    assert.equal(mayTake(pending, id, 'robbery').ok, true, 'committed to a fight');
    const fighting = structuredClone(s); fighting.encounter = { combatants: { [id]: { side: 'hostile' } } };
    assert.equal(mayTake(fighting, id, 'robbery').ok, true, 'fighting him');
    assert.equal(mayTake(fighting, id, 'fine').ok, false, 'a fight makes no creature an authority');
});
