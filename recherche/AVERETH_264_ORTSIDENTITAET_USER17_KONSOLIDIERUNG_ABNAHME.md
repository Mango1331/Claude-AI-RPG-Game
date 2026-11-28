# Avereth .264 · Ortsidentität und Zugang zu den Old Crown Catacombs

**Ergebnis vom 28.11.2026.** Die abgebrochene User17-Kette erreicht auf dem Kandidaten den ersten regulären Abschnitt. Eine natürliche Gegenprobe trennt drei verschiedene Spielerentscheidungen sauber: zum bekannten Eingang reisen, auf der Außenseite lauschen und anschließend eintreten. Die Gegner des ersten Abschnitts erscheinen erst beim tatsächlichen Eintritt. Der Kandidat geht zum unabhängigen GPT-Diffreview.

## Ausgangsbefund und Nachweisarten

Auf dem unveränderten .263-Produkt wurden die aus dem redigierten ST-Log zugeordneten 28 Modellantworten erneut gegen die Originalnachrichten verarbeitet. Alle 20 verarbeitbaren Eingabe-/Antwortrecords stimmen nach Normalisierung der Diagnostik mit den gespeicherten Events überein. Die neun Narrationen lassen sich im Chat wiederfinden. Chat, Eventexport und komprimiertes wie dekomprimiertes redigiertes ST-Log bestehen die archivierten Hashprüfungen. Für das Feedback bestätigt das Quellmanifest nur den Inhalt, nicht seine ursprüngliche Bytefolge. [User17-Originale und GPT-Review](../testrun_10b/user-20261128-051828-263/README.md) · [Claude-Gegenproben und Einschränkungen](AVERETH_USER17_263_CLAUDE_GEGENREVIEW_ORTSIDENTITAET.md)

| User17 | .263 mit archivierten Antworten | .264 aus demselben Kampagnenanfang |
|---|---|---|
| T8 · Reise aus Alderwatch | PULSE-Halt auf der Straße, Restziel Catacombs | Derselbe Außenhalt und derselbe gespeicherte Zielanker |
| T9 · Weitergehen | Der erste X meldet das Ziel erreicht, beschreibt aber Kapelle und Treppenabsatz als neue Orte. Im Repair wird die Antwort auf Nein geändert. Die falsche Kapelle gelangt in den Save. | Der **erste Original-X** identifiziert das etablierte Gate über den Zugangsbezug. Ort bleibt der Dungeonroot, Ossler ist anwesend. Die zweite Originalantwort wird hier nicht mehr gebraucht. |
| T10 · Treppe hinunter | Die generierte Ortsstruktur entfernt die Reise weiter vom Dungeon. Die Narration endet noch vor der geschlossenen Tür. | Nach korrigiertem T9 existiert der Parent der alten X-Antwort nicht mehr. Ein **kontrollierter Repair** für dieselbe Originalprosa meldet den Halt am Zugang. Kein Innenabschnitt, kein Gegner und keine weitere Mindestzeit. |
| T11 · Eintritt | Der Spieler erreicht keinen mechanisch spielbaren ersten Abschnitt. | Eintritt in `loc.old_crown_catacombs.l1_s1`, Parent ist der Dungeonroot. Eigenständige Gegner-IDs des ersten Slots sind im Save und in der aktuellen Szene vorhanden. |

Die zweite Spalte ist eine treue Reproduktion. Die dritte prüft die durchgängige Engine mit aufgezeichneten Antworten und dem ausdrücklich ausgewiesenen Ersatz bei M20. Erst die separat archivierten Browserläufe prüfen das Verhalten eines heute tatsächlich antwortenden Modells. Ein Einzeltest ab dem fehlerhaften Treppenabsatz würde diese drei Aussagen vermischen.

## Wer über Ziel, Weg und Abschnitt entscheidet

