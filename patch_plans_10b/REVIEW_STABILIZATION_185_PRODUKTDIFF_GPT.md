# Unabhängiger GPT-Produktdiff-Gegenreview – Stabilisierung .185

**13.11.2026 · Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` Remote-HEAD `d556580347432a45b8cb47c8c82b34a4e6ea8764` (Build `4.3.0-c.6.6.185`); Ausgangsbasis `efcad4c02f4d2a47ab5f777d6cf6581979e36e4e` (`.184`). Zehn Produktcommits, [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/d556580/avereth-engine/docs/STABILIZATION_185.md).

**Quellen:** [natürlicher Dreierbatch `.183`](../testrun_10b/npc-20261113-135417Z/REVIEW.md) und [Quellenmanifest](../testrun_10b/npc-20261113-135417Z/SOURCE_MANIFEST.md), [Payment-Tiefenanalyse](../recherche/PAYMENT_TIEFENANALYSE_183.md), [GPT-Payment-Gegenreview](../recherche/PAYMENT_TIEFENANALYSE_183_GPT_GEGENREVIEW.md), [Monster-R1-Gegenreview](REVIEW_MONSTER_A1_184_PRODUKTDIFF_GPT.md), Arbeitsweise `01` und Design-Kanon `02`.

**Eigener Nachweis:** GitHub-Produktvergleich und tatsächliche vorher/nachher-Dateien, neue Regressionsdateien und Replay-Akzeptanzlisten gelesen; die beiden Akzeptanzlisten strukturell verglichen; einen selbst aufgebauten, isolierten Mehrfach-Lodging-Zustand nach der unveränderten `paidLodging`-Logik aus `src/v4/trade.js` ausgewertet. **Nicht selbst ausgeführt:** `npm test`, Engine-Host-Suite, Original-Replay-Fold, ST1.19-Smoke oder natürlicher LLM-Lauf. Der Container konnte das Git-Remote nicht per Netzwerk auflösen. Alle grünen Node-Tests und die elf Replayänderungen **inhaltlich** sind deshalb Implementiererbelege, keine eigenen Ausführungen.

## 1. Urteil

**Der vereinbarte Stabilisierungsumfang ist weitgehend korrekt umgesetzt.** R1 wurde vom Implementierer im Hostpfad reproduziert und typgebunden geschlossen; Mage-T22/T27-Intent, Rogue-T41–T43-Extractor-Reparatur, sichtbare `#pay`-Karte, Erzähl-/Kaufzeitfolge, bessere Zahlungsbelege/Refusals und Gilden-Unterkunftsangebote sind in Code und neuen Regressionen eng umgesetzt. `#pay`, Kassenautorität, Validator, eine Reparaturrunde und die bewusst zurückgestellten Z4/Z5 wurden nicht erweitert. Kein Anlass für einen neuen Generalreview oder großflächigen Payment-Refactor.

**R1 des Gegenreviews zu .185: gezielte Korrektur vor natürlichem Batch sinnvoll.** Der neue `PAID HERE`-Beleg kann bei **zwei tatsächlich gekauften Übernachtungen desselben Anbieters am selben Ort** beide Leistungen auf das zuletzt akzeptierte Angebot abbilden und dadurch **falsche Beträge und Leistungsbezeichnungen** an Narrator, Planner und Extractor ausliefern. Dies ist **kein beobachteter Doppelabzug und kein aktuell reproduzierter Hostfehler**, sondern eine aus der konkreten Implementierung mit isolierter Zustandsg egenprobe bestätigte Datenzuordnungslücke. Sie untergräbt den neuen Wahrheitsanspruch von `PAID HERE`. **Kleiner Pflicht-Gegenfall**, keine Blockade des übrigen Codes oder von Monster A2 als separatem Arbeitspaket.

**Releaseurteil:** Fachliches **GO für R1/Quest/Extractor/Zahlungskern**; **vollständige .185-Abnahme mit Vorbehalt** der gezielten `PAID HERE`-Zuordnung, eines echten isolierten ST-Smokes und eines natürlichen Nachtests. Kein zusätzlicher breitflächiger Zahlungsfix.

## 2. Geprüfte Teiländerungen

