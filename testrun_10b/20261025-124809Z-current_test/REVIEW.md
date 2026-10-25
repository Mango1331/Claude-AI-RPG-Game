# Run 15 – unabhängiger Review des natürlichen 10B-Laufs auf Build .87

**Datum:** 25.10.2026  
**Run-ID:** 20261025-124809Z-current_test  
**Produkt:** Avereth Engine 4.3.0-c.6.6.87, Commit 1584dd735c19, Ruleset 2 / V4-C  
**Originalexport:** 20261025-124809Z-current_test.zip, 15.010.159 Bytes, SHA-256 7a251693c750643116a8e298f248b4c2b3393003009196ba9cdff10afbea3032  
**Integrität:** ZIP-CRC vollständig geprüft, kein fehlerhafter Eintrag. Runner-Integrity: OK; Geheimnisscan laut Runner sauber.  
**Prüfweise:** Originalreport, ZIP-Dateiliste, JSONL-Spielchat, ausgefaltete Engine-Events, Player-Entscheidungen sowie gezielte Produktcodeprüfung. Narrative Behauptungen und Kommentare des Testspielers gelten nicht ohne Eventbeleg als Engine-Fakt. **Keine Produktänderung durch diesen Review.**

## 1. Gesamturteil

**100/100 Eingaben, regulär abgeschlossen (done), kein endgültiger Extractor-Abbruch, kein Spielertod.** Laufzeit 54:58 Minuten; 88 tatsächliche Engine-Turns und 1.405 Events. Drei gewonnene Kämpfe mit insgesamt **sieben tatsächlichen Kills** (3 Crystal Beetles, 1 Bog Strider, 3 Mineral Slimes). Die drei angenommenen Gildenjagden wurden jeweils **READY → COMPLETED** und bei gültiger Gildenabgabe einmal ausgezahlt: **40 + 30 + 70 = 140 Kupfer**. Level 1 → 3, Endstand **224 XP innerhalb Level 3**. Ein seltener Passive wurde tatsächlich freigeschaltet und angenommen; Fortschritt für Flame Lance ist gebucht. Kein neuer Skill und keine erfolgreich mechanisch angelegte neue Rüstung.

**Hauptbefund:** Der korrigierte Quest-/Kampfkreislauf ist erstmals über einen ganzen natürlichen 100-Eingaben-Lauf spielbar. Der Handels-/Ausrüstungskreislauf ist dagegen noch nicht zuverlässig: ein **doppelter Kaufabzug** und eine **inhaltlich falsche Angebotsannahme** sind anhand der Buchungsereignisse bestätigt. Wiederholte nicht autorisierte Schauplatzwechsel und unrealistische Beschreibungen nicht gebuchter Geschäfte beeinträchtigen das Spiel. Keine generelle Architekturfreigabe aus nur einem Lauf ableiten.

## 2. Positive belegte Mechanik

| Bereich | Originalbeleg | Bewertung |
|---|---|---|
| Neues 4+1-Board | T6, Eventnachricht i11: genau **fünf** quest.created/board.shown, vier Jagden und eine Glimmerdeep-Räumung; keine Lieferung. Neues Tagesboard T35, i69/i70 ebenfalls fünf passende Angebote, mit einem Repair. | Die vorläufige Aussetzung neuer Delivery-Angebote ist im natürlichen Lauf bestätigt. Der Testspieler schrieb einmal „sechs Verträge“; die kanonische Zahl beträgt fünf. |
| Annahme und Zähler | T7 Annahme Crystal Beetles, T13 nach drei echten Kills READY; T16 in Glassmere 40 cp und 46 Quest-XP, COMPLETED. | Positiver End-to-End-Gildennachweis. |
| Weitere Gildenzyklen | Bog Strider T36/T48/T49, Auszahlung 30 cp / 46 XP; Slimes T64/T72/T74, Auszahlung 70 cp / 120 XP. | Drei vollständige Abgaben, keine doppelte Gildenauszahlung. |
| Kampf / Progression | enc.t10 drei Gegner / 216 XP; enc.t40 ein Gegner / 24 XP; enc.t60 drei Gegner / 72 XP. Levels 2/3, Attributpunkte zugeteilt. | Sieben Kills und 312 Kampf-XP im Eventpfad, keine frei erfundenen Siege. |
| Passive | Angebot nach enc.t10 (T13); tatsächliches passive.gained und growth.decided erst T45, i89. | Mechanische Vergabe funktioniert; Nutzerführung zur Annahme ist umständlich (siehe unten). |
| Loot / Verkauf teilweise | Auto-Loot für Beetle-, Strider- und Slime-Materialien; u. a. Venom Gland T25/T62 zu je 120 cp, Gel T78 zu 10 cp, Core T82 zu 120 cp. | Inventar und mehrere bezahlte Verkäufe funktionieren. |
| Recovery/Host | 86 extract.applied, neun Extractor-Reparaturen, eine erfolgreiche Extractor-Transport-Recovery bei T86, eine Planner-Reparatur; keine PageErrors. | Kein endgültiger Hänger; Erfolg belegt nicht fehlerfreie semantische Extraktion. |

