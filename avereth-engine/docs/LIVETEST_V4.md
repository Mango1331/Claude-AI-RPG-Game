# Live-Test Runtime V4 (Engine 4.0.0)

**Worum es geht:** der erste Lauf von Runtime V4 mit dem echten Modell. Alles, was ohne Modell prüfbar ist, ist geprüft (§1). Offen sind nur Dinge, die das Modell entscheidet: Liest der Interpreter die Nachrichten richtig? Erzählt der Erzähler nur Prosa und hält er bei offenen Entscheidungen an? Liest der Extraktor die Antworten treu?

**Der API-Schlüssel bleibt in SillyTavern.** Kein Schritt hier verlangt, ihn irgendwohin zu kopieren. Die Engine sieht ihn nie: Ihre drei Aufrufe gehen an SillyTavern (`/api/backends/chat-completions/generate`), und SillyTavern setzt den Schlüssel auf seinem Server ein. Der Live-Smoke gegen ein echtes SillyTavern 1.19 hat genau das geprüft (§1). Was du zurückschickst (§5), enthält keinen Schlüssel.

## Inhalt

1. [Was ohne Modell geprüft ist](#1-was-ohne-modell-geprüft-ist)
2. [Einrichtung in SillyTavern](#2-einrichtung-in-sillytavern)
3. [Nachmessung S1/S2 (optional, vor dem Spiel)](#3-nachmessung-s1s2-optional-vor-dem-spiel)
4. [Der Spieltest](#4-der-spieltest)
5. [Zurückschicken](#5-zurückschicken)
6. [Bekannte Grenzen dieses Stands](#6-bekannte-grenzen-dieses-stands)

---

## 1. Was ohne Modell geprüft ist

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Einheiten, Golden-V12, Cluster, Laufzeit, Abdeckung | `npm test` | 383/383 |
| `index.js` in Chromium, SillyTavern nachgebaut: eine V3- und eine V4-Kampagne | `node tools/browser_smoke.mjs` | OK |
| **Echtes SillyTavern 1.19**, V4: Begrüßung → V4-Kampagne, Erschaffung, drei V12-Züge; Mock-Provider hinter der Quelle Custom | `AVERETH_ST_DIR=… node tools/st_live/run_v4.mjs` | 17/17 |
| Echtes SillyTavern 1.19, V3-Kampagne (14 Züge, Kampf, Nachforderung, Reise) | `AVERETH_ST_DIR=… node tools/st_live/setup.mjs && … run.mjs` | 21/21 |

**Was der V4-Lauf im echten SillyTavern gezeigt hat:**
- Die Kampagne entsteht an der Begrüßung in V4. SillyTavern sendet für sie `MESSAGE_RECEIVED`; bis `a6aa155` startete dieser Weg jede neue Kampagne als V3.
- Der Erzähler bekommt PLAYER ACTIONS und am Ende „write only the story“; kein Report wird verlangt.
- Interpreter, Extraktor und Board-Generator laufen über SillyTavern mit Temperatur 0,1 / 0,1 / 0,6, ohne Streaming.
- **Schlüssel:** Ein Dummy-Schlüssel in `secrets.json` kam beim Provider an, von SillyTavern gesetzt. In keiner Anfrage oder Antwort des Browsers und in keiner Chat-Datei tauchte er auf.
- **Barriere:** Die nächste Nachricht wurde sofort gesendet. Sie wartete, bis Extraktion und Board der vorigen Antwort gebucht waren.
- HUD, Statuszeile (`runtime v4 (LLM: custom endpoint)`, `integrity: OK`, `lore: World Info (Avereth World Lore v0.13)`) und Endzustand stimmen: Novice, 30 cp, fünf Aushänge, einer von anderen genommen.

**`tools/st_live/*` nur gegen ein Wegwerf-SillyTavern laufen lassen, nie gegen deine Installation.** Die Werkzeuge ersetzen dort Extension, Karte, Einstellungen und kurz `secrets.json`.

---

## 2. Einrichtung in SillyTavern

1. **Extension:** den Ordner `avereth-engine/` aus dem Branch `claude/happy-wright-1a4y19` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren; eine alte Kopie vorher löschen. SillyTavern neu laden. Die Statuszeile im Engine-Panel zeigt `Avereth Engine 4.0.0`.
2. **Verbindung (wichtig):** API Connections → Chat Completion → Quelle **Custom (OpenAI-compatible)**, Endpoint und Modell wie bisher, einmal Connect. Die Include-Body-Parameter (z. B. `reasoning_effort`, `clear_thinking`) gelten auch für die drei Engine-Aufrufe, wie in P0 gemessen.
   - **Warum Custom:** Nur bei dieser Quelle schickt die Engine ihre Aufrufe genau so wie die P0-Werkzeuge, mit eigener Temperatur 0,1. Bei jeder anderen Quelle nimmt sie `generateRaw`; dann gelten Temperatur und Einstellungen des Erzähler-Presets. Das ist nicht gemessen.
3. **Eine eigene Karte für V4** (empfohlen), z. B. die bisherige Karte duplizieren und „Avereth V4“ nennen:
   - Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v4.txt`;
   - Begrüßung = First Message v0.4 wie bisher (die Zeile `Location: … outside <City>, <Realm>` legt den Startort fest; für den Vergleich mit Lauf V12: `outside Redmarch, Veyrhold`).
   - Laufende V3-Chats behalten ihre Karte mit Vertrag v3.
4. **Preset:** `presets/Avereth Narrator V4.json` importieren (Chat Completion Presets → Import) und wählen. Es ist das Avereth-Narrator-Preset mit neuem Schluss: „only the story text. No <avereth> block …“.
   - Streaming ist im Preset aus. Einschalten ist erlaubt; V4 braucht keine Regex, weil die Antwort keinen Block enthält.
5. **Lorebook:** `lorebook/Avereth_World_Lore_v0.13.json` importieren, v0.12 löschen und v0.13 an der Karte als Character Lore verknüpfen. Einstellungen wie bisher ([LOREBOOK.md](LOREBOOK.md)). v0.13 sagt dem Erzähler nicht mehr, einen Report zu schreiben.
6. **Engine-Einstellung** „Runtime for new campaigns“ = **V4** (Standard). Sie gilt für neue Chats; ein laufender Chat behält seine Runtime.
7. **Neuen Chat** mit der V4-Karte starten. Die Statuszeile zeigt `runtime v4`, nach dem ersten Story-Zug `runtime v4 (LLM: custom endpoint)`.

---

## 3. Nachmessung S1/S2 (optional, vor dem Spiel)

Interpreter und Extraktor haben sich seit den P0-Messungen geändert (Agency-Guard, Firewall, Vokabular delta-0.3). Diese Läufe messen den Produktpfad mit dem echten Modell. Der Schlüssel bleibt in SillyTavern ([P0_SPIKES.md §3.2](P0_SPIKES.md#32-weg-b-empfohlen-über-sillytavern), Weg B: SillyTavern läuft, Quelle Custom gewählt).

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
git pull
node tools/p0/check.mjs --ping
node tools/p0/s1_interpreter.mjs
node tools/p0/s1_interpreter.mjs --corpus tests/eval/commands_holdout2.jsonl --out p0_out/s1_holdout2
node tools/p0/s2_deltas.mjs --variant a --vocab v4 --out p0_out/s2_v4
```

| Lauf | Aufrufe | Was er zeigt | Offline-Stand (nicht live) |
|---|---|---|---|
| S1 (256 Fälle) | 256 (+ Reparaturen) | Interpreter (Prompt v4) + Agency-Guard auf dem Korpus | Guard auf den aufgezeichneten P0-Antworten: Negativ-Präzision 100 % (87/87, optimistisch: am Korpus entworfen), Recall 94,2 % |
| S1 Holdout 2 (58 Fälle) | 58 (+ Reparaturen) | ungesehene Formulierungen | offline, erster Lauf: 89 % der verlockenden Fehlbefehle abgefangen, 97 % der richtigen erhalten |
| S2 Produktpfad | 41 | Extraktor roh gegen nach der Firewall | Erwartung: gültig 100 %, verbotene Deltas committet ≤ 1 von 41 |

---

## 4. Der Spieltest

**Wegwerf-Chat zuerst.** Nach jeder Antwort liest die Engine sie im Hintergrund. Über der Antwort steht dann `WORLD — the engine is reading the reply`, danach die Änderungen und das HUD. Sendest du vorher, wartet die nächste Nachricht darauf, höchstens 90 s.

### A. Der Weg des Laufs V12 (acht Nachrichten, eigene Worte erlaubt)

| # | Nachricht (sinngemäß) | Erwartet |
|---|---|---|
| 1 | in die Stadt gehen, zur Gilde, eintreten | Ankunft in „Adventurers' Guild hall“, HUD-Ort; das Brett wird im Hintergrund erzeugt |
| 2 | „Im here to Register“ (höflich) | Der Schreiber nennt die Gebühr **2 Silber**, einmalig, und hält an. **Nichts bezahlt**, Coin unverändert |
| 3 | nicken, die 2 Silber zahlen, Hand auf den Stein, dann das Novice-Brett ansehen | −20 cp, Novice, Power Rank F, Plakette. **Genau fünf Aushänge** mit Namen und Preis wie im System-Block; keine erfundenen |
| 4 | nach einem Auftrag fragen („Could I take the escort?“) | eine Frage, **keine Annahme** |
| 5 | „register the Herb Run“ | angenommen, Vertragszettel, Ziel steht im HUD |
| 6 | zu den Reedbeds, den ganzen Tag sammeln | Zeit bis zum Deckel, Marshmint als Gegenstand am Ort |
| 7 | alles zur Gilde zurücktragen und abgeben | am Schalter geprüft und bezahlt (40 cp), XP; **nur die Gilde zahlt** |
| 8 | ein Gasthaus suchen, nach Zimmer und Bad fragen | Preise genannt, **nichts bezahlt**, solange du nicht zustimmst |

### B. Stichproben der Fehlerklassen (je eine Nachricht)

- am Straßenrand „I'm here to register with the guild“ → nichts gebucht (Absicht, keine Handlung);
- „I gave you the heads yesterday“ → nichts gebucht (Erinnerung);
- „leave the dead rats“ (als Rat an jemanden) → nichts fallen gelassen;
- „Register me, here are the 2 silver“ in einem Satz → einmal registriert, einmal bezahlt;
- „I'll sell you my pouch, not under 3 copper“ → verkauft nur, wenn die Antwort einen Preis ≥ 3 cp zeigt;
- eine Antwort, in der Alaric etwas kauft, dem du nicht zugestimmt hast → `NOT APPLIED`, Coin unverändert, Korrektur im nächsten Zug;
- ein Angriff („I Heavy Slash the rat“) → Kampf wie in V3 (Zielliste, Runden), danach weiter mit V4.

### C. Robustheit

- **Swipe** einer Antwort: dieselben Würfel, die neue Antwort wird neu gelesen.
- **Regenerate** nach `INTERPRETER FAILED` oder „no new official contracts“: fragt neu.
- **Seite neu laden,** während `WORLD — the engine is reading` dasteht: Die Lesung läuft danach weiter.
- **Antwort bearbeiten** (Tippfehler): Die gebuchte Welt bleibt.

**Bitte notieren, je Zug:** falsch Gebuchtes oder Fehlendes (System-Zeilen `UNDERSTOOD`, `WORLD`, `NOT APPLIED`, `ENGINE REFUSED`); ob der Erzähler bei offenen Entscheidungen anhielt; die Wartezeit bis zum ersten Wort und bis das HUD erschien.

---

## 5. Zurückschicken

- **Chat-Export** des Test-Chats (SillyTavern: Chat-Menü → Export als `.jsonl`). Er enthält die Prosa und die Records der Engine (Befehle, Auflösungen, Extraktor-Antworten, Events), keine Schlüssel.
- **Event-Log** (Engine-Panel → *Export event log*).
- Deine **Notizen** je Zug.
- Falls §3 gelaufen ist: `p0_out/s1/summary.md`, `p0_out/s1_holdout2/summary.md`, `p0_out/s2_v4/summary.md`. Die Werkzeuge prüfen vor dem Schreiben, dass kein Schlüssel und kein Header darin steht.

**Nicht schicken:** `secrets.json`, `settings.json`, Screenshots der API-Einstellungen, die SillyTavern-Konsole.

---

## 6. Bekannte Grenzen dieses Stands

Die vollständige Liste steht in [RUNTIME_V4_PLAN.md, Rev. 3](RUNTIME_V4_PLAN.md#r3-revision-3-stand-nach-p0-und-umsetzung-40). Für den Test wichtig:

- **Nur mit dem echten Modell prüfbar:** Lesefehler des Extraktors wie P0 v11_05 (er liest „er ging zur Mühle“ als Ankunft, obwohl die Antwort unterwegs endet); Überschreitungen, die die Firewall nicht kennt.
- **Andere Quellen als Custom:** `generateRaw` mit der Temperatur des Presets; nicht gemessen.
- **V3-Chats bleiben V3.** Es gibt keine Umstellung laufender Kampagnen (keine Upcaster).
- **In 4.0 grundlegend:** Verkauf, Ausrüsten. **Private Aufträge bringen noch keine Quest-XP** (offene Entscheidung, Plan R3.6). Pending Check folgt in 4.1.
- **Latenz:** Der Interpreter ist ein zusätzlicher Aufruf vor jedem Story-Zug. Die Lesung danach läuft im Hintergrund, kann aber die nächste Nachricht aufhalten.
