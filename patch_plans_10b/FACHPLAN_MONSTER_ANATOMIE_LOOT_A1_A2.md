# Avereth – Fachplan Monsterkörper und Beute (A1/A2)

**12.11.2026 · Opus 5.5 · technischer Fachplan, nur lesende Codeprüfung. Keine Tests, keine Simulation, keine Implementierung, keine Produkt- oder Kanonänderung.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD `59f868e` (Build `.179`). `main` vor diesem Dokument: `3c9cb0e`. Zeilenangaben beziehen sich auf `59f868e` in `avereth-engine/`.

**Grundlage:**
- [Monsterdesign-Analyse](../recherche/MONSTERDESIGN_ANALYSE_20261028.md), Paket A und GPT-Gegenreview §10.
- [Roadmap 07](../07_ROADMAP_NACH_10B_ENTWURF.md), Kandidat K2.
- [Kanon 02](../02_DESIGN_KANON.md) §4 (automatisches Loot nach echtem Sieg) und §5.

**Nachweisgrade:**
- **[C]** am Code gelesen.
- **[D]** aus Originalarchiven gezählt: Pilot 01 (`.174`), Batch 28 (`.154`), User04 (`.159`).
- **[Ü]** aus der Monsteranalyse übernommen.
- **[P]** abgeleitet.

**Leitgedanke:** Beute braucht gedeckte Anatomie oder vorher festgelegten Besitz. Eine Waffe muss im Kampf nicht benutzt worden sein, um existiert zu haben. Rückwirkend erfundene Ausrüstung gibt es nicht.

**Ausdrücklich nicht Teil:** Sapienz (C1), Populationen (C3), Monsterfähigkeiten und Bossphasen (B), Main/Minor, Balance- und XP-Änderungen, Inventar für Monster. A3 (Artkonsistenz) und A4 (Contenttexte) nur, wo A1/A2 sie brauchen.

---

## 0. Ergebnis in Kürze

| | Empfehlung | Urteil |
|---|---|---|
| **A1** | Bedingungen (`only_if`) für alle Spezialorgane, neues Material Horn, sauberer Belegtext ohne Ankerangriff und ohne 40-Zeichen-Kürzung, zwei Aliase | **GO** |
| **A2** | **Ausrüstung im Kampfprofil:** beim ersten Materialisieren einmalig bestimmt. Grundlage ist eine kleine Standardausstattung je humanoidem Anker oder eine bei der Erzeugung gemeldete Ausnahme. Daraus folgen Angriffsname **und** Beute. Ob die Waffe nach dem Tod verwertbar ist, entscheidet ein deterministischer Wurf, nicht ob sie existierte | **eingeschränktes GO** (Entscheidungen D1–D5) |
| Waffe erst beim Tod aus der Beschreibung lesen | | **NO-GO** |
| Kreaturen mit Personenblatt; Lootquote ohne Angriffsbezug | | **NO-GO** |

**Zwei neue Codebefunde gegenüber der Monsteranalyse:**
1. **Die Anatomieprüfung wird durch den Angriffsnamen ausgehebelt.**
   - `loot.js:72` nimmt den Ankerangriff in den Belegtext auf.
   - Der Anker `arthropod` greift mit „Bite/Sting“ an, das Giftmuster enthält `sting\w*`. **Jedes Gliedertier**, auch ein Käfer, kann deshalb eine Giftdrüse liefern.
   - Beim Anker `deer` („Kick/Antler“) würde dasselbe jede künftige Geweihbedingung aushebeln.
2. **Beschreibungen werden auf 40 Zeichen gekürzt** (`delta.js:385`), `traits` bleibt bei Kreaturen leer. Ein „antlered“ oder „tusked“ jenseits von 40 Zeichen geht verloren (Pilot: „small grey-green goblins around a cold f…“).

---

## 1. Bestätigte Ursachen im Code

### 1.1 Der Weg einer Kreatur [C]

