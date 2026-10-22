# Patch 9A: Drei Startklassen, NPC-Grundlagen, Legacy-Schutz (4.3.0-c.6.6.33)

Basis: Build `4.3.0-c.6.6.32`, Commit `1f38bd1`. Erster Teil von Patch 9 (Organic Character Growth). Organische Skills, Passives, PP-Fortschritt, Evolution und dynamische NPC-Skills gehören zu 9B bis 9D und sind hier **nicht** umgesetzt.

Engine/Content und Runner sind getrennte Commits.

## 1. Regelstand pro Kampagne

| Was | Wie | Ort |
|---|---|---|
| Regelstand festhalten | `campaign.started` trägt `ruleset` (neue Kampagne: 2). Fehlt das Feld, gilt 1 (Legacy), für immer. Der Regelstand hängt nie an der installierten Content-Version | `engine.js startCampaign`, `state.js`, `content.js rulesetOf` |
| Definition | `content/campaign_start.json rulesets`: 1 = Warrior, Mage, Guardian, Duelist, Ranger, ohne Waffenangriffe; 2 = Warrior, Mage, Rogue, mit Waffenangriffen | `content.js rulesetDef`, `startClasses` |
| Texte | Regeltexte können für einen Regelstand ersetzt werden (`ruleset`, `replaces`). Regelstand 2 ersetzt `core.4`, `content.6`, `content.10`, `system.5`; Legacy liest die alten Texte | `content.js rulesTextFor`, `context.js ruleParagraphs` |

## 2. Charaktererstellung

- **Klassenwahl.** Neue Kampagnen bieten nur Warrior (STR/VIT), Mage (INT/WIL) und Rogue (AGI/PER) an. Guardian, Duelist und Ranger erscheinen nicht im Menü. Bei direkter Eingabe lehnt die Engine mit „… is not a starting Base Class of this campaign (choose Warrior, Mage, Rogue)“ ab. Legacy-Kampagnen behalten ihre fünf Klassen; Rogue ist dort keine Startklasse (`creation.js selectClass`, `intent.js`, `commands.js creationPanel`).
- **Unverändert:**
  - genau zwei verschiedene Skills aus dem Sechser-Pool, Basic Attack automatisch, alles auf P1/PP0;
  - das Kit erst nach Schritt 2;
  - kein Zeitfortschritt, keine Erzählung, keine Starter-Passives;
  - Startressourcen nach den bestehenden Regeln.
- **Warrior und Mage:** Pools und Formeln unverändert. **Blink unverändert:** 8 MP, ein Range Band, Hauptaktion.
- **Rogue** (`content/classes.json`, F-Rang C1 nach `content.6`). Alle Werte AGI-skaliert; PER hat keine Schadensformel:

| Skill | Rolle | Basis | Skalierung | Kosten | Wirkung |
|---|---|---|---|---|---|
| Basic Attack | automatisch | 4 | AGI ×1.25 | 5 STA | ENGAGED |
| Razor Cut | schneller, verlässlicher Angriff | 6 | AGI ×1.50 | 5 STA | ENGAGED |
| Piercing Thrust | stärkerer gezielter Angriff | 11 | AGI ×1.75 | 9 STA | ignoriert Partial Cover |
| Long Lunge | Angriff mit erweitertem Band | 8 | AGI ×1.50 | 8 STA | `extra_band` |
| Evasive Step | Ausweichen | – | – | 5 STA | `reposition` 1 Band + 25 % weniger Schaden bis zum eigenen nächsten Zug |
| Feint | taktische Vorbereitung | – | – | 5 STA | `next_attack_buff` +35 % |
| Guarded Cut | Angriff mit Deckung | 6 | AGI ×1.375 | 8 STA | `post_attack_temp_def` +4 |

  Es gibt nur vorhandene Effektarten und keine neue Kampfmechanik. Evasive Step und Feint tragen dieselben Namen wie die Duelist-Skills. Die Engine löst Namen über den bekannten Skill bzw. die eigene Klasse auf, das ist also kein Konflikt.
- **Rogue-Kit** (`content/gear.json`): Starter Dagger [F] ATK 6 (Familie `precision`) und Starter Light Armor [F] DEF 2 / MDEF 3. Die allgemeinen Startgegenstände bleiben.

## 3. Waffenangriffe ohne Klassenbindung

