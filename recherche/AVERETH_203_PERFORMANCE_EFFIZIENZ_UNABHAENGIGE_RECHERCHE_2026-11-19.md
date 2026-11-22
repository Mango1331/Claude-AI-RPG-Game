# Avereth .203 mit SillyTavern 1.19 – Wo sich Optimierung für den Spieler lohnt

**Unabhängiger Forschungsbericht · 19. November 2026**
**Untersuchter Produktstand** `4.3.0-c.6.6.203` auf [5e5b8272][product]. **Dokumentations- und Datenstand** [main, 32aff5e2][main]. **Für die Hostprüfung gepinnt** [SillyTavern 1.19.0, 7e8663cd][st]. User04 meldet den Folgecommit `06bde939f`, der nur einen Veröffentlichungsworkflow änderte. [Upstream-Diff][stcompare] Der exakte persönliche Hostcommit von User05 ist in den Requestdumps nicht vermerkt. **Modell im natürlichen Korpus** `zai-org/GLM-5.3-Flash` über Featherless Custom Chat Completions.

## 1. Entscheidung

**Für einen früheren ersten Satz würde ich zuerst Narrator-Streaming im echten ST-Host mit kontrollierten Antwortpaketen prüfen. Für schneller fortsetzbare Züge würde ich zuerst die Questtafel-Reparatur gezielt verkleinern und die Extractor-Auswertung verlässlich machen.** Beides adressiert beobachtete Wartezeiten, ohne eine Spielerentscheidung oder eine Klasse von Weltereignissen zu streichen. Die große Character Description würde ich zunächst vollständig behalten.

| Ziel | Ergebnis dieser Untersuchung | Konsequenz |
|---|---|---|
| Früher lesbare Erzählung | In 19 nichtstreamenden User05-Generierungen endete die ST-Generierung nach median 30,251 s. Vor dem Gildenaushang vergingen 138,771 s bis zu diesem Punkt. | N streamen kann die Lesezeit vorziehen. Für die vor N liegenden 111,031 s Boardgenerierung einschließlich Reparatur braucht es einen anderen Hebel. |
| Schneller wieder spielen | Für dieselben 19 Generierungen ergeben **paarweise** ST-Generierungsdauer plus X-Job median 54,014 s. Wann der Spieler tatsächlich weitersenden wollte, fehlt. | Freigabe und ersten echten Sendeversuch getrennt messen. Das Ausblenden einer Sperre bringt keine korrekte frühere Buchung. |
| Kürzere Sonderfälle | In User04 und User05 war je ein Fünfer-Board nach Ersatz genau eines Eintrags identisch zum vollständig neu generierten, gültigen Board. Der bestehende Validator bestätigt es in beiden Fällen. | Bei eindeutig zuordenbarem Fehler nur Ersatz anfordern, danach das ganze Board einschließlich Quoten prüfen. Der messbare Vorteil betrifft die Antwortmenge. Die Zeitersparnis steht noch aus. |
| Günstigere Wiederholung | Lokales offizielles GLM-Template und Tokenizer reproduzieren **188/188** gemeldete Promptlängen. Card vor Lore erhöht in User05 bei neun von 18 benachbarten N-Paaren den gemeinsamen Präfix um **7.687 Tokens**. Bei neun Paaren bleibt er gleich. | Sinnvoller separater Presetversuch. Anzahl versendeter Tokens unverändert. Cacheanzeige, Gebühren und Geschwindigkeit brauchen je einen eigenen Nachweis. |
| Weniger Eingabetokens | Der Ausrüstungsmarkt steht in allen 43 P-/X-Requests, auch im Kampf. Allein dieser Block belegt im historischen Korpus **24.725 GLM-Tokens**. Senkung des Enginebudgets von 1.400 auf 900 spart bei 19 nachgebauten .203-Szenen insgesamt nur **292 Tokens**. | Fachlich unpassende Information und verdrängte Fakten untersuchen. Eine pauschale Budgetkürzung hat hier das schlechtere Verhältnis von Nutzen zu Risiko. |
| Wirtschaftlicher Nutzen | Sämtliche 124 User04-Requests weisen exakt nachrechenbare Gebühren aus, zusammen **0,14687729 USD**. Bei allen 64 User05-Requests fehlt das Kostenfeld. | Zeit pro erfolgreicher Spielerabsicht erhält im privaten Spiel Vorrang. Ein Tarif- oder Modellwechsel lässt sich aus den beiden Läufen nicht begründen. |

**Was ist bewiesen?** Requestmengen, Tokenzahlen, Präfixe, historische Zeitspannen und die genannten .203-Offlinevergleiche sind nachprüfbar. Ein neuer natürlicher Lauf mit .203, ein schnellerer Modell-Decoder, eine konkrete GPU-Cachequote und qualitative Gleichwertigkeit geänderter Prompts wurden nicht gemessen. Es gab keine Produktänderung, Generierung bei einem Provider oder Abfrage eines privaten Kontos.

## 2. Was die drei Vorberichte tragen

Alle drei Texte wurden auf dem angegebenen `main` vollständig gelesen. Danach wurden Produktcode, Host-Tag, archivierte Originale, frühere A/B- und Architekturprüfungen und externe Primärquellen unabhängig ausgewertet. User05 A/B/C sind Abschnitte **derselben** unterbrochenen Kampagne auf .202. Die drei Completion-Dumps ergeben 17 + 21 + 26 verschiedene physische Requests. Die Chat-Exporte enthalten dagegen frühere Nachrichten erneut. Für die zeitliche Zuordnung wurde der letzte vollständige Chat genau einmal verwendet. User04 ist ein weiterer persönlicher Lauf auf .159. Wiederholungen, gewählte Antwortrevisionen und Kampagnen sind unterschiedliche Beobachtungseinheiten. [Originale User05][u5] · [Originale User04][u4]

| Ausgangsthese | Prüfung und Urteil |
|---|---|
| [Bericht A][a] findet den frühesten Prefixbruch bei variabler Lore. | **Bestätigt und eingegrenzt.** Die vier CRLF-Logpräfixe in Phase A sind exakt reproduzierbar. Über alle drei Abschnitte tritt der frühe Bruch nur bei der Hälfte der Übergänge zum vorherigen N auf. Der Tokengewinn fällt je nach Vergleichshorizont unterschiedlich aus (§5). |
| [Bericht B][b] priorisiert Szenenfakten und den späten Weltabschluss. | **Die Fehlerszenen sind gute Qualitätskontrollen.** Die Daten sprechen stärker für ein gezieltes Leistungsprogramm bei Board, X und Anzeige. Das neue Budgetexperiment zeigt zugleich, warum „weniger dynamischer Kontext“ als allgemeine Maßnahme wenig bringt (§6). |
| [Bericht C][c] priorisiert lokale Hostkosten, Prefixprüfung und einen Vergleich bei widersprüchlicher Geschichte. | **Präfixversuch jetzt durchgeführt.** Bei den untersuchten Chatgrößen lagen die lokalen Rechenzeiten weit unter den natürlichen Modellzeiten. Ein gezielter Browser-/Festplattentest auf langen Kampagnen bleibt sinnvoll. Die historische Summe der X-Zeit überschätzt eventuell die vom Spieler wirklich erlebte zusätzliche Pause (§§3, 7). |
| [Bericht A][a] lässt Tarif und Meldesemantik als Erklärung der Nullserie offen. | **Neuer Beleg für diese Alternative.** Das Gebührenfeld ist in 124/124 User04-Antworten vorhanden und fehlt in 64/64 User05-Antworten. Der Anbieter definiert Cachetokens als zum vergünstigten Tarif abgerechnete Tokens. Die Providerseite der Ursache bleibt offen (§5). |
| JSON-Zwang, niedrigeres Reasoning oder gemeinsame Narration und Extraktion sind naheliegende Beschleuniger. | **Wichtige Gegenversuche liegen schon im Projekt.** Der natürliche User05 schickt bereits überall `low`. Der ältere P0-Vergleich mit Schema und die C1-/GM-Experimente hatten zusätzliche Versuche oder fehlende Weltfolgen. Ein neuer Versuch muss den früheren Schwachpunkt konkret beheben (§8). |

## 3. Der kritische Weg eines Zuges

Im normalen Storyzug übergibt der Host eine freie oder gemischte Eingabe an den Planner (P). Die Engine prüft und bucht Mechanik, gegebenenfalls nach einem Board- oder Forge-Aufruf. ST baut für die Narration (N) einen eigenen Chat-Completion-Prompt. Erst die vollständige Prosa enthält spontan entstandene Weltfolgen, die der Extractor (X) lesen kann. Die Engine validiert sie, bucht sie auf die richtige Antwortrevision und bestätigt die Speicherung. Reine typisierte HUD-Aktion und eindeutige Questannahme brauchen in .203 nur N und X. Die sechs ursprünglichen F-Mischfälle brauchen im .203-Mock P, N und X. Ein lokales Systempanel kann ohne Narration antworten. Swipes und Continue folgen eigenen Pfaden. Optionales Wachstum/Forge und Repairs machen „drei Calls pro Zug“ zu einer ungeeigneten globalen Annahme. [Runtime][runtime] · [Host][host] · [.203-Abnahme][accept]

### Natürliche Last pro Rolle

Sekunden sind summierte beobachtete Spannen je physischem Versuch. Bei N umfasst die Engine-Uhr auch den ST-Promptaufbau bis zum Empfang. P, X und Board stammen aus den zugeordneten Aufruf-Records. Das Zeitbudget ist weder GPU-Zeit noch die Gesamtlänge einer Spielsitzung.

| User05 .202 | Physische Aufrufe | Inputtokens | Completiontokens | Summierte Sekunden | USD bei heutigen Listenpreisen und null Cache* |
|---|---:|---:|---:|---:|---:|
| Planner | 23 | 248.520 | 1.528 | 152,262 | 0,03804 |
| Narrator | 19 | 228.039 | 7.687 | 485,819 | 0,03805 |
| Extractor | 20 | 289.906 | 6.685 | 440,676 | 0,04683 |
| Board | 2 | 6.361 | 1.885 | 111,031 | 0,00190 |
| **Summe** | **64** | **772.826** | **17.785** | **1.189,788** | **0,12482** |

