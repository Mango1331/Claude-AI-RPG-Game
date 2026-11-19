# Avereth .203 · Phase 1 · Natives Narrator-Streaming

## Ergebnis des Konfigurationsvergleichs

**Für einen persönlichen Spielstand empfehle ich natives Streaming auf unveränderter .203 derzeit nicht.** Alle vier Versuchspaare lieferten früher sichtbare Prosa, denselben Endtext, dieselben Spielereignisse und denselben gefalteten Weltzustand. Zwei Fehlerformen konnten jedoch aus dem ersten Satz einer abgebrochenen Erzählung eine gespeicherte Weltänderung machen. Die Fähigkeit zur nativen Darstellung ist damit belegt. Für eine persönliche Erprobung fehlt der sichere Umgang mit solchen Antworten.

## Gegenstand

Die Ausgangsversion ist `experiment/action-hud-200-v1` bei `5e5b8272412b51b91f75b6e37c5b94d95c9fae11`. Untersucht wurde Versuch 1a des Forschungsberichts auf `main` bei `fa343c8d`. Alle unten ausgewiesenen Messläufe verwenden den lokalen Custom-Chat-Completions-Mock in der markierten ST-Sandbox. [Forschungsbericht, insbesondere §§ 3, 7.1 und 9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fa343c8dde106666a0a4c09cb1e4b07c0a6ef93c/recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md)

