# ST-Smoke in einer isolierten Sandbox

Ein Befehl für die bestehenden SillyTavern-Smokes (`tools/st_live/run_c.mjs`, Mockprovider, kein API-Schlüssel) in jeder neuen Arbeitsumgebung. Die SillyTavern-Installation liegt nie im Repository. Sie wird bei Bedarf in einem eigenen, markierten Verzeichnis neu aufgebaut.

```bash
cd avereth-engine
npm run smoke:st:check      # nur prüfen: Node, git, npm, Ports, Playwright/Chromium, Netz – installiert und startet nichts
npm run smoke:st:isolated   # Sandbox bei Bedarf anlegen, dann Standard- und Failsoft-Smoke
npm run smoke:st:clean      # Sandbox entfernen (nur eine markierte, nie während eines Laufs)
```

Einzeln: `node tools/st_live/isolated.mjs --mode standard|failsoft|base`. Andere Sandbox: `AVERETH_ST_SANDBOX=/abs/neuer/ordner` (neu, leer oder schon markiert).

## Voraussetzungen

| | Wert |
|---|---|
| SillyTavern | **1.19.0** (Tag, Commit `7e8663c`), aus `github.com/SillyTavern/SillyTavern`, `npm ci` im Sandbox-Checkout |
| Node.js | ≥ 20 (ST 1.19.0); geprüft mit Node 22 |
| git, npm | im Pfad |
| Playwright + Chromium | vorhandenes Playwright wird genutzt; fehlt es, installiert der Lauf `playwright@1.49.1` **in die Sandbox** und lädt Chromium (`playwright install chromium`) |
| Ports | 8123 (SillyTavern), 5001 (Mockprovider) frei |
| Netz | nur beim ersten Aufbau: github.com und npm-Registry (Playwright: dessen Browser-CDN) |

Die Engine ist immer der aktuelle Checkout: `run_c.mjs` kopiert `index.js`, `src/`, `content/` und `regex/` in die Extension der Sandbox.

## Ablauf

1. **Prüfung** (wie `smoke:st:check`): ein fehlender Baustein beendet den Lauf mit Meldung und Abhilfe (Exitcode 3). Ein belegter Port wird gemeldet, **kein Prozess wird beendet**.
2. **Sandbox:** Standard `<tmp>/avereth-st-sandbox` mit Markierungsdatei `.avereth-st-sandbox.json`, darunter `SillyTavern/` (geklont, Commit geprüft, `npm ci`).
3. **Erststart:** ST einmal auf Port 8123 gestartet, bis `data/default-user` angelegt ist, dann nur dieser eigene Kindprozess beendet.
4. **Browser:** Chromium-Startprobe; fehlen Systembibliotheken, Meldung mit `npx playwright install-deps chromium` (root).
5. **Smokes:** `run_c.mjs` je Modus mit Mockprovider:
   - **Standard:** alle Modulprüfungen (`AVERETH_SMOKE_FINANCE, SAVE_RECOVERY, FETCH, STEALTH, UI, CONTINUITY, BOARD159, QOL160, UI161, PULSE162, PULSE164, PULSE167, NPC169, NPC172, PILOT01`).
   - **Failsoft:** dieselben plus `AVERETH_SMOKE_FAILSOFT=1` (sichtbar nicht ausgeführter Planner, gespeicherter Fehlerrecord, terminaler Extractorfehler, keine doppelte Kampfbuchung, erkannter verschluckter Speicherfehler).
   - `base`: nur der Grundlauf (Kampf, Alias, Tippfehler, Weltnutzung, Swipe, Suche, Flächenangriff).
6. **Bericht.**

Ein erneuter Aufruf baut nichts neu auf, was schon da ist, und beginnt jeden Smoke mit einem frischen Testchat in der Sandbox.

## Ergebnisse

