# User07 auf .204 · Einzelabnahmen

Basis `b51e850bfa233b32f10ba01c563002ab26061c85`. Technischer Branch `experiment/204-user07-board-dungeon-camp`. Die angegebenen ST-Zeiten stammen ausschließlich aus der markierten 1.19.0-Sandbox mit lokalem Mock.

**Ergebnis für den Gegenreview.** Auf dem sauberen Endcommit `4ff1500e4929c0604803a19d31fb6b52b348f209` bestanden 3.422 Node-Tests, 2.235 exakte Replayvergleiche, 366 Standard- und 372 Failsoft-Prüfungen. Bei I6 entfällt ein belegter Boardrequest. Offen sind die natürliche Extractor-Repairrate, der Abruf der I31-Spuren im Folgezug und die Erkennungsrate frei formulierter Campausstattung. [Fachpläne und Gegenreview](../patch_plans_10b/GEGENREVIEW_USER07_FACHPLAENE_A_B_C_GPT_2026-11-21.md) · [User07-Originale und Auswertungen](../testrun_10b/user-20261121-171341-204/README.md)

## A · Tagesboard und HUD

Commit `9fc26076162cdf3f769fe2b9da6e293d030fb4e5`. Das aktive F-Board darf jede mechanisch gültige Schwierigkeitsverteilung enthalten. Eine ausdrücklich als schwacher Einzelgegner angebotene Jagd muss weiter zum zugelassenen Habitat und Körperbau passen. Der kleine zweite Request bleibt auf einen unabhängig abgewiesenen Einstiegshunt begrenzt. Bei seiner Ersetzung gelten die üblichen Jagd- und Gesamtregeln. Die Tafel behält vier Jagden und eine Clearance oder, je nach bestehender Freigabe, fünf Jagden. Ranggrenze L1–14, Habitat-/Populationsprüfung, Questidentität, Tageswechsel, Annahme und Auszahlung laufen über die bisherigen Fachpfade. Die Farbregeln gelten für Avereth-Schaltflächen im Chat und Composer.

* I6 mit den Originalantworten auf demselben Vorzustand. Basis verlangt P/Board/Board. A verlangt P/Board und veröffentlicht alle fünf Verträge einschließlich drei Wölfen. Der historische zweite Aufruf dauerte 56,168 s. Beim Nachspiel der drei Slotfälle User04/05/06 entsprachen jeweils zehn Ereignisse der archivierten gültigen Tafel.
* Reproduktion mit `node tools/user07_board_check.mjs <User07-Archiv>` und `node tools/board_slot_offline.mjs <main-Checkout>` im Engineverzeichnis. Alle 3.412 Node-Tests und 2.235 Replayfälle bestanden. Drei neue exakte Fingerprints, einzeln begründet in `tests/replay/accepted_user07_a.json`. Bei b17-warrior#11 ist die erste Familienverteilung weiterhin ungültig, der Vollrepair ohne L1 ist gültig. Bei b17-warrior#135 (drei Sumpfottern) und b19-mage#167 (zwei Wölfe) gilt die erste Gruppe. Eine historische Folgeantwort bleibt unbenutzt. Der separate .191-Test prüft in W#11 nun den wirklich veröffentlichten ersten Jagdort.
* Im ersten Abnahmelauf wurden frühere Erwartungen an die Pflichtjagd rot. Beide User03-Erstboards mit Zweier-/Dreiergruppe sind fachlich gültig. Die archivierten Zweitantworten mit zu starkem Einzeltier bleiben geeignete echte Negativfälle. Direkte Annahme und Draft, schmale Ansicht, explizit helle/dunkle ST-Farbvariablen, Tastaturfokus und Regenerate/Swipe wurden im isolierten Modus `user07_board_hud` geprüft. 118/118 Checks bestanden.
* T4 für den zusammenhängenden Boardzug. Zeiten in Millisekunden ab Sendeauslösung, jeweils Weltcommit / bestätigter Read-back / beobachtete Hostfreigabe. Ersttafel **685 / 736 / 744**, Vollrepair **729 / 783 / 792**, Slotrepair **731 / 779 / 788**. Die Browsererhebung korreliert die aktive Antwort und den erfolgreichen World-Job mit dem Save und dem sichtbaren freien Sendepfad. Der Mock brauchte P/Board/N/X beziehungsweise einen zweiten Boardrequest. Die isolierten P/Board/N/X-Dauern waren 0/0/0/301 ms im ersten Arm, 0/0+0/0/300 ms im Vollrepair und 0/0+0/20/301 ms im Streaming-Slotarm. Die Nullwerte entsprechen der Auflösung der Mockuhr. In allen drei Armen stimmten Welt und Ereignisse nach Reload überein. Natürliches Modellverhalten und längerfristige Zielzeiten sind offen.

