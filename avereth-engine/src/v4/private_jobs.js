// Private work uses the planner's explicit action/job link and engine results.
// The world still judges whether the chosen work accomplished the promised task.
import { rulesetOf } from '../content.js';
import { normText } from '../util.js';

export const jobOf = (s, id) => typeof id === 'string' && s.quests[id]?.kind === 'private' ? s.quests[id] : null;
export const jobAction = c => ['go', 'other', 'attempt', 'give', 'use_skill'].includes(c.type)
    || (c.type === 'activity' && ['work', 'craft', 'errand', 'search', 'gather'].includes(c.kind));

export function recordJobWork(s, emit, outcome, expected, events) {
    const blocked = new Set();
    if (rulesetOf(s) < 2) return blocked;
    const actions = [...(outcome.resolutions || []), ...(outcome.job ? [outcome.job] : [])];
    for (const r of actions) {
        const q = jobOf(s, r.job);
        if (!q || !['offered', 'active'].includes(q.status) || !r.quote) continue;
        let done = r.status === 'resolved' || (r.status === 'conditional'
            && events.some(e => e.t === 'cmd.completed' && e.d.seq === r.seq && e.d.ok));
        let at = s.scene.at;
        if (r.type === 'go') {
            const goal = (outcome.auth?.gos || []).find(g => g.seq === r.seq);
            const under = (at, target) => {
                const seen = new Set();
                while (at && !seen.has(at)) { if (at === target) return true; seen.add(at); at = s.places[at]?.parent; }
                return false;
            };
            const reached = events.find(e => e.t === 'scene.moved' && (!goal?.to || under(e.d.at, goal.to)));
            done = r.status === 'authorized' && !!goal && !!reached && expected[String(r.seq)]?.arrived === true;
            if (done) at = reached.d.at;
        } else if (r.type === 'activity') {
            const report = expected[String(r.seq)];
            done = r.work_ok !== false && (r.status === 'resolved' || (r.status === 'authorized'
                && report?.done === true && report.minutes > 0 && events.some(e => e.t === 'time.advanced' && e.d.minutes > 0)));
        } else if (r.type === 'attempt') {
            done &&= r.work_ok !== false;
        } else if (r.type === 'use_skill') {
            done = (outcome.records || []).some(e => e.actor === 'pc' && ['attack', 'skill'].includes(e.kind));
        }
        if (!done) { blocked.add(q.id); continue; }
        blocked.delete(q.id);
        emit({ t: 'quest.progressed', d: { id: q.id, objective: 'authorized work', status: 'open', work: {
            turn: s.turn, seq: r.seq, type: r.type, quote: r.quote.slice(0, 200), at,
        } } });
    }
    return blocked;
}

// Prefer an exact extractor reference. Recognizable unlabelled wages cannot use
// the ordinary-gift path; ambiguous employers/jobs ask for a precise reference.
export function paymentJob(s, d, from, closing = []) {
    if (d.job != null) return { job: jobOf(s, d.job), error: jobOf(s, d.job) ? null : 'unknown private job' };
    if (/\b(?:gift|present|alms|donation|tip)\b/i.test(d.why || '')) return null;
    if (!/\b(?:wages?|reward|payout|payment|pay for|promised|agreed fee|job)\b/i.test(d.why || '')) return null;
    const why = normText(d.why || '');
    const jobs = Object.values(s.quests).filter(q => q.kind === 'private' && q.giver === from
        && (/\bwages?\b/.test(why) || closing.includes(q.id) || why.includes(normText(q.id)) || (q.title && why.includes(normText(q.title)))));
    if (!jobs.length) return null;
    return jobs.length === 1 ? { job: jobs[0] } : { error: 'name the private job for this payment' };
}
