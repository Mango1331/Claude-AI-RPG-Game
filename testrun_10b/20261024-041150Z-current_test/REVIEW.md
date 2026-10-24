# Avereth Engine – Patch 10B / Ausführlicher Live-Review **Run 3**

**Run-ID:** `20261024-041150Z-current_test`  
**Auswertung:** 24.10.2026 · unabhängige ChatGPT-Forensik des **unveränderten Originalexports**; nicht allein der automatisch generierte Runner-Bericht.  
**Originaldatei:** `20261024-041150Z-current_test.zip`, **3.652.300 Bytes**, SHA-256 `09e8f7a172921442fd4939dbdf806fb15b326e78230959d439bd2ca7a099979b`.  
**Git-Ablage:** `testrun_10b/20261024-041150Z-current_test/`. Dieses REVIEW wird separat auf `main` committed; die **Original-ZIP muss durch GitHub-Dateiupload in denselben Ordner** ergänzt werden. Nicht so tun, als sei der Binär-Upload bereits erfolgt.  
**Status:** **Befundsammlung; KEINE Engine-, Guide-, Zahlen-, Modell- oder Regeländerung freigegeben.**

**Evidenzbasis:** `avereth-events.json` (autoritative Eventreihenfolge und Buchungen), `chat.jsonl` (Spieler- und sichtbare Narrator-Prosa), `player.jsonl` (Playerentscheidungen und Notizen), `run.json`, `evaluation.json`, `calls.json` und `chat-completions.jsonl` (LLM-/Provider-Verträge), `report.md`, `import.json`, Logs und End-Screenshot. Aussagen über durchgeführte Aktionen, Gegenstands-Holder, Queststatus, Zeit, Kupfer und XP werden **vorrangig an Events** gemessen; Erzähltext oder Testspielermeinung können davon abweichen.

**Notation:** `T1`–`T21` = 21 versuchte echte Spielerzüge; **`T21` wurde NICHT abgewickelt**. `E<n>` = `i` im Array `avereth-events.json` beziehungsweise korrespondierender Chat-Nachrichtenindex (z. B. `E39` ist ein Engine-Messageindex, kein Zug 39). `Call 63` und `64` sind Einträge aus `calls.json`. `E40` ist die letzte erfolgreiche Extraktion. Im Status bleibt **turn 20** korrekt.

---

## 1. Technischer Abschluss und Echtheit der Testumgebung

| Merkmal | Verifizierter Run-3-Wert |
|---|---|
| Abschlussgrund | **`ui` – „turn 21: no reply after the message“**, ausgelöst durch **Planner-JSON-Ausfall**, nicht durch Tod |
| Soll / Spieleransätze / abgeschlossene Story-Turns | **100** / **21** / **20** |
| Laufzeit | **22:15 min** = 1.335.260 ms; Setup 1:31; 21 Game-Bearbeitungen 17:35; Testspielerentscheidungen 2:51 |
| Pflichtetappen | creation_complete erreicht **T2 / E3**, open_run_duration **nicht erreicht**, **1/2** |
| Spielerfigur | **Alaric Red, Mage Level 1**, selbst gewählt mit **Arcane Bolt + Flame Lance**, kein Fixture, Ruleset 2 |
| Ende der letzten abgeschlossenen Aktion | **HP 80/80**, **MP 72/72**, **70 cp**, **23/100 XP**, kein Kampf, kein Levelaufstieg |
| Gilde / Quest | Registriert Novice, ein **40-cp-Transportauftrag** schließlich erst in **T20** abgeschlossen; fünf reale Board-Listings |
| Engine | **4.3.0-c.6.6.57**, `integrity: OK`, **280** verbuchte Engineevents laut Runner; keine Page- oder Servererrors gemeldet |
| Git-Code zur Testzeit | Source **`3181c8112ec6`**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, sauber; wichtig: **nicht** den inzwischen späteren Simulator-HEAD als damaligen Test-Commit ausgeben |
| ST / Provider | SillyTavern **1.19.0**; `zai-org/GLM-5.3-Flash` via lokalem OpenAI-kompatiblen Endpoint; Narrator-Preset „Avereth Narrator V4“, deklarierter Kartenvertrag .49, aktiver Runtimevertrag „current“ |
| Runner / Seed | Runnerseed **1747035255**; tatsächlich in `campaign.started` gebuchter Seed **3834554709** – **unterschiedliche Zwecke, nicht gleichsetzen** |
| Generierung | Narrator Temperature **0,9**, max **8192 Completion-Tokens**, Reasoning „low“, Streaming aus; Testspieler Temperature **0,8**, max 3000 |
| Calls | **64 Engine/Provider-Calls**: 23 Planner, 18 Narrator, 22 Extractor, 1 Board; 7 Calls enden mit `finish_reason=length` |
| Automatische Prüfung | Runner-Secrets-Scan sauber, isoliertes Profil laut Export unangetastet; API-Key wurde nur lokal über Umgebungsvariable übergeben |

**Kernurteil:** Dritter natürlicher Open-Run, dritter Abbruch deutlich vor Zug 100. Diesmal **keine Kampfbalanceinformation**, sondern **ein schwerer, direkt sichtbarer Quest-Gameplay-Loop**, gefolgt von **einem technischen Planner-/Reasoning-Ausfall**. Der Erfolg „Quest abgeschlossen, 40 cp und 23 XP korrekt gezählt“ darf die vorangegangenen **inhaltlich falschen und unnötigen Übergabeanforderungen** nicht verdecken.

