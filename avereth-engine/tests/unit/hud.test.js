// Runtime V3 player HUD (src/hud.js): the Character and World panels are rendered from the canonical state only.
// They replace the Megumin <Character_Sheet> / <World_State> blocks, never read the narrator's text, never enter a
// prompt, and a narrator contradiction never changes what they show (drift).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, FIRST_MESSAGE } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { awardXp } from '../../src/progression.js';
import { scaleCreature } from '../../src/npcgen.js';
import { characterRows, worldRows, renderHud } from '../../src/hud.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';

const content = await loadContent();
const rowsOf = (rows) => Object.fromEntries(rows);
const char = (g) => rowsOf(characterRows(g.state, content));
const world = (g) => rowsOf(worldRows(g.state, content));

test('Character HUD: every value comes from the state and changes the moment the state does', () => {
    const g = new Game(content).ranger();
    let c = char(g);
    assert.equal(c.Level, '1 Ranger · Power Rank F · Guild Rank — (not registered)');
    assert.equal(c.Resources, 'HP 80/80 (unhurt) · MP 60/60 · STA 100/100 · XP 0/100');
    assert.equal(c.Stats, 'STR 5 · VIT 5 · AGI 6 · INT 5 · PER 6 · WIL 5');
    assert.equal(c.Combat, 'ATK 6 · MATK 0 · DEF 3 · MDEF 4 · Initiative 9');
    assert.equal(c.Skills, 'Basic Attack P1 · Aimed Shot P1 · Power Shot P1');
    assert.equal(c.Equipped, "Simple Traveler's Clothes · Starter Shortbow · Starter Light Armor · Starter Quiver");
    assert.equal(c.Carried, 'Small Pouch · Standard Arrow ×20');
    assert.equal(c.Coin, '5 Silver');
    assert.equal(c.Quests, '—');
    // coin, items, a quest and the Guild's registration, from one reply's report
    g.input('"Two silver for the registration, and I\'ll take the vermin bill." *I pay and buy three arrows for 6 copper.*');
    g.reply({
        new: [{ ref: 'clerk', name: 'Serah', kind: 'npc', desc: ['guild clerk'] }],
        coin: [{ cp: -20, why: 'registration' }, { cp: -6, why: 'three arrows' }],
        items: [{ item: 'Standard Arrow', qty: 3, from: 'Serah', to: 'pc', why: 'bought' }],
        facts: [{ s: 'pc', p: 'guild_rank', o: 'novice' }],
        quests: [{ title: 'Vermin in the Malthouse Cellar', status: 'active', giver: 'Serah', level: 1, type: 'minor', rank: 'Novice' }],
    });
    c = char(g);
    assert.equal(c.Coin, '2 Silver 4 Copper');
    assert.equal(c.Carried, 'Small Pouch · Standard Arrow ×23');
    assert.equal(c.Level, '1 Ranger · Power Rank F · Guild Rank Novice');
    assert.equal(c.Quests, 'Vermin in the Malthouse Cellar (active · Novice · Serah)');
    // HP, STA and an active effect during a fight: Focus Aim lasts until Alaric's next attack
    const w = new Game(content).ranger('Focus Aim + Power Shot');
    w.reply({ new: [{ ref: 'bear', kind: 'creature', species: 'bear', band: 'LONG' }] });
    w.input('I Power Shot the bear');
    w.reply({});
    w.input('I use Focus Aim');
    const cw = char(w);
    assert.ok(w.state.encounter, 'the bear fight is still running');
    assert.equal(cw.Resources, `HP ${w.state.entities.pc.sheet.hp}/80 (${w.state.entities.pc.sheet.hp === 80 ? 'unhurt' : 'lightly wounded'}) · MP 60/60 · STA ${w.state.entities.pc.sheet.sta}/100 · XP 0/100`);
    assert.equal(w.state.entities.pc.sheet.sta, 100 - 12 - 5, 'Power Shot 12 + Focus Aim 5');
    assert.equal(cw.Effects, 'Focus Aim');
    // Level, XP and free Stat Points after a Level-up
    for (const e of awardXp(g.state.entities.pc.sheet, 120, content, 'test')) applyEvent(g.state, e);
    c = char(g);
    assert.equal(c.Level, '2 Ranger · Power Rank F · Guild Rank Novice');
    assert.equal(c.Resources, 'HP 80/85 (lightly wounded) · MP 60/60 · STA 100/100 · XP 20/200'); // Level-up does not refill (Core #3)
    assert.equal(c.Stats, 'STR 5 · VIT 5 · AGI 7 · INT 5 · PER 7 · WIL 5 · Free Stat Points 5');
});

