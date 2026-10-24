// The run's report.md (docs/LIVE_RUNNER.md §9), in German like the live test reports: setup, result, the player's
// inputs, milestones, fights, quests, anomalies, performance, and the proof that the profile stayed untouched and no
// key reached the exports.
import { callStats } from './calls.mjs';
import { median, quantile, clip } from './lib.mjs';
import { routeText } from './import_profile.mjs';

const sec = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : '–');
const dur = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`; };
const tok = (v) => (Number.isFinite(v) ? Math.round(v) : '–');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const END_TEXT = {
    done: 'abgeschlossen: alle Pflicht-Etappen erreicht',
    player_done: 'vom Spieler als fertig gemeldet',
    player_stop: 'vom Spieler abgebrochen (Blocker)',
    defeat: 'Niederlage',
    stuck: 'abgebrochen: Etappe dauert zu lange',
    limit: 'abgebrochen: Limit erreicht',
    ui: 'abgebrochen: unerwarteter UI-Zustand',
    harness: 'abgebrochen: Fehler im Runner',
    narrator_empty: 'abgebrochen: leere Erzählerantwort in einem Story-Zug (kein Swipe, kein Regenerieren)',
    incomplete: '**unvollständig**: nicht alle Pflicht-Etappen von der Engine nachgewiesen',
};
const OUTCOME_TEXT = { story: 'Erzähler', system: 'System (Befehl)', engine: 'Engine (Menü/Rückfrage)', narrator_empty: '**leer**', missing: '**keine**' };

export function buildReport(x) {
    const { runId, stub, guide, player, end, ev, calls, setup, imp, git, build, st, browser, turnsLog, playerLog, driverNotes, toasts, pageErrors, serverErrors, protection, scan, files, startedAt, endedAt, instanceKept } = x;
    const L = [];
    const req = ev.milestones.filter((m) => m.required);
    L.push(`# Avereth Live-Test ${runId}`, '');
    if (stub) L.push('> **STUB-SELBSTTEST — kein echter Livetest.** Planner, Extraktor, Board und Erzähler antwortet ein Stub ohne Modell (tools/st_live/live/stub_provider.mjs). Geprüft wird nur der Runner: isolierte Instanz, Schlüsselweg, Logs, Exporte, Bericht.', '');
    L.push('## Kurzfassung', '');
    if (x.fixture) L.push(`- **FIXTURE:** ${cell(x.fixture)}, Seed ${x.seed} — Start Level 14; Vorgeschichte und alte Statzuweisungen sind synthetische Testdaten. Reload: ${x.fixtureReload === true ? 'bestanden' : x.fixtureReload === false ? 'fehlgeschlagen' : 'nicht durchgeführt'}.`);
    L.push(`- **Ergebnis:** ${END_TEXT[end.kind] || end.kind}${end.why ? ` — ${cell(end.why)}` : ''}`);
    L.push(`- **Etappen:** ${req.filter((m) => m.reached).length}/${req.length} Pflicht erreicht${ev.milestones.some((m) => !m.required) ? `, optional: ${ev.milestones.filter((m) => !m.required).map((m) => `${m.id} ${m.reached ? '✔' : '–'}`).join(', ')}` : ''}`);
    // Patch 8.4.2: what is open, and why: not reached (a blocker, the limit) or not performed (out of this run's reach)
    const open = req.filter((m) => !m.reached);
    if (open.length) L.push(`- **Offen:** ${open.map((m) => (m.unavailable ? `${m.id} (**nicht durchgeführt**: ${cell(m.unavailable)})` : `${m.id} (nicht erreicht)`)).join(' · ')}`);
    // Patch 9A: the campaign's ruleset (2: Warrior, Mage, Rogue; 1: the five legacy classes) and the character it made
    if (ev.character?.ruleset) L.push(`- **Charakter:** ${ev.character.class ? `${cell(ev.character.class)}${ev.character.skills.length ? ` (${ev.character.skills.map(cell).join(', ')})` : ''}` : 'nicht erstellt'} · Regelstand ${ev.character.ruleset}${ev.character.ruleset >= 2 ? ' (Warrior, Mage, Rogue)' : ' (Legacy, fünf Klassen)'}`);
    if (ev.dungeon) L.push(`- **Ziel-Dungeon:** ${cell(ev.dungeon.name || ev.dungeon.root)}, Ebene ${ev.dungeon.floor}${ev.dungeon.quest ? ` (Vertrag ${ev.dungeon.quest})` : ' (ohne Dungeon-Vertrag: der erste betretene)'}`);
    L.push(`- **Leitfaden:** ${guide.chain.join(' → ')} („${guide.title || guide.id}“)`);
    L.push(`- **Spieler:** ${player.type === 'llm' ? `LLM ${player.model} (${player.endpoint}, Temperatur ${player.temperature})${player.persona ? `, Stil: ${player.persona}` : ''}` : `regelbasiert (${player.steps} Schritte)`}`);
    L.push(`- **Züge:** ${turnsLog.length} · **Dauer:** ${dur(endedAt - startedAt)} · **LLM-Aufrufe der Engine/des Erzählers:** ${calls.length}`);
    const nIssues = ev.issues.length + pageErrors.length + toasts.filter((t) => t.kind === 'error' || t.kind === 'warning').length + turnsLog.filter((t) => !t.ok).length;
    L.push(`- **Auffälligkeiten:** ${nIssues}${ev.defeat ? ` · **Niederlage** in Zug ${ev.defeat.turn}: ${ev.defeat.why}` : ''}`);
    L.push(`- **Profil unverändert:** ${protection.unchanged ? 'ja' : '**nein**'} · **Geheimnis-Scan:** ${scan.hits.length ? `**${scan.hits.length} Treffer, geschwärzt**` : 'sauber'}`);
    L.push('');

    L.push('## Aufbau', '', '| | |', '|---|---|');
    L.push(`| Build (Erweiterung) | ${build} |`);
    L.push(`| Git | ${git ? `${git.commit}${git.branch ? ` (${git.branch})` : ''}${git.dirty.length ? ` — **nicht committete Änderungen:** ${cell(git.dirty.slice(0, 12).join(', '))}${git.dirty.length > 12 ? ' …' : ''}` : ' — sauber'}` : 'unbekannt'} |`);
    L.push(`| SillyTavern | ${st.version} (${cell(st.dir)}), isolierte Instanz auf Port ${st.port}, Start ${sec(st.startMs)} |`);
    L.push(`| Browser | ${browser.name} ${browser.version}${browser.headless ? ' (headless)' : ''} |`);
    if (imp.route) {
        L.push(`| Verbindung deines SillyTavern | ${cell(routeText(imp.route.profile))} |`);
        L.push(`| Verbindung des Laufs | ${cell(routeText(imp.route.runner, { keyFrom: x.keyEnv || 'Umgebungsvariable' }))} — ${imp.route.same ? 'dieselbe' : `**nicht dieselbe:** ${cell(imp.route.differences.join('; '))}`}${imp.route.reverseProxy && !imp.route.reverseProxy.used ? ` (reverse_proxy des Profils ohne Wirkung für Quelle „${imp.route.profile.source}“, nicht übernommen)` : ''} |`);
    } else L.push(`| Provider | Quelle ${setup.source}, ${setup.host || '?'}, Modell ${setup.model || '?'} |`);
    if (x.preflight) L.push(`| Preflight (GET /models) | ${cell(x.preflight.endpoint)}: ${x.preflight.models ? `${x.preflight.models.length} Modell(e) (${cell(x.preflight.models.join(', '))}), Modell ${x.preflight.found ? 'enthalten' : '**nicht enthalten**'}` : cell(x.preflight.error || '?')} |`);
    L.push(`| Preset | ${cell(imp.preset.name)} (${imp.preset.mode === 'repo' ? 'aus diesem Build' : 'aus dem Profil'})${imp.preset.unsaved.length ? `, ungespeicherte Werte in Gebrauch: ${imp.preset.unsaved.join(', ')}` : ''}${imp.preset.vsRepo.length ? `, weicht vom Build-Preset ab in: ${imp.preset.vsRepo.join(', ')}` : ', gleich dem Build-Preset'} |`);
    L.push(`| Generierung | Temperatur ${imp.generation.temp_openai ?? '?'}, max. Tokens ${imp.generation.openai_max_tokens ?? '?'}, Kontext ${imp.generation.openai_max_context ?? '?'}, Reasoning ${imp.generation.reasoning_effort ?? '?'} |`);
    L.push(`| Streaming | aus${imp.streaming ? ' (im Profil an: für das Log abgeschaltet, ändert keine Inhalte)' : ''} |`);
    const ps = x.playerSetup;
    if (player.type === 'llm' && ps?.reasoning) L.push(`| Spieler-Reasoning (wirksam) | ${ps.reasoning.keys.length ? ps.reasoning.keys.map((k) => `\`${k}\`=${cell(JSON.stringify(ps.reasoning.body[k]))}`).join(', ') : 'keine Felder'} — ${cell(ps.reasoning.note)}${ps.probe ? ` · Probe: ${ps.probe.ok ? `angenommen (finish ${ps.probe.finish}, Reasoning ${ps.probe.reasoningChars} Zeichen)` : cell(ps.probe.error)}` : ''}${ps.dropped ? ` · **${cell(ps.dropped)}**` : ''} · max. ${x.playerMaxTokens ?? 3000} Tokens |`);
    L.push(`| Karte | ${cell(setup.card)}: Begrüßung ${setup.greeting === 'profile' ? 'aus dem Profil' : 'des Runners'}, Beschreibung = Erzählervertrag dieses Builds${imp.card?.contract ? ` (im Profil: ${imp.card.contract})` : ''} |`);
    L.push(`| Lorebook | ${setup.world} aus diesem Build${imp.world ? ` (Profil verknüpft „${cell(imp.world.name)}“${x.worldSame === true ? ', inhaltsgleich' : x.worldSame === false ? ', **abweichend**' : ''})` : ''} |`);
    L.push(`| Engine-Einstellungen | ${imp.engineSettings ? cell(JSON.stringify(imp.engineSettings)) : 'Standard'} |`);
    if (imp.dropped.length) L.push(`| Nicht übernommen | ${cell(imp.dropped.map((d) => `${d.key}: ${d.why}`).join('; '))} |`);
    if (imp.warnings.length) L.push(`| Hinweise zum Import | ${cell(imp.warnings.join('; '))} |`);
    L.push(`| Kampagne | Chat „${cell(x.chatId)}“, Seed ${x.seed ?? '?'} |`);
    L.push('');

    L.push('## Etappen', '', '| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |', '|---|---|---|---:|---:|---:|');
    for (const m of ev.milestones) {
        const g = guide.milestones.find((y) => y.id === m.id);
        L.push(`| ${m.id} | ${m.required ? 'ja' : 'optional'} | ${m.reached ? '✔' : m.unavailable ? `– nicht durchgeführt: ${cell(m.unavailable)}` : '–'} | ${m.turn ?? ''} | ${m.at ?? ''} | ${g?.maxTurns ?? ''}${x.slow?.includes(m.id) ? ' (überschritten)' : ''} |`);
    }
    L.push('');

    L.push('## Spielereingaben', '', '| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |', '|---:|---|---|---|---|---|---|---:|');
    for (const t of turnsLog) {
        const evt = ev.turns[t.turn - 1];
        L.push(`| ${t.turn} | ${cell(clip(t.text, 140))} | ${OUTCOME_TEXT[t.outcome] || (t.ok ? '' : '–')} | ${cell(t.decision?.milestone || '')} | ${cell(clip(t.decision?.intent || '', 90))} | ${cell(evt?.placeName || evt?.place || '')} | ${evt ? `${evt.hp ?? '?'}/${evt.mp ?? '?'}` : ''} | ${sec(t.ms)}${t.ok ? '' : ` **${cell(t.problem)}**`} |`);
    }
    // Patch 8.4.1: what he noted before turn N is about the result of turn N−1 (the screen he decided on)
    const seen = new Map();
    for (const p of playerLog) if (p.decision?.observations) seen.set(p.turn, p);
    if (seen.size) {
        L.push('', '**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):', '');
        for (const [turn, p] of seen) L.push(`- ${turn === 1 ? 'zum Start' : `zu Zug ${turn - 1}`} (notiert vor ${turnsLog.some((t) => t.turn === turn) ? `Zug ${turn}` : 'dem Ende'}): ${cell(clip(p.decision.observations, 400))}`);
    }
    L.push('');

    L.push('## Kämpfe', '');
    if (!ev.encounters.length) L.push('Kein Kampf.', '');
    else {
        L.push('| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |', '|---|---:|---:|---|---|---:|---|');
        for (const e of ev.encounters) L.push(`| ${e.id} | ${e.turn} | ${e.foes.length} | ${e.stayedOut.length ? `${e.stayedOut.length} (${e.stayedOut.map((id) => `${id.split('_').pop()}: ${e.awareness[id] || '?'}`).join(', ')})` : '–'} | ${e.concealed ? 'ja' : 'nein'} | ${e.defeated?.length ?? '–'} | ${e.pcDead ? '**tot**' : e.pcEscaped ? 'geflohen' : e.ended != null ? `gewonnen${e.xp != null ? `, ${e.xp} XP` : ''}` : 'offen'} |`);
        L.push('');
    }

    L.push('## Quests', '');
    const mine = ev.quests.filter((q) => q.statuses?.length);
    if (!mine.length) L.push('Keine angenommen.', '');
    for (const q of mine) {
        L.push(`- **${cell(q.title || q.id)}** — ${q.statuses.map((s) => `${s.to} (Zug ${s.turn})`).join(' → ')}${q.ready != null ? ', READY' : ''}${q.dungeon ? `, Dungeon ${q.dungeon}${q.floor != null ? ` Ebene ${q.floor}` : ''}` : ''}`);
        if (q.task) L.push(`  - Aufgabe: ${cell(clip(q.task, 300))}`);
        if (q.end_state) L.push(`  - Endzustand: ${cell(clip(q.end_state, 300))}`);
    }
    L.push('');

    L.push('## Auffälligkeiten', '');
    const A = [];
    for (const t of turnsLog.filter((y) => !y.ok)) A.push(`Zug ${t.turn} (Runner/UI): ${t.problem}${t.dialogs?.length ? ` — Dialog: ${clip(t.dialogs.join(' | '), 300)}` : ''}`);
    for (const i of ev.issues) A.push(`Zug ${i.turn}, Nachricht ${i.at} (${i.kind}): ${i.text}`);
    for (const e of pageErrors.slice(0, 20)) A.push(`Seitenfehler: ${clip(e.text, 300)}`);
    for (const t of toasts.filter((y) => y.origin !== 'runner' && (y.kind === 'error' || y.kind === 'warning')).slice(0, 20)) A.push(`Hinweis (${t.kind}): ${clip(t.text, 300)}`);
    for (const t of toasts.filter((y) => y.origin === 'runner').slice(0, 5)) A.push(`Runner-Hinweis (dem Spieler nicht gezeigt): ${clip(t.text, 200)}`);
    // Patch 8.4.1: the player's own failures, by cause
    const causes = {};
    for (const p of playerLog) if (p.cause) (causes[p.cause] ||= []).push(p.turn);
    const CAUSE_TEXT = { reasoning_exhausted: 'Reasoning verbrauchte das ganze Tokenbudget ohne Antwort (finish_reason length)', invalid_json: 'keine gültige JSON-Entscheidung', http: 'HTTP-Fehler', long_message: 'Nachricht zu lang (Erzählung statt Spielerzug), einmal nachgefragt' };
    for (const [c, turns] of Object.entries(causes)) if (turns.length >= (c === 'long_message' ? 1 : 2) || c === 'http') A.push(`Spieler: ${turns.length}× ${CAUSE_TEXT[c] || c} (Züge ${[...new Set(turns)].join(', ')})`);
    for (const s of serverErrors.slice(0, 10)) A.push(`Server: ${clip(s.line, 300)}`);
    for (const n of driverNotes) A.push(`Einrichtung: ${n}`);
    const bare = calls.filter((c) => c.role === 'other');
    if (bare.length) A.push(`${bare.length} Chat-Completion-Aufruf(e) ohne Engine-Block und ohne Engine-Rolle (Nr. ${bare.map((c) => c.n).join(', ')}): hat SillyTavern den Engine-Block weggekürzt (Kontextgröße) oder lief eine fremde Generierung?`);
    const cut = calls.filter((c) => c.finish === 'length');
    if (cut.length) A.push(`${cut.length} Aufruf(e) mit finish_reason "length" (${cut.map((c) => `Nr. ${c.n} ${c.role}`).join(', ')})`);
    if (A.length) L.push(...A.map((a) => `- ${cell(a)}`)); else L.push('Keine.');
    const pc = ev.counts.panels;
    L.push('', `System-Panels: CLARIFY ${pc.clarify}, NOT TAKEN ${pc.not_taken}, REFUSED ${pc.refused}, BLOCKED ${pc.blocked}, FAILED ${pc.failed}. Zurückgewiesene Deltas: ${Object.entries(ev.counts.rejected).map(([k, v]) => `${k} ${v}`).join(', ') || 'keine'}.`, '');

    L.push('## Performance', '', '| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|');
    const st2 = callStats(calls);
    for (const [role, s] of Object.entries(st2)) L.push(`| ${role} | ${s.n} | ${s.repairs} | ${sec(median(s.ms))} | ${sec(quantile(s.ms, 0.9))} | ${tok(median(s.prompt))} | ${tok(median(s.cached))} | ${tok(median(s.completion))} | ${tok(median(s.reasoning))} | ${Object.entries(s.finish).map(([k, v]) => `${k} ${v}`).join(', ') || '–'} | ${s.empty} |`);
    L.push('');

    // the measured time of the run (no estimate): set-up, the game's part of each turn, the player's part, and what the
    // records say the game's part was spent on
    const tms = turnsLog.map((t) => t.ms);
    const dms = turnsLog.map((t) => t.decideMs);
    const sum = (xs) => xs.filter(Number.isFinite).reduce((a, b) => a + b, 0);
    const T = x.timing || { totalMs: endedAt - startedAt, setupMs: null, stStartMs: st.startMs, turns: turnsLog.length, gameMs: sum(tms), decideMs: sum(dms) };
    const per = T.turns ? (T.gameMs + T.decideMs) / T.turns : null;
    const part = (k) => sum(ev.turns.map((t) => t.perf?.[k]));
    L.push('## Laufzeit (gemessen)', '', '| | Zeit |', '|---|---:|');
    L.push(`| Gesamt (Start bis Ende des Spiels) | ${dur(T.totalMs)} |`);
    L.push(`| Einrichtung bis zum ersten Zug (davon SillyTavern-Start ${sec(T.stStartMs)}) | ${T.setupMs != null ? dur(T.setupMs) : '–'} |`);
    L.push(`| ${T.turns} Züge, Spiel (Senden bis HUD nach der Extraktion) | ${dur(T.gameMs)} — Median ${sec(median(tms))}, p90 ${sec(quantile(tms, 0.9))}, max ${sec(Math.max(0, ...tms.filter(Number.isFinite)))} |`);
    L.push(`| ${T.turns} Züge, Spieler-Entscheidung | ${dur(T.decideMs)} — Median ${sec(median(dms))}${playerLog.some((p) => p.error) ? `, ${playerLog.filter((p) => p.error).length} unbrauchbare Antworten` : ''} |`);
    L.push(`| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | ${dur(part('plan'))} / ${dur(part('board'))} / ${dur(part('narrator'))} / ${dur(part('extract'))} / ${dur(part('wait'))} |`);
    L.push(`| Ø je Zug (Spiel + Spieler) | ${per != null ? sec(per) : '–'} |`);
    if (per != null) L.push(`| Hochrechnung bei diesem Tempo | 40 Züge ≈ ${dur(40 * per)}, 80 Züge ≈ ${dur(80 * per)} (ohne Einrichtung) |`);
    L.push('');

    L.push('## Schutz und Geheimnisse', '');
    L.push(`- Aus dem Profil gelesen (nur lesend): ${imp.read.length} Dateien; danach ${protection.changedRead.length ? `**verändert: ${protection.changedRead.map((c) => `${c.file} (${c.why})`).join(', ')}**` : 'alle unverändert'}.`);
    L.push(`- Profilordner insgesamt (${protection.files} Dateien, Größe und Zeit): ${protection.tree.same ? 'unverändert' : `**Unterschiede**: ${protection.tree.added.length} neu, ${protection.tree.removed.length} entfernt, ${protection.tree.changed.length} geändert (${cell(clip([...protection.tree.added, ...protection.tree.changed, ...protection.tree.removed].slice(0, 8).join(', '), 600))}). Lief dein eigenes SillyTavern parallel? Der Runner schreibt dort nie.`}`);
    L.push('- `secrets.json` des Profils wurde nicht gelesen; der Schlüssel kam aus der Umgebungsvariable und lag nur in der isolierten Instanz, deren `secrets.json` am Ende gelöscht wurde.');
    L.push(`- Geheimnis-Scan des Laufordners (${scan.files} Textdateien): ${scan.hits.length ? `**${scan.hits.map((h) => `${h.file}: ${h.what} ×${h.count}`).join(', ')} — geschwärzt**` : 'kein Schlüssel, kein Bearer-Token, kein api_key-Feld'}.`);
    L.push(`- Isolierte Instanz: ${instanceKept ? `behalten unter ${cell(instanceKept)} (ohne secrets.json)` : 'gelöscht'}.`, '');

    L.push('## Dateien', '');
    for (const [f, what] of files) L.push(`- \`${f}\` — ${what}`);
    L.push('');
    return L.join('\n');
}
