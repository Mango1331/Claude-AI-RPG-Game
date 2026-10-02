# Architektur C: Planer → Validator → Engine → Erzähler → Persistenz

Stand 02.10.2026, **Revision 2** (Architektur-Pass nach der Rückmeldung zu Revision 1).

**Status:** Entwurf zur Gegenprüfung. Es gibt **keinen Code** für C. A und B bleiben unverändert.

**Grundlage:**
- `docs/P0_S4B.md` §13: S4b-Ergebnis, Auswertung, Präzisierungen in §13.10;
- `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §2 (A aus dem Code) und §7 (erste C-Skizze);
- `docs/RESEARCH_NL_TO_ENGINE.md`.

**Code-Bezug:** A ist Gen 3.5 / 4.2.1 (`claude/gen35-world-envelope-2026-10-01` @ 90bd450). Alle Datei- und Funktionsangaben beziehen sich auf diesen Stand. Sie wurden für diese Revision erneut am Code geprüft.

---

## Änderungen gegenüber Revision 1

| Thema | Revision 1 | Revision 2 | Anlass |
|---|---|---|---|
| RECENT | „Der Planer braucht RECENT“ | RECENT verbessert Referenzauflösung und Flüssigkeit. Es ist **keine Sicherheitsvoraussetzung**. Zuerst kommen strukturierte Engine-Fakten, Prosa nur klein und nur, wenn eine Messung sie trägt (§6). | Rückmeldung 1; Rohdaten: ohne RECENT 0 falsche Festlegungen auf den Verlaufsfällen |
| Weltziel (k3_11) | „geringe Schwere“ | voller Zielfehler; neue Validator-Regel **V5 Weltziel-Treue** (§9) | Rückmeldung 2. „Gering“ widersprach auch meinem eigenen Entwurf: Schwierigkeit (E6) und Persistenz-Freigabe hängen am Ziel. |
| Arten | `attack`/`skill` getrennt; Kampf- und Story-Vokabular getrennt | **`use_skill`**. Alle Arten sind **modusunabhängig**; die Engine bildet je Modus auf die Mechanik ab (§4.2). | Rückmeldung 3; Code: Die Kategorie folgt aus der Skill-Definition (§4.1) |
| `skill: null` | Grundsatz | exakte Regeln N1–N6 mit Hinweis-Detektor, Geltungsbereich, Garantie und Restrisiko (§7) | Rückmeldung 4 |
| Validator | entfernen, abstufen, Reparatur. Dazu V2 (Modus), V6b (füllt das einzige Ziel), V7 (Ökonomie), V9 (kürzt) | **nur annehmen, Rückfrage oder ablehnen**. Modus, Ökonomie und Zielvorgabe sind Engine-Regeln. Kürzen entfällt. Die Reparatur gilt nur für Schema und Verankerung und nennt nie einen Ersatzwert. Invarianten M1–M6 (§8). | Rückmeldung 5 |
| Gate | Schatten; nach der Messphase entfernen | Schatten. Aktivierung nur nach vorab festgelegten Live-Kennzahlen G1–G6. Über die Entfernung entscheidet der Nutzer anhand echter Protokolle (§17). | Rückmeldung 6 |
| Mehrfachhandlungen | Der Validator verweigert überzählige Handlungen | Der Planer behält alle. Die Engine entscheidet die Ausführbarkeit (Kategorien N, L, W). Nichts verschwindet still (§10). | Rückmeldung 7 |
| Swipe | Bindung an `input_hash` | dazu Prüfprotokoll `state_before_hash`, Fehlschlag, Rückfrage, Verzweigung; alle Fälle am Code (§14) | Rückmeldung 8 |
| Produktregeln | Kurztabelle E1–E8 | vollständig mit Alternativen, Technik, Spielgefühl und Empfehlung; neu E9–E12 (§20) | Rückmeldung 9 |
| Holdout | „von jemand anderem“ | Spezifikation für ChatGPT als Autor (§21) | Rückmeldung 10 |

---

## 0. In Kürze

1. **C ist ein Umbau von As Eingangsseite.** Hinter der Deutung hat A die richtige Form:
   - Unified Intent IR (`src/ir.js`);
   - Deutung einmal je Spielernachricht, gespeichert mit `input_hash` (`src/v4/runtime.js` `prepareGenerationAsync`);
   - Agency-Guard;
   - deterministische Engine mit zählerbasiertem RNG;
   - Ereignisse auf der Nachricht;
   - Erzähler nur Prosa;
   - Extraktor, Firewall, Ownership, Envelope.

   Die gemessenen Fehler sitzen **vor** der Engine: Der Regex-Pfad hat im Kampf Deutungsautorität und stille Standardwerte.
2. **Die Pipeline** (Prüfung in §2):
   - Steuerkanäle;
   - spezialisierter semantischer Planer;
   - deterministischer, restriktiver Validator;
   - deterministische Engine;
   - kanonische Ereignisse;
   - Erzähler;
   - validierte Welt-Persistenz.

   Das A0-Gate misst nur im Schatten.
3. **Der Planer deutet nur Bedeutung.** Seine Arten sind modusunabhängig. Ob „Arcane Burst“ ein Flächenangriff ist oder „climb out“ im Kampf eine Flucht, entscheidet die Engine aus Skill-Definition und Modus.
4. **Der Validator ist monoton restriktiv.** Er darf annehmen, eine Rückfrage auslösen oder ablehnen. Skill, Ziel, Art und Reihenfolge ersetzt er nie, und er ergänzt keine Handlung.
5. **`skill: null` wird von der Engine zum Basisangriff.** Der Validator lässt `null` nicht durch, sobald der Satz auf einen Skill hindeutet. Einen unbekannten oder unsicheren Skill ersetzt nie jemand still.
6. **Weltziele sind so verbindlich wie Kreaturziele.** Ein genanntes Weltobjekt wird nie durch ein anderes ersetzt; bei Konflikt gibt es eine Rückfrage (V5).
7. **Mehrfachhandlungen:**
   - Der Planer schreibt alle beabsichtigten Teilhandlungen.
   - Die Engine entscheidet, was in diesem Zug ausführbar ist.
   - Jeder nicht ausgeführte Rest wird gemeldet. Er wird nie gespeichert und verschwindet nie still.
8. **Swipe:** Die Mechanik hängt an der Spielernachricht (`input_hash`). Swipe und Regenerate erzeugen nur neue Prosa.
9. **RECENT** dient Komfort und Referenzauflösung, nicht der Sicherheit. Engine-Fakten haben Vorrang.
10. **Branch:** neu von A (§24).

---

## 1. Was die Messungen für C festlegen

| Befund (Quelle) | Folge für C |
|---|---|
| LLM-Semantik ≫ A0: 93 % gegen 40 % richtig, 4 gegen 17 falsche Festlegungen (S4b, p < 0,001) | Planer statt Regex-Autorität, auch im Kampf |
| 0 Ersetzungen genannter Skills, 0 falsche Agency in 544 LLM-Entscheidungen | Der Planer darf den Skill wählen. Validator und Engine sichern trotzdem ab (§7, §12). |
| K-S verfehlt durch: <br>• Ziel-Zuordnung (k3_11) <br>• Modus-Abbildung (k4_05, k5_10) <br>• offene Produktregeln (k6_08, k5_10) | • Weltziel-Treue V5 <br>• Modus-Abbildung in die Engine <br>• Produktregeln als Daten |
| Redundante Art `attack`/`skill` erzeugte die einzigen Schnittstellenfehler und den einzigen Stabilitätswechsel (FC) | `use_skill`; die Engine leitet die Mechanik ab |
| Eine inhaltlich richtige Bestätigung wurde als falsch gewertet (k2_13) | `confirm`, erzeugt vom Validator aus dem Zustand |
| Mit RECENT 5/5 aufgelöst. Ohne RECENT 2/5 aufgelöst, 3 gefragt, **0 falsch** | RECENT bringt Flüssigkeit, keine Sicherheit (§6) |
| Erzählerkontext ohne messbaren Nutzen, 4,3-fache Token (FC_GM) | eigener kleiner Planer-Prompt |
| Gate: 0 unsicher, 12 % gespart, Kaskade = Arm | kein Gate im Produktionspfad; Schatten (§17) |
| JSON-Text 98,9 % gültig im 1. Versuch; Tool (`auto`) 85,7 %, aber je Aufruf schneller | Das Schema ist der Vertrag; der Transport wird gemessen (§18) |
| S4b: FC hatte keinen nachgewiesenen Qualitäts- oder Sicherheitsvorteil gegenüber P1, brauchte aber mehr Reparaturen. JSON-P1 ist **nicht** grundsätzlich semantisch besser. | keine Festlegung gegen Function Calling, nur gegen die getestete Form |

---

## 2. Pipeline (Prüfung von Punkt 11)

```text
Player message
     ↓
control channels only            #-Befehl · Erschaffungsmenü · toter SC · Antwort = genau eine angebotene Option
     ↓
specialized semantic planner     1 LLM-Aufruf, nur Bedeutung (§4, §5)          ┐  parallel, ohne Autorität:
     ↓                                                                            ├─ A0-Gate im Schatten (§17)
deterministic restrictive        annehmen · Rückfrage · ablehnen (§8)            ┘  (schreibt nur ins Prüfprotokoll)
validator
     ↓
deterministic engine             Ausführbarkeit · kanonische Vorgaben D1–D5 · Mechanik · RNG (§10)
     ↓
canonical events/state           Ereignisse auf der Spielernachricht, Faltung (§15)
     ↓
narrator                         Prosa zum Ergebnis; bei Rückfrage nicht aufgerufen
     ↓
validated world persistence      Extraktor → Firewall / Ownership / Envelope; nur freigegebene Fakten
```

**Ergebnis der Prüfung:** Die Pipeline gilt nach allen Änderungen dieser Revision unverändert. Drei Präzisierungen:
1. **Rückfragen** entstehen an drei Stellen (§11):
   - beim Planer bei semantischer Mehrdeutigkeit;
   - beim Validator bei einem Treuekonflikt;
   - in der Engine bei mechanischer Unterbestimmung, etwa D2 mit zwei oder mehr legalen Zielen.

   Jede hält **vor** jeder Zustandsänderung an. Der Erzähler wird dann nicht aufgerufen.
2. **Ausführbarkeit** ist eine Stufe der Engine vor der Mechanik. Sie deutet nichts, sie wendet Regeln auf eine schon validierte Absicht an.
3. **Das Gate** liest dieselbe Nachricht und denselben Zustand. Es schreibt nur ins Prüfprotokoll und hat keinen Weg zur Engine.

| Stufe | Ort (A, sonst neu) | LLM | entscheidet |
|---|---|---|---|
| Host | `src/v4/runtime.js` `prepareGenerationAsync` | – | ob neu geplant wird (§14) |
| Steuerkanäle | `src/intent.js` (`#`), Erschaffung, `src/engine.js` (toter SC); neu: Antwort auf Rückfrage | – | nur geschlossene Eingaben |
| Planer | neu (`src/plan/planner.js`), ersetzt `interpretMessage` und die Kampfroute | ja | Bedeutung |
| Validator | neu (`src/plan/validate.js`); nutzt `guardCommands` (`src/v4/agency.js`), `mentionedSkills` (`src/intent.js`) | – | Zulässigkeit der Deutung |
| Engine | `src/engine.js`, `src/combat.js`, `src/v4/commands.js`; neu: Adapter `use_skill`, Handler `ability_world` | – | Mechanik |
| Ereignisse | `src/state.js`, `src/host.js` `foldChat` | – | Zustand |
| Erzähler | Engine-Block `src/context.js` | ja | Prosa |
| Persistenz | `src/v4/extract.js`, `firewall.js`, `ownership.js`, `envelope.js`, `world.js` | ja (Extraktor) | Weltfakten im Rahmen der Freigaben |

---

