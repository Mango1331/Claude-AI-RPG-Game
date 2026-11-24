# Gegenstände über mehrere Züge

**Der korrigierte Forschungsstand ist `642499adaf66f24572f6291da6cbcf6ac7345719`.** Die Referenz ist `.209` bei `a854cd6759712571f078bff52e7fe439858b8454`. Der erste Objektversuch (Labor `6b3654625e80ea8781b4bebd6d6d66ae94c8a219`, Integration `81f1f79a6dc83c9babe116a34449efbddd33915e`) erzwang eine zu frühe Namensbindung. Die Spielzugdaten des angehaltenen Piloten beziehen sich auf diesen früheren Stand. Die Korrektur entstand im Labor als `17e7132b82584ffd9aa3ec1d0c84d45ca060ffd3`. Natürliche Neugenerierungen sind im Gesamtbericht separat ausgewiesen. „Halter“ bezeichnet die physische Zuordnung im gefalteten Zustand. Die Leihgabe bucht weder Geld noch einen eigenen Leihvertrag.

## Wrens Tasche

C19 enthält eine eindeutige Spielerentscheidung: „I take the bag by the sound end and set out with Wren“. Die Prosa beschreibt Gewicht und klirrende Flaschen unterwegs. Der Spieler trägt sie in C20 weiter und verlangt in C21 ausdrücklich „hand Wren her bag“. Die echte Tasche ist schon vor C19 als `obj.t40.mother_wrens_leather_satchel` bei `npc.mother_wren` gebucht. Dennoch erhält P im Original C19 für TAKE den Wert `{new:"the bag"}`. X meldet `taken:true` und kein `object.move` für die Tasche. In C21 nennt P die korrekte ID. Alaric kann sie laut Eventlog nicht zurückgeben, weil dort die ursprüngliche Tasche weiterhin bei Wren ist. Die ebenfalls gespeicherte `obj.t42.the_bag` ist eine zweite physische Identität.

| Modell-/Kontrollfall auf demselben echten Präfix | Halter nach C19 / C20 / C21 auf Referenz und erstem Objektlabor | Zusätzliche „the bag“ |
|---|---|---:|
| Vollständige gespeicherte P/N/X-Ausgaben | Wren / Wren / Wren | 1 |
| Nur C19-P auf vorhandene ID bezogen; X unverändert | Wren / Wren / Wren | 0 |
| Zusätzlich C19-X mit Übergabe am Ausgangsort, C21-X mit Rückgabe nach Ankunft im Haus | PC / PC / Wren | 0 |
| Kontrollzug am einzigen Ort: Wren verspricht die Leihgabe für morgen, mit korrektem X ohne Übergabe | Wren | 0 |
| Derselbe Kontrollzug mit absichtlich falschem X („bewegt zur PC-Hand“) | PC | 0 |

Alle fünf Eingriffsreihen wurden auf der Referenz und dem ersten Objektlabor über `prepareGenerationAsync → processReplyAny → runExtraction → foldChat` ausgeführt. In allen 11 Antwortverarbeitungen pro Version wurde je eine lokale X-Antwort angewandt. Bei den beiden Ein-Szenen-Angebotsproben stehen PC und Wren zusammen und es gibt keinen GO. Ein Ortswechsel würde die zusätzliche Anwesenheitsprüfung auslösen und die Aussage über das bloße Angebot verfälschen. Die fehlerhaft gemeldete Übergabe ist auf beiden Ständen ein falsch positives Ergebnis. Die bestehenden Prüfungen können eine wahrheitswidrige X-Meldung über die Handlung einer anwesenden Person akzeptieren. Die natürliche Erzählung einer vollzogenen Übergabe und ihr tatsächlich gespeicherter Beleg sind getrennt zu beurteilen.

### Widerlegter erster Ansatz und korrigierter Stand

Die erste Fassung band `TAKE {new:"hammer"}` im Plannerpfad bereits an einen gleichnamigen bekannten Hammer. Im Gegenfall trägt Wren ihren Hammer am Körper. Alaric nimmt ausdrücklich einen anderen aus einer offenen Truhe. Selbst ein korrektes X, das den zweiten Hammer zuerst am Boden in der Truhe anlegt und dann mit `object.move` zum PC bewegt, konnte am fehlenden TAKE scheitern. Das ist ein nachgewiesener neuer Verlust. Der Pilot wurde am Zugende angehalten.

