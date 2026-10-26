# Run 22 – letzter natürlicher .98-Einzelrun vor dem Neunfach-Batch

**Originaldatei:** 20261026-132758Z-current_test.zip · **11.874.438 Bytes** · **SHA-256 a7a8494e204ed9dae30b2f8d9bddd269b31a8e30a2c75478f8a2f1486193735f**. ZIP mit 15 Einträgen vollständig geöffnet; CRC-Test ohne Fehler. Das unveränderte ZIP liegt als Chat-Anhang vor. **Ein Binärupload auf main ist derzeit NICHT bestätigt**; keinen erfundenen Git-Link zur ZIP verwenden.

**Lauf:** 26.10.2026 · Engine **4.3.0-c.6.6.98**, aktueller Produktbranch beim Review HEAD 37c4be931b52600c28583e79528f362a74023924 (Runnerbatch hinzugefügt, Engine weiterhin .98). SillyTavern 1.19, Ruleset 2, echte neue Mage-Kampagne mit **Arcane Bolt + Flame Lance**, GLM-5.3-Flash über Custom-Endpoint, stub:false, keine Fixture. Geprüft: run.json, evaluation.json, report.md, 129 Ereignisnachrichten mit insgesamt 1.032 Engineereignissen, 203 LLM-Completion-Rohantworten einschließlich T73-Repair, relevante Spieler-/Narrator-Originaltexte; dazu gegen Produktcode geprüfte Angebots-, Anzeige-, Repair- und Boardpfade. **Keine neue Node-/ST-Testausführung, keine Produktänderung.** Narratorbehauptungen sind keine Buchungsnachweise.

## 1. Ergebnis

| Kennzahl | Ergebnis |
|---|---|
| Eingaben, Engine-Turns | **73 Spielerinputs**, **63 turn.begun**; Erstellung/System anders gezählt |
| Dauer | **32:16 min** Gesamt, rund 25:44 Spielphase |
| Figur | Mage **L1 → L5**, **12 Rest-XP**, 1012 kumulierte gebuchte XP (652 Kampf, 406 Quests); HP **115/125**, MP **152/264** |
| Kampf | **8/8 Siege**, acht Einzelgegner, kein PC-Tod |
| F-Gegner | u. a. Bog Striders **L6, L6, L7** mit festem population_at am gebuchten Eel-Weir-Site; zusätzlich L1/L2-Tiere anderer Herkunft |
| Quests | **Zwei echte Gildenabschlüsse**: Adder +15 cp / 46 XP; Bog Striders +90 cp / 360 XP; READY/Proof/Queststatus eventbasiert |
| Ökonomie | Engine-Endwert **128 cp**; wegen nachgewiesener **doppelter 6-cp-Zahlung** wäre ohne Bug **134 cp** gebucht worden |
| Skillgrowth | **Flame Lance 18 PP** in einem tatsächlich qualifizierenden Kampf; keine neue Technik/Passive belegt |
| Technik | **integrity OK**, 0 PageErrors, 0 ServerErrors; **60 extract.applied**, **ein extract.failed** |
| LLM-Aufrufe | **203**: 64 Planner, 61 Narrator, 74 Extractor, 4 Board; **kein** transport/provider-failed, alle finish=stop |
| Abbruch | **T73 extractor_failed**, 21.469 ms Extractor einschließlich einem Repair; unbestätigte Narrator-Reise NICHT in World übernommen |

**Wichtig:** Dieser Run widerlegt die neue F-Balance nicht. Die Habitatkorrektur .98 funktioniert in mehreren konkreten höherstufigen Begegnungen. Er weist aber einen ernsthaften doppelten Kontobelastungsfehler und einen weiteren natürlichen Extractor-Abbruch nach.

## 2. P1 – dieselbe Unterkunft zweimal bezahlt (T48, Assistantereignisse i112)

Die ursprüngliche Kaufentscheidung wird über mehrere Züge erneut formuliert, weil der Preis-/Gegenparteipfad zuvor noch offen war. Der Zustand enthält u. a. **dec.t47.1** und **dec.t48.1**, jeweils kind=purchase, max_cp=6, Ort Guild-Hall, unspezifizierter Verkäufer. Der neu anwesende Lodging-Clerk nennt in i112 ein gültiges kombiniertes Angebot **offer.t112.4, line l3, Preis 6 cp**.