## 3. Komponenten von A: bleibt, eingeschränkt, entfällt

| Komponente (A) | in C | Begründung |
|---|---|---|
| `src/engine.js`, `src/combat.js`: Kampf, NPC-Züge, Würfel | **bleibt.** Neu ist nur ein Adapter am Eingang. | Ein validierter Intent ersetzt `parseIntent` |
| `src/rng.js`, `rng_to` in Ereignissen | **bleibt** | Reproduzierbarkeit, kein Neuwürfeln |
| `src/state.js`, `src/host.js` (`rec`, `setRec`, `foldChat`, `messageEvents`) | **bleibt** | Event-Sourcing auf Nachrichten |
| `prepareGenerationAsync`: Deutung je `input_hash`, Fehlschlag nicht zwischengespeichert | **bleibt als Rahmen.** Der Planer ersetzt `interpretMessage` und den Zweig `route 'v3'` für freie Sprache. | Swipe-Stabilität ist gelöst (§14) |
| `src/ir.js` Unified Intent IR | **bleibt, als `ir-2`.** `readTurn` erzwingt `fight` nicht mehr. Neue Quelle `planner`. | eine Form für alle Pfade |
| `src/v4/agency.js` `guardCommands` | **bleibt** als Validator-Regel V2 | Frage, Plan, Verneinung, fremde Tat |
| `src/v4/commands.js`: 20 Story-Befehle | **bleibt** | Der Planer schreibt dieselben Befehle |
| `src/v4/catalog.js` `buildCatalog` | **bleibt.** Erweitert um Kampfbrett, Skillprofil und Engine-Fakten. | Planer-Eingabe |
| `src/context.js` Engine-Block | **bleibt.** Neue Zeilen für Weltnutzung, Nicht-Ausgeführtes und Rückfragen. | nur Prosa |
| Extraktor, Firewall, Ownership, Envelope, Welt | **bleibt.** Die Firewall wird um die Freigabe aus `ability_world` erweitert. | Persistenz nur mit Freigabe |
| `src/v4/interpret.js` | **geht im Planer auf.** `parseInterpretation` wird Teil von V1. | eine Deutungsautorität |
| `src/intent.js` `parseIntent` | **verliert die Autorität.** Bleibt im Schatten und als Lieferant für Validator-Hilfen (§3.1). | Hier sitzt der gemessene Fehler |

### 3.1 Regex- und Intent-Weichen im Einzelnen

| Weiche (A) | Ort | in C |
|---|---|---|
| Kampf erzwingt den Regex-Pfad (`state.encounter ? 'fight'`) | `src/ir.js` `readTurn` | **entfernt.** Kampf ist ein Modus, keine Route am Planer vorbei. |
| Angriffswörter ohne erkannten Skill → Basisangriff | `src/intent.js` `parseIntent` | **entfernt.** Das war die gemessene stille Ersetzung. Ersetzt durch `skill: null` + V3b (§7). |
| Erkennung unbekannter Skills: nur **im Content vorhandene** Skillnamen, und nur mehrteilig oder nach „use/cast“ | `src/intent.js` (`mentionedSkills`, `USE_RE`) | **bleibt als Teil des Hinweis-Detektors** (h1). Am Code bestätigt: Erfundene Namen („Fire Lance“) erkennt A nicht. Darum kommt h2–h6 dazu (§7). |
| `resolveTarget` (Label, Name, Beschreibung, Pronomen, einziges Ziel) | `src/intent.js` | **entfernt als Autorität.** Der Planer liefert IDs. Exakte Label- und Namensabgleiche bleiben für V4b; „einziges legales Ziel“ wird Engine-Vorgabe D2. |
| `ambiguous_target` / `no_target` → Engine-Frage | `src/engine.js` `playerTurn` → `targetQuestion` | **bleibt als Engine-Verhalten** (Auslöser D2 bzw. V4c) |
| `MECHANICAL`: Angriff und Stealth außerhalb des Kampfes zur V3-Route | `src/ir.js` | **entfernt.** Die Route folgt aus den Arten des Plans. |
| `HOLD_RE` | `src/engine.js` `pcActionOf` | **entfällt.** `activity {kind: wait}` wird im Kampf zu hold (E5). |
| `#`-Befehle, Erschaffung, toter SC, `pending_combat` | `src/ir.js`, `src/engine.js` | **bleiben deterministisch.** Steuerkanäle, keine Sprachdeutung. |
| A0-Gate (`gate()`) | `tools/p0/lib/s4b.mjs` | **nur Schatten** (§17). `parseIntent` bleibt dafür im Code, bis der Nutzer über das Gate entschieden hat. |

---

## 4. Unified Intent IR v2 und Planer-Schema v2.1

### 4.1 Befund am Code: `attack` und `skill` sind keine semantischen Arten

- `parseIntent` schreibt `attack` oder `skill` danach, ob der genannte Skill ein `attack`-Feld hat (`offensive` gegen `nonOffensive`).
- `pcActionOf` reicht das an `src/combat.js` weiter.
  - `attackAction` lehnt einen Skill ohne `attack` ab („is not an attack“).
  - `skillAction` wendet die Effekte des Skills an (Verteidigung, Barriere, Reposition).
- **Die Kategorie ist also vollständig eine Funktion der Skill-Definition.** Der Planer muss sie nicht wiederholen.
  - S4b: Die einzigen Schnittstellenfehler dieser Art (FC k1_07, k1_08) und der einzige Stabilitätswechsel kamen aus dieser Doppelung.
- **Entscheidung:** eine semantische Art `use_skill`. Der Engine-Adapter wählt `skill.attack ? attackAction : skillAction`; `skill: null` wird zu D1.
- **Dasselbe Prinzip gilt für den Modus.** In A gibt es im Kampf keine Reise, keine Rast und kein Durchsuchen als Handlung. Bisher stand die Abbildung („im Kampf ist Weggehen Flucht“, S4b-Regel L7) im Planer-Prompt. Drei von vier Armen haben sie in k4_05 verletzt. Sie gehört wie die Skill-Kategorie in die Engine (§4.2, D4).

**Warum `ability_world` eine eigene Art bleibt**, statt in `use_skill` mit einem Ding als Ziel aufzugehen:
1. Es ist eine andere Handlung: auf ein Ding wirken, um ein Ziel zu erreichen, statt gegen einen Gegner.
2. Sie hat ein eigenes Feld `goal`.
3. Ein `{new}`-Ziel wäre sonst mehrdeutig. Bei `use_skill` ist `{new}` ein abwesendes Wesen und wird verweigert; bei `ability_world` ist es ein nicht gelistetes Ding.

Eine Verwechslung der beiden ist in Wahrheit ein **Zielfehler**: Gegner statt Boden. V4 und V5 prüfen sie.

### 4.2 Semantische Arten (modusunabhängig) und Abbildung durch die Engine

| Art (Planer) | Bedeutung | im Kampf (Engine) | außerhalb (Engine) |
|---|---|---|---|
| `use_skill` | einen Skill gegen ein Wesen oder auf sich; ohne Skill: angreifen | `attackAction` oder `skillAction` nach Skill-Definition; `skill: null` → D1 | Angriff auf ein Wesen oder eine Person beginnt den Kampf (A). Nicht angreifender Skill: wie A, ohne Buchung (offen, §25). |
| `ability_world` | bekannter Skill auf ein Ding, mit Ziel | Haupthandlung, Probe (E6) | Probe (E6) |
| `move` | sich relativ zu Gegnern bewegen | `moveAction` oder an die Kampfaktion gehängt (D5) | keine Engine-Handlung (Erzählung) |
| `flee` | sich der Gefahr entziehen | Flucht (A: entkommt, wenn alle Gegner LONG, sonst weg) | bei gebundenem Kampf (`pending_combat`) wie A, sonst keine Engine-Handlung |
| `go` (V4) | an einen Ort gehen oder reisen | **D4:** Fluchtversuch | Reise (V4-Handler) |
| `activity` (V4) | Zeit verbringen: rest, wait, search … | `wait` → hold (E5); `search` → E4; sonst nicht ausführbar (N) | V4-Handler |
| übrige V4-Befehle | take, pay, quest.accept … | nicht ausführbar (N), gemeldet (E9) | V4-Handler |
| `stealth` | sich verbergen, anschleichen | nicht ausführbar (N). In A gibt es kein Stealth im Kampf: `storyTurn` geht vorher in den Kampf, `pcActionOf` kennt kein `stealth`. Mechanisch verpufft die Nachricht dort heute still. | A `stealthEvents` |
| `other` | beabsichtigte Handlung ohne passende Art | nicht ausführbar (E10), gemeldet; der Kampf wartet | wie A eine Erzählrunde mit vorab gezogenem Prüfwürfel |
| `clarify` | Rückfrage des Planers | – | – |

**Neu ist `other`.** Es ist die Auffangart, damit der Planer keine beabsichtigte Handlung weglassen oder in eine falsche Art pressen muss. Mechanisch entspricht es As heutigem Verhalten bei nicht erkannten Handlungen: Im Kampf wartet der Kampf, außerhalb gibt es eine Erzählrunde. Neu ist nur, dass es **sichtbar** wird.

### 4.3 Schema v2.1

```text
Gemeinsam: {"intents": [ … ]} · jede Handlung mit "quote" (wörtlich aus der Nachricht) · keine Zusatzfelder
           · KEIN Feld für Ergebnis, Erfolg, Schaden, Kosten, Schwierigkeit oder Priorität

use_skill      {"kind","skill": <id | {"new":"<seine Worte>"} | null>, "target": <id | {"new":"<Beschreibung>"} | null>, "quote"}
ability_world  {"kind","skill": <id | {"new":…} | null>, "target": <object id | {"new":"<das Ding>"}>,
                "target_words": "<wörtlich aus quote>", "goal": "<≤ 12 Wörter>", "quote"}
move           {"kind","dir": "closer"|"away", "target": <id | null>, "quote"}
flee           {"kind","quote"}
stealth        {"kind","quote"}
other          {"kind","what": "<kurz, in seinen Worten>", "quote"}
clarify        {"kind","about": "target"|"skill"|"action", "question", "options": [<ids oder kurze Texte>]}
V4-Befehle     wie content/commands.json (go, activity, take, pay, …), je mit "quote"
```

- **`target_words` ist neu.** Es verankert das Weltziel im Wortlaut (V5).
- **`hold` entfällt als Art.** Warten ist `activity {kind: "wait"}`; die Engine macht daraus im Kampf hold.
- **`confirm`** steht nicht im Planer-Schema. Der Validator erzeugt es (V4d).
- **Prompt je Modus:**
  - Das Schema ist dasselbe; der Prompt zeigt je Modus nur die Arten, die dort eine Abbildung haben, plus `other` und `clarify`.
  - Kampf: `use_skill`, `ability_world`, `move`, `flee`, `go`, `activity`, `stealth`, `other`, `clarify`.
  - Story: alle 20 V4-Befehle plus `use_skill`, `ability_world`, `flee`, `stealth`, `other`, `clarify`.
  - Durch `other` geht nichts verloren, wenn eine Art im Modus-Prompt fehlt. Ob der volle Prompt in beiden Modi messbar besser ist, misst C4.

### 4.4 IR v2

- `IR_VERSION = 'ir-2'`.
- `acts` tragen die semantischen Arten, Quelle `planner` oder `control`.
- `check` hält die Urteile des Validators je Handlung, mit Regel.
- Die mechanische Kategorie (Angriff, Skill, Flucht …) steht nur in den Engine-Ereignissen.
- Ein Record liest sich also: was der Spieler meinte (IR), was zulässig war (check), was geschah (events).

---

## 5. Der Planer

### 5.1 Ort und Aufruf

