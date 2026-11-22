# Avereth .203 im natürlichen Featherless-A/B-Spieltest

**Die optimierte Suite machte die Erzählung in allen neun gemeinsam messbaren Zügen früher lesbar.** Die Wartezeit bis zum nächsten sicheren Zug sank über zehn Züge um 35,53 Sekunden. Der Median stieg um 10,59 Sekunden und der Gesamtverbrauch stieg um 19.877 Tokens. Vor allem beim Gildenboard schwankte die Providerzeit stark. Alle 20 Hauptzüge bestanden Save, Read-back und Reload. Für den unabhängigen Gegenreview empfehlen sich natives Streaming, B1, der kurze Marktkatalog und der Save-Patch als Kandidaten. Spielqualität und Gesamtgeschwindigkeit lassen sich aus einem verzweigenden Lauf pro Arm nur begrenzt verallgemeinern.

## Versuchsaufbau

| Einstellung | Referenz A | Optimierungssuite B |
|---|---|---|
| Git-Branch | `experiment/action-hud-200-v1` | `experiment/203-performance-optimization-suite` |
| Vor Beginn verifizierter Remote-HEAD | `5e5b8272412b51b91f75b6e37c5b94d95c9fae11` | `8df38d3fe4b62eafc2b746ada81e5f2470956dea` |
| Narrator | gepuffert | natives SSE, Smooth Streaming aus |
| Board, Marktkatalog, Speichern | ursprüngliche .203 | B1, kürzerer Maschinenkatalog und Erstentwurf, optimierter Save |
| Preset und Extractor im Haupttest | Avereth Narrator V4, ausführlicher Vertrag | identisch, `compactOutput=false` |

Beide Arme auf SillyTavern **1.19.0** bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`, installiert auf demselben Linux-Host mit zwei ST-Prozessen, getrennten Konfigurationen und Datenwurzeln und getrennten Chromium-Browserkontexten. Die Character Description, die verknüpfte World Info und die Originalpreset-Datei wurden jeweils per Hash verglichen. Die tatsächlich anliegende Reihenfolge und die Sampling-Einstellungen wurden nach dem Laden in beiden Browsern verglichen. Der begrenzte natürliche Versuch war vorab unabhängig geprüft und vom Nutzer beauftragt. [Technische Vorarbeit](AVERETH_203_OPTIMIERUNGSSUITE_2026-11-19.md) · [Gegenreview](GEGENREVIEW_203_PERFORMANCE_SUITE_GPT_2026-11-19.md)

Alle Modellrollen verwendeten `zai-org/GLM-5.3-Flash` bei `https://api.featherless.ai/v1/chat/completions`. Der Narrator hatte 4.096 Ausgabetokens bei 131.072 konfigurierten Kontexttokens, Temperatur 0,9 und Top-p 0,95. Bei den anderen Rollen galten die jeweiligen .203-Parameter. Beide Arme sendeten das tatsächliche Custom-Body-Paar `reasoning_effort=low` und `clear_thinking=true`. Die Einzelwerte je physischem Aufruf stehen im Journal.

Der ST-Custom-Connector setzt beim Bypass einen Online-Status und fragt anschließend trotzdem den Statusendpunkt ab. Ein eigener **rein lokaler** Proxy antwortete auf beiden Ports mit genau einer Modell-ID. Er leitete ausschließlich Chat-Completions an den festen Upstream weiter. Ein gemeinsames Lock hielt beide Ports bis zum Ende des HTTP-Bodys besetzt. Für reguläres SSE prüfte der Beobachter alle Pakete sowie Finish-Grund und `[DONE]`. Die weitergereichten Texte und Datenpakete blieben unverändert. Das Journal reservierte jede der maximal 120 Generierungen vor dem Versand. Bei einem offenen oder fehlerhaften Abschluss sperrt es weitere Versuche. Der Proxy las den API-Schlüssel aus der geschützten Umgebung. Beim Export wurde jedes Artefakt auf die tatsächliche Zeichenfolge geprüft. Die ST-Prozesse und der Browser wurden ohne diesen Schlüssel gestartet.

Für den Start wurde der gespeicherte 11-Nachrichten-Präfix aus User06 bis einschließlich Gildenregistrierung kopiert. Alaric ist in beiden Armen ein Novice-Mage mit identischem Besitz, Ereignisstand und Gildenschalter in Ashbridge. Die erste Absicht bestätigt die vorhandene Mitgliedschaft. Der erste Boardaufbau erfolgt im zweiten Zug. Kein Testspieler-Modell war beteiligt. Der Test wählte nach demselben Verfahren das jeweilige Einsteigerangebot und verwendete anschließend die tatsächlich vorhandenen Personen, Aufträge und Orte. Die historische Torwache aus User06 I18 gehört nicht zum kopierten Präfix. [Originale und historische Abgrenzung](../testrun_10b/archiv/user-20261119-010838/README.md)

