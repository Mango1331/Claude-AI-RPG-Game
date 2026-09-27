// Runtime V4, P0 / S0: the ten structured-output test cases. Each one is a small version of a real V4 call
// (interpreter, recovery extractor, board generator) on a turn of the live run 27.09. 07:10, with a strict schema, a
// semantic check and a gold answer (the gold answer feeds the mock backend and the offline test).
import { O, S, B, I, E, A, N, REF } from './lib/schema.mjs';

// ------------------------------------------------------------------------------------------------ interpreter
const INTERPRETER = `You are the command interpreter of a text RPG engine. Translate the PLAYER MESSAGE into engine commands for Alaric, the player character. You decide no outcomes; the engine does.

Rules:
- Only what Alaric himself does or commits to in this message (also when he tells it in the past tense).
- No command for questions, thoughts, wishes, hypotheticals, plans for later, memories of earlier turns, negations, or what other people do.
- Keep the order of the message: seq 1, 2, 3 …
- Refer to known things by their id from the CATALOG; for anything else use {"new": "<short name>"}.
- quote: the exact words of the message the command rests on.
- Talking, asking and looking need no command.

Commands:
- go {to}: Alaric sets off to a place.
- quest.accept {quest}: he takes on a contract or job.
- quest.turn_in {quest}: he hands in a Guild contract.
- pay {to, amount_cp}: he pays someone; amount_cp only if the message or an open offer names it, else null.
- buy {what, from, max_cp, any_price}: he buys goods or a service; max_cp when he sets a price limit (in copper; 1 silver = 10 copper), any_price true when he accepts any price.
- take {object}: he picks something up or takes it along.
- activity {kind, what, until}: he spends time on something (kind: rest, sleep, wait, work, gather, search, train; until: noon, evening, end_of_day, night, dawn, morning, or null).

Answer with {"commands": [...]}; an empty list when the message contains no such action.`;

const ACTIVITY_KINDS = ['rest', 'sleep', 'wait', 'work', 'gather', 'search', 'train'];
const UNTIL = ['noon', 'evening', 'end_of_day', 'night', 'dawn', 'morning'];

/** Interpreter schema: a discriminated list of commands; reference enums from the catalog. */
function interpreterSchema({ places = [], quests = [], people = [], objects = [] }) {
    const seq = I(1);
    const quote = S();
    return O({
        commands: A({
            anyOf: [
                O({ seq, type: E(['go']), to: REF(places), quote }),
                O({ seq, type: E(['quest.accept']), quest: REF(quests), quote }),
                O({ seq, type: E(['quest.turn_in']), quest: REF(quests), quote }),
                O({ seq, type: E(['pay']), to: REF(people), amount_cp: N(I(0)), quote }),
                O({ seq, type: E(['buy']), what: S(), from: N(REF(people)), max_cp: N(I(0)), any_price: B(), quote }),
                O({ seq, type: E(['take']), object: REF(objects), quote }),
                O({ seq, type: E(['activity']), kind: E(ACTIVITY_KINDS), what: N(S()), until: N(E(UNTIL)), quote }),
            ],
        }),
    });
}

const cmds = (v) => (Array.isArray(v?.commands) ? v.commands : []);
const bySeq = (list) => [...list].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

// ------------------------------------------------------------------------------------------------ extractor
const EXTRACTOR = `You read one reply of a text RPG narrator and report, as typed deltas in story order, what the reply established in the world. Alaric is the player character.

Rules:
- Alaric's own decisions are listed under PLAYER ACTIONS and already booked by the engine; never report them as deltas.
- If the reply has Alaric do something PLAYER ACTIONS does not list (pay, buy, accept, take, travel), report it only as overreach.
- Answer every key of "expected"; each key asks about the PLAYER ACTION with the same number.
- Known places by their id; a new place as {"new": {"name": …, "parent": <place id or null>}}.
- Prices are integers in copper (1 silver = 10 copper).
- Report only what the reply states; invent nothing.

Deltas:
- time {minutes}: story time that passed in this reply.
- arrive {at}: Alaric arrives somewhere.
- person.new {ref, name, role, present}: a person the reply introduces; name only if it is a proper name, else null; present: is the person in the scene with Alaric now?
- fact {s, p, o}: a lasting fact about the world.
- object.new {name, kind, qty, unit, holder}: a physical thing that now exists (holder: a place id or a person ref).
- offer {seller, lines}: someone names prices for goods or services; lines: {what, kind, qty, price_cp}.
- overreach {kind, what}: the reply had Alaric decide something he had not decided.

Answer with {"expected": {...}, "deltas": [...]}.`;

