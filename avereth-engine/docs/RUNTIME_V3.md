# Runtime V3: einfacher Kampf, Engine-State statt Megumin-State

Stand: Avereth Engine 3.0.0, Vertrag 3.3. Das hier ist die Umsetzung von [REVIEW_V3.md](REVIEW_V3.md). Sie vereinfacht den bestehenden Stand und baut nichts neu: Event-Sourcing, der kanonische Zustand und das Fakten-Protokoll bleiben, wie sie sind.

Entscheidungen aus dem Auftrag:

| Frage | Entscheidung |
|---|---|
| Hinterhalt | symmetrisch: Ein echter Hinterhalt gibt Alaric und Monstern garantiert ×1,5 auf jeden Treffer der einen Opening Action, auch bei Mehrfachtreffern. |
| Schadensvarianz | 0,90–1,10 bleibt bis nach Test 5. |
| Megumin V10 Shura | Die Preset-Datei wird nicht angefasst, dafür gibt es eine genaue Checkliste zum Ändern von Hand (Abschnitt 9). |

---

## 0. Kurzfassung

1. **Kampf:**
   - Jeder legale Angriff trifft. Es gibt keinen Treffer-Wurf und keine Zufalls-Crits mehr.
   - Nur ein echter Hinterhalt crittet (×1,5).
   - PER spielt im Kampf keine Rolle mehr.
   - Initiative = ⌊1,5 × AGI⌋.
   - Partial Cover senkt den Schaden um 25 %.
   - Verteidigungs-Skills senken den Schaden, statt die Trefferchance zu drücken.
2. **NPCs:**
   - Das Megumin-Dossier fällt weg.
   - An seine Stelle tritt ein kleiner NPC-Record aus Engine-Events: Rolle, Aussehen, Stimme, Haltung zu Alaric mit Grund, letzter bedeutsamer Moment, Wissen, Agenda.
3. **HUD:**
   - Unter jeder Antwort stehen zwei einklappbare Panels, **Charakter** und **Welt**. Sie werden aus dem Engine-Zustand gerendert.
   - Sie ersetzen `<Character_Sheet>` und `<World_State>`, gehen nie in den Prompt und können nicht vom Engine-Zustand abweichen.
4. **Prompt:**
   - Alte Tracker-Blöcke werden aus dem Verlauf entfernt, nur für die Prompt-Kopie.
   - Nur die letzten 4 Wechsel bleiben wörtlich im Prompt.
   - Das Report-Schema und Alarics Zeile richten sich nach dem Zugtyp.
   - In Testrun 4 sinkt der Prompt von **20.093 → 14.802 Token (−26 %)** in Zug 7 und von **25.097 → 14.786 Token (−41 %)** in Zug 10.
5. **Output:**
   - Ohne Tracker-Blöcke fallen ≈ 800 von 2.304 Output-Token pro Zug weg (−35 %). Die modellierte Dauer sinkt von ≈ 134 s auf ≈ 85 s.
   - Das ist gerechnet, nicht mit einem echten Modell gemessen. Der volle Effekt setzt voraus, dass Megumin die Blöcke nicht mehr anfordert (Abschnitt 9).
6. **Tests:**
   - 172 Tests grün;
   - Browser-Smoke gegen gemockten Host grün;
   - **Live-Smoke in echtem SillyTavern 1.19.0** mit Streaming grün.

---

## 1. Kampf V3

### 1.1 Was wegfällt

| Weg | Wo |
|---|---|
| Treffer-Wurf, Grund-Trefferchance 70, PER→Hit, Clamp 20–95, Treffer-Vorschau | `rules.json` `hit`, `combat.js`, `derived.js` `baseHit`, `display.js` |
| Zufalls-Crit (5 + PER/10), Crit-Wurf | `rules.json` `crit`, `derived.js` `crit` |
| `hit_mod` aller 25 Skills, `hit_pp` der Proficiency und der Elite/Boss/Variation | `classes.json`, `rules.json`, `monsters.json` |
| Monster-`hit` der 15 Anker und `scaling.hit` | `monsters.json`, `npcgen.js` |
| PER in Initiative und Ranger-Skalierung | `rules.json` `derived.init`, `classes.json` |
| Geteilte Würfe bei Flächenangriffen | `combat.js` |

PER bleibt ein Kernwert und zählt weiter für Nicht-Kampf-Proben: Wahrnehmung, Schleichen gegen Wachen, Spurenlesen. Der Test „PER stays out of combat math“ spielt denselben Kampf mit PER 1 und PER 20 und bekommt dasselbe Ergebnis.

Die Content-Migration steht in `tools/v3_combat.mjs`:
- Sie läuft auf dem Ergebnis von `migrate_content.py` (Paket v1.24) und ist idempotent.
- Sie passt auch die Regeltexte an: Core #2/5/9/10/11/12/24/26/27/29/19, System #3/4/8/9/14 und Content #6. Core #10 heißt jetzt „Attack Legality and Connection“.

### 1.2 Schadensreihenfolge (zentral in `resolveStrike`)

```
Raw → Skill-Power → Proficiency → Buffs (Focus Aim/Feint +35 %) → Domain → DEF: max(P − DEF, P × 0,10)
→ Resistenz → Varianz 0,90–1,10 → Hinterhalt-Crit ×1,5 → Partial Cover −25 % → Verteidigungs-Minderung
→ Endure → einmal runden → Barrier → HP
```

