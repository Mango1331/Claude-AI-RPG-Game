# Patch 9C-1: Deterministischer Skill-Erwerb und Training (4.3.0-c.6.6.40 / Reviewkorrektur .41)

Erster Teil von Patch 9C auf der Basis von 9B-1/9B-2. Plan: `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md` §1a.2b (main `e4d1f00`). Alles Neue gilt nur unter Regelstand 2 und nur auf dem Planner-Pfad (C).

**Nicht Teil von 9C-1:**
- Skill Stones und Lernmaterial (9C-2), Durchbrüche, Schmiede;
- Skill- und Klassenevolution, NPC-Signaturen, E-Rang;
- Burn/Slow, Runner-Änderungen.

## 1. Module

| Modul | Aufgabe |
|---|---|
| `src/skill_composer.js` | Baut aus Hauptfunktion, Disziplin-Tags und Aspekten genau eine Definition (C1, F-Rang). Kein Katalog fertiger Skills, keine neue Effektart. Gebucht wird über `defineSkill` (Validator von 9B-1); danach ist die Definition fest. |
| `src/v4/growth.js` | Lernziele, Sessions, Tageskonto, Kampf-LP, Training bekannter Skills, gemeinsamer Abschluss, Reducer, `#skills`-Zeilen. Reine Funktionen, kein LLM. |

**Zahlen** liegen zentral und vorläufig in `rules.json`:

| Abschnitt | Werte |
|---|---|
| `growth` | max. 3 offene Ziele · LP/Stunde Lehrer 20, selbst 10 · Tageskappe Lehrer 40, selbst 20 (vor Affinität) · Kampf 12 LP · Training bekannter Skills 12 PP ab 60 min/Tag |
| `composer` | Funktionen, Tag→Stat, Namenswörter |

Benötigte LP: `proficiency.learning_progress` (C1 100).

**Composer-Funktionen**

| Funktion | Kategorie | Tags | Werte | Kosten |
|---|---|---|---|---|
| `strike` | Offensive | Martial, Precision, Mobility | ENGAGED, Base 10, Stat × 1.5, physisch | 6 STA |
| `bolt` | Offensive | Arcane, Control | MEDIUM, Base 10, Stat × 1.5, magisch | 7 MP |
| `guard` | Defensive | Defense, Martial | `temp_def` 4 + ⌊VIT × 0.5⌋ | 5 STA |
| `ward` | Defensive | Arcane, Control, Defense | `barrier` 5 + ⌊WIL/INT × 1.2⌋ | 6 MP |
| `mend` | Utility | Control, Arcane, Defense | `heal` 6 + ⌊Stat × 0.8⌋ | 7 MP |

Alle Werte liegen innerhalb `skill_design.f_rank` und der Effektgrenzen aus `src/skills.js`; ein Test validiert jede Funktion mit jedem Tag.

**Namen und IDs**
- Name: Aspektwort (Fire → Ember …) oder Tagwort (Arcane → Runic …) plus Nomen, z. B. „Ember Bolt“.
- Bei Kollision mit statischen oder irgendeinem dynamischen Skill der Kampagne (auch einer späteren NPC-Definition) folgt „II“ … „X“.
- ID `dyn.<name>`, bei Kollision `_2` … `_9`. Beides deterministisch.

## 2. Planner und Quellen

**Vokabular `cmd-1.1`:** `activity` erhält vier optionale Argumente.

| Argument | Inhalt |
|---|---|
| `learn` | KNOWN-SKILL-ID, LEARNING-ID oder Technik `strike|bolt|guard|ward|mend` |
| `teacher` | Person aus PRESENT |
| `tags` | Disziplinen |
| `aspects` | Aspekte |

Schema, Kontext (Liste `LEARNING`), Parser und Mapping sind konsistent:
- `parsePlan` lehnt Lernargumente außerhalb von `train`/`study`, unbekannte Ziele und unbekannte Tags/Aspekte für die Repair-Runde ab.
- In Legacy-Kampagnen ignoriert die Engine die Argumente; der Validator meldet dort nichts.
- `LEARNING_RULES` im Planner-Prompt mit Beispielen.
- `PLANNER_VERSION` bleibt `plan-c0.1`, weil der Runner (`tools/st_live/run_c.mjs`) diesen Wert prüft und Runner-Änderungen ausgeschlossen sind.

**Agency-Guard:** Neue Regel `wish`. „I'd like to learn …“, „I want to learn …“, „teach me …“ und „show me how …“ buchen nichts. Fragen und Pläne fallen wie bisher unter `question`/`plan`. Nur ein tatsächlicher Lernakt mit Dauer bucht.

