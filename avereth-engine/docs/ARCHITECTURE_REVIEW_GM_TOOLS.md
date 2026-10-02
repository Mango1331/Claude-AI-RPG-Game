# Architektur-Review: Erzähler als GM mit Engine-Tools (Prototyp B)

Stand 02.10.2026. Geprüft wurden:
- **A**: Gen 3.5 / 4.2.1, `claude/gen35-world-envelope-2026-10-01` @ `90bd450`.
- **B**: der Prototyp `chatgpt/narrator-gm-tools-2026-10-02` @ `61e4b90` (4.3.0-alpha.1), ergänzt um die kleinen Korrekturen dieses Reviews (§13).
- **C**: ein unabhängig hergeleiteter Kandidat (§7).

Auftrag: `docs/CLAUDE_HANDOFF_GM_TOOLS.md`, P0.1–P0.4 und Fragen §15.

Kennzeichnung der Belege:
- **[Code]**: am Quelltext nachgelesen oder offline ausgeführt.
- **[Lauf]**: der Live-Lauf 4.2.1 vom 01.10.2026 (Chat, Event-Export, Request-Log), mit GLM-5.3-Flash.
- **[Smoke]**: echtes SillyTavern 1.19 mit Mock-Provider (`tools/st_live/run_gm.mjs`).
- **[P0]**: die P0-Messungen vom 27.09.2026 mit dem echten Modell (`docs/P0_BERICHT.md`).
- **[Quelle]**: externe Arbeit (§6).
- **[Schluss]**: eigene Folgerung, nicht gemessen.
- **[offen]**: braucht ein Experiment.

---

## 0. Ergebnis in Kürze

1. **Die Fehler des Laufs 4.2.1 liegen im Frontend von A, nicht in der Pipeline-Form.** [Lauf] [Code]
   - Ursachen: der Regex-Kampfpfad mit stillem Standardwert, eine fehlende Fähigkeit („Skill auf die Welt“), eine mehrdeutige Befehlsbeschreibung (`go` vs. Suche) und ein lückenhafter Identitätskatalog des Extraktors.
   - Alle vier sind ohne neue Architektur behebbar.
   - Die ersten beiden (Alias, kreativer Skill) verlangen aber ein Modell vor der Engine, auch im Kampf; der Regex kann sie nicht lernen (§4.2).
2. **B lief in echtem SillyTavern zunächst gar nicht.** [Smoke]
   - Jeder Tool-Aufruf bekam `no_active_gm_turn`.
   - Die Unit-Tests von B konnten das nicht sehen, weil sie den Host nicht berühren.
   - Nach zwei Host-Korrekturen und drei kleinen Laufzeit-Korrekturen (§5, §13) besteht B alle 13 Host-Prüfungen in drei Modi:
     - ohne Streaming;
     - mit Streaming;
     - mit wiederverwendeten Tool-IDs.
3. **B verlagert Komplexität, statt sie zu senken.** [Code] [Schluss]
   - Wegfallen würden der Interpreter-Aufruf, der Extraktor-Aufruf und die Regex-Autorität.
   - Neu dazu kommen:
     - eine Transaktion über die Tool-Rekursion von SillyTavern;
     - Stale-Filter;
     - die Abhängigkeit von Function Calling (Schalter, Quelle, Modell);
     - eine Swipe-Struktur, die SillyTavern bei Tool-Antworten aufbricht;
     - je Tool-Runde ein voller Erzähler-Aufruf;
     - Persistenz nur auf Zuruf des Erzählers.
   - Der Code von A bleibt als Rückfall bestehen; B entfernt keine Zeile davon.
4. **Die wichtigste Annahme von B ist ungemessen.** Die Annahme: Der Erzähler versteht die Spielerabsicht besser als der dedizierte Interpreter. [offen]
   - Die vorhandene Evidenz spricht eher gegen B als Zustandsschreiber:
     - P0/S2: Ein vom Erzähler mitgeschriebener Zustandsblock war bei GLM nur zu 43,9 % gültig und vollständig, mit 67,3 % Semantik. Der getrennte Extraktor kam auf 100 % und 87,4 %. [P0]
     - Die Literatur kennt „zu häufige Tool-Aufrufe“, modellfamilienabhängige Fehlkalibrierung der Entscheidung „Tool oder nicht“ und Qualitätsverlust beim Erzählen mit Tools. [Quelle]
5. **Empfehlung:**
   - B nicht als Zielarchitektur übernehmen und nichts davon in den Gen-3.5-Branch mergen.
   - Zuerst **S4** laufen lassen: gleicher Korpus, gleiches Modell, Erzähler mit GM-Tools gegen den Interpreter. S4 ist in diesem Review gebaut (§11.1).
   - Hält B semantisch mindestens mit, ist **C** der nächste Prototyp (Planer → Engine → Prosa → Audit, §7) als Geschwister-Branch von `90bd450`. Er holt Bs semantischen Gewinn ohne Function Calling.
   - Fällt B zurück, bleiben die vier Frontend-Korrekturen an A der kürzeste Weg (§11.4).
   - **Aus B sollte in jedem Fall bleiben:**
     - kein stiller semantischer Standardwert;
     - die Fähigkeit „Skill auf die Welt“, mit Kosten durch die Engine und Folgen durch den GM;
     - kanonische Lookups;
     - die Regel, dass ein Swipe neu entscheiden darf.

---

## 1. Grundlage und Methode

- **Code:**
  - A vollständig im Zugpfad: `index.js`, `src/v4/runtime.js`, `src/ir.js`, `src/intent.js`, `src/v4/interpret.js`, `src/v4/agency.js`, `src/v4/turn.js`, `src/v4/commands.js`, `src/v4/extract.js`, `src/v4/firewall.js`, `src/v4/ownership.js`, `src/v4/envelope.js`, `src/v4/world.js`, `src/engine.js`.
  - B vollständig: `src/gm/*`, Diff von `index.js`, `docs/ARCHITECTURE_GM_TOOLS.md`.
  - SillyTavern 1.19 im Quelltext: `public/script.js` (Generate, saveReply, Tool-Rekursion), `public/scripts/tool-calling.js`, `public/scripts/extensions.js`, `src/endpoints/backends/chat-completions.js`.
- **Lauf 4.2.1:** 43 Anfragen an `zai-org/GLM-5.3-Flash`, `stream: false`.

  | Rolle | Aufrufe | Prompt im Mittel | Completion im Mittel | Temperatur / Latenz |
  |---|---|---|---|---|
  | Interpreter | 10 | 3.074 | 40 | t 0,1; 2,3–6,2 s |
  | Erzähler | 15 | 7.883 | 344 | t 0,9 |
  | Extraktor | 17 (davon 2 Reparaturen) | 4.738 | 317 | 10–68 s |
  | Board | 1 | 1.331 | 996 | – |

  Insgesamt 230.880 Prompt- und 11.958 Completion-Token, also ≈ 15,4k Prompt-Token je Erzählzug.
- **Ausgeführt:**
  - `npm test` vor und nach den Korrekturen;
  - der neue ST-Smoke in drei Modi;
  - ein deterministischer Probelauf der §11-Sätze durch As Router (§4.2);
  - S4 gegen Mock-Backends und end-to-end durch echtes SillyTavern.

---

## 2. A: Gen 3.5 / 4.2.1, aus dem Code

### 2.1 Zugablauf

| Stufe | Datei | LLM | Entscheidet | Im Lauf 4.2.1 |
|---|---|---|---|---|
| 1. Router + Intent-IR | `src/ir.js` `readTurn`, `src/intent.js` `parseIntent` | nein | Route `v3` (Kampf, Schleichen, `#`, Erschaffung) oder `v4` (Story) | Regex entscheidet Kampf allein |
| 2a. V3-Kampf | `src/engine.js` `playerTurn`, `src/combat.js` | nein | Treffer, Schaden, NPC-Züge, Würfel | kein Modellaufruf vor der Prosa |
| 2b. Interpreter | `src/v4/interpret.js` (Schema aus `content/commands.json`, 20 Befehle) | ja, ≈ 3,1k Prompt | Story-Befehle mit `quote` | 10 Aufrufe, 2,3–6,2 s |
| 3. Agency-Guard | `src/v4/agency.js` | nein | entfernt Frage, Plan, Verneinung, fremde Tat (nur entfernen, nie ergänzen) | – |
| 4. Engine | `src/v4/turn.js` `playerTurnV4`, `src/v4/commands.js` | nein (Board: ja) | resolved / authorized / conditional / pending / refused / clarify | Ereignisse auf der Spielernachricht, swipe-stabil |
| 5. Erzähler | Preset + Engine-Block (`src/context.js`) | ja, ≈ 7,9k | nur Prosa | 15 Aufrufe |
| 6. Extraktor | `src/v4/extract.js` (30 Delta-Typen, `content/deltas.json`) | ja, ≈ 4,7k | Weltänderungen aus der Prosa | 17 Aufrufe, 10–68 s, blockiert den nächsten Zug (Barriere) |
| 7. Firewall, Ownership, Envelope, Welt | `firewall.js`, `ownership.js`, `envelope.js`, `world.js`, `delta.js` | nein | was davon gilt | Ereignisse auf dem Swipe (text_hash) |

