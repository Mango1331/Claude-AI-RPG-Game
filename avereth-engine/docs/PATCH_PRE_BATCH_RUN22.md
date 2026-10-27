# Vorbatch-Fachpaket — Build 4.3.0-c.6.6.99

27.10.2026. Basis: Produkt `.98` (`c1ed54b`), Entwicklungs-HEAD `37c4be9` einschließlich unverändertem Batchrunner. Grundlage: [Ursachenanalyse und Fachplan auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md) sowie das zusätzliche GPT-Feedback vom 27.10. Originalreviews und Archive bleiben unverändert.

## Übernommenes Gegenfeedback

Alle vier Ergänzungen sind fachlich berechtigt und übernommen:

1. **Expected-Ankunft ist zeitlich einzuordnen.** Der bisher vorgezogene Fallback darf kein früheres Geschenk oder Gespräch an den Zielort versetzen. Die Regression deckt sowohl Expected-only als auch eine explizite erste Reiseetappe mit späterer Expected-only-Ankunft ab.
2. **`here` heilt keine unklare Chronologie.** Unannotierte lokale Vorgänge vor späterer Ankunft und mehrdeutige lokale Aussagen nach verworfener Ankunft werden abgewiesen. Konkrete frühere Szenen und unabhängige Ortsauskünfte bleiben verarbeitbar.
3. **Ein gemeinsames Wort ist keine Kaufidentität.** Kaufzuordnung verwendet eindeutige Produktmerkmale/Lines, Mengen und Gegenpartei. „Skill Stone“ akzeptiert keinen „Return Stone“; verschiedene Zimmerleistungen bleiben verschiedene Wünsche. Mehrere passende Anbieter erfordern eine Auswahl.
4. **Keine generische Zimmererlaubnis aus Bezahlung.** Aktuelle Unterkunftsangebote besitzen keine verlässliche genaue Raumidentität. Daher genügt in Ruleset 2 auch eine frische Zahlung nicht für einen beliebigen Nebenraum: Ohne eindeutige bestehende Bindung wird ein ausdrücklicher GO benötigt. Die historischen Rule-1-Regeln bleiben erhalten. Ein neues Zimmerrechte-System wurde nicht eingeführt.

## Umsetzung

### I. Handel und Verfügbarkeit

`trade.js:bookPurchase` liest das aktuelle Angebot erneut, prüft Status, aktuelle Auswahl/Menge/Preis, Limit, Geld, Verkäufer-/Ortsverfügbarkeit und Produkt-/Trainingsvoraussetzungen vor dem ersten Buchungsevent. Geld, Ware/Dienste und Angebotsabschluss werden gemeinsam synchron gebucht. Commands und World benutzen diese Grenze; doppelte mechanische Kaufprüfungen im Commandhandler wurden entfernt. Sprachliche Zustimmung, Kauf-/Verkaufsrichtung und besondere Anmeldung/Gate-Folgen bleiben an ihren bestehenden Fachstellen.

`purchaseLines`, `samePurchaseRequest` und `purchaseDecisionMatches` begrenzen die Zuordnung von Ware und Zustimmung. Die jüngste deckungsgleiche Kaufentscheidung verdrängt ihre Vorgänger vor dem Vergleich mit Preis/Geld. Das gilt auch, wenn ein direkter `buy` über den bestehenden Trade-Verbund zur Angebotsannahme wird. Keine Rückkehr zur alten höheren Preisgrenze. Manuelle Annahme schließt nur passende Wünsche, keine unbeteiligten Schwert- oder Zimmerbestellungen.

`offerAvailability` wird von Anzeige, Planner-Katalog, Kaufvorauswahl und Buchung verwendet. Manuals benötigen ihren konkret gebundenen anwesenden Clerk. Nicht verfügbare Offerten werden nicht als aktuelle SHOP-Aktionen angeboten; beim Wiederauftreten des Anbieters kann die Anzeige wieder reagieren. Der gespeicherte Bestand bleibt erhalten. Neuer kanonischer Bestand unter derselben stabilen Offer-ID ist mit neuer Zustimmung weiter kaufbar — keine globale „ID jemals verbraucht“-Sperre.

