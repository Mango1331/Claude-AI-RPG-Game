# Avereth Engine (v2.0.0)

Deterministische Spiel-Engine für die Avereth-Kampagne als **SillyTavern-Extension**. Sie besitzt Regeln, Würfel, Kampagnenzustand und Figurenwissen. Das Sprachmodell erzählt.

- Keine Abhängigkeiten, kein Server, keine Datenbank.
- Läuft im Browser (SillyTavern) und in Node (Tests).

**Warum diese Architektur:** [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). **Befunde aus Testrun-v1:** [docs/TESTRUN_V1.md](docs/TESTRUN_V1.md). **Gesamtbericht:** [ABSCHLUSSBERICHT.md](ABSCHLUSSBERICHT.md).

## Was die Engine pro Zug tut

1. **Vor der Generierung** (Prompt-Interceptor) liest sie deine Nachricht:
   - Angriff, Skill, Bewegung, Flucht, Schleichen, Charaktererstellung oder `#`-Befehl;
   - Fragen und wörtliche Rede („Drop it or I shoot!“) sind keine Angriffe.
2. **Sie löst Mechanik selbst:**
   - Initiative, Treffer, Crit, Schaden (Core #11), Munition, Kosten und NPC-Züge;
   - Level-ups und DefeatXP;
   - Schleichen gegen Wahrnehmung;
   - die Charaktererstellung.
3. **Sie injiziert einen kompakten Engine-Block** (etwa 1.000–1.300 Token): Zustand, NPC-Karten mit **nur deren Wissen**, relevante Erinnerungen und Fakten, Lore und zuletzt „RESOLVED THIS TURN“ mit allen Würfen.
4. **Das Modell erzählt** und hängt einen Fakten-Report an: `<avereth>{…}</avereth>`.
5. **Nach der Antwort** prüft die Engine den Report:
   - neue Figuren, Orte, Fakten, Wissen, Erinnerungen, Beziehungen, Quests, Items und Coin werden übernommen;
   - Ungültiges wird mit Grund abgelehnt;
   - der Report wird aus der Anzeige entfernt;
   - Zahlen in der Antwort, die der Engine widersprechen (z. B. „Init 8“), werden im nächsten Zug korrigiert.

Der Zustand wird **pro Nachricht** gespeichert (`message.extra.avereth`):
- **Swipe:** Jede Alternative hat eigene Fakten.
- **Regenerieren:** gleiche Würfel; es wird nie neu gewürfelt.
- **Löschen:** nimmt die Fakten der gelöschten Nachrichten mit.

## Installation

1. Den Ordner `avereth-engine/` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren, oder über „Install extension“ aus einem Git-Repository installieren.
2. SillyTavern neu laden. Unter Extensions erscheint **Avereth Engine**.
3. **Charakterkarte:**
   - Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v3.txt`;
   - Begrüßung = First Message v0.4 (unverändert; die Zeile `Location: … outside <City>, <Realm>` legt den Startort fest).
4. **Die Avereth-WorldInfo v1.23 deaktivieren.** Die Engine ersetzt sie; beides zusammen doppelt Regeln. Der Megumin-NPC-Patch ist optional.
5. **Neuen Chat starten.** Die Kampagne entsteht an der Begrüßung. Ein Chat, der ohne Engine begonnen wurde, bleibt unberührt.

**Einstellungen** (Extensions → Avereth Engine):

| Einstellung | Standard | Wirkung |
|---|---|---|
| Engine active | an | Schaltet die Engine an oder aus |
| Context budget | 1.400 Token | für Szene, NPCs, Retrieval und Lore; RESOLVED und Header werden nie gekürzt |
| Rules allowance | 800 Token | situative Regeltexte (Schleichen, Loot, Handel, `#system`) |
| Recent turns not re-retrieved | 4 | was noch im Chatverlauf steht, wird nicht doppelt injiziert |
| Injection depth | 0 | 0 = direkt vor der Generierung |
| Show last engine block | aus | zeigt den zuletzt injizierten Engine-Block (Debugging) |

Außerdem gibt es einen Button **Export event log**, der das komplette Event-Log als JSON herunterlädt.

## Spielen

- Handlungen normal schreiben: `*I aim the bow and Power Shot at him*`, `I sneak along the hedge`, `"My name is Alaric."`.
- Kampf beginnt nur bei einem erklärten Angriff (Core #23). Zielen, Spurenlesen oder „Bogen bereit“ starten keinen Kampf.
- **Ein** gültiges Ziel wird automatisch gewählt. Bei mehreren fragt das Spiel nach, ohne Kosten oder Würfe.
- Warten im Kampf: `I wait` / `I hold my position`.

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
npm test                               # 68 Tests: Unit, Szenarien, SillyTavern-Verhalten, Testrun-v1-Regression
node tools/testrun_compare.js          # Token-Vergleich mit Testrun-v1
node tools/browser_smoke.mjs           # optional: index.js in echtem Chromium mit gemocktem SillyTavern-Kontext (braucht Playwright)
python3 tools/migrate_content.py       # Content aus dem Paket v1.24 neu erzeugen (aus dem Repo-Wurzelverzeichnis)
```

| Ordner | Inhalt |
|---|---|
| `index.js`, `manifest.json`, `style.css` | SillyTavern-Anbindung |
| `src/` | Engine, siehe [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) |
| `content/` | Inhalte, siehe [docs/DATENMODELL.md](docs/DATENMODELL.md) |
| `schemas/` | JSON-Schemas für Content, Events und Report |
| `tests/` | `unit/`, `scenarios/`, `testrun_v1/` |
| `tools/` | Migration, Testrun-Vergleich |
| `docs/` | Architektur, Datenmodell, Migration, WI-Bewertung, Testrun-Analyse |

**Engine-API** (`src/engine.js`; Adapter für Chat-Arrays in `src/host.js`):

```js
const events = startCampaign(content, { seed, firstMessage });
const turn   = playerTurn(state, content, input, { msg });           // Events der Spielernachricht
const block  = turnContext(turn.state, content, { input, lastReply, corrections });
const reply  = narratorReply(turn.state, content, llmText, { msg });  // Events der Antwort, bereinigter Text, Korrekturen
```
