# Review des Gegenfeedbacks zum Architekturaudit (.126)

**Stand:** 30.10.2026 · Produktcode `b8d2af4` (.126) · geprüft: `AVERETH_ARCHITEKTURAUDIT_126_SOL_GEGENFEEDBACK.md` (im Dokument als Sol gezeichnet) · reiner Prüfbericht, keine Implementierung

## 0. Prüfbasis

- Das Gegenfeedback habe ich vollständig gelesen und jede überprüfbare Aussage am Code von `b8d2af4` nachgeprüft.
- **Neue, nur lesende Sonden:**
  - **Verarbeitungs-Replay:** Gespeicherte Planner- und Extraktorantworten aus dem Export des .98-Laufs habe ich erneut durch die Engine geschickt. Das lief einmal gegen den Originalbuild `c1ed54b` (.98) in einer temporären Arbeitskopie, die wieder entfernt ist, und einmal gegen .126.
  - Inventur der Tests, des Angebotswegs, des Codes für bedingte Käufe und der Legacy-Nutzer.
  - Zusätzliche Item-Sonde mit kanonneutralen Materialwörtern.
- Keine Änderungen am Repo, keine Commits. Der Arbeitsbaum ist sauber.

---

## 1. Gesamturteil

Das Gegenfeedback ist **überwiegend zutreffend und verbessert den Fahrplan deutlich**. Ich übernehme es in diesen Punkten:

1. Die neue Vorgabe „Alte Runs sind keine Einschränkung“ verändert V6 und V7 grundlegend: Abbauen statt versionieren.
2. **Erneutes Falten der Events („Golden Replay“) allein reicht nicht.** Es führt `applyWorld()` nicht aus; das hatte ich übersehen.
3. Kill-Credit-Events sind vorerst nicht nötig.
4. Die Lücke im Handel liegt bei der **Erzeugung** der Angebote, nicht in der Buchung.
5. Ein allgemeines `WorldTxn` ist kein eigenständiges Ziel.
6. Die Chronologiezahlen aus .98 habe ich zu stark gewichtet.
7. Fold-Fehler gehören höher priorisiert.
8. Meine Einsparschätzung von 300–400 Zeilen für „V2 strikt“ war nicht belegt; sie ist zu hoch (siehe 3.4).

**Wo ich ergänze oder nachschärfe:**

- **Das Verarbeitungs-Replay, das Sol fordert, ist mit den vorhandenen Records bereits machbar und in den Sonden reproduzierbar** (siehe 3.5). Auf dem Originalbuild .98 reproduziert es **60/60 Antwort-** und **61/61 Spielerzüge** ohne Abweichung. Damit wird es vom Konzept zum Kern von Schritt 0.
- **Der Einwand zur Testabdeckung stimmt nur teilweise.** Mit den korrigierten Zahlen bleibt der Befund in seiner Richtung bestehen (siehe 2, Zeile S6).
- Auf die Frage zum gleichen Körperbau gibt es eine **konkrete, codegestützte Antwort**: pro Ort höchstens eine Population, außerdem ist der Kandidatenkreis klein.
- **Neuer Befund im Handel:** Eine F-Gear-Zeile wird verworfen, wenn ihr erzählter Preis nicht wörtlich belegt ist – obwohl die Engine den Preis danach ohnehin durch den Retail-Preis ersetzt.
- **Selbstkorrektur:** Meine frühere Empfehlung, Roh-Telemetrie nur noch bei Fehlern zu speichern, **ziehe ich zurück.** Genau diese Rohantworten sind der Testkorpus für das Verarbeitungs-Replay.

---

## 2. Punkt-für-Punkt-Bewertung

