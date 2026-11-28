// Offline: the extractor system prompt as the live path builds it (worldVocab for a campaign without private quests),
// next to the raw content vocabulary the first report measured. node promptsize_live.mjs <engine root>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2];
const h = await import(pathToFileURL(path.join(root, 'tests/helpers.js')).href);
const c = await h.loadProductContent(); const ex = await import(pathToFileURL(path.join(root, 'src/v4/extract.js')).href);
const live = ex.worldVocab(c.deltaVocab, { meta: { private_quests: false } });
console.log(JSON.stringify({ root, raw: ex.extractorSystem(c.deltaVocab).length, live_no_private_quests: ex.extractorSystem(live).length }));
