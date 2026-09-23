# Avereth Engine (v2.0.0)

Deterministische Spiel-Engine für die Avereth-Kampagne als **SillyTavern-Extension**. Sie besitzt Regeln, Würfel, Kampagnenzustand und Figurenwissen. Das Sprachmodell erzählt.

- Keine Abhängigkeiten, kein Server, keine Datenbank.
- Läuft im Browser (SillyTavern) und in Node (Tests).

**Warum diese Architektur:** [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). **Befunde aus Testrun-v1:** [docs/TESTRUN_V1.md](docs/TESTRUN_V1.md). **Gesamtbericht:** [ABSCHLUSSBERICHT.md](ABSCHLUSSBERICHT.md). **Externe Review und Antwort:** [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md). **Erster echter Lauf:** [docs/TESTRUN_V2.md](docs/TESTRUN_V2.md). **Zweiter Lauf:** [docs/TESTRUN_V3.md](docs/TESTRUN_V3.md). **Dritter Lauf:** [docs/TESTRUN_V4.md](docs/TESTRUN_V4.md). **Welt-Lore als Lorebook:** [docs/LOREBOOK.md](docs/LOREBOOK.md). **Deep Review Kampf + Runtime V3 (Vorschlag, noch nicht umgesetzt):** [docs/REVIEW_V3.md](docs/REVIEW_V3.md).

## Was die Engine pro Zug tut

1. **Vor der Generierung** (Prompt-Interceptor) liest sie deine Nachricht:
   - Angriff, Skill, Bewegung, Flucht, Schleichen, Charaktererstellung oder `#`-Befehl;
   - Fragen und wörtliche Rede („Drop it or I shoot!“) sind keine Angriffe.
