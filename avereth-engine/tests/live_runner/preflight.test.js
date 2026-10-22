// The live runner's provider preflight and connection route (docs/LIVE_RUNNER.md §2, §3): the profile's route through
// custom_url or reverse_proxy as SillyTavern takes it, the runner's route against it, the instance's proxy password,
// and the model list of GET /models (a local proxy that narrows it, Featherless) against the profile's model.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importProfile, routeOf, describeImport, PRESET_TO_SETTINGS } from '../../tools/st_live/live/import_profile.mjs';
import { probeModels, probeRows, probeBlocks, modelIds } from '../../tools/st_live/live/preflight.mjs';
import { createInstance, seedProfile, removeKey, cardPng, CONTRACT_FILE, WORLD } from '../../tools/st_live/live/profile.mjs';
import { preflight, options } from '../../tools/st_live/live/run_live.mjs';
import { treeStat, treeDiff } from '../../tools/st_live/live/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-pf-test-'));
const PROXY = 'http://127.0.0.1:5005/v1';
const FIVE = ['zai-org/GLM-4.6', 'zai-org/GLM-4.5-Air', 'moonshotai/Kimi-K2-Instruct', 'deepseek-ai/DeepSeek-V3.1', 'Qwen/Qwen3-235B-A22B'];

// presets: a SillyTavern with proxy presets (1.19: loadProxyPresets in public/scripts/openai.js); top: top-level settings
function profile(oai, { presets = false, top = {} } = {}) {
    const st = tmp();
    fs.writeFileSync(path.join(st, 'server.js'), '');
    if (presets) { fs.mkdirSync(path.join(st, 'public', 'scripts'), { recursive: true }); fs.writeFileSync(path.join(st, 'public', 'scripts', 'openai.js'), 'export function loadProxyPresets(settings) {}'); }
    fs.writeFileSync(path.join(st, 'package.json'), JSON.stringify({ version: '1.19.0' }));
    const user = path.join(st, 'data', 'default-user');
    fs.mkdirSync(path.join(user, 'characters'), { recursive: true });
    const preset = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets', 'Avereth Narrator V4.json'), 'utf8'));
    fs.writeFileSync(path.join(user, 'settings.json'), JSON.stringify({ username: 'Alaric', main_api: 'openai', ...top, oai_settings: { ...Object.fromEntries(Object.entries(preset).map(([k, v]) => [PRESET_TO_SETTINGS[k] || k, v])), ...oai } }));
    fs.writeFileSync(path.join(user, 'characters', 'Avereth V4.png'), cardPng({ name: 'Avereth V4', description: fs.readFileSync(CONTRACT_FILE, 'utf8'), first_mes: 'hi', world: WORLD }));
    fs.writeFileSync(path.join(user, 'secrets.json'), JSON.stringify({ api_key_custom: [{ value: 'PERSONAL' }] }));
    return st;
}
const fakeFetch = (status, body) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('route: custom goes to custom_url whatever reverse_proxy says; a proxy source goes to its reverse proxy', () => {
    assert.deepEqual(routeOf({ chat_completion_source: 'custom', custom_url: PROXY, custom_model: 'm', reverse_proxy: 'http://x/v1' }), { source: 'custom', via: 'custom_url', url: PROXY, model: 'm', key: 'secrets.json api_key_custom' });
    assert.deepEqual(routeOf({ chat_completion_source: 'openai', reverse_proxy: PROXY, openai_model: 'zai-org/GLM-4.6' }), { source: 'openai', via: 'reverse_proxy', url: PROXY, model: 'zai-org/GLM-4.6', key: 'proxy_password' });
    assert.equal(routeOf({ chat_completion_source: 'openai', reverse_proxy: '', openai_model: 'gpt' }).via, 'source');
    assert.equal(routeOf({ chat_completion_source: 'openrouter', reverse_proxy: PROXY, openrouter_model: 'x' }).via, 'source', 'OpenRouter is no proxy source');
    assert.equal(routeOf({ chat_completion_source: 'makersuite', reverse_proxy: PROXY, google_model: 'g' }).model, 'g');
});

