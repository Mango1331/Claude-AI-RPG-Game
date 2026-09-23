// Trigger audit of the Avereth lorebook against the real testruns: replays each fixture through the engine the way
// the extension does (so the chat holds exactly what SillyTavern scans: the player's messages and the narrator's
// replies with their Megumin tracker blocks, without the fact reports) and runs SillyTavern's World Info activation
// (tools/wi_sim.mjs) before every generation, with the engine's Lore Bridge keys.
// Usage: node tools/lorebook_audit.mjs [budget=1800] [depth=2] [lorebook path]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentPack } from '../src/content.js';
import { prepareGeneration, processReply } from '../src/host.js';
import { loadLorebook, activate } from './wi_sim.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const json = async (rel) => JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
export const LOREBOOK = 'lorebook/Avereth_World_Lore_v0.11.json';

/** For every turn of a fixture: the scan messages and the Lore Bridge keys SillyTavern would see. */
export async function scanWindows(content, fixture) {
    const fx = await json(fixture);
    const msg = (mes, user = false) => (user ? { is_user: true, is_system: false, mes, extra: {} } : { is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
    const chat = [msg(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    const out = [];
    for (const t of fx.turns) {
        chat.push(msg(t.input, true));
        const gen = prepareGeneration(chat, content, { type: 'normal', settings: { engineLore: false } });
        out.push({ input: t.input, messages: chat.map((m) => m.mes), keys: gen.loreKeys || [] });
        chat.push(msg(t.reply));
        processReply(chat, chat.length - 1, content);
    }
    return out;
}

async function main() {
    const [budget = 1800, depth = 2, book = LOREBOOK] = process.argv.slice(2);
    const content = await loadContentPack((name) => json(`content/${name}`));
    const entries = loadLorebook(path.join(ROOT, book));
    const all = [];
    for (const fixture of ['tests/testrun_v2/fixture.json', 'tests/testrun_v3/fixture.json', 'tests/testrun_v4/fixture.json']) {
        console.log(`\n${fixture} — budget ${budget}, scan depth ${depth}, Lore Bridge on`);
        console.log('| Turn | Input | Tokens | Entries (besides the two constant ones) | Dropped by budget |');
        console.log('|---|---|---|---|---|');
        for (const [i, w] of (await scanWindows(content, fixture)).entries()) {
            const r = activate(entries, w.messages, { depth: Number(depth), budget: Number(budget), inject: w.keys });
            all.push(r.tokens);
            const name = (x) => x.e.comment.replace(/^[A-Z ]+— /, '');
            console.log(`| ${i + 1} | ${w.input.slice(0, 36).replace(/\|/g, '/')} | ${r.tokens} | ${r.kept.filter((x) => x.how !== 'constant').map((x) => `${name(x)} [${x.key}]`).join('; ')} | ${r.cut.map(name).join('; ')} |`);
        }
    }
    console.log(`\n${all.length} generations: World Info ${Math.min(...all)}–${Math.max(...all)} tokens, average ${Math.round(all.reduce((a, b) => a + b, 0) / all.length)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
