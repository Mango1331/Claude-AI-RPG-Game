# Live-Runner: automatisierte echte SillyTavern-Livetests

Werkzeug: `tools/st_live/live/` (ab Build 4.3.0-c.6.6.29). Er spielt einen Livetest in einem echten SillyTavern mit dem echten Provider, ohne Mocks. Am Ende liegen Chat, Engine-Ereignisse, alle Chat-Completion-Aufrufe und ein Bericht in einem eigenen Ordner pro Lauf.

**Grundsatz.** Der Runner übernimmt nur die Spielerentscheidungen. Er manipuliert keine Engine-Zustände, setzt keinen Questfortschritt und tötet keine Gegner. Er regeneriert, swipt und editiert keine Nachricht. Dein SillyTavern-Profil wird nur gelesen, nie geschrieben. Der Stub-Selbsttest (§10) prüft nur den Runner und **zählt nicht als Livetest**.

## 1. Aufbau

| Teil | Datei | Aufgabe |
|---|---|---|
| Import | `import_profile.mjs` | liest Verbindung, Generierungswerte, Persona, Engine-Einstellungen und die Begrüßung der Karte aus deinem Profil, nur lesend und selektiv (§3) |
| Instanz | `profile.mjs` | eine isolierte SillyTavern-Datenwurzel im Temp-Ordner: Erweiterung, Karte, Lorebook und Preset dieses Builds, Schlüssel aus der Umgebung (§4) |
| Server | `server.mjs` | dein SillyTavern-Programm mit `--configPath`/`--dataRoot` der Instanz; Konsole mit Zeitstempeln (§4) |
| Treiber | `driver.mjs` | Playwright; tut im Browser nur, was ein Spieler tut (§5) |
| Spieler | `players.mjs` | LLM-Spieler nach Leitfaden; regelbasierter Spieler für Vergleichsläufe (§6) |
| Leitfäden | `guide.mjs`, `guides/*.json` | Etappenziele je Patch (§6) |
| Auswertung | `evaluator.mjs` | Etappen, Kämpfe, Quests und Auffälligkeiten aus Fold und Ereignissen, nur für den Bericht (§7) |
| Aufrufe | `calls.mjs` | jeder Chat-Completion-Aufruf aus dem Server-Log: Rolle, Modell, Zeit, Tokens, finish_reason, Reparatur (§8) |
| Export | `export.mjs` | Laufordner, Ereignis-Log und Geheimnis-Scan (§8) |
| Bericht | `report.mjs` | `report.md` (§9) |
| CLI | `run_live.mjs` | `--check`, `--inspect`, Lauf, `--stub` |
| Selbsttest | `selftest.mjs`, `stub_provider.mjs` | Runner gegen einen Stub, ausdrücklich kein Livetest (§10) |

## 2. Einrichtung auf dem Windows-PC

1. **Node.js ≥ 20.** Dein SillyTavern braucht es ohnehin.
2. **Playwright.** Im Ordner `avereth-engine`:
   ```powershell
   npm install --no-save playwright-core
   ```
   Alternativ global mit `npm install -g playwright-core`. Ein Browser-Download ist nicht nötig. Fehlt Playwrights eigenes Chromium, nimmt der Runner das installierte **Microsoft Edge** (`"browser": "auto"`), sonst Chrome.
3. **Konfiguration.** Kopiere `tools/st_live/live.config.example.json` nach `tools/st_live/live.config.json`. Diese Datei ist in `.gitignore`. Trage ein:
   - `stDir`: der Ordner deiner SillyTavern-Installation, in JSON mit doppelten Backslashes, z. B. `"C:\\SillyTavern"`;
   - `stUser`: nur nötig, wenn du ST-Benutzerkonten nutzt (Standard `default-user`);
   - `card`: nur nötig, wenn mehrere Avereth-Karten den V4-Vertrag tragen;
   - `guide`: der Leitfaden, z. B. `patch_8_4`.