test('Guild Rank is institutional: a report may set a Guild Rank, never one above what the Power Rank allows', () => {
    const g = new Game(content).ranger();
    const r = g.reply({ facts: [{ s: 'pc', p: 'guild rank', o: 'Proven' }, { s: 'pc', p: 'guild_rank', o: 'Captain' }] });
    assert.deepEqual(r.rejected.map((x) => x.reason), ['Guild Rank Proven needs Power Rank E (a promotion minimum)', 'guild_rank must be one of Novice|Proven|Veteran|Elite|Master|Grandmaster|Legend']);
    assert.match(char(g).Level, /Guild Rank — \(not registered\)/);
    // one Guild Rank inside a longer value is that rank (Test 5 run); two different ones stay a question
    const r2 = g.reply({ facts: [{ s: 'pc', p: 'guild_rank', o: 'Novice or Proven' }] });
    assert.deepEqual(r2.rejected.map((x) => x.reason), ['guild_rank must be one of Novice|Proven|Veteran|Elite|Master|Grandmaster|Legend']);
    g.reply({ facts: [{ s: 'pc', p: 'guild_rank', o: 'Novice, registered (F claimed)' }] });
    assert.match(char(g).Level, /Guild Rank Novice$/);
});

test('World HUD: time, place, spot, people coming and going, quests, deadlines, weather, world events and the fight', () => {
    const g = new Game(content).ranger();
    let w = world(g);
    assert.equal(w.Time, 'Day 1, 09:00 (morning)');
    assert.equal(w.Location, 'Tidecross, Solmere — public roadside verge outside Tidecross');
    assert.equal(w.Present, 'nobody besides Alaric');
    g.turn('I walk into town and to the Guild hall.', {
        time: 40, place: 'Guild hall, front desk', new: [{ ref: 'clerk', name: 'Serah', kind: 'npc', desc: ['guild clerk'] }],
        facts: [{ s: 'Serah', p: 'occupation', o: 'Guild clerk' }, { s: 'Tidecross', p: 'weather', o: 'steady rain' }],
        quests: [{ title: 'Rats in the Salt Cellar', status: 'offered', giver: 'Serah', level: 1, type: 'minor', rank: 'Novice' }],
    });
    assert.equal(world(g)['Active quests'], undefined, 'an offered quest is not active yet');
    g.turn('I take the Rats in the Salt Cellar job.', {
        quests: [{ title: 'Rats in the Salt Cellar', status: 'active' }],
        threads: [{ text: 'report back to Serah before dusk', kind: 'deadline', status: 'open' }],
    });
    w = world(g);
    assert.equal(w.Time, 'Day 1, 09:40 (morning)');
    assert.equal(w.Location, 'Tidecross, Solmere — Guild hall, front desk');
    assert.equal(w.Weather, 'steady rain');
    assert.equal(w.Present, 'Serah (Guild clerk)');
    assert.equal(w['Active quests'], 'Rats in the Salt Cellar');
    assert.equal(w.Deadlines, 'report back to Serah before dusk');
    g.turn('I leave the hall.', { place: 'harbour road', leave: ['Serah'] });
    assert.equal(world(g).Present, 'nobody besides Alaric');
    g.turn('I travel on to Ashbridge.', { time: 300, location: 'Ashbridge', place: 'burned bridge gate', facts: [{ s: 'Ashbridge', p: 'status', o: 'destroyed', because: 'a night raid' }] });
    w = world(g);
    assert.equal(w.Location, 'Ashbridge, Duskreach — burned bridge gate (DESTROYED)');
    assert.equal(w['Known here'], 'Ashbridge status destroyed');
    // a fight begins and ends
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'SHORT' }] });
    g.input('I Power Shot the wolf');
    const during = world(g);
    if (g.state.encounter) assert.match(during.Combat, /Turn order/);
    else assert.equal(during.Combat, undefined, 'one shot ended it');
    g.reply({});
    while (g.state.encounter) { g.input('I Power Shot the wolf'); g.reply({}); }
    w = world(g);
    assert.equal(w.Combat, undefined);
    assert.match(w.Present, /the wolf \(dead/);
});

