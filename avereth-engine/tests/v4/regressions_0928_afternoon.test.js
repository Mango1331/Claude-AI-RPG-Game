import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { firewall } from '../../src/v4/firewall.js';
import { applyWorld } from '../../src/v4/world.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { buildContext } from '../../src/context.js';
import { processReplyAny } from '../../src/v4/runtime.js';
import { knows, PC_NAME_FACT, currentFacts } from '../../src/knowledge.js';
import { interpreterSystem } from '../../src/v4/interpret.js';
import { sceneHandle } from '../../src/v4/scene_handles.js';
import { parseIntent } from '../../src/intent.js';
import { boardRequest, checkProof, completeContract } from '../../src/v4/guild.js';
import { worldPanel } from '../../src/display.js';
import { playerTurn } from '../../src/engine.js';

const contentPack = await loadContent();

async function created(seed = 7) {
    const g = new Chat4(contentPack, { seed });
    const w = contentPack.classes.get('warrior');
    await g.player('Warrior');
    await g.player(w.skill_pool.slice(0, 2).map((id) => contentPack.skills.get(id).name).join(' and '));
    return g;
}

test('search is one engine-resolved PER check, not an unlimited narrator yield (live 28.09. afternoon)', async () => {
    const g = await created();
    const text = '*I search the woods for tracks of larger animals.*';
    const r = await g.player(text, [{
        seq: 1, type: 'activity', kind: 'search', what: 'tracks of larger animals',
        minutes: null, until: null, quote: 'search the woods for tracks of larger animals',
    }]);
    assert.equal(r.action, 'context');
    const o = g.state().last.outcome;
    assert.equal(o.search_checks.length, 1);
    assert.equal(o.search_checks[0].stat, 'PER');
    assert.equal(typeof o.search_checks[0].roll, 'number');
    assert.equal(typeof o.search_checks[0].success, 'boolean');
    assert.equal(o.check_die, null, 'search owns the Core #7 roll; no second generic die');
    assert.match(o.actions[0], /SEARCH CHECK/);
    assert.match(o.actions[0], o.search_checks[0].success ? /concrete discovery, encounter or actionable lead/ : /no relevant find, a false lead, danger\/complication, or this avenue being exhausted/);
    assert.match(r.context.text, /SEARCH RESOLUTION is already rolled and binding/);
});

test('learn keeps a told proper name as a literal; third-person Alaric is not name-learning evidence', async () => {
    const g = await created();
    await g.player('I look at the person nearby.', []);
    await g.reply('A clerk waits nearby.', { expected: {}, deltas: [{
        seq: 1, type: 'person.new', ref: 'clerk', name: null, role: 'clerk', desc: ['plain coat'], present: true, at: null, band: null,
    }] });
    const before = g.state();
    const clerk = Object.values(before.entities).find((e) => e.kind === 'npc' && (e.descriptors || []).includes('clerk'))?.id;
    assert.ok(clerk);
    await g.player('My name is Alaric Red.', []);
    await g.reply('Alaric said, "My name is Alaric Red."', { expected: {}, deltas: [{
        seq: 1, type: 'learn', who: clerk, s: 'pc', p: 'name', o: 'Alaric Red', how: 'told',
    }] });
    const s = g.state();
    assert.equal(knows(s, clerk, PC_NAME_FACT), true);
    assert.ok(!Object.values(s.claims).some((x) => x.s === 'pc' && x.p === 'name' && x.o === 'pc'), 'no pc.name=pc claim');
    assert.match(contentPack.deltaVocab.rules.join('\n'), /Third-person narration merely calling the protagonist "Alaric"/);
});

test('an anonymous Drowned Gull innkeeper is not named from the inn title', async () => {
    const g = await created();
    await g.player('I look at the innkeeper.', []);
    await g.reply('The Drowned Gull smelled of salt and smoke. Its innkeeper wiped the counter.', { expected: {}, deltas: [{
        seq: 1, type: 'person.new', ref: 'person.drowned_gull_innkeeper', name: null, role: 'innkeeper', desc: ['stout'], present: true, at: null, band: null,
    }] });
    const npc = Object.values(g.state().entities).find((e) => e.kind === 'npc' && (e.descriptors || []).includes('innkeeper'));
    assert.ok(npc);
    assert.ok(!/^(?:Drowned|Gull|Drowned Gull)$/i.test(npc.name || ''), `unexpected inferred name: ${npc.name}`);
});

