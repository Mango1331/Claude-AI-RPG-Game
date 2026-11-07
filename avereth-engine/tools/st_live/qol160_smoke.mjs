// Real ST host / scripted provider: targeted User04 paths, no natural-model quality claim.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const hall = 'loc.alderwatch.guild_hall';
const commands = i => f.chat[i].extra.avereth.ir.acts.map(({ act, source, ...c }) => ({ ...c, type: act }));
export const qol160Turns = [
    { key: 'qol160board', player: f.chat[71].mes, plan: { commands: f.chat[71].extra.avereth.events.find(e => e.t === 'cmd.interpreted').d.commands },
        reply: 'Alaric reached the Guild hall and studied the notices while quills scratched behind the counter.',
        answer: { scene: hall, expected: { 1: { arrived: true, at: hall, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: hall, with: null, forced_by: null, scene: hall }] } },
    { key: 'qol160titan', player: f.chat[81].mes, plan: { commands: commands(81) }, reply: 'The lance struck the Titan. Alerted to the attack, it swung toward the cast.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'qol160clear', player: f.chat[51].mes, plan: { commands: commands(51) }, reply: 'The Warden fell. The guardian seal gave way, leaving access below; Alaric stayed in the hall.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'qol160search', player: f.chat[59].mes, plan: { commands: commands(59) }, reply: 'Alaric searched the chamber. The guardian seal remained released, but he stayed on floor one.', answer: { scene: 'here', expected: {}, deltas: [] } },
    { key: 'qol160guild', player: f.chat[65].mes, plan: { commands: [] }, reply: 'Alaric asked about deeper levels. The clerk considered the question.', answer: { scene: 'here', expected: {}, deltas: [] } },
];
let reading = false;
export const qol160BoardAnswer = () => reading ? f.boardAnswer : null;
export async function qol160Smoke({ page, send, idle, calls, driver, onReload, out }) {
    const seed = async end => { await page.evaluate(async prefix => { const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix); await c.saveChat(); await c.reloadCurrentChat(); }, structuredClone(f.chat.slice(0, end))); onReload(); };
    const snapshot = () => page.evaluate(async () => {
        const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, folded = foldChat(chat), s = folded.state, r = chat.at(-1)?.extra?.avereth;
        return { at: s.scene.at, awareness: s.scene.awareness, concealed: s.scene.concealed, coin: s.entities.pc.sheet.coin_cp,
            cards: (chat.at(-1)?.extra?.display_text?.match(/class="avereth-board-card"/g) || []).length,
            context: r?.narration?.context, errors: folded.errors, extraction: r?.extraction?.status,
            boardShown: r?.events?.filter(e => e.t === 'board.shown').length || 0 };
    });
    const checks = {}, evidence = [];
    for (const [key, end] of [['board', 71], ['titan', 81], ['clear', 51], ['search', 59], ['guild', 65]]) {
        await seed(end); const before = await snapshot(), n = calls.length;
        const t = qol160Turns.find(t => t.key === `qol160${key}`);
        reading = key === 'board'; await send(t.player); await idle(); reading = false;
        const state = await snapshot(), request = calls.slice(n).findLast(c => c.purpose === 'narrator');
        const block = String(request?.messages.find(m => String(m.content).startsWith('[AVERETH ENGINE'))?.content || '');
        checks[`${key}HostApplied`] = !state.errors.length && state.extraction === 'applied';
        if (key === 'board') {
            checks.boardCardsAfterArrival = state.at === hall && state.cards === 5 && state.boardShown === 1;
            checks.boardReferenceOnly = /REFERENCE ONLY/.test(block) && !/present the notices in the existing title-first/.test(block) && /individual contract/.test(block);
            checks.boardNoPayment = before.coin === state.coin;
        } else if (key === 'titan') {
            const now = block.split('\n').find(l => l.startsWith('STATE NOW')) || '';
            checks.titanCurrentAwareness = /aware of Alaric/.test(now) && /not proof of exact visual/.test(now) && /ENTRY, BEFORE/.test(block);
            checks.titanConcealmentPreserved = state.concealed.includes('pc') && Object.values(state.awareness).includes('aware');
        } else {
            checks[`${key}AccessDelivered`] = /DUNGEON ACCESS NOW[^\n]*RELEASED/.test(block);
            checks[`${key}NoMove`] = state.at === before.at;
        }
        evidence.push({ key, context: state.context, engine_chars: block.length, critical_lines: block.split('\n').filter(l => /^(STATE NOW|DUNGEON ACCESS NOW|Combat starts)/.test(l)) });
    }
    checks.saved = await driver().verifySaved(await driver().chat(), { complete: true });
    fs.writeFileSync(path.join(out, 'qol160_contexts.json'), JSON.stringify(evidence, null, 2));
    return checks;
}
