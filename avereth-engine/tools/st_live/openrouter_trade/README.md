# OpenRouter-Handelsvergleich für Avereth .203

Der natürliche Lauf vom 20.11.2026 endete mit unbekanntem Remoteabschluss von Request 9. Sein Journal bleibt gesperrt. Die gespeicherten Versuchsdaten, der im Lauf verwendete Treiber und die bereinigten ST-Logs liegen im Forschungsarchiv auf main unter `recherche/openrouter_handel_203/`. Der hier eingecheckte Treiber enthält die anschließend offline geprüfte Beobachterkorrektur. Der Proxy passt ausschließlich die im Bericht nachgewiesene leere doppelte Stop-Choice des Usage-Pakets für den ST-Client an. Die Prüfung und Abrechnung des Upstreamabschlusses verwendet den Originalstrom.

## Offline reproduzieren

Voraussetzungen sind Node 24, Playwright/Chromium und die npm-Abhängigkeiten von ST 1.19.0. Die Shellvariablen A und B bezeichnen die zwei sauberen Engine-Checkouts, ST den Programmcheckout. Pins und Eingabeartefakte stehen im Fachbericht. Der Tokenvergleich verwendet Python mit tokenizers und jinja2. Beide Tokenizerdateien werden gegen ihre dokumentierten SHA-256 geprüft.

```sh
mkdir -p "$OUT"
tar -xzf "$ARCHIV" -C "$OUT"
node audit.mjs "$OUT" "$A" "$B"
node partial.mjs "$OUT" "$A" "$B"
python tokens.py "$OUT" "$GLM_TOKENIZER" "$GLM_TEMPLATE"
python -m unittest test_stream_usage
env -u OPENROUTER_API_KEY -u FEATHERLESS_API_KEY node offline_replay.mjs "$OUT" "$A" "$B" "$ST"
```

Die letzte Befehlszeile erzeugt ausschließlich lokale Modellantworten. Sie verwendet die aufgezeichnete sichtbare Prosa von Request 4, einen geskripteten Planner und ein geskriptetes Angebot für den Extractor. Sie startet beide echten ST-Hosts und misst die Freigabe erst nach bestätigtem Weltjob und Read-back. Der ausgegebene neue Laufordner enthält beide Spielstände. Mit `node offline_audit.mjs "$LOKALER_LAUFORDNER" "$A" "$B"` werden die endgültigen P-/X-Arrays und ein ausdrücklicher Kaufversuch auf Kopien der Welt geprüft. Die Hashes der mit einem Platzhalter versehenen Modellarrays müssen je Rolle übereinstimmen.

## Natürlicher Versuchsaufbau

Für eine getrennt freigegebene künftige Untersuchung zuerst die veröffentlichte Endpointliste unter `https://openrouter.ai/api/v1/models/z-ai/glm-5.3-flash/endpoints` und die kanonische Modell-ID prüfen. Die Datei `route.json` enthält den ausgewählten Endpoint-Datensatz mit zusätzlichem Feld `canonical_slug`. Die Route ist auf Wafer US, höchstens 0,042 bzw. 0,184 USD pro Million Input-/Outputtokens festgelegt. Beide Ports teilen Zähler, Lock und Budget. Vor Versand reserviert der Proxy den maximalen Kontext zum Promptpreis plus das vollständige Outputlimit zum Completionpreis. Eine Antwort ohne verwertbaren Kostennachweis behält ihre Reservierung.

Für den Neustart bleibt das alte Journal gesperrt. Maximal 51 neue Generierungen und 0,453434876 USD stehen zur Verfügung. Die verbuchten 0,001771268 USD und die alte Reserve werden berücksichtigt. Bei höherer Nachbuchung für Nr. 9 sinkt der Betrag. Der Proxy liest den Abschlussbeleg aus dem frischen Laufverzeichnis.

Die neue Umgebung enthält die aktualisierte `route.json` und die zwei archivierten Seeds. `AVERETH_AB_DIR` bezeichnet ausschließlich dieses frische Verzeichnis. `AVERETH_REF`, `AVERETH_SUITE`, `AVERETH_MAIN` und `AVERETH_ST_DIR` bezeichnen die geprüften Checkouts. Vor jedem neuen natürlichen Lauf müssen Modell und Route, Budget und Freigabe für diesen Lauf feststehen. Die beiden Schlüssel gehören nicht in die Browser- oder ST-Prozesse.

```sh
python -m unittest test_stream_usage test_restart
python restart_budget.py "$OLD_GENERATION_ID"
python proxy.py
# In einer zweiten Shell mit demselben Laufverzeichnis:
env -u OPENROUTER_API_KEY -u FEATHERLESS_API_KEY node setup.mjs
```

Die erste Providerabfrage liest die Abrechnungsdaten der angegebenen Generation. Sie prüft die Zuordnung anhand von Startzeit, Anbieter, Modell, Streaming und Promptlänge des tatsächlich zuvor gesendeten Narratorrequests. Der natürliche Runner initialisiert die Hosts und spielt den vollständigen A-Canary in einer separaten Chatdatei. Das Gate prüft die Reihenfolge der physischen Rollen, den nativen Stream, das angewandte Extraktionsergebnis, Weltcommit, bestätigtes Speichern, die neu geladene Welt und die Verfügbarkeit der Eingabe. Erst danach beginnt das erste der sechs geplanten Handelspaare. Canarydaten liegen in `canary.json`, Paardaten in `turns.json`. Eine fehlgeschlagene Klassifikation im physischen Journal sperrt den Transport auch bei einem Neustart. Die frühere Diagnose `probe.py` wird nicht erneut ausgeführt.
