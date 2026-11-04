# Batch28 – Originalreview .154

**04.11.2026 · Sol · nur Analyse.** Produkt-HEAD und Batch stimmen überein: `.154` / `2482da2cbbd13c0172edc1e9de33deafc838b9ba`, sauberer Entwicklungsbranch. Beim Einstieg noch keine separate GPT-Review auf `main` (`51e5501`). Vorgänger: [Batch27](../batch-20261103-103117Z/REVIEW.md).

## 1. Ergebnis und Nachweisgrenzen

| Profil | Inputs / Enginezüge | Ende | Technische Einordnung |
|---|---:|---|---|
| Warrior | 421 / 371 | L15, Steadfast Bulwark ausdrücklich angenommen | langer fortgesetzter Lauf, sechs sichere Modellfortsetzungen |
| Mage | 25 / 21 | L2, Tod gegen drei Boars L5/5/6 | regelgerechter Kampftod, kein Runstopper |
| Rogue | 37 / 31 | L2, Tod gegen drei Skeletons L1/5/4 | regelgerechter Kampftod, kein Runstopper |

**483 Inputs, 423 Enginezüge, 6.454 Events in858 Eventrecords.** Alle Eventexports stimmen mit den Chatrecords überein; jeder eventtragende Chatprefix wurde unabhängig mit `foldChat()` gefaltet und mit `validateState()` geprüft: **keine Fold-/Validatorprobleme**. Wallet-Ledger stimmen bei W508/M70/R65 cp. Insgesamt50 Transaktionen. Keine Page-/Serverfehler in den Runexporten.

**Getrennt zählen:** 0/3 technische Endabbrüche, 1/3 reguläre Zielabschlüsse, 2/3 regelgerechte Tode; 3/3 formal valide Zustandsfolgen. Das bedeutet **nicht** vollständige semantische Integrität: beim Warrior entsteht nach einer Reparatur eine zweite Rüstungsidentität (§3). Die zwei kurzen Todesläufe liefern nur begrenzte Langlaufabdeckung; der Warrior dagegen knapp4h56m. Kein statistischer 10B-Abschluss aus diesem Batch allein.

Original-ZIP89.072.598 Bytes, SHA-256 `7d2682bd6129f831f2891ef0a51edc21897f742bbb471ea9f5ca83ea4001d204`, alle50 Archiveinträge CRC-geprüft. [Manifest](SOURCE_MANIFEST.json), [Batchmetadaten](batch.json), [Original-Kurzbericht](ORIGINAL_REPORT.md). Drei vollständige Originalchats sind unter `originals/` verlustfrei komprimiert archiviert, dazu37 ausgewählte Completion-Records. Chatbytes nach Dekompression identisch zum ZIP-Member; Completion-JSON inhaltlich unverändert neu serialisiert. Vollständige ZIP/Serverlogs nicht als Git-Datei archiviert. Schlüsseltypische Musterprüfung der veröffentlichten Quellen ohne Treffer; kein absoluter Geheimnisnachweis.

T bezeichnet gesendete Spielerinputs einschließlich Panels, I den nullbasierten Chatindex ohne JSONL-Metadaten. Enginezüge sind eine andere Zählung. Keine Produktänderung, keine neuen Tests und keine Node-/ST-Vollsuite für diesen Review; nur Originalfolds, Codeabgleich und die ausdrücklich gekennzeichneten lokalen Gegenproben ohne Live-Modell.

## 2. .154: erster natürlicher Pricing-Repair, keine Aussage zur ID-Reparaturquote

**Warrior T230 / I460, Call671:** Nach dem bereits enginegebuchten Paketkauf von Exceptional-Mailshirt und Superior-Kiteshield für176 cp bietet der Schmied erzählerisch „a few coppers“ für das alte Hemd. Der erste Report bezeichnet diesen Preis als unknown, verwendet aber zusätzliche Quote-Felder. Die neue Diagnose nennt konkret:

