# GPT-Fortsetzungsreview User18 · .265 / .211

Produkt 9dde24a5337e2b43dd4e2d58db45a19d4e7baa89, unverändert. [Erstreview](REVIEW.md), [neues Feedback](USER_FEEDBACK_02.txt), [Manifest](SOURCE_MANIFEST_02.md).

## R5 — Outdoor-Sichtung fälschlich als Dungeon-Sichtung (hoch)

T10 M27/28: Planner GO korrekte kanonische Population Crowan's Mill. Ankunft samt beiden Gefährten gebucht, intent done. Narrator sieht vier Echsen (drei gewöhnlich, eine größer/vernarbt). X liefert zwei creature.new, count 3 und 1, population richtige ID, adult, aquatic, SHORT, across jeweils nichtnull. World src/v4/world.js:1523–1552 verwendet across als alleinigen Schalter zum speziellen Dungeonthresholdpfad. Ohne Dungeon-Slot beide delta.rejected dungeon_sight; null Gegner erzeugt. Kein bloßer HUD-Fehler; normaler Jagdablauf blockiert. X verwendete das für Dungeons vorgesehene Feld falsch, die Engine muss diesen rein optionalen Überschuss im eindeutigen Outdoor-Kontext tolerant behandeln. Ziel: normale creature.new-Verarbeitung bei tatsächlicher Outdoor-Sichtung, bestehende Population/Range/Identität/PULSE-Schranken beibehalten. Dungeoneingang/approaching/echte reservierte Slots und remote sightings nicht entgrenzen. Regression original X, kontrolliert nur across:null, Vergleich; tatsächliche Dungeon-Sichtung unverändert. Keine neue strenge Narratorregel, keine unnötige Reparatur.

## R6 — Standardparty vs Sondervereinbarungen (hoch)

M17/19 native Einzelinvites akzeptiert, je party.agreement standard:true quest:null und party.member follow/combat:true. Dann L3 Rogue Dagger, Sera L3 Rogue Bow +20 Pfeile, eigene Gearobjekte. Je 2.975/2.519s Helper, keine Narration. R1 Mehrfacheinladungen bleibt offen, native Syntax nur ein ref. Nutzer wünscht Mehrfachauswahl ähnlich #assign. Vorübergehend deaktivierte Buttons später benutzbar ohne weitere Nachricht; genauer Sperrgrund nicht belegt.

M21/22: natürliche Kombination 'lets split it 3 ways equally ...' + GO + Taktik: P1 share:third, who:null, priority:take point; Repair share:half, priority:front, who:null bleibt invalid. Beide finish stop, kein Tokenlimit/Providerfehler; 51.942s; kein Zug gebucht. M23/24: isolierte Gleichteilung/Taktik; P offer an Sera share:half, 15.312s; termsFrom lehnt falsche Kompensation korrekt ab. Nicht pauschale Unfähigkeit für Mehrfachinputs. Hauptursache: P verwechselt vorhandene Standard-Gleichteilung durch alle Mitwirkenden mit bilateralem 50%-Sondervertrag. Bestehende Standardvereinbarungen genügen; party_rewards.js recordWork/settleQuest teilt Restpool unter tatsächlichen Standardarbeitern und pc. Keine zusätzliche Aushandlung erforderlich. Explizite Sonderbedingungen weiterhin streng, kein automatisches Drittel/halbe Anteile pro NPC aus Standardgespräch. P/X Vertrag und bestehende gemeinsame Verarbeitung vereinfachen; keine neue Wortlisten-Schicht. Taktikgespräch als Dialog, tatsächliche mechanische taktische Vereinbarung nur falls konkret und relevant. M26 X coordinate Dann rear: zusammengefügtes Zitat über Erzählerunterbrechung und Frage; M28 X offer bloße alternative Taktik, claim Freitext, speaker evidence abgelehnt. Nicht alle Ablehnungen fachlich falsch; X sollte gewöhnliche Vorschläge nicht als Finanz-/Mitgliedschaftsvertrag melden. Voller Name vs Kurzname als früherer Befund mitprüfen.

## R7 — Sera wiederholt Gleichteilung / Kontext

N T9 tatsächlich gesendeter Chatverlauf enthält M16 Split-Dialog und M21 fehlgeschlagene Spieleräußerung 'lets split it 3 ways equally ...'. M23 nicht als vollständige Aussage im geprüften N9-Auszug gesehen. Narration metadata: party Abschnitt 119 Tokens in T9 und T10 dropped (budget), NPC compact geliefert; somit N9 nicht durch mitgegebenen Partyvertrag zu dieser konkreten Replik veranlasst. Kein neuer Betrag/Vertrag gespeichert. Standardparty real vorhanden, daher hier harmlose passende Reaktion; allgemein prüfen ob ungebuchte fehlgeschlagene Inputs als historische vollzogene Handlung erscheinen. Relevanter Party-Status und knappe Abmachungen sollten in natürlicher Gruppenszene nicht vollständig aus Narratorkontext fallen. Nicht einfach Budget erhöhen; ggf. kompakte kanonische Fakten priorisieren. P/X sehen Standardvereinbarungen im Katalog.

## R8 — UI (Nutzerfeedback)

Buttons korrekt schwarz/weiß, Dialogfläche weiß/graue Schrift. Bestätigt vorherigen CSS-Befund. Gewünschte aufklappbare Partyzeile statt modaler Box, übersichtliche einzelne Mitgliederzeilen mit getrennten Detailinfos statt langer Zeile im Worldstate, keine doppelte aktive Oberfläche. Mehrfachauswahl Einladung als Komfortwunsch, individuelle NPC-Entscheidungen erhalten.

## Positive Ergebnisse

T9 Gilde→east gate 15min (10+5), beide Gefährten reisen automatisch mit; T10 east gate→Mill 60min (40+20), beide scene.entered und travellers, exakte Questort-ID, keine Reise-Reparatur. N T9 beide mechanisch richtigen Rogue-Klassen/Waffen, taktischer Dialog glaubwürdig, N T10 keine Angriffe gebucht. Kein Kampf, XP, Loot, Auszahlung bisher getestet. T9 P/N/X 5600/25113/24630ms; T10 47380/39121/46013ms. Zwei gescheiterte P-Eingaben 67.254s allein; Hauptpriorität Spielbarkeit, nicht Mikroperformance.

## Empfehlung

R5 und R1/R6 gemeinsam vor nächster Freigabe korrigieren, R8 im selben Paket. Weiteres Spiel im selben Save wenn Sichtung durch eine reine Beobachtung korrekt erneut gespeichert wird; sonst nicht wiederholt gegen unsichtbare Ziele kämpfen. Keine Produktänderung oder kostenpflichtige Requests durch GPT. Statische Quellprüfung und Originalauswertung, kein eigener ausführbarer Replay; unabhängige Codex-Gegenprobe ausstehend. Alle Originale behalten, bis Roharchivtransfer verifiziert.