test('Guild contract status/payout and Guild clearance marks cannot be smuggled through free world deltas', () => {
    const q = { id: 'quest.escort', title: 'Escort a Fish Cart', payout_cp: 50, status: 'active' };
    const ctx = {
        inGuildHall: true,
        contracts: [q],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: { go: true, take: false, gather: false, roam: false },
        isGuildPerson: (x) => x === 'npc.guild_clerk',
        heldByPc: (x) => x === 'obj.escort_slip',
        isGuildContractRef: (x) => x === q.id,
        guildContractForObject: (x) => x === 'obj.escort_slip' ? q : null,
    };
    const bad = firewall([
        { seq: 1, type: 'fact', s: q.id, p: 'payout', o: '5 copper' },
        { seq: 2, type: 'fact', s: q.id, p: 'status', o: 'done on Guild rolls' },
        { seq: 3, type: 'fact', s: 'obj.escort_slip', p: 'mark', o: 'CLEARED' },
        { seq: 4, type: 'object.mark', object: 'obj.escort_slip', mark: 'CLEARED', by: 'npc.guild_clerk' },
        { seq: 5, type: 'fact', s: 'the Guild', p: 'stamped the contract slip', o: 'CLEARED' },
    ], ctx);
    assert.deepEqual(bad.accept, []);
    assert.deepEqual(bad.reject.map((x) => x.rule), ['engine_owned_fact', 'engine_owned_fact', 'engine_owned_fact', 'guild_completion', 'engine_owned_fact']);
    const proof = firewall([{ seq: 1, type: 'object.mark', object: 'obj.escort_slip', mark: 'delivery confirmed by Old Hew', by: 'npc.old_hew' }], ctx);
    assert.equal(proof.accept.length, 1, 'field proof remains narrator/world-owned');
});

test('same-reply arrival re-checks authority in the new location', async () => {
    const g = await created();
    const s = structuredClone(g.state());
    s.last.outcome = {
        kind: 'v4',
        actions: [],
        expected_keys: {},
        conditionals: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: {
            go: { seq: 1, to: 'loc.redmarch.guild_hall', name: 'Guild hall', hall: true, newName: null },
            gos: [{ seq: 1, to: 'loc.redmarch.guild_hall', name: 'Guild hall', hall: true, newName: null }],
            roam: false, take: [], gather: false, rest: false, timeCap: 120,
        },
    };
    const a = applyWorld(s, contentPack, { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: 'loc.redmarch.guild_hall' },
        { seq: 2, type: 'fact', s: 'new members', p: 'start at', o: 'F-Rank' },
    ] }, { msg: 99, prose: 'He reaches the Guild hall. The clerk says all new members start at F-Rank.' });
    assert.equal(a.state.scene.at, 'loc.redmarch.guild_hall');
    assert.ok(a.rejected.some((x) => x.seq === 2 && x.rule === 'guild_canon'));
    assert.ok(!currentFacts(a.state, () => true).some((f) => /F-Rank/.test(String(f.o))), 'the post-arrival Guild fact never commits');
});