## B · Registrierung, Dungeonwege und Extractor

Bei einer erfolgreich bezahlten Registrierung beschreiben PAYS und Extraktionsauftrag Schalter, Stein und Platte als eine Dienstleistung. Im I5-Nachspiel bleiben die zwei unberechtigten Ankünfte des archivierten X und die beiden Szenenfolgen gesperrt. Ein kontrollierter Bericht über die tatsächliche Messung speichert das Wissen des Clerks ohne Ortswechsel. In der kombinierten Eingabe bleibt ein getrennt gewähltes GO nach Ashbridge autorisiert. Konto, Mitgliedschaft und Zeugenregeln verwenden dieselben Buchungen.

Bei einem neuen Dungeonabschnitt endet die Bewegung im zugewiesenen Raum. Auf einem bekannten Dungeonweg gilt die bekannte Verbindung einschließlich tatsächlicher Hindernisse. Außerhalb des Dungeons gilt die bisherige Reiseanweisung. Das ruhige Dungeonergebnis bietet Funde und Spuren im Raum an. I26/I27/I31 erreichen im Archivnachspiel weiterhin l1_s1/s2/s3. Auch auf der neuen Basis blockiert die Weltanwendung beide unzulässigen I31-Ausgänge.

| Fall | Versuch und Entscheidung |
|---|---|
| T1 · I17 | Beim erfolgreichen Suchwurf mit Bewegungsberechtigung nennt der X-Auftrag den Startort sowie die Herkunftsregel am Ort der Sichtung. Archivierte Erst- und Repairantwort verarbeitet. Mit festem Modelltext und genau zwei Korrekturen (Spurenszene und Population) ergibt bereits der erste Versuch die archivierte Welt. Bei den drei Goblins gilt im Original `independent`. Das Ergebnis wird weiterhin an der jeweiligen Population geprüft. |
| T2 · I26 | Die widersprüchliche Einladung zur Wegwahl entfällt. Der originale mehrörtige Bericht braucht weiter seine Chronologieprüfung. Die frühere mechanische Zuordnung aller fünf Zwischenereignisse zum Tor lagerte unter anderem den Leichenbefund falsch. Es gibt keinen eigenen T2-Parserpfad. |
| T3 · I31 | Die archivierte reparierte Antwort speichert den Topf korrekt im Raum, die zwei Fakten aber unter freiem Namen. Der isolierte Promptversuch gab die vorbestimmte Raum-ID und die flache Objektform an. Mit festem Gegenbericht konnten Spuren und Kammerbeschreibung über diese ID nach einem JSON-Roundtrip gelesen werden. Das Prädikat `state` wird unter der kanonischen ID von einer bestehenden Fachprüfung abgewiesen, ein beschreibendes Prädikat wurde akzeptiert. Selbst damit fehlten die Spuren im regulär budgetierten Narratorblock der synthetischen Folgeinspektion. Der zusätzliche T3-Prompt wurde verworfen. Eine gesonderte fachliche Untersuchung des Abrufs und der Ablehnung bleibt sinnvoll. |

Die drei historischen X-Zweitaufrufe dauerten zusammen 120,051 s. Neue frei erzeugte Antworten wurden nicht gemessen. Aus dem Replay folgt keine natürliche Einsparung.

Die vollständige Node-Suite bestand mit 3.412/3.412 Tests. 2.235 Replayfälle bestanden mit exakten Fingerprints. Gegen A änderten sich bei 15 Eingaben ausschließlich Handlungs-/Kontexttexte in `outcome.recorded`. Zehn betreffen die Registrierung. Bei b17-rogue#177/#191/#199 ist der Abschnitt der Haltepunkt, bei #191 zusätzlich die ruhige Raumgestaltung. #195 und #217 behalten den bekannten Weg nach Tall cleft bzw. Dripping gallery. Bei #217 bleiben die getrennte Freilandreise und Questabgabe gleich. Zu jedem Datensatz dokumentiert `accepted_user07_b.json` Vorgänger und neue SHA-256-Prüfsumme.

