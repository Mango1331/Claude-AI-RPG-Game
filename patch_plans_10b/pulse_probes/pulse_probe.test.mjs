// Read-only PULSE probe against .159: measures today's ROAD AHEAD gate. Changes nothing in the product.
import test from 'node:test';
const E = process.env.ENG;
const { loadProductContent } = await import(`${E}/tests/helpers.js`);
const { prepareGenerationAsync } = await import(`${E}/src/v4/runtime.js`);
const { rec, foldChat } = await import(`${E}/src/host.js`);
const { resolveCommands } = await import(`${E}/src/v4/commands.js`);
const { applyEvent } = await import(`${E}/src/state.js`);
const { clone, hash32 } = await import(`${E}/src/util.js`);
const { Chat4 } = await import(`${E}/tests/v4/harness.js`);
const content = await loadProductContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';
async function campaign(seed) {
  const g = new Chat4(content, { greeting: GREETING, ...(seed != null ? { seed } : {}) });
  await g.player('Mage'); await g.player('Flame Lance + Arcane Wave');
  const ask = g.llm; g.llm = async (req) => req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
  return g;
}
async function say(g, text, ...commands) {
  g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
  const own = (q) => (q && text.includes(q) ? q : text.replace(/\*/g, '').trim());
  g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c, ...('quote' in c ? { quote: own(c.quote) } : {}) })) })];
  return prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
}
const outcome = (g) => rec(g.chat.findLast((m) => m.is_user))?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const BLACKGATE = { type: 'go', to: 'loc.blackgate', quote: 'I set out for Blackgate' };
const CONTINUE = { type: 'journey.continue', quote: 'I continue my journey' };
const NOT_THERE = { 1: { arrived: false, at: null, with: null } };
const out = {};
test('probe', async () => {
  const g = await campaign();
  await say(g, '*I leave Ashbridge and set out for Blackgate*', BLACKGATE);
  const o0 = outcome(g);
  out.first_go = { road: o0.auth.road, lines: o0.extra.filter((x) => x.startsWith('THE ROAD')).map((x) => x.slice(0, 60)) };
  await g.reply('He walks east all day.', { expected: NOT_THERE, deltas: [{ type: 'arrive', seq: 1, at: 'realm.duskreach', with: null, forced_by: null }, { seq: 2, type: 'time', minutes: 480 }] });
  const s = g.state();
  out.at = s.scene.at; out.turn = s.turn; out.minute = s.clock.minute;
  // 1) distribution over turns for this seed, and over seeds (pure hash formula as roadLine has it)
  const pct = content.rules.travel.leg_event_pct;
  const draw = (seed, turn, minute, seq) => parseInt(hash32(`${seed}|${turn}|${minute}|${seq}|road`), 16) % 100 < pct;
  let open = 0; const N = 20000;
  for (let i = 0; i < N; i++) if (draw(i * 7919 + 13, 1 + (i % 400), 480 + (i % 97) * 5, 1)) open++;
  out.hash_share = +(open / N).toFixed(4);
  // 2) engine path: 400 turns of CONTINUE on the road
  const draws = [];
  for (let turn = 1; turn <= 400; turn++) { const t = clone(s); t.turn = turn; draws.push(resolveCommands(t, content, [{ seq: 1, ...CONTINUE }], (e) => applyEvent(t, e), { c: true }).auth.road); }
  out.engine_open_share_400 = +(draws.filter((x) => x === 'open').length / 400).toFixed(3);
  let run = 0, maxQuiet = 0, maxOpen = 0, runOpen = 0;
  for (const d of draws) { if (d === 'quiet') { run++; runOpen = 0; } else { runOpen++; run = 0; } maxQuiet = Math.max(maxQuiet, run); maxOpen = Math.max(maxOpen, runOpen); }
  out.longest_quiet_run = maxQuiet; out.longest_open_run = maxOpen;
  // 3) minute dependence: the same turn, a wait booked earlier in the same message
  let flips = 0;
  for (let turn = 1; turn <= 200; turn++) {
    const a = clone(s); a.turn = turn; const ra = resolveCommands(a, content, [{ seq: 1, ...CONTINUE }], (e) => applyEvent(a, e), { c: true }).auth.road;
    const b = clone(s); b.turn = turn; b.clock.minute += 10; const rb = resolveCommands(b, content, [{ seq: 1, ...CONTINUE }], (e) => applyEvent(b, e), { c: true }).auth.road;
    const c2 = clone(s); c2.turn = turn; const rc = resolveCommands(c2, content, [{ seq: 2, ...CONTINUE }], (e) => applyEvent(c2, e), { c: true }).auth.road;
    if (ra !== rb || ra !== rc) flips++;
  }
  out.same_turn_other_minute_or_seq_changes_road_of_200 = flips;
  // 4) two legs in one message: two independent draws, the last one wins auth.road
  let contradict = 0, lastWins = 0;
  for (let turn = 1; turn <= 200; turn++) {
    const t = clone(s); t.turn = turn;
    const ctx = resolveCommands(t, content, [{ seq: 1, type: 'go', to: 'loc.blackgate', quote: 'to Blackgate' }, { seq: 2, type: 'go', to: 'loc.alderwatch', quote: 'then on to Alderwatch' }], (e) => applyEvent(t, e), { c: true });
    const lines = ctx.extra.filter((x) => x.startsWith('THE ROAD'));
    const kinds = lines.map((x) => /may \(not must\)/.test(x) ? 'open' : /uneventful/.test(x) ? 'quiet' : 'held');
    if (new Set(kinds).size > 1) contradict++;
    if (lines.length > 1) lastWins++;
  }
  out.two_go_messages_with_two_road_lines_of_200 = lastWins; out.two_go_contradicting_lines_of_200 = contradict;
  // 5) edit of the latest message: same turn, other words -> road decided again with the same key
  const before = outcome(g);
  await say(g, '*I continue my journey*', CONTINUE);
  const r1 = outcome(g).auth.road; const ex1 = outcome(g).extra.filter((x) => x.startsWith('THE ROAD'));
  g.chat.at(-1).mes = '*I walk on toward Blackgate*';
  g.plans = [JSON.stringify({ commands: [{ seq: 1, ...CONTINUE, quote: 'I walk on toward Blackgate' }] })];
  await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
  out.edit_same_road = outcome(g).auth.road === r1;
  await prepareGenerationAsync(g.chat, g.content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
  out.swipe_same_road = outcome(g).auth.road === r1;
  out.road_line_tokens = ex1.map((x) => Math.ceil(x.length / 4));
  void before; void foldChat;
  console.log('PULSE_PROBE ' + JSON.stringify(out));
});