Cover und Minderungen sind Final-Damage-Modifikatoren nach Core #11 Schritt 11. Sie greifen also nach dem Crit. Der Rechenweg steht in `#audit` und in `#combat`.

### 1.3 Echter Hinterhalt

- **Alaric:** Das Ziel ist wirklich ahnungslos (`unaware`), sonst gibt es keinen Hinterhalt.
- **Monster oder NPC:** Er war verborgen, als er den Angriff festlegte (`concealed`).
- Die Opening Action (Runde 0) ist ein garantierter Critical Hit ×1,5. Das gilt für jeden Treffer dieser einen Aktion und gegen jedes getroffene Ziel.
- Danach läuft die normale Initiative, und es gibt keine weiteren Crits.
- Anzeige: `— Opening Action (Ambush) —` und `53 damage AMBUSH CRIT ×1.5 → …`.

### 1.4 Partial Cover

- **−25 % Schaden** für den Angriff auf ein Ziel in Partial Cover.
- **Aimed Shot** und **Precision Thrust** ignorieren das (`ignores_partial_cover`). Damit behalten sie ihre Identität als Präzisionsangriffe; früher bekamen sie +10 Hit.
- Full Cover macht den Angriff illegal: Er kostet nichts und würfelt nichts.
- Die Vorschau vor Alarics Zug nennt Cover: `Alaric's attacks vs the wolf (partial cover: -25%): Basic Attack 12–14 · Aimed Shot 24–29 (ignores cover) · …`.

### 1.5 Verteidigungs- und Vorbereitungs-Skills: gleiche relative Stärke

Alter Wert gegen neuen Wert. Die Umrechnung geht über den erwarteten Schaden bei einer typischen Trefferchance von 75 %.

| Skill | Alt | Neu | Begründung |
|---|---|---|---|
| Deflect (Warrior) | eingehender Hit −20 pp | eingehender Schaden −25 % | 20/75 ≈ 27 % weniger erwartete Treffer |
| Evasive Step (Duelist) | −20 pp | −25 % | wie Deflect |
| Quickstep (Ranger) | −15 pp | −20 % | 15/75 = 20 % |
| Focus Aim (Ranger) | nächster Fernangriff +20 pp Hit, +10 % Power | +35 % Modified Power | (95/75) × 1,10 ≈ 1,39 |
| Feint (Duelist) | nächster Angriff +20 pp, +10 % | +35 % | wie Focus Aim |

Proficiency ohne `hit_pp`: Die +5 pp ab P3 wurden in Power umgerechnet (P3 ×1,05, P4 ×1,15, P5 ×1,20; vorher 1 / 1,1 / 1,15).

### 1.6 Ranger, Initiative

- **Ranger:** Der PER-Anteil jeder Skalierung liegt jetzt auf AGI:

  | Skill | Skalierung |
  |---|---|
  | Basic | 1,25 AGI |
  | Aimed | 1,75 |
  | Power | 1,875 |
  | Quick | 1,50 |
  | Twin | 2 × 0,875 |

  Auf Level 1 (AGI = PER = 6) ist jeder Wert gleich geblieben.
- **Initiative** = ⌊1,5 × AGI⌋, vorher AGI + ⌊PER/2⌋:
  - Ranger mit AGI 6: 9, wie vorher.
  - Gleichstand wird einmal unparteiisch ausgelost; PER bricht ihn nicht mehr.

### 1.7 Anzeige

- `Alaric: Power Shot → the big rat · STA 100 - 12 = 88 · 1 arrow` gefolgt von `48 damage → the big rat HP 16 - 48 → 0 DEFEATED`.
- Minderungen stehen in Klammern: `12 damage (cover -25%, Deflect -25%)`.
- Vor Alarics Zug gibt es statt der Trefferchancen die Schadensbereiche:
  `Alaric's attacks vs cellar vermin: Basic Attack 16–19 · Aimed Shot 24–29 · Power Shot 30–37 damage`.
- Der Vertrag (COMBAT NARRATIVE FOCUS) und der RESOLVED-Block sagen dem Erzähler: Jeder aufgelöste Angriff trifft. Er soll keinen Fehlschuss, keinen Streifschuss und kein Ausweichen erfinden.

### 1.8 Alte Kämpfe (gespeichert vor V3)

Encounter-Snapshots sind vollständige `encounter.updated`-Events. Ein Chat, der mitten im Kampf gespeichert wurde, faltet deshalb unverändert und läuft unter V3 weiter:
- `fixed.hit` und `fixed.crit` alter Profile werden ignoriert.
- Ein aktiver alter Hit-Malus wird mit derselben Stärke umgerechnet: 20 pp → −25 %, 15 pp → −20 %.
- Alte `MISS`-Zeilen werden weiter angezeigt.
- Eine verfehlte Aktion zählt für die NPC-Logik nicht als „getroffen“.

Das deckt der Test „a fight saved mid-round before Combat V3 …“ ab.

### 1.9 Monster: keine Neubalance vor Test 5

Beide Seiten verlieren ihre Fehlwürfe. Kämpfe werden dadurch ≈ 25 % kürzer, das Kräfteverhältnis bleibt meist innerhalb ±10 % (Tabelle in REVIEW_V3 §3.3). Ausreißer sind nur die Anker mit altem Hit < 70. Sie werden **dokumentiert, nicht geändert**:

| Anker | alter Hit | Verhältnis für den PC | Vorschlag nach Test 5 |
|---|---|---|---|
| Oger 90/2/18 | 60 | **−20 %** | ATK 18 → 15 |
| Hirsch 27/0/7 | 65 | −13 % | ATK 7 → 6 |
| Pferd 38/1/8 | 65 | ≈ −13 % | ATK 8 → 7 |