Die Verbindungsproben über beide echten ST-Server hatten ein kurzes Antwortziel und ein separates Limit von 512 Tokens. Beide lieferten englischen Text, die richtige Modell-ID und Finish-Grund `stop`. Der gepufferte Request meldete 22 Input- und 14 Outputtokens in 1,992 s, der gestreamte 22 und 12 in 1,074 s. Beide zählen zum Budget. Die Modelllistenabfragen wurden lokal beantwortet.

## Messdefinitionen

- Eine physische Anfrage beginnt unmittelbar vor dem Upstreamversand und endet nach vollständig gelesenem Body. Die Zeit umfasst Netz und Provider. Die beobachtete Parallelbelegung wird aus den Start-/End-Einträgen geprüft. Für jede Rolle sind Dauer, HTTP-Status, Finish-Grund und gemeldete Usage im Journal verfügbar.
- Der Start einer Spielabsicht ist der tatsächliche Sendeklick im Browser. Für den ersten vollständigen Prosasatz musste dessen DOM-Textbereich in den Chatviewport passen. Bei langen gepufferten Antworten kann ST sofort zum Ende scrollen. Dann bleibt die Erstprosamessung offen. Reasoning und HUD-Text wurden ausgeschlossen. Die Tabelle führt den separaten, nativ gespeicherten ST-Abschluss `gen_finished`. Der DOM-Beobachter erfasste den vollständigen Prosatext in allen 20 Fällen. In 14 Fällen änderte der Host das DOM nach dem Extractor nochmals, etwa um Boardelemente hinzuzufügen. Der letzte Änderungszeitpunkt ist hier eine Obergrenze für die vollständige Darstellung. Der genaue erste Frame mit dem letzten sichtbaren Satz lässt sich aus diesen Aufzeichnungen nicht rekonstruieren. Weltbuchung und bestätigt geschriebener Chat werden separat gemessen.
- B liefert direkte monotone Zeitpunkte für Weltcommit und Save/Read-back. Bei A stammt der Save-Zeitpunkt aus der synchron beobachteten bestehenden Abschlussmeldung, der Commit-Zeitpunkt aus deren Abstand `save_readback_ms`. Erste wieder sichere Eingabe ist der erste beobachtete Browserframe mit bestätigter Welt, „Gespeichert“, sichtbarem Senden und beendetem Generieren. Ein zusätzlicher Datei-Read-back und ein Chat-Reload prüfen vor jeder Folgeabsicht den gespeicherten Chat und sämtliche gebuchten Ereignisse.
- Formale Gültigkeit der strukturierten Antworten wird mit Parser, Revisionsmetadaten und Ausgangszustand des tatsächlichen Arms nachgeprüft. Es gibt zusätzlich den vollständigen Boardtest, Parserhinweise und die Ablehnungen der Firewall. Eine sichtbare, vollständig abgeschlossene Narration mit verarbeiteter Revision ist formal verwendbar. Ob die Aussagen in der Prosa fachlich stimmen, wird getrennt beurteilt.
- Input-, Output- und Cachetokens in den Haupttabellen kommen vom Provider. Cachetokens sind eine Teilmenge der Inputtokens. Lokal tokenisierter sichtbarer Antwortinhalt schließt verborgenes Reasoning aus. Für den Marktkatalog gibt es zusätzlich einen lokalen Gegenvergleich mit ausschließlich wieder eingesetztem Originaltext. Das ist eine berechnete Einsparung im realen Prompt. Eine separate natürliche Kontrollgenerierung für jeden Markttext erfolgte nicht.

## Zehn natürliche Spielzüge je Version

