# Wer darf Alaric zum nächsten Ort bringen?

Ausgangspunkt ist User11 T9. Vor der Erzählung kennt Alaric Brens Verletzung, den umgekippten Karren und das Cottage seiner Familie, eine Viertelmeile weiter auf demselben Weg. „lets go ill help you out for the part“ trägt eine kurze gemeinsame Wegstrecke. Einen Eintritt, eine unbegrenzte Eskorte oder eine spätere Rückkehr hat der Spieler damit nicht zugesagt. Diese Grenze lässt sich beurteilen, bevor man weiß, wie der Narrator die Szene beendet. [Original und Gegenreview](../testrun_10b/user-20261124-014928-208/CODEX_GEGENREVIEW.md) · [Vorab festgelegte Auswertung](user11_trust_208/VERSUCHSPROTOKOLL.md)

## Welche Frage jede Variante beantwortet

| Variante | Wann kann eine freiwillige Ankunft gebucht werden? | Was entscheidet weiterhin die Engine? |
|---|---|---|
| A, aktuelle .208 | Die vorhandene Reise- bzw. Erkundungserlaubnis und die bestätigte Ankunft greifen. Daneben gibt es einen gesonderten Nachweis für eine äußere Verlagerung. | Zugbudget, Weg, Zugang, Gefahren, echter Szenenwechsel und Zulässigkeit der danach gemeldeten Ereignisse. |
| B, begrenztes Vertrauen | Bei einem Plannerergebnis ohne passende Buchung oder abgewiesene Aktion kann die aktuelle Spielereingabe einen ungefährlichen lokalen Weg tragen. Das Ziel muss zum ausdrücklich gewählten Ort oder zum vorherigen Angebot einer anwesenden Begleitung passen. Die aktuelle Erzählung muss die gemeinsame oder persönliche Ankunft auch zeigen. | Diese Ausnahme betrifft eine einzelne gemeldete Ankunft. Die regulären Prüfungen für den aufgelösten Ort, Personen, Wissen, Quests, Besitz und Zahlungszustimmung gelten auf dem erreichten Zustand weiter. |
| C, erzählte Ankunft | Eine konkret erzählte Ankunft des PC am gemeldeten endgültigen Szenenort kann bei fehlendem GO ausreichen. Es braucht keine vorher positiv nachgewiesene Reiseabsicht. Ein ausdrücklich abgelehnter oder aufgeschobener Weg, Konflikte mit gebuchten Aktionen und harte Zugangsgrenzen sperren weiterhin. | Buchen und Zurückweisen erfolgen über denselben World-Pfad. Eine dort wirklich anwesende Person oder ein dort berichtetes Angebot ist weiterhin einzeln zu prüfen. |

Dasselbe Regelwerk kann einen Satz zu Recht zulassen und seinen nächsten Satz zu Recht zurückweisen. Brens Dank an der Tür ist ein Versprechen **von Bren**. Alarics Rückkehr, eine Bezahlung und die Erfüllung eines Auftrags sind damit jeweils noch offen.

### Was seit der Ortsforschung bereits vorliegt

Die 26 dokumentierten Ablehnungen stammen aus zwei älteren Batches. Zu ihnen gehören ungültige Dungeonwege, fehlende Zustimmung, missverstandene Bewegung und Wiederholungen desselben Konflikts. Die Zahl taugt weder als Zahl verlorener Reisen noch als Prognose eingesparter Requests. Schon A akzeptiert heute die damalige Grotto-Ankunft .186 Mage #64. Die für .189 entworfene klare Rückmeldung ist inzwischen implementiert: `display.js` zeigt `NOT ARRIVED`, `context.js` bildet den letzten bestätigten Ort und die verfehlten Ankünfte ab, `host.js` ergänzt die projizierte Historie. Das genügt für den Standort. Bei einer berechtigten, abgewiesenen Hilfe gehen aber weiterhin die Ereignisse am Ziel verloren. [Grundanalyse](ORT_REISE_UMGEBUNG_ARCHITEKTUR_GRUNDANALYSE_2026-11-14.md) · [Gegenprüfung](ORT_REISE_UMGEBUNG_GPT_GEGENREVIEW_2026-11-14.md) · [Ortsbuch und Bewegungsnachweis](FACHPLAN_A_ORTSBUCH_BEWEGUNGSPLAN_2026-11-14.md) · [Bewegungsarten und Begleitung](FACHPLAN_C_BEWEGUNGSARTEN_ERZAEHLKONTINUITAET_2026-11-14.md) · [.208-Host](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/src/host.js) · [.208-Spieleranzeige](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/src/display.js)

