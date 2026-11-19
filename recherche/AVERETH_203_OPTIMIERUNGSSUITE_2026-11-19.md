# Avereth .203 – Optimierungskandidat für den Gegenreview

**Entscheidung vom 19.11.2026.** Der Kandidat verbindet S1 und B1 mit einem kürzeren P-/X-Marktkatalog, einer kleineren ersten Questtafelantwort und einem effizienteren bestätigten Speichern. Kompaktes Extractor-JSON und das Preset mit der Karte vor der Lore sind getrennt wählbar. Die natürlichen Modellantworten, Cachetreffer und Gesamtzeiten dieses Pakets stehen aus. Der bekannte Anwesenheitswiderspruch bei User06 I18 bleibt im Referenzlauf und im Kandidaten nachweisbar. Der Kandidat geht in den unabhängigen Review. Eine persönliche oder produktive Freigabe steht aus.

[Vorheriger Integrationsstand](AVERETH_203_PERFORMANCE_INTEGRATION_B1_X1_X2_2026-11-19.md) · [Work-Recherche und Quellen](AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md) · [Windows-A/B-Anleitung](performance_suite_203/AB_WINDOWS.md) · [Technische Messwerte](performance_suite_203/messwerte.json)

## Vergleich und Arbeitsstände

Alle 14 Remote-Branches wurden vor dem Anlegen des neuen Branches gelesen. Die angegebenen acht Ausgangsstände stimmten überein. Die Laufzeitarbeit begann bei S1+B1. Der unveränderte .203-Checkout diente der unabhängigen Referenz. Die Archivdaten stammen aus einem gesonderten Checkout von main.

| Grundlage | Verifizierter Ausgangscommit |
|---|---|
| Produkt .200 | `0cd14806cd0c7fe2ab0d54b8463c486ee572714b` |
| Referenz A in experiment/action-hud-200-v1 | `5e5b8272412b51b91f75b6e37c5b94d95c9fae11` |
| S1 | `af45acf499137009883a55b1c3e1004567470a9f` |
| B1 | `f18ec4a8a67d7dfbc6c5c61db62482bfc1548b01` |
| Gemeinsame S1+B1-Basis | `399eb5b9f1f814f32a63bdc219f8499dfc107f0b` |
| X1 / X2 offline | `2bad913b0dba624e569392d7b29a10241f0aad15` / `1123b7e5b9d130145f95f860d466842e2cc8ea6e` |
| Dokumentation vor dieser Auswertung | `513419c6d416cab86d20c5ae220ef40e6a8367c8` |

S1 und B1 wurden vom bestehenden Branch übernommen. Die folgenden Messungen und Abnahmen wurden für diesen Auftrag ausgeführt. Die ursprünglichen S1-Rotläufe, die damalige B1-Implementierungsabnahme und die vollständige Abnahme der damaligen .203-Entwicklungsbasis sind frühere, im Integrationsbericht verlinkte Belege. Der deterministische Wiedereinsatz einer archivierten Modellantwort kann einen fachlichen Unterschied zeigen. Ob ein Modell auf die geänderte Anweisung selbst eine gleich gute Antwort erzeugt, erfordert einen natürlichen Versuch.

## 0 · Zeitpunkte und Messgrundlage

**Befund und Fachplan.** Die .203-Records enthalten die physischen Nebenaufrufe mit Dauer, Repair und berichteter Usage. Der Streaming-Smoke beobachtet den ST-Chat pro Browserframe und sendet nach dem Speichern den zuvor blockierten lokalen Entwurf. Für die Zuordnung zum Sendeklick fehlten die beiden monotonen Zeitpunkte des Weltjobs. Die vorhandene Abschlussmeldung erhält den Zeitpunkt unmittelbar nach der Weltänderung und nach bestätigtem Read-back. Die bestehende Mock-Verbindung misst pro physischem Aufruf die Dauer bis zum Responseabschluss. Der normale Speicherpfad und die Weltevents dienen als Gegenprobe. Berechnete Modellschätzungen ersetzen keine fehlenden Usage-Daten.

| Messpunkt ab Klick, Median aus 4 Paaren | Gepuffert | Natives Streaming, Smooth aus |
|---|---:|---:|
| Erster vollständiger Prosasatz im Chatviewport | 2.267 ms | 879 ms |
| Gesamter Endtext im gerenderten Chat | 2.259 ms | 2.172 ms |
| Weltmutation abgeschlossen | 3.495,5 ms | 3.533,5 ms |
| Speichern und Read-back bestätigt | 3.576,5 ms | 3.596 ms |
| Nächster Zug sicher sendbar | 3.583,5 ms | 3.602,5 ms |

Messlauf vor den Folgeoptimierungen auf der gemeinsamen S1+B1-Basis mit ergänzten Messpunkten. Je Arm vier Läufe aus demselben Seed, je Lauf P → N → X. Der Mock terminiert N nach 1.800 ms. Die Sichtbarkeit des ersten Satzes verlangt Lage im Viewport. Der vollständige Text kann gepuffert bereits im DOM stehen, während ST noch scrollt. Weltcommit, Dateibestätigung und Annahme des Folgeentwurfs sind getrennte Beobachtungen. Die acht Welt-/Textvergleiche innerhalb der vier Paare und die Reihenfolge Commit → Save → Freigabe bestanden. 19 Weltjobtests und 59/59 ST-Prüfungen im Messlauf. Das Experiment isoliert den Darstellungsunterschied bei gleichem Runtimecode. P-/Board-/X-Zeiten, Wiederholungen und Fehler stammen für persönliche Vergleiche aus den vorhandenen physischen Records, N zusätzlich aus der ST-Zeitspur. Bei fehlender Provider-Usage bleibt die betreffende Spalte offen.