| Station | Stelle | Was festgelegt wird |
|---|---|---|
| `creature.new` | `content/deltas.json` | `species`, `anchor`, `desc[]`, `count`, `stronger`, `threat`, `population`, `life_stage`. **Kein Feld `armed`** (anders als `person.new`) |
| Ankerkorrektur | `world.js:668–678`, `content.js:217` (`speciesAnchor`) | Ein Alias im Artnamen korrigiert den Anker; eine Population hat Vorrang |
| Entität | `delta.js:385–389` | `descriptors` = Beschreibungen und Ref, **je auf 40 Zeichen gekürzt**; `traits: ''` |
| Dungeon-Slot | `world.js:903`, `living.js:328–338` | Slot, Ebene, Rolle (minion/guard/boss), Level |
| Materialisierung | `world.js:906` → `engine.js:371–406` | **einmalig:** `profile = scaleCreature(...)` (`npcgen.js:11–46`) mit `attack: {name: anchor.attack, damage_type, range}` (`:43`); gespeichert im Event `entity.updated` (`engine.js:405`) |
| Kampf | `combat.js:76–88` (`creatureCombatant`), `:585–594` | Reichweite und Schadensart aus `profile.attack`; `record.skill_name = attack.name` (`:591`) |
| Erzähler | `context.js:276`, `:290` (`recordLine`), `:247` (`combatBlock`) | Der Angriffsname steht in jeder Kampfzeile („Goblin Scout A: Natural/unarmed strike …“). Der Kampfblock nennt Körperplan, HP und Band, keine Waffe |
| Tod und Beute | `loot.js:40–138` | Materialien je Anker (`monsters.json` `loot.anchors`), Spezialorgane nur bei `only_if` (`:72–74`); humanoide Anker: `gear` **mit Zufallsquote** (`:78–84`) |

### 1.2 Anatomie (A1) [C][D]

| Befund | Stelle | Folge |
|---|---|---|
| `deer.antler` ohne `only_if` | `monsters.json` `loot.anchors.deer` | Hirschkuh, Reh, Ziege (Aliase von `deer`) und jedes andere `deer`-Wesen liefern 0–2 Geweihe; historisch „Goat/Doe Antler“ [Ü] |
| Kein Material Horn | – | Ziege, Rind und Widder haben keinen passenden Ertrag |
| `ogre.tusk` ohne `only_if` | `loot.anchors.ogre` | jeder Oger und jeder Troll (Alias) liefert Hauer |
| `slime.core` ohne `only_if` | `loot.anchors.slime` | jeder Schleim kann einen Kern liefern (Designfrage, D6) |
| **Ankerangriff im Belegtext** | `loot.js:72` (`prof.attack?.name`) | `arthropod` „Bite/Sting“ erfüllt das Giftmuster `sting\w*` immer: Käfer und Ameise liefern Giftdrüsen. Ein Geweihmuster würde durch „Kick/Antler“ stets erfüllt |
| **40-Zeichen-Kürzung** | `delta.js:385` | Belegwörter hinten in der Beschreibung fehlen; `traits` ist leer |
| `hare`/`rabbit` ohne Alias | `monsters.json` `anchors` | Der Extractor wählt einen Anker, historisch `deer`; der Hase läuft dann auf Hirschwerte und Hirschbeute [Ü] |
| Benennung | `loot.js:27–30` (`speciesName`: letzte drei Wörter) | Pilot: Art „feral dog of the millpond“ ergibt „F-Rank **Of The Millpond** Fang“ [D] |

**Was heute schon trägt:**
- `only_if` für Gift bei Schlangen (Pilot und Batch 28: „Marsh Serpent“ ohne Giftsack, „Viper“ mit Bedingung) [D].
- Anker als Körperplan.
- Deterministische Würfe je Kampf und Gegner (`hash32`).
- Stapel nach Material und Rang.

### 1.3 Bewaffnung (A2) [C][D]

