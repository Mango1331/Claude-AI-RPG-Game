# Batch 16 – gezielte Fehlablehnungen, Build .122

30.10.2026 · Basis `.121 / 00fa7f1`. Grundlage: [Sols Gegenreview des .120-Batches](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/52cd70c8b165c74c4c0c1b16302b17716a06b05e/testrun_10b/batch-20261030-002939Z/SOL_COUNTERREVIEW.md) und anschließendes GPT-Feedback. Ein gemeinsamer Korrekturpatch; XP×5 und Warrior-Einkaufsversuch unverändert enthalten.

## Korrekturen

**Verkauf, Rogue T39/40 (Engine-T36/37):** `trade.js:offerAdvice` erkennt `I'd`, `I'll`, `We'd` und `We'll` als Sprecherformen, nicht als Namen anderer Händler. Das originale eigene 17-cp-Gebot mit zwei Warenpositionen bleibt erhalten. Derselbe gespeicherte Annahmeplan führt über die vorhandene Gesamtgebotsabwicklung zu genau einer Zahlung über 17 cp und den Warenübergaben; erneute Annahme zahlt nichts. Echte Drittanbieterberatung bleibt ausgeschlossen. Kein neues Paketpreissystem und keine Änderung an Betrags-/Inventarbelegen.

**Dungeon, Mage T149/150:** `commands.js:dungeonGo` verwendet weiterhin zuerst bekannte Räume, Passageverbindungen und deren Hindernisse. Nur bei noch nicht zugeordnetem Weg wird die Textzuordnung korrigiert: Ein beliebiges gemeinsames Wort genügt nicht mehr; der Zielname muss zur Hindernisbezeichnung passen. Benannte Wege mit derselben Links-/Rechts- oder Himmelsrichtung bleiben auch mit zusätzlichen Beschreibungen gesperrt, widersprechende Richtungen werden getrennt. Dadurch blockiert die rechte Platte nicht mehr den linken Durchgang. Die originale umformulierte rechte Abfahrt bleibt gesperrt. GO-Autorisierung ist weiterhin keine gebuchte Ankunft; kein neues Raummodell oder automatisches Überwinden von Hindernissen.

**NPC, Mage T71:** `world.js:personLabels` ergänzt eindeutige Wörter etablierter Namen als Beleglabels, entsprechend der bereits bestehenden Teilnamenauflösung. Eindeutigkeit wird auch gegen abwesende bekannte NPCs und den Spieler geprüft. „Marla“ kann so die bekannte „Marla Otterwell“ in ihrer tatsächlichen Ankunft identifizieren. Zwei bekannte Marlas bleiben getrennt; ein NPC namens Alaric kann nicht die Präsenz des Spielers übernehmen. Die Prüfung auf tatsächlich erzählte Anwesenheit, Verneinung, Erinnerung und Hypothese bleibt bestehen. Keine neuen Identitäten oder gespeicherten Aliasfelder.

## Nachweise

Die Fixture `tests/v4/fixtures/batch16_false_refusals.json` enthält drei unveränderte Original-Vorzustände mit zugehöriger Prosa/Extraktion beziehungsweise Plannerbefehlen. Herkunft: Chatupload Batch 16, SHA-256 `2afff5e2f0961e778891df747d604830bf142bd189e8b558f8b00f5c412571bc`. Keine Providerdaten oder Schlüssel; kein ZIP-Upload auf GitHub behauptet.

- **24 neue Regressionen:** gegen unverändertes `.121 / 00fa7f1` **acht rot, 16 grüne Kontrollen**; danach **24/24 grün**. Rot: Originalverkauf und vier Ich-/Wir-Kurzformen, originale linke Passage und weiterer falscher Worttreffer, originale Marla-Kette.
- Originalverkauf mit Warenbesitz, 17-cp-Saldo, erneuter Annahme; Original-NPC-Ankunft einschließlich abhängiger Erinnerung; vollständiger serialisierter Event-Replay, Zustandsvalidierung und deterministische Wiederholung aus dem Vorzustand. Kanonisch verknüpfte Dungeon-Sperren und umformulierte rechte Wege bleiben gesperrt; falscher linker Weg wird autorisiert, ohne den Spieler vorzeitig zu bewegen.
- **Angrenzende Regressionen 179/179**: Navigation/Features, Anwesenheitsbelege, NPC-Kontinuität und Handel.
- **`npm test -- --test-concurrency=4`: 2372/2372**, keine übersprungenen oder abgebrochenen Tests.
- **Echter ST-1.19-Smoke (`npm run smoke:st:c`) 23/23 bestanden**, sechs Extractor-Aufrufe, keine PageErrors, Status `.122` und `integrity: OK`. Der erste Versuch konnte mangels Browser am Standardpfad nicht starten; der erfolgreiche Lauf nutzt den bereits vorhandenen Browser über `PLAYWRIGHT_BROWSERS_PATH`. Keine Produktanpassung für den Smoke.

## Grenzen

Keine Schema-, Prompt-, Vertrags- oder Eventrevision, kein Kartenupdate. Keine Änderung an Zustandsreducern, vorhandenen Savebeträgen, XP, Gear, Kampf, Gildenregeln oder Testspieler. Historische Events werden nicht umgewertet; die neuen Entscheidungen gelten erst für neu verarbeitete Handlungen/Extraktionen. Freie Wegbeschreibungen bleiben ohne kanonische Passage eine begrenzte Namens-/Richtungszuordnung, kein allgemeiner Sprachinterpreter.

Ein natürlicher GLM-Batch auf `.122` wurde nicht gestartet. Erst dieser prüft die kombinierte Wirkung von XP×5, Warrior-Schmiedbesuch und den korrigierten Fehlablehnungen. Keine weiteren vorsorglichen Mikrofixes vor diesem Vergleich.
