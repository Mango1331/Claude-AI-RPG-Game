# Avereth .220 – Reisezeit, Ereigniszeit und tatsächlich Mitreisende

**Beide Befunde des GPT-Diffreviews zu .219 sind im vollständigen Produktpfad bestätigt.** Eine zweistündige Straßensperrung konnte MP wie zwei Stunden Marsch geben. Bei einer Reise über zwei Stationen konnte derselbe Abschnitt dem zurückgebliebenen Mitglied gutgeschrieben und einem erst dort hinzukommenden Mitglied vorenthalten werden. Beide Korrekturen liegen auf dem bestehenden Entwicklungsbranch. [Vollständiger Produktdiff .219 → .220](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/0a7a91b90d204e01c49747829308abf940343449...cc327a1ae44b0aac3605f416078c693b2600ffff)

Die drei Produktcommits wurden am 26. November 2026 auf `experiment/211-openrouter-helper-single-runner` regulär gesichert und jeweils mit dem Remote-HEAD abgeglichen.

| Stand | Referenz |
|---|---|
| Produktbasis | [`4.3.0-c.6.6.219` · `0a7a91b90d204e01c49747829308abf940343449`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0a7a91b90d204e01c49747829308abf940343449) |
| Laufzeitkorrektur und gezielte Regressionen | [`e4e13bfc264b00faadc25e1b4629d8f98948f801`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e4e13bfc264b00faadc25e1b4629d8f98948f801) |
| Zwischenankunft und historischer Gasthausfall | [`a91e39d37828ecb6193eae5d60ad66bd79f42c58`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a91e39d37828ecb6193eae5d60ad66bd79f42c58) |
| Kandidat einschließlich älterer zeitlich geordneter Meldungen | [`4.3.0-c.6.6.220` · `cc327a1ae44b0aac3605f416078c693b2600ffff`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc327a1ae44b0aac3605f416078c693b2600ffff) |
| Ausgangspunkt der Dokumentation | [`main` · `2e46295ebac71416c3b7d2056add8612c6446cd7`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2e46295ebac71416c3b7d2056add8612c6446cd7) |

## Reproduktion und Korrektur

**R1a · Zeitursache.** Die Bedingung in `applyWorld` ließ bei einem GO ohne weitere gebuchte Tätigkeit neben der Reise auch ein explizites `during:event` in die Reiseabrechnung gelangen. Damit konnte eine Ankunft die Belegprüfung des Ereignisses umgehen. Jetzt bucht World ein ausdrücklich gemeldetes Ereignis nur über den vorhandenen PULSE-/Erzählbelegpfad. Ein bestätigtes Ereignis erzeugt `time.advanced` mit `why:event`. Die Reiseminuten laufen separat durch den bestehenden persönlichen Ressourcenpfad. Eine weitere undifferenzierte Dauer nach bereits abgerechneter Ankunft braucht eine eigene Grundlage. Der Mindestweg verwendet wie bisher nur die fehlende Strecke. Eine Ereignisverzögerung füllt diesen Mindestweg nicht aus. [World und Zeitabrechnung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/src/v4/world.js)

**R1b · Reiseabschnitt.** .219 verwendete zwischen zwei Ankünften die zuletzt gefüllte Teilnehmerliste. .220 bindet vor einer Ankunft gemeldete Minuten an die entsprechende Ankunftsnummer der Extraktion. Erst die bestätigte Bewegung bestimmt, wer diesen Weg mitging. Nachträglich gemeldete Abschnittsdauern verwenden die für diese Ankunft festgehaltene Gruppe. Durchgängig im Wechsel gemeldete Ankünfte und Dauern werden auch dann unterstützt, wenn ältere Extraktionen die Reisezeit noch nicht ausdrücklich mit `during` kennzeichnen. Wechselt ein Mitglied unterwegs auf Warten oder Austritt, geht diese tatsächliche Entscheidung einer Mitnahme aus dem anfänglichen GO vor. Auf einem belegten, vorzeitig unterbrochenen Weg zählt die tatsächlich zurückgelegte Strecke. Die Zwischenzuordnung lebt nur während der Verarbeitung. Persistiert werden die vorhandenen Zeit- und Ressourcenereignisse im Save. [Implementierungsdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/0a7a91b90d204e01c49747829308abf940343449...cc327a1ae44b0aac3605f416078c693b2600ffff) · [Extractor-Vokabular](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/content/deltas.json)

