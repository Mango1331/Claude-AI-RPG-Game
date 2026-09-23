# Migration: vom Paket v1.24 zur Avereth Engine v2

## Grundsatz

Alle Inhalte wurden übernommen; ersetzt wurde nur die Technik.

| Quelle (Paket v1.24) | Neu | Wie |
|---|---|---|
| Core v1.21 (`RPG_Core_Mechanics_v1.20_PERFEKTIONIERT.json`, 30 Einträge) | `content/rules_text.json` (wörtlich) + `content/rules.json` (Zahlkonstanten) + Engine-Code | Texte byte-identisch; jede Konstante per Test gegen ihren Core-Satz geprüft |
| System v1.12 (15 Einträge) | `content/rules_text.json` (wörtlich) + `src/commands.js` | Befehle als Code; Texte als Referenz |
| Content v1.13 (12 Einträge) | `content/classes.json`, `monsters.json`, `gear.json`, Content #6/#10 in `rules_text.json` | alle Aktionsfelder geparst und zurückgerendert (Vergleich im Migrationsskript); 15 Anker Zahl für Zahl geprüft |
| Lore v0.8 (19 Einträge) | `content/lore.json` | Texte byte-identisch, dazu kuratierte Schlüssel und Realms |
| First Message v0.4 | unverändert als Begrüßung der Charakterkarte; `content/campaign_start.json` | Die Engine liest die Startstadt aus der Zeile `Location: … outside <City>, <Realm>` |
| Character Description v2.3 | `content/narrator/Avereth_Narrator_Contract_v3.txt` | Verhaltensregeln unverändert; ENGINE AUTHORITY neu; Mechanik-Sätze verweisen auf die Engine |
| WorldInfo v1.23 (61 Einträge) | nicht mehr nötig, siehe Tabelle unten | Engine-Code plus Retrieval |
| Megumin-NPC-Patch v1.3 | ersetzt durch NPC-Karten der Engine | bleibt im Legacy-Modus gültig |

**Reproduzierbarkeit:** `python3 avereth-engine/tools/migrate_content.py` (aus dem Repo-Wurzelverzeichnis; Quelle über `AVERETH_V124_DIR`) erzeugt `classes`, `monsters`, `gear`, `lore` und `rules_text` byte-identisch neu. Das ist geprüft: zweiter Lauf, `diff` ohne Unterschied. Die übrigen Content-Dateien sind handgeschrieben mit Quellenangaben (`src`, `_source`) und werden von `tests/unit/content.test.js` gegen Schemas, Querverweise und den wörtlichen Core-Text geprüft.

## WorldInfo v1.23 → neuer Ort

| WI-Einträge | Thema | Neuer Ort |
|---|---|---|
| #0 | Critical Mechanics Kernel | `src/derived.js`, `combat.js`, `rng.js`; Autorität und Agency im Contract (ENGINE AUTHORITY, PLAYER OWNERSHIP); Setting-Zeile im Engine-Header |
| #1, #55, #2 | START, PENDING, ACTIVE | `src/combat.js` (`initEncounter`, `runCombat`, `endEncounterEvents`), `src/engine.js` (`combatTurn`, `pending_combat`) |
| #3 | Multi-Hit, AoE, Cover, Ambush | `combat.js` (`attackAction`, `resolveSharedAoe`, Ambush in `initEncounter`) |
| #4, #6 | Status, Barrieren | `combat.js`-Effekte (temp_def, barrier, …); Core #13/#15 wörtlich in `rules_text.json` |
| #5 | Verletzung, Heilung | Tod bei 0 HP und keine Regeneration im Kampf (Engine); Erholung über den Report-Schlüssel `recover`; Core #14 wörtlich |
| #7, #8, #9 | Elemente, Appraisal, Domain | `rules_text.json` (core.16/17/19), abrufbar über `#system` |
| #10, #11 | Checks, Stealth | `src/checks.js`, CHECK DIE (`engine.js`), Core #7/#8 |
| #12 | Level, XP | `src/progression.js` |
| #13 | Loot | Kurzregel im RESOLVED-Block; Core #20 situativ beim Kampfende |
| #14 | Ökonomie | `src/economy.js`, Report-Schlüssel `coin`; Core #22 situativ bei Handel |
| #15, #16, #28, #24 | Klassen-/Skill-Evolution, Erwerb | `rules_text.json` (core.4/5, content.10/6) |
| #17, #27 | Gear-Werte, Referenzen | `derived.js`, `gear.json` |
| #18–#23 | Basisklassen | `classes.json` |
| #25, #26 | Monster, Elite/Boss | `monsters.json`, `src/npcgen.js` |
| #29 | Starter-Kits | `gear.json`, `src/creation.js` |
| #30–#44, #57–#60 | Lore, Realms | `lore.json` (Retrieval im Context Builder) |
| #45–#53, #61 | Befehle, Query Guard | `src/commands.js`; `#system` mit Absatz-Retrieval |
| #54 | Charaktererstellung | `src/creation.js`, Labels in `campaign_start.json` |