test('active Guild quest catalog is continuity memory; V4 contract keeps quest friction without literal proof gates', async () => {
    const g = await created();
    const s = structuredClone(g.state());
    s.quests['quest.escort'] = {
        id: 'quest.escort', title: 'Escort a Fish Cart', kind: 'guild_contract', status: 'active', rank: 'Novice',
        payout_cp: 50, client: 'Old Hew', giver: null, notes: ['Cart has reached the market road'], history: [],
        desired_end_state: "Old Hew's fish cart safely reaches the market",
        objectives: [{ id: 'o1', verb: 'ESCORT', what: "Old Hew's fish cart", qty: null, unit: null, where: 'Market Gate', status: 'open' }],
        proof: [{ id: 'p1', kind: 'mark', what: 'delivery confirmed by Old Hew', on: 'Guild contract slip', consume: false }],
    };
    const c = buildCatalog(s, contentPack);
    const info = c.quests.find((x) => x.id === 'quest.escort')?.info || '';
    assert.match(info, /desired outcome: Old Hew's fish cart safely reaches the market/);
    assert.match(info, /job memory: ESCORT Old Hew's fish cart at Market Gate/);
    assert.match(info, /verification example: "delivery confirmed by Old Hew" on the Guild contract slip/);
    const ctx = buildContext(s, contentPack, { input: 'I wait.', outcome: { kind: 'v4', actions: ['NOTHING TO BOOK'], extra: [], search_checks: [] } }).text;
    assert.match(ctx, /ACTIVE QUEST MEMORY/);
    assert.match(ctx, /verification examples: "delivery confirmed by Old Hew"/);
    assert.match(ctx, /not as a word-for-word checklist/);
    assert.match(ctx, /QUEST FRICTION:/);
    assert.match(ctx, /paid only by the Guild on explicit accepted turn-in/);
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /GAMEPLAY RESOLUTION — SEARCH & QUEST FRICTION/);
    assert.match(contract, /Repeated searches in the same situation must advance or close the situation/);
    assert.match(contract, /A nontrivial accepted adventure Quest must contain at least one meaningful complication/);
    assert.match(contract, /objectives\/proof.*memory.*not a permission system|Quest objectives\/proof.*memory/i);
});

test('interpreter contract explicitly treats walking toward a sound/track/direction as GO', () => {
    const go = contentPack.commandVocab.commands.find((x) => x.type === 'go');
    assert.match(go.summary, /walks toward a sound\/tracks\/direction/);
    assert.match(interpreterSystem(contentPack.commandVocab), /walk toward the sound/);
});

test('search-check echoes are silent duplicates; opposite narration gets a correction, not ENGINE REFUSED', async () => {
    const g = await created();
    const s = structuredClone(g.state());
    s.last.outcome = {
        kind: 'v4', actions: [], expected_keys: {}, conditionals: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: { go: null, gos: [], roam: true, take: [], gather: true, rest: false, timeCap: 120 },
        search_checks: [{ what: 'large animal tracks', stat: 'PER', actor: 5, opposition: 6, chance: 45.45, roll: 11, success: true, by: 'engine', seq: 1 }],
        check_die: null,
    };
    const ok = applyWorld(s, contentPack, { expected: {}, deltas: [
        { seq: 1, type: 'check', what: 'large animal tracks', stat: 'PER', success: true },
    ] }, { msg: 99, prose: 'He found fresh tracks.' });
    assert.deepEqual(ok.rejected, []);
    assert.equal(ok.events.filter((e) => e.t === 'check.recorded').length, 0, 'engine search check is not booked twice');

    const bad = applyWorld(s, contentPack, { expected: {}, deltas: [
        { seq: 1, type: 'check', what: 'large animal tracks', stat: 'PER', success: false },
    ] }, { msg: 99, prose: 'He found nothing.' });
    assert.deepEqual(bad.rejected, []);
    assert.ok(bad.corrections.some((x) => /resolved it as SUCCESS/.test(x)));
});

test('extractor contract treats tracks as evidence and never re-reports engine search checks', () => {
    const rules = contentPack.deltaVocab.rules.join('\n');
    assert.match(rules, /engine-resolved SEARCH CHECK.*Never emit a check delta/s);
    assert.match(rules, /Tracks, spoor, hair, a wallow, sounds, shadows.*not creature\.new/s);
});

test('Guild quest.detail protects payout/completion mechanics but allows operational verification fiction', () => {
    const q = { id: 'quest.watch', title: 'Night Watch', payout_cp: 90, status: 'active' };
    const ctx = {
        inGuildHall: true, contracts: [q],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: {}, isGuildPerson: () => true,
    };
    const bad = firewall([{ seq: 1, type: 'quest.detail', quest: q.id, note: "The steward won't pay for early arrival.", schedule: 'after sundown' }], ctx);
    assert.equal(bad.accept.length, 0);
    assert.equal(bad.reject[0].rule, 'guild_quest_detail');
    const good = firewall([{ seq: 1, type: 'quest.detail', quest: q.id, note: 'Meet steward Hobb Martt at the west door; his witness statement can verify the patrol.', schedule: 'after sundown' }], ctx);
    assert.equal(good.accept.length, 1);
    const proofFiction = firewall([{ seq: 2, type: 'quest.detail', quest: q.id, note: 'The watch captain can sign the slip or confirm the result in person.', schedule: null }], ctx);
    assert.equal(proofFiction.accept.length, 1);
});

test('Runtime V4 does not mutate narrator prose with style word replacements', async () => {
    const g = await created();
    await g.player('I read the notice.', []);
    g.chat.push({ mes: 'Deliver a Ledger to the Saltwharf Counting House.', is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    const p = processReplyAny(g.chat, id, contentPack, { swaps: [['ledger', 'register']] });
    assert.equal(p.extract, true);
    assert.equal(g.chat[id].mes, 'Deliver a Ledger to the Saltwharf Counting House.');
});


test('stable scene handles target anonymous actors before combat and do not renumber after A leaves', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.entities['npc.foot_a'] = { id: 'npc.foot_a', kind: 'npc', name: null, role: 'footpad', descriptors: ['footpad'], traits: '', status: 'alive', created: { turn: 3, minute: 10 }, template: 'commoner', card: {} };
    st.entities['npc.foot_b'] = { id: 'npc.foot_b', kind: 'npc', name: null, role: 'footpad', descriptors: ['footpad'], traits: '', status: 'alive', created: { turn: 4, minute: 11 }, template: 'commoner', card: {} };
    st.scene.present.push('npc.foot_a', 'npc.foot_b');
    st.scene.positions['npc.foot_a'] = { band: 'SHORT', cover: 'none' };
    st.scene.positions['npc.foot_b'] = { band: 'SHORT', cover: 'partial' };
    assert.equal(sceneHandle(st, contentPack, 'npc.foot_a'), 'Footpad A');
    assert.equal(sceneHandle(st, contentPack, 'npc.foot_b'), 'Footpad B');
    const cat = buildCatalog(st, contentPack);
    assert.equal(cat.present.find((x) => x.id === 'npc.foot_b').handle, 'Footpad B');
    const intent = parseIntent('I attack Footpad B.', st, contentPack);
    assert.equal(intent.kind, 'attack');
    assert.equal(intent.target, 'npc.foot_b');
    st.scene.present = st.scene.present.filter((id) => id !== 'npc.foot_a');
    assert.equal(sceneHandle(st, contentPack, 'npc.foot_b'), 'Footpad B');
});

test('explicit combat readiness is a deterministic engage intent when concrete opponents have tactical intent', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.entities['npc.foot_a'] = { id: 'npc.foot_a', kind: 'npc', name: null, role: 'footpad', descriptors: ['footpad'], traits: '', status: 'alive', created: { turn: 3, minute: 10 }, template: 'commoner', card: {} };
    st.entities['npc.foot_b'] = { id: 'npc.foot_b', kind: 'npc', name: null, role: 'footpad', descriptors: ['footpad'], traits: '', status: 'alive', created: { turn: 4, minute: 11 }, template: 'commoner', card: {} };
    st.scene.present.push('npc.foot_a', 'npc.foot_b');
    st.pending_intents['npc.foot_a'] = 'parley';
    st.pending_intents['npc.foot_b'] = 'take_cover';
    const intent = parseIntent('*I step forward and get ready for combat.*', st, contentPack);
    assert.equal(intent.kind, 'engage');
    assert.deepEqual(intent.targets, ['npc.foot_a', 'npc.foot_b']);
    assert.equal(parseIntent('*I draw my sword.*', st, contentPack).kind, 'narrative');
});

test('V4 explicit name:null stays anonymous for an Ashbridge Guild clerk', async () => {
    const g = await created();
    await g.player('I look at the clerk.', []);
    await g.reply('At the Ashbridge Guild hall, the clerk looks up.', { expected: {}, deltas: [{
        seq: 1, type: 'person.new', ref: 'person.ashbridge_guild_clerk', name: null, role: 'Guild clerk', desc: ['ink-stained'], present: true, at: null, band: null,
    }] });
    const clerk = Object.values(g.state().entities).find((e) => e.kind === 'npc' && (e.descriptors || []).includes('guild clerk'));
    assert.ok(clerk);
    assert.equal(clerk.name, null);
});

test('extractor contract carries exact Core Range Band semantics and booked-object dedupe instruction', () => {
    const rules = contentPack.deltaVocab.rules.join('\n');
    assert.match(rules, /ENGAGED = immediate contact\/melee reach/);
    assert.match(rules, /forty yards ahead is not ENGAGED/);
    assert.match(rules, /already grant or create a Guild plate, contract slip or other object/);
});

test('Guild board prompt uses structural quest design instead of the old chore checklist', async () => {
    const g = await created();
    const st = g.state();
    const branch = Object.values(st.places).find((p) => p.kind === 'settlement')?.id;
    assert.ok(branch);
    const req = boardRequest(st, contentPack, { branch, rank: 'Novice', missing: 5, day: 1, have: [] });
    assert.doesNotMatch(req.system, /vermin, escorts, gathering, lost animals, repairs, deliveries, watches/);
    assert.match(req.system, /cause \(why now\), stakeholder\/client, current problem, desired end state/);
    assert.match(req.system, /Rank limits scope, risk and complexity/);
    assert.match(req.system, /wolves, goblins or feral dogs/);
    assert.match(req.system, /Do not preferentially default to rats/);
    assert.match(req.system, /examples demonstrate structure only/i);
});


test('free fantasy species uses an explicit F1 anchor, materialises at reveal, and shows HP/Range before combat', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.last.outcome = {
        kind: 'v4', actions: [], expected_keys: {}, conditionals: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: { go: null, gos: [], roam: true, take: [], gather: false, rest: false, timeCap: 120 },
        search_checks: [], check_die: null,
    };
    const a = applyWorld(st, contentPack, { expected: {}, deltas: [{
        seq: 1, type: 'creature.new', ref: 'c1', species: 'plated wallow beast', anchor: 'armored_beast',
        desc: ['low and long, like a giant badger crossed with a lizard', 'back plated in overlapping grey hide'],
        count: 1, present: true, band: 'SHORT',
    }] }, { msg: 99, prose: 'The thing stood in the wallow ten paces off, plated in grey hide.' });
    assert.deepEqual(a.rejected, []);
    const beast = Object.values(a.state.entities).find((e) => e.kind === 'creature' && e.species === 'plated wallow beast');
    assert.ok(beast, 'creative species becomes a canonical creature');
    assert.equal(beast.anchor, 'armored_beast');
    assert.ok(beast.profile, 'profile is locked at visible reveal, before combat');
    assert.equal(beast.profile.max_hp, 70);
    assert.equal(a.state.scene.positions[beast.id].band, 'SHORT');
    assert.equal(a.state.encounter, null, 'reveal alone does not roll Initiative or start Combat');
    const panel = worldPanel(st, contentPack, a);
    assert.match(panel, /ACTIVE SCENE — Plated Wallow Beast A · HP 70\/70 · SHORT/);
    assert.doesNotMatch(panel, /Initiative|COMBAT START/);

    const intent = parseIntent('*I Basic Attack the creature*', a.state, contentPack);
    assert.equal(intent.kind, 'attack');
    assert.equal(intent.target, beast.id);
    const attack = playerTurn(a.state, contentPack, '*I Basic Attack the creature*', { msg: 100 });
    assert.equal(attack.outcome.kind, 'combat');
    assert.ok(attack.state.encounter, 'first actual attack starts the encounter');
    assert.ok(attack.outcome.board.order.some((x) => x.id === beast.id), 'Initiative board now contains the revealed creature');
});