| Zug und Spielerabsicht | Requests A/B | A Input / Output / Cache | B Input / Output / Cache | Erster Satz A/B, s | ST-Narration beendet A/B, s | Sicher sendbar A/B, s | Repairs A/B |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 · Mitgliedschaft und Name | 3 / 3 | 37.567 / 365 / 0 | 37.457 / 448 / 0 | 17,31 / 6,25 | 17,17 / 18,17 | 26,84 / 29,93 | 0 / 0 |
| 2 · Novice-Tafel lesen | 4 / 5 | 43.074 / 1.696 / 0 | 46.295 / 2.146 / 0 | — / 93,00 | 196,47 / 111,73 | 205,95 / 119,12 | 0 / board ×1 |
| 3 · Einsteigerauftrag annehmen | 3 / 4 | 40.731 / 712 / 0 | 56.262 / 1.067 / 0 | 16,54 / 11,64 | 16,39 / 22,88 | 42,52 / 98,49 | 0 / extractor ×1 |
| 4 · Blaue Routennotiz anvertrauen | 3 / 4 | 40.284 / 759 / 0 | 55.449 / 860 / 0 | 14,61 / 7,03 | 14,44 / 23,93 | 45,15 / 86,56 | 0 / extractor ×1 |
| 5 · Stab prüfen und Ausgang suchen | 3 / 3 | 40.275 / 351 / 0 | 40.401 / 334 / 0 | 18,89 / 6,02 | 18,76 / 17,95 | 24,30 / 22,53 | 0 / 0 |
| 6 · Zusage erfragen | 4 / 3 | 54.732 / 637 / 0 | 40.113 / 242 / 0 | 12,25 / 6,59 | 11,88 / 18,88 | 44,43 / 28,05 | extractor ×1 / 0 |
| 7 · Zum Auftragsort reisen | 3 / 3 | 40.728 / 1.092 / 0 | 40.923 / 853 / 0 | 28,39 / 10,69 | 28,21 / 26,98 | 67,87 / 50,88 | 0 / 0 |
| 8 · Jagdgebiet absuchen | 3 / 3 | 38.246 / 848 / 0 | 38.416 / 397 / 0 | 30,27 / 9,82 | 30,09 / 21,34 | 51,87 / 26,14 | 0 / 0 |
| 9 · Spur verfolgen und annähern | 3 / 3 | 38.969 / 1.102 / 0 | 38.755 / 1.053 / 0 | 33,74 / 22,49 | 33,53 / 35,19 | 82,92 / 71,56 | 0 / 0 |
| 10 · Ausrüstung und Lage prüfen | 3 / 3 | 38.673 / 541 / 0 | 38.760 / 1.028 / 0 | 25,65 / 12,90 | 25,45 / 32,22 | 36,82 / 59,87 | 0 / 0 |

| Messgröße | A | B |
|---|---:|---:|
| Requests im Haupttest | 32 | 34 |
| Gemeldete Eingabetokens | 413.279 | 432.831 |
| Gemeldete Ausgabetokens | 8.103 | 8.428 |
| Gemeldete Cachetokens | 0 | 0 |
| Sicher sendbar, Summe in s (10 gemeinsam messbare Paare) | 628,68 | 593,15 |
| Sicher sendbar, Mittel in s (10 gemeinsam messbare Paare) | 62,87 | 59,31 |
| Sicher sendbar, Median in s (10 gemeinsam messbare Paare) | 44,79 | 55,38 |
| ST-Narration beendet, Summe in s (10 gemeinsam messbare Paare) | 392,39 | 329,28 |
| ST-Narration beendet, Mittel in s (10 gemeinsam messbare Paare) | 39,24 | 32,93 |
| ST-Narration beendet, Median in s (10 gemeinsam messbare Paare) | 22,11 | 23,41 |
| Erster Satz, Summe in s (9 gemeinsam messbare Paare) | 197,65 | 93,44 |
| Erster Satz, Mittel in s (9 gemeinsam messbare Paare) | 21,96 | 10,38 |
| Erster Satz, Median in s (9 gemeinsam messbare Paare) | 18,89 | 9,82 |
| Weitere physische planner-Versuche | 0 | 0 |
| Weitere physische board-Versuche | 0 | 1 |
| Weitere physische extractor-Versuche | 1 | 2 |
| Formal verwendbare Antworten der beurteilten Hauptrequests | 31/32 | 31/34 |

Alle 20 Züge erreichten eine verarbeitete Extractorrevision, bestätigtes Speichern und identische Welt-/Ereignisfingerprints vor und nach Reload innerhalb des jeweiligen Arms. Die vollständigen Zeitpunkte einschließlich physischem Extractorende, Weltmutation, Read-back, sichtbarem Prosablock und Sendefreigabe stehen in `summary.json` im Artefaktarchiv. Die Obergrenze der vollständig sichtbaren Prosa wird dort unter `lastRenderedChange` geführt. Die Parserquoten enthalten die zunächst zurückgewiesenen Antworten und die danach erfolgreichen Reparaturen.

