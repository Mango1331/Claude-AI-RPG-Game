# Action-HUD V1 — 4.3.0-c.6.6.201

Stand: 17.11.2026. Entwicklungsbranch `experiment/action-hud-200-v1`, Basis `.200 / 0cd14806cd0c7fe2ab0d54b8463c486ee572714b`. Verbindlicher [Fachplan auf main, 9862a57](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9862a57a7a69752e2e4ce2e299b631bc3bcce5e0/patch_plans_10b/FACHPLAN_ACTION_HUD_200_V1_2026-11-17.md); Analyse und Datei 08 bleiben Dokumentationsquellen. Die drei ausdrücklich erteilten Freigaben sind umgesetzt: gemerkter, bewusst gewählter H-Modus; begrenzte Routineautonomie; kein automatischer Retry bei unbekanntem Remoteabschluss. Ein zusätzlicher eigenständiger Gegenreviewtext lag dieser Umsetzung nicht vor.

## Verhalten und Bedienung

Für den V4-C-Pfad der `.200` verwendet die zusätzliche Auswahlleiste das normale ST-Textfeld und dessen Sendbutton/Enter. Auswahl allein bucht nichts. Vorhandene Skill- und Zielanzeigen dienen ebenfalls als Einstieg. Angriff, defensive Fähigkeit, gerichteter Bandschritt und tatsächlich getragene nutzbare Gegenstände verwenden einen gemeinsamen typisierten Eingabevertrag. Vorhandene Systeme für Kampf, Kosten, Initiative, NPC-Züge, Wachstum, Loot, PULSE, Inventar und Weltzustand bleiben zuständig.

- **F · Freitext mit Aktionen** ist der anfängliche Modus. Ein Planner liest Auswahl und Text gemeinsam. Die ausgewählte ID muss im Gesamtplan erhalten bleiben. Konflikte, geänderte IDs, doppelte Anker oder eine verlorene Voraussetzung stoppen vor der Buchung. Bestehende ausgeschlossene Zusatzhandlungen bleiben als nicht ausgeführt sichtbar.
- **H · HUD + Begleittext** wird ausdrücklich gewählt und danach sichtbar gemerkt. Nur die Auswahl ist mechanische Autorisierung. Der Text bleibt freies Rollenspiel. Auch ein versehentlich dort formulierter Trankwunsch wird nicht zusätzlich ausgeführt; das ist keine allgemeine semantische Erkennung solcher Irrtümer.
- Entfernen der Auswahl stellt den bisherigen freien Eingabeweg wieder her. Systembefehle werden nicht mit einer unsichtbaren HUD-Aktion kombiniert.
- Bei einer noch ungebuchten abgelehnten Auswahl kann die beschriftete lokale H-Korrektur die letzte Auswahl ersetzen. Sie erstellt eine neue Eingaberevision und benötigt keinen erneuten Planner. Bereits gebuchte Handlungen sind darüber nicht veränderbar.
- Invalides Ziel, fehlende Ressource, Rang-/Reichweitenprobleme oder geänderter Ausgangszustand werden vor der Ausführung angezeigt. Vorschau verändert keine autoritativen Ereignisse oder RNG-Zähler.

Der Extractor bleibt für normale erzählte HUD-Züge erhalten. Ein geskripteter H-Normalfall hat **0 P + 1 N + 1 X**, der F-Normalfall **1 P + 1 N + 1 X**. Regenerate verwendet die bereits gebuchte Spielermechanik und fragt nur die neue Erzählung/Weltantwort an. Growth, Board, technische Reparaturen und Wiederaufnahme zählen jeweils zusätzlich; es gibt keine allgemeine Zwei-Request-Garantie.

## Eingriffspunkte und Autorität

