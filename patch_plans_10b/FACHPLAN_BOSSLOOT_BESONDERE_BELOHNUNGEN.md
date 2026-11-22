# Fachplan – Bossloot und besondere Gegnerbelohnungen

**Stand 15.11.2026 · ursprüngliche Entscheidungsvorlage, keine Implementierung.** Produktbasis: `.192` (`e7dac41`, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`).

> **U1–U11 entschieden:** Maßgeblich für eine V1-Implementierung sind die [anschließende GPT-Gegenprüfung und die dort festgelegten Designentscheidungen](GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md). Die Tabellen/Empfehlungen in diesem ursprünglichen Fachplan bleiben als Ausgangsvorschlag erhalten und sind **nicht unverändert freigegeben**.

**Ziel:** Ein außergewöhnlicher Kampf (Elite, Dungeon-Guardian, Dungeon-Endboss) soll eine erkennbar außergewöhnliche Belohnung ermöglichen. Das geschieht ohne neue Loot- oder Inventararchitektur, ohne Modellaufruf und ohne Umgehung der F→E-Progression.

**Quellen:**
- Persönliche User-Feedbacks:
  - 04.11. (`testrun_10b/archiv/user-20261104-162404/originals/Userfeedback Spielgefühl.txt`, Absätze zu Loot),
  - 05.11. (`testrun_10b/archiv/user-20261105-050449/originals/user_feedback.txt`: „videospielmäßiger lootbox drop von elites und mini bossen mit rank und dann einem randomised reward im selben rank und mit minichance auf ‚höheres' seltenes bis zu skillstones“),
  - 06.11. (`testrun_10b/archiv/user-20261106-072640/originals/user_feedback.txt`: „dann wieder das lootbox Thema für bosse“, Bosse stärker, Tatenbuch).
- Die Reviews dazu (`USER_FEEDBACK_REVIEW.md` vom 05.11., Punkt 6: „offener eigenständiger Loot-/Progressionsentwurf … keine Dropraten beschlossen“; `REVIEW.md` vom 06.11., Punkt 7).
- Design-Kanon §§4, 5, 7, 8, der Ideenkatalog (Zeile „Erkundung und Beute“) und [Fachplan Monster A1/A2](FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md).
- Produktcode `.192`: `src/v4/loot.js`, `src/engine.js`, `src/v4/living.js`, `src/v4/items.js`, `src/v4/growth.js`, `src/v4/passive_growth.js`, `src/display.js`, `src/context.js`; Content `monsters.json`, `rules.json`, `gear.json`.

**Nicht Teil dieses Plans** (kompatibel halten, nicht mitbauen): Explorationsloot außerhalb von Kämpfen, Tatenbuch, neue Bossfähigkeiten, geänderte Level-up-Attribute, neue Wirtschaft.

---

## 1. Ist-Zustand

### 1.1 Der automatische Lootpfad

- **Einziger Pfad:** `engine.js` (Kampfende, ca. Z. 795) ruft `lootEvents(s, content, enc)` aus `src/v4/loot.js` auf, wenn ein Kampf endet und Alaric lebt und nicht geflohen ist. Die Ereignisse landen im Record des Spielerzugs, der den Kampf beendete. Sie sind eventbasiert: Reload und Swipe spielen sie ab, und niemand würfelt neu.
- **Je Gegner:** Getötet, nicht geflohen, nicht ergeben, noch nicht geplündert. Gebucht wird `entity.updated {looted: enc.id}`; ein zweites Plündern ist ausgeschlossen.
- **Determinismus:** `hash32(`${enc.id}|${c.id}|…`)`. Kampf-IDs sind `enc.t<Zug>`, also je Kampagne eindeutig. Der Kampagnen-Seed fließt bisher nicht ein.

| Was | Woher | Wer | Wert (F) |
|---|---|---|---|
| Körpermaterialien | `monsters.json loot.anchors.<Körperplan>.materials`, Menge `[min,max]`, Name nach eigener Art, A1-Belegregeln (`only_if`/`unless`) | jede getötete Kreatur | 1–8 cp je Stück, ×3 je Rang über F |
| Münzen, grobe Waffen | `humanoid`, `purse_cp`, A2-Bewaffnung (`profile.gear`, `salvage`) | humanoide Kreaturen | 0–4 cp; Waffe nach Bergungschance |
| Ausrüstung, Inventar, Börse | Bogen der Person | getötete Menschen | nach Stand |
| Return Stone | `rules.living.return_stone`: Guardian 25 %, Boss 60 % | Dungeon-Guardian/Boss | 60 cp |

**Elite und Boss sind heute für die Beute bedeutungslos:**
- `elite`/`boss` ändern nur die Kampfwerte (`monsters.json elite`: HP ×1,75 …; `boss`: HP ×2,5 …).
- `loot.js` liest den Typ nicht. Ein Guardian erhält dieselben Materialmengen wie ein Lakai seines Körperplans.

### 1.2 Die belegten Originalfälle

| Lauf | Gegner | Typ / Stufe | Beute | XP |
|---|---|---|---|---|
| User 06.11. (`enc.t22`) | **Gallery Warden**, Guardian von Ebene 1 | Elite, L7, 116 HP | **1 × „F-Rank Armoured Skeleton Bone“** (Richtwert 1 cp), kein Return Stone | 630 |
| Korpus `b17-rogue` #213 | **Crystal Beetle Queen**, Endboss Glimmerdeep | Boss, L7, 133 HP | 3 × Chitinplatte, 1 Return Stone | – |

Im gesamten historischen Replay-Korpus (2235 Fälle plus `.191`-Korpus) gibt es **genau einen** geplünderten Endboss und keinen Guardian. Besondere Kämpfe sind selten. Umso stärker fällt ein enttäuschender Drop auf, und umso kleiner ist der Fingerprint-Aufwand einer Änderung.

### 1.3 Vorhandene, wiederverwendbare Bausteine

- **Ausrüstungsprofile** (`items.js itemProfile`, `gearOfferProfile`):
  - Ein Name „<quality> <Rank>-Rank <Basis>“ ergibt ein festes Profil (Slot, Familie, ATK/MATK/DEF/MDEF, `value_cp`).
  - Qualitätsstufen `crude · common · fine · superior · exceptional` (`gear.json instances.quality`).
  - Basen je Art: Waffe (Schwert, Axt, Streitkolben, Speer, Rapier, Dolch, Bogen …), Fokus (Stab, Zepter, Orb …), schwere und leichte Rüstung, Schild.
  - Beute-Ausrüstung trägt ihr Profil schon heute (`gearTraits`) und ist über das normale Ausrüsten nutzbar.
- **Rangsperre** (`items.js rankRefusal`): Ein Gegenstand über Alarics Power Rank lässt sich tragen, behalten und verkaufen, aber nicht anlegen oder aktivieren. Das ist die natürliche Nutzungsbeschränkung für höherrangige Funde.
- **Heiltränke und Tonika** (`itemProfile` restore): Healing Potion 30 HP (24 cp), fine 38, superior 45; Mana Potion 25 MP (20 cp); Stamina Tonic 30 STA (15 cp).
- **Skill Stone** (`items.js skillSource`, `growth.js stoneActivation`):
  - Ein Objekt mit Profil `skill_source` (Rang, Funktion `strike|bolt|guard|ward|mend`) ist eine gültige Quelle.
  - Lernen nur außerhalb des Kampfes, innerhalb der Rangsperre und nicht doppelt.
  - Richtwert 400 cp.
- **Passive Stone** (`passive_growth.js engineEvidence`):
  - Der Engine-Pfad für eine rare/legendary Passive-Evidenz aus einem Objekt existiert, mit Budgetprüfung.
  - Ein **benutzbarer Passive Stone als Objekt** ist aber noch nicht verdrahtet: `commands.js` verweigert jeden so genannten Stein.
  - Kanon §8: „Passive Stones nur Rare/Legendary und äußerst selten“.
- **Darstellung:**
  - HUD `display.js endLines`: `LOOT ACQUIRED:` mit einer Zeile je Fund.
  - Narrator `context.js`: „LOOT (the engine's automatic loot …): … add no other drop, coin or item“.
  - Gebuchte Namen gehen als `booked.grants` an den Extractor (`engine.js` ca. Z. 678), damit er sie nicht als neue Objekte meldet.
- **Dungeon-Struktur** (`living.js`):
  - Slots mit Rolle `minion` (Typ normal), `guard` (Typ elite, Ebenenwächter) und `boss` (Typ boss, nur auf der tiefsten Ebene).
  - Ihre Stufen: F-Band minion 1–5, guard 4–8, boss 5–9.
  - Zyklus: `reset_days_by_rank` (F 3 Tage).
  - Slot-Refs tragen den Zyklus (`…_c2_l1_e3`).
  - Gegner, die eine andere Gruppe erledigt hat (`taken`), sind kein Kampf Alarics und geben keine Beute.

### 1.4 Was Rang, Qualität und Stärke heute tatsächlich bedeuten

Die Werte sind mit den echten Profilfunktionen berechnet (`itemProfile`, balance wie im Shop):

| Basis | F common | F fine | F superior | F exceptional | E common | E fine | E superior | E exceptional |
|---|---|---|---|---|---|---|---|---|
| Langschwert (ATK) | 10 · 80 cp | 14 · 140 | 18 · 252 | **22** · 440 | 11 · 154 | 14 · 196 | 18 · 252 | 20 · 280 |
| Stab (MATK) | 10 · 80 | 14 · 140 | 18 · 252 | 22 · 440 | 11 · 154 | 14 · 196 | 18 · 252 | 20 · 280 |
| Kettenhemd (DEF/MDEF) | 6/2 · 64 | 7/2 · 72 | 8/3 · 88 | 9/4 · 104 | **11/3** · 196 | 12/4 · 224 | 14/5 · 266 | 15/6 · 294 |
| Leder (DEF/MDEF) | 3/3 · 48 | 3/4 · 56 | 4/5 · 72 | 5/6 · 88 | 5/5 · 140 | 6/7 · 182 | 7/9 · 224 | 8/10 · 252 |
| Schild (DEF/MDEF) | 4/3 · 56 | 4/3 · 56 | 5/4 · 72 | 6/5 · 88 | 6/5 · 154 | 8/6 · 196 | 9/7 · 224 | 10/8 · 252 |

**Daraus folgt:**
1. **Power Rank ist eine Nutzungsstufe, keine Stärke.** Für Waffen und Foki ist eine E-Waffe kaum stärker als eine gleichwertige F-Waffe: F hat eine eigene Balance-Tabelle, E die Formel. Eine F-exceptional-Waffe (22) ist sogar stärker als E-exceptional (20). Bei Rüstungen ist E deutlich stärker (Kettenhemd DEF 11 statt 6–9).
2. **Qualität ist die eigentliche Stärke innerhalb eines Rangs.** F exceptional verdoppelt den Starterwert (Startwaffe ATK 10 → 22). Ein solcher Drop ist der größte Einzelsprung, den eine Belohnung bewirken kann. Er ist auch heute schon käuflich: Fachhändler bieten fine/superior/exceptional für 140/260/480 cp.
3. **Höherrangige Funde sind durch die Rangsperre unbenutzbar,** bis Alaric diesen Rang hat (F→E ab Level 15). Sie sind eher ein Wertgegenstand als ein Machtsprung.

---

## 2. Lösungsvarianten

| Variante | Beschreibung | Vorteile | Nachteile | Urteil |
|---|---|---|---|---|
| **A – Sofortige Sonderbelohnung im bestehenden Lootpfad** | Beim Plündern eines Elites, Guardians oder Bosses würfelt `loot.js` deterministisch eine zusätzliche Belohnung aus einer Tabelle. Sie wird sofort gebucht und im HUD hervorgehoben. | Kein neuer Ablauf, keine Zusatzaktion, gleiche Garantien wie heutiges Loot (einmalig, eventbasiert, swipe-fest); bestehende Profile | Keine „Öffnungsspannung“ | **empfohlen (V1)** |
| B – Physische Lootbox | Der Boss hinterlässt eine Truhe (Objekt), die erst „geöffnet“ wird. | Videospielgefühl, Spannung | Zusätzliche Aktion und Planner-/Commandpfad (`use`/`open`); Zustand „ungeöffnet“; Doppelbuchungsrisiko an zwei Stellen; Spieler wollte keine Pflichtaktion | als Darstellung möglich, nicht als Mechanik |
| C – Schatzkammer-Abschnitt (B5) | Nach dem Boss ein zusätzlicher ruhiger Abschnitt mit Hort | Räumlich schön | Ändert die B5-Abschnittsfolge und Pace; gehört zum Explorationsloot | später, nicht V1 |
| D – Belohnung nur über Gilde | Höhere Auszahlung bei Ebenenräumung | Trivial | Nicht das gewünschte Fundgefühl; Gildengeld existiert schon | nein |
| E – Benannte Unikate mit Sondereffekten | Feste Bossgegenstände mit eigenen Effekten | Starkes Gefühl | Braucht ein Effektsystem für Ausrüstung, das es nicht gibt (Kanon: keine freien Zusatzwirkungen) | spätere Erweiterung |

**Darstellung der Variante A:**
- Der Erzähler darf den Fund als „Hort“, „Kiste“ oder „am Gefallenen gefunden“ beschreiben.
- Gebucht ist er bereits; geöffnet werden muss nichts.
- Das erfüllt den Lootbox-Wunsch ohne die Zusatzaktion, die der Auftrag nicht automatisch will.

---

## 3. Empfohlene minimale Version V1

1. **Vier Belohnungsstufen nach dem, was die Engine über den Gegner weiß.** Nie nach Erzählung, Größe oder Dramatik (Kanon „DESIGNATION LOCK“).

   | Stufe | Erkennung (Enginefakt) |
   |---|---|
   | **Normal** | alles andere, inkl. Dungeon-`minion`, PULSE-Wanderer, `stronger: true` (individuelle Variation) |
   | **Elite** | `profile.type === 'elite'` und **kein** Dungeon-Slot (ausdrücklich so angelegter Gegner) |
   | **Guardian** | Dungeon-Slot `role: 'guard'` (Ebenenwächter, Typ elite) |
   | **Endboss** | Dungeon-Slot `role: 'boss'` (Herr des Dungeons, tiefste Ebene) |

2. **Normale Gegner und das bestehende Loot bleiben unverändert.** Materialien, A1-Organe, A2-Waffen, Münzen und Return Stones bleiben wie sie sind; die Sonderbelohnung kommt **zusätzlich**.
3. **Eine Sonderbelohnung je besonderem Gegner und Kampf,** sofort gebucht, deterministisch (Abschnitt 5).
4. **Rang der Belohnung = Power Rank des Gegners** (`profile.rank`). Ein F-Boss gibt F-Dinge.
5. **Arten in V1:** Ausrüstung in gehobener Qualität, ein Trankbündel, ein Trophäenmaterial. Selten ein Skill Stone (nur Guardian und Boss). **Kein** Passive Stone, **kein** höherer Rang (siehe U6/U8).
6. **Ausrüstung passend zur Klasse** (gewichtet, siehe 4.4), Werte ausschließlich aus `itemProfile`. Nie schlechter als die Startausrüstung: Mindestqualität `fine`.
7. **Erstbezwingung zählt mehr:** Der erste Sieg Alarics über den Guardian einer Ebene bzw. den Endboss eines Dungeons garantiert die Belohnung. Spätere Zyklen (Reset) geben sie mit geringerer Chance.
8. **Darstellung:** eigener HUD-Block `SPECIAL REWARD`, eigene Erzählerzeile, Extractor-Schutz über `booked.grants`.

---

## 4. Tabellen (Entscheidungsvorschlag)

### 4.1 Chance auf eine Sonderbelohnung je getötetem besonderem Gegner

| Stufe | Erstbezwingung | Wiederholung (späterer Zyklus / weiterer Elite) | Zusatz |
|---|---|---|---|
| Normal | – | – | – |
| Elite | 25 % | 25 % (Elites haben keinen Zyklus) | – |
| Guardian | **100 %** | 35 % | – |
| Endboss | **100 %** | 60 % | Trophäenmaterial **immer** (auch bei Wiederholung) |

„Erstbezwingung“ gilt je Kampagne und je Dungeon + Ebene + Rolle. Ein vor V1 schon geplünderter Guardian oder Boss zählt als bereits bezwungen; es wird nichts nachgereicht.

### 4.2 Art der Sonderbelohnung (wenn sie fällt)

Gewichte; der Sonderwurf (4.5) geht vor.

| Stufe | Ausrüstung | Trankbündel | Trophäenmaterial |
|---|---:|---:|---:|
| Elite | 50 | 30 | 20 |
| Guardian | 65 | 20 | 15 |
| Endboss (Erstbezwingung) | 100 | – | (immer zusätzlich) |
| Endboss (Wiederholung) | 70 | 30 | (immer zusätzlich) |

### 4.3 Qualität der Ausrüstung (innerhalb des Gegnerrangs)

| Stufe | fine | superior | exceptional |
|---|---:|---:|---:|
| Elite | 80 % | 18 % | 2 % |
| Guardian (Erst) | 55 % | 38 % | 7 % |
| Guardian (Wiederholung) | 75 % | 23 % | 2 % |
| Endboss (Erst) | – | 75 % | 25 % |
| Endboss (Wiederholung) | 45 % | 45 % | 10 % |

`crude` und `common` kommen nie vor: Eine Sonderbelohnung ist nie schlechter als die Startausrüstung (ATK/MATK 10).

### 4.4 Ausrüstungspool nach Klasse (gewichtet, Basen aus `gearBases`)

| Klasse | Waffe/Fokus | Rüstung | Schild/Nebenhand | „Fremdware“ (andere Klasse, verkaufbar) |
|---|---:|---:|---:|---:|
| Warrior | 40 (Langschwert, Axt, Streitkolben, Speer) | 30 (Kettenhemd, Brustplatte) | 15 (Schild) | 15 |
| Mage | 50 (Stab, Zepter, Orb) | 35 (Robe) | – | 15 |
| Rogue | 45 (Dolch, Rapier, Kurzbogen, Kurzschwert) | 40 (Leder, Gambeson) | – | 15 |

- Die Basis innerhalb der Gruppe wird gleichverteilt gezogen.
- Schusswaffen nur mit vorhandener Munitionslogik (Kurzbogen; Köcher bleibt die Startregel).
- Klasse ist Affinität, keine Exklusivität (Kanon §8): Fremdware ist erlaubt und als Handelsgut gedacht.

### 4.5 Sonderwurf: Skill Stone (ersetzt die Ausrüstung, falls er fällt)

| Stufe | Erst | Wiederholung |
|---|---:|---:|
| Elite | – | – |
| Guardian | 2 % | 1 % |
| Endboss | 6 % | 3 % |

- **Stein:** `F-Rank Skill Stone` (Rang = Gegnerrang), Profil `skill_source`, `source: stone`. Die Funktion stammt aus einer festen Themen-Tabelle des Körperplans. Tags und Aspekte sind in V1 leer; nichts wird aus der Erzählung ergänzt.

  | Körperplan | Funktionen (gleichverteilt) |
  |---|---|
  | skeleton, armored_beast, bear, boar, arthropod | guard, strike |
  | ghoul, wolf, feline, raptor, serpent, goblin, ogre | strike |
  | spirit, goblin_shaman | bolt, ward |
  | slime, aquatic | ward, mend |
  | sonst | strike, guard |

- **Lernen:** über den bestehenden Weg (`stoneActivation`), mit Rangsperre, nicht im Kampf und nicht, wenn die Technik schon bekannt ist.
- Ist die Technik schon bekannt, behält der Stein seinen Handelswert (400 cp Richtwert). Ein „Umwürfeln“ gibt es nicht.

### 4.6 Trankbündel und Trophäenmaterial

| Art | Inhalt (F) | Wert F |
|---|---|---|
| Trankbündel Elite/Guardian | 2 Tränke: je 1 aus {Healing Potion, Mana Potion, Stamina Tonic}, Qualität `fine`; Klasse gewichtet (Mage: Mana 50 %) | ca. 45–60 cp |
| Trankbündel Endboss (Wiederholung) | 3 Tränke, Qualität `fine`/`superior` 50/50 | ca. 90–110 cp |
| Trophäenmaterial Elite/Guardian | 1 × „<Rang>-Rank <Name> Trophy“, Ressource, verkaufbar | **25 cp** × Rangfaktor (×3 je Rang wie Materialien) |
| Trophäenmaterial Endboss | 1 × „<Rang>-Rank <Name> Trophy“ | **60 cp** × Rangfaktor |

Trophäen haben **keine** Wirkung. Ihr Wert ist Handelswert, später vielleicht Handwerksgrundlage (Erweiterung).

### 4.7 Erwartungswert und Vergleich (F, Richtwerte)

| Quelle | Ø Wert je Sieg |
|---|---|
| Guardian heute (Warden) | ≈ 1–5 cp Material + 25 % × 60 cp Return Stone ≈ **16–20 cp** |
| Guardian V1, Erstbezwingung | 0,65 × (0,55×140 + 0,38×252 + 0,07×440) + 0,2 × 50 + 0,15 × 25 ≈ **150 cp** |
| Guardian V1, Wiederholung | 0,35 × ≈ 120 cp ≈ **42 cp** |
| Endboss V1, Erstbezwingung | 0,75×252 + 0,25×440 + 60 (Trophäe) ≈ **360 cp** |
| Endboss V1, Wiederholung | 0,6 × ≈ 190 + 60 ≈ **175 cp** |
| Gildenauftrag „Clear Mossback L1“ | 120 cp |
| F-Fachhandel | fine 140 / superior 260 / exceptional 480 cp |

---

## 5. Technik und Datenmodell

### 5.1 Ein Einstieg im bestehenden Pfad

In `src/v4/loot.js lootEvents` (Schleife über die getöteten Gegner, nach Materialien und Return Stone) kommt neu:

```
const tier = rewardTier(s, e)            // null | 'elite' | 'guardian' | 'boss'
if (tier && pcWon) reward = specialReward(s, content, enc, c, e, tier)   // {events, line, first}
```

- **`rewardTier`** liest nur Enginefakten: `e.slot.role` (guard/boss), sonst `e.profile.type === 'elite'`.
- **`specialReward`** baut jedes Objekt mit vorhandenen Funktionen:
  - Ausrüstung: `itemProfile(content, { name: '<quality> <Rank>-Rank <Basis>', balance: true })`, wie Shop und `gearOfferProfile`;
  - Tränke: `itemProfile` restore;
  - Skill Stone: `skillSource(content, { name: '<Rank>-Rank Skill Stone', teaches: { source: 'stone', fn, tags: [], aspects: [] } })`;
  - Trophäe: Ressource mit festem `value_cp`.
- **Gebucht wird mit `object.created`,** wie heute bei Beute-Ausrüstung: `holder: pc`, `profile`, `use`.
- **Keine neuen Eventtypen, kein neuer Reducer, keine zweite Inventarstruktur.**

### 5.2 Deterministik und einmalige Buchung

- **Würfelschlüssel:** `hash32(`${s.rng.seed}|${slot.ref ?? `${enc.id}|${c.id}`}|reward|<Wurf>`)`.
  - `slot.ref` trägt Dungeon, Zyklus, Ebene und Begegnung. Derselbe Kampf ergibt dasselbe; ein neuer Zyklus würfelt neu.
  - Der Seed macht zwei Kampagnen unabhängig, ohne den alten Loot zu ändern (dessen Schlüssel bleibt).
- **Einmal:** Die Belohnung entsteht nur dort, wo heute `entity.updated {looted}` gebucht wird, also einmal je Gegner und Kampf.
  - Reload und Swipe der Erzählung spielen die Events ab.
  - Regenerate des Spielerzugs würfelt mit demselben Schlüssel und demselben Ergebnis.
  - Objekt-IDs sind fest (`obj.reward.<enc>.<foe>.<n>`); ein schon vorhandenes Objekt wird nicht erneut angelegt (wie heute in `loot.js`).
- **Erstbezwingung ohne neuen Speicher:** Der Looted-Marker erhält zusätzlich `reward: { tier, first, cycle }` (`entity.updated {looted, reward}`).
  - Erstbezwingung heißt: Kein früher geplündertes Objekt mit `slot.dungeon/floor/role` gleich trägt `looted`. Alte Plünderungen ohne `reward` zählen als „schon bezwungen“.
  - Es gibt keine Rückwirkung und kein Nachreichen.
- **Kein Loot:**
  - nach Alarics Flucht oder Tod (unverändert),
  - für geflohene, ergebene oder überlebende Gegner (unverändert),
  - für Slots, die eine andere Gruppe erledigt hat (`taken`; dort gibt es keinen Kampf Alarics, unverändert).
- **Gruppenbeteiligung in V1:**
  - Die Belohnung geht an Alaric, wenn er im Kampf war und ihn gewonnen hat, unabhängig davon, wer den letzten Treffer setzte. Das entspricht dem heutigen Loot.
  - Keine Teilung. Für das spätere Tatenbuch wird nur `solo: true|false` (keine Verbündeten im Kampf) im `reward` mitgeschrieben.

### 5.3 Konfiguration (Content, keine Codekonstanten)

`content/monsters.json loot.special` mit:
- `tiers.{elite,guardian,boss}.{first,repeat}` (Chance, Artgewichte, Qualitätsgewichte, Sonderwurf),
- `class_pool` (4.4), `potions` (4.6), `trophy_cp`, `stone_fn_by_anchor` (4.5),
- `min_quality: "fine"`.

Die Zahlen sind damit nach dem ersten natürlichen Test ohne Codeänderung justierbar.

### 5.4 Spielererlebnis (HUD, Erzähler, Extractor)

HUD (`display.js endLines`), getrennt vom normalen Loot:

```
LOOT ACQUIRED:
  F-Rank Armoured Skeleton Bone ×1
  Return Stone
SPECIAL REWARD — Gallery Warden (guardian of level 1 · first defeat)
  ★ Superior F-Rank Longsword · weapon ATK 18 (equipped Starter Longsword ATK 10 → +8) · value guide ~252 cp
  ★ F-Rank Gallery Warden Trophy · trade good, no effect · value guide ~25 cp
```

- **Was die Zeile zeigt:**
  - Rang, Qualitätswort, Slot, tatsächliche Werte samt Vergleich mit dem Angelegten (wie `offerCard`) und Richtwert.
  - Bei einem Skill Stone: „Skill Stone · F · holds strike — learn it with *use* outside a fight“.
  - Bei einem unbenutzbaren Gegenstand die Rangsperre im Klartext.
- **Erzähler** (`context.js`), eine Zeile neben LOOT: „SPECIAL REWARD (the engine's, already in Alaric's pack): <Namen mit Kurzwerten>. Show it found on or by the fallen <foe> in a few words. It has exactly these values and no other property; add no other item, coin, chest content or effect.“
- **Extractor:** Die Namen gehen in `booked.grants` (bestehender Weg). Eine erzählte Kiste mit weiteren Dingen bleibt ohne Buchung: Das erzählte `object.new` wird wie heute abgelehnt oder fällt unter die bestehenden TAKE-Regeln.

### 5.5 Unverändert

- B5-Abschnitte, Pace, Slots, Resetzyklen, Kapazität.
- PULSE.
- Kampfwerte von Elite und Boss.
- XP und Defeat-XP.
- Jagdcredit.
- Gildenauszahlungen.
- Shop- und Kaufregeln.
- Lernregeln.
- Planner- und Extractor-Verträge (nur ein weiterer `booked.grants`-Eintrag).
- **Kein Modellaufruf.**

---

## 6. Auswirkungen auf Wirtschaft, Klassenentwicklung und Balance

- **Wirtschaft:**
  - Eine Erstbezwingung ist etwa 150 cp (Guardian) bzw. 360 cp (Endboss) wert, über einem Gildenauftrag gleicher Ebene (120 cp) und unter dem Kaufpreis einer exceptional-Waffe.
  - **Farmen:** F-Reset alle 3 Spieltage. Ein Endboss bringt in Wiederholung ≈ 175 cp je Zyklus, ein Guardian ≈ 42 cp. Das liegt in der Größenordnung eines Novice-Auftrags je Zyklus, bei echtem Kampfrisiko.
  - Ein Farm-Nerf ohne Beschluss ist nicht vorgesehen (Kanon §10). Die Wiederholungsraten sind ein bewusster Entscheidungspunkt (U3).
- **Progression F→E:**
  - Ein F-Boss gibt nur F-Dinge. Die größte Stärke ist eine F-exceptional-Waffe (ATK 22, Starter 10). Sie ist auch kaufbar (480 cp) und ändert weder Level, Rang noch Klassenentwicklung.
  - Rechenbeispiel Warrior STR 10, Heavy Slash: 10 + 15 + ATK → 35 (Starter) gegen 47 (exceptional) = **+34 %**. Mit 25 % beim ersten Endboss und 7 % beim Guardian ist das selten, aber erreichbar. **U5** entscheidet, ob exceptional für Guardians ganz entfällt.
  - **Kein höherer Rang in V1.** E-Waffen sind nicht stärker (siehe 1.4); E-Rüstung wäre stärker, aber bis Level 15 unbenutzbar. Ein „höherer“ Drop würde sich daher entweder wertlos anfühlen oder die Rangsperre unter Druck setzen.
- **Klassenentwicklung und Skills:**
  - Ein Skill Stone ist eine bestehende, validierte Quelle (Kanon §8). Er lehrt nur eine der fünf Grundfunktionen auf F und unterliegt allen Lernregeln.
  - 6 % beim ersten Endboss bedeutet rund jeden 16. ersten Endbosssieg.
  - Keine Passive aus Beute in V1.
- **Solo und Gruppe:** In V1 gibt es keinen Unterschied in der Beute. Das `solo`-Merkmal hält die Option für das Tatenbuch offen (Wunsch vom 06.11.: „boss des selben ranks solo besiegt“).
- **Verhältnis zu anderen Wünschen:**
  - „Floorboss mindestens L10“ und „Ebene 2 erst nach dem Floorboss“ sind Balance- und Strukturentscheidungen außerhalb dieses Plans.
  - Werden Bosse stärker, steigen die Belohnungen nicht automatisch mit; das ist eine getrennte Justierung über `loot.special`.

---

## 7. Regressionen

**Positiv:**
1. Original 06.11. Warden (Guardian L7 Elite), Erstbezwingung: Materialien und Return-Stone-Chance wie bisher, **plus genau eine** Sonderbelohnung. Ausrüstung ≥ fine, Rang F, Werte = `itemProfile`.
2. Korpus `b17-rogue` #213 (Crystal Beetle Queen, Endboss): Chitinplatten und Return Stone unverändert, plus Trophäe und Ausrüstung superior/exceptional. **Einziger erwarteter historischer Replay-Fingerprint**, begründet als „bossloot special reward“.
3. Gleicher Kampf, gleicher Seed, zweimal verarbeitet (Regenerate): identische Belohnung, identische IDs.
4. Swipe oder Reload der Erzählantwort: keine zweite Belohnung, kein neuer Wurf.
5. Neuer Zyklus (Reset) desselben Guardians: Wiederholungsrate, anderer Wurf, `first: false`.
6. Skill Stone aus Endboss: Lernen außerhalb des Kampfes über `use` gelingt; im Kampf, bei bekannter Technik oder höherem Rang wird abgelehnt (bestehende Gründe).
7. HUD zeigt `LOOT ACQUIRED` und `SPECIAL REWARD` getrennt, mit Werten und Vergleich. Die Erzählerzeile nennt nur gebuchte Namen. Der Extractor erhält sie in `booked.grants`.
8. Mage gegen Endboss: Pool bevorzugt Fokus/Robe und Manatrank. Fremdware ist nur möglich, wenn der Fremdware-Wurf fällt.

**Negativ:**
1. Normale Kreaturen, Dungeon-Lakaien, PULSE-Wanderer und `stronger: true`: **keine** Sonderbelohnung; ihr bestehendes Loot ist byte-gleich (alle 2235 historischen Fälle außer b17-rogue #213 unverändert).
2. Alaric flieht oder stirbt: keine Belohnung. Ein geflohener oder ergebener Guardian: keine Belohnung.
3. Eine andere Gruppe hat den Boss erledigt (`taken`): keine Belohnung, kein „first“.
4. Eine Erzählung mit Schatzkiste, magischem Ring oder Bonuswerten: nichts davon gebucht. Ein erzähltes `object.new` des Funds wird nicht doppelt angelegt.
5. Alter Spielstand mit vor V1 geplündertem Boss: nichts wird nachgereicht. Beim nächsten Zyklus gilt die Wiederholungsrate.
6. Ein vom Erzähler „zum Boss erklärter“ normaler Gegner (Größe, Narben, Titel): keine Stufe, kein Drop (DESIGNATION LOCK).
7. Eine Sonderbelohnung ist nie `crude`/`common`, nie höherer Rang, nie ein Passive Stone (V1).
8. Determinismus über Kampagnen: Zwei Kampagnen mit gleichem `enc.id` und unterschiedlichem Seed würfeln unabhängig, ihr normales Loot bleibt wie bisher.

---

## 8. Aufwand, Risiken, Erweiterungen

**Aufwand V1:** etwa ein Arbeitstag.
- `loot.js` (Tier, Würfe, Objektbau, rund 120 Zeilen) und `monsters.json loot.special`.
- `display.js`/`context.js`/`engine.js` (Darstellung und `booked.grants`, je wenige Zeilen).
- Tests (rund 15 Fälle aus 7) und ein Replay-Fingerprint.
- Isolierter ST-Smoke (HUD-Zeilen, Erzählervertrag).

**Risiken:**

| Risiko | Gegenmaßnahme |
|---|---|
| Exceptional-Waffe beschleunigt den F-Abschnitt spürbar | geringe Raten, Rang = Gegnerrang, konfigurierbar; U5 |
| Erzähler fügt weitere Schätze hinzu | Erzählerzeile „add nothing“, `booked.grants`, bestehende Objektregeln; Smoke-Prüfung |
| Erstbezwingung falsch erkannt (alte Stände) | konservativ: jede frühere Plünderung zählt als bezwungen |
| Falsche Stufe durch „elite“ ohne Engine-Grund | nur `profile.type`/Slot-Rolle, nie Erzählung |
| Klassenpool liefert unpassende Basis (Bogen ohne Pfeile) | nur Basen mit vorhandener Nutzung; Bogen nur Rogue/Fremdware |

**Spätere Erweiterungen** (kompatibel angelegt):
- **Passive Stone** (rare/legendary) als äußerst seltener Erstbezwingungsfund ab E-Endbossen. Voraussetzung: ein Engine-Katalog fester Passive-Effekte je Qualität und die Verdrahtung `engineEvidence({object})` beim Benutzen.
- **Benannte Unikate** mit Effekten, sobald Ausrüstung Effekte tragen kann (eigener Fachplan).
- **Tatenbuch:** `reward.solo`, Stufenabstand und Erstbezwingung als Belege für Klassenentwicklung.
- **Explorationsloot/Hort-Abschnitte** (Wunsch vom 04./05.11.), getrennt geplant.
- **Handwerk** mit Trophäen und Organen.
- **Höherrangige Funde,** falls U6 sie später erlaubt (dann nur Rüstung/Schild sinnvoll).

---

## 9. Offene Nutzerentscheidungen

| Nr. | Frage | Vorschlag |
|---|---|---|
| **U1** | Was ist ein **Elite** außerhalb von Dungeons? Nur ausdrücklich als `elite` angelegte Gegner, oder auch Einzelziele großer Gildenjagden (`qtype major/dangerous`, z. B. „Blackmane Bear“ L13)? | nur `profile.type elite` in V1; Jagdziele über die Gildenauszahlung belohnt |
| **U2** | Tabellen 4.1–4.6 so übernehmen? | ja, als Startwerte (alle in `monsters.json`) |
| **U3** | Erstbezwingung **je Kampagne** garantiert und Wiederholung mit 35 % (Guardian) / 60 % (Boss), oder jeder Zyklus gleich? | je Kampagne garantiert, Wiederholung reduziert |
| **U4** | Pool **klassengewichtet** mit 15 % Fremdware, oder thematisch zum Gegner (Waffe des Bosses, Rüstung des Wächters)? | klassengewichtet (Spielgefühl); Thema als Name/Erzählung |
| **U5** | **Exceptional** (F ATK/MATK 22) als Drop zulassen? Raten 25 % erster Endboss, 7 % Guardian, 2 % Elite | zulassen wie vorgeschlagen, oder für Guardian/Elite streichen |
| **U6** | Kleine Chance auf **höheren Rang** (Gegnerrang +1, bis zum Rangaufstieg nur Handelsgut)? | **nicht in V1** (E-Waffen nicht stärker; Rüstung unbenutzbar) |
| **U7** | **Skill Stone** als seltene Guardian-/Bossbeute (2/1 %, 6/3 %)? | ja |
| **U8** | **Passive Stone** schon in V1? | nein; eigener Schritt mit Effektkatalog, frühestens E-Endbosse |
| **U9** | Darstellung: sofortige Buchung mit „Hort“-Erzählung, oder echte Lootbox mit Öffnen? | sofort (keine Zusatzaktion) |
| **U10** | Gruppenbeteiligung: volle Belohnung auch mit NPC-Verbündeten im Kampf? | ja in V1; `solo` nur für das spätere Tatenbuch speichern |
| **U11** | **Trophäenmaterial** (25/60 cp, ohne Wirkung) immer beim Endboss? | ja |

Nach diesen Entscheidungen ist V1 ohne weitere Architekturfragen umsetzbar. Die Abnahme: rote Originalproben (Warden 06.11., Queen b17), Unit- und Negativtests aus Abschnitt 7, voller Replay mit dem einen begründeten Fingerprint, isolierter ST-Smoke. Kein natürlicher Lauf als Vorbedingung.
