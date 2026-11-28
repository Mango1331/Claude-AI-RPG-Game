# Avereth .262 · Rangfähiges Fundament und Abnahme

**Entscheidung am 28. November 2026.** Der Kandidat ist für den unabhängigen GPT-Diffreview bereit. Die gemessene F-Mechanik und die fachlichen Modellnachrichten blieben stabil. Zwei echte Abenteuer mit Ossen erreichten einen gemeinsamen Sieg und zählten die Questarbeit. Die Zielwahl im Kampf und der Übergang vom Gespräch zur Party kosteten in beiden Läufen zusätzliche Eingaben. Der größte gemessene Skalierungseffekt stammt von vielen bekannten gleichrangigen Teilorten. Der E-Fachplan kann auf diesen Ergebnissen aufsetzen.

[Gesamtdiff .261 → .262](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/4b637c981459e1e5ff9f4bd480bc071723fe5bce...c665c59a313746e165a00a5f147c1aaeff7c0452) · [Korrigierte Untersuchungsmethodik](AVERETH_261_CLAUDE_BEWERTUNG_GPT_GEGENREVIEW_UND_NAECHSTE_SCHRITTE.md) · [Neue Modellläufe und Originaldaten](../testrun_10b/openrouter-20261128-fundament-262/README.md)

## Stände und Sicherung

Entwicklungszweig **experiment/211-openrouter-helper-single-runner**. Zu Beginn standen Remote und Produktversion auf 4b637c981459e1e5ff9f4bd480bc071723fe5bce und 4.3.0-c.6.6.261. Dokumentationsbasis war be20621d4c775d40e93008a912aebc5eda2aa20e. Während der Arbeit kam auf main der eigenständige F–S-Fachbeitrag 63db3b5e hinzu. Dieser Bericht setzt auf dessen Commit auf. Alle Produktzwischenstände wurden regulär gepusht und gegen die Branchreferenz geprüft.

| Commit auf dem Entwicklungsbranch | Inhalt |
|---|---|
| [12d55ebe89ac7ab60d4212232ff29354264d6432](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/12d55ebe89ac7ab60d4212232ff29354264d6432) | Originalkorpus, Zuordnungen, Referenz vom unveränderten .261-Produkt und Übergangsprüfungen |
| [ed500135cfe57aa0fc92d320cde51b98cdd42e34](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ed500135cfe57aa0fc92d320cde51b98cdd42e34) | Build .262, Rangparameter und ihre mechanischen und sprachlichen Verbraucher |
| [489b2cdab0ae491a3d0fed2a9ca4981736cac022](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/489b2cdab0ae491a3d0fed2a9ca4981736cac022) | Charakter-HUD. Fester Checkout des natürlichen Kandidatenlaufs |
| [6b6d30ceb07f1d32e5583e1b93703a588d2c541f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6b6d30ceb07f1d32e5583e1b93703a588d2c541f) | Skalierungs- und Progressionswerkzeuge, UI-Abnahme nach gespeichertem Spielzug |
| [2ed65e69bec917d2960b2f579b585947d4309bd2](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2ed65e69bec917d2960b2f579b585947d4309bd2) | Elternpräfixe, Abrechnungsprüfung, produktiver Planner für Größenmessung, Markt-Rang in der X-Formatregel |
| [c665c59a313746e165a00a5f147c1aaeff7c0452](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c665c59a313746e165a00a5f147c1aaeff7c0452) | End-HEAD. Ergänzte Testprüfung für Geldbelege, Träger und Queststatus, eigene Ausgabe für geänderte bekannte Fehler |

## Originalkorpus und Referenz

Der Import verifiziert die komprimierten Dateien anhand der Quellmanifeste. Er übernimmt 27 Archive aus der Serie .241–.251 und sechs frühere Läufe S, Y, AA, AI, AJ und AK für Besitz, Kampf, Dungeon und freiwillige Zusammenarbeit. Damit sind 33 ausgewählte Archive aus dem Zeitraum .222–.251 vertreten. Frühere Versuche und persönliche Chats dienen zusätzlich als Fallquellen. Eine geerbte Antwort erscheint höchstens einmal. Bisherige historische Manifeste, Originalfalltests und die Kettenprüfung sind erhalten.

