// read-only: rebuild the narrator engine block of chosen indices with the checked-out product context code (no product file written)
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN, RUN = process.env.RUN, IDX = (process.env.IDX || '').split(',').map(Number);
const { foldChat, rec, turnBlock } = await import(`${E}/src/host.js`);
const { loadProductContent } = await import(`${E}/tests/helpers.js`);
const content = await loadProductContent();
const raw = RUN.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(RUN)).toString('utf8') : fs.readFileSync(RUN, 'utf8');
const lines = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines[0].chat_metadata || lines[0].user_name ? lines.slice(1) : lines;
for (const u of IDX) {
  const m = chat[u];
  const { context, state } = turnBlock(chat, u, content, { budget: 1400, rulesBudget: 800 });
  const d = context.diagnostics || {};
  console.log(`\n===== I${u} ${m.is_user ? 'USER' : 'REPLY'} at ${state.scene.at} present ${JSON.stringify(state.scene.present)}`);
  console.log('  input:', String(m.mes).slice(0, 200));
  console.log('  delivered:', (d.delivered || []).map((x) => `${x.name}${x.npcIds?.length ? '[' + x.npcIds.join(',') + ']' : ''}:${x.tokens}`).join(' '));
  console.log('  dropped:', (d.dropped || []).map((x) => `${x.name}:${x.tokens}`).join(' '), '| focus', JSON.stringify(d.focusNpcIds), '| budgeted', d.budgetedTokens);
  const t = context.text;
  for (const head of ['CURRENT INTERLOCUTORS', 'KNOWN PEOPLE', 'KNOWN AT']) {
    const i = t.indexOf(head); if (i >= 0) console.log(`  ${head}:`, t.slice(i, i + 700).replace(/\n/g, ' ⏎ '));
  }
}
