// Build .108 (review of .107): a forced relocation stands only on narration that moves ALARIC, to the place the
// arrival names; spoken words in single quotes, a memory introduced earlier in the sentence and contracted modals are
// no event; "'d" is "had" before a past participle and "would" otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';

const content = await loadProductContent();
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json', import.meta.url)));
// Blackwater Landing, no GO authorised this turn; the Ashbridge gate guard elsewhere
const base = () => structuredClone(fixtures['005_121'].state);
const world = (deltas, prose) => applyWorld(base(), content, { scene: 'here', expected: {}, deltas }, { prose, msg: 500 });
const moved = (r) => r.events.filter((e) => e.t === 'scene.moved').map((e) => e.d.at);
const GAP = 'loc.the_gap_in_the_rocks';
const FERRY = 'loc.corlin.the_ferrymans';
const arrive = (forced_by, at = GAP) => ({ seq: 1, type: 'arrive', at, with: null, forced_by });
const stays = (prose, quote, why, at = GAP) => test(`protect108: no relocation — ${why}`, () => {
    const r = world([arrive(quote, at)], prose);
    assert.deepEqual(moved(r), [], why);
    assert.deepEqual(r.rejected.map((x) => x.rule), ['no_go']);
});
const goes = (prose, quote, why, at = GAP) => test(`protect108: relocation stands — ${why}`, () => {
    const r = world([arrive(quote, at)], prose);
    assert.deepEqual(moved(r), [at], why);
    assert.deepEqual(r.rejected, []);
});

// the five reproduced gaps of .107
stays("The guard grabbed Alaric's sleeve but kept him at the doorway.", "The guard grabbed Alaric's sleeve but kept him at the doorway", 'a grab that keeps him where he is');
stays('He remembered the night, when the guards dragged him to the gap in the rocks.', 'when the guards dragged him to the gap in the rocks', 'a memory introduced before the comma');
stays("'I'll drag you to the gap in the rocks,' the guard threatened.", "I'll drag you to the gap in the rocks", 'a threat in straight single quotes');
stays('‘I’ll drag you to the gap in the rocks,’ the guard threatened.', 'I’ll drag you to the gap in the rocks', 'a threat in typographic single quotes');
stays('A portal shimmered in the corner of the landing.', 'A portal shimmered in the corner of the landing', 'a portal that moves nobody');
stays('The watch arrested him on the landing and questioned him there.', 'The watch arrested him on the landing', 'an arrest where he stands');
// contractions
stays('Corr nodded grimly. They’ll haul him to the gap in the rocks.', 'They’ll haul him to the gap in the rocks', "a contracted will ('ll) in narration");
stays('The smugglers grinned; they’d haul him to the gap in the rocks.', 'they’d haul him to the gap in the rocks', "'d as would");
goes('By the time he woke, they’d carried him to the gap in the rocks.', 'they’d carried him to the gap in the rocks', "'d as had before a past participle");
goes('By the time he woke, they’d already carried him to the gap in the rocks.', 'they’d already carried him to the gap in the rocks', "'d as had across an adverb");
// whose movement
stays('The flood swept the cart downstream to the gap in the rocks.', 'The flood swept the cart downstream to the gap in the rocks', 'a thing is moved, not Alaric');
stays('Two men dragged the merchant to the gap in the rocks while he watched.', 'Two men dragged the merchant to the gap in the rocks', 'another person is moved');
// where to
stays('Two men seized him and dragged him to the Ferryman’s.', 'Two men seized him and dragged him to the Ferryman’s', 'the narrated destination is another place than the arrival');
goes('Two men seized him and dragged him to the Ferryman’s.', 'Two men seized him and dragged him to the Ferryman’s', 'the narrated destination is the arrival', FERRY);
// controls that must not be lost
goes('A wall of brown water tore him from the landing and swept him downstream to the gap in the rocks.', 'swept him downstream to the gap in the rocks', 'a flood');
goes('Before he could react, two men seized him and dragged him through the reeds to the gap in the rocks.', 'two men seized him and dragged him through the reeds', 'an abduction after its own leading clause');
goes('The planks gave way under him and he tumbled into the gap in the rocks.', 'The planks gave way under him', 'a collapse whose fall the sentence goes on to tell');
goes('A portal opened beneath him and swallowed him.', 'A portal opened beneath him and swallowed him', 'a portal that takes him, no destination told');

test('protect108: a known person announced with a contracted will is no arrival', () => {
    const r = world([{ seq: 1, type: 'enter', who: 'npc.npcgate_guard', evidence: 'The gate guard’ll come down to the landing later' }], 'Corr shrugged. The gate guard’ll come down to the landing later.');
    assert.deepEqual(r.events.filter((e) => e.t === 'scene.entered').map((e) => e.d.id), []);
    assert.deepEqual(r.rejected.map((x) => x.rule), ['npc_presence']);
});
