// Runtime V4, P0: check the setup before the spikes. Shows which backend is used and what it will send, never the key.
//
//   node tools/p0/check.mjs                       SillyTavern backend (default): reachable? Custom source? model?
//   node tools/p0/check.mjs --ping                … and one tiny test call (1 request, a few tokens)
//   node tools/p0/check.mjs --backend direct      direct backend: which environment variables are set (never their value)
//   node tools/p0/check.mjs --st-url http://127.0.0.1:8000 --profile "My Profile"
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { openProvider, ENV } from './lib/provider.mjs';
import { parseArgs } from './lib/util.mjs';

function envReport() {
    const lines = [];
    for (const [name, secret] of [[ENV.base, false], [ENV.key, true], [ENV.model, false], [ENV.extra, false], [ENV.st, false]]) {
        const v = process.env[name];
        if (!v) { lines.push(`  ${name}: nicht gesetzt`); continue; }
        if (secret) { lines.push(`  ${name}: gesetzt (Länge ${v.length}, Inhalt wird nicht angezeigt)`); continue; }
        if (name === ENV.base) {
            let host = '?';
            try { host = new URL(v).host; } catch { host = '(keine gültige URL)'; }
            lines.push(`  ${name}: gesetzt (Host ${host})`);
            continue;
        }
        lines.push(`  ${name}: gesetzt (${v.length} Zeichen)`);
    }
    return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
    const a = parseArgs(argv);
    const backend = a.backend || 'st';
    console.log(`Avereth P0 – Prüfung (Backend: ${backend})`);
    console.log(`Node ${process.version}`);
    if (Number.parseInt(process.versions.node, 10) < 20) console.log('WARNUNG: Node 20 oder neuer wird gebraucht (SillyTavern 1.19 braucht es ebenfalls).');
    if (backend === 'direct') console.log(`Umgebungsvariablen:\n${envReport()}`);
    let provider;
    try {
        provider = await openProvider({ backend, stUrl: a['st-url'], profile: a.profile });
    } catch (err) {
        console.log(`\nFEHLER: ${err.message}`);
        return 1;
    }
    const d = provider.describe();
    console.log(`\nVerbindung: OK`);
    console.log(`  Modell: ${d.model}`);
    if (d.profile) console.log(`  Connection Profile: ${d.profile}`);
    if (d.include_body_keys) console.log(`  Include Body Parameters (nur Schlüssel): ${d.include_body_keys.join(', ') || 'keine'}`);
    if (d.extra_body_keys) console.log(`  AVERETH_AB_EXTRA_BODY (nur Schlüssel): ${d.extra_body_keys.join(', ') || 'keine'}`);
    console.log(`  reasoning_effort: ${d.reasoning_effort ?? 'nicht gesetzt'}`);
    if (a.ping) {
        const r = await provider.chat({ messages: [{ role: 'system', content: 'Answer with exactly one word.' }, { role: 'user', content: 'Say OK.' }], maxTokens: 64, temperature: 0 });
        if (!r.ok) {
            console.log(`\nTestaufruf: FEHLER (${r.status}) ${r.error}`);
            return 1;
        }
        console.log(`\nTestaufruf: OK in ${(r.ms / 1000).toFixed(1)} s · Antwort: "${String(r.content).trim().slice(0, 40)}" · Token: ${r.usage ? `${r.usage.prompt_tokens ?? '?'} Prompt / ${r.usage.completion_tokens ?? '?'} Output` : 'keine Angabe'}`);
    }
    console.log('\nBereit für S0.');
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(err.message); process.exit(1); });
}
