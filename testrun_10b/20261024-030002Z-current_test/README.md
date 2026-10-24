# 20261024-030002Z-current_test – Archivblatt

**Ausführliches Review:** [REVIEW.md](REVIEW.md)

**Originalexport:** 20261024-030002Z-current_test.zip  
**Größe:** 4.393.062 Bytes  
**SHA-256:** 10e86d8d77ea967918fb13cff8c1054ae1baccc6e77692bd1b83468da12b461c  
**Format:** ST Live-Runner ZIP mit Original-Chat, Engine-Events, LLM Calls, Spielerentscheidungen, Reports, Serverlogs und Screenshots. **Keine Filterung oder nachträgliche Veränderung** der Rohdaten.

**Archivstatus:** Die für den Gameplay-Review maßgeblichen Dateien sind als **entpackte, öffentlich verwendbare Schutzfassung** im selben Ordner committed: `avereth-events.json`, `calls.json`, `chat.jsonl`, `evaluation.json`, `player.jsonl`, `report.md`, `run.json`, beide `screens/` und die in Zeilenabschnitte geteilten `chat-completions`- und `server`-Logs. Details einschließlich Dateiliste, Rekonstruktionsanleitung und bewusst ausgeschlossener Konfigurationsdaten: [ARCHIVE_CONTENTS.md](ARCHIVE_CONTENTS.md) sowie [SANITIZATION.md](SANITIZATION.md).

**Original-ZIP nicht auf GitHub:** Das unveränderte Original bleibt bei der vom Nutzer bereitgestellten ZIP mit der oben genannten SHA-256. Die öffentlich eingecheckten Textdaten sind zum Schutz lokaler Benutzerpfade und E-Mail-Adressen leicht bereinigt. Die `import.json` (private ST-Konfiguration) und die redundante `server.timed.log` wurden nicht veröffentlicht.

Zur Prüfung der separat aufbewahrten Original-ZIP:

    Get-FileHash .\testrun_10b\20261024-030002Z-current_test\20261024-030002Z-current_test.zip -Algorithm SHA256

Der Hexwert muss mit der oben genannten SHA-256 übereinstimmen.

**Runbedingungen:** Build 4.3.0-c.6.6.57, Entwicklungs-SHA 3181c8112ec6, ST 1.19.0, GLM-5.3-Flash, natürlicher Ruleset-2-Mage, 26/100 Züge, 21:01 min; Ende durch tatsächlichen Charaktertod, Engine-Integrität OK, keine Fixture-Injektion.

**Befundstand:** Reproduktionskandidaten P0 (ungewollter Combat-Start aus Drohung), P1 (Reise-/GO-Semantik, Fernkampfrolle, Narrator-/Memory-Widerspruch), P2 (Novice-Escort-Risiko, Format-/Providerzeiten). **Noch keine Änderungen freigegeben.**
