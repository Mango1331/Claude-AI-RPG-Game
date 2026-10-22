# Patch 9B-1: Dynamische Skill-Definitionen und Proficiency (4.3.0-c.6.6.36)

Zweiter Teil von Patch 9 (Organic Character Growth). 9B-1 baut das Fundament: Skills, die eine Kampagne selbst definiert, und den Fortschritt P1–P5 bekannter Skills. Passives, Selbstheilung, Ressourcen-Effekte und die defensive NPC-KI folgen in 9B-2.

Organisches Lernen, Lernfortschritt, Skill Stones, Evolution, Training, Debuffs, Zustände und Balancing gehören nicht zu 9B.

## 1. Registry: Definition ≠ Erwerb

| Teil | Umsetzung |
|---|---|
| Speicher | `state.skill_defs` (pro Kampagne). Die Content-Maps werden nie verändert. |
| Definieren | `src/skills.js defineSkill(state, content, def)` liefert das Event `skill.defined` oder nur Fehler. Nur unter Regelstand 2. |
| Erwerben | `learnSkill(state, content, who, id)` liefert das vorhandene Event `skill.learned`. Eine Definition gibt den Skill niemandem. |
| Unveränderlich | Eine ID, die schon existiert, verweigern Validator und Reducer (`skill defined twice`). |
| Eigentum | Neue Art `skills` (Engine, `src/v4/ownership.js`). `skill.progress` gehört zu `pc.progress`. Kein Extractor-Delta, kein Narrator-Report und kein Planner-Befehl darf diese Events schreiben (Ownership-Test). |
| Replay | Die Events stehen im Log; `fold` ergibt dieselben Definitionen, Sheets und `pp_keys`. |

In 9B-1 ruft noch keine Spielmechanik `defineSkill` auf. Das organische Lernen, das diese Funktion braucht, ist ausgeschlossen. Die Funktion ist die geprüfte Schnittstelle dafür, und die Tests nutzen sie.

## 2. Ein Resolver

`src/content.js` bietet vier Funktionen:
- `skillOf(content, id, state)` sucht zuerst die Definitionen der Kampagne, dann den statischen Content.
- `skillsNamed` und `skillNames` liefern Namen beider Quellen.
- `findSkill(…, state)` sucht nach ID oder Namen.

Ohne `state` gilt wie bisher nur der Content. Umgestellt sind:
- `derived.js actionsOf` (neuer 4. Parameter) und damit der Kampf-Snapshot;
- `combat.js` (Angriff, Skill, World-Action, Schadensvorschau, NPC-Reichweite und -Angriff);
- `engine.js` (World-Use, Area, Burst, Join-Text);
- `intent.js` (Namen in freiem Text);
- `v4/planner.js` (`planContext`, `withContentSkills(ctx, content, state)`, Skill-Hinweis, `mapPlan`);
- `v4/runtime.js` (Crowd);
- `commands.js` (`#skills`, `#skill`);
- `hud.js`, `context.js`, `display.js`, `validate.js`.

Statisch bleiben die Klassen-Pools, Basic Attacks und Waffenangriffe (Erschaffung, NPC-Generator).

Ein laufender Kampf behält die gesperrten `{prof, pp}` seines Snapshots. Eine Beförderung wirkt erst im nächsten Kampf.

## 3. Geschlossener Validator (`skillDefErrors`)

Unbekannte Felder, Effektarten und Werte werden abgelehnt, nicht ignoriert. Freitext ist nur in `name`, `description` und `origin.note` erlaubt, jeweils mit Länge und Zeichen begrenzt. Code und Formeln sind nie erlaubt.

**Felder und Pflichtwerte**
- `id`: `dyn.` plus Kleinbuchstaben, eindeutig gegen Content und Kampagne. Der Name darf mit keinem existierenden Skill kollidieren.
- `rank`: F–S gültig, aber **nur F** angenommen. Höhere Ränge haben noch keine kalibrierten Grenzen.
- `complexity`: 1–3. `tags`: 1–3 aus den Disziplinen der Affinitäten (Arcane, Control, Defense, Martial, Mobility, Precision).
- `category`: Offensive genau dann, wenn der Skill angreift. `activation`: `action`. `target`: `enemy` für einen Angriff, sonst `self`.
- `cost`: `sta` oder `mp`, ganzzahlig, im Kostenband der Complexity.
- `range`: nur Core-Bänder.

