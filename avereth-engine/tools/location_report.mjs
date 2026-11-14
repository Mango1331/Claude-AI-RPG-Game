// Location architecture (.190, stage 0): a reproducible report of place and travel incidents in recorded runs. It reads
// what the engine stored (the events of every record), never calls a model and writes nothing. Sources:
//   - natural runs: a run folder with chat.jsonl (and calls.json for repairs, tokens and latency), or chat.jsonl alone
//   - the replay corpus: a baseline written by tools/replay/replay.mjs (--write-baseline), one run per corpus label
//
//   node tools/location_report.mjs <run dir|chat.jsonl|baseline.json.gz> [...] [--json]
//
// What it separates (docs/LOCATION_ARCHITECTURE_190.md, stage 0):
//   primary     a location rule refused something on its own (no_go, passage, place, area, road, shut_in, dungeon_presence)
//   cascade     a refusal that only follows from such a refusal (scene_context, met_without_arrival, met_not_known_here)
//   go          every authorized GO/continuation of a player turn and what its reply did: arrived, no arrival reported,
//               arrival refused by an engine rule although the GO was authorized, extraction failed
//   unauthorized an arrival the reply told with no GO of the turn (no_go)
//   episodes    consecutive replies with a refused arrival (a lower bound of a narrative location contradiction)
//   orphans     places created in a reply whose arrival was refused and never stood in later (a place known by
//               report is knowledge, not an orphan)
//   duplicates  place pairs in the final places of one realm whose name begins with the other's (strict prefix rule),
//               and NPC pairs whose name ends with the other's name (Ostrek / Meister Ostrek)
//   lost        refused deltas by type in replies with a primary location refusal (candidates, not judged lost)
//   suspicious  accepted local deltas of a reply whose arrival was refused (accepted although the scene was not reached)
//   cost        repair calls, tokens and latency per player turn (p50/p95), from calls.json where present
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const PRIMARY = new Set(['no_go', 'passage', 'place', 'area', 'road', 'shut_in', 'dungeon_presence']);
export const CASCADE = new Set(['scene_context', 'met_without_arrival', 'met_not_known_here']);
const LOCAL = new Set(['person.new', 'enter', 'creature.new', 'object.new', 'offer', 'bid', 'coin.gift', 'position', 'aware']);
const MOVES = new Set(['go', 'journey.continue']);
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^the /, '');
const q = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))] : null; };

/** The records of a chat.jsonl (its first line is the chat's metadata) as {i, user, events}. */
export function recordsOfChat(lines) {
    const msgs = lines[0] && !('mes' in lines[0]) ? lines.slice(1) : lines;
    return msgs.map((m, i) => ({ i, user: !!m.is_user, events: m?.extra?.avereth?.events || [] }));
}

/** The records of one replay baseline run (cases in chat order) as {i, user, events}. */
export function recordsOfBaselineRun(run) {
    const cases = Array.isArray(run.cases) ? run.cases : Object.values(run.cases || {});
    return cases.map((c, i) => ({ i, user: c.kind === 'player', events: c.events || [] }));
}

