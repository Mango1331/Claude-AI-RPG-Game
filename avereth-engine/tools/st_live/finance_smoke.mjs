// Optional real-ST financial prelude to run_c. Fixtures only; the natural runner is unchanged.
import assert from 'node:assert/strict';

export function financeTurns(plan) {
    const wait = text => plan({ type: 'activity', kind: 'wait', what: null, minutes: 1, until: null, quote: text });
    const meet = 'I wait one minute by the roadside.';
    const pay = 'I leave five copper on the counter for Nell.';
    const after = 'I wait another minute beside Nell.';
    return [
        { key: 'finance_meet', player: meet, plan: wait(meet), reply: 'A roadside porter named Nell walks up to Alaric and stops beside him.',
            answer: { expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'nell', name: 'Nell', role: 'porter', desc: ['roadside porter'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }] } },
        { key: 'finance_card', player: pay, plan: plan({ type: 'pay', to: null, amount_cp: 5, for: null, quote: pay, money: { quote: 'five copper', currency_quote: null }, recipient_quote: 'Nell' }),
            reply: 'Nell waits while Alaric considers the payment. No coins change hands.', answer: { expected: {}, deltas: [] } },
        { key: 'finance_after', player: after, plan: wait(after), reply: 'Nell acknowledges the five copper already received and waits beside Alaric.', answer: { expected: {}, deltas: [] } },
    ];
}

export async function financeSmoke({ page, send, idle, calls, turns, onReload }) {
    const snapshot = () => page.evaluate(async () => {
        const { foldChat, foldBlock } = await import('/scripts/extensions/third-party/avereth-engine/src/host.js');
        const chat = SillyTavern.getContext().chat, f = foldChat(chat), s = f.state;
        return { coin: s.entities.pc.sheet.coin_cp, turn: s.turn, blocked: !!foldBlock(f),
            nell: Object.values(s.entities).find(e => e.name === 'Nell')?.id,
            cards: s.decisions.filter(d => d.route === 'free'),
            native: chat.filter(m => m.is_user).flatMap(m => m.extra?.avereth?.events || []).filter(e => e.t === 'transaction.completed' && e.d.native).length,
            users: chat.flatMap((m, index) => m.is_user ? [{ text: m.mes, index }] : []) };
    });
    const edit = async (index, text) => {
        const row = page.locator(`#chat .mes[mesid="${index}"]`);
        await row.locator('.mes_edit').click({ force: true });
        await row.locator('textarea.edit_textarea').fill(text);
        await row.locator('.mes_edit_done').click({ force: true });
        await idle();
    };
    await send(turns[0].player);
    const before = await snapshot();
    assert.ok(before.nell);
    turns[1].plan.commands[0].to = before.nell;
    await send(turns[1].player);
    const opened = await snapshot(), id = opened.cards[0]?.id;
    assert.ok(id); assert.equal(opened.coin, before.coin);
    const modelCalls = calls.length;
    await send(`#pay ${id}`);
    await send(`#pay ${id}`);
    await send('#bag');
    const paid = await snapshot();
    assert.deepEqual([paid.coin, paid.turn, paid.native, calls.length], [before.coin - 5, opened.turn, 1, modelCalls]);
    const savedChat = await page.evaluate(() => SillyTavern.getContext().getCurrentChatId());
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => SillyTavern.getContext().characters.some(c => c.name === 'Avereth V4'), null, { timeout: 60000 });
    // Reload does not auto-open a character with every ST preference; reopen the same saved test chat.
    await page.evaluate(async (chatId) => {
        const c = SillyTavern.getContext();
        await c.selectCharacterById(String(c.characters.findIndex(x => x.name === 'Avereth V4')));
        await c.openCharacterChat(chatId);
    }, savedChat);
    await page.waitForFunction(() => SillyTavern.getContext().chat.some(m => m.mes.startsWith('#pay ')), null, { timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('avereth_status'), null, { timeout: 60000 });
    const reloaded = await snapshot();
    assert.deepEqual([reloaded.coin, reloaded.blocked], [before.coin - 5, false]);
    // The natural Driver never reloads a page; do not retain its pre-navigation request tracker in this fixture.
    onReload();
    const source = paid.users.find(u => u.text === turns[1].player);
    const confirmation = paid.users.find(u => u.text === `#pay ${id}`);
    for (const [index, text, original] of [[source.index, 'I give Nell nothing.', source.text], [confirmation.index, '#status', confirmation.text]]) {
        await edit(index, text);
        const blocked = await snapshot();
        assert.equal(blocked.blocked, true);
        assert.equal(blocked.coin, before.coin, 'invalid payment has no debit, even in the displayed prefix');
        await edit(index, original);
        assert.equal((await snapshot()).blocked, false);
    }
    await page.evaluate(() => { if (SillyTavern.getContext().onlineStatus === 'no_connection') $('#api_button_openai').trigger('click'); });
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 30000 });
    await send(turns[2].player);
    const planners = calls.filter(c => c.purpose === 'plan').length;
    await page.evaluate(() => document.querySelector('#chat .last_mes .swipe_right')?.click());
    await page.waitForTimeout(400);
    await idle();
    await page.evaluate(() => { void SillyTavern.getContext().generate('regenerate'); });
    await page.waitForTimeout(400);
    await idle();
    const resumed = await snapshot();
    assert.deepEqual([resumed.coin, resumed.native, resumed.blocked], [before.coin - 5, 1, false]);
    assert.equal(calls.filter(c => c.purpose === 'plan').length, planners);
    const prose = calls.filter(c => c.purpose === 'narrator' && c.lastUser.includes(turns[2].player));
    assert.equal(prose.length, 3);
    assert.ok(prose.every(c => c.messages.some(m => String(m.content).includes('PAID BEFORE THIS INPUT'))));
    await page.evaluate(async () => { await SillyTavern.getContext().saveChat(); });
    return { nativeOnceNoModel: true, reload: true, realSourceEdit: true, realConfirmationEdit: true, restoreResumes: true, swipeOnce: true, regenerateOnce: true, narratorFact: true };
}
