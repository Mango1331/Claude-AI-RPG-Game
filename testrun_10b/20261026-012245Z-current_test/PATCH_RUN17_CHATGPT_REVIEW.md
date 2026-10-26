# Unabhängiger technischer Gegenreview – Build .93 / Run-17-Reparaturen

**Produkt:** `4.3.0-c.6.6.93`, [`471d5e8c3509bf9d2d22239ebf3688f6e1c3c835`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/471d5e8c3509bf9d2d22239ebf3688f6e1c3c835); Basis `.92`, `7a00e8f`. Extractor `extract-5.11`. **Referenz:** [Run-.92-Review](REVIEW.md), [Original-ZIP](20261026-012245Z-current_test.zip), 9.193.554 Bytes, SHA-256 `582c0baf7470fb64f5642a13456c7981ecdfea47f0cde3e0803efdab6fc5fef7`.

**Prüfung:** Github-Produktcommit/Diff einschließlich `economy.js`, `trade.js`, `commands.js`, `agency.js`, `growth.js`, `world.js`, `envelope.js`, `planner.js`, `tests/v4/patch_run17.test.js` und `docs/PATCH_RUN17_TRADE_AND_ACTIONS.md` unabhängig **statisch** gegengeprüft. Keine eigene Ausführung von Node-/ST-Tests, kein natürlicher GLM-Lauf auf .93, kein Produktpatch. Vom Implementierer gemeldete Testresultate werden als solche gekennzeichnet.

## Ergebnis / Priorität

**Kein anhand des Diffs belegter neuer P1-Blocker. .93 ist für einen natürlichen GLM-Lauf verwendbar.** Die ursprünglichen Run-.92-Defekte werden auf der richtigen Ebene adressiert; die wichtigen negativen Schutzfälle sind als Tests vorhanden. Nicht erledigt: kanonische Boarddarstellung/Handelsangebote aus dem separaten Paket A/B und natürliche Gearkauf-/Equip-Abnahme. Zwei schmale Beobachtungsgrenzen (manuell benannte Quellen im Training; Schlaf-Prompt ohne echte Planner-Abnahme) unten, keine pauschale neue Refaktorierung.

## 1. P1 T56/T57 – Preise und unabhängige Einheiten

**Vorher:** Das Original `This one's my own brew — five silver` wurde vom Extractor mit `price_cp:50` korrekt gelesen, dann von `world.js:evidenced` via `coinFromWords` fälschlich auf 60 cp korrigiert; Grund: `one's` wurde zu `one s` zerlegt. Der sichere Planner verweigerte eine spätere 50-cp-Zustimmung gegen die falsche 60-cp-Offerte.

**Nachher:** `economy.js:coinEvidence` tokenisiert Apostrophe *innerhalb* von Wörtern als Teil des Tokens, statt sie in eine separate Währungseinheit `s` umzuwandeln. `coinFromWords` und `coinMentions` lesen dieselben Belege. `tradePrice` unterscheidet einen zusammengehörigen Betrag aus verschiedenen Währungen (`1s 5c`) von mehreren unabhängigen oder mehrdeutigen Beträgen. `acceptanceWhy` bleibt nach wie vor die eigenständige letzte Preiszustimmungsprüfung; der Patch verhindert keine legitimen Ablehnungen bei abweichenden Preisen.

Die neuen Tests prüfen Original-T56-Quote **50/30** ohne `amount.corrected`, englische Apostrophe/typografische Apostrophe, 1s/1 s/1g 2s 3cp, zusammengesetzte Preise, pro-Stück-Beträge und Preisabweichungs-/Alternativenfälle. Das frühere T56-Problem ist auf Codeebene **plausibel behoben**.

**Abgrenzung:** `coinFromWords` kann mehrere wörtlich genannte, unabhängige Summen grundsätzlich addieren; kommerzielle Ambiguität wird im eigenen `tradePrice`-Pfad abgewehrt. Keine Änderung an fremden, nicht-kommerziellen Buchungspfaden allein aus einer hypothetischen Textvariante ableiten; bei künftigen Vorfällen konkrete Prosa und Events gegenüberstellen.

