import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, setRec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { npcContinuity } from '../../src/knowledge.js';
import { extractionRequest } from '../../src/v4/runtime.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { applyWorld } from '../../src/v4/world.js';

const content = await loadProductContent();
// Archived Host messages up to the arrival with the reintroduced farmer; the
// synthetic neutral controls below alter only the competing reference or memory.
const original = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/npc209_reference_prefix.json.gz', import.meta.url))));
const prefix = () => structuredClone(original.slice(0, 44));
const ids = (state, query) => npcContinuity(state, query).map(x => x.id);
function atReply(chat, prose) {
    const msg = { is_user: false, mes: prose, extra: {} };
    setRec(msg, { events: [], text_hash: hash32(prose), extraction: { status: 'pending' } });
    return extractionRequest([...chat, msg], chat.length, content);
}

test('T20 physical Extractor catalog offers Marta Halloran and Tam from the actual reply, without entering anyone', () => {
    const chat = prefix();
    const prior = foldChat(chat);
    assert.deepEqual(prior.errors, []);
    const req = atReply(chat, 'Marta stood in the doorway, waiting for the healer. “Tam’s our business.”');
    assert.match(req.catalog, /Marta Halloran \[npc\.marta_halloran\] — NOT PRESENT/);
    assert.match(req.catalog, /Tam \[npc\.tam\] — NOT PRESENT/);
    assert.deepEqual(foldChat(chat).state, prior.state);
    assert.ok(!req.state.scene.present.includes('npc.marta_halloran'));
});

test('unambiguous first name, possessive and punctuation recall the met person; substrings do not', () => {
    const s = foldChat(prefix()).state;
    assert.ok(ids(s, 'Marta?').includes('npc.marta_halloran'));
    assert.ok(ids(s, 'Tam’s bedside').includes('npc.tam'));
    assert.ok(!ids(s, 'Tamar met Martan.').includes('npc.tam'));
    assert.ok(!ids(s, 'Tamar met Martan.').includes('npc.marta_halloran'));
});

test('a shared first name does not select either absent NPC; a full name still identifies its owner', () => {
    const s = foldChat(prefix()).state;
    const id = 'npc.marta_vale';
    s.entities[id] = { ...s.entities['npc.marta_halloran'], id, name: 'Marta Vale' };
    s.memories.push({ who: [id, 'pc'], seen: ['pc'], place: 'West gate', text: 'A meeting at the gate.', importance: 4 });
    assert.ok(!ids(s, 'Marta?').some(k => k === id || k === 'npc.marta_halloran'));
    assert.ok(ids(s, 'Marta Vale!').includes(id));
});

test('remembering a name does not reveal an unobserved person or an NPC-only secret', () => {
    const s = foldChat(prefix()).state, id = 'npc.irena_salt';
    s.entities[id] = { ...s.entities['npc.marta_halloran'], id, name: 'Irena Salt', known_name: '' };
    s.memories.push({ who: [id], seen: [id], witnesses: [id], text: 'A private promise.', place: 'Vault', importance: 9 });
    assert.ok(!ids(s, 'Irena Salt is in the vault!').includes(id));
    assert.ok(!ids(s, 'Irena?').includes(id));
});

test('an explicitly refused player action does not select a recalled NPC for the Extractor', () => {
    const chat = prefix();
    const user = chat.findLast(m => m.is_user);
    user.extra.avereth.own_phase_refused = true;
    const req = atReply(chat, 'The rain subsided.');
    assert.equal(req.player, null);
    assert.doesNotMatch(req.catalog, /Marta Halloran \[npc\.marta_halloran\] — NOT PRESENT/);
});

test('T20/T21 archived world reports still need the right NPC evidence; explicitly reporting the returns preserves both existing identities', () => {
    for (const i of [44, 46]) {
        const chat = original.slice(0, i), prose = original[i].mes;
        const req = atReply(chat, prose);
        const raw = original[i].extra.avereth.extraction.raw;
        const simulate = answer => {
            const parsed = parseExtraction(JSON.stringify(answer), req.vocab, req.ids, req.expectedKeys, {
                sceneRequired: true, startScene: req.startScene, state: req.state, content, explicitArrivals: true, reply: prose,
            });
            assert.equal(parsed.valid, true);
            assert.deepEqual(parsed.issues, []);
            return applyWorld(req.state, content, parsed.value, { msg: i, prose }).state;
        };
        const unchanged = simulate(raw), control = structuredClone(raw);
        if (i === 44) {
            assert.ok(unchanged.entities['npc.marta'], 'archived person.new creates a duplicate on this input');
            const d = control.deltas.find(d => d.type === 'person.new' && d.ref === 'npc.marta');
            control.deltas[control.deltas.indexOf(d)] = { seq: d.seq, scene: d.scene, type: 'enter',
                who: 'npc.marta_halloran', evidence: 'Marta stood in it with a blanket still over her shoulders' };
            for (const delta of control.deltas) {
                if (delta.s === 'npc.marta') delta.s = 'npc.marta_halloran';
                if (Array.isArray(delta.who)) delta.who = delta.who.map(id => id === 'npc.marta' ? 'npc.marta_halloran' : id);
            }
            const shown = simulate(control);
            assert.ok(!shown.entities['npc.marta']);
            assert.ok(shown.scene.present.includes('npc.marta_halloran'));
        } else {
            assert.ok(!unchanged.scene.present.includes('npc.tam'), 'a missing report grants no presence');
            control.deltas.splice(1, 0, { scene: null, type: 'enter', who: 'npc.tam', evidence: 'Tam coughing, deep and ragged' });
            control.deltas.forEach((d, i) => { d.seq = i + 1; });
            assert.ok(simulate(control).scene.present.includes('npc.tam'));
        }
    }
});

test('a title or a common noun alone cannot recall an unrelated named character', () => {
    const s = foldChat(prefix()).state;
    s.scene.present = ['pc'];
    s.scene.at = 'realm.valedorn_crown'; // no local recall competes with this name-only control
    const id = 'npc.rina'; s.entities[id] = {id, kind: 'npc', name: 'Captain Rina'};
    s.memories.push({who: [id, 'pc'], witnesses: ['pc', id], text: 'Captain Rina said the captain handles accounts. Rina can pay tomorrow.', place: 'Gate', importance: 7});
    assert.ok(!ids(s, 'I ask my mother about the captain.').some(x => [id,'npc.mother_wren'].includes(x)));
    assert.ok(!ids(s, 'Captain?').includes(id));
    assert.ok(ids(s, 'Rina?').includes(id));
});

test('a previously disclosed full name needs no memory event; a partial name keeps the private family name out of the recall label', () => {
    const s = foldChat(prefix()).state;
    s.entities['npc.dela'] = {id:'npc.dela',kind:'npc',name:'Dela Ash'};
    s.entities['npc.named_guide'] = {id:'npc.named_guide',kind:'npc',name:'Rufus Black',known_name:'Rufus'};
    assert.ok(ids(s, 'Dela Ash?').includes('npc.dela'));
    const line = npcContinuity(s, 'Ask Rufus.').find(r => r.id === 'npc.named_guide');
    assert.ok(line); assert.match(line.text,/^Rufus \[npc.named_guide\]/); assert.doesNotMatch(line.text,/Black/);
    assert.ok(!ids(s,'Follow Black.').includes('npc.named_guide'));
});
