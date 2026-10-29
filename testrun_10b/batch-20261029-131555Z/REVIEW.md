# GPT-Originalreview – Batch 14 / .117, Rogue-Lauf manuell abgebrochen

**29.10.2026.** Originalupload `batch-20261029-131555Z.zip`: 68.467.888 Bytes, 48 Einträge, vollständiger ZIP-CRC-Test erfolgreich, SHA-256 **`4ca6fe95aa7213b19dbd6ce6d024addc3d6831a3eb25591a4ac1e5fe0a2f6ada`**. Grundlage: originale `batch.json`, alle drei `run.json`/`evaluation.json`, sämtliche 5.696 Engineevents, protokollierte Kampf-Records, Handels-/Questbuchungen und ausgewählte Spielerinputs. **Original-ZIP nicht auf GitHub hochgeladen.** Nur Review/Index, keine Code- oder Balanceänderung. Keine neu selbst ausgeführte vollständige Engine-`foldChat`-/`validateState`-Probe; `integrity: OK` sind die gespeicherten Live-Statusmeldungen.

## 1. Zensierter Lauf: Abbruch nicht als Tod oder technisches Scheitern zählen

Alle drei Kampagnen sind frisch, `4.3.0-c.6.6.117`, Produktcommit **`a9a76eb3db94`**, Ruleset2/V4-C, `starter_aoe:true`, echte LLM-Spieler ohne Stub. `git.dirty=[]`, `profileUnchanged=true`, `secretHits=0`. Testhorizont: 150 Spielerinputs beziehungsweise Level15, nicht erreicht.

| Profil | Spielerinputs | Runner-Ende | Endlevel | tatsächlich begonnene Engine-Turns | `extract.applied` | Kampfbilanz | Gildenabschlüsse |
|---|---:|---|---:|---:|---:|---|---:|
| Guild-Warrior | **150/150** | reguläres Inputlimit, lebt | **8** | 135 | 133 | **12/12 Siege** | **5** |
| Guild-Mage | **150/150** | reguläres Inputlimit, lebt | **9** | 132 | 130 | **17/17 Siege** | **7** |
| Guild-Rogue | **117 begonnen, 116 abgeschlossen** | **manuelles Ctrl+C während Input117**, lebt | **6** | 96, einschließlich begonnenem unvollständigem Input | 93 | **8/8 Siege** | **4** |
| Gesamt | **417 Eingaben angefangen / 416 erfolgreich abgewickelt** | 2 Limits, 1 manueller Stopp; **0 Kampftode** | | 363 | 356 | **37/37 Siege** | **16** |

**Unmittelbarer Abbruchbefund:** `batch.status=interrupted`; Rogue-`run.end={kind:"harness",why:"interrupted (Ctrl+C) in turn 117"}`; der Batch-Wrapper führt den dritten Prozess als `process_error` (Exit1). Die `serverErrors` enthalten dabei **ein** `Generation failed AbortError: The operation was aborted`, passend zum Ctrl+C; kein unabhängiger Engine-/Providerabbruch oder Kampftod. Die Eingabe 117 (Frühstück bei Mother Hale, Weg zur Ashbridge-Gilde, Board ansehen) hatte die Planungs-/Boardphase und `outcome.recorded` schon erreicht; **Narratorantwort und Extraktion fehlen**. Die dabei erzeugten `quest.created`-/`board.refreshed`-Events gehören zur begonnenen Vorbereitung und sind **kein Beleg für vollendete Ankunft oder Abgabe**. Alle Kampf-, Auszahlungs-, Wachstums- und Ortsbefunde werden nur **bis zum tatsächlich vorhandenen letzten Zustand** gewertet. Die Statistik ist **rechtszensiert**: Der Rogue wurde nicht „besiegt“, erreichte aber auch nicht nachgewiesen das 150er-Limit.