| Befund | Stelle |
|---|---|
| Humanoide Waffenbeute nach Quote, ohne Bezug zur Erzählung: Goblin „Crude Knife“ 0,5; Oger „Club“ 0,7; Schamane „Fetish“ 0,4 | `loot.js:78–84`, `loot.anchors.goblin/ogre/goblin_shaman.gear` |
| Kampf immer mit Ankerangriff: Goblin „Natural/unarmed strike“, Oger „Slam“ | `npcgen.js:43` |
| Die Ankernotiz „authored Gear may replace/modify the attack“ hat keinen Code | `monsters.json` `anchors.goblin.notes` |
| `creature.new` kennt kein `armed` | `content/deltas.json` |
| **Vorbild existiert:** Personen tragen `armed` → Fakt (`world.js:2171–2174`) → `heldWeapon` (`engine.js:500–512`, Waffenprofil über `itemProfile`) → Bogenwaffe im Kampf → Beute aus `sheet.equipment.weapon` (`loot.js:85–92`) | Patch 9A.1 |
| Waffenwortschatz mit Familien `melee`, `heavy_melee`, `precision`, `bow`, `focus` und **`unarmed`** („fists“, „unarmed“, „bare hands“) | `npc_templates.json` `weapon_words`, `content.js:249–256` |

**Pilotbeispiel [D]:**
- Die Warrens-Goblins (Z60) waren Slotgegner. DUNGEON AHEAD sagte „3 goblin scouts“.
- In der Erzählung „two snatched short spears from where they leaned against the wall“.
- Ihre Beschreibung im Zustand: „small grey-green goblins around a cold f“, ohne Waffe.
- Mechanisch: „Natural/unarmed strike“. Beute wäre ein „Crude Goblin Scout Knife“ mit 50 % gewesen.
- **Besitz, Einsatz und Beute widersprechen sich in einer einzigen Begegnung.**

**Natürliche Häufigkeit [D]:** In den drei jüngsten Läufen wurde kein humanoider Gegner getötet; Phantomwaffen sind dort nicht aufgetreten. Die Lücke ist mit dem Code und historisch belegt [Ü], ihre aktuelle Häufigkeit aber gering.

---

## 2. Lösungsvarianten und Empfehlung

### 2.1 A1 – Anatomie

| Variante | Kern | Vorteile | Nachteile | Urteil |
|---|---|---|---|---|
| **A1-α** | `only_if` für jedes Spezialorgan nach Art- und Merkmalswörtern; Horn als Material; Belegtext ohne Ankerangriff, mit voller Beschreibung; Aliase Hase/Kaninchen → `rat` | keine neue Struktur; dieselbe Mechanik, die bei Gift schon funktioniert; kein Extractoraufwand | wortbasiert; eine Fantasieart ohne passendes Wort bekommt nur den Grundertrag | **GO** |
| A1-β | Extractor meldet `features` aus geschlossenem Vokabular (antlers, horns, venom …) | bessere Trefferquote bei Fantasiearten | neues Vertragsfeld; Modell muss Körperteile melden; Fehler werden dauerhaft | **weitere Daten nötig**: erst wenn A1-α viele Fehlnegative zeigt |
| A1-γ | Artkarte je Kampagne (M-E, Event `species.established`) | eine Quelle für alles Artbezogene | neue Pflichtstruktur; gehört zu A3 und B | **NO-GO** jetzt |

**Drei Arten von Beleg in A1-α:**

| Art | Quelle | Beispiel |
|---|---|---|
| **bekanntes Artmerkmal** | Artwort im `species` | „stag“ → Geweih; „viper“ → Gift; „goat“ → Horn; „spider“ → Gift |
| **individuell bestätigt** | Wort in Beschreibung oder Name dieses Wesens | „antlered doe“, „one-horned goat“, „tusked troll“, „venomous beetle“ |
| **unbekannte Anatomie** | kein Wort | nur der Grundertrag des Ankers (Fell, Haut, Chitin, Schuppe, Knochen, Gel, Essenz), **kein** Spezialorgan |

Wortformen werden ganz geschrieben (`horns?|horned`, `antlers?|antlered`), damit „hornless“ und „antlerless“ nicht treffen.

### 2.2 A2 – Bewaffnung