## Was der identische Fall entscheidet

Auf dem unveränderten Chatpräfix reproduziert A in allen elf User11-Erzählzügen den gespeicherten Weltzustand und die Ablehnungen. Beim Cottage bleibt A auf der Straße. Eine abgewiesene Ankunft führt zu sechs Szenenablehnungen. B und C speichern auf dem gleichen Text das Cottage, die Begegnung und die dort ausgesprochene Zusage. Zwei mit Originalantworten fortgesetzte Züge erreichen bei allen drei Armen die Dungeonabschnitte S1 und S2. Die zusätzlichen Personen und das Versprechen bleiben nur bei B und C erhalten. Bei der späteren Namensnennung der Tochter und dem getrennten Zwischenhalt bestehen weiterhin Zuordnungsprobleme. Eine liberalere Ankunft löst diese anderen Probleme nicht. [Originalvergleich und weitere historische Fälle](user11_trust_208/HISTORISCHER_VERGLEICH.md)

Die folgende unabhängige Gegenprobe verwendet den User11-Präfix vor Brens Antwort. Bei den Kontrollen erhält der echte Host ein leeres Plannerergebnis. Der produktive Extractorparser prüft jeweils den absichtlich vorgegebenen Bericht, danach entscheidet die World-Firewall. Die Variationen sind konstruierte Belastungsproben. Ihre Häufigkeit ist kein Schätzer für Modellverhalten. [13 Fälle mit Wortlaut und allen Ergebnissen](user11_trust_208/gegenproben.json) · [Ausführbares Skript](user11_trust_208/gegenproben.mjs)

| Eingabe oder erzählte Situation | A | B | C | Fachliches Urteil |
|---|---|---|---|---|
| Echter Bren-Fall oder ausdrücklich gewählter gemeinsamer Weg zum Cottage | bleibt | erreicht | erreicht | Beide gelockerten Arme bewahren eine gedeckte Ankunft. |
| „Where is the cottage?“ oder nur Hilfe beim Aufrichten, trotzdem erzählt das Modell die Reise | bleibt | bleibt | erreicht | C überschreibt zwei Entscheidungen, die der Spieler sich vorbehalten hat. |
| Spieler wählt die Holzbrücke, Narrator bringt ihn zum Cottage | bleibt | bleibt | erreicht | Die Reise als solche ist gewollt, ihr Ziel wurde ausgetauscht. |
| Ausdrückliches Nein, „ohne mich“, Aufschub, Begleitung ausdrücklich nur bis zum Tor | bleibt | bleibt | bleibt | Der erklärte Vorbehalt hat Bestand. |
| Nur Bren gelangt ans Haus, nur Fernsicht, Bericht im Dialog statt gegenwärtiger Ankunft | bleibt | bleibt | bleibt | Ein Extractorbericht allein bewegt Alaric in keinem dieser vier Fälle. |

Zwei kontrollierte Rotbefunde betrafen ausgesprochene Verweigerung und das Subjekt „he“. In einer früheren Versuchsfassung konnte „He reached the stone cottage“ als Bewegung Alarics zählen, obwohl Bren vorausging und Alaric beim Karren blieb. Der wiederholte Vergleich oben verwendet nur die abschließend geprüften Varianten. Strengere Subjektbindung kostet mögliche Treffer bei Prosa, die den PC ausschließlich mit einem Pronomen bezeichnet. Auch Sprachumfang, lange gemischte Eingaben, mehrere mögliche Begleiter und das Auflösen von Ortsnamen sind reale Grenzen beider textbasierten Ansätze.

