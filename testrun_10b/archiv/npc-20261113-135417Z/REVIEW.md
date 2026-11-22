# NPC-/PULSE-Dreierbatch 13.11.2026 – unabhängiger GPT-Review (.183)

**Quelle:** Nutzerupload `npc-batch-20261113-135417Z.zip`, gestartet 13.11.2026 13:54:18 UTC, beendet 15:55:18 UTC. Drei echte LLM-Kampagnen mit `zai-org/GLM-5.3-Flash` (Seeds 7/8/9), nicht drei menschliche Spieltests. **Produkt:** `4.3.0-c.6.6.183`, sauberer Branch `claude/c-planner-prototype-2026-10-02-gpt-c666` bei `86465eb2a75e`. [Quellenmanifest](SOURCE_MANIFEST.md). Vorgänger: [Dreierbatch .179](../npc-20261112-220625Z/REVIEW.md).

**Unabhängig geprüft:** ZIP-CRC (55 Einträge, fehlerfrei); `batch.json`, drei `run.json` / `evaluation.json` / `npc-pulse.json` und -Berichte; die originalen Chats, Events und für die konkret benannten Fälle echte Planner-/Narrator-/Extractor-Anfragen und Antworten in `chat-completions.jsonl`. **283 von 283** exportierten Eventgruppen wurden byteinhaltlich als JSON mit den entsprechenden in `chat.jsonl` eingebetteten Events verglichen: **0 Abweichungen; 2.416 Events** (1.228/635/553). Run-Evaluierungen: in allen drei Fällen `integrity.ok=true`, je 0 Fold-/Validatorprobleme, 0 PageErrors und 0 Geheimnistreffer. **Nicht** selbst ausgeführt: Node-Suite, erneutes Fold/Replay, separater ST-Standard-/Failsoft-Smoke. Die Runner-Werte sind unabhängig aus Originaldateien abgeglichen, aber semantische Bewertung bleibt davon getrennt.

## 1. Urteil und Priorität

**Deutlicher Erfolg für die technische E3-Ankerbildung, keine Gesamtfreigabe.** Auf .179 entstanden in 188 Eingaben 0 Anker; auf .183 enthalten 152 Eingaben **9 angenommene Persönlichkeitsfakten**, davon **eine echte Änderung in einer späteren Anwesenheitsspanne**. Die drei Kampagnen sind nicht derselbe Verlauf: aus dem Vorher/Nachher-Vergleich allein folgt keine isolierte kausale Wirkungsquote für den V-1-Prompt. Die ursprüngliche Null-Abdeckung ist jedoch erstmals durch echte LLM-Ausgaben überwunden. Das erklärt noch nicht, ob NPCs sich im späteren Spiel dauerhaft **glaubwürdig** verhalten.

**Wichtigste offenen Fälle:** (1) Rogue T41–T43: drei aufeinanderfolgende ungültige Extractor-/Reparaturberichte und technische Beendigung nach missglückter Preis-/Buchungssequenz; (2) Mage T22/T27: klar geäußerte Questannahme vom Planner fälschlich als Frage verworfen, aber in der Erzählung zweimal als aktiv zugesichert; (3) E3-Werte teils inhaltlich falsch als `voice` bzw. `interest` etikettiert und Karten teils gekürzt. Keine neue globale Schema-/Firewall-Lockerung ohne gezielten Ursachenbeleg. Die alten .179-Ortsfehler sind in diesem Batch **nicht in derselben Form nachgewiesen**, nicht damit vollständig ausgeschlossen.

## 2. Laufübersicht

| Profil | Eingaben / Ende | Gameplay | E2/E3 | Technische Auffälligkeit |
|---|---|---|---|---|
| Warrior `npc-sociable`, Seed 7 | **70 / done** | Gildenregistrierung, 1 Vertrag abgeschlossen, mehrere Kontakte/Absprachen, 4 Kämpfe | 16 neue Personen, 6 Wiederbegegnungen, 7 persönliche Threads, **6 Anker** | 3 fehlgeschlagene Extraktionen, 4 Empty-Recoveries; keine Foldfehler |
| Rogue `npc-wary`, Seed 8 | **43 / repeated_model_failure** | 1 Vertrag abgeschlossen, anschließend Gasthaus-/Sereth-Szene | 8 Personen, 4 Wiederbegegnungen, 3 Threads, **2 Anker / 1 Änderung** | **6 Extractor-Failures**, Endkette T41–T43; keine Foldfehler |
| Mage `npc-inquisitive`, Seed 9 | **39 / defeat** | Hound-Vertrag erfolgreich abgeschlossen; Mossback-Warrens erreicht, Dungeon-Kampf endet tödlich | 11 Personen, 2 Wiederbegegnungen, **1 Anker** | 1 Plannerformatfehler (T6), Questannahme T22 nicht gebucht; kein World-Extractor-Failure |