- **Ort:** in `prepareGenerationAsync`, an der Stelle von `interpretMessage`. Er läuft einmal je neuer oder bearbeiteter Spielernachricht (§14).
- **Aufruf:**
  - JSON, Temperatur 0,1, `maxTokens` ≈ 400 (gemessen: im Mittel 51 Output-Token).
  - Höchstens **eine Reparatur**, nur bei V1-Fehlern (Schema, IDs, Verankerung).
  - Die Reparaturnachricht nennt die verletzte Regel und das Feld, **nie einen Ersatzwert**. Der Validator schiebt dem Planer also keine Deutung unter.
- **Fehlschlag:**
  - Abbruch mit Hinweis, kein Erzähleraufruf (wie A);
  - nicht zwischengespeichert;
  - kein Rückfall auf Regex.
- **Record:** `PLANNER_VERSION`, Hash des statischen Prompts, Rohantwort(en).

### 5.2 Eingabe je Zug

| Block | Quelle (A) | Inhalt | Größe (geschätzt) |
|---|---|---|---|
| Rolle, Regeln, Arten, Beispiele, Format | statisch, je Modus | wie S4b P1, angepasst an Schema v2.1 | Kampf ≈ 1,0–1,3k; Story ≈ 2,5–3k |
| MODE | `state.encounter`, `state.scene.at` | `fight (round n)` oder `story at <Ort>` | < 20 |
| KNOWN SKILLS | Bogen + `content` | ID, Name, Profil (Angriff/kein Angriff, Einzel/Fläche, Reichweite, Schadensart, Munition) | ≈ 15 je Skill |
| OPPONENTS (Kampf) | `state.encounter`, Labels | ID, Label, HP-Band, Abstand, Haltung | ≈ 15 je Gegner |
| PRESENT | `buildCatalog().present` | ID, Name oder Handle, Haltung | ≈ 10 je Person |
| OBJECTS / PLACES | `buildCatalog()` | wie heute im Interpreter | wie heute |
| ENGINE FACTS | Ereignisse der letzten Runde | strukturiert, deterministisch (§6) | ≈ 30–60 |
| RECENT (Prosa) | letzte Erzählerantwort | optional, ≤ 600 Zeichen (§6) | ≤ 150 |
| PENDING QUESTION | Record der vorigen Spielernachricht | Frage, Optionen, zurückgehaltener Plan (§11) | ≈ 40 |
| PLAYER MESSAGE | | | |

**FEATURES:** A führt keine Szenen-Merkmale (Decke, Strickleiter, Laterne), nur Objekte und Orte. In C v1 sind Weltziele Objekt-IDs oder `{"new": "<das Ding>"}`. In S4b standen handgeschriebene FEATURES im Katalog; k3_11 zeigt deren Sog (§9).

### 5.3 Prompt-Größe

- **Gemessen (P1):** ≈ 1,87k Prompt-Token je Fall, davon ≈ 1,33k statisch.
- **Kampf mit Modus-Prompt:** statisch ≈ 1,0–1,3k, gesamt ≈ 1,5–1,9k.
- **Story:** ≈ 3,5k. Der Planer ersetzt den Interpreter (≈ 3,1k); es gibt also keinen zusätzlichen Aufruf.
- **Für Prompt-Caching:** zuerst der statische Teil (byte-gleich je Modus), dann der Zustand, zuletzt die Nachricht.
- **Nicht kürzen:** die Regeln zu Skill-Treue, `skill: null`, Rückfrage und „jede beabsichtigte Handlung aufschreiben“ sowie die Beispiele mit `{new}`, Rückfrage und Mehrfachhandlung. Sie tragen die Sicherheitskennzahlen.

### 5.4 Was der Planer entscheiden darf, und was nicht

| darf | darf nicht |
|---|---|
| welche Handlungen die Nachricht ausdrückt, in Spielerreihenfolge, **alle**, auch wenn sie jetzt unmöglich scheinen | Handlungen weglassen, weil er sie für nicht ausführbar hält |
| welcher **bekannte** Skill gemeint ist (Alias, Tippfehler, Umschreibung), wenn genau einer passt | einen anderen Skill an die Stelle eines genannten setzen; Basic Attack ohne die Worte „basic attack“ wählen |
| welches Ziel gemeint ist (Label, Teil-Label, Beschreibung, Pronomen, Engine-Fakt), wenn genau eines passt | unter mehreren passenden Zielen wählen; ein genanntes Ziel durch ein anderes ersetzen |
| ein unbekanntes Ding oder einen unbekannten Skill als `{new}` benennen | `{new}` in eine bekannte ID umdeuten |
| `goal` in den Worten des Spielers | Erfolg, Schwierigkeit, Folgen |
| eine Rückfrage, wenn zwei Lesarten mechanisch verschieden wären | fragen, wenn genau eine passt |
| leer antworten (Frage, Plan, Rede, fremde Tat) | mechanische Kategorien festlegen (Angriff oder Skill, Flucht oder Reise); das macht die Engine |

---

## 6. RECENT: Sicherheit gegen Komfort und Referenzauflösung

**Die Daten (S4b, 5 Verlaufsfälle):**

| | aufgelöst | gefragt | falsch festgelegt |
|---|---|---|---|
| mit RECENT | 5 | 0 | 0 |
| ohne RECENT | 2 | 3 | **0** |

Dazu zwei Einzelbeobachtungen, beide ohne Wiederholung:
- **k3_11:** Mit RECENT wählte P1 das Loch. RECENT nennt „the hole in the wall“, und `feat.hole` steht im Katalog. Ohne RECENT kam `{new: "the burrow ceiling"}`. RECENT kann also auch Präzision kosten.
- **k6_07:** Der Korpus-Text für RECENT widersprach dem Kampfbrett.

**Einordnung:**
- **Sicherheit hing in S4b nicht an RECENT.** Ohne Verlauf hat der Planer gefragt, nicht geraten.
- **Flüssigkeit hing daran.** Mit RECENT gab es keine Rückfrage.
- Das Kriterium D3 („Planer braucht den Verlauf“) hat Flüssigkeit gemessen, nicht Sicherheit. Die Formulierung in Revision 1 war zu stark.

**Regeln für C:**
1. **Sicherheit muss ohne RECENT gelten.**
   - Prompt-Regel: Lässt sich ein Bezug aus Nachricht, Zustand und Engine-Fakten nicht eindeutig auflösen, wird gefragt.
   - Der Validator benutzt RECENT **nie**. Er prüft nur gegen Nachricht, Zustand und Content.
2. **Strukturierte Engine-Fakten zuerst.** Sie kommen aus den Ereignissen der letzten Runde, ohne LLM, ≈ 30–60 Token, und widersprechen dem Brett nie. Beispiele:
   - „Barkscorpion B stung Alaric (last round)“;
   - „Alaric hit Grey Wolf B“;
   - „Bandit B moved to SHORT“.
3. **Prosa nur klein und nur, wenn die Messung sie trägt.**
   - Die letzten ≤ 600 Zeichen der Erzählerantwort, ohne Tracker-Blöcke.
   - Nur für Bezüge, die keine Engine-Tatsache sind („the one by the lantern“).
   - Bei Widerspruch gilt das Brett (Prompt-Regel).
4. **Messung in C4,** drei Varianten auf Verlaufs- und k3_11-artigen Fällen:
   - nur Engine-Fakten;
   - Fakten und Prosa;
   - nichts.

   Prosa bleibt nur, wenn sie Bezüge besser auflöst, **ohne** eine falsche Festlegung hinzuzufügen.

**Kurzform:** Relevante strukturierte RECENT-Daten sind ein wertvoller Bestandteil des Planers für Flüssigkeit und Referenzauflösung. Sie sind keine Sicherheitsvoraussetzung und bleiben selektiv und klein.

---

## 7. `skill: null`, exakt

| | Regel |
|---|---|
| **N1 (Planer)** | `skill: null` nur in `use_skill` oder `ability_world`, und nur, wenn der Satz der Handlung **keinen Skill nennt und keinen andeutet** („I hit it“, „I shoot the wolf“). Die Basic-Attack-ID nur, wenn der Spieler „basic attack“ sagt. Ein unbekannter Skill wird `{"new": "<seine Worte>"}`. |
| **N2 (Engine, Vorgabe D1)** | `null` → Basisangriff der Klasse (`content.classes[...].basic_attack`), als Angriff bzw. bei Weltnutzung als Mittel (mit Munition). Nur nach V3b-Freigabe. |
| **N3 (Validator V3b)** | Der Hinweis-Detektor (unten) läuft auf dem Geltungsbereich der Handlung. **Ein Hinweis → `clarify(skill)`.** Mit `null` und einem Hinweis wird nie etwas ausgeführt. |
| **N4 (Validator V3c)** | Basic-Attack-ID ohne die Worte „basic attack“ im Geltungsbereich → wie `null` (dann N3) |
| **N5 (Validator V3d)** | `{"new": X}` wird nie ersetzt. Passt X fast genau zu **einem** bekannten Skill → `clarify(skill)` „Meinst du Flame Lance?“. Sonst → `reject(unknown_skill)`: Die Engine meldet „Alaric kennt X nicht“, nichts wird gebucht. |
| **N6 (Planer + V3a)** | Keine stille Ersetzung eines unsicheren Skills. Der Planer wählt einen bekannten Skill nur, wenn genau einer passt; sonst fragt er. V3a: Nennt der Satz einen bekannten Skill exakt oder fast, und der Plan nimmt einen anderen → `clarify(skill)` mit beiden. |

**Hinweis-Detektor.** Er ist deterministisch, alle Listen sind Daten im Content.

| | erkennt | Quelle |
|---|---|---|
| h1 | exakte Namen jedes Skills im Content (auch nicht gelernter), längste zuerst | As `mentionedSkills` |
| h2 | Fast-Treffer auf **unterscheidende** Wörter von Skillnamen: Editierabstand ≤ 1 (4–5 Buchstaben) bzw. ≤ 2 (ab 6), Vertauschung zählt 1; zusammengeschrieben („flamelance“). Allgemeine Kampfwörter (attack, shot, strike, slash, hit, shoot) sind ausgenommen. | neu |
| h3 | allgemeine Skill- und Magiewörter: spell, magic, ability, skill, technique, cast, conjure, summon, invoke, channel | neu, Liste = Daten |
| h4 | **Hinweisverben je Klasse** (Produktregel E1), z. B. Magier: blast, zap | neu, Daten |
| h5 | Muster „use/activate/perform (my\|a\|the) X on/at/against“, wenn X kein gehaltener Gegenstand ist | neu (As `USE_RE` erweitert) |
| h6 | großgeschriebene Mehrwortfolge mitten im Satz, die kein bekannter Name, kein Label, kein Ort und keine Art ist | neu |

**Vorher wird maskiert:** Labels, Namen, Orte, Arten und Questtitel (As `linkEntities` plus Kampflabels). So zählt „Grey Wolf A“ nicht als Skill-Hinweis.

**Geltungsbereich:**
- der Satz, der das `quote` der Handlung enthält;
- ohne wörtliche Rede und ohne Fragesätze (wie As `declarative`);
- ohne Wortspannen, die das `quote` einer **anderen** Handlung abdeckt.

Beispiele:
- „I step back and hit A“: „step“ gehört zu `move` und zählt für „hit A“ nicht.
- „I Fire Lance Barkscorpion B“ mit einem zu knappen `quote` („Barkscorpion B“): Der Hinweis „lance“ bleibt unabgedeckt → Rückfrage.

**Machbarkeit (nachträglich, an den 91 S4b-v1-Texten, Wegwerf-Prototyp):**
- 52 von 52 Sätzen, deren Gold einen Skill nennt, andeutet oder nach ihm fragt, werden markiert.
- 0 von 6 reinen Basic-Attack-Sätzen werden markiert. „basic attack“ wird als ausdrücklich erkannt.
- **Kein Beleg:** Die Listen wurden mit Blick auf denselben Korpus eingestellt. Die allgemeinen Magiewörter kamen erst nach k7_06 dazu. Über Fehlalarme entscheiden Korpus v2 und Holdout.