> basis unknown permits only basis; remove forbidden fields ["quote","currency_quote"]

GLM antwortet im bestehenden Repair mit `pricing:{basis:"unknown"}`; `phase` bleibt unclear. Der gesamte Report endet mit `status:applied`. **Dies ist ein echter natürlicher Nachweis der neuen Strukturdiagnose.** Es entsteht daraus aber weder ein bindendes0-cp-Gebot noch eine Zahlung. Das alte Hemd ist noch mechanisch getragen; World verwirft den Bid zusätzlich über die Holderprüfung. Quellen: archivierter Call671 einschließlich ursprünglicher Antwort im Repairrequest, Chat I459/I460.

**Keine** natürliche Verwendung der neuen Fehlermeldung `invalid object ID` in den drei Completionfolgen gefunden. Die erfolgreiche Unknown-Reparatur darf nicht als empirisch bewiesene Heilung des Batch27-Fang-ID-Problems ausgegeben werden. Ein Erfolg ist auch keine belastbare allgemeine Repairquote.

Beim Warrior69 Extractor-Repairs und33 Planner-Repairs. Sechs sichere endgültige Modellfehlversuche: Planner T165/T292, Extractor T200/T240/T329/T345. Ursachen sind unbelegte/errechnete Verkaufspreisworte, fehlendes `deltas`, Objekt statt String bei `fact.s`, fehlendes `thread.text`, falscher `memory.imp`-Typ und fehlende gültige Szene. Das sind **nicht** erneut die beiden .154-Zielkonstellationen. Keine drei aufeinanderfolgenden Stillstände; der Run setzt jeweils fort. T268 eine length-Antwort mit erfolgreicher Reparatur, T271/T401 Transport-Recovery mit applied-Status. Kein Anlass für pauschal höhere Tokens, zusätzliche Retries oder einen weicheren Runner-Stopp.

## 3. Rüstungsidentität: .153-Übergabe funktioniert, Rückgabe verliert den Objektkontext

### Tatsächliche Ereigniskette

- **T90 / I179:** GIVE des noch getragenen `item.obj.t169.common_f_rank_mail_shirt` scheitert; keine Kopie oder Geldbuchung. Die Erzählung verlangt zutreffend erst das Ablegen.
- **T91 / I181:** Originalplan `unequip`→`give` mit demselben Alias. Events: `item.equipped:null`, vorhandenes `obj.t169.common_f_rank_mail_shirt` zurück zum PC, danach `object.moved` zu `npc.hessa`. **Eine physische Identität, kein object.created.** Damit ist der .153-nahe Alias-/Übergabepfad diesmal natürlich positiv getroffen; nicht exakt der frühere EQUIP-neue-Mail→GIVE-alte-Mail-Input.
- **T99 / I197–I198:** Spieler kehrt von der Gilde zur Schmiedin zurück und bittet um das reparierte Hemd. Narrator beschreibt eindeutig die Rückgabe desselben Stücks. Extractor Call278 erzeugt dennoch `obj.t198.repaired_mail_shirt` neu auf Hessa und bewegt es zum PC.
- **T100 / I199:** Neues Objekt wird regulär angelegt. Das Original verbleibt bis zum Endstate bei Hessa; das neue Exemplar später wieder im PC-Inventar. Beide haben DEF6/MDEF2 und denselben64-cp-Profilwert. Keine zusätzliche Rüstungswirkung, keine hier belegte doppelte Auszahlung oder zwei gleichzeitig gehaltene PC-Hemden; **aber zwei physische Identitäten für eine erzählte Reparatur**.

### Exakter Informationsverlust

Das Original existiert vor Call278 im State bei Hessa, ist aber weder im tatsächlichen Extractorrequest noch in dessen zulässigen `ids.objects` enthalten. Der PC steht vor der Narratorantwort noch in der Gilde; Hessa wird erst mit der Ankunft lokal. `catalog.js:buildCatalog()` nimmt PC-Ware, örtliche Ware und die Ware **bereits aktuell anwesender** NPCs auf. `extractorCatalog()` leitet daraus das Objekt-ID-Enum ab. Autorisierte Reiseziele erweitern die Ortsreferenzen, nicht automatisch die bekannten dort verwahrten Gegenstände.