| Pfad | Änderung |
|---|---|
| `src/action_input.js` | ID-Vertrag, stabile Eingabesignatur/Präfixrevision, aktuelle Aktionsprojektion, reine Vorprüfung mit bestehenden Fachfunktionen, Übersetzung in vorhandene Intents/Commands und F-Ankerabgleich. |
| `src/action_composer.js`, `src/hud.js`, `style.css` | Eine Auswahlleiste, H/F, sichtbarer Chip/gesendete Auswahl, lokale Korrektur, Status/Entwurf, echte ST-Eingabebindung. Keine eigene Inventar- oder Weltbank. |
| `src/v4/runtime.js`, `src/v4/planner.js` | Gemeinsamer `executeMappedTurn` aus dem bisherigen Pfad; H überspringt P. F erhält den typisierten Anker und alle Sprachprüfungen für zusätzliche Kommandos. |
| `src/combat.js` | Nur additive Vorprüfungsoptionen vor Kosten/Buchung und eine Encounter-Vorschau ohne Initiativewurf. Normale Auflösung bleibt unverändert. Verzögert materialisierte bekannte NPC-Profile werden nur auf einer privaten Zustands-/RNG-Kopie geprüft. |
| `src/host.js`, `src/v4/continuation.js` | Wiederverwendung prüft zusätzlich die Auswahl-/Modussignatur; editierte gebuchte Eingaben führen nicht zum Reroll. Savevergleich umfasst Eingabe- und Swipemetadaten. |
| `src/v4/action_persistence.js`, `index.js` | Gepinnter Avatar/Chatdateiname, Snapshot, Schreibwarteschlange/Web Lock, technische Revision, zielgebundener Save und tatsächlicher Read-back. Native gzip-Saves verwenden dieselbe Schranke. |
| `src/v4/request_control.js`, `index.js` | Gemeinsame physische Transportbelegung für native N, Streaming, P/X/Repair und Raw-Fallback; dauerhafte Unknown-Sperre und ausdrücklich ausgelöster einzelner neuer Versuch. |
| Narratorvertrag, V4-Preset, `src/context.js` | Konsistente begrenzte Routinegesten in derselben Szene; freiwillige PC-Entscheidungen, neue Taktik, Kosten, Reisen und Verpflichtungen bleiben geschützt. H/F-Provenienz im tatsächlich gesendeten Kontext. Die alte pauschale Kampfstille wird bei HUD-Eingaben durch erlaubte Spielerworte und kurze NPC-Reaktionen ersetzt; freie Altpfade behalten ihre bisherigen Texte. |

Der bestehende Kampfmapper führt keine allgemeinen `needs`-Ketten aus. Ein HUD-Kampfschritt mit externer, noch nicht aufgelöster Voraussetzung wird deshalb ausdrücklich zur lokalen Klärung zurückgegeben. Die bereits unterstützte, vollständig vorgeprüfte gekoppelte Annäherung mit Angriff bleibt möglich. Es gibt keine neue allgemeine Check- oder Aktionskettenmechanik.

## Tatsächliche ST-Grenzen

ST 1.19 sendet `GENERATION_STARTED` und `GENERATION_AFTER_COMMANDS`, speichert die neue Usernachricht aber bereits **vor** `MESSAGE_SENT`. Daher wird eine origin-/präfixgebundene Reservierung im ersten nativen Save mitgeführt. `MESSAGE_SENT` bindet nur die exakt passende Nachricht und speichert/read-backt die echte Eingabe. Reload kann diese genaue Reservierung vervollständigen, aber keine verloren gegangene HUD-Auswahl aus Prosa erraten.

Der normale UI-Send erfasst den Ursprung schon vor STs erstem asynchronen Schritt. Epoch/Chatidentität werden nach asynchronen Phasen erneut geprüft. Ein Chatwechsel kann weder Bindung noch Folgegeneration in einen anderen Chat verschieben. Stop lässt bereits gebuchte eigene Mechanik nachvollziehbar bestehen, erlaubt aber keinen veralteten Folgeabschluss.

Verwendete reale APIs: `SillyTavern.getContext()`, `eventSource/eventTypes`, normale `generate`, `stopGeneration`, `reloadCurrentChat`, `openCharacterChat`, `getRequestHeaders`, `/api/chats/save` und `/api/chats/get`. Es wird kein fiktives ST-`saveChatFor()` vorausgesetzt. Das native `saveChat()` verschluckt Fehler; erst eigener Read-back erlaubt den Status „Gespeichert“. HTTP-Erfolg allein genügt nicht. Ein später komprimierter alter Snapshot darf den neueren Zustand nicht überschreiben.