| Variante | Kern | Vorteile | Nachteile | Urteil |
|---|---|---|---|---|
| A2-A | Waffe beim Tod aus der Beschreibung lesen (`weaponFamily(desc)`) | kein Profilfeld | **rückwirkend**; Beschreibung kann Alarics Schwert oder eine Wandwaffe nennen; durch die 40-Zeichen-Kürzung meist leer (Pilot Z60); Angriff bleibt „unarmed“ | **NO-GO** |
| **A2-B** | **Ausrüstung im Profil:** beim Materialisieren einmalig festgelegt. Gemeldete Ausnahme (`armed`) vor Standardausstattung des Ankers, sonst keine. Angriffsname und Beute lesen dieselbe Angabe; die Verwertbarkeit würfelt die Beute | eine Quelle für Besitz, Einsatz und Beute; nutzt Profil, Event, Kampfpfad und Beutepfad; kein neues Event; Slotgegner sind vor der Erzählung bestimmbar | neues optionales Extractorfeld (A2-3); Inhaltsentscheidung zu den Standardlisten | **eingeschränktes GO** |
| A2-C | humanoide Kreaturen bekommen ein Personenblatt | volle Ausrüstungslogik | Größenordnung von C1 (Sapienz); Kampfwerte ändern sich; überdimensioniert | **NO-GO** |
| A2-D | nur die Beute an den Besitz koppeln, Kampfangriff unverändert | sehr klein | „unarmed strike“ und erbeuteter Speer passen nicht zusammen | **NO-GO** |

### 2.3 A2-B im Detail

**Wann der Besitz festgelegt wird:**
- Genau einmal, beim ersten Materialisieren (`engine.js:371`, läuft nur ohne vorhandenes `profile`).
- Gespeichert im bestehenden Event `entity.updated` als `profile.gear`.
- Kein Zeitpunkt später, kein Tod, keine Erzählung danach.
- Die Wahl erfolgt **per Hash** wie in `loot.js` (`hash32`), nicht über `dice`, damit die RNG-Folge späterer Würfe gleich bleibt.

**Reihenfolge der Quelle:**
1. **Gemeldete Ausnahme bei der Erzeugung.** `creature.new.armed` (neu, optional, nur für humanoide Anker) wird an der Entität gespeichert (`entity.armed`, Text ≤ 80):
   - Waffenwort einer Waffenfamilie → diese Waffe (Name aus dem Text wie bei `heldWeapon`).
   - Familie `unarmed` („unarmed“, „bare hands“) → **ausdrücklich unbewaffnet**.
   - `null` → nicht gezeigt, weiter mit 2.
2. **Standardausstattung des Ankers** (Inhalt, D1): kleine gewichtete Liste, z. B. Goblin: Messer 6, Speer 3, keine Waffe 1.
   - Schlüssel bei Slotgegnern: Dungeon, Zyklus, Ebene, Slot, Platz. Damit ist die Ausrüstung schon vor der Erzählung bestimmbar.
   - Sonst: die Entitäts-ID.
3. **Kein humanoider Anker:** keine Ausrüstung.

**Was gespeichert wird:**
```
profile.gear = { weapon: { name, attack, family, slot, atk, matk, from } | null,
                 source: 'stated' | 'default' | 'none' }
```
- `from` nennt die Quelle (gemeldeter Text oder Listeneintrag).
- `profile.gear` gibt es nur bei humanoiden Ankern. Sein Fehlen kennzeichnet ein Altprofil (D5).

**Einsatz:**
- Ist die Waffe eine Nahkampfwaffe (Familien `melee`, `heavy_melee`, `precision`), ersetzt ihr Kurzname `profile.attack.name` (z. B. „Crude spear“).
- Schadensart, Reichweite und ATK bleiben die des Ankers. Das ist **keine Balanceänderung**.
- Fokus (Schamane) und Bogen ändern den Angriff nicht (D2).

**Beute:**
- Ersetzt die Zufallsquote (`loot.js:78–84`).
- Hat `profile.gear.weapon` einen Wert, entsteht **dieser** Gegenstand, wenn ein deterministischer Verwertbarkeitswurf (`chance(seed|gear|salvage, p)`) gelingt.
- Misslingt er, entsteht kein Objekt. Die Beutezeile sagt dann „Crude Goblin Knife — broken, nothing worth taking“, sodass der Erzähler den Besitz nicht leugnet.
- Die Waffe muss nicht benutzt worden sein: Ein Goblin, der vor seinem ersten Zug fällt, hinterlässt seine Waffe.

