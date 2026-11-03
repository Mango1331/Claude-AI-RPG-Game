# Batch25 — unabhängiger Originalreview, Build .151

03.11.2026. Quelle: Chatupload `batch-20261102-154000Z.zip`. Produkt: **.151 / d4f281d6d2d9015864f9e2171beb66bc8ece82f2**, alle drei Originalruns sauber auf diesem Commit; aktueller Produkt-HEAD identisch. Einstieg 01/03 auf main gelesen. Keine Produktänderung, keine neue Testsuite und kein natürlicher Batch gestartet.

**Gesamturteil:** Zwei längere, formal integre Kampagnen, darunter eine reguläre E-Klassenannahme. Ein reproduzierbarer **P1-Runstopper durch die Verlagerung einer freien Zahlkarte beim Ortswechsel**. Kein Anlass für eine neue Finanzarchitektur oder pauschale Balanceänderung. Der .151-Fetchfix wurde hier nicht natürlich ausgelöst; der neue Klassenhinweis verhindert nicht jede Ablenkung des Testspielers.

## 1. Quellen und Prüfgrenzen

- ZIP: **96.493.892 Bytes**, SHA-256 `f2b0a9c408bb05847d9362f1adaaf61087cb274262ff3631950de21e2856934b`, CRC vollständig fehlerfrei.
- Originaldateien aller drei Profile geprüft: Chat/Records, Events, run/evaluation, Playerentscheidungen, Completion-Requests/-Antworten und Endursachen. Die drei Eventexports stimmen vollständig mit den Eventlisten der Chatrecords überein.
- Alle Eventrecords zusätzlich unabhängig reduziert und nach jedem Record mit `validateState()` geprüft. Separat echter `foldChat()` über die gespeicherten Nachrichten, einschließlich Zahlungsquellenprüfung. **Diese Prüfungen sind verschieden:** Ein lokal gültiger State kann weiterhin einen ungültigen Hostrecord besitzen.
- Warrior-I110 mit Originalvorzustand, Original-Extractorantwort und Originalprosa über aktuelles `applyWorld()` reproduziert und anschließend erneut gefaltet. Nur temporäre Untersuchungen, keine Änderungen am Archiv oder Produkt.
- I bezeichnet den nullbasierten Chatindex **ohne** JSONL-Metadatenkopf; T die gezählte Spielereingabe, nicht den Engine-Turn.
- Noch kein anderer Review dieses Batches auf main vorhanden. Die automatische `evaluation.json` wird hier kritisch geprüft, nicht als unabhängiger Beweis behandelt.
- Die ZIP wurde als Chatupload geprüft; **kein GitHub-Binär-Upload dieses Archivs behauptet**. Dieser Review ersetzt in einem späteren Chat nicht den Originalexport.

## 2. Ergebnisse

| Profil | Inputs / Engine-Turns | Fortschritt | Ende | Unabhängige Integrität |
|---|---:|---|---|---|
| Warrior | 56 / 52 | L6 | Technischer Stopp T56; Ursache bereits I110/T55 | Fold bricht vor dem ungültigen Replyrecord ab; lokale Statevalidierung allein erkennt den Fehler nicht |
| Mage | 169 / 142 | L16 erstmals T164; E-Angebote vorhanden, nicht angenommen | Regelgerechter Tod T169 | Fold und sämtliche geprüften Statezustände fehlerfrei |
| Rogue | 309 / 273 | L15 T290; Ironblade Cutthroat angenommen T309 | Regulär `done` | Fold und sämtliche geprüften Statezustände fehlerfrei |

**534 Inputs, 467 Engine-Turns, 6.956 exportierte Events.** Diese Eventsumme ist keine Behauptung, dass Warriors ungültiger Schlussrecord vollständig kanonisch anwendbar sei. Bei ihm zählt der Fold nur den gültigen Präfix.

