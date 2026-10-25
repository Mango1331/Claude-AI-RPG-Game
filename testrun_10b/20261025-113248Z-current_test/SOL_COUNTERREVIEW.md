# Run 14 – unabhängiger Gegenreview und Delivery-Entscheidungsvorlage

25.10.2026. **Analyse, keine Produktimplementierung.** Geprüft: `main` 8034120, Produktbranch 6b9ac65 / Build .85. Einstieg 01/03; Original-ZIP und REVIEW.md dieses Ordners; gezielt Produktcode, Lieferpatchnotes und vorhandene Szenariotests. Die ursprüngliche Review und ZIP bleiben unverändert.

Original-ZIP aus Git selbst gelesen: 3.500.524 Bytes, CRC fehlerfrei, SHA-256 `10edf1719366ca107f9f464014d88234f16189acab6f4ccc3b6b62e41e0946c9`. Chat/Completion-Requests unabhängig mit dem Event-Fold verglichen. Zusätzlich reine Funktionssonden auf Kopien des Originalzustands; keine neuen Tests oder Produktdateien geändert, keine Node-Vollsuite/ST-Smoke ausgeführt.

## 1. Urteil zur GPT-Review

| Aussage | Gegenprüfung |
|---|---|
| Abbruch bei Eingabe 22 durch Extractor/Repair | **Bestätigt.** Beide Antworten enden regulär mit `finish_reason: stop`; kein leerer Output, Budgetende, Host-Hänger oder Tod. Calls 58/59 scheitern exakt an der Objektverknüpfung. |
| Objektreferenz, nicht deterministischer Lieferresolver, ist die unmittelbare Ursache | **Bestätigt.** `object.new` definiert kein `ref`; der anschließende String `obj.t30.heel_of_bread_and_hard_cheese` steht nicht im Katalog. Der Repair fügt das unzulässige `ref` hinzu und lässt die falsche Referenz stehen. Originale Parsergebnisse reproduziert. |
| Keine Buchung der erzählten Gildenabgabe | **Bestätigt.** T22 enthält nur `extract.failed`. Kanonischer Schluss: Wehr, 30 Kupfer, Jagd active/ready; nicht Halle/ausgezahlt. |
| 118 Kampf-XP, L2 mit 18 Rest, drei Kills | **Bestätigt.** XP-Events +46/+72. Zwei Encounters mit drei tatsächlichen besiegten Gegnern. Schlusswerte HP 71, MP 8, fünf Punkte verteilt. Kein neuer XP-Rechenfehler. |
| Board funktioniert 2+2+1 ohne Repair | **Bestätigt**, aber als spezifische natürliche Abnahme des .84-Kollisionsfixes **zu weit formuliert**: Beide Jagden dieses Boards liegen außerhalb eines Dungeons. Die problematische Kombination Dungeonjagd plus Räumung wird nicht ausgeübt. |
| T16 Reise zum Schuppen/abhängige Deltas abgewiesen | **Bestätigt.** Kein entsprechendes GO gebucht; `no_go` und sechs `scene_context`-Ablehnungen sind korrekte Schutzentscheidungen gegen eine erfundene Verlagerung. Die Erzählung bleibt widersprüchlich. |
| Neuer Delivery-Fehler | **Nicht belegt.** Die zwei Lieferangebote bleiben listed; weder angenommen noch ausgeführt. Gespielt wird eine Monsterjagd. NPC→PC-Brotgeschenk und Guild-Turn-in sind keine Lieferquest. |
| Kein Ausrüstungskauf/Lootverkauf/Neuerwerb | **Bestätigt**, aber bei diesem frühen Abbruch kein Nachweis eines versagenden Testleitfadens. Flame Lance gewinnt reale PP; vier Platten und drei Klauen sind bereits gehalten. |
| NPC-Kontinuität natürlich abgenommen | **Weiter offen.** Marda ist ab E36 bereits als entfernte Person gespeichert. Die Brast-Kette wird nicht wiederholt. |

Die Hauptdiagnose der Review trägt. Ein weiterer reiner Budget-/Retry-Hotfix wäre für diesen Lauf falsch; die Antworten enthalten vollständiges, aber falsch verknüpftes JSON.

## 2. Zusätzliche Gegenproben – keine rückwirkend verbuchten Erfolge

`parseExtraction` verweigert beide Originalantworten. Wird in einer Kopie von Call 58 ausschließlich `object.move.object` durch `{new:"heel of bread and hard cheese"}` ersetzt, ist das vorhandene Schema zufrieden. `applyWorld` kann anschließend die bereits autorisierte Ankunft und bedingte Jagdabgabe verarbeiten: 30→70 Kupfer. Die falsche globale Szenenzuordnung lässt vorherige lokale Vorgänge weiterhin scheitern. Das ist eine Sonde, **kein tatsächlich erfolgreicher Run-Turn-in**.

Mit zeitlich richtigen Delta-Szenen, Mardas tatsächlichem `enter` am Wehr vor der Übergabe und anschließender Ankunft funktioniert das bestehende End-to-End-Buchen ebenfalls. Ein neues Questabschluss- oder Auszahlungsverfahren ist dafür nicht nötig.