---

## 2. Vollständige Chronologie und tatsächlich persistierte Spielhandlung

| Spielerzug | Spielerhandlung und sichtbare Geschichte | Event-Nachweis / Befund |
|---|---|---|
| **1–2** | Wählt Mage, danach bewusst zwei offensive Starter-Skills | **E1** `creation.class_selected`; **E3** `creation.completed`; keine Fixturecharakterdaten |
| **3** | Geht durch Ashbridge zu Gilde | **E5** zwei autorisierte `go`; **E6** Szenenverlegung; im selben Input Stadt+Gilde, kein Wegpunkt-Leerlauf |
| **4** | Erkundigt sich nach Anmeldung und Anfängerverträgen | **E7** Registrierungsangebot 20 cp und **fünf** kanonische Board-Quests |
| **5** | Bezahlt 2 Silber, registriert sich unter Alaric Red | **E9** `coin.changed 50→30 cp`, `guild.registered`; keine Doppelzahlung |
| **6** | Nimmt Tinkturen-Lieferung an, fragt nach Abholung | **E11** `quest.status listed→active`, echtes Vertragspapier; **E12 `extract.failed`** nach ungültigem `place`-Delta. Erzähler schildert Händlerweg, Worldstate übernimmt ihn nicht |
| **7** | „I take the crate“, geht zum Steinbruchlager | **E13** `take` und `go` autorisiert; **E14** `quest.ready` und **erst danach** `object.created` für Kiste **mit Holder PC**. Erzähler sagt bereits geliefert und quittiert |
| **8** | Verabschiedet sich von Brenna mit unterschriebenem Beleg, zurück zur Gilde | **E16** unterschriebener **zusätzlicher** Lieferschein geschaffen, Holder zuerst Brenna, dann PC; erneutes `quest.ready`; Kiste bleibt trotzdem **Holder PC**. Erzählung sagt ausdrücklich: Heimweg **ohne** Kiste |
| **9** | Gibt unterschriebenen Beleg zur Auszahlung ab | **E17 `proof.checked ok:false`**: „he still carries crate…“; sichtbarer Clerk erfindet zusätzliche Pflicht zur Rückgabe des *leeren* Transportbehälters; **E18** diese Anforderung als `quest.detailed` gespeichert |
| **10** | Bringt Kiste erneut zum Steinbruchlager | **E19/20** neue Reise; **E20** `object.move` zur Heilerin durch `pc_inventory` verweigert, `quest.ready`-Nachbuchung durch `quest_delivery` verweigert |
| **11** | Trinkt Tee und fragt nach Abschluss | **E21/22**: Erzähler/Auftraggeber schickt den Spieler mit der Kiste nun wieder zurück nach Ashbridge; `quest.detailed` dokumentiert *andere* Übergabebedingung |
| **12–13** | Trägt Kiste zurück in Stadt, findet Ossians Laden | **E23–26** normale Ortsbuchungen; neue Innenraum-/NPC-Entität |
| **14** | Legt Kiste und Lieferschein auf Ladentresen | **E27** kein ausgeführter `give`/ `drop`; **E28** zwei erzählte `object.move` zu Assistentin durch **`pc_inventory`** verweigert; `quest_delivery` ebenfalls abgewiesen; Kiste + Schein bleiben Holder PC trotz Erzähltext |
| **15** | Läuft zur Gilde, verlangt Auszahlung | **E29/30** `quest.turn_in` am Ziel, **`proof.checked:false`**: PC hat immer noch Kiste. Auftrag weiterhin aktiv |
| **16** | Läuft zurück zum Laden, stellt Kiste auf Tresen und lässt sie da | **E31** `give` **conditional**; **E32** `object.move` wegen Empfänger-/Ortsbezug nicht gebucht; dennoch **`quest.ready`** und Narrator sagt ausdrücklich, Assistentin habe die Übergabe bestätigt; `cmd.expired` – die gültige Übergabebedingung trat nicht ein |
| **17** | Läuft zur Gilde und erklärt den Empfang | **E33/34** `proof.checked:false`, Kiste weiter bei PC; **Narrator korrigiert im Nachhinein** die vorher bestätigte Annahme: Assistentin habe Kiste wieder in Spielerhände gedrückt |
| **18** | Versucht explizit die Übergabe und dann den Rückweg zur Gilde in einem Turn | **E35**: erstes `go` autorisiert, `give` wieder nur conditional, zweites `go` **refused: already here**, `quest.turn_in` refused; **E36** `cmd.expired`, kein Item-Transfer. Der Spieler bekommt keinen sinnvollen kombinierten Handlungspfad |
| **19** | **Legt die Kiste auf den Boden der Gildenhalle**, hält Lieferschein hin | **E37 `object.moved`**: Kiste **an Ort der Gilde**, nicht zum Steinbruch oder Ossians Laden; `give` Chit verweigert, weil kein Clerk anwesend. Kein bezahlter Turn-in |
| **20** | Schläft in der Gilde bis zum nächsten Morgen, legt Schein vor, ersucht Abschluss | **E39** Schlaf `+576 min`, `proof.checked ok:true, mode:story_outcome`; **40 cp** `coin.changed 30→70`, **+23 XP**, Quest **active→completed**. Kiste liegt weiterhin in der Gilde; keine tatsächliche Übergabe an den ursprünglichen Empfänger gebucht |
| **21** | Dankt für Zahlung, fragt nach neuen Novice-Quests | **Call 63 & 64**: Planner und Reparatur komplett leer, jeweils `length`; **keine** `cmd.interpreted` / Narrator / neue `quest`-Buchung; Runner endet `ui: no reply after the message` |

