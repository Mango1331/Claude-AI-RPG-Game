# Batch 4 – Sols Gegenreview der Originaldaten und der GPT-Review

**28.10.2026 · Analyse, keine Produktimplementierung.** Geprüft gegen Build **4.3.0-c.6.6.104**, Dev-HEAD **b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016**. Die [GPT-Review](REVIEW.md) auf `main` (`5ace318`) bleibt unverändert. Primärquelle ist der Nutzerupload `batch-20261028-022553Z.zip`: **35.467.310 Bytes, 51 Einträge, CRC fehlerfrei, SHA-256 `01b297d422f8e3ac2a1bea9899e362d5ccc288af60d9ccaf41b1ab61a0443acf`**. Kein Upload der binären ZIP nach Git behauptet.

Eigenständig ausgewertet: alle drei Chat-/Eventexporte, Run-/Callmetadaten, betroffene originale Completion-Requests und Antworten sowie der passende Produktcode. Zusätzlich lokale Funktionssonden mit unverändertem `.104` und den Originalzuständen; keine neue Node-Testsuite und kein ST-Smoke ausgeführt. Run-Seed und Engine-RNG-Seed sind unterschiedliche Metadaten; reproduziert wurde aus den gespeicherten Chat-Events, nicht durch Ersetzen des Engine-Seeds durch den Batchprofil-Seed.

## 1. Gesamturteil und bestätigte Ergebnisse

Die Endgründe und Gesamtzahlen des GPT-Reviews stimmen. Die technischen Ursachen brauchen drei wesentliche Ergänzungen: **widersprüchliche Stück-/Gesamtpreissemantik**, **aus dem Narrator-Kontext verdrängte bereits vorhandene Korrekturen** und **die genaue Stelle der ungültigen Ortsreferenzen**.

| Profil | Inputs / Endlevel | Ende | Siege | Guildabschlüsse | Endmünzen |
|---|---:|---|---:|---:|---:|
| Warrior | 137 / L7 | Plannerfehler T137, kein Verkauf gebucht | 12 | 6 | 306 cp |
| Mage | 46 / L5 | Extractorfehler T46, kein Zimmer gebucht | 6 | 3 | 202 cp |
| Rogue | 29 / L2 | echter mechanischer Tod | 2 | 0 | 22 cp |

**212 Inputs, 617 Modellaufrufe, 2.998 Events, 107 Deltaablehnungen.** Alle drei Endzustände aus dem Chat neu gefaltet: **keine Foldfehler**, jeweils **`validateState() = []`**. Das belegt strukturelle Konsistenz, nicht vollständige semantische Fehlerfreiheit jeder Erzählung. Keine PageErrors/ServerErrors/SecretHits in den Runaufzeichnungen. Kein Level-15-Nachweis, keine neue Ausrüstung angelegt.

Die beiden finalen technischen Fehler bestehen aus nichtleeren Antworten mit `finish_reason:stop`, nicht aus Tokenerschöpfung. Zwei andere Length-Fälle wurden erfolgreich überstanden: Warrior T24, Plan C65; Rogue T26, Extract C72. Zusätzliche Completion-Budgets lösen daher nicht die beiden Endfehler dieses Batches.

## 2. Warrior T136–137: echter Widerspruch zwischen Preisvertrag und Prüfung

**GPT-Befund überwiegend bestätigt, Root Cause erweitert.**

T136: Der letzte Wolfvertrag wird einmal für **90 cp** abgegeben, mit Quest-ID an der Transaktion. Die gleichzeitig vom Extractor vorgeschlagenen 17 cp für vier Felle/neun Fänge werden als BID nicht angenommen. Die Prosa nennt unterschiedliche Stückpreise und eine alternative Setbewertung; ein bereits bindendes Gesamtangebot liegt danach nicht vor. Eine abgewiesene zusätzliche `quest.close`-Behauptung macht die tatsächlich gebuchte Engineabgabe nicht ungültig.

T137, Originalinput:

> I lay out four grey wolf pelts and nine fangs and accept your price — two copper a pelt, a copper apiece for the fangs.

Unverändertes `parsePlan()` mit Originalzustand und Antworten reproduziert:

| Antwort | Reproduzierte Ablehnung | `tradeConflict` |
|---|---|---|
| C403 | Nicht verankerte Quote des Fang-Verkaufs | `false` |
| C404 | `min_cp:1` widerspreche dem aus der ganzen Quote gelesenen Betrag **3 cp** | `false` |

`prepareGenerationAsync()` mit genau diesen zwei Antworten liefert **`action:'abort'`, `events:[]`**, keine weiteren Modellaufrufe. Die bereits vorhandene sichere Handelsrückfrage greift nicht, weil diese Fehler nicht zu ihren eng klassifizierten `tradeConflict`-Fällen gehören.