## 2. Kauf → unmittelbare Benutzung

`agency.js:stateCheck` lässt einen `use {object:{new:...}}`-Schritt nach einem vorhergehenden Kaufbefehl zur **späteren** Prüfung durch, ohne den Besitz zu fingieren. `commands.js:resolveCommands` führt eine private Liste der **im selben Aufruf tatsächlich per `object.created` gekauften** Objekt-IDs; `HANDLERS.use` löst das gewünschte neue Objekt erst **beim Abarbeiten** der Befehle gegen diesen Bestand auf. Eine unklare Mehrfachzuordnung wird nicht verbraucht; ein vorheriger, fehlgeschlagener Kauf liefert keine Objekt-ID. Bestehende Besitz-, Quantitäts- und Wirkungsprüfung bleibt zuständig.

Die neuen Testfälle prüfen die originale Kauf-und-Trink-Eingabe bei angenommenem korrektem 50-cp-Angebot (exakt −50 cp und +25 MP), anschließende `object.consumed`-Buchung, vergebliche zweite Benutzung, nicht genügend Kupfer, `use` vor Kauf, unklare Ware und bloßen Benutzungswunsch; Replay, JSON-Reload und Generate-Wiederverwendung. **Der Fix ist nicht eine Freigabe für Konsum nicht bezahlter Angebote.** Das isolierte Verbraucher-Fixture setzt den Preis bewusst auf 50, um Eigentums- und Preisfehler unabhängig nachzuweisen; die separate echte T56-Publikationsregression liefert ebenfalls 50.

**Restbeobachtung:** Der neue Handler verwendet eine vollständige Wortfolge innerhalb des gekauften Objektnamens, keine strukturiert feste Item-Referenz des Planner. Derzeit absichtlich auf **neu gebuchte Waren im selben Schritt** begrenzt; in zukünftigen natürlichen Läufen auf Alias-/Benennungsmehrdeutigkeit und nicht verbuchte Beschreibungen achten. Kein belegter Regressionseintritt.

## 3. Training – Leistung muss vor Zahlung technisch möglich sein

`growth.js:trainingOfferWhy` nutzt die bereits vorhandene Lehrerkompetenz (`teacherTags`) zur **Angebotsprüfung und nochmals zur Kaufprüfung**. Explizit genannte Disziplinen und bekannte Skills werden auf Unterrichtsfähigkeit abgeglichen. Für `service:training` wird das T45/T46-Bündel „Skill Stone and lesson“ vor der Offerte verweigert; der Kauf einer alten bereits gespeicherten ungültigen Offerte wird vor Auszahlung ebenfalls abgelehnt. Als `goods` separat angebotene Lernquelle erhält nur ein Objekt, keine automatische Skill-/PP-Buchung.

Die Tests prüfen sowohl unqualifizierte Commoner als auch fachlich unpassende Themen durch einen trainierten Mage, bereits gespeicherte Angebote, einen echten separaten Skill Stone, normale nichtmechanische Dienstleistungen und Legacy.

**Schmale offene Textgrenze:** Der direkte Textschutz für physische Lernquellen prüft `line.teaches` oder ausdrücklich `Skill Stone`. Eine ausschließlich als `manual` bezeichnete physische Lernquelle in einer gebündelten `service:training`-Zeile, deren `teaches` fehlt, wird **nicht** allein durch das Wort `manual` abgefangen. Das ist anhand des Codes ersichtlich, aber noch kein reproduzierter Realfehler: „manual dexterity drills“ sind legitimes Training; ein pauschaler `manual`-Regex wäre fachlich falsch. **Empfehlung für Paket B:** Waren-/Dienstleistungstyp und Materialübergabe strukturell prüfen; einen positiven und negativen Fall gezielt als Regression ergänzen, statt die Wortsuche unkontrolliert zu erweitern.