**Wirtschaft ist korrekt:** Start 50 cp, Guild-Fee −20 cp, einmalige Vertragsvergütung +40 cp = **70 cp**. XP **+23** einmalig. Das Board nennt **4 Silber**, HUD/Quest **40 Kupfer** – bei 10 Kupfer je Silber **kein Währungswiderspruch**, ausdrücklich kein Bug.

**Story-Zeit:** Lieferung zieht sich über mehrere Abend- und Nachtorte, obwohl sie mechanisch bereits in T7 als READY markiert wird. Pacing der tatsächlichen Spielerinteraktion und der Engine-Bestätigung stark auseinander. Keine falsche Aussage, die Engine habe in T20 doppelt bezahlt.

---

## 3. P0 Gameplay – Delivery deadlock: Zustand und NPC-Story verlangen wechselseitig Unmögliches

### 3.1 Der verbindliche Auftrag verlangte etwas Einfacheres

**Original-Engine-Vertrag E7:** `task`: eine Kiste mit Fiebertinkturen **zum Steinbruchlager** liefern; `desired_end_state`: „The crate ... is delivered intact to the quarry camp's healer's tent.“ Zwei Objectives: `GET` in Ossians Shop; `DELIVER` am Quarry Camp. Proof: **unterschriebener Empfangsschein** der dortigen Heilerin. **Keine Rücklieferung eines leeren Behälters**, keine Zustimmung aus Ossians Shop und kein künstlicher Kreislauf zwischen Shop und Gildenhalle als Vertragsbedingung.

**Bestätigter Fehler:** Als in **T9** die Engine die vollständige, unterschriebene Lieferung **wegen einer noch im PC-Inventar befindlichen Kiste ablehnt**, fabriziert der Narrator in E18 eine **zusätzliche Rückgabeanweisung**, die dem Originalauftrag nicht entspricht. Später wechselt sogar die angeblich zuständige Rückgabestelle **zwischen Quarry Camp und Ossians Shop**. Der Spieler wählt keine neue Zusatzquest, sondern folgt den falschen Hinweisen des Systems. **Damit wird der Spielerzug 9 bis 20 weitgehend zur unfreiwilligen Bürokratieschleife.**

### 3.2 Warum die drei Systemschichten auseinanderlaufen

1. Der Narrator schildert in T7 **vollendete Abgabe und Empfangsbestätigung**. Die Engine schreibt zwar `quest.ready`, erzeugt aber die reale Kiste **noch beim PC** statt bei Brenna.
2. Das spätere `quest.ready` und der Empfangsschein bezeugen **inhaltlich** erfüllten Auftrag. `proof.checked` benutzt in T9/15/17 weiterhin die Kistenhalterprüfung: **Gegenstands-Holder PC ⇒ Lieferung nicht abgeschlossen**.
3. Mehrfach versucht der Extractor, die nacherzählte Übergabe nachträglich als `object.move` zu erfassen; `pc_inventory` schützt zu Recht vor eigenmächtigem Verlust von PC-Gegenständen. **Aber** der gültige, ausdrücklich freiwillige PC-Befehl „ich stelle die Kiste auf den Tresen und lasse sie da“ schafft es in dieser Kette ebenfalls nicht, als echter `give`/ `drop` am richtigen Ort erfolgreich zu buchen.
4. T16 erzeugt sogar **`quest.ready` trotz abgelehntem `object.move` und `cmd.expired`**, wodurch erneut dieselbe widersprüchliche Erfolgssignalisierung entsteht.
5. Bei T19 verschwindet die Kiste durch einen **gültigen Drop auf den Boden der Gilde** aus dem PC-Holder. Bei T20 erkennt `proof.checked` daher die Lieferung plötzlich als abgeschlossen und zahlt – **obwohl die Kiste nicht am im Auftrag geforderten Empfänger liegt**. Die „besonders strenge“ Inventarprüfung lässt einen falschen Abschluss zu.

**Diagnose:** kombinierter **Quest-/Proof-/Objekt-/Command-/Narrator-Integrationsfehler**. Es genügt **nicht**, die Kiste automatisch verschwinden zu lassen, den Proofcheck pauschal zu lockern oder jeden `object.move` aus der Prosa zu übernehmen. Gewollter PC-Itemschutz, tatsächliche Quest-Endzustände, zuverlässiger GET/DELIVER-Lifecycle und aus Enginezustand formulierte Rückmeldungen müssen zusammenpassen.

### 3.3 Verbesserungsvorschläge – alternative Lösungsrichtungen, keine Freigabe

**Mindestkorrektur A – bereits gebuchte echte Ablieferung respektieren:** Wenn `DELIVER`/ `quest.ready` samt **validiertem Empfänger-/Ort-/Objektbeleg** wirklich feststeht, darf der Turn-in später keine frei erfundenen zusätzlichen Rückgabebedingungen verlangen. Aber **nicht** ein beliebiges aus Narrator-Prosa erzeugtes `quest.ready` ungeprüft zum Freifahrtschein machen.