**Vergleichbarkeit.** Die ersten acht Paare verfolgen entsprechende Absichten bei zunehmend unterschiedlichen erzählten Details. Bis dahin betrug die gesamte Wartezeit auf sichere Eingabe **508,94 s in A und 461,72 s in B**, im Mittel 63,62 und 57,71 s, im Median 44,79 und 40,41 s. Ab Zug 9 unterscheiden sich auch das verfolgte Jagdziel und der Ort wesentlich. Alle zehn Paare sind in der Haupttabelle enthalten. Ohne die gesamte Boardabsicht wären es 422,73 s in A und 474,03 s in B. Dieser zusätzliche Vergleich zeigt den Einfluss des Boards auf das Gesamtergebnis. Für die Hauptauswertung wurde kein Ausreißer entfernt.

**Sichtbarkeit.** B zeigte den ersten Satz in allen zehn Zügen noch während derselben physischen Narratoranfrage, **11,24–19,32 s vor deren Ende**, Median 12,49 s. In den neun ablesbaren A-Fällen wurde er erst 0,14–0,40 s nach der vollständigen Providerantwort sichtbar. Im gepufferten Boardzug ließ sich die Sichtbarkeit des ersten Satzes im Viewport nicht nachweisen. Bei den neun vollständig gepaarten Messungen war B jedes Mal früher lesbar. Die sichere Zugfreigabe enthält zusätzlich alle weiteren Requests, Weltbuchung und Read-back. Sie wurde im Gesamtlauf um 35,53 s früher erreicht, im Median pro Zug jedoch 10,59 s später.

**Verbrauch und Fehler.** Für die Hauptläufe meldete Featherless insgesamt 421.382 Tokens in A und 441.259 in B, jeweils mit null gemeldeten Cachetokens. Zwei zusätzliche physische Requests und unterschiedliche Inhalte machen B in dieser Stichprobe insgesamt **19.877 Tokens teurer nach Menge**. Der Preis in Geld wurde nicht gemessen. A korrigierte eine Personenangabe mit ungültigem null-Rollenfeld (Zug 6). B ersetzte eine für das Einstiegshabitat zu starke Jagdpopulation (Zug 2), eine fehlende Deltaliste (Zug 3) und ein verschachteltes statt flaches Objekt (Zug 4). Die erste Modellfassung dieser Fälle ging nicht als gültige Gesamtausgabe in den Zähler ein. Die Firewall wies in drei formal verwendbaren A-Antworten jeweils ein Delta zurück, einmal nach der Gildenregel (`guild_canon`) und zweimal als Hintergrundereignis (`ambient`). In den zehn B-Hauptzügen gab es keine solche Deltazurückweisung.

### Tatsächliche Hauptanfragen nach Modellrolle

| Rolle einschließlich Repairs | Anzahl A/B | Physische Gesamtdauer A/B, s | Providerinput A/B | Provideroutput A/B |
|---|---:|---:|---:|---:|
| Planner | 10 / 10 | 48,27 / 48,44 | 132.514 / 132.333 | 565 / 411 |
| Board | 1 / 2 | 170,55 / 83,14 | 2.643 / 5.803 | 1.230 / 1.570 |
| Narrator | 10 / 10 | 167,16 / 191,56 | 118.690 / 119.405 | 2.812 / 3.070 |
| Extractor | 11 / 12 | 232,23 / 259,49 | 159.432 / 175.290 | 3.496 / 3.377 |

Die Providerzeit der zehn B-Narrationen war insgesamt länger, obwohl Prosa früher erschien. Der Messwert „ST-Narration beendet“ beginnt mit dem Sendeklick und umfasst auch vorherige Modellrollen. Der Rollentabelle liegen ausschließlich die jeweiligen physischen Requests zugrunde.

Historisch benötigte User06 für Erstboard und Vollrepair zusammen 114,291 s. User05 benötigte beim Snapper wegen eines Widerspruchs zwischen Körperbau und Habitat eine zweite vollständige Tafel. Der heutige B-Fall zeigt erstmals in diesem Vergleich eine vom Modell erzeugte Einzelreparatur. Die historischen Zeiten stammen aus anderen Aufträgen und werden in keiner Differenz als Einsparung verrechnet. [User06-Originalauswertung](../testrun_10b/archiv/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md) · [User05 und weitere Board-Originale](AVERETH_203_B1_GILDENBOARD_EINZELSLOT_2026-11-19.md)

## Prosa und gespeicherte Welt