| Aussage im Gegenfeedback | Meine Prüfung | Urteil |
|---|---|---|
| §1 Alte Kampagnen begrenzen nichts mehr; Originalexporte bleiben Belege | Das ist eine Nutzerentscheidung. Folge: Flags werden normale Produktregeln, Legacy-Pfade können entfallen. | **Übernommen.** Ich ergänze einen einfachen Versionsschutz (siehe 6). |
| §3 Fehlende Populationsbindung führt nicht immer zu niedrigem Level | `engine.js:materialise`: Ohne Population greifen `encounterArea(...).encounter_levels`, erst danach der alte Fallback. `population_at` wird nur gesetzt, wenn das Level im Fenster liegt. | **Zutreffend.** Meine Formulierung war zu pauschal; das Kernproblem ist der fehlende Questcredit. |
| §3 Ortslinie und Körperbau allein beweisen keine passende Art | Stimmt grundsätzlich. Bemerkenswert: `materialise` ruft `populationAt(..., { matchAnchor: false })` auf, prüft den Körperbau heute also gar nicht. | **Zutreffend.** Konkrete Lösung in 3.2. |
| §3 Kein stiller Rückfall eines ungültigen Verweises auf den Textmatcher | Ohne Legacy-Pflicht ist kein Produkt-Fallback nötig. | **Übernommen.** Meine Formulierung „Heuristiken als Fallback“ aus V1 ist damit hinfällig. |
| §3 Kill-Credit-Events vorerst nicht nötig | Hunt-Verträge zählen bereits über `population_at === q.hunt.at` (`guild.js:253`), zusätzlich über Text (`cullKind`). Mit festen Feldern entfällt der Textteil. | **Übernommen**, Begründung in 3.3. |
| §4 Angebote, Profile, Preise und Buchung existieren; die Lücke ist die Erzeugung | `world.js:offerLines` prüft erst die Preisprosa (`evidenced`), leitet dann das Profil aus `line.what` ab (`itemProfile`) und korrigiert danach auf den Retail-Preis. Gebucht wird einheitlich über `bookPurchase`. | **Zutreffend.** Meine Formulierung „zwei Buchungswege“ präzisiere ich zu: eine Buchungsfunktion, zwei Zeitpunkte. |
| §4 Materialwörter bedeuten nicht automatisch bessere Werte; „dwarven“ ist ein ungünstiges Beispiel | Kanon §8 schließt klassische Fantasyvölker aus; das Beispiel war schlecht gewählt. Kanonneutrale Sonde: `better longsword`, `improved longsword`, `tempered steel longsword` → Common ATK 10; `padded jack` → kein Profil. | **Zutreffend.** Der Befund bleibt mit neutralen Beispielen bestehen. |
| §4 V2 light als Basis; V2 strikt nur bei belegter Einsparung | Code für bedingte bzw. aufgeschobene Käufe in `world.js`: rund 27 Referenzen, `settleCanonicalPurchases` + `settleDeferred` ≈ 53 Zeilen. Der allgemeine `conditionals`-Mechanismus dient auch `give`/`use`/`accept`. Realistisch fallen also eher 100–150 Zeilen weg, nicht 300–400. | **Zutreffend.** V2 strikt empfehle ich nicht mehr. |
| §5 (S6) Die Zahl der `Chat4`-Nutzer beschreibt nicht die ganze Abdeckung | 99 Testdateien nutzen `loadProductContent`, 49 laden Originalzustände. Aber: **84 von 202 Dateien nutzen nur den Legacy-Content** (Ruleset 1, Startwerte 5, Legacy-Welt; `tests/helpers.js:28`). 44 von 63 `Chat4`-Dateien nutzen nur Legacy-Content. Nur 13 von 38 Fixtures tragen `f_progression`. | **Teilweise zutreffend.** Die Abdeckung ist breiter als von mir dargestellt; der Kernbefund bleibt. |
| §5 Golden Replay allein reicht nicht; eine Verarbeitungsregression ist nötig | Stimmt. Meine Abnahme „historische Events identisch“ hätte einen fehlerhaften Umbau von `applyWorld` nicht erkannt. | **Übernommen** und praktisch belegt (siehe 3.5). |
| §6 Varianten abbauen statt Policy-Version; keine Migrations-Engine | Ohne Legacy-Pflicht bringt eine Versionsnummer keinen Gewinn mehr. Der Gewinn entsteht durch das Entfernen. | **Übernommen.** Mein V7 „policyOf(state)“ ziehe ich zurück. |
| §7 Reise-Umbau und Ein-Szenen-Regel sind kein nachgewiesener Fix | Batch 19 hat 19 Extraktor-Repairs auf rund 280 Extraktionen. Deren Ursachen kenne ich nicht, weil die Exporte nicht im Repo liegen. | **Übernommen.** Erst messen, dafür ist das Werkzeug aus 3.5 geeignet. |
| §7 `WorldTxn` ohne belegten Mehrwert | Einverstanden. Wo Handler ausgelagert werden, müssen geteilte Zustände ohnehin explizit übergeben werden – aber nur dort und nur im Umfang, den der Handler braucht. | **Übernommen.** |
| §7 Fold-Fehler höher priorisieren | Bestätigt: `prepareGenerationAsync` nutzt `foldChat(staged, u).state` ohne Fehlerprüfung (`runtime.js:560`). `turnBlock`-Fehler landen nur in `console.warn` (`index.js`). | **Übernommen.** Mit dem Legacy-Abbau wird jeder Fold-Fehler ein echter Integritätsfehler. |
| §9 Kein Kompatibilitätszwang zwischen Builds; laufende Batches auf ihrem Build beenden | Sinnvoll. Ich ergänze einen kleinen technischen Schutz (siehe 6). | **Übernommen**, mit Ergänzung. |