| Bereich | Kontrollbefund | Grenzen |
|---|---|---|
| **R1 Kreaturenautorität** | `envelope.mayTake` liest Autoritäts- und Diebesrollen nur für `kind: npc`. Echte Wache/Dieb, Kreatur im feindlichen Kampf und Testdaten mit Rollenwörtern hinter Zeichen 40 sind abgedeckt. Der ursprünglich mögliche 5-cp-Abzug wird nach Implementiererangabe vor/nach dem Patch im Hostpfad geprüft. | Der andere Ereignistyp `theft` hat schon vorher eine andere Autorisierung; dieser Patch beansprucht ausdrücklich nur die ursprünglich nachgewiesenen `fine/confiscation/robbery`-Rollenfehler. |
| **Mage T22/T27** | `agency.js` trennt am Gedankenstrich vor `and/but/also/so + Frage`; Gegenfälle `might/whether/consider` und `tomorrow` geprüft. `commands.js` und Guild-Narratorblock stellen eine verworfene `quest.accept` nicht als ACTIVE dar. | Wortbasierte Grenze bleibt; keine generelle Autoannahme aus einer Frage. |
| **Extractor Rogue T41–T43** | `extractorRequest` ergänzt das eine Repair um erwartete Hülle/Felder. Test schützt unverändertes Schema, weiterhin nur einen Reparaturversuch und echte Host-Request-Zuordnung. | Noch keine natürliche Bestätigung, dass das Modell das Gerüst konsequenter trifft. Ein als Muster geschriebenes `<place-ref>` ist eine Erläuterung und kein direkt parsbares JSON. |
| **Z3.3 / Z3.1** | Unterkunft/Essen `for members` blockiert Gildengebühr nicht mehr; kanonische Gebühr/Dokumente bleiben gesperrt. `priced:true` ohne passende `offer`-Meldung erzeugt eine **begrenzte** Reparaturanforderung statt eines erfundenen Angebots. | Reparatur nur bei bestimmten bekannten Kaufentscheidungen; kein garantierter natürlicher Erfolg. |
| **Z1.1** | `worldPanel` liest nur eine noch offene `route:free`-`needs_confirmation`-Karte aus dem aktuellen Zustand und zeigt `#pay` samt Betrag/Zweck/Empfänger/Wallet. Test prüft `extra.display_text` und Verfall. | Kein allgemeiner Payment-Button; kein heimliches Bezahlen durch Prosa. |
| **Z2/Z1.3** | `buy`-Handler untersagt vor Ende des Extractors die Erzählung einer nicht gebuchten Übergabe; `world.js` zeigt nach einer tatsächlich erfolgten Buchung `BOUGHT` und liefert die Korrektur für den nächsten Narratorblock. Negative Kaufgründe nennen die Preislücke statt des alten Gildenshoptexts. | Unveränderter Buchungszeitpunkt, keine zusätzliche Zahlung; Wirkung der Modellinstruktion noch natürlich zu testen. |
| **Z1.2/E-3** | `paidAgainWhy` sitzt direkt in `bookPurchase` und damit sowohl auf Annahme- als auch auf bedingtem Kaufpfad. Die Regression für ein **mehrteiliges, erneut Zimmer enthaltendes Angebot** bucht weder 7 cp noch still 4 cp; Essen allein und ausdrücklich zusätzliche Nacht bleiben möglich. | Angebotszuordnung in `paidLodging` bei **mehreren echten Buchungen** noch nicht eindeutig: siehe R1. |

## 3. R1 – `PAID HERE` verbindet Leistungen nicht mit ihrem tatsächlichen Angebot

**Die tatsächlichen Datenwege:**
- `trade.js` `bookPurchase` erzeugt `transaction.completed`, `coin.changed`, für jede gekaufte Dienstleistungsposition `service.granted` und zuletzt `offer.closed(status:accepted)`.
- `domain.js` speichert für `service.granted` nur `service/by/at/turn/minute` (Training besitzt optional `id`), **kein Angebot/keine Zeilen-ID, kein Betrag, kein `what`**.
- `trade.js` `paidLodging` nimmt für **jedes** in den letzten 24 Stunden gespeicherte Lodging denselben `.at(-1)`-Treffer unter allen akzeptierten Lodging-Angeboten desselben Anbieters/Ortes. Anschließend liest es `offer.lines.find(lodging)`.

**Isolierte Gegenprobe mit der tatsächlichen Auswahllogik:**

| Buchung | Tatsächliche Leistung | `PAID HERE` aus `paidLodging` |
|---|---|---|
| 1: vorheriger akzeptierter Offer | „small room for one night“ für **3 cp** | fälschlich „another night in the room“ für **5 cp** |
| 2: späterer akzeptierter Offer | „another night in the room“ für **5 cp** | „another night in the room“ für **5 cp** |

