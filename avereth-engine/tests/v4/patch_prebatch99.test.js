import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { worldPanel } from '../../src/display.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { bookPurchase, pickLines } from '../../src/v4/trade.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { generateBoard, runExtraction, processReplyAny } from '../../src/v4/runtime.js';
import { boardNeed, HUNT_BOARD_PROFILE, boardRequest } from '../../src/v4/guild.js';
import { foldChat, rec } from '../../src/host.js';
import { Dice } from '../../src/rng.js';
import { campaign, say } from './patch8_lib.js';
const content = await loadProductContent(),
    copy = structuredClone;
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run22_prebatch.json', import.meta.url)));
const t90 = JSON.parse(fs.readFileSync(new URL('./fixtures/run21_habitat_catalog.json', import.meta.url))).t90;
const world = (x, a = x.answers[0], s = x.state) => applyWorld(copy(s), content, copy(a), {
    msg: x.i,
    prose: x.prose
});
const events = (r, t) => r.events.filter(e => e.t === t);
const command = (s, cs) => {
    s = copy(s);
    const es = [];
    const ctx = resolveCommands(s, content, cs, e => {
        es.push(copy(e));
        applyEvent(s, e);
    }, {
        c: true,
        msg: 500,
        dice: Dice.from(s)
    });
    return {
        state: s,
        events: es,
        ctx
    };
};
const offerState = () => {
    const s = world(f.purchase).state;
    s.entities.pc.sheet.coin_cp = 50;
    s.offers['offer.t112.4'].status = 'open';
    return s;
};
const accept = {
    seq: 1,
    type: 'offer.accept',
    offer: 'offer.t112.4',
    lines: ['l3'],
    quote: 'I buy the corner room for six copper.'
};
const parse = (s, a) => {
    const cat = extractorCatalog(s, content, {
        c: true
    });
    return parseExtraction(JSON.stringify(a), content.deltaVocab, {
        places: cat.places,
        objects: cat.objects,
        quests: cat.quests
    }, s.last.outcome.expected_keys, {
        sceneRequired: true,
        startScene: s.scene.at
    });
};

