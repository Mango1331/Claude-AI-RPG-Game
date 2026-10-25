# Run 11 – Delivery destination and ghost-fact fixes (.77)

Basis: Produkt .76 + Runner `23930fc`. Fachplan: [Run-11-Folgeplan](../../../patch_plans_10b/PATCH_RUN11_DELIVERY_AND_FACTS.md).

- **Board:** Empfängername oder erkennbare Rolle am Zielort erforderlich; `Recipient`, `someone`, `staff` usw. werden im bestehenden Board-Repair abgewiesen. Ein einziges DELIVER-Objective ohne Quittungsnebenpflicht.
- **Lieferung:** Bei `Person/Role at Place` oder `deposit at Place` wird der tatsächliche Zielort exakt aufgelöst, nicht ein unbekannter Innenraum durch sein Elterncamp ersetzt. Bestehende institutionelle Verträge mit `Recipient at Infirmary` akzeptieren nur zuständiges medizinisches Personal am tatsächlich etablierten Zielort. Menge, physischer Transfer, Provenienz, Einmal-Beleg, READY und Auszahlung bleiben engine-eigen.
- **Fakten:** Unbekannte reservierte `npc.*`/`mon.*`-Referenzen für Fakt-Subjekt, echtes Fakt-Objekt und Wissens-`who`/`s` werden verworfen; sonstiger Freitext bleibt zulässig. Kein Phantom-NPC und keine Alt-Save-Migration.
- **Tests vorbereitet:** `tests/v4/patch10b_run11_delivery_facts.test.js`; Fälle E83/E165, Board-Validierung, Ort/Empfänger, Provenienz, doppelte Receipts, Replay/JSON, Legacy, Phantom-Fact und Learn-Referenzen. Bestehende Delivery-/Guild-Suiten unverändert.
- **Abnahme:** `npm test` wird vom Nutzer ausgeführt, ST-Smoke später durch Sol. Kein vollständiger Testlauf hier behauptet; natürlicher GLM-Lauf steht aus.

Kampfwerte, Privatjobs, XP und Runner unverändert.
