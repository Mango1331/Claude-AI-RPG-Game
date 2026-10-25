// Patch 7 (dungeon foundations, room connectivity, persistent exploration): a ruin explored room by room is one place
// of the place tree, marked as a dungeon, its rooms the places below it; the ways between them are kept (links), with
// whether he knows them, which way they go and the obstacle standing in them (a Patch 6 feature). The engine moves him
// only along ways he knows and can take, in the planner's GO and in every arrival the world applier books; a part he
// has not seen he reaches by going on, and the way he took is kept. Played through the product's host path (planner on,
// the extension's own content, Ashbridge), the LLM calls scripted.
// Confirmed before the patch and fixed: a locked door was walked through by GO {new: "the armory"}; every new room lay
// inside the room he named it from (hall › corridor › armory); the rooms of a ruin he had never found were listed as
// places beside the ones he knew, and those of another ruin out in the wilds as well; a hazard reported before the
// feature it is part of (on) stayed unattached (the open point of the Patch 6 review).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { renderHud, worldRows } from '../../src/hud.js';
import { runCommands } from '../../src/commands.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { dungeonOf, roomsOf, linkBetween, linksAt, exitsFrom } from '../../src/v4/dungeon.js';
import { contractReady, boardRequest, parseBoard } from '../../src/v4/guild.js';
import { materialise } from '../../src/engine.js';
import { applyEvent } from '../../src/state.js';
import { Dice } from '../../src/rng.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';
const REALM = 'realm.duskreach';

async function campaign(cls = 'Mage', skills = 'Flame Lance + Arcane Burst') {
    const g = new Chat4(content, { greeting: GREETING });
    await g.player(cls);
    await g.player(skills);
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    const own = (q) => (q && text.includes(q) ? q : text.replace(/\*/g, '').trim());
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c, quote: own(c.quote) })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const lastRec = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcome = (g) => lastRec(g)?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const actions = (g) => (outcome(g)?.actions || []).join('\n');
const allEvents = (g) => g.chat.flatMap((m) => m.extra?.avereth?.events || []);
const rejectedRules = (r) => r.record.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const hp = (s) => s.entities.pc.sheet.hp;
const byName = (s, name) => Object.values(s.places).filter((p) => p.name === name);
const idOf = (s, name) => { const ps = byName(s, name); assert.equal(ps.length, 1, `one place "${name}" (${ps.map((p) => p.id)})`); return ps[0].id; };
const featNamed = (s, re) => Object.values(s.features || {}).find((f) => re.test(f.name));

/** For one test: every check of this difficulty is (nearly) sure to succeed or to fail. */
async function scores(set, fn) {
    const was = { ...content.rules.checks.difficulty_scores };
    Object.assign(content.rules.checks.difficulty_scores, set);
    try { return await fn(); } finally { Object.assign(content.rules.checks.difficulty_scores, was); }
}
const SURE = 0.0001;
const NEVER = 1e9;

const room = (name) => ({ new: { name, kind: 'interior', parent: null } });
/** A way as the extractor reports it. */
const way = (to, more = {}, seq = 1) => ({ seq, type: 'passage', from: null, to, name: null, hidden: null, one_way: null, dir: null, feature: null, ...more });
const feature = (name, kind, more = {}, seq = 1) => ({ seq, type: 'feature', feature: name, name, kind, hidden: null, status: null, trigger: null, on: null, stat: null, difficulty: null, harm: null, ...more });
const thing = (name, more = {}, seq = 1) => ({ seq, type: 'object.new', name, kind: 'item', qty: 1, unit: null, holder: 'here', for_quest: null, in: null, ...more });
const attempt = (feature, aim, more = {}) => ({ type: 'attempt', feature, aim, approach: more.approach ?? null, stat: more.stat ?? null, tool: more.tool ?? null, possible: more.possible ?? null, quote: more.quote || 'x' });
const GO = (to, quote) => ({ type: 'go', to, quote });

/** He goes; the story has him arrive (at: where, else where he set off to) with these deltas. */
async function walk(g, to, { text = '*I go on*', at, deltas = [], arrived = true, prose = 'He goes.' } = {}) {
    await say(g, text, GO(to, text.replace(/\*/g, '')));
    return g.reply(prose, { expected: { 1: { arrived, at: at === undefined ? (typeof to === 'string' ? to : null) : at, with: null } }, deltas });
}

/** Alaric at the old watchtower: its broken doors lead into an entrance hall. */
async function watchtower(g = null) {
    g = g || await campaign();
    await walk(g, { new: 'the old watchtower' }, {
        text: '*I walk up to the old watchtower*',
        at: { new: { name: 'Old watchtower', kind: 'site', parent: REALM } },
        prose: 'The old watchtower: broken doors, an entrance hall beyond.',
        deltas: [way(room('Entrance hall'), { name: 'broken doors' })],
    });
    return g;
}

