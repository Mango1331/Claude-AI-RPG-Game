# Avereth Engine .212 – Fachbericht und Offline-Abnahme

**25. November 2026 · Build `4.3.0-c.6.6.212`.** **GO für unabhängigen GPT-Diffreview.**

| Referenz | Git-Stand |
|---|---|
| Unveränderter Ausgangspunkt `.211` | [`1d3171d756f828ab8e90db9111617d3234bdbf9c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1d3171d756f828ab8e90db9111617d3234bdbf9c) |
| Verifizierter Entwicklungsstand | [`7cf33bc08b050e1445ce8ee859c4d54f4b6000fc`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7cf33bc08b050e1445ce8ee859c4d54f4b6000fc) in `experiment/211-openrouter-helper-single-runner` |
| Produktdiff `.211` → `.212` | [Vollständiger Vergleich mit Datei- und Commitliste](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/1d3171d756f828ab8e90db9111617d3234bdbf9c...7cf33bc08b050e1445ce8ee859c4d54f4b6000fc) |
| Dokumentationsbasis | [`47f07d711d1805f537d4868081d21bce712647c3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/47f07d711d1805f537d4868081d21bce712647c3) auf `main` |

Die Remote-Refs entsprachen beim Start den beiden Ausgangspunkten. GitHub konnte den zuvor lokal gebliebenen Commit `f3bf1c95fc6cd62e3d34a255f1c02af804b62438` nicht liefern. Die Arbeiten wurden auf `.211` neu aufgebaut und paketweise auf dem vorhandenen Zweig gesichert. Für jeden Push wurde die Remote-SHA geprüft.

## Paket 1 · Revision, NPC-Entscheidungen und Runner

- **M59/M60.** Der Generierungsbeginn hält die tatsächlich aktive Spielerrevision mit Nachrichtenindex, Swipe und Texthash sowie dem Host-Generierungszeitpunkt fest. Die neue Variante trägt ihren eigenen Parent. Der Host behält die ursprüngliche Parent-Bindung historischer Alternativen bei. Übernommene Extraktionsdaten werden bei einem Parent-Wechsel aus der neuen Variante entfernt. Die bestehenden Schutzprüfungen verhindern eine Anwendung verspäteter Antworten. Im nativen Browserfall bindet der neue Swipe an `59/0/862615fd`, extrahiert einmal und bucht 620 Minuten einmal. Nach dem Neuladen ergibt der Chat denselben Zustand. Beim Anklicken der alten Variante bleibt sie inaktiv.
- **M148 in Phase B.** Mit den archivierten Antworten #202 und #203 wendet der Kandidat die letzte offene Extraktion offline erfolgreich an. Der exportierte Pending-Status reicht für eine dauerhafte Fehlerdiagnose nicht aus. Die Runner-Exporte benennen einen fehlgeschlagenen Readback und können bei fehlendem Chatdatei-Readback einen ausdrücklich gekennzeichneten Browser-Snapshot sichern.
- **M73/M75.** Die KI berücksichtigt den letzten eigenen temporären Sidestep, wenn Reichweite und echte Deckung wieder den gleichen Defensivzug nahelegen. Sie kann sich danach annähern oder regulär handeln. In den Originalpositionen braucht sie den Minor für die Annäherung und hat aus der ursprünglichen Entfernung keinen legalen kombinierten Treffer. Aktionsbudget, PC-Sidestep, Reichweiten und Kampfformeln bleiben auf der bestehenden Regelbasis.
- **Automatischer Spieler.** Beim 429 oder Timeout mit unklarem Remoteabschluss hält der Spieler nach einem physischen Request an. Vollständig empfangene ungültige Entscheidungen können den vorhandenen begrenzten JSON-Repair nutzen. Der Runner stoppt vor einer Eingabe bei blockierter Engine, hält die Diagnosen fest und verwendet den konfigurierten Provider. Vor der nächsten automatischen Helferentscheidung gilt standardmäßig eine Lesepause von 5.000 ms. `--read-pause-ms 0` ist gültig, der Export erfasst den wirksamen Wert und Offline-Spieler sowie persönliche Eingaben erhalten keine Zusatzpause. Der isolierte Runner wartet außerdem auf die Startmeldung seines eigenen ST-Prozesses, bevor er den Browser öffnet.