- **Regel.** `classes.json weapon_attacks` gibt jeder Waffenfamilie einen schlichten Angriff:
  - Bogen: **Bow Shot** (AGI ×1.25, MEDIUM, 5 STA, 1 Pfeil);
  - Nahkampf, Präzision, schwere Waffe, Fokus: **Weapon Strike** (STR ×1.25, ENGAGED);
  - unbewaffnet: **Bare-Handed Blow** (STR ×1.0, Basis 3).
- **Wann er greift.** Nur wenn der Basic Attack der Klasse die Familie der gehaltenen Waffe nicht nutzt (`weapon_families` des Basic Attacks). Beispiele: Mage oder Warrior mit Bogen → Bow Shot; Mage mit Schwert → Weapon Strike; Warrior mit Dolch → nichts Zusätzliches.
- **Kein gelernter Skill.** Der Angriff steht nicht in `sheet.skills`, kommt und geht mit der Waffe, hat keine eigene Proficiency und schaltet keine Ranger-Technik frei. Die Klasse bleibt unverändert (`derived.js weaponAttackOf`, `actionsOf`).
- **Überall derselbe Aktionsumfang:** Kampf-Snapshot (`combat.js characterCombatant`), Weltnutzung (`engine.js worldUse`), Parser (`intent.js`), Planner (`planContext`, `mapPlan`), `#skills`/`#skill`, HUD, Charakterzeile.
- **Auswahl beim Angriff.** Ein Angriff ohne Skill wird zum Waffenangriff, wenn der Satz die Waffe nennt („I shoot the wolf“, „with my bow“, Name der Waffe); sonst bleibt es der Basic Attack der Klasse (`derived.js weaponAttackNamed`).
- **Pfeile:** Sie werden verbraucht und ins Gepäck zurückgeschrieben. Ohne Pfeile gibt es keinen Schuss, und nichts wird gebucht.
- **Legacy:** Regelstand 1 kennt keine Waffenangriffe. Dort gilt weiterhin `weapon_family_basic` der alten NPC-Vorlagen; der Legacy-Ranger schießt mit seinem eigenen Basic Attack.

## 4. Menschliche NPCs

- **Getrennte Vorlagen.** `content/npc_templates.json ruleset_2` enthält die Vorlagen für Regelstand 2. IDs, Deskriptoren, Labels und Temperamente sind identisch, sodass eine Person unter beiden Regelständen dieselbe Vorlage bekommt. `templates` bleibt **unverändert** der Legacy-Satz.
- **Klasse und Kampfausbildung sind getrennt** (`npcgen.js rulesetTwoSheet`):
  - **untrained:** kein Starter-Skill. Mit etablierter Klasse kennt die Person deren Basic Attack, sonst nur den schlichten Angriff ihrer Waffe. Ohne Klasse dienen die `stat_basis` der Vorlage als interne Grundlage; sie werden nie als Klasse ausgegeben (`class: null`, `generated.class_basis: 'none'`).
  - **trained:** Basic Attack der Klasse und **genau zwei** Starter-Skills ihres Pools nach Rolle (`starter_roles`: attack / defense / utility).
  - **Auswahl der zwei Skills:** Gleichwertige Kandidaten entscheidet der Kampagnen-Seed zusammen mit der Personen-ID (`npcgen.js chooseStarters`), nicht die Reihenfolge im Pool. Es wird kein Würfel verbraucht.
  - **Festgehalten** wird die Auswahl in `entity.sheet_set`. Ein späteres Treffen baut keinen neuen Bogen.

| Vorlage | Regelstand 2 | Legacy |
|---|---|---|
| commoner | keine Klasse, untrained, Bare-Handed Blow | Warrior ohne Skills |
| laborer | keine Klasse, untrained, Weapon Strike (Handaxt) | Warrior ohne Skills |
| hunter | Rogue (Lore), untrained, Jagdbogen + 12 Pfeile → Rogue Basic Attack + Bow Shot | Ranger mit Handaxt |
| guard | Warrior, trained: Angriff + Verteidigung | Heavy Slash + Guard |
| bandit | Rogue, trained: Angriff + Utility | Duelist, Precision Thrust |
| hedge_mage | Mage, trained: Angriff + Verteidigung | Arcane Bolt |
| adventurer | Klasse: etabliert → Klassenwort → Waffenstil (Bogen: Rogue oder Warrior) → Seed; Kit der Klasse, Bogen und Köcher beim Bogenschützen; zwei Starter-Skills nach Rolle | `FAMILY_CLASS`, `slice(0, 2)` |