**Integrität:** Alle letzten Engine-Statuszeilen `integrity: OK`, keine PageErrors; bei Warrior/Mage keine ServerErrors, beim Rogue ausschließlich oben genannter Abbruch-Error. **Warrior `safeContinuations=2`** wegen zweimalig nicht repariertem Planner-`sell`-Preis; Mage und Rogue je `safeContinuations=0`. `planner_repaired`/`extraction_repaired` sind Vorstufen mit erfolgreicher Reparatur und nicht mit finalen Fehlern gleichzusetzen.

## 2. Natürlicher AoE-Abgleich: nun alle drei Klassen wirklich mehrzieltauglich

Die Starterauswahl wurde tatsächlich vorgenommen: Warrior **Cleave + Quick Slash**, Mage **Arcane Bolt + Arcane Wave**, Rogue **Razor Cut + Fan of Blades**; Basic Attack zusätzlich. Aus den `outcome.recorded.outcome.kind=combat`-`records` wurden **nur mechanisch ausgeführte PC-Angriffe** gezählt, nicht Spielerwünsche, Plannerpläne oder Erzählungen.

| Klasse | AoE-Skill | gebuchte Anwendungen | Anwendungen mit mindestens 2 Strikes | gesamte mechanische Strikes |
|---|---|---:|---:|---:|
| Warrior | Cleave | **9** | **4** | **14** |
| Mage | Arcane Wave | **8** | **4** | **15** |
| Rogue | Fan of Blades | **8** | **2** | **10** |
| Gesamt | | **25** | **10** | **39** |

**Reproduzierbare Beispiele aus Originalevents:**
- Warrior Cleave Chatindex **147** trifft **drei** Gorse-Wölfe in ENGAGED für **33/36/41** Final Damage bei **einmal 10 STA**. Weitere Doppelziele: zwei Ratten (**27/26**), zwei Wölfe (**32/30**), zwei Wölfe (**32/35**). Die späteren Einzelziele kosten teilweise **9 STA** statt 10 – nachvollziehbarer Proficiency-/Kostenfortschritt, kein kostenloser Angriff. **Cleave P2** ist in späteren Encounter-Snapshots gespeichert.
- Mage Arcane Wave Chatindex **279** trifft **fünf** Bog Striders im **MEDIUM**-Band für **78/80/89/79/88** Final Damage bei **einmal 14 MP**. Andere Mehrzielaktionen auf MEDIUM beziehungsweise SHORT enthalten zwei Ziele. Acht Wellen insgesamt; keine pauschale Mehrband-Beschädigung nachgewiesen.
- Rogue Fan of Blades Chatindex **109** trifft **zwei** Gaunt Wolves auf SHORT (**27/27**) bei **einmal 10 STA**. Chatindex **215** trifft zwei Great Grey Wolves auf SHORT (**39/40**) für ebenfalls einmal 10 STA. Dies sind die **ersten natürlichen zweifachen Fan-Treffer in unserer Serie**. Acht Anwendungen insgesamt, zwei Mehrzielaktionen.
- Gelegentliche `illegal`-Angriffe wegen nicht erreichter Bänder sind tatsächlich ohne Schadensbuchung; insbesondere Cleave-ENGAGED und Fan-maximal-SHORT bleiben begrenzt. Das ist noch ein Taktik-/Bewegungsproblem des LLM, kein Nachweis eines defekten Zielsystems.
- In diesem Batch keine bestätigte Verletzung unbeteiligter NPCs durch AoE. Das entfernt **nicht** die in Batch13 nachgewiesene Friendly-Fire-Regel.

**Bewertung:** Die neue AoE-Semantik ist nun **für alle drei Klassen in echten Mehrzielkämpfen** nachgewiesen. Es folgt daraus noch keine kontrollierte Aussage zur Klassen-Sterbewahrscheinlichkeit, weil Begegnungsauswahl, Monsterlevel und Spielweise stark variieren. Kein Anlass für einen sofortigen AoE-Schadensbuff/-nerf.

## 3. Fortschritt, Gilde, Skills und Geld