Die Archivprüfung läuft mit `node tools/user07_world_check.mjs <User07-Archiv>`. 51 gezielte World-Job-/Dungeonprüfungen und 89 weitere NPC-/Chronologie-/Kontinuitätstests bestanden. Die isolierten ST-Modi `user05_review` (108/108) und `narrator_streaming` (59/59) prüften unter anderem Save/Read-back, Entwurf, Stop, EOF, fehlerhafte Teilprosa sowie Swipe/Regenerate. In den vier gepufferten Mockläufen lagen die Mediane für erste sichtbare Prosa / vollständige Prosa / Commit / Save / sichere Eingabe bei 2.451 / 2.439 / 3.695 / 3.802 / 3.810 ms. Bei den vier Streamingläufen waren es 1.127 / 2.422 / 4.036 / 4.215 / 4.246 ms. Die Sichtbarkeitsprüfung des ersten Satzes verlangt zusätzlich die Lage im sichtbaren Chatfenster. Diese Messungen betreffen synthetisch verzögerte Antworten.
Auf dem B-Endstand bestand außerdem der isolierte Dungeon-/PULSE-/Native-World-Smoke `user07_world` mit 78/78 Checks. Commit `2c465aa8e2ee5fe5ce38bf1d962d7a2f0023e55f`.

## C · Sichtbare Campausstattung und Suche

**Original und Gegenprobe.** I17 sucht erst nach einem Lager, mit erfolgreicher PER-Probe. Auf dem gespeicherten Präfix nach I21 sind die drei besiegten Goblins geplündert. Alaric besitzt 43 cp einschließlich der 10 cp aus dem Kampf, die Gegnerwaffen sind bereits gutgeschrieben. Sein Ort ist die Anhöhe. Dort gibt es den Ortsfakt zum leeren Camp unter ihm und kein einziges Bodenobjekt. Der unveränderte I22-Planner auf Patch B würfelte erneut PER (77 bei 45,45 %) und konnte 30 Minuten Spielzeit buchen. Insbesondere weist der alte Antwortrecord keine Ankunft im Camp aus. Der Topf aus I31 liegt in einem anderen, bestätigten Dungeonraum.

**Neue Buchungsfolge.** Beim Nachspiel auf C erzeugen sowohl die ursprüngliche I22-Plannerantwort als auch der kontrollierte freie Blick eine enge GO-Erlaubnis. Der Eingaberecord belässt Alaric auf der Anhöhe. Erst die akzeptierte X-Ankunft kann ihn an den benannten Platz unterhalb bringen. Das Archiv liefert hierfür den Vorzustand, Spielertext und Planner. Die anschließende Ankunft und die unbeanspruchte Schale sind gezielte Mockantworten. Erst am erreichten Ort wird die Schale angelegt. Bei bloßer Fernsicht, bewachtem Weg, gesperrtem Zugang, unklarem Ziel oder falscher Ankunft verweigert die Gegenprobe den freien Fund. Aktiver Kampf verwendet den vorhandenen Kampfpfad.

**Wiederbesuch und Besitz.** Der bestätigte Antwortrecord speichert beim ersten belegten Bestand die IDs am Ort. Holder und Menge stehen weiterhin ausschließlich an den Weltobjekten. Ein stummer X-Bericht über einen bisher leeren Ort legt keinen leeren Bestand fest. Ein späterer Name für denselben zurückgelassenen Gegenstand füllt ihn nach Mitnahme, Teilung, Verbrauch oder Weitergabe nicht auf. Ein offen zugänglicher Fund kann in einer eigenen Handlung genommen werden. Bei Mitnahme im selben Zug müssen vorhandene ID bzw. belegtes Weltobjekt, autorisierte Mitnahme und tatsächlicher Ort zusammenpassen. Die Gegenprobe mit einem bewusst falschen X-Transfer auf Basis einer bloßen Erfolgsbehauptung bleibt ohne Besitzwechsel. Eine unabhängige Gabe der anwesenden Besitzerin funktioniert weiterhin.

Die gezielte verdeckte Suche im erreichten Camp behält den Wurf und die vorhandene Wiederholungssperre. Derselbe offene Bestand blieb bei festem Sucherfolg und bei Misserfolg verfügbar. Separate Tests prüfen das Sammeln von Beeren neben der Besichtigung, eine verschlossene Kiste und genommenes, verzehrtes Kaninchenfleisch. Die Änderung enthält keine neue Beuteziehung. Geld, Kampfertrag und aktive Quest werden im durchgehenden Browserfall vor und nach dem Reload verglichen.