## 1 · Kompakter Extractor

**Befund und Fachplan.** X1 kann historische Antworten mit aktiver Swipe-Revision, HUD, Szene und erwarteten Aktionen prüfen. Die Varianten sind der bestehende Systemauftrag und derselbe Auftrag mit einem Zusatz am physischen Versand. Dadurch gilt der Schalter auch für Leerantworten und Reparaturen. Der Standard bleibt ausgeschaltet. Der Zusatz verlangt Einzeilen-JSON und erlaubt ausschließlich optionale Nullwerte an Deltaobjekten wegzulassen. Das übrige Schema und die Firewall bleiben vollständig. Entscheidungskriterien waren gleicher Parserbefund je Antwort, gleiche Deltas und Ablehnungen, gleiche Ereignisreihenfolge zwischen A und B, gleicher Reloadzustand, Erhalt der späteren Zusage und ein messbarer Umfangsunterschied.

| Korpus | Physische Antworten / Jobs | Sichtbare GLM-Inhaltstokens A → B | Zusätzliche Eingabetokens für den Ausgabeauftrag |
|---|---:|---:|---:|
| User05 A–C | 20 / 19 | 4.555 → 3.440 | 640 |
| User06 | 12 / 10 | 2.532 → 1.998 | 384 |

32/32 vorhandene physische Antworten rekonstruierbar, davon 31 parsergültig. 29/29 Jobs haben zwischen den Varianten dieselben Events und Welten. Zwei tatsächlich verwendete Repairs in User06 bei I14 und I18. User05 I34 benötigt auf .203 den archivierten zweiten Versuch nicht. Gegen das historische Endergebnis stimmen 29/29 Welten und 28/29 Eventreihenfolgen, die abweichende Repair-Markierung bleibt sichtbar. Für User06 I25 fehlt das physische Paar im Serverlog. Die 55,786 s für I20 stammen vom historischen Providerlauf. Der Vergleich hier verwendete die beiden archivierten Waffenfakten für die jeweiligen Gegner.

Der Zusatz kostet in jedem der 32 gerenderten Archivrequests 32 Eingabetokens. Den 1.649 eingesparten sichtbaren Inhaltstokens stehen 1.024 zusätzliche Eingabetokens gegenüber. Ausgabetokens mit verborgenem Reasoning sowie Cache und Generierung bleiben offen. Die lokalen Parser-Mediane lagen je Archivabschnitt bei beiden Formen unter 1 ms. Falsche NPC-Partei, fehlende Zusage, falsche Ankunft, verworfener Swipe und zusätzliche Fakten werden im X1-Gegenkorpus erkannt. Tam Ostlers korrekt gebundene Zusage erreicht den Kontext nach 16 weiteren Zügen. Sechs natürliche Revisionen haben spezifische Prosa-Anker. Diese decken ausgewählte Fakten ab. Bei I18 bleibt die laut Prosa am Tor zurückgebliebene Wache in beiden gefalteten Welten anwesend. Daher nur optionales Experiment.

## 2 · Marktkatalog in Planner und Extractor

**Befund und Fachplan.** `buildCatalog` liefert P und X denselben Markttext. Der Narrator erhält bei Bedarf eine eigene Fassung. Arm P2-A verdichtet den maschinenlesenden Text. Kategorien und Slots, Basis-IDs und Namen, Qualität, Aufteilung von Paketen, Ausrüstungswirkung und Preisbindung bleiben verfügbar. Konkrete Angebote, Gelder, Dienste und Entscheidungen stammen weiterhin aus ihren bisherigen Katalogen und Schemata. Der Hinweis, wie ein Händler Waren anpreisen soll, gehört zur Erzählrolle. Arm P2-B erprobt das Weglassen von Spezialwissen bei scheinbar handelsfremder Eingabe.

**P2-A integriert.** Im User05-Serverlog stimmten die rekonstruierten Inputlängen für alle 43 betroffenen Requests mit der gemeldeten Usage überein. Der identifizierte Block schrumpfte von 575 auf 497 GLM-Tokens. Die vollständigen gerenderten Requests sparen zusammen 3.354 Eingabetokens. Der Narrator behält den ursprünglichen Text. 89 gezielte Ausrüstungs-/Kontextprüfungen und 160 Finanz-/Handels-/NPC-Prüfungen liefen grün. Die Stabilität neuer GLM-Preis- und Qualitätsantworten bleibt offen.