**Hier wäre „das Modell soll die richtige ID besser kopieren“ unzureichend.** Anders als beim Batch27-Fang steht die richtige bestehende ID nicht zur Verfügung. Das erzeugt einen Widerspruch zwischen semantisch gewünschter Rückgabe und formal erlaubter Referenz. Die neue .154-Diagnose muss die aus ihrem Enum fehlende ID folgerichtig ebenfalls als ungültig zurückweisen.

**Read-only-Gegenprobe am Originalprefix:** Den Report nur auf `object.move` des Originals statt `object.new` geändert → aktuelle Schema-ID-Liste lehnt genau diese vorhandene ID ab. Ausschließlich das bestehende Original zusätzlich in das temporäre Anfrage-Enum aufgenommen → Report gültig, echte World-Verarbeitung nach autorisierter Ankunft/enter bewegt das Original zum PC, unverändertes Profil, **kein object.created, keine Ablehnung, State gültig**. Produktcode und tatsächlicher Originalrun bleiben unverändert. [Gegenprobenergebnisse](PROBE_RESULTS.json).

### Bewertung / begrenzter Lösungsweg

**Lokaler P2-Identitätsfehler mit technischer Kontextlücke**, kein nachgewiesener .153/.154-Regressionsfehler, kein Runstopper und kein bewiesener schwerer Geldschaden. Ein grüner Validator verdeckt hier erneut eine semantische Identitätsabweichung. Nicht als vollkommen integritätsfehlerfreien Run zählen; zugleich nicht allein deshalb die nächste Finanzarchitektur oder ein Crafting-/Durabilitysystem bauen.

Bei einer später freigegebenen Korrektur zuerst `runtime.js:extractionRequest()` und `catalog.js:extractorCatalog()/buildCatalog()` gezielt erweitern: **relevante bereits bekannte ehemalige PC-Gegenstände bei NPCs am autorisierten Ziel** als bekannte Referenzen und mit tatsächlichem Holder zeigen, z.B. über vorhandene `had_pc`-/`delivery_origin`-Information. Ortswissen/Referenzierbarkeit ist keine Anwesenheit oder Transferfreigabe. World muss unverändert Ankunft, Geberpräsenz, Menge und erzählte Übergabe prüfen. Neue identische Gegenstände müssen möglich bleiben; keine automatische Zusammenführung nach Name, Profil oder „repaired“-Wortliste.

Regressionen: Original I181→I198; alte ID schon vor Ankunft referenzierbar, aber vor Ankunft nicht übertragbar; echte Rückgabe ohne neue Entity; abwesender Geber/unbestätigte Reise verweigert; zwei echte gleiche Hemden nicht verschmelzen; Replay/Reload/Swipe. Die Gegenprobe belegt die mechanische Machbarkeit, **noch nicht** die Wirkung eines verbesserten Katalogs auf GLM. Keine Implementierung freigegeben oder durchgeführt.

## 4. Todesfälle: Rechenwege, Risiko und Handlungsauswahl

### Mage T23–25

L2, Starterstab MATK10, DEF3, aktuelle HP90/95; INT12/WIL11. Nach einer einfachen L1-Schlange nimmt er den Auftrag über drei Boars an. Das Board berichtet für diese Population L4–7. Der Winzer nennt drei Tiere, warnt ausdrücklich vor der Gruppe und bietet Hilfe mit einer Mistgabel an; der Spieler lehnt ab. Deckung am Hawthorn allein bucht keine Stealth/Ambush; die Ziele sind suspicious.

