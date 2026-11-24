// Offline comparison of two consciously discarded person.new policies on the T20 prefix.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [docs, ...versions] = process.argv.slice(2);
if (versions.length !== 3) throw Error('Usage: node vergleich.mjs MAIN BASE STRICT LOCAL');
const file = path.join(docs, 'testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz');
const chat = zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line)).filter(m => m.mes != null);
const reply = chat[44];
const known = 'npc.marta_halloran';
const syntheticCases = [
    ['original', () => {}],
    ['don-donna', (s, d) => { s.entities[known].name = 'Donna Bell'; d.name = 'Don'; d.ref = 'npc.don'; }],
    ['different-town', s => {
        s.memories = s.memories.filter(m => !JSON.stringify(m).includes(known));
        s.entities[known].at = 'loc.ashbridge';
    }],
    ['two-martas', s => { s.entities['npc.marta_vale'] = { ...s.entities[known], id: 'npc.marta_vale', name: 'Marta Vale' }; }],
    ['another-surname', (s, d) => { d.name = 'Marta Voss'; d.ref = 'npc.marta_voss'; }],
    ['explicit-distinct', (_s, d) => { d.distinct_from = known; }],
    ['unrecorded-homonym', (_s, d) => { d.desc = ['a different farmer of the same first name, clearly a stranger']; }],
];
const labels = ['.209', 'symmetrisch', 'ort_rolle'];
const results = [];
for (const [index, checkout] of versions.entries()) {
    const engine = path.resolve(checkout, 'avereth-engine');
    const load = name => import(pathToFileURL(path.join(engine, name)));
    const { foldChat } = await load('src/host.js');
    const { applyWorld } = await load('src/v4/world.js');
    const { loadProductContent } = await load('tests/helpers.js');
    const content = await loadProductContent();
    for (const [id, change] of syntheticCases) {
        const { state, errors } = foldChat(chat, 44);
        if (errors.length) throw Error(errors.join('; '));
        const answer = structuredClone(reply.extra.avereth.extraction.raw);
        const person = answer.deltas.find(d => d.type === 'person.new');
        change(state, person);
        const prose = id === 'unrecorded-homonym'
            ? 'At the door a stranger stood in the rain. “My name is Marta too. My cousin is inside,” the young farmer said.'
            : reply.mes;
        const r = applyWorld(state, content, answer, { prose, msg: 44 });
        results.push({
            variant: labels[index], fall: id, anwesend: r.state.scene.present,
            neu: r.events.filter(e => e.t === 'entity.created').map(e => e.d.entity.id),
            ablehnungen: r.rejected.map(d => [d.seq, d.type, d.rule]),
            erinnerung: r.events.filter(e => e.t === 'memory.recorded' && e.d.memory?.kind === 'narrated').map(e => e.d.memory.who),
        });
    }
}
console.log(JSON.stringify(results, null, 2));