**Der zusätzliche, entscheidende Befund:** `content/commands.json` definiert `sell.min_cp` als Mindestpreis **für die ganze Menge**. Die Modellantworten tragen dagegen Stückpreise 2 bzw. 1 ein. `src/v4/interpret.js:amountErrors()` vergleicht den Betrag nur mit `coinFromWords(c.quote)` und ignoriert `qty`. Damit sind nicht nur die übergroßen Quotes problematisch:

| Reine Funktionssonde auf `.104` | Tatsächliche Prüfung |
|---|---|
| `qty:4, min_cp:8, quote:'two copper a pelt'` | fälschlich abgewiesen: erwartet 2 cp |
| `qty:9, min_cp:9, quote:'a copper apiece for the fangs'` | fälschlich abgewiesen: erwartet 1 cp |
| `qty:4, min_cp:2, quote:'two copper a pelt'` | keine Amount-Fehler, obwohl das Feld laut Vertrag ein Gesamtminimum bezeichnet |

**Folgerung:** Vokabular, Modell und Validator verwenden nicht dieselbe Preisbasis. Die 3 cp aus C404 sind ebenfalls keine gültige Waren-Gesamtsumme. Ein Fix nur für genau diese Quote oder ein Ersetzen von 1 durch 3 würde die Ursache erhalten. Bisher keine falsche Auszahlung im Original-Endturn; der mögliche Verlust von Preisbedingungen darf aber nicht als harmloser NPC-Fehler klassifiziert werden.

**Richtung für die spätere Umsetzung:** eine gemeinsame Interpretation von Preisbasis, Ware und Menge für Plannerprüfung und Trade-Evidence; vorhandene Trade-/Lotfunktionen weiterverwenden. Bei nicht sicher zuordenbaren Bedingungen gezielte Rückfrage/NOT SOLD statt Kommandos aus einer abgelehnten Antwort auszuführen. Die bedingten Händlerpreise nicht ungefragt in ein bindendes 17-cp-Gesamtangebot umwandeln.

## 3. Mage T45–46: Schutz funktioniert, aber der Korrektur-Rückkanal verliert Information

**GPTs Autoritätsbewertung bestätigt.** Nach T44 steht der Mage an `loc.glassmere.guild_hall`, mit 202 cp und 71 HP. T45 enthält keine GO-Autorisierung zum Gasthaus. World weist die erzählte Ankunft mit `no_go` und drei örtlich abhängige Angaben mit `scene_context` ab. Nach T45 weiterhin Gildenhalle, 202 cp, 71 HP; nur zehn Minuten sind vergangen. T46 bucht ebenfalls weder Zimmer noch Schlaf; nach der fehlgeschlagenen Extraktion bleibt der Zustand bei Minute 2840.

### 3a. Genauere Schemaursache

Die GPT-Review beschreibt C130s verschachtelte **globale** `scene` als ungültig. Das ist zu korrigieren:

- **C130:** Die globale `scene` für das obere Zimmer mit vollständig beschriebenem neuen Gasthaus als Elternort ist **schemafähig**. `validate(scene, placeRef(...))` liefert **keinen Fehler**. Tatsächlich ungültig sind `person.new.at` und der Elternverweis von `arrive.at`, jeweils wegen `{new:'inn by the Guild hall'}` statt einer erlaubten vollständigen Ortsreferenz. Zusätzlich fehlen vier frühere Szenenannotationen für die Chronologie.
- **C131:** Die Reparatur verschlechtert die globale `scene` zu `{new:'shared room above the inn'}` und verwendet dieselbe ungültige Kurzform mehrfach als Delta-`scene`. Jetzt ist auch die globale Szene ungültig.

Beide `parseExtraction()`-Ergebnisse mit originalem Katalog/Zustand reproduziert. **Kein generelles Verbot verschachtelter neuer Orte nötig**; die erlaubte Struktur existiert bereits. Eine großzügige Akzeptanz beliebiger `{new:string}`-Orte würde den fehlenden Reiseauftrag trotzdem nicht ersetzen.

### 3b. Neue, nachgewiesene Ursache im Narrator-Kontext

T45 hat die Engine bereits zwei korrekte Hinweise gespeichert:

- Alaric sei nicht freiwillig gereist und bleibe am bisherigen Ort.
- **NOT BOUGHT**: kein vereinbarter Zimmerpreis; keine Buchung, erst gültigen anwesenden Verkäufer und Angebot herstellen.

