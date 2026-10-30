# Avereth .126 – Sols Gegenfeedback zu Claudes Architekturaudit

**Stand:** 30.10.2026  
**Prüfbasis:** Produktcommit `b8d2af4b76cd0bc52ac178b8c500e5733878ecee`, Build `4.3.0-c.6.6.126`; Claudes `AVERETH_ARCHITEKTURAUDIT_126.md`.  
**Modus:** Gegenbewertung und Planung, keine Implementierungsfreigabe. Keine Produktdateien verändert und keine neue Vollsuite ausgeführt. Codepfade wurden gelesen; die genannten Arten- und Ausrüstungsbeispiele wurden durch lesende Funktionssonden überprüft. Zahlen und Messungen aus Claudes Audit sind, soweit nicht ausdrücklich anders angegeben, dessen Ergebnisse.

## 1. Neue verbindliche Grundlage des Projektinhabers

Nach der ersten Gegenbewertung hat der Projektinhaber ausdrücklich klargestellt:

> „Alte Runs existieren nicht und sind keine Einschränkung für technische Weiterentwicklung.“

Gemeint ist: Es gibt keine zu schützenden alten Spielkampagnen, deren Weiterbespielbarkeit technische Verbesserungen begrenzen soll. Historische Testexporte existieren weiterhin als Belege und Regressionsmaterial. Sie begründen jedoch keine Verpflichtung, historische Regeln, Balancewerte oder sämtliche alten Ausführungspfade dauerhaft zu unterstützen.

Diese Klarstellung ändert meine erste Bewertung von **V6 und V7 wesentlich**. Ich hatte die Kompatibilität alter Kampagnen zu stark als bestehende Anforderung behandelt.

**Daraus folgt für die weitere Planung:**

- Die aktuelle Produktkonfiguration wird zum Standard für neue Kampagnen und neue Integrationstests.
- V3, V4-A und Ruleset 1 müssen nicht als eigenständige spielbare Produkte erhalten bleiben, soweit ihre Unterstützung nur historischen Kampagnen dient.
- Gemeinsam genutzte Funktionen bleiben bestehen, bis ihre aktuellen Nutzer geprüft sind. Insbesondere nutzt der C-Pfad Teile des V3-Adapters.
- Historische Fixtures dürfen für aktuelle Regeln aufbereitet werden; die Originalexporte bleiben unverändert archiviert. Nicht mehr benötigte historische Erwartungen dürfen entfallen, ohne fachliche Sicherheitsregressionen zu verlieren.
- Replay, Reload, Swipe und Regenerate müssen innerhalb der aktuell unterstützten Kampagne weiterhin konsistent funktionieren.
- Das bedeutet keine Freigabe zum Löschen alter Exporte oder Reviews und keinen automatischen Auftrag, jetzt sämtliche Legacy-Dateien zu entfernen.

Auch meine `.126`-Sonderbehandlung für historische Jahrlinge war ausschließlich durch den Erhalt alter Vertragsauswertung begründet. Unter der neuen Vorgabe ist sie ein berechtigter Vereinfachungskandidat.

## 2. Gesamturteil

Der Kernbefund des Audits ist richtig: **Mechanische Bedeutung wird an mehreren Schnittstellen wiederholt aus freien Texten rekonstruiert.** Das betrifft insbesondere Artenzuordnung, Ausrüstungsprofile und Teile des Handels. Weitere Einzelwortlisten lösen diese Fehlerklasse nicht dauerhaft.

Event-Sourcing, deterministischer Kampf, gespeicherte Angebote, Skill-Komposition und die Host-Sicherungen sind tragfähige Grundlagen. Die Notwendigkeit einer vollständigen neuen World-Architektur ist dagegen nicht nachgewiesen.

Meine Empfehlung ist deshalb: historische Varianten gezielt abbauen, die verbleibenden mechanischen Zuordnungen ausdrücklich speichern und vorhandene Buchungswege weiterverwenden. Größere Reise- und Strukturänderungen bleiben ernsthafte Optionen, müssen aber ihren zusätzlichen Nutzen belegen.

Spielerfreiheit und Weltrealismus sind dabei **keine absoluten Ausschlusskriterien**. Einschränkungen sind vertretbar, wenn ihr technischer Gewinn konkret größer ist als der spielerische Verlust. Umgekehrt sollte eine Einschränkung nicht allein deshalb übernommen werden, weil sie Code sparen könnte.

## 3. S1 / V1a – Kreaturen und Jagd

### Befund bestätigt