- **Etablierte Klasse.** `e.class` (eine der drei Startklassen) gilt als etablierte Klasse; ein Zivilist kann also Warrior sein und trotzdem untrainiert. Im Code gibt es noch keinen Schreiber dafür; das typisierte Feld ist Teil von 9C.
- **Level:** wie bisher von der Engine (etabliertes Level, sonst Vorgabe der Vorlage), nie als Zahl aus der Erzählung.
- **Ausgeschlossen:** keine LLM-Aufrufe, keine höheren Skills, keine Passives.
- **Legacy:** In einer Legacy-Kampagne baut `materialise` exakt wie vorher, auch für Personen, die erst nach dem Update kämpfen (`engine.js materialise`, `rulesetTwoPerson`).

## 5. Texte und Anzeige

- **`#class`:** In Regelstand 2 gibt es keinen „Next known evolution milestone“. Stattdessen: „Class evolution: not tied to any Level …“, „Passives: none“. Legacy zeigt das alte Panel.
- **Regeltexte (Regelstand 2):**
  - keine Klassen-Evolution an Level 15/30/45/60/75/90, organische Klassenentwicklung noch nicht freigeschaltet;
  - Affinity für drei Klassen;
  - die Starter-Pools sind die einzigen vorgefertigten Skills;
  - jede Klasse darf jede Waffe nutzen.
- **Power-Rang:** F bis S und ihre Levelgrenzen sind unverändert.
- **Lorebook v0.14** (Weltwissen des Erzählers):
  - Eintrag „POWER — Class framework“ nennt die drei Startklassen; ältere Kampagnen behalten ihre fünf.
  - Eintrag „Class Evolution generation body“ sagt, dass bei den drei Startklassen keine Evolution an ein Level gebunden ist; die Meilensteine gelten nur für ältere Kampagnen.
  - Im SillyTavern-Profil muss das Lorebook neu importiert werden, damit der Erzähler die neuen Texte sieht. Die Engine-Anzeigen hängen nicht davon ab.
- **Combat-HUD** (`hud.js combatHud`):
  - statt „Attack reach“ drei Zeilen: **Attack** (Name, Reichweite, Kosten), **Defense** und **Utility** (Name, Kosten, kurze Wirkung, z. B. „Blink (8 MP, move 1 band)“);
  - eine Aktion, die gerade nicht bezahlbar ist, bleibt sichtbar und wird mit „not enough MP/STA/arrows“ abgeschwächt markiert;
  - Daten nur aus dem Kampf-Snapshot; CSS in `style.css` mit drei kompakten Regeln.

## 6. Tests

`tests/v4/patch9a.test.js` (16):

| Bereich | Prüft |
|---|---|
| A | Warrior, Mage (Flame Lance + Blink), Rogue: zwei aus sechs, genau ein Basic Attack, Kit, Werte, volle Ressourcen, kein Passive. Ablehnung von drittem Skill, doppeltem Skill und fremdem Pool. Guardian/Duelist/Ranger abgelehnt, Menü mit drei Klassen. Keine Zeit, keine Welt vor dem Abschluss. Legacy: fünf Klassen, Ranger mit 20 Pfeilen |
| B | Razor Cut (Rohwert), Long Lunge über das Zusatzband, Evasive Step (25 %), Feint. Kosten gebucht; Unbekanntes und Unbezahlbares ohne Kosten und ohne Wurf abgelehnt. `#skills`/`#skill` |
| C | Warrior, Mage und Rogue mit Bogen: Bow Shot, Pfeil verbraucht, ohne Pfeile kein Schuss, Klasse bleibt, keine Ranger-Technik. Mage mit Schwert, Warrior mit Dolch. „I shoot the wolf“ über den echten Zug mit Rückschreiben, „I attack“ bleibt der Basic Attack. Planner-Pfad: shoot → Bow Shot, slash → Basic Attack. Legacy ohne Waffenangriffe, Ranger schießt wie bisher |
| D | Wache, Bandit (Rogue), Hedge Mage: zwei Skills nach Rolle; Jäger: Rogue, untrained, Bogen + Pfeile; Bogenschütze: keine Legacy-Klasse; Bauer und Holzfäller ohne Klasse und ohne Skills; Schmied mit Lore-Klasse Warrior und untrained. Gleicher Bogen im Replay; kein Neubau beim zweiten Treffen; gleiche Aktionen im Kampf. Auswahl hängt vom Seed ab, nicht von der Pool-Reihenfolge |
| E | Legacy-Kampagne baut NPCs mit den alten Vorlagen, identisch zu `humanSheet`. Aufgezeichnete Kampagnen (`live_1022e`, `live_1021c`, `live_1018_weald`) falten mit Regelstand 1, Erstellung rekonstruiert. Replay ohne doppeltes Kit und doppelte Skills; ein laufender Kampf behält seine Aktionen |
| F | `#class` ohne Meilenstein (Legacy mit Meilenstein); Regeltexte je Regelstand; Power-Ränge unverändert. Combat-HUD mit Attack/Utility, Blink 8 MP und ein Band als Hauptaktion; Guard bei zu wenig STA markiert |