/** The report of one run's records (and its calls.json entries, when there are any). */
export function analyzeRun(records, calls = null) {
    const rules = {};
    const out = {
        replies: 0, accepted: 0, rejected: 0, primary: 0, cascade: 0, replies_with_location_refusal: 0,
        go: { turns: 0, arrived: 0, no_arrival: 0, refused_by_engine: 0, extraction_failed: 0, by_target: {} },
        unauthorized_arrivals: 0, episodes: [], orphans: [], lost: {}, suspicious: {}, rules,
    };
    const places = {};
    const visited = new Set();
    const created = [];
    const npcs = {};
    let run = 0;
    for (let k = 0; k < records.length; k++) {
        const r = records[k];
        for (const e of r.events) {
            if (e.t === 'campaign.started') for (const p of e.d.places || []) places[p.id] = p;
            if (e.t === 'place.created') places[e.d.place.id] = e.d.place;
            if (e.t === 'scene.moved') visited.add(e.d.at);
            if (e.t === 'entity.created' && e.d.entity?.kind === 'npc') npcs[e.d.entity.id] = e.d.entity;
        }
        if (r.user) {
            const auth = r.events.filter((e) => e.t === 'cmd.resolved' && MOVES.has(e.d.type) && e.d.status === 'authorized');
            if (!auth.length) continue;
            const cmds = r.events.find((e) => e.t === 'cmd.interpreted')?.d.commands || [];
            const go = cmds.find((c) => c.type === 'go');
            const target = go ? (go.within ? 'within' : typeof go.to === 'string' ? 'id' : 'new') : 'continue';
            out.go.by_target[target] = (out.go.by_target[target] || 0) + 1;
            out.go.turns++;
            const next = records[k + 1]?.events || [];
            if (next.some((e) => e.t === 'extract.failed')) out.go.extraction_failed++;
            else if (next.some((e) => e.t === 'scene.moved')) out.go.arrived++;
            else if (next.some((e) => e.t === 'delta.rejected' && e.d.item?.type === 'arrive')) out.go.refused_by_engine++;
            else out.go.no_arrival++;
            continue;
        }
        const applied = r.events.find((e) => e.t === 'extract.applied');
        if (applied || r.events.some((e) => e.t === 'extract.failed')) out.replies++;
        if (applied) out.accepted += applied.d.deltas || 0;
        const refused = r.events.filter((e) => e.t === 'delta.rejected');
        out.rejected += refused.length;
        let local = false;
        let primary = false;
        for (const e of refused) {
            rules[e.d.rule] = (rules[e.d.rule] || 0) + 1;
            if (PRIMARY.has(e.d.rule)) { out.primary++; local = primary = true; }
            if (CASCADE.has(e.d.rule)) { out.cascade++; local = true; }
        }
        if (local) out.replies_with_location_refusal++;
        const arrivalRefused = refused.some((e) => e.d.item?.type === 'arrive' && PRIMARY.has(e.d.rule));
        if (refused.some((e) => e.d.rule === 'no_go' && e.d.item?.type === 'arrive')) out.unauthorized_arrivals++;
        if (primary) for (const e of refused.filter((x) => !PRIMARY.has(x.d.rule))) out.lost[e.d.item?.type || '?'] = (out.lost[e.d.item?.type || '?'] || 0) + 1;
        if (arrivalRefused) {
            run++;
            // a place known by report (place.reported) is knowledge, not a refused arrival's place (.190 stage 2)
            for (const e of r.events.filter((x) => x.t === 'place.created' && x.d.place.known !== 'reported')) created.push({ i: r.i, id: e.d.place.id, kind: e.d.place.kind });
            const kinds = r.events.filter((x) => ['entity.created', 'offer.created', 'object.created'].includes(x.t)).map((x) => x.t);
            for (const t of kinds) out.suspicious[t] = (out.suspicious[t] || 0) + 1;
        } else if (r.events.some((e) => e.t === 'extract.applied' || e.t === 'extract.failed') && run) { out.episodes.push(run); run = 0; }
    }
    if (run) out.episodes.push(run);
    out.orphans = created.filter((x) => !visited.has(x.id));
    out.duplicates = { places: duplicatePlaces(Object.values(places)), npcs: duplicateNpcs(Object.values(npcs)) };
    if (calls) out.cost = cost(calls);
    return out;
}

/** Place pairs of one realm whose normalized name begins with the other's (never a settlement against its own site). */
export function duplicatePlaces(list) {
    const pairs = [];
    const byId = Object.fromEntries(list.map((p) => [p.id, p]));
    // the settlement a place lies in (or none): two Guild halls of two towns are two places of one name, not a pair
    const town = (p) => { for (let x = p, n = 0; x && n < 12; x = byId[x.parent], n++) if (x.kind === 'settlement') return x.id; return null; };
    const named = list.filter((p) => p.kind !== 'realm' && norm(p.name).length >= 5);
    for (const a of named) for (const b of named) {
        if (a.id >= b.id || a.realm !== b.realm) continue;
        const [ta, tb] = [town(a), town(b)];
        if (ta && tb && ta !== tb) continue;
        const [x, y] = [norm(a.name), norm(b.name)];
        const prefix = x === y || y.startsWith(`${x} `) || x.startsWith(`${y} `);
        const ownSite = (a.kind === 'settlement' && b.parent === a.id) || (b.kind === 'settlement' && a.parent === b.id) || b.id.startsWith(`${a.id}.`) || a.id.startsWith(`${b.id}.`);
        if (prefix && !ownSite) pairs.push([a.id, b.id]);
    }
    return pairs;
}

/** NPC pairs where one's name is the other's last word(s) (Ostrek / Meister Ostrek), or both names are equal. */
export function duplicateNpcs(list) {
    const pairs = [];
    const named = list.filter((e) => e.name);
    for (const a of named) for (const b of named) {
        if (a.id >= b.id) continue;
        const [x, y] = [norm(a.name), norm(b.name)];
        if (x === y || x.endsWith(` ${y}`) || y.endsWith(` ${x}`)) pairs.push([a.id, b.id]);
    }
    return pairs;
}

