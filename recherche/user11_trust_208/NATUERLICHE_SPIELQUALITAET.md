# Natürliche Spielqualität bei begrenztem und erweitertem Narratorvertrauen

## Bewertungsmethode

Für jeden Turn wurden zuerst nur der Wortlaut der Eingabe und der sichtbare Chat bis unmittelbar davor gelesen. Die daraus abgeleitete Reichweite der Zustimmung wurde festgehalten, bevor die neue Narration, der Extractorbericht oder die Welt nach Reload für die Bewertung geöffnet wurden. Die Begründung des steuernden Testspielers dient anschließend als Kontrollquelle. Ein plausibel erzähltes Ziel kann die anfängliche Zustimmung nicht nachträglich ausweiten.

Eine **richtige Ankunft** entspricht der erklärten Absicht oder einem plausiblen, begrenzten Zwischenschritt. Für eine **unerbetene Reise** braucht es eine erfolgte Erzählung oder Buchung, die über diese Absicht hinausgeht. Eine Einladung, ein beschriebener Ort und eine ausdrücklich künftige Verabredung zählen jeweils gesondert. An ein erzähltes, mechanisch unbestätigtes Ziel anknüpfende NPC-Fakten werden bis in den verfügbaren Folgeturn verfolgt. Wenn der Spieler oder der Extractor keine Ankunft meldet, kann dieser Turn den Unterschied zwischen den beiden Firewall-Regeln nur eingeschränkt prüfen.

## B · Begrenztes Vertrauen