Elite und Boss verlieren ihre +5 pp Hit (≈ −6 % relativ). Ausgleich wäre optional: Elite-ATK 1,15 → 1,20.

---

## 2. NPC-Record statt Megumin-Dossier

Das Dossier kostete in Testrun 4 bis zu **6.167 Prompt-Token** pro Zug (3.081 Anweisungen + 3.086 NPC-Bank). Dazu kamen im Schnitt ≈ 200 Output-Token, in Vorstellungszügen ≈ 850. Außerdem trug es falschen Kanon aus einem verworfenen Swipe weiter.

Der Ersatz braucht **keine neuen Event-Typen und keine neuen Felder**. Aussehen, Stimme und Agenda passen als **funktionale Fakten**: Ein neuer Wert beendet den alten, sie sind swipe-sicher und haben ein „seit“. Die Wissensgrenzen gelten auch für sie.

| Feld der Karte | Quelle | Wie es entsteht |
|---|---|---|
| Rolle | Fakt `occupation` (Synonyme role/job/profession) | Report `facts` |
| Aussehen | `traits` bei `new`, einmalig; danach Fakt `appearance` | Report `new[].traits`; spätere `traits` überschreiben nie |
| Stimme | Fakt `voice` (speech/manner_of_speech) | Report `facts` |
| Haltung zu Alaric | Beziehung mit Wert und Grund-Kette | Report `attitude` mit `why` |
| letzter bedeutsamer Moment | Erinnerung mit Wichtigkeit ≥ 6 | Report `memory` mit `imp` |
| weiß, glaubt | Wissen und Überzeugungen des NPC | Report `learn`, `believe` |
| Agenda | Fakt `agenda` (goal/objective/wants); `none` beendet sie | Report `facts` |
| hält geheim, Absicht | geheime Fakten, Kampf-Absicht | wie bisher |

**Karte im Engine-Block** (aus `npc_record.test.js`):

```
• Kest — person, veteran adventurer; one-eyed, grey braid, gruff; voice: low rasp, clipped sentences
  toward Alaric: wary/unfriendly (-25) (last change: a green Novice eyeing the Greyhowl bill); has seen him, does NOT know his name
  last meaningful: [Day 1, 09:00] Kest warned the stranger that Greyhowl killed two Wardens and told him to leave the posting alone
  knows: Alaric rank newly registered Novice [witnessed]
  agenda: get the Greyhowl posting taken down
```

Das sind < 600 Zeichen; ein Megumin-Dossier hatte ≈ 3.300.
- **Beiläufige NPCs** (Torwache, Händler) bekommen eine Zeile und verschwinden, sobald sie die Szene verlassen.
- **Genannte, abwesende NPCs** kommen unter `NAMED, NOT PRESENT (continuity only …)`:
  - höchstens 3;
  - nur wenn Eingabe oder letzte Antwort sie nennt;
  - mit derselben kurzen Karte.
- **RELEVANT wiederholt keine Kartenfakten:**
  - Rolle, Aussehen, Stimme, Agenda und Gildenrang stehen dort nicht noch einmal;
  - höchstens 3 alte Spielerzeilen (`MAX_EPISODES`).

### 2.1 Bedeutsame Erinnerung

Es gibt genau eine Definition: `MEANINGFUL_IMPORTANCE = 6` in `src/knowledge.js` mit `isMeaningful(m)`.
- Die Standard-Wichtigkeit 5 und Trivialitäten („Kest nickte“) kommen nicht in die Karte.
- Der Vertrag (NPC CONTINUITY) und das Report-Schema (`imp:6-10`) nennen dieselbe Schwelle.

### 2.2 Haltung ohne Drift

- Haltung ändert sich **nur** durch `attitude` mit `delta` und `why`. `delta: 0` erzeugt kein Event.
- Kein gewöhnlicher Zug und kein Zeitablauf verschiebt sie. Es gibt keinen Verfall und keine Normalisierung.
- Die Karte zeigt Wert, Stufe und den letzten Grund. Nach 40 Zügen woanders ist sie unverändert; das prüft ein Test.
- Das HUD zeigt Haltungen nie (Spoiler-Regel).

### 2.3 Wissens-Leck geschlossen

`learn how:'witnessed'` durch einen nicht anwesenden NPC wird abgelehnt, auch wenn der Fakt im selben Report entstanden ist (Fix in `delta.js`). Kest weiß nur, was er gesehen hat oder was ihm gesagt wurde.

---

## 3. HUD: Charakter und Welt (`src/hud.js`)

Zwei `<details>`-Panels stehen unter jeder Antwort, per Standard eingeklappt. Die Zusammenfassungszeile zeigt das Wichtigste.

Screenshot aus dem Live-Lauf in SillyTavern 1.19.0: [img/hud_live_sillytavern.png](img/hud_live_sillytavern.png).

**Charakter:**

| Zeile | Inhalt |
|---|---|
| Level | Level, Klasse, Power Rank, Gildenrang (`— (not registered)` ohne Registrierung) |
| Resources | HP mit Zustand, MP, STA, XP |
| Stats | die sechs Kernwerte, freie Stat-Punkte |
| Combat | ATK, MATK, DEF, MDEF, Initiative |
| Skills | Skills mit Proficiency |
| Equipped | Ausrüstung |
| Carried | Inventar mit Mengen |
| Coin | Börse |
| Quests | Quests mit Status, Rang und Auftraggeber |
| Effects | aktive Effekte |

