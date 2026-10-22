// Read-only, selective import from the player's own SillyTavern profile (docs/LIVE_RUNNER.md §3). It reads, never
// writes: config.yaml (where the data lives), package.json (the version), the profile's settings.json, the active Chat
// Completion preset, the Avereth narrator card and the lorebook it links. It takes only what a live test of the build
// needs from the way the player plays:
//   - the connection of the active Chat Completion source (custom: URL, model, include/exclude body, headers, prompt
//     post-processing; another source: its model and endpoint fields),
//   - the generation values in play (the preset's fields as settings.json holds them, prompts and their order),
//   - the persona name and the engine's own settings (extension_settings.avereth),
//   - the card's name and greeting (First Message v0.4: its Location line picks the start city).
// It never reads secrets.json, chats, other cards' contents, or anything else, and never takes a reverse proxy, a proxy
// password or an included header or body field that looks like a credential. The API key comes from an environment
// variable (run_live.mjs). Every file read is fingerprinted; the runner checks them again after the run.
//
// Usage (prints what would be taken, no secrets): node tools/st_live/live/import_profile.mjs --st <SillyTavern dir> [--user default-user] [--card <name>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Reader, ENGINE, sha256, yamlTop } from './lib.mjs';

export const CONTRACT_TITLE = 'AVERETH RPG — SANDBOX NARRATOR CONTRACT';

// preset field -> settings.json (oai_settings) field, where SillyTavern names them differently (public/scripts/openai.js settingsToUpdate)
export const PRESET_TO_SETTINGS = {
    temperature: 'temp_openai', frequency_penalty: 'freq_pen_openai', presence_penalty: 'pres_pen_openai', top_p: 'top_p_openai',
    top_k: 'top_k_openai', top_a: 'top_a_openai', min_p: 'min_p_openai', repetition_penalty: 'repetition_penalty_openai',
};
// the generation fields of a Chat Completion preset (settings.json names), none of them a connection or a credential
export const GENERATION_KEYS = [
    'temp_openai', 'freq_pen_openai', 'pres_pen_openai', 'top_p_openai', 'top_k_openai', 'top_a_openai', 'min_p_openai', 'repetition_penalty_openai',
    'max_context_unlocked', 'openai_max_context', 'openai_max_tokens', 'names_behavior', 'send_if_empty', 'impersonation_prompt', 'new_chat_prompt',
    'new_group_chat_prompt', 'new_example_chat_prompt', 'continue_nudge_prompt', 'wi_format', 'scenario_format', 'personality_format', 'group_nudge_prompt',
    'stream_openai', 'prompts', 'prompt_order', 'assistant_prefill', 'assistant_impersonation', 'use_sysprompt', 'squash_system_messages', 'media_inlining',
    'inline_image_quality', 'continue_prefill', 'continue_postfix', 'function_calling', 'tool_call_recurse_limit', 'show_thoughts', 'reasoning_effort',
    'verbosity', 'enable_web_search', 'seed', 'n', 'request_images', 'tool_reasoning_mode',
];
// connection fields per source; another source: its own <source>_model / <source>_endpoint
export const CONNECTION_KEYS = {
    custom: ['custom_url', 'custom_model', 'custom_include_body', 'custom_exclude_body', 'custom_include_headers', 'custom_prompt_post_processing'],
    openrouter: ['openrouter_model', 'openrouter_providers', 'openrouter_allow_fallbacks', 'openrouter_middleout', 'openrouter_quantizations', 'openrouter_use_fallback'],
    azure_openai: ['azure_base_url', 'azure_deployment_name', 'azure_api_version', 'azure_openai_model'],
};
export const NEVER_TAKEN = ['reverse_proxy', 'proxy_password'];
export const CREDENTIAL = /authorization|bearer|api[-_ ]?key|x-api-key|access[-_ ]?token|\btoken\b|secret|password|cookie/i;
/** SillyTavern's secrets.json key of a source (src/endpoints/secrets.js SECRET_KEYS: api_key_<source> for these). */
export const secretKeyOf = (source) => `api_key_${source}`;

