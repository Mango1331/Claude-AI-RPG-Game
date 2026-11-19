# Unabhängiger Gegenreview · Avereth .203 Performancezyklus 2

**19.11.2026 · GPT-6 · unabhängige Code- und Evidenzprüfung.** Gegenstand ist [`experiment/203-performance-cycle2`, HEAD `6d9770f9b31e78d37567719bf1c06d8a4942288c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6d9770f9b31e78d37567719bf1c06d8a4942288c) gegenüber [B-Suite `8df38d3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8df38d3fe4b62eafc2b746ada81e5f2470956dea). [Originaler Fach- und Testbericht](AVERETH_203_PERFORMANCE_ZYKLUS2_2026-11-19.md) · [Cachebericht](AVERETH_203_FEATHERLESS_CACHE_ZYKLUS2_2026-11-19.md) · [maschinelle Daten und Reproduktionsanleitung](performance_cycle2_203/README.md).

## Entscheidung

**GO für B1, B2 und B3 auf dem Experimentbranch als nächster optimierter B-Kandidat.** Keine weitere verpflichtende Codekorrektur aus den geprüften drei Diffs festgestellt. **Kein Produktmerge, kein generelles Gameplay-GO und noch kein natürlich gemessener Effekt von B3 bei neu generierten Modellantworten.** Die fachliche Torwachen-/Anwesenheitsfrage und der vollständige User06-Spielqualitätsreview bleiben außerhalb dieses Performancefixes offen.

**Nächster sinnvoller Arbeitsstand:** B3 `6d9770f` als B-Kandidaten konservieren, gegen die bisherige B-Suite vergleichen und bei nächster berechtigter natürlicher Erprobung gezielt auf die Häufigkeit der vermiedenen X-Reparaturen achten. Keine neue komplette Optimierungssuite oder breite JSON-Heuristik entwickeln.

## Unabhängiger Commit- und Implementierungsabgleich

Der per GitHub geprüfte Vergleich `8df38d3...6d9770f` umfasst exakt drei aufeinanderfolgende Commits und sechs geänderte Pfade: `src/v4/extract.js`, `guild.js`, `runtime.js`, `tests/unit/v4_extract.test.js` sowie die beiden Board-Testtreiber. Unverändert bleiben die S1-Streaming-Sicherheitslogik, B1-Einzelslotreparatur, Marktkatalog, Save-/Read-back-Mechanik, Character Description, Lorebook und ST-Preset.

| Paket | Codebefund | Urteil |
|---|---|---|
| **B1 `9758ce7`** | Die experimentelle Erstboard-Auslassung (`task`, `desired_end_state`) und deren Aufbereitung sind vollständig entfernt; der ursprüngliche vollständige Boardprompt ist wieder aktiv. Gezielter Slotrepair und Gesamtvalidierung bleiben. | **GO**. Die 42 Eingabetokens entfallen beim alten natürlichen B-Erstrequest. Kein nachgewiesener neuer Zeitgewinn. |
| **B2 `3aaeb58`** | `extractorSystem` endet nun direkt mit dem bestehenden `EXTRACT_PLAIN_FORMAT` (mit `scene`, `expected`, `deltas`). `extractorRequest` dupliziert das Format nicht mehr; der frühere verkürzte Zweischlüsselhinweis entfällt. Die übrigen Regeln, Parser, Firewall und Repair-Vorgaben bleiben. | **GO**. Nachgerechnete 14 Token pro X-Request; allein dieser Diff beweist keine bessere neue GLM-Ausgabe. |
| **B3 `6d9770f`** | `normalizeSoftFields` erkennt nur `object.new` mit exakt den drei äußeren Schlüsseln `seq,type,object` und ausschließlich im Typvokabular deklarierten inneren Nutzfeldern. Diese werden in die reguläre Form umgewandelt. Anschließend läuft die vollständige alte Schema-, Szenen- und Firewallprüfung. Zusätzliche, widersprüchliche oder unbekannte Felder werden nicht ungeprüft übernommen. | **GO als gezielte, begrenzte Normalisierung**, nicht als allgemeine JSON-Reparatur. |

**Technischer Sicherheitsbefund B3:** Die neue Behandlung findet vor der normalen Schemaüberprüfung statt. Ungültige Mengen, falsche Typen, unerlaubte Szenen- oder Sequenzangaben, ein falscher Deltatyp und zusätzliche unbekannte Nutzfelder werden im Unit-Gegenkorpus abgewiesen. Eine bereits enginegebuchte Gildenplatte bleibt durch die Firewall (`engine_booked`) geschützt. Die Entpackung erfindet weder Inhalt noch Sequenz. Die konkrete semantische Legitimität eines sonst gültigen `object.new` bleibt wie zuvor Aufgabe der vollständigen Weltprüfung.

## Reparaturwirkung und Evidenzgrenze

Der [Hostreproduktor `object_host.mjs`](performance_cycle2_203/object_host.mjs) startet den echten isolierten ST-1.19-Host, lädt denselben gespeicherten Chatpräfix und verwendet **identische archivierte** Antwort #30; nur bei Bedarf folgt Antwort #31. Die alte Version verarbeitet zwei, B3 einen physischen **Mock**-Aufruf. Sowohl vollständiger Zustand als auch alle fachlichen Ereignisse stimmen nach Save, Read-back und Reload überein. Nur `extract.applied.repaired` ändert sich absichtlich (true → false). Keine zusätzliche Modellaussage wird erfunden.