**Welt:**

| Zeile | Inhalt |
|---|---|
| Time | Zeit |
| Location | Ort, Reich, Stelle, Ortsstatus (z. B. `DESTROYED`) |
| Weather | Wetter |
| Present | Anwesende mit Rolle, HP im Kampf, Entfernung und Cover |
| Combat | Runde, wer handelt, Zugreihenfolge; oder wer einen Angriff festgelegt hat |
| Active quests | aktive Quests |
| Deadlines | Fristen |
| Open threads | offene Fäden |
| Known here | harte, nicht geheime Fakten über diesen Ort |

Zeilen ohne Inhalt entfallen.

**Regeln:**
- **Nur Ansicht:** `renderHud(state)` ist eine reine Funktion des gefalteten Zustands und hat keinen eigenen Speicher. Es gibt also keinen zweiten Zustand.
- **Nie im Prompt:**
  - Das HUD steht in `extra.display_text`, wie der System-Block über der Antwort.
  - Prompts verwenden `mes`.
  - Browser-Smoke und Live-Smoke prüfen beides in jedem Request.
- **Spoiler-Regel:** Das HUD zeigt keine Haltungen, Agenden, Geheimnisse oder verborgenen Zahlen von NPCs.
- **Drift unmöglich:**
  - Schreibt der Erzähler falsche Coins, HP, STA, falschen Queststatus oder falsche Position in Prosa oder in einen alten Block, ändert das weder Zustand noch HUD.
  - Der nächste Engine-Block nennt die Abweichung (`HP shown as 50, engine value is 80`).
- **Gildenrang:**
  - Institutionell: Fakt `pc guild_rank`, eine der Stufen Novice … Legend.
  - Nie über dem Mindest-Power-Rank der Beförderung: Proven braucht Power Rank E.
- **Einstellung:** „HUD under replies“ = Folded / Open / Off. Beim Bearbeiten einer Antwort wird das HUD neu gerendert.

### 3.1 World_State-Felder: A / B / C

**A = kanonisch und engine-eigen, jetzt im HUD:**

| World_State-Feld (Megumin) | HUD |
|---|---|
| Time / Date | Time |
| Loc / Region | Location |
| PC outfit | Equipped |
| PC carrying | Carried, Coin |
| PC visible condition | Resources (HP-Zustand), Effects |
| NPCs present plus Abstand | Present |
| Unresolved threads | Open threads |
| Consequence timers | Deadlines (Faden-Art `deadline`) |
| Kampf | Combat |

**B = nützlich, fehlte bisher, jetzt minimal als Fakt:**

| Feld | Fakt |
|---|---|
| Weather | Fakt `weather` am Ort |
| Guild Rank | Fakt `pc guild_rank` |
| NPC-Rolle, -Aussehen, -Stimme, -Agenda | Fakten, nur in der Karte für den Erzähler, Agenda nie im HUD |

**C = entfällt:**

| Feld | Warum |
|---|---|
| PC-Haltung und Position als Prosa | steckt in der Erzählung; Abstand zählt nur als Band |
| NPC outfit | Aussehen steht einmalig in `traits`, Kleidung wechselt in der Prosa |
| Mood | flüchtig, gehört in die Prosa |
| Secret | Geheimnisse sind geheime Fakten mit Wissensgrenzen, nie im HUD |
| Agenda pro Zug | ersetzt durch den dauerhaften Fakt `agenda` |
| Off-Screen | spekulativ; die Welt bewegt sich über Fäden und Fakten |
| Planted Seeds, Arc Phase, Scene Phase | Erzähl-Metadaten ohne Wahrheitswert |

---

## 4. Prompt-Projektion

### 4.1 Alte Tracker-Blöcke aus dem Verlauf (nicht destruktiv)

`projectPromptHistory(coreChat, { keepTurns })` läuft im Generate-Interceptor auf SillyTavern's `coreChat`. Das sind flache Kopien der Nachrichten, deshalb bleiben gespeicherter Chat, Swipes und Anzeige unverändert.

Die Funktion:
- entfernt `<Blocks>`, `<World_State>`, `<Character_Sheet>`, `<New_NPC>` und `<NPC_Update>`, auch wenn der Block nicht geschlossen wurde (`stripTrackerBlocks`);
- lässt nur die letzten `keepTurns` Wechsel wörtlich stehen (Einstellung „History window“, Standard 4; 0 = ganzer Verlauf).

Ältere Wechsel erreichen den Erzähler über den Engine-Block:
- RELEVANT;
- Erinnerungen;
- Fakten;
- NPC-Karten.

„Recent turns not re-retrieved“ wird auf das Fenster begrenzt, damit nichts durch die Lücke fällt. Die Statuszeile zeigt, wie viele Nachrichten die Projektion weggelassen und wie viele sie bereinigt hat.

**Neue Antworten mit Blöcken:**
- Einstellung „Remove tracker blocks from new replies“, Standard an.
- Die Engine entfernt die Blöcke aus `mes`.
- Nichts davon wird Zustand.
- Der nächste Engine-Block sagt dem Erzähler ohne Tag-Namen: `Your last reply wrote tracker blocks (world state, character sheet, NPC dossier or update): they are retired and were removed. …`. So wird das Format nicht wieder angeregt.

### 4.2 Engine-Block je Zugtyp