test('import, custom with a stray reverse_proxy: same connection, the reverse proxy named as without effect and not taken', () => {
    const st = profile({ chat_completion_source: 'custom', custom_url: PROXY, custom_model: 'zai-org/GLM-4.6', reverse_proxy: 'http://127.0.0.1:9999/v1', proxy_password: 'PW-SECRET' });
    const before = treeStat(st);
    const imp = importProfile({ stDir: st });
    assert.equal(imp.route.profile.via, 'custom_url');
    assert.equal(imp.route.runner.url, PROXY);
    assert.equal(imp.route.same, true);
    assert.equal(imp.connection.reverse_proxy, undefined);
    assert.deepEqual(imp.route.reverseProxy, { url: 'http://127.0.0.1:9999/v1', used: false, preset: null, stale: null }, 'a SillyTavern without proxy presets');
    assert.match(imp.dropped.find((d) => d.key === 'reverse_proxy').why, /does not use it with the source "custom"/);
    const text = describeImport(imp);
    assert.match(text, /dein SillyTavern: Quelle "custom" → custom_url http:\/\/127\.0\.0\.1:5005\/v1 · Modell zai-org\/GLM-4\.6/);
    assert.match(text, /der Runner: {7}Quelle "custom" → custom_url http:\/\/127\.0\.0\.1:5005\/v1 · Modell zai-org\/GLM-4\.6 · Schlüssel: AVERETH_LIVE_API_KEY \(als api_key_custom der Instanz\)/);
    assert.match(text, /reverse_proxy: {4}im Profil http:\/\/127\.0\.0\.1:9999\/v1, aber für Quelle "custom" ohne Wirkung/);
    assert.match(text, /✔ dieselbe Verbindung wie dein SillyTavern/);
    assert.ok(!JSON.stringify(imp).includes('PW-SECRET') && !text.includes('PW-SECRET'));
    assert.ok(treeDiff(before, treeStat(st)).same, 'the profile is not changed');
});