Die ältere reale Repairantwort #31 benötigte **40,197 Sekunden**. Daraus folgt: Für **diesen aufgezeichneten Fehler** wurde ein historisch teurer zweiter Request technisch vermeidbar. Die 40,197 Sekunden wurden **nicht** durch einen neuen natürlichen B3-Providerlauf eingespart. Andere neue Modellantworten, Häufigkeiten und Verzögerungen sind offen.

Die retrospektiv fixierten B-Hauptantworten benötigen rechnerisch statt 34 nur 33 Requests und **425.774 statt 441.259 Input-/Outputtokens**. Das ist **−15.485 Tokens** im Gegenfaktum, überwiegend durch den entfallenden Repair und nicht durch die beiden kurzen Promptkürzungen. Gegen die ursprünglich anders verlaufene A-Welt verbleibt eine rechnerische Differenz von **+4.392 Tokens**, ohne Aussage über zukünftige gleiche Spielabsichten. Ein gleicher Replayzustand belegt keine allgemeine semantische Vollständigkeit des Modells.

**Gemeldete Implementiererabnahme:** B3 3.411/3.411 Node, 2.235 Replays mit 1.131 exakten bekannten Abweichungen, ST 59/59 Streaming, 354/354 Standard und 360/360 Failsoft. Diese vollständigen Suites wurden beim Gegenreview nicht nochmals selbst gestartet. Ein früherer B1-Failsoft-Durchgang war wegen zweier von ST/Adapter zurückgewiesener *veralteter* Saves 359/360; diese Meldungen waren vor dem Schreiben, die nächste unveränderte Wiederholung und der kombinierte B3-Endstand waren grün. Die konkrete Ablaufreihenfolge dieses ersten Laufes ist nicht endgültig belegt. Wegen vollständiger Persistenzschranken und grüner Wiederholung ist daraus derzeit kein eigener Pflichtpatch abzuleiten; erneutes Auftreten im natürlichen Host gesondert erfassen.

## Caching – wichtige negative Entscheidung

Der [Cachebericht](AVERETH_203_FEATHERLESS_CACHE_ZYKLUS2_2026-11-19.md) reproduziert laut Implementierer **274/274 Promptlängen** tokenexakt. User04: **80/124** positive abgerechnete Cachemeldungen, User05: **0/64**, jüngster natürlicher A/B-Lauf: **0/86**. Die Daten enthalten ausreichend lange präfixgleiche und einmal sogar vollständig identische X-Eingaben; ein nur durch Card-vor-Lore behobener früher Präfixbruch erklärt die Nullserie **nicht**.

Featherless beschreibt `cached_tokens` als **zum vergünstigten Cached-Input-Tarif abgerechnete** Tokens und `usage.cost` als bei Abonnementplänen nicht angezeigte Gebühr. User04 hatte durchgehend Gebührenfelder, die jüngeren Nullserien keine. Das ist ein starker **Hinweis auf unterschiedliche Abrechnungs-/Meldesemantik**, kein Beweis einer bestimmten internen GPU-Cachepolitik oder einer veränderten Worker-/TTL-Konfiguration. [Offizielle Usage-Spezifikation](https://featherless.ai/docs/completions) · [Abrechnung](https://featherless.ai/docs/request-pricing-and-credits).

Die nichtgenerierende Planabfrage weist aktuell die Kategorie **Chat** nach. Laut [Anbieterangabe](https://featherless.ai/platform/inference-api) ist dieser Tarif für persönliche interaktive Nutzung und nicht für automatisiertes Benchmarking vorgesehen. **Kein neuer automatisierter Providerlauf auf diesem Chat-Zugang.** Das vorgeschlagene 18-Request-/0,10-USD-Protokoll ist ein späterer, gesondert freizugebender Plan für einen zulässigen Developer-/Benchmarkzugang, keine bestehende Testfreigabe. Keine zusätzlichen Provideraufrufe wegen bloß theoretischer Cachemöglichkeiten.

## Grenzen und nächste Arbeit

Die B3-Normalisierung löst einen formal eindeutigen Fehler, nicht die größeren fachlichen Präsenzfragen (User06-Torwache, natürlicher B-Müllerjunge). Der reale Modelltest zu Kampf, Questabgabe, Loot und Langzeit-NPC-Wissen ist nach dem zehnzügigen A/B-Bogen weiterhin begrenzt. X2-Kompaktvertrag bleibt standardmäßig aus und das Originalpreset bleibt Standard.

**Empfehlung:** B3 als nächsten B-Experimentkandidaten fachlich freigeben; zunächst keine zusätzliche Änderung. Wenn der Nutzer später eine Integration in die .203-Entwicklung will, separat und mit unveränderter A-Referenz, gezielten Replay-/ST-Tests und keinem stillen Produktmerge durchführen. Für erneute natürliche A/B-Messung zuerst Tarifberechtigung und eigenes Limit klären. Die isolierten Offline- und Mocktests können ohne Providerverbrauch fortgeführt werden.

**Reviewumfang:** GitHub-Commitdiffs, aktueller Extractorparser und Schema-/Firewallfolge, Testharness, Fachberichte und veröffentlichte Messwerte wurden gelesen und kritisch abgeglichen. Keine neue Node-/ST-Testsuite durch den Reviewer, keine Modellinferenz und kein Produktcode geändert. Dokumentationspflege auf `main` ist kein Produkt-GO.
