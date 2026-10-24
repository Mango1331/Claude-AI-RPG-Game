// Test guides (docs/LIVE_RUNNER.md §6): what a run is to reach, as milestones with goals, never as a list of commands.
// One guide per patch: a guide may extend another (`extends`) and add to its focus and brief, or bring its own
// milestones. A guide is JSON in tools/st_live/live/guides/ (by id) or any path.
//   {id, title, extends?, brief, brief_extra?, character?, milestones: [{id, goal, check?, required?, maxTurns?}],
//    focus: [...], limits: {maxTurns, maxMinutes, sameFailure}, personas: [...], scripted: [{say, until?, max?, milestone?}]}
// check: an evaluator check (evaluator.mjs CHECKS); default the milestone's id. required: false for a milestone that is
// only taken when it comes within reach (a guardian, a floor clear). maxTurns: the turns the milestone may take before
// the report marks it slow; at three times that the run stops as stuck.
import fs from 'node:fs';
import path from 'node:path';
import { LIVE } from './lib.mjs';
import { CHECKS } from './evaluator.mjs';

export const GUIDES = path.join(LIVE, 'guides');
export const DEFAULT_LIMITS = { maxTurns: 80, maxMinutes: 240, sameFailure: 3 };

export function listGuides(dir = GUIDES) {
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : [];
}

function readGuide(ref, dir) {
    const file = fs.existsSync(ref) && fs.statSync(ref).isFile() ? ref : path.join(dir, `${ref}.json`);
    if (!fs.existsSync(file)) throw new Error(`no guide "${ref}" (guides: ${listGuides(dir).join(', ') || 'none'})`);
    return { file: path.resolve(file), g: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

/** Check a guide; returns its errors. */
export function guideErrors(g) {
    const errors = [];
    if (!g.id || typeof g.id !== 'string') errors.push('id missing');
    if (!g.brief || typeof g.brief !== 'string') errors.push('brief missing');
    if (!Array.isArray(g.milestones) || !g.milestones.length) errors.push('no milestones');
    const ids = new Set();
    for (const [i, m] of (g.milestones || []).entries()) {
        if (!m.id || !m.goal) errors.push(`milestone ${i + 1}: id and goal are needed`);
        if (ids.has(m.id)) errors.push(`milestone ${m.id} twice`);
        ids.add(m.id);
        if (!CHECKS[m.check || m.id]) errors.push(`milestone ${m.id}: no evaluator check "${m.check || m.id}" (checks: ${Object.keys(CHECKS).join(', ')})`);
    }
    if (!(g.milestones || []).some((m) => m.required !== false)) errors.push('no required milestone (a run would never be done)');
    if (g.openRun) {
        if (!Number.isInteger(g.openRun.minTurns) || g.openRun.minTurns < 1) errors.push('openRun.minTurns must be a positive integer');
        if (g.fixture) errors.push('an open-run guide cannot require a synthetic fixture');
        if (!g.milestones?.some((m) => (m.check || m.id) === 'open_run_duration' && m.required !== false)) errors.push('open-run guide needs the required open_run_duration milestone');
        if (g.limits?.maxTurns && g.openRun.minTurns > g.limits.maxTurns) errors.push('openRun.minTurns exceeds maxTurns');
    }
    for (const [i, st] of (g.scripted || []).entries()) {
        if (!st.say) errors.push(`scripted step ${i + 1}: say missing`);
        if (st.until) { try { new RegExp(st.until, 'i'); } catch (e) { errors.push(`scripted step ${i + 1}: until is no regular expression (${e.message})`); } }
    }
    return errors;
}

/** Load a guide by id or path, its `extends` chain merged; throws on an invalid guide. */
export function loadGuide(ref, { dir = GUIDES, seen = [] } = {}) {
    const { file, g } = readGuide(ref, dir);
    if (seen.includes(file)) throw new Error(`guide ${ref} extends itself`);
    let out = g;
    if (g.extends) {
        const base = loadGuide(g.extends, { dir, seen: [...seen, file] });
        out = {
            ...base, ...g,
            brief: `${g.brief || base.brief}${g.brief_extra ? ` ${g.brief_extra}` : ''}`,
            milestones: g.milestones || base.milestones,
            focus: [...(base.focus || []), ...(g.focus || [])],
            limits: { ...base.limits, ...(g.limits || {}) },
            personas: g.personas || base.personas,
            scripted: g.scripted || base.scripted,
            chain: [...(base.chain || [base.id]), g.id],
            files: [...(base.files || []), file],
        };
    } else out = { ...g, brief: `${g.brief}${g.brief_extra ? ` ${g.brief_extra}` : ''}`, chain: [g.id], files: [file] };
    out.limits = { ...DEFAULT_LIMITS, ...(out.limits || {}) };
    out.focus = out.focus || [];
    out.personas = out.personas || [];
    const errors = guideErrors(out);
    if (errors.length) throw new Error(`guide ${ref}: ${errors.join('; ')}`);
    return out;
}