Für diesen Batch: **1/3 technische Zwangsstopps, 1/3 regulärer Tod, 1/3 Zielabschluss; 2/3 fehlerfreie Endfolds.** Nicht als allgemeine Zuverlässigkeitsquote oder Klassenvergleich verwenden. Der Mage hat L15 überschritten: Die automatische Endauswertung markiert `open_run_level` wegen seines späteren Todes als nicht erreicht. Das ist eine aktuelle Endzustandsbedingung des Evaluators, kein Beleg, dass er nie Level 15 erreichte.

## 3. P1: Zahlkarte wandert in einen Erzählerrecord und blockiert den Fold

### Originalkette

1. **T54/I107:** „I eat bread and porridge at the inn, pay for it, then head to Mest's smithy …“. Planner: `pay` ohne Betrag und `go`. Die Engine eröffnet `dec.t51.1` mit `needs_amount`. I108 nennt zwei Kupfer, aber die Reise wird noch nicht abgeschlossen.
2. **T55/I109:** „I pay the two copper for breakfast, then head to Mest's smithy …“. Der Planner liefert korrekt 2 cp und `journey.continue`. S1 erzeugt `dec.pay.t52.1`, `route:free`, `needs_confirmation`, am Drowned Ox, Quelle **message109/input_hash a29deb6f**. **Keine Abbuchung**: Ein freier Zahlungswunsch allein ist keine #pay-Bestätigung.
3. **I110:** Der Narrator erzählt ausdrücklich, dass die Münzen zurück in den Beutel gehen und Alaric zum Schmied reist. Der Extractor meldet die gültige Ankunft und Händlerangebote. Kein Zahlungsdelta und kein Spieleredit.
4. **`world.js:arrive()`, um Zeile2316:** Der allgemeine Mitnahmeweg für offene Entscheidungen verschiebt gleichturnige Entscheidungen an den Ankunftsort. `payment` wird dabei nicht wie ortsgebundener Handel ausgeschlossen. Er emittiert ein weiteres `decision.opened` für dieselbe freie Karte, nun **am Schmied**, weiterhin mit Quelle109. Dieses Event landet im **Assistantrecord110**.
5. **`host.js:paymentInputError()`, Zeilen57–73:** Freie Karten müssen an ihrer tatsächlichen, unveränderten Spielernachricht hängen. Record110 ist eine Erzählernachricht ohne `input_hash`; der Fold meldet „payment input changed“. Die Worte wurden tatsächlich nicht editiert — die diagnostische Formulierung führt hier in die Irre.
6. **T56/I111:** Der Spieler lehnt die unattraktiven Angebote sinnvoll ab und möchte weiter. Die Runtime stoppt vor neuer Engineausführung. Der Runner endet nach etwa20,8s als `ui / no reply after the message`.

### Ursache und Auswirkung

**Bestätigter Integrationsfehler, kein Bedienungsfehler.** Die Reisemitnahme einer Entscheidung widerspricht dem S1-Vertrag „freie Karte verfällt beim Ortswechsel“ und ihrer Bindung an die Spielernachricht. Der Fold-Schutz handelt korrekt. Das kann auch ohne jede #pay-Ausführung geschehen. Es fehlen keine englischen Schlüsselwörter; ein Preisparserfix wäre sachfremd.

Der gültige Prefix vor I110 ist fehlerfrei. `applyWorld()` erzeugt aus den Originaldaten erneut die verlegte Karte; der anschließende Fold scheitert an genau I110. Entfernt man ausschließlich dieses erzeugte Verlagerungsevent **temporär im Untersuchungsmodell**, ist der Fold wieder fehlerfrei. Das ist ein Ursachenbeleg, keine Reparatur des Nutzerarchivs und keine Produktimplementierung.