\* Szenariorechnung, keine Rechnung des Nutzers. Zwei Boardaufrufe verbrauchen nur 0,82 % der Eingabetokens und rund 9,3 % der gemessenen Phasenzeit. P und X zusammen stehen für rund 70 % der Eingabetokens. Wer allein die Karte bearbeitet, erreicht beide Phasen nicht. [Requests][u5] · [Modellpreise][price]

**Zeit bis zur ersten Prosa.** In User05 sind 64/64 Requests nichtstreamend. Die 19 gespeicherten N-Antworten haben `gen_started` und `gen_finished`. Ihre Differenz reicht von **21,602 bis 138,771 s**, Median **30,251 s**. Zieht man die zugehörigen P-, Board- und N-Spannen pro Antwort ab, verbleiben 0,031–0,456 s, Median 0,248 s. ST-Ende ist bei diesem Aufbau ein brauchbarer Bezugspunkt für den vollständigen Text. Der erste tatsächlich gezeichnete Satz, der Klick vor ST-Start und die Freigabe der Eingabe wurden historisch nicht aufgezeichnet.

**Zeit bis zum nächsten spielbaren Zug.** Pro Antwort ST-Spanne plus zugehörigen X-Job rechnen, dann den Median bilden. Das ergibt **29,610–144,441 s**, Median **54,014 s**, einschließlich des zusätzlichen Narratorfalls ohne neuen P. Abschlusslücke, final bestätigter Save und Bedienfreigabe fehlen. I12 mit Questtafel liegt bei 138,771 + 5,670 s, I45 mit Bossangriff bei 28,970 + 38,613 s. Die gleiche Änderung würde die beiden Pausen sehr unterschiedlich beeinflussen. Der X-Median in Phase C ist 38,613 s pro **Job** (7), aber 24,974 s pro physischem **Versuch** (8). Ein Orts-Repair steckt im selben Job. .203 verarbeitet die erste historische I34-Antwort bereits erfolgreich. Diese Einsparung nicht noch einmal einem neuen Entwurf gutschreiben. [Gegenreview][review] · [.203-Abnahme][accept]

**Zeit, die der Spieler tatsächlich auf die Freigabe wartet.** Es gibt 18 Erzählungen mit unmittelbar folgender archivierter Nutzereingabe. Zwischen ST-Textende und dem eingetragenen `send_date` lagen median 93,485 s. Zieht man jeweils die vorige X-Dauer ab, bleiben in *allen* 18 Fällen positive Zeiten (Minimum 18,636 s, Median 62,021 s). Die 26 Spieler-Performance-Records enthalten kein `wait_ms`. Allerdings kann der Composer Enter/Klick bereits **vor** dem ST-Eintrag abfangen. Das Archiv gibt weder die Dauer des Lesens noch den zuerst blockierten Versuch her. Eine lange X-Dauer ist eine Systemgrenze. Wie viel davon den Spielfluss unterbrach, muss am tatsächlichen Bedienvorgang sichtbar werden. [Historischer Host .202][host202] · [ST-Nachrichtenzeit][stsend]

**Welche Arbeit erklärt die Laufzeit?** Explorativ korrelieren pro Versuch die Sekunden bei X stärker mit der Completionlänge (Spearman ρ = 0,810) als mit der Promptlänge (0,239), bei N entsprechend 0,747 und −0,168, bei P 0,489 und 0,052. Verschiedene Aufgaben, geringe Fallzahlen, unbekannte Last und gleiche Kampagne erlauben keine kausale Sekundenformel. X I32 brauchte 46,591 s für 253 Completiontokens, X I16 31,819 s für 190. I32 hat einen abweichenden Fingerprint, I16 den üblichen. Eine pauschale Erklärung durch langsamere Tokenausgabe wäre zu stark. Der ältere Performancebericht beschreibt bereits große Ausgabe- und Zeitunterschiede bei fast unverändertem X-Prompt, einschließlich früherer Limits. [Patch 8.2][perf] · [Primärdaten][u5]

**Messdefinition für die nächste Entscheidung.** Eine monotone Uhr pro Client verbindet Aktion, Intercept, P/Board-Ende, Übergabe des N-Prompts, ersten nichtleeren SSE-Inhalt, ersten sichtbar gerenderten Prosasatz, Prosaende, X-Validierung, bestätigten Save und tatsächlich wieder sendbaren Zustand. Beim echten blockierten Sendeversuch reicht dessen Zeitpunkt. Die ungeschriebene Absicht bleibt privat. Die Zeit zwischen erstem Sendeversuch und Freigabe ausweisen, falls der Versuch während der Sperre lag. Zusätzlich Retries, Revision, Antwortmenge, Fehler und Erfolge je Spielerabsicht erfassen. Drei getrennte Erfolgsmaße sind früher lesbar, früher technisch spielbar und kürzer tatsächlich blockiert. Backend-Time-to-first-token kann auch Reasoning oder Metadaten zählen. [Inference-perf-Metriken][metrics] · [Latenzleitfaden][latguide]

## 4. Welche Tokens Avereth bezahlt oder verarbeitet

Der lokale Nachbau verwendet das [öffentliche GLM-Chattemplate][template] und den [Tokenizer derselben festgehaltenen Revision][hf]. Mit Rollenmarken, Generierungsanfang und den geloggten Parametern ist die rekonstruierte Promptlänge bei **64/64 User05 und 124/124 User04 auf das einzelne Token identisch mit der Usage**. Das ist eine deutlich bessere Grundlage als Zeichen durch vier. Es beweist weder identische Token-IDs beim Provider noch Routing, Cacheblockgröße oder die Version seines Decoders. Die Eingabe-Rechnungen enthalten keine neuen Modellantworten. Reproduktionsweg in §10.

### Ein Narratorprompt, nach Herkunft

| User05, 19 N | Tokens pro Nachrichtenteil, Min / Median / Max | Summe der Inhaltstokens | Anteil an 228.039 N-Inputtokens |
|---|---:|---:|---:|
| Character Description | 7.686 / 7.686 / 7.686 | 146.034 | 64,0 % |
| Dynamischer Engineblock | 781 / 1.754 / 2.370 | 32.184 | 14,1 % |
| Übergebene Chatgeschichte einschließlich Spielereingabe | 433 / 1.157 / 1.663 | 21.931 | 9,6 % |
| Aktivierte World Info | 470 / 470 / 1.523 | 14.523 | 6,4 % |
| Stilanweisung | 480 / 480 / 480 | 9.120 | 4,0 % |
| Post-History-Anweisung | 124 / 124 / 124 | 2.356 | 1,0 % |
| Persona | 63 / 63 / 63 | 1.197 | 0,5 % |

Die Teile sind separat tokenisiert. Startmarker, Template und Rollengrenzen erklären den verbleibenden Anteil. Die historische Karte war in den Requests als **Revision .201** ausgewiesen und enthielt 36.924 Zeichen. Der aktuelle **.203**-Vertrag ergibt **7.749** Tokens aus 37.303 Zeichen. Karte im Repository, installierte ST-Karte und tatsächlich gesendeter Prompt sind drei eigene Prüfpunkte. Ein Anteil von 64 % beim Narrator entspricht rund 18,9 % der gesamten User05-Eingabemenge. Eine Halbierung wäre ein erheblicher Eingriff in einen Textraum mit Schutzregeln für Spielerfreiheit, Kontinuität und Kampfergebnisse. [Card][card] · [Preset][preset] · [ST-Prompt-Manager][pm]

Alle 19 Loreblöcke lassen sich durch Einträge des .203-Lorebooks und Trennraum erklären. Die Datei hat 50 aktivierte Einträge, zwei davon konstant. Alle stehen an Position 0, verhindern Rekursion *aus ihrem eigenen Inhalt* und sind nicht vektorisiert. Nur elf verschiedene Einträge traten im Lauf auf. Drei bis sieben wurden pro Prompt gesendet, in elf von 19 nur die beiden Konstanten und der regionale Eintrag. In Auto-Stellung schaltet die Engine ihre beschreibende Lore bei verknüpfter Character Lore aus. Die separate Lore-Bridge speist Orts-/Realmschlüssel für den Scan ein. Eine weitere pauschale Abschaltung von Lore oder Rekursion hat für diesen konkreten Korpus wenig Aussicht. Für kulturelle Details können selektive Schlüssel nützlich sein. Bindende Zielroute und aktuelle Begegnung gehören in den zustandsgebundenen Engineblock. [Lorebook][lore] · [Lore-Audit und Bridge][loredoc] · [ST World Info][wi]

### Ausgabetokens einschließlich modellseitiger Zusatzarbeit

Die Antwortfelder `content` und das vorhandene separate `reasoning` wurden einzeln mit dem GLM-Tokenizer gezählt, ohne Sondertokens hinzuzufügen. Fehlendes Textfeld erhielt hier Länge null. In **jedem** der 64 Fälle übersteigt die gemeldete Completion die Summe beider Textzählungen um genau zwei Tokens. Die Spalte „Reasoning-Text“ ist eine lokale Rekonstruktion des gelieferten Feldes. Bei keinem Request wurde ein numerischer Reasoningzähler gemeldet.

| Rolle | Sichtbare Prosa bzw. JSON | Separater Reasoning-Text | Rest zur Provider-Usage | Gemeldete Completion |
|---|---:|---:|---:|---:|
| P | 1.376 | 106 | 46 | 1.528 |
| N | 6.902 | 747 | 38 | 7.687 |
| X | 4.555 | 2.090 | 40 | 6.685 |
| Board | 1.850 | 31 | 4 | 1.885 |

**Board und X verlangen unterschiedliche Eingriffe.** Beim Board entfallen 98,1 % der Completion auf das eigentliche JSON. Bei X entfallen 31,3 % auf den separaten Reasoning-Text. Fünf kompakte Questobjekte zu verlangen stellt eine andere Aufgabe als das Schlussfolgern über widersprüchliche Ankünfte oder eine NPC-Zusage. Bei N waren 89,8 % der Completion Prosa. Streaming kann deren Erstellung mit Lesen überlappen. In allen Requests war `reasoning_effort: low` bereits gesetzt. Weitere frühere Gedanken standen in keinem der 64 Request-Arrays. Ein Abschalten ihrer Anzeige wirkt nicht als Beschleuniger. [Originale][u5] · [Modelltemplate][template] · [Featherless-Modellbeschreibung][model]

