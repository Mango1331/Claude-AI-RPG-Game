# Ausrüstung, Progression und Kampfbalance auf .195

**15.11.2026 · empirische Analyse und unbeschlossene Vergleichsentwürfe. Keine Balanceimplementierung, kein neuer Kanon und keine Freigabe für einen persönlichen Spieltest.**

## 1. Ergebnis und geprüfter Produktstand

PR [#16](https://github.com/Mango1331/Claude-AI-RPG-Game/pull/16) wurde nach Kontrolle regulär gemergt. Vorher lagen `main` auf `ae0a4c63d3fcebabbdc2888cf866b8c76b2f9c1c`, der Produktbranch auf `3a4ad81889c3344b8feb802124703758f5239ac5` und der PR unverändert auf dem freigegebenen `f1abcf3c9df11053f3f6b5b741d2b4e2dcfd4ce6`; PR offen, mergebar, Zustand CLEAN. Es gab keine zusätzlichen Änderungen.

**Neuer Produkt-HEAD: [`7044d29ba461a777dc758fcab9f8ca9394dd5a46`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7044d29ba461a777dc758fcab9f8ca9394dd5a46), Build `4.3.0-c.6.6.195`.** Eltern: `3a4ad818…` und `f1abcf3…`. Der Enginebaum ist exakt derselbe wie beim freigegebenen PR-HEAD. Kein Squash, Rebase oder Force-Push. Alle folgenden Berechnungen verwenden diesen gemergten Stand.

Die wenigen aussichtsreichsten Änderungen sind **eine nachvollziehbare E-Waffenprogression, ein bewusst vereinheitlichtes menschliches Statbudget und das Entfernen des wirkungslosen F-fine-Schild-Upgrades**. Die Daten begründen weder einen allgemeinen Bossbuff noch einen allgemeinen Rüstungsnerf.

| Befund | Nachweis auf .195 | Einordnung |
| --- | --- | --- |
| F→E-Waffen/Foki | fine 14→14, superior 18→18, exceptional 22→20; alleiniger exceptional-Waffenwechsel senkt die Siegquote um 10/12/10 Prozentpunkte (Warrior/Mage/Rogue) im untersuchten E-Elitekampf | Reproduzierbare Inkonsistenz des Content-/Generierungspfads |
| F-fine-Schild | common und fine beide DEF 4/MDEF 3, beide 56 cp; identische Kampfprotokolle | Vollständiges Qualitätsplateau, kein Rechenfehler |
| Menschliche NPCs | 32+7×(L−1) gegen PC 32+5×(L−1); bei L14 26 zusätzliche Punkte | Nicht an .195 angeglichene, technisch bestätigte Asymmetrie |
| Bossstärke | PC 10 mixed/P1 gegen Boss 9: Arthropod alle 100 % Siege; Bär alle 0 %; Spirit 100/25/100 % | Körperplan und Taktik wichtiger als ein globaler Multiplikator |
| Gear wirkt | Warrior 5 gegen Armored-Guardian 6: Starter 0 %, fine 100 % Siege; exceptional deutlich mehr Rest-HP | Upgrades sind an Schwellen sehr spürbar |
| Schutz | Schild und schwere Rüstung helfen stark; nur schwache Gegner erreichen hier den 10-%-Schadensboden | Keine Evidenz für generell endlose Rüstungskämpfe |
| Messqualität | 210 Szenarien × 100 feste Seeds = 21.000 ausgewertete Kämpfe; alle terminal, 0 ungültige Aktionen, 0 Abbrüche | Geskriptete Enginekämpfe, keine natürliche Spielabnahme |

## 2. Grundlagen, Funktionen und Methodik

Gezielt gelesen: [Kanon 02](../02_DESIGN_KANON.md), [Stand 03](../03_AKTUELLER_PROJEKTSTAND.md), [Roadmap 07](../07_ROADMAP_NACH_10B_ENTWURF.md), [Fachindex 06](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [F-/E-Entwurf](../testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), die auf Anatomie/Bosskörper bezogenen Befunde der [Monsteranalyse](MONSTERDESIGN_ANALYSE_20261028.md), sowie Bossloot-Content und [U1–U11](../patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md). Ältere Zahlen sind historische Vorschläge; die folgenden Zahlen stammen aus .195.

Alle Produktlinks in dieser Tabelle beziehen sich auf den festen Mergecommit:

| Quelle | Tatsächlich verwendeter Pfad |
| --- | --- |
| [content/gear.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/content/gear.json) | Referenzintervalle, Qualität, F-Waffentabelle, Preise, Starterkits |
| [content/rules.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/content/rules.json) | 5 freie Punkte; Derived-, Schadens-, Rang- und Proficiencyregeln |
| [content/classes.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/content/classes.json) | Favored-Zuordnung, Basic Attack und Starterpools |
| [content/monsters.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/content/monsters.json) | Echte Anker, Level-/Elite-/Bossmultiplikatoren, Bossloot-Pools |
| [src/v4/items.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/v4/items.js) | itemProfile (balance:true), valueOf, gearRetailPrice, gearOfferProfile, rankRefusal |
| [src/derived.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/derived.js) | deriveCharacter, rawPower, tatsächlich angelegte Slots |
| [src/combat.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/combat.js) | initEncounter, attackAction, damagePreview, runCombat, native NPC-Policy, terminal |
| [src/npcgen.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/npcgen.js) | scaleCreature und humanSheet/rulesetTwoSheet |
| [src/progression.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/progression.js) | awardXp; reale Eventbuchung über character() und assignStat |
| [src/v4/special_rewards.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/src/v4/special_rewards.js) | Identische Gearprofile für Sonderloot; Qualitäts-/Klassen-/Themenpool |
| [tools/sim/combat.mjs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/tools/sim/combat.mjs) | load, character, setup, choose, simulate; keine ersetzende Schadensformel |
| [tools/sim/baseline.json](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/tools/sim/baseline.json) | 218 vorhandene Szenarien; vier offizielle Smoke-Szenarien zur Methodenkontrolle |

### Validierung und Zählweise

- Der unveränderte Simulator lief zunächst mit seinen vier `--smoke`-Szenarien × drei Seeds: **12 Kämpfe**. Das ist ein **lokaler Simulatortest, kein ST-Smoke**.
- Der temporäre Messrunner reproduzierte für dieselben zwölf Fälle sämtliche Kampf-Records, Würfelprotokolle, HP, Terminalstatus und Engine-Rundenzähler exakt. Fünf zusätzliche Gear-/NPC-/Bogenfälle waren bei identischem Seed exakt wiederholbar: **17/17 Methodenprüfungen**.
- **2.065 Profile** aus 59 unterstützten `gearBases` × sieben Rängen × fünf Qualitäten wurden mit echten Itemfunktionen geprüft. F-Shopprofile haben dieselben Kampfwerte und Richtwerte wie der gemeinsame Generierungspfad; alle Waffenfamilien teilen die jeweilige ATK- bzw. MATK-Zahl.
- Hauptmatrix 178 + gezielter Nachlauf 32 Szenarien; jeweils **Seeds 7001–7100**, identische Seeds für Varianten. Die dokumentierte finale Matrix umfasst **21.000 vollständige Kämpfe**, keine Flucht, kein technisches Unentschieden, keinen Hänger und keine ungültige ausgeführte Aktion.
- Grenze: 100 Runden bzw. 300 Runner-Schritte. Ein Überschreiten hätte als **Abbruch**, niemals als Niederlage gegolten. Keine Grenze wurde erreicht.
- **Runden** sind die höchste tatsächlich ausgeführte `record.round`. Der native `enc.round`-Zähler kann nach dem letzten Schlag schon zur nächsten Runde weitergeschaltet sein; er bleibt gesondert in den Rohdaten. Die Hauptmatrix wurde nach dieser Messpräzisierung erneut vollständig erzeugt.
- HP-Schaden aus/ein: tatsächliche HP-Differenzen, also ohne Overkill und abzüglich Barrieren. Schaden pro Angriff/PC-Turn: Summe der gerollten `strike.final`, einschließlich möglichem Overkill, dividiert durch Angriffsaktionen bzw. alle PC-Aktionen. Kosten und Pfeile stammen aus den gebuchten Records. Rest-HP beziehen sich **nur auf Siege**. Mittelwerte sonst über alle 100 Kämpfe; Medianrunden ebenfalls über alle.
- DEF/MDEF-Minderung: `1 − Summe(post_def)/Summe(power)` vor Varianz/Barrieren. Der komplette Treffer wird von `resolveStrike` gerechnet, nicht von einer Näherungsformel des Runners.

Ein Unterschied von einigen Prozentpunkten an einer engen Schadensschwelle ist seedabhängig. 0/100 oder 100/100 bedeuten keine universelle 0-/100-%-Weltwahrscheinlichkeit (binomiale 95-%-Wilson-Grenze ungefähr 3,7 % bzw. 96,3 %). Es sind kontrollierte Vergleiche dieses Szenarios.

### Spieler, Ausrüstung und Taktiken

Charaktererstellung und XP laufen über den vorhandenen `character()`-Simulator: Ruleset 2, Level 1/5/10/14/15, einmalige Favored-Boni, reale `awardXp`-/`assignStat`-Events. Danach volle HP/MP/STA **als definierter Kampfstart**; keine Regeneration während des Kampfes. Keine zusätzliche automatische Klassenentwicklung auf L15. Rangsperren werden beim Einsetzen der Analyseausrüstung geprüft.

Pro fünf freien Punkten wird nach den folgenden Gewichten verteilt; bei Resten arbeitet die vorhandene Simulatorfunktion mit Abrunden und Rest im letzten aufgeführten Attribut:

| Klasse | Offensiv O | Ausgewogen A | Defensiv D | Gewählte zwei Starter-Skills |
| --- | --- | --- | --- | --- |
| Warrior | STR 3/VIT 1/AGI 1 | STR 2/VIT 2/AGI 1 | STR 1/VIT 3/WIL 1 | Heavy Slash, Guard |
| Mage | INT 3/WIL 1/VIT 1 | INT 2/WIL 1/VIT 2 | INT 1/WIL 2/VIT 2 | Arcane Bolt, Arcane Ward |
| Rogue | AGI 3/PER 1/VIT 1 | AGI 2/PER 1/VIT 2 | AGI 1/VIT 3/WIL 1 | Razor Cut, Piercing Thrust |

Standard: ausgewogen, P1, SHORT, kein Hinterhalt/First Strike, keine Deckung, tatsächlich feindlicher Gegner. Warrior trägt Schwert/schwere Rüstung, Mage Stab/Roben, Rogue Dolch/leichte Rüstung. **A Starter**, **B fine**, **C superior**, **D exceptional** ersetzen jeweils Waffe und Rüstung, ohne zusätzlichen Schild. **E mixed** = superior-Waffe + fine-Rüstung. **F Rangwechsel** vergleicht auf demselben PC-Level 15 F-exceptional gegen sämtliche E-Qualitäten; ein Zusatzpaar ersetzt ausschließlich die Waffe bei festgehaltener F-exceptional-Rüstung.

`skill` ist die vorhandene `choose()`-Taktik: erster legaler offensiver Skill, danach weitere Skills/Basic, nötigenfalls Annäherung. Dadurch bevorzugt Rogue **Razor Cut**, nicht automatisch Piercing Thrust. `max` wählt stattdessen anhand des echten `damagePreview` den höchsten mittleren Vorschau-Schaden, ohne den Zufallswurf vorauszulesen; Legalität wird mit einer verworfenen Context-/Dice-Kopie geprüft. NPCs verwenden immer die echte Engine-Policy einschließlich situativer Verteidigung. Daher sind selbst gleiche Werte **kein symmetrisches 50/50-PvP-Experiment**.

`defensive` ist die vorhandene alternierende Schutz-Taktik (Guard/Ward, dann Angriff); Rogue hat in diesem Loadout keine entsprechende Abwehr. `bow` verwendet ausdrücklich Bow Shot, 20 reale Pfeile und passende Annäherung, keinen erfundenen Bogenskill. Kein Kiting. Gruppen werden Ziel für Ziel bekämpft; keine AoE-Auswahl, Tränke, Heilskills, Fluchtentscheidung, NPC-Hilfe, Passive oder neue Signaturtechniken. P3/P5 sind getrennte Sensitivitäten, kein behaupteter automatischer Mastery-Stand eines Levels. Menschliche Vorlagen erhalten ihre nativen zwei Skills; kontrollierte NPC-Fälle kopieren PC-Skills und Gear, behalten aber die dokumentierte NPC-Punkteverteilung.

## 3. Ausrüstung: vollständige aktuelle Zahlen

### 3.1 F/E einschließlich Preise

ATK gilt gleichermaßen für Nahkampf-, Precision- und Bogenwaffen; MATK für Foki. Unterschiedlich sind Familie, Skillformel, Reichweite und Munition, nicht der generierte Waffenwert. Rüstung/Roben sind ein gemeinsamer Slot; Schild ist offhand. In den Preisfeldern steht **Richtwert / regulärer F-Shoppreis**, in cp. E hat hier **keinen festen Retailpreis** (`—`), und ein Richtwert ist niemals ein zugesicherter Verkaufserlös.

| Rang | Qualität | ATK = MATK | Schwer DEF/MDEF | Leicht DEF/MDEF | Schild DEF/MDEF | Waffe cp | Schwer cp | Leicht cp | Schild cp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F | crude | 6 | 5/1 | 2/2 | 3/2 | 48 / 48 | 48 / 48 | 32 / 32 | 40 / 40 |
| F | common | 10 | 6/2 | 3/3 | 4/3 | 80 / 80 | 64 / 64 | 48 / 48 | 56 / 56 |
| F | fine | 14 | 7/2 | 3/4 | 4/3 | 140 / 140 | 72 / 72 | 56 / 56 | 56 / 56 |
| F | superior | 18 | 8/3 | 4/5 | 5/4 | 252 / 260 | 88 / 88 | 72 / 72 | 72 / 72 |
| F | exceptional | 22 | 9/4 | 5/6 | 6/5 | 440 / 480 | 104 / 104 | 88 / 88 | 88 / 88 |
| E | crude | 7 | 9/2 | 4/4 | 5/4 | 98 / — | 154 / — | 112 / — | 126 / — |
| E | common | 11 | 11/3 | 5/5 | 6/5 | 154 / — | 196 / — | 140 / — | 154 / — |
| E | fine | 14 | 12/4 | 6/7 | 8/6 | 196 / — | 224 / — | 182 / — | 196 / — |
| E | superior | 18 | 14/5 | 7/9 | 9/7 | 252 / — | 266 / — | 224 / — | 224 / — |
| E | exceptional | 20 | 15/6 | 8/10 | 10/8 | 280 / — | 294 / — | 252 / — | 252 / — |

Die tatsächliche Formel für E–S ist `round((lo + at × (hi−lo)) × (1+0,75R))`, mit R=0…6 und Qualitätspositionen `at=0/0,35/0,7/1/1,25`. Für F-Waffen/Foki mit `balance:true` ersetzt dagegen die feste Folge **6/10/14/18/22** diesen Ausdruck. Das erklärt den Bruch: E-exceptional ist `round(11,5×1,75)=20`, nicht `round(22×1,75)`.

`valueOf` vereinfacht sich für Gear tatsächlich zu `round(8 × Summe(Kampfwerte) × Rangfaktor × Q)`. Q ist nur für entsprechend markierte F-Waffen 1/1/1,25/1,75/2,5; sonst 1. Der erläuternde JSON-Text mit „Faktor²“ beschreibt das ungefähre Wachstum einschließlich bereits skalierter Stats, **keinen zweiten, zusätzlich anzuwendenden Faktor²**. F-Retail überschreibt superior auf 260 und exceptional auf 480 cp.

### 3.2 Alle Qualitäten bis S

Reihenfolge in jeder Zelle: **crude · common · fine · superior · exceptional**. Damit sind alle sieben Ränge und fünf Qualitäten erfasst; Schild/Armor sind jeweils DEF/MDEF.

| Rang | Waffe ATK / Fokus MATK | Schwere Rüstung | Leicht/Roben | Schild |
| --- | --- | --- | --- | --- |
| F | 6 · 10 · 14 · 18 · 22 | 5/1 · 6/2 · 7/2 · 8/3 · 9/4 | 2/2 · 3/3 · 3/4 · 4/5 · 5/6 | 3/2 · 4/3 · 4/3 · 5/4 · 6/5 |
| E | 7 · 11 · 14 · 18 · 20 | 9/2 · 11/3 · 12/4 · 14/5 · 15/6 | 4/4 · 5/5 · 6/7 · 7/9 · 8/10 | 5/4 · 6/5 · 8/6 · 9/7 · 10/8 |
| D | 10 · 15 · 21 · 25 · 29 | 13/3 · 15/4 · 18/6 · 20/8 · 22/9 | 5/5 · 7/8 · 9/10 · 10/13 · 11/14 | 8/5 · 9/7 · 11/9 · 13/10 · 14/11 |
| C | 13 · 20 · 27 · 33 · 37 | 16/3 · 20/6 · 23/8 · 26/10 · 28/11 | 7/7 · 9/10 · 11/13 · 13/16 · 15/19 | 10/7 · 12/9 · 14/11 · 16/13 · 18/15 |
| B | 16 · 24 · 33 · 40 · 46 | 20/4 · 24/7 · 28/10 · 32/12 · 35/14 | 8/8 · 11/12 · 14/16 · 16/20 · 18/23 | 12/8 · 15/11 · 18/14 · 20/16 · 22/18 |
| A | 19 · 29 · 39 · 48 · 55 | 24/5 · 29/8 · 34/11 · 38/14 · 42/17 | 10/10 · 13/14 · 16/19 · 19/24 · 21/27 | 14/10 · 18/13 · 21/16 · 24/19 · 26/21 |
| S | 22 · 34 · 45 · 55 · 63 | 28/6 · 33/9 · 39/13 · 44/17 · 48/19 | 11/11 · 15/17 · 19/23 · 22/28 · 25/32 | 17/11 · 20/15 · 24/19 · 28/22 · 30/25 |

Die zugehörigen **Richtwerte** aller Qualitäten in cp, gleiche Reihenfolge:

| Rang | Waffe/Fokus | Schwer | Leicht/Roben | Schild |
| --- | --- | --- | --- | --- |
| F | 48 · 80 · 140 · 252 · 440 | 48 · 64 · 72 · 88 · 104 | 32 · 48 · 56 · 72 · 88 | 40 · 56 · 56 · 72 · 88 |
| E | 98 · 154 · 196 · 252 · 280 | 154 · 196 · 224 · 266 · 294 | 112 · 140 · 182 · 224 · 252 | 126 · 154 · 196 · 224 · 252 |
| D | 200 · 300 · 420 · 500 · 580 | 320 · 380 · 480 · 560 · 620 | 200 · 300 · 380 · 460 · 500 | 260 · 320 · 400 · 460 · 500 |
| C | 338 · 520 · 702 · 858 · 962 | 494 · 676 · 806 · 936 · 1014 | 364 · 494 · 624 · 754 · 884 | 442 · 546 · 650 · 754 · 858 |
| B | 512 · 768 · 1056 · 1280 · 1472 | 768 · 992 · 1216 · 1408 · 1568 | 512 · 736 · 960 · 1152 · 1312 | 640 · 832 · 1024 · 1152 · 1280 |
| A | 722 · 1102 · 1482 · 1824 · 2090 | 1102 · 1406 · 1710 · 1976 · 2242 | 760 · 1026 · 1330 · 1634 · 1824 | 912 · 1178 · 1406 · 1634 · 1786 |
| S | 968 · 1496 · 1980 · 2420 · 2772 | 1496 · 1848 · 2288 · 2684 · 2948 | 968 · 1408 · 1848 · 2200 · 2508 | 1232 · 1540 · 1892 · 2200 · 2420 |

### 3.3 Gleichstände, Rückschritte und Preisnutzen

- **Einziger gleichqualitativer Rangrückschritt:** F→E exceptional bei sämtlichen Waffen/Foki **22→20 (−9,1 %)**. Fine 14 und superior 18 steigen überhaupt nicht. Alle anderen Rangwechsel der untersuchten Kernwerte steigen; Ausnahme eines Einzelwertgleichstands: crude schwere Rüstung MDEF 3 von D→C. Ihr DEF steigt 13→16, sie ist insgesamt kein Null-Upgrade.
- **Vollständiger Qualitätsgleichstand:** F-Schild common und fine beide 4/3. Drei Seedpaare ergaben identische vollständige Kampfprotokolle. Andere Qualitätsfolgen steigern mindestens einen Nutzwert; einzelne DEF-/MDEF-Gleichstände durch Rundung bleiben, etwa F-heavy common→fine MDEF 2 und F-light common→fine DEF 3. Kein Qualitätsrückschritt.
- **Überlappende Ränge sind nicht grundsätzlich falsch:** F-exceptional 22 darf E-common 11 schlagen; auch D-common 15 liegt unter F-exceptional 22, D-superior 25 schließlich darüber. Problematisch ist die Kombination **gleicher Qualität und höherer Nutzungsanforderung bei kleinerem oder gleichem Wert**.
- **Ungleicher F→E-Sprung:** exceptional schwere Rüstung 9/4→15/6 (+6/+2), Schild 6/5→10/8 (+4/+3), aber Waffe 22→20. Ein vollständiger E-Satz kann deshalb besser sein, obwohl die Waffe schlechter wird. Die isolierte Waffenprobe in §5 verhindert diese Verwechslung.
- **Preis-/Nutzenbruch:** fine-Waffe F140→E196 cp für denselben Wert 14; superior Richtwert 252→252 für 18; exceptional 440→280 trotz Ranganstieg und schlechterem Wert. Das sind Bewertungsrichtlinien, keine belegte Händlerarbitrage.
- **F-Kaufentscheidungen:** Starter 10→fine 14 kostet 140 cp. fine→superior gibt +4 für 120 weitere cp, superior→exceptional nochmals +4 für 220 cp. Grenzkosten 30 bzw.55 cp je weiterem Waffenpunkt. Dagegen liefert ein neuer common-Schild 4 DEF +3 MDEF für 56 cp; crude 3/2 kostet 40 cp und passt bereits ins Startvermögen 50 cp. Ein freier Offhand-Slot ist deshalb oft der bessere erste Schutzkauf.
- **Starter unterscheiden sich bewusst:** Ruleset-2-PC-Waffen 10, ältere/personengebundene Starterwaffen 5/6; Warriorarmor 6/2, Mage-/Roguearmor 2/3. Reguläres F-common 10 entspricht der PC-Waffe; F-common Roben 3/3 verbessern die Starterrobe um 1 DEF. Namen allein geben keine Extraeffekte. Eine generische F-Waffe ohne `balance:true` kann weiterhin aus dem alten Referenzpfad 4/6/8/10/12 stammen; regulärer F-Shop und Bossloot verwenden dagegen nachweislich den neuen gemeinsamen Pfad. Bereits gespeicherte Instanzwerte werden nicht neu gewürfelt.

### 3.4 Bossfund oder Handelsgut?

Bossloot nutzt exakt `itemProfile(..., balance:true)`, keine eigene bessere Waffenskala. Beim ersten Endboss kommen 94 % Gear (davon 90 % superior, 10 % exceptional),6 % Skill Stone; zusätzlich die materielle F-Trophäe mit Richtwert 60 cp. Erster Guardian:63,7 % Gear nach dem 2-%-Stone-Ersatz, nicht 65 % unbedingte Gearchance. Der Klassenpool wird mit 70 % gewählt; das ist **keine Garantie für ein Upgrade der aktuell getragenen Waffe**.

Ein superior-F-Fund 18 ist gegenüber Starter 10 ein +8-Waffenupgrade; gegenüber einem schon gekauften superior 18 kein Werteupgrade. Ein fine-Schild kann gegenüber common 4/3 überhaupt nichts verbessern. Thematische Offclass-Foki/Waffen bleiben nutzbar, können im aktuellen Build aber nur zum Verkauf oder für einen späteren Stil sinnvoll sein. Der erste Boss garantiert keine passende Waffenart: Im Warrior-Klassenpool sind vier von sieben Einträgen Waffen, zwei Rüstungen und ein Schild; Mage drei Foki/eine Robe; Rogue drei Waffen/zwei leichte Rüstungen. Der Themenpool kann das verändern.

Die typischen F-Boss-Gearrichtwerte unterscheiden sich stark: superior-Waffe 252, schwere Rüstung 88, leichte 72, Schild 72 cp; exceptional 440/104/88/88 cp. Hoher Richtwert heißt deshalb weder proportional mehr Schaden noch garantierter Erlös. In der Matrix spart ein besseres Einzelstück Treffer; gegen einen bereits überlevelten kleinen Boss kann es kaum noch sichtbare Rundenvorteile bringen. **Keine Änderung der Dropraten erforderlich, um den belegten Rangbruch und das Schildplateau zu beheben.**

## 4. Charakter-, Skill- und Gegnerentwicklung

### 4.1 Tatsächliche Derived-Werte

HP=`50+5L+5VIT`, MP=`8INT+4WIL`, STA immer 100; Grund-DEF=`floor(VIT/4)`, Grund-MDEF=`floor(WIL/4)`, Initiative=`floor(1,5AGI)`. ATK/MATK sind in dieser Anzeige Gearwerte, kein bereits mit STR/INT berechneter Gesamtschaden. PER erhöht weder Initiative noch Trefferchance; es bleibt für Wahrnehmung/andere Weltprüfungen relevant.

Alle folgenden Charaktere haben die jeweilige **Starterausrüstung**, P1, keine Passive/Klassenentwicklung. Stats in Reihenfolge **STR/VIT/AGI/INT/PER/WIL**, Abwehr einschließlich Gear. A/O/D wie §2; bei L1 sind alle drei Verteilungen identisch.

| Klasse | L | Stil | Stats | HP | MP | ATK/MATK | DEF/MDEF | Init |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warrior | 1 | A | 6/6/5/5/5/5 | 85 | 60 | 10/0 | 7/3 | 7 |
| warrior | 5 | O | 18/10/9/5/5/5 | 125 | 60 | 10/0 | 8/3 | 13 |
| warrior | 5 | A | 14/14/9/5/5/5 | 145 | 60 | 10/0 | 9/3 | 13 |
| warrior | 5 | D | 10/18/5/5/5/9 | 165 | 76 | 10/0 | 10/4 | 7 |
| warrior | 10 | O | 33/15/14/5/5/5 | 175 | 60 | 10/0 | 9/3 | 21 |
| warrior | 10 | A | 24/24/14/5/5/5 | 220 | 60 | 10/0 | 12/3 | 21 |
| warrior | 10 | D | 15/33/5/5/5/14 | 265 | 96 | 10/0 | 14/5 | 7 |
| warrior | 14 | O | 45/19/18/5/5/5 | 215 | 60 | 10/0 | 10/3 | 27 |
| warrior | 14 | A | 32/32/18/5/5/5 | 280 | 60 | 10/0 | 14/3 | 27 |
| warrior | 14 | D | 19/45/5/5/5/18 | 345 | 112 | 10/0 | 17/6 | 7 |
| warrior | 15 | O | 48/20/19/5/5/5 | 225 | 60 | 10/0 | 11/3 | 28 |
| warrior | 15 | A | 34/34/19/5/5/5 | 295 | 60 | 10/0 | 14/3 | 28 |
| warrior | 15 | D | 20/48/5/5/5/19 | 365 | 116 | 10/0 | 18/6 | 7 |
| mage | 1 | A | 5/5/5/6/5/6 | 80 | 72 | 0/10 | 3/4 | 7 |
| mage | 5 | O | 5/9/5/18/5/10 | 120 | 184 | 0/10 | 4/5 | 7 |
| mage | 5 | A | 5/13/5/14/5/10 | 140 | 152 | 0/10 | 5/5 | 7 |
| mage | 5 | D | 5/13/5/10/5/14 | 140 | 136 | 0/10 | 5/6 | 7 |
| mage | 10 | O | 5/14/5/33/5/15 | 170 | 324 | 0/10 | 5/6 | 7 |
| mage | 10 | A | 5/23/5/24/5/15 | 215 | 252 | 0/10 | 7/6 | 7 |
| mage | 10 | D | 5/23/5/15/5/24 | 215 | 216 | 0/10 | 7/9 | 7 |
| mage | 14 | O | 5/18/5/45/5/19 | 210 | 436 | 0/10 | 6/7 | 7 |
| mage | 14 | A | 5/31/5/32/5/19 | 275 | 332 | 0/10 | 9/7 | 7 |
| mage | 14 | D | 5/31/5/19/5/32 | 275 | 280 | 0/10 | 9/11 | 7 |
| mage | 15 | O | 5/19/5/48/5/20 | 220 | 464 | 0/10 | 6/8 | 7 |
| mage | 15 | A | 5/33/5/34/5/20 | 290 | 352 | 0/10 | 10/8 | 7 |
| mage | 15 | D | 5/33/5/20/5/34 | 290 | 296 | 0/10 | 10/11 | 7 |
| rogue | 1 | A | 5/5/6/5/6/5 | 80 | 60 | 10/0 | 3/4 | 9 |
| rogue | 5 | O | 5/9/18/5/10/5 | 120 | 60 | 10/0 | 4/4 | 27 |
| rogue | 5 | A | 5/13/14/5/10/5 | 140 | 60 | 10/0 | 5/4 | 21 |
| rogue | 5 | D | 5/17/10/5/6/9 | 160 | 76 | 10/0 | 6/5 | 15 |
| rogue | 10 | O | 5/14/33/5/15/5 | 170 | 60 | 10/0 | 5/4 | 49 |
| rogue | 10 | A | 5/23/24/5/15/5 | 215 | 60 | 10/0 | 7/4 | 36 |
| rogue | 10 | D | 5/32/15/5/6/14 | 260 | 96 | 10/0 | 10/6 | 22 |
| rogue | 14 | O | 5/18/45/5/19/5 | 210 | 60 | 10/0 | 6/4 | 67 |
| rogue | 14 | A | 5/31/32/5/19/5 | 275 | 60 | 10/0 | 9/4 | 48 |
| rogue | 14 | D | 5/44/19/5/6/18 | 340 | 112 | 10/0 | 13/7 | 28 |
| rogue | 15 | O | 5/19/48/5/20/5 | 220 | 60 | 10/0 | 6/4 | 72 |
| rogue | 15 | A | 5/33/34/5/20/5 | 290 | 60 | 10/0 | 10/4 | 51 |
| rogue | 15 | D | 5/47/20/5/6/19 | 360 | 116 | 10/0 | 13/7 | 30 |

Das Gesamtbudget beträgt 32/52/77/97/102 Punkte auf L1/5/10/14/15. Das alte 7er-Budget läge bei 32/60/95/123/130; .195 entfernt 0/8/18/26/28 automatische Punkte. Im ansonsten identischen alten Vergleich bekommt Warrior auf L14+13 STR/+13 VIT (zusätzlich 65 HP und hier 3 Grund-DEF), Mage +13 INT/+13 WIL (156 MP und 4 Grund-MDEF), Rogue +13 AGI/+13 PER (hier 19 Initiative, aber kein HP-Bonus).

### 4.2 Skills und Proficiency

Die konkret eingesetzten P1-Rohformeln vor Abwehr sind: Warrior Basic `4+1,25STR+ATK`, Heavy Slash `10+1,5STR+ATK` (7 STA); Mage Basic `4+1,25INT+MATK` (0 MP), Bolt `10+1,875INT+MATK` (10 MP); Rogue Basic/Bow Shot `4+1,25AGI+ATK` (5 STA), Razor `6+1,5AGI+ATK` (5 STA), Piercing `11+1,75AGI+ATK` (9 STA). Bogen benötigt echte Pfeile, Reichweite MEDIUM; Nahkampf ENGAGED. Guard kostet 5 STA und gibt kurzzeitig `3+floor(0,5VIT)` DEF; Ward kostet 10 MP und gibt `6+1,5WIL` Barriere bis zum nächsten eigenen Zug.

P1/P2/P3/P4/P5: Power 1/1/1,05/1,15/1,20; Kostenfaktoren 1/0,95/0,95/0,925/0,90, Effekte 1/1/1,05/1,10/1,15. Die bestehenden Kostenrundungen/Mindestersparnis bleiben aktiv. Bei maximaler Beherrschung: Heavy Slash hier 6 STA, Bolt 9 MP, Razor 4 STA. Proficiency wird nicht allein durch ein höheres Charakterlevel verliehen; der Runner friert sie für den Vergleich ein.

Der Waffenanteil bleibt additiv: Warrior ausgewogen L5 hat mit Starter 10 Heavy-Slash-Raw 41, mit exceptional 22 Raw 53 (+29,3 %); auf L14 Raw 68→80 (+17,6 %). Beim Mage L14 Bolt 80→92 (+15 %). Höhere Waffenwerte sind sichtbar, werden aber bei wachsenden Kernstats relativ weniger dominant. Ein zusätzlicher DEF-Punkt zieht hingegen von jedem nicht am Boden liegenden gegnerischen Treffer ungefähr einen Punkt ab.

### 4.3 Kreaturen und Rollen

`scaleCreature` verwendet die realen Körperpläne. Mit g=L−1: HP-Anker×(1+0,20g), ATK×(1+0,22g), DEF/MDEF jeweils `(Anker+1)×(1+0,20g)−1`, Initiative×(1+0,05g), jeweils echte Engine-Rundung. Elite multipliziert HP×1,75/ATK×1,15/Abwehr×1,1 und gibt Init +2; Boss×2,5/×1,3/×1,2 und Init +3. Guardian ist im Kampf ein Eliteprofil, keine zusätzliche verborgene Rollenverstärkung.

F-Dungeon-Standardfenster bleiben Minion 1–5, Guardian 4–8, Boss 5–9; diese Fenster hängen nicht am PC-Level. „Gleichstufige Gegner“ in dieser Untersuchung sind kontrollierte Vergleichsbegegnungen, **keine Empfehlung für dynamische Weltskalierung**.

| Körper | L/Typ | HP | ATK | DEF/MDEF | Init | Reichweite/Schaden |
| --- | --- | --- | --- | --- | --- | --- |
| wolf | 1/normal | 23 | 9 | 0/0 | 12 | ENGAGED/physical |
| wolf | 5/normal | 41 | 17 | 1/1 | 14 | ENGAGED/physical |
| wolf | 15/normal | 87 | 37 | 3/3 | 20 | ENGAGED/physical |
| bear | 1/normal | 63 | 14 | 2/1 | 5 | ENGAGED/physical |
| bear | 5/normal | 113 | 26 | 4/3 | 6 | ENGAGED/physical |
| bear | 15/normal | 239 | 57 | 10/7 | 9 | ENGAGED/physical |
| armored_beast | 1/normal | 70 | 12 | 5/1 | 5 | ENGAGED/physical |
| armored_beast | 5/normal | 126 | 23 | 10/3 | 6 | ENGAGED/physical |
| armored_beast | 15/normal | 266 | 49 | 22/7 | 9 | ENGAGED/physical |
| goblin | 1/normal | 45 | 11 | 1/1 | 8 | ENGAGED/physical |
| goblin | 5/normal | 81 | 21 | 3/3 | 10 | ENGAGED/physical |
| goblin | 15/normal | 171 | 45 | 7/7 | 14 | ENGAGED/physical |
| spirit | 1/normal | 40 | 14 | 0/5 | 10 | MEDIUM/magical |
| spirit | 5/normal | 72 | 26 | 1/10 | 12 | MEDIUM/magical |
| spirit | 15/normal | 152 | 57 | 3/22 | 17 | MEDIUM/magical |

## 5. Kampfergebnisse und Spielerlebnis

Alle folgenden Siege/Niederlagen beziehen sich auf 100 Seeds pro Zeile. Abbrüche und Fehler sind in sämtlichen Zeilen 0. Die vollständige kompakte Ergebnisliste steht in Anhang A; die JSONL-Rohdaten liegen außerhalb des Repositorys.

### 5.1 Gear gegen einen echten Guardian-Körper

PC 5 gegen Armored Beast 6/elite, SHORT, P1. Dieser Guardian ist ein bewusst harter Nachbarlevelvergleich. Starter/fine/etc. verändern Waffe und Rüstung; kein Schild.

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| gear-warrior-5-starter | 0/100 | 7,9 / 8 | — | 229,6 / 145,0 | 0,0 / 55,6 | 28,9 / 28,9 |
| gear-warrior-5-fine | 100/0 | 8,0 / 8 | 8,9 | 245,0 / 132,1 | 0,0 / 55,9 | 32,9 / 32,9 |
| gear-warrior-5-superior | 100/0 | 7,0 / 7 | 25,8 | 245,0 / 107,5 | 0,0 / 49,0 | 36,9 / 36,9 |
| gear-warrior-5-exceptional | 100/0 | 6,4 / 6 | 36,7 | 245,0 / 91,8 | 0,0 / 45,0 | 40,9 / 40,9 |
| gear-warrior-5-mixed | 100/0 | 7,0 / 7 | 21,7 | 245,0 / 113,5 | 0,0 / 49,0 | 36,9 / 36,9 |
| gear-mage-5-starter | 12/88 | 6,0 / 6 | 1,5 | 219,1 / 139,7 | 51,2 / 0,0 | 43,1 / 43,1 |
| gear-mage-5-fine | 67/33 | 5,9 / 6 | 4,3 | 241,8 / 136,0 | 56,1 / 0,0 | 47,1 / 47,1 |
| gear-mage-5-superior | 100/0 | 5,0 / 5 | 21,1 | 245,0 / 110,5 | 50,3 / 0,0 | 51,0 / 51,0 |
| gear-mage-5-exceptional | 100/0 | 5,0 / 5 | 25,1 | 245,0 / 104,9 | 50,0 / 0,0 | 55,0 / 55,0 |
| gear-mage-5-mixed | 100/0 | 5,0 / 5 | 17,5 | 245,0 / 115,5 | 50,3 / 0,0 | 51,0 / 51,0 |
| gear-rogue-5-starter | 0/100 | 6,1 / 6 | — | 153,0 / 140,0 | 0,0 / 30,5 | 25,1 / 25,1 |
| gear-rogue-5-fine | 0/100 | 6,8 / 7 | — | 195,2 / 140,0 | 0,0 / 33,8 | 28,9 / 28,9 |
| gear-rogue-5-superior | 1/99 | 7,0 / 7 | 5,7 | 230,4 / 139,9 | 0,0 / 35,0 | 32,9 / 32,9 |
| gear-rogue-5-exceptional | 100/0 | 7,0 / 7 | 10,3 | 245,0 / 125,5 | 0,0 / 35,0 | 36,9 / 36,9 |
| gear-rogue-5-mixed | 1/99 | 6,8 / 7 | 1,4 | 222,3 / 140,0 | 0,0 / 33,8 | 32,9 / 32,9 |

Ein hochwertiger Fund verändert hier den Ausgang deutlich. Die geringe Rest-HP mancher Siege zeigt zugleich: Eine 100-%-Quote dieser engen Seeds ist kein ungefährlicher Kampf. Rogue wird durch die native Razor-Priorität benachteiligt: **mixed mit `max` gewinnt 95 statt 1 von 100**; Warrior/Mage bleiben 100. Das ist ein Taktikbefund, kein Beleg für einen notwendigen pauschalen Rogue-Buff.

### 5.2 Normale Gegner, Gruppen und absoluter Fortschritt

Mit mixed-Gear gewinnt PC 5 alle getesteten Normalfälle: Wolf 4/5/6, zwei/drei Wolf 5, Bär 5, Goblin 5, Spirit 5. Drei Wölfe beanspruchen dennoch deutlich mehr HP als einer. Beispiel bei SHORT: Warrior Rest-HP 95,2→71,1 %, Mage 92,2→53,0 %, Rogue 99,1→70,1 %. Das ist keine allgemeine Gruppenbalance mit AoE; die Taktik tötet nacheinander.

Starter gegen gleichstufigen Bären (Ausgewogen, P1):

| Klasse | L | Siege | Runden Ø | Rest-HP % |
| --- | --- | --- | --- | --- |
| warrior | 1 | 100 | 3,0 | 83,6 |
| warrior | 5 | 100 | 3,7 | 68,6 |
| warrior | 10 | 100 | 4,0 | 59,3 |
| warrior | 14 | 100 | 4,2 | 53,9 |
| warrior | 15 | 100 | 4,2 | 52,8 |
| mage | 1 | 100 | 2,8 | 75,3 |
| mage | 5 | 100 | 3,0 | 70,2 |
| mage | 10 | 100 | 3,4 | 54,0 |
| mage | 14 | 100 | 3,8 | 38,5 |
| mage | 15 | 100 | 3,9 | 37,0 |
| rogue | 1 | 100 | 3,0 | 72,7 |
| rogue | 5 | 100 | 4,0 | 55,3 |
| rogue | 10 | 100 | 4,2 | 47,5 |
| rogue | 14 | 100 | 5,0 | 35,3 |
| rogue | 15 | 100 | 4,9 | 36,4 |

Die einzelne Begegnung bleibt mit dem Gegnerlevel anspruchsvoller, obwohl der PC absolut stärker wird. Gegen **denselben Bär 5** wird das sichtbar: Warrior von L1-Sieg mit 10,8 % Rest-HP zu L14 mit 95,7 %; Mage von 52 % Siegen zu 100 %/93,8 % Rest-HP; Rogue von 0 % zu 100 %/93,6 %. Frühere Gegner dürfen so an Bedeutung verlieren. Kein zusätzlicher pauschaler Waffenbuff nötig, um überhaupt Fortschritt zu spüren.

### 5.3 Rüstung, Schilde und echte Minderung

Warrior 5 gegen Bär 6/elite bzw. Spirit 6/elite, jeweils aus SHORT. Nur der bezeichnete Slot wird gegenüber Starter geändert; `tank` = exceptional schwere Rüstung **plus** exceptional Schild, `robe` = exceptional Robe. Waffe bleibt Starter, außer in der Zeile `weapon`.

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| slot-weapon-bear | 100/0 | 5,0 / 5 | 33,8 | 221,0 / 96,0 | 0,0 / 35,1 | 46,9 / 46,9 |
| slot-armor-bear | 100/0 | 7,0 / 7 | 13,7 | 221,0 / 125,1 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-shield-bear | 100/0 | 7,0 / 7 | 26,1 | 221,0 / 107,2 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-tank-bear | 100/0 | 7,0 / 7 | 38,2 | 221,0 / 89,7 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-robe-bear | 8/92 | 6,1 / 6 | 4,2 | 210,5 / 144,5 | 0,0 / 42,4 | 35,0 / 35,0 |
| slot-weapon-spirit | 100/0 | 3,0 / 3 | 38,1 | 140,0 / 89,7 | 0,0 / 21,0 | 51,7 / 51,7 |
| slot-armor-spirit | 100/0 | 4,0 / 4 | 23,1 | 140,0 / 111,6 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-shield-spirit | 100/0 | 4,0 / 4 | 30,9 | 140,0 / 100,2 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-tank-spirit | 100/0 | 4,0 / 4 | 36,6 | 140,0 / 91,9 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-robe-spirit | 100/0 | 4,0 / 4 | 28,5 | 140,0 / 103,7 | 0,0 / 28,0 | 39,9 / 39,9 |

Gegen den Elitebären reduziert armor allein den durchschnittlichen eingehenden Treffer auf 20,9, shield auf 17,9 und tank auf 15,0. Die tatsächliche Minderung vor Varianz beträgt 36,4/45,5/54,5 %. Gegen den magischen Elite-Spirit ist exceptional Robe besser als alleinige schwere exceptional-Rüstung (25,9 statt 27,9 Schaden je Treffer); schwere Rüstung **mit** Schild ist mit 23,0 wieder stärker. Das Schild ist ein zusätzlicher Slot, keine faire Eins-zu-eins-Alternative zur Robe.

Gegen drei Wolf 1 auf Warrior 1: Starter erleidet insgesamt 12 HP, exceptional schwer +Schild 6 HP; beide Kämpfe dauern 3 tatsächliche Runden. Hier greift der 90-%-Minderungsdeckel, ohne den Kampf zu verlängern. Gegen die gefährlichen Elite-/Bossprofile wird der Boden nicht annähernd generell erreicht. **Kein gemessener Rüstungspatt.**

Das aktuelle Equip-/Derived-System gibt weder einen Klassenmalus für schwere Rüstung noch einen simulierten AGI-/Zaubermalus und führt Schild separat vom Waffenslot. Mage und Rogue können daher ebenfalls schwer +Schild nutzen. Im getesteten Bär 6-Elitefall gewinnen beide mit fine-Waffe/heavy-exceptional/Schild-exceptional 100 %, mit 46,3 bzw.36,0 % Rest-HP. Das begründet zunächst bessere Information über existierende Schutzoptionen; zusätzliche Gewichts-, Hand- oder Klassenrestriktionen wären eine neue Mechanik und sind hier nicht empfohlen.

### 5.4 Bosse, fünf statt sieben Punkte und Klassenvergleich

PC 10 mixed/P1 gegen Boss 9, gleiche Rahmenbedingungen:

| Körper | Warrior Siege / Rest-HP % | Mage Siege / Rest-HP % | Rogue Siege / Rest-HP % |
| --- | --- | --- | --- |
| arthropod | 100 / 85,6 | 100 / 70,9 | 100 / 76,3 |
| goblin | 100 / 47,6 | 100 / 28,1 | 100 / 28,4 |
| spirit | 100 / 14,4 | 25 / 1,6 | 100 / 14,6 |
| bear | 0 / — | 0 / — | 0 / — |

Bei PC 5 gegen Arthropod 6 steigt die verbrauchte HP durch normal→elite→boss klar: Warrior 6,1→12,8→29,9, Mage 10,9→27,9→47,8, Rogue 11,0→27,3→44,0. Die Multiplikatoren wirken also. Ein Arthropodboss ist dennoch viel schwächer als ein Bärenboss; ein magischer Spirit stellt andere Schutzanforderungen. Dungeon-Bossrollen allein garantieren kein gleiches Bedrohungsniveau.

Der harte Bossbär 9 hat 410 HP/ATK 51/DEF 8/MDEF 5. Gegen ihn gewinnt Warrior 10 erst mit komplett exceptional-Gear 66 %, Mage/Rogue in der P1-Standardtaktik auch dann 0 %. **Das ist keine Aussage über alle Bosse.** Gegen die kleineren Bosskörper funktionieren alle drei Klassen.

Sensitivitäten gegen denselben Bossbären, PC 10 mixed:

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| gear-warrior-10-mixed | 0/100 | 6,1 / 6 | — | 339,3 / 220,0 | 0,0 / 42,5 | 55,9 / 55,9 |
| old7-warrior | 100/0 | 6,3 / 6 | 28,7 | 410,0 / 189,0 | 0,0 / 43,9 | 69,4 / 69,4 |
| prof-warrior-3 | 5/95 | 6,1 / 6 | 1,8 | 358,5 / 219,8 | 0,0 / 36,4 | 59,1 / 59,1 |
| prof-warrior-5 | 65/35 | 6,0 / 6 | 13,1 | 406,9 / 201,3 | 0,0 / 36,2 | 68,7 / 68,7 |
| tactic-warrior-max | 0/100 | 6,1 / 6 | — | 339,3 / 220,0 | 0,0 / 42,5 | 55,9 / 55,9 |
| tactic-warrior-defensive | 0/100 | 8,0 / 8 | — | 224,1 / 220,0 | 0,0 / 48,0 | 56,0 / 28,0 |
| bossrange-warrior | 5/95 | 7,1 / 7 | 1,8 | 358,5 / 219,8 | 0,0 / 36,4 | 59,1 / 50,8 |
| gear-mage-10-mixed | 0/100 | 5,5 / 6 | — | 306,1 / 215,0 | 45,1 / 0,0 | 67,9 / 67,9 |
| old7-mage | 45/55 | 5,1 / 5 | 2,4 | 375,3 / 212,6 | 45,1 / 0,0 | 84,7 / 84,7 |
| prof-mage-3 | 0/100 | 5,5 / 6 | — | 322,5 / 215,0 | 40,6 / 0,0 | 71,5 / 71,5 |
| prof-mage-5 | 27/73 | 5,2 / 5 | 2,4 | 369,2 / 213,6 | 40,6 / 0,0 | 82,4 / 82,4 |
| tactic-mage-max | 0/100 | 5,5 / 6 | — | 306,1 / 215,0 | 45,1 / 0,0 | 67,9 / 67,9 |
| tactic-mage-defensive | 0/100 | 7,6 / 8 | — | 205,0 / 215,0 | 65,9 / 0,0 | 67,9 / 31,1 |
| bossrange-mage | 97/3 | 6,0 / 6 | 20,0 | 409,8 / 173,2 | 54,1 / 0,0 | 71,4 / 71,4 |
| gear-rogue-10-mixed | 0/100 | 5,5 / 6 | — | 285,4 / 215,0 | 0,0 / 27,5 | 51,9 / 51,9 |
| old7-rogue | 0/100 | 5,5 / 6 | — | 359,6 / 215,0 | 0,0 / 27,5 | 65,4 / 65,4 |
| prof-rogue-3 | 0/100 | 5,5 / 6 | — | 302,0 / 215,0 | 0,0 / 22,0 | 54,9 / 54,9 |
| prof-rogue-5 | 0/100 | 5,5 / 6 | — | 351,2 / 215,0 | 0,0 / 22,0 | 63,9 / 63,9 |
| tactic-rogue-max | 0/100 | 5,5 / 6 | — | 345,7 / 215,0 | 0,0 / 49,5 | 62,9 / 62,9 |
| tactic-rogue-defensive | 0/100 | 5,5 / 6 | — | 285,4 / 215,0 | 0,0 / 27,5 | 51,9 / 51,9 |
| bossrange-rogue | 7/93 | 6,5 / 7 | 2,1 | 365,6 / 214,7 | 0,0 / 44,0 | 66,5 / 56,3 |

`old7` gibt nur die alten automatischen Favored-Punkte zurück. Gegen diesen Schwellengegner gewinnt Warrior alt 100 statt 0 %, Mage 45 statt 0 %, Rogue bleibt 0 %. Das illustriert die erhebliche Wirkung des bereits beschlossenen .195-Patches, ohne ihn rückgängig zu empfehlen. P5 stattP 1 ergibt Warrior 65 %, Mage 27 %, Rogue in der Razor-Taktik weiterhin 0 %.

`bossrange` kombiniert LONG, P3 und `max` und ist **kein isolierter Einzelfaktorvergleich**. Mage gewinnt dort 97 % statt 0 % im SHORT/P1-Fall; frühe Fernangriffe sind bedeutsam. Die zusätzlichen Guardian-`max`-Fälle isolieren dagegen nur die Taktik. Das pauschale „Mage/Rogue sind zu schwach“ wäre ohne diese Gegenproben falsch. Defensive Hauptaktionen verlängern das Überleben, lösen in diesen Solofällen aber den nötigen Schaden nicht; ihre Rolle für Party-/Rettungssituationen wurde nicht untersucht.

### 5.5 Bogen und tatsächliche Reichweite

Rogue 5 fine gegen drei Wolf 5; reine Bow-Shot-Taktik gegenüber Dolch/Razor, jeweilsP 1. Alle Fälle 100/100 Siege:

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| bow-ENGAGED-bow | 100/0 | 6,0 / 6 | 29,6 | 123,0 / 98,5 | 0,0 / 30,0 | 34,5 / 34,5 |
| bow-ENGAGED-skill | 100/0 | 4,9 / 5 | 47,7 | 123,0 / 73,2 | 0,0 / 24,4 | 39,9 / 39,9 |
| bow-MEDIUM-bow | 100/0 | 6,0 / 6 | 52,9 | 123,0 / 65,9 | 0,0 / 30,0 | 34,3 / 34,3 |
| bow-MEDIUM-skill | 100/0 | 5,8 / 6 | 39,1 | 123,0 / 85,3 | 0,0 / 24,2 | 39,9 / 33,1 |
| bow-LONG-bow | 100/0 | 6,0 / 6 | 68,6 | 123,0 / 43,9 | 0,0 / 30,0 | 34,4 / 34,4 |
| bow-LONG-skill | 100/0 | 5,7 / 6 | 65,6 | 123,0 / 48,2 | 0,0 / 23,5 | 40,0 / 33,0 |

Bow Shot verbraucht hier im Mittel 6 Pfeile/30 STA. Auf ENGAGED ist der Dolch effizienter (höhere Skillpower); auf MEDIUM bleiben mit Bogen 52,9 statt 39,1 % HP; auf LONG 68,6 statt 65,6 %. Der vorhandene Fernkampf hat damit einen realen Vorteil, ohne dass ein eigener größerer ATK-Wert für Bögen nötig wäre. Keine Flucht-/Kiting-/Deckungsoptimierung und kein angenommener unendlicher Munitionsvorrat.

### 5.6 F→E sauber isoliert

PC 15, gleiche Stats, P1, Bär 15/elite. Bei komplett gewechselten Sets kann der Rüstungsgewinn den schlechteren Waffenwert verdecken. Deshalb zunächst nur die exceptional-Waffe wechseln; Rüstung bleibt F-exceptional:

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| rankweapon-warrior-F | 97/3 | 6,1 / 6 | 16,1 | 417,9 / 248,9 | 0,0 / 42,5 | 71,9 / 71,9 |
| rankweapon-warrior-E | 87/13 | 6,3 / 6 | 12,4 | 416,9 / 263,1 | 0,0 / 43,9 | 69,9 / 69,9 |
| rankweapon-mage-F | 97/3 | 5,0 / 5 | 8,8 | 417,8 / 265,2 | 50,0 / 0,0 | 87,5 / 87,5 |
| rankweapon-mage-E | 85/15 | 5,2 / 5 | 8,8 | 416,9 / 268,3 | 50,0 / 0,0 | 85,4 / 85,4 |
| rankweapon-rogue-F | 12/88 | 6,0 / 6 | 8,8 | 406,4 / 286,9 | 0,0 / 30,0 | 67,8 / 67,8 |
| rankweapon-rogue-E | 2/98 | 6,0 / 6 | 7,4 | 395,0 / 289,6 | 0,0 / 30,0 | 65,8 / 65,8 |

Siegquote Warrior 97→87, Mage 97→85, Rogue 12→2 %. Das ist der praktisch nachgewiesene Schaden des 22→20-Rückschritts. E-fine/superior-Waffen wären gegenüber gleichwertigen F-Waffen sogar vollständig gleich wirksam, aber später nutzbar. Ein neues Rank-Label allein vermittelt so keinen Waffenfortschritt.

## 6. Menschliche NPCs: Budget, Derived-Werte und Siege

`rulesetTwoSheet` und der ältere `humanSheet`-Pfad enthalten weiterhin `stats[f] += level`. Beim PC wurde ausschließlich die Level-up-Buchung umgestellt. Der NPC erhält deshalb zu Beginn dieselben zwei Punkte, danach aber **zusätzlich 2 je Level**. Die Summe beträgt 32+7×(L−1), unabhängig davon, ob die Klasse erzählt oder nur eine interne Statbasis benutzt wird. Es gibt keinen im Code an .195 angepassten ausdrücklichen Ausgleich.

Für den nativen Adventurer-Prioritätsplan verteilt Warrior STR/VIT/AGI im 2/2/1-Muster, Mage INT/WIL/PER, Rogue AGI/PER/VIT. Die folgenden NPC-Werte sind **ohne Ausrüstung**, damit die Generierung isoliert bleibt; normale Vorlagen besitzen oft nur ATK/MATK 5/6. Etablierte Bewaffnung und Starterkit-Overrides können davon abweichen.

| NPC-Klasse | L | Stats STR/VIT/AGI/INT/PER/WIL | HP | MP | Grund-DEF/MDEF | Init |
| --- | --- | --- | --- | --- | --- | --- |
| warrior | 1 | 6/6/5/5/5/5 | 85 | 60 | 1/1 | 7 |
| warrior | 5 | 18/18/9/5/5/5 | 165 | 60 | 4/1 | 13 |
| warrior | 10 | 33/33/14/5/5/5 | 265 | 60 | 8/1 | 21 |
| warrior | 14 | 45/45/18/5/5/5 | 345 | 60 | 11/1 | 27 |
| warrior | 15 | 48/48/19/5/5/5 | 365 | 60 | 12/1 | 28 |
| mage | 1 | 5/5/5/6/5/6 | 80 | 72 | 1/1 | 7 |
| mage | 5 | 5/5/5/18/9/18 | 100 | 216 | 1/4 | 7 |
| mage | 10 | 5/5/5/33/14/33 | 125 | 396 | 1/8 | 7 |
| mage | 14 | 5/5/5/45/18/45 | 145 | 540 | 1/11 | 7 |
| mage | 15 | 5/5/5/48/19/48 | 150 | 576 | 1/12 | 7 |
| rogue | 1 | 5/5/6/5/6/5 | 80 | 60 | 1/1 | 9 |
| rogue | 5 | 5/9/18/5/18/5 | 120 | 60 | 2/1 | 27 |
| rogue | 10 | 5/14/33/5/33/5 | 170 | 60 | 3/1 | 49 |
| rogue | 14 | 5/18/45/5/45/5 | 210 | 60 | 4/1 | 67 |
| rogue | 15 | 5/19/48/5/48/5 | 220 | 60 | 4/1 | 72 |

Bei gleicher freier Verteilung hätte ein L14-Warrior-NPC gegenüber dem .195-PC +13 STR/+13 VIT, 65 HP und hier 3 DEF mehr; Heavy-Slash-Raw wächst allein dadurch um 19,5. Mage erhält +24,375 Bolt-Raw und 156 MP, Rogue +19,5 Razor-Raw und ungefähr 19–20 Initiative; ATK/MATK als **Gearwerte** ändern sich dadurch nicht. In der echten Vorlage sind zusätzliche Verteilungsunterschiede relevant: Mage investiert kaum in VIT, hat auf L14 nur 145 statt 275 HP unseres ausgewogenen PCs, dafür 540 statt 332 MP. „Mehr Budget“ bedeutet daher nicht „in jedem Feld stärker“.

**Simulation:** echte guard/hedge_mage/bandit-Vorlagen auf L5 gegen PC 5 mixed, native zufällig-seedbestimmte Starterauswahl, tatsächliche Feindschaft: PC gewinnt 99/97/100 %. Die schwächere NPC-Ausrüstung und der Skillmix können den zusätzlichen Statvorrat überwiegen.

Kontrollreihe: Adventurer mit derselben Klasse, PC-Gear und PC-Skills, P1/ENGAGED; seine eigenen 2/2/1-Prioritäten bleiben. Vergleichsfassung zieht ausschließlich `(L−1)` von jedem NPC-Favored-Attribut ab. Alle sonstigen Bedingungen/Seeds identisch, PC verwendet `max`, NPC native Policy:

| Klasse/L | PC-Siege gegen NPC 7 → NPC 5 | Rest-HP bei Sieg %: 7 → 5 | Ø HP-Schaden erlitten: 7 → 5 |
| --- | --- | --- | --- |
| warrior/5 | 78 → 100 | 18,4 → 34,2 | 124,2 → 95,4 |
| warrior/10 | 53 → 100 | 11,9 → 36,8 | 206,2 → 139,1 |
| warrior/14 | 1 → 100 | 11,8 → 25,9 | 279,7 → 207,4 |
| mage/5 | 100 → 100 | 41,8 → 49,7 | 81,4 → 70,4 |
| mage/10 | 90 → 100 | 42,1 → 55,2 | 133,5 → 96,3 |
| mage/14 | 89 → 100 | 40,3 → 57,6 | 176,3 → 116,7 |
| rogue/5 | 0 → 66 | — → 26,2 | 140,0 → 115,8 |
| rogue/10 | 0 → 100 | — → 27,6 | 215,0 → 155,6 |
| rogue/14 | 0 → 100 | — → 32,5 | 275,0 → 185,5 |

Die isolierte Budgetänderung ist für Warrior und Rogue dramatisch; beim fragilen NPC-Mage bleibt der PC häufig Sieger, verliert aber deutlich mehr HP. Selbst Warrior mit exakt gleichen Stats/Gear gewinnt gegen den angeglichenen NPC in dieser Matrix 100 %: Die native NPC-Policy verwendet situativ Guard, während der PC weiter angreift. **Diese Quote beweist keine numerische Bevorzugung des PCs und ist kein Zielwert für PvP.**

Plausible historische Gründe der Asymmetrie sind der unverändert ältere Generierungspfad und die absichtlich schwächeren 5/6er-NPC-Waffen gegenüber PC-Starter 10. Trainierte Veteranen dürfen außerdem bessere Ausrüstung/Skills/Level haben. Das sind jedoch keine belastbaren Gründe, *jedem* Menschen zusätzlich zwei permanente Punkte je Stufe zu geben; die aktuelle Regel sagt das auch nicht ausdrücklich. Empfehlung für einen späteren freizugebenden Patch: einmalig +1 auf die zwei Favored-Attribute und 5 freie generierte Punkte je weiterem Level, bestehende Prioritätsverteilung behalten. Keine hier implementierte Änderung; Folgen für Gegner, Begleiter und Lehrer getrennt berücksichtigen. NPC-Signatur-/Karriereentwicklung wurde nicht automatisch hinzuerfunden.

## 7. Drei unbeschlossene Lösungsvarianten

Die Varianten verändern nur Profile/Sheets im Speicher des temporären Runners. Der Produktcode, Content, historische Tests und Dropkonfiguration bleiben unverändert. Werte sind aus den bestehenden F-Ankern, Rundungen und gemessenen Schwellen abgeleitete Vergleichsvorschläge, **kein beschlossener neuer Kanon**.

### 7.1 Definitionen und unmittelbare Werte

**Minimal:** F-Waffen unverändert. Für E + Waffen/Foki `max(bisheriger Rangwert, F-Wert derselben Qualität + R)`. Das ändert in den aktuellen Daten nur E-fine/superior/exceptional auf 15/19/23; alle höheren Ränge bleiben gleich. Zusätzlich F-fine-Schild 4/3→**5/3**: kleinster ganzzahliger DEF-Schritt aus dem vollständigen Plateau, superior bleibt 5/4. Richtpreis folgt der bestehenden Funktion 56→64 cp. Keine NPC-/Monster-/Skilländerung.

**Moderat:** F bleibt wie Minimal; E-Waffen/Foki `round(F-Wert×1,25)` =8/13/18/23/28. D–S behalten zunächst ihre heutigen Werte (alle bleiben gegenüber dem neuen E gleichqualitativ stärker). E-Rüstung/Schilde bleiben unverändert. NPC-Favored-Wachstum wie in §6 auf einmalig +1 setzen. Keine Boss- oder HP-Multiplikatoränderung. Ein klarer, vorsichtiger E-Waffenschritt; keine umfassende Kalibrierung späterer Ränge.

**Umfassender Vergleich:** Waffen in jedem Rang `round(F-Wert×(1+0,5R))`; Rüstung/Schilde aus ihren **unrundeten** F-Qualitätsreferenzen ebenfalls mit 1+0,5R, mit demselben kleinen F-fine-Schildfix. Dadurch einheitlichere rangbezogene Steigung statt zweier Waffenmodelle. NPC-Budget wie Moderat. Waffenrichtwert `round(8×Wert×(1+0,5R)×Q)` mit den vorhandenen Qualitätsfaktoren Q auch oberhalb F; Armor ohne Q. F-Retail bleibt 140/260/480. Das ist eine deutlich größere langfristige Vergleichshypothese, **keine Empfehlung zur sofortigen Umstellung von D–S**.

E-Waffen/Foki; Reihenfolge crude/common/fine/superior/exceptional:

| Variante | F-Werte | E-Werte | E-Richtwerte cp | F-fine-Schild / cp |
| --- | --- | --- | --- | --- |
| current | 6/10/14/18/22 | 7/11/14/18/20 | 98/154/196/252/280 | 4/3 · 56 |
| minimal | 6/10/14/18/22 | 7/11/15/19/23 | 98/154/210/266/322 | 5/3 · 64 |
| moderate | 6/10/14/18/22 | 8/13/18/23/28 | 112/182/252/322/392 | 5/3 · 64 |
| broad | 6/10/14/18/22 | 9/15/21/27/33 | 108/180/315/567/990 | 5/3 · 64 |

E-Abwehr bleibt bei Minimal/Moderat exakt wie §3. Der umfassende Vergleich ergäbe:

| Qualität | Schwer aktuell → Entwurf | Leicht aktuell → Entwurf | Schild aktuell → Entwurf |
| --- | --- | --- | --- |
| crude | 9/2 → 8/2 | 4/4 → 3/3 | 5/4 → 5/3 |
| common | 11/3 → 9/3 | 5/5 → 4/5 | 6/5 → 6/4 |
| fine | 12/4 → 11/4 | 6/7 → 5/6 | 8/6 → 7/5 |
| superior | 14/5 → 12/5 | 7/9 → 6/8 | 9/7 → 8/6 |
| exceptional | 15/6 → 13/5 | 8/10 → 7/9 | 10/8 → 8/7 |

Langfristiger exceptional-Waffenvergleich F/E/D/C/B/A/S: heute 22/20/29/37/46/55/63; Minimal 22/23/29/37/46/55/63; Moderat 22/28/29/37/46/55/63; umfassend 22/33/44/55/66/77/88. Moderat hat folglich einen kleinen E→D-Schritt für exceptional; umfassend ist später deutlich stärker. Für D–S wurden **nur Itemwerte**, keine belastbaren vollständigen Charakter-/Skillkämpfe validiert.

### 7.2 Tatsächliche Simulationsfolgen

PC 15, E-fine bzw. E-exceptional **Waffe und klassenübliche Rüstung**, P1/SHORT gegen denselben Bär 15/elite; kein Schild. Diese Reihen messen die Gearänderungen. NPC-Budgetfolgen der Varianten Moderat/Umfassend sind bereits separat durch die 7→5-Paare in §6 gemessen.

| Klasse/Qualität | Aktuell Siege / HP % | Minimal | Moderat | Umfassend |
| --- | --- | --- | --- | --- |
| warrior/fine | 100 / 6,8 | 100 / 6,8 | 100 / 8,6 | 98 / 16,9 |
| warrior/exceptional | 100 / 21,5 | 100 / 26,6 | 100 / 27,4 | 100 / 29,6 |
| mage/fine | 2 / 7,4 | 6 / 10,4 | 53 / 10,2 | 89 / 8,8 |
| mage/exceptional | 86 / 13,4 | 99 / 13,6 | 100 / 13,6 | 100 / 12,5 |
| rogue/fine | 1 / 0,3 | 1 / 0,3 | 1 / 0,3 | 3 / 7,1 |
| rogue/exceptional | 9 / 3,9 | 43 / 12,3 | 99 / 13,7 | 100 / 12,8 |

Der minimale exceptional-Fix hebt Mage 86→99 % und Rogue 9→43 % in diesem engen Schwellenkampf. Moderat hebt Rogue auf 99 %, während E-fine weiterhin nur 1 % gewinnt: Nicht jeder kleine Zahlenzuwachs rettet einen unpassenden Build. Umfassend steigert E-fine-Mage auf 89 %, aber Warrior fällt dort von 100 auf 98 %, weil die gleichzeitig reduzierte Rüstung wirkt. Höhere Zahlen sind also kein automatisch besserer Gesamtausgang.

Isolierter F-fine-Schildfix gegen Bär 6/elite, Warrior 5/Starter: Siege bleiben 100/100, Runden unverändert; durchschnittlicher HP-Verlust 119,1→113,2, Rest-HP 17,8→22,0 %. Er liefert eine kleine reale Qualitätssteigerung ohne neue Fähigkeit.

### 7.3 Bossloot, Wirtschaft, Aufwand und Spielspaß

| Variante | Nutzen | Preis-/Lootfolge | Nachteile und technische Risiken |
| --- | --- | --- | --- |
| Minimal | Beseitigt genau die enttäuschenden gleichqualitativen Rang-/Schildfälle; kleinster Eingriff | F-Waffen/Dropchancen unverändert; E-exceptional Gearguide 280→322, Schildfine 56→64. Bossloot profitiert vom gleichen Generator | E-exceptional-Guide bleibt unter F440; behebt die Preislogik nicht vollständig. Neue Profile versus bestehende Instanzen vor einem späteren Patch bewusst abgrenzen |
| Moderat | Spürbarerer E-Waffenschritt plus nachvollziehbares 5er-NPC-Budget | E-exceptional-Guide 392; F-Retail unverändert. Stärkeres E-Boss-Gear ohne höhere Dropchance. NPC-Begegnungen werden bei gleichem Gear leichter | E→D-exceptional 28→29 klein; Richtpreisrang bleibt uneinheitlich. NPC-Änderung betrifft auch Verbündete/Lehrer; getrennt reviewen, kein bloßer Gearpatch |
| Umfassend | Ein gemeinsames Rangprinzip, deutlicher höherwertiger Waffenfortschritt | E-exceptional-Guide 990 statt 280, später S-exceptional 7040; gegenüber F-Retail 480 ein erheblicher Wirtschaftsschritt. E-Abwehr teils kleiner | Größter Umfang; spätere Waffen stärker und Abwehr geringer, D–S-Skills/Kämpfe nicht validiert. Kein Beleg, dass diese Breite mehr Spaß als die kleinen Korrekturen bringt |

### 7.4 Priorisierte nächste Entscheidungen

1. **F→E-Waffen/Foki zuerst konsistent machen.** Niedriges technisches Risiko, hoher Vertrauensgewinn für Rangaufstieg und Bossbeute. Empfehlung zunächst Minimal 15/19/23 für E-fine/superior/exceptional; die 25-%-Variante 18/23/28 nur wählen, wenn ein deutlich stärkerer Rangschritt gewünscht wird. Kein pauschaler Buff von F oder Bossmultiplikatoren.
2. **Menschliches NPC-Statbudget bewusst auf dieselben fünf Punkte angleichen.** Größter messbarer Fairnessgewinn gegen hochwertige menschliche Gegner, mittleres Balancerisiko wegen veränderter Gegner/Begleiter. Stärke danach weiterhin über tatsächliches Level, Ausrüstung, Training und Skills ausdrücken. Keine neue versteckte Kompensationsmechanik.
3. **F-fine-Schild 4/3→5/3, Richtwert 56→64 cp.** Sehr kleines technisches Risiko; verhindert einen nutzlosen Qualitäts-/Bossfund und erhält die starke, bereits funktionierende Schutzoption. Kein genereller Schild- oder Rüstungsnerf.

Dagegen haben die Daten **keinen** klaren Nutzen für pauschal höhere Bosswerte, größere F-Waffen, eine neue Rüstungsgewichtssystematik oder eine vollständige D–S-Neukalibrierung gezeigt. Interessante Schwierigkeitsunterschiede existieren bereits. Vor späteren Bossanpassungen konkrete Körperpläne/Level/Taktiken und den neuen 5er-Stand verwenden, nicht alte persönliche 7er-Erfahrungen pauschal hochskalieren.

## 8. Reproduzierbarkeit und Grenzen

- Produktcommit: `7044d29ba461a777dc758fcab9f8ca9394dd5a46`; Build `4.3.0-c.6.6.195`; Node `v24.22.1`.
- Simulator-Sourcefingerprint (sortierte `src`-/`content`-Bäume, originale `fingerprint()`-Funktion): `5c61c49c1a983dbf38ddba83616d63ad561d772372f84bbfcf4b18010519f4bb`.
- Temporäre Werkzeuge: `/workspace/avereth-analysis195/analyze.mjs`, `/workspace/avereth-analysis195/followup.mjs`; keine Produktdatei ergänzt/geändert.
- SHA-256 `analyze.mjs`: `6313fd81960d071dd2d6548f7901d75d55cd0d0c0d2898704da3d015d34b1d6e`.
- SHA-256 `followup.mjs`: `f27ca8366efd2335f5fa791906e8f9277a30e680eef3ac0feb777ccc740c09e7`.
- `scenarios.json`/`followup-scenarios.json` enthalten die exakten 210 Konfigurationen; `summary.json`/`followup-summary.json` sämtliche Aggregationen, `results.jsonl`/`followup-results.jsonl` die endgültigen Einzelmessungen. `static.json` enthält alle berechneten Profile/Charakterwerte. Methodikbelege in `validation.json`, `profile-validation.json` und `native-validation/`.
- Die beiden kleinen Skripte, Konfigurationen, Metadaten und Zusammenfassungen werden als separates Reproduktionsarchiv im Chat geliefert; Rohdaten und größere temporäre Dateien werden **nicht** in das Repository aufgenommen. Für einen anderen Checkout nur die absoluten Engine-/OUT-Pfade der beiden Skripte anpassen; anschließend die Sourcefingerprint-Gleichheit kontrollieren.

Ausgeführte Befehle:

```bash
cd /workspace/avereth-product/avereth-engine
node tools/sim/combat.mjs --smoke --runs 3 --seed 7001 --out /workspace/avereth-analysis195/native-validation
node /workspace/avereth-analysis195/analyze.mjs validate
node /workspace/avereth-analysis195/analyze.mjs run 100
node /workspace/avereth-analysis195/followup.mjs
```

Der temporäre Runner importiert die unveränderte Engine, ersetzt vor `initEncounter` ausschließlich die freigegebenen experimentellen Inputs (Gear, Proficiency, in der NPC-Variante zwei Stats), nutzt `runCombat`/`terminal` und rechnet **keinen einzigen Treffer selbst**. Variante Alt 7 klont nur die Contentkonfiguration im Speicher und lässt die vorhandene XP-Buchung die alten Favored-Punkte buchen.

| Szenariofamilie | Exakte Definition / Anzahl |
| --- | --- |
| gear | 3 Klassen × PC 5/Armored 6-elite und PC 10/Bear 9-boss ×5 Kits =30 |
| body | 3 Klassen × Wolf 4/5/6, Wolf 5×2/×3, Bear 5 ENGAGED, Goblin 5 SHORT, Spirit 5 MEDIUM; PC 5 mixed =24 |
| level/fixed | 3×5 PC-Level gegen gleichstufigen Bären +3×2 PC 1/14 gegen Bear 5, Starter =21 |
| style | 3 Klassen ×3 Verteilungen, PC 10 mixed vsBear 9-boss =9 |
| slot/tank | 5 isolierte Slotprofile ×Bear 6-/Spirit 6-elite Warrior 5; zusätzlich Mage/Rogue heavy+Schild =12 |
| old7/prof/tactic | Je Klasse Alt 7, P3, P5, max, defensive vsBear 9-boss PC 10 mixed =15 |
| bow | Rogue 5 fine, Wolf 5×3,3 Startbänder ×2 Taktiken =6 |
| npc | 3 echte L5-Vorlagen +3 Klassen ×3 Level ×2 Budgetvarianten mit matched Gear/Skills =21 |
| rank | 3 Klassen ×F-exceptional +5 E-Qualitäten, PC 15 vsBear 15-elite =18 |
| variant/shield | 3 Varianten ×(3 Klassen ×2 E-Qualitäten +1 F-Schildprobe) +1 Schildreferenz =22 |
| Gezielter Nachlauf | 3 Klassen ×(3 weitere Bosskörper +2 isolierte Waffenränge +3 Arthropodtypen +1 Guardian-max +1 Boss-LONG/P3/max) +2 Wolf 1-Gruppen/Schutzprofile =32 |

**Grenzen:** Synthetische Einzelkämpfe mit vollen Ressourcen, keine Kampagne mit Reise-/Rast-/Ökonomie-/Lootketten; keine natürlichen Modelle. Keine Aussage zur tatsächlichen Häufigkeit der Körperpläne oder erreichbaren Kaufkraft. Keine neuen angeborenen Bossfähigkeiten, AoE-/Partyoptimierung, Gegenstände im Kampf, Heilung, Evolution oder voll generierte NPC-Signaturen. D–S nur mathematische Gear-/Preistabellen, keine behauptete Endgame-Abnahme. PC- und native NPC-Taktik bleiben asymmetrisch. Alte Replayoriginale unverändert.

Für diesen Merge-/Analyseauftrag wurden **keine** ST-Smokes, natürlichen LLM-Batches, Provider-API-Läufe oder neuen vollständigen Node-/Replay-Suiten ausgeführt. Die .195-Patchabnahme 3290/3290 und Replay 2235/0 offen stammt aus der bereits selbst ausgeführten vorherigen Implementierungsrunde und deren [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/STAT_GROWTH_195.md). Der Merge enthält exakt diesen freigegebenen Enginebaum. Gesammelte ST-Smokes und unabhängige Reviews zukünftiger Balancepatches bleiben eigene Schritte.

## Anhang A – vollständige kompakte Ergebnismatrix

Alle Zeilen n=100,0 Abbrüche/Fehler. „HP %“ nur Siege; Schaden aus/ein tatsächliche verlorene HP, Angriff/Turn gerollter Schaden wie §2. Die IDs sind die Schlüssel der externen Szenario-/Rohdateien. Diese Tabelle sind Zusammenfassungen, keine Original-Spiel-/Replaydaten.

| Fall | Sieg/Niederlage | Runden Ø / Median | HP % bei Sieg | HP-Schaden aus / ein | MP / STA | Schaden/Angriff / PC-Turn |
| --- | --- | --- | --- | --- | --- | --- |
| gear-warrior-5-starter | 0/100 | 7,9 / 8 | — | 229,6 / 145,0 | 0,0 / 55,6 | 28,9 / 28,9 |
| gear-warrior-5-fine | 100/0 | 8,0 / 8 | 8,9 | 245,0 / 132,1 | 0,0 / 55,9 | 32,9 / 32,9 |
| gear-warrior-5-superior | 100/0 | 7,0 / 7 | 25,8 | 245,0 / 107,5 | 0,0 / 49,0 | 36,9 / 36,9 |
| gear-warrior-5-exceptional | 100/0 | 6,4 / 6 | 36,7 | 245,0 / 91,8 | 0,0 / 45,0 | 40,9 / 40,9 |
| gear-warrior-5-mixed | 100/0 | 7,0 / 7 | 21,7 | 245,0 / 113,5 | 0,0 / 49,0 | 36,9 / 36,9 |
| gear-warrior-10-starter | 0/100 | 6,0 / 6 | — | 287,9 / 220,0 | 0,0 / 42,1 | 47,9 / 47,9 |
| gear-warrior-10-fine | 0/100 | 6,1 / 6 | — | 315,1 / 220,0 | 0,0 / 42,5 | 51,9 / 51,9 |
| gear-warrior-10-superior | 0/100 | 6,4 / 6 | — | 356,1 / 220,0 | 0,0 / 44,6 | 55,9 / 55,9 |
| gear-warrior-10-exceptional | 66/34 | 6,8 / 7 | 3,2 | 399,2 / 215,4 | 0,0 / 47,6 | 59,9 / 59,9 |
| gear-warrior-10-mixed | 0/100 | 6,1 / 6 | — | 339,3 / 220,0 | 0,0 / 42,5 | 55,9 / 55,9 |
| gear-mage-5-starter | 12/88 | 6,0 / 6 | 1,5 | 219,1 / 139,7 | 51,2 / 0,0 | 43,1 / 43,1 |
| gear-mage-5-fine | 67/33 | 5,9 / 6 | 4,3 | 241,8 / 136,0 | 56,1 / 0,0 | 47,1 / 47,1 |
| gear-mage-5-superior | 100/0 | 5,0 / 5 | 21,1 | 245,0 / 110,5 | 50,3 / 0,0 | 51,0 / 51,0 |
| gear-mage-5-exceptional | 100/0 | 5,0 / 5 | 25,1 | 245,0 / 104,9 | 50,0 / 0,0 | 55,0 / 55,0 |
| gear-mage-5-mixed | 100/0 | 5,0 / 5 | 17,5 | 245,0 / 115,5 | 50,3 / 0,0 | 51,0 / 51,0 |
| gear-mage-10-starter | 0/100 | 5,2 / 5 | — | 254,7 / 215,0 | 42,5 / 0,0 | 59,9 / 59,9 |
| gear-mage-10-fine | 0/100 | 5,5 / 6 | — | 288,0 / 215,0 | 45,1 / 0,0 | 63,9 / 63,9 |
| gear-mage-10-superior | 0/100 | 5,8 / 6 | — | 326,9 / 215,0 | 48,2 / 0,0 | 67,8 / 67,8 |
| gear-mage-10-exceptional | 0/100 | 5,9 / 6 | — | 354,4 / 215,0 | 49,4 / 0,0 | 71,7 / 71,7 |
| gear-mage-10-mixed | 0/100 | 5,5 / 6 | — | 306,1 / 215,0 | 45,1 / 0,0 | 67,9 / 67,9 |
| gear-rogue-5-starter | 0/100 | 6,1 / 6 | — | 153,0 / 140,0 | 0,0 / 30,5 | 25,1 / 25,1 |
| gear-rogue-5-fine | 0/100 | 6,8 / 7 | — | 195,2 / 140,0 | 0,0 / 33,8 | 28,9 / 28,9 |
| gear-rogue-5-superior | 1/99 | 7,0 / 7 | 5,7 | 230,4 / 139,9 | 0,0 / 35,0 | 32,9 / 32,9 |
| gear-rogue-5-exceptional | 100/0 | 7,0 / 7 | 10,3 | 245,0 / 125,5 | 0,0 / 35,0 | 36,9 / 36,9 |
| gear-rogue-5-mixed | 1/99 | 6,8 / 7 | 1,4 | 222,3 / 140,0 | 0,0 / 33,8 | 32,9 / 32,9 |
| gear-rogue-10-starter | 0/100 | 5,2 / 5 | — | 227,1 / 215,0 | 0,0 / 25,9 | 43,9 / 43,9 |
| gear-rogue-10-fine | 0/100 | 5,5 / 6 | — | 263,4 / 215,0 | 0,0 / 27,5 | 47,9 / 47,9 |
| gear-rogue-10-superior | 0/100 | 5,8 / 6 | — | 303,1 / 215,0 | 0,0 / 29,2 | 51,9 / 51,9 |
| gear-rogue-10-exceptional | 0/100 | 6,0 / 6 | — | 334,2 / 215,0 | 0,0 / 29,9 | 55,9 / 55,9 |
| gear-rogue-10-mixed | 0/100 | 5,5 / 6 | — | 285,4 / 215,0 | 0,0 / 27,5 | 51,9 / 51,9 |
| body-warrior-wolf4 | 100/0 | 1,0 / 1 | 96,5 | 37,0 / 5,0 | 0,0 / 7,0 | 48,0 / 48,0 |
| body-warrior-wolf5 | 100/0 | 1,0 / 1 | 95,2 | 41,0 / 7,0 | 0,0 / 7,0 | 48,0 / 48,0 |
| body-warrior-wolf6 | 100/0 | 1,2 / 1 | 92,4 | 46,0 / 11,0 | 0,0 / 8,5 | 48,0 / 48,0 |
| body-warrior-wolves2 | 100/0 | 2,0 / 2 | 85,5 | 82,0 / 21,0 | 0,0 / 14,0 | 47,6 / 47,6 |
| body-warrior-wolves3 | 100/0 | 3,0 / 3 | 71,1 | 123,0 / 41,9 | 0,0 / 21,0 | 47,9 / 47,9 |
| body-warrior-bear | 100/0 | 3,0 / 3 | 78,1 | 113,0 / 31,8 | 0,0 / 21,0 | 44,9 / 44,9 |
| body-warrior-goblin | 100/0 | 2,0 / 2 | 92,4 | 81,0 / 11,0 | 0,0 / 14,0 | 45,9 / 45,9 |
| body-warrior-spirit | 100/0 | 3,0 / 3 | 68,3 | 72,0 / 46,0 | 0,0 / 14,0 | 47,7 / 31,8 |
| body-mage-wolf4 | 100/0 | 1,0 / 1 | 93,6 | 37,0 / 8,9 | 10,0 / 0,0 | 53,2 / 53,2 |
| body-mage-wolf5 | 100/0 | 1,0 / 1 | 92,2 | 41,0 / 10,9 | 10,0 / 0,0 | 53,2 / 53,2 |
| body-mage-wolf6 | 100/0 | 1,0 / 1 | 90,8 | 46,0 / 12,9 | 10,0 / 0,0 | 53,2 / 53,2 |
| body-mage-wolves2 | 100/0 | 2,0 / 2 | 76,5 | 82,0 / 32,9 | 20,0 / 0,0 | 52,8 / 52,8 |
| body-mage-wolves3 | 100/0 | 3,0 / 3 | 53,0 | 123,0 / 65,8 | 30,0 / 0,0 | 53,1 / 53,1 |
| body-mage-bear | 100/0 | 3,0 / 3 | 71,6 | 113,0 / 39,8 | 30,0 / 0,0 | 51,1 / 51,1 |
| body-mage-goblin | 100/0 | 2,0 / 2 | 78,6 | 81,0 / 30,0 | 20,0 / 0,0 | 51,0 / 51,0 |
| body-mage-spirit | 100/0 | 2,0 / 2 | 71,4 | 72,0 / 40,0 | 20,0 / 0,0 | 44,0 / 44,0 |
| body-rogue-wolf4 | 100/0 | 1,0 / 1 | 100,0 | 37,0 / 0,0 | 0,0 / 5,0 | 43,8 / 43,8 |
| body-rogue-wolf5 | 100/0 | 1,1 / 1 | 99,1 | 41,0 / 1,3 | 0,0 / 5,6 | 43,9 / 43,9 |
| body-rogue-wolf6 | 100/0 | 1,7 / 2 | 93,5 | 46,0 / 9,1 | 0,0 / 8,5 | 43,9 / 43,9 |
| body-rogue-wolves2 | 100/0 | 2,3 / 2 | 88,9 | 82,0 / 15,5 | 0,0 / 11,4 | 43,7 / 43,7 |
| body-rogue-wolves3 | 100/0 | 3,4 / 3 | 70,1 | 123,0 / 41,9 | 0,0 / 17,1 | 43,9 / 43,9 |
| body-rogue-bear | 100/0 | 3,0 / 3 | 71,6 | 113,0 / 39,8 | 0,0 / 15,0 | 40,8 / 40,8 |
| body-rogue-goblin | 100/0 | 2,2 / 2 | 87,4 | 81,0 / 17,6 | 0,0 / 10,9 | 41,9 / 41,9 |
| body-rogue-spirit | 100/0 | 3,0 / 3 | 70,0 | 72,0 / 42,0 | 0,0 / 10,0 | 43,8 / 29,2 |
| level-warrior-1 | 100/0 | 3,0 / 3 | 83,6 | 63,0 / 13,9 | 0,0 / 21,0 | 26,9 / 26,9 |
| level-warrior-5 | 100/0 | 3,7 / 4 | 68,6 | 113,0 / 45,5 | 0,0 / 25,9 | 36,9 / 36,9 |
| level-warrior-10 | 100/0 | 4,0 / 4 | 59,3 | 176,0 / 89,6 | 0,0 / 28,0 | 48,9 / 48,9 |
| level-warrior-14 | 100/0 | 4,2 / 4 | 53,9 | 227,0 / 129,1 | 0,0 / 29,7 | 57,8 / 57,8 |
| level-warrior-15 | 100/0 | 4,2 / 4 | 52,8 | 239,0 / 139,3 | 0,0 / 29,8 | 60,8 / 60,8 |
| level-mage-1 | 100/0 | 2,8 / 3 | 75,3 | 63,0 / 19,8 | 28,1 / 0,0 | 30,1 / 30,1 |
| level-mage-5 | 100/0 | 3,0 / 3 | 70,2 | 113,0 / 41,8 | 30,0 / 0,0 | 43,1 / 43,1 |
| level-mage-10 | 100/0 | 3,4 / 3 | 54,0 | 176,0 / 98,8 | 33,5 / 0,0 | 59,6 / 59,6 |
| level-mage-14 | 100/0 | 3,8 / 4 | 38,5 | 227,0 / 169,1 | 37,7 / 0,0 | 73,9 / 73,9 |
| level-mage-15 | 100/0 | 3,9 / 4 | 37,0 | 239,0 / 182,7 | 39,0 / 0,0 | 76,6 / 76,6 |
| level-rogue-1 | 100/0 | 3,0 / 3 | 72,7 | 63,0 / 21,8 | 0,0 / 15,0 | 23,0 / 23,0 |
| level-rogue-5 | 100/0 | 4,0 / 4 | 55,3 | 113,0 / 62,6 | 0,0 / 20,0 | 32,9 / 32,9 |
| level-rogue-10 | 100/0 | 4,2 / 4 | 47,5 | 176,0 / 112,8 | 0,0 / 21,1 | 44,9 / 44,9 |
| level-rogue-14 | 100/0 | 5,0 / 5 | 35,3 | 227,0 / 178,0 | 0,0 / 24,8 | 53,8 / 53,8 |
| level-rogue-15 | 100/0 | 4,9 / 5 | 36,4 | 239,0 / 184,4 | 0,0 / 24,6 | 56,9 / 56,9 |
| fixed-warrior-1 | 100/0 | 5,0 / 5 | 10,8 | 113,0 / 75,8 | 0,0 / 35,0 | 25,1 / 25,1 |
| fixed-warrior-14 | 100/0 | 2,0 / 2 | 95,7 | 113,0 / 12,0 | 0,0 / 14,0 | 63,9 / 63,9 |
| fixed-mage-1 | 52/48 | 4,0 / 4 | 13,6 | 111,5 / 74,3 | 40,0 / 0,0 | 28,2 / 28,2 |
| fixed-mage-14 | 100/0 | 2,0 / 2 | 93,8 | 113,0 / 17,0 | 20,0 / 0,0 | 76,9 / 76,9 |
| fixed-rogue-1 | 0/100 | 4,0 / 4 | — | 83,9 / 80,0 | 0,0 / 20,0 | 21,0 / 21,0 |
| fixed-rogue-14 | 100/0 | 2,0 / 2 | 93,6 | 113,0 / 17,6 | 0,0 / 10,2 | 60,0 / 60,0 |
| style-warrior-offensive | 0/100 | 5,0 / 5 | — | 346,7 / 175,0 | 0,0 / 35,0 | 69,3 / 69,3 |
| style-warrior-balanced | 0/100 | 6,1 / 6 | — | 339,3 / 220,0 | 0,0 / 42,5 | 55,9 / 55,9 |
| style-warrior-defensive | 0/100 | 8,0 / 8 | — | 295,8 / 265,0 | 0,0 / 48,9 | 42,3 / 42,3 |
| style-mage-offensive | 0/100 | 4,0 / 4 | — | 254,1 / 170,0 | 30,1 / 0,0 | 84,4 / 84,4 |
| style-mage-balanced | 0/100 | 5,5 / 6 | — | 306,1 / 215,0 | 45,1 / 0,0 | 67,9 / 67,9 |
| style-mage-defensive | 0/100 | 5,5 / 6 | — | 230,6 / 215,0 | 45,1 / 0,0 | 51,1 / 51,1 |
| style-rogue-offensive | 0/100 | 4,0 / 4 | — | 262,8 / 170,0 | 0,0 / 20,1 | 65,4 / 65,4 |
| style-rogue-balanced | 0/100 | 5,5 / 6 | — | 285,4 / 215,0 | 0,0 / 27,5 | 51,9 / 51,9 |
| style-rogue-defensive | 0/100 | 7,0 / 7 | — | 269,0 / 260,0 | 0,0 / 35,0 | 38,4 / 38,4 |
| slot-weapon-bear | 100/0 | 5,0 / 5 | 33,8 | 221,0 / 96,0 | 0,0 / 35,1 | 46,9 / 46,9 |
| slot-weapon-spirit | 100/0 | 3,0 / 3 | 38,1 | 140,0 / 89,7 | 0,0 / 21,0 | 51,7 / 51,7 |
| slot-armor-bear | 100/0 | 7,0 / 7 | 13,7 | 221,0 / 125,1 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-armor-spirit | 100/0 | 4,0 / 4 | 23,1 | 140,0 / 111,6 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-shield-bear | 100/0 | 7,0 / 7 | 26,1 | 221,0 / 107,2 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-shield-spirit | 100/0 | 4,0 / 4 | 30,9 | 140,0 / 100,2 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-tank-bear | 100/0 | 7,0 / 7 | 38,2 | 221,0 / 89,7 | 0,0 / 48,9 | 34,9 / 34,9 |
| slot-tank-spirit | 100/0 | 4,0 / 4 | 36,6 | 140,0 / 91,9 | 0,0 / 28,0 | 39,9 / 39,9 |
| slot-robe-bear | 8/92 | 6,1 / 6 | 4,2 | 210,5 / 144,5 | 0,0 / 42,4 | 35,0 / 35,0 |
| slot-robe-spirit | 100/0 | 4,0 / 4 | 28,5 | 140,0 / 103,7 | 0,0 / 28,0 | 39,9 / 39,9 |
| tank-mage | 100/0 | 5,0 / 5 | 46,3 | 221,0 / 75,1 | 50,1 / 0,0 | 47,1 / 47,1 |
| tank-rogue | 100/0 | 7,0 / 7 | 36,0 | 221,0 / 89,7 | 0,0 / 34,9 | 34,9 / 34,9 |
| old7-warrior | 100/0 | 6,3 / 6 | 28,7 | 410,0 / 189,0 | 0,0 / 43,9 | 69,4 / 69,4 |
| prof-warrior-3 | 5/95 | 6,1 / 6 | 1,8 | 358,5 / 219,8 | 0,0 / 36,4 | 59,1 / 59,1 |
| prof-warrior-5 | 65/35 | 6,0 / 6 | 13,1 | 406,9 / 201,3 | 0,0 / 36,2 | 68,7 / 68,7 |
| tactic-warrior-max | 0/100 | 6,1 / 6 | — | 339,3 / 220,0 | 0,0 / 42,5 | 55,9 / 55,9 |
| tactic-warrior-defensive | 0/100 | 8,0 / 8 | — | 224,1 / 220,0 | 0,0 / 48,0 | 56,0 / 28,0 |
| old7-mage | 45/55 | 5,1 / 5 | 2,4 | 375,3 / 212,6 | 45,1 / 0,0 | 84,7 / 84,7 |
| prof-mage-3 | 0/100 | 5,5 / 6 | — | 322,5 / 215,0 | 40,6 / 0,0 | 71,5 / 71,5 |
| prof-mage-5 | 27/73 | 5,2 / 5 | 2,4 | 369,2 / 213,6 | 40,6 / 0,0 | 82,4 / 82,4 |
| tactic-mage-max | 0/100 | 5,5 / 6 | — | 306,1 / 215,0 | 45,1 / 0,0 | 67,9 / 67,9 |
| tactic-mage-defensive | 0/100 | 7,6 / 8 | — | 205,0 / 215,0 | 65,9 / 0,0 | 67,9 / 31,1 |
| old7-rogue | 0/100 | 5,5 / 6 | — | 359,6 / 215,0 | 0,0 / 27,5 | 65,4 / 65,4 |
| prof-rogue-3 | 0/100 | 5,5 / 6 | — | 302,0 / 215,0 | 0,0 / 22,0 | 54,9 / 54,9 |
| prof-rogue-5 | 0/100 | 5,5 / 6 | — | 351,2 / 215,0 | 0,0 / 22,0 | 63,9 / 63,9 |
| tactic-rogue-max | 0/100 | 5,5 / 6 | — | 345,7 / 215,0 | 0,0 / 49,5 | 62,9 / 62,9 |
| tactic-rogue-defensive | 0/100 | 5,5 / 6 | — | 285,4 / 215,0 | 0,0 / 27,5 | 51,9 / 51,9 |
| bow-ENGAGED-bow | 100/0 | 6,0 / 6 | 29,6 | 123,0 / 98,5 | 0,0 / 30,0 | 34,5 / 34,5 |
| bow-ENGAGED-skill | 100/0 | 4,9 / 5 | 47,7 | 123,0 / 73,2 | 0,0 / 24,4 | 39,9 / 39,9 |
| bow-MEDIUM-bow | 100/0 | 6,0 / 6 | 52,9 | 123,0 / 65,9 | 0,0 / 30,0 | 34,3 / 34,3 |
| bow-MEDIUM-skill | 100/0 | 5,8 / 6 | 39,1 | 123,0 / 85,3 | 0,0 / 24,2 | 39,9 / 33,1 |
| bow-LONG-bow | 100/0 | 6,0 / 6 | 68,6 | 123,0 / 43,9 | 0,0 / 30,0 | 34,4 / 34,4 |
| bow-LONG-skill | 100/0 | 5,7 / 6 | 65,6 | 123,0 / 48,2 | 0,0 / 23,5 | 40,0 / 33,0 |
| npc-template-warrior | 99/1 | 5,0 / 5 | 44,7 | 164,8 / 80,9 | 0,0 / 34,9 | 37,4 / 37,4 |
| npc-control-warrior-5-seven | 78/22 | 5,4 / 5 | 18,4 | 163,6 / 124,2 | 0,0 / 36,6 | 33,3 / 33,3 |
| npc-control-warrior-5-five | 100/0 | 4,9 / 5 | 34,2 | 145,0 / 95,4 | 0,0 / 34,4 | 35,0 / 35,0 |
| npc-control-warrior-10-seven | 53/47 | 6,5 / 7 | 11,9 | 237,7 / 206,2 | 0,0 / 42,3 | 41,0 / 41,0 |
| npc-control-warrior-10-five | 100/0 | 5,3 / 5 | 36,8 | 220,0 / 139,1 | 0,0 / 37,0 | 45,1 / 45,1 |
| npc-control-warrior-14-seven | 1/99 | 6,5 / 7 | 11,8 | 287,1 / 279,7 | 0,0 / 42,4 | 47,4 / 47,4 |
| npc-control-warrior-14-five | 100/0 | 5,9 / 6 | 25,9 | 280,0 / 207,4 | 0,0 / 41,5 | 54,4 / 54,4 |
| npc-template-mage | 97/3 | 3,7 / 3 | 61,9 | 99,8 / 55,9 | 37,1 / 0,0 | 47,1 / 47,1 |
| npc-control-mage-5-seven | 100/0 | 3,1 / 3 | 41,8 | 100,0 / 81,4 | 30,9 / 0,0 | 46,1 / 46,1 |
| npc-control-mage-5-five | 100/0 | 3,0 / 3 | 49,7 | 100,0 / 70,4 | 30,0 / 0,0 | 47,2 / 47,2 |
| npc-control-mage-10-seven | 90/10 | 3,5 / 3 | 42,1 | 124,7 / 133,5 | 34,2 / 0,0 | 60,8 / 60,8 |
| npc-control-mage-10-five | 100/0 | 3,0 / 3 | 55,2 | 125,0 / 96,3 | 30,0 / 0,0 | 62,9 / 62,9 |
| npc-control-mage-14-seven | 89/11 | 3,6 / 3 | 40,3 | 144,4 / 176,3 | 35,0 / 0,0 | 72,8 / 72,8 |
| npc-control-mage-14-five | 100/0 | 3,0 / 3 | 57,6 | 145,0 / 116,7 | 30,0 / 0,0 | 75,8 / 75,8 |
| npc-template-rogue | 100/0 | 3,0 / 3 | 39,5 | 120,0 / 84,7 | 0,0 / 27,0 | 46,7 / 46,7 |
| npc-control-rogue-5-seven | 0/100 | 3,0 / 3 | — | 96,5 / 140,0 | 0,0 / 18,0 | 48,2 / 48,2 |
| npc-control-rogue-5-five | 66/34 | 3,0 / 3 | 26,2 | 112,1 / 115,8 | 0,0 / 23,9 | 48,1 / 48,1 |
| npc-control-rogue-10-seven | 0/100 | 3,0 / 3 | — | 129,3 / 215,0 | 0,0 / 18,0 | 64,7 / 64,7 |
| npc-control-rogue-10-five | 100/0 | 3,0 / 3 | 27,6 | 170,0 / 155,6 | 0,0 / 27,0 | 64,6 / 64,6 |
| npc-control-rogue-14-seven | 0/100 | 3,0 / 3 | — | 155,1 / 275,0 | 0,0 / 18,0 | 77,6 / 77,6 |
| npc-control-rogue-14-five | 100/0 | 3,0 / 3 | 32,5 | 210,0 / 185,5 | 0,0 / 27,0 | 77,4 / 77,4 |
| rank-warrior-Fexceptional | 97/3 | 6,1 / 6 | 16,1 | 417,9 / 248,9 | 0,0 / 42,5 | 71,9 / 71,9 |
| rank-warrior-crude | 1/99 | 6,6 / 7 | 0,3 | 375,3 / 295,0 | 0,0 / 46,2 | 56,9 / 56,9 |
| rank-warrior-common | 75/25 | 7,0 / 7 | 4,9 | 414,7 / 284,2 | 0,0 / 48,7 | 60,8 / 60,8 |
| rank-warrior-fine | 100/0 | 7,0 / 7 | 6,8 | 418,0 / 275,1 | 0,0 / 49,0 | 63,8 / 63,8 |
| rank-warrior-superior | 100/0 | 6,9 / 7 | 12,6 | 418,0 / 257,8 | 0,0 / 48,2 | 67,8 / 67,8 |
| rank-warrior-exceptional | 100/0 | 6,4 / 6 | 21,5 | 418,0 / 231,4 | 0,0 / 44,8 | 69,9 / 69,9 |
| rank-mage-Fexceptional | 97/3 | 5,0 / 5 | 8,8 | 417,8 / 265,2 | 50,0 / 0,0 | 87,5 / 87,5 |
| rank-mage-crude | 0/100 | 6,0 / 6 | — | 362,3 / 290,0 | 50,0 / 0,0 | 72,5 / 72,5 |
| rank-mage-common | 0/100 | 6,0 / 6 | — | 382,5 / 290,0 | 50,0 / 0,0 | 76,5 / 76,5 |
| rank-mage-fine | 2/98 | 6,0 / 6 | 7,4 | 397,6 / 289,6 | 50,0 / 0,0 | 79,5 / 79,5 |
| rank-mage-superior | 55/45 | 5,5 / 5 | 11,5 | 413,8 / 271,6 | 50,2 / 0,0 | 83,5 / 83,5 |
| rank-mage-exceptional | 86/14 | 5,2 / 5 | 13,4 | 416,9 / 256,6 | 50,1 / 0,0 | 85,4 / 85,4 |
| rank-rogue-Fexceptional | 12/88 | 6,0 / 6 | 8,8 | 406,4 / 286,9 | 0,0 / 30,0 | 67,8 / 67,8 |
| rank-rogue-crude | 0/100 | 6,0 / 6 | — | 317,3 / 290,0 | 0,0 / 30,0 | 52,9 / 52,9 |
| rank-rogue-common | 0/100 | 6,0 / 6 | — | 341,3 / 290,0 | 0,0 / 30,0 | 56,9 / 56,9 |
| rank-rogue-fine | 1/99 | 6,0 / 6 | 0,3 | 359,9 / 290,0 | 0,0 / 30,1 | 59,9 / 59,9 |
| rank-rogue-superior | 5/95 | 6,0 / 6 | 0,9 | 385,1 / 289,9 | 0,0 / 30,2 | 63,9 / 63,9 |
| rank-rogue-exceptional | 9/91 | 6,1 / 6 | 3,9 | 396,7 / 289,0 | 0,0 / 30,4 | 65,9 / 65,9 |
| variant-minimal-warrior-fine | 100/0 | 7,0 / 7 | 6,8 | 418,0 / 275,1 | 0,0 / 49,0 | 64,9 / 64,9 |
| variant-minimal-warrior-exceptional | 100/0 | 6,0 / 6 | 26,6 | 418,0 / 216,4 | 0,0 / 42,4 | 72,9 / 72,9 |
| variant-minimal-mage-fine | 6/94 | 5,9 / 6 | 10,4 | 402,2 / 288,2 | 50,0 / 0,0 | 80,5 / 80,5 |
| variant-minimal-mage-exceptional | 99/1 | 5,0 / 5 | 13,6 | 417,9 / 251,0 | 50,0 / 0,0 | 88,5 / 88,5 |
| variant-minimal-rogue-fine | 1/99 | 6,0 / 6 | 0,3 | 365,8 / 290,0 | 0,0 / 30,1 | 60,9 / 60,9 |
| variant-minimal-rogue-exceptional | 43/57 | 6,0 / 6 | 12,3 | 411,5 / 274,7 | 0,0 / 30,2 | 68,9 / 68,9 |
| variant-minimal-shield | 100/0 | 7,0 / 7 | 22,0 | 221,0 / 113,2 | 0,0 / 48,9 | 34,9 / 34,9 |
| variant-moderate-warrior-fine | 100/0 | 6,9 / 7 | 8,6 | 418,0 / 269,5 | 0,0 / 48,2 | 67,8 / 67,8 |
| variant-moderate-warrior-exceptional | 100/0 | 6,0 / 6 | 27,4 | 418,0 / 214,3 | 0,0 / 42,0 | 77,8 / 77,8 |
| variant-moderate-mage-fine | 53/47 | 5,5 / 5 | 10,2 | 413,6 / 274,3 | 50,0 / 0,0 | 83,5 / 83,5 |
| variant-moderate-mage-exceptional | 100/0 | 5,0 / 5 | 13,6 | 418,0 / 250,6 | 50,0 / 0,0 | 93,4 / 93,4 |
| variant-moderate-rogue-fine | 1/99 | 6,0 / 6 | 0,3 | 383,5 / 290,0 | 0,0 / 30,1 | 63,9 / 63,9 |
| variant-moderate-rogue-exceptional | 99/1 | 6,0 / 6 | 13,7 | 418,0 / 250,7 | 0,0 / 30,0 | 73,8 / 73,8 |
| variant-moderate-shield | 100/0 | 7,0 / 7 | 22,0 | 221,0 / 113,2 | 0,0 / 48,9 | 34,9 / 34,9 |
| variant-broad-warrior-fine | 98/2 | 6,2 / 6 | 16,9 | 417,9 / 246,0 | 0,0 / 43,6 | 70,9 / 70,9 |
| variant-broad-warrior-exceptional | 100/0 | 5,6 / 6 | 29,6 | 418,0 / 207,6 | 0,0 / 39,3 | 82,8 / 82,8 |
| variant-broad-mage-fine | 89/11 | 5,1 / 5 | 8,8 | 417,5 / 267,3 | 50,0 / 0,0 | 86,5 / 86,5 |
| variant-broad-mage-exceptional | 100/0 | 5,0 / 5 | 12,5 | 418,0 / 253,8 | 49,9 / 0,0 | 98,6 / 98,6 |
| variant-broad-rogue-fine | 3/97 | 6,0 / 6 | 7,1 | 400,9 / 289,4 | 0,0 / 30,0 | 66,8 / 66,8 |
| variant-broad-rogue-exceptional | 100/0 | 6,0 / 6 | 12,8 | 418,0 / 253,0 | 0,0 / 29,9 | 78,8 / 78,8 |
| variant-broad-shield | 100/0 | 7,0 / 7 | 22,0 | 221,0 / 113,2 | 0,0 / 48,9 | 34,9 / 34,9 |
| shield-current | 100/0 | 7,0 / 7 | 17,8 | 221,0 / 119,1 | 0,0 / 48,9 | 34,9 / 34,9 |
| boss-warrior-arthropod | 100/0 | 3,0 / 3 | 85,6 | 155,0 / 31,8 | 0,0 / 21,0 | 55,8 / 55,8 |
| boss-warrior-goblin | 100/0 | 5,4 / 5 | 47,6 | 293,0 / 115,2 | 0,0 / 38,1 | 58,9 / 58,9 |
| boss-warrior-spirit | 100/0 | 4,9 / 5 | 14,4 | 260,0 / 188,3 | 0,0 / 34,5 | 61,8 / 61,8 |
| rankweapon-warrior-F | 97/3 | 6,1 / 6 | 16,1 | 417,9 / 248,9 | 0,0 / 42,5 | 71,9 / 71,9 |
| rankweapon-warrior-E | 87/13 | 6,3 / 6 | 12,4 | 416,9 / 263,1 | 0,0 / 43,9 | 69,9 / 69,9 |
| type-warrior-normal | 100/0 | 1,9 / 2 | 95,8 | 48,0 / 6,1 | 0,0 / 13,2 | 44,0 / 44,0 |
| type-warrior-elite | 100/0 | 2,3 / 2 | 91,2 | 84,0 / 12,8 | 0,0 / 16,0 | 42,9 / 42,9 |
| type-warrior-boss | 100/0 | 3,0 / 3 | 79,4 | 120,0 / 29,9 | 0,0 / 21,1 | 42,7 / 42,7 |
| guardmax-warrior | 100/0 | 7,0 / 7 | 21,7 | 245,0 / 113,5 | 0,0 / 49,0 | 36,9 / 36,9 |
| bossrange-warrior | 5/95 | 7,1 / 7 | 1,8 | 358,5 / 219,8 | 0,0 / 36,4 | 59,1 / 50,8 |
| boss-mage-arthropod | 100/0 | 3,0 / 3 | 70,9 | 155,0 / 62,6 | 29,9 / 0,0 | 70,6 / 70,6 |
| boss-mage-goblin | 100/0 | 5,0 / 5 | 28,1 | 293,0 / 154,5 | 50,0 / 0,0 | 67,8 / 67,8 |
| boss-mage-spirit | 25/75 | 5,0 / 5 | 1,6 | 230,1 / 214,2 | 42,5 / 0,0 | 55,0 / 55,0 |
| rankweapon-mage-F | 97/3 | 5,0 / 5 | 8,8 | 417,8 / 265,2 | 50,0 / 0,0 | 87,5 / 87,5 |
| rankweapon-mage-E | 85/15 | 5,2 / 5 | 8,8 | 416,9 / 268,3 | 50,0 / 0,0 | 85,4 / 85,4 |
| type-mage-normal | 100/0 | 1,0 / 1 | 92,2 | 48,0 / 10,9 | 10,0 / 0,0 | 53,2 / 53,2 |
| type-mage-elite | 100/0 | 2,0 / 2 | 80,1 | 84,0 / 27,9 | 20,0 / 0,0 | 53,0 / 53,0 |
| type-mage-boss | 100/0 | 3,0 / 3 | 65,8 | 120,0 / 47,8 | 30,0 / 0,0 | 53,0 / 53,0 |
| guardmax-mage | 100/0 | 5,0 / 5 | 17,5 | 245,0 / 115,5 | 50,3 / 0,0 | 51,0 / 51,0 |
| bossrange-mage | 97/3 | 6,0 / 6 | 20,0 | 409,8 / 173,2 | 54,1 / 0,0 | 71,4 / 71,4 |
| boss-rogue-arthropod | 100/0 | 3,4 / 3 | 76,3 | 155,0 / 51,0 | 0,0 / 17,2 | 51,8 / 51,8 |
| boss-rogue-goblin | 100/0 | 6,0 / 6 | 28,4 | 293,0 / 154,0 | 0,0 / 29,9 | 54,9 / 54,9 |
| boss-rogue-spirit | 100/0 | 5,0 / 5 | 14,6 | 260,0 / 183,7 | 0,0 / 25,0 | 57,9 / 57,9 |
| rankweapon-rogue-F | 12/88 | 6,0 / 6 | 8,8 | 406,4 / 286,9 | 0,0 / 30,0 | 67,8 / 67,8 |
| rankweapon-rogue-E | 2/98 | 6,0 / 6 | 7,4 | 395,0 / 289,6 | 0,0 / 30,0 | 65,8 / 65,8 |
| type-rogue-normal | 100/0 | 2,0 / 2 | 92,2 | 48,0 / 11,0 | 0,0 / 10,0 | 39,9 / 39,9 |
| type-rogue-elite | 100/0 | 3,0 / 3 | 80,5 | 84,0 / 27,3 | 0,0 / 14,8 | 38,8 / 38,8 |
| type-rogue-boss | 100/0 | 3,8 / 4 | 68,5 | 120,0 / 44,0 | 0,0 / 18,9 | 38,8 / 38,8 |
| guardmax-rogue | 95/5 | 6,2 / 6 | 14,8 | 244,8 / 120,3 | 0,0 / 55,8 | 41,4 / 41,4 |
| bossrange-rogue | 7/93 | 6,5 / 7 | 2,1 | 365,6 / 214,7 | 0,0 / 44,0 | 66,5 / 56,3 |
| weak-starter | 100/0 | 3,0 / 3 | 85,9 | 69,0 / 12,0 | 0,0 / 21,0 | 28,9 / 28,9 |
| weak-tank | 100/0 | 3,0 / 3 | 92,9 | 69,0 / 6,0 | 0,0 / 21,0 | 28,9 / 28,9 |