Die native Narration bleibt sichtbar und kann streamen. „Weltabgleich“ und „Speichern“ sind eigene Statusphasen. Schreiben im Textfeld bleibt möglich; eine neue normale Eingabe wartet auf bestätigten Abschluss. Bei Savefehlern speichert „Abschluss prüfen / fortsetzen“ denselben Stand erneut. Das wiederholt keine Spielermechanik. Eine noch nicht ausgeführte Eingabe muss anschließend ausdrücklich erneut generiert werden. Ein fehlgeschlagener Extractor wird nur für dieselbe, noch unabhängig wiederaufnehmbare Antwort fortgesetzt.

Die begrenzte dauerhafte Requestdiagnostik hält Ursprungs-Chat, Eingabe-ID/Revision, Phase, separate physische Request-ID, Versuchsnummer und Kapazitätsbereich fest, ohne Prompts oder Secrets zu speichern.

Die physische Sperre umfasst nicht nur HTTP-Header, sondern den konsumierten Antwortkörper beziehungsweise das terminale SSE-Ende. 120 Sekunden lokaler Wartehinweis geben keine Remote-Kapazität frei. Abort/abgebrochener Stream/Concurrency-Ablehnung sowie generische ST-Fehlerbodies ohne nachgewiesenen Remoteabschluss bleiben über Reload gesperrt. Auch ein leeres `choices`-Array gilt nicht als Abschlussnachweis. Ein ausdrücklicher neuer Versuch warnt vor möglicher Überlappung mit dem unbekannten alten Request. Scheitert auch er ohne Abschlussnachweis, gibt es keine weitere automatische oder unbegrenzt wiederholbare Freigabe.

## Abnahme und Evidenz

Ausführliche lokale Logs liegen im Arbeits-/Sandboxverzeichnis, nicht in historischen Fixtures. Nur Mockprovider und die markierte Sandbox `/workspace/avereth-setup/st-sandbox` mit separater Datenwurzel wurden verwendet. Keine persönliche ST-Installation, keine natürlichen Provideraufrufe.

### Gezielt

- Neue `action_input`, `action_persistence`, `action_request_control`-Tests prüfen Eingabe, Fachauflösung, Save und Transport; finale Zähler siehe Gesamtergebnis.
- Zentrale H-Rotfälle gegen den unveränderten `.200`-Runtimeimport zeigten den fehlenden typisierten Weg (Planner statt H). Das ist kein alter Combatfehler.
- Der neue A14-Gegenfall zeigte zunächst **10 gebuchte Ereignisse statt 0**, wenn ein Angriff von einer freien, nicht aufgelösten Handlung abhing. Nach der Korrektur wird vor jeder Buchung lokal geklärt.
- `.191` W #29: vollständige Ereignisgleichheit mit dem Originalpfad; #127/#129: keine Teilbewegung, keine Ereignisse. Historische Originaldaten unverändert.
- Originaler offensiver Scroll aus `live_1020.json`: H/F behalten das genaue Ziel und stimmen vollständig mit der bestehenden Engineauflösung überein; kein zweiter Verbrauch nach Regenerate.
- Ein sichtbarer Gegner außerhalb der laufenden Initiative verursachte in der neuen Vorschau zunächst einen `alive(undefined)`-Fehler. Die private Vorschau ergänzt solche vorhandenen Teilnehmer mit dem bestehenden `addCombatant`; der echte Zustand und RNG bleiben unangetastet. Der Gegenfall ist danach grün.
- NPC-Zusage nach HUD-Aktion: bestehender Extractor speichert den Thread; späterer Kontext enthält ihn ohne den ursprünglichen aktiven Dialog.

### Fallmatrix

