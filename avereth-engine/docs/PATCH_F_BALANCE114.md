# F-Balancerunde .114 – Ausrüstung, Lernen und Vergütung

Basis `.113` / `55c547f`. Umsetzung des gemeinsamen Balancevorschlags auf main (`d2c092a`) einschließlich GPT-Feedback vom28.10.2026,16:37. Build **4.3.0-c.6.6.114**. Kein Main-/Minor-Kampfpatch und keine E-Kalibrierung.

## Geltung und Kompatibilität

Neue Ruleset2/V4-C-Kampagnen speichern `campaign.started.f_balance:true`. Der vorhandene Reducer übernimmt die Policy in `meta`. Historische Start-Events werden nicht umgeschrieben; ältere Kampagnen, V4-A und Ruleset1 behalten ihre bisherigen Werte. Keine Umrechnung gespeicherter Items, Angebote, PP oder Quests. Ein frischer Batch auf .114 ist nötig, um den Versuch zu spielen.

Der Testharness pinnt historische Szenarien ausdrücklich auf ihre ursprüngliche Zahlenpolicy, analog zu seiner bestehenden F-Progressionspolicy. Neue .114-Regressionen spielen die neue Policy. Keine alten Erwartungswerte pauschal ersetzt.

## A – F-Waffen und Fachhändler

Neu erzeugte Waffen/Foki der neuen Policy: crude/common/fine/superior/exceptional **6/10/14/18/22 ATK bzw. MATK**. Starterwaffen bleiben10. Nur F-Waffen verwenden die neue Contenttabelle; E–S, Rüstung und Verbrauchsgüter behalten ihre bisherigen Profile. Bei INT33/P1 steigt Bolt durch MATK10→22 von81,875 auf93,875 Rohpower (~14,7%).

Gearpreisrichtwerte verwenden nur bei neuen F-Waffen Qualitätsfaktoren1/1/1,25/1,75/2,5 auf den bisherigen8cp je Statpunkt. Kein harter Preisdeckel. Die gewöhnlichen neuen Fachhändlerofferten kosten fine140, superior260, exceptional480cp und passen damit zum Audit. Gespeicherte Profile tragen die Preisbasis mit sich.

Ein tatsächlich anwesender, als entsprechender Fachmann etablierter NPC an einem passenden Laden/Workshop kann drei gewöhnliche Qualitätsangebote im vorhandenen `offer.created`-System führen. Staff-/Wandmaker: Fokus, Fletcher: Bogen, Schmied: Schwert, Armourer: vorhandene ganze Kettenrüstung zu bisherigen Rüstungswerten. Keine neuen Slots oder NPCs. Bestand pro Verkäufer/Ort/Spieltag einmalig; jede Qualitätsoption ist eine eigene Offerte. Gekaufte Optionen erscheinen am selben Tag nicht erneut. Besitz, Zahlung, Auswahl und Verkäuferanwesenheit prüft weiterhin `bookPurchase`; kein freier Geld- oder Itemzugang.

Der World-Abschluss öffnet das Sortiment nach akzeptierter Weltverarbeitung nur im C-Pfad außerhalb von Kampf und zugesagtem Kampf. Es erscheint in der bestehenden System-Shopanzeige. Normale Narratorangebote bleiben möglich. Die vollständige Fachhändler-Erkennung ist bewusst klein: eine nicht als passender Handel etablierte Figur/Örtlichkeit erzeugt keinen Ladenbestand. Keine neue universelle Shopengine.

## B – Skillentwicklung

Für neue Policy **PP-Schwellen C1/C2/C3:50/75/100**, Eigenstudium/Lehrer-Tagesgrenzen **40/60LP**, gewöhnlicher Guild-Primer **80cp**. Stundensätze10/20LP, Affinity, Kampfqualifikation, PP-Award, Skillpower, Kostenfaktoren und P2-Rundung unverändert. C1-P5 bei18PP nach mindestens12 statt17 qualifizierenden Kämpfen. Höhere LP-Tagesgrenzen verkürzen Kalendertage, nicht die erforderlichen Stunden. Auch statbezogenes Ordinary-Passive-Training verwendet das bestehende gemeinsame LP-Konto mit der neuen Grenze.

Progression, Skillpanel und Zustandsvalidierung lesen dieselbe Policy. Alte PP-Banken bleiben in alten Kampagnen legal; kein automatischer Aufstieg durch Reload. Carryover bleibt bei regulärem Fortschritt erhalten. Keine automatische Skillannahme, keine neuen Schadensformeln und kein E-Composer.

## C – Vergütungen

Neue Novice-Boards verwenden30–600cp als grobe Orientierung. Generator und bestehender Repair erhalten gestaffelte Hinweise: L1–3:30–80; L4–7:90–180; L8–11:200–350; L12–14:350–600cp. Tatsächliche Anzahl, Elite-/Bossgefahr, Versorgung und Reiseaufwand sind ausdrücklich mitzuwerten; die Levelzahl allein rechtfertigt keinen Höchstpreis. Keine starre Validierungsgrenze. Veröffentlichtes bleibt unverändert. Auszahlung und Quest-XP bleiben bestehende Enginepfade.

## Nachweise

- **16 neue Tests**, gegen unverändertes `.113`: **14 rot,2 Kontrollen grün**; danach16/16. Erfasst Waffen-/Preistabelle, E-/Rüstungskontrollen, Kampagnenpolicy, PP/P5/Carryover, triviale Kämpfe, echte LP-Buchung40 versus historisch20, Angebotserzeugung, Kauf/Replay, abwesenden Verkäufer, fehlendes Geld und Boardhinweise.
- Angrenzend zunächst52/52 mit den ersten11 neuen Tests (F-Progression und9B-1). **Vollständige npm-test-Dateiliste mit vorangestellten Node-Flags `--test-concurrency=4 --test-reporter=tap`:2.227/2.227 bestanden**, Exit0,37,3s. Keine Testdateien ausgelassen.
- Echter ST1.19-Mock-Smoke auf .114: **22/22**, fünf Extraktionen, `extractPerReply`, `fightOpened`, Status/Vertrag und `noPageErrors` grün. Kein natürlicher GLM-Batch durch diesen Patch.
- Erste Entwicklungsversuche mit globalen Tabellenänderungen waren rot: historische Szenarien änderten ihre Zahlen. Die persistierte Kampagnenpolicy behebt diese Rückwirkung; keine Zahlenänderung historischer Fixtures zur Unterdrückung der Fehler.

## Risiken und Vergleich

Gewollt sind kürzere Kämpfe durch bessere Waffen und frühere Entwicklungen. Erwerb/Annahme sind freiwillig; der LLM-Spieler kann Angebote weiter ungenutzt lassen. Höchste F-Waffen können bisherige reguläre E-Waffen übertreffen. Der E-Anschluss bleibt offen, kein unbemerkter globaler Rangmultiplikator.

XP×2, Startstats7, Monsterwerte, Gruppen, Regeneration, Lootpreise, Testspieler und Aktionsökonomie bleiben unverändert. Alte Kampagnen erhalten keine rückwirkende Balancemigration. Ein späterer Revert rechnet schon gekaufte Instanzen nicht automatisch zurück; frische Vergleichskampagnen verwenden.