| Zug | Vorab erwartete Handlung | Beobachtung und gespeicherter Zustand |
|---:|---|---|
| 1 | Zum Tor; nur nach Arbeit fragen. | Zwei Wachen nennen Gilde, Docks und Marta. Das Tor ist eigener gespeicherter Ort; Alaric nimmt keinen der Vorschläge an. |
| 2 | Beiseitetreten, vor dem Hineingehen nach Weg und Marta fragen. | Beide Wachen antworten, Alaric bleibt nach Reload am Tor. Wegauskunft, Arbeitsgewohnheiten und Witwenstatus haben keinen eigenen Extractor-Eintrag; die Episode speichert die Spielerfrage. |
| 3 | Zur ausdrücklich gewählten Weary Ox, an der Tür nach Marta fragen. | Die Wegbeschreibung führt zum richtigen Gasthaus. Marta antwortet, ist mit dem Bediensteten dort anwesend und erhält eine Begegnungserinnerung. |
| 4 | Im Gasthaus nach einer kurzen Arbeit fragen. | Marta erläutert einen Botengang; draußen kippt Ottys Stand. Eine Lage wird gespeichert. Alaric bleibt mit Marta und dem Bediensteten am selben Ort. |
| 5 | Heringsfass zu Bren bringen, dort Rücknachricht erfragen. | Fischstand, Bren und „good and whole“ sind gespeichert. Das am Tischbein abgesetzte Fass bleibt im PC-Inventar. Bren hält Dill nur hin, X überträgt ihn bereits an Alaric. |
| 6 | Zu Marta zurückkehren, Dill und Antwort übergeben. | Dasselbe Gasthaus und Marta; Dill ist weg, 50→52 cp. Das Fass ist weiter beim PC. Der schon zuvor „Hal“ genannte Bedienstete erhält neben seiner unbenannten Erst-ID eine neue Identität. |
| 7 | Nachmittagsarbeit vertagen, Hal nur nach Otty fragen. | Hal bleibt beim Fässerzählen. Marta bietet Bretter an, Alaric bleibt im Gasthaus. Die kaputte Tischplatte ist als offene Aufgabe gespeichert. |
| 8 | Mit Martas Brettern zu Otty, ihre Wünsche anhören. | Der Rinnenwinkel ist nach Reload neuer Ort mit Otty. Ihre Reparaturidee wird zum Thread. Die Prosa legt die Bretter ab; „a couple of boards“ verbleibt als eine Einheit im PC-Inventar. |
| 9 | Ottys Tisch vor Ort reparieren und Standfestigkeit prüfen. | Reparatur gelingt, Otty erkennt zwei Schulden an. Als formales Angebot scheitert ihre unverbindliche Naturalvergütung. Keine Zahlung und kein Ortswechsel. |
| 10 | Bei Otty nach der Umgebung fragen; Kleinholz ablehnen. | Vier Orte werden als Berichte gespeichert. Otty fragt nach seinem Ziel, ohne Alaric dorthin zu schicken. Welt bleibt am Rinnenwinkel. |
| 11 | Über Westtor und Flussweg zu den Wasserwiesen laufen. | Unter der Dornenhecke blockieren zwei Männer den Weg und verlangen einen Kupfer Zoll oder Tausch. Dieser Zwischenhalt ist gebucht; die Wiesen werden noch nicht als erreicht ausgegeben. |
| 12 | Einen Kupfer anbieten, bei Durchlass zur toten Weide und dort Reiher beobachten. | Die Männer verzichten auf Zahlung. Nach Reload bleibt es bei 52 cp; Weide und zwei Reiher gespeichert, keine Verfolgung durch die Männer. |
| 13 | Einen jagenden Reiher beobachten, dann zur Mühle und von der Anhöhe schauen. | Mühle gebucht; die zusätzlich gemeldete Anhöhe innerhalb der Mühle scheitert an `passage`. Die Aussicht bleibt erzählbar. Keine Freigabe einer neuen Fernroute. |
| 14 | Im Mühlenhof nach gemeinsamer Rückfahrt und Arbeit fragen. | Der Müller bietet das zweimannstarke Verladen mit Neffe Tam an. Noch keine Abfahrt; Müller, Tam und der Hofhund entstehen am richtigen Ort. |
| 15 | Erst am Hof rasten, anschließend mit Tam nach Ashbridge verladen und begleiten. | Erst Hund/Rast, dann nach der Ladeglocke mit dem Wagen zu den bekannten Zöllnern. Planner bucht Warten/Arbeit. B verweigert die Ankunft in den Wiesen sowie zwei Personen und ein Angebot. Nach Reload bleibt die Gruppe an der Mühle. |
| 16 | Bei Tam am Zoll stehen, nur den Müller nach der Forderung fragen. | Die Geschichte bleibt mit den Männern am Fluss. Auf der gespeicherten Mühle erzeugt X zwei neue Zollmann-IDs neben den alten vom Flussweg. Die abgewiesene Ankunft aus T15 hat damit sichtbare Folgefehler. |
| 17 | Zoll für die Gruppe anbieten, dann mit Tam bis zum Tor. | Der Müller besteht darauf selbst zu zahlen. Die Straße wird frei, die Gruppe erreicht Ashbridge, Alaric behält seine 52 cp. Das neue GO bringt Prosa und kanonischen Ort wieder zusammen. |
| 18 | Mit Müller und Tam zum Marktspeicher, dort nach dem Lagerplatz fragen. | Alle drei kommen beim neuen Lagerhalter Garl an. Frühere Gebühren werden nicht erneut eingezogen. |
| 19 | Nur abladen und sich bedanken. | Die Säcke werden am Speicher verteilt, der Müller erhält den Namen Sorrel. Ein späteres Angebot von Brot und Bier sowie Tams abgebrochener Satz werden als offene Fäden bewahrt. |
| 20 | Zur Weary Ox zurück, Marta über Otty und die Reiher berichten. | Die bekannte Wirtin ist am richtigen Ort und erinnert sich an die Bretter. Sie bezeichnet Otty mit „him“, obwohl sie im Originalverlauf als Frau auftrat. Fass und verbaute Bretter sind weiterhin im PC-Inventar. |

## C · Narrator-first