**Werte:** Name nach der Waffe („Crude {species} Spear“, Rang wie heute). ATK nach der Skala des Ankers (D3), nicht nach dem Menschenkatalog. Das Profil der Beute läuft wie heute über `gearTraits` (`loot.js:141`).

**Erzähler:** Die Waffe steht ab dem ersten Zug, in dem die Kreatur im Zustand ist, in der Kampfzeile als Angriffsname und als Zusatz in Kampfblock und Kreaturenkarte („armed: crude spear“). Bei Slotgegnern kann sie optional schon in DUNGEON AHEAD stehen (A2-4).

**Grenzen:**
- Eine Waffe, die eine Kreatur **nach** ihrer Materialisierung aufhebt (spätere Antwort, vor dem Kampf), ändert das Profil nicht. Das entspricht dem Personenpfad, der das Blatt ebenfalls einmal setzt.
- Wird sie in derselben Antwort aufgenommen, in der die Kreatur entsteht, kann der Extractor sie über `armed` melden (Pilot Z60).

---

## 3. Exakte Änderungen an Daten, Funktionen und Schnittstellen

### 3.1 A1

| # | Datei | Änderung |
|---|---|---|
| 1 | `content/monsters.json` `loot.anchors.deer.antler` | `only_if: "antlers?|antlered|stags?|harts?|elks?|moose|reindeer|caribou|wapiti|roebucks?"` („buck“ bewusst nicht, mehrdeutig) |
| 2 | `loot.anchors.deer` | neues Material `horn`: `{key: "horn", name: "{species} Horn", qty: [0,2], value_cp: wie antler, only_if: "horns?|horned|goats?|ibex(?:es)?|rams?|antelopes?|chamois|gazelles?"}` |
| 3 | `loot.anchors.horse` | neues Material `horn` mit `only_if: "horns?|horned|ox|oxen|bulls?|cows?|cattle|aurochs|bison|buffalo(?:es)?|yaks?"` |
| 4 | `loot.anchors.ogre.tusk` | `only_if: "tusks?|tusked"` |
| 5 | `loot.anchors.slime.core` | nach D6: `only_if: "cores?|crystal\\w*|mineral|nucleus|gem\\w*"` oder unverändert |
| 6 | `content/monsters.json` `anchors.rat.aliases` | `hare`, `hares`, `rabbit`, `rabbits` (A3-Abhängigkeit: nutzt die vorhandene Ankerkorrektur `speciesAnchor`) |
| 7 | `src/v4/loot.js:72` | Belegtext **ohne** `prof.attack?.name`: Art, Name, Beschreibungen, `traits`. Begründung im Kommentar: Der Ankerangriff ist kein individueller Beleg |
| 8 | `src/delta.js:389` (Kreaturen) | `traits` = alle gemeldeten Beschreibungen, verbunden und auf 240 Zeichen gekürzt (wie bei Personen). `descriptors` bleiben unverändert für die Identitätsprüfung |
| 9 | `src/v4/loot.js:27–30` (`speciesName`) | vor der Auswahl der letzten drei Wörter einen Anhang „of the …“ abtrennen („feral dog of the millpond“ → „Feral Dog“) |
| 10 | `monsters.json` `loot._rule` | Text an die Regel anpassen (A4-Abhängigkeit) |

### 3.2 A2

