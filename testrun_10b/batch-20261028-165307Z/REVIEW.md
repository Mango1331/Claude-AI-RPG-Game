# Unabhängiges GPT-Review – erster natürlicher F-Balancebatch .114 (20261028-165307Z)

**Stand 28.10.2026.** Originalexport geprüft und gegen die tatsächlich implementierte [F-Balance-Patchnote .114](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/89aaf08d131344b703172e349a3f5557f531d234/avereth-engine/docs/PATCH_F_BALANCE114.md) abgegrenzt. **Nur Auswertung; keine Engine-/Content-/Runner-/Test-/Balanceänderung.**

## 1. Belegbasis und Enden

Original-ZIP `batch-20261028-165307Z.zip`, **SHA-256 `84a14c1e419ccbf68f63417275869b8d3a7dadb7c013459cc12eb3cde9f8dfcc`**, ca. 35 MiB, **51 ZIP-Einträge**, vollständige CRC-Prüfung fehlerfrei. Original liegt im Chat als Upload; weder ZIP noch Serverlogs/Geheimnisse auf GitHub übernommen. Alle drei Runs auf **4.3.0-c.6.6.114**, Produktcommit `89aaf08d131344b703172e349a3f5557f531d234`, sauberer Gitstand, echte GLM-5.3-Flash-Aufrufe über den lokalen OpenAI-kompatiblen Gateway, neue Kampagnenpolicy **`campaign.started.f_balance=true`** nachgewiesen.

| Profil | LLM-Spielerinputs | Level | Endgrund | Original-Events / Modellcalls |
|---|---:|---:|---|---:|
| Guild Warrior | **72** | **3** | **Technisch: World Extractor / Repair, Providerantwort „HTTP 200: Internal Server Error“** | 982 / 202 |
| Guild Mage | **89** | **7** | **Regulärer Spielertod** in Kampf gegen 6 Barrow-Boars | 1.321 / 250 |
| Guild Rogue | **58** | **2** | **Regulärer Spielertod** im 3-Hunde-Kampf | 775 / 175 |
| **Gesamt** | **219** | | **1 technischer Stopp, 2 Spielertode** | **3.078 / 627** |

**17 Begegnungen, 15 gewonnene** (Warrior 6/6; Mage 6/7; Rogue 3/4), **sieben ausgezahlte Guildverträge** (Warrior 2; Mage 4; Rogue 1). Alle `run.status` am letzten gebuchten Schritt mit `integrity: OK`; **0 Browser-PageErrors** in allen drei Runs, beim Warrior **ein ServerError** und `evaluation.counts.modelFailures.world=1`. **0 gezählte safeContinuations**. Kein eigener Event-Replay-/npm-Testlauf durch diese GPT-Auswertung; „integrity OK“ ist der in der ZIP gemeldete Runner-/Enginewert.

### 1a. Warrior-Fehler exakt eingrenzen

**Runner-T72**, nach Story-Nachricht **Chatindex 143**, World Extractor für **Index 144**: Die ursprüngliche Extraktion liefert eine ungültige Schemaantwort; der Repair-Prompt bezeichnet konkret **`$.expected: unexpected property "1"`**. Erst der darauf folgende **Extractor-Repair-Aufruf 202** erhält keine verwertbare Antwort, sondern den vom Gateway durchgereichten Fehler **`HTTP 200: Internal Server Error`**. Das Spiel schreibt **`extract.failed`**, die Änderungen der Narration werden **nicht** übernommen und der Runner stoppt mit `extractor_failed`. Davor 6/6 Kampfsiege, bei den früheren Reparaturen kein tödlicher Modellfehler. **Nicht** als defekte Kampfformel, korrupten Spielstand oder bewiesene neue .114-Balance-Regression werten. Die gemischte HTTP-200-Fehlerhülle deutet auf Gateway/Provider-Fehlerbehandlung; deren genaue Ursache ist aus diesem Export nicht unabhängig beweisbar. Eine begrenzte sichere Wiederholung bei echten transienten Gatewayfehlern wäre nur ein separater Robustheitsvorschlag, nicht automatisch ein Balancehotfix.

## 2. Direkte Abnahme des F-Balanceexperiments A+B+C

