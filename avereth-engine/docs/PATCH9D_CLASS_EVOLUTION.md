# Patch 9D — Organic Class Evolution (4.3.0-c.6.6.55)

Basis: `be276456` (.54). Implementierungsauftrag: Chatgpt Feedback(5), 24.10.2026.

## Vorläufige Budgets vor der Implementierung

- Nur F→E ab Level 15, Normal/Rare. Grundklasse und Favored Stats bleiben erhalten.
- Genau eine aktive Klasseneigenschaft, unabhängig von den vier Passive-Plätzen, mit derselben Effektauflösung und denselben gemeinsamen Summengrenzen.
- Normal-E: bis zwei Effekte; je Effekt Statbonus 4, Maximalwert 20, Kostenreduktion 8 %, Resistenz 8 %.
- Rare-E: bis drei Effekte; je Effekt Statbonus 6, Maximalwert 35, Kostenreduktion 15 %, Resistenz 15 %.
- Unterstützte Bedingungen wie bei Passives: Gegner ENGAGED oder HP ≤25–50 %. Keine neuen Effekte, keine Core-Stat-Zuwächse durch Klassenprofile.
- Persönliche Siege: mindestens 50 % des maßgeblichen HP-Schadens am besiegten Gegner; Overkill zählt nicht. Flucht, Tod, Aufgabe und fremde Kills geben keine besonderen persönlichen Siege.
- Giant Slayer: persönlicher Sieg bei Levelabstand ≥5. Against the Odds: fünf persönlich mitbesiegte Gegner mindestens auf eigenem Startlevel. Survival: Start-HP ≥50 %, Minimum ≤35 %, Gegnerabstand ≥3 und eigener wesentlicher Beitrag; unabhängig vom Passive-Zufallswurf.
- Rare: Giant Slayer oder mindestens drei besondere Leistungen aus mindestens zwei Kontexten; höchstens zwei Wertungspunkte je Kontext. Wiederholung desselben Gegner-/Gebietskontexts vermehrt die Wertung nicht.
- Ein Level-1-Sieg gegen E erhält einen dauerhaften extremen Beleg; erste Evolution trotzdem höchstens Rare.
- Remarkable Development: angenommene echte Skill-Evolution; normales PP-Sammeln zählt nicht. Exceptional Discovery bleibt mangels verlässlich außergewöhnlicher Engine-Quelle ausgespart.
- Vermächtnis: Normal 1 / Rare 2 / Legendary 4 aus der Historie; noch keine höhere Rangskalierung.

Die Zahlen sind Startwerte für 10B. D–S-Klasseneffekte und Domains bleiben ausdrücklich nicht implementiert.

## Zustand, Quellen und Ablauf

`src/v4/feats.js` verdichtet echte HP-Schadensanteile aus dem Encounter. Gewöhnliche persönliche Kills bleiben auch nach einem Rückzug Statistik; besondere Sieges-Feats benötigen einen lebend gewonnenen Kampf. Gegner-Level stammen aus dem fixierten Snapshot. Ein Quellenregister verhindert doppelte Buchungen, Kategorie/Gegner-/Gebietskontexte begrenzen Farm-Wertung. Keine vollständigen Kampfkopien im Tatenbuch. Ohne alte Beitragsdaten werden keine historischen Heldentaten erfunden. Zielgerichtete gebuchte Lernzeit und echte Skill-Evolutionen ergänzen die belegte Richtung.

`src/v4/class_growth.js` hält die Grundklassen-ID unverändert. Der persistierte Level plus angenommene Historie bilden den E-Anspruch; zusätzliche parallele Rangmarker sind nicht nötig. Die nächste sichere reguläre Planner-Nachricht öffnet genau eine `decision.opened`-Gruppe mit zwei bis drei Alternativen. Sie zählt nicht gegen die drei Skill-/Passive-Angebote. `development.accept` benennt die Option-ID; ohne klare Auswahl keine Übernahme. `development.decline` auf Klasse/Option schiebt nur auf. Namen und Qualität der gespeicherten Auswahl werden nicht neu gewürfelt. Neuere Taten bleiben für spätere Entwicklung erhalten.

Die Engine komponiert begrenzte Profile aus belegten Richtungen; das sind Effektmuster, keine Liste späterer Klassen. Die Forge erhält tatsächliche Skills/Aspekte, Stats, Passives, Nutzung und Taten und liefert ausschließlich Name/Flavor. Parser, Cache, Reparatur, Fallback und Stale-Schutz verwenden die vorhandene Runtime. Flavor bleibt vom Effekttext getrennt. Kollidierende Namen innerhalb einer Auswahl erhalten einen deterministischen Ersatz.

Annahme bucht atomar `class.evolved` und schließt die ganze Auswahl. `sheet.evolution` ist die einzige aktive Klasseneigenschaft, `sheet.class_history` bewahrt Qualität und Belege. `legacyValue` rechnet 1/2/4; keine höheren Profile oder aktive Alt-Eigenschaften. Die gemeinsame Funktion `effectErrors` prüft dieselben Effektprimitiven mit separatem E-Klassenbudget. `effectSources` führt normale Passives und genau die aktive Klasse in bestehenden Derived-, Kosten-, Resistenz- und Combat-Berechnungen zusammen. Die Vier-Slot-Prüfung zählt nur echte Passives. Es gibt keine Wiederauffüllung von HP/MP/STA durch die Evolution. Wenn sämtliche unterstützten Vorteile an gemeinsamen Caps scheitern, bleibt der Anspruch offen und #class nennt den Grund.

