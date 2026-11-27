# Avereth Engine .261 – Gesamtarchitektur, Effizienz und Beta-Reife

**Unabhängige Analyse von Claude** · 27.11.2026 · keine Produktimplementierung

| Bezug | Stand |
|---|---|
| Analysierter Produktstand | `experiment/211-openrouter-helper-single-runner` · [`4b637c98`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4b637c981459e1e5ff9f4bd480bc071723fe5bce) · Build `4.3.0-c.6.6.261` |
| Dokumentationsstand bei Beginn | `main` · [`d45a94ba`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d45a94ba9b12a4337c51150b676fc4f185686202) |
| Vorarbeiten | [.251-Analyse Stand 2](AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) · [GPT-Gegenreview](AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md) · [Abnahme .252–.260](AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md) · [Abnahme .261](AVERETH_261_EXTRACTOR_RECOVERY_ABNAHME.md) · [Performance-Forschung .203](performance_suite_203/) · [T7 Prompts, Kontext und Tokens](USER07_T7_PROMPTS_KONTEXT_UND_TOKENVERBRAUCH.md) · [HUD-Recherche](USER08_HUD_HANDEL_UND_STRUKTURIERTE_SPIELERAKTIONEN.md) |
| Eigene Offline-Skripte | [`claude_261_analyse/`](claude_261_analyse/) |

**Evidenzklassen in diesem Bericht:**

| Klasse | Bedeutung |
|---|---|
| **D** | Datenbelegt: in Originalarchiven gemessen oder in einem hier ausgeführten Offline-Lauf nachgewiesen. |
| **C** | Codebelegt: im Quelltext von `.261` nachvollzogen, ohne Laufzeitnachweis. |
| **R** | Plausibles Risiko: begründet, aber weder gemessen noch ausgeschlossen. |
| **A** | Akzeptiertes Restrisiko: bereits bewusst entschieden und dokumentiert. |

Jeder Vorschlag wird bewertet nach: Spielspaß, Stabilität, Token- und Zeitersparnis, Relevanz für höhere Ränge, Aufwand, Regressionsrisiko und Evidenzqualität. Die Skala ist jeweils `–`, `○`, `+`, `++`. Bei Aufwand und Regressionsrisiko heißt `+` „gering“ und `++` „sehr gering“.

---

## 1. Management Summary

**Kernaussage: Die bestehende Architektur ist für die Beta und für E-Rang tragfähig.** Eine Neuarchitektur empfehle ich nicht. Die Kette Planner → Engine → Narrator → Extractor → Firewall → Events → Fold trennt Autorität sauber. Sie ist inzwischen messbar effizient:

- **Streaming wirkt.** Der erste Prosatext erscheint im Median nach 6,4 s, p90 9,6 s (n = 148).
- **Prompt-Caching wirkt.** Gecacht werden im Median beim Planner 82 % des Prompts (11.520 von 14.013 Tokens), beim Extractor 74 % und beim Narrator 58 %.
- **Kontext wächst nicht.**
  - Der Narrator erhält immer 13 Nachrichten.
  - Der Katalog ist szenenbezogen und bleibt auch nach 127 Chatnachrichten bei etwa 10–13 KB.
  - Das vollständige Falten von 1.000 Events dauert etwa 7–14 ms.
- **Nach dem letzten sichtbaren Text wartet der Spieler im Median nur 0,4 s** bis zur Eingabebereitschaft. Spürbar wird es erst im Schwanz: p75 3,1 s, p90 5,3 s. Der Schwanz kommt im Wesentlichen aus zweiten Extractor-Anfragen.

Die eigentlichen Risiken vor weiterer Entwicklung liegen nicht in der Komplexität an sich, sondern an vier Stellen:

1. **Claim + State ist nicht natürlich nachgewiesen (D).** Seit `.251` gibt es keinen natürlichen Modelllauf. `.252–.261` sind nur durch die Node-Suite, Replay und isoliertes ST mit Fake-Provider abgesichert. Die gemessene Reduktion der Extractor-Anfragen von 132 auf 90 stammt aus Gegenproben, nicht aus echten Spielläufen. Usertest 17 ist deshalb die wichtigste nächste Evidenz.
2. **Das Regressionsnetz altert (D).**
   - Das Replay-Korpus stammt aus den Builds `.120–.125` (vor `CONTRACT_SINCE = .132`), die Baseline aus `.126`.
   - 1.392 der 2.235 Replay-Fälle (62 %) weichen inzwischen ab und sind nur noch per Manifest „exakt akzeptiert“.
   - Neue Pflichtfelder wie `population` und `life_stage` kennt das Korpus nicht. Daher verschwinden Wolf und Eber im aktuellen Produktpfad des Replays.
   - Folge: Das Replay erkennt Änderungen, aber zunehmend nicht mehr, ob sie fachlich richtig sind.
3. **E-Rang scheitert am Content, nicht am Code (C).**
   - Viele Mechaniken sind rangoffen gebaut: Rangbänder F–S, Gildenränge mit Beförderung, Skill-Rang E, E-Klassenentwicklung ab Level 15, Waffenwerte für Rang E, relative Rollenspannen in Living Dungeons.
   - Die Welt erzeugt aber fest nur F-Begegnungen: Die `encounter_windows` enden bei Level 14, `validEncounterLevels` lehnt alles andere ab.
   - Alle drei Dungeons haben höchstens Rang E.
   - D–S-Klassen und D–S-Skills sind bewusst nicht implementiert.
   - Das Fehlende sind Kanon- und Contententscheidungen des Nutzers, keine Architekturarbeit.
4. **`world.js` ist der Kopplungs-Hotspot (D/C).**
   - 4.008 Zeilen, 313 KB, 44 Importe.
   - Allein dort stehen 41 Ruleset- und 79 C-Pfad-Verzweigungen.
   - Das ist kein akuter Fehler, aber der Ort, an dem künftige Funktionen am teuersten und riskantesten werden.

**Empfehlung (Kurzform):**

- **A (vor weiterer Entwicklung):** Usertest 17 mit `.261` als natürlicher Nachweis von Claim + State, danach ein neues Replay-Korpus aus `.25x/.26x`-Originalen. Beides ist Messung und Absicherung, kein Umbau.
- **B (parallel):** E-Rang-Kanonvorlage für den Nutzer (Begegnungsfenster E, E-Gebiete und -Dungeons, Rüstungswerte E, XP-Tempo) und ein Altpfad-Rückbau von Ruleset 1, Pfad A und V3-Kampagnen in Etappen.
- **C (vor/während Beta):**
  - die Chatspeicher-Diät: 37 % des Chatfiles sind Swipe-Kopien, 13 % `display_text`;
  - Entflechtung von `world.js` entlang bestehender Domänengrenzen;
  - Rückbau der historischen Replay-Manifeste.
- **D (nicht empfohlen):**
  - Rollen zusammenlegen;
  - Prompt-Kürzung auf Verdacht (die `.203`-Forschung zeigte keinen Zeitgewinn);
  - Event-Snapshots;
  - eine neue Gesamtarchitektur.

---

## 2. Architektur (Untersuchung A)

### 2.1 Größe und Struktur

Messung mit [`graph.py`](claude_261_analyse/graph.py) über `src/` und `index.js` (D):

- 101 Dateien, 37.610 Zeilen, 2,79 MB.
- Die größten Module:

| Modul | Zeilen | KB | Fan-out | Rolle |
|---|---:|---:|---:|---|
| `src/v4/world.js` | 4.008 | 313 | 44 | Delta-Annahme, Firewall-Folgen, Weltregeln für Personen, Orte, Reisen, Handel und Party |
| `src/v4/commands.js` | 2.215 | 192 | 38 | Engine-Kommandos des Planner-Pfads |
| `src/v4/planner.js` | 1.134 | 112 | 26 | Planner-Prompt und Kommandoschema |
| `src/context.js` | 1.184 | 110 | 28 | Narrator-Kontext, Engine-Block |
| `src/v4/guild.js` | 1.349 | 108 | 15 | Gilde, Board, Verträge, Beförderung |
| `src/combat.js` | 1.671 | 105 | 20 | V3-Kampfauflösung, auch live |
| `src/v4/runtime.js` | 1.427 | 99 | 38 | ST-Lebenszyklus, Generate-Barriere, Recovery |
| `src/engine.js` | 1.268 | 93 | 34 | V3-Engine: `#`-Kommandos, Erstellung, Kampf, Schleichen |
| `src/delta.js` | 1.040 | 77 | 10 | V3-Delta-Anwendung |
| `src/v4/living.js` | 1.028 | 68 | 4 (Fan-in 15) | Living Dungeons |
| `index.js` | 962 | 57 | 17 | ST-Ereignisverdrahtung |
| `src/v4/extract.js` | 729 | 56 | 11 | Extractor-Prompt, Parsen, Recovery |

Module mit hohem Fan-in: `domain.js` (27), `items.js` (19), `trade.js` (16). Das sind gesunde Basismodule. `world.js` dagegen hat einen hohen Fan-out. Es ist ein Orchestrator, der zu viel selbst entscheidet.

### 2.2 Lebenszyklus in SillyTavern (C)

`index.js` registriert die folgenden ST-Ereignisse:

- `MESSAGE_RECEIVED`, `STREAM_TOKEN_RECEIVED`;
- `GENERATION_STARTED`, `GENERATION_ENDED`, `GENERATION_STOPPED`;
- `CHAT_COMPLETION_SETTINGS_READY`, `GENERATION_AFTER_COMMANDS`;
- `MESSAGE_EDITED`, `MESSAGE_DELETED`, `MESSAGE_SWIPED`, `CHAT_CHANGED`.

`campaignSupport` in `runtime.js` (L134–155) lehnt alle Kampagnen ab, die nicht V4-C mit Ruleset 2 und Build ≥ `.132` sind. Damit ist Live-Spiel heute **genau ein Protokoll**. Diese Hostsperre ist die wichtigste Voraussetzung für jeden Altpfad-Rückbau (Abschnitt 5).

Ein Zug läuft so:

1. **Eingabe.** Die Spielereingabe kommt als freier Text oder über ein HUD-Formular. HUD-Eingaben werden über `action_input.js` persistiert, mit Revision und `input_hash`.
2. **Planner.** Ein LLM-Aufruf erzeugt Kommandos. Danach folgen Agency-Guard und `ownership.js`.
3. **Engine.** Die Engine-Handler buchen deterministisch, z. B. `turn.js`, `commands.js`, `combat.js`, `guild.js`.
4. **Narrator.** Er schreibt nur Prosa und wird gestreamt (`narrator_stream.js`).
5. **Extractor.** Ein LLM-Aufruf liefert Deltas. Darauf folgen `parseExtraction` (Schema, Aliase, Teilübernahme), die Firewall und `applyWorld` (Weltregeln, `admitPresence`).
6. **Events und Fold.** Die Events werden in `extra.avereth` der Chatnachricht gespeichert. `foldChat` faltet bei jedem Bedarf den gesamten Chat neu.
7. **Swipe, Edit, Regenerate, Delete.** Diese Wege laufen über `revisions.js`, `request_control.js` und die Generate-Barriere. Inaktive Revisionen werden markiert, nicht gelöscht.

**Bewertung:** Der Ablauf ist anspruchsvoll, aber konsistent. Die Event-Quelle ist eindeutig: Events liegen in der Nachricht, der Zustand ist abgeleitet. Swipe, Edit und Regenerate sind dadurch prinzipiell korrekt lösbar, ohne eine zweite Wahrheit zu brauchen. **Das ist die stärkste Eigenschaft der Architektur, und an ihr sollte nichts geändert werden.**

### 2.3 Zustandsautoritäten

| Bereich | Autorität | Anmerkung |
|---|---|---|
| Ort, Reise, bekannte Wege | Engine (`movement.js`, `known_routes.js`, `place_book.js`); Extractor meldet `arrive` und `expected.go.arrived` | `arrived` bleibt nach Entscheidung `.256` für jeden GO-Schritt |
| Anwesenheit | eine Regel `admitPresence` (seit `.252`) | Vorher gab es mehrere konkurrierende Prosa-Belege. Der Rückbau ist bestätigt (D: −410 Zeilen in `narration_evidence.js`). |
| NPC-Identität und -Wissen | `identity.js`, `knowledge.js`; Personenkontinuität als Extractor-Regel #46 | stabil, aber eine der größten Prompt-Regeln (1.108 Zeichen) |
| Kampf | V3 `combat.js`, `engine.js` über `routeTurn`/`readTurn`, V4 `combat_truth.js`, `group_combat.js` | **V3 ist hier nicht tot.** Wer V3 „aufräumt“, bricht Kampf, Schleichen, Erstellung und `#`-Kommandos. |
| Handel, Geld | `trade.js`, `finance_evidence.js`, `native_pay.js` | zahlreiche Preis- und Geldregeln im Extractor (20 Nennungen von „price“) |
| Inventar, Ausrüstung | `items.js` (Fan-in 19) | gutes Basismodul |
| Fortschritt | `progression.js`, `growth.js`, `skill_growth.js`, `class_growth.js`, `passive_growth.js`, `feats.js` | rangoffen bis E, D–S bewusst gesperrt |
| Quests, Gilde | `guild.js`, `private_jobs.js`, `world_jobs.js` | Beförderung abgeleitet, nie gespeichert (gut) |
| PULSE | `pulse.js` | deterministisches Ereignisfenster |
| Party | `party.js`, `party_actions.js`, `party_line.js`, `party_rewards.js` | P7 bewusst zurückgestellt, `coordinate` bleibt |

### 2.4 Notwendige Redundanz und historische Komplexität

| Erscheinung | Urteil | Begründung |
|---|---|---|
| Drei LLM-Rollen mit eigenen Prompts | **notwendig** | Trennung von Absicht, Prosa und Faktenmeldung ist die Grundlage der Firewall (siehe Abschnitt 9). |
| Schema plus semantische Weltregeln nach dem Extractor | **notwendig** | Das Schema prüft die Form, die Weltregeln die Autorität. Seit `.252` gibt es Teilübernahme statt Komplettverwurf. |
| Doppelte Wahrheit „Prosa versus Delta“ in `narration_evidence.js` | **historisch, größtenteils abgebaut** | `.252` hat 410 Zeilen entfernt (D). |
| Ruleset 1, Pfad A, V3-Kampagnenzweige in `world.js` und `commands.js` | **historisch** | Live hostgesperrt, nur noch für 8 Testdateien relevant (Abschnitt 5). |
| V3-Engine für Kampf, Schleichen, Erstellung | **notwendig (aktuell)** | Live genutzt. Ein Rückbau wäre eine eigene, große Migration ohne Spielgewinn. |
| 40 `accepted_*`-Replay-Manifeste (11,5 MB) | **teils notwendig, teils historisch** | `replay:check` liest nur `accepted_extractor261.json`. `tests/replay/replay.test.js` liest aber 26 weitere als Kettenprüfung über die Etappen seit `.138` (C); sie sind Teil der Node-Suite. 14 Manifeste (1,9 MB) werden im Code nirgends namentlich gelesen. |
| `swipe_info`-Kopien von `extra` im Chat | **Host-Verhalten** | ST kopiert `extra` je Swipe. Das ist nicht die Engine, betrifft aber ihre Daten (Abschnitt 5.3). |

---

## 3. Claim + State nach `.251–.261` (Untersuchung B)

