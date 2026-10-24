# Avereth Engine – Review 10B / 20261024-030002Z-current_test

**Status: Befundsammlung; keine Implementierungs- oder Balancingfreigabe.**

**Reviewbasis:** kompletter, unveränderter Export **20261024-030002Z-current_test.zip**, insbesondere run.json, evaluation.json, report.md, chat.jsonl, avereth-events.json, player.jsonl, calls.json und chat-completions.jsonl. Event- und Nachrichtenindizes unten beziehen sich auf die **internen Chat-/Eventeinträge** des Exports, die Züge auf **Spielereingaben 1–26**. Die mechanische Einordnung folgt den im ZIP gespeicherten Engine-Ereignissen, nicht bloß der Erzählprosa. Bisherige Kurzanalyse erneut kontrolliert. Der Codepfad zu automatischen Kampfstarts bedarf eigener Regressionstests; aus diesem Einzelrun folgt noch **keine** allgemeine Häufigkeitsaussage.

- Exportdatum: **24.10.2026**, Run-ID **20261024-030002Z-current_test**
- Original-ZIP: **4.393.062 Bytes**, SHA-256 **10e86d8d77ea967918fb13cff8c1054ae1baccc6e77692bd1b83468da12b461c**
- Engine **4.3.0-c.6.6.57**, Entwicklungs-HEAD im Export **3181c8112ec6** (sauber), ST **1.19.0**, GLM-5.3-Flash (Player und Narrator), Ruleset 2, Lorebook v0.14
- **Kein Fixture, kein Stub.** Start/API automatisiert, Profil unverändert, im Export kein Seiten-/Serverfehler, Geheimnis-Scan des Runners sauber
- Runner: **26 Spielzüge**, **21:01 min** (1.261.325 ms), **defeat** durch echten Engine-Tod in Zug 26; nicht **done**, nicht **limit**, nicht **100-Züge-Ziel erreicht**
- Meilensteine: creation_complete 1/1 erreicht, open_run_duration (100 echte Spielerzüge) nicht erreicht, also **1/2 Pflichtetappen**
- Endzustand: Mage Level 1, XP **23/100**, HP **0/80**, MP **62/72**, Geld **64 cp**, zwei offene Quests, **ein** Kampf, **fünf** Level-2-Räuber

## 1. Kurzurteil und Einordnung

Die neue offene Teststeuerung funktioniert als **Spieltest**: Ein eigenständig agierender Testspieler wählt Mage, Arcane Bolt und Arcane Ward, tritt einer Gilde bei, kombiniert Questangebote, erledigt einen Lieferauftrag mit tatsächlich gebuchten sechs Kisten, bekommt regulär 40 Kupfer und 23 XP, sucht anschließend einen passenden Anschlussauftrag, fragt nach Risiken der Straße, nutzt Unterkunft und Mahlzeiten. Er ist kein reiner Meilenstein-Automat.

Der Lauf endet wegen eines **bestätigten, schwerwiegenden Agency-Problems an der Grenze zwischen Erzählung und Mechanik**: Aus einer noch nicht eskalierten bewaffneten Forderung wird mechanisch ein sofortiger Angriff aller fünf Räuber. Der PC verliert HP, bevor er zur Übergabe der Ladung, Verhandlung oder Flucht entscheiden kann. Die tödliche Zahlenbilanz **allein** beweist weder einen Balancefehler noch eine Notwendigkeit, fünf Banditen ungefährlich zu machen.

Es bestehen **getrennte** Probleme beim Reise-Intent, bei der Abbildung erzählter Fernkämpfer auf NPC-Waffen sowie bei nachträglich erfundenen Spielerangriffen. Letztere werden im Folgeschritt sogar **als Welt-Erinnerung persistiert**, obwohl die Engine sie nie ausgeführt hat.

## 2. Spielverlauf – chronologische Rekonstruktion