[User12-Quellenmanifest](../testrun_10b/user-20261125-005145-211/SOURCE_MANIFEST.md) · [User12-GPT-Review](../testrun_10b/user-20261125-005145-211/REVIEW.md) · [Codex-Gegenreview](../testrun_10b/user-20261125-005145-211/CODEX_GEGENREVIEW.md) · [Runner-Anleitung .212](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7cf33bc08b050e1445ce8ee859c4d54f4b6000fc/avereth-engine/docs/LIVE_RUNNER.md).

## Paket 2 · Handel und Ausrüstung

- **Erstes Gebot.** Die Preisprüfung ordnet Käuferäußerung und Geldworte derselben zusammenhängenden Handelsklausel zu. Eindeutig auffindbare Fragmente dürfen die Klausel wiederfinden. Eine fremde Stimme, eine bloße Preisfrage, eine offene Voraussetzung und unvollständige oder getrennte Teilpreise können weiterhin keinen Kaufabschluss erzeugen. Tatsächliche Auszahlung setzt das passende ausführbare Angebot und ausdrückliche Annahme voraus.
- **Referenzen.** Der Originaldialog für Martas Sammelangebot bindet 300 cp bereits auf `.211` und weiterhin auf `.212`. Ihre vier Kupfer für die Starterrobe binden, sobald der Extractor die nachgeschobene Begründung als solche erfasst. Der erste Archiv-Extractor klassifizierte diese Antwort als bedingt. Die fachliche Probe mit korrektem `firm`-Label isoliert die fehlerhafte Reichweite der früheren Bedingungsprüfung. Bei Tomas bindet der gespeicherte Dialog einschließlich seines bestätigten Dreierpreises trotz des vom ursprünglichen Extractor zusammengesetzten Teilzitats. Der abweichende Vorschlag von Ambrose bleibt Preisgespräch.
- **Preisquelle.** Die Engine erzeugt die regulären F-Retailpreise aus den vorhandenen Profilen und ihrer bestehenden Preisfunktion. Den Preisplan bekommt der Narrator nur in relevantem Ausrüstungskontext. Planner und Extractor bekommen das vorhandene Basis- und Qualitätsvokabular und die Regel für bereits erfasste Preise. Für Stäbe gilt in Qualitätsreihenfolge 80/140/260/480 cp. Das HUD zeigt den bindenden Preis und einen tatsächlich abweichenden Richtwert. Bereits gespeicherte Angebote behalten ihre Preise.
- **Wechsel und Anschlussfrage.** Eine Freitextanweisung kann neuen Gegenstand, Altstück und separates Gebot ausdrücken. Der Planner erhält dafür eine Rollentrennung, ebenso für eine unabhängige Warenfrage nach einem Verkauf. `#equip <Name oder ID>` und die Ausrüstungsaktion am vorhandenen HUD verwenden denselben Equip-Handler. Das Altstück landet im Gepäck und bleibt bis zu einem separaten Abschluss im Besitz des Spielers. Die Freiheit des Planners in natürlichen kombinierten Formulierungen ist noch empirisch zu prüfen.

[Handelsbefunde im Originalgegenreview](../testrun_10b/user-20261125-005145-211/CODEX_GEGENREVIEW.md) · [Handelsabnahme .207](ABNAHME_207_HANDELS_HUD.md).

## Paket 3 · Szenenablauf und Reise

Planner und Engine behalten den mechanischen Reiseauftrag, Zugangsbedingungen und Questgrenzen. Die gewöhnliche räumliche Durchführung kann der Narrator aus der aktuell gewählten Handlung erzählen. Der Extractor berichtet die tatsächliche Ankunft. Der bestehende Resolver prüft am relevanten Schritt aktuelle Absicht, Ankunft, begleitende Person und Ziel. Damit kann eine ausdrückliche Verlegung oder der Gang zum bezahlten Schlafplatz ohne ausgefüllten `travel_frame` angewandt werden. Der optionale validierte `.211`-Vertrag bleibt für bereits gespeicherte und komplexer begründete Fälle lesbar. Der engere Ersatz des Vertrags für gewöhnliche Schritte hat sich in den Originalen bewährt. Eine vollständige Entfernung hätte die bereits funktionierenden Abhängigkeiten und die Wiedergabe alter Antworten berührt.

