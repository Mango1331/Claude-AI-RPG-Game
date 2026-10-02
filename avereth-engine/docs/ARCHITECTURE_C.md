# Architektur C: Planer → Validator → Engine → Erzähler → Persistenz

Stand 02.10.2026, **Revision 3: entscheidungsreif.**

**Status:** Letzter Review vor C0/C1. Es gibt **keinen Produktionscode** für C. A und B bleiben unverändert.

**Grundlage:**
- `docs/P0_S4B.md` §13, mit den Präzisierungen in §13.10;
- `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §2 und §7;
- `docs/RESEARCH_NL_TO_ENGINE.md`.

**Code-Bezug:** A ist Gen 3.5 / 4.2.1 (`claude/gen35-world-envelope-2026-10-01` @ 90bd450). Alle Datei- und Funktionsangaben beziehen sich auf diesen Stand.

**Versionen:**
- Revision 1 (Commit b3d95d5): erster Entwurf.
- Revision 2 (0fab23f): restriktiver Validator, `use_skill`, Weltziel-Treue.
- Revision 3: Review-Ergebnis (siehe Tabelle unten).

---

## Änderungen gegenüber Revision 2

Jeder Punkt wurde vor der Übernahme gegen Code und Architektur geprüft. Keiner wurde abgelehnt.

| Punkt | Revision 2 | Revision 3 | Prüfung |
|---|---|---|---|
| Hinweis-Detektor | Komponenten h1–h6 | ausdrücklich ein **kleiner Safety Catch** mit festen Grenzen (§6.4). Er wählt nie etwas und wächst nicht zu einem zweiten Parser. | konsistent: Der Detektor kann ohnehin nur abstufen |
| E2 | Bestätigung bei neutralem oder freundlichem Ziel | **ausführen**, wenn Ziel und Handlung eindeutig sind. Rückfrage nur bei semantischer Zielunsicherheit. `confirm` entfällt (V4d gestrichen). | A führt einen benannten Angriff heute schon aus |
| E3 / E11 | D5: „closer“ vor, „away“ **nach** dem Angriff (As Umordnung) | **strikt Spielerreihenfolge.** D5 gestrichen; neue Engine-Invariante X1 (keine Umordnung). Dass `attackAction` die Reihenfolge noch nicht einhält, ist Engine-Migrationsbedarf. | Core #12/#24, im Code zitiert: „one move + one Main Action, **either order**“. Die Engine darf die Reihenfolge des Spielers einhalten; A legt nur eine fest. |
| E4 | keine Engine-Handlung, der Kampf wartet | `search` bleibt `search`. Entweder eine kostenpflichtige Wahrnehmungshandlung oder sichtbar nicht ausführbar; nie kostenlos, nie „keine Handlung“. Empfehlung: kostenpflichtig (§20). | A hat für den SC keinen Zustand für verborgene Gegner (nur `scene.awareness` der NPCs). Die Suche findet in v1 mechanisch nichts. |
| E7 | „second one“ = B nach Label-Reihenfolge | nur aus einer **für den Spieler etablierten** Reihenfolge, nie aus Katalog- oder ID-Reihenfolge | Die Labels A/B/C zeigt A dem Spieler im System-Panel |
| E8 | Weltnutzung an der Laterne | ausdrücklich: Ziel **und** vollständiger Zweck („auf Bandit B fallen lassen“) bleiben gespeichert; die Engine meldet, dass v1 keinen Kreaturenschaden berechnet | – |
| E9 / E10 | sichtbare v1-Grenze | dazu als **offene Open-World-Lücke** markiert (§20, §26) | – |
| E12 | Fast-Treffer | eng definierte Ähnlichkeit, genau ein Kandidat, nur als Frage | – |
| Modus-Abbildung | D4: im Kampf `go` → Flucht | **gestrichen.** `go` bleibt Reise und ist im Kampf nicht ausführbar (gemeldet). Wegkommen ist die semantische Absicht `flee`. Bewegung in der Szene ist `move`. | Bedeutung und Mechanik getrennt; k4_05 und k5_10 neu geprüft (§19) |
| D2 | einziges legales Ziel → dieses | nur, wenn der Spieler **keinerlei** Zielbezug formuliert hat; neue Catch-Regel V4e | As eigener Vorrang: `EXPLICIT_REF_RE` in `resolveTarget` |
| Restklasse `skill: null` | Restrisiko genannt | ausdrücklich: Der Safety Catch kann kreative Umschreibungen nicht abdecken. Eigene Holdout-Teilmenge (§21). | – |
| Holdout | ChatGPT als Autor | ChatGPT kennt S4b und ist als blinder Autor ungeeignet. Stattdessen eine **frische isolierte Instanz** als Autor plus eine zweite für die blinde Gegenkennzeichnung. ChatGPT prüft Unterlagen, Hashes und Auswertung (§21). | – |
| Schwellen | „≤ 2 je 100“ | absolute Ganzzahlen bei N = 120; Statistik mit Methode und Fehlerklasse (§21.5) | exakt nachgerechnet |
| Evidenz | Machbarkeitsprüfungen | Regel: S4b-Korpora sind nur Entwicklungs- und Regressionsdaten, nie Beleg (§2) | – |

---

## 0. Entscheidungen in Kürze

1. **C ist ein Umbau von As Eingangsseite.** Hinter der Deutung bleibt A: IR, Record je `input_hash`, Agency-Guard, deterministische Engine mit RNG, Ereignisse auf Nachrichten, Erzähler nur Prosa, Extraktor mit Firewall.
2. **Pipeline:**

   ```text
   Steuerkanäle → Planer → restriktiver Validator → Engine → Ereignisse → Erzähler → validierte Persistenz
   ```

   Das A0-Gate misst nur im Schatten (§1, §17).
3. **Der Planer deutet nur Bedeutung.** Schema v2.1 hat semantische, modusunabhängige Arten (§4). Mechanik leitet die Engine aus Skill-Definition, Modus und Regeln ab (§5).
4. **Validator, harte Invariante:** `accept | clarify | reject`. Nie Ersatz von Skill, Ziel, Art oder Reihenfolge, nie eine zusätzliche Handlung (§6). Das ist im Code als Eigenschaftstest umzusetzen, nicht als Prompt-Regel.
5. **Engine, harte Invariante:** Spielerreihenfolge bleibt erhalten. Sie füllt nur über drei geschlossene Vorgaben D1–D3. Jede Nicht-Ausführung wird gemeldet (§5.4).
6. **`skill: null`** wird zum Basisangriff, nur ohne Skill-Hinweis. Der Safety Catch blockiert offensichtliche Hinweise. Kreative Umschreibungen ohne Wortüberlappung bleiben ein Wahrscheinlichkeitsproblem für den Holdout (§7).
7. **Ziel-Treue:** Ein genanntes Wesen oder Weltobjekt wird nie durch ein anderes ersetzt (V4b, V5). Ein eigener Zielbezug hat Vorrang vor D2 (V4e).
8. **Mehrfachhandlungen:** Der Planer behält alle Teile in Spielerreihenfolge. Die Engine arbeitet sie bis zur Ökonomiegrenze ab. Der Rest wird gemeldet, nie vorgemerkt, nie still verworfen (§9).
9. **Swipe** erzeugt nur neue Prosa. Die Mechanik hängt an der Spielernachricht (§14).
10. **RECENT** dient Flüssigkeit und Referenzauflösung, nicht der Sicherheit (§11).
11. **Holdout:** frischer isolierter Autor, blinde Gegenkennzeichnung, Versiegelung vor dem Lauf, absolute Schwellen (§21).
12. **Branch:** neu von A (§24).

---

## 1. Pipeline

```text
Player message
     ↓
control channels only            #-Befehl · Erschaffungsmenü · toter SC · Antwort = genau eine angebotene Option
     ↓
specialized semantic planner     1 LLM-Aufruf; nur Bedeutung (§4, §12)        ┐  parallel, ohne Autorität:
     ↓                                                                          ├─ A0-Gate im Schatten (§17),
deterministic restrictive        accept · clarify · reject (§6)                ┘  schreibt nur ins Prüfprotokoll
validator
     ↓
deterministic engine             Ausführbarkeit N/L/W · Vorgaben D1–D3 · Mechanik · RNG (§5)
     ↓
canonical events/state           Ereignisse auf der Spielernachricht; Faltung (§15)
     ↓
narrator                         Prosa zum Ergebnis; bei Rückfrage nicht aufgerufen
     ↓
