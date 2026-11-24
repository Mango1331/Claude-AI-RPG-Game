# Vergleich: 10B-Langtests, persönliche Userruns und neuer Helfer-LLM-Runner

**Arbeitsnotiz vom 24.11.2026; keine Produktabnahme und kein Patchauftrag.** Anlass: Ein neuer natürlicher Run auf `.211` endete nach 24 Eingaben mit einem Extractor-/Providerproblem; der Testspieler geriet zuvor in eine Reise-Wiederholung. Vergleich mit den früheren 200–421-Eingaben-Abnahmen und den vorhandenen persönlichen Tests. Die Testetappe läuft weiter.

## 1. Quellen, Stichprobe und zulässige Aussagen

**Historische automatische 10B-Tests:** Die alten [Batch-22](../archiv/batch-20261101-174704Z/REVIEW.md), [Batch-24](../archiv/batch-20261102-054921Z/REVIEW.md), [Batch-26](../archiv/batch-20261103-015806Z/REVIEW.md), [Batch-27](../archiv/batch-20261103-103117Z/REVIEW.md) und [Batch-28](../archiv/batch-20261103-171839Z/REVIEW.md) wurden anhand der archivierten unabhängigen Originalreviews geprüft. Für Batch 22 war zusätzlich der vollständige [Rogue-Runnerlog (282 Eingaben)](../archiv/batch-20261101-174704Z/003-guild-rogue/20261101-181218Z-current_test/run.json) und seine [Evaluation](../archiv/batch-20261101-174704Z/003-guild-rogue/20261101-181218Z-current_test/evaluation.json) direkt auslesbar. **Die historischen großen komprimierten Originalchats der übrigen Batches wurden in dieser Studie nicht erneut binär entpackt**; deren Einzelbefunde und Validierung stammen aus den verlinkten damaligen Reviews.

**Persönliche Testverläufe, direkt neu ausgewertet:** [User05 Phase C](../archiv/user-20261118-011503/originals/phase_c_chat.jsonl), [User07 Phase 2](../archiv/user-20261121-171341-204/ORIGINAL_CHAT_PHASE2.jsonl), [User08](../user-20261122-161817-205/originals/chat.jsonl), [User09](../user-20261123-042623-207/originals/chat.jsonl), [User10](../user-20261123-075443-207/originals/chat.jsonl) und [User11](../user-20261124-014928-208/originals/chat.jsonl). Vorhandene fortgesetzte Chats jeweils nur einmal gezählt. Insgesamt 130 Spielernachrichten, 112 Erzählernachrichten, 105 angewandte Extractorabschlüsse, 1 offen/pending, 0 als fehlgeschlagen gespeicherte Abschlüsse, aber 16 `repaired:true`-Abschlüsse und **70 verworfene Einzeldeltas**. Eine verworfene Delta-Zeile ist **nicht** automatisch ein kaputter Spielzug.

**Neue Einzelrun-Stichprobe:** Die unmittelbar hochgeladene [24-Züge-ZIP laut Manifest](SOURCE_MANIFEST.json) wurde vollständig gelesen, alle 13 enthaltenen Dateien per ZIP-CRC geprüft, Git-Commit `1d3171d756f8`, ZIP-SHA-256 `bf35564f47b76b9ca8847fbc00f01038d0c69f7293e5213fb7a08edab877f7f0`. Zwei vorherige kurze Runs und der 58er-Lauf sind in [README](README.md) und [Beobachtungen](BEOBACHTUNGEN.md) separat dokumentiert. Die ZIP-Originale sind bis zum lokalen gesicherten Import noch **nicht** im Git-Repository vorhanden.

## 2. Was die alten langen 10B-Läufe tatsächlich zeigen

| Alter Batch/Build | Belegter langer Lauf | Was trotz langer Laufzeit schiefging |
|---|---|---|
| Batch 22 / `.146` | Rogue: **282 Eingaben**, Level 15 + E-Klasse; letzter Save-Fehler | 30 Extractor- und 30 Planner-Reparaturen; zwei erfolgreich abgefangene Extractor-Transportprobleme; 1 sichere Fortsetzung |
| Batch 24 / `.150` | Warrior: **282**, Rogue: **314** Eingaben | Rogue-Abbruch durch `Failed to fetch` im Planner; viele Zahlungs-/Preis- und Questreibungspunkte, obwohl die Zustandsvalidierung im geprüften Batch fehlerfrei war |
| Batch 26 / `.152` | Warrior: **338**, Mage: **183** Eingaben, beide E-Klasse | Sieben sichere Fortsetzungen; einzelne Extractor-Formatfehler/Length-Recovery; beim Warrior ein lokaler Objektidentitätsfehler trotz gültigem Endfold |
| Batch 27 / `.153` | Warrior: **356**, Mage: **176**, beide E-Klasse | Rogue stoppt nach drei fehlgeschlagenen Worldberichten zu einer Beute-ID; beim Mage Zahlungsschleife, aber Langlauf regulär beendet |
| Batch 28 / `.154` | Warrior: **421 Eingaben**, Level 15 + E-Klasse | **69 Extractor-/33 Planner-Repairs**, sechs sichere endgültige Modellfehlversuche. Die Kampagne bleibt fortsetzbar; außerdem eine Objekt-/Rüstungsidentitätsinkonsistenz |