Beim ersten Arcane Wave überleben die drei L5/5/6-Boars mit43/39/50HP. Ihre drei Angriffe verursachen21+19+17 =57 Schaden, PC90→33. T24 ist eine kostenlose Zielklärungsantwort, kein zusätzlicher Gegenangriff. T25 trifft die zweite Wave alle drei, lässt aber14/7/19HP. Danach verursachen die ersten beiden Gegenangriffe jeweils 18 Schaden und töten den PC bei 33 HP; der dritte braucht nicht mehr ausgeführt zu werden. Keine doppelten Gegneraktionen oder falsche Rang-/Schadenswerte gefunden.

Der Spieler hat Upgrades tatsächlich versucht: Fine140 und Common80 waren mit70 cp nicht bezahlbar. Das ist kein verlorener Kauf. **Der gewählte Solokampf ist für die aktuelle Figur zu gefährlich**, obwohl er innerhalb F/Novice angeboten wird. Nicht allein daraus die Magierklasse schwach oder AoE kaputt erklären. Relevant für spätere Designarbeit ist die Brücke nach dem Einstieg: erster Job → L2/70cp, günstigste neue Waffe80cp, nächster gewählter Jagdtyp gleich L4–7. Angemessene Alternativen sollten erkennbar sein, nicht alle Tiere automatisch herunterskalieren.

### Rogue T34–37

L2, HP85/100, Starterdagger ATK10, Superior-Light-Armor DEF4/MDEF5; abgeleitet DEF6. Die Dreierrunde des D1-Slots ist L1/5/4. Nach Fan of Blades bleiben3/27/26HP bei den Skeletons; alle drei überleben und verursachen14+11+4 =29 Schaden, PC85→56.

Danach Basic gegen das3-HP-Ziel: zwei Gegnerangriffe, HP56→32. Nächster Basic lässt SkeletonB auf1HP; beide greifen an, HP32→8. Letzter Basic tötet B, der deklarierte Rückschritt bewegt C nur ENGAGED→SHORT; C schließt dieses Band regulär und trifft für11, PC8→0. Ein einzelner Rückschritt ist keine garantierte Flucht. Das nur angekündigte „ready to use Evasive Step“ ist keine ausgeführte aktive Fähigkeit.

**Deterministische Gegenprobe, keine neue Kampagne:** Originalprefix nach der ersten Fan-Runde unverändert übernommen; bei denselben Werten und demselben RNG stattdessen zweimal Fan of Blades. Ergebnis: Sieg mit30HP, gültiger State. Dies beweist nicht eine universelle optimale Taktik, widerlegt hier aber die Vermutung, der Tod sei ohne Klassenbuff unvermeidbar gewesen. Der Wechsel zu Basic verschwendet gruppenwirksamen Schaden und gibt den übrigen Gegnern zusätzliche Runden. Auch die nicht vollständig aufgefüllten HP sind ein konkreter Vorbereitungsnachteil.

## 5. Warrior: warum421 Inputs?

31 reguläre Siege, keine Flucht,41 besiegte Gegner, davon14 aufL1 und viele weitere aufL2–5. Kampf-XP7870 plus Quest-XP2970 =10840; L15 erstT417, E-KlassenannahmeT421. L13 wird schonT194 erreicht, L14 erstT316. **Mehr als200 Inputs liegen danach überwiegend in schwacherem Content, Handel und RP statt starkem Fortschritt.**

Der lange Mittelteil um Cobb, Eel-Weirs und nächtliche Leinenarbeit enthält viel freiwillige bezahlte Weltinteraktion ohne Guild-/Levelziel. Das ist gültiges Sandboxspiel, aber schwache Datensammlung für einen guildfokussierten L15-Tester. Keine formalen Privatquests wurden dafür benötigt. Wiederholte Randhandlungen, verkettete Reise-/Suchwünsche und sehr schwache Gegner erklären viel besser das Tempo als eine fehlerhafte XP-Zahl.