Geld bleibt geschützt: Wallet52cp, keine Frühstücksabbuchung, keine doppelte Zahlung. Allerdings sind der neue Replyrecord und seine übrigen Änderungen nicht als vollständig gültiger Verlauf nutzbar. Der Stopp ist daher batchrelevant. Dass alle lokalen `validateState()`-Prüfungen grün sind, hebt den Hostfehler nicht auf.

### Empfohlener enger Fachfix

- Im vorhandenen Arrival-Entscheidungsloop eine freie, quellengebundene Zahlkarte **schließen/verfallen lassen statt umhängen oder erneut öffnen**. Es darf kein neues Kartenangebot für den alten Geber am neuen Ort entstehen.
- Bestehende zielbezogene Kauf-/Verkaufsentscheidungen, Registrierung und Ankunftsautorisierung erhalten. Nicht pauschal jede Entscheidung bei jeder Szene löschen.
- `paymentInputError`, tatsächlicher Inputhash, Quellenidentität und atomare #pay-Buchung **nicht lockern**. Ein Assistantrecord darf nicht durch ein nachträglich erfundenes `input_hash` zur Spielerquelle werden.
- Original-I109→I110 als Hostintegration: Weltantwort anwenden, gespeicherten Assistantrecord erneut falten, gültigen nächsten Spielerzug durchführen. Erwartung: Karte verfallen, 0cp Änderung, korrekte Ankunft, kein Foldfehler.
- Gegenfälle: #pay vor Abreise zahlt einmal; #pay nach Ortswechsel zahlt nicht; zwei Empfänger; Statuspanel ohne Bewegung erhält die Karte; echter Source-/Confirmation-Edit blockiert weiterhin; gültige kombinierte Reise/Käufe bleiben möglich; Reload/Swipe und Event-Replay.

Die Runtime prüft in `applyExtraction()` den **vorherigen** Fold und speichert dann die vom World-Pfad erzeugten Events. Der vorliegende Erzeuger verletzt erst dabei den Hostvertrag. Eine zusätzliche Prüfung des vollständigen Kandidatenrecords wäre eine getrennte Sicherheitsoption, ersetzt aber den falschen Arrival-Übergang nicht. Aus diesem einzelnen, exakt lokalisierbaren Defekt folgt kein Bedarf für ein neues Persistenzframework.

Der .151-Produktdiff änderte weder diesen World-Loop noch den Hostguard. **Keine neue .151-Regression belegt.** Es ist eine vorhandene, jetzt natürlich getroffene Lücke zwischen Reisemitnahme und S1-Quellenbindung.

## 4. Modellfehler, Recovery und Board

- **Kein Planner-Transportausfall** in den drei gespeicherten Verläufen. .151 bleibt dafür mock-/hostgetestet; dieser Batch liefert keinen neuen natürlichen Fetch-Erfolgsnachweis.
- **Rogue T85/I170:** Extractor bleibt trotz begrenzter Empty-Recovery ohne gültiges JSON; eine der archivierten Antworten endet mit `finish_reason:length`. Der Worldbericht wird nicht angewandt, die bestehende sichere Fortsetzung funktioniert. **T202/I403:** Planner kann „Three seven“ nicht sicher als Geldbetrag belegen; auch hier keine Engineausführung und sichere Fortsetzung. Insgesamt zwei sichere Fortsetzungen und regulärer Endabschluss.
- Mage hat drei angewandte Extractor-Transportrecoveries und eine angewandte Narrator-Recovery. Rogue hat eine angewandte Extractor-Transportrecovery. Keine Erweiterung der Budgets oder zusätzlichen Retries aus diesen erfolgreichen Fällen ableiten.
- Archiviert sind **161/478/900 Spielmodellrequests** (W/M/R). Längste gemessene Narratoranfragen: W32,5s, M243,8s, R381,5s. Provider-/Serverfehler und Wartezeiten bleiben relevant; sie wurden hier überwunden und sind keine nachgewiesenen Engine-Buchungsfehler. Ohne Finish-/Usage-Beleg keine pauschale Reasoningbudget-Diagnose.
- **Rogue T4/I7 und T7/I13:** Zwei Boards scheitern einschließlich Repair am schwachen Einstiegseinzelgegner. Originale: aquatic-Gnasher, Repair armored_beast; später giant marsh leech/aquatic. `guild.js:simpleListingWhy()` verlangt für diesen Level1/minor/qty1-Pfad ein zulässiges Intro-Anchor mit HP≤35/ATK≤10. Die Modellwahl erfüllt das nicht. **Korrekte Schutzablehnung mit schwacher Generator-/Repair-Zuverlässigkeit**, keine fehlgeschlagene Registrierungsauszahlung. Später wird ein Board veröffentlicht. Falls wiederkehrend, Intro-Auswahl aus vorhandenen geeigneten Anchors eindeutiger anbieten; nicht den Schutz pauschal entfernen. Kein zweiter P1-Patch allein hieraus.
- Mage T35–60: wiederholte Erzählererfindungen von Dungeon-Kreaturen werden abgewiesen. Das schützt die Slotpopulation, erzeugt aber erzählerische Reibung. Kein Beleg für Doppelspawn. Nicht automatisch jede abgewiesene Figur als Enginefehler zählen.

