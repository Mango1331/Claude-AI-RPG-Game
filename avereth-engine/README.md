# Avereth Engine (v3.0.0)

Deterministische Spiel-Engine für die Avereth-Kampagne als **SillyTavern-Extension**. Sie besitzt Regeln, Würfel, Kampagnenzustand und Figurenwissen. Das Sprachmodell erzählt.

- Keine Abhängigkeiten, kein Server, keine Datenbank.
- Läuft im Browser (SillyTavern) und in Node (Tests).

**Warum diese Architektur:** [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). **Befunde aus Testrun-v1:** [docs/TESTRUN_V1.md](docs/TESTRUN_V1.md). **Gesamtbericht:** [ABSCHLUSSBERICHT.md](ABSCHLUSSBERICHT.md). **Externe Review und Antwort:** [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md). **Erster echter Lauf:** [docs/TESTRUN_V2.md](docs/TESTRUN_V2.md). **Zweiter Lauf:** [docs/TESTRUN_V3.md](docs/TESTRUN_V3.md). **Dritter Lauf:** [docs/TESTRUN_V4.md](docs/TESTRUN_V4.md). **Welt-Lore als Lorebook:** [docs/LOREBOOK.md](docs/LOREBOOK.md). **Deep Review Kampf + Runtime V3 (Vorschlag):** [docs/REVIEW_V3.md](docs/REVIEW_V3.md). **Runtime V3 (umgesetzt: einfacher Kampf, NPC-Record, HUD, Prompt-Projektion, Megumin-Checkliste):** [docs/RUNTIME_V3.md](docs/RUNTIME_V3.md). **Plan für Test 5:** [docs/TEST5_PLAN.md](docs/TEST5_PLAN.md). **Pre-Test-5-Diagnoselauf:** [docs/PRETEST5_DIAGNOSE.md](docs/PRETEST5_DIAGNOSE.md). **Test 5, Lauf 1:** [docs/TESTRUN_V5.md](docs/TESTRUN_V5.md). **Test 5, Lauf 2 (Report-Nachforderung):** [docs/TESTRUN_V5_2.md](docs/TESTRUN_V5_2.md). **Ohne Megumin? Analyse und Entwurf eines eigenen Erzähl-Layers:** [docs/MEGUMIN_ANALYSE.md](docs/MEGUMIN_ANALYSE.md). **Erzähl-Layer „Avereth Narrator“ (Preset) und A/B/C-Vergleich mit Megumin:** [docs/NARRATOR_AB.md](docs/NARRATOR_AB.md). **Erster Live-Lauf mit dem Avereth Narrator:** [docs/TESTRUN_V6.md](docs/TESTRUN_V6.md). **Live-Lauf 25.09. (Ratten ohne Zustand, Kampf-Labels, Zielfrage durch die Engine):** [docs/TESTRUN_V7.md](docs/TESTRUN_V7.md).

## Was die Engine pro Zug tut

1. **Vor der Generierung** (Prompt-Interceptor) liest sie deine Nachricht:
   - Angriff, Skill, Bewegung, Flucht, Schleichen, Charaktererstellung oder `#`-Befehl;
   - Fragen und wörtliche Rede („Drop it or I shoot!“) sind keine Angriffe.