test('99 original Run22 i112: one accommodation purchase, with identical event replay', () => {
    const r = world(f.purchase);
    assert.equal(r.state.entities.pc.sheet.coin_cp, 44);
    assert.equal(events(r, 'transaction.completed').length, 1);
    assert.equal(events(r, 'service.granted').length, 1);
    const s = copy(f.purchase.state);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(s, e);
    assert.deepEqual(s, r.state);
    assert.ok(!s.decisions.some(d => ['dec.t47.1', 'dec.t48.1'].includes(d.id)));
});
test('99 the latest lower limit supersedes an older affordable consent', () => {
    const s = copy(f.purchase.state);
    s.decisions.find(d => d.id === 'dec.t48.1').max_cp = 4;
    const r = world(f.purchase, f.purchase.answers[0], s);
    assert.equal(events(r, 'transaction.completed').length, 0);
    assert.equal(r.state.entities.pc.sheet.coin_cp, 50);
});
test('99 manual acceptance does not close a different purchase wish', () => {
    const s = offerState();
    s.decisions.push({
        id: 'other',
        kind: 'purchase',
        what: 'an iron sword',
        seller: s.offers[accept.offer].seller,
        at: s.scene.at,
        turn: 47,
        max_cp: 100,
        qty: null
    });
    const r = command(s, [accept]);
    assert.ok(r.state.decisions.some(d => d.id === 'other'));
});
test('99 the shared booker refuses stale accepted offers without any side effects', () => {
    const s = offerState(),
        o = s.offers[accept.offer];
    o.status = 'accepted';
    const es = [];
    bookPurchase(s, e => {
        es.push(e);
        applyEvent(s, e);
    }, {
        offer: o,
        ...pickLines(o, ['l3']),
        objectId: () => 'obj.test',
        content
    });
    assert.equal(es.length, 0);
});
test('99 a shared word stone is not authority to buy a different stone', () => {
    const s = offerState();
    const o = s.offers[accept.offer];
    o.lines = [{
        id: 'l1',
        what: 'Return Stone',
        kind: 'goods',
        qty: 1,
        price_cp: 6
    }];
    const r = command(s, [{
        seq: 1,
        type: 'buy',
        what: 'Skill Stone',
        from: o.seller,
        max_cp: 6,
        quote: 'I buy a Skill Stone for at most six copper.'
    }]);
    assert.equal(events(r, 'transaction.completed').length, 0);
});
test('99 two distinct room services do not consume one another\'s decisions', () => {
    const s = offerState();
    s.decisions = [{
        id: 'single',
        kind: 'purchase',
        what: 'single room',
        seller: s.offers[accept.offer].seller,
        at: s.scene.at,
        turn: 47,
        max_cp: 8,
        qty: null
    }, {
        id: 'suite',
        kind: 'purchase',
        what: 'family room',
        seller: s.offers[accept.offer].seller,
        at: s.scene.at,
        turn: 48,
        max_cp: 9,
        qty: null
    }];
    s.offers[accept.offer].lines = [{
        id: 'l1',
        what: 'single room',
        kind: 'service',
        service: 'lodging',
        qty: 1,
        price_cp: 6
    }];
    const r = command(s, [{
        ...accept,
        lines: ['l1'],
        quote: 'I buy the single room.'
    }]);
    assert.ok(r.state.decisions.some(d => d.id === 'suite'));
});
test('99 canonical manuals are hidden from the Planner while their bound seller is absent', () => {
    const s = copy(f.wait.state);
    assert.equal(buildCatalog(s, content, {
        c: true
    }).offers.some(o => o.id.startsWith('offer.manuals.')), false);
    assert.ok(!worldPanel(s, content).includes('Primer of Strike'));
    const o = Object.values(s.offers).find(o => o.stock === 'manuals');
    s.scene.present.push(o.seller);
    assert.ok(buildCatalog(s, content, {
        c: true
    }).offers.some(x => x.id === o.id));
});
test('99 re-opened canonical stock can be bought again with fresh consent', () => {
    const s = offerState();
    let r = command(s, [accept]);
    assert.equal(events(r, 'transaction.completed').length, 1);
    r.state.offers[accept.offer].status = 'open';
    r = command(r.state, [accept]);
    assert.equal(events(r, 'transaction.completed').length, 1);
});
for (const needs of [null, 2]) test(
    `99 Run21 GO before SEARCH and WAIT does not execute them at departure, needs=${needs}`, () => {
        const cs = JSON.parse(t90.commands).commands;
        cs[2].needs = needs;
        const before = copy(t90.state);
        before.searches = before.searches.filter(x => x.turn !== before.turn);
        before.clock.minute -= 865;
        const r = command(before, cs);
        assert.equal(events(r, 'check.recorded').length, 0);
        assert.ok(!events(r, 'time.advanced').some(e => e.d.why === 'wait'));
        assert.match(r.ctx.actions.join(' '), /arrival|arriv|reach/i);
    });
