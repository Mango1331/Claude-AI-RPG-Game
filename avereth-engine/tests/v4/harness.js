// Runtime V4 test harness: a chat transcript played through the product's host path (src/v4/runtime.js) the way the
// SillyTavern extension plays it (index.js), with the three LLM calls scripted: the interpreter answers the commands a
// test gives it, the extractor the answer a test gives it, the Board generator the listings of a fixture.
import { samePlace } from '../../src/v4/place_refs.js';
import { ensureCampaign, foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';

export const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Redmarch, Veyrhold`';

/** A fixture listing as the Board generator writes it: no ids, every field present (null where it does not apply). */
export function generatorListing({ id, ...l }) {
    return {
        title: l.title, client: l.client, rank: l.rank, level: l.level, qtype: l.qtype, payout_cp: l.payout_cp, ...(l.task !== undefined ? { task: l.task } : {}), desired_end_state: l.desired_end_state,
        objectives: (l.objectives || []).map((o) => ({ verb: o.verb, what: o.what, qty: o.qty ?? null, unit: o.unit ?? null, where: o.where ?? null })),
        proof: (l.proof || []).map((p) => ({ kind: p.kind, what: p.what, qty: p.qty ?? null, unit: p.unit ?? null, on: p.on ?? null, consume: p.consume ?? null })),
    };
}

export class Chat4 {
    /**
     * @param {object} content the content pack
     * @param {{seed?: number, greeting?: string, listings?: object[]|null, boardFails?: boolean}} opts listings: what the
     *   Board generator answers (a fixture's listings, ids removed as the generator never writes ids)
     */
    constructor(content, { seed = 7, greeting = GREETING, listings = null, boardFails = false, legacyPrivateQuests = false, fProgression = false, fBalance = false } = {}) {
        this.content = content;
        this.chat = [{ mes: greeting, is_user: false, is_system: false, extra: {} }];
        ensureCampaign(this.chat, content, { seed, runtime: 'v4' });
        // Historical regression scenarios keep their original numeric policy; current-policy tests opt in.
        if (!fBalance) delete rec(this.chat[0]).events.find(e => e.t === 'campaign.started').d.f_balance;
        if (!fProgression) delete rec(this.chat[0]).events.find(e => e.t === 'campaign.started').d.f_progression;
        // Rule-1 fixtures replay the old campaign-start format; product campaigns keep the new flag.
        if (content.start.ruleset === 1 || legacyPrivateQuests) {
            const start = rec(this.chat[0]).events.find(e => e.t === 'campaign.started');
            delete start.d.private_quests;
        }
        this.listings = listings;
        this.boardFails = boardFails;
        this.calls = [];
        this.commands = [];
        this.answer = { expected: {}, deltas: [] };
        this.ids = new Map(); // a fixture's listing id -> the id the engine booked
        this.llm = async ({ messages, purpose }) => {
            this.calls.push({ purpose, messages });
            if (purpose.startsWith('interpret')) return JSON.stringify({ commands: this.map(this.commands) });
            if (purpose.startsWith('extract')) {
                // Historical scripted fixtures omit the new context; migrate their wire answer only.
                let answer = this.answer;
                if (typeof answer === 'string') {
                    try { answer = JSON.parse(answer); } catch { return answer; }
                }
                return JSON.stringify(this.wireAnswer({ scene: 'here', ...this.map(answer) }));
            }
            if (purpose === 'board') {
                if (this.boardFails || !this.listings) return 'The board is empty today.';
                return JSON.stringify({ listings: this.listings.map(generatorListing) });
            }
            return null;
        };
    }

    /** Old scripted fixtures expressed arrival through Expected. Translate that wire format to 5.13;
     * archived events are never rewritten. Tests of malformed current responses call runtime directly. */
    wireAnswer(answer) {
        const s = this.state();
        if ((s.meta.ruleset || 1) < 2 || !(s.last?.outcome?.c || s.last?.outcome?.auth?.c)) return answer;
        const a = structuredClone(answer);
        const ds = a.deltas || [];
        if (ds.some(d => d.type === 'arrive')) return a;
        for (const [seq, e] of Object.entries(a.expected || {})) {
            if (e?.arrived === true && !e.at) e.at = s.last?.outcome?.auth?.gos?.find(g => String(g.seq) === seq)?.to || null;
            if (e?.arrived !== true || !e.at || ds.some(d => d.type === 'arrive' && samePlace(s, d.at, e.at, this.content))) continue;
            let index = ds.findIndex(d => d.scene != null && d.scene !== 'here' && samePlace(s, d.scene, e.at, this.content));
            if (index < 0) {
                index = ds.some(d => d.scene === s.scene.at || d.type === 'arrive') ? ds.length : 0;
            }
            const route = ds.findLastIndex(d => d.type === 'passage' && samePlace(s, d.to, e.at, this.content));
            if (route >= 0) index = Math.max(index, route + 1);
            for (const d of ds.slice(0, index)) if (d.scene == null) d.scene = s.scene.at;
            ds.splice(index, 0, { type: 'arrive', at: e.at, with: e.with ?? null, forced_by: null });
        }
        // Only number inserted historical arrivals; preserve seq-based dependencies otherwise.
        if (ds.some(d => d.seq === undefined)) {
            const renumber = new Map(ds.filter(d => d.seq !== undefined).map(d => [d.seq, ds.indexOf(d) + 1]));
            a.deltas = ds.map((d, i) => ({ ...d, seq: i + 1, ...(d.depends_on ? { depends_on: d.depends_on.map(x => renumber.get(x) ?? x) } : {}) }));
        }
        return a;
    }

    /** Replace a fixture's listing ids by the ids the engine booked (deep). */
    map(v) {
        if (typeof v === 'string') return this.ids.get(v) || v;
        if (Array.isArray(v)) return v.map((x) => this.map(x));
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, this.map(x)]));
        return v;
    }

    learnIds() {
        const s = this.state();
        for (const l of this.listings || []) {
            const q = Object.values(s.quests).find((x) => x.title === l.title);
            if (q) this.ids.set(l.id, q.id);
        }
    }

    state(end) {
        return foldChat(this.chat, end).state;
    }

    /** A player message; the interpreter answers `commands`. Returns the prepareGeneration result. */
    async player(text, commands = []) {
        this.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
        this.commands = commands;
        const r = await prepareGenerationAsync(this.chat, this.content, { type: 'normal', settings: {}, llm: this.llm });
        if (r.action === 'panels') this.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
        this.learnIds();
        return r;
    }

    /** The narrator's reply (prose); the extractor answers `answer`. Guild boards are generated only by an explicit board.read player turn. */
    async reply(prose, answer = { expected: {}, deltas: [] }) {
        this.chat.push({ mes: prose, is_user: false, is_system: false, extra: {} });
        const id = this.chat.length - 1;
        const p = processReplyAny(this.chat, id, this.content, {});
        this.answer = answer;
        const x = p.extract ? await runExtraction(this.chat, id, this.content, this.llm) : { changed: false };
        this.learnIds();
        return { id, process: p, extract: x, board: null, record: rec(this.chat[id]) };
    }

    record(id) {
        return rec(this.chat[id]);
    }
}
