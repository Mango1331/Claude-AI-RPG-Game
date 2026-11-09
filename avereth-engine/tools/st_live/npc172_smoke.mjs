// Real ST host / scripted provider (NPC E2-B, .172): from User04 at the inn (tests/v4/fixtures/user04_qol159.json.gz up
// to I70) Alaric goes to the Guild hall, where the clerk promises him a word with the quartermaster (a promise thread
// with its parties), goes back to the inn and returns: the narrator gets her arrival card NOT YET SHOWN with the open
// agreement on its attitude row and a KNOWN AT line without her, the extractor the whole KNOWN AT line; the reply meets
// her and settles the agreement by its words without who; save/reload and a regenerated reply keep one settlement with
// its parties; the next turn's card says settled. The provider is scripted: this proves the host path, never that a
// free extractor reports who or a free narrator uses the card.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { foldChat } from '../../src/host.js';

const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const SEED = 71; // I0–I70: at the inn
const HALL = 'loc.alderwatch.guild_hall', CLERKS = 'npc.npcguild_clerks', BOW = 'npc.npcbench_crossbowman';
const INN = foldChat(structuredClone(f.chat), SEED).state.scene.at;
const WORD = 'The clerk promised to put in a word for Alaric with the quartermaster';
const arrive = (at) => ({ seq: 1, type: 'arrive', at, with: null, forced_by: null, scene: null });
const go = (to, quote) => ({ commands: [{ seq: 1, type: 'go', to, quote, within: null }] });
export const npc172Turns = [
    { key: 'npc172promise', player: '*I cross over to the Guild hall to see the clerks*', plan: go(HALL, 'I cross over to the Guild hall to see the clerks'),
        reply: 'Alaric crossed into the Guild hall. The clerk at the long counter looked up, heard him out and promised to put in a word for him with the quartermaster.',
        answer: { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: CLERKS, evidence: 'The clerk at the long counter looked up' }] } },
            deltas: [arrive(HALL), { seq: 2, type: 'thread', id: null, text: WORD, kind: 'promise', status: 'open', resolution: null, who: ['pc', CLERKS], scene: null }] } },
    // .173 (GPT review of .172, P2): the clerk's promise to the crossbowman in almost Alaric's words stays theirs
    { key: 'npc173npc', player: '*I watch the clerk deal with the crossbowman*', plan: { commands: [] },
        reply: 'The stocky crossbowman leaned on the long counter; the clerk promised to put in a word for him with the quartermaster as well.',
        answer: { scene: 'here', expected: {}, deltas: [{ seq: 1, type: 'thread', id: null, text: 'The clerk promised to put in a word for the crossbowman with the quartermaster', kind: 'promise', status: 'open', resolution: null, who: [CLERKS, BOW], scene: null }] } },
    { key: 'npc172out', player: '*I head back to the inn for now*', plan: go(INN, 'I head back to the inn for now'),
        reply: 'Alaric walked back to the inn for now and took a seat by the hearth.',
        answer: { scene: INN, expected: { 1: { arrived: true, at: INN, with: null, met: null } }, deltas: [arrive(INN)] } },
    { key: 'npc172back', player: '*I return to the Guild hall for the clerk*', plan: go(HALL, 'I return to the Guild hall for the clerk'),
        reply: 'Alaric returned to the Guild hall. The clerk at the long counter waved him over: the quartermaster had heard his name, as she had promised.',
        answer: { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: CLERKS, evidence: 'The clerk at the long counter waved him over' }] } },
            deltas: [arrive(HALL), { seq: 2, type: 'thread', id: null, text: WORD, kind: 'promise', status: 'resolved', resolution: 'the clerk put in the word with the quartermaster', who: null, scene: null }] } },
    { key: 'npc172thanks', player: '*I thank the clerk for the word with the quartermaster*', plan: { commands: [] },
        reply: 'Alaric thanked the clerk; she shrugged it off with a small smile and went back to her ledger.',
        answer: { scene: 'here', expected: {}, deltas: [] } },
];
const allText = (request) => (request?.messages || []).map((m) => String(m.content)).join('\n');