**Die Produktregel D1 bleibt unverändert.** Pro tatsächlich gereister Stunde erhält jede mitgereiste Figur 5 % ihrer eigenen maximalen MP. Bestehende Restbeträge, Kappung bei voller Leiste, Rast-/Schlafraten und Combatregeln gelten weiter. Die Extraktion verwendet die bestehenden Felder. Ein kurzer Zusatz erklärt die Reihenfolge bei mehreren Abschnitten. Die gewohnte natürliche Spielereingabe genügt. [Design-Kanon](../02_DESIGN_KANON.md#reise-und-skillfortschritt-ab-219) · [.219-Fachabnahme](AVERETH_219_USER15_FACH_UND_ABNAHME.md)

## Gemessene Gegenproben

Synthetische, reproduzierbare Kampagnen auf beiden Produktständen mit demselben vorbereiteten Zustand. PC 256 MaxMP, Ossen 80 MaxMP, jeweils anfangs 0 MP. Orte, Mitgliedschaft und Ressourcen bilden die Testvorgeschichte. Die Entscheidungen und Buchungen laufen anschließend über Spielereingabe, Planner-Mock, autorisiertes GO, Narratorprosa, Extraktion, Belegprüfung und Fold des Chats. Für die Ereignisfälle wurde das PULSE-Fenster gezielt geöffnet bzw. geschlossen. In der Tabelle sind Minuten und ganze MP angegeben. [Ausführbarer Runtime-Test](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/tests/v4/travel_time220.test.js) · [Rundungs- und Reloadtests für D1](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/tests/v4/travel_mana219.test.js)

| Situation | .219 | .220 |
|---|---|---|
| Allein 60 Min. zur Brücke | 60 Reise, Alaric +12 | 60 Reise, Alaric +12 |
| Danach belegte Straßensperrung über 120 Min. bei offenem PULSE | 180 Reise, Alaric +38 | 60 Reise + 120 Ereignis, Alaric +12 |
| Danach 120 Min. mit fremdem Beleg im offenen oder ohne Ereignis im geschlossenen Fenster | 180 Reise, Alaric +38 | 60 Reise, Alaric +12. Die weiteren 120 Min. werden abgelehnt. |
| Bestätigte Fernankunft ohne gemessene Wegdauer, danach 120 Min. belegte Sperrung | 120 Reise, Alaric +25 | 60 Mindestweg + 120 Ereignis, Alaric +12. Bei bereits gemeldeten 30 oder 60 Reiseminuten ergänzt der Mindestweg nur noch 30 bzw. 0. |
| Ossen reist zur Brücke mit und erklärt dort, er werde warten. Alaric reist allein weiter. | Je 60 Min., Alaric +25, Ossen +8 | Je 60 Min., Alaric +25, Ossen **+4**. Er bleibt an der Brücke. |
| Ossen wartet am Zwischenziel, schließt sich dort für den zweiten Abschnitt an | Alaric +25, Ossen +0 | Alaric +25, Ossen **+4** |
| Beide reisen durchgehend zusammen | Alaric +25, Ossen +8 | Alaric +25, Ossen +8 |
| 30 Min. gemeinsamer Weg, dann 120 Min. belegte Sperrung vor Erreichen des Ziels | 150 Min., Alaric +32, Ossen +10 | 150 Min., Alaric **+6**, Ossen **+2**, Ziel weiterhin offen |
| Ausdrücklich gewählte Rast vor 60 Min. Reise | Rast +38 MP, Weg +12 MP | Dieselben 120 Min. insgesamt und +50 MP. Die im X nochmals genannten Rastminuten werden nicht doppelt gebucht. |
| Reload, wiederholte Extraktion, Swipe und Regenerate | Das Zeitereignis blieb auf .219 falsch klassifiziert. | Jeweils nur die Ressourcen und die Uhr der gewählten Fassung. Wechsel von 60 Reise + 120 Ereignis auf 120 Reise und zurück ergibt für Alaric 12 → 25 → 12 MP und für Ossen 4 → 8 → 4 MP. |

## User15 und historische Vergleichsgrundlagen

Die **108 Original-Verarbeitungsfolgen von User15** wurden einzeln mit ihren physischen Modellantworten auf .219 und .220 wiedergegeben. Direkt zwischen den Builds sind alle **108 normalisierten Eventfolgen gleich**. Gegen den persönlichen .218-Export bleiben es die bereits erklärten 87 gleichen und 21 geänderten Folgen. Zusätzlich wurden die Ketten M125–126 und M73–75 jeweils auf dem korrigierten Vorgängerzustand durchgespielt. Das Marktgebot bleibt verbindlich, der Spieler behält seine 380 cp. Beim Zimmerzugang bleibt es 19:30, erst der gewählte Schlaf führt bis 08:00. M104 erreicht die Gilde, die 150 Reiseminuten ergeben 174 → 206 MP, die Gildenabgabe zahlt einmal 160 cp. Auf M88 zählt auch die Zwischenankunft am Damm mit ihren 90 Reiseminuten, obwohl das Endziel noch aussteht. Die gesonderte Ossen-Kampagne erreicht weiterhin 225/225 Quest-XP und 45/45 cp. [User15-Originale](../testrun_10b/user-20261126-085419-218/) · [User15-Replay](../testrun_10b/user-20261126-085419-218/replay_219.mjs) · [Ossen-Kampagne](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/tools/replay/party_campaign217.mjs)

**Ein fachlich geänderter historischer Fingerprint.** In `b16-rogue-sale#80` erreicht der Spieler nach 15 Minuten das Ferryman’s Rest. Er hatte auch „sleep until morning“ gesagt. Der damalige Aktionspfad hatte diesen Schlaf bis zur bestätigten Ankunft zurückgewiesen (`arrival pending`). Die nachfolgenden 600 Minuten der Extraktion beschreiben im Original die Nacht im Bett. .219 übernahm davon die noch unter die Zeitgrenze passenden 105 Minuten als Reise. .220 belässt den Weg bei den tatsächlich berichteten 15 Minuten. Der Korrekturauftrag ändert die Regeln für eine ausstehende Schlafaktion nicht. Der neue Eintrag enthält sowohl den früheren als auch den geprüften neuen Hash. [Geprüfte Einzelabweichung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/tests/replay/accepted_travel220.json) · [Historische .219-Liste](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cc327a1ae44b0aac3605f416078c693b2600ffff/avereth-engine/tests/replay/accepted_user15_219.json)

**Aufrufzahl und Umfang.** Auf denselben User15-Präfixen bleiben es 30 Planner, 45 Narrator-Kontextübergaben, 45 primäre Extraktionen, fünf Repairs und zwei Boardaufrufe. Der Zusatz im Extractor-Katalog kostet im gemessenen Replay 110 Unicode-Zeichen je X oder Repair, über 50 solche Nachrichten also 5.500 Zeichen. Planner, zugelieferter Narrator-Kontext und Board bleiben gleich groß. Alle Prüfungen verwenden lokale oder archivierte Modellantworten. Natürliche Formulierungsqualität, Providerlatenz und Tokenkosten des neuen Kandidaten wurden nicht gemessen.

## Gesamtabnahme

| Prüfung | Ergebnis |
|---|---|
| Gezielter Lauf mit Reise-, Mana-, PULSE-, historischen Kurz- und weiteren betroffenen Regressionen | 134/134 bestanden. Von den acht neuen Runtime-Tests schlagen auf .219 sechs fehl, auf dem Kandidaten bestehen alle acht. Die einzeln gemessenen Varianten stehen oben. |
| Vollständige Node-Suite | **3.607/3.607 bestanden**, null übersprungen. |
| Zehn historische Kampagnen, direkter Vergleich der gespeicherten Ausgaben auf beiden verifizierten Produktständen | **2.234/2.235 identisch**. Alle **338** Einträge der .219-Annahmeliste geprüft, **337 identisch**, eine begründete Nachfolgeannahme für das Gasthaus. |
| Strikter Replayvergleich gegen die feste .126-Basis | **2.235** verglichen, **1.346/1.346** Unterschiede mit exakter Annahme, **0 offen, 0 veraltet**. Keine Replay-, Fold- oder Validierungsfehler. |
| Isoliertes SillyTavern 1.19.0 mit Chromium und lokalem Mock | Reisemodus `journey208` **75/75**, Speicher-/Revisionsmodus `action_saves` **60/60**. Die einzelnen Fehlerzustände und ihre Ressourcenwerte wurden im vollständigen Runtimepfad gemessen. Die Browserläufe prüfen die zugehörigen Hostabläufe. |

Die Prüfungen sind aus `avereth-engine` mit `node --test tests/v4/travel_time220.test.js`, `npm test` und `npm run replay:check` wiederholbar. Die markierte ST-Sandbox verwendet `npm run smoke:st:isolated -- --mode journey208` bzw. `--mode action_saves`. Für den User15-Vergleich verwendet das Runwerkzeug den ausgecheckten Engineordner und das archivierte, redigierte Log.

## Installation und Empfehlung

Für den Wechsel von .219 auf .220 die folgenden fünf Dateien aus `avereth-engine/` am selben relativen Pfad in die bereits installierte Extension übernehmen. Ausführbare Mechanik steckt in der Weltverarbeitung und der Extractor liest die aktualisierten Inhaltsdaten. Die übrigen drei Dateien tragen die gemeinsame Version.

- `src/v4/world.js`
- `content/deltas.json`
- `src/util.js`
- `manifest.json`
- `package.json`

Alternativ den vollständigen Extension-Ordner des Kandidaten über die bestehende Installation kopieren. SillyTavern neu laden und die Buildanzeige **4.3.0-c.6.6.220** prüfen. Für Card, Preset, Lorebook, Narrator Contract und Regex ergibt sich aus diesem Diff kein Installationsschritt. Der Patch wirkt auf neu verarbeitete Antworten. Er schreibt gespeicherte Reisen früherer Versionen nicht rückwirkend um.

**Technisches GO für Usertest 16 nach unauffälligem unabhängigem GPT-Diffreview.** Beide Fehler sind im vollständigen Produktpfad korrigiert. Unsicherheit bleibt bei der natürlichen Extraktion tatsächlich mehrdeutiger Texte. Die Abnahme misst die mechanische Verarbeitung unter kontrollierten Antworten. Ein echter Providerlauf und das persönliche ST-Profil waren nicht Teil der Tests.