**Quelle (nur Lehrer-Pfad), geprüft von der Engine:**
1. **Anwesend:** in `scene.present`, nicht tot.
2. **Kompetent:** im Kampf trainiert (Sheet, sonst Template); jeder Disziplin-Tag der Technik muss durch Klassen-Affinität > 1 oder einen bekannten Skill dieses Tags gedeckt sein. Ein passender Zweittag legitimiert keine fachfremde Disziplin. Ein Händler, Bauer oder untrainierter Jäger lehrt nichts.
3. **Zusage:** eine gekaufte Trainingsleistung dieser Person (`service.granted` mit `training`), die noch kein Ziel verbraucht hat, oder der Fakt `teaches` → Alaric.
   - Der Extraktor meldet diesen Fakt nur bei klarer Zusage; neue Regel in `deltas.json`, `delta-1.0`.

Die Evidenz (Basis, Schlüssel, Zug, Minute) wird am Ziel gespeichert, weil die Services-Ansicht kurz ist und kein Thema hat. Es gibt kein `growth.source`/`growth.hint`-Delta.

**Ohne gültige Quelle:** Ablehnung, keine Zeit, nichts gebucht. Ohne Dauer: Rückfrage (Panel), nichts gebucht.

## 3. Ziele und Fortschritt

**Zustand** `state.growth` (entsteht mit dem ersten Event):
- `goals`: id, target {fn, tags, aspects}, source, zusätzlich gebundene `teachers`, lp, need, status `active|ready`, `days` (die letzten zwei Spieltage), `fights` (begrenzt);
- `done`: kompakt, begrenzt;
- `training`: Minuten bekannter Skills pro Tag.
- `used_services`: verbrauchte Trainingsschlüssel, beschränkt auf die noch vorhandene kurze Services-Ansicht. Das Kürzen von `done` macht eine Zahlung nicht erneut verfügbar.

**Events** (Ownership-Art `pc.progress`, nur Engine; Fingerabdruck enthält `s.growth`): `growth.opened`, `growth.session`, `growth.progress`, `growth.closed`.

**Tageskonto pro Lernziel und Spieltag**
- Anspruch = ⌊min(Kappe Lehrer, Lehrer-LP + min(Kappe selbst, Selbst-LP)) × höchste Affinität⌋.
- Gutschrift = Anspruch − bereits gutgeschrieben; gedeckelt auf `need`.
- Daraus folgt:
  - Geteilte Sessions geben nie mehr als eine lange (3 × 40 min = 120 min = 60 LP für einen Mage).
  - Lehrer- und Eigenzeit werden getrennt gezählt.
  - Über Mitternacht wird geteilt; jeder Tag hat seinen eigenen Anspruch.
  - Keine Doppel- oder Replay-Gutschrift.
- Eigenes Üben gibt es nur für ein bestehendes Ziel; ein neues Ziel braucht einen Lehrer.

**Bekannte Skills:** Training statt LP. 12 PP × Affinität einmal pro Skill und Spieltag, sobald an diesem Tag 60 Minuten erreicht sind (auch über mehrere Sessions). Schlüssel `train:<Tag>:<Skill>`.

**Kämpfe**
- `fightGrowth` läuft in `endEncounterEvents`, also auf dem gemeinsamen Pfad aller endenden Kämpfe, auch solcher aus `openCommitted`.
- Ein Kampf zählt, wenn er auch PP qualifiziert (`fightQualifies`, aus `fightProgress` herausgezogen) und ein benutzter Skill einen Tag mit einem offenen Ziel teilt.
- Er gibt dem ältesten passenden Ziel einmal 12 LP × Affinität; die Kampf-ID wird am Ziel vermerkt.
- Anzeige: `LEARNING +x LP` im Kampfende-Block und im Narrator-Kontext.

## 4. Gemeinsamer Abschluss

`withGrowth` in `src/v4/runtime.js` läuft nach beiden regulären `plannedTurn`-Routen (v3 und v4):
- `finalizeGrowth` scannt den Ergebniszustand nach `ready`-Zielen, unabhängig davon, wann sie bereit wurden (Session, Kampf, Antwortpfad).
- Pro Ziel prüft es auf einer privaten Kopie: Composer → `defineSkill` → `learnSkill` → `growth.closed`. Es bucht alles oder nichts.
- Die Events kommen vollständig in denselben Message-Record vor das `outcome.recorded`, dessen Outcome `learned` (bzw. `learn_failed`) erhält.