---

## 3. Antworten auf die sechs Fragen aus §10

### 3.1 Welche historischen Zweige können entfallen, welche werden noch gebraucht?

| Bereich | Wer nutzt ihn heute? | Einordnung |
|---|---|---|
| `f_progression`, `f_balance`, `starter_aoe` (58 Verzweigungen) | Nur zur Unterscheidung alter Kampagnen | **Entfällt:** Werte werden normale Produktregeln. Klein und mechanisch. |
| .126-Jahrlingsflag `yearlings: !!s.meta.f_progression` | Nur alte Vertragsauswertung | **Entfällt** (Sol stimmt zu). |
| Runtime V3: `host.js` `prepareGeneration`, `processReply`, `reportRequest`, `applyReportAnswer`, `onEdited`; `index.js` `requestReport`/`pendingReport`; `engine.narratorReply`, `trackerDrift`; `context.reportInstruction`/`reportKeys` | Nur V3-Kampagnen | **Entfällt.** `extractReport` muss als kleine Funktion zum Entfernen verirrter `<avereth>`-Blöcke bleiben (`runtime.js` nutzt sie). |
| V3-Adapter `reportToEvents` (`delta.js`) | **Wird vom C-Pfad aktiv genutzt** (16 Deltaarten über `v3()` in `world.js`) | **Bleibt**, bis die betroffenen Handler fachlich umgezogen sind. |
| V4-A: `runtime.interpretMessage` und der Interpreter-Zweig in `prepareGenerationAsync`; `interpret.js` `interpreterRequest`/`parseInterpretation`; `campaignPath` ohne Pin; `settings.js legacyPlanner` | Nur V4-A-Kampagnen | **Entfällt.** `interpret.js` bleibt aber teilweise: Der Planner nutzt `interpreterSystem`, `vocabularyText`, `catalogText`, `interpreterSchema`, `PLAIN_FORMAT`, `repairMessage` und `amountErrors`. |
| `cPath === false`-Zweige in `world.js`, `firewall.js` (`granted`), `engine.js` | Nur V4-A | **Entfällt** nach dem V4-A-Abbau. Das per Zug durchgereichte `c`-Flag kann dann ganz verschwinden. |
| Ruleset 1: fünf alte Klassen und NPC-Vorlagen, `rulesetOf(...)`-Verzweigungen (138) | Nur alte Kampagnen und Legacy-Tests | **Entfällt größtenteils.** Ein Teil der `rulesetOf`-Prüfungen trägt aber aktuelle Regeln und muss in der Nutzeranalyse einzeln geprüft werden. |
| Privatquests: `private_jobs.js`, `quest.offer`-Delta, 29 `privateQuestsOf`-Verzweigungen | Neue Kampagnen haben keine formalen Privatquests (seit .83) | **Entfällt.** |
| Delivery/Escort (`delivery.js` 19 KB, Lieferteile in `guild.js`) | Für neue Boards ausgesetzt. Ohne alte Kampagnen ist der Code **ruhend**. | **Kanonentscheidung nötig:** ruhend behalten (Kanon 02 §6) oder entfernen und später neu aufbauen. |
| V3-Regexparser `intent.js` | Wird noch gebraucht: Erstellung, `#`-Befehle, `mentionedSkills` im Planner | **Bleibt teilweise.** Zielauflösung im Kampf und V3-Routing entfallen. |
| Tests: `testrun_v1`–`v12` (V3-Ära), `loadContent()` mit Ruleset 1, `legacy_world.json` | Legacy | **Sichten:** Sicherheitsaussagen auf die Produktkonfiguration übertragen, rein historische Zahlenerwartungen streichen. |

