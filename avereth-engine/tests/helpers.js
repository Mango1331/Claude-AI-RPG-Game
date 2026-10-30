// Test helpers: load the content pack and schemas from disk, a small game harness that plays turns the way the
// SillyTavern extension does (player message -> engine; narrator reply -> fact report), and scripted dice.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadContentPack } from '../src/content.js';
import { startCampaign, playerTurn, narratorReply, turnContext } from '../src/engine.js';
import { fold } from '../src/state.js';
import { validateState } from '../src/validate.js';
import { assertOwnership } from '../src/v4/world.js';

// Gen 3.5 Decision Ownership (docs/ARCHITECTURE_GEN35.md §2.2): in every test, each event an extractor delta writes must
// be a kind its type may write (src/v4/ownership.js DELTA_WRITES); a violation fails the test that caused it
assertOwnership(true);

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(HERE);

let cached = null;
let product = null;
const contentFile = async (name) => JSON.parse(await readFile(path.join(ROOT, 'content', name), 'utf8'));
/**
 * The content the tests play with: the product content plus the realms and cities of the world before Lorebook v0.14
 * (tests/legacy_world.json), where the recorded runs these tests replay were played. Test data only. Patch 9A: a campaign
 * these tests start plays by the legacy rules (ruleset 1: the five classes, the legacy NPC templates) the runs they
 * replay were played by; the product content (loadProductContent) and tests that pass ruleset 2 start new campaigns.
 */
export async function loadContent() {
    if (!cached) {
        const legacy = await readJson('tests/legacy_world.json');
        cached = await loadContentPack(async (name) => {
            const json = await contentFile(name);
            // Historical runs keep their recorded five-point start; live-start tests use loadProductContent.
            if (name === 'campaign_start.json') return { ...json, ruleset: 1, pc: { ...json.pc, stats: { STR: 5, VIT: 5, AGI: 5, INT: 5, PER: 5, WIL: 5 } } };
            return name === 'lore.json' ? { ...json, locations: [...json.locations, ...legacy.locations], factions: [...json.factions, ...legacy.factions] } : json;
        });
    }
    return cached;
}

/** The content exactly as the extension loads it. */
export async function loadProductContent() {
    if (!product) product = await loadContentPack(contentFile);
    return product;
}

export async function readJson(rel) {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

/** XP already spent on level thresholds plus the sheet's current carryover (test assertions across balance changes). */
export const cumulativeXp = (sheet, content) => sheet.xp + (sheet.level * (sheet.level - 1) / 2) * content.rules.progression.xp_to_next_per_level;

export const FIRST_MESSAGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Tidecross, Solmere`';

/** Plays a campaign turn by turn; every step is checked against the state invariants. */
export class Game {
    constructor(content, { seed = 7, firstMessage = FIRST_MESSAGE, ruleset } = {}) {
        this.content = content;
        this.log = startCampaign(content, { seed, firstMessage, ...(ruleset ? { ruleset } : {}) });
        // loadContent deliberately models campaigns from before the policy change.
        if (content.start.ruleset === 1) delete this.log[0].d.private_quests;
        this.state = fold(this.log);
        this.lastInput = '';
        this.lastReply = '';
        this.corrections = [];
    }

    check() {
        const problems = validateState(this.state, this.content);
        if (problems.length) throw new Error(`invariants violated: ${problems.join('; ')}`);
    }

    input(text) {
        const r = playerTurn(this.state, this.content, text, { msg: this.log.length });
        this.log.push(...r.events);
        this.state = r.state;
        this.lastInput = text;
        this.check();
        return r;
    }

    reply(report = {}, prose = 'The narration continues.') {
        const text = typeof report === 'string' ? report : `${prose}\n<avereth>${JSON.stringify(report)}</avereth>`;
        const r = narratorReply(this.state, this.content, text, { msg: this.log.length });
        this.log.push(...r.events);
        this.state = r.state;
        this.lastReply = r.clean;
        this.corrections = r.corrections;
        this.check();
        return r;
    }

    turn(text, report = {}, prose) {
        const p = this.input(text);
        const n = this.reply(report, prose);
        return { p, n };
    }

    context(opts = {}) {
        return turnContext(this.state, this.content, { input: this.lastInput, lastReply: this.lastReply, corrections: this.corrections, ...opts });
    }

    ranger(skills = 'Aimed Shot + Power Shot') {
        this.turn('Ranger');
        this.turn(skills);
        return this;
    }

    /** Refold from the raw event log (proves the log alone reproduces the state). */
    refold() {
        return fold(this.log);
    }
}

/** Dice stand-in that returns scripted values (for golden tests of Core examples). */
export function scriptedDice({ d100 = [], variance = [], int = [], pick = [] } = {}) {
    const q = { d100: [...d100], variance: [...variance], int: [...int], pick: [...pick] };
    return {
        n: 0,
        log: [],
        d100(label) { this.n += 1; const v = q.d100.length ? q.d100.shift() : 50; this.log.push({ kind: 'd100', label, value: v }); return v; },
        variance(label) { this.n += 1; const v = q.variance.length ? q.variance.shift() : 1; this.log.push({ kind: 'variance', label, value: v }); return v; },
        int(lo, hi, label) { this.n += 1; const v = q.int.length ? q.int.shift() : lo; this.log.push({ kind: 'int', label, value: v }); return v; },
        pick(list, label) { this.n += 1; const v = q.pick.length ? q.pick.shift() : list[0]; this.log.push({ kind: 'pick', label, value: v }); return list.includes(v) ? v : list[0]; },
    };
}
