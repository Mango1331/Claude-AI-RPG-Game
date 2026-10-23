# Patch 9C-2c: Passive-Erwerb in drei Qualitätsstufen (4.3.0-c.6.6.49)

Basis `b4dae52` (.48). Umsetzung des freigegebenen Designs auf `main`:
- `02_DESIGN_KANON.md`, „Kanonische Passive-Lore und Qualitätsstufen“;
- `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md`, „FREIGEGEBENES GAME-DESIGN: Ordinary / Rare / Legendary Passives“.

Gilt nur unter Regelstand 2 und auf dem Planner-Pfad (C). Es gibt eine Passive-Engine für alle Qualitäten: dieselbe Definition, derselbe Besitz, dieselben Events und dasselbe Replay.

**Nicht Teil von 9C-2c:**
- Weltzeit-Buffs, Debuffs, Statusmaschinen;
- reaktive Effekte (Gegenangriff, Spell Echo) und Welt-Passives;
- Passive-Stone-Drops, Auktionen, Händlerwirtschaft;
- automatische Legendary-Belohnungen;
- Passive-Evolution, Klassen-Evolution, zusätzliche B-Rang-Plätze;
- endgültiges Balancing (10B).

## 1. Qualität, Budgets, Grenzen (`src/passives.js`, `rules.json passive_design`)

**Qualität:**
- Ein Passive hat `quality: ordinary | rare | legendary`.
- Die Qualität ist unabhängig vom Rang. Definitionen bleiben technisch `rank: F`.
- Ein Passive aus 9B-2 ohne Qualität behält seine damaligen F-Grenzen (`unrated`).

**Budget je Passive** (provisorisch, aus Datei 04):

| Effekt | Ordinary | Rare | Legendary | Summe je Wert |
|---|---:|---:|---:|---:|
| `core_stat_bonus` | +2 | +3 | +4 | +6 |
| `stat_bonus` (ATK/MATK/DEF/MDEF) | +2 | +4 | +6 | +10 |
| `max_bonus` (HP/MP/STA) | +10 | +25 | +50 | +80 |
| `cost_reduction` | 5 % | 10 % | 15 % | 30 % |
| `resist` | 5 % | 10 % | 15 % | 30 % |
| Anzahl Effekte | 1 | 1–2 | 1–3 | – |

**Summengrenzen:**
- Die Summen gelten für alle Qualitäten gemeinsam, auch für bedingte Passives im Kampf.
- Sie haben die bisherigen 9B-2-Summen (4/20/20/20) ersetzt.

**Keine Nullwirkung:**
- `passiveGain` berechnet je Effekt, was ein neues Passive gegenüber dem jetzigen Bestand tatsächlich hinzufügt. Bei einem Austausch rechnet es ohne das gewählte alte Passive.
- Ein Kandidat lässt Effekte ohne Zuwachs weg.
- Ein Kandidat, dem dann nichts mehr bleibt, wird nicht angeboten.

**Vier Plätze:**
- Eine Person hält höchstens vier Passives, aller Qualitäten zusammen. Das gilt für PC und NPCs (`gainPassive`, `validateState`).
- Ab B-Rang gibt es vorerst keine weiteren Plätze.
- Ein abgelegtes Passive kann nicht zurückgewonnen werden.

## 2. `core_stat_bonus`

**Grundsatz:**
- `effectiveStats(sheet)` ergibt die verteilten Stats (`sheet.stats`, unverändert) plus die Core-Boni der Passives, gedeckelt.
- `sheet.stats`, Level-up, freie Punkte und Favored Stats bleiben unberührt.
- Der Bonus ist nur mit `scope: always` erlaubt.

**Wo er wirkt** (jede Lesestelle eines Core-Stats):