1. Die gewählte GO-Handlung bestimmt den möglichen Endpunkt. Der Planner erhält bei unterbrochener Reise das gespeicherte Ziel und unterscheidet den tatsächlich gewählten Aufbruch von einer örtlichen Bewegung. Am etablierten Gate kann die ausdrücklich auf dieser Seite endende Bewegung den bestehenden lokalen Standpunktpfad verwenden. Eine Abzweigung bleibt möglich.
2. Narrator und Extractor erhalten die tatsächliche Ziel-ID, den bekannten Zugang und bei einschlägiger Eintrittsentscheidung die erste Abschnittsvorschau bzw. die Zutrittsbedingungen. Der Narrator kann den Weg benennen. Die Vorschau erzeugt alleine weder Ankunft noch Begegnung. Die Zielantwort `arrived` und das konkrete `arrive` behalten ihre unterschiedlichen Aufgaben.
3. `newPlaceScope`/`reportPlaceIdentity` lösen typisierte Ortsfelder anhand des Vokabulars auf. Eine eindeutige Kurzreferenz kann die vollständige Erklärung desselben Berichts wiederverwenden. Bei abweichendem Parent oder konkurrierenden Zielen entfällt die Abkürzung. Personen, Gegenstände und freie Texte behalten ihre eigenen Namensräume.
4. Bei User17 verbindet der **Bericht selbst** den beschriebenen Außenort über dessen Zugang und eine Passage mit dem bekannten Dungeon. Nur bei eindeutiger Ziel- und Zugangskette können Außenbeschreibung und Zugangspodest denselben Root meinen. `reportedEndpoints`, `reportsEndpoint` und `sectionReport` werden mit der tatsächlichen Bewegung ausgewertet. Eine Zielquittung ohne passende Ankunft löst, soweit eine gebuchte Handlung offen ist, den begrenzten Repair aus. Zwei GO-Quittungen können dieselbe einzelne Ankunft nicht zweimal verbrauchen.
5. World bleibt Buchungsautorität. `scene.approaching` kann über den lokalen Halt hinweg bestehen. Ohne gewählte neue Reise bucht World daraus nichts. Bei einer verweigerten Ankunft werden vorbereitete Knoten und Links zurückgenommen, die Diagnose bleibt erhalten. Ein neuer Abschnitt gehört zum Abschnittssystem. Ein erzählter `passage`-Parent innerhalb eines echten Living Dungeons eröffnet keinen Parallelraum.

Damit ist die Kernursache aus beiden Reviews bestätigt. Claudes Variante B belegte die Machbarkeit, ihre Gleichsetzung einer einzelnen Außenstätte im selben Realm mit dem Dungeon wäre zu weit gegangen. P2 bindet hier selbst bei anfänglichem Nein den strukturell belegten Zugang. P4b meldet bei einer anderen Stätte und falschem Ja weiterhin die fehlende Zielankunft. Nach einem wahrheitsgemäßen Nein kann die andere Stätte als tatsächlicher Halt mit eigenem Parent gebucht werden. Beide Varianten sind mit offenem und geschlossenem PULSE geprüft. Auch ein Ja darf keine fehlende Standortbeziehung ersetzen. Das bewusste Restrisiko sind unvollständige Modellberichte ohne brauchbaren Zugangsbezug.

## Zutritt und Reisezeit

Von der Straße und vom Gate zählen dieselben mitreisenden Figuren zur Kapazitätsprüfung. Registrierung, offene Gebühren, Durchgangshindernisse, Siegel und Abschnittsfolge gelten weiterhin. Die Zugangsbedingungen gelangen bereits in die Vorbereitung der Narration. Von außen kann Alaric ein geschlossenes oder gebührenpflichtiges Gate erreichen. Er bezahlt dabei nichts und betritt es nicht. Ein erlaubter direkter Eintritt führt über die reguläre Vorschau, den Slot und seine individuellen Gegner. Ein bloß reservierter Abschnitt materialisiert keinen frei erfundenen Raum. Gewöhnliche Gebäude und Ruinen behalten ihre generativen Wege.

Die **135 Minuten** in T8–T10 bestanden aus drei verschiedenen Buchungen (60 + 60 + 15). Die externe Reiseuntergrenze am ersten Halt, die behauptete Dauer der Restreise und die lokale Treppe hatten unterschiedliche Ursachen. .264 erhebt beim Erreichen desselben fortgesetzten Ziels keine erneute pauschale Mindestfahrzeit. Der lokale Halt vor der Tür verbraucht keinen Reiseabschnitt. Explizit berichtete, tatsächlich getrennte Reisezeit und zugehörige MP bleiben erhalten. Im kontrollierten Original sind es deshalb **60 + 60 + 0 = 120 Minuten** bis zur Tür. Die Schätzung „noch etwa 20 Minuten“ und der X-Bericht von 60 Minuten für T9 bleiben widersprüchlich. Eine verbindliche Streckendauer für generierte Wege ist aus diesen Belegen nicht ableitbar. Auf ein neues Entfernungsmodell wurde verzichtet. Der tatsächliche Eintritt in T11 wird separat verarbeitet.

## Abnahmematrix

