# Avereth – natürliche OpenRouter-Helferläufe · Sammelphase

**Status: offene Testetappe.** In dieser Runde sammeln wir noch mehrere automatisierte Langläufe und **anschließend einen persönlichen Usertest**. Erst danach erfolgen eine gemeinsame, nach Häufigkeit und Spielrelevanz priorisierte Analyse und gegebenenfalls zusammenhängende Korrekturen. Kein vorschneller Patch wegen einzelner seltener Fehler.

## Bereits geprüfte ZIP-Exporte

| Originalname | Basis-Commit | Eingaben | Stand | Ergebnis |
|---|---|---:|---|---|
| `20261124-183634Z-natural_helper_progression.zip` | `a1361d73` | 6 | Level 1 | Bei Zug 5 Extractor-Reasoning ohne JSON; Zug 6 keine Antwort |
| `20261124-202907Z-natural_helper_progression.zip` | `099cd420` | 14 | Level 1 | Tod nach einem gefährlichen Solo-Kampf |
| `20261124-205854Z-natural_helper_progression.zip` | `1d3171d7` | 58 | Level 5 | Fortschritt, längere NPC-/Questreise, aber Extractor-Abbruch im Zug 58 |

**Provenienz:** Die drei vollständigen, vom Nutzer bereitgestellten Runner-ZIP-Dateien wurden unverändert gelesen. Der [Quellenmanifest](SOURCE_MANIFEST.json) hält Originalnamen, **SHA-256**, Bytezahlen, Quellcommits, Laufabbrüche und den Geheimnisscan des Runners fest. Jede ZIP enthält 13 Dateien: `chat.jsonl`, `chat-completions.jsonl`, `player.jsonl`, `server.log`, `server.timed.log`, `avereth-events.json`, `calls.json`, `evaluation.json`, `import.json`, `run.json`, `report.md` und zwei Screenshots.

**Wichtige Speichergrenze:** Die Binär-ZIPs lassen sich hier nicht über den GitHub-Textconnector direkt aus dem Chat übertragen. **Ihre Originalbytes sind daher noch nicht Teil dieses Dokumentationscommits.** Mit [`tools/maintenance/import_helper_runs.ps1`](../../tools/maintenance/import_helper_runs.ps1) können die unveränderten Originale nach SHA-Prüfung unter `originals/` nach `main` übertragen werden. Solange ein Original dort fehlt, ist nur der **Quellennachweis**, nicht das vollständige ZIP auf GitHub archiviert.

## Technische Vergleichbarkeit

- Alle drei Läufe verwenden den **gleichen .211-Engineversionstext**, aber **unterschiedliche Git-Commits, Modellparameter und Testattribute**. Sie sind **keine** kontrollierten A/B-Runs.
- Ab Lauf 2: OpenRouter `z-ai/glm-5.3-flash`, `wafer/us`, Reasoning `low`, ohne Provider-Fallback. Im ersten Lauf fehlte die feste Reasoning-/Providerkonfiguration.
- Nur Lauf 3: Alle sechs **Startattribute des automatischen Testspielers** wurden auf der isolierten Runner-Extension von fünf auf zehn verdoppelt; normale Spielregeln und persönliche Kampagnen bleiben unverändert. Die Kampf-Balance ist damit **nicht vergleichbar**.
- In den drei ZIPs meldet der Runner jeweils `secretHits: 0` und `protection.unchanged: true`. Das ist kein absoluter Geheimnis-Ausschluss; vor öffentlichem Push Originale selbst prüfen.

[Kurze Beobachtungen, ausdrücklich noch ohne Gesamtauswertung](BEOBACHTUNGEN.md) · [Meilensteinstatus](../../03_AKTUELLER_PROJEKTSTAND.md) · [Laufindex](../README.md).

## Fortsetzung

Für die kommenden Läufe **keinen neuen Codebranch** und keine erneute Pflege von `03`, `06` oder dem Forschungsindex. Original-ZIP und SHA/Commit pro Run sichern; auffällige Fälle als Beobachtung festhalten. **Nach mehreren weiteren Runs und dem persönlichen Spieltest** Bilanz über tatsächliche Wiederholungen, Root Causes, Produktintegrität und Spielgefühl ziehen.
