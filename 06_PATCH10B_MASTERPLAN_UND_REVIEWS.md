# Avereth Engine – Patch 10B: Masterplan, Designreviews, Testbefunde und Entscheidungsspeicher

## Wegweiser – gezielt lesen, nicht vollständig beim Einstieg

- **Einziger aktueller Produkt-, Test- und Abnahmestand:** [03_AKTUELLER_PROJEKTSTAND.md](03_AKTUELLER_PROJEKTSTAND.md); die folgenden Datumsstände sind historische Einträge.
- **Aktueller Fachpatchstand:** [§29](#29-run-12-fachpakete-25102026) und [Run-12-Fachplan](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md): Dungeon/Guild in .79/.80 umgesetzt, World-State auf Folgeauftrag in .81 implementiert; aktueller Teststand und natürliche Abnahme in 03. [§27](#27-vorbereitung-der-verbleibenden-10b-fachpatches-für-sol-24102026) und der damalige Implementierungsindex sind historische Wegweiser; erledigte Arbeiten daraus nicht erneut beginnen. Weitere Themen nur nach aktuellem Nutzerauftrag und Status in 03.
- **Offene Designfragen:** [§§5–8](#5-monster--lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse) (Monster, Sapienz, Loot, Verfolgung), [§§9–11](#9-andere-10b-prioritäten--vollständige-aber-noch-nicht-freigegebene-fachbereiche) (Balance, Performance, Matrix und Entscheidungen). Nicht automatisch implementierungsfreigegeben.
- **Frühere Patch-/Implementierungsnachweise:** §§13–26, besonders [§25](#25-konsolidierte-übergabe-an-sol-vor-dem-nächsten-großen-patch-24102026) und [§26](#26-run-5--erster-echter-65-langlauf-extractor-api-fertig-host-bleibt-900-s-pending-24102026). Die passende einzelne technische Patchnote auf Dev ist für Implementierung führend.
- **Original-Livetests:** [testrun_10b/README.md](testrun_10b/README.md) mit unveränderten ZIPs und jeweils genau einer ausführlichen `REVIEW.md`.
- **Run 20 – technische Folgepläne (26.10.2026, nur Planung, kein Codepatch):** [Extractor-Szenen/Repair/Timeout T252](patch_plans_10b/PATCH_RUN20_EXTRACTOR_REPAIR.md), [Guild-Stadtkontext T203](patch_plans_10b/PATCH_RUN20_GUILD_CITY_CONTEXT.md), [Angebotsstatus `repriced`/Integrität T236](patch_plans_10b/PATCH_RUN20_REPRICED_INTEGRITY.md). Grundlage [Run-20-Review](testrun_10b/20261026-063907Z-current_test/REVIEW.md) und Sols Nachprüfung. Scaling, bessere Händlerangebote und Questlevel sind separat; T251/T252-Questzähler hat keinen belegten Guarddefekt. Entwicklungsstand bei Planung `.95`.

- **Run 22 – letzter .98-Livetest vor neun Batchläufen (26.10.2026):** [REVIEW.md](testrun_10b/20261026-132758Z-current_test/REVIEW.md) und [konsolidierter technischer Vorbatch-Patchplan](patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md). Nachgewiesen: **P1 zweimalige 6-cp-Unterkunftszahlung für ein Angebot** (i112, alte gleichzeitige Kaufentscheidungen) und **P1 T73 Extractor-Abbruch** nach vom Narrator ohne GO erfundenen Markt-/Raumreisen. Zurückgestellt und im großen Patch zusammenzufassen: GO→SEARCH-Ortschronologie, bestehende Board-Repair-Ablehnungsgründe, kanonische Shopkarte bei abwesendem Clerk, tatsächlich gebuchte Zwischenhalte. **.98 unverändert, Dokumentations-/Planungsstand, kein Produktpatch.**

**Historischer Planungsstand nach Run 10 (durch .76/.79 teilweise überholt; aktueller Status in 03):** [Privatjob / Player Agency](patch_plans_10b/PATCH_PRIVATJOB_AGENCY.md) und [Kampfwerte / Gruppengefahr / Flucht](patch_plans_10b/PATCH_KAMPFWERTE_GRUPPEN_FLUCHT.md). Diese beiden **getrennten, noch nicht implementierten** Pläne liegen auf `main`, damit Sols parallel laufende Board-Vereinfachung und Lieferkonsistenz auf Dev nicht verändert werden. Privatjob P1; Kampfkalibrierung P2 nach Messung. Keine neue Code- oder Balancefreigabe durch die Dokumentation.

**Run 11 (25.10.2026):** [ausführlicher Originalreview](testrun_10b/20261025-020335Z-current_test/REVIEW.md) zu natürlichem .76-100/100-Lauf. Zwei voneinander unabhängige P1: generischer `Recipient at …`-Lieferobjective-Text **und** zu grobe unbekannter-Innenraum→Elternort-Auflösung (E83 nicht am nachgewiesenen Innenraum, E165 wirklich dort; trotzdem kein Receipt) (0 Lieferbelege; 13 `quest_delivery`-Ablehnungen), sowie ungültiger NPC-Fakt nach abgelehntem `person.named`. Positiv: 2/2/1-Board, acht Siege, korrekte drei Guild-Payouts und privater 4-cp-Karrenlohn erst nach Spielerarbeit. Noch kein Gear-Upgrade trotz geänderter Guide-Priorität und 189 cp am Ende. **Nur Reviews/Links, keine Codefreigabe**; vollständige Einzelbelege nicht hier doppeln.

**Run 12 (25.10.2026, .78):** [ausführlicher Originalreview](testrun_10b/20261025-044431Z-current_test/REVIEW.md), 100/100, integrity OK, 1 Einzelsieg, Dungeon Ebene 1, aber Guildboard nach Repair 3/5 → failed; E146 doppelte Goblinmaterialisierung (6 Entities/3 Slot); E200 Trud+vier Goblins und Quest-READY am mechanisch aktuellen Schmiedehof. Präzisierung: E197 autorisiert GO, E198 bestätigt keine Ankunft; erst E199 enthält keine Commands. Ausrüstung wird nun gekauft/angelegt, jedoch Starter-Mage-MATK 10 → 0 bei Jagdmesser/Kurzschwert. Keine natürliche Delivery-Abnahme, keine numerische Gruppenbalance-Freigabe. **Nur Review/Index; fachliche Belege nicht hier duplizieren.**

**Pflege ab jetzt:** Hier nur kurze neue Entscheidungen, Statusänderungen und Links zum fachlichen Beleg eintragen; **keine vollständigen Patchnotes oder Einzelrunreviews kopieren**. Aktuellen Status ausschließlich in 03 führen. Vergangene Einträge bleiben als datierte Nachweise unangetastet.

---

## Historischer Kopfstatus (24.10.2026) – damalige Momentaufnahme, nicht aktuelle Einstiegslektüre

**DAMALS KONSOLIDIERTER STATUS – 24.10.2026, nach `.66`-Hotfix und unabhängigem Source-Review:**
- **Codebasis:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, verifizierter **Produkt-HEAD `.66` `4cd9b338773783644a79a39f367629e6aaeead05`**. Produkt `4.3.0-c.6.6.66` in `src/util.js`, `package.json`, `manifest.json`; Narrator-Vertrag .55 unverändert. Historischer `.65`-HEAD: `d182e900c6cb`.
- **Erledigte Patches:** **10B-1 (.58)** Fakten-Identität/Registrierungszahlung, **10B-2 (.59)** positive Lieferbelege, **10B-2b (.60)** F60-1–10-Folgefix, **10B-4a (.61)** begrenzte Planner-Leerantwort-Recovery, **10B-4b/b.1 (.61)** Runner-Phasenfehler und konservative Soft-/Hard-Failure-Politik, **10B-4c.1 (.62)** Extractor-Wiederholung, **10B-4c.2 (.63)** Host-/Chat-/Reload-Lifecycle, **10B-4c.3 (.64)** Recovery-Telemetrie und **10B-4c.4 (.65)** begrenzte Planner-Transport-Wiederholung/Runner-Nachträge.
- **Aktueller Nachweis `.66`:** Sol berichtet **1426/1426 Node-Tests**, **19/19 World-Job-Tests**, **21/21 ST-1.19-Smoke, Exit 0, fünf Extractor-Aufrufe** (§26.1); die unveränderte `.65`-Gegenprobe scheiterte mit 8 Calls und `pending`. **ChatGPT hat Diff, ST-Originalreihenfolge und Testcode unabhängig geprüft, aber weder Node noch Browser selbst ausgeführt (§26.2).** Ein echter natürlicher `.66`-GLM-100-Züge-Run steht aus.
- **Natürliche Live-Quellen:** vier ältere `.57`-`current_test`-Runs mit Original-ZIPs und ausführlichen Reviews im [`testrun_10b`-Index](testrun_10b/README.md): 26/100 (Tod), 25/100 (Narrator leer), 21/100 (Planner leer), 61/100 (Narrator leer). **Der erste neue .65-`current_test`-Export liegt nun vor: Run 5 `20261024-093931Z-current_test`; tatsächlich Build .65, `d182e90`, nach 3/100 Inputs `extractor_timeout`. Obwohl GLM die erste Extractor-Antwort nach 12,7 s lieferte, blieb der World-Record 900 s `pending`. P0 Live-Host-/JS-Integrationsbefund (§26); Original-ZIP im Chat, noch nicht auf `main`.**
- **Offen / NICHT implementiert:** **10B-3**, **10B-4d**, kleiner **F60-2-Regex-Restfall** und echte `.66`-GLM-/Langlauf-/Reload-/Providerlimit-Abnahme. Historische `swipe_info`-Snapshot-Wiederherstellung noch nicht geprüft; erster `.66`-Smoke mit zwei PageErrors (20/21), finaler sauberer Smoke 21/21. Monster-/Loot-/Chase-/Balancingreviews bleiben Design-Kandidaten, keine pauschale Codefreigabe.
- **Sol-Handoff:** [`avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md) auf dem Dev-Branch. **Hier §25** für vollständige Status- und Commit-Orientierung, §§13–24 für die lückenlose datierte technische Entstehung. Vor dem nächsten großen Patch Sol **selbst Code/Diff/Tests und neuen Originalrun prüfen lassen**; historische Testnotizen nicht als heutige Freigabe interpretieren.

**Stand vor 10B-2 (historisch):** Übergang von der Drei-Run-Analyse zu einer **gezielten 10B-Korrekturrunde**. Sols technischer Gegenreview und Folgefeedback liegen vor. **10B-1 ist implementiert (Build `.58`, Commit `e6c76b4`). Das unabhängige Diff-Review fand keinen Blocker (11/11 Zieltests). Ein anschließender unabhängiger Prüflauf meldet `npm test`: 1287/1287 grün und `smoke:st:c`: 2 von 3 Läufen OK; Lauf 1 scheiterte an einem nicht abschließend zugeordneten `AbortReason`-Seitenfehler aus SillyTavern. Echte ST-/GLM-Live-Abnahme darf folgen, ist aber noch nicht erfolgt.** **Der detaillierte Auftrag für 10B-2 steht in §14 und kann regulär auf dem Entwicklungsbranch umgesetzt und gepusht werden; der damals laufende lokale Runner war, wie das später gelieferte Run-4-Original belegt, noch auf `.57` (nicht `.58`). Der Nutzer aktualisiert den lokalen Git-Checkout erst nach Abschluss seines Runs. 10B-2 ist zum Zeitpunkt dieser Dokumentation noch nicht implementiert.** 10B-3/4 bleiben gesondert zu beauftragen.  
**Erstfassung:** 24.10.2026 · **Hauptdokument auf `main`**.  
**Entwicklungszweig:** `claude/c-planner-prototype-2026-10-02-gpt-c666`, beim Anlegen verifizierter HEAD `fd20d0dce0b0fc508b17810872b7933a5f00e994`, Engine `4.3.0-c.6.6.57`. Neue Git-HEADs stets live prüfen; diese Zeile ist ein datierter Snapshot.

> **Diese Datei ist ab jetzt der zentrale lebende Informationsspeicher für 10B.** Hier sammeln wir ausführliche Reviews, Befunde aus natürlichen SillyTavern-Läufen, Simulatoranalysen, Optionen, offene Fragen, Freigaben und später tatsächlich implementierte Fixes. Die vier übergeordneten Root-Dateien `01`–`04` bleiben Rollen/Kanon/Projekt-Übergabe/historischer Ideenkatalog; sie erhalten während der langen 10B-Phase **nur bei wesentlichem Meilenstein** einen kurzen Status und einen Link hierher. **Keine regelmäßigen parallelen 10B-Langtexte** in `03` oder `04`.

**Interpretationsschlüssel:** **[BELEGT]** = Code/Event/Quellenpfad nachgewiesen; **[BERICHTET]** = vom jeweiligen Reviewer/Implementierer angegeben, nicht zwangsläufig hier unabhängig nachgetestet; **[HYPOTHESE]** = plausible, noch isoliert zu reproduzierende Ursache; **[DESIGN-FIX-KANDIDAT]** = für spätere Auswahl festgehaltenes Spielgefühl-/Designproblem; **[EMPFOHLEN, NICHT FREIGEGEBEN]** = begründete bevorzugte Richtung; **[FREIGEGEBEN]** erst nach ausdrücklicher Nutzerentscheidung; **[IMPLEMENTIERT]**, **[TESTS BESTANDEN]**, **[LIVE ABGENOMMEN]** nur bei dazugehörigem tatsächlich verifiziertem Nachweis.

---

## 0. Historische Startseite aus der frühen 10B-Phase

**Dieser Abschnitt und die vorausgehenden datierten Kopfstände sind historische Schnappschüsse. Der einzige aktuelle Stand steht in [03](03_AKTUELLER_PROJEKTSTAND.md).**

**Unveränderter Kern:** „LLM versteht wie ein GM, die Engine rechnet wie ein Spiel“; Player Agency, sinnvolle Entscheidungen, lebendige große Welt und gute Progression **vor** starrer Simulation. Keine unaufgeforderte neue Monster-Speziesdatenbank, kein automatisches Monster-Level-Scaling zum PC, kein künstlicher XP-Farm-Nerf, keine zusätzlichen Pflicht-Reise-/Jagd-Miniturns. Klassische eigenständige Fantasyvölker (Elfen, Zwerge, Orks usw.) sind **bewusst nicht Bestandteil des gegenwärtigen Weltkanons**. Menschen und Monster existieren; Monster können intelligent sein, politische Verbände bilden oder friedlich sein.

**Patch-Vorgeschichte:** Patch 9D F→E Normal/Rare durch den gezielten **synthetischen** .57-Fixture-Livetest `20261024-021009Z-current_test` (23 Züge, 5/5, Reload bestätigt) für seinen eingegrenzten Pfad live abgenommen. Das ist **kein** Nachweis, dass in einer frei gespielten Kampagne Level 1→15 und Evolution bereits organisch erreicht werden. 10B ist keine Fortsetzung der alten Fixture-Zwangsroute.

**Drei Untersuchungsstränge:**

| Strang | Gegenstand | Belegstatus 24.10.2026 | Aktuelle Aktivität |
|---|---|---|---|
| **A – offene freie ST-Kampagnen** | `current_test` ohne Fixture ab echter Level-1-Erstellung; Ziel 100 echte Spielerzüge | **Vier historische .57-Runs**: 26 Tod, 25 Narrator leer, 21 Planner leer, 61 Narrator leer; **kein 100-Züge-Pass und kein .65-Livebeleg** | **Neuer Run vom Nutzer gestartet**, ZIP/Build noch ausstehend; danach Ursache gegen .58–.65-Commits und Recovery-Telemetrie prüfen |
| **B – deterministische Kampf-/Wirtschaftssimulation** | echte JS-Engine, 3 Startklassen, Builds und Monster, Seeds | Portabler Simulator `fd20d0d` **implementiert**; zusätzliche 60.700 Läufe durch ChatGPT zuvor berichtet; Methodik muss fair eingegrenzt werden | Daten sammeln, Taktik-, Startdistanz- und NPC-Seitenasymmetrien ausweisen; **keine** globalen Nerfs |
| **C – Verfolgung, Flucht, Rückzug, Bewegung, Monsterverhalten** | scheue Tiere, Band-System, Zeit-/Turn-Aufwand, Flee/Chase-Intent | Reale Hasen-/Fuchsjagd als Reibung dokumentiert; **bestehender** One-Roll-Escape-/Chase-Code verifiziert; genauen Fehlerpfad weiter isolieren | **DESIGN-FIX-KANDIDAT, ZURÜCKGESTELLT**, nach weiteren Runs/gezieltem Repro entscheiden |

**Querschnitt M – Monster/Lore/Content:** Mein erster Lore-/Monster-Audit und Sols ausführlicher unabhängiger Gegenreview sind in §§5–8 getrennt dokumentiert. **Vorrangige technische Empfehlung für später: D (eng begrenzter Anatomie-/Lootfix), danach nur bei echtem Nutzen C (kleiner Hybrid).** Keine der Varianten ist implementierungsfreigegeben. Teil C und Monsterverhalten haben Schnittmengen, werden nicht isoliert als zwei neue Systeme entworfen.

### Aktueller Nachtrag: Run 3 – 24.10.2026

**[Run 3 – 20261024-041150Z-current_test](testrun_10b/20261024-041150Z-current_test/REVIEW.md)** ist ausgewertet und auf main als ausführlicher Review abgelegt. Ziel 100, **21 Spielerinputs**, davon **20 erfolgreich abgewickelte** Spielzüge, 22:15 min; **technischer Abbruch durch doppelt leeren Planner** (Calls 63/64: jeweils 2000/2000 Completion-Tokens, 8740 bzw. 8306 Zeichen Reasoning, **0 JSON-Text**). Mage Lv1, Arcane Bolt + Flame Lance; **0 Kämpfe**. Eine echte Lieferung wurde nach einer ausgeprägten **Quest-/Frachtübergabe-Schleife** erst in T20 abgeschlossen; einmalig 40 cp und 23 XP korrekt gebucht; Endstand 70 cp/23 XP, HP/MP voll, Engine-Integrität OK.

**Neu bestätigter T10-Komplex (Delivery/Proof/Holder):** Originalvertrag verlangt eine Kiste zum **Steinbruchlager**, Beleg signed delivery chit; **keine Rückgabe der leeren Kiste nach Ashbridge** als Pflicht. T7/E14 und T8/E16 behaupten gültige Lieferung und setzen `quest.ready`, doch `object.created`/Holder führen die Kiste **beim PC**. T9/T15/T17 blockiert `proof.checked` den Abschluss, da PC weiter trägt; Narrator erfindet wechselnde Rückgabeanforderungen (erst Lager, dann Ossians Shop). T14/T16/T18 kann freiwilliges Abstellen/`give` wegen conditional-Intent/`pc_inventory` und Target-/Ortauflösung **nicht** zuverlässig gebucht werden. T19 wird das Cargo real **am Boden der Gildenhalle** abgelegt; T20 nimmt `proof.checked(mode:story_outcome)` den Auftrag nun an und zahlt aus, obwohl keine erfolgreiche Übergabe am eigentlichen Empfänger im Eventlog steht. Die Spannung ist doppelt: **frühe READY-Falschbestätigung**, später **falscher Endnachweis durch bloßes Nichttragen**. Nicht durch Abschalten des PC-Inventarschutzes oder frei erfundene neue Kistenpflichten lösen.

**P0/P1 für technische Planung:** 10B-T10 Delivery/Objective/Holder/Proof-Atomarität; T11 Planner`length`-Recovery; T12 keine frei erfundenen Rücklieferpflichten; T13 `give`-/`drop`-Semantik mit NPC-/Ortsangabe; T14 signierter Receipt/HUD-Verbrauch prüfen, **kein** pauschales Pflichtlöschen; T15 `extract.failed` bei ungültigem `place` und daraus folgender falscher Aufenthaltsort. **Dritter echter Lauf = dritter vorzeitiger Abbruch**, aber **drei verschiedene** unmittelbare Ursachen: Run 1 Tod/Agency, Run 2 Narrator vollständig leer, Run 3 Planner zweimal leer. Alle drei Mage, keine natürlichen Warrior/Rogue-/Levelkarrieren. Run 3 hat **kein** neues Kampfbalanceergebnis geliefert.

**Quellen-/Archivstatus (GitHub am 24.10.2026 erneut geprüft):** [ausführlicher Run-3-Review](testrun_10b/20261024-041150Z-current_test/REVIEW.md) und [ZIP `20261024-041150Z-current_test.zip`](testrun_10b/20261024-041150Z-current_test/20261024-041150Z-current_test.zip) liegen auf `main` (3.652.300 Bytes, GitHub-Blob `42b8d4b114d15415257dfe587e874e7ab89941e4`). Der frühere Chat-Export hatte SHA-256 `09e8f7a172921442fd4939dbdf806fb15b326e78230959d439bd2ca7a099979b`; Byteidentität der GitHub-ZIP wurde hier noch nicht durch erneute SHA-256-Berechnung nachgewiesen. **Aktualisierung nach abgeschlossenem Sol-Gegenreview (24.10.2026):** Sol hat nach eigenem Bericht alle drei Original-ZIPs samt drei ChatGPT-Reviews gegen Dev-HEAD `fd20d0d` geprüft, SHA-256-Abgleiche berichtet und zwei kleine lesende Funktionsproben ausgeführt; **keine neuen Red/Green-Tests oder vollständige Suite**. ChatGPT hat die zentralen Codepfade stichprobenartig gegengeprüft. Vier kleine, getrennt freizugebende Korrekturteilpatches wurden formuliert; **10B-1 (Fact-ID-Kollision und Guard/Resolver-`needs`) ist als erster Implementierungsauftrag vorbereitet, noch nicht umgesetzt**. Details und Quellen in §13.

---

**Testarchiv:** [`testrun_10b/README.md`](testrun_10b/README.md). Pro Lauf ein Unterordner `testrun_10b/<Run-ID>/` mit **unveränderter Original-ZIP** und **`REVIEW.md`**; nicht doppelt entpackt in Git. Der Nutzer übernimmt nötigen Binär-Webupload, ChatGPT das Review samt Index. Neue Runs in dieser Masterdatei **nur als knappe Querverweise**, vollständige turngenaue forensische Analyse bleibt im jeweiligen `REVIEW.md`.

**Wichtige Trennung:** Eine hohe P0/P1-Triage-Priorität bedeutet **nicht**, dass während der laufenden Test-Sammelphase heimlich ein Patch umgesetzt wird. Ein echter Verlust von Player Agency wird als späterer Fix-Kandidat ernst genommen, aber numerische Balance folgt erst auf belastbare Evidenz.

---

## 1. Dokumentations- und Quellenarchitektur für eine längere 10B-Phase

**Wer entscheidet was?**

- `01_ARBEITSWEISE_CHATGPT_CLAUDE.md`: dauerhaftes Rollenmodell und Methode; nur bei veränderter Arbeitsweise nachführen.
- `02_DESIGN_KANON.md`: **ausschließlich verbindliche** Nutzerentscheidungen (kein automatisch „kanonisch“ gewordener Reviewvorschlag).
- `03_AKTUELLER_PROJEKTSTAND.md`: kompakter aktueller Produkt-/Abnahmestand; frühere Chronik im verlinkten 03-Archiv.
- `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md`: übergreifende historische Ideen und 10B-Kurzverweis, **kein** zweites täglich fortzuschreibendes vollständiges 10B-Journal.
- **`06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` (hier):** Status- und Designjournal, zusammengeführte unabhängige Reviews, Ideenalternativen, Umsetzungs-/Abnahme-Matrix und Entscheidungshistorie.
- `testrun_10b/<Run-ID>/REVIEW.md` + ZIP: **unveränderte Evidenz und vollständige Einzelauswertung**. Keine großen ZIPs hier in der Haupt-MD wiederholen.
- Entwicklungsbranch `avereth-engine/docs/`, `src/`, `content/`, `tests/`: **tatsächliche Produktimplementierung**, technische Patchnotes und Regressionen; Haupt-Dokumentation auf `main` **ersetzt keinen aktuellen Git-Abgleich**.

**Ein neuer Test:** ZIP prüfen → Chat, Event-Log, Planner-/Extractor-/Narrator-Calls und Runnerstatistik getrennt rekonstruieren → `REVIEW.md` in eigenem Testordner + Index ergänzen → **hier nur** neue Befundklasse/Häufigkeit/Querverweis eintragen, falls inhaltlich neu. Keine unaufgeforderte Änderung an 01–04. Jede Einzelauswertung benennt ggf. unterschiedliche Builds, Modellparameter, Seeds und fehlende Belege.

**Eine künftige Freigabe:** Nutzer benennt die betroffene Kennung (z. B. `10B-M01`) und den Umfang. Erst dann werden Engine-/Test-/Patchnotes, Status `FREIGEGEBEN → IMPLEMENTIERT → GETESTET → LIVE ABGENOMMEN` **mit Commits und Prüfbelegen** fortgeschrieben. Vorher werden Alternativen gespeichert, keine Zahlen festgesetzt.

**53-Punkte-Abnahmeliste:** In früherer Projektplanung als bestehende externe/originäre Checkliste bezeichnet. Die Original-53 Einzelpunkte liegen hier **nicht als verifizierte fortlaufend nummerierte Liste** vor. Deshalb **keine 53 Punkte erfinden**; der umfangreiche vorhandene 10B-Abschnitt in [Datei 04 §1a.3](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) fasst belegte Bereiche zusammen, ersetzt die Original-Checkliste ausdrücklich nicht.

---

## 2. Verifizierte technische Ausgangsbasis und Grenzen der Nachweise

- **Code:** Dev-HEAD `fd20d0d`; Build `4.3.0-c.6.6.57`; aktueller Combat-Pfad V4-C/Ruleset 2 mit drei echten Startklassen **Warrior, Mage, Rogue**; fünf Klassen nur Legacy-Ruleset 1. Patch 9D F→E zielgerichtet live gezeigt, höhere Rangbereiche nicht pauschal als fertig bezeichnet.
- **Open Guide:** `tools/st_live/live/guides/current_test.json`: freie Level-1-Klasse und Startskills, kein Fixture, `openRun.minTurns=100`, Guide-Limit 105. Lokales `live.config.json maxTurns:40` wird seit Runner-Fix für Open-Guides nicht stillschweigend priorisiert; explizites `--max-turns` muss ≥100 sein. Die gezielte 9D-Fixture blieb in `patch9d_fixture.json`.
- **Kampfsimulator:** `avereth-engine/tools/sim/combat.mjs`, `baseline.json`, `package.py`, `README.md`, `tests/sim/combat.test.js`. Keine veränderten Produktbalancewerte. Sol: drei Kontrolltests und 1275/1275 Gesamttests (seine Ausführung, keine laufende Komplettsuite durch dieses Dokument). Paket wurde zusätzlich in anderer ChatGPT-Auswertung unter Node 22 statt nur Sols Node 24 gestartet.
- **Sol – Monster-Review:** referenziert selbst `fd20d0d`/Build .57, überprüft reale `content/monsters.json`, `src/content.js`, `src/combat.js`, `src/v4/world.js`, `src/v4/loot.js`; kein eigener Folgecommit, keine neuen Zahlen. Quelle: vom Nutzer übermittelte Datei `Chatgpt Feedback(8).md` (24.10.2026), **Original-Gegenreview, nicht als Implementierung ausgeben**.
- **Livetest-Status:** Run 1, 2 und 3 haben eigene ausführliche Reviews und ZIP-Dateien auf `main` (bei Run 3 ist die Dateipräsenz/Größe, noch nicht die SHA-256-Byteidentität unabhängig geprüft). Alle drei Mage, in allen wird Geld/XP bei Gildenturn-in korrekt einmalig gebucht, **Run 3 zeigt aber einen massiven Delivery-/Proof-Loop und eine fälschlich durch Drop an der Gilde erfüllte Quest**. Abbruchursachen sind unterschiedlich (Tod, Narrator leer, Planner leer). Aus 0 echten Kämpfen in Run 2 kann man weder eine frühere Kampfbughäufigkeit bestätigen noch eine Klassenbalance bewerten.

**Quellenrangfolge:** Direktes Event/Commit/Code > unabhängiger reproduzierter Test > technische Dokumentation > Reviewer-Zusammenfassung > freie Narrator-Erzählung. Bei einem unbekannten Lauf keine Zahlen, Aussagen oder Tool-Prüfungen als selbst neu ausgeführt behaupten.

---

## 3. B – Kampfsimulator, erste Ergebnisse, methodische Leitplanken

### 3.1 Was B liefert

Der Simulationsauftrag wurde in [`fd20d0d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fd20d0dce0b0fc508b17810872b7933a5f00e994) auf Dev ausgeführt. **218** Szenarien, **30** Basis-Builds über Level 1/5/10/14/15, **36** gespiegelte PC-vs.-NPC-Klassenkämpfe, vier einfache PC-Taktiken; Monstergruppen und originale Enginefunktionen statt eines Python-/Excel-Nachbaus. Output CSV, JSONL, Metadata; detaillierte Kampfprotokolle optional. Seeds dienen echter deterministischer Wiederholung.

CLI-Basis:

```sh
npm run sim:combat -- --smoke
npm run sim:combat -- --scenario warrior-0-1-wolf-0-1-ENGAGED --runs 500 --seed 100 --out results
```

Die Basis-Monstermatrix betont Wolf/Boar; ergänzende Läufe über **alle 19** bestehenden mechanischen Anker wurden von ChatGPT ausgeführt und zuvor mit **17.100 Kämpfen** berichtet. Ebenso **43.600** Baseline-Kämpfe: zusammen **60.700**. Diese Daten werden **nicht** mit den Original-ST-ZIPs oder natürlichen Kampagnen statistisch gleichgesetzt.

### 3.2 Was die ersten Zahlen zeigen – und ausdrücklich noch NICHT beweisen

In der vorangegangenen Simulationsauswertung wurde für die Basismatrix berichtet: Warrior durchschnittlich 100 % PC-Siege (dort 12.400/12.400), Mage etwa 89,7 %, Rogue etwa 88,4 %. Einzelner Level-15-Oger-Fall: Rogue 0/100, Mage 87/100, Warrior 100/100. **Diese auffälligen Resultate sind Hypothesen-Anlässe, keine fertige Klassenrangliste**: unterschiedliche Builds, Kits, Reichweite, Monsterprofile und vier primitive Taktiken; die Klassenvergleiche sind **PC-Taktik gegen native NPC-Steuerung**, nicht symmetrisch gesteuerte Spieler beider Seiten. Sol hat die 60.700 externen Durchläufe **nicht unabhängig wiederholt**. Kein Skill-/HP-/DPS-Tuning freigeben, bevor paarige Seeds und vergleichbare Seiten/Kampflagen die beobachtete Differenz tragen.

### 3.3 Gezielte Folgemessungen – derzeit nur Methodik

1. Klassen getrennt pro Level, Skillwahl, Ausrüstungs-Tier, Starter-/E-Kit und Eröffnungsdistanz vergleichen.
2. Startseite, Reihenfolge, Initiative, identische Seeds und Aktionen dokumentieren; NPC-gegen-PC-Steuerungsasymmetrie nicht als „symmetrisches PvP“ ausgeben.
3. Einen Gegner pro mechanischer Rolle und Band testen (Nahkampf/Biss, Panzer, Fernkampf/Magie, Gruppen, Elite/Boss), nicht nur 19mal die Zahlentabelle.
4. Taktikfamilien bewusst erweitern, statt zu unterstellen, die vorhandenen vier seien optimal; niedrige Quoten von Mage/Rogue erst mit fairer Mobilität/Verteidigung/Mana prüfen.
5. HP, Ressourcen, Schaden pro Turn, tatsächliche getroffene Ziele, Flee/Draw/Laufzeit, Kampfturns und autoritative Logs auswerten. Keine aus Narrator-Text abgeleiteten Treffer.
6. Nach ersten 100 Seeds für verdächtige Paarungen 500–1.000 Seeds, aber nur nach Reproduzierbarkeits- und Balancing-Plausibilitätsprüfung.
7. Trennung von **testbaren aktuellen Regeln** und **noch nicht existierenden Spezialeffekten** (Gift/Flug usw.), die nicht einfach imaginär in die Simulation eingerechnet werden dürfen.

---

## 4. A – offene echte SillyTavern-Livetests: vollständige Quellverweise und bisherige Muster

### Run 1 – `20261024-030002Z-current_test`

**Quelle:** [Review](testrun_10b/20261024-030002Z-current_test/REVIEW.md) + [Original-ZIP](testrun_10b/20261024-030002Z-current_test/20261024-030002Z-current_test.zip). 26/100 Züge in 21:01 min; Level-1-Mage, **Arcane Bolt + Arcane Ward**, Endzustand HP 0, 23/100 XP, 64 cp; **defeat** gegen fünf Level-2-Banditen. Integrität laut Runner OK. Charaktererstellung, Gilde, zwei aktive Aufträge, sechsteilige Transportquest (40 cp +23 XP), 3-cp-Herberge, 1-cp-Essen und zweiter Escort real gespielt.

**Wichtigster P0-Agency-Befund:** Am Fluss zeigen fünf Wegelagerer gespannte Bögen und fordern die Fässer. Noch kein Pfeil geschossen, der NPC-Fahrer sagt „Hold“. Trotzdem werden fünf `hostile`/ `combat.pending`-Entitäten festgeschrieben; Long Lunge trifft den Mage für **26 HP bevor** er auf die Forderung reagieren kann. Der Spieler hat keine Chance, die Ware herauszugeben, zu verhandeln oder vernünftig auszuweichen. **Keine automatische „alle Drohenden greifen sofort an“-Regel aus einer bedingten Forderung ableiten.** Tatsächliche Schüsse und Hinterhalte dürfen selbstverständlich mechanisch stattfinden. Das ist Player-Agency/Extractor/Combat-Commitment, **nicht** ein Beweis zu hoher Banditen-HP.

**Weitere bestätigte Integrationsabweichungen:** Kutschbock-Betreten als `go` in einen Phantomort plus großer Reisesprung; vier erzählte Bogenschützen werden überwiegend als Nahkampf-Rogue-Sheets materialisiert; **ein** gebuchter Arcane Bolt (29 Schaden, -10 MP) wird zu angeblich drei erzählten Treffern, später sogar als falsche Erinnerung übernommen. Daraus folgen separate Regressionen für Travel-Intent, Rollen-/Equipment-Consistency und Narrator-/Memory-Truth.

### Run 2 – `20261024-033325Z-current_test`

**Quelle:** [Review](testrun_10b/20261024-033325Z-current_test/REVIEW.md) + [Original-ZIP](testrun_10b/20261024-033325Z-current_test/20261024-033325Z-current_test.zip). 25/100 Züge in 26:19 min; Level-1-Mage, **Arcane Bolt + Focused Ward**, Endzustand 80/80 HP, 72/72 MP, 91 cp, 23/100 XP, **kein Kampf**, **narrator_empty** statt Tod. Echtes 60-cp-/23-XP-Gilden-Turn-in, korrekter realer Gegenstandstransfer bei der Tinkturenlieferung, organischer privater Nachtwachenjob (+1 cp).

**Technischer Stopper:** Narrator-Call verbraucht alle **8192 Completion-Tokens** für **34.573 Zeichen Reasoning**, `finish_reason=length`, **0 sichtbare Zeichen** Storytext. Kein Browser-/Engineabsturz. P0 für Test-Stabilität, nicht als Schadensproblem. **Vorsicht:** Endloses stilles Regenerieren oder doppeltes Engine-Commit wäre ein schlechter Fix; mögliche streng begrenzte leere Antwort-Recovery zunächst als isolierte Option testen.

**Weitere Integrationsabweichungen:** erzählte Abendrückreise trotz 08:18/08:33 mechanischer Uhr; zweimal unzulässige **amtliche** Guild-Listings aus dem Narrator und zwei korrekterweise verweigerte `quest.accept`-Versuche; privat bezahlter Job noch `active` (Objectives/Abschlusssemantik gesondert prüfen), ein `extract.failed`, Dummy-Weltfakt `x=x`. Firewall verhindert immerhin Phantom-Guild-Payouts und bindende Angebote abwesender Verkäufer.

### Einordnung 1 versus 2

**Gemeinsam:** natürliche Questannahme, physische Lieferung, Preis-/Geldbuchung, Gildenabschluss, +23 XP funktionieren; **beide** bleiben weit unter 100 Zügen und nutzen nur Mage. **Verschiedene** Ursachen: Run 1 Agency/Kampfeskalation und Tod, Run 2 Provider-/Narrator-Budget ohne sichtbaren Text. Die übergeordnete Erzähler↔Engine-Wahrheitsgrenze tritt in beiden auf, aber die Symptome sind **keine** bewiesen identische Softwareursache. Neue Runs, besonders andere Klassen und länger fortgesetzte Wirtschaft/XP/Skills, sind nötig.

**Neue Befunde** künftig zuerst in den jeweiligen Run-Review schreiben, hier unter §10 als eigenständige Kennung/Kategorie ergänzen. Bei 10/20 Runs diese Masterdatei **nicht** mit kompletten chronologischen Wiederholungen auffüllen.

---

## 5. Monster-/Lore-Audit von ChatGPT – rekonstruierte vollständige Analyse

### 5.1 Untersuchungsziel und damaliger Befund

Der Nutzer vermutete eine verlorene Trennung zwischen mechanischen Monster-Archetypen und vorgesehenen Fantasy-„Rassen“. Ich habe den aktuellen V4-C-Content (`content/monsters.json`, `content/lore.json`, NPC-Templates), das **Avereth World Lore v0.14**-Lorebook, alte Lore/WorldInfo-Quellen und die Kampfsimulationen verglichen. Ergebnis des damaligen Audits: **Die mechanische Bestiariumsabdeckung ist deutlich kleiner als der generative Worldbuilding-Spielraum.** Zugleich gibt es **keinen belegten historischen vollständigen Artenkatalog**, den man nur wiederherstellen müsste. Das Lorebook definiert **Monsterökologie und zwei Monsterreiche**, nicht eine erschöpfende Artendatenbank.

Die erste ChatGPT-Bewertung bezeichnete die 19 Anker vereinfachend als „Körperbau-Vorlagen“ und schlug eine **separate schlanke Spezies-Ebene** als denkbare Lösung vor. Die unabhängige Prüfung durch Sol zeigte, dass diese Abstraktion zu grob ist und ein Pflicht-Speziesregister **nicht nötig** erscheint (siehe §6/7). Dieser Erkenntnisfortschritt wird ausdrücklich dokumentiert, statt den früheren Vorschlag rückwirkend als immer schon richtig zu deklarieren.

### 5.2 Tatsächlicher Weltkanon und Generierungsfreiheit

Das aktuelle Lorebook besitzt **50 Einträge**, unter anderem:

- **MONSTER ECOLOGY / FAUNA:** Selbst vertraute Wölfe, Hirsche, Pferde, Eber, Bären, Vögel, friedliche und domestizierte Tiere sind mechanisch „Monsters“ mit Level und Rank. Das Etikett bedeutet **nicht** feindlich. Die Fauna lebt als natürliche Populationen; F-Rang ist für gewöhnliche Siedlungsnähe üblich, stärkere Entwicklungen selten.
- **MONSTER SPECIES GENERATION:** Neue Arten anhand Ökologie, Körperbau, Habitat, Nahrung, Verhalten, Selektionsdruck, sichtbarer Anpassung und Verhältnis zu Menschen erfinden; Zahlen über den nächstpassenden **mechanischen Anchor**, nicht über freie Erzählerstatistik. Ein höheres Individuum muss nicht eine separate Species-ID bekommen.
- **SAPIENT MONSTER SOCIETIES:** Intelligente Monster sind nicht automatisch Menschen mit Fell oder grundsätzlich Gegner. Kultur/Gesellschaft können aus Art, Reproduktion, Lebensdauer, Landschaft, Geschichte, Macht und sozialer Struktur entstehen. Ein feindlicher Encounter definiert nicht die moralische Gesamthaltung eines Reichs.
- **Ashen Scale Dominion:** Vulkanische östliche Hochländer, Cinder Throne, alte drakonische und beschuppte Blutlinien, weitere Gebirgs-/Feuerarten; Macht über Blutlinien, Territorial-/Eidbeziehungen, lange Geschichte, Handel und Diplomatie möglich. Nicht automatisch ein böser Menschenfeind.
- **Verdant Fang Court:** Alte westliche Wälder, Thornheart, intelligente Tierlinien, verwandelte Prädatoren, Waldgeister; Territorien, Bündnisse, ökologische Verpflichtungen, Handel/Konflikte mit Caelreth.
- **Dungeon- und Reiseökologie:** Monster sind nicht bloß Wegwerf-Encounten; sie sollen sich aus Ort, Umwelt, Gesellschaft und konkretem Questanlass ergeben. Ein generativ neues Waldmonster ist nicht deshalb ungültig, weil es nicht in einer globalen Namensliste steht.

**Ausdrückliche Nutzerklarstellung nach dem Audit:** Große klassische intelligente Fantasyvölker wie **Elfen, Zwerge und Orks** wurden **mit Absicht nicht eingeführt**. Aktuell ist menschliche Zivilisation menschlich; daneben bestehen Monster und teils intelligente Monsterreiche. Nur aufgrund möglicher Fantasykonventionen **keine neuen Standard-Rassen** in Lore, NPC-Templates oder Character Creation eintragen. Die drakonischen Linien eines Monsterreichs sind Monsterwelt-Bestandteil, **nicht** schon automatisch eine implementierte zweite klassische spielbare Race.

### 5.3 Die 19 tatsächlichen Anchors – Funktionskategorien, nicht Speziesgesetz

**IDs aus `content/monsters.json`:**

`rat`, `wolf`, `boar`, `deer`, `horse`, `bear`, `feline`, `serpent`, `raptor`, `arthropod`, `aquatic`, `goblin`, `ogre`, `armored_beast`, `spirit`, `skeleton`, `ghoul`, `slime`, `goblin_shaman`.

**Annahme des ersten Audits:** Diese Anchors repräsentieren grob morphologische Kampfvorlagen und füllen mechanische Zahlen/Stärke. **Genauerer Codebefund (Sol und hier nachgeprüft):** Die Liste **mischt** eine Speziesgruppe (`wolf`), grobe Tiergestalt (`raptor`), Lebensraum (`aquatic`), spezielle Verteidigung (`armored_beast`), Wesenart (`spirit`) und **Kampfrolle** (`goblin_shaman`). Die gemeinsame Funktion ist ein **pragmatisches Combat-Ausgangsprofil**, keine biologische Taxonomie. Zusätzliche Einträge nur wegen hübscher Artennamen sind konzeptionell nicht nötig.

**Was die Anker bereitstellen:** F-Rang-/Level-basierbares HP/ATK/DEF/MDEF/INIT, natürliche Angriffsart und Reichweite, Aliasbegriffe, Temperament, abgeleitete Material-/Loot-Kategorien. Freier Speziesname ist im `creature.new` bereits unabhängig vom mechanischen Anchor möglich; dass eine Species keinem Alias entspricht, bedeutet allerdings keine automatische semantische JS-Zuordnung.

### 5.4 Drei konkrete Abdeckungsprobleme, die der erste Audit herausarbeitete

**I. Artenname passt nicht zu Beuteorgan.** In einem vorangegangenen Livetest wurde das Tier `hare` auf `deer` verankert; nach einem Kampf erschien **F-Rank Hare Antler**. Es war kein reiner Prosa-Fauxpas, sondern materialisierte Anatomie aus der generischen `deer`-Lootmatrix. Sol hat denselben Mechanismus zusätzlich für `Doe Antler` und `Goat Antler` unabhängig über den Lootcode reproduziert. Die Ursache bleibt auch dann bestehen, wenn man „hare“ bloß einer anderen unpassenden Kategorie zuordnet.

**II. Wichtige Monsterreiche sind im Content nicht als eigenständige Kampf-Spezieslisten ausgearbeitet.** Das ist **nicht automatisch ein Defekt**: Ein einzelnes intelligentes Drakonisches Wesen oder Waldgeist darf aus existierenden Kampfwerten mit freien Details entstehen. Probleme entstehen erst, wenn Narrator-Seiten das für den Spieler wesentliche Versprechen (Feueratem, Flug, Giftresistenz, kulturelle Waffen) machen, die Engine jedoch nur normalen Nahkampfschaden ausführt.

**III. Eine generative Welt braucht persistente Individualität ohne hundert feste Monster-Einträge.** Wenn ein zuvor etablierter Glaspanzer-Käfer erneut erscheint, soll er nicht bei jeder Erzählung unerkannt Form, Beute, Magie oder Verhalten wechseln. Zugleich darf das System nicht jeden beliebigen einmaligen Hasen zu einer neuen Tabellenzeile machen.

### 5.5 Frühe Audit-Empfehlung und Revision

Mein erstes Audit tendierte zu „Kampfanker + Species-Layer + Volk/Gesellschaft“, um Zahlen, Anatomie/Loot und Kultur zu entkoppeln. Diese Trennung als **Denkmodell** bleibt nützlich, aber **eine neue verpflichtende Datenbankschicht ist als technische Konsequenz nicht belegt**. Bereits vorhandene Entity-Daten enthalten Artname, Beschreibung, Anker und feste Profile. Gesellschaft und Lore können im existierenden Lorebook, Fraktions- und NPC-Wissen bleiben. **Revidierte bevorzugte Richtung nach Sols Gegenprüfung:** vorhandene Pfade reparieren, nur wirklich benötigte optionale Eigenschaften hinzufügen. Keine unkontrollierte neue zweite Truth-Source.

---

## 6. Sols unabhängiger Monster-Gegenreview – detailliert und quellengetreu

**Quellcharakter:** Vom Nutzer am 24.10. übermittelte Datei `Chatgpt Feedback(8).md`, Sols **Review**, kein Patch. Sol nennt Codebasis `fd20d0d`/Build .57, Main-Dokumente bei damals `a90a61f`; **keine** Engine-, Balance- oder Dokumentenänderung als Teil seines Reviews. Die folgenden Feststellungen sind nach Sol gegliedert; dort wo Gitcode jetzt unabhängig nachgelesen wurde, ausdrücklich gekennzeichnet.

### 6.1 „Die 19 Anker sind keine reinen Body Plans“

Sols erste Kritik: `goblin_shaman` ist eher eine magische Kampfrolle, `aquatic` ein Lebensraum, `armored_beast` eine defensive Spezialisierung. Anker enthalten nicht nur Statblock, sondern Reichweite, Schadensart, Temperament, Aliase und indirekte Lootmatrix. **Verifiziert** durch `monsters.json`. **Folge:** Ein neues System mit „19 anatomischen Körpertypen“ wäre von Beginn an eine falsche Interpretation der bestehenden Daten. Keine automatische Umbenennung aller Anker, solange keine konkreten Probleme gelöst werden.

### 6.2 Species bereits frei, aber Aliasauflösung eingeschränkt

`creature.new` kann `species` und `desc` frei ausdrücken; ein vorhandener Anker ist dennoch erforderlich. `src/content.js:anchorFor` durchsucht normierte **Aliaswörter**; das ist keine generative Ähnlichkeitsbewertung, auch wenn ein LLM „nächstpassend“ erzählen kann. `src/v4/world.js` verbessert bestimmte klare bekannte Aliasfehlzuordnungen bei Materialisierung.

**[BELEGT]** Wer `Glassback Marsh Stalker` kreiert, kann einen bestehenden Anchor plus feste Entity-Identität nutzen, ohne einen Eintrag `glassback_marsh_stalker` in einem globalen Species-Katalog. **Offen** bleibt, ob die konkret gewählte Kampfvorlage mechanisch zum sichtbaren Körperbau/Angriff passt; das ist eine Validierungs-/Konsistenzfrage.

### 6.3 Loot/Anatomie als unabhängig reproduzierter Fehler

Sols Kontrollfälle:

| Species | Anchor | Aus der aktuellen Beuteannahme ableitbar |
|---|---|---|
| Hase | `deer` | `Hare Antler` |
| Hirschkuh | `deer` | `Doe Antler` |
| Ziege | `deer` (sogar vorhandener Alias) | `Goat Antler` |

In `src/v4/loot.js` wählt die Lootfunktion die `loot.anchors[anchorId]`-Materialliste, prägt den **Speciesnamen** an die Materialien und prüft ein optionales `only_if`, **falls** es am Material gesetzt ist. Geweih besitzt die nötige Eigenschaftsprüfung derzeit nicht. `aquatic` mischt zudem verschiedene Tiere wie Fisch/Hai/Krokodil mit zu ähnlichen Materialannahmen. **Kritikpunkt:** Alias-Zuordnung allein beheben reicht nicht, wenn der nächste Anker andere falsche Körperteile liefert.

**Engster späterer Korrekturpfad:** Spezialmaterial nur dann zuschreiben, wenn bestätigter Art-/Körper-/Beschreibungshinweis vorliegt; bei Unsicherheit **lieber keine fragwürdige Spezialbeute** als ein nicht existierendes Organ. Beliebige LLM-Erzählung darf nicht heimlich bereits festgebuchten anatomischen Fakt überschreiben. Ein konservativer allgemeiner Ertrag bleibt denkbar.

### 6.4 Sapienz wird im generischen Kampfprofil hart verworfen

`src/combat.js:creatureCombatant()` setzt aktuell im `fixed`-Snapshot ausdrücklich `sapient: false`; bei echten Charakterbogen-NPCs `characterCombatant()` dagegen `true`. Die Art „intelligenter Goblin“ kann in Gesprächen handeln, aber im generischen Kampfpfad nicht mit denselben Sapienz-Entscheidungen gerechnet werden.

**[BELEGT]** Das ist ein eigener Befund, **nicht** durch einen neuen Species-Katalog behoben. **Option**: eine validierte, nachweisbare individuelle Sapienz-Angabe bei mechanischer Materialisierung – ohne automatisch intelligente Monster als „Menschenklasse“ zu kodieren. **Risiko:** Willkürlich erfundene Intelligenz/Attitude würde NPC-Angriffe, Flucht und Diplomatie ändern; eine neue Variable braucht einen echten Consumer und verlässliche Autorisierung.

### 6.5 Temperament ist im maßgeblichen C-Combat-Pfad kein KI-Treiber

`npcDecide(ctx,npcId)` setzt `temper = ctx.c ? null : ...`. Der C-Pfad orientiert sich stärker an Lage, Initiative, Reichweite, belegter Feindseligkeit und verarbeiteten `intent`-Hinweisen. Schöne neue Labels wie `timid`, `territorial`, `cunning` ohne Anbindung ändern dessen Entscheidungen **nicht**. **[BELEGT]** Im aktuellen Code. Ein neues Temperament-Wörterbuch wäre deshalb **keine** funktionierende Verhaltenskorrektur.

**Differenzierung zu Teil C:** Eine scheue Spezies darf außerhalb eines Encounters glaubwürdig weglaufen. Im **laufenden C-Kampf** benötigt echtes Flee/Retreat aber den tatsächlichen Intent-/KI-Pfad; das verlorene Signal kann erklären, warum aus einer beschriebenen Jagd endloses Band-Nachrücken wird. **Noch kein Beweis für genau den Hasenfall** ohne sein Originaleventlog.

### 6.6 Effektname und tatsächlich berechneter Monsterangriff

Der generische Angriff hat Attack-Power, Schadensart und Reichweite. `Sting` bedeutet **nicht automatisch Poison DoT**, `Corroding Touch` kein Korrosionssystem, `spirit` nicht automatisch körperlos, `raptor` nicht automatisch dreidimensionale Flughöhe oder Flugreichweite. Rank, Level, Elite und Boss skalieren zunächst Zahlen, nicht Organe, Utility und Spezialangriffsketten.

**Konsequenz:** Monster-Beschreibung darf kreative Farbgebung sein; **wo Spielerentscheidungen vom Versprechen abhängen**, müssen Skills/Status/Flug/Resistenzen in vorhandenen ausführbaren Mechaniken vorkommen oder der Narrator darf diese Fähigkeiten **nicht als angewendet** verbuchen. Wenn bestehende Skill-/Effekt-Primitiven reichen, diese verwenden. Kein „jeder giftige Pfeil bekommt automatisch eine neue volle Statusengine“.

### 6.7 Sols Abgrenzung zu Kampfsimulation und alten Loredaten

Sols Review hat die **60.700 Kämpfe nicht unabhängig neu gerechnet**. Seine Analyse der PC-vs.-NPC-Asymmetrie steht daher neben, nicht als Bestätigung jeder Quote. Er hat außerdem **keine komplette historische Löschungsspur** aller alten Rassen-/Species-Dateien geführt; er fand keinen belegten früheren verpflichtenden Artkatalog. Eine verlorene vollständige Artenliste oder neue Fantasy-Rassen lässt sich daher nicht aus der aktuellen Code-/Lore-Diskrepanz behaupten.

---

## 7. Zusammenführung ChatGPT ↔ Sol: Übereinstimmungen, Korrekturen, echte offene Fragen

| Thema | Mein erster Audit | Sols Gegenreview | Gemeinsame derzeitige Wertung |
|---|---|---|---|
| „19 Anker“ | Richtigerweise kein fertiger Artenkatalog, aber als „Körperbau-Vorlagen“ zu eng beschrieben | Heterogene Mischung aus Art, Rolle, Lebensraum, Defense, Level-/Angriffsprofil | **Sols Präzisierung akzeptiert.** Vorhandene Datennutzung ist maßgeblich |
| Lore der Monsterreiche | Große intelligente Monsterreiche ohne ausgearbeitete Speziesliste | Das ist generative Weltgestaltung, kein technischer Beweis für einen Species-Layer | **Weder fehlendes Volk noch Bug per se** |
| Hasengeweih | Konkreter, aus Livetest abgeleiteter Loot-/Anatomiefehler | Code-Repro auch für Doe/Goat + `only_if`-Mechanik | **Bestätigte priorisierbare Content-/Loot-Schwäche** |
| „Spezies-Schicht“ | Als denkbarer Lösungsansatz beschrieben | Vollständige verpflichtende Datenbank unbelegt/zu aufwendig | **Nicht freigeben**; freie `species` existiert bereits |
| Sapienz | Lore/Menschen-vs.-Monster-Gesellschaft betont | Genaues `sapient:false` im Creature-Snapshot gefunden | **Eigenständige Integrationslücke**, später separat entscheiden |
| Monsterverhalten | Artenökologie, scheue Räuber/Prädatoren | Temperament im C-Pfad ignoriert; konkrete Intents wichtiger | **Verknüpfung mit Teil C**, keine nutzlosen Taglisten |
| Magische/biologische Special Effects | Fehlende individuelle Monsteridentität beklagt | Namen nicht mit ausführbaren Effekten verwechseln | **Mechanische Zusagen einzeln priorisieren**, keine zweite DSL |
| Simulationsquoten | 60.700 Kämpfe und Auffälligkeiten berichtet | Nicht unabhängig wiederholt; zusätzlich PC/NPC-Asymmetrie | **Hypothesen für kontrollierte B-Messung**, keine Klassen-Nerfs |
| Neue klassische Fantasy-Rassen | Historisch kein vollständiger Katalog belegt | Keine fremde Rassenliste nachgewiesen | **Nutzer-Kanon ist ausschlaggebend:** bewusst keine Einführung |

### 7.1 Die vier Designpfade (bewusst noch nicht freigegeben)

| Option | Kern | Plus | Kosten / Fallstrick | jetziger Status |
|---|---|---|---|---|
| **M-A: vollständiger Species-Katalog** | Für jede Art fester Profil-/Loot-/Kulturdatensatz | Große Konsistenz für häufige ikonische Arten | Riesige Pflege, LLM-Freiheit enger, doppelte Zustandswahrheit, unbrauchbar für unbegrenzte Einmalarten | **Nicht empfohlen** als Standard |
| **M-B: Anker stark reduzieren** | Wenige universelle Körper-/Kampfklassen | Formal kleinere Content-Matrix | Problem der falschen Organe bleibt, mehr Gegner wirken gleich, Bestandsquests/Dungeons anfassen | **Nicht voreilig** |
| **M-C: schlanker Hybrid** | Existierende Anker, freie Species, wenige bestätigte optionale Eigenschaften an konkreten Consumers, optionale Wiederverwendung zentraler Arten | Skalierbar und anpassbar; Kultur/Lore frei, Mechanik eindeutig | Tags ohne Verbraucher bringen nichts; Validator/Replay/Sync erforderlich | **EMPFOHLENE LANGFRISTRICHTUNG, NICHT FREIGEGEBEN** |
| **M-D: Minimalfix** | Geweih/ähnliche Sonderbeute nur bei konkreter anatomischer Evidenz, bekannte Aliasfehlzuordnung, sonst Anker/Balancing belassen | Beseitigt reale Fehler ohne Rechen-/Balance-Umbau | Deckt Sapienz, Gift, Flug und Combat-Rollen nicht ab | **BEVORZUGTER ERSTER SPÄTERER FIX, NICHT FREIGEGEBEN** |

**Aktueller Vorschlag:** D zuerst **nach Freigabe**, C nur in wirklichen Spielbedarfspfaden als spätere Option; A/B nicht als reflexhaften großen Redesign-Patch anfangen. Der Nutzer will **zunächst weitere Tests**. Deshalb ist selbst D derzeit ein **registrierter Fixkandidat**, kein Sofortauftrag.

### 7.2 Konkrete Beispielabbildung ohne vollständige Artentabelle

| Wesen | Welt-/Identitätsseite | Kampf | Loot / Sonderfähigkeit |
|---|---|---|---|
| **Hase** | `hare`, scheues normales Beutetier; nicht humanoid | Grober Tieranker, Level/Rang wie heutiges System | Fell/harmloser Ertrag, **kein Geweih**; keine neue globale Species-ID nötig |
| **Hirschkuh/Ziege** | Eigenständiger freier Artname, bekannte Ökologie | `deer`-Werte können zunächst genügen | Kein Geweih ohne belegte Anatomie; kein pauschaler `deer`-Drop |
| **Wolf** | `wolf`, Rudel/territoriale Situation durch Szene und Worldstate | Bestehender `wolf`-Anchor | Passende natürliche Beute; Flee/Attack aus Situation/Intent, nicht bloß temperament-Label |
| **Goblin / Schamane** | Monster, evtl. intelligent, sozial, ausgerüstet, in einer Monsterkultur | `goblin` oder `goblin_shaman`; Sapienz/Ausrüstung nur bei bestätigter mechanischer Zuordnung | Wirkliche geführte Waffe/Spruch sollten Kampf-/Loot-Records entsprechen |
| **Drakonisches Wesen** | Freie drakonische Linie im Ashen Scale Dominion, **kein** neues klassisches Spielervolk | Vorhandener Ansatz bei passender Tier-/Panzerbasis | Echte Flug-/Atemwirkung benötigt ausführbare, begrenzte Mechanik, keine Prosa-Gratis-Fähigkeit |
| **Waldgeist** | Freier Spirit mit Ort/Pakt/Lore, ggf. intelligenter Bewohner des Verdant Fang Court | `spirit`-Anchor plus bestätigte Extra-Mechanik falls nötig | Nicht automatisch körperlos/unverwundbar; nur gebuchte Fähigkeiten gelten |
| **Einmaliges generatives Monster** | Individuelle feste Beschreibung + vorhandenes ID/Profil | nächstpassender verfügbarer Anchor | Keine globale Pflichtregistrierung; Spezialfähigkeit nur bei tatsächlicher Engineunterstützung |

### 7.3 Offene Nutzerentscheidungen, nicht künstlich vorentscheiden

- **Anatomie-/Beutegrenze:** Bei unbekanntem Körperbau nur allgemeines konservatives Material oder komplett kein Spezialloot? Wann darf Beschreibung eine feste Anatomie-Eigenschaft begründen? Wie alte Savegames behandeln?
- **Sapienz:** Mechanisch getrennt von Creature-Zahlen führen, und woran ist die Einstufung verlässlich zu erkennen? Keine pauschal freundlichen/feindlichen intelligenten Monster.
- **Ausrüstung/Loot:** Verliert ein humanoides Monster nur tatsächlich geführte Waffen? Generisches Zufallsloot darf keinen nie besessenen Zweihänder behaupten.
- **Sonderfähigkeiten:** Welche **erste reale** Fähigkeit rechtfertigt zusätzlichen Engineeffekt – Gift, ein echter Feueratem, Flug, Resistenz oder etwas anderes? Möglichst bestehendes Skill-/Statusmodell.
- **Wiederkehrende Arten:** Wann eine generierte individuelle Eigenschaft konsistent wiederverwenden (wiederkehrende Kampagnenarten), ohne bei jeder Einmalsichtung globalen Content anzulegen?
- **Flucht/Verfolgung:** Kann die gerade vorhandene Flee/Chase-Mechanik mit den neuen Monster-Intent-Signalen funktionieren, bevor man Anker-/Bewegungssystem neu schneidet?

---

## 8. C – Verfolgung, Flucht, Rückzug: ausführlicher DESIGN-FIX-KANDIDAT

**Status:** **DESIGN-FIX IN DIE LANGFRISTIGE 10B-LISTE AUFGENOMMEN**, **noch kein Implementierungsauftrag**. Der Nutzer möchte **zuerst weitere freie Livetests**. „Design-Fix“ bezeichnet hier eine bewusst anzustrebende Verbesserung des Spielgefühls, **nicht** einen bereits implementierten oder zahlenmäßig beschlossenen Bewegungspatch.

### 8.1 Reale Spielerwirkung und ursprünglicher Anlass

Im erfolgreichen .57-Fixture-/Abnahmelauf war das Nachsetzen gegen einen **fliehenden Hasen** unnötig lang; eine weitere **Fuchsjagd** wurde ähnlich unangenehm berichtet. Wiederholtes „näher herangehen → Tier vergrößert Distanz → wieder näher herangehen“ erzeugt **Spielerfriktion ohne neue Entscheidung**. Der Wunsch ist nicht, dass jeder Hase gefangen werden muss. Er darf eindeutig entkommen; ein schneller Rogue soll eventuell besser jagen können als ein schwerer Warrior, und ein Mage mit Fernkampfmöglichkeit darf anders spielen. Der Spieler sollte aber nicht zehnmal denselben mechanisch nahezu identischen Befehl senden müssen, nur um einen abzusehenden Ausgang zu erfahren.

**Evidenzqualität:** Beobachtung/Designfeedback aus früherer ZIP-Auswertung; **vollständiger turn- und eventgenauer separater Hasen-/Fuchs-Codepfad ist in dieser 10B-Datei noch nicht als isoliertes Replay beigefügt**. Daher bei Umsetzung erst das konkrete damalige Originalereignis gegen den heutigen Code nachstellen. Die nachfolgenden Codefakten sind präziser als die damalige bloße Vermutung „es gibt kein Chase-System“.

### 8.2 Was der aktuelle Code wirklich schon besitzt – von ChatGPT an Dev-HEAD verifiziert

**`src/combat.js` im C-Pfad `ctx.c`:**

1. **Range Bands:** Zielrelativer Abstand, `ENGAGED`, `SHORT`, `MEDIUM`, `LONG`. `moveAction`/ `repositionPc` verschieben normal jeweils **einen** Band-Schritt; NPC von `LONG` weiter `away` kann den Encounter verlassen.
2. **`npcDecide`:** Bei `ctx.c` wird `temperament` **auf `null` gesetzt**. Ohne explizit verarbeiteten NPC-`intent` schließt ein Gegner außerhalb seiner Reichweite eher zum Angriff auf; per Intent `flee` oder `retreat` kann er ausweichen. **Ein narrativ „scheues Tier“ ist nicht automatisch ein mechanisch fliehendes Tier.** Die weiter unten vorhandenen skittish-Temperamentregeln laufen im C-Pfad nur eingeschränkt/nicht als normaler KI-Zweig durch.
3. **`fleeing(enc,id)`:** Unterscheidet eine tatsächlich als `fleeing:true` gebuchte **Flucht** von bloßem `retreat`. Nur als Flee erfasste Ziele können direkt die spezielle Chase-Verzweigung erreichen.
4. **`runCombat`:** `act.kind='move'`, `act.dir='closer'`, `act.target` bezeichnet **genau einen bereits fliehenden Gegner** → `chase(ctx,id)`; sonst normale Ein-Band-Bewegung.
5. **`chase()`:** Es gibt **bereits eine einmalige Entscheidung**, nicht zwingend Band-für-Band-Jagd: `escapeRoll` entscheidet, ob der fliehende NPC entkommt (aus Reichweite, Encounter beendet) **oder** auf `ENGAGED` eingefangen und mit `caught:true` an weiterer Flucht im gleichen Kampf gehindert wird.
6. **`pcFlee()`:** Wenn **kein** Feind ENGAGED ist, kann PC unmittelbar entkommen; bei Nahkampfbindung entscheidet eine einmalige `escapeRoll`. Kein neuer eigener Chase-Simulator erforderlich, bevor dieser Pfad auf Erreichbarkeit und Fairness geprüft ist.
7. **`escapeRoll()`:** Aktuelle Formel als technische Ist-Dokumentation: `chance = clamp(50 + 5*(init_runner - max(init_pursuers)) - 10*(number_pursuers - 1), 15, 85)`, dann d100. **Keine Freigabe dieser Zahlen als perfekte 10B-Balance.** Es ist entscheidend, für wen `ok` gilt: Bei `chase` bedeutet erfolgreicher `escapeRoll` des *gejagten* NPC **Entkommen**, andernfalls `caught`; das darf im UI nicht irreführend als PC-Fluchterfolg gelesen werden.
8. **Verfolgung und normale Bewegung sind nicht identisch:** `move closer` ohne das passende Ziel, ohne `fleeing` oder nach einem nur erzählten Zurückweichen erreicht die One-Roll-Chase-Route eventuell **nicht**. Genau dieser Übergang ist ein wichtiger Prüfpunkt.

**Codeverweise:** [`src/combat.js` auf Dev-Commit `fd20d0d`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/combat.js), insbesondere `repositionPc`, `moveAction`, `npcDecide`, `fleeing`, `escapeRoll`, `pcFlee`, `chase`, `runCombat`.

**Kritische neue Erkenntnis:** Den ursprünglichen C-Entwurf „kurze Verfolgung als Probe neu entwickeln“ als **bereits teilweise implementiert** markieren. **Nicht** eine zweite Chase-Engine bauen, sondern herausfinden, ob die normale natürliche Sprache und die NPC-Fluchtabsicht den vorhandenen Pfad tatsächlich nutzen.

### 8.3 Zu prüfende Ursachekette der wiederholten Jagd

**H1 – Intentverlust auf der NPC-Seite:** Das LLM beschreibt „Hase flieht“, aber kein eindeutiger, von `npcDecide` berücksichtigter `flee`-Intent wird gebucht. Die Engine setzt `retreat`, `hold`, `close_and_attack` oder reine Distanz an. **Nicht bestätigt**, bis Eventlog nachgewiesen.

**H2 – unpräziser Spielerbefehl:** Der Spieler sagt „ich gehe hinterher“ oder „ich nähere mich“, der Planner liefert `move closer` ohne gültiges `act.target`/nicht fliehenden Zielstatus. Die Engine macht regelgerecht nur einen Band-Schritt, obwohl der Spieler faktisch „ich verfolge das Tier“ meint. Die natürliche Sprache muss sinnvoll zwischen Positionieren und längerer Verfolgung unterscheiden – **ohne** jedem Näherrücken automatisch einen Chase-Wurf anzuhängen.

**H3 – Reichweiten-/Abstandsgrenzen:** Wenn NPC und PC abwechselnd einen Band-Schritt machen, keine neue Terrain-/Ausdauer-/Distanzentscheidung entsteht und `fleeing` nie wahr wird, setzt sich die Schleife fort. Auch an LONG muss ein plausibles Entkommen/Abbruch möglich sein.

**H4 – LLM-Handlungs- und Zeitbild:** Der Erzähler kündigt Weglaufen an, aber der Engine-Snapshot sagt `retreat`, `hold` oder anderes. Fehlinterpretation durch Testspieler/HUD statt fehlende Mechanik. UI muss den tatsächlich gebuchten Zustand/Folgeoptionen klar vermitteln.

**H5 – NPC-Sapienz/Temperament:** Generische Kreaturen tragen `sapient:false`, und `temperament` wird im C-Pfad nicht normal angewendet. Eine pauschale Änderung könnte aber auch aggressive Wildtiere, Dungeons und Gruppenbegegnungen unabsichtlich schwächen. **Nur zielgerichtet** mit negativen Gegenfällen testen.

**H6 – faire Klassenmittel:** Mage-Fernkampfreichweite, Rogue-Bewegung, Warrior-Position und Blink beeinflussen, ob ein Spieler jagen, warten, schießen oder abbrechen kann. Kein universeller „einfach alle fliehenden Ziele gratis treffen“-Fix.

### 8.4 Lösungen in aufsteigender Eingriffstiefe

**C0 – Keine neue Mechanik, nur korrekte Routen erreichen (bevorzugter Prüfpfad):**
- Narrator-/Extractor-Intent `flee` vs. `retreat` korrekt und einmalig festhalten, Engine-State entscheidet.
- Eindeutig natürliche Spielerabsicht „ich **jage/verfolge** genau dieses bereits fliehende Tier“ im Planner auf bestehendes zielgebundenes `move closer` / `chase` abbilden; kein generischer `go`-Teleport, keine neuen Befehle.
- Aus dem One-Roll-Resultat **klare** Narration: Tier ist **weg** oder **eingeholt**. Spieler muss danach nicht mit `move closer` denselben verlorenen Gegner wieder fangen.
- Wiederholte Bänderbewegung bei schlichtem Positionieren bleibt zulässig, aber ohne versteckten Flee-Status.

**C1 – Enger Feinschliff an Fluchtpolitik/Outcome:** Falls C0 zu wenig ist: Nach glaubhafter Flucht von LONG oder konkreter Szenengefahr den Encounter konsistent als escaped beenden, oder festhalten, warum der Gegner am Ort verbleibt. Nur den tatsächlich fehlerhaften Tier-/NPC-Pfad berühren, keine neuen allgemeingültigen statischen „scheu = immer weglaufen“-Zwangsregeln.

**C2 – Optionale kurze längerfristige Chase-Probe:** Nur wenn echte Szenarien trotz C0/C1 mehrere bedeutungsvolle Hindernisse/Entscheidungen erfordern (z. B. fliehender Dieb durch mehrere Straßen, Nebel/Terrain, Verzweigung), vielleicht begrenzte wiederholte Proben. Das ist **weiter entfernt** und wäre **ein neues Feature**, keine automatische 10B-Pflicht.

**C3 – Gesamte Bewegungs-/Speed-Rebalance:** Freiere Bewegung+Attack, mehrere Bands, AGI/STA/Speed, geänderte Flee-Odds, Blink-Sonderreichweite. Das würde Kampfbalance stark beeinflussen, insbesondere Rogue/Warrior/Mage. Nur nach Simulator- und echten Spielerbelegen. Nicht Teil einer kleinen Chase-Korrektur.

### 8.5 Verbindliches gewünschtes Gameplay-Ergebnis (Designrichtung, noch keine Codefreigabe)

- Ein fliehendes schwaches Wildtier darf entkommen; die Engine sagt **zeitnah und eindeutig**, dass es weg ist, statt endlose gratis Wegpunkte zu produzieren.
- Ein berechtigter Jäger kann einmal sinnvoll versuchen aufzuholen; Regeln/Terrain/Geschwindigkeit dürfen scheitern lassen.
- Eine Jagd braucht nur **so viele Spielerinputs wie neue Entscheidungen** auftreten – nicht einen pro Range Band ohne neue Lage.
- `flee`, `retreat`, `reposition`, `chase` und `move` behalten unterscheidbare Kosten und Ergebnisse.
- Entkommene Gegner werden **nicht** automatisch als erschlagen, erbeutet, gecleart oder für Quests angerechnet.
- Es gibt keine automatische PC-Übernahme durch Narrator, keine garantierten Treffer nach Flucht, keine Gratis-Mehrfachaktionen.
- Bestehende Systemflucht des PCs ist ebenfalls fair, nicht trivial garantiert und nicht durch bloße Wortwahl blockiert.
- Combat-Records, SAVE/LOAD, Replay und klare HUD-Wahrheit stimmen mit der Szene überein.

### 8.6 Gezielte spätere Regressionen / Messmatrix

| Fall | Erwartung / Beobachtung |
|---|---|
| Z1: Hase wird im Feld überrascht, flieht **eindeutig** mit mechanischem `flee` | `fleeing` entsteht oder die Flucht endet direkt in `escaped`; kein Phantom-Enemy |
| Z2: Spieler schreibt „Ich verfolge den fliehenden Hasen“ | genau ein legitimer `chase`-Pfad oder bewusst begründete Ablehnung |
| Z3: Spieler schreibt nur „Ich gehe einen Schritt näher“ | normale Bewegung statt unbeabsichtigte Zwangs-Jagd |
| Z4: Einmalige Chase-Probe gelingt dem Jäger | zielgerichteter `caught`-State/ENGAGED, nicht sofort erneut weg |
| Z5: Einmalige Chase-Probe gelingt dem Flüchtenden | `escaped`, aus Encounter entfernt, kein Kill/Loot/XP/Cull |
| Z6: Fuchs weicht nur defensiv zurück (`retreat`, nicht Flee) | nicht fälschlich `caught` wie bei beendeter Flucht |
| Z7: Nahkämpfer vs. fliehender schneller Gegner | Chance/Kosten fair; keine garantierte Eroberung |
| Z8: Mage auf Distanz | legitime ranged attack/Skill, Kosten und Reichweite eingehalten |
| Z9: Rogue mit Mobilität und langsamer Warrior | keine unabsichtlichen unendlichen Manöver; Taktikdifferenz messbar |
| Z10: aggressiver Eber bleibt und kämpft | nicht wegen allgemeinem `temperament`-Fix plötzlich überall scheu |
| Z11: sapienter Dieb/Feind flieht nach Verletzung | nach explizitem Intent, Beziehung und Lage nachvollziehbar |
| Z12: PC versucht berechtigte Flucht aus ENGAGED vs. LONG | `pcFlee`-Randfälle und Min/Max-Odds, kein kostenloser Doppelzug |
| Z13: erneut geladener Encounter | `fleeing`, `caught`, `escaped` konsistent und deterministic im Fold |
| Z14: Gruppenflucht bzw. mehr als ein Bedränger | kein versehentlicher automatischer Sieg oder doppelte Flucht-Buchung |

**Metriken:** Anzahl Spielerzüge pro Jagd, tatsächlich neue Entscheidungen, Entkommen/Einfangen, Range-State-Wechsel, NPC-Intent-Häufigkeit, typisierte Action-Records, nachlaufende verwaiste Gegner, Loot-/Quest-Fehlgutschriften. Mit **echten** Replay-Inputs beginnen, nicht dem Narrator frei erfundene Wegstrecken als Engine-Tatsachen unterschieben.

---

## 9. Andere 10B-Prioritäten – vollständige, aber noch nicht freigegebene Fachbereiche

### 9.1 Leveln, XP, Farmen, Wirtschaft, Drops

Ausgangspunkt: Levelschwelle `Level × 100 XP`, existierende XP- und Gegnerstärkeregeln. Im alten 10B-Plan sind **12 / 18 / 20** Gegner-XP-Vergleiche als **zu prüfende Varianten**, nicht beschlossene Endwerte; Elite ×1,5 und Boss ×2,5 als Modellannahmen. Questbelohnungen, wilde Monsterjagd, Dungeon, Shop, Gear und Fähigkeitstraining gemeinsam betrachten. Kein wiederholtes Töten durch automatisches diminishing XP entwerten. Schwierigkeit hängt vom Gebiet/Rang/Gegner ab, nicht verstecktem PC-Level-Scaling.

**Echtes Preisbeispiel für später:** F-Rang-Skill-Stones wurden im älteren .48-Livetest für **30/40/50/60/80 cp** angeboten, gespeicherter Richtwert **400 cp**. Kauf wurde trotz Preis-Audit erlaubt. Das ist **keine** unrechtmäßige Transaktion oder 9C-Bug, sondern später zu entscheidende Balancing-/Preisautoritätsfrage. Varianten: besserer Narrator-Preisanker, wirklich Engine-owned Preisvalidierung oder begründete Grenzen. Nicht jetzt alle Händlerpreise hart sperren.

**Automatische Beute** bleibt QoL-Prinzip; besondere anatomische Beute muss hingegen plausibel sein und nur von tatsächlich besiegten, nicht geflohenen Monstern kommen. Waffenloot bei humanoiden Monstern muss mit Kampf-/Equipment-Records vereinbar sein.

### 9.2 LLM/Provider/Performance und robuste Laufzeit

Run 2 belegt die Gefahr „Reasoning verbraucht Ausgabe vollständig“. Run 1 belegt gefährliche Narrator-/Extractor-Wahrheitsbrüche trotz `integrity: OK`. Getrennte Messung von **Planner, Board, Narrator, Extractor, Forge, Systempanelen**, Tokenlängen, sichtbarem Text vs. Reasoning, Finishreason, Reparaturquoten, Caching und tatsächlicher Browser/Providerzeit. Nur ausreichend begründete Reparaturen, nie doppelte Engineaktionen durch Retries. Keine unbewiesene Zusammenlegung von 3→2 Modellcalls, kein neuer Groß-Memory-Layer allein für Speed.

**Langläufe:** Dauer und Speicherwachstum für 100/500/1000 Turns, Event-Fold, Reload, Swipe, Regenerate/Edit/Delete, Quest-/NPC-/Location-Zustand. API-Keys bleiben in lokalem PowerShell/Environment; nicht in Logs/Git.

### 9.3 Spielergefühl, UI, Sandbox

Kein neues 10A-HUD als Eigenpatch. Sichtbarkeit nichtoffensiver Skills, kontextuell richtige Defense/Utility, lesbare kurze Engine-Nachrichten, Quests, Dungeons, Geld, Reisen und Schlaf **spielen** statt bloß automatisiert rechnen. Guild-Authority und Narrator/Engine-Truth aus beiden Runs gehört vor rein kosmetisches CSS. Eigene Klasse/Skills/Passives/P5/Feats nur durch tatsächlich gebuchte und replayfähige Entwicklung; keine freien Narrrator-Upgrades.

**Blink – getrennte 10B-Entscheidung:** `mage.blink` kostet aktuell **8 MP**, verschiebt **ein** Range Band und verbraucht die Hauptaktion. Ein späterer 2–3-Band-Buff ist erwägenswert, **nicht beschlossen**. Mit Flee/Chase-/Gear-/Mage-Effekt und Simulationsbalance testen; nicht im Chase-Minifix nebenbei buffen.

### 9.4 100-Züge-Horizont als Qualitätsziel, nicht als Game-Over-Verbot

Sterben darf passieren, wenn der Spieler berechtigt ein Risiko eingeht. Ein 26-Züge-Tod beweist allein keine zu harten Banditen. Der spezifische Run-1-Fehler ist die **ungefragte Eskalation der Verhandlung**; diese Agency-Frage darf man nicht durch wahlloses HP-Senken kaschieren. Ein leerer Modelltext wie in Run 2 ist ein **technischer** Abbruch; je mehr echte Long-Runs wir archivieren, desto leichter werden Ursache und Häufigkeit greifbar.

---

## 10. Konsolidierte Problem-/Designmatrix (startklar für viele weitere Runs)

| ID | Kategorie | Nachweis 24.10. | Gewicht | Möglicher späterer Lösungsraum | Freigabe |
|---|---|---|---|---|---|
| **10B-T01** | Agency / Bedrohung vs. Angriff | Run 1 fünf pending + Schaden vor PC-Entscheidung | P0 bei Fixplanung | Extractor-Combat-Gate, aktive Gewalt vs. Drohung unterscheiden; echten First Strike erlauben | **OFFEN** |
| **10B-T02** | Narrator-Verfügbarkeit | Run 2 8.192 Tokens, 0 Text | P0 Teststabilität | Provider-Promptbudget/Reasoning prüfen; maximal begrenztes sicheres Empty-Recovery | **OFFEN** |
| **10B-T03** | Narrator- und Memory-Truth | Run 1 erfundene 2.+3. Arcane Bolts → falscher Fact | P1 | Kampfaktionenzählung aus Engine-Records, Memory-Quellen prüfen | **OFFEN** |
| **10B-T04** | Guild-Authority | Run 2 zwei Phantomjobs, zweimal `no such contract` | P1 | Offizielle Listings nur aus Board-/Quest-State, private Jobs weiter frei | **OFFEN** |
| **10B-T05** | Zeit-/Reise-Konsistenz | Run 2 Abend trotz 08:33; Run 1 Phantom-Kutschbock-Ort | P1 | GO-/Zeit-Verträge, Story an bestätigten Zustand binden, keine Reise-Minutenzügepflicht | **OFFEN** |
| **10B-T06** | Fakten-ID-Kollision / Waffenpersistenz | Sol-Gegenreview: vier `armed: bow`-Fakten zunächst erzeugt, identische auf 24 Zeichen gekürzte Subjektpräfixe in `setFactEvents` überschreiben einander in `state.facts[id]` | P1 / lokaler belegter Codefehler | **10B-1:** deterministische, für unterschiedliche Fakten eindeutige IDs; Dedupe und Functional-Historie erhalten | **IMPLEMENTIERT (.58), UNABHÄNGIG REVIEWT; 1287/1287 SUITE; ST-SMOKE 2/3 OK; ECHTE LIVE-ABNAHME OFFEN** |
| **10B-T07** | Private Quest-Lifecycle | Run 2 +1 cp, Quest aktiv | P1/P2 **Hypothese** | Objectives-/Bestätigung und private Completion prüfen | **OFFEN** |
| **10B-T08** | LLM-/Extractor-Verträge | Run 2 Extractor failed, Fact `x=x`; 17 Player-JSON-Reparaturen | P2 | atomare Validierung, Dummy-Fact-Filter, JSON-Ausgabevertrag | **OFFEN** |
| **10B-T09** | NPC/Location/Pacing | Run 2 `no_go` im begleiteten Innenraum, „Present“ leer | P2 | begrenzte Escort-Location-Regel oder ehrliche UI-Semantik | **OFFEN** |
| **10B-T10** | **Delivery: Quest-READY/Proof/Fracht-Holder inkonsistent** | Run 3 E14/E16 READY trotz PC-Holder, E17/E30/E34 mehrfach false, E37 Drop am Gildenboden, E39 Auszahlung | **P0 Gameplay/Quest-Integrität** | Richtige Ziel-/Holder-/Proof-Belege, atomare freiwillige Übergabe, keine durch `not carried` fingierte Liefererfüllung | **OFFEN** |
| **10B-T11** | Planner-Reasoning-Budget/Empty-Recovery | Run 3 T21 Calls 63+64 zweimal 2000/2000, 0 JSON, Engine-Turn20 bleibt | **P0 Long-Run-Zuverlässigkeit** | Provider-/Repair-Diagnose, begrenzter sicherer Recovery, kein Re-Commit | **OFFEN** |
| **10B-T12** | Erzähler schreibt neue Delivery-Pflichten | Run 3 T9–18 wechselnde Kisten-Rückgabeauflagen, nicht im ursprünglichen Questvertrag | **P1 Narrator/Quest-Authority** | Engine-Vertragsbedingungen strikt maßgeblich, neue freiwillige Arbeit getrennt | **OFFEN** |
| **10B-T13** | GIVE-/DROP-/Multi-Intent-Integration | Run 3 T14/T16/T18 Give conditional/expired oder nicht interpretiert; T19 Drop funktioniert | **P1 Player Agency/Inventar** | Freiwilliger Player-Give muss möglich bleiben, `pc_inventory`-Firewall erhalten | **OFFEN** |
| **10B-T14** | unterschriebener Receipt vs. Guild-Slip | Run 3 T20 Narrator behauptet Entgegennahme, Objekt verbleibt beim PC; proof.consume=false | **P2 Prüfen** | echte Paper-/Beleg-Semantik, nicht blind löschen | **OFFEN** |
| **10B-T15** | Extractor-Ortsstatus / False Progress | Run 3 T6 `extract.failed` unzulässiger `place`-Delta bei narrativem Ladenbesuch | **P1/P2 Prüfen** | atomare Extractor-Verträge, bestätigten Ort statt Narrator-Prosa verwenden | **OFFEN** |
| **10B-T16** | Guard-/Resolver-`needs` nach redundanter Registrierung | Run 2 E13: Guard entfernt `guild.register` als redundant; `offer.accept needs:1` scheitert trotz laufender Anmeldung (`membership(s)` noch false) | P1 / lokaler belegter Codefehler | **10B-1:** nachweisbar bereits erfüllte/ersetzte Abhängigkeit zulassen, aber unautorisierte Vorgänger weiter sperren | **IMPLEMENTIERT (.58), UNABHÄNGIG REVIEWT; 1287/1287 SUITE; ST-SMOKE 2/3 OK; ECHTE LIVE-ABNAHME OFFEN** |
| **10B-M01** | Loot/Anatomie | Hare/Doe/Goat Antler reproduzierbar | deutlich / lokaler echter Bug | **D:** Spezialbeute nur bei bestätigtem Körpermerkmal; keine globale Species-Tabelle | **OFFEN** |
| **10B-M02** | Monster-Sapienz | `creatureCombatant: sapient:false` | Architekturdefizit | nur belegte individuelle Sapienz über vorhandenen State/Consumer | **OFFEN** |
| **10B-M03** | Monster-Specials | Gift/Flug/Korrosion nur Prosa/Angriffslables | Designlücke bei relevanten Fällen | bestehende typisierte Skill-/Effekt-Primitive punktuell wiederverwenden | **OFFEN** |
| **10B-M04** | Monsterloot tatsächliche Waffen | optionales humanoides Gear ohne echten Combat-Gear-Nachweis | **nachprüfen** | Equipment/Dropbindung, kein Phantomitem | **OFFEN** |
| **10B-C01** | Chase-FeeI / repetitives Nachsetzen | Hasen-/Fuchsjagd, alter Livetest; One-Roll-Code vorhanden | **DESIGN-FIX-KANDIDAT** | erst vorhandenen `fleeing`/ `chase`-Pfad erreichbar machen, nicht zweite Engine | **ZURÜCKGESTELLT** |
| **10B-C02** | Rückzug/Flee-Fairness | bestehendes `pcFlee`, Chance 15–85; ältere FLEE-/Guard-Agency-Fälle | **prüfen** | Parser-/Intent-Priorität, faire Escapes und Klassenmittel | **ZURÜCKGESTELLT** |
| **10B-B01** | Kampfbalance | 218 Szenarien / 60.700 Simulationen, PC-NPC-Asymmetrie | Messhinweis | faire Paarungen, Range-/Kit-/Taktik-Kontrolle | **KEINE NUMERIK FREI** |
| **10B-B02** | Blink-Rangemodell | 8 MP, Hauptaktion, ein Band | bekannte Gameplayabwägung | 2/3 Bands vs. Flee und Klassenbalance testen | **OFFEN** |
| **10B-P01** | Loot/Shop/Skill-Stone-Ökonomie | .48 Richtwert 400 cp vs. Shop 30–80 | Preisbalance | Richtwerte vs. Engine-owned Angebotspreise | **OFFEN** |
| **10B-P02** | Langzeitstabilität | 0/3 natürliche Runs erreichen 100 Turns | Testziel | neue Tests, 500/1000 Stress später | **IN BEOBACHTUNG** |

**Status-Update-Regel:** Befund **nur** auf „bestätigt“ setzen, wenn reproduzierbarer Code/Eventpfad vorliegt. `OFFEN` ist nicht „vergessen“. Bei Auswertung weiterer Runs Spalte Nachweis/Gegenbeispiel ergänzen. Keine stillen Teileinträge zu Großdesigns umdeuten.

---

## 11. Noch ausstehende Design- und Releaseentscheidungen

**Planungsstand vor Implementierung (24.10.2026; durch §13.4 überholt):** Sols angeforderter unabhängiger Drei-Run-Codegegenreview ist als schriftliche Analyse eingegangen. Darauf folgten ChatGPTs kritischer Review und Sols überarbeiteter Vier-Teilpatchplan. Der Nutzer hat anschließend **den Implementierungsauftrag für 10B-1 zur Formulierung angefordert**. Er ist in §13 dokumentiert; **es gibt zum Zeitpunkt dieses Eintrags keinen ausgeführten 10B-1-Fix, keine implementierten Tests und keine bestätigte neue Buildversion**. Claude soll nur nach ausdrücklicher Übergabe dieses Auftrags den Dev-Branch ändern. Monster-/Chase-Design und numerisches Balancing bleiben zurückgestellt.

Später zu entscheiden, nach Evidenz:

- Welche wiederholt beobachteten **Player-Agency- und Narrator-/Engine-Authority-Fehler** blockieren Weiterlaufen und brauchen zuerst kleine reproduzierte Fixes, bevor wir weitere Runs sammeln?
- Wie viel Provider- und Testspielerformat-Zuverlässigkeit muss eine 100-Turn-Runde praktisch besitzen; sicherer Narrator-Empty-Retry ja/nein unter Replay-Schutz?
- Monsteraudit **D** tatsächlich zuerst freigeben? Soll unklarer Spezialdrop unterdrückt, durch generischen Ertrag ersetzt oder mit enger `only_if`-Evidenzprüfung versehen werden?
- Welche Monsterfähigkeiten / Sapienzänderungen sind aus echtem Spiel nötig, statt „weil High Fantasy“ auf Vorrat?
- Ist beim Chase zuerst die **natürliche Parser-/Intent-Anbindung** schuld oder das tatsächliche One-Roll-Regeldesign? Nur den belegten Fehler fixen.
- Ab wann ist B methodisch ausreichend für **Klassen- und Monsterbalance**? Sols PC-vs.-NPC-Vergleiche nicht als endgültig spiegelgleich behandeln.
- Abschließendes XP-/Farm-/Stone-/Gear-Balancing, Blink, Spell-/Passive-Werte, Lootwert, Dungeonprogression und Perf erst mit ausreichendem Gameplaybeleg und ursprünglicher 53-Punkte-Prüfgrundlage entscheiden.

**Historischer Handoff vor Implementierung (durch §13.4 ersetzt):** *„Patch 10B ist nach drei echten `.57`-Läufen und dem unabhängigen Sol-Gegenreview in die Planung kleiner Korrekturpakete übergegangen. Masterquelle: `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md`; unveränderte Original-Runs unter `testrun_10b`. **10B-1** (Fakten-ID-Kollision + verwaistes `needs` nach Guard) ist als Implementierungsauftrag formuliert, **noch nicht umgesetzt**. Weitere Pakete 10B-2 Lieferung, 10B-3 Combat/Authority, 10B-4 LLM-Recovery erst getrennt beauftragen. Design-, Monster-, Chase- und Balancingkandidaten nicht stillschweigend mitfixen; nach jedem Patch main-Dokumentation hier samt Commit/Testbelegen aktualisieren.“*

---

## 12. Technische Quellen und datierte Reviews

**Git-Produktausgangspunkt:**
- [Simulator-Commit `fd20d0d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fd20d0dce0b0fc508b17810872b7933a5f00e994).
- [Monsterdaten (`monsters.json`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/content/monsters.json).
- [Lootcode (`src/v4/loot.js`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/v4/loot.js).
- [Combat (`src/combat.js`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/combat.js).
- [Content / Aliasresolution](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/content.js).
- [World-/Creature-Materialisierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/v4/world.js).
- [Aktuelles Lorebook v0.14](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/lorebook/Avereth_World_Lore_v0.14.json).
- [Simulator-Hinweise](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/tools/sim/README.md).

**Unabhängige Reviews:**
- ChatGPT: zuerst `Avereth_10B_Lore_Monster_Audit_20261024.md`, damals zusätzlich `Avereth_10B_Befunde_und_Artenaudit_20261024.zip` mit ersten Matrixdaten; Kernaussagen in §§5,7 vollständig als historische Position und nach Prüfung revidierte Empfehlung dokumentiert. Die ursprünglichen Artefakte waren Chat-Dateien, nicht automatisch schon Git-Quellen.
- Sol: Datei `Chatgpt Feedback(8).md`, am 24.10. vom Nutzer übermittelt; **in §§6–7 ausführlich und inhaltstreu dokumentiert**; Zahlen nicht eigenständig nachgerechnet und keine Freigabe für neue Species-Architektur erteilt.
- Ursprünglicher C-Entwurf / Nutzerfeedback: älterer erfolgreicher .57-9D-Lauf mit repetitiver Hasen-/Fuchsjagd; historische Varianten aus [Datei 04, §1a.2d](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), technischer aktueller Code-Gegencheck in §8.
- [Run 1 – REVIEW + ZIP](testrun_10b/20261024-030002Z-current_test/) und [Run 2 – REVIEW + ZIP](testrun_10b/20261024-033325Z-current_test/). Bei neuen Runs bleibt deren eigene vollständige Auswertung führend.

**Pflegevermerk:** Historisches nicht löschen, wenn es eine echte Entscheidung oder eine widerlegte Hypothese erklärt; dabei **klar den aktuellen Status darüberstellen**. Diese MD ist absichtlich ausführlich, die vier anderen Projekt-MDs sollen bei normalen 10B-Runs schlank bleiben.


---

## 13. Sols unabhängiger Drei-Run-Gegenreview, Folgeabstimmung und der erste Implementierungsauftrag (24.10.2026)

### 13.1 Quellenstatus und verbindliche Interpretation

**[BERICHTET]** Sols unabhängige technische Analyse (vom Nutzer als \`Chatgpt Feedback(9).md\` übermittelt): alle drei Original-Run-ZIPs einschließlich SHA-256 mit den drei vollständigen ChatGPT-\`REVIEW.md\` verglichen; Dev-HEAD \`fd20d0d\`, Engine \`.57\`. Zwei kleine lesende Funktionsproben, **keine vollständige Testsuite**, keine implementierten Regressionen und keine Produktänderung. Anschließend hat ChatGPT die Befunde bewertet und die neuen Ursachen in den maßgeblichen Codepfaden überprüft. Sols späteres Folgefeedback \`Chatgpt Feedback(20261024-050831).md\` übernimmt insbesondere die Engine-only-Evidenzregel für Lieferungen, den kleinen Scope der ID- und Abhängigkeitsfixes und die strikte Phasentrennung der LLM-Retries. **Die beiden vom Nutzer eingebrachten Feedbackdateien sind Gesprächsquellen; sie werden hier inhaltlich dokumentiert, nicht als bereits zusätzlich auf Git committed behauptet.**

**[BELEGT: Codepfad und Run-Symptom]** 
- Run 1, vier erzählte Bögen: \`src/knowledge.js:setFactEvents\` erzeugt automatisch \`f.<slugPart(s)>.<slugPart(p)>.t<turn>\`; \`slugPart\` kürzt auf 24 Zeichen. \`src/state.js\` speichert \`state.facts[d.fact.id] = clone(d.fact)\`. Bei langen ähnlich beginnenden NPC-IDs entstehen so identische Fakten-IDs und spätere \`armed: bow\`-Fakten überschreiben frühere. **Kein genereller NPC-Klassen-/Fernkampfumbau erforderlich.**
- Run 2, Gildenregistrierung E13: \`src/v4/agency.js\` entfernt \`guild.register\` unter Bedingungen als \`redundant\`, wenn bereits ein Registrierungsverfahren läuft und die Zahlung folgen soll. \`src/v4/commands.js:resolveCommands\` prüft \`needs\` jedoch gegen ausgeführte Sequenzschritte; solange \`membership(s)\` noch nicht wahr ist, bleibt \`offer.accept\` an den entfernten Schritt gekoppelt und wird als \`needs step 1\` verweigert. **Nicht Tresen-gegen-Gebührenbox als eigentliche Codeursache reparieren.**
- Run 3, Delivery-Loop: \`src/v4/guild.js:contractReady\` prüft bei Lieferungen derzeit negativ auf noch vom PC getragene Fracht und kann danach \`q.ready\` als \`story_outcome\` akzeptieren. \`src/v4/world.js\` setzt READY vor später erzeugten Objekten und erfasst in \`refusedMoves\` nicht alle handlerseitigen \`objectMove\`-Ablehnungen. Der echte Transfer am Vertragsziel ist bislang nicht als positiver Nachweis geschützt. **Späterer 10B-2-Fix; NICHT Bestandteil von 10B-1.**
- Weitere Sol-Diagnosen: Run 1 Drohung ≠ ausgeführter Angriff; Run 2 leere Narratorantwort und Phantom-Gildenangebote; Run 3 doppelt leerer Planner; gleiche Klasse von Authority-/Providerproblemen, aber unterschiedliche Consumer und Sicherheitsregeln. Kein numerischer Balancebeleg aus den drei offenen Runs.

**Aktuelle Pakettrennung (noch nicht pauschal freigegeben):**
1. **10B-1 – Faktenidentität und redundante \`needs\`-Vorgänger**: Implementierungsauftrag formuliert, zuerst vorgesehen; exakte Arbeitsanweisung nachstehend.
2. **10B-2 – freiwillige GIVE/GO→GIVE-Übergabe, positiver Engine-only-Lieferbeleg, konsistente READY-/Proof-Prüfung**: eigener mittelgroßer Patch mit strengem Replay-/Migrationsschutz.
3. **10B-3 – autonome Kampfeskalation nur bei belegtem Angriff, mechanische Kampfchronik/Memory-Truth, offizielle Guild-Board-Authority**: eigenes Paket; negative Drohungs- und positive Hinterhaltsfälle nötig.
4. **10B-4 – begrenzte leere Planner-/Narrator-Recovery und präzise Runner-Endgründe**: phasensicher; Narrator automatisch regenerieren ausschließlich nach echtem SillyTavern-Hostnachweis.

Reise-/Zeitmodell, ausgreifende NPC-Präsenzreparaturen, Monster- und Chase-Design, XP, Skill-/Kampfbalance und allgemeine Performanceoptimierung sind nicht Teil von 10B-1. Der konkrete Phantom-Kutschbock-Ort aus Run 1 bleibt als später gezielt zu reproduzierender Defekt unter T05 erhalten.

### 13.2 Patch 10B-1 – ursprünglicher Implementierungsauftrag (durch Codex umgesetzt; §13.4)

**Ziel und Branch:** Ausschließlich **10B-1** implementieren auf \`claude/c-planner-prototype-2026-10-02-gpt-c666\`, verifizierter Ausgangs-HEAD \`fd20d0dce0b0fc508b17810872b7933a5f00e994\` / \`4.3.0-c.6.6.57\`. Bei neuem HEAD den aktuellen Diff prüfen. Keine Änderungen am \`main\`-Enginecode, \`current_test\`, den Test-ZIPs oder an 10B-2/3/4.

**Fehler A: kollisionsfreie automatische Fakten-IDs**
- Betroffene Module: \`src/knowledge.js\`, ggf. minimaler bereits vorhandener Event-/State-Consumer; bestehende V4-C-NPC-Waffen- und Knowledge-Tests.
- Unterschiedliche Subjekt-/Prädikat-/Wert-Aussagen und mehrere unterschiedliche Werte desselben Subjekts/Prädikats im selben Turn dürfen keine identische ID besitzen. Auch A→B→A desselben funktionalen Fakts innerhalb eines Turns muss seine Historie bewahren.
- IDs ausschließlich deterministisch/replayfähig bilden, mit vorhandenen Mitteln und ohne zufällige UUIDs oder neue Bibliothek. Zur Anzeige gekürzte Schlüssel nicht als eindeutige Identität verwenden. Bereits explizit gesetzte stabile IDs, aktuelle Deduplizierung, Functional-\`fact.ended\`, Knowledge-Verweise und alte Event-IDs unangetastet lassen.
- Test **F1**: vier lange gleich beginnende Banditen-IDs mit vier \`armed: bow\`-Fakten ergeben vier separate persistierte Fakten und vier korrekte materialisierte Fernkampfprofile. Test **F2**: zwei verschiedene nichtfunktionale Werte im selben Turn bleiben getrennt; identische Wiederholung wird dedupliziert. **F3**: mehrfache Änderungen funktionaler Fakten inklusive A→B→A mit korrekter Historie. **F4**: explizite IDs bleiben unverändert. **F5**: deterministisches Fold/Reload, keine verlorenen Wissensreferenzen oder rückwirkend erfundenen historischen Fakten.

**Fehler B: vom Guard zu Recht entfernte redundante Vorgänger**
- Betroffene Module: \`src/v4/agency.js:guardCommands\`, \`src/v4/commands.js:resolveCommands\`, die unmittelbare Planner-/Runtime-Übergabe nur soweit wirklich nötig.
- \`needs\` ausschließlich dann als bereits erfüllt/ersetzt behandeln, wenn der gültige Enginezustand beziehungsweise eine nachweisbar dieselbe Transaktion diese Voraussetzung tatsächlich deckt. Ein offenes Registrierungsverfahren allein ist nicht mit abgeschlossener Mitgliedschaft gleichzusetzen. Zahlung, Mitgliedschaft und Replay bleiben Engine-owned; **niemals alle \`needs\` pauschal löschen**.
- Test **A1**: Registrierung pending, redundantes \`guild.register\` entfernt, \`offer.accept needs\` führt zu exakt **einer** Abbuchung und **einer** Mitgliedschaft. **A2**: \`no_evidence\`/\`npc_actor\`/\`negation\`/\`plan\` und vergleichbare unautorisierte Vorgänger erfüllen keine \`needs\`. **A3**: verweigerter oder noch offener Vorgänger blockiert den Folge-Commit. **A4**: wirklich bereits erfüllte Vorgänger führen nicht zur künstlichen Wiederholung. **A5**: Rephrase, Fold/Reload ohne doppelte Zahlung oder Mitgliedschaft. Bestehende Käufe, Räume, Verkäufe und andere abhängige Kommandos bleiben geschützt.

**Verpflichtender Implementierungs- und Testablauf:** 
1. Aktuellen Dev-HEAD und relevante Funktionen lesen.
2. Eng begrenzte Red-Regressionen **vor dem Fix** ausführen und ursprüngliche Ausfallursache protokollieren; keine vorhandenen Tests künstlich rot machen.
3. Kleinsten passenden Code-Diff implementieren; keine neue Architektur.
4. Neue Regressionen, betroffene Suites und anschließend vollständige Testsuite mit echten Zahlen ausführen; Event-Replay/Reload gesondert prüfen.
5. Selbstreview des Diffs auf neue Fact-Kollisionen, versehentlich erweiterte Autorisierungen, doppelte Geldbuchungen und Legacy-/V4-A-Vertragsbrüche.
6. Version und technische Patchnotes nur entsprechend tatsächlichem Code- und Teststand aktualisieren; Dev-Änderungen committen und HEAD/Build/Testbelege melden.
7. Sol/ChatGPT unabhängige Reviewvorlage geben. **Nur implementiert/getestet markieren, was tatsächlich bestätigt ist; Live-Abnahme folgt erst nach passenden echten ST-Läufen.**

**Ausdrücklich ausgeschlossen:** Delivery/READY/GIVE-/Questumlagerung (10B-2), Kampfstart/Narrator/Memory/Board (10B-3), LLM-Retries/Provider (10B-4), Reise-/Monster-/Chase-/Balanceänderungen.

### 13.3 Dokumentationsrhythmus und nächste Kontrolle

**Dokumentation auf \`main\` wird nach jedem 10B-Meilenstein aktualisiert, nicht erst am Ende der ganzen 10B-Serie**: nach Auftragserstellung (dieser Eintrag), nach Claude-Implementierung (tatsächlicher Diff/Build/Commit), nach unabhängigem Review (bestätigt/offen), nach eventuellen Nachfixes und nach Live-Abnahme (Test-Run-ID und Ergebnis). Historische Befunde dabei nicht löschen; in §0 und in der Matrix den aktuellen Stand klar darüberstellen. Die Root-Dateien 01–04 nur bei echten Rollen-/Kanon-/großen Projektmeilensteinen knapp nachführen. Noch keine Aussage über den Erfolg oder die Implementierung von 10B-1.

**Quellen:** Einzelreviews mit ZIPs [Run 1](testrun_10b/20261024-030002Z-current_test/REVIEW.md), [Run 2](testrun_10b/20261024-033325Z-current_test/REVIEW.md), [Run 3](testrun_10b/20261024-041150Z-current_test/REVIEW.md). Die beiden Sol-Gegenreview-Dateien wurden vom Nutzer am 24.10.2026 im Projektchat übermittelt. Maßgeblicher Dev-Code-Snapshot: [\`fd20d0d\`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fd20d0dce0b0fc508b17810872b7933a5f00e994).


### 13.4 10B-1 durch Codex implementiert und selbst getestet – .58, 24.10.2026

**Aktueller Stand:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` wurde von `fd20d0d` auf [`e6c76b4`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d) vorgerückt. Build **4.3.0-c.6.6.58**, Narrator-Vertrag **.55 unverändert**. Der Nutzer hat den ausdrücklichen Implementierungsauftrag als Anhang übergeben; Codex hat ausschließlich 10B-1 umgesetzt. Claude übernimmt das unabhängige Gegenreview. **Kein echter ST-/GLM-Livetest in dieser Umsetzung; keine Live-Abnahme.**

**Produktänderungen nur in zwei Fachmodulen:** `src/knowledge.js` erzeugt automatische Fakten-IDs mit vollständiger Subjekt-/Prädikatsidentität im Hash und deterministischem Belegungscheck (auch gegen Hashkollisionen und A→B→A-Historie innerhalb eines Turns). `src/v4/commands.js` lässt die abhängige Annahme des offenen kanonischen Registrierungsangebots nach einem vom Guard redundant entfernten Registrierungswunsch zu. Die normalen Angebots-/Geld-/Ortsprüfungen bleiben zuständig. Echte Guard-Ablehnungen erfüllen auch bei bestehender Mitgliedschaft keine Vorgängerabhängigkeit. Keine Änderungen am Agency-Guard oder allgemeine Freigabe von `needs`.

**Selbst ausgeführte Nachweise:** 11 neue Regressionen (`tests/v4/patch10b1.test.js`), finaler Rotlauf mit unveränderten .57-Modulen **5/11 grün, genau 6 rot**; nach Fix **11/11 grün**. Angrenzende Agency-/c66-Prüfungen samt neuen Tests **125/125**, ein vollständiger npm-test-Abschlusslauf **1286/1286**, keine Fehler. Fakten-/Materialisierungs- und Knowledge-Referenz-Replay nach JSON-Serialisierung, echter V4-C-Planner-/Guard-/Handlerpfad der Registrierung, negative Abhängigkeiten, geschlossene Angebote, fehlendes Geld und V4-A-Verhalten abgedeckt. Keine unabhängige Testbestätigung durch Claude behauptet.

**Legacy-/Save-Grenze:** Neue automatische Fakten-IDs ändern sich auch im gemeinsamen Legacy/V4-A-Knowledge-Helfer: bewusste Korrektur des gemeinsamen Identitätsfehlers, keine Regel-/Balanceänderung. Explizite IDs und existierende Events bleiben unverändert; alte Logs werden weder migriert noch historisch verlorene Fakten spekulativ rekonstruiert. Keine neuen Events/Vokabularversionen. Teilpatches 10B-2/3/4, Guide und Original-ZIPs unverändert.

**Technische Patchnotes:** [`PATCH10B1_FACT_ID_DEPENDENCIES.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d/avereth-engine/docs/PATCH10B1_FACT_ID_DEPENDENCIES.md), Kurzstatus in Dev `docs/PROTOTYPE_C.md`; Versionen in `util.js`, `manifest.json`, `package.json` synchron .58. Root 01–04 bleiben bei diesem Teilmeilenstein unverändert.

**Nachtrag zum damaligen nächsten Schritt:** Das unabhängige Diff-Review ist inzwischen ohne Blocker erfolgt (§13.5); der Reviewer hat aber nur 11/11 Zieltests selbst ausgeführt, **nicht** die frühere Rotphase oder Full-Suite reproduziert und **keinen** ST-Smoke ausgeführt. 10B-2 bleibt unbegonnen. Die .58 behebt weder Run-3-Lieferabläufe noch Run-1-Angriffseskalation oder Run-2-/Run-3-LLM-Leerantworten.


### 13.5 Unabhängiges Diff-Gegenreview zu 10B-1 (.58, 24.10.2026)

**Reviewstatus:** **[BERICHTET / teilweise unabhängig getestet]** Der vom Nutzer übermittelte unabhängige Gegenreview des Commits [\`e6c76b4\`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d) hat ausschließlich das Diff geprüft und die Datei \`tests/v4/patch10b1.test.js\` im Commitstand ausgeführt: **11/11 grün, keine Blocker**. **Nicht** selbst ausgeführt wurden die gesamte Testsuite, der ST-Smoke und der Rotlauf gegen unveränderte .57-Codepfade; auch der \`main\`-Dokumentationscommit \`ca42a82\` war ausdrücklich nicht Bestandteil dieses Reviews. Die Zahlen **1286/1286** und **6 gezielt rote Fälle auf .57** stammen bislang ausschließlich aus dem Implementierungsbericht. ChatGPT hat den aktuellen Git-HEAD und das Vorhandensein der Dokumentation separat gegengeprüft, aber die Tests nicht selbst ausgeführt.

**Fakten-IDs:** Neue Form \`f.<gekürzter Subjekt-Slug>.<gekürzter Prädikats-Slug>.<hash32(vollständiges [s,p])>.t<turn>[.n]\`; Belegungsprüfung gegen \`state.facts\` einschließlich beendeter Fakten verhindert Kollision und erhält A→B→A-Historie. Review berichtet, dass die verwendeten \`emit\`-Aufrufe Events sofort in den Arbeitszustand falten, sodass im untersuchten Pfad keine Sammelbatch-Kollision bleibt. Explizite IDs einschließlich \`f.pc.name\` und Todes-ID werden nicht automatisch umbenannt; unveränderte Alt-Events falten weiterhin. Eine explizit erzeugte Todes-ID bleibt bei mehrfacher identischer Todesbuchung im selben Turn potenziell gleich; Reviewer bewertet dies im aktuellen Regelpfad als nicht kritisch, hat dafür aber **keine vollständige separate Prüfsuite** durchgeführt. Auch ein Repository-weiter Scan von Verbrauchern, die das alte ID-Format parsen könnten, ist **nicht** umfassend nachgewiesen. Längere ID-Anzeigen und Performance wurden nicht gemessen.

**Registrierung:** Nur ein mit Regel \`redundant\` aus \`guild.register\` entfernter Vorgänger mit passender \`seq\` kann die Ausnahme für \`offer.accept\` des offenen kanonischen \`REGISTRATION_OFFER\` (\`guild_registration\`) begründen. Der vorhandene Handler prüft Angebot, Ort, Auswahl, Preis und Guthaben weiterhin. Sonstige Guard-Ablehnungen bleiben gesperrt. \`alreadyRegistered\` verlangt einen echten \`resolved\`-Vorgänger bzw. einen als redundant entfernten Registrierungsschritt statt bloß einer beliebigen Eintragung passender \`seq\`.

**Abgleich offener Testhinweis:** Der vom Reviewer erwogene *kein Guthaben*-Test existiert bereits in \`patch10b1.test.js\` (Test \`replacement cannot pay a closed offer or spend missing funds\`, Fall \`poor\`): PC-Guthaben wird null, und weder \`coin.changed\` noch neue Guild-Mitgliedschaft dürfen folgen. **Nicht ausdrücklich abgedeckt** ist eine weitere Folgeaktion, die per \`needs\` von der zuvor fehlgeschlagenen Zahlung abhängt; ein zusätzlicher gezielter Test dafür ist sinnvoll, aber **kein nachgewiesener Produktfehler** und kein Anlass für Scope-Expansion ohne Befund.

**Reviewer-Umgebung:** Der Reviewer meldet am Ende lokalen Checkout auf \`claude/happy-wright-1a4y19\`, nach eigenen Angaben ohne Produktänderung. Das ist eine lokale Branchlage, **nicht** ein neuer Engine-Commit und kein Hinweis, dass der freigegebene Entwicklungsbranch gewechselt wurde. Tatsächliche Git-Refs beim Dokumentationscheck: Dev \`e6c76b4\`, \`main\` \`ca42a82\`.

**Abschluss-Gates vor echtem neuem ST-Lauf:** Auf dem **korrekten Dev-HEAD** \`e6c76b4\` sind \`npm test\` und \`npm run smoke:st:c\` aus \`avereth-engine/\` erneut bzw. unabhängig auszuführen; echte Ergebnisse mitsamt Umgebung, eventuellen Abhängigkeiten des Smoke-Tests und Fehlermeldungen dokumentieren. Der separate ST-Smoke ist **keine Live-Abnahme** durch einen natürlichen GLM-Lauf. 10B-2 nicht stillschweigend beginnen; zunächst die zwei Prüfresultate entgegennehmen und gesonderten 10B-2-Auftrag abstimmen. Nach jedem dieser Meilensteine \`main\`-Status hier fortschreiben. Keine Änderungen an den 01–04-Rootdateien für diesen kleinen Reviewmeilenstein.


### 13.6 Vollsuite und ST-Smoke nach unabhängigem Review – .58, 24.10.2026

**[BERICHTET – unabhängiger Prüfer; Rohlogs nicht durch ChatGPT neu gelesen]** Nach dem reinen Diff-Review hat der Prüfer auf einem Worktree des Commits [\`e6c76b4\`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d), Build \`4.3.0-c.6.6.58\`, \`npm test\` und drei ST-C-Smoke-Durchläufe ausgeführt. Der Remote-Entwicklungsbranch stand beim Dokumentationscheck weiterhin auf \`e6c76b4\`; es wurden keine Produktänderungen berichtet.

| Prüfung | Ergebnis | Interpretation |
|---|---|---|
| \`npm test\` | **1287/1287 bestanden**, 0 fehlgeschlagen, 0 übersprungen | Unabhängige vollständige Testsuite. Die Differenz von genau **einem** Test zur Implementiererangabe **1286/1286** wurde nicht untersucht; dafür keine Ursache behaupten. |
| \`npm run smoke:st:c\`, Lauf 1 | **FAILED**, \`noPageErrors: false\`; einzig gemeldeter Fehler \`AbortReason @ openai.js:4565\`; übrige **18 Prüfungen grün** | Echter Fehllauf, nicht aus der Quote entfernen. Aus dem ST-Code-Ort allein folgt **kein Nachweis**, ob Ursache Host-Race, Setup-/Providerumgebung oder ein Zusammenspiel mit der Engine war. Keine .57-Kontrollprobe. |
| \`npm run smoke:st:c\`, Lauf 2 | **OK**, \`pageErrors: []\`, Integrität OK, Build \`.58\` sichtbar | Fehlerfreier ST-Smoke. |
| \`npm run smoke:st:c\`, Lauf 3 | **OK**, \`pageErrors: []\`, Integrität OK, Build \`.58\` sichtbar | Zweiter fehlerfreier Wiederholungslauf. |

**Korrekte Gesamtaussage: ST-Smoke 2 von 3 Läufen vollständig sauber, 1 von 3 mit offenem \`AbortReason\`-Seitenfehler.** Eine Ähnlichkeit mit dem historischen sporadischen SillyTavern-Race-Hinweis in Root-Datei 04, §15, ist nur eine **Hypothese**, kein nachgewiesener gemeinsamer Fehler. Bei Wiederholung Fehlerpfad, Stack, Hostzustand und gegebenenfalls .57-Gegenprobe gezielt untersuchen. Derzeit ist kein konkreter 10B-1-Regressionsfehler in diesem Befund bewiesen; umgekehrt darf er nicht als sicher irrelevant abgetan werden.

**Testumgebung:** Der Prüfer meldet einen frisch geklonten SillyTavern **1.19.0**, anschließend \`setup.mjs\`; vorhandenes Scratchpad war zuvor geleert. Die drei Smoke-Läufe erfolgten mit **Dummy-Schlüssel** gegen einen Worktree von \`e6c76b4\`, **ohne echten API-Key und ohne echten GLM-Modellaufruf**. Im temporären Prüfer-Scratchpad liegen nach seiner Angabe \`smoke_c_58.log\`, \`smoke_c_58_r2.log\` und \`smoke_c_58_r3.log\`. Diese lokalen Dateien sind **nicht** als in Git archiviert oder von ChatGPT geöffnet auszugeben.

**Abnahmegrenze:** Unabhängiges Diff-Review ohne Blocker; 11/11 Zieltests, unabhängig berichtete 1287/1287 Vollsuite und zwei von drei saubere ST-Smokes. **Die Durchführung der echten Live-Abnahme von 10B-1 kann freigegeben werden; sie ist noch nicht absolviert.** Diese Freigabe sagt nichts über die weiterhin offenen Defekte aus 10B-2 (Lieferungen), 10B-3 (Angriff/Authority) und 10B-4 (leere LLM-Antworten) aus. **10B-2 war zu diesem Prüfzeitpunkt noch nicht begonnen; der folgende §14 dokumentiert inzwischen den ausformulierten Auftrag, jedoch keinen implementierten Patch.**

**Dokumentationspflege:** Nach echtem ST-/GLM-Livetest oder erneuter relevanter technischer Prüfung diesen Stand in \`06\` auf \`main\` nachtragen; die Root-Dokumente 01–04 nur bei übergeordnetem Meilenstein anfassen. Der frühere §13.5 dokumentiert bewusst den damaligen Prüfhorizont vor dem hier berichteten Integrationslauf.


---

## 14. 10B-2 – Lieferungen, freiwillige Übergaben und überprüfbare Erfüllung: Implementierungsauftrag, Review- und Patchnotesplan (24.10.2026)

**Ursprünglicher Auftragsstand (durch Implementierungsnachtrag §14.5 überholt):** Dieser Auftrag wurde während eines **lokal laufenden natürlichen ST-Langtests vorbereitet, der laut später geprüftem Original-Run-4 tatsächlich auf Build `.57` (3181c8112ec6) lief**. Die vorherige Doku-Annahme `.58` bezog sich irrtümlich auf den bereits auf GitHub verfügbaren Basiscommit für den 10B-2-Auftrag, **nicht** auf die lokale Runner-Instanz. Ausgangscommit: [`e6c76b4`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d), Engine `4.3.0-c.6.6.58`. Der automatische Runner arbeitet auf dem **lokalen Git-Checkout** und kopiert beim Start Engine, Karte und Lorebook in seine **isolierte temporäre SillyTavern-Instanz**. Ein Commit/Push auf GitHub aktualisiert weder diesen lokalen Stand noch die laufende Instanz; der Nutzer zieht die Änderungen erst nach Testabschluss. **Daher ist keine besondere Worktree-/Featurebranch-/Merge-Sperre nötig**. Im vorliegenden Auftragsschritt wurde noch kein Codepatch erstellt, kein 10B-2-Test ausgeführt und kein Build verändert.

### 14.1 Der ausführbare Auftrag an den Implementierer (Codex/Claude Code)

**Ziel / Spielerwirkung:** Der Spieler kann eine echte Lieferung in natürlicher Sprache **am richtigen Ort und an den vorgesehenen Empfänger** übergeben und anschließend ohne zusätzliche erfundene Bürokratie abrechnen. Eine Kiste, die lediglich nicht mehr im Inventar liegt, gilt **nicht** als geliefert. Direkte freiwillige Übergaben, Reise mit Übergabe im selben Spielzug und vereinbarte Ablageverträge sollen funktionieren, **ohne** die PC-Inventar-Firewall zu lockern oder zusätzliche Unterschriften/Interaktionszüge zu verlangen.

**Verbindlicher Scope:** Der zusammenhängende Fix betrifft
- `src/v4/commands.js` (`give`, `drop`, `go`, `needs`, conditional commands),
- `src/v4/world.js` (Extraktor-/Firewall-Deltas, `objectMove`, `expected.taken`, `quest.ready`, verspätete Ankunft/Übergabe),
- `src/v4/guild.js` (`deliveriesOf`, `contractReady`, `readyText`, `proofTerms`, `slipMarks`, ggf. Hilfsfunktion für einen Nachweis),
- `src/v4/domain.js` (kleine replayfähige Persistenz ausschließlich Engine-gebuchter Nachweise),
- `src/v4/planner.js` und `src/v4/catalog.js` sowie relevante Narrator-/Extractor-Ausgabe, soweit für die korrekte **Interpretation/Darstellung** nötig.
Nur bei wirklich notwendigem Befund weitere Dateien berühren. Kein neues Questsystem, keine globale Orts-/NPC-Identitätsdatenbank oder Mehrort-Transaktionsmaschine.

**Belege aus den Originalruns:**
- Run 3 [`REVIEW.md`](testrun_10b/20261024-041150Z-current_test/REVIEW.md), E7: Questvertrag `GET` Kiste im Shop, `DELIVER` intakt zum **Quarry Camp/Heilerin Brenna**, unterschriebener Chit als Beleg; **keine** Verpflichtung, leere Kiste an Shop oder Gilde zurückzugeben.
- E14/T7: `quest.ready` vor verspätetem `object.created` (Holder PC).
- E28/T14, E32/T16, E35/T18: Spieler will Kiste freiwillig abgeben, aber Direkt-/bedingte `give`-Buchung oder `object.move` scheitert. T16 entsteht trotzdem READY, `cmd.expired` bleibt offen.
- E37/T19: Kiste wird auf **Gildenboden**, nicht am Lieferziel, gedroppt.
- E39/T20: `contractReady` akzeptiert danach `story_outcome` und zahlt 40 cp/23 XP, obwohl keine bestätigte Ablieferung am Ziel eingetragen ist.
- Run 1 und Run 2 enthalten **gültige, erfolgreich abgewickelte Lieferaufträge**: Diese Pfade sind verpflichtende **grüne Kontrollfälle**; ein neuer positiver Nachweis darf sie nicht künstlich blockieren.

**Codeursachen – vor dem Patch separat mit gezielten Red-Regressionen reproduzieren:**
1. `guild.js:contractReady()`: Das heutige negative Gate prüft nur, ob eine passende Fracht beim PC verbleibt; anschließend genügt `q.ready` oder Legacy-Proof. Ein beliebiger Drop kann dadurch `story_outcome` freigeben.
2. `world.js`: `quest.ready` wird sofort verarbeitet, während `expected.taken` ein Cargo-Objekt erst später anlegt. `refusedMoves` erfasst initiale Firewall-Ablehnungen, jedoch nicht zuverlässig spätere Ablehnungen aus `objectMove()`.
3. `commands.js:give()`: Direkte Übergabe an einen anwesenden realen Empfänger wird bereits engineintern als `object.moved` gebucht. `GO→GIVE` kann nur bedingt gebucht werden; Objektmenge, gebundener Empfänger und tatsächlicher Ankunftsort müssen über den nachgelagerten Narrator-/Extractor-Pfad erhalten bleiben.
4. `planner.js`: Für eine aktive Quest gilt auf dem vereinbarten Empfängertresen abgegebene Fracht unter bestimmten Bedingungen als tatsächliche Übergabe; allgemeines Auslegen von Waren zum **Prüfen, Wiegen oder Verkauf** darf dagegen weiterhin keine unfreiwillige Gabe sein.

**Technische Anforderung A – autorisierte Transfers (so wenig Code wie möglich):**
- Eindeutiges `GIVE` an **anwesenden** Empfänger → vorhandener deterministischer `object.moved`-Pfad, einschließlich Teilmenge/Split, bleibt Grundlage. Auch der empfangene Besitz muss technisch beim angegebenen Empfänger landen. Keinen zweiten Extractor-Transfer für die schon gebuchte Aktion generieren.
- `GO→GIVE` → `needs`/bedingte Verarbeitung mit ursprünglicher Objekt-ID, Menge, Empfängerreferenz und Zielort; nach **bestätigter** Ankunft ausführen, sofern der richtige Empfänger dort **tatsächlich anwesend** ist und die Spielerhandlung die Abgabe autorisiert. Keine freie Empfängerwahl, kein generisches „irgendein Händler dort“, keine NPC-Duplikate und keine Teleportation.
- Unbekannte textualen Empfängernamen ausschließlich **eindeutig** mit bestehenden NPC-/Ortseinträgen verbinden. Bei Mehrdeutigkeit Aktion ehrlich offenlassen, keine beliebige Auflösung.
- Bewusstes Abstellen an einem vertraglich **ausdrücklich erlaubten** Ablageplatz kann die Lieferung vollenden. Ein beliebiger `DROP` am Zielort reicht **nicht automatisch** für persönliche Übergabe; der Gildenboden eines anderen Orts erst recht nicht.
- Der Spieler kann eine Kiste ausdrücklich auf dem Tresen **zur Übergabe stehen lassen**. Das ist etwas anderes als „zur Begutachtung hinlegen“ oder „den Beleg vorzeigen“. Planner- und Agency-Filter nur so weit präzisieren, dass diese Unterscheidung zuverlässig getroffen wird.
- `pc_inventory`-Schutz **nicht** global aufweichen. Bloß vom Narrator behauptete Übergabe bleibt ohne Spielerautorisierung wirkungslos.

**Technische Anforderung B – ein kleiner positiver, replayfähiger Liefernachweis:**
- Für jedes erfüllte `DELIVER`-/gegenständliche `GIVE`-Objective persistiert die **Engine** einen strukturierten Nachweis mit mindestens `questId`, stabiler Objective-Zuordnung (`objectiveId` oder vergleichbar), `objectId`, tatsächlich gebuchter Menge, Empfänger **oder zulässigem Ablageort**, tatsächlichem Ereignisort und zugrundeliegendem Buchungs-/Sequenzbezug.
- Der Beleg entsteht **ausschließlich aus einem gültigen Engine-Transfer** bzw. einem ausdrücklich autorisierten vertraglichen Ablagepfad, nicht aus freier `quest.ready`-/`quest.progress`-Prosa, nicht aus einem nachträglich erfundenen `proof`, nicht aus `!heldBy(pc)`. Eine vom Extractor selbst gemeldete Zahl/Quelle ist kein Engine-Beweis.
- Verwende das bestehende Eventmodell: möglichst ein eng ergänztes vorhandenes Engine-event plus zugehöriger Reducer. Falls ein gesonderter Eventtyp **nachweisbar** weniger Risikofläche hat, kurze Begründung im technischen Patchnote. Keine allgemeine Quest-DSL oder unabhängige Belegverwaltung.
- Nachweis muss Mengen und mehrere Objective-/Teil-Lieferungen korrekt behandeln (idempotente Verarbeitung, kein doppelter Fortschritt). Ein bewiesener Transfer eines Teilstapels darf den Rest nicht fälschlich als geliefert ausweisen.
- Replay/Fold und Swipe/Regenerate dürfen weder doppelte Nachweise noch zweite Kisten, zweite Auszahlung oder zusätzliche Questfortschritte erzeugen. Bereits abgeschlossene Quests auf alten Saves bleiben abgeschlossen.
- Interner Nachweis ist **kein** neuer Gegenstand, Quittungsauftrag, Unterschriftenzwang oder Spielerinteraktion. Der im ursprünglichen Questvertrag ggf. verlangte unterschriebene Chit darf weiterhin als Geschichte/Verifikationsbeleg bestehen; er ersetzt die reale Warenübergabe aber nicht automatisch.

**Technische Anforderung C – konsistente READY-/Turn-in-Prüfung:**
- `quest.ready` mit Lieferbezug bis nach allen relevanten Objektänderungen, verspäteter `expected.taken`-Aufnahme und erlaubten Transfers des Zuges **prüfen bzw. finalisieren**. Auch handlerseitige `objectMove`-Ablehnungen in den tatsächlichen Entscheidungszustand einbeziehen.
- `guild.js:contractReady()` verlangt bei einem V4-C-Lieferobjective eine positive ausreichende Erfüllung **am richtigen Ziel**. `q.ready` allein oder Besitzverlust reichen ausdrücklich nicht. Alle vorhandenen Wege, über die `completeContract`, `slipMarks`, Katalog/HUD und Turn-in prüfen, müssen dieselbe Aussage liefern.
- **Bestehende Regeln für reine Sammelquests, Jagden/DEFEAT, Dungeonräumung und Private Jobs nicht stillschweigend ändern.** Gemischte `GET+DELIVER`-Aufträge müssen funktionieren, ohne GET als extra spätere Warenabgabe an die Gilde zu behandeln.
- Eine nachweislich abgeschlossene Lieferung bleibt abgeschlossen, auch wenn der Spieler später eine leere Verpackung, einen Vertragsschein oder den Chit weiterträgt oder anderswo liegen lässt.
- `quest.detailed`, Fact-Notizen, Erzähler- und Guild-Clerk-Kontext dürfen keine **neue** Rückgabe-/Empfänger-/Ortsbedingung aus technischen Fehlmeldungen ableiten. Stattdessen die unveränderte Vertragsanforderung und die konkret fehlende **Engine-Handlung** benennen. Private Nebenaufträge weiter zulassen.
- **Alte aktive Lieferungen:** Keine Belege rein aus freier Narration, einem unterschrieben benannten Papier oder einem `ready_note` erfinden; falls aus existierenden autorisierten Events eindeutig rekonstruierbar, nur mit deterministischem Nachweis. Sonst eine **einfache legitime Bestätigung durch ursprünglichen Empfänger am ursprünglichen Ziel** anbieten, ohne künstliche neue Rundreisebedingung. Bereits abgeschlossene Verträge nicht rückwirkend aufrollen.

**Technische Anforderung D – Mehrortfolgen klein halten:**
- Ein `GO→GIVE` am tatsächlich erreichten Ziel muss in einem kompakten Zug möglich sein. In einer längeren Abfolge `Shop→Gilde→Shop` oder `GO→GIVE→GO` **keinen späteren Schritt als getan buchen**, während die bedingte Übergabe oder Ankunft noch offen ist.
- Ausgeführte, aber nur **teilweise** erfüllte Schritte klar anzeigen; keine erfundene Komplettierung und keine zusätzlichen Pflichtfortsetzungsturns, wo der bestehende Pacingpfad eindeutig weitergehen kann.
- Keine neue universelle Sequenz-/Reiseroutenmaschine als „Lieferfix“.

### 14.2 Rot/Grün-Testmatrix – vor Codefix nachweislich rot

- **D1:** Ursprünglicher Run-3-Auftrag mit `GET+DELIVER`: `quest.ready` vor später erzeugter, weiterhin getragener Kiste → kein Abschluss/kein falsches READY-HUD.
- **D2:** Korrekte **direkte** freiwillige `GIVE`-Übergabe von Fracht an richtige, anwesende Heilerin am Quarry Camp → genau ein positiver Engine-Beleg und gültiger Turn-in, keine Extra-Rückgabe.
- **D3:** `GO→GIVE` mit tatsächlicher Ankunft, gebundener Zielperson und korrekter Menge → positiver Engine-Beleg, keine Zusatznachricht nötig.
- **D4:** `objectMove` wird **erst im Handler** verweigert → kein scheinbares READY trotz Handler-Ablehnung, Cargo bleibt beim PC.
- **D5:** `DROP` am Gildenboden, falsche Empfängerperson, falscher Ort, bloßes Vorzeigen, erdachter Narrator-Transfer → keine Lieferung und keine Auszahlung.
- **D6:** Gegenstand am vertraglich **erlaubten Ablageort** ohne NPC-Übergabe → korrekt; bloß beliebig am Ziel abgestellt → nicht automatisch korrekt.
- **D7:** Teilmenge/Stapel, zwei Lieferziele, gemischte Sammel-/Liefer-Quest: nur genügend objektiv nachgewiesene Mengen erfüllen die betroffenen Objectives.
- **D8:** Vorhandene **gültige** Lieferpfade aus Original-Runs 1 und 2 als konkrete positive Rückwärtskompatibilitätsproben, nicht nur allgemein „Guild-Tests grün“.
- **D9:** Alte **abgeschlossene** Quests unverändert; aktive Legacy-Lieferung nicht allein wegen `ready_note` als bewiesen umetikettieren; echter Reload/Fold, Regenerate/Swipe ohne Doppelkiste, XP, Auszahlung oder Beleg.
- **D10:** Markt-/Furrier-Fälle: Ware nur zur Preisprüfung auf den Tresen → **keine** freiwillige Gabe; Cargo explizit zur Übernahme beim autorisierten Empfänger belassen → Gabe zulässig.
- **D11:** `GO→GIVE→GO` mit offener Zwischenbedingung: nur tatsächlich abgeschlossene Teilhandlungen buchen; keine fiktive zweite Reise oder Turn-in.
- **D12:** `current_test`-Guide, V4-A/Legacy, Inventar-Firewall, `c663`, Agency/Ownership, Guild/Proof, Live-/Host-Stale-Schutz bleiben grün.

**Testablauf:** Vor Änderungen gezielte Regressionen gegen `.58` rot zeigen und die **einzelne Ursache** dokumentieren. Danach grün; übrige betroffene Suites; **eine abschließende vollständige** `npm test`-Suite; `npm run smoke:st:c` separat mit wahrheitsgetreuem Fehlstatus. Ein temporärer ST-Hostfehler wie `AbortReason` darf nicht als sicher vom Patch unabhängig behauptet werden, ohne Gegenbeleg. Kein neues mechanisches Fixture im **offenen** `current_test`-Guide, kein echter Runner-Test als synthetischer 100-Züge-Erfolg etikettieren.

### 14.3 Regulärer Implementierungsablauf neben dem lokalen Langrun

**Entwicklungsbranch:** Zu Beginn den aktuellen HEAD von `claude/c-planner-prototype-2026-10-02-gpt-c666` prüfen (bei Auftragserstellung `e6c76b4`, Build `.58`). **10B-2 wie gewohnt auf diesem Branch implementieren, gezielt testen, dokumentieren, committen und pushen. Kein zusätzlicher Featurebranch/Worktree, kein künstlicher Merge-Stopp und keine Wartepflicht bis zum Ende des laufenden Tests.** Der natürliche `current_test` läuft **auf dem Rechner des Nutzers** gegen dessen lokalen Checkout: `run_live.mjs` startet eine isolierte ST-Instanz, `profile.mjs:seedProfile` **kopiert** vor Beginn die aktuelle lokale Extension in deren temporären Datenordner. GitHub-Pushes verändern weder den lokalen Checkout noch die bereits laufende Instanz. **Der Nutzer führt `git pull` erst nach dem Run aus.** **Nachtrag:** Der zu dieser Planung laufende Run war tatsächlich **`.57`, Commit `3181c8112ec6`**; die damalige Annahme `.58` war falsch und wurde erst durch das Original-ZIP von Run 4 eindeutig geklärt. Bevor später dessen Zip analysiert wird, die im Run-Bericht protokollierte Build-/Git-Basis als **`.58` und nicht 10B-2** interpretieren. Keine Änderungen am Guide `current_test` und kein Erzwingen eines künstlichen Testverlaufs.

**Technische Patchnotes des Implementierers:** `avereth-engine/docs/PATCH10B2_DELIVERY_HANDOVER.md` auf dem Entwicklungsbranch plus kompakte Fortschreibung in `docs/PROTOTYPE_C.md`. Die Notes enthalten exakt: tatsächlich veränderte Dateien/Events; altes Problem mit E14/E28/E32/E37/E39; positive Engine-Nachweisstruktur und Autorisierungsquelle; Semantik direkter vs. conditional `GIVE`; abgegrenzte Legacy-/Savestrategie; echte Rot/Grün-Ergebnisse; vollständige Suite + Smoke; Replay/Host-Nachweise; bekannte Grenzen; Basis-/End-HEAD und Build. **Neuen Build erst für den tatsächlich fertigen Implementierungsstand festsetzen**, nicht beim bloßen Auftrag.

**Unabhängiger Reviewer (nach Implementierungscommit, vor Abnahme des Patches):** Muss anhand **Original-Diff und Tests** ausdrücklich bestätigen oder beanstanden:
1. Kann ein Spieler aus freier Narrator-/Extractor-Aussage einen Nachweis, eine Übergabe oder einen Questabschluss erhalten?
2. Kann eine reine Drop-/Holder-Änderung fern des Ziels bezahlen?
3. Tragen direkte und bedingte `GIVE` tatsächlich Menge, Empfänger, Ort und die freiwillige Autorisierung korrekt?
4. Bleibt die Handelsevidenz `SHOW` vs. `GIVE` geschützt?
5. Entstehen Nachweise bei Replay/Regenerate genau einmal, ohne bereits abgeschlossene Quests zu ändern?
6. Stimmen tatsächlicher Code-Diff, Patchnotes, Red/Green-Nachweise und Testzahlen überein? **Nicht** nur die Notes lesen.
7. Ist die Änderung minimal, oder wurde eine unnötige allgemeine Quest-/Workflow-Engine gebaut? Kritische Alternativen nennen.

**Dokumentation auf `main` nach jedem Meilenstein:** Dieser Abschnitt ist der **vorbereitete Auftrag**, keine Implementierung. Nach regulärem Entwicklungsbranch-Commit und Ersttests die verifizierten Commits/Builds dokumentieren, nach unabhängigem Notes-/Code-Gegenreview dessen Befund und mögliche Nachfixes ergänzen und nach echtem Livetest Run-ID/Gameplaywirkung hier aktualisieren. In 01–04 nur bei echtem grundlegendem Meilenstein Kurzverweis; alte Runs und ZIPs unverändert lassen.

**Strenge Nicht-Ziele:** Kein 10B-3-Kampfstart-/Combat-Truth-/Board-Umbau, kein 10B-4-LLM-Retry, kein Flucht-/Chase-/Monsterdesign, kein neues XP-/Preis-/Skill-/Balancing-System, keine allgemeinen NPC-Home-/Shop-Spawnregeln, keine breite Parser-Neuschreibung. Der damals parallel laufende natürliche **.57**-Test (Run 4) wird weder als Abnahme von 10B-1 `.58` noch von 10B-2 `.59` ausgegeben.

### 14.4 Gegenprüfung des vorhandenen Dokumentationsstands vor Umsetzung

- Der vorherige [10B-1-Dev-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d/avereth-engine/docs/PATCH10B1_FACT_ID_DEPENDENCIES.md) sagt im historischen Implementierungszeitpunkt noch **„Unabhängiges Review und echter Livetest offen“**. Das **Review** ist nach §13.5 inzwischen gemeldet; die **echte Live-Abnahme** ist zu diesem Dokumentationszeitpunkt weiterhin offen. Diese historisch datierte Aussage im ursprünglichen Patchnote nicht ohne klare Nachtragskennzeichnung als falsche Codebeschreibung behandeln.
- Die ursprünglichen .57-Run-Reviews dokumentieren Ursachen und Ereignisse, **keine bereits ausgeführten 10B-2-Tests**. Die obigen D1–D12 sind **geplante** Regressionen.
- Die in §13.6 gemeldete ST-Smoke-Quote für 10B-1 ist **2/3 OK**, nicht „alles grün“. Sie begründet keine pauschale ST-/Provider-Stabilität oder Live-Abnahme.
- **Notes-Gegenprüfung für 10B-2 selbst ist erst nach einem echten Code-/Patchnotes-Commit möglich.** Dieses Auftragsdokument enthält die verbindlichen Prüfkriterien; keine fiktiven Patchnotes/Testergebnisse/Reviewerbestätigungen eintragen.


### 14.5 10B-2 implementiert und selbst getestet – .59, 24.10.2026

**Basis:** `e6c76b4aada6fbb0d2ba18a48a2ed623afa53d7d` / .58. **Produktcommit:** [`fe5cc6d1f57affcf98aec3e68c4bfc4a474626c6`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fe5cc6d1f57affcf98aec3e68c4bfc4a474626c6) / **4.3.0-c.6.6.59**, direkt auf dem bestehenden Entwicklungsbranch gepusht. Ausschließlich 10B-2 durch Codex nach ausdrücklichem Implementierungsauftrag umgesetzt. Noch kein unabhängiges Review und keine echte Live-Abnahme.

**Code und Notes:** [`PATCH10B2_DELIVERY_HANDOVER.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fe5cc6d1f57affcf98aec3e68c4bfc4a474626c6/avereth-engine/docs/PATCH10B2_DELIVERY_HANDOVER.md). Neu `src/v4/delivery.js`; geändert `commands.js`, `world.js`, `guild.js`, `domain.js`, `ownership.js`, `planner.js`, `src/context.js`. Buildangaben in util.js/manifest/package synchron, Kurznotiz in Dev PROTOTYPE_C. Neuer Engine-Event `quest.delivered` und Engine-Zustand `quest.delivery`, kein Extractor-Delta/kein neuer Spielerbefehl. PC-Inventar-Firewall unverändert. Narrator-Kartenvertrag .55 unverändert, nur der dynamische Questkontext wurde angepasst.

**Mechanik:** Positive Mengenbelege nur bei autorisierten realen Übergaben bzw. explizit vereinbarter Ablage; kein Abschluss durch Gildenboden-Drop, reine READY-/Progress-Behauptung oder Chit. Direktes und bedingtes GIVE erhalten Objekt/Menge/Empfänger/Ort, inklusive Sheet-Inventaritems. Nach bestätigter Ankunft benötigt bedingtes GIVE weiterhin den tatsächlich berichteten positiven Transfer; Anwesenheit allein erzwingt keine Annahme durch einen verweigernden NPC. Späteres GO überholt keine offene Übergabe. Mehrere Ziele, unabhängige Sammelware, Splits und Zurücknehmen werden berücksichtigt. READY erst nach relevanten Objektbuchungen; übrige Questarten/Legacy-Timing geschützt.

**Altdaten:** Ruleset 1 und V4-A behalten bisherige Proof-Semantik. Bestehende Events/abgeschlossene Quests bleiben unverändert. Alte aktive Lieferung kann am ursprünglichen Ziel bei wirklichem Warenbesitz des vorgesehenen Empfängers durch eine explizite, aufgelöste Spielerbestätigung belegt werden; keine Rekonstruktion aus ready_note oder Papiernamen. Unvollständige Bestätigung ist atomar und erzeugt keine halben Belege. Unsichere/mehrdeutige Zielreferenzen bleiben offen.

**Selbst ausgeführte Tests:** 27 neue Regressionen D1–D12 samt Gegenfällen, endgültiger Rotlauf auf unveränderten .58-Produktmodulen **6/27 grün, 21 rot**; nach Fix **27/27 grün**. Ursprüngliche GIVE-Kommandos aus Run 1 vor E31 und Run 2 vor E27 mit gefilterten autoritativen Vorzuständen grün; keine alleinigen synthetischen Ersatzverträge. Tatsächlicher Host-Swipe und serialisierter Reload/Fold ohne Doppelkiste oder Beleg; Mengen/mehrere Ziele, SHOW, falsche Empfänger/Orte, fehlende Güter, NPC-Verweigerung, falsche neue Rückgabepflicht und gefälschter Quest-Progress geprüft. Angrenzender V4-/Agency-Lauf auf Zwischenstand **883/883**. Vollständiger Endlauf **npm test 1313/1313 grün**, 0 Fehler; vorherige volle Kontrollläufe 1310, 1311 und 1312 nach zusätzlichen Randfallfunden jeweils grün, erneute Abschlussprüfungen nach den dadurch nötigen Änderungen.

**ST-Smoke ausdrücklich nicht bestanden:** `npm run smoke:st:c` wurde ausgeführt, endet hier mit Exit 1 **vor Host-/Browserstart**: `Error: set AVERETH_ST_DIR to a SillyTavern checkout`. Kein ST-Checkout in dieser Umgebung. Das ist kein erfolgreicher Browser-/GLM-Nachweis; auch der frühere AbortReason-Smoke aus .58 wird dadurch weder wiederholt noch erklärt. Der Smoke muss im vorhandenen lokalen ST-Setup nachgeholt werden. Keine Recovery-/Runneränderung zum Kaschieren des Ergebnisses.

**Nächster Schritt:** unabhängiges Claude-Gegenreview des Commits einschließlich Nachweis-Authority, Inventar, alter Lieferkontrollen und technischer Patchnotes; danach ST-Smoke und Live-Abnahme. Der beim Auftrag lokal laufende natürliche Run wurde später anhand des originalen ZIP als **.57 / 3181c8112ec6 (Run 4)** identifiziert; er ist daher **weder .58- noch .59-Abnahmelauf**. Keine Änderung an current_test/Original-ZIPs/01–04 oder an 10B-3/4, Reise-/Monster-/Chase-/Balanceplanung.


**Dokumentationsnachtrag 10B-2:** Der Entwicklungsbranch endet nach dem reinen Doku-Folgecommit [`5fdbd9f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5fdbd9f065f27f3dbda538ce4e5ebd7917e95759). Er erhält den bestehenden 10B-1-Abschnitt in PROTOTYPE_C zusätzlich zum neuen 10B-2-Eintrag. Produktcode und Build bleiben exakt beim getesteten .59-Commit `fe5cc6d`; keine neue Mechanik oder neue Testbehauptung.


---

## 15. Run 4 – 61 natürliche Spielerversuche auf .57: positiver Langlauf, Quest-Board-Erfindungen und Testspieler-Gedächtnisfehler (24.10.2026)

### 15.1 Originalbefunde, Archiv und korrekte Zeitachse

**[BELEGT anhand Original-ZIP]** Neuer vierter Lauf: [20261024-044642Z-current_test/REVIEW.md](testrun_10b/20261024-044642Z-current_test/REVIEW.md). Hochgeladenes ZIP hier **byteweise analysiert**, 10.186.984 Bytes, SHA-256 `f1ad027ce2722b79e97e4c3978d9252c123abfd7ec47259b41482194a4903b07`, Git-Blob-SHA1 `c848c5fe1437590733e929a82f8908893b0def69`, ZIP-CRC OK. **GitHub-Binärupload der Original-ZIP steht noch aus**; nur Review und README wurden auf `main` erstellt. Kein fiktiver ZIP-Pfad oder Archiv-Erfolgsstatus.

**Entscheidende Nutzerkorrektur:** Die vorherige Dokumentationsannahme, der parallel zur 10B-2-Entwicklung laufende lokale Test sei bereits `.58`, war falsch. **Run 4 stammt eindeutig aus Build 4.3.0-c.6.6.57, Git `3181c8112ec6`, unveränderter lokaler Checkout**, also **vor** der Implementierung von 10B-1 `.58/e6c76b4` und 10B-2 `.59/fe5cc6d`. Die `.59`-Implementation im Remote-Dev-Branch ist durch einen späteren, unabhängigen parallelen Arbeitsvorgang entstanden und wird durch Run 4 **nicht** live bestätigt.

**Realer Umfang:** Freier `current_test` ohne Fixture, 61/100 versuchte Spielerzüge, 60 Story-/Systemantworten, **58 `turn.begun`**; 80:18 min; 877 Engine-Events; 187 Provider-Calls. Alaric Red: Mage, Flame Lance/Arcane Ward, **Level 2**. Drei mechanisch **completed** Gildenaufträge: Ledger Courier, Medicine Delivery, Feral Dog Cull. Belohnungen **40+40+50 cp** und **23+23+23 Quest-XP**; drei echte gewonnene Ein-Gegner-Kämpfe mit **12+12+15 Combat-XP**. Gildenregistrierung T6 20 cp einmalig. Integrität laut Run-Status **OK**, 0 PageErrors; keine 100-Turn-Abnahme.

**Abbruch:** T61 **narrator_empty**, Call **187**, 8.192 Completion-Tokens vollständig verbraucht, **35.577 Zeichen Reasoning, 0 Text**, `finish_reason: length`. Der Runner regeneriert nicht stillschweigend. Davor drei `extract.failed`-Events (E52 früher Schemafehler; E118 und E120 spätere Abort-/Timeoutklasse). 10B-4 mehrfach durch echtes Provider-/ST-Verhalten begründet; kein .58/.59-Fix behauptet.

### 15.2 Wichtigstes neue Kausalbild: Autoritativer Queststatus richtig – sichtbare und erinnerte Chronik falsch

**E41/E54/E80** bestätigen die drei abgeschlossenen Quests mit XP/Geld und Status. Nach dem offiziellen Board E43 werden bei T42 im **Narrator-Text** die inzwischen completed Aufträge Ledger, Medicine und Dog Cull fälschlich erneut als sichtbare Guild-Listings gezeigt (Chat E85). Die beiden folgenden **System-CLARIFY**-Antworten E87/E89 zeigen stattdessen die tatsächlich gültigen noch angebotenen Quests. **Das System schützt korrekt vor einer falschen Annahme; der Narrator hat den offiziellen Aushang erfunden.**

**Unabhängiger, aber verstärkender Runner-Faktor:** Ab T43 erklärt der automatische LLM-Testspieler mehrfach, er habe **nur** den Hundeauftrag angenommen und nie Ledger/Medicine getragen; das widerspricht seinen **eigenen früheren** T8–T27-Aktionen. `driver.mjs:view` beschränkt die Bildschirmhistorie auf die jüngsten zwei Spielerzüge, `players.mjs:notesText` bewahrt nur sechs ausführliche eigene Notizen (ältere nur Milestone-Spannen). Das HUD mit „Quests: —“ nach abgeschlossenen Verträgen wird fälschlich als „nie angenommen“ gedeutet, ebenso das ordnungsgemäß abgegebene Ledger als „nie im Inventar gewesen“. **Der Runner-Testspieler verliert Teile seiner eigenen Langzeitgeschichte; das ist nicht der Beweis eines fehlerhaften Engine-Questfolds.**

**Eskaliertes Rollenspiel:** Der Narrator übernimmt die fehlgehende Spieler-Erinnerung, postuliert daraus einen Doppelgänger/Impostor und behauptet, Verträge seien offen oder nie erfüllt worden. Mehrere `engine_owned_fact`-Deltas werden richtig abgewiesen; zugleich werden frei formulierte **Threads/Memory** dieser objektiv falschen Ausgangsannahme persistiert (E92 ff.). Private Intrigen dürfen grundsätzlich erzählt werden, dürfen aber **nicht** unbewiesen abgeschlossene Engine-Handlungen als ungeklärt oder offizielle Guild-Quests als verfügbar überschreiben. **Priorität 10B-3: narrative, sichtbare Authority**, nicht nur Firewall-Refusal. **Separater Runner-Gedächtniskandidat**: mögliche kleine Erinnerung aus früher sichtbaren eigenen Handlungen/HUD, niemals Engine-State-Injektion; noch kein Implementierungsauftrag, `current_test` unverändert.

### 15.3 Zum Schluss die zweite Fehlerkette: World-Extractor abortiert → Phantomort → Phantomquest → Narrator leer

**E118** T59: `extract.failed` nach ca. 120 s. **E119** T60: Engine bucht den vom Spieler gewünschten **DROP** (small pouch in Sarra-Zimmer) und autorisiert GO zur Gilde; **E120** T60 scheitert Extraktor erneut nach ca. 188,5 s. **Kein gültiges `scene.moved`/Ankunftsevent**. Die Narrator-Antwort T60 schildert dennoch die Ankunft im Gildenhaus und drei vorgelegte **offizielle** Jobs, darunter **„Tally Cellar Vermin“**, ohne passende `quest.created`-/`board.shown`-Buchung. **E121** T61 lehnt die Annahme von „tally cellar vermin“ daher korrekt als „no such contract“ ab; **Call 187** endet leer. Eine narrative Ankunft ist keine autoritative Bewegung; ein GO authorized ist noch kein GO arrived. **10B-3** braucht sichtbaren Vertragsschutz, **10B-4** phasensichere Fehlerdiagnose/Recovery. AbortReason-Ursache nicht ohne Host-/Providerkontrolle festlegen.

### 15.4 Konsequenzen für 10B-2 (.59) – jetzt konkrete unabhängige Gegenreviewfälle

**Positiv auf .57 bewiesen, für .59 zu erhalten:**
- Run 4 E23: direkte Ledger-Übergabe an **npc.npcpriory_brother_herbs**, **E24 READY**, **E41 40 cp/23 XP completed**.
- Run 4 E49: direkte Medicine-Übergabe an **npc.bertho**, **E50 READY**, **E54 40 cp/23 XP completed**.
Die Event-Empfänger sind zu berücksichtigen, nicht die teils abweichende Erzählung über Warden Ambrose. **Keine künstlichen Empfänger-Unterschriften oder neue Lieferprüfwege verlangen**, die beide legitimen Strecken blockieren.

**Negativ auf .57 bewiesen, für .59 nochmals explizit zu prüfen:** Besucher-Tagebuch E103 korrekt vom PC genommen; E111 freiwilliges `GO→GIVE` an Maren bei Rückkehr zum Counter, nur `conditional`; E112 `object.move` **pc_inventory refused**, `cmd.expired`, obwohl Narrator eindeutige Abgabe und Ablage hinter dem Tresen erzählt. Dieses Beispiel **außerhalb einer Guild-DELIVER-Quest** passt zur Scope-Regel „allgemeinen legitimen Give-Pfad reparieren“, nicht zu einer neuen Tagebuch-Sonderregel. Zudem E29/E41 verweigerte courtesy note GIVE wegen nicht eindeutigem/abwesendem Clerk; legitimer Turn-in erfolgt unabhängig.

**Statusdisziplin:** 10B-2 wurde inzwischen laut §14.5 von Codex **implementiert in Build .59** mit gemeldeten **1313/1313 npm-Tests**, aber ST-Smoke mangels Checkout nicht ausgeführt und **unabhängiges Code-/Notes-Gegenreview noch offen**. Die neuen Fälle aus Run 4 sind **Prüfaufträge für dieses Review**, kein Beweis, dass der .59-Code sie schon besteht. Sie sind Gegenbeweise bzw. echte Regressionen aus **.57**, nicht Rot-/Grün-Nachweise auf .58/.59.

### 15.5 Abnahme-, Design- und Prioritätenentscheidung

| Arbeitsbereich | Run-4-Bedeutung | Status |
|---|---|---|
| **10B-1 .58** | Vorheriger .57-Run; T6 Registrierung schon erfolgreich | **Keine .58-Live-Abnahme** |
| **10B-2 .59** | Zwei positive Deliverykontrollen, ein negatives bedingtes GIVE | **Unabhängiges Review und ST-Smoke offen**; Run-4-Fälle gegen .59 gezielt prüfen |
| **10B-3** | Erfundene offizielle Board-Angebote und nicht falsifikationssichere Story-Threads; Spieler sieht falsche Historie | **Prioritärer künftiger Auftrag**, echte Prosa/Katalog-Übereinstimmung testen, private Quests erhalten |
| **10B-4** | Wiederholte Extractor-Abbrüche und final Reasoning-only Narrator-Length | **Prioritärer künftiger Auftrag**; phasensichere, maximal begrenzte Recovery und kein Doppelcommit |
| **Testspieler-Langzeitgedächtnis** | Ab Zug 43 tatsächliche persönliche Questgeschichte vergessen | **Eigenständiger Analyse-/Runnerkandidat**, keine Umstellung des freien Guides und keine Autoritätsrechte für Testspieler |
| **Combat/Balancing** | Drei echte Siege und organischer Levelaufstieg, Schlaf/MP/XP und Loot funktionieren | Keine neuen automatischen Balance- oder Monstermechanikänderungen beschlossen |

**Zusatzbelege:** [ausführlicher Einzelreview](testrun_10b/20261024-044642Z-current_test/REVIEW.md) mit E-/T-Chronologie, Player-Memory-Ursache, D-Regressionen und ZIP-Hash; [Archivindex](testrun_10b/README.md). **Run 4 ist der längste und bislang positivste organische .57-Lauf – zugleich der deutlichste Fall einer aus falsch sichtbaren offiziellen Guild-Angeboten und verlorener LLM-Testspielerchronik erwachsenden falschen Storywelt.** Weder volle 100 Turns noch Abnahme einer späteren Version behaupten. Keine Änderungen an Engine, Runner oder Patch 10B-3/4 durch dieses Review.


---

## 16. Gegenreview zu 10B-2 .59 – Produkt-Diff, Tests, Patchnotes und neuer Run 4 (24.10.2026)

**Stand [UNABHÄNGIGER QUELLCODEGEGENCHECK; TESTAUSFÜHRUNG NICHT SELBST REPRODUZIERT]:** Git-Dev-HEAD `5fdbd9f065f27f3dbda538ce4e5ebd7917e95759` (nachfolgender Doku-Commit), fachlicher Produktcommit [`fe5cc6d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fe5cc6d1f57affcf98aec3e68c4bfc4a474626c6), Build `4.3.0-c.6.6.59`. ChatGPT hat das Commit-Diff, die Produktebenen `delivery.js`/`commands.js`/`world.js`/`guild.js`/`domain.js`/`ownership.js`/`planner.js`, technische [Patchnotes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5fdbd9f065f27f3dbda538ce4e5ebd7917e95759/avereth-engine/docs/PATCH10B2_DELIVERY_HANDOVER.md), `tests/v4/patch10b2.test.js` und ursprüngliche Run-4-Gegenfälle geprüft. **Weder `npm test` noch gezielte `node --test` noch `smoke:st:c` wurden durch ChatGPT in diesem Review ausgeführt.** Nachweise **21/27 rot auf .58, 27/27 grün auf .59, 883/883 angrenzend, 1313/1313 gesamthaft** bleiben implementiererseitige Testergebnisse. Das vom Implementierer ausgewiesene `smoke:st:c` **scheiterte schon vor Hoststart** an fehlendem `AVERETH_ST_DIR`; daraus keine Browserabnahme folgern.

### 16.1 Bestätigte Architektur- und Notes-Übereinstimmung

- Das kleine neue Modul `src/v4/delivery.js` erzeugt über `transferCargo()`/`bookDelivery()` strukturierte `quest.delivered`-Events **nach** einem autorisierten Engine-`object.moved` beziehungsweise dem materialisierten Template-GIVE/-DROP; `domain.js` persistiert Belegschlüssel idempotent. `ownership.js` klassifiziert `quest.delivery` als Engine-owned, und es existiert kein freies Extractor-Delta `quest.delivered`.
- `guild.js:contractReady` verwendet für Ruleset 2/C `deliveryStatus(q)`, also positive objectivebezogene Summen statt bloß `!heldBy(pc)`; die Form `quest.ready` allein ersetzt keinen Beleg. Ein Gildenboden-Drop am anderen Ort erzeugt keinen Lieferbeleg; die Bestandsfirewall wird nicht global entsperrt.
- `commands.js` bewahrt Objekt, Menge und Ziel im bedingten GO→GIVE, `world.js` verlangt Ankunft, NPC-Präsenz und tatsächliches Extraktor-`object.move` und verschiebt Liefer-READY bis nach dem Hand-over/Expected-Take. Spätere GO-Schritte werden während offener GIVE-Bedingung nicht als vollzogen gebucht.
- `tests/v4/patch10b2.test.js` umfasst **27 benannte Tests** für D1–D12, u. a. realen Host-Fold/Swipe, Wiedergabe alter Logs, Failure-/Mengen-/Mixed-Goods- und Run-1/2-Kontrollen. Der als D8 bezeichnete Fixture-Input sind **gefilterte autoritative Vorzustände**, keine tatsächlichen originalen Langläufe auf .59; die Notes beschreiben diese Einschränkung ausdrücklich. Die Notes sind insgesamt sachlich und behaupten weder bestandenen ST-Smoke noch bereits bestandene Live-Abnahme. Dass Run 4 erst nach der Implementierung analysiert wurde, erklärt, warum dessen reale Kontrollen in der Testdatei fehlen.

### 16.2 P1 – Institutioneller Lieferempfänger wird ohne passende Personenrolle nicht erkannt

**[REPRODUZIERBARER CODEPFAD / GEZIELTER ROTTEST STEHT AUS]** Run 4 (echte .57-Events) hatte den Vertrag `Courier the Warden's Sealed Ledger to the Chapel Priory` mit Objective `DELIVER the sealed ledger at the priory at Chapel Hollow` und Zielzustand `delivered unopened to the priory at Chapel Hollow`. Der Spieler übergab das Ledger am **richtigen Ort** direkt an den dort **präsenten Mönch** `npc.npcpriory_brother_herbs` (**E23 object.moved**, später E41 gültige Auszahlung). Zu diesem Zeitpunkt war dessen Name **null**, seine Rolle/Occupation **monk**; der Vertrag nennt weder die Person noch das Wort monk, sondern **die Priorei als institutionellen Empfänger**.

In `delivery.js:deliveryTarget()` ist für jede persönliche Übergabe zusätzlich zum korrekten Zielort erforderlich, dass der Empfänger durch seinen Namen in `o.where + q.desired_end_state` oder eine passende Rollenphrase identifiziert wird; hier ist **weder Personenname noch Rolle im Vertrag vorhanden**. Der naheliegende `.59`-Pfad liefert daher **kein `quest.delivered`**, obwohl die akzeptierte .57-Übergabe korrekt war. Die D8-Tests über Run 1/2 mit einer ausdrücklich genannten Rolle können diese spezielle institutionelle Übergabe nicht belegen.

**Abnahmeanforderung R4-D1:** Exakten realen Run-4-Quellvertrag, Objekt, Ort, Präsenz und originalen GIVE-Befehl als Test-Vorzustand verwenden; erst **rot auf .59** bestätigen. Danach eine **enge** Regel für tatsächlich zulässige anwesende Vertreter eines ausdrücklich bezeichneten institutionellen Lieferziels finden, ohne „irgendeine Person am Ort“ zum Empfänger jeder persönlich adressierten Lieferung zu machen. Kein nachträglicher erfundener Bürokratieschritt und keine auf den Ledger zugeschnittene Fall-ID.

### 16.3 P1 – Ablageberechtigung prüft nicht die konkrete vereinbarte Ablagestelle

**[DIREKTE CODELOGIK, END-TO-END-ROTFALL NOCH AUSSTEHEND]** `deliveryTarget(..., {drop:true})` akzeptiert `to.loc` bereits dann, wenn es **innerhalb** des grob aus `o.where` aufgelösten Zielortes liegt und `q.desired_end_state` **irgendeines** der Wörter `left/deposited/placed/stacked/leave/deposit/place/stack` enthält. Die Prüfung verlangt **keinen Abgleich des tatsächlich vereinbarten Ablagepunkts** wie Tresen, Warenlager oder bestimmte Tür. Der vorhandene D6-Test verändert das Objective sogar auf `where:'Quarry Camp'` und verlangt `left at Quarry Camp`, sodass der einfache Positivfall besteht – er prüft **nicht**, ob „left with the healer at her counter“ durch Ablegen auf beliebigem Boden des Quarry Camps fälschlich erfüllt wird.

**Abnahmeanforderung R4-D2:** Ein Liefervertrag erlaubt Ablage **nur auf einem bestimmten Empfangstresen oder markierten Stellplatz innerhalb des Zielgebiets**; DROP andernorts innerhalb desselben Gebiets muss **keinen** `quest.delivered` erzeugen. Positivkontrolle: ausdrücklich erlaubtes Depot bei tatsächlich erreichtem vereinbartem Punkt funktioniert ohne neue NPC-Quittung. Die Autorisierung ist aus dem bestehenden Vertrag abzuleiten, nicht aus einem einzelnen vagen `left`.

### 16.4 P2 – Provenienzgrenze bei späteren Neuzugängen derselben Template-Item-ID prüfen

**[STATISCH BEGRÜNDETE RISIKOHYPOTHESE; NOCH KEIN NACHGEWIESENER ROTTEST]** `commands.js:objectOf` verwendet für jedes Sheet-Item die wiederkehrende ID `item.<template>`. `delivery.js:cargoProvenance` verwendet diese ID als `origin` und `delivery_capacity` aus aktueller Stackgröße beziehungsweise bereits gespeicherter Kapazität. Werden **ein** Item einer Gildenlieferung zunächst abgegeben, danach weitere Einheiten desselben Templates erworben/gefunden und separat abgegeben, kann die alte `capacity` den Fortschritt fälschlich auf den ursprünglichen Bestand begrenzen. Analoge Ergänzungen mit `object.added` prüfen. Die Tests decken einen gleichzeitigen Zweierstack und Split ab, **nicht** den gezielten zeitversetzten Bestandszuwachs.

**Abnahmeanforderung R4-D3:** Auftrag fordert zwei gleichartige Template-Items; PC besitzt erst eines, liefert es ab, erhält später ein weiteres **rechtmäßig**, liefert dieses ab; beide Lieferungen müssen unterschiedliche reale Einheiten zählen, während die **Rückgabe und nochmalige Ablieferung derselben Einheit** weiterhin keinen doppelten Fortschritt erzeugt. Minimalen Provenienzansatz suchen, nicht pauschal das Anti-Doppelzähl-Gate entfernen.

### 16.5 Run-4-Maren-Tagebuch: Integrations-Gegenprobe offen

**[EVIDENZ AUS .57, NICHT LIVE GEGEN .59 GEPRÜFT]** T55 / E111–112: GO aus Greves Zimmer zur Guild Hall und GIVE des `obj.t102.visitors_day_book` an `Maren` (`to: {new:'Maren'}`), nach narrativer Ankunft `object.move` an `npc.npcguild_clerk_alderwatch`, aber früher `pc_inventory`-Refusal. `.59` verbindet `toName` und vorhandene Namen/Rollen nun eng und kann den echten Clerk treffen. **Allerdings enthält die ursprüngliche Extraktion E112 ein `scene.moved` ohne `scene.entered` für Maren**. Der neue Handler verlangt weiter `s.scene.present.includes(to.entity)` nach bestätigter Ankunft. Deshalb ist nicht nachgewiesen, dass **dieselbe natürliche World-Extractor-Antwort** das Tagebuch unter .59 tatsächlich übertragen hätte. Ein synthetischer D3-Test setzt `enter` ausdrücklich und reicht hier nicht als vollständige E2E-Kontrolle.

**Abnahmeanforderung R4-D4:** Exakten .57-E111-Command plus E112-Extractor-Deltas mit lokaler Präsenz-/NPC-Historie im .59-Code abspielen; erwartetes Ergebnis und ggf. berechtigten Refusal begründen. Falls echte NPC-Präsenz aus der Antwort fehlt, keine Phantom-NPCs erzwingen; stattdessen den schmalsten vorhandenen Kontext-/Extractor-Pfad identifizieren, der eine **tatsächlich gezeigte** Annahme anwesender bekannter NPCs legitim abbildet. Gleichen Test negativ mit wirklich abwesendem, verweigerndem oder anders identifiziertem Empfänger.

### 16.6 Reviewvotum und nächste Schritte

**Bewertung:** Der fachliche **Kern des Patches ist belastbar** und die technischen Notes passen größtenteils zum Code. **Uneingeschränkte technische Freigabe von .59 ist vor den gezielten Gegenproben R4-D1 bis D4 nicht sinnvoll**, vor allem wegen der neuen institutionellen Empfängerkontrolle und der erlaubten Ablagestelle. Es liegen **keine von ChatGPT selbst durchgeführten roten 10B-2-Tests** vor; daher die technischen Randfallanalysen nicht als bewiesene Live-Regressionen ausgeben. Die 1313/1313 Tests laut Implementierer bleiben gültig als dessen Bericht, beweisen aber diese konkreten neuen Randfälle nicht.

**Empfehlung:** Nach diesem unabhängigen Gegenreview einen **kleinen, zusammengehörigen 10B-2-Folgefix** mit gezielten Red/Green-Regressionen auf `.59` ausführen (nur nach freigegebenem Implementierungsauftrag), **ohne** die 10B-3-/4-Scopes oder das freie `current_test` zu verändern. Danach unabhängigen Diff-/Patchnotes-Nachreview und `smoke:st:c` im vorhandenen lokalen ST-Setup; 10B-2-Live-Abnahme anschließend separat. Nur bestätigte Resultate und Commits nachtragen. Root 01–04 unverändert lassen.


---

## 17. 10B-2b – kombinierter Follow-up-Fix aus ChatGPT- und Claude-Gegenreview (.59 → geplanter Build .60; 24.10.2026)

**Ursprünglicher Auftragsstand [HISTORISCH – durch .60-Umsetzung und unabhängigen Review §18 überholt]:** Die Quellcode- und Patchnotes-Prüfung von ChatGPT steht in §16; der Nutzer hat das gesonderte Claude-Gegenreview zu `e6c76b4..5fdbd9f` übermittelt. Beide Reviews erkennen die neue Architektur `quest.delivered`/Engine-Authority als tragfähig an. **Die 1313/1313-Suite stammt aus dem Implementierungsbericht.** Claudes Reviewer hat nach eigenen Angaben Diff/Notes, **nicht** Regressionstestdatei/Fixtures im Detail und keinen echten GLM-Livepfad geprüft. ChatGPT hat Source/Tests gelesen, aber die Tests **nicht** selbst ausgeführt. Der ST-Smoke wurde im Implementierer-Setup **vor Hoststart durch fehlenden ST-Checkout** blockiert. Noch keine technische/live Abnahme von .59 oder .60.

### 17.1 Konsolidierte Entscheidung nach Risiko und Quelle

| ID | Problem | Quelle und Codebefund | Priorität / Vorgehen |
|---|---|---|---|
| **F60-1** | DROP gilt am falschen Platz innerhalb des Zielgebiets, wenn `desired_end_state` nur „left/placed/deposited/stacked“ sagt | **Beide Reviews; `delivery.js:deliveryTarget(drop)`** verwendet grobes Gebiet + Verb, keinen belegten konkreten Ablagepunkt. | **P1: gezielter Fix mit Rot-/Grüntest** |
| **F60-2** | Ganze Quest-Detail-Note wegen unabhängiger Begriffe „must … back“/„empty …“ verworfen | **Claude; `world.js quest.detail`** scannt gesamte Note mit zwei globalen Worttests. | **P1: gezielter klauselscharfer Fix**, `stripOwned(...extra)` wo passend |
| **F60-3** | Erfolgreiche Übergabe an Priorei als Institution (Mönch am Ort) wird durch exakte Namens-/Rollenbindung möglicherweise nicht anerkannt | **ChatGPT, .57-Run 4 E23/E41; `deliveryTarget`**. `where` ist Priorei/Chapel Hollow, tatsächlicher Empfänger Mönch dort; Vertrag nennt keine namentliche Einzelperson. | **P1: originale Regression gegen .59 nachstellen, eng reparieren falls rot** |
| **F60-4** | Physisch unmögliche DELIVERY/GIVE-Objective ohne Frachtobjekt (Nachricht, Warnung, abstrakte Leistung) bleibt möglicherweise immer `not_delivered` | **Claude**; `guild.js:boardRequest` verlangt laut Prompt echte Waren bei Lieferungen, **`listingSchema` erzwingt die Semantik aber nicht**. Keine belegte konkrete Fehlquest oder Live-Regression. | **P1-Risiko: Board-Generator/Fixture prüfen, deterministischen abstrakt-vs-physisch Test**, kein allgemeiner „kein Objekt ⇒ READY“-Bypass |
| **F60-5** | `cargoMatches` akzeptiert Teilmengen in beide Namensrichtungen, ungekennzeichnete Fremdware könnte ein Objective erfüllen | **Claude; `delivery.js`**. Positive `for_quests`-Tags begrenzen viele Fälle, nicht alle. | **P2/gezielter negativer Rotfall**; nur bei Befund engeres Matching |
| **F60-6** | Später neu erworbene weitere `item.<template>`-Einheiten können an globaler `delivery_capacity` scheitern | **ChatGPT; `objectOf` gibt dieselbe Template-ID zurück**, Provenienz ist damit kein individueller Chargenbezug. | **P2/gezielter Rotfall**, fairer Fortschritt vs. Rücknahme-Dedupe; keine allgemeine Inventarledger-Migration |
| **F60-7** | Run-4-Maren-`GO→GIVE` ohne `scene.entered` in der ursprünglichen Extraktion | **ChatGPT; Run 4 E111/E112, `world.js`**. .59 verlangt tatsächliche `scene.present`-Präsenz. | **Gezielter originaler Integrationstest**, nicht global annehmen, NPC sei automatisch anwesend |
| **F60-8** | Wartender bedingter GIVE sperrt spätere GO-Schritte | **Claude**; bestehender Intent, kann Friktion erzeugen | **Bewusste Semantik; als Live-QoL beobachten**, keine Abschwächung von `needs` |
| **F60-9** | Importzyklus `world.js → commands.js`; Stil von `delivery.js`, Imports und verschobener `finishReady`-Block | **Claude**, technisch kein belegter Laufzeitfehler. | **Nur gefahrloses Formatting/kompakte Notiz**, keine große Umstrukturierung allein aus Stil |
| **F60-10** | C-Kampagnen Ruleset 1: alte FULL-QTY-Split-Eventform wird bei `transferCargo` nicht erneut hergestellt | **Claude**, neue Züge, Replay alter Events unverändert | **Notes ergänzen und schmale Kompatibilitätskontrolle**, nur bei erwiesenem semantischem Fehler Produktcode ändern |

### 17.2 Verbindlicher Folgepatch-Auftrag für den Entwicklungsbranch

**Basis:** `claude/c-planner-prototype-2026-10-02-gpt-c666` auf `5fdbd9f065f27f3dbda538ce4e5ebd7917e95759` (Produkt `fe5cc6d`, Build `4.3.0-c.6.6.59`). Normale direkte Entwicklung/Commit/Push **auf diesem Branch**, kein künstlicher Featurebranch oder lokaler Runner-Stopp. Build **.60 nur bei tatsächlicher funktionaler Implementierung**. Kein 10B-3-/10B-4-Scope.

**Schritt 1 – echte Regressionen gegen die unveränderte .59:** Mindestens die folgenden Fälle schreiben und vor jedem Produktcodefix laufen lassen:
1. Ein Vertrag „crates **left with the clerk**“; der Spieler legt die Kiste am Boden eines beliebigen Raums innerhalb desselben Zielgebiets ab ⇒ **kein** `quest.delivered`, kein READY und keine Auszahlung.
2. Vertrag erlaubt ausdrücklich Depot-/Abstellort, Spieler legt Fracht **wirklich dort** ab ⇒ **ein** Beleg; falsch gelegene Ablage, reine „left“-Formulierung oder unbewiesene Oberfläche ⇒ kein Beleg. Ist eine Counter-Oberfläche nur Erzählerprosa, keine neue allgemeine Möbelpositionsengine hinzufügen: bestehende `GIVE`-Semantik an einen anwesenden Empfänger verwenden oder eine nachweislich vorhandene, eindeutig bezeichnete Place-ID.
3. Quest-Detail „The wagon **must be back by noon**“ und ein anderer sachlicher Satz ⇒ beide bleiben zulässige Storydetails. „Return the **empty crate** to the shop is **required**“ (nicht im ursprünglichen Vertrag) ⇒ nur diese zusätzliche Vertragsanforderung entfernen; die danebenstehenden echten Hinweise erhalten. Keine Wortkombination über unabhängige Teilsätze hinweg als pauschale Ablehnung.
4. **Run-4-originale Priorei**: `Courier the Warden's Sealed Ledger to the Chapel Priory`, `DELIVER the sealed ledger at the priory at Chapel Hollow`, persönliches `GIVE` an den dort anwesenden Mönch `npc.npcpriory_brother_herbs` (E23), spätere Auszahlung (E41). Die tatsächlich etablierte Institution plus der anwesende Vertreter dürfen funktionieren, aber **nicht** jeden beliebigen NPC im Ortsgebiet als Ersatz für einen namentlich genannten Empfänger behandeln.
5. Physisch gegenständlicher `DELIVER sealed ledger` ohne vorhandenes Frachtobjekt ⇒ **nicht** READY. Ausdrücklich nichtphysische Nachricht/Warnung als `GIVE`-/`DELIVER`-Objective ⇒ prüfen, ob es heute gültige Boardfälle gibt und sie ohne Phantomgegenstand vollendbar sind. Board-Prompt/Schema und ggf. validierte Bestandsfixtures beurteilen; eine textbasierte eng definierte nichtphysische Objectiveklasse nur bei wirklicher Notwendigkeit einführen.
6. Falsches gleichartiges, nicht für den Auftrag bestimmtes Objekt „herb crate“ für ein unspezifisches Objective „crate“ ⇒ kein falscher Beleg; bekannte Run-1-/Run-2- und Run-4-Lieferungen bleiben gültig. Wenn das generische Objective selbst mehrdeutig ist, eine für die Engine nachvollziehbare Zuordnung statt Willkür erzwingen.
7. Zwei zeitlich getrennte Zuwächse desselben `item.<template>`, jeweils einmal geliefert ⇒ insgesamt zwei nachgewiesene Einheiten. Rückholung und nochmalige Abgabe derselben Einheit ⇒ **keine** dritte. Analog `object.added` nur, wenn dieselbe Identitätsproblematik tatsächlich reproduzierbar ist.
8. Original Run 4 E111/E112 `GO→GIVE` des Besucher-Tagebuchs an Maren/Clerk ohne explizites `scene.entered`: reale Zustands-/NPC-Präsenz prüfen, nicht erzwingen. Positive Variante mit wahrhaft bestätigter Anwesenheit, negative mit abwesendem/ablehnendem/falschem Clerk. Kein „Narrator sagt Übergabe“ als Ersatz für einen gebuchten Transfer.
9. **Rückwärtskompatibilität:** Run 1/2 Original-Fixtures und neu Run-4 Ledger und Medicine als positive Kontrollfälle; D1–D12, `quest.delivered`-Authority, Legacy/Ruleset 1, Mixed GATHER/DELIVER, Split, Replay, Reload, Host-Swipe, Idempotenz, GO→GIVE→GO und Host-Stale. Alle Zahlungs-/Questregressionen bleiben grün.

**Schritt 2 – schmale Änderungen:** F60-1 und F60-2 zwingend nach belastbaren roten Repros beheben. F60-3/4 als fachliche Korrektur **bei reproduzierter Notwendigkeit**, F60-5/6/7 nur bei nachgewiesenem Fehler; Beleg-Authority niemals durch freien `quest.ready`-Bypass oder globale PC-Inventar-Ausnahme umgehen. Formatiere gezielt geänderte Bereiche so, dass Review möglich ist; nicht `world.js` allein zum „Style Cleanup“ großflächig anfassen. Importzyklus nur umbauen, falls messbar problematisch, sonst dokumentieren.

**Schritt 3 – tatsächlich verifizieren:** Rotlauf **mit konkretem erwarteten Fehlergrund** auf .59 dokumentieren (grüne Kontrollen nicht künstlich rot machen); nach jedem Fix Zieltests grün; angrenzende Suites und komplette `npm test`-Suite; `npm run smoke:st:c` separat mit korrektem ST-Checkout oder wahrheitsgemäßer Fehl-/Blockadeangabe. Keine erfundene rote Testzahl, kein bestandener Smoke bei fehlendem `AVERETH_ST_DIR`. Echter natürlicher `current_test`-Lauf ist eine spätere separate Live-Abnahme.

**Patchnotes:** Eigenständiger technischer **`avereth-engine/docs/PATCH10B2B_DELIVERY_FOLLOWUP.md`** plus kurze Ergänzung in `docs/PROTOTYPE_C.md`. Für **jedes** F60-Item: tatsächlicher Rot-/Grünstatus, Codeentscheidung, neue Teststelle oder bewusst offener Limitationsvermerk. Speziell erklären, wie jetzt institutionelle Empfänger, konkret autorisierte Ablage, nichtphysische Objectives und Chargen/Neuzugänge unterschieden werden. Event-/Save-/Ruleset-Kompatibilität, Testzahlen, Smoke, bekannter Zyklus und GO-Wartefriktion erläutern. **Notes müssen den tatsächlichen Diff wiedergeben**, keine Umsetzung aller Risiken behaupten, wenn nur nachgeprüft wurde.

**Lieferung:** Produkt- und Doku-Commits, neuer Build falls umgesetzt, tatsächliche geänderte Dateien, Rot/Grün pro F60-Fall, volle Suite, Smoke-Umgebung und -Ergebnis, offene Grenzen. Danach ChatGPT/Claude **unabhängiger Diff-/Notes-Nachreview**. Erst dann erneute Live-Abnahme und Freigabe von 10B-3. Nach Umsetzung und Gegenreview §17 auf `main` aktualisieren. **In diesem Dokumentationscommit selbst wurde keine Engine geändert oder Test ausgeführt.**

 
---

## 18. 10B-2b .60 – unabhängiger Produkt-, Regressionstest- und Patchnotes-Gegencheck (24.10.2026)

**Status [CODE/TESTQUELLEN UNABHÄNGIG GELESEN; TESTS NICHT ERNEUT AUSGEFÜHRT]:** Fachlicher Produktcommit [`fc87819162116e3b4df1b616d882a203a07a6fd3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fc87819162116e3b4df1b616d882a203a07a6fd3), Build `4.3.0-c.6.6.60`. Verifizierter Dev-HEAD nach späterem Dokumentationscommit: `e7155d32fc979f3341dc9c0676b9a6ea9c168b1f`. Git-Vergleich `fc87819..e7155d3`: **genau ein weiterer Commit und ausschließlich zwei Dokumentationsdateien** (`docs/PATCH10B2B_DELIVERY_FOLLOWUP.md`, `docs/PROTOTYPE_C.md`); kein abweichender Code zwischen Fachcommit und HEAD. Quelle: echte GitHub-Commit-Diffs, die Module `src/v4/delivery.js`, `commands.js`, `domain.js`, `guild.js`, `world.js`, `tests/v4/patch10b2b.test.js`, die Run-4-Originalzustandsfixtures `10b2b_run4_deliveries.json` und die [technischen Notes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e7155d32fc979f3341dc9c0676b9a6ea9c168b1f/avereth-engine/docs/PATCH10B2B_DELIVERY_FOLLOWUP.md).

**Keine selbst durchgeführten Node-/Browser-/LLM-Läufe:** Implementierer berichtet **25 neue Regressionen (14 rot/11 grün auf .59, 25/25 grün auf .60)**, **27/27 bestehende 10B-2-Tests**, **983/983 angrenzend** und **1338/1338 Vollsuite**. Das ist eine konsistente, aber hier nicht unabhängig reproduzierte Testausführung. ST-C-Smoke **Exit 1, vor Hoststart blockiert** (kein ST-Checkout/`AVERETH_ST_DIR`), nicht als „bestanden“ kennzeichnen.

### 18.1 Code-/Notes-Gegencheck je Themenblock

| IDs | Unabhängiger Befund aus Produkt- und Testquellcode | Einordnung |
|---|---|---|
| **F60-1** | `dropTarget` verlangt nun exakte etablierte `Place`-ID, ausdrückliche Depotsemantik, keinen `with the clerk`-Fall und kein unbewiesenes Möbel aus Prosa. Tests prüfen falschen Raum, richtigen Receiving Shed und allgemeines `left with`. | **Kernursache gezielt behoben**; nicht jedes natürlich formulierte zulässige „auf den Tresen“ ist modelliert, bewusste Begrenzung. |
| **F60-2** | `world.js quest.detail` verwendet `stripOwned(...extra)`; andere Klauseln bleiben, die gefundene unerlaubte Container-Rückgabe wird entfernt. Die Regex `additionalContainerReturn` erfasst **nicht alle gleichbedeutenden Imperative** (siehe §18.2). | **Ursprüngliche Ganznotiz-Verwerfung behoben**, aber **konkrete Restlücke** vor uneingeschränkter Freigabe. |
| **F60-3** | Enger Priorei-Institutionsfall mit religiösem Empfänger und expliziten Vorrangregeln für namentlich bezeichnete Empfänger; echte Run-4-Daten E23/E49 verwendet. Der E23-Test **entfernt `needs`** und testet bewusst nur den direkten bereits gebuchten Transfer; `GO→GIVE` aus dem originalen Zug wird nicht vollständig nachgestellt. | **Direkte Zustellung belegt durch Testquelle**, vollständiger Originalablauf **nicht** reproduziert; Notes legen Grenze offen. |
| **F60-4** | `nonphysicalDelivery` plus enges Board-Validation-Gate für C/Ruleset 2: explizite verbale Botschaften werden zurückgewiesen, schriftliche/physische Fracht und TALK bleiben; **kein** READY-Bypass. | **Konservativer Schutz**, keine generelle semantische LLM-Klassifikation. |
| **F60-5** | `cargoMatches` verhindert ungebundene generische „crate“-Zuordnung zu „herb crate“, respektiert Fremd- und bestehende `for_quests`-Bindungen. | **Nachvollziehbarer enger Matcher**; bewusst keine allgemeine Bedeutungserkennung. |
| **F60-6** | `transferTemplate` materialisiert Sheet-GIVE/DROP mit eigener ID je wirklich abgegebener Menge; `object.added` erweitert belegte reale Kapazität. Tests decken zwei neue gleichartige Sheet-Einheiten, Re-GIVE, zwei Aktionen im selben Turn und JSON-Replay ab. | **Im Code und gezielten Tests abgedeckt**; keine zweite Inventardatenbank, kein neuer Eventtyp. |
| **F60-7** | Das originale E111/E112 enthält kein bestätigtes `enter`/NPC-Präsenz für Maren; Inventartransfer bleibt korrekt verweigert. Ein synthetisch um echte `arrive` + `enter` ergänzter Kontrolltest ergibt erfolgreichen Transfer. | **Bewusst offen; kein Phantom-NPC**. Echtes Zusammenspiel von Narrator/Extractor/Präsenz muss im Livetest beobachtet werden. |
| **F60-8 bis F60-10** | `waitingGive` verhindert spätere ungeprüfte GO-Schritte; Importzyklus wird nicht umgebaut; Formatierung lesbarer; Ruleset-1-Semantik samt Replay getestet. | **Akzeptierte Grenzen**, keine nachgewiesenen neuen Codeblocker daraus. |

### 18.2 Neuer konkret prüfbarer Randfall zu F60-2 (Regex-Restlücke)

**[STATISCH REPRODUZIERT – NOCH KEIN ROTTEST IM REPOSITORY]:** Die im Produktcode verwendeten Regexe `returnObject` und `objectReturned` wurden mit typischen englischen Formulierungen abgeglichen:

- `The empty crate must be brought back to the shop.` → als zusätzliche Rückgabepflicht **erkannt**.
- `The courier must return the empty crate.` → **erkannt**.
- `You must bring back the empty crate to the shop.` → **nicht erkannt**.
- `The crate must go back to the shop.` → **nicht erkannt**.

Bei einem ursprünglichen Delivery-Vertrag ohne Behälterrückgabe kann also die **gleichwertige unzulässige Zusatzpflicht** „You must bring back the empty crate“ als `quest.detailed`-Storyhinweis durchgehen. `stripOwned` filtert in diesem Fall weder Engine-Status noch Belohnung/Mechanik und `additionalContainerReturn` antwortet false. **Das behebt den ursprünglichen Verlust der ganzen Note nicht rückgängig, lässt aber dieselbe Spielerreibung erneut durch eine andere Formulierung entstehen.** Der Fehler wurde anhand der tatsächlichen Code-Regexe nachvollzogen; keine Behauptung über einen beobachteten Run oder einen schon vorhandenen .60-Rottest.

**Empfehlung:** Vor Abnahme zwei kleine Red/Green-Gegenproben für diese natürlichsprachlichen Varianten ergänzen und die **bestehende** klauselscharfe `additionalContainerReturn`-Prüfung minimal erweitern. Negative Kontrollfälle wie „The wagon must be back by noon“ und eine tatsächlich **im ursprünglichen Vertrag vereinbarte** Rückgabe müssen grün bleiben. **Keine** neue Regelmaschine, keine pauschale „must/back“-Sperre, keine Änderung an 10B-3/4; keine Buildnummer vor tatsächlichem Fix behaupten.

### 18.3 Dokumentationsgenauigkeit, Grenzen und Entscheidung

Die `.60`-Patchnotes benennen alle F60-1–10 mit Änderungsstellen, Teststand, Smoke-Blockade, Run-4-Fixture-Einschränkung und bisherigen Verhaltensgrenzen. Der Dokumentationscommit `e7155d3` berührt **nur** technische Notes und `PROTOTYPE_C.md`. Wesentliche Aussagen stimmen mit dem tatsächlichen Diff überein. Einschränkungen **nicht** wegformulieren: F60-3 ist kein vollständiger E23→E24-End-to-End-Erfolg, der Run-4-Maren-Fall wurde **nicht** künstlich als positive Live-Übergabe umgebucht; die echte Original-ZIP von Run 4 wurde weiterhin **nicht als in `main` archviert bestätigt**.

**Votum:** **Technischer Kern von 10B-2b nachvollziehbar und deutlich verbessert; keine breite zweite Lieferreparatur nötig.** Für **uneingeschränkte Freigabe** die kleine F60-2-Restlücke testgetrieben nachziehen, danach aktuelles Diff/Notes erneut prüfen. Vollständige Suite und ST-C-Smoke im vorhandenen lokalen ST-Setup ausführen beziehungsweise Fehlläufe ehrlich einordnen. **Echte `.60`-Live-Abnahme steht aus**. Vorher **keinen** Run 3/4 als Beleg für `.60` ausgeben (beide liefen auf `.57`). Die neue Engine-Stabilität erlaubt nicht, aus dem nicht gelaufenen ST-Smoke auf Browserstabilität zu schließen. 10B-3/4 bleiben nicht begonnen; bei späterem Übergang die offenen Narrative-/Extractor-Fehler separat behandeln.


---

## 19. 10B-4a – kleiner Planner-Leerantwort-Fix durch ChatGPT (Build .61, 24.10.2026)

**Status [QUELLCODE UND REGRESSIONSTESTS COMMITTED; LOKALE AUSFÜHRUNG NOCH OFFEN]:** Der Nutzer wollte trotz ausgeschöpfter Claude-/Codex-Kontingente einen technisch schmaleren Teilpatch direkt von ChatGPT implementieren lassen. Gewählt wurde **nur die leere Planner-Recovery** aus 10B-4 (Run 3 T21 mit zweimal 2.000/2.000 Completion-Tokens im Reasoning und 0 JSON-Text), da diese Phase im bestehenden `src/v4/runtime.js` und in scripted Node-Tests weitgehend abgeschlossen bearbeitet werden kann. Kein kompletter 10B-4-Host- oder Narrator-Retry und keine Änderungen am 10B-3-Combat-/Guild-Authority-Scope.

**Basis:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, vorher HEAD `e7155d3`, Build `4.3.0-c.6.6.60`. Der gezielte neue Test ist in `tests/v4/patch10b4a_planner_empty.test.js` (7 Fälle) committed; die Implementierung in `src/v4/runtime.js`, Version in `src/util.js`, `manifest.json` und `package.json` auf **`4.3.0-c.6.6.61`** erhöht, dazu `docs/PATCH10B4A_PLANNER_EMPTY_RECOVERY.md` und `docs/PROTOTYPE_C.md`. Detaillierte [technische Patchnotes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4A_PLANNER_EMPTY_RECOVERY.md).

**Was technisch geändert wurde:** Bisher ein `plan`-Aufruf, bei Parserfehler ein `plan_repair`-Aufruf, beide normalerweise mit 2.000 Tokens. **Nur falls beide erfolgreich transportierten Antworten leer/Whitespace sind und kein gültiges JSON vorliegt**, folgt genau **ein** frischer `plan_recovery`-Aufruf mit ursprünglichem Player-Prompt/Catalog/Recent (ohne leere Assistant-Beiträge) und einem einmalig erhöhten `maxTokens: 4000`. Der resultierende Text durchläuft denselben `parsePlan`-Validator; keine automatisch erzeugten `commands: []`, kein neu erfundener Spielerzug und kein zusätzlicher Engine-Commit allein wegen eines LLM-Retry. Bei drittem Fehler wie bisher abbrechen; keine vierte Anfrage. Provider-Fehler beim Erstaufruf oder normale nichtleere, aber ungültige Reparaturen behalten ihre bisherigen Pfade. Der Host prüft weiterhin `isCurrent` vor dem Commit und reused gespeicherte valide Interpretationen auf Swipe/Regenerate.

**Neue Testfälle – Quelltext vorhanden, noch keine Ergebniszahlen:** Drittversuch nach zwei `finish_reason=length`/leer, begrenzter Dreifachfehler, normale Reparatur ohne Mehrbudget, ungültiges nichtleeres JSON ohne Extra-Versuch, Providerfehler ohne Retry-Schleife, Host-Erfolg mit Regenerate ohne neue Planner-Aufrufe/Events, Host-Fehler ohne `events`. **Kein Rot-/Grünlauf auf .60/.61 behauptet.**

**Prüflücke:** GitHub-Connector konnte die Textdateien aktualisieren und Git-Refs prüfen; ein vollständiger lokaler Repository-Checkout ist in dieser Implementierungsumgebung nicht verfügbar (direkter Git-Clone scheitert wegen fehlender Netzwerk-DNS-Auflösung). Daher **weder `node --test tests/v4/patch10b4a_planner_empty.test.js` noch `npm test` noch `npm run smoke:st:c` hier ausgeführt**. Ein eigener Runtime-Quelltextvergleich wurde durchgeführt, ist aber kein Ersatz für Tests. Bevor dieser Patch als technisch grün oder live abgenommen markiert wird, im vollständigen Checkout die drei Kommandos in `avereth-engine/` ausführen und Ergebnisse/Nachfixes nachtragen; insbesondere maxToken-Parameter am realen ST-Providerpfad, keine Doppelbuchung und die Regenerate-Funktion prüfen.

**Nicht-Ziele und Risiko:** Das zusätzliche Modellbudget von 4.000 Tokens kann einen reasoning-lastigen Planner weiterhin nicht retten und verursacht im Fehlerfall eine dritte Provideranfrage mit zusätzlicher Latenz/Kosten. **10B-4b** muss sich später um leere Narratorantworten unter echten ST-Host-Grenzen und Extractor-Abbrüche kümmern. **10B-3** (Drohung/Angriff, Kampf-/Memory-Truth, offizielle Guild-Boards) bleibt unangetastet. **F60-2-Regex-Restlücke in .60/.61** ist weiterhin unabhängig offen. Kein künstliches Runner-Fixture und keine Veränderung des natürlichen `current_test`-Guides.

**Nächster Schritt:** Alle neuen 10B-4a-Zieltests und `npm test` laufen lassen, `smoke:st:c` im vorhandenen lokalen ST-Setup, anschließend kurzes unabhängiges Review von Diff und Testlogs; erst dann nächstes größeres Teilpaket auswählen. Das vorläufige Commit auf GitHub ist **kein** Nachweis für einen bestandenen echten Run.


### 19.1 Unabhängiger Testbericht und reine Assertion-Korrektur (24.10.2026)

**[BERICHTET VOM UNABHÄNGIGEN PRÜFER – NICHT CHATGPT-SELBSTLAUF]** Nach der .61-Implementierung auf `41ba3eab` wurden die sieben neuen Fälle **gegen unverändertes .60 mit 3/7 grün (4 rot)**, danach **gegen .61 mit 6/7 grün (1 rot)** geprüft. Die komplette .61-`npm test`-Suite meldete **1344/1345 grün**. `npm run smoke:st:c` konnte wegen fehlendem ST-Checkout/`AVERETH_ST_DIR` **vor Hoststart** nicht durchlaufen.

**Einzige gefundene Ursache des .61-Fehlschlags:** Die Zieltest-Assertion `assert.match(result.error, /no JSON|no valid|empty|invalid/i)` lässt den vom Validator korrekt ausgegebenen Text **`report is not valid JSON`** nicht zu. Drei leere Planner-Antworten wurden dagegen korrekt auf genau drei Aufrufe begrenzt, Engine-Events nicht gebucht. In [Testkorrektur `75017d0`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/75017d0db0f494e6baeae703781d1f46081f1503) wurde **nur diese eine Assertion** auf `/not valid JSON/i` geändert, keine Produktfunktion. Der Regex wurde gegen den tatsächlich berichteten Parsertext kontrolliert, **die Node-Suite nicht erneut durch ChatGPT gestartet**.

**Weitere positive Gegenprüfungen des unabhängigen Reviewers:** Echte Warteaktion **zehn Minuten** nach Recovery, anschließend Regenerate: Zeit und Events genau einmal gebucht; ungültige Recovery-Antwort, Transportfehler des Repairs und Whitespace-Content geprüft. Keine konkrete Engine-Regressionsursache beanstandet. **Die neue LLM-Anfrage mit maximal 4.000 Tokens kann weiterhin vollständig durch Reasoning verbraucht werden**; dies ist nur eine begrenzte zweite Chance nach Normal/Repair, keine garantierte Lösung.

**Erforderlicher Abschluss:** Nach dem Assertion-Fix erneut `node --test tests/v4/patch10b4a_planner_empty.test.js` und `npm test` im echten Checkout ausführen und die **wirklich gemessenen** Zahlen nachtragen; danach `npm run smoke:st:c` mit lokaler ST-Installation, Smoke-Resultat gesondert. **Nicht jetzt einfach 7/7 oder 1345/1345 als gemessen schreiben.** Entwicklungs-Build bleibt `.61`; kein zusätzlicher Patch-/Build-Sprung für die Testregex. Produktfix und Dokumentation: `avereth-engine/docs/PATCH10B4A_PLANNER_EMPTY_RECOVERY.md`. Noch keine natürliche .61-Live-Abnahme. Die übrigen 10B-3-/4-Komponenten und F60-2-Restlücke bleiben unabhängig offen.


### 19.2 Windows-Lokallauf und CRLF-Korrektur nach 10B-4a (24.10.2026)

**[LOKALER NUTZERLAUF – ORIGINAL-KONSOLENFEHLER AUSGEWERTET]:** Die sieben 10B-4a-Zieltests sind nach der Assertion-Korrektur **7/7 grün**. Die vollständige Windows-Testsuite lieferte **1346 Tests, 1341 grün, 5 rot, 0 übersprungen**, Laufzeit **19,200.8349 ms**. Der Nutzer kann ST-Smoke in seiner lokalen Umgebung nicht durchführen; keine Smoke-Abnahme behaupten.

**Alle fünf verbleibenden Fehler haben dieselbe OS-Umgebungsursache:** Der Narrator-Vertrag wurde lokal mit Windows-CRLF gelesen, die Tests erwarten LF. Konkret: tests/unit/content.test.js:42–45 (LF-JSON gegen CRLF-Datei), tests/v4/c663.test.js:198–201 (gesuchter Ausschnitt nach QUEST FRICTION + LF ist leer), tests/v4/fixes_4_1_5.test.js:206–208 (Revision hat angehängtes CR), tests/v4/planner_c2.test.js:401–408 (Überschrift/Revision mit CR) und tests/v4/planner_c6.test.js:492–498 (Revision mit CR). **Kein neuer Planner- oder Enginefehler aus diesen fünf Ergebnissen ableitbar.**

**Gezielter Git-Fix:** [d14bb86](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d14bb86a0bb3bb0801df4c8cae75401ee1132fe1) korrigiert die Tests zur CRLF→LF-Normalisierung beim Narrator-Vertragslesen und ergänzt Root-.gitattributes für LF auf zukünftigen Checkouts. Es wurde **keine** Engine-, Runner-, Inhalts- oder Builddatei geändert; **Build bleibt .61**. [Technische Patchnotes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4A_PLANNER_EMPTY_RECOVERY.md) auf dem Entwicklungsbranch sind um die fünf Windowsfälle ergänzt.

**Lokaler Abschluss 10B-4a:** Der Nutzer hat nach dem CRLF-Fix ausdrücklich bestätigt: **alle 1346/1346 Tests grün**. Die vorhergehenden 7/7 Planner-Zieltests waren bereits grün. ST-Smoke kann der Nutzer lokal mangels Einrichtung nicht durchführen. Das ist ein echter bestätigter **lokaler npm-Testabschluss von .61**, aber noch **keine ST-/GLM-Live-Abnahme**. Danach wurde unabhängig der nächste Runner-Teilpatch 10B-4b begonnen (Details §20).


---

## 20. 10B-4b – Fehlerphasen im automatischen lokalen Livetest-Runner (24.10.2026)

**Status [QUELLCODE UND 12 REGRESSIONSTESTS COMMITTED – NEUE TESTS NOCH NICHT AUSGEFÜHRT]:** Nach unabhängig bestätigtem lokalem **1346/1346 npm test** für Build `.61` (einschließlich korrigierter Windows-CRLF-Tests) übernimmt ChatGPT den nächsten technisch kleinen Teil von 10B-4. **Nur der lokale automatische Test-Runner** wird verändert; die eigentliche Extension-/Engine-Version bleibt `4.3.0-c.6.6.61` und sämtliche Gameplay-Module, Narrator, Extractor, LLM-Provider und `current_test`-Guide bleiben unverändert. Der Spielcode erhält damit **keinen** versteckten neuen Retry oder neuen Weltzustand.

**Grund:** Wenn ein Planner-LLM keine gültige Ausgabe liefert und SillyTavern keine Assistenzantwort erstellt, kann der Browser-Driver mit „no reply after the message“ melden; zuvor endete der Runner allgemein als `ui`, statt den bereits gebuchten Plannerfehler zu nennen. Wenn der Narrator zwar Text lieferte, aber danach der World-Extractor nicht persistieren konnte, lief der Test trotz faktisch nicht angekommenem Spieler weiter (Run 4: Phantom-Guild, Phantomboard, später erneuter Ausfall). Diese Fälle müssen **für den diagnostischen 100-Züge-Test** genau zugeordnet werden, statt die eigentliche Fehlerursache durch Folgezüge zu verschleiern.

**Implementierte Änderungen:**
1. `tools/st_live/live/evaluator.mjs`: Rein lesende `turnFailure(chat, u)`-Diagnose erkennt `planner_failed`, `interpreter_failed`, `extractor_failed`, `extractor_late`, `narrator_empty` sowie das echte `missing` ohne Phase. Die alte `turnOutcome()` bleibt unverändert, damit vorhandene Auswertungen und der Spielerbildschirm gleich bleiben. `failureEnd` erzeugt den prüfbaren Abbruchgrund für die Auswertung.
2. `tools/st_live/live/run_live.mjs`: Stoppt einen **Testlauf** nach bestätigtem Extractor-Fehler oder -Verspätung, statt weiter nach einer bloß erzählten, ungebuchten Ortsbewegung zu spielen. Eine `no reply after the message`-Fehlermeldung des Browser-Drivers wird durch den gespeicherten User-Record auf einen wirklichen Planner-/Interpreterfehler zurückgeführt; alle anderen echten UI-Fehler bleiben `ui`. Screenshots und originale Chat-/Event-/LLM-Daten bleiben als Beweismittel. **Weder Swipe noch Regenerate noch zusätzliche Modellanfrage**.
3. `tests/live_runner/patch10b4b_failure_classification.test.js`: **12 neue scripted Unit-Tests** für die Phasen, Vorrang der leeren Narratorantwort, korrekten Turnbezug, gewöhnliche Story/Systemantworten und den exakt erwarteten Runner-Endgrund. Grundlage ist kein synthetischer Fortschritt des `current_test`, sondern isolierte Klassifikationsbeweise.

**Technische Notes:** [PATCH10B4B_RUNNER_FAILURE_CLASSIFICATION.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4B_RUNNER_FAILURE_CLASSIFICATION.md) im Entwicklungsbranch mit Dateien, Zweck, Grenzen und den beiden lokalen Testkommandos.

**Bewusste Auswirkung:** Ein automatischer Test endet **früher**, sobald ein echter Extractor-Ausfall festgestellt wird. Das ist Absicht, weil weitere Spielerentscheidungen sonst auf nicht gespeicherten Orts-/NPC-/Questinformationen aufbauen könnten. Ein laufendes reales menschliches Spiel wird nicht geändert. Der Runner darf einen Extractor-Abbruch **nicht** als geheilt bezeichnen; die Fortsetzungs-/Recovery-Mechanik gehört zu einem **späteren separaten 10B-4-Teilpatch**. Narrator-Recovery, 10B-3-Bedrohung/Kampf/Guild-Authority und Testspieler-Gedächtnis ebenfalls nicht hier implementieren.

**Neue Verifikationsgrenze:** Die 12 neuen Zieltests und die aktuelle komplette Suite konnten in dieser ChatGPT-Umgebung **nicht** ausgeführt werden (kein vollständiger Git-Checkout, GitHub-DNS im Container nicht auflösbar). Vorherige Nutzerzahl **1346/1346** war der **Stand vor 10B-4b**. Die neue erwartete Testgesamtzahl wäre unter unveränderter restlicher Suite **1358**, ist aber **keine gemessene 1358/1358-Abnahme**. Lokal nach Pull im `avereth-engine`-Ordner ausführen: `node --test tests/live_runner/patch10b4b_failure_classification.test.js`; dann `npm test`. ST-Smoke mangels lokaler ST-Installation weiterhin nicht als erfolgreich behaupten. Unabhängiges Review/echter natürlicher Run später; nach Testlog tatsächliche Zahlen nachtragen.


### 20.1 10B-4b.1 – abgestufter Extractor-Stopp, Timeout und Planner-Phasenfix (24.10.2026)

**Ausgangslage und unabhängiges Claude-Gegenreview:** Der unabhängige Reviewer hat gegen `99195f0` die **12/12** neuen 10B-4b-Tests und `npm test` **1358/1358** mit null Ausfällen / Überspringen selbst ausgeführt. Er hat `evaluator.mjs`, `run_live.mjs`, die Tests, `runtime.js` und `driver.mjs` gegenprüft; **keinen Produktfehler** gefunden. Der Driver wartet tatsächlich, bis `extraction !== 'pending'`. Es gab jedoch eine **Gameplay-/Testdesign-Entscheidung**: Alle failed Extractions stoppten selbst harmlose Dialogturns, wodurch natürliche 100-Züge-Beobachtungen vorschnell enden konnten. Zusätzlich blieb ein echter `pending`-Timeout als `ui` gekennzeichnet und der Planner-Indikator prüfte fälschlich die bloße Existenz eines `plan`-Objekts.

**Entscheidung der Projektführung:** Ein Extractor-`failed` ist im lokalen **automatisierten Testlauf** nur dann **soft**, wenn der Original-Engine-Record positiv und eindeutig belegt: Planner-Kommandos **explizit []**, keine `expected_keys`, nur `turn.begun`/`cmd.interpreted`/`outcome.recorded`, genau ein V4-Outcome mit `NOTHING TO BOOK` und ohne reale `resolutions`/`conditionals`/`booked`. Dann zeigt `turnsLog.outcome` **`extractor_failed_soft`** und der Test beobachtet weitere Spielerentscheidungen; `evaluation.issues`, Originalchat und Engine-`FAILED_CORRECTION` behalten den Fehler. Bei **GO, GIVE, TAKE, ATTACK, Questveränderung, erwarteten Welt-Commit-Schritten oder uneindeutigen/älteren Records** bleibt der **harte Abbruch**. Ein nichtgebuchter Ortswechsel wird weiterhin nicht als Erfolg behandelt. Die Soft-Regel behauptet keine persistierte Dialog-/NPC-Memory bei gescheiterter Extraction; sie ist ausdrücklich **Runner-Diagnostik**, keine Engine-Heilung.

**Weitere Fixes im selben eng begrenzten Runner-Patch:**
- `driverFailure` erkennt `extractor_timeout` nur wenn der Driver einen Turn-Timeout wegen `extraction pending` meldet **und** der Original-Antwortrecord noch `status:pending` hat. Eine wirklich fertig extrahierte Antwort oder normale UI-Störung bleibt außerhalb dieses Pfades.
- `planner_failed` setzt `plan.failed === true` voraus. Bei einem existierenden, aber erfolgreichen `plan`-Objekt plus `interp.failed === true` heißt es folgerichtig `interpreter_failed`.
- Der Runner benennt die Screenshot-Dateien auch beim Driver-Abbruch nach der belegten Ursache statt pauschal `problem`; ein fehlgeschlagener Chat-Nachcheck erhält eine kurze Diagnosezeile statt stillem Catch.
- `extractor_late` wird im ursprünglichen Runnerpfad wegen seiner Entstehung durch `closeLatePending` erst beim folgenden Playerturn **praktisch nicht beobachtet**; die synthetische Regression ist korrekt, kein echter Livetestbeleg.

**Änderungsumfang:** Nur `tools/st_live/live/evaluator.mjs`, `run_live.mjs`, eine neue Datei `tests/live_runner/patch10b4b1_failure_policy.test.js` mit **12 gezielten Regressionen** sowie [technische Patchnotes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4B1_RUNNER_FAILURE_POLICY.md). **Engine, Content, `current_test`, ST-Prompt, Host, LLM, Quest/Kampf und Version `.61` unverändert.** Kein zusätzlicher Modell- oder Tokenverbrauch im Spiel.

**Verifikationsgrenze:** Die unabhängigen **1358/1358** gelten für den Ausgangsstand `99195f0`; die neuen 12 Tests und die veränderten Runnerzweige konnten im GitHub-Connector-Kontext **nicht** selbst ausgeführt werden. Nach Pull lokal `node --test tests/live_runner/patch10b4b1_failure_policy.test.js`, dann `npm test`; erwartet sind **12/12** für 4b.1 und insgesamt **1370 Tests**, ohne die Zahl als schon gemessen zu melden. ST-Smoke nicht vorhanden / nicht gelaufen, echter neuer Langlauf separat. Danach unabhängige Review-Gegenprüfung; vor dem nächsten 10B-4-Produktfix eigentliche Narrator-/Extractor-Recovery neu abgrenzen.


---

## 21. 10B-4c.1 – erste produktive Extractor-Recovery, eng begrenzt (Build .62, 24.10.2026)

**Entscheidung und Stand:** Der Nutzer hat die zwölf 10B-4b.1-Zieltests und die gesamte Vorher-Suite **1370/1370 als lokal grün bestätigt**. Die verbleibende **Extractor-Recovery wird bewusst in zwei Teile geteilt**: (1) nur der bereits laufende Extraction-Call erhält ein eng begrenztes Retry, (2) etwaige Wiederaufnahme nach Host-Reload/Absturz als eigenständige spätere Architektur-/Integrationseinheit. Kein großer neuer Wiederherstellungsautomat, keine Narrator-Recovery, keine 10B-3-Arbeiten.

**Produktpatch auf Entwicklungsbranch:** Basis `9f2d808` / Build `.61`; neue Version **`4.3.0-c.6.6.62`** in `src/util.js`, `manifest.json`, `package.json`. Produktänderung **nur `src/v4/runtime.js:runExtraction`**. Die bisherigen Routinen `extractionRequest`, `parseExtraction` und `applyExtraction` mitsamt Firewalls, Hash/Swipe- und `laterTurns`-Gates bleiben unverändert. [Detaillierte technische Notes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C1_EXTRACTOR_RECOVERY.md).

**Konkrete Cases:**

- **Transportabbruch oder `null` im ersten Extraktoraufruf**: Anders als bisher nicht unmittelbar `extract.failed`; genau **ein** frischer `extract_recovery`-Versuch auf derselben bereits belegten Anfrage, normaler `maxTokens=4000`. Der erfolgte Originalaufruf bleibt in `extraction.llm` als Error sichtbar. Bei fehlender/ungültiger erneuter Antwort sicherer bisheriger Fehlerstatus.
- **Erste Antwort und die gewöhnliche Repair beide leer/Whitespace**: Genau **ein dritter** frischer `extract_recovery`-Versuch bei `maxTokens=6000` (die ersten beiden bleiben je 4000). Identischer Narrator-Text, Spielerinput, CATALOG, `expected_keys` und Schema; kein leeres Assistant-JSON erfunden, kein zweites Playerturn. Spätestens danach Fail-Closed.
- **Normalfall**: Ein valider vollständiger Erstbericht = ein Aufruf, bestehende JSON-/Teilantwort-Repair = maximal zwei. **Keine** zusätzliche dritte Anfrage nach zwei **nichtleeren** ungültigen Berichten. Die bisherige sichere Behandlung eines validen, aber unvollständigen Berichts bleibt erhalten. Eine `extract_recovery` wird ausschließlich während desselben noch `pending` befindlichen Reporterturns versucht, niemals nach einer bereits endgültig `failed`/angewendeten Extraktion.
- **Validierung**: Auch die neue Antwort muss die vorhandene `parseExtraction` mit `expected_keys` und vollständiger Schema-Gültigkeit bestehen; `applyExtraction` bucht die Ereignisse nur bei aktueller Narrator-Version, `pending` und keinem später begonnenen Playerturn. Kein Aufheben der Autoritätsgrenzen und keine nachträgliche Phantomankunft.

**Tests geschrieben, aber noch NICHT ausgeführt:** Neue `tests/v4/patch10b4c1_extractor_recovery.test.js` mit **11 Szenarien** (zweimal Transportfehler/Erfolg, Fehlerbegrenzung, normale Repair, zweimal leer und drittes Mal Erfolg, dreimal leer/Fail, nonempty-invalid, spätes Edit/Swipe, späterer Playerturn, kein Doppel-Commit). Zwei alte Tests `tests/v4/patch81.test.js` und `patch82.test.js` aktualisiert, weil diese bisher zwei Aufrufe auch bei **zwei leeren** Antworten erwarteten. Erwartete Zahl **1381/1381** erst bei erfolgreichem lokalem Lauf; Grundlage **1370/1370** war Nutzerangabe **vor** diesem Patch. **Es wurden weder `node --test` noch `npm test` noch ein echter ST-Smoke in dieser ChatGPT-Implementierungsumgebung ausgeführt**; GitHub-Connector und separate Containerlaufzeit stellen keinen vollständigen ausführbaren Check-out bereit.

**Testkommandos:** Nach Pull im Entwicklungsbranch aus `avereth-engine/`: `node --test tests/v4/patch10b4c1_extractor_recovery.test.js`; dann `npm test`. ST-Smoke braucht weiter eine eingerichtete SillyTavern-Installation und wird nicht als erfolgreich deklariert. Die Scripts dürfen den bestehenden `current_test`-Guide nicht in synthetische mechanische Fortsetzung verwandeln.

**Noch getrennt offen:** echte ST-/GLM-Provider-Abnahme; Host-Wechsel, Replay und verwaiste `pending`-Jobs nach Abbruch/Reload; Narrator-Leerantwort-Recovery. Keine Aussage, dass schon alle Provider-/Hostausfälle gelöst sind. Code-Diff und Source-Tests vor lokaler Grünmeldung nachprüfen; danach entschieden vorgehen. 10B-3 bleibt offen.


### 21.1 10B-4c.1a – unabhängiger .62-Rottest, Testannahme und unnötige Retries (24.10.2026)

**[UNABHÄNGIGER TESTLAUF DURCH REVIEWER, NOCH KEIN BESTÄTIGTER NACHFIX-LAUF]:** Auf .62-Commit `4dd8a62` meldet das unabhängige Gegenreview **10/11 neue Zieltests grün, 1 rot (Test 10)** und **1380/1381 `npm test` grün, 0 übersprungen**. Kein Produktfehler in `runExtraction` gefunden. Roter Test `a following player turn prevents a late recovery commit` erzeugte eine **rohe spätere User-Nachricht ohne Engine-Events**, erwartete aber `late: true`. Die echte Implementierung `src/host.js:laterTurns(chat,id)` prüft zu Recht nur **spätere gebuchte Engine-Events**; ein ungeprüfter Playertext unterläuft die normale ST-`pendingWorld.job`-Barriere nicht. Daher war `changed: true` in diesem künstlichen Testfall **korrektes Verhalten**, nicht ein falscher Weltcommit.

**Korrigierte Regression:** Test 10 erhält nun für den simulierten späteren Enginezug explizit `setRec(later, {events:[{t:'turn.begun', …}]})`; dann ist `laterTurns` tatsächlich wahr. Eine neue **positive Gegenprobe** lässt eine nur angehängte, noch nicht gebuchte User-Nachricht bestehen: Die Extraktion **darf** in diesem Fall noch normal abgeschlossen werden. Keine Änderung an `laterTurns` oder an der ST-Host-Barriere.

**Kleiner fachlich begründeter Produktfix:** Vor **jedem zusätzlichen LLM-Aufruf** in `src/v4/runtime.js:runExtraction` (normaler `extract_repair`, Transport-`extract_recovery`, dritter Leerantwort-`extract_recovery`) prüft eine neue `current()`-Funktion, dass der ursprüngliche Reply noch am Index existiert, `extraction.status='pending'` hat, sowohl gespeicherter `text_hash` als auch aktuelle `hash32(mes)` dem ursprünglichen `req.hash` entsprechen und kein späterer Engine-gebuchter Zug existiert. Veraltete Extraktionen werden **vor** dem kostspieligen Retry beendet, ggf. mit `late:true` nur beim wirklich gebuchten Folgeturn. Der abschließende `applyExtraction`-Schutz bleibt bestehen. Die Korrektur erfordert keine zusätzlichen State-Felder, keine Änderung an `src/host.js` und **keine höhere Buildnummer**: weiter **.62**, noch nicht abgenommen.

**Testumfang:** Bisher 11 neue `.62`-Fälle, dazu **5 weitere Regressionen** (Edit/Swipe vor Transport-Retry, Edit vor normalem Repair, Edit vor drittem Leerantwortversuch, echt gebuchter Folgezug vor Recovery, positiver ungeprüfter Usertext). Zieltests jetzt **16 insgesamt**, erwartete Vollsuite **1386**. Diese **16/16 und 1386/1386 sind NOCH NICHT LOKAL GELAUFEN**; gemessen sind ausschließlich die **10/11 und 1380/1381 vom Stand vor der Korrektur**.

**Unverändert dokumentierte Review-Grenzen:** Längere Host-Barriere durch maximal 2 Transport-/3 Leerantwort-Aufrufe (`extraction.ms`, `extraction.llm`, `waited` im lokalen Run beobachten); `maxTokens:6000` muss gegen echten GLM-Endpunkt geprüft werden. `repaired=true` bezeichnet derzeit auch den Transport-Retry; `llm[].purpose` trennt die Typen ohne neue Save-Felder. Erste leere Antwort plus fehlgeschlagener Repair-Transport bekommt absichtlich keinen dritten Versuch. Ein **bloßer Wechsel des aktiven Chats** ist in `runExtraction(chat,id)` ohne Host-Chat-ID nicht erkennbar; echte Chatwechsel-/Reload-Cancellation ist weiterhin Gegenstand von **10B-4c.2**. Auch der Narrator-Retry und 10B-3 bleiben unangetastet.

**Neue technische Notes:** [`PATCH10B4C1_EXTRACTOR_RECOVERY.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C1_EXTRACTOR_RECOVERY.md), Abschnitt „Independent .62 review and narrow 10B-4c.1a correction“. **Nächste lokale Messung:** `node --test tests/v4/patch10b4c1_extractor_recovery.test.js` und `npm test` auf dem aktuellen Entwicklungsbranch. Nicht die frühe Testzahl 1381 für die korrigierte Suite verwenden. Bis zu diesen Ergebnissen keine technische `.62`-Freigabe und **10B-4c.2 nicht beginnen**.


---

## 22. 10B-4c.2 – Host-Lifecycle, Chatwechsel und Wiederaufnahme gespeicherter Extraktionen (Build .63; 24.10.2026)

**[CODE IMPLEMENTIERT; NEUE TESTS UND ST-LIVETEST NOCH NICHT AUSGEFÜHRT]** Ausgangspunkt: unabhängig bestätigte **16/16 neuen 10B-4c.1-Tests und 1386/1386 vollständige Node-Suite** auf Build `.62`; anschließend neue Implementierung **`4.3.0-c.6.6.63`** auf dem Entwicklungsbranch. Eine große automatische Retransaktion bereits als `failed` archivierter Weltänderungen ist **nicht** Ziel. Der sichere zweite Extractor-Schritt konzentriert sich auf **laufende/persistierte `pending`-Auswertungen** beim Browser-Reload, Chatwechsel, identischen Chat-ID-Reentry, Swipe und Edit.

### 22.1 Geprüftes ursprüngliches Host-Risiko

Vor 4c.2 startete `index.js:startWorld` über `runExtraction(now().chat, id, ...)` ohne während des Jobs unveränderlich festgehaltene Chat-Referenz. Beim Wechsel konnte ein alter Provideraufruf gegen einen später aktuellen Chat (gleicher numerischer Message-Index) weiterarbeiten; der persistierte `pending`-Status ohne vorhandenes `pendingWorld.job` wurde nach Browser-Reload zwar über `resumeReport` bei Chat-Events teilweise wiederaufgenommen, die nächste Spieleraktion wartete aber nur dann auf eine Extraktion, wenn bereits ein passender Job im Speicher vorhanden war. Das war für Ghost-Travel und falsche spätere Narrative/Engine-Zuordnung ein echtes Host-Integrationsrisiko. Die vorhandenen `applyExtraction`-Hash-/Status-/`laterTurns`-Grenzen sind gut, reichen ohne Chat-/Swipe-Identitätsvergleich des Hosts allein jedoch nicht für denselben Index in unterschiedlichen Chatkontexten.

### 22.2 Umgesetztes Produktverhalten

1. **Neue `src/v4/world_jobs.js`**: Kleiner, über Dependency Injection testbarer World-Job-Manager. Der Job hält `chatId`, **originären Chat-Array-Ref**, Nachrichtenindex, Nachrichtenobjektidentität, aktive `swipe_id`, gespeicherten `text_hash` und einen eigenen `AbortController`. `start` dedupliziert parallele oder doppelte Host-Ereignisse für denselben aktiven Reply. `invalidate` cancelt beim Verlassen/Swipen/Editieren/Löschen. Ein veralteter Job darf nach einem Wechsel weder Recovery-Anfragen fortsetzen noch Anzeige oder Chat speichern. `currentJob/currentId` ermöglichen dem Generator, die aktuelle Extraktion einschließlich **laufendem asynchronen Save** abzuwarten.
2. **`src/v4/runtime.js:runExtraction`**: Optionaler Host-Prädikatsparameter `isCurrent`. Check **vor dem ersten Aufruf**, bei allen zusätzlichen Schema-Reparaturen/`extract_recovery`-Anfragen (zusätzlich zu bestehenden `.62`-Text-/Turn-Gates) und unmittelbar **vor dem finalen `applyExtraction`**. Keine Änderung an `parseExtraction`, `replyTurnV4`, Firewall, erwarteten Feldern, State-Schema oder Regelmechaniken.
3. **`index.js`**: Die originale Chat-Referenz wird vor async-Operationen gebunden. `startWorld` nutzt den Manager statt dynamischem `ctx().chat`. `CHAT_CHANGED`, `MESSAGE_SWIPED`, `MESSAGE_DELETED`, `MESSAGE_EDITED` stoppen veraltete Jobs; die gültige gespeicherte `pending`-Extraktion wird auf dem aktiven Chat ggf. wieder aufgenommen. `resumeReport()` zusätzlich beim vollständigen Extension-Init. Der normale Interceptor startet nach Reload einen noch fehlenden World-Job **vor** der nächsten Spieler-Engine-Auflösung und wartet darauf auch nach Statuswechsel `pending`→`applied` **bis zum Ende des Save-Vorgangs**. `onMessageReceived` startet nach verzögertem Save keinen Job im falschen Chat.
4. **Provider-Abbruch:** Bei Custom/OpenAI-kompatibler Providerroute wird das Lifecycle-`AbortSignal` an den internen `fetch`-`AbortController` weitergereicht. Der normale Request-Timeout bleibt. Bei ST-`generateRaw` ist ein aktiver Provideraufruf von hier nicht zuverlässig abbrechbar: Das Ergebnis wird durch den Host-Prädikatscheck verworfen, kann aber noch Netzwerk-/Modellzeit kosten. Aus dieser Grenze kein falsches „alle LLM-Calls sofort gestoppt“ ableiten.
5. **Version** `.63` in `src/util.js`, `manifest.json`, `package.json`. Keine neue Spielzustandseigenschaft, keine Quest-/Kampfregel oder Runner-Änderung. **Keine automatische Neubuchung endgültig fehlgeschlagener Extractor-Calls**.

### 22.3 Testpaket und offene Abnahme

Neue Datei `tests/v4/patch10b4c2_world_jobs.test.js` mit **14 Regressionen** zu: Dedup bei doppeltem Hoststart; Wechsel A→B; gleicher Chat-ID-Reentry; Swipe mit identischem Text; Edit/Objektreplacement; Deletion/Abort; erneute Aufnahme von echtem gespeicherten `pending`; Save-Barrier trotz zwischenzeitlichem `applied`-Status; Providerfehler; reale `runExtraction`-Schranke nach Chatwechsel und bei bereits gültigem, aber verspätetem Report; roher/nicht-gebuchter Playertext; reale Chatwechsel-/Return-Resume-Integration mit **genau einem** `extract.applied`; hartes Abweisen eines späteren Engine-gebuchten Turn.

**[NOCH NICHT AUSGEFÜHRT]** Erwartete Zieltests **14/14** und insgesamt **1400/1400** (Vorher: echte bestätigte 1386; 14 neue Tests). Die ChatGPT-GitHub-Implementierungsumgebung kann den vollständigen Checkout nicht in Node ausführen. Nach Pull auf dem Entwicklungsbranch aus `avereth-engine/`: `node --test tests/v4/patch10b4c2_world_jobs.test.js` und `npm test`. Erwartung nicht als gemessene Freigabe ausgeben.

**Dokumentation:** [`docs/PATCH10B4C2_HOST_LIFECYCLE_RECOVERY.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C2_HOST_LIFECYCLE_RECOVERY.md).

**Weitere Grenzen:** Ein echter ST-/GLM-Provider-/Browser-Smokelauf wurde noch nicht durchgeführt. Besonders im echten Host gegenprüfen: Chatwechsel mitten in einem langsamen Extractor-Aufruf, Reload eines gespeicherten `pending`-Replies, zwei gleichzeitig ausgelöste `MESSAGE_RECEIVED`-Events, Swipe/Away-and-back, Save-Barrier. Ein ohnehin laufender `generateRaw`-Request kann trotz korrektem Discard Provider-Ressourcen binden. Die automatische Wiederholung bereits gespeicherter `failed`-Reports bleibt absichtlich **ausgeschlossen**. Als nächster größerer Recovery-Schritt bleibt **10B-4d (leere Narrator-Antwort im echten ST-Generation-Lifecycle)** gesondert abzugrenzen. **10B-3** und F60-2-Restlücke weiter offen.


---

## 23. 10B-4c.3 – Recovery-Ursache, Null-Ergebnisse und Runner-Beobachtung (Build .64, 24.10.2026)

**Entscheidungsgrundlage:** Der Nutzer meldet das unabhängige Gegenreview zu .63: **14/14 Host-Lifecycle-Zieltests** und die komplette **1400/1400 Node-Suite** grün (0 übersprungen). Das unabhängige Review las sämtliche 10B-4a/b/4b.1/c.1/c.2-Diffs und fand keine konkret falsche Weltbuchung. Wichtigstes verbleibendes Beobachtungsrisiko vor dem echten Langlauf: Ein Planner kann nach Recovery gültiges `{"commands":[]}` liefern, obwohl eine Spielerhandlung geplant war; ein Extractor kann nach Recovery `{"expected":{},"deltas":[]}` liefern, obwohl ein Narrator neue Tatsachen, NPCs, Geschenke, einen Überfall oder eine nicht über `go` erwartete Ortsänderung erzählte. Das ist **nicht automatisch falsch**, darf aber nicht in der Testanalyse unsichtbar bleiben.

**Umgesetzt auf Entwicklungsbranch, neue Version `4.3.0-c.6.6.64`:**
1. **Player-Record:** `src/v4/runtime.js:planMessage` setzt `recovery:'empty'` nur, wenn der begrenzte dritte Planner-Aufruf nach zwei transportierten Leerantworten tatsächlich erfolgte; `plannedTurn` übernimmt dieses Feld nach `plan.recovery`, auch bei fehlgeschlagener Recovery und dem vorhandenen Regenerate-/Reuse-Pfad. Die normale JSON-Reparatur und der gewöhnliche Erstaufruf bekommen **kein** Recovery-Feld. Planner-Transportretry existiert **noch nicht**: `'transport'` ist als zukünftiger Typ reserviert.
2. **Reply-Record:** `runExtraction` setzt `recovery:'transport'` bei tatsächlichem zweitem Versuch nach Transportfehler/null, `recovery:'empty'` bei tatsächlichem drittem Versuch nach zwei vollständig leeren LLM-Antworten. Das bestehende `applyExtraction` persistiert die Herkunft **sowohl bei `applied` als auch bei `failed`**. Die Firewalls, erwarteten Schlüssel, `laterTurns`, Host-`isCurrent`, Budget- und Aufrufgrenzen bleiben unangetastet. Das alte `repaired` bleibt als historisch mehrdeutiges Kompatibilitätsfeld bestehen; `recovery` liefert die neue explizite Ursache.
3. **Auswertung:** `tools/st_live/live/evaluator.mjs` stellt `recoveryObservation(chat,u)` und `recoverySummary(chat)` bereit, integriert `counts.recovery.planner/extractor` in `evaluate`, verknüpft `turns[].recovery` mit dem einzelnen Zug und schreibt `planner_recovery[_zero_commands]` bzw. `extractor_recovery[_zero_deltas]` in `issues`. Ein `zeroCommands` ist nur bei **nicht fehlgeschlagener** Planner-Recovery mit expliziten `commands:[]` wahr; `zeroDeltas` nur bei `extraction.status='applied'` mit exakt `deltas:0`. **Gescheiterte Recovery-Versuche werden als Versuche gezählt, nicht als erfolgreiche Nullresultate.**
4. **Runnerbericht:** `tools/st_live/live/report.mjs` ergänzt `report.md` um eine kompakte Zusammenfassung der Anzahl von Planner-/Extractor-Recoveries nach Typ und der Null-Ergebnisse. Null-Ergebnisse sind **gezielte Review-Kandidaten**, keine automatischen Spielfehler oder Gründe, den Langlauf abzubrechen. Runner-Stopppolitik `extractor_failed_soft` bleibt unverändert.

**Keine weiteren Modellaufrufe durch diesen Patch:** Weder Planner-/Extractor-Retry-Policy noch Tokenlimits, Chat-/Swipe-Abbruch, Narrator, Quests, Combat, Spieleraktionen oder Mechanikschema werden geändert. Die Daten bleiben kompatibel mit älteren Spielständen ohne `recovery`-Feld.

**Neue Zieltests, noch nicht lokal gelaufen:** `tests/v4/patch10b4c3_recovery_observability.test.js` mit **12 Tests** zu normaler Reparatur vs. Recovery, erfolgreicher und gescheiterter Recovery, Planner-/Extractor-Persistenz, rein beobachtenden Null-Fällen, tatsächlicher `evaluate`-Integration, Abgrenzung zu Alt-Records und korrekter Zuordnung bei System-Panels. **Vorher lokal bestätigt 1400/1400 (.63); erwartet 1412/1412 (.64), aber noch NICHT gemessen.** Zum Nachholen aus `avereth-engine/`: `node --test tests/v4/patch10b4c3_recovery_observability.test.js` und `npm test`. Eine erfolgreiche Node-Suite **ersetzt keine echte ST-/GLM-Live-Abnahme**.

**Technische Notes:** [`docs/PATCH10B4C3_RECOVERY_OBSERVABILITY.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C3_RECOVERY_OBSERVABILITY.md).

**Absichtlich separat:** Planner-Transportretry nach initialem Transportfehler (möglicherweise risikoarm, aber eine zusätzliche Provideraktion), breiteres Host-Edit-`invalidate()` nur nach tatsächlicher ST-Semantik eingrenzen, echten SillyTavern-`current_test`-Lauf inklusive Chatwechsel/Reload ausführen und danach erst **10B-4d Narrator-Recovery** per sicherer Swipe-/Regenerate-Semantik prüfen. Eine offene F60-2-Text-Regex-Lücke und **10B-3** bleiben ebenfalls auf der längerfristigen Roadmap. **Kein echter ST-/GLM-Smoke in dieser ChatGPT-Umgebung durchgeführt.**


---

## 24. 10B-4c.4 – erneute unabhängige Bewertung des gesamten Claude-Reviews und gezielter Nachtrag (Build .65, 24.10.2026)

**Nachweisstand:** Nutzer bestätigt **alle 12/12 gezielten .64-Recovery-Beobachtungstests sowie `npm test` 1412/1412 grün**. Das ist eine echte lokale Prüfung des Vorher-Stands `.64`. Die neue .65-Änderung ist **committed, aber noch NICHT lokal gemessen**. Das vorliegende Claude-Gegenreview aller 10B-4a/b/b.1/c.1/c.2-Änderungen wurde nochmals unabhängig anhand des tatsächlichen Entwicklungsbranch-HEAD `2e9c177`, der vier Projektdokumente und der Runtime-/Host-/Runner-Implementierung bewertet. Es wird nicht allein aufgrund seiner Plausibilität übernommen: Unterschied zwischen reparaturbedürftigem Quellcode, diagnostischem Spielrisiko, konservativ gewählter Policy und nicht bewiesener ST-Host-Integration ist in den nachfolgenden Entscheidungen ausdrücklich dokumentiert.

### 24.1 Umgesetzte Verbesserungen

1. **Planner-Transportfehler – begrenzt wiederholen.** Der bisherige `planMessage`-Pfad brach beim ersten Provider-/Transportfehler oder `null` sofort ab. Der neue `plan_recovery`-Aufruf wiederholt **höchstens einmal dieselben Planner-Nachrichten** mit dem normalen **2000-Token-Budget**. Sein Ergebnis durchläuft unverändert `parsePlan`; wenn die zweite Antwort ungültig oder erneut fehlgeschlagen ist, bricht der Zug ohne Spielaktion sicher ab. **Kein zusätzlicher dritter Repair auf dem Transportpfad**, daher maximal zwei Modellaufrufe. Die bisherigen Grenzwerte normal 1, JSON-Reparatur 2 und zwei leere Antworten 3 mit 4000 Tokens als letztem Versuch bleiben. Bei durch Provider-/Transportfehler tatsächlicher Recovery wird das in .64 eingeführte `plan.recovery:'transport'` gesetzt, auch im Fehlerfall. `repaired` bleibt als kompatibles Mehrfachaufruf-Signal.
2. **Kein veralteter Planner-Zusatzaufruf.** Der bestehende `prepareGenerationAsync`-Guard `current()` wird als optionale `isCurrent`-Funktion über `plannedTurn` bis `planMessage` geleitet; vor **jedem** Zusatzaufruf (Transport-Retry, normaler Repair, Empty-Recovery) darf ein geänderter/geswipter Chat oder eine neue Generation nicht weiter befragt werden. Der frühere abschließende Engine-Commit-/History-/Input-Guard bleibt verbindlich und unverändert.
3. **Extractor-Timeout ohne fragile Driver-Textbindung.** `tools/st_live/live/driver.mjs:send()` liefert beim Zugtimeout den schon durch `probe()` erhobenen `extraction`-Status **zusätzlich** zum historischen String `problem`. `run_live.mjs` übergibt den strukturierten Wert an `driverFailure`, die nur bei tatsächlich gemeldetem Zug-Timeout und einem weiterhin `pending` gebliebenen echten Reply ein `extractor_timeout` liefert. Für alte Aufrufer ohne strukturiertes Feld bleibt der bisherige Regex-Fallback erhalten; wird strukturiert ausdrücklich `applied` gemeldet, darf der Text-Fallback keinen falschen Pending-Timeout vortäuschen. **Kein Änderung des Browser-Timeouts oder der Engine.**
4. **„Soft“ ist kein Vollständigkeitsbeweis.** Der Live-`report.md` weist die Anzahl `extractor_failed_soft`-Züge nun separat aus. Trotz ausdrücklichen `interp.commands:[]` kann der Narrator bei einem Dialog neue NPCs, Geschenke, Überraschungsangriffe oder Weltfakten erzeugen, die wegen failed Extraction nicht gespeichert wurden. Die fortgesetzte Beobachtung über 100 Züge wird deshalb **nicht** als Aussage über vollständig erhaltene Weltfakten dargestellt. Das bisherige Stop-/Weiterspielverhalten wird **nicht** umgestellt.

**Versionsnummer:** `4.3.0-c.6.6.65` in `src/util.js`, `manifest.json`, `package.json`. Neue `tests/v4/patch10b4c4_review_followups.test.js` mit **9 Tests**; ein Altfall aus `patch10b4a_planner_empty.test.js` wurde wegen der absichtlich geänderten Transport-Retry-Policy aktualisiert. Erwartet sind nach neuem Pull **9/9** und **1421/1421** Gesamt, **noch keine nachgewiesenen Ergebnisse**. Aus `avereth-engine/`: `node --test tests/v4/patch10b4c4_review_followups.test.js`, danach `npm test`. ST-Smoke/Provider-Recovery weiterhin nicht in dieser Umgebung ausgeführt.

### 24.2 Bewusst nicht verändert – Begründungen

- **Planner `{"commands":[]}` nach Recovery:** Null Commands sind auch für echte Dialog-/Warteaktionen vorgesehen. Die Anweisung zu verbieten würde eher erzwungene, halluzinierte Spieleraktionen auslösen. Seit .64 ist `zeroCommands` ausdrücklich als **zu kontrollierender Output** sichtbar.
- **Extractor `"deltas":[]` nach Recovery:** Ein künstlicher Mindestdelta-Zwang führt zu erfundenen Weltänderungen; `expected_keys` bleiben verbindliche mechanische Lückenmarker und `.64` zählt erfolgreiche Null-Deltas als verdächtige Beobachtung. **Keine automatische Aussage, dass ein Narrator tatsächlich keine Fakten erzeugte.**
- **Bei jedem Edit abbrechen (4c.2):** Bewusst konservativ belassen. Auch ältere Nachrichten können für die LLM-Weltinterpretation relevant sein; eine bloße Relation `editedId < worldJob.id-1` beweist nicht, dass ihre Bearbeitung harmlos ist. Ein vermiedener zusätzlicher Provider-Aufruf darf nicht zu einer falsch gebuchten Welt-Historie führen. Nach echtem ST-Live-Test gegebenenfalls gezielt optimieren.
- **Vergleich der Chat-Array-Identität:** Der Reviewer vermutet, dass ST Chat-Arrays bei Wechseln in-place wiederbefüllt. Das wurde **nicht am echten Host verifiziert**. Der Schutz ist bewusst redundant: `chatId`, Nachrichtenobjekt, `swipe_id`, Text-Hash, `laterTurns` und Job-Invalidierung sind zusätzliche Schranken. Array-Identität allein ist nicht als Sicherheitsgarantie zu werten; echte Wechseltests bleiben Pflicht.
- **`extractor_late`:** Im normalen Runner wegen der prioren `pending`-Wartebarriere kaum beobachtbar; korrekter historisch/synthetischer Diagnosefall wird nicht künstlich in Runtime/Driver ausgelöst.
- **GLM-Ausgabelimit `maxTokens:6000` und sehr lange Barriere:** Modell- und Endpoint-Limit bzw. echte Wartezeit sind **nicht aus Node-Tests ableitbar**. ST-/GLM-Lauf mit `extraction.ms`, `extraction.llm[]` und `perf.wait_ms` auswerten; bis dahin keine Schätzungen als gemessene Providergrenzen. Die echte Host-Wartebarriere nicht ungeprüft abschneiden.
- **Sichtbarer Wartehinweis / Umbenennung `resumeReport`:** UI-/Wartbarkeitsoptionen ohne aktuellen Sicherheitsdefekt. Neues Toast-/Overlay kann normale ST-Generierung/Runner-Screenshots stören. `resumeReport` behandelt derzeit V3-Report und V4-Pending; reine Umbenennung jetzt kein sinnvoller Patch.
- **Automatische Narrator-Regeneration (10B-4d):** Nicht gleichzeitig implementieren. Erst die echten ST-Hostregeln für Swipe/Regenerate und laufende Provider-Requests prüfen; die Engine darf keinen neuen Playerturn buchen oder zeitlich versetzte Antworten committen.
- **Soft-Extractor-Verhalten:** Der Nutzer will natürliche 100-Zug-Beobachtung. Weiterlaufen ist eine **bewusste diagnostische Abwägung**, keine Garantie der Weltpersistenz. Der Fehler und die Korrekturhinweise bleiben erhalten, ab .65 zusätzlich im Bericht gezählt.

**Vollständige technische und entscheidungsbezogene Liste:** [`docs/PATCH10B4C4_INDEPENDENT_REVIEW_DECISIONS.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C4_INDEPENDENT_REVIEW_DECISIONS.md). **Nächste Reihenfolge:** lokal .65-Zieltests/Vollsuite ausführen; bei grün gezielten echten `current_test` inkl. Chatwechsel/Reload, Token-/Latency-/Nullrecovery-Telemetrie; 10B-4d erst nach Hostbeleg. **10B-3** und F60-2-Restlücke unverändert offen.


### 24.3 .65-Lokallauf: 9/9 grün, eine überholte Telemetrie-Assertion behoben (24.10.2026)

**Tatsächlich vom Nutzer ausgeführt, vor Nachfix:** 10B-4c.4-Zieltests **9/9 grün**, vollständiges `npm test` **1420/1421 grün**. Einziger Fehler: alter `tests/v4/patch82.test.js`-Fall **„8.2 telemetry 6“** erwartete bei einem primären Planner-Transportfehler nur `['plan']`. Die ausdrücklich eingeführte `.65`-Recovery führt korrekt `['plan', 'plan_recovery']` aus. Der zweite Call scheitert im Fixture ebenfalls, somit bleibt der Zug abgebrochen, `interp.failed` wahr und `events=[]`. Kein Defekt oder verändertes Verhalten im Produktcode notwendig.

**Reine Testkorrektur:** [Commit `59f2b0b`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f2b0bfb4dfa8b2880bb751bf640f3f2d1b0645) korrigiert genau die obsolete Call-Liste und ergänzt Assertions für `plan.recovery='transport'` und `plan.repaired=true`. Ursprüngliche Assertions für sicheren Abort, `perf.wait_ms=0` und keine gebuchten Events bleiben erhalten. **Build bleibt .65**, keine Produktdatei geändert. Entwickler-Notes im Entwicklungsbranch aktualisiert.

**Weiter offene Abnahme:** Nach Pull `node --test tests/v4/patch82.test.js`, dann `npm test` erneut laufen lassen. **1421/1421 wird nur erwartet und ist noch nicht nach Korrektur gemessen.** Neue 9/9 Zieltests bereits bestätigt. ST-/GLM-Live-/Browser-Abnahme unverändert offen.


---

## 25. Konsolidierte Übergabe an Sol vor dem nächsten großen Patch (24.10.2026)

**[CODE- UND DOKUMENTATIONS-AUDIT, NEUER ECHTER RUN NOCH NICHT EINGEGANGEN]** Zweck: alle von Codex und ChatGPT umgesetzten 10B-Korrekturen **in einer vollständigen, testbaren Chronologie** abgleichen, Sol für den nächsten größeren Patch ein verlässliches Diff-/Abnahmeverfahren bereitstellen und ältere datierte Aussagen „noch nicht getestet“ unmissverständlich von den späteren **tatsächlich bestätigten grünen Nutzerläufen** abgrenzen. **Der Nutzer hat `.65` mit `npm test: 1421/1421` grün gemeldet**, nachdem die einzige falsche Alt-Assertion von `patch82.test.js` mit Commit `59f2b0b` angepasst worden war. Die **9 neuen 4c.4-Zieltests** waren zuvor 9/9 grün. Kein erneuter Test in der ChatGPT-GitHub-Connector-Umgebung durchgeführt; kein .65-GLM-/ST-/Host-Livepass behauptet.

**Eigenständiger ausführlicher und direkt prüfbarer Sol-Handoff auf dem Entwicklungsbranch:** [`avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md). Er enthält: Commit-/Build-Landkarte, Modulgrenzen, genaue neue und historische Regressionstests, Retry-Budgets, Host-Lifecycle-/Replay-Gates, unabhängige Claude-Reviewentscheidungen, offene Designrisiken und konkreten Sol-Review-/Implementierungsablauf.

### 25.1 Ergebnis des Abgleichs mit der tatsächlichen Dev-Git-Kette

**Ausgangs-SHA `fd20d0dce0b0fc508b17810872b7933a5f00e994` (.57)** → **geprüfter .65-Code-/Dokumentations-SHA `d182e900c6cb1cd32a945a52afc101590a60462b`**: per GitHub-`compare_commits` **84 Commits, 51 geänderte Dateien** (vor neuen Handoff-Dokumentationscommits). Die lückenlose Commitliste wurde gegen die Patchnotes und den vorhandenen Quellcode gegengeprüft. Beim nächsten Checkout neue SHA/HEAD prüfen; Dokuupdates verändern den HEAD ohne neue Mechanik.

| Paket | Hauptcommit / Endstand | Mechanik oder Runner-Grenze | Stand des Node-Nachweises |
|---|---|---|---|
| **10B-1** .58 | `e6c76b4` | deterministische Fakt-IDs und redundante Gildenregistrierung/Bedürfnisvorgänger | damaliger Vollsuitewert 1287/1287 dokumentiert |
| **10B-2** .59 | `fe5cc6d` | echte autorisierte Übergaben, positive Lieferbelege, kein Holder-/Story-`READY`-Missbrauch | 27 Zieltests; 1313/1313 berichtet |
| **10B-2b** .60 | `fc87819`, `e7155d3` Dokumentationsabschluss | zehn begrenzte Delivery-Folgefixes F60-1–10 (Objektidentität, Ablage, Empfänger, Zweckbindung, Ruleset 1) | 25 neue Zieltests; 1338/1338 berichtet |
| **10B-4a** .61 | `b1c0901` bis `41ba3eab`, Nachfix `75017d0` | Planner leer/leer: dritte Anfrage 4000 Tokens, sonst Abort; Tests Regex korrigiert | später 7/7, Vorläufersuite 1346/1346 lokal bestätigt |
| **10B-4b / b.1** .61 | bis `99195f0` / `9f2d808` | Runner: Planner-/Extractor-/Narrator-Endgründe, `extractor_failed_soft` nur bei belegtem Mechanik-No-op, `extractor_timeout` | 12 + 12 neue Zieltests, 1370/1370 lokal bestätigt |
| **10B-4c.1** .62 | `4dd8a62`, Reviewfix bis `23b8ded` | Extractor Transport-Retry/leer-leer-6000; vor jedem weiteren Call `pending`-/Hash-/`laterTurns`-Gate | 16 zielgerichtete Tests, 1386/1386 lokal bestätigt |
| **10B-4c.2** .63 | `610555c` | neues `world_jobs.js`; Chat/Swipe/Reload/Pending/Save-Barrier; cancel/discard stale Host-Ergebnisse | 14 Zieltests, 1400/1400 lokal bestätigt |
| **10B-4c.3** .64 | `2e9c177` | `plan.recovery` / `extraction.recovery`; 0 Commands/0 Deltas als Beobachtung, nicht Erfüllungsfiktion | 12 Zieltests, 1412/1412 lokal bestätigt |
| **10B-4c.4** .65 | `118c00a`, Testnachfix `59f2b0b`, Code-/Doku-HEAD `d182e90` | einmaliger Planner-Transport-Retry, `isCurrent`-Guard, strukturierter Driver-Timeout und Soft-Fehlerzähler | **9/9 Zieltests, 1421/1421 Vollsuite lokal grün vom Nutzer bestätigt** |

**Quellen-/Testdateien vollständig vorhanden:** Im Entwicklungsbranch `docs/PATCH10B1_FACT_ID_DEPENDENCIES.md`, `PATCH10B2_DELIVERY_HANDOVER.md`, `PATCH10B2B_DELIVERY_FOLLOWUP.md`, `PATCH10B4A_PLANNER_EMPTY_RECOVERY.md`, `PATCH10B4B_RUNNER_FAILURE_CLASSIFICATION.md`, `PATCH10B4B1_RUNNER_FAILURE_POLICY.md`, `PATCH10B4C1_EXTRACTOR_RECOVERY.md`, `PATCH10B4C2_HOST_LIFECYCLE_RECOVERY.md`, `PATCH10B4C3_RECOVERY_OBSERVABILITY.md`, `PATCH10B4C4_INDEPENDENT_REVIEW_DECISIONS.md`. Passende `tests/v4/patch10b1.test.js`, `patch10b2.test.js`, `patch10b2b.test.js`, `patch10b4a_planner_empty.test.js`, `patch10b4c1_extractor_recovery.test.js`, `patch10b4c2_world_jobs.test.js`, `patch10b4c3_recovery_observability.test.js`, `patch10b4c4_review_followups.test.js` und die zwei 4b/4b.1-Runner-Testdateien. Mehrere ältere Fälle in `patch81`, `patch82`, `patch10b4a` wurden wegen bewusst geänderter Callzahlen angepasst; zusätzlich root `.gitattributes` + fünf Windows-CRLF-Testread-Fixes. **Die individuellen „noch nicht ausgeführt“-Sätze in früheren Notes sind datierte damalige Statusangaben; diese §25-Sammlung enthält die später gemessenen Nutzer-Nachweise.**

### 25.2 Prüffeste Grenzen, bevor Sol darauf aufbaut

- **Produktcode `.65`, nicht bereits live abgenommen:** Keine autonome Narrator-Regeneration, keine in-place-ST-Host-/Provider-Abnahmemessung für Chatwechsel/Reload/den 6000-Token-Recovery-Versuch. Custom-`fetch` erhält AbortSignal; ST-`generateRaw` kann eventuell weiterlaufen, darf seinen veralteten Output aber nicht committen. Wirkliche Zuverlässigkeit nur mit Original-LLM-/Chat-/Eventlogs prüfen.
- **Kein zweites Buchen bei Regenerate/Swipe:** `prepareGenerationAsync` hält Player-/Turn-Commit-Guards; Extractor `runExtraction` läuft nur bis zum gültigen `applyExtraction`, schützt `pending` + `text_hash` + `laterTurns`; `world_jobs.js` schützt Chat-/Swipe-/Nachrichtenidentität und Save-Barrier. Roh angehängte, noch ungebuchte Usernachricht ist **nicht** `laterTurns`. Änderung an dieser Semantik nicht aus intuitiver Einschätzung ableiten.
- **Recovery-Ressourcen:** Planner Ersttransportfehler 2000+2000; leer+leer bis 2000+2000+4000. Extractor Ersttransportfehler 4000+4000; zweimal leer bis 4000+4000+6000. Kein unbegrenzter Repair, keine erzwungenen Nonempty-`commands/deltas`, `recovery` ist im Record als `empty/transport` sichtbar. Vor neuem großem Patch Performance/`wait_ms` aus dem echten ZIP auswerten.
- **Runner-Wahrheit:** `extractor_failed_soft` bei Dialog ohne erwartete mechanische Buchung kann dennoch Narrator-Weltfakten verlieren (NPC, Geschenk, Überfall); fortgesetzte Runs sind **kein** Engine-State-Vollständigkeitsbeweis. `recovery_zero_commands`/`recovery_zero_deltas` dienen als Review-Auslöser; nicht künstlich zu `success` oder `failure` umetikettieren.
- **Bekannte 10B-2b-Lücke:** `additionalContainerReturn`/Klauselfilter erkennt gleichwertige `must bring back`-/`must go back`-Imperative nicht zuverlässig, §18.2; weiterhin **offen**. Restliche Deliverymechanik nicht ohne isolierten Rot-Test großflächig umschreiben.
- **Kein 10B-3-Code:** autonome Kampfeskalation bei tatsächlichem Angriff (nicht bloßer Drohung), Combat-Chronicle-/Memory-Truth und offizielle Guild-Board-Authority waren ausdrücklich getrennt geplant (§13), **noch kein Teil der .58–.65-Produkte**. Nächster großer Sol-Patch sollte sie möglichst in **A Angriffsgate / B Combat-Truth / C Guild-Authority** unterteilen und positive Ambush-/private-NPC-Quest-Fälle behalten. Nicht mit 10B-4d vermischen.
- **10B-4d getrennt:** echte automatische `narrator_empty`-Recovery benötigt verifizierte SillyTavern-Host-Generierungs-/Swipe-Semantik; derselbe gebuchte Playerturn muss wiederverwendet werden, keine zweite Engine-Aktion, kein willkürliches neues GenerateRaw-Script.
- **Monster-/Chase-/Balancing-Reviews:** §§5–11 sind teils kontrastierende Sol-/ChatGPT-Analysen und **keine** pauschale Implementierungsgenehmigung. Monsterspecies bleiben frei generierbar, die 19 Anchors sind unterschiedliche mechanische Kategorien; Anatomie-Loot und repetitive Chase können später separat mit konkreten Regressionen angegangen werden.

### 25.3 Dokumentationsprüfung und Pflegeentscheidung

- **Auf `main` aktualisiert:** `01` aktueller datierter Übergabekern; `03` aktueller `.65`-Code-/1421-Node-Meilenstein und deutlich markierter `.57`-Historienabschnitt; `04` nur kurze neue Phase mit **vier** archivierten .57-Runs. **`02_DESIGN_KANON.md` wurde absichtlich nicht verändert:** es gab keine neue ausdrückliche kanonische Designentscheidung. `06` aktueller Kopf, diese §25-Zusammenfassung und die historisch vollständigen §§1–24.3. **Keine zweiten kompletten Patch-/Run-Reviews in 01–04**.
- **Auf Dev ergänzt:** `docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md` als einzige aktuelle technische konsolidierte Übergabe, per Link von 01/03/04/06 erreichbar. Historische .58–.65-Patchnotes bleiben in ihren jeweiligen Zeitständen erhalten; nicht rückwirkend verschweigen, welche Tests erst später bestanden.
- **Unverändertes Archiv:** `testrun_10b/README.md` führt **alle vier originalen .57-Runs** samt ZIP/REVIEW. Der Nutzer hat den nächsten `current_test` gestartet, aber **noch nicht als ZIP eingereicht**. Kein neuer Ordner/Review auf Verdacht, keine Veränderung des offenen Spielleitfadens. Erst nach dem tatsächlichen Export Run-ID, Engineversion, Git-SHA, `run.json`, `chat.jsonl`, `avereth-events.json`, `evaluation.json`, `chat-completions.jsonl`, `report.md` prüfen und die nächste Original-ZIP unangetastet archivieren.

### 25.4 Was Sol als Nächstes unabhängig prüfen und liefern soll

1. **Git fresh (Leseregel am 24.10.2026 vereinfacht):** Aktuelle `01` und `03` auf `main` vollständig lesen, Dev-HEAD und `package.json`/Manifest/`src/util.js` prüfen; danach nur für den Auftrag benötigte Teile aus `02`/`06`, Fachplan, Originalbelege und bei Bedarf den historischen Sol-Handoff nachschlagen. Der dort fixierte Code-SHA `d182e90` ist die relevante technische Basis vor Dokuupdates; Commit-Diffgrenzen und alle Testdateien folgen.
2. **Eigener kritischer Gegenreview, keine automatische Implementierung:** die 10B-1-Faktenidentitäten und Registrierungsabhängigkeit, 10B-2/2b-Lieferauthority inkl. F60-2, den gesamten 10B-4-Planner-/Extractor-/Host-/Runner-Lifecycle und bestehende Tests/Altfixtures durch Code, nicht allein durch Notes beurteilen. Erwartete Risiken und tatsächliche Fehler sauber trennen.
3. **Testbeleg:** `npm test` in Sols echtem Checkout mit Git-SHA ausführen, eigene Zahlen angeben; vom Nutzer bereits grün bestätigter `.65`-Stand = **1421/1421**. ST-Smoke/Browser-/Providerläufe nur als **bestanden** angeben, wenn die reale Umgebung existiert und der Lauf tatsächlich erfolgreich war.
4. **Neuer aktueller Langlauf:** Wenn Original-`current_test`-ZIP eingetroffen, Build und Commit aus dem Export **erst verifizieren**, dann echte Events, Quest-/Kampf-/GO-/GIVE-Buchungen, Memory-/Board-Aussagen, `recovery` und `waited` mit dem jeweiligen Narrator-/Planner-/Extractor-Call vergleichen. **Keine** .57-Originalruns als .65-Regressionstest verkaufen.
5. **Nächster großer Patch erst nach Befund-/Nutzerentscheidung:** bevorzugt 10B-3 in 3 umsetzbare/prüfbare Pakete oder anhand neuer .65-Livebelege eine andere begründete Priorität; 10B-4d nur nach ermittelter ST-Host-Regenerate-/Swipe-Garantie. Sol soll einen testbaren technischen Plan, Risiken, Red-/Green-Tests und klare Nicht-Ziele liefern; danach separater Implementierungsauftrag und unabhängiger Abschlussreview.

**Versions-/Abnahme-Fazit:** Das Node-Testfundament .65 ist mit **1421/1421** lokal grün, die **Live- und Host-Providerintegration bleibt offen**. `10B-3` ist nicht durch die Rescue-/Recovery-Arbeit erledigt, `10B-4d` ebenfalls nicht. Dieser Handoff schützt die bestehende, sehr umfangreiche 10B-Arbeit vor erneutem Start bei .57 oder versehentlicher Übernahme historisch überholter Testannahmen.


---

## 26. Run 5 – erster echter .65-Langlauf: Extractor API fertig, Host bleibt 900 s pending (24.10.2026)

**[NEUER ORIGINAL-LIVEBELEG, KEIN SYNTHETISCHER NODE-TEST]** Vollständiger technischer Review im [`testrun_10b/20261024-093931Z-current_test/REVIEW.md`](testrun_10b/20261024-093931Z-current_test/REVIEW.md); Original-ZIP **`20261024-093931Z-current_test.zip`** im Chat vorhanden (548.172 Bytes, SHA-256 `6c8536ee49d1484c15949a92a39b77c3eea58b1d22f4b802f87c5e8327064242`, ZIP CRC ok), Git-Binär-Upload noch ausstehend.

**Run-Beleg:** Build `4.3.0-c.6.6.65`, Git `d182e900c6cb`, echter SillyTavern 1.19, Chrome 155, Custom-GLM-5.3-Flash, unveränderter offener `current_test`. Mage L1 mit Arcane Bolt und Blink problemlos erschaffen (Turn 1–2). Turn 3: GO Richtung Stadttor, Planner **18,9 s** `stop`, Narrator **10,1 s** `stop`, Extractor **12,7 s** `stop`. **Die Extractor-Providerantwort um 09:40:58 UTC enthält nichtleeres und syntaktisch korrektes JSON** samt `expected.go`, `arrive`, zwei `person.new`-Torwachen und `aware`. Danach **kein** `extract_repair` oder `extract_recovery`, **kein** Welt-Commit und **kein** `extract.failed`. Der gespeicherte Narrator-Reply zeigt weiter `extraction.status='pending'`, `events=[]` und den alten Ort. Der Driver läuft korrekt bis zum Zugtimeout nach **900.149 ms**, meldet dann **`extractor_timeout`** (busy=false). Der komplette Runordner mit `report.md`, `chat.jsonl`, Events, Requests/Responses und zwei Screenshots wurde erstellt; 3/100 Inputs, nicht 100; keine Quest-/Kampfprobe. Server-/PageErrors sind leer, erfassen aber nicht zwingend abgefangene Browser-`console.error`-Fehler.

**Wichtige Trennung:** „Extractor-Timeout“ ist der symptomatische **persistierte-pending-Timeout**, nicht ein 900-s-LLM-Timeout; die erste Providerantwort war schon nach 12,7 s da. Gesicherter Befund ist ein **fehlender Abschluss zwischen Providerantwort und Engine-/Host-Record**. **Noch nicht gesichert** ist der einzelne Auslöser: z. B. `world_jobs.js:belongs()`/`isCurrent()` könnte nach einem Host-/Objektwechsel false liefern und `runExtraction` still mit `changed:false` verlassen, oder ein JS-/Parser-/World-Commit-Fehler wird gefangen, ohne den `pending`-Status sichtbar abzuschließen. Weder Chat-Array-Identitätsproblem noch tatsächlich ausgelöste Exception sind anhand der ZIP bereits bewiesen. Deshalb **keine pauschale Entfernung von Identity-Gates** (Risiko falscher Chat-Commit) und keine unbegrenzte Retry-Schleife.

**P0 für Sol vor größerem 10B-3/10B-4d:** erst **Host-World-Job-Instrumentierung** mit Ursache und Guard-Werten für `pending`→`applied/failed/cancelled`, verifiziertes Browser-`console.error`/caught-error-Logging, reproduzierbarer ST-Zug mit gültiger `arrive`-Extraktion; eine **isolierte** produktive Korrektur plus negative Tests gegen falsche Commit-Quelle. Erst danach den natürlichen Langlauf wiederholen. **Der vorherige 1421/1421-Node-Gesamttest bleibt korrekt**, belegt aber nicht den echten ST-/Provider-Abschlusspfad. **Kein Produktcode aufgrund dieses einen ZIPs geändert.** Kleiner semantischer Folgecheck: Extractor meldet Ankunft am City-Ref trotz Narrator-Ende in Torwarteschlange; noch nicht gebucht und nicht als eigenständiger feststehender Mechanikbug bewiesen.


### 26.1 Verifizierter Host-Hotfix 10B-4c.2 (.66, 24.10.2026)

**Implementiert in `4cd9b338`, Build .66; Vertrag .55.** ST 1.19 setzt Swipe `0` erst nach `MESSAGE_RECEIVED`. Zwei normalisierte Vergleiche in `world_jobs.js` beheben den irrtümlichen Stale-Discard und die Deduplizierung; echte Swipewechsel und übrige Commit-/Save-Gates bleiben erhalten.

**Von Sol selbst ausgeführt:** fünf neue Regressionen, auf .65 drei rot/zwei grün; nach Fix World-Jobs 19/19, Vollsuite 1426/1426. Echter ST-Mock-Smoke: .65 scheitert mit acht Extractor-Calls; .66 final 21/21 mit fünf Calls und abgeschlossener Speicherung. Ein erster .66-Versuch scheiterte an zwei PageErrors; Ursache offen. Kein natürlicher GLM-Pass und kein behaupteter Original-ZIP-Upload.

Einziger vollständiger Implementierungs-/Testnachweis einschließlich Umgebung, Fehlversuch, Save-Prüfung und `swipe_info`-Grenze: [PATCH10B4C2_SWIPE_ZERO_HOTFIX.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C2_SWIPE_ZERO_HOTFIX.md). Der ursprüngliche Run-Review in §26 bleibt unverändert; unabhängiges Codeurteil folgt separat.

### 26.2 Unabhängiges ChatGPT-Gegenreview zu Build `.66` (24.10.2026)

**Urteil: Quellcodefix korrekt; nächster natürlicher Livetest freigegeben.** Unabhängig gelesen: Produktcommit `4cd9b338773783644a79a39f367629e6aaeead05`, vollständiges `world_jobs.js`, fünf neue Regressionen, neue Hotfixnote, Lifecycle-Nachtrag und Versionsangaben sowie SillyTavern-1.19-`saveReply` (`7e8663cd9c184a550b37238218bdd32c6efc68e9`). Normalisierung fehlender Swipe-ID auf `0` ist mit der Host-Reihenfolge vereinbar; echte `0→1`-Wechsel bleiben ungültig. Keine weitere Produktänderung empfohlen.

**Prüfgrenze:** ChatGPT führte dabei keinen eigenen Node-/ST-Prozess aus; die Messungen in §26.1 stammen von Sol. Offene Beobachtungen bleiben der erste fehlgeschlagene .66-Smoke, Rückwechsel auf ältere `swipe_info.extra`-Snapshots sowie GLM-Recovery mit `maxTokens:6000`, lange Wartezeiten und Reload. Nicht ungeprüft synchronisieren oder Identity-Gates entfernen.

Mit unverändertem `current_test` fortfahren, Build/Commit und tatsächliche Events/Recovery kontrollieren. 10B-3, 10B-4d und F60-2 bleiben separat; ein Mock-Smoke ist keine natürliche Langlaufabnahme.

---

## 27. Vorbereitung der verbleibenden 10B-Fachpatches für Sol (24.10.2026)

**Nur Planung auf Produktbasis .66 (`4cd9b338`), keine Codefreigabe, keine neuen Tests und keine Buildnummer.** Der damals laufende natürliche `current_test` lag noch nicht als Export vor; neue Befunde können die Priorität ändern. Künftig fachlich abgeschlossene Patches statt künstlicher Mini-Patchfolgen.

### 27.1 Fünf getrennte Fachpatch-Spezifikationen

Alle fünf direkten Planlinks und ihre Entscheidungspunkte stehen einmalig im [Fachindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_REMAINING_WORK_SOL_IMPLEMENTATION_INDEX.md): Combat/Chronik zusammen, Gildenboard-Authority und Narrator-Recovery jeweils eigenständig. Monsteranatomie/Loot und Chase sind nicht freigegebene Designkandidaten. Keine Zusammenlegung zu einem ungeprüften Sammelpatch.

### 27.2 Kleine Wartung und bewusst offene weitere Themen

F60-2 bleibt die in [§18.2](#182-neuer-konkret-prüfbarer-randfall-zu-f60-2-regex-restlücke) belegte Klauselerkennung; konkrete Formulierungen und Gegenfälle stehen im Fachindex. Kein neuer Großpatch. Weitere Reisezeit-/Worldclock-, XP-/Level-, Economy-/Stonepreis-, Gear-/Monster-/Performance-Kandidaten nur nach Evidenz und Nutzerentscheidung (§9).

### 27.3 Übergabe und Qualitätsgates

Zuerst den natürlichen .66-Originalrun auswerten; neue P0-Hostfehler gehen vor. Danach ausdrückliche Fachpatchfreigabe. Allgemeine Arbeits-/Testregeln: [01](01_ARBEITSWEISE_CHATGPT_CLAUDE.md); fachliche Positiv-/Negativtests und zusätzliche Abnahmebedingungen: jeweiliger Plan. Für produktive Host-/Narrator-/World-Job-Änderungen bleibt echter ST-1.19-Smoke Pflicht, einschließlich `MESSAGE_RECEIVED` vor Swipe-Initialisierung. Historische Ergebniszahlen sind keine neue Testausführung. Aktuellen Abnahmestand nur in [03](03_AKTUELLER_PROJEKTSTAND.md) pflegen.

## 28. Run 6 – erster echter natürlicher `.66`-GLM-Lauf (24.10.2026)

**Originalreview:** [20261024-104654Z-current_test/REVIEW.md](testrun_10b/20261024-104654Z-current_test/REVIEW.md). `.66`, lokaler Dev-SHA `01636f32c46e`, 35/100 Inputs, 27:12 min, echter Provider, ohne Fixture. **32/32 natürliche Storyextraktionen angewendet**, kein `.65`-Hostpending, 102 gültige Modellantworten, zwei Extractor-Reparaturen, keine Page-/Serverfehler. Erfolgreicher Novice-Guildzyklus: vier enginegebuchte Hound-Kills (48 XP), 80 cp/30 XP einmalige Auszahlung, MP-Erholung durch Schlaf. Anschließend echter Dreiergegner-Encounter im ersten Dungeon; Mage Level 1 stirbt nach zwei Skeleton-Kills gegen Gegner Level 4/3/2, HP 80→0. Kein 100-Züge-Pass, keine allgemeine Klassenbalance-Aussage.

**Neuer enger Befund:** Der letzte Narrator-Absatz erwähnt drei Knochenhaufen, obwohl zwei Skelette getötet und eines mit 36 HP lebendig geblieben ist – **narrative Combat-Truth-Reibung, kein fehlerhaftes Engine-Kill-Event**; bei 10B-3/Chronik als Negativfall berücksichtigen. Der zuerst nur hörbare Hound wurde ohne Ressourcenverbrauch als Ziel abgelehnt (kein gesicherter Bug). Dungeon-Risikokommunikation für Level-1-Novices als **Designfrage**, keine Zahlenfreigabe. Technische Einzelbelege, Performance und Abgrenzung ausschließlich im verlinkten Review. **Original-ZIP im Chat geprüft (5.424.566 Bytes, SHA-256 `14b6570481917b575c035e361b59ef533d44a8917737513e19365ea6a0917de0`), Git-Binär-Upload weiterhin offen.** Keine Implementierung oder neuen Tests.

## 29. Run-12-Fachpakete (25.10.2026)

[Verbindlicher Fachplan](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md): Dungeon-Slotidentität und Guild-Lieferdeskriptor auf ausdrücklichen Nutzerauftrag umgesetzt (.79, `0f1195d`). World-Schauplatz-/Reise-/READY-Korrektur ausschließlich vorbereitet; keine Implementierungsfreigabe. [Technische Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0f1195d15ebbf92c76b5a62b94645dbdbadf8876/avereth-engine/docs/PATCH10B_RUN12_DUNGEON_GUILD.md); aktuelle Tests und offene Abnahme ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md). Arbeitsweise 01 und Designkanon bleiben unverändert.

### 29.1 World-State auf Folgeauftrag umgesetzt (.81, 25.10.2026)

Paket C ausdrücklich freigegeben und in `5d5dce1` implementiert. Extractor-Schauplatzbezug (keine Bewegungsvollmacht), vorhandene Arrival-Pfade für Zwischenhalte und antwortlokale Questabhängigkeiten; Sandbox-/NPC-Eigeninitiative bleibt erhalten. [Technische Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5d5dce125ef34ff2a2812f9cabc2d30ac0b4e522/avereth-engine/docs/PATCH10B_RUN12_WORLD_STATE.md); Abnahme ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md). Die frühere Zurückstellung in §29 ist damit überholt. Keine Balance- oder Guideänderung.


## 30. Run 13 und freie NPC-Hilfe (.83, 25.10.2026)

Die neue verbindliche Regel steht in [02 §6](02_DESIGN_KANON.md#6-quests-und-gilde); Umsetzung und Abnahme in [PATCH10B_FREE_HELP.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b70bd1ff21054396fa274cffd6eea4d10839e33f/avereth-engine/docs/PATCH10B_FREE_HELP.md). Historische Privatquests bleiben kompatibel. [Sols Run-13-Gegenreview](testrun_10b/20261025-081303Z-current_test/SOL_COUNTERREVIEW.md) präzisiert besonders die Ursache der Boardausfälle und trennt weiterhin offene World-/Guild-Befunde von diesem freigegebenen Umbau. Originaldaten und ursprüngliche Review unverändert.


## 31. Run 14: World-Delta .86 und vorläufiges Jagdboard .87 (25.10.2026)

Verbindliche Boardentscheidung in [02 §6](02_DESIGN_KANON.md#6-quests-und-gilde): automatische neue Lieferangebote vorläufig ausgesetzt, vollständiger Delivery-Code und vorhandene Verträge erhalten. Neue aktuelle Boards 4 Jagden + 1 geeignete Räumung, sonst 5 Jagden. Technische Umsetzung einmalig in [World-Delta](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH_RUN14_WORLD_DELTAS.md) und [Boarddesign](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH_RUN14_HUNT_BOARD.md); Abnahme in [03](03_AKTUELLER_PROJEKTSTAND.md). Die vorhandene {new:name}-Referenz bleibt; keine neue Aliasarchitektur, kein Gildenkurier-Modus und kein Handels-/Balancefix. [Originalreview](testrun_10b/20261025-113248Z-current_test/REVIEW.md), [Gegenreview/Plan](testrun_10b/20261025-113248Z-current_test/SOL_COUNTERREVIEW.md) und ZIP unverändert; der frühere optionale Aliasvorschlag wurde anhand der Regressionen verworfen. Testspieler unverändert. Noch kein neuer natürlicher Lauf.