## 5. Caching und Wirtschaftlichkeit

Für jeden Request wurden die GLM-Token-IDs bis zur ersten Abweichung verglichen. Ein exakter Anfang ist bei klassischem Prefix-Caching eine Gelegenheit zur Wiederverwendung beim **Prefill**. Die laufende Ausgabe und ein weiterer fachlich notwendiger Call bleiben eigene Kosten. Ob das Backend die passende Replik, Lebensdauer und Cacheblöcke hat, ist vom Client aus unbekannt. Ein an Textähnlichkeit orientierter Antwortcache wäre für diese Spielarchitektur gefährlich. Schon anderer Trefferwurf, NPC-Zuhörer oder Swipe kann trotz derselben Eingabe ein anderes Ergebnis verlangen. [vLLM Automatic Prefix Caching][apc] · [DistServe][dist]

| User05, Vergleich zur vorigen Anfrage **derselben Rolle** | Vergleichspaare | Gemeinsame Tokens Min / Median / Max |
|---|---:|---:|
| P, Story und Kampf gemeinsam | 22 | 13 / 11.639,5 / 12.036 |
| N, tatsächliche Reihenfolge | 18 | 491 / 4.605,5 / 9.949 |
| N, dieselben Nachrichten, nur Card und Lore getauscht | 18 | 8.178 / 8.449 / 9.949 |
| X, einschließlich Repair | 19 | 11.992 / 12.029 / 14.960 |
| Board, Erstentwurf → Reparatur | 1 | 2.602 |

Bei Vergleich zum **unmittelbar vorangegangenen physischen Request** über alle Rollen sind es median nur **zehn** Tokens. Ein Provider kann die Präfixe mehrerer früherer Requests halten. Deshalb wurde auch mit dem jeweils besten früheren N verglichen. Der Median bleibt dabei **8.720** vor und nach dem Tausch. Sechs von 18 Paaren gewinnen, zwölf bleiben gleich. Summe der zusätzlichen gemeinsamen Tokens in diesem Modell **46.122**. Beim Vergleich zum unmittelbar vorherigen N gewinnen neun von 18, kumuliert **69.183**. Die tatsächlich gesendete Gesamtlänge ist beim Tausch für **19/19** unverändert. Zwei frühere N liegen mitunter mehrere Minuten auseinander, im Extrem über zwei Stunden. Beide Vergleichshorizonte sind Modellannahmen für Verfügbarkeit und Wiederverwendung, keine gemessenen Cachetreffer.

**Historische Positivkontrolle.** User04 liefert 37 aufeinanderfolgende N-Paare. Mit exakt unveränderter Lore hatten **18/18** hintere Requests positive Cachemeldungen, mit geänderter Lore **0/19**. User05 liefert bei gleicher Lore **0/9**, bei verschiedener Lore ebenfalls **0/9**. Derselbe sichtbare Fingerprint `fp1-nst-nes` kommt in 119 User04- und 63 User05-Antworten vor. Alle 80 User04-Treffer, aber kein einziger User05-Treffer gehören zu diesem Label. Weder die Prompt-Reihenfolge noch ein Wechsel des sichtbaren Labels allein erklärt den Unterschied. Selbst innerhalb User04 hatten die eindeutig gematchten finalen N-Antworten mit positivem Cache keinen niedrigeren Rohmedian der gesamten N-Phase (14,725 s bei 16 Antworten gegenüber 13,501 s bei 20). Das ist kein kontrollierter Vergleich. Ein TTFT-Effekt kann durch unterschiedliche Antwortlänge, Serverlast und Szene verdeckt werden. [Originale User04][u4] · [Originale User05][u5]

**Das Prefixmodell trifft die Gebührenzahl auch bei positiven Treffern nicht exakt.** Für jeden User04-N mit positivem Cachewert wurde das größte gemeinsame Tokenpräfix mit *allen vorher im Serverlog protokollierten Eingaben* gebildet. In 18/18 Fällen lag der gemeldete Cachewert noch **127–248 Tokens darüber** (Median 193,5). Bei Request Nr. 34 standen 8.828 gemeldeten Cachetokens maximal 8.580 gemeinsame Inputtokens gegenüber. Nicht beobachtete Requests, generierte Fortsetzungen, interne Aufbereitung und Abrechnung wären mögliche zusätzliche Einflüsse. Aus den Logs folgt keine bestimmte Ursache. Dieser Gegencheck bleibt auch bei der perfekten Übereinstimmung der 188 Promptlängen wichtig. [Historischer Serverlog][u4] · [Usage-Definition][usage]

**Die Gebühren liefern einen unabhängigen Hinweis.** Featherless definiert beide Cachefelder als dieselben, zum Cachepreis abgerechneten Tokens. `usage.cost` ist die abgerechnete Gebühr und entfällt laut Anbieter bei Abos. In User04 enthalten **124/124** Antworten das Feld. Jeder einzelne Wert erfüllt genau die Formel unten. User05 enthält **0/64** Gebührenfelder. Ein anderer Abrechnungs- oder Meldepfad ist eine konkrete konkurrierende Erklärung. Der Accountverlauf und tatsächliche GPU-Treffer wurden nicht abgefragt. Später ließe sich die damalige Abrechnungsart mit vorhandenen Request-IDs und berechtigtem Zugriff auf die Abrechnungshistorie prüfen. Ein heutiger Tarifname beweist die damaligen Bedingungen nicht. [Featherless Usage][usage] · [Abrechnungshistorie][billing] · [Tarife][plans]

`USD = ((Input − Cached) × 0,15 + Cached × 0,03 + Output × 0,50) / 1.000.000` für diese öffentliche Modellpreisstellung. Für die 69.183 *zusätzlichen* Präfixtokens ergibt sich im vereinfachten Szenario „vorheriger N verfügbar, jeder zusätzliche Token voll rabattiert“ **0,00830 USD für den gesamten User05-Ausschnitt**. Mit den 46.122 Tokens des zweiten Vergleichs sind es 0,00553 USD. Bei einem pauschalen persönlichen Tarif sinkt die Monatsgebühr durch kürzere Prompts allein nicht. Zeitgewinn kann für den Spieler trotzdem erheblich sein und braucht eine eigene Zeitmessung. Es gibt keinen belastbaren Anlass für einen Tarifwechsel nur zum Sparen dieser Beträge. [Preise und Einheiten][credits] · [Modell][price]

Das Preset nennt 131.072 Kontext und 4.096 Ausgabe. Der projektseitig dokumentierte Chatpfad nennt 32K und vier Kapazitätseinheiten. Featherless weist für das Modell vier Einheiten aus. Auf derselben Modellseite stehen 256K in den Metadaten und 32.768 im Beschreibungstext, die veröffentlichte Z.ai-Datei nennt ein natives Fenster von 1.048.576. Maßgeblich für einen tatsächlichen Request sind die kleinere Modell-/Kontogrenze, Ausgabe mitgerechnet, und die vorangehende Auswahl durch ST. User05 erreichte maximal **19.638** bei „Input plus angefordertes Ausgabelimit“. Alle 64 Antworten endeten mit `stop`. Das widerlegt ein akutes Ausgabelimitproblem in dieser Stichprobe. Es sagt nichts darüber aus, welche Nachrichten ST vorher ausgelassen hat. Keine Tarif-, Kontext- oder Parallelitätsreserve aus dem größten veröffentlichten Wert ableiten. [Plan-API][plan] · [Modell][price] · [Projektbrief][brief]

## 6. Kontextbudget und fachliche Modulauswahl – Gegenversuche auf .203

**Versuch.** Für jede der 19 archivierten N-Generierungen wurde der volle User05-Chatpräfix vor der Antwort samt Eingabemodus, Revisionen, Events und Metadaten wiederhergestellt. `turnBlock` der **.203** faltete den bereits aufgelösten Spielerzug. Bei gleicher Aktion, gleichem Ausgang, `engineLore=false`, Regelbudget 800 und `recentTurns=4` wurde nur das Hauptbudget variiert. Alle Faltungen ohne gemeldete Fehler. Der gelieferte Engineblock wurde separat mit dem GLM-Tokenizer gezählt. Das ist eine .203-Projektion historischer Ereignisse, keine erneute natürliche Erzählung. I40/I41 beziehen sich auf dieselbe Spielerhandlung. [Hostprojektion][turnblock] · [Packer][packer]

| Enginebudget, interne Schätzung | GLM-Tokens der 19 gelieferten Blöcke | Median | Gegen 1.400 bytegleich | Pflichtanteil über internem Budget | Abschnitt `relevant` verworfen |
|---|---:|---:|---:|---:|---:|
| 900 | 32.541 | 1.802 | 15/19 | 16/19 | 17/19 |
| **1.400** | **32.833** | **1.802** | **19/19** | **12/19** | **15/19** |
| 1.800 | 34.074 | 1.849 | 12/19 | 2/19 | 12/19 |
| 2.200 | 36.218 | 2.110 | 6/19 | 0/19 | 10/19 |
| 2.600 | 41.538 | 2.557 | 4/19 | 0/19 | 2/19 |

**Ergebnis.** Eine Senkung um nominell 500 Einheiten je Turn spart insgesamt **292** tatsächliche Blocktokens, rund **0,9 %** der Engine-Summe. Bei 1.400 liegt der Medianblock bereits bei 1.802 GLM-Tokens. Der Packer behält Priorität null immer. Regeln, Envelope, Korrekturen, Chronik und weitere Teile haben eigene Budgets oder werden separat geführt. Die Engine schätzt mit Zeichen/4,3. In I24 umfassen allein Dungeon, Quests und aufgelöste Handlung im .203-Diagnoseformat 405, 457 und 499 geschätzte Tokens, zusätzlich zu weiteren Pflichtteilen. Eine Verringerung des Schiebereglers trifft zuerst optionale Abschnitte. Bei 1.800 kommen die drei zuvor verworfenen Dungeon-/Siedlungsabschnitte ins Budget, zugleich wachsen die 19 Blöcke um insgesamt 1.241 Tokens. Das belegt andere Auslieferung. Ein verworfener Abschnitt bedeutet noch keinen verlorenen wichtigen Fakt, weil NPC-Karten, Chronik oder die gebuchte Aktion ihn separat enthalten können. Die .203-Questannahme liefert die Nordroute auch bei 1.400 im Aktionskontext. **Entscheidung:** 1.400 als Vergleichsstandard. Im nächsten isolierten Versuch gezielt doppelte Pflichttexte gegen einen fehlenden relevanten Fakt tauschen. Keine globale Herabsetzung oder Erhöhung. [Diagnose und Prioritäten][packer] · [technische Szenenbelege][accept]