2. **Sie löst Mechanik selbst:**
   - Initiative (⌊1,5 × AGI⌋), Schaden (Core #11), Munition, Kosten und NPC-Züge; jeder legale Angriff trifft, einen Crit (×1,5) gibt es nur in der Opening Action eines echten Hinterhalts;
   - Level-ups und DefeatXP;
   - Schleichen gegen Wahrnehmung;
   - die Charaktererstellung: Sie beantwortet die Engine als System-Panel, ohne LLM-Aufruf.
3. **Sie injiziert einen kompakten Engine-Block** (in den Testruns 1.100–1.500 Token):
   - Zustand;
   - NPC-Karten mit Rolle, Aussehen, Stimme, Haltung, letztem bedeutsamem Moment, Agenda und **nur deren Wissen**;
   - relevante Erinnerungen und Fakten;
   - Lore (nur ohne verknüpftes Lorebook);
   - zuletzt „RESOLVED THIS TURN“ mit allen Würfen.

   Dazu kommt die **Lore-Bridge**: Realm und Stadt als reiner Scan-Text für World Info (0 Token im Prompt), damit das Lorebook der Karte die passenden Einträge aktiviert. Vom Chatverlauf stehen im Prompt nur deine aktuelle Nachricht und die 3 Wechsel davor, ohne alte Tracker-Blöcke; der gespeicherte Chat bleibt unverändert.
4. **Das Modell erzählt** und schreibt direkt nach der Erzählung einen Fakten-Report mit den Neuerungen dieser Antwort: `<avereth>{…}</avereth>`. Tracker, Charakterbögen, World-State und NPC-Dossiers schreibt es nicht mehr; das übernimmt die Engine.
5. **Nach der Antwort** prüft die Engine den Report:
   - neue Figuren, Orte, Fakten, Wissen, Erinnerungen, Beziehungen, Quests, Items und Coin werden übernommen;
   - Ungültiges wird mit Grund abgelehnt;
   - freiwillige Änderungen an Alaric (reisen, bezahlen, abgeben, Quest annehmen) nur, wenn deine Nachricht sie gewählt hat; Diebstahl oder Festnahme muss einen anwesenden NPC nennen; eine Quest, die du beim Namen nimmst („I take the Vermin in the Malthouse Cellar quest“), darf auch ein späterer Report aktiv setzen, eine andere nicht;
   - der Report wird aus der Anzeige entfernt;
   - Zahlen in der Antwort, die der Engine widersprechen (z. B. „Init 8“), werden im nächsten Zug korrigiert;
   - fehlt der Report, bittet der nächste Engine-Block darum, und der nächste Report darf die Entscheidungen des Zuges ohne Report nachtragen;
   - meldet der Report einen Angriff auf Alaric, legt die Engine den Kampf sofort fest (Initiative, Reihenfolge) und zeigt ihn über dieser Antwort; die Runde läuft mit deiner nächsten Nachricht;
   - schreibt das Modell trotzdem `<World_State>`, `<Character_Sheet>`, `<New_NPC>` oder `<NPC_Update>`, werden die Blöcke entfernt und nie zu Zustand.
6. **Unter der Antwort zeigt das HUD** zwei einklappbare Panels, Charakter und Welt. Beide werden aus dem Engine-Zustand gerendert, gehen nie in den Prompt und zeigen nichts, was Alaric nicht wissen kann.

Der Zustand wird **pro Nachricht** gespeichert (`message.extra.avereth`):
- **Swipe:** Jede Alternative hat eigene Fakten.
- **Regenerieren:** gleiche Würfel; es wird nie neu gewürfelt.
- **Löschen:** nimmt die Fakten der gelöschten Nachrichten mit.
- **Bearbeiten:** Eine editierte Antwort behält ihre Fakten. **Retcon:** einen neuen `<avereth>{…}</avereth>`-Block in die **neueste** Antwort schreiben; sie wird neu geprüft (`{}` verwirft ihre Fakten). Bei älteren Antworten erst die späteren Nachrichten löschen.

## Installation

1. Den Ordner `avereth-engine/` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren, oder über „Install extension“ aus einem Git-Repository installieren.
2. SillyTavern neu laden. Unter Extensions erscheint **Avereth Engine**.
3. **Charakterkarte:**
   - Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v3.txt` (Stand 3.3; nach jedem Update neu einfügen);
   - Begrüßung = First Message v0.4 (unverändert; die Zeile `Location: … outside <City>, <Realm>` legt den Startort fest).
4. **Die Avereth-WorldInfo v1.23 deaktivieren.** Die Engine ersetzt sie; beides zusammen doppelt Regeln.
   - **Megumin-Preset:** NPC-Dossier, NPC-Updates, NPC-Bank und die `<Blocks>`-Anweisung entfernen. Die genaue Checkliste mit allem, was bleibt, steht in [docs/RUNTIME_V3.md §9](docs/RUNTIME_V3.md#9-megumin-v10-shura-manuelle-änderungen).
   - Bis dahin entfernt die Engine die Blöcke aus Antworten und Prompt. Das Modell schreibt sie aber weiter und braucht dafür Zeit.
5. **Welt-Lore-Lorebook** (empfohlen, [docs/LOREBOOK.md](docs/LOREBOOK.md)):
   - World Info → Import → `lorebook/Avereth_World_Lore_v0.11.json`;
   - an der Erzähler-Karte (Globus-Symbol) als **Character Lore** verknüpfen, nicht global aktivieren;
   - World-Info-Einstellungen: Scan Depth 2, Budget Cap 1.800, Recursive Scan aus, Match whole words an;
   - die Engine lässt dann ihre eigene LORE-Sektion weg (Einstellung „World lore“ = Auto).
6. **Antwortlänge:** Ohne Megumin-Blöcke reichen meist 4.096 Token, mit Reasoning „high“ 6.000. Solange das Preset noch Blöcke anfordert, mindestens 8.192. In Testrun 3 schnitt GLM mit 4.096 Token zwei Antworten mitten in den NPC-Dossiers ab.
7. **Streaming** (empfohlen): in den API-Einstellungen anschalten.
   - Unter Extensions → Regex die Skripte aus `regex/` importieren:
     - `avereth_hide_fact_report.json` versteckt den Report schon während des Streamings;
     - `avereth_hide_tracker_blocks.json` braucht es nur, solange Megumin noch Blöcke anfordert.
   - Beide ändern nur die Anzeige, weder den gespeicherten Text noch den Prompt. Details: [docs/RUNTIME_V3.md §5](docs/RUNTIME_V3.md#5-streaming).
8. **Neuen Chat starten.** Die Kampagne entsteht an der Begrüßung. Ein Chat, der ohne Engine begonnen wurde, bleibt unberührt. **Zuerst einen wegwerfbaren Testchat spielen** (Report-Format, Streaming und Swipes mit deinem Modell prüfen), erst dann die Langzeitkampagne.

**Einstellungen** (Extensions → Avereth Engine):

| Einstellung | Standard | Wirkung |
|---|---|---|
| Engine active | an | Schaltet die Engine an oder aus |
| Context budget | 1.400 Token | für Szene, NPCs, Retrieval und Lore; RESOLVED und Header werden nie gekürzt |
| Rules allowance | 800 Token | situative Regeltexte (Schleichen, Loot, Handel, `#system`) |
| Recent turns not re-retrieved | 4 | was noch im Chatverlauf steht, wird nicht doppelt injiziert (höchstens das History window) |
| History window (exchanges) | 4 | so viele Spielernachrichten stehen mit ihren Antworten wörtlich im Prompt, die aktuelle mitgezählt (4 = aktuelle Nachricht plus 3 Wechsel); ältere erreichen den Erzähler über den Engine-Block. 0 = ganzer Verlauf. Der gespeicherte Chat bleibt unverändert. |
| Remove tracker blocks from new replies | an | entfernt `World_State`, `Character_Sheet`, `New_NPC` und `NPC_Update` aus neuen Antworten; alte Antworten verlieren sie nur in der Prompt-Kopie |
| Ask for a missing fact report separately | an | Hat eine Antwort keinen gültigen Fakten-Report, fragt die Engine dasselbe Modell in einer kurzen, eigenen Anfrage nur nach dem Report (≈ 1,5k Token Prompt), während du liest. Die Antwort zählt wie der Report des Erzählers. Die nächste Nachricht wartet darauf, höchstens 60 s. |
| HUD under replies | Folded | Charakter- und Welt-Panel unter jeder Antwort: eingeklappt mit Zusammenfassung, offen oder aus |
| Injection depth | 0 | 0 = direkt vor der Generierung |
| World lore | Auto | Auto: Lorebook der Karte, falls verknüpft, sonst die Lore der Engine. „Card lorebook“ oder „Engine“ erzwingen eine Quelle. Die Statuszeile zeigt die aktive. |
| Word replacements | `ledger=register` | Wörter, die der Erzähler überstrapaziert, werden in seinen Antworten ersetzt: ganze Wörter, Plural und Großschreibung bleiben; Paare mit Komma trennen (`ledger=register, tapestry=weave`). Das Wort steht so auch nicht mehr im nächsten Prompt. Eine Bann-Liste im Preset nennt das Wort und macht es eher wahrscheinlicher. |
| Show last engine block | aus | zeigt den zuletzt injizierten Engine-Block (Debugging) |

Außerdem gibt es einen Button **Export event log**, der das komplette Event-Log als JSON herunterlädt.

## Spielen

- **Charaktererstellung:** Klasse eintippen (`Warrior`), dann zwei Skills (`Heavy Slash + Guard`).
  - Die Engine antwortet sofort mit einem System-Panel: dem echten Skill-Pool mit Werten, dem Grund, falls eine Wahl nicht gilt, und zum Schluss dem fertigen Bogen mit Starter-Gear.
  - Der Erzähler kommt erst mit der ersten Story-Nachricht dazu.
- Handlungen normal schreiben: `*I aim the bow and Power Shot at him*`, `I sneak along the hedge`, `"My name is Alaric."`.
- Kampf beginnt nur bei einem erklärten Angriff (Core #23). Zielen, Spurenlesen oder „Bogen bereit“ starten keinen Kampf.
- **Ziele im Kampf:** Jeder Gegner hat für diesen Kampf ein festes Label, und die Zeile `COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT]` listet sie.
  - Ein bekannter Name ist das Label (`Brede`). Unbenannte Gegner heißen nach ihrem Aussehen mit Buchstaben. Einen Namen, den die Geschichte noch nicht gesagt hat, zeigt die Liste nicht.
  - Mit dem Label triffst du genau diesen Gegner: `*I use Quick Slash on Cellar Rat B*`. Stirbt A, bleibt B B; ein Nachzügler bekommt den nächsten Buchstaben.
  - Mehrere Gegner sind mehrere Kämpfer. Meldet der Erzähler sie nur als Gruppe („rat pack“, „rats“), fordert die Engine sie einzeln nach (`ATTACKERS NOT IDENTIFIED YET`); ein Rudel wird nie still eine einzelne Ratte.
  - **Ein** gültiges Ziel wird automatisch gewählt. Bei mehreren antwortet im Kampf das System selbst mit der Zielliste, ohne Erzähler, Kosten oder Würfe. Umstehende sind keine Kandidaten; angreifen kannst du sie nur beim Namen.
  - Unterscheidest du Ziele („the second one“, „the other one“) und passt keines, wählt die Engine nicht für dich. „the nearest one“ nimmt den nächsten Gegner nach Entfernung; stehen zwei gleich nah, fragt das System.
- Warten im Kampf: `I wait` / `I hold my position`.
- Bewegung plus Angriff (Core #12/#24: ein Band plus eine Hauptaktion): `I step back and shoot`, `I kite backwards and Power Shot`. Alaric schießt und tritt danach ein Band zurück. Im Nahkampf geht es näher heran: `I creep up and Power Strike the rat` (von SHORT ein Band vor, dann der Schlag). Von MEDIUM reicht ein Band nicht; das kann nur Charge mit seinem Extra-Band.
- **Im Kampf redet niemand** (Kampfstille). Nur wer aufgibt oder verhandelt, darf einen kurzen Satz sagen. Hält sich die Erzählung nicht daran, korrigiert der nächste Engine-Block.
- **Kampf und Proben stehen als System-Zeilen oben in der Antwort**, direkt aus den Engine-Würfen:
  - Initiative und Zugreihenfolge, die Zielliste `COMBAT TARGETS` bei Kampfstart und wenn jemand dazukommt oder ausfällt;
  - jede Aktion mit Schaden; jeder legale Angriff trifft, im echten Hinterhalt steht `AMBUSH CRIT ×1.5`, Minderungen in Klammern (`cover -25%`, `Deflect -25%`);
  - `HP vorher - Schaden = HP nachher`;
  - HP aller Beteiligten, ihre Entfernung zu Alaric (`Range:`), Alarics MP/STA/Pfeile;
  - vor Alarics Zug seine Angriffe mit dem Schadensbereich gegen das nächste Ziel: `Alaric's attacks vs Cellar Vermin: Basic Attack 16–19 · Aimed Shot 24–29 · Power Shot 30–37 damage`;
  - Kampfende mit XP;
  - greift jemand Alaric an, steht die Reihenfolge schon über dieser Antwort (`COMBAT START`, Initiative, HP, Entfernung, wer vor Alaric handelt), bevor du deine Aktion schreibst;
  - Handel und Beute als eigene Zeilen: `COIN -2 Copper → 4 Silver 8 Copper`, `ITEM +3 Standard Arrow → 23 carried`, `QUEST ACCEPTED — …`, Quest-XP und Level-up, Erholung.

  Der Block ist nur Anzeige: GLM bekommt die Zahlen im Engine-Block und sieht den Block nicht im Chatverlauf.
- **HUD unter jeder Antwort** (Charakter und Welt, per Klick aufklappen):

  | Panel | Inhalt |
  |---|---|
  | Charakter | Level, Power Rank, Gildenrang, HP/MP/STA/XP, Stats, Kampfwerte, Skills, Ausrüstung, Inventar, Coin, Quests, Effekte |
  | Welt | Zeit, Ort, Wetter, Anwesende mit Entfernung, Kampf und Zugreihenfolge, aktive Quests, Fristen, offene Fäden, bekannte Fakten zum Ort |

  Das HUD zeigt immer den Engine-Stand, auch wenn die Erzählung sich verzählt. Haltungen, Agenden und Geheimnisse von NPCs zeigt es nie. Screenshot: [docs/img/hud_live_sillytavern.png](docs/img/hud_live_sillytavern.png).
- **Fehlender Fakten-Report:** Hat der Erzähler keinen gültigen Report geschrieben, fragt die Engine im Hintergrund nach. Über der Antwort steht dann:
  - erst `NO FACT REPORT: asking for it separately …`;
  - danach `REPORT RECOVERED … (s)`: Das HUD folgt der Geschichte;
  - oder `NO FACT REPORT, and the separate request brought none …` (bzw. `… came too late`, wenn die nächste Nachricht ihre Minute schon gewartet hat): Was diese Antwort erzählt (Ort, Personen, Quest), kennt die Engine dann nicht. Neu generieren (Swipe) oder weiterspielen; der nächste Report kann es nachholen.

**Befehle** (antwortet die Engine direkt, ohne LLM-Aufruf und ohne Spielzeit):

| Befehl | Zeigt |
|---|---|
| `#status` / `#stats` | kompletter Status mit abgeleiteten Werten |
| `#skills`, `#skill <Name>` | Skills; Details mit aktuellem Raw Power und Rechenweg |
| `#class`, `#domain` | Klasse, Wachstum, nächster Meilenstein |
| `#equipment`, `#bag` / `#inventory`, `#item <Name>` | Ausrüstung, Inventar, Items |
| `#quests`, `#quest <Name>` | Quests |
| `#effects`, `#effect <Name>` | aktive Effekte |
| `#combat` | kompletter Kampf-Snapshot (Audit) |
| `#npc <Name>` | was **Alaric** über jemanden weiß |
| `#log [n]` | Alarics Erinnerungen |
| `#audit` | Würfe, Rechenwege, abgelehnte Report-Teile des letzten Zuges |
| `#assign <STAT> <n>` | freie Stat-Punkte vergeben (einziger zustandsändernder Befehl) |
| `#system <Frage>` | geht ans LLM im System-Modus, mit den passenden Regelabsätzen |
| `#help` | Liste |

## Für Entwickler

```
npm test                               # 219 Tests: Unit, Szenarien, SillyTavern-Verhalten, Review-Fälle, Lorebook, Runtime V3, Pre-Test-5, Regression der Testruns 1–4 und beider Test-5-Läufe, Narrator-Vergleich
node tools/testrun_compare.js          # Token-Vergleich mit Testrun-v1
node tools/browser_smoke.mjs           # optional: index.js in echtem Chromium mit gemocktem SillyTavern-Kontext (braucht Playwright)
AVERETH_ST_DIR=/pfad/zu/SillyTavern npm run smoke:st   # optional: Live-Smoke in echtem SillyTavern mit streamendem Mock-Erzähler (docs/RUNTIME_V3.md §8); mit AVERETH_ST_PRESET="Avereth Narrator" für das eigene Preset (docs/NARRATOR_AB.md §2.4)
node tools/run_report.mjs <Server-Log> [<Chat.jsonl>]   # Messung eines Laufs: Prompt je Kategorie, Output-Aufteilung, Dauer (docs/TEST5_PLAN.md §4)
node tools/narrator_ab.mjs --log <Server-Log> --chat <Chat.jsonl> [--log … --chat …] --dry-run   # Narrator-Vergleich A/B/C; ohne --dry-run mit AVERETH_AB_API_BASE/_KEY (docs/NARRATOR_AB.md §3)
node tools/lorebook_audit.mjs          # welche Lorebook-Einträge in den Testruns 2–4 feuern (World-Info-Nachbau, gegen Testrun 4 bestätigt)
python3 tools/migrate_content.py       # Content aus dem Paket v1.24 neu erzeugen (aus dem Repo-Wurzelverzeichnis)
node tools/v3_combat.mjs               # danach: Combat V3 auf den Content anwenden (idempotent)
```

| Ordner | Inhalt |
|---|---|
| `index.js`, `manifest.json`, `style.css` | SillyTavern-Anbindung |
| `src/` | Engine, siehe [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) |
| `content/` | Inhalte, siehe [docs/DATENMODELL.md](docs/DATENMODELL.md) |
| `lorebook/` | Welt-Lore als SillyTavern-Lorebook (Character Lore), siehe [docs/LOREBOOK.md](docs/LOREBOOK.md) |
| `regex/` | Regex-Skripte für SillyTavern (Report und alte Tracker-Blöcke beim Streaming verstecken) |
| `presets/` | Chat-Completion-Preset „Avereth Narrator“, siehe [docs/NARRATOR_AB.md](docs/NARRATOR_AB.md) |
| `schemas/` | JSON-Schemas für Content, Events und Report |
| `tests/` | `unit/`, `scenarios/`, `testrun_v1/` bis `testrun_v4/` |
| `tools/` | Migration, Combat-V3-Migration, Testrun-Vergleich, Lorebook-Audit, Browser-Smoke, Live-Smoke (`st_live/`), Lauf-Messung (`run_report.mjs`), Narrator-Vergleich (`narrator_ab.mjs`) |
| `docs/` | Architektur, Datenmodell, Migration, WI-Bewertung, Lorebook, Testrun-Analyse, Runtime V3, Test-5-Plan |

**Engine-API** (`src/engine.js`; Adapter für Chat-Arrays in `src/host.js`):

```js
const events = startCampaign(content, { seed, firstMessage });
const turn   = playerTurn(state, content, input, { msg });           // Events der Spielernachricht
const block  = turnContext(turn.state, content, { input, lastReply, corrections });
const reply  = narratorReply(turn.state, content, llmText, { msg });  // Events der Antwort, bereinigter Text, Korrekturen
```