test('import, OpenAI source through a reverse proxy: the proxy is taken, its password is not', () => {
    const imp = importProfile({ stDir: profile({ chat_completion_source: 'openai', reverse_proxy: PROXY, openai_model: 'zai-org/GLM-4.6', proxy_password: 'PW-SECRET', custom_url: 'http://unused/v1' }) });
    assert.equal(imp.route.profile.via, 'reverse_proxy');
    assert.equal(imp.connection.reverse_proxy, PROXY);
    assert.equal(imp.connection.openai_model, 'zai-org/GLM-4.6');
    assert.equal(imp.connection.custom_url, undefined);
    assert.equal(imp.route.same, true);
    assert.equal(imp.route.proxyPassword, true);
    assert.match(imp.dropped.find((d) => d.key === 'proxy_password').why, /key from the environment variable as the proxy password/);
    const text = describeImport(imp);
    assert.match(text, /dein SillyTavern: Quelle "openai" → reverse_proxy http:\/\/127\.0\.0\.1:5005\/v1 · Modell zai-org\/GLM-4\.6 · Schlüssel: proxy_password/);
    assert.match(text, /der Runner: .* reverse_proxy http:\/\/127\.0\.0\.1:5005\/v1 .* AVERETH_LIVE_API_KEY \(als proxy_password der Instanz\)/);
    assert.match(text, /vom Runner übernommen \(das Proxy-Passwort deines Profils nicht/);
    assert.ok(!JSON.stringify(imp).includes('PW-SECRET'));
    assert.throws(() => importProfile({ stDir: profile({ chat_completion_source: 'openai', reverse_proxy: 'http://u:p@127.0.0.1:5005/v1', openai_model: 'x' }) }), /reverse proxy URL carries credentials/);
});

test('import, SillyTavern with proxy presets: the selected preset is the proxy in play, not the old oai_settings field', () => {
    const feather = { name: 'Featherless', url: PROXY, password: 'PW-SECRET' };
    const imp = importProfile({ stDir: profile({ chat_completion_source: 'openai', reverse_proxy: 'http://old.example/v1', proxy_password: 'OLD-PW', openai_model: 'zai-org/GLM-4.6' }, { presets: true, top: { proxies: [{ name: 'None', url: '', password: '' }, feather], selected_proxy: feather } }) });
    assert.equal(imp.route.profile.via, 'reverse_proxy');
    assert.equal(imp.route.profile.url, PROXY);
    assert.equal(imp.connection.reverse_proxy, PROXY);
    assert.deepEqual(imp.route.reverseProxy, { url: PROXY, used: true, preset: 'Featherless', stale: 'http://old.example/v1' });
    assert.equal(imp.route.same, true);
    const text = describeImport(imp);
    assert.match(text, /reverse_proxy: {4}Proxy-Preset „Featherless“, http:\/\/127\.0\.0\.1:5005\/v1: von SillyTavern benutzt, vom Runner übernommen/);
    assert.match(text, /das alte Feld oai_settings\.reverse_proxy \(http:\/\/old\.example\/v1\) gilt nicht/);
    assert.ok(!JSON.stringify(imp).includes('PW-SECRET') && !JSON.stringify(imp).includes('OLD-PW'));
    // no preset selected: SillyTavern loads "None" over the old field, there is no proxy in play
    const none = importProfile({ stDir: profile({ chat_completion_source: 'openai', reverse_proxy: 'http://old.example/v1', openai_model: 'gpt-x' }, { presets: true }) });
    assert.equal(none.route.profile.via, 'source');
    assert.equal(none.connection.reverse_proxy, undefined);
    assert.match(describeImport(none), /kein Proxy in Gebrauch: SillyTavern lädt das Proxy-Preset „None“ über das alte Feld oai_settings\.reverse_proxy \(http:\/\/old\.example\/v1\)/);
});

test('import: a dropped credential header makes the connection "not the same"', () => {
    const imp = importProfile({ stDir: profile({ chat_completion_source: 'custom', custom_url: PROXY, custom_model: 'm', custom_include_headers: 'Authorization: Bearer XYZ' }) });
    assert.equal(imp.route.same, false);
    assert.deepEqual(imp.route.differences, ['custom_include_headers nicht übernommen (sieht nach Zugangsdaten aus)']);
    assert.match(describeImport(imp), /✖ NICHT dieselbe Verbindung: custom_include_headers nicht übernommen/);
});

test('the instance: the proxy route gets the reverse proxy and the key as its password; removeKey empties it again', () => {
    const imp = importProfile({ stDir: profile({ chat_completion_source: 'openai', reverse_proxy: PROXY, openai_model: 'zai-org/GLM-4.6', proxy_password: 'PW-SECRET' }) });
    const inst = createInstance({ runId: 't', runDir: path.join(tmp(), 'run') });
    fs.mkdirSync(inst.user, { recursive: true });
    fs.writeFileSync(path.join(inst.user, 'settings.json'), JSON.stringify({ oai_settings: { reverse_proxy: '', proxy_password: '' } }));
    const setup = seedProfile(inst, imp, { key: 'ENV-KEY-123' });
    assert.equal(setup.via, 'reverse_proxy');
    assert.equal(setup.model, 'zai-org/GLM-4.6');
    const all = JSON.parse(fs.readFileSync(path.join(inst.user, 'settings.json'), 'utf8'));
    const s = all.oai_settings;
    assert.deepEqual([s.chat_completion_source, s.reverse_proxy, s.proxy_password, s.openai_model], ['openai', PROXY, 'ENV-KEY-123', 'zai-org/GLM-4.6']);
    assert.deepEqual(all.selected_proxy, { name: 'Avereth Live', url: PROXY, password: 'ENV-KEY-123' }, 'the preset SillyTavern loads over oai_settings');
    assert.deepEqual(all.proxies.map((p) => p.name), ['None', 'Avereth Live']);
    removeKey(inst);
    const after = JSON.parse(fs.readFileSync(path.join(inst.user, 'settings.json'), 'utf8'));
    assert.equal(after.oai_settings.proxy_password, '');
    assert.equal(after.selected_proxy.password, '');
    assert.ok(after.proxies.every((p) => p.password === ''));
    assert.ok(!JSON.stringify(after).includes('ENV-KEY-123'));
    assert.ok(!fs.existsSync(path.join(inst.user, 'secrets.json')));
    // the custom route: no reverse proxy in the instance even when the profile has one
    const imp2 = importProfile({ stDir: profile({ chat_completion_source: 'custom', custom_url: PROXY, custom_model: 'm', reverse_proxy: 'http://127.0.0.1:9999/v1' }) });
    seedProfile(inst, imp2, { key: 'ENV-KEY-123' });
    const s2 = JSON.parse(fs.readFileSync(path.join(inst.user, 'settings.json'), 'utf8')).oai_settings;
    assert.deepEqual([s2.chat_completion_source, s2.custom_url, s2.reverse_proxy, s2.proxy_password], ['custom', PROXY, '', '']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(inst.user, 'settings.json'), 'utf8')).selected_proxy.name, 'None');
    fs.rmSync(inst.root, { recursive: true, force: true });
});

