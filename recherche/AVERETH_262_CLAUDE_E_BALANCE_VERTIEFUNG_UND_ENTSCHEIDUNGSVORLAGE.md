# Avereth .262 – Vertiefte E-Balance: Prüfung R1–R9 und Entscheidungsvorlage

**Claude** · 28.11.2026 · Antwort auf den vertiefenden GPT-Gegenreview zur [E–S-Analyse](AVERETH_261_E_BIS_S_BALANCE_WELTMODELL_CLAUDE.md). Keine Produktimplementierung, keine Kanonänderung, keine Providerrequests.

| Bezug | Stand |
|---|---|
| Produkt | `.262`, End-HEAD [`c665c59a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c665c59a313746e165a00a5f147c1aaeff7c0452), nur gelesen |
| Werkzeuge und Rohdaten | [`claude_262_e_balance/`](claude_262_e_balance/) mit [`ERGEBNISSE.txt`](claude_262_e_balance/ERGEBNISSE.txt). Die Analysekopie und ihre zwei erweiterten Simulatorwächter sind im README beschrieben. |
| Korrekturen am Vorbericht | Im [E–S-Bericht](AVERETH_261_E_BIS_S_BALANCE_WELTMODELL_CLAUDE.md) an drei Stellen markiert, außerdem in `claude_261_e_bis_s/xp_variants.py`. |

Kennzeichen wie bisher:

| Kennzeichen | Bedeutung |
|---|---|
| **IST** | Code oder Content |
| **SIM** | eigene Simulation mit Produktfunktionen |
| **RECH** | Rechnung |
| **HYP** | Vorschlag |
| **OFFEN** | Nutzerentscheidung |

Jedes Simulationsergebnis basiert auf 40–60 Seeds.

---

## 0. Ergebnis in Kürze

1. **R1 war berechtigt.** Mit entwickelten Builds (Flächenangriff, P5, vier Skills, E-Klasse, Tränke) ändern sich die Kippunkte erheblich:
   - Ein entwickelter Warrior L15 besiegt solo drei Goblins L17, fünf Wölfe L16 und zwei Bären L15 jeweils zu 100 %. Mit dem Standard-Build waren es 0 %.
   - Alle **F-Etagen** sind mit entwickelten Builds solo fast immer schaffbar; einzig der Rogue L5 braucht in Mossback F1 Erholung.
   - **Old Crown E2** ist solo schaffbar: Mage ab L20 mit Rast, Warrior und Mage ab L24, Rogue ab L24 mit Rast.
   - **Mossback E2** bleibt überwiegend Gruppeninhalt.
   - Build, Startdistanz und Vorbereitung sind bedeutsam. Beim Mage gegen den Ghul-Lord macht die Startdistanz 55 % gegenüber 100 % aus.
2. **R2 war berechtigt. Mein Fehler:** Auch Quest-XP werden geteilt.
   - Korrigiert: Pro Person ist eine Zweierparty **nicht langsamer**, wenn sie die größeren Kämpfe annimmt, die sie sicher gewinnt (7.545 gegen 6.090 XP je Abenteuerzyklus).
   - Sie verdient aber pro Person etwa ein Drittel weniger Geld.
3. **R3:**
   - Der Waffenanteil am Rohschaden fällt heute von 23 % (F) auf 12–14 % (E). Mit „+4 je Rang“ fiele er bis S auf 8 %.
   - Empfehlung für E: **E-Waffe = F × 1,4** (8/14/20/25/31). Für D–S: **geometrisch etwa ×1,4 je Rang**.
   - Rüstung bleibt unverändert; ihr Schutzanteil liegt zusammen mit VIT/4 über alle Ränge stabil bei 27–31 %.
4. **R4:**
   - Heute ist **Complexity die stärkste Machtachse**: F-C3 auf P5 übertrifft neue E-C1-Techniken deutlich. Rang ist die schwächste Achse.
   - STA ist für Menschen fest 100 (MP wächst). Höhere E-Kosten treffen Warrior und Rogue deshalb stärker.
   - Empfehlung: Rang als Grundkraft plus Wirkungsstärke der vorhandenen Zusatzwirkungen (`effect_scale`), eine **bewusste Rang-Evolution** gemeisterter Techniken und ein STA-schonendes Kostenband.
5. **R5:**
   - Verteidigungsrichtungen dominieren auch bei entwickelten Figuren, seltene Verteidigung extrem.
   - Variante O1 (offensiver Statbonus ×2) macht offensive Richtungen klar attraktiver.
   - Passive-Rang = **Kalibrierungsstufe aus der Erwerbsgrundlage**, nicht Machtrang des Trägers.
6. **R6:** Am E-Einstieg kostet ein E-fine-Set mit E-Manual **1–2 Abenteuerzyklen** (solo) bzw. **2–2,3** (Party, je Person).
   - Ein Zyklus bringt 4–7 Level.
   - Langfristig sollten Vergütung, Materialwert und Ausrüstungspreis **einen gemeinsamen Wachstumsfaktor von etwa ×2,5 je Rang** haben.
7. **R7:** Das Weltmodell ist größtenteils mit vorhandenen Strukturen abbildbar. Zwei Lücken sind konkret:
   - Alle menschlichen NPC-Vorlagen enden bei Level 14.
   - Ein höherstufiger Anführer einer schwächeren Gruppe ist heute nur als `stronger` (+20 %) möglich.
8. **R8:**
   - Die Lernkette kennt keinen Rang: weder im Lernziel noch in `techniqueSignature`. Ein E-Schlag gleicher Funktion würde als „already learned“ abgelehnt.
   - Der Composer nutzt den globalen Rang mit F-Zahlen.
   - Der Händlerpfad erkennt reguläre Ware nur im globalen Marktrang.
   - Konkrete Verbraucherliste in Abschnitt 9.
9. **R9:**
   - Anklickbare Ziele und eine Partyansicht existieren bereits.
   - Ausrüstungsvergleich und Gefahrenanzeige im Freien fehlen.
   - Ashbridge soll Testfall sein, kein Pflichtweg.

---

## 1. Bewertung R1–R9

| Punkt | Urteil | Kern |
|---|---|---|
| **R1** Simulationsaussagekraft | **berechtigt** | Gruppen- und Dungeonprobleme waren teilweise ein Artefakt der Builds und der Strategie. Bestehen bleiben: Gruppen für Mage und Rogue solo, schwere Bosse, Mossback E2 (Abschnitt 3). |
| **R2** Quest-XP-Teilung | **berechtigt, mein Fehler** | Korrigiert in Abschnitt 2 und im Vorbericht. Das Ergebnis „Party pro Person nicht langsamer“ bleibt, aus anderem Grund. |
| **R3** Waffen langfristig | **berechtigt** | +4 je Rang verliert langfristig an Wirkung. Empfehlung: F × 1,4 für E, geometrisch weiter (Abschnitt 4). |
| **R4** Skillprofile | **berechtigt** | Mit Waffenanteil und Kosten gerechnet. Complexity dominiert, STA ist fest (Abschnitt 5). |
| **R5** Klassen und Passive | **berechtigt** | Die Defensivdominanz bestätigt sich auch bei entwickelten Figuren. Variante O1 und ein Vorschlag zum Passive-Rang (Abschnitt 6). |
| **R6** Wirtschaft | **berechtigt** | Kreislauf mit Teilung gerechnet (Abschnitt 7). |
| **R7** Weltmodell | **Zustimmung** | Umsetzung mit Bestand, zwei konkrete Lücken (Abschnitt 8). |
| **R8** Rangquellen | **berechtigt, präziser als vermutet** | Lernziel, Signatur, Composer, Lehrer- und Händlerpfad (Abschnitt 9). |
| **R9** Ashbridge und HUD | **Zustimmung** | Ashbridge als Testfall, nicht als Pflichtweg. HUD-Bestand geprüft (Abschnitt 10). |

---

## 2. Korrigierte Rechnungen (R2)

**IST** (`.262`): `guild.js` L573–578 teilt die Quest-XP mit `splitPool` unter allen berechtigten lebenden Teilnehmern (`party_work`), genauso wie die Kampf-XP.

Meine Annahme „Quest-XP erhält jeder voll“ war falsch. Korrigiert sind:

- die Tabelle 4.2 des Vorberichts (neue Zeile „Standardvertrag zu zweit, je Person 1.125“);
- Abschnitt 8 Punkt 4 und Abschnitt 11;
- `xp_variants.py` mitsamt Ergebnisdatei.

XP je Person für einen PC auf L15, nächstes Level 1.500 XP (RECH, [`econ_r6.py`](claude_262_e_balance/econ_r6.py)):

| Aktivität | gesamt | je Person |
|---|---:|---:|
| solo: 1 E-Einzeltier L16 | 960 | 960 (0,64 Level) |
| solo, Warrior entwickelt: 3 Goblins L17 | 3.060 | 3.060 (2,04) |
| solo: 3 F-Goblins L11 (Rangabstand 0,5) | 990 | 990 (0,66) |
| zu zweit: 3 Goblins L17 | 3.060 | 1.530 (1,02) |
| zu zweit: E-Boss Ghul-Lord L22 | 3.300 | 1.650 (1,10) |
| Standardvertrag L15 solo | 2.250 | 2.250 (1,50) |
| Standardvertrag L15 zu zweit | 2.250 | **1.125 (0,75)** |

Ein Abenteuerzyklus besteht hier aus einem Proven-Vertrag und vier Begegnungen, die die jeweilige Seite laut Abschnitt 3 sicher gewinnt:

| Spielweise | XP je Person | cp je Person bei Vergütung 150 / 350 / 550 |
|---|---:|---|
| Solo Mage/Rogue: 4 E-Einzeltiere | 6.090 (4,1 Level) | 366 / 566 / 766 |
| Solo Warrior: 2 Einzeltiere + 2 Goblin-Dreiergruppen | 10.290 (6,9 Level) | 258 / 458 / 658 |
| Zu zweit: 2 Wolfsrudel + Elite-Bär + Goblin-Gruppe | 7.545 (5,0 Level) | 273 / 373 / 473 |

**Folgerungen:**

1. Eine Party ist pro Person XP-gleichwertig oder besser, **weil** sie größere Begegnungen gewinnt. Pro Vertrag ist sie halb so ertragreich.
2. Ein entwickelter Solo-Warrior, der Gruppen beherrscht, ist am schnellsten.
3. Das Geld pro Person ist in der Party etwa ein Drittel geringer.
4. **Keine Änderung der XP-Verteilung** (Vorgabe). Die Kurve bleibt rangunabhängig (Vorbericht 4.1).
5. **OFFEN:** Ein Zyklus bringt am E-Einstieg 4–7 Level, das E-Band (33.000 XP) dauert also etwa 5–6 Zyklen. Ob das gefühlt passt, zeigt nur natürliches Spiel. Die `.262`-Abnahme kommt mit anderen Annahmen zur selben Größenordnung.

---

## 3. Ergänzende Kampfsimulationen (R1)

### 3.1 Methode

Code: [`simlib.mjs`](claude_262_e_balance/simlib.mjs).

| Build | Inhalt |
|---|---|
| **B0** | bisherige Standard-Builds und Produktpolitik |
| **B1–B3** | AoE-Starter (Warrior Cleave + Guard, Mage Arcane Wave + Arcane Ward, Rogue Fan of Blades + Evasive Step) mit taktischer Politik, P1/P3/P5 |
| **B4 „entwickelt“** | wie B3, dazu zwei gelernte F-Pooltechniken auf P3 (Warrior Heavy Slash + Deflect, Mage Flame Lance + Focused Ward, Rogue Piercing Thrust + Guarded Cut), echte E-Klasse (normal; Warrior Defense, Mage Arcane, Rogue Precision), E-fine-Ausrüstung, je 3 E-Heiltränke und 3 Ressourcentränke |
| **B5** | B4 mit gleichstufigem Begleiter (Produkt-Template `adventurer`, gleiche Ausrüstung) |

Taktische Politik in dieser Reihenfolge:

1. Trank oder Verteidigung bei weniger als 40 % HP;
2. Flächenangriff bei zwei oder mehr Gegnern;
3. sonst der stärkste Einzelangriff auf den schwächsten bekämpfbaren Gegner.

### 3.2 Kippunkte neu (SIM, [`sim_r1.mjs`](claude_262_e_balance/sim_r1.mjs))

Siegquote, Warrior / Mage / Rogue:

| Lage | B0 | B1 AoE P1 | B3 AoE P5 | B4 entwickelt | B5 + Begleiter |
|---|---|---|---|---|---|
| L15: 3 Goblins L17 | 0 / 0 / 0 | 0 / 0 / 0 | 100 / 0 / 0 | **100** / 0 / 0 | 100 / 100 / 100 |
| L15: 3 Goblins L15 | 0 / 0 / 0 | **100** / 0 / 0 | 100 / 0 / 0 | 100 / 0 / 0 | 100 / 100 / 100 |
| L15: 5 Wölfe L16 | 0 / 0 / 0 | **100** / 0 / 2 | 100 / 0 / 2 | 100 / 0 / 0 | 100 / 100 / 100 |
| L15: Elite-Bär L16 | 38 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | **100 / 87** / 0 | 100 / 100 / 100 |
| L15: 2 Bären L15 | 0 / 0 / 0 | 0 / 0 / 0 | 8 / 0 / 0 | **100** / 0 / 0 | 100 / 100 / 100 |
| L20: Oger-Boss L20 | 0 | 0 | 0 | 0 | 2 / 63 / 13 |
| L20: Schamanen-Boss L22 | 0 | 0 | 0 | 0 / 2 / 0 | 100 / 100 / 100 |
| L20: Ghul-Lord L22 | 8 / 33 / 0 | 0 | 0 | 17 / **55** / 0 | 100 / 100 / 100 |
| L10: 3 Goblins L10 | 0 / 0 / 0 | **100** / 0 / 0 | 100 / 17 / 0 | 100 / 0 / 0 | 100 / 100 / 100 |

**Startdistanz** (B4 solo; ENGAGED / SHORT / MEDIUM / LONG):

| Klasse | Elite-Bär L16 | Ghul-Lord L22 (PC L20) |
|---|---|---|
| Mage | 87 / 87 / 100 / 100 | 55 / 55 / **100 / 100** |
| Warrior | 100 / 100 / 38 / 100 | 17 / 17 / 0 / 17 |
| Rogue | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

**Einordnung:**

- **Warrior:** Der Flächenangriff löst das Gruppenproblem.
- **Mage:** Er gewinnt über Reichweite. Ein reiner AoE-Build verliert die Einzelzielstärke; das ist ein echter Build-Zielkonflikt und kein Fehler.
- **Rogue:** Er bleibt solo schwach. Seine Stärken (Hinterhalt mit garantiertem Crit ×1,5, Schleichen, Gelände) bildet die Simulation nicht ab. Das ist eine **offene Klassenfrage für natürliches Spiel**, kein Anlass für Zahlenänderungen jetzt.
- Schwere Bosse (Oger) bleiben Gruppeninhalt. Leichtere Bosse (Ghul) sind für einen gut vorbereiteten Mage solo machbar.
- Tränke, Proficiency und die E-Klasse wirken zusammen; jedes einzeln wirkt mäßig (3.5).

### 3.3 Dungeonketten mit und ohne Erholung (SIM, [`sim_dungeon.mjs`](claude_262_e_balance/sim_dungeon.mjs))

Angegeben ist der Anteil vollständig geräumter Etagen. „max“ bedeutet Slotobergrenze (Belastungstest), „mid“ mittlere Anzahl. Rast nach Produkt-Erholungsraten (10 % HP, 15 % MP, 25 % STA pro Stunde).

| Etage, PC | Standard max/0 h | entwickelt max/0 h | entwickelt mid/0 h | mid/1 h | mid/4 h | entwickelt + Begleiter max/0 h |
|---|---|---|---|---|---|---|
| Mossback F1, L5 (W/M/R) | 0/0/0 | 100/98/0 | 100/98/0 | 100/100/98 | 100 | 100 |
| Mossback F1, L8 | 0/0/0 | 100 | 100 | 100 | 100 | 100 |
| Glimmerdeep F1, L5 | 100/83/95 | 100 | 100 | 100 | 100 | 100 |
| Old Crown F1, L5 | 100/100/18 | 100 | 100 | 100 | 100 | 100 |
| **Mossback E2**, L18 / L20 | 0 | 0 | 0 | 0 | 0 | **100** |
| Mossback E2, L24 | 0 | 0 | 0 | 0 | 0 / **100** / 58 | 100 |
| **Old Crown E2**, L18 | 0 | 0 | 0 | 0 | 0 / **60** / 0 | **100** |
| Old Crown E2, L20 | 0 | 0 | 0 | 3 / 30 / 0 | 13 / **100** / 0 | 100 |
| Old Crown E2, L24 | 63 / 0 / 0 | **100 / 100** / 0 | 100 / 100 / 0 | 100 / 100 / 0 | 100 / 100 / **100** | 100 |

**Antwort auf die R1-Frage:** Die E-Etagen müssen nicht pauschal Gruppeninhalt sein.

- **Old Crown E2** ist für einen gut entwickelten und vorbereiteten Solospieler ab Mitte bis Ende E erreichbar: Mage ab L20 mit Rast, Warrior ab L24, Rogue ab L24 mit Rast.
- **Mossback E2** mit dem Schamanen-Boss bleibt überwiegend Gruppeninhalt; solo gelingt sie nur dem Mage auf L24 mit Rast.

Diese Mischung ist wünschenswert, denn sie macht Build, Vorbereitung und Party je nach Ziel bedeutsam. Die Kommunikation sollte deshalb differenziert sein („für Gruppen empfohlen“ statt pauschal).

### 3.4 Was vom ersten Bericht bleibt

| Aussage | Stand nach R1 |
|---|---|
| „Gleichstufige Gruppen kippen ab L10“ | Gilt für Standard-Builds. Für einen Warrior mit Flächenangriff nicht; für Mage und Rogue solo weiterhin. |
| „Sichere Stufe ≈ Anteil des Levels“ | Bleibt als Struktur gültig, der Anteil hängt aber stark vom Build ab. |
| „Party ist der stärkste Einzelhebel“ | Bestätigt. |
| „E-Etagen sind Gruppen- oder Spät-E-Inhalt“ | Differenzierter: Old Crown E2 ist solo ab Mitte E erreichbar, Mossback E2 bleibt Gruppeninhalt. |
| „Körperplan entscheidet“ | Bestätigt; Oger gegen Ghul, Bär gegen Wolf. |

---

## 4. Waffen und Rüstung langfristig (R3)

### 4.1 Anteil am Schaden und Schutz (RECH, [`gear_longterm.mjs`](claude_262_e_balance/gear_longterm.mjs))

Warrior, ausgewogen, auf Bandmitte. Skill-Grenzen bis E kalibriert; für D–S fehlt eine Kalibrierung, dort wurde die E-Kalibrierung angesetzt.

| Rang (L) | Skillteil | Waffe fine heute | W1 +4/Rang | W2 ×1,35/Rang | Rüstung heute: DEF common (+VIT/4) gegen Bär-ATK |
|---|---:|---|---|---|---|
| F (7) | 46 | 14 (23 %) | 14 (23 %) | 14 (23 %) | 6 → 31 % |
| E (22) | 114 | 15 (12 %) | 18 (14 %) | 19 (14 %) | 11 → 29 % |
| D (37) | 174 | 21 (11 %) | 22 (11 %) | 26 (13 %) | 15 → 27 % |
| C (52) | 234 | 27 (10 %) | 26 (10 %) | 34 (13 %) | 20 → 27 % |
| B (67) | 294 | 33 (10 %) | 30 (9 %) | 47 (14 %) | 24 → 27 % |
| S (97) | 414 | 45 (10 %) | 38 (8 %) | 85 (17 %) | 33 → 26 % |

- Der Waffenanteil fällt in allen additiven und linearen Varianten auf etwa 10 %.
- Ein konstanter Anteil von 25 % würde schon bei E eine Waffe von etwa 38 verlangen. Das zerstört die Überlappung (F-exceptional 22).
- **Rüstung (heute linear ×(1+0,75R))** hält zusammen mit VIT/4 ihren Schutzanteil stabil (26–31 %). Ein geometrisches Wachstum (×1,6) würde ab B überschießen (A 40 %, S 49 %).

### 4.2 E-Waffenvarianten im Kampf (SIM, [`sim_r3.mjs`](claude_262_e_balance/sim_r3.mjs))

Entwickelte Builds, Siegquote:

| Variante (crude/common/fine/superior/exceptional) | Warrior gegen Ghul-Lord (L20) | Mage gegen Geist-Elite L17 | Rogue gegen Elite-Bär L16 |
|---|---:|---:|---:|
| heute 7/11/15/19/23 | 17 % | 50 % | 0 % |
| F + 4 = 10/14/18/22/26 | 78 % | 78 % | 13 % |
| **F × 1,4 = 8/14/20/25/31** | **98 %** | **87 %** | **33 %** |
| F × 1,5 = 9/15/21/27/33 | 100 % | 95 % | 52 % |

**Empfehlung (HYP):**

- **E = F × 1,4:** crude 8, common 14, fine 20, superior 25, exceptional 31.
- Überlappung: E-common = F-fine, E-fine liegt zwischen F-superior und F-exceptional, E-superior übertrifft F-exceptional.
- Spürbar, aber kein Kippen ganzer Inhalte.
- **D–S, Richtung:** geometrisch etwa ×1,4 je Rang auf der Qualitätstabelle (D ≈ fine 27, C ≈ 38, B ≈ 53, A ≈ 75, S ≈ 105). Damit stabilisiert sich der Waffenanteil bei etwa 15–20 %, statt auf 8 % zu fallen.
- Endgültige D–S-Zahlen erst mit D–S-Skillkalibrierung.
- **Rüstung unverändert** (Vorgabe bestätigt).

### 4.3 Preise

| Rang | heutiger Richtwert (Punkte × 8 × Qualitätsfaktor × Rangfaktor) | W2 (×1,35) | gemeinsamer Faktor ×2,5/Rang | Vergütungsmitte | Material Wolf |
|---|---:|---:|---:|---:|---:|
| F | 140 | 140 | 140 | 105 | 12 |
| E | 263–315 | 333 | 350 | 350 | 36 |
| D | 525–550 | 650 | 875 | 900 | 108 |
| C | 845–878 | 1.105 | 2.188 | 2.400 | 324 |
| S | 2.090–2.475 | 4.675 | 34.180 | – | 8.748 |

Mit der heutigen Preisformel wachsen Waffen etwa ×1,7–1,9 je Rang, Vergütungen etwa ×2,6 und Material ×3. **Richtung (HYP):** ein gemeinsamer Wirtschaftsfaktor von etwa **×2,5 je Rang** für Vergütung, Materialwert und Ausrüstungspreis. Getrennt davon wächst die Kampfwirkung der Ausrüstung mit etwa ×1,4 je Rang. Für E ergibt das den E-fine-Waffenpreis 350 cp, gleich der Formel mit Qualitätsfaktor unter F × 1,4.

---

## 5. Skills: Rang, Complexity, Proficiency (R4)

### 5.1 Reale Profile (RECH, [`skill_profiles.mjs`](claude_262_e_balance/skill_profiles.mjs))

Auszug: L15, Waffe 20 (= E-fine unter F × 1,4), Rohschaden bei P1 und P5 sowie Kosten.

| Skill | C | Reichweite | Roh P1 / P5 | Kosten | Waffenanteil | Einsätze je Vorrat |
|---|---|---|---|---|---|---|
| Warrior Heavy Slash | 1 | ENGAGED | 81 / 97 | 7 | 25 % | 14 (STA 100) |
| Warrior Cleave | 2 | ENGAGED, alle Nahkämpfer | 71 / 85 je Ziel | 10 | 28 % | 10 |
| Mage Arcane Bolt | 1 | MEDIUM | 94 / 113 | 10 MP | 21 % | 35 (MP 352) |
| Mage Flame Lance | 2 | LONG | 117 / 140 | 16 MP | 17 % | 22 |
| Mage Arcane Wave | 2 | MEDIUM, Band | 71 / 85 je Ziel | 14 MP | 28 % | 25 |
| Rogue Piercing Thrust | 1 | ENGAGED | 91 / 109 | 9 | 22 % | 11 (STA 100) |
| Rogue Fan of Blades | 2 | SHORT, Band | 64 / 77 je Ziel | 10 | 31 % | 10 |

E-Varianten einer Funktion (Warrior, schwerer Einzelschlag, L22, Waffe 20; Kosten jeweils Untergrenze des Bands):

| Stand | Roh × P | Kosten | Einsätze je 100 STA |
|---|---:|---:|---:|
| F-C1 P1 (Content) | 102 | 7 | 14 |
| F-C1 P5 | 122 | 6 | 16 |
| F-C3 P5 (Obergrenze, nach zwei Evolutionen) | **195** | 11 | 9 |
| E-C1 P1 (neu gelernt, Obergrenze) | 134 | 8 | 12 |
| E-C1 P5 | 161 | 7 | 14 |
| E-C3 P1 | 177 | 16 | 6 |
| **Rang-Evolution F-C3 P5 → E-C3, P geerbt (Variante S-C)** | **212** | 14 | 7 |

**Befunde (IST/RECH):**

1. **Complexity ist heute die stärkste Machtachse.** C1 → C3 bringt von Grenze zu Grenze etwa +30 %, gegenüber dem Content-Heavy-Slash sogar +60 %, und zugleich eine neue Eigenschaft (Sweeping, Rushing, Piercing, Far, Guarded, Layered). Rang C1 F → E bringt etwa +10–30 % ohne Eigenschaft. Ein neuer E-C1 verliert klar gegen eine gemeisterte F-C3.
2. **STA ist für Menschen fest 100**, MP wächst (352 bei L15, 492 bei L22). Höhere E-Kostenbänder verringern die Einsätze von Warrior und Rogue spürbar (E-C3: 6 Einsätze), den Mage kaum.
3. Proficiency P5 bringt +20 % Kraft und −10 % Kosten. Das ist eine klare, eigenständige Achse und bleibt so.

### 5.2 Varianten für E (HYP)

| Variante | Rang bedeutet | Folge |
|---|---|---|
| **S-A** heute | etwas höhere Basis- und Koeffizientengrenzen, höhere Kosten | E-Skills wirken hauptsächlich wie teurere Versionen. Das will GPT vermeiden. |
| **S-B** Rang = Grundkraft + Wirkungsstärke | Grenzen wie heute, dazu wirken die **vorhandenen** Zusatzwirkungen der Evolutionsschritte stärker (Guarded DEF +2 → +3, Layered-Anteil, Sweeping-Anteil) über die bereits existierende `effect_scale` (heute nur Barriere und Heilung, 1,5) | neue taktische Wirkung **ohne neue Effektarten**; Rang wird als Qualität erlebbar |
| **S-C** bewusste Rang-Evolution | Eine gemeisterte Technik (F-C3, P5) kann bei eigenem Machtrang E über ein Evolutionsangebot zur E-Technik derselben Funktion und Complexity werden, mit geerbter Proficiency und 0 PP (Regel wie heutige Evolution). `developSkill` kennt bereits eine `rank`-Option und meldet bei C3 „the last at its Rank“. | belohnt Meisterschaft und organische Entwicklung; kein Zwang zu neuen Techniken |
| **S-D** STA-schonendes Kostenband | E-Kostenband für STA-Skills = F-Band, für MP-Skills das heutige E-Band | gleicht die feste STA aus. Alternative: STA-Vorrat ab E über `class_growth`-Pool. |

**Empfehlung:** **S-B + S-C + S-D**, auf den vorhandenen Grenzen. Neu gelernte E-Techniken (P1) bleiben dann einem gemeisterten F-C3 unterlegen, öffnen aber eine höhere Decke. Ein gezielter Rangschritt läuft über die Rang-Evolution.

Damit hat jede Achse eine eigene Bedeutung:

- **Rang** = Machtstufe und Wirkungsstärke;
- **Complexity** = Funktionsbreite;
- **Proficiency** = Meisterschaft durch Nutzung.

Keine D–S-Werte.

---

## 6. Klassen und Passive (R5)

**SIM** ([`sim_r5.mjs`](claude_262_e_balance/sim_r5.mjs), [`sim_r5b.mjs`](claude_262_e_balance/sim_r5b.mjs); entwickelte Figuren L15): Siegquote / HP übrig in %. Ein Paar `x/y` steht für Siegquote / HP; ein Paar `a/b` in einer Richtungsspalte steht für normal / rare.

| Lage | Warrior Offense normal / rare | Warrior Defense normal / rare | Mage Arcane normal / rare | Mage Defense normal / rare | Rogue Precision normal / rare | Rogue Defense normal / rare |
|---|---|---|---|---|---|---|
| 3 Goblins L15 | 100/31 · 100/31 | 100/47 · 100/61 | 0 · 0 | 100/32 · 100/48 | 0 · 0 | 100/22 · 100/48 |
| Elite-Bär L16 | 27 · 73 | 100 · 100 | 100 · 100 | 100 · 100 | 0 · 7 | 73 · 100 |
| Geist-Elite L17 | 7 · 7 | 7 · **95** | 50 · 68 | 25 · **100** | 97 · 97 | 97 · 100 |
| Ghul-Lord L22 (PC L15) | 0 · 0 | 0 · 0 | 0 · 0 | 0 · **100** | 0 · 0 | 0 · 0 |

**Variante O1** (offensiver ATK/MATK-Bonus verdoppelt: normal +8, rare +12):

| Lage | heute normal / rare | O1 normal / rare |
|---|---|---|
| Warrior gegen Elite-Bär | 27 / 73 | **88 / 93** |
| Mage gegen 3 Goblins | 0 / 0 | 12 / **67** |
| Mage gegen Geist-Elite | 50 / 68 | **80 / 97** |
| Rogue gegen Elite-Bär | 0 / 7 | 20 / **85** |

**Bewertung (HYP):**

1. Wegen der subtraktiven Verteidigung wirkt +4 DEF gegen jeden einzelnen Treffer, +4 ATK nur etwa +5 % pro eigenem Treffer.
   - **O1** (ATK/MATK-Bonus = 2 × Statbudget) macht offensive Richtungen eigenständig attraktiv: schnelleres Töten, weniger Risiko in kurzen Kämpfen.
   - Verteidigung bleibt die sicherere Wahl.
2. **Seltene Verteidigung** (DEF +6, Resistenz 15 %, HP +35) ist außergewöhnlich stark und kippt selbst Boss-Kämpfe (Mage gegen Ghul-Lord 0 → 100 %). Optionen (OFFEN):
   - so lassen, da rare;
   - die dritte Wirkung der rare Defense auf einen Ressourcenpool statt auf HP legen;
   - die Resistenz auf 12 % begrenzen.
   
   Meine Empfehlung: zunächst so lassen und im natürlichen Spiel beobachten. Rare ist ohnehin an echte Leistungsbelege gebunden (`feats.js`).
3. **Passive:**
   - Qualität (Ordinary/Rare/Legendary) bleibt unabhängig vom Rang. Vier Slots bleiben.
   - **Funktion des Passive-Rangs (HYP):** die *Kalibrierungsstufe der Zahlen* eines Passivs, bestimmt durch seine **Erwerbsgrundlage**: der Rang des belegten Gegners oder der Herausforderung, des Lehrers, des Steins. Der Machtrang des Trägers ist nur Obergrenze.
   - Ein auf L16 durch F-Belege erworbenes Passiv bleibt F. Ein E-Passiv entsteht aus E-Belegen.
   - Bestehende Passive bleiben unverändert gültig; es gibt kein automatisches Hochstufen mit dem Träger.
   - Technisch ist das der heutige globale `passive_design.rank`, ersetzt durch eine Liste kalibrierter Ränge plus den Rang aus der Erwerbsgrundlage (Abschnitt 9).

---

## 7. Wirtschaftskreislauf E (R6)

Am E-Einstieg zählt der Kreislauf **Abenteuer → Lohn und Beute → Verkauf → Ausrüstung oder Lernen → weitere Abenteuer** in Zyklen (Vertrag + 4 Begegnungen; RECH, [`econ_r6.py`](claude_262_e_balance/econ_r6.py)). Ziel ist E-fine-Waffe + E-fine-Rüstung + ein E-Manual, Vergütung mittel (350 cp):

| Preisvariante | Manual | Solo Mage/Rogue | Solo Warrior | Party, je Person |
|---|---|---:|---:|---:|
| heutige Richtwerte (Waffe 210 + Rüstung 224) | 120 | 1,0 | 1,2 | 1,5 |
| **F × 1,4 mit Qualitätsfaktor (350 + 224)** | **240 (×2)** | **1,4** | **1,8** | **2,2** |
| gemeinsamer Faktor ×2,5 (350 + 180) | 300 (×2,5) | 1,5 | 1,8 | 2,2 |

**Bewertung (HYP):**

- Bei 5–6 Zyklen je E-Band erlaubt die empfohlene Variante **zwei bis drei spürbare Upgrade-Schritte pro Rang** (fine → superior → Lernen). Das ist weder Goldschwemme noch unerschwinglich.
- Die Party braucht pro Person etwa ein Drittel länger, gewinnt aber größere Begegnungen und bekommt mehr Beute.
- **Lernkosten:**
  - Lernquellen-Richtwerte sind heute nicht rangskaliert (Stein 400, Manual 120, Gildenprimer 80).
  - Für E schlage ich Manual ×2 (240) vor; den Stein (400) belasse ich, weil er selten ist.
  - LP und Tagesgrenzen bleiben.
- **Keine Zwangskosten** und keine globale Wirtschaftssimulation. Unterkunft und Verpflegung bleiben erzählerisch.
- **Langfristig (vor D):** einheitlicher Wachstumsfaktor ×2,5 für Vergütung, Material und Ausrüstungspreis (Abschnitt 4.3). Der Materialfaktor ×3 würde sonst ab B/A eine Geldschwemme erzeugen (Vorbericht 8).

---

## 8. Weltmodell und organische Inhalte (R7)

Abbildung von GPTs Präferenzen auf vorhandene Strukturen:

| Präferenz | vorhanden (IST) | Lücke | minimaler Vorschlag (HYP) |
|---|---|---|---|
| Gemischte Populationen | Populationen hängen an Orten; alle Populationen der Ortsahnenkette gelten (`populationsAt`) | keine | Mischung über Teilorte und Elterngebiete ausdrücken; kein neues Feld |
| Außergewöhnliche Individuen | `stronger` → `variation: strong` (+20 % HP/ATK, +1 DEF, +2 Init); Elite- und Boss-Typen in Dungeons und Verträgen | außerhalb von Dungeons kein höherstufiges Individuum | **optional** an einer Population: ein bekanntes Einzelwesen mit eigenem Level und Typ (wie ein Dungeon-Slot); nur wenn die Welt es etabliert, nie Pflicht |
| Stärkerer Anführer einer schwächeren Gruppe | `creature.new` mit `count` und „leader among them“ als *eine* Gruppe | Anführer hat dasselbe Level | Anführer als eigenes `creature.new` mit `stronger` (heute), oder als bekanntes Einzelwesen (oben) |
| Höhere Ränge ohne große Entfernung | Fenster je Ort, `validPopulationLevels` mit Unterbereichen | keine | ein E-Habitat darf nah liegen, wenn die Erzählung eine Ursache etabliert (Dungeonnähe, Manaquelle, Revier) |
| Höherrangige NPCs an gewöhnlichen Orten | NPC-Level aus der Vorlage (`npc_templates.json`) | **alle Vorlagen enden bei Level ≤ 14** (Abenteurer 1–14, Wache 2–8) | Vorlagenbänder je Rolle erweitern (z. B. Veteran, Ausbilder, Meister) **oder** ein etabliertes Personenlevel (Gildenzertifikat, Ruf) als Override; `materialise` kennt bereits `overrides.level` |
| S selten, ohne Herrschaftszwang | Lore: S als Abschreckung | – | S-Inhalte als seltene Ereignisse und Orte mit Folgen, aber gewöhnliche Interaktion bleibt (Kampf, Handel, Dungeons, Beziehungen) |
| Hohe Ränge behalten freie Interaktion | alle Systeme rangoffen | – | keine Änderung |
| PULSE | Häufigkeit, nicht Stärke | – | unverändert |

Neu und optional sind also nur zwei Dinge:

- **(a)** NPC-Rang über Vorlagenbänder oder etablierte Overrides. Das ist für E-Lehrer und E-Händler nötig.
- **(b)** ein bekanntes Einzelwesen an einer Population.

Keine Pflichtfelder, keine neuen Validatoren.

---

## 9. Rangquellen und gemischte F/E-Inhalte (R8)

### 9.1 Die Lernkette heute (IST, `.262`)

| Schritt | Code | Rang heute | Problem bei F + E gleichzeitig |
|---|---|---|---|
| Quelle prüfen | `sourceTarget` (`growth.js` L228–233) | Quelle muss **gleich** `composer.entry_rank` sein | F- oder E-Quellen jeweils ausgeschlossen |
| Lernziel | `target = {fn, tags, aspects}` (L344–356, L388) | **kein Rang** im Ziel | Zielrang geht verloren |
| Duplikatprüfung | `techniqueSignature` (`skill_composer.js` L66), `knownTechnique` (`growth.js` L61) | **kein Rang** in der Signatur | E-Schlag gleicher Funktion und Tags gilt als „already learned“ |
| Lehrer | `teacherNow` (L170–178): nur Tag-Beherrschung | kein Lehrerrang | ein F-Lehrer könnte E lehren |
| LP-Bedarf | `learning_progress['1']` fest | C1 | – (C1-Einstieg bleibt sinnvoll) |
| Komposition | `composeSkill` (L91–116): `rank: R.entry_rank`, Zahlen aus `composer.functions` (F-Kalibrierung) | global | E-Komposition ohne E-Zahlen |
| Abschluss | `grant` → `defineSkill` → `learnSkill` | Validierung je Rang (`skillDefErrors`, `rankBar`) | – (prüft korrekt) |
| Bestand | alte Skills ohne Rangangabe = F | – | bleiben gültig |

**Nötige Änderungen (HYP, benannt, nicht beauftragt):**

1. **Lernziel trägt `rank`.** Der Rang stammt aus der Quelle: Lehrerrang (Machtrang des Lehrer-NPCs und seine bekannten Techniken), Profilrang von Stein oder Manual.
2. **Prüfung:**
   - Zielrang ≤ Machtrang des Lernenden (`rankBar`);
   - Zielrang ≤ Lehrerrang bzw. = Quellenrang;
   - kalibrierte Grenzen für den Zielrang vorhanden.
3. **Signatur mit Rang:** Aus `[fn, tags, aspects]` wird `[fn, tags, aspects, rank]`. Alte Definitionen ohne Rang gelten als F, ohne sie umzuschreiben. Damit sind F- und E-Varianten derselben Funktion verschiedene Techniken; ein Doppel desselben Rangs bleibt blockiert.
4. **Composer:** `composeSkill` nimmt `target.rank` und skaliert die Funktionszahlen innerhalb der Rangkalibrierung (`skill_design.e_rank`). `entry_rank` wird zum niedrigsten erlaubten Rang.
5. **Keine E-Technik allein aus dem Machtrang:** Organische Komposition ohne Quelle bleibt F oder folgt Variante S-C (Rang-Evolution mit Beleg).

### 9.2 Händlerkette

| Schritt | Code | heute | Vorschlag (HYP) |
|---|---|---|---|
| Angebotsprofil | `gearOfferProfile` (`items.js` L106): Name „q {market_rank}-Rank base“ | global | Rang der Angebotszeile aus dem **Bezugsrang des Anbieters** |
| reguläre Ware erkennen | `world.js` L3599: nur `named.rank === market_rank` | global | Rang ∈ erlaubte Ränge des Anbieters bzw. Orts |
| Handelspreis | `gearRetailPrice` (L296): nur `market_rank` | global | Preis je Rang (`weapon_prices.<Rang>`, Formel mit Qualitätsfaktor) |
| Sortiment (P/N/X-Hinweis) | `gearMarketText`, `content.js` `marketRank` | global | Text je Ort mit den erlaubten Rängen |
| Bezugsrang | – | – | Obergrenze aus Siedlungsart (Dorf F; Stadt F, E nur bei etabliertem Anbieter wie Gildenbezug oder Fachhändler; Hauptstadt F/E regulär, D selten); konkreter Anbieter als etablierte Tatsache, sonst F |

Bestehende Gegenstände behalten ihr Profil (IST: kein Neuauswürfeln). Beute behält den Rang des Gegners.

---

## 10. Erste E-Unternehmung und HUD (R9)

**Ashbridge** dient als Testfall für den ersten zusammenhängenden Produktpfad, nicht als Pflichtweg.

Das allgemeine System muss genauso tragen:

- E-Fenster an beliebigen etablierten Orten;
- E-Anbieter und -Lehrer überall, wo eine Institution es begründet;
- Old Crown E2 und Mossback E2 sowie spätere organisch entdeckte E-Orte.

**HUD-Bestand (IST, `.262`) und Vorschläge:**

| Wunsch | vorhanden | Vorschlag (HYP) |
|---|---|---|
| Bekannte Gefahr und Gruppengröße | Dungeon-Rang, -Etage, -Zyklus im HUD; im Freien nichts | Zeile „Bekannte Gefahr: L18–21, meist einzeln“, nur bei etablierter Population oder Gildeninformation |
| Anklickbare Gegnerauswahl | Ja: Zielknöpfe im Action-Composer (`action_composer.js` L215–219) | Bei Mehrdeutigkeit (A/B-Lauf: „nächster Untoter“) die Engine-Rückfrage mit denselben Zielknöpfen beantworten lassen, statt eine ID zu verlangen |
| Ausrüstungsvergleich | nein | Vorher/Nachher beim Ausrüsten und im Handel: Rang, Qualität, ATK/DEF-Differenz, Nutzungsgrenze |
| Verständliche Skillentwicklung | Ja seit `.262`: Rang, P, PP, Kosten, Reichweite, Wirkung | Ergänzung für E: angebotene Rang-Evolution (S-C) mit Vorher/Nachher |
| Individuelle Partywerte | Ja: Partyansicht (`partyView`) | Rang und Level der Begleiter ergänzen |

---

## 11. Konkrete Empfehlungen für E und Richtung D–S

| Bereich | Empfehlung E | Richtung D–S |
|---|---|---|
| XP | Kurve und Verteilung unverändert; Rangabstand V0 | unverändert (rangunabhängig) |
| Waffen | **F × 1,4: 8/14/20/25/31** | ×1,4 je Rang (geometrisch) |
| Rüstung | unverändert (generisch ×1,75) | unverändert linear |
| Preise | Formel mit Qualitätsfaktor: E-fine-Waffe 350; Manual ×2 | gemeinsamer Wirtschaftsfaktor ≈ ×2,5 je Rang für Vergütung, Material, Preis |
| Skills | S-B (Wirkungsstärke der Zusatzwirkungen über `effect_scale`), S-C (Rang-Evolution gemeisterter Techniken), S-D (STA-Kostenband) | Kalibrierung je Rang nach demselben Muster |
| Klassen | O1 prüfen (offensiver Bonus ×2); rare Defense beobachten | Richtung und Qualität je Rang |
| Passive | Rang = Erwerbsgrundlage; Qualität unabhängig; 4 Slots | Kapazität B+ später |
| Welt | E-Fenster `[15,15]` `[15,17]` `[18,21]` `[22,25]` `[26,29]`; Gefahrentext mit Gruppengrößenleitlinie; NPC-Rang über Vorlagen oder Overrides | gleiche Struktur je Rang |
| Gilde | Proven-Board mit Einstiegsangebot 15–17; Vergütung 100–800 (OFFEN, über die heutige Grenze 600) | Veteran und höher analog |
| Dungeons | Werte unverändert; differenzierte Gruppenempfehlung | – |

---

## 12. Entscheidungsvorlage (kompakt)

| # | Entscheidung | Varianten | Empfehlung | Begründung |
|---|---|---|---|---|
| 1 | E-Waffenwerte | heute +1 / F + 4 / **F × 1,4** / F × 1,5 | F × 1,4 | spürbar ohne Kippen, Überlappung erhalten, langfristig fortschreibbar (4.2) |
| 2 | Preisprinzip | heutige Formel / Formel mit Qualitätsfaktor / gemeinsamer Faktor ×2,5 | Formel mit Qualitätsfaktor für E; ×2,5-Prinzip als Richtung | 1–2 Zyklen je Upgrade (7) |
| 3 | Skill-Rang | S-A / **S-B + S-C + S-D** | Kombination | Achsen getrennt, Meisterschaft belohnt, STA fair (5) |
| 4 | Offensive E-Klasse | heute / **O1** | O1 als nächster Versuch | Offensive sonst kaum attraktiv (6) |
| 5 | Rare Defense | lassen / Pool statt HP / Resistenz 12 % | lassen, beobachten | rare und an Belege gebunden |
| 6 | Passive-Rang | global / Trägerrang / **Erwerbsgrundlage** | Erwerbsgrundlage | keine Auto-Hochstufung (6) |
| 7 | Rangquellen | global / **objektgebunden** | objektgebunden | Voraussetzung für gemischte Welt (9) |
| 8 | NPC-Rang | Vorlagenbänder / Override / beides | beides | E-Lehrer und -Händler brauchen E-Personen (8) |
| 9 | Proven-Vergütung | ≤ 600 / bis 800 | bis 800 | Preise E (7) |
| 10 | E-Fenster und Gefahrentext | wie Vorbericht | annehmen | Kippunkte (3) |

**Bewusst provisorisch:** alle Preise, Vergütungen, O1, Manualpreise.

**Erst natürlich zu beurteilen:** Tempo pro Zyklus, Rogue-Stärke mit Hinterhalt und Gelände, Wahrnehmung der E-Etagen, Begleiterwachstum.

---

## 13. Empfehlung: erstes zusammenhängendes E-Entwicklungspaket

Ein Codex-Paket, das ein **organisches E-Abenteuer überall** ermöglicht. Ashbridge dient als Abnahmefall.

1. **Rangquellen objektgebunden** (Abschnitt 9):
   - Lernziel mit Rang, Signatur mit Rang, Composer je Rang, Lehrerrang;
   - Angebotsrang je Anbieter oder Ort, Handelspreis je Rang;
   - Passive-Rang aus der Erwerbsgrundlage.
   - Bestehende Skills, Passive und Gegenstände bleiben unverändert gültig.
2. **NPC-Rang** über erweiterte Vorlagenbänder oder ein etabliertes Personenlevel (Abschnitt 8).
3. **E-Content nach Nutzerentscheidung:**
   - `monsters.outdoor.E` (Fenster und Gefahrentext);
   - `guild.outdoor_boards.Proven`;
   - `e_weapon_values` (F × 1,4) und `weapon_prices.E`;
   - E-Kalibrierung des Composers.
4. **Skill-Rang S-B/S-C/S-D und O1**, nur wenn der Nutzer sie freigibt; sonst als zweites Paket.
5. **HUD:**
   - Gefahrenzeile;
   - Zielknöpfe bei Rückfragen;
   - Ausrüstungsvergleich;
   - Rang und Level in der Partyansicht.
6. **Abnahme:**
   - Bestehende F-Requests bleiben byte-gleich (wie `.262`), modernes Replay unverändert.
   - Neue Proben: F- und E-Händler gleichzeitig; F- und E-Lehrer gleichzeitig; E-Technik gleicher Funktion lernbar; F-Bestand gültig.
   - Kurze natürliche Serie in Ashbridge: E-Fenster, Proven-Jagd, E-Anbieter, Old Crown E2 mit Begleiter.

---

## 14. Eigene Prüfungen und Grenzen

**Ausgeführt** (offline, Analysekopie `.262`): die Skripte in [`claude_262_e_balance/`](claude_262_e_balance/). Die Ergebnisse stehen in [`ERGEBNISSE.txt`](claude_262_e_balance/ERGEBNISSE.txt).

**Code gelesen:**

- `guild.js` (Quest-XP-Teilung);
- `growth.js` (`sourceTarget`, Lernziel, `knownTechnique`, `teacherNow`, `grant`);
- `skill_composer.js` (`composeSkill`, `techniqueSignature`, `STEPS`, `developSkill`);
- `skills.js` (Grenzen);
- `items.js`, `world.js` (Marktrang);
- `npcgen.js`, `npc_templates.json`;
- `population.js`;
- `world.js` (`stronger`);
- `hud.js`, `action_composer.js`, `ui_trade.js`.

**Grenzen:**

- Die taktische Politik ist besser als die Standardpolitik, aber nicht optimal: kein Gelände, kein Hinterhalt, keine Verhandlung.
- Der Rogue ist deshalb vermutlich unterschätzt.
- Begleiter stammen aus dem Template `adventurer` mit der Ausrüstung des PCs.
- Gelernte Skills sind Content-Pooltechniken, keine dynamischen E-Techniken.
- Die E-Klasse wurde nur normal und rare in angebotenen Richtungen geprüft.
- D–S-Rechnungen nutzen die E-Skillkalibrierung als Platzhalter.
- Die Wirtschaftszyklen beruhen auf Richtwerten; Lebenshaltung fehlt.

**Selbstkorrektur:** R2 (Quest-XP-Teilung) war mein Fehler; er ist korrigiert.