Claudes Vorprobe ergab erneut **254/255** zugeordnete eigene Aufrufe. Bei 1.128 geerbten Aufrufen findet die damalige Suche 21 scheinbare Treffer. Der neue Import gleicht Zug, Rolle, Prompt-/Completion-Tokenzahl, Request-ID und Provider-Generation mit der physischen Antwort ab. Sage 263 trägt im Journal den Rollenstempel Narrator, sein Systemprompt beginnt mit dem Auftrag zum Benennen neuer Skills. Seine Antwort gehört zur Forge.

**Endbestand:** 298 eigenständige Verarbeitungsfälle und 307 zugeordnete physische Helferantworten. Darunter sind 126 Planner-Erstantworten, 8 Planner-Reparaturen, 128 X-Erstantworten, 38 X-Reparaturen, 4 Party-, 2 Board- und 1 Forge-Antwort. 275 der 307 kommen aus den 27 jüngeren Archiven. Sieben Helferaufrufe blieben außerhalb der eindeutigen Zuordnung. Pine 282/284/285 haben keinen zugehörigen verifizierten Zug. Fern 336/337 gehörten zur Wiederaufnahme, Y 267/268 zur erneuten Bearbeitung des Ausgangszustands.

Neuere Startchats wurden mit dem Elternpräfix verglichen. Auch bei den früheren Zweigen wurden Text, Rolle und gespeicherte Events abgeglichen. AA übernimmt ausdrücklich die ersten 42 Nachrichten von Y. AJ stammt aus AI, AK aus N, AI aus User14 und S aus User15. Y enthält die vorbereitete User16-Variante, Fern die Nachbearbeitung einer geerbten Nachricht. Die genauen Differenzindizes und der Hash der verwendeten Ausgangssequenz stehen je Lauf im Quellenindex. Der Replay führt jeden eigenen Verarbeitungsschritt auf seiner tatsächlich gespeicherten Vorgeschichte aus.

Auf dem unveränderten Produktcommit .261 wurde die Referenz erzeugt und wiederholt. Referenz und Kandidat verbrauchen jeweils 30 archivierte Folgeantworten nicht. In fünf Fällen verlangt .261 eine Antwortrolle oder Folgeantwort, die das jeweilige Original nicht hergibt: AA #43, AI #15, Ember #15, Rook #7 und #15. Der Offlineadapter meldet die Grenze und liefert keine erfundene Modellantwort. 293 Fälle erreichen ihren Prüfpunkt ohne diese Einschränkung. Die Stabilitätsaussage über alle 298 umfasst die fünf gleichartig begrenzten Pfade.

**Manifestklassen.** 295 Fälle sind „beobachtet“. Bei Reed #22/M23 gilt die lokale Behandlung des zusätzlichen Root-Felds mit der erhaltenen Information als „fachlich_bestätigt“. Vale #24/M25 und #34/M35 sind „bekannter_fehler_akzeptiert“ (fehlender erneuter Eintritt bzw. einzelne Wahrnehmungen). Änderungen dieser beiden Fälle erscheinen separat zur Bewertung. Die Referenz wird dadurch nie neu geschrieben. Verletzte Invarianten brechen auch dort die Prüfung ab. Änderungen regulärer Referenzfälle lassen den Vergleich fehlschlagen.

[Quellen- und Elternmanifest](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c665c59a313746e165a00a5f147c1aaeff7c0452/avereth-engine/tests/replay/modern/sources.json) · [Referenz je Fall und Request](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c665c59a313746e165a00a5f147c1aaeff7c0452/avereth-engine/tests/replay/modern/baseline.json) · [Vale-Befund](AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md) · [Reed-Gegenprobe](AVERETH_261_EXTRACTOR_RECOVERY_ABNAHME.md)

## Mechanische Invarianten

Der Runner verwendet die vorhandene Zustandsvalidierung, die Ownership-Prüfung beim Anwenden von Deltas und die Prüfung gespeicherter Eingaberevisionen. Jede neu entstandene Validierungsabweichung gegenüber dem übernommenen Präfix wird beanstandet. JSON-Speicherung plus erneute Faltung muss denselben vollständigen Zustand ergeben. Output, Welt und Requestnachrichten werden unabhängig verglichen. Die historische Kette prüft zusätzlich Kauf, Regenerate, Swipe, Reload und Buchungsreihenfolge.