test('preflight: the profile\'s model in the proxy\'s five, a missing one, a refused key, no proxy running', async () => {
    assert.deepEqual(modelIds({ data: [{ id: 'a' }, { id: 'b' }] }), ['a', 'b']);
    assert.deepEqual(modelIds(['a']), ['a']);
    assert.equal(modelIds({ nothing: 1 }), null);
    const list = { object: 'list', data: FIVE.map((id) => ({ id, object: 'model' })) };
    const seen = [];
    const ok = await probeModels({ url: `${PROXY}/`, key: 'K', model: 'zai-org/GLM-4.6', fetchImpl: async (u, init) => { seen.push([u, init.headers.authorization]); return fakeFetch(200, list)(); } });
    assert.deepEqual(seen, [[`${PROXY}/models`, 'Bearer K']]);
    assert.equal(ok.found, true);
    assert.equal(probeBlocks(ok), null);
    assert.match(probeRows(ok, { model: 'zai-org/GLM-4.6' })[1].detail, /„zai-org\/GLM-4\.6“ ist eines von 5/);
    const miss = await probeModels({ url: PROXY, model: 'zai-org/glm-4.6', fetchImpl: fakeFetch(200, list) });
    assert.equal(miss.found, false);
    assert.deepEqual(miss.near, ['zai-org/GLM-4.6']);
    const row = probeRows(miss, { model: 'zai-org/glm-4.6' })[1];
    assert.equal(row.good, false);
    assert.match(row.detail, /„zai-org\/glm-4\.6“ steht nicht in der Liste von http:\/\/127\.0\.0\.1:5005\/v1\/models \(5: zai-org\/GLM-4\.6, .*Qwen\/Qwen3-235B-A22B\); ähnlich: zai-org\/GLM-4\.6/);
    assert.match(probeBlocks(miss), /not in the model list/);
    const denied = await probeModels({ url: PROXY, key: 'bad', model: 'x', fetchImpl: fakeFetch(401, { error: { message: 'invalid key' } }) });
    assert.match(probeRows(denied, { model: 'x' })[0].detail, /abgelehnt/);
    assert.match(probeBlocks(denied), /refused the key/);
    const down = await probeModels({ url: PROXY, model: 'x', fetchImpl: async () => { throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); } });
    assert.equal(down.reachable, false);
    assert.match(probeRows(down, { model: 'x' })[0].detail, /ECONNREFUSED\. Läuft dein Proxy \(z\. B\. der Featherless-Proxy\)\? Der Runner startet ihn nicht\./);
    assert.match(probeBlocks(down), /does not answer/);
    const nolist = await probeModels({ url: PROXY, model: 'x', fetchImpl: fakeFetch(404, null) });
    assert.equal(probeBlocks(nolist), null, 'no /models: the run goes on, SillyTavern decides (bypass status check)');
    const noauth = [];
    await probeModels({ url: PROXY, model: 'x', fetchImpl: async (u, init) => { noauth.push(init.headers); return fakeFetch(200, list)(); } });
    assert.deepEqual(noauth, [{}], 'without a key no Authorization header (a local proxy may hold the key itself)');
});

test('preflight of --check: the player\'s own model is asked for too', async () => {
    const imp = importProfile({ stDir: profile({ chat_completion_source: 'custom', custom_url: PROXY, custom_model: 'zai-org/GLM-4.6' }) });
    const list = { data: FIVE.map((id) => ({ id })) };
    const o = options(['--config', path.join(tmp(), 'none.json')], {});
    assert.deepEqual((await preflight(o, imp, 'K', { fetchImpl: fakeFetch(200, list) })).map((r) => r.good), [true, true]);
    o.player.model = 'meta-llama/Llama-3.3-70B';
    const rows = await preflight(o, imp, 'K', { fetchImpl: fakeFetch(200, list) });
    assert.deepEqual(rows.map((r) => [r.good, r.what]), [[true, 'Endpoint erreichbar (GET /models)'], [true, 'Modell-ID (SillyTavern) in der Modellliste'], [true, 'Endpoint erreichbar (GET /models) [Spieler]'], [false, 'Modell-ID (Spieler) in der Modellliste [Spieler]']]);
});