/** The JSON of a character card PNG (tEXt "ccv3" or "chara", base64), or null. */
export function readCard(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    let at = 8;
    const found = {};
    while (at + 8 <= buf.length) {
        const len = buf.readUInt32BE(at);
        const type = buf.toString('latin1', at + 4, at + 8);
        const data = buf.subarray(at + 8, at + 8 + len);
        if (type === 'tEXt') {
            const z = data.indexOf(0);
            const key = data.toString('latin1', 0, z);
            if (key === 'chara' || key === 'ccv3') found[key] = data.toString('latin1', z + 1);
        }
        if (type === 'IEND') break;
        at += 12 + len;
    }
    for (const key of ['ccv3', 'chara']) {
        if (!found[key]) continue;
        try { return JSON.parse(Buffer.from(found[key], 'base64').toString('utf8')); } catch { /* the other one */ }
    }
    return null;
}

const cardField = (card, k) => card?.data?.[k] ?? card?.[k] ?? null;
export const contractRevision = (text) => /Contract revision: ([^\s]+)/.exec(String(text || ''))?.[1] || null;

/** The Avereth narrator card among the profile's cards: by name, else the one card named Avereth… with the V4 contract. */
function findCard(charsDir, reader, wanted, warnings) {
    if (!fs.existsSync(charsDir)) return null;
    const files = fs.readdirSync(charsDir).filter((f) => f.toLowerCase().endsWith('.png'));
    if (wanted) {
        const f = files.find((x) => x.slice(0, -4) === wanted) || files.find((x) => x.slice(0, -4).toLowerCase() === wanted.toLowerCase());
        if (!f) throw new Error(`no card "${wanted}" in ${charsDir}`);
        return { file: path.join(charsDir, f), card: readCard(reader.file(path.join(charsDir, f))) };
    }
    const named = files.filter((f) => /avereth/i.test(f));
    const cands = [];
    for (const f of named) {
        const p = path.join(charsDir, f);
        if (fs.statSync(p).size > 25 * 1024 * 1024) continue;
        const card = readCard(reader.file(p));
        const desc = String(cardField(card, 'description') || '');
        if (!desc.includes(CONTRACT_TITLE)) continue;
        cands.push({ file: p, card, rev: contractRevision(desc), mtimeMs: fs.statSync(p).mtimeMs });
    }
    const v4 = cands.filter((c) => String(c.rev || '').startsWith('4.'));
    const pool = v4.length ? v4 : cands;
    if (!pool.length) return null;
    pool.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (pool.length > 1) warnings.push(`several Avereth cards with the narrator contract (${pool.map((c) => path.basename(c.file, '.png')).join(', ')}): took the newest, "${path.basename(pool[0].file, '.png')}" (set "card" in live.config.json to choose)`);
    return pool[0];
}

/** Where SillyTavern keeps its data: config.yaml's dataRoot (relative to the installation), default ./data. */
export function dataRootOf(stDir, reader) {
    const cfg = path.join(stDir, 'config.yaml');
    const root = fs.existsSync(cfg) ? yamlTop(reader.file(cfg, 'utf8'), 'dataRoot') : null;
    return path.resolve(stDir, root || './data');
}

/**
 * The selective import. preset: 'profile' (the values in play, settings.json) or 'repo' (presets/Avereth Narrator V4.json
 * of this build). dataRoot: read the profile from there instead of the installation's own data root (a SillyTavern
 * started with --dataRoot; the selftest's fake profile). Throws on what makes a live test impossible (no profile, no
 * settings, a URL with credentials).
 */
