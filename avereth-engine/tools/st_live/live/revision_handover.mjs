// A controlled counterfactual on the exact stored C19 prefix. All new answers here are mock answers.
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import fs from 'node:fs';

const original =
    'e276cbd8eb149a2b3a0817dba0cfcc40832d4f03:testrun_10b/openrouter-20261124-kontinuitaet-fokus/tasche/original-start.jsonl.gz';
const wren = 'npc.mother_wren';
const satchel = 'obj.t40.mother_wrens_leather_satchel';
const origin = 'loc.ashbridge.almshouse_on_the_far_bank';
const farm = 'loc.halloran_steading';
const marker = 'Bellthread';
const refusal =
    'Mother Wren keeps her leather satchel against her chest. "Not tonight," she says. The door stays shut. Neither of them leaves the almshouse.';
const acceptance =
    'Mother Wren passes her leather satchel into Alaric’s hands. Alaric reached the Halloran steading with Mother Wren. At its gate she says quietly, "Bellthread was my old call sign. You may use it here."';
const input = 'I take your satchel if you hand it to me, Wren. Would you walk with me to the Halloran steading?';

export function handoverCase() {
    const bytes = execFileSync('git', ['show', original], { cwd: new URL('.', import.meta.url) });
    const originalChat = gunzipSync(bytes);
    const prefix = originalChat
        .toString('utf8')
        .trimEnd()
        .split('\n')
        .slice(1)
        .map((line) => JSON.parse(line));
    const trial = { choice: 'refuse', prefix, originalChat, input, source: original };
    trial.respond = function (role, messages) {
        const text = messages.at(-1).content;
        if (role === 'plan') {
            if (!text.includes('PLAYER MESSAGE:\n' + input)) return JSON.stringify({ commands: [] });
            return JSON.stringify({
                commands: [{ seq: 1, type: 'take', object: satchel, qty: 1, quote: 'I take your satchel' }],
                travel_frame: {
                    choice: 'walk with me to the Halloran steading',
                    to: 'Halloran steading',
                    with: wren,
                    after: 'satchel',
                },
            });
        }
        if (role === 'narrator')
            return trial.choice === 'accept'
                ? acceptance
                : trial.choice === 'refuse'
                  ? refusal
                  : 'Wren pauses to listen.';
        if (role !== 'extract') throw new Error('Unexpected C19 mock role ' + role);
        if (text.includes(acceptance))
            return JSON.stringify({
                scene: farm,
                expected: { 1: { taken: true } },
                deltas: [
                    { seq: 1, type: 'object.move', object: satchel, qty: 1, to: 'pc', scene: origin },
                    {
                        seq: 2,
                        type: 'arrive',
                        at: farm,
                        with: [wren],
                        evidence: 'Alaric reached the Halloran steading with Mother Wren',
                        after: 'Mother Wren passes her leather satchel into Alaric’s hands',
                    },
                    { seq: 3, type: 'time', minutes: 30 },
                    { seq: 4, type: 'fact', s: wren, p: 'former_call_sign', o: marker, scene: farm },
                    {
                        seq: 5,
                        type: 'learn',
                        who: 'pc',
                        s: wren,
                        p: 'former_call_sign',
                        o: marker,
                        how: 'told',
                        scene: farm,
                    },
                    {
                        seq: 6,
                        type: 'memory',
                        who: [wren, 'pc'],
                        imp: 7,
                        text: 'At the steading Mother Wren told Alaric her former call sign was Bellthread.',
                        scene: farm,
                    },
                ],
            });
        if (text.includes(refusal))
            return JSON.stringify({
                scene: 'here',
                expected: { 1: { taken: false } },
                deltas: [],
            });
        return JSON.stringify({ scene: 'here', expected: {}, deltas: [] });
    };
    return trial;
}