test('creature.new extractor contract separates display species from mechanical anchor', () => {
    const d = contentPack.deltaVocab.deltas.find((x) => x.type === 'creature.new');
    assert.ok(d.fields.anchor);
    assert.ok(d.fields.anchor.enum.includes('armored_beast'));
    assert.match(contentPack.deltaVocab.rules.join('\n'), /species is the creature's actual in-world name\/type.*anchor as the nearest ecological\/mechanical F1 body-plan/s);
});

test('invalid attack outside combat is System-only and never handed to the narrator', async () => {
    const g = await created();
    const r = playerTurn(g.state(), contentPack, '*I Basic Attack the creature*', { msg: 99 });
    assert.equal(r.intent.kind, 'no_target');
    assert.equal(r.outcome, null);
    assert.equal(r.command.llm, null);
    assert.match(r.command.panels[0], /SYSTEM \/\/ ATTACK — TARGET NEEDED/);
    assert.match(r.command.panels[0], /Nothing was spent or rolled/);
});

test('equipped starter weapon is in the V4 catalog and readying it cannot become a missing-item equip', async () => {
    const g = await created();
    const st = g.state();
    const cat = buildCatalog(st, contentPack);
    const sword = cat.objects.find((o) => o.id === 'item.starter_longsword');
    assert.ok(sword);
    assert.equal(sword.state, 'equipped: weapon');
    assert.match(interpreterSystem(contentPack.commandVocab), /I get my sword out and hold it ready/);
});

test('Guild proof sums separate gathered resource stacks and consumes only the required quantity', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.objects['obj.mint.1'] = { id: 'obj.mint.1', name: 'marshmint root', kind: 'resource', stack: true, qty: 4, unit: 'handfuls', holder: { entity: 'pc' }, marks: [], for_quests: ['quest.mint'] };
    st.objects['obj.mint.2'] = { id: 'obj.mint.2', name: 'marshmint root', kind: 'resource', stack: true, qty: 3, unit: 'handfuls', holder: { entity: 'pc' }, marks: [], for_quests: ['quest.mint'] };
    const q = { id: 'quest.mint', proof: [{ kind: 'object', what: 'marshmint root', qty: 6, unit: 'handfuls', consume: true }] };
    const p = checkProof(st, q);
    assert.equal(p.ok, true);
    assert.deepEqual(p.consume, [{ id: 'obj.mint.1', qty: 4 }, { id: 'obj.mint.2', qty: 2 }]);
    assert.match(contentPack.deltaVocab.rules.join('\n'), /concrete amount actually gathered.*emit object\.new/s);
});