Die exakte Zeilenbilanz ergibt sich erst in der Nutzeranalyse des jeweiligen Fachpatches; ich nenne bewusst keine Gesamtzahl.

### 3.2 Wie verhindert die strukturierte Population Fehlzuordnungen bei gleichem Körperbau?

**Codegestützte Ausgangslage:** Ein Ort hat höchstens **eine** Population (`places[id].population` ist ein einzelnes Objekt). Kandidaten sind also nur die Populationen in der Ortslinie, in der Praxis meist eine. Das LLM wählt damit fast immer zwischen „Mitglied dieser einen Population“ und „unabhängig“.

**Vorgeschlagenes Protokoll:**

1. `creature.new` erhält das **Pflichtfeld** `population`: eine Orts-ID aus der Ortslinie **oder** ausdrücklich `"independent"`. Ein fehlendes Feld ist ein Schemafehler und führt zum Repair, nicht zur stillen Unabhängigkeit.
2. Dazu kommt `life_stage`: `adult` oder `young`.
3. **Ist die Kreatur Mitglied,** liefert die Population die kanonische mechanische Art, den Anker und das Level-Fenster. Die freie Bezeichnung („wild boar tusker“) wird nur Beschreibung.
4. **Strukturierte Gegenprüfung:** Die ID muss in der Ortslinie liegen, ein angegebener Anker muss zur Population passen, und der Ort darf kein echter Dungeon sein.
5. Ein **ungültiger Verweis** führt zu „unabhängig“ und einer sichtbaren Korrektur – ohne Textfallback.
6. **Rest-Vertrauensbereich, offen benannt:** Das LLM kann eine andere Art mit gleichem Körperbau (z. B. Reiher und Otterhund, beide `aquatic`) als Mitglied erklären. Folge: korrekte Level-Spanne, aber zu Unrecht Questcredit.
   - Empfehlung: zunächst **kein** harter Textveto. Stattdessen eine **Diagnose im Evaluator** („Mitglied, dessen freie Bezeichnung kein Wort der Populationsart teilt“), danach anhand natürlicher Batches entscheiden.
   - Ein Veto ausschließlich gegen den bekannten Kandidatenstring wäre möglich. Es bleibt aber eine Textregel und sollte erst bei belegtem Bedarf kommen.

### 3.3 Reichen feste Kreaturenmerkmale für die vorhandene Questzählung?

**Für Populationsjagden: ja.** `defeatTally` → `areaOf` zählt Hunts bereits über `population_at === q.hunt.at`. Mit gespeichertem `population_at` und `life_stage` kann `cullKind` (der Textabgleich) für Hunts entfallen:

- gezählt wird: Tod bzw. Flucht nach der Annahme + passende Population + `life_stage = adult`
- Ausnahme: Das Jagdziel nennt ausdrücklich Jungtiere; dafür eignet sich ein strukturiertes Feld am Hunt statt `namesYoung` auf dem Objektivtext.

Ohne Legacy-Pflicht entfällt außerdem das Problem rückwirkender Neubewertung über Builds hinweg.

**Weiterhin textbasiert bleiben:**

