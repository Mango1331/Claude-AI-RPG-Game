# Run 7 – 20261024-120700Z-current_test (Build .67)

**Review vom 24.10.2026.** Unveränderter Originalexport im Chat geprüft; **keine Codeänderung, keine erneute Node-/ST-Testausführung**. Aktueller Projektstand: [03](../../03_AKTUELLER_PROJEKTSTAND.md). Dieser Bericht ist die einmalige Detailquelle dieses Runs.

## Originalquelle und technische Abnahme

- Original-ZIP `20261024-120700Z-current_test.zip`: **15.725.734 Bytes**, SHA-256 `2d2b0c47e4782e3b3e2002c03bbd78abc5aae46e6c8b6d09ce6922ae21bd7ef4`; **ZIP-CRC OK**. Das ZIP liegt hier im Chat, nicht mit dieser Review auf GitHub; **Git-Binärarchivierung offen**. Keine Keys, Roh-Providerlogs oder lokalen Pfade in diesen Review kopiert.
- **Echter ST 1.19.0, GLM-5.3-Flash, `stub:false`, keine Fixture**; freier `current_test`. Engine `4.3.0-c.6.6.67` auf dem Produktbranch mit bereits von Sol implementiertem XP-Faktor 2. Originalmetadaten nennen keinen eindeutig verifizierten aktuellen Produkt-Git-SHA; der Produktcommit zur .67-Implementierung ist `7bfb7f25`.
- **100/100 reale Spielerinputs**, reguläres Ende `done`, 97 gebuchte Engine-Turns (zwei Charaktererstellungsinputs, ein `#assign`-Kommando), **95/95 Story-Replies mit `extract.applied`**; 1.460 Engine-Events, `integrity: OK`. Keine `pageErrors`, `serverErrors`, Narrator-Leerantworten, `pending`-Hostblockaden oder Recovery. **9 erfolgreiche reguläre Extractor-Reparaturen**; alle 298 Modellaufrufe mit `finish_reason=stop` (97 Planner, 95 Narrator, 95 Extractor normal + 9 Repair, zwei Board-Calls).
- Gesamtdauer **77:42,8 Minuten**; davon `gameMs=3.652.406`, `decideMs=821.365`. Board-Call am Schluss 93 s, aber gültiger Abschluss; langsamer Provider ≠ hängende Engine.

## Spielerfortschritt – tatsächliche Buchungen

- Mage, Warrior/Mage/Rogue-Ruleset 2, Arcane Bolt + Flame Lance. **Start Level 1, Abschluss Level 2**, keine neue organische Fähigkeit/Passive/Evolution. Ein abgeschlossener kleiner privater Wachdienst (`quest.watch_the_toll_trestle`, **0 Quest-XP**); ein abgeschlossener Guild-Combat-Cull; eine später **aufgegebene** Guild-Lieferquest.
- Quarry Wolf Cull: vier **einzeln** gewonnene Engine-Encounters (Run-Inputs 54, 57, 58, 63; vier verschiedene Wölfe). **4 × 24 = 96 Combat-XP**, `quest.ready`, `proof.checked ok:true`, **60 cp** und **46 Quest-XP**. Engine-Level-Up in Userinput 64 mit **142 Gesamt-XP → Level 2 + 42 Rest-XP**, fünf freie Statpunkte; `#assign INT 3 WIL 2` in Input 65. Beleg für wirksame XP-Verdoppelung, **kein** Level 3 und kein Beleg für insgesamt gutes Progressionstempo.
- Zeitlich dominierten frühe Jobs, wiederholte Gildenanläufe und die gescheiterte Paketlieferung. Am Ende neue echte Boardliste (T100); mehrere Angebote, kein weiterer freigegebener Dungeon-/Gear-/Klassenfortschritt.

## P1: objektiv ausgeführte Questlieferung wird nicht gebucht

**Originalpfad:** `quest.carry_the_chirurgeons_case_to_the_mill_hamlet`, aktiver Guild-DELIVER-Auftrag ab Input **31**. Spieler nimmt den an die Quest gebundenen Gegenstand `obj.t66.chirurgeons_locked_case` bei Odo an (Engine `object.created` und `object.moved → pc` bei Eventindex **66**), erreicht `loc.mill_hamlet.millwrights_house` (Inputs **36–41**) und gibt den Koffer Garrett. Eventindex **81** bucht `object.moved` zum tatsächlichen `npc.garrett`, **sogar mit `delivery_origin` und `delivery_capacity=1`**. Trotzdem gibt es im **gesamten Lauf 0 × `quest.delivered`**. `quest.ready` wird bereits davor und danach wiederholt mit `quest_delivery: delivery not recorded` abgelehnt; `proof.checked ok:false` bei T86 und T97; bei Input **99** wird die Quest **abandoned**.

**Codebefund:** In `src/v4/delivery.js:cargoMatches` wird `x.for_quests.includes(q.id)` festgestellt, aber vor dessen Nutzen bereits eine **beidseitige wörtliche Namensprüfung** verlangt (`contains(o.what,x.name) || contains(x.name,o.what)`). Questziel heißt „locked case of instruments and bandages“, der ausdrücklich gebundene reale Koffer „chirurgeon's locked case“. Die beiden enthalten unterschiedliche Zusatzwörter, obwohl es **dieselbe Questfracht** ist. Der Filter ist deshalb ein **konkret belegter P1-Matching-Defekt**; weitere mögliche Orte-/NPC-Prüfungen im Fix gezielt kontrollieren, nicht pauschal deaktivieren.