Vor jedem Übergang prüft checkEvents Münzdifferenzen, zu bepreisten Käufen, Verkäufen und Gildenzahlungen passende Buchungen, eindeutige Split-IDs, gültige Teilmengen, konkurrierende Träger, XP-Arithmetik und Levelübertrag. Vergabe mit Quest-ID erfordert den zugehörigen erfolgreichen Abschluss und einen berechtigten lebenden Teilnehmer. Eine Gildenzahlung muss einmalig zum Auftrag und seinem Preis passen. Wartende Mitglieder dürfen sich an ihrem Warteort befinden. Weitere Prüfungen erfassen Auszahlungen an Verstorbene, vorherigen Queststatus, Zielort und rückläufige RNG-Zähler. Für die Erlaubnis zur Bewegung und die Entscheidungshoheit zählen die produktiven World-Gates und die bestehenden Originalfälle. Die Existenz eines Orts allein belegt keine Reiseentscheidung.

Manipulierte Belege scheitern unter anderem bei falschem Saldo, rechnerisch korrekten XP ohne gebundenen Questabschluss, fehlendem Kaufabzug, Kollision einer Split-ID, zwei Trägern, zweitem Abschluss, totem Empfänger, falschem Warteort, zurückgesetztem RNG, Edit einer bindenden Eingabe oder Geld-Event aus einem bloßen Fakt. Die Prüfschicht behält zulässige Schenkungen, Beute, private Zahlungen und ältere Fortschrittsquellen bei. Sie prüft keine beliebige Narration auf semantische Richtigkeit. [Prüfungen und Manipulationsproben](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c665c59a313746e165a00a5f147c1aaeff7c0452/avereth-engine/tests/replay/mechanical262.test.js)

## Rangfähige Verbraucher und erhaltene Kalibrierungen

| Fachgebiet | Umsetzung und Grenze |
|---|---|
| Outdoor-Level und Population | monsters.outdoor enthält das aktive F-Profil mit den fünf bisherigen Fenstern und dem Gefahrenhinweis. validEncounterLevels prüft exakte Fenster, validPopulationLevels erlaubt Unterbereiche innerhalb eines unterstützten Rangs. Der doppelte Fallback entfällt. |
| World und State | Area-Handler, Gebiets- und Populationsprüfung und Ablehnungsdiagnosen verwenden diese Profile. Standort, Beleg, Dungeonvorrang, bestehende Populationen und individuelle Gegner bleiben bindend. |
| Extractor und Narrator | indexContent bindet Area-Summary, Feldobergrenzen, Rangbezeichnungen und Markt-Rang an die geladenen Profile. worldVocab nutzt das indizierte Vokabular. context.js liefert den redaktionellen Gefahrenhinweis. Das F1-Referenztier für den nächsten **Körperplan** ist weiterhin F1. Es legt weder Individuallevel noch Gebietsrang fest. |
| Gilde und Board | Gildenrang ist Schlüssel des Boards. Das vorhandene rank_power verbindet ihn mit dem richtigen Machtrang. outdoor_boards.Novice trägt Outdoor-Freigabe, Texte, historische Quotenbänder und Vergütungshinweise. Board-Schema und Habitatprüfung lesen die Outdoor-Grenzen. Novice verwendet die bisher im Code wirksame Gesamtpreisleitlinie 30–600 cp. Proven besitzt keine neue Outdoor-Freigabe. Dungeonräumung und Beförderung haben eigene Regeln. |
| Lernquellen und Passive | Der Composer und die Prüfung etablierter Manual-/Steinprofile lesen composer.entry_rank, der Grundentwurf zusätzlich entry_complexity. Lehrberechtigung, LP und konkrete Quelle bleiben erforderlich. Kalibrierte Grenzen und Entwürfe für reguläre dynamische Passive verwenden den separaten passive_design.rank. |
| Ausrüstungsmarkt | gear.instances.market_rank gilt für reguläre Angebote, Erkennung, Namen und P/N/X-Markthinweise. Waffenpreise sind nach Rang indiziert. Beute und individuelle Gegenstände behalten ihren eigenen Rang. Historische F-Waffenwerte, F-Qualitätsfaktor und Fine-Schildwert sind Kalibrierungen. Ein künftiger Marktrang überträgt sie nicht automatisch. |
| Bewusst feste Einstiegs-/Altwerte | Fehlender Rang in älteren Item-/Skillprofilen, Starterkits, Anfänger- und Introquoten, F-Signaturentwicklung, F1-Körperpläne und illustrative P-Beispiele behalten ihre konkrete Bedeutung. Der Gildenschalter trennt Macht- und Gildenrang. Für Proven sind speziell Intro-, Reparatur-, Gefahren- und historische Quotenhinweise zu entscheiden, bevor man ein echtes Boardprofil aktiviert. |
| Bereits rangoffen | rankOf, defeatXp, questXp, Monsterskalierung, Levelübertrag, Loot aus dem Gegnerprofil, Sonderbelohnungen, Dungeon-Rollenspannen, die bestehenden E-Klassenschritte und E-Skillbudgets. Die technischen Änderungen aktivieren keine neuen E-Inhalte. |

