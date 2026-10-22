# Patch 9B-2: Dynamische Passives, Heil- und Ressourceneffekte, NPC-Verteidigung (4.3.0-c.6.6.38)

Abschluss von Patch 9B auf der Basis von 9B-1 (`docs/PATCH9B1_DYNAMIC_SKILLS_PROFICIENCY.md`). Alles Neue gilt nur unter Regelstand 2.

Nicht Teil von 9B-2: Erwerbslogik (Lehrer, Skill Stones, Training, organisches Lernen), automatische Passives, Evolution, Debuffs, DOTs, Conditions und Balancing.

## 1. Dynamische Passives (`src/passives.js`)

**Definition und Besitz sind getrennt**

| Schritt | Umsetzung |
|---|---|
| Definieren | `definePassive(state, content, def)` liefert das Event `passive.defined`, gespeichert in `state.passive_defs`. Nach dem Buchen fest (Reducer: `passive defined twice`). |
| Besitzen | `gainPassive(state, content, who, id)` liefert `passive.gained`. Das ist der gesonderte, autorisierte Schritt; erst danach wirkt die Passive. |
| Speicherung | Der Reducer kopiert die feste Definition (`scope`, `condition`, `effects`) in `sheet.passives[id]`. Abgeleitete Werte lesen so nur das Sheet; Snapshot, Reload und Replay rechnen dieselben Zahlen. Die Validierung prüft, dass die Kopie der Definition gleicht. |
| Eigentum | `passive.defined` gehört zur Art `skills` (nur Engine), `passive.gained` zu `pc.progress` bzw. `entities`. Kein Extractor-Delta darf sie schreiben (Test). |

In 9B-2 vergibt keine Spielmechanik eine Passive. Es gibt weder Starter-Passives noch organischen Erwerb; das folgt in 9C.

**Datenmodell**
- Felder: `id` (`dyn.passive_…`), `name`, `description`, `origin`, `rank` (nur F), `scope` (`always` | `combat`), optional `condition`, `effects` (1–2).
- Geschlossen validiert (`passiveDefErrors`): Unbekannte Felder, Arten und Werte werden abgelehnt.

**Effektarten, Grenzen und Stacking** (`rules.json passive_design`)

| Effekt | Scope | Pro Passive | Summe aller Passives |
|---|---|---|---|
| `stat_bonus` ATK/MATK/DEF/MDEF | always, combat | 1–2 | je Wert höchstens 4 |
| `max_bonus` hp/mp/sta | always | 1–10 | je Wert höchstens 20 |
| `cost_reduction` sta/mp, optional nur für einen Disziplin-Tag | always | 1–10 % | höchstens 20 % je Skill |
| `resist` physical/magical | always, combat | 1–10 % | höchstens 20 % je Schadensart |

Gleiche Boni verschiedener Passives addieren sich bis zur Summengrenze. Innerhalb einer Passive kommt jeder Bonus nur einmal vor.

**Bedingungen** (nur mit `scope: combat`, geprüft im Moment der Ausführung)
- `hp_at_most_pct` (25–50): eigene HP höchstens bei diesem Anteil.
- `foe_engaged`: ein aktiver Gegner steht ENGAGED.

Bedingte Effekte sind nur `stat_bonus` und `resist`. Maximalwerte und Kosten ändern sich nie mitten im Kampf.

**Anwendung**
- **Dauerhaft (`always`):** `derived.js deriveCharacter` ist der eine Rechenweg. Er addiert `sheet.bonuses` (unverändert, ohne Schreiber) und die Passive-Summen auf ATK/MATK/DEF/MDEF und Max HP/MP/STA. Der Kampfsnapshot übernimmt die Werte daraus, also genau einmal. Ein höheres Maximum füllt nichts auf; die aktuellen HP, MP und STA bleiben.
- **Kosten:** Eine Funktion für alle Stellen (`passives.js skillCostAmount`): Grundkosten × Proficiency-Faktor × (1 − Reduktion), **einmal** gerundet. Ohne Reduktion exakt wie vorher. Sie gilt in Kampf, World-Use, Schadensvorschau, HUD und `#skills`/`#skill`.
  - Beispiel: Guarded Cut (8 STA) auf P4 mit 10 % ergibt 6,66, also 7. Getrennt gerundet wären es 6.
- **Resistenzen:** Ein Final-Damage-Modifikator in `resolveStrike`, nach Deckung und Schutzeffekten und vor der einen Rundung. Er erscheint als eigener Schritt.
- **Bedingte Boni:** `combat.js passiveNow` prüft die Bedingung am Kampfstand. DEF/MDEF zählen bei der Verteidigung, ATK/MATK bei der Angriffsberechnung (`record.passive` nennt die Passive). Die Grenze gilt zusammen mit den dauerhaften Boni.
- Der Snapshot hat `fixed.passive` nur, wenn die Person Passives besitzt. Snapshots ohne Passives und alte Encounter bleiben unverändert.

**Anzeige**
- `#class`: eine Zeile pro Passive mit Wirkung und Bedingung, sonst „Passives: none“.
- `#status`: die Namen; die Zahlen enthalten die dauerhaften Boni.
- Narrator-Kontext: eine Zeile „Passives“.

## 2. Heilung und Ressourcen-Wiederherstellung (`src/skills.js`)

**Neue Effektarten des Skill-Validators** (Selbstanwendung, nie auf einem Angriff, und als einziger Effekt des Skills)