4. **API-Schlüssel nur in der Umgebung**, nie in einer Datei:
   ```powershell
   $env:AVERETH_LIVE_API_KEY = "dein-schlüssel"
   ```
   Das gilt nur für dieses PowerShell-Fenster. Der Runner liest `secrets.json` deines Profils nie.
5. **Prüfen.** Diese Schritte starten nichts:
   ```powershell
   npm run live:st:check
   npm run live:st:check -- --ping
   node tools/st_live/live/run_live.mjs --inspect
   ```
   - `--ping` fragt zusätzlich `GET /models` beim Provider ab.
   - `--inspect` zeigt, was aus deinem Profil übernommen würde, ohne Schlüssel.
6. **Lauf.**
   ```powershell
   npm run live:st -- --guide patch_8_4
   npm run live:st -- --guide patch_8_4 --headed
   ```
   - `--headed` zeigt den Browser, sodass du zusehen kannst.
   - Weitere Optionen: `--seed <n>`, `--max-turns <n>`, `--player scripted`, `--preset repo`, `--keep-profile`, `--port <n>`, `--runs <ordner>`.
7. **Ergebnis.** Es liegt in `tools/st_live/runs/<lauf-id>/` (in `.gitignore`). Liegt das Repo innerhalb deiner SillyTavern-Installation, nimmt der Runner `%USERPROFILE%\avereth-live-runs`.

**Abbruch.** Ein erstes Strg+C beendet den Lauf nach dem laufenden Warten. Exporte und Bericht werden trotzdem geschrieben. Ein zweites Strg+C stoppt sofort. In beiden Fällen werden SillyTavern beendet und Schlüsseldatei sowie Instanz gelöscht.

**Dauer.** Mit GLM dauert ein Zug etwa 0,5–2 Minuten (Planner, Erzähler, Extraktor, Spieler). Der Grundablauf braucht 25–60 Züge. Die Limits stehen im Leitfaden (Standard: 80 Züge, 240 Minuten).

## 3. Lesender, selektiver Import

**Gelesen** werden nur diese Dateien. Jede wird mit SHA-256, Größe und Zeit festgehalten und nach dem Lauf erneut geprüft:
- `config.yaml` (nur `dataRoot`) und `package.json` (Version) der Installation;
- `settings.json` des Profils;
- die aktive Preset-Datei;
- die Avereth-Karte(n): PNGs mit „avereth“ im Namen, die den Erzählervertrag tragen;
- das Lorebook, das die Karte verknüpft (nur zum Vergleich).

**Übernommen** wird:
- **Verbindung** der aktiven Chat-Completion-Quelle. Bei Custom: URL, Modell, include/exclude body, Header, Prompt-Post-Processing, „Bypass status check“. Bei anderen Quellen deren Modell- und Endpoint-Felder.
- **Generierungswerte, wie sie in Gebrauch sind** (aus `settings.json`, also auch ungespeicherte Preset-Änderungen; der Bericht nennt sie): Temperatur, Penalties, Kontext, max. Tokens, Reasoning, Prompts und Reihenfolge.
  - Mit `--preset repo` gilt stattdessen das Preset dieses Builds.
- **Persona-Name** und `extension_settings.avereth`.
- **Name und Begrüßung der Karte.** Die First Message v0.4 legt über ihre `Location`-Zeile die Startstadt fest.

**Nie übernommen** wird:
- `secrets.json`, Chats, andere Karten;
- Reverse Proxy und Proxy-Passwort;
- ein include-Header oder -Body, der nach Zugangsdaten aussieht (Authorization, Bearer, api_key, token …).

Eine URL mit Zugangsdaten (`user:pw@`, `?key=`) bricht den Import ab.

**Hinweise im Bericht:**
- Eine Quelle ≠ Custom bedeutet: Die Engine-Aufrufe laufen über `generateRaw` ohne Metadaten in den Records. Das Server-Log hat sie trotzdem.
- Bei einem Kontext unter 16.384 Tokens kürzt SillyTavern Vertrag und Engine-Block weg.
- Bei globalen Lorebooks: Die Instanz hat keine.