**Warrior:** Zwölf gewonnene Encounter, darunter Mehrgegnerkämpfe; **fünf** echte Gildenabgaben mit üblichen Guild-Auszahlungen/Quest-XP. Level **8** statt im vorigen Batch13 bei 150 Inputs Level1. Bei Input100 Level6 und 343 cp, zuletzt gebuchtes Bargeld **614 cp**. Nach drei qualifizierten Kampfbelegen tatsächliches Breakthrough-Angebot und Annahme **Iron Ward Riposte** (`dyn.guarded_iron_strike`; gebuchtes `skill.defined`, `skill.learned`, `growth.decided=accepted`). Warrior Basic Attack mehrfach verbessert, Cleave P2. **Zwei** sicher fortgesetzte Plannerfehler beim Versuch, Loot zu verkaufen (Runner-Eingabe 54: Angebot „drei Silber zehn Kupfer“ = **40 cp**, Planner wählt `min_cp=30`; Eingabe 89: „vier Silber drei“ = **43 cp**, Planner behauptet `min_cp=240`). Ungültige Verkaufszustimmung wurde nicht gebucht; später drei echte Verkäufe zusammen **77 cp**.

**Mage:** **17 Siege**, 24 mechanisch besiegte Gegner, **sieben** vollendete Guild-Aufträge. Level **9**, Checkpoint100 Level7 und 669 cp, zuletzt gebuchtes Bargeld **993 cp**, HP150/MP412 am Testende. Die wertvollen F-Strider-Jagden und einige gruppenbezogene Arcane Waves erklären mehr Fortschritt als beim Rogue. Kein neuer aktiver Skill oder Gearwechsel. Viele Extractorantworten mussten repariert werden (**18 `extraction_repaired`**), aber alle konnten in diesem Lauf abgeschlossen werden; **kein finaler Planner-/Extractorfehler**, 0 sichere Fortsetzungen. Keine Behauptung, dass alle 150 Inputs 150 Kampf-/Fortschrittsaktionen waren.

**Rogue (bis zum Abbruch):** **8/8 Encounter gewonnen**, davon mehrere gegen Gruppen, **vier** gebuchte Guildabschlüsse. Level **6**, Checkpoint100 Level5/376 cp, zuletzt gebuchtes Bargeld **367 cp** (nach echter Heilung und Bettkauf bei Mother Hale). Fan of Blades wird im echten Kampf genutzt, Razor Cut ergänzend. Ein schwerer **Zwei-Grauwolf-Kampf** endet mit einem seltenen, tatsächlich angenommenen passiven Durchbruch: **Wolf-Won Grit** (`dyn.passive_unbroken_stance`), aktiviert bei höchstens 50 % HP, **DEF +4 und 10 % weniger erlittener physischer Schaden**; Nachweis `passive.defined`/`passive.gained` bei Chatindex 223. **Kein Tod und keine technische Finalstörung vor Ctrl+C.** Die offene Jagd auf den vierten Thornfell-Wolf wird nicht als abgeschlossen ausgegeben; Input117-Board wird nicht als vollständig erzählte/ausgeführte Questaktion gewertet.

**Ausrüstung/Wirtschaft:** In **allen drei Profilen null `equipmentChanges`**. Zuletzt Warrior **614 cp**, Mage **993 cp**, Rogue **367 cp** bei Starterwaffen und Starterrüstungen. In den tatsächlich gebuchten `offer.created` stehen Gildenregistrierung, Primer, Speisen, Schlafplätze, Heilung und Lootankäufe, **kein konkretes Waffen-/Rüstungsupgrade-Angebot**. Das ist im dritten aufeinanderfolgenden AoE-Batch eine belastbare *Nutzungslücke*, jedoch **kein** Beweis dafür, dass hochwertige F-Waffen falsch bepreist oder zu schwach sind; es fehlen überhaupt passende Kaufversuche/Offerten. Der Einkaufs-Runnerhinweis `846a7c` allein hat noch keinen echten Händlerkauf ausgelöst. Händlerfindung/Spielerzielsetzung nach ausreichender Vergütung gezielt prüfen, ohne blind mehr Geld oder Waffenschaden zu vergeben.