| Bereich | Stelle |
|---|---|
| Abgeleitete Werte (HP, MP, DEF, MDEF, Initiative) | `src/derived.js` |
| Kampf-Snapshot (Skill-Skalierung, Effekte) | `src/combat.js characterCombatant` |
| Restore- und Heal-Effekte außerhalb des Kampfes | `src/engine.js` |
| World-Skill-Proben | `src/engine.js` |
| Stealth und Entdeckung | `src/checks.js` |
| Suche | `src/v4/commands.js` |
| Hindernisse | `src/v4/features.js` |
| Prüfung erzählter Proben | `src/delta.js` |
| `#skill` (Raw Power, Effekte) | `src/commands.js` |

**Anzeige:** `#status`, HUD und Kontext zeigen „INT 8 (6 +2)“.

## 3. Belege, Angebote, Entscheidung (`src/v4/passive_growth.js`)

**Beleg** (`growth.evidence`, in `state.growth.evidence`):
- Eine Entwicklung, die die Engine selbst festgestellt hat, einmalig je Schlüssel.
- Ein Beleg bleibt dauerhaft gespeichert, auch nach Annahme, Ablehnung oder einem verlorenen Würfelwurf. Derselbe Beleg wird also nie erneut angeboten oder gewürfelt.

**Kandidat und Angebot:**
- Zeitpunkt: der erste reguläre Planner-Zug, dessen Zustand außerhalb eines Kampfes liegt (`runtime.js withGrowth`, nach den Skills).
- Die Wirkung komponiert die Engine deterministisch aus dem Beleg, mit dem vollen Budget der Qualität.
- Name und Flavor kommen aus einer eigenen Forge-Anfrage (nur Name und Flavor, Passive-Validator, eine Reparatur, sonst fester Fallback-Name). Wiederverwendung über Schlüssel und Hash, also kein zweiter Aufruf bei Regenerate.
- Das Angebot ist eine `decision` der Art `passive` mit `at: null`, also nicht ortsgebunden, dazu `growth.offered`.
- Das Angebot verleiht nichts und verfällt nicht. Es bleibt in `#passives`, `#class`, HUD, Planner-Katalog und Narrator-Kontext sichtbar.
- Ein Ordinary-Beleg wird nur angeboten, solange ein Platz frei ist.

**Entscheidung** (Planner-Befehle `passive.accept`, `passive.decline`; Vokabular `cmd-1.3`):
- **Annahme:**
  - nie in einem Kampf;
  - in einen freien Platz; bei vier belegten Plätzen nur Rare oder Legendary und nur gegen ein ausdrücklich benanntes Passive (`replace`);
  - Ordinary ersetzt nie ein anderes Passive;
  - bei freiem Platz wird nichts ersetzt;
  - erneute Prüfung von Quelle, Platz, Budget und Summen nach dem Austausch sowie eines gebundenen Steins.
- **Buchung:** auf einer privaten Kopie geprüft, dann alles zusammen: `passive.defined`, gegebenenfalls `passive.lost`, `passive.gained`, gegebenenfalls `object.consumed`, `growth.decided`, `decision.closed`. Scheitert ein Schritt, bleibt alles wie zuvor: altes Passive, Stein und Angebot.
- **Ablehnung:** `growth.decided declined` und `decision.closed`. Der Beleg ist entschieden; ein gebundener Stein bleibt unverbraucht.
- **Agency-Guard:** Fragen, Verneinungen und Pläne lösen keine Annahme aus (Commitment-Befehle).

**Austausch** (`passive.lost`):
- Das alte Passive verliert sofort jede Wirkung.
- Seine Definition bleibt erhalten, ebenso ein Eintrag in `sheet.passive_history` mit `replaced_by`.
- Es gibt kein Umskillen und keinen Wiedererwerb desselben Passives.

## 4. Quellen