- DEFEAT-Ziele in Dungeon-Culls (Board-Objektivtext gegen die Art des Slots)
- Personenziele (`peopleNamed` über Rollen)

Das ist ein späterer, kleinerer Punkt. Kill-Credit-Events lohnen sich erst bei überlappenden Jagden (04 §7e).

### 3.4 Was fehlt im Handel tatsächlich?

1. **Strukturierte Vorlage + Qualität bei der Angebotserzeugung**, statt `itemProfile(line.what)`. Der freie Name bleibt Erzählung.
2. **Reihenfolge der Preisprüfung (neuer Befund):** Für F-Gear mit Engine-Retail-Preis wird eine Zeile ohne wörtlich belegten Preis verworfen („a price the reply does not name“, `world.js` ≈ 2500–2507), **bevor** die Engine den Preis ohnehin ersetzt. Für Waren mit Engine-Preis ist der Prosa-Beleg überflüssig; nur flexible Waren brauchen ihn.
3. **Pakete:** Eine Zeile = eine Vorlage; mehrteilige Angebote werden mehrere Zeilen (Batch-18-Fall). Das betrifft Extraktor-Schema und Validierung, nicht die Buchung.
4. **Sichtbarkeit:** Die mechanischen Werte eines Angebots werden vor der Zustimmung angezeigt. So fällt ein „finer“-Schwert, das in Wahrheit Common ist, vor dem Kauf auf.

Bedingte Käufe, Zustimmung, Preislimits, Verkäufer- und Ortsprüfung, Einmaligkeit und `bookPurchase` **bleiben unverändert**. Damit ist der Handelspatch deutlich kleiner als mein ursprüngliches V2.

### 3.5 Welche Originalantworten müssen erneut verarbeitet werden – und geht das?

**Es geht, und zwar mit den bereits gespeicherten Records:**

- Antwort-Records enthalten die vollständige geparste Extraktorantwort (`extraction.raw`).
- Spieler-Records enthalten die Planner-Rohantworten (`plan.raw`) und die Befehle (`interp.commands`).

**Sonden auf dem Export des .98-Laufs:**

| Prüfung | Originalbuild .98 | Aktueller Build .126 |
|---|---|---|
| Welt-Commit: `replyTurnV4(fold(chat, id), raw, prose)` gegen gespeicherte Events | **60/60 identisch** | 39 identisch, 21 abweichend |
| Spielerzug: `prepareGenerationAsync` mit Planner-Antwort als Skript gegen gespeicherte Events | **61/61 identisch** (2 Züge mit Board/Forge übersprungen) | 26 identisch, 35 abweichend |

Die Abweichungen auf .126 sind die **bewussten Verhaltensänderungen aus 28 Builds**, zum Beispiel NPC-Positionen, Anker am Profil oder die Quest-ID an Transaktionen. Jede ist als einzelnes Event-Diff mit Record-Nummer sichtbar.

Genau das ist die Abnahme, die Sol beschreibt: Jede Sollwertänderung wird ausdrücklich begründet. Jeder reine Umbau, etwa Legacy-Abbau oder das Auslagern von Handlern, muss **Abweichung 0** auf dem Korpus des aktuellen Builds zeigen.

**Lücken, die vorher geschlossen werden müssen:**

- Die Rohantwort des Board-Generators wird nicht gespeichert; das Record enthält nur die Anzahl.
- `plan.raw` wird auf 2.000 Zeichen gekürzt; bei .98 hat das nicht gestört.
- Forge-Einträge sind gespeichert, aber noch nicht in die Sonde eingebunden.

**Welche Antworten:** alle Antwort-Records mit `extraction.raw` und alle Spieler-Records mit Plan aus den **jüngsten natürlichen Batches des aktuellen Builds**. Dafür müssen deren Exporte (ohne Secrets) im Repo oder als Asset liegen; heute sind Batch 14–19 nur Chatuploads. Historische Läufe dienen als Szenarien, nicht als Gleichheitsziel.

### 3.6 Welche Einschränkung spart welche Komplexität – und welchen Preis zahlt der Spieler?

