# Live-Runner: automatisierte echte SillyTavern-Livetests

Werkzeug: `tools/st_live/live/` (ab Build 4.3.0-c.6.6.29). Er spielt einen Livetest in einem echten SillyTavern mit dem echten Provider, ohne Mocks. Am Ende liegen Chat, Engine-Ereignisse, alle Chat-Completion-Aufrufe und ein Bericht in einem eigenen Ordner pro Lauf.

**Grundsatz.** Der Runner übernimmt nur die Spielerentscheidungen. Er manipuliert keine Engine-Zustände, setzt keinen Questfortschritt und tötet keine Gegner. Er regeneriert, swipt und editiert keine Nachricht. Dein SillyTavern-Profil wird nur gelesen, nie geschrieben. Der Stub-Selbsttest (§10) prüft nur den Runner und **zählt nicht als Livetest**.

## Sechs automatische Kampagnen (Batchmodus)

Mit vorhandener Konfiguration und dem API-Schlüssel in der bisherigen Umgebungsvariable im Ordner `avereth-engine` starten:

```powershell
npm run live:st:batch -- --headed
```

Der Batch startet **nacheinander** je eine neue Level-1-Kampagne für diese sechs Profile:

| Schwerpunkt | Klassen |
|---|---|
| Offizielle Gildenquests als Hauptbeschäftigung | Warrior, Mage, Rogue |
| Welterkundung und Entdeckungen als Hauptbeschäftigung | Warrior, Mage, Rogue |

Die Klasse wird dem LLM-Spieler für die normale Charaktererstellung vorgegeben und danach anhand des Enginezustands geprüft. Eine falsche Klasse wird als `scenario_mismatch` dokumentiert, niemals heimlich geändert. Starter-Skills, konkrete Quests, Wege, Kämpfe, Ausrüstung und Taktik bleiben frei. Alle Profile berücksichtigen Vorbereitung, Erholung, Lootverkauf, Gear und Skillentwicklung. Freie Hilfe und Abweichungen bleiben erlaubt. Keine Fixtures oder manipulierten Erfolge.

**Erkundung ist ein eigenständiger Spielstil:** Reisen zwischen Städten, Dörfern und Wildnis, Entdeckungen und geeignete Kämpfe unterwegs. Geld soll außerhalb der Gilde etwa durch Lootverkauf, bezahlte Arbeit, Handel oder andere glaubwürdige Gelegenheiten entstehen. Gildenregistrierung und Boards sind kein routinemäßiger Start oder Fortschrittsweg. Ziele und Erwerbsquellen bleiben frei; beiläufige Hilfe und natürlich entdeckte passende Dungeons sind erlaubt. Die drei besonderen Dungeonprofile entfallen; die drei Guildprofile und der normale Einzellauf behalten ihre bisherigen Anweisungen.

Der bisherige `current_test` bleibt unverändert. Batchprofile ersetzen nur seine Spielermotivation, wählen die Startklasse und behalten Level 15 als Ziel, den 100-Input-Vergleich sowie die bisherigen Grenzen von 1.000 Eingaben/24 Stunden je Kampagne. Der Batch selbst hat zusätzlich **24 Stunden Gesamtlaufzeit**. Danach wird der aktive Lauf zum geordneten Beenden aufgefordert; ein bereits laufender Modell-/Browser-Wartevorgang kann noch bis zu seiner bestehenden Zeitgrenze dauern. Nicht begonnene Profile bleiben ausdrücklich als `pending` dokumentiert.

Nach Tod, erreichtem Ziel, Einzellauf-Limit oder einem protokollierten Planner-/Extractor-Fehler wird der bestehende Export abgeschlossen, die Instanz beendet und das nächste Profil gestartet. Der fehlgeschlagene Zug wird **nicht** erneut ausgeführt. Drei aufeinanderfolgende Infrastruktur-/Startfehler stoppen die Serie. Ebenso stoppen eine erkannte Profiländerung, ein Geheimnis-Scan-Treffer oder ein anderer Git-HEAD vor dem nächsten Lauf. Während einer Serie den Checkout nicht bearbeiten oder aktualisieren. Ctrl+C beendet die **ganze Serie**, wartet aber auf Export und Cleanup des aktuellen Kindprozesses. Es gibt keinen endlosen Neustartmodus.

Jeder Lauf erhält einen eigenen Node-Prozess, Seed und fortlaufend nummerierten Ordner unter einer neuen `batch-<Zeitstempel>`-Wurzel, etwa `001-guild-warrior/<bisherige Run-ID>/` bis `006-explore-rogue/<Run-ID>/`. Chat, Events, Requests, Screenshots und Einzelbericht bleiben im bisherigen Format. `batch.json` und `report.md` in der Batchwurzel fassen die Serie zusammen. Alte Verzeichnisse werden nicht überschrieben. **Batch completed** heißt sechs beendete Versuche, nicht sechs bestandene Level-15-Läufe.

Weitere Aufrufe:

```powershell
npm run live:st:batch -- --list
npm run live:st:batch -- --check
npm run live:st:batch -- --max-hours 12 --seed 7
npm run live:st:batch -- --max-turns 200
npm run live:st -- --guide current_test --scenario explore-rogue
```

`--seed 7` ergibt Seeds 7–12; ohne festen Startseed wird eine neue Seedfolge gewählt. `--runs <Ordner>`, Browser-, ST- und Profiloptionen funktionieren wie beim Einzellauf. `--headed` zeigt den isolierten Browser. `--max-turns` ist eine ausdrücklich verkürzte Beobachtungsgrenze, kein Ersatz für das Levelziel. `--list` benötigt keine ST-Installation und startet nichts. Ohne `--scenario` bleibt der normale Einzellauf frei in seiner Klassenwahl.

**Umstellung vom 27.10.2026:** Ein laufender Neuner-Batch wird nicht umgeschrieben. Auf Wunsch nach dem sechsten Lauf mit Strg+C geordnet beenden und Export/Cleanup abwarten; erst danach den Checkout aktualisieren. Neue Batches verwenden sechs Profile. Konsole und Bericht leiten ihre Gesamtzahl aus der Profilmatrix ab. Die folgende Abnahmehistorie bezieht sich noch auf die damaligen neun Profile.