**Der stärkere Kandidat für weniger Inputs liegt bei P und X.** Die 15 Story-P hatten einen Systeminhalt von je 11.021 GLM-Tokens, die acht Kampf-P je 4.013. Der identische Systeminhalt der 20 X umfasst je 11.374. Im X-Katalog stehen 36 Deltatypen. Im beobachteten Lauf wurden 17 Typen in 54 vorgeschlagenen Deltas genutzt. Aus 19 ungenutzten Typen folgt keine sichere Streichliste. In P und X erscheint jedoch zusätzlich dieselbe 2.172 Zeichen lange Marktanweisung, einschließlich Ratschlägen zum Anbieten besserer Ausrüstung. Ihr Entfernen *nur in der Messkopie* reduziert den Inhalt jeweils exakt um 575 GLM-Tokens, 43-mal also um 24.725, rund 3,2 % aller Eingabetokens. Das ist die nachgewiesene Exposition. Ein Gildenbeitrag ist ein echtes Angebot, im Kampf kann ein NPC einen Gegenstand überreichen. Die gesamte Summe als sicher einsparbar anzusetzen wäre falsch. [Markttext][gear] · [Katalog][catalog] · [X-Vertrag][extract]

**Kleinster fachlicher Versuch:** Zuerst den Verkaufston aus dem maschinenlesenden P-/X-Text herauslösen, die gültigen IDs, Kategorien und Qualitätsregeln erhalten. Erst als zweiter Arm Handelsdetails konditional anbieten. P muss aus Vorzustand und gesamter freier Eingabe entscheiden können. X kennt zusätzlich die fertige Prosa, autorisierte Aktionen und erwartete Ergebnisse. Gemeinsamer stabiler Kern zuerst, variable Fachmodule zum dynamischen Teil. Bei Mehrdeutigkeit Vollkontext, ohne zweiten LLM-Klassifikator. In B-Request 20 und C-Request 9 steht `mode: story` neben einer gerade gebuchten Kampfchronik. Ein Router allein nach dem aktuellen Modus wäre in beiden Fällen falsch. Pflichtgegenfälle sind Gildenbeitrag, echte Qualitätsrüstung, Kampf mit Seitenruf und Zusage, bedingter zweiter Auftrag sowie eine unvorhergesehene Übergabe.

**Verlauf und Langzeitgedächtnis.** .203 projiziert standardmäßig die letzten vier Spielereingaben samt zugehöriger Prosa in die Promptkopie, entfernt Tracker und verwendet vorhandenen gewichteten Recall, fokussierte NPC-Karten und offene Threads. Die Archivnachrichten bleiben erhalten. In einem C-Fenster waren drei wortgleiche Flame-Lance-Eingaben. Textgleichheit allein kann eine gewollte erneute Attacke nicht von einem abgelehnten Versuch unterscheiden. Ein Vergleich „Fenster nach bestätigten Zügen vs. bisherigen Eingaben“ muss mechanischen Status und Revision berücksichtigen. Vor einer neuen RAG- oder Summary-Schicht eine **verfehlte** Wiederbegegnung mit korrekter Person, Wissensquelle, offen/erledigt und verworfenem Swipe nachweisen. Ein indirekter Hinweis wie „am alten Übergang“ ohne den NPC-Namen ist ein besserer Test als eine Namensabfrage. NoLiMa motiviert solche Gegenfälle. Eine Studie zu Coding-Agenten liefert eine sinnvolle einfache Vergleichsvariante für Summaries, aber keine übertragbare Prozentersparnis für Rollenspiele. [History-Projektion][hist] · [Recall][ctx] · [NoLiMa][nolima] · [Observation Masking][mask]

## 7. Drei Versuche mit konkretem Nutzen

### 7.1 Anzeige und Host – der frühe Text braucht einen anderen Test als der Weltabschluss

Das V4-Preset liefert `stream_openai:false`. Der archivierte .203-ST-Test benutzte Streaming mit einem künstlichen N-Limit von 1.200. Der natürliche User05 benutzte 4.096 und kein Streaming. Streaming-Unterstützung im Host ist daher nachgewiesen, eine natürliche TTFT-Verbesserung auf diesem Account offen. Nur N ist für die Spieleranzeige interessant. P/X/Board als intern konsumiertes JSON zu streamen verkürzt die notwendige Vollvalidierung nicht. Die .203-Requeststeuerung hält eine Belegung für den Stream bis zum bestätigten Ende. Der spezielle Recoverypfad für vorübergehende Fehler bei nichtstreamendem N wird bei Streaming übersprungen. Teiltext, Stop und Fehler vor dem ersten Inhalt verdienen eigene Gegenproben. [Preset][preset] · [Requeststeuerung][lease] · [Recovery][recovery] · [Hosttest][smoke]

**Bislang übersehener ST-Schalter.** „Smooth Streaming“ ist in 1.19 standardmäßig aus. Bei eingeschaltetem Schalter, fokussiertem Tab und Standardgeschwindigkeit 50 verzögert ST einzelne Zeichen typischerweise um 20 ms, nach Komma oder Zeilenumbruch um 250 ms, nach Satzendezeichen um 500 ms. In einem lokalen Komponentenversuch liefen alle 19 tatsächlich erzeugten User05-Prosen durch den originalen ST-SSE-Transformer und die .203-Requeststeuerung. Der Zuspieler sendete Rolle, zusammenhängenden Inhalt und danach separat DONE/EOF. Mit virtuellem Timer ergaben sich **20,610 / 46,430 / 59,590 s** angeforderte Darstellungspausen (Min/Median/Max), ausgeschaltet jeweils null. Das ist ein isolierter Wiedergabeversuch mit absichtlich sofort verfügbarer Prosa. Beim echten Stream überlappen Transport und Darstellung. Die 46 Sekunden dürfen weder einer Providerzeit zugeschlagen noch als beobachtete Einsparung ausgegeben werden. Vor DONE war Inhalt lesbar und die Belegung weiterhin aktiv, nach einem unvollständigen Strom ohne DONE blieb sie richtigerweise ungeklärt. **Vergleich:** normales N-Streaming mit Smooth aus gegen das unveränderte Preset, gleiche Ausgabegrenze und derselbe Inhalt im Mock. [ST-SSE-Transformer][smooth] · [ST-Fortschritts- und Renderuhr][render] · [ST-Voreinstellungen][stdefaults]

**Speichern, Tippen und Rendern.** Der echte archivierte .203-Hosttest hat während eines absichtlich verzögerten X nativ zwischengespeichert, Text ins Eingabefeld geschrieben und einen Sendeklick ausgelöst. Der Entwurf blieb erhalten, der Klick buchte keinen Zug, nach Abschluss war der Text weiterhin da. Die 18 archivierten Messungen zu sechs F-Szenen liegen für Save/Read-back bei 153–250 ms. In dieser Untersuchung bestanden zusätzlich 39 vorhandene Node-Regressionen zu Persistenz, Requeststeuerung und Worldjobs. Ein neuer vollständiger Chromium-ST-Lauf war in diesem Executor wegen eines Socket-Fehlers beim Browserstart nicht möglich. Der neue SSE-Nachweis betrifft die echten **Komponenten**, der echte Host-End-to-End-Beleg stammt aus der archivierten .203-Abnahme. [ST-Testsequenz][smoke] · [maschinelle Abnahme][accept] · [Persistenz][save]

Unabhängiger lokaler Lastversuch mit .203-Code, Node 24.22.3, je vier Warmläufen und 31 Wiederholungen pro Stand. Der simulierte Transport serialisierte ganze Nachrichtenarrays in den Arbeitsspeicher. Darin enthalten sind Freeze, Faltung bzw. Signatur je Teilversuch und beim Save der echte Ablauf Vorlesen, Schreiben, Rücklesen. Netzwerk, Festplatte und Browser-Paint liegen außerhalb der Messung.

| Historischer Stand | Nachrichten | Unkomprimiertes Array | Median voller Fold | Median Save mit In-Memory-Transport |
|---|---:|---:|---:|---:|
| User05 A | 15 | 181.779 Byte | 0,55 ms | 23,93 ms |
| User05 B | 31 | 453.664 Byte | 1,18 ms | 61,70 ms |
| User05 C | 54 | 692.409 Byte | 1,46 ms | 88,28 ms |
| User04 | 93 | 1.244.837 Byte | 3,70 ms | 162,33 ms |

Die Browserhypothese aus Bericht C war überprüfbar. Ein AoE-Klick für drei Ziele verursachte im .203-Composer in einem minimalen DOM sechs Faltungen. Der synchrone Klick dauerte auf zwei realen historischen Kampfzuständen median 10,54 bzw. 13,82 ms. Es fehlt die echte Layout-/Paint-Zeit. Die nachgewiesene lokale Mehrarbeit erklärt die beobachteten Pausen von 20–55 Sekunden in diesen Fällen nicht. Große ältere Chats, viele Swipes, mobiles Gerät oder langsame Remote-ST-Anbindung bleiben eigene Lastfälle. Beim C-Stand entsprechen drei vollständige Zustände größenordnungsmäßig 2,08 MB unkomprimiert. ST-Request-gzip allein löst das nicht zuverlässig, weil Avereth native Save-Bodies für seine Prüfung ausliest und selbst JSON versendet. Erst bei gemessenem Engpass die Signatur desselben eingefrorenen Snapshots wiederverwenden oder Transport optimieren. Aktiven Ursprung, alle Felder, Revision und tatsächliches Read-back weiter prüfen. [Savepfad][save] · [ST-Chat-I/O][stio] · [Composer][composer]