Zusätzliche Reibung durch Narration: Beim Dock-Spiderauftrag berichtet der Clerk erst3/4, später erfindet der Narrator ein Postinghouse-/Ledgerproblem und eine HQ-Übersteuerung. Die tatsächlichen frühen Turn-ins scheitern an der **kanonischen Position** (Stadt statt Halleninnenraum bzw. noch nicht anerkannter neuer Filiale), nicht an einem vorgeschriebenen HQ-Sonderverfahren. I273 akzeptiert die normale Enginezählung den Auftrag und zahlt70 cp; kein Override-Kommando vorhanden. Eine andere Reise-/Filialdarstellung könnte diese Umwege reduzieren. Die behauptete Bürokratie nicht als neue Spielregel oder automatisch als Questzählfehler übernehmen.

Die Catacombs wurden bereitsT55 erstmals geräumt, aber dieser Auftrag nicht unmittelbar abgegeben. Späterer Reset und erneuter Besuch sind kein Beweis einer abgelehnten gültigen frühen Abgabe; die explizite Catacombs-Turn-in-Kette erfolgt erstT160/161 und zahlt regulär110cp. Abgewiesene zusätzliche Dungeonbeetles sind korrekte Slotguards, keine fehlenden Pflichtgegner.

Gear wird ausgiebig getestet: Ende Exceptional-Schwert ATK22, Exceptional-Mail DEF9/MDEF4, Superior-Shield DEF5/MDEF4. Paketkäufe, mehrere Upgradephasen und NPC-Übergaben sind gebucht. Skills: BasicP3/8PP, CleaveP1/54PP, GuardP1/0PP. Ein Breakthrough wird angeboten, aber nicht angenommen; kein Skill aufP5, daher keine Evolution geschuldet. LP-Lernziele nicht verfolgt. Prosa über erhobenen Schild ist keine Guard-Aktivierung.

**Kein weiterer XP-Multiplikator aus diesem Batch empfohlen.** Schon Batch27 erreichte Mage L15 nach168 Inputs. Eher Teststrategie/Contentwahl und tatsächliche Nutzung der vorhandenen Skills beobachten. Eine allgemeinere Erinnerung an aktive Progressionsziele, echte Systempanels, Erholung und Gruppenwirkung wäre vertretbar; kein fixes Quest-/Kampfskript und kein erzwungenes AoE-Spammen. Noch keine Runneränderung umgesetzt.

## 6. Prioritäten und 10B-Einordnung

1. **Keine neue schwere Runstopper-Serie belegt.** .154 hat einen natürlichen erfolgreichen Pricing-Repair; die ID-Reparaturquote bleibt offen. Sechs sichere Aussetzer und zwei Transport-Recoveries sind fortsetzbar, aber keine sechs fehlerfreien Modellzüge.
2. **Konkreter nächster Technik-Kandidat: bekannte Gegenstände im Ankunftskontext (§3).** Wissens-/Schema-Lücke schließen, bestehende Transferprüfung erhalten. P2, fachlich abgrenzbar; keine automatische Pflicht zu einem weiteren Sofortpatch oder einer vorsorglichen Finanz-Gesamtprüfung.
3. **Balance-/Gameplayfragen getrennt:** frühe Solo-Gruppen können tödlich sein; Mage wählte klar höherstufige Gegner, Rogue verschenkte vorhandene AoE-Wirkung. Eine sinnvolle sichere Progressions-/Einkaufsbrücke und bessere Gruppenentscheidungen prüfen, bevor Schaden/Startwerte/XP pauschal geändert werden.

**Gesamturteil:** Technische Fortsetzbarkeit bleibt deutlich besser; ein langer aktueller Lauf ohne Endabbruch ist wertvoll. Zwei kurze regelgerechte Tode sind jedoch keine zwei weiteren bestandenen Langläufe. Formal3/3 Zustandsfolgen valide, dazu1 lokaler semantischer Gear-Identitätsfehler. 10B weder als gescheitert erklären noch allein mit0/3 technischen Stopps abschließen. Produkt bleibt `.154`; keine Implementierung, keine neuen Balancewerte und kein eigener natürlicher Batch.