test('invented Guild plate replacement fee is engine-owned canon and is rejected', () => {
    const ctx = {
        inGuildHall: true, contracts: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [] },
        auth: {}, isGuildPerson: () => true,
    };
    const r = firewall([{ seq: 1, type: 'fact', s: 'Guild plate', p: 'replacement_fee', o: '1 silver (10 cp)' }], ctx);
    assert.equal(r.accept.length, 0);
    assert.equal(r.reject[0].rule, 'guild_canon');
});

test('pending V4 extraction leaves narrator prose visible while continuity is recorded', async () => {
    const g = await created();
    await g.player('I look toward the reeds.', []);
    const prose = 'A plated beast steps into view.';
    g.chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
    const id = g.chat.length - 1;
    const p = processReplyAny(g.chat, id, contentPack);
    assert.equal(p.extract, true);
    assert.equal(g.chat[id].mes, prose, 'extractor evidence remains byte-faithful');
    assert.match(String(g.chat[id].extra.display_text || ''), /A plated beast steps into view/, 'story is readable immediately');
    assert.doesNotMatch(String(g.chat[id].extra.display_text || ''), /engine is reading|recording continuity/i);
});


test('NPC voluntarily handing a known quest item to Alaric is world agency, not overreach', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.entities['npc.sella'] = { id:'npc.sella', kind:'npc', name:'Sella', descriptors:['rescuer'], traits:'', status:'alive', created:{turn:3,minute:0}, template:'commoner', card:{} };
    st.scene.present.push('npc.sella');
    st.objects['obj.hook'] = { id:'obj.hook', name:"Ossry's brass ladder-hook", kind:'item', stack:false, qty:1, unit:null, holder:{entity:'npc.sella'}, marks:[], for_quests:['quest.lamp'] };
    st.last.outcome = {
        kind:'v4', actions:['NOTHING TO BOOK — Alaric decides nothing the engine resolves in this message; narrate what he says and does, and the world\'s response.'],
        expected_keys:{}, conditionals:[], booked:{registration:false,grants:[],turnIns:[],accepted:[]},
        auth:{go:null,gos:[],roam:false,take:[],gather:false,rest:false,timeCap:120}, search_checks:[], check_die:null,
    };
    const r = applyWorld(st, contentPack, { expected:{}, deltas:[
        {seq:1,type:'object.move',object:'obj.hook',qty:null,to:'pc'}
    ]}, {msg:99, prose:'Sella presses Ossry\'s brass ladder-hook into Alaric\'s hand.'});
    assert.deepEqual(r.rejected, []);
    assert.equal(r.state.objects['obj.hook'].holder.entity, 'pc');
    assert.ok(!r.events.some((e)=>e.t==='overreach.noted'));
});