**Rot/Grün.** Ein ausschließlich im Prozess geändertes Testpack setzt ein künstliches Fenster 22–23 und einen E-Testpreis von 123. Auf .261 bleiben das Fenster unzulässig, die Schemaobergrenze 14 und der Common Staff bei F/80. .262 liest das Fenster, den X-Vertrag, die Grenze 23 und E/123. Die produktive Konfiguration bleibt bei F. Weitere Tests entkoppeln Gildenprofil, Komplexität, Lernrang und Passivrang. [Gegenprobe](abnahme_262/rank_probe.mjs) · [Ausgaben beider Produkte](abnahme_262/rank_probe.jsonl)

**Altpfade.** Kein separater Legacy-Rückbau. Charaktererzeugung, Kampf, Schleichen und Faltung bedienen weiterhin aktuelle Pfade. Entfernen älterer Darstellungsfälle hätte für die Rangfähigkeit keinen belegbaren Nutzen gebracht.

## F-Requests vor und nach der Änderung

Der Offlinevergleich erfasst die Nachrichten beim tatsächlichen Aufruf der Produktfunktion, einschließlich Reparaturen. Für N setzt der Runner den vom aktuellen Produkt erzeugten Engine-Kontext in den eindeutig identifizierten Slot des archivierten ST-Umschlags ein. Card, Lore und äußere Chatnachrichten stammen dabei aus der Aufnahme. Im neuen natürlichen Vergleich liegt außerdem der physische HTTP-Mitschnitt beider Browserläufe vor.

126 P, 10 P-Reparaturen, 119 N, 128 X, 9 X-Reparaturen, 6 Party, 2 Board und 1 Forge ergeben **401 Nachrichtenpakete ohne Hashabweichung**. Verglichen werden die UTF-8-kodierten JSON-Nachrichten einschließlich Reihenfolge und Zweck. Das schließt die gebauten Anfragen an den fünf begrenzten Pfaden ein. Es sind keine bezahlten Wiederholungen. Beispiele sind Reed #17/18 (Siedlung), Heron #123/124 (Wildnis/Population), Rook #9/10 (Ausrüstung), Sage #105/106 (Lernen), Heron #115/116 (Board und Jagd), AA #44/45 (Dungeon) und Vale #31/32 (Party und Kampfkontext). Auch die tatsächlich an den Provider gelieferten ersten P- und N-Nachrichten der beiden neuen Läufe stimmen byteweise überein. Spätere unabhängige Erzählungen erzeugen unterschiedliche Kontexte. [Einzelne Requestsignaturen und Längen](abnahme_262/f-prompts.json)

## Skalierung auf dem Heron-Endstand