## 5. Kampf, Gear und Finanzen

**Kampf:** 4/17/25 abgeschlossene Encounters (W/M/R); 4/16/25 Siege und ein Mage-Tod. Warrior hat mehrere ungültige Cleave-Eingaben außerhalb ENGAGED; Rogue versucht mehrfach einen Dolchwurf über die mechanische Reichweite des Basic Attack. Die Ablehnungen buchen keinen erfundenen Fernangriff. Mehrfaches Umformulieren ohne geänderte Reichweite ist zunächst Testspielerbedienung; kein Anlass, die Reichweiten still zu erweitern.

**Mage-Tod:** T164 tötet Arcane Wave vier sichtbare Wölfe und bringt L14→L16. Statt die offenen Klassenangebote zu prüfen, verfolgt er weitere Wölfe zur Höhle. Vor T168 sind vier Höhlenwölfe bekannt. Er schießt einzeln, tötet einen, die drei Überlebenden handeln gemäß Reihenfolge: Round1 und anschließend Round2, Initiative19 gegenüber PC10. Die sechs Treffer sind **keine sechs Angriffe in derselben Runde**: 22+26+25 und 21+27+24, HP155→10. T169 tötet sein nächster Bolt einen weiteren Wolf; der nächste Wolf handelt in Round3 und verursacht23, HP10→0. Das passt zur First-Strike-/Turnorderlogik in `combat.js`, kein nachgewiesener zusätzlicher Phantomangriff. Einzelziel statt AoE, niedrige Initiative und erneuter Angriff mit10HP erklären den Tod. Daraus folgt weder ein pauschaler Mage-Nerf/Buff noch automatisch eine Fluchtgarantie.

**AoE:** 24 tatsächlich protokollierte Flächenaktionen (W4/M12/R8); kein NPC in diesen AoE-Trefferlisten. Das ist ein positiver Buchungsbefund, aber ohne gesonderte Same-band-Präsenzrekonstruktion kein universeller Beweis aller Friendly-Fire-Gegenfälle.

**Gear funktioniert:** Mage kauft/rüstet Common→Fine Staff und Superior Robes aus; am Ende MATK14 sowie DEF4/MDEF5 durch Gear. Rogue erreicht Superior Dagger und Superior Jerkin (ATK18, DEF4/MDEF5). Kein erneut bestätigter Paket-Auswahlfehler wie „hand“/hand-axe. Warrior bleibt bis zum frühen Stopp auf Startergear; die Ablehnung eines schwächeren/gleichwertigen Angebots ist vernünftig und kein defekter Kauf.

