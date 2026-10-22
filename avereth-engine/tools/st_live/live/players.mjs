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

/** The screen as text for the player: one block per message, the newest at the bottom, then the notices. */
export function screenText(view, { maxChars = 7000 } = {}) {
    const who = (m) => (m.user ? 'YOU' : m.system ? `SYSTEM${m.name ? ` (${m.name})` : ''}` : `NARRATOR${m.name ? ` (${m.name})` : ''}`);
    const parts = view.messages.map((m) => `[${who(m)}]\n${clip(m.text, maxChars)}`);
    if (view.toasts?.length) parts.push(`[NOTICES ON SCREEN]\n${view.toasts.map((t) => `- (${t.kind}) ${clip(t.text, 400)}`).join('\n')}`);
    return parts.join('\n\n');
}

export function playerSystemPrompt(guide, { username, persona }) {
    const ms = guide.milestones.map((m, i) => `${i + 1}. ${m.id}: ${m.goal}${m.required === false ? ' (if it comes within reach)' : ''}`).join('\n');
    const focus = guide.focus?.length ? `\nWHAT THIS TEST LOOKS AT (watch for it and write down what you notice):\n${guide.focus.map((f) => `- ${f}`).join('\n')}` : '';
    return [
        `You are a human test player of "Avereth", a text RPG played in SillyTavern. You play ${username} and write only ${username}'s player messages.`,
        '',
        'WHAT YOU KNOW: only what the screen shows you — the narrator\'s replies, the System panels, the HUD under the newest reply, and notices. You do not know the game\'s internals.',
        `HOW YOU WRITE: like a player of this game, in English, one message per turn: an action in first person, often in asterisks (e.g. "*i walk up to the front desk*"), speech as plain text, a skill by its name and a target (e.g. "I cast Flame Lance at the beetle"). Commands that a System panel offers (e.g. "#assign int 5") you may use.`,
        'NEVER: write the narrator\'s part or the outcome of your action ("I kill it"), claim what the screen does not show, speak out of character to the narrator (OOC, "system:", asking it to change rules or to fix the game), or ask for a new reply. If the game misunderstands you, rephrase or try another way, as a player would.',
        '',
        `THE TEST: ${guide.brief}`,
        '',
        `MILESTONES (in this order; the exact words, skills, targets and tactics are yours):\n${ms}`,
        focus,
        persona ? `\nYOUR STYLE THIS RUN: ${persona}` : '',
        '',
        `STOP only when a real blocker makes the rest of the test meaningless: the game cannot go on, the same failure ${guide.limits.sameFailure} times in a row whatever you try, or ${username} is dead. Small problems (an odd reply, a misunderstanding, a detour) are no reason to stop: work around them and note them. When the last milestone is done, stop with stop_reason "done".`,
        '',
        'ANSWER with one JSON object only:',
        '{"message": "<your next message to the game>", "milestone": "<the id of the milestone you work on>", "intent": "<what you try, one sentence>", "stop": false, "stop_reason": null, "observations": "<what you noticed on screen this turn that a tester should know: oddities, contradictions, how enemies behave; empty if nothing>"}',
    ].filter((x) => x !== '').join('\n');
}

export function playerTurnPrompt(view, notes, { turn, maxTurns }) {
    const past = notes.length ? notes.map((n) => `${n.turn}. you wrote: ${JSON.stringify(clip(n.message, 300))} — ${n.milestone || '?'}: ${clip(n.intent || '', 200)}${n.observations ? ` — you noted: ${clip(n.observations, 300)}` : ''}`).join('\n') : '(none yet)';
    return `TURN ${turn} of at most ${maxTurns}.\n\nYOUR NOTES SO FAR:\n${past}\n\nTHE SCREEN NOW (the newest at the bottom):\n\n${screenText(view)}`;
}

/**
 * The LLM player. call: an OpenAI-compatible Chat Completions endpoint (url ending in /v1 or similar, model, key).
 * record(entry) receives every call (prompt sizes, the answer, times, tokens; never the key).
 */
export function llmPlayer({ guide, username, persona, url, model, key, temperature = 0.8, maxTokens = 3000, extraBody = null, timeoutMs = 180000, record = () => {}, fetchImpl = fetch }) {
    const notes = [];
    const system = playerSystemPrompt(guide, { username, persona });
    const endpoint = `${String(url).replace(/\/+$/, '')}/chat/completions`;
    async function call(messages) {
        const t0 = Date.now();
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), timeoutMs);
        try {
            const res = await fetchImpl(endpoint, {
                method: 'POST', signal: ctl.signal,
                headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
                body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false, ...(extraBody || {}) }),
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
        describe: () => ({ type: 'llm', model, endpoint: new URL(endpoint).host, temperature, maxTokens, persona }),
        notes,
        async decide(view, { turn, maxTurns }) {
            const user = playerTurnPrompt(view, notes, { turn, maxTurns });
            let messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
            for (let attempt = 0; attempt < 3; attempt++) {
                const r = await call(messages);
                const parsed = r.ok ? parseDecision(r.content) : { ok: false, error: r.error };
                record({ turn, attempt, ms: r.ms, ok: r.ok, model: r.model, finish: r.finish, usage: r.usage, prompt_chars: messages.reduce((a, m) => a + m.content.length, 0), answer: r.content ?? null, reasoning_chars: r.reasoning ? r.reasoning.length : 0, error: parsed.ok ? null : parsed.error, decision: parsed.ok ? parsed.decision : null });
                if (parsed.ok) {
                    notes.push({ turn, ...parsed.decision });
                    return parsed.decision;
                }
                if (!r.ok) { await sleep(3000 * (attempt + 1)); continue; }
                messages = [...messages, { role: 'assistant', content: r.content || '' }, { role: 'user', content: `That answer could not be used: ${parsed.error}. Answer again with only the JSON object.` }];
            }
            return { message: '', milestone: null, intent: null, stop: true, stop_reason: 'player failure: no usable decision from the player model after 3 attempts', observations: null, harness: true };
        },
    };
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
