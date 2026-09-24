# Eigener Erzähl-Layer „Avereth Narrator“ und A/B/C-Vergleich (24.09.2026)

**Stand:**
- Layer, Preset und Vergleichswerkzeug sind fertig und getestet.
- Das Preset ist in echtem SillyTavern 1.19.0 geprüft.
- **Ergebnisse mit GLM fehlen noch.** In dieser Umgebung gibt es keinen API-Schlüssel. Den Aufruf für deinen Rechner findest du in Abschnitt 3.4.

**Vorgeschichte:** [MEGUMIN_ANALYSE.md](MEGUMIN_ANALYSE.md). Der Entwurf v0 dort (§6) ist durch diesen Stand ersetzt.

## 1. Der Layer

Der Layer regelt nur die Darstellung. Der Vertrag weist Prosa, Dialog, NPC-Stimme, Tempo und Darstellung ausdrücklich dem Erzähl-Layer zu. Regeln, Welt, Wissen und Spielstand kommen aus Vertrag, Lorebook und Engine-Block. Nichts davon steht hier noch einmal.

### 1.1 Stil: Main Prompt, erste Nachricht (1.921 Zeichen, ≈ 434 Token)

```
AVERETH NARRATOR — STYLE
This part only sets how the story is written. Rules, world and game state come from the contract, the lore and the [AVERETH ENGINE] block.

Write in English, third person, past tense.

Prose
- Render scenes through concrete action, sensation and detail, and let the reader infer feelings and meaning instead of naming them.
- Prefer specific things to generic ones, and use more senses than sight: sound, smell, temperature, touch.
- Vary sentence length and openings. One precise adjective beats three.
- Background enters through the scene (a remark, an object, a habit), not as a summary.
- Open with the world's response to the player's message instead of restating what Alaric just did or said.
- Let length follow the moment: a short exchange stays short; a new place or a turning point may run to about 350 words.
- Plain story text only: no headings, lists, menus of options or out-of-character notes.

People and dialogue
- Give each person a recognisable way of speaking, shaped by background and mood, and keep it consistent.
- Dialogue sounds spoken: uneven lines, interruptions, self-corrections, everyday words. Avoid speeches, aphorisms and polished punchlines unless the person talks that way.
- Strong emotion roughens speech; a calm, practised speaker stays clear.
- People answer from their own interests and temperament: they do not explain their motives unprompted, and they are not evasive by default.
- When someone's mood or stance shifts, the reader can see why.

Avoid
- "not X, but Y" framing; naming feelings with felt, realized, knew or sensed; stock phrases such as "a breath he didn't know he was holding", "silence stretched" or "the air grew heavy".
- Repeating a gesture, image or description from the last two replies.

Tone
- Mature fantasy: violence, injury and death are shown plainly, without disclaimers or moralizing. Intimate content only between adults.
```

### 1.2 Output-Vertrag: Post-History, letzte Nachricht (190 Zeichen, ≈ 43 Token)

```
OUTPUT FORMAT (final instruction): the story text, then exactly one <avereth>{…}</avereth> fact report as the [AVERETH ENGINE] block defines it ({} if nothing new). Nothing after </avereth>.
```

**Wozu der Output-Vertrag:** Er beschreibt nur das Format. Was in den Report gehört, definiert weiter der Engine-Block.

**Token-Zählung:** Die Token sind mit dem Verhältnis der Test-5-Logs gerechnet, 4,43 Zeichen je GLM-Token.

**Was sich pro Anfrage ändert (die 9 Züge aus 3.3):**

| | Prompt im Mittel | Spanne |
|---|---:|---:|
| A (Megumin, wie geloggt) | 12,9k Token | 11,8–13,8k |
| B (Avereth Narrator) | 7,7k Token | 6,7–8,6k |
| C (ohne Stil) | 7,3k Token | 6,3–8,2k |

- Megumins Anteil lag bei ≈ 5,6k Token je Anfrage.
- B spart gegenüber A ≈ 5,2k Token (−40 %).

### 1.3 Was sich gegenüber dem Entwurf v0 geändert hat

