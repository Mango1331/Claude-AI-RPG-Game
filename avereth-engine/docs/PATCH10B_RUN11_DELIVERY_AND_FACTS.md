# Run 11 – Delivery destination and ghost-fact fixes (.78)

Basis: Produkt .76 + Runner `23930fc`. Fachplan: [Run-11-Folgeplan](../../../patch_plans_10b/PATCH_RUN11_DELIVERY_AND_FACTS.md).

- **Board:** Empfängername oder erkennbare Rolle am Zielort erforderlich; `Recipient`, `someone`, `staff` usw. werden im bestehenden Board-Repair abgewiesen. Ein einziges DELIVER-Objective ohne Quittungsnebenpflicht.
- **Lieferung:** Bei `Person/Role at Place` oder `deposit at Place` wird der tatsächliche Zielort exakt aufgelöst, nicht ein unbekannter Innenraum durch sein Elterncamp ersetzt. Bestehende institutionelle Verträge mit `Recipient at Infirmary` akzeptieren nur zuständiges medizinisches Personal am tatsächlich etablierten Zielort. Menge, physischer Transfer, Provenienz, Einmal-Beleg, READY und Auszahlung bleiben engine-eigen.
- **Fakten:** Unbekannte reservierte `npc.*`/`mon.*`-Referenzen für Fakt-Subjekt, echtes Fakt-Objekt und Wissens-`who`/`s` werden verworfen; sonstiger Freitext bleibt zulässig. Kein Phantom-NPC und keine Alt-Save-Migration.
- **Tests vorbereitet:** `tests/v4/patch10b_run11_delivery_facts.test.js`; Fälle E83/E165, Board-Validierung, Ort/Empfänger, Provenienz, doppelte Receipts, Replay/JSON, Legacy, Phantom-Fact und Learn-Referenzen. Bestehende Delivery-/Guild-Suiten unverändert.
- **.77-Probelauf:** Nutzer meldete **1541/1561**, alle **20 Fehler in historischen Liefer-/Replaytests**, insbesondere 10B-2/3B/Gretha. Die Fakten- und Run-11-Regressionen wurden nicht als fehlerhaft gemeldet. Ursache: zu strenge Orts-/Empfängerauflösung für freie alte Vertragsformulierungen.
- **.78-Korrektur:** Vorhandene historische Verträge nutzen wieder genau die alte .76-Ziel- und Empfängerlogik. Nur eindeutige `Person/Role at Place`- und `deposit at Place`-Formate verwenden den strengen Innenraumcheck. Zwei zusätzliche Kompatibilitätsregressionen (alte Quary-Camp- und Chapel-Formulierungen) ergänzt; sämtliche alten Tests bleiben unverändert.
- **Abnahme:** Neuer `npm test` vom Nutzer offen (erwartet **1563 Tests**), echter ST-Smoke danach durch Sol. Noch kein Test-Pass für .78 behauptet; GLM-Langlauf ausstehend.

Kampfwerte, Privatjobs, XP und Runner unverändert.