`#class`, `#feats`, HUD, Planner-Katalog und Narrator nennen nur Engine-Zustand. Der Narrator-Vertrag ist Revision `.55`. Nur Ruleset 2 erhält die neue Mechanik; die alten Lore-/Content-Zweige bleiben erhalten. Höhere Power Ranks funktionieren, mit ausdrücklichem Hinweis auf noch fehlende D–S-Klassen und Domains.

## Kleine NPC-Integration

Bestehende Guards, Wards, Feints, Angriffswahl, Signaturpriorität, Flucht und Aufgabe bleiben Grundlage. `npcTactic` ergänzt nur konkrete Lücken: bekannte Selbstheilung unter halben HP; bekannte Ressourcen-Konversion, wenn sie einen sonst unbezahlbaren Angriff ermöglicht; bekannte Repositionierung eines verwundeten Fernkämpfers aus dem Nahkampf, wenn kein passender Schutz verfügbar ist. Keine zwei Taktiken unmittelbar nacheinander und weiterhin höchstens drei je Kampf. Kein neuer Skill, keine NPC-Klassenhistorie, kein LLM im Kampf.

## Reproduzierbare Abnahme

`tests/v4/patch9d_fixtures.js` enthält ausdrücklich synthetische Level-14-Testfiguren, eine XP vor Level 15. Seeds: **7, 19, 41**. Matrix A/H: gewöhnliche und erfahrene Laufbahn, extreme Einzeltat, offensiver/defensiver Stil, Martial/Arcane-Hybrid, Wiederholungs-Farming und Legacy. Normal/Farming bleiben Normal; erfahren/extrem erlauben Rare; der Extrembeleg wird erhalten, Legendary nicht vergeben. Offensiver und defensiver Stil priorisieren verschiedene Optionen; Hybrid ist auswählbar.

Zusätzliche Regressionen in `tests/v4/patch9d.test.js`: echter Combat-Ende→E→Angebot→Annahme→nächster Kampfeinsatz; Quest-XP und großer XP-Zuwachs; drei andere Angebote; Aufschieben/Ambiguität; Regenerate/Cache/Replay; persönliche Beteiligung und Farm-Wertung; Closed-Validator; gemeinsame Caps, Konditionen, Kosten, Ressourcen, kein Slot/Refill; Vermächtnis; Narrator-Willkür; gültige/ungültige Forge-Antworten und Namenskollision; NPC-Blink/Heal/Restore samt Grenzen.

## Provider-Fixture und Leitfaden (separater Runner-Commit)

Der isolierte Runner erhält ausschließlich auf ausdrückliches `--fixture` eine vorbereitete Figur. Keine Debug-Funktion wird in die Extension eingebaut. `current_test` beschreibt klar die synthetische Vorgeschichte. Eigene Meilensteine verlangen echten E-Levelaufstieg, Klassenangebot, Annahme, beantwortete **#class und #feats**, sowie einen anschließenden Kampfsnapshot mit gewählter Klasse und tatsächlicher Angriffsausführung. Danach speichert/lädt der Runner und vergleicht Klasse und Tatenbuch. Forge-Calls werden als Forge erfasst.

Start auf einer eingerichteten Testmaschine:

`npm run live:st -- --guide current_test --fixture 9d-rare --seed 7 --headed`

Weitere explizite Profile: `9d-normal`, `9d-extreme`, `9d-defense`, `9d-hybrid`.

**Hier kein echter Provider-/Browserlauf:** Preflight am 24.10.2026: Playwright vorhanden, aber Browserinstallation, SillyTavern-Installation/Profil und `AVERETH_LIVE_API_KEY` fehlen. Das ist keine Live-Abnahme. Die Fixture-Installation und das echte Reload-Verhalten in ST sind Gegenstände des noch ausstehenden Laufs.

## Grenzen und Gegenreview

- Persönliche Beteiligung verwendet zunächst HP-Schadensanteile, keinen neuen Support-/Tank-Beitragsalgorithmus.
- Die Angebote frieren Qualität und Mechanik bei ihrer Erzeugung ein; Aufschieben würfelt nichts neu.
- Keine autorisierte außergewöhnliche Discovery-Quelle ergänzt; keine frei erzählten Feats.
- Kein produktives E-Legendary, kein D–S-Klassenprofil, keine Domain und keine vertikale Vermächtnisskalierung.
- Unabhängiges Claude-Codegegenreview und echter ST-/GLM-Fixture-Lauf stehen aus.

## Ausgeführte Tests

- 13 neue Kernregressionen und 2 neue Runner-Regressionen, einschließlich der mehrteiligen Fixture-Matrix.
- Gezielt: 51/51 (9D, 9A und 9B-2) sowie 37/37 (9D/Runner, 9C und Vertragsregressionen).
- Vollständiger abschließender Lauf: **1258/1258 bestanden, 0 Fehler**, Node v24.19.0, 24.10.2026. Der erste Gesamtlauf fand fünf alte Versions-/Guide-Erwartungen; Vertragskonstante und die ausdrücklich geänderten Erwartungen wurden korrigiert, danach der volle Lauf erneut ausgeführt.
- Laufzeit: rund 74 Sekunden im hiesigen Container. Das ist keine Gameplay-/Provider-Latenzmessung.
- Kein echter Browser-/ST-/GLM-Lauf. Kein unabhängiges Claude-Review durchgeführt.
