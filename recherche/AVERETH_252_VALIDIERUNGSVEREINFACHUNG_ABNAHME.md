# Validierungsvereinfachung V1 · Umsetzung und Abnahmestand

**Build 4.3.0-c.6.6.260, Produktcommit `7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79`.** 3.635/3.635 Node-Tests bestehen, alle 2.235 historischen Records sind geprüft. 200 Änderungen gegenüber .251 sind einzeln oder als reine Protokolländerung begründet. Die endgültigen Befunde und die Messung der 67 archivierten Reparaturfälle stehen im [Ergebnis auf .260](#ergebnis-der-technischen-abnahme-auf-260). Die fünf isolierten ST-1.19-Modi bestehen mit 237/237 Prüfungen. Der Kandidat ist bereit für den unabhängigen GPT-Diffreview.

Beim GO mit Schleichen am Ziel reicht ein nach der Ankunft gemeldetes `aware` oder `position` für einen am Aufbruchsort anwesenden NPC nur aus, wenn er bereits am Ziel anwesend ist. Ein angenommenes `enter` oder die bestätigte Mitreise stellt diese Anwesenheit her. Die Originalgegenprobe und die gezielten Prüfungen bestanden (55/55). [Produktcommit .258](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/788c6d2fc5b037a132ba97bf4f2c2c2cc76a9540)

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

## Technische Gesamtabnahme auf .257

Die Entscheidung zum zweiten Stopp ist umgesetzt. Der Produktbranch enthält folgende regulär gepushte Sicherungen. Die Nummern ab .252 bezeichnen Zwischenstände desselben Pakets. [Vollständiger Produktdiff .251–.257](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/4933a5f005a86a381a922981d3d7377e8ba84b5c...51a7cf2e662b30589ba8b8b7b68e23da0f0508a3)

| Etappe | Produktcommit | Änderung |
|---|---|---|
| 0 | `28a22f0a0bb92676ebe326613b1c6209e3500131` | Messgrundlage, archivierte Eingaben, vier Replaykategorien |
| A · .252 | `6a7fc03cda9f88e6007f91b1c9bc68b222447c67` | Eine zustandsgebundene Aufnahme für bekannte NPCs, einschließlich alter Begegnungslisten |
| B · .253 | `6b0b96208533f0567865f0b7a4ed76092aa7a5de` | Physische Ankunft und GO-Zielerfüllung an demselben angenommenen Abschnitt |
| B · .254 | `f5286cc78acfc9a1143fe78f5ded60c5d16bc88f` | Teilübernahme, Schema-Audit, Buchung in Ereignisreihenfolge, begrenzte Reparatur |
| C · .255 | `7a8efa2e2894d21f2d6966014e76c5bf0554b7db` | Lokaler Ortsabgleich für das Planner-Ziel, nachvollziehbarer Endort bei leerem Plan |
| D · .256 | `caccf00a3ec79cd9816e0b3664ca7c8f60b796a0` | Desk-Zuordnung am gebuchten Schalterbesuch, Preisellipse, Entfernung des alten Präsenz-Satzparsers |
| E · .257 | `51a7cf2e662b30589ba8b8b7b68e23da0f0508a3` | Verworfenes `arrive` verhindert die Zuordnung eines mehrdeutigen freien Ziels. Der Zielabgleich erreicht auch ältere besuchte Orte außerhalb der acht HUD-Einträge. Recovery-Prüfungen verwenden eine tatsächlich gebuchte Aktion. |

Die Produktänderungen in `src` und `content` ergeben gegenüber .251 **241 hinzugefügte und 846 entfernte Zeilen**, netto −605. Davon entfallen 410 entfernte Zeilen auf `narration_evidence.js`. Entfernt wurden unter anderem der E2-A-Satzparser, die Desk-Grammatik, `sceneIssues` als allgemeiner Reparaturgrund und die Reiseverberkennung in `chosenKnownRoute`. Zu den neuen Helfern gehören `admitPresence`, `knownRouteTarget`, `reportedEndpoints` und das zeitlich eingeordnete Protokollieren verworfener Deltas in `rejectThrough`. Die umfangreichen Altprüfungen zur erzwungenen Bewegung, die Spieler-Agency und die Partyentscheidungen wurden fachlich beibehalten. Die Trigger für X-Reparaturen unterliegen P3. [Produktdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/4933a5f005a86a381a922981d3d7377e8ba84b5c...51a7cf2e662b30589ba8b8b7b68e23da0f0508a3)

### GO-Verbraucher und erhaltene Informationen

| Situation | Verhalten des Kandidaten |
|---|---|
| Bekanntes Ziel, Dungeonabschnitt | Die Engine prüft den erreichten Ort, das Wegstück und dessen Zulässigkeit. `arrived` erzeugt keine Ankunft. |
| Freies Ziel, Zwischenhalt und Ortssuche | Nur der zugeordnete angenommene Halt darf die Suche abschließen. Harrowby mit `false` lässt sie offen, mit `true` und eindeutigem Halt schließt sie dort. `true` ohne Ankunft reicht nicht. |
| Mehrere Halte und Rückkehr | Bei mehreren sonst ununterscheidbaren Halten darf das bisherige optionale `at` den gemeinten Halt bezeichnen. Harrowby → Ausgangsort mit `at:Harrowby` beendet die Suche in Harrowby. Ohne Zuordnung bleibt sie offen. Auch ein schematisch verworfener zweiter Halt macht den überlebenden ersten Halt nicht automatisch zum Ziel. |
| PULSE-Halt ohne gemeldete Ankunft | Der deterministische Halt bleibt möglich. Hier kann das bisherige optionale `with` tatsächlich mitreisende Personen benennen. Bei gewöhnlichen Ankünften gilt `arrive.with`. |
| Lokale Bewegung, Zeit, Folgeaktionen | Reisezeit, Mindestdauer, Reise-MP und bedingte Folgeaktionen haben weiterhin eigene Autorität. Die Zuordnung von freier Zielerfüllung und von Privataufträgen verwendet den bestätigten Abschnitt. Die historische Mühlenabweichung unten betrifft tatsächlich gebuchte Zeit. |
| Alte Ereignisse, neue Extraktion | Vorhandene Events bleiben faltbar. `met` wird beim Einlesen alter oder erneut gelieferter Antworten über die gemeinsame Aufnahme verarbeitet. Der aktuelle GO-Vertrag zeigt allein `arrived` als reguläres Antwortfeld. |

Die Harrowby-Reihe läuft im Produktpfad mit eingespeistem P und X. Die dort dauerhafte Suchabsicht und ihre Ziel-ID sind die geprüften Ergebnisse. Die Felder `at` und `with` bleiben für die beiden beschriebenen mehrdeutigen Situationen im Leser und im erklärenden Vertragstext verfügbar. [Bewegungszuordnung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/51a7cf2e662b30589ba8b8b7b68e23da0f0508a3/avereth-engine/src/v4/movement.js#L60) · [Harrowby-Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/51a7cf2e662b30589ba8b8b7b68e23da0f0508a3/avereth-engine/tests/v4/patch5.test.js#L749)

### Originalfälle und Messungen

- **Anwesenheit und Folgehandlung.** Martin M17 wurde mit der archivierten X-Antwort auf dem Originalpräfix verarbeitet. Für den Folgekauf wurde die erste Angebotszeile für 80 cp gewählt und eine passende P-Antwort eingespeist. Auf .251 scheiterten beide Guthabenvarianten an der abwesenden Verkäuferin. Auf .257 blieb Alaric mit 50 cp bei 50 cp. Mit synthetisch bereitgestellten 500 cp kam genau eine Transaktion zustande, Endbetrag 420 cp. Bei Elm M83/M84 wurde Madge auf .257 genau einmal aufgenommen. Die archivierte HUD-Wahl für das Essen erzeugte genau eine Transaktion, 110 → 107 cp. Auch .251 hatte die Mahlzeit in dieser Folge einmal abgerechnet. Reed M21 behielt den Fischer. Beim bekannten Fehlpositiv x-233 M71 erschien auch Garrick. Die beiden Auszahlungen von 90 und 45 cp waren im Vergleich identisch.
- **Sechs offene Fälle.** Die Teilübernahme eines gültigen Deltas neben dem ungültigen Fakt besteht in B. Die vier bekannten Ortsziele bestehen in C jeweils als `scene` und als `new`. Die Preisellipse in Martin M11 besteht in D mit eingespeistem `currency_quote: "eight silver"`, zweiter Preis 120 cp. Zwei Münzarten im geprüften Auszug lassen den Preis offen. Der ursprüngliche Extractor hatte das Währungszitat nicht geliefert. Alle **42/42** Prüfungen in `claim_state252.test.js` bestanden auf .257.
- **Grenzen der Eingabe.** Lantern M80/M82 gelangen bereits auf .251 mit dem archivierten P. Rook M8 und Hearth M84 liefern im leeren Plan kein Reiseziel. Der Text im Engine-Block weist auf den aktuellen Endort hin. Die Entfernungs-, Gefahren- und Dungeonprüfungen bleiben eigene Buchungsvoraussetzungen.
- **Gilde und Party.** Die Schaltertests mit einem Mitarbeiter sowie mit zwei Mitarbeitern, eindeutiger ID, unbeteiligter ID und fehlender Auswahl bestanden. Historische Spielzüge ohne `outcome.desk` sind gesondert betroffen, siehe unten. Alle 26 Schutzprüfungen des User14-Party-Replays bestanden. Die getrennte Wache-Gegenprobe ergab mit NPC-Entscheidung 80 HP nach einer Stunde, ohne Wache 90 HP. Alle Party-Akte bleiben verfügbar.
- **Promptmessung.** Martin Zug 5, gleiche Originalvorgeschichte und produktive Request-Builder. P hatte auf beiden Ständen 51.458 Zeichen. X sank von 62.089 auf **58.918 Zeichen** (−3.171). Maß ist die Summe der JS-Stringlängen der Nachrichteninhalte. Es handelt sich um offline gebaute Requests.

### Stoppbefund · Hesk löst am falschen Ort eine vergleichende Probe aus

Der bestehende User01-Test `156 original journey + stealth` ist auf .251 grün und auf .257 rot. Alaric verlässt Hesk und dessen drei Hunde am Unterstand. Das Ziel ist das alte Gräberfeld. Der erste Absatz beschreibt, wie Hesk die Spur schon beim Aufbruch verliert. Am Gräberfeld hört Alaric ein Schnarchen aus einer Öffnung. Der Planner bucht das zielgebundene Schleichen. Die Testvorgeschichte und die ursprüngliche X-Reihenfolge sind im Repository enthalten. [Originalfixture und Host-Test](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/51a7cf2e662b30589ba8b8b7b68e23da0f0508a3/avereth-engine/tests/v4/fix156_stealth_manner.test.js#L41)

Im X steht das `arrive` am Gräberfeld an Position 2. Darauf folgt `aware(npc.hesk, unaware)` an Position 3 mit `scene:null`. Der wörtliche Auszug stammt aus dem Aufbruch am Unterstand. Das gesonderte Wiederabspielen ließ den Produktpfad P → N-Text aus Archiv → X → Fold auf beiden Builds laufen. Je Variante gab es zwei eingespeiste Plannerantworten und eine Extractorantwort. Die Tests verwenden den tatsächlichen Check-Code und den gespeicherten Zufallszustand.

| Prosa und Meldungen | .251 | .257 |
|---|---|---|
| Archivierter Aufbruch und ursprüngliches X | Nur PC am Ziel. Automatischer Erfolg, RNG-Zähler 15. | PC und Hesk am Ziel. AGI 11 gegen PER 5, Chance 68,75 %, Wurf 2, Erfolg, RNG-Zähler 16. |
| Kontrollprosa mit Hesk bei der Ankunft tatsächlich am Gräberfeld, dieselben strukturierten Meldungen | Nur PC am Ziel, automatischer Erfolg. | Hesk am Ziel, regulärer Wurf gegen Hesk. |
| Originalprosa, X nennt beim `aware` ausdrücklich den Unterstand | Nur PC am Ziel, automatischer Erfolg. | Nur PC am Ziel, automatischer Erfolg. |
| Originalprosa, X meldet dasselbe `aware` vor der Ankunft | Nur PC am Ziel, automatischer Erfolg. | Nur PC am Ziel, automatischer Erfolg. |

Die Kontrollprosa ist synthetisch. Im Original blieb Alaric auf beiden Builds verborgen. Nachgewiesen sind der falsche Aufenthaltsort eines konkreten NPCs und der zusätzliche Zufallsverbrauch. Eine tatsächlich verlorene Probe oder ein daraus entstandener Kampf wurde in diesem Originalzug nicht beobachtet.

**Entscheidungsgrenze.** Der alte `notBroughtIn`-Pfad hielt einen abwesenden NPC bei einem alleinigen Wahrnehmungsdelta vom Ziel fern. D1/D2 erlauben seine Aufnahme gerade aus diesem Delta. Hesk ist lebendig, kampffrei und kein anderswo wartendes Mitglied. Beide Prosavarianten haben denselben mechanischen Eingang einschließlich Heimatort, Mitreisenden, Reihenfolge, Wörtlichkeitsbeleg und GO-Antwort. Nur die erzählte Szene des Belegs unterscheidet sich. Die Rücknahme des ganzen alten Guards würde auch die richtige Ankunft im zweiten Fall unterbinden. Die mit P4 erlaubten optionalen Ortsangaben lösen den Fall, **wenn X sie richtig liefert**. Ihre Abwesenheit in den archivierten Daten ist real. [Frühere Anwesenheitsgrenze](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L600) · [Aufnahme in .257](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/51a7cf2e662b30589ba8b8b7b68e23da0f0508a3/avereth-engine/src/v4/world.js#L1549) · [Autoritative Gegner der Probe](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/51a7cf2e662b30589ba8b8b7b68e23da0f0508a3/avereth-engine/src/checks.js#L36)

**Empfehlung zur Entscheidung:** Bei einem Ortswechsel soll ein am Ausgangspunkt anwesender NPC erst durch einen tatsächlichen Mitreise- oder Eintrittsbeleg am Ziel zum Beobachter einer mechanischen Probe werden. Dafür reichen die vorhandenen Meldeformen `arrive.with` und `enter`. Diese Ausnahme würde die bestätigte Gleichwertigkeit von `enter`, `aware` und `position` für diesen Fall einschränken und eine zusätzliche Zustandsprüfung erfordern. Alternativ kann der Nutzer die Zustandsmeldung als maßgeblich akzeptieren, auch wenn ein falsch eingeordnetes X über die Anwesenheit hinaus den Wurf beeinflusst. Das bisher ausdrücklich beschriebene Garrick-Risiko umfasste einen erzählerisch korrigierbaren Szenenfehler. Der Hesk-Fall geht darüber hinaus. Keine der beiden Varianten wurde als neue Fachregel festgeschrieben.

### Erstantworten und historische Regression

Für die archivierten Reparaturanfragen wurden Originalchat und physische `requests.jsonl.gz` nach Antworttext und Nachrichtenidentität zugeordnet, beim gesonderten Surrender-Vertrag über das JSON-Feld `reply`. Die X-Ausgaben kamen aus den zugehörigen `raw-<id>.gz`, einschließlich der zusammengesetzten Streaming-Fragmente. Jeder Vergleich begann auf dem gefalteten Originalpräfix. Dies ist eine Offline-Auswertung mit fest vorgegebenen Modellantworten.

| Stichprobe der 67 Reparaturanlässe | .251 | .257 |
|---|---:|---:|
| Verarbeitungsversuche insgesamt einschließlich eingespeister Wiederholungen | 132 | 85 |
| Bereits nach der ersten Antwort angewandt | 2 | 48 |
| Erst mit der zweiten Antwort angewandt | 63 | 17 |
| Abschluss `failed` | 2 | 2 |

Bei **46** früher reparierten Fällen wurde auf .257 bereits die Erstantwort angewandt. Bei **29/67** unterschieden sich die aufgezeichneten Ereignisfolgen nach Ausklammern von `extract.applied` und `delta.rejected`. Das sind Unterschiede gegenüber der lokalen .251-Verarbeitung derselben Antworten. Bei AL M21 schlug der Surrender-Abschluss auf beiden Ständen fehl. Pine M23 wurde nur auf dem Kandidaten angewandt, Reed M23 nur auf der Basis. Die 47 weniger verwendeten eingespeisten Requests sind eine Korpusmessung ohne tatsächliche Kostenersparnismessung.

Das vollständige historische Replay umfasst **2.235 Nachrichten**. Gegen die .126-Referenz wichen auf .257 insgesamt 1.392 ab. 1.196 entsprachen exakt den bereits akzeptierten Fingerprints. Offen blieben 196. Ein getrennter Vergleich von zwei vollständigen neuen Läufen auf .251 und .257 isolierte dieselben 196 Änderungen. Die übrigen 2.039 Nachrichten stimmten bei diesem direkten Vergleich überein.

| T3-Einstufung | Vorläufiges Ergebnis |
|---|---|
| Beabsichtigte semantische Verbesserung | Über die gezielten Originaltests belegt, unter anderem die Verkäuferin bei Martin. Für die historische Abnahme wurde kein Fall allein aufgrund zusätzlicher Präsenz oder neuer Fakten freigezeichnet. |
| Darstellung oder Protokoll | Bei 164 Fällen blieb die geordnete Folge der übrigen Weltereignisse gleich, wenn Audit und `extract.applied`, der geänderte NOTHING-TO-BOOK-Hinweis sowie fehlendes gegenüber explizit leerem Reichweitenfeld ausgeklammert werden. Diese Gruppierung dient der Prüfung, kein neuer Fingerprint wurde angenommen. |
| Mechanische Wirkung | Bei 32 Fällen änderten sich weitere Ereignisse. Die nachfolgende Liste zeigt die konkreten Unterschiede. |
| Ungeklärt | Die fachliche Zulässigkeit der mechanischen Änderungen ist nicht durchgehend geklärt. Die einmalige verbindliche Neubewertung der Fingerprints bleibt ausgesetzt. |

**Zwei spielrelevante historische Abweichungen:**

- **b18-warrior#180, Marens Mühle.** Der archivierte Planner hatte ein freies Ziel ohne Orts-ID gebucht. Die erste X-Antwort meldet in `scene`, `expected.at` und `arrive.at` konsistent einen neuen Ort „Maren's millhouse“. Auf .251 löste allein die erneute Meldung des bekannten Müllers per `person.new` am abweichenden Ort den Repair aus. Die zweite Antwort benannte dann die bestehende `loc.the_millrace_millhouse`. Auf .257 wurde die erste Antwort angewandt und `loc.alderwatch.marens_millhouse` angelegt. Alaric erhielt 20 statt insgesamt 60 Reiseminuten, End-MP 89 statt 93. Im Save gab es neben der Mühle auch den Mühlenhof und den Mühlgraben. Die bekannte Orts-ID war im autorisierten GO und in den Ortsmeldungen der Erstantwort nicht enthalten. Ein weiterer Pflichtbeleg oder ein neuer Parser für Besitzformen wurde nicht eingeführt.
- **b16-rogue-sale#68, Gildenabgabe.** Im alten Spielerrecord sind der bedingte Turn-in und `booked.turnIns` vorhanden. `outcome.desk` fehlt. Der neu eingetretene Clerk erhielt auf .251 das Wissen über die abgeschlossene Otterhundquest und auf .257 nicht. Der erfolgreiche formale Turn-in ist von diesem fehlenden persönlichen Wissenseintrag zu unterscheiden. Für Altsaves ist die bestehende Turn-in-Buchung ein geeigneter Ausgangspunkt für die weitere Korrektur.

Die Einzelzeilen nennen nur die zwischen beiden Replayausgaben abweichenden Weltereignisse. Bei identischen Kurzbezeichnungen können sich gespeicherter Inhalt oder Provenienz unterscheiden. Die vollständigen Fingerprints wurden nicht überschrieben.

| Archivrecord | Nur .251 bzw. frühere Fassung | Nur .257 bzw. neue Fassung |
|---|---|---|
| b16-rogue-sale#12 | quest.detailed quest.thin_the_stranglewillow_sprouts, memory.recorded Adventurers' Guild hall, Glassmere: | extract.failed |
| b16-rogue-sale#68 | knowledge.gained npc.npcglassmere_guild_clerk / f.pc.completed.quest.cull_the_gravel_bar_otterhounds | – |
| b17-mage#178 | scene.entered npc.npcgatewatchman, memory.recorded Ashbridge: {pc}: "I show the healer | memory.recorded Ashbridge: {pc}: "I show the healer |
| b17-mage#200 | entity.created npc.npcguildclerk, scene.entered npc.npcguildclerk, scene.tactical, fact.asserted occupation, knowledge.gained npc.npcguildclerk / f.pc.appearance, memory.recorded first saw {pc} at Ashbridge, memory.recorded Ashbridge: {pc}: "I collect the kni | memory.recorded Ashbridge: {pc}: "I collect the kni |
| b17-rogue#122 | scene.entered npc.npcfisher | scene.entered npc.npcfisher, scene.position npc.npcfisher |
| b17-rogue#170 | offer.created npc.npceel_pitcher_innkeeper 8 cp | offer.created npc.npceel_pitcher_innkeeper 8,3 cp |
| b17-rogue#192 | object.created crusted leather pouch | – |
| b17-warrior#30 | fact.asserted wolf_sign | fact.asserted aware, fact.asserted said, fact.asserted wolf_sign |
| b17-warrior#64 | fact.asserted offer | fact.asserted aware, fact.asserted toll, fact.asserted offer |
| b17-warrior#182 | – | scene.entered npc.pimm, entity.updated npc.pimm |
| b17-warrior#184 | place.created loc.crownheart.crossed_oar_and_tankard_lodging_house | place.created loc.crownheart.crossed_oar_and_tankard_lodging_house |
| b17-warrior#192 | scene.entered npc.pimm, entity.updated npc.pimm, scene.awareness npc.pimm, fact.asserted wasp_activity, thread.set, memory.recorded the timber wharves of Crownheart: { | fact.asserted wasp_activity, memory.recorded the timber wharves of Crownheart: { |
| b17-warrior#274 | place.created loc.hollow_with_the_wolf_den_under_the_fallen_slab.den_under_the_fallen_slab, link.set | – |
| b17-warrior#284 | object.created frozen wild doe carcass, entity.created mon.monfourth_bramble_wolf, scene.entered mon.monfourth_bramble_wolf, entity.updated mon.monfourth_bramble_wolf, scene.awareness mon.monfourth_bramble_wolf, scene.position mon.monfourth_bramble_wolf, memory.recorded the Barrowfield bramble › clearing | memory.recorded the Barrowfield bramble › clearing |
| b18-mage#12 | extract.failed | time.advanced 45 min, entity.updated npc.npcguild_clerk, scene.moved realm.duskreach.culvert_on_the_old_quarry_track_east_of_ashbridge, place.updated, intent.set, entity.created mon.adderquarry_track, scene.entered mon.adderquarry_track, entity.updated mon.adderquarry_track, scene.awareness mon.adderquarry_track, time.advanced 15 min, memory.recorded culvert on the old quarry track eas |
| b18-rogue#84 | – | fact.asserted position |
| b18-rogue#130 | – | offer.created npc.master_hult 6 cp |
| b18-rogue#142 | scene.awareness mon.creaturemillpond_turtles_1 | – |
| b18-rogue#368 | extract.failed | time.advanced 5 min, fact.asserted examined, fact.asserted assessment, thread.set, memory.recorded Adventurers' Guild hall, Alderwatch |
| b18-warrior#54 | fact.asserted remark | object.moved, fact.asserted remark |
| b18-warrior#64 | entity.created mon.creaturequarry_boar_1, scene.entered mon.creaturequarry_boar_1, entity.updated mon.creaturequarry_boar_1, memory.recorded the woods along the Greyvein quarry | memory.recorded the woods along the Greyvein quarry |
| b18-warrior#106 | scene.entered npc.maren, entity.updated npc.maren, memory.recorded {pc} came down off the boar shelf a, memory.recorded the Millrace millhouse: {pc}: "I co | memory.recorded the Millrace millhouse: {pc}: "I co |
| b18-warrior#164 | entity.created npc.npcpart_buyer, scene.entered npc.npcpart_buyer, scene.tactical, fact.asserted occupation, scene.awareness npc.npcpart_buyer, offer.created npc.npcpart_buyer None,None,None,None cp, knowledge.gained npc.npcpart_buyer / f.pc.appearance, memory.recorded first saw {pc} at part-buyer's awni, memory.recorded part-buyer's awning: {pc}: "I walk | memory.recorded part-buyer's awning: {pc}: "I walk |
| b18-warrior#180 | scene.moved loc.the_millrace_millhouse, scene.entered npc.maren, fact.asserted aware_of_alaric, memory.recorded Maren saw {pc} return to the millho, time.advanced 40 min, resource.changed mp 93, memory.recorded the Millrace millhouse: {pc}: "I le | place.created loc.alderwatch.marens_millhouse, scene.moved loc.alderwatch.marens_millhouse, memory.recorded Maren's millhouse: {pc}: "I leave t |
| b18-warrior#222 | scene.entered npc.npcguild_clerk, memory.recorded Adventurers' Guild hall, Alderwatch | memory.recorded Adventurers' Guild hall, Alderwatch |
| b19-mage#18 | – | fact.asserted postern_rule, fact.asserted directions |
| b19-mage#98 | – | scene.entered npc.fisherman, entity.updated npc.fisherman, scene.awareness npc.fisherman, quest.detailed quest.cull_the_reed_flat_otterhounds, knowledge.gained npc.fisherman / f.pc.appearance, memory.recorded first saw {pc} at otterhound den en |
| b19-mage#104 | fact.asserted wares | – |
| b19-rogue#38 | fact.asserted stock_note | fact.asserted stock_note |
| b19-warrior#230 | fact.asserted trail, fact.asserted tracks | fact.asserted trail |
| b19-warrior#326 | fact.asserted armor_set_ready | fact.asserted armor_set_ready |
| b19-warrior#328 | offer.created npc.npclandlady 8 cp | offer.created npc.npclandlady 8,6 cp |

### T1, Installation und nächster Entscheid

Auf .251 bestanden **3.609/3.609** Node-Tests. Auf .257 bestanden **3.530/3.633**, 103 schlugen fehl, kein Test wurde übersprungen. Ein Teil erwartet das alte Verhalten, etwa eine Reparatur nach einem isolierten ungültigen Delta, die Ungültigkeit der ganzen Antwort oder grammatische Ablehnung einer ausdrücklich gemeldeten Anwesenheit. Der Hesk-Fall prüft dagegen den gespeicherten Aufenthaltsort und die tatsächliche Probe. Die 103 Fehler wurden deshalb nicht pauschal in neue Erwartungen umgewandelt. Die gezielte Gruppe aus Reise-, Kampagnen- und Recoverytests bestand mit 69/69, einschließlich verweigerter Ortszuordnung und der Revisionssperren bei noch offener gebuchter Aktion.

Reproduktion nach Checkout des jeweiligen angegebenen Commits im Verzeichnis `avereth-engine`:

```sh
node --test --test-name-pattern='156 original journey' tests/v4/fix156_stealth_manner.test.js
node --test tests/v4/patch5.test.js
npm test
npm run replay:check -- --categories
```

Das Kategorienflag und die zusätzlichen Harrowby-Prüfungen sind auf dem Kandidaten vorhanden. Das historische Replay kann auf der Basis mit `npm run replay:check` ausgeführt werden. Die zugrunde liegenden alten Referenzen und akzeptierten Fingerprints sind erhalten.

**Installationsstand.** Für diesen Zwischenstand lautet die Empfehlung NO-GO für eine persönliche Installation. Bei einer späteren Freigabe betrifft der Austausch die SillyTavern-Extension `avereth-engine` einschließlich `manifest.json`, `package.json`, `src/` und `content/deltas.json`. Das Paket benötigt keine zusätzliche Character Card, keinen Preset-, Lorebook-, Regex- oder Narrator-Contract-Import. Quellstand und Version müssen innerhalb der Extension zusammenpassen.

Der Kanon ist auf seinem bisherigen Stand. Etappe F und natürliche Modellabnahme wurden nicht ausgeführt, Providerkosten 0 USD. Die abschließende fachliche Einzelprüfung aller mechanischen Replayabweichungen, eine grüne Node-Abnahme und der unabhängige GPT-Diffreview stehen aus.

## Ergebnis der technischen Abnahme auf .260

Die vier Produktetappen sind umgesetzt. Sie gehören zu einem Paket für den unabhängigen Diffreview. Die genaue Prüfung von 2.235 historischen Verarbeitungsschritten und 67 physischen Reparaturfällen führte nach .257 zu drei weiteren Produktständen. Die vorangehenden Stopp- und Zwischenberichte dokumentieren den Erkenntnisstand des jeweiligen Builds.

Die Korpusprüfung bestätigt außerdem die Partygrenze: In den vier untersuchten Vale-Antworten erzeugen beide Versionen dieselben Partyereignisfolgen. Bei Cypress M71 werden dieselben beiden Anspruchsereignisse für Ossen gebucht. Die zusätzliche Einzelkenntnis des Clerks folgt aus P8. Das separate User14-Partyreplay besteht auf .260 mit 26/26.

| Stand | Nachweis |
|---|---|
| .258 · [788c6d2f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/788c6d2fc5b037a132ba97bf4f2c2c2cc76a9540) | Die vom Nutzer entschiedene Ausnahme für zielgebundenes Schleichen unterscheidet gemeldete Wahrnehmung von realer Mitreise oder Eintritt eines Beobachters vom Aufbruchsort. |
| .259 · [6c182b58](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6c182b58834e458c0422aaee7b7d1c7ba7b01c1f) | Ortsidentität bei noch offenem freiem Reiseziel, abhängige Lokalclaims bei fehlendem Ankunftsschritt, historischer Schalterbesuch und Diagnose einzelner ungültiger Felder. Tests älterer Verträge prüfen Teilübernahme, verbindliche Zustände und Recovery nach einer gebuchten Aktion. |
| .260 · [ffd1a74c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ffd1a74c79a9b7ce1afc2c2a7dee08495fda308f) | Die bestehenden Sichtbelege eines reservierten Dungeonbegegners bleiben reparierbar, wenn sie für eine autorisierte schleichende Annäherung gebraucht werden. |
| Abnahme auf .260 · [c2abc94a](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2abc94abc38a1c61fdfbd54e07bb26e760307a7) | Einmalig einzeln geprüfte Replay-Fingerprints, mit unveränderter historischer Kette und Kontrolle des jeweils abgelösten Fingerprints. Die historische Kette prüft bei jeder erneuten Ausführung die genaue Ausgabe. |
| Testbeschreibungen · [7bdb5701](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79) | Die migrierten Gegenproben benennen ihre tatsächlichen Erwartungen. Ungültiges Altgebot und gültiges Vergleichsgebot beginnen auf getrennten Kopien des Originalpräfixes. Produkt-HEAD für den Diffreview. |

**Produktumfang.** Gegenüber .251 enthalten `src/` und `content/` zusammen 281 hinzugefügte und 845 entfernte Zeilen, netto −564. GO verlangt regulär die Antwort auf die Zielerreichung. Die Abschnittszuordnung bei mehreren nicht unterscheidbaren Halten und die Mitreise beim deterministischen PULSE-Halt verwenden die oben belegten optionalen Altfelder. Der strukturelle GO-Vergleich und die lokale Annäherung behalten unterschiedliche Aufgaben. P7 bleibt vollständig zurückgestellt. [Vollständiger Diff .251 → .260](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/4933a5f005a86a381a922981d3d7377e8ba84b5c...7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79)

### Mechanisch notwendige Abhängigkeiten

- **User01, Schleichen am Ziel.** Im Original bleibt Hesk am Aufbruchsort. Am Gräberfeld erfolgt mangels Beobachter der automatische Erfolg, der RNG-Zähler bleibt bei 15. Mit ausdrücklich mitgereistem oder dort eingetretenem Hesk findet die vergleichende Probe statt. Die bestehende RNG-/Revisionsbindung gilt für beide Varianten. Die Gegenfälle prüfen `aware` und `position`. [Gegenproben](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/788c6d2fc5b037a132ba97bf4f2c2c2cc76a9540/avereth-engine/tests/v4/fix156_stealth_manner.test.js)
- **Freies GO zu Marens Mühle, b18-warrior#180.** Die frühere Identitätsprüfung hatte nebenbei den Zielort geschützt. Bei der Neuanlage eines Ortes im gebuchten GO kann X eine dort genannte Person als neu melden, obwohl sie durch dieselbe ID an einem anderen bekannten Ort belegt ist. Der Kandidat behält den begrenzten Repair für den offenen Zielkonflikt. Die Zuordnung nutzt den vom Planner übergebenen Zielnamen und das bestehende Ortsbuch. Auf .259/.260 führt die archivierte zweite Antwort zur echten Mühle, mit 60 Minuten und 93 MP. Ist die Mühle bereits korrekt erreicht und allein der NPC falsch gemeldet, bleibt der GO erfüllt. Das zeigt b18-warrior#106. Auf ein `arrived:true` ohne Halt mit lokalem `here` lässt sich auch nach ausgeschöpftem Repair kein Ziel-NPC am Aufbruchsort buchen.
- **Gebuchte lokale Annäherung, Q/R/Y M39.** Die Zuschauer sind für die Schleichauflösung mechanisch relevant. Q und R lieferten zunächst zwei sichtbare Gegner ohne `across`, Y meldete einen unbelegten individuellen Deskriptor. Auf .259 fielen die beiden Zielidentitäten weg. In Q und Y entfiel dadurch auch die Probe. Auf .260 greift für die gebuchte schleichende Annäherung die vorhandene Prüfung am reservierten Slot. Mit der archivierten Korrektur entstehen wieder die zwei tatsächlichen Gegner. Der ganze fachliche Ereignisverlauf aller drei Antworten entspricht .251. In R gab es bereits auf .251 keine Schleichprobe. Eine gesonderte Negativprobe zeigt, dass derselbe unvollständige Sichtbeleg bei gewöhnlicher Beobachtung keinen Repair anfordert. [Q](../testrun_10b/openrouter-20261127-q-232/) · [R](../testrun_10b/openrouter-20261127-r-232/) · [Y](../testrun_10b/openrouter-20261127-y-234/)
- **Alte Gildenabgabe, b16-rogue-sale#68.** Vor Einführung von `outcome.desk` gespeicherte bedingte Questschritte enthalten Quest und Sequenz im bestehenden Conditional. Das persönliche Wissen entsteht nur beim passenden bestätigten Schalterbesuch und erledigten Auftrag. Dieselbe Figur erhält dieselbe Kenntnis wie auf .251. Die Reihenfolge gegenüber einem unabhängigen Fakt ändert sich. Weitere alte Schalterbesuche mit genau einem anwesenden Mitarbeiter profitieren von P8. Die Abnahme nennt Person und Quest für jeden betroffenen Record.

### Originale, Korpus und technische Grenzen

- **Elm M83 mit absichtlich ungültigem zusätzlichen Fakt.** Auf dem unveränderten Originalpräfix wurde ausschließlich ein Fakt ohne Prädikat an das Ende der Originalantwort angehängt. Auf .251 scheiterten zwei eingespeiste Versuche, Alaric blieb im Zimmer und es entstand kein Mahlzeitangebot. Auf .260 führt ein X zum Schankraum, Madges Angebot über 3 cp ist offen und das Audit nennt das ungültige Delta. Mit dem unveränderten Originalangebot und der tatsächlichen Folgewahl wurde genau einmal abgebucht, 110 → 107 cp. [Elm](../testrun_10b/openrouter-20261127-elm-250/)
- **Ortsbuch und Spielerentscheidung.** Linden M78 bucht den bezahlten Raum und den gewählten Gang nach oben. Die eingespeiste gespeicherte Antwort erreicht auf .260 das Zimmer. Flint M42 bucht beim Beobachten am Türrahmen keinen GO. M44 bucht den ausdrücklichen Eintritt, der angenommene Abschnitt ist `loc.mossback_warrens.l1_s1`. Rook M8 und Hearth M84 enthalten kein Plannerziel. Bei Hearth erzeugte .251 trotz leerer Befehlsliste einen GO über den alten Satzpfad. Auf .260 bleibt er aus, der tatsächlich gebaute Kontext vermerkt die fehlende Reise. Dies ist eine sichtbare Grenze der gewählten Zuständigkeit. [Linden](../testrun_10b/openrouter-20261127-linden-246/) · [Flint](../testrun_10b/openrouter-20261127-flint-243/)
- **67 physische Reparaturfälle.** Jede Erstantwort und jede beanspruchte Folgeantwort wurde aus dem tatsächlichen Requestarchiv neu eingelesen. Auf .251 wurden 132 Antworten abgerufen, auf .260 **90**. Auf .260 wurden 43 Fälle mit der ersten Antwort angewandt, 22 mit der zweiten. Zwei endeten sicher mit `failed`, wie auch insgesamt zwei auf .251. **41** in .251 wiederholte Fälle wurden auf .260 bereits mit der Erstantwort angewandt. Bei keinem der 67 Fälle stieg die Aufrufzahl gegenüber .251. Die Differenz von 42 betrifft eingespeiste Antworten. Preis und natürliches Verhalten neuer Modellgenerierungen wurden nicht gemessen.
- **Requestumfang.** Vollständige P-Nachrichteninhalte des festen Martin-Präfixes 51.458 → 51.458 Zeichen, X 62.089 → 58.918 Zeichen. Die Differenz von 3.171 Zeichen betrifft den tatsächlich gebauten X-Request. Die Messung verwendet JS-Stringlängen. [Martin](../testrun_10b/openrouter-20261127-martin-251/)

**Reproduktion der Stichprobe.** Für jeden Lauf unter `testrun_10b/openrouter-20261127-*/` die X-Starts aus `requests.jsonl.gz` in ursprünglicher Reihenfolge lesen. Reparaturanfragen haben mehr als zwei Nachrichten. Die ursprüngliche Auftragsnachricht und der darin enthaltene Narratortext identifizieren den zugehörigen Chatindex. Im Surrender-Format ist der Text JSON-kodiert im Feld `reply`. Pro eindeutiger Run-/Chatindex-Kombination nur einmal auswerten. Die Antworten zu identischer Auftragsnachricht kommen aus `raw-<Request-ID>.gz`, bei Streaming aus den aufeinanderfolgenden `choices[0].delta.content`-Fragmenten. Die erste JSONL-Zeile ist der ST-Header. Den Originalpräfix bis einschließlich Narratorantwort kopieren, nur deren alten `extra.avereth`-Record aus der Kopie entfernen, dann `processReplyAny` und `runExtraction` mit den archivierten Antworten als sequenziellen Callback ausführen. Gezählt wird jeder tatsächlich angeforderte Callback. Die beiden Produktstände erhalten jeweils eine frische Kopie desselben Präfixes. Bei derselben Nachricht nur den von der Runtime angewandten Record vergleichen. [Runtime](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79/avereth-engine/src/v4/runtime.js) · [Archivzählung](claude_251_analyse/recount_v2.py)

**Wirkung der physischen Erstantworten.** 25 von 67 Ereignisfolgen unterscheiden sich nach Ausklammern von `extract.applied` und `delta.rejected`. Die folgenden Gruppen nennen sämtliche 25 Nachrichten. Eine Änderung einer Fakten-ID oder eines leeren Reichweitenfelds hat ein anderes Gewicht als ein fehlendes Angebot. Diese Stichprobe ist gesondert vom historischen T3-Korpus ausgewertet.

| Archiv und Nachricht | Unterschied auf .260 gegenüber .251 |
|---|---|
| Birch M89, Hearth M55, Oriole M75 | Der Knochenhändler beziehungsweise der Marktjunge erscheinen. Bei Oriole bleiben die vier Stabpreise gleich. Neue Anwesenheit kann die Zugerinnerung und den gespeicherten PULSE-Bericht verändern. |
| C M23, Willow M83 | Die Erstantwort bucht den früher reparierten Abgang des Clerks und Garricks beziehungsweise Ossens nicht. Bei C wird Ossens Armbrust als Aussage gespeichert. Daraus folgt kein neuer Partyvertrag. |
| Cypress M71 | Persönliches Wissen des anwesenden Clerks über die erfolgte Questabgabe. |
| F M17 | Garricks Würfelschuldforderung und Ossens Widerspruch werden als Aussagen gespeichert. Der Zug erhebt keine elf Kupfer. |
| Hazel M25 | Der tatsächlich erzählte Zwischenhalt am Lagerplatz bei der Furt und die dortigen Spuren werden zusätzlich gespeichert. Der anschließende Halt am Dungeon bleibt erhalten. |
| Hearth M79, Rowan M77 | Die frühere reparierte Antwort lieferte ein 3-cp-Essensangebot beziehungsweise das unbepreiste Angebot für den Knochen. Auf .260 fehlen sie. Die Antwort löst keine Zahlung aus. |
| I M35/M37/M53 | Die narrative Behauptung über den abgeschlossenen Dungeon und der Thread zur Halbteilung fehlen. Später bleiben eine Erinnerung und Ossens Reaktion erhalten. Diese Texte buchen weder Dungeonabschluss noch Geldanspruch. |
| Juniper M89, Rowan M81/M83, Vale M29 | Gleiches Objekt der Aussage beziehungsweise gleicher NPC. Geändert sind leeres Reichweitenfeld, Sequenz der Preisdiagnosen oder Herkunfts-ID eines Fakts. |
| N M66, O M39/M43, S M119 | Zwei Beschreibungen von Ossens Schmerz und der Bedrohung fehlen. Der tatsächliche Standpunkt am Eingang kommt in O hinzu, die Gegnerhaltung fehlt im späteren Zug. In S bleibt der kürzere Preisfakt, der Wundpflegehinweis fehlt. |
| Pine M23 | Die gültigen Teile führen Alaric und Ossen in 60 Reiseminuten zum Dungeon. Auf .251 endete die Verarbeitung ohne Buchung. |
| Reed M23 | Die Erstantwort hat unter anderem einen zusätzlichen Root-Schlüssel. Ohne gebuchte Aktion findet keine Reparatur statt. Information über die Stiefelspuren, Wissen und Thread fehlen. Dieser Nachteil ist für die Fortsetzung des Gesprächs relevant. |
| Vale M25/M35 | Ossens erneuter Eintritt fehlt. Im späteren Abschnitt werden beide Gegner angelegt, die gesonderten Wahrnehmungsbuchungen aus der früheren Reparatur fehlen. |

**T3.** 2.235 Nachrichten, davon 2.035 identische Ausgaben gegenüber .251. Die einmalige Neubewertung umfasst **4 semantische Änderungen, 165 Darstellungs- oder Protokolländerungen, 31 mechanische Wirkungen und 0 ungeklärte Fälle**. Gegen die ursprüngliche .126-Referenz liegen 1.392 genaue Abweichungen vor. 1.192 stimmen weiter mit ihren schon vor diesem Paket akzeptierten Fingerprints überein. Für die übrigen 200 hält das neue Manifest den Grund und den genauen Fingerprint fest, bei abgelösten Einträgen auch den Vorgänger. Sämtliche früheren Manifeste sind erhalten. [Einzelentscheidungen und Fingerprints](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c2abc94abc38a1c61fdfbd54e07bb26e760307a7/avereth-engine/tests/replay/accepted_claim252.json)

**Spielerische Grenzen der Teilübernahme.** In b17-warrior#284 erreicht Alaric die Lichtung, der tatsächlich erzählte vierte Wolf wird wegen eines ungültigen Deltatyps der Erstantwort kein angreifbares Ziel. In b17-warrior#274 fehlt der zusätzliche begehbare Link unter der Platte. In b18-warrior#64 fehlt der beschriebene Keiler. Bei diesen Antworten bleiben gebuchter Such- beziehungsweise Reiseabschluss gültig. Die frühere Zusatzreparatur lieferte in diesen Fällen eine bessere Welt. Bei Pimm (b17-warrior#182) und Garrick (x-233 M71) zeigt sich die Gegenrichtung: X kann eine bekannte lebende Figur trotz räumlich unpassender Beschreibung in die Szene aufnehmen. Diese Nachteile sind im Diffreview und in einer später gegebenenfalls freigegebenen natürlichen Abnahme zu berücksichtigen.

### Abnahmematrix des Kandidaten

| Prüfung | Ergebnis |
|---|---|
| Vollständiges `npm test` | 3.635/3.635 bestanden, 0 fehlgeschlagen, übersprungen oder abgebrochen. Auf unveränderter .251 waren es 3.609/3.609. |
| `npm run replay:check -- --categories` | 2.235 verglichen, 0 offene Abweichungen, 0 veraltete Freigaben, 0 Replay-, Fold- oder Validierungsfehler. Auch die Manipulationsproben für Geld, Quests und Ereignisreihenfolge bestehen. |
| Zielkorpus `tests/v4/claim_state252.test.js` | 43/43 bestanden. Er enthält die archivierten Anwesenheits- und Ortsbeispiele sowie gezielte Zustands-, Preis- und Teilübernahmeproben. |
| Isoliertes SillyTavern 1.19.0, Chromium, lokaler Mock | `party217` 44/44, `scene221` 33/33, `trade_hud` 41/41, `action_saves` 60/60, `narrator_streaming` 59/59. Der Streamingmodus umfasst regulären Abschluss, Abbruch, Verbindungsverlust, Reload und Recovery. |
| Natürlicher Modelltest und persönliches ST-Profil | Nicht ausgeführt. Die Modellantworten stammen aus Archiven oder aus dem isolierten Mock. |

Bei den Zwischenläufen auf .257 brach der erste Party-Smoke beim Verbindungsaufbau zum lokalen Host ab. Seine Wiederholung bestand. Ein Streaminglauf auf demselben Zwischenstand erreichte 58/59, da ST selbst ein `Stale chat snapshot` aus `saveChat` als Seitenfehler protokollierte. Die Abnahme auf .260 umfasst den Seitenfehler-Check.

Die ST-Modi lassen sich im Produktverzeichnis mit `npm run smoke:st:check` und anschließend `npm run smoke:st:isolated -- --mode <Modus>` in einer markierten Sandbox ausführen. Die Host-Prüfungen verwenden User13/User14 und die User16-Präfixe aus der Szenenabnahme. Die historische T1/T3-Basis, die Originalarchive und der Design-Kanon wurden für diese Abnahme nicht umgeschrieben.

**Installation nach Freigabe.** Den vollständigen Extension-Ordner `avereth-engine` aus dem Produktcommit in der bisherigen SillyTavern-Installation aktualisieren und den Browser neu laden. In „Manage extensions“ muss `4.3.0-c.6.6.260` erscheinen. Für einen gezielten Dateiabgleich gegenüber .251 sind die Laufzeitdateien `manifest.json`, `package.json`, `content/deltas.json`, `src/util.js` und unter `src/v4/` die Dateien `commands.js`, `extract.js`, `finance_evidence.js`, `known_routes.js`, `living.js`, `movement.js`, `narration_evidence.js`, `private_jobs.js`, `runtime.js`, `turn.js` und `world.js` betroffen. Card, Preset, Lorebook, Regex und Narrator Contract benötigen keinen zusätzlichen Import. Die technischen Zwischenbuilds werden durch diesen Kandidaten ersetzt.

Etappe F und kostenpflichtige Modellabnahme: **nicht ausgeführt**, Providerkosten 0 USD. Der nächste Entscheidungspunkt ist der unabhängige GPT-Diffreview.