| Züge | Tatsächliche Spielerhandlung | Engine-Beleg / Bewertung |
|---|---|---|
| 1–2 | Freie Charaktererstellung: Mage, Arcane Bolt, Arcane Ward | creation.completed in Nachrichtenindex 3; keine vorbereitete Klasse |
| 3–5 | Alderwatch betreten, Gildenhalle aufsuchen | Orte/Begegnungen in Chat und Events |
| 6–7 | Gildenmitgliedschaft beantragt und Gebühr gezahlt | Ereignisindex 13: guild.registered, coin.changed **50→30 cp**, genau **20 cp** |
| 8–9 | Board liest fünf Angebote; nimmt Tallow-Lieferung sowie Old-Crown-Catacombs-Vertrag an | Index 15: fünf quest.created; Index 17: zwei quest.status → active |
| 10–13 | Sechs Kisten beim Chandlery abholen, Handkarren für 2 cp, zum Kapellenwärter | Index 21 coin.changed **30→28**; Transport/Orte protokolliert |
| 14–17 | Lagerort klären, Kisten tatsächlich einräumen, Abgabe vorbereiten | Index 32 quest.ready nach **sechs** eingelagerten Kisten |
| 18 | Zur Gilde zurück, Lieferschein abgeben | Index 36 quest.status → completed, **+40 cp**, **+23 XP**, Geld **28→68 cp** |
| 19–20 | Selbständig Anschlussarbeit wählt: Escort nach Reedford, 90 cp ausgeschrieben | Index 39 quest.status escort → active; nicht abgeschlossen, keine 90 cp ausgezahlt |
| 21–24 | Dyers Yard, konkrete Gefahrenerkundigung, 3-cp-Zimmer, Schlaf, 1-cp-Proviant | Index 45 **68→65 cp**, Index 47 **65→64 cp**; echte Erholung/Zeitbuchung |
| 25 | Auf den Wagen steigen; Erzähler führt ohne Zwischenentscheidung bis zum Ford und lässt fünf Räuber eine Forderung stellen | Index 49: problematischer Planner-GO; Index 50: lange Reise + fünf combat.pending + echter Kampfstart |
| 26 | Ein Arcane Bolt auf Bandit B | Index 51: **ein** Angriff für **29 Schaden**, **−10 MP**; NPC-Folgeangriffe töten PC |

**Geldbuchhaltung:** 50 − 20 − 2 + 40 − 3 − 1 = **64 Kupfer**. Kein Geld-Duplikat erkennbar. Die 90 cp des Escorts wurden nicht verdient. Die zweite Quest (Catacombs) bleibt offen; der Lieferauftrag war korrekt abgeschlossen.

**READY vs. active:** Bis zur Rückgabe an der Gilde zeigte die HUD-Liste den Lieferauftrag weiterhin als active, obwohl ein separates READY-Signal bestand. Die spätere korrekte Abgabe zeigt, dass das nicht automatisch eine falsche Questzustandsbuchung ist; eher eine Anzeige-/Erklärbarkeitsfrage. Nicht als bestätigten Quest-Bug behandeln.

## 3. Befund P0 – Bewaffnete Drohung wird ohne Spielerentscheidung zum Kampf

**Beweiskette:**
1. **Spielereingabe Zug 25 / Index 49:** Der Spieler besteigt den Kutschbock und erklärt, er sei bereit. Kein eigener Angriff oder Befehl, Räuber zu bekämpfen.
2. **Narrator / Index 50:** Fünf Menschen treten hervor, vier halten Bögen halb gespannt, der fünfte verlangt die Farbfässer und stellt Verschonung bei Herausgabe in Aussicht. Tam bremst und sagt „Hold“. **Noch kein Pfeilschuss, Stich oder Angriff im Erzähltext.**
3. **Extractor-Rohantwort Zug 25:** Der Delta-Typ **hostile** benennt alle fünf Banditen; als evidence erscheinen nur gezogene Bögen und die Forderung nach der Ware. Diese Belege tragen **Bedrohung/Erpressung**, aber keinen bereits erfolgten Angriff.
4. **Engine-Events / Index 50:** Fünf **combat.pending**, ihre Materialisierung, encounter.started und resource.changed des PC von **80 auf 54 HP**. Der Angriff von Bandit B (Long Lunge, **26 Schaden**) ist bereits vor der nächsten Spielereingabe real ausgeführt.
5. **Zug 26:** Der Spieler bekommt erstmals wieder die Entscheidungsmöglichkeit, jetzt jedoch in einem Kampf gegen fünf Level-2-Rogues und mit 54 HP.