**Angriff**
- `physical` nutzt ATK, `magical` MATK; 1–2 Skalierungen aus STR, VIT, AGI, INT, WIL. **PER skaliert nie Schaden.**
- Basis und Summe der Koeffizienten folgen der F-Rang-Kalibrierung aus `content.6.r2` (`rules.json skill_design.f_rank`):

  | Complexity | Basis höchstens | Koeffizienten höchstens | Kosten |
  |---|---|---|---|
  | C1 | 12 | 1,90 | 5–10 |
  | C2 | 16 | 2,40 | 8–16 |
  | C3 | 18 | 2,60 | 12–22 |

- Budget-Merkmale: LONG, ignoriert Partial Cover, Extra-Band, Area, Multi-Hit, Rider. Höchstens so viele wie die Complexity.
- Multi-Hit (2–3) teilt Budget und Anteil durch die Zahl der Treffer.
- Area: ENGAGED, ein Treffer, höchstens ¾ des Budgets pro Ziel.

**Effekte**

Nur die Arten, die die Kampf-Engine ausführt. Die Obergrenzen sind die stärksten F-Skills des Contents:

| Effekt | Höchstwerte |
|---|---|
| `temp_def` | 6 + Stat ×0,8 |
| `temp_mdef` | 4 + Stat ×0,6 |
| `barrier` | C1: 6 + ×1,5; ab C2: 10 + ×2 |
| Schadensminderungen | 25 % |
| `next_attack_buff` | 35 % |
| `reposition` | 1 Band |
| `post_attack_temp_def` | 4 |
| `extra_band`, `area` | Merkmale eines Angriffs |

- Selbst-Effekte nur ohne Angriff, Rider nur mit Angriff.
- Jede Art höchstens einmal; Barrier und DEF-Bonus nicht zusammen; höchstens zwei Effekte.

Die 18 Starter-Skills bestehen den Validator als Kopie (Test 8). Eine dynamische Definition darf also höchstens so viel wie der eigene Content.

## 4. Content

- **Complexity und Tags der 18 Starter-Skills** (`classes.json`). Werte unverändert; die Complexity folgt aus den Kalibrierungsbändern:
  - **C2:** Power Strike, Flame Lance, Arcane Burst (Kosten 14), Focused Ward (Kosten 14).
  - **C1:** alle anderen.
- **Tags:**

  | Klasse | Tags |
  |---|---|
  | Warrior | Heavy Slash, Power Strike, Quick Slash: Martial; Guard, Deflect: Defense; Charge: Martial + Mobility |
  | Mage | Arcane Bolt, Flame Lance, Arcane Burst: Arcane; Arcane Ward, Focused Ward: Arcane + Defense; Blink: Arcane + Mobility |
  | Rogue | Razor Cut, Piercing Thrust, Feint: Precision; Long Lunge: Precision + Mobility; Evasive Step: Mobility + Defense; Guarded Cut: Precision + Defense |

- **Affinität.** Es zählt nur die **höchste** Affinität der Tags, nie ein Produkt (`affinityFor`).
- **`rules.json proficiency`**:
  - `levels.N.effect` (1; 1; 1,05; 1,10; 1,15);
  - `award` (12 Basis-PP; Herausforderung: Gegner höchstens 2 Level unter ihm, und ein Gegner hat ihn angegriffen);
  - `skill_design.f_rank`;
  - Schema: `effect` ist Pflicht je Level.

## 5. Proficiency P1–P5

| Thema | Regel |
|---|---|
| Schwelle | Nach Complexity: C1 75, C2 100, C3 150 PP, gleich für jede Beförderung bis P5 (`promotionPp`). |
| Übertrag | Überzählige PP gehen in die nächste Stufe über (`advancePp`). |
| P5 | Ende: PP 0, keine weiteren PP, keine Evolution. |
| `#skills`, `#skill` | Zeigen `PP x/Schwelle` nach Complexity (vorher fälschlich nach Proficiency), bei P5 `PP max`. `#skill` zeigt zusätzlich die aktuellen Effektwerte und unter Regelstand 2 den Fortschritt mit Affinität. |
| Validierung | PP liegen unter der Schwelle, bei P5 sind sie 0. |

## 6. Effektfaktoren

- **Werte:** P3 ×1,05, P4 ×1,10, P5 ×1,15.
- **Anwendung:** Gesamtwert des Levels, einmal angewandt, kaufmännisch gerundet, nur wenn der Faktor ≠ 1.
- **Gilt für** DEF/MDEF-Boni, Barrier-HP und den DEF-Bonus nach einem Angriff (Guarded Cut).
- **Gilt nicht für** Prozente, Bänder, Trefferzahl, Dauer und Wahrheitswerte.
- **Gleiche Rundung überall:** Kampf (`skillAction`, `postAttackDef`) und `#skill` nutzen dieselbe Funktion (`effectValue`, `flatEffectValue`).
- **Beispiel Arcane Ward bei WIL 6:** P1/P2 15, P3 16, P4 17, P5 17.
- Kosten- und Kraftfaktoren gelten unverändert.