**P2-B verworfen.** Eine kontrollierte Klassifikation mit Handelswörtern erkannte den ausdrücklichen Kauf im Kampf und den genannten gebundenen Preis. Beim schweigenden Entgegennehmen eines Bucklers, beim bedingten Kauf einer feinen Weidenrute und bei der indirekten Nachfrage nach einem höherwertigen Artikel fehlte sogar im gesamten Eingabe-/Antwortpaar ihr Auslöser. Umgekehrt aktivierte ein Gildenbeitrag den Ausrüstungskatalog. Der volle Fachkontext bleibt bei offenen oder gemischten Eingaben verfügbar. Geschenke, Bedingungen, Beiträge und Dienstleistungen behalten ihre eigenständigen Regeln. Diese Gegenprobe misst die Fehlklassifikation des vorgeschlagenen Routers. Die nachgelagerte Modellantwort auf einen fehlenden Katalog war nicht Teil des Versuchs.

## 3 · Karte vor Lore im finalen ST-Request

**Befund und Fachplan.** ST 1.19 ordnet im Prompt Manager die aktiven Einträge pro Profil. World Info, Systemprompts, ausgewählte History und der Avereth-Interceptor wirken auf die fertigen Nachrichten. Der Custom-Chat-Completion-Pfad kann diese zusätzlich verarbeiten. Der Versuch tauscht in beiden Preset-Reihenfolgen ausschließlich die benachbarten Einträge `charDescription` und `worldInfoBefore`. Abnahme am empfangenden Loopback-Mock nach ST-Aufbereitung, für zwei verschiedene Loreauslöser und zwei Eingabelängen. Ausgabegrenze 4.096, ST-Kontext 32.768, Custom-Postprocessing leer. Der Test vergleicht jede Rolle und jeden Contenthash in ihrer Reihenfolge, einschließlich aktiver Lore, älterer History, aktueller Eingabe und des Enginehinweises.

| Zwei aufeinander bezogene Themen | Gesamte Prompttokens je Szene, beide Arme | Gemeinsames Tokenpräfix Original → Variante |
|---|---:|---:|
| Kurze Eingaben | 10.146 / 10.855 | 491 → 8.241 |
| Lange Eingaben | 26.554 / 27.263 | 491 → 8.241 |

Acht vollständige Modellrequests **der Rolle Narrator** am echten ST-Host mit skriptbasiertem Mock, vier paarweise gleiche Inhaltsmengen (A/B je Szene und Länge). Die Wurzeln von Spieler- und Loreinformationen blieben gleich. Beim Vorversuch mit 18.700 Wiederholungen des GLM-zweiteiligen Worts „reed“ entfiel der aktuelle Spielertext am Kontextlimit. Dieser Lauf verfehlte die Abnahme. Der erfolgreiche Nahgrenzfall verwendete 16.400 Wiederholungen eines einzelnen Tokenworts. Nur dieser passt mit Ausgabereserve in beide Arme. Das ausgelieferte alternative Preset ändert gegenüber dem Original allein die Reihenfolge. Das absolute Präfix ist szenenabhängig. Provider-Cachehits, tatsächliche Vorverarbeitungszeit und Qualität der neu erzählten Szene sind offen. Weitere statische Umsortierungen haben im Versuch keinen eigenständigen Gleichwertigkeitsnachweis erhalten.

## 4 · Situative Fachmodule

**Befund und Fachplan.** Die historischen Systemaufträge umfassen 11.021 GLM-Tokens im Story-Planner, 4.013 im Kampf-Planner und 11.374 im Extractor. Auch im Storymodus kann noch eine gebuchte Kampfchronik vorliegen. Der stabile Kern braucht Parserform, erwartete Schlüssel, Autorität, Reihenfolge, IDs und freie Weltfolgen. Die gesonderte Abschnittsmessung ergibt im Story-Planner 538 Tokens für Gildenvertragsregeln und zugehörige Beispiele, 1.158 für Übergaben und 1.135 für Lernen und Training. Im Extractor beanspruchen allgemeine Regeln 4.547, Formatregeln 1.967 und der Deltakatalog als Block 4.736 Tokens. Die Tabelle ordnet alle 36 einzelnen Deltaschemazeilen einer Fachgruppe zu. Einzeln kodierte Zeilen und zusammen kodierte Abschnitte können an den BPE-Grenzen verschieden zählen.

| X-Schemazeilen | GLM-Tokens |
|---|---:|
| Kampf und Erholung | 1.050 |
| Personen, Fakten, Wissen, Threads | 963 |
| Handel, Gegenstände, Geld | 907 |
| Gilde und Quests | 429 |
| Reise, Orte und Dungeon | 1.303 |
| Zeit und unautorisierte Spielerhandlung | 81 |

**Gegenversuch und Entscheidung.** Eine kontrollierte Ablation erhält im Kampf taktische Ereignisse und entfernt im Storyzustand vier taktische Typen. Eingaben, Prosa, IDs und aus den Originalen entnommene übrige Deltas bleiben gleich. Sieben physische Antworten ändern sich. In sechs Fällen wird aus einer zuvor historisch gleichen Welt eine abweichende Welt. Bei User05 B/I22 und C/I38 fehlen Wahrnehmungen, bei C/I40 und I45 belegte Fakten. Bei User06 I20 verliert das formal gültige Ergebnis die Zuordnung der Waffen zu den beiden Lookouts. Weggelassene Deltas simulieren den Schaden eines zu engen Moduls. Ob ein Modell bei kürzerer Instruktion zufällig das fehlende Ereignis dennoch erzeugt, ist offen.