**Bewertung:** P0-Kandidat **Player Agency / unzulässige Ereignis-Eskalation**. Die Engine muss zwischen **sichtbarer Drohung**, **geäußerter Kampfabsicht**, **eindeutig begonnenem Angriff** und **bereits gebuchter Attacke** unterscheiden. Die korrekte Lösung darf **nicht** pauschal den tatsächlichen First Strike einer bereits abgeschossenen Armbrust, eines geführten Hiebs oder eines echten Hinterhalts unterbinden.

**Begrenzter Verbesserungsvorschlag:** Enge semantische Beweislast für Extraktor-/Firewall-Übergang in den autonomen Kampf: Ohne ausgeführte Gewalt keine endgültige automatische Attack-Commitment-Buchung. Bereits existierende Bedrohungs-/Szenen-/Intentmechaniken prüfen und nachnutzen; **keine breite zweite Aggro-Engine** erfinden. Bei einer Forderung mit konkreten Handlungsalternativen als Nächstes **eine echte PC-Entscheidung** ermöglichen. Ausgesprochene Drohungen dürfen Zeitdruck und Gefahr setzen; der Ausgang ist nicht vorgegeben.

**Red/Green-Regressionsfälle (mit tatsächlichem Engine-Replay):**
- „Gebt die Farbfässer her, dann geschieht euch nichts“ + gespannte Bögen: Gegner präsent/bedrohlich, **noch kein** Schaden und kein unfreiwillig abgewickelter Angriff; Spieler kann verhandeln/abgeben/fliehen/angreifen.
- „Der Räuber schießt den Pfeil ab“: echter Angriff, First-Strike- und Initiative-Regeln greifen vollständig.
- Hinterhalt mit explizitem getroffenen Pfeil: ebenfalls gültiger Kampfstart.
- PC eröffnet selbst den Kampf: ohne unberechtigte Verzögerung.
- Mehrere NPCs bedrohen ohne anzugreifen: kein automatische fünf-gegen-eins-Attacke allein aufgrund ihrer Zahl.
- Vor einem späteren Spielerentscheid fortgesetzte Drohkulisse: keine mehrfachen Pending-/Encounter-Duplikate.

**Nicht daraus ableiten:** Der Anfänger müsse jede Begegnung besiegen können, Eskorte garantiert sicher sein oder Feinde auf Spielerwunsch passiv bleiben.

## 4. Befund P1 – Einsteigen wird als Ortswechsel/ganze Reise fehlinterpretiert

**Beweiskette:** In **Zug 25 / Index 49** schreibt der Spieler sinngemäß „I climb onto the bench ... Ready when you are, Tam.“ Der Planner extrahiert einen **go**-Befehl zu einem **neu erfundenen Ortsnamen** („up onto the cart bench, riding with Tam toward Reedford“). Die Engine autorisiert diesen GO. Der nächste Narrator bringt die Gruppe über einen im Bericht sichtbaren **640-Minuten-Zeitsprung** bis zum Ford; die Engine führt den Zustand unter realm.valedorn_crown und dem fehlerhaften Ort **„On the way to up onto the cart bench, riding with Tam toward Reedford“**. Diese falsche Ortssemantik taucht auch im Todes-HUD und in Erinnerungen auf.

**Bewertung:** Unzulässige Vermengung von **lokaler Körperaktion (einsteigen)**, **Reiseabsicht mit NPC-Fahrer** und **tatsächlich abgeschlossenem Ortstransfer**. Das kann, je nach Zielsystem, normale Zeitsprünge unbemerkt autorisieren.

**Verbesserungsvorschlag:** Bestehende GO-/Transit-Verträge enger trennen: Einsteigen ist nicht selbst ein neuer geographischer Ort; ein klarer Reisebeginn kann einen echten Straßen-/Transitzustand eröffnen. Zeitraffung von Routineteilen bleibt erwünscht. Doch ein erzählerisch **entscheidungserheblicher** Vorfall muss die Fortführung am richtigen realen Reiseort anhalten. Keine zehn Leerlauf-Turns nur zum Folgen einer Straße.

**Regressionen:** (a) Auf den Wagen steigen ≠ neues Location-ID/Realm-Teleport; (b) „Tam, fahr nach Reedford“ kann echte, geographisch plausible Reise beginnen; (c) relevante Unterbrechung hält dort an; (d) gelungene normale Fahrt darf in einem kompakten Turn ankommen.