Eine weitere Sonde zeigt eine **Präsenzlücke bei Sachgeschenken**: Mit korrekter Szenenannotation kann das Objekt von der weiterhin als abwesend gespeicherten Marda zum PC gelangen. `objectNew`/`objectMove` prüfen den NPC-Halter nicht wie den Geber einer Geldzahlung auf aktuelle Präsenz. Bei zurückgewiesener Wiedereinführung erfasst die .85-Sperre außerdem `holder` und die mittelbar über ein Objekt referenzierte Person nicht vollständig. Die tatsächliche Originalantwort wurde vorher vollständig verworfen; im Run entstand daher kein unzulässiges Geschenk. Diese Lücke darf bei einer Recovery-Korrektur nicht übersehen werden.

Betroffene Übergänge: `extract.js:parseExtraction/extractorRequest`; `schema.js:validate`; `runtime.js:runExtraction/applyExtraction`; `world.js:sceneOf`, Personensperre, `objectRef/objectNew/objectMove`, Ankunft und bestehende bedingte Abgabe. Eventautorität und atomare Speicherung sind grundsätzlich brauchbar; ein Formatfehler blockiert jedoch schon vor den fachlichen Einzelprüfungen den gesamten World-Bericht.

## 3. Warum Lieferungen wiederholt auffallen

Es sind mehrere Klassen, kein ständig derselbe Belegfehler:

- Anfangs wurden erzählte Bestätigungen mit realem Besitztransfer verwechselt; READY, Lieferung und Auszahlung mussten getrennt werden.
- Dazu kamen Fracht-/Mengen-/Herkunftsfragen sowie unterschiedliche historische Vertragsformulierungen.
- Neue Verträge sind inzwischen strukturiert, aber Ware, Ziel und Empfänger bleiben teilweise Textbezeichnungen. Sie werden später nochmals auf wechselnde Weltidentitäten abgebildet.
- Reise, Anwesenheit, Objekt-Geschenke und Extraktionsfehler sind allgemeine World-Probleme. Sie erscheinen in Liefergeschichten häufig, gehören aber nicht ausschließlich zu Delivery.

Konkreter Code: `delivery.js:cargoMatches` ab Zeile 37 benutzt Bindung plus Wortabgleich; `destination` ab 86 sucht eindeutige Ortsnamen; `deliveryTarget` ab 136 vergleicht neue Namen und aktuelle Rollen exakt. Der Boardvalidator prüft die Form des Deskriptors, nicht die zukünftige tatsächliche Weltinstanz.

**Zusätzliche isolierte Sonden an den zwei echten, noch nicht gespielten Run-14-Verträgen:**

- Ein korrekt aufgelöstes Ziel mit aktuellem `toll clerk` wird akzeptiert; nur `clerk` wird abgewiesen. Das ist ohne weiteren Rollenbeleg eine konservativ korrekte Entscheidung, zeigt aber die Anforderung an den späteren Extractor.
- Eine passende `Gretha` wird akzeptiert. Erweitert sich der Name derselben NPC-ID auf `Gretha Holt`, wird sie nicht mehr als Empfängerin des auf `Gretha` lautenden Vertrags erkannt. **Belegte Identitätsbindungslücke, kein in Run 14 aufgetretener Lieferabbruch.**
- Eine bloß ähnlich benannte Destination wird nicht automatisch akzeptiert. Das schützt den richtigen Ort, kann bei unklarer generativer Ortsidentität aber zu einer spielerischen Sackgasse führen.

Mehr Synonymlisten und breitere Namens-Regex lösen diese Klasse nicht zuverlässig: Sie würden auch falsche Personen/Orte freigeben. Gleichzeitig sind Mengen, Besitz, Herkunft und Replay keine unnötige Bürokratie, sondern echte Mechanik. Überflüssig wird Komplexität dort, wo dieselbe Vertragsidentität mehrfach aus Text rekonstruiert wird.

## 4. Technischer Plan – noch nicht freigegeben

### Priorität 1: ein zusammenhängender World-Delta-Fachpatch

**Objektverknüpfung:** Keine erfundene Engine-ID aus einem Namenssuffix erraten. Die bestehende `{new:name}`-Form bleibt gültig. Als strukturelle Alternative zu weiteren Reparaturwortlisten empfehle ich einen eng begrenzten, optionalen antwortlokalen `object.new.ref`, analog zu Personenreferenzen: Nur ein zuvor schemaformal gültiges, eindeutig deklariertes Objekt darf unter diesem lokalen Alias angesprochen werden. Der Alias darf keine bekannte persistente ID überschreiben, nicht doppelt vorkommen und nicht vor seiner Definition verwendet werden. Die Engine erzeugt weiter ihre eigene Objekt-ID. Die vorhandene antwortlokale `objectsNew`-Zuordnung kann dafür dienen; kein persistenter Referenzmanager oder neuer Eventtyp.

Die konkrete Reparaturhilfe erklärt beide zulässigen Verknüpfungen feldbezogen. Ein unbekannter String **ohne** passende lokale Deklaration bleibt ungültig. Original Call 58 darf deshalb weiterhin Repair verlangen; Call 59 könnte mit expliziter lokaler Deklaration formal verarbeitet werden. Das ist die geplante Semantik, noch kein ausgeführter Grünnachweis.