### 2.2 Was jede Schicht kauft, was sie kostet

| Schicht | Notwendig, weil | Zufällige Komplexität |
|---|---|---|
| Deterministische Engine (2a, 4, 7) | Zahlen, Würfel, Geld, Rang bleiben reproduzierbar. Ohne sie: Labyrinth-Deadlock, RPGBench-Inkonsistenz [Quelle] | keine; sie bleibt in A, B und C |
| Regex-Router (1) | 0 LLM-Aufrufe im Kampf (Latenz) | **stille Standardwerte**: `src/intent.js:271` nimmt den Basisangriff, wenn Angriffswörter ohne erkannten Skill vorkommen; Kreativ-Nutzung eines Kampf-Skills wird immer Angriff oder `no_target` (§4.2) |
| Interpreter (2b) | eine Absicht in Befehle mit Beleg (`quote`); prüfbar, versioniert | ein zweites Modell-Lesen derselben Nachricht; Vokabular-Grenzfälle (§4.1 F3) |
| Agency-Guard (3) | P0: Negativ-Präzision 93,1 % → 100 % auf dem Korpus (optimistisch, am Korpus entworfen) [P0] | Englisch-Heuristiken (Frage, Plan, Rückblick) |
| Extraktor (6) | Weltänderungen aus freier Prosa ohne Zutun des Erzählers; P0: 87,4 % Semantik gegen 67,3 % beim mitgeschriebenen Block [P0] | ein drittes Lesen, die meiste Wartezeit; Identitätsfehler bei unvollständigem Katalog (§4.1 F4/F5) |
| Firewall, Ownership, Envelope (7) | der Erzähler kann Engine-Zustand (Coin, XP, Rang, Inventar) nicht behaupten | viele Sprachregeln; in B unverändert nötig |

---

## 3. B: Prototyp, aus dem Code

### 3.1 Zugablauf (nach den Korrekturen §13)

```text
Interceptor (index.js) → prepareGmGeneration (src/gm/host.js): Kontext ohne Vorab-Auflösung, GM-MODE-Hinweis
  → gmSession (Arbeitsspeicher): beforeState, userIndex, inputHash, staleToolInvocations
SillyTavern registriert die fünf Tools (shouldRegister: Sitzung aktiv) und ruft den Erzähler
  ↺ Tool-Aufruf → src/gm/runtime.js:
      avereth_lookup                   Zustand lesen
      avereth_resolve_combat           Absicht → playerTurn (V3-Kampf)
      avereth_resolve_story            V4-Befehle → Schema + Agency-Guard → playerTurnV4
      avereth_use_ability_on_world     Skill prüfen, Kosten buchen, Rohkraft melden (Folgen entscheidet der GM)
      avereth_commit_world             18 der 30 Delta-Typen → applyWorld (Firewall, Ownership, Envelope)
    SillyTavern speichert die Tool-Nachricht und ruft den Erzähler erneut (Rekursion, Grenze 5)
GENERATION_ENDED → finalizeGmSession (ohne Tool: impliziter Erzählzug) → alle Ereignisse und HUD auf die letzte Antwort
```

### 3.2 Was B entfernt, verlagert und neu einführt

| | Was |
|---|---|
| **entfällt im GM-Modus** | Regex-Autorität für Kampf (bleibt für `#` und die Erschaffung); Interpreter-Aufruf; Extraktor-Aufruf |
| **wird verlagert** | Semantik (Interpreter → Erzähler); Persistenz (Extraktor → `commit_world` auf Zuruf) |
| **neu (Code)** | `src/gm/runtime.js` 414, `tools.js` 95, `host.js` 106 Zeilen; `index.js` +127; Host-Transaktion über die Rekursion; Stale-Filter für Tool-Nachrichten alter Zweige |
| **neu (je Anfrage)** | fünf Tool-Schemata ≈ 1,36k Token; GM-Hinweis |
| **neu (Betrieb)** | SillyTavern-Schalter „Enable function calling“, eine Quelle und ein Modell, die Tools können; Tool-Nachrichten sichtbar im Chat; „Continue“ läuft über A |
| **bleibt (Rückfall)** | der ganze Code von A; B löscht nichts |

Die Kette „Parser + Interpreter + Guard + Engine + Erzähler + Extraktor + Firewall“ (Handoff §12) wird zu:

> Erzähler mit Tools + Schema + Guard + Engine + Firewall/Ownership/Welt + Host-Transaktion + Stale-Filter.

Es fehlen zwei Modellaufrufe; dazu kommen zwei Host-Mechanismen und eine Plattformabhängigkeit. [Code]

---

## 4. Der Lauf 4.2.1: was wirklich versagt hat

### 4.1 Befunde

| | Spielernachricht | Was geschah | Ursache | Schicht |
|---|---|---|---|---|
| F1 | „I Fire Lance Barkscorpion B“ | Basisangriff gebucht; der Erzähler beschrieb Feuer | `parseIntent`: Angriffswort, kein bekannter Skill → `basic_attack` (`src/intent.js:271`) | Regex-Frontend: stiller Standardwert |
| F2 | „I use Arcane Burst to Blow the hole up“ | `no_target`-System-Panel; der Erzähler kam nicht zu Wort | Ein Kampf-Skill gegen kein Wesen hat in A keine Darstellung (`src/intent.js:275`, `src/engine.js:96`) | fehlende Fähigkeit |
| F3 | „I ignore him and look for the other 2“ | Interpreter: `go {new: "the other 2 barkscorpions"}`; der Extraktor zog die Szene zurück | Die `go`-Beschreibung in `content/commands.json` lehrt „looks for a kind of place (look for an inn → {new})“ | Vokabular, mehrdeutig |
| F4 | (Nachricht 28) | zweiter Odlem (`npc.odlem` neben `npc.odlem_sart`) | Der Extraktor-Katalog enthält bekannte NPCs außerhalb der Szene nicht | Identitätskatalog |
| F5 | (Nachricht 30) | Duplikat des gerade getöteten Skorpions | Der Katalog enthält kürzlich Tote nicht | Identitätskatalog |

Interpreter, Erzähler und Extraktor sind **dasselbe Modell**. Keiner der Fehler ist ein Fehler des Modells, das in B die Semantik bekäme. Zwei entstanden ganz ohne Modell (F1, F2), einer im Vokabular (F3), zwei im Katalog (F4, F5). [Lauf] [Code]

### 4.2 Die Sätze aus Handoff §11 durch As Router (deterministisch, ohne LLM)

Mage mit Flame Lance und Arcane Burst. „ruhig“: drei Skorpione bemerkt, kein Kampf. „Kampf“: Kampf gegen zwei Skorpione. [Code]

| Satz | ruhig | Kampf | richtig wäre |
|---|---|---|---|
| I Fire Lance Barkscorpion B. | `no_target` (Basisangriff) | **Angriff mit Basisangriff** auf B | Flame Lance auf B |
| I hit the wounded one with Flame Lance. | `no_target` | `ambiguous_target` | Nachfrage oder der Verwundete |
| I blast the one on the left. | Interpreter | **narrative**: kein Angriff | Angriff (Skill offen) oder Nachfrage |
| I attack it. | `no_target` | `ambiguous_target` | Nachfrage ✓ |
| I ignore him and look for the other two. | Interpreter (Lauf: `go`) | narrative | Suche |
| I follow the drag marks. | Interpreter | narrative | Spur folgen (Suche/Bewegung) |
| I go back to the burrow we already found. | Interpreter | narrative | `go` zum bekannten Ort |
| I use Flame Lance on the cracked floor to open the cave. | `no_target` | **Angriff auf einen Skorpion** (`ambiguous_target`) | Skill auf die Welt |
| I try to burn through the wet rope with Flame Lance. | `no_target` | `ambiguous_target` | Skill auf die Welt |
| I Arcane Burst the loose rubble away from the doorway. | `no_target` | `ambiguous_target` | Skill auf die Welt |
| I use Arcane Burst to Blow the hole up | `no_target` | `ambiguous_target` | Skill auf die Welt |

