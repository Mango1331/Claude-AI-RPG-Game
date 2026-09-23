// Live SillyTavern smoke, step 1 (optional, docs/RUNTIME_V3.md): prepare a real SillyTavern checkout — the narrator
// card (contract as description, the world lorebook as Character Lore), the lorebook in worlds/, this extension as a
// user extension, and settings that skip the first-run onboarding and allow a realistic context size.
// Usage: AVERETH_ST_DIR=/path/to/SillyTavern node tools/st_live/setup.mjs   (start SillyTavern once before, so that
// data/default-user exists)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const ST = process.env.AVERETH_ST_DIR;
if (!ST) throw new Error('set AVERETH_ST_DIR to a SillyTavern checkout');
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const USER = path.join(ST, 'data/default-user');
const narrator = JSON.parse(fs.readFileSync(path.join(ENGINE, 'content/narrator.json'), 'utf8'));
const WORLD = 'Avereth World Lore v0.11';
const first = 'SYSTEM INITIALIZATION COMPLETE\n\n`Location: Public roadside verge outside Tidecross, Solmere`\n\nCHARACTER CREATION — STEP 1/2: choose a Base Class (Warrior, Mage, Guardian, Duelist, Ranger).';
const card = {
    spec: 'chara_card_v2', spec_version: '2.0',
    name: 'Avereth', description: narrator.contract_text, personality: '', scenario: '', first_mes: first, mes_example: '',
    data: { name: 'Avereth', description: narrator.contract_text, personality: '', scenario: '', first_mes: first, mes_example: '', creator_notes: 'Runtime V3 smoke', system_prompt: '', post_history_instructions: '', alternate_greetings: [], tags: [], creator: '', character_version: '', extensions: { world: WORLD } },
};
// minimal PNG (1x1) with a tEXt "chara" chunk
const crcTable = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.concat([Buffer.from('chara\0', 'latin1'), Buffer.from(Buffer.from(JSON.stringify(card), 'utf8').toString('base64'), 'latin1')])),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 60, 60, 90, 255]))), chunk('IEND', Buffer.alloc(0)),
]);
fs.writeFileSync(path.join(USER, 'characters/Avereth.png'), png);
fs.copyFileSync(path.join(ENGINE, 'lorebook/Avereth_World_Lore_v0.11.json'), path.join(USER, 'worlds', `${WORLD}.json`));
const ext = path.join(USER, 'extensions/avereth-engine');
fs.rmSync(ext, { recursive: true, force: true });
fs.mkdirSync(ext, { recursive: true });
for (const f of ['index.js', 'manifest.json', 'style.css']) fs.copyFileSync(path.join(ENGINE, f), path.join(ext, f));
for (const d of ['src', 'content', 'regex']) fs.cpSync(path.join(ENGINE, d), path.join(ext, d), { recursive: true });
const settingsFile = path.join(USER, 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
settings.firstRun = false;
settings.username = 'Alaric';
Object.assign(settings.oai_settings, { openai_max_context: 32000, openai_max_tokens: 1200, max_context_unlocked: true });
fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
console.log('card, lorebook, extension and settings installed');
