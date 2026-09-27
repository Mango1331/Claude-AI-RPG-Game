// Runtime V4, P0: bundle the results of S0–S3 into one file to send back (p0_out/P0_ERGEBNIS.md).
// It copies only the summaries and decisions (no raw answers), checks the text for anything that looks like a key or
// an Authorization header, and refuses to write if it finds one.
//
//   node tools/p0/report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_ROOT, parseArgs, writeText, nowIso, assertNoSecrets, scrub } from './lib/util.mjs';
import { ENV } from './lib/provider.mjs';

const PARTS = [
    ['s0', 'S0 Structured Output', 'node tools/p0/s0_structured.mjs'],
    ['s1', 'S1 Interpreter', 'node tools/p0/s1_interpreter.mjs'],
    ['s2', 'S2 World-Delta-Strategie', 'node tools/p0/s2_deltas.mjs'],
    ['s3', 'S3 Domänen-Prototyp', 'node tools/p0/s3_prototype.mjs'],
];

/** A last line of defence: patterns of common API keys, beyond the exact key of this terminal. */
const KEYLIKE = /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}|\bBearer\s+[A-Za-z0-9._~+/=-]{12,}|AIza[0-9A-Za-z_-]{30,}/;

export function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const log = deps.log ?? ((t) => console.log(t));
    const root = a.in ? path.resolve(String(a.in)) : OUT_ROOT;
    const secrets = [process.env[ENV.key]].filter(Boolean);
    const L = ['# Runtime V4 · P0: Ergebnis zum Zurückschicken', '', `- Erstellt: ${nowIso()} · Node ${process.version}`, ''];
    const have = [];
    const missing = [];
    for (const [dir, title, cmd] of PARTS) {
        const file = path.join(root, dir, 'summary.md');
        if (!fs.existsSync(file)) { missing.push(`${title} (\`${cmd}\`)`); continue; }
        have.push(title);
        const text = fs.readFileSync(file, 'utf8').replace(/^# /m, '## ').replace(/^## (?!P0)/gm, '### ').replace(/\n_Diese Datei enthält[^\n]*\n?/, '\n');
        L.push(text.trim(), '');
    }
    L.splice(3, 0, `- Enthalten: ${have.join(', ') || 'nichts'}${missing.length ? ` · fehlt: ${missing.join(', ')}` : ''}`);
    L.push('_Nur Zusammenfassungen und Entscheidungen; keine API-Keys, keine Header, keine Endpoint-URL, keine Rohantworten._', '');
    const text = L.join('\n');
    assertNoSecrets(text, secrets);
    if (KEYLIKE.test(text)) throw new Error('Abbruch: Der Bericht enthält etwas, das wie ein API-Key aussieht. Bitte nicht verschicken; melde nur die Stelle (ohne den Wert).');
    const out = path.join(root, 'P0_ERGEBNIS.md');
    writeText(out, scrub(text, secrets));
    log(`Gebündelt: ${have.length} von ${PARTS.length} Teilen${missing.length ? ` (fehlt: ${missing.join(', ')})` : ''}.`);
    log(`Zum Zurückschicken: ${out}`);
    return have.length ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        process.exit(main());
    } catch (err) {
        console.error(`FEHLER: ${err.message}`);
        process.exit(1);
    }
}
