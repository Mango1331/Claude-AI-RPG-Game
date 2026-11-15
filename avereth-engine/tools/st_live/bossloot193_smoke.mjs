// Original User04 Warden on the real ST host. All model answers are scripted.
import fs from 'node:fs';
import zlib from 'node:zlib';
const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../../tests/v4/fixtures/user04_qol159.json.gz', import.meta.url))));
const player = 'I finish the Gallery Warden with Flame Lance.';
export const bossloot193Turns = [{ key: 'bossloot193', player,
    plan: {commands: [{seq: 1, type: 'use_skill', skill: 'mage.flame_lance', target: 'mon.old_crown_catacombs_c1_l1_e3', quote: player}]},
    reply: 'The Gallery Warden fell. Beside the remains lay the reward already recorded in Alaric\'s pouch.',
    answer: {scene: 'here', expected: {}, deltas: []} }];

export async function bossloot193Smoke({page, send, onReload, calls, out}) {
    await page.evaluate(async prefix => {
        const c = SillyTavern.getContext(); c.chat.splice(0, c.chat.length, ...prefix);
        await c.saveChat(); await c.reloadCurrentChat();
    }, structuredClone(fixture.chat.slice(0,51)));
    onReload(); await page.waitForTimeout(600);
    await send(player);
    const snapshot = async () => page.evaluate(async () => {
        const {foldChat, rec} = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const c = SillyTavern.getContext(), f = foldChat(c.chat);
        const r = rec(c.chat.findLast(m => m.is_user));
        const o = r?.events.findLast(e => e.t === 'outcome.recorded')?.d.outcome;
        return {errors:f.errors, outcome:o, objects:Object.values(f.state.objects).filter(o=>o.source?.how==='special_reward'),
            screen:document.body.innerText, events: r?.events};
    });
    const before = await snapshot();
    await page.evaluate(async () => {const c=SillyTavern.getContext();await c.saveChat();await c.reloadCurrentChat();});
    onReload(); await page.waitForTimeout(600);
    const after = await snapshot();
    const narrator = calls.findLast(c=>c.purpose==='narrator' && c.lastUser.includes(player));
    const extractor = calls.findLast(c=>c.purpose==='extract');
    const text = c => (c?.messages || []).map(m=>m.content).join('\n');
    const checks = {
        originalWardenFirst: before.outcome?.rewards?.[0]?.first === true && before.objects.length>0,
        actualHud: /SPECIAL REWARD/.test(before.screen) && /value guide/.test(before.screen),
        narratorContract: /SPECIAL REWARD/.test(text(narrator)) && /hoard is a narrative frame/.test(text(narrator)),
        realGrantNames: before.objects.every(o=>before.outcome.booked.grants.includes(o.name)) && !before.outcome.booked.grants.some(n=>/SPECIAL REWARD|value guide/.test(n)),
        extractorSeesFind: before.objects.every(o=>text(extractor).includes(o.name)),
        reloadNoDuplicate: JSON.stringify(before.objects)===JSON.stringify(after.objects) && !after.errors?.length,
    };
    fs.writeFileSync(`${out}/bossloot193.json`,JSON.stringify({checks,objects:before.objects,outcome:before.outcome},null,2));
    return checks;
}
