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

Der Schlüssel gehört ausschließlich in die Umgebung des Transportprozesses. Die ST- und Browserprozesse erhalten beide Providerschlüssel entzogen. Der bestehende Live-Runner benötigt die Ports 18541/18542 für die Hosts und 18551/18552 für den einen Proxy. In einen eigenen Laufordner gehören die geprüfte Route und die beiden archivierten Chatseeds. `AVERETH_AB_DIR` zeigt auf diesen Ordner, `AVERETH_REF`, `AVERETH_SUITE`, `AVERETH_ST_DIR` und `AVERETH_MAIN` auf die Checkouts. `OPENROUTER_MODEL` und `OPENROUTER_API_BASE_URL` müssen den exakten Werten des Forschungsberichts entsprechen.

`python proxy.py` bindet beide Loopbackports. `env -u OPENROUTER_API_KEY -u FEATHERLESS_API_KEY node setup.mjs` startet die isolierten Hosts und führt die beiden echten ST-Vorprüfungen durch. Nach geprüfter Anbieter-, Abschluss- und Budgetbestätigung gibt die Datei `main.ready` die sechs geplanten Paare frei. Die Anfangswelten werden je Versuch in eigene Chatdateien kopiert. Das Schreiben von `preflight.json` setzt übereinstimmenden sichtbaren Modelltext im ST-Client und im Transportjournal voraus. `probe.py` war die einzeln gezählte zusätzliche Streamformatdiagnose vor der Adapterprüfung. Sie gehört nicht zur Spielserie. Ein unbekanntes Ende beendet den gesamten Versuch. Das Archiv dieses Laufs ist ausschließlich zur Offlineauswertung bestimmt.
