import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, lastUser, say, walk } from './patch8_lib.js';
import { loadProductContent } from '../helpers.js';
import { setRec } from '../../src/host.js';

test('native rest books the existing pause once with zero model calls when PULSE is closed', async () => {
    const content = await loadProductContent();
    content.rules.pulse.force = {open:false};
    const game = await campaign(content);
    game.llm = async () => { throw Error('unexpected model call'); };
    const before = game.state().clock.minute;
    const result = await say(game,'#rest 2h');
    assert.equal(result.action,'panels');
    assert.equal(game.state().clock.minute - before,120);
    assert.equal(lastUser(game).events.filter(e => e.t === 'pulse.rolled').length,1);
    assert.match(result.hud, /Free Stat Points 0/);
});

test('native rest routes an open, interrupting PULSE to narration with partial time booked', async () => {
    const content = await loadProductContent();
    content.rules.pulse.force = {open:true,kind:'obstacle',when:'#rest'};
    const game = await campaign(content);
    const clearing = {new:{name:'A lonely clearing',kind:'wilderness',parent:'realm.valedorn_crown'}};
    await walk(game,{new:'A lonely clearing'},{text:'I head to the lonely clearing.',at:clearing,prose:'Alaric reached a lonely clearing.'});
    game.llm = async () => { throw Error('unexpected planner call'); };
    const before = game.state().clock.minute;
    const result = await say(game,'#rest 90');
    assert.equal(result.action,'context');
    const events = lastUser(game).events;
    const pulse = events.find(e => e.t === 'pulse.rolled');
    assert.ok(pulse?.d.interrupt);
    assert.ok(events.indexOf(pulse) < events.findIndex(e => e.t === 'time.advanced'));
    assert.equal(game.state().clock.minute - before,pulse.d.interrupt.after_min);
    assert.match(result.context.text,/REST INTERRUPTED/);
});

test('native equip uses the existing exchange of held and equipped gear', async () => {
    const content = await loadProductContent();
    const game = await campaign(content);
    const row = game.chat.findLast(m => m.extra?.avereth?.events?.length);
    const rec = row.extra.avereth;
    const previous = game.state().entities.pc.sheet.equipment.weapon;
    const replacement = 'starter_shortbow';
    setRec(row,{...rec,events:[...rec.events,{t:'item.changed',d:{id:'pc',item:replacement,qty:1}}]});
    game.llm = async () => { throw Error('unexpected model call'); };
    const result = await say(game,`#equip item.${replacement}`);
    assert.equal(result.action,'panels');
    assert.equal(game.state().entities.pc.sheet.equipment.weapon,replacement);
    assert.equal(game.state().entities.pc.sheet.inventory[previous],1);
    assert.equal(game.state().entities.pc.sheet.inventory[replacement] || 0,0);
    assert.ok(!lastUser(game).events.some(e => ['coin.changed','pulse.rolled'].includes(e.t)));
});