**Diese Hinweise erreichen Narrator C129/T46 nicht.** `host.js:turnBlock()` reicht sie zwar an `turnContext()` weiter. `context.js` packt `corrections` jedoch mit **Priorität 1** unter das Budget, während mehrere längere Abschnitte Priorität 0 besitzen. Mit dem tatsächlichen Standardbudget 1400 werden unter anderem `present` und **`corrections`** verdrängt.

Sonde aus Originalchat, `.104` und Standardparametern `budget:1400, rulesBudget:800, recentTurns:4`:

- erzeugter Engineblock **6.189 Zeichen**;
- **zeichenidentisch** mit dem gespeicherten Engineblock in C129;
- `context.dropped` enthält **`corrections`**;
- ursprünglicher Request enthält keinen entsprechenden CORRECTIONS-Abschnitt.

Der aktuelle Gildenhallen-Ort und das ausdrückliche **NOT DONE / nicht geschlafen** standen weiterhin im verbindlichen Block. Der Narrator ignoriert also zusätzlich vorhandene Grenzen; die Budgetlücke erklärt nicht jede Halluzination. Sie erklärt aber, warum er nicht ausdrücklich erfährt, dass die unmittelbar vorausgehende Gasthausszene bereits verworfen wurde.

**Konsequenz:** Nicht noch mehr allgemeine Vertragsprosa hinzufügen. Den vorhandenen knappen Rückkanal für mechanisch relevante Korrekturen vor Budgetverdrängung schützen. Eine später geplante Fehlerfortsetzung kann sonst dieselbe Phantomgeschichte weitertragen.

### 3c. Kontrollsonde gegen zu großzügige Reparatur

Eine klar als **manuell normalisierte Kontrollvariante**, nicht als Originalantwort, korrigiert ausschließlich die Ortsreferenzformen und Szenenannotationen von C130. Danach:

- Parser **gültig**, keine Chronologieissues;
- bestehende World-Regeln weisen beide unautorisierten Ankünfte und die davon abhängigen lokalen NPC-/Offer-/Fact-Angaben weiterhin ab;
- **Gildenhalle und 202 cp bleiben unverändert**, kein gekaufter Raum/Schlaf; 40 Minuten werden im vorhandenen Zeitlimit verarbeitet;
- `validateState() = []`.

Das zeigt: Die bestehende World-Autorität muss nicht durch eine neue Orts-/Transaktionsengine ersetzt werden. Teilvalidierung soll brauchbare Informationen retten, nicht aus einer formal reparierten Antwort automatisch eine fachlich erlaubte Reise machen.

## 4. Rogue: regulärer Gruppenkampf, gefährliche Wahl, begrenzte Balanceaussage

Die Todesspur stimmt: T28 eröffnet der PC mit Razor Cut den Kampf gegen Wolf C. `groupJoiners()` nimmt dessen drei präsente Gruppenmitglieder regelgemäß dazu; kein aus neutraler Prosa automatisch erfundener Kampfstart. Vier Treffer reduzieren HP **71 → 55 → 41 → 27 → 11**. T29 tötet Basic Attack den verwundeten Wolf C; Wolf F verursacht anschließend 18 Schaden, PC-HP 0, Tod und null ausgezahlte Kampf-XP.

Die Gegner sind drei L6 und ein L7, mit ATK 19/19/19/21. Der Auftrag empfiehlt **Level 5**, hat eine gespeicherte Habitatspanne 4–7, während der PC L2 ist. Die vier anwesenden Wölfe waren vor dem Angriff im sichtbaren Zustand aufgeführt; ihre genauen Level/Angriffswerte waren dort nicht als vollständige Vorschau verfügbar. T27s Erzählung „stood alone / no pack support“ konnte die Gefahr zusätzlich verharmlosen. Beim Folgeinput T29 waren 11/100 HP und die vier angreifenden Gegner dagegen ausdrücklich sichtbar. Keine tatsächlich ausgeführte Flucht ging verloren.

**Wichtiger Zusatz zum Combatplan:** Dieser Rogue besitzt **Razor Cut und Feint**, nicht Evasive Step. Eine neue Main-/Minor-Ökonomie gibt ihm nicht automatisch einen Schutzskill und beweist keine Rettung dieses Laufs. Kein Rückgängigmachen des Todes und kein pauschaler Rogue-/XP-/Startwertebuff aus diesem Fall. Risiko-/Gruppentransparenz und Begegnungsstärke getrennt von Modellfehlern untersuchen.

## 5. Fortschritt, Einkauf und echte positive Nachweise