| Teil | Sozial / Geschichte | Kampf | Reise / Ortswechsel |
|---|---|---|---|
| Kopf (Zeit, Ort, Modus) | ✓ | ✓ | ✓ |
| Alarics Zeile | Level, Rang, HP/MP/STA, Stats, Ausrüstung, Munition; Inventar und Börse nur bei Handel/Beute/Item-Bezug; Skills nur, wenn einer genannt wird | zusätzlich ATK/MATK/DEF/MDEF, Init, alle Skills | wie sozial |
| PRESENT (NPC-Karten) | ✓ volle Karte | ✓ plus HP-Band, Absicht | ✓ |
| NAMED, NOT PRESENT | nur wenn genannt | selten | nur wenn genannt |
| COMBAT ACTIVE | — | ✓ Runde, Reihenfolge, Effekte, Kampfstille | — |
| ESTABLISHED FACTS (Ort, Anwesende, Genanntes), RELEVANT | ✓ | ✓ | ✓, am neuen Ort |
| RULES (situativ) | Schleichen / Beute / Handel nur mit Anlass, kurze Texte aus `narrator.json` `situational_rules` | wie sozial | wie sozial |
| LORE | nur ohne verknüpftes Lorebook; mit Lorebook nur die Lore-Bridge (0 Token) | wie sozial | wie sozial, der neue Ort aktiviert die passenden Einträge |
| RESOLVED | CHECK DIE | alle Aktionen, Schäden, Kosten, nächster Akteur | CHECK DIE |
| FACT REPORT Schlüssel (≈ 560 Token) | Story-Satz mit `place`/`location`/`new`/…; `quests` nur mit Quest-Anlass, `recover` nur bei Rast oder fehlenden Ressourcen, `check` nur mit Würfel, `intent` nur bei festgelegtem Angriff | nur `time, new, enter, leave, concealed, facts, memory, combat, intent` (≈ 280 Token) | wie sozial |
| Charaktererstellung | `{}` | — | — |

Der Parser nimmt immer alle Schlüssel an. Die Liste spart nur Prompt-Token, sie verbietet nichts.

### 4.3 Fakten-Report: nur Deltas

Der Report bleibt das einzige Ausgabeformat, das Avereth besitzt. Er ist kein Tracker. Die Anweisung lautet: „only what THIS reply newly established ({} if nothing): deltas, never a restatement of known state or numbers the engine owns (HP, XP, damage, rolls, coin totals)“.

Vertrag, ENGINE AUTHORITY: „no trackers, character sheets, world-state or NPC dossiers; the engine keeps that state and shows it to the player“.

### 4.4 Vertrag 3.3

- Neu ist **NPC CONTINUITY** (≈ 990 Zeichen). Der Abschnitt sagt, wann `new` mit `traits`, `occupation`/`voice`, `attitude` mit Grund, `learn`, `agenda` und `memory` mit imp 6–10 zu melden sind.
- PC STATE DELTA CHECK ist in PHYSICAL CONTINUITY aufgegangen, GENERIC GEAR CANON in CANON & INVENTION.
- COMBAT NARRATIVE FOCUS ist kürzer und erfindet keine Fehlschüsse.
- PERSISTENCE und OUTPUT-FORMAT OWNERSHIP sind neu gefasst.
- Unverändert bleiben:
  - Agency (PLAYER OWNERSHIP, MEANINGFUL DECISION BOUNDARIES);
  - Wissen (NPC KNOWLEDGE, INPUT VISIBILITY, OBSERVATION IS NOT INTERPRETATION);
  - die erzählerischen Regeln.
- Größe: 17.494 → 18.424 Zeichen (+5 %). Ohne den neuen NPC-Abschnitt ist er 62 Zeichen kürzer. Der Abschnitt ersetzt die ≈ 12.600 Zeichen Dossier- und Update-Anweisungen im Megumin-Prompt.

---

## 5. Streaming

SillyTavern zeigt beim Streaming den Rohtext. `MESSAGE_RECEIVED` feuert erst nach dem Stream; erst dann entfernt die Engine den Report und setzt System-Block und HUD. Ohne Regex stünde der Report während des Streamings kurz sichtbar da.

**Einrichten:**

1. API-Einstellungen: **Streaming an**. Die Engine funktioniert mit und ohne.
2. Extensions → Regex → Import (global oder an der Karte):
   - `regex/avereth_hide_fact_report.json`: versteckt `<avereth>…` auch unvollständig und ein halb gestreamtes `<avere` am Ende.
   - `regex/avereth_hide_tracker_blocks.json`: nur für die Übergangszeit, bis Megumin keine Blöcke mehr anfordert. Versteckt `<Blocks>`, `<World_State>`, `<Character_Sheet>`, `<New_NPC>` und `<NPC_Update>`, auch unvollständig.
3. Beide Skripte stehen auf **„Alter Chat Display“ only** (`markdownOnly`), Platzierung **AI Output**. Sie ändern also weder den gespeicherten Text noch den Prompt.

Der Live-Smoke prüft das in jedem Frame (`noLeakWhileStreaming`): 14–52 Frames pro Antwort, kein einziger zeigte `<avereth>` oder einen Tracker-Block.

---

## 6. Messungen

### 6.1 Prompt-Token vorher / nachher

**Methode:**
- **Vorher** sind die echten Requests aus Testrun 4 (Logger), zerlegt nach Abschnitten.
- **Nachher** ist derselbe Zug mit der aktuellen Engine nachgespielt:
  - Engine-Block;
  - projizierter Verlauf, 4 Wechsel ohne Blöcke;
  - Vertrag 3.3;
  - der Megumin-Prompt ohne die Teile aus Abschnitt 9.