**Negative Gegenfälle:** Fremde Questfracht, ähnlich klingende Gegenstände, generische beliebige Kisten, falscher Empfänger, falscher Ort, noch in PC-Hand, Duplicate/Reload/Split dürfen keinesfalls einen Beleg erzeugen. **Positive Fälle:** korrekt gebundene Originalfracht trotz variierender Beschreibung, tatsächlich bei der bekannten zuständigen Person am korrekten Ort autorisiert übergeben → **ein** `quest.delivered`, dann READY/Proof/Payout nach bestehenden Anforderungen, unabhängig von Narratorlob; bestehende alte Events unverändert replaybar.

**Spielwirkung:** Der Narrator wiederholte später eine bereits erfolgte Lieferung als neue Fahrt mit demselben Koffer, führte den Spieler zu unnötigen Schrift-/Zeugenbelegen, wechselte Guild-Schalter und begründete zum Schluss die Nichtzahlung als legitime Vertragsauslegung. Das ist **Folgeschaden** der falsch fehlenden Enginebuchung plus fehlender Quest-/Story-Abgleich, nicht Beleg für einen absichtlich offenen Questabschluss.

## P1: Arbeitsangebote werden als Käufe abgerechnet

- Bei privaten Erwerbsjobs wird aus der angenommenen **Tätigkeit des PCs für NPCs** ein käuflicher `service.granted`-Vorgang. T11: `transaction.completed cp:1` und `coin.changed −1` für die Arbeit gegen Möwen. T13: `cp:4`, `coin.changed −4` für weitere bezahlte Schichten. T24: `cp:1`, `coin.changed −1` für die Torwache; T25 wird **+1** zurückgezahlt. Netto **−5 cp für diese Erwerbsarbeiten**, statt einer normalen nachvollziehbaren Entlohnung. Der Narrator rationalisiert den T13-Fehler als selbst erfundene „Earnest money“.
- Ursache weiter zu prüfen: Angebotserzeugung/Seller/Buyer-Rollen, `transaction.completed`, `service.granted` und Narrator-Truth. **Keine** pauschale Umkehr legitimer Kaufevents, Dienstleistungen, Betten, Essen oder Gildenregistrierung. Regression mit bezahlter NPC→PC-Arbeit, gekauftem PC→NPC-Service und unentgeltlichem Helfen.

## P1/P2: Phantom-Angebote trotz korrekter Annahmeblockade

- Inputs **6–8**: Der Narrator bietet wiederholt Rat-Cull, Millbrook-Delivery und Gate-Watch als offizielle Listen an; bei jeder Annahme ist plötzlich der Slip verschwunden. Der eigentliche aktuelle Engine-Board-Refresh erfolgt erst in **Input 30**.
- Input **66** behauptet mehrere neue offizielle Aufträge einschließlich „Lost Lamb“, Input **67** nimmt die konkrete Zusage mit „there is no such slip“ zurück. **Echte Engine-Guild-Offers dürfen nicht aus erfundener Prosa stammen**; gleichzeitig bleiben legitime privaten NPC-Aufträge möglich.
- Positive Kontrolle: In Input **100** erzeugt `board.refreshed` fünf tatsächliche neue Listings, alte veraltete Angebote wechseln nach `expired`; die echte Guild-Board-Authority und Tagesrotation bleiben erlaubt.

## Entscheidung für nächsten Fachpatch

**Kein technischer P0-Blocker**, da 100 Inputs, 95/95 Extractor-Commits und stabile Engine. **Fachlich jedoch zwei P1-Fehler mit unmittelbarer Spielwirkung**: zuverlässiger Questfracht-Nachweis und richtig gerichtete Erwerbs-/Arbeitsangebote; dritter wiederholter P1/P2-Befund Phantom-Guild-Listings. **10B-3B jetzt priorisieren**, mit diesen drei Gruppen als obligatorischen neuen Positiv-/Negativregressionen **in einem zusammenhängenden Gilden-/Quest-/Auftrags-Fachpatch**. Die zuvor geplanten Novice-Risikoinfos/F60-2 nur soweit im selben fachlichen Umfang sauber lösbar; keine unkontrollierte Questsystem-Neuarchitektur. Ein separater P1-Hotfix ist **nicht** nötig, wenn 3B sofort diese Ursachen behebt und die Regressionen nachweist. Unverwandtes 10B-3A kann getrennt bleiben.

**XP-Testbewertung:** Multiplikator wirkt mathematisch korrekt, aber 100 Züge bei nur Level 2 weisen besonders auf fehlende vergütete/abgeschlossene Tätigkeiten und überlange Questloops hin. Deshalb **keine** zweite XP-Anhebung, kein globaler Kampf-Nerf vor 3B- und Folge-Livetest.

**Archivgrenze:** Original-ZIP noch nicht als Binärdatei auf `main` archiviert; vom Nutzer hochgeladene ZIP hier unverändert geprüft. Keine neuen Node-/ST-Läufe oder Produktänderungen im Rahmen dieses Reviews.