export async function npc172Smoke({ page, send, idle, calls, onReload, out }) {
    await page.evaluate(async (prefix) => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); },
        structuredClone(f.chat.slice(0, SEED).map((m) => ({ name: m.is_user ? 'Alaric' : 'Avereth', ...m }))));
    onReload();
    await page.waitForTimeout(600);
    const snapshot = () => page.evaluate(async () => {
        const { foldChat, rec } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state;
        const r = chat.at(-1)?.is_user ? null : rec(chat.at(-1));
        return { errors: folded.errors, present: s.scene.present, at: s.scene.at, threads: s.threads, coin: s.entities.pc.sheet.coin_cp,
            replyEvents: (r?.events || []).map((e) => ({ t: e.t, d: ['thread.set', 'scene.entered'].includes(e.t) ? e.d : null })),
            context: r?.narration?.context || null, extraction: r?.extraction?.status || null };
    });
    const checks = {}, evidence = [];
    const play = async (key) => {
        const before = await snapshot(), n = calls.length;
        await send(npc172Turns.find((t) => t.key === key).player); await idle();
        const st = await snapshot();
        const extract = calls.slice(n).filter((c) => c.purpose === 'extract');
        const narr = calls.slice(n).findLast((c) => c.purpose === 'narrator');
        const nt = allText(narr).split('\n');
        evidence.push({ key, arrival: st.context?.arrivalNpcIds || null, focus: st.context?.focusNpcIds || null,
            narratorArrival: nt.filter((l) => /^ARRIVING AT |NOT YET SHOWN$|between you/.test(l)), narratorKnownAt: nt.filter((l) => /^KNOWN AT /.test(l)),
            extractorKnownAt: allText(extract.at(-1)).split('\n').filter((l) => /KNOWN AT /.test(l)).map((l) => l.slice(0, 400)), threads: Object.values(st.threads).filter((t) => t.text === WORD) });
        return { st, before, extract, narr: nt };
    };
    const word = (st) => Object.values(st.threads).filter((t) => t.text === WORD);
    // 1. the promise at the hall: one thread, parties {pc, clerk}
    const a = await play('npc172promise');
    checks.promiseBound = word(a.st).length === 1 && JSON.stringify(word(a.st)[0].who) === JSON.stringify(['pc', CLERKS]) && word(a.st)[0].status === 'open'
        && a.st.present.includes(CLERKS) && !a.st.errors.length && a.st.extraction === 'applied';
    // 1b. .173: an agreement of the clerk with the crossbowman in almost the same words is its own thread; #npc shows
    // Alaric's one agreement with her only
    const n = await play('npc173npc');
    const theirs = Object.values(n.st.threads).filter((t) => /for the crossbowman/.test(t.text));
    await send('#npc clerk'); await idle();
    const npcPanel = await page.evaluate(() => { const c = SillyTavern.getContext().chat; return String(c.at(-1)?.mes || ''); });
    const open = ((l) => { const i = l.indexOf('Open between you:'); const out = []; for (let k = i + 1; i >= 0 && k < l.length && l[k].startsWith('- '); k++) out.push(l[k]); return out; })(npcPanel.split('\n'));
    checks.npcAgreementSeparate = word(n.st).length === 1 && JSON.stringify(word(n.st)[0].who) === JSON.stringify(['pc', CLERKS])
        && theirs.length === 1 && JSON.stringify(theirs[0].who) === JSON.stringify([CLERKS, BOW]) && !n.st.errors.length && n.st.extraction === 'applied';
    checks.npcPanelOnlyHis = JSON.stringify(open) === JSON.stringify([`- ${WORD}`]);
    evidence.push({ key: 'npc173panel', panel: npcPanel.split('\n').slice(0, 12) });
    // 2. back to the inn, then the return: her card NOT YET SHOWN with the agreement; KNOWN AT trimmed for the narrator only
    const b = await play('npc172out');
    // one arrival card (the innkeeper): the other slot stays with the clerk he leaves, with their agreement on it
    checks.oneCardKeepsInterlocutor = (b.st.context?.arrivalNpcIds || []).length === 1 && (b.st.context?.focusNpcIds || []).includes(CLERKS)
        && b.narr.some((l) => /^ {2}toward Alaric: .*; between you: The clerk promised to put in a word/.test(l));
    const c = await play('npc172back');
    const head = c.narr.findIndex((l) => l.startsWith('• ') && l.includes(`[${CLERKS}]`) && l.endsWith('; NOT YET SHOWN'));
    checks.arrivalCard = c.narr.some((l) => l.startsWith("ARRIVING AT Adventurers' Guild hall, Alderwatch — people known there; NOT YET SHOWN")) && head >= 0
        && /^ {2}toward Alaric: .*; between you: The clerk promised to put in a word/.test(c.narr[head + 1] || '') && (c.st.context?.arrivalNpcIds || []).includes(CLERKS);
    checks.narratorKnownAtTrimmed = c.narr.filter((l) => l.startsWith('KNOWN AT ')).every((l) => !l.includes(`(${CLERKS})`));
    checks.extractorKnownAtFull = c.extract.length === 1 && allText(c.extract[0]).split('\n').some((l) => /KNOWN AT /.test(l) && l.includes(`(${CLERKS})`));
    // 3. the reply meets her and settles it by its words without who: the parties stay
    checks.settledKeepsParties = word(c.st).length === 1 && word(c.st)[0].status === 'resolved' && JSON.stringify(word(c.st)[0].who) === JSON.stringify(['pc', CLERKS])
        && c.st.present.includes(CLERKS) && c.st.replyEvents.filter((e) => e.t === 'thread.set').length === 1 && !c.st.errors.length && c.st.extraction === 'applied' && c.st.coin === c.before.coin;
    // 4. save/reload: the same threads and presence
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); await SillyTavern.getContext().reloadCurrentChat(); });
    onReload(); await page.waitForTimeout(800);
    const re = await snapshot();
    checks.saveReload = !re.errors.length && JSON.stringify(re.threads) === JSON.stringify(c.st.threads) && JSON.stringify(re.present) === JSON.stringify(c.st.present);
    // 5. a regenerated reply (swipe): one settlement with its parties, the same arrival card ids
    await page.evaluate(() => document.querySelector('#chat .last_mes .swipe_right')?.click()); await page.waitForTimeout(400); await idle();
    const sw = await snapshot();
    checks.regenerateOneSettlement = !sw.errors.length && word(sw).length === 1 && word(sw)[0].status === 'resolved' && JSON.stringify(word(sw)[0].who) === JSON.stringify(['pc', CLERKS])
        && sw.replyEvents.filter((e) => e.t === 'thread.set').length === 1 && JSON.stringify(sw.context?.arrivalNpcIds || null) === JSON.stringify(c.st.context?.arrivalNpcIds || null);
    // 6. the next turn: her card says settled, nothing open between them
    const d = await play('npc172thanks');
    checks.settledCard = d.narr.some((l) => /between you: settled — The clerk promised to put in a word/.test(l)) && !d.narr.some((l) => /open between you:/.test(l)) && !d.st.errors.length;
    fs.writeFileSync(path.join(out, 'npc172_requests.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