**Basis:** Das Dokument `PATCH_F_BALANCE114.md` bestätigt: F-Waffen crude/common/fine/superior/exceptional **6/10/14/18/22** und Qualitäts-/Preisaudit für neue F-Kampagnen; Fachhändlerofferten im bestehenden Verkaufspfad; PP-Schwellen **50/75/100**; Lernobergrenzen **40/60 LP/Tag**; Primer **80 cp**; neue Novice-Jagdrichtwerte **30–600 cp** nach L-Band. **Nicht** geändert: XP ×2, Startstats 7, Gruppen/Monster-ATK/HP, Lootpreise, Rüstungen, E-Gear, Aktionsökonomie. Die Patchnote meldet **2227/2227 npm-Tests** und Mock-Smoke 22/22; diese wurden in diesem Review nicht ausgeführt.

| Bereich | Original-Enginebeleg | Wertung |
|---|---|---|
| **A F-Waffen & Fachhandel** | **0 neue `item.equipped` / 0 `equipmentChanges` / 0 F-Waffen-Fachhändler-`offer.created` über alle 219 Inputs**. Die drei Kampagnen besuchen keine im Export bestätigte passende Fachhändler-Angebotskette. | **Kein natürlicher Wirksamkeitsnachweis**, weder kaputte Ausrüstung noch fehlende verfügbare Fachware bewiesen. Der wichtigste A/B/C-Zweck bleibt ungetestet. Nicht noch höhere Stats aus null Käufen folgern. |
| **B schnelleres PP** | Warrior Heavy Slash **P1 0→18→36→P2/4**, jeweils +18 aus 3 qualifizierenden Kämpfen, `need:50`. Mage Arcane Bolt **P1 0→18→36→P2/4→P2/22**, ebenfalls `need:50`. Rogue Razor Cut **P1/18**, `need:50`. | **Neue Schwelle funktioniert natürlich**, PP-Qualifikation bleibt erhalten. Mage zahlt im Endkampf für Bolt **9 MP** bei P2. Kein P2-Rundungsproblem. |
| **B Primer/LP** | Warrior kauft **Primer of Strike −80 cp**, beginnt `learn.1`: **30 LP** aus 120 Min Selbststudium inklusive Skill-Affinity, danach **3×18 Kampf-LP = 84/100**. Rogue kauft **Primer of Bolt −80 cp**, 120 Min Selbststudium ergeben **15/100 LP**. | **Kauf und Teilfortschritt echt**; keine `skill.learned`-Events. Die **40/60-Tagesgrenzen selbst** wurden mit 2h-Sessions noch nicht ausgereizt: LP-Teilwerte sind von tatsächlichen Stunden und Affinity geprägt. Kein Beweis für gescheiterte Lernmechanik. |
| **C anspruchsvollere Guildlöhne** | Alle Boards enthalten gestaffelte **L1/L5/L9/L13**-Beispiele. Warrior 40/140/300/550 cp, Mage 40/130/300/550 cp, Rogue 40/150/320/550 cp. | **Generierung und Staffelung bestätigt.** Tatsächlich ausbezahlte Aufträge meist Einstieg/L5; **keine obere F-L9/L13-Auszahlung**. Wirtschaftliche Angemessenheit bei realem Hoch-F-Risiko weiter offen. |

**Keinen dieser drei Bereiche jetzt wegen dieses Batches pauschal zurückdrehen.** Alle Testcharaktere starteten mit unveränderten Starterwaffen und erreichten im Spielerlauf keinen Fachhändler-Upgradepfad. Der beschleunigte PP- und Primerteil ist verifiziert; der Gear-/Preis-/Upper-F-Nutzen nicht.

## 3. XP, Tempo und tatsächliche Gefahr

| Profil | Kampf-XP | Guild-XP | Kumuliert | XP zum Ziel L15 |
|---|---:|---:|---:|---:|
| Warrior (L3 nach 72) | **448** | **92** | **540** | 5,1 % von 10.500 |
| Mage (L7 nach 89) | **1.764** | **692** | **2.456** | 23,4 % |
| Rogue (L2 nach 58) | **120** | **46** | **166** | 1,6 % |