**Abschlussbegriff:** Das Batch-Flag `completed` bedeutet nur, dass drei Kindläufe beendet sind. Warrior erfüllt das 70-Zug-Dauerziel; Rogue endet technisch; Mage stirbt nach regelgebuchtem Dungeon-Kampf, nicht erkennbar durch einen Extraktor-/Foldfehler. Bei Mage ist Tod kein technischer Fail, zugleich keine 70-Zug-Abdeckung. Engineevents insgesamt 2.416; 283 Exportgruppen. Alle drei Läufe liefen laut Run-Metadaten über ST 1.19.0 mit Chromium und Modell-Endpoint; dies ersetzt keinen ausdrücklich dokumentierten isolierten Standard-/Failsoft-Smoke mit separater Datenwurzel.

## 3. NPC E3 – endlich gespeichert, Auslieferung/Qualität eingeschränkt

**Tatsächliche neun Anker und späterer Kartenbefund (aus Originalevents und `npc-pulse.json`):**

| Lauf, Zug | NPC / Merkmal | Inhalt kurz | Spätere Karte |
|---|---|---|---|
| Warrior T11 | Odo / voice | gruff, half-laughing candor | vollständig T12 |
| Warrior T30 | Maren / manner | zählt Münzen sorgsam Stück für Stück | vollständig T31 |
| Warrior T33 | Guild clerk / interest | praktische Vertragsberatung | vollständig T34 |
| Warrior T59 | Hollis / voice | flüstert unter Anspannung beim Patt | vollständig T60 |
| Warrior T62 | Dunstan / voice | schätzt Tötung wie ein erfahrener Landmann ein | nicht gezeigt |
| Warrior T64 | Müllersfrau / voice | rasche Wundversorgung, kein Zögern | nur gekürzt T65 |
| Rogue T35 | Sereth / manner | gelassen, mustert den Vertrag, schnaubt über Solo-Novizen | nur gekürzt T36 |
| Rogue T38 | Sereth / manner | gelassen, nimmt sich Zeit | **ersetzt** Vorgänger, nur gekürzt T39 |
| Mage T21 | Marta / manner | tintenverschmierte Finger, pragmatische Beratung | vollständig T22 |

Nach Runner-Kartenmetrik **5 volle, 3 gekürzte, 1 nicht angezeigte** Folgeauslieferungen. Das ist keine Messung, dass der Erzähler das Merkmal tatsächlich als kausalen Erinnerungsimpuls verwendet; die Rohprompts und die spätere Szene müssen unterschieden werden. Beispielsweise greift Mage T22 Martas schnelle Federbewegung auf, während Rogue T39 Sereth ausdrücklich `unhurried` bei den Gurten beschreibt; diese Übereinstimmungen sind plausibel, aber noch keine längerfristige NPC-Persönlichkeitsabnahme.

**Qualitative Auffälligkeit:** Mehrere akzeptierte `voice`-Einträge beschreiben eher die *aktuelle Handlung* als eine langfristige Sprechweise: Hollis T59 (`whispers tense observations ... in a standoff`), Dunstan T62 (`measures a kill like a countryman`) und Müllersfrau T64 (`quick, no-nonsense wound care`). Auch die `interest`-Formulierung des Guild clerks T33 beschreibt vor allem seine berufliche Beratung. Das erfüllt den allgemeinen Validator möglicherweise, ist aber fachlich von D2/R10 (dauerhaft gezeigte Eigenart, nicht Stimmung/Einzeltätigkeit) abzugrenzen. **Kein Beweis einer defekten Firewall**; zuerst den Extractor-Wortlaut und die Kontextsituation gezielt gegenprüfen, keine ungezielte neue Heuristik.