Die Korrektur überlässt die ungebundene Namensangabe dem vorhandenen TAKE-/X-Pfad. Die getrennte physische Quelle lässt sich entweder als `object.new` am Boden plus Bewegung der gerade erzeugten ID oder direkt über `in` bei der Entnahme belegen. Bei einer unbekannten Sache allein durch einen booleschen TAKE-Abschluss bleibt ein lokaler Namenskonflikt ungeklärt. Bei bekannter ID gelten Besitz, Anwesenheit, Verschluss und laufende Verkaufsangebote weiterhin. Ein zurückgewiesenes `object.new` darf nur den entsprechenden gleichnamigen TAKE betreffen.

| Kontrollierter Fall | `.209` | Pilot | Korrigierter Objektstand |
|---|---|---|---|
| Wrens Hammer und ein zweiter aus der Truhe. X deklariert den Fund und die Bewegung getrennt | Zweiter Hammer beim PC, Wrens ID bei Wren | Zweiter Hammer bleibt in der Truhe, `pc_inventory` | Zweiter Hammer beim PC, Wrens ID bei Wren |
| Derselbe Fall mit direkter Entnahme beim PC und explizitem `in:"open chest"` | Beide physischen Objekte korrekt | Zweiter Hammer fehlt | Beide physischen Objekte korrekt |
| Alaric nimmt einen Apfel. X meldet außerdem fälschlich eine Kopie von Wrens Hammer beim PC | Falscher Hammer beim PC, Apfel fehlt | Falscher Hammer verhindert, Apfel fehlt | Nur der Apfel beim PC, Wrens Hammer bleibt bei ihr |
| Unabhängige tatsächlich übergebene NPC-Sache plus nur `taken:true` für einen weiteren Apfel | Nur NPC-Sache beim PC | Gleich | Gleich |
| Zwei neue Früchte werden nur mit je einem `taken:true` bestätigt | Nur die erste Frucht beim PC | Gleich | Gleich |

Die letzten zwei Fälle sind Grenzen der bestehenden Abschlusslogik. Eine bereits gebuchte PC-Objektänderung kann weitere ausschließlich boolesch bestätigte Funde verdrängen. Aus zwei nicht zugeordneten Belegen beliebig zwei Inventareingänge abzuleiten, würde insbesondere Kurzbezeichnungen und bekannte Altgegenstände erneut verwechseln.

**60/60 gezielte Prüfungen** auf dem korrigierten Objektlabor. Gegenproben kombinierten die beiden unterstützten Formen der Quellenmeldung mit dem alten Hammer bei einem NPC, beim PC oder auf dem Boden. In allen sechs Fällen blieb die frühere ID unverändert und es kam genau der zweite Hammer hinzu. Dieselbe Truhe ohne Beleg für einen zweiten Hammer, bloße Namensgleichheit mehrerer lokaler Exemplare, abwesende Besitzer, Verkaufsware und gescheiterte Ortswechsel bleiben geschützt. Der Versuch mit falschem Hammer-`CREATE` wurde außerdem mit zwei TAKE-Absichten in beiden Reihenfolgen geprüft. Die Quelldiagnose und ihre positiven und negativen Fälle stehen im korrigierten Objekttest. Die vollständige Abnahme der Integration ist gesondert ausgewiesen. [Korrektur und Regressionen](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/642499adaf66f24572f6291da6cbcf6ac7345719)

Die P-/X-Verträge verlangen bei Leihe und Rückgabe die vorhandene ID und den Transferort. Beim zugesagten Lieferauftrag mit benanntem Empfänger unterscheidet P zwischen bloßem Transport und Übergabe am Ziel. Meldet P wie im historischen C19 ausschließlich „the bag“ und X nur `taken:true`, fehlt weiterhin der Beleg für „satchel“. Auch der engere Kandidat kann aus diesen eingefrorenen Antworten keinen korrekten Besitzverlauf ableiten. Seine neuen Hinweise sind eine überprüfbare Modellhypothese. Sie ersetzen keine fehlende Übergabemeldung.

### Fass und Bretter