| Zug | Vorab erwartete Handlung | Beobachtung und gespeicherter Zustand |
|---:|---|---|
| 1 | Zum Tor; nur nach Arbeit fragen. | Der Torwächter nennt Bauern oder Gilde und fragt nach der Wahl. Gebucht ist Ashbridge ohne eigene Tor-ID. Die kanonische Gildengebühr bleibt gegen fremde Fakten geschützt. |
| 2 | Einen Landwirt erfragen, ausdrücklich am Tor warten. | Die Wache nennt Halloran, Brandts und Selby. Drei Ortsberichte und der mögliche Arbeitsbedarf werden verarbeitet; Alaric steht weiter mit derselben Wache in Ashbridge. |
| 3 | Zu Hallorans Hoftor gehen, nach Maren rufen. | Maren und Dann sind auf dem Hof gespeichert. Vier Kupfer und Essen werden für Feldarbeit angeboten. Erst der nächste Zug entscheidet über das Angebot. |
| 4 | Zum Karren gehen und Dann gratis helfen, keinen ganzen Tag zusagen. | Der Karren wird vor Ort aufgerichtet. Drohender Regen führt zu einer neuen Bitte, ohne Alaric auf einen weiteren Arbeitstag festzulegen. Hof und beide Männer bleiben erhalten. |
| 5 | Dann zu den Garben begleiten und beim Einholen helfen. | Prosa führt ans Feldende, Maren und Dann lernen Alarics Namen. Das lokale GO scheitert an `invalid local habitat scope`; X meldet keine Ankunft, der Hof bleibt als grober Ort passend. |
| 6 | Wagen in den Unterstand begleiten, dort nach Tam fragen. | Unter dem Dach erklärt Dann Tams Erkrankung. Hof bleibt der Ort, Pell und ein Thread zu Tam kommen hinzu. Kein Besuch beim Erkrankten. |
| 7 | Vor einer Reise nach Einwilligung und Nachricht der Mutter fragen. | Dann lädt zum Haus ein und wartet an der Scheunentür. Kein Aufbruch und keine Zahlung. Zwei nicht aufgelöste Faktensubjekte werden abgewiesen. |
| 8 | Dann ausdrücklich ins Haus und ans Feuer folgen. | Nach gebuchtem GO erreicht die Familie das Halloran-Haus; Dann, Marta und Tam sind präsent. Die Mutter formuliert die Nachricht für Mother Wren. Die Gebühr bleibt Verhandlungssache. |
| 9 | Botengang für heute zusagen; unmittelbar Brot essen und Wegbeschreibung hören. | Die Wegauskunft gelingt. Planner deutet „I will carry … today“ als sofortiges GO. Nach einer Stunde stoppt die Erzählung bei vier Räubern, der Engpass wird gebucht. Ziel grundsätzlich gewählt, Aufbruchszeit vorweggenommen; keine isolierte Wirkung von C. |
| 10 | Provision hergeben, freies Geleit erbitten. | Ein Räuber isst vom Bündel. Die Bande verlangt weiterhin Silber, Alaric bleibt am Engpass. Die Engine bucht keinen selbstgewählten weiteren Lösegeldbetrag. |
| 11 | Silber übergeben, dann bei freiem Weg zur Ostbrücke. | Vor Übergabe warnt ein Pfiff vor einem Karren; die Räuber ziehen ab. Der Weg ist frei, Ashbridge erreicht, der Bestand bleibt bei 50 cp. Die Prosa liefert eine glaubwürdige Unterbrechung der Zahlung. |
| 12 | Zu Wrens grüner Tür, nach der Heilerin fragen. | Haus, Nachbar und Hund werden gespeichert. Wren ist an diesem Tag bei Nan Coll; ihr Aufenthaltsort wird als Nachricht festgehalten, Alaric folgt ihr noch nicht. |
| 13 | Beim Nachbarn den sichersten Übergang zum Armenhaus erfragen. | Auskunft und Frist bis zur Dunkelheit werden festgehalten; Ort, Nachbar und Hund bleiben dieselben. |
| 14 | Zur Fish-Gate-Fähre laufen; Odd nur nach dem Fahrpreis fragen. | Odd nennt einen Silber, legt aber trotz gelöster Leine noch nicht ab. Ort und das Angebot sind gebucht, Alaric hat noch nicht bezahlt. |
| 15 | Einen Silber zahlen, ans andere Ufer fahren; vor dem Absteigen nach dem Armenhaus fragen. | 50→40 cp, das andere Ufer ist erreicht. Odd weist auf das Haus und bereitet die Rückfahrt vor; das Gebäude wird durch die Auskunft noch nicht betreten. |
| 16 | Zum Armenhaus, Mother Wren an der Tür sprechen. | Die Heilerin erscheint am genannten Haus, hört Alaric und bietet ein Gespräch draußen an. Nan Coll ist nicht als aktive Begleiterin eingebucht. |
| 17 | Unter dem Dach bleiben, Marta und Tams Nachricht übermitteln. | Wren sagt zu, stellt aber die Gebührenfrage vor der Abreise. Die Szene bleibt am Armenhaus; Symptome und Gespräch werden erfasst. |
| 18 | Rückweg anbieten, vor Abreise nach Betreuung für Nan fragen. | Wren klärt Gebühr und Betreuung, gibt ihre Tasche heraus und fragt vor dem Aufbruch noch nach einer Zusage. Der Ort bleibt stabil, kein Geld wechselt. |
| 19 | Wrens Tasche tragen und zum Hof zurückkehren. | Beide gelangen gemeinsam zum überfluteten Wegstück. Wren lässt Alaric zwischen Waten, Erkundung und dem Umweg über die Mühle wählen. Die bestehende Heiltasche bleibt bei Wren, der PC führt ein zweites Objekt „the bag“. Der Hof ist noch nicht erreicht. |
| 20 | Mit Wren ausdrücklich den Umweg über die Mühle zum Hof nehmen. | Ziel erreicht, das unterwegs gesehene grüne Licht führt zu keinem Umweg. Marta erhält am Hof eine zweite ID. Eine gespeicherte Erinnerung behauptet, auch Nan Coll sei mitgebracht worden; Prosa und Anwesenheit belegen das Gegenteil. |
| 21 | Wren hineinbegleiten, Tasche übergeben, am Bett Platz machen. | Haus und Begleitung sind gebucht. Wren beginnt mit Tam zu arbeiten, der nach Reload in der Szenenpräsenz fehlt. Die zweite Tasche bleibt beim PC, das gefaltete Inventar bildet die erzählte Rückgabe nicht ab. |

