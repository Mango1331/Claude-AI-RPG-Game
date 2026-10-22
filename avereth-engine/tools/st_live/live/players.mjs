// The players of a run (docs/LIVE_RUNNER.md §6). A player is {name, describe(), decide(view, turn)}: it gets the
// screen as a player sees it (driver.mjs view(): the chat's visible text, the HUD under the newest reply, the notices),
// the guide and its own notes, and answers one decision:
//   {message, milestone, intent, stop, stop_reason, observations}
// It never gets the engine's state, events or records (those are for the evaluation, evaluator.mjs).
//   - llm: a language model plays by the guide's milestones, in its own words and tactics (an OpenAI-compatible
//     endpoint called from here, not through SillyTavern: its calls are kept apart from the game's, in player.jsonl);
//   - scripted: fixed steps from the guide (reproducible comparison runs; the selftest).
import { clip, sleep } from './lib.mjs';

export const DECISION_KEYS = ['message', 'milestone', 'intent', 'stop', 'stop_reason', 'observations'];

/** The decision in a model's answer: the first JSON object (fences and text around it allowed), checked. */
export function parseDecision(text) {
    const s = String(text ?? '').replace(/^﻿/, '');
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
    const body = fenced ? fenced[1] : s;
    const start = body.indexOf('{');
    if (start < 0) return { ok: false, error: 'no JSON object in the answer' };
    let depth = 0;
    let quote = false;
    let end = -1;
    for (let i = start; i < body.length; i++) {
        const ch = body[i];
        if (quote) { if (ch === '\\') i += 1; else if (ch === '"') quote = false; continue; }
        if (ch === '"') quote = true;
        else if (ch === '{') depth += 1;
        else if (ch === '}') { depth -= 1; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) return { ok: false, error: 'the JSON object is not closed' };
    let d;
    try { d = JSON.parse(body.slice(start, end + 1)); } catch (e) { return { ok: false, error: `not valid JSON: ${e.message}` }; }
    const errors = [];
    const stop = d.stop === true;
    if (!stop && (typeof d.message !== 'string' || !d.message.trim())) errors.push('"message" must be the player\'s next message (a non-empty string) unless "stop" is true');
    if (stop && (typeof d.stop_reason !== 'string' || !d.stop_reason.trim())) errors.push('"stop_reason" must say why you stop');
    if (d.milestone != null && typeof d.milestone !== 'string') errors.push('"milestone" must be a milestone id');
    if (errors.length) return { ok: false, error: errors.join('; ') };
    return {
        ok: true,
        decision: {
            message: stop ? (typeof d.message === 'string' ? d.message.trim() : '') : d.message.trim(),
            milestone: d.milestone || null, intent: typeof d.intent === 'string' ? d.intent : null,
            stop, stop_reason: stop ? d.stop_reason.trim() : null, observations: typeof d.observations === 'string' ? d.observations : null,
        },
    };
}

/**
 * The screen as text for the player: one block per message, the newest at the bottom, then the newest HUD on screen
 * (driver.mjs view: its character and world panels, once, not repeated with every message), then the notices.
 */
export function screenText(view, { maxChars = 4000, hudChars = 3000 } = {}) {
    const who = (m) => (m.user ? 'YOU' : m.system ? `SYSTEM${m.name ? ` (${m.name})` : ''}` : `NARRATOR${m.name ? ` (${m.name})` : ''}`);
    const parts = view.messages.map((m) => `[${who(m)}]\n${clip(m.text, maxChars) || '(no text)'}`);
    if (view.hud) parts.push(`[YOUR CHARACTER AND THE WORLD — the HUD under the newest reply]\n${clip(view.hud, hudChars)}`);
    if (view.toasts?.length) parts.push(`[NOTICES ON SCREEN]\n${view.toasts.map((t) => `- (${t.kind}) ${clip(t.text, 400)}`).join('\n')}`);
    return parts.join('\n\n');
}

// Patch 8.4.1 (live 22.10.2026 05:43: the player's messages grew from 98 to almost 1,000 characters of story, his notes
// to 1,000 per turn, and his prompt from 1.6k to 6.9k tokens): the player is the player character, not the narrator
export const PLAYER_ROLE = [
    'YOUR MESSAGE to the game says only:',
    '- what {name} does now, concretely: I cast Flame Lance at the closest skeleton.',
    '- what {name} says to someone: "I\'m looking for a dungeon contract suitable for a novice mage. What do you have available?"',
    '- several actions only where they belong together: I examine the doorway for traps. If I find nothing suspicious, I carefully open it.',
    '- a System command, when a game mechanic needs one (below).',
    'It never holds: inner thoughts, reflections or feelings; descriptions of the place, the mood or the scene; what an action does or will do; what other characters say, do or decide; things, skills or successes the screen has not confirmed; out-of-character requests to the narrator.',
    'Say what you try. Whether it works and what follows is for the game to decide.',
    'Write in English, in the first person. If the game misunderstands you, rephrase or try another way, as a player would; never ask for a new reply.',
    'LENGTH: usually one short sentence or one short line of speech. Longer only when a combined action or a conversation needs it. Never a paragraph of story.',
    'Not like this: I steady my breathing, remembering everything that brought me here. My fingers tighten around my staff as I consider the danger ahead…',
    'Like this: I cast Flame Lance at the closest skeleton.',
].join('\n');
export const PLAYER_COMMANDS = [
    'SYSTEM COMMANDS are real game mechanics. A command is a message of its own: only the command, nothing else in it.',
    '- After a level-up the HUD shows Free Stat Points. They are spent only with #assign, several stats in one command: #assign WIL 2 INT 2 VIT 1. Words like "I put two points into INT" change nothing. Look at the System answer or the HUD afterwards to see that it worked.',
    '- When you are unsure what you carry or wear: #bag, #equipment. When unsure of your values: #status. #help lists every command.',
    '- Use them when they help, not before every small step. Never use an item the HUD or #bag has not shown you.',
].join('\n');

export function playerSystemPrompt(guide, { username, persona }) {
    const ms = guide.milestones.map((m, i) => `${i + 1}. ${m.id}: ${m.goal}${m.required === false ? ' (if it comes within reach)' : ''}`).join('\n');
    const focus = guide.focus?.length ? `\nWHAT THIS TEST LOOKS AT (watch for it):\n${guide.focus.map((f) => `- ${f}`).join('\n')}` : '';
    return [
        `You are a test player of "Avereth", a text RPG played in SillyTavern. You are ${username}, the player character: never the narrator, never the game master.`,
        'WHAT YOU KNOW: only what the screen shows you: the narrator\'s replies, the System panels, the HUD and the notices. You do not know the game\'s internals.',
        '',
        PLAYER_ROLE.replace(/\{name\}/g, username),
        '',
        PLAYER_COMMANDS,
        '',
        `THE TEST: ${guide.brief}`,
        '',
        `MILESTONES (in this order; the words, skills, targets and tactics are yours):\n${ms}`,
        focus,
        persona ? `\nYOUR STYLE THIS RUN (a player's style, never a writer's): ${persona}` : '',
        '',
        `STOP only when a real blocker makes the rest of the test meaningless: the game cannot go on, the same failure ${guide.limits.sameFailure} times in a row whatever you try, or ${username} is dead. Small problems (an odd reply, a misunderstanding, a detour) are no reason to stop: work around them and note them. When the last milestone is done, stop with stop_reason "done".`,
        '',
        'DECIDE QUICKLY: read the newest message and the HUD, take the next step toward your milestone, answer. Do not plan far ahead or weigh many options.',
        'ANSWER with one JSON object only. "message" goes to the game; the other fields are your test notes, which the game never sees:',
        '{"message": "<your next message>", "milestone": "<the id of the milestone you work on>", "intent": "<what you try, one short sentence>", "stop": false, "stop_reason": null, "observations": "<only what is new since your last turn and worth a tester\'s attention (an oddity, a contradiction between the story and the HUD, how enemies behaved), at most two short sentences; \"\" when nothing new; no thoughts, no repetition>"}',
    ].filter((x) => x !== '').join('\n');
}

/** His notes: the last turns in short, the earlier ones only as the milestones they worked on and when. */
export function notesText(notes, { recent = 6 } = {}) {
    if (!notes.length) return '(none yet)';
    const old = notes.slice(0, Math.max(0, notes.length - recent));
    const spans = [];
    for (const n of old) {
        const last = spans.at(-1);
        if (last && last.milestone === (n.milestone || '?')) last.to = n.turn; else spans.push({ milestone: n.milestone || '?', from: n.turn, to: n.turn });
    }
    const earlier = spans.length ? `earlier: ${spans.map((x) => `${x.milestone} (turn${x.from === x.to ? ` ${x.from}` : `s ${x.from}–${x.to}`})`).join(', ')}\n` : '';
    return earlier + notes.slice(-recent).map((n) => `${n.turn}. you wrote: ${JSON.stringify(clip(n.message, 160))} — ${n.milestone || '?'}: ${clip(n.intent || '', 120)}${n.observations ? ` — noted: ${clip(n.observations, 160)}` : ''}`).join('\n');
}

export function playerTurnPrompt(view, notes, { turn, maxTurns, recent = 6 } = {}) {
    return `TURN ${turn} of at most ${maxTurns}.\n\nYOUR NOTES SO FAR:\n${notesText(notes, { recent })}\n\nTHE SCREEN NOW (the newest at the bottom):\n\n${screenText(view)}`;
}

/** The smallest prompt: the newest messages and the HUD, the milestone at hand, the last notes (after a reasoning loop). */
function shortTurnPrompt(view, notes, { turn, maxTurns, milestone, minimal = false }) {
    const newest = { ...view, messages: view.messages.slice(minimal ? -1 : -2) };
    return [
        `TURN ${turn} of at most ${maxTurns}. Answer at once with the JSON object: no deliberation.`,
        milestone ? `YOUR MILESTONE NOW: ${milestone}` : '',
        minimal ? '' : `YOUR LAST NOTES:\n${notesText(notes, { recent: 3 })}`,
        `THE SCREEN NOW:\n\n${screenText(newest, { maxChars: minimal ? 1500 : 3000, hudChars: minimal ? 1200 : 2500 })}`,
    ].filter(Boolean).join('\n\n');
}

export const LONG_MESSAGE = 600; // characters: a player's turn, not a paragraph of story (commands aside)

/**
 * The LLM player. url/model/key: an OpenAI-compatible Chat Completions endpoint. body: the request fields that steer its
 * reasoning (players.mjs playerReasoning: the profile's own for the game's endpoint and model), sent with every call.
 * record(entry) receives every call (strategy, prompt size, answer, finish, tokens, cause; never the key).
 */
export function llmPlayer({ guide, username, persona, url, model, key, temperature = 0.8, maxTokens = 3000, body = null, extraBody = null, timeoutMs = 180000, record = () => {}, fetchImpl = fetch, backoffMs = 3000 }) {
    const notes = [];
    const system = playerSystemPrompt(guide, { username, persona });
    const endpoint = `${String(url).replace(/\/+$/, '')}/chat/completions`;
    const steer = { ...(body || {}), ...(extraBody || {}) };
    async function call(messages, temp) {
        const t0 = Date.now();
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), timeoutMs);
        try {
            const res = await fetchImpl(endpoint, {
                method: 'POST', signal: ctl.signal,
                headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
                body: JSON.stringify({ model, messages, temperature: temp, max_tokens: maxTokens, stream: false, ...steer }),
            });
            const json = await res.json().catch(() => null);
            const ms = Date.now() - t0;
            if (!res.ok || !json?.choices) return { ok: false, ms, error: `HTTP ${res.status}${json?.error?.message ? `: ${clip(json.error.message, 200)}` : ''}` };
            const m = json.choices[0]?.message || {};
            return { ok: true, ms, content: typeof m.content === 'string' ? m.content : '', reasoning: m.reasoning_content || m.reasoning || null, finish: json.choices[0]?.finish_reason ?? null, usage: json.usage ?? null, model: json.model ?? model };
        } catch (e) {
            return { ok: false, ms: Date.now() - t0, error: String(e?.name === 'AbortError' ? 'timeout' : e?.message || e) };
        } finally { clearTimeout(timer); }
    }
    return {
        name: 'llm',
        describe: () => ({ type: 'llm', model, endpoint: new URL(endpoint).host, temperature, maxTokens, persona, reasoning: steer }),
        notes,
        async decide(view, { turn, maxTurns }) {
            // the milestone he last said he works on (his own note), else the first: for the shorter prompts
            const at = guide.milestones.find((x) => x.id === notes.at(-1)?.milestone) || guide.milestones[0];
            const milestone = at ? `${at.id}: ${at.goal}` : null;
            const full = [{ role: 'system', content: system }, { role: 'user', content: playerTurnPrompt(view, notes, { turn, maxTurns }) }];
            let messages = full;
            let strategy = 'full';
            let temp = temperature;
            const causes = [];
            for (let attempt = 0; attempt < 3; attempt++) {
                const r = await call(messages, temp);
                // the reasoning took the whole budget and left no answer: the same request again would do the same
                const exhausted = r.ok && r.finish === 'length' && !String(r.content || '').trim();
                let parsed = r.ok && !exhausted ? parseDecision(r.content) : { ok: false, error: r.ok ? 'the reasoning used the whole token budget and left no answer (finish_reason length)' : r.error };
                // a story instead of a player's turn: once, asked for the turn only
                const long = parsed.ok && !parsed.decision.stop && !/^\s*#/.test(parsed.decision.message) && parsed.decision.message.length > LONG_MESSAGE;
                const cause = exhausted ? 'reasoning_exhausted' : !r.ok ? 'http' : !parsed.ok ? 'invalid_json' : long ? 'long_message' : null;
                record({ turn, attempt, strategy, ms: r.ms, ok: r.ok, model: r.model, finish: r.finish, usage: r.usage, prompt_chars: messages.reduce((a, m) => a + m.content.length, 0), answer: r.content ?? null, reasoning_chars: r.reasoning ? r.reasoning.length : 0, cause, error: parsed.ok ? null : parsed.error, decision: parsed.ok ? parsed.decision : null });
                if (cause) causes.push(cause);
                if (parsed.ok && (!long || strategy === 'shorten' || attempt === 2)) {
                    notes.push({ turn, ...parsed.decision });
                    return parsed.decision;
                }
                if (long) {
                    strategy = 'shorten';
                    messages = [...full, { role: 'assistant', content: r.content }, { role: 'user', content: `Your message is ${parsed.decision.message.length} characters of story, not a player's turn. Write only what ${username} does or says now, usually one short sentence, and answer with the JSON object again.` }];
                    continue;
                }
                if (exhausted) {
                    // a smaller prompt and a cooler temperature, then the smallest one
                    strategy = attempt === 0 ? 'short' : 'minimal';
                    temp = Math.min(temperature, attempt === 0 ? 0.4 : 0.2);
                    messages = [{ role: 'system', content: system }, { role: 'user', content: shortTurnPrompt(view, notes, { turn, maxTurns, milestone, minimal: strategy === 'minimal' }) }];
                    continue;
                }
                if (!r.ok) { await sleep(backoffMs * (attempt + 1)); continue; }
                strategy = 'repair';
                messages = [...full, ...(r.content ? [{ role: 'assistant', content: r.content }] : []), { role: 'user', content: `That answer could not be used: ${parsed.error}. Answer again with only the JSON object.` }];
            }
            const why = causes.every((c) => c === 'reasoning_exhausted')
                ? `the model spent its whole budget (${maxTokens} tokens) on reasoning in all 3 attempts (finish_reason length, no answer), also with the shorter prompts`
                : `no usable decision after 3 attempts (${causes.join(', ')})`;
            return { message: '', milestone: null, intent: null, stop: true, stop_reason: `player failure: ${why}`, observations: null, harness: true, causes };
        },
    };
}