| # | Datei | Änderung |
|---|---|---|
| 1 | `content/monsters.json` `loot.anchors.goblin/goblin_shaman/ogre` | `gear` wird zu `loadout: {options: [{name, attack, family, slot, atk, matk, w}], salvage}`. Das Gewicht `w` mit Name `null` steht für „keine Waffe“. Die Werte (atk 2 Messer, 4 Keule, Fetisch atk 1) bleiben wie heute |
| 2 | `src/engine.js` `materialise` (Kreaturenzweig, `:371–406`) | nach `scaleCreature`: `creatureGear(s, content, e, anchor)` (neue reine Funktion, z. B. in `src/v4/loot.js` oder `npcgen.js`) bestimmt `profile.gear`; bei Nahkampfwaffe `profile.attack.name = gear.weapon.attack` |
| 3 | `creatureGear` | Quelle 1 `e.armed` (über `weaponFamily`/`itemProfile` wie `heldWeapon`; Familie `unarmed` ergibt `null`), Quelle 2 `loadout.options` per `hash32` (Schlüssel siehe §2.3), sonst `null` |
| 4 | `src/v4/loot.js:78–84` | statt `spec.gear`-Quote: `prof.gear?.weapon` mit `salvage`-Wurf; Zeile „broken“ ohne Objekt bei Misserfolg. **Altprofil ohne `gear`:** nach D5 |
| 5 | `content/deltas.json` `creature.new` | neues optionales Feld `armed: string|null` mit Beschreibung: „humanoid creatures only (goblin, goblin_shaman, ogre): the weapon it holds ready as this reply shows it, 'unarmed' when it is shown bare-handed, else null“; Extractor-Version erhöhen |
| 6 | `src/delta.js:389` | `armed` aus `creature.new` (≤ 80 Zeichen) an die Entität; bei nicht humanoidem Anker ignorieren |
| 7 | `src/context.js` `combatBlock` (`:247`) und Kreaturenkopf in `npcCard` (`:178–202`, Kreaturenkopf `:182–183`) | „armed: <Waffe>“ bzw. „unarmed“, wenn `profile.gear` vorhanden |
| 8 | optional `src/v4/living.js:270` (`slotSay`) und `:358` | DUNGEON AHEAD nennt die Ausrüstung der Slotmitglieder aus derselben reinen Funktion (A2-4) |

**Unverändert:** `scaleCreature`-Werte, `creatureCombatant` (liest `profile.attack` wie bisher), Personenpfad (`armed`, `heldWeapon`, Beute aus dem Blatt), Rückgabestein, Münzen (`purse_cp`), `LOOT_WORDS`, `looted`.

---

## 4. Auswirkungen

| Bereich | A1 | A2 |
|---|---|---|
| **Kampf** | keine | Angriffsname der humanoiden Kreatur nach ihrer Waffe; Werte, Reichweite und Schadensart unverändert. `combat_truth.js` vergleicht mit dem gebuchten `skill_name` und bleibt stimmig |
| **Beute** | weniger falsche Spezialorgane (Geweih, Hauer, Gift bei Gliedertieren); Horn neu bei Beleg | Waffenbeute nur aus Besitz; erwartete Stückzahl je Gegner etwa wie heute, wenn `salvage` nach D4 gewählt wird (Goblin: Besitz 0,9 × Verwertbarkeit 0,55 ≈ 0,5) |
| **Handel** | etwas weniger Geweih und Giftdrüsen im Verkauf; Horn als neues Verkaufsmaterial (Wert wie Geweih). Bewusst eine **kleine** Wirtschaftsänderung | Waffennamen variieren (Speer statt Messer), Werte nach Ankerskala, Stückzahl nach D4 etwa gleich |
| **Persistenz** | Beute entsteht wie bisher als Event am Kampfende; Save, Reload und Swipe spielen sie ab, nichts wird neu gewürfelt | `profile.gear` im bestehenden Event `entity.updated`; Swipe würfelt gleich, weil der Hash an der Entität oder dem Slot hängt |
| **Replay** | Abweichungen nur in Korpusfällen, in denen ein Kampf mit `deer`, `ogre`, `slime` oder Gliedertieren ohne Giftwort endet; einzeln freigeben | neues Feld in Materialisierungsevents humanoider Kreaturen; Beuteabweichungen in Korpusfällen mit getöteten Goblins oder Ogern. Bei D5 „Altprofil = alte Regel“ bleiben Kreaturen aus früheren Records unverändert |
| **XP, Quests** | keine (kein Trophäenzwang, Kanon §4) | keine |
| **Kontext** | Kreaturenkarten zeigen die volle Beschreibung (`traits`), etwas mehr Text in `present` (Priorität 1) | eine kurze Zusatzangabe je bewaffneter Kreatur |