**Ergebnis:**
- 6 der 11 Sätze deutet der Regex falsch oder verliert sie:
  - alle vier kreativen Sätze werden Angriff oder Fehlermeldung;
  - der Alias wird still zum Basisangriff;
  - „blast the one on the left“ verliert die Handlung.
- 2 beantwortet er vertretbar mit einer Nachfrage.
- 3 (Suche, Spur, Rückweg) gehen außerhalb des Kampfs an den Interpreter (im Lauf: F3); im Kampf werden sie bloße Erzählung.

Das ist der stärkste Befund **gegen As Frontend**. Er spricht für ein Modell vor der Engine, aber nicht notwendig für Function Calling (§7).

---

## 5. B im echten SillyTavern (P0.2–P0.4)

### 5.1 Befunde

| | Befund | Beleg | Wirkung | Status |
|---|---|---|---|---|
| D1 | Commit bei `MESSAGE_RECEIVED`: SillyTavern sendet das Ereignis auch für die leere Zwischenantwort vor den Tools (`saveReply` vor `invokeFunctionTools`; beim Streaming `finalizeIntermediaryMessage`) | [Smoke] Ausgangsstand: alle Tools `no_active_gm_turn`, fünf Wiederholungen bis zur Rekursionsgrenze, Endantwort nur `implicit_narrative_turn` | **B war im Host funktionslos** | behoben: Commit bei `GENERATION_ENDED` |
| D2 | `MESSAGE_DELETED` beendete die Sitzung; SillyTavern löscht die leere Zwischenantwort vor den Tools (`deleteLastMessage`) | [Smoke] die nächste Rekursion legte eine neue Sitzung an und filterte die eigenen Tool-Ergebnisse als „alt“ aus dem Prompt | dasselbe | behoben: die Sitzung endet nur, wenn ihre Spielernachricht fehlt |
| D3 | Stale-Filter über Tool-IDs | [Smoke] mit wiederholten IDs (manche OpenAI-kompatiblen Backends) sieht das Modell das eigene Ergebnis nie und ruft das Tool bis zur Grenze | Schleife | behoben: Filter über die Aufruflisten selbst (`extra.tool_invocations`, im Prompt-Abzug dieselben Arrays) |
| D4 | `commit_world` kannte kein `arrive` | [Smoke] nach „go to the Guild hall“ blieb `scene.at` am Wegrand; `lookup` meldete dem Modell den alten Ort | keine Reise endete | behoben, mit Test |
| D5 | `resolve_story` nahm schemalose Befehle an | [Code] `{type:'activity', activity:'search'}` → „UNDEFINED for a while“, ok=true; `{type:'go', destination}` → „GOES — to somewhere“ | still falsche Ergebnisse | behoben: Schema des Produkt-Interpreters; Fehler mit den erwarteten Argumenten zurück |
| D6 | `resolve_story` umging den Agency-Guard | [Code] | eine Frage oder ein Plan konnte gebucht werden | behoben: derselbe Guard; `quote` ist Pflicht |
| D7 | Swipe mit Tool-Aufrufen | [Code] `public/script.js` 5413/5543: `type !== 'swipe'` → keine Löschung; [Smoke] | der geswipte Beitrag behält einen leeren neuen Swipe mit der alten Aufzeichnung; Tool-Nachrichten und Endantwort hängen hinten an; der alte Swipe ist nur nach Löschen erreichbar | **Zustand richtig** (die geerbte Aufzeichnung passt nicht zum Text und zählt nicht), **Struktur bleibt**: Eigenheit von SillyTavern |
| D8 | `commit_world` deckt 18 von 30 Delta-Typen | [Code] es fehlen `offer`, `object.*`, `coin.gift`, `coerce`, `learn`, `quest.offer`, `quest.close`, `listing.gone`, `recover`, `overreach` | Preisangebot eines NPC (und damit `offer.accept`), Geschenk, Raub, Wissen sind im GM-Modus nicht persistierbar | dokumentiert (P1-Entwurf, kein Testbarkeitsfehler der §11-Szenarien) |
| D9 | `pending_combat` wird von `resolve_story` / `use_ability_on_world` nicht eröffnet | [Code] | Umgehung; in V4 selten (ein Angriff eröffnet sofort) | dokumentiert |
| D10 | Die Unit-Tests von B testen Laufzeitfunktionen mit vorgegebener richtiger Semantik | [Code] | sie können weder D1–D3 noch die Kernannahme (Semantik) prüfen | ergänzt: Host-Smoke (§5.2) und S4 (§11.1) |

### 5.2 Prüfmatrix (`tools/st_live/run_gm.mjs`)

Ablauf: P1 Reise, P2 Gespräch, P3 Markierung (lookup → commit), Swipe ohne Tool, alter Swipe gewählt, P4 Fakt per Tool, Swipe mit anderem Fakt per Tool, P5 Fakt, Regenerate ohne Tool, Löschen + Neu, Speichern + Neuladen.

| Prüfung (Handoff) | ohne Streaming | Streaming | wiederholte IDs | Original-Host (vor D1–D3) |
|---|---|---|---|---|
| Tools bei der ersten Anfrage angeboten (Interceptor vor `shouldRegister`) | ✓ | ✓ | ✓ | ✓ |
| kein Tool verliert seinen Zug | ✓ | ✓ | ✓ | ✗ |
| die Rekursion sieht die Tool-Ergebnisse | ✓ | ✓ | ✓ | ✗ |
| Tool-Nachrichten tragen keine Ereignisse (kein früher Commit) | ✓ | ✓ | ✓ | ✓ |
| Endantwort trägt den ganzen Zug und das HUD | ✓ | ✓ | ✓ | ✗ |
| Reise endet über `arrive` | ✓ | ✓ | ✓ | ✗ |
| Swipe verwirft den Fakt des ersten Swipes, gleicher Zug | ✓ | ✓ | ✓ | ✗ |
| alter Swipe gewählt: sein Fakt gilt wieder | ✓ | ✓ | ✓ | ✗ |
| Swipe mit Tool ersetzt den Fakt (erbt ihn nicht) | ✓ | ✓ | ✓ | ✗ |
| Regenerate verwirft den Fakt | ✓ | ✓ | ✓ | ✗ |
| Löschen + Neu bucht einmal | ✓ | ✓ | ✓ | ✗ |
| Neuladen: gleicher Zustand | ✓ | ✓ | ✓ | ✓ |
| keine Seitenfehler | ✓ | ✓ | ✓ | ✓ |

Zusätzlich gelten zwei Punkte nur am Code geprüft:
- **Bearbeiten:** `onEditedV4` stempelt die Aufzeichnung jeder Antwort neu, auch die GM-Aufzeichnung; eine bearbeitete Antwort behält ihre Ereignisse.
- **HUD:** `processGmReply` rendert das HUD aus `finalizeGmSession(...).state`, also aus genau dem Zustand, der gebucht wird.

### 5.3 Was in B strukturell bleibt

- **D7 (Swipe-Struktur):**
  - Bei Tool-Antworten hält SillyTavern „ein Beitrag = ein Swipe“ nicht ein.
  - Das ist keine Fehlfunktion von B, sondern der Preis von Function Calling in diesem Host.
- **Sichtbare Tool-Nachrichten:**
  - Regenerate lässt die Tool-Nachrichten des alten Zweigs im Chat stehen. Sie sind gespeichert, sichtbar und nur aus dem Prompt gefiltert.
- **Abhängigkeit:**
  - Ohne den Schalter „Enable function calling“, bei Text-Completion, bei `continue`, `impersonate` oder `quiet` fällt B auf A zurück. Das steht so in der SillyTavern-Doku [Quelle 8].
  - Das ist die Bedingung eines Paarvergleichs: Wer B testet, muss den Schalter setzen.

---

## 6. Unabhängige Recherche