**Garantie und Restrisiko:**
- **Strukturell verhindert:**
  - Der Planer kann einen erkannten Skill nicht durch Basic Attack ersetzen, ohne dass V3a, V3b oder V3c es abfängt.
  - Jeder exakt genannte oder fast genannte Skillname und jedes Hinweiswort aus den Listen führt bei `null` zur Rückfrage. Der ursprüngliche Fall „Fire Lance“ (h2: „lance“) ist damit strukturell gesperrt.
- **Nur mehrschichtig abgesichert, nicht garantiert:** Umschreibungen ohne jede Wortüberlappung, etwa „my fiery javelin“. Dafür müssten zwei Stufen zugleich versagen: Der Planer schreibt `null` (in S4b 0 von 544), und der Detektor findet nichts.

---

## 8. Der Validator: monoton restriktiv

**Signatur:**

```text
validatePlan(plan, state, content, message) → { verdicts[], turn }
```

- reine Funktion, kein LLM, keine Zufallszahl, **kein RECENT**;
- `verdicts[i]` ∈ {`accept`, `clarify(about, options, rule)`, `reject(reason, rule)`};
- `turn` ∈ {`commit(accepted, in Planreihenfolge)`, `ask(clarify|confirm, zurückgehaltener Plan)`, `abort(V1)`}.

### 8.1 Invarianten

Sie werden als Eigenschaftstest geprüft: zufällige Pläne und Zustände; jede Verletzung schlägt fehl.

| | Invariante |
|---|---|
| **M1 Keine neuen Inhalte** | Jede Handlung, die an die Engine geht, ist Feld für Feld gleich einer Handlung des Plans. |
| **M2 Keine Ersetzung** | Art, Skill, Ziel, `target_words`, `goal` und Argumente einer angenommenen Handlung sind unverändert. |
| **M3 Keine Ergänzung** | Angenommene Handlungen ⊆ Plan. Der Validator erzeugt keine Handlung; Rückfrage und Bestätigung sind keine Handlungen. |
| **M4 Keine Umordnung** | Die angenommenen Handlungen behalten die Reihenfolge des Plans. |
| **M5 Sichtbarkeit** | Jede nicht angenommene Handlung steht mit Regel im Record. Der Spieler sieht sie in der System-Zeile. Das gilt auch für Entfernungen durch den Agency-Guard. |
| **M6 Rückfragen wählen nicht** | Optionen stammen aus dem Plan, aus wörtlichen Spannen der Nachricht oder aus dem Katalog. Eine Rückfrage legt nichts fest; die Wahl trifft der Spieler. |

### 8.2 Regeln

| Regel | Prüfung | mögliche Urteile | warum monoton |
|---|---|---|---|
| **V1** Schema und Verankerung | Art bekannt, Pflichtfelder, IDs aus dem Katalog, keine Zusatzfelder, Grenzen (`goal` ≤ 12 Wörter …), `quote` und `target_words` wörtlich in der Nachricht | Reparatur (einmal, ohne Ersatzwert), sonst `abort` | Der Validator ändert nichts. Er lehnt ab oder lässt den Planer neu antworten. Der neue Plan durchläuft alle Regeln. |
| **V2** Beleg (As Agency-Guard) | keine Frage, kein Plan, keine Verneinung, keine fremde Tat | `reject(not_a_deed)`, sichtbar | nur entfernen |
| **V3a** genannter Skill | Geltungsbereich nennt einen bekannten Skill exakt oder fast, der Plan nimmt einen anderen | `clarify(skill)` mit beiden | fragt, wählt nicht |
| **V3b** `null` mit Hinweis | §7 N3 | `clarify(skill)` | dito |
| **V3c** Basic Attack ohne Worte | §7 N4 | wie `null` | strenger, nicht anders |
| **V3d** `{new}` | §7 N5 | `clarify(skill)` oder `reject(unknown_skill)` | ersetzt nie |
| **V4a** Zieltyp | ID passt zur Art: Wesen oder Person für `use_skill`, Objekt für `ability_world` | V1 | – |
| **V4b** genanntes Ziel | Geltungsbereich (ohne den Zielteil, §9) nennt exakt das Label oder den Namen eines Wesens X, der Plan zielt auf Y ≠ X | `clarify(target)` mit X und Y | fragt, tauscht nie |
| **V4c** abwesendes Wesen | `{new}` als Ziel von `use_skill` | `reject(no_target)` mit der Liste der Anwesenden (wie As `no_target`) | nur ablehnen |
| **V4d** Nicht-Feind | Angriff auf eine anwesende Person mit Haltung neutral oder freundlich | `confirm` mit zurückgehaltenem Plan (E2) | hält an, ändert nichts |
| **V5** Weltziel-Treue | §9 | `accept`, `clarify(target)` oder V1 | fragt, tauscht nie |
| **V6** Rückfrage allein | eine Rückfrage oder Bestätigung im Plan, egal von wem | `ask`: **nichts** wird gebucht, der ganze Plan wird zurückgehalten | nur anhalten |

### 8.3 Was nicht mehr im Validator steht

| Revision 1 | Revision 2 | Grund |
|---|---|---|
| V2 Art im Modus (mit Reparaturhinweis „leaving is flee“) | Engine D4 und Kategorie N (§10) | Modus ist Mechanik. Der Reparaturhinweis hätte dem Planer eine Art vorgeschlagen. |
| V6b „1 Gegner → dieser“ | Engine D2 | Der Validator setzt kein Ziel ein |
| V7 Aktionsökonomie | Engine, Kategorie W | Was in einer Runde geht, ist Mechanik |
| V9 kürzen | V1 (ablehnen bzw. Reparatur) | Kürzen ändert den Inhalt |

---

## 9. Ziel-Treue: Weltziele (V5) und Wesen (V4b)

**Schwere:** Ein falsches Weltziel ist ein **voller Zielfehler**, so schwer wie ein falsches Kreaturziel:
- Das Ziel bestimmt die Schwierigkeit der Probe (E6).
- Die Persistenz-Freigabe ist an das Ziel gebunden (§13).
- Spätere Bezüge („the collapsed ceiling“) lösen sich nur auf, wenn das richtige Ding verändert wurde.

In Revision 1 stand „geringe Schwere“. Das war falsch und widersprach dem eigenen Entwurf.

**V5 (für `ability_world`), deterministisch:**

| Schritt | Prüfung | Folge |
|---|---|---|
| 5a Verankerung | `target_words` steht wörtlich im `quote` | sonst V1 |
| 5b Identität | `{new: T}`: T entspricht `target_words` ohne Artikel und Possessiv (keine Umschreibung). Objekt-ID: `target_words` enthält das Kopfwort des Objektnamens oder einen Alias. | sonst V1 (Reparatur), danach `clarify(target)` |
| 5c Rolle | Die Nachricht wird am ersten **Zweckwort** in Zielteil und Zweckteil getrennt. Zweckwörter: „so“, „so that“, „in order to“ und „to“ vor einem Verb, also nicht vor Artikel oder Pronomen; Liste = Daten. Steht `target_words` **nur im Zweckteil**, und nennt der Zielteil ein anderes Ding (Objekt nach at/on/into/against/through/over … oder direktes Objekt nach dem Skill) | `clarify(target)` mit beiden Wortlauten als Optionen |
| 5d kein Gegenkandidat | Der Zielteil nennt kein Ding („I cast Flame Lance to bring the ceiling down“) | `accept`; die Wahl des Planers steht im Record (Restrisiko) |
| 5e Wesen als Weltziel | `target_words` ist das Label oder der Name eines Wesens | V1 (Art und Ziel passen nicht zusammen) |

**Der Validator setzt nie selbst das Ding aus dem Zielteil ein.** Er fragt. Damit wird ein genanntes Weltobjekt nie durch ein anderes ersetzt.

**Beispiele:**

| Satz | Plan | V5 |
|---|---|---|
| „I cast Flame Lance at the ceiling to bring it down over the hole“ (k3_11) | Ziel: das Loch | 5c: „hole“ nur im Zweckteil, der Zielteil nennt „the ceiling“ → **Rückfrage**: „the ceiling“ oder „the hole“ |
| „I cast Arcane Burst into the hole to blow it open“ | Loch | im Zielteil → annehmen |
| „I use Flame Lance to burn through the rope ladder“ | Strickleiter | Zielteil ohne Ding → annehmen (5d) |
| „I Heavy Slash the lantern's rope so the lantern drops on Bandit B“ | Laterne | „lantern“ im Zielteil → annehmen |

**Machbarkeit (nachträglich, alle 16 S4b-Fälle mit Weltnutzung, Wegwerf-Prototyp; Kopfwort aus Ziel-ID bzw. `{new}`-Text, da S4b-v1-Pläne kein `target_words` haben):**
- k3_11 wird in allen drei betroffenen Armen (P1, FC, FC_GM) zur Rückfrage.
- **0 Fehlalarme** auf den 15 Gold-Plänen und auf 61 weiteren Planer-Weltnutzungen, die richtig waren.
- Das ist auf denselben Daten entworfen und nur ein Machbarkeitsnachweis.

**V4b für Wesen:**
- Gleiches Prinzip mit exakten Labels und Namen: der längste Treffer, wie bei As `resolveTarget`, Kampflabels zuerst.
- Namen im Zweckteil zählen nicht: „I attack Bandit A to protect Brede“.
- Beschreibungen und Pronomen prüft V4b nicht. Ihre Auflösung ist Semantik und bleibt beim Planer.

---

## 10. Engine: Ausführbarkeit, kanonische Vorgaben, Mehrfachhandlungen

### 10.1 Kanonische Vorgaben (geschlossene Liste)

Jede Vorgabe ist sichtbar im Ereignis oder Record. Sie greift nur, wo **keine Wahl** besteht oder eine feste Spielregel gilt. Der Validator wendet keine davon an.

| | Vorgabe | Herkunft |
|---|---|---|
| **D1** | `skill: null` → Basisangriff der Klasse | §7; nur nach V3b |
| **D2** | `target: null` bei Einzelziel-Skill: genau **ein** legales Ziel → dieses; ≥ 2 → Engine-Rückfrage; 0 → nicht ausführbar (L) | A: Core #23 „sole-hostile default“ (`resolveTarget`, „sole target“) |
| **D3** | Flächen-Skill → Ziele nach Flächenregel | A `attackAction`: alle ENGAGED-Gegner |
| **D4** | Modus-Abbildung nach §4.2: im Kampf `go` → Flucht, `activity: wait` → hold, `activity: search` → E4, andere Story-Befehle → nicht ausführbar | S4b-Regel L7, A-Mechanik |
| **D5** | Bewegung und Angriff: „closer“ vor, „away“ **nach** dem Angriff, unabhängig von der geschriebenen Reihenfolge | A `attackAction` (Kommentar: „taken after the attack, so the attack keeps its range“). Produktfrage E11. |

D1 und D2 sind die einzigen Vorgaben, die ein Argument füllen. Beide greifen nur ohne Wahlmöglichkeit, und beide sind As bestehende Regeln. Ist das zu weit, gibt es eine strengere Variante für D2: Der Planer muss das Ziel immer nennen, und `null` führt auch bei einem einzigen Gegner zur Rückfrage. Das kostet Rückfragen auf „I attack“ (S4b-Gold L1: handeln).

### 10.2 Ausführbarkeit: drei Kategorien

| Kategorie | Beispiel | Folge |
|---|---|---|
| **N** nie in diesem Modus | Trank im Kampf (E9), Rast im Kampf, Stealth im Kampf, `other` | übersprungen; gemeldet „im Kampf nicht möglich“ |
| **L** situativ unzulässig | Ziel außer Reichweite, zu wenig Mana, volle Deckung, Ziel nicht mehr da, unbekannter Skill | **Der Zug wird nicht aufgelöst** (A: `stopped: 'illegal'`), Grund gemeldet, der Spieler entscheidet neu |
| **W** Aktionsökonomie | eine zweite Haupthandlung in derselben Kampfrunde | nicht in dieser Runde, gemeldet, **nicht gespeichert** (der Zustand ändert sich, ein gespeicherter Befehl wäre veraltet) |