test('quest.ready stores achieved story outcome and allows flexible Guild turn-in without exact proof token', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    st.quests['quest.lamp'] = {
        id:'quest.lamp', title:'Missing Lamplighter', kind:'guild_contract', client:'Ward', rank:'Novice', level:1, qtype:'standard',
        payout_cp:120, desired_end_state:'Ossry is found and his fate is credibly resolved for the Ward',
        objectives:[{id:'o1',verb:'FIND',what:'Ossry',qty:1,unit:null,where:'Weeping Stair',status:'open'}],
        proof:[{id:'p1',kind:'object',what:"Ossry's brass ladder-hook",qty:1,unit:null,consume:true}],
        source:{branch:'loc.test'}, schedule:{starts_at:null,deadline:null}, status:'active', taker:'pc', history:[], details:[], notes:[],
    };
    st.last.outcome = {kind:'v4',actions:[],expected_keys:{},conditionals:[],booked:{registration:false,grants:[],turnIns:[],accepted:[]},auth:{go:null,gos:[],roam:false,take:[],gather:false,rest:false,timeCap:120},search_checks:[],check_die:null};
    const r = applyWorld(st, contentPack, {expected:{},deltas:[
        {seq:1,type:'quest.ready',quest:'quest.lamp',note:'Ossry was found alive, rescued from the collapse and returned to the Ward.'}
    ]},{msg:99,prose:'Ossry reaches the city alive with witnesses.'});
    assert.equal(r.state.quests['quest.lamp'].ready, true);
    assert.match(r.state.quests['quest.lamp'].ready_note, /rescued/);
    const events=[];
    const done = completeContract(r.state, contentPack, r.state.quests['quest.lamp'], (e)=>events.push(e), {step:1});
    assert.equal(done.ok, true);
    assert.ok(events.some((e)=>e.t==='quest.status' && e.d.to==='completed'));
    assert.ok(events.some((e)=>e.t==='coin.changed' && e.d.delta===120));
    assert.ok(!events.some((e)=>e.t==='object.consumed'), 'no exact proof token is required/consumed when story outcome is ready');
});