test('99 old lodging does not authorize Hetta\'s room even with valid explicit chronology', () => {
    const a = copy(f.wait.answers[1]);
    let at = f.wait.state.scene.at;
    for (const d of a.deltas) {
        if (d.type === 'arrive') at = d.at;
        else d.scene = copy(at);
    }
    assert.equal(parse(f.wait.state, a).valid, true);
    const r = world(f.wait, a);
    assert.equal(r.state.scene.at, f.wait.state.scene.at);
});
test('99 even a fresh unbound lodging cannot authorize an arbitrary neighbouring office', () => {
    const s = copy(f.wait.state);
    s.services[0].turn = s.turn;
    const a = {
        scene: s.scene.at,
        expected: {},
        deltas: [{
            seq: 1,
            type: 'arrive',
            at: {
                new: {
                    name: 'Private office',
                    kind: 'interior',
                    parent: s.scene.at
                }
            },
            with: null,
            forced_by: null
        }]
    };
    const r = world(f.wait, a, s);
    assert.equal(r.state.scene.at, s.scene.at);
});
test('99 original T73 semantic errors are locally rejectable, independent information survives', () => {
    for (const a of f.wait.answers) {
        const p = parse(f.wait.state, a);
        assert.equal(p.valid, true, p.errors.join('; '));
        assert.ok(p.issues?.length);
        const r = world(f.wait, p.value);
        assert.equal(r.state.scene.at, f.wait.state.scene.at);
        assert.equal(events(r, 'transaction.completed').length, 0);
        assert.ok(Object.values(r.state.places).some(p => p.name === "Marda's clothstall"));
        assert.ok(r.rejected.length > 0);
    }
});
test('99 hard schema errors remain hard rather than partially salvaged', () => {
    const a = copy(f.wait.answers[0]);
    a.deltas.push({
        seq: 99,
        type: 'object.move',
        object: 'obj.invented',
        to: {
            entity: 'pc'
        }
    });
    assert.equal(parse(f.wait.state, a).valid, false);
});
test('99 failed travel plus ambiguous here does not create a local person', () => {
    const s = copy(f.wait.state),
        far = 'loc.alderwatch.market';
    const a = {
        scene: far,
        expected: {},
        deltas: [{
            seq: 1,
            type: 'arrive',
            at: far,
            with: null,
            forced_by: null
        }, {
            seq: 2,
            type: 'person.new',
            ref: 'ambiguous',
            role: 'vendor',
            name: 'Mira',
            desc: [],
            present: true,
            scene: 'here',
            band: 'SHORT'
        }]
    };
    const r = world(f.wait, a, s);
    assert.equal(events(r, 'entity.created').length, 0);
});
test('99 expected-only arrival preserves the earlier departure gift and then arrives', () => {
    const s = offerState(),
        start = s.scene.at,
        seller = s.offers[accept.offer].seller,
        to = 'loc.alderwatch';
    s.last.outcome = {
        c: true,
        auth: {
            c: true,
            gos: [{
                seq: 1,
                to
            }],
            timeCap: 120
        },
        expected_keys: {
            1: 'go'
        },
        resolutions: [{
            seq: 1,
            type: 'go',
            status: 'authorized'
        }]
    };
    const a = {
        scene: to,
        expected: {
            1: {
                arrived: true,
                at: to,
                with: null
            }
        },
        deltas: [{
            seq: 1,
            type: 'object.new',
            name: 'a copper button',
            kind: 'item',
            qty: 1,
            holder: seller,
            scene: start
        }, {
            seq: 2,
            type: 'object.move',
            object: {
                new: 'a copper button'
            },
            to: 'pc',
            scene: start
        }]
    };
    const r = applyWorld(s, content, a, {
        msg: 501,
        prose: 'The keeper gives Alaric a copper button. Then Alaric leaves and reaches the town square.'
    });
    assert.equal(r.state.scene.at, to);
    assert.equal(events(r, 'object.created').length, 1, JSON.stringify(r.rejected));
    assert.ok(Object.values(r.state.objects).some(o => o.name === 'a copper button' && o.holder.entity ===
        'pc'));
});
test('99 original real journey accepts an explicit reached intermediate stop, never scene alone', () => {
    const original = world(f.stop);
    assert.equal(original.state.scene.at, f.stop.state.scene.at);
    const a = copy(f.stop.answers[0]);
    a.deltas.unshift({
        seq: 0,
        type: 'arrive',
        at: 'realm.valedorn_crown',
        with: null,
        forced_by: null
    });
    a.deltas.forEach((d, i) => d.seq = i + 1);
    const r = world(f.stop, a);
    assert.equal(r.state.scene.at, 'realm.valedorn_crown');
    assert.equal(r.rejected.length, 0);
});
test('99 Board prompt derives the eligible intro anchors from Content', () => {
    const s = f.board.state,
        need = {
            ...boardNeed(s, content),
            c: true,
            profile: HUNT_BOARD_PROFILE,
            progression: true
        };
    const req = boardRequest(s, content, need);
    const text = req.messages.map(m => m.content).join('\n');
    assert.match(text, /intro.*eligible|eligible.*intro/i);
    assert.match(text, /rat/);
});
test('99 Board repair includes global and individual refusal diagnostics together', async () => {
    const s = f.board.state,
        need = {
            ...boardNeed(s, content),
            c: true,
            profile: HUNT_BOARD_PROFILE,
            progression: true
        };
    const a = copy(f.board.answers[0]);
    a.listings[0].habitat.anchor = 'aquatic';
    a.listings[0].habitat.species = 'wolf';
    a.listings[0].title = "Wrongly mapped wolf";
    const calls = [];
    await generateBoard(async q => {
        calls.push(q);
        return JSON.stringify(a);
    }, s, content, need);
    assert.equal(calls.length, 2);
    assert.match(calls[1].messages.at(-1).content, /Wrongly mapped wolf/);
    assert.match(calls[1].messages.at(-1).content, /body plan|habitat|species/i);
});
test('99 T73 runtime applies one selected extraction, and reload/repeated processing does not duplicate it',
async () => {
    const g = await campaign(content);
    await say(g, 'I wait for a reply.', {
        type: 'activity',
        kind: 'wait',
        minutes: 5
    });
    const id = g.chat.push({
        mes: 'A visitor may be at the east gate. Alaric remains here.',
        is_user: false,
        extra: {}
    }) - 1;
    processReplyAny(g.chat, id, content);
    const at = g.state().scene.at;
    let calls = 0;
    const a = {
        scene: at,
        expected: {},
        deltas: [{
            seq: 1,
            type: 'place.reported',
            place: {
                new: {
                    name: 'East gate',
                    kind: 'site',
                    parent: at
                }
            },
            where: 'east',
            by: null,
            how: 'told'
        }, {
            seq: 2,
            type: 'arrive',
            at: {
                new: {
                    name: 'Far market',
                    kind: 'site',
                    parent: at
                }
            },
            with: null,
            forced_by: null
        }, {
            seq: 3,
            type: 'person.new',
            ref: 'wrong',
            name: 'Wrong',
            role: 'vendor',
            desc: [],
            present: true,
            band: 'SHORT'
        }]
    };
    const r = await runExtraction(g.chat, id, content, async () => {
        calls++;
        return JSON.stringify(a);
    });
    assert.equal(r.applied, true);
    assert.equal(calls, 2);
    assert.equal(g.state().scene.at, at);
    assert.equal(rec(g.chat[id]).events.filter(e => e.t === 'extract.applied').length, 1);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
    assert.equal((await runExtraction(g.chat, id, content, () => {
        throw Error('duplicate');
    })).changed, false);
});

