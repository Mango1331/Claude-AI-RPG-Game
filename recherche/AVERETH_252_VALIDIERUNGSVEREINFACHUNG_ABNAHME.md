# Validierungsvereinfachung V1 · Umsetzung und Abnahmestand

**Aktueller Stand:** Technischer Zwischenstand .252 auf dem Entwicklungsbranch. Die Anwesenheitsproben bestehen. Etappe B ist vor dem Entfernen von `expected.go` angehalten. Die unten dokumentierte Gegenprobe zur offenen Ortssuche erfordert eine Fachentscheidung. Es liegt keine Gesamtabnahme vor.

## Erster Stopp vor der Implementierung

**Stand 27. November 2026.** Der geprüfte Remote-HEAD des Entwicklungsbranches war `4933a5f005a86a381a922981d3d7377e8ba84b5c`, Build `4.3.0-c.6.6.251`. Der Auftrag auf `main` wurde auf `baeaf5af1289c3e9031eff987875a227317580e0` gelesen. Die Vorprüfung ergab eine bisher unberücksichtigte mechanische Wirkung der in Etappe D vorgesehenen Streichung von X-`party coordinate`. Die Stoppregel greift vor Änderungen am Produkt. [Auftrag §§ 1, 4](AVERETH_252_CODEX_AUFTRAG_VALIDIERUNGSVEREINFACHUNG.md) · [Fachgrundlage P7](AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md)

## Befund und Gegenprobe