## 4. Isolierte Instanz und Server

- Die Instanz liegt in einem eigenen Ordner im Temp-Verzeichnis (`avereth-live-<lauf-id>-…`) mit eigener `config.yaml`:
  - nur Loopback, Whitelist 127.0.0.1;
  - kein Browser-Autostart;
  - `logging.minLogLevel: 0`.
- Dein SillyTavern-Programm läuft darauf mit `node server.js --configPath … --dataRoot … --port …`, als eigene Prozessgruppe.
- Den eigenen Datenordner deiner Installation öffnet es dabei nicht. Dein normales SillyTavern kann parallel auf Port 8000 laufen.
- In die Instanz kommen:
  - die Erweiterung aus diesem Repo;
  - die Karte: Name und Begrüßung aus dem Profil, als Beschreibung der Erzählervertrag dieses Builds;
  - Lorebook v0.14 und Preset dieses Builds;
  - `settings.json` aus den Standardwerten der Instanz plus dem Import;
  - `secrets.json` mit dem Schlüssel aus der Umgebungsvariable.
- **Streaming ist aus**, damit SillyTavern jede Antwort loggt. Die Inhalte ändert das nicht, nur die Anzeige.
- Alle Schreibzugriffe gehen über einen Schreibschutz (`lib.mjs` `Guard`), der nur Instanz und Laufordner zulässt. Ein Pfad in deiner Installation oder deinem Profil wirft einen Fehler, bevor geschrieben wird.
- Nach dem Lauf werden `secrets.json` der Instanz und (ohne `--keep-profile`) die ganze Instanz gelöscht.

## 5. Browser-Treiber

Ein frischer Browser-Kontext ohne deine Anmeldungen und ohne deinen Speicher. Der Treiber macht nur, was ein Spieler macht:
- verbinden;
- die Karte öffnen (neuer Chat „Avereth Live <lauf-id>“);
- eine Nachricht eingeben und senden;
- warten;
- lesen.

Ein Zug ist zu Ende, wenn diese drei Bedingungen erfüllt sind:
- Die Generierung ist beendet.
- Die neueste Antwort ist vom Extraktor gelesen: Der HUD zeigt dann den gebuchten Stand.
- Die Seite blieb 1,5 s ruhig.

Abgebrochen und dokumentiert, mit Bildschirmfoto in `screens/`, wird bei:
- einem offenen Dialog;
- einer Nachricht, die nicht ankommt;
- keiner Antwort nach 20 s Ruhe;
- einer Zug-Zeit über `turnTimeoutSec` (Standard 900 s).

Es gibt kein stilles Wiederholen. Eine leere Erzählerantwort bleibt im Chat und steht im Bericht. Der Spieler sieht den Hinweis der Engine und spielt weiter, wie ein Mensch es täte.

## 6. Spieler und Leitfäden

**Was der Spieler sieht.** Nur `view()`:
- den sichtbaren Text des Chats ab zwei Spielernachrichten zurück, wie die Seite ihn rendert;
- den HUD unter der neuesten Antwort, aufgeklappt, wie ein Spieler ihn aufklickt;
- die neuen Hinweise (Toasts).

Fold, Ereignisse und Records bekommt er nie. Den Bildschirmtext jedes Zugs speichert `player.jsonl`, nachprüfbar.

**LLM-Spieler.**
- Er ruft einen OpenAI-kompatiblen Endpoint direkt auf, nicht über SillyTavern. Seine Aufrufe stehen deshalb nur in `player.jsonl`, nicht zwischen den Spiel-Aufrufen.
- Standard ist dasselbe Modell wie das Spiel. Ein eigenes stellst du mit `player.url`, `player.model` und `player.keyEnv` ein.
- `player.extraBody` wird jedem Aufruf beigefügt, z. B. `{"thinking": {"type": "disabled"}}`, wenn GLM sonst die Tokens im Reasoning verbraucht.
- Antwort je Zug:
  ```json
  {"message": "…", "milestone": "<etappe>", "intent": "…", "stop": false, "stop_reason": null, "observations": "…"}
  ```