**Original Run 22 i112:** 50 → **44** statt 38 cp; eine Transaktion und ein Unterkunftsdienst. Der jüngere 4-cp-Grenzfall zahlt statt der früheren 6 cp nichts. Historische Doppelzahlungen werden nicht nachträglich erstattet.

### II. Ausführung, Ankunft und Extraktion

Nach einem noch ungelösten GO werden unmittelbare ortsgebundene Folgeaktionen wie Suche, Warten/Schlaf, Kauf oder Angebotsannahme in Ruleset 2 nicht am Ausgangsort ausgeführt. Das gilt auch ohne Planner-`needs`. Vorhandene bedingte GIVE-/Guild-Pfade bleiben bestehen. Wo kein vorhandener sicherer Nach-Ankunft-Pfad existiert, meldet die Engine die Folgehandlung ausdrücklich als nicht ausgeführt; nach bestätigter Ankunft muss sie erneut gewählt werden. Kein allgemeiner verzögerter Kommandointerpreter.

Der Expected-Ankunfts-Fallback verwendet die bestehende Ankunftslogik an der zeitlichen Szenengrenze beziehungsweise nach ausdrücklich früheren Vorgängen. Eine zusätzliche Expected-Etappe nach expliziter erster Ankunft wird ebenfalls nicht mehr vor die dortige Interaktion gezogen. Rule-1-Verhalten bleibt erhalten.

`extract.js:sceneIssues` liefert die lokalen Chronologiediagnosen für Repair und World. JSON-/Schema-, Typ- und Referenzfehler bleiben hart. Eine strukturell gültige Antwort mit lokal abweisbaren Szenenbehauptungen kann nach dem einen bestehenden Repair verarbeitet werden; eine schlechtere/ungültige Reparatur ersetzt die verwendbare Erstfassung nicht. Es wird **eine Fassung gewählt**, nie aus mehreren Antworten ein Ergebnis zusammengemischt. Keine neuen Modellaufrufe oder Recovery-Budgets.

World prüft jeden Vorgang weiter am tatsächlich erreichten Zustand. Fehlende frühere Szene, vorgezogene lokale Einführung oder mehrdeutiges `here` erzeugen `delta.rejected`; die bisherigen Geberpräsenz-, Inventar-, Quest-/Abhängigkeits- und Autoritätsregeln gelten weiter. Ein Szenenlabel erzeugt keine Reise. Tatsächlich erreichte Zwischenhalte einer autorisierten Reise benutzen vorhandene `arrive`-Deltas; die 60-Minuten-Transitgrenze bleibt unverändert.

Der Extractor bekommt statusgetreue Aktionshinweise statt der pauschalen Behauptung „already booked“ sowie die Unterscheidung zwischen Endankunft und wirklichem Zwischenhalt.

**Original T73 / Calls 202–203:** über die echte Runtime aus dem archivierten Chat geprüft. Keine Markt-/Nebenraumreise, keine fremden lokalen Shopbuchungen, unabhängige Ortsberichte erhalten; genau ein Extractor-Commit, auch nach Reload beziehungsweise alternativer Swipe-Verarbeitung. Die Originaltexte dürfen erzählerisch weiterhin falsch sein; sie erhalten keine mechanische Autorität.

### III. Gildenboard

Die Intro-Eignung wird aus derselben HP-/ATK-Prüfung abgeleitet, die der Habitatvalidator verwendet. Der Prompt nennt die daraus berechneten geeigneten Anchor-IDs. Keine zweite Monstertabelle und keine numerische Lockerung.

Der bestehende einmalige Repair erhält globale Fehler und individuelle Titel/Ablehnungsgründe gemeinsam, auch wenn ein globaler Introfehler vorliegt. Ungültige Boards bleiben ungebucht. 4+1/5+0, Habitatbindung, Dungeonjagd gegenüber Räumung, Legacy und gespeicherte Lieferverträge bleiben erhalten. Nicht jede ursprünglich falsche Generatorantwort wird nun akzeptiert: Geändert werden Generierungsinformation und Repairdiagnose.

## Regressionen und Kompatibilität

