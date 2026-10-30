# Auftrag an Claude – letzte Gegenprüfung des konsolidierten Architekturplans

**Erledigt am 30.10.2026.** [Original-Abschlussreview](05_CLAUDE_ABSCHLUSSREVIEW.md) archiviert und in den [finalen Fachplan](../PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md) eingearbeitet. Nachfolgend der historische Auftrag; keine erneute Prüfung daraus starten.

Repository: `Mango1331/Claude-AI-RPG-Game`. Produktbranch: `claude/c-planner-prototype-2026-10-02-gpt-c666`. Planbasis: `.126`, `b8d2af4`.

**Nur prüfen, noch nichts implementieren.** Prüfe zuerst beide aktuellen Git-HEADs. Lies `01` und `03` auf `main`, dann `patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md`. Die vier Reviewrunden liegen daneben in `architekturaudit_126/`; ziehe sie gezielt bei Widersprüchen hinzu. Wiederhole nicht das gesamte Architekturaudit.

Die Originaldateien aller 19 besprochenen Batches liegen jetzt auf `main`; Einstieg: `testrun_10b/ARCHIV_BATCHES.md`. TAR.XZ enthält die unveränderten Originaldateien, mit SHA-256 je Datei und dem ursprünglichen ZIP-Hash im Manifest. Nur die benötigten Batches laden, insbesondere 17–19 und konkrete ältere Sicherheitsfälle. Archivierung ist kein neuer Engine-Replaynachweis.

Wichtige Planungsgrundlagen: Alte Kampagnen müssen nicht weiter spielbar bleiben. Aktuelle Persistenz-, Geld-, Orts- und Kampfsicherheit bleibt verbindlich. Delivery/Escort ruhend erhalten; formale Privatquests bleiben abgeschafft. Bedingte Käufe, reguläre Enginepreise und natürliche Reiseunterbrechungen vorerst erhalten. Keine Balanceänderungen und kein neues universelles Framework.

Prüfe am tatsächlichen Code insbesondere:

1. **A/B:** Reicht die Verarbeitungstestbasis für den Variantenabbau? Bleiben fachliche Sicherheitsregressionen erhalten? Werden Foldfehler vor jeder neuen autoritativen Buchung erkannt? Ist der kleine Inkompatibilitätsschutz ausreichend, ohne eine Migrationsengine einzuführen?
2. **C:** Sind Population, Art, Altersgruppe, Level und Questcredit sauber getrennt? Ungültige Referenzen dürfen nicht automatisch unabhängig werden. Jungtiere dürfen keine Erwachsenenstärke übernehmen. Unabhängige Kreaturen, entfernte Sichtungen und echte Dungeons müssen weiterhin funktionieren.
3. **D:** Können Gearvorlage, Qualität und regulärer Preis über bestehende Angebote/Buchungen laufen? Sind Pakete, Preislimits und Zustimmung auch im selben Zug sicher? Verhindert der Ansatz den Batch18-Paketfall und das Namensprofilproblem tatsächlich?
4. **E/Abnahme:** Welche vermeintlich historischen Funktionen nutzt der aktuelle C-Pfad noch? Werden reine Umbauten und bewusste Verhaltensänderungen bei der Replay-Abnahme korrekt unterschieden? Wo fehlen Board-/Forge-Aufzeichnungen?

Überprüfe auch deine früheren Empfehlungen kritisch. Streiche Vorschläge ohne belegten praktischen Nutzen. Benenne nur konkrete Blocker oder notwendige Präzisierungen mit Datei/Funktion, möglichem Gegenfall und kleinstem Lösungsweg. Optionale Verbesserungen getrennt aufführen; keine neue vorsorgliche Review- oder Mikrofixserie.

Ergebnis: kurzes Urteil **„umsetzungsreif“, „mit folgenden Korrekturen umsetzungsreif“ oder „noch nicht umsetzungsreif“**, höchstens die wesentlichen priorisierten Befunde und eine bestätigte oder korrigierte Umsetzungsreihenfolge. Selbst ausgeführte Sonden klar von statischen Befunden trennen. Keine Produktänderungen oder Commits.

**Nachtrag 30.10.2026:** Abschnitt 11 des Fachplans berücksichtigt das zusätzliche GPT-Feedback. Bitte die präzisierte `population_at`-Semantik, individuelle Wiedererkennung ohne Populations-Merging und Foldschutz im Extraktor-Commit mitprüfen. Prioritäten bleiben bestehen; der natürliche Batch soll nach C/D nicht auf den größeren E-Abbau warten. Kein vollständiger Neustart deiner bereits laufenden Prüfung erforderlich.