| Zug | Prüfung nach Reload und fachlicher Befund |
|---:|---|
| 1 | Beide Novice-Mitgliedschaften bleiben aktiv. Dieselbe ursprüngliche Clerk-Entität erhält in A den Namen Maren Holt, in B Hedda. Beide bleiben über ihre weiteren Gespräche hinweg unterscheidbar. |
| 2 | Beide Tagesboards enthalten fünf gültige Verträge. A bietet als Einstieg die große Eule an den Taubenschlägen an. In B ersetzt der Slotrepair einen für den Einstieg zu starken Eber durch die Natter am Mühlgraben. Die übrigen vier Angebote kommen aus dem ersten Board. |
| 3 | Beide gewählten Quests werden aktiv. A nennt die Auftraggeberin im Vertrag „Widow Maren“, die Annahmeprosa dagegen „Widow Cass“. B nennt Widow Hessa und bezahlt bei der Annahme keinen Lohn vorab. |
| 4 | Beide Arme buchen die blaue Routennotiz bei der jeweiligen Schreiberin und einen offenen Thread mit PC und Clerk. In A liegt die Notiz im H-Fach, in B in Heddas Blechdose. Der Testspieler hatte die Notiz im Freitext eingeführt. Der Startbesitz belegt keine zuvor inventarisierte blaue Notiz. |
| 5 | Das Prüfen des Stabs und die Orientierung im Raum belassen den PC im Gildenhaus. Es gibt keine zweite Übergabe. Die Zusage bleibt offen. |
| 6 | Beide Antworten nennen wieder die eigene Vereinbarung und den richtigen Aufbewahrungsort. Die Notiz bleibt beim Clerk. Bei A benötigt der Extractor einen zweiten Versuch. Dies ist ein Folgeturn innerhalb des kurzen Verlaufs. |
| 7 | A erreicht die alte Ulme bei den Taubenschlägen mit einer Eule im Szenenstand, B den Damm am unteren Mühlgraben mit einem Müllerjungen. In beiden Fällen bleibt der Clerk in der Gilde. A schmückt die Reise unter anderem mit einer vom Spieler nicht ausdrücklich gewählten Wegfrage an einen Fuhrmann aus. |
| 8 | A beobachtet weiter die Eule, B verfolgt Spuren im Schilf. Der gleiche Suchauftrag hatte unterschiedliche Ausgangssicht auf das Tier. Beide Aufträge sind offen. |
| 9 | Nach „into sight of the quarry“ plant A ausdrücklich `go` zu den Abraumhalden des **anderen, gelisteten** Steinbruchauftrags. Die Prosa folgt einer neuen Eberspur, der Eulenauftrag bleibt aktiv. B folgt der Spur der angenommenen Jagd und erreicht die Natter. „Quarry“ ist in der Testeingabe doppeldeutig. A zeigt trotzdem einen echten Ziel-/Ortskonflikt mit der laufenden Jagd. |
| 10 | Die freie Lage- und Ausrüstungsprüfung endet bei unterschiedlichen Tieren und Orten. Keiner der Hauptläufe schließt die Jagd ab. Die Skripte lösten im Hauptbogen keinen mechanischen Kampf, keine Fähigkeitsanwendung und keinen Lootgewinn aus. Für diese Situationen liegt damit kein natürlicher Hauptarmvergleich vor. |

Die Endzustände der voneinander abweichenden Geschichten sollen nicht identisch sein. Maßgeblich sind die zulässigen Folgen der jeweiligen Eingabe sowie ihr unveränderter Erhalt beim Laden. Die Namens- und Zielabweichungen wurden in A beobachtet. Ein einzelnes anderes Ergebnis in B belegt keine Behebung dieser Probleme durch den Patch. Ein vergleichbarer Präsenzverdacht tritt in B7 auf. Die Prosa trifft den Müllerjungen am Radschacht und führt Alaric dann an den letzten Gebäuden vorbei. Im Weltzustand und noch nach B8 bleibt der Junge in kurzer Distanz anwesend. Ein Mitgehen wird nicht erzählt, ein ausdrücklicher Abschied ebenfalls nicht. B9 trennt die Szene. Beide unabhängigen X2-Neuextraktionen desselben Textes setzen den Jungen ebenfalls auf SHORT. Das ist ein Befund über diese natürliche Passage. Der historische Gatekeeper-Widerspruch I18 betrifft eine andere Person und war schon auf .203 belegt.

## Einzelurteil zu den integrierten Änderungen

