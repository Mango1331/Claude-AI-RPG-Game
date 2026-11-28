# Avereth – Fachgrundlage für F→E und die langfristige Entwicklung bis S

**28.11.2026 · GPT · Konsolidierung der Spieltests und des Designs, keine Kanonänderung.**

Referenz: Produkt **4.3.0-c.6.6.261**, [4b637c98](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4b637c981459e1e5ff9f4bd480bc071723fe5bce); Dokumentationsbasis [be20621d](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/be20621d4c775d40e93008a912aebc5eda2aa20e). Die rangfähige technische Vorbereitung .262 ist ein gesonderter Codex-Auftrag und wird hier nicht als umgesetzt vorausgesetzt. Zahlen und Produktpfade beziehen sich grundsätzlich auf .261, soweit nicht ausdrücklich anders bezeichnet.

## 0. Zweck, Quellenstatus und wichtigste Erkenntnisse

Diese Datei ist die zentrale Arbeitsgrundlage für die nächste Claude-Fachanalyse: Progression, Klassen, Kampf, Skills/Passive, Ausrüstung, Wirtschaft, Gilde, Welt/Dungeons, Party und HUD. Sie soll erneutes Lesen sämtlicher Einzelruns für die erste Designrunde ersetzen. Bei strittigen Details sind die verlinkten Primärberichte weiterhin maßgeblich.

**Leseregel:** IST = aktueller Code/Content oder geltender Kanon; TEST = beobachteter historischer oder aktueller Lauf, mit Build bzw. Zeitraum; HYP = GPT-Bewertung/Entwurf, noch keine beschlossene Spielregel; OFFEN = keine belastbare Abnahme oder Entscheidung. Historische Werte sind nicht automatisch heutige Werte. Insbesondere wurden XP, Startstats, Gear, Kampfaktionen, Populationen, Loot, Party und Validierung mehrfach geändert.

### Reichweite der Auswertung

- Historische Serie: alle 22 Einzelrun- und 28 Batch-Hauptreviews auf dem Dokumentationsbranch thematisch durchgesehen, einschließlich der Langläufe bis zum erreichten E-Rang. Die Übersichten im [Archivindex](../testrun_10b/archiv/README.md) bleiben die vollständige Navigation.
- NPC/PULSE: die sechs archivierten Hauptserien .174/.179/.183/.186/.188/.191 thematisch ausgewertet.
- Persönliche Usertests bis 16: Feedback, Reviews und zusammenfassende Folge-/Fachberichte berücksichtigt; nicht jeder ältere Teilreport oder jeder ursprüngliche Log erneut gelesen. User03 ist gesondert als Produktfixture dokumentiert. Neuere OpenRouter-Arme wurden auf Grundlage ihrer gemeinsamen Serienberichte und ergänzender Claude-Auswertung betrachtet, nicht einzeln vollständig neu abgespielt.
- Alte und aktuelle Balancefachpläne, Kanon und Produkt-Content ergänzen Bereiche, für die natürliche Tests fehlen. Eigene neue Replays, Kampfsimulationen, Providerläufe oder vollständige Neuauswertung sämtlicher Original-ZIPs wurden nicht durchgeführt. Einige ältere Quellen existieren auf main nur als Review/Manifest oder verlinkter Export. Die Konsolidierung ist keine lückenlose Neuauswertung sämtlicher Rohdaten oder sämtlicher Node-Tests.
- Der Produktbranch wurde nur lesend untersucht. Ein persönlicher natürlicher Test der Claim+State-Version .261 steht noch aus. Nicht mit fehlender natürlicher Evidenz für *alle* bisherigen Mechaniken verwechseln.

### Kernergebnisse

1. **Level 15 wurde historisch mehrfach tatsächlich erreicht**, inklusive E-Klassenannahmen bei allen drei aktiven Grundklassen. Die frühere Diskussion „Wie kommen wir überhaupt bis Level 15?“ ist nicht dasselbe wie die offene Frage „Ist die vollständige E-Progression spielbar?“. Letzteres bleibt unbeantwortet.
2. XP×5 ist nicht als allgemeiner Fehlgriff belegt. Historische Läufe reichen von 106/168 Inputs bis über 400. Spielstrategie, Gegnerangebot, Reise-/Handelsreibung, Gruppengröße und Questwahl beeinflussen die Dauer erheblich. Das aktuelle Start-/Statwachstum ist niedriger als in Teilen dieses Korpus.
3. **Levelaufstieg alleine ist keine vollständige RPG-Progression.** Skills, Gear, Loot, Geld, Lernquellen und passende Abenteuer müssen gemeinsam wachsen. Historisch erreichten Figuren hohe Level mit Startergear oder wenig Skillentwicklung.
4. Die ersten F→E-Waffenwidersprüche wurden technisch korrigiert; die heutigen E-Waffenwerte steigen gegenüber der gleichen F-Qualität jeweils nur um einen Punkt. Eine E-Einführung braucht eine fachliche Entscheidung zur spürbaren Rangwirkung und zur Überlappung der Qualitäten.
5. Die Welt ist schon im geltenden Lore-Design **keine nach F–S eingefärbte Levelkarte**. Ein Reich, eine Stadt oder ein Wald hat nicht notwendigerweise einen einzigen Machtrang. Höhere Ränge sind auch soziale, institutionelle, ökologische und politische Phänomene. Dies ist die Grundlage für ein skalierbares Weltmodell.
6. Der aktuelle Gilden-/Habitatvertrag blockiert natürliche Proven-Weltjagden; E-Etagen existieren bereits. Technische Rangfähigkeit (.262) und Balancing-/Contententscheidungen (dieser Bericht) sind zu trennen.
7. Party, Handel, Lernen und Ausrüsten sind in jüngeren echten Testarmen als Handlungskette belegt, aber noch nicht als ausgeglichener E–S-Wirtschafts-/Progressionskreislauf.
8. HUD ist Teil des Spielspaßes: häufige Routinehandlungen vereinfachen, echte Entscheidungen erhalten und Anzeigen bei wachsendem Besitz/Skillumfang mitentwickeln.

### Wichtigste Quellen zum Nachschlagen