Gemeinsamer Prüfbereich waren Gespräch und Reise, spontaner Handel, die im HUD-Kampf entstehende NPC-Zusage, bedingte Questannahme, Handlungen einer neu auftretenden Person, ungewöhnliche Geschenke, unfreiwillige Folgen und freier Dialog. Eine zusätzlich geschriebene, kontrollierte Fortsetzung von User06 I20 führt im laufenden Kampf eine Rüstungshändlerin ein. Sie nennt einen festen Preis für einen feinen Buckler, übergibt ein Tuch und verspricht ein späteres Treffen. Referenz und Kandidat buchten mit je einer Extraktion dieselbe Person, das Angebot für 64 cp, den Gegenstand beim PC und den Thread mit den richtigen Parteien. Der Münzstand blieb gleich. Nach dem JSON-Reload waren Events und Zustand identisch. Die neue Passage und ihre Antwort sind ausdrücklich synthetisch. [Wiederholbarer Mischfall](performance_suite_203/mixed.mjs)

Die vorhandenen Tests prüfen unter anderem die doppelte bedingte Questannahme, belegte Übergabe nach Swipe und Reload, die Bindung der Kampfzusage und eine zurückgewiesene freiwillige Abreise. In 66 weiteren gezielten Host-/Mechaniktests blieb der volle Pfad grün. Semantische Anforderungen im Archivbenchmark und Weltgleichheit wurden getrennt geprüft. Der zusätzliche Router erhält ein **NO-GO**. Frei formulierbare Ursachen lassen sich aus Modus, aktuellen Gegnern und erwarteten Spieleraktionen allein unzureichend vorhersagen.

## 5 · Erster Boardentwurf

**Befund und Fachplan.** Bei einer neuen Fünfer-Novice-Tafel des Profils `count_hunt_clear` erzeugt die Engine den veröffentlichten Aufgabentext und den Endzustand einer gezählten Freilandjagd aus Ziel, Stückzahl und Ort. Der Versuch vergleicht vollständigen Modelltext und das Weglassen beider Felder ausschließlich bei vorhandenem Habitat und genau einem bezifferten DEFEAT-Ziel. Die Ergänzung vor der bestehenden Gesamtprüfung verwendet denselben Endzustand wie die Buchung. Mitgelieferte Zusatzbedingungen werden durch die Ergänzung nicht überschrieben. Der Validator prüft weiterhin die gesamte Tafel samt Population, Habitat, Stufe und Quoten. Titel, Auftraggeber und genaue Ortsangabe bleiben Bestandteil der Ausgabe. Dungeons, andere Profile, uneindeutige Aufgaben sowie Voll- und Slotrepair fordern weiterhin das vollständige Format.

| Original | Erster, fachlich ungültiger Entwurf in kompakten GLM-Inhaltstokens | Gültiger Archivvollrepair im selben Format | Replay mit verkürzter Jagd |
|---|---:|---:|---|
| User04 · Boar → Millrace Viper | 944 → 694 | 941 → 688 | 5 Angebote, 10 originale Events |
| User05 · Snapper → Stray Hound | 924 → 658 | 922 → 657 | 5 Angebote, 10 originale Events |
| User06 · Pike → Marsh Adder | 877 → 651 | 878 → 652 | 5 Angebote, 10 originale Events |

Der erste Request kostet 42 zusätzliche Eingabetokens. Die erste Antwort spart in der retrospektiven Konstruktion 250, 266 bzw. 226 sichtbare Tokens. Der zweite Tabellenvergleich dient der Gegenprobe auf gültigem Material. Die drei ursprünglichen Absagen bleiben Absagen. Der selektive Austausch mit dem jeweiligen archivierten Ersatz erreicht dieselben Quest-IDs, Inhalte, Ereignisse und den gleichen Zustand wie die gültige Vollantwort. Andere Profile und mehrdeutige Ziele mit fehlendem Pflichttext bleiben auf Vollrepair. Bei einem erfolglosen zweiten Versuch ist die neue Tafel leer. Ein bestehendes Tagesboard erfordert null Boardrequests. 47 gezielte Boardtests, die drei Originalabläufe und der gemeinsame ST-Smoke. Die tatsächliche Erstantwortgüte und die Repairquote unter GLM bleiben offen. Alle drei instandgesetzten Originaltafeln brauchen weiterhin je zwei physische Boardrequests. Die Verkleinerung betrifft den Antwortumfang. Die historischen 114,291 s für die zwei User06-Boardanfragen bezeichnen die frühere Wartezeit.

## 6 · Kontext, Reise und NPC-Kontinuität

**Befund und Fachplan.** Gesucht wurde ein konkreter Verlust an zutreffender, für diese Person verfügbarer Information. Dazu wurden die 19 rekonstruierbaren User05- und zehn User06-Revisionen mit sämtlichen Nachrichtenmetadaten auf A und B gefaltet. `turnBlock` wurde am gleichen Spielerindex, mit Regelbudget 800, vier jüngsten Zügen und ST-Lore aufgerufen. Der Vergleich umfasst ganzen Block und Packerdiagnostik. Zusätzlich dienten die Nordroute nach Glimmerdeep, die vorhandenen Dungeonakteure, Brennas Wiederbegegnung, Tam–Bess gegenüber Tam–Alaric, erledigte Zusagen und verworfene Swipes als Gegenproben.

