// Offline: build the extractor and planner system prompts of a checkout (no model call).
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2];
const h = await import(pathToFileURL(path.join(root, 'tests/helpers.js')).href);
const content = await h.loadProductContent();
const ex = await import(pathToFileURL(path.join(root, 'src/v4/extract.js')).href);
const sys = ex.extractorSystem(content.deltaVocab);
const v = content.deltaVocab;
const rules = v.rules.join('\n').length, deltas = ex.deltaVocabularyText(v).length, fmt = ex.FORMAT_RULES.join('\n').length;
console.log(JSON.stringify({ root: path.basename(path.dirname(root)), extractorSystem: sys.length, rules, rulesN: v.rules.length, deltas, deltasN: v.deltas.length, format: fmt }));