## 4. .117-Feature: Abgaben funktionieren – neue Filialgründung natürlich nicht getestet

Die alte Batch13-Schleife (Warrior **43 verweigerte Turn-ins** trotz READY, Level1 nach 150 Inputs) wiederholt sich in dieser Serie **nicht**; alle drei Klassen können Guild-Aufträge an den bereits **vorhandenen** Hallen abgeben, 16 registrierte Abschlüsse insgesamt. Das ist ein guter Spielflussbefund.

**Wichtige Testgrenze:** Es gibt in den 5.696 gebuchten Events **kein** `guild.branch`-Extraktionsdelta mit funktionaler Anerkennung, **kein** `place.updated` mit neuem `guild_hall`-Tag und **keinen** neuen kanonischen Gildenstandort. Die erfolgreichen Abgaben belegen deshalb **nur die vorhandene Gildenfunktion**, nicht die neue generative Filialgründung aus .117. Das Original-Stonebrook-Fixture und die 18 Regressionen bleiben dafür der technische Nachweis. Keine Aussage, dass der natürliche Planner/Extractor das neue Delta im richtigen Moment zuverlässig auslöst, und kein Beleg für den zuvor angesprochenen seltenen Elternzyklus-Grenzfall.

**Künftiger Test:** Wenn eine funktionale neue Gilde ausdrücklich in einer fremden Siedlung erzählt wird, beobachten, ob `guild.branch` korrekt nachweisbar ist, ob die Engine eine vorhandene Ortsidentität wiederverwendet und ob GO→READY-Abgabe erst nach Ankunft genau einmal vergütet. Keine künstlich automatisch an jeder Siedlung entstehende Zahlstelle.

## 5. Technische Priorisierung und nächster Batch

- **Kein bestätigter neuer fataler Engine-/AoE-/Gildenfehler.** Manuelles Rogue-Ctrl+C ist eine **externe Zensierung**, kein Rogue-Tod, keine ausgefallene Recovery und keine fehlerhafte laufende Enginehandlung. Ein gesonderter `AbortError` im Serverlog ist unmittelbar durch die Unterbrechung erklärbar.
- **P2/Beobachtung:** Warrior 2× `planner_failed` bei Verkaufspreisen; diese Form der Diskrepanz wurde bereits in vorigen Batches beobachtet. Kein falscher Geldfluss, aber zwei verloren gegangene Aktionen; eng gefasste Quotierungs-/Gesamtpreisprobe bei weiterer Häufung statt globaler Lockerung der Zustimmung.
- **Nutzungslücke Gear:** Obwohl alle Klassen ausreichend Geld aufbauen, gibt es erneut keine aufgezeichneten Upgradeangebote/Anlagen. Als separates Gameplay-/Runnerziel behandeln, nicht die .114-Balancezahlen anpassen.
- **Gildenfeature:** Testreihe erfüllt **nicht** den eigentlichen neuen .117-Live-Abnahmefall. Das ist eine Abdeckungslücke, kein Fehlerbeleg. Die zuvor separat gemeldete mögliche Vorfahr-/Nachfahr-Ortszykluskonstellation wurde hier ebenfalls nicht natürlich getroffen.
- **AoE:** Jetzt alle drei mehrzieltauglich belegt. Kein vorsorglicher Patch an Kosten, Damage, Ressourcen oder Monsterstatistik.
- **Progressionsziel:** Bis zu den tatsächlichen Enden Level8/9/6, **niemand Level15**. Der manuelle Rogue-Stopp darf nicht in eine künstlich niedrige Langlauf-Erfolgsquote oder eine Niederlage umgerechnet werden. Für einen neuen Batch ist ein frischer Start möglich; relevante Originalturns werden bei Gelegenheit gegen .117-Filialfeature und Gear-Nutzung verglichen.

**Status:** Original-ZIP im Chat, Review und Index auf GitHub `main`; Produktbranch und Runner unverändert.