- Eine unbrauchbare Antwort wird bis zu zweimal mit der Fehlermeldung nachgefragt, danach endet der Lauf als Runner-Fehler.
- Wortlaut, Fähigkeiten, Ziele und Taktik wählt der Spieler selbst. Ein Stil pro Lauf (`personas` des Leitfadens, über `--seed` wählbar) sorgt für Abwechslung.
- Kleine Probleme umgeht er. Er bricht nur ab, wenn ein echter Blocker den Test sinnlos macht.

**Regelbasierter Spieler** (`--player scripted`): die `scripted`-Schritte des Leitfadens.
- Jeder Schritt sagt seinen Text.
- Mit `until` (regulärer Ausdruck über die neuesten sichtbaren Nachrichten) bleibt er auf dem Schritt, höchstens `max`-mal; danach endet der Lauf als blockiert.
- Er spielt Lauf für Lauf denselben Text, ist also reproduzierbar, aber nur so genau, wie die Ausdrücke es sind.

**Leitfaden** (`guides/<id>.json`): Ziele statt Befehle.
```json
{
  "id": "patch_8_5", "extends": "guild_dungeon_loop", "title": "…",
  "brief_extra": "What this build changed and what the test looks at.",
  "focus": ["Patch 8.5: …"],
  "milestones": [{ "id": "…", "goal": "…", "check": "<Evaluator-Prüfung>", "required": true, "maxTurns": 8 }],
  "limits": { "maxTurns": 80, "maxMinutes": 240, "sameFailure": 3 },
  "personas": ["…"],
  "scripted": [{ "say": ["…"], "until": "regex", "max": 4, "milestone": "…" }]
}
```
- Ein Patch-Leitfaden erbt mit `extends` den Grundablauf und ergänzt nur Brief und Fokus. Etappen, Limits, Stile und Skript kann er ersetzen.
- `required: false` markiert eine Etappe, die nur genommen wird, wenn sie in Reichweite kommt (Wächter, Ebene geräumt).
- `maxTurns` ist das Budget einer Etappe: Darüber gilt sie im Bericht als „überschritten“, beim Dreifachen endet der Lauf als festgefahren.
- Mitgeliefert:
  - `guild_dungeon_loop`: der Grundablauf;
  - `patch_8_4`: Gruppenreaktion und Cull-Zahl.

## 7. Auswertung

`evaluator.mjs` liest den Chat mit den Records der Engine. Der Spieler sieht davon nichts. Der Runner nutzt die Auswertung zwischen den Zügen nur zur Laufsteuerung:
- `done`: alle Pflicht-Etappen erreicht;
- `defeat`: Alaric tot;
- `stuck`: eine Etappe dauert das Dreifache ihres Budgets;
- `limit`: Zug- oder Zeitlimit erreicht.

| Prüfung | erreicht, wenn |
|---|---|
| `creation_complete` | `creation.completed` |
| `guild_registered` | `guild.registered` |
| `board_shown` | `board.shown` |
| `dungeon_quest_active` | `quest.status → active` eines Vertrags mit `dungeon` |
| `inside_dungeon` | nach `scene.moved` steht er auf Ebene ≥ 1 eines echten Dungeons (`floorAt`, das Tor ist Ebene 0) |
| `fight_started` / `fight_won` | `encounter.started` / `encounter.ended` mit Besiegten, er lebt und floh nicht |
| `group_fight` | ein Kampf mit zwei oder mehr Gegnern von Beginn an |
| `guardian_defeated` | `entity.status dead` eines Slots mit Rolle `guard` oder `boss` |
| `floor_cleared` | `dungeon.cleared` |
| `quest_ready` / `quest_completed` | `quest.ready` / `quest.status → completed` |
| `returned_to_guild` | nach dem Dungeon wieder in einer Gildenhalle |