test('99 original Run22 T73 through the real pending-reply runtime preserves independent reports and commits once',
    async () => {
        const chat = copy(f.chatWait),
            id = 146;
        chat[id].extra = {};
        chat[id].swipe_info = [];
        processReplyAny(chat, id, content);
        let calls = 0;
        const r = await runExtraction(chat, id, content, async () => JSON.stringify(f.wait.answers[Math.min(
            calls++, 1)]));
        assert.equal(r.applied, true);
        assert.equal(calls, 2);
        assert.equal(rec(chat[id]).extraction.status, 'applied');
        assert.equal(foldChat(chat).state.scene.at, f.wait.state.scene.at);
        assert.equal(rec(chat[id]).events.filter(e => e.t === 'extract.applied').length, 1);
        assert.equal(rec(chat[id]).events.filter(e => e.t === 'transaction.completed').length, 0);
        assert.deepEqual(foldChat(JSON.parse(JSON.stringify(chat))).state, foldChat(chat).state);
        const base = copy(chat.slice(0, id));
        const again = copy(chat[id]);
        again.swipe_id = 1;
        again.extra = {};
        again.mes = 'Alaric remains in the hall.';
        base.push(again);
        processReplyAny(base, id, content);
        await runExtraction(base, id, content, async () => JSON.stringify({
            scene: 'here',
            expected: {},
            deltas: []
        }));
        assert.equal(foldChat(base).state.scene.at, f.wait.state.scene.at);
        assert.equal(rec(base[id]).events.filter(e => e.t === 'extract.applied').length, 1);
    });