| Einschränkung | Nachweisbarer Gewinn | Preis für den Spieler | Empfehlung |
|---|---|---|---|
| Pflichtfeld Population/Lebensphase | Die Fehlerklasse aus .124–.126 entfällt; `cullKind` entfällt für Hunts | Keiner sichtbar; Unterarten mit abweichendem Level brauchen eine eigene Art | **Ja** |
| Ausrüstung nur als Vorlage + Qualität | Keine Werte mehr aus Namen; „Upgrade-Schein“ fällt vor dem Kauf auf | Exotische Namen werden auf die nächste Vorlage abgebildet | **Ja** |
| Ein Paket = mehrere Zeilen | Der Batch-18-Fall entfällt strukturell | Keiner | **Ja** |
| V2 strikt (Kauf erst im nächsten Zug) | ≈ 100–150 Zeilen, nicht 300–400; `conditionals` bleibt für andere Aktionen | Eine Eingabe mehr pro Einkauf | **Nein** |
| Ankunft durch die Engine + Reisegefahr | Unbelegt für .126 | Keine spontanen Reiseunterbrechungen durch den Narrator | Erst messen |
| Ein Szenenwechsel pro Antwort | Unbelegt für .126 | Mehr Fortsetzungseingaben | Erst messen |

---

## 4. Korrekturen an meinem Audit

1. **V1:** Kein Text-Fallback im Produkt; das Feld wird verpflichtend mit ausdrücklichem `independent`. Den Rest-Vertrauensbereich bei gleichem Körperbau nenne ich offen.
2. **V1 Kill-Credit-Events:** gestrichen für jetzt; erst bei überlappenden Jagden.
3. **S2/V2:** „Zwei Buchungswege“ präzisiert zu „eine Buchungsfunktion, zwei Zeitpunkte“. Der Fokus liegt auf der Erzeugung. V2 strikt nicht empfohlen. Die Zahl 300–400 Zeilen ist zurückgezogen.
4. **V4:** Die Abnahme „historische Events identisch“ allein ist ungeeignet; nötig ist das Verarbeitungs-Replay mit Abweichung 0. `WorldTxn` ist kein Ziel.
5. **V6:** Zahlen zur Testabdeckung korrigiert: 84/202 Dateien nur Legacy-Content; 19 `Chat4`-Dateien mit Produkt-Content, davon 3 mit aktuellen Flags.
6. **V7:** Statt einer Policy-Version werden die Varianten entfernt; nur ein Versionsmerker für Diagnose und Schutz bleibt.
7. **V8:** Die Empfehlung, Roh-Telemetrie nur bei Fehlern zu speichern, ist **zurückgezogen**. Sparen lässt sich stattdessen beim gerenderten HTML.
8. **S4/V3:** Die .98-Zahlen sind nur als historischer Beleg einzuordnen. Ein Reise-Umbau ist keine Empfehlung mehr, sondern eine Option nach Messung.
9. **Beispiel „dwarven-steel“:** ersetzt durch kanonneutrale Beispiele.

---

## 5. Überarbeiteter Fahrplan

Ich trenne dabei **bestätigte Fehler [F]**, **Designentscheidungen [E]** und **optionale Strukturverbesserungen [O]**.