| Original | Nachgespielt | Fachliche Grenze |
|---|---|---|
| B5/M13–14: Auftrag angenommen, Heringsfass zu Brens Marktstand gebracht | P plant TAKE + GO; X meldet Dill als Gegenleistung, keine Übergabe des Fasses. Fass bleibt beim PC. Im kontrollierten Vergleich werden GIVE mit Empfänger und Abhängigkeit von GO sowie ein passender X-Empfangsbeleg ergänzt: genau ein `object.moved` an Bren. Bei fehlendem Empfangsbeleg bleibt das Fass beim PC. Geld identisch. | Eine erreichte Adresse oder Gegenleistung allein entscheidet nicht, ob die Lieferung tatsächlich abgegeben ist. |
| B6/M15–16: Dill zu Marta zurückbringen und ihr geben | Derselbe Dill ist danach bei Marta. Das vorangegangene Fass wird nicht rückwirkend umgebucht. | Ein korrekt gelöster zweiter Auftrag repariert den ersten nicht automatisch. |
| B8/M19–20: erlaubte Bretter aus Martas Stapel erstmals nehmen | Der katalogisch neue Gegenstand entsteht mit TAKE und `taken:true`. Das X meldet hier keine gesonderte `object.new`. Die Bretter sind bei Alaric. | Belegter Positivfall für das bestehende TAKE-Verfahren. |
| B9/M21–22: die Bretter mit Ottys Hammer am Tisch befestigen | P liefert `craft` mit `material:null`. X meldet keinen verwertbaren Abgang der Bretter. Im Eventlog bleiben sie beim PC. | Die sichtbare Reparatur ist keine nachgewiesene Materialbuchung. Weder Brettzahl noch Verbrauch des fremden Werkzeugs dürfen aus dem erfolgreichen Handwerk geraten werden. |

[Originalchat B](../../testrun_10b/openrouter-20261124-trust-b-208/original-chat.jsonl.gz) · [Originalchat C](../../testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz) · [Objektcommit mit Quellcode und Originalfixtures](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/81f1f79a6dc83c9babe116a34449efbddd33915e)

## Ausgeschlossene Variante und Nachspiel

**NO-GO für „jede neue Übernahme braucht ein separates X-Objektdelta“.** Der Offlineversuch unterdrückte auch B8 und verletzte die vorhandene 10B-2-Regression für spätes `expected.taken`. Beim Fingerprintvergleich ergaben sich 2.235 Fälle, 1.194 Abweichungen vom historischen Baselinebuild, 1.189 davon exakt freigegeben und fünf nicht freigegebene Ergebnisse: `b17-rogue#138`, `b17-rogue#250`, `b18-rogue#162`, `b18-rogue#320` und `b19-mage#184`. Einige Fingerprints enthalten die geänderte Ablehnungsfolge. Die fünf Abweichungen sind keine fünf unabhängig bewiesenen Eigentumsverluste. Der engere Kandidat erlaubt nachweislich neue Funde weiterhin. Es gibt keinen Filter nach Artikeln, Wortzahl oder Namensteilen.

Für das Nachspiel den Dokumentationscheckout als Arbeitsverzeichnis verwenden. Die Pfade zu den Laufzeit-Checkouts anpassen:

```sh
node recherche/kontinuitaet_210/objektgegenprobe.mjs ../avereth-209/avereth-engine
node recherche/kontinuitaet_210/objektgegenprobe.mjs ../av210-item/avereth-engine
cd ../av210-item/avereth-engine
node --test tests/v4/continuity210_objects.test.js tests/v4/patch10b2.test.js tests/v4/c662.test.js tests/v4/fix142_trade_host.test.js
npm run replay:check
```

Die verworfene Regel lässt sich in einem **eigenen temporären Checkout** von `6b365462` (bzw. dem Objektpatch `81f1f79` auf dem veröffentlichten Forschungsbranch) nachstellen: In `world.js` im Abschluss von `expected.taken` die `if (name && cPath && rulesetOf(s) >= 2 && (refusedDuplicateTake.has(k) || …))`-Bedingung durch `if (name && !isLooseCoin(name) && cPath && rulesetOf(s) >= 2)` ersetzen, sodass jeder entsprechende Neufund abgelehnt wird. Dort die gezielten Tests und `npm run replay:check` erneut ausführen. Der Wortlaut des diagnostischen Ablehnungstextes kann die Hashes der verworfenen Alternative verändern. Die Akzeptanzliste wurde für keinen dieser Versuche erweitert.