Node v24.22.1, Linux, AMD EPYC 9V74. Vier Aufwärmdurchgänge und 25 Messungen je Konfiguration. P und X sind mit den Produktfunktionen gebaute Requests. N verwendet den Heron-ST-Umschlag mit frisch gebautem Engine-Kontext. Gleiche Testhandlung und Erzählung zwischen den Größenstufen. Angegeben sind **UTF-8-Bytes** der serialisierten Nachrichten, keine Token. Die Zeit umfasst den gemeinsamen Aufbau einschließlich der Kataloge. Die Vergleichszustände sind synthetisch. „Mittel“ ist ein definiertes Lastprofil, kein aus Spielertelemetrie geschätzter Durchschnitt.

| Zusatz zum Original | P Bytes | N Bytes | X Bytes | Aufbau Median / P90 ms |
|---|---:|---:|---:|---:|
| Original | 57.805 | 55.629 | 62.571 | 4,45 / 4,83 |
| Mittel: 25 Sachen, 50 Teilorte, 20 anwesende NPCs, 5 Quests | 70.576 | 59.018 | 78.070 | 12,05 / 15,32 |
| 200 getragene Sachen | 69.785 | 55.629 | 74.551 | 4,23 / 4,74 |
| 1.000 gleichrangige bekannte Teilorte | 147.521 | 55.629 | 209.115 | 12,51 / 15,62 |
| 150 anwesende NPCs | 73.675 | 59.269 | 78.441 | 27,79 / 31,31 |
| 30 aktive Quests | 87.425 | 73.358 | 92.191 | 17,44 / 22,91 |
| Alle vier großen Zusätze zusammen | 204.991 | 76.998 | 266.585 | 124,67 / 163,41 |

Der serialisierte gefaltete Zustand wächst von 111.698 auf 425.078 Bytes. Die reinen P-/X-Kataloge wachsen von 7.000/9.344 auf 154.186/213.358 Bytes. Viele sichtbare NPCs und aktive Quests kosten ebenfalls Aufbauzeit. Der kleine Unterschied zwischen Original und isoliertem Inventar liegt in der Laufzeitstreuung.

Das Original umfasst 127 echte Chatnachrichten mit 971 aktiven Events und 670.540 serialisierte Bytes im kompakten Korpusformat. Zusätzliche 250 bzw. 1.000 synthetische Nachrichten tragen jeweils ein echtes Zeit-Event. Die tatsächlich gefaltete Uhr wurde geprüft. Die Chatgrößen steigen auf 698.430 und 782.430 Bytes. Die Foldmediane liegen bei 7,79 / 7,73 / 7,53 ms, die P90 bei 8,36 / 8,78 / 8,69 ms. Diese einfachen Ereignisse messen die Schleifen- und Nachrichtenkosten. Ein neuer Kampf, eine umfangreiche Inventartransaktion oder die Kopie für eine Partyrevision kann pro Event erheblich teurer sein. Gemessen wurden serialisierte Daten und Aufbauzeit, kein Browser-RSS. Der Test begründet Beobachtung der Kataloge bei längeren persönlichen Kampagnen. [Vollständige Messreihen](abnahme_262/scaling.json)

## Fortschritt bis Level 15

Von L1 mit 0 XP bis L15 sind **10.500 persönliche XP** erforderlich. Der Machtrang wechselt dann von F nach E. Der Gildenrang folgt seinem eigenen Beförderungsweg. Ein normaler Standardgegner auf L1/3/7/11/14 bringt bei gleichem F-Rang 60/180/420/660/840 Kampf-XP, vor Teilung und individuellen Stärkemodifikatoren. Ein Minor-Auftrag auf L1/7/14 bringt 115/790/1.575 XP, ein Standardauftrag 150/1.050/2.100 XP. Alle Werte stammen aus den Produktfunktionen.

Die Auszahlungssimulation verwendet defeatXp, questXp, splitPool und die vollständige Levelschleife awardXp für PC und gegebenenfalls NPC. Je Kampf wird ein regulärer Gegner besiegt, je Auftrag erfolgt ein erfolgreicher Turn-in. Das niedrige Szenario bleibt bei L1. Bei der zweiten Route ändert sich nach jeweils vier abgeschlossenen Aktivitäten der feste Gebiets-/Auftragslevel in der Folge 1, 3, 4, 7, 8, 11, 12, 14. Bis L3 sind die Aufträge minor, danach standard. Die Wege sind unabhängig vom PC-Level vorgegeben. Der Partner beginnt ebenfalls bei L1, überlebt und erwirbt durchgehend den gleichen Beteiligungsnachweis. Ob eine Partie diese Kämpfe gewinnt, ist eine Voraussetzung dieser Hochrechnung.

