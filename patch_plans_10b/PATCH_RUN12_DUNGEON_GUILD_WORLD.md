# Run 12 – Dungeon, Guild und World-State

Basis: aa788dd (.78), Original Run 20261025-044431Z. Ursprüngliche Freigabe 25.10.2026: Dungeon und Guild implementieren; World ausschließlich vorbereiten. Der ausdrückliche Folgeauftrag zur World-Umsetzung ist jetzt in .81 abgeschlossen. Keine Balance- oder Runneränderungen.

## A – Dungeon: eine Slotpopulation, getrennte Anwesenheit

E146 meldet drei Goblins mit kanonischer Slotreferenz und present:false. world.newEntity überspringt die Slotprüfung, der V3-Adapter erzeugt drei lokale Entities; die Nachholung erzeugt drei weitere.

Vor dem Adapter exakte Slotidentität unabhängig von Präsenz auflösen. Kanonische Referenz und story_ref verwenden denselben Identitätssatz. Entfernte, explizit benannte Slotgegner einmal binden, ohne Szene, Kampf, met_turn oder Raumzuordnung zu erfinden. Spätere echte Präsenz darf erstmals verorten; bereits verortete Gegner benötigen einen gültigen Ortswechsel. Allgemeine entfernte Sichtungen dürfen keinen beliebigen freien Slot beanspruchen. present:false im Adapter erhalten; V3-Standard bleibt unverändert. Nachholung erzeugt keine zweite Population.

Regressionen: E146-Form durch applyWorld; erneute Erwähnung; spätere Begegnung; anderer Raum; besiegter Slot; entfernte Sichtung außerhalb Dungeon; Verstärkung; Replay/Reload. Keine automatische Löschung bereits beschädigter Saves.

## B – Guild: gespeicherte Lieferbedeutung

Run 12: Erstantwort und Repair nennen konkrete Empfänger, trennen aber mit Komma statt at. Zusätzlich unterscheiden simpleListingWhy und structuredWhere neue Verträge anhand unterschiedlicher Regeln.

Neue Boardverträge erhalten einen kleinen versionierten Lieferdeskriptor: Übergabeart, Empfängertyp Name/Rolle, Empfänger und Zielort. Ware/Menge bleiben im Objective. Generator und Validator vereinbaren die Felder; Veröffentlichung speichert sie im quest.created. Ausführung benutzt ausschließlich diese Bedeutung. Unbekannte Namen/Orte bleiben erlaubt, erzeugen aber keine anwesenden Figuren oder besuchten Orte. Named receiver bleibt exklusiv auch vor Erstbegegnung. Keine Großschreibungsheuristik für neue Verträge.

Historische Verträge ohne Deskriptor behalten .78-Semantik einschließlich Priorei, freier Adressen und alter DELIVER/GIVE-Beschreibungen. Physischer Transfer, Provenienz, Mengen, READY und Auszahlung bleiben getrennt. Repair erhält feldbezogene Fehler; keine beliebige Kommaersetzung und keine zusätzlichen Retries.

Regressionen: Board bis Lieferung; Name/Rolle; unbekannter Innenraum gegenüber Elternort; falscher Empfänger; explizite Ablage; beide Originalantworten; Legacy/Provenienz/Replay. Vollsuite und ST-Smoke dokumentieren.

## C – World-State: nach Folgefreigabe umgesetzt in .81

E197 besitzt einen autorisierten GO. E198 meldet arrived:false und 45 Minuten; die 60-Minuten-Transitregel greift nicht. E199 liefert keine Commands. E200 bindet Lagerfiguren an den weiterhin aktuellen Schmiedehof und setzt zwei ready-Merkmale, ohne Abschluss oder Bezahlung.

Bekannte Ziel-IDs und tatsächlich erreichte Zwischenhalte über bestehende Arrival-Felder erhalten. Keinen Prosa-Fallback und keine bloße Absenkung des Zeitgrenzwerts einführen. Für lokale Entity-/Erfolgsdeltas einen expliziten Schauplatzbezug vereinbaren und am jeweiligen Verarbeitungsschritt prüfen. Gültige spontane NPC-Ankünfte und Hinterhalte am aktuellen Ort brauchen keinen PC-GO. Entdeckungsziele benötigen akzeptierte Beobachtung/Wissensübermittlung, nicht pauschal Arbeitszeit. Abgelehnte Schauplätze dürfen keinen davon abhängigen Questfortschritt erzeugen. reportedTarget darf Zwischenhalte nicht in Endankünfte umdeuten.

E164/E174: Goblins existieren weiter, sind aber nach E148 nicht mehr in der aktuellen Szene. Freitext über ihren Abgang ist kein Bewegungsereignis; keine automatische Bewegung aus Prosa.

Konkretisierung .81: scene an Antwort und optional pro Delta; reine Kontextangabe, kein Ortswechsel. depends_on referenziert frühere akzeptierte Antwortschritte für abhängige Questansprüche. Regressionen: E197–E200 als Kette; Zwischenhalt unter 60 Minuten; spontane lokale NPCs; Suche/Information/Rettung getrennt; mehrfache Ankunft; Replay/Swipe. Keine generische Beweisengine.

## Abnahme und Reihenfolge

A → B → C; die spätere Freigabe für C ist erteilt und umgesetzt. A/B mit gezielten Rot-/Grünfällen und kompletter Node-Suite. Technische Ergebnisse einmal in der Produktpatchnote, Status knapp in 03; 06 verlinkt diesen Plan. Keine natürlichen Langläufe automatisch starten.

**Umsetzungsstand:** A/B umgesetzt in .79 (`0f1195d`); [technische Ergebnisse](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0f1195d15ebbf92c76b5a62b94645dbdbadf8876/avereth-engine/docs/PATCH10B_RUN12_DUNGEON_GUILD.md). C ist in .81 (`5d5dce1`) umgesetzt; [World-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5d5dce125ef34ff2a2812f9cabc2d30ac0b4e522/avereth-engine/docs/PATCH10B_RUN12_WORLD_STATE.md).
