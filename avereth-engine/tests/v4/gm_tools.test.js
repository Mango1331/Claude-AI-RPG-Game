// Experimental 4.3 GM-tools scaffold: semantics come from the Narrator; deterministic domains still come from the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { startCampaign, playerTurn } from '../../src/engine.js';
import { fold, applyEvent } from '../../src/state.js';
import { createGmSession, resolveCombat, resolveStory, useAbilityOnWorld, commitWorld, finalizeGmSession } from '../../src/gm/runtime.js';
import { truth } from '../../src/knowledge.js';
import { gmToolRegistrations } from '../../src/gm/tools.js';

const content = await loadContent();

function mageState(seed = 17) {
    let state = fold(startCampaign(content, {
        seed,
        runtime: 'v4',
        firstMessage: 'SYSTEM INITIALIZATION COMPLETE\nLocation: Public roadside verge outside Redmarch, Veyrhold',
    }));
    state = playerTurn(state, content, 'Mage', { intent: { kind: 'creation.class', class: 'mage' } }).state;
    state = playerTurn(state, content, 'Flame Lance + Arcane Burst', {
        intent: { kind: 'creation.skills', skills: ['mage.flame_lance', 'mage.arcane_burst'] },
    }).state;
    return state;
}

test('Narrator semantic choice can resolve player alias Fire Lance as canonical Flame Lance', () => {
    const state = mageState();
    applyEvent(state, { t: 'entity.created', d: { entity: {
        id: 'mon.test_barkscorpion', kind: 'creature', name: null, descriptors: ['dry-brown barkscorpion'], traits: '',
        status: 'alive', location: state.scene.location, card: {}, species: 'barkscorpion', anchor: 'arthropod',
    } } });
    applyEvent(state, { t: 'scene.entered', d: { id: 'mon.test_barkscorpion', band: 'SHORT' } });
    applyEvent(state, { t: 'scene.awareness', d: { id: 'mon.test_barkscorpion', level: 'aware' } });

    const beforeMp = state.entities.pc.sheet.mp;
    const session = createGmSession({ chatId: 'test', userIndex: 3, input: '*I Fire Lance Barkscorpion B*', beforeState: state });
    const out = resolveCombat(session, content, {
        action: 'attack', skill: 'mage.flame_lance', target: 'mon.test_barkscorpion',
    });

    assert.equal(out.result.ok, true);
    const pcAttack = out.result.outcome.records.find((r) => r.actor === 'pc' && r.kind === 'attack');
    assert.ok(pcAttack, 'the player attack must resolve in the deterministic combat log');
    assert.equal(pcAttack.skill_name, 'Flame Lance');
    assert.equal(out.session.state.entities.pc.sheet.mp, beforeMp - 16);
});

test('creative Flame Lance on scenery spends engine-owned MP without inventing an ATTACK_TERRAIN command', () => {
    const state = mageState();
    const beforeMp = state.entities.pc.sheet.mp;
    const session = createGmSession({
        chatId: 'test', userIndex: 3,
        input: '*I cast Flame Lance into the cracked stone floor to blast the cave open*',
        beforeState: state,
    });
    const out = useAbilityOnWorld(session, content, {
        skill: 'mage.flame_lance',
        target_description: 'the cracked stone floor above the hollow',
        target_ref: null,
        goal: 'blast open a passage into the cave',
    });

    assert.equal(out.result.ok, true);
    assert.equal(out.result.outcome.skill.id, 'mage.flame_lance');
    assert.equal(out.result.outcome.mechanical.cost.amount, 16);
    assert.ok(out.result.outcome.mechanical.raw_power > 0);
    assert.equal(out.session.state.entities.pc.sheet.mp, beforeMp - 16);
    assert.equal(out.session.state.encounter, null);
});

test('Narrator can persist the durable cave consequence through the existing world/firewall path', () => {
    const state = mageState();
    let session = createGmSession({
        chatId: 'test', userIndex: 3,
        input: '*I cast Flame Lance into the cracked stone floor to blast the cave open*',
        beforeState: state,
    });
    session = useAbilityOnWorld(session, content, {
        skill: 'mage.flame_lance',
        target_description: 'the cracked stone floor',
        goal: 'open the cave',
    }).session;

    const out = commitWorld(session, content, {
        changes: [{ type: 'fact', s: state.scene.at, p: 'stone_floor', o: 'blasted open into a person-sized passage to the cave below' }],
        evidence: 'Flame Lance struck the cracked floor; the weakened stone collapsed into a person-sized opening.',
    });
    assert.equal(out.result.ok, true);
    assert.equal(out.result.rejected.length, 0);
    assert.equal(truth(out.session.state, state.scene.at, 'stone_floor')[0]?.o, 'blasted open into a person-sized passage to the cave below');
});