test('the HUD shows only what the player may know: no attitudes, agendas, secrets or hidden numbers of NPCs', () => {
    const g = new Game(content).ranger();
    g.turn('I greet the smith.', {
        new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['smith'] }],
        facts: [{ s: 'Brom', p: 'member_of', o: 'the Black Hand', vis: 'secret' }, { s: 'Brom', p: 'agenda', o: 'smuggle blades past the gate' }],
        attitude: [{ who: 'Brom', delta: -30, why: 'a Guild snoop' }],
    });
    const html = renderHud(g.state, content, 'open');
    assert.match(html, /Brom/);
    assert.doesNotMatch(html, /Black Hand|smuggle|snoop|-30|wary|hostile/);
});

test('drift: a narrator that writes wrong coin, HP, STA, quest status or position changes neither the state nor the HUD', () => {
    const chat = [{ is_user: false, is_system: false, mes: FIRST_MESSAGE, swipe_id: 0, swipes: [FIRST_MESSAGE], swipe_info: [{ extra: {} }], extra: {} }];
    processReply(chat, 0, content, { seed: 5 });
    const play = (input, reply) => {
        chat.push({ is_user: true, is_system: false, mes: input, extra: {} });
        prepareGeneration(chat, content, { type: 'normal' });
        chat.push({ is_user: false, is_system: false, mes: reply, swipe_id: 0, swipes: [reply], swipe_info: [{ extra: {} }], extra: {} });
        return processReply(chat, chat.length - 1, content);
    };
    play('Ranger', 'CLASS SELECTED <avereth>{}</avereth>');
    play('Aimed Shot + Power Shot', 'DONE <avereth>{}</avereth>');
    play('I pay the 2 silver gate toll.', 'The guard takes it.\n<avereth>{"coin":[{"cp":-20,"why":"gate toll"}],"quests":[{"title":"Rats","status":"offered","level":1,"type":"minor"}]}</avereth>');
    const before = foldChat(chat).state;
    assert.equal(before.entities.pc.sheet.coin_cp, 30);
    // the narrator restates the state wrongly, in prose and in an old-style tracker block
    const r = play('I count my coins.', [
        'You count 38 copper. Your wounds sting: HP: 50/80, STA 10/100. The Rats quest is completed; you stand in the Guild hall.',
        '<avereth>{}</avereth>',
        '<World_State>**Loc:** Guild hall | Lumenford</World_State><Character_Sheet>HP: 50/80 | STA: 10/100 | Coin: 3 Silver 8 Copper | Quests: Rats (completed)</Character_Sheet>',
    ].join('\n'));
    const after = foldChat(chat).state;
    assert.equal(after.entities.pc.sheet.coin_cp, 30, 'canonical coin stays 30 cp');
    assert.equal(after.entities.pc.sheet.hp, 80);
    assert.equal(after.entities.pc.sheet.sta, 100);
    assert.equal(after.quests['quest.rats'].status, 'offered');
    assert.equal(after.scene.place, before.scene.place);
    const hud = chat.at(-1).extra.avereth.hud;
    assert.match(hud, /<b>Coin<\/b>: 3 Silver</);
    assert.match(hud, /HP 80\/80 \(unhurt\) · MP 60\/60 · STA 100\/100/);
    assert.match(hud, /Rats \(offered\)/);
    assert.doesNotMatch(hud, /Guild hall|Lumenford|38|50\/80/);
    // and the next engine block names the contradictions for the narrator
    assert.ok(r.result.corrections.some((c) => /HP shown as 50, engine value is 80/.test(c)), r.result.corrections.join(' | '));
    assert.ok(r.result.corrections.some((c) => /STA shown as 10, engine value is 100/.test(c)));
    // the retired tracker blocks are removed from the reply (never shown, never quoted in later prompts) and named
    assert.doesNotMatch(chat.at(-1).mes, /World_State|Character_Sheet/);
    assert.ok(r.result.corrections.some((c) => /tracker blocks .* are retired and were removed/.test(c)));
});