| v0 | jetzt | Grund |
|---|---|---|
| „Feelings change slowly. Old slights … stay“ | „When someone's mood or stance shifts, the reader can see why.“ | Eine pauschale Trägheit ist eine Story-Regel. Verlangt ist nur, dass eine Änderung einen erkennbaren Grund hat. |
| „People seldom explain their motives. Asked directly, they dodge …“ | Menschen erklären ihre Motive nicht ungefragt und weichen nicht grundsätzlich aus. | Beides war eine Voreinstellung für jedes Gespräch. |
| „Give a name when someone matters or introduces themselves“ | entfällt | Keine Namenspflicht. Wann jemand einen Namen trägt, regeln Vertrag und Report. |
| „Stop where … something is still open“, „Vary the first beat“, „Put a small physical beat into any longer speech“ | entfällt | Keine Pflicht-Haken und keine Pflicht-Muster. |
| „Everyone lives their own day …“, „never into Alaric's mind“, „Failed attempts … as the engine resolved“ | entfällt | Das regeln Vertrag (Agency, NPC-Autonomie) und Engine schon. |
| Abschnitt SETTING (High Fantasy, Mittelalter, Mana) | entfällt | Das steht im Lorebook. |
| Post-History „BEFORE YOU WRITE: What did the engine resolve? …“ | entfällt | Das ist ein Denkschritt-Prompt. GLM denkt selbst (Reasoning low). |
| „Every scene carries at least one sense besides sight“ | „use more senses than sight“ | Eine Quote statt einer Richtung. |
| Längen 80–150 und bis 350 Wörter | nur noch „bis etwa 350“ für neue Orte und Wendepunkte | Die untere Zahl war ohne Beleg. |
| `squash_system_messages` an | aus | siehe 2.2 |

## 2. Das Preset `presets/Avereth Narrator.json`

### 2.1 Inhalt

**Prompt-Reihenfolge**, gleich für beide Prompt-Manager-Profile:

| # | Eintrag | Inhalt |
|---|---|---|
| 1 | Main Prompt | Stil (1.1), `forbid_overrides` |
| 2 | World Info (before), Char Description, Char Personality, Scenario, World Info (after), Persona | Lorebook, Vertrag, Alaric |
| 3 | Chat Examples, Chat History | leer, Verlaufsfenster der Engine |
| 4 | *(Engine-Block, Injektion Tiefe 0)* | steht am Ende des Verlaufs |
| 5 | Post-History Instructions (`jailbreak`) | Output-Vertrag (1.2), `forbid_overrides` |

- NSFW- und Enhance-Definitions-Prompt sind leer und aus.
- Keine `<character_sheet>`-, `<user_persona>`- oder `<history>`-Hülle.
- Keine Zeile „never stop or refuse“.
- `forbid_overrides` an Stil und Output-Vertrag: Kein System-Prompt und keine Post-History-Anweisung einer Karte kann sie ersetzen.

**Einstellungen, alle wie in Test 5:**
- temperature 0,9, top_p 0,95;
- Penalties 0, top_k, top_a und min_p 0;
- Max Response 4.096;
- Streaming aus;
- Namen „Default“ (0) wie im Megumin-Preset, Continue-Prefill aus;
- `new_chat_prompt` „[Start a new Chat]“;
- Kontext 131.072. Das ist nur die Obergrenze; der Prompt liegt bei 7–9k.

### 2.2 Bewusst nicht im Preset

**`squash_system_messages` bleibt aus.**
- Die SillyTavern-Doku führt das Feld als veraltet, zugunsten von Prompt Post-Processing.
- In 1.19.0 funktioniert es noch und verbindet aufeinanderfolgende System-Nachrichten mit `\n`.
- Gebraucht wird es nicht. Megumin brauchte es für seine Hüllen.

**Prompt Post-Processing und Zusatzparameter bleiben, wie sie sind.**
- Beides sind Einstellungen der Verbindung, nicht des Presets (`custom_prompt_post_processing`, `custom_include_body`).
- Ein Preset-Wechsel ändert sie nicht, solange „Bind preset to connection“ aus ist.
- Voraussetzung ist Post-Processing **None**, wie in Test 5: Die geloggten Anfragen haben System-Nachrichten mitten im Verlauf.