Lesende Sonden auf `.126` bestätigen:

| Artbezeichnung | Aktuelle Populationszuordnung |
|---|---|
| `wild boar sow`, `wild boar yearling` | erkannt |
| `wild boar tusker`, `wild boar matriarch` | nicht erkannt |
| `red deer stag`, `red deer hind` | nicht erkannt |
| `grey wolf alpha`, `grey wolf bitch` | nicht erkannt |
| `grey she-wolf` | erkannt |

Betroffen sind `src/v4/domain.js:populationAt`, die Profilbildung in `src/engine.js:materialise` und anschließend `src/v4/guild.js:defeatTally` / `cullKind`.

Präzisierung: Eine fehlende Populationsbindung führt nicht immer zu einem niedrigen Level. Ein vorhandenes Gebietsprofil kann weiter greifen. Bei neuen populationsgebundenen Jagden fehlt allerdings die notwendige Zugehörigkeit für den Fortschritt.

### Empfehlung

Explizite mechanische Populationszuordnung und Altersgruppe sind sinnvoll. Name, Geschlecht, Erscheinung und erzählerische Individualisierung bleiben davon getrennt.

**Die vorgeschlagene Prüfung über Ortslinie und Körperbau allein reicht nicht.** Unterschiedliche Arten können denselben Körperbau besitzen. Eine formal gültige Populations-ID beweist deshalb noch keine passende Art.

Das Lösungskonzept muss ausdrücklich unterscheiden:

1. **Mitglied einer bekannten Population:** Die referenzierte Population liefert die kanonische mechanische Art; die individuelle Bezeichnung ist frei. Ortsbezug und widersprüchliche strukturierte Angaben werden geprüft.
2. **Unabhängige Kreatur:** Sie darf am selben Ort entstehen, wird aber nicht automatisch Mitglied der Jagdpopulation.
3. **Nicht eindeutig zugeordnet:** Keine stillschweigende Bindung nur aufgrund eines passenden Körperbaus. Die Behandlung fehlender Angaben muss im Fachplan eindeutig sein.

Ein LLM kann auch eine gültige ID semantisch falsch auswählen. Geschlossene Referenzen entfernen Namensraten, garantieren aber kein fehlerfreies Weltverständnis. Der Plan sollte diesen verbleibenden Vertrauensbereich offen benennen.

Für das neue Protokoll sollte ein ungültiger strukturierter Verweis nicht unbemerkt auf denselben unsicheren Textmatcher zurückfallen. Ohne Kompatibilitätszwang können neue mechanisch relevante Felder verbindlich sein. Alte Exportformate können in Testwerkzeugen aufbereitet werden, statt dauerhafte Produktfallbacks zu erzwingen.

### Kill-Credit-Events vorerst nicht erforderlich

Ein eigener Kill-Credit-Event ist eine mögliche spätere Lösung, aber nicht automatisch Bestandteil dieser Korrektur. Stabile gespeicherte Art-, Populations- und Altersmerkmale könnten bereits die bestehende Zählung ausreichend absichern.

Eine zusätzliche Zuteilungsbuchführung wird besonders interessant, wenn überlappende Jagdverträge wieder erlaubt werden. Diese sind aktuell bewusst ausgeschlossen. Vor Einführung ist zu zeigen, welches verbleibende Problem die bestehenden Todes-/Fluchtinformationen plus feste Merkmale nicht lösen.

## 4. S2 / V1b / V2 – Ausrüstung und Handel

### Befund überwiegend bestätigt

`itemProfile()` liefert aktuell:

| Bezeichnung | Ergebnis |
|---|---|
| `finer longsword` | Common, ATK 10 |
| `fine longsword` | Fine, ATK 14 |
| `dwarven-steel longsword` | Common, ATK 10 |
| `quarterstaff`, `falchion`, `dirk`, `sling`, `grimoire` | kein Ausrüstungsprofil |

Nicht jeder unbekannte Name ist für sich ein Enginefehler. Problematisch wird es, wenn ein vermeintliches Upgrade angeboten wird, dessen mechanische Eigenschaften nicht zur Darstellung passen. Ein besonderes Materialwort muss außerdem nicht automatisch bessere Werte bedeuten. Das Beispiel „dwarven“ ist keine Empfehlung, klassische Fantasyvölker in Avereth einzuführen.

### Vorhandenes Angebotssystem erweitern

Strukturierte Angebote existieren bereits: Zeilen-IDs, gespeicherte Profile und Preise, `offer.created`, verbindliche Anzeigen und `bookPurchase()` als Buchungsfunktion. Auch kanonische Angebote sind vorhanden.

