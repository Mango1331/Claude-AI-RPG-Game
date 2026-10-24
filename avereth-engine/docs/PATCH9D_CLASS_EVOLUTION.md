# Patch 9D — Organic Class Evolution (.55; Reviewfix .56; Live-Follow-up .57)

Basis: `be276456` (.54). Implementierungsauftrag: Chatgpt Feedback(5), 24.10.2026.

## Reviewfix .56 (24.10.2026)

Basis: Engine `6777e6c`, separater Runner `c15177a`. Claude hat die vier Prüfschwerpunkte und 1258/1258 Tests unabhängig bestätigt, mit zwei mittleren und drei niedrigen Befunden. Diese Korrektur setzt ausschließlich die bestätigten Befunde um:

- Alle angenommenen Skill-Evolutionen zusammen geben maximal **einen** Rare-Wertungspunkt und einen Entwicklungskontext. Die einzelnen Taten bleiben sichtbar; auch vorhandene .55-Kontexte werden bei der Wertung zusammengefasst. Normale Skill-Entwicklung allein ergibt kein Rare. Bereits angenommene Klassen werden nicht rückwirkend entzogen.
- Der persönliche Anteil bezieht sich auf den tatsächlich erlittenen HP-Schaden **dieses** Encounters, nicht auf die vollen Max-HP. So zählt auch ein allein besiegter angeschlagener Rückkehrer. Ohne positiven erfassten Schaden keine Gutschrift; fremder Schaden bleibt im Nenner.
- Die automatische NPC-Blink-Taktik ist entfernt: Fernangriffe erreichen ENGAGED bereits ohne Malus. Heilung/Konversion und bestehende Abwehrregeln bleiben.
- `report.md` kennzeichnet Fixture, Seed, synthetische Level-14-Vorgeschichte/alte Statzuweisungen und den wirklichen Reload-Status direkt in der Kurzfassung. Nur der isolierte Runner verteilt die 65 alten freien Punkte passend zur Fixture-Richtung und setzt die vorbereiteten Ressourcen neu; der echte Aufstieg auf 15 vergibt regulär neue Punkte. Produktive Kampagnen und Kern-Fixtures bleiben unverändert.
- Level-Prüfung in Angebot/Annahme/Validierung/Anzeige liest `class_growth.level`; der Reducer prüft beim Replay keine fest eingebaute 15 mehr. Hinweis auf höhere Klassen und E-Extrembeleg lesen die bestehenden Rank-Bands. Keine Ranggrenzen verändert.

Rot/Grün: Auf .55 scheitern genau sechs betroffene Prüfungen (13/19 grün), mit Fix 19/19. Drei neue Kernregressionen und ein neuer Berichtstest; vorhandene NPC-/Fixture-Erwartungen gezielt korrigiert. Angrenzende Regressionen 92/92. Vollsuite und Git-Nachweise siehe Abschluss unten. Build .56, Narrator-Vertrag unverändert .55. Unverändert kein echter ST-/GLM-Lauf in dieser Umgebung; die übrigen Reviewhinweise sind keine zusätzlichen Änderungen dieses Fixes.

## Vorläufige Budgets vor der Implementierung

- Nur F→E ab Level 15, Normal/Rare. Grundklasse und Favored Stats bleiben erhalten.
- Genau eine aktive Klasseneigenschaft, unabhängig von den vier Passive-Plätzen, mit derselben Effektauflösung und denselben gemeinsamen Summengrenzen.
- Normal-E: bis zwei Effekte; je Effekt Statbonus 4, Maximalwert 20, Kostenreduktion 8 %, Resistenz 8 %.
- Rare-E: bis drei Effekte; je Effekt Statbonus 6, Maximalwert 35, Kostenreduktion 15 %, Resistenz 15 %.
- Unterstützte Bedingungen wie bei Passives: Gegner ENGAGED oder HP ≤25–50 %. Keine neuen Effekte, keine Core-Stat-Zuwächse durch Klassenprofile.
- Persönliche Siege: mindestens 50 % des maßgeblichen HP-Schadens am besiegten Gegner; Overkill zählt nicht. Flucht, Tod, Aufgabe und fremde Kills geben keine besonderen persönlichen Siege.
- Giant Slayer: persönlicher Sieg bei Levelabstand ≥5. Against the Odds: fünf persönlich mitbesiegte Gegner mindestens auf eigenem Startlevel. Survival: Start-HP ≥50 %, Minimum ≤35 %, Gegnerabstand ≥3 und eigener wesentlicher Beitrag; unabhängig vom Passive-Zufallswurf.
- Rare: Giant Slayer oder mindestens drei besondere Leistungen aus mindestens zwei Kontexten; höchstens zwei Wertungspunkte je Kontext, sämtliche Skill-Entwicklung zusammen höchstens ein Punkt/ein Kontext. Wiederholung desselben Gegner-/Gebietskontexts vermehrt die Wertung nicht.
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