29/29 Blöcke und Diagnosen sind auf A und B gleich. Bei 1.400 gegenüber 900 internen Budgeteinheiten sinkt die Summe von 32.833 auf 32.541 GLM-Tokens für User05 und von 15.934 auf 15.803 für User06. Bereits bei 1.400 entfällt der Abschnitt `relevant` in 15/19 bzw. 6/10 Revisionen. Aus einem ausgelassenen Abschnitt allein folgt kein verlorener NPC-Fakt. Die Zustandswahrheit wird teils über fokussierte Karten, die Quest oder die aktuelle Handlung geliefert. Die separate Prüfung der Nordroute, der Personenbindung und späteren Erinnerung blieb grün. 87 gezielte Kontext-/NPC-/User05-Prüfungen. Die I18-Torwache ist ein Fehler in der belegten Anwesenheit vor der Kontextauswahl. Ein anderer Recall-Score könnte den falschen Weltzustand allenfalls verdecken. **NO-GO** für neues Ranking, pauschale Budgetsenkung oder eine Gedächtnisschicht. Ob GLM die richtige Figur überzeugend reagieren lässt, bleibt eine Frage für den persönlichen Test.

## 7 · Lokale Kosten und Save

**Befund und Fachplan.** Der NPC-Pilot umfasst 141 echte Chatnachrichten und 2,08 MB. Ein zweiter Lastfall verlängert einen kampffreien Präfix über echte Turn- und Weltreducer auf 401 Nachrichten und 2,22 MB. Er repräsentiert viele kurze Spielzüge. Die Last einer Kampagne mit 401 langen Modellantworten kann höher sein. In derselben isolierten ST-Installation wurden Fold, Signatur, JSON, History-Projektion, lokales Tokenzählen, HUD-Klick, Reload und echtes Speichern mit Read-back gemessen. Für die wiederholten Komponenten gab es drei Messungen je Zelle.

| Browserzeit in ms, vor dem Patch | Pilot | Verlängert |
|---|---:|---:|
| Fold / vollständige Signatur / JSON | 5,6 / 23,3 / 9,1 | 6,9 / 21,5 / 9,4 |
| Projektion / ST-Tokenzählung im warmen Pfad | 0,4 / 0,1 | 0,5 / <0,1 |
| Programmatischer Klick im echten HUD bis zum Doppelframe, einzelne Probe | 78 | 97,4 |
| Reload bis Doppelframe, einzelne Probe | 677,5 | 502,5 |
| Speichern einschließlich Read-back vor → nach Patch, Mediane | 612,8 → 514,7 | 764,3 → 601,2 |

Im echten Saveadapter enthielt die Nutzlast des abschließenden Lookup-Requests irrtümlich eine weitere ganze Kopie des gerade geschriebenen Chats. Im kontrollierten Pilotfixture mit kurzen Identifikatoren schrumpfte sie von **2.082.570 auf 56 Bytes**. ST 1.19 ermittelt die Datei über Avatar und Dateiname. Die Rückgabe enthält weiterhin die vollständige Datei. Außerdem signierte der Adapter die private, unveränderliche Nachrichtenliste innerhalb eines Writes mehrfach. Die Signatur wird nun genau für diesen Write wiederverwendet. Aktiver Chat, Serverantwort, Header-Metadaten und Revisionen werden an den bisherigen Stellen vollständig verglichen. Ein weiterer Schreibvorgang erstellt eine neue Momentaufnahme.

Eine zusätzliche Regressionsbedingung war vorher rot (11/12) und danach zusammen mit User05 grün (27/27). Der kontrollierte Offlinevergleich A/B/B/A mit jeweils fünf Saves pro Durchgang ergab für 141 Nachrichten Mediane von 274,4 und 205,3 ms, für 21 Nachrichten 36,8 und 26,2 ms. Er enthält lokale JSON- und Responsearbeit. Im ST-Versuch wurden jeweils drei Saves je Arm tatsächlich geschrieben und gelesen, der Weltzustand blieb nach Reload gleich. Laufzeitschwankungen und gesonderte Messrunden beschränken den Rückschluss auf andere Rechner. Für Fold-/HUD-Caches und Änderungen am Persistenzprotokoll ergibt sich kein zusätzlicher begründeter Eingriff.

Die erste Hostkostenprobe konnte den HUD-Knopf über den angenommenen CSS-Selektor nicht finden. Die Messung wurde am tatsächlichen gerenderten Aktionsknopf wiederholt. In beiden erfolgreichen Hostläufen bestanden jeweils 28/28 Prüfungen.

## 8 · Gemeinsame technische Abnahme

**Fachplan.** Ein vollständiger validierter Erstentwurf, ein Vollrepair und ein Einzelslotrepair sollen dieselbe Welt ergeben. Die Referenz verwendet den unveränderten .203-Laufzeitcode und den gepufferten Narrator. Im kombinierten Kandidatenarm fordert die Engine zuerst das verkürzte Board und nach der lokalen Ablehnung genau einen Ersatz an. ST sendet die Narration mit nativem Streaming, Smooth ist aus. Der Extractor läuft mit kompaktem Output, der Narrator mit dem optionalen Preset. Der Test prüft tatsächliche Reihenfolge und Art der physischen Requests, das Board, den erfolgreichen Extractor, Speichern, Read-back und Reload. Weitere Abnahmekriterien sind die vollständigen Fingerprints im alten Replaykorpus und die bestehenden Mechanik- und Fehlergegenfälle.