Der natürliche Lauf übt keine formalen Privatquests aus. Die spezifische alte Kombination aus Dungeonjagd plus zusätzlicher Räumung kommt auf den beiden Boards vor; sie belegt zulässige gleichzeitige Angebote, aber **kein tatsächliches Dungeon-Clear-Turn-in**. Eine vollständige Dungeon-Räumung und die .85-Brast-Identitätskette bleiben praktisch ungetestet.

## 3. P1 – Doppelte Abbuchung einer einzigen Ausrüstungsanschaffung (T97 / i193)

**Spieler:** „The eight-silver pair then, sixpence off with my own straps. I hand over the straps and the coins and ask her to fit them on now.“

Der Planner übersetzt **eine** Anschaffung in drei Commands: Seq 1 offer.accept für lacquered shin-guards; Seq 2 give für die Greave-Straps; **Seq 3 zusätzlich pay 80 cp für dieselben shin-guards an dieselbe Mara**. Beide Geldabgänge werden in derselben User-Eventnachricht i193 tatsächlich gebucht:

- coin.changed **614 → 534 (-80 cp)** durch offer.accept.
- coin.changed **534 → 454 (-80 cp)** durch den separaten pay.
- Zwei transaction.completed für denselben Kaufanlass; nur **ein** Artikel entsteht.

Damit wird derselbe acht-Silber-Preis doppelt berechnet. Die mögliche Rabattfrage (Spieler nennt „sixpence off“, Mara beharrt auf „eight even“) ist zusätzlich zu prüfen, erklärt aber **nicht** die zweite volle Abbuchung.

**Root-Cause-Hypothese:** Planner-Aufteilung von Angebotannahme und ausdrücklicher Geldübergabe in zwei Zahlungs-Commands; der deterministische Transaktionspfad dedupliziert dieselbe wirtschaftliche Leistung nicht. Keine Geldsummen-/Währungsumrechnung als Hauptursache. **Regression:** Ein Kauf mit „Deal, ich gebe dir das Geld und du passt die Rüstung an“ zahlt genau einmal; zwei wirklich unabhängige Käufe/Leistungen an denselben NPC dürfen weiterhin zweimal zahlen. Test vor und nach der Command-Verarbeitung, Replay/Reload/Swipe, mehrere Offer-Lines, Teilzahlungen nur bei tatsächlich unterschiedlichen Forderungen.

**Priorität P1: konkrete Verletzung der Geldintegrität.**

## 4. P1 – Falsche Angebotsannahme und Händleridentität (T27–30 / i54–60)

T27/T28 erzählen Bewegung zu Hessel, während die Engine wegen fehlender autorisierter GO-Aktion am Ort **Doss' Apotheke** bleibt (no_go/scene_context werden zu Recht verweigert). T29 sagt der Spieler **„Twelve the lot suits me. Done, Hessel.“** Der Planner verarbeitet das jedoch als offer.accept von **Doss** auf die noch offene Offerte offer.t52.6. Gebucht werden:

- Vier Crystal Beetle Chitin Plates an **npc.doss**;
- **+1 cp** (185 → 186), obwohl die Narrator-Antwort bereits **„Four coppers“** nennt und der Spieler gerade **„Twelve“ an „Hessel“** sagt;
- Angebot geschlossen, Material nicht mehr beim Spieler.

Es wurde **nicht** an Hessel für zwölf Silber verkauft. Die Engine-Anweisung für den Zug spricht ausdrücklich von einem Verkauf an Doss für 1 cp, während der Spieler eine andere Gegenpartei und einen anderen Betrag nennt. Der Testspieler versucht T30 erfolglos eine Korrektur und akzeptiert später die Lage.

**Befund:** Das Problem umfasst zwei Ebenen: Autorisierte Spielerreise und tatsächlicher Ort stimmen mit der Erzählung nicht überein; danach wird eine abweichende Offerte akzeptiert, obwohl der Wortlaut der Annahme Verkäufer/Preis widerspricht. Die 1-cp-Offerte selbst ist außerdem nicht konsistent mit der narrativen Angabe „a copper a plate“ für vier Platten. Die exakte Ursache der ursprünglichen Offertbewertung bedarf einer gezielten Code-/Requestanalyse.