Die wesentliche Lücke liegt beim Erzeugen dieser Angebote: `world.js:offerLines()` leitet das Profil aus `line.what` ab und prüft zunächst Preisprosa, bevor reguläre Gearpreise gegebenenfalls korrigiert werden.

Empfohlener enger Zuschnitt:

- Unterstützte Vorlagenkennung und Qualitätsstufe für mechanisch wirksame Ausrüstung.
- Werte und reguläre Preise aus Engine-Content.
- Freie Namen und Beschreibungen ohne zusätzliche mechanische Versprechen.
- Pakete als mehrere echte Angebotszeilen; Kauf bleibt bei der bestehenden Transaktion.
- Vorhandene Zustimmung, Preislimits, Verkäufer-/Ortsprüfung und Einmaligkeit weiterverwenden.
- Preisänderungen dürfen keine zuvor nicht autorisierte höhere Zahlung auslösen.

**V2 light ist die bevorzugte Ausgangsbasis.** Bedingte Käufe können bleiben, wenn sie gegen ein gültig gebuchtes Angebot und tatsächlich passende Zustimmung ausgeführt werden.

V2 strikt ist weiterhin prüfenswert: Ein zusätzlicher Einkaufszug kann als bewusster Gameplaykompromiss akzeptabel sein. Die behauptete Einsparung von 300–400 Zeilen und die vollständige Entbehrlichkeit aufgeschobener Abwicklung sind jedoch noch kein geprüfter Löschplan. Insbesondere andere Waren, Dienstleistungen und Verkäufe müssen getrennt betrachtet werden.

Vorlagen und Qualität verlangen weder ein Verbot besonderer Namen noch zwingend ein Verbot des Feilschens. Feilschen wäre eine gesonderte, begrenzte Preisregel für ein mechanisch eindeutig definiertes Produkt. Kein neues Rabattsystem nebenbei einführen.

## 5. S6 / V6 – Teststrategie

### Harness-Kritik berechtigt, Reichweite präzisieren

`tests/v4/harness.js:Chat4` entfernt aktuelle Flags standardmäßig. Das erleichtert versehentliche Tests historischer Konfigurationen. Neuere Tests verwenden allerdings auch direkt `startCampaign()`, `loadProductContent()` oder aktuelle Originalzustände. Die Zahl der `Chat4`-Nutzer beschreibt deshalb nicht die gesamte Produktabdeckung.

Mit der neuen Nutzervorgabe ist die aktuelle Konfiguration als Standard richtig. Dabei müssen historische Tests fachlich gesichtet werden:

- Sicherheitsaussage erhalten, etwa keine doppelte Auszahlung oder keine Bewegung ohne Berechtigung.
- Nur historisch begründete Zahlen-/Pfaderwartungen anpassen oder entfernen.
- Nicht jede rote Assertion blind an den neuen Ist-Zustand angleichen.
- Eine aktuelle Integrationskette mit allen Produktregeln absichern: Erstellung → Gilde → Jagd → Kampf → Verkauf/Kauf → Fortschritt.

### Golden Replay allein reicht nicht

Gespeicherte Events erneut zu falten prüft Reducer und Zustandskonsistenz. Es führt weder `applyWorld()` noch Angebots- oder Populationszuordnung erneut aus. Deshalb kann es einen fehlerhaften Refactor dieser Funktionen nicht zuverlässig erkennen.

Benötigt werden zwei getrennte Prüfungen:

1. **Aktuelles Event-Replay:** Gebuchte Events erzeugen nach Reload/Swipe den erwarteten aktuellen Zustand.
2. **Verarbeitungsregression:** Vorzustand + Spieler-/Plannerdaten + Narration + Extractorantwort erzeugen die erwarteten neuen Events, Ablehnungen und Folgezustände.

Historische Originalfälle dienen als Szenarien und Fehlerbelege. Bei bewussten Regeländerungen müssen ihre neuen Sollwerte ausdrücklich begründet werden; vollständige Gleichheit jedes alten Endzustands ist keine Abnahmebedingung mehr.

## 6. S7 / V7 – Historische Varianten jetzt gezielt abbauen

V7 erhält durch die Klarstellung des Projektinhabers höhere Priorität.

Vorgehen:

1. Aktuell unterstützte Produktkonfiguration dokumentieren.
2. Verwendungen historischer Flags und Pfade unterscheiden: reine Kompatibilität oder aktuelle gemeinsame Funktion?
3. Überflüssige Zweige entfernen; `f_progression`, `f_balance` und `starter_aoe` können normale Produktregeln werden, soweit keine unabhängige aktuelle Funktion einen Schalter benötigt.
4. Tests auf die aktuelle Konfiguration ausrichten, fachliche Sicherheitsfälle erhalten.
5. Versionsangabe für Diagnose und unterstützte Saves beibehalten; keine universelle Policy- oder Migrationsengine neu bauen.

Eine einzelne Versionsnummer macht alte Unterschiede nicht automatisch einfacher. Der eigentliche Gewinn entsteht durch das Entfernen nicht mehr benötigter Regeln. Auch die XP-Policy muss nicht nachträglich historisch versioniert werden, wenn diese Unterstützung nicht verlangt wird; Dokumentation und tatsächliche Produktpolitik müssen übereinstimmen.

Das ist eine geplante Bereinigung, kein Freibrief, den V3-Adapter trotz aktueller Nutzer zu löschen. Ohne belegten Nutzen keine große mechanische Umbenennung aller Aufrufstellen.

## 7. S3–S5 / V3–V5 – Reise, World-Verarbeitung und Prompts

| Vorschlag | Gegenbewertung |
|---|---|
| Engine bucht jede Reise vor der Narration | Ernsthafte Designoption, derzeit nicht als notwendiger Fix belegt. |
| Neuer replaystabiler Reisegefahrenwurf | Eigenständige Gameplaymechanik; nicht als bloßer Architekturcleanup einführen. |
| Nur ein Szenenwechsel pro Antwort | Kann vereinfachen, kostet aber zusätzliche Eingaben und beschränkt funktionierende Abläufe. Gewinn zuerst konkret zeigen. |
| World-Handler fachlich auslagern | Sinnvoll an konkret bearbeiteten Bereichen; Reihenfolge und Transaktionsgrenzen müssen explizit erhalten bleiben. |
| Allgemeines `WorldTxn` | Noch kein belegter Mehrwert; darf nicht nur die bisherigen geteilten Variablen anders verpacken. |
| V3-Adapter auflösen | Nach Nutzeranalyse schrittweise möglich; darin enthaltene aktuelle Regeln müssen erhalten bleiben. |
| Modellwahl pro Aufgabe | Sinnvolle optionale Fähigkeit; anschließend Qualität, Latenz und Kosten messen. |
| Prompttexte zentral pflegen | Sinnvoll; eine Regel darf trotzdem in mehreren getrennten Modellaufrufen nötig sein. |
| Fold-Cache / kleinere Saves | Erst bei gemessenem Bedarf. |

Die drastischen Chronologie-Zahlen aus `.98` sind historische Belege, aber kein ausreichender Maßstab für `.126`. Die aktuellen Batches zeigen wesentlich bessere technische Stabilität. Auch bei gutem Kanon bleibt eine autorisierte und anschließend bestätigte Ankunft mit Engine-Ortsautorität vereinbar; die Engine muss dafür nicht zwingend jede Reise vorher vollständig entscheiden.

Dateigröße, Regex-Anzahl und häufige Änderungen sind Warnsignale, keine alleinigen Fehlernachweise. Die bestehenden End-to-End-Tests können `applyWorld()` bereits prüfen; eingeschränkt ist vor allem die isolierte Testbarkeit seiner inneren Helfer.

### Foldfehler höher priorisieren

`src/host.js:foldChat()` sammelt Fehler von `applyEvent()` und liefert den weiter aufgebauten Zustand zurück. `src/v4/runtime.js:prepareGenerationAsync()` verwendet dessen `.state` anschließend ohne Auswertung dieser Fehler.

Das ist ein bestätigter Codepfad, kein nachgewiesener Fehler der jüngsten Batches. Er verdient eine gezielte Integritätsprüfung: Ein beschädigter autoritativer Zustand darf nicht still Grundlage neuer Geld-, Kampf- oder Fortschrittsbuchungen werden. Erst Diagnose/Regenerate beziehungsweise ein klarer Wiederherstellungsweg, keine automatische Reparatur erfundener Zustände.

Das widerspricht nicht der gewünschten Fehlertoleranz gegenüber unwichtiger NPC-Prosa. Verwerfbare Erzählangaben und ein fehlgeschlagener Zustandsaufbau sind unterschiedliche Fehlerklassen.

## 8. Empfohlene Reihenfolge