**Grenzen für den Spieltest.** Für einen neuen frei verfügbaren Gegenstand muss die Antwort seine Zugänglichkeit und fehlenden Besitzanspruch ausreichend konkret ausdrücken. Unklare Beschreibungen bleiben Kulisse. Der Parser kann eng formulierte Sichtungen übersehen. Bei einer örtlich unklaren Annäherung, einer konkret benötigten Entscheidung oder einer verborgenen Suche von außerhalb darf die Erzählung am Hindernis bzw. nach dem Erreichen des Platzes halten. Eine neue freie Spracheingabe mit einem Synonym muss kein zweites Objekt ergeben. Der später zu prüfende Spielgefühlunterschied betrifft vor allem zugängliche Ausrüstung und entfallende Pflichtwürfe.

### T4 bei der Campabnahme

Drei aufeinanderfolgende, geskriptete Züge der markierten ST-Instanz, jeweils ein Planner, ein Narrator und ein Extractor. Dieselbe Browseruhr erfasst den Sendeklick, die bestätigte Weltrevision, den erfolgreichen Save-/Read-back und den frühesten beobachteten Frame mit freiem Sendepfad. Die Zielantwort muss zu diesem Zeitpunkt bereits angewendet sein. Die unabhängige Prüfung lädt den fertig gespeicherten Chat erneut. Der Testtreiber wartet zusätzlich auf Ruhe. Seine Rückkehrzeit wird separat erfasst.

| Mockzug | Weltcommit ab Klick | Save mit Read-back ab Klick | Sichere Eingabe ab Klick | Save-/Read-back-Dauer |
|---|---:|---:|---:|---:|
| Anhöhe → Camp, Übersicht | 1.715 ms | 1.985 ms | 1.989 ms | 271 ms |
| Gezielte Mitnahme | 1.876 ms | 2.144 ms | 2.147 ms | 267 ms |
| Erneuter Blick, absichtliche Doppelmeldung | 2.338 ms | 2.629 ms | 2.631 ms | 291 ms |

Die Campprüfungen liefen gleichzeitig mit lokalen Regressionen auf demselben Rechner. Diese drei Einzelwerte tragen keine Prognose für einen natürlichen Zug. Die Orientierungswerte 20/30/40/60 Sekunden waren kein Testkriterium. Der Originalfall I6 ist der einzige hier direkt nachgespielte eingesparte physische Request mit unveränderter archivierter Erstantwort. Bei T1 hängt der Bedarf an einem zweiten Request von der nächsten natürlich generierten Antwort ab. C behält P/N/X bei.

**Einzelabnahme C.** Commit `4ff1500e4929c0604803a19d31fb6b52b348f209`. Der rote I22-Originalplan erwartete null Suchwürfe und erhielt unter B einen. Nach C bestanden beide Plannerpfade mit bestätigter Ankunft, je einem P und einem X im Offline-Nachspiel und unverändertem Questzustand. 35 gezielte Camp-, Such- und Objektprüfungen, 3.422/3.422 Node-Tests, 2.235 Replayfälle und der isolierte Camp-Smoke (32/32) bestanden. Gegen B gibt es im Fingerprint-Korpus keine zusätzliche Abweichung. Die neue User07-Probe wird ergänzend mit `node tools/user07_camp_check.mjs <User07-Archiv>` ausgeführt.

## Geänderte Dateien

Alle technischen Pfade sind relativ zu `avereth-engine/`. Die Zweige für das eingefrorene Produkt und die bestehende Entwicklungsbasis wurden bei den Remoteprüfungen separat kontrolliert.

**Patch A**

- `package.json`
- `src/v4/guild.js`
- `src/v4/runtime.js`
- `style.css`
- `tests/replay/accepted_user07_a.json`
- `tests/replay/replay.test.js`
- `tests/v4/batch191_fixes.test.js`
- `tests/v4/fix159_board.test.js`
- `tests/v4/patch_f_progression.test.js`
- `tools/board_slot_offline.mjs`
- `tools/replay/replay.mjs`
- `tools/st_live/board159_smoke.mjs`
- `tools/st_live/isolated.mjs`
- `tools/st_live/run_c.mjs`
- `tools/st_live/ui161_smoke.mjs`
- `tools/user07_board_check.mjs`

**Patch B**

- `package.json`
- `src/v4/commands.js`
- `src/v4/living.js`
- `src/v4/runtime.js`
- `tests/replay/accepted_user07_b.json`
- `tests/replay/replay.test.js`
- `tests/v4/patch8.test.js`
- `tools/st_live/isolated.mjs`
- `tools/user07_world_check.mjs`

**Patch C**