| # | Quelle | Was sie tatsächlich zeigt | Übertragbar auf Avereth | Annahmen anders | Hier zu prüfen |
|---|---|---|---|---|---|
| 1 | Song, Zhu, Callison-Burch 2024, [Labyrinth: Enhancing AI Game Masters with Function Calling](https://arxiv.org/abs/2409.06949) | GPT-4 als GM, 7 Bewerter × 12 Skripte:<br>– Konsistenz 4,388 mit Würfel- und Zustandsfunktionen;<br>– 3,983 nur Würfel;<br>– 3,358 nur Zustand;<br>– 3,420 ohne Funktionen;<br>– Unit-Test-Genauigkeit der Zustandsupdates 0,422 (alle), 0,461 (nur Zustand), 0,267 (manuell).<br>Fehlerbilder:<br>– „dice roll deadlock“ ohne Würfelfunktion;<br>– Zustandsfunktionen „too frequently“;<br>– nur Würfel lässt unrealistische Züge zu | Engine-Würfel und Engine-Zustand helfen (haben A und B). **Auch mit Funktionen bleiben unter 50 % der Zustandsupdates richtig** → Zustand nicht allein dem GM-Modell überlassen | ein Szenario, kurze Sitzungen, GPT-4 | Persistenz-Auslassungen und -Fehler von `commit_world` live zählen |
| 2 | Jørgensen u. a. 2025, [Static vs. Agentic Game Master AI](https://arxiv.org/abs/2502.19519) | Erzähler- und Archivar-Agent mit ReAct-Tools gegen einfachen Prompt:<br>– 12 Teilnehmer;<br>– 9 von 14 Konstrukten signifikant besser;<br>– starke Prompt-Empfindlichkeit („even the wording of a specific example … can significantly alter the system's functionality“) | Bestätigt die Trennung „Erzähler ≠ Zustandshalter“ (wie As Extraktor), nicht „Erzähler bucht alles“ | Vergleich gegen einen schwachen Baseline-Prompt, nicht gegen einen Parser; sehr kleine Stichprobe | – |
| 3 | Yu u. a. 2025, [RPGBench](https://arxiv.org/abs/2502.00595) | „engaging stories but … struggle to implement consistent, verifiable game mechanics“, besonders lang und komplex | deterministische Engine (A, B, C gleich) | Benchmark-Spiele | – |
| 4 | Bicking 2025, [Intra: design notes](https://ianbicking.org/blog/2025/07/intra-llm-text-adventure) | Praxisbericht:<br>– Eingabe zuerst parsen, „to make the game less suggestable“;<br>– Tools „lose some of their broader intelligence“ beim Erzählen;<br>– Zustand über Inline-Markup statt Tools;<br>– „ungrounded resolutions“ ändern keinen Zustand | spricht für Vorab-Parsen (A, C) und gegen Erzähler-Tools (B) | Einzelentwickler, ungemessen, anderes Modell | S4 misst genau die Parser-gegen-Erzähler-Frage |
| 5 | Xu u. a. 2023, [ReWOO](https://arxiv.org/abs/2305.18323) | Plan zuerst, Tools danach, dann Antwort: 5-fache Token-Effizienz gegen ReAct, +4 % Genauigkeit (HotpotQA) | C hat die ReWOO-Form, B die ReAct-Form | QA, nicht Erzählung | Token und Latenz je Zug (Messblatt §11.3) |
| 6 | Berkeley, [BFCL V3 Multi-Turn](https://gorilla.cs.berkeley.edu/blogs/13_bfcl_v3_multi_turn.html) | Modelle versagen im Mehrzug-Function-Calling bei impliziten Schritten, Zustandsbewusstsein und Überplanung | Bs Tool-Entscheidung jede Runde über lange Kampagnen | synthetische Aufgaben | Langlauf: Tool-Fehler über Zugzahl |
| 7 | Zhao u. a. 2026, [Calibration is the Bottleneck](https://arxiv.org/abs/2609.00949) | Die Entscheidung TOOL_CALL / ASK / REFUSE / CONFIRM ist schlecht kalibriert; gleiche Kontextänderung: +11,5 bis −21,0 Prozentpunkte je nach Modellfamilie | „Tool oder Erzählen“ ist genau diese Entscheidung → **Portabilitätsrisiko** zwischen Modellen | andere Domäne | S4 je Modell, das der Spieler nutzt |
| 8 | [SillyTavern: Function Calling](https://docs.sillytavern.app/for-contributors/function-calling/) | – unterstützte Quellen (u. a. Custom, NanoGPT, Z.AI/GLM);<br>– Schalter nötig;<br>– Rekursionsgrenze 5;<br>– „no guarantee that an LLM will perform any function calls“;<br>– Tool-Aufrufe sichtbar im Chat;<br>– `continue`, `impersonate`, `quiet` ohne Tools | Bs Host-Bedingungen (§5.3) | – | – |
| 9 | SillyTavern 1.19, `public/script.js` | Swipe mit Tool-Aufruf bleibt stehen (D7); `MESSAGE_RECEIVED` vor den Tools (D1) | B, Host | – | – |
| 10 | eigene P0-Messung (`docs/P0_BERICHT.md`) | – S1 Interpreter: Negativ-Präzision 93,1 %, mit Guard 100 % (optimistisch), Recall 94,2 %, p50 3,7 s;<br>– S2: Extraktor nach der Antwort 87,4 % Semantik gegen mitgeschriebenen Block 67,3 % (Block gültig 43,9 %), Extraktor günstiger | **Direkte Vorhersage für `commit_world`**: dasselbe Modell schrieb Zustand beim Erzählen deutlich schlechter als ein getrennter Leser | Block statt Tool; anderer Prompt | live: Auslassungen von `commit_world` gegen den Extraktor als Audit |

**Nicht gefunden:**
- eine Arbeit, die „Erzähler mit Tools“ gegen „dedizierten Parser vor dem Erzähler“ bei gleichem Modell misst;
- eine Arbeit mit SillyTavern-Hostbedingungen.

Genau diese Lücke schließt S4 (§11.1).

---

## 7. Kandidat C, unabhängig hergeleitet

### 7.1 Herleitung

Aus §4 folgen drei Anforderungen.
1. **Vor der Engine muss ein Modell entscheiden, wo Sprache offen ist.** Das gilt auch im Kampf, für Skill-Aliase und für kreative Skill-Nutzung (F1, F2, §4.2). Regex darf nur „sicher“ oder „frag das Modell“ sagen, **nie einen Standardwert**.
2. **Das Fähigkeitsset muss offen genug sein.** „Skill auf die Welt“, „Probe“ und „Nachfrage“ gehören dazu, ohne je Verb einen Befehl.
3. **Persistenz braucht einen Leser, der nicht erzählt** ([P0] S2, [Quelle] 1, 2), oder zumindest ein Audit.

Function Calling ist für keine der drei nötig. Es bringt aber die Kosten aus §5.3.

### 7.2 C: Planer → Engine → Prosa → Audit (ReWOO-Form)

```text
player → [Planer: 1 strukturierter Aufruf, JSON, t niedrig, Katalog + Kampfbrett + bekannte Skills]
       → Schema + Agency-Guard → deterministische Engine (bestehende Handler; Bs useAbilityOnWorld als Handler)
       → [Erzähler: 1 Aufruf, nur Prosa, streambar, keine Tools]
       → [Extraktor als Audit, Identitätskatalog um bekannte Abwesende und frisch Tote erweitert]
       → Firewall / Ownership / Welt → Ereignisse
```

- **Planer** (ersetzt Regex-Kampfpfad und Interpreter; eine Autorität statt zwei):
  - Er sieht das, was der heutige Interpreter sieht, plus Kampfbrett (Labels, HP-Stand), bekannte Skills und den Anfang der letzten Antwort.
  - Er antwortet aus einem kleinen, offenen Satz von Formen:
    - die bestehenden V4-Story-Befehle;
    - `combat` {action, skill, target, move};
    - `ability_on_world` {skill, target, goal};
    - `check` {what, stakes};
    - `clarify` {question};
    - leer.
  - Jede Form trägt `quote`.
  - Deterministisch bleiben nur `#`-Befehle und die Erschaffung.
- **Engine:** unverändert, plus der Handler aus B für „Skill auf die Welt“. Die Engine bucht die Kosten und meldet die Rohkraft; über die Folge entscheidet der Erzähler im Rahmen.
- **Erzähler:** wie in A; ein Aufruf, Streaming möglich, keine Plattformbedingung.
- **Audit:** der Extraktor wie heute. Spätere Stufe: nur wenn die Prosa Zustandsänderung vermuten lässt (Handoff §8, Schritt 3).
- **Swipe:**
  - Der Plan liegt auf dem Swipe der Antwort; ein Swipe plant neu (Handoff-Invariante).
  - Der Würfel-Cursor ist der Zustand vor dem Zug (`Dice.from(state)`). Dieselbe Handlung bringt also dieselben Würfe; es gibt kein Neuwürfeln durch Swipen.
  - Die Alternative „Plan auf der Spielernachricht, Swipe = nur Prosa“ (wie A) ist eine Produktentscheidung (§10).

**Was C gegenüber A ändert:**
- Regex verliert seine semantische Autorität.
- Es gibt einen Planer statt Parser plus Interpreter.
- Drei neue Formen kommen dazu: Welt-Skill, Probe, Nachfrage.
- Der Extraktor-Katalog wird erweitert.

**Was C gegenüber B ändert:**
- kein Function Calling;
- eine feste Zahl kleiner Aufrufe;
- der Plan ist eine prüfbare Aufzeichnung;
- Persistenz durch einen Leser, nicht auf Zuruf.

**Ehrlich:** C ist eher ein Umbau von As Frontend als eine neue Architektur. Gerade darin liegt der Wert: Die gemessenen Fehler sitzen dort.

### 7.3 Erwogen und verworfen (oder als spätere Messung)

| Variante | Warum nicht jetzt |
|---|---|
| Inline-Markup im Erzähler statt Extraktor (Intra, [Quelle] 4) | [P0] S2 hat genau das als Block gemessen: 43,9 % gültig, 67,3 % Semantik. Höchstens als Audit-Auslöser messen |
| Strukturierte Zustandsausgabe direkt vom Erzähler (JSON neben der Prosa) | wie oben; dazu Streaming und Prosaqualität |
| Tools nur für harte Domänen, Regex für den Rest | der Regex-Teil ist der gemessene Fehler (§4.2) |
| Erzähler-Planer als zweiter Aufruf desselben Erzähler-Prompts (volle 7,9k) statt kleiner Planer-Prompt | möglich als C-Variante, wenn S4 zeigt, dass der Erzähler-Kontext die Semantik verbessert; teurer |

---

## 8. Vergleich A / B / C

Werte: + gut, ○ mittel, − schwach. In Klammern der Beleg. „B (heute)“ meint B mit den Korrekturen §13.

| Kriterium | A (4.2.1) | B (heute) | C (Entwurf) |
|---|---|---|---|
| Semantik natürlicher Sprache | ○ Story über den Interpreter (S1: Recall 94,2 %); − im Kampf und bei kreativen Skills (§4.2) [P0][Code] | ? Annahme von B [offen: S4] | ? wie Interpreter, mehr Formen und Kontext [offen: S4-Vergleich] |
| Kreative Handlungsfreiheit | − (F2, §4.2) | + Welt-Skill, GM-Entscheid [Code] | + derselbe Handler [Schluss] |
| Regeltreue (Zahlen) | + [Code] | + Engine unverändert, Schema + Guard nachgerüstet [Code] | + [Schluss] |
| Identität und Persistenz | ○ Extraktor 87,4 % [P0]; F4/F5 [Lauf] | − nur auf Zuruf; 12 Delta-Typen fehlen (D8); S2-Analogie 67,3 % [P0][Code] | ○→+ Extraktor plus Katalog-Fix [Schluss] |
| Spieler-Agency | + Guard [P0] | + Guard nachgerüstet (D6) [Code] | + [Schluss] |
| Fehler-Transparenz | ○ Panels ohne Erzählung (F2); stille Standardwerte (F1) | + Tool-Fehler zurück an das Modell; − Persistenz-Auslassung still | + `clarify` als Form; Audit sichtbar [Schluss] |
| Debug / Replay | + Ereignisse + IR-Record | ○ Aufrufliste im Record, Tool-Nachrichten im Chat, Struktur bei Tool-Swipes (D7) | + Plan als Record [Schluss] |
| Swipe / Regenerate | + Mechanik swipe-stabil; ○ Umdeuten nur über Bearbeiten | ○ Zustand richtig (§5.2); − Struktur (D7) | + neu planen je Swipe, ohne Host-Struktur [Schluss] |
| Token je Zug | ≈ 15,4k Prompt (gemessen) [Lauf] | Gespräch 1 Aufruf ≈ 9,2k; Handlung 2–3 Aufrufe ≈ 18–28k [Schluss] | ≈ 16k: Planer ≈ 3–4k + 7,9k + 4,7k [Schluss] |
| Aufrufe und Latenz vor der Prosa | Story: Interpreter 2–6 s; Kampf: 0 | jede Tool-Runde ein voller Aufruf, alle vor der Prosa [Schluss; offen] | Planer 2–6 s, auch im Kampf (+1 gegenüber A) [Schluss] |
| Portabilität Provider/Modell | + nur Chat-Completion | − Function Calling, Schalter, Kalibrierung je Familie [Quelle 7, 8] | + nur Chat-Completion |
| SillyTavern-Integration | ○ Interceptor + Barriere | − Rekursion, Stale-Filter, Commit-Zeitpunkt (D1–D3 waren funktionsentscheidend) | ○ wie A |
| eigener Code / Sonderfälle | − viele Sprach-Heuristiken | ○ +740 Zeilen, A bleibt als Rückfall | ○ Regex-Kampfpfad weg, Planer-Formen neu |
| Testbarkeit | + Korpus, Golden, Replay | ○ Laufzeit testbar; Semantik nur live/S4 | + Planer-Korpus wie S1 |
| Neue Mechanik ohne Englisch-Ontologie | ○ neuer Befehl je Domäne | + Fähigkeiten | + Formen (wenige) |
| Risiko stiller semantischer Fehler | − (F1, §4.2) | ○ Modell kann nicht aufrufen („no guarantee“) | ○ Modell kann falsch planen, Guard + Audit |
| Verhalten bei Modell-/Tool-Fehler | + Abbruch mit Hinweis, kein halber Zug | ○ Rekursionsgrenze; impliziter Erzählzug bei keinem Tool | + wie A |

---

## 9. Die stärksten Argumente

**Gegen B:**
1. Die Kernannahme ist ungemessen. Die beste vorhandene Messung (S2) zeigt: Dasselbe Modell schreibt Zustand beim Erzählen deutlich schlechter als ein getrennter Leser.
2. Persistenz auf Zuruf ist ein stiller Fehlermodus. Was der Erzähler nicht committet, existiert nicht, und nichts meldet es. Labyrinth: auch mit Funktionen < 50 % richtige Zustandsupdates.
3. Bs Host-Kopplung ist der Ort, an dem es zuerst gebrochen ist (D1–D3, funktionsentscheidend). Sie bleibt strukturell (D7, sichtbare Tool-Nachrichten, Schalter, Streaming-Abhängigkeiten).
4. Mehr volle Aufrufe auf dem kritischen Pfad bei Handlungszügen. Die Prosa kommt erst nach allen Runden.
5. Portabilität: Die Tool-Entscheidung ist je Modellfamilie verschieden kalibriert (+11,5 bis −21,0 pp).
6. Code und Wartung sinken nicht: A bleibt als Rückfall, B kommt hinzu.

**Gegen das Beibehalten von A:**
1. Der Regex-Kampfpfad deutet still um (F1) und kennt keine kreative Skill-Nutzung (F2, §4.2: 0 von 4 kreativen Sätzen).
2. Drei Modell-Lesungen derselben Situation (Interpreter, Erzähler, Extraktor). Der Extraktor ist die längste Wartezeit (10–68 s).
3. Viele englische Heuristiken (Guard, Firewall, Ownership) als zweite Linie. Jede neue Domäne braucht neue.
4. Ein Umdeuten des Spielers geht nur über Bearbeiten, nicht über Swipe.

**Gegen C:**
1. Im Kampf ein Aufruf mehr vor der Prosa (2–6 s), wo A heute 0 hat.
2. Der Extraktor bleibt. Die teuerste Stufe von A wird nicht billiger, bevor das Audit-Kriterium gemessen ist.
3. C ist ungetestet. Planer-Formen können wieder zur Ontologie wachsen, wenn man nicht streng bei wenigen bleibt.

---

## 10. Was Code und Recherche beantworten — was nur Experimente beantworten

| Frage | beantwortbar durch | Stand |
|---|---|---|
| Wo kommen die Fehler von 4.2.1 her? | Code + Lauf | beantwortet (§4) |
| Funktioniert Bs Transaktion in SillyTavern? Swipe, Regenerate, Reload? | Smoke | beantwortet (§5), mit Korrekturen |
| Kann B die Regeln umgehen (MP, XP, Coin, Rang)? | Code | nein: Ownership/Firewall unverändert; Guard und Schema nachgerüstet |
| Versteht der Erzähler mit Tools die Absicht besser als der Interpreter? | **S4** (gebaut) | offen |
| Ruft das Modell im normalen Gespräch keine Tools? | S4 (Negativfälle) + live | offen |
| Wie oft lässt der Erzähler einen dauerhaften Wandel uncommittet? | live (Extraktor als Audit daneben) | offen |
| Latenz und Token je Zug von B mit dem echten Provider (Caching?) | live, Messblatt | offen |
| Kampf-Aliase, kreative Skills, Suche gegen Reise mit Modell | S4b (zu bauen) + live | offen |
| Swipe = nur Prosa (A) oder Swipe = neu entscheiden (B, C)? | **Produktentscheidung** des Spielers | offen |

---

## 11. Testplan vor jedem Umbau

### 11.1 S4: Erzähler mit GM-Tools gegen Interpreter (gebaut)

`tools/p0/s4_gm_tools.mjs`, Tests `tests/p0/p0_s4.test.js`. Der Ablauf je Fall:
- System: der Erzählervertrag v4 mit dem GM-Hinweis.
- User: Szene und Spielernachricht des S1-Korpus (256 Fälle, 87 Negativfälle).
- Die fünf GM-Tools werden angeboten.
- Ein Lookup oder ein abgewiesener Befehl bekommt sein Ergebnis und eine weitere Runde, wie in B.
- Gewertet wird wie in S1: Befehle aus `resolve_story`, Kampf- und Welt-Skill-Aufrufe als Festlegung, mit und ohne Agency-Guard.
- Kein Key, kein Header, keine URL wird geschrieben. Geprüft end-to-end durch echtes SillyTavern: Tools und `tool_choice` gehen durch, Mehrrunden-Verläufe kommen zurück.

Anleitung für Windows; der Key bleibt in SillyTavern (`docs/P0_SPIKES.md` §3.2). SillyTavern läuft mit der Quelle „Custom (OpenAI-compatible)“ und dem Modell des Spiels:

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
git checkout chatgpt/narrator-gm-tools-2026-10-02
node tools/p0/s4_gm_tools.mjs --dry-run
node tools/p0/s1_interpreter.mjs --sample 80 --out p0_out/s1_now
node tools/p0/s4_gm_tools.mjs --sample 80 --compare p0_out/s1_now/results.json
```

- `--sample 80` ist dieselbe geschichtete Stichprobe in beiden Werkzeugen.
- Für den vollen Korpus lässt man `--sample` weg (S4: ≥ 256 × ≈ 7,8k Prompt-Token ≈ 2M).
- Zurückschicken: `p0_out\s4\summary.md` (und bei Bedarf `results.json`).

**Entscheidungsregel**, vor dem Lauf festgelegt:
- **B hält semantisch mit**, wenn alle drei gelten:
  - Negativ-Präzision nach Guard ≥ As Wert − 1 pp;
  - Recall ≥ As Wert − 2 pp;
  - Tool-Aufrufe in Negativfällen ≤ 5 %.
- **B ist besser**, wenn zusätzlich das Recall um ≥ 3 pp steigt oder die Fälle „nur B richtig“ die Fälle „nur A richtig“ deutlich überwiegen, bei mindestens 10 Fällen Abstand.

### 11.2 S4b: Kampf- und Kreativ-Korpus (als Nächstes zu bauen)

Die §11-Sätze und Varianten aus den Läufen, je etwa 10 Fälle für Alias, Ziel-Referenz, kreativen Skill, Suche, Reise und Mehrdeutig, in zwei bis drei Kampf- und Ruhe-Szenen. Gold ist die Tool-Entscheidung, in drei Formen:
- Kampf {skill, target} oder Nachfrage;
- Welt-Skill {skill};
- Story-Befehl.

Gemessen werden drei Pfade:
- A deterministisch (heutiger Stand §4.2);
- B (Erzähler + Tools);
- ein C-Planer-Prompt.

S4b ist der einzige Korpus, der F1 und F2 abdeckt.

### 11.3 Live-Paarlauf A gegen B (Handoff §11/§12)

- **Gleich für beide:** Szenen, Klasse (Mage), Modell und Einstellungen. B mit „Enable function calling“, A ohne.
- **Szenarien:** die Sätze aus §11 als natürliche Spielzüge, mit klaren und echt mehrdeutigen Szenen.
- **Dazu:**
  - fünf Züge reines Gespräch mit NPC-Initiative;
  - fünf Angriffe auf die Autorität: freies MP, erfundene XP, Gegenstand aus dem Nichts, Gildenlohn ohne Abgabe, Rangaufstieg.
- **Messblatt je Zug:**
  - Modellaufrufe und Tool-Aufrufe;
  - Prompt- und Completion-Token;
  - Latenz bis zur ersten sichtbaren Prosa und bis zum Zugende;
  - Extraktor ja/nein;
  - Korrekturen und Abweisungen;
  - semantische Fehldeutung;
  - Persistenzfehler.
- **Persistenzfehler in B:** In B läuft der Extraktor als stilles Audit nach jeder Antwort. Er bucht nichts, er zählt nur, was er fände und `commit_world` nicht hatte. Das ist die Messung für Handoff §8.
- **Die Ereignisexporte beider Läufe** nebeneinander mit `tools/v4_diff.mjs`.

### 11.4 Entscheidungsbaum

1. **S4 schlecht für B:** Die Semantik-Annahme trägt bei diesem Modell nicht.
   - B als Vergleichsartefakt behalten.
   - As Frontend reparieren, als eigene, kleine Schritte mit Tests aus §4:
     1. kein stiller Basisangriff, stattdessen Interpreter/Planer oder Nachfrage;
     2. Welt-Skill als Form;
     3. `go` und Suche im Vokabular trennen;
     4. Extraktor-Katalog um bekannte Abwesende und frisch Tote.
2. **S4 gut für B:**
   - C als Geschwister-Branch von `90bd450` bauen.
   - Danach Paarlauf A / B / C mit S4b und §11.3.
   - Die geringere Gesamtkomplexität entscheidet: Aufrufe, Host, Recovery und Code.
3. **Erst nach einem bestandenen Paarlauf:** Interpreter oder Extraktor zurückbauen (Handoff §10).

---

## 12. Antworten auf Handoff §15

1. **Versteht der Erzähler natürliche Spielerabsicht besser als der Pre-Parser?**
   - Gegen den **Regex-Teil** ja, ohne Messung zu sehen: Der Regex deutet 6 der 11 §11-Sätze falsch oder verliert sie (§4.2). Das kann aber jedes Modell vor der Engine besser, nicht nur ein Erzähler mit Tools.
   - Gegen den **Interpreter** unbekannt. S4 misst es. Die einzige Vorarbeit mit diesem Modell (S2) ist für den Erzähler als Zustandsschreiber ungünstig.
2. **Bleibt der deterministische Zustand vertrauenswürdig?**
   - **Zahlen:** ja. Engine, Ownership und Firewall sind unverändert. Schema und Guard sind in B nachgerüstet (D5, D6).
   - **Welt-Zustand:** nein, solange `commit_world` auf Zuruf ohne Audit läuft und 12 Delta-Typen fehlen (D8).
3. **Gehen kreative Handlungen ohne neue Parser-Sonderfälle?**
   - Ja, mit einer Fähigkeit statt eines Befehls je Verb: Bs `use_ability_on_world`.
   - Das braucht kein Function Calling; derselbe Handler passt in A oder C.
   - Offen ist die Kampfregel (Handoff P1.3).
4. **Sind Swipe und Regenerate sicher?**
   - **Zustand:** ja, nach D1–D3, in drei Modi geprüft (§5.2).
   - **Struktur:** nein. Ein Swipe mit Tool-Aufruf bleibt in SillyTavern nicht ein Swipe (D7), Tool-Nachrichten alter Zweige bleiben sichtbar.
5. **Lässt sich Interpreter- und Extraktor-Komplexität wirklich senken?**
   - Der Interpreter-**Aufruf** ja (B oder C-Planer statt Parser + Interpreter).
   - Die **Prüf-Logik** (Schema, Guard, Firewall) nicht; B brauchte sie wieder.
   - Den Extraktor nicht vor einer Audit-Messung (§11.3).
6. **Ist das System leichter zu durchschauen als Gen 3.5?**
   - Der Datenfluss eines Zugs: ja, ein Modell entscheidet.
   - Der Betrieb: nein. Die Fehler wandern in Host-Ereignisreihenfolge, Rekursion und Swipe-Struktur. D1–D3 waren unsichtbar für alle Unit-Tests.
7. **Ist das GM-Tool-Design besser als ein gut gebauter Planungs-/Hybrid-Ansatz?**
   - Nach Code und Recherche nicht erkennbar. C erreicht dieselben semantischen Ziele mit:
     - fester, kleiner Aufrufzahl;
     - ohne Plattformbedingung;
     - Persistenz durch einen Leser.
   - Die einzige Stelle, an der B gewinnen könnte, ist: Der Erzähler-Kontext macht die Semantik messbar besser. Das zeigt S4 und dann der Paarlauf.
8. **Welche Architektur hat die geringste Gesamtkomplexität?** [Schluss]
   - Wenn man Aufrufe, Prompts, Fehler-Recovery und Host zählt: heute C, gefolgt von A.
   - A ist erprobt, hat aber das fehlerhafte Frontend.
   - B ist am komplexesten im Betrieb. Dazu kommen Function Calling, Rekursion und Stale-Filter, und A bleibt vollständig als Rückfall.
   - Das bleibt eine Folgerung, bis S4 und der Paarlauf vorliegen.

---

## 13. Änderungen an B in diesem Review

Erlaubt nach Handoff §3: kleine Korrekturen, damit B fair testbar ist. Keine Umgestaltung. Build `4.3.0-alpha.2`.

| Datei | Änderung | Grund |
|---|---|---|
| `index.js` | Commit bei `GENERATION_ENDED` statt `MESSAGE_RECEIVED`; die Sitzung überlebt das Löschen der leeren Zwischenantwort; Stale-Filter über die Aufruflisten | D1–D3 |
| `src/gm/runtime.js` | `arrive` in `commit_world`; Schema des Produkt-Interpreters und Agency-Guard in `resolve_story` | D4–D6 |
| `src/gm/tools.js` | Beschreibungen: `arrive`, `quote`-Pflicht, Fehlercodes | D4–D6 |
| `tests/v4/gm_tools.test.js` | vier Tests; sie scheitern ohne die Korrekturen | D4–D6, Laden der Tools |
| `tools/st_live/run_gm.mjs` | Host-Smoke mit 13 Prüfungen, drei Modi | P0.3, P0.4 |
| `tools/p0/s4_gm_tools.mjs`, `tools/p0/lib/provider.mjs`, `tests/p0/p0_s4.test.js` | S4 und Tool-Durchreichen im Provider | §11.1 |
| `docs/ARCHITECTURE_GM_TOOLS.md`, `docs/P0_SPIKES.md` | Commit-Zeitpunkt, Stale-Filter, Grenzen 11–13, Tests; S4 in der Dateiliste | Doku = Code |

`npm test`: 563/563 (vorher 555/555 auf diesem Branch). Der Gen-3.5-Branch und alle anderen Branches sind unberührt.

---

## 14. Offene Risiken

- **S4 misst nur die erste Entscheidung**, nicht die Prosa danach und nicht die Persistenz. Die Kampf- und Kreativ-Fälle fehlen bis S4b.
- **S4 nutzt den Szenen-Katalog des Korpus, nicht den vollen Engine-Block und keine Chat-Historie.** Die Prompt-Größe entspricht dem Lauf (≈ 7,8k gegen 7,9k), der Inhalt nicht ganz.
- **Die Zahlen zu Token und Latenz von B und C in §8 sind Schätzungen** aus dem 4.2.1-Log. Prompt-Caching beim Provider kann Bs Folgerunden deutlich verbilligen; das ist unbekannt.
- **Der Agency-Guard ist am S1-Korpus entworfen** (P0 §10). Seine Wirkung in S4 ist so optimistisch wie dort.
- **D7 (Swipe-Struktur) kann sich mit einer neuen SillyTavern-Version ändern.** Der Smoke prüft das bei jedem Lauf.

---

## 15. Nachtrag 02.10.2026: Auswertung S1 / S4 mit dem echten Modell

Läufe des Spielers über SillyTavern:
- Modell: GLM-5.3-Flash.
- Stichprobe: dieselbe geschichtete mit 80 Fällen (33 negativ, 61 Gold-Befehle).
- S1: Interpreter, t 0,1.
- S4 v1: Erzähler mit GM-Tools, t 0,9, bis 3 Runden.

Die Zahlen in §11.1 sind damit gemessen. Die Entscheidungsregel von §11.1 wird hier **nicht** mechanisch angewandt. Grund: Die fallweise Prüfung zeigt, dass S4 die Kernfrage nicht sauber misst.

### 15.1 Gemessen

| | A: S1 | B: S4 |
|---|---|---|
| Negativ-Präzision nach Guard (roh) | 100 % (93,9 %) | 90,9 % (84,8 %) |
| Recall Typ + Argumente | 93,4 % | 29,5 % |
| Fälle exakt | 95 % | 53,8 % |
| abgewiesene `resolve_story`-Aufrufe | – | 61 in 30 Fällen; in 13 Fällen alle drei Runden |
| Latenz p50 bis zur Entscheidung (nur erste Runde) | 3,0 s | 11,9 s (10,4 s) |
| Prompt-Token je Fall (erste Anfrage) | 2.802 | 10.975 (6.690) |

### 15.2 Was S1 misst, was S4 misst

**S1** misst den dedizierten Interpreter: Rolle, 13 Agency-Regeln, 9 Kontrastbeispiele, Befehlsliste mit Typnamen und Argumentnamen, Format, eine Reparatur, Guard. Nicht gemessen ist As Regex-Frontend (Kampf, Schleichen; §4.2) und die Prosa.

**S4 v1** misst vier Dinge zugleich:
1. das Verständnis der Spielerabsicht;
2. ob der Erzähler sich für ein Tool entscheidet oder selbst erzählt;
3. ob er die internen Befehls- und Feldnamen errät;
4. die Wirkung der Unterschiede im Prompt: t 0,9 gegen 0,1, keine Regeln, keine Beispiele.

Die Ursache für (3) steht im Code:
- `src/gm/tools.js` beschreibt `commands` als Array beliebiger Objekte (`additionalProperties: true`). Die Domänen nennt die Beschreibung nur als Prosa („Guild registration/promotion, quest accept/turn-in/abandon …“), **keinen einzigen Typnamen und kein Argument**.
- `resolveStory` (`src/gm/runtime.js`) antwortet bei einem unbekannten Typ mit `expected_args: {<falscher Typ>: {}}`. Die Liste der gültigen Typen erfährt das Modell nie.
- **Werkzeugfehler (von mir):** S4 v1 schickte bei einer Abweisung nicht einmal `expected_args` mit, anders als die Laufzeit. Behoben in S4 v2. Die vorliegenden Zahlen stammen aus v1.

### 15.3 Die 61 Abweisungen

| Fehlerart (Fehlerzeilen) | Anzahl | Beispiele |
|---|---|---|
| unbekannter Befehlsname | 46 | `guild_register`, `register`, `guild_registration`; `quest_accept`, `accept_quest`, `quest.take`; `quest_turn_in`, `turn_in`; `accept_offer`, `accept`; `guild_promotion`, `guild_rank_up`; `quest_abandon`; `search`, `journey.search`; `rest`, `sleep`, `wait`, `camp`; `consume`; `travel`; `trade` |
| falscher Feldname | 53 | `where` / `destination` / `at` statt `to`; `target` / `what` / `item` statt `object`; `who` / `npc` statt `to`; `amount` statt `amount_cp`; `offer` an `pay` |
| Typfeld fehlt | 5 | `{"action":"take",…}`, `{"command":"quest_abandon",…}` |

In **jedem** abgewiesenen Fall ist die gemeinte Handlung aus dem geratenen Namen eindeutig: `guild_register` heißt `guild.register`, `quest_turnin` heißt `quest.turn_in`. Das sind Schnittstellenfehler, keine Fehldeutungen.

Ein weiterer Schnittstellenfehler (real_v2_07): Das Modell hat im `quote` den Tippfehler „coint“ zu „coin“ korrigiert. Der Guard fand die Worte darum nicht in der Nachricht und verwarf das richtige `give` (`no_evidence`).

### 15.4 Fallweise Einordnung der 37 Fälle, die B nicht exakt traf

| Klasse | Fälle | Gold-Befehle | Fälle |
|---|---|---|---|
| **Schnittstelle**: Absicht richtig, Name, Feld oder Zitat falsch | 17 | 25 | real_v2_07, v3_03, v3_13, v4_13, v5_05, v6_03, v7_04, v11_08, syn_offer_01/02, syn_buy_02, syn_use_02, syn_promote_01/02, syn_unequip_01, syn_abandon_01/02 |
| **Nicht verfügbar**: `board.read` ist in B absichtlich gesperrt, und die Tool-Beschreibung sagt das | 3 + 1 teilweise | 4 | real_v4_06, v6_05, v7_07, v10_05 |
| **Zuständigkeit**: Absicht laut Prosa richtig verstanden, aber selbst erzählt statt Engine | 9 | 9 | real_v2_05 (Spuren, nur Fakt), v4_04 (Registrierung), v6_08 (warten), syn_decline_01, syn_buy_01 (Preis selbst genannt), syn_sell_01/02, syn_drop_01, syn_unequip_02 |
| **Semantik**: falsch verstanden | 2 | 2 | real_v11_13 („put them on the floor“ wurde `give` an den Reeve: falsche Festlegung); real_v11_14 (Abgabe bei der Gilde ausgelassen) |
| **Tool-Wahl**: Kampf-Tool außerhalb eines Kampfs, auf Negativfällen | 3 | – | real_v2_04 („continue hunting“ → stealth, falsch); real_v10_12 („get ready for combat“ → hold, falsch); real_v2_06 („sneaking … walk silently“ → stealth: vertretbar, nur außerhalb des S1-Golds) |
| beide falsch (auch A) | 2 | 3 | real_v12_19, syn_decline_02 |

Dazu zwei Gegenbefunde:
- Die zwei Agency-Fehler, die der Guard abfängt (neg_accept_01 Frage, neg_turnin_05 NPC-Handlung), machen **A und B roh gleich**.
- B war in zwei Fällen besser als A:
  - real_v3_04: kanonische Orts-ID statt `{new}`;
  - syn_equip_02: A hat die Rüstung übersehen.

### 15.5 Was daraus folgt

- **„B fällt klar hinter A zurück“ stimmt für den Prototyp, aber nicht in der Höhe von 29,5 % gegen 93,4 %.**
  - Werden die 25 Schnittstellen-Befehle als verstanden gezählt, kommt B auf ≈ 70 % Recall.
  - Ohne die 4 gesperrten `board.read` sind es ≈ 75 % (43 von 57); A liegt dort bei 93 % (53 von 57).
  - Die verbleibende Lücke von rund 18 Prozentpunkten bilden fast ganz die **9 Zuständigkeitsfehler**, dazu zwei semantische Fehler und drei falsche Kampf-Tools.
- **Die Zuständigkeitsfehler sind ein echter Architekturbefund für B.** Das Modell versteht die Fiktion, bucht sie aber nicht.
  - Bs eigene Anweisungen verstärken das. Der GM-Hinweis sagt: „For ordinary dialogue and soft fiction no player-action tool is required“. Die Tool-Beschreibung sagt: „Do NOT use this for ordinary dialogue … NPC reactions“. „Too expensive, I'll pass“ oder „I'd like a room“ sehen nach Dialog aus.
  - Folge im Spiel: Ein Verkauf wird erzählt, aber kein Coin gebucht. Das ist stiller Zustandsverlust.
- **Die Kernhypothese ist damit nicht widerlegt.** S4 kann nicht trennen, ob die Fehler aus dem Verständnis, der Schnittstelle oder der Zuständigkeitsentscheidung kommen. Die Prosa der Zuständigkeitsfälle und die geratenen Namen sprechen eher für gutes Verständnis.
- **ChatGPTs Hypothese** (S4 vermischt Semantik mit Schema) trägt. Sie ist am Code und an allen 37 Fällen bestätigt, mit drei Ergänzungen:
  1. `board.read` war gesperrt;
  2. das Werkzeug schickte keine `expected_args` mit;
  3. die Temperatur unterschied sich.

  Und mit einer Einschränkung: Selbst bei perfekter Schnittstelle bliebe B nach diesen Daten etwa 18 Prozentpunkte zurück, wegen der Zuständigkeitsentscheidung. Diese Entscheidung ist der Kern von B, nicht ein Prompt-Detail.

### 15.6 S4a: die Semantikfrage ohne Tool-Schnittstelle (gebaut)

`tools/p0/s4a_gm_semantics.mjs`, Tests `tests/p0/p0_s4a.test.js`.

**Frage:** Erfasst ein allgemeiner GM-/Erzähler-Kontext die Spielerhandlung so zuverlässig wie der spezialisierte Interpreter, wenn beide dieselbe explizite Ausgabeschnittstelle haben?

**Gleich wie S1:**
- Stichprobe (`sampleCases`) und Gold;
- User-Nachricht (Katalog + Spielernachricht, `interpreterUser`);
- die Ausgabeschnittstelle, wortgleich aus dem Interpreter-Prompt geschnitten: Befehlsliste mit Typ- und Argumentnamen, Antwortzeile, `PLAIN_FORMAT`;
- lokale Schemaprüfung mit einer Reparatur;
- Agency-Guard und S1-Scorer;
- t 0,1, max 2.500 Token, Reasoning wie konfiguriert.

**Anders als S1:** nur der Systemkontext. Er besteht aus dem Erzählervertrag v4 und einem neutralen GM-Planungsschritt: „decide which actions Alaric himself takes … that the engine must resolve … an empty plan is a valid answer“.

**Nicht enthalten:** Function Calling, Prosa, `commit_world`, Engine.

**Zwei Arme:**
- `gm` (Hauptfrage): ohne die Agency-Regeln und Beispiele des Interpreters.
- `gm_rules` (Kontrollarm): mit ihnen. Er zeigt, ob schon der Erzählerkontext Genauigkeit kostet, wenn die Spezialisierung dabei ist.

**Kein Duplikat:** S1 kennt keinen Erzählerkontext, S4 hat keine explizite Schnittstelle.

**Auswertung vorab festgelegt:**
- **S4a gm etwa auf S1-Niveau** (Recall ≥ A − 3 pp, Negativ-Präzision nach Guard ≥ A − 2 pp, auf derselben Stichprobe): Bs Rückstand kommt aus Schnittstelle und Zuständigkeit, nicht aus dem Verständnis. Ein Planer mit Erzählerkontext (C) wäre semantisch tragfähig.
- **S4a gm deutlich darunter, gm_rules auf S1-Niveau:** Die Spezialisierung (Regeln, Beispiele) trägt die Genauigkeit, nicht der Kontext.
- **Beide deutlich darunter:** Der Erzählerkontext selbst schadet. Ein schlanker, spezialisierter Planer vor der Engine bleibt nötig.
- **Bei 80 Fällen und 61 Gold-Befehlen** ist ein Prozentpunkt weniger als ein Befehl. Unterschiede unter etwa 3 Befehlen sind Rauschen; fallweise vergleichen (`--compare`).

**Befehle (seriell):**

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
git pull
node tools/p0/s4a_gm_semantics.mjs --dry-run
node tools/p0/s4a_gm_semantics.mjs --arm gm --sample 80 --concurrency 1 --compare p0_out/s1_now/results.json
node tools/p0/s4a_gm_semantics.mjs --arm gm_rules --sample 80 --concurrency 1 --compare p0_out/s1_now/results.json
```

- `p0_out/s1_now/results.json` ist der S1-Lauf, den du schon hast. Liegt er unter einem anderen Pfad, gib diesen an.
- Zurückschicken: `p0_out\s4a_gm\summary.md` und `p0_out\s4a_gm_rules\summary.md`, bei Bedarf auch die `results.json`.
