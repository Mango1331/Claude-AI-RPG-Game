# Validierungsvereinfachung V1 · Stopp vor dem ersten Produktpatch

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