**Schluss:** Die historische Freigabe stützte sich zu Recht auf **lange funktionsfähige Kampagnen und gültige Spielzustände**, nicht auf null Extraktionsfehler. Aus 200 oder 400 Eingaben folgt keine hundertprozentige Narrator-/Extractor-Korrektheit. Einige Fehler wurden sicher abgefangen und der Lauf fortgesetzt; andere stoppten einzelne Profile. Wie oft ein endgültiger Fehler auftritt, hängt stark von der tatsächlich erreichten Spielsituation ab.

## 3. Unterschiede in der geschriebenen Spielerhandlung

Die Werte verwenden **nur Eingaben nach den zwei Erstellungsschritten** und zählen nicht die Länge der JSON-Notizen des LLM-Spielers.

| Sprecher / direktes Material | Nachrichtenzahl | Ø Länge | Median | Über 120 Zeichen |
|---|---:|---:|---:|---:|
| **Mensch**, sechs persönliche Chatstände | 118 | **57,1 Zeichen** | 51 | 4 % |
| **Alter 10B-LLM-Spieler**, Rogue Batch 22 | 280 | **98,2 Zeichen** | 98 | 24 % |
| **Neuer Helfer-LLM-Spieler**, Run 21:43 | 22 | **128,5 Zeichen** | 126,5 | 55 % |

Qualitativ schreibt der Nutzer überwiegend **einen kurzen, aktuellen Handlungs- oder Dialogimpuls** und reagiert bei erkennbaren Begrenzungen gezielt. Es gibt durchaus Kombinationen (`*i leave ... and make my way back ... to turn in the quest*`) und Missverständnisse; die persönliche Eingabe ist nicht perfekt oder besonders restriktiv.

Der alte erfolgreiche 10B-Spieler verwendet meist knappe, aber etwas ausführlichere Ich-Anweisungen (`I take the slip and head out of the Guild, following the towpath ...`); bei Kämpfen, Handel und Reisen sind dennoch Kombinationsaktionen üblich. Der neue Helferspieler **verkettet häufiger Gespräch, Weg, Ankunft und anschließende Tätigkeit** in einer Eingabe und versucht nach Misserfolg dieselbe Zielabsicht mit neuen Worten, teils ohne die erforderlichen Ortsbedingungen zu ändern.

Diese deutlich größeren Spielereingaben können semantische Anforderungen erhöhen. Aber **die aktuelle Engine hat ebenfalls strengere Reise-, Zustimmungs- und Besitzregeln** als die historischen `.146`–`.154`-Runs. Ohne gleiche Ausgangswelt, Modellroute und Build lässt sich nicht seriös berechnen, wie viel der Unterschiede vom Spielerprompt statt vom aktuellen Enginevertrag herrührt.

## 4. Antwortverhalten des Narrators

Die gemessene Erzähltextlänge erklärt den Unterschied **nicht**:

| Direkt gelesene Chatbeispiele | Erzählerantworten | Durchschnittliche Länge |
|---|---:|---:|
| sechs persönliche Chats | 112 | **1.516 Zeichen** |
| neuer 24-Eingaben-Run | 20 sichtbare Narrator-Nachrichten einschließlich der letzten fehlgeschlagen extrahierten | **1.512 Zeichen** |

Daraus folgt **keine** generelle Verbesserung/Verschlechterung der Erzählqualität, aber die einfache Hypothese `neue Character Description ⇒ deutlich längere Narratorantwort ⇒ X überfordert` ist in diesen Stichproben **nicht bestätigt**.

Entscheidend ist bei Ortswechseln die **Behauptung neuer Zustände**. Im neuen Lauf erzählt der Narrator mehrfach die Ankunft an der `first true gallery` in Glimmerdeep; der Extractor übernimmt das entsprechend. Die Engine verweigert **fünf `arrive`-Deltas** als `passage`: *die Galerie liegt in Glimmerdeep Grotto, wohin der PC von seinem autorisierten Startpunkt nicht aufgebrochen ist*. Zusätzliche lokale Kreaturen-/Faktendeltas werden oft mit `scene_context` abgelehnt (**17 einzelne Deltas über den ganzen Lauf**). **Kein bestätigtes `scene.moved` in den T17–T24-Zielversuchen.** Das ist inhaltlich **eine wiederkehrende Reise-/Szenen-Inkongruenz**, nicht fünf unabhängige schwerwiegende Bugs. Engineablehnung schützt hier den Zustand, macht den Spielerfortschritt aber unbefriedigend.