**Ordinary: gezieltes Training** (`growth.js passiveActivity`):
- Auslöser: `activity train/study` mit `learn` = ein Core-Stat (STR, VIT, AGI, INT, PER, WIL), oder die ID des Ziels.
- Es entsteht ein Lernziel `target {passive: 'ordinary', stat}` auf dem vorhandenen Kern: Sessions, Tageskonto, Eigenrate 10 LP/h, Tageskappe 20.
- Ohne Lehrer, ohne Kampf-LP, ohne Affinität. Ein genannter Lehrer zählt als Eigenübung.
- Bedarf `growth.passive.ordinary_need` = 200 LP, also mindestens zehn Spieltage.
- Abgelehnt schon beim Anlegen, wenn
  - alle Plätze durch gehaltene Passives, offene Passive-Ziele und offene Ordinary-Angebote belegt sind;
  - oder die Passives den Stat bereits bis zur Summengrenze anheben.
- Nach Abschluss: `growth.closed` mit Beleg `train:<ziel>` und im selben Schritt das Angebot. Ein Passive wird dabei nie direkt vergeben.
- Wirkung: `core_stat_bonus` des Stats in Höhe des Ordinary-Budgets (+2).

**Rare: außergewöhnliche Kampferfahrung** (`trialEvidence`, am Kampfende in `combat.js endEncounterEvents`):
- `skills.js noteUse` hält fest:
  - HP beim ersten Treffer eines Gegners;
  - die tiefste HP nach einem Gegnertreffer;
  - die Gegner, die ihn trafen;
  - den Schaden nach Art.
- Nur Treffer von Gegnern zählen, also keine selbst verursachte Verletzung.
- **Sicherer Fall** (`growth.passive.trial`):
  - lebend gewonnen, nicht geflohen;
  - ein Gegner mindestens 5 Level über ihm, der ihn traf, wurde besiegt;
  - Start mindestens 50 % HP;
  - Tiefstwert höchstens 25 %;
  - ein eigener Skill wurde eingesetzt.
  - Ergebnis: verlässlich ein Rare-Beleg.
- **Grenzfall** (mindestens 3 Level, höchstens 35 %):
  - ein einziger Wurf aus `hash32(seed | Beleg)`, 40 % Chance;
  - Wurf und Ergebnis bleiben am Beleg gespeichert (`failed` oder offen);
  - stabil bei Reload, Replay, Regenerate und Swipe.
- Der Kampf-Snapshot wird nie verändert; im Kampf entsteht nur der Beleg.
- **Wirkung:** bei Gefahr unter halben HP (`hp_at_most_pct 50`): DEF +4 und physische Resistenz 10 %, bei überwiegend magischem Schaden MDEF und magische Resistenz. Ersatzweise Max HP +25.

**Legendary und Passive Stones:**
- `engineEvidence(state, content, {key, quality: rare|legendary, effects, scope, condition, object?})` ist die einzige autorisierte Quelle. Sie ist im Code eine Engine-Funktion und nicht über Erzählung, Extraktor oder Angebote erreichbar.
- Sie wird gegen das Budget der Qualität validiert.
- Ein gebundenes Objekt (ein künftiger Passive Stone) wird nur mit der erfolgreichen Annahme verbraucht.
- Eine allgemeine Erzeugung (Drops, Auktionen) gibt es noch nicht.
- Ein Ding, das die Erzählung oder ein Angebot „Passive Stone“ nennt (`passive_stone_words`):
  - ist nie eine Skill-Quelle, auch nicht mit `teaches`;
  - sein `use` wird abgelehnt: keine Wirkung, kein Beleg.
- Ordinary Passive Stones gibt es nicht. Aktive Skill Stones aus 9C-2b bleiben unverändert.

## 5. Texte und Anzeigen

**Narrator-Kontext:**
- `POSSIBLE PASSIVE — … NOT his yet …` (nur ein Angebot, keine Veränderung erzählen);
- `NEW PASSIVE — booked by the engine …`;
- `NO PASSIVE YET` (Training abgeschlossen, aber kein Platz frei);
- in der Charakterzeile: „Offered to him, NOT his“.

**System-Block:** dieselben drei Meldungen.