## Nachweis am tatsächlichen Branch

| Fester Stand | Selbst ausgeführte Node-Suite | Replay gegen das bestehende .208-Soll | Eingriff |
|---|---:|---|---|
| [A · cb1eb944](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cb1eb944a041b26be9210199d780be9ff740f74d) | Originalnachspiel aller elf User11-Welten und des Boards | Referenz für die folgenden Arme | Unveränderter Spielstand |
| [B · 84a97c44](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/84a97c447a2736241eebda215d29f0dd9045a2cc) | 3.476/3.476 | 2.235 verglichen, 0 neue Abweichungen | Ein neuer lokaler Ankunftsnachweis, Weitergabe der aktiven vorausgehenden Antwort über Runtime und Turn, Prüfung im vorhandenen World-/Firewall-Pfad. Originalpräfix als Regression. |
| [C · dc729070](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/dc7290708b8d18dc1cb00320f6d0d4bb264164d4) | 3.498/3.498 | 2.235 verglichen, 0 neue Abweichungen | Ankunftsevidenz und Widerspruch im Spielertext, engere topologische Grenzen für den Sonderfall, derselbe vorhandene World-/Firewall-Pfad. |

Beide Varianten haben A als einzigen Elterncommit. In beiden Replays stimmten auch die 1.192 ausdrücklich akzeptierten Unterschiede zur alten Langzeitbaseline mit ihrem vorhandenen Fingerprint überein. Für die elf User11-Antworten liegt zusätzlich eine unabhängige Ausgabe mit Ausgangschat, Code-SHAs, vollständigem Weltfingerprint und Ablehnungen je Revision vor. [Vergleichsdaten](user11_trust_208/user11_crossover.json) · [Reproduktionsskript](user11_trust_208/replay_crossover.mjs)

B benötigt Textauswertung in zwei Zügen. Mehrdeutigkeiten bleiben häufig beim strengen Ausgangsverhalten. C benötigt weniger Einladungsregeln, muss aber aus Erzählung und Meldung einen tatsächlich vollzogenen Ortswechsel erkennen. Beide behalten die vorhandenen Parser und Savepfade und verursachen durch die geänderte Regel selbst keinen Modellaufruf. Der persönliche Bren-Zug hatte bereits mit A genau einen Extractorversuch. Ein hier eingesparter Repair, eine Tokenersparnis oder eine verkürzte Providerlatenz lässt sich daraus nicht ableiten.

### Welche Freiheit der natürliche Test misst

Alle drei Planner enthalten bereits die Regeln 7b und 7d. Eine aktuelle Zustimmung zur konkreten Führung einer anwesenden Person kann ein GO ergeben. Auch ein gemeinsamer Aufbruch ist dort vorgesehen. Fehlt ein gebuchter Reiseschritt, lautet der gemeinsame Narrator-Kontext weiterhin „TRAVEL THIS TURN — none chosen: he stays at …“. Beide Experimente greifen **nach** der Prosa in die Verarbeitung einer gemeldeten Ankunft ein. Bei gleichem bisherigen Weltzustand erhält der Narrator somit denselben Auftrag. Sobald sich eine Buchung unterscheidet, können erst die Folgezüge andere Orte, Personen und Erinnerungen im Prompt sehen.

Der natürliche Vergleich misst, wie die Regeln mit tatsächlich entstehenden Spannungen unter diesem bestehenden Narratorauftrag umgehen. Er beantwortet keine Häufigkeitsfrage für ein zusätzlich umgeschriebenes, liberaleres Narrator-Preset. Auch ein Lauf ohne ausgelöste Ausnahme kann zwei gute Geschichten liefern und lässt die beiden Regeln in dieser Hinsicht empirisch ununterscheidbar. [Plannerregeln](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/src/v4/planner.js#L67) · [Tatsächlicher Narrator-Kontext](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cb1eb944a041b26be9210199d780be9ff740f74d/avereth-engine/src/context.js#L1054)