**Mindestkorrektur B – Hand-over atomar aus PC-Aktion:** Eine klare Spielerhandlung („I give the crate to Brenna“, „I leave the crate with Ossian's clerk“) muss den **richtigen** Gegenstand an den **aktuell präsenten** Empfänger/Ort transferieren und erst danach `quest.ready` zulassen. Für eine eindeutige, bereits erlaubte Übergabe braucht es kein nachgelagertes zweites LLM-Commit als Bedingung, das die eigene Aktion wieder zurücknimmt. Die Guardrail `pc_inventory` soll bleiben.

**Mindestkorrektur C – Questproof semantisch und örtlich prüfen:** `proof.checked` darf nicht „nicht beim Spieler getragen“ mit „beim vorgegebenen Empfänger angekommen“ verwechseln. Ein abgelegtes Frachtobjekt auf dem **Gildenboden** ist für „bei Brenna im Steinbruchlager“ **kein** gültiger Liefernachweis. Gleichzeitig darf ein später anderswo befindliches leeres Verpackungsstück bei bereits korrekt quittierter Lieferung nicht nachträglich die fertige Transaktion blockieren.

**Mindestkorrektur D – Narrator-Kanon der Quest nicht erweitern:** Die Gildenannahme-/Proof-Regeln und neue zusätzliche Anforderungen sind Engine-owned. Erzähler/NPC dürfen alternative Leistungen freiwillig anbieten, aber **nicht** ohne Engine-Änderung neue Pflichten für den bereits abgeschlossenen Auftrag erfinden. Nach einer engine-seitig abgewiesenen Übergabe muss die nächste Antwort ehrlich sagen, was **mechanisch fehlt**, nicht nur darstellen, die Heilerin habe die Kiste erfolgreich genommen.

**Pacing:** Sobald echte Lieferung + gültiger Beleg vorliegen, kann normale Rückreise/Rückmeldung kompakt geschehen. Keine 10 zusätzlichen Turns für „die Kiste bitte noch einmal tragen“. Der Spieler soll dennoch gezielt Lieferpannen, gebrochene Siegel oder widersprüchliche Empfängerhandlungen erleben können, sofern die Engine sie wirklich registriert.

### 3.4 Konkrete Red/Green-Regressionen

- **D1:** gültiges `GET` in Ossians Shop → `object.created` / `object.moved` Holder PC; nur eine Kiste, keine Phantomkopie.
- **D2:** Anlieferung an Brenna am **korrekten** Quarry Camp per eindeutiger PC-`give`/authorized transfer → Holder Brenna/Ort, `DELIVER` erfüllt; `quest.ready` erst danach, nicht umgekehrt.
- **D3:** signed chit liegt beim PC; der Auftrag kann bei der Gilde gegen **40 cp und +23 XP** einmalig geschlossen werden. Das spätere Schicksal einer **leeren** Transportkiste darf nur dann eine weitere Pflicht auslösen, wenn sie **vorher explizit zum Contract-Objective gehörte**.
- **D4:** Dasselbe Cargo wird **auf dem Boden der Gilde abgelegt** → **kein** positiver DELIVER-Beleg, wenn Ziel Brenna/Quarry Camp war; Auszahlung nicht dadurch möglich.
- **D5:** `quest.ready` aus unsicherer Narrator-Prosa ohne tatsächlich verbuchten Objektwechsel → ausstehende Bestätigung / kein falscher Abschluss.
- **D6:** „I set it on the counter and leave it there“ an einem erreichbaren legitim zuständigen Empfänger → genau eine bestätigte PC-Aktion, kein `pc_inventory`-Fehlblock auf eigene klare Entscheidung.
- **D7:** unklare Adressaten, nicht präsente Empfänger oder nur Erzähler behauptet Übergabe → PC-Inventar unverändert; kurze Rückfrage statt Falschbuchung.
- **D8:** zwei tatsächliche Teilaktionen „go then give“ in einem Turn → nur erlaubte Reihenfolge, keine erfundene Rückgabe; eine zu komplexe Mehr-Orts-Sequenz ggf. ehrlich abbrechen, ohne Fantasie-Abschluss.
- **D9:** spätere Narrator-Reaktion muss `quest.ready`, `proof.checked`, Holder und Zielort konsistent wiedergeben; kein NPC erfindet einen neuen Zahlungsort oder eine neue Rückgabe-Aufgabe.
- **D10:** Nach Reload/Regen/Same-turn-Replay keine doppelte Kiste, keine doppelte Bezahlung, keine vorausberechnete READY-Buchung.
- **D11:** Lieferung per unterschriebenem Beleg oder sonstigem explizitem Vertragspfad weiterhin möglich, auch wenn das Transportobjekt nicht mehr beim PC ist.
- **D12:** Empfangender NPC ist sichtbar anwesend, aber `Present`-HUD/Entity-ID weicht ab → Diagnose der tatsächlichen Zielreferenz, nicht stilles Erzeugen eines Ersatz-Empfängers.

---

## 4. P0 für Long-Test-Stabilität – Planner verbraucht zweifach Reasoning-Budget, Turn 21 verloren

**Autoritative Call-Belege:**

| Call | Art | completion/max | Reasoning-Zeichen | sichtbarer JSON-Text | Finish | Laufzeit |
|---|---|---|---:|---:|---|---:|
| **63** | plan T21 | **2000/2000** | **8740** | **0** | `length` | **32.239 ms** |
| **64** | plan_repair T21 | **2000/2000** | **8306** | **0** | `length` | **25.910 ms** |

Der Spieler fragt nach neuen für Mage geeigneten Boardquests, eine **legitime alltägliche harmlose Aktion**. Erst- und Reparaturaufruf liefern nichts Strukturiertes. Im Export `evaluation.issues`: `planner_failed: report is not valid JSON`, `planner_repaired`, zweimal `finish length`. Der UI-Runner meldet `turn 21: no reply after the message`. **Es gibt keine erfolgreiche E41-Spielbuchung**; der Engine-HUD-Status bleibt **turn 20, integrity OK**.

**Abgrenzung:** Das ist **kein weiterer Narrator-Ausfall** wie Run 2; der Narrator wird in T21 gar nicht mehr gerufen. Run 2: Narrator max 8192; Run 3: Planner max 2000, **inklusive Reparatur**. Das wiederkehrende **Provider-/Output-Budget-Muster** ist interessant, aber die Teilkomponenten und konkreten Kausalketten sind verschieden. Modell-/Endpoint-Verhalten und Promptgröße müssen vor jeder generellen Regeländerung isoliert untersucht werden.

**Plausible Lösungen (nicht implementiert):**
- Prompt-/Cache-/Reasoning-/Längenprofil der letzten beiden Calls gegen unauffällige Planner-Calls vergleichen; fehlerhafte Repair-Grenzen und `clear_thinking`/Reasoning-Einstellungen prüfen.
- **Eng begrenzter, state-sicherer Recovery-Pfad** nur für vollständig leere/invalidierte strukturierte Antworten, keine heimlich interpretierte Bewegung oder Questbuchung. Keine **doppelte** Engine-Aktion oder unbegrenzte Modellwiederholung.
- Wenn die semantische Anfrage `board.read` oder `quest.list` über bestehende Engine-Kommandos eindeutig erkannt ist, prüfen, ob klarer Engine-only-/Fallback-Vertrag **ohne LLM-Fantasie** möglich wäre. Nur bei formell ausreichend begrenztem Intent; Player Agency sichern, kein aggressives Stichwortparsing.
- Abbruchmarker sauber zwischen `planner_failed`, `narrator_empty`, `ui_no_reply`, `server_api_error` trennen; ein im UI hängenbleibender Turn muss maschinell als technisch fehlgeschlagen und mit **letztem erfolgreichen Eventindex** sichtbar sein.

**Regressionen:** P1 beide leeren Plannerantworten → kein Engine-Duplikat, kein fiktiver Narrator-Text, definierte Rückmeldung; P2 normale JSON-Reparatur weiterhin erfolgreich; P3 `board.read` ohne Parser bleibt nur falls eindeutig legal; P4 keine Endlosschleife, fehlerhafte Antwort nicht als „erfolgreicher Spielzug“ in die 100-Turn-Beobachtung zählen.

---

## 5. P1 – Zweite Weltwahrheit: Erzähler, READY, Holder, Auftrag und NPC-Stimme widersprechen sich

Dieses Thema ist **kein identisches Softwareproblem** zu den erfundenen drei Arcane Bolts aus Run 1 oder den Phantomgildenquests aus Run 2, gehört aber zur gleichen **Evidenzkategorie Narrator ↔ Engine Authority**.

1. **T7/E14:** Quest READY trotz Frachtgegenstand immer noch Holder PC. Außerdem steht `quest.ready` **in E14 vor** `object.created` des tatsächlichen Cargo-Objekts. Die narrativ bestätigte Abgabe ist nicht technisch atomar abgeschlossen.
2. **T8/E16:** Spieler läuft narrativ **ohne Kiste** zurück. Worldstate bewahrt Kiste am PC, wodurch das System T9 zu einem widersprechenden Grund führt.
3. **T14/E28:** Narrator: Verkäuferin nimmt Waren in Empfang und liest Lieferschein. Engine: `object.move` für **beide Objekte** durch `pc_inventory` abgelehnt. Das sieht der Spieler nicht im Fließtext, aber seine nächsten Entscheidungen hängen daran.
4. **T16/E32:** wieder `quest.ready` und NPC-Bestätigung trotz abgelehnter Übergabe. T17/E34 wird das Scheitern rückwirkend narrativ durch „sie drückte ihm die Kiste wieder in die Hand“ erklärt, obwohl diese Rückgabe ebenfalls **kein** eigenständiger gebuchter Transfer ist.
5. **T19/E37 und T20/E39:** echter Drop **nur in Gildenhalle**, dennoch wird bei nächster Abgabe der Vertrag als vollständig anerkannt – Zustandskriterium offenbar zu schwach/auf Holder-Predicate verengt.

**Spätere Abhilfe:** Narrator darf Atmosphäre entfalten, aber Aussagen, die das **rechtlich/mechanisch entscheidende Quest-Outcome** definieren, müssen direkt auf den autoritativen `quest`-/`object`-Record zurückführbar sein. **Eine gültige gesprochene Empfangsbestätigung kann ein nachprüfbarer Storybeleg sein, aber nicht gleichzeitig vollständig gültig und ungültig, je nachdem was der nächste NPC improvisiert.** Der Consumer muss den angebrachten Vertragspfad abschließen oder klar anzeigen, welcher nicht erfüllte Objective-Beleg noch fehlt.

---

## 6. P1 – Übergabeverb/PC-Inventar-Firewall: Schutzregel ist nötig, Integration unzureichend

**Beleg:** T14 selbst beschreibt „I set the crate on the counter“, T16 „I set it down ... leave it there“ und T18 ausdrücklich „I put the crate in her hands“. E27 enthält aber kein `cmd.resolved(give/drop)`; E31/35 erzeugen `give` als **conditional**, das am Ende **`cmd.expired`**. Die Extraktor-`object.move`-Deltas werden aus Authority-Gründen verworfen. Erst T19 „I set the crate down on the Guild hall floor“ wird als `drop` **direkt** gebucht.

**Bewertung:** Ein **richtiger Sicherheitsmechanismus** (`pc_inventory` verhindert eigenmächtige Veränderungen) wird durch schwache Plan-/Resolver-Verbindung zur Quelle unnötiger Spielerschleifen. Nicht `pc_inventory` abschalten oder NPCs freien Zugriff auf Inventar geben. Erst herausfinden, warum `give` auf dem Gegenüber gegenüber `drop` scheitert, obwohl direkter freiwilliger Spielerbefehl erkennbar ist. **Regression mit tatsächlich vorhandener NPC-Referenz** und einmal mit einem abwesenden Händler anlegen.

**Nebenproblem T18:** Der Parser verbindet eine Mehrort-Sequenz aus Shop → Weggehen → Gilde zu `go`/ `give`/zweitem `go`, das als „already here“ abgelehnt wird. Das kann eine **bewusste Sequenzbegrenzung** sein; dann muss der Erzähler den Status eines abgeschlossenen Teilplans klar kommunizieren und darf keine Folgehandlung behaupten. Kein allgemeines ungeprüftes erlaubtes Teleportieren.

---

## 7. P2 – Questdarstellung, Dokumente und Verfügbarkeit

- **Quest READY vs. Queststatus active:** READY kann eine zulässige Zwischenstufe vor förmlichem `quest.status completed` sein. Hier ist der Fehler **nicht** die bloße zusätzliche Anzeige, sondern dass READY und `proof.checked:false` im selben konkreten Auftrag aufgrund widersprechender Evidenz gleichzeitig bestehen. Das UI sollte ggf. zwischen „Erfolg narrativ behauptet“, „Belege mechanisch komplett“ und „zur Gilde zurückkehren“ unterscheiden.
- **Zwei unterschriebene Dokumentobjekte:** Engine vergibt bei Vertragsannahme `obj.slip.carry_tonic...`; die Geschichte lässt danach `obj.t16.signed_delivery_chit` entstehen. Der eigentliche Vertragslip und externe Unterschrift dürfen sachlich verschieden sein. Wichtig ist **nicht** pauschales Entfernen eines von beiden, sondern korrektes `proof`-Matching und die dokumentierte Historie.
- **Signierter Chit beim Spieler nach Auszahlung:** E40 markiert nur den ursprünglichen Guild-Slip als COMPLETED; `object.move`/Consumption des zusätzlichen signed delivery chit wurde nicht gebucht. Erzähler behauptet, der Clerk habe ihn eingezogen. **Kein ausgewiesener `consume:true`-Beleg** im Quest-Pflichtproof; der Beleg wird nach Vertrag ggf. nicht konsumiert. Darum **zunächst Konsistenz/Anzeige prüfen statt automatisch Inventory-delete verlangen**.
- **Anwesenheits-HUD:** In T6 zeigt HUD Gildenhalle, während Erzähler Ossians Laden beschreibt (E12 Extraktion gescheitert). Unter `Present` fehlen manche erzählten NPCs; möglicherweise bewusst nur persistierte relevante Entitäten. Die Darstellung soll nicht „niemand anwesend“ implizieren, falls ein Clerk interagiert.
- **Keine Währungsdiskrepanz:** `4 silver` gleich **40 cp**, am Ende korrekt gezahlt. Wiederholte Player-Notizen dazu sind **keine** Engine-Fehler. Kein Umrechnen als eigener 10B-Fix.
- **Kein relevantes Monster-/Klassen-/Kampfresultat:** L1 Mage mit zwei Offensivskills, **0 Kämpfe**; daraus keine Aussagen über Balance der Starterfähigkeiten ableiten.

---

## 8. Leistung, LLM-Ausgaben und verfehlter 100-Turn-Horizont

| Messung | Wert |
|---|---|
| Gesamtlauf | **1.335.260 ms / 22:15** |
| Setup | **91.210 ms / 1:31**, darin SillyTavern-Start 72.114 ms |
| Gamebearbeitung | **1.054.634 ms / 17:35** |
| Testspielerentscheidung | **170.908 ms / 2:51** |
| Median Game-Turn | **48,3 Sekunden**, p90 78,8 s, Maximum **132,9 s** bei T16 |
| 64 Calls nach Rolle | **Planner 23, Narrator 18, Extractor 22, Board 1** |
| Rollenmadiane | Planner **3,3 s**, Narrator **12,2 s**, Extractor **9,5 s**, Board 11,2 s |
| Length / völlig leere Rohantworten | **7`length`-Calls** (13, 18, 40, 44, 61, 63, 64), jeweils `content_chars=0` wegen Reasoningbudget |
| Testspieler-Format | **8 ungültige anfängliche JSON-Entscheidungen**, im Playerlog repariert; keine acht Engine-Gameplaybugs |
| Event-/Replayzustand | **280 Events**, Integrität `OK` am letzten erfolgreichen Turn |
| Runner-Evaluation | 1/2 Pflichtmeilensteine, **17 Issue-Einträge** in `evaluation.json`; `report.md` nennt 19 Auffälligkeiten inkl. UI und Zusatzhinweisen |

**Höchste Phasenzeiten:** Narrator T16 **94,1 s**, Extractor T14 **87,2 s**, Extractor T6 **52,8 s**, Extractor T15 **51,5 s**, Planner T21 **32,2 s** + Reparatur T21 **25,9 s**. Diese Werte sind Provider-/Prompt-/Ausgabeverarbeitung, **kein Beweis einer langsamen JS-Kampfengine**.

**Length-Muster:** Vier `extract`-Calls fallen aus Budgetgründen zunächst leer aus, einer davon führt T6 zu `extract.failed` (nach mangelhafter/ungültiger Reparatur), andere können erfolgreich repariert werden. T8 Planner `length` wird noch repariert. T21 sterben **beide** Plannerantworten an Reasoning, daher Abbruch. Der Testabbruch ist sehr wahrscheinlich nicht auf zu wenig API-Key, Game-Over oder Browsercrash zurückzuführen.

**Risikohinweis für Optimierung:** Sicherer Ausweg für vollständig leere strukturierte Antwort darf keine bereits begonnenen Spielzüge ein zweites Mal buchen. „Mehr Tokens überall“ oder blindes Abschalten von Reasoning ist nicht als kleiner Qualitätsfix belegt; zuerst konkreten Provider-/Preset-/Requestvergleich und einen eng begrenzten Retry/Recovery-Prototyp definieren.

---

## 9. Vergleich Run 3 mit den ersten beiden Originaltests

| Thema | Run 1 `030002Z` | Run 2 `033325Z` | Run 3 `041150Z` | Evidenz über die drei |
|---|---|---|---|---|
| Open-Test-Abschluss | **T26 defeat** | **T25 narrator_empty** | **T21 ui/no_reply** durch Planner | **0 von 3** erreichen 100 Züge; **drei unterschiedliche** konkrete Stopper |
| Klasse | Mage Arcane Bolt + Arcane Ward | Mage Arcane Bolt + Focused Ward | Mage Arcane Bolt + Flame Lance | **Nur Mage**, keine echten Warrior/Rogue-Langzeitbelege |
| Normale Gildenlieferung | 40 cp, 23 XP korrekt | 60 cp, 23 XP korrekt | 40 cp, 23 XP korrekt, **aber 12 Züge Übergabe-Loop** | Abrechnung gelingt in 3/3, doch Liefer-UX kann stark scheitern |
| Narrator/Engine-Truth | Erfand zusätzliche Arcane Bolts und Memory | Erfand neue offizielle Boardjobs | Behauptet fertige Abgabe, Engine-Kiste bleibt beim PC; NPCs ändern Anforderungen | **Wiederkehrende Fehlerkategorie**, nicht ein einziger bewiesener Bugpfad |
| Worldstate / Bewegung | Kutschbock Phantom-Location | erzählter Abend vs. Uhr 08:33 | T6 Shop nur erzählt, E12 `extract.failed` | **Orts-/Zeit-/Aktionstruth** mehrfach auffällig, Ursachen unterschiedlich |
| LLM-Ausgabe | 19 Player-Reparaturen | 17 Player-Reparaturen, leere Narratorantwort 8192 | 8 Player-Reparaturen, Planner doppelt leer 2000 | **Provider-/Structured-Output-Friktion** in allen Runs, technische Abbrüche in 2/3 |
| Kampf | 5 Räuber, erzwungene Eskalation, Tod | 0 | 0 | **Kein** gültiger Klassen-/Monster-Balancingtrend aus ST-Läufen |
| Natürliche Levelentwicklung | nicht erreicht | nicht erreicht | nicht erreicht | vor dem 100-Turn-Ziel weiterhin ungeprüft |
| Primärer Bug | fehlende Agency in Drohung | Provider-Narrator und Phantomboards | Delivery-Quest-Handover/Proof und Planner-Ausfall | **Priorisierung über Ursachen nötig**, nicht Mega-Patch nach „alles falsch“ |

**Explizite Grenze:** 3/3 einmalige Quest-Abrechnung beweisen nicht, dass Transportquests zuverlässig funktionieren; gerade Run 3 zeigt, dass ein `quest.status completed` allein eine spielerisch sehr schlechte oder inkonsistente Durchführung verdecken kann.

---

## 10. Priorisierte Fix-Kandidaten zur späteren Sol-Prüfung (nicht implementieren)

| ID | Kandidat | Auslöser / Beleg | Anforderungen eines technischen Plans |
|---|---|---|---|
| **10B-T10** | **Delivery/Proof/Inventar-Lifecycle** | T7 `quest.ready` + Kiste Holder PC; T9/T15/T17 Refusal; T19 Gildenboden-Drop; T20 Fehlabschluss | Endzustand mit Ziel-/Holder-/Proof-Beleg, stabile `ready`-Semantik, atomare freiwillige Übergabe, kein Phantom-Addendum, kein Doppelpay, Replay |
| **10B-T11** | **Planner-Leerantwort und falscher UI-Endgrund** | T21, Calls 63/64 beide length/0 JSON; „no reply after message“ | Budget-/Provideranalyse, bounded safe recovery oder expliziter Planner-Failure, kein zweiter Turn |
| **10B-T12** | **Questbezogene Narrator-Anweisungen als neue Verpflichtung** | T9–18 wechselnde leere Kistenrückgabe, beim Board nicht vorgesehen | Quest-Kanon aus Engine halten, zulässige freiwillige Zusatzaufträge getrennt führen |
| **10B-T13** | **GIVE/DROP-/Multi-Intent-Verlässlichkeit** | T14 & T16 & T18 falsche bedingte `give`, T19 `drop` klappt | PC-Wille mit richtigen Objekt-/NPC-IDs nachweisbar; Firewall nicht aufweichen |
| **10B-T14** | **Receipt, Inventar und Anzeige nach Abschluss** | signierter Chit bleibt beim PC, UI / Narrator sagt eingezogen | `proof.consume` und echter Ledger-Slip vs. Receipt unterscheiden, keine Erfindung einer Pflichtlöschung |
| **10B-T15** | **Extractor-Ortsfehler und Nichtübernahme** | T6 invalid `place`, `WORLD NOT RECORDED`, erzähltes Ossian-Shop-Betreten | atomare Fehlerbehandlung, nächste Story am autoritativen Ort ausrichten |

**Abgrenzung zu älteren Kennungen aus Datei 06:** `10B-T01` Agency-Banditen, `10B-T02` Narrator-Leerantwort, `10B-T04` Phantom-Guildjobs, `10B-T05` Reisekonsistenz bleiben getrennt. `10B-T11` gehört zur **gemeinsamen Modell-/Budget-Failure-Familie**, ist **nicht** dieselbe Narrator-Funktion wie `10B-T02`. `10B-T10/T12/T13` können denselben Deliver-Handover-Pfad teilen; erst durch Code-Replay zusammenführen oder trennen.

---

## 11. Spezifischer Auftrag für unabhängigen technischen Gegenreview durch Sol

Sol soll **alle drei Originalexporte** und **alle drei separaten ChatGPT-Reviews** gegen den aktuellen V4-C-Enginecode prüfen, bevor ein 10B-Korrekturpatch festgelegt wird. Dieses Dokument zählt nachvollziehbare **Vermutungen und Vorschläge**, ersetzt keine unabhängige Reproduktion.

**Erwartet:** Bei jedem P0/P1-Pfad entweder `confirmed` mit konkretem Quellmodul, Datenfluss, red reproduziertem Test und vorgeschlagenem minimalem Code-Diff **als Plan/Pseudocode** oder `not reproducible/false positive` mit belegtem Gegenbeispiel. Sol soll übergreifende Root Causes und kausale Abhängigkeiten identifizieren, realistische Phasenpakete (z. B. **Planner/LLM-Robustheit**, **Quest/Holder/Authority**, **Narrator/Worldstate-Truth**, **Combat-/NPC-Intent**) mit harter Trennung zwischen **Patching und Langzeit-Balancing** formulieren.

**Noch KEIN Implementieren:** Kein Quellcodepatch, keine Tests committen, keine JSON-/Promptverträge modifizieren, keine Balancingwerte oder Testguides verändern. Erst einen überprüfbaren **technischen Patchplan/Entscheidungsvorlage** mit regressionsfähigen Akzeptanzkriterien an den Nutzer und ChatGPT liefern. Die künftig wirklich umgesetzten Teile werden nach Freigabe in der Masterdatei 06 dokumentiert.

---

## 12. Offene Fragen und genaue Evidenzgrenzen

1. Warum lässt `quest.ready` in T7 und T16 das Frachtobjekt beim PC? Ist `quest.ready` in V4-C absichtlich eine weichere **narrative** Zwischenmarkierung? Falls ja: Der Player/HUD darf sie nicht als valide Vollendung präsentieren.
2. Wird `proof.checked(mode=story_outcome)` bei der finalen Gildenabgabe eigentlich von `quest.ready`, einer bestimmten Objekt-Halterbedingung oder einer losen Prosa-/Fact-Heuristik getrieben? Aus Events ist die **Korrelation** (erst nach Drop) klar, die genaue Codeentscheidung muss Sol isoliert nachlesen.
3. Welche Quellfunktion verweigert `give` am Laden als `conditional` und läuft am falschen NPC-/Ortshandler aus? Unterschied T14, T16 und T18 mit identischem Objekt reproduzieren.
4. Welche Regeln bestimmen, ob ein **unterschriebener Lieferschein** nach Turn-in beim Spieler bleiben darf, insbesondere wenn `consume:false` im eigentlichen Proof steht?
5. Warum hat der Erst-Extractor T6 das unbekannte Delta `place` geliefert, und warum wurde es bei Repair nicht korrigiert? Prompt- und Schemaquelle ansehen, keine freie Erzählung als erfolgreichen Import werten.
6. Ist der sehr lange Delivery-Loop ein allgemeines GET/DELIVER-Problem oder eine seltene Kombination aus Extraktorfehler, `quest.ready`, Hand-over und Tageszeit? Andere echte Gildenlieferungen in Runs 1/2 als **Gegenfälle** testen.
7. Welche Unterschiede zwischen `plan` und `plan_repair` in T21 führen dazu, dass ein früher reparierbarer leerer Planner diesmal **zweimal** Budget erschöpft? Rohrequests und Profil/Provider unterscheiden.
8. Erzeugt die neue dokumentierte Gilden-Quest-Logic bei natürlichem Mehrziel-`go` weitere ungewollte „already here“-Effekte? Nur nach Regressionsergebnis Eingriff.

**Begrenzung:** Original-ZIP ist nicht nachträglich verändert und hat hier eine nachvollziehbare SHA-256. Kein Code geändert, keine Regressionstests gegen den Entwicklungsbranch ausgeführt; Änderungen und Tests erst durch den freizugebenden technischen Patchauftrag. Weitere 100-Züge-Livetests sind weiterhin sinnvoll, sofern wiederkehrende technische Stopper nicht eine gezielte kleine Fixphase notwendig machen.