Bestehende Guards, Wards, Feints, Angriffswahl, Signaturpriorität, Flucht und Aufgabe bleiben Grundlage. `npcTactic` ergänzt nur konkrete Lücken: bekannte Selbstheilung unter halben HP; bekannte Ressourcen-Konversion, wenn sie einen sonst unbezahlbaren Angriff ermöglicht. Die zunächst ergänzte automatische Repositionierung entfällt seit .56, weil Fernangriffe ENGAGED bereits erreichen. Keine zwei Taktiken unmittelbar nacheinander und weiterhin höchstens drei je Kampf. Kein neuer Skill, keine NPC-Klassenhistorie, kein LLM im Kampf.

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

## Ausgeführte Tests der ursprünglichen .55

- 13 neue Kernregressionen und 2 neue Runner-Regressionen, einschließlich der mehrteiligen Fixture-Matrix.
- Gezielt: 51/51 (9D, 9A und 9B-2) sowie 37/37 (9D/Runner, 9C und Vertragsregressionen).
- Vollständiger abschließender Lauf: **1258/1258 bestanden, 0 Fehler**, Node v24.19.0, 24.10.2026. Der erste Gesamtlauf fand fünf alte Versions-/Guide-Erwartungen; Vertragskonstante und die ausdrücklich geänderten Erwartungen wurden korrigiert, danach der volle Lauf erneut ausgeführt.
- Laufzeit: rund 74 Sekunden im hiesigen Container. Das ist keine Gameplay-/Provider-Latenzmessung.
- Kein echter Browser-/ST-/GLM-Lauf. Kein unabhängiges Claude-Review durchgeführt.

## Abschluss des Reviewfixes .56

- Drei neue Kernregressionen in `tests/v4/patch9d_review.test.js`, ein neuer Berichtstest und gezielte NPC-/Fixture-Anpassungen: auf .55 genau sechs rot (13/19), mit Fix 19/19 grün.
- Angrenzende Regressionen: **92/92**. Eine vollständige Abschlussprüfung: **1262/1262**, 0 Fehler, Node24.19.0, rund 27 Sekunden (24.10.2026).
- Alle fünf isolierten Runner-Fixtures mit Seed7 erzeugt, gefaltet und mit `validateState` geprüft: Level14, null alte freie Punkte, keine Invariantenfehler. Identische Fixtures/Seeds bleiben deterministisch. Das ist keine Browser-/Provider-Abnahme.
- Claudes unabhängiges Review der .55 bestätigt Kernarchitektur und 1258/1258. Die hier umgesetzten .56-Korrekturen sind durch Codex getestet; kein zusätzliches unabhängiges .56-Gegenreview behauptet. Der echte ST-/GLM-Fixture-Lauf bleibt offen.

## Echter .56-Fixture-Lauf und gezielter Follow-up .57 (24.10.2026)

Originalexport `20261024-010241Z-current_test.zip`, Build .56 / HEAD `bdda871`, ST1.19.0, GLM-5.3-Flash: **25 Züge, 25:13 Minuten, 5/5 Mechanik-Meilensteine erreicht, Runnerabschluss fehlgeschlagen**. Der Nutzer musste nach dem ersten Reload API-Verbindung und Senden manuell auslösen. Level15/E, Rare-Angebot, ausdrückliche Annahme von **Ironbound Fury**, beide Panels und tatsächlicher Folgeeinsatz sind in den Originalevents belegt. Der Combat-Snapshot enthält ATK+6, Martial-STA-Kosten−15 % und die aktive E-Klasse; Heavy Slash kostet6 STA und hat Raw114,5. **Persistenz nach einem Browser-Reload ist dort nicht live bestätigt:** Abschluss mit `page.waitForFunction: Timeout 60000ms exceeded`, `fixtureReload:null`, Startbildschirm statt Testchat.