- Die Zeichen werden mit dem Zeichen/Token-Verhältnis des echten Requests umgerechnet (4,35 bzw. 4,27).

**Zug 7 (Gilde, Questbrett):**

| Kategorie | Vorher | Nachher |
|---|---:|---:|
| Megumin-Basis (Stil, Bannliste, Thinking, Rahmen) | 5.755 | 5.755 |
| NPC-Dossier/Update-Anweisungen | 2.641 | 0 |
| NPC-Bank / Dossier-Verlauf | 0 | 0 |
| Character Sheet (Anweisung + Verlauf) | 442 | 0 |
| World State (Anweisung + Verlauf) | 875 | 0 |
| Erzähler-Vertrag | 4.021 | 4.243 |
| Lore (World Info) | 1.837 | 1.837 |
| Engine-Block | 1.368 | 1.166 |
| Chat-Prosa + Spielernachrichten | 3.154 | 1.801 |
| **Summe** | **20.093** | **14.802 (74 %)** |

**Zug 10 (Kellerkampf):**

| Kategorie | Vorher | Nachher |
|---|---:|---:|
| Megumin-Basis | 5.852 | 5.852 |
| NPC-Dossier/Update-Anweisungen | 3.081 | 0 |
| NPC-Bank / Dossier-Verlauf | 3.086 | 0 |
| Character Sheet | 456 | 0 |
| World State | 916 | 0 |
| Erzähler-Vertrag | 4.088 | 4.315 |
| Lore | 1.366 | 1.366 |
| Engine-Block | 1.709 | 1.461 |
| Chat-Prosa | 4.543 | 1.792 |
| **Summe** | **25.097** | **14.786 (59 %)** |

Die Einsparung wächst mit der Kampagnenlänge. Die NPC-Bank und der Chatverlauf wuchsen vorher mit jedem Zug; jetzt sind beide begrenzt.

Im Live-Lauf mit dem SillyTavern-Standard-Preset (ohne Megumin) waren die Requests 22.700–27.800 Zeichen lang (≈ 5.300–6.500 Token), stabil ab Zug 4.

### 6.2 Output-Token vorher / nachher

**Vorher:** Testrun 4, 15 Antworten mit Usage, Mittel pro Zug:

| Teil | Token | Anteil |
|---|---:|---:|
| Reasoning | 924 | 40 % |
| Tracker-Blöcke (`<Blocks>`) | 725 | 31,5 % |
| Prosa | 540 | 23 % |
| Fakten-Report | 115 | 5 % |
| **Summe** | **2.304** | |

Davon betrafen 77 Reasoning-Token (8,3 % des Reasonings) die Tracker.

**Nachher** (dieselben Antworten ohne Blöcke und ohne Tracker-Reasoning): ≈ **1.502 Token** pro Zug (−35 %). Prosa ist dann ≈ 82 % des sichtbaren Outputs, vorher 39 %.

**Dauer** (Regression aus Testrun 2–4: −9,5 s + 53,2 s je 1.000 Output-Token + 1,01 s je 1.000 Prompt-Token, R² 0,96): ≈ 134 s → ≈ 85 s pro Zug.

**Einschränkung:** Das ist gerechnet. Ein echtes Modell wurde nach V3 nicht gemessen, denn der Live-Smoke nutzt einen geskripteten Erzähler. Der Output-Gewinn entsteht erst, wenn Megumin die Blöcke nicht mehr anfordert. Bis dahin entfernt die Engine sie nur; geschrieben (und bezahlt) werden sie trotzdem. Test 5 misst das.

---

## 7. Tests (172, alle grün)

| Auftrag | Tests |
|---|---|
| §32 Kampf | `tests/unit/rules.test.js`:<br>- legaler Angriff trifft, 300 Angriffe ohne Fehlschlag und ohne Crit<br>- Core-#11-Beispiele<br>- Hinterhalt ×1,5 für Alaric und Monster, jeder Mehrfachtreffer<br>- Partial Cover −25 % und die beiden Ausnahmen<br>- Verteidigungs-Skills −25/−25/−20 %<br>- Focus Aim/Feint +35 %<br>- Initiative ohne PER, unparteiischer Gleichstand<br>- PER 1 gegen PER 20 identisch<br>- Ranger-Werte auf Level 1 gleich<br>- illegale Angriffe ohne Kosten<br><br>`content.test.js`: kein `hit_mod`, `hit_pp` oder `incoming_hit_penalty` mehr |
| §33 NPC-Persistenz | `tests/scenarios/npc_record.test.js` (9):<br>- beiläufiger NPC<br>- wiederkehrender NPC mit kompaktem Record<br>- Rückkehr nach 40 Zügen<br>- Agenda-Lebenszyklus<br>- Schwelle für bedeutsame Erinnerung<br>- Wissens-Leck<br>- Haltung ohne Drift<br>- `traits` nur einmal<br>- verworfener Swipe hinterlässt keinen Kanon |
| §34 Charakter-HUD | `tests/unit/hud.test.js`:<br>- jede Zeile aus dem Zustand<br>- Coin, Items, Quest und Gildenrang aus einem Report<br>- Effekte im Kampf<br>- Level-up<br>- Gildenrang-Validierung |
| §35 Welt-HUD | `hud.test.js`:<br>- Zeit, Ort, Wetter<br>- Kommen und Gehen<br>- Quests, Fristen<br>- Ortsstatus<br>- Kampf Anfang und Ende<br>- Spoiler-Regel |
| §36 Drift | `hud.test.js`: falsche Coins, HP, STA, Queststatus und Position in Prosa und altem Block ändern nichts; Korrekturen werden genannt |
| §37 Rückwärtskompatibilität | `tests/scenarios/runtime_v3.test.js`:<br>- Testrun-4-Chat mit Megumin-Blöcken faltet und läuft weiter<br>- Kampf mitten in der Runde vor V3 gespeichert<br>- Projektion lässt den gespeicherten Chat unberührt<br><br>`display.test.js`: alte MISS-Zeilen |
| Prompt | `runtime_v3.test.js`:<br>- Projektion und Fenster<br>- neue Antwort mit Blöcken<br>- situatives Schema<br>- Alarics Zeile je Zugtyp<br>- Engine-Block < 1.400 Token<br>- RELEVANT ohne Kartenfakten |
| Regression | Testrun 1–4 auf V3 umgestellt. Der TR4-Kellerkampf endet jetzt in Runde 1: Ratte beißt 3, Power Shot 35. |

