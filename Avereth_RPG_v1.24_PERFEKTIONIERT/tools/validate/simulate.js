'use strict';
const path = require('path');
const TOOLS = path.dirname(__dirname);
const BASELINE = process.env.AVERETH_BASELINE_DIR || path.join(TOOLS, 'baseline');
const OUTDIR = process.env.AVERETH_OUT_DIR || path.dirname(TOOLS);
const REPORTS = path.join(TOOLS, 'validation');
const fs = require('fs');
const { activate } = require('./st_core.js');
const scenarios = require('./scenarios.js');
const OLD = JSON.parse(fs.readFileSync(path.join(BASELINE, 'Avereth_RPG_WorldInfo_4096_v1.22.json'), 'utf8'));
const NEW = JSON.parse(fs.readFileSync(path.join(OUTDIR, 'Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json'), 'utf8'));
// Recommended settings (Runtime Recommendations v1.23): scan depth 2, case-insensitive, whole words ON,
// Context 25% of a 32k context = 8192-token budget; tokens estimated as chars/4 (as in the project audits).
const globals = { scanDepth: 2, caseSensitive: false, matchWholeWords: true, budget: 8192 };
const PHASES = [1, 2, 54, 55];
const list = wi => Object.values(wi.entries).map(e => Object.assign({}, e));
function run(wi) {
  const entries = list(wi);
  return scenarios.map(s => {
    const r = activate(entries, s.msgs, globals);
    const uids = r.final.map(e => e.uid);
    const phase = uids.find(u => PHASES.includes(u)) ?? null;
    return { s, uids, phase, chars: r.totalChars, dropped: r.dropped.map(e => e.uid) };
  });
}
const o = run(OLD), n = run(NEW);
let pass = 0, fail = 0;
const rows = [];
for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i], a = o[i], b = n[i];
  const probs = [];
  if (b.phase !== s.expect) probs.push(`phase ${b.phase} != expected ${s.expect}`);
  for (const u of s.mustNot || []) if (b.uids.includes(u)) probs.push(`#${u} active`);
  for (const u of s.mustHave || []) if (!b.uids.includes(u)) probs.push(`#${u} missing`);
  if (b.dropped.length) probs.push('budget drop ' + b.dropped.join(','));
  const oldOk = a.phase === s.expect && !(s.mustNot || []).some(u => a.uids.includes(u)) && !(s.mustHave || []).some(u => !a.uids.includes(u));
  probs.length ? fail++ : pass++;
  rows.push({ id: s.id, name: s.name, old: { phase: a.phase, uids: a.uids, chars: a.chars, ok: oldOk, dropped: a.dropped }, new: { phase: b.phase, uids: b.uids, chars: b.chars, ok: probs.length === 0, problems: probs } });
  console.log(`${s.id} ${probs.length ? 'FAIL' : 'ok  '} | old ${oldOk ? 'ok ' : 'BAD'} phase=${a.phase} chars=${a.chars} [${a.uids.join(',')}]`);
  console.log(`     ${s.name}\n     new phase=${b.phase} chars=${b.chars} [${b.uids.join(',')}] ${probs.join('; ')}`);
}
fs.writeFileSync(path.join(REPORTS, 'simulation_result.json'), JSON.stringify(rows, null, 1));
console.log(`\nNEW: ${pass} scenarios pass, ${fail} fail | OLD passes ${rows.filter(r => r.old.ok).length}/${rows.length}`);
process.exit(fail ? 1 : 0);
