// The isolated SillyTavern instance of one run (docs/LIVE_RUNNER.md §4): its own folder outside the player's
// installation (the system's temp folder), with its own config.yaml and data root; the player's SillyTavern program
// runs on it with --configPath/--dataRoot, so its own data folder is never opened. Into the instance go: the extension
// as this repository has it, the narrator card (the profile's name and greeting, this build's contract), this build's
// lorebook, the preset and the connection the import took, and the API key from the environment in the instance's own
// secrets.json, which is deleted again when the run ends.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { Guard, ENGINE } from './lib.mjs';
import { secretKeyOf, PRESET_TO_SETTINGS } from './import_profile.mjs';

export const DEFAULT_CARD = 'Avereth V4';
export const WORLD = 'Avereth World Lore v0.14';
export const WORLD_FILE = path.join(ENGINE, 'lorebook', 'Avereth_World_Lore_v0.14.json');
export const CONTRACT_FILE = path.join(ENGINE, 'content', 'narrator', 'Avereth_Narrator_Contract_v4.txt');
// the runner's own greeting when the profile has no Avereth card (the selftest; README: First Message v0.4 sets the city
// by its Location line)
export const FALLBACK_GREETING = 'SYSTEM INITIALIZATION COMPLETE\n\n`Location: Public roadside verge outside Glassmere, Caelreth`\n\nCHARACTER CREATION — STEP 1/2: choose a Base Class (Warrior, Mage, Guardian, Duelist, Ranger).';
export const EXTENSION_FILES = ['index.js', 'manifest.json', 'style.css'];
export const EXTENSION_DIRS = ['src', 'content', 'regex'];

/** A new, empty instance folder; nothing is written outside it (and the run folder). */
export function createInstance({ runId, base = os.tmpdir(), protect = [], runDir }) {
    const root = fs.mkdtempSync(path.join(base, `avereth-live-${runId}-`));
    const guard = new Guard([root, runDir].filter(Boolean), { forbidden: protect });
    const data = path.join(root, 'data');
    guard.mkdir(data);
    return { root, data, config: path.join(root, 'config.yaml'), user: path.join(data, 'default-user'), guard };
}

/** SillyTavern's config for the instance: loopback only, no browser start, every request and reply logged. */
export function writeConfig(inst, port) {
    inst.guard.write(inst.config, [
        `dataRoot: ${JSON.stringify(inst.data)}`,
        'listen: false',
        `port: ${port}`,
        'whitelistMode: true',
        'whitelist:',
        '  - ::1',
        '  - 127.0.0.1',
        'browserLaunch:',
        '  enabled: false',
        'enableUserAccounts: false',
        'logging:',
        '  enableAccessLog: false',
        '  minLogLevel: 0',
        '',
    ].join('\n'));
}

// ------------------------------------------------------------------------------------------------ the card PNG
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

/** A one-pixel PNG carrying a V2 character card (tEXt "chara"). */
export function cardPng({ name, description, first_mes, world, alternate_greetings = [], note = 'Avereth live runner' }) {
    const data = { name, description, personality: '', scenario: '', first_mes, mes_example: '', creator_notes: note, system_prompt: '', post_history_instructions: '', alternate_greetings, tags: [], creator: '', character_version: '', extensions: { world } };
    const card = { spec: 'chara_card_v2', spec_version: '2.0', name, description, personality: '', scenario: '', first_mes, mes_example: '', data };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
        chunk('tEXt', Buffer.concat([Buffer.from('chara\0', 'latin1'), Buffer.from(Buffer.from(JSON.stringify(card), 'utf8').toString('base64'), 'latin1')])),
        chunk('IDAT', zlib.deflateSync(Buffer.from([0, 60, 60, 90, 255]))), chunk('IEND', Buffer.alloc(0)),
    ]);
}

/** A preset file from settings.json's values, when the profile has none (the dropdown then shows the right name). */
function presetFromGeneration(gen) {
    const back = Object.fromEntries(Object.entries(PRESET_TO_SETTINGS).map(([k, v]) => [v, k]));
    return JSON.stringify(Object.fromEntries(Object.entries(gen).map(([k, v]) => [back[k] || k, v])), null, 4);
}

/**
 * Fill the instance once SillyTavern created its default user (server.mjs: after the first start): extension, card,
 * lorebook, preset, settings and the key. Returns what was set up (for the report).
 */