## 8. Browser-Smoke

**Gemockt** (`node tools/browser_smoke.mjs`, Chromium mit nachgebautem SillyTavern-Kontext): **OK**.
- Alle bisherigen Checks.
- Neu:
  - `hud`;
  - `trackersRemoved`;
  - `hudNotInPrompt`;
  - `historyWindow`;
  - `settingsUi`.

**Live in echtem SillyTavern 1.19.0** (`tools/st_live/`): **LIVE SILLYTAVERN SMOKE: OK**.

Setup:
- echte Karte (Vertrag 3.3 als Beschreibung, Lorebook v0.11 als Character Lore);
- Extension und beide Regex-Skripte;
- Streaming an;
- ein geskripteter, streamender OpenAI-kompatibler Erzähler auf Port 5001.

Gespielte Züge:
1. Klassenwahl;
2. Skills;
3. Torwache: beiläufiger NPC; die Antwort enthält absichtlich Megumin-Blöcke;
4. Gildenhalle: Kest und Serah, Questbrett;
5. Gespräch mit Kest: Agenda, Haltung −15, bedeutsame Erinnerung;
6. Registrierung: −2 Silber, Gildenrang Novice, Quest angenommen;
7. Weg in den Salzkeller: Ratte ahnungslos;
8. Hinterhalt mit Power Shot: `48 damage AMBUSH CRIT ×1.5 → the big rat HP 16 - 48 → 0 DEFEATED`;
9. Rückkehr zur Gilde: +5 Silber, Quest erledigt, +15 XP;
10. `#status`.

| Check | Ergebnis |
|---|---|
| kein Report und kein Tracker-Block in irgendeinem Streaming-Frame | ✓ |
| HUD (2 Panels, gestylt) unter jeder Antwort | ✓ |
| kein Tracker-Text in gespeicherten Antworten | ✓ |
| Engine-Block in jedem Request | ✓ |
| weder Tracker noch HUD in irgendeinem Prompt | ✓ |
| Verlaufsfenster ≤ 4 Spielernachrichten | ✓ |
| Hinterhalt-Crit angezeigt | ✓ |
| `#status` ohne LLM-Aufruf | ✓ |
| keine Seitenfehler | ✓ |

Ausführen:
```
AVERETH_ST_DIR=/pfad/zu/SillyTavern npm run smoke:st
```
Voraussetzungen: SillyTavern einmal gestartet, Playwright. Ergebnis, Requests, letzter Prompt und `hud.png` landen in `<ST>/avereth_live_smoke/` oder in `AVERETH_ST_OUT`.

Der Live-Smoke prüft Host, Prompt-Aufbau, Streaming und Anzeige. Prosaqualität und das Verhalten eines echten Modells prüft er nicht; das ist Test 5.

---

## 9. Megumin V10 Shura: manuelle Änderungen

Grundlage ist der sichtbare Prompt aus Testrun 4, Request zu Zug 10. Die Positionen gelten für das Preset „Megumin V10 Shura“ in dieser Kampagne.

### ENTFERNEN / DEAKTIVIEREN

1. **`### NPC DOSSIER:`, vollständig.**
   - Von `### NPC DOSSIER:` (direkt nach `</content>`) bis vor `### NPC UPDATES:`, ≈ 11.300 Zeichen.
   - Enthält:
     - `trigger` mit DOSSIER EXCLUSION VETO;
     - Format, Template, Guidelines;
     - `persistent_fields_rule`, `eligibility_rule`, `knowledge_rule`, `inference_rule`, `inner_circle_rule`, `secrets_rule`, `canon_lock_rule`, `mechanical_authority_rule`, `update_consistency_rule`;
     - Image-Tags.
2. **Die eingefügte Zeile `[CRITICAL RULE: DO NOT generate a dossier for the following already-known or ignored characters: …]`**, direkt vor `### NPC UPDATES:`.
3. **`### NPC UPDATES:`, vollständig.**
   - Von dort bis vor `<banlist>`, ≈ 1.300 Zeichen.
   - Enthält `trigger`, `updatable_fields`, `operations`, `locked_fields` und das `<NPC_Update>`-Template.