Der **Mage** gewinnt viel XP durch wiederholt hochstufige Gruppen: **3 Stone Gulls = 432 Combat-XP** (Sprung L1→L3), **4 Stone Gulls = 528** (L3→L5), später nochmals **4 Stone Gulls = 504**. Zwei L5-Guildabschlüsse liefern jeweils 300 Quest-XP. Die Zahlen zeigen die bereits bestehende starke Wirkung von Gegnerzahl und Gegnerlevel auf XP, **nicht** eine Erhöhung des XP-Multiplikators durch .114. Der Rogue nutzt 58 Inputs, von denen ein Teil durch nachvollziehbare, aber für das Questziel ineffektive NPC-Gespräche über Zeugenbestätigung und erneute Vertragsbedingungen verbraucht wird. Gescheiterte/unnötige Engineaktionen von sinnvollem Weltspiel trennen; weder lineare L15-Prognose noch pauschale XP-Änderung begründet.

**Mage Tod – Runner 89/Engine 77:** L7, **112/170 HP** vor dem entscheidenden 6er-Gruppenkampf gegen sechs **L8–11 Barrow Boars**; Initiative der Tiere: zwei L11-Eber vor dem PC. Ein Arcane Bolt trifft zuerst mit 53 Schaden, der nächste mit 53, ein dritter beendet denselben Gegner mit 57. **Vier gegnerische Treffer über 23, 25, 32, 31 Schaden** nehmen PC **112→1 HP**; danach ein weiterer **Gore 25** auf 1 HP → 0, `pc_dead=true`, Kampf-XP **0**. Der LLM-Spieler suchte einen isolierten Eber, aber ein tatsächlich gebuchter Verband von sechs kämpfte; das ist ein deutliches **Gruppen-/Aktionszahlrisiko**, kein nachgewiesener Schadensberechnungsfehler. Die Distanz LONG→MEDIUM und einzelne zunächst korrekt verweigerte Fernangriffe sind Teil der Ausgangssituation. Keine Gegnernerfs aus diesem Fall.

**Rogue Tod – Runner 58/Engine 55:** L2 mit **95 Max-HP**, vor Endkampf noch 84, dann Kampf gegen **3 Hunde L5/6/6**. Spieler verwendet Evasive Step, aber der anschließende Angriff auf Feral Dog F aus SHORT mit ENGAGED-Razor-Cut wird korrekt verweigert. Der nächste Spielertext (`hold my ground and let the dogs come to me`) ergibt eine **Halteaktion ohne eigenen Treffer**, zwei Hunde greifen an. Gegen Ende fällt HP **67→37→8→0**, obwohl zwei der drei Hunde besiegt werden; Kampf-XP **0** wegen Spielertod. **Gegnergruppen sind nicht allgemein zu leicht**, zugleich muss ein neuer Main-/Minor-Patch später Bewegungs-/Aktionsökonomie separat betrachten. Kein Anspruch auf kostenlose Bewegung plus Skill.

**Warrior:** sechs abgeschlossene Kämpfe, kein Tod, aber nur zwei Guildabschlüsse bis zum Providerstopp. Mehrere Wolfkills im Denzusammenhang führen nicht zum von der Guild geforderten Zählerziel am angegebenen Jagdort; Narration und Spieler betrachten Körperfunde teils als Nachweis, **`quest_count` verhindert korrekt falsche Auszahlung**. Die genaue Ort-/Populationenbindung vor einer möglichen Änderung der Gildenlogik gesondert prüfen, nicht ohne Nachweis automatisch Questcredit vergeben.

## 4. Weitere auffällige natürliche Fälle (nicht alle Balancefehler)

