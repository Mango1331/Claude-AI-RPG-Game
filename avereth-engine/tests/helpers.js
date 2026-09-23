// Test helpers: load the content pack and schemas from disk, a small game harness that plays turns the way the
// SillyTavern extension does (player message -> engine; narrator reply -> fact report), and scripted dice.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadContentPack } from '../src/content.js';
import { startCampaign, playerTurn, narratorReply, turnContext } from '../src/engine.js';
import { fold } from '../src/state.js';
import { validateState } from '../src/validate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(HERE);

let cached = null;
export async function loadContent() {
    if (!cached) {
        cached = await loadContentPack(async (name) => JSON.parse(await readFile(path.join(ROOT, 'content', name), 'utf8')));
    }
    return cached;
}

export async function readJson(rel) {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

export const FIRST_MESSAGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Tidecross, Solmere`';

/** Plays a campaign turn by turn; every step is checked against the state invariants. */
export class Game {
    constructor(content, { seed = 7, firstMessage = FIRST_MESSAGE } = {}) {
        this.content = content;
        this.log = startCampaign(content, { seed, firstMessage });
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