| Effekt | Aufbau | Grenzen |
|---|---|---|
| `heal` | Basis + Stat (VIT, WIL, INT) × Koeffizient | C1 ≤ 8 + ×1, C2 ≤ 12 + ×1,5, C3 ≤ 16 + ×2 (unter einer Barrier gleicher Complexity) |
| `restore` | MP oder STA, fester Betrag | nur die **andere** Ressource als die Kosten, höchstens die Kosten |

**Ausführung** (`restoration`, dieselbe Regel im Kampf über `skillAction` für PC und NPC und außerhalb über `engine.js selfRestore`)
1. Prüfen: Skill bekannt, Kosten bezahlbar, etwas wiederherzustellen. Bei vollem Wert wird die Aktion **vor** jeder Buchung abgelehnt.
2. Kosten buchen.
3. Wiederherstellen, höchstens bis zum Maximum.

**Rechenregeln**
- Heilung ist ein numerischer Haupteffekt; unter Regelstand 2 wächst sie mit der Proficiency (P3–P5).
- Restore wächst nicht und gibt nie mehr als die tatsächlich bezahlten Kosten zurück (auch bei Kostenreduktion). Die Summe aus MP und STA kann so durch Umwandeln nie steigen, also gibt es keinen Ressourcenzyklus (Test mit zwei gegenläufigen Skills).
- Erzähltext heilt nichts: Vitals gehören der Engine.

**PP-Erweiterung** (der 9B-1-Regel „Utility: nachweisbare taktische Wirkung“ folgend): Ein Heal oder Restore, der etwas zurückgegeben hat, zählt als sinnvolle Nutzung.

**Nebenbei korrigiert:** Ein numerischer Effektwert ist immer ganzzahlig (kaufmännisch gerundet). Vorher ergab Arcane Ward bei ungeradem WIL eine Barrier von z. B. 13,5 HP und damit gebrochene HP. Das ist sichtbar geworden, als NPC-Magier mit WIL 5 Arcane Ward nutzten. Die Korrektur gilt in **beiden** Regelständen, weil gebrochene HP ungültig sind. Bei ganzzahligen Werten ändert sich nichts.

## 3. NPC-Verteidigung (`combat.js npcTactic`)

**Rahmen**
- Nur unter Regelstand 2, nur für NPCs mit Charakterbogen, und nur wenn die bisherige Entscheidung ohnehin ein Angriff ist.
- Flucht, Deckung, Halten, Kapitulation, Feindseligkeit und Beitritt entscheiden sich wie zuvor (`npcDecide` unverändert).
- Deterministisch aus dem Kampfsnapshot, kein LLM-Aufruf.
- Die Aktion läuft über `skillAction`, mit demselben Resolver und denselben Kosten wie beim Spieler. Ist sie nicht ausführbar, greift der NPC wie bisher an.

**Verteidigung** (Guard, Deflect, Arcane Ward, Focused Ward, Evasive Step) wird gewählt, wenn alles zutrifft:
- **Konkrete Bedrohung:** seit dem eigenen letzten Zug von einem noch aktiven Gegner getroffen;
- HP höchstens 75 %;
- kein eigener Schutz aktiv;
- der Skill passt zur Schadensart des letzten Treffers: ein DEF-Bonus gegen physischen, ein MDEF-Bonus gegen magischen Schaden, Barrier und Schadensminderung gegen beides;
- bezahlbar.

**Feint**, wenn alles zutrifft:
- nicht getroffen;
- der NPC und sein bester Angriff sind ENGAGED;
- Feint und danach dieser Angriff sind bezahlbar;
- die Verteidigung des Gegners beträgt mindestens 65 % der Rohkraft des Angriffs. Dann bringen Feint plus ein Schlag mehr als zwei Schläge.

**Keine Schleifen**
- Nie zwei solche Aktionen hintereinander.
- Höchstens drei pro Kampf.
- Dazwischen greift der NPC an, bewegt sich oder flieht nach den bisherigen Regeln.

## 4. Grenzen für 9C

- Kein Erwerbspfad für Passives und dynamische Skills (Lehrer, Skill Stones, Training, organisches Lernen). `definePassive`/`gainPassive` und `defineSkill`/`learnSkill` sind die geprüften Schnittstellen.
- Nur F-Rang. Bedingungen nur `hp_at_most_pct` und `foe_engaged`.
- Keine Passives mit aktiven Effekten (Regeneration, Reaktionen), keine Debuffs, DOTs oder Status-Resistenzen.
- Heilung nur auf sich selbst, kein Verbündeter als Ziel. Restore nur MP ↔ STA.
- NPCs nutzen nur Verteidigungs-Skills und Feint. Heal, Restore und Blink setzen sie nicht ein. Die Schwellen (75 % HP, 65 % Verteidigung, drei pro Kampf) sind bewusst einfach; das Balancing folgt später.

## 5. Tests

`tests/v4/patch9b2.test.js` (13): A Registry, Replay, Ownership und ungültige Definitionen (24 Fälle); B Boni, Maxima ohne Auffüllen, kein doppelter Bonus (Reload, drei Snapshots), Stacking-Grenzen; C Kosten (einmal gerundet, Ressource und Tag, Grenze), Resistenz (Schadensart, einmal), Bedingungen; D Heilung im Kampf und außerhalb, bei vollen HP abgelehnt ohne Kosten, Replay, keine Erzählheilung; E Restore, keine Zyklen, Grenze durch bezahlte Kosten; F Warrior, Mage und Rogue verteidigen sich im ganzen Kampf, die einzelnen Entscheidungsregeln, Feint; G keine Schleifen, Angriff und Flucht wie zuvor; H Legacy; H (fix) ganzzahlige Barrier; I Gesamtsystem.