Die separate Referenz mit .203 bestand 43/43 Browserprüfungen. Der anschließend ausgeführte gezielte Board-Smoke auf dem gepushten Suite-HEAD bestand 49/49. Beide Läufe meldeten null PageErrors. Der Testrunner des entpackten Referenzarchivs meldet einen leeren Git-HEAD. `index.js` und der vollständige `src/`-Baum wurden gegen den verifizierten Referenzcheckout verglichen. Sämtliche Laufzeitdateien kamen aus dessen Archiv. Die beiden Programme liefen nacheinander in der ausschließlich für diese Aufgabe benutzten ST-Sandbox. Die vollständige Welt nach Reload hatte in A und B den SHA-256 `08c152d2473d4493cfc2728938982ac54f367cad9f3eee28575fbd1514b66471`, die geordneten Ereignisse des verglichenen Zugs den SHA-256 `f29dc9e387223020d7cd03223ce7b209633863ce1d32e1bc2a2eff9c19beca88`. Innerhalb jedes Arms wurde vor und nach Reload auch die Dauer exakt verglichen. Nur für den Vergleich unabhängig ausgeführter Züge wurden die gemessenen Millisekunden in `cmd.interpreted` und `extract.applied` aus den Ereignissen herausgerechnet.

Der gültige Erstentwurf erforderte vier physische Aufrufe (Planner, Board, Narrator, Extractor). Bei Voll- und Slotrepair waren es jeweils fünf. Im Slotarm blieb allein der Narrator gestreamt. Die drei Minuten am Board wurden vom Extractor genau einmal gebucht und blieben gespeichert. Der andere Mock mit zwei ungültigen Antworten erzeugte keine neue Tafel und keine erfundene Öffnungszeit. In der breiten Failsoft-Suite blieben HUD-Bedienung, Quest und NPC-Kontinuität, Kampf, HP/XP, Loot, Zahlung, Spielerhoheit und fehlerhafte Speicheroperationen innerhalb der vorhandenen Abnahmekriterien.

**Vollständige Regression.** Am gepushten Commit bestanden 3.410/3.410 Nodeprüfungen. 2.235 Replays verglichen die exakten Fingerprints. Die 1.131 bekannten, einzeln hinterlegten Abweichungen trafen genau ihr akzeptiertes Ergebnis. Neue Abweichungen 0, zusätzliche Akzeptanzregeln 0. Die Node- und Replayprüfung vor dem letzten reinen Testcommit kam zum selben Ergebnis.

| Isolierte ST-1.19-Browserprüfung mit lokalem Mock | Ergebnis | PageErrors |
|---|---:|---:|
| Standard auf sauberem Suite-HEAD | 354/354 | 0 |
| Failsoft mit demselben Laufzeit- und Prüfcode | 360/360 | 0 |
| Narrator-Streaming und Fehlerfälle | 59/59 | 0 |
| Finaler Request mit beiden Presets | 28/28 | 0 |
| Boardbogen auf sauberem Suite-HEAD | 49/49 | 0 |
| Boardvergleich auf der .203-Referenz | 43/43 | 0 |

Der erste Standardlauf hatte 352/354 bestanden. Die Markierung der Presetreihenfolge fiel in den beiden gepufferten Armen durch, weil ST das alternative Preset aus dem vorherigen Vergleich gespeichert hatte. Der Testtreiber lädt nun die Originalreihenfolge zum Start, setzt die beabsichtigte Reihenfolge je Arm und stellt die vorherigen Einstellungen am Ende wieder her. Die Speicher- und Weltvergleiche bestanden bereits in diesem Lauf. Der anschließende Failsoftlauf verwendete den korrigierten Treiber. Sein Report und der dedizierte Streaminglauf nennen den vorigen Commit mit lokalem Diff, da die Läufe vor dem Commit des Testtreibers starteten. Der saubere finale Standardlauf und die beiden gezielten Suite-Smokes für Board und Präfix verwendeten den anschließend gepushten HEAD.

**Reviewentscheidung.** Der technische Vergleich zeigt gleiche gebuchte Weltfolgen in den geprüften A/B-Fällen. Die Anwesenheit der Torwache in User06 I18 bleibt eine belegte fachliche Lücke der gemeinsamen Ausgangslogik. Damit ist der Umfang für einen unabhängigen Gegenreview abgenommen. Ein uneingeschränktes Gesamt-GO oder eine persönliche Freigabe steht aus.

Im abschließenden Streaming-Vergleich auf demselben Suite-Laufzeitcode sah man bei vier Paaren den ersten vollständigen Satz nach **2.139 → 870 ms** (gepuffert → nativ). Der komplette Text stand nach 2.129 → 2.144 ms im Chat, die Weltmutation nach 3.369,5 → 3.486,5 ms, die Savebestätigung nach 3.417 → 3.534,5 ms und die nächste sichere Eingabe nach **3.422,5 → 3.540,5 ms**. Die Mockwartezeiten waren vorgegeben. Diese Messung isoliert den Streaming-Schalter. Einen früheren sicheren Folgezug zeigte sie nicht.