**Schutzbeleg:** Mage hat eine `anchor_first_contact`-Ablehnung; Rogue eine `anchor_value`- und eine `anchor_scope`-Ablehnung, Warrior eine `anchor_scope`-Ablehnung. **0 `anchor_mood`-Refusals heißt fehlende natürliche Schutzabdeckung, nicht ein bestandener Mood-Test.** Neue E3-V-1-Vertragszeile (`at most 80 characters`) ist in allen geprüften primären Extractor-Requests enthalten; `LATER ENCOUNTER` erscheint nur bei zulässigen Zuständen. Das tatsächliche Speichern ist damit belegt, nicht bloß eine synthetische Testbehauptung.

## 4. Rogue T39–T43 – Zahlungsverständnis plus unabhängiger Extractor-Blocker

**Wichtige Trennung der Geldautorität:** T39 enthält **eine echte** `transaction.completed` über **3 cp** für das Zimmer, einschließlich `coin.changed -3`. T40 macht der Planner aus den 4 cp für Essen eine **offene Zahlungskarte** `dec.pay.t38.1`. Die Engine verlangt ausdrücklich den eigenen Befehl `#pay dec.pay.t38.1`; bloße Prosa zahlt nicht. Der LLM-Spieler verwendet diesen Befehl nicht und versucht T41–T43 stattdessen wiederholt, **7 cp inklusive des bereits bezahlten Zimmers** zu übergeben. Eine Buchung von 7 cp wäre daher gerade **nicht** der richtige Fix.

**Technisch reproduzierbare Blockade:** T41–T43 entstehen drei aufeinanderfolgende `extraction_failed`-Einträge; die primären Reports und die Reparaturen verwenden unzulässige Top-Level-Schlüssel (`1`, `2`), fehlende `type`-/`seq`-Felder, falsche Offer-Formen bzw. fehlende `scene`. T43 meldet der Runner `repeated_model_failure`. Die tatsächlichen Modellantworten stehen in `002-npc-wary/.../chat-completions.jsonl` (turns 41–43; `extract` mit `repair:false/true`).

**Gameplayproblem:** Narrator/Spieler verlieren die Trennung zwischen „Zimmer schon bezahlt“, „Essen als offene #pay-Entscheidung“ und einer neuen Gesamtzahlung. Der Erzähler nennt 7 cp wiederholt, die Spielerfigur probiert die Zahlung erneut, ohne Fortschritt. **Zwei Untersuchungsaufträge trennen:** (A) vorhandene bezahlte Positionen/offene Zahlungskarte korrekt in Folgeplan und Erzählung transportieren; (B) warum Extractor und Reparatur auch bei eigentlich kleiner Gasthausszene die dokumentierte JSON-Hülle verfehlen. Scheitern ist real, aber weder „alle Zahlungen sind kaputt“ noch Freigabe für Blindnormalisierung.

## 5. Mage T22/T27 – irreführende Questannahme (neuer harter Ursachennachweis)

**T22 Originalspielerzug:** „I'd like to accept the Mossback Warrens Level 1 contract — and what can you tell me about the mossbacks ...?“ Im `cmd.interpreted` steht `commands:[]` und `dropped:[{type:'quest.accept', rule:'question', quote:"I'd like to accept ..."}]`. Das ist für den ersten Teilsatz zumindest **verdächtig falsch**: eine eindeutige Annahme plus anschließende Informationsfrage sollte nicht die Annahme in eine Frage verwandeln. Der Narrator beschreibt jedoch Stempeln, Eintrag und „ACTIVE“-Schein.

**T26 `#quests`:** der Mossback-Auftrag steht weiter auf `listed`. T27 bittet der Spieler ausdrücklich um Bestätigung; der Narrator antwortet erneut mit angeblich unter seinem Namen aktiviertem Vertrag, obwohl `cmd.interpreted.commands=[]` und keine `quest.status listed→active` gebucht wurde. **T32 `#quests` wieder `listed`.** Der Spieler dringt trotzdem in die Mossback-Warrens vor; die nachfolgende Dungeon-/Kampfmechanik belegt keine regelwirksame Auftragannahme. Dieser Fall ist sowohl ein Planner-Intent-Klassifizierungsproblem als auch eine Erzähl-/UI-Autoritätsinkonsistenz, **nicht** ein beschädigter Eventlog.

**Angrenzender Mage-T24-Befund:** Spieler akzeptiert eine Ein-Kupfer-Koje; Planner bucht `buy=conditional`, Schlafaktion wird `room not booked` abgewiesen. Der Narrator beschreibt dennoch ausdrücklich die Übergabe des einen Kupfers und den Eintrag ins Hausbuch, während keine Transaktion ersichtlich ist. Mage T6 hatte außerdem einen Planner-JSON-Failsoft; Wiederholung T7/T8 schafft die reguläre Gildenregistrierung. Beide Fälle getrennt gegen die vorhandenen Preis-/Planner-Pläne abgleichen.

