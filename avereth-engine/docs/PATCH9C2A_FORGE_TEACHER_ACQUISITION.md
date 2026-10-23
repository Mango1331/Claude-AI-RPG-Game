# Patch 9C-2a — Forge am bestehenden Lehrer-Erwerb

Erststand **4.3.0-c.6.6.43** (`9ff76c6`), Basis `c02bdb0` (.42). Claude bestätigte unabhängig 33/33 gezielt und 1163/1163 gesamt und fand die unten korrigierten Randfälle. Reviewkorrektur **4.3.0-c.6.6.44**; deren Gegenreview und echter ST-Livetest stehen noch aus.

## Spielerwirkung und Umfang

Ein durch Unterricht fertig gelerntes Vorhaben erhält einen individuellen Namen und einen kurzen atmosphärischen Text. Der Composer bestimmt weiterhin sämtliche Werte, Funktionen, Tags und Aspekte. Bei unbrauchbarer Forge-Ausgabe bleibt der deterministische Erwerb möglich. Dieselbe dynamisch erworbene Technik lässt sich nicht nochmals als neue Technik lernen; Training eines bekannten Skills gibt weiterhin regulär PP.

Keine Stones, Materialien, Shops, neuen Passives, Varianten, Durchbrüche, Evolutionen oder Balance-Änderungen. Keine neuen Eventtypen, keine Queue, keine Runner-Codeänderung. V3 und V4-A erhalten keinen Forge-Erwerbsworkflow. Der Schutz vor veralteten Host-Aufträgen gilt auch außerhalb neuer Kampagnen.

## Umsetzung

- `src/v4/forge.js`: kleines geschlossenes Protokoll für `{skills:[{key,name,flavor?}]}`. Nur legitimierte Composer-Definitionen werden als Daten übergeben. Namen erfüllen die bisherigen Regeln und sind gegen statische/dynamische Skills, NPC-Definitionen, Passives und bereits gültige Geschwister geprüft. Gültige Einträge bleiben bei einem Repair anderer Einträge erhalten.
- `runtime.js`: nach beiden erfolgreichen Planner-Routen wird für bereite Ziele gemeinsam die Forge aufgerufen, höchstens einmal repariert. Danach ruft die Runtime den synchronen `finalizeGrowth` auf. `record.forge` speichert Zuordnung, Entwurfshash, tatsächlichen Namen/Fallback sowie Call-Telemetrie. Forge-Zeit wird von Engine-Zeit getrennt und in der Statuszeile gezeigt.
- Board-Retry verwendet gespeicherte Forge-Ergebnisse einschließlich endgültiger Fallbacks. Auch alte .42-Records ohne Forge-Metadaten behalten ihre bereits gebuchten Namen. Regenerate und Replay machen keinen neuen Benennungsaufruf für einen bestehenden Erwerbsrecord.
- `growth.js`: atomare Definition, Lernen und Abschluss auf einer privaten Kopie bleiben synchron. Ein ungültiger oder inzwischen kollidierender Forge-Name fällt einzeln auf den freien Composer-Namen zurück. Laufender Kampf, `pending_combat`, Panels und fehlgeschlagene Planung vergeben nichts.
- `skill_composer.js`/`growth.js`: Funktionsableitung aus bestehenden dynamischen Erwerbsdefinitionen mit Herkunft Lehrer/Stone/Material. Identität ist Funktion plus sortierte Tags und Aspekte, unabhängig von Namen und Quelle. Die tatsächlich gespeicherte Tag-Reihenfolge und damit Skalierung werden nicht geändert. Statische Starter-Skills und fremde NPC-Skills sperren den ersten eigenen dynamischen Erwerb nicht. Bekannte eigene Skills sichern den Schutz auch nach Kürzung der Abschlussliste.

## Beschreibung ist keine Mechanik

Der optionale Definitionswert `flavor` wird separat validiert und im Runtime-Skill gespeichert: eine Zeile, maximal 160 Zeichen, keine Ziffern, Steuerzeichen oder die bisherigen verbotenen Markup-Zeichen. Zeilenumbrüche könnten sonst eine zusätzliche scheinbare `Effect:`-Zeile einschleusen.

`description` bleibt der vom Composer erzeugte Engine-Effekttext. `effect_text` wird nicht aus Forge-Text erzeugt. `#skill`, `source_text`, Skill-Zusammenfassung und der neue Erwerbsblock zeigen Flavor separat als **Description (appearance only, no mechanical effect)**. Der Narrator-Vertrag und `content.10.r2` stellen klar: Name und Aussehen gewähren keine zusätzlichen Kräfte. Semantische Textprüfung kann das nicht garantieren; die Engine führt ausschließlich ihre gespeicherten Effekte aus.

Der aktive V4-Vertrag trägt Revision **4.3.0-c.6.6.43**. Auf einer persönlichen ST-Karte muss die Beschreibung entsprechend aktualisiert werden. Der bestehende Live-Runner übernimmt die neue Vertragsdatei bereits automatisch in sein isoliertes Testprofil; persönliche Profile werden hier nicht geändert.

## Veraltete Aufträge

Vor dem Schreiben prüft die Runtime den Host-Auftrag, Nachrichtenidentität und Input-Hash, die weiterhin maßgebliche Spielernachricht, den bestehenden Record sowie einen Verlaufshash. Der Verlauf umfasst Rollen, Texte, wirksame Event-Inhalte und Extraktionsstatus; eine gleiche Event-Anzahl genügt nicht. Eine wegen Reload verpasste Extraktion wird zunächst auf einer Kopie als Lücke vorbereitet und erst mit gültigem Ergebnis gespeichert.