**`clear_thinking` und `reasoning_effort` kommen aus den Zusatzparametern.**
- Für einen Custom-Endpunkt leitet SillyTavern 1.19.0 das Reasoning Effort des Presets nur für OpenAI-Reasoning-Modelle und KoboldCpp weiter (`src/endpoints/backends/chat-completions.js`), für GLM also nicht.
- Das `reasoning_effort: "low"` in den Test-5-Anfragen kam deshalb aus den Zusatzparametern der Verbindung (Additional Parameters), genau wie `clear_thinking: true`:
  ```
  clear_thinking: true
  reasoning_effort: low
  ```
- Das Preset trägt trotzdem `reasoning_effort: low`. Bei Quellen, an die SillyTavern es weiterleitet, stimmt es dann ebenfalls.

### 2.3 Avereth-Testprofil ohne Megumin

**Einrichten:**
1. **Preset importieren:**
   - Panel „AI Response Configuration“ → Chat Completion Presets → Import → `presets/Avereth Narrator.json`;
   - dann „Avereth Narrator“ auswählen.
2. **Megumin-Extension ausschalten:**
   - Extensions → Manage extensions → Megumin Suite → aus. Die Seite lädt neu.
   - SillyTavern lädt das Skript einer ausgeschalteten Extension nicht. Damit entfallen ihr `generate_interceptor` (`megumin_memory_intercept`), ihr `CHAT_COMPLETION_PROMPT_READY`-Handler und ihre Hintergrundaufgaben.
3. **Regex prüfen:**
   - Megumins 11 Regex-Skripte stecken im Megumin-Preset (`extensions.regex_scripts`). Mit dem Avereth-Preset sind sie nicht aktiv.
   - Unter „Preset Scripts“ steht mit dem Avereth-Preset nichts.
   - Unter „Global Scripts“ sollen nur die zwei Avereth-Skripte stehen.
4. **Verbindung unverändert lassen:** Custom, GLM, Zusatzparameter wie oben, Post-Processing None.
5. **Erste Anfrage im Server-Log prüfen:**
   - Die erste Nachricht beginnt mit `AVERETH NARRATOR — STYLE`, die letzte mit `OUTPUT FORMAT (final instruction)`, die vorletzte mit `[AVERETH ENGINE`.
   - Kein `<character_sheet>`.

**Rückweg:** Megumin Suite wieder einschalten (die Seite lädt neu) und das Megumin-Preset wählen. Nichts wurde gelöscht. Megumins eigene Presets tragen seine Sampler, Regex und Prompts.

**Die Report-Nachforderung ist nicht betroffen.**
- Sie läuft über `generateRaw`, ohne Preset-Prompts.
- Der Live-Smoke prüft das: Keine Nachforderung enthält Stil oder Output-Vertrag.

### 2.4 Geprüft in echtem SillyTavern 1.19.0

**Aufruf:**
```
AVERETH_ST_DIR=/pfad/zu/SillyTavern AVERETH_ST_PRESET="Avereth Narrator" npm run smoke:st
```