**Abnahme der Sechsermatrix:** Angepasste Profil-/Exportregressionen und eine neue Prüfung der Erkundungsmotivation: auf dem alten Neuner-Runner fünf rot/zehn grüne Kontrollen, danach Batchtests **15/15**, angrenzende Progressions-/Einzellauftests zusammen **28/28**, gesamte Node-Suite **1.937/1.937**. `--list` zeigt exakt sechs Profile. Kein neuer ST-Smoke: Host, Prozessstart, IPC und Engine sind unverändert. Die Wirkung der neuen Erkundungsanweisung bleibt im nächsten natürlichen Batch zu prüfen. Engine-Build bleibt `.100`.

**Technische Abnahme vom 26.10.2026:** Zehn neue Runner-Regressionen für die vollständige Profilmatrix, freie Starter-/Spielentscheidungen, Optionen/Legacy, Engine-Klassenprüfung, neun sequenzielle Exporte nach Spielabbrüchen, Infrastrukturgrenze, Profil-/Geheimnisschutz, Abbruch, Gesamtlaufzeit, Git-Wechsel und tatsächliche IPC-Kindprozesse. Finale vollständige Node-Suite **1.899/1.899**. Ein Zwischenlauf lieferte kein abgeschlossenes Summenprotokoll; die finale Wiederholung wurde mit Exitcode und Testsummen ausdrücklich verifiziert.

Echter **ST1.19-Batch-Selbsttest mit Stubprovider: 9/9 Kampagnen**, jeweils absichtlich auf zwei normale Erstellungseingaben begrenzt. Alle neun Profile mit korrekter Warrior-/Mage-/Rogue-Klasse, getrennten Seeds/Ordnern, Einzelbericht und Abschlussübersicht; alle enden korrekt als `limit`, keine PageErrors, Profiländerungen oder Geheimnis-Treffer. Der Stub unterstützt für diese Probe die drei gewöhnlichen Erstellungsmenüs; das ist keine Fixture. Zusätzlicher tatsächlicher IPC-Abbruch nach Kampagnenstart: Lauf als unterbrochen archiviert, Profil unverändert, Scan sauber. Eine erste Abbruchprobe scheiterte zuvor an der lokal fehlenden Browserpfad-Umgebung; mit korrekter Umgebung funktionierte sie. Diese Proben belegen Prozessführung, Erstellung und Export, **keinen natürlichen GLM-Langlauf und keine neun erfolgreichen Level-15-Läufe**. Engine-Build bleibt `.98`; ausschließlich Runner, Teststub und Dokumentation geändert. Kein neuer `smoke:st:c`, da Engine und Extension-Host unverändert sind.

### Windows-Startkorrektur vom 27.10.2026

Die hochgeladenen Batches `20261027-023945Z` und `20261027-024544Z` auf `.100` endeten jeweils nach drei frühen Kindprozessabbrüchen mit **3221226505 / 0xc0000409**, ohne `run.json`. Der Einzellauf funktioniert laut Nutzer. Die Archive belegen den nativen Abbruch, aber weder einen tatsächlichen Pufferüberlauf noch seine exakte native Ursache. `spawn_error` war hier nicht gesetzt: Die Prozesse wurden gestartet und legten bereits leere Laufordner an.