## Ergebnis der beiden Spielbögen

**20 bestätigte Züge bei B und 21 bei C.** B kommt über die Torwache zu Marta, erledigt den Heringsbotengang, repariert Ottys Tisch, besucht die Reiher und bringt eine Getreideladung mit Tam in die Stadt zurück. Am Abend empfängt ihn dieselbe Wirtin wieder. C beginnt mit einer Frage nach Feldarbeit, richtet kostenlos einen Karren auf und hilft bei der Ernte. Daraus entsteht die Bitte einer besorgten Familie. Alaric findet die Heilerin und bringt sie bis ans Krankenbett zurück. Die Behandlung kann beginnen; eine Heilung wurde bis Laufende weder beobachtet noch verlangt. Wegen der unterschiedlichen Geschichten gibt es keine gepaarte natürliche Erfolgschance oder Qualitätsrate für B gegen C. [B · Originale und Quellen](../../testrun_10b/openrouter-20261124-trust-b-208/SOURCE_MANIFEST.md) · [C · Originale und Quellen](../../testrun_10b/openrouter-20261124-trust-c-208/SOURCE_MANIFEST.md)

| Prüfgröße | B-Spielbogen | C-Spielbogen |
|---|---:|---:|
| Abgeschlossene Züge mit geprüftem Save und Reload | 20 | 21 |
| Züge mit mindestens einer gemeldeten Ankunft | 12 | 12 |
| Einzelne `arrive`-Deltas | 13 | 12 |
| Gebuchte `scene.moved` | 11 | 12 |
| Abgewiesene `arrive`-Deltas | 2 · T13 `passage`, T15 `no_go` | 0 |
| Am selben Originalpräfix unterschiedliche gefaltete Zustände zwischen A, B, C | 0/20 | 0/21 |