Tresen, Sitzplatz und gewöhnliche Möbelbewegungen können zur aktuellen Szene gehören. Vorhandene Ortsidentitäten und mechanisch relevante Unterorte bleiben getrennt. Ein tatsächlich erreichter bezahlter Loft kann ein eigener Ort sein. Der geänderte M92 erreicht den buchbaren Loft und hält 110 cp. Die Zahlung erzeugt weder eine zusätzliche Buchung noch Rastzeit. Bekannte Dungeon-Gates werden anhand der Route identifiziert. Ein kanonisches Ziel hinter einer noch nötigen Passage kann beim nächsten erreichbaren Eingang beginnen. Der ursprüngliche Eintritts-/Rückwegfall mit anders bezeichnetem Tunnel und vorhandener Ortsidentität ist lokal geprüft.

Die bestehenden Archiv- und Gegenproben decken Dann, Zwischenhalt, Abstecher, Rückkehr und die sequenzielle Anwendung ortsabhängiger Deltas ab. Ein bloßer Fund, eine Wegbeschreibung, eine abgelehnte Einladung, ein nicht anwesender Begleiter und eine nicht erfüllte Bedingung autorisieren weiterhin keine Ankunft. Kampf-, Eigentums- und Dungeonprüfungen bleiben im vorhandenen Pfad. Der rekonstruierte Transport aus Helferlauf 5 T40 läuft durch Planner, Narratorhinweis und Extractor. Ein direkt geäußerter Transportwunsch liefert sein eigenes Ziel, auch wenn der optionale Plannerwert `stay` lautet. Für die Galerie aus Helferlauf 4 wurde die Ausgangslage mit der User08-Dungeonfixture rekonstruiert. Der Wunsch nach dem bekannten ersten Abschnitt führt vom westlichen Straßengraben ans Gate, selbst wenn die Mockantwort bereits den Abschnitt meldet. Es fällt keine Eintrittsgebühr an. Ein neuer mehrdeutiger Galeriename kann weiter eindeutigen Ziel- oder Zugangskontext benötigen.

[Szenenentwurf im Entwicklungszweig](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7cf33bc08b050e1445ce8ee859c4d54f4b6000fc/avereth-engine/docs/SCENE_CONTINUITY_212.md) · [Kontinuitätsreview .211](AVERETH_211_GPT_GEGENREVIEW_OFFLINE_2026-11-24.md) · [Helfer-Gesamtreview](../testrun_10b/openrouter-helper-laufserie-20261124/CODEX_GESAMTREVIEW_211.md).

## Paket 4 · Spielgefühl, Progression und HUD