- [Design-Kanon](../02_DESIGN_KANON.md), [Projektstand](../03_AKTUELLER_PROJEKTSTAND.md), [Ideenkatalog](../04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), [Etappenindex](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [Roadmap](../07_ROADMAP_NACH_10B_ENTWURF.md).
- [Aktuelle Testübersicht](../testrun_10b/README.md), [historische Testübersicht](../testrun_10b/archiv/README.md).
- [Historische Scaling-Studie](../testrun_10b/archiv/scaling_gpt.md), [F-Rang und E-Übergang](../testrun_10b/archiv/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [historische Balance-Ersteindrücke](../testrun_10b/archiv/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).
- [Kontrollierte Ausrüstungs-/Kampfbalance .195](AUSRUESTUNG_KAMPFBALANCE_ANALYSE_195_2026-11-15.md), [Major/Minor und RPG-Vergleich .208](AVERETH_208_MAJOR_MINOR_RPG_VERGLEICH_BALANCE_2026-11-24.md).
- [Natürliche Serie .222–.235](AVERETH_222_235_OPENROUTER_SPIELTESTSERIE.md), [Party und explorative Serie .236–.244](AVERETH_236_PARTY_UND_EXPLORATIVE_SPIELTESTS.md), [Ortssteuerung und Spieltests .245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md).
- [Claude Gesamtarchitektur .261](AVERETH_261_GESAMTARCHITEKTUR_EFFIZIENZ_UND_BETA_REIFE_CLAUDE.md), [Claude revidierter Gegenreview mit Ranginventur](AVERETH_261_CLAUDE_BEWERTUNG_GPT_GEGENREVIEW_UND_NAECHSTE_SCHRITTE.md).
- Produktquellen zum fixierten Commit: [rules.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/content/rules.json), [gear.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/content/gear.json), [monsters.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/content/monsters.json), [lore.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/content/lore.json), [Produktbaum](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine).

---

## 1. Progression: Level, XP, Rangübergänge und Pacing

### 1.1 Heutiger Stand

| Machtrang | Level | Kumulative XP ab L1 bis Eintritt | Gildenrang |
|---|---:|---:|---|
| F | 1–14 | 0 | Novice |
| E | 15–29 | 10.500 | Proven |
| D | 30–44 | 43.500 | Veteran |
| C | 45–59 | 99.000 | Elite |
| B | 60–74 | 177.000 | Master |
| A | 75–89 | 277.500 | Grandmaster |
| S | 90–104 | 400.500 | Legend |

XP-Schwelle zum nächsten Level = 100 × bisheriges Level; kumulativ bis L104 = 535.600. Die Tabelle ist aus der geltenden Formel abgeleitet, keine Aussage über die Dauer späterer Ränge. Die Gildenrangspalte bezeichnet die zugehörige Stufe, **keine automatische Gildenbeförderung allein aufgrund des Levels**.

- Start: STR/VIT/AGI/INT/PER/WIL jeweils 5; bei Klassenwahl einmalig +1 für zwei Favored Stats. Pro Level fünf freie Punkte, keine weiteren zwei automatischen Favored-Punkte; kein HP-/MP-Refill durch Levelup. Die früheren Basiswerte und Wachstumsmodelle sind historisch.
- HPmax = 50 + 5 × Level + 5 × VIT; MPmax = 8 × INT + 4 × WIL; STAmax = 100 (menschliche Basis). Weitere wirksame Boni über bestehende Profile.
- Kampf-XP: Basis 12 × Gegnerlevel × Rank-Gap × Typ × ggf. Stärke; derzeit Reward-Multiplikator 5. Normale/Elite/Boss-Typfaktoren 1/1,5/2,5; Stärke kann den Wert eines schweren Körperplans bzw. starken Individuums zusätzlich beeinflussen. Rank-Gap 0 = 1, −1 = 0,5, −2 = 0,25, +1 = 2, +2 = 4, +3 = 8 (nicht darüber extrapolieren ohne Codeprüfung). XP berechnet sich nach wirklichen Ereignissen.
- Quest-XP: 15 × empfohlenes Level × Questtyp × 5; Minor/Standard/Dangerous/Major 1,5/2/3/5. Rundung gemäß Code vor Reward-Multiplikator. Beispiel Standard L7 = 1.050 XP, L14 = 2.100; normaler L7-Kill im gleichen Rank ohne Zusatzstärke = 420 XP. L15-Charakter erhält für einen gewöhnlichen F-Gegner nur noch die halben Rank-Gap-XP.
- Die ×5-Regel ist ein Balanceversuch, keine bereits endgültig abgeglichene E–S-Kurve. Der tatsächliche Fortschritt in einer dauerhaften Party ist zusätzlich von XP-Aufteilung und den individuellen Rängen abhängig.

Quelle: [progression.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4b637c981459e1e5ff9f4bd480bc071723fe5bce/avereth-engine/src/progression.js), rules.json, Kanon §5.

### 1.2 Was die Tests tatsächlich zeigen

Die ursprüngliche Kurz-/Langlaufserie begann mit deutlich anderen Progressionswerten. Einzelrun 20 (.95) erreichte in 252 Inputs L8; 3.124 XP (1.636 Kampf, 1.488 Quest), 10 Questabschlüsse, 27 Outdoor-Begegnungen auf L1. Das war sowohl ein XP- als auch ein Inhalts-/Gefahrenverteilungsproblem. Run 21 zeigte anschließend eine falsche Zuordnung der Population (L4–7 etabliert, Gegner L1–3, Questcredit 0/4). Solche Fälle nicht als beabsichtigte Schwierigkeit verwenden.

**Historische Ziel-L15-Läufe:** folgende Werte sind gezielt aus den jeweiligen Reviews zusammengeführt, keine über alle Starts berechnete Erfolgsquote.

| Quelle | Profil/Build | Fortschritt | Einordnung |
|---|---|---|---|
| [Batch 3](../testrun_10b/archiv/README.md) | .102 W/M/R | 250 Inputs L10 / 102 L5 / 87 L2 | Frühere Werte; bereits stark unterschiedliche Kampagnenentwicklung |
| Batch 5 | .106 Warrior / Mage | beide 250 Inputs: L7 / L10; 2.584 bzw. 5.370 Kampf+Quest-XP | Nicht gleicher Gegner-/Questpfad |
| Batch 9 | .113 Warrior | L9 nach 150 Inputs, 14 Siege | Rare Passive, wenig Gear-/Skillwachstum |
| Batch 17 | .122 Warrior / Mage | L15 nach 168 / 106 Inputs, jeweils 15 Siege und 6 / 5 Questabschlüsse | Belegt Zielerreichung unter damaliger ×5-Regel; je ein großer Dangerous-Questlohn 2.025 XP |
| Batch 17 | Rogue | L13 nach 141 Inputs, manuell beendet | Kein vollständiger L15-Negativtest |
| Batch 18 | .123 W/M/R | L11 nach 200 / L3 Tod nach 22 / L6 nach 200 | Gleicher Rangplan, sehr unterschiedliche Ereignisse |
| Batch 19 | .124 W/M/R | L12 nach 200 / L7 Tod nach 94 / L2 Tod nach 32 | Hohe Streuung und Gruppenrisiko |
| Batch 20 | .125 Langlauf | L12, 7.590 XP; 20/35 Gegner L1, 29/35 mindestens 3 Level unter PC | Inhalts-/Gegnerwahl statt bloßer XP-Formel |
| Batch 22 | .146 Rogue | L15 T276; E-Klasse T282, 21 Siege, 7 Quests; 11.935 XP | Bloodhound Rogue tatsächlich angenommen; späterer Speicherfehler getrennt |
| Batch 23 | .149 Warrior / Rogue | L15 T370 / T213; E-Klassenannahme T375 / T216 | Warrior mit semantischem Dungeonbefund, Rogue intakt |
| Batch 24 | .150 Warrior / Rogue | L15 T235 / T252; Warrior E T282 auf L18, Rogue später L17 ohne Annahme | Rang und tatsächliche Klassenannahme getrennt |
| Batch 25 | .151 Mage / Rogue | Mage T164 bereits L16, späterer Tod; Rogue L15 T290, E T309 | Fortschritt auch über L15 hinaus, kein vollständiger E-Inhaltsnachweis |
| Batch 26 | .152 Warrior / Mage | L15 T324 / T180, E T338 / T183 | Unbroken Bulwark / Ley-Attuned Savant; Warrior mit Objektidentitätsproblem |
| Batch 27 | .153 Warrior / Mage | L15 T337 / T168; E T356 L18 / T176 L16 | Große Ebergruppe 3.490 Kampf-XP plus 2.925 Quest-XP in einem Lauf |
| Batch 28 | .154 Warrior | L15 T417, E T421; 10.840 XP; 31 Siege, 41 Gegner, davon 14 L1 | Viel freiwilliges RP und schwächere Aufträge; Fortschritt kein linearer Inputzähler |

Die exakten Batchlinks stehen im [Archivindex](../testrun_10b/archiv/README.md); der Tabelle zugrunde liegen die jeweiligen Hauptreviews. T/Inputs können je Review unterschiedliche Arten von Eingaben und technische Wiederholungen umfassen. Keine gemeinsame Rangliste aus den Laufzeiten ableiten.

Persönliche Evidenz:

- User01 erreichte nach einem Dungeon L7; berichtete ausdrücklich, XP seien nicht zu knapp. Dokumentierte XP-Beiträge 600+300+1.350+115. Historische Stat-/Kampfwerte.
- User04 (.159): 46 Inputs/93 Nachrichten, L8, vier Siege mit sechs Gegnern, ein seltener Passive. Der als bereit gemeldete Titan-Auftrag mit 550 cp war noch nicht ausgezahlt. Kein Anlass, die Zahl mit eingenommenem Geld zu vermischen.
- Jüngere GLM-Serien .222–.251: Claude belegt u.a. Lauf S .232 mit L10 nach 120 Nachrichten. Die von Claude verglichenen kürzeren Läufe sind zusätzlich zu den vielen tatsächlichen alten E-Annahmen zu lesen, nicht deren Ersatz.
- Die heutige freie Punkteverteilung, individuelle Party-XP und die heutigen Gear-/Skillregeln machen eine erneute kontrollierte Progressionsmessung sinnvoll. .262 ist dafür vorbereitet; ein natürlicher .261→E-Langlauf ist hier nicht belegt.

### 1.3 GPT-Bewertung und Analysefragen

**Vorläufig keine neue pauschale XP-Erhöhung oder -Senkung.** F soll nicht zur reinen Vorstufe von E degradiert werden, aber auch nicht aus hunderten gleichartigen L1-Jagden bestehen. Entscheidend ist eine Progressionskurve aus sinnvollen Aktivitäten und erreichbaren, unterschiedlich anspruchsvollen Inhalten. Ein schneller Rangwechsel ohne Gear, gelernte Skills und bedeutsame Klasse ist ebenso problematisch wie endloses Grinding.

Claude soll mehrere Pacing-Varianten über F/E sowie konzeptionell bis S vergleichen: XP/Levelkurve, Rank-Gap-Wirkung, Verhältnis Kampf/Quest/Lernzeit, Solo/Party, gelegentlich sehr gefährliche Kämpfe und nicht kampforientierte Rollen. Geeignete Messgrößen: XP je sinnvollem Abenteuer und Questzyklus, Kämpfe/Spielstunden je Rang, Ausrüstungs- und Lernmeilensteine, nicht nur Anzahl Nachrichten. Historische Fehlschläge technisch bereinigt kennzeichnen, nicht in eine künstliche Zielrate umrechnen. Ziel „Level 15 in X Zügen“ bleibt eine Orientierung, keine zwingende Spielerroute.

---

## 2. Klassen, Rollen und organische Charakterentwicklung

### 2.1 Ist

Aktuelle menschliche Ruleset-2-Grundklassen: Warrior (STR/VIT), Mage (INT/WIL), Rogue (AGI/PER). Alte Guardian/Duelist/Ranger-Einträge im Content nicht mit aktuell wählbaren Klassen gleichsetzen. Basic Attack plus zwei Startskills, danach offene Entwicklung; Favored Stats sind Affinität, kein festes Build-Gebot. Keine starren Skilltrees.

Der Power-Rank wechselt bei L15 nach Formel. Die organische E-Klasse wird dagegen durch ein persistiertes Angebot und ausdrückliche Annahme erworben; 2–3 angebotene Optionen, kein beliebiges Neuwürfeln. Historisch normal/rare ausgearbeitet; Klassenmerkmale liegen neben dem Passive-Slot-System, teilen aber einschlägige Caps. Beispielhafte heutige Budgets (Grenzen, keine garantierten Boni): normale E-Klasse 1–2 Effekte, stat bonus 4, max bonus 20, Kostenreduktion/Resistenz 8; rare 1–3 Effekte, 6/35/15/15. Maßgeblich sind class_growth und konkrete Feature-Regeln.

### 2.2 Natürliche Belege und Grenzen

Batch 22: Bloodhound Rogue (normal), tatsächliches Merkmal ATK+4 / Martial-STA-Kosten −8 %, kein bloß vorgeschlagener Name. Batch 24: Ironhide Vanguard. Batch 25: Ironblade Cutthroat. Batch 26: Unbroken Bulwark und Ley-Attuned Savant. Weitere tatsächliche E-Annahmen Batch 23/27/28. Der Übergang funktioniert historisch für alle drei Grundklassen; eine ausreichend lange Kampagne *nach* der Annahme mit E-spezifischer Umwelt, E-Lernquellen und E-Gear fehlt. Die Tests sagen wenig über langfristige Spezialisierung, Hybridbuilds oder die Balance sämtlicher Optionen.

Die Lore unterscheidet F-Basisklasse, E erste, D zweite, C dritte Evolution; B Half-Divine, A höhere Transzendenz, S Full-Divine. Das ist keine konkrete D–S-Implementierungsfreigabe.

### 2.3 Bewertung

Die organische Klassenidee ist ein eigenständiger Vorzug des Spiels. E-Klassen sollen erkennbare Spielweisen und nicht bloß einen weiteren Statbonus eröffnen. Trotzdem nicht jedes höherstufige Level mit neuer Klasse und Fähigkeit überladen. Klassenauswahl darf nicht zur Pflichtbedingung für sinnvolle E-Inhalte werden, sofern die bestehende Rank-Regel anderes erlaubt. Spielerentscheidungen und tatsächliche Entwicklungsmuster bleiben wichtig; keine exklusiven Skillverbote allein wegen Grundklasse.

Claude soll das Verhältnis von Klasse, Power Rank, Affinitäten, Skill-Rank, Passive, Gear und NPC-Entwicklung konkret untersuchen. Prüfen: Was soll sich bei E spürbar verändern? Wie können spätere Evolutionen auf dem vorhandenen System aufbauen, ohne jetzt alle Klassen bis S auszudefinieren? Welche Vorteile sollen Training, Kampfdeeds, Wissen, seltene Voraussetzungen und Institutionen jeweils bieten? Klassenoptionen nicht ohne Benutzerentscheidung festlegen.

---

## 3. Kampf, Gegner, Gefahren und Ressourcen

### 3.1 Ist

Kampfwerte, Initiative, Reichweiten, Treffer, Kosten, HP/MP/STA, tatsächliche Niederlage, Flucht und Besitz sind Engine-Autorität. Major + Minor, Bewegung/Dodge und Hauptaktion bilden eine echte Entscheidung; Flucht ist keine kostenlose Zusatzaktion. Vier relevante Distanzbänder; ein normaler Schritt verschiebt ein Band. Situative Reichweite und Öffnung sind ebenso wichtig wie nominaler Schaden.

Initiative aus AGI (Basis floor(1,5×AGI)); Basisverteidigung wird über die Stat-Divisoren und Gear/Modifikatoren ermittelt. Schadensvarianz 0,9–1,1, Schadensboden 10 %; echter Ambush-Opening-Crit 1,5. Keine neue allgemeine Crit-/Dodge-Formel beschlossen.

Erholung: je Stunde Rast 10 % MaxHP, 15 % MaxMP, 25 % MaxSTA. Reise: 5 % MaxMP/Stunde, kein HP-/STA-Ersatz; keine Kampfregeneration. Genaue Rundung und Unterbrechungen folgen bestehender Mechanik. PULSE beeinflusst echte Abenteuer- und Rastgefahr. NPCs nutzen ihre eigenen Ressourcen.

### 3.2 Gegnerprofile

Die Monsteranker sind Körperpläne auf Level 1, **nicht die Beschränkung auf F-Monster**. Freie Spezies-/Namensgebung und Persistenz bleiben wichtig.

| Anker | HP | ATK | DEF | MDEF | Init |
|---|---:|---:|---:|---:|---:|
| rat |16|6|0|0|10|
| wolf |23|9|0|0|12|
| boar |41|11|2|0|7|
| deer |27|7|0|0|14|
| horse |38|8|1|0|12|
| bear |63|14|2|1|5|
| feline |30|10|0|0|13|
| serpent |20|8|0|1|11|
| raptor |18|7|0|0|15|
| arthropod |24|8|2|0|8|
| aquatic |36|11|1|0|10|
| goblin |45|11|1|1|8|
| ogre |90|18|2|0|3|
| armored_beast |70|12|5|1|5|
| spirit |40|14|0|5|10|
| skeleton |30|10|2|0|8|
| ghoul |40|12|1|0|10|
| slime |36|8|3|0|4|
| goblin_shaman |36|12|0|3|9|

Formeln: HP ×(1+0,20×(L−1)), ATK ×(1+0,22×(L−1)); DEF/MDEF: (Grundwert+1) ×(1+0,20×(L−1)) −1; Initiative ×(1+0,05×(L−1)), mit Rundung gemäß Code. Elite multipliziert HP 1,75, ATK 1,15, DEF/MDEF 1,1 und erhöht Initiative um 2; Boss 2,5/1,3/1,2 und +3. Spirit/Shaman sind MEDIUM-Anker, die übrigen hier aufgeführten Standardprofile ENGAGED. Bewaffnung/Skills und tatsächliche NPCs können die Begegnung verändern. Junge und erwachsene Tiere sowie Population/Independent sind eigene Merkmale, nicht beliebig austauschbar.

Menschliche Gegner folgen persönlichen Profilen. Seit .197 gilt dasselbe grundsätzliche Attributbudget von Basis 5, zwei Startboni und 5 je Level. Trainierte Individuen können persistierte Skills und ab passender Stufe Signaturen besitzen; keine Gratis-Kampffähigkeit für untrainierte Zivilisten.

### 3.3 Belege aus den Tests

- Historisch .195 wurden in der kontrollierten Kampfbalance-Analyse 210 Szenarien × 100 Seeds simuliert. Körperplan und Matchup hatten großen Einfluss: z.B. unter einem konkreten L10-mixed/P1-Setup Bear-Boss 0 % vs. Arthropod-Boss 100 % Siege; Spirit unterschied sich zwischen Klassen. Kein universeller Klassenvergleich, keine aktuelle .261-Siegquote. Waffen-/Rüstungswechsel hatten in Schwellenfällen deutliche Auswirkungen.
- Ältere Einzelruns und Batches: hohe Gefahr durch mehrere schnelle Gegner, vor allem bei niedrigem PC-Level; falscher L28-Gegner in einem F-Dungeon war ein damaliger Implementierungsfehler, keine zu bewahrende Balance. E-Goblins auf einer tatsächlich erreichten E-Etage sind davon zu trennen.
- User05: Queen nähert sich von LONG über Bänder; zwei Flame-Lance-Treffer verursachten zusammen 124 Schaden. Spieler empfand langsame Gegnerbewegung bei bestimmten Begegnungen als zu leicht ausnutzbar. Daraus folgt nicht, dass jeder Gegner schneller werden sollte.
- User09: HP 80→66→58 durch zwei Hindernisse, Schaden nicht wahrgenommen; erste Goblingruppe tödlich. Gefahrenkommunikation vor dem Kampf ist wesentlich; nicht reflexartig Gegner schwächen.
- User11 .208: L1-Mage, drei Skelette L2/3/5; erste AoE 24/24/27, danach sechs gegnerische Angriffe mit 72 Gesamtschaden, HP8. Zweite AoE tötet zwei, letzter Gegner tötet PC. Distanz-Sidestep bot gegen ENGAGED keinen Schutz. Initiative, Gruppenzahl und Startdistanz sind gemeinsame Balanceachsen.
- User12: Banditen/Bedrohung im HUD besser verständlich, Nahkampf-/Distanzentscheidungen sowie übermäßig repetitive Gegnerreaktionen wurden angesprochen. User13 entwickelte daraus Kapitulations-/Verhandlungsideen, inzwischen grundsätzlich mechanisch realisiert. Nicht jeder Kampf muss mit Tod enden.
- Jüngere Partyserie: echte getrennte Initiativen und Ressourcen. Eine Turtle-Fortsetzung endete mit PC-Tod, eine andere mit erfolgreichem gemeinsamem Questabschluss. Party ist keine garantierte Sicherheit.
- User15: echter Kampf gegen stärkere Population nach Korrektur eines L1-Independent-Fehlfalls; vier Wölfe fälschlich schwach erzeugt, danach echte L4–7-Population. Zuverlässiger Populationseintrag ist Voraussetzung für aussagekräftige Balance.

### 3.4 Bewertung und Aufgaben

Nicht nur lineare Gegner-HP und Schaden skalieren. Untersuchen: Einzel- vs. Gruppenbegegnungen, Initiative, Startdistanz, verfügbare Gegenstrategien, Ressourcenattrition, Elite-/Guardian-/Bossrollen, spezielle Fähigkeiten und Gegnerverhalten. Höhere Ränge brauchen erkennbare neue Gefahren- und Lösungsmuster statt bloß mehr HP. Aber nicht sofort universelle neue Status-/Aktionssysteme bauen, wenn vorhandene Komponenten genügen.

Vorschlag für Claude: vergleichbare Testmatrix F5/F10/F14/E15/E20/E29, später repräsentativ D/C/B/A/S. Warrior/Mage/Rogue, offensive/defensive/mixed Stats, F-/E-Gear und Skills, Solo/2er-/3er-Party. Kontrollierte gleiche Seeds, gültige Handlungen, Gegnergruppen und unterschiedliche Startdistanzen. Ergebnisse: Überleben, Zeit bis Sieg, Resourceinsatz, verbleibende HP, Entscheidungsvielfalt und Ausweichmöglichkeiten; kein Zwang auf gleiche Siegquote aller Klassen. Extreme frühe Gefahr nicht als normale Einsteigerquest verkaufen.

---

## 4. Skills, Proficiency, Lernen und Passive

### 4.1 Ist

Skill-Rank, Complexity C1–C3 und Proficiency P1–P5 sind drei verschiedene Achsen.

| Rank / Complexity | Base-Power-Grenze | Summe Koeffizienten | Kostenband |
|---|---:|---:|---|
| F C1 |12|1,9|5–10|
| F C2 |16|2,4|8–16|
| F C3 |18|2,6|12–22|
| E C1 |18|2,0|8–14|
| E C2 |24|2,5|12–22|
| E C3 |27|2,7|16–30|

E-Heil-/Barriere-Kalibrierung verwendet einen Faktor 1,5 auf die einschlägigen Effektgrenzen; nicht pauschal jeden Skillwert multiplizieren. E-Kalibrierung ist vorhanden, aber die normale Erzeugungs-/Lernkette ist F-beschränkt. D–S haben keine ausgearbeitete gleichwertige vollständige Kalibrierung.

| Proficiency | Kostenfaktor | Powerfaktor | Effektfaktor |
|---|---:|---:|---:|
| P1 |1|1|1|
| P2 |0,95|1|1|
| P3 |0,95|1,05|1,05|
| P4 |0,925|1,15|1,1|
| P5 |0,9|1,2|1,15|

Maßgeblich sind Rundung, vorhandene Ausnahmen und tatsächliche Skillformel. Basic Attack ist kostenlos; P2 hat für kostenlose Angriffe keinen Kostenbonus, Power steigt zuerst auf P3. Der F-Balanceversuch enthält PP-Grenzen 50/75/100 je Complexity statt der älteren Rohwerte 75/100/150. PP-Basis 12 mit Affinität, höchstens einmal je qualifizierendem Encounter für tatsächlich genutzten Skill; offensiver F-Skill muss passend wirksam sein (unter anderem Gegner nicht mehr als vier Level unter PC), Defense/Utility besitzen eigene Voraussetzungen.

Organische Evolution: P5 + passende echte unterschiedliche Kampferfahrungen (zwei qualifizierende Fälle), bestehende Funktion/Verwendung beachten. Nachfolger ersetzt Vorgänger, erbt Proficiency mit 0 PP; maximal drei offene Entwicklungsangebote. C1→C2→C3 ist kein automatischer F→E-Rangwechsel. Keine stillen neuen Skills allein durch Levelup.

Lernwege: Training, Lehrer, Manual/Primer, Skill Stone und organische Entwicklung. LP-Anforderungen 100/200/300 für C1/C2/C3; Lehrer 20, Selbststudium 10 je Stunde als Basis. F-Balance-Tagesgrenzen 60/40 statt alter 40/20, Affinitätswirkung und Verbrauch entsprechend dem geltenden Pfad. Gildenprimer 80 cp statt älterer 120. Ein Skill Stone ist keine Passive Stone; letztere ist im Lore selten und nicht mit einem allgemeinen bereits verfügbaren Verbrauchspfad gleichzusetzen.

Passive: Ordinary/Rare/Legendary als unabhängige Qualitätsachse, keine bloßen Power-Rank-Stufen. Vier Slots bis unter B; höhere Kapazität offen. Training, echte Taten und außergewöhnliche Situationen; kein erzwungenes Spam-Farming. Seltene und legendäre Entwicklung erst durch bewusste Annahme/ggf. Ersatz eines bestehenden Passives. Klasseneffekte separat, aber relevante gemeinsame Caps.

### 4.2 Evidenz

- Alte Runserie zeigt wiederholt hohe Level mit wenig PP oder ungenutzten Skillangeboten. In Batch 3 erreicht Warrior Heavy Slash P2/P3. In Batch 9 Warrior L9 hat Rare Passive, Heavy Slash/Basic Attack P2; neues Skillangebot nicht angenommen. In User04 L8 stehen drei Skills noch auf P1, trotz eines Rare Passive. Das spricht für einen Entwicklungsabgleich, nicht automatisch für falsche PP-Buchung.
- User15 verlangte tatsächliche Auswirkung der Proficiency im HUD (vor allem P2 bei Basic Attack); .219 setzte transparente Vorher/Nachher-Anzeige um. Nicht jede Stufe muss denselben Typ von Bonus haben.
- .222–.235: Ossen als eigenständiger Mage setzt echte Skills ein; PP wachsen individuell. Keine pauschale automatische Skill-Synchronisation mit dem Spieler.
- .245–.251: Quill/Rowan/Sage/Heron liefern eine echte Kette aus Lootverkauf, Primerkauf und Lernen. Sage beginnt bei 6/100 LP, erreicht 43 und 93; weiterer Block am ausgeschöpften Tag bleibt 93; nach Tageswechsel Abschluss und neuer Binding Mend. Heron setzt den neuen Skill tatsächlich ein: HP95→107, MP72→65. Damit ist F-Lernen nicht nur als theoretischer Enginepfad vorhanden.
- Kein ausreichender natürlicher Vergleich F-C3/P5 gegen E-C1/P1; auch kein ausreichender Vergleich sämtlicher E-Lernquellen, höherer Klassenboni oder sinnvoller Skillzusammenstellungen.

### 4.3 Bewertung und Fragen

Die Stärke von Avereth liegt in organischer, aber technisch nachvollziehbarer Skillentwicklung. Höherer Rank sollte nicht bedeuten, dass jede alte Meistertechnik nutzlos wird. Ein gewöhnlicher neuer E-Skill darf einem meisterhaften F-Skill in bestimmten Nischen unterliegen; ein ausdrücklich als gleichartige Evolution angebotener Nachfolger darf nicht unbemerkt schwächer sein.

Claude soll Profile von Skills bei realistischen Stats, Waffen, Kosten, Reichweite und Complexity vergleichen, auch Defensive/Utility/Heilung. Bewertet werden Nutzungskosten, Alternativen, situative Effekte und Lernaufwand. Untersuchen: sinnvolle E-Erwerbsquellen (Lehrer, Schulen, Steine, Manuale, seltene Erfahrung), ob Rangwechsel einer Technik eine Quelle/Evolution braucht, wie E bis S skalierbar bleibt, und welche wenigen neuen Effektfamilien spielerisch wirklich nötig wären. Nicht D–S bereits numerisch ausdefinieren oder ein zweites paralleles Skillsystem erfinden.

Passive insbesondere getrennt von aktiven Skills betrachten: Verteilung, Qualität, Slotgrenzen, Machtbudget, dauerhafte Boni vs. Training, Interaktion mit Klassen und Ressourcen. Die älteren Rare-Beispiele sind keine statistische Drop-/Entwicklungsquote. Für höhere Ränge brauchen wir eine Richtung, keine sofortige Freischaltung aller seltenen Quellen.

---

## 5. Ausrüstung, Loot und Belohnungserlebnis

### 5.1 Ist

| Qualität | F-Waffenwert ATK/MATK | E-Waffenwert ATK/MATK | F-Waffenpreis, soweit als heutiger Markt belegt |
|---|---:|---:|---:|
| crude |6|7| nicht hier als feste Zahl vorausgesetzt |
| common |10|11|80 cp |
| fine |14|15|140 cp |
| superior |18|19|260 cp |
| exceptional |22|23|480 cp |

Quelle: gear.json, items.js und dokumentierter Markt in User12/Oriole. Die letzte Spalte ist kein universeller Preis für alle Rüstungen, Lootteile oder E-Gear. Alte .195-E-Werte (7/11/14/18/20) und ältere Vorschlagsrichtwerte gehören nicht in die aktuelle Tabelle.

F-Referenzfenster: light armor DEF 2–4 / MDEF 2–5; heavy armor DEF 5–8 / MDEF 1–3; shield DEF 3–5 / MDEF 2–4. Qualität und bestehende Sonderregeln können die konkreten Profile verändern. Generic Rank Scaling Faktor 1+0,75×Rankindex, soweit kein eigenes Rangprofil gilt. Die konkrete E-Waffentabelle ist ein solches Sonderprofil. Bestehende Itemprofile werden beim Besitzwechsel nicht dynamisch neu ausgewürfelt. Höherer Rank kann als Fund mitgeführt/verkauft, nicht automatisch unterhalb seiner Nutzungsgrenze ausgerüstet werden. Rang, Qualität, Waffentyp, echte Wirkung und Besitzer getrennt.

Normale Beute aus tatsächlich besiegten/getöteten Gegnern, Körpermaterialien anhand vorhandener Art/Anatomie, Humanoide ggf. Münzen und bewaffnungsbezogene Bergung. Keine künstlichen Killtrophäen als Pflicht zur Questabgabe. Bodenfunde bleiben echte Weltobjekte, sichtbarer Loot ist nicht gleich automatischer Inventarbesitz.

Materialrichtwert folgt aktuell 3^Rankindex: ein F-Richtwert von 1 cp wird E 3, D 9, C 27, B 81, A 243, S 729 cp. Das ist eine echte mathematische Skalierung in loot.js, noch keine bestätigte höhere Rangökonomie. Tatsächlicher Verkaufspreis kann abweichen.

### 5.2 Sonderbeute

Aktuelles Bossloot-V1-Design: Elite 25 % Chance sowohl erstmals als auch bei Wiederholung; Guardian erster Erfolg 100 %, Wiederholung 35 %; Boss 100 % bzw. 60 %. Vorhandene Typ-/Qualitätstabellen mit klassenrelevanter ca. 70-%- und thematischer Beute; besondere Skill Stones selten (Guardian 2 %/1 %, Boss 6 %/3 %). Keine Beute über Gegnerrang als normaler V1-Grundsatz. Passive Stones nicht ungefragt freischalten. Erster Boss-Trophäenwert F 60 cp, Return Stone kann bei Guardian/Boss mit 25 %/60 % entstehen. Normal-/Elite-/Guardian-/Bossrolle von Rank und Qualität unterscheiden.

Quellen: [Bossloot-Fachplan](../patch_plans_10b/FACHPLAN_BOSSLOOT_BESONDERE_BELOHNUNGEN.md), [Entscheidungen zum Bossloot](../patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md), monsters.json. Der Fachplan enthält Entwurfsvarianten; bei Abweichung gilt aktueller Produktcontent bzw. spätere beschlossene Entscheidung.

### 5.3 Testevidenz

- .195: damalige E-fine 14 vs F-fine14, E-superior18 vs F-superior18, E-exceptional20 vs F-exceptional22. Das war ein konkreter Übergangswiderspruch; heutige E-Waffentabelle repariert die Monotonie je Qualität, lässt aber nur +1 Unterschied. Damals auch Schild-Qualitätsplateau und Warrior-L5-gegen-armored-guardian-Schwelle: Starter 0 %, fine 100 % Siege bei kontrollierten Szenarien. Keine aktuelle generelle Balance daraus ableiten.
- Historische Run20/Batch 5/9/13: teilweise hohe Münzbestände und weiterhin Startergear. Batch 13 Mage L8, 1.252 cp und keine Ausrüstungsentwicklung. Kaufkraft alleine erzeugt keinen sinnvollen Upgradekreislauf.
- Batch 21: zwei Lynx-Jagden mit je 45 cp/115 XP, Verkäufe und Rüstungskauf für 72 cp. Batch 22 Rogue: 11 Verkäufe, 16 Käufe, Gearentwicklung und E-Klassenannahme. Achtung alte Preis-/Objektregeln.
- User01/02: Wunsch nach natürlicher Beute aus Erkundung und interessanten Belohnungen, nicht nur reguläres Auto-Loot. Eine reine zusätzliche garantierte Kiste pro Raum war keine Entscheidung.
- User07: Camp-Suche PER5 gegen6, 45,45 %, Wurf77, kein Fund; Spieler wollte plausible sichtbare Lagergegenstände nicht vollständig an einen Hidden-Loot-Wurf binden. Offene Frage: sichtbarer gewöhnlicher Fund vs. versteckte wertvolle Beute. Falsch, daraus einen garantierten Wertfund je Lager abzuleiten.
- User12: 6-Positionen-Gebot für 300 cp, Wunsch nach verständlichen tatsächlichen Preisen statt narrativen widersprüchlichen Preisangaben. F-Staff-Angebote 80/140/260/480 als konkreter Vergleich.
- .245–.251: Martin hat 50 cp, gewöhnliche Stiefel kosten 80 cp, Kauf korrekt nicht möglich. Oriole erwirbt Stab MATK10 für 80 cp, 110→30 cp, tatsächliche gleiche Objekt-ID nach Equip. Belegt funktionierenden Ablauf, nicht dass MATK10 eine Verbesserung gegenüber jedem Starterprofil ist.
- Jüngere Partyserie: Warden-Trophäe mit Besitzer und anschließender echter Verkauf-/Lernkette. Keine ausreichende Stichprobe für Dropchancen, Zeit bis Exceptional oder E-Lootqualität.

### 5.4 Bewertung

Rangüberlappung ist grundsätzlich gut: ein außergewöhnliches F-Schwert kann ein schlichtes E-Schwert übertreffen. Dennoch sollten E-Funde erkennbar neue Möglichkeiten eröffnen; +1 bei gleichnamiger Qualität kann zu wenig sein, muss aber im Gesamtsystem mit Skill- und Statwachstum betrachtet werden. Ein Spieler mit F-Exceptional 22 würde gewöhnliches E 11 nicht kaufen. Das kann eine bewusst wertvolle F-Investition sein, darf jedoch nicht einen ganzen neuen Rang unattraktiv machen.

Claude soll sinnvolle Qualitäts-/Rank-Staffelung, echte Upgradewege, Ausrüstung pro Build/Slot, Rüstungs-/Schildprogression, Lootchancen und besondere Gegenstände zusammen analysieren. Nicht alle Ausrüstung gleichmäßig multiplizieren. Berücksichtigen: brauchbare vs. verkaufbare Beute, Budget, Affixe/Verzauberungen nur als begründete spätere Designoption, Loot-Identität, Item-Rarity, Rangnutzungsgrenze und tatsächliche Spielerentscheidung. E–S-Exponentialeffekte der Materialpreise ausdrücklich mit Wirtschaft §6 abgleichen.

---

## 6. Wirtschaft, Handel und Lernkosten

### 6.1 Ist

Start 50 cp, einmalige Gildenregistrierung 20 cp. 10 cp = 1 Silber, 100 cp = 1 Gold. Keine neue Währung vorgesehen. Ein gewöhnlicher Startcharakter hat nach Anmeldung 30 cp und kann nicht unmittelbar jede gewünschte F-Ausrüstung kaufen.

F-Gear mit Engine-Preisautorität und strukturiertem Angebot; E+ noch nicht gleichwertig geregelt. Händler haben tatsächlich vorhandene Ware/Profil, NPC-/Spielerzustimmung und Besitzer-/Zahlungsbezug bleiben getrennt. Preisrichtwert ist nicht zwangsläufig ein ausführbarer Preis. Keine frei erfundenen Abbuchungen, keine Doppelbuchungen, keine implizite Zustimmung. Variable Preise, Wiederverkauf, Mengen, Service und echte Forderungen bleiben differenziert. Dienstleistungen können über HUD gekauft werden; Zimmerkauf ist nicht automatische Rast.

Rohcontent-Gildenlohnrichtlinien (proposed): Novice 10–200, Proven 100–600, Veteran 300–1.500, Elite 800–4.000 cp. Historischer F-Balanceversuch erweiterte die Gefahren-/Levelstaffelung; tatsächlich wurden auf älteren F-Boards z.B. 40/140/300/550 cp bei Empfehlungen L1/5/9/13 beobachtet. Keine einheitliche bereits abgesicherte E–S-Tabelle daraus ableiten; die tatsächliche aktuelle Boardlogik und die jeweiligen Vertragsprofile sind maßgeblich.

Normales Einkommen: Gildenverträge, Loot, reale bezahlte Weltinteraktion, ggf. Geschenke. Senken: Unterkunft, Nahrung, Training, Primer, Steine, Gear, Verbrauchsgüter, Transport und andere bewusst akzeptierte Gebühren. Party teilt Münzen/Questlohn, Sachbesitz bleibt konkret; nicht den Bruttolohn des gesamten Teams als Solo-Kaufkraft rechnen.

### 6.2 Evidenz

- Alte Einzelrun-/Batchserien belegen vielfache erfolgreiche Verkäufe/Abgaben, aber auch historisch falsche Preise, Objektidentitäten oder Standortablehnungen. In Batch 14 sind Salden u.a. durch falsche Zahlungen verfälscht; solche Werte nicht als legitimes Einkommen in die Balance übernehmen.
- Batch 13 zeigt 1.252 cp ohne Gearentwicklung; Batch 22 zeigt dagegen echte Einkaufsketten. Daraus folgt, dass sowohl Angebot als auch Spielerentscheidung und technische Zugänglichkeit relevant sind.
- User08 .205: Verkauf über 352 cp, Summe der einzeln genannten Beträge 69 cp; dokumentierter Preis-/Vertragseffekt, **kein** gewünschter regulärer Ertrag.
- User12: guter HUD-Mehrfachverkauf und konkrete Waffenpreisstaffel; Wertguide/echtes Gebot müssen verständlich getrennt bleiben.
- .245–.251: gewöhnliche Handelsgegenstände und echte Zahlungen, Staffkauf 80 cp, Primer und Training nach Beuteverkauf. Nicht nur Questlohn betrachten.
- .236–.244: abwesender Begleiter hat offenen Anspruch 45 cp; echte Teilzahlungen 20+25, keine zusätzliche Zahlung bei Wiederholung. Cypress: 70 cp Gildenlohn, je 35 cp. Partyökonomie unterscheidet sich real vom Solo-Spiel.
- Aktuell noch keine ausreichend große Messreihe für langfristige Einkommens-/Ausgabenverteilung, E-Preisniveau, E-Marktverfügbarkeit, Kosten pro Skillentwicklung und inflationäre Effekte bis S.

### 6.3 Bewertung und Aufgaben

Für E-Rank keine neuen Währungen und keine komplexe Markt-/Crafting-Simulation als Voraussetzung. Stattdessen einen vollständigen Kreislauf modellieren: **Abenteuer → Belohnung/Beute → Verkauf → gezielte Investition → stärkere oder vielseitigere Abenteuer.**

Claude soll mehrere repräsentative Budgets berechnen, auch abseits des optimalen Gildenpfads: erwartete Nettoerlöse eines Abenteuers, typische Reparatur-/Heil-/Rast-/Verbrauchs- und Lernkosten, Zeit bis zu relevanter Gearqualität, Unterschied Solo/Party. Exponentialwirkung der Materialwerte und lineare/gemischte Gegner-/Gearwerte über mehrere Ränge vergleichen. Keine unbeabsichtigte Goldschwemme oder dauerhaft unerschwingliche Upgrades.

Wirtschaftlich sollen höhere Ränge auch durch andere Märkte, Zugang, Auftraggeber und seltene Ressourcen charakterisiert sein. Nicht jede Dorfschmiede verkauft E–S-Ware, nur weil der PC Level 90 erreicht hat. Lokale Preise und glaubwürdige Knappheit dürfen existieren; Schutz vor irrtümlichen Zahlungen bleibt technisch.

---

## 7. Gilde, Questvielfalt und Abenteuerstruktur

### 7.1 Ist

Gildenränge entsprechen den in §1 genannten Machtband-Zuordnungen. Beförderung setzt neben dem passenden Machtrang fünf abgeschlossene Verträge des eigenen Gildenrangs voraus. Die Gilde ist transnational und institutionell neutral, kein Weltstaat. Sie ist Informations-, Vertrags- und Vermittlungsstruktur, nicht Eigentümer aller Dungeons und kein automatisch überall überlegener Herrscher.

Derzeit Weltjagden und Dungeon-Clearance als tragende formale Auftragsfamilien. Historisches Board-Grunddesign fünf Slots (4 Jagden plus eine geeignete Clearance, sonst fünf Jagden), späterer Entwicklungsstand mit gelockerten starren Quoten und eigenen Voraussetzungen; genaue aktuelle Profilregeln aus guild.js lesen. Keine erzwungene unpassende Quest, keine Gegnererzeugung allein beim Lesen. Lieferung/Eskorte sind ruhend, nicht als automatisch neue reguläre Angebote verfügbar. Bestehende Transfers und entsprechende Schutztests bleiben relevant. Freie Arbeit/soziale Weltinteraktion sind weiterhin möglich, aber keine automatische formale Privatquest oder Quest-XP-Quelle.

Habitat, Population und Lebensphase sind echte Zieleigenschaften. Questannahme bindet reale Arbeit; Abgabe setzt Erfüllung/READY und zulässige Abgabe voraus. Keine falsche Tieridentität, keine doppelte Auszahlung, kein bloßer Bericht als Kill. Dungeons mit echter Räumung und Reset, nicht jede Quest an jedem Tag wieder erfüllbar.

Proven-Widerspruch: Gildenempfehlung L15–29, bestehende Habitatfenster höchstens L14, weitere F-Beschränkungen in Validator, Prompt und Content. Der .262-Auftrag macht diese Verbraucher rangfähig, ohne die E-Inhalte zu bestimmen. E-Dungeon-Clearance besitzt schon Ansätze; keine pauschale Behauptung, alle E-Quests seien unmöglich.

### 7.2 Testevidenz

- Frühe Einzelruns 1–4: Lieferaufträge, Gegenstände und Orts-/Übergabeprobleme. Diese damaligen Questtypen waren aktiv; die Erkenntnis betrifft mechanisch konkrete Güter und Abgabe, nicht eine beschlossene Wiederfreischaltung.
- Run21 und User15: Habitat-/Populationsbindung beeinflusst Questcredit direkt. Technische Fehlzuordnung kann aussehen wie Grinding. .219 und spätere Orts-/Claim+State-Arbeiten behandeln wesentliche Ursachen; natürliche Endabnahme .261 offen.
- Batch 17: hohe XP durch gefährliche Quests, nicht allein durch gewöhnliche Kämpfe. Spätere langsame L15-Läufe wählen teils weiterhin niedrige Aufträge. Das Questboard muss passende Alternativen bieten, nicht zwangsläufig PC-Skalierung.
- User01/04: Dungeon-Räumung und Abgabe ermöglichen enorme XP-Schübe. User04 Titan READY, 550 cp noch nicht eingenommen.
- User08: echter F1-Clear, anschließend Verkauf. User14: erste Questannahme schon direkt per HUD, damals noch ohne funktionierenden gemeinsamen Kampf. .222–.251: tatsächlich abgeschlossene gemeinsame Dungeonquest (90 cp, je 45; je 225 XP), danach gleicher Party zweiter Auftrag mit 70 cp geteilt.
- Keine ausreichende natürliche Evidenz für längere Proven-Auftragsketten, vernünftige Auswahl von E-Gegnern oder höherstufige nicht repetitive Vertragsfamilien.

### 7.3 Bewertung und Aufgaben

Die Gilde soll glaubwürdig Aufgaben aus der **bereits vorhandenen oder plausibel erstmalig etablierten Welt** anbieten. Ein höherer Gildenrang darf Zugang zu interessanteren Aufträgen und Informationsquellen öffnen; daraus entsteht kein Recht auf eine stets passend skalierte Gegnerwelt.

Claude soll sinnvolle Auftragsfamilien ab E, deren Auftraggeber, Aufgaben-/Gefahrenprofile und Belohnungen analysieren. Denkbar: organisierte Jagden, gefährliche Expeditionen, Aufklärung, Schutz, seltene Materialien, ausgewählte Dungeonziele, institutionelle oder politische Konflikte. Lieferung/Eskorte später prüfen, nicht automatisch freischalten. Zwischen freier Weltinteraktion und mechanisch überprüfbaren Gildenverträgen unterscheiden. Keine künstlichen Quoten als Selbstzweck; Angebot muss tatsächlich spielbar und abwechslungsreich bleiben.

Höhere Gildenränge müssen nicht in jeder kleinen Filiale jede Stufe anbieten. Die regionale Macht-/Infrastrukturverteilung aus §8 ist zugleich die Grundlage für glaubwürdige Auftraggeber und Markt-/Informationszugänge. Kein Zwang, alle höheren Ränge über immer größere Killzahlen zu spielen.

---

## 8. Welt und Dungeons: langfristiges Modell ohne künstliche E–S-Zonen

**Das ist der zentrale neue Designauftrag.** Der Nutzer möchte keine Welt, in der wir einfach getrennte E-, D-, C-, B-, A- und S-Gebiete definieren und danach die tatsächliche High-Fantasy-Welt an diese Rangfolge anpassen müssen. E muss jetzt spielbar werden, aber die Welt soll langfristig alle Ränge glaubwürdig aufnehmen können.

### 8.1 Was bereits im Lore steht (IST)

Avereth ist ein Kontinent mit vorindustrieller, magisch geprägter menschlicher und nichtmenschlicher Zivilisation, Straßen, Flüssen, Städten, Wäldern, Wildnis, Gebirgen, alten Machtorten und unterschiedlichen politischen Reichen. Der Kontinent ist keine vollständig vorgezeichnete statische Karte. Orte außerhalb des Kanons dürfen sinnvoll aus der Weltentwicklung entstehen und werden dann persistent. Etablierte Geographie und Machtverhältnisse dürfen nicht passend zum PC umgeschrieben werden.

| Reich | Lage / Zentrum | Bedeutung für höheres Spiel | Öffentlich bekannte S-Ränge laut Lore |
|---|---|---|---:|
| Valedorn Crown | zentral, Crownheart; Alderwatch | stärkstes Menschenreich, Handel, Tempel, Heilung, Institutionen |3|
| Caelreth | Westen, Asterhall; Glassmere | Akademien, Magieforschung, seltene Evolutionen, Handel/Spannungen mit Verdant Fang Court |2|
| Duskreach | Südosten, Blackgate; Ashbridge | befestigte Grenzlande, Wildnis, Monsterteilehandel, B/A-Militär, Grenze zum Dominion |0|
| Ashen Scale Dominion | vulkanisches östliches Hochland, Cinder Throne | uralte Drachen-/Schuppenblutlinien, Territorium, Bündnisse, Macht und politische Abschreckung |3|
| Verdant Fang Court | uralte westliche Wälder, Thornheart | Monsterlinien, mächtige Raubwesen und Geister, Pakt-/Territorialpolitik |2|

Dies sind die **öffentlich bekannten** S-Akteure in den beschriebenen Reichen, keine vollständige Bestandsaufnahme aller denkbaren oder verborgenen Individuen. Beziehungen sind nicht pauschal Menschen gegen Monster; Handel, Diplomatie, Rivalität und begrenzte Konflikte sind möglich. S-Akteure sind strategische Abschreckungsfaktoren; sie greifen nicht automatisch bei jedem Konflikt eines Angehörigen ihrer Spezies ein.

Lore-Machtdichte: die meisten Menschen F/E; D angesehene Spezialisten/lokale Eliten; C bedeutende regionale Figuren; B häufig hohe institutionelle Rollen; A seltene strategische Macht; S Abschreckung auf Reichsebene. Evolution bringt auch deutlich längere Lebensdauer (Lore-Richtwerte F~100–120 Jahre, E150–180, D250–350, C500–700, B2–3.000, A10–20.000, S100.000+; keine verpflichtende Ingame-Alterssimulation). Diese Verhältnisse sind mit der Spielwelt, nicht nur mit Kampftabellen zu vereinbaren.

Tier-/Monsterökologie: Alle gewöhnlichen Tiere gehören technisch zu Monsterprofilen, auch friedliche/domestizierte. Rank, Feindseligkeit und Sapienz sind getrennt. Populationen bestehen persistent, können sich natürlich entwickeln, konkurrieren, wandern; Höherrangige Individuen sind zunehmend selten. Die Welt darf sich verändern, aber nur aus etablierten Ereignissen – keine Level-Rubberband-Skalierung.

### 8.2 Der heutige technische Weltzuschnitt

Outdoor-Gefahrenfenster: [1,1], [1,3], [4,7], [8,11], [12,14]. Siedlungsnahe/gewöhnliche Wildnis niedriger, abgelegene gefährliche Wildnis höher, explizite Jagdgebiete mit F-Fenster, unbekannte Gefahr konservativ. Persistierte Gebiete/Populationen sind nicht mit der Größe eines ganzen politischen Reichs gleichzusetzen. .261 enthält F-Grenzen in validate.js, extract.js, deltas.json, guild.js, context.js und weiteren Verbrauchern. .262 soll technische Rangfähigkeit schaffen, nicht ein neues Weltmodell beschließen.

PULSE: deterministisches Ereignisfenster bei passender Exposition (Reise, Wildnis, Straßen, Innenraum, Dungeon) und Tageszeit; Begegnung, Hindernis, Spur, Seltsames und andere Ereignistypen. Wiederholungs-/Pausenschutz und Reisehalt haben eigene Regeln. **Ereigniswahrscheinlichkeit und Gefahrenstärke sind verschiedene Parameter.** Ein gefährliches Gebiet muss nicht jeden Zug einen Kampf erzeugen, ein friedlicher Ort ist nicht ereignislos. PULSE sollte auch zukünftig kein automatischer PC-Level-Spawn werden.

### 8.3 Heutige Dungeons als Beleg für lokale Rangmischung

| Dungeon | Nähe / Position | Bestehender Rangaufbau | Struktur / Institution |
|---|---|---|---|
| Old Crown Catacombs | Alderwatch, Kapellenruine westlich, etwa 1 h Ritt | F1: Knochen/Galerie/Warden; E2: Ghouls/Lord | Tempelaufsicht, Zugang/Seal, Kapazität6, Reset3 Tage als Seedwerte |
| Mossback Warrens | Ashbridge, östlich ca. halber Tag | F1: Scouts/Warband/Chief; E2: Guards/Shaman | Gilden-/Ledgerzugang, Kapazität8, Reset3 Tage |
| Glimmerdeep Grotto | Glassmere, nördlich etwa ein Vormittag | F1: Beetles/Slimes/Queen | Akademie, 10 cp Zugang bzw. vertragsfrei, Kapazität6, Reset3 Tage, Kristallressource |

Beide vorhandenen F/E-Dungeons demonstrieren bereits, warum ein ganzes „E-Reich“ oder „E-Gebiet“ nicht notwendig ist: Ein stärkeres Ziel kann in der Nähe einer F-Stadt liegen, ist aber geografisch, mechanisch und institutionell abgegrenzt.

Aktuelle Living-Dungeon-Standardkapazitäten F/E8, D/C6, B5, A/S4; Default-Reset F3, E4, D5, C6, B/A/S7 Tage (Seed-Dungeons können eigene Werte besitzen). Minion/Guard/Boss-Levelspanne aus relativen Rangfenstern; in einem reinen F-Floor liegen die Standardspannen ungefähr bei 1–5/4–8/5–9; E etwa 15–19/18–22/20–24. Prüfen, ob obere Rangteile ausreichend vorkommen, statt automatisch jeden Floor bis Rangmaximum zu füllen. F→E-Dungeonstufe ist nicht dasselbe wie eine vollständig homogene E-Kampagne.

Etablierte Dungeon-Regeln: echter Dungeon persistent, Abschnitte/Floors/Slots, Zugangsrechte, belegte Welt, eigene Gefahr pro Floor, keine PC-Skalierung, echte Rückkehr, begrenzter Bestand und Reset; andere Parteien können eigene Beute nehmen, ohne PC-XP zu erzeugen. Aktuell linear strukturierte echte Dungeonabschnitte. Normale Höhle/Lager/Verlies ist nicht automatisch ein Living Dungeon. Quest-Clearance muss zu tatsächlichem Floorzustand passen.

### 8.4 Evidenz und offene Stellen

- Historische Fehlfälle bei E-Etagen und Warnungen (Batch 7 u.a.) zeigen: höhere Gefahr darf real sein, aber der Übergang muss für den Spieler verständlich sein. F-Charakter kann an einer E-Begegnung scheitern; das ist nicht automatisch ein Bug. Ein fälschlich erzeugter L28-Gegner in F-Floor dagegen schon.
- User01/02/05/08: reale F-Dungeonfortschritte und Bossinteraktionen; Loot, Gefahrenanzeige, Übersicht und Rückkehr waren wiederkehrende Wünsche.
- User07 und User15/16: Exploration, Camp, Reisen und lokales Weltbild wichtig; Suchaktion darf nicht mit beliebigem Spawn oder allgemeiner Ortsautorität vermischt werden.
- NPC/PULSE-Serien belegen vielfältige natürliche Szenen (Reise, Hindernisse, NPC-Kontakte, soziale Interaktion) mit teils repetitiven Typen. Kein generelles Urteil über die optimale Gefahrenrate höherer Ränge.
- .222–.251 zeigt tatsächliche gemeinsame Reisen, F-Dungeonclearance und folgende Weltjagd. Keine belastbare natürliche E-Wildnis-/Stadt-/Institutionen-Kampagne, keine D–S-Spielweltabnahme.

### 8.5 GPT-Entwurf: geografische Welt mit geschichteten Gefahren und Machtstrukturen (HYP)

**Leitidee:** Nicht die Karte in sieben Ränge teilen. Die Karte beschreibt Geographie und Zivilisation; lokale Gefahren, institutionelle Zugänge und seltene Individuen geben der Welt Machtstruktur.

| Ebene | Was wird beschrieben? | Beispiele, keine neuen Kanonorte |
|---|---|---|
| 1 Geographie/Ökologie | Reich, Region, Biome, natürliche Wege, Siedlungen, Ressourcen, Übergänge | fruchtbare Flusstäler, befestigte Grenzstraßen, altes Waldgebiet, Gebirgspass |
| 2 Lokale Gefahr | persistiertes Gefahrenfenster einer tatsächlichen Umgebung, spezifische Populationen, außergewöhnliche Individuen und Zustände | gewöhnliche F-Fauna am Waldrand, territoriale E-Population tiefer im Wald, seltenes einzelnes stärkeres Wesen; verlassene Ruine oder lokaler Konflikt |
| 3 Gesellschaft/Institution | wer lebt/handelt dort, welches Wissen, welche Zugänge, Händler, Lehrer, Aufträge und Regeln existieren | Stadt mit F-Handwerkern und E-Wachen, D-Spezialisten, Akademie mit seltenen höheren Meistern |
| 4 Besondere Machtorte | Dungeons und andere seltene etablierte Orte mit eigenen Risiken und Zugang | bekannter F/E-Dungeon, bewachte Anlage, uralter Ort; hoher Rank als strategisch bedeutende Ausnahme |
| 5 Ereignisse und Wandel | Veränderungen aufgrund echter Weltgeschehnisse und Handlungen | Migration einer Population, Konflikt, neues Wissen, kontrollierter Zugang, ein außergewöhnliches Ereignis |

Die Ebenen sind **Designfragen**, nicht der Vorschlag für fünf neue Datenbanken oder obligatorische Validatoren. Die vorhandenen Orte, Populationen, NPC-Profile, Lore, PULSE, Gildenfilialen und Dungeon-Slots sollen möglichst viel tragen.

**Warum E–S-Zonen als allgemeines Modell ungeeignet sind:**

- Die Mehrzahl der Bevölkerung und gewöhnlichen Tiere bleibt F/E. Ein höheres Reich kann nicht durchgehend aus C- bis S-Bewohnern und Gegnern bestehen, wenn seine soziale Struktur glaubwürdig sein soll.
- Ein S-Rank ist strategische Macht, kein regulärer Monster-Spawn. Ein homogenes S-Gebiet würde Lore, Seltenheit, Wirtschaft und politische Konsequenzen widersprechen.
- Ein E-Abenteurer sollte alte Gebiete erneut sinnvoll besuchen können: soziale Bindungen, Aufträge, günstige Märkte, bekannte sichere Wege, ungewöhnliche neue Erkenntnisse. Keine alte Region automatisch entwerten oder hochskalieren.
- Rangmischung erlaubt echte Spielerwahl und glaubwürdige Gefahr: von sicheren Straßen bis zu gefährlichen Habitaten, ohne jedes Mal ein anderes Land betreten zu müssen.
- Eine starre zonenweise Welt erzeugt später künstliche Progressionswände. Bessere Alternativen sind bekannte Wege, lokale Gefahren, Informationszugänge, Institutionen, besondere Ziele und seltene Gelegenheiten.

**Mögliche E-Einführung (nur Illustration):** bereits bekannte F-Stadt bleibt F/E-gemischte Zivilisation; dort kann eine fachkundige E-Wache, ein Lehrer oder eine E-fähige Gildeninformation existieren. Eine tiefer gelegene Population, eine alte Ruine oder die bereits vorhandene E-Dungeonetage bietet echte E-Gefahr. Händler/Lehrquellen sind an vorhandene Institutionen und glaubwürdige Verfügbarkeit geknüpft, nicht an den gerade gemessenen PC-Rang. Weitere Entdeckungen ergeben sich aus der Welt, nicht aus einem verpflichtenden „E-Portal“.

**D–S perspektivisch:** D/C stärker institutionelle Spezialisten, regional relevante Gegner, rare Populationen und komplexe Expeditionen; B/A sehr seltene Akteure, Machtorte, politische Konflikte und bedeutende institutionelle Zugänge; S nicht routinemäßig farmen, sondern als seltene Weltmacht und besondere strategische Herausforderung behandeln. Das sind Vorentwürfe zur Diskussion, keine verbindlichen Häufigkeiten oder Regeln, auch keine Aussage, dass S-Spiel keinen Kampf enthalten soll.

### 8.6 Alternativen für Claude

| Variante | Vorteil | Hauptproblem / Prüfpunkt |
|---|---|---|
| Ein einheitlicher Rang je großem Gebiet | leicht zu erklären und zu erzeugen | künstliche Progressionskarte, unplausible Bevölkerung, spätere S-Zonen, wenig Rückkehrwert |
| Völlig freies LLM ohne Gefahr-/Populationsanker | maximales narratives improvisieren | keine verlässliche Persistenz oder planbare Schwierigkeit; Gefahr kann unabsichtlich mit PC mitskalieren |
| Lokale feste Gefahrenfenster plus einzelne besondere Vorkommen | bereits gut anschließbar, klare Gefahrenidentität | braucht gute Erstzuordnung und Grenzen der Vererbung; keine Rangzone für jeden Ort nötig |
| Institutionen/Machtorte als primäre höhere Inhalte | glaubwürdige Rolle hoher Ränge, soziale Progression | braucht ausreichend freie Wildnis-/Abenteueralternativen; darf nicht zu künstlicher Zugangsbürokratie werden |
| Kombination aus Geographie, lokalen Fenstern, Institutionen und seltenen Vorkommen | langfristig flexibel, entspricht Lore | muss möglichst einfach auf bestehende Engine und Promptstruktur abbildbar bleiben |

Claude soll eine bevorzugte Variante samt konkretem Beispielaufbau eines bereits bekannten Startumfelds liefern und die **langfristige E–S-Kompatibilität** bewerten. Fragen:

- Was ist die kleinste sinnvolle räumliche Einheit für dauerhafte Gefahr? Wann erbt ein Teilort die Gefahr, wann überschreibt Population oder besonderes Ziel diese? Wie vermeiden wir neue Orts-ID für jeden Baum?
- Wie oft und wo sind höhere gewöhnliche Populationen, Elite/Boss-Individuen und hochrangige Personen plausibel? Wie unterscheidet sich ihre Seltenheit, ohne jetzt eine globale Spawn-Prozenttabelle festzulegen?
- Wie machen wir E-Abenteuer in bestehender Welt erreichbar, ohne dass alle Gegner auf PC15 gesetzt werden? Wie bleiben D–S-Optionen möglich, ohne jedes Reich auszuarbeiten?
- Wie sollen Gefahren kommuniziert werden, ohne Allwissen über verborgene Level zu geben? Sichtbare Hinweise, Gildeninformationen und freiwilliges Eingehen eines Risikos.
- Wie verbinden wir Märkte, Ausbildung, Dungeons, Gildenfilialen und politische Rollen mit der Welt? Wie bleibt der Zugang organisch statt eines automatischen Rangshops?
- Welche Mechanismen bleiben unverändert (Ortspersistenz, Spielerhoheit, PULSE, autonome NPCs)? Welche minimale neue Content-/Lore-Information ist wirklich erforderlich?
- Wie kann ein höherer Rank mehrere unterschiedliche Spielweisen haben: Expedition, Kampf, Lernen, Beziehungen, Reisen, Auftragsarbeit und später Machtverantwortung, ohne den Spieler zu einer einzigen Kampagnenroute zu zwingen?

Nicht Ziel: vollständiger Atlas bis S, feste S-Gegnerzahlen, neue geopolitische Geschichte aller Länder oder eine Weltökonomie mit permanenter globaler Simulation. Höhere Ränge konzeptionell absichern, E konkret spielbar machen.

---

## 9. Party und NPC-Progression als Querschnittsthema

### Ist und Belege

Das dauerhafte Party-System .217–.251 ersetzt bloße narrative Begleitung durch mechanisch getrennte Personen. Einladen/annehmen, eigene Zustimmung, Warten/Folgen, Trennung/Austritt, koordiniertes Kämpfen, individuelle Ressourcen und Besitz, Wache, Rast und gemeinsame Ansprüche. Der PC kontrolliert nicht automatisch jede Handlung eines NPC. P7 der Validierungsvereinfachung wurde bewusst zurückgestellt; die bestehende Entscheidungshoheit bleibt erhalten.

User14 (.215) zeigte den ursprünglichen Mangel: Ossen war erzählerisch Begleiter, aber im Encounter nicht mechanisch vorhanden. Die danach implementierte Party wurde in echten Modellläufen überprüft:

- .222–.235: Ossen ist eigener Mage, im gemeinsamen Encounter mit eigenen Fähigkeiten und Kosten. Gemeinsame Dungeonbegegnungen ergeben je 90+270+270 Kampf-XP im dokumentierten Verlauf; PP des Begleiters ändern sich individuell. Erfolgreicher Turn-in 90 cp, davon je 45; je 225 Quest-XP.
- .236–.244: dieselbe dauerhafte Mitgliedschaft, Markt/Warten/Folgen, offene Ansprüche und Teilzahlungen. Hearth/Rowan: 45 cp Forderung, Zahlung 20+25; keine erneute Zahlung bei Wiederholung.
- Zwei unterschiedliche Fortsetzungen einer Turtle-Jagd nicht zusammenrechnen: In einem Arm stirbt der PC, Ossen erhält eigene XP; in Cypress (.250) überleben beide, drei anrechenbare Abschüsse (PC1/NPC2), zweiter Questabschluss mit 70 cp, je 35 cp, beide L6 am Ende. Keine allgemeine Garantie, dass Zweierparty immer gewinnt.
- Sachbeute und persönliches Gear behalten Besitzer; gemeinsame Belohnungen werden nach tatsächlich erworbenen Ansprüchen verteilt. NPC-Wachübernahme schließt die jeweilige Regeneration während der Rast aus. Das wurde in der .252–.261-Arbeit als mechanischer Schutz erhalten.

### Bewertung und Fragen

Party darf kein bloßer Schadensmultiplikator und auch kein verpflichtender Weg ab E werden. Sinnvolle Rollen und individuelle Entwicklung: ein Frontkämpfer, ein Fernkämpfer, Heiler/Utility oder Scout sollen unterschiedliche Entscheidungen ermöglichen, ohne die offene Klassenentwicklung in feste MMO-Rollen zu zwingen. Unterschiedliche Level/Ränge, erfahrene oder schwächere Begleiter und glaubwürdige Zugangsbedingungen für sehr mächtige NPCs.

Claude soll XP-/Lohnaufteilung vs. reale Kampfvorteile, Gear-/Lernbedarf mehrerer Personen, Gruppenstärke und Gegnerzahl, Abwesenheit und eigennützige Entscheidungen berücksichtigen. Ein S-Begleiter soll nicht einfach regulärer Start-NPC werden; die Lore-Machtverteilung gilt auch hier. NPC-Persönlichkeit und autonome Ziele wichtig, aber kein unaufgeforderter P7-Umbau. NPC-Balance nicht ausschließlich auf PC-Formeln reduzieren; tatsächliche Klasse/Erfahrung/Status müssen erkennbar bleiben.

---

## 10. HUD, Routinehandlungen und spielerische Information

### 10.1 Befunde und Wünsche

- User01/02: weniger textüberladene Boardanzeige, sichtbare Bodenbeute, Awareness und kompakte Zielübersichten; sichtbare Gefahr und Fortschritt bleiben wichtig.
- User05: zwei große Aspekte – freier Text/RPG-Handlungen dürfen bleiben, häufige Mechanik über HUD; Major-/Minor-HUD später als unübersichtlicher empfunden.
- .204: 13 HUD-Aktionen, davon 12 ohne Planner, als konkreter Nutzen für Routine. Kein Grund, für jede Aktion ohne Modell auszukommen.
- User09: Hindernisschaden ging visuell unter; echte HP-Änderung klar anzeigen, nicht erst im Charakterfenster entdecken.
- User11: Mehrfachauswahl und Reihenfolge von Kampfaktionen verständlicher machen. Distanzschutz bei Sidestep nicht als allgemeine Schutzwirkung suggerieren.
- User12: gute Erfahrung mit Mehrfachverkauf; tatsächliche Gegenstände, Preise, Beträge und Kaufkraft wichtiger als nur ein Wertguide; kleine Darstellungsfehler bei #assign.
- User15: Proficiency vor/nach Aufstieg und Wirkung anzeigen; Rastbedienung. .219 setzt tatsächliche Kosten-/Power-Differenzen und native Rast um.
- Jüngere Entwicklung: Handelswagen für geeignete Waren/Dienstleistungen, Gildenannahme, bekannte Wege, Party und Forderungszahlungen; individuelle Werte. P7 unverändert, neue Rangparameter .262 geplant.
- Der Nutzer testet selbst und hat ausdrücklich erklärt, dass HUD zum persönlichen Spielspaß gehört. Kleine Komfortgewinne dürfen in passende Pakete integriert werden, ohne die Entwicklung ständig mit Kosmetik aufzuhalten.

### 10.2 Anforderungen für höhere Ränge

1. **Progression:** Status/F→E/Klassenangebot, verfügbare freie Punkte und erreichter Gildenrang getrennt sichtbar. Optional nachvollziehbare XP-/Skillmeilensteine, keine Zwangsquests.
2. **Skills/Passive:** kompakte Skillübersicht mit Rank, Complexity, Proficiency, realen Kosten, Reichweite/Wirkung; bei wachsender Zahl filtern/gruppieren. Lernquelle, LP und Evolution nachvollziehbar.
3. **Gear/Loot/Handel:** klare tatsächliche Werte und Preis, Rank-/Qualitätsunterschied, Vorher/Nachher-Vergleich bei Equip, höhere Rangnutzungsgrenze, sichtbarer Fund, verschiedene Besitzer. Gruppierung größerer Inventare ohne Verlust von Identität oder tatsächlicher Menge.
4. **Welt/Gefahren:** bekannte Wege und lokale Gefahreninformationen, sichtbare Dungeonetage, belegte Ziele, Hinweise aus Gilde/Einheimischen. Keine Offenlegung unbekannter Gegnerlevel oder erzwungener Weg.
5. **Party:** getrennte HP/MP/STA, Rolle, sichtbare Aktionen und relevante Angebote/Forderungen; eigene NPC-Entscheidung bewahren. Keine RTS-Zwangssteuerung.
6. **Routine:** native Aktionen nur dort, wo die Wahl eindeutig und der vorhandene Enginepfad sicher ist; keine weiteren Modellaufrufe für reine Anzeigen.

Claude soll priorisierte **kleine** QoL-Pakete vorschlagen, die mit E-Inhalt einhergehen können. Vorhandene Anzeigen zunächst prüfen, nicht bereits implementierte Funktionen erneut fordern. Keine neue UI-Gesamtarchitektur.

---

## 11. Quellenregister: historische Testserien und was wir daraus verwenden

Dieses Register ergänzt die thematischen Zusammenfassungen. Es dient ausdrücklich nicht als neue allgemeine Bewertung alter technischer Fehler auf .261.

| Einzelruns im Archiv | Thematische Beobachtung |
|---|---|
| 1–4 | frühe Liefer-/Übergabe-/Reiseabläufe, Questbelohnungen, teils gar kein Kampf; heutige Delivery/Escort-Ruhe berücksichtigen |
| 5–8 | früher Fortschritt, erste stärkere Gruppen/Dungeongefahr, frühe XP-Regeln, tatsächliche rare Passive nach Gefahr |
| 9–12 | frühe tödliche Gruppen; falsche/doppelte Gegnererzeugung und damalige technische Fehler nicht als Balance konservieren |
| 13–16 | frühe Jagd-, Verkaufs- und Lern-/Passivebelege; unterschiedliche technische Unterbrechungen und teilweise sehr niedrige Level |
| 17–19 | L3–L5 bei verschiedenen Stopps, Startergear, historisch falscher E/D-Gegner im F-Kontext |
| 20 | L8/252 Inputs, 3.124 XP, zehn Quests, Outdoor überwiegend L1: Inhaltsmix neben XP relevant |
| 21–22 | Population/Questcredit und weitere Fortschritts-/Extractorstörungen; keine saubere E-Kampagne |

| Batches im Archiv | Thematische Beobachtung |
|---|---|
| 1–4 | frühe Runtime-/Quest-/Kampfketten; unterschiedliche L-Endstände, mehrere echte Gruppentode |
| 5–9 | Vergleich Warrior/Mage, wenig Gear, Rare-Passive und P2, E-Dungeon-Gefahr |
| 10–12 | F-Balancestaffelung der Aufträge, Habitat und AoE; keine abgeschlossene höhere Rangökonomie |
| 13–16 | große Geldbestände ohne Investition, aber auch historische Fehlbuchungen; Gildenclearance-/Habitatfortschritt |
| 17 | zwei tatsächliche L15-Erfolge nach 106/168 Inputs |
| 18–20 | hohe Varianz, L11/L12/echte Tode, vielfach schwache Gegner |
| 21–22 | Einkäufe/Verkäufe und tatsächliche E-Klassenannahme; Saveproblem separat |
| 23–24 | weitere L15/16/17/18 und E-Klassen, Wartezeit/Ortsdefekte separat |
| 25–26 | weitere E-Annahmen und unterschiedliche Spielweisen, Objekt-/Kampfstops separat |
| 27–28 | natürliche E-Erfolge, L15 nach 168 bis 417 Inputs, Einfluss von Inhalten und RP deutlich |

Die exakten Einzel- und Batch-Reviewpfade einschließlich sämtlicher 50 Hauptreviews sind bereits im [historischen Runindex](../testrun_10b/archiv/README.md) einzeln verzeichnet. Die tabellarische Gruppierung hier vermeidet eine zweite vollständige Dateiliste.

| Neuere Evidenz | Funktion im Bericht |
|---|---|
| NPC/PULSE .174/.179/.183/.186/.188/.191 | Weltleben, Kontakte, Gefahren, Pausen, historische Identitäts-/Ortsprobleme; keine E–S-Balance |
| persönliche User01/02 | XP nicht automatisch zu gering, Loot/Erkundung, Gefahr, UI |
| User03/04 | Dungeon-/Questprogression; User04 L8 in46 Inputs, alte Zahlen |
| User05/06 | Kampfentfernung, Ressourcen, Dungeon, HUD; frühe tödliche Gruppen und Performance |
| User07/08 | Camp, sichtbare Funde, F-Dungeon und Handel; keine verlässlichen Preise aus Fehlbuchung |
| User09/10 | Gefahrenanzeige, frühe Tode/Boardfehler, kein pauschaler Balancebefund |
| User11/12 | Major/Minor, Distanz, Kampf-HUD, Preis-/Handelskomfort |
| User13/14 | Kapitulation, NPC-/Partyhoheit, später mechanisch ausgebaut |
| User15/16 | Population, Reise/Orte, tatsächliche Ressourcen, Proficiency-/Rastkomfort |
| .222–.235 | echte Party-NPCs, gemeinsame Siege und Gildenabschluss |
| .236–.244 | dauerhafte Party, Trennung/Ansprüche, unterschiedliche natürliche Kampfverläufe |
| .245–.251 | vollständige Routineketten, Waffen-/Handel-/Lernbelege, weitere gemeinsame Quest |
| .252–.261 | Offline-Claim+State-Abnahme, keine neue natürliche Kampagnenmessung |

---

## 12. Priorisierte gemeinsame Designentscheidungen und Messprogramm

| Thema | Jetzt für E entscheiden | Richtung bis S | Noch nicht nötig |
|---|---|---|---|
| Weltstruktur | lokale E-Gefahr und glaubwürdige Zugänge aus bestehender Welt | geschichtete Geographie, Macht und seltene Akteure | sieben vollständige Rangregionen/Atlas |
| Progression | Tempo und erlebte F/E-Meilensteine, XP-/Party-Verhältnis | längerfristige Kurven und abnehmende Häufigkeit hoher Ränge | feste Dauer jedes Rangs aus wenigen Runs |
| Klassen | bestehende E-Evolution sinnvoll nutzen/prüfen | konzeptionelle weitere Evolutionsstufen | alle D–S-Klassen jetzt bauen |
| Kampf | repräsentative E-Begegnungen, Gruppen und Ressourcen | Gegnerrollen und neue Herausforderungen statt reiner Zahlensteigerung | universelles neues Kampfsystem |
| Skills/Passive | E-Lernwege, Skill-/Complexity-/P-Abgleich | Grenzen, Slots und Entwicklungsquellen langfristig anschlussfähig | sämtliche Effekte bis S |
| Gear/Loot | spürbarer E-Übergang, Qualität, Rüstung, Loot | abgestimmte Progressions-/Seltenheitskurve | generative Affix-/Crafting-Großarchitektur |
| Wirtschaft | E-Auftragserlöse, echte Upgrade-/Lernkosten | Exponentialeffekte und Marktstruktur prüfen | globale Handels-/Währungswirtschaft simulieren |
| Gilde/Quests | Proven-Jagden, E-Dungeon, abwechslungsreiche Abenteuer | institutionell passende höherwertige Aufträge | alle Questfamilien sofort |
| Party/NPCs | E-Gruppen-/Lohn-/XP-Balance | glaubwürdige höhere NPCs und Ressourcen | P7-Validierungsumbau ohne Befund |
| HUD | Rank-/Skill-/Gear-/Partykomfort passend zum neuen Inhalt | wachsender Bestand übersichtlich | großer Redesign-Auftrag |

Gemeinsamer Mindestnachweis für neue Zahlen: tatsächliche Rechenformeln, Vergleich alter/alternativer Werte, Auswirkungen auf mehrere Spielweisen, klare Trennung von Simulation und natürlichem Spiel, keine Änderung anhand eines einzelnen tödlichen Encounters. Benannte Annahmen und dokumentierte Gegenbeispiele. Bereits geplante .262-Progressions-/Skalierungsmessungen später einbeziehen; nicht auf Verdacht dieselben technischen Analysen wiederholen.

**Empfehlung GPT:** zuerst ein zusammenhängendes E-Fachkonzept mit verständlicher späterer Welt-/Rangrichtung. Danach E-Inhalte in einem konsistenten Paket entwickeln, statt E-Waffen, E-Gegner, E-Quests und E-Lernquellen ohne gegenseitigen Bezug nacheinander zufällig zu veröffentlichen. Keine Voraussetzung, F vorher zu perfektionieren. Keine neue universelle Validierungsarchitektur. Nutzer entscheidet über Kanon, Zahlen, Spielgefühl und Freigabe.

---

## 13. Anschlussauftrag für Claude – Balancing und Weltmodell

Diese konsolidierte Datei ist der Ausgangspunkt, nicht ein Implementierungsauftrag. Claude soll die Quellen nicht pauschal nochmals vollständig durcharbeiten. Bei einem strittigen Zahlenwert oder einer wichtigen Schlussfolgerung darf und soll er den gezielten Produktpfad bzw. den verlinkten Testreview nachprüfen.

Erwartet wird ein zusammenhängender unabhängiger Forschungsbericht:

- **Aktuelle Ausgangsregeln** korrigieren, falls die Konsolidierung einen historischen und heutigen Wert vermischt; Korrekturen belegen. Keine Kanonentscheidungen ohne Nutzer.
- **Alle neun Themen plus Party** gemeinsam auswerten. Sinnvolle Balancevarianten mit konkreten E-Beispielen, rechnerischen Folgen und offenen Optionen. Die Kopplungen zwischen XP, Gegnern, Skills, Gear, Loot, Wirtschaft und Gilde sichtbar machen.
- **Weltstruktur als eigenes Kernkapitel:** bevorzugtes Weltmodell ohne künstliche E–S-Großzonen; konkrete E-Spielmöglichkeiten in den vorhandenen Regionen und langfristige Einbettung von D–S. Politische, ökologische, soziale und mechanische Macht zusammen denken. Nicht den gesamten Kontinent oder alle hohen Ränge schon kanonisch ausfüllen.
- **Numerische Vergleichsgrundlagen** F→E für XP, Stats, Skills, Waffen/Rüstung, Gegner, Questlohn und Loot. Mehrere plausible Spielweisen vergleichen; ggf. sichere Offline-Simulationen auf gepinntem Ausgangsprodukt. Keine bezahlten Requests ohne gesonderte Freigabe.
- **Priorisierte Entscheidungsvorlage**: welche wenigen Entscheidungen der Nutzer zuerst treffen muss, welche Zahlen bewusst provisorisch bleiben, was erst bei natürlichem E-Spiel zu beurteilen ist. Konkrete empfohlene Variante statt bloß eine lange Liste.
- **Technischer Anschluss:** vorhandene Mechaniken weiterverwenden, .262 als separate technische Vorarbeit berücksichtigen, keine neue Gesamtarchitektur und keine ungefragte Änderung am Produktbranch. Wenn ein Vorschlag einen neuen Verbraucher erfordert, diesen benennen.
- **Nicht-Ziele:** erneute Claim+State-Diskussion, allgemeine Legacy-/Prompt-/Speicheroptimierung, vollständige D–S-Implementierung, neue Features aus theoretischem Perfektionismus, ungefragte Ausweitung des HUD-/Simulationsumfangs.

Der Nutzer möchte eine natürliche, videospielartige High-Fantasy-Sandbox mit echter Progression, interessanten Abenteuern, organischen Klassen/Skills, glaubwürdiger Welt und gutem HUD. Ein höherer Rang soll sich mächtig anfühlen, aber die Welt soll nicht still an ihn angepasst werden. Diese Anforderung ist wichtiger als eine rein mathematisch gleichförmige Abfolge von sieben Gebietsstufen.

**Ende der Fachgrundlage. Keine Produkt- oder Kanonfreigabe.**