**Kämpfe.** Für jeden Kampfbeginn hält die Auswertung fest:
- wer im Kampf ist;
- welche Gruppenmitglieder anwesend waren und draußen blieben, mit ihrer Awareness;
- ob er verborgen war (`scene.concealed`).

Gruppenmitglieder, die draußen bleiben, obwohl er nicht verborgen war, meldet sie als `group_stayed_out`. Am `.28`-Lauf (`tests/v4/live_1022b.json`) ist das dreimal der Fehler, den Patch 8.4 behebt.

**Auffälligkeiten:**
- leere Antwort;
- Extraktor fehlgeschlagen, spät oder repariert;
- Planner fehlgeschlagen oder repariert;
- Board fehlgeschlagen;
- `finish_reason` ≠ `stop`;
- System-Panels (CLARIFY, NOT TAKEN, REFUSED, BLOCKED, FAILED) und zurückgewiesene Deltas je Regel.

## 8. Exporte

| Datei | Inhalt |
|---|---|
| `chat.jsonl` | der vollständige Chat, wie SillyTavern ihn speichert |
| `avereth-events.json` | die Ereignisse der Engine im Format des Buttons „Export event log“ |
| `chat-completions.jsonl` | jeder Chat-Completion-Request mit seiner Antwort, Rolle, Zug und Dauer |
| `calls.json` | je Aufruf: Rolle (plan, interpret, extract, board, narrator, other), Reparatur, Zug, Zeit, Modell, max. Tokens, Temperatur, Reasoning, Prompt-, Cache-, Antwort- und Reasoning-Tokens, finish_reason, leer |
| `player.jsonl` | jede Entscheidung des Spielers mit dem Bildschirmtext, den er sah, seine Antwort, Zeit und Tokens |
| `evaluation.json` | Etappen, Kämpfe, Quests, Züge und Auffälligkeiten |
| `run.json` | Ablauf: Züge mit Zeiten, Statuszeile der Engine, Toasts, Seiten- und Serverfehler, Einrichtungshinweise |
| `import.json` | was aus dem Profil übernommen wurde und was nicht |
| `server.log` / `server.timed.log` | die Konsole der Instanz, roh (für `tools/run_report.mjs`) und mit Uhrzeit je Zeile |
| `report.md` | der Bericht |
| `screens/` | Bildschirmfotos am Ende und bei Problemen |

**Dauer eines Aufrufs.** Die Zeit zwischen den Logzeilen „Chat Completion request“ und „response“ der Instanz. Die Engine-Aufrufe tragen ihre eigene Zeit zusätzlich im Record (Patch 8.2).

**Geheimnis-Scan.** Am Ende werden alle Textdateien des Laufordners durchsucht:
- nach dem Schlüssel (und dem des Spielers);
- nach `Bearer …`, `api_key…`-Feldern und `sk-…`.

Treffer werden geschwärzt und im Bericht genannt.

## 9. Bericht

`report.md`, auf Deutsch, mit diesen Abschnitten:
- **Kurzfassung:** Ergebnis, Etappen, Leitfaden, Spieler, Züge, Dauer, Auffälligkeiten, Profilschutz, Scan.
- **Aufbau:** Build, Git-Commit und nicht committete Dateien, SillyTavern, Browser, Provider und Modell, Preset (Abweichungen von Build und Datei), Generierung, Streaming, Karte, Lorebook, Engine-Einstellungen, nicht Übernommenes, Kampagne und Seed.
- **Etappen** mit Zug und Nachricht.
- **Spielereingaben** mit Absicht, Ort, HP/MP und Zug-Zeit, dazu die Beobachtungen des Spielers.
- **Kämpfe**, **Quests** und **Auffälligkeiten**.
- **Performance** je Rolle: Median, p90, Tokens, Cache, Reasoning, finish_reason, leere Antworten.
- **Schutz und Geheimnisse:** Gelesenes unverändert? Profilordner unverändert? Wurde `secrets.json` nicht gelesen? Scan-Ergebnis? Instanz gelöscht?

