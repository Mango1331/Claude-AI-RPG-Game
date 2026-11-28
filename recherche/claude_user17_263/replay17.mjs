// Offline replay of User17 (.263) through the real runtime with the archived model answers (no provider requests).
// node replay17.mjs <engineRoot> <chat.jsonl> <answers.json> [adapt.mjs] [outChat.json]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [root, chatPath, answersPath, adaptPath, out] = process.argv.slice(2);
const url = p => pathToFileURL(path.join(root, p)).href;
const {engineAt, normalizeEvent} = await import(url('tools/replay/replay.mjs'));
const {actionPrefix} = await import(url('src/action_input.js'));
const {host, runtime, content} = await engineAt(root);
const original = fs.readFileSync(chatPath, 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8')).answers;
const adapt = adaptPath && adaptPath !== '-' ? await import(pathToFileURL(path.resolve(adaptPath)).href) : {};
const stopAt = adapt.stopAt ?? original.length - 1;
const chat = structuredClone(original).slice(0, stopAt + 1);
for (const m of adapt.append || []) { chat.push(m); original.push({...m, extra: {avereth: {input_hash: 'synthetic', extraction: {}}}}); }
const strip = evs => JSON.stringify((evs || []).map(normalizeEvent));
const report = [];
for (let i = 1; i < chat.length; i++) {
    const rec = host.rec(original[i]);
    if (!rec?.input_hash && !rec?.extraction) continue;
    const prefix = chat.slice(0, i + 1);
    const cur = chat[i];
    if (adapt.prose?.[i]) cur.mes = adapt.prose[i];
    delete cur.extra.avereth;
    if (cur.extra.avereth_action_input) cur.extra.avereth_action_input.base_revision = actionPrefix(prefix, i);
    const queue = structuredClone(answers[i] || adapt.synthetic?.[i] || []);
    const asked = [];
    const llm = async ({purpose}) => {
        asked.push(purpose);
        const e = queue.shift();
        if (!e && adapt.extra) { const v = adapt.extra(i, purpose, asked.length); if (v != null) return v; }
        assert.equal(e?.purpose, purpose, `unexpected mock call ${purpose} at M${i}`);
        return adapt.answer ? adapt.answer(i, purpose, e.content, asked.length) : e.content;
    };
    if (cur.is_user) {
        if (cur.is_system && rec.command) cur.is_system = false;
        const synth = i >= original.length - (adapt.append || []).length;
        const step = await runtime.prepareGenerationAsync(prefix, content, synth ? {settings: {budget: 1400, rulesBudget: 800, recentTurns: 4, engineLore: false}, llm} : {type: 'normal', llm});
        if (i >= original.length - (adapt.append || []).length) console.error('STEP', i, step?.action, JSON.stringify(step?.panels || step?.notice || '').slice(0, 600));
    } else {
        assert.ok(runtime.processReplyAny(prefix, i, content, {}).extract, 'X expected M' + i);
        await runtime.runExtraction(prefix, i, content, llm);
    }
    const now = host.rec(cur);
    const same = strip(now.events) === strip(rec.events);
    const ev = now.events || [];
    const lastOut = host.foldChat(prefix).state.last?.outcome || {};
    const gos = (lastOut.auth?.gos || []).map(g => ({to: g.to, newName: g.newName, mode: g.mode, enter: g.enter, scope: g.scope, section: g.section?.id}));
    const lines = (lastOut.actions || lastOut.lines || []).map(a => String(a.line || a).slice(0, 160));
    const moved = ev.filter(e => e.t === 'scene.moved').map(e => e.d.at);
    const made = ev.filter(e => e.t === 'place.created').map(e => e.d.place.id);
    const rej = ev.filter(e => e.t === 'delta.rejected').map(e => `${e.d.item?.type}:${e.d.rule}:${String(e.d.reason).slice(0, 110)}`);
    const time = ev.filter(e => e.t === 'time.advanced').map(e => `${e.d.minutes}:${e.d.why}`);
    report.push({i, user: !!cur.is_user, asked, unused: queue.length, events: ev.length, same, ...(cur.is_user ? {gos, lines} : {moved, made, rej, time}),
        x: now.extraction ? {status: now.extraction.status, repaired: now.extraction.repaired} : undefined});
}
const {state, errors} = host.foldChat(chat);
const places = Object.values(state.places).filter(p => p.created?.turn >= 8).map(p => `${p.id} <${p.kind}> parent=${p.parent}`);
const links = Object.values(state.links || {}).map(l => `${l.id}: ${l.a} <-> ${l.b} (${l.name})`);
console.log(JSON.stringify({report, errors, at: state.scene.at, approaching: state.scene.approaching || null,
    minute: state.clock?.minute, places, links}, null, 1));
if (out) fs.writeFileSync(out, JSON.stringify(chat));