validated world persistence      Extraktor → Firewall / Ownership / Envelope; nur freigegebene Fakten
```

**Prüfung:** Die Pipeline gilt nach allen Änderungen unverändert. Präzisierungen:
- Rückfragen entstehen an drei Stellen: Planer (semantisch), Validator (Treue) und Engine (mechanische Unterbestimmung, z. B. D2 ohne eindeutiges Ziel). Alle halten **vor** jeder Zustandsänderung an.
- Die Engine hat eine Stufe „Ausführbarkeit“ vor der Mechanik. Sie deutet nichts.
- Das Gate hat keinen Weg zur Engine.

---

## 2. Was als Beleg gilt

| Datenquelle | Rolle | darf belegen |
|---|---|---|
| S4b-Korpus v1 (91 Fälle, gemessen) | Ergebnis von S4b; danach **nur** Entwicklungs- und Regressionsdaten | die S4b-Aussagen in `docs/P0_S4B.md` §13. **Nicht**, dass nachträglich entworfene Validator-Regeln funktionieren. |
| nachträgliche Prüfungen auf v1 (V5: k3_11 gefangen, 0 Fehlalarme; Hinweis-Detektor: 52/52 und 0/6) | Machbarkeit und Regression | nur „umsetzbar“, nicht „wirksam“ |
| Korpus v2 (Claude, C1) | Entwicklungssatz | nichts als Beleg; er dient zum Bauen und als Regressionstest |
| **Holdout** (frischer Autor, §21) | unabhängige Prüfung | Qualität und Sicherheit von Planer und Validator auf seiner Verteilung |
| **Live-Paarlauf**, echte Protokolle | Prüfung im Spiel | Verhalten im echten Spiel; Gate-Kennzahlen G1–G6 |

Regel: Ein Test auf S4b v1 oder v2 heißt „Regressionstest“ oder „Machbarkeitsprüfung“, nie „Nachweis“.

---

## 3. Komponenten von A

| Komponente (A) | in C |
|---|---|
| `src/engine.js`, `src/combat.js` (Kampf, NPC-Züge, Würfel) | bleibt. Neu ist ein Adapter am Eingang. **Migrationsbedarf:** `attackAction` muss die Reihenfolge Bewegung/Angriff aus dem Plan übernehmen (E11). |
| `src/rng.js`, `src/state.js`, `src/host.js` (`rec`, `foldChat`) | bleibt |
| `src/v4/runtime.js` `prepareGenerationAsync` | bleibt als Rahmen. Der Planer ersetzt `interpretMessage` und den Zweig `route 'v3'` für freie Sprache. |
| `src/ir.js` | wird `ir-2`; `readTurn` erzwingt `fight` nicht mehr |
| `src/v4/agency.js` `guardCommands` | bleibt (V2) |
| `src/v4/commands.js` (20 Story-Befehle) | bleibt |
| `src/v4/catalog.js` | bleibt, erweitert um Kampfbrett, Skillprofil und Engine-Fakten |
| `src/context.js` (Engine-Block) | bleibt, neue Zeilen für Nicht-Ausgeführtes und Weltnutzung |
| Extraktor, Firewall, Ownership, Envelope, Welt | bleiben; dazu die Freigabe aus `ability_world` |
| `src/v4/interpret.js` | geht im Planer auf |
| `src/intent.js` `parseIntent` | **keine Autorität mehr.** Bleibt für das Schatten-Gate und als Quelle kleiner Catch-Hilfen (`mentionedSkills`, Label-Abgleich, `EXPLICIT_REF_RE`). |

| Weiche in A | in C |
|---|---|
| Kampf erzwingt den Regex-Pfad (`readTurn`) | entfernt |
| Angriffswörter ohne Skill → Basisangriff (`parseIntent`) | entfernt; ersetzt durch `skill: null` + V3b |
| `resolveTarget` als Autorität | entfernt; der Planer liefert IDs. D2 nur ohne jeden Zielbezug. |
| `ambiguous_target` / `no_target` → Engine-Frage | bleibt als Engine-Verhalten |
| `MECHANICAL`-Route, `HOLD_RE` | entfernt; die Route folgt aus dem Plan, `wait` → hold |
| Umordnung „away nach dem Angriff“ (`attackAction`) | **entfernt** (E11) |
| `#`-Befehle, Erschaffung, toter SC, `pending_combat` | bleiben deterministisch (Steuerkanäle) |

---

## 4. Schema v2.1 (final) und IR v2

### 4.1 Grundsatz

Der Planer schreibt **was gemeint ist**. Er schreibt keine mechanische Kategorie:
- ob ein Skill ein Angriff, ein Effekt oder ein Flächenzauber ist, weiß die Engine aus `content` (`attackAction` lehnt Nicht-Angriffe ab, `skillAction` wendet Effekte an);
- was eine Absicht im Kampf kostet oder ob sie geht, entscheidet die Engine aus dem Modus.

Umgekehrt **ändert die Engine nie den Bedeutungsgehalt.** Sie bildet eine Absicht auf eine Mechanik ab oder meldet sie als nicht ausführbar.

### 4.2 Semantische Arten

```text
Gemeinsam: {"intents": [ … ]} in Spielerreihenfolge · jede Handlung mit "quote" (wörtlich) · keine Zusatzfelder
           · KEIN Feld für Ergebnis, Erfolg, Schaden, Kosten, Schwierigkeit, Priorität oder mechanische Kategorie

use_skill      {"kind","skill": <id | {"new":"<seine Worte>"} | null>, "target": <id | {"new":"<Beschreibung>"} | null>, "quote"}
               einen Skill gegen ein Wesen, eine Person oder sich selbst; ohne Skill: angreifen
ability_world  {"kind","skill": <id | {"new"} | null>, "target": <object id | {"new":"<das Ding>"}>,
                "target_words": "<wörtlich aus quote>", "goal": "<sein Zweck, ≤ 12 Wörter>", "quote"}
               einen Skill auf ein Ding, mit Zweck
move           {"kind","dir": "closer"|"away"|null, "target": <id | null>, "to": {"new":"<Stelle>"} | null, "quote"}
               sich innerhalb der Szene bewegen (zu oder weg von jemandem, an eine Stelle)
flee           {"kind","to": <place id | {"new"} | null>, "quote"}
               sich der Gefahr entziehen, den Ort verlassen, um wegzukommen
stealth        {"kind","quote"}                           sich verbergen, anschleichen
other          {"kind","what": "<kurz, seine Worte>", "quote"}   beabsichtigte Handlung ohne passende Art
clarify        {"kind","about": "target"|"skill"|"action", "question", "options": [<ids oder kurze Texte>]}
V4-Befehle     wie content/commands.json, je mit "quote":
               go (Reise), activity (rest, wait, search, …), take, give, pay, buy, sell, use,
               offer.*, quest.*, guild.*, board.read, journey.continue, equip, unequip
```

**Abgrenzungen** (Planer-Regeln, semantisch):
- Wegkommen von einer Gefahr, auch mit Ziel („climb the ladder out“, „run back to the village“), ist `flee`.
- Reisen ohne Gefahr ist `go`.
- Sich in der Szene zu bewegen („behind the pillar“, „step back“) ist `move`.
- Suchen bleibt `activity {kind: search}`, Warten `activity {kind: wait}`, auch im Kampf.
- **Gestrichen:**
  - `attack` und `skill` (jetzt `use_skill`);
  - `hold` (jetzt `wait`);
  - `confirm` (E2);
  - die Modus-Abbildung „im Kampf ist Weggehen Flucht“ als Mechanikregel. Sie bleibt nur als Bedeutungsregel: Weggehen *von einer Gefahr* ist `flee`.

**Prompt je Modus:** Das Schema bleibt dasselbe. Der Kampf-Prompt zeigt `use_skill`, `ability_world`, `move`, `flee`, `activity`, `go`, `stealth`, `other` und `clarify`, der Story-Prompt alle Arten. Was im Prompt fehlt, landet in `other`; nichts geht verloren.

### 4.3 IR v2

- `IR_VERSION = 'ir-2'`.
- `acts` tragen die semantischen Arten mit `source: 'planner' | 'control'`.
- `check` trägt die Validator-Urteile mit Regel.
- Mechanik steht nur in den Engine-Ereignissen.
- Ein Record liest sich: Absicht (IR) → Zulässigkeit (check) → Geschehen (events).

---

## 5. Engine: Abbildung, Vorgaben, Ausführbarkeit (getrennt von den Absichten)

### 5.1 Abbildung semantischer Absicht → Mechanik

| Absicht | im Kampf | außerhalb |
|---|---|---|
| `use_skill` | `attackAction` oder `skillAction` nach Skill-Definition; `skill: null` → D1; `target: null` → D2/D3 | Angriff auf ein Wesen oder eine Person beginnt den Kampf (A). Nicht angreifender Skill: wie A (Erzählrunde, ohne Buchung; offen, §25). |
| `ability_world` | Haupthandlung, Probe (E6) | Probe (E6) |
| `move` mit `dir`/`target` | `moveAction` (Bänder relativ zu Gegnern), in Planreihenfolge zur Haupthandlung | keine Mechanik (Erzählung) |
| `move` mit `to` (eine Stelle, z. B. Deckung) | **N**: A hat für den SC keine Deckungs- oder Positionsaktion (Deckung nur für NPCs bzw. Szene); gemeldet | keine Mechanik |
| `flee` | Flucht (A: entkommt, wenn alle Gegner LONG, sonst weg) | bei `pending_combat` wie A, sonst Erzählrunde (A) |
| `go` | **N**: „Reisen ist im Kampf nicht möglich“, gemeldet. **Keine** Umdeutung zu Flucht. | Reise (V4) |
| `activity: wait` | hold (E5): Der Zug ist vorbei, die NPCs handeln | V4 `activity` |
| `activity: search` | E4 | V4 `activity` |
| andere `activity`, andere V4-Befehle | **N** (E9), gemeldet | V4-Handler |
| `stealth` | **N**: A hat kein Stealth im Kampf; heute verpufft es still. Jetzt wird es gemeldet. | A `stealthEvents` |
| `other` | **N** (E10), gemeldet; der Kampf wartet | wie A eine Erzählrunde mit vorab gezogenem Prüfwürfel |
| `clarify` | System-Panel, nichts gebucht | dito |

