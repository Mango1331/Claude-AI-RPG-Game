// Offline synthetic scaling probe (no model call): fold an archived chat with the .261 engine, then add synthetic
// carried objects, known places and active quests to the folded state and measure the CATALOG text the planner and
// extractor receive. node catalog_scaling.mjs <engine root> <chat.jsonl.gz>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import zlib from 'node:zlib'; import fs from 'node:fs';
const [root, file] = process.argv.slice(2);
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const host = await imp('src/host.js'); const cat = await imp('src/v4/catalog.js'); const it = await imp('src/v4/interpret.js');
const h = await imp('tests/helpers.js'); const content = await h.loadProductContent();
const chat = zlib.gunzipSync(fs.readFileSync(file)).toString().split('\n').filter(Boolean).map(JSON.parse);
const base = host.foldChat(chat).state;
const measure = (s) => {
  const p = it.catalogText(cat.buildCatalog(s, content, { c: true, known: true }));
  const x = cat.extractorCatalog(s, content, { c: true });
  return { planner_chars: p.length, extractor_chars: x.text.length, schema_places: x.places.length };
};
const at = base.scene.at;
const out = [];
for (const k of [0, 25, 50, 100, 200]) {
  const s = structuredClone(base);
  for (let i = 0; i < k; i++) s.objects[`obj.syn${i}`] = { id: `obj.syn${i}`, name: `synthetic trinket ${i}`, holder: { entity: 'pc' }, qty: 1 };
  out.push({ added: 'carried objects', k, ...measure(s) });
}
for (const k of [0, 50, 200, 1000]) {
  const s = structuredClone(base); const parent = s.places[at]?.parent || at;
  for (let i = 0; i < k; i++) s.places[`loc.syn${i}`] = { id: `loc.syn${i}`, name: `Synthetic Place ${i}`, kind: 'site', parent, by: 'reply', known: true };
  out.push({ added: 'known places (siblings)', k, ...measure(s) });
}
console.log(JSON.stringify({ run: path.basename(path.dirname(file)), objects: Object.keys(base.objects || {}).length, places: Object.keys(base.places || {}).length, entities: Object.keys(base.entities || {}).length }));
for (const r of out) console.log(JSON.stringify(r));
