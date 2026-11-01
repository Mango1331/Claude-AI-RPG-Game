# .146 – Batch21: Handelsintegration und Populationsidentität

**01.11.2026 · Basis `.145 / 0a2beca` · Build `4.3.0-c.6.6.146`.**

Grundlage: [Batch21-Originalreview und unveränderte ZIP auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/c1f3cf44d1d4f05f8c50ebc0494b8db9f3dacac5/testrun_10b/batch-20261101-152756Z), anschließend Nutzerfreigabe zur Prüfung des GPT-Feedbacks und Umsetzung. Ein Produktpatch mit zwei Fachbereichen, keine neue Finanzmechanik. Originale und historische Fingerprintlisten bleiben unverändert.

## Feedbackentscheidung und tatsächliche Ursachen

| Befund | Prüfung / Umsetzung |
|---|---|
| A: bekannter Schmied beim Wiederbesuch nicht anwesend | Bestätigt T40/E80. Ankunft setzt Präsenz zurück; das folgende Angebot enthält keinen `enter`. Extractor und World hatten unterschiedliche Voraussetzungen, ohne dass dies den bestehenden Repair auslöste. |
| B: vorhandene Ersatzrüstung nicht verkaufbar | Bestätigt T49/E98 und T53/E106. Commands und Buchung unterstützen `item.<template>` aus dem Sheet; die Gebotserstellung suchte ausschließlich in `s.objects`. |
| C: richtige Person, falsches kurzes Rollenlabel | Bestätigt T21/22 und T61. Annahme der richtigen Angebots-ID scheitert an „old woman ≠ merchant“ beziehungsweise „landlady ≠ innkeeper“. |
| D: gültiges Board durch Singular/Plural verworfen | Bestätigt Calls48/49 und178. `boar/boars` und `bog strider/bog striders` wurden trotz identischem Habitat/Anchor/Level als verschiedene Populationen bewertet. |
| Zusätzlicher GPT-Hinweis: Duplikate innerhalb eines Boards prüfen | Übernommen als Regression. Der bestehende Duplikatschutz arbeitet bereits über das Zielhabitat, nicht die Schreibweise der Art. Keine zweite Duplikatslogik erforderlich; nach dem Artenfix weist er das Doppelangebot korrekt ab. |

Die Einschätzung im Feedback ist damit sachlich richtig. Die Grenzen seines Originalzugriffs werden nicht als eigene Originalprüfung ausgegeben: Die hier verwendeten Zustände und Antworten stammen aus der unabhängig ausgewerteten ZIP. Keine XP-, Preis-, Stat-, Balance- oder Runneränderung.

## 1. Handelsintegration

### A – fehlende Begegnung über vorhandenen Repair nachfordern

`src/v4/extract.js::parseExtraction()` verfolgt die im Bericht angegebene lokale Präsenz über `arrive`, `enter`, `leave` und Einführung einer neuen Person. Meldet `offer`/`bid` einen bekannten, an diesem Schritt nicht anwesenden NPC oder eine erfundene `npc.*`-ID, fragt die **bestehende begrenzte Reparatur** nach der richtigen Katalog-ID und dem belegten `enter` vor dem Geschäft. Sie verlangt ausdrücklich, ein Geschäft wegzulassen, wenn die Antwort keine tatsächliche lokale Begegnung etabliert.

Die Engine erzeugt weder `enter` noch NPC noch Spielerankunft automatisch. Ein altes Arbeitsplatzwissen, eine Warenliste oder eine bloße Erwähnung macht niemanden anwesend. Die endgültige Präsenz-/Evidenz-/Ortsprüfung in `world.js` bleibt unverändert. Liefert auch die Reparatur keine gültige Begegnung, bleibt das Geschäft abgewiesen; unabhängige gültige Weltinformationen können weiterhin angewandt werden. Keine unbegrenzten Retries.

Extractor-Komponentenversion **5.25**; Delta1.14 und cmd1.9 unverändert. Die persönliche Erzählerkarte bleibt Vertragsrevision `.85`; keine Kartenaktualisierung nötig.

### B – eine Gegenstandsauflösung für Commands und Gebote

Die vorhandene `commands.js::objectOf()`-Auflösung liegt jetzt unverändert in `trade.js::tradeObject()`. Commands und `world.js::bid()` verwenden dieselbe Sicht auf physische `obj.*`-Objekte und freie `item.<template>`-Inventareinheiten. `heldUnits()`, `bidSale()` und `bookSale()` sichern Besitz, Menge, Gesamtpreis und Abgang weiterhin ab.