### 3.1 Was wurde umgesetzt, und wie gut ist es belegt?

| Punkt | Stand `.261` | Evidenz | Bewertung |
|---|---|---|---|
| Eine Anwesenheitsregel `admitPresence` | umgesetzt | **C**, Node/Replay **D** | richtig. Der Rückbau der Prosa-Belegfunktionen war der größte Gewinn. |
| Teilübernahme gültiger Deltas; Reparatur nur, wenn eine gebuchte Spieleraktion sonst offen bliebe | umgesetzt | **D** (Gegenprobe: 132 → 90 X-Aufrufe) | richtig; **natürlicher Nachweis fehlt** |
| `arrived` bleibt für jeden GO-Schritt | Entscheidung `.256` | **C** | Meine frühere These, `arrived` sei ableitbar, war falsch. Die Zielerfüllung ist Semantik und gehört dem LLM, nicht der Engine. |
| `at` und `with` in `expected.go` nur noch optional (mehrere unbenannte Stopps, PULSE-Halt) | umgesetzt | **C** | sinnvoll. `arrive.with` ist ein anderes Feld und wird weiter verbraucht (`world.js` L1345, L2590–2600). Das ist kein Widerspruch. |
| `coordinate` bleibt, P7 (Party) zurückgestellt | Entscheidung | **A** | Meine frühere Empfehlung, `coordinate`/`wait`/`follow` zu entfernen, war falsch. Diese Felder tragen reale Partyentscheidungen. |
| Hesk-Regel für Schleich-Beobachter (zielgebundene Probe) | umgesetzt | **C** | fachlich richtig. Sie verhindert, dass Mitwisser die Probe aushebeln. |
| `.261` R1: technische Recovery (leere Antwort, Transportfehler, unlesbares JSON → zweiter Versuch) | umgesetzt | **C**, ST-isoliert **D** (28 Fälle) | Das ist reine Robustheit ohne Regeländerung. Richtig, dass sie nicht als „Reparatur“ zählt. |
| `.261` R2: Typ-Aliase `creature`/`object`/`person` → `.new` | umgesetzt | **C** | gering riskant. Der Alias greift nur bei eindeutigem Ziel. |
| `.261` R3: unbekannte Root-Keys verwerfen und als `discarded_root` protokollieren | umgesetzt | **C** | richtig. Kein Komplettverwurf mehr wegen Zusatzfeldern. |
| Wolf und Eber werden im Replay-Produktpfad nicht mehr angelegt (alte Berichte ohne `life_stage`/`population`) | bekannt | **A** | **Tatsächlich ein Korpusproblem, kein Produktfehler.** Es zeigt aber, dass das Replay neue Pflichtfelder nicht prüfen kann (Abschnitt 8). |

### 3.2 Selbstkritik an meiner `.251`-Analyse

Folgende Aussagen meiner Stand-1-Analyse wurden durch GPT oder Codex korrigiert. Ich halte die Korrekturen für richtig:

| Meine Aussage | Fehler | Lehre für diesen Bericht |
|---|---|---|
| Es gebe eine einzige Modellroute | Es sind drei. | Konfiguration prüfen, nicht aus einem Lauf schließen. |
| P2-Kaskade | Zurückgezogen. | – |
| P5 könne einen leeren Plan heilen | Falsch. | Verbraucherpfade lesen. |
| Felder `seen` und `mode` | Zurückgezogen. | – |
| P7 entfernt `coordinate`/`wait`/`follow` | Falsch, P7 zurückgestellt. | **Vor jeder Entfernung alle Verbraucher prüfen.** In diesem Bericht wird nichts zur Entfernung empfohlen, dessen Verbraucher ich nicht gelistet habe. |
| P4: `arrived` sei ableitbar | Falsch. | Zielerfüllung ist Semantik. Ich wende das unten auf jede „Ableitbarkeits“-Idee an. |

Bestätigt hat sich dagegen die Grundthese: Die Mehrfachbelege aus Prosa waren die Hauptquelle teurer Reparaturen. Eine Anwesenheitsregel und Teilübernahme senken die Reparaturzahl, ohne die Autorität zu schwächen (D, Gegenprobe).

### 3.3 Was bleibt offen?