Der Host entwertet ältere Aufträge durch neue Interceptor-Aufrufe, Chatwechsel, Edit, Löschen und Swipe. Vor Prompt-, Panel- und Speicheraktionen prüft er die Gültigkeit erneut. Ein überholter Auftrag schreibt nichts und bricht keine neuere Generation ab.

## Verifikation

- 14 neue Regressionen in `tests/v4/patch9c2a.test.js` und `patch9c2a_host.test.js`: realer Lehrer-/Sessionpfad bis Erwerb und Kampfeinsatz mit gescripteten LLM-Antworten, Effekt-/Flavor-Trennung, Repair und Fallback, Namenskollisionen, .42-Dopplungsschutz und Tag-Reihenfolge, echte Board-Retries, beide Planner-Routen, `pending_combat`, Replay/Regenerate/Rollback, Legacy und kontrollierte Async-Rennen.
- Der Host-Test importiert den echten `index.js` mit einem minimalen ST-Host und prüft neue Aufträge sowie Chatwechsel während einer ausstehenden Forge. Das ist kein Browser- oder Provider-Livetest.
- Isolierte Vergleichsprobe mit `growth.js` aus .42 und demselben bereits bekannten dynamischen Skill: .42 nimmt die zweite Lektion an; .43 verweigert sie vor Zeitbuchung. Keine Behauptung eines vollständigen .42-Laufs der neuen Forge-Suite.
- Ein bisher auf .40 fest verdrahteter Vertragstest prüft jetzt die exportierte aktuelle Revisionskonstante.
- Vollständiges `npm test`: **1163/1163 grün**. Der erste Gesamtlauf hatte ausschließlich den veralteten .40-Vertragspin rot; nach dessen Korrektur und der ergänzten Flavor-Zeilenprüfung ist der Abschlusslauf vollständig grün. Gezielte Prüfung der neuen Fälle und des angepassten Vertragstests: 27/27.
- `live:st --check`: hier nicht ausführbar; Browser, SillyTavern-Installation/Profil und API-Schlüssel fehlen. Kein echter GLM-/ST-Erwerb behauptet.

Der zentrale Guide `tools/st_live/live/guides/current_test.json` wird in einem separaten Guide-Commit für den Lehrerpfad vorbereitet. Der unveränderte Evaluator hat noch keine Growth-Etappen: Skill-Erwerb, Forge-Text und anschließender Einsatz müssen zusätzlich anhand der Chats und Events geprüft werden; ein automatisches Kampf-Pass ist keine Growth-Abnahme.

## Reviewkorrektur .44 — eigener Abbruch und doppelte alte Ziele

- **R1:** Ein ungültig gewordener Interceptor ruft vor dem Rückkehren immer seinen eigenen `abort(true)` auf, auch nach einer Barriere oder im Fehlerpfad. Kein veralteter Record, Prompt oder Save wird dadurch veröffentlicht. Der bisherige Host-Test verlangte fälschlich, dass kein Abbruch erfolgt; er prüft jetzt pro Generierung getrennte Abbruchflags und überspringt die simulierte Narration entsprechend. Abgedeckt sind neuerer Auftrag, Chatwechsel einschließlich Rückkehr, Edit, Löschen und Swipe während der Forge.
- **Quellnachweis:** In SillyTavern **1.19.0** hält [`runGenerationInterceptors`](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/scripts/extensions.js) `aborted` und `exitImmediately` lokal im jeweiligen Aufruf; der Callback verändert keinen globalen `AbortController`. [`Generate`](https://github.com/SillyTavern/SillyTavern/blob/1.19.0/public/script.js) prüft das zurückgegebene Flag vor der Narrator-Anfrage. Deshalb braucht die Extension keine zusätzliche Unterscheidung zwischen neuem Auftrag und Edit-Invalidierung: Sie verwirft ihren eigenen alten Durchlauf. Das ist eine Quellenprüfung und ein Host-Test, kein durchgeführter echter ST-Lauf.
- **R2:** Bereite alte Duplikat-Ziele werden mit dem vorhandenen `growth.closed` auf den bereits bekannten Skill geschlossen. Keine neue Definition, kein zweites `skill.learned`, keine NEW-SKILL-Meldung und kein wiederholtes `learn_failed`. Die Plätze werden frei; Quellenbindungen bleiben in der Abschlussliste wie bei einem normalen Abschluss erhalten. Das funktioniert auch für ein zweites Ziel, dessen erstes gerade im selben Abschluss gelernt wurde.
- **Rot/Grün:** Auf .43 sind die neue Produktpfad-Regression, die ergänzte bestehende Duplikatprüfung und die korrigierte Host-Erwartung rot (12/15). Nach Fix einschließlich 9C-1 **34/34 grün**; ein vollständiger Abschlusslauf **1164/1164 grün**.
- **Unverändert:** Zahlen, Quellen, Forge-Protokoll, Runner und Narrator-Vertragsrevision **.43**. Keine zusätzliche Migration oder neuer Eventtyp.
- **R3 bleibt Messpunkt:** Kein Umbau von `historyKey`. Claude meldete etwa 17 ms pro Aufruf an 93 Nachrichten/0,29 MB, dreimal pro Zug; hier nicht unabhängig nachgemessen. Im echten ST-Lauf zusätzlich Engine-Zeit eines längeren Chats ablesen. Vor dem Lehrer-/Forge-Lauf einmal eine Generierung während der Wartezeit durch Edit/Chatwechsel ungültig machen und prüfen, dass keine alte Narration nachläuft.