**Ursache und Fix:** Der alte Driver wartete nach `page.reload()` nur auf irgendein `campaign.started`. Jetzt speichert er die tatsächliche Chatdatei-/Kartenidentität, lässt ST initialisieren, prüft genau die bereits gespeicherte Datei per bestehendem ST-Leseendpoint und öffnet sie mit den vorhandenen ST1.19-Kontextfunktionen `selectCharacterById`/`openCharacterChat`. Quelle gegengeprüft: `SillyTavern/SillyTavern`, Tag `1.19.0`, `public/script.js` und `public/scripts/st-context.js`. Fehlende Datei/falsche Karte/Kampagne/Verbindungsroute werden explizit abgelehnt, bevor eine neue Begrüßung als Fixture gelten könnte. Die normale API-Verbindung wird wiederhergestellt und geprüft; ohne Verbindung oder bei falschem Chat gibt `send` nichts ein. `save` schreibt nur den Testchat. Start-Fixture prüft die wiederhergestellten Events; Abschluss vergleicht Bogen und Laufbahn nach Reload. Abschlussfehler erhalten `fixture_reload_failed` und `fixtureReload:false`, nicht einen vagen erfolgreichen Lauf trotz fehlender Persistenzprüfung.

**Klassenwahl:** Originaleingabe `I choose Ironbound Fury as my class.` wurde zuerst mit erfundener ID `dec.class.e.offense` und nach Repair nur mit `dec.class.e` geliefert. Der Planner-Validator löst nun eine ausdrücklich gewählte, vollständig und eindeutig benannte **offene** Klassenoption vor der strikten ID-Prüfung auf ihre echte Options-ID auf. Keine neue Fähigkeit oder mechanische LLM-Berechtigung; Agency-, Combat-, Erwerbs- und Replay-Guards bleiben. Fragen, Wünsche, Pläne, Verneinungen sowie unbekannte/mehrdeutige Namen erwerben nichts. Katalog/Planner unterscheiden Gruppe und Option klar; #class erklärt die natürliche Wahl und bleibt read-only. Der zentrale Guide verlangt keine erfundenen #class-Unterbefehle und beendet bei echtem Blocker statt Varianten zu durchlaufen.

**Laufzeit:** Original 7:37 Minuten Spielerentscheidungen, 14:12 Minuten Spiel einschließlich Provider/Extraktion. Spieler-Median10,4s, Maximum92,7s (Zug17); Spiel-Median11,4s, Maximum251,9s (Zug24); Narrator-Call32 dauerte229,8s. Der Bericht nennt vorhandene Einzelzeiten über30s und über dem Dreifachen des jeweiligen Phase-/Rollenmedians, maximal drei pro Kategorie, mit Zug und API-Call. Providerzeiten werden nicht zusätzlich zu Spielzeiten summiert. Keine Änderung von Modell-/Token-/Reasoningparametern oder der Engine-Balance.

**Tests:** Sieben neue Regressionen, eine bestehende Berichtsprüfung erweitert. Gegen die .56-Quellen isoliert reproduziert: sieben betroffene Prüfungen rot (3/10 grün); mit Fix10/10 grün. Angrenzend **132/132**, vollständiger Abschlusslauf **1269/1269**, 0 Fehler, Node24.19.0. Browsercallbacks laufen im VM-Test gegen den ST-Startbildschirm, gespeicherte Identität, fehlende Datei, falschen Chat, getrennte API und echten Fixture-Fold; das ist **kein neuer echter ST-Lauf**.

Build **.57**, Narrator-Vertrag unverändert **.55**. Engine und Runner separat committet. Keine Änderungen an Rarity-Schwellen, Effekten, XP, hohen Rängen oder NPC-KI. Nächste echte Abnahme: `npm run live:st -- --guide current_test --fixture 9d-rare --seed 7 --headed`; insbesondere ohne manuellen Verbindungsschritt starten und den erfolgreichen Abschluss-Reload belegen. Hier fehlen weiterhin ST-Installation/Profil, Browserbinary und Provider-Key; erneuter Providerlauf daher nicht durchgeführt.
