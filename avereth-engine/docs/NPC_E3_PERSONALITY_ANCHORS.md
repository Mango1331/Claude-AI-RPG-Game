# .174 — NPC E3: Persönlichkeitsanker

**Basis:** `.173` / `dec75907ce970927722b6acf6608bdfa6b20256e`. Umsetzung des freigegebenen Pakets E3 aus [`patch_plans_10b/NPC_E2_E3_FACHPLAN.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/NPC_E2_E3_FACHPLAN.md) (§2 R10, §4 E3, §7, §9, §12 C1–C6) mit den bestätigten Entscheidungen **D2, D3, D13** (§13, main `fe6642f`).

**Nicht enthalten:** E4/E5 (Salienz, `#npc pin`), Beziehungs- oder Temperamentspunkte, Änderungen an `attitude`/`relations`/`sideOf`, PULSE, Kampf, Gilde, E2-Regeln. Kein neues Event, kein neuer Modellaufruf, keine Migration alter Fakten.

## 1. Was E3 tut

| Teil | Umsetzung |
|---|---|
| **Anwesenheitsspanne** (`src/state.js`) | Abgeleitet im Fold, ohne eigenes Event. `scene.entered` einer bisher nicht anwesenden Person setzt `scene.since[id] = state.turn`, `scene.left` entfernt den Eintrag, `scene.moved` mit `reset_present` leert alle Einträge. Reisebegleiter werden am Ziel neu eingetragen und beginnen dort eine neue Spanne. Nur Runtime V4; der V3-Zustand behält seine Schlüssel. Alte Saves erhalten die Werte beim Falten ihrer Events. Die Snapshot-Region `scene` (`ownership.js`) schließt `since` ein. |
| **Prädikate** (`src/knowledge.js`) | `manner` und `interest` sind funktional, wie bisher `voice`. Synonyme über `anchorPredicate()`: `temperament`, `demeanor`, `demeanour`, `personality`, `disposition` → `manner`; `interests`, `hobby`, `cares_about`, `passion` → `interest` (siehe §2.1). |
| **R10 in World** (`src/v4/world.js`, `case 'fact'`, C-Pfad Ruleset 2, Subjekt eine NPC-Person) | `anchorRefusal()` lehnt ab, ohne Korrektur, wenn eine der folgenden Regeln greift: |
| | `anchor_absent`: Die Person ist nach den Anwesenheitsdeltas dieser Antwort nicht anwesend. |
| | `anchor_first_contact`: Es gibt keine gemeinsame Erinnerung mit Alaric aus einem Zug **vor** `scene.since[id]`; die einmalige Ersterinnerung genügt. Name, Wichtigkeit oder Absprache ersetzen das nicht (D3). |
| | `anchor_value`: Der Wert ist länger als 80 Zeichen, nennt Alaric/`pc` (keine Spielerzuschreibung, D2) oder enthält einen Engine-Teil (`stripOwned` Store `note`). |
| | `anchor_mood`: ein Situationsmarker (`now`, `tonight`, `today`, `this morning/evening/night`, `at the moment`, `currently`, `just then`, `after the fight`, `since the attack` …) oder ein reines Zustandswort (`angry`, `furious`, `tired`, `drunk` …), jeweils ohne Gewohnheitsmarker (`always`, `usually`, `habitually`, `tends to`, `never`, `every time`, `as ever`). |
| | `anchor_scope`: ein zweiter Wert desselben Merkmals in derselben Antwort, oder ein bestehender Anker wurde schon in der aktuellen Spanne gesetzt. |
| | Sonst wird der Fakt angenommen. Eine klare Beobachtung genügt (D13). Ein neuer Wert in einer späteren Spanne beendet den alten Fakt (`fact.ended`, `until`). Derselbe Wert erneut ändert nichts und wird nicht abgelehnt. |
| **Kartenkopf** (`src/context.js`, V4) | `• <Handle> — person, <Rolle>; voice: …; manner: …; interest: …; <look>`. Die 170-Zeichen-Kappe der Kompaktkarte trifft zuerst den Einführungstext. `manner`/`interest` sind Record-Prädikate (in V4 auf der Karte, nicht doppelt im Abruf). |
| **Extractor** (`content/deltas.json`) | `fact`-Summary: „voice/manner/interest of a person: only a lasting trait this reply SHOWS in their own words or conduct, which you would expect again next week; never this moment's mood, never Alaric's view of them, never invented backstory; a new value only when the reply shows a different lasting trait“. `EXTRACTOR_VERSION` unverändert (an Tests gebunden, wie in E2). |

## 2. Abweichungen und Präzisierungen

1. **Synonyme nicht global.** Der Plan nennt `PRED_SYNONYMS`. Global angewendet hätte `demeanor → manner` den Kampf-Moment eines **Wolfs** („snarling, hackles up“) umbenannt und aus dem Kampf-Scoping genommen; `fixes_4_2_1` und die Replaytests waren damit rot. Deshalb gilt `anchorPredicate()` nur für Fakten über **NPC-Personen** im World-Faktpfad und nicht für ein Synonym eines Kampfbeteiligten während eines laufenden Kampfes (dessen „demeanor“ bleibt Kampfmoment). Direkte `voice`/`manner`/`interest` sind immer geprüft; Kreaturen sind unberührt.
2. **Zwei zusätzliche Regelnamen:** `anchor_absent` (nicht anwesend) und `anchor_value` (Länge, Alaric, Engine-Teil) statt der Sammelbezeichnungen des Plans; `anchor_first_contact`, `anchor_mood`, `anchor_scope` wie geplant.
3. **V3 unverändert:** neue Kopfreihenfolge, `manner`/`interest` auf der Karte und `scene.since` nur in Runtime V4; der V3-Kartenkopf bleibt `look; voice`.
4. **Gleicher Wert** wird nicht abgelehnt (keine Ablehnungsflut bei wiederholter Meldung desselben Ankers).

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen unverändertes .173 | `tests/v4/npc_e3.test.js`: **6 von 7 rot** (C1, C2, C3, C4, C5, C5-Host). C6 (keine Haltung/Relation, `sideOf` gleich) ist der Schutzfall und auf beiden Ständen grün. C1 scheitert auf .173 schon daran, dass es kein `scene.since` gibt. Zustände aus User02 (Tam, erste Spanne seit Zug 3, einzige gemeinsame Erinnerung Zug 3) und User01 (Brenna, Spanne seit Zug 27, Erinnerungen 3/23). Alle Extractor-Antworten synthetisch. |
| Neue Regressionen | **7/7 grün:** C1 (benannter und unbenannter Erstkontakt), C2 (Brenna: Anker angenommen, Kopf `…; manner: …; <look>` ≤ 170; abwesend/Alaric/zu lang abgelehnt), C3 (Stimmung abgelehnt, Gewohnheit angenommen), C4 (ein Wert je Antwort; gleiche Spanne `anchor_scope`; Verlassen und Wiederkehr = neue Spanne, Ersatz mit `fact.ended`, `temperament` → `manner`, danach `anchor_scope`; gleicher Wert keine Ablehnung), C5 (Fold, JSON-Round-Trip, schrittweise Anwendung), C5-Host (Begleiter beginnt am Ziel neue Spanne; Anker über Parser, Regenerate, Swipe, Reload, Folgekarte), C6 |
| Angrenzend | E2-A/E2-B-Suiten unverändert grün; V3-Kartenszenarien (`npc_record`, `runtime_v3`) und das Kampf-Scoping (`fixes_4_2_1`) nach §2.1/§2.3 grün |
| `npm test` | **2977/2977** |
| Replay `.126`-Baseline | Recordvergleich gegen .173: **0 von 2235 Records geändert**; `accepted_e2b172_vs_126.json` gilt unverändert (1048/1048 exakt, 0 offen). Der Korpus enthält einen Personen-`voice`-Fakt (`b19-warrior#172`, Schreiberin, Eintritt in Zug 76 nach gemeinsamer Erinnerung aus Zug 3 → spätere Begegnung, angenommen wie zuvor) und `demeanor` nur für Kreaturen (unberührt). |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **151** wahr, keine falsch (.173: 145). Sechs neue `npc172_anchor*`-Prüfungen im echten Host (User04): Anker der Schreiberin bei der Rückkehr angenommen und `since` neu; Save/Reload mit gleichem `since`/Ankern; Regenerate genau ein Anker; Kartenkopf im nächsten Erzählerprompt; „furious tonight“ `anchor_mood`; neuer Träger mit `voice` beim Erstkontakt `anchor_first_contact` |
| ST1.19 Failsoft | `OK`, **156** wahr, keine falsch (.173: 150) |

**Kontext und Prompt** (Engine-Schätzer, Budget 1400; Spielerzüge mit ihren Befehlen auf dem jeweiligen Build neu ausgeführt):

| Messpunkt | .173 | .174 | Δ |
|---|---|---|---|
| User01 I61 / I62 / I69 | 1456 / 1504 / 1722 | gleich | 0 / 0 / 0 |
| User02 I62 / I63 / I73 | 1563 / 1457 / 1610 | gleich | 0 / 0 / 0 |
| User04 I71 / I72 / I73 | 1308 / 1693 / 1561 | gleich | 0 / 0 / 0 |
| B3 (Absprache + Erinnerung + Wissen) | 1745 | 1745 | 0 |
| Tam offen / erledigt (E2-B-Fall) | 1473 / 1484 | 1473 / 1484 | 0 / 0 (gegen .171 weiter +20 / **+47**) |
| Brenna mit 1 bzw. 3 Ankern (C2, synthetisch) | 1480, Kompaktkarte 251 | 1480, Kompaktkarte 251 | 0: Kopf bleibt 170 Zeichen, der Einführungstext wird gekürzt |
| Extractor-System (Schätzer) | 10 911 | 10 979 | **+68** (Plan ≈ +60) |

Kein neuer Prio-0-Abschnitt, keine Budgeterhöhung, 0 zusätzliche Modellaufrufe; Abruf und Absprachenzeilen unverändert. Die Originalverläufe enthalten keine Anker, deshalb ±0; die Kosten eines Ankers liegen innerhalb der Kopfkappe.

## 4. Grenzen

- **Freier Extractor/Erzähler:** Ob ein Modell nur gezeigte, dauerhafte Merkmale meldet und der Erzähler die Anker nutzt, ist nicht belegt. Smoke und Hosttest sind geskriptet; das ist keine natürliche Modellbefolgung.
- **Inhalt des Werts:** R10 prüft Begegnung, Länge, Alaric, Engine-Teil und Stimmung, nicht ob der Wert wirklich ein Merkmal ist. Beispiel: Im Korpus wird `voice: "Taking something, or just reading?"` (ein Zitat) in einer späteren Begegnung weiterhin angenommen.
- **Kompaktkarte:** Mit drei Ankern füllt der Kopf die 170 Zeichen, und das Aussehen fällt aus der Kompaktkarte heraus. Die Detailkarte behält es.
- **Altbestand:** Vor E3 gespeicherte `voice`-Fakten bleiben (keine Migration). Sammelentitäten (`npc.npcguild_clerks`) tragen Anker wie eine Person.
- **Budget:** Der E2-B-Tam-Fall bleibt bei +47 (Nicht-GO-Ziel +15); E3 ändert ihn nicht.
- Unabhängiger Produktdiff-Review steht aus; E4/E5 nicht begonnen.