**Welche ST-Zahlen eignen sich?** Im Dry-run überspringt ST 1.19 ausdrücklich die Generate-Interceptoren. Die World-Info-Suche läuft danach. Die Vorschau kann deshalb alte oder fehlende Engine-Injektionen enthalten. Eine belastbare A/B-Auswertung liest die finalen Nachrichten nach Postprocessing bei einer normalen Generierung gegen lokalen Mock. Auch die ausgewiesene ST-TTFT wird schon vor dem Zeichnen beim ersten Generatorereignis gesetzt. Die Tokenzählung ist eine dritte unabhängige Schicht. Für GLM am Custom-Pfad fällt ST serverseitig auf GPT-3.5-Turbo zurück und hält einen lokalen Nachrichten-Hashcache. Mit der Version aus dem Lockfile (`tiktoken 1.0.22`) und der ST-Einzelformel war die Abweichung bei den **19 endgültigen N-Arrays** lediglich +24 bis +42 Tokens, Median +40 (+0,33 %). Die gesamte Auswahl zuvor reservierter Nachrichten ist darin nicht rekonstruiert. Für diesen englischen Korpus lohnt deshalb kein Umbau des ST-Zählers. Nützlich sind getrennte Zeitmarken für dessen Cachemiss-POSTs bei langem oder fremdsprachigem Verlauf. Die ST-Option für eine größere Ausgabe verkleinert zugleich das verfügbare Inputbudget und kann das prozentuale WI-Budget verändern. [Dry-run][stdry] · [WI-Budget][wibudget] · [Tokenizer-Client][sttok] · [Tokenizer-Server][sttokserver]

### 7.2 Questtafel – ein lokalisierter Reparaturfehler muss keine fünf neuen Angebote erzeugen

.203 verwendet ein bereits gültiges Tagesboard wieder. Beim erstmaligen Erzeugen validiert die Engine das ganze Set. Liefert der erste Versuch weniger passende Listings als verlangt, fordert `generateBoard` bis zu einem zweiten vollständigen Entwurf an. Auch der zweite Versuch heißt in der Telemetrie `board`. Eine Auswertung nur nach `_repair` würde ihn übersehen. In vier persönlichen Archiven (.155, .157, .159, .202) fanden sich insgesamt sieben neu erzeugte Boards, vier davon mit Zweitaufruf. Bei .157 war der erste Versuch am Ausgabelimit, dort kann das ganze Array fehlen. Die kleine selektierte Stichprobe liefert keine Produktionsquote. [Boardpfad][boardpath] · [Validator und kanonische Texte][guild] · [persönliche Läufe][runs]

| Archivierter lokaler Fehler | Gespeicherter Vollrepair | Kompakte Musterantwort mit genau einem Ersatz | Gegenprobe mit unverändertem .203-Validator |
|---|---:|---:|---|
| User04, zu starker Gegner am Einstieg, Slot 1 | 8,492 s und 1.188 gemeldete Completiontokens. Kompaktes vollständiges JSON 941 Inhaltstokens. | 172 Inhaltstokens, **769 weniger** | Austausch Boar → Viper ergibt die fünf gültigen Listings des Vollrepairs. Kopie des Nachbarslots scheitert an doppeltem Jagdziel. |
| User05, unpassender Körperbau des Snapper, Slot 4 | 55,133 s und 926 gemeldete Completiontokens. Kompaktes vollständiges JSON 922 Inhaltstokens. | 176 Inhaltstokens, **746 weniger** | Austausch Snapper → Hound ergibt die fünf gültigen Listings des Vollrepairs. Kopie des Nachbarslots ergibt eine zweite Dungeon-Clearance und scheitert. |

Die beiden Tokenvergleiche zählen das komprimierte vollständige `{"listings":[…]}` und das Ersatzmuster `{"slot":n,"listing":{…}}` mit demselben GLM-Tokenizer, ohne Spezialtokens. Die Engine erhielt nach dem lokalen Einfügen jeweils wieder das **vollständige** Objekt. Kein Modell wurde zum Erzeugen eines Ersatzes aufgefordert. Die ursprünglich gemessenen 8,492 und 55,133 Sekunden sind **keine** prognostizierte Einsparung. User04-Board Nr. 98 kam mit 2.692 Input-, 911 Output- und null Cachetokens in 8,133 s, User05s Erstentwurf bei ähnlichem Umfang und gleichem sichtbarem Fingerprint in 55,898 s. Damit ist eine „Sekunden pro eingespartem Token“-Rechnung hier besonders schwach.

**Entwurf für einen Vergleich:** Gültige vier Einträge samt Originalposition, Spielrevision, Profil, Quoten und abgelehntem Grund festhalten. Einmal exakt ein Ersatzlisting anfordern, lokal zusammensetzen, das gesamte Board auf Größe, Einstieg, mittlere/obere Level, Jagdziel, Habitat und Clearance prüfen. Buchung erst bei vollständigem Erfolg. Globale oder unlesbare Erstentwürfe behalten den vollen Reparaturpfad. Kein zusätzlicher dritter Versuch. Der aktuelle Forge-Pfad kann bereits fehlende Vorschläge gezielt nachfordern und liefert ein internes Vorbild. Ein zweiter Arm betrifft die **Erstgenerierung**. Im heutigen COUNT-/Clearance-Profil formuliert die Engine `task` und `desired_end_state` aus geprüften Zielen anschließend selbst. Beim gültigen User05-Board belegen beide Felder 1.441 von 3.380 kompakten UTF-16-Einheiten. Auf dieser einen Tafel ergab die lokale kanonische Ergänzung vor der Validierung tiefengleiche `bookBoard`-Ereignisse. Andere Boardprofile, Titel, Auftraggeber und kreative Ortsbeschreibung gesondert schützen. Dieser Versuch ist größer als die Slotreparatur und folgt ihr. [Forge][forge] · [Boardinhalt][guild]

### 7.3 Extractor – die Auswertung muss eine fehlende Zusage erkennen können

Im vorhandenen `bench_extract.mjs` entfernt die Vorbereitung historischer Nachrichten andere `extra`-Felder als `avereth`, einschließlich des gespeicherten HUD-Eingabemodus. Am User05-Fall I23 verweigert die korrekte Faltung daraufhin die inkonsistente Eingabe. Mit dieser Vorbereitung sind nur neun von 20 physischen X-Fällen rekonstruierbar. Mit vollständiger Chatkopie, allen Revisions-/HUD-Daten und ausschließlich wieder geöffnetem X-Record **20/20**. Die bisherige Bewertungsfunktion verwendet zudem ein allgemeines Vokabular und weniger Szenenoptionen. Die Weltzusammenfassung vergleicht bei manchen Feldern nur Anzahlen bzw. Status. Eine neue Zusage der falschen Person kann durchrutschen. Der Live-Timer des Werkzeugs endet bereits bei Rückkehr von `fetch` vor `await res.text()`. Abhängig vom Transport ist das Header- statt vollständiger Bodyzeit. Das betrifft den Forschungsbenchmark, nicht den produktiven Save. **Daher keine Modell- oder Routingentscheidung aus einem grünen Lauf dieses alten Werkzeugs ableiten.** [Benchmark][bench] · [produktiver X-Pfad][runtime]

**Was kompakter Output tatsächlich bringt:** Dieselben 20 Antworten mit aktueller Kampagnenvokabel, Startszene, erwarteten Schlüsseln und kompletter Prosa durch `parseExtraction` prüfen. Kompakte JSON-Schreibweise und Weglassen ausschließlich bereits normalisierbarer `null`-Felder auf Deltaobjekten (80 Felder) ergeben dieselben normalisierten Werte, Fehler und Hinweise in 20/20 Fällen. Zeichenumfang 14.299 → 13.380 → 12.285. Beim GLM-Tokenizer sinkt der **sichtbare** Inhalt von **4.555 auf 3.775 und 3.440 Tokens**. Unterschied Original → kompakt & nullable also 1.115, rund 24,5 % der sichtbaren X-Tokens oder 16,7 % der historischen X-Completion. Die 2.090 rekonstruierten Reasoningtokens wurden dabei nicht verändert. Nachträgliches Minifizieren beim Client spart keine Generierungszeit. Erst wenn das Modell die kompakte Form selbst zuverlässig erzeugt, entsteht die potenzielle Verringerung. Das heutige Format erlaubt das Weglassen schon. Ein kleines Beispiel im Outputvertrag ist ein billigerer Vergleich als ein neues Schema oder eine andere Weltlogik. [Normalizer][extract]

Drei von 20 Antworten enthielten keine Deltas. Ob sie leer sein dürfen, lässt sich erst nach Lesen der Prosa und der erwarteten Ausgänge entscheiden. „Kurzer Text“ oder „Kampf“ als X-Skip kann ein neues Versprechen, einen neuen Ort oder ein kausales Wissen verlieren. Ein sinnvoller Goldsatz wird von der Originalprosa aus unabhängig annotiert. Die gegenwärtigen Deltas sind ein zusätzlicher Vergleich. **Akzeptiertes JSON, korrekte Welt nach Commit und richtige Erinnerung nach Verlassen des Chatfensters sind drei verschiedene Prüfungen.**

## 8. Modelle, APIs und Alternativen zur heutigen Architektur

### Einstellungen mit messbarem Geltungsbereich

| Rolle | Historisch effektiver Request | Schlussfolgerung |
|---|---|---|
| N | GLM, Temperatur 0,9, Top-p 0,95, max. 4.096, nichtstreamend. Gemeldete Completion median 402, max. 525. | Limit allein zu senken beschleunigt eine ohnehin früher endende Antwort nicht zuverlässig. Bei überlangem Weitererzählen eher einen natürlichen Entscheidungspunkt testen, mit bewusst längerem NPC-Gespräch als Gegenfall. |
| P | Temperatur 0,1, max. 2.000. Completion median 67, max. 104. | Evaluiert werden korrekte Bindung, Negation, Reihenfolge und Teilhandlung. Eine niedrigere Temperatur kann Variabilität beeinflussen. Ein Geschwindigkeitsgewinn ist hier ungemessen. |
| X | Temperatur 0,1, max. 4.000. Completion median 288,5, max. 767. | Ein neuer knapperer Ausgabeauftrag ist prüfbar. Ein hartes kleines Limit kann den teuersten Pfad öffnen, wenn ein komplexer Zug anschließend eine Reparatur benötigt. |
| Board / Forge | Board 0,6 und 3.000, Forge in .203 0,6 und 1.500. Kein Forge in User05 A–C. | Boardkreativität in Namen, Ort und Auftrag erhalten, bereits deterministisch herleitbare Teile separat prüfen. Für Forge liefert User05 keine belastbare Zeitwirkung. |