`tests/v4/patch_prebatch99.test.js`: **28 neue Fälle**. Das Run-22-Fixture enthält die unveränderten ausgewählten Antworten/Zustände und eine für die Runtime auf benötigte Nachrichten-/Recordfelder reduzierte Original-Chatkette. Renderkopien und redundante Telemetrie fehlen; persistierte Events und Spieler-/Narratortexte wurden nicht umgeschrieben. Quelle: Original-ZIP SHA-256 `a7a8494e204ed9dae30b2f8d9bddd269b31a8e30a2c75478f8a2f1486193735f`.

Auf bytegenau wiederhergestelltem `.98`/`37c4be9`: **21 rot, sieben grüne Kontrollen**. Danach **28/28 grün**. Die Fälle umfassen ursprüngliche Doppelzahlung, engere Zustimmung, unterschiedliche Waren/Dienste, aktuelle Verfügbarkeit, erneuerten Bestand, fehlende Lines, GO-Abhängigkeiten, alte/frische Unterkunft, Originalextraktionen, harte Formfehler, Expected-Chronologie, echte Stopps, Boarddiagnosen, Replay/Reload und Swipe.

Vorhandene Tests zu Run 14/16/20 sichern die früheren Szenenverbote jetzt zusätzlich an der World-Grenze statt ausschließlich über `parse.valid=false`. Nach einer offenen Reise wird in Ruleset 2 kein Schlaf vorweg gebucht; entsprechende alte Erwartungen sind angepasst. Der Run-21-Runtime-Test erwartet keine Extractorantwort mehr für die nun verweigerte Suche. Originalfixtures bleiben erhalten. Rule-1-Tests und historische Event-Replays bleiben geschützt.

Keine neuen Eventtypen oder Save-Migration. Extractor **5.12**, Board **5.3**; Command **1.6**, Delta **1.6**, Narrator-Vertrag **.85** bleiben. Die persönliche ST-Karte braucht keine neue Revision.

## Abnahme

- Finale vollständige Node-Suite separat ausgeführt: **1.927/1.927**, keine übersprungenen Tests.
- Zielmatrix: **28/28**; auf unveränderter Basis **21 rot / sieben grün**. Handels-/Run-17-Nachbarn während der Umsetzung **97/97**.
- Echter SillyTavern **1.19** mit Mockprovider: final **21/21**, **fünf Extractor-Aufrufe**, keine PageErrors. `extractPerReply`, `fightOpened`, Swipe und Geheimnisschutz bestanden. Vier tatsächlich gespeicherte Story-Records jeweils `applied` und genau einmal `extract.applied`; die auf Platte gespeicherte Chatdatei wurde zusätzlich gelesen.
- Ein vorheriger unveränderter ST-Zwischenlauf war **20/21** wegen `AbortError: The user aborted a request. @ openai.js:4565`; alle übrigen Prüfungen waren dort grün. Zwei frühere Smoke-Läufe ebenfalls 21/21. Die Ursache des intermittierenden ST-Aborts wurde nicht als Teil dieses Patches behoben oder abschließend geklärt.
- Zwischenläufe deckten unvollständige Boarddiagnose-Defaults, einen irrtümlich entfernten Equip-Import und veraltete Testerwartungen auf; vor der finalen Abnahme korrigiert. Ein paralleler Node-Zwischenlauf ohne vollständige Summenausgabe wurde nicht als bestandene Vollsuite gezählt.
- Kritischer Diff-/Whitespace-Review abgeschlossen. Keine Produktwerte oder Runnerdateien geändert. Keine neuen Runtime-Abhängigkeiten.

## Grenzen

Kein natürlicher GLM-/Level-15-Lauf und kein Neunfach-Batch durch diesen Patch gestartet. Ein realer Modelllauf bleibt nötig, um die Häufigkeit neuer Vorschlags-/Repairfehler zu beurteilen. Strengere freie Warenzuordnung kann eine Nachfrage beziehungsweise explizite Offer-/Line-Auswahl verlangen; eine allgemeine semantische Synonymerkennung wird nicht behauptet. Nicht zeitlich eindeutig annotierte lokale Behauptungen können weiterhin verworfen werden.

XP, Startstats, Kampf-/Monsterwerte, F-/E-Balance, Skills/PP, Preise, Gearslots, Dungeonpopulation, formale Questregeln und Testspieler-/Batchstrategie sind unverändert.