**Ablauf:**
- Derselbe Lauf wie der Live-Smoke ([RUNTIME_V3.md §8](RUNTIME_V3.md#8-browser-smoke)).
- Das Preset ist in der UI gewählt, wie ein Spieler es tut.
- Die Zusatzparameter der Verbindung stehen wie in Test 5.

**Ergebnis:** **LIVE SILLYTAVERN SMOKE (Avereth Narrator): OK**, 21 von 21 Prüfungen. Dazu gehören die 18 bisherigen und diese drei:

| Check | Ergebnis |
|---|---|
| jede Story-Anfrage: Stil zuerst, Engine-Block vorletzte, Output-Vertrag letzte Nachricht, Vertrag als eigene System-Nachricht, kein Megumin-Text | ✓ |
| Parameter jeder Story-Anfrage exakt wie in Test 5: `temperature 0.9, max_tokens 4096, stream false, presence/frequency_penalty 0, top_p 0.95, clear_thinking true, reasoning_effort low` | ✓ |
| die Nachforderung enthält weder Stil noch Output-Vertrag | ✓ |

**Erste Story-Anfrage des Laufs:**
```
system    (1921)  AVERETH NARRATOR — STYLE …
system    (3406)  CLASS FRAMEWORK [CANON] …                        (World Info)
system   (18425)  AVERETH RPG — SANDBOX NARRATOR CONTRACT …        (Karte)
system      (18)  [Start a new Chat]
assistant  (188)  SYSTEM INITIALIZATION COMPLETE …
user        (50)  *I walk up to the city gate and nod to the guard.*
system    (3735)  [AVERETH ENGINE — authoritative game state, turn 5. …
system     (190)  OUTPUT FORMAT (final instruction): …
```

**Der Smoke ohne Preset bleibt, wie er war:** 18 von 18, mit Streaming.

**Zwei Befunde beim Einbau:**
- **ST-Preset „Default“:** Es hat `openai_max_context: 4095`. Wählt man es aus, fallen Karte und Verlauf aus dem Prompt. Der normale Smoke wählt deshalb weiter kein Preset. `setup.mjs` setzt nur dessen Prompts zurück, damit ein früherer Preset-Lauf nicht nachwirkt.
- **Reihenfolge:** Das Preset wird erst nach dem Verbinden gewählt. Vorher brach ein Statuscheck den anderen ab (AbortError in `openai.js`).

## 3. Das A/B/C-Werkzeug `tools/narrator_ab.mjs`

### 3.1 Was es tut

**Varianten:** Die geloggten Test-5-Anfragen gehen erneut an die API, in drei Varianten.

| Variante | Nachrichten |
|---|---|
| **A** | die Anfrage exakt wie geloggt (Megumin nach Checkliste) |
| **B** | Stil · Lore · Vertrag · (Lore after) · Persona · „[Start a new Chat]“ · Verlauf mit Spielerzug · Engine-Block · Output-Vertrag |
| **C** | B ohne die Stil-Nachricht |

**Was byte-gleich bleibt:**
- Lore, Vertrag, Persona, Verlauf, Spielerzug und Engine-Block stehen in A, B und C mit demselben Text.
- Alle Parameter sind gleich: Modell, temperature, top_p, max_tokens, Penalties, `clear_thinking`, `reasoning_effort`. Sie werden aus dem Log kopiert.
- `stream` ist immer false.

**Was sich unterscheidet:**
- Megumins Anteil ist ersetzt: sein Stiltext, der Denkschritt-Prompt im Verlauf, die Hüllen und die Schlusszeile.
- Die Nachrichtengrenzen folgen den Layern. A bleibt, wie Megumin es zusammengefügt hat. B und C sind getrennt wie im neuen Preset, das zeigt 2.4.

**C enthält auch Persona und „[Start a new Chat]“.** Beides ist kein Stil. Ohne sie würde C sich in zwei Punkten mehr von B unterscheiden.

**Abbruch statt Raten:** Stimmt eine Markierung nicht, bricht das Werkzeug ab. Das gilt für jede Anfrage, die nicht die Form der Test-5-Logs hat.

### 3.2 Dry-Run: Prüfungen je Zug

**Mit `--dry-run` geht nichts an die API.** Je Zug zeigt das Werkzeug:
- die Nachrichten von A, B und C mit Länge und geschätzten Token;
- acht Prüfungen:
  1. Lore, Vertrag und Persona stehen wörtlich in A;
  2. der Engine-Block steht wörtlich in A;
  3. der Verlauf ist identisch, bei A ohne den Denkschritt-Prompt;
  4. die Spielernachricht ist identisch;
  5. die Parameter sind identisch;
  6. B und C unterscheiden sich nur in der Stil-Nachricht;
  7. der Output-Vertrag ist die letzte Nachricht von B und C, nach dem Engine-Block;
  8. B und C enthalten keinen Megumin-Text.
- den Engine-Zustand (3.3);
- das Engine-Urteil über die tatsächlich geloggte Antwort, also A aus dem Lauf.

**Weitere Optionen:** `--write <Ordner>` schreibt die 27 Request-Bodies als JSON, zum Vergleichen mit `diff`. `--turns all` nimmt alle Erzähler-Anfragen statt der neun Standardzüge.

### 3.3 Der Engine-Zustand kommt aus der Chat-Datei

**Problem mit dem Replay:**
- Die Engine hat sich seit den Läufen geändert. Spielt man den Lauf mit der heutigen Engine nach, weicht der Zustand ab.
- Ein Beispiel: Der Report aus Zug 8 von Lauf 1 war damals kaputt und ist heute lesbar. Der Replay steht deshalb in Zug 9 im Keller nach dem Kampf, der geloggte Engine-Block aber in der Gildenhalle mit „needs a target: Brissa or the woman …“.
- Gegen diesen Zustand geprüft, hätte jede Variante falsche „Widersprüche“ bekommen.

**Lösung: die Chat-Datei des Laufs (`--chat`).**
- Sie enthält die damals aufgezeichneten Events.
- Das Werkzeug nimmt den Chat bis zur Spielernachricht des Zugs und prüft jede Antwort mit `processReply`, dem Weg der Extension.
- Aus diesem Zustand rendert die heutige Engine die geloggten Blöcke. Drei sind byte-gleich. Bei den übrigen sechs weichen 3–11 Zeilen ab, und nur in der Darstellung: das „ true“ hinter zwei Fakten (seither behoben), „(the fact report is still due)“ und die Schlusszeile des Engine-Blocks. Der Dry-Run listet die abweichenden Zeilen.

**Prüfung vor dem Lauf:**
- Beginnt der neu gerenderte Block nicht mit Zug, Zeit und Ort des geloggten, gilt der Zug als nicht bereit.
- Der Dry-Run meldet dann ✗, und der Live-Lauf startet nicht.
- Ohne Chat-Datei gibt es nur die Textmetriken.

### 3.4 Aufruf auf deinem Rechner

Du brauchst die Server-Logs und die Chat-Dateien beider Läufe. Das sind dieselben Dateien, die du mir geschickt hast:
- Log 13:08 und 18:27;
- `Avereth Engine Test - 2026-09-24@13h08m53s137ms.jsonl` und `…@18h27m46s713ms.jsonl` aus `data/default-user/chats/…/`.

**1. Dry-Run (kostet nichts):**
```
cd avereth-engine
node tools/narrator_ab.mjs \
  --log "<Server-Log Lauf 13:08>" --chat "<Chat Lauf 13:08>.jsonl" \
  --log "<Server-Log Lauf 18:27>" --chat "<Chat Lauf 18:27>.jsonl" \
  --dry-run
```
Am Ende muss `DRY RUN: OK` stehen.

**2. Lauf.**
- Die Basis-URL ist dieselbe wie in SillyTavern unter Custom (OpenAI-compatible), also die Adresse, an die `/chat/completions` angehängt wird.
- Der Schlüssel wird nur aus der Umgebung gelesen und nirgends gespeichert.

```
export AVERETH_AB_API_BASE="<Basis-URL deines Anbieters, z. B. https://…/v1>"
read -rs AVERETH_AB_API_KEY && export AVERETH_AB_API_KEY   # Schlüssel eintippen, erscheint nicht im Verlauf
node tools/narrator_ab.mjs \
  --log "<Server-Log Lauf 13:08>" --chat "<Chat Lauf 13:08>.jsonl" \
  --log "<Server-Log Lauf 18:27>" --chat "<Chat Lauf 18:27>.jsonl" \
  --reps 3 --concurrency 2 --out narrator_ab_out
```
(Windows PowerShell: `$env:AVERETH_AB_API_BASE="…"; $env:AVERETH_AB_API_KEY="…"`, Zeilen mit `` ` `` statt `\` fortsetzen.)

**Umfang bei 9 Zügen × 3 Varianten × 3 Durchgängen:**
- 81 Anfragen;
- ≈ 750k Input-Token und ≈ 45k Output-Token;
- bei ≈ 35 s je Anfrage und zwei parallelen Anfragen ≈ 25 Minuten.

Mit `--reps 2` ist es ein Drittel weniger.

**Ausgabe in `narrator_ab_out/`** (steht in `.gitignore`):

| Datei | Inhalt |
|---|---|
| `summary.md` | Metriken je Variante (3.5) |
| `results.json` | jede Antwort mit Text, Reasoning, Usage und Metriken |
| `blind.html` | Blindvergleich, im Browser öffnen |
| `blind_key.json` | Zuordnung X/Y/Z → A/B/C; **erst nach dem Bewerten öffnen** |

### 3.5 Metriken

**Automatisch gezählt, je Variante:**

| Metrik | Definition |
|---|---|
| Report da | die Antwort enthält `<avereth>` (erster Anlauf, keine Nachforderung) |
| genau einer | genau ein `<avereth>` |
| lesbar | die Engine liest den Report (`extractReport`, mit ihrer üblichen Reparatur) |
| JSON ohne Reparatur | der Inhalt ist striktes JSON |
| Text nach `</avereth>` | nach dem letzten `</avereth>` steht noch Text |
| angenommen / abgelehnt Ø | Report-Teile, die die Engine im aufgezeichneten Zustand annimmt oder ablehnt |
| Alaric-Übergriff Σ | abgelehnt wegen PLAYER OWNERSHIP: Zahlen, Bewegen, Annehmen ohne Entscheidung des Spielers |
| Engine-Widerspruch Σ | abgelehnte Teile gegen Engine-Stand oder -Ausgang (Kampf, Tote, Würfel, System-only) und Korrekturen „Tracker drift“ und „Combat silence broken“ |
| Wissensleck Σ | abgelehnt, weil jemand etwas nicht gesehen haben kann oder weil es geheim ist |
| unbekannte Referenz Σ | ein Report-Teil nennt jemanden, den die Engine nicht kennt |
| Subjekt unaufgelöst Σ | ein angenommener Fakt hängt an keinem bekannten Wesen, Ort oder keiner Fraktion |
| neue benannte NPCs Σ | neu angelegte NPCs mit Namen; die Namen stehen in `results.json` |
| Prompt-, Output-, Reasoning-Token Ø | aus `usage`; Reasoning anteilig nach Zeichen |
| Wörter Ø | Länge der Erzählung ohne Report |
| Dauer | Median und Mittel in ms |

**Nicht automatisch:**
- **Korrekte, fehlende und erfundene Fakten über die Engine-Prüfung hinaus:** Dafür bräuchte jeder Zug eine Musterlösung. Die Engine-Prüfung fängt Erfindungen gegen den Zustand ab, fehlende Fakten sieht sie nicht.
- **Künstliche Haken und wieder aufgenommene Fäden; ob ein neuer NPC-Name nötig war:** Das ist Urteil, kein Muster. Dafür gibt es den Blindvergleich.
- **Prosa:** Keine Zahl entscheidet über die Prosa. `blind.html` zeigt je Zug und Durchgang:
  - Spielernachricht, Engine-Auflösung und vorige Antwort;
  - darunter die drei Antworten unter X, Y und Z, zufällig gemischt (Seed in `results.json`), mit dem Report aufklappbar.

**Entscheidungsregel:** wie in [MEGUMIN_ANALYSE.md §5](MEGUMIN_ANALYSE.md#5-empfehlung-und-nächste-schritte). B ersetzt A, wenn:
- die Report-Treue nicht schlechter ist;
- nicht mehr Engine-Verstöße vorkommen;
- die Prosa blind mindestens gleichauf liegt;
- die Länge nicht steigt.

C zeigt dabei, was der Stil-Layer überhaupt beiträgt.

### 3.6 Dry-Run auf den echten Logs

**Ergebnis:**
- 9 Züge aus 16 Anfragen beider Läufe;
- alle acht Prüfungen ✓ in allen Zügen;
- Engine-Zustand ✓ in allen Zügen: Zug, Zeit und Ort wie geloggt, T3, T5 und T7 byte-gleich;
- `DRY RUN: OK`.

**Die neun Standardzüge:**

| Zug | Art | A | B | C | geloggte Antwort (A im Lauf), Urteil der heutigen Engine |
|---|---|---:|---:|---:|---|
| T1 | Ankunft am Tor | 11,8k | 6,7k | 6,3k | Report lesbar; 11 angenommen |
| T2 | Dialog | 12,5k | 7,4k | 7,0k | kein Report |
| T3 | Dialog, Name genannt | 12,8k | 7,6k | 7,2k | kein Report |
| T4 | Bezahlen | 13,8k | 8,6k | 8,2k | Report lesbar; 11 angenommen |
| T5 | Registrierung | 13,1k | 7,9k | 7,5k | Report lesbar; 10 angenommen |
| T6 | Quest annehmen | 13,1k | 7,9k | 7,5k | kein Report |
| T7 | ruhiger Folgezug | 12,7k | 7,5k | 7,1k | kein Report |
| T8 | Weg in den Keller | 13,2k | 8,0k | 7,6k | Report lesbar; 9 angenommen |
| T9 | Angriff, die Engine fragt nach dem Ziel | 13,0k | 7,9k | 7,5k | kein Report |

**Hinweise zur Tabelle:**
- Bei A sind es die geloggten Prompt-Token. B und C sind mit dem Verhältnis Zeichen/Token derselben Anfrage geschätzt.
- In A haben 4 von 9 Antworten einen lesbaren Report. Der Report von T8 war im Lauf kaputt; die heutige Reparatur liest ihn.

## 4. Welche Megumin-Funktionen bewusst nicht übernommen wurden

| Funktion | Warum nicht |
|---|---|
| Denkschritt-Prompt (`## your thinking steps`, `<think>`-Vorgabe) | GLM denkt selbst (Reasoning low über die Zusatzparameter). Der Prompt kostete ≈ 800 Token; in Test 5 plante das Reasoning die Szene, den Report aber meist nicht. |
| Vorrang der `<config>` vor allem anderen | widerspricht der Autorität von Vertrag und Engine |
| Erzähler entscheidet über Erfolg und Misserfolg | Das tut die Engine (Würfel, Kampf). Der Erzähler erzählt, was aufgelöst ist. |
| Pflicht-Haken am Antwortende, Seeds, Wiederkehr ruhender Fäden, Quote für fremde Handlungsanteile | Story-Regie gegen die Sandbox-Regeln des Vertrags; erfindet Inhalte, die der Spieler nicht angestoßen hat |
| Namenspflicht für jede Figur | erzeugt unnötige benannte NPCs und Report-Rauschen |
| Pauschalregeln „Gefühle ändern sich langsam“, „NPCs weichen aus“ | ersetzt durch „ein Umschwung hat einen sichtbaren Grund“ und „weder ungefragt erklären noch grundsätzlich ausweichen“ |
| Memory, NPC-Bank, Story-Plan, Würfel-Add-on, `<Blocks>`-Tracker | ersetzt durch Engine-Karten, Verlaufsfenster, Engine-Würfel und HUD |
| Bann-Listen-Generator, Bann-Liste im Prompt | Ein Wort im Prompt zu nennen macht es eher wahrscheinlicher. Die Wortersetzung der Engine (`ledger=register`) wirkt auf den Text. |
| Bildgenerierung, Regelgenerator, Story-Config-UI | ungenutzt |
| 11 Regex-Skripte (Thinking-Box, Blocks-Anzeige, Tag-Reinigung) | Sie räumen Megumins eigene Tags auf. Ohne diese Tags gibt es nichts zu tun; `<think>` im Text parst SillyTavern selbst. Die zwei Avereth-Skripte bleiben. |
| Hüllen `<character_sheet>`, `<user_persona>`, `<history>`, Schlusszeile „never stop or refuse“ | Formatierung für Megumins Aufbau; die Reihenfolge des Prompt-Managers genügt. Die Schlusszeile stand hinter dem Engine-Block. |
| `squash_system_messages` | siehe 2.2 |
| Setting-Beschreibung | steht im Lorebook |

**Übernommen sind Handwerksprinzipien, in eigenen Worten** (Lizenz: [MEGUMIN_ANALYSE.md §7](MEGUMIN_ANALYSE.md#7-lizenz)):
- zeigen statt benennen, konkrete Details, mehr Sinne;
- Satzvariation, Hintergrund in der Szene, mit der Antwort der Welt beginnen;
- Länge nach dem Moment;
- eigene Stimmen, gesprochener Dialog;
- die Liste abgenutzter Wendungen;
- der Ton.

## 5. Kritische Prüfung der Vorgaben

**Übernommen, wie vorgeschlagen:**
- ein eigener, schlanker Layer ohne neue Story-Regie;
- kein Denkschritt-Prompt;
- Stil und Output-Vertrag getrennt, der Output-Vertrag als letzte Post-History-Nachricht;
- drei Arme, echte Anfragen als Fixtures, Dry-Run, Blindexport;
- der Schlüssel nur aus der Umgebung;
- kein Löschen von Megumin.

**Präzisiert oder anders gelöst:**
1. **`squash_system_messages`:**
   - Die Warnung stimmt: Das Feld ist in der Doku veraltet. In 1.19.0 funktioniert es aber noch.
   - Mein v0-Entwurf hatte es an; das war unnötig.
   - Post-Processing gehört zur Verbindung, nicht ins Preset.
2. **Reasoning Effort:**
   - Er lässt sich für GLM über Custom nicht im Preset setzen; SillyTavern leitet ihn dort nicht weiter.
   - Er kommt aus den Zusatzparametern der Verbindung. Wer nur das Preset wechselt, behält ihn.
   - Das ist so gewollt und im Live-Smoke belegt.
3. **Arm C:**
   - Wörtlich „nur Vertrag, Lore, Engine, Output-Vertrag“ fehlten Verlauf und Spielerzug; ohne sie ist kein Zug zu erzählen.
   - C behält außerdem Persona und „[Start a new Chat]“, damit B und C sich nur im Stil unterscheiden.
4. **Output-Vertrag:**
   - Er steht jetzt zuletzt, verifiziert in echtem ST.
   - Er ist aber nicht die einzige Report-Pflicht: Der Engine-Block endet schon mit `End EVERY reply with <avereth>{…}</avereth>`.
   - In Lauf 2 hat eine doppelte Pflicht (Megumin-Nachtrag plus Engine-Zeile) die Quote nicht gehoben: 2 von 6. Den großen Unterschied zu Testrun 4 machte das Reasoning (high: 12 von 15).
   - Ob die neue Position hilft, misst erst der Vergleich. Die Nachforderung bleibt das Sicherheitsnetz.
5. **Engine-Prüfung gegen den aufgezeichneten Zustand** statt gegen einen Replay: siehe 3.3. Ohne das wären Verstöße falsch gezählt worden.
6. **Wiederverwendung:**
   - `run_report.mjs` liefert den Log-Parser, die Output-Aufteilung, die Vertragsmarken und die Zug-Erkennung.
   - Die Engine-Prüfung ist `processReply`, der Weg der Extension.
   - Die Tests nutzen `tests/helpers.js`.
   - `testrun_compare.js` passt nicht: Es sind 47 Zeilen für Testrun v1 mit fest eingetragenen Token-Schätzungen der alten Architektur. Es liest keine Logs und hat keine Metriken.
7. **Beifang:** `run_report.mjs --replay` spielte die Charaktererstellung der Test-5-Fixtures nicht ein. Alle Engine-Blöcke waren deshalb leer (0 Zeichen). Das ist behoben und hat einen Regressionstest.

## 6. Tests

**`tests/unit/narrator_ab.test.js`:** 8 Tests.
- Die Zerlegung einer Anfrage in Test-5-Form: Megumin-Teile als Platzhalter, echter Vertrag.
- Der exakte Aufbau von B und C.
- Die Ablehnung fremder Formen und das Erkennen manipulierter Varianten.
- Die Preset-Invarianten.
- Die Report-Metriken, dazu das Engine-Urteil im aufgezeichneten Zustand des Tor-Zugs aus Lauf 1: bezahlter Bestechungsbetrag, unbekanntes Subjekt, neuer benannter NPC.
- Der Engine-Zustand aus der Chat-Datei samt Kopfprüfung.
- Der Blindexport: gleicher Seed ergibt gleiche Reihenfolge, keine Variantennamen im HTML.
- Der vollständige CLI-Lauf gegen einen lokalen Mock-Server:
  - der Dry-Run mit ✓, mit ✗ und ohne Chat;
  - 6 Anfragen mit identischen Parametern, A exakt wie geloggt;
  - alle Ausgabedateien geschrieben, der Schlüssel in keiner Datei.

**`tests/unit/run_report.test.js`:** 1 neuer Test, der Replay mit Charaktererstellung.

**Gesamt:** 215 von 215 grün. Dazu kommen der Browser-Smoke und der Live-Smoke in beiden Modi.