export function importProfile({ stDir, user = 'default-user', card = null, preset = 'profile', dataRoot: dataRootOverride = null } = {}) {
    if (!stDir || !fs.existsSync(path.join(stDir, 'server.js'))) throw new Error(`no SillyTavern installation at ${stDir} (server.js missing)`);
    const reader = new Reader();
    const warnings = [];
    const dropped = [];
    const pkg = JSON.parse(reader.file(path.join(stDir, 'package.json'), 'utf8'));
    const dataRoot = dataRootOverride ? path.resolve(dataRootOverride) : dataRootOf(stDir, reader);
    const userDir = path.join(dataRoot, user);
    const settingsFile = path.join(userDir, 'settings.json');
    if (!fs.existsSync(settingsFile)) throw new Error(`no settings.json for user "${user}" in ${dataRoot}`);
    const settings = JSON.parse(reader.file(settingsFile, 'utf8'));
    const oai = settings.oai_settings || {};
    const source = oai.chat_completion_source || 'openai';
    const mainApi = settings.main_api || null;
    if (mainApi !== 'openai') warnings.push(`the profile's API is "${mainApi}", not Chat Completion: the run uses its Chat Completion settings`);

    // the connection
    const keys = [...(CONNECTION_KEYS[source] || Object.keys(oai).filter((k) => k.startsWith(`${source}_`) && /_(model|endpoint|provider)$/.test(k))), 'bypass_status_check'];
    const connection = { chat_completion_source: source };
    for (const k of keys) {
        if (oai[k] === undefined) continue;
        const v = oai[k];
        if ((k === 'custom_include_headers' || k === 'custom_include_body') && CREDENTIAL.test(String(v))) {
            dropped.push({ key: k, why: 'looks like it holds credentials; not taken (set it in the isolated instance yourself if the provider needs it)' });
            continue;
        }
        connection[k] = v;
    }
    if (source === 'custom') {
        const url = String(connection.custom_url || '');
        if (!url) throw new Error('the profile uses the Custom source without a URL');
        let u;
        try { u = new URL(url); } catch { throw new Error(`the profile's custom URL is not a URL: ${url.slice(0, 60)}`); }
        if (u.username || u.password || [...u.searchParams.keys()].some((k) => CREDENTIAL.test(k) || /^key$/i.test(k))) throw new Error('the profile\'s custom URL carries credentials; the runner does not take them (put the key in the environment variable instead)');
    } else {
        warnings.push(`the profile's Chat Completion source is "${source}", not "custom": the engine's own calls (planner, extractor, board) then go through generateRaw, without finish reasons or token counts in the records (the server log still has them)`);
    }
    for (const k of NEVER_TAKEN) if (oai[k]) dropped.push({ key: k, why: 'a reverse proxy and its password are never taken' });

    // the generation values
    const presetName = oai.preset_settings_openai || null;
    const presetPath = presetName ? path.join(userDir, 'OpenAI Settings', `${presetName}.json`) : null;
    const profilePresetText = presetPath && fs.existsSync(presetPath) ? reader.file(presetPath, 'utf8') : null;
    if (presetName && !profilePresetText) warnings.push(`the active preset "${presetName}" has no file in the profile; only settings.json's values are taken`);
    const repoPresetName = 'Avereth Narrator V4';
    const repoPresetText = fs.readFileSync(path.join(ENGINE, 'presets', `${repoPresetName}.json`), 'utf8');
    const fromPreset = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [PRESET_TO_SETTINGS[k] || k, v]).filter(([k]) => GENERATION_KEYS.includes(k)));
    const generation = preset === 'repo' ? fromPreset(JSON.parse(repoPresetText)) : Object.fromEntries(GENERATION_KEYS.filter((k) => oai[k] !== undefined).map((k) => [k, oai[k]]));
    // values in play that differ from the saved preset file (unsaved changes): reported, the values in play are used
    const unsaved = [];
    if (preset !== 'repo' && profilePresetText) {
        const saved = fromPreset(JSON.parse(profilePresetText));
        for (const [k, v] of Object.entries(saved)) if (k in generation && JSON.stringify(generation[k]) !== JSON.stringify(v)) unsaved.push(k);
    }
    const repoGen = fromPreset(JSON.parse(repoPresetText));
    // the narrator contract alone is some 10,000 tokens: a smaller context leaves SillyTavern no room for it, the engine
    // block and the history (it drops them and the narrator writes without the engine)
    if (Number(generation.openai_max_context) < 16384) warnings.push(`the context size in play is ${generation.openai_max_context} tokens: too small for the narrator contract, the engine block and the history (the build's preset has ${repoGen.openai_max_context})`);
    const vsRepo = Object.keys(repoGen).filter((k) => JSON.stringify(repoGen[k]) !== JSON.stringify(generation[k]));

    // the card: its name and greeting; its description is replaced by this build's contract (profile.mjs)
    const found = findCard(path.join(userDir, 'characters'), reader, card, warnings);
    let cardInfo = null;
    if (found?.card) {
        const desc = String(cardField(found.card, 'description') || '');
        cardInfo = {
            file: found.file, name: cardField(found.card, 'name') || path.basename(found.file, '.png'),
            first_mes: cardField(found.card, 'first_mes') || '', alternate_greetings: cardField(found.card, 'alternate_greetings') || [],
            world: found.card?.data?.extensions?.world || null, contract: desc.includes(CONTRACT_TITLE) ? contractRevision(desc) || 'unknown' : null,
        };
        if (!cardInfo.first_mes) warnings.push(`the card "${cardInfo.name}" has no greeting; the runner's own greeting is used`);
    } else warnings.push('no Avereth narrator card found in the profile: the runner\'s own card and greeting are used (set "card" in live.config.json)');

    // the lorebook the card links: only compared with this build's (the run uses the build's)
    let world = null;
    if (cardInfo?.world) {
        const wf = path.join(userDir, 'worlds', `${cardInfo.world}.json`);
        if (fs.existsSync(wf)) {
            const text = reader.file(wf, 'utf8');
            world = { name: cardInfo.world, file: wf, sha256: sha256(Buffer.from(text)) };
        } else warnings.push(`the card links the lorebook "${cardInfo.world}", which the profile does not have`);
    }
    const globalWorlds = settings.world_info_settings?.world_info?.globalSelect || [];
    if (globalWorlds.length) warnings.push(`the profile has global lorebooks active (${globalWorlds.join(', ')}); the isolated instance has none (README: link the lorebook to the card only)`);

    const ext = settings.extension_settings?.avereth ? structuredClone(settings.extension_settings.avereth) : null;
    return {
        st: { dir: path.resolve(stDir), version: pkg.version || null, dataRoot, user, userDir },
        username: settings.username || 'User', mainApi, source, connection, generation,
        streaming: generation.stream_openai ?? oai.stream_openai ?? null,
        preset: { mode: preset, name: preset === 'repo' ? repoPresetName : presetName, file: preset === 'repo' ? null : presetPath, text: preset === 'repo' ? repoPresetText : profilePresetText, unsaved, vsRepo },
        card: cardInfo, world, engineSettings: ext, warnings, dropped, read: reader.read,
    };
}