- **Warrior T119–121:** echtes organisches Skillangebot **Ironward Riposte**, danach ausdrücklich angenommen und mit `skill.defined`/`skill.learned` gebucht. F-Rang, **C2**, Herkunft **breakthrough** aus drei qualifizierenden Basic-Attack-Erfahrungen; keine Evolution eines P5-Skills. Der alte Basic Attack bleibt. Endstand Heavy Slash **P2/51 PP**, Basic Attack **P2/33 PP**; neuer Skill P1/0. Nach Annahme ist kein Einsatz des neuen Skills nachgewiesen. Das ist mehr als bloß ein Angebot oder eine Narratorbehauptung.
- **Warrior T89:** Primer of Guard wurde tatsächlich gekauft werden wollen. Der kanonische Offer `offer.manuals.locasterhallguild_hall` war im Planner-Katalog mit Linie **`guard`** vorhanden. C253 schreibt aber `lines:['guard Primer of Guard']`. Engine verweigert mit **no such line**, ohne 120 cp abzuziehen. Der Narrator behauptet danach fälschlich, die Gilde verkaufe keine Manuals. **P2-Katalog-/Referenzproblem**, kein Beleg für fehlendes Geld und kein Beweis, dass der kanonische Bestand nicht existiert. Exakte Linien-IDs im Protokoll klarer machen bzw. bei ungültiger Auswahl die tatsächlichen Optionen zeigen; keine beliebige Position ersetzen. Das ist nicht der Arrival-/Seller-Fall, den `.104` reparierte.
- **Mage T44:** echter Verkauf von sechs Platten/elf Fängen für **17 cp**, anschließend gültige Questannahme. Verkauf ist also nicht allgemein kaputt.
- Es wurden Reisebedarf, Essen/Zimmer und weitere Services gekauft, **keine neue Waffe oder Rüstung ausgerüstet**. Deshalb keine belastbare Abnahme der F-Gearpreis-/Leistungsleiter aus diesem Batch. Nicht wieder pauschal behaupten, es sei überhaupt nichts gekauft worden.
- Die neun Guildauszahlungen sind questgenau zugeordnet, kein nachgewiesener Doppelabschluss. Die neue Clear-Neuannahmesperre wurde dadurch nicht systematisch live getestet.

## 6. Folgerungen und Priorität

**P1 – Gemeinsamer sicherer Fehlerabschluss:** Die Originalfälle eignen sich für einen klaren Host-/Runner-Vertrag: keine Kommandos aus ungültigem Plan ausführen; verständliche Rückfrage bzw. Nichtausführung anzeigen; nachweislich sicher erhaltenen Zustand weiter nutzbar lassen. Fehlgeschlagene Aktion und fortgesetzte Kampagne getrennt messen. Echte Save-/Ownership-/Reducerunsicherheit bleibt ein anderer Fehler als eine sicher verweigerte Handlung.

**P1 – Korrekturinformation erhalten, dann begrenzte Teilvalidierung:** Bereits gespeicherte verbindliche Orts-/Buchungskorrekturen im tatsächlich gesendeten Narratorblock nachweisen. Anschließend gültige unabhängige Berichtsteile isolieren; verworfene Ankünfte und deren örtlich abhängige Aussagen bleiben zusammen gesperrt. Kein neuer NPC-Wichtigkeitsapparat und kein blindes Catch-and-Continue im teilweise veränderten Stagingzustand.

**P1 – Preisbasis im bestehenden Handelsweg vereinheitlichen:** Die drei Erwartungen Gesamtminimum/Stückpreis/Quote-Summe korrigieren, nicht nur die konkrete Formulierung. Gegenfälle für getrennte Waren, Stück-/Lotpreise, Menge, Qualität/Setalternativen, bindende BID-Annahme und unvollständige Quotes. Bis zur sicheren Zuordnung nicht bezahlen/übertragen; kein neues Endlos-Repair.

**P2 – Sichtbarkeit und Datengewinn:** Manual-Linienreferenz T89 und Warnwirkung vor Gruppenkämpfen vormerken. Keine weitere allgemeine Runner-Promptverlängerung und keine vorsorgliche Combat-/Scalingänderung aus diesem Review. Der bestehende Combat-Fachplan bleibt fachlich getrennt.

Die Fehlertoleranzrichtung wird gestützt: Beide technischen Abbrüche hätten bei klarer Nichtbuchung die Kampagne nicht endgültig beenden müssen. **Sie ersetzt aber nicht die nachgewiesenen Schnittstellenkorrekturen.** Nur Abbrüche zu unterdrücken würde weiterhin Käufe verlieren und dieselbe verworfene Gasthausszene weitererzählen.

Original-ZIP, GPT-Review und Produktdateien unverändert. Für diesen Gegenreview nur Dokumentation auf `main`; keine Produkt-/Runneränderung, kein neuer GLM-Lauf, keine behauptete Vollsuite-/Smoke-Abnahme.