**Zeitliche Konsistenz:** Das vorhandene `scene` je Delta und bestehende `enter/arrive` verwenden. Ein kompaktes mehrörtiges Beispiel muss zeigen: NPC kommt am Ausgangsort hinzu → tatsächliches Geschenk dort → autorisierte Reise → Ankunft → Gildenabgabe. `present` bezieht sich auf diesen Ereignisschritt, nicht nur das Ende des gesamten Replies. Kein zusätzlicher GO für autonome NPCs. Kein Ortswechsel allein aufgrund des Szenenlabels.

**Sachgeschenk:** Beim tatsächlichen NPC→PC-Transfer müssen Geber/Objekthalter am Ereignisort präsent sein; eine verworfene Wiedereinführung darf nicht über `holder` oder das Objekt umgangen werden. Entfernte NPCs dürfen weiterhin existieren oder Besitz halten. Geprüft wird die physische Übergabe, nicht ihre entfernte Existenz.

**Erhalten:** bisherige Zahl der normalen Requests/Repair-Versuche, Providerbudgets, Engine-Inventarautorität, Kauf-/Auto-Loot-Schutz, bestehende Bedingungen für Ankunft/Turn-in und endgültiger einmaliger Commit. Keine pauschale Teilübernahme beliebiger ungültiger Deltas: ihre impliziten Abhängigkeiten sind dafür noch nicht allgemein abgesichert.

**Abnahme:** Original 58/59 und die tatsächlich gesendete Repair-Nachricht; gültige alte/neue Referenz, unbekannte ID, doppelte/kollidierende/vorzeitig benutzte lokale Referenz, zwei gleichnamige neue Objekte, ungültige Deklaration. End-to-End Geschenk am Wehr → gültige Rückreise → genau eine Auszahlung; Gegenfälle abwesender Geber, falsche Szene, kein GO, fehlende Ankunft und doppelte Beute. Replay/Reload/Swipe und alte Extraktionsformen. Erst danach Vollsuite und echter ST-Smoke. Aufwand klein bis mittel, Risiko mittel an Parser/Schema; kein Questumbau erforderlich.

### Priorität 2: Boardumfang bewusst entscheiden

**Empfehlung für die nächsten 10B-Balanceläufe:** Neue automatische Boards vorerst auf vier Jagden plus eine passende Räumung begrenzen; ohne geeigneten bekannten Dungeon fünf Jagden. Mindestens eine geeignete Einzelgegner-Einstiegsjagd erhalten. Generator, Familie/Quotenvalidator und Repair gemeinsam anpassen. Alte angenommene Lieferungen weiter abwickeln; freie Gegenstandsübergaben, Reisen und NPC-Hilfe bleiben bestehen. Kein Löschen des Liefercodes oder alter Saves, keine gleichzeitige XP-/Kampfwertänderung. Das ist **eine Designempfehlung, noch keine neue verbindliche Entscheidung**.

Vorteil: weniger neue Vertragskombinationen und mehr nutzbare Beobachtungszeit für Kampf, Ausrüstung und Skillwachstum. Nachteil: weniger nichtkämpferische Gildeneinnahmen und Abwechslung; reine Jagden machen Anfänger nicht automatisch sicherer. Der Run-14-Abbruch würde dadurch allein nicht verschwinden.

**Falls offizielle Lieferungen bleiben sollen:** Ein kleiner, geschlossener Gildenkurier-Modus wäre zuverlässiger als beliebige Freitextlieferungen: Die Engine stellt bei Annahme genau gebundene Questfracht aus; das Ziel ist ein kanonischer Ort; die Abgabe nutzt einen ausdrücklich erlaubten Ablagepunkt und vorhandenes DROP/Receipt. Kein dynamischer Empfängerrollenvergleich oder unterschwellige Zusatzpflicht. Das begrenzt den garantierbaren Mechanikumfang, kostet aber einen eigenständigen Fachpatch. Keine Empfehlung, gleichzeitig noch diesen Ausbau und die Boardbeschränkung zu implementieren.

## 5. Entscheidung

Eine kleine Universalkorrektur für sämtliche bisherigen und zukünftigen frei generierten Lieferfälle kann ich nicht belastbar versprechen. Dafür hängen zu viele semantische Entscheidungen an Figuren, Rollen, Orten und Besitzübergängen. Die dauerhafte Alternative ist ein engerer ausführbarer Vertrag mit stabilen Identitäten oder ein reduziertes Board.

Für den jetzigen Schwerpunkt würde ich **den allgemeinen World-Delta-Fachpatch priorisieren und Delivery aus der automatischen Boardgenerierung vorerst herausnehmen**, statt die nächsten Runden in weitere Empfänger-/Wortlautkorrekturen zu investieren. Erst die eigentliche Spielschleife über einen längeren natürlichen Lauf beurteilen. Das löst nicht jedes LLM-Problem, trennt aber notwendige Engine-Zuverlässigkeit von optionaler Questvielfalt.