**Testinfrastruktur:**
- `tests/helpers.js loadContent` (die Legacy-Welt der aufgezeichneten Läufe) startet Kampagnen mit Regelstand 1. Die bestehenden Tests sind damit unverändert Legacy-Regressionen.
- `loadProductContent` startet mit Regelstand 2. Die Patch-2- bis Patch-8-Tests auf Produkt-Content laufen ohne Änderung grün.
- Angepasst wurden nur: das Schema (neue Felder), die Liste der Skills, die Partial Cover ignorieren (+ `rogue.piercing_thrust`), und der HUD-Test (Zeile „Attack“ statt „Attack reach“).

**Ergebnis:** `npm test` 1090/1090 mit dem Engine-Commit (vorher 1074), 1092/1092 mit dem Runner-Commit.

## 7. Runner (eigener Commit)

- **Leitfäden:** Sie bleiben unverändert. Der Mage mit Flame Lance + Blink ist bei zwei freien Mage-Skills weiter gültig. Alte Fixtures bleiben nutzbar, weil sie ohne `ruleset` als Legacy falten.
- **Bericht:** Die Kurzfassung nennt den Charakter und den Regelstand der Kampagne („Regelstand 2 (Warrior, Mage, Rogue)“ bzw. „Regelstand 1 (Legacy, fünf Klassen)“), gelesen aus `campaign.started` (`evaluator.mjs character`, `report.mjs`).
- **Begrüßungstexte:** Die Ersatz-Begrüßung und die Begrüßungen der Smoke-Werkzeuge nennen die drei Klassen. Die Begrüßung deiner SillyTavern-Karte liegt in deinem Profil und wurde nicht geändert. Nennt sie noch fünf Klassen, korrigiert das Erstellungs-Panel der Engine eine Wahl wie „Ranger“ mit einer klaren Ablehnung; die Karte solltest du bei Gelegenheit selbst anpassen.
- **Keine Änderung** an Provider, Reasoning, API oder Modell; keine neue Runner-Architektur.
- **Tests:** `tests/live_runner/patch9a_runner.test.js` (2). Der Stub-Selbsttest (SillyTavern 1.19.0) hat 48/48 Prüfungen, neu `newRulesetMage`.

## 8. Bewusste Grenzen und Schnittstellen für 9B

- **NPC-KI:** Sie wählt weiterhin den stärksten erreichbaren Angriff (`combat.js npcAttackSkill`). Defensive Skills von NPCs stehen im Bogen, werden aber nicht eingesetzt; die kleine Defensivlogik ist für 9B vorgesehen.
- **Basic Attack bleibt verfügbar.** Der Basic Attack der Klasse bleibt auch neben einem Waffenangriff verfügbar, z. B. ein Warrior mit Bogen hat weiter seinen Nahkampf-Basic-Attack. Eine Entfernung wäre eine Verhaltensänderung für bestehende Spielweisen.
- **Erwerb von Waffen:** Die Engine gibt keinen Bogen aus; er kommt über Kauf, Beute oder Erzählung wie bisher.
- **Erzählwissen:** Das SillyTavern-Profil (Karte, Begrüßung) liegt beim Nutzer. Das Klassenmenü kommt von der Engine; die Begrüßungstexte der Runner-Werkzeuge sind im Runner-Commit angepasst.
- **Für 9B:**
  - `derived.js actionsOf(sheet, content, ruleset)` ist die eine Stelle, an der ein Charakter seine Aktionen bekommt: Kampf, Planner, Parser, Befehle. Dynamische Skill-Definitionen der Kampagne können dort eingehängt werden, statt in `content.skills`.
  - `content.js rulesetOf`/`rulesetDef` trennen Kampagnenregeln.
  - NPC-Bögen tragen `training`, `generated.starters`, `generated.class_basis`; ein dynamischer Skill und ein Passive können als weitere Felder desselben `entity.sheet_set` folgen.
  - `npcgen.js starterRoles` ist die Rollenzuordnung, die eine NPC-Defensivlogik nutzen kann.