**Regression:** Ein ausdrücklich an Hessel gerichtetes Angebot darf keine offene Doss-Offerte auslösen; unklare oder materiell abweichende Zustimmung fragt nach/bleibt offen. Bei „ein Kupfer pro Stück für vier Stück“ ist der Gesamtwert vier Kupfer, nicht eins. Korrekt autorisierte Ortswechsel und mehrere gleichzeitig bekannte Händlergegenparteien als Gegenkontrollen. **Priorität P1 für Handelsautorität, P2 für Einzelpreisinterpretation.**

## 5. P2 – Mechanische Gear-Verfügbarkeit statt bloß beschriebener Rüstung

T56 wird ein shin-guard-Paar für **20 cp** gekauft und als Objekt erstellt. Im Event besitzt es keine gear-Werte und wird als gewöhnliches Item/Tool registriert. Equip in T56/T57/T59 scheitert („he does not hold it“ zunächst, danach **„no gear values“**). Bei T97 entsteht ein zweites, lackiertes Paar (neben der Doppelzahlung); T98 verweigert Equip wieder **„no gear values“**, T99 zeigt keinen Leg-Slot.

Die Regelwerte des Produkts sehen mechanisches Gear nur mit einem gültigen Gearprofil (Slot/DEF/MDEF etc.) vor; bloß „shin-guards“ im Narratortext erzeugt keine belastbaren Schutzwerte. Die Weigerung, daraus willkürlich DEF zu machen, ist korrekt. Das **spielerische Problem** ist, dass Verkäufer funktionsfähige Rüstung anbieten und die Engine den Kauf erlaubt, ohne daraus anlegbares Gear zu machen. Der Testspieler verliert dadurch viele Züge und Geld.

**Empfehlung für getrennten Patch:** Die engste saubere Integration zwischen konkretem Händlerangebot, einmalig fixiertem Gearprofil und möglichem Equip-Slot prüfen. Keine erfundenen DEF-Werte aus dem Namen allein, keine generische Pflicht zur Einführung eines neuen Leg-Slots ohne Designprüfung. Ein Gegenstand ohne kanonisches Gearprofil muss vor einem kostenpflichtigen Rüstungskauf klar als nichtmechanisches Tool erkennbar sein. Regression Kauf → Gearprofil → Equip → geänderter Wert und Gegenkontrolle eines gewöhnlichen nicht ausrüstbaren Werkzeugs.

## 6. P2 – Weitere Handels-/Weltkohärenz

- **T18/T19:** Für Drowned-Ox-Bett/Essen wird die Transaktion bereits beim Gilden-Desk mit dem Guild-Keeper gebucht; auch Old-Fen-Heilung wird als Leistung von Marta am Gasthaus verbucht. Spätere Prosa muss von der echten Dienstleister-/Ortbindung getrennt werden. Eventbeleg T18 i35 / T19 i37.
- **T83–88:** Die Erzählung führt zu einer geschlossenen Schmiede mit angeblich bereits angepasster Lederjacke. Ein 40-Silber-Kauf wird bei T80 mangels Geld korrekt verweigert; auch danach gibt es **keine** gebuchte 400-cp-Zahlung. T88 behauptet der Spieler entgegen dem kanonischen Zustand, sie bezahlt zu haben. **Keine** fehlende Abbuchung als Fehler behaupten; ein NPC-Versprechen ist kein bezahlter Kauf.
- **T85/T86:** Trotz einer erzählten Innennacht bleiben bestimmte Orts-/Dienstleistungsentscheidungen ungebucht, während T86 Schlaf die HP/MP wiederherstellt. Orts-/Erzählkontinuität überprüfen, aber nicht pauschal jeden scene_context- oder no_go-Reject als Bug markieren.
- **T94/T95:** Eine Spielerformulierung („I hand it over ... pay me“) löst zuerst ein echtes GIVE der Chitinplatte und das Erlöschen der Verkaufsofferte aus; erst im nächsten Zug bucht der Extractor **+110 cp als freies coin.gift** des Schmieds. Eine erneute object.move auf den bereits besitzenden Schmied wird zusätzlich ausgegeben. Gesamtbetrag wird einmal bezahlt, aber der Sale-Ledger ist umgangen. Die klare Trennung von unentgeltlicher Gabe und Verkauf mit Kaufpreis sollte geprüft werden; nicht jede Bezahlung als illegitim verwerfen.
- **T78:** Fünf Einheiten Slime Gel werden tatsächlich verkauft. T90–92/100 wird dasselbe Gel trotzdem erneut als vorhanden behandelt; #bag zeigt zu Recht, dass es längst weg ist. Eine Erzähl-/Spieler-Kontinuitätspanne, **kein nachgewiesener Inventarverlust durch die Engine**.
- **Boardinhalt T6:** „Thin the Shard-Wasp Nests“ fordert DEFEAT von drei **Nestern** statt eindeutig registrierbaren lebenden Gegnern. Mechanische Erfüllbarkeit prüfen; es wurde nicht angenommen, also kein nachgewiesener Questfortschrittsfehler.
- **Boardanzeige T6:** Testspieler erwähnt sechs Angebote; Engine bucht und zeigt fünf. Keine Board-Überproduktion.
- **Währungsanzeige:** 504 Kupfer entspricht 5 Gold 4 Kupfer, 614 Kupfer entspricht 6 Gold 1 Silber 4 Kupfer; die Spielerkommentare zu „Rundung“ sind keine nachgewiesenen Anzeigefehler.