Die **eine** offer.created-Nachricht setzt anschließend **zwei** Kaufbuchungen ab:
- Erste Kette: transaction.completed(offer.t112.4/l3, 6 cp), coin.changed **50 → 44**, service.granted(lodging), offer.closed(accepted), decision.closed(dec.t47.1).
- Zweite Kette **in derselben Assistant-Antwort**: dieselbe transaction.completed und dieselbe service.granted, coin.changed **44 → 38**, wieder offer.closed(accepted), decision.closed(dec.t48.1).

Die Engine zeigt **integrity OK**, obwohl zweimal 6 cp für exakt dieselbe Leistung abfließen. Die folgenden Züge können die Zahlung nicht weginterpretieren; die beiden Eventketten sind persisted.

**Codeursache bestätigt:** src/v4/world.js, offerLines(), erzeugt ein gültiges neues Angebot und läuft dann über alle passenden offenen Entscheidungen aus **s.decisions.filter(...)**. Nach dem ersten **bookPurchase()** und **offer.closed(accepted)** läuft die **zuvor ausgewählte Entscheidungsschleife** weiter und bucht dieselbe Angebots-ID nochmals. Die ältere Entscheidung ist zudem nicht zwingend durch die neue spezifische Kaufentscheidung abgelöst. Das ist keine Performance- oder Anzeigeursache.

**P1-Folgefix:** Für genau ein Verkaufsangebot nur eine passende, zulässige tatsächliche Annahme/Gegenpartei und **höchstens eine** Buchung. Für zeitlich wiederholte deckungsgleiche Kaufwünsche eine klare Priorität (z. B. jüngste noch offene ausdrückliche Entscheidung) und ältere deckungsgleiche Wünsche abschließen/supersedieren. Die übrigen unabhängigen Käufe nicht pauschal schließen; mehrere echte Positionen innerhalb einer bewusst bestätigten Transaktion weiterhin gemeinsam erlauben. Replays/Swipes dürfen weder eine zweite Zahlung noch eine zweite Dienstleistung auslösen. Bereits gespeicherte historische Buchungen **nicht still migratorisch umschreiben**. **Rotfall:** Originalzustand vor i112 gegen .98 und identisches Angebot, Kontostand 50 → **44**, genau eine Transaktion, ein Service, keine zweite akzeptierte Entscheidung.

## 3. P1 – T73: Narrator erfindet Ortswechsel, Repair scheitert an Szenenchronologie

**Spieler:** „I'll wait for Hetta then. Is there somewhere nearby I could compare staff and robe prices in the meantime?“ Der Planner autorisiert **nur activity.wait für Hetta, max. 120 min**, **kein GO, kein ROAM, kein Angebot akzeptieren**. Die zweite Hälfte ist eine Informationsfrage. Vor Zug und Antwort steht die Engine im **loc.alderwatch.guild_hall**.

**Narrator T73 / i146:** Erzählt ohne Spielerentscheidung, Alaric sei zum Markt gegangen, habe bei Marda drei Roben und bei Tovan zwei Stäbe mit Preisen verglichen, sei zum Guild-Hall-Bereich zurückgekehrt, habe Zeit verstreichen lassen und sei später zu Hetta in deren Nebenraum gewechselt. Das ist **mehr als eine bloße NPC-Auskunft und Wartefolge**. Gerade die freiwilligen Ladenbesuche sind nicht Engine-autorisiert; es erfolgt kein Kauf. Die Erzählung kann Richtung und mögliche Angebote nennen, darf aber nicht entscheiden, dass der PC die Läden tatsächlich aufsucht.

**Extractor Original Call 202:** gültig transportiert in 12.104 ms, mit finaler scene=neuer Hetta-Nebenraum, berichtet Ortsinformationen, zwei nicht anwesende Händler, **offer-Deltas**, Zeit, Hetta und eine letzte arrive-Ankunft. Die Deltas zu früheren Angeboten und lokalen Aussagen tragen keinen eigenen Ausgangsort. Validator meldet u. a. **$.deltas[3].scene**, **$.deltas[5].scene**, **$.deltas[7–9].scene** und eine verspätete lokale Introduction.

**Ein Repair, Call 203:** 9.346 ms, finish=stop. Der Repair macht aus zuvor nur bekannten entfernten Händlerplätzen zusätzliche **arrive**-Deltas in den Markt und zurück; erst anschließend folgt die Ankunft im Nebenraum. Trotzdem fehlen für mindestens zwei frühe Deltas korrekte explizite Szenen. **extract.failed** mit **$.deltas[3].scene / $.deltas[4].scene**. Keine Buchung der finalen, nicht bestätigten Reise.