## 5. Befund P1 – Vier Bogenschützen, aber überwiegend Nahkampfsheets

**Beleg:** Im Erzähltext am Ford stehen vier Männer mit Bögen halb gespannt. In **Eventindex 50** werden fünf NPCs als Level-2-Rogues erzeugt (**je 90 HP**, Initiative 13). Die materialisierten Sheets besitzen jedoch nur für **einen** der vier beschriebenen Bogenschützen einen Bogen; die anderen tragen Nahkampfwaffen und erhalten meist Rogue-Nahkampfskills (u. a. Long Lunge, Guarded Cut, Piercing Thrust, Razor Cut). Selbst die Kampfrunden lösen vorwiegend nachsetzende Nahkampfschläge statt plausibler Distanzschüsse auf.

**Bewertung:** Bestätigter **Narration↔mechanische Rollen-Abgleich-Fehler**, nicht zwangsläufig ein Schaden-Balancingfehler. Für den Spieler ist der Unterschied zwischen fünf Schützen hinter Deckung und fünf Nahkämpfern entscheidend.

**Verbesserungsvorschlag:** Vor Festschreibung generierter NPC-Kampfsheets eine **minimale, verbindliche Rollenkonsistenz** zu sichtbaren Waffen/Reichweiten prüfen. Wenn die aktuellen Generatoren keinen passenden Fernkämpfer liefern, den Widerspruch **explizit registrieren**, statt unbemerkt einen Nahkämpfer als Bogenschützen auszugeben. Bereits vorhandene Ausrüstungs-/Skill-Pools nutzen; keine neue große Klassenspezialmodifikation ohne Designentscheidung.

**Regressionen:** 4 sichtbar ausgerüstete Schützen → vier ausführbare Fernkampf-Sheets **oder** ausdrücklich erkennbare Nichtabbildbarkeit; kein fiktiver Pfeilschuss. Gilt auch für Monster mit besonderen natürlichen Angriffen.

## 6. Befund P1 – Narrator erfindet Treffer; Extractor persistiert die Erfindung

**Erster Fehler (Index 51/52):** PC-Eingabe in Zug 26 lautet **einmal** „I cast Arcane Bolt at Bandit B“. Der Kampfrecord im Eventindex 51 enthält **einen** echten Arcane Bolt: **29 Schaden**, Ziel **90→61 HP**, MP **72→62**. Danach greift Bandit B mit 21 Schaden an (**54→33**), Bandit E mit 21 (**33→12**) und Bandit C mit 19 (**12→0**). Der PC hat **keine zwei weiteren Aktionen**.

Der folgende Narrator-Text spricht trotzdem von einem **zweiten** und **dritten** Arcane Bolt; beide werden als Treffer beschrieben. Dafür gibt es **keinen Kampfrecord**.

**Zweiter, gravierenderer Fehler (Eventindex 52):** Der Extractor speichert eine Erinnerungsnotiz zum Tod, die sinngemäß **„three bolts struck the bowman“** behauptet. Der falsche Erzähltext wird so zu scheinbarem Weltwissen. Dieses Sekundärproblem ist besonders kritisch für spätere Handlungskontinuität und NPC-Erinnerungen.

**Bewertung:** Bestätigte LLM-/Firewall-Wahrheitsverletzung **mit Zustandskontamination**. Die Engine-Rechenwerte selbst blieben korrekt; die erzählte Handlungszahl und ein abgeleitetes Gedächtnis waren es nicht.

**Verbesserungsvorschlag:** Erzähler nur vorhandene Kampf-Records narrativ ausgestalten lassen und die Handlungsmengen konsistent halten. **Keine zusätzlichen Angriffe/Treffer/Heilungen** zur Dramatisierung. Für Extractor-Erinnerungen zu fest gebuchten Engine-Kämpfen entweder autoritative Combat-Records referenzieren oder Abweichungen gegen diese sperren; nicht jede Prosaaussage als neue harte Tatsache annehmen. Dabei normale atmosphärische Beschreibungen nicht verbieten.

**Regressionen:** (a) genau ein abgewickelter Spell → höchstens ein erzählter Spell; (b) keine Erinnerung an mechanisch nicht ausgeführte Treffer; (c) echte Mehrfachtreffer/AoE entsprechend tatsächlichen Records weiterhin möglich; (d) Tod/Flucht/Sieg im Narrator und Weltgedächtnis aus Engine-Beleg konsistent.