| Schritt | Inhalt | Abnahme | Bewusst nicht enthalten |
|---|---|---|---|
| **0 – Absicherung** | Verarbeitungs-Replay-Werkzeug mit Drift-Bericht (Welt-Commit + Spielerzug) [O]; Board-Rohantwort speichern und `plan.raw` nicht mehr kürzen [O]; Fold-Fehler stoppen den Zug mit klarer Meldung, ohne Buchung [F]; Test-Harness standardmäßig auf Produktkonfiguration [F] | Testsuite grün; Replay-Korpus des aktuellen Builds identisch | Fold-Cache, Save-Verschlankung |
| **1 – Legacy-Abbau A** | `f_*`-Flags werden Produktregeln; Jahrlingsflag entfällt; Privatquest-Zweige entfallen; Tests auf die Produktkonfiguration umstellen, Sicherheitsaussagen erhalten | **Abweichung 0** im Verarbeitungs-Replay des aktuellen Builds | V3/V4-A-Abbau, Delivery |
| **2 – Kreaturen/Jagd** [F] | Pflichtfelder `population`/`life_stage`; Hunt-Zählung über Felder statt `cullKind`; Evaluator-Diagnose für Zuordnungen mit gleichem Körperbau | Originalfälle 214/218/272 + Sonden (stag, hind, alpha, tusker) + Gegenfälle (giant boar ≠ turtle, unabhängige Kreaturen) | Kill-Credit-Events, Ökologie, überlappende Jagden |
| **3 – Handel** [F] | Vorlage + Qualität; Reihenfolge der Preisprüfung für Engine-Preise; Pakete als Zeilen; Werte vor der Zustimmung sichtbar | Batch-18-Paketfall, „finer/better/improved“-Fall, bedingter Kauf unverändert | V2 strikt, Feilschen, neue Slots/Balance |
| **4 – Legacy-Abbau B** | V3-Runtime, V4-A-Pfad, `cPath === false`-Zweige, Ruleset-1-Content, alte Testverzeichnisse | **Abweichung 0** im Verarbeitungs-Replay | V3-Adapter (bleibt, solange `world.js` ihn nutzt) |
| **5 – Messen** | Natürliche Batches auf neuem Build; Repair-Ursachen nach Klassen mit dem Werkzeug aus Schritt 0; optional Modell pro Rolle als A/B | Kennzahlen statt Eindruck | Automatischer Reise-Umbau |

**Daneben gilt:**

- **[O]** Handler werden nur dort ausgelagert, wo ein Fachpatch ohnehin arbeitet, jeweils mit Abweichung 0. Kein Rahmenwerk.
- **[E]** Reise- und Szenen-Umbau erst nach Schritt 5 mit Zahlen.
- Der Main/Minor-Kampfplan bleibt unabhängig möglich, aber nicht im selben Patch wie Schritt 2 oder 3.

**Warum diese Reihenfolge:**

- Das Verarbeitungs-Replay **vor** jedem Abbau macht reine Umbauten objektiv prüfbar.
- Legacy-Abbau A **vor** den Fachpatches verringert die Verzweigungen, die Schritt 2 und 3 sonst noch berücksichtigen müssten.
- Der größere Abbau B blockiert den fachlichen Fortschritt nicht (wie Sol vorschlägt).

---

## 6. Ergänzung zu §9: Schutz bei inkompatiblen Builds

Sols Linie (kein Kompatibilitätszwang, laufende Batches auf ihrem Build beenden) sollte die Engine auch technisch durchsetzen:

- `campaign.started` trägt eine **Protokollkennung**.
- Lädt ein Build eine Kampagne mit inkompatibler Kennung, sperrt er neue Züge mit einer klaren Meldung, statt sie still auf veränderten Regeln weiterzuspielen.

Das ist klein und verhindert genau den Fall, den Sol ausschließen will: einen laufenden Test unbemerkt zu beschädigen.

---

## 7. Offene Entscheidungen

1. **Batch-Exporte ins Repo oder als Release-Asset** (ohne Secrets). Das ist Voraussetzung für den Replay-Korpus des aktuellen Builds in Schritt 0.
2. **Delivery/Escort:** ruhend behalten (Kanon 02 §6) oder bis zu einer Reaktivierung entfernen?
3. **Versionsschutz:** neue Züge bei inkompatiblem Protokoll sperren oder nur warnen? Ich empfehle sperren.
4. **Diagnose bei gleichem Körperbau:** Reicht zunächst ein Evaluator-Hinweis, oder soll schon in Schritt 2 eine Gegenprüfung gegen den Kandidatenstring hinzu? Ich empfehle zunächst nur die Diagnose.

Sols übrige Empfehlungen aus §9 (bedingte Käufe erhalten, Engine-Preise beibehalten, Reiseunterbrechung durch den Narrator vorerst weiter erlaubt) teile ich.