Es wird kein künstliches zweites Rüstungsobjekt erzeugt. Eine nur ausgerüstete Waffe ist weiterhin kein frei gehaltenes Inventarstück; unbekannte Gegenstände und überhöhte Mengen bleiben ungültig. Die vorhandene Buchung entfernt die verkaufte Templateeinheit per `item.changed` und bezahlt den angenommenen Gesamtpreis einmal.

### C – etablierte Person statt verkürztem Rollenwort prüfen

`commands.js::offer.accept` verwendet wie der Planner das vorhandene `personLabel()` mit Name, aktueller Rolle und etablierter Beschreibung. `trade.js::acceptanceWhy()` prüft kopierte `party_words` gegen dieses vollständige Label. Die direkt adressierte Namensform „Done, Tam“ bleibt auf den Namensbestandteil beschränkt. Preis, Warenpositionen, Mengen, Angebotsstatus und Anwesenheit werden weiter separat geprüft.

Damit passen „old woman“ und „landlady“ zur ausgewählten Person, ohne ein Synonymverzeichnis anzulegen oder beliebige andere Empfänger zu erlauben. T25, der vorher funktionierende Aufruf „Merchant“, bleibt als Positivkontrolle gültig.

## 2. Board: kanonische Population erhalten

`domain.js::sameSpecies()` vergleicht die **gesamten** Artwörter mit den bereits vorhandenen Nomenstämmen von `kindOf()`. Ein gemeinsamer Kopf wie „boar“ oder derselbe mechanische Körperbau allein genügt nicht: „red boars“ ist keine unmarkierte „boars“-Population.

`guild.js::habitatWhy()` prüft weiterhin Art, Anchor und vollständiges Levelintervall. Bei kompatibler Schreibvariante übernimmt das neue Angebot den bereits gespeicherten kanonischen Artnamen; den existierenden Weltzustand ändert die Validierung nicht. Echte Konflikte nennen dem Repair jetzt Art, Anchor und Levelwerte des etablierten Habitats. Alters- und Einstiegsregeln, aktive Zielkonflikte, 4+1/5-Verteilung sowie Dungeon-Räumungsgrenzen bleiben bestehen.

Call179 bleibt ausdrücklich ungültig: Der ursprüngliche Repair entfernte benötigte Habitatdeskriptoren. Fehlende Populationen werden nicht automatisch geraten oder freigegeben.

## 3. Originalregressionen und Integrationskette

Fixture: `tests/v4/fixtures/batch21_integration146.json.gz`; Originalquelle/SHA und E-Indizes im Fixture vermerkt. `fix146_batch21_integration.test.js` enthält **16 Tests**, gegen unverändertes `.145` im separaten Checkout **12 rot / 4 grüne Kontrollen**, nach der Korrektur alle grün.

- Originaler Hostweg T40: gespeicherter Chat → Narratorrecord → Original-Extractorantwort → Repair → belegter bekannter Schmied → gültiges Angebot; Reload, wiederholte Extraktionsanforderung und alternative Antwort erzeugen keine zweite wirtschaftliche Handlung. Die Repairantwort ist ein gezieltes Testfixture mit einem durch die Originalprosa belegten `enter`, keine neue natürliche GLM-Antwort.
- Richtiger `enter` braucht keinen zusätzlichen Repair; leerer Laden stellt den Besitzer nicht automatisch wieder her. Erfundenes Händler-ID-Suffix erzeugt weder Person noch Geld.
- T49 akzeptiert die vorhandene Rüstung zum Originalgebot30cp; Verkauf und Wiederholung prüfen genau einen Geldzugang und einen Inventarabgang.
- T53: Die Besitzfehlablehnung entfällt. Der unveränderte Originalbericht zitiert nur „twenty-five“ ohne Währung und bleibt deshalb unter S2 offen. Ein korrigierter Bericht mit dem ebenfalls im Original vorhandenen Satz „I can give you twenty-five copper for it.“ erzeugt das gültige25cp-Gebot. **Kein neuer Preisfallback.**
- T21/T25/T61 prüfen beschreibende und bisher funktionierende Rollenbezeichnungen; abweichende Personen bleiben abgewiesen.
- Calls48/49/178 ergeben fünf Angebote und können regulär gebucht werden. Call179, andere Arten/Anchor/Level, falsches Jungtierziel und zwei Angebote für dieselben gezählten Ziele bleiben abgewiesen.
- Vollständige Kette auf Originalzustand T40:241cp → bekannte Schmiedbegegnung → Ersatzrüstung30cp verkaufen →271cp → Superior-Schwert260cp kaufen →11cp → ausrüsten. Erneute Annahme zahlt nichts; serialisiertes Event-Replay stimmt nach jedem Übergang exakt mit dem Ergebniszustand überein.