**Wichtig zur Ursache:** Ein reiner Schema-Fix durch Hinzufügen beliebiger scene-Werte wäre falsch. Bereits die erste Erzählung verletzt Player Agency; das Reparaturmodell versucht durch erfundene Arrivals die Erzählung zu retten. Die Engine muss **nicht autorisierte freiwillige Reisen ablehnen**, und der Extractor muss unter dieser Schranke aus einem problematischen Reply die **unabhängigen zulässigen Weltinformationen** sauber voneinander trennen können. Genau einmaliger Repair, kein dritter LLM-Aufruf. Wird die Antwort weiterhin ungültig, kein falsches Commit; die Person darf ihren tatsächlichen Engineort nicht verlieren.

**P1-Folgefix:** Die Narrator-Anweisung bei einem reinen Frage+WAIT-Turn auf NPC-Antwort, richtige Wartezeit und zulässige NPC-Eintritte begrenzen, keine vom Spieler nicht beschlossenen Markt-/Raumwechsel, kein Phantomhandel bei abwesenden Dritten. Extractor/Repair müssen für den Originalfall **Startszene**, explizit erreichte Zwischenorte, nachweisbar autorisierte GO/ROAM/forced_by und zeitliche Reihenfolge erkennen; remote Preisinfos als Informationen statt bindende Verkäufe vom nicht anwesenden Anbieter. Fehlgeschlagener Travel darf nicht durch add-arrive/forced_by-Tricks gültig werden. Bei gültiger abgetrennter Teilantwort ausschließlich zulässige, bestätigte Deltas buchen; sonst sauber fail-closed. ST-Swipe/Reload und ein systemischer, nicht beschönigter Hinweis bei Welt-/Erzählwiderspruch.

## 4. P2 – World-/Ortskontinuität während wirklicher Reise

**T58/59, i134/i136:** Der Spieler bricht zum Ort Alderwatch auf, der Narrator führt unterwegs einen liegen gebliebenen Karren mit Fahrer und Pferd ein; im Folgeturn hilft der PC ihm, ehe die Reise weitergeht. Für den Zwischenhalt wird aber **keine entsprechend gültige World-Ankunft/Szene** gebucht. Viele Deltas (NPC, Pferd, Straßenhindernis, Thread, Memory) werden zu Recht als **scene_context** verworfen. Der Erzähler spricht später vom Mann Dole, die Engine kennt ihn nicht als etablierte Person.

**Befund:** Schutz vor Weltfakten an nie bestätigten Orten funktioniert; **Spielgefühl- und Kontinuitätslücke** entsteht durch fehlenden kanonischen Zwischenhalt. Im großen Szenenpatch kontrolliert prüfen, ob der bereits autorisierte GO eine **tatsächliche, in der Antwort etablierte Zwischenstation** in der vorgesehenen Delta-Reihenfolge tragen darf. Keine neuen erfundenen Stopps allein aus beiläufiger Kulisse; kein Spielertravel aus einer bloßen Frage. Das ist **kein** Anlass, die scene_context-Warnungen pauschal auszuschalten.

## 5. P2 – zurückgestellte Probleme aus vorigen Runs, jetzt wieder relevant

**A. GO → SEARCH (Run 21, T90):** Engine bucht eine erfolgreiche Suche mit check.recorded.at=**Ausgangsort**, obwohl die Spielerhandlung die Suche ausdrücklich **nach einer noch unbestätigten Ankunft** durchführen will. Sequenzierung von GO und Ortsprüfung konkret sicherstellen. Wenn die Reise nicht erreicht ist, darf der Erfolg nicht als Zielortsprobe ausgegeben werden. Zielgebundene Probe erst nach bestätigter Ankunft bzw. nach dem bestehenden regelkonformen Folgeschritt; dabei keine erfundene Route/Ankunft.

**B. Board-Repair-Diagnostik (Run 21 T5 und dieser Run T6):** parseBoard() erfasst präzise Ablehnungsgründe pro Listing, aber der globale Novice-Invariantfehler **„Intro-Jagd fehlt“** verdrängt diese im Repair-Prompt. Diesmal Original T6: Erstversuch mit Dreiergruppe statt Einzelintro; Repair macht einen Einzelfrosch, aber die Habitatschwelle **max HP 35 / ATK 10** für einen schwachen L1-Kontakt wird verletzt; der Reporter protokolliert den präzisen Ausschluss erst beim endgültigen board.failed. Erst eine neue Boardanfrage T7 erzeugt die fünf gültigen Einträge. **src/v4/runtime.js:generateBoard** reicht bei globaler p.errors-Antwort p.refused nicht weiter. Den vorhandenen fachlich korrekten Grund mit an den **einzigen bestehenden** Repair geben, nicht Boardschema oder zusätzliche Retries ändern.