59/59 Streamingprüfungen. Zehn Störfälle einschließlich Fehlerpaket vor/nach Teilprosa, ungültigem JSON, EOF ohne DONE, Finishsignal ohne DONE, Socketverlust, nativem Stop und Reload im offenen Request erzeugten je einen Planner- und Narratoraufruf und **keinen Extractoraufruf**. Nach Read-back enthielt keine dieser Antworten ein gebuchtes Weltereignis. Swipe und Regenerate, die einzelne Spielerbuchung und der Entwurf während des Extractors bestanden die einschlägigen Prüfungen. Die gemessene Spitzenbelegung war vier Kapazitätseinheiten, am Ende null. Beim vollständigen Browser-Reload kann in beiden Konfigurationen ein ungesendeter Entwurf verloren gehen.

## 9 · Persönlichen Versuch vorbereiten

Zwei getrennte ST-1.19-Programm- und Datenwurzeln, getrennte Extensions und Browserprofile, derselbe gespeicherte Startzustand, dieselbe Description, Lore, Modell-ID und Tarif. A verwendet die feste .203-Revision, B den unten angegebenen Kandidaten. Die Anleitung sieht etwa zehn vergleichbare Spielerabsichten je Arm vor. Das ursprüngliche Preset und der ausführliche Extractor bleiben die Ausgangsoptionen. Jede persönliche Sitzung belegt den Provider allein. Für genauere Zuordnung einer Änderung kann der Nutzer beim späteren Versuch jeweils nur einen optionalen Schalter variieren. Die Vorbereitung wurde gegen die ST-CLI und die tatsächlichen Repositorypfade unter Linux geprüft. Windows-Start und persönlicher Spieltest stehen aus. [PowerShell-Anleitung, Vergleichskriterien und Protokoll](performance_suite_203/AB_WINDOWS.md)

## Reproduktion