Unterschiede im Profilordner nennt der Bericht ausdrücklich. Lief dein eigenes SillyTavern parallel, kann es selbst Dateien geändert haben: Der Runner schreibt dort nie.

## 10. Selbsttest mit Stub (kein Livetest)

```bash
AVERETH_ST_DIR=/pfad/zu/SillyTavern npm run live:st:selftest
```

Der Selbsttest ist für die Cloud und für jede Änderung am Runner gedacht.
- Der Stub (`stub_provider.mjs`) beantwortet:
  - den Planner mit einem leeren Plan;
  - den Extraktor ohne Deltas;
  - das Board mit einer Antwort, die es verwirft;
  - den Erzähler mit einem festen Satz;
  - den Spieler mit vier festen Entscheidungen.
- Er baut ein Fake-Profil mit allem, was ein echtes enthält:
  - Custom-Quelle und Preset (eine Temperatur ungespeichert geändert);
  - Avereth-Karte mit eigener Begrüßung und eine fremde Karte;
  - Lorebook und ein persönlicher Chat;
  - als Köder eine `secrets.json` mit Schlüssel, ein Authorization-Header und ein Proxy-Passwort.
- Dann spielt er einen Lauf mit dem LLM-Spieler (über den Stub) und einen mit dem regelbasierten Spieler.

Geprüft wird:
- Fake-Profil und SillyTavern-Checkout bleiben unverändert.
- `secrets.json`, Chats und die fremde Karte werden nicht gelesen.
- Kein Köder erscheint im Laufordner.
- Der Stub-Schlüssel kommt nur über SillyTavern beim Provider an.
- Alle Exporte sind da, jeder Aufruf hat Rolle, Zeit, Modell und Tokens, der Erzähler bekommt Vertrag und Engine-Block ohne Streaming.
- Der Spieler sah nur Seitentext.
- Der Bericht kennzeichnet den Stub, der Scan ist sauber.
- Es gibt keine Seiten- und keine Serverfehler.

Der Bericht eines Stub-Laufs trägt oben: **„STUB-SELBSTTEST — kein echter Livetest.“** Über das Verhalten der Engine oder eines Modells sagt er nichts.

Die Bausteine ohne SillyTavern testet `tests/live_runner/live_runner.test.js`, Teil von `npm test`:
- Auswertung am `.28`-Lauf;
- Aufrufe aus einem Server-Log;
- Scan und Schreibschutz;
- Import an einem Fake-Profil;
- Spieler, Leitfäden, Optionen, Bericht.

## 11. Grenzen

- **Spieler-Kosten.** Der LLM-Spieler kostet Tokens, standardmäßig beim selben Provider. Er läuft nie gleichzeitig mit einem Spiel-Aufruf, denn der Treiber wartet den Extraktor ab.
- **Andere Quelle als Custom.** Die Engine nimmt dann `generateRaw` ohne Metadaten in den Records. Der LLM-Spieler braucht dann `player.url` und `player.model`.
- **Karte und Lorebook** kommen aus diesem Build: Getestet wird der Build, nicht der Stand deines Profils. Abweichungen nennt der Bericht.
- **Streaming ist aus** (§4).
- **Kein Swipe, kein Regenerieren.** Diese Wege testet weiter `npm run smoke:st:c`.
- **ST-Start.** SillyTavern baut pro Instanz sein Frontend neu (etwa 20–60 s beim Start).
- **Regelbasierter Spieler.** Seine `until`-Ausdrücke prüfen nur Text. Für einen echten Lauf ist der LLM-Spieler gedacht.