## 7. Befund P2 – Risikoarchitektur von Novice-Escorts

Die Escort-Quest hatte **90 cp Belohnung**, war für **Novice** gelistet, und der Spieler erkundigte sich sinnvoll nach Gefahren. Im Chat vor dem Aufbruch wird erzählt, dass **vier bis fünf** Räuber am Ford Kutschen erpressen, bisher die Fahrer verschonen und bevorzugt am späten Tag operieren. Die Warnung war **sichtbar**, also keine unvorhersehbare Falle. Dennoch wurde die sachlich mögliche Konfliktlösung **Übergabe der Fässer gegen freien Abzug** durch den bestätigten P0-Fehler praktisch ausgeschlossen.

**Empfehlung zur späteren Designprüfung:** Erst P0 korrigieren, **dann** Novice-Escorts auf echte Erfolgspfade/Teil-Erfolge/Niederlagen untersuchen: frühe Abfahrt, Routenwahl, Ladung hergeben, Verstärkung organisieren, Risiko gegen Belohnung abwägen. Ein Novice-Auftrag darf gefährlich sein; fünf höherstufige Gegner ohne alternative Handlung sind etwas anderes. **Keine Pauschal-Nerfs** auf Grundlage dieses Tests.

## 8. Befund P2 – LLM-Vertragsrobustheit und Laufzeiten

**Runmetadaten:** 77 Engine-/Narrator-Calls: **24 Planner**, **24 Narrator**, **28 Extractor**, **1 Board**. Der Spieler benötigte **45 Requests für 26 Entscheidungen**; **19 erste Antworten** waren ungültiges JSON, wurden jeweils repariert (z. B. Züge 1, 2, 4–17 teilweise sowie 19, 21, 25). Diese Reparaturen haben den Lauf nicht abgebrochen, kosten aber Zeit. Drei Extractor-Aufrufe endeten mit finish_reason **length**; ein Extractor-Turn **23** endete nach Reparatur **ungültig**, ohne die zuvor gebuchten Zimmer-/Zeit-/Kauftransaktionen zurückzunehmen. Evaluation zählt **8 Auswertungsissues** (Züge 15, 17, 21, 23).

- Gesamtlauf **1.261.325 ms** = 21:01.
- Spielerentscheidungen **156.369 ms** = 2:36; Spiel-/Providerverarbeitung **1.049.015 ms** = 17:29; übriger Start/Overhead separat.
- Median Spielzug **30,2 s**; p90 **76,3 s**; Maximum **120,3 s** (Zug 25).
- Provider: Narrator-Median **11,4 s**, p90 **53,8 s**, größter Narrator-Aufruf rund **82,0 s** (Zug 12); Extractor-Median **8,1 s**, p90 **44,7 s**, größter **54,1 s** (Zug 25); Planner-Median **2,5 s**.
- Modell-/Profilkontext: dieselbe GLM-5.3-Flash-Anbindung, Player-Temperatur **0,8**, Narrator **0,9**, mehrere Reasoning-/Token-Presetwerte; das ist **kein Benchmark der JS-Engine-Rechenzeit**.

**Optimierungshypothesen, noch nicht beschlossen:** Player-JSON-Antwortvertrag knapper und robuster machen, Format-Reparaturkosten isoliert messen; Extractor-Tokenlimits/Antwortlänge gegen besonders dichte Langantworten testen. **Providerparameter nicht aufgrund eines einzelnen Laufs blind verändern.** Keine "bessere" Statistik behaupten, bevor der Fix echte Live-Läufe bestätigt.

## 9. Positive Nachweise und beobachtete Grenzen

**Bestätigt gut:** natürliche Charaktererstellung ohne Fixture; eigenständige Entscheidung für die Gilde; fünf Angebote auf dem Board; zwei gleichzeitige aktive Aufträge ohne Überschreiben; sechsteilige reale Lieferung bis READY→COMPLETED; echte Gebühren, Bezahlung, +23 XP; nächste Quests frei wählbar; brauchbare NPC-Hinweise zu Zeit/Risiko; Schlaf/Übernachtung und Nahrung; kein Ghost-Money; Engine-Integrity OK; Runner stoppt korrekt bei Tod und API bleibt verbunden.