// ------------------------------------------------------------------------------------------------ the abandoned watchtower
test('patch 7 (23): the abandoned watchtower: in, a locked armory, its blade taken, down a crumbling stair, a hidden plate, three rats, a hidden side chamber, a crawlway back, out, and back again later; every room, way and change holds', async () => {
    await scores({ moderate: SURE, hard: SURE }, async () => {
        const g = await campaign();
        // a Guild contract for the watchtower's crypt (16): the rats there are its work
        const quest = { id: 'quest.crypt', title: 'Clear the crypt of the old watchtower', kind: 'guild_contract', client: 'the Ashbridge warden', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 50, reward: '50 cp',
            task: 'Clear the old watchtower of the giant rats in its crypt.', desired_end_state: 'The giant rats of the watchtower crypt are dealt with.',
            objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'giant rat', qty: 2, unit: null, where: 'the old watchtower', status: 'open' }],
            proof: [], source: { board: 'loc.ashbridge.guild_hall', branch: 'loc.ashbridge' }, schedule: { starts_at: null, deadline: null }, status: 'active', taker: 'pc', history: [{ status: 'active', turn: 0, minute: 0 }], details: [], notes: [] };
        g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events.push({ t: 'quest.created', d: { quest } });
        await watchtower(g);
        let s = g.state();
        const tower = s.scene.at;
        const coin = s.entities.pc.sheet.coin_cp;
        assert.equal(s.places[tower].rooms, true, 'the watchtower is explored room by room');
        assert.equal(s.places[tower].dungeon, undefined, 'and is no Dungeon for that (review 9)');
        const hall = idOf(s, 'Entrance hall');
        assert.equal(s.places[hall].parent, tower);
        assert.equal(s.places[hall].visited, undefined, 'seen through the doors, not entered');
        assert.equal(s.places[hall].level, 1);

        // 1. in
        await walk(g, hall, { text: '*I step through the broken doors*', prose: 'The entrance hall; an archway leads on.', deltas: [way(room('Main corridor'), { name: 'archway' })] });
        s = g.state();
        assert.equal(s.scene.at, hall);
        assert.ok(s.places[hall].visited, 'he stood in it');
        const corridor = idOf(s, 'Main corridor');
        assert.equal(s.places[corridor].parent, tower, 'a room of the watchtower, not of the hall');

        // 2. the main corridor: an iron door, locked, to the armory
        await walk(g, corridor, { text: '*I follow the archway into the corridor*', prose: 'A long corridor. To the left an iron door, locked; the armory lies behind it.', deltas: [
            feature('locked iron door', 'obstacle', { stat: 'STR', difficulty: 'hard' }, 1),
            way(room('Armory'), { name: 'iron door', feature: 'locked iron door' }, 2),
        ] });
        s = g.state();
        const armory = idOf(s, 'Armory');
        const door = featNamed(s, /iron door/);
        assert.equal(linkBetween(s, corridor, armory).feature, door.id, 'the way is barred by the door');

        // 3. he looks the door over: no change
        await say(g, '*I examine the iron door*', attempt(door.id, 'examine', { quote: 'I examine the iron door' }));
        await g.reply('Heavy iron, an old lock.', { expected: {}, deltas: [] });
        assert.equal(g.state().features[door.id].status, 'active');

        // 4. going does not open it, by id or by name; the story cannot walk him through either
        await say(g, '*I enter the armory*', GO(armory, 'I enter the armory'));
        assert.match(actions(g), /BLOCKED — the way to Armory is barred by locked iron door/);
        await g.reply('He stops at the iron door.', { expected: {}, deltas: [] });
        await say(g, '*I go into the armory*', GO({ new: 'the armory' }, 'I go into the armory'));
        assert.match(actions(g), /BLOCKED — the way to Armory is barred by locked iron door/);
        const told = await g.reply('He shoulders through into the armory.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: armory, forced_by: null, with: null }] });
        assert.equal(g.state().scene.at, corridor, 'still in the corridor');
        assert.ok(rejectedRules(told).length, 'the arrival was not booked');

        // 5. he forces the door: a failure leaves it locked, a success opens the way
        await scores({ hard: NEVER }, async () => {
            await say(g, '*I try to force the iron door*', attempt(door.id, 'disable', { stat: 'STR', approach: 'force it', quote: 'I try to force the iron door' }));
            await g.reply('The door holds.', { expected: {}, deltas: [] });
        });
        assert.equal(g.state().features[door.id].status, 'active');
        await say(g, '*I enter the armory*', GO(armory, 'I enter the armory'));
        assert.match(actions(g), /BLOCKED/);
        await g.reply('The door is still shut.', { expected: {}, deltas: [] });
        await say(g, '*I try to force the iron door again*', attempt(door.id, 'disable', { stat: 'STR', approach: 'shoulder it', quote: 'I try to force the iron door again' }));
        await g.reply('The lock gives.', { expected: {}, deltas: [] });
        assert.equal(g.state().features[door.id].status, 'disabled');

        // 6. 7. the armory: a blade on a rack, a dented helm
        await walk(g, armory, { text: '*I enter the armory*', prose: 'Racks, mostly empty: a silver-hilted blade, a dented helm.', deltas: [thing('silver-hilted blade', {}, 1), thing('dented helm', {}, 2)] });
        s = g.state();
        assert.equal(s.scene.at, armory);
        const blade = Object.values(s.objects).find((o) => o.name === 'silver-hilted blade');
        const helm = Object.values(s.objects).find((o) => o.name === 'dented helm');
        assert.equal(blade.holder.loc, armory);
        // 8. he takes the blade, not the helm
        await say(g, '*I take the blade*', { type: 'take', object: blade.id, qty: null, quote: 'I take the blade' });
        await g.reply('He takes the blade.', { expected: {}, deltas: [] });
        assert.equal(g.state().objects[blade.id].holder.entity, 'pc');

        // 9. back to the corridor ("back": the way he came)
        await walk(g, corridor, { text: '*I go back*', prose: 'The corridor again; at its end a stair goes down, its steps crumbling.', deltas: [
            feature('crumbling steps', 'hazard', { stat: 'AGI', difficulty: 'moderate', trigger: 'cross', harm: 'hp' }, 1),
            way(room('Lower stair'), { name: 'stair down', dir: 'down', feature: 'crumbling steps' }, 2),
        ] });
        s = g.state();
        assert.equal(s.scene.at, corridor);
        const stair = idOf(s, 'Lower stair');
        const steps = featNamed(s, /crumbling/);
        assert.equal(s.places[stair].level, 2, 'the stair leads down a level');

        // 10. 11. the crumbling steps: in the way until he gets past them
        await say(g, '*I go down the stair*', GO(stair, 'I go down the stair'));
        assert.match(actions(g), /BLOCKED — the way to Lower stair is barred by crumbling steps/);
        await g.reply('He eyes the steps.', { expected: {}, deltas: [] });
        await say(g, '*I pick my way down the crumbling steps*', attempt(steps.id, 'pass', { stat: 'AGI', approach: 'pick my way down', quote: 'I pick my way down the crumbling steps' }));
        await g.reply('He picks his way down.', { expected: {}, deltas: [] });
        assert.equal(g.state().features[steps.id].status, 'passed');
        await walk(g, stair, { text: '*I go down the stair*', prose: 'The bottom of the stair; a low arch opens on a crypt.', deltas: [way(room('Crypt'), { name: 'low arch' })] });
        s = g.state();
        const crypt = idOf(s, 'Crypt');
        assert.equal(s.scene.at, stair);
        assert.equal(s.places[crypt].level, 2);

        // 12. the crypt: a pressure plate he does not know of springs as he enters, once
        const before = hp(s);
        await scores({ moderate: NEVER }, async () => {
            await walk(g, crypt, { text: '*I step into the crypt*', prose: 'Stone coffins. Three rats rear up from among them.', deltas: [
                feature('pressure plate under the dust', 'hazard', { hidden: true, trigger: 'enter', stat: 'AGI', harm: 'hp' }, 1),
                way(room('Hidden side chamber'), { name: 'loose wall slab', hidden: true }, 2),
            ] });
        });
        // the plate was established in the same reply that brought him in: the story's, not his roll; it waits for his next entry
        s = g.state();
        assert.equal(s.scene.at, crypt);
        const plate = featNamed(s, /pressure plate/);
        assert.equal(s.features[plate.id].hidden, true);
        const side = idOf(s, 'Hidden side chamber');
        assert.ok(!buildCatalog(s, content, { c: true }).places.some((p) => p.id === side), 'the hidden chamber is no place he knows');
        assert.ok(extractorCatalog(s, content, { c: true }).places.includes(side), 'the extractor knows it');
        assert.doesNotMatch(renderHud(s, content), /side chamber|wall slab/i, 'the HUD does not tell it');

        // reaching the crypt is not the work: the story's word "cleared" is no count
        await say(g, '*I look around*');
        await g.reply('The crypt is quiet. Job done, he thinks: cleared.', { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.crypt', note: 'the crypt is cleared', alternative: null }] });
        assert.equal(contractReady(g.state(), content, g.state().quests['quest.crypt'], { c: true }).ok, false, 'entering is no clearing');

        // 13. 14. three rats; two die, one flees
        await say(g, '*I stand ready*');
        await g.reply('Three rats rear up and rush him.', { expected: {}, deltas: [
            { seq: 1, type: 'creature.new', ref: 'crypt rats', species: 'giant rat', anchor: 'rat', desc: ['crypt rats'], count: 3, present: true, band: 'SHORT', stronger: null, threat: null, more: false },
            { seq: 2, type: 'hostile', by: ['crypt rats'], scope: 'all' },
        ] });
        s = g.state();
        const rats = Object.values(s.entities).filter((e) => e.kind === 'creature' && e.species === 'giant rat').map((e) => e.id);
        assert.equal(rats.length, 3, 'three rats, each its own');
        assert.ok(s.encounter);
        // no room change while the fight runs
        await say(g, '*I run back up the stair*', GO(stair, 'I run back up the stair'));
        assert.equal(outcome(g).kind, 'combat', 'the fight goes on: a GO is no way out of it');
        await g.reply('He has no way past them; he is in the crypt still.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: stair, forced_by: null, with: null }] });
        assert.equal(g.state().scene.at, crypt, 'no room change while the fight runs');
        let fled = false;
        for (let n = 0; n < 12 && g.state().encounter; n++) {
            const enc = g.state().encounter;
            const alive = rats.filter((id) => enc.combatants[id] && !enc.combatants[id].current.defeated && !enc.combatants[id].current.escaped);
            if (alive.length === 1 && !fled) {
                fled = true;
                await say(g, '*I hold my ground*', { type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'I hold my ground' });
                await g.reply('The last rat squeals and flees into a crack.', { expected: {}, deltas: [{ seq: 1, type: 'intent', who: alive[0], intent: 'flee' }] });
                continue;
            }
            await say(g, '*I flame lance it*', { type: 'use_skill', skill: 'mage.flame_lance', target: alive[0], quote: 'I flame lance it' });
            await g.reply('The fight goes on.', { expected: {}, deltas: [] });
        }
        s = g.state();
        const dead = rats.filter((id) => s.entities[id].status === 'dead');
        assert.ok(!s.encounter, 'the fight is over');
        assert.ok(dead.length >= 2, `two rats dead (${dead.length})`);
        const survivor = rats.find((id) => !dead.includes(id));
        if (survivor) assert.notEqual(s.entities[survivor].status, 'dead', 'the one that fled lives on');
        const xp = s.entities.pc.sheet.xp;
        // the fight was the work: by the engine's count, not the story's word; paid only at the Guild
        await say(g, '*I catch my breath*');
        await g.reply('The crypt is still; the rats are dealt with.', { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.crypt', note: 'the crypt rats are dealt with', alternative: null }] });
        s = g.state();
        assert.equal(contractReady(s, content, s.quests['quest.crypt'], { c: true }).ok, true, `two rats defeated: the outcome is reached (${contractReady(s, content, s.quests['quest.crypt'], { c: true }).reason})`);
        assert.equal(s.quests['quest.crypt'].status, 'active');
        assert.equal(s.entities.pc.sheet.coin_cp, coin, 'no reward in the dungeon');

        // 15. the hidden side chamber: his search finds the slab, the way stays known
        await say(g, '*I search the walls for a hidden way*', { type: 'activity', kind: 'search', what: 'the walls for a hidden passage', minutes: null, until: null, quote: 'I search the walls for a hidden way' });
        assert.match(actions(g), /SUCCESS — he finds loose wall slab \(link\.\d+\), leading to Hidden side chamber/);
        await g.reply('Behind a loose slab, a narrow way.', { expected: { 1: { minutes: 10, done: true } }, deltas: [] });
        s = g.state();
        assert.equal(linkBetween(s, crypt, side).hidden, false);
        assert.ok(buildCatalog(s, content, { c: true }).places.some((p) => p.id === side), 'now a place he knows');
        await walk(g, side, { text: '*I squeeze through behind the slab*', prose: 'A small chamber; a crawlway climbs back up toward the corridor.', deltas: [way(corridor, { name: 'crawlway up', dir: 'up' })] });
        s = g.state();
        assert.equal(s.scene.at, side);
        assert.equal(s.places[side].level, 2);
        assert.ok(linkBetween(s, side, corridor), 'an alternative route');

        // 16. out: by the crawlway, the corridor and the hall, all known and open
        await say(g, '*I leave the watchtower and step back onto the road*', GO(REALM, 'I leave the watchtower and step back onto the road'));
        assert.match((outcome(g).extra || []).join('\n'), /THE WAY — through Main corridor, Entrance hall, Old watchtower/);
        await g.reply('He climbs out and is on the road again.', { expected: { 1: { arrived: true, at: REALM, with: null } }, deltas: [] });
        s = g.state();
        assert.equal(s.scene.at, REALM);

        // 17. later: back in; every room and way as it was, the dead rats dead; the plate springs as he enters, once
        const placesThen = Object.keys(s.places).length;
        const linksThen = JSON.stringify(s.links);
        await walk(g, tower, { text: '*I walk back to the watchtower*', prose: 'The watchtower again.' });
        const back = hp(g.state());
        await scores({ moderate: NEVER }, async () => {
            await say(g, '*I go down to the crypt*', GO(crypt, 'I go down to the crypt'));
            assert.match((outcome(g).extra || []).join('\n'), /THE WAY — through Entrance hall, Main corridor, Lower stair/);
            assert.match((outcome(g).extra || []).join('\n'), /HIDDEN DANGER, IF HE GETS IN — pressure plate under the dust/);
            await g.reply('Down through the corridor and the stair, into the crypt; a click underfoot.', { expected: { 1: { arrived: true, at: crypt, with: null } }, deltas: [] });
        });
        s = g.state();
        assert.equal(s.scene.at, crypt, 'by the known way, through rooms he knows');
        assert.equal(hp(s), back - content.rules.exploration.harm.moderate, 'the plate, once');
        assert.deepEqual([s.features[plate.id].hidden, s.features[plate.id].status], [false, 'disabled']);
        assert.equal(Object.keys(s.places).length, placesThen, 'no room made again');
        assert.equal(JSON.stringify(s.links), linksThen, 'every way as it was');
        assert.equal(s.features[door.id].status, 'disabled', 'the door stays open');
        assert.equal(s.features[steps.id].status, 'passed', 'the steps stay behind him');
        assert.ok(dead.every((id) => s.entities[id].status === 'dead'), 'the dead stay dead');
        assert.ok(!dead.some((id) => s.scene.present.includes(id)), 'and are not back');
        assert.equal(s.objects[blade.id].holder.entity, 'pc', 'the blade is his');
        assert.equal(s.objects[helm.id].holder.loc, armory, 'the helm still lies in the armory');
        assert.equal(Object.values(s.objects).filter((o) => o.name === 'silver-hilted blade').length, 1, 'no second blade');
        assert.equal(s.entities.pc.sheet.xp, xp, 'no XP again');
        assert.equal(foldChat(g.chat).state.scene.at, crypt, 'the fold agrees');
        // a spent plate springs no more
        await walk(g, stair, { text: '*I go back up to the stair*', prose: 'The stair.' });
        await walk(g, crypt, { text: '*I go back into the crypt*', prose: 'The crypt again.' });
        s = g.state();
        assert.equal(hp(s), back - content.rules.exploration.harm.moderate);
        assert.doesNotMatch((outcome(g).extra || []).join('\n'), /HIDDEN DANGER/);
    });
});

// ------------------------------------------------------------------------------------------------ A. identity (1-7, 21)
/** The watchtower, its hall entered, a corridor beyond: [g, ids]. */
async function inHall(g = null) {
    g = await watchtower(g);
    const tower = g.state().scene.at;
    const hall = idOf(g.state(), 'Entrance hall');
    await walk(g, hall, { text: '*I step inside*', prose: 'The hall; an archway on.', deltas: [way(room('Main corridor'), { name: 'archway' })] });
    return { g, tower, hall, corridor: idOf(g.state(), 'Main corridor') };
}

test('patch 7 (1, 2, 4, 5, 6, 7): rooms of a dungeon keep their ids; named again they are the same room; a room inside a room stays inside it; seen is not visited, arriving is', async () => {
    const { g, tower, hall, corridor } = await inHall();
    let s = g.state();
    assert.equal(s.places[corridor].visited, undefined, 'seen through the archway: not visited');
    assert.ok(roomsOf(s, tower).length >= 2);
    // the hall named again, in other words of the extractor: the same hall, no copy
    await say(g, '*I look around*');
    await g.reply('The hall, as before.', { expected: {}, deltas: [way(room('Entrance hall'), { name: 'broken doors' }), way(room('Main corridor'), { name: 'archway' }, 2)] });
    s = g.state();
    assert.equal(byName(s, 'Entrance hall').length, 1);
    assert.equal(byName(s, 'Main corridor').length, 1);
    assert.equal(Object.keys(s.links).length, 2, 'no way twice');
    // a closet inside the corridor (its parent given): a room in a room
    await walk(g, corridor, { text: '*I go into the corridor*', prose: 'A closet door in the wall.', deltas: [way({ new: { name: 'Broom closet', kind: 'interior', parent: corridor } }, { name: 'closet door' })] });
    s = g.state();
    const closet = idOf(s, 'Broom closet');
    assert.equal(s.places[closet].parent, corridor);
    assert.equal(dungeonOf(s, closet), tower);
    assert.ok(s.places[corridor].visited, 'arriving is visiting');
    assert.equal(s.places[closet].visited, undefined);
});

test('patch 7 (3, 21): two ruins, a guard room in each: two rooms; the other ruin\'s rooms are never places here, and the story cannot put him in one; the same name on another level is another room, two of one name a question', async () => {
    const { g, tower, hall } = await inHall();
    await say(g, '*I look around*');
    await g.reply('A guard room opens off the hall.', { expected: {}, deltas: [way(room('Guard room'), { name: 'side door' })] });
    let s = g.state();
    const guardA = idOf(s, 'Guard room');
    // out, to another ruin
    await say(g, '*I leave and walk to the ruined keep*', GO(REALM, 'I leave and walk to the ruined keep'));
    await g.reply('Out, along the road, to a ruined keep.', { expected: { 1: { arrived: true, at: { new: { name: 'Ruined keep', kind: 'site', parent: REALM } }, with: null } }, deltas: [way(room('Gatehouse'), { name: 'gate arch' })] });
    s = g.state();
    const keep = s.scene.at;
    assert.notEqual(keep, tower);
    await walk(g, idOf(s, 'Gatehouse'), { text: '*I go into the gatehouse*', prose: 'The gatehouse; a guard room beside it.', deltas: [way(room('Guard room'), { name: 'low door' })] });
    s = g.state();
    const guards = byName(s, 'Guard room');
    assert.equal(guards.length, 2, 'two guard rooms');
    const guardB = guards.find((p) => p.id !== guardA).id;
    assert.equal(dungeonOf(s, guardB), keep);
    const cat = buildCatalog(s, content, { c: true });
    assert.ok(!cat.places.some((p) => p.id === guardA || p.id === hall), 'the watchtower\'s rooms are no places here');
    // the story names the other ruin's guard room: he is not taken there
    await say(g, '*I go into the guard room*', GO(guardB, 'I go into the guard room'));
    const r = await g.reply('He steps into the guard room.', { expected: { 1: { arrived: true, at: guardA, with: null } }, deltas: [] });
    assert.notEqual(g.state().scene.at, guardA, 'no jump into the other ruin');
    assert.ok(!extractorCatalog(s, content, { c: true }).places.includes(guardA), 'not even the extractor can name it from here');
    assert.ok(r.record.events.some((e) => e.t === 'extract.failed'), 'an answer that names it is no valid report');
    // levels: a cellar guard room one level down is another room than the one up here
    await walk(g, guardB, { text: '*I go into the guard room*', prose: 'A trapdoor leads down to a cellar guard room.', deltas: [way(room('Cellar'), { name: 'trapdoor', dir: 'down' })] });
    s = g.state();
    assert.equal(s.places[idOf(s, 'Cellar')].level, 2);
    assert.equal(s.places[guardB].level, 2 - 1);
});

test('patch 7 (21): in towns and on the road nothing changes: a room of an inn named again is the same, no dungeon is made of a town, Patch 5 travel needs no way', async () => {
    const g = await campaign();
    await say(g, '*I walk into Ashbridge*', GO('loc.ashbridge', 'I walk into Ashbridge'));
    await g.reply('Ashbridge.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [] });
    await say(g, '*I go to the Ferryman inn*', GO({ new: 'the Ferryman inn' }, 'I go to the Ferryman inn'));
    await g.reply('The Ferryman.', { expected: { 1: { arrived: true, at: { new: { name: 'The Ferryman', kind: 'site', parent: 'loc.ashbridge' } }, with: null } }, deltas: [] });
    const inn = g.state().scene.at;
    await say(g, '*I go up to the common room*', GO({ new: 'the common room' }, 'I go up to the common room'));
    await g.reply('The common room.', { expected: { 1: { arrived: true, at: { new: { name: 'Common room', kind: 'interior', parent: inn } }, with: null } }, deltas: [] });
    await say(g, '*I go to the back room*', GO({ new: 'the back room' }, 'I go to the back room'));
    await g.reply('The back room.', { expected: { 1: { arrived: true, at: { new: { name: 'Back room', kind: 'interior', parent: inn } }, with: null } }, deltas: [] });
    let s = g.state();
    assert.equal(s.places[inn].rooms, undefined, 'an inn in a town is no dungeon');
    assert.equal(Object.keys(s.links || {}).length, 0, 'and has no ways to keep');
    await say(g, '*I go back to the common room*', GO(idOf(s, 'Common room'), 'I go back to the common room'));
    await g.reply('The common room again.', { expected: { 1: { arrived: true, at: { new: { name: 'Common room', kind: 'interior', parent: inn } }, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(byName(s, 'Common room').length, 1);
    // to Blackgate: a journey as before
    await say(g, '*I set out for Blackgate*', GO('loc.blackgate', 'I set out for Blackgate'));
    assert.doesNotMatch(actions(g), /BLOCKED|NO KNOWN WAY/);
    await g.reply('Blackgate at last.', { expected: { 1: { arrived: true, at: 'loc.blackgate', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 600 }] });
    assert.equal(g.state().scene.at, 'loc.blackgate');
});

// ------------------------------------------------------------------------------------------------ B. ways (8-16)
test('patch 7 (8, 12, 13, 14): a way both ways goes both ways; a chute only down; a way he has not found is no way he can choose', async () => {
    const { g, hall, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'A chute in the floor drops into the dark; a narrow crack, unseen, runs behind a pillar.', deltas: [
        way(room('Pit'), { name: 'chute', one_way: true, dir: 'down' }, 1),
        way(room('Cistern'), { name: 'crack behind the pillar', hidden: true }, 2),
    ] });
    let s = g.state();
    const pit = idOf(s, 'Pit');
    const cistern = idOf(s, 'Cistern');
    // both ways: back to the hall
    await walk(g, hall, { text: '*I go back to the hall*', prose: 'The hall.' });
    assert.equal(g.state().scene.at, hall);
    await walk(g, corridor, { text: '*I go to the corridor again*', prose: 'The corridor.' });
    // the hidden crack: not offered, not reachable, not to be revealed by the story
    s = g.state();
    assert.ok(!buildCatalog(s, content, { c: true }).places.some((p) => p.id === cistern));
    assert.ok(!exitsFrom(s, corridor).some((e) => e.to === cistern));
    // he goes on looking for it: the story cannot take him there, nor find the crack for him
    await say(g, '*I go to the cistern*', GO({ new: 'the cistern' }, 'I go to the cistern'));
    let r = await g.reply('He squeezes into the cistern.', { expected: { 1: { arrived: true, at: cistern, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, corridor, 'not through a way he has not found');
    assert.ok(rejectedRules(r).includes('passage'));
    await say(g, '*I look around*');
    r = await g.reply('He stays.', { expected: {}, deltas: [way(cistern, { name: 'crack behind the pillar', hidden: false })] });
    assert.ok(rejectedRules(r).includes('engine_owned'), 'the story does not find it for him');
    assert.equal(linkBetween(g.state(), corridor, cistern).hidden, true);
    // the chute: down, never back up
    await walk(g, pit, { text: '*I drop down the chute*', prose: 'He lands in the pit.' });
    s = g.state();
    assert.equal(s.scene.at, pit);
    assert.equal(s.places[pit].level, 2);
    await say(g, '*I climb back up to the corridor*', GO(corridor, 'I climb back up to the corridor'));
    assert.match(actions(g), /NO KNOWN WAY — he knows no open way from Pit to Main corridor/);
    await g.reply('The walls are too smooth.', { expected: {}, deltas: [] });
    assert.equal(g.state().scene.at, pit);
});

test('patch 7 (16): a way that was open and is blocked later stays blocked, also as part of a longer way back; another way around still goes', async () => {
    const { g, tower, hall, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor.' });
    await say(g, '*I wait*', { type: 'activity', kind: 'wait', what: null, minutes: 5, until: null, quote: 'I wait' });
    await g.reply('With a roar the archway behind him caves in: rubble fills it.', { expected: { 1: { minutes: 5, done: true } }, deltas: [
        feature('rubble in the archway', 'obstacle', { stat: 'STR', difficulty: 'hard' }, 1),
        way(hall, { name: 'archway', feature: 'rubble in the archway' }, 2),
    ] });
    let s = g.state();
    assert.equal(linkBetween(s, hall, corridor).feature, featNamed(s, /rubble/).id);
    await say(g, '*I go back to the hall*', GO(hall, 'I go back to the hall'));
    assert.match(actions(g), /BLOCKED — the way to Entrance hall is barred by rubble in the archway/);
    await g.reply('Rubble.', { expected: {}, deltas: [] });
    await say(g, '*I leave the tower*', GO(REALM, 'I leave the tower'));
    assert.match(actions(g), /BLOCKED/, 'nor out through it');
    await g.reply('Rubble.', { expected: {}, deltas: [] });
    // another way: a window onto the yard
    await say(g, '*I look around*');
    await g.reply('A window at the corridor\'s end gives onto the yard outside.', { expected: {}, deltas: [way(tower, { name: 'window' })] });
    await say(g, '*I leave the tower*', GO(REALM, 'I leave the tower'));
    assert.doesNotMatch(actions(g), /BLOCKED/);
    await g.reply('Out of the window and away.', { expected: { 1: { arrived: true, at: REALM, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, REALM);
});

// ------------------------------------------------------------------------------------------------ C. navigation (17-20)
test('patch 7 (17, 18, 19, 20): "back" is the way he came; two doors of one name are a question; a known room past one he never entered is no way; the way back through a room where he left rats stops to ask', async () => {
    const { g, hall, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'Two doors, both of oak; and a passage on to a gallery.', deltas: [
        way(room('North cell'), { name: 'oak door' }, 1), way(room('South cell'), { name: 'oak door' }, 2), way(room('Gallery'), { name: 'passage' }, 3),
    ] });
    let s = g.state();
    let q = await say(g, '*I go through the oak door*', GO({ new: 'the oak door' }, 'I go through the oak door'));
    assert.match(q.panels.join('\n'), /CLARIFY\]\nwhich way does he take: to North cell or to South cell\?/, 'two doors: a question, no pick');
    assert.equal(g.state().scene.at, corridor);
    // the gallery leads on to a chapel he only saw; the chapel is no way to anywhere beyond it
    const gallery = idOf(s, 'Gallery');
    await walk(g, gallery, { text: '*I go to the gallery*', prose: 'A chapel beyond, and past it a vestry.', deltas: [way(room('Chapel'), { name: 'arch' })] });
    s = g.state();
    const chapel = idOf(s, 'Chapel');
    await say(g, '*I look around*');
    await g.reply('Beyond the chapel, a vestry.', { expected: {}, deltas: [{ ...way(room('Vestry'), { name: 'curtain' }), from: chapel }] });
    s = g.state();
    const vestry = idOf(s, 'Vestry');
    assert.ok(!buildCatalog(s, content, { c: true }).places.some((p) => p.id === vestry), 'behind a room he never entered: not his to choose');
    await say(g, '*I go through to the vestry*', GO({ new: 'the vestry' }, 'I go through to the vestry'));
    const r = await g.reply('He crosses the chapel into the vestry.', { expected: { 1: { arrived: true, at: room('Vestry'), with: null } }, deltas: [] });
    assert.equal(byName(g.state(), 'Vestry').length, 1, 'named again: the same vestry');
    assert.equal(g.state().scene.at, gallery, 'not through a chapel he never entered: one room at a time');
    assert.ok(rejectedRules(r).includes('passage'));
    // rats in the gallery: he left them there; the way back through it asks first
    await say(g, '*I wait*');
    await g.reply('Two rats skitter along the gallery wall, minding him not.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'gallery rats', species: 'rat', anchor: 'rat', desc: ['gallery rats'], count: 2, present: true, band: 'LONG', stronger: null, threat: null, more: false }] });
    await walk(g, chapel, { text: '*I go into the chapel*', prose: 'The chapel.' });
    q = await say(g, '*I go back to the hall*', GO(hall, 'I go back to the hall'));
    assert.match(q.panels.join('\n'), /the way he knows to Entrance hall leads back through Gallery, where he left/);
    // "back": the room he came from, one step
    await say(g, '*I go back*', GO(gallery, 'I go back'));
    assert.doesNotMatch(actions(g), /CLARIFY|BLOCKED|NO KNOWN WAY/);
    await g.reply('The gallery; the rats are gone into the walls.', { expected: { 1: { arrived: true, at: gallery, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, gallery);
});

// ------------------------------------------------------------------------------------------------ D. hazards and creatures (22-28)
test('patch 7 (22, 23): a hidden tripwire on a doorway springs as he goes through it, only once he is through; not while the door is shut, not when the story stops him short', async () => {
    await scores({ moderate: NEVER, easy: SURE }, async () => {
        const { g, corridor } = await inHall();
        await walk(g, corridor, { text: '*I go on*', prose: 'A door, latched, to a storeroom.', deltas: [
            feature('latched storeroom door', 'obstacle', { stat: 'INT', difficulty: 'easy' }, 1),
            feature('tripwire across the threshold', 'hazard', { hidden: true, trigger: 'cross', on: 'latched storeroom door', stat: 'AGI', harm: 'hp' }, 2),
            way(room('Storeroom'), { name: 'storeroom door', feature: 'latched storeroom door' }, 3),
        ] });
        let s = g.state();
        const store = idOf(s, 'Storeroom');
        const latch = featNamed(s, /latched/);
        const wire = featNamed(s, /tripwire/);
        assert.equal(wire.on, latch.id);
        const before = hp(s);
        await say(g, '*I lift the latch*', attempt(latch.id, 'disable', { stat: 'INT', approach: 'lift the latch', quote: 'I lift the latch' }));
        await g.reply('The latch lifts.', { expected: {}, deltas: [] });
        // the latch was handled (disable on the door: touch), the wire is crossed only by going through
        assert.equal(g.state().features[wire.id].hidden, true);
        await say(g, '*I go into the storeroom*', GO(store, 'I go into the storeroom'));
        assert.match((outcome(g).extra || []).join('\n'), /HIDDEN DANGER, IF HE GETS IN — tripwire across the threshold .* springs as he goes through/);
        await g.reply('He hesitates at the door and stays in the corridor.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
        s = g.state();
        assert.equal(hp(s), before);
        assert.equal(s.features[wire.id].status, 'active');
        await walk(g, store, { text: '*I go into the storeroom*', prose: 'He steps through; a wire snaps.' });
        s = g.state();
        assert.equal(hp(s), before - content.rules.exploration.harm.moderate);
        assert.deepEqual([s.features[wire.id].hidden, s.features[wire.id].status], [false, 'disabled']);
    });
});

test('patch 7 (25, 27): rats he left in one room are not in the next, and are there, the same ones, when the story shows them again where he left them', async () => {
    const { g, hall, corridor } = await inHall();
    await say(g, '*I watch*');
    await g.reply('Two rats nose about the hall.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'hall rats', species: 'rat', anchor: 'rat', desc: ['hall rats'], count: 2, present: true, band: 'LONG', stronger: null, threat: null, more: false }] });
    const rats = Object.values(g.state().entities).filter((e) => e.kind === 'creature').map((e) => e.id);
    assert.equal(rats.length, 2);
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor, empty.' });
    let s = g.state();
    assert.ok(!rats.some((id) => s.scene.present.includes(id)), 'not in the corridor');
    assert.ok(rats.every((id) => s.entities[id].left?.at === hall), 'left in the hall');
    await walk(g, hall, { text: '*I go back*', prose: 'The two rats are still in the hall.', deltas: [{ seq: 1, type: 'creature.new', ref: 'hall rats', species: 'rat', anchor: 'rat', desc: ['hall rats'], count: 2, present: true, band: 'LONG', stronger: null, threat: null, more: false }] });
    s = g.state();
    assert.equal(Object.values(s.entities).filter((e) => e.kind === 'creature').length, 2, 'the same two, no new ones');
    assert.ok(rats.every((id) => s.scene.present.includes(id)));
});

// ------------------------------------------------------------------------------------------------ E. things and companions (15, 29-31)
test('patch 7 (15, 29, 30): a ring in a locked chest is his only after the chest is open and he takes it; once taken it is not there again', async () => {
    await scores({ moderate: SURE }, async () => {
        const { g, corridor } = await inHall();
        await walk(g, corridor, { text: '*I go on*', prose: 'A locked chest; in it, through a gap, a ring and some old coins.', deltas: [
            thing('signet ring', { in: 'locked chest' }, 1),
            feature('locked chest', 'obstacle', { stat: 'INT', difficulty: 'moderate' }, 2),
        ] });
        let s = g.state();
        const ring = Object.values(s.objects).find((o) => o.name === 'signet ring');
        const chest = featNamed(s, /chest/);
        assert.equal(ring.in_name, 'locked chest', 'its chest by name (reported after it)');
        await say(g, '*I take the ring*', { type: 'take', object: ring.id, qty: null, quote: 'I take the ring' });
        assert.match(actions(g), /CANNOT TAKE — signet ring is in locked chest/);
        const r = await g.reply('He reaches through the gap and plucks the ring out.', { expected: {}, deltas: [{ seq: 1, type: 'object.move', object: ring.id, to: 'pc', qty: null }] });
        assert.equal(g.state().objects[ring.id].holder.loc, corridor, 'not his: the chest is shut');
        assert.ok(rejectedRules(r).length);
        await say(g, '*I pick the lock*', attempt(chest.id, 'disable', { stat: 'INT', approach: 'pick the lock', quote: 'I pick the lock' }));
        await g.reply('The lock clicks open.', { expected: {}, deltas: [] });
        await say(g, '*I look into the chest*');
        await g.reply('The ring, and a few coins.', { expected: {}, deltas: [] });
        assert.equal(g.state().objects[ring.id].holder.loc, corridor, 'looking is no taking');
        await say(g, '*I take the ring*', { type: 'take', object: ring.id, qty: null, quote: 'I take the ring' });
        await g.reply('He takes the ring.', { expected: {}, deltas: [] });
        s = g.state();
        assert.equal(s.objects[ring.id].holder.entity, 'pc');
        await say(g, '*I take the ring*', { type: 'take', object: ring.id, qty: null, quote: 'I take the ring' });
        assert.match(actions(g), /NOTHING TO DO — he holds signet ring already/);
    });
});

test('patch 7 (31): a companion goes from room to room with him when the story has them come along; one who stays is found where they stayed', async () => {
    const { g, hall, corridor } = await inHall();
    await say(g, '*I look around*');
    await g.reply('A wounded explorer sits against the hall wall.', { expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'wounded explorer', name: 'Tamsin', role: 'explorer', desc: ['wounded'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }] });
    const tamsin = Object.values(g.state().entities).find((e) => e.name === 'Tamsin').id;
    await say(g, '*I help Tamsin up and we go into the corridor*', GO(corridor, 'we go into the corridor'));
    await g.reply('Together they go into the corridor.', { expected: { 1: { arrived: true, at: corridor, with: [tamsin] } }, deltas: [] });
    let s = g.state();
    assert.ok(s.scene.present.includes(tamsin), 'she came along');
    await say(g, '*I go back to the hall alone; Tamsin waits*', GO(hall, 'I go back to the hall alone'));
    await g.reply('He goes back; she waits in the corridor.', { expected: { 1: { arrived: true, at: hall, with: null } }, deltas: [] });
    s = g.state();
    assert.ok(!s.scene.present.includes(tamsin), 'no teleport after him');
    assert.equal(s.entities[tamsin].at, corridor, 'she stayed where he left her');
});

// ------------------------------------------------------------------------------------------------ F. the Patch 6 addendum (34-36)
test('patch 7 (34, 35, 36): a hidden needle reported before the chest it is part of is part of that chest, in either order; no second chest; opening it springs the needle', async () => {
    await scores({ moderate: NEVER }, async () => {
        for (const order of ['needle first', 'chest first']) {
            const g = await watchtower();
            const needle = feature('poison needle', 'hazard', { hidden: true, trigger: 'touch', on: 'oak chest', stat: 'AGI', harm: 'hp' });
            const chest = feature('oak chest', 'obstacle', { stat: 'INT' });
            const deltas = order === 'needle first' ? [{ ...needle, seq: 1 }, { ...chest, seq: 2 }] : [{ ...chest, seq: 1 }, { ...needle, seq: 2 }];
            await say(g, '*I look around*');
            await g.reply('An oak chest by the door.', { expected: {}, deltas });
            let s = g.state();
            const c = Object.values(s.features).filter((f) => /oak chest/.test(f.name));
            const n = featNamed(s, /needle/);
            assert.equal(c.length, 1, `${order}: one chest`);
            assert.equal(n.on, c[0].id, `${order}: the needle is the chest's`);
            assert.equal(n.hidden, true);
            const before = hp(s);
            await say(g, '*I open the oak chest*', attempt(c[0].id, 'disable', { stat: 'INT', approach: 'open it', quote: 'I open the oak chest' }));
            assert.match(actions(g), /HIDDEN DANGER — poison needle/);
            await g.reply('A prick.', { expected: {}, deltas: [] });
            s = g.state();
            assert.ok(hp(s) < before, `${order}: it springs`);
        }
    });
});

// ------------------------------------------------------------------------------------------------ G. view, context, swipe (19, 20, 42, 44)
test('patch 7 (42): the HUD shows where he is and the ways he knows, never a hidden one; #map lists the known rooms by level; the narrator gets this room and its ways, hidden ones marked', async () => {
    const { g, tower, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'An iron door, locked; a stair down; a crack he does not see.', deltas: [
        feature('locked iron door', 'obstacle', { stat: 'STR', difficulty: 'hard' }, 1),
        way(room('Armory'), { name: 'iron door', feature: 'locked iron door' }, 2),
        way(room('Cellar'), { name: 'stair down', dir: 'down' }, 3),
        way(room('Bolt-hole'), { name: 'crack in the wall', hidden: true }, 4),
    ] });
    const s = g.state();
    const rows = Object.fromEntries(worldRows(s, content));
    assert.match(rows.Location, /Old watchtower › Main corridor/);
    assert.match(rows.Exits, /iron door → Armory, blocked by \(locked iron door\)/);
    assert.match(rows.Exits, /stair down → Cellar, down/);
    assert.doesNotMatch(renderHud(s, content), /crack|Bolt-hole/i);
    const map = runCommands(s, content, '#map').panels.join('\n');
    assert.match(map, /Old watchtower — you are in Main corridor/);
    assert.match(map, /Level 2:\n- Cellar \(seen, not entered\)/);
    assert.doesNotMatch(map, /Bolt-hole/);
    const ctx = buildContext(s, content, { input: 'I look around' }).text;
    assert.match(ctx, /ROOMS — he is in Old watchtower › Main corridor \(level 1\)/);
    assert.doesNotMatch(ctx, /DUNGEON —/, "a watchtower explored room by room is no Dungeon");
    assert.match(ctx, /HIDDEN WAYS \(he has not found them.*crack in the wall → Bolt-hole/);
    assert.equal(dungeonOf(s, corridor), tower);
});

test('patch 7 (44): a swipe of a reply that established ways and rooms makes them once; the fold agrees', async () => {
    const { g, corridor } = await inHall();
    await say(g, '*I go on*', GO(corridor, 'I go on'));
    const answer = { expected: { 1: { arrived: true, at: corridor, with: null } }, deltas: [way(room('Armory'), { name: 'iron door' }), way(room('Cellar'), { name: 'stair down', dir: 'down' }, 2)] };
    await g.reply('The corridor; an iron door, a stair down.', answer);
    const once = g.state();
    await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
    await g.reply('The corridor, an iron door and a stair down.', answer);
    const s = g.state();
    assert.equal(Object.keys(s.links).length, Object.keys(once.links).length);
    assert.equal(Object.keys(s.places).length, Object.keys(once.places).length);
    assert.deepEqual(foldChat(g.chat).state.links, s.links);
});

test('patch 7 (7, 10, 20): going on without getting anywhere leaves him in the room (no road inside a ruin); a room a map shows is known, not visited, and no way to it is made by it', async () => {
    const { g, tower, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor.' });
    await say(g, '*I go deeper into the ruin*', GO({ new: 'deeper into the ruin' }, 'I go deeper into the ruin'));
    await g.reply('He searches for a way deeper for two hours and finds only dead ends.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 120 }] });
    let s = g.state();
    assert.equal(s.scene.at, corridor, 'still in the corridor, not on the road');
    // a map found here shows a sealed vault in the tower
    await say(g, '*I read the old map*');
    await g.reply('The map shows a sealed vault below the tower.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: { new: { name: 'Sealed vault', kind: 'interior', parent: tower } }, by: null, how: 'map', where: 'below the tower', false: null }] });
    s = g.state();
    const vault = idOf(s, 'Sealed vault');
    assert.equal(dungeonOf(s, vault), tower);
    assert.equal(s.places[vault].known, 'reported');
    assert.equal(s.places[vault].visited, undefined, 'a map books no visit');
    assert.ok(buildCatalog(s, content, { c: true }).places.some((p) => p.id === vault), 'known by report');
    assert.ok(!linksAt(s, vault, { hidden: true }).length, 'and no way to it');
    // going there is looking for a way there (review of a5035f0), never arriving straight
    await say(g, '*I go to the sealed vault*', GO(vault, 'I go to the sealed vault'));
    assert.match(actions(g), /GOES — on to find a way to Sealed vault/);
    const r = await g.reply('He wanders the corridor and finds himself in the vault.', { expected: { 1: { arrived: true, at: vault, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, corridor, 'no way shown, no arrival');
    assert.ok(rejectedRules(r).includes('passage'));
});

test('patch 7 (5, 8, 9): a room he walks into that no way was shown to is joined to where he came from, both ways; a guard room one floor down is another guard room than the one up here', async () => {
    const { g, hall, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor; a guard room off it.', deltas: [way(room('Guard room'), { name: 'side door' })] });
    await say(g, '*I push on past the corridor*', GO({ new: 'past the corridor' }, 'I push on past the corridor'));
    await g.reply('Past the corridor, a narrow cell.', { expected: { 1: { arrived: true, at: room('Narrow cell'), with: null } }, deltas: [] });
    let s = g.state();
    const cell = idOf(s, 'Narrow cell');
    assert.equal(s.scene.at, cell);
    const walked = linkBetween(s, corridor, cell);
    assert.ok(walked && walked.both && !walked.hidden, 'the way he took is kept, both ways');
    assert.equal(walked.found.how, 'walked');
    await walk(g, hall, { text: '*I go back to the hall*', prose: 'The hall.' });
    assert.equal(g.state().scene.at, hall, 'back by the ways he walked');
    await walk(g, cell, { text: '*I go to the narrow cell*', prose: 'The narrow cell.' });
    assert.equal(g.state().scene.at, cell);
    // a guard room down a stair from the guard room: not the same room
    const guard = idOf(s, 'Guard room');
    await walk(g, corridor, { text: '*I go back*', prose: 'The corridor.' });
    await walk(g, guard, { text: '*I go into the guard room*', prose: 'A stair goes down to the guard room of the lower floor.', deltas: [way(room('Guard room'), { name: 'stair down', dir: 'down' })] });
    s = g.state();
    const guards = byName(s, 'Guard room');
    assert.equal(guards.length, 2, 'two guard rooms, one per floor');
    assert.deepEqual(guards.map((p) => p.level).sort(), [1, 2]);
    assert.ok(linkBetween(s, guard, guards.find((p) => p.id !== guard).id), 'joined by the stair');
});

// ------------------------------------------------------------------------------------------------ review of a5035f0
test('patch 7 review A1: an iron door and a ventilation shaft between the same two rooms are two ways: the door stays barred, the shaft goes, a report of the door leaves the shaft alone', async () => {
    const { g, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'A locked iron door to the armory.', deltas: [
        feature('locked iron door', 'obstacle', { stat: 'STR', difficulty: 'hard' }, 1),
        way(room('Armory'), { name: 'iron door', feature: 'locked iron door' }, 2),
    ] });
    let s = g.state();
    const armory = idOf(s, 'Armory');
    const door = featNamed(s, /iron door/);
    await say(g, '*I look around*');
    await g.reply('High in the wall, a ventilation shaft also leads into the armory; behind a loose panel, a crawlspace too, unseen.', { expected: {}, deltas: [
        way(armory, { name: 'ventilation shaft' }, 1), way(armory, { name: 'loose panel', hidden: true }, 2),
    ] });
    s = g.state();
    const ways = Object.values(s.links).filter((l) => [l.a, l.b].includes(corridor) && [l.a, l.b].includes(armory));
    assert.equal(ways.length, 3, 'three ways between the two rooms');
    const iron = ways.find((l) => l.name === 'iron door');
    const shaft = ways.find((l) => l.name === 'ventilation shaft');
    assert.equal(iron.feature, door.id);
    assert.equal(shaft.feature, null);
    assert.equal(ways.find((l) => l.name === 'loose panel').hidden, true);
    // the iron door named again: that way, not the shaft; no copy
    await say(g, '*I look at the door*');
    await g.reply('The iron door is still locked.', { expected: {}, deltas: [way(armory, { name: 'iron door', feature: 'locked iron door' })] });
    s = g.state();
    assert.equal(Object.values(s.links).filter((l) => [l.a, l.b].includes(armory)).length, 3, 'no fourth way');
    assert.equal(s.links[shaft.id].feature, null, 'the shaft is not barred by the door');
    // through the door: barred; to the armory: by the shaft
    let q = await say(g, '*I go through the iron door*', GO({ new: 'the iron door' }, 'I go through the iron door'));
    assert.match(actions(g), /BLOCKED — the way to .* is barred by locked iron door/);
    await g.reply('Locked.', { expected: {}, deltas: [] });
    await walk(g, armory, { text: '*I climb through the shaft into the armory*', prose: 'He drops into the armory.' });
    s = g.state();
    assert.equal(s.scene.at, armory);
    assert.equal(s.features[door.id].status, 'active', 'the door is still locked');
    assert.equal(Object.values(s.links).filter((l) => [l.a, l.b].includes(armory)).length, 3, 'walking the shaft made no new way');
    await walk(g, corridor, { text: '*I climb back*', prose: 'Back up the shaft.' });
    assert.equal(g.state().scene.at, corridor, 'and back by it');
});

test('patch 7 review A2: a room known only by report, with no way to it, is not reached by an arrival the story claims; a way the same reply shows makes it reachable; a part nobody knew is still found by going on', async () => {
    const { g, tower, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor.' });
    await say(g, '*I read the old map*');
    await g.reply('The map shows a crypt below the tower.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: { new: { name: 'Crypt', kind: 'interior', parent: tower } }, by: null, how: 'map', where: 'below the tower', false: null }] });
    const crypt = idOf(g.state(), 'Crypt');
    // he goes on; the story drops him straight into the crypt it never showed a way to
    await say(g, '*I go deeper*', GO({ new: 'deeper' }, 'I go deeper'));
    let r = await g.reply('He arrives in the crypt.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: crypt, forced_by: null, with: null }] });
    assert.equal(g.state().scene.at, corridor, 'a report is no way');
    assert.ok(rejectedRules(r).includes('passage'));
    // forced, but by nothing next to him: still no
    await say(g, '*I wait*');
    r = await g.reply('The floor gives way and he falls into the crypt.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: crypt, forced_by: 'the floor gives way', with: null }] });
    assert.equal(g.state().scene.at, corridor, 'no way from here, forced or not');
    // going for the crypt he knows of: he looks for the way; the reply shows a stair down and takes him in
    await say(g, '*I make for the crypt on the map*', GO(crypt, 'I make for the crypt on the map'));
    assert.match(actions(g), /GOES — on to find a way to Crypt/);
    await g.reply('Behind a pillar a stair goes down; at its foot, the crypt.', { expected: { 1: { arrived: true, at: crypt, with: null } }, deltas: [way(crypt, { name: 'stair down', dir: 'down' })] });
    let s = g.state();
    assert.equal(s.scene.at, crypt, 'by the way the reply showed');
    assert.equal(s.places[crypt].level, 2);
    // a part nobody knew: found by going on, the way kept
    await say(g, '*I push on*', GO({ new: 'onward' }, 'I push on'));
    await g.reply('A side vault opens off the crypt.', { expected: { 1: { arrived: true, at: room('Side vault'), with: null } }, deltas: [] });
    s = g.state();
    assert.equal(s.scene.at, idOf(s, 'Side vault'));
    assert.ok(linkBetween(s, crypt, idOf(s, 'Side vault')));
});

test('patch 7 review A3: the way back through a corridor with a hidden plate stops at the plate: it springs once on his arrival there, he is in the corridor; a spent plate no longer stops the walk', async () => {
    await scores({ moderate: NEVER }, async () => {
        const { g, hall, corridor } = await inHall();
        await walk(g, corridor, { text: '*I go on*', prose: 'The corridor; a crypt beyond.', deltas: [
            feature('pressure plate under the dust', 'hazard', { hidden: true, trigger: 'enter', stat: 'AGI', harm: 'hp' }, 1),
            way(room('Crypt'), { name: 'arch' }, 2),
        ] });
        let s = g.state();
        const crypt = idOf(s, 'Crypt');
        const plate = featNamed(s, /pressure plate/);
        await walk(g, crypt, { text: '*I go into the crypt*', prose: 'The crypt.' });
        const before = hp(g.state());
        await say(g, '*I go back to the entrance hall*', GO(hall, 'I go back to the entrance hall'));
        const extra = (outcome(g).extra || []).join('\n');
        assert.match(extra, /HIDDEN DANGER, IF HE GETS IN — pressure plate under the dust/);
        assert.match(extra, /the walk stops in Main corridor/);
        await g.reply('He heads back; in the corridor a plate clicks under his boot.', { expected: { 1: { arrived: true, at: hall, with: null } }, deltas: [] });
        s = g.state();
        assert.equal(s.scene.at, corridor, 'he stops where it sprang');
        assert.equal(hp(s), before - content.rules.exploration.harm.moderate, 'once');
        assert.deepEqual([s.features[plate.id].hidden, s.features[plate.id].status], [false, 'disabled']);
        // spent: the walk goes on through
        await walk(g, crypt, { text: '*I go back into the crypt*', prose: 'The crypt.' });
        await say(g, '*I go back to the entrance hall*', GO(hall, 'I go back to the entrance hall'));
        assert.doesNotMatch((outcome(g).extra || []).join('\n'), /HIDDEN DANGER|walk stops/);
        await g.reply('Back through the corridor to the hall.', { expected: { 1: { arrived: true, at: hall, with: null } }, deltas: [] });
        assert.equal(g.state().scene.at, hall);
        assert.equal(hp(g.state()), before - content.rules.exploration.harm.moderate);
    });
});

// ------------------------------------------------------------------------------------------------ review: true Dungeons
const classify = (more = {}, seq = 1) => ({ seq, type: 'dungeon', place: null, theme: null, rank_min: null, rank_max: null, level: null, control: null, how: 'seen', ...more });

test('patch 7 review 9, 10, 12, 13: a watchtower is no Dungeon; a crypt the story makes a true A-Rank Dungeon stays A-Rank for an F-Rank Alaric, its theme stays, a later other Rank or theme is refused', async () => {
    const { g, tower } = await inHall();
    let s = g.state();
    assert.equal(s.places[tower].dungeon, undefined);
    assert.ok(!Object.fromEntries(worldRows(s, content)).Dungeon, 'no Dungeon row for a watchtower');
    // out, to a sunken crypt the story establishes as a true Dungeon far above him
    await say(g, '*I leave and follow the road to the sunken crypt*', GO(REALM, 'I leave and follow the road'));
    await g.reply('Out on the road again.', { expected: { 1: { arrived: true, at: REALM, with: null } }, deltas: [] });
    await say(g, '*I go to the sunken crypt*', GO({ new: 'the sunken crypt' }, 'I go to the sunken crypt'));
    await g.reply('A sunken crypt: the air hums; the Guild marks such places A-Rank.', { expected: { 1: { arrived: true, at: { new: { name: 'Sunken crypt', kind: 'site', parent: REALM } }, with: null } }, deltas: [
        classify({ theme: 'undead catacombs', rank_min: 'A', rank_max: 'A' }),
    ] });
    s = g.state();
    const crypt = s.scene.at;
    assert.equal(s.entities.pc.sheet.level, 1, 'Alaric is level 1, F-Rank');
    assert.deepEqual(s.places[crypt].dungeon.rank, { min: 'A', max: 'A' }, 'the Dungeon keeps its own Rank');
    assert.equal(s.places[crypt].rooms, true, 'a true Dungeon is explored room by room too');
    assert.match(Object.fromEntries(worldRows(s, content)).Dungeon, /Sunken crypt — undead catacombs; Rank A/);
    assert.match(buildContext(s, content, { input: 'I look around' }).text, /DUNGEON — Sunken crypt is a true Dungeon: undead catacombs; Rank A\. Its Rank and theme are the world's and fixed: never fit it or its creatures to Alaric's level/);
    // a later reply that would make it F-Rank goblin warrens: refused, told
    await say(g, '*I look around*');
    const r = await g.reply('Just a small goblin den, really, F-Rank.', { expected: {}, deltas: [classify({ theme: 'goblin warrens', rank_min: 'F', rank_max: 'F' })] });
    assert.ok(rejectedRules(r).includes('world_canon'));
    assert.match(r.record.corrections.join('\n'), /Sunken crypt stays as established: theme "undead catacombs", Rank A/);
    // away and back: the same
    await say(g, '*I go back to the road*', GO(REALM, 'I go back to the road'));
    await g.reply('The road.', { expected: { 1: { arrived: true, at: REALM, with: null } }, deltas: [] });
    await say(g, '*I go back to the sunken crypt*', GO(crypt, 'I go back to the sunken crypt'));
    await g.reply('The sunken crypt again.', { expected: { 1: { arrived: true, at: crypt, with: null } }, deltas: [] });
    s = g.state();
    assert.deepEqual([s.places[crypt].dungeon.theme, s.places[crypt].dungeon.rank], ['undead catacombs', { min: 'A', max: 'A' }]);
    assert.equal(byName(s, 'Sunken crypt').length, 1);
});

test('patch 7 review 11, 14: a Dungeon F–D keeps each level\'s Rank; a Rank the world holds but he does not know stays off his HUD (the narrator has it) until the Guild tells him; a rumour is a rumour', async () => {
    const { g, tower } = await inHall();
    await say(g, '*I look around*');
    await g.reply('Goblin sign everywhere: these are goblin warrens of three levels.', { expected: {}, deltas: [
        classify({ theme: 'goblin warrens', rank_min: 'F', rank_max: 'D', how: 'hidden' }, 1),
        classify({ level: 1, rank_min: 'F', how: 'seen' }, 2),
        classify({ level: 2, rank_min: 'E', how: 'hidden' }, 3),
        classify({ level: 3, rank_min: 'D', how: 'hidden' }, 4),
        classify({ rank_min: 'F', rank_max: 'F', how: 'rumor' }, 5),
    ] });
    let s = g.state();
    const c = s.places[tower].dungeon;
    assert.deepEqual(c.levels, { 1: { min: 'F', max: 'F' }, 2: { min: 'E', max: 'E' }, 3: { min: 'D', max: 'D' } });
    assert.deepEqual(c.rank, { min: 'F', max: 'D' }, 'the rumour of F-Rank is no canon');
    const hud = Object.fromEntries(worldRows(s, content)).Dungeon;
    assert.match(hud, /level 1: F/);
    assert.doesNotMatch(hud, /F–D|level 2|level 3|goblin/, 'what he does not know is not on his HUD');
    assert.match(hud, /rumoured: Rank F/);
    assert.match(buildContext(s, content, { input: 'I look around' }).text, /goblin warrens; Rank F–D; level 1: F, level 2: E, level 3: D/);
    // a level's Rank told otherwise: refused
    await say(g, '*I look around*');
    let r = await g.reply('The second level is C-Rank.', { expected: {}, deltas: [classify({ level: 2, rank_min: 'C' })] });
    assert.ok(rejectedRules(r).includes('world_canon'));
    assert.deepEqual(g.state().places[tower].dungeon.levels[2], { min: 'E', max: 'E' });
    // the Guild tells him: now he knows
    await say(g, '*I read the Guild notice nailed by the door*');
    r = await g.reply('A Guild notice: goblin warrens, F–D.', { expected: {}, deltas: [classify({ theme: 'goblin warrens', rank_min: 'F', rank_max: 'D', how: 'guild' })] });
    assert.match(Object.fromEntries(worldRows(g.state(), content)).Dungeon, /goblin warrens; Rank F–D/);
    assert.ok(!rejectedRules(r).includes('world_canon'), 'the same, told: no conflict');
});

test('patch 7 review C3, 15, 16, 17: Ashbridge knows the Mossback Warrens (F–E); the Novice board may put clearance of its F-Rank level there, one listing at most, as an ordinary Guild contract; going there finds the one place, never a copy', async () => {
    const listings = [
        { id: 'L1', title: 'Clear the first level of the Mossback Warrens', client: 'the Ashbridge Guild', rank: 'Novice', level: 4, qtype: 'standard', payout_cp: 60,
            task: 'Clear level 1 of the Mossback Warrens. Danger: groups may overwhelm solo adventurers.', desired_end_state: 'The goblin scouts of the Mossback Warrens\' first level are dealt with.',
            objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'goblin scout', qty: null, unit: null, where: 'Mossback Warrens, level 1' }], proof: [] },
        { id: 'L2', title: 'Cull the quarry rats', client: 'the quarry foreman', rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 40, task: 'Cull the giant rats in the old quarry.', desired_end_state: 'The quarry rats are culled.', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'giant rat', qty: 4, unit: null, where: 'the old quarry' }], proof: [] },
        { id: 'L3', title: 'Cull the Blackgate feral dogs', client: 'a wool merchant', rank: 'Novice', level: 3, qtype: 'standard', payout_cp: 70, task: 'Cull two feral dogs near Blackgate.', desired_end_state: 'The two feral dogs are defeated.', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'feral dog', qty: 2, unit: null, where: 'Blackgate pasture' }], proof: [] },
        { id: 'L4', title: 'Cull wolves at the ford', client: 'the Ashbridge post', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 30, task: 'Cull two wolves at the ford.', desired_end_state: 'The two wolves are defeated.', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'wolf', qty: 2, unit: null, where: 'the ford' }], proof: [] },
        { id: 'L5', title: 'Drive off the reed wolves', client: 'the reed cutters', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 60, task: 'Drive the wolves off the reed beds.', desired_end_state: 'The wolves no longer prowl the reed beds.', objectives: [{ id: 'o1', verb: 'DEFEAT', what: 'wolf', qty: 1, unit: null, where: 'the reed beds' }], proof: [] },
    ];
    const g = new Chat4(content, { greeting: GREETING, listings });
    await g.player('Mage');
    await g.player('Flame Lance + Arcane Burst');
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    let s = g.state();
    const warrens = 'loc.mossback_warrens';
    assert.deepEqual([s.places[warrens].name, s.places[warrens].dungeon.rank, s.places[warrens].rooms], ['Mossback Warrens', { min: 'F', max: 'E' }, true]);
    assert.equal(s.places[warrens].parent, REALM, 'out in the land near Ashbridge');
    // the board generator is told of it, with the Novice limit
    const req = boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user;
    assert.match(req, /KNOWN DUNGEONS NEAR THIS BRANCH \(the Guild's records\): Mossback Warrens \(goblin warrens.*Rank F–E; level 1: F, level 2: E/);
    assert.match(req, /At most one listing may be clearance work in one of them, and only in a part whose danger Rank is F/);
    // the planner can name it from Ashbridge
    await say(g, '*I walk into Ashbridge*', GO('loc.ashbridge', 'I walk into Ashbridge'));
    await g.reply('Ashbridge.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [] });
    s = g.state();
    assert.ok(buildCatalog(s, content, { c: true }).places.some((p) => p.id === warrens && /Rank F–E/.test(p.name)));
    // the board: an ordinary Guild contract
    await say(g, '*I go to the Guild hall*', GO('loc.ashbridge.guild_hall', 'I go to the Guild hall'));
    await g.reply('The Guild hall.', { expected: { 1: { arrived: true, at: 'loc.ashbridge.guild_hall', with: null } }, deltas: [] });
    assert.match(buildContext(g.state(), content, { input: 'I look around' }).text, /KNOWN DUNGEONS NEAR ASHBRIDGE .*Mossback Warrens/);
    await say(g, '*I read the board*', { type: 'board.read', rank: null, quote: 'I read the board' });
    s = g.state();
    const q = Object.values(s.quests).find((x) => /Mossback/.test(x.title));
    assert.ok(q, 'listed');
    assert.equal(Object.values(s.quests).filter((x) => /Mossback/.test(x.title)).length, 1, 'one Dungeon job among five');
    assert.equal(q.kind, 'guild_contract');
    assert.equal(q.status, 'listed');
    assert.equal(contractReady(s, content, q, { c: true }).ok, false, 'not done by being posted');
    await g.reply('The board.', { expected: {}, deltas: [] });
    // going there: the one Mossback Warrens, however the story names its parent
    await say(g, '*I set out for the Mossback Warrens*', GO(warrens, 'I set out for the Mossback Warrens'));
    await g.reply('Half a day east, the moss-grown hill.', { expected: { 1: { arrived: true, at: { new: { name: 'Mossback Warrens', kind: 'site', parent: 'loc.ashbridge' } }, with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 300 }] });
    s = g.state();
    assert.equal(s.scene.at, warrens, 'the same place');
    assert.equal(byName(s, 'Mossback Warrens').length, 1, 'no copy');
    assert.match(Object.fromEntries(worldRows(s, content)).Dungeon, /Mossback Warrens — goblin warrens.*Rank F–E/);
});

// ------------------------------------------------------------------------------------------------ final review of e4d61b8
const gob = (ref, more = {}, seq = 1) => ({ seq, type: 'creature.new', ref, species: 'goblin', anchor: 'goblin', desc: [ref], count: 1, present: true, band: 'LONG', stronger: null, threat: false, more: null, ...more });
const levelOf = (s, ref) => Object.values(s.entities).filter((e) => e.kind === 'creature' && (e.descriptors || []).some((x) => x.includes(ref))).map((e) => e.profile?.level);
const bandOf = (r) => content.rules.ranks.bands.find((b) => b.rank === r);

/** Alaric in the Mossback Warrens: its upper tunnels (level 1, F) and the burrows below (level 2, E). */
async function warrens() {
    const g = await campaign();
    // Patch 8: the Warrens' gate lets only registered Guild members in (lore.json living.gate.requires): he is one
    rec(g.chat.findLast((m) => m.extra?.avereth?.events)).events.push({ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.ashbridge', power_rank: 'F' } });
    await walk(g, 'loc.mossback_warrens', { text: '*I go to the Mossback Warrens*', prose: 'The moss-grown hill; a tunnel mouth.', deltas: [way(room('Upper tunnels'), { name: 'tunnel mouth' })] });
    const upper = idOf(g.state(), 'Upper tunnels');
    await walk(g, upper, { text: '*I go into the tunnels*', prose: 'The upper tunnels; a ramp goes down to the burrows.', deltas: [way(room('Lower burrows'), { name: 'ramp down', dir: 'down' })] });
    return { g, upper, lower: idOf(g.state(), 'Lower burrows') };
}

test('patch 7 final 1, 2, 4: a new goblin of the Warrens\' F-Rank level gets a level of the F band, one of its E-Rank level one of the E band; locked once, the same when he comes back', async () => {
    const { g, upper, lower } = await warrens();
    let s = g.state();
    assert.equal(s.places[upper].level, 1);
    assert.equal(s.places[lower].level, 2);
    await say(g, '*I watch*');
    await g.reply('A goblin scout peers from a side tunnel.', { expected: {}, deltas: [gob('tunnel scout')] });
    s = g.state();
    const [lv1] = levelOf(s, 'tunnel scout');
    const F = bandOf('F');
    assert.ok(lv1 >= F.min && lv1 <= F.max, `F band (${lv1})`);
    const scout = Object.values(s.entities).find((e) => (e.descriptors || []).includes('tunnel scout'));
    assert.equal(scout.met_at, upper, 'its profile was locked in the upper tunnels');
    const profile = JSON.stringify(scout.profile);
    await walk(g, lower, { text: '*I go down the ramp*', prose: 'The burrows.' });
    await say(g, '*I watch*');
    await g.reply('A goblin warrior squats by a fire.', { expected: {}, deltas: [gob('burrow warrior')] });
    s = g.state();
    const [lv2] = levelOf(s, 'burrow warrior');
    const E = bandOf('E');
    assert.ok(lv2 >= E.min && lv2 <= E.max, `E band (${lv2})`);
    await walk(g, upper, { text: '*I go back up*', prose: 'The upper tunnels; the scout is still there.', deltas: [gob('tunnel scout')] });
    s = g.state();
    assert.equal(JSON.stringify(Object.values(s.entities).find((e) => (e.descriptors || []).includes('tunnel scout')).profile), profile, 'the same scout, the same profile');
    assert.equal(levelOf(s, 'tunnel scout').length, 1);
    assert.equal(foldChat(g.chat).state.entities[scout.id].profile.level, lv1, 'the fold agrees');
});

test('patch 7 final 3, 6: in an A-Rank Dungeon a level-1 Alaric meets A-band creatures; in an unclassified ruin and in the open land the level stays as before', async () => {
    const { g, corridor } = await inHall();
    await walk(g, corridor, { text: '*I go on*', prose: 'The corridor.' });
    await say(g, '*I watch*');
    await g.reply('A goblin in the corridor.', { expected: {}, deltas: [gob('corridor goblin')] });
    assert.deepEqual(levelOf(g.state(), 'corridor goblin'), [1], 'an ordinary ruin: the area\'s level, as before');
    await say(g, '*I leave*', GO(REALM, 'I leave'));
    await g.reply('The road.', { expected: { 1: { arrived: true, at: REALM, with: null } }, deltas: [gob('road goblin')] });
    assert.deepEqual(levelOf(g.state(), 'road goblin'), [1], 'the open land: as before');
    await say(g, '*I go to the sunken crypt*', GO({ new: 'the sunken crypt' }, 'I go to the sunken crypt'));
    await g.reply('A sunken crypt, A-Rank by the Guild\'s marks; a ghoul stirs.', { expected: { 1: { arrived: true, at: { new: { name: 'Sunken crypt', kind: 'site', parent: REALM } }, with: null } }, deltas: [
        classify({ theme: 'undead catacombs', rank_min: 'A', rank_max: 'A' }, 1), gob('crypt ghoul', {}, 2),
    ] });
    const s = g.state();
    assert.equal(s.entities.pc.sheet.level, 1);
    const [lv] = levelOf(s, 'crypt ghoul');
    const A = bandOf('A');
    assert.ok(lv >= A.min && lv <= A.max, `A band, not his (${lv})`);
});

test('patch 7 final 5: a creature\'s own established level, or a profile it has, is never replaced by the Dungeon\'s', async () => {
    const { g, upper } = await warrens();
    const s = structuredClone(g.state());
    s.entities['mon.t1'] = { id: 'mon.t1', kind: 'creature', species: 'goblin', anchor: 'goblin', level: 40, descriptors: ['goblin champion'], status: 'alive' };
    s.entities['mon.t2'] = { id: 'mon.t2', kind: 'creature', species: 'goblin', anchor: 'goblin', descriptors: ['old goblin'], status: 'alive', profile: { level: 2, keep: true } };
    assert.equal(s.scene.at, upper);
    const events = [];
    const emit = (e) => { events.push(e); applyEvent(s, e); };
    materialise(s, content, Dice.from(s), emit, 'mon.t1');
    materialise(s, content, Dice.from(s), emit, 'mon.t2');
    assert.equal(s.entities['mon.t1'].profile.level, 40, 'its own level stands');
    assert.deepEqual(s.entities['mon.t2'].profile, { level: 2, keep: true }, 'its profile stands');
});

test('patch 7 final 7, 8: what is hidden of a Dungeon is not the Guild\'s to post; what the Guild was told or keeps on record is', async () => {
    const { g, tower } = await inHall();
    await say(g, '*I look around*');
    await g.reply('Spider sign everywhere.', { expected: {}, deltas: [classify({ theme: 'spider nest', rank_min: 'D', rank_max: 'C', how: 'hidden' })] });
    let s = g.state();
    s.places[tower].near = 'loc.ashbridge';
    let req = boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user;
    assert.doesNotMatch(req, /spider|Rank D|Old watchtower/, 'nothing hidden reaches the board');
    assert.match(req, /Mossback Warrens \(goblin warrens.*Rank F–E/, 'the public Dungeon is still there');
    // what Ashbridge knows, asked in Ashbridge
    const town = (st) => buildContext({ ...st, scene: { ...st.scene, at: 'loc.ashbridge', location: 'loc.ashbridge' } }, content, { input: 'what dungeons are near?' }).text;
    assert.match(town(s), /KNOWN DUNGEONS NEAR ASHBRIDGE[^\n]*Mossback Warrens/);
    assert.doesNotMatch(town(s), /KNOWN DUNGEONS[^\n]*(Old watchtower|spider)/, 'nor in what Ashbridge knows');
    // seen by Alaric alone: still not the Guild's
    await say(g, '*I look around*');
    await g.reply('He sees it plainly now: a spider nest.', { expected: {}, deltas: [classify({ theme: 'spider nest', how: 'seen' })] });
    s = g.state();
    s.places[tower].near = 'loc.ashbridge';
    req = boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user;
    assert.doesNotMatch(req, /spider/, 'what he saw is his, not the Guild\'s');
    assert.doesNotMatch(town(s), /KNOWN DUNGEONS[^\n]*(Old watchtower|spider)/, 'nor Ashbridge\'s common knowledge');
    // the Guild's own record
    await say(g, '*I read the Guild notice*');
    await g.reply('A Guild notice: a spider nest, D–C.', { expected: {}, deltas: [classify({ theme: 'spider nest', rank_min: 'D', rank_max: 'C', how: 'guild' })] });
    s = g.state();
    s.places[tower].near = 'loc.ashbridge';
    req = boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user;
    assert.match(req, /Old watchtower \(spider nest; Rank D–C/);
    // a deeper level the world keeps hidden and a master only Alaric has seen stay off the Guild's record
    await say(g, '*I look around*');
    await g.reply('Below, something older stirs.', { expected: {}, deltas: [classify({ level: 2, rank_min: 'B', rank_max: 'B', how: 'hidden' }), classify({ control: 'a brood-mother', how: 'seen' }, 2)] });
    s = g.state();
    s.places[tower].near = 'loc.ashbridge';
    assert.deepEqual(s.places[tower].dungeon.levels[2], { min: 'B', max: 'B' }, 'the hidden level is canon');
    assert.equal(s.places[tower].dungeon.control, 'a brood-mother');
    req = boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user;
    assert.match(req, /Old watchtower \(spider nest; Rank D–C\)/, 'neither the hidden depth nor what he alone saw');
    assert.doesNotMatch(req, /Rank B|brood-mother/);
    // a level of a public Dungeon only Alaric has seen is his; a campaign begun before the Guild's record still has the
    // public Dungeons as they were seeded
    const mb = s.places['loc.mossback_warrens'].dungeon;
    mb.levels[3] = { min: 'D', max: 'D' };
    assert.doesNotMatch(boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user, /level 3/);
    delete mb.levels[3];
    delete mb.guild;
    assert.match(boardRequest(s, content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [] }).user, /Mossback Warrens \(goblin warrens.*Rank F–E; level 1: F, level 2: E/);
});

test('patch 7 final 9, 10, 11: of two Dungeon jobs the board takes one; a part above the board\'s Rank, or none named in a Dungeon of mixed Ranks, is refused; a refill keeps the one already up; an ordinary Novice mix stays whole', async () => {
    const g = await campaign();
    const s = g.state();
    const need = { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
    const L = (title, where, more = {}) => ({ title, client: 'the Ashbridge Guild', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 50, task: `${title}. Danger: groups threaten solo adventurers.`, desired_end_state: `${title}: done.`, objectives: [{ verb: 'DEFEAT', what: 'goblin', qty: where.includes('Mossback') ? null : 1, unit: null, where }], proof: [], ...more });
    const ordinary = [L('Cull the quarry rats', 'the old quarry'), { ...L('Wool delivery to Blackgate', 'Blackgate'), objectives: [{ verb: 'DELIVER', what: 'sealed wool parcel', qty: 1, unit: null, where: 'Merchant at Blackgate' }] }, { ...L('Letters to the ford', 'the ford'), objectives: [{ verb: 'DELIVER', what: 'satchel of letters', qty: 1, unit: null, where: 'Ferryman at the ford' }] }, L('Drive off the reed wolves', 'the reed beds')];
    const answer = (ls) => JSON.stringify({ listings: ls });
    // a regular mix with one Dungeon job: all five
    let p = parseBoard(answer([L('Clear the first level of the Mossback Warrens', 'Mossback Warrens, level 1'), ...ordinary]), content, need, s);
    assert.equal(p.listings.length, 5, 'one Dungeon clearance in the current 2/2/1 mix');
    assert.ok(parseBoard(answer([L('Cull the quarry rats', 'the old quarry'), ...ordinary.slice(1), L('Cull the marsh rats', 'the marsh')]), content, need, s).errors.length, 'a suitable known Dungeon gets its own slot');
    // two Dungeon jobs: the second refused
    p = parseBoard(answer([L('Clear the first level of the Mossback Warrens', 'Mossback Warrens, level 1'), L('Clear the Mossback Warrens upper tunnels', 'Mossback Warrens, level 1'), ...ordinary.slice(0, 3)]), content, need, s);
    assert.equal(p.listings.filter((l) => /Mossback/.test(l.title)).length, 1);
    assert.match(p.refused.map((r) => r.why).join(' '), /at most one Dungeon clearance/);
    // above the board's Rank, or no part named in an F–E Dungeon
    p = parseBoard(answer([L('Clear the burrows of the Mossback Warrens', 'Mossback Warrens, level 2'), ...ordinary]), content, need, s);
    assert.match(p.refused.map((r) => r.why).join(' '), /level 2 .*Rank E.*not Novice work/);
    p = parseBoard(answer([L('Clear the Mossback Warrens', 'Mossback Warrens'), ...ordinary]), content, need, s);
    assert.match(p.refused.map((r) => r.why).join(' '), /names no part of Mossback Warrens/);
    // a refill with one up already: no second
    p = parseBoard(answer([L('Clear the first level of the Mossback Warrens', 'Mossback Warrens, level 1')]), content, { ...need, c: false, missing: 1, have: ['Clear the goblin scouts from the first level of the Mossback Warrens'] }, s);
    assert.equal(p.listings.length, 0);
    assert.match(p.refused[0].why, /at most one Dungeon job/);
});