function extractorSchema(places, expectedKeys) {
    const seq = I(1);
    const place = REF(places, O({ name: S(), parent: N(E(places)) }));
    const expected = {};
    for (const k of expectedKeys) expected[k] = O({ arrived: B(), at: N(place) });
    return O({
        expected: O(expected),
        deltas: A({
            anyOf: [
                O({ seq, type: E(['time']), minutes: I(0) }),
                O({ seq, type: E(['arrive']), at: place }),
                O({ seq, type: E(['person.new']), ref: S(), name: N(S()), role: S(), present: B() }),
                O({ seq, type: E(['fact']), s: S(), p: S(), o: S() }),
                O({ seq, type: E(['object.new']), name: S(), kind: E(['resource', 'item', 'document', 'trophy']), qty: I(0), unit: N(S()), holder: S() }),
                O({ seq, type: E(['offer']), seller: S(), lines: A(O({ what: S(), kind: E(['goods', 'service']), qty: I(1), price_cp: I(0) }), 1) }),
                O({ seq, type: E(['overreach']), kind: E(['payment', 'purchase', 'travel', 'accept', 'take', 'guild_listing', 'other']), what: S() }),
            ],
        }),
    });
}

const deltas = (v) => (Array.isArray(v?.deltas) ? v.deltas : []);
const atName = (at) => (typeof at === 'string' ? at : at?.new?.name ?? at?.new ?? '');

// ------------------------------------------------------------------------------------------------ board generator
const BOARD = `You write new official contracts for a notice board of the Adventurers' Guild in the text RPG world Avereth. The engine books them before anyone reads the board; the narrator will describe exactly these.

Rules:
- rank "Novice"; level 1–14; qtype minor, standard, dangerous or major.
- payout_cp: the Guild's payout in copper, an integer (1 silver = 10 copper). Novice work usually pays 20–200 copper.
- 1–4 objectives; verbs: GO, FIND, TALK, GET, GATHER, GIVE, DELIVER, USE, REPAIR, DEFEND, ESCORT, ATTACK, DEFEAT.
- At least one proof: an object the Guild checks (kind object) or a mark on a document (kind mark).
- Local, plausible work for the place; no world-changing events.

Answer with {"listings": [...]}.`;

const BOARD_SCHEMA = O({
    listings: A(O({
        title: S(),
        client: S(),
        rank: E(['Novice']),
        level: I(1, 14),
        qtype: E(['minor', 'standard', 'dangerous', 'major']),
        payout_cp: I(0),
        summary: S(),
        objectives: A(O({ verb: E(['GO', 'FIND', 'TALK', 'GET', 'GATHER', 'GIVE', 'DELIVER', 'USE', 'REPAIR', 'DEFEND', 'ESCORT', 'ATTACK', 'DEFEAT']), what: S(), qty: N(I(1)), unit: N(S()), where: N(S()) }), 1),
        proof: A(O({ kind: E(['object', 'mark']), what: S(), qty: N(I(1)), unit: N(S()) }), 1),
    }), 1),
});