## 4. Replayabnahme

Die vollständigen Ausgaben von `.145` und `.146` wurden auf demselben historischen2235-Fälle-Korpus verglichen. **Genau sieben** Records ändern sich gegenüber `.145`; alle391 anderen bereits akzeptierten Einträge bleiben vollständig unverändert. `accepted_f146_vs_126.json` speichert die sieben neuen Fingerprints mit eigener Begründung und dem jeweils abgelösten `.145`-Fingerprint. Ein eigener Linientest erzwingt genau diese Menge. Kein pauschales Neuschreiben alter Fingerprints.

| Record | Begründete Änderung gegenüber .145 |
|---|---|
| `b17-warrior#126` | Abwesender Guild-Käufer löst Repair aus; archivierter Repair liefert weiter keinen gültigen Eintritt. Nur `extract.applied.repaired` wird true; keine wirtschaftliche Änderung. |
| `b18-rogue#328` | Gleiches bei Harlow: nur Repairkennzeichnung, keine automatische Anwesenheit/Verkaufsbuchung. |
| `b18-warrior#42` | Das gehaltene Template-Rüstungsteil wird zusammen mit der physischen Schlangenhaut erkannt. Das belegte100cp-Gebot wird gespeichert; noch keine Zahlung/Übergabe. |
| `b18-warrior#44` | Rüstung wird erkannt; gemeldete400cp bleiben ohne verbindlichen Gesamtpreis abgewiesen. Korrekte Preisrückfrage statt falscher Besitzmeldung, kein Geldfluss. |
| `b18-warrior#52` | Rüstung und Haut erkannt; „Ten the pair“ bleibt ohne Währung unverbindlich. Nur begründeter Ablehnungsweg/Preisrückfrage ändern sich. |
| `b19-mage#140` | Abwesender Potion-Verkäufer löst Repair aus; archivierte Antwort löst die Präsenz nicht. Nur Repairkennzeichnung, kein Kauf. |
| `b19-mage#151` | „the broker“ bezeichnet den richtigen gespeicherten Händler. Ausdrücklich angenommenes Gebot zahlt einmal4cp für fünf Schuppen und einen Zahn; beide vollständigen Stapel gehen an genau diesen Käufer. Vorher falsche Rollenlabel-Ablehnung. |

## 5. Technische Ergebnisse und Grenzen

**Final:** neue Originaltests **16/16** (auf .145 zwölf rot/vier Kontrollen grün), angrenzende Handels-/Guild-/Finanz-Hosttests **65/65** im ersten gezielten Lauf; vollständiges `npm test` **2635/2635**. `npm run replay:check`: **2235 Fälle, 398 exakt akzeptierte Abweichungen, 0 offen, 0 veraltet**, keine Replay-/Fold-/Validierungsfehler. Echter ST1.19-Standard mit Finanz-Persistenzteil **32/32**, Failsoft **37/37**, jeweils keine PageErrors. Der Standard zählt einschließlich der zusätzlichen `#pay`-/Edit-/Reload-/Swipe-/Regenerate-Kette13 Extractoraufrufe/33 Modellaufrufe, Failsoft15/39. Keine neue natürliche Kampagne gestartet.

**Browser-Mock-Smoke:** Sowohl auf sauberem `.145` als auch auf `.146` scheitert derselbe bereits vorhandene GenerateRaw-Prüfpunkt: zwei Interpreteraufrufe statt des im Mock erwarteten einen; die zweite Anfrage ist ein vorhandener Repair. `generateRawPath`/Requestliste werden dadurch false, die übrigen Checks und PageErrors sind unauffällig. Nicht als bestanden ausgegeben und keine Produktänderung als Workaround. Davon getrennt sind die echten ST-Smokes grün.

**Bewusste Grenzen:** Die semantische Reparatur muss das Modell tatsächlich korrekt liefern; der Hosttest beweist sichere Verarbeitung, keine Erfolgsquote für GLM. Die aktuelle Präsenz bleibt verbindlich, alte Angebote werden nicht neu bepreist, S1/S2 bleiben erhalten. Kleine lokale Verluste wie das in T16 falsch angeordnete Brotgeschenk sind nicht Teil dieses Patches. Kein neues Filial-, Reise-, Zahlungs-, Handels- oder Persistenzsystem. Nach technischem Gegenreview wieder natürliche Batches statt vorsorglicher Sonderfallserie.