| Spielweise bis zum ersten L15 des PC | Solo bei L1 · Kämpfe / Aufträge | Solo auf der Route | Zweiergruppe bei L1 | Zweiergruppe auf der Route |
|---|---:|---:|---:|---:|
| Gilde, zwei Abschlüsse je Kampf | 36 / 73 | 6 / 14 | 72 / 144 | 9 / 19 |
| Erkundung, vier Kämpfe je Abschluss | 120 / 29 | 20 / 5 | 236 / 59 | 28 / 7 |
| Gemischt, zwei Kämpfe je Abschluss | 90 / 45 | 16 / 7 | 178 / 89 | 22 / 10 |

Beispiel für die Zwischenstufen der gemischten Route: Solo erreicht Alaric L5 nach 6 Kämpfen und 2 Aufträgen, L10 nach 10/5 und L15 nach 16/7 mit 275 Rest-XP. Im Duo sind es 7/3, 14/7 und 22/10. Beide erreichen dort L15 mit 3 bzw. 2 Rest-XP. Bei vielen kleinen ungeraden Einzelbeträgen erreicht der zweite Teilnehmer L15 etwas später. Das ist eine Folge der bestehenden stabilen Restverteilung. Berechnet sind XP, Level und NPC-Statvergabe. Reise-, Ausfall- und Beschaffungszeit sowie die Wahrscheinlichkeit für passende Aufträge werden nicht hochgerechnet.

Zwei unabhängige Plausibilitätsanker ergänzen die Rechnung. Der vorhandene Kampfsimulator führte 32 echte Engine-Kämpfe aus: drei Starterklassen gegen einen Wolf und ein Starterduell Warrior–Mage, je acht Seeds von 7 bis 14. In diesen vier begrenzten Konfigurationen gewann der PC 32-mal, durchschnittlich nach 2,63 bis 6 Runden. Das ist keine Simulation einer ganzen E-Kampagne. Der gefaltete historische Lauf S zeigt an Spieltag 2 L10 und 995 Rest-XP (5.495 verdient, 3.470 Kampf/2.025 Quest). Heron endet an Spieltag 3 bei L5 und 35 Rest-XP (1.035 verdient). Diese Archivstände enthalten ihre geerbte Vorgeschichte. [Levelverlauf je Aktivität](abnahme_262/progression.json) · [Kampfsimulation](abnahme_262/combat-smoke.csv) · [Archivmessungen](abnahme_262/observed.jsonl)

## Skillübersicht und Installation

Das Charakter-HUD zeigt pro bekanntem Skill eine eigene Zeile mit Rang, P-Stufe, aktuellen PP und Schwelle, Kosten unter Berücksichtigung der aktuellen Modifikatoren, bedingtem Munitionsbedarf, Reichweite, Raw-Power-Formel bzw. numerischer Wirkung. Ausrüstungstechniken behalten ihre Kennzeichnung als Waffenangriff. Die Einzelansicht über #skill liefert ausführliche Skalierung, Entwicklung und Proficiency-Modifikatoren. Im gespeicherten Kandidatenkampf waren für Flame Lance danach P1, 18/75 PP, 16 MP und LONG sichtbar. Das Rendern liest den gefalteten Zustand. Später denkbar ist ein lokaler Direkteinstieg von der Skillzeile in die vorhandene Detailansicht. Weitere native Aktionen und größere Inventaränderungen benötigen einen eigenen Auftrag.

Nach Freigabe den **gesamten Extensionordner avereth-engine** aus dem verlinkten Endcommit in der vorhandenen ST-Installation aktualisieren (typisch public/scripts/extensions/third-party/avereth-engine). Content, manifest.json und src gehören zusammen. ST/Browser neu laden, in der Erweiterungsverwaltung **4.3.0-c.6.6.262** prüfen und die Charakterübersicht öffnen. Card, Preset, Lorebook, Regex, Narrator Contract und Save benötigen keinen Austausch. Die Tests verwendeten ausschließlich isolierte Profile.