// ------------------------------------------------------------------------------------------------ texts from the run
const REPLY_12 = `The clerk takes the slip, checks the nail it came from against her rack, and writes his name into a ledger beside it.

"Miller's Run. Cart leaves from the miller's yard — Grainmarket Row, the big yard behind Harrow's mill — tomorrow at first light. You'll be walking beside the carter, Ossler, and one other Novice took the second escort slot last evening, so you won't be alone if anything four-legged takes an interest in the flour." She stamps the slip. "Waystation master signs your plate at delivery. Bring it back here for payout — eight silver."

She slides the stamped slip across the counter. "Anything above F shows up on that road now and then, so keep your eyes open, but it's been quiet all season." Her attention is already moving to the next person in line, a farmhand with a basket of complaints.

Behind him, the mud-booted adventurer is still at the counter, unrolling the weasel pelt question backward — no, bargaining over where to buy a snare. The hearth pops. Rain has started outside, fine and hissing against the shutters.

The morning is his: Grainmarket Row to find the miller's yard, the rest of the board, or whatever else Redmarch holds until first light tomorrow.`;

const REPLY_14 = `"Herb Run as well." The clerk logs the second slip without ceremony. "Full basket, mind — a handful of sprigs won't pass. Reedbeds start past the mill leat, east side; follow the drainage path and you'll hear the marsh before you see it. Bring the basket back for weighing."

The walk out takes the better part of an hour. Grainmarket Row gives way to cart tracks, then to a raised drainage path of packed earth running beside the leat, where the millrace's spill churns pale and cold. The rain has thinned to mist. Reed hisses in the wind off the water, and the smell changes — mud, cut grass, something green and rotting underneath.

The beds open out where the leat slackens: black water veined with reeds, hummocks of tussock grass, thin sheets of standing water that reflect the grey sky. Marshmint shows itself easily enough once he knows to look — low stems with squared corners and dark leaves, growing in clumps at the waterline, some reachable from the path, others out on the hummocks where the footing will be mud to the shin. A heretofore unnoticed detail: something has beaten a flat trail through the reeds out toward open water, wide as a badger, the stems bent rather than cut.

A wading bird startles somewhere out in the beds and flaps away. Otherwise, only wind and water.

The basket problem is immediate — he carries none. The clumps nearest the path can be picked and carried in an armful, but a full basket will want a container from town or a good deal of trips.`;

const REPLY_20_INN = `The evening streets are filling up. Lamplighters work down the row with long poles; a smith's apprentice drags a barrow of scrap; somewhere fiddles tune up through a shuttered window. He walks a few streets, reading signs — the Gilded Sow, too fine, a doorman in livery; the Anchor and Cleaver, loud with caravan crews — until he finds the Marsh Bell on a lane behind the cooper's yard: a low timbered building with a reed-thatched sign, warm light in the windows, and a smell of onions and boiled mutton that argues well for the kitchen.

Inside, the common room is half full — two carter families eating early, an old man asleep by the fire with a mug still in his hand. The innkeeper, a broad woman with flour on her forearms and a voice that carries without rising, looks him over: mud to the knee, hair matted, a sword at his hip.

"Room's four copper, hot bath two more, and I'll take the muddy clothes tonight and have them dry by morning — another copper for the wash." She jerks her chin at the state of him. "Reedbeds, by the look. You Guild lads always come back the same color. Kitchen's open till the bell; stew's two."

The room upstairs, when he gets to it after the bath, is small and clean — a straw pallet, a washstand, a hook for the sword, a candle stub. Through the wall, the old man's snore. His clothes hang drying by the kitchen fire below, and the pallet takes him like a debt paid.`;

// ------------------------------------------------------------------------------------------------ the cases
const HALL = 'loc.redmarch.guild_hall';
const HERB = 'quest.herb_run_marshmint';