Der Batch vererbte bisher Konsolenhandles an einen abgekoppelten Windows-Prozess. Jetzt erhält dieser **stdout/stderr-Pipes**, deren Ausgaben der Controller im selben Terminal anzeigt. Das entspricht der bereits vorhandenen Konsolenanbindung des SillyTavern-Servers. Die getrennte Prozessgruppe, IPC, geordneter Abbruch/Export und die Grenze von drei Infrastrukturfehlern bleiben erhalten. Kein automatischer Retry desselben Spielzugs. [Node-Dokumentation zu detached/stdio](https://nodejs.org/api/child_process.html#optionsdetached).

Auch ohne vollständigen Run-Export enthalten `batch.json` und der Serienbericht jetzt Exitcode (einschließlich Hexdarstellung), Startfehler und einen begrenzten stderr-Auszug. Bekannte API-Schlüssel und die vorhandenen Credential-Muster werden vor der Archivierung entfernt. Der stderr-Puffer bleibt auf 8.192 und der gespeicherte Auszug auf 4.000 Zeichen begrenzt; keine zusätzlichen vollständigen Konsolenlogs.

Vier neue Regressionen waren auf dem unveränderten `.100`-Runner rot und sind nachher grün: Prozessstart mit Pipes/Weiterleitung, früher Fehler mit begrenzter und bereinigter Diagnose, tatsächlicher ENOENT-Startfehler und der originale Windows-Exitcode ohne Spielbericht. Batchtests **14/14**, vollständige Node-Suite **1.936/1.936**. Echter **ST1.19-Stub-Batch unter Linux 9/9**, jeweils zwei normale Erstellungseingaben: alle geforderten Klassen, eigene Exporte, keine PageErrors, Profiländerungen oder Geheimnistreffer. Alle endeten korrekt am bewusst gesetzten Zweieingaben-Limit; keine natürliche GLM- oder Level-15-Abnahme. Die echte Windows-Ursache und der Erfolg auf dem betroffenen Rechner bleiben bis zur dortigen Gegenprobe offen; Linux-Tests ersetzen diese Abnahme nicht. Engine-Build bleibt `.100`; nur Runner, Runner-Tests und dieser Leitfaden geändert. Startbefehle und Spieleranweisungen bleiben unverändert.

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
   Alternativ global mit `npm install -g playwright-core`. Ein Browser-Download ist nicht nötig: Der Runner nimmt dein installiertes **Google Chrome**. Es wird mit einem frischen, temporären Profil gestartet; dein eigenes Chrome, seine Anmeldungen und Daten bleiben unberührt, und es darf dabei offen sein.
   - `"browser": "chrome"` (Beispielkonfiguration): nur Chrome. Erwartet wird es am Standardort `C:\Program Files\Google\Chrome\Application\chrome.exe`.
   - `"auto"`: Chrome, sonst Playwrights eigenes Chromium (`npx playwright-core install chromium`), sonst Edge.
   - `"chromium"` oder `"msedge"`: nur dieser.
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
5. **Prüfen.** Diese Schritte starten nichts, auch keinen Proxy. Ein lokaler Proxy (z. B. der Featherless-Proxy, der die Modellliste auf fünf Modelle verkleinert) muss schon laufen; der Runner startet und beendet ihn nie:
   ```powershell
   npm run live:st:check
   npm run live:st:check -- --ping
   node tools/st_live/live/run_live.mjs --inspect
   node tools/st_live/live/run_live.mjs --inspect --ping
   ```
   - `--inspect` zeigt, was aus deinem Profil übernommen würde, ohne Schlüssel. Oben steht der Block **VERBINDUNG**: dein SillyTavern und der Runner nebeneinander (Quelle, Feld `custom_url` oder `reverse_proxy`, URL, Modell, woher der Schlüssel kommt), was mit einem `reverse_proxy` deines Profils geschieht, und am Ende ✔ „dieselbe Verbindung wie dein SillyTavern“ oder ✖ mit den Unterschieden (§3).
   - `--ping` fragt `GET <URL>/models` ab, wie SillyTavern es beim Verbinden tut, und prüft, ob die Modell-ID aus deinem Profil genau so in der Liste steht. Fehlt sie, nennt die Meldung die angebotenen Modelle und ähnliche IDs. Ein eigenes Spieler-Modell (`player.model`) wird mitgeprüft, ebenso mit einem kurzen Probe-Request, ob der Endpoint die Reasoning-Felder des Spielers annimmt (§6).
6. **Lauf.**
   ```powershell
   npm run live:st -- --guide patch_8_dungeon_full --max-turns 60 --headed
   npm run live:st -- --guide patch_8_4
   ```
   - Die Abnahme eines vollständigen Living Dungeons (Patch 8.4.2) läuft mit `patch_8_dungeon_full` und höchstens 60 Zügen. `--max-turns 60` gehört in den Befehl, weil `maxTurns` aus `live.config.json` (Beispiel: 40) sonst den Wert des Leitfadens überschreibt.
   - Vor dem Start fragt der Runner dieselbe Modellliste ab wie `--ping`. Antwortet der Endpoint nicht, lehnt er den Schlüssel ab oder fehlt das Modell in der Liste, startet er nichts und sagt, warum. Liefert der Endpoint keine Modellliste (dann braucht SillyTavern „Bypass status check“), läuft er weiter; der Bericht vermerkt es.
   - `--headed` zeigt den Browser, sodass du zusehen kannst.
   - Weitere Optionen: `--seed <n>`, `--max-turns <n>`, `--player scripted`, `--preset repo`, `--keep-profile`, `--port <n>`, `--runs <ordner>`.
7. **Ergebnis.** Es liegt in `tools/st_live/runs/<lauf-id>/` (in `.gitignore`). Liegt das Repo innerhalb deiner SillyTavern-Installation, nimmt der Runner `%USERPROFILE%\avereth-live-runs`.

**Abbruch.** Ein erstes Strg+C beendet den Lauf nach dem laufenden Warten. Exporte und Bericht werden trotzdem geschrieben. Ein zweites Strg+C stoppt sofort. In beiden Fällen werden SillyTavern beendet und Schlüsseldatei sowie Instanz gelöscht.

**Dauer.** Wie lange ein echter GLM-Lauf dauert, ist noch nicht gemessen; eine Schätzung gibt es hier deshalb nicht. Der Bericht misst es (Abschnitt „Laufzeit (gemessen)“): Einrichtung, Spielzeit und Spielerzeit je Zug, die Aufteilung auf Planner, Board, Erzähler, Extraktor und Warten laut Records, und eine Hochrechnung auf 40 und 80 Züge. Die Konsole nennt am Ende Gesamtzeit und Zeit je Zug. Die Limits stehen im Leitfaden (Standard: 80 Züge, 240 Minuten) und lassen sich mit `maxTurns` oder `--max-turns` senken.

## 3. Lesender, selektiver Import

**Gelesen** werden nur diese Dateien. Jede wird mit SHA-256, Größe und Zeit festgehalten und nach dem Lauf erneut geprüft:
- `config.yaml` (nur `dataRoot`) und `package.json` (Version) der Installation;
- `settings.json` des Profils;
- die aktive Preset-Datei;
- die Avereth-Karte(n): PNGs mit „avereth“ im Namen, die den Erzählervertrag tragen;
- das Lorebook, das die Karte verknüpft (nur zum Vergleich).

**Übernommen** wird:
- **Verbindung** der aktiven Chat-Completion-Quelle, so wie SillyTavern sie benutzt (unten). Bei Custom: URL, Modell, include/exclude body, Header, Prompt-Post-Processing, „Bypass status check“. Bei anderen Quellen deren Modell- und Endpoint-Felder, und der Reverse Proxy, wenn SillyTavern ihn mit dieser Quelle benutzt.
- **Generierungswerte, wie sie in Gebrauch sind** (aus `settings.json`, also auch ungespeicherte Preset-Änderungen; der Bericht nennt sie): Temperatur, Penalties, Kontext, max. Tokens, Reasoning, Prompts und Reihenfolge.
  - Mit `--preset repo` gilt stattdessen das Preset dieses Builds.
- **Persona-Name** und `extension_settings.avereth`.
- **Name und Begrüßung der Karte.** Die First Message v0.4 legt über ihre `Location`-Zeile die Startstadt fest.

**Nie übernommen** wird:
- `secrets.json`, Chats, andere Karten;
- das Proxy-Passwort (`proxy_password`);
- ein `reverse_proxy`, den SillyTavern mit der gewählten Quelle gar nicht benutzt;
- ein include-Header oder -Body, der nach Zugangsdaten aussieht (Authorization, Bearer, api_key, token …).

Eine URL mit Zugangsdaten (`user:pw@`, `?key=`) bricht den Import ab, ob `custom_url` oder `reverse_proxy`.

**`custom_url` oder `reverse_proxy`.** SillyTavern hat zwei getrennte Wege zu einem eigenen Endpoint, und welcher gilt, hängt nur von der Quelle ab (`public/scripts/openai.js` `proxySupportedSources`, `src/endpoints/backends/chat-completions.js`):

| Quelle | SillyTavern sendet an | Schlüssel | Runner |
|---|---|---|---|
| Custom (OpenAI-compatible) | `custom_url` (+ `/chat/completions`); ein gesetztes `reverse_proxy` wird nicht mitgeschickt und hat keine Wirkung | `secrets.json` `api_key_custom` | übernimmt `custom_url`; ein `reverse_proxy` des Profils bleibt draußen und wird als „ohne Wirkung“ genannt; Schlüssel aus der Umgebungsvariable als `api_key_custom` der Instanz |
| OpenAI, Claude, Mistral, Google AI Studio, Vertex AI, DeepSeek, xAI, Z.AI, Moonshot **mit** `reverse_proxy` | `reverse_proxy` | `proxy_password` aus den Einstellungen | übernimmt `reverse_proxy` und das Modell der Quelle; das Proxy-Passwort deines Profils nicht: die Instanz bekommt den Schlüssel aus der Umgebungsvariable als `proxy_password`; die Proxy-Warnung von SillyTavern („Connecting To Proxy“) bestätigt der Treiber für genau diese URL |
| dieselben **ohne** `reverse_proxy`, alle anderen | die eigene API der Quelle | `secrets.json` | übernimmt Modell- und Endpoint-Felder |

`--inspect` und `--check` vergleichen die Verbindung deines Profils mit der des Runners: Quelle, Weg, URL und Modell müssen gleich sein, und kein Header oder Body der Verbindung darf weggefallen sein; sonst ✖ mit den Unterschieden. Dein Profil bleibt dabei, wie es ist. Ob der Schlüssel in der Umgebungsvariable derselbe ist wie in deinem Profil, vergleicht der Runner nicht (er liest `secrets.json` und das Proxy-Passwort nie); ob der Endpoint ihn annimmt, zeigt `--ping`.

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
- Nach dem Lauf werden `secrets.json` der Instanz gelöscht, ein Proxy-Passwort in ihrer `settings.json` geleert und (ohne `--keep-profile`) die ganze Instanz gelöscht.

## 5. Browser-Treiber

Ein frischer Browser-Kontext ohne deine Anmeldungen und ohne deinen Speicher, mit englischer Oberfläche (`en-US`, wie die Engine spielt). Der Treiber macht nur, was ein Spieler macht:
- verbinden;
- die Karte öffnen (neuer Chat „Avereth Live <lauf-id>“);
- eine Nachricht eingeben und senden;
- warten;
- lesen.

Beim Start zwei Eigenheiten von SillyTavern 1.19:
- **Begrüßungsbildschirm.** SillyTavern öffnet beim Start einen Begrüßungsbildschirm (Assistent und System-Panel) und schreibt dessen Nachrichten nach einer Wartezeit in den gerade offenen Chat. Wird die Karte in diesem Moment gewählt, landen sie im neuen Kampagnen-Chat vor der Begrüßung der Karte, und die Engine startet dort keine Kampagne (im Stub-Selbsttest beim zweiten Lauf eines Prozesses beobachtet). Der Treiber wählt die Karte deshalb erst, wenn der Begrüßungsbildschirm stillsteht, und ersetzt einen Chat, der trotzdem die Nachricht eines anderen Sprechers enthält, durch einen frischen (`/newchat`). Startet die Engine an der Begrüßung trotzdem keine Kampagne, wird das mit Bildschirmfoto notiert; der Interceptor der Engine legt sie mit der ersten Spielernachricht an. Fehlt sie auch dann, endet der Lauf.
- **Proxy-Warnung.** Mit einem Reverse Proxy fragt SillyTavern einmal je URL „Connecting To Proxy“. Ein frischer Browser hat keine gespeicherte Antwort; der Treiber bestätigt sie für genau die URL deines Profils und vermerkt das.

Ein Zug ist zu Ende, wenn diese drei Bedingungen erfüllt sind:
- Die Generierung ist beendet.
- Die neueste Antwort ist vom Extraktor gelesen: Der HUD zeigt dann den gebuchten Stand.
- Die Seite blieb 1,5 s ruhig.

Abgebrochen und dokumentiert, mit Bildschirmfoto in `screens/`, wird bei:
- einem offenen Dialog;
- einer Nachricht, die nicht ankommt;
- keiner Antwort nach 20 s Ruhe;
- einer Zug-Zeit über `turnTimeoutSec` (Standard 900 s).

Es gibt kein stilles Wiederholen, keinen Swipe und kein Regenerieren.

**Ergebnis eines Zugs** (Patch 8.4.1, `evaluator.mjs turnOutcome`). Nach jedem Senden ordnet der Runner ein, was zurückkam:

| Ergebnis | bedeutet |
|---|---|
| `story` | eine Erzählerantwort mit Text |
| `system` | die System-Antwort auf einen Befehl (`#status`, `#assign` …): ein gültiger Zug ohne Erzähler |
| `engine` | die Antwort der Engine statt des Erzählers (Charaktererstellung, Rückfrage, Ablehnung) |
| `narrator_empty` | eine Erzählerantwort ohne Text (im ersten Livetest zweimal: GLM verbrauchte die 4.096 Tokens im Reasoning) |
| `missing` | gar keine Antwort |

Bei `narrator_empty` endet der Lauf kontrolliert (`narrator_empty`), mit Bildschirmfoto `screens/turn-NNN-narrator_empty.png`. Der Grund nennt finish_reason, Antwort-Tokens, max. Tokens und die Zeichen von Reasoning und Text des Erzähleraufrufs. Chat, Aufrufe und Auswertung bleiben vollständig erhalten. Bei `missing` endet er als UI-Fehler. Das Ausgabelimit des Erzählers bleibt, wie es im Profil steht.

**Hinweise (Toasts).** Jeder Hinweis trägt seine Herkunft: `runner`, wenn er während einer eigenen Aktion des Runners erscheint (das Umbenennen des Chats und 1,5 s danach), sonst `game`. Der Spieler sieht nur die des Spiels; die des Runners stehen im Bericht getrennt. Echte Warnungen von SillyTavern und der Engine bleiben Auffälligkeiten.

## 6. Spieler und Leitfäden

**Was der Spieler sieht.** Nur `view()`:
- den sichtbaren Text des Chats ab zwei Spielernachrichten zurück, wie die Seite ihn rendert, ohne die HUD-Panels;
- den HUD unter der neuesten Antwort einmal als eigenen Abschnitt („YOUR CHARACTER AND THE WORLD“), aufgeklappt, wie ein Spieler ihn aufklickt: HP, MP, STA, Werte, freie Statpunkte, Ausrüstung, Mitgeführtes, Münzen, Quests, Ort. SillyTavern stellt den Klassen im Nachrichten-HTML `custom-` voran; der Treiber sucht beide Namen. Steht unter dem HUD noch eine neuere Antwort ohne HUD (die System-Antwort auf einen Befehl, Patch 8.4.2), heißt der Abschnitt „the HUD of an EARLIER reply, NOT updated since: the System answer above is newer and what it says counts“;
- seine eigenen Nachrichten so, wie er sie schrieb (`mes` des Chats): SillyTavern zeigt `#assign …` sonst als Überschrift ohne `#`;
- die neuen Hinweise des Spiels (Toasts), nicht die des Runners.

Fold, Ereignisse und Records bekommt er nie. Einen eigenen Inventar- oder Zustandsspeicher führt der Runner nicht: Was der Spieler weiß, liest er Zug für Zug von der Seite. Den Bildschirmtext jedes Zugs speichert `player.jsonl`, nachprüfbar.

**LLM-Spieler.**
- Er ruft einen OpenAI-kompatiblen Endpoint direkt auf, nicht über SillyTavern. Seine Aufrufe stehen deshalb nur in `player.jsonl`, nicht zwischen den Spiel-Aufrufen.
- Standard ist dasselbe Modell wie das Spiel. Ein eigenes stellst du mit `player.url`, `player.model` und `player.keyEnv` ein.
- **Rolle** (Patch 8.4.1, `PLAYER_ROLE`, `PLAYER_COMMANDS`). Er ist die Spielfigur, nie der Erzähler. Seine Nachricht enthält nur:
  - was Alaric jetzt konkret tut („I cast Flame Lance at the closest skeleton.“);
  - was er zu jemandem sagt;
  - mehrere Handlungen nur, wo sie zusammengehören („I examine the doorway for traps. If I find nothing suspicious, I carefully open it.“);
  - einen System-Befehl, als eigene Nachricht.

  Nie darin: Gedanken, Gefühle, Beschreibungen von Ort oder Stimmung, Ergebnisse, Handlungen anderer Figuren, nicht bestätigte Dinge oder Erfolge, OOC-Bitten. Meist ein kurzer Satz.
- **Bedienkompetenz.** `PLAYER_MECHANICS` erklärt den Vorrang der neuesten Systemmeldung vor widersprechender Erzählung und einem älteren HUD. Ablehnungen führen zur Prüfung der genannten Voraussetzung, nicht zu endlosem Umformulieren. Konkrete Angebote, Besitz, tatsächliches Schlafen, Zielorte und Skill-Erwerb werden bestätigt; zusammengehörige Handlungen dürfen weiterhin kombiniert werden. Ein blockierter optionaler Kauf beendet nicht die Kampagne. Fehler bleiben in den Beobachtungen und Original-Logs sichtbar. Die Entscheidung wird unverändert gesendet; der Runner korrigiert keine Spielerhandlungen.
- **Befehle.** Freie Statpunkte nach einem Level-up verteilt er mit `#assign` (`#assign WIL 2 INT 2 VIT 1`) und prüft das Ergebnis an der System-Antwort oder am HUD. `#bag`, `#equipment`, `#status`, Quest- und Skillpanels sowie bei Bedarf `#audit` nutzt er gezielt bei Unsicherheit. Er benutzt bestätigte Gegenstände; Kauf und anschließende Benutzung dürfen kombiniert werden, wenn die Benutzung vom erfolgreichen Kauf abhängt.
- **Reasoning-Einstellungen** (`player.reasoning`):
  - `"profile"` (Standard): die Felder, die die Spiel-Requests deines Profils tragen. Das sind `reasoning_effort` des Presets (nur bei der Custom-Quelle, nicht `auto`) und die Reasoning-Felder aus `custom_include_body` (`reasoning_effort`, `clear_thinking`, `thinking`, `enable_thinking`, `reasoning`, `include_reasoning`, `chat_template_kwargs`). Sie gelten nur, wenn der Spieler denselben Endpoint und dasselbe Modell wie das Spiel nutzt. Mit einem anderen Modell werden sie nicht blind mitgeschickt.
  - `"none"`: keine.
  - ein Objekt: genau diese Felder.

  Andere Felder des Include-Body (z. B. `top_k`, Provider-Routing) und Zugangsdaten übernimmt der Spieler nie. Vor dem Lauf schickt der Runner einen kurzen Probe-Request („Reply with the single word OK.“, 300 Tokens) mit den Feldern. Lehnt der Endpoint sie ab (HTTP 400/422), spielt der Spieler ohne sie, und der Bericht sagt das. `--check --ping` zeigt dieselbe Probe.
- `player.extraBody` wird jedem Aufruf zusätzlich beigefügt (Vorrang vor `player.reasoning`).
- Sein Limit bleibt 3.000 Tokens (`player.maxTokens`).
- Antwort je Zug:
  ```json
  {"message": "…", "milestone": "<etappe>", "intent": "…", "stop": false, "stop_reason": null, "observations": "…"}
  ```
  `observations` sind höchstens zwei kurze Sätze über Neues, sonst `""`.
- **Fehlschläge** (je Versuch mit `strategy` und `cause` in `player.jsonl`). Höchstens drei Versuche je Zug:
  - `reasoning_exhausted`: Das Reasoning verbrauchte das ganze Budget ohne Antwort (`finish_reason: length`, kein Inhalt). Derselbe Request würde dasselbe tun. Der zweite Versuch nimmt deshalb einen kurzen Prompt (die zwei neuesten Nachrichten, HUD, Etappe, die letzten Notizen) mit Temperatur ≤ 0,4, der dritte einen minimalen (die neueste Nachricht und der HUD) mit ≤ 0,2.
  - `long_message`: eine Nachricht über 600 Zeichen Erzählung (Befehle ausgenommen). Sie wird einmal mit der Bitte um den Spielerzug allein nachgefragt.
  - `invalid_json`: mit der Fehlermeldung nachgefragt.
  - `http`: nach einer Wartezeit erneut.

  Nach drei Fehlschlägen endet der Lauf als Runner-Fehler. Der Grund nennt die Ursache, bei Reasoning-Erschöpfung ausdrücklich.
- **Notizen.** Die letzten sechs Züge stehen kurz da („4. you wrote: "…" — etappe: absicht — noted: …“), frühere nur als Etappen mit ihren Zügen. So wächst der Prompt nicht mit dem Lauf.
- Wortlaut, Fähigkeiten, Ziele und Taktik wählt der Spieler selbst. Ein Stil pro Lauf (`personas` des Leitfadens, über `--seed` wählbar) sorgt für Abwechslung: direkt und knapp, dialogorientiert, taktisch und experimentierfreudig, gelegentlich kombinierte Handlungen.
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
  - **`current_test`: natürliche Progression von Level 1 bis 15.** Keine Fixtures, feste Klasse, Questfolge oder vorgeschriebenen Kämpfe. `openRun.targetLevel: 15` und der Check `open_run_level` verlangen einen in gültigen Engine-Records erreichten Levelaufstieg. Das echte Spiel entscheidet über Fortschritt und Überleben. Gildenaufträge, Lootverkauf, sinnvolle Ausrüstung, Erholung und Skills bleiben freie Motivationen. Nach 100 tatsächlich gesendeten Eingaben wird ein Vergleichsstand erfasst, der den Lauf nicht beendet. Historische Guides mit `openRun.minTurns`/`open_run_duration` funktionieren weiter.
  - **`patch9d_fixture`: historischer expliziter Level-14-Rare-Klassen-Test**, beim Wechsel von `current_test` erhalten, damit die abgenommenen 9D-Regressionen unverändert ausführbar bleiben (`--guide patch9d_fixture --fixture 9d-rare --seed 7`). Diese Fixture nie für den offenen `current_test` verwenden;
  - `guild_dungeon_loop`: der Grundablauf;
  - `patch_8_dungeon_full` (Patch 8.4.2): die Abnahme einer vollständigen Living-Dungeon-Expedition auf Ebene 1, 60 Züge, elf Pflicht-Etappen (§7). Ein Vertrag außerhalb eines Dungeons zählt nicht; bietet das Board keinen Dungeon-Vertrag, liest der Spieler es am nächsten Morgen erneut und geht sonst ohne Vertrag in einen Dungeon;
  - `patch_8_4`: Gruppenreaktion und Cull-Zahl, mit eigenen Etappen (Patch 8.4.1): `numeric_cull_active` (ein Cull-Vertrag, der seine Zahl nennt; ein reiner Clear-Vertrag zählt nicht; bietet das Board keinen, liest der Spieler es am nächsten Morgen erneut: An einem späteren Tag füllt das Board die Lücken, die andere Abenteurer hinterlassen haben. Der Runner verändert dafür keinen Zustand), `inside_dungeon` (optional), `open_group_attack` (offener Angriff auf ein Mitglied einer Gruppe, die ihn nicht bemerkt hat), dann Kampf, READY und Abgabe.

**Aktueller natürlicher Langlauf:** `npm run live:st -- --guide current_test --headed` (ohne `--fixture`). Ziel ist das von der Engine bestätigte Level 15. Sicherheitsgrenzen: **1.000 Eingaben oder 1.440 Minuten**; Tod, echte technische Blockade und ein freiwilliger vorzeitiger Abbruch bleiben eigene Endgründe. Ein Limitabbruch ist keine erfolgreiche Level-15-Abnahme. Alte lokale `maxTurns`-Defaults verkürzen diesen offenen Guide nicht. Mit `--max-turns <n>` kann bewusst eine kleinere oder größere Eingabegrenze gewählt werden; ein kürzerer Lauf darf auch vor dem 100er-Vergleich enden. `report.md` nennt Ziel, tatsächliches Level, Grenzen und Vergleichsstand. `evaluation.json → progression.checkpoint` enthält nach Eingabe 100 Level, XP seit Levelaufstieg, Geld, HP/MP, Ort, Ausrüstung und Skills. Der Vergleichsstand verwendet die damaligen gültigen Records, keine späteren Fortschritte. Während einer laufenden Level-Kampagne prüft der Runner nur den aktuellen Erstellungs-, Lebens- und Levelzustand; die vollständige historische Auswertung wird beim Ende erstellt. Andere Guides behalten ihre bisherige Etappenprüfung. Das alte 9D-Fixture erfordert weiterhin ausdrücklich `patch9d_fixture`.

## 7. Auswertung

`evaluator.mjs` liest den Chat mit den Records der Engine. Der Spieler sieht davon nichts. Der Runner nutzt die Auswertung zwischen den Zügen nur zur Laufsteuerung:
- `done`: alle Pflicht-Etappen erreicht;
- `incomplete` (Patch 8.4.2): der Spieler meldet „done“, aber die Engine hat nicht alle Pflicht-Etappen gebucht; oder die letzte Pflicht-Etappe ist erreicht und alle offenen sind in diesem Lauf nicht durchführbar (dann werden keine Züge mehr gespielt). Der Spieler erfährt davon nichts; die Prüfung folgt seiner Entscheidung;
- `player_stop`: der Spieler bricht wegen eines Blockers ab;
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
| `numeric_cull_active` | ein Vertrag mit einem DEFEAT/ATTACK-Ziel mit Zahl wird `active` |
| `open_group_attack` | seine eigene Nachricht eröffnet einen Kampf gegen eine Gruppe, von der mindestens zwei ihn nicht bemerkt hatten, er war nicht verborgen, und niemand der Gruppe blieb draußen |

**Living-Dungeon-Expedition** (Patch 8.4.2, Leitfaden `patch_8_dungeon_full`). Jede Prüfung zählt nur, was die Engine für den **Ziel-Dungeon** gebucht hat: der Dungeon seines Dungeon-Vertrags, sonst der erste, den er betrat; die **Zielebene** ist die des Vertrags, sonst 1. Erzählte Gegner, ein Floor-Clear in Worten oder ein Feld-Cull zählen nie.

| Prüfung | erreicht, wenn | nicht durchgeführt, wenn |
|---|---|---|
| `guild_registered_fee` | registriert, und alle Registrierungszahlungen ergeben genau die Gebühr des Registrierungsangebots | — (eine Doppelzahlung meldet `registration_fee`) |
| `dungeon_quest_active` | ein Vertrag mit `dungeon` wird seiner | das Board, das er las, bot nie einen Dungeon-Vertrag |
| `dungeon_gate` | er steht auf Ebene ≥ 1 des Ziel-Dungeons; vor dem Eintritt höchstens eine Eintrittszahlung, und sie entspricht dem Gate-Angebot der Engine | — (`gate_fee`) |
| `dungeon_population` | eine Begegnung der Zielebene ist mit ihren Kreaturen gebucht (`dungeon.slot`) | — |
| `dungeon_group_fight` | ein Kampf mit zwei oder mehr Mitgliedern einer Begegnung der Engine, alle von Beginn an | auf der Zielebene traf er keine Begegnung mit zwei oder mehr |
| `dungeon_open_group_attack` | seine Nachricht eröffnet offen (nicht verborgen) einen Kampf gegen eine Begegnung der Engine, von der mindestens zwei ihn nicht bemerkt hatten; alle sind von Beginn an im Kampf, höchstens eine Eröffnung, jedes Mitglied handelt in einem eigenen Zug oder stirbt vorher | keine Begegnung der Zielebene, von der mindestens zwei als `unaware` gebucht sind (`aware` und nicht gebuchte Awareness zählen nicht als unaufmerksam; `unaware` bucht der Extraktor aus der Erzählung) |
| `dungeon_guardian` | `entity.status dead` des Wächters der Zielebene (Slot `guard` oder `boss`); das Monster steht als `entityId` dabei | — |
| `dungeon_floor_cleared` | `dungeon.cleared` der Zielebene mit seinem Verdienst (`credit: pc`) | — (`floor_cleared_by_others`) |
| `dungeon_quest_ready` | `quest.ready` seines Dungeon-Vertrags | kein Dungeon-Vertrag auf dem Board |
| `dungeon_quest_completed` | sein Dungeon-Vertrag `completed` in einer Gildenhalle, die Auszahlung gebucht und gleich der des Vertrags | kein Dungeon-Vertrag auf dem Board (`turn_in` meldet eine Abweichung) |

„Nicht durchgeführt“ ist kein Engine-Fehler und kein Bestehen: Die Etappe bleibt offen und steht im Bericht mit Grund. Den Sonderfall sichern die deterministischen Tests (`tests/v4/patch84.test.js`, `tests/live_runner/patch842_runner.test.js`).

**Kämpfe.** Für jeden Kampfbeginn hält die Auswertung fest:
- wer im Kampf ist;
- welche Gruppenmitglieder anwesend waren und draußen blieben, mit ihrer Awareness;
- ob er verborgen war (`scene.concealed`).

Gruppenmitglieder, die draußen bleiben, obwohl er nicht verborgen war, meldet sie als `group_stayed_out`. Am `.28`-Lauf (`tests/v4/live_1022b.json`) ist das dreimal der Fehler, den Patch 8.4 behebt.

**Auffälligkeiten:**
- leere Antwort (`empty_reply`);
- Statpunkte in Worten statt mit `#assign` (`stat_words`, zur Prüfung: hat die Erzählung sie als verteilt erzählt?);
- ein Gegner im Living Dungeon, den die Engine abwies (`dungeon_foe_refused`), oder eine Kreatur dort ohne Begegnung der Engine (`unslotted_dungeon_creature`, zur Prüfung);
- ein Cull-Vertrag, dessen Texte eine andere Zahl nennen als sein Ziel (`cull_count`);
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
- **Kurzfassung:** Ergebnis, Etappen, offene Pflicht-Etappen mit „nicht erreicht“ oder „nicht durchgeführt: Grund“, Charakter mit dem Regelstand der Kampagne (Patch 9A: 2 = Warrior, Mage, Rogue; 1 = Legacy), Ziel-Dungeon, Leitfaden, Spieler, Züge, Dauer, Auffälligkeiten, Profilschutz, Scan. Ein Blocker (`player_stop`), das Zuglimit (`limit`) und ein nicht durchführbares Ziel sind so voneinander zu unterscheiden.
- **Aufbau** mit der Verbindung deines SillyTavern und der des Laufs (dieselbe?) und dem Preflight (Modellliste, Modell enthalten?).
- **Laufzeit (gemessen):** Gesamtzeit, Einrichtung, Spiel- und Spielerzeit je Zug (Median, p90, max), Aufteilung laut Records, Hochrechnung auf 40 und 80 Züge.
- **Aufbau:** Build, Git-Commit und nicht committete Dateien, SillyTavern, Browser, Provider und Modell, Preset (Abweichungen von Build und Datei), Generierung, Streaming, Karte, Lorebook, Engine-Einstellungen, nicht Übernommenes, Kampagne und Seed.
- **Etappen** mit Zug und Nachricht.
- **Spielereingaben** mit Antwort (Erzähler, System, Engine, leer, keine), Absicht, Ort, HP/MP und Zug-Zeit, dazu die Beobachtungen des Spielers. Eine Beobachtung, die er vor Zug N notierte, betrifft das Ergebnis von Zug N−1 (den Bildschirm, auf dem er entschied); der Bericht schreibt „zu Zug N−1 (notiert vor Zug N)“, vor dem ersten Zug „zum Start“.
- **Spieler-Reasoning (wirksam)** im Aufbau: die Felder, die seine Requests tatsächlich trugen, ihre Herkunft, das Ergebnis der Probe und sein Tokenlimit; ohne Schlüssel und Header.
- Unter **Auffälligkeiten** zusätzlich: wiederholte Fehlschläge des Spielers nach Ursache (mit Zügen) und die Hinweise des Runners getrennt („dem Spieler nicht gezeigt“).
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
- Das Profil trägt wie das des ersten Livetests `custom_include_body` mit `clear_thinking` und `reasoning_effort`.
- Dann spielt er vier Läufe: mit dem LLM-Spieler (über den Stub), mit dem regelbasierten Spieler, über den Reverse-Proxy-Weg, und einen regelbasierten Lauf, dessen vierte Nachricht die Stub-Marke `[stub-empty]` trägt: Der Stub antwortet dem Erzähler darauf ohne Text mit `finish_reason: length`.

Geprüft wird:
- Fake-Profil und SillyTavern-Checkout bleiben unverändert.
- `secrets.json`, Chats und die fremde Karte werden nicht gelesen.
- Kein Köder erscheint im Laufordner.
- Der Stub-Schlüssel kommt nur über SillyTavern beim Provider an.
- Alle Exporte sind da, jeder Aufruf hat Rolle, Zeit, Modell und Tokens, der Erzähler bekommt Vertrag und Engine-Block ohne Streaming.
- Der Spieler sah nur Seitentext, den HUD als eigenen Abschnitt, keinen Hinweis des Runners; seine Beobachtungen gehören zum Zug davor.
- Die Requests des Spielers tragen dieselben Reasoning-Felder wie die des Spiels, der Bericht nennt sie; auf dem Proxy-Weg (Quelle `openai`) trägt er keine.
- `#status` ist ein System-Zug, kein leerer; die leere Erzählerantwort in Zug 4 beendet den Lauf (`narrator_empty`) ohne zweiten Erzähleraufruf, mit Grund, Bildschirmfoto und allen Exporten.
- Der Bericht kennzeichnet den Stub, der Scan ist sauber.
- Patch 9A: Die neue Kampagne spielt nach Regelstand 2, der Mage des Leitfadens (Flame Lance + Blink) bleibt gültig, der Bericht nennt beides.
- Es gibt keine Seiten- und keine Serverfehler.

Der Bericht eines Stub-Laufs trägt oben: **„STUB-SELBSTTEST — kein echter Livetest.“** Über das Verhalten der Engine oder eines Modells sagt er nichts.

Die Bausteine ohne SillyTavern testen `tests/live_runner/*.test.js`, Teil von `npm test`:
- Auswertung am `.28`-Lauf;
- Aufrufe aus einem Server-Log;
- Scan und Schreibschutz;
- Import an einem Fake-Profil, Verbindungsweg und Preflight;
- Spieler, Leitfäden, Optionen, Bericht;
- Patch 8.4.1 (`patch841_runner.test.js`): Spielerregeln, Reasoning-Felder und ihre Herkunft, Strategien bei Reasoning-Erschöpfung und langer Nachricht, Zug-Ergebnisse am ersten Livetest (`live_1022c.json`: Züge 17 und 18 leer) und am `.28`-Lauf (`#assign` als System-Zug), die neuen Prüfungen und Auffälligkeiten, `open_group_attack` am nachgespielten offenen Flame Lance, Herkunft der Hinweise, Bericht.

## 11. Grenzen

- **Spieler-Kosten.** Der LLM-Spieler kostet Tokens, standardmäßig beim selben Provider. Er läuft nie gleichzeitig mit einem Spiel-Aufruf, denn der Treiber wartet den Extraktor ab.
- **Andere Quelle als Custom.** Die Engine nimmt dann `generateRaw` ohne Metadaten in den Records. Mit `reverse_proxy` nimmt der LLM-Spieler dessen URL und das Modell der Quelle; ohne braucht er `player.url` und `player.model`.
- **Reverse Proxy.** SillyTavern schickt das Proxy-Passwort vom Browser im Request an seinen Server (so arbeitet SillyTavern selbst); in der isolierten Instanz ist das der Schlüssel aus der Umgebungsvariable. Er steht während des Laufs in der `settings.json` der Instanz und wird am Ende dort geleert und mit der Instanz gelöscht.
- **Karte und Lorebook** kommen aus diesem Build: Getestet wird der Build, nicht der Stand deines Profils. Abweichungen nennt der Bericht.
- **Streaming ist aus** (§4).
- **Kein Swipe, kein Regenerieren.** Diese Wege testet weiter `npm run smoke:st:c`. Eine leere Erzählerantwort beendet den Lauf (§5).
- **Spielerregeln.** Ob das Modell die Regeln für Länge und Rolle einhält, zeigt erst ein echter Lauf; der Runner fragt eine zu lange Nachricht nur einmal nach.
- **ST-Start.** SillyTavern baut pro Instanz sein Frontend neu (etwa 20–60 s beim Start).
- **Regelbasierter Spieler.** Seine `until`-Ausdrücke prüfen nur Text. Für einen echten Lauf ist der LLM-Spieler gedacht.

### Runner-Anpassung vom 26.10.2026

Grundlage waren die unveränderten Originalexporte der Runs `20261025-124809Z` (.87), `20261025-232041Z` (.91) und `20261026-012245Z` (.92), jeweils ZIP-CRC geprüft. Beispiele: .87 T83–89 behauptet einen nicht gebuchten Rüstungskauf; .91 T23–33 wiederholt die Lootübergabe und setzt eine nicht gebuchte Reise zur Herberge voraus; .92 T47–53 übernimmt erzählten Schlaf und ein Phantom-Board. Diese Fälle begründen Bedienhinweise, keine nachträgliche Umwertung tatsächlicher Enginefehler. In .92 lieferten zudem 32 Spieler-Versuche zunächst kein gültiges Entscheidungs-JSON; die kurze Erinnerung direkt nach dem Bildschirm verlangt daher ausdrücklich das Entscheidungsobjekt. Ob dies echte GLM-Antworten verbessert, muss ein neuer natürlicher Lauf zeigen.

Die vorhandene Progressionsanleitung wurde gekürzt und um den gemeinsamen Bedienabschnitt ergänzt. Spielerziele und Aktionen bleiben frei; der Runner erhält keine neuen Eingriffs- oder Spielrechte. Engine-Build **.93**, Regeln, XP, Preise, persönliche Karte und Testarchive bleiben unverändert. Technische Abnahme: neun neue Regressionen auf unveränderter .93 **acht rot/eine grüne Kontrolle**, danach **9/9**; gesamte Runner-Tests **106/106**, vollständiges `npm test` **1.823/1.823**. Echter SillyTavern-1.19-Runner-Selbsttest mit Stub-Provider **51/51**, einschließlich vier tatsächlicher Eingaben im neuen Level-Guide, korrektem Limitabbruch, gespeichertem Vergleichsstand und unverändertem Profil. Kein natürlicher GLM-Lauf und kein neuer `smoke:st:c` (Engine/Host unverändert). Der erste Runner-Selbsttest war **50/51**: eine historische Prüfung erwartete noch HP 80/80 statt des seit .91 korrekten HP 90/90. Sie vergleicht jetzt sichtbare HP mit dem verbuchten Stand. Die historischen Auswertungen aller drei Original-Runs sind mit ihrem bisherigen Guide unverändert; nur das additive Feld `progression` kommt hinzu. Die vollständige Spieler-Systemanweisung ohne Persona wurde von 8.693 auf 7.267 Zeichen gekürzt. Ob weniger JSON-Reparaturen oder Fehlversuche entstehen, ist noch nicht live nachgewiesen.
