# Zyklus 2 lokal wiederholen

Die Skripte arbeiten auf Kopien oder lesen aus den gepinnten Checkouts. Es gibt keinen Modellclient für Featherless. Der Browsertest verwendet seinen eigenen lokalen Mockserver. Für die Vergleichsebenen getrennte Checkouts anlegen oder vorhandene Worktrees verwenden. Alle Pfade in absoluten Umgebungsvariablen setzen. Zusätzlich zu den drei Etappenständen werden das Forschungsarchiv auf main und die beiden eingefrorenen Referenzstände benötigt.

| Variable | Stand |
|---|---|
| `MAIN` | main einschließlich dieses Berichts und der historischen Originale |
| `REF` | `5e5b8272412b51b91f75b6e37c5b94d95c9fae11` |
| `SUITE` | `8df38d3fe4b62eafc2b746ada81e5f2470956dea` |
| `B1`, `B2`, `B3` | Drei gepinnte Etappencommits im [Gesamtbericht](../AVERETH_203_PERFORMANCE_ZYKLUS2_2026-11-19.md) |
| `ST` | SillyTavern 1.19.0 mit installierten Abhängigkeiten bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| `GLMPY`, `TOKENIZER`, `TEMPLATE` | Python mit tokenizers und Jinja2 sowie die beiden per SHA-256 geprüften GLM-Dateien |
| `AVERETH_ST_SANDBOX`, `AVERETH_CHROMIUM_EXECUTABLE` | Eine durch das Projekt markierte ST-Testinstallation und das Chromium-Programm |

Mit Node 24 und den existierenden ST-Live-Runner-Abhängigkeiten ausführen. Der gepinnte Tokenizer und das Chattemplate stammen aus [GLM-5.3-Flash](https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c).

```sh
work=$(mktemp -d)
mkdir "$work/raw"
tar -xzf "$MAIN/recherche/performance_natural_ab_203/laufdaten.tar.gz" -C "$work/raw"
cd "$MAIN/recherche/performance_cycle2_203"
node history.mjs "$B1" "$MAIN" "$work/history.json" "$work/raw" "$work/metadata.json"
"$GLMPY" cache.py "$work/history.json" "$work/raw" "$TOKENIZER" "$TEMPLATE" "$work/praefixe.json" "$work/metadata.json"
"$GLMPY" variants.py "$work/raw" "$TOKENIZER" "$TEMPLATE" "$work/variants.json"
node extract.mjs "$B1" "$B2" "$MAIN" "$work/raw" "$work/x-prompt.json"
node extract.mjs "$B2" "$B3" "$MAIN" "$work/raw" "$work/x-object.json" object
node board.mjs "$REF" "$SUITE" "$B1" "$B3" "$work/raw" "$work/board.json"
env -u FEATHERLESS_API_KEY node object_host.mjs "$B2" "$B3" "$work/raw" "$ST" "$work/host.json"
```

`object_host.mjs` startet zwei isolierte ST-Hosts nacheinander. Der Mock gibt für beide dieselbe ursprüngliche Antwort #30 aus und nur auf erneute Nachfrage #31. Der Test prüft die tatsächlichen Requests, Speicherung und Reload der Note aus dem vierten B-Zug sowie die gesamte Welt und die Fachereignisse. Die Ereigniszeit und das geprüfte Diagnoseflag für den entfallenen Repair sind beim Vergleich ausgenommen. Das Skript beendet den Browser und beide Server. Hostdaten liegen ausschließlich in einem neu angelegten temporären Verzeichnis.

Für die regulären Abnahmen im `avereth-engine`-Verzeichnis des entsprechenden Checkouts arbeiten. Die standardisierten ST-Smokes teilen feste lokale Ports. Sie nacheinander ausführen. Für den reinen Parserlauf und die Archiv-Replays sind Browser und Netzwerk entbehrlich.

```sh
node tools/board_slot_offline.mjs "$MAIN"
node tools/bench_extract_archive.mjs "$MAIN"
node tools/bench_extract_compact.mjs "$MAIN"
node "$MAIN/recherche/performance_suite_203/mixed.mjs" "$MAIN" "$B3" "$REF"
npm test
npm run replay:check
npm run smoke:st:check
npm run smoke:st:isolated -- --mode board_slot
npm run smoke:st:isolated -- --mode both
npm run smoke:st:isolated -- --mode narrator_streaming
```

`praefixe.json` enthält alle 274 Requestzeilen ohne Prompttexte. Historische Aufzeichnungslücken, fehlende Gebühren und fehlende Fingerprints werden über eigene Felder abgebildet. `messwerte.json` enthält die Kontrollmessungen, Replay-Ergebnisse und die beiden lokalen Browser-Fingerprints des Objektfalls. Laufzeiten einzelner lokaler Wiederholungen hängen vom Host ab. Beim Reproduzieren sind die Inputtokenzahlen, Requestanzahlen, Weltzustände und Ereignisse maßgeblich.