test('99 a normal explicitly authorized room arrival still succeeds', () => {
    const s = copy(f.wait.state),
        to = {
            new: {
                name: 'Guest room',
                kind: 'interior',
                parent: s.scene.at
            }
        };
    s.last.outcome = {
        c: true,
        auth: {
            c: true,
            gos: [{
                seq: 1,
                to
            }],
            timeCap: 120
        },
        expected_keys: {
            1: 'go'
        }
    };
    const r = applyWorld(s, content, {
        scene: to,
        expected: {
            1: {
                arrived: true,
                at: to,
                with: null
            }
        },
        deltas: [{
            seq: 1,
            type: 'arrive',
            at: to,
            with: null,
            forced_by: null
        }]
    }, {
        msg: 502,
        prose: 'Alaric enters the guest room he chose.'
    });
    assert.notEqual(r.state.scene.at, s.scene.at);
    assert.equal(r.state.places[r.state.scene.at].parent, s.scene.at);
});
test('99 hard malformed deltas do not throw and missing lines never partially buy', () => {
    for (const deltas of [
            [null], {}, 'wrong'
        ]) assert.equal(parse(f.wait.state, {
        scene: 'here',
        expected: {},
        deltas
    }).valid, false);
    const r = command(offerState(), [{
        ...accept,
        lines: ['l3', 'nonexistent']
    }]);
    assert.equal(events(r, 'transaction.completed').length, 0);
});
test('99 rejected travel cannot use an inherited final scene to create local objects', () => {
    const s = copy(f.wait.state),
        a = {
            scene: {
                new: {
                    name: 'Remote workshop',
                    kind: 'site',
                    parent: 'loc.alderwatch'
                }
            },
            expected: {},
            deltas: [{
                seq: 1,
                type: 'arrive',
                at: {
                    new: {
                        name: 'Remote workshop',
                        kind: 'site',
                        parent: 'loc.alderwatch'
                    }
                },
                with: null,
                forced_by: null
            }, {
                seq: 2,
                type: 'object.new',
                name: 'free hammer',
                kind: 'item',
                qty: 1,
                holder: 'pc'
            }]
        };
    const r = world(f.wait, a, s);
    assert.equal(events(r, 'object.created').length, 0);
    assert.equal(r.state.scene.at, s.scene.at);
});
test('99 a new explicit buy limit cancels an old pending consent even when the present offer is too expensive', () => {
    const s = offerState();
    s.decisions = [{
        id: 'old',
        kind: 'purchase',
        what: 'corner room for the night and supper',
        seller: s.offers[accept.offer].seller,
        at: s.scene.at,
        turn: 47,
        max_cp: 6,
        qty: null
    }];
    const r = command(s, [{
        seq: 1,
        type: 'buy',
        what: 'corner room for the night and supper',
        from: s.offers[accept.offer].seller,
        max_cp: 4,
        quote: 'I buy the corner room for the night and supper only if it costs at most four copper.'
    }]);
    assert.equal(events(r, 'transaction.completed').length, 0);
    assert.ok(!r.state.decisions.some(d => d.id === 'old'));
});
test('99 matching merchandise at two sellers needs a party selection', () => {
    const s = offerState(),
        o = s.offers[accept.offer],
        seller = o.seller;
    o.lines = [{
        id: 'l1',
        what: 'rope',
        kind: 'goods',
        qty: 1,
        price_cp: 2
    }];
    s.entities['npc.other'] = {
        id: 'npc.other',
        name: 'Other vendor',
        kind: 'npc',
        status: 'alive'
    };
    s.scene.present.push('npc.other');
    s.offers.other = {
        ...copy(o),
        id: 'other',
        seller: 'npc.other'
    };
    const r = command(s, [{
        seq: 1,
        type: 'buy',
        what: 'rope',
        max_cp: 3,
        quote: 'I buy rope for at most three copper.'
    }]);
    assert.equal(events(r, 'transaction.completed').length, 0);
    assert.equal(r.ctx.resolutions[0].status, 'clarify');
});
test('99 GO also blocks immediate offer acceptance at the departure point', () => {
    const s = offerState();
    const r = command(s, [{
        seq: 1,
        type: 'go',
        to: 'loc.alderwatch',
        quote: 'I go to the square.'
    }, {
        ...accept,
        seq: 2,
        needs: 1
    }]);
    assert.equal(events(r, 'transaction.completed').length, 0);
    assert.equal(r.ctx.resolutions[1].reason, 'arrival pending');
});
test('99 explicit first leg does not advance an expected-only second leg before a gift there', () => {
    const s = offerState(),
        start = s.scene.at,
        mid = 'loc.alderwatch',
        seller = s.offers[accept.offer].seller;
    s.last.outcome = {
        c: true,
        auth: {
            c: true,
            gos: [{
                seq: 1,
                to: mid
            }, {
                seq: 2,
                to: start
            }],
            timeCap: 120
        },
        expected_keys: {
            1: 'go',
            2: 'go'
        }
    };
    const a = {
        scene: start,
        expected: {
            1: {
                arrived: true,
                at: mid,
                with: [seller]
            },
            2: {
                arrived: true,
                at: start,
                with: null
            }
        },
        deltas: [{
            seq: 1,
            type: 'arrive',
            at: mid,
            with: [seller],
            forced_by: null
        }, {
            seq: 2,
            type: 'object.new',
            name: 'brass pin',
            kind: 'item',
            qty: 1,
            holder: seller,
            scene: mid
        }, {
            seq: 3,
            type: 'object.move',
            object: {
                new: 'brass pin'
            },
            to: 'pc',
            scene: mid
        }]
    };
    const r = applyWorld(s, content, a, {
        msg: 503,
        prose: 'The keeper walks to the square with Alaric and gives him a brass pin. Alaric then returns to the Guild hall.'
    });
    assert.equal(r.state.scene.at, start);
    assert.ok(Object.values(r.state.objects).some(o => o.name === 'brass pin' && o.holder.entity === 'pc'));
});