Der Testspieler versucht an T17, T19, T20, T22 und T24 erneut die Galerie zu erreichen; T18 greift sogar einen noch nicht am bestätigten Ort vorhandenen Slime an, T21/T23 versucht er zunächst die Wächterhütte zu verlassen. Ein erfahrener Spieler würde **möglicherweise** zuerst den tatsächlichen Standort, das Dungeon-Tor oder den Weg klären; dass dies den aktuellen Enginevertrag zuverlässig lösen würde, ist nicht getestet.

## 5. Der neue Extractor-Abbruch – technisch präzise

Run `20261124-214323Z`: **24 Eingaben, Level 1, 73 physische Engine-Requests**, Spiel 5:07 min, Gesamt 6:23 min. Darunter 7 Planner- und 5 Extractor-Reparaturen, 1 sicher fortgesetzter Plannerfehler. Alle Requests verwenden `z-ai/glm-5.3-flash`, `reasoning_effort: low`, `provider.order: [wafer/us]`, Fallback aus.

Bei **T24** endet der erste Extractor-Request **regulär mit `finish_reason: stop`**, aber seine Ortsreferenz hat eine **falsche Form**: `{"new":"first true gallery",...}` statt `{"new":{"name":"first true gallery","kind":"interior","parent":"..."}}`; dieselbe falsche Form kommt in `scene`, `expected.1.at` und `arrive.at` vor. Der verifizierte Reparaturprompt nennt genau diese Typfehler. **Der danach gesendete Reparaturrequest** hat **keine Response**; das originale Serverlog enthält OpenRouter **HTTP 429, `temporarily rate-limited upstream`, Provider Wafer**. Avereth protokolliert deshalb `Remote completion is unknown. No automatic retry was sent.` und stoppt sicher.

Die **Reparatur wurde also durch ein wirklich ungültiges Extraktionsschema ausgelöst; der endgültige Abbruch entstand durch den ungewissen Providerabschluss**. Es war weder eine reine 4.000-/6.000-Reasoning-Erschöpfung noch einfach nur ein zu lang erzählender Narrator. Die zuvor verworfenen Galerie-Ankünfte betreffen ein separates semantisches Buchbarkeitsproblem.

## 6. Bewertung und Entscheidung für den weiteren Testblock

- **Persönlicher Run:** 105 erfolgreich angewandte Extraktionen bei 16 Reparaturen und keinem endgültigen X-Fail im ausgewerteten Ausschnitt; dies passt zum subjektiv geringeren Problemgefühl. **Nicht gleichzusetzen** mit `nie Probleme`: 70 Einzeldeltas wurden abgelehnt, ein weiterer Worldabschluss war im Quellchat noch pending. Die persönlichen Runs sind außerdem wesentlich kürzer und stammen aus anderen Versionen.
- **Historischer LLM-Run:** 282–421 Eingaben **trotz** Modellreparaturen, Providerproblemen, Gameplayreibung und gelegentlich sicherer Fortsetzung. Diese Langlaufleistung muss bei der neuen Gesamtbewertung berücksichtigt werden, nicht durch einzelne kurze `.211`-Abbrüche entwertet werden.
- **Neuer LLM-Spieler:** deutlich längere/komplexere Aktionen und Wiederholungsspiralen; sein Verhalten *verstärkt* belegte bestehende Reise-/Szenen-Reibung. Die Narrator-Länge ist dagegen fast identisch zu deinen Runs. **Keine bewiesene alleinige Kausalität des Testspielerprompts.**
- **Priorisierung erst nach weiteren Läufen:** Seltene fortsetzbare Prosa-/NPC-Abweichungen tolerieren, aber **wiederholte blockierte Reisen**, nicht gebuchte Questabschlüsse und echte beschädigte Zustände gesondert markieren. 429/Transport-/Reasoning-/JSON-Schemafehler unterscheiden; nicht alles `Extractor kaputt` nennen.
- **Noch kein Patch:** Bestehender Entwicklungsbranch bleibt eingefroren für weitere automatische Läufe und einen anschließenden **persönlichen** Spieltest. Danach die *wiederkehrenden Ursachen* und das tatsächliche Spielerlebnis gemeinsam reviewen; ggf. getrennt Runner-Spielerverhalten (ein Schritt, Standort/HUD prüfen nach `NOT ARRIVED`) und Engine-Vertrag vergleichen. Ein einzelner Transportfehler rechtfertigt keinen pauschalen Providerfallback oder zusätzliche risikoreiche Generierungsversuche.

[Zuordnung/Hash des aktuellen ZIP](SOURCE_MANIFEST.json) · [Befundjournal](BEOBACHTUNGEN.md) · [Laufserie](README.md) · [historische Batcharchive](../archiv/README.md).