| Planfälle | Nachweis |
|---|---|
| A01–A03 | Neue Eingabetests: H/ID/MP/Stale; bestehende Combat-, Range-, Ammo- und Weaponregressionen. |
| A04–A07 | Guard, gerichtete Bewegung, Original `.191`-Annäherung/Distanz; bestehende Negations-/Konterfälle. |
| A08–A10 | Trank im Kampf, Cap/Rang, Nahrung/Werkzeug/Besitz, Original-Scroll, AoE-Vorschau; vorhandene Restore-/Stone-/Returnstone-/Cover-/Gruppenregressionen. |
| A11–A14 | H-Flankentext ohne zweite Mechanik, F-Anker/Konflikte, expliziter H-Irrtum, Abhängigkeit ohne Teilbuchung. |
| A15 | Vollsuite und bestehende ST-Finanz-/Questboard-/TAKE-/NPC-/Creation-Module; systemgebundene Texte mit Auswahl lokal blockiert. |
| A16–A19 | Echter Send/Enter, Draft-only, Eingaberevision, lokale Korrektur, Reload/Regenerate; bestehende Swipe-/Payment-/Editregressionen. |
| A20–A22 | Späte Planung/Stop, echte ST-Chatwechsel- und Reservierungsfälle, Save-Failure/Read-back, alte native Snapshots und fremde Revision. |
| A23–A25 | Tatsächliche Backendzählung 4/4, native SSE, Abort/Reload/Unknown, ein expliziter Versuch; bestehende Failsoft-/Trunkierungsfälle. |
| A26–A28 | NPC-Thread außerhalb Dialog; tatsächlicher Narrator-Wire-Prompt und aktive Description; bestehende breite UI-/Dungeon-/Loot-/Settingsprüfungen. |

### Gesamtergebnis

Die abschließende Node-Suite bestand mit **3.379/3.379 Tests**, ohne Fehler oder übersprungene Tests. Die drei neuen gezielten Testdateien bestanden mit **34/34**. Vollständiger Replay: **2.235 Fälle**, 0 neue/unfreigegebene Abweichungen, 0 Replay-/Foldfehler. Die 1.131 gegenüber der alten `.126`-Baseline abweichenden Fälle stimmen sämtlich mit der bereits bestehenden exakten Freigabe `accepted_stat195_vs_126.json` überein. Keine Änderung dieser Freigabe oder der Originaldaten.

`npm run smoke:st:check` bestätigte ST **1.19.0**, Chromium **151.0.7922.34** und die vorhandene markierte Sandbox. Der vollständige Standardlauf unter `out/2026-11-17T21-30-28-901Z/standard` bestand mit **271/271, 0 PageErrors**, 290 physischen Mockbackendrequests. Der vollständige Failsoft-Lauf desselben Berichts bestand mit **280/280, 0 PageErrors**, 299 physischen Mockbackendrequests. `report.json`, `report.md` und beide Ergebnislisten wurden geprüft; keine ausgeblendeten fehlgeschlagenen Checks. Der abschließende Standardnachtest `out/2026-11-17T21-53-16-633Z/action_context` bestand mit **92/92, 0 PageErrors**, 76 physischen Mockbackendrequests. Er umfasst Action-HUD, Host, Kontinuität und NPC-Karten einschließlich der letzten Transportergänzungen.

Die abschließende Requestdiagnostik (Eingabe/Revision/Versuch) und die konservative Einstufung generischer ST-Fehler wurden nach Start dieses Standardlaufs ergänzt. Sie sind in der finalen Node-Suite enthalten und sind sowohl im anschließenden Failsoft als auch im gezielten echten Standardnachtest bestanden; der ältere Standardzähler wird nicht als Prüfung dieser erst später ergänzten Fälle ausgegeben.

Die ersten kompletten ST-Läufe deckten veraltete Harnessannahmen auf (automatische Save-/Fetch-Recovery, ST-Reconnect nach Reload). Der erste Lauf brach an der alten automatischen Save-Recovery-Probe ab: Der neue Host hält bei fehlgeschlagenem ersten Save früher an. Die Probe wurde auf sichtbare Sperre, ausdrücklich ausgelöste Wiederaufnahme, echten Read-back und unveränderte Wirtschaftsereignisse angepasst. Ein erster vollständiger Standardlauf erreichte 260/265 bei 0 PageErrors. Die fünf Fehler waren fehlende gespeicherte Kontextdiagnostik in nichtstreamenden Antworten, während Wire-Karten, NPC-Zusagen und Weltbuchung korrekt waren. ST 1.19 löst `GENERATION_ENDED` hier vor `MESSAGE_RECEIVED` aus. Der origin-/epochgebundene Diagnosesnapshot bleibt jetzt bis zum Empfang erhalten und wird bei neuer Generierung/Stop/Chatwechsel verworfen. Der gezielte Browsernachweis `out/2026-11-17T21-26-55-254Z/action_context` bestand mit **89/89, 0 PageErrors** und 74 physischen Mockrequests. Er prüft die Diagnostik ausdrücklich auch ohne Streaming, zusätzlich NPC-Karten, HUD-Swipe, Doppelklick, IME und Entwurf während X.

