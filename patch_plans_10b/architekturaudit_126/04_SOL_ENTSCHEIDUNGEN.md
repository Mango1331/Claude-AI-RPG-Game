# Sol – abschließende Bewertung und Designempfehlungen

**30.10.2026 · Bezugsstand .126 / b8d2af4.** Aus der anschließenden Chatbewertung zusammengefasst; kein weiterer unabhängig ausgeführter Audit und keine Implementierung. Die drei beigefügten Reviewdateien bleiben unverändert. Die Freigabe des Nutzers betrifft jetzt die konsolidierte Planung und Veröffentlichung, nicht die Produktumsetzung.

## Festgezogene Planungsgrundlagen

1. Der Nutzer erlaubt die Veröffentlichung sämtlicher besprochener Batchdateien. Zugangsdaten dürfen nicht veröffentlicht werden. Große Originaldateien können verlustfrei anders komprimiert werden; Originaldateibytes, Herkunft und Prüfsummen müssen nachvollziehbar bleiben.
2. Alte Kampagnen sind keine Kompatibilitätsgrenze. Alte Runs bleiben Belege. Aktuelle Save-/Reload-/Swipe-Sicherheit bleibt Pflicht; keine Migration historischer Spielstände als Nebenprojekt.
3. Delivery/Escort bleiben vorerst ruhend erhalten. Keine neuen automatischen Angebote, kein Ausbau und keine Entfernung gemeinsam genutzter Übergabe-/Begleitfunktionen.
4. Bei tatsächlich inkompatiblem Kampagnenprotokoll neue Buchungen sperren, nicht nur warnen. Die Kennung ändert sich nicht bei jedem Build. Laufende Batches auf ihrem Build beenden.
5. Populationszuordnung zunächst strukturiert prüfen und auffällige Artzuordnungen diagnostizieren. Kein neues allgemeines Textveto. Eine gültige ID ist kein Beweis semantisch richtiger Modellinterpretation.
6. Bedingte Käufe erhalten, reguläre Enginepreise beibehalten, zusätzliche Kaufbestätigung nicht generell erzwingen. Feilschen wird nicht neu eingeführt.
7. Reiseunterbrechungen durch den Narrator und mehrere chronologische Szenen bleiben vorerst erlaubt. Eine Einschränkung wäre erst bei nachgewiesenem Vereinfachungsgewinn neu zu entscheiden.

## Drei Korrekturen am zweiten Claude-Review

- **Ungültige Population nicht zu independent umdeuten.** Unabhängigkeit muss ausdrücklich gewählt sein. Fehler lokal reparieren oder das betroffene Kreaturen-Delta samt tatsächlich abhängigen Wirkungen ablehnen; unabhängige gültige Weltvorgänge dürfen weiterlaufen. Keine Rückkehr zum Namensfallback.
- **Art und Erwachsenenlevel trennen.** Jungtier einer Population bedeutet nicht automatisch Erwachsenenstärke oder Erwachsenen-Jagdcredit. Explizite individuelle/Dungeon-/Jungtierpopulationsvorgaben erhalten, keine neue Alterssimulation.
- **Abweichung 0 passend definieren.** Reine Refactorings müssen dieselben fachlichen Events erzeugen. Neue Diagnosefelder und beschlossene Regeländerungen dürfen ausdrücklich begründete Unterschiede haben. Fehlende Board-/Forge-Daten bleiben ausgewiesene Korpuslücken, keine angebliche Vollabdeckung.

## Bewertung

Der überarbeitete Fahrplan ist tragfähig. Absicherung und begrenzter Variantenabbau gehören vor die beiden Fachänderungen Kreaturen/Jagd und Angebotserzeugung. Größerer Legacy-Abbau darf deren Fortschritt nicht blockieren. Keine pauschale Reise-Neuarchitektur, keine neuen Kill-Credit-Events und kein allgemeines WorldTxn als Selbstzweck.

Die vollständige, maßgebliche Planung steht im [konsolidierten Fachplan](../PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). Dieser Text dokumentiert die vierte Feedbackrunde, nicht einen zusätzlichen Implementierungsauftrag.