export const CASES = [
    {
        id: 'mode_question',
        role: 'interpreter',
        system: 'You classify one message of the player of a text RPG. mode: action = Alaric does or commits to something now (also told in the past tense); question = he asks something; thought = musing, wish, plan or hypothetical, nothing done; memory = he recalls something earlier; negation = he explicitly does not do something; other = none of these. speech_only: true when he only speaks. Answer with {"mode": …, "speech_only": …}.',
        user: 'PLAYER MESSAGE:\n"Could I take the escort job too, or is that above my rank?" *i ask the clerk*',
        schema: O({ mode: E(['action', 'question', 'thought', 'memory', 'negation', 'other']), speech_only: B() }),
        check: (v) => (v?.mode === 'question' ? { ok: true } : { ok: false, note: `mode ${v?.mode}` }),
        gold: { mode: 'question', speech_only: true },
    },
    {
        id: 'interp_go_guild',
        role: 'interpreter',
        system: INTERPRETER,
        user: `CATALOG
HERE: public roadside verge outside Redmarch (loc.redmarch.west_verge), Veyrhold. Present: nobody.
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall, Redmarch)
QUESTS: none
OBJECTS: obj.pouch (small pouch with 5 silver, held by Alaric)

PLAYER MESSAGE:
*i walk into the city ahead of me and go to the adventurer guild and enter the guild building*`,
        schema: interpreterSchema({ places: ['loc.redmarch.west_verge', 'loc.redmarch', HALL], objects: ['obj.pouch'] }),
        check: (v) => {
            const list = bySeq(cmds(v));
            const other = list.filter((c) => c.type !== 'go');
            const last = list.filter((c) => c.type === 'go').pop();
            if (other.length) return { ok: false, note: `unexpected ${other.map((c) => c.type).join(', ')}` };
            return last?.to === HALL ? { ok: true } : { ok: false, note: `go to ${JSON.stringify(last?.to ?? null)}` };
        },
        gold: { commands: [{ seq: 1, type: 'go', to: HALL, quote: 'go to the adventurer guild and enter the guild building' }] },
    },
    {
        id: 'interp_turnin_then_inn',
        role: 'interpreter',
        system: INTERPRETER,
        user: `CATALOG
HERE: Redmarch › Adventurers' Guild hall (${HALL}). Present: npc.guild_clerk (Guild clerk).
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall)
QUESTS: ${HERB} (Herb Run — Marshmint, Guild contract, active; proof: 1 basket of marshmint)
OBJECTS: obj.marshmint (marshmint, 1 basket, held by Alaric)

PLAYER MESSAGE:
*i turn the Quest in at the front desk and then i go walk around the City looking for an Inn to sleep and wash my clothes and myself*`,
        schema: interpreterSchema({ places: ['loc.redmarch', HALL], quests: [HERB], people: ['npc.guild_clerk'], objects: ['obj.marshmint'] }),
        check: (v) => {
            const list = bySeq(cmds(v));
            const types = list.map((c) => c.type);
            if (types.includes('pay') || types.includes('buy')) return { ok: false, note: `booked a purchase: ${types.join(', ')}` };
            const t = list.findIndex((c) => c.type === 'quest.turn_in' && c.quest === HERB);
            const g = list.findIndex((c) => c.type === 'go');
            return t >= 0 && g > t ? { ok: true } : { ok: false, note: `order ${types.join(', ')}` };
        },
        gold: { commands: [
            { seq: 1, type: 'quest.turn_in', quest: HERB, quote: 'i turn the Quest in at the front desk' },
            { seq: 2, type: 'go', to: { new: 'an inn in Redmarch' }, quote: 'i go walk around the City looking for an Inn' },
        ] },
    },
    {
        id: 'interp_negative_thought',
        role: 'interpreter',
        system: INTERPRETER,
        user: `CATALOG
HERE: Redmarch › Adventurers' Guild hall (${HALL}). Present: npc.guild_clerk (Guild clerk).
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall)
QUESTS: board listings: quest.millers_run_escort (Miller's Run Escort, Novice, 80 cp) · ${HERB} (Herb Run — Marshmint, Novice, 40 cp)
OFFERS: offer.registration (Guild clerk: registration fee 20 cp)
OPEN DECISIONS: the registration fee (20 cp) waits for Alaric's consent

PLAYER MESSAGE:
*maybe i should register first... i wonder what they would say if i just took a contract without it. i look over at the board from the doorway*`,
        schema: interpreterSchema({ places: ['loc.redmarch', HALL], quests: ['quest.millers_run_escort', HERB], people: ['npc.guild_clerk'] }),
        check: (v) => (cmds(v).length === 0 ? { ok: true } : { ok: false, note: `commands ${cmds(v).map((c) => c.type).join(', ')}` }),
        gold: { commands: [] },
    },
    {
        id: 'interp_price_limit',
        role: 'interpreter',
        system: INTERPRETER,
        user: `CATALOG
HERE: Redmarch › lane behind the cooper's yard › Marsh Bell, common room (loc.redmarch.marsh_bell). Present: npc.innkeeper (innkeeper).
PLACES: loc.redmarch (Redmarch, city) · loc.redmarch.marsh_bell (Marsh Bell, inn)
OFFERS: none
OBJECTS: obj.pouch (coin pouch, 7 silver 3 copper, held by Alaric)

PLAYER MESSAGE:
I'll take a room for the night if it's under 5 copper *i say to the innkeeper*`,
        schema: interpreterSchema({ places: ['loc.redmarch', 'loc.redmarch.marsh_bell'], people: ['npc.innkeeper'], objects: ['obj.pouch'] }),
        check: (v) => {
            const list = cmds(v);
            if (list.some((c) => c.type === 'pay')) return { ok: false, note: 'booked a payment' };
            const b = list.find((c) => c.type === 'buy');
            if (!b) return { ok: false, note: `no buy (${list.map((c) => c.type).join(', ') || 'empty'})` };
            return [4, 5].includes(b.max_cp) && b.any_price === false ? { ok: true } : { ok: false, note: `max_cp ${b.max_cp}, any_price ${b.any_price}` };
        },
        gold: { commands: [{ seq: 1, type: 'buy', what: 'a room for the night', from: 'npc.innkeeper', max_cp: 4, any_price: false, quote: "I'll take a room for the night if it's under 5 copper" }] },
    },
    {
        id: 'interp_gather_day',
        role: 'interpreter',
        system: INTERPRETER,
        user: `CATALOG
HERE: Redmarch › eastern mill leat › reedbeds (loc.redmarch.reedbeds). Present: nobody. Time: day 1, 10:40.
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall) · loc.redmarch.reedbeds (reedbeds east of the mill leat)
QUESTS: ${HERB} (Herb Run — Marshmint, Guild contract, active; gather 1 basket of marshmint here)
OBJECTS: none that Alaric holds besides his gear

PLAYER MESSAGE:
*since i have the whole day i start carrying armfulls down the path*`,
        schema: interpreterSchema({ places: ['loc.redmarch', HALL, 'loc.redmarch.reedbeds'], quests: [HERB] }),
        check: (v) => {
            const a = cmds(v).find((c) => c.type === 'activity');
            return a && ['gather', 'work'].includes(a.kind) ? { ok: true } : { ok: false, note: `activity ${JSON.stringify(a ?? null)}` };
        },
        gold: { commands: [{ seq: 1, type: 'activity', kind: 'gather', what: 'marshmint', until: 'end_of_day', quote: 'since i have the whole day i start carrying armfulls down the path' }] },
    },
    {
        id: 'extract_arrival',
        role: 'extractor',
        system: EXTRACTOR,
        user: `CATALOG
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall)

PLAYER ACTIONS (already booked):
1. ACCEPTS — "Herb Run — Marshmint" at the Guild desk (resolved).
2. GOES — to the reedbeds east of the mill leat (authorized; report whether he arrives and where).

EXPECTED KEYS: "2"

REPLY:
${REPLY_14}`,
        schema: extractorSchema(['loc.redmarch', HALL], ['2']),
        check: (v) => {
            const e = v?.expected?.['2'];
            if (!e || e.arrived !== true) return { ok: false, note: `expected 2 = ${JSON.stringify(e ?? null)}` };
            return /reed|marsh|leat/i.test(atName(e.at)) ? { ok: true } : { ok: false, note: `at ${JSON.stringify(e.at)}` };
        },
        gold: {
            expected: { 2: { arrived: true, at: { new: { name: 'reedbeds east of the mill leat', parent: 'loc.redmarch' } } } },
            deltas: [
                { seq: 1, type: 'time', minutes: 60 },
                { seq: 2, type: 'arrive', at: { new: { name: 'reedbeds east of the mill leat', parent: 'loc.redmarch' } } },
                { seq: 3, type: 'fact', s: 'reedbeds', p: 'has', o: 'a badger-wide trail beaten through the reeds toward open water' },
            ],
        },
    },
    {
        id: 'extract_absent_person',
        role: 'extractor',
        system: EXTRACTOR,
        user: `CATALOG
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall; Alaric is here)

PLAYER ACTIONS (already booked):
1. ACCEPTS — "Miller's Run Escort" at the Guild desk (resolved).

EXPECTED KEYS: none

REPLY:
${REPLY_12}`,
        schema: extractorSchema(['loc.redmarch', HALL], []),
        check: (v) => {
            const os = deltas(v).filter((d) => d.type === 'person.new' && /ossler/i.test(`${d.name ?? ''} ${d.ref ?? ''}`));
            if (!os.length) return { ok: false, note: 'Ossler not introduced' };
            return os.every((d) => d.present === false) ? { ok: true } : { ok: false, note: 'Ossler marked present' };
        },
        gold: {
            expected: {},
            deltas: [
                { seq: 1, type: 'time', minutes: 10 },
                { seq: 2, type: 'person.new', ref: 'ossler', name: 'Ossler', role: "carter of Harrow's mill", present: false },
                { seq: 3, type: 'fact', s: "Miller's Run cart", p: 'leaves', o: "Harrow's mill yard, Grainmarket Row, tomorrow at first light" },
            ],
        },
    },
    {
        id: 'extract_offer_overreach',
        role: 'extractor',
        system: EXTRACTOR,
        user: `CATALOG
PLACES: loc.redmarch (Redmarch, city) · ${HALL} (Adventurers' Guild hall; Alaric starts here)

PLAYER ACTIONS (already booked):
1. GOES — through Redmarch, looking for an inn (authorized; report whether he arrives and where).
OPEN DECISION — Alaric wants a room, a bath and laundry; no price is known and he has not agreed to pay anything.

EXPECTED KEYS: "1"

REPLY:
${REPLY_20_INN}`,
        schema: extractorSchema(['loc.redmarch', HALL], ['1']),
        check: (v) => {
            const e = v?.expected?.['1'];
            const offer = deltas(v).find((d) => d.type === 'offer');
            const prices = (offer?.lines || []).map((l) => l.price_cp);
            const over = deltas(v).some((d) => d.type === 'overreach');
            const problems = [];
            if (!e || e.arrived !== true || !/marsh bell/i.test(atName(e.at))) problems.push(`expected 1 = ${JSON.stringify(e ?? null)}`);
            if (![4, 2, 1].every((p) => prices.includes(p))) problems.push(`offer prices ${JSON.stringify(prices)}`);
            if (!over) problems.push('no overreach');
            return problems.length ? { ok: false, note: problems.join('; ') } : { ok: true };
        },
        gold: {
            expected: { 1: { arrived: true, at: { new: { name: 'Marsh Bell', parent: 'loc.redmarch' } } } },
            deltas: [
                { seq: 1, type: 'time', minutes: 45 },
                { seq: 2, type: 'arrive', at: { new: { name: 'Marsh Bell', parent: 'loc.redmarch' } } },
                { seq: 3, type: 'person.new', ref: 'innkeeper', name: null, role: 'innkeeper of the Marsh Bell', present: true },
                { seq: 4, type: 'offer', seller: 'innkeeper', lines: [
                    { what: 'room for the night', kind: 'service', qty: 1, price_cp: 4 },
                    { what: 'hot bath', kind: 'service', qty: 1, price_cp: 2 },
                    { what: 'laundry', kind: 'service', qty: 1, price_cp: 1 },
                    { what: 'stew', kind: 'goods', qty: 1, price_cp: 2 },
                ] },
                { seq: 5, type: 'overreach', kind: 'purchase', what: 'the reply has Alaric take the room and the bath although he had not agreed to a price' },
            ],
        },
    },
    {
        id: 'board_two_listings',
        role: 'board',
        system: BOARD,
        user: `BOARD: Adventurers' Guild hall, Redmarch (a border town in Veyrhold). Rank band: Novice (Power Rank F, level 1–14).
ALREADY ON THE BOARD (do not repeat or vary them): Miller's Run Escort · Herb Run — Marshmint · Weasel Sign at Fenwick's Coop
WRITE: exactly 2 new listings.`,
        schema: BOARD_SCHEMA,
        check: (v) => {
            const l = Array.isArray(v?.listings) ? v.listings : [];
            const known = ["miller's run escort", 'herb run — marshmint', "weasel sign at fenwick's coop"];
            const problems = [];
            if (l.length !== 2) problems.push(`${l.length} listings`);
            for (const x of l) {
                if (!(Number.isInteger(x.level) && x.level >= 1 && x.level <= 14)) problems.push(`level ${x.level}`);
                if (!(Number.isInteger(x.payout_cp) && x.payout_cp >= 0)) problems.push(`payout ${x.payout_cp}`);
                if (!(x.objectives?.length >= 1 && x.objectives.length <= 4)) problems.push(`${x.objectives?.length} objectives`);
                if (!(x.proof?.length >= 1)) problems.push('no proof');
                if (known.includes(String(x.title).toLowerCase())) problems.push(`repeats ${x.title}`);
            }
            return problems.length ? { ok: false, note: problems.join('; ') } : { ok: true };
        },
        gold: { listings: [
            { title: 'Cellar Rats at the Tannery', client: 'Tanner Holt', rank: 'Novice', level: 2, qtype: 'minor', payout_cp: 30, summary: 'Clear the rats from the tannery cellars.',
                objectives: [{ verb: 'DEFEAT', what: 'cellar rats', qty: null, unit: null, where: 'tannery cellars, Tanner\'s Row' }],
                proof: [{ kind: 'object', what: 'rat tails', qty: 6, unit: null }] },
            { title: 'Letters to the South Waystation', client: 'Redmarch postmaster', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 25, summary: 'Carry a sealed satchel of letters to the south-road waystation.',
                objectives: [{ verb: 'DELIVER', what: 'sealed letter satchel', qty: 1, unit: null, where: 'south-road waystation' }],
                proof: [{ kind: 'mark', what: "waystation master's seal on the Guild slip", qty: null, unit: null }] },
        ] },
    },
];

export const CASE_IDS = CASES.map((c) => c.id);

/** The mock backend for S0: gold answers by case, plus the preflight probes. */
export function s0MockResponder({ invalidFirst = [], failModes = [] } = {}) {
    const byUser = new Map(CASES.map((c) => [c.user, c]));
    const seen = new Set();
    return async (req) => {
        if (req.jsonSchema && failModes.includes('json_schema')) return { error: 'Bad Request', status: 'provider_error' };
        if (req.reasoning !== undefined && failModes.includes('reasoning')) return { error: 'Bad Request', status: 'provider_error' };
        const userMsgs = req.messages.filter((m) => m.role === 'user');
        const firstUser = userMsgs[0]?.content ?? '';
        const c = byUser.get(firstUser);
        if (!c) return { content: '{"ok": true}' };
        const repair = userMsgs.length > 1;
        const key = `${c.id}|${req.jsonSchema ? 's' : 'p'}|${req.reasoning ?? 'k'}`;
        if (!repair && invalidFirst.includes(c.id) && !seen.has(key)) {
            seen.add(key);
            return { content: 'Sure! Here is the answer: {"commands": [ {"seq": "one"} ' };
        }
        return { content: JSON.stringify(c.gold) };
    };
}