**Es bucht nichts:**
- bei Panels, Rückfragen und fehlgeschlagener Planung;
- während eines Kampfes und für einen toten PC;
- in Legacy-Kampagnen.

**Fehlschlag** (z. B. alle Namen belegt): Ziel, LP und Quelle bleiben; ein späterer Zug versucht es erneut. Es gibt keinen zusätzlichen Async-Pfad und kein LLM.

## 5. Anzeige und Narrator

- `#skills` zeigt `LEARNING:` mit Ziel, Quelle und LP.
- Neue Skills erscheinen über die bestehenden Anzeigen (`#skills`, `#skill`, Kontext KNOWN SKILLS).
- Der System-Block zeigt `NEW SKILL — <Name> (<Kategorie> · <Kosten>) · learned from <Lehrer>`.
- Narrator-Kontext: Zeile `NEW SKILL — booked by the engine in this turn …`. Aktivitätszeilen sagen „no new Skill“, solange das Ziel offen ist.
- `content.10.r2`: neuer Abschnitt „SKILL ACQUISITION IN PLAY“. `content.6.r2` sagt, dass die Engine neue Skills komponiert.
- Narrator-Vertrag v4 (Revision `4.3.0-c.6.6.40`): Ein neuer Skill wird nur erzählt, wenn die Engine ihn als NEW SKILL nennt.
- Passives, Skill- und Klassenevolution bleiben gesperrt.

## 6. Tests und Grenzen

`tests/v4/patch9c1.test.js` deckt ursprünglich diese 12 Fälle ab (mit Reviewkorrektur .41 insgesamt 17):

| Test | Inhalt |
|---|---|
| A | Offensiver Erwerb über zwei Tage mit Tageskappe, danach Einsatz im Kampf |
| B | Defensiver Erwerb über einen Fakt-Lehrer, danach Einsatz im Kampf |
| C | PP-Training, auch geteilt |
| D | Ungültige Quellen: abwesend, untrainiert, ohne Zusage, ohne Meisterschaft, unbekannt, keine; ohne Dauer; Service nur einmal |
| E | Wünsche, Bitten, Fragen; Validator |
| F | Geteilte Zeit, gemischte Arten, Mitternacht |
| G | Route v3 (Kampfende), Route v4 nach Bereitschaft im Antwortpfad, Panel, fehlgeschlagene Planung |
| H | Atomarer Abschluss |
| I | Namenskollisionen und Validität aller Funktionen |
| J | Regenerieren, Reload, Replay |
| K | Legacy und Ownership |

`validateState` prüft die Ziel-Invarianten.

**Grenzen**
- Nur C1 und F-Rang.
- Nur der Lehrer-Pfad für neue Techniken.
- Zahlen sind vorläufig.
- Eine Trainingsleistung öffnet genau ein Ziel; ein Fakt `teaches` gilt für alle Ziele dieses Lehrers.
- Ein zusätzlicher Lehrer braucht eine eigene Zusage; diese wird am Ziel gebunden. Weiteres Training desselben Ziels benötigt keine zweite Zahlung, andere Ziele dürfen die gebundene Zahlung nicht wiederverwenden.
- Live-Ergebnisse liegen nicht vor.

## 7. Reviewkorrektur .41

Ausgangsbasis: `d0808eb` (.40). Vier begrenzte Korrekturen in `src/v4/growth.js`, keine neuen Module oder Eventtypen:

- Tagesabschnitte werden einzeln gebucht und ausgewertet, bevor das Konto gekürzt wird. Eine mehrtägige Einheit gibt dieselben LP wie die entsprechende Aufteilung.
- PP-Gutschriften verwenden jeweils den bereits fortgeschriebenen Skillstand; zwei Übungstage können auch eine Promotion korrekt überschreiten.
- Der Lehrer muss alle beanspruchten Disziplinen abdecken.
- Zusagen zusätzlicher Lehrer bleiben am Ziel nachvollziehbar und werden nicht für andere Ziele frei. Ein begrenzter Index verhindert die Wiederverwendung nach dem Kürzen abgeschlossener Ziele; vorhandene .40-Events werden weiter gefaltet, ohne historische LP-/PP-Werte neu auszurechnen.

Fünf neue Regressionen waren auf .40 rot und sind mit .41 grün. Gezielte Suite: **17/17**; vollständiges `npm test`: **1147/1147** (hier ausgeführt). Kein neuer Browser-Smoke oder LLM-Livetest. Narrator-Vertrag bleibt Revision .40, da unverändert. Zahlen, Planner, Runner und Scope von 9C-2 bleiben unverändert. Unabhängiges Claude-Gegenreview steht aus.