### 5.2 Kanonische Vorgaben (geschlossen, D1–D3)

| | Vorgabe | Bedingung |
|---|---|---|
| **D1** | `skill: null` → Basisangriff der Klasse | nur nach V3b (kein Skill-Hinweis) |
| **D2** | `target: null` bei einem Einzelziel-Skill → das einzige aktive feindliche Ziel. Bei 0 Zielen: L. Bei ≥ 2: Engine-Rückfrage. | nur, wenn der Satz **keinerlei Zielbezug** enthält (V4e). Ein eigener, auch unvollkommener Bezug („the second one“, „that one“, „him“) hat immer Vorrang. As Präzedenz: `EXPLICIT_REF_RE` („never silently the only combatant“). |
| **D3** | Flächen-Skill → Ziele nach Flächenregel | A `attackAction`: alle ENGAGED-Gegner |

D4 (Modus-Abbildung als Vorgabe) und D5 (Umordnung) sind gestrichen.

### 5.3 Ausführbarkeit

| Kategorie | Bedeutung | Folge |
|---|---|---|
| **N** | im Modus nie möglich (Abbildung N in §5.1) | übersprungen, gemeldet; verbraucht keine Ökonomie |
| **L** | situativ unzulässig: Reichweite, Ressourcen, volle Deckung, Ziel weg, unbekannter Skill | **Der Zug wird nicht aufgelöst** (A: `illegal`, `runCombat` hält an). Der Grund wird gemeldet; der Spieler entscheidet neu. |
| **W** | Aktionsökonomie erschöpft (Core #12/#24: eine Bewegung + eine Haupthandlung je Zug) | nicht in diesem Zug; gemeldet; **nie vorgemerkt** |

### 5.4 Engine-Invarianten

Sie sind hart, im Code umgesetzt und als Test geprüft.

| | Invariante |
|---|---|
| **X1 Reihenfolge** | ausgeführte Handlungen in Planreihenfolge; keine Umordnung, auch nicht „zugunsten des Spielers“ |
| **X2 Nur Validiertes** | ausgeführt wird nur, was der Validator angenommen hat. Gefüllt wird nur über D1–D3, jede Füllung steht im Ereignis. |
| **X3 Nichts verschwindet** | jede Handlung des Plans ist ausgeführt oder als N, L, W oder Rückfrage gemeldet: System-Zeile, Engine-Block, Record |
| **X4 Determinismus** | gleicher Zustand + Plan + Seed → byte-gleiche Ereignisse |

---

## 6. Der Validator

### 6.1 Harte Invarianten

Sie werden im Code umgesetzt und mit Eigenschaftstest und Mutationsprobe geprüft, nicht als Prompt-Regel.

| | Invariante |
|---|---|
| **M1 Nur drei Urteile** | je Handlung `accept`, `clarify` oder `reject` |
| **M2 Kein Ersatz** | Art, Skill, Ziel, `target_words`, `goal` und Argumente einer angenommenen Handlung sind byte-gleich zum Plan |
| **M3 Keine Ergänzung** | angenommene Handlungen ⊆ Plan; Rückfragen sind keine Handlungen |
| **M4 Keine Umordnung** | angenommene Handlungen behalten die Planreihenfolge |
| **M5 Sichtbarkeit** | jede nicht angenommene Handlung mit Regel im Record und in der System-Zeile, auch Entfernungen durch den Agency-Guard |
| **M6 Rückfragen wählen nicht** | Optionen stammen aus dem Plan, aus wörtlichen Spannen der Nachricht oder aus dem Katalog; die Wahl trifft der Spieler |

**Weitere Grenzen:**
- Der Validator liest **kein** RECENT.
- Eine Reparatur (nur V1) nennt die verletzte Regel und das Feld, **nie einen Ersatzwert**.

### 6.2 Regeln

| Regel | Prüfung | Urteil |
|---|---|---|
| **V1** Schema und Verankerung | Arten, Pflichtfelder, IDs aus dem Katalog, keine Zusatzfelder, Grenzen; `quote` und `target_words` wörtlich in der Nachricht | eine Reparatur, sonst Abbruch (wie As Interpreter-Fehlschlag) |
| **V2** Beleg | As `guardCommands`: keine Frage, kein Plan, keine Verneinung, keine fremde Tat | `reject`, sichtbar |
| **V3a** genannter Skill | Der Satz nennt einen bekannten Skill exakt oder fast, der Plan nimmt einen anderen | `clarify(skill)` mit beiden |
| **V3b** `null` mit Hinweis | Safety Catch (§7) | `clarify(skill)` |
| **V3c** Basic Attack ohne Worte | Basic-Attack-ID ohne „basic attack“ im Satz | wie `null` → V3b |
| **V3d** `{new}`-Skill | enger Fast-Treffer (E12) zu genau einem bekannten Skill | `clarify(skill)` „Meinst du …?“, sonst `reject(unknown_skill)` |
| **V4a** Zieltyp | ID passt zur Art | V1 |
| **V4b** genanntes Wesen | Der Satz (ohne Zweckteil) nennt exakt das Label oder den Namen von X, der Plan zielt auf Y ≠ X | `clarify(target)` mit X und Y |
| **V4c** abwesendes Wesen | `{new}` als Ziel von `use_skill` | `reject(no_target)` mit der Liste der Anwesenden (wie As `no_target`) |
| **V4e** Zielbezug vor D2 | `target: null`, aber der Satz enthält einen Zielbezug (Ordinal, „the other/left/right one“, Pronomen, „the <Wort>“ nach Angriffsverb oder Richtungswort) | `clarify(target)`; D2 wird nicht angewandt |
| **V5** Weltziel-Treue | §8.2 | `accept`, `clarify(target)` oder V1 |
| **V6** Rückfrage allein | eine Rückfrage im Plan | der ganze Plan wird zurückgehalten; nichts gebucht |

V4d (Bestätigung bei Nicht-Feind) ist gestrichen (E2).

### 6.3 Was nicht im Validator steht

- Modus, Ökonomie, Reihenfolge der Ausführung und Zielvorgabe: Engine (§5).
- Kürzen oder Korrigieren: nie (V1 lehnt ab).

### 6.4 Grenzen der Safety Catches (V3b, V4e, V5)

Die Detektoren hinter V3b (Skill-Hinweis), V4e (Zielbezug) und V5 (Zielteil gegen Zweckteil) sind **Sicherungen, keine Deuter**. Feste Grenzen:
1. **Ausgabe:** nur „Hinweis vorhanden: ja/nein“ und die gefundene Wortspanne (für den Fragetext). Nie ein Skill, Ziel oder eine Art.
2. **Wirkung:** nur abstufen (`clarify`). Nie annehmen, was sonst abgelehnt würde, nie wählen.
3. **Geschlossene Komponenten:**
   - V3b: h1–h6 (§7.2);
   - V4e: As `EXPLICIT_REF_RE`-Familie, Pronomen, „the <Wort>“ nach Angriffsverb oder Richtungswort;
   - V5: Verankerung und eine kurze Zweckwortliste.

   Eine neue Komponente ist eine Architekturentscheidung, kein Code-Feinschliff.
4. **Kleine Daten:** Listen liegen im Content, je Klasse, versioniert. Richtgröße: ≤ 10 Hinweisverben je Klasse, ≤ 15 allgemeine Magie- und Skillwörter, ≤ 8 Zweckwörter.
5. **Keine Grammatik:** keine Wortarten-Erkennung, keine Satzanalyse, keine Synonymlisten. Braucht ein Fall so etwas, gehört er zum Planer und in den Holdout, nicht in den Catch.
6. **Bewertet nur als Sicherung:**
   - verpasste Blockaden: Fälle, in denen der Planer `null` schrieb, obwohl ein Skill gemeint war, und der Catch nichts fand;
   - unnötige Blockaden: Rückfragen, wo Handeln richtig war.

   **Nie** als Deutungsgenauigkeit.

---

## 7. `skill: null`, exakt

### 7.1 Regeln

| | Regel |
|---|---|
| **N1 Planer** | `null` nur in `use_skill` oder `ability_world` und nur, wenn der Satz keinen Skill nennt und keinen andeutet. Die Basic-Attack-ID nur, wenn der Spieler „basic attack“ sagt. Ein unbekannter Skill wird `{"new": "<seine Worte>"}`. |
| **N2 Engine (D1)** | `null` → Basisangriff der Klasse, nur nach V3b-Freigabe |
| **N3 Validator (V3b)** | Ein Skill-Hinweis im Geltungsbereich → `clarify(skill)`. Mit `null` und Hinweis wird nie etwas ausgeführt. |
| **N4 (V3c)** | Basic-Attack-ID ohne die Worte → wie `null` |
| **N5 (V3d)** | `{new}` wird nie ersetzt: enger Fast-Treffer (E12) → Frage; sonst Ablehnung („Alaric kennt X nicht“, nichts gebucht) |
| **N6 (Planer + V3a)** | kein unsicherer Skill still: Der Planer wählt nur, wenn genau einer passt; sonst fragt er. V3a fängt den Konflikt mit einem genannten Skill. |

### 7.2 Safety Catch für Skill-Hinweise (Komponenten, geschlossen)

| | erkennt |
|---|---|
| h1 | exakte Namen jedes Content-Skills (As `mentionedSkills`) |
| h2 | Fast-Treffer auf unterscheidende Wörter von Skillnamen: Abstand ≤ 1 bei 4–5 Buchstaben, ≤ 2 ab 6, Vertauschung = 1; zusammengeschrieben. Allgemeine Kampfwörter (attack, shot, strike, slash, hit, shoot) sind ausgenommen. |
| h3 | allgemeine Skill- und Magiewörter (spell, magic, ability, skill, cast, conjure, summon, invoke, channel) |
| h4 | Hinweisverben je Klasse (E1) |
| h5 | „use/activate/perform (my\|a\|the) X on/at/against“, wenn X kein gehaltener Gegenstand ist |
| h6 | großgeschriebene Mehrwortfolge mitten im Satz, die kein bekannter Name, kein Label, kein Ort und keine Art ist |

**Vorher maskiert:** Labels, Namen, Orte, Arten, Questtitel.

**Geltungsbereich:** der Satz mit dem `quote` der Handlung, ohne wörtliche Rede und Fragesätze, ohne Spannen, die das `quote` einer anderen Handlung abdeckt.

### 7.3 Was der Catch nicht leistet

**Er kann kreative Umschreibungen ohne Wortüberlappung nicht abdecken** („my fiery javelin“ für Flame Lance).
- Gegen diese Klasse steht nur der Planer (S4b: 0 Ersetzungen genannter Skills in 544 Entscheidungen; das ist keine Garantie).
- Sie ist ein Wahrscheinlichkeitsproblem und wird im Holdout eigens geprüft: H2b, mindestens 6 Umschreibungen ohne Wortüberlappung, mit eigener Kennzahl (§21).
- **„Fire Lance → Basic Attack strukturell unmöglich“** gilt nur für Fälle, die Planer oder Catch als Skill-Hinweis erkennen. „Fire Lance“ selbst gehört dazu (h2: „lance“).

---

## 8. Ziel-Treue

### 8.1 Wesen (V4b, V4e, D2)

- Ein genanntes Wesen wird nie durch ein anderes ersetzt (V4b).
- Ein eigener Zielbezug, auch ein unvollkommener, hat Vorrang vor D2 (V4e). D2 gilt nur, wenn **gar kein** Bezug formuliert ist („I attack“ bei genau einem Gegner).
- Beschreibungen und Pronomen löst der Planer auf. V4b prüft nur exakte Labels und Namen.

### 8.2 Weltziele (V5)

**Invariante:** Ein explizit genanntes Weltziel wird nie durch ein anderes kanonisches Ziel ersetzt.

**Schwere:** Ein falsches Weltziel ist ein voller Zielfehler. Schwierigkeit (E6), Persistenz-Freigabe und spätere Bezüge hängen am Ziel.

Prüfung (Safety Catch, Grenzen §6.4):

| Schritt | Prüfung | Folge |
|---|---|---|
| 5a Verankerung | `target_words` steht wörtlich im `quote` | sonst V1 |
| 5b Identität | `{new}`-Text entspricht `target_words` (ohne Artikel und Possessiv). Bei einer Objekt-ID enthält `target_words` deren Kopfwort oder einen Alias. | sonst V1, danach `clarify(target)` |
| 5c Rolle | Die Nachricht wird am ersten Zweckwort geteilt („so“, „so that“, „in order to“, „to“ vor einem Verb). Steht `target_words` nur im Zweckteil, und nennt der Zielteil ein anderes Ding, folgt eine Rückfrage. | `clarify(target)` mit beiden Wortlauten |
| 5d kein Gegenkandidat | Der Zielteil nennt kein Ding | `accept`; die Wahl steht im Record (Restrisiko) |
| 5e Wesen als Weltziel | `target_words` ist Label oder Name eines Wesens | V1 |

**Wirksam ist die Invariante, nicht der Detektor.** Der Planer hat die Regel „target = the thing the skill acts on; goal = what should happen“. V5 fängt offensichtliche Verstöße. Ob das reicht, zeigt der Holdout (H4).

---

## 9. Mehrfachhandlungen (E3, E11)

1. **Planer:** jede beabsichtigte Teilhandlung, in Spielerreihenfolge, auch wenn sie jetzt unmöglich scheint. Prompt-Regel: „Write down every action he intends, in his order; the engine decides what is possible.“ Auffangart `other`.
2. **Validator:** nimmt an, fragt oder lehnt je Handlung ab, ohne Umordnung (M4).
3. **Engine,** strikt in Planreihenfolge:
   - N-Handlungen werden gemeldet und übersprungen.
   - Die übrigen werden der Reihe nach verarbeitet, bis die Ökonomie (eine Bewegung + eine Haupthandlung) erschöpft ist.
   - Was danach kommt, ist W und wird gemeldet.
   - Vor dem Auflösen läuft ein Probelauf in derselben Reihenfolge (A-Muster). Ist eine Handlung im Budget L, wird nichts aufgelöst und der Grund gemeldet.
   - „Step back → attack“ bleibt in dieser Reihenfolge. Ist der Nahkampf-Skill nach dem Zurücktreten außer Reichweite, ist das L: Der Spieler erfährt es und entscheidet neu.
4. **Nie vorgemerkt.** Ein gespeicherter Befehl wäre im nächsten Zustand veraltet.
5. **Grenze:** Dass der Planer eine Teilhandlung **weglässt**, erkennt kein deterministischer Prüfer verlässlich; eine Wortabdeckung würde bei Ausschmückungen falsch fragen. Weggelassene Teilhandlungen werden gemessen (§21) und stehen als Prüfprotokoll (nicht abgedeckte Handlungsverben) im Record.

**Engine-Migrationsbedarf (C5):**
- `attackAction` bekommt die Reihenfolge der Bewegung aus dem Plan.
- Die heutige feste Regel „away nach dem Angriff“ entfällt.
- As Verhalten ändert sich damit an genau dieser Stelle. Ein eigener Regressionstest belegt das alte gegen das neue Verhalten.

---

## 10. Rückfragen

| Quelle | Beispiel | Optionen aus |
|---|---|---|
| Planer | „I attack“ bei drei Skorpionen; „I blast B“ bei zwei Zaubern (E1) | Plan, Katalog |
| Validator | V3a, V3b, V3d, V4b, V4e, V5 | Plan, wörtliche Spannen, Katalog |
| Engine | D2 mit ≥ 2 legalen Zielen | Zustand |

**Ablauf** (wie As `targetQuestion`):
- System-Panel; nichts gebucht, nichts gewürfelt; kein NPC-Zug, kein Erzähler.
- Der Record hält `pending: {about, options, held_plan}` mit dem **ganzen** Plan.
- **Antwort:**
  - genau eine angebotene Option → Steuerkanal ohne LLM; danach laufen Validator und Engine wie immer.
  - sonst → Planer mit `PENDING QUESTION`.
- Eine Rückfrage ist kein Zug.

---

## 11. RECENT: Sicherheit gegen Flüssigkeit

**Daten (S4b, 5 Verlaufsfälle):**
- mit RECENT: 5 aufgelöst;
- ohne RECENT: 2 aufgelöst, 3 gefragt, **0 falsch**.

Einzelbeobachtungen:
- k3_11: RECENT nannte das Loch. Mit RECENT war das Ziel falsch, ohne richtig.
- k6_07: Der Korpus-Text für RECENT widersprach dem Brett.

**Regeln:**
1. Sicherheit gilt ohne RECENT: Ist ein Bezug nicht eindeutig, wird gefragt. Der Validator liest RECENT nie.
2. Zuerst kommen **strukturierte Engine-Fakten** aus den Ereignissen der letzten Runde (≈ 30–60 Token, deterministisch).
3. Prosa ist optional und klein (≤ 600 Zeichen). Sie dient nur Bezügen, die keine Engine-Tatsache sind. Bei Widerspruch gilt das Brett.
4. C4 vergleicht drei Varianten: nur Fakten, Fakten + Prosa, nichts. Prosa bleibt nur, wenn sie besser auflöst, ohne eine falsche Festlegung hinzuzufügen.

**Kurz:** Relevante strukturierte RECENT-Daten sind wertvoll für Flüssigkeit und Referenzauflösung. Sie sind keine Sicherheitsvoraussetzung und bleiben selektiv und klein.

---

## 12. Der Planer

- **Ort:** `prepareGenerationAsync`, an der Stelle von `interpretMessage`; einmal je neuer oder bearbeiteter Spielernachricht.
- **Aufruf:**
  - JSON, Temperatur 0,1, `maxTokens` ≈ 400;
  - höchstens eine Reparatur, nur bei V1-Fehlern;
  - bei Fehlschlag Abbruch mit Hinweis; nicht zwischengespeichert; kein Regex-Rückfall.
- **Eingabe:**
  - Modus;
  - bekannte Skills mit Profil;
  - Gegner mit Label, HP-Band, Abstand und Haltung;
  - Anwesende mit Haltung;
  - Objekte und Orte (`buildCatalog`);
  - Engine-Fakten;
  - optional RECENT-Prosa;
  - offene Rückfrage;
  - die Nachricht.
- **Größe:**
  - gemessen ≈ 1,87k Prompt-Token je Fall, davon ≈ 1,33k statisch;
  - geschätzt: Kampf ≈ 1,5–1,9k, Story ≈ 3,5k (ersetzt den Interpreter mit ≈ 3,1k);
  - statischer Teil vorn, für Prompt-Caching.

| darf | darf nicht |
|---|---|
| alle beabsichtigten Handlungen in Spielerreihenfolge | Handlungen weglassen, weil sie unmöglich scheinen |
| genau einen passenden bekannten Skill wählen (Alias, Tippfehler, Umschreibung) | einen genannten Skill ersetzen; Basic Attack ohne die Worte wählen |
| genau ein passendes Ziel wählen | unter mehreren wählen; ein genanntes Ziel ersetzen |
| `{new}` für Unbekanntes | `{new}` in eine bekannte ID umdeuten |
| `goal` in seinen Worten | Erfolg, Schwierigkeit, Folgen |
| fragen bei mechanisch verschiedenen Lesarten | fragen, wenn genau eine passt |
| leer antworten (Frage, Plan, Rede, fremde Tat) | mechanische Kategorien festlegen |

---

## 13. `ability_world` durch die Engine

1. **Ziel:** nur nach V5. Das Ereignis enthält Ziel (ID oder `target_words`) **und** den vollständigen Zweck (`goal`).
2. **Skill und Kosten:**
   - Der Skill muss bekannt sein; `null` → D1.
   - Kosten nach Beherrschungsstufe, Munition wie beim Angriff.
   - Vorlage: Bs `useAbilityOnWorld`, als Engine-Funktion neu geschrieben.
3. **Im Kampf** eine Haupthandlung; die NPC-Züge folgen.
4. **Gelingen:** Core-#7-Probe, **von der Engine gewürfelt und entschieden** (W100 aus `Dice`). Actor-Wert und Schwierigkeitstabelle sind E6-Parameter, nötig vor C5. Planer und Erzähler setzen nichts davon.
5. **v1-Grenze:** keine HP- und keine Statuswirkung auf Wesen. Ein Zweck, der ein Wesen betrifft („so it drops on Bandit B“), bleibt gespeichert. Die Engine meldet: „v1 berechnet daraus keinen Kreaturenschaden“. Der Erzähler darf keinen Schadenstreffer erzählen.
6. **Persistenz:**
   - Bei Erfolg darf der Extraktor eine dauerhafte Änderung **am validierten Ziel** vorschlagen.
   - Die Firewall verwirft Änderungen an anderen Dingen, die sich auf diese Handlung berufen.
   - Wo diese Änderung in As Weltmodell liegt, ist offen und betrifft erst C7 (§25).

---

## 14. Swipe, Regenerate, Bearbeiten

Die Mechanik (Plan, Urteile, Ereignisse) liegt im Record der **Spielernachricht**, Schlüssel `input_hash` (`prepareGenerationAsync`).

| Ereignis | Planer | Engine/Würfel | Erzähler | Extraktor | am Code (A) |
|---|---|---|---|---|---|
| neue Spielernachricht | 1× | 1× | 1× | 1× | |
| **Swipe / Regenerate** | **nein** | **nein** | neu | neu je Swipe, nur im Rahmen der Freigaben | gleicher `input_hash` → Wiederverwendung |
| Continue | nein | nein | setzt fort | – | `type !== 'continue'` |
| Planer war fehlgeschlagen | ja (es gab keine Deutung) | dann 1× | dann 1× | | `interp.failed` nicht zwischengespeichert |
| Board fehlgeschlagen | nein | nur Board | | | `retryBoard` |
| Rückfrage offen, Regenerate | nein | nichts | nicht aufgerufen | – | `command.posted` |
| Spielernachricht bearbeitet | ja, gegen den Zustand vor der Nachricht | neu | neu | neu | neuer `input_hash` |
| frühere Nachricht geändert oder gelöscht | nein | nein | – | – | `onEdited`: Retcon nur auf der letzten Antwort |
| Verzweigung | nein | nein | | | Record reist in `extra` |

**Neu:** `state_before_hash` im Record, nur zur Sichtbarkeit. Weicht er ab, kommt ein Hinweis, aber kein stilles Neuplanen oder Neuwürfeln.

**Ergebnis:** Ein Swipe lässt den Planer nie neu deuten.

---

## 15. Record und Event-Sourcing

```text
{ input_hash, state_before_hash, route,
  ir:     { v: 'ir-2', acts[source], links },
  plan:   { version, prompt_hash, mode, ms, tokens, repaired, raw[] },
  check:  { verdicts[] (je mit Regel), turn: commit | ask | abort, pending? },
  gate_shadow: { cls, a0_plan, agrees },
  events: [turn.begun, …, ability.world_used, not_executed{N|L|W}, outcome.recorded] (mit rng_to) }
```

- Der Zustand ist die Faltung der Ereignisse.
- `plan`, `check` und `gate_shadow` sind Prüfprotokoll; beim Neuaufbau wird nie neu geplant.
- Wiederholungstest: `engine(Zustand vorher, check.commit, seed)` ergibt byte-gleich `events`.

---

## 16. Autoritätsgrenzen

| | entscheidet | entscheidet nie |
|---|---|---|
| **Planer** | Bedeutung: Art, Skill/`null`/`{new}`, Ziel/`{new}`, `target_words`, `goal`, Reihenfolge, Rückfrage | Mechanik, Ergebnis, Zahlen; Ersetzung; Wahl unter mehreren; Weglassen |
| **Validator** | `accept`, `clarify`, `reject` | Ersatz, Ergänzung, Umordnung, Deutung, RECENT |
| **Engine** | Abbildung, D1–D3, Ausführbarkeit N/L/W, Kosten, Würfel, Treffer, Gelingen, NPC-Züge, Ereignisse | Deutung, Umordnung, Bedeutungsänderung, Prosa |
| **Erzähler** | Prosa im Rahmen des Engine-Blocks | Zahlen, Gelingen, Nicht-Ausgeführtes als geschehen |
| **Extraktor + Firewall** | welche Prosa-Fakten Zustand werden, im Rahmen der Freigaben | Mechanik, Engine-Felder, Änderungen ohne Freigabe |
| **A0-Gate (Schatten)** | nichts; misst | jeden Weg zur Engine |

---

## 17. A0-Gate: nur im Schatten

Das Gate ist **nicht** im Produktionspfad. Es klassifiziert jeden Zug, schreibt sein Ergebnis und seine Übereinstimmung mit dem **validierten** Planer-Commit in den Record und misst die Planer-Latenz. `parseIntent` und `gate()` bleiben dafür im Code, bis der Nutzer entschieden hat.

**Vor jeder Aktivierung müssen alle sechs Kennzahlen live erfüllt sein** (jetzt festgelegt):

| | Kennzahl | Schwelle |
|---|---|---|
| G1 | `FAST_COMMIT`-Züge aus echtem Spiel | ≥ 300, aus ≥ 2 Kampagnen und ≥ 2 Klassen |
| G2 | Abweichungen `FAST_COMMIT` ↔ validierter Planer-Commit (Art, Skill-ID, Ziel-ID, Anzahl) | **0**, jede von Hand geprüft. Bei 0/300 liegt die einseitige obere 95-%-Grenze der Abweichungsrate je Zug bei 0,99 % (exakt nach Clopper-Pearson; Dreierregel 1,0 %). |
| G3 | Anteil `FAST_COMMIT` an allen Kampfzügen | ≥ 30 % |
| G4 | erwartete Ersparnis je Kampfzug (Anteil × Median der Planer-Latenz auf diesen Zügen), gemessen nach Caching und Transportwahl | ≥ 1,0 s |
| G5 | Gate-Code und Wortlisten während der Messung eingefroren | jede Änderung setzt G1/G2 zurück |
| G6 | Form bei Aktivierung: ersetzt nur den Planer-Aufruf; Validator und Engine unverändert; der Planer läuft im Hintergrund weiter und protokolliert Abweichungen | Pflicht |

Über eine dauerhafte Entfernung entscheidet der Nutzer nach echten Protokollen.

---

## 18. Transport

Der **Vertrag** ist Schema v2.1. Der **Transport** wird in C4 verschränkt gemessen:
- JSON-Text;
- erzwungener Tool-Aufruf;
- falls verfügbar, `response_format` mit Schema.

Es gewinnt die schnellste Variante mit nicht schlechterer Gültigkeit und Sicherheit.

Die enge Lesart des S4b-Befunds: Die getestete FC-Variante (`auto`, redundante Art, Rückfrage ohne eigenes Beispiel) hatte keinen nachgewiesenen Qualitäts- oder Sicherheitsvorteil und brauchte mehr Reparaturen. Function Calling als Transport ist nicht verworfen.

---

## 19. Die S4b-Fehler in Revision 3 (neu geprüft)

| Fall | v2.1-Absicht (Gold v2) | was P1 in v1 schrieb, in v2.1-Begriffen | Ergebnis in C (nachträglich, kein Beleg) |
|---|---|---|---|
| **k4_05** „I Arcane Burst the scorpions next to me, then climb the rope ladder out“ | `use_skill` Arcane Burst, dann `flee {to: loc.burrow_entrance}` | `use_skill` AB, dann `go` | AB wird ausgeführt. `go` ist im Kampf **N** und wird gemeldet („Reisen im Kampf nicht möglich; um wegzukommen: fliehen“). **Keine stille Festlegung, aber weiterhin ein Planerfehler** (go statt flee). Korrektur zu Revision 2: Dort hätte die Engine `go` zu Flucht gemacht. Mit richtiger Absicht wäre `flee` als zweite Haupthandlung W, gemeldet. |
| **k5_10** „I scan the treeline for more wolves“ | `activity {kind: search, what: "more wolves"}` | `search` | semantisch richtig. Die Engine verfährt nach E4. |
| **k6_08** „I blast Barkscorpion B“ | `clarify(skill)` (E1) | Basic-Attack-ID | V3c → wie `null` → V3b mit h4 („blast“) → Rückfrage |
| **k3_11** „I cast Flame Lance at the ceiling to bring it down over the hole“ | `ability_world {target: {new: the ceiling}, target_words: "the ceiling", goal …}` | Ziel `feat.hole` | V5 (5c) → Rückfrage „the ceiling“ oder „the hole“ |
| **k2_13** „I attack the salt merchant“ | `use_skill` → `npc.brede` (E2) | Bestätigungsfrage | nach E2 eine unnötige Rückfrage; Gold v2 = ausführen |

Von P1s vier stillen Fehlfestlegungen in v1 bliebe also keine still; k4_05 bliebe ein sichtbarer Planerfehler. Das ist eine Nachrechnung an Entwicklungsdaten (§2), kein Beleg.

---

## 20. Produktentscheidungen E1–E12

Das sind **Produktentscheidungen, keine technischen Wahrheiten.** Nach der Entscheidung werden sie Daten in einer Regeldatei. Aus dieser einen Quelle entstehen Prompt, Hinweislisten und Gold.

**Status:**
- **entschieden** heißt: durch die Rückmeldung festgelegt;
- **offen** heißt: Entscheidung des Nutzers nötig.

| | Regel | Status |
|---|---|---|
| E1 | Magisch konnotiertes Verb wird nie Basic Attack. ≥ 2 plausible Skills → Rückfrage; genau einer → dieser. Kleine Klassenliste, nur als Safety Catch. | **entschieden** |
| E2 | Ausdrücklicher Angriff auf einen neutralen oder freundlichen NPC wird ausgeführt, wenn Ziel und Handlung eindeutig sind. Rückfrage nur bei semantischer Zielunsicherheit. | **entschieden** |
| E3 | Strikt Spielerreihenfolge, Verarbeitung bis zur Ökonomiegrenze; der Rest wird gemeldet, nie vorgemerkt | **entschieden.** Zur Bestätigung: bei L wird nichts aufgelöst (A-Verhalten). |
| E4 | `search` im Kampf: kostenpflichtige Wahrnehmungshandlung oder sichtbar nicht ausführbar | **offen** (Empfehlung: kostenpflichtig) |
| E5 | `wait` → hold | **entschieden** |
| E6 | Engine würfelt und entscheidet; kein indirekter Kreaturenschaden in v1 | **entschieden.** Parameter (Actor, Schwierigkeit) vor C5. |
| E7 | Ordinalzahl nur aus einer für den Spieler etablierten Reihenfolge | **entschieden** |
| E8 | Weltnutzung an Laterne/Seil; Zweck vollständig gespeichert; kein Kreaturenschaden in v1, gemeldet | **entschieden** |
| E9 | Story-Handlungen im Kampf in v1 nicht ausführbar, gemeldet | **entschieden** (v1-Grenze; Open-World-Lücke) |
| E10 | Kreative Handlung ohne Skill: `other`, gemeldet | **entschieden** (v1-Grenze; Open-World-Lücke) |
| E11 | Spielerreihenfolge von Bewegung und Angriff bleibt erhalten; Engine-Migration | **entschieden** |
| E12 | Fast-Treffer nur eng, genau ein Kandidat, nur als Frage | **entschieden** |

### E1 Magisch konnotierte Verben (k6_08) — entschieden

| Feld | Inhalt |
|---|---|
| Regel | Ein klar magisch konnotiertes Verb (Magier: blast, zap; allgemein: cast, conjure, summon, channel) wird nie Basic Attack. Bei ≥ 2 plausiblen bekannten Skills → Rückfrage. Bei genau einem plausiblen bekannten Skill → dieser (der Planer ordnet zu). |
| Alternativen (verworfen) | „blast“ = Basic Attack; immer fragen; raten |
| Technik | kleine Klassenliste im Content (h4), Grenzen §6.4; V3b |
| Spielgefühl | eine Rückfrage, wo Magie gemeint, aber kein Zauber genannt ist; kein „Stabhieb“ auf „blast“ |

### E2 Ausdrücklicher Angriff auf einen Nicht-Feind (k2_13) — entschieden (geändert)

| Feld | Inhalt |
|---|---|
| Regel | „I attack Brede / the salt merchant“ wird ausgeführt, wenn das Ziel eindeutig aufgelöst ist. Keine Rückfrage wegen der Haltung. Rückfrage nur bei semantischer Zielunsicherheit (zwei Händler, „him“ zwischen Bandit und Brede). |
| Alternativen (verworfen) | Bestätigung bei neutral oder freundlich (Revision 2); Bestätigung nur bei Verbündeten |
| Technik | V4d und `confirm` gestrichen. Gold k2_13 = Angriff auf `npc.brede`. A führt das heute schon so aus. |
| Spielgefühl | Der Spieler trägt die Folgen seiner bewussten Entscheidung; keine Bevormundung |

### E3 Mehrere Handlungen in einem Zug — entschieden

| Feld | Inhalt |
|---|---|
| Regel | Strikt in Spielerreihenfolge. Die Engine verarbeitet nacheinander, bis die Ökonomie (eine Bewegung + eine Haupthandlung) erschöpft ist. Der Rest ist W, gemeldet, nie vorgemerkt. N wird gemeldet und übersprungen. |
| Zur Bestätigung | Ist eine Handlung im Budget L (z. B. außer Reichweite), wird **nichts** aufgelöst, und der Grund wird gemeldet (wie A). Alternative: alles vor der L-Handlung ausführen. |
| Technik | rein Engine (§5.3, §9), Invariante X1 |
| Spielgefühl | vorhersehbar; der Spieler sieht sofort, was nicht geschah |

### E4 Suchen und Wahrnehmen im Kampf (k5_10) — offen

| Feld | Inhalt |
|---|---|
| Fest | `search` bleibt `activity {kind: search}`. Der Planer deutet es nie zu „keine Handlung“ um. Es liefert nie kostenlos beliebig oft Information. |
| Option A (Empfehlung): kostenpflichtig | verbraucht die Haupthandlung; die NPCs handeln. Engine-Ergebnis in v1: `search.resolved {found: []}`, denn A führt für den SC keine verborgenen Gegner (nur `scene.awareness` der NPCs). Der Erzähler beschreibt nur Etabliertes und führt **wegen der Suche** keine neuen Wesen oder Fakten ein. Sobald es verborgene Gegner als Engine-Zustand gibt, wird daraus eine echte Probe (Core #8, PER). |
| Option B: sichtbar nicht ausführbar | N: „Suchen ist im Kampf in v1 nicht möglich“, kein Zug verbraucht, der Erzähler beschreibt nichts Neues |
| Technik | A: Handler, der den Zug wie hold beendet, plus eine Zeile im Engine-Block. B: nur die Meldung. |
| Spielgefühl | A: realistisch, denn Umsehen kostet Zeit, während die Wölfe handeln; in v1 aber ohne mechanischen Fund. B: ehrlich, wirkt aber merkwürdig, weil Umsehen offensichtlich möglich ist. |
| Empfehlung | A. Kostenlose Abfragen sind ausgeschlossen, und die Mechanik ist schon die spätere. |

### E5 Warten — entschieden

`activity {kind: wait}` ist die semantische Absicht. Die Engine bildet sie im Kampf auf das vorhandene hold ab: Zeit vergeht, die NPCs handeln. Vorbereitete Handlungen („shoot when it moves“) sind eine spätere Mechanik.

### E6 Weltnutzung — entschieden (v1-Grenze)

| Feld | Inhalt |
|---|---|
| Regel | Core-#7-Probe, von der Engine gewürfelt und entschieden; Schwierigkeit nach Zielklasse; Erfolg erlaubt eine dauerhafte Änderung nur am Ziel; im Kampf eine Haupthandlung |
| v1-Grenze | **kein indirekter Kreaturenschaden**, klar dokumentiert und gemeldet. Der vollständige Zweck bleibt gespeichert. |
| offen vor C5 | Actor-Wert, Schwierigkeitstabelle (`difficulty_scores` ist in den Regeln als „proposed“ markiert) |

### E7 Ordinale Zielbezüge (k2_15) — entschieden (präzisiert)

| Feld | Inhalt |
|---|---|
| Regel | „the second one“ → B nur, wenn dem Spieler eine stabile Reihenfolge **gezeigt** wurde: Kampflabels A/B/C im System-Panel, eine ausdrücklich nummerierte Liste. **Nie** aus interner Katalog- oder ID-Reihenfolge, nie aus der Erwähnungsreihenfolge in Prosa. Ungeordnete Namen oder Positionsbezüge („the left one“; A kennt keine Positionen) → Rückfrage. |
| Technik | Planer-Regel und Gold. Der Katalog kennzeichnet, ob eine Reihenfolge für den Spieler etabliert ist (`ordered: true` nur bei Labels). |

### E8 Laterne auf Bandit B (k3_12) — entschieden

`ability_world` mit Ziel Laterne bzw. Seil (`target_words` „the lantern's rope“) und Zweck „drops on Bandit B“. Beides bleibt vollständig gespeichert. Die Engine meldet, dass v1 daraus keinen Kreaturenschaden berechnet. Der Erzähler darf keinen Schadenstreffer erzählen.

### E9 Story-Handlungen im Kampf — entschieden (v1-Grenze)

Trank, Gegenstand geben, rasten: im Kampf in v1 N, gemeldet, nie still. **Spätere Pflicht:** Trank als Haupthandlung ist die erste Engine-Erweiterung nach C.

### E10 Kreative Handlung ohne Skill — entschieden (v1-Grenze)

„I kick sand into his eyes“: `other`, gemeldet, der Kampf wartet; außerhalb eine Erzählrunde wie A.

**Ausdrücklich offen für das Produktziel:** Ohne echte Auflösung kreativer Nicht-Skill-Handlungen löst C die Sprachdeutung, aber noch **nicht vollständig das Open-World-Spielproblem**. Vorgesehene Richtung: eine improvisierte Handlung mit Engine-Probe nach dem Muster von E6.

### E11 Reihenfolge von Bewegung und Angriff — entschieden (geändert)

| Feld | Inhalt |
|---|---|
| Regel | „step back → attack“ bleibt „step back → attack“. Kein stilles Umordnen. |
| Code | Core #12/#24 erlaubt „either order“. A ordnet heute fest um (`attackAction`: „taken after the attack, so the attack keeps its range“). Das wird zum Engine-Migrationsbedarf (C5) mit eigenem Regressionstest. |
| Folge | Zurücktreten zuerst kann einen Nahkampf-Skill unzulässig machen. Das ist L: Der Zug wird nicht aufgelöst, der Grund gemeldet. |

### E12 Enger Fast-Treffer für unbekannte Skillnamen — entschieden

| Feld | Inhalt |
|---|---|
| Regel | Nur wenn der Planer `{new: X}` schrieb. Enger Treffer heißt: Normalisierter Gesamtname mit Damerau-Abstand ≤ 1 (bis 7 Buchstaben) bzw. ≤ 2 (ab 8), **oder** gleiche Wortzahl, alle Wörter bis auf eines exakt, und das exakte Wort ist unterscheidend für genau einen bekannten Skill („Fire Lance“ → Flame Lance). Genau ein Kandidat → „Meinst du Flame Lance?“. |
| sonst | unbekannter Versuch: Ablehnung mit Liste der bekannten Skills, oder offene Rückfrage. **Nie Ersetzung.** |

---

## 21. Holdout: Prozess, Umfang, Schwellen

### 21.1 Rollen

| Rolle | wer | darf | darf nicht |
|---|---|---|---|
| **Autor** | eine **frische, isolierte Modellinstanz**, möglichst ein drittes Modell: weder Claude (Entwurf) noch ChatGPT (kennt S4b) noch das Planer-Modell | nur das Briefing-Paket lesen | Webzugang, Gedächtnis oder Verlauf, eigene Anweisungen, Projektdateien, das Repository |
| **Gegenkennzeichner** | eine zweite frische, isolierte Instanz (gleiche Regeln) | Texte, Szenen und Regeln lesen und eigene Gold-Labels vergeben, **ohne** das Gold des Autors | das Gold des Autors sehen |
| **Nutzer** | Betreiber | Sitzungen öffnen, Abweichungen anhand des Regeltexts entscheiden, versiegeln, lokal laufen lassen | Fälle umschreiben, um Ergebnisse zu ändern |
| **Claude** | Entwurf von C | das Briefing-Paket schreiben (nur erlaubte Inhalte); nach dem Lauf auswerten | die Fälle vor dem ersten Lauf sehen |
| **ChatGPT** | methodische Prüfung | das Briefing-Paket vorab auf Lecks prüfen; Manifest, Hashes und Auswertung nachrechnen | Fälle schreiben, ändern oder ergänzen |

### 21.2 Briefing-Paket (erlaubt / nicht erlaubt)

**Erlaubt:**
- die Produktfrage und die Grundsätze;
- Schema v2.1 (§4);
- die Labelregeln L1–L9 in der überarbeiteten Fassung;
- die **entschiedenen** E-Regeln als Text;
- Szenenformat;
- Content-Katalog (Klassen, Skills, Monster, Orte);
- Kategorien und **feste** Mengen (§21.3);
- das Ausgabeformat.

**Nicht erlaubt:**
- S4b-Korpus v1 und Korpus v2, auch keine Beispielsätze daraus;
- S4b-Ergebnisse und Fehlerlisten;
- der Planer-Prompt;
- die Listen und Schwellen der Safety Catches;
- dieses Dokument;
- Planerausgaben.

### 21.3 Umfang (fest: genau 120 Fälle)

| | Kategorie | Fälle |
|---|---|---|
| H1 | exakte Befehle (Kontrolle) | 6 |
| H2a | Aliase, Tippfehler, Umschreibungen mit Wortüberlappung | 6 |
| **H2b** | **Umschreibungen ohne jede Wortüberlappung** (Restklasse `skill: null`, §7.3) | 6 |
| H3 | Zielbezüge (Teil-Labels, Beschreibungen, Pronomen, Engine-Fakten, Prosa-Bezüge, Ordinalzahlen) | 14 |
| H4 | Weltnutzung, auch Ziel im Zweckteil gegen Ziel im Zielteil | 14 |
| H5 | Mehrfachhandlungen (Reihenfolge, Ökonomie, N/L/W) | 12 |
| H6 | flee / go / move / search / wait in und außerhalb von Kämpfen | 10 |
| H7 | echte Mehrdeutigkeit | 10 |
| H8 | Unbekanntes, Unmögliches, enge und weite Fast-Treffer | 10 |
| H9 | Negativfälle | 12 |
| H10 | je eine Fall-Vorlage pro E-Regel E1–E12 | 12 |
| H11 | Antworten auf Rückfragen | 4 |
| H12 | Story-Befehle mit Kampf- oder Skill-Anteil | 4 |
| | **Summe** | **120** |

**Szenen:**
- mindestens 6, nur aus `content/`;
- mindestens 2 ohne Ähnlichkeit zu S4b-Szenen.

**Stabilität:** 30 vom Autor markierte Fälle, je 3 Läufe.

### 21.4 Ablauf

1. **C1:** Claude schreibt das Briefing-Paket; ChatGPT prüft es auf Lecks; Korrekturen werden protokolliert.
2. Der Nutzer öffnet die Autoren-Instanz und gibt **nur** das Paket hinein. Ausgabe:
   - `holdout_cases.jsonl` mit genau 120 Fällen in den Mengen aus §21.3;
   - `holdout_scenes.json`;
   - Begründungen zu strittigen Labels.
3. Formatprüfung durch das S4b-v2-Werkzeug (`--validate-only`: zählt und prüft das Format, ruft keinen Planer).
4. Die Gegenkennzeichner-Instanz bekommt Texte, Szenen und Regeln **ohne Gold** und vergibt eigene Labels. Das Werkzeug listet die Abweichungen. Der Nutzer entscheidet jede Abweichung allein anhand des Regeltexts und protokolliert sie in `holdout_adjudication.md`.
5. **Versiegeln.** Der Nutzer committet nur `tests/eval/holdout_manifest.json` mit:
   - SHA-256 von Fällen, Szenen, Entscheidungsprotokoll und Briefing-Paket;
   - Mengen je Kategorie und je Gold-Klasse;
   - den **ganzzahligen Schwellen** (§21.5);
   - dem Commit des geprüften Planer- und Validator-Stands.

   Die Dateien bleiben außerhalb des Repositories.
6. Zwischen Versiegelung und Lauf keine Änderung an Planer, Validator oder Regeldatei.
7. **Lauf:** der Nutzer lokal; das Werkzeug prüft die Hashes und bricht bei Abweichung ab.
8. **Auswertung:** Ergebnisse an Claude und ChatGPT. ChatGPT rechnet die Kennzahlen aus `results.json` unabhängig nach (der Scorer ist deterministisch) und prüft die Hashes. Danach dürfen die Dateien committet werden.
9. **Errata** nur begründet. Die Originalwertung wird immer zuerst berichtet.
10. **Einmalig.** Jede weitere Iteration braucht einen neuen Holdout nach demselben Ablauf.

### 21.5 Schwellen (absolut, bei N = 120)

| Kennzahl | Schwelle |
|---|---|
| Fälle mit mindestens einer stillen Fehlfestlegung | **≤ 2 von 120** (aus „2 je 100“ abgerundet, also die strengere Lesart) |
| Ersetzung eines genannten Bezugs (Skill, Wesen, Weltziel) | **0 von 120** |
| falsche Agency | **0 von 12** (H9) |
| stilles Verschwinden einer beabsichtigten Handlung (Ende zu Ende) | **0 von 120** |
| weggelassene Teilhandlung durch den Planer | **≤ 1** über alle Fälle mit mehreren Handlungen |
| Absicht richtig | **≥ 102 von 120** (85 %) |
| H2b (Umschreibungen ohne Überlappung): stille Fehlfestlegungen | **0 von 6** (berichtet getrennt; Restklasse) |
| Rückfrage-Recall | ≥ ⌈0,85 · n_ask⌉, beim Versiegeln als Ganzzahl ins Manifest |
| unnötige Rückfragen | ≤ ⌊0,05 · n_act⌋, beim Versiegeln als Ganzzahl ins Manifest |
| gültig nach Reparatur | **≥ 119 von 120** |
| Stabilität (30 × 3) | safe^3 **30 von 30**; pass^3 **≥ 27 von 30** |
| Planer-Latenz im Kampf | p50 ≤ 3,5 s, p90 ≤ 7,0 s (Bestätigung durch den Nutzer offen, §25) |

**Statistik:**
- **„≈ 2,5 %“** ist die **einseitige** obere 95-%-Grenze der Rate des binären Ereignisses „ein Fall enthält mindestens eine stille Fehlfestlegung“, wenn **0 von 120** beobachtet werden:
  - exakt nach Clopper-Pearson 2,47 %;
  - Dreierregel (3/n) 2,50 %;
  - zweiseitig (obere Grenze des 95-%-Intervalls) 3,03 %.
- **Annahme:** Die Fälle sind unabhängige Ziehungen aus einer festen Verteilung. Der Holdout ist aber konstruiert und geschichtet, keine Zufallsstichprobe echten Spiels. Die Grenze gilt also für die Holdout-Verteilung, nicht für Live-Spiel.
- **An der Schwelle** (2 von 120 beobachtet) liegt die einseitige obere 95-%-Grenze bei **5,15 %**. Bestehen heißt also nicht „Rate ≤ 2 %“.
- **0 von 12** falscher Agency ergibt eine obere Grenze von ≈ 22 %. Das ist schwache Evidenz. Negativfälle stützen sich zusätzlich auf S1 und Live.
- Kategorien werden mit Wilson-Intervallen berichtet, ohne Signifikanzaussagen.

---

## 22. Umsetzungsplan

| Schritt | Inhalt | Prüfung |
|---|---|---|
| **C0** | neuer Branch von A (90bd450); P0-Werkzeuge und Dokumente per Datei-Checkout; keine B-Commits | `npm test`; A byte-gleich |
| **C1** | • E4 entschieden; Regeldatei als einzige Quelle für Prompt, Catch-Listen und Gold <br>• Schema v2.1 eingefroren <br>• Korpus v2 (Entwicklungssatz) <br>• Briefing-Paket mit Leckprüfung <br>• Holdout nach §21.4 bis zur Versiegelung | Korpus-Integrität; Gold ↔ Regeldatei |
| **C2** | `validatePlan` (V1–V6); Eigenschaftstest M1–M6; Mutationsprobe; Regression auf S4b v1/v2 (kein Beleg, §2) | alle Abstufungen von Hand geprüft |
| **C3** | `plannerRequest` (Modus-Prompt, Katalog, Engine-Fakten, RECENT-Varianten) | gleiche Prompt-Bytes bei gleichem Zustand; Token |
| **C4** | S4b v2 auf Korpus v2 (Entwicklung), dann **einmal** Holdout. Verschränkt: Transport, RECENT, Prompt-Variante. | §21.5, §23 |
| **C5** | Engine-Adapter, `ability_world` (E6-Parameter), N/L/W, D1–D3, Invarianten X1–X4; **E11-Migration** von `attackAction` | As Kampftests; E11-Regressionstest; Wiederholungstest |
| **C6** | Laufzeit hinter `planner: off \| shadow \| on`; Gate im Schatten | Swipe, Regenerate, Bearbeiten, Continue, Reload, Rückfrage |
| **C7** | Engine-Block, Firewall-Freigabe, Persistenzmodell für `{new}`-Weltziele | Firewall-Tests, Mutationsprobe |
| **C8** | SillyTavern-Smokes (Mock-Anbieter) | wie bisher |
| **C9** | Live-Paarlauf A gegen C (erst `shadow`, dann `on`); Beginn G1–G6 | §23 E |

---

## 23. Tests vor einer Migration (`on` als Standard)

- **A. Unverändertes:**
  - Suite grün;
  - A byte-gleich mit `off`;
  - As Kampftests mit gleichwertigen Plänen identisch, **außer** der dokumentierten E11-Änderung (eigener Test);
  - S1-Story-Korpus nicht schlechter, 0 falsche Agency.
- **B. Semantik:** die Holdout-Schwellen §21.5. Korpus v2 nur als Regression.
- **C. Invarianten:** M1–M6 und X1–X4 als Eigenschaftstests; je Validator-Regel ein Test, der beim Entfernen der Regel fehlschlägt.
- **D. Host:**
  - Swipe ×3 identisch;
  - Regenerate nach Fehlschlag plant neu;
  - Bearbeiten plant neu;
  - Reload ergibt dieselbe Faltung;
  - `state_before_hash`-Hinweis;
  - offene Rückfrage bucht nichts;
  - eine Antwort mit genau einer Option kommt ohne LLM aus.
- **E. Live:**
  - 0 stille Ersetzungen und 0 stilles Verschwinden;
  - jede Abstufung und Nicht-Ausführung mit Regel sichtbar;
  - Gesamtlatenz je Zug gegen A.

---

## 24. Branch

**Neu von A** (`claude/gen35-world-envelope-2026-10-01` @ 90bd450).

- Der Versuchsbranch trägt B (`src/gm/*`, `index.js`-Verdrahtung, `4.3.0-alpha.2`) und bleibt als Prototyp B unverändert.
- Übernommen werden nur Dateien: P0-Werkzeuge, Korpora, Tests, Dokumente.
- Bs `useAbilityOnWorld` dient nur als Vorlage.

---

## 25. Offene Fragen

**Architekturfragen, die vor C0/C1 geklärt sein müssten: keine.**

Die einzige noch offene Architekturfrage betrifft C7, nicht Deutung oder Gold: Wo liegt in As Weltmodell die Folge einer Weltnutzung an einem nicht gelisteten Ding („Decke eingestürzt“), und wie bindet die Firewall die Freigabe daran?

**Produkt- und Prozessfragen vor C1:**
1. **E4** entscheiden (kostenpflichtig oder sichtbar nicht ausführbar).
2. **E3-Detail** bestätigen: bei L wird nichts aufgelöst (A-Verhalten), statt den Teil vor der L-Handlung auszuführen.
3. **Holdout-Rollen** besetzen: welches dritte Modell als Autor und als Gegenkennzeichner; Bestätigung des Ablaufs §21.4.

**Vor C4:**
- Latenzbudget im Kampf (Vorschlag: p50 ≤ 3,5 s, p90 ≤ 7,0 s);
- welche Transportvarianten SillyTavern mit dem Spielmodell anbietet.

**Vor C5/C7:**
- E6-Parameter;
- nicht angreifende Skills außerhalb des Kampfes (wie A ohne Buchung oder als `ability_world`);
- das Persistenzmodell oben.

---

## 26. Risiken und Grenzen

- **Autorenbias:** Korpus v1/v2, Prompt, Catches und Entwurf stammen von Claude. Darum zählen nur Holdout und Live als Beleg (§2).
- **Restklasse `skill: null`:** Kreative Umschreibungen ohne Wortüberlappung schützt nur der Planer (H2b).
- **Safety Catches** sind englisch und heuristisch. Fehlalarme kosten Rückfragen, nie stille Festlegungen. Die Grenzen in §6.4 verhindern, dass sie zum Parser werden.
- **Kampflatenz:** Im Kampf kommt ein Planer-Aufruf vor dem Erzähler dazu (gemessen p50 3,4 s). Das Gate ist dafür nur im Schatten vorgesehen.
- **Open-World-Lücke:** E9 und E10 sind sichtbare v1-Grenzen. Ohne echte Auflösung kreativer Nicht-Skill-Handlungen ist das Open-World-Ziel nicht vollständig erreicht.
- **E11 ändert As Kampfverhalten** an einer Stelle. Das ist gewollt, dokumentiert und eigens getestet.
- **Ein Modell, Englisch.**
