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
// the sources whose requests SillyTavern sends to the reverse proxy when one is set, with the proxy's password as the key
// (public/scripts/openai.js proxySupportedSources, src/endpoints/backends/chat-completions.js). Custom is not one of
// them: it has its own URL (custom_url) and key (secrets.json api_key_custom), and the reverse proxy is not sent along.
export const PROXY_SOURCES = ['claude', 'openai', 'mistralai', 'makersuite', 'vertexai', 'deepseek', 'xai', 'zai', 'moonshot'];
const MODEL_KEY = { makersuite: 'google_model' };
/** The settings field that holds a source's model (settingsToUpdate). */
export const modelKeyOf = (source) => MODEL_KEY[source] || `${source}_model`;
export const NEVER_TAKEN = ['proxy_password'];
export const CREDENTIAL = /authorization|bearer|api[-_ ]?key|x-api-key|access[-_ ]?token|\btoken\b|secret|password|cookie/i;
/** SillyTavern's secrets.json key of a source (src/endpoints/secrets.js SECRET_KEYS: api_key_<source> for these). */
export const secretKeyOf = (source) => `api_key_${source}`;

/**
 * The way SillyTavern sends a Chat Completion request for these settings: the source, the field whose URL it goes to
 * (custom_url, reverse_proxy, or the source's own API), the model and where its key comes from.
 */
export function routeOf(oai) {
    const source = oai.chat_completion_source || 'openai';
    const model = oai[modelKeyOf(source)] ?? null;
    if (source === 'custom') return { source, via: 'custom_url', url: oai.custom_url || null, model, key: `secrets.json ${secretKeyOf(source)}` };
    if (PROXY_SOURCES.includes(source) && oai.reverse_proxy) return { source, via: 'reverse_proxy', url: oai.reverse_proxy, model, key: 'proxy_password' };
    return { source, via: 'source', url: oai[`${source}_endpoint`] || null, model, key: `secrets.json ${secretKeyOf(source)}` };
}