- **Gefahr.** Neu erzeugte PULSE-Gegner verwenden einen stabilen Wert aus Kampagnenseed, Ort und Identität, begrenzt durch Profil und lokale Gefahrenstufe. Damit hängt ihre Stufe von der Welt und ihrer Rolle ab. Bereits erfasste Personen behalten ihre Werte. Sichtbare Waffen und erkennbare Gefahren können vor der Entscheidung im Kontext stehen. Im Originalreply M72 ist die Profilstufe der Banditen die erwartete Änderung. Der Geldstand bleibt 97 cp.
- **PULSE.** Derselbe Ereigniswurf wählt auch Hinweise zur Variation. Spuren können durch konkrete Folgen relevant werden. Hindernisse können eine Entscheidung mit direkter Fortsetzung anbieten. Ein Spieler kann Angebote und Hinweise übergehen. Die Öffnungswahrscheinlichkeit wurde beibehalten. Wie abwechslungsreich das im laufenden Spiel wirkt, bedarf natürlicher Beobachtung.
- **Board.** User12s erster Abruf hatte zwei gültige Listings, eine ungültige Levelspanne und zwei unpassende Species-/Anchor-Paare. Unvollständige gültige Antworten können einmal mit gezielter Rückmeldung repariert werden. Der Originalversuch #11 und die später erfolgreichen Listings aus #15 dienen als gespeicherte Antwort und Mock-Repair. Ein vollständig erschöpfter reiner Boardzug zeigt eine technische Systemmeldung ohne kanonisches Board, Narration oder Extraktion. Schwache und anspruchsvollere Vorschläge können nebeneinander erscheinen. Ein gültig enginegezählter Jagdvertrag zahlt bei der Abgabe auch ohne ergänzendes READY. Der rekonstruierte Helferfall mit selbstreferenzierendem READY löst einen Extractorhinweis aus und bleibt fachlich abgelehnt.
- **Rast und HUD.** `#rest 30` oder `#rest 2h` verwendet die vorhandene Rastlogik. Die Welt prüft PULSE vor abschließender Zeit und Erholung. Ohne Ereignis antwortet die Engine lokal. Ein offenes Fenster erhält Narrator und Extractor, eine Unterbrechung kann nur belegte verstrichene Zeit und Erholung buchen. Das aktuelle HUD zeigt nach `#assign` die verbleibenden freien Punkte. Ambush weist vor der Auswahl auf seine einzelne Eröffnungsaktion hin.
- **Lernen und Kontinuität.** Der Narratorkontext unterscheidet die fünf kanonischen Gildenprimer, Lernen bei Lehrern, aktive Skill Stones, Passive Stones und besondere Funde. Gewöhnlicher Ladenbestand erhält keine generelle Skill-Stone-Verfügbarkeit. Neue Verteilungswerte für Skill Stones bleiben eine Designentscheidung. Der bestehende Bossloot und die vorhandene NPC-Wiedererkennung werden über die bisherigen Pfade aufgelöst. Auf einen allgemeinen Dialogvalidator und eine neue Memoryarchitektur wurde verzichtet.

[Designkanon](../02_DESIGN_KANON.md) · [Helferlauf 5, unabhängiger Gegenreview](../testrun_10b/openrouter-helper-laufserie-20261124/GPT_GEGENREVIEW_RUN05_107.md) · [User12-Spielgefühl](../testrun_10b/user-20261125-005145-211/USER_FEEDBACK_REVIEW.md).