// .99 independent review: an explicit deictic "here" is not a temporal anchor for an Expected-only journey.
function expectedOnlyPerson(scene, arrived = true) {
    const s = copy(f.wait.state);
    const from = s.scene.at,
        to = 'loc.alderwatch';
    s.last.outcome = {
        c: true,
        auth: {
            c: true,
            gos: [{
                seq: 1,
                to
            }],
            timeCap: 120
        },
        expected_keys: {
            1: 'go'
        }
    };
    const answer = {
        scene: arrived ? to : from,
        expected: {
            1: {
                arrived,
                at: arrived ? to : null,
                with: null
            }
        },
        deltas: [{
            seq: 1,
            type: 'person.new',
            ref: 'arrival_witness',
            name: 'Nessa',
            role: 'porter',
            desc: ['a porter by the gate'],
            present: true,
            scene,
            band: 'SHORT'
        }, ]
    };
    return {
        s,
        from,
        to,
        answer
    };
}
test('99 review: ambiguous here in an Expected-only arrival never establishes the destination NPC at departure', () => {
    const {
        s,
        from,
        to,
        answer
    } = expectedOnlyPerson('here');
    const p = parse(s, answer);
    assert.equal(p.valid, true, p.errors.join('; '));
    const r = applyWorld(s, content, p.value, {
        msg: 504,
        prose: 'Alaric reaches the square. Only there does he meet Nessa the porter.'
    });
    assert.equal(r.state.scene.at, to);
    assert.equal(events(r, 'entity.created').length, 0,
        'unclear timing is locally rejected, never guessed at A or B');
    assert.ok(r.rejected.some(x => x.type === 'person.new' && x.rule === 'scene_context'));
    assert.ok(p.issues.some(x => x.seq === 1));
    const replay = copy(s);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
    assert.notEqual(from, to);
});
test('99 review: an explicit destination scene places the Expected-only NPC at the destination', () => {
    const {
        s,
        to,
        answer
    } = expectedOnlyPerson('loc.alderwatch');
    const r = applyWorld(s, content, answer, {
        msg: 504,
        prose: 'Alaric reaches the square and meets Nessa there.'
    });
    const created = events(r, 'entity.created');
    assert.equal(created.length, 1);
    const npc = r.state.entities[created[0].d.entity.id];
    assert.equal(r.state.scene.at, to);
    assert.equal(npc.location, to);
    assert.ok(r.state.scene.present.includes(npc.id));
});
test('99 review: explicit departure scene preserves an earlier NPC before the Expected-only arrival', () => {
    const {
        s,
        from,
        to,
        answer
    } = expectedOnlyPerson(f.wait.state.scene.at);
    const r = applyWorld(s, content, answer, {
        msg: 504,
        prose: 'Nessa speaks to him in the hall. He then goes to the square.'
    });
    const created = events(r, 'entity.created');
    assert.equal(created.length, 1);
    assert.equal(r.state.entities[created[0].d.entity.id].at, from);
    assert.equal(r.state.scene.at, to);
    assert.ok(!r.state.scene.present.includes(created[0].d.entity.id));
});
test('99 review: here remains valid for spontaneous local arrivals when the journey did not arrive', () => {
    const {
        s,
        from,
        answer
    } = expectedOnlyPerson('here', false);
    const r = applyWorld(s, content, answer, {
        msg: 504,
        prose: 'Alaric remains in the hall. Nessa walks in to speak to him.'
    });
    assert.equal(r.state.scene.at, from);
    assert.equal(events(r, 'entity.created').length, 1);
});
test('99 review: one runtime repair resolves here to B without first committing the NPC at A', async () => {
    const g = await campaign(content);
    const from = g.state().scene.at;
    await say(g, 'I go to the receiving house.', {
        type: 'go',
        to: {
            new: 'the receiving house'
        }
    });
    const to = {
        new: {
            name: 'Receiving house',
            kind: 'site',
            parent: from
        }
    };
    const id = g.chat.push({
        mes: 'Alaric reaches the receiving house and meets Nessa there.',
        is_user: false,
        extra: {}
    }) - 1;
    processReplyAny(g.chat, id, content);
    let calls = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        const scene = calls++ === 0 ? 'here' : copy(to);
        return JSON.stringify({
            scene: to,
            expected: {
                1: {
                    arrived: true,
                    at: to,
                    with: null
                }
            },
            deltas: [{
                seq: 1,
                type: 'person.new',
                ref: 'arrival_witness',
                name: 'Nessa',
                role: 'porter',
                desc: [],
                present: true,
                scene,
                band: 'SHORT'
            }, ]
        });
    });
    assert.equal(result.applied, true);
    assert.equal(calls, 2);
    const state = g.state(),
        created = rec(g.chat[id]).events.filter(e => e.t === 'entity.created');
    assert.equal(created.length, 1);
    assert.notEqual(state.scene.at, from);
    assert.equal(state.places[state.scene.at].name, 'Receiving house');
    assert.ok(state.scene.present.includes(created[0].d.entity.id));
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, state);
});