Mit separaten Checkouts die Shellvariablen `MAIN`, `SUITE` und `REF` auf die absoluten Repositorywurzeln setzen. Die Referenz auf `5e5b8272412b51b91f75b6e37c5b94d95c9fae11` auschecken und die Suite auf den unten ausgewiesenen Integrationscommit. Der archivierte Korpus liegt auf main. Node 24.22.1, Chromium 156 und SillyTavern 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` wurden verwendet. Für die Tokenmessung `AVERETH_TOKEN_PYTHON` auf einen Python mit `tokenizers==0.22.2` und `jinja2==3.1.6` setzen, `AVERETH_GLM_TOKENIZER` und `AVERETH_GLM_TEMPLATE` auf die Dateien `tokenizer.json` und `chat_template.jinja` des fixierten GLM-5.3-Flash. Die Auswertung prüft deren SHA-256. [Tokenizer und Template](https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c)

```sh
cd "$SUITE/avereth-engine"
node tools/board_slot_offline.mjs "$MAIN"
node tools/bench_extract_archive.mjs "$MAIN"
node tools/bench_extract_compact.mjs "$MAIN"
node "$MAIN/recherche/performance_suite_203/offline.mjs" "$MAIN" "$SUITE" "$REF"
node "$MAIN/recherche/performance_suite_203/mixed.mjs" "$MAIN" "$SUITE" "$REF"
node "$MAIN/recherche/performance_suite_203/save_cost.mjs" "$REF" "$SUITE"
npm test
npm run replay:check
npm run smoke:st:check
npm run smoke:st:isolated -- --mode both
npm run smoke:st:isolated -- --mode narrator_streaming
npm run smoke:st:isolated -- --mode prompt_prefix
npm run smoke:st:isolated -- --mode host_cost
npm run smoke:st:isolated -- --mode board_slot
```

Für die Hostprüfungen `AVERETH_ST_SANDBOX` auf eine eigene markierte Testinstallation und `AVERETH_CHROMIUM_EXECUTABLE` auf Chromium setzen. Der Runner verwendet ausschließlich die lokale Mockverbindung. Für den Browservergleich auf A in ein leeres temporäres Verzeichnis das Git-Archiv der .203-Engine entpacken. Aus B nur den Testtreiber und dessen zusätzliche Preset-Testdatei kopieren. Der Lauf aktiviert auf A ausschließlich das Originalpreset.

```sh
runroot=$(mktemp -d)
git -C "$REF" archive HEAD avereth-engine | tar -x -C "$runroot"
cp -R "$SUITE/avereth-engine/tools/st_live/." "$runroot/avereth-engine/tools/st_live/"
cp "$SUITE/avereth-engine/presets/Avereth Narrator V4 - Card before Lore.json" "$runroot/avereth-engine/presets/"
(cd "$runroot/avereth-engine" && npm run smoke:st:isolated -- --mode board_reference)
```

## Etappencommits und Dateien

Der Branch `experiment/203-performance-optimization-suite` baut direkt auf dem verifizierten S1+B1-Kandidaten auf. Die Remote-SHA wurde nach jedem Push abgefragt.

| Paket und Entscheidung | Messbare Wirkung | Offene Qualität oder Zeitwirkung | Voller Suite-Commit |
|---|---|---|---|
| 0 · Messpunkte integriert | DOM-Prosa, Commit, Read-back und Eingabefreigabe getrennt. Vier gepaarte Mockläufe | Provider-Usage kann bei Streams fehlen | `d7aa4a8a1630ef381881cd82e6f9ec4a8bd97fda` |
| 1 · X1 und Offline-X2 integriert | 32 physische Archivantworten, 29 Jobs | User06 I25 fehlt im Log. Semantische Anker decken ausgewählte Tatsachen ab | `73659caed03e11a347573c7d369feebadc3a237d` |
| 1 · X2 optional integriert | 1.649 sichtbare Tokens weniger, 1.024 zusätzliche Eingabetokens in 32 Fällen | Natürliche Deltavollständigkeit, Ausgabelänge und Repairs offen | `962d046e980c2a9130ef6d0247b4d973060c133b` |
| 2 · P2-A integriert | 3.354 Inputtokens weniger in 43 Requests | Wirkung auf neu generierte Handels-/Ausrüstungsantworten offen | `0bfb76beea0750ff4fd5b29730445bfb23abef1e` |
| 2 · P2-B verworfen | Situative Auswahl verpasst belegungsbedürftige Handelsfälle | Informationen beim spontanen Geschenk und bei indirektem Kauf gefährdet | Kein Laufzeitcommit |
| 3 · Separates Preset bereitgestellt | Gleich große Endrequests, 7.750 weitere identische Präfixtokens in den geprüften Paaren | Provider-Cachetreffer, Zeit und Erzählwirkung offen | `c15c0de508b6f5c8131a40ca0d18edd42c84bbc7` |
| 4 · Situative Fachmodule verworfen | Sechs vormals übereinstimmende Welten gehen im Ablationsversuch auseinander | Modus allein bestimmt freie Weltfolgen unzureichend | Kein Laufzeitcommit |
| 5 · Kurzer gezählter Erstentwurf integriert | 226–266 sichtbare Tokens weniger je rekonstruiertem ersten Board, 42 zusätzliche Inputtokens | Neue Modellantworten und Zahl der Repairs offen | `052c33b1a09492ee2372260ed666d9fe5228e556` |
| 6 · Kontextranking und Budgetkürzung verworfen | 29/29 Vergleiche des bestehenden Inhalts identisch. Geringer Ertrag einer globalen Kürzung | I18 benötigt fachliche Beurteilung der gebuchten Anwesenheit | Kein Laufzeitcommit |
| 7 · Hostkostenmessung integriert | Originalchat mit 141 und verlängerter Stand mit 401 Nachrichten | Größen- und hardwareabhängige Messwerte | `057f32ad407628c8465968386384501a972da26c` |
| 7 · Lokalen Save optimiert | ST-Mediane im Pilot rund 98 ms, im verlängerten Stand rund 163 ms kürzer | Je drei Browsermessungen, reale PC- und Dateisystemzeiten offen | `e8650c368619fe32797b89eb390215e84671263a` |
| 8 · Integrationsvergleich | Explizite Presets und Abgleich der Ereignisse nach Read-back und Reload | Skriptantworten im lokalen Host | `8df38d3fe4b62eafc2b746ada81e5f2470956dea` |
| 9 · Persönlichen Versuch vorbereitet | Getrennte Windows-Installationen und festgelegte Vergleichswerte | Ausführung, Spielqualität und individuelle Freigabe ausstehend | Dokumentation auf main |

Alle Pfade im folgenden Verzeichnis beziehen sich auf `avereth-engine/` und auf den Diff zur gemeinsamen Basis `399eb5b`.

| Bereich | Geänderte Dateien |
|---|---|
| Laufzeit | `index.js`, `src/v4/action_persistence.js`, `src/v4/catalog.js`, `src/v4/extract.js`, `src/v4/guild.js`, `src/v4/items.js`, `src/v4/runtime.js`, `src/v4/world_jobs.js` |
| Optionales Preset | `presets/Avereth Narrator V4 - Card before Lore.json` |
| Node und technische Anleitung | `tests/v4/action_persistence.test.js`, `tests/v4/bench_extract_revision.test.js`, `tests/v4/patch82.test.js`, `docs/EXTRACTOR_BENCH_203.md` |
| Offlinewerkzeuge | `tools/bench_extract.mjs`, `tools/bench_extract_archive.mjs`, `tools/bench_extract_compact.mjs`, `tools/bench_extract_expectations.mjs`, `tools/board_slot_offline.mjs` |
| ST-Tests | `tools/st_live/board159_smoke.mjs`, `tools/st_live/host_cost_smoke.mjs`, `tools/st_live/isolated.mjs`, `tools/st_live/narrator_streaming_smoke.mjs`, `tools/st_live/prefix_tokens.py`, `tools/st_live/prompt_prefix_smoke.mjs`, `tools/st_live/run_c.mjs` |

Auf main gehören zu dieser Auswertung der vorliegende Bericht, `recherche/README.md`, `03_AKTUELLER_PROJEKTSTAND.md` und im Ordner `recherche/performance_suite_203/` die Dateien `AB_WINDOWS.md`, `messwerte.json`, `offline.mjs`, `mixed.mjs`, `save_cost.mjs` und `tokens.py`. Die Messwerte enthalten abgeleitete Größen und Fingerprints. Die historischen Originaldateien sind weiterhin über den [Forschungsindex](README.md) erreichbar.