**Der Unterschied der Rohquoten stammt aus den verschiedenen Geschichten.** Im Offlinevergleich jeder tatsächlich ausgewählten Extraktion auf demselben Präfix waren Zustandsfingerprint und Ablehnungen für alle drei Regeln gleich. Keine der 25 natürlich gemeldeten Ankünfte liefert einen ausschließlich von B oder C bewirkten Ortswechsel. Diese Evidenz entscheidet auch keine natürliche Häufigkeit unerbetener Reisen. [Crossover B](natuerlich-B.json.gz) · [Crossover C](natuerlich-C.json.gz)

**Der schärfste Vergleich ist das Paar B15/B16.** Im Vorzug bietet der Müller für den Heimweg genau die Zweierarbeit am Handkarren an. Alaric nimmt an und wartet zunächst im Schatten. Erst nach der Ladeglocke fährt die Gruppe los. T15 verweigern alle drei Regeln diesen plausiblen Zwischenstopp. Bei C greift bereits der Aufschubschutz auf „wait here“, obwohl die erzählte Wartebedingung inzwischen erfüllt wurde. In T16 entstehen zwei weitere Zöllner am kanonisch falschen Ort (`npc.npctoll_thin` und `npc.npctoll_big` zusätzlich zu `npc.npctoll_thin_man` und `npc.npctoll_big_man`). Die erneute explizite Reise in T17 stellt die Ortsübereinstimmung wieder her, die vier NPC-IDs bleiben bestehen. Wer Entscheidungsfreiheit schützen will, muss „heute hier bleiben“ und „hier warten, bis die vereinbarte Begleitung beginnt“ unterscheiden. Der Gegenfall C9 zeigt die andere Richtung: Auftrag und Ziel waren gewählt, der Spieler wollte im gegenwärtigen Schritt noch die Wegbeschreibung hören. Der Planner gab den Aufbruch bereits frei; die Prosa erzählte den Weg bis zu einem Überfall. Die Aktivierung einer anderen Ankunftsregel allein korrigiert keinen der beiden Fälle. [C · Prüfung eines Aufschubs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/dc7290708b8d18dc1cb00320f6d0d4bb264164d4/avereth-engine/src/v4/narration_evidence.js#L184)

**Gute Ortskontinuität ist kein Nachweis für korrektes Eigentum oder Wissen.** B behält nach dem abgelieferten Heringsfass und dem Einbau von Martas Brettern beide Gegenstände im Inventar. In C19 entsteht neben Wrens vorhandener Tasche `obj.t40.mother_wrens_leather_satchel` ein zweites Objekt `obj.t42.the_bag`; nach der erzählten Rückgabe in C21 trägt der Spieler dieses weiter. In C20 wird Mutter Marta am Hof als neue `npc.marta` zusätzlich zu `npc.marta_halloran` erzeugt. Die Erinnerung nennt die in der Prosa am Armenhaus zurückgebliebene Nan Coll als Teil der Rückreise. In C21 enthält die gefaltete Anwesenheit am Krankenbett PC, Wren und die neue Marta, aber keinen Tam. Das sind konkrete, auch auf A erhältliche Fehler in Referenzauflösung, Extraktion oder Szenenprojektion. Die Fähigkeit zum glaubwürdigen freien Erzählen ist gleichzeitig sichtbar: Abgelehnte Nachmittagsarbeit, bloß erfragte Orte und die Entscheidung für den längeren sicheren Rückweg funktionieren ohne vorgeschriebene Befehlsfolge.

**Folgerung für die Entscheidung.** Für einen künftigen Bewegungsversuch ist zeitlich begrenzte Zustimmung zur konkreten Begleitung besonders aussagekräftig. T15 sollte gemeinsam mit einem ausdrücklichen „heute bleibe ich hier“ geprüft werden. Die natürlichen Läufe allein tragen weder einen Wechsel zu C als Standard noch die Aussage, B verhindere solche Verluste bereits zuverlässig. Erweiterungen der Ortsfreigabe lösen die beobachteten Eigentums- und Erinnerungsfehler nicht.