`<sandbox>/out/<Zeitstempel>/`:
- `report.md` und `report.json`: ST- und Engine-Version, Commit des Checkouts (mit Hinweis auf uncommittete Änderungen), Node und Chromium, je Modus Ergebnis, Prüfungen bestanden/gesamt, fehlgeschlagene Prüfungen, PageErrors, Dauer; bei Abbruch die Stufe (`preflight`, `install`, `st-start`, `browser`, `smoke`) mit Meldung; offene Punkte (natürliches Modellverhalten, andere ST-Versionen).
- `setup.log`: Klon, `npm ci`, Erststart, Browser.
- `<modus>/run.log`, `<modus>/result.json` und die Request-Mitschnitte von `run_c.mjs`.

Exitcode: 0 alle Smokes OK, 1 ein Smoke fehlgeschlagen, 2 `--check` nicht bereit, 3 Abbruch vor oder während des Aufbaus.

## Schutz des persönlichen SillyTavern

- Alle ST-Smoke-Skripte (`run_c`, `run_v4`, `run`, `setup`, `run_greeting`) prüfen vor jedem Dateizugriff `assertSandbox`: `AVERETH_ST_DIR` muss `<root>/SillyTavern` eines markierten Sandbox-Roots sein. Ein persönliches ST (ohne Markierung) wird abgelehnt, auch bei direktem Aufruf.
- Ein Sandbox-Root wird nur angenommen, wenn er neu, leer oder bereits markiert ist; nie das Dateisystem-Root, das Home-Verzeichnis, ein Verzeichnis oberhalb des Repositorys oder eine ST-Installation selbst.
- Gelöscht wird nur innerhalb des markierten Roots (Testchats durch `run_c.mjs`, `smoke:st:clean` den ganzen Root) und nie, solange ein Lauf ihn hält (`.lock` mit lebender PID).
- Fremde Prozesse werden nie beendet; belegte Ports stoppen den Lauf. Ein parallel laufender natürlicher Batch mit eigener ST-Installation bleibt unberührt, solange er nicht dieselben Ports 8123/5001 belegt; tut er das, verweigert der Smoke den Start.
- Nur ein Dummy-Schlüssel steht in der Sandbox-`secrets.json`; nichts aus der Sandbox gehört in Git.

## Ohne Netz oder Browser

- Ohne Netz und ohne vorhandene Sandbox: Abbruch in `preflight` (Netzprüfung) bzw. `install`, mit Logpfad. Eine schon installierte Sandbox braucht kein Netz.
- Ohne Chromium oder Systembibliotheken: Abbruch in `browser` mit dem Befehl zur Abhilfe; es wird kein bestandener Smoke berichtet.

## Belegter Lauf (13.11.2026)

Build `.186`, frischer Checkout (`249ac93`) ohne vorherige ST-Installation, Node 22.23.4, Chromium 153 aus der Umgebung:

| Prüfung | Ergebnis |
|---|---|
| Aufbau | Klon ST 1.19.0, Commit geprüft, `npm ci` (829 Pakete, ~11 s), Erststart legt `data/default-user` an |
| Standard (echter ST-Hostpfad) | **OK 224/224**, 0 PageErrors, 482 s |
| Failsoft | **OK 229/229**, 0 PageErrors, 485 s |
| Wiederholter Start (`--mode base`) | ohne Neuaufbau, **OK 25/25** in 39 s |
| Belegter Port 5001 | Abbruch in `preflight`, nichts beendet, keine Ausgabe angelegt |
| Persönliches ST, fremder Sandbox-Pfad, Bereinigung | `tests/unit/st_sandbox.test.js` 5/5: alle fünf Smoke-Skripte verweigern ein unmarkiertes ST, ohne eine Datei zu ändern; `--clean` verweigert einen fremden Ordner |

Nicht praktisch ausgelöst: fehlendes Netz, fehlendes Chromium und ein ST-Startfehler; diese Pfade sind als Meldungen implementiert, aber hier nicht provoziert worden.