## Technische und natürliche Abnahme

| Prüfung | Ergebnis |
|---|---|
| Vollständige Node-Suite | 3.654/3.654 auf dem endgültigen Produktcommit c665c59a, keine übersprungen. Originalereignisse und Manipulationsproben zusätzlich separat bestanden. |
| Historische Replay-Suite | 2.235 mit der .126-Referenz verglichen. 1.392 bereits dokumentierte Abweichungen stimmen exakt mit dem vorhandenen Manifest überein. Null neue Abweichungen, null überholte Ausnahmen und null Foldfehler. Frühere Planner-/X-Fehler in den Originalpfaden sind Bestandteil des Vergleichs. |
| Modernes Replay | 298 geprüft, null Änderungen in Output, Welt oder fachlichen Requestnachrichten. Auch keine Änderungen in den zwei akzeptierten Fehlerfällen. Fünf begrenzte physische Pfade siehe oben. |
| Gezielte Gegenproben | 61 kombinierte Schema-, Gebiet-, Markt-, Rang- und Extractorchecks auf dem ersten Produktstand. Neue synthetische Konfiguration mit positivem und negativem Kontrollarm. Bestehende Revisions-, Party-, Quest- und Eigentumstests sind Teil der Node-Suite. |
| Isoliertes SillyTavern 1.19 / Chromium / Mock | Basispfad 26/26, Gildenboard 57/57, Handel einschließlich der gespeicherten Skillübersicht 42/42. Wiederholung des Handels-Smokes auf dem Schlussprodukt bestätigt. Ein erster HUD-Test suchte auf der Erstellungsmeldung schon eine Charakteransicht. Die Prüfung wurde in den tatsächlichen Handelspfad nach Kauf und Reload verlegt. Ein erneuter ST-Start traf einmal auf einen lokal nicht erreichbaren Port. Der isoliert neu gestartete Lauf bestand. |

Reproduktion im Extensionordner: **npm test**, **npm run replay:check**, **npm run replay:modern**. Das neue Korpus kann mit **python tools/replay/build_modern.py** und den beiden Argumenten *testrun_10b-Verzeichnis von main*, *Ausgabeverzeichnis* neu aufgebaut werden. **node tools/replay/scaling262.mjs** und **node tools/sim/progression262.mjs** erzeugen die Messdateien. Die ST-Modi heißen base, board_slot und trade_hud. [Maschinenlesbare technische Ergebnisse](abnahme_262/technical.json)

### Natürlicher A/B-Lauf

Zwei feste Checkouts, GLM-5.3-Flash über OpenRouter/Wafer, isoliertes ST 1.19, identischer Elternzustand aus AI mit 15 Nachrichten. Jeder Schritt wurde bis zur bestätigten Speicherung geprüft. Für die gezielte Kampfhandlung wurde je der eigene gespeicherte Endstand neu geöffnet und vor dem ersten weiteren Request gegen den Elternlauf geprüft. Ein gemeinsames serielles Kostenjournal reservierte vor jedem physischen Request eine Obergrenze und rechnete die Antwort anhand der Generation-ID und Provider-Usage ab.

| Messgröße einschließlich Kampffortsetzung | .261 | .262 |
|---|---:|---:|
| Spielereingaben / mit Narrator | 12 / 8 | 12 / 10 |
| P / N / X / Party | 11 / 8 / 8 / 1 | 11 / 10 / 11 / 1 |
| X je erzähltem Zug | 1,00 | 1,10 |
| Input- / Outputtokens | 376.409 / 8.273 | 445.463 / 10.512 |
| Tatsächliche USD | 0,017144786 | 0,020340166 |
| Nach Narrator-Ende bis bereit, Median | 3,642 s | 3,620 s |
| X-/Weltvalidierung, Median | 3,529 s | 3,415 s |
| Letzte HUD-Neudarstellung relativ zum Weltcommit, Median | +0,017 s | +0,023 s |
| Speichern und Rücklesen, Median | 0,095 s | 0,192 s |