Alaric bittet Ossen um Schutz. Ohne delegierte taktische Befugnis speichert der Spielerzug die Bitte als `member.request`. Ossens Antwort kann die Bitte ablehnen oder eine verbindliche Priorität setzen. Der Extractor liefert diese Entscheidung über `coordinate` an `applyWorld` und `partyDecision`. Die strukturierte `party_decision` beantwortet Einladungen. Die nativen Organisationsaktionen schließen eine offene taktische Bitte ebenfalls nicht ab. `lineTarget` verwendet die gebuchte Priorität für die Gegnerwahl. Eine Wache hat darüber hinaus eine unmittelbare Ressourcenwirkung. [World](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L1697-L1705) · [Anfrage und NPC-Entscheidung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/party.js#L360-L386) · [Native Aktionen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/party_actions.js) · [Kampfziel](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/party_line.js#L54-L64) · [Rast](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/commands.js#L1018-L1026)

| Fall | .251 mit NPC-Antwortdelta | Gleicher Zug ohne dieses Delta |
|---|---|---|
| Originaler User14-Spielertext M17, eingespeiste Schutzzusage Ossens | Schutzpriorität für Alaric | Bitte bleibt offen, Priorität fehlt |
| „Keep the skeletons off me.“ mit gleicher Zusage | Schutzpriorität für Alaric | Bitte bleibt offen, Priorität fehlt |
| Ausweichen und Schutzbitte im Kampf | PC-Aktion gebucht, Zusage wirksam | PC-Aktion gebucht, Bitte bleibt offen |
| Ossen übernimmt Wache, anschließend 60 Minuten Rast | Wache gesetzt, 80 → 80 HP | Wache fehlt, 80 → 90 HP |

**Reproduktion.** Auf dem unveränderten Produktcommit im Verzeichnis `avereth-engine` mit dem archivierten Chat `node tools/replay/party218.mjs <Pfad-zu-chat.jsonl>` ausführen. Alle 26 Prüfungen bestanden. In einer temporären Kopie vor dem Aufruf von `runExtraction` ausschließlich Deltas mit `type === 'party' && act === 'coordinate'` aus der eingespeisten Antwort entfernen. Drei der 26 Prüfungen schlagen dann fehl. Der gefaltete Zustand weist in allen drei Fällen `request.kind === 'protect'` und keine Priorität aus. Diese Gegenprobe simuliert die fachliche Wirkung des Ignorierens. Sie ist kein Lauf auf einem .252-Build. [Prüfprogramm](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/tools/replay/party218.mjs#L73-L104) · [Originalchat](../testrun_10b/user-20261126-010332-215/originals/chat.jsonl)

**Zusatzprobe zur Rast.** Vom Zustand `joined` desselben Prüflaufs zweimal starten. Für „Please stand watch.“ den Partybefehl `coordinate` mit Priorität `watch` einspeisen. Auf die identische Erzählung `Ossen says, "I will stand watch."` einmal das entsprechende NPC-Delta mit wörtlichem Beleg und einmal ein leeres Delta-Array liefern. Im gefalteten Zustand je 20 HP von Ossens vollem Vorrat abziehen und über `playerTurnV4` eine Stunde Rast buchen. Beide Uhren laufen 60 Minuten weiter. Nur die zweite Variante regeneriert 10 HP. Die Verletzung, der Wachdialog und die Modellantworten sind synthetisch.

## Entscheidung und Abnahmestand

Empfohlen ist eine eng begrenzte Ausnahme in P7 für die NPC-Antwort auf eine offene taktische Bitte. Dazu lässt sich der vorhandene Pfad für übereinstimmende Person, Priorität und Ziel erhalten, einschließlich der Möglichkeit zur Ablehnung. Diese Entscheidung betrifft auch die Wachübernahme. Eine direkte Ausführung allein auf die Spielerbitte würde die bisherige Befugnis des Spielers ändern. Über die Ausnahme entscheidet der Nutzer.

Produktdiff und Zeilenbilanz gegenüber `4933a5f0` sind leer. Es gab keinen Produktcommit, neuen Build oder Installationsbedarf. Die übrigen Messungen aus Etappe 0, die Implementierung A–D, T1-Gesamtsuite, kategorisiertes T3-Replay, isolierte ST-Abnahme und der Vorher-/Nachher-Vergleich der Requestgrößen sind **nicht ausgeführt**. Es gab keine Provideranfragen.

## Entscheidung nach dem Gegenreview

Der Nutzer hat P7 nach Prüfung durch GPT und Claude für dieses Paket vollständig zurückgestellt. Eigenständige taktische Entscheidungen bleiben auch ohne offene Bitte möglich. Sämtliche Party-Akte im X-Vertrag, Sprecherbindung, Zustimmung, Ablehnung und Angebote behalten ihren bisherigen Funktionsumfang. Die Gegenproben zu Schutz und Wache gehören zur Abnahme. Der Implementierungsauftrag gilt für 0, A, B, C, P8, P9a und E.

## Fortschritt nach der Freigabe

| Stand | Nachweis |
|---|---|
| Messgrundlage auf .251 | [28a22f0a](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/28a22f0a0bb92676ebe326613b1c6209e3500131) enthält 24 archivierte Präsenzfälle, vier Zustandsnegative, Lantern-Originaleingaben und synthetische Zielvarianten, Martin M11 und einen Teilvalidierungsfall. Auf .251 bestanden 10 von 40 Prüfungen. Das Replay-Werkzeug kann begutachtete Abweichungen nach vier Kategorien ausgeben. |
| Technischer Teilstand .252 | [6a7fc03c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6a7fc03cda9f88e6007f91b1c9bc68b222447c67). Der Produktpfad verwendet `admitPresence` für `enter`, lokale `position` und `aware` sowie ein mitgeliefertes altes `met` bei bestätigter Ankunft. `presenceInReply`, die gesonderte Orts-/Satzprüfung für `met` und der Präsenz-Reparaturhinweis entfallen. Die Beschreibung von GO fordert `met` nicht mehr an. Der weitere X-Vertragsumbau und P10 stehen noch aus. |
| Produktumfang | Unter `src/` und `content/` zusammen 35 hinzugefügte und 113 entfernte Zeilen. Die vollständige Entfernung des E2-A-Blocks und die Desk-Zuordnung stehen aus. [Produktdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/4933a5f005a86a381a922981d3d7377e8ba84b5c...6a7fc03cda9f88e6007f91b1c9bc68b222447c67) |

### Ausgeführte Offline-Prüfungen

- **Anwesenheit.** Auf dem Zwischenstand bestanden alle 28 Präsenzprüfungen. Die 24 archivierten Zitate und Personenprofile wurden in kontrollierten Ausgangszuständen über drei Meldewege getestet. Bei 20 tatsächlich Anwesenden entspricht das der Erzählung, bei drei ist die Identität unklar. Der vierte Grenzfall nimmt Garrick trotz fehlender Darstellung auf. Sechs weitere Anwesenheits- und Foldprüfungen aus `patch_protect110` bestanden.
- **Originalpräfixe.** Unabhängig von diesen kontrollierten Tests wurden vier ursprüngliche X-Antworten auf dem jeweils archivierten Chatpräfix durch `processReplyAny`, `runExtraction` und Fold verarbeitet. In Martin M17 erscheint die Lederarbeiterin neu am Markt. In Elm M83 erscheint Madge genau einmal, in Reed M21 bleibt der Fischer anwesend. In x-233 M71 erscheinen die Gildenmitarbeiterin und Garrick. Die Gildenauszahlung von 90 cp und die Weitergabe von 45 cp an Ossen waren auf beiden Builds gleich. Jeder dieser vier Replays verarbeitete eine eingespeiste X-Antwort. Der anschließende Einkauf und die Mahlzeitenabrechnung sind noch nicht abgenommen.
- **Party.** Alle 26 Prüfungen des vorhandenen User14-basierten Party-Replays bestanden auf dem Zwischenstand, einschließlich kombinierter Kampfaktion und Schutzbitte. In der getrennten Wachprobe blieb Ossen bei gebuchter Wachübernahme nach 60 Minuten bei 80 HP. Beim gezielten Weglassen des Deltas stieg er auf 90 HP.
- **Offene Prüfungen im neuen Korpus.** 34 von 40 bestanden auf dem Zwischenstand. Rot sind vier synthetische Bewegungsziele, die Teilübernahme bei ungültigem Fakt und die Preisellipse. Lantern M80/M82 mit Original-P bestanden bereits auf .251.
- **Ausgangsmessung.** `recount_v2.py` ergab 223 zugeordnete Antworten mit 289 X-Anfragen, davon 66 Reparaturen (29,6 % der Antworten). Häufigste Ablehnungen waren `scene_context` (55), `met_evidence` (24) und `party_decision` (19). Die separate Auszählung aller physischen Reparaturanfragen fand 67, davon 38 ausschließlich semantisch, 22 ausschließlich Schema, sechs gemischt und eine andere. Diese zweite Auszählung verwendet einen anderen Nenner. Im fünften Martin-Spielzug (M16/M17) umfassten die auf .251 lokal gebauten Nachrichteninhalte 51.458 Zeichen für P und 62.089 für X, gemessen in JavaScript-Stringlängen. [Zählmethode](claude_251_analyse/recount_v2.py) · [Originalarchiv](../testrun_10b/openrouter-20261127-martin-251/)

## Zweiter Stopp · Ankunft und Abschluss einer offenen Ortssuche

Der Spieler kann ein Ziel verfolgen, für das die Engine noch keine Orts-ID kennt. In diesem Fall entscheidet `expected.go.arrived` in .251 auch, **ob dieses persönliche Ziel erledigt wird**. Das beeinflusst den nächsten Spielerzug. Der Auftrag behandelt das Feld als zweite Ankunftsmeldung. `goStepAt` kann bei einem freien Suchziel nicht aus der Identität des erreichten Orts erkennen, ob dort auch die gesuchte Bedingung erfüllt ist. [Zielabschluss in World](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L2076-L2083) · [Schrittzuordnung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L2581-L2587)

**Synthetische Gegenprobe auf unveränderter .251.** Ausgangspunkt war die reale Produkt-Teststrecke „follow the northern road until I find a village“ mit Ruleset 2, eingespeistem Planner und Extractor. Als Suchbedingung diente „a village with a healer“. Nach fünf Stunden und einem Halt auf der Straße bestand `intent.1` mit `status: active`, `place: null`. Auf „I continue on the road“ wurden vom selben Präfix zwei Antworten eingespeist. Beide enthielten dasselbe einzige `arrive` für Harrowby (neue Siedlung in Duskreach). Beide wurden angewandt. [Basis der Reproduktion](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/tests/v4/patch5.test.js#L165-L187)

| Erzählung nach Betreten von Harrowby | Antwort zum Ziel | Gespeicherter Zustand | Nächster tatsächlich ausgeführter Plannerbefehl `journey.continue` |
|---|---|---|---|
| „The healer lives further north.“ | `arrived:false, at:null` | PC in Harrowby, Suche aktiv, Zielort offen | autorisiert für `intent.1` |
| „The healer lives here.“ | `arrived:true, at:Harrowby` | PC in Harrowby, Suche erledigt, Zielort Harrowby | abgewiesen mit `no established journey` |

Nach Weglassen des GO-Ergebnisses sind die strukturierten Ortsmeldungen beider Antworten identisch. „Letztes Ziel erreicht“ beendet die erste Suche zu früh. „Unbekanntes Ziel offen lassen“ hält die zweite Suche fälschlich aktiv. Andere optionale Weltfakten sind in beiden gültigen Antworten entbehrlich. Eine neue Grammatikprüfung der Heiler-Erzählung würde der Leitbedingung widersprechen.

**Empfehlung zur Entscheidung:** `arrive` bucht jeden physischen Ortswechsel. Nur für ein aktives Suchziel ohne gebundene Orts-ID behält X die bestehende Ja/Nein-Antwort zur Zielerfüllung. Orts-ID, Mitreisende und Begegnungen werden auch dann ausschließlich aus dem bestätigten Ankunftsschritt übernommen. Das erfordert keinen weiteren Modellaufruf. Die Ausnahme ist ein Vorschlag und wurde nicht implementiert.

Etappe B und die anschließenden Produktetappen sind angehalten. Vollständiges T1, kategorisiertes T3 samt Neubewertung, isolierte ST-Abnahme, Abschlussmessung und Gesamtabnahme sind **nicht ausgeführt**. Der Entwicklungsstand ist ein Sicherungspunkt. Eine Installation in der persönlichen SillyTavern-Umgebung ist derzeit nicht angezeigt. Providerkosten dieser Arbeiten: 0 USD.

## Freigabe zur Fortsetzung nach dem zweiten Stopp

Die Zielerfüllungsantwort bleibt für jeden GO-Schritt erhalten. Ankunft, Mitreisende und Begegnungen brauchen eine eigene bestätigte Grundlage. Die Harrowby-Gegenproben gehören zur Gesamtabnahme. Von den sechs offenen Korpusprüfungen gehört der ungültige Fakt neben gültigen Deltas zu B, die vier lokalen Planner-Ziele zu C und die Preisellipse zu D/P9a. P7 bleibt zurückgestellt.