1. **Rogue Guild-Board, Runner-T37 / Engine-T37, `board.failed` bei Chatindex 73:** Generator liefert nur vier von fünf gültigen Verträgen; ein „Clear Mossback Warrens Level 1“-Vorschlag wurde zurückgewiesen, weil sein tatsächlich referenzierter Dungeonlevel **2 im E-Rang** liegt und somit kein Novicevertrag sein darf. Originalfehler: `4 valid listings of the 5 asked for; refused: "Clear Mossback Warrens Level 1" (level 2 of Mossback Warrens is Rank E: not Novice work); write all 5`. **Nichtfataler Board-/Generator-Qualitätsbefund**. Rangschutz ist richtig, aber der Boardwunsch scheitert für den Spieler. Separate kleine Generator-/Repair-Sonde, nicht Waffen- oder Kampfbalancing.
2. **Rogue Guild-Quest über vier Hunde:** Vor dem tödlichen letzten Kampf hat der Rogue **drei** tatsächlich gebuchte Dog-Kills (1 + 2); Narration/Spieler behaupten bereits vier und suchen eine Zeugenbestätigung. Der Enginezähler versagt nicht nachweislich: eine erzählte vierte Leiche zählt nicht. Die spätere selbst eingegangene zweite Hundebegegnung gegen stärkere Tiere führt zum Tod. Überlange Gesprächskette und die falsche „vier erledigt“-Prämisse des Testspielers sind UX-/LLM-Strategiethemen, **kein bestätigter Bug des Killzählers**.
3. **Warrior Drowned Otter:** Preis 6 cp für **zwei separate Nachtbett-Linien** (`cot` 2 cp und `box bed` 4 cp) in **einer** ausdrücklich ausgelösten Transaktion; es entstehen **zwei** `service.granted lodging`. Der LLM-Spieler wollte laut Turn 41 **Box Bed plus Stew für 6 cp**. **Möglicher konkreter Planner-/Offer-Line-Zuordnungsfehler**, nicht die zuvor besprochene zweimalige Hospizbuchung und keine ungerechtfertigte Doppelabbuchung derselben Transaktion. Vor Bewertung Original-Offer/Plannerzeilen und beabsichtigten Warentyp gegentesten. Als separate P2-Sonde dokumentiert, **keine automatische neue Zimmerpatchfreigabe**.
4. Keine Fachhändlerofferten/Equipwechsel und keine bis zum Ende wirklich erlernte Zusatztechnik. Nur `growth.progress` und P2-Level werden beobachtet. Der Rogue versucht Bolt-Praxis an einer Armbrust; das ist unpräzise LLM-Spielstrategie, ohne zwingenden Beleg einer defekten Lernformel.
5. **Sicherheit/Replay:** Alle neuen Kampagnen besitzen `f_balance:true`; die Patchnote sichert historische Kampagnen durch Policy-Pinning ab. Nicht aus dieser ZIP rückwirkende Migrationsprobleme behaupten; ältere Saves und späteres Rollback bleiben separate Testpflicht.

## 5. Beschlossene Grenzen vs. Auswertungsempfehlung

- **Das Balanceexperiment A+B+C unverändert weiter testen.** Der Batch bestätigt niedrigere PP-Schwellen, 80-cp-Primer und plausibel gestaffelte Jagdangebote, aber **keinen einzigen neuen F-Waffenkauf**. Er ist zu kurz/zu ungleich, um die F-Qualitätswerte zu buffen oder zu nerfen.
- **Technischen Warriorstopp separat behandeln:** gültiger Narrator, ungültige erste Extraktion, fehlgeschlagener Modellrepair; **Provider-/Gatewayantwort**. Keine .114-Combat-Regression daraus ableiten.
- **Board-T37 und Warrior-T41** als getrennte, nachgeordnete, originale Parser-/Angebots- bzw. Generatorprüfkandidaten notieren, ohne neuen Pflicht-Hotfix vor natürlichen Runs.
- **Nächste Naturbeobachtung:** langer Gildenlauf mit tatsächlich besuchtem Fachhändler und `offer.created` für fine/superior/exceptional, Kauf & Equip und belegtem Vorher/Nachher-Wert; dazu abgeschlossener Primer-Lernpfad (100 LP), L9–14-Hunt mit realer Auszahlung und ggf. nächster Dungeon. Freie Spielerwahl beibehalten: Testaufträge nicht durch Skriptzwang ersetzen. Bei Bedarf diese Ketten als **separate technische Funktionsproben** prüfen, damit Erfolg nicht vom Zufall der LLM-Strategie abhängt.
- **Kein Gameplay-Eingriff aus Gruppensterben allein**; Main-/Minor-Gameplaypatch fachlich separat, nicht in dieser Balanceauswertung verstecken. XP×2, Stats7, Monsterwerte bleiben.

**Status:** Original-ZIP im Chat, Dokumentation auf main; keine Produkt- oder Runneränderung und keine eigenen simulierten neuen Kämpfe.