| Fälle des Auftrags | Gegenprobe und tatsächlicher Nachweis |
|---|---|
| 1–4 · Original, bekannte Reise, PULSE, abweichendes Torbild | Die User17-Kette startet bei Charaktererstellung, kontrolliert Straße, Zielanker, Root, Ossler und ersten Abschnitt. Die Modellarme Route und Crossing prüfen unmittelbare Ankunft und Fortsetzung vom verifizierten Außenhalt. |
| 5–7 · andere Stätte, P2, P4b | Isolierte Varianten der ersten Originalantwort, jeweils beide PULSE-Zustände. Das echte Außenziel bleibt erhalten, auch als eigenständiger Halt nach korrigierter Zielquittung. Keine fremde Person wird durch einen Ortsalias ersetzt. |
| 8 · Pilot01 T61, Cooper Lane, Woolpack | Bestehende Ortsbuch-, Szenen- und Negativtests laufen unverändert. Namensähnlichkeit, gleicher Realm und bloße Erwähnung genügen weiterhin nicht. |
| 9–14 · Gate, Eintritt, Gebühren und Begegnung | Vor der Tür keine Section. Direkter Eintritt vom Original-Straßenpräfix mit bzw. ohne Registrierung, verfügbare Plätze und fällige Gebühr. Ablehnung hinterlässt weder Innenknoten noch Zahlung. Erlaubter Eintritt materialisiert Slotgegner. Living-Dungeon-Passagen bleiben enginegeführt. |
| 15–18 · unbekannte Orte, mehrere Ziele, Zielwechsel, Rückkehr | Der neue Zugangspfad verlangt einen bereits bekannten Dungeon. Bestehende Discovery-, Ortsbuch-, Abschnitts-, Sperr- und Rückwegtests bleiben aktiv. Gegenprobe mit zwei GO-Zielen hebt die automatische Bindung auf. Die reparierte User16-Kette prüft getrennte Abschnittsidentitäten und spätere Gildenrückkehr. |
| 19–21 · Party, mehrteilige Reise, Revision | Bestehende Reisezeit-/Partytests und isolierter Party-Hostlauf. Tests prüfen die tatsächlichen Teilnehmer statt einer pauschalen Gruppe. Mehr-GO, Reload und erneute Verarbeitung von M18, gespeicherter Schlussfold sowie Edit/Swipe/Regenerate im Host. Die natürlichen User17-Ableitungen waren Sololäufe. |

Die zugehörigen Produkttests sind unter anderem `pilot01_k6_k8_scene_identity.test.js`, `location190_place_book.test.js`, `location190_movement.test.js`, `location190_sections.test.js`, `patch8.test.js`, `travel_mana219.test.js`, `travel_time220.test.js` und `tests/replay/location264.test.js`.

Die User16-Kette hatte auf .263 bereits wegen einer inzwischen überflüssigen archivierten M28-Reparatur abgebrochen. Sie prüft nun, welche Anfrage tatsächlich verbraucht wird und ob Gegner und Abschnitt der nächsten Entscheidung entsprechen. Beide Ketten sind mit komprimierten, aus den archivierten Nachrichten abgeleiteten Fixtures in der normalen Node-Suite ausführbar. [Produktdiff mit Fixtures, Assertions und Quellenverweis](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/928172b9bbaae3d133bad7097100dc2127334b8e...05880e68bada1479471557ec5bd1f8aa343b7acd)

## Bedienung

Ein aktueller Party-Button sitzt am aktiven Eingabebereich. Alte HUD-Einträge zeigen weiterhin den damaligen Zustand. Die Bedienelemente im Panel und am Composer verwenden dieselbe kontrastreiche Gestaltung. „Bekannte Wege“ erhält die Abstände der übrigen aufklappbaren Bereiche. Der Status für Weltabgleich und Speichern steht oberhalb der Auswahl. Die isolierte Party-Browserprobe öffnet das native Panel und kontrolliert auch CSS, Reihenfolge und die Zahl der tatsächlich aktiven Knöpfe. Hinweise für künftige native Panels stehen im [CSS-Leitfaden](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/05880e68bada1479471557ec5bd1f8aa343b7acd/avereth-engine/docs/HUD_STYLE.md).

## Natürliche Modellabnahme und Grenzen

Getrennte SillyTavern-1.19-Instanzen, z-ai/glm-5.3-flash über OpenRouter/Wafer, sequenzielle echte Requests. Route startete mit den 15 Originalnachrichten bis M14. Die vier Straßenläufe verwendeten dieselben 17 Originalnachrichten bis M16. Nachrichten und gefalteter Weltzustand wurden vor dem ersten bezahlten Request gegen die Elternquelle geprüft. [Modellantworten, Startzustände, Events und Laufzeiten](../testrun_10b/openrouter-20261128-ortsidentitaet-264/README.md)