/** A URL the runner may take: a URL, and no credentials in it (user:password@, a key in the query). */
function plainUrl(url, what) {
    let u;
    try { u = new URL(String(url)); } catch { throw new Error(`the profile's ${what} is not a URL: ${String(url).slice(0, 60)}`); }
    if (u.username || u.password || [...u.searchParams.keys()].some((k) => CREDENTIAL.test(k) || /^key$/i.test(k))) throw new Error(`the profile's ${what} carries credentials; the runner does not take them (put the key in the environment variable instead)`);
    return u;
}

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

    // the reverse proxy in play: SillyTavern (since its proxy presets) loads the preset selected at the top of
    // settings.json after the Chat Completion settings and writes its URL and password over oai_settings
    // (public/scripts/openai.js loadProxyPresets → setProxyPreset); no preset selected is "None", no proxy at all
    const stOpenAi = path.join(stDir, 'public', 'scripts', 'openai.js');
    const presetsInST = fs.existsSync(stOpenAi) && /function loadProxyPresets\(/.test(reader.file(stOpenAi, 'utf8'));
    const rpInPlay = presetsInST ? String(settings.selected_proxy?.url || '') : String(oai.reverse_proxy || '');
    const pwInPlay = presetsInST ? !!settings.selected_proxy?.password : !!oai.proxy_password;
    // the connection: the route SillyTavern takes with the profile's settings, and the fields that make it
    const profileRoute = routeOf({ ...oai, reverse_proxy: rpInPlay });
    const keys = [...new Set([...(CONNECTION_KEYS[source] || Object.keys(oai).filter((k) => k.startsWith(`${source}_`) && /_(model|endpoint|provider)$/.test(k))), modelKeyOf(source), 'bypass_status_check', ...(profileRoute.via === 'reverse_proxy' ? ['reverse_proxy'] : [])])];
    const connection = { chat_completion_source: source };
    for (const k of keys) {
        const v = k === 'reverse_proxy' ? rpInPlay : oai[k];
        if (v === undefined) continue;
        if ((k === 'custom_include_headers' || k === 'custom_include_body') && CREDENTIAL.test(String(v))) {
            dropped.push({ key: k, why: 'looks like it holds credentials; not taken (set it in the isolated instance yourself if the provider needs it)' });
            continue;
        }
        connection[k] = v;
    }
    if (source === 'custom') {
        if (!connection.custom_url) throw new Error('the profile uses the Custom source without a URL');
        plainUrl(connection.custom_url, 'custom URL');
    } else {
        warnings.push(`the profile's Chat Completion source is "${source}", not "custom": the engine's own calls (planner, extractor, board) then go through generateRaw, without finish reasons or token counts in the records (the server log still has them)`);
    }
    if (profileRoute.via === 'reverse_proxy') plainUrl(connection.reverse_proxy, 'reverse proxy URL');
    // a reverse proxy SillyTavern does not use with this source stays out (it would change nothing, and it is no connection)
    const stale = oai.reverse_proxy && oai.reverse_proxy !== rpInPlay ? String(oai.reverse_proxy) : null;
    const reverseProxy = rpInPlay || stale ? { url: rpInPlay || null, used: profileRoute.via === 'reverse_proxy', preset: presetsInST ? settings.selected_proxy?.name || 'None' : null, stale } : null;
    if (reverseProxy && !reverseProxy.used) dropped.push({ key: 'reverse_proxy', why: rpInPlay ? `set in the profile, but SillyTavern does not use it with the source "${source}" (${source === 'custom' ? 'it sends to custom_url' : 'not a proxy source'}): not taken, the connection is the same without it` : `oai_settings.reverse_proxy (${stale}) is not in play: SillyTavern loads the proxy preset "${reverseProxy.preset}" over it` });
    if (pwInPlay || oai.proxy_password) dropped.push({ key: 'proxy_password', why: profileRoute.via === 'reverse_proxy' ? 'never taken: the isolated instance gets the key from the environment variable as the proxy password' : 'never taken' });
    // the route the isolated instance takes with what was taken, and whether it is the profile's
    const runnerRoute = routeOf({ ...connection, reverse_proxy: connection.reverse_proxy || '' });
    const differences = [];
    for (const k of ['source', 'via', 'url', 'model']) if (String(profileRoute[k] ?? '') !== String(runnerRoute[k] ?? '')) differences.push(`${k}: ${profileRoute[k] ?? '–'} → ${runnerRoute[k] ?? '–'}`);
    for (const d of dropped) if (['custom_include_headers', 'custom_include_body'].includes(d.key)) differences.push(`${d.key} nicht übernommen (sieht nach Zugangsdaten aus)`);
    const route = { profile: profileRoute, runner: runnerRoute, same: !differences.length, differences, reverseProxy, proxyPassword: pwInPlay, proxyPresets: presetsInST };

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
        username: settings.username || 'User', mainApi, source, connection, route, generation,
        streaming: generation.stream_openai ?? oai.stream_openai ?? null,
        preset: { mode: preset, name: preset === 'repo' ? repoPresetName : presetName, file: preset === 'repo' ? null : presetPath, text: preset === 'repo' ? repoPresetText : profilePresetText, unsaved, vsRepo },
        card: cardInfo, world, engineSettings: ext, warnings, dropped, read: reader.read,
    };
}

/** A route as one line: source, field, URL, model, where the key comes from. */
export function routeText(r, { keyFrom = null } = {}) {
    const where = r.via === 'custom_url' ? `custom_url ${r.url}` : r.via === 'reverse_proxy' ? `reverse_proxy ${r.url}` : `die eigene API der Quelle${r.url ? ` (${r.url})` : ''}`;
    return `Quelle "${r.source}" → ${where} · Modell ${r.model ?? '(keins)'} · Schlüssel: ${keyFrom || (r.via === 'reverse_proxy' ? 'proxy_password' : r.key)}`;
}