**Noch NICHT geprüft:** längerfristige Levelkurve, Ausrüstungs-Upgrades aus selbst verdientem Geld, organische Skill-/Passive-Entstehung, Feat-Evolution im natürlich gewachsenen Run, höherstufige Gegnerverteilungen, Dungeonabschluss, 100-Züge-Stabilität, Replay nach langem Reload, wirtschaftliche Langzeitskalierung. Das Fehlen in diesem 26-Züge-Lauf ist **kein Defekt**.

**Weitere Beobachtung:** Der über einige Züge als READY markierte Lieferauftrag blieb in der kompakten HUD-Questliste active. Das kann eine UI-Semantik- oder Synchronisationsfrage sein, wurde jedoch beim Turn-in ordnungsgemäß abgeschlossen. In späteren Runs beobachten; **nicht als bestätigten Engine-Fehler einstufen**.

## 10. Prüfplan für eine spätere Fixphase – ohne Sofortimplementierung

| Rang | Thema | Reproduktion/Abnahmekriterium | Risiko der naiven Lösung |
|---|---|---|---|
| P0 | Drohung ≠ vollzogene Gewalt | Extender-/Extractor-Delta, Pending und First Strike auf explizitem Schuss vs. Forderung | Reale Überraschungsangriffe könnten fälschlich blockiert werden |
| P1 | Einsteigen ≠ Ortswechsel | Keinen Fantasie-Ort „auf dem Kutschbock auf dem Weg …“ im Worldstate; Reise darf komprimiert bleiben | Zu viele Reise-/Leerlaufzüge |
| P1 | Sichtbare Fernkämpfer + NPC-Sheets | Rollen-/Waffen-/Reichweitenvertrag beim Materialisieren | Überkomplexer Creature-/NPC-Generator |
| P1 | Narrator-Action-Cap + Memory-Firewall | Kein 2./3. Bolt; keine persistierte Fehlinformation über den Kampf | Normale Bildsprache könnte unnötig stark eingeschränkt werden |
| P2 | Escort-Risikogestaltung | Nach P0: verschiedene echte Entscheidungswege bei ungleichen Kräften | Automatisch sichere Quests, garantierte Flucht |
| P2 | Provider-/JSON-Robustheit | Vergleichbare Reruns und Rohaufrufe, Änderungen isoliert benchmarken | Tuning kaschiert Ursachen oder verschlechtert andere Calls |
| Watch | Queststatus READY vs active | UI-Hinweis bewusst und zum Queststatus passend | Pseudobug wird unnötig „repariert“ |

**Nächste Beobachtungsläufe:** Gleichen Guide **unverändert** lassen und mehrere natürliche Läufe archivieren; Befunde mit Häufigkeit, Voraussetzungen und Gegenbeispielen ergänzen. Keine heimlichen Engine-Änderungen zwischen direkt vergleichbaren Runs; wenn der HEAD wechselt, SHA/Build im Review markieren. Unterschiedliche Startklassen/Seeds sind nützlich, aber nicht als exakte Seed-Paarvergleiche gleichsetzen.

## 11. Methodik und Prüfgrenzen

Dieses Dokument ist **eine detaillierte Auswertung eines einzelnen Laufs**, keine Freigabe für einen Patch, kein Beweis systematischer Häufigkeit und keine mathematische Balancekalibrierung. Die Eventrecords gelten bei Kampf, Geld, XP und Quests als autoritative Quelle; die Narration ist die vom Spieler wahrgenommene Welt und kann von den Records abweichen. Der Lauf wurde **nicht** nachträglich verändert, repariert oder mit künstlichen Ereignissen fortgesetzt.

**Original-Pfade im Archiv:** run.json, evaluation.json, report.md, chat.jsonl, avereth-events.json, chat-completions.jsonl, calls.json, player.jsonl, server.log, server.timed.log, screens/final.png und screens/turn-026-defeat.png. Unveränderte ZIP für volle forensische Nachprüfung separat erhalten und mit obenstehendem SHA-256 prüfen.

**Dokumentation nur:** Keine Änderungen an 02_DESIGN_KANON, Engine, Narrator, Stats, Monsters, Regeln oder Runner. Änderungen/Fixaufträge werden erst nach der Sammlung mehrerer Runs getrennt freigegeben.