| Änderung | Ergebnis und Empfehlung |
|---|---|
| **S1** | Natürlicher Nachweis der früher lesbaren Prosa, bei zehn erfolgreichen SSE-Abschlüssen und Weltjobs in B. Für einen persönlichen Versuch mit Smooth Streaming aus empfehlen. Die Wartezeit auf die nächste sichere Eingabe hängt vom übrigen Zug ab. Für Stop und defekte Streams gelten die früheren isolierten Gegenfälle. |
| **B1** | Ein echter Slotrepair. B-Request 14 erhielt eine lokal ungültige Einstiegsjagd. Request 15 gab in 12,47 s genau ein Ersatzlisting zurück, 3.118 Input- und 222 Outputtokens, 191 sichtbare GLM-Tokens. Die Tafel wurde als Ganzes publiziert und blieb gespeichert. Gezielte Reparatur technisch beibehalten. Die Zeit eines hypothetischen Vollrepairs derselben abgelehnten B-Antwort wurde nicht gemessen. |
| **Marktkatalog** | In allen 22 realen B-Planner-/Extractorrequests spart das alleinige Ersetzen des ausführlichen Textes lokal genau 78 Inputtokens pro Anfrage, zusammen 1.716. Die versendeten Kurzprompts lassen sich mit der Provider-Usage unabhängig abgleichen. Beibehalten für die persönliche Erprobung. Freier Handel und Qualitätsrüstung waren keine natürlichen Schwerpunkte dieser zehn Züge. |
| **Board-Erstentwurf** | B verwendete die verkürzende Anweisung, schrieb aber bei **allen vier Freilandjagden beide Felder vollständig aus**. Der Erstrequest enthielt 2.685 statt 2.643 Inputtokens. Die erste Boardantwort meldete 1.348 statt 1.230 Outputtokens (sichtbar 1.257 statt 1.192). A brauchte für den Erstentwurf 170,55 s, B 70,67 s. Die unterschiedlichen Texte, zusätzliche Reparatur und variable Providerzeit lassen keinen Schluss auf einen Zeitgewinn durch die Anweisung zu. Als dauerhafte Tokenoptimierung vorerst zurückstellen. |
| **Save** | 20/20 Hauptzüge mit bestätigtem Read-back und identischem Zustand nach Reload. Die hostseitige Save-/Read-back-Dauer betrug im Median 167,5 ms in A und 142,0 ms in B. Die Chats unterscheiden sich. Der kontrollierte technische Vorversuch belegt die kleinere Lookup-Nutzlast. Patch beibehalten. |

## Natürliche Zusatzversuche auf getrennten Spielstandkopien

### Neues kompaktes Extractor-JSON

| Gespeicherte Szene | Modellinput normal / kompakt | Gemeldeter Output | Sichtbarer Output lokal | Physische Zeit, s | Repairs |
|---|---:|---:|---:|---:|---:|
| 3 | 14.831 / 14.863 | 351 / 385 | 223 / 268 | 19,15 / 21,33 | 0 / 0 |
| 4 | 14.587 / 14.619 | 290 / 205 | 169 / 121 | 63,13 / 12,46 | 0 / 0 |
| 7 | 15.395 / 15.427 | 422 / 414 | 349 / 357 | 37,11 / 24,79 | 0 / 0 |

Es wurden sechs neue Modellantworten aus denselben gespeicherten Narratorrevisionen erzeugt. Der Vergleich der tatsächlich versandten Nachrichten ergab als einzigen Unterschied den zusätzlichen X2-Ausgabesatz. Die sechs Antworten waren parsergültig, benötigten jeweils einen physischen Request und wurden nach Read-back und Reload erneut geprüft. In **keinem der drei Paare** waren die gespeicherten Welten vollständig gleich.

- **Questannahme.** Beide bewahren Route, Auftrag und Widow Hessa. Im Original endet das einzige gespeicherte Questdetail am Zeichenlimit mitten im zusätzlichen Hinweis. X2 erhält den Hinweis über warme Steine und stilles Wasser als zweites Detail. In beiden Armen wies die Firewall einen zusätzlichen Fakt über die vertragliche Auszahlung ab. Es erfolgte keine Auszahlung.
- **Abmachung.** Beide buchen die Notiz, Hedda als Verwahrerin und einen offenen Thread mit Alaric. Im Normalvertrag erwähnt die Modellantwort das Behalten über Ladenschluss. Der gespeicherte Thread endet nach 200 Zeichen bei „even pa“. Der kompakte Thread bewahrt die Ausweiskontrolle, lässt die ausdrückliche Ladenschlusszusage aus. Auch die längere Fassung bewahrte damit nur einen Teil der Bedingungen wörtlich.
- **Reise.** Beide buchen das richtige Ziel und den Müllerjungen in kurzer Distanz. Der Normalvertrag ergibt 15 Minuten Reisezeit, der kompakte Vertrag schlägt 20 Minuten vor und die Engine übernimmt sie. Der erzählte Weg enthält keine präzise Dauer. Die Zustände nach Reload stehen deshalb auf Spielminute 585 und 590. Die Unterschiede betreffen auch die gespeicherten Spuren und offenen Hinweise.