Das Preset „Avereth Narrator V4“ enthält `stream_openai: false` und `openai_max_tokens: 4096`. Für den Streamingarm genügt im ST-Profil der Schalter **Streaming** unter Chat Completion. **Smooth Streaming** in den Benutzereinstellungen bleibt aus (`power_user.smooth_streaming: false`). Die Versuche setzen diese Werte in der Sandbox vor dem jeweiligen Zug. Die Ausgabegrenze beträgt in beiden Armen 4.096. Avereth schickt seine strukturierten Planner-, Board- und Extractor-Anfragen über den Custom-Pfad mit `stream: false`. Im untersuchten Spielzug traten Planner, Narrator und Extractor (X) auf. Die Änderungen des Branches betreffen den Mock, die Messung und die Dokumentation. [Preset](../presets/Avereth%20Narrator%20V4.json) · [Hostadapter](../index.js) · [SSE-Verarbeitung in ST 1.19.0](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/sse-stream.js#L381)

## Messverfahren

Der bestehende C-Smoke erstellt eine Kampagne und spielt den Eintritt in den Bau der Barkskorpione. Jeder Vergleich startet vom selben gespeicherten Chatpräfix vor dieser Aktion, mit demselben Kampagnenseed, derselben Spielereingabe, demselben Prompt und derselben Antwort. Pro Zeitplan wechseln die Arme ihre Reihenfolge. Das sind Wiederholungen einer Szene innerhalb einer Sitzung. Im Erfolgsfall erzeugt die Narration überprüfbare Weltfolgen, darunter Ankunft und Gegner. Der Vergleich prüft den vollständigen gefalteten Zustand sowie Spieler- und Antwortereignisse. Bei den Ereignissen werden ausschließlich die Messzeiten `cmd.interpreted.d.ms` und `extract.applied.d.ms` für den Vergleich ausgeblendet. [Versuchsmodul](../tools/st_live/narrator_streaming_smoke.mjs)

Der Mock sendet im Streamingarm zuerst die Rolle, nach 30 ms Reasoning, nach 180 oder 950 ms den ersten vollständigen Prosasatz, nach 1.350 ms den nächsten Teil und nach insgesamt 1.800 ms den Rest mit Abschluss. Im gepufferten Arm liefert er denselben Text nach 1.800 ms auf einmal. X wartet in beiden Armen künstlich 1.200 ms. Diese Vorgaben gelten ab Eingang beim Mock. Die Browseruhren starten bereits mit dem nativen Sendeklick, also vor dem Planner.

- **Erster Satz** erfasst den ersten Animationsframe, in dem der vollständige Satz im sichtbaren Chatbereich liegt. Rollenpaket, Reasoning, Ladeanzeige und HUD erfüllen die Bedingung nicht.
- **Prosaende** erfasst den ersten Frame mit dem vollständigen Text im gerenderten Nachrichtenkörper. Die Rohdaten enthalten zusätzlich das ST-Ereignis `MESSAGE_RECEIVED`, wie es der nach der Engine registrierte Listener beobachtet.
- **Sicher weiter** erfasst den ersten Frame mit vollständig angewandtem X, sichtbarem Sendeknopf und dem Status „Gespeichert“. Die Prüfung verlangt eine erfolgreiche Bestätigung des Weltjobs einschließlich Read-back. Während X versucht der Test, den Entwurf `#status` über den Sendeknopf abzuschicken. Er muss im Eingabefeld bleiben und sich nach Freigabe über denselben Knopf als lokaler Folgeturn absenden lassen.

Die Zeiten haben die Auflösung der Renderframes. Die bestehende Browserregression verzögert gezielt das native Speichern sowie den verifizierenden Lesezugriff und injiziert einen fehlgeschlagenen Read-back. Persönliche Lesedauer, Providerdurchsatz, Abrechnung und Verlauf der natürlichen Tokenproduktion wurden nicht gemessen.

## Zeiten im Browser

Alle Angaben in Millisekunden ab Sendeklick. Die acht Zeilen stehen in der tatsächlichen Laufreihenfolge. „Erstes Paket mit Prosa“ bezeichnet den geplanten Ausgabezeitpunkt im Mock. Der gepufferte Arm wartet bis 1.800 ms mit der Auslieferung.

| Paar | Erstes Paket mit Prosa, ms | Narrator | Erster Satz im Chat sichtbar | Prosa vollständig gerendert | Sicher weiter nach X und Read-back |
|---|---:|---|---:|---:|---:|
| 1 | 180 | gepuffert | 2.215 | 2.208 | 3.509 |
| 1 | 180 | SSE | 491 | 2.137 | 3.449 |
| 2 | 950 | SSE | 1.228 | 2.100 | 3.488 |
| 2 | 950 | gepuffert | 2.174 | 2.149 | 3.513 |
| 3 | 180 | SSE | 468 | 2.123 | 3.546 |
| 3 | 180 | gepuffert | 2.163 | 2.149 | 3.447 |
| 4 | 950 | gepuffert | 2.185 | 2.179 | 3.491 |
| 4 | 950 | SSE | 1.255 | 2.127 | 3.558 |

Paarweise erschien der erste Satz bei frühem Prosapaket 1.724 und 1.695 ms früher, bei spätem Prosapaket 946 und 930 ms früher. Das vollständige Rendern lag im Streamingarm 26–71 ms früher. Die sichere Freigabe lag zwischen 60 ms früher und 99 ms später. Bei vier Paaren derselben Szene trägt diese Streuung keine Aussage über eine schnellere Zugfolge. Im gepufferten Arm kann der vollständige Nachrichtenkörper einen Frame vor der abgeschlossenen Scrollbewegung in den sichtbaren Bereich gerendert sein.

Die physischen Aufrufe jedes erfolgreichen Zuges waren genau Planner, Narrator, Extractor. Der bereits während X versuchte Folgebefehl blieb bei allen acht Zügen im Eingabefeld erhalten und konnte nach der Bestätigung genau einmal gesendet werden. Swipe und Regenerate erzeugten jeweils eine neue Narration und eine Extraktion. Spielerereignisse, Anzahl der Spielerzüge und gefalteter Endzustand entsprachen dem Original. Der anschließende Chat-Reload bestätigte den Text und die Ereignisse der ausgewählten Revision.

## Fehler, Unterbrechungen und Entwürfe

Jeder Fehlerfall öffnet den vorbereiteten Chat in einem getrennten Browserkontext mit eigener Belegungstabelle. Der Reload innerhalb eines Falls behält denselben Speicherbereich. Vor diesem Test-Reload wird kein zusätzliches Speichern erzwungen. „Gesperrt“ bedeutet, dass der Test einen Sendeversuch unternimmt und den Entwurf und den unveränderten Zähler für Spielerzüge kontrolliert hat. P steht für Planner, N für Narrator und X für Extractor.

| Fall im lokalen Mock | Beobachtung im Host und nach Reload |
|---|---|
| Gepufferter Narrator, Fehlerobjekt statt Antwort | P und N. Keine Prosa, kein X. Der Abschluss blieb unbekannt, der Folgezug gesperrt und die Figur am Ausgangsort. |
| SSE-Fehler vor erster Prosa, danach `[DONE]` | P und zwei N. Die vorhandene Leertext-Recovery versuchte genau eine Wiederholung. Auch der zweite Versuch blieb leer. X wurde übersprungen, der Spielerzug blieb einmal gebucht. |
| SSE-Fehler **nach** dem ersten Satz, danach `[DONE]` | P, N, X. Die Figur wechselte nach `loc.the_old_burrow`. Sechs Antwortereignisse einschließlich `scene.moved`, `time.advanced` und `extract.applied` wurden gespeichert. Der Reload bestätigte den Ort und die Teilprosa. |
| Ungültiges JSON **nach** dem ersten Satz, danach `[DONE]` | Ebenfalls P, N, X und dieselben sechs Ereignistypen auf der unvollständigen Antwort. Auch dieser Ortswechsel überstand den Reload. |
| Sauberes EOF nach dem ersten Satz ohne `[DONE]` | Belegung unbekannt. Es erreichte kein X den Mock. ST behielt die Teilprosa, Avereth speicherte `extract.failed`. Der Folgezug blieb gesperrt. |
| Voller Text mit `finish_reason: stop` und EOF ohne `[DONE]` | Der lesbare Endtext genügte dem Belegungsnachweis nicht. Der Reload bestätigte die Sperre und den Ausgangsort. |
| Abgerissener Upstream-Socket nach dem ersten Satz | Im Beobachtungsfenster blieb der Narratorplatz aktiv. Der Status zeigte bereits „Gespeichert“. Nach Reload war die Teilprosa weg, die Belegung ungeklärt und der Folgezug gesperrt. Eine obere Schranke für die automatische Erholung ohne Reload wurde nicht gemessen. |
| Nativer Stop bei offenem Stream nach dem ersten Satz | Kein weiterer physischer Modellaufruf. Die Teilprosa und `extract.failed` standen nach Reload im Chat. Der Ausgangsort und die Sperre blieben erhalten. |
| Vollständiger Seiten-Reload bei offenem N, gepuffert und SSE | Ein Enter-Versuch während N ließ den Text vor der Navigation im Eingabefeld. Direkt nach dem ersten vollständigen Reload war dieser ungesendete Entwurf in beiden Armen leer. Der Spielerzug war weiterhin genau einmal gebucht. Die Belegung blieb ungeklärt und ein neuer Sendeversuch wurde abgefangen. |

Die beiden roten Fälle betreffen die Zulässigkeit der ersten Extraktion auf Teilprosa. Die Prüfungen fanden keine doppelte Buchung des Spielerzugs. Bei offener oder verwaister Belegung blieb der Entwurf nach einem blockierten Sendeversuch im aktuellen Dokument erhalten. Die manuelle Freigabe eines unbekannten Providerabschlusses wurde in diesen Browserfällen nicht betätigt. Die vorhandenen Node-Tests decken die einmalige Freigabe sowie die Sperre nach einem weiteren Kapazitätsfehler ab.

## Warum Teilprosa zur Weltänderung werden kann

ST liest den nativen SSE-Stream und rendert die wachsende Nachricht. Sowohl `[DONE]` als auch EOF beenden die Leseschleife. Ein Fehlerpaket oder ungültiges JSON kann den Fehlerpfad auslösen. Für eine normale Generierung sendet `onErrorStreaming()` dabei ebenfalls `MESSAGE_RECEIVED`. Die getrennte Avereth-Belegungsprüfung liest eine Kopie der Antwort. Sobald sie die Zeile `data: [DONE]` gesehen hat und der Transport endet, gibt sie den Providerplatz frei. Das bestätigt den Transportabschluss. Ob ST die vorigen Daten fehlerfrei als vollständige Narration übernommen hat, wird an dieser Stelle nicht erfasst. [ST-Leseschleife](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js#L3161) · [ST-Fehlerpfad](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js#L3820) · [Belegungsprüfung](../src/v4/request_control.js)

Der Handler für `MESSAGE_RECEIVED` prüft die Prosa, speichert die Antwortrevision und startet ihren Extractor. Der spezielle Fetch-Recovery-Pfad für einen vorübergehenden Narratorfehler gilt für gepufferte Anfragen. Die bestehende begrenzte Recovery für eine *leere* Erzählung kann auch bei Streaming greifen. Entscheidend für die Abnahme ist der Fall mit *lesbarem* Teiltext. Der Fehler wurde im Mock innerhalb des SSE-Datenstroms injiziert. Als Antwort auf eine etwaige X-Anfrage zur Teilprosa liefert der Mock nur die Ankunft, die sich aus dem ersten Satz lesen lässt. Die Gegner aus dem fehlenden Rest der Erzählung sind in dieser X-Antwort ausgelassen. [Avereth-Host](../index.js) · [Weltjobs und Revisionsbindung](../src/v4/world_jobs.js)

Eine sichere Korrektur müsste den Abschluss der **konkreten Narratorrevision** vor der Extraktion prüfen und den Status bei Stop, Swipe und Reload erhalten. Eine zusätzliche Freigabeprüfung allein in der Providerbelegung deckt den beobachteten Fall mit regulärem Transportende nicht ab. Der Branch hält den reproduzierbaren Gegenversuch für den unabhängigen Review fest.

## Prüfstand und Abnahme

ST 1.19.0 lief bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` mit Chromium `156.0.8078.79` und Node `24.22.1`. Der maßgebliche Streaminglauf prüfte den sauberen Testcommit `342779c828697477f0c563bb5df107590c3b07c3`. Die Maschinendaten enthalten den Seed, die Hashes der Testquellen, alle acht Zeitspuren, die X-/Read-back-Zeiten und die zehn Fehler- oder Kontrollfälle. [Technische Ergebnisse](NARRATOR_STREAMING_PHASE1_RESULTS.json)

| Neu ausgeführte Prüfung | Ergebnis |
|---|---|
| Node-Gesamtsuite | 3.398/3.398 bestanden, keine übersprungenen oder abgebrochenen Tests. |
| Node-Fokus auf Belegung, Persistenz, Weltjobs und User05 | 54/54 bestanden. Diese Fälle gehören auch zur Gesamtsuite. |
| Replay gegen die hinterlegte .126-Baseline | 2.235 Fälle, 1.131 exakt hinterlegte Abweichungen, 0 neue Abweichungen, 0 veraltete Akzeptanzen. |
| Bestehender ST-Modus `user05_review` | Erster Lauf 107/108. Beim Start gab es HTTP 500 und einen JSON-Parsefehler im Browser. Die genaue Ursache des ersten HTTP-Fehlers ist offen. Die Wiederholung im initialisierten Profil bestand 108/108 mit 0 PageErrors. Beide Läufe verzeichneten je 62 Mockcalls. |
| ST-Modus `narrator_streaming` | 54/56 bestanden. Die zwei roten Prüfungen `error-afterBookings` und `malformedBookings` weisen die nach Reload erhaltene Buchung der Teilprosa nach. Der Runner beendete den vollständigen Browserlauf mit Exitcode 1. |

Die Providerprüfung registrierte höchstens eine gleichzeitig aktive physische Anfrage mit vier Mock-Kapazitätseinheiten, keine kapazitätsbedingte Zurückweisung und am Ende null belegte Einheiten. Eine gesperrte Belegung im Browser kann über den Abbruch oder Abschluss der tatsächlichen Verbindung beim Anbieter hinaus bestehen. Der Test misst diesen Zustand nur am lokalen Mock.

Die historischen User05-Zeiten auf .202 und die ursprüngliche .203-Abnahme aus dem Forschungsbericht sind Hintergrund. Keine frühere Zahl fließt in diese Abnahme oder in die Zeitpaare ein. In der Voruntersuchung erkannte der Vergleich roher Ereignishashes auch die variierende Planner- und Extractor-Zeit als Unterschied. Die obige Auswertung gleicht die Spielereignisse mit der beschriebenen Ausnahme für diese beiden Messwerte ab. Ein vorgeschalteter Lauf mit derselben gültigen X-Antwort reproduzierte die beiden unzulässigen Buchungen ebenfalls (52/54 Checks). Die hier verlinkten Einzelmessungen stammen vollständig aus dem abschließenden Lauf.

## Reproduktion

Vom Experimentbranch im Verzeichnis `avereth-engine` ausführen. Der vorhandene isolierte Runner akzeptiert nur eine markierte Sandbox, verwendet den gepinnten ST-Host und startet seinen eigenen lokalen Mock. In der Cloud liefen die Browserprüfungen mit `AVERETH_ST_SANDBOX=/workspace/avereth-setup/st-sandbox` und `AVERETH_CHROMIUM_EXECUTABLE=/usr/bin/chromium`.

```sh
npm test
npm run replay:check
node --test tests/v4/action_request_control.test.js tests/v4/action_persistence.test.js tests/v4/patch10b4c2_world_jobs.test.js tests/v4/user05_qol.test.js
npm run smoke:st:isolated -- --mode user05_review
npm run smoke:st:isolated -- --mode narrator_streaming
```

Der Streaminglauf schreibt `narrator-streaming.json` mit den Einzelzeiten und den Zuständen vor und nach Reload, daneben das bestehende `result.json` mit den Prüfentscheidungen. Ein erkannter unsicherer Spielstand führt zu einem fehlgeschlagenen Check und einem Exitcode ungleich null. Diese Prüfungen sollen eine spätere Korrektur am gleichen Fall messen.