export function seedProfile(inst, imp, { key, cardName = null } = {}) {
    const g = inst.guard;
    const u = inst.user;
    // the extension, as this repository has it (never the profile's copy)
    const ext = path.join(u, 'extensions', 'avereth-engine');
    g.remove(ext);
    g.mkdir(ext);
    for (const f of EXTENSION_FILES) g.copy(path.join(ENGINE, f), path.join(ext, f));
    for (const d of EXTENSION_DIRS) g.copyDir(path.join(ENGINE, d), path.join(ext, d));
    // the card: the profile's name and greeting, this build's contract and lorebook
    const name = cardName || imp.card?.name || DEFAULT_CARD;
    const contract = fs.readFileSync(CONTRACT_FILE, 'utf8');
    const greeting = imp.card?.first_mes || FALLBACK_GREETING;
    g.write(path.join(u, 'characters', `${name}.png`), cardPng({ name, description: contract, first_mes: greeting, world: WORLD, alternate_greetings: imp.card?.alternate_greetings || [] }));
    g.copy(WORLD_FILE, path.join(u, 'worlds', `${WORLD}.json`));
    // the preset under its name, so that SillyTavern shows it selected
    const presetName = imp.preset.name || 'Avereth Live';
    g.write(path.join(u, 'OpenAI Settings', `${presetName}.json`), imp.preset.text || presetFromGeneration(imp.generation));
    // settings: SillyTavern's defaults of this instance, with the imported values; no streaming, so that every reply is logged
    const file = path.join(u, 'settings.json');
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    s.firstRun = false;
    s.username = imp.username;
    s.main_api = 'openai';
    s.oai_settings = { ...(s.oai_settings || {}), ...imp.generation, ...imp.connection, stream_openai: false, preset_settings_openai: presetName };
    // the reverse proxy only on the route that uses it (import_profile.mjs routeOf), its password the key from the
    // environment; as a proxy preset, because SillyTavern loads the selected preset over oai_settings (loadProxyPresets)
    for (const k of ['reverse_proxy', 'proxy_password']) s.oai_settings[k] = '';
    const none = { name: 'None', url: '', password: '' };
    s.proxies = [none];
    s.selected_proxy = none;
    if (imp.route?.runner.via === 'reverse_proxy') {
        const proxy = { name: imp.route.reverseProxy?.preset && imp.route.reverseProxy.preset !== 'None' ? imp.route.reverseProxy.preset : 'Avereth Live', url: imp.connection.reverse_proxy, password: key || '' };
        Object.assign(s.oai_settings, { reverse_proxy: proxy.url, proxy_password: proxy.password });
        s.proxies = [none, proxy];
        s.selected_proxy = proxy;
    }
    s.extension_settings = s.extension_settings || {};
    if (imp.engineSettings) s.extension_settings.avereth = structuredClone(imp.engineSettings);
    else delete s.extension_settings.avereth;
    g.write(file, JSON.stringify(s, null, 4));
    // the key, from the environment, in the instance's own secrets file (removeKey deletes it at the end)
    if (key) g.write(path.join(u, 'secrets.json'), JSON.stringify({ [secretKeyOf(imp.source)]: [{ id: 'avereth-live', value: key, label: 'avereth-live', active: true }], _migrated: [] }, null, 4));
    return { card: name, greeting: imp.card?.first_mes ? 'profile' : 'runner', world: WORLD, preset: presetName, source: imp.source, via: imp.route?.runner.via || null, model: imp.route?.runner.model ?? imp.connection.custom_model ?? null, stream: false };
}

/** The chat files of the run's card in the instance. */
export function chatFiles(inst, card) {
    const dir = path.join(inst.user, 'chats', card);
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f)) : [];
}

/** The key out of the instance: its secrets file, and the proxy password in its settings (SillyTavern may have saved them again). */
export function removeKey(inst) {
    inst.guard.remove(path.join(inst.user, 'secrets.json'));
    const file = path.join(inst.user, 'settings.json');
    if (!fs.existsSync(file)) return;
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    const had = !!s.oai_settings?.proxy_password || !!s.selected_proxy?.password || (s.proxies || []).some((p) => p.password);
    if (!had) return;
    if (s.oai_settings) s.oai_settings.proxy_password = '';
    if (s.selected_proxy) s.selected_proxy.password = '';
    for (const p of s.proxies || []) p.password = '';
    inst.guard.write(file, JSON.stringify(s, null, 4));
}
export function removeInstance(inst) { inst.guard.remove(inst.root); }