## Neue, als PROPOSED markierte Inhalte (Bestätigung durch den Autor)

| Inhalt | Datei | Warum |
|---|---|---|
| Menschliche NPC-Vorlagen: commoner, laborer, hunter, guard, bandit, hedge_mage, adventurer | `content/npc_templates.json` | Testrun: Trapper-Profil improvisiert. Abgeleitet aus Lore #1/#3, Content #0/#9, Core #2/#3. Neu gewählt sind nur Standard-Level, Punktverteilung und konkrete Werte innerhalb der F-Rang-Referenzen. |
| Aufmerksamkeit `unaware`/`suspicious`/`aware` als Zustand | Engine | Ambush (Core #24) nur bei echter Ahnungslosigkeit; Testrun: Hinterhalt trotz Verdacht |
| Detection-Default für Kreaturen (Human-Baseline PER 5) | `rules.json → checks.creature_detection` | Kreaturen haben kein PER (Core #8 braucht einen Wert) |
| Benannte Schwierigkeiten (easy 3, moderate 6, hard 10, very_hard 15) | `rules.json → checks.difficulty_scores` | Hilfsskala; Core #7 verlangt nur einen festen Wert |
| NPC-Verhalten nach Temperament; „nicht feindlich, weder verletzt noch angegriffen → Deckung“; ein Angriff hebt erzählte passive Absichten auf (Testrun 2) | `combat.js → npcDecide` | Core #27 NPC DECISION LOCK braucht eine Entscheidungsregel |
| CHECK DIE: ein vorab gezogener W100 pro Erzählzug | `engine.js` | Core #7/#9: echter Wurf ohne zweiten LLM-Aufruf |
| Report-Schlüssel `recover` (Ruhe/Heilung außerhalb des Kampfs) | `delta.js`, `narrator.json` | Core #14 überlässt die Menge dem Narrator; ohne Schlüssel gäbe es keine Erholung |
| Quest-XP gesperrt beim Angebot | `delta.js` | Core #25 Quest-XP; verhindert nachträgliches Aufblähen |
| Basic Attack nach Waffenfamilie, wenn die Waffe nicht zur Klasse passt (Ranger-Trapper mit Handaxt → Warrior Basic Attack) | `npcgen.js`, `npc_templates.json → weapon_family_basic` | Avereth bindet Skills nicht absolut an Klassen; ohne Regel hätte ein NPC mit „fremder“ Waffe keinen Angriff |
| Klasse eines Abenteurer-NPCs aus genannter Waffe oder Klassenwort („archer“/„bowman“ = Ranger); Köcher-Inhalt aus dem Starter-Kit | `engine.js → materialise`, `npc_templates.json` | Ohne Ableitung war jeder Abenteurer Warrior; NPC-Pfeile sind endlich wie Alarics |
| Spieler-Hoheit über freiwillige PC-Änderungen im Report (`authorization`, `taken_by`, `forced_by`) | `intent.js`, `delta.js` | setzt den CD-Abschnitt PLAYER OWNERSHIP als Validierung um (externe Review) |
| Wiederbelebung nur über eine explizite Mechanik | `delta.js` | Core #14 kennt keine Wiederbelebung per Erzählung |

## Bestehende Kampagnen

Eine Kampagne, die ohne Engine gespielt wurde, lässt sich nicht automatisch in mechanischen Zustand übersetzen: Der Zustand stand nur als Text in Tracker-Blöcken. Die Extension erkennt solche Chats und lässt sie unberührt (Hinweis „played without the engine“). Für die Engine eine **neue** Chat-Session starten.

Das Paket v1.24 (WorldInfo v1.23 + CD v2.3) bleibt als **Legacy-Modus ohne Engine** unverändert nutzbar.

## Umstieg in SillyTavern

Kurzfassung; Details im [README](../README.md).

1. Den Ordner `avereth-engine/` als Third-Party-Extension installieren (Ordnername beliebig).
2. In der Charakterkarte die Beschreibung durch `content/narrator/Avereth_Narrator_Contract_v3.txt` ersetzen. Die Begrüßung bleibt die First Message v0.4.
3. Die Avereth-WorldInfo v1.23 **deaktivieren**. Der Megumin-NPC-Patch ist optional und mit Engine nicht nötig.
4. Neuen Chat starten. Die Engine legt die Kampagne an der Begrüßung an. **Empfehlung:** zuerst einen wegwerfbaren Testchat spielen (Report-Format, Streaming, Swipes mit dem eigenen Modell prüfen), erst danach die Langzeitkampagne.