/** Repairs, tokens and per-turn latency of a run's calls.json. */
export function cost(calls) {
    const turns = {};
    let repairs = 0;
    let tokens = 0;
    let lengthStops = 0;
    for (const c of calls) {
        const t = (turns[c.turn] ||= { ms: 0, tokens: 0 });
        t.ms += c.ms || 0;
        const tok = (c.prompt_tokens || 0) + (c.completion_tokens || 0);
        t.tokens += tok;
        tokens += tok;
        if (c.repair) repairs++;
        if (c.finish === 'length') lengthStops++;
    }
    const per = Object.values(turns);
    return { calls: calls.length, repairs, length_stops: lengthStops, tokens, turns: per.length,
        tokens_per_turn: per.length ? Math.round(tokens / per.length) : null,
        ms_p50: q(per.map((t) => t.ms), 0.5), ms_p95: q(per.map((t) => t.ms), 0.95) };
}

/** Sum the numeric fields of several reports (the orphan, duplicate and episode lists are concatenated). */
export function total(reports) {
    const t = analyzeRun([]);
    for (const r of reports) {
        for (const k of ['replies', 'accepted', 'rejected', 'primary', 'cascade', 'replies_with_location_refusal', 'unauthorized_arrivals']) t[k] += r[k];
        for (const k of ['turns', 'arrived', 'no_arrival', 'refused_by_engine', 'extraction_failed']) t.go[k] += r.go[k];
        for (const [k, v] of Object.entries(r.go.by_target)) t.go.by_target[k] = (t.go.by_target[k] || 0) + v;
        for (const m of ['lost', 'suspicious', 'rules']) for (const [k, v] of Object.entries(r[m])) t[m][k] = (t[m][k] || 0) + v;
        t.episodes.push(...r.episodes);
        t.orphans.push(...r.orphans);
        t.duplicates = { places: [...(t.duplicates?.places || []), ...r.duplicates.places], npcs: [...(t.duplicates?.npcs || []), ...r.duplicates.npcs] };
    }
    return t;
}

function loadSource(file) {
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
        const chat = path.join(file, 'chat.jsonl');
        const calls = path.join(file, 'calls.json');
        return [{ label: path.basename(file), records: recordsOfChat(readJsonl(chat)), calls: fs.existsSync(calls) ? JSON.parse(fs.readFileSync(calls, 'utf8')) : null }];
    }
    if (file.endsWith('.jsonl')) return [{ label: path.basename(path.dirname(file)), records: recordsOfChat(readJsonl(file)), calls: null }];
    const raw = fs.readFileSync(file);
    const base = JSON.parse(file.endsWith('.gz') ? zlib.gunzipSync(raw) : raw);
    return Object.entries(base.runs || {}).map(([label, run]) => ({ label, records: recordsOfBaselineRun(run), calls: null }));
}
const readJsonl = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

function line(label, r) {
    const share = r.rejected ? Math.round((100 * (r.primary + r.cascade)) / r.rejected) : 0;
    const cost = r.cost ? ` · calls ${r.cost.calls}, repairs ${r.cost.repairs}, tokens/turn ${r.cost.tokens_per_turn}, turn ms p50 ${r.cost.ms_p50} p95 ${r.cost.ms_p95}` : '';
    return `${label}: replies ${r.replies}, deltas ${r.accepted} accepted / ${r.rejected} refused, location ${r.primary} primary + ${r.cascade} cascade (${share}% of refusals), replies with a location refusal ${r.replies_with_location_refusal}`
        + ` · GO ${r.go.turns} (${JSON.stringify(r.go.by_target)}): arrived ${r.go.arrived}, no arrival ${r.go.no_arrival}, refused by engine ${r.go.refused_by_engine}, extraction failed ${r.go.extraction_failed}`
        + ` · unauthorized arrivals ${r.unauthorized_arrivals}, episodes ${r.episodes.length} (${r.episodes.reduce((a, b) => a + b, 0)} replies, longest ${Math.max(0, ...r.episodes)})`
        + ` · orphans ${r.orphans.length}, duplicate places ${r.duplicates.places.length}, duplicate npcs ${r.duplicates.npcs.length}${cost}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    if (!files.length) { console.error('usage: node tools/location_report.mjs <run dir|chat.jsonl|baseline.json.gz> … [--json]'); process.exit(2); }
    const runs = files.flatMap(loadSource).map((s) => ({ label: s.label, report: analyzeRun(s.records, s.calls) }));
    if (process.argv.includes('--json')) { console.log(JSON.stringify(runs, null, 1)); process.exit(0); }
    for (const r of runs) console.log(line(r.label, r.report));
    const t = total(runs.map((r) => r.report));
    console.log(line('TOTAL', t));
    for (const o of t.orphans) console.log(`  orphan: #${o.i} ${o.id} [${o.kind}]`);
    for (const [a, b] of t.duplicates.places) console.log(`  duplicate place candidate: ${a} ~ ${b}`);
    for (const [a, b] of t.duplicates.npcs) console.log(`  duplicate npc candidate: ${a} ~ ${b}`);
}