test('Narrator can classify "look for the other two" as SEARCH and get the engine-owned search roll', () => {
    const state = mageState();
    const session = createGmSession({
        chatId: 'test', userIndex: 3,
        input: '*I ignore him and look for the other 2*',
        beforeState: state,
    });
    const out = resolveStory(session, content, {
        commands: [{ type: 'activity', kind: 'search', what: 'the other two barkscorpions', minutes: null, until: null, quote: 'look for the other 2' }],
    });
    assert.equal(out.result.ok, true);
    assert.equal(out.result.outcome.actions.some((x) => x.includes('SEARCHES')), true);
    assert.equal(out.result.outcome.search_checks.length, 1);
    assert.equal(out.result.outcome.auth.gos.length, 0);
});

test('a conversational turn with no tool call still advances once when the assistant swipe is finalized', () => {
    const state = mageState();
    const session = createGmSession({ chatId: 'test', userIndex: 3, input: 'Hello.', beforeState: state });
    const final = finalizeGmSession(session, content);
    assert.equal(final.state.turn, state.turn + 1);
    assert.equal(final.events.filter((e) => e.t === 'turn.begun').length, 1);
    assert.equal(final.events.filter((e) => e.t === 'outcome.recorded').length, 1);
    assert.equal(final.actionResolved, false);
});

// ------------------------------------------------------------------------------------------------ review fixes
test('a malformed story command is refused with its schema errors, not resolved silently wrong', () => {
    const state = mageState();
    const session = createGmSession({ chatId: 'test', userIndex: 3, input: '*I look for the other 2*', beforeState: state });
    // before: ok=true with "UNDEFINED for a while" and "GOES — to somewhere"
    const search = resolveStory(session, content, { commands: [{ type: 'activity', activity: 'search' }] });
    assert.equal(search.result.ok, false);
    assert.equal(search.result.code, 'invalid_commands');
    assert.match(search.result.message, /missing required "kind"/);
    assert.ok(search.result.expected_args.activity.kind, 'the expected arguments come back for the repair');
    assert.equal(search.session, session, 'nothing is staged');
    const go = resolveStory(session, content, { commands: [{ type: 'go', destination: 'the guild' }] });
    assert.equal(go.result.code, 'invalid_commands');
    assert.match(go.result.message, /missing required "to"/);
});

test('a journey the engine authorized can end: commit_world arrive moves the scene; without the go it is refused', () => {
    const state = mageState();
    const to = 'loc.redmarch.guild_hall';
    let session = createGmSession({ chatId: 'test', userIndex: 3, input: '*I walk to the Adventurers Guild*', beforeState: state });
    const went = resolveStory(session, content, { commands: [{ type: 'go', to, quote: 'walk to the Adventurers Guild' }] });
    assert.equal(went.result.ok, true);
    assert.notEqual(went.session.state.scene.at, to, 'go only authorizes the journey');
    const arrived = commitWorld(went.session, content, { changes: [{ type: 'arrive', at: to }] });
    assert.equal(arrived.result.ok, true);
    assert.deepEqual(arrived.result.rejected, []);
    assert.equal(arrived.session.state.scene.at, to);
    // no go this turn: the applier refuses the arrival
    session = createGmSession({ chatId: 'test', userIndex: 3, input: '*I look around*', beforeState: state });
    const stray = commitWorld(session, content, { changes: [{ type: 'arrive', at: to }] });
    assert.notEqual(stray.session.state.scene.at, to);
});

test('the story bridge keeps the agency guard: a question or a plan is not a commitment the Narrator may resolve', () => {
    const state = mageState();
    const ask = createGmSession({ chatId: 'test', userIndex: 3, input: '"What does it cost to register with the Guild?"', beforeState: state });
    const asked = resolveStory(ask, content, { commands: [{ type: 'guild.register', quote: 'What does it cost to register with the Guild?' }] });
    assert.equal(asked.result.ok, false);
    assert.equal(asked.result.code, 'not_player_commitment');
    assert.equal(asked.result.dropped[0].rule, 'question');
    assert.equal(asked.session, ask);
    const later = createGmSession({ chatId: 'test', userIndex: 3, input: '*Tomorrow I will pay the clerk the fee.*', beforeState: state });
    const planned = resolveStory(later, content, { commands: [{ type: 'pay', amount_cp: 10, to: { new: 'the clerk' }, for: 'the fee', quote: 'Tomorrow I will pay the clerk the fee' }] });
    assert.equal(planned.result.code, 'not_player_commitment');
    assert.equal(planned.result.dropped[0].rule, 'plan');
    // the quote is required: without it nothing is committed
    const bare = resolveStory(later, content, { commands: [{ type: 'activity', kind: 'search', what: 'the hall', minutes: null, until: null }] });
    assert.equal(bare.result.code, 'invalid_commands');
    assert.match(bare.result.message, /quote/);
});

test('the tool definitions load and name what the runtime accepts', () => {
    const defs = gmToolRegistrations({}, () => true);
    assert.deepEqual(defs.map((d) => d.name), ['avereth_lookup', 'avereth_resolve_combat', 'avereth_resolve_story', 'avereth_use_ability_on_world', 'avereth_commit_world']);
    assert.match(defs.find((d) => d.name === 'avereth_commit_world').description, /\barrive\b/);
    assert.match(defs.find((d) => d.name === 'avereth_resolve_story').description, /quote/);
});
