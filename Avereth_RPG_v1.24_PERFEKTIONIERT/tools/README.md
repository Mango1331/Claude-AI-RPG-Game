# Werkzeuge: Build und Validierung (Avereth RPG v1.24)

Die Werkzeuge erzeugen die `*_PERFEKTIONIERT`-Dateien reproduzierbar aus den unveränderten Originalen
(`Avereth_RPG_Test_Baseline_v1.23.zip` im Repository-Root) und prüfen das Ergebnis. Die Werkzeuge selbst werden in
SillyTavern **nicht** gebraucht. Sie dokumentieren nur, wie jede Änderung entstanden ist, und machen sie nachprüfbar.

## Voraussetzungen
- Python ≥ 3.8 (nur Standardbibliothek)
- Node.js ≥ 18 (nur für Validierung; keine npm-Pakete)

## Ausführen (im Ordner `Avereth_RPG_v1.24_PERFEKTIONIERT/`)
```bash
python3 tools/build/main.py         # patcht die Quellen, kompiliert WorldInfo + DEBUG_CALC, schreibt die *_PERFEKTIONIERT-Dateien
python3 tools/validate/validate.py  # 79 Prüfungen inkl. Regex-Tests und Aktivierungssimulation (Exit-Code 1 bei Fehler)
node tools/validate/phrase_probe.js # optional: Vergleich alt/neu, welche Formulierungen START laden
```
Beim ersten Lauf wird das Baseline-ZIP nach `tools/baseline/` entpackt (per `.gitignore` ausgeschlossen). Die Originale
werden nie verändert. Der Build ist deterministisch: gleiche Eingabe ergibt byte-identische Ausgabe.

Umgebungsvariablen (optional):

| Variable | Bedeutung | Standard |
|---|---|---|
| `AVERETH_BASELINE_ZIP` | Pfad zum Baseline-ZIP | `../Avereth_RPG_Test_Baseline_v1.23.zip` |
| `AVERETH_BASELINE_DIR` | bereits entpackte Originale | `tools/baseline/` |
| `AVERETH_OUT_DIR` | Zielordner der perfektionierten Dateien | dieser Ordner |

## Aufbau
| Datei | Aufgabe |
|---|---|
| `build/lib.py` | Laden/Schreiben (gleiche Serialisierung wie die Originale: 2er-Einrückung, UTF-8, kein Zeilenumbruch am Ende), `replace_once` (jede Textänderung muss genau einmal passen, sonst Abbruch), Feldreihenfolgen und Vorlagenfelder |
| `build/patch_sources.py` | alle inhaltlichen Quellpatches (Core, Content, System, Character Description) als exakte Ersetzungen |
| `build/content_model.py` | liest die Klassen, Skills, Starter-Kits und Monster-Anker aus Content, rendert die kompakte Aktionstabelle und prüft sie im Rückweg Feld für Feld (247 Felder) gegen Content |
| `build/texts.py` | Laufzeittexte (Kernel, START, PENDING, ACTIVE, Creation, DEBUG_CALC-Zusatz) |
| `build/triggers.py` | alle Regex-Schlüssel (JSON-fertig, SillyTavern-kompatibel) |
| `build/main.py` | Ablauf: Quellen patchen → WorldInfo kompilieren → Metadaten → DEBUG_CALC-Variante → schreiben |
| `validate/st_core.js` | Nachbau der SillyTavern-Matching-Logik (`world-info.js`: Scan-Puffer, `matchKeys`, `parseRegexFromString`, Inclusion Groups, Budget) |
| `validate/regex_tests.js` | 234 Einzeltests für die Regex-Schlüssel |
| `validate/scenarios.js`, `validate/simulate.js` | 30 Chat-Szenarien, alte gegen neue WorldInfo |
| `validate/validate.py` | Gesamtprüfung (Struktur, IDs, Typen, Referenzen, Inhaltserhalt, Zahlen-Fixtures, Simulation) |
| `validation/*.json` | Berichte des letzten Laufs (`validation_report.json`, `simulation_result.json`, `fixtures_L1.json`, `removed_lines.json`, `build_report.json`, `regex_keys.json`) |