## Paket 5 · Abnahme und Evidenz

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 3.589/3.589 bestanden, 0 übersprungen. Enthält Failsoft, die ursprünglichen und neuen Revision-, Handels-, Kampf-, Reise-, Quest-, PULSE-, HUD- und Runner-Tests sowie die Kampagne. |
| `npm run replay:check` | 2.235 historische Fälle. 1.193 historisch genehmigte Abweichungen exakt wie in der unveränderten Akzeptanzdatei. 0 ungeklärte Abweichungen. |
| Vier archivierte natürliche Vergleichskampagnen `.210/.211` | 122/122 Extractor-Weltstufen mit gleichem Weltfingerprint, denselben benötigten archivierten Aufrufen und Status `applied` auf Ausgangsstand und Kandidat. GA 32, GB 30, HB 30, PA 30. |
| Ergänzende `.210/.211`-Archivproben | Revisionsarme RA/RB ergeben auf beiden Checkouts exakt ihren archivierten Reload-Fingerprint. RA aus .210 behält die historische Abweichung zum gewünschten früheren Präfix, RB aus .211 erreicht ihn. Die Vorzeige-Probe am Ford und elf Empfänger- und Schlüssel-Gegenproben liefern auf beiden Checkouts dieselben Ergebnisse. |
| User12 Originalphasen A/B | 24/24 bzw. 64/64 gespeicherte aktive Extraktionen im jeweiligen Originalpräfix angewandt. A ohne Abweichung im Weltfold. B mit drei erwarteten Abweichungen (M72 neue Gefahrstufe, M92 tatsächlicher Loft, M140 bindendes Angebot ohne Geldbewegung). Der alte inaktive Swipe ist separat im Browser geprüft. M148 mit #202/#203 offline abgeschlossen. |
| Weitere persönliche Originalfälle | Historische Test- und Replay-Fixtures wie User07, User08 sowie User11 in den vollständigen Suiten. Keine Archivüberschreibung. |
| `npm run smoke:st:check` | Voraussetzungen, Loopback-Ports, Chromium und gepinntes ST 1.19.0 geprüft. |
| `npm run smoke:st:isolated` | Standard 378/378, Failsoft 384/384. Beide auf `7cf33bc0`, jeweils 0 Seitenfehler. Pinned ST 1.19.0 (`7e8663cd`), Chromium 156.0.8078.79 und Node 24.22.1. Je Modus eigener Sandbox-Ordner und eigene Loopback-Ports. Der lokale Testadapter änderte ausschließlich die beiden Portnummern der Smoke-Skripte. |
| `npm run live:st:selftest` | 51/51 Prüfungen bestanden. Fünf isolierte ST-1.19-Runs mit Loopback-Stub, einschließlich LLM-Attrappe, Skriptspieler, Proxy, leerer Narration und Level-Cap. Testprofil und ST-Checkout byteunverändert. |
| Native User12-Browserprobe | Originalpräfix Phase A, echter ST-1.19-Edit/Swipe/Save/Reload, N#71 als Mocktext und eine gezielt gefütterte X-Antwort. Neue Bindung, keine alte Handlung in den Prompts, genau einmal 620 Minuten, altes Variantenelement weiterhin inaktiv. |
| Zusätzliche native Aktionen im Browser | Auf Originalpräfix B nach dem Kauf wurde die Rüstung mit `#equip` angelegt und die Starterrobe ins Gepäck zurückgelegt. `#rest 10` buchte danach genau einmal zehn Minuten. Geld, Save-Read-back und Reload stimmen. Beide Systemaktionen zusammen brauchten null Modellaufrufe. |
| Zusammenhängende Kampagne | Normaler Start und Registrierung, Board/Jagd, Reise mit PULSE, Monster und Mensch, Loot/Levelaufstieg/Rast, Rückkehr zur selben Schreiberin, einmalige Auszahlung, Bündelverkauf, regulärer Kauf, Equip und Altverkauf, Bewegung zur Bank, Edit, Swipe und JSON-Reload. Eingaben und Modellantworten laufen durch die Engine. Der PULSE-Wurf ist im Test reproduzierbar vorgegeben. Native Datei- und UI-Persistenz werden separat im Browser geprüft. |

Die ersten Browseranläufe deckten zwei Testadapterfehler und eine Startkollision auf. Der Testdriver durfte auch manuelle Wiederherstellungsschritte senden. Die Board-Fixture erwartete ursprünglich noch eine Erzählerantwort auf einen technischen Fehler. Bei konkurrierendem Start beider ST-Harnesses hielt der Runner die HTTP-Antwort des anderen lokalen Servers für sein eigenes Startsignal. Ein roter und grüner Test sichert die exakte Prozessbindung ab. Ein früherer Failsoft-Vollauf bestand 383/384 Prüfungen. Ein überholter Save-Snapshot wurde geschützt abgewiesen, der dabei protokollierte Fehler zählte gegen `noPageErrors`. Die abschließenden Läufe auf dem Kandidaten bestanden einschließlich Resume, Replay, Save und Read-back ohne Seitenfehler.

Der unveränderte `.211`-Node-Lauf bestand 3.565 von 3.568 Fällen. Drei vorhandene Runnerfälle schlugen fehl. Der Kandidat normalisiert servergeloggte Providerlisten in das eigene JavaScript-Realm. Die Tests lesen die vorgesehenen Zeilentrenner des OpenRouter-YAML und berücksichtigen den vorhandenen `natural_helper_progression`-Guide. Die historische Replay-Suite liefert auf beiden Versionen dieselbe Akzeptanzsumme.