**Befehle und HUD:**
- `#passives` (neu): `PASSIVES — 2/4`, jedes Passive mit Qualität und Wirkung, offene Angebote mit ihrer Wahl, abgelegte Passives;
- `#class`: zusätzlich „Passive slots: n/4“;
- HUD: Zeile „Passives“.

**Planner:**
- Katalog: `PASSIVES (n/4 slots)` und `POSSIBLE PASSIVE`, mit IDs für `offer` und `replace`;
- Lernregel für Core-Stats und zwei Beispiele.

**Vertrag und Regeltext:**
- Narrator-Vertrag v4, Revision **4.3.0-c.6.6.49**: „He gains no Passive“ ersetzt durch „ein Passive nur, wenn die Engine NEW PASSIVE nennt; POSSIBLE PASSIVE ist ein Angebot; Segen, Trank oder Tat sind kein Passive“. Die persönliche ST-Karte ist zu aktualisieren; der Live-Runner übernimmt den Vertrag in sein isoliertes Profil.
- `content.10.r2` hat einen neuen Absatz „PASSIVES IN PLAY“.

## 6. Tests und Grenzen

`tests/v4/patch9c2c.test.js` (9 Tests, Host-Pfad mit geskriptetem Planner, Extraktor und Forge):

| Nr. | Inhalt |
|---|---|
| 1 | Training INT, zehn Tage: Angebot, Annahme; INT +2 in Max MP, `#skill` Raw Power, Kampf-Snapshot und Bolt; Reload |
| 2 | Echter Kampf gegen einen Wolf 5 Level höher bis 13 % HP: Beleg erst am Kampfende, genau ein Rare-Angebot, danach keines mehr; Annahme; Bedingung im nächsten Kampf; Reload |
| 3 | Grenzfall: Wurf gespeichert, Replay und Regenerate gleich, kein zweiter Wurf; Ausschlussfälle (leichter Gegner, schlechter Start, nicht gewonnen, kein Skill, geflohen, nie getroffen) |
| 4 | Ignoriertes Angebot bleibt (über Züge und Orte); ungültige Antworten, Frage per Guard, Annahme im Kampf; Ablehnung endgültig |
| 5 | Vier Plätze: Ordinary-Ziel abgelehnt; Legendary nur mit benanntem Ersatz; atomarer Austausch; keine Doppelwirkung; Historie; kein Wiedererwerb |
| 6 | Gescheiterte Buchung beim Austausch: altes Passive und Stein bleiben |
| 7, 8 | Budgets der Qualitäten und der Engine-Quelle; „Passive Stone“ aus Angebot oder Erzählung ohne Wirkung; Engine-Stein: Ablehnung behält ihn, Annahme verbraucht ihn genau einmal |
| 9 | Summengrenzen (INT +6); Kandidat ohne Nullwirkung; NPC mit vier Plätzen; Ownership der neuen Events; Legacy |
| 10 | Forge: Regenerate ohne zweiten Aufruf, Reparatur, Fallback; veralteter Host-Zug schreibt nichts |

**Weitere Teständerungen:**
- Angepasst: `tests/v4/patch9b2.test.js` (neue Summengrenzen; das fünfte Passive scheitert an der Platzgrenze).
- `tests/live_runner/patch9c2c_runner.test.js`: Forge-Aufrufe zählen als `forge` bzw. `forge_repair` (Runner-Commit).

**Grenzen:**
- Ordinary-Training nur für die sechs Core-Stats.
- Der Rare-Detektor kennt nur den gewonnenen außergewöhnlichen Kampf; Überleben ohne Sieg folgt später auf demselben Belegpfad.
- Legendary nur über die autorisierte Engine-Quelle; Passive Stones sind vorbereitet (Objektbindung, Verbrauch bei Annahme), aber ohne Verteilung.
- Eine Engine-Quelle, deren Effekte die Summen vollständig ausschöpfen, bleibt als offener Beleg liegen und wird nicht angeboten.
- Alle Zahlen sind provisorisch (10B).