In Summe sank der gemeldete Output von **1.063 auf 1.004 Tokens**. Der tatsächliche Prompt wuchs in jedem der drei Fälle um 32 Tokens. Damit verbrauchte X2 insgesamt **37 Input- und Outputtokens mehr**. Lokal sichtbarer Output war mit 741 gegenüber 746 Tokens fast gleich. Die physischen Antwortzeiten addierten sich zu 119,39 gegenüber 58,57 s. Allein der Normalrequest zur Notiz dauerte 63,13 s. Die Empfehlung lautet, **X2 als Standard ausgeschaltet zu lassen**. Die natürliche Stichprobe rechtfertigt weder eine Zusage gleicher Weltfolgen noch eine allgemeine Latenzprognose.

### Card before Lore

| Gespeicherte Szene | Narratorinput original / Karte zuerst | Gemeldeter Output | Gemeldete Cachetokens | Physische Zeit, s | Erster lesbarer Satz ab Auslösung, s |
|---|---:|---:|---:|---:|---:|
| 1 | 12.251 / 12.251 | 305 / 261 | 0 / 0 | 22,23 / 15,97 | 9,86 / 4,57 |
| 4 | 12.049 / 12.049 | 332 / 243 | 0 / 0 | 17,47 / 15,06 | 4,40 / 5,42 |
| U06-I21 | 12.255 / 12.255 | 321 / 323 | 0 / 0 | 18,67 / 61,78 | 6,59 / 10,25 |

Alle drei Paare hatten denselben gespeicherten Ausgangszustand. In den sechs finalen Narrator-Requestarrays waren Rollen, Texte, aktivierte Lore und Verlauf nach Rücktausch von Karte und Lore identisch. Auch die gemeldeten Promptlängen waren paarweise gleich. Jede neue Narration wurde regulär extrahiert und nach Reload geprüft, insgesamt zwölf physische Calls. Der Provider meldete in allen sechs Narratorantworten null Cachetokens. Die physischen Narratorzeiten betrugen in Summe 58,37 s im Original und 92,83 s mit Karte zuerst. Beim ersten Satz lag Karte zuerst in einem der drei Paare vorn.

- Bei der Registrierung benennen beide Antworten eine zuvor unbenannte Schreiberin. Die Variante mit Karte zuerst ergänzt laufende Gebühren und eine Aussage über heute noch nicht neu ausgehängte Angebote. Der kopierte Spielstand belegt diese Auskünfte nicht.
- In der bereits etablierten Hedda-Szene stimmen Person, Ort und freiwillige Verwahrung der Notiz überein. Das Original erfindet ein beschriftetes Fach und die spätere Umbettung in eine Schublade. Die Alternative legt die Notiz unter ein Hauptbuch und verspricht mehrtägige Verwahrung. Der Ausgangszustand legte keinen Behälter fest.
- **Kampf-Gegenprobe.** Zwei Kopien des archivierten User06-Spielstands unmittelbar vor I21 verwendeten auf B die tatsächlich angeklickte HUD-Fähigkeit **Arcane Wave** im Bereich ENGAGED. Die gebuchten Spieler-/Mechanikereignisse sind vollständig identisch. Nach Reload hat Alaric in beiden Fällen 13 HP und 44 MP, die beiden Goblin Lookouts haben 23 und 36 HP. Beide Erzählungen beschreiben zwei getroffene, weiter lebende Gegner und deren Gegenangriffe. Die späteren narrativen Weltinformationen unterscheiden sich. Diese Probe ergänzt die in den zwanzig Hauptzügen ausgebliebene Kampfsituation.

**Originalpreset beibehalten.** Die geänderte Reihenfolge erreichte weder einen gemeldeten Cachetreffer noch einen beständigen Latenzvorteil. In den untersuchten Antworten gingen die gemeinsame Ortskulisse und die beteiligten Personen erkennbar in die Prosa ein. Die drei Situationen decken nur einen Teil der Lore ab.

## Technische Übergabe