Beim Custom-Pfad sind Verbindung, Include-/Exclude-Body, ST-Postprocessing und die effektive Herkunft eines Parameters zu prüfen. Das Feld `reasoning_effort` im Preset allein garantiert bei Custom-GLM keinen Weitertransport. In den realen Daten standen `low` und `clear_thinking:true` bei **64/64** im ausgehenden Body. Das Hersteller-Template steuert mit `clear_thinking` den Umgang mit älteren Denktexten. Featherless dokumentiert für dieses Modell low/high/max, Standard max. Ein globales Override von Format oder Sampling könnte auch N treffen. In einem früheren natürlichen Versuch wurden bei `reasoning_effort:none` sogar wesentlich längere Denktexte und zehn Trunkierungen in 30 Antworten beobachtet. Die Versuchsarme damals waren teilweise konfundiert. `plain` mit beibehaltener Einstellung erzielte in der separaten Kontrolle 30/30 erstgültige Antworten. Das ist ein Grund, für das Zusammenspiel dieses Modells und dieser Formate mit `low` zu beginnen. [Customtransport][custom] · [ST-Backend][stbackend] · [P0][p0] · [Featherless und GLM][model]

### Architekturen im Vergleich

| Alternative | Wann sie wirtschaftlich sinnvoll wäre | Urteil für .203 und kleinster Gegenversuch |
|---|---|---|
| Deterministische Eingabe bzw. unmittelbare Engineantwort | Bereits exakte Spielerwahl, keine freie Absicht zu interpretieren. | Bestehende HUD-/Questannahme und lokale Panels nutzen. Ein zusätzlicher Klassifikator würde den gerade gesparten Call teilweise zurückbringen. Jede neue Schnellroute muss freie Nebenhandlung, Bedingung und Negation erkennen oder auf P zurückfallen. |
| Kleinere, phasenspezifische Modelle | Ein Spezialmodell plus Validierung und gelegentlicher Fallback bleibt schneller als ein großer Call und hält seltene, wichtige Bedeutungen fest. | Als späteren X-Kontrollarm fest zugeordnetes Modell vor dynamischem Router prüfen. Ein echtes Non-Thinking-Modell ist z. B. Qwen3-30B-A3B-Instruct-2507 (1 Kapazitätseinheit), alternativ GLM-4.7-Flash (2). Bei identischer hypothetischer User05-X-Menge ergeben öffentliche Listenpreise ca. 0,03925 bzw. 0,02160 USD gegenüber 0,04683 USD. Andere Tokenizer, Ausgabe, Last, Fehlerraten und Modellstarts machen daraus keine Prognose. Ein zusätzlicher Call mit einer Einheit passt nicht neben ein Modell mit vier Einheiten in ein Viererbudget. [Qwen-Hersteller][qcard] · [Qwen][qprice] · [GLM-4.7][gprice] · [LLMRouterBench][router] |
| Kleines stabiles Ausgabeschema oder Tool Calling für P/X | Backend erzwingt das benötigte Teilformat wirklich, kompiliert es günstig und senkt die *fachliche* Reparaturhäufigkeit. | Zuerst echtes Capability- und Schemafixture im isolierten Host. Ein HTTP-Erfolg für trivialen JSON-Schematest reicht nicht. Der historische schema_keep-Arm lieferte formal JSON, aber oft falsche Schlüssel. Zustands-IDs weiterhin dynamisch prüfen. Keine globale `response_format`-Vorgabe für die Prosa. Schemaabdeckung, Grammatik-Kaltstart, Geschwindigkeit und Folgezustand gesondert. [P0][p0] · [Featherless Tools][tools] · [JSONSchemaBench][schema] · [Formatrestriktionen][format] |
| Gemeinsame N-Prosa und strukturierte Weltfolgen | Die Ersparnis des zweiten Aufrufs übersteigt längeren N-Output, Recovery und verzögerte erste Prosa. | Der alte S2-Vergleich auf 41 Zügen liefert eine echte Hürde. Getrennter X erreichte 87,4 % Semantik je Goldelement und 25/25 erwartete Antworten. Eingebetteter Block erreichte 67,3 % und 18/25, war nur bei 43,9 % gültig und vollständig und brauchte in 23/41 Fällen Recovery. Hochgerechnet 10.570 statt 9.911 Tokens je Storyzug. Anderes Protokoll und alte Stichprobe. Einen neuen Ansatz nur gegen diesen Gegenbefund und einen späteren NPC-Folgeturn testen. [S2][p0] |
| Dynamischer GM mit Werkzeugen, ein oder mehrere Aufrufe | Weltbuchung und kreative Aktion lassen sich günstiger koordinieren als mit P/N/X. | Der archivierte natürliche GM-Fall verarbeitete drei Requests, 34.815 Input- und 1.146 Outputtokens und veröffentlichte keine Geschichte. Neu erzeugter Sprecher und Präsenzregel widersprachen sich. Für die jetzige Priorität zu viel Migrations- und Validierungsaufwand. Funktionierende Teile wie idempotente Ausführung und Revisionstreue als Vergleichsstandard nutzen. [Architekturarchiv][arch] |
| X parallel starten, X auslassen, nächstes Kommando vorab buchen | Nur bei nachweislich unabhängigen Daten oder einer UI-Eingabe ohne mechanische Wirkung. | X braucht die fertige Narration. Ein Folgeturn kann neue Zusagen, Orte und NPC-Präsenz brauchen. Tippen und Lesen parallel zum X sind bereits möglich. Eine lokale Entwurfshilfe oder sichtbare gebuchte Aktion kann die wartende Person informieren. Der tatsächliche nächste Zug bleibt bis zur richtigen Revision gesperrt. Keine spekulativen Provideranfragen, Warmups oder Wiederholung nach bloßem Client-Timeout. |
| Semantischer Langzeitabruf oder LLM-Zusammenfassung | Wiederholt geht trotz bestehender strukturierter Erinnerung eine relevante, implizit angesprochene Episode verloren. | Erst Trefferrate und Fehlabruf im vorhandenen Recall messen. Vergleich gegen deterministischen Abruf auf derselben Tokenmenge, mit Identität, Beteiligung, Zeit, Zugang und aktiver Revision. Nur wenn das für lange Kampagnen regelmäßig hilft, Embedding-/Indexkosten und Wartung aufnehmen. [NoLiMa][nolima] · [Observation Masking][mask] |
| Selbsthosting, Speculative Decoding, Batch, serverseitiges Prefill/Decode-Splitting oder Grammatik-Fast-Forward | Eigene Serving-Kontrolle, genügend Last und ein belegter Engpass im Decoder bzw. Scheduler rechtfertigen Betriebskosten. | Reale Techniken, beim heutigen ST-Custom-Pfad fehlt Avereth die Kontrolle über GPU, Cache-Affinität, Draftmodell und Compiler. Batchdurchsatz ist für den einzelnen aktiven Spieler wenig aussagekräftig. Serverdiagnose kann Queue und Verarbeitung trennen. Clientmetriken allein können dies nicht. [DistServe][dist] · [Speculative Decoding][spec] · [Grammar Fast-Forward][fast] |

Für einen kleinen Modellpfad lässt sich die Entscheidung vorab rechnen. Erwartete Zeit ist die Summe aus Zeit des kleinen Modells, Validierung und **Fallbackwahrscheinlichkeit × zusätzlicher voller Recoveryzeit**, zuzüglich etwaiger Queue-/Modellwechselzeit. Gleiche Rechnung für Gebühren. Semantisch falsche, vom Validator akzeptierte Ergebnisse zählen als Qualitätsfehler und verschwinden nicht in einer niedrigen Fallbackquote. Bei persönlicher Nutzung im Pauschaltarif zuerst Erzähl- und Spielwartezeit vergleichen. Die öffentlichen Tarifunterlagen unterscheiden persönliche Chatnutzung von automatisierten Entwicklungs-/Benchmarklasten. Die vorgeschlagenen technischen Wiederholungen laufen lokal. [Tarife][plans] · [Modellrouting-Benchmark][router]

## 9. Vergleichsprogramm und Prioritäten

Die folgenden Schwellen sind **vorgeschlagene Entscheidungshilfen** für ein privates Spiel. Sie stammen weder aus einem Anbieter-SLA noch aus einer bestehenden Projektanforderung. Alle Offline- und Mockversuche sind ohne Modellgebühren möglich. Die historische natürliche Prosa dient als unveränderte Referenz. Eine Aussage über neue natürliche Spielqualität erfordert später gesondert autorisierte Daten, etwa passiv beobachtetes gewöhnliches Spiel. Es wurde kein automatisierter Providerversuch durchgeführt.