| Lauf / Produktcheckpoint | Züge | Tatsächlich gebuchter Verlauf | USD |
|---|---:|---|---:|
| Route · bc43d234 | 2 | Eine Reise aus der Gilde mit PULSE-Spur erreicht das Gate. Die nächste Eingabe führt zum regulären ersten Abschnitt. | 0,003946392 |
| Ford · 1389f418 | 3 | Geschlossene PULSE-Reise erreicht das Gate. Der Wunsch, vor der Tür zu lauschen, führt verfrüht nach Abschnitt 1, der explizite Eintritt dadurch nach Abschnitt 2. | 0,005680150 |
| Crossing · 8715bde9 | 3 | Dieselben Eingaben vom selben Außenhalt führen zum Gate, beim Lauschen weiter zum Gate und erst beim Eintritt nach Abschnitt 1 mit zwei Gegnern. Keine zusätzliche Bestätigung. | 0,005706188 |
| Shrine · 8715bde9 | 2 | Der Fluss ist ein lokaler Standpunkt. Der Narrator erzählt anschließend die Rückkehr zum Eingang, aber der Planner hat keinen GO gebucht. Die Engine verhindert die unautorisierte Ankunft. | 0,003640984 |
| Bank · a083311d | 5 | Nach präzisiertem Planner-Kontext führen die gleichen ersten beiden Eingaben über den lokalen Flusshalt zum richtigen Gate. Danach verlässt Alaric den Dungeonzugang tatsächlich und erreicht einen separaten Wegschrein. Auf „In the morning I walk back …“ erzählt das Modell den Morgen am Schrein, P liefert keine Aktion. Das erneute „I walk back along the road to the catacombs“ erreicht den bekannten Eingang. | 0,009121560 |

**45 abgeschlossene und zugeordnete Requests, 15 P / 15 N / 15 X, keine X-Reparatur in diesen Läufen.** 603.673 Input- und 16.910 Outputtokens. Der Provider berechnete insgesamt **0,028095274 USD** bei einer Freigabe von 0,50 USD. Die gemessene Wartezeit für Extraktion und Validierung nach der Erzählung lag bei 1,537–5,572 s, Median 3,846 s. Die getrennte Speicherbestätigung bei 75–447 ms, Median 140 ms. Diese Stichprobe auf einer anderen Route und mit anderen Laufbedingungen ergibt keinen belastbaren Geschwindigkeitsfaktor gegenüber dem persönlichen Test. Im Original kostete allein die zweite X-Antwort in T9 rund 39 Sekunden. Die Kettenprobe zeigt, warum gerade diese Anfrage nun entfallen kann.

P2 und P4b wurden als absichtlich falsche X-Antworten offline erzwungen. Die natürlichen Läufe belegen das tatsächlich erreichte Gate, den separaten Ort und die reguläre erste Begegnung. Sie belegen keine generelle Fehlerfreiheit des Planners. Der zeitlich eingeleitete Aufbruch am Schrein ist ein beobachteter, mit einer zusätzlichen Eingabe fortsetzbarer Restfall. Es gibt dafür weder eine Sonderformulierung im Produkt noch eine automatische Wiederaufnahme. Die natürliche Abnahme umfasste keine persönliche Party- oder Wirtschaftsabnahme.

## Replays, Schutzgrenzen und Hostabnahme