4. **Die NPC-Bank.**
   - Sie fügt `[RELEVANT NPCs] The following are details of known NPCs … <retrieved_npcs> … </retrieved_npcs>` ein, in Testrun 4 innerhalb von `<character_sheet>` nach dem Vertrag.
   - Deaktivieren, und dazu alles, was `<New_NPC>`/`<NPC_Update>` in diese Bank schreibt: das Megumin-NPC-Lorebook oder das Skript bzw. die Extension dazu.
   - Die Engine-Karten ersetzen sie.
5. **Im Thinking-Prompt** (System-Nachricht in Tiefe 1, beginnt mit `## your thinking steps:`):
   - Den Abschnitt von `## At the end of your response, output exactly one <Blocks> section.` bis einschließlich `</Blocks>` löschen.
   - Das sind die Templates für `<World_State>`, `<Character_Sheet>` (mit Carry-forward- und Zahlenregeln), `<New_NPC>` und `<NPC_Update>`.
   - `## final reminder:` direkt danach bleibt.
6. **Megumin-Regex-Skripte, die `<Blocks>` einklappen oder rendern:** Deaktivieren ist optional, denn es kommen keine Blöcke mehr.
   - Das Avereth-Übergangsskript (`avereth_hide_tracker_blocks.json`) kann danach auch aus.
7. **Max Response Length senken.** Ohne Blöcke reichen meist 4.096 Token, bei Reasoning „high“ 6.000.

### BEHALTEN

- Die Einleitung „You are a skilled narrative author … acting as the Narrator“, `<Characters>` (Protagonismus, canon) und `<ANTI-OMNISCIENCE>`.
- **`<dialogue>`**, mit einer Änderung unter „Voice & Register“:
  - alt: „Base each NPC's lines on their character sheet's example dialogue if available“;
  - neu: „Base each NPC's lines on the voice and look given in the engine's NPC card (or the character sheet's example dialogue, if any)“.
- `<narration>`, `<story>`, `<world>`, `<content>` und `<banlist>` (die Wortliste; `ledger` ersetzt die Engine ohnehin).
- **Im Thinking-Prompt:**
  - `<think>` mit den 7 Punkten;
  - `## FORMATTING RULES:`;
  - `response_shape`, mit einem Zusatz am Ende: „Outside combat only: in a fight the engine's combat silence decides (no one speaks).“
  - `<config>` (Genre, Kultur, Epoche, POV, Tempo, Länge);
  - `## final reminder:`;
  - `[LANGUAGE RULE]`.
- `<user_persona>` (Alaric).
- In `<character_sheet>`: die Kartenbeschreibung (Vertrag 3.3) und die Lore.

**Kein neues Megumin-Ersatzmonster:** Es gibt kein neues Preset, keinen neuen Dossier-Ersatz im Prompt und kein zweites Tracker-Format. Die Engine hält den Zustand, das HUD zeigt ihn, der Report meldet nur Deltas.

---

## 10. Bekannte Probleme

1. **Output nicht mit echtem Modell gemessen.** Die −35 % sind gerechnet. Solange Megumin die Blöcke anfordert, schreibt das Modell sie weiter; die Engine entfernt sie nur. Test 5 misst mit geänderter Preset-Datei.
2. **NPC-Karten sind nur so reich wie die Reports.** Meldet der Erzähler `traits`, `occupation`, `voice` oder `agenda` nicht, bleibt die Karte dünn. Die Engine erfindet nichts. NPC CONTINUITY im Vertrag fordert die Meldungen an; ob GLM oder Gemini das zuverlässig tun, zeigt erst Test 5.
3. **Verlaufsfenster 4.**
   - Wörtliche Rückgriffe auf ältere Dialoge gehen verloren. Inhaltlich tragen Erinnerungen, Fakten, Karten und RELEVANT.
   - Einstellbar; 0 = ganzer Verlauf.
   - Wer Prompt-Caching nutzt: Das Fenster verschiebt sich jeden Zug, der Präfix bleibt nur bis zum Verlauf stabil.
4. **RELEVANT kann triviale Spielerzeilen enthalten** („I walk into town …“), höchstens 3.
5. **Der Report-Teil des Engine-Blocks bleibt der größte Posten** (≈ 560 Token in Geschichtszügen, ≈ 280 im Kampf).
6. **Vertrag +5 %** durch NPC CONTINUITY. Netto spart der Prompt trotzdem 26–41 %.
7. **Alte Nachrichten behalten ihren Blocktext** in `mes`: gespeichert und angezeigt wie vorher. Aus dem Prompt verschwindet er; aus der Anzeige nur mit dem Übergangs-Regex.
8. **Monster-Ausreißer** Oger, Hirsch und Pferd (Abschnitt 1.9) sind bewusst nicht korrigiert.
9. **Ohne die Regex-Skripte** ist der Report während des Streamings kurz sichtbar, bis die Antwort fertig ist.

## 11. Zurückgestellt

- ATK-Korrektur für Oger 18 → 15, Hirsch 7 → 6 und Pferd 8 → 7, dazu Elite-ATK 1,20. Erst nach Test 5.
- Entscheidung über die Schadensvarianz: nach Test 5.
- Megumin-Basis weiter kürzen (≈ 5.800 Token Stil, Bannliste, Thinking). Das gehört nicht zu dieser Aufgabe.
- Prompt-Caching und stabiler Präfix.
- Gildenbeförderung als eigene Mechanik mit Prüfungen und Quest-Zählern. Heute ist der Gildenrang ein validierter Fakt.
- Die Kategorie-C-Felder (Off-Screen, Arc/Scene Phase, Mood) bleiben draußen, bis ein Test zeigt, dass sie fehlen.