2. **Sie löst Mechanik selbst:**
   - Initiative, Treffer, Crit, Schaden (Core #11), Munition, Kosten und NPC-Züge;
   - Level-ups und DefeatXP;
   - Schleichen gegen Wahrnehmung;
   - die Charaktererstellung.
3. **Sie injiziert einen kompakten Engine-Block** (in den Testruns 1.100–2.500 Token): Zustand, NPC-Karten mit **nur deren Wissen**, relevante Erinnerungen und Fakten, Lore (nur ohne verknüpftes Lorebook) und zuletzt „RESOLVED THIS TURN“ mit allen Würfen. Dazu kommt die **Lore-Bridge**: Realm und Stadt als reiner Scan-Text für World Info (0 Token im Prompt), damit das Lorebook der Karte die passenden Einträge aktiviert.
4. **Das Modell erzählt** und schreibt direkt nach der Erzählung, vor den Tracker-Blöcken des Presets, einen Fakten-Report: `<avereth>{…}</avereth>`.
5. **Nach der Antwort** prüft die Engine den Report:
   - neue Figuren, Orte, Fakten, Wissen, Erinnerungen, Beziehungen, Quests, Items und Coin werden übernommen;
   - Ungültiges wird mit Grund abgelehnt;
   - freiwillige Änderungen an Alaric (reisen, bezahlen, abgeben, Quest annehmen) nur, wenn deine Nachricht sie gewählt hat; Diebstahl oder Festnahme muss einen anwesenden NPC nennen; eine Quest, die du beim Namen nimmst („I take the Vermin in the Malthouse Cellar quest“), darf auch ein späterer Report aktiv setzen, eine andere nicht;
   - der Report wird aus der Anzeige entfernt;
   - Zahlen in der Antwort, die der Engine widersprechen (z. B. „Init 8“), werden im nächsten Zug korrigiert;
   - fehlt der Report, bittet der nächste Engine-Block darum, und der nächste Report darf die Entscheidungen des Zuges ohne Report nachtragen;
   - meldet der Report einen Angriff auf Alaric, legt die Engine den Kampf sofort fest (Initiative, Reihenfolge) und zeigt ihn über dieser Antwort; die Runde läuft mit deiner nächsten Nachricht.

Der Zustand wird **pro Nachricht** gespeichert (`message.extra.avereth`):
- **Swipe:** Jede Alternative hat eigene Fakten.
- **Regenerieren:** gleiche Würfel; es wird nie neu gewürfelt.
- **Löschen:** nimmt die Fakten der gelöschten Nachrichten mit.
- **Bearbeiten:** Eine editierte Antwort behält ihre Fakten. **Retcon:** einen neuen `<avereth>{…}</avereth>`-Block in die **neueste** Antwort schreiben; sie wird neu geprüft (`{}` verwirft ihre Fakten). Bei älteren Antworten erst die späteren Nachrichten löschen.

## Installation

1. Den Ordner `avereth-engine/` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren, oder über „Install extension“ aus einem Git-Repository installieren.
2. SillyTavern neu laden. Unter Extensions erscheint **Avereth Engine**.
3. **Charakterkarte:**
   - Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v3.txt` (Stand 3.2; nach jedem Update neu einfügen);
   - Begrüßung = First Message v0.4 (unverändert; die Zeile `Location: … outside <City>, <Realm>` legt den Startort fest).
4. **Die Avereth-WorldInfo v1.23 deaktivieren.** Die Engine ersetzt sie; beides zusammen doppelt Regeln. Der Megumin-NPC-Patch ist optional.
5. **Welt-Lore-Lorebook** (empfohlen, [docs/LOREBOOK.md](docs/LOREBOOK.md)):
   - World Info → Import → `lorebook/Avereth_World_Lore_v0.11.json`;
   - an der Erzähler-Karte (Globus-Symbol) als **Character Lore** verknüpfen, nicht global aktivieren;
   - World-Info-Einstellungen: Scan Depth 2, Budget Cap 1.800, Recursive Scan aus, Match whole words an;
   - die Engine lässt dann ihre eigene LORE-Sektion weg (Einstellung „World lore“ = Auto).
6. **Antwortlänge:** „Max Response Length“ mindestens 8.192 Token, oder den Reasoning-Aufwand senken. Mit 4.096 Token und Reasoning „high“ schnitt GLM in Testrun 3 zwei Antworten mitten in den NPC-Dossiers ab.
7. **Neuen Chat starten.** Die Kampagne entsteht an der Begrüßung. Ein Chat, der ohne Engine begonnen wurde, bleibt unberührt. **Zuerst einen wegwerfbaren Testchat spielen** (Report-Format, Streaming und Swipes mit deinem Modell prüfen), erst dann die Langzeitkampagne.

**Einstellungen** (Extensions → Avereth Engine):

| Einstellung | Standard | Wirkung |
|---|---|---|
| Engine active | an | Schaltet die Engine an oder aus |
| Context budget | 1.400 Token | für Szene, NPCs, Retrieval und Lore; RESOLVED und Header werden nie gekürzt |
| Rules allowance | 800 Token | situative Regeltexte (Schleichen, Loot, Handel, `#system`) |
| Recent turns not re-retrieved | 4 | was noch im Chatverlauf steht, wird nicht doppelt injiziert |
| Injection depth | 0 | 0 = direkt vor der Generierung |
| World lore | Auto | Auto: Lorebook der Karte, falls verknüpft, sonst die Lore der Engine. „Card lorebook“ oder „Engine“ erzwingen eine Quelle. Die Statuszeile zeigt die aktive. |
| Word replacements | `ledger=register` | Wörter, die der Erzähler überstrapaziert, werden in seinen Antworten ersetzt: ganze Wörter, Plural und Großschreibung bleiben; Paare mit Komma trennen (`ledger=register, tapestry=weave`). Das Wort steht so auch nicht mehr im nächsten Prompt. Eine Bann-Liste im Preset nennt das Wort und macht es eher wahrscheinlicher. |
| Show last engine block | aus | zeigt den zuletzt injizierten Engine-Block (Debugging) |

Außerdem gibt es einen Button **Export event log**, der das komplette Event-Log als JSON herunterlädt.

## Spielen

- Handlungen normal schreiben: `*I aim the bow and Power Shot at him*`, `I sneak along the hedge`, `"My name is Alaric."`.
- Kampf beginnt nur bei einem erklärten Angriff (Core #23). Zielen, Spurenlesen oder „Bogen bereit“ starten keinen Kampf.
- **Ein** gültiges Ziel wird automatisch gewählt. Bei mehreren fragt das Spiel nach, ohne Kosten oder Würfe. Unterscheidest du Ziele („the second one“, „the other one“) und passt keines, wählt die Engine nicht für dich. „the nearest one“ nimmt im Kampf den nächsten Gegner nach Entfernung; stehen zwei gleich nah, fragt das Spiel.
- Warten im Kampf: `I wait` / `I hold my position`.
- Bewegung plus Angriff (Core #12/#24: ein Band plus eine Hauptaktion): `I step back and shoot`, `I kite backwards and Power Shot`. Alaric schießt und tritt danach ein Band zurück.
- **Im Kampf redet niemand** (Kampfstille). Nur wer aufgibt oder verhandelt, darf einen kurzen Satz sagen. Hält sich die Erzählung nicht daran, korrigiert der nächste Engine-Block.
- **Kampf und Proben stehen als System-Zeilen oben in der Antwort**, direkt aus den Engine-Würfen:
  - Initiative und Zugreihenfolge;
  - jede Aktion mit Trefferchance und W100;
  - `HP vorher - Schaden = HP nachher`;
  - HP aller Beteiligten, ihre Entfernung zu Alaric (`Range:`), Alarics MP/STA/Pfeile;
  - vor Alarics Zug seine Angriffe mit der Trefferchance gegen das nächste Ziel: `Alaric's attacks vs cellar vermin: Basic Attack 73% · Aimed Shot 83% · Power Shot 63%`;
  - Kampfende mit XP;
  - greift jemand Alaric an, steht die Reihenfolge schon über dieser Antwort (`COMBAT START`, Initiative, HP, Entfernung, wer vor Alaric handelt), bevor du deine Aktion schreibst;
  - Handel und Beute als eigene Zeilen: `COIN -2 Copper → 4 Silver 8 Copper`, `ITEM +3 Standard Arrow → 23 carried`, `QUEST ACCEPTED — …`, Quest-XP und Level-up, Erholung.

  Der Block ist nur Anzeige: GLM bekommt die Zahlen im Engine-Block und sieht den Block nicht im Chatverlauf.

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
npm test                               # 143 Tests: Unit, Szenarien, SillyTavern-Verhalten, Review-Fälle, Lorebook, Regression der Testruns 1–4
node tools/testrun_compare.js          # Token-Vergleich mit Testrun-v1
node tools/browser_smoke.mjs           # optional: index.js in echtem Chromium mit gemocktem SillyTavern-Kontext (braucht Playwright)
node tools/lorebook_audit.mjs          # welche Lorebook-Einträge in den Testruns 2–4 feuern (World-Info-Nachbau, gegen Testrun 4 bestätigt)
python3 tools/migrate_content.py       # Content aus dem Paket v1.24 neu erzeugen (aus dem Repo-Wurzelverzeichnis)
```

| Ordner | Inhalt |
|---|---|
| `index.js`, `manifest.json`, `style.css` | SillyTavern-Anbindung |
| `src/` | Engine, siehe [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) |
| `content/` | Inhalte, siehe [docs/DATENMODELL.md](docs/DATENMODELL.md) |
| `lorebook/` | Welt-Lore als SillyTavern-Lorebook (Character Lore), siehe [docs/LOREBOOK.md](docs/LOREBOOK.md) |
| `schemas/` | JSON-Schemas für Content, Events und Report |
| `tests/` | `unit/`, `scenarios/`, `testrun_v1/` bis `testrun_v4/` |
| `tools/` | Migration, Testrun-Vergleich, Lorebook-Audit |
| `docs/` | Architektur, Datenmodell, Migration, WI-Bewertung, Lorebook, Testrun-Analyse |

**Engine-API** (`src/engine.js`; Adapter für Chat-Arrays in `src/host.js`):

```js
const events = startCampaign(content, { seed, firstMessage });
const turn   = playerTurn(state, content, input, { msg });           // Events der Spielernachricht
const block  = turnContext(turn.state, content, { input, lastReply, corrections });
const reply  = narratorReply(turn.state, content, llmText, { msg });  // Events der Antwort, bereinigter Text, Korrekturen
```