export async function checkHandover({
    trial,
    dr,
    page,
    instance,
    idle,
    snapshot,
    check,
    changeSwipe,
    evidence,
    records,
}) {
    async function openOriginal(name) {
        const file = path.join(instance.user, 'chats', 'Revision mock', name + '.jsonl');
        if (fs.existsSync(file)) throw new Error('C19 fixture chat already exists: ' + name);
        // Two fresh stored chats, seeded before selection. Native ST owns each file after it has been opened.
        instance.guard.write(file, trial.originalChat);
        await page.evaluate((id) => SillyTavern.getContext().openCharacterChat(id), name);
        dr.testChat = await dr.identity();
        if (dr.testChat.chatId !== name) throw new Error('C19 host opened another chat');
        await idle();
        return page.evaluate(async () => {
            const { foldChat } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
            return foldChat(SillyTavern.getContext().chat).state;
        });
    }
    const start = await openOriginal('C19 refusal path');
    check(
        'wrenSource',
        start.scene.at === origin && start.objects[satchel].holder.entity === wren && start.scene.present.includes(wren)
    );
    evidence.handover = {
        source: trial.source,
        input,
        origin,
        satchel,
        wren,
        initialMinute: start.clock.minute,
        coin_cp: start.entities.pc.sheet.coin_cp,
    };
    async function inspect(key, accepted) {
        const view = await snapshot(key);
        const state = JSON.parse(view.world);
        const bag = state.objects[satchel];
        const fact = Object.values(state.facts).find((f) => f.s === wren && f.o === marker);
        const memory = state.memories.filter((m) => m.text.includes(marker));
        const known = !!fact && !!state.knowledge.pc?.[fact.id];
        const personallyRemembered = memory.some((m) => m.who.includes(wren) && m.who.includes('pc'));
        check(key + 'Holder', bag.holder.entity === (accepted ? 'pc' : wren) && bag.qty === 1);
        check(
            key + 'Identity',
            Object.values(state.objects).filter((o) => o.id === satchel || o.name === bag.name || o.name === 'the bag')
                .length === 1
        );
        check(
            key + 'Party',
            view.where === (accepted ? farm : origin) &&
                view.people.includes(wren) &&
                view.rows.Present?.includes('Wren')
        );
        check(key + 'VisibleOwnership', view.rows.Carried?.includes(bag.name) === accepted);
        check(key + 'Money', state.entities.pc.sheet.coin_cp === start.entities.pc.sheet.coin_cp);
        check(key + 'PersonalKnowledge', known === accepted && personallyRemembered === accepted);
        evidence.stages[key].handover = {
            holder: bag.holder,
            bagId: bag.id,
            quantity: bag.qty,
            coin_cp: state.entities.pc.sheet.coin_cp,
            minute: state.clock.minute,
            learned: fact ? state.knowledge.pc?.[fact.id] : null,
            memories: memory.map((m) => ({ id: m.id, who: m.who, location: m.location, text: m.text })),
        };
        return view;
    }
    async function nextTurn(branch) {
        trial.choice = 'follow';
        await page.waitForFunction(() =>
            ['Bereit', 'Gespeichert'].includes(document.querySelector('#avereth-action-status')?.textContent)
        );
        const selected = await dr.chat();
        evidence.handover[branch + 'BeforeFollow'] = {
            phase: await page.locator('#avereth-action-status').textContent(),
            probe: await dr.probe(),
            activeText: selected.at(-1).mes,
            swipe: selected.at(-1).swipe_id,
            extraction: selected.at(-1).extra?.avereth?.extraction?.status,
            readback: await dr.verifySaved(selected, { complete: true }),
        };
        check(
            'wren' + branch + 'FollowStartsFromConfirmedChoice',
            evidence.handover[branch + 'BeforeFollow'].readback &&
                selected.at(-1).mes === (branch === 'accept' ? acceptance : refusal)
        );
        const mark = records.length;
        const turn = await dr.send('Mother Wren, is there anything else I should know?');
        if (!turn.ok) {
            evidence.handover[branch + 'FailedInput'] = {
                turn,
                probe: await dr.probe(),
                status: await page.locator('#avereth-action-status').textContent(),
                toasts: (await dr.toasts()).slice(-4).map((t) => t.text),
            };
            throw new Error('C19 follow-up ' + branch + ' did not finish: ' + turn.problem);
        }
        for (const role of ['plan', 'narrator', 'extract']) {
            const call = records.slice(mark).find((r) => r.role === role);
            const sees = JSON.stringify(call?.messages || []).includes(marker);
            evidence.handover[branch + 'Follow'] ??= {};
            evidence.handover[branch + 'Follow'][role] = { seen: !!call, marker: sees };
            if (role === 'extract') {
                // X reads this reply against the current catalog. It need not repeat personal lore from an earlier reply.
                const body = call?.messages.at(-1)?.content || '';
                const here = body.split('\n').find((line) => line.startsWith('HERE:')) || '';
                const owner = branch === 'accept' ? 'Alaric' : 'Mother Wren';
                const bagEntry = body.split(satchel + ' (')[1]?.split(')')[0] || '';
                evidence.handover[branch + 'Follow'][role].here = here;
                evidence.handover[branch + 'Follow'][role].bagEntry = bagEntry;
                check(
                    'wren' + branch + 'ExtractorAuthority',
                    here.includes(branch === 'accept' ? farm : origin) && bagEntry.includes('held by ' + owner)
                );
                if (branch === 'refuse') check('wrenRefusedMemoryAbsentFromExtractor', !sees);
            } else {
                check('wren' + branch + role + 'Memory', !!call && sees === (branch === 'accept'));
            }
        }
    }
    if (!(await dr.send(input)).ok) throw new Error('C19 refusal input did not finish');
    await idle();
    const denied = await inspect('wrenRefusal', false);
    await nextTurn('refuse');

    const secondStart = await openOriginal('C19 alternatives path');
    check('wrenIdenticalOriginals', JSON.stringify(start) === JSON.stringify(secondStart));
    trial.choice = 'refuse';
    if (!(await dr.send(input)).ok) throw new Error('C19 alternatives input did not finish');
    await idle();
    const sameDenial = await inspect('wrenSecondRefusal', false);
    check(
        'wrenIdenticalRefusals',
        JSON.stringify(denied.people) === JSON.stringify(sameDenial.people) &&
            denied.where === sameDenial.where &&
            denied.rows.Carried === sameDenial.rows.Carried
    );
    trial.choice = 'accept';
    await changeSwipe('right', acceptance);
    const accepted = await inspect('wrenAcceptance', true);
    check('wrenTimeFollowsStory', JSON.parse(accepted.world).clock.minute > JSON.parse(denied.world).clock.minute);
    const cut = records.length;
    await changeSwipe('left', refusal);
    const deniedAgain = await inspect('wrenBackToRefusal', false);
    check('wrenRestoredRefusal', sameDenial.world === deniedAgain.world);
    await changeSwipe('right', acceptance);
    check('wrenSwitchUsesStoredResponses', records.length === cut);
    await dr.reload();
    await idle();
    const acceptedAgain = await inspect('wrenAcceptanceReload', true);
    check('wrenRestoredAcceptance', accepted.world === acceptedAgain.world);

    await nextTurn('accept');
}