**C. Stale-kanonische Shopanzeige (seit .96 als P2 beobachtet):** src/display.js zeigt ein kanonisches Primer-Angebot im richtigen Guild-Hall auch dann als SHOP-Karte, wenn **dessen gespeicherter Verkäufer nicht präsent** ist. src/v4/commands.js lehnt den Kauf in diesem Fall bereits korrekt ab. Der aktuelle Endscreen nennt alle fünf Primer, obwohl die Handlung ausdrücklich sagt, dass Hetta/Materialclerk nicht da ist. **Nur die Verfügbarkeits-/Präsentationsregel der Karte** angleichen, nicht die Händlerberechtigung lockern; historischer offener Offerbestand darf bleiben.

**D. Szenenfortsetzung/NPC-Kontinuität:** i134/i136 sowie die alten World-/Heranziehungsfälle sind Gegenbeispiele zur unautorisierten Nebenszene. Ein bereits verworfener NPC darf keine abhängigen Fakten erhalten; reale bekannte Personen sollen über enter statt wiederholtes person.new zurückkehren. Bereits vorhandene Schutzregeln erhalten.

## 6. Keine vorschnellen Balancing- oder Scheinfixes

- Der Bog-Strider-Vertrag war nach den ersten drei im **separaten Reed Flats landing / Bend** besiegten Level-1-Tieren mechanisch noch **0/3**; die Habitatbelege fehlen dort. Die späteren Kämpfe am tatsächlichen gebuchten **realm.valedorn_crown.eel_weirs_reed_flats** erbrachten **L6, L6, L7** und den berechtigten READY-Abschluss. Diese Herkunftstrennung ist **beabsichtigt**; nicht alle Tiere derselben Art reichsweit mitzählen. Dokumentierte Habitatfriktion muss zuerst anhand klarer Orts-/Identitätsereignisse geprüft werden.
- Einmal **18 PP Flame Lance** aus tatsächlich bedrohlichem Kampf ist korrekt; sehr schnelle Solo-Kills ohne gegnerische Handlung qualifizieren oft nicht. Keine Anpassung an Growth-Schwelle nur wegen weniger PP.
- Kein umfassender Ausrüstungskauf. Geld-/Skillökonomie aufgrund eines Zahlungsbugs nicht nachkalibrieren.
- Manche 84 delta.rejected-Ereignisse schützen absichtlich vor unautorisierten Orts-, Shop-, NPC- und Questbuchungen. Nicht generell akzeptieren, nur um die Quote zu senken.
- Board-Erzählungen fremder, angeblich vergebener Quests sind **keine neue kanonische Quest**. Die vorhandene Engine-Authority schützt bereits.
- Die .98-Engine-Habitatkorrektur und .98-Tests sind nicht widerrufen. Kein zweiter Habitatumbau, keine Save-Migration.

## 7. Patchplanung

**Ein konsolidiertes technisches Vorbatch-Paket** mit klar getrennten Teilgebieten und Regressionen. Reihenfolge: (1) **P1 Kauf-Idempotenz**; (2) **P1 T73 Narrator/Extractor-Autorität und geordnete Szenen**; (3) **P2 GO→SEARCH/echte Zwischenhalte**, nur eng testbar; (4) **P2 Board-Repair-Diagnosen**; (5) **P2 kanonische Shopkarten-Präsenz**. Keine großen neuen Preis-/Monster-/Skill-/Questdesigns. Detaillierter Implementierungsauftrag: [PATCH_PRE_BATCH_TECHNICAL_RUN22.md](../../patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md).

**Abnahmebedingung vor dem Neunfach-Batch:** reproduzierbare Rotfälle gegen aktuellen Dev-HEAD für die P1s und priorisierten P2s, grüne Fälle danach; alle bestehenden 1899 Tests plus neue Regressionen (Zahl nicht vorwegnehmen), betroffene Handels-/World-/Guild-Suites und echter ST1.19-Smoke. Keine erfundenen Testerfolge. Versionsnummer um **einen** Build erhöhen, nur wenn Produktcode wirklich geändert und getestet wurde. Runner-Batch-Logik nicht umbauen; kurze normale neue Kampagne zur Kontrolle, dann erst der Neunfach-Batch.
