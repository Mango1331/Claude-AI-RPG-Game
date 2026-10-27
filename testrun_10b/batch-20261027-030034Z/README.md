# Erstes .100-Neunfach-Batch — sechs tatsächlich gestartete Kampagnen

- **Primäre fachliche Auswertung:** [REVIEW.md](REVIEW.md) — unabhängige Analyse aller sechs Kampagnen, Abbruchursachen, Original-LLM-Responses, Gilden-Killcounter, Szenenprobleme und getrennte technische Folgepakete.
- **Reproduktion und Quellbindung:** [BATCH_INDEX.json](BATCH_INDEX.json) — Maschinenindex mit Seeds, Abbrüchen und Fundstellen.
- **Originalquelle:** \`batch-20261027-030034Z.zip\` vom Nutzer bereitgestellt; **SHA-256 aebd2b67c353b3ed6c6a57887fff1d42885462af84e8262b6a97715db7a5fe3f**, 38.267.753 Bytes, 98 ZIP-Einträge einschließlich Verzeichnisse, ZIP-CRC vollständig bestanden.
- **Git-Produktstand:** \`cadd5315862a\` auf \`claude/c-planner-prototype-2026-10-02-gpt-c666\` (Build 4.3.0-c.6.6.100); alle sechs echten GLM-5.3-Flash-Läufe ohne Fixture oder Stub.
- **Zählweise:** 5 automatisch beendete Fehlerläufe (3 Extractor, 2 Narrator), 1 Nutzerabbruch während Run 6; drei Dungeonprofile ungestartet. Gesamt 232 Eingaben und 649 aufgezeichnete LLM-Aufrufe.
- **Batchkontroller:** Finale \`batch.json\` meldet \`status="interrupted"\`, 36 Stunden Zeitfenster, kein abgearbeitetes Neunfach-Batch. Der Wrapper klassifiziert Run 6 aufgrund des Exitcodes als \`process_error\`; maßgeblich ist der Original-Run mit \`recordedEnd=harness: interrupted (Ctrl+C) in turn 32\`.

## Originaldatei und Archivierungsstatus

Die Review und der Index sind **auf GitHub main abgelegt**. Die **38-MB-Original-ZIP ist noch nicht auf GitHub übertragen**: Die für diese Bearbeitung verfügbare GitHub-Schnittstelle erlaubt den textuellen Repository-Commit, aber keinen direkten Transfer der hochgeladenen Binärdatei aus der lokalen Analyseumgebung. Es wäre sachlich falsch, aus Review und Index auf ein bereits enthaltenes vollständiges Originalarchiv zu schließen.

**Vorgesehener ZIP-Pfad auf main:**
\`testrun_10b/batch-20261027-030034Z/batch-20261027-030034Z.zip\`

Zum Nachtragen aus der vorhandenen lokalen Original-ZIP, ohne die Produkt-Branchhistorie zu verändern, in einer **sauberen lokalen main-Arbeitskopie**:
\`\`\`powershell
Copy-Item "C:\PFAD\ZU\batch-20261027-030034Z.zip" "testrun_10b\batch-20261027-030034Z\batch-20261027-030034Z.zip"
(Get-FileHash "testrun_10b\batch-20261027-030034Z\batch-20261027-030034Z.zip" -Algorithm SHA256).Hash
git add "testrun_10b/batch-20261027-030034Z/batch-20261027-030034Z.zip"
git commit -m "Archive original first .100 nine-scenario batch (6 runs)"
git push origin main
\`\`\`
**Nur ausführen, wenn die Hashsumme mit der oben genannten SHA-256 übereinstimmt und die lokale main-Arbeitskopie zuvor aktualisiert wurde.** Änderungen am Entwicklungsbranch und ein automatischer Neustart des Batches sind nicht Teil dieser Auswertung.

## Navigationshilfe im Original-ZIP

Im obersten Ordner \`batch-20261027-030034Z/\` liegen \`batch.json\`, \`report.md\` und unter \`001-guild-warrior\` bis \`006-explore-rogue\` die jeweiligen Unterordner \`*-current_test\` mit:

- \`run.json\`: maßgeblicher echter Run-Abschluss, Quellenmodell, technische Metadaten, Inputanzahl.
- \`evaluation.json\`: Quest-, Encounter-, Level-, Rejection- und Auffälligkeitsaggregate.
- \`avereth-events.json\`: originaler nach Nachrichtenindex geordneter Engine-Ereignisstrom.
- \`chat-completions.jsonl\` und \`calls.json\`: Request-/Response-Evidenz, Tokenbudgets und Finish-Reason.
- \`chat.jsonl\` und \`player.jsonl\`: ST-Speicherung und unabhängige Spielerentscheidungen.
- \`report.md\` und \`screens/\`: automatische Einzelberichte und End-/Fehlerscreenshots.

**Dieses Verzeichnis ist ein Beobachtungs- und Analyseartefakt. Es implementiert keine Patches und behauptet keine vollständige Neunfach-Abnahme.**