| Rang | Änderung / Aufwand | Kontrollierter Vergleich | Übernahme- oder Abbruchkriterium |
|---|---|---|---|
| **1a** | Zwei Spieleruhren und natives N-Streaming ohne Smooth. Aufwand gering für Konfigurationsvergleich, mittel für Host-/Fehlerprüfung. | Isoliertes ST 1.19.0, identische Meldungen, Tokenobergrenze und Zeitplan im lokalen Mock, ein Arm gepuffert, einer SSE. Sofortige und zögernde Ausgabe, Rolle/Reasoning vor Inhalt, langsamer X, Fehler vor und nach Prosa, Stop, Swipe, Reload. | Zeit bis sichtbarem Satz sinkt eindeutig, Endtext und nächster spielbarer Zustand sind korrekt. Nur ein Commit je Revision. Fehlerhafte Teilprosa, verlorener Entwurf oder doppelter Zug verwerfen den Arm. Beim gewöhnlichen Spiel anschließend prüfen, ob früheres Lesen tatsächlich bevorzugt wird. |
| **1b** | Board-Repair pro fehlerhaftem Slot, dann eigene Erstgenerierungsprobe. Aufwand mittel, gezielter und begrenzter Eingriff. | User04/05, bekannte Erstentwürfe und gültiger erster Durchlauf. Auch kaputtes Gesamt-JSON, falsche Quoten, doppelte Jagd, zwei Clearances und wiederverwendetes Tagesboard. Vollrepair gegen Ersatzantwort bei exakt gleichem Stand. | In allen lokal reparierbaren Fixtures identische gültige Tafel und globale Abweisung der Gegenfälle. Anzahl physischer Versuche darf nicht steigen. A/B später nach Zeit bis vollständiger sichtbarer Questwahl, Inhaltstokens und Erfolgsrate entscheiden. |
| **2** | X-Prüfhilfe und kompakter Output. Aufwand gering bis mittel, betrifft den wiederkehrenden Zugabschluss. | Zuerst 20/20 historische Versuche mit allen gespeicherten Feldern und produktiven Parseroptionen rekonstruieren. Volle Antwortzeit einschließlich Body messen. Danach Ausgangsvertrag gegen ein Beispiel für kompaktes JSON, separat von Fachmodulen. | Vollständige Welt-, Ereignis- und Folgeturngleichheit bei gleichwertigen strukturellen Darstellungen. Für natürliche Varianten unabhängige Annotation von Auslassungen und falschen Zusagen. Zeitersparnis pro korrekt abgeschlossenem Zug einschließlich Reparaturen. |
| **3a** | Card vor Lore bei unverändertem Inhalt. Aufwand gering, reversibler Presetversuch. | Zwei echte gerenderte Requestarrays gegen lokalen Mock, dann Tokenvergleich. Identische Kartenrevision, WI-Aktivierung, jüngste erhaltene Historie, Enginefakten und Post-History nachweisen. Beide Anordnungen auch nahe der zulässigen Budgetgrenze prüfen. | Nachgewiesener Prefixeffekt liegt schon vor. Als Geschwindigkeitsmaßnahme nur übernehmen, wenn Ausgabequalität hält und Messung am relevanten Betrieb tatsächlich weniger Wartezeit zeigt, oder in einem bezahlten Pfad der reale Kostenvorteil den Aufwand trägt. |
| **3b** | P-/X-Markttext und zustandsgebundene Regeln. Aufwand mittel. | Verkaufston entfernen, dann als separater Arm Spezialdetails situativ. Anfangs- und Endzustand, freie Rede, registrierter Kauf, spontaner Handel im Kampf, Gegner-/NPC-Erfindung und bedingte Reise. | Schwierige Fälle erreichen weiterhin gültige IDs und korrekte autonome Folgen. Inputgewinn mit möglichem Cacheverlust und Reparaturen verrechnen. Verbessert sich die Zeit ohne Qualitätsgewinn nur gering, einfachere stabile Anordnung behalten. |
| **4** | Kontextauswahl für wiederholt verfehlte Fakten. Aufwand mittel. | Pflichttext im selben Budget reduzieren und einen fehlenden Fakt gezielt projizieren. I14 Nordroute, I38–I45 Phantomgegner, außerhalb des Dungeons erlaubte Erfindung, Wiedersehen mit offener vs. erledigter Zusage, private Gedanken, falscher Zeuge, verworfener Swipe. | Fakt kommt an, wird korrekt genutzt und bleibt im Folgeturn erhalten. NPC behält Stimme und darf plausibel schweigen. Längerer Kontext, höherer Retrievalscore oder mehr erwähnte Erinnerungen allein sind keine Erfolgskriterien. |
| **5** | Modellwechsel, gemeinsame Ausgabe, RAG oder großer Hostumbau. Aufwand mittel bis hoch. | Erst nach verbleibendem messbarem Engpass. Genau einen Ansatz gegen die beste bisherige Variante prüfen, inklusive Modellauswahl, Wartung, Fallback, Fehlentscheidung und Folgezustand nach Reload. | Nur weiter, wenn der marginale Zeit-/Kosten- oder Qualitätsgewinn die zusätzliche Komplexität rechtfertigt. Ein hübscher erster Absatz oder ein schneller Einzelcall ist dafür unzureichend. |

**Versuchsführung.** Gleiche Spielaktion, Seeds und bereits entschiedene Mechanik einfrieren. Repräsentative Familien bilden (Gespräch, Reise, Kampf mit Nebenhandlung, Board, Handel, Wiedersehen). Pro Szene A/B oder B/A auslosen, verdeckt beurteilen, Gleichstand zulassen. Dieselben Szenen in beiden Armen und über mehrere unabhängige Spielabschnitte verwenden. Einfache Wiederholungen oder Swipes sind keine neuen Kampagnen. Für kleine Stichproben Einzelpaare, Spannweite, Ausreißer, Zähler/Nenner und Fehlertexte berichten. Für größere Auswertungen gepaarte Differenzen und Unsicherheitsintervalle nach Sitzung/Szene, getrennt nach Pfad und kaltem/warmem Zustand. Als vorläufige Orientierung erscheint eine Verbesserung von mehreren Sekunden an der tatsächlich betroffenen Spieleruhr wesentlich interessanter als ein kleiner globaler Mittelwert. Werden solche Effekte mit den verfügbaren Daten nicht aufgelöst, bleibt das Ergebnis offen.

**Qualitätsprüfung mit Folgen.** Ungewählte PC-Handlung, falsche Doppelbuchung, beschädigtes Read-back, Wiederkehr eines verworfenen Swipes oder bekanntgemachtes NPC-Geheimnis disqualifizieren die betroffene Variante. Bei Prosa über Stil, Erzählfluss, angemessene Länge und glaubwürdige eigene NPC-Absicht blind urteilen. Ein Pflichtfakt muss korrekt *handlungswirksam* sein, ohne dass jeder NPC ihn aussprechen muss. Beim X unabhängig markieren, wer wem was unter welcher Bedingung zugesagt hat. Einen Folgeturn hinter dem Vier-Eingaben-Fenster prüfen. Für den Spieler zählt pro Absicht die gesamte Kette einschließlich nötiger Wiederholung. RPGBench stützt die getrennte Bewertung von ausführbaren Mechaniken und subjektiver Spielqualität. [RPGBench][rpg]

**Entscheidung nach dem Versuch.** Bleibt der Bildschirm leer, während P oder Board läuft, am vorgelagerten Erzeuger ansetzen. Kommt frühe Prosa gut an, während Spieler nach dem Lesen weiter vor einer Sperre stehen, hat X Vorrang. Liefert eine Presetumordnung längere Präfixe ohne geänderte Kosten oder Wartezeit, bleibt sie eine dokumentierte technische Möglichkeit. Werden bekannte Fakten vom Pflichttext verdrängt, ist ein gezielter Tausch der nächste Versuch. So führt auch ein negatives Resultat zu einer konkreten Entwicklungsentscheidung.

## 10. Reproduktion und Quellen

Die Kernmessungen lassen sich ohne API-Key oder Modellgewichte nachvollziehen. Benötigt werden zwei Checkouts, im folgenden Beispiel `repo/` bei [32aff5e2][main] und `product/` bei [5e5b8272][product]. Für den Tokenvergleich genügen aus der [öffentlichen Modellrevision][hf] `tokenizer.json` und `chat_template.jinja` im Verzeichnis `hf/`. SHA-256 des Tokenizers ist `19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d`, des Templates `2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4`. Die beiden folgenden Ausschnitte wurden mit den Originalen geprüft.

**1. Vier Dateien mit dem Repositoryparser lesen.** Den JavaScript-Block als `pairs.mjs` im gemeinsamen Elternverzeichnis ausführen und die Standardausgabe nach `pairs.jsonl` umleiten. Der Parser des Projekts interpretiert ST-Konsolenliterale und ist hier ausschließlich für diese bekannten archivierten Quellen gedacht. Alternativ lassen sich Objekte, Arrays und verkettete Stringliterale statisch aus dem AST lesen. Beide Wege ergaben dieselben Fallzahlen.

```js
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseServerLog } from './product/avereth-engine/tools/run_report.mjs';

const inputs = [
  ['A', 'user-20261118-011503/originals/completions.txt'],
  ['B', 'user-20261118-011503/originals/phase_b_completions.txt'],
  ['C', 'user-20261118-011503/originals/phase_c_completions.txt'],
  ['4', 'user-20261106-072640/originals/serverlog.txt.gz'],
];
for (const [part, file] of inputs) {
  const bytes = fs.readFileSync('repo/testrun_10b/' + file);
  const text = part === '4' ? gunzipSync(bytes).toString('utf16le') : bytes.toString('utf8');
  const log = parseServerLog(text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n'));
  if (log.errors.length) throw new Error(log.errors.join('\n'));
  for (const { req, resp } of log.pairs) {
    if (!resp) throw new Error('Fehlende oder wiederholte Antwort');
    console.log(JSON.stringify({ part, req, usage: resp.usage }));
  }
}
```

**2. Tokenlängen und N-Präfixe gegenprüfen.** Python mit `tokenizers==0.22.2` und `Jinja2==3.1.6`. In User04 kommt zusätzlich zur UTF-16LE-Dateicodierung eine umkehrbare Konsolen-Fehldekodierung der Nachrichteninhalte vor. Nur hier CP850-Bytes wieder als UTF-8 lesen. Die drei User05-Dateien direkt verwenden. Der folgende Test bricht bei *jedem* von der Provider-Usage abweichenden Input ab.