---

## 5. Regressionen (nicht ausgeführt)

### 5.1 A1

| | Fall | erwartet |
|---|---|---|
| **P1** | `species: "red stag"`, Anker `deer` | Haut, Geweih 0–2 |
| **P2** | `species: "doe"`, Beschreibung „antlered doe, rare“ | Geweih möglich (individuell bestätigt) |
| **P3** | `species: "mountain goat"`, Beschreibung „curled horns“ | Haut, Horn, **kein** Geweih |
| **P4** | `species: "ox"`, Anker `horse` | Haut, Horn |
| **P5** | `species: "dock spider"` (Batch 28) | Chitin, Giftdrüse (Artwort „spider“) |
| **P6** | `species: "marsh viper"` | Haut, Zahn, Giftsack möglich |
| **P7** | `species: "tusked troll"`, Anker `ogre` | Hauer möglich |
| **P8** | Pilot „feral dog of the millpond“ | „F-Rank Feral Dog Fang“ statt „Of The Millpond Fang“ |
| **P9** | Merkmalswort jenseits von 40 Zeichen („…, a heavy rack of antlers“) | Geweih möglich, weil `traits` den vollen Text hält |
| **N1** | `species: "doe"` / „hind“ / „deer“ ohne Merkmalswort | **kein** Geweih |
| **N2** | „goat“ | kein Geweih (Horn nur nach P3) |
| **N3** | `species: "hare"`, Anker `deer` gemeldet | Alias korrigiert auf `rat`: Fell, Schwanz, keine Hirschwerte |
| **N4** | `species: "bog beetle"`, Anker `arthropod` | Chitin, **keine** Giftdrüse trotz Ankerangriff „Bite/Sting“ |
| **N5** | Oger ohne Hauerwort | kein Hauer |
| **N6** | „hornless goat“ | kein Horn |
| **N7** | „antler beetle“ (Anker `arthropod`) | kein Geweih (kein Material des Ankers) |
| **N8** | Marsh Serpent (Batch 28) | unverändert ohne Giftsack |
| **N9** | geflohener, ergebener oder überlebender Gegner | keine Beute (unverändert) |

### 5.2 A2

| | Fall | erwartet |
|---|---|---|
| **Q1** | Goblin ohne `armed`, kein Slot | Waffe aus der Standardliste, einmal bei der Materialisierung; Angriffsname danach; Beute dieselbe Waffe (bei Verwertbarkeit) |
| **Q2** | Pilot Z60 mit `armed: "short spear"` | Angriff „Short spear“; Beute „F-Rank Crude Goblin Scout Spear“ oder „broken“ |
| **Q3** | Slotgoblins | Ausrüstung je Platz aus dem Slotschlüssel; gleich bei Swipe und Reload; optional in DUNGEON AHEAD genannt |
| **Q4** | Goblin fällt vor seinem ersten Zug | hinterlässt seine Waffe (Besitz ohne Einsatz) |
| **Q5** | Verwertbarkeitswurf misslingt | kein Objekt, Zeile „broken, nothing worth taking“; `profile.gear` bleibt |
| **Q6** | Schamane | Fokus im Besitz; Angriff „Hex bolt“ unverändert; Beute Fokus |
| **Q7** | Oger | Keule; Angriff „Club“; ATK unverändert |
| **Q8** | Swipe der Antwort mit Kampfende | identische Beute (Events werden abgespielt) |
| **R1** | `armed: "unarmed"` oder „bare hands“ | keine Waffe; Angriff des Ankers; keine Waffenbeute |
| **R2** | Wolf mit `armed: "knife"` (Extractorfehler) | ignoriert (nicht humanoid) |
| **R3** | Beschreibung „eyes Alaric's sword“ | ohne Wirkung (Besitz wird nicht aus der Beschreibung gelesen) |
| **R4** | Bandit als `person.new` | unverändert über Blatt und `armed` |
| **R5** | Kreatur mit Altprofil ohne `gear` | nach D5 (alte Quote oder keine Waffe) |
| **R6** | `armed: "fine steel longsword"` | Name nach Text, Werte nach Ankerskala (D3), keine Katalogaufwertung |
| **R7** | `armed: "short bow"` | nach D2: Besitz und Beute, Angriff unverändert |
| **R8** | Kreatur nimmt in einer **späteren** Antwort einen Speer auf | Profil unverändert (dokumentierte Grenze) |