Die Helferlauf-ZIPs sind weiterhin nicht verfügbar. Die vorhandenen Reviews belegen die Beobachtungen und erlauben rekonstruierte Gegenproben. Die vier Vergleichskampagnen und User12 besitzen archivierte Eingaben und Antworten. Das Replay liefert isolierte technische Evidenz mit festem Präfix. Die neue zusammenhängende Mockkampagne prüft das Zusammenspiel. Natürliche LLM-Spielqualität, Preisnennung im freien Dialog, Variation und längerfristige Balance bleiben live zu messen. In dieser Etappe wurden null echte Providerrequests ausgeführt und kein persönliches ST-Profil verwendet.

[User12-Quellenarchiv](../testrun_10b/user-20261125-005145-211/SOURCE_MANIFEST.md) · [Vier Vergleichskampagnen](../testrun_10b/openrouter-20261124-langzeit-211/README.md) · [Helfer-Quellenstatus](../testrun_10b/openrouter-helper-laufserie-20261124/README.md) · [Welt-Replayer](langzeittest_211/gleiches_ergebnis.mjs) · [Kampagnentest](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7cf33bc08b050e1445ce8ee859c4d54f4b6000fc/avereth-engine/tests/v4/campaign_212.test.js).

## Performance im kontrollierten Vergleich

| User12-Abschnitt | Archiv .211, Eingaben / Modellrequests | Kürzester technisch gezeigter Ablauf .212 |
|---|---:|---|
| Sammelverkauf E52–55 | 4 / 11 | Erste verbindliche 300-cp-Zusage und Bestätigung per HUD. 2 / 5 bei P + N + X für die Anfrage und N + X für die Bestätigung. Eine unabhängige Warenfrage kann in der Spielereingabe stehen. |
| Starterrobe E60–62 | 3 / 9 | Vorhandene native Gebotsfrage und HUD-Bestätigung, 2 / 4 bei N + X je Zug und korrekt als bindend gelesener Vier-Kupfer-Zusage. |
| Starterstab E70–72 | 3 / 10 | Native Gebotsfrage und HUD-Bestätigung, 2 / 4 bei N + X je Zug. Der Erstpreis im archivierten gemischten Tomas/Ambrose-Dialog ist im Kandidaten bereits ausführbar. |

Die Kandidatenzahlen beschreiben den Offline-Ablauf bei gültiger erster Extraktion. Sie zählen nur die jeweilige Handelssequenz, ohne vorherigen Ausrüstungswechsel. Ein nativer Wechsel kann lokal mit null Modellrequests aufgelöst werden. Der gemessene historische Vergleichswert für User12 bleibt 71,50 s im Mittel und 62,81 s Median. Die Tabelle enthält keine Hochrechnung auf echte Tokens oder Providerzeit.

| Input und Antwort, Phase B | Planner-Zeichen .211 → .212 | Narrator-Engineblock .211 → .212 | Extractor-Zeichen .211 → .212 |
|---|---:|---:|---:|
| M103/104 · Sammelangebot | 53.219 → 53.846 | 6.638 → 6.850 | 62.625 → 62.873 |
| M119/120 · Starterrobe, native Gebotsfrage | 0 → 0 | 7.659 → 7.818 | 59.526 → 59.774 |
| M139/140 · Starterstab, native Gebotsfrage | 0 → 0 | 7.531 → 8.184 | 60.162 + 61.118 → 60.410 |

Die Tabelle erfasst die tatsächlich erzeugten Nachrichteninhalte der Engine bei gleichen Originalpräfixen. Im realen ST-1.19-Browser mit identischem Testprofil und Mockprovider wurde M103/104 zusätzlich komplett am lokalen Provider gemessen. Der gesamte Narratorrequest ging von 53.798 auf 54.010 Zeichen, Planner und Extractor entsprechen der Tabellenzeile. Beide Versionen senden je einen P-, N- und X-Request, erzeugen das ausführbare 300-cp-Gebot und halten bis zur Annahme dieselben 110 cp. Die vollständigen historischen ST-Narratorrequests #136/#154/#187 hatten mit dem persönlichen Profil 52.688 / 52.178 / 53.386 Zeichen. Der Offline-Vergleich der Gebotsfragen M119 und M139 erfasst den Engineanteil.