```python
import json
from pathlib import Path
from statistics import median
from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer

env = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True,
                                    extensions=['jinja2.ext.loopcontrols'])
template = env.from_string(Path('hf/chat_template.jinja').read_text())
tok = Tokenizer.from_file('hf/tokenizer.json')

def encode(messages, request):
    rendered = template.render(messages=messages, tools=None, add_generation_prompt=True,
                               reasoning_effort=request.get('reasoning_effort'),
                               clear_thinking=request.get('clear_thinking', False))
    return tok.encode(rendered, add_special_tokens=False).ids

def prefix(a, b):
    return next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))

n_old, n_swap = [], []
count = 0
for line in Path('pairs.jsonl').open():
    row = json.loads(line)
    req = row['req']
    ms = req['messages']
    if row['part'] == '4':
        ms = [dict(m, content=m['content'].encode('cp850').decode('utf8')) for m in ms]
    ids = encode(ms, req)
    assert len(ids) == row['usage']['prompt_tokens']
    count += 1
    if row['part'] != '4' and ms[0]['content'].startswith('AVERETH NARRATOR'):
        assert ms[2]['content'].startswith('AVERETH RPG')
        alt = encode([ms[0], ms[2], ms[1], *ms[3:]], req)
        assert len(alt) == len(ids)
        n_old.append(ids)
        n_swap.append(alt)

def previous(series):
    return [prefix(a, b) for a, b in zip(series, series[1:])]

old, new = previous(n_old), previous(n_swap)
assert count == 188 and len(old) == 18
print(median(old), median(new), sum(new) - sum(old))
# 4605.5 8449.0 69183
```

**3. Budget und Reparaturen.** Für §6 die Kopfzeile der `phase_c_chat.jsonl` entfernen. Für jede Antwort mit `extra.avereth.narration.context` den Chat *vor* dieser Antwort schneiden, `lastPlayerIndex` bestimmen und `turnBlock(prefix, u, content, {budget, rulesBudget:800, recentTurns:4, engineLore:false})` aufrufen. `content` kommt aus `loadProductContent()` in den .203-Testhelfern. `context.text` ohne zusätzliche Spezialtokens zählen. Bei I40/I41 wird derselbe Spielerrecord zweimal beobachtet. Lässt man diese Doppelbeobachtung weg, verbleiben 18 verschiedene Spielerstände. Bei Budget 1.400 stehen `guild_authority` und `help` in 18/18, `relevant` wird in 14/18 verworfen. Das ist ein konkreter Ansatz für eine Ablation der doppelten Grundregel, keine Messung verlorener NPC-Erinnerungen.

Für §7.2 jeweils Originalchat bis vor I11 mit `foldChat(chat,11)`, Bedarf mit `boardFor` im C-Profil bestimmen, die beiden nummerierten Request-/Antwortpaare auslesen (User04 Nr. 12/13, User05 A Nr. 11/12). Die beiden JSON-Arrays elementweise vergleichen. Ersten Entwurf, Vollrepair, Erstentwurf mit genau einem ausgetauschten Slot und Erstentwurf mit kopiertem Nachbarslot einzeln durch `parseBoard` schicken. Anzahl und Inhalt gültiger Listings und Ablehnungsgründe festhalten. Für §7.3 alle Nachrichteneigenschaften erhalten, nur die aktuelle Extraktion wieder öffnen. Aus `extractionRequest` die tatsächliche Szene, IDs, erwartete Schlüssel und Kampagnenvokabel holen. Unveränderte und gekürzte Antwort mit denselben `parseExtraction`-Optionen prüfen. Niemals den Originalchat überschreiben. [Produktcode][runtime] · [Gliederung der Originale][u5] · [.203-Testbelege][accept]

**Quellenwert.** Die Zahlen dieses Berichts stammen, soweit nicht ausdrücklich als historisches Protokoll gekennzeichnet, aus den genannten Originalen oder lokalen .203-Versuchen. Offizielle Providerunterlagen belegen Parameter und Abrechnungssemantik, aber keine damalige Replik oder Kontokonfiguration. Der gepinnte ST-Code ist für die Hostbehauptungen vorrangig gegenüber der fortgeschriebenen Dokumentation. Fachpublikationen liefern überprüfbare Methoden und Vergleichsarchitekturen. Ihre Benchmarks sind keine Avereth-Benchmarks. Externe Quellen wurden am 19.11.2026 geprüft.

| Gebiet | Primärquellen zur Nachprüfung |
|---|---|
| Avereth | [Drei Vorberichte: Forschungsstand][a], [Projektanalyse][b] und [Vertiefung][c] · [User05-Originale][u5] · [User04-Originale][u4] · [.203-Maschinenergebnisse][accept] · [P0-Vergleich][p0] · [archivierte Architekturversuche][arch] |
| Host und Prompt | [ST 1.19 Release][strelease] · [Generate und Interceptoren][stdry] · [Prompt Manager][pm] · [World Info][wi] · [SSE-Transformer][smooth] · [Tokenizer][sttokserver] · [GLM-Template][template] |
| Provider und Betrieb | [Usage einschließlich Cache und Kosten][usage] · [Kontogrenzen][plan] · [Preisangaben][credits] · [GLM-Modellseite][price] · [Organisationsweite Belegung][concurrency] · [historische Abrechnungsdetails][billing] |
| Latenz und Serving | [Inference-perf-Metriken][metrics] · [OpenAI-Latenzleitfaden][latguide] · [vLLM Prefix Caching][apc] · [DistServe, OSDI][dist] · [Speculative Decoding][spec] |
| Formate, Routing und Spielqualität | [JSONSchemaBench][schema] · [Tam et al., EMNLP][format] · [LLMRouterBench, ACL][router] · [RPGBench][rpg] · [NoLiMa, ICML][nolima] · [Observation Masking][mask] |

[product]: https://github.com/Mango1331/Claude-AI-RPG-Game/tree/5e5b8272412b51b91f75b6e37c5b94d95c9fae11
[main]: https://github.com/Mango1331/Claude-AI-RPG-Game/tree/32aff5e223e6b58032254ea3873342fa8a6faaca
[a]: LLM_KONTEXT_ST_RPG_PERFORMANCE_FORSCHUNGSSTAND_2026-11-19.md
[b]: FORSCHUNGSBERICHT_AVERETH_203_LLM_KONTEXT_SPIELQUALITAET_PERFORMANCE_2026-11-19.md
[c]: AVERETH_203_VERTIEFTE_OPTIMIERUNGSRECHERCHE_2026-11-19.md
[review]: GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md
[arch]: ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md
[brief]: ../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md
[runs]: ../testrun_10b/README.md
[u4]: ../testrun_10b/archiv/user-20261106-072640/originals/
[u5]: ../testrun_10b/archiv/user-20261118-011503/originals/
[runtime]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js
[host]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/index.js
[host202]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc650809eb16934a984c30ce0cf7c5cfe98/avereth-engine/index.js#L123
[accept]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/USER05_203_TECHNICAL_RESULTS.json
[perf]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH8_2_LLM_PERFORMANCE.md
[p0]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/P0_BERICHT.md#L68
[card]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt
[preset]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/presets/Avereth%20Narrator%20V4.json
[lore]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/lorebook/Avereth_World_Lore_v0.14.json
[loredoc]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/LOREBOOK.md
[turnblock]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/host.js#L229
[packer]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/context.js#L899
[ctx]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/context.js#L578
[hist]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/host.js#L572
[gear]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/items.js#L148
[catalog]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/catalog.js#L358
[extract]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/extract.js
[lease]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/request_control.js#L50
[recovery]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/index.js#L783
[smoke]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/tools/st_live/user05_smoke.mjs#L101
[save]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/action_persistence.js
[composer]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/action_composer.js
[boardpath]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js#L587
[guild]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/guild.js
[forge]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js#L528
[bench]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/tools/bench_extract.mjs
[custom]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/index.js#L232
[st]: https://github.com/SillyTavern/SillyTavern/tree/7e8663cd9c184a550b37238218bdd32c6efc68e9
[strelease]: https://github.com/SillyTavern/SillyTavern/releases/tag/1.19.0
[stsend]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L5874
[smooth]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/sse-stream.js#L340
[render]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L3866
[stdefaults]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/power-user.js#L134
[stio]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/chats.js#L532
[stdry]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L4562
[wibudget]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/world-info.js#L4736
[sttok]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/tokenizers.js#L846
[sttokserver]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/tokenizers.js#L440
[stbackend]: https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backends/chat-completions.js#L2394
[price]: https://featherless.ai/models/zai-org/GLM-5.3-Flash
[model]: https://webflowcms.featherless.ai/blog/glm-5-3-flash-is-live-on-featherless
[credits]: https://featherless.ai/docs/request-pricing-and-credits
[plans]: https://featherless.ai/pricing
[plan]: https://featherless.ai/docs/api-reference-plan
[usage]: https://featherless.ai/docs/completions
[billing]: https://featherless.ai/docs/api-reference-usage-activity
[concurrency]: https://featherless.ai/docs/api-reference-concurrency-stream
[tools]: https://featherless.ai/docs/tool-calling
[qprice]: https://featherless.ai/models/Qwen/Qwen3-30B-A3B-Instruct-2507
[qcard]: https://huggingface.co/Qwen/Qwen3-30B-A3B-Instruct-2507
[gprice]: https://featherless.ai/models/zai-org/GLM-4.7-Flash
[hf]: https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c
[template]: https://huggingface.co/zai-org/GLM-5.3-Flash/blob/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/chat_template.jinja
[pm]: https://docs.sillytavern.app/usage/prompts/prompt-manager/
[wi]: https://docs.sillytavern.app/usage/core-concepts/worldinfo/
[apc]: https://docs.vllm.ai/en/stable/features/automatic_prefix_caching/
[spec]: https://docs.vllm.ai/en/stable/features/speculative_decoding/
[fast]: https://github.com/guidance-ai/llguidance/blob/main/docs/fast_forward.md
[metrics]: https://github.com/kubernetes-sigs/inference-perf/blob/main/docs/metrics.md
[latguide]: https://developers.openai.com/api/docs/guides/latency-optimization
[dist]: https://www.usenix.org/conference/osdi24/presentation/zhong-yinmin
[mask]: https://arxiv.org/abs/2508.21433
[schema]: https://arxiv.org/abs/2501.10868
[format]: https://aclanthology.org/2024.emnlp-industry.91/
[router]: https://aclanthology.org/2026.findings-acl.1881/
[rpg]: https://arxiv.org/abs/2502.00595
[nolima]: https://proceedings.mlr.press/v267/modarressi25a.html
[stcompare]: https://github.com/SillyTavern/SillyTavern/compare/7e8663cd9c184a550b37238218bdd32c6efc68e9...06bde939f