- `src/v4/camp.js`
- `src/v4/commands.js`
- `src/v4/turn.js`
- `src/v4/world.js`
- `tests/v4/user07_camp.test.js`
- `tools/st_live/board159_smoke.mjs`
- `tools/st_live/isolated.mjs`
- `tools/st_live/run_c.mjs`
- `tools/st_live/safe_input_timing.mjs`
- `tools/st_live/user07_camp_smoke.mjs`
- `tools/user07_camp_check.mjs`

**Dokumentation auf main**

- `03_AKTUELLER_PROJEKTSTAND.md`
- `recherche/README.md`
- `recherche/USER07_204_PATCHABNAHME_A_B_C.md`
- `recherche/USER07_204_ABNAHME_MESSWERTE.json`

## Gemeinsame Abnahme

Die beiden bisherigen .204-Referenzen `experiment/action-hud-200-v1` und `experiment/204-b-playtest-ready` stehen bei `b51e850bfa233b32f10ba01c563002ab26061c85`. Das eingefrorene Produkt `claude/c-planner-prototype-2026-10-02-gpt-c666` steht bei `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`. Ausgangspunkt dieses Dokumentationscommits auf main ist `fc9e17936dcc78ba21e86b910948f9669b1a1747`.

### Nachspielen

Voraussetzungen sind ein Checkout des technischen Endcommits, eine getrennte Lesekopie von main mit den User07- und User04–06-Originalen sowie der Git-Objektstand `fc9e17936dcc78ba21e86b910948f9669b1a1747` für das Browserpräfix. Bei einer flachen Kopie zuerst die entsprechende Historie beziehen. Für die Browserprüfung wird ein funktionsfähiger, vom vorhandenen ST-Runner markierter Sandboxpfad vorausgesetzt. Der Sandbox-Runner kontrolliert den ST-Commit und richtet die Testdaten dort ein.

Im Engineverzeichnis liefen die folgenden Befehle. Die Umgebungsvariablen bezeichnen die beiden Archivordner, den markierten Sandboxpfad und bei Bedarf das lokale Chromium. Der ST-Runner verwendet seinen lokalen Mock.

```sh
node tools/user07_board_check.mjs "$USER07_ARCHIV"
node tools/board_slot_offline.mjs "$MAIN_CHECKOUT"
node tools/user07_world_check.mjs "$USER07_ARCHIV"
node tools/user07_camp_check.mjs "$USER07_ARCHIV"
npm test
npm run replay:check
node tools/st_live/isolated.mjs --mode both
```

Für die Einzelabnahmen lauteten die zusätzlichen Modi `user07_board_hud`, `user05_review`, `narrator_streaming`, `user07_world` und `user07_camp`. `AVERETH_ST_SANDBOX` muss die isolierte Testwurzel bezeichnen. In diesem Lauf wurde `AVERETH_CHROMIUM_EXECUTABLE=/usr/bin/chromium` verwendet. Die Feldwerte für T4, Requestphasen und die einzelnen ST-Zähler stehen im [maschinenlesbaren Abnahmeprotokoll](USER07_204_ABNAHME_MESSWERTE.json).

Die Schlussprüfung auf dem sauberen Endcommit bestand mit 3.422/3.422 Node-Tests. Alle 2.235 Replayfälle stimmten mit den freigegebenen exakten Ergebnissen überein. Davon unterscheiden sich 1.131 vom historischen Ausgangsbuild .126. Für alle 1.131 passen die freigegebenen Fingerprints, für null Fälle ist eine zusätzliche Ausnahme nötig. Auch die vier oben genannten Archivwerkzeuge wurden auf dem gemeinsamen Endstand nochmals erfolgreich ausgeführt.


| Gemeinsame isolierte ST-Abnahme | Bestandene Prüfungen | Lokale Mockaufrufe | Laufzeit der kompletten Suite | Ungefangene Browserfehler |
|---|---:|---:|---:|---:|
| Standard | 366/366 | 349 | 718 s | 0 |
| Failsoft | 372/372 | 356 | 709 s | 0 |

Beide Läufe verwendeten ST 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Chromium 156.0.8078.79 und Node 24.22.1. Die absichtlich provozierten Host-/Speicherfehler zählen zu den Fehlertests. Die Kampfschutzregeln, Questverträge, Geldbuchungen, Revisionsbindung und persistierten Ergebnisse wurden über die normalen Engine- und ST-Einstiegspunkte geprüft. Für diese Abnahmen wurden ausschließlich lokale Mockantworten verwendet. Der persönliche Spieltest und die Beurteilung natürlich generierter Erzählungen stehen nach dem unabhängigen Gesamtreview zur Nutzerentscheidung an.