## 7. PP-Vergabe

**Grundregeln**
- Pro Skill und Kampf höchstens einmal: 12 PP × höchste Affinität, gerundet (Rogue Razor Cut 18, Evasive Step 15; Warrior mit Arcane Bolt 9).
- **Gebucht erst am Kampfende** (`endEncounterEvents` → `skill.progress` vor `encounter.ended`). Schlüssel `fight:<enc>:<skill>` in `state.pp_keys`.
- Die Panel-Zeile lautet `SKILL +18 PP Razor Cut → P1 18/75`, bei Beförderung mit `· PROFICIENCY P1 → P2`. Der Narrator erhält eine Zeile.

**Sinnvolle Nutzung**

Erkannt im Record-Trichter von `runCombat` (`noteUse`). Gespeichert am Encounter, weil dessen Log auf 20 Records gekürzt wird.

| Art | Bedingung |
|---|---|
| Offensiv | Legaler Angriff mit Treffer auf einen Gegner. |
| Defensiv | Ein Gegner greift ihn an, bevor er wieder handelt. |
| Utility, Reposition | Ein Band hat sich verändert. |
| Utility, Feint | Seine nächste Aktion ist ein Angriff. |

**Kein Fortschritt bei**
- abgelehnten oder unbekannten Aktionen, Waffenangriffen (kein gelernter Skill) und Gegenständen;
- NPCs;
- wenn er stirbt oder flieht.

**Herausforderung**

Die Begegnung zählt nur, wenn
1. mindestens ein Gegner höchstens 2 Level unter ihm war, und
2. ein Gegner ihn angegriffen hat.

Ein passiver oder trivialer Gegner gibt also nichts, auch wenn er wenig XP bringt.

**Außerhalb eines Kampfes**

Ein gelernter Skill in einer gewürfelten Engine-Probe an einem Feature, also nicht `trivial` oder `impossible`, gibt PP. Das gilt einmal pro Skill und Feature, bei Erfolg und bei Misserfolg (Schlüssel `check:<feature>:<skill>`).

Training gibt es erst in 9C.

## 8. Legacy

Regelstand 1 bekommt keine Definitionen und keinen PP-Fortschritt, und `enc.pp` wird nicht angelegt. Kampagnen ohne `skill_defs` funktionieren weiter.

Sichtbare Änderungen für Legacy:
- `#skills` zeigt jetzt die Complexity der Warrior- und Mage-Skills.
- Die Schwelle steht nach Complexity, z. B. Power Strike 0/100 statt 0/75.
- `#skill` hat eine Zeile mit den aktuellen Effektwerten, bei P1 identisch mit den geschriebenen Werten.

## 9. Tests

`tests/v4/patch9b1.test.js` (14): Definition, Replay und andere Kampagne; Ownership; ein Resolver (direkt und im ganzen Kampf über den Namen); Planner, HUD, `#skills`, `#skill`; ungültige Definitionen ohne Zustandsänderung (41 Fälle); Complexity, Tags und höchste Affinität; PP-Vergabe, Missbrauchsschutz und Beförderungen; Probe außerhalb des Kampfes; Kosten-, Kraft- und Effektfaktoren; bestehende Skills; Legacy.

`tests/v4/gen35_ownership.test.js`: Die Liste der Engine-Arten enthält `skills`.

## 10. Offene Grenzen

- Kein Spielpfad definiert oder lehrt bisher einen dynamischen Skill. Das organische Lernen fehlt (später), `defineSkill` und `learnSkill` sind die Schnittstelle.
- Nur F-Rang. Andere Ränge bleiben gesperrt, bis Grenzen festgelegt sind.
- Nur die Effektarten, die die Kampf-Engine kennt. Heilung, Ressourcen und Passives folgen in 9B-2; Debuffs, DOTs und Zustände nicht in 9B.
- Die Herausforderungsregel ist bewusst schmal (Level-Abstand und ein Angriff auf ihn). Ein Feind auf gleichem Level, der nach einem Treffer flieht, zählt. Balancing folgt später.
- Defensive Skills zählen nur, wenn ein Gegner ihn danach angreift. Ob der Angriff durch den Schutz schwächer wurde, prüft die Regel nicht.