test('Guild turn-in still refuses an untouched contract with neither readiness nor legacy proof', async () => {
    const g = await created();
    const st = structuredClone(g.state());
    const q = {
        id:'quest.untouched', title:'Untouched Job', kind:'guild_contract', rank:'Novice', level:1, qtype:'standard', payout_cp:50,
        desired_end_state:'the work is actually done', objectives:[{id:'o1',verb:'REPAIR',what:'bridge',status:'open'}],
        proof:[{id:'p1',kind:'mark',what:'signed by foreman',on:'slip'}], status:'active', history:[], notes:[], details:[],
    };
    st.quests[q.id]=q;
    const events=[];
    const done=completeContract(st,contentPack,q,(e)=>events.push(e),{step:1});
    assert.equal(done.ok,false);
    assert.match(done.reason,/outcome has not yet been established/);
    assert.ok(!events.some((e)=>e.t==='coin.changed'));
});

test('ordinary V4 story turns no longer consume an unused generic CHECK DIE', async () => {
    const g = await created();
    const before=g.state().rng.n;
    const r=await g.player('I brace my shoulder against the stuck door and push.', []);
    const o=g.state().last.outcome;
    assert.equal(o.kind,'v4');
    assert.equal(o.check_die,null);
    assert.equal(o.search_checks.length,0);
    assert.equal(g.state().rng.n,before, 'no random number is spent merely because ordinary fiction may be uncertain');
});

test('active quest narrator context treats objectives/proof as memory and verification guidance, not literal gate', async () => {
    const g=await created();
    const st=structuredClone(g.state());
    st.quests['quest.soft']={
        id:'quest.soft', title:'Find the Carter', kind:'guild_contract', rank:'Novice', level:1, qtype:'standard', payout_cp:80,
        desired_end_state:'the missing carter is found and the client learns what happened',
        objectives:[{id:'o1',verb:'FIND',what:'missing carter',status:'open'}],
        proof:[{id:'p1',kind:'object',what:'carter badge',qty:1,unit:null,consume:false}],
        status:'active', history:[], notes:['Tracks lead north'], progress:[{objective:'follow the tracks',status:'done',turn:3}], details:[],
    };
    const ctx=buildContext(st,contentPack,{input:'I continue looking.',lastReply:'',outcome:{kind:'v4',actions:['NOTHING TO BOOK'],extra:[],search_checks:[]}});
    assert.match(ctx.text,/ACTIVE QUEST MEMORY/);
    assert.match(ctx.text,/verification examples:/);
    assert.match(ctx.text,/not as a word-for-word checklist/);
    assert.doesNotMatch(ctx.text,/proof required for Guild turn-in/);
});