**Kein Automatismus:** Ein gekaufter Unterricht ist noch kein abgeschlossenes Lernen. Die bestehende `learningActivity` entscheidet anhand Quelle, Lehrer, Zeit, Thema und Fortschrittsregeln; keine erfundenen Bonuspunkte.

## 4. T37 Hundeangriff und T47/T48 Schlaf

**Hundeangriff:** `envelope.js:attackCommitted` ergänzt genau `sprang` und `sprung` als positive Angriffswörter. Sonstige Akteurs- und Evidenzbedingungen bleiben vorhanden. Original-Hundeszene wird im Test akzeptiert, neutraler Satz, Fremdakteur, Negation, Konditional, vergangene Erinnerung und Zitat weiterhin verweigert. Mechanisch eng, fachlich sinnvoll.

**Schlaf:** Die zusätzliche `planner.js:MECH_RULES`-Anweisung legt aktive Übernachtungsentscheidungen explizit auf `activity sleep`. Eine Bettsuche, Frage nach Zimmer oder nachträgliches „I wake at dawn“ buchen bewusst keine Nacht. Der vorhandene Engine-Zimmer-/Recovery-Pfad bleibt unberührt. **Wichtige Abnahmegrenze:** Der neue Test gibt eine vorgeformte `activity:sleep`-Aktion direkt vor und bestätigt deren bereits vorhandene Regeneration; er beweist **nicht**, dass GLM aus „I turn in for the night“ tatsächlich den neuen korrekten Befehl erzeugt. Das ist erst natürlich zu prüfen, kein eigener Codeblocker.

## 5. Tests, Host und noch offene Fachpläne

Implementierer-Abnahme laut Patchnote: **25 neue Tests** (gegen unveränderte .92: **17 rot/8 grün**, nach Patch 25/25), angrenzend **123/123**, `npm test` **1814/1814** ohne Skips; echter ST-1.19-Mock-Smoke final **21/21**, fünf Extractor-Aufrufe, vier Story-Replies mit exakt einem `extract.applied`, installierte Quellen final angeglichen.

**Erste Smoke-Ausführung:** Zwei Hostfehler (`Unexpected token I / Internal S… is not valid JSON`, `AbortReason @ openai.js:4565`), erst spätere Ausführung fehlerfrei. Ähnliche Zwischenstörungen wurden bereits beim .92-Smoke gemeldet. Die Ursache ist **offen**; ohne Reproduktion ist dies weder eine bestätigte .93-Regression noch endgültig widerlegt. Bei erneutem Auftreten frühzeitig die Browser-/Host-Konsolenlogs und Response-Situation sichern; kein vorschneller Eingriff in die Spielmechanik.

**Offen:** [Board-/Handels-Fachplan](../../patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md): Phantom-Gildenaufträge T50/51, kanonische Händleridentität, strukturierte Verkaufsangebote. Gear .89/.90 ist weiterhin ohne natürlichen Kauf→Equip-Nachweis. Kein weiteres Startwert-Buffing.

## 6. Freigabeentscheidung und nächste Abnahme

**Aus statischer Sicht .93 für neuen natürlichen GLM-Test geeignet.** Neue Kampagne wie bisher; keine Testspieler-Skriptsteuerung. Entscheidend beobachten: (a) Trankpreis und Kauf/Benutzung real, (b) verweigerte unbrauchbare Unterrichtsangebote statt Erzähl-Belohnung, (c) NPC-Angriffe, (d) echte Schlafbuchung und MP/HP, (e) Phantom-Gildenangebote und nach Lootverkauf mögliche Gearkäufe, (f) sporadische Host-Fehler. Ein normaler Test mit anderer Story muss den ursprünglichen Originalfehler nicht erneut auslösen; Regressionstests bleiben dafür maßgeblich.

**Kein Produktpatch.** Dieser Gegenreview ist eine unabhängige Code- und Testfallbewertung, keine selbst durchgeführte Testabnahme.