Gesamt **0,037484952 USD** bei freigegebenen **1,00 USD**. Alle 61 Starts haben ein abgerechnetes Ende. Der Kosten-Gateway wurde beendet. Die Zeit nach Narrator-Ende wird wie im jüngeren Claude-Bericht über ready minus (worldCommit minus extraction_validation_wait_ms) geschätzt. Die Mediane stammen von acht bzw. zehn erzählten Zügen und dürfen nicht addiert werden. Es wurde keine kausale Beschleunigung durch .262 nachgewiesen.

Beide Arme begannen mit 30 cp, bildeten durch die native Einladung eine echte Party, kauften eine Ration, kehrten zum Clerk zurück und betraten die erste Kammer des Old Crown Dungeon. Die unabhängigen Angebote kosteten 4 bzw. 5 cp. Die erste allgemeine Marktansage auf .261 löste eine Rückfrage zur Ware aus, der Gang zum Anbieter reichte anschließend. Auf .262 wurde der Markt schon mit der ersten Bewegung erreicht. Die erste frei formulierte Partyfrage ergab beidseits noch keine Mitgliedschaft. Party-X als zusätzliche Bestätigung der Erzählung wurde verworfen. Auf .262 war der erste X-Text ungültiges JSON und wurde einmal repariert. Es gab keinen Transportretry oder doppelt gebuchten Kauf.

Die ungenaue Ansage zum nächsten sichtbaren Untoten führte auf der Basis zweimal zur Zielrückfrage. Auf dem Kandidaten erzählte der Narrator zunächst einen Angriff ohne entsprechenden Kampfabschluss, anschließend zeigte die Engine die beiden gültigen Ziele an. Der Testspieler nannte schließlich eine eindeutige Gegner-ID. In beiden Saves waren danach beide konkreten Risen Bones tot. Je 90 XP gingen an Alaric und Ossen, die beiden Beuteposten Bone und Grave Dust lagen bei Alaric und gemeinsame Questarbeit war für den ersten Abschnitt verbucht. Alaric stand bei L1, 90/100 XP und 56/72 MP. Der Auftrag blieb aktiv und ist fortsetzbar. Die Serie hat keinen vollständigen Dungeonabschluss, Turn-in oder natürlichen Aufstieg bis E gemessen. Es gab keine harte Blockade. Die zusätzliche Zielführung und die kleine Stichprobe begrenzen die Aussage zum persönlichen Spielgefühl.

Die bezahlte .262-Stichprobe lief auf 489b2cda. Danach wurde als einzige weitere Produktanpassung die ohnehin identische F-Bezeichnung in der X-Marktregel aus dem Profil bezogen. Der endgültige Vergleich der F-Requests und die Browserprüfung erfolgten offline auf dem Schlussprodukt. Ein dritter bezahlter Lauf war hierfür nicht erforderlich. [Manifeste, Kosten und Rohdaten](../testrun_10b/openrouter-20261128-fundament-262/README.md)

## Empfehlung für die E-Entwicklung

**GO zum unabhängigen Diffreview und zur E-Fachplanung.** Für den Einstieg sollte zuerst genau eine spielbare E-Unternehmung fachlich bestimmt werden: Welche Weltgefahr etabliert das Gebiet, welche Arbeit bietet Proven an, welche Belohnung und welches Equipment sind für diesen Weg vorgesehen? Danach kann der bestehende Produktpfad mit einem autorisierten E-Profil und einem zusammenhängenden Abenteuer abgenommen werden.

Offen bleiben E-Ökologie, Intro- und Boardmix, Gefahrenkommunikation mehrerer aktiver Gebietsränge, Ausrüstungswerte und Preise, Lernberechtigung, Passive und eine für Solo wie Party gewünschte Progressionsgeschwindigkeit. Eine Änderung der Profilwerte allein erteilt keine solche Produktfreigabe. Für die Skalierung sind zunächst real auftretende Geschwisterorte, gleichzeitig offene Aufträge und tatsächlich gelieferte Tokens zu beobachten. Der aktuelle Befund verlangt weder eine allgemeine Kontextkappung noch einen Snapshot-Umbau. [F–S-Gestaltungsfragen](AVERETH_261_E_BIS_S_SPIELDESIGN_BALANCE_WELT_FACHGRUNDLAGE_GPT.md)