// ------------------------------------------------------------------------------------------------ reasoning settings
// the request fields that steer a model's reasoning, as SillyTavern's custom source sends them from the profile
// (custom_include_body, and the preset's reasoning_effort); nothing else of the include body is taken for the player
export const REASONING_KEYS = ['reasoning_effort', 'clear_thinking', 'thinking', 'enable_thinking', 'reasoning', 'include_reasoning', 'chat_template_kwargs'];

/** A YAML include body as SillyTavern keeps it ("key: value" lines, one level of nesting), as an object. */
export function parseIncludeBody(text) {
    const out = {};
    let parent = null;
    const value = (v) => {
        const t = v.trim();
        if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true';
        if (/^null$/i.test(t) || t === '~') return null;
        if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
        return t.replace(/^(["'])(.*)\1$/, '$2');
    };
    for (const raw of String(text || '').split(/\r?\n/)) {
        if (!raw.trim() || raw.trim().startsWith('#')) continue;
        const m = /^(\s*)([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(raw);
        if (!m) continue;
        const [, indent, k, v] = m;
        if (indent.length && parent) { out[parent] = { ...(typeof out[parent] === 'object' && out[parent] ? out[parent] : {}), [k]: value(v) }; continue; }
        if (!v.trim()) { parent = k; out[k] = {}; continue; }
        parent = null;
        out[k] = value(v);
    }
    return out;
}

/**
 * The player's reasoning fields. setting: "profile" (default: the fields the game's own requests carry, taken only when
 * the player calls the game's endpoint with the game's model, where they are known to work), "none", or an object.
 * Returns {body, source, keys, note}; never a key or a header.
 */
export function playerReasoning(imp, player = {}) {
    const setting = player.reasoning ?? 'profile';
    if (setting && typeof setting === 'object') return { body: { ...setting }, source: 'config', keys: Object.keys(setting), note: 'player.reasoning in live.config.json' };
    if (setting === 'none') return { body: {}, source: 'none', keys: [], note: 'player.reasoning "none"' };
    const route = imp?.route?.runner || {};
    const same = (!player.url || player.url === route.url) && (!player.model || player.model === route.model);
    if (!same) return { body: {}, source: 'none', keys: [], note: 'the player uses another endpoint or model than the game: the profile\'s reasoning fields are not sent to it (set player.reasoning to send some)' };
    const body = {};
    const gen = imp?.generation?.reasoning_effort;
    if (imp?.source === 'custom' && gen && gen !== 'auto') body.reasoning_effort = gen;
    const include = parseIncludeBody(imp?.connection?.custom_include_body || '');
    for (const k of REASONING_KEYS) if (include[k] !== undefined) body[k] = include[k];
    const keys = Object.keys(body);
    return { body, source: keys.length ? 'profile' : 'none', keys, note: keys.length ? 'as the game\'s own requests carry them (custom_include_body and the preset\'s reasoning_effort), same endpoint and model' : 'the profile sends no reasoning fields' };
}

/**
 * The scripted player: the guide's steps in order. A step {say, until, max, milestone} says its text (a list: one after
 * the other, the last again); with `until` (a regular expression over the newest messages' visible text) it stays on
 * the step until the screen shows it, at most `max` times, then the run stops as blocked.
 */
export function scriptedPlayer({ steps }) {
    let i = 0;
    let n = 0;
    const notes = [];
    const lastText = (view) => view.messages.filter((m) => !m.user).slice(-3).map((m) => m.text).join('\n');
    return {
        name: 'scripted',
        describe: () => ({ type: 'scripted', steps: steps.length }),
        notes,
        async decide(view, { turn }) {
            while (i < steps.length) {
                const st = steps[i];
                if (n > 0 && (!st.until || new RegExp(st.until, 'i').test(lastText(view)))) { i += 1; n = 0; continue; }
                if (n >= (st.until ? st.max ?? 6 : 1)) return { message: '', milestone: st.milestone || null, intent: null, stop: true, stop_reason: `blocked: step ${i + 1} (${st.milestone || 'no milestone'}) did not reach /${st.until}/ in ${n} tries`, observations: null };
                const says = Array.isArray(st.say) ? st.say : [st.say];
                const message = says[Math.min(n, says.length - 1)];
                n += 1;
                const d = { message, milestone: st.milestone || null, intent: st.intent || null, stop: false, stop_reason: null, observations: null };
                notes.push({ turn, ...d });
                return d;
            }
            return { message: '', milestone: null, intent: null, stop: true, stop_reason: 'done', observations: null };
        },
    };
}
