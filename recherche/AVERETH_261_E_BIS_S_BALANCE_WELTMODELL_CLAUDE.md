# Avereth – E-Rang bis S: Balancekopplungen, Weltmodell und Entscheidungsvorlage

**Unabhängige Fachanalyse von Claude** · 28.11.2026 · **Ergänzt und in Teilen korrigiert durch die [Vertiefung nach GPT-Gegenreview R1–R9](AVERETH_262_CLAUDE_E_BALANCE_VERTIEFUNG_UND_ENTSCHEIDUNGSVORLAGE.md)** (Quest-XP-Teilung, Kampfsimulation mit entwickelten Builds, Waffenwerte, Rangquellen) · Anschlussauftrag aus Kapitel 13 der [GPT-Fachgrundlage](AVERETH_261_E_BIS_S_SPIELDESIGN_BALANCE_WELT_FACHGRUNDLAGE_GPT.md). Keine Produktimplementierung, keine Kanonänderung.

| Bezug | Stand |
|---|---|
| Ausgangsprodukt (gepinnt) | Build `4.3.0-c.6.6.261`, [`4b637c98`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4b637c981459e1e5ff9f4bd480bc071723fe5bce) |
| Rangfähiges Fundament | `.262`, technisch abgenommen, GPT-GO; End-HEAD [`c665c59a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c665c59a313746e165a00a5f147c1aaeff7c0452), [Abnahmebericht](AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md). Nur gelesen, für den technischen Anschluss (Abschnitte 10.8 und 15). Die Kampfmechanik ist zwischen `.261` und `.262` unverändert; die Simulationen sind deshalb übertragbar. |
| Grundlage | [GPT-Fachgrundlage](AVERETH_261_E_BIS_S_SPIELDESIGN_BALANCE_WELT_FACHGRUNDLAGE_GPT.md), Commit `63db3b5e`. Nachträglich einbezogen: [.262-Abnahme](AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md), Commit `e46bd8db`. |
| Werkzeuge und Rohdaten | [`claude_261_e_bis_s/`](claude_261_e_bis_s/) mit [`ERGEBNISSE.txt`](claude_261_e_bis_s/ERGEBNISSE.txt) |

**Lesekennzeichen**, angelehnt an GPT:

| Kennzeichen | Bedeutung |
|---|---|
| **IST** | geltender Code, Content oder Kanon von `.261` |
| **TEST** | natürlicher Lauf, laut GPT-Konsolidierung oder Primärbericht |
| **SIM** | eigene Offline-Simulation mit Produktfunktionen |
| **RECH** | Rechnung aus Produktformeln |
| **HYP** | eigener Vorschlag, kein Kanon |
| **OFFEN** | Entscheidung des Nutzers oder fehlende Evidenz |

---

## 0. Kurzfassung

**Zehn Kernbefunde:**

1. **Gleichlevel-Kämpfe werden mit steigendem Level härter, nicht leichter (SIM).**
   - Spielerschaden und Spieler-HP wachsen langsamer als der Angriff der Gegner.
   - Die subtraktive Verteidigung bleibt fast flach.
   - Folge: Die Mitigation fällt beim Warrior gegen einen gleichstufigen Bären von 50 % (L1) auf 27 % (L29); der eingesteckte Schaden pro Treffer steigt von 7 auf 73.
   - Einzelgegner bleiben beherrschbar. Gleichstufige Dreiergruppen kippen dagegen ab etwa L10, gleichstufige Elites ab L20–25.
2. **Die sichere Gegnerstufe für Solospiel ist ein Anteil des eigenen Levels, kein fester Abstand (SIM):**
   - Gruppen von drei: etwa 75 %;
   - Elites: etwa 90 %;
   - Bosse mit schwerem Körperplan: etwa 45–50 %;
   - Einzelgegner: auch über dem eigenen Level.
   
   Das ist die wichtigste Zahl für jedes Gebietsfenster.
3. **Körperplan und Gruppengröße wiegen so schwer wie das Level (SIM).** Ein E15 besiegt drei Wölfe L19 sicher, zwei Bären L15 nie. Ergebnisse kippen scharf: ein Gegner mehr macht aus 100 % oft 0 %.
4. **Eine Zweierparty ist der stärkste Einzelhebel (SIM).** Gleichstufige Gruppen und Elites gehen von 0 % auf 100 %. Oger-Bosse bleiben auch zu zweit unschaffbar.
5. **Die vorhandenen E-Etagen sind Party- oder Spät-E-Inhalt (SIM).**
   - Mossback E2 ist solo im ganzen E-Band praktisch unschaffbar; zu zweit gelingt es je nach Konstellation ab L18–24.
   - Old Crown E2 gelingt solo frühestens ab L24–29, zu zweit ab L15–20.
   - Das ist mit dem Lore vereinbar, muss aber kommuniziert werden.
6. **Der Rangschritt F→E ist heute ungleich verteilt (IST/SIM):**
   - E-Waffen: +1 je Qualität;
   - E-Skills bei gleicher Complexity: +9–12 %;
   - E-Rüstung und E-Schild: +75–85 %;
   - seltene E-Klasse mit Verteidigungsrichtung: kippt Kämpfe von 2 % auf 100 %.
   
   Verteidigung ist wegen der subtraktiven Formel der stärkste Hebel.
7. **Die XP-Kurve ist rangunabhängig (RECH).** Jeder Rang ab E braucht etwa 10 Standardverträge auf Bandmitte oder 25 gleichstufige Kills. Das Tempo ist also kein strukturelles Problem.
8. **Der Rangabstand erzeugt beim Aufstieg eine Delle (RECH).**
   - Ab L15 bringen alle F-Gegner nur noch halbe XP.
   - Gleichzeitig sind gleichstufige E-Gruppen solo tödlich.
   - Verträge kennen keinen Rangabstand und überbrücken die Delle; eine Party ebenfalls.
9. **Die Wirtschaft driftet ab B/A (RECH).**
   - Beutematerialien wachsen ×3 pro Rang, Ausrüstungsrichtwerte nur etwa quadratisch, Vergütungen etwa ×2,6.
   - Bei S bringt ein Wolf 8.748 cp, mehr als ein komplettes Fine-Set (4.268 cp).
   - Für E ist das unkritisch, vor D muss es entschieden werden.
   - Zusätzlich ist der Preisrichtwert einer E-Exceptional-Waffe (322 cp) **niedriger** als der einer F-Exceptional-Waffe (480 cp Handelspreis).
10. **Das Lore trägt das Weltmodell bereits (IST):**
    - „Most ordinary fauna around settled regions are F-rank. Higher-Rank evolved specimens become progressively rarer and more dangerous.“
    - „Most people remain F/E“.
    - Dungeons haben Ränge je Etage.
    
    Die Simulation zeigt dazu passend: **Einzelne E-Kreaturen sind für E-Spieler solo spielbar, E-Rudel nicht.** Höhere Gefahr als seltene Einzelgänger und kleine Gruppen ist also zugleich glaubwürdig und spielbar.

**Empfehlung in einem Satz:** E wird **ohne E-Großzonen** eingeführt. Dafür braucht es:

- ein feines E-Gefahrenfenster an bestehenden, weiter entfernten Orten;
- seltene E-Einzelgänger und kleine Gruppen in bestimmten Lebensräumen;
- die vorhandenen E-Etagen als ausdrücklich kommunizierten Gruppeninhalt;
- Institutionen für Lehrer, Markt und Proven-Board an den drei Startstädten;
- einen spürbaren, aber überlappenden Ausrüstungsschritt: **Rang = eine Qualitätsstufe**.

Die Zahlen bis S bleiben bewusst offen; nur die Richtung wird festgelegt (Abschnitte 10, 13, 14).

**Ergänzung nach der `.262`-Abnahme:**

- Die drei Parameter `market_rank`, `composer.entry_rank` und `passive_design.rank` sind heute **globale Gleichheitsschalter**. Ein Wechsel auf E würde F-Lehrer und F-Quellen unlernbar machen und jeden Händler zum E-Händler.
- Für die gemischte Welt müssen Händler, Lehrer, Quellen und Passive ihren Rang aus dem konkreten Weltobjekt beziehen. Vieles ist bereits individuell; Abschnitt 10.8 zeigt was, und das ist die einzige technische Voraussetzung vor lokalem E-Handel und lokaler E-Lehre.
- Als erste E-Unternehmung schlage ich Ashbridge vor (Abschnitt 14).

---

## 1. Methode und Grenzen

**Simulation.** Grundlage ist der Balance-Adapter des Produkts (`tools/sim/balance/engine.mjs`). Er nutzt:

- echte Charaktererzeugung, XP- und Levelbuchung und Statvergabe;
- Item-Profile über `itemProfile` und Gegnerskalierung über `scaleCreature`;
- `initEncounter`/`runCombat` und die Engine-NPC-Steuerung.

Die einzige Änderung betrifft eine **Analysekopie**: Die Levelbeschränkung des Simulators (1/5/10/14/15) ist dort aufgehoben. Für Partys wird ein echter NPC über `state.party.members` eingesetzt; die Engine übernimmt ihn selbst als Verbündeten. Pro Szenario laufen 60–100 Seeds, insgesamt über 200.000 Kämpfe.

**Grenzen der Simulation:**

- Die Spielerpolitik ist einfach: erster ausführbarer Angriffsskill, keine Tränke, keine Flucht, keine Umgebung, kein Hinterhalt.
- Jeder Kampf beginnt bei SHORT, ohne Vorbereitung.
- Als Skills sind nur die zwei Startskills der Klasse bei P1 gesetzt (bzw. P3/P5 im Proficiency-Test).
- Die Ausrüstung folgt einem typischen Pfad:

| Level | Ausrüstung |
|---|---|
| L1–2 | Starter |
| L3–6 | F-fine |
| L7–11 | gemischt (superior/fine) |
| L12–14 | F-superior |
| ab L15 | E-fine |

- Natürliche Spieler kämpfen klüger: Gelände, Distanz, Rückzug, Verhandlung (Kapitulation), mehrere Skills.
- **Die Absolutwerte sind deshalb pessimistisch. Verlässlich sind die Verhältnisse und die Kippunkte.**

**Natürliche Tests.** Die nutze ich über GPTs Konsolidierung und habe nur gezielt nachgeprüft; ein erneutes Lesen aller Läufe gab es nicht. Die historischen L15-Läufe (Batch 17–28) passen zum Simulationsbild: Dort wurden überwiegend Gegner deutlich unter dem eigenen Level besiegt, etwa Batch 20 mit „29/35 Gegner mindestens 3 Level unter PC“. Das stützt Befund 2.

---

## 2. Korrekturen und Ergänzungen zur GPT-Konsolidierung

Die meisten Ausgangswerte der GPT-Fachgrundlage habe ich gegen `.261` geprüft und bestätigt:

- XP-Kumulation, Rangbänder und Quest-XP;
- Monsterformeln, Elite-Initiative (+2 additiv) und Boss-Multiplikatoren;
- E-Waffentabelle und F-Waffenpreise;
- Living-Kapazitäten, Resets, Rollenspannen und Seed-Dungeons;
- Bossloot-Chancen;
- `f_balance`-Werte (PP 50/75/100, LP-Tagesgrenzen 60/40, Primer 80 cp).

Ergänzungen und Korrekturen:

| # | GPT-Stelle | Ergänzung / Korrektur | Beleg |
|---|---|---|---|
| K1 | §5.1/5.4: E-Waffen nur +1 | Richtig, aber **E-Rüstung und E-Schild skalieren generisch ×1,75**. Beispiel heavy armor common: F DEF 6 → E 11; Robe common F 3/3 → E 5/5. Der E-Übergang ist heute **verteidigungslastig**, nicht insgesamt schwach. | IST: `items.js` L262–276; SIM: [`gear_table.mjs`](claude_261_e_bis_s/gear_table.mjs) |
| K2 | §5.1: Preise | Der Preisrichtwert von E-Waffen ist niedriger als bei F gleicher Qualität (E-exceptional 322 cp gegenüber F-exceptional 440 Richtwert / 480 Handelspreis), weil der Qualitätsfaktor nur bei F-Waffen greift. Für E und höher gibt es keinen Handelspreis (`gearRetailPrice` nur F). | IST: `items.js` L289–295 |
| K3 | §5.1: D-Werte nicht erwähnt | Nach E fällt die Waffenkurve auf die generische Skalierung zurück: D common 15, exceptional 29. Der Sprung E→D (+4 bis +6) ist also viel größer als F→E (+1). Die Kurve ist nicht monoton im Zuwachs. | IST/RECH |
| K4 | §6.1: Novice-Vergütung 10–200 | In `.261` richtig. In `.262` steht **30–600**, gleiche Obergrenze wie Proven (100–600). | IST `.262` `rules.json` |
| K5 | §1.1: Quest-XP | Ergänzung: **Quest-XP kennt keinen Rangabstand** (`questXp`), Kampf-XP schon. Das ist die eingebaute Brücke über die Rangdelle. | IST: `progression.js` L62 |
| K6 | §3.2: Anker als L1-Körperpläne | Richtig. Ergänzung: Die Anker wachsen linear mit ×(1+0,2–0,22·(L−1)), der Spieler wächst mit +5 Punkten pro Level. Das bestimmt, ab wann Gruppen kippen (Abschnitt 3). | RECH: [`growth_ratio.mjs`](claude_261_e_bis_s/growth_ratio.mjs) |
| K7 | §8.3: E-Etagenspannen | Bestätigt: Minion 15–19, Wache 18–22, Boss 20–24. Ergänzung: Die obere Bandhälfte (F 10–14, E 25–29) kommt in Living Dungeons **nie** vor. | IST: `living.js` `spansFor` |
| K8 | §10.1/10.2: HUD | Seit `.262` (`489b2cda`) zeigt der Charakterbogen Skill-Fortschritt, Kosten, Reichweite und Wirkung; das ist nicht mehr zu fordern. Eine Anzeige der bekannten Gefahrenspanne im Freien habe ich im HUD-Weltbereich nicht gefunden (`hud.js` L140–180). | IST `.262` |

---

## 3. Das Kopplungsmodell: wie Level, Gegner, Gruppen, Ausrüstung und Party zusammenwirken

### 3.1 Warum gleichstufige Kämpfe härter werden (SIM, RECH)

Formeln (IST):

- Rohschaden = Basis + Koeffizient × Stat + Waffen-ATK, anschließend × Proficiency.
- Verteidigung wirkt subtraktiv mit 10 % Mindestschaden.
- Gegner: HP und ATK × (1 + 0,20 bzw. 0,22 × (L−1)).
- Spieler: 5 freie Punkte pro Level; HP = 50 + 5·L + 5·VIT; DEF = VIT/4 + Rüstung.

Warrior, ausgewogen, typische Ausrüstung, gegen einen gleichstufigen Bären:

| Level | eigener Schaden pro Angriff | eingesteckter Schaden pro Treffer | Mitigation | Runden | HP übrig |
|---:|---:|---:|---:|---:|---:|
| 1 | 27 | 7 | 50 % | 3,0 | 84 % |
| 10 | 57 | 29 | 31 % | 3,7 | 64 % |
| 15 | 66 | 37 | 35 % | 4,0 | 62 % |
| 20 | 78 | 50 | 32 % | 4,0 | 59 % |
| 29 | 99 | 73 | 27 % | 5,0 | 43 % |

Von L1 bis L29 wächst der eigene Schaden auf das 3,7-Fache, der eingesteckte auf das 10-Fache, die eigenen HP auf das 6-Fache. Ein Einzelgegner bleibt gewinnbar. Jeder zusätzliche Angreifer kostet aber pro Runde einen wachsenden HP-Anteil.

Siegquoten gegen gleichstufige Gegner (Warrior / Mage / Rogue), Auszug aus [`ERGEBNISSE.txt`](claude_261_e_bis_s/ERGEBNISSE.txt):

| Level | 3 Goblins | 5 Wölfe | Elite-Bär | Boss (armored beast) |
|---:|---|---|---|---|
| 1 | 100 / 0 / 98 % | 100 / 0 / 0 % | 100 / 100 / 100 % | 100 / 67 / 0 % |
| 5 | 94 / 0 / 0 % | 90 / 0 / 9 % | 100 / 100 / 100 % | 0 / 0 / 0 % |
| 10 | 1 / 0 / 0 % | 16 / 0 / 0 % | 100 / 100 / 76 % | 0 |
| 15 | 0 | 0 | 97 / 17 / 0 % | 0 |
| 20 | 0 | 0 | 52 / 0 / 0 % | 0 |
| 29 | 0 | 0 | 0 | 0 |

### 3.2 Die sichere Gegnerstufe als Anteil des eigenen Levels (SIM)

Gemessen ist das höchste Gegnerlevel mit ≥ 90 % Siegen (in Klammern ≥ 50 %), typische Ausrüstung, Warrior. Werte für Mage und Rogue stehen in [`ERGEBNISSE.txt`](claude_261_e_bis_s/ERGEBNISSE.txt); sie liegen meist 1–3 Level darunter.

| PC-Level | Bär einzeln | 3 Goblins | 5 Wölfe | Elite-Bär | Oger-Boss |
|---:|---:|---:|---:|---:|---:|
| 5 | ≥ 9 | 5 | 5 | 6 | 2 |
| 10 | ≥ 14 | 9 | 8 (9) | 10 (11) | 5 |
| 15 | ≥ 19 | 12 | 12 (13) | 15 | 8 |
| 20 | ≥ 24 | 16 | 15 (16) | 19 (20) | 10 |
| 25 | ≥ 29 | 18 | 18 (19) | 23 | 12 |
| 29 | ≥ 33 | 21 | 21 (22) | 26 (27) | – |

- **Faustregel (SIM, Solo):** Gruppen von drei etwa 0,75 × eigenes Level, Elite etwa 0,9 ×, schwerer Boss etwa 0,45–0,5 ×.
- Starke Ausrüstung (Exceptional) verschiebt das nur um 1–3 Level.
- Leichte Boss-Körperpläne sind viel einfacher: Ein Skelett-Boss L22 ist für einen Warrior L20 solo zu 100 % schaffbar.

### 3.3 Körperplan und Gruppengröße (SIM)

Siegquote solo, Warrior L15 mit E-fine, bei 1/2/3/4 Gegnern ([`sim_groupsize.mjs`](claude_261_e_bis_s/sim_groupsize.mjs)):

| Gegner | L15 | L17 | L19 | L22 |
|---|---|---|---|---|
| Wolf | 100/100/100/100 | 100/100/100/0 | 100/100/100/0 | 100/100/100/0 |
| Goblin | 100/100/0/0 | 100/100/0/0 | 100/42/0/0 | 100/0/0/0 |
| Bär | 100/0/0/0 | 100/0/0/0 | 100/0/0/0 | 38/0/0/0 |

Ein E-Gebiet ist deshalb nicht durch das Levelfenster allein beschrieben. **Größe der Gruppe und Körperplan** gehören zur Gefahrenidentität einer Population. Heute trägt eine Population nur Art, Körperplan und Fenster (IST: `population.js`); die Gruppengröße entscheidet die Erzählung.

### 3.4 Party als Multiplikator (SIM)

PC L15 mit E-fine, ein gleichstufiger Begleiter ([`sim_party.mjs`](claude_261_e_bis_s/sim_party.mjs)), Siegquote solo → zu zweit:

| Gegner | Warrior + Mage | Mage + Warrior | Rogue + Warrior |
|---|---|---|---|
| 3 Goblins L17 | 0 → 100 % | 0 → 100 % | 0 → 100 % |
| 2 Bären L17 | 0 → 100 % | 0 → 100 % | 0 → 100 % |
| Elite-Bär L18 | 0 → 100 % | 0 → 100 % | 0 → 100 % |
| Oger-Boss L20 | 0 → 0 % | 0 → 0 % | 0 → 0 % |
| Skelett-Boss L22 | 0 → 100 % | 15 → 100 % | 0 → 100 % |

Der Begleiter überlebt in den gewonnenen Kämpfen fast immer. Damit ist die Party nicht nur Komfort, sondern **der eigentliche Zugang zu gleichstufigen E-Gruppen**. Das passt zum Kanon (dauerhafte Party, eigene Ressourcen, eigene Entscheidungen) und macht einen glaubwürdigen E-Begleiter zu einem wichtigen Spielinhalt (Abschnitt 11).

### 3.5 Die vorhandenen Dungeons als Prüfstein (SIM)

Durchgespielt wurden komplette Etagen als Kette, ohne Rast zwischen den Begegnungen ([`sim_floor.mjs`](claude_261_e_bis_s/sim_floor.mjs)). Pro Slot gilt die Obergrenze der Anzahl, als Level die Mitte der Rollenspanne. Die Tabelle zeigt den Anteil vollständiger Etagen:

| Etage | Kette | solo | zu zweit |
|---|---|---|---|
| Mossback F1 | 3 Goblins L3 → 3 Goblins L3 → Elite-Häuptling L6 | 0 % bis L8, 100 % ab L10 (Mage L8: 12 %) | 100 % ab L5 |
| Glimmerdeep F1 | 4 Käfer L3 → 2 Schleime L3 → Königin (Boss) L7 | 85–100 % ab L5 | 100 % |
| Old Crown F1 | 3 Skelette L3 → 2 Skelette L3 → Elite-Wärter L6 | 100 % ab L5 (Rogue L5: 20 %) | 100 % |
| **Mossback E2** | 3 Goblins L17 → Goblin-Schamane (Boss) L22 | **0 % bei L15–29** (Warrior L29: 10 %) | Mage/Rogue + Warrior: 45–97 % ab L15–18, 100 % ab L20; Warrior + Mage: 50 % bei L20, 100 % ab L24 |
| **Old Crown E2** | 2 Ghule L17 → Ghul-Lord (Boss) L22 | 0 % bis L20; Warrior 58 % bei L24; 93–100 % bei L29 | Mage/Rogue + Warrior: 100 % ab L15; Warrior + Mage: 72 % bei L18, 100 % ab L20 |

**Einordnung (HYP):**

- Die F-Etagen funktionieren als F-Inhalt.
- Die E-Etagen sind **Gruppen- oder Spät-E-Inhalt** und kein Einstieg für einen frischen E15-Einzelspieler. Das widerspricht nicht dem Lore („ein schwacher Abenteurer kann einen tödlichen Dungeon finden“).
- Der Spieler muss es aber erfahren können: über Gilde, Wärter, sichtbare Zeichen und die bestehende HUD-Rangangabe des Dungeons.
- Werte der Etagen ändere ich nicht.

---

## 4. Progression und XP

### 4.1 Rangunabhängige Kurve (RECH, [`econ_model.mjs`](claude_261_e_bis_s/econ_model.mjs))

| Rang | XP im Band | Standardverträge auf Bandmitte | gleichstufige Kills auf Bandmitte |
|---|---:|---:|---:|
| F (1–14) | 10.500 | 8,8 | 21,9 |
| E (15–29) | 33.000 | 10,0 | 25,0 |
| D … S | 55.500 … 145.500 | 10,0 | 25,0 |

Die Schwelle 100 × Level und die linear im Level wachsenden Belohnungen ergeben pro Rang denselben Aufwand an Aktivitäten. **Eine neue XP-Kurve ist nicht nötig (HYP).** Die Länge eines Rangs bestimmt sich über Inhalte, Gefahr und Reibung, nicht über die Formel. Das bestätigt GPTs „vorläufig keine pauschale XP-Änderung“.

### 4.2 Die Rangdelle und drei Varianten (RECH, [`xp_variants.py`](claude_261_e_bis_s/xp_variants.py))

XP-Ausbeute je Aktivität für einen PC auf L15 (nächstes Level: 1.500 XP):

| Aktivität | V0 heute (−1 Rang ×0,5) | V1 weich (−1 Rang ×0,75) | V2 Levelabstand (≥ PC−4 ×1; −5…−9 ×0,5) |
|---|---:|---:|---:|
| solo 3 Goblins L11 (sicher) | 990 (0,66 Level) | 1.485 (0,99) | 1.980 (1,32) |
| solo Einzelbär L15 | 900 (0,60) | 900 | 900 |
| zu zweit 3 Gegner L17 (je Person) | 1.530 (1,02) | 1.530 | 1.530 |
| zu zweit E-Boss L22 (je Person) | 1.650 (1,10) | 1.650 | 1.650 |
| Standardvertrag auf eigenem Level, solo | 2.250 (1,50) | 2.250 | 2.250 |
| Standardvertrag zu zweit, je Person (**korrigiert**: Quest-XP werden ebenfalls geteilt, `guild.js` L573–578) | 1.125 (0,75) | 1.125 | 1.125 |

**Bewertung (HYP):**

- **V0 beibehalten** ist meine Empfehlung, *wenn* E-Einstiegsinhalte existieren: einzelne E-Kreaturen auf 15–17 und Proven-Jagden. Dann setzt die Delle genau den gewünschten Anreiz, F-Gruppenjagd gegen E-Einzelgänger, Verträge oder Party zu tauschen.
- **V1** ist die Rückfallebene, falls natürliches E-Spiel zähes Grinding zeigt.
- **V2** passt formal zur Proficiency-Regel („bis PC-Level−4“), entkoppelt XP aber vom Rangband. Bei L22 würde sie F-Gruppen sogar schlechter stellen als heute. Ich empfehle sie nicht.

**OFFEN:** Die Zahl der Spielstunden pro Rang lässt sich nur natürlich messen. Historisch lagen L15-Läufe bei 106–417 Eingaben (TEST).

### 4.3 Abgleich mit der `.262`-Progressionsrechnung

Die [`.262`-Abnahme](AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md#fortschritt-bis-level-15) rechnet mit `defeatXp`, `questXp`, `splitPool` und `awardXp`. Ihre Annahmen:

- ein regulärer Gegner je Kampf;
- feste Gebietslevel 1→14 in Viererschritten;
- **jeder Kampf wird gewonnen.**

Ihr Ergebnis bis L15:

| Spielweise | solo | zu zweit |
|---|---|---|
| gemischte Route | 16 Kämpfe / 7 Aufträge | 22 / 10 |
| Gilde | 6 / 14 | 9 / 19 |

Die beiden Rechnungen ergänzen sich:

- **Für Einzelgegner** ist die Annahme „jeder Kampf gewonnen“ durch meine Simulation gedeckt, denn einzelne normale Gegner sind auch über dem eigenen Level sicher (3.2). Die `.262`-Zahlen sind für einzelgegnerlastiges Spiel also realistisch.
- **Für Gruppen** gilt sie nicht. Eine Route über Rudel, Verbände oder Elites auf Gebietslevel 11–14 wäre solo für einen PC unter etwa L15–18 tödlich (Faktor 0,75 bzw. 0,9). Gruppenlastiges Solospiel verläuft deshalb langsamer, sicherer und unterhalb des Gebietslevels. Die historischen Läufe zeigen genau das (Batch 20).
- Zu zweit kostet die geteilte Kampf-XP rechnerisch 30–40 % mehr Kämpfe. Dafür sind Gruppen und Elites gewinnbar (3.4); netto ist die Party bei E nicht langsamer (4.2).

---

## 5. Klassen und organische Entwicklung

**IST:** Die E-Klasse bei L15 bietet 2–3 Richtungen, abhängig von Stats und Kampfbelegen. Das Budget beträgt bei normaler Qualität 1–2 Effekte (Stat +4, Pool +20, Kosten −8 %, Resistenz 8 %), bei seltener Qualität 1–3 Effekte (+6, +35, −15 %, 15 %).

**SIM** (Starterausrüstung, L15, [`sim_evolution.mjs`](claude_261_e_bis_s/sim_evolution.mjs)):

| Warrior gegen | ohne | normal Offensive | rare Offensive | normal Defensive | rare Defensive |
|---|---:|---:|---:|---:|---:|
| Elite-Bär L15 | 2 % | 3 % | 3 % | 63 % | 100 % |
| 3 Goblins L12 | 2 % | 44 % | 69 % | 100 % | 100 % |

- Beim Mage hebt Arcane gegen den Elite-Bären L15 von 0 auf 28 % (rare).
- Beim Rogue hebt Precision gegen den Elite-Ghul L18 von 84 auf 99 %.
- Nicht jede Richtung wird jeder Figur angeboten (IST: `directions`).

**Bewertung (HYP):**

1. Die E-Klasse ist schon heute der spürbarste Rangschritt, aber **richtungsabhängig sehr ungleich**: Verteidigung (DEF + Resistenz) ist wegen der subtraktiven Formel ein Vielfaches wirksamer als Offensive (ATK + Kostensenkung).
2. Ich empfehle **keine Budgetänderung vor natürlichem E-Spiel**, aber eine bewusste Entscheidung des Nutzers (OFFEN): Soll Offensive gleich stark werden, etwa über einen größeren ATK-Wert, oder bleibt Verteidigung bewusst die „sichere“ Wahl?
3. Spätere Evolutionen (D/C) sollten auf derselben Struktur aufbauen (Richtung + Qualität + Budget je Rang). Neue Effektfamilien braucht es dafür erst, wenn natürliche E-Läufe zeigen, dass die Spielweisen zu ähnlich bleiben.

---

## 6. Skills, Proficiency, Lernen, Passive

Gegenüberstellung auf echten Statwerten (Warrior, ausgewogen; [`skill_compare.mjs`](claude_261_e_bis_s/skill_compare.mjs)). Angegeben ist der Rohschaden ohne Verteidigung:

| Level (STR) | F-C1 P1 | F-C1 P5 | E-C1 P1 | F-C3 P5 | E-C3 P1 | Kosten C1 F / E |
|---|---:|---:|---:|---:|---:|---|
| 15 (34) | 77 | 92 | 86 | 128 | 119 | 5–10 / 8–14 |
| 20 (44) | 96 | 115 | 106 | 159 | 146 | |
| 29 (62) | 130 | 156 | 142 | 215 | 194 | |

- **IST/RECH:** E-Skills bringen +9–12 % bei gleicher Complexity und Proficiency, kosten aber 40–60 % mehr.
- Ein gemeisterter F-Skill (P5) bleibt stärker als ein neuer E-Skill (P1). Das erfüllt GPTs Ziel „Meistertechniken bleiben wertvoll“.
- Der E-Skill hat die höhere Decke: E-C1 P5 ≈ 103.
- **SIM:** P1 → P5 erhöht den Schaden des Warriors pro Angriff um +23 %, kippt aber keine Boss-Kämpfe.

**Empfehlung (HYP):**

1. **E-Skills nicht stärker machen, sondern zugänglich.**
   - Heute sind Lernquellen nur F (`growth.js` L230; ab `.262` über `composer.entry_rank`).
   - Für E reichen E-Lehrer und E-Quellen in Institutionen (Abschnitt 10.5) mit den vorhandenen LP-Regeln 100/200/300.
   - Eine Evolution F→E derselben Technik sollte eine Quelle oder ein Evolutionsangebot verlangen und nicht automatisch geschehen (entspricht GPT §4.3).
2. **Der Rangwert eines Skills sitzt im Kostenband, nicht in einer neuen Effektfamilie.** Neue Familien (etwa Gruppenschutz, Positionskontrolle) werden erst geprüft, wenn E-Partykämpfe sie natürlich verlangen.
3. **Passive** bleiben unabhängig vom Rang (Qualitätsachse) mit 4 Slots bis unter B. Für E keine Änderung. Die Rare-Verteidigungswirkung der E-Klasse (Abschnitt 5) zeigt, dass zusätzliche DEF-Quellen sorgfältig gedeckelt bleiben müssen; die gemeinsamen Caps existieren.

---

## 7. Ausrüstung und Loot

### 7.1 Heute (IST, [`gear_table.mjs`](claude_261_e_bis_s/gear_table.mjs))

| Qualität | F-Waffe | E-Waffe | D-Waffe (generisch) | F-heavy armor DEF | E-heavy armor DEF | F-Robe DEF/MDEF | E-Robe DEF/MDEF |
|---|---:|---:|---:|---:|---:|---|---|
| crude | 6 | 7 | 10 | 5 | 9 | 2/2 | 4/4 |
| common | 10 | 11 | 15 | 6 | 11 | 3/3 | 5/5 |
| fine | 14 | 15 | 21 | 7 | 12 | 3/4 | 6/7 |
| superior | 18 | 19 | 25 | 8 | 14 | 4/5 | 7/9 |
| exceptional | 22 | 23 | 29 | 9 | 15 | 5/6 | 8/10 |

### 7.2 Varianten (SIM, [`sim_variants.mjs`](claude_261_e_bis_s/sim_variants.mjs))

Getestet wurden auf L15 gegen Bär L18, Elite-Ghul L20, 2 Goblins L17 und Elite-Bär L16:

| Variante | Inhalt | Wirkung |
|---|---|---|
| **heute** | E-Waffe = F + 1 | F-exceptional schlägt E-fine bei Mage und Rogue. Beste Kombination war F-exceptional-Waffe + E-fine-Rüstung. |
| **G1** | E-Waffe = F + 4, also eine Qualitätsstufe | E-fine = F-superior. Warrior gegen Elite-Ghul 19 → 29 % HP übrig; Mage gegen Elite-Ghul 92 → 98 % Siege. Kein Kippen, spürbar. |
| **G2** | Rangfaktor Rüstung 0,4 statt 0,75 | Warrior gegen Elite-Bär L16 41 → 9 %. Die E-Rüstung trägt heute einen wesentlichen Teil des E-Übergangs. |

### 7.3 Empfehlung (HYP)

1. **„Ein Rang = eine Qualitätsstufe“ für Waffen (G1):**

| Qualität | E-Waffe | entspricht F |
|---|---:|---|
| crude | 10 | common |
| common | 14 | fine |
| fine | 18 | superior |
| superior | 22 | exceptional |
| exceptional | 26 | über F |

   - Überlappung bleibt erhalten: F-exceptional ≈ E-superior.
   - Ein frischer E-Fund ist nicht wertlos, ein gemeistertes F-Stück auch nicht.
   - D erst später mit derselben Regel ableiten (D = E + 4 …), statt der generischen Skalierung mit ihrem Sprung.
2. **Rüstung und Schild beim generischen ×1,75 belassen.** Die Simulation zeigt, dass gerade sie die Gruppengefahr am E-Einstieg mildern.
3. **Preise konsistent machen.** Der Richtwert soll für alle Ränge dieselbe Formel mit Qualitätsfaktor nutzen. Mit G1 ergibt das als Richtwert für E-Waffen:

| Qualität | E-Preisrichtwert | zum Vergleich F |
|---|---:|---:|
| common | 196 cp | 80 cp |
| fine | 315 cp | 140 cp |
| superior | 539 cp | 260 cp |
| exceptional | 910 cp | 480 cp |

   Eine E-Handelspreistabelle (`weapon_prices.E`, Schlüssel ab `.262`) ist eine Nutzerentscheidung.
4. **Loot unverändert für E.** Bossloot V1 (Rang des Gegners, Qualitätsverteilung) trägt E bereits. Materialien ×3 sind für E unkritisch (Abschnitt 8).

---

## 8. Wirtschaft

**RECH** ([`econ_model.mjs`](claude_261_e_bis_s/econ_model.mjs)):

| Gildenrang / Rang | Vergütung (Content, `proposed`) | Waffe + Rüstung fine (Richtwert) | Verträge pro Fine-Set | Beute pro Wolf / Bär |
|---|---|---:|---:|---|
| Novice / F | 10–200 (`.262`: 30–600) | 212 | 2,0 | 12 / 24 |
| Proven / E | 100–600 | 434 | 1,2 | 36 / 72 |
| Veteran / D | 300–1.500 | 900 | 1,0 | 108 / 216 |
| Elite / C | 800–4.000 | 1.508 | 0,6 | 324 / 648 |
| B / A / S | – | 2.272 / 3.192 / 4.268 | – | 972 / 2.916 / 8.748 (Wolf) |

**Bewertung (HYP):**

1. **E:** Ein Proven-Vertrag (Mitte 350 cp) finanziert etwa ein Ausrüstungsteil. E-Beute (36–72 cp pro Tier) ergänzt spürbar, ohne zu überschwemmen. **Für E keine Änderung an Materialfaktor oder Vergütungsrichtwert nötig**, mit Ausnahme der Proven-Obergrenze (Abschnitt 9).
2. **Ab D wird das Verhältnis gekippt.** Materialien wachsen exponentiell (×3), Ausrüstung nur quadratisch, sodass Ausrüstung relativ zum Einkommen immer billiger wird; bei A/S genügen ein bis zwei gewöhnliche Tiere für ein Set. Vor der D-Einführung braucht es eine Entscheidung (OFFEN):
   - **(a)** Materialfaktor ab D auf ×2 senken;
   - **(b)** Ausrüstungsrichtwerte ab D stärker wachsen lassen;
   - **(c)** hohe Ränge über Knappheit, Zugang und Senken steuern (Lizenzen, Dungeonrechte, Reparatur, Lehre).
   
   Ich empfehle **(c) mit (a) als Absicherung**. Das passt zum Lore („Wealth strongly affects training access below the highest ranks“; mächtige Dungeons als politisches Gut) und zu GPTs „andere Märkte, Zugang, Auftraggeber, seltene Ressourcen“.
3. **Lebenshaltung und Unterkunft** haben keine Content-Preise; sie entstehen erzählerisch. Für E genügt das. Eine Budgetrechnung „netto pro Abenteuer“ ist erst mit natürlichen E-Läufen belastbar (OFFEN).
4. **Party:** Münzlohn wird geteilt. **Korrektur:** Auch Quest-XP werden unter allen berechtigten Teilnehmern geteilt (`splitPool`, `guild.js` L573–578, `.262`); meine frühere Angabe „Quest-XP erhält jeder voll“ war falsch, siehe [Korrektur zu GPT-R2](AVERETH_262_CLAUDE_E_BALANCE_VERTIEFUNG_UND_ENTSCHEIDUNGSVORLAGE.md#2-korrigierte-rechnungen-r2). Bei E gleicht die Party die geteilte Vergütung durch Zugang zu E-Inhalten aus: zu zweit gegen drei E-Gegner L17 bringt das 1.530 XP je Person, solo gegen F-Gruppen 990 (Abschnitt 4.2).

---

## 9. Gilde, Questvielfalt und Abenteuerstruktur

**IST:** Beförderung verlangt 5 Verträge des eigenen Rangs und den passenden Machtrang. Proven-Listungen müssen L15–29 haben, die Habitatfenster enden in `.261` bei 14; `.262` macht das rangfähig (`guild.outdoor_boards.<Rang>`). Board-Familien sind Jagd und Dungeon-Räumung; Lieferung und Eskorte ruhen.

**Empfehlung für das Proven-Board (HYP), abgeleitet aus der Simulation:**

| E-Fenster | Jagdprofil | Vergütungsrichtwert (Vorschlag) | Begründung |
|---|---|---|---|
| 15–17 | Einzelgänger oder kleines Paar leichter Körperpläne; mindestens ein solches Einstiegsangebot | 100–200 cp | solo sicher für E15 (3.2/3.3) |
| 18–21 | Einzeltier schwerer Körperplan oder kleine Gruppe; Warnung bei Gruppen | 200–350 cp | E18–20 solo, Gruppen zu zweit |
| 22–25 | Elite-Individuum, Rudel oder territorialer Verband; „Gruppe empfohlen“ | 350–550 cp | Partyinhalt (3.4) |
| 26–29 | seltene Gefahr, Expedition | 550–800 cp | Spät-E, Gruppe |
| Räumung | E-Etagen (Mossback E2, Old Crown E2) | wie heute | ausdrücklich als Gruppeninhalt kennzeichnen |

- Die Vergütungen orientieren sich an F×2,5 je Fenster und an den E-Preisrichtwerten (Abschnitt 7.3).
- Sie liegen teils **über der heutigen Proven-Obergrenze 600**. Ob diese angehoben wird, ist eine Nutzerentscheidung (OFFEN).

**Auftragsvielfalt ab E (HYP), alles innerhalb der bestehenden formalen Familien:**

- **Organisierte Jagd** gegen ein bekanntes E-Individuum (Elite/strong variation), mit Gilden- und Einheimischeninformation statt verborgener Werte.
- **Expedition zu einem entfernten Ort**, an dem die Jagd- oder Räumungsarbeit liegt; die Reise ist Teil des Abenteuers (PULSE trägt das).
- **Ausgewählte Dungeon-Ziele**: Räumung einer E-Etage als Gruppenvertrag.
- **Institutionelle Aufträge** von Tempel, Akademie oder Garnison. Formal bleiben es Gildenverträge mit Jagd- oder Räumungsziel; der Auftraggeber liefert Kontext, Zugang und Belohnungsform.
- **Aufklärung oder Schutz** wäre eine neue Familie. Erst entscheiden, wenn die bisherigen Familien natürlich zu eintönig wirken (OFFEN). Lieferung und Eskorte bleiben ruhend, wie GPT empfiehlt.

---

## 10. Weltmodell (Kernkapitel)

### 10.1 Bevorzugte Variante

Ich empfehle GPTs Kombinationsvariante. Sie hat aber einen klaren **mechanischen Kern** und eine **Seltenheitsregel aus dem Lore**:

> **Geographie zuerst, Gefahr örtlich und persistent, hohe Ränge selten und konkret.**
>
> - Die Karte trägt keine Rangfarbe.
> - Gefahr hängt an konkreten Orten (Fenster) und Populationen (Art, Körperplan, Fenster, typische Gruppengröße).
> - Höhere Ränge erscheinen als **seltenere Lebensräume, seltene Individuen, Dungeon-Etagen und Institutionen**, nie als Bevölkerung ganzer Regionen.

Warum diese Variante:

1. **Lore:** Es gibt fast wörtlich die passenden Sätze; siehe Befund 10.
2. **Simulation:** Einzelne Höherrangige sind für den Rang spielbar, Rudel nicht. Genau „seltene Einzelgänger, kleine Gruppen, tiefere Territorien“ ergibt die spielbare und glaubwürdige Gefahr.
3. **Technik:** Sie benötigt kein neues Datenmodell. Orte mit `encounter_levels`, Populationen, `lineage`-Vererbung, Living Dungeons, Gildenfilialen und `monsters.outdoor.<Rang>` (ab `.262`) existieren.

### 10.2 Kleinste Einheit, Vererbung, Überschreibung

- **Einheit (IST):** ein persistenter Ort (`site`, `wilderness`, `region`) mit Gefahrenfenster.
  - Teilorte erben über die Ortsahnenkette.
  - Eine Population überschreibt das Fenster für ihre Art.
  - Ein Individuum (Elite, Boss, „strong“) überschreibt die Population.
  - Neue Orts-IDs entstehen nur, wenn die Erzählung einen unterscheidbaren Ort etabliert (Ortsbuch `.190`). Für jeden Baum braucht es also keine eigene ID.
- **Neu (HYP):** Die **Gruppengröße** gehört zur Population, etwa als optionale „typische Gruppe“ (1 / 2–3 / Rudel).
  - Das wäre ein neuer Verbraucher in Extractor-Vertrag und Katalog.
  - Für E genügt zunächst die Leitlinie im Content-Text `monsters.outdoor.E.danger`, ohne Schemaänderung.
  - Die Simulation zeigt, dass die Gruppengröße die Gefahr stärker verändert als 2–4 Level.

### 10.3 Seltenheit ohne Spawn-Tabelle

Seltenheit entsteht über **Struktur, nicht über Prozentwerte (HYP)**:

| Gefahrenstufe | Wo sie plausibel ist |
|---|---|
| Höhere Populationen | nur an Orten, die die Erzählung als **abgelegen, tief, gefährlich oder ursächlich** begründet (Manaquelle, Dungeonnähe, Territorium eines entwickelten Tiers, Grenzgebiet) |
| Einzelne Höherrangige in F-Gebieten | nur als benannte, persistente Individuen mit Ursache und Spur, etwa ein entwickeltes Alttier oder ein Streuner aus einer Dungeonetage; niemals als Zufallsbegegnung pro PULSE-Fenster |
| Hochrangige Personen | an Institutionen gebunden (Garnison, Tempel, Akademie, Gildenhaus), gemäß Lore-Machtdichte |

PULSE bleibt unverändert. Es bestimmt **ob** etwas geschieht, nie **wie stark** (GPT §8.2).

### 10.4 Gefahr kommunizieren, ohne Allwissen

- Gildenbrett und Gildenauskunft nennen bekannte Spannen und Gruppen. Das ist der Kanon-Wunsch „Populations-Levelspanne, Vertragskillzahl und sichtbare Gegnerzahl trennen“.
- Einheimische und Wärter warnen, Spuren zeigen Größe und Zahl.
- Das HUD zeigt nur Bekanntes. Vorschlag (HYP): eine Zeile „Bekannte Gefahr hier: L18–21, meist einzeln“ im Weltbereich, nur bei etablierter Population oder Gildeninformation.
- Für E-Etagen gibt es zusätzlich den Hinweis „für Gruppen“ aus der Gildenakte.

### 10.5 Institutionen, Märkte, Lehre

Siedlungsgrößen existieren im Content (`rules.settlements`), ebenso die Filialränge (`supported_ranks`: Stadt bis Veteran, Hauptstadt bis Elite). Vorschlag (HYP):

| Siedlung | Markt | Lehre |
|---|---|---|
| Dorf | F-Ware | keine E-Lehrer |
| Stadt | F-Ware, gelegentlich E-Ware über Händlerbezug, Gildenvermittlung | E-Lehrer in passenden Institutionen |
| Hauptstadt | regulärer E-Markt, D selten | D-Lehrer selten, über Zugang (Ruf, Mitgliedschaft, Kosten) |

Das ersetzt den „Rangshop“: Verfügbarkeit hängt an Siedlung und Institution, nicht am PC-Rang. Technisch reicht dafür der heutige globale `gear.instances.market_rank` bzw. `composer.entry_rank` nicht aus. Abschnitt 10.8 zeigt, wie Händler und Quellen ihren Rang stattdessen aus dem konkreten Weltobjekt beziehen.

### 10.6 Konkrete E-Möglichkeiten an den drei Startstädten

Alle Ortsbeispiele sind Vorschläge **(HYP)**, nicht kanonisch. Kanonische Bezüge sind gekennzeichnet.

**Ashbridge (Duskreach, Grenzland)**
- *Kanon:* Monsterjagd und Monsterteilehandel; starke B/A-Militärfiguren; Ostgrenze zum Ashen Scale Dominion; Mossback Warrens mit E2.
- Ring 1, Straßen und Höfe: F1–3.
- Ring 2, Steinbruchpfad und Hügel, Mossback F1: F4–11.
- Ring 3, ein bis zwei Tage östlich im Moor- und Hügelland: F12–14 mit vereinzelten E15–17-Einzelgängern (ein entwickeltes Alttier mit Revier).
- Ein ausdrücklich etabliertes Grenzterritorium E18–21, aus dem Grenzvorfälle stammen.
- Institutionen: Garnison mit E/D-Ausbildern für Martial und Defense; Gilde (Stadt) mit Proven-Board.

**Alderwatch (Valedorn Crown)**
- *Kanon:* Tempel und Heilerorden; Old Crown Catacombs mit E2-Ghulen und Ghul-Lord, Aufsicht der Tempelwärter.
- E-Einstieg vor allem über Tempelaufträge und die Katakomben.
- Für Gruppen ist der Ghul-Lord schon ab L15 zugänglich (3.5).
- E-Lehrer in Tempel und Orden (Control, Defense, Heilung).
- Crownheart (Hauptstadt) als regulärer E-Markt.

**Glassmere (Caelreth, Akademien)**
- *Kanon:* Glimmerdeep nur F, „the deep galleries the academy's“; Skill-Stein-Studium und -Handel.
- E-Zugang über die **von der Akademie gehaltenen tiefen Galerien**. Der Kanon kennt sie bereits; eine E-Etage wäre dort glaubwürdig, aber eine neue Contententscheidung.
- E-Skillsteine und Manuale im Handel der Akademie.
- Arcane-Lehrer.

Damit erhält jede Startstadt einen eigenen E-Charakter:

- Ashbridge: Jagd und Grenze.
- Alderwatch: Glaube und Untote.
- Glassmere: Wissen und Magie.

Es gibt keine E-Zone, keine Hochskalierung der Umgebung, und der Rückkehrwert alter Orte bleibt erhalten (Märkte, Beziehungen, bekannte Wege).

### 10.8 Rang gehört dem Weltobjekt, nicht dem Spielstand: Folgerungen für die globalen `.262`-Parameter

`.262` hat die F-Werte in Content-Parameter überführt. Drei davon sind aber **globale Gleichheitsschalter** (IST, End-HEAD `c665c59a`):

| Parameter | heutige Wirkung | was ein globaler Wechsel F → E auslösen würde |
|---|---|---|
| `composer.entry_rank` | Eine Lernquelle wird nur angenommen, wenn ihr Rang **gleich** diesem Wert ist (`growth.js` L230); der Composer erzeugt neue Techniken in diesem Rang (`skill_composer.js` L111) | F-Lehrer, F-Steine und F-Manuale würden unlernbar; jede neu komponierte Technik wäre E, auch bei einem F-Charakter oder F-Lehrer |
| `passive_design.rank` | Dynamische Passive werden nur in diesem Rang entworfen und geprüft (`passive_growth.js` L63/L213, `passives.js` L73) | F-Figuren erhielten E-Passive oder gar keine gültigen Entwürfe |
| `gear.instances.market_rank` | Welche Ausrüstung als reguläres Angebot gilt, wie sie heißt und ob sie einen Handelspreis hat (`items.js` L106/L157/L296, `world.js` L3599) | Jeder Händler der Welt böte über Nacht E-Ware an. Das ist genau der „Rangshop“, den das Weltmodell vermeiden soll. |

**Bereits individuell, also schon weltgebunden (IST):**

- Machtrang jeder Person und Kreatur aus ihrem Level (`rankOf`).
- Gegnerprofil, Beute und Sonderbelohnungen im Rang des Gegners.
- Rang eines Steins oder Manuals aus seinem eigenen Profil (`rankInName`, `items.js` L205).
- Skill-Rangschranke je Lernendem (`rankBar`: E-Skills erst ab eigenem L15).
- Gildenboard je Gildenrang und Filiale (`outdoor_boards.<Gildenrang>`, `supported_ranks` je Siedlungsart).
- Gefahrenfenster je Ort und Population (`monsters.outdoor.<Rang>`; `validPopulationLevels` erlaubt Unterbereiche).

**Prinzip (HYP):** Ein Rang wird nie global „eingeschaltet“. Jede Weltgröße bekommt ihren Rang aus einer **konkreten Quelle**, und mehrere Ränge sind gleichzeitig aktiv.

| Weltgröße | Rangquelle (Vorschlag) | Obergrenze | Rolle des heutigen globalen Werts |
|---|---|---|---|
| **Händler und Angebot** | Bezugsrang des Anbieters: aus seiner etablierten Handelsstufe (gewöhnlicher Händler, Waffenschmied mit Gildenbezug, Akademie- oder Tempelhändler) und der Siedlungsgröße | Dorf F; Stadt F, E nur bei etabliertem E-Anbieter; Hauptstadt E regulär, D selten | Standardwert für einen gewöhnlichen Anbieter ohne weitere Angaben: bleibt `market_rank = F` |
| **Lehrer** | eigener Machtrang und tatsächlich bekannte Techniken des NPC (Kanon: trainierte NPCs haben persistente Skills) | lehrbar ist höchstens der eigene Rang und nur Bekanntes | entfällt als Schranke; Prüfung „Quelle ≤ Lehrer“ |
| **Stein und Manual** | eigener Profilrang (existiert) | unverändert | Gleichheitsprüfung ersetzen durch: Quellenrang ≤ Machtrang des Lernenden **und** kalibrierte Grenzen für diesen Rang existieren |
| **Selbst entwickelte Technik** (Composer ohne Quelle) | Machtrang des Lernenden, bei C1 | E erst ab L15 (`rankBar`) | `entry_rank` wird zum „niedrigsten erlaubten Rang“, nicht zum einzigen |
| **Passive** | Machtrang des Trägers (PC oder NPC) zum Zeitpunkt des Entwurfs | nur Ränge mit kalibrierten Grenzen | `passive_design.rank` wird zur Liste kalibrierter Ränge |
| **Population und Individuum** | Fenster des Orts oder der Population; Individuum über Elite/strong/eigenes Profil (existiert) | Seltenheitsregel aus 10.3 | – |
| **Gildenboard** | Gildenrang und Filiale (existiert) | `supported_ranks` je Siedlung | – |

**Folgen für die E-Einführung:**

- E kann **lokal** beginnen: ein E-Anbieter in Ashbridge, ein Arcane-Lehrer der Akademie in Glassmere, eine E-Population in einem Grenzterritorium.
- Alle F-Inhalte bleiben gleichzeitig gültig.
- Der gemischte F–S-Weltaufbau aus Abschnitt 10 ist ohne diese Umstellung nicht abbildbar. Die drei Parameter sind daher die **einzigen technischen Voraussetzungen**, die vor dem ersten E-Händler, E-Lehrer oder E-Passiv gelöst werden müssen (Abschnitt 15).
- Für Outdoor-Fenster, Board und Beute genügt der vorhandene Mechanismus.

**OFFEN (aus der Abnahme übernommen):** Wie werden mehrere aktive Gebietsränge zugleich kommuniziert?

- Vorschlag (HYP): Der Gefahrentext je Rang bleibt getrennt (`monsters.outdoor.F.danger`, `…E.danger`). Der Narrator erhält nur den Text der Ränge, die am aktuellen Ort oder in seiner Ahnenkette tatsächlich etabliert sind.
- Ein neues Gebiet ohne Beleg bleibt beim konservativen Fall „unknown“ (IST).

### 10.9 Einbettung von D bis S

Nur die Richtung, keine Werte:

| Rang | Hauptort im Weltmodell | Charakter |
|---|---|---|
| D | entfernte Territorien, Grenzmarken der Monsterreiche, regionale Dungeons, Spezialisten in Städten | Expeditionen, seltene Ressourcen, lokale Machtfiguren |
| C | regionale Mächte, bedeutende Dungeons, große Institutionen | regionale Konflikte, Zugangsrechte, Ruf |
| B/A | hohe Ämter, strategische Orte, Militär (Duskreach!) | politische Folgen, Aufträge mit Verantwortung, kaum „Jagd“ im engen Sinn |
| S | Abschreckung auf Reichsebene | kein Farminhalt; seltene strategische Begegnungen mit Folgen; Kampf möglich, aber als Ereignis |

Mechanisch bleibt alles beim selben Muster: Fenster je Rang (`monsters.outdoor.<Rang>`), seltene Populationen, Dungeon-Etagen je Rang und institutionelle Zugänge. Die Kopplungsregel aus Abschnitt 3 gilt auch dort: Die sichere Stufe ist ein Anteil des Levels. Höhere Fenster müssen deshalb noch stärker über Einzelgänger und Gruppenzwang gestaltet werden, nicht über dichte Populationen.

---

## 11. Party und NPC-Progression

**IST/TEST:**

- Die Party ist mechanisch eigenständig: eigene Ressourcen, Besitz und Entscheidungen.
- Kampf-XP werden unter den Überlebenden geteilt, **Quest-XP ebenfalls** unter den berechtigten Teilnehmern (Korrektur, siehe [Korrektur zu GPT-R2](AVERETH_262_CLAUDE_E_BALANCE_VERTIEFUNG_UND_ENTSCHEIDUNGSVORLAGE.md#2-korrigierte-rechnungen-r2)).
- NPCs erhalten 5 Punkte pro Level.

**SIM:** Zu zweit werden gleichstufige E-Gruppen und Elites sicher (Abschnitt 3.4).

**Empfehlung (HYP):**

1. **Party ist nicht Pflicht, aber der natürliche Zugang zu gleichstufigen E-Gruppen und E-Etagen.** Solo bleibt E über Einzelgänger, Verträge und Spät-E spielbar. Damit gilt GPTs „kein verpflichtender Weg“.
2. **E-Begleiter glaubwürdig verfügbar machen:**
   - E-Abenteurer und -Söldner treten in Städten mit E-Infrastruktur auf, mit eigenen Bedingungen (Lohn, Ruf, Anteil).
   - Hochrangige NPCs (C+) bleiben selten und sind keine Starter-Begleiter.
3. **XP- und Lohnteilung unverändert.** Die Rechnung zeigt, dass die Party bei E XP-effizient ist (Abschnitt 4.2).
4. **OFFEN:**
   - Wie schnell steigen Begleiter-Level mit, wenn sie nur geteilte Kampf-XP erhalten?
   - Bleibt der Abstand zum PC stabil?
   
   Das sollte in natürlichem E-Spiel gemessen werden.

---

## 12. HUD: kleine QoL-Pakete passend zu E

Vorhandenes geprüft, Bereits-Umgesetztes nicht erneut gefordert (HYP, priorisiert):

1. **Bekannte Gefahr im Freien:** bekannte Populationsspanne und typische Gruppe des aktuellen Orts, nur wenn etabliert oder über die Gilde bekannt (10.4). Das ist der größte Nutzen für E, weil Gruppengröße und Körperplan über Leben und Tod entscheiden.
2. **Vorher/Nachher beim Ausrüsten und im Handel:** Rang, Qualität, ATK/DEF-Differenz und Nutzungsgrenze. Das passt zu „Rang = eine Qualitätsstufe“, weil der Spieler die Überlappung sehen muss.
3. **Gruppiertes Inventar** bei wachsendem Besitz. Mein Gegenreview hat gezeigt, dass Inventar ungedeckelt in den Katalog wächst; die Anzeige entlastet den Spieler, nicht das Modell.
4. **Party-Karte mit Rang und Level** der Begleiter neben HP/MP/STA (heute getrennte Werte vorhanden).
5. **Rangaufstieg-Hinweis:** Bei Machtrang E zeigt das HUD einmal, dass F-Gegner jetzt halbe XP geben und dass Verträge und Proven-Board die Alternative sind. Reine Information, keine neue Aktion.

Alle fünf sind Anzeigen bestehender Engine-Fakten und brauchen keinen Modellaufruf.

**Ergänzung aus dem natürlichen `.262`-A/B-Lauf (TEST):**

- Zielwahl im Kampf und der Übergang vom Gespräch zur Party kosteten in beiden Armen zusätzliche Eingaben. Der Spieler musste am Ende eine Gegner-ID nennen.
- Weil E-Inhalte laut Simulation überwiegend Gruppen- und Partyinhalt sind, steigt der Wert einer **eindeutigen Zielauswahl im Kampf-HUD** (sichtbare Ziele anklickbar) und einer **klaren Party-Einladungsaktion**.
- Die native Einladung existiert bereits; zu prüfen ist ihre Auffindbarkeit.
- Ich stufe beide Punkte für das E-Paket gleichrangig mit Punkt 1 ein.

---

## 13. Empfohlenes E-Gesamtpaket

Alle Werte sind Vorschläge **(HYP)** und provisorisch. Sie sind auf `.262`-Schlüssel abgebildet.

| Bereich | Vorschlag | Content-Schlüssel ab `.262` | Status |
|---|---|---|---|
| Fenster im Freien | `[15,15]`, `[15,17]`, `[18,21]`, `[22,25]`, `[26,29]` (gleicher Aufbau wie F) | `monsters.outdoor.E.windows` | Entscheidung |
| Gefahrentext | E nur abgelegen, tief oder begründet; meist Einzelgänger oder kleine Gruppen; schwere Körperpläne einzeln; Rudel und Verbände nur in etablierten Territorien | `monsters.outdoor.E.danger` | Entscheidung |
| Proven-Board | Fensterprofile und Vergütung nach Abschnitt 9; ein Einstiegsangebot auf 15–17 | `guild.outdoor_boards.Proven` | Entscheidung, Obergrenze OFFEN |
| E-Waffen | F + 4 (10/14/18/22/26) | `gear.instances.e_weapon_values` | Entscheidung |
| E-Waffenpreise | Formel mit Qualitätsfaktor (196/315/539/910) oder gerundete Tabelle | `gear.instances.weapon_prices.E` | Entscheidung |
| E-Rüstung | generisch ×1,75 belassen | – | keine Änderung |
| E-Markt | Bezugsrang je Anbieter: Stadt nur bei etabliertem E-Anbieter, Hauptstadt regulär (10.8); `market_rank` bleibt F als Standard | `gear.instances.market_rank` (heute globaler Gleichheitsschalter) | technische Voraussetzung (10.8) |
| E-Lernquellen | E-Lehrer, E-Steine, E-Manuale an Institutionen; Quelle ≤ Machtrang des Lernenden; Lernregeln unverändert | `composer.entry_rank` (heute globaler Gleichheitsschalter) | technische Voraussetzung (10.8) |
| Passive | Rang des Trägers; F-Passive bleiben gültig; E-Grenzen erst nach Kalibrierung | `passive_design.rank` (heute globaler Gleichheitsschalter) | technische Voraussetzung (10.8), Werte später |
| E-Klasse | Budgets unverändert, Richtungsbalance beobachten | `class_growth` | Beobachtung |
| XP und Rangabstand | V0 belassen, V1 als Rückfallebene | `rules.xp` | Entscheidung |
| E-Etagen | Werte unverändert, als Gruppeninhalt kommunizieren | Gildenakte, Prompts | Text |
| Ortsbeispiele | Ashbridge-Grenzterritorium, Akademie-Galerien Glassmere, Tempelaufträge Alderwatch | `lore.json` (falls übernommen) | Kanonentscheidung |
| HUD | Pakete 1–5 aus Abschnitt 12 | `hud.js` | parallel |

---

## 14. Entscheidungsvorlage

### Zuerst zu entscheiden (blockiert E-Content)

1. **Weltmodell:** geschichtete Variante mit Seltenheitsregel (Abschnitt 10.1) statt E-Zonen.
2. **E-Fenster und Gefahrentext** (Abschnitt 13) einschließlich der Leitlinie zur Gruppengröße.
3. **Ausrüstungsschritt:** „Rang = eine Qualitätsstufe“ (G1) und konsistente Preisformel.
4. **Proven-Board:** Profile und ob die Vergütungsobergrenze über 600 steigen darf.
5. **E-Einstiegsorte je Startstadt:** welche der Beispiele aus 10.6 kanonisch werden, insbesondere Akademie-Galerien und Ashbridge-Grenzterritorium.
6. **Rangzuordnung statt globaler Schalter (10.8):**
   - Händler, Lehrer, Quellen und Passive erhalten ihren Rang aus dem konkreten Weltobjekt.
   - Mehrere Ränge sind gleichzeitig aktiv.
   - Das ist eine Fachentscheidung mit technischer Folge und Voraussetzung für jeden lokalen E-Händler, E-Lehrer und jedes E-Passiv.

Die [`.262`-Abnahme](AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md#empfehlung-für-die-e-entwicklung) empfiehlt, zuerst **genau eine spielbare E-Unternehmung** zu bestimmen. Dem schließe ich mich an. Mein Vorschlag für diese erste Unternehmung (HYP): **Ashbridge**.

| Baustein | Inhalt |
|---|---|
| Gebiet | ein etabliertes Grenzterritorium im Fenster 15–17 mit einem einzelgängerischen, entwickelten Revierbesitzer (leichter oder mittlerer Körperplan) |
| Auftrag | ein Proven-Jagdvertrag dazu |
| Ausrüstung | ein E-Anbieter mit Gildenbezug in Ashbridge |
| Steigerung | Mossback E2 als ausdrücklich kommunizierte Gruppensteigerung |

Das deckt in einer zusammenhängenden Kette Weltgefahr, Proven-Arbeit, Belohnung, Ausrüstung und Gruppeninhalt ab, mit dem bereits vorhandenen Dungeon und dem Frontiercharakter von Duskreach.

### Bewusst provisorisch

- Exakte Vergütungen und Preise.
- E-Klassen-Budgets.
- Rangabstand V0/V1.
- Lernquellenkosten.

### Erst in natürlichem E-Spiel beurteilbar

- Spielstunden pro Rang und gefühltes Tempo.
- Ob E-Einzelgänger und Proven-Jagden genug Vielfalt bieten.
- Begleiterwachstum.
- Netto-Wirtschaft pro Abenteuer.
- Richtungsbalance der E-Klassen.
- Ob E-Etagen als Gruppeninhalt verständlich sind.

### Vor D zu entscheiden, nicht vor E

- Materialfaktor und Ausrüstungswertwachstum (Abschnitt 8).
- D-Waffenregel (Abschnitt 7).
- Obere Bandhälften in Dungeons (K7).

---

## 15. Technischer Anschluss

- **`.262` (abgenommen) liefert die Schlüssel** für Fenster, Gefahrentext, Board-Profile und Waffenpreise je Rang. Diese Vorschläge sind reine Content-Einträge:
  - `monsters.outdoor.E`;
  - `guild.outdoor_boards.Proven` mit Intro-, Reparatur-, Gefahren- und Quotenhinweisen, die die Abnahme für Proven ausdrücklich offenlässt;
  - `e_weapon_values`, `weapon_prices.E`.
- **Technische Voraussetzungen vor lokalem E-Handel, E-Lehre und E-Passiv** (10.8), benannt, nicht beauftragt:
  - **(a)** Bezugsrang je Anbieter statt globalem `market_rank`;
  - **(b)** „Quelle ≤ Machtrang des Lernenden“ statt Gleichheit mit `composer.entry_rank`;
  - **(c)** Rang des Trägers und Liste kalibrierter Ränge statt globalem `passive_design.rank`.
  
  Verbraucher sind laut Codestellen in 10.8 `items.js`, `world.js` (Angebotserkennung), `growth.js`, `skill_composer.js`, `passive_growth.js` und `passives.js` sowie die Markthinweise in P/N/X (`content.js` `marketRank`).
- **Weitere neue Verbraucher** (optional):
  - **(d)** „typische Gruppe“ einer Population, mit Extractor-Vertrag, Katalog und HUD;
  - **(e)** HUD-Zeile „bekannte Gefahr“;
  - **(f)** Preisformel mit Qualitätsfaktor für alle Ränge in `valueOf`/`gearRetailPrice`.
- **Skalierung:** Die `.262`-Messung bestätigt meinen Befund aus dem Gegenreview.
  - Den größten Prompteffekt haben viele gleichrangige Teilorte: 1.000 Teilorte ergeben einen P-Request von 147.521 Bytes gegenüber 57.805; 150 anwesende NPCs und 30 aktive Quests kosten zusätzlich Aufbauzeit.
  - Für E genügt Beobachtung; eine Kappung ist nicht nötig. Das deckt sich mit der Abnahme.
  - Die E-Welt aus Abschnitt 10 erzeugt eher **mehr entfernte Orte als mehr Geschwisterorte**, und genau diesen Fall begrenzt der Katalog bereits.
- **Unverändert:** Ortspersistenz, Spielerhoheit, PULSE (keine Stärkewirkung), autonome NPCs, Living-Dungeon-Spannen, XP-Formeln, Claim + State.

---

## 16. Eigene Prüfungen, Grenzen, Unsicherheiten

**Ausgeführt (offline, ohne Modellaufrufe):**

| Skript | Inhalt |
|---|---|
| `gear_table.mjs` | Ausrüstungstabelle |
| `growth_ratio.mjs` | Wachstumsvergleich PC/Gegner |
| `econ_model.mjs` | XP- und Wirtschaftsmodell |
| `skill_compare.mjs` | Skillvergleich |
| `xp_variants.py` | XP-Varianten |
| `sim_matrix.mjs` (4 Matrizen) | 672 Szenarien × 100 Seeds |
| `sim_threshold.mjs` | 2 × 105 Kurven mit je bis zu 19 Gegnerstufen × 60 Seeds |
| `sim_evolution.mjs` | E-Klassenwirkung |
| `sim_groupsize.mjs` | 432 Szenarien |
| `sim_variants.mjs` | 3 Content-Varianten |
| `sim_party.mjs` | Solo gegen Zweierparty |
| `sim_floor.mjs` | Etagenketten |

Alle Skripte und JSON-Rohdaten liegen in [`claude_261_e_bis_s/`](claude_261_e_bis_s/).

**Selbstkorrektur in der Simulation:** Die erste Fassung der Etagenkette ließ Kämpfe abbrechen, wenn der Begleiter das Ziel im selben Durchlauf bereits getötet hatte. Dadurch erschien „Party schlechter als solo“. Nach Korrektur (Aktion neu wählen, 0 Abbrüche) ist die Party nie schlechter. Die Zahlen in Abschnitt 3.5 stammen aus der korrigierten Fassung.

**Grenzen:**

- Einfache Spielerpolitik, keine Tränke, keine Flucht und Verhandlung, kein Gelände.
- Nur die Startskills.
- Begleiter aus dem Produkt-Template `adventurer`; ihre Ausrüstung ist der des PCs angeglichen.
- Ein einziger Startabstand (SHORT).
- Natürliche Spieler werden besser abschneiden. Belastbar sind Kippunkte und Verhältnisse.
- Die Wirtschaftsrechnung nutzt Richtwerte, keine Handelspreise; Lebenshaltungskosten fehlen im Content.
- Die Spielzeit pro Rang ist nicht simulierbar.

**Unsicherheiten:**

- Die Faustregeln aus Abschnitt 3.2 gelten für die getesteten Körperpläne. Leichte Bosse (Skelett) weichen stark ab.
- Die Mage-Werte hängen besonders von der MP-Ökonomie ab.
- E-Werte für D–S sind bewusst nicht berechnet.

**Nicht-Ziele, eingehalten:** keine Claim + State-Diskussion, keine Legacy-, Prompt- oder Speicheroptimierung, keine D–S-Werte, keine Produktänderung, keine Providerrequests.