* Node 24.22.1, vollständige Suite **3.667 bestanden**, keine ausgelassen. Beide Ortsketten sind Teil von `npm test`. Die P2-Variante durchläuft die Runtime vom originalen Präfix mit falschem anfänglichem Nein und prüft Root, Ossler und das Ausbleiben der ersten Begegnung.
* Historisch **2.235** Records. Gegenüber der historischen .126-Referenz 1.392 präzise erklärte Fingerprints, null unerklärte. Gegenüber .263 **eine** Änderung: b17-rogue#177 erhält im gespeicherten GO-Text die Zugangsbedingung für den ersten Glimmerdeep-Abschnitt. Alle übrigen Werte dieses Records blieben gleich.
* Modern **298** Präfixfälle mit Prüfung tatsächlicher Events, Zustand, Ressourcen, Fold und JSON-Reload. Gegenüber der geprüften .263-Referenz ändern sich **50** Fälle, davon **42 nur im Prompt**. Letzteres gilt auch für den bereits klassifizierten Fehler vale-242#24, dessen Klassifikation bestehen bleibt. Die neuen Ziel-/Zugangshinweise erscheinen nur im einschlägigen Kontext. Die alte Referenz und die älteren Freigabelisten bleiben separat reproduzierbar.
* Fünf gespeicherte GO-Quittungen präzisieren die Schwelle zum ersten Abschnitt (aa#42/#44, flint#43, slate#43, vale#29). Bei aa#43 und slate#44 entfallen nach dem bereits zurückgelegten Anmarsch 15 Minuten erneute Mindestzeit mitsamt ihren abgeleiteten Ressourcen-/Zeitwerten. In quill#86 hatte X zwei Schritte als erreicht gemeldet, aber nur eine Ankunft geliefert. Die zusätzliche begrenzte Reparatur ist fachlich gewollt. Der mechanische Weltzustand stimmt mit .263 überein. Eine physische Reparaturantwort ist im Archiv nicht vorhanden. Insgesamt haben sechs moderne Präfixe einen unvollständigen physischen Antwortpfad; 30 historisch vorhandene Folgeantworten bleiben ungenutzt. Diese Grenzen werden separat vom erfolgreichen Sollvergleich gezählt.
* Isolierte SillyTavern-1.19-Smokes **scene221 33/33** und **party217 48/48**. Geprüft sind echte UI-Bedienung, Zustand nach Speicherung, historische Nachrichten, lokale Partyansicht und die neuen Darstellungsprüfungen. Bei der ersten Einrichtung der Szene fehlten die beiden externen User16-Kettenfixtures. Der erfolgreiche Lauf verwendet die tatsächlich rekonstruierte Kette und ihre Gildenrückkehr. Kein persönliches ST-Profil war beteiligt.

## Produkt, Installation und Übergabe

Ausgangspunkt des Entwicklungsbranches war `928172b9bbaae3d133bad7097100dc2127334b8e`. Der ursprüngliche Dokumentationsstand war `30a6d6dffa7c727bf95e7d839a57f5349a56d76c`. Reguläre Pushes und Remote-Gegenprüfung nach jeder Sicherung:

| Commit | Inhalt |
|---|---|
| `bc43d23431f98bb1a3195aef6746b01a204f78e4` | Zielbindung, Zugangspfad, Bedingungen und Abschnitt |
| `1389f4182f9a6d208e93d607f3b32eb937e4bd78` | Host-/Kettenabnahme und aktives Party-HUD |
| `8715bde90f840b3d619a413b02b4aa1a3fb27748` | Zugang als örtlicher Standpunkt nach natürlicher Ford-Gegenprobe |
| `a083311d8142baa4e6451af8f47f8fd08cc4db71` | Unterbrochene Reise im Planner-Kontext und unabhängige Zwischenhaltprobe |
| `134879eeb7348ca2425850012741bd22c883b0c1` | Begründete, geerbte Replay-Erwartungen |
| `05880e68bada1479471557ec5bd1f8aa343b7acd` | Anschließende vollständige P2-Gegenprobe in der User17-Kette. Endstand .264 |

Für die persönliche Installation den gesamten Ordner `avereth-engine` aus diesem Endcommit über den vorhandenen Avereth-Extensionordner derselben SillyTavern-Installation kopieren. Insbesondere `src/`, `manifest.json` und `style.css` müssen zusammenpassen. SillyTavern neu laden und die angezeigte Version `4.3.0-c.6.6.264` prüfen. Zusätzliche ST-Assets: **keine**. Card, Preset, Lorebook, Regex und der separat installierte Narrator Contract benötigen kein Update. Die Änderungen für Planner, Narrator und Extractor werden durch die Extension zur Laufzeit gebaut. Bestehende Kampagnen lassen sich laden. Bereits früher gebuchte Phantomorte werden nicht rückwirkend umgeschrieben. Für einen direkten Vergleich ist ein Präfix vor der Fehlbuchung geeignet.

**Empfehlung:** GO für den unabhängigen Produkt-Diffreview. Der belegte User17-Blocker ist im Originalpfad und unter natürlichen Modellbedingungen behoben. Den zeitlich bedingten Rückweg und die Dauer unterbrochener Reisen beim nächsten persönlichen Test beobachten. Wirtschaft und E-Rank-Balance sind eigenständige, weiter zurückgestellte Themen. [Vollständiger Produktvergleich .263 → .264](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/928172b9bbaae3d133bad7097100dc2127334b8e...05880e68bada1479471557ec5bd1f8aa343b7acd)