Median der lokalen Node-Prozess-CPU-Zeit je Schritt aus zehn Wiederholungen nach einem Warmlauf und ohne Modellwartezeit. Planner bzw. native Eingabe plus Kontextaufbau M103/M119/M139 (ms) 35,36 → 53,93 / 42,07 → 62,16 / 50,09 → 68,89. Verarbeitung der Antworten M104/M120/M140 (ms) 27,91 → 31,33 / 26,11 → 29,78 / 38,62 → 26,79. Die Werte stammen aus dieser Testumgebung bei parallelen Abnahmeläufen und lokalisieren den Mehraufwand. Der Preisplan ist inzwischen nur im Narratorkontext. Gegenüber der zuerst integrierten Fassung entfallen dadurch rund 748 Zeichen pro hier verglichenem P- bzw. X-Aufruf.

Der historische Ausgabeabgleich umfasst auch die durch geschützte Ablehnungen unveränderten Fälle. Im Laufzeitdiff kamen 339 Zeilen hinzu und 77 Zeilen entfielen. Diese Anzahl umfasst auch Kommentare, Start- und Anzeigeänderungen und ist keine Zählung einzelner Spielregeln. Die Änderungen konzentrieren sich auf die einzelne Klauselbindung, die vorhandenen Reise- und Handelsentscheidungen, zwei native Befehle und lokal begrenzte Hinweise. Der neue Board-Repair kann einen zusätzlichen Aufruf verbrauchen. Tomas' archivierte erste Preisextraktion spart genau einen. Beim letzten Pending-Reply bleiben zwei Aufrufe erforderlich. Der Spieler-Repair entfällt bei unbekanntem Abschluss.

## Dateien für einen späteren persönlichen SillyTavern-Test

Die installierte Avereth-Extension nach beendetem Gegenreview aus dem oben verlinkten Entwicklungscommit aktualisieren. In einer üblichen Installation ist der Zielordner `SillyTavern/data/<user>/extensions/avereth-engine/`. Für eine manuelle Kopie sind innerhalb dieses Ordners 26 Dateien betroffen.

```text
manifest.json
index.js
src/action_input.js
src/combat.js
src/commands.js
src/context.js
src/display.js
src/hud.js
src/npcgen.js
src/util.js
src/v4/commands.js
src/v4/continuation.js
src/v4/extract.js
src/v4/finance_evidence.js
src/v4/guild.js
src/v4/items.js
src/v4/movement.js
src/v4/native_actions.js
src/v4/planner.js
src/v4/pulse.js
src/v4/revisions.js
src/v4/runtime.js
src/v4/trade.js
src/v4/travel_continuation.js
src/v4/turn.js
src/v4/world.js
```

| Komponente | Persönlicher Test |
|---|---|
| Engine-Extension | Aktualisieren. Ein vollständiges Update auf den Entwicklungscommit enthält automatisch alle Laufzeitdateien. |
| Character Description und Card | Weiter mit den vorhandenen Dateien. Narrator Contract bleibt Revision `.211`. |
| Narrator-Preset, Lorebook und Regex | Weiter mit den vorhandenen Dateien. |
| SillyTavern-Einstellungen | Weiter mit dem vorhandenen Profil. Der Offline-Test lief in getrennten Sandboxes. |
| Runnerkonfiguration | Für persönliches Spiel nicht erforderlich. Für spätere automatische Tests den Runner aus demselben Checkout starten. Optionale Überschreibung mit `--read-pause-ms 0`, ansonsten wirksame 5.000 ms für natürliche OpenRouter-LLM-Helfereingaben. |

Die Entwicklungsreihe enthält zusätzlich die Node-Paketversion, Tests, Testfixtures, Browserwerkzeuge und technische Dokumentation. Die Freigabeentscheidung für persönliche oder natürliche Läufe folgt dem unabhängigen Diffreview. Die Produktlinie `.200` bleibt eingefroren.

## Reproduktion der Abnahme