Die Fetch-Probe erwartet nun einen als `remote_unknown` klassifizierten Versuch, über Reload erhaltene Sperre und ausdrücklich bestätigte Fortsetzung. Eine fehlgeschlagene Weltantwort wird vor dem nächsten normalen Zug ausdrücklich erneut abgeglichen. `noPageErrors` bleibt uneingeschränkt.

Die alten E3-Kartenfixtures bleiben unverändert. Der Vergleich normalisiert ausschließlich den dokumentiert geänderten `PLAYER ACTIONS`-Agency-Satz; alle Karten und sonstigen Kontextbytes bleiben überprüft. HUD-HTML-Assertions berücksichtigen die hinzugefügten Buttons. Alte minimale Transport-Testdoubles prüfen weiterhin ihren Legacy-Zweig; der echte neue Transport wird separat und im Browser geprüft.

Ausgeführt: gezielte drei `node --test`-Dateien, vollständiges `npm test`, vollständiges `npm run replay:check`, `npm run smoke:st:check`, `npm run smoke:st:isolated` und abschließend `npm run smoke:st:isolated -- --mode action_context`. Die Browserberichte nennen als Checkout noch `0cd14806 (uncommitted changes)`, weil die Abnahme vor dem Liefercommit stattfand; geprüft wurde Build `.201` mit den hier beschriebenen Änderungen.

## Grenzen und nächste Freigabe

- Ein schreibender Avereth-Client je Chat. Gleichursprüngliche Tabs teilen Web Locks und Providerleases. Der nachgewiesene Host ist Chromium 151 auf `localhost` (sicherer Browserkontext); andere Browser oder unsichere HTTP-LAN-Kontexte ohne Web Locks sind nicht als Mehrtabbetrieb abgenommen. ST bietet keine serverseitige CAS-Transaktion; parallele andere Browser/Serverclients sind nicht freigegeben.
- H kann einen irrtümlichen zusätzlichen mechanischen Wunsch im Begleittext nicht allgemein erkennen. Auswahl/Modus sind deshalb vor und nach Send sichtbar. Mocktexte beweisen keine natürliche Agency- oder Dialogqualität.
- Normale Extractorarbeit und zulässige technische Reparaturen bleiben. Wichtige NPC-Memory wird nicht zugunsten einer behaupteten Requestersparnis übersprungen.
- Die UI bleibt ein Einstieg in vorhandene Aktionen. Freie Handlungen und komplexe nicht typisierte Wünsche bleiben beim vorhandenen Planner; keine allgemeine Retcon-, Shop- oder NPC-Editorerweiterung.
- Abnahme zuerst durch unabhängigen Produktdiff-Review. **Kein GO für persönlichen LLM-Spieltest und kein Merge aus dieser technischen Umsetzung.**

## Installation dieses Entwicklungsstands

Nur den Entwicklungsbranch separat installieren. Produkt `.200` und `main` sind unverändert. Vor einem später ausdrücklich freigegebenen Spieltest die tatsächlich verwendete **Character Description vollständig** mit `content/narrator/Avereth_Narrator_Contract_v4.txt` (Revision `.201`) aktualisieren und das zugehörige `presets/Avereth Narrator V4.json` importieren/auswählen. Der aktive Wire-Prompt wurde mit genau dieser Kombination im isolierten ST geprüft; eine alte persönliche Karte wird durch Extensionupdate nicht automatisch ersetzt. Keine bestehenden persönlichen Daten werden hier geändert.