**Ablauf einer Kampfrunde aus einem validierten Plan:**
1. Handlungen in Planreihenfolge; N-Handlungen werden gemeldet und übersprungen.
2. Die erste Haupthandlung (`use_skill`, `ability_world`, `flee`, Flucht aus D4, hold) mit höchstens einer Bewegung wird nach D5 zusammengesetzt.
3. Legalität wie in A: `attackAction`, `skillAction` oder `moveAction` melden `illegal`, `runCombat` hält an; beim Kampfbeginn prüft der Probelauf in `combatTurn`. Bei L: nichts wird aufgelöst, der Grund wird gemeldet, der Kampf wartet.
4. Weitere Haupthandlungen und weitere Bewegungen: W, gemeldet.
5. Auflösen; NPC-Züge wie in A.

**Story-Modus:** As Befehlsfolge mit `seq`. As Handler entscheiden je Befehl und melden Verweigerungen schon heute.

### 10.3 Nichts verschwindet still

| Wo | was |
|---|---|
| Planer | Prompt-Regel: „Write down every action he intends, in his order, even if it may be impossible now; the engine decides.“ Auffangart `other`. |
| Validator | nimmt nur weg mit Regel und Anzeige (M5) |
| Engine | N, L und W werden gemeldet: System-Zeile, Engine-Block für den Erzähler („Alaric's second action, burning the rope ladder, was not taken this round“) und Record |
| Erzähler | Der Engine-Block verbietet, nicht Ausgeführtes als geschehen zu erzählen. Die Firewall prüft Engine-Felder wie heute. |

**Grenze:** Dass der Planer eine beabsichtigte Teilhandlung **weglässt**, kann der Validator nicht deterministisch erkennen. Eine Wortabdeckungsprüfung würde bei Ausschmückungen („I grit my teeth and …“) ständig falsch fragen. Darum:
- Die Abdeckung steht nur als **Prüfprotokoll** im Record (nicht abgedeckte Handlungsverben).
- Weggelassene Teilhandlungen sind eine Kennzahl in S4b v2 und im Holdout (§21). In S4b v1: „verpasst“ 2,9 % (P1).

---

## 11. Rückfragen

**Drei Quellen, eine Behandlung:**

| Quelle | Beispiel | Optionen aus |
|---|---|---|
| Planer | „I attack“ bei drei Skorpionen; „I blast B“ bei zwei Zaubern (E1) | Plan (Katalog-IDs) |
| Validator | V3a, V3b, V3d, V4b, V5, Bestätigung V4d | Plan, wörtliche Spannen, Katalog |
| Engine | D2 mit ≥ 2 legalen Zielen | Zustand |

**Ablauf** (wie As Zielfrage heute, `playerTurn` → `targetQuestion`):
- Ein System-Panel zeigt Frage und Optionen.
- **Nichts** wird gebucht oder gewürfelt. Kein NPC-Zug, kein Erzähleraufruf.
- Der Record hält fest: `pending: {about, options, held_plan}`. Der **ganze** Plan wird zurückgehalten, damit keine Teilhandlung verloren geht.
- **Antwort:**
  - **Genau eine angebotene Option** (Label, Name, Skillname, „yes“ bei einer Bestätigung; normalisiert): Der Steuerkanal setzt sie in den zurückgehaltenen Plan, ohne LLM. Das ist eine Auswahl aus einer geschlossenen Menge. Der Plan durchläuft danach Validator und Engine wie jeder andere.
  - **Sonst:** Der Planer deutet die Antwort frei, mit `PENDING QUESTION` als Kontext („the wounded one“, „never mind, I run“).
- Eine Rückfrage ist kein Zug.

---

## 12. Wie „Fire Lance → Basic Attack“ verhindert wird

1. **Schema:** Der Planer kann Basic Attack nicht als Ersatz wählen. Ohne Skill schreibt er `null`, Unbekanntes als `{new}`. S4b: 0 Ersetzungen in 544 Entscheidungen.
2. **Validator:** „Fire Lance“ erkennt h2 („lance“ ~ „Flame Lance“).
   - `null` oder Basic Attack → V3b/V3c → Rückfrage;
   - `{new: "Fire Lance"}` → V3d → „Meinst du Flame Lance?“;
   - Flame Lance → passt.
3. **Engine:** Ein unbekannter Skill wird verweigert, nie ersetzt. Das gilt für jeden Pfad.
4. **Aufzeichnung:** Jede Abstufung steht mit ihrer Regel im Record, und die Mutationsprobe deckt jede Regel ab.

Garantie und Restrisiko: §7.

---

## 13. `ability_world` durch die Engine

**Handler:** `abilityWorld(state, content, intent, dice)`, neu in der Engine. Kosten- und Kraftlogik aus Bs `useAbilityOnWorld` (`src/gm/runtime.js`) dienen als Vorlage; der Handler wird neu geschrieben.

**Ablauf:**
1. **Ziel:** nur nach V5. Das validierte Ziel (ID oder `target_words`) ist Teil des Ereignisses.
2. **Skill und Kosten:**
   - Der Skill muss bekannt sein; `null` wird zu D1, z. B. „shoot down the dead pine“ mit Pfeil.
   - Kosten nach Beherrschungsstufe, Munition wie beim Angriff. B hat Munitions-Skills hier verweigert; C schließt diese Lücke.
3. **Im Kampf:** Haupthandlung (§10); die NPC-Züge folgen. B hatte die Weltnutzung im Kampf ganz verweigert (`active_combat_not_migrated`).
4. **Gelingen:** Core-#7-Probe, **von der Engine gerechnet**: Chance % = Actor ÷ (Actor + Opposition) × 100, W100 aus `Dice`.
   - Actor, Schwierigkeit je Zielklasse und Standardwert (`moderate` 6, in `rules.checks.difficulty_scores` als „proposed“ markiert) entscheidet E6.
   - Planer und Erzähler setzen keine Schwierigkeit.
5. **Wirkung in v1:** keine HP- und keine Statuswirkung auf Wesen (E6, E8). Der Engine-Block sagt das ausdrücklich.
6. **Ereignis:**

   ```text
   ability.world_used {skill, target (id | target_words), goal, cost, roll, chance, success, rng_to}
   ```

7. **Persistenz:**
   - Bei Erfolg darf der Extraktor eine dauerhafte Änderung **am validierten Ziel** vorschlagen.
   - Die Firewall verwirft Weltänderungen an anderen Dingen, die sich auf diese Handlung berufen.
   - Bei Misserfolg gibt es keine dauerhafte Änderung durch diese Handlung.

**Der Planer erfindet keinen Erfolg.** Das Schema hat dafür kein Feld; V1 verwirft Zusatzfelder.

---

## 14. Swipe, Regenerate, Bearbeiten (Prüfung von Punkt 8)

**Bindung:**
- Die mechanische Deutung (Plan, Urteile, Engine-Ereignisse) liegt im Record der **Spielernachricht**.
- Der Schlüssel ist `input_hash = hash32(msg.mes)` (`prepareGenerationAsync`).
- SillyTavern führt bei Spielernachrichten keine Swipes. Swipes der Antwort berühren diesen Record nicht.

| Ereignis | Planer | Validator, Engine, Würfel | Erzähler | Extraktor/Welt | am Code (A) |
|---|---|---|---|---|---|
| neue Spielernachricht | 1× | 1× | 1× | 1× | `prepareGenerationAsync` |
| **Swipe / Regenerate** | **nein** | **nein**: Ereignisse auf der Spielernachricht | neu | neu je Swipe (`text_hash`), nur im Rahmen der Freigaben des Records | Wiederverwendung bei gleichem `input_hash` |
| Continue | nein | nein | setzt fort | – | `type !== 'continue'` |
| Planer war fehlgeschlagen | ja: Es gab noch keine Deutung | dann 1× | dann 1× | | `r.interp?.failed` wird nicht zwischengespeichert |
| Board-Generierung fehlgeschlagen | nein, Plan wird wiederverwendet | nur Board neu | | | `retryBoard` |
| Rückfrage offen, Regenerate | nein | nichts | nicht aufgerufen (Panel schon gezeigt) | – | `command.posted` |
| Spielernachricht bearbeitet | ja, gegen den Zustand vor der Nachricht | neu | neu | neu | neuer `input_hash` |
| frühere Nachricht bearbeitet oder gelöscht | nein | nein: spätere Züge werden nicht neu aufgelöst | – | – | `onEdited`: Retcon nur auf der letzten Antwort |
| Verzweigung (Branch) | nein | nein | | | Der Record reist in `extra` mit |
| quiet / impersonate | nein | nein | – | – | `action: 'clear'` |

**Ergebnis:**
- Ein Swipe erzeugt nur neue Prosa und eine neue Lesung dieser Prosa durch den Extraktor.
- Gelingen, Kosten und Würfel der Mechanik sind fest.
- Den Planer ruft er nie auf.
- Neu geplant wird nur, wenn es noch keine gültige Deutung gibt oder der Spieler den Text seiner Nachricht ändert. Beides ist keine Neudeutung eines bestehenden mechanischen Ergebnisses.

**Neu in C: `state_before_hash`.** Der Record hält einen Hash des Zustands, gegen den geplant wurde. Stimmt er bei der Wiederverwendung nicht mehr, wurde eine frühere Nachricht geändert oder gelöscht. Dann gilt:
- Wie in A wird **nicht** still neu geplant oder neu gewürfelt.
- Die Engine zeigt einen Hinweis: „Diese Nachricht wurde gegen einen früheren Stand aufgelöst; zum Neuauflösen die Nachricht bearbeiten oder neu senden.“

Das ist reine Sichtbarkeit; As Semantik bleibt.

---

## 15. Event-Sourcing, RNG, Erzähler, Welt-Persistenz

**Record der Spielernachricht** (Erweiterung von `RECORD_V4`):

```text
{ input_hash, state_before_hash, route,
  ir:     { v: 'ir-2', acts[source], links },
  plan:   { version, prompt_hash, mode, ms, tokens, repaired, raw[] },
  check:  { verdicts[] (je mit Regel), turn: commit | ask | abort, pending? },
  gate_shadow: { cls, a0_plan, agrees },
  events: [turn.begun, …, ability.world_used, not_executed, outcome.recorded] (mit rng_to) }
```

- **Event-Sourcing:** Der Zustand ist die Faltung der Ereignisse (`foldChat`). `plan`, `check` und `gate_shadow` sind Prüfprotokoll, keine Ereignisquelle. Beim Neuaufbau wird nie neu geplant.
- **Deterministische Wiederholung:** `engine(Zustand vorher, check.commit, seed)` ergibt byte-gleich `events`. Das ist ein Test, kein Laufzeitpfad.
- **RNG:** `Dice.from(state)` je Zug; jede gezogene Zahl steht im Ereignis. Swipes ziehen nicht neu.
- **Erzähler:** bekommt Ergebnisse, Nicht-Ausgeführtes und Hinweise. Er erzählt nur.
- **Welt:** Extraktor → Firewall → Ownership → Envelope → Welt, wie in A. Neu ist nur die Freigabe aus `ability_world`. Der Planer hat keinen Schreibweg in die Welt.

---

## 16. Autoritätsgrenzen

| | entscheidet | entscheidet nie |
|---|---|---|
| **Planer** | Bedeutung: Art, bekannter Skill oder `null` oder `{new}`, Ziel-ID oder `{new}`, `target_words`, `goal`, Reihenfolge; ob gefragt werden muss | Mechanik (Angriff oder Skill, Flucht oder Reise), Ergebnis, Zahlen, Kosten, Schwierigkeit; Ersetzung; Wahl unter mehreren Zielen; Weglassen beabsichtigter Handlungen; Weltzustand |
| **Validator** | ob die Deutung zulässig und treu ist: annehmen, Rückfrage, ablehnen | Skill, Ziel, Art, Reihenfolge ersetzen; Handlungen ergänzen; freie Sprache deuten; RECENT lesen |
| **Engine** | Ausführbarkeit (N, L, W), kanonische Vorgaben D1–D5, Kosten, Würfel, Treffer, Schaden, Gelingen der Weltnutzung, NPC-Züge, Optionen der Engine-Rückfragen, Ereignisse | freie Sprache deuten; Prosa |
| **Erzähler** | Worte und Beschreibung im Rahmen des Engine-Blocks | Zahlen, HP, Geld, Rang, Gelingen, Nicht-Ausgeführtes als geschehen erzählen |
| **Extraktor + Firewall / Ownership / Envelope** | welche Prosa-Fakten Zustand werden, im Rahmen der Freigaben | Mechanik; Engine-Felder; Weltänderungen ohne Freigabe |
| **Host** | Zeitpunkt, Wiederverwendung je `input_hash`, Barriere | Inhalt |
| **A0-Gate (Schatten)** | nichts; misst | jeden Weg zur Engine |

---

## 17. Das A0-Gate: nur im Schatten (Prüfung von Punkt 6)

**In C nicht im Produktionspfad.**

Im Schatten:
- klassifiziert es jeden Zug: `FAST_COMMIT`, `FAST_CLARIFY`, `FAST_REJECT` oder `ESCALATE`;
- schreibt in den Record seinen Plan, ob er mit dem **validierten** Planer-Commit übereinstimmt (Art, Skill-ID, Ziel-ID, Anzahl der Handlungen) und die Planer-Latenz dieses Zuges;
- kostet keinen LLM-Aufruf und Millisekunden Rechenzeit.

Dafür bleiben `parseIntent` und `gate()` im Code, bis der Nutzer entschieden hat.

**Kennzahlen, die vor einer Aktivierung live erfüllt sein müssen** (jetzt festgelegt, alle zugleich):

| | Kennzahl | Schwelle | Begründung |
|---|---|---|---|
| **G1** Stichprobe | `FAST_COMMIT`-Züge aus echtem Spiel, nicht aus Testkorpora | ≥ 300, aus ≥ 2 Kampagnen und ≥ 2 Klassen | Bei 0 Abweichungen in 300 Zügen liegt die obere 95-%-Grenze der Abweichungsrate bei ≈ 1 % (Dreierregel) |
| **G2** Abweichungen | `FAST_COMMIT`-Plan ≠ validierter Planer-Commit | **0**, jede von Hand geprüft | Das Gate darf nie anders handeln als der geprüfte Hauptpfad |
| **G3** Anteil | `FAST_COMMIT` an allen Kampfzügen | ≥ 30 % | Darunter lohnt ein zweiter Pfad nicht |
| **G4** Nutzen | erwartete Ersparnis je Kampfzug = Anteil × Median der Planer-Latenz auf diesen Zügen | ≥ 1,0 s, **nachdem** Caching und Transportwahl (§18) umgesetzt sind | Latenz ist der einzige Nutzen |
| **G5** Einfrieren | Gate-Code und Wortlisten während der Messung unverändert | jede Änderung setzt G1/G2 zurück | Die Messung gilt nur für den gemessenen Code |
| **G6** Form bei Aktivierung | Der schnelle Pfad ersetzt **nur** den Planer-Aufruf. Validator und Engine laufen unverändert; Quelle `fast` im Record. Der Planer läuft im Hintergrund weiter und schreibt Abweichungen ins Protokoll. | Pflicht | kein zweiter Weg an den Prüfungen vorbei |

**Entfernung:** Über die Entfernung entscheidet der Nutzer nach echten Protokollen. Sind nach mindestens 300 Kampfzügen G3 oder G4 verfehlt, ist das die Empfehlung.

---

## 18. Transport: JSON-Text oder Tool-Aufruf

**Gemessen:**
- JSON-Text: 98,9 % gültig im 1. Versuch.
- Tool mit `tool_choice auto`: 85,7 %. 7 der 10 Rückfragefälle hatten ein ungültiges `kind`; 6 Negativfälle kamen ohne Aufruf.
- Der Tool-Pfad war je Aufruf deutlich schneller (p50 1,6 s gegen 3,4 s). Die Ursache ist unbekannt; die Läufe waren nicht verschränkt.

**Entscheidung:**
- Der **Vertrag** ist Schema v2.1.
- Der **Transport** wird in C4 verschränkt gemessen:
  1. JSON-Text;
  2. erzwungener Tool-Aufruf (`tool_choice required`) mit demselben Schema;
  3. falls verfügbar: `response_format` mit JSON-Schema.
- Es gewinnt die schnellste Variante mit nicht schlechterer Gültigkeit und Sicherheit.

Die enge Lesart des FC-Befunds: Verworfen sind
- die redundante Art,
- `tool_choice auto` und
- die Rückfrage ohne eigenes Beispiel.

Function Calling als Transport ist nicht verworfen.

---

## 19. Die S4b-Fehlerklassen in C

| Klasse | Fälle | Behandlung in C | Restrisiko |
|---|---|---|---|
| Weltziel aus dem Zweckteil, Katalog-Sog | k3_11 | V5 (Rückfrage); Prompt-Regel „target = what the skill acts on; goal = what should happen“; Engine-Fakten vor Prosa | Zielteil ohne Gegenkandidat (5d); messen |
| Modus-Abbildung im Planer | k4_05 (`go` im Kampf), k5_10 (`search` im Kampf) | Die Abbildung liegt in der Engine (D4, E4). Der Planer schreibt nur die Bedeutung. | keines, sobald E4 entschieden ist |
| Hinweisverb gegen Basisangriff | k6_08 | E1 als Daten; V3b | keines, sobald E1 entschieden ist |
| redundante Art | k1_07, k1_08 (FC) | `use_skill` | entfällt |
| Bestätigung | k2_13 | V4d `confirm` | entfällt |
| Rückfrage oder kein Aufruf im Tool-Pfad | k6_05, k0_07, 13 Erstversuche (FC) | Transportmessung (§18) | wird gemessen |
| Szenen- und Goldfehler | k6_07, k1_04 | Korpus v2; k1_04 über V3d („Meinst du …?“) | – |

**Nachrechnung unter Schema v2.1** (nachträglich, gleiche Daten, kein Beleg). Von P1s vier falschen Festlegungen in S4b v1 bliebe keine still:
- k3_11 → Rückfrage durch V5;
- k4_05 → `go` würde Flucht. Das Gold akzeptierte flee; der Fluchtteil wäre als zweite Haupthandlung nach W gemeldet worden;
- k5_10 → `search` nach E4;
- k6_08 → V3c/V3b mit E1 → Rückfrage.

Ob das hält, zeigen Korpus v2 und Holdout. Gegen die damalige Prompt-Regel 7 waren k4_05 und k5_10 Planerfehler. Unter v2.1 sind sie Fragen der Spezifikation. Beide Lesarten stehen in `docs/P0_S4B.md` §13.10.

---

## 20. Produktentscheidungen E1–E12

**Das sind Produktentscheidungen, keine technischen Wahrheiten.** Jede wird nach der Entscheidung zu Daten: Content oder Regeldatei. Prompt und Gold entstehen aus derselben Quelle. E1–E8 stammen aus Revision 1; E9–E12 kamen in diesem Pass dazu.

### E1 Hinweisverben (k6_08: „I blast Barkscorpion B“, Magier mit Flame Lance und Arcane Burst)

| Feld | Inhalt |
|---|---|
| Vorschlag | Hinweisverben je Klasse als Content-Daten; Magier: blast, zap. Allgemein: cast, conjure, summon, channel, spell, magic. Ein Hinweis und mehr als ein passender Skill → Rückfrage. Genau ein passender Zauber → dieser (L1). |
| Alternativen | (a) „blast“ ist ein allgemeines Verb → Basic Attack (Prompt-Regel 3; so taten es alle 4 Arme). (b) Rückfrage immer, auch bei genau einem Zauber. (c) „GM-Raten“, etwa der stärkste oder zuletzt benutzte Zauber (verworfen: Raten). |
| Technik | Vorschlag: Liste in `content/classes.json`, V3b. (a): keine Liste. Gold k6_08 = Rückfrage (Vorschlag) bzw. Basic Attack (a). |
| Spielgefühl | Vorschlag: eine Rückfrage, wo der Spieler Magie meint, aber keinen Zauber nennt; Spieler lernen schnell, Zauber zu nennen. (a): flüssiger, aber „blast“ wird ein Stabhieb, was sich falsch anfühlt. |
| Empfehlung | Vorschlag. Nur Verben, die klar Magie bedeuten. Allgemeine Kampfverben (hit, strike, attack, beim Waldläufer auch shoot) bleiben Basic Attack. |

### E2 Angriff auf einen anwesenden Nicht-Feind (k2_13: „I attack the salt merchant“)

| Feld | Inhalt |
|---|---|
| Vorschlag | Bestätigung (`confirm`), bei Haltung neutral oder freundlich; ein „yes“ genügt (Steuerkanal) |
| Alternativen | (a) sofort ausführen; der Spieler hat das Ziel ausdrücklich genannt (A heute). (b) nur bei freundlich oder quest-wichtig bestätigen. (c) immer bestätigen, auch bei Wesen. |
| Technik | `pending` und Steuerkanal-Antwort (wie Rückfrage); Haltung aus dem Zustand. Gold: `confirm`. |
| Spielgefühl | schützt vor Versprechern („salt merchant“ statt „bandit“), kostet bei Absicht einen Schritt, kann bevormundend wirken |
| Empfehlung | Vorschlag; neutral formuliert („Brede is not hostile. Attack him?“) |

### E3 Mehrere Haupthandlungen in einer Kampfrunde (k4_01, k4_05)

| Feld | Inhalt |
|---|---|
| Vorschlag | Die erste ausführbare Haupthandlung (mit einer Bewegung) wird ausgeführt, der Rest gemeldet und nicht gespeichert. Kategorien N, L, W (§10.2): Bei L wird nichts aufgelöst. |
| Alternativen | (a) vorher fragen: „Eine Handlung pro Runde, welche?“ (b) Rest für die nächste Runde vormerken (verworfen: veraltet). (c) zwei Handlungen erlauben (Regeländerung, nicht im Core). |
| Technik | rein Engine; der Planer bleibt unverändert. Engine-Block-Zeilen für Nicht-Ausgeführtes. |
| Spielgefühl | Vorschlag: flüssig, sofort sichtbar, was geschah. Risiko: Der zweite Teil war dem Spieler wichtiger (er hat aber die Reihenfolge geschrieben). (a): sicherer, aber langsamer. |
| Empfehlung | Vorschlag |

### E4 Wahrnehmung im Kampf (k5_10: „I scan the treeline for more wolves“)

| Feld | Inhalt |
|---|---|
| Vorschlag | keine Engine-Handlung: freier Blick, der Kampf wartet (A heute bei einer Nachricht ohne Kampfaktion). Der Erzähler beschreibt, was sichtbar ist; neue Wesen nur nach As Regeln. |
| Alternativen | (a) Wahrnehmungsprobe (Core #8), verbraucht die Haupthandlung. (b) Blick, der den Zug verbraucht (wie hold). |
| Technik | Vorschlag: keine. (a) braucht verborgene Gegner als Engine-Zustand; den gibt es dafür heute nicht. |
| Spielgefühl | Vorschlag: natürlich für einen kurzen Blick, aber beliebig wiederholbar. (a): taktisch, mehr Regeln. (b): bestraft Umsicht. |
| Empfehlung | Vorschlag für v1; (a), wenn verborgene Gegner Engine-Zustand werden |

### E5 „Bogen anlegen und warten“ (k8_09)

| Feld | Inhalt |
|---|---|
| Vorschlag | `activity {kind: wait}` → hold: Der Zug ist vorbei, die NPCs handeln |
| Alternativen | (a) keine Engine-Handlung, der Kampf wartet. (b) vorbereitete Handlung: Schuss, sobald der Wolf sich bewegt (neue Mechanik). (c) Rückfrage. |
| Technik | hold gibt es in A. (b) braucht eine neue Mechanik. |
| Spielgefühl | hold: „warten“ lässt Zeit vergehen. (b) würde „trained on“ am besten treffen. (a): verwirrend, weil nichts passiert. |
| Empfehlung | Vorschlag für v1; (b) als spätere Regel |

### E6 Auflösung von `ability_world`

| Feld | Inhalt |
|---|---|
| Vorschlag | Core-#7-Probe, von der Engine gerechnet: Actor = Leitwert des Skills (genau festzulegen), Schwierigkeit je Zielklasse (Standard `moderate` 6). Bei Erfolg dauerhafte Änderung nur am Ziel. **Keine HP- oder Statuswirkung auf Wesen in v1.** Im Kampf eine Haupthandlung, Kosten wie der Skill. |
| Alternativen | (a) gelingt immer, wenn der Skill passt; der Erzähler gestaltet. (b) Der Erzähler entscheidet mit dem vorab gezogenen Würfel (As Praxis bei Story-Proben). (c) Wirkungstabellen je Skill-Merkmal × Material (Feuer brennt Seil und Holz). Zusatz: (i) nie Wesen-Schaden in v1; (ii) Umweltschaden nach fester Regel. |
| Technik | Vorschlag: Actor-Definition, Schwierigkeitstabelle, Ereignis, Firewall-Freigabe. (a) minimal. (c) viel Content. (ii) neue Schadensregel. |
| Spielgefühl | Vorschlag: Unsicherheit, fair. Mit (i) wirken kreative Angriffe im Kampf zahm. (a) großzügig, entwertet Hindernisse. (ii) belohnt Taktik. |
| Empfehlung | Vorschlag mit (i) für v1, klar angesagt; (c) und (ii) nach Live-Daten |

### E7 „the second one“ (k2_15, Labels A/B)

| Feld | Inhalt |
|---|---|
| Vorschlag | B: Ordnungszahl = Label-Reihenfolge, keine Rückfrage, wenn die Labels Buchstaben sind und die Zahl genau passt |
| Alternativen | (a) bei Ordnungszahlen immer fragen. (b) nach Position oder Abstand (A kennt keine Positionen; Abstandsbänder sind mehrdeutig). |
| Technik | Planer-Regel und Gold; deterministisch prüfbar |
| Spielgefühl | natürlich in den meisten Fällen. Risiko: „the second one from the left“ meint eine Position, die A nicht kennt. |
| Empfehlung | Vorschlag; Rückfrage bei Namen-Labels oder unpassender Zahl |

### E8 Heavy Slash auf das Laternenseil, damit die Laterne auf Bandit B fällt (k3_12)

| Feld | Inhalt |
|---|---|
| Vorschlag | `ability_world` auf die Laterne (`target_words` „the lantern's rope“). Bandit B nimmt in v1 keinen Engine-Schaden; der Erzähler darf keinen Treffer mit Schaden erzählen. |
| Alternativen | (a) Rückfrage: „Bandit B angreifen oder das Seil kappen?“ (b) Weltnutzung plus Umweltschaden (E6 ii). (c) als indirekter Angriff auf Bandit B mit dem Schaden von Heavy Slash. |
| Technik | Vorschlag: nichts Neues. (b) braucht E6 (ii). (c) ist mechanisch fragwürdig. |
| Spielgefühl | Vorschlag kann enttäuschen, weil die Laterne fällt, aber nichts bewirkt. (b) belohnt. (a) bremst. |
| Empfehlung | Vorschlag, abhängig von E6; mit klarer Erzählervorgabe („der Bandit weicht aus oder ist abgelenkt, nicht verletzt“) |

### E9 Story-Handlungen im Kampf (neu): Trank trinken, Gegenstand geben, rasten

| Feld | Inhalt |
|---|---|
| Vorschlag | v1: nicht ausführbar (N), gemeldet „im Kampf nicht möglich“. Das ist As Mechanik: Dort wird im Kampf kein Story-Befehl gedeutet, die Nachricht verpufft heute still. |
| Alternativen | (a) Trank als Haupthandlung (neue Engine-Regel). (b) freie Handlung ohne Zugverbrauch. |
| Technik | Vorschlag: keine. (a) braucht einen Kampf-Handler für `use`. |
| Spielgefühl | Ein Trank, der im Kampf nicht geht, überrascht. Spieler werden ihn versuchen. |
| Empfehlung | Vorschlag für v1, (a) als erste Engine-Erweiterung nach C |

### E10 Kreative Handlung ohne Skill im Kampf (neu): „I kick sand into his eyes“

| Feld | Inhalt |
|---|---|
| Vorschlag | `other`: nicht ausgeführt, gemeldet, der Kampf wartet (entspricht A, nur sichtbar) |
| Alternativen | (a) improvisierte Handlung: Core-#7-Probe ohne HP-Wirkung, verbraucht die Haupthandlung (wie E6 ohne Skill). (b) als Basic Attack (L4). |
| Technik | Vorschlag: keine. (a): Handler wie E6. (b): falsche Mechanik für Nicht-Angriffe. |
| Spielgefühl | Vorschlag: ehrlich, aber trocken. (a) belohnt Kreativität. |
| Empfehlung | Vorschlag für v1, (a) prüfen, wenn E6 lebt |

### E11 Reihenfolge von Bewegung und Angriff (neu, aus dem Code)

| Feld | Inhalt |
|---|---|
| Vorschlag | As Regel D5 beibehalten: „closer“ vor, „away“ nach dem Angriff, unabhängig von der geschriebenen Reihenfolge |
| Alternativen | (a) Spielerreihenfolge wörtlich: Zurücktreten zuerst kann einen Nahkampf-Skill unzulässig machen (L, nichts passiert). |
| Technik | Vorschlag: keine. (a): Reihenfolge-Feld im Adapter und `attackAction` ändern. |
| Spielgefühl | Vorschlag: spielerfreundlich („either order“ im Core). (a): wörtlich, kann frustrieren. |
| Empfehlung | Vorschlag, mit Anzeige der tatsächlichen Reihenfolge in der System-Zeile |

### E12 Unbekannter Skillname mit Fast-Treffer (neu)

| Feld | Inhalt |
|---|---|
| Vorschlag | Hat der Planer `{new: X}` geschrieben und passt X fast genau zu einem bekannten Skill → „Meinst du Flame Lance?“; sonst verweigern mit der Liste der bekannten Skills |
| Alternativen | (a) immer verweigern. (b) Tippfehler mit Abstand 1 still annehmen (verworfen: stille Ersetzung durch die Engine). |
| Technik | V3d. Gold: L1 (der Planer löst Aliase selbst auf) bleibt. Die Rückfrage greift nur, wenn der Planer nicht aufgelöst hat. |
| Spielgefühl | hilfreich statt nur „kennst du nicht“ |
| Empfehlung | Vorschlag |

---

## 21. Holdout-Spezifikation (Autor: ChatGPT)

**Zweck:** eine unabhängige Prüfung von Planer + Validator (+ Engine-Sicht) auf der Produktfrage. Geschrieben wird sie von einem Autor, der S4b und C **nicht** entworfen hat. Sie dient nie zum Einstellen.

### 21.1 Umfang und Kategorien

**≈ 120 Fälle** (100–140), davon 30 als Stabilitätsfälle (3 Wiederholungen).

Begründung:
- Bei 0 falschen Festlegungen in 120 Fällen liegt die obere 95-%-Grenze bei ≈ 2,5 % (Dreierregel).
- Je Kategorie sind es 6–15 Fälle; dort gibt es nur Richtungen, keine Signifikanz.

| | Kategorie | Fälle |
|---|---|---|
| H1 | exakte Befehle (Skill + Label) als Kontrolle | 6 |
| H2 | Aliase, Tippfehler, Umschreibungen bekannter Skills, auch ohne Wortüberlappung | 12 |
| H3 | Zielbezüge: Teil-Labels, Beschreibungen, Pronomen, Engine-Fakten („the one that hit me“), Prosa-Bezüge | 14 |
| H4 | Weltnutzung: Objekte und Kulisse, Zweckteil, Ziel im Zweckteil gegen Ziel im Zielteil (beide Richtungen) | 14 |
| H5 | Mehrfachhandlungen: Bewegung + Skill in beiden Reihenfolgen, zwei Haupthandlungen, Kampf + Welt, Angriff + Flucht, Story-Handlung + Kampfhandlung | 12 |
| H6 | Gehen, Suchen, Warten in und außerhalb von Kämpfen (Modus-Abbildung) | 10 |
| H7 | echte Mehrdeutigkeit: Ziel, Skill, Art | 10 |
| H8 | Unbekanntes und Unmögliches: nicht gelernte Content-Skills, erfundene Namen, Fast-Treffer, abwesende Ziele | 10 |
| H9 | Negativfälle: Fragen, Pläne und Bedingungen, Rede und Drohung, Erinnerung, Taten anderer, OOC | 12 |
| H10 | je entschiedene Produktregel E1–E12 mindestens 1–2 Fälle (getrennt ausgewiesen) | ≈ 14 |
| H11 | Antworten auf eine offene Rückfrage: exakte Option, freie Antwort, Meinungswechsel | 6 |
| H12 | Story-Befehle (Handel, Gilde, Quest, Reise) mit Kampf- oder Skill-Anteil | 6 |

**Szenen:**
- mindestens 6, im S4b-Szenenformat;
- nur Klassen, Skills, Monster und Orte aus `content/`;
- mindestens 2 Szenen, die den S4b-Szenen nicht ähneln: andere Klassen-Kombination, andere Monster, benannter Unbeteiligter, ein Nicht-Feind, Objekte am Ort.

### 21.2 Was der Autor kennen darf, und was nicht

| darf kennen | darf nicht sehen |
|---|---|
| die Produktfrage und die Grundsätze (keine stille Ersetzung, fragen statt raten, Engine-Autorität) | den S4b-v1-Korpus und den Korpus v2 (Entwicklungssatz), damit nichts umformuliert übernommen wird |
| Schema v2.1, Ausgangsklassen und Schwere | den Planer-Prompt (Regeltext, Beispiele) |
| die Labelregeln L1–L9 in der überarbeiteten Fassung und die **entschiedenen** E-Regeln als Text | die Validator-Heuristiken: Hinweislisten, Zweckwörter, Schwellen, Abstände |
| Szenenformat, Content-Katalog (Klassen, Skills, Monster, Orte), Kategorien und Mengen | Ausgaben eines Planers auf Holdout-Texten vor der Versiegelung |

**Hinweise:**
- ChatGPT kennt die S4b-Zusammenfassungen und die Fehlerliste (k3_11 usw.). Das lässt sich nicht rückgängig machen. Die Vorgabe lautet: keine Sätze aus diesen Berichten übernehmen, keine Fälle als bloße Varianten davon bauen.
- **Claude sieht den Holdout vor dem ersten Lauf nicht.** Der Nutzer führt den Lauf lokal aus. Erst die Ergebnisse kommen zur Auswertung zurück.

### 21.3 Versiegelung

1. ChatGPT schreibt `holdout_cases.jsonl`, `holdout_scenes.json` und eine kurze Begründung je strittigem Gold-Label.
2. Der Nutzer berechnet die SHA-256-Werte (PowerShell: `Get-FileHash -Algorithm SHA256 <Datei>`). Er committet **nur** ein Manifest (`tests/eval/holdout_manifest.json`) mit:
   - Hashes;
   - Fallzahl je Kategorie;
   - Datum;
   - Commit des zu prüfenden Planer- und Validator-Stands.
3. Die Dateien bleiben bis nach dem ersten Lauf außerhalb des Repositories.
4. Das S4b-v2-Werkzeug liest einen externen Pfad. Es prüft den Hash gegen das Manifest und bricht bei Abweichung ab.
5. Nach dem Lauf dürfen die Dateien committet werden. Die Hashes belegen, dass sie unverändert sind.
6. **Errata:** Gold-Korrekturen nach dem Lauf nur als begründete Liste. Die Originalwertung wird **immer zuerst** berichtet (wie §13.6 in S4b).
7. **Einmal:** Der Holdout dient nie zum Einstellen. Die nächste Iteration braucht einen neuen Holdout.

### 21.4 Vorab festgelegte Kennzahlen

Sie werden im Manifest festgeschrieben; die Schwellen entsprechen §23 Block B.

| Kennzahl | Schwelle |
|---|---|
| stille falsche Festlegungen (alle Fälle, nach Unterart) | ≤ 2 je 100 Fälle |
| Ersetzung eines **genannten** Bezugs (Skill, Wesen, Weltziel) | 0 |
| falsche Agency (Negativfälle) | 0 |
| stilles Verschwinden: beabsichtigte Handlung weder ausgeführt noch gefragt noch gemeldet (Ende zu Ende, mit Validator- und Engine-Sicht) | 0 |
| weggelassene Teilhandlungen in Mehrfachfällen (Planer) | ≤ 1 |
| Absicht richtig | ≥ 85 % gesamt; je Kategorie berichtet |
| Rückfrage-Recall / unnötige Rückfragen | ≥ 85 % / ≤ 5 % der reinen Handlungsfälle |
| gültig nach Reparatur | ≥ 99 % (Transportfehler getrennt) |
| Stabilität (30 × 3) | safe^3 = 100 %, pass^3 ≥ 90 % |
| Latenz p50 / p90, Token | berichtet; Schwellen §23 |
| Validator | Abstufungen je Regel, von Hand als richtig oder unnötig bewertet |
| Gate-Schatten | Anteil `FAST_COMMIT`, Abweichungen |

**Statistik:** Wilson-Intervalle (95 %). Keine Signifikanzaussagen über Kategorien. Produktregel-Fälle (H10) werden zusätzlich getrennt ausgewiesen.

---

## 22. Minimaler Umsetzungsplan

Jeder Schritt ist ein eigener Commit mit grüner Suite. Bis C6 ist nichts davon im Spiel aktiv.

| Schritt | Inhalt | Prüfung |
|---|---|---|
| **C0** | neuer Branch von A (90bd450); nur P0-Werkzeuge und Dokumente per Datei-Checkout; keine B-Commits | `npm test` grün; A byte-gleich (V3/V4-Diff, Golden) |
| **C1** | • E1–E12 entschieden (Nutzer mit ChatGPT) <br>• **eine Regeldatei** als Quelle für Prompt, Hinweislisten und Gold <br>• Schema v2.1 eingefroren <br>• Korpus v2 (Entwicklungssatz, Claude): k6_07 konsistent, `use_skill`, `confirm`, `target_words`, Modus-Abbildung, `other`, Mehrfachfälle mit N/L/W <br>• **Holdout (ChatGPT), versiegelt** (§21). Korpus v1 und seine Ergebnisse bleiben unverändert. | Korpus-Integrität; Gold ↔ Regeldatei |
| **C2** | `validatePlan` als reines Modul mit V1–V6; Eigenschaftstest M1–M6; Mutationsprobe je Regel. Offline: die gespeicherten S4b-v1-Rohpläne durch V3 und V5 (mit abgeleiteten `target_words`) | alle Abstufungen von Hand geprüft; keine neue stille Festlegung |
| **C3** | `plannerRequest`: Modus-Prompt aus der Regeldatei, Katalog, Engine-Fakten, RECENT-Varianten | gleicher Zustand → gleiche Prompt-Bytes; Token je Modus |
| **C4** | S4b v2: Planer + Validator auf Korpus v2, danach **einmal** Holdout. Verschränkt: Transport (3 Varianten), RECENT (3 Varianten), Modus-Prompt gegen vollen Prompt. Stabilität 30 × 3. | §23 Block B |
| **C5** | Engine: <br>• `use_skill`-Adapter <br>• Handler `ability_world` <br>• Ausführbarkeit N/L/W <br>• D1–D5 <br>• Panels für Rückfrage und Bestätigung <br>• Steuerkanal-Antworten | As Kampftests mit gleichwertigen Plänen → identische Ereignisse; Wiederholungstest |
| **C6** | Laufzeit hinter `planner: off \| shadow \| on`: <br>• `shadow`: A entscheidet, C wird nur protokolliert <br>• `on`: C entscheidet, das Gate läuft im Schatten | Node-Tests: Swipe, Regenerate, Bearbeiten, Continue, Reload, Rückfrage; Barriere |
| **C7** | Engine-Block-Zeilen; Firewall-Freigabe aus `ability_world`; Persistenzmodell für `{new}`-Weltziele (§25); Erzählervertrag | Firewall-Tests; Mutationsprobe |
| **C8** | echte SillyTavern-Smokes mit Mock-Anbieter | wie bisher |
| **C9** | Live-Paarlauf A gegen C, erst `shadow`, dann `on` | §23 Block D; Gate-Kennzahlen G1–G6 beginnen |

**Bewusst nicht in v1:**
- Szenen-Merkmale aus der Welt;
- HP-Wirkungen der Weltnutzung;
- vorbereitete Handlungen;
- Tränke im Kampf;
- Planen und Erzählen in einem Aufruf;
- andere Sprachen.

---

## 23. Tests vor einer Migration (`on` als Standard)

**A. Unverändertes:**
- volle Suite grün;
- V3/V4-Diff und Golden-Tests von A byte-gleich mit `off`;
- As Kampftests mit gleichwertigen Plänen: identische Ereignisse;
- S1-Story-Korpus: Der Planer im Storymodus ist im Vorzeichentest nicht schlechter als der Interpreter; 0 falsche Agency nach dem Guard.

**B. Semantik (Korpus v2 und Holdout, Schwellen vorab):**
- Korpus v2: ≤ 2 stille falsche Festlegungen, 0 Ersetzungen genannter Bezüge, 0 falsche Agency, Rückfrage-Recall ≥ 85 %, unnötige Rückfragen ≤ 5 %.
- Holdout: die Kennzahlen aus §21.4.
- Stabilität: safe^3 = 100 %, pass^3 ≥ 90 %.
- Planer-Latenz im Kampf: p50 ≤ 3,5 s, p90 ≤ 7 s (A-Interpreter live: 2,3–6,2 s). **Diese Schwelle bestätigt der Nutzer** (§25).

**C. Validator:**
- Eigenschaftstest M1–M6 (Zufallspläne, Zufallszustände);
- für jede Regel V1–V6 ein Test, der beim Entfernen der Regel fehlschlägt.

**D. Determinismus und Host:**
- gleicher Record + Zustand → byte-gleiche Ereignisse;
- Swipe ×3: identische Ereignisse und Würfel, nur die Prosa unterscheidet sich;
- Regenerate nach Planerausfall: neu geplant;
- Bearbeiten: neu geplant ab dem Zustand vor der Nachricht;
- Reload: identische Faltung;
- `state_before_hash` weicht ab: Hinweis, kein stilles Neuplanen;
- offene Rückfrage: nichts gebucht, kein NPC-Zug, kein Erzähler;
- Antwort mit genau einer Option: kein LLM-Aufruf.

**E. Live:**
- 0 stille Ersetzungen und 0 stilles Verschwinden in den Protokollen;
- jede Abstufung und jede Nicht-Ausführung mit Regel sichtbar;
- Gesamtlatenz je Zug gegen A.

---

## 24. Branch

**Neuer Branch von A** (`claude/gen35-world-envelope-2026-10-01` @ 90bd450).

- A ist der gemessene stabile Stand.
- C ist ein Umbau von As Eingangsseite.
- Der Versuchsbranch (`chatgpt/narrator-gm-tools-2026-10-02`) trägt B: `src/gm/*`, die Host-Verdrahtung in `index.js` (≈ 130 Zeilen), `4.3.0-alpha.2` und `case 'hold'` in `pcActionOf`. C darauf zu bauen würde zwei Prototypen vermischen.
- Übernommen werden nur Dateien:
  - P0-Werkzeuge, Korpora und Tests;
  - die Dokumente;
  - Bs `useAbilityOnWorld` als **Vorlage** für den Engine-Handler.
- Der Versuchsbranch bleibt als Prototyp B unverändert.
- `main` liegt 221 Commits hinter A und ist keine Basis.

---

## 25. Offene Punkte, und was vor C0/C1 geklärt sein muss

**Vor C0:** nichts Architektonisches. C0 ist mechanisch (Branch, Dateien). Wann er beginnt, entscheidet der Nutzer.

**Vor C1** (Gold-Labels), alles Produkt- und Prozessfragen:
1. E1–E12 entschieden, inklusive der Hinweislisten aus E1 als Daten.
2. Schema v2.1 und Labelregeln bestätigt (dieses Dokument). Neu gegenüber S4b:
   - `use_skill` statt `attack`/`skill`;
   - modusunabhängige Arten statt L7 im Planer;
   - `other`;
   - `target_words`;
   - `activity: wait` statt `hold`.
3. Holdout-Ablauf (§21) vereinbart und ChatGPT gebrieft.

**Vor C4:**
- Latenzbudget im Kampf bestätigt (Vorschlag p50 ≤ 3,5 s);
- welche Transportvarianten SillyTavern mit dem Spielmodell anbietet (`tool_choice required`, `response_format`).

**Vor C5/C7, technisch offen, aber nicht blockierend für C0/C1:**
- E6-Zahlen (Actor-Wert, Schwierigkeitstabelle).
- **Persistenzmodell für `{new}`-Weltziele:** Wo in As Weltmodell „die Decke über dem Loch ist eingestürzt“ liegt (Ortsfakt mit Geltungsbereich?) und wie die Firewall die Freigabe daran bindet. Das ist die einzige echte Architekturfrage, die noch offen ist. Sie betrifft C7, nicht die Deutung.
- Nicht angreifende Skills außerhalb des Kampfes: wie A ohne Buchung, oder als `ability_world`?

**Messfragen** (keine Architekturfragen, Antwort in C4):
- gemeinsamer Planer auf Story-Befehlen;
- Prosa-RECENT ja oder nein;
- Fehlalarme von Hinweis-Detektor und Zielteil-Trennung;
- weggelassene Teilhandlungen;
- Transport.

---

## 26. Risiken

- **Autorenbias:** Korpus, Gold, Prompt, Gate, Heuristiken und dieser Entwurf stammen vom selben Autor. Die Machbarkeitsprüfungen in §7 und §9 sind nachträglich. Holdout (§21) und Live-Paarlauf sind die eigentlichen Prüfungen.
- **Englische Heuristiken:** Hinweis-Detektor und Zielteil-Trennung (Zweckwörter) sind sprachabhängig. Ihre Fehlalarme kosten Rückfragen, nie stille Festlegungen.
- **Kampflatenz:** C fügt im Kampf einen Aufruf vor dem Erzähler hinzu (gemessen p50 3,4 s). Ob Caching, Transportwahl und Modus-Prompt das genug senken, ist offen. Das Gate ist dafür nur im Schatten vorgesehen.
- **Restrisiko `skill: null`:** Umschreibungen ohne Wortüberlappung (§7). Zwei Stufen müssten zugleich versagen.
- **E6/E8/E10:** Ohne Wirkungen auf Wesen kann sich Kreativität im Kampf zahm anfühlen. Das ist eine Spielentscheidung.
- **Ein Modell, Englisch.**