/** The import as text for the console and the report: what is taken, never a key. */
export function describeImport(imp) {
    const lines = [
        `SillyTavern ${imp.st.version} at ${imp.st.dir}`,
        `profile: ${imp.st.userDir}`,
        `persona: ${imp.username} · API: ${imp.mainApi} · source: ${imp.source}`,
        `connection: ${Object.entries(imp.connection).filter(([k]) => k !== 'chat_completion_source').map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v)}`).join(' · ') || '(none)'}`,
        `preset (${imp.preset.mode}): ${imp.preset.name || '(none)'}${imp.preset.unsaved.length ? ` · unsaved changes in play: ${imp.preset.unsaved.join(', ')}` : ''}${imp.preset.vsRepo.length ? ` · differs from this build's preset in: ${imp.preset.vsRepo.join(', ')}` : ' · same as this build\'s preset'}`,
        `generation: temperature ${imp.generation.temp_openai ?? '?'} · max tokens ${imp.generation.openai_max_tokens ?? '?'} · context ${imp.generation.openai_max_context ?? '?'} · reasoning ${imp.generation.reasoning_effort ?? '?'} · streaming ${imp.streaming} (the run sends without streaming, so that SillyTavern logs every reply)`,
        `card: ${imp.card ? `${imp.card.name} (contract ${imp.card.contract || 'none'}, greeting ${imp.card.first_mes.length} chars, lorebook ${imp.card.world || 'none'})` : '(none: the runner\'s own)'}`,
        `engine settings: ${imp.engineSettings ? JSON.stringify(imp.engineSettings) : '(defaults)'}`,
        ...imp.dropped.map((d) => `not taken: ${d.key}: ${d.why}`),
        ...imp.warnings.map((w) => `note: ${w}`),
        `files read (${imp.read.length}): ${imp.read.map((r) => path.relative(imp.st.dir, r.file) || r.file).join(', ')}`,
    ];
    return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
    const imp = importProfile({ stDir: arg('--st') || process.env.AVERETH_ST_DIR, user: arg('--user') || 'default-user', card: arg('--card'), preset: arg('--preset') || 'profile' });
    console.log(describeImport(imp));
}