Die Node-, Replay- und ST-Skripte im Entwicklungscheckout aus `avereth-engine/` starten. `AVERETH_ST_SANDBOX` zeigt auf den isolierten Smoke-Ordner. `AVERETH_ST_DIR` zeigt für den Stub-Selbsttest und die separate User12-Probe auf den ST-1.19.0-Checkout. Ein vorhandenes System-Chromium kann über `AVERETH_CHROMIUM_EXECUTABLE` angegeben werden. Die User12-Probe hat eine gespeicherte Fixture und benötigt keinen Zugang zu einem Modellprovider.

```sh
npm test
npm run replay:check
npm run smoke:st:check
npm run smoke:st:isolated
npm run live:st:selftest
node tools/st_live/user12_revision_smoke.mjs
```

Für die vier Archivkampagnen stellt `recherche/langzeittest_211/offline.py <Archivordner> <neuer Arbeitsordner>` im Dokumentationscheckout die ursprünglichen Präfixe wieder her. `node recherche/langzeittest_211/gleiches_ergebnis.mjs <Repo-Checkout> <Arbeitsordner> GA GB HB PA` prüft dieselben Weltstufen je Checkout. Verglichen wurden `.211` und der Kandidat mit derselben Archivkopie.

## Commitkette ab .211

| Commit | Inhalt |
|---|---|
| [`aaed9f8c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/aaed9f8cec52138d84e7b16374e41f5d7ddf206d) | Parent-Bindung je generierter Swipe |
| [`e9f9e25e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e9f9e25e29b5831dc971cf793ebb585604bfc3c7) | NPC-Entscheidung nach temporärem Sidestep |
| [`643dec12`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/643dec12022f3e7c70849053871691f72eabc86c) | Sicherer Halt bei ungeklärtem Spielerrequest |
| [`2b975bfa`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2b975bfa8a153e5ef4bb02a7fe7c3f7068d7f7a3) | Handelsklausel und bestehende Retailpreise |
| [`cf2b1582`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cf2b1582213cea13b886b41db1d5ab9ac6dde41e) | Gewöhnliche Bewegung und bekannte Dungeon-Gates |
| [`0d162c4a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0d162c4ad80a355873271a123c009ddb43141533) | Native Ausrüstungs- und Rastbefehle über die bestehende Mechanik |
| [`4347d37c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4347d37cba3860b2eaa2c96b65ed188e8e2d73a4) | Weltgebundene PULSE-Gefahr und Ereignishinweise |
| [`cfda7422`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cfda742210d7e1fedb2a43268c267181b2800e75) | Board-Repair und technischer Systemtext |
| [`02f0bcca`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/02f0bccaf329fc105aa4928a32905dd78f9b54fc) | Native User12-Reproduktion |
| [`45fa1f55`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/45fa1f5516ff5392f7128bf6bbc30d36318a2d8b) | Historische Finanz-, HUD- und Host-Gegenfälle |
| [`e2e71b6b`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e2e71b6b1d83838d7c29158f949aca5e44a44e0c) | Szenendetails und zusammenhängende Kampagne |
| [`7649816c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7649816c700876e24896cd16654edcafa746b54e) | Board-Systemmeldung im nativen ST-Smoke |
| [`4f0f9bce`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4f0f9bce2aa4e5d66be2f2cf5f345e2a36cacb67) | Eigene ST-Startmeldung statt fremder HTTP-Antwort |
| [`dd91e98c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/dd91e98c48f9c143e0c8744be2f216143840cef8) | Preisplan auf den Narratorkontext begrenzen |
| [`09d7d869`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/09d7d869b64a137bcd3469abfe9a58ef8aecd612) | Terminaltitel bei nativer ST-Startmeldung berücksichtigen |
| [`0f632b7a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0f632b7a596beedcdb038f50f438abbd73f9f9e9) | Rekonstruierter selbstreferenzierender READY-Bericht |
| [`f178a229`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f178a22985f589c5d8134c99ef5d0ebe208dbf2b) | Ausdrücklichen Transportwunsch bei belegter Ankunft anwenden |
| [`7cf33bc0`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7cf33bc08b050e1445ce8ee859c4d54f4b6000fc) | Dieselbe Transportwahl in Narrator- und Extractorkontext |