**Abnahme später:**
- Rot gegen `.179` für P1–P9, N3, N4, N5 sowie Q1, Q2 und Q4–Q7.
- Grün gegen `.179` und danach: N1, N2, N6–N9, Q8 und R1–R8.
- Vollsuite, Replay mit Einzelfreigabe, ST-Smoke wegen der Änderung am Extractor-Vertrag (A2-3).

---

## 6. Umsetzungspakete

| Paket | Inhalt | Aufwand | Voraussetzung |
|---|---|---|---|
| **A1** | §3.1 Nr. 1–10 | S | D6, D9 |
| **A2-1** | Ausstattungslisten (§3.2 Nr. 1), `creatureGear`, Profil und Angriffsname (Nr. 2–3), Beute aus dem Profil (Nr. 4) | M | D1, D3, D4, D5 |
| **A2-2** | Erzähleranzeige (§3.2 Nr. 7) | S | A2-1 |
| **A2-3** | Ausnahme `armed` bei `creature.new` (§3.2 Nr. 5–6) | S | A2-1, D2 |
| **A2-4** | optional: DUNGEON AHEAD nennt die Ausrüstung (§3.2 Nr. 8) | S | A2-1, D8 |

**Reihenfolge:** A1 kann allein laufen. A2-1 und A2-2 gehören zusammen. A2-3 folgt, weil sonst Ausnahmen fehlen; A2-1 bis A2-3 können ein Build sein. A2-4 nur bei D8 ja.

---

## 7. Offene Designentscheidungen und Urteil

| # | Entscheidung | Empfehlung |
|---|---|---|
| **D1** | Standardausstattung je Anker | Goblin: grobes Messer 6, grober Speer 3, keine 1; Schamane: Fetisch/Fokus 1; Oger und Troll: Keule 1 |
| **D2** | Fernkampfwaffen bei Kreaturen | nur Besitz und Beute, Angriff unverändert. Eine echte Reichweite MEDIUM wäre ein Kampf- und Balanceschritt (eigener Auftrag) |
| **D3** | Werte gemeldeter Waffen | Skala des Ankers (wie heutige Lootwerte), nicht Menschenkatalog, damit Monster keine Aufrüstungsquelle werden |
| **D4** | Verwertbarkeit | erwartete Stückzahl wie heute: Goblin ≈ 0,55, Oger 0,7, Schamane 0,4; alternativ immer verwertbar (mehr Beute) |
| **D5** | Altprofile ohne `gear` | alte Zufallsquote behalten (Replay- und Bestandsschutz); alternativ keine Waffe |
| **D6** | Schleimkern | nur mit Beleg (Kern, Kristall, Mineral); Glimmerdeep-Mineralschleime erfüllen ihn über ihre Art |
| **D7** | Wächter und Boss | dieselbe Liste; bessere Waffe nur über `armed` |
| **D8** | Ausrüstung in DUNGEON AHEAD | ja, wenn A2 umgesetzt wird: Die Engine kennt sie vor der Erzählung (U1) |
| **D9** | Wortlisten für Geweih und Horn (§3.1) | wie vorgeschlagen; „buck“ ausgeschlossen |

| Teil | Urteil |
|---|---|
| **A1-α** (Paket A1) | **GO** |
| A1-β (`features`) | **weitere Daten nötig** |
| A1-γ (Artkarte) | **NO-GO** |
| **A2-B** (Pakete A2-1 bis A2-3) | **eingeschränktes GO**, nach D1–D5 |
| A2-4 | **eingeschränktes GO**, nach D8 |
| A2-A, A2-C, A2-D | **NO-GO** |