**52 Transaktionen:** 25 Käufe einschließlich drei Registrierungen, 13 Verkäufe und 14 Guildauszahlungen. Keine doppelte Questtransaktion oder identische doppelt gebuchte Angebots-/Zeilenauswahl gefunden. Ledger-Endstände W52/M917/R447cp stimmen mit Start50 plus tatsächlich protokollierten Änderungen überein. Kein natürlich gebuchtes #pay oder eigenständiges Geldgeschenk als positiver Nachweis in dieser Transaktionsgruppe. Der Warrior-Stopp betrifft die **Karte/Persistenz**, keine verlorenen zwei Kupfer. Aus diesen Daten ist „Kaufen funktioniert immer noch nicht“ nicht haltbar.

## 6. Tempo, Skills und Runner

- Mage überschreitet L15 bereits nach164Inputs, Rogue erreicht es nach290. Ein allgemeiner XP-Mangel ist damit nicht belegt. Unterschiedliche Gegnersuche, Questketten, Handel, Gespräche, Refusals und niedrige Gegnerlevel erzeugen stark verschiedene effektive Progressionsraten.
- Rogue beendet E nach19 weiteren Inputs. Gegenüber Batch24s lange ignorierten Angeboten ist das kürzer; der Hinweis garantiert aber keine Priorität. Er verfolgt noch den fünften Adder und greift stattdessen einen anders benannten großen Serpent an. Die Engine bleibt bei **4/5** und verweigert eine unberechtigte Abgabe. Eine künstlich geschenkte Questvollendung wäre der falsche Fix.
- Mage ignoriert seine E-Angebote für die restlichen fünfInputs und stirbt. Die im neuen Code übergebene Erinnerung ist keine automatische Entscheidung; die originalen Playerlogs archivieren nicht den vollständigen jeweiligen Requestprompt. Daher keine unabhängige Behauptung einer im Archiv gelesenen Reminderzeile. Die Klasse wird weder von Engine noch Runner automatisch angenommen.
- Endproficiency: Mage BoltP3/8PP und WaveP3/30PP; Rogue BasicP3/44PP, FanP2/15PP, EvasiveP1/0PP; Warrior BasicP1/36PP, CleaveP1/54PP, GuardP1/0PP. Keine dieser regelmäßig gespielten Fähigkeiten erreicht hier P5; eine ausgebliebene Evolution ist somit kein belegter fehlender Buchungsschritt. Defensive Skills, die nicht wirksam eingesetzt werden, müssen nicht nebenher wachsen.
- Jetzt keinen weiteren umfangreichen Bedienleitfaden ergänzen. Die freien Spielerentscheidungen und die zwei erfolgreichen langen Verläufe liefern weiterhin brauchbare Daten. Nahkampf-Reichweite, optionale Käufe und offene Questtallies nicht mit immer neuen erzwungenen Routinen umschiffen.

## 7. Priorität und nächste Abnahme

1. **P1 vor nächstem Batch:** Ortswechsel einer freien Zahlkarte an der Erzeugungsstelle korrigieren; Originalkette einschließlich gespeichertem Reply/Fold/Weiterzug regressieren. Keine Lockerung des Geld-/Editguards, kein neuer Parser.
2. **Weiter beobachten:** Intro-Board-Repair und narrative Phantom-Dungeonwesen; erheblich für Spielgefühl, hier aber lokal überwunden. Bekannte Providerlatenz getrennt messen.
3. **Beibehalten:** XP×5, Startwerte, .149-PP/LP, AoE, Gearpreise, Klassenevolution und die begrenzte .151-Erinnerung. Keine neue Balancefreigabe durch diesen Review.

**Batch25 ist nicht technisch vollständig bestanden.** Warrior hat einen echten, reproduzierten Hostintegritätsstopper. Mage-Tod und Rogue-Endabschluss dagegen nicht als technische Fehler umdeuten. Nach einem begrenzten Fix kann die natürliche Serie weitergehen; keine nächste umfassende Finanz-Gegenreviewspirale.