## 7. Schutzentscheidungen, Belastbarkeit und Testspieler

Es gab 83 delta.rejected: **30 scene_context, 8 no_go**, außerdem unter anderem world_rule 8, entity_fact 7, ambient 5 und npc_continuity 4. Ein beträchtlicher Teil schützt korrekt gegen erfundene Reisen, Geber oder Kampffakten. Die Zahlen sind **keine** Anzahl eigenständiger Programmfehler. Die Vielzahl an Ortskonflikten erzeugt aber Reibung und verdient eine gezielte Szenen-/Planner-Analyse mit Original-Requests und Storyreihenfolge.

Der Testspieler erzeugte **63 zunächst nicht gültige JSON-Entscheidungen**, die Runner-Recovery funktionierte; das ist keine gleich hohe Zahl von Engine-Fehlern. Die Eingaben T39–45 zeigen eine zweite UX-Schwäche: mehrere falsch geratene Passive-Befehle; erst die frei formulierte Annahme T45 wird wirklich gebucht. Tool/Help-/HUD-Ausgabe sollte dem Spieler die konkrete gültige Annahmeform zeigen. Der seltene Passive selbst wurde korrekt vergeben.

Keine PageErrors; ein AbortError in server.log ist dokumentiert, die eine Extractor-Transport-Recovery wurde angewendet. Der normale Abschluss mit Event-Integrität OK beweist keine vollständig fehlerfreie Semantik. Das Narrator-Profil enthält noch die ältere persönliche Kartenbeschreibung; der isolierte Run nutzte den aktuellen Vertragsstand .85.

## 8. Priorisierung und Regressionsempfehlung

1. **P1 Handelsdoppelbuchung (T97):** denselben Kauf nicht über offer.accept und pay parallel abbuchen. Eng am vorhandenen Command-/Trade-Audit, keine globale Zahlungsunterdrückung; erst Originalrotprobe, dann Grün samt getrennten legitimen Käufen.
2. **P1 Handelszustimmung/Gegenpartei (T29):** keine Annahme eines anderen Verkäufers und materiell abweichenden Angebots allein wegen eines noch offenen Offer-IDs. Preis-pro-Stück/Multiplikation als getrennte P2-Ursache verfolgen. Auch einen echten GO zu Hessel als Positivkontrolle prüfen.
3. **P2 Gearloop:** Käufe von „Rüstung“ nur als mechanische Gear-Upgrades anbieten, wenn das Produkt einen echten einmalig fixierten Gear-/Slot-/Wertepfad unterstützt; Equip testen.
4. **P2 World-Szenen/Services und formale Verkaufsübergabe:** ausgewählte echte Fehlbeispiele T18–19, T27–30, T83–86 und T94–95 im Kontext auswerten, statt 30 scene_context-Rejects pauschal freizugeben.
5. **P2 Board-Zielqualität und Passive-UX:** keine DEFEAT-Nester ohne kampffähigen Zielanker; konkrete Passiven-Annahme sichtbar machen.

**Keine sofortige Wiedereinführung von Lieferquests; kein neues Delivery-Subsystem, kein allgemeiner NPC-/World-Neuentwurf, kein XP-/Kampfbalancepatch aufgrund dieses einen Laufs.** Gegenreview durch Sol vor Implementierung sinnvoll, insbesondere zur Abgrenzung zwischen Planner-Doppelinterpretation, deterministischen Handelsregeln und berechtigter Engine-Autorität.

## 9. Dokumentation/Abnahmegrenze

Dies ist der erste Review dieses Runs, keine Produktimplementierung oder erneute Ausführung der Node-/ST-Tests. Der Originalexport und die darin enthaltenen Modellantworten wurden unverändert geprüft. Eine reproduzierbare technische Rot-/Grün-Suite ist als **Folgeaufgabe** zu erstellen. Sols spätere Gegenprüfung separat als SOL_COUNTERREVIEW.md in diesem Run-Ordner ablegen; den Originalreview nicht überschreiben.