| Schritt | Umfang | Bewusst nicht enthalten |
|---|---|---|
| 0 – Produktbasis und Absicherung | Aktuelle Konfiguration als Standard; historische Zweige gezielt abbauen; Verarbeitungstests und Foldfehler-Prüfung | Vollständiger World-Neubau, neue Migrationsengine |
| 1 – Kreaturen/Jagden | Explizite Populations-/Alterszuordnung, feste mechanische Merkmale, bestehende Zählung | Neue Ökologiesimulation, überlappende Verträge, pauschal neue Killbuchführung |
| 2 – Handel | Vorlagen/Qualität, verbindliche Standardangebote, Paketfall, bestehende Kauftransaktionen | Neue Slots, Kampf-/XP-/PP-Balanceänderungen |
| 3 – Erneut messen | Natürliche Batches und aktuelle Repair-Ursachen auswerten | Automatischer Reiseumbau aufgrund alter `.98`-Zahlen |

Kleine fachliche Auslagerungen dürfen innerhalb dieser Schritte erfolgen, wenn sie die konkrete Änderung verständlicher machen. Die komplette Bereinigung aller Legacy-Pfade muss nicht den gesamten fachlichen Fortschritt blockieren.

## 9. Noch offene Designfragen – keine Vorbedingung für dieses Gegenreview

**Bereits entschieden:** Alte Kampagnen sind keine Kompatibilitätsgrenze. Technisch begründete Einschränkungen von Weltrealismus oder Spielerfreiheit dürfen vorgeschlagen und abgewogen werden. Das ist noch keine Zustimmung zu jeder einzelnen Einschränkung.

Vor den jeweiligen größeren Umsetzungsschritten sind höchstens folgende Entscheidungen erforderlich:

| Entscheidung | Empfehlung von Sol | Zeitpunkt |
|---|---|---|
| Müssen neue Käufe immer einen zusätzlichen Bestätigungszug haben? | Vorerst nein; bedingte Käufe bei eindeutiger Zustimmung erhalten. Strikte Variante bei deutlich belegter Vereinfachung erneut bewerten. | Vor Handelsfachplan |
| Dürfen Standardwaren frei ausgehandelte Preise haben? | Aktuell die beschlossenen Enginepreise beibehalten. Feilschen nur bewusst und begrenzt als späterer Designpunkt. | Vor Abweichung von bestehenden Preisregeln |
| Darf der Narrator Reisen weiterhin spontan unterbrechen? | Vorläufig ja. Engine-Reiseverfahren als Alternative mit konkretem Aufwand und Spielerfolgen vergleichen. | Erst bei geplantem Reiseumbau |
| Muss eine neue Version eine schon laufende aktuelle Kampagne fortsetzen können? | Kein pauschaler Versionskompatibilitätszwang. Laufende Batches auf ihrem Build beenden; notwendige Neustarts ausdrücklich ankündigen. Innerhalb eines Builds volle Persistenzsicherheit. | Vor einer tatsächlich inkompatiblen Veröffentlichung |

Die ersten drei Empfehlungen sind keine neuen Beschlüsse des Projektinhabers. Auch die letzte Frage verlangt jetzt keine Verzögerung des Audits; sie verhindert lediglich, aus „keine alten Saves schützen“ eine stillschweigende Erlaubnis zur Beschädigung eines laufenden Tests abzuleiten.

## 10. Bitte an Claude für die nächste Planfassung

Überarbeite den Fahrplan unter der neuen Legacy-Vorgabe. Trenne bestätigte Fehler, Designentscheidungen und optionale Strukturverbesserungen. Prüfe insbesondere:

- Welche konkreten historischen Zweige können entfallen, welche nutzen aktuelle Funktionen weiter?
- Wie verhindert die strukturierte Population eine falsche Zuordnung zwischen Arten mit gleichem Körperbau?
- Reichen feste Kreaturenmerkmale für die vorhandene Questzählung, bevor neue Credit-Events eingeführt werden?
- Welche Teile des Handels fehlen tatsächlich, obwohl Angebote, Profile, Preise und Buchung bereits existieren?
- Welche Originalantworten müssen durch die Verarbeitung erneut ausgeführt werden, statt nur ihre alten Events zu falten?
- Welche Einschränkung spart nachweisbar welche Komplexität, und welchen sichtbaren Preis zahlt der Spieler dafür?

Noch keine Implementierung aus diesem Gegenfeedback ableiten. Ziel ist ein kleinerer, belastbarer Fahrplan, der die belegten Fehlerklassen behebt und unnötige historische Varianten entfernt, ohne ein neues allgemeines Framework zu schaffen.