1. **Natürlicher Nachweis (D fehlt).** Die echten X-Zahlen pro Narrator-Zug lagen in den letzten Läufen vor `.252` bei 1,15–1,53. Das heißt: Etwa 15–50 % der Züge brauchten eine zweite X-Anfrage (D, Abschnitt 4.4). Ob `.252–.261` das in echter Prosa senkt, ist noch nicht gemessen.
2. **`creature.new` mit `population`/`life_stage` (R).** Die Regel ist streng: „required for every creature met or seen outside a true Dungeon“ (Extractor-Regel #24, 811 Zeichen). Im Schema sind beide Felder aber nullable. Fehlt ein Feld, wird das Delta verworfen, und das Tier entsteht nicht.
   - Bei echter Prosa ist das erwartbar seltener als im alten Korpus.
   - Es ist aber genau der Fall, an dem Spieler „Wo ist der Wolf?“ fragen würden.
   - Empfehlung: In Usertest 17 gezielt eine Wildnisbegegnung spielen und die Ablehnungsgründe zählen. **Keine** Regeländerung auf Verdacht.
3. **Keine weitere Vereinfachung ohne Daten.** Weitere Felder halte ich derzeit nicht für entfernbar: Jeder verbleibende Pflichtteil hat einen dokumentierten Verbraucher. Der nächste Vereinfachungsschritt sollte aus den Ablehnungsstatistiken von Usertest 17 kommen, nicht aus Codelektüre.

---

## 4. Performance, Tokens und Kontext (Untersuchung C)

Quellen: alle `openrouter-20261127-*`-Archive, Builds `.222–.251`. Skripte: [`latency.py`](claude_261_analyse/latency.py), [`reqsize.py`](claude_261_analyse/reqsize.py), [`promptsize.mjs`](claude_261_analyse/promptsize.mjs), [`promptparts.mjs`](claude_261_analyse/promptparts.mjs). **Wichtig:** Alle Laufzeitdaten stammen aus Builds vor `.252`. Für `.261` gibt es nur Offline-Größen.

### 4.1 Wartezeiten (D, n = 211 Züge)

| Messpunkt | Median | p75 | p90 |
|---|---:|---:|---:|
| Klick → erster Prosatext | 6,4 s | 7,7 s | 9,6 s |
| Klick → Eingabe bereit | 12,3 s | 16,0 s | 20,6 s |
| letzte sichtbare Änderung → Eingabe bereit | **0,4 s** | 3,1 s | 5,3 s |
| Wartezeit Extractor-Validierung (Feld `extraction_validation_wait_ms`) | 4,4 s | 7,1 s | 10,0 s |
| Züge ohne `firstProse`-Marke, Klick → bereit (n = 63) | 13,7 s | 19,6 s | 22,1 s |

Deutung:

- Der Extractor läuft größtenteils, während der Spieler noch die gestreamte Prosa liest. Die gefühlte Wartezeit nach dem Text ist im Median sehr klein.
- Der Schwanz ab p75 entsteht dort, wo eine zweite X-Anfrage nötig ist.
- Der wirksamste Hebel ist deshalb **weniger zweite X-Anfragen**, nicht kürzere Prompts. Genau diesen Hebel adressieren `.252–.261` bereits.
- Die 63 Züge ohne Prosamarke kann ich nicht sicher zuordnen. Es sind vermutlich lokale, Panel- oder nicht gestreamte Züge (Unsicherheit, Abschnitt 13).

### 4.2 Anfragegrößen und Caching (D)

| Rolle | Anfragen | Zeichen (Median) | Prompt-Tokens (Median) | davon gecacht (Median) | Completion (Median) |
|---|---:|---:|---:|---:|---:|
| Planner | 242 | 55.482 | 14.013 | 11.520 (82 %) | 80 |
| Narrator | 217 | 55.336 | 11.961 | 6.912 (58 %) | 386 |
| Extractor | 291 | 66.014 | 15.560 | 11.520 (74 %) | 355 |
| Board | 2 | 13.685 | 3.208 | 1.280 | 1.038 |
| Party-Entscheidung | 4 | 1.002 | 253 | 0 | 38 |

Die festen Systemteile sind:

- **Planner:** System 47.214 Zeichen, User-Teil (Katalog, Szene, Spielertext) 6–11 KB.
- **Extractor:** System 53.439 Zeichen in `.251` und **51.968 Zeichen in `.261`**. Das ist offline gebaut und entspricht −3,3 %. Die Regeln wuchsen von 47 auf 48, die Formatregeln schrumpften von 9.609 auf 8.251 Zeichen.
- **Narrator:**
  - 13 Nachrichten;
  - Vertrag 37.392 Zeichen, davon `FINAL SANDBOX CHECK` 14.316, `ENGINE AUTHORITY` 7.875 und `PHYSICAL CONTINUITY` 6.334;
  - Stilteil 2.209 Zeichen;
  - Engine-Block am Ende etwa 6,5 KB.

**Bewertung:**

- Die Prompts sind groß, aber durch das Caching zu drei Vierteln schon bezahlt.
- Die `.203`-Forschung hat gezeigt: 121 eingesparte Katalog-Tokens brachten keinen messbaren Zeitgewinn. Die Charakterbeschreibung mit 7.756 GLM-Tokens wurde bewusst behalten.
- Eine weitere Prompt-Kürzung empfehle ich daher nur, wo sie gleichzeitig **Widersprüche** beseitigt (4.5), nicht als Selbstzweck.

### 4.3 Kontextwachstum über lange Läufe (D)

Gemessen wurde an Heron `.250` (127 Nachrichten) und S `.232` (119 Nachrichten), jeweils an den Quartilspunkten des Laufs:

| Größe | Heron | S |
|---|---|---|
| Extractor-Katalog (Zeichen) | 7.506 → 12.111 → 12.781 → 10.043 → 10.043 | 11.788 → 9.320 → 9.054 |
| Planner-User-Teil | 6.016 → 10.842 → 8.477 | 11.439 → 8.599 → 8.723 |
| Narrator gesamt | 56.464 → 60.183 → 54.980 | 60.566 → 56.837 → 54.437 |
| Narrator-Nachrichten | konstant 13 | konstant 13 |

**Der Kontext ist szenengebunden und wächst nicht mit der Kampagnenlänge.** Das ist ein großer, oft unterschätzter Vorzug der Architektur. Er gilt auch für lange Kampagnen mit vielen NPCs, solange der Katalog szenenbezogen bleibt. Nicht gemessen habe ich Szenen mit sehr vielen gleichzeitig anwesenden Personen; das ist ein Grenzfall für später.

### 4.4 Wiederholte Extractor-Anfragen pro Build (D)

| Build | Narrator-Züge | X-Anfragen | X pro Zug | davon Reparaturen (> 2 Nachrichten) |
|---|---:|---:|---:|---:|
| `.242` | 24 | 29 | 1,21 | 5 |
| `.243` | 13 | 18 | 1,38 | 5 |
| `.244` | 17 | 26 | 1,53 | 9 |
| `.248` | 13 | 16 | 1,23 | 4 |
| `.250` | 23 | 30 | 1,30 | 6 |
| `.251` | 13 | 15 | 1,15 | 2 |

Die Stichproben sind klein. Die Werte sind deshalb nur als Größenordnung zu lesen: Vor Claim + State lagen 15–50 % zusätzliche X-Anfragen vor. **Der Zielwert für Usertest 17 wäre ≤ 1,15 X pro Narrator-Zug bei unveränderter Ablehnungsqualität.** Das ist eine Messgröße und kein neuer Kanon.

### 4.5 Redundante oder widersprüchliche Prompt-Regeln nach `.261`

Ich habe die Extractor-Regeln und -Deltas von `.261` offline erzeugt und nach Größe sortiert:

| Größte Regeln | Zeichen |
|---|---:|
| #2 Overreach | 1.299 |
| #46 Personenkontinuität | 1.108 |
| #12 Spuren und Zeichen | 819 |
| #24 `creature.new` mit `population`/`life_stage` | 811 |
| #19 `person.new` role | 807 |
| #32 Objektübergabe | 716 |

| Größte Delta-Beschreibungen | Zeichen |
|---|---:|
| `creature.new` | 2.546 |
| `thread` | 1.993 |
| `party` | 1.671 |
| `feature` | 1.437 |
| `coin.gift` | 1.264 |
| `person.new` | 1.124 |

Befund:

1. **Kein harter Widerspruch gefunden (C).** `arrive.with` und `expected.go.with` wirken auf den ersten Blick doppelt, haben aber getrennte Verbraucher (`world.js` L1039/L1076 bzw. L1345/L2590). `arrived` (Zielerfüllung) und `arrive` (physischer Stopp) sind ebenfalls getrennte Konzepte.
2. **Spannung bei `creature.new` (R).** Das Schema sagt nullable, die Regel sagt Pflicht außerhalb echter Dungeons. Für ein Modell ist „nullable, aber Pflicht“ eine bekannte Fehlerquelle.
   - Option: im Schema für diesen Fall deutlicher machen, dass `"independent"` die zulässige Antwort ist, wenn keine Population passt. Diese Antwort ist in der Delta-Beschreibung schon vorhanden.
   - Erst nach Usertest-17-Daten entscheiden.
3. **Dichte an Negativ-Formulierungen (C).** Der Extractor-Prompt enthält 87× „never“ und 89× „only“, der Planner 34× „never“ und 41× „only“. Das ist für Modelle dieser Klasse vertretbar. Ich empfehle keinen Rückbau auf Verdacht, da die `.203`-Messungen keinen Zeitgewinn zeigten.
4. **Narrator-Vertrag (C).** `FINAL SANDBOX CHECK` (14 KB) wiederholt Inhalte aus `ENGINE AUTHORITY` und `PHYSICAL CONTINUITY` als Endprüfung. Das ist eine **bewusste Wiederholung am Promptende**, wo Modelle sie am stärksten beachten, und keine historische Redundanz. Nicht kürzen ohne A/B-Messung der Prosaqualität.

### 4.6 Rollen zusammenlegen? (offene Bewertung)

| Variante | Gewinn | Verlust | Urteil |
|---|---|---|---|
| Planner und Extractor in einem Aufruf | ein Aufruf weniger | geht nicht: Der Planner läuft **vor** der Prosa, der Extractor **danach** | **unmöglich** |
| Narrator gibt die Deltas selbst aus (strukturierter Anhang) | ein Aufruf weniger, etwa 4,4 s Median-Wartezeit weg | Der Erzähler meldet seine eigenen Behauptungen. Damit entfällt die Trennung von Erzählen und Feststellen. Vermutlich leidet auch die Prosa, weil die Temperatur 0,9 und der Extractor 0,1 hat. | **nicht empfohlen (D)**. Wartezeit und Nutzen stehen in keinem Verhältnis, da der Extractor schon überwiegend parallel zum Lesen läuft (4.1). |
| Planner entfällt, Narrator interpretiert die Absicht | ein Aufruf weniger | Verlust der Agency-Firewall, der Spieler verliert die Hoheit über seine Handlungen | **nicht empfohlen** |
| Kleineres, schnelleres Modell nur für den Planner (Completion im Median 80 Tokens, 82 % gecacht) | ggf. 1–2 s bis zum Prosabeginn | Risiko bei komplexen Kommandos (Handel, Party, Lernen) | **optional (D/C).** Nur als A/B-Versuch mit dem bestehenden Live-Runner, nicht als Umbau. |

---

## 5. Altlasten und Skalierbarkeit (Untersuchung D)

### 5.1 Altpfade

Gemessen wurden Vergleiche mit `rulesetOf` und Verwendungen von `cPath`/`!c` (D):

| Modul | `rulesetOf`-Vergleiche | `cPath` / `!c` |
|---|---:|---|
| `world.js` | 41 | 79 |
| `commands.js` (v4) | 40 | 116 `!c`-Muster |
| `skills.js` | 8 | – |
| `runtime.js` | 7 | – |
| `catalog.js` | 6 | – |
| `planner.js`, `context.js` | je 5 | – |
| `combat.js` | 2 | 4 |
| `engine.js` | 1 | 5 |

- **Erreichbarkeit live:** Für Ruleset 1, Pfad A und V3-Kampagnen ist sie null. `campaignSupport` lehnt diese Kampagnen ab (C).
- **Verbraucher:**
  - 8 von 332 Testdateien beziehen sich auf Ruleset 1, Pfad A, V3 oder den alten Interpreter;
  - 147 Testdateien nutzen C-Pfad und Ruleset 2;
  - Das Replay-Korpus ist durchgehend `runtime v4`, `path c`, `ruleset 2` und braucht die Ruleset-1-Zweige **nicht**. Es braucht nur die Altkontrakt-Umsetzung im Replay-Werkzeug (`contract_c.mjs`).
- **Nicht betroffen:** `LEGACY_RULESET = 1` in `content.js` und die V3-Module selbst, soweit Kampf, Schleichen, Erstellung und `#`-Kommandos sie nutzen.

**Empfehlung B2 (Altpfad-Rückbau in Etappen):**

1. Ein Verbraucherverzeichnis erstellen, das jeden Zweig, den Test, der ihn erreicht, und den Live-Erreichbarkeitsnachweis auflistet.
2. Die 8 Alttests in ein Archiv verschieben oder auf Ruleset 2 portieren. Das entscheiden Codex und GPT je Test.
3. Die Zweige zuerst in `commands.js`, dann in `world.js` entfernen, jeweils mit Replay und ST-isoliert.
4. **Die V3-Engine nicht anfassen.**

Gewinn: Geschätzt mehrere hundert Zeilen weniger in den beiden größten Modulen. Vor allem sinkt die kognitive Last bei jeder neuen Funktion (E-Rang, Party).

### 5.2 Kopplung von `world.js`

`world.js` entscheidet über Personen, Orte, Reisen, Handel, Party, Gedächtnis, Threads, Kampftod-Sperren und PULSE-Folgen. Das hat zwei Folgen:

- Jede neue Domäne landet dort.
- Die Datei ist der Ort mit den meisten Codex-Rückfragen der letzten Etappen (`arrived`, `coordinate`, Anwesenheit).

**Empfehlung C2 (Entflechtung entlang vorhandener Grenzen):**

- Nur extrahieren, nicht neu entwerfen. Kandidaten:
  - Bewegungsfolgen (`arrive`, `with`, `expected.go`) nach `movement.js`;
  - Gedächtnis- und Thread-Annahme in ein eigenes Modul;
  - Handels- und Geldannahme nach `trade.js` oder `finance_evidence.js`.
- Verhaltensneutral, Replay-identisch, ohne Kanonänderung.
- Erst **nach** dem Altpfad-Rückbau, sonst werden Altzweige mitverschoben.

### 5.3 Chatspeicher (D)

Größenaufteilung des Chats von Heron `.250` (127 Nachrichten, 1,93 MB unkomprimiert):

| Feld | Anteil |
|---|---:|
| `swipe_info` (ST-Kopien von `extra` je Swipe) | **37,1 %** |
| `extra.avereth.events` (die eigentliche Wahrheit) | 20,6 % |
| `extra.display_text` | 13,3 % |
| `avereth.hud` | 6,4 % |
| `mes` (Prosa) | 4,5 % |
| `swipes` | 4,4 % |
| übrige `avereth`-Felder (`narration`, `extraction`, `panel`, `plan`, `ir`, `interp`, `rejected`) | ≈ 12 % |

- Das sind etwa **15 KB pro Nachricht**. Eine Kampagne mit 2.000 Nachrichten käme auf etwa 30 MB.
- ST schreibt den Chat bei jeder Speicherung vollständig. Bei sehr langen Kampagnen wird das spürbar (R).
- Das größte Event ist `outcome.recorded` mit 110 KB im Heron-Lauf.

**Empfehlung C1 (Speicherdiät, verhaltensneutral):**

- prüfen, ob `hud`, `display_text` und Extraktions-Rohdaten pro Nachricht gespeichert werden müssen oder aus Events neu erzeugt werden können;
- prüfen, ob die Swipe-Kopien von `extra` für inaktive Swipes reduziert werden dürfen. **Das muss mit Swipe- und Revisionsregeln abgeglichen werden, weil Revisionen genau diese Kopien lesen könnten.**
- Erst messen, dann entscheiden: Kein Feld entfernen, dessen Leser (Revisionen, Debug, HUD-Neuaufbau) nicht gelistet ist.

### 5.4 Falten (D)

Die Messung mit [`foldtime.mjs`](claude_261_analyse/foldtime.mjs) faltet den ganzen Chat siebenmal und nimmt den Median:

| Lauf | Nachrichten | Events | Faltzeit (Median) | Zustand |
|---|---:|---:|---:|---:|
| Heron `.250` | 128 | 971 | 13,5 ms | 109 KB |
| S `.232` | 120 | 1.000 | 7,3 ms | 128 KB |
| Sage `.248` | 112 | 834 | 13,0 ms | 89 KB |
| Oriole `.251` | 86 | 756 | 8,4 ms | 93 KB |

- `foldChat` wird pro Zug mehrfach aufgerufen: 10 Aufrufstellen in `runtime.js`, 2 in `index.js`.
- Selbst bei 20.000 Events (etwa 2.500 Nachrichten) lägen 10 Faltungen pro Zug bei grob 1–3 s. Das wäre die Grenze, ab der ein Cache lohnt.
- **Heute nicht nötig (D).** Für sehr lange Kampagnen ist ein Präfix-Cache (gleiche Nachrichten-ID-Folge → gleicher Zustand) die minimalinvasive Lösung. Ein Event-Snapshot im Chat würde dagegen eine zweite Wahrheit schaffen und ist nicht empfohlen.

### 5.5 Skalierbarkeit nach Dimension

| Dimension | Stand | Grenze | Evidenz |
|---|---|---|---|
| größere Welt, mehr Orte | Ortsbaum (`place_book`, Pfade) und szenengebundener Katalog | keine bekannte | C/D |
| mehr NPCs | Identität und Wissen pro Person, Katalog zeigt nur Anwesende und Relevante | Szenen mit sehr vielen Anwesenden ungetestet | C/R |
| lange Kampagnen | Kontext konstant, Fold billig | Chatdateigröße (5.3) | D |
| große Inventare | `items.js` mit Instanzprofilen | Darstellung im HUD (Abschnitt 7) | C/R |
| viele Quests | Gildenboard fest 5 Plätze, Verträge abgeleitet | keine bekannte | C |
| Party | P7 zurückgestellt, `coordinate` aktiv | größere Gruppen ungetestet | A |
| höhere Level und Ränge | Rangbänder F–S, Formeln mit Level-Skalierung | Content (Abschnitt 6) | C |
| Skills | Komposer F, Rang E kalibriert, D–S abgelehnt | Kanon D–S | C |
| Dungeons | Living Dungeons mit relativen Rollenspannen pro Rangband | nur drei Dungeons, höchstens Rang E | C |

---

## 6. Bereitschaft für E-Rang und darüber (Untersuchung E)

Ich erfinde hier keine Regeln und keine Werte. Die Tabelle zeigt nur, was vorhanden ist und was fehlt.

| Baustein | Status | Beleg |
|---|---|---|
| Machtrang aus Level (F 1–14, E 15–29 … S 90–104) | **vorhanden** | `rules.ranks.bands` |
| Gildenränge Novice → Legend mit Levelbändern und Machtrangbindung | **vorhanden** | `rules.guild.rank_levels`, `rank_power` |
| Beförderung: 5 Verträge des eigenen Rangs plus Machtrang | **vorhanden** (abgeleitet, nie gespeichert) | `guild.js` L1331–1346 |
| Board-Vergütung Novice bis Elite | **vorhanden** (`_status: proposed`) | `rules.guild.board.payout_guide_cp` |
| Rangunterstützung pro Filiale (Stadt bis Veteran, Hauptstadt bis Elite) | **vorhanden** (`proposed`) | `supported_ranks`, `domain.js` L608 |
| E-Klassenentwicklung ab Level 15 (Normal/Rare, Budgets) | **vorhanden** | `class_growth.js`, `rules.class_growth` |
| Klassenentwicklung D–S, Domains | **fehlt bewusst** | `class_growth.js` L163: „not implemented“ |
| Skill-Rang E (Kalibrierung, `effect_scale` 1,5) | **vorhanden** (provisorisch, „balanced in 10B“) | `rules.skill_design.e_rank`, `skills.js` L46–59 |
| Skill-Komposition Rang E durch Spielpfade | **fehlt** | `skill_design.e_rank_note`: „no path of the game composes one by itself yet“ |
| Skill-Ränge D–S | **fehlt bewusst** (abgelehnt) | `skills.js` |
| Waffenwerte Rang E | **vorhanden** | `gear.instances.e_weapon_values`, `items.js` L271 |
| Rüstungs- und Schildwerte Rang E | **erweitern**: nur generische Skalierung (`rank_scaling.per_rank_index` 0,75), keine eigene Referenz | `gear.rank_scaling` |
| Basisgegenstände Rang E | **fehlt**: alle 13 Ranggegenstände sind F | `gear.items` |
| Monsterwerte für höhere Level | **vorhanden** (Level-Skalierungsformel gilt für jedes Level) | `monsters.scaling` |
| Elite- und Boss-Multiplikatoren | **vorhanden** | `monsters.elite`, `boss` |
| Begegnungsfenster über Level 14 | **fehlt (harte Sperre)**: `encounter_windows` enden bei `[12,14]`, `validEncounterLevels` lehnt andere Fenster ab | `domain.js` L385–387, `monsters.encounter_windows` |
| Gebietskontexte (`level_selection`) für E | **fehlt**: `hunting_territory` endet bei 14 | `monsters.level_selection` |
| Dungeons Rang E | **teilweise**: Mossback Warrens und Old Crown Catacombs F–E, Glimmerdeep F–F | `lore.json` `dungeons[].rank` |
| Dungeon-Rollenspannen pro Rangband | **vorhanden** (relativ: Minion 0–0,3, Wache 0,25–0,5, Boss 0,35–0,6) | `rules.living.role_spans` |
| XP-Formeln mit Rangabstand und Zieltyp | **vorhanden** | `rules.xp` |
| XP-Tempo bis Level 15 (Spielspaß) | **ungemessen** | Simulator `tools/sim/balance` existiert |
| Lernfortschritt, Profizienz P1–P5 | **vorhanden** | `rules.proficiency`, `growth` |

**Empfohlene Reihenfolge für E-Rang:**

1. **E1 – Kanonvorlage durch GPT, Entscheidung durch den Nutzer.** Eine Vorlage für Begegnungsfenster E (15–29) und Gebietskontexte E, mindestens ein E-Gebiet und ein E-Dungeon in Reichweite, Rüstungs- und Schildreferenzen E und ein Zielwert für das XP-Tempo. **Ohne diese Entscheidungen ist E-Rang nicht spielbar, egal wie gut der Code ist.**
2. **E2 – Simulatormessung (Codex, offline).** Wie viele Kämpfe, Verträge und Spielstunden braucht es bis Level 15 mit den heutigen XP-Regeln? Das liefert Zahlen für die Entscheidung in E1. Es ist eine reine Messung.
3. **E3 – Freischaltung im Code (Codex).** `encounter_windows` und `level_selection` aus dem Content erweitern statt die Fallbacks im Code. Hinzu kommen Rüstungsreferenzen und E-Basisgegenstände. Rangweite Tests mit einem auf Level 15 gesetzten Charakter im isolierten ST.
4. **E4 – E-Skill-Erwerb durch Spielpfade.** Lehrer, Skill-Stein und Belohnung für Rang E, auf den vorhandenen Kalibrierungen.
5. **Später:** D–S-Klassen, D–S-Skills, Domains. Erst nach einer natürlichen E-Kampagne.

---

## 7. HUD und Komfort (Untersuchung F)

Bestand (C):

- `hud.js` (308 Zeilen): Charakter- und Weltzeilen, Boardkarten, Gildenrang.
- `action_composer.js` (439 Zeilen): Kampfaktionen mit Phasen und Distanzbändern.
- `action_input.js` (337 Zeilen): persistierte Eingaben mit Revision und `input_hash`.
- `ui_trade.js` (166 Zeilen): Handelswarenkorb.
- `party_actions.js` (136 Zeilen).
- `native_actions.js`: direkte Befehle `#equip` und `#rest` ohne LLM-Planner, über denselben Zughandler.

Bewertung:

1. **Das HUD ist architektonisch richtig angebunden.** Native Aktionen laufen über `playerTurnV4` und dasselbe Ereignisprotokoll. Es gibt keine zweite Buchungslogik. Eingabeänderungen nach einer Buchung werden über `input_hash` erkannt (`host.js` L85–88). Das ist ein gutes Fundament für weitere Komfortaktionen.
2. **Komfortpotenzial:**
   - Häufige reine Engine-Aktionen könnten ohne Planner auskommen, z. B. Ausrüsten, Rasten, Board ansehen, Vertrag annehmen (dieser Weg existiert bereits über `quest.accept`) oder Inventar sortieren.
   - Jede solche Aktion spart einen Planner-Aufruf. Bei 82 % Cache-Anteil ist das vor allem Zeit (1–3 s), weniger Kosten.
   - **Nur für Aktionen ohne semantische Deutung** – sobald Absicht, Ziel oder Ton gedeutet werden muss, bleibt der Planner zuständig (Claim + State).
3. **Für höhere Ränge wichtig:** Inventare und Skilllisten wachsen. Ein Filter oder eine Gruppierung im HUD wird ab E-Rang wichtiger als neue Knöpfe. Evidenz R: Ich habe keine Daten zu großen Inventaren.
4. **Die frühere HUD-Recherche bleibt gültig** ([USER08](USER08_HUD_HANDEL_UND_STRUKTURIERTE_SPIELERAKTIONEN.md)). Ich habe keinen Widerspruch zu ihr gefunden.

---

## 8. Fehlerklassen, Teststrategie und Prozess (Untersuchung G)

### 8.1 Bestand (D, hier ausgeführt)

- **Node-Suite:** 3.649 Tests, 3.649 bestanden, 77 s, Node 22.23.5. Davon 255 Testdateien in `tests/v4`, 28 in `tests/live_runner`, 23 Unit-, 12 `testrun_v*`-, 7 Szenario- und 3 Replay-Dateien.
- **Replay `replay:check`:** 2.235 Fälle, 0 Replay-Fehler, 0 Fold-Fehler. **1.392 Fälle weichen von der `.126`-Baseline ab und sind alle per Manifest exakt akzeptiert.** 86 s.
- **ST isoliert:** 237 + 28 + 60 Fälle laut [Abnahme .261](AVERETH_261_EXTRACTOR_RECOVERY_ABNAHME.md). **Nicht von mir ausgeführt.**

### 8.2 Fehlerklassen und wo sie gefangen werden

| Klasse | Beispiel | Gefangen durch | Lücke |
|---|---|---|---|
| Schema- und Formfehler des Modells | Zusatzfelder, falsche Typen | `parseExtraction`, Teilübernahme, R1–R3 | gering |
| Semantische Fehlmeldung | Anwesenheit, Ankunft, Preis | Weltregeln, Ablehnungen mit Regelname | **nur natürlich messbar** |
| Engine-Regression | falsche Buchung nach Codeänderung | Node-Suite, Replay | Replay-Aussagekraft sinkt (8.3) |
| Host-Lebenszyklus | Swipe, Edit, Regenerate, Abbruch | ST isoliert, Fake-Provider | gut |
| Spielgefühl | „Wolf fehlt“, zähe Wege | nur Usertests | systembedingt |
| Langzeit | Chatgröße, Fold, viele NPCs | nichts Systematisches | Messprogramm fehlt (5.3–5.4) |

### 8.3 Das Replay altert

Das Korpus besteht aus 10 Läufen (b16–b19, Builds `.120–.125`), dazu `corpus191`. Die Baseline stammt aus `.126`. Es gibt 40 Abnahme-Manifeste mit zusammen 11,5 MB:

- `replay:check` nutzt nur das jüngste Manifest.
- `replay.test.js` prüft 26 ältere als Kette.
- 14 werden im Code nicht namentlich gelesen.

Folgen:

- Ein Unterschied zur Baseline ist heute der Normalfall (62 %). Ob ein neuer Unterschied gut oder schlecht ist, entscheidet nur noch die Einzelbewertung im Manifest.
- Neue Pflichtfelder fehlen im Korpus. Neue Mechaniken (`admitPresence`, `arrived`, Recovery) werden gegen alte Prosa getestet, die sie nie brauchte.

**Empfehlung A2 (neues Replay-Korpus):**

1. Neue Baseline auf `.261` (oder dem Build nach Usertest 17).
2. Neues Korpus aus den `.24x–.25x`-Originalen (Heron, Sage, Martin, Oriole, Reed …) und aus Usertest 17.
3. Das alte Korpus als Langzeit-Regressionsschicht behalten, aber nicht mehr als Hauptsignal nutzen.
4. Erst **mit** der neuen Baseline die Kettenprüfung in `replay.test.js` auf die neue Basis umstellen. Danach die historischen Manifeste ins Archiv verschieben, ohne sie zu löschen (Originalschutz). Vorher sind 26 davon aktive Testverbraucher.

Quellen- und Geheimnisschutz bei Originalen gilt wie gehabt: Die Archive sind bereits bereinigt, neue Läufe gehen durch den bestehenden Usertest-Ablauf.

### 8.4 Prozess mit großen autonomen Codex-Aufträgen

Der Nutzer bevorzugt große autonome Aufträge. Das passt zur Architektur, wenn drei Leitplanken bleiben:

1. **Verbraucherliste vor jeder Entfernung**, als Pflichtteil des Codex-Berichts. Das ist die Lehre aus den `.252`-Stopps.
2. **Stopp nur bei Regel-, Kanon- oder Schutzgrenzänderung.** Technische Abhängigkeiten und Regressionen behebt Codex selbst. Das ist schon so vereinbart und hat bei `.252–.261` funktioniert.
3. **Jede Etappe endet mit Node, Replay und ST-isoliert. Jede dritte Etappe oder jede Etappe mit Prompt- oder Extractor-Änderung endet zusätzlich mit einem kleinen natürlichen Lauf (Live-Runner, wenige Züge).** So entsteht nicht wieder eine Lücke von zehn Builds ohne Live-Evidenz. Die Kosten bestimmt der Nutzer.

---

## 9. Alternative Architekturen (Untersuchung H)

| Alternative | Was sie verspräche | Ehrliche Bewertung |
|---|---|---|
| **Ein einziges großes LLM-Agent-System** (Tool-Calls statt Pipeline) | weniger Code | Verliert die deterministische Autorität, die Prüfbarkeit und die Replay-Fähigkeit. Fehler würden unsichtbar. **Nicht empfohlen.** |
| **Narrator mit strukturierter Ausgabe** (Prosa plus Deltas in einem Aufruf) | ein Aufruf weniger | siehe 4.6. Kaum Zeitgewinn, Verlust der Trennung. **Nicht empfohlen.** |
| **Zustand als Datenbank statt Event-Sourcing im Chat** | schnelleres Laden | ST-Swipe, -Edit und -Regenerate sind dann eine zweite Wahrheit. Der heutige Fold kostet etwa 10 ms. **Nicht empfohlen.** |
| **Eigenständige Anwendung statt ST-Erweiterung** | volle Kontrolle über UI und Speicher | Sehr großer Aufwand, Verlust der ST-Infrastruktur (Provider, Presets, Lorebook). Für eine Beta nicht gerechtfertigt. **Später allenfalls, wenn ST-Grenzen (Chatgröße, UI) real stören.** |
| **Regelengine aus Content generiert** (deklarative Regeln statt JS-Handler) | leichtere Erweiterung | Teilweise schon so: `rules.json`, `deltas.json`, `monsters.json`. Mehr davon lohnt sich gezielt für E-Rang-Content (Abschnitt 6, E3), nicht als Umbau. |
| **Bestehende Architektur** | – | **Gut genug, und für Beta und E-Rang die richtige Basis.** Der Bedarf liegt in Messung, Content und gezielter Entflechtung. |

---

## 10. Priorisierte Befunde mit Beleg und Bewertung

Die Spalten bedeuten: Spaß · Stabilität · Token/Zeit · Rangrelevanz · Aufwand · Regressionsrisiko · Evidenz.

| ID | Befund / Vorschlag | Spaß | Stab. | Tok./Zeit | Rang | Aufwand | Regr. | Evidenz | Klasse |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **A1** | Usertest 17 mit `.261`: X pro Zug, Ablehnungsgründe und gezielt eine Wildnisbegegnung messen (`creature.new`) | + | ++ | + | ○ | + | ++ | D (Lücke seit `.251`) | **A** |
| **A2** | Neues Replay-Korpus und neue Baseline aus `.24x–.26x`-Originalen; altes Korpus als Zweitschicht | ○ | ++ | ○ | + | ○ | ++ | D (62 % akzeptierte Abweichung) | **A** |
| **B1** | E-Rang-Kanonvorlage (Begegnungsfenster, Gebiete, Dungeon, Rüstung E, XP-Tempo) mit Simulatormessung E2 | ++ | ○ | ○ | ++ | ○ | ++ | C (`domain.js` L385) | **B** |
| **B2** | Altpfad-Rückbau Ruleset 1, Pfad A, V3-Kampagnen mit Verbraucherverzeichnis; V3-Engine unberührt | ○ | + | ○ | + | ○ | + | D/C | **B** |
| **B3** | Natürlicher Kurzlauf als Etappenabschluss bei Prompt- oder Extractor-Änderung (Prozessregel) | + | ++ | ○ | ○ | ++ | ++ | D | **B** |
| **C1** | Chatspeicher-Diät (`display_text`, `hud`, Swipe-Kopien) nach Leserprüfung | ○ | + | ○ | + | ○ | ○ | D (15 KB pro Nachricht) | **C** |
| **C2** | Entflechtung `world.js` entlang vorhandener Module, verhaltensneutral | ○ | + | ○ | ++ | – | ○ | C | **C** |
| **C3** | HUD-Komfort: weitere native, planner-freie Engine-Aktionen; Inventar- und Skillfilter für E-Rang | + | ○ | + | + | + | + | C/R | **C** |
| **C4** | Historische Replay-Manifeste archivieren (nicht löschen): die 14 nicht gelesenen nach Prüfung der Doku-Links, die 26 aus `replay.test.js` erst nach A2 | ○ | ○ | ○ | ○ | ++ | + | C | **C** |
| **C5** | `creature.new`: nullable plus Pflicht klären, **nur** falls A1 dort Verluste zeigt | + | + | + | ○ | ++ | + | R | **C** |
| **D1** | Planner auf ein kleineres Modell (A/B-Versuch) | ○ | – | + | ○ | + | ○ | D/C | **D** |
| **D2** | Fold-Präfix-Cache | ○ | ○ | ○ | ○ | + | + | D (heute 10 ms) | **D** |
| **D3** | Rollen zusammenlegen | – | – | + | ○ | – | – | D/C | **D (nicht empfohlen)** |
| **D4** | Prompt-Kürzung ohne Widerspruchsbefund | ○ | ○ | ○ | ○ | + | ○ | D (`.203`: kein Zeitgewinn) | **D (nicht empfohlen)** |
| **D5** | Neue Gesamtarchitektur | – | – | ○ | ○ | – | – | – | **D (nicht empfohlen)** |

**Pakete:**

| Paket | Inhalt | Ausführende | Voraussetzung |
|---|---|---|---|
| **P-Mess** | A1 und A2 | Nutzer (Usertest 17), Codex (Korpus und Baseline), GPT (Bewertung) | GPT-Review `.261` (laut Nutzer GO) |
| **P-Rang** | B1 → E2 → E3 → E4 | GPT (Vorlage), Nutzer (Kanon), Codex (Simulator, Umsetzung) | P-Mess sollte gestartet sein |
| **P-Altlast** | B2 → C2 → C4 | Codex autonom mit Verbraucherverzeichnis, GPT-Diffreview | P-Mess A2 (neues Korpus als Sicherheitsnetz) |
| **P-Komfort** | C1, C3 | Codex | parallel zu P-Rang |
| **P-Prozess** | B3, Verbraucherliste als Berichtspflicht | Nutzer und GPT in `01_ARBEITSWEISE` | sofort |

---

## 11. Was ich bewusst nicht weiter optimieren würde

- **Kontextaufbau und Katalog.** Er ist szenengebunden und konstant (4.3). Das ist ein Vorzug.
- **Prompt-Länge an sich.** Caching und die `.203`-Messungen zeigen keinen relevanten Zeitgewinn.
- **Narrator-Vertrag einschließlich der Endwiederholung `FINAL SANDBOX CHECK`.** Die Wiederholung ist bewusst gesetzt, eine Änderung nur nach A/B-Messung der Prosaqualität.
- **Event-Sourcing im Chat und `foldChat`.** Schnell genug und korrekt für Swipe, Edit und Regenerate.
- **Drei getrennte Rollen.**
- **V3-Kampfmodul.** Es funktioniert live. Eine Migration brächte keinen Spielgewinn.
- **Weitere Feldkürzungen im Extractor ohne Usertest-17-Daten.**
- **Streaming.** Ist umgesetzt und wirkt (6,4 s bis zur ersten Prosa).

---

## 12. Nächste Phasen

1. **Jetzt:** GPT-Review `.261` (laut Nutzer GO), danach Usertest 17 (A1). Parallel kann GPT die E-Rang-Kanonvorlage (B1) entwerfen. Sie ist reine Fachplanung und blockiert nichts.
2. **Nach Usertest 17:** Codex-Großauftrag „P-Mess A2 + P-Altlast B2“. Zuerst Korpus und Baseline, dann der Rückbau, beides mit Verbraucherverzeichnis. Die Usertest-17-Daten entscheiden über C5.
3. **Danach:** P-Rang E2–E3. Zuerst die Simulatormessung, dann die Freischaltung des E-Contents nach der Nutzerentscheidung.
4. **Vor der Beta:** C1, C2 und C3. Ein Langzeitlauf (> 300 Nachrichten) misst Chatgröße und Faltzeit real.
5. **Nach einer natürlichen E-Kampagne:** D–S-Planung, Party P7.

---

## 13. Eigene Prüfungen, nicht ausgeführte Prüfungen, Unsicherheiten

**Selbst ausgeführt (offline, ohne Modellaufrufe, ohne persönliches ST-Profil):**

- Node-Suite `.261`: 3.649/3.649 bestanden.
- `replay:check`: 2.235 Fälle, 0 Fehler, 1.392 akzeptierte Abweichungen.
- Modulgrößen und Importgraph ([`graph.py`](claude_261_analyse/graph.py)).
- Extractor-System-Prompt `.251` gegen `.261` offline gebaut ([`promptsize.mjs`](claude_261_analyse/promptsize.mjs)) und Regel- und Deltagrößen ([`promptparts.mjs`](claude_261_analyse/promptparts.mjs)).
- Latenzen ([`latency.py`](claude_261_analyse/latency.py)), Anfragegrößen und Caching ([`reqsize.py`](claude_261_analyse/reqsize.py)), X pro Zug ([`x_per_turn.py`](claude_261_analyse/x_per_turn.py)), Chatspeicheraufteilung ([`chat_size.py`](claude_261_analyse/chat_size.py)) und Kontextwachstum ([`context_growth.py`](claude_261_analyse/context_growth.py)) über die Originalarchive.
- Faltzeiten ([`foldtime.mjs`](claude_261_analyse/foldtime.mjs)).
- Codelektüre: `campaignSupport`, `foldChat`, `promotion`, `validEncounterLevels`, `class_growth`, `skills` E-Rang, `native_actions`, Verbraucher von `arrive.with` und `expected.go.with`.
- Contentlektüre: `rules.json` (Ränge, Gilde, `class_growth`, Skilldesign), `monsters.json`, `gear.json`, `lore.json` Dungeons, `deltas.json`.
- Kontrolle der Heads per `git ls-remote` bei Beginn: Dev `4b637c98`, main `d45a94ba`.

**Nicht ausgeführt:**

- Kein natürlicher Modelllauf, keine bezahlten Anfragen (Vorgabe).
- Kein ST-isolierter Lauf; die Zahlen 237 + 28 + 60 stammen aus der Codex-Abnahme.
- Keine Simulatorläufe zum XP-Tempo.
- Keine A/B-Messung von Prompt-Varianten.
- Kein Langzeitlauf über 300 Nachrichten.

**Unsicherheiten:**

- Alle Laufzeitwerte (4.1, 4.2, 4.4) stammen aus Builds vor `.252`. Die Wirkung von `.252–.261` auf echte Wartezeiten ist offen.
- Die 63 Züge ohne `firstProse`-Marke habe ich nicht sicher klassifiziert.
- Die X-pro-Zug-Werte je Build beruhen auf kleinen Stichproben (13–24 Züge).
- Die Hochrechnung der Faltzeit auf 20.000 Events ist linear angenommen.
- Ob die `swipe_info`-Kopien von Revisionen gelesen werden, habe ich nicht vollständig geprüft. Deshalb ist C1 als „erst Leser prüfen“ formuliert.
- **Selbstkorrektur während der Arbeit:** Im ersten Entwurf stand, nur ein Replay-Manifest werde noch genutzt. Die Verbraucherprüfung zeigte 26 weitere Leser in `replay.test.js`. Abschnitte 2.4 und 8.3 sowie C4 sind entsprechend korrigiert. Das ist dieselbe Fehlerklasse wie bei meinen `.251`-Empfehlungen und der Grund für die Leitplanke in 8.4.
- Die 14 nicht namentlich gelesenen Manifeste könnten in Berichten verlinkt sein. Das habe ich nicht geprüft.
- Die Aufwandsschätzungen sind grob.