Beide Dienste haben denselben Anbieter und Ort und liegen innerhalb von 24 Stunden. Die Abbildung kann mit den derzeit gespeicherten Feldern gar nicht zuverlässig entscheiden, welche Position ein einzelnes `service.granted` erzeugte. Das Problem ist relevant, weil `.185` ausdrücklich eine weitere Nacht erlaubt und `PAID HERE` nun **maßgebliche Modellinformation** ist.

**Kleinster Korrekturauftrag:** Vor dem nächsten natürlichen Batch einen roten Host- oder Fold-Test mit **zwei tatsächlich gebuchten, verschiedenen Lodging-Angeboten** am selben Ort und Anbieter erstellen. Daneben ein einzelnes Angebot mit mehreren Dienstleistungspositionen testen. Dann den gebuchten Service an **seinen eigenen Angebots-/Positionsbeleg** knüpfen, sofern diese Felder in der bestehenden Eventstruktur verträglich ergänzt werden können; alternativ bei mehrdeutigem Altzustand konservativ nur sicher belegte Fakten ohne erfundenen Betrag/Leistungstext anzeigen. Save/Reload, Swipes, Altservices und Replay-Fingerprints schützen. **Keine** pauschale Ablehnung weiterer Nächte, keine weiteren neuen Payment-Regeln und kein komplettes Service-/Shopmodell.

Bis zur Prüfung **nicht** behaupten, `PAID HERE` belege für jede alte Dienstleistung deren individuellen Preis. Ein einziger bisher gekaufter Room unter einem eindeutigen akzeptierten Angebot (Originalfall Rogue T39) bleibt korrekt abgebildet.

## 4. Replay und Testbelege

Die tatsächlichen Akzeptanzdateien `accepted_monster184_vs_126.json` (1074 Einträge) und `accepted_stab185_vs_126.json` (1077) wurden als JSON eingelesen und verglichen:

- **1066** vorherige Einträge byte-/inhaltgleich, **8** alte Akzeptanzen geändert mit **8/8 korrekt zugeordneten Vorgängerkategorien und Fingerprints**, **3** neue Einträge.
- Die elf A185-Fälle verteilen sich auf **4 bedingte Kaufzeilen, 5 Kaufgründe (2 ersetzt + 3 neu), 1 `priced`-Reparatur, 1 nachträgliche Buchung**. Rückgabebelege `returned` unverändert; **0** fehlerhafte Vorgängerreferenzen.
- In `replay.test.js` werden Kategorien, Vorgängerreferenzen und Zahl geprüft. Die tatsächlichen elf feldweisen Replay-Ausgaben hat **Opus berichtet**, nicht dieser Review neu ausgeführt.
- Neue Testdateien `fix185_r1_creature_authority`, `fix185_quest_accept`, `fix185_extractor_repair`, `fix185_payment`: **27 Tests** laut Opus bestanden; die gelesenen Szenarien sind gezielt und enthalten wichtige Schutzfälle. **3146/3146 Node**, **409/409 angrenzend**, **1077/1077 Korpus** ausschließlich Implementiererangaben.

**Offen**: echter isolierter ST1.19-Standard-/Failsoft-Smoke, natürlicher Nachtest auf `.185` (und später Monster A2). Die `.183`-Kampagnen sind hierfür kein Nachweis.

## 5. Empfehlung und Reihenfolge

1. **Nur R1 zu `PAID HERE` gezielt reproduzieren, dann minimal korrigieren**, mit Save/Reload-/Altbelegschutz; unabhängig kontrollieren.
2. **Monster A2** nach den im Fachplan dokumentierten offenen Designentscheidungen umsetzen; A1 und der bisherige .185-Schutz bleiben erhalten. Keine Vermischung mit weiterem Payment-Z4/Z5.
3. Danach isolierten ST-Smoke und gezielten Gasthaus-/Quest-/Humanoidkampf-Test; erst anschließend den unveränderten natürlichen Dreierbatch. Die Wirkung der verbesserten Extractor-Reparatur, E3-Langzeitkonsistenz und A2-Waffenbeute kann nur ein natürlicher Spielverlauf belegen.

**Produktcode unverändert.** Dieser Gegenreview autorisiert keine weiteren Features, keine Generalreparatur von „unbequemen LLM-Spielerformulierungen“ und keine stillen Shop-/Balanceänderungen.