/** The connection, profile against runner, for --inspect, --check and the report (never a key). */
export function connectionLines(imp, { keyEnv = 'AVERETH_LIVE_API_KEY' } = {}) {
    const r = imp.route;
    const rp = r.reverseProxy;
    return [
        'VERBINDUNG',
        `  dein SillyTavern: ${routeText(r.profile)}`,
        `  der Runner:       ${routeText(r.runner, { keyFrom: `${keyEnv}${r.runner.via === 'reverse_proxy' ? ' (als proxy_password der Instanz)' : ` (als ${secretKeyOf(r.runner.source)} der Instanz)`}` })}`,
        `  reverse_proxy:    ${!rp ? `im Profil keiner${r.proxyPresets ? ' (Proxy-Preset „None“)' : ''}` : !rp.url ? `kein Proxy in Gebrauch: SillyTavern lädt das Proxy-Preset „${rp.preset}“ über das alte Feld oai_settings.reverse_proxy (${rp.stale})` : rp.used ? `${rp.preset ? `Proxy-Preset „${rp.preset}“, ` : 'im Profil '}${rp.url}: von SillyTavern benutzt, vom Runner übernommen${r.proxyPassword ? ' (das Proxy-Passwort deines Profils nicht: der Runner setzt den Schlüssel aus der Umgebungsvariable ein)' : ''}` : `${rp.preset ? `Proxy-Preset „${rp.preset}“, ` : 'im Profil '}${rp.url}, aber für Quelle "${r.profile.source}" ohne Wirkung (SillyTavern sendet an ${r.profile.via === 'custom_url' ? 'custom_url' : 'die eigene API'}): nicht übernommen`}${rp?.url && rp.stale ? ` · das alte Feld oai_settings.reverse_proxy (${rp.stale}) gilt nicht` : ''}`,
        `  ${r.same ? '✔ dieselbe Verbindung wie dein SillyTavern' : `✖ NICHT dieselbe Verbindung: ${r.differences.join('; ')}`}`,
        '  (den Schlüssel vergleicht der Runner nicht, er liest secrets.json nie; ob der Endpoint ihn annimmt und das Modell anbietet, zeigt --ping)',
    ];
}

/** The import as text for --inspect and the report: what is taken, never a key. */
export function describeImport(imp, opts = {}) {
    const lines = [
        `SillyTavern ${imp.st.version} in ${imp.st.dir}`,
        `Profil: ${imp.st.userDir} (nur gelesen)`,
        `Persona: ${imp.username} · API: ${imp.mainApi}`,
        '',
        ...connectionLines(imp, opts),
        `  übernommene Felder: ${Object.entries(imp.connection).filter(([k]) => k !== 'chat_completion_source').map(([k, v]) => `${k}=${typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v)}`).join(' · ') || '(keine)'}`,
        '',
        `Preset (${imp.preset.mode === 'repo' ? 'aus diesem Build' : 'aus dem Profil'}): ${imp.preset.name || '(keins)'}${imp.preset.unsaved.length ? ` · ungespeicherte Werte in Gebrauch: ${imp.preset.unsaved.join(', ')}` : ''}${imp.preset.vsRepo.length ? ` · weicht vom Build-Preset ab in: ${imp.preset.vsRepo.join(', ')}` : ' · gleich dem Build-Preset'}`,
        `Generierung: Temperatur ${imp.generation.temp_openai ?? '?'} · max. Tokens ${imp.generation.openai_max_tokens ?? '?'} · Kontext ${imp.generation.openai_max_context ?? '?'} · Reasoning ${imp.generation.reasoning_effort ?? '?'} · Streaming im Profil ${imp.streaming ? 'an' : 'aus'} (der Lauf sendet ohne Streaming, damit SillyTavern jede Antwort loggt)`,
        `Karte: ${imp.card ? `${imp.card.name} (Vertrag ${imp.card.contract || 'keiner'}, Begrüßung ${imp.card.first_mes.length} Zeichen, Lorebook ${imp.card.world || 'keins'})` : '(keine: Karte und Begrüßung des Runners)'}`,
        `Engine-Einstellungen: ${imp.engineSettings ? JSON.stringify(imp.engineSettings) : '(Standard)'}`,
        ...imp.dropped.map((d) => `nicht übernommen: ${d.key}: ${d.why}`),
        ...imp.warnings.map((w) => `Hinweis: ${w}`),
        `gelesene Dateien (${imp.read.length}): ${imp.read.map((r) => path.relative(imp.st.dir, r.file) || r.file).join(', ')}`,
    ];
    return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
    const imp = importProfile({ stDir: arg('--st') || process.env.AVERETH_ST_DIR, user: arg('--user') || 'default-user', card: arg('--card'), preset: arg('--preset') || 'profile' });
    console.log(describeImport(imp));
}