| Kontrolle | Verifizierter Wert |
|---|---|
| Physische Featherless-Generierungen | 86 von höchstens 120, davon 2 Vorprüfungen, 66 Haupttest, 6 X2 und 12 Preset einschließlich Folgeextractoren |
| Gleichzeitige Upstreamgenerierungen | maximal 1 über beide Instanzen, 86 Starts und 86 reguläre Abschlüsse, 0 offene oder fehlgeschlagene Transporte |
| Modell und Usage | 86/86 bestätigten die Modell-ID und meldeten Input, Output und Cache. Insgesamt 1.092.207 Input-, 21.912 Output- und 0 Cachetokens |
| Lokale Nachprüfung | Alle 86 finalen Nachrichtenarrays per SHA-256 dem Upstreamjournal zugeordnet. In allen 86 Fällen stimmte die lokale Tokenzahl des gesamten Prompts mit dem gemeldeten Input überein |
| Lokale Modellliste | Vier lokale Abfragen, jeweils genau ein Modell. Keine externe Modellliste angefordert |
| Fehlversuche | Vier fachlich zurückgewiesene Hauptantworten, alle durch die bestehenden Enginepfade behandelt. Jede physische Generierung einschließlich Repairs ging ins Budget ein |
| Isolierung | Beide Testhosts und der gemeinsame Loopback-Transport beendet. Die Zusatzläufe ließen die gespeicherte Hauptkampagne bytegleich |
| Technischer Testbranch | `experiment/203-natural-featherless-ab` bei `6adf43b94b420111094bf906a34d56ea4ca5617f`, ausschließlich zwölf Test-, Auswertungs- und Anleitungsdateien |

Die bereinigte Übergabe umfasst die beiden Hauptchats, sämtliche zwanzig Zugaufzeichnungen, zwölf gespeicherte Zusatzrevisionen, die finalen Promptarrays, das physische Journal mit Antworttexten und Usage sowie die Browsermessungen, ST-Logs, Parser- und Tokenprüfungen. Pro Zug enthalten die Daten die konkrete gesendete Absicht, Rollen, Phasendauern, Welt- und Ereignisfingerprints sowie den nachgeladenen Weltstand. Das Archiv umfasst 54 Dateien mit SHA-256 `e9370ea4373ed6dc0e3a1c6dd3e1518c2d7196de5dcee4b10e602aa737c6866f` für das gesamte gzip-Archiv. [Maschinenlesbare Kennzahlen](performance_natural_ab_203/kennzahlen.json) · [Bereinigte Laufdaten](performance_natural_ab_203/laufdaten.tar.gz)

Zur Reproduktion der Auswertung das Archiv in ein neues Verzeichnis entpacken und dort mit den gepinnten Engine-Checkouts die Schritte unter „Offline-Auswertung“ ausführen. Die Offline-Prüfung wurde aus dem ausgelieferten Archiv erneut durchgeführt. Parserurteile, Nachrichtenarrays, Tokenmessung und aggregierte Kennzahlen waren bytegleich reproduzierbar. Für einen separat autorisierten neuen natürlichen Test beschreibt dieselbe Anleitung den Start beider ST-Hosts, die globale Sperre und die Budgetprüfung. Ein neuer Lauf kann andere Modelltexte und Zeiten ergeben. [Testcode und Reproduktionsanleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/6adf43b94b420111094bf906a34d56ea4ca5617f/avereth-engine/tools/st_live/natural_ab)

**Reichweite.** A wurde in jedem Hauptpaar wie vorgegeben vor B gespielt. Es gibt pro Arm einen stochastischen Spielbogen. Providerlast, Reihenfolge, divergierende Antworten und Repairs begrenzen die Zuordnung zu einzelnen Patches. Ein realer Abbruch wurde nicht erzwungen. Die Fehlerpfade bleiben durch die früheren isolierten Tests gedeckt. Die vollständige Node-/Replay-/Failsoft-Abnahme wurde bei unverändert gepinnten Laufzeitdateien nicht wiederholt. Die eigenen Transport-Unitprüfungen und die Offline-Nachprüfung aller natürlichen Antworten wurden ausgeführt. Im Hauptspiel konnten Kampf, Loot, Questabgabe und ein NPC-Wiedersehen außerhalb des kurzen Verlaufs nicht beobachtet werden. User06 I18 und die Fairness seines späteren Charaktertods bedürfen weiterhin ihrer eigenen fachlichen Prüfung. Der nächste Entscheidungsschritt ist der unabhängige Gegenreview dieses Laufs.