## 6. E2, PULSE, Quests und Grenzen

- **E2:** 12 Wiederbegegnungen über alle drei Runs (6/4/2); insgesamt 10 persönliche Absprachen/Threads (7/3/0) mit späteren Updates. Die `handled_by`-Runner-Metrik bleibt niedrig: **0/3 Warrior, 0/3 Rogue, 1/2 Mage**. Keine pauschale `met`-/Desk-Handler-Lockerung; frühere GPT-Hinweise zur Differenz zwischen tatsächlich gebuchtem Wissen und Evaluatorzählung gelten weiterhin.
- **PULSE:** **89** Würfe (49/23/17), **20** offene Fenster (13/4/3), natürliche Reise-, Szenen- und Rastproben. Null Dungeon-PULSE-Würfe/-Wanderer und null Rast-Unterbrechungen im Runner sind **nicht abgedeckt**, nicht bestandene Nullfälle. Warrior 25 abgelehnte `attack_commitment` sind Schutzsignale, nicht automatisch 25 Fehlfunktionen.
- **P2 nach .180–.182:** Alle drei echten Runs erreichen Gildenregistrierung und wenigstens einen abgeschlossenen Guild-Vertrag; der Mage hat eine separat belegte nicht gebuchte *zweite* Questannahme. Für die spezifische .179-Ortsdrift (narrativ am Zwischenort, Spawns/Killcredit am alten Gildenort) liegt hier **keine gleichartige bestätigte Wiederholung** vor; `no_go`, `met_without_arrival` und einige uneindeutig offene PULSE-Fenster bleiben Beobachtungspunkte. Weder vollständige P2-Freigabe noch Beweis eines identischen Rückfalls.
- **Narration/Mechanik im Mage-Dungeon:** Tod T39 bei 0 HP nach Kämpfen gegen zwei Lookouts ist im Log regelgebucht; eine Geschichte über mit Bogen bewaffnete Gegner sollte gegen die tatsächlich gebuchten Angriffstypen geprüft werden, bevor daraus eine Kampfregelabweichung konstruiert wird.
- **ST:** Die natürlichen Runs benutzen laut Protokoll ST 1.19.0, aber der ausdrücklich geforderte **Standard-/Failsoft-Smoke in einer isolierten Installation mit eigener Datenwurzel** ist damit nicht automatisch als bestanden dokumentiert. `run_c.mjs` keinesfalls gegen persönliche Daten ausführen.

## 7. Gegenreview an Claude – begrenzter Prüfauftrag

Bitte auf Basis der beigegebenen schmalen Originalquellen **unabhängig** überprüfen:

1. Rogue T39–T43: bereits gebuchte 3 cp, offene `#pay`-Karte für 4 cp, erzählte 7 cp sowie die tatsächlich defekten Extractor-/Repair-Antworten **getrennt** analysieren. Kleinstmögliche robuste Abhilfe nur **vorschlagen**, nicht ungefragt implementieren.
2. Mage T22/T27 und T24 mit Planner-Commands, Engine-Outcome und Narrator vergleichen: warum `quest.accept` trotz eindeutigem Hauptsatz als `question` fällt und wie falsche „ACTIVE“-/Zahlungszusagen vermieden werden. Technischen Fix gegen ähnliche echte Fälle abgrenzen.
3. E3: Alle 9 Fakten prüfen, ob `voice/manner/interest` sinnvoll und durch eigene Worte/Handlungen **dauerhaft** belegt sind; Speicherung, Karten/Promptpräsenz und echte Wiederverwendung getrennt bewerten. Keine automatische Erweiterung der Firewall.
4. Gegen .179 offene Orts-/PULSE-Probleme und E2-Schalterbelege nur soweit die neuen Originale es tragen. Keine neuen Großaudits, Roadmapänderungen oder PULSE-Neubalancierung.

**Priorität:** zuerst blockierende Modell-/Buchungsinkonsistenz, dann bessere E3-Wertqualität/Auslieferung. Dieses Review ist ein unabhängiger Befund, **keine Implementierungsfreigabe**. **Gegenreview-ZIP:** vom Nutzer separat bereitgestellt, ohne Screenshots/große Logs; die vollständige Original-ZIP ist nicht im Repository.
