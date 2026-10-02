# Architektur C: Planer → Validator → Engine → Erzähler → Persistenz

Stand 02.10.2026.

**Status:** Dieser Entwurf dient der Gegenprüfung. Es gibt dazu **keinen Code**. A und B bleiben unverändert.

**Grundlage:**
- `docs/P0_S4B.md` §13: S4b-Ergebnis und Abschlussauswertung;
- `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §2 (A aus dem Code) und §7 (erste C-Skizze);
- `docs/RESEARCH_NL_TO_ENGINE.md`.

**Code-Bezug:** A meint Gen 3.5 / 4.2.1 (`claude/gen35-world-envelope-2026-10-01` @ 90bd450). Dateiangaben beziehen sich auf diesen Stand.

---

## 0. In Kürze

1. **C ist ein Umbau von As Frontend, keine neue Architektur.** A hat die richtige Form hinter der Deutung bereits:
   - Unified Intent IR (`src/ir.js`);
   - Deutung einmal je Spielernachricht, gespeichert mit `input_hash` (`src/v4/runtime.js` `prepareGenerationAsync`);
   - Agency-Guard, deterministische Engine mit zählerbasiertem RNG, Ereignisse auf der Nachricht;
   - Erzähler nur Prosa;
   - Extraktor, Firewall, Ownership, Envelope.

   Die gemessenen Fehler sitzen **vor** der Engine: Der Regex-Pfad im Kampf hat Deutungsautorität und stille Standardwerte.
2. **Ein Planer deutet jede freie Spielernachricht**, im Kampf wie außerhalb. Er bekommt einen Zustandsausschnitt und schreibt einen Plan aus wenigen Arten.
   - Er entscheidet **was gemeint ist**, nie **was geschieht**.
   - Deterministisch bleiben nur Steuerkanäle, keine Sprachdeutung: `#`-Befehle, das Erschaffungsmenü, toter SC, die Antwort auf eine Engine-Rückfrage mit genau einer angebotenen Option.
3. **Hinter dem Planer steht ein deterministischer Validator.**
   - Er prüft Art, Skill, Ziel und Mehrfachhandlungen gegen den Zustand.
   - Er darf nur **entfernen, zur Rückfrage oder Verweigerung abstufen** oder **eine** typisierte Reparatur auslösen.
   - Er ersetzt nie und ergänzt nie. Das ist dasselbe Prinzip wie As Agency-Guard.
4. **Basic Attack ist eine Engine-Bedeutung, keine Planerwahl.**
   - Ohne genannten Skill schreibt der Planer `skill: null`. Die Engine setzt dann den Basisangriff der Klasse.
   - Der Validator stuft zur Rückfrage ab, sobald der Text auf einen Skill hindeutet.
   - So kann aus „Fire Lance“ strukturell kein stiller Basisangriff werden.
5. **Planer (Form P1) jeden Zug, kein vorgeschaltetes Gate in v1.**
   - Das Gate brachte in S4b keinen Qualitätsgewinn: Kaskade = Arm in allen Läufen.
   - Es wäre eine zweite Deutungsautorität.
   - Es läuft nur im **Schattenmodus** (protokolliert, ohne Autorität), um seinen echten Nutzen im Spiel zu messen.
6. **Der Plan liegt auf der Spielernachricht** (As Invariante). Swipe und Regenerate erzeugen neue Prosa zu **derselben** Mechanik und denselben Würfeln. Nur eine Bearbeitung der Nachricht deutet neu.
7. **Ablauf in kleinen, einzeln prüfbaren Schritten** (§18), hinter einem Schalter. A bleibt Standard, bis die Tests in §19 bestanden sind.
8. **Branch:**
   - neu von **A** (90bd450);
   - nur die P0-Messwerkzeuge vom Versuchsbranch übernehmen;
   - Bs Kosten- und Kraftlogik für „Fähigkeit auf die Welt“ als Engine-Handler neu schreiben, nicht als GM-Tool übernehmen (§20).

---

## 1. Was die Messungen für C festlegen

| Befund (Quelle) | Folge für C |
|---|---|
| LLM-Semantik ≫ A0: 93 % gegen 40 % richtig, 4 gegen 17 falsche Festlegungen (S4b, p < 0,001) | Planer statt Regex-Autorität, auch im Kampf |
| 0 Ersetzungen genannter Skills, 0 falsche Agency in 544 LLM-Entscheidungen (S4b) | Der Planer darf den Skill wählen. Der Validator sichert trotzdem strukturell ab (§10) |
| K-S verfehlt. Die Ursachen: Art im Modus nicht erlaubt (k4_05, k5_10), offene Produktregeln (k6_08, k5_10), Ziel-Zuordnung (k3_11) (S4b §13.3) | deterministischer Validator mit modusabhängigen Arten; Produktregeln als Daten |
| redundante Art `attack`/`skill` erzeugt Fehler (FC k1_07/k1_08, Stabilitätswechsel) | eine Art `use_skill`; die Engine leitet die Mechanik aus dem Skill ab |
| Bestätigungsfrage wird als falsche Art gewertet (k2_13) | eigene Form `confirm`, vom Validator aus dem Zustand erzeugt |
| RECENT nötig (D3: 5/5 gegen 2/5), kann aber Zielwahl verzerren (k3_11) | selektiver Verlauf: zuerst Engine-Fakten, Prosa knapp (§5) |
| Erzählerkontext hilft nicht (FC_GM), kostet 4,3× Token | eigener kleiner Planer-Prompt, nicht der Erzähler |
| Gate: 0 unsicher, 12 % gespart, Kaskade = Arm (S4b) | kein Gate in v1; Schattenmodus (§7) |
| JSON-Text: 98,9 % gültig im 1. Versuch. Tool `auto`: 85,7 %, aber je Aufruf schneller (S4b §13.7) | JSON-Schema v2 ist der Vertrag. Der Transport (Text oder erzwungener Tool-Aufruf) wird vor dem Einfrieren gemessen (§6) |
| Story-Befehle: Planer mit Typliste ≈ Interpreter, Erzählerkontext ohne Nutzen (S4a) | Außerhalb des Kampfes trägt der Planer As 20 Story-Befehle unverändert (§4.4) |

---

## 2. Datenfluss je Spielernachricht

```text
Spielernachricht (SillyTavern)
 │
 ├─ 0  Host (A, unverändert): prepareGenerationAsync
 │      Record auf der Nachricht mit gleichem input_hash und gültigem Plan?
 │        → wiederverwenden: keine neue Deutung, keine neuen Würfel (§13)
 │
 ├─ 1  Steuerkanäle (deterministisch, keine Sprachdeutung)
 │      #-Befehl · Erschaffungsmenü · toter SC · Antwort = genau eine angebotene Option einer Engine-Rückfrage
 │        → Engine direkt
 │
 ├─ 2  Planer (1 LLM-Aufruf, t 0,1, Schema v2, höchstens 1 typisierte Reparatur)
 │      Eingabe: Modus · erlaubte Arten · Katalog · Engine-Fakten · RECENT knapp · offene Rückfrage · Nachricht
 │      Ausgabe: {"intents": [...]}, nur Absicht, keine Folgen
 │      Fehlschlag nach Reparatur → Abbruch mit Hinweis (wie A heute), nicht zwischengespeichert
 │
 ├─ 3  Validator (deterministisch, neu): nur entfernen, abstufen, 1 Reparatur
 │      V1 Schema/IDs · V2 Art im Modus · V3 Beleg (As Agency-Guard) · V4/V5 Skill-Treue
 │      V6 Ziel · V7 Aktionsökonomie · V8 Rückfrage allein · V9 Grenzen (§8)
 │        → commit[] | clarify | confirm | refused[]   (+ dropped[] mit Regel)
 │
 ├─ 4  Engine (deterministisch; As Handler + 2 neue)
 │      use_skill/move/flee/hold → combat.js (über pcActionOf)
 │      ability_world            → neuer Handler (§11)
 │      Story-Befehle            → src/v4/commands.js (A)
 │      clarify/confirm/refused  → System-Panel bzw. Hinweis, nichts gewürfelt, nichts gebucht
 │      Dice.from(state) → Ereignisse mit rng_to → Ereignisse auf der Spielernachricht
 │
 ├─ 5  Erzähler (1 LLM-Aufruf, nur Prosa, streambar; A): Engine-Block (src/context.js) mit den Ergebnissen
 │      bei clarify/confirm: kein Erzähleraufruf (wie As Zielfrage heute)
 │
 ├─ 6  Extraktor → Firewall / Ownership / Envelope → Welt (A)
 │      Ereignisse auf dem Swipe (text_hash). Neu: Weltänderung an einem Ziel nur mit
 │      Engine-Freigabe aus diesem Zug (§14)
 │
 └─ 7  Faltung (foldChat, A): Zustand = Falte aller Ereignisse; der Plan ist Prüfprotokoll, keine Ereignisquelle
```

---

## 3. Komponenten von A: bleibt, eingeschränkt, entfällt

| Komponente (A) | in C | Begründung |
|---|---|---|
| `src/engine.js`, `src/combat.js`: Kampfauflösung, NPC-Züge, Würfel | **bleibt unverändert** | Nur der Eingang ändert sich: Ein validierter Intent ersetzt `parseIntent` |
| `src/rng.js`: zählerbasiertes RNG, `rng_to` in Ereignissen | **bleibt** | Reproduzierbarkeit, kein Neuwürfeln durch Swipe |
| `src/state.js`, `src/host.js` `foldChat`, `rec`, `setRec`: Ereignisse auf Nachrichten | **bleibt** | Event-Sourcing |
| `src/v4/runtime.js` `prepareGenerationAsync`: Deutung einmal je `input_hash`, Fehlschlag nicht zwischengespeichert | **bleibt als Rahmen.** Der Planer ersetzt den Aufruf `interpretMessage`, und der Zweig `route 'v3'` für freie Sprache entfällt | Swipe-Stabilität ist schon gelöst |
| `src/ir.js` Unified Intent IR | **bleibt.** Neue Quelle `source: 'planner'`; `readTurn` erzwingt `fight` nicht mehr | Eine Form für alle Pfade existiert schon |
| `src/v4/agency.js` `guardCommands` | **bleibt** (Validator-Regel V3) | Frage, Plan, Verneinung, fremde Tat |
| `src/v4/commands.js`: 20 Story-Befehle, Handler | **bleibt** | Der Planer schreibt dieselben Befehle |
| `src/v4/catalog.js` `buildCatalog` | **bleibt.** Erweitert um Kampfbrett und Skillprofil (§4.2) | Planer-Eingabe |
| `src/context.js`: Engine-Block, Erzähler | **bleibt.** Neue Zeilen für `ability_world`, `refused`, Teilausführung | nur Prosa |
| `src/v4/extract.js`, `firewall.js`, `ownership.js`, `envelope.js`, `world.js` | **bleibt.** Firewall um die Freigabe aus `ability_world` erweitert | Persistenz nur mit Leser und Freigabe |
| `src/v4/interpret.js`: Interpreter-Prompt und Parser | **geht im Planer auf.** Story-Teil des Planer-Prompts; `parseInterpretation` wird Validator V1 | eine Deutungsautorität statt zwei |
| `src/intent.js` `parseIntent`: Kampf, Angriff, Ziel, Stealth | **verliert die Autorität.** §3.1 im Einzelnen | Der gemessene Fehler sitzt hier |
| `src/v4/guild.js` Board-Generator | **bleibt** | unabhängig von der Deutung |

### 3.1 Regex- und Intent-Weichen im Einzelnen

| Weiche (A) | Ort | in C |
|---|---|---|
| Kampf erzwingt den Regex-Pfad (`forced = … state.encounter ? 'fight'`) | `src/ir.js` `readTurn` | **entfernt.** Kampf ist ein Modus des Planers, keine Route am Planer vorbei. |
| Angriffswörter ohne erkannten Skill → Basisangriff | `src/intent.js` (≈ Zeile 271) | **entfernt.** Das war die gemessene stille Ersetzung. Ersetzt durch `skill: null` plus Validator V4c (§10). |
| `resolveTarget` (Label, Name, Pronomen per Regex) | `src/intent.js` | **entfernt als Autorität.** Der Planer liefert IDs. Exakte Label-Suche bleibt nur im Steuerkanal „Antwort auf Rückfrage“. |
| `ambiguous_target` / `no_target` → Engine-Frage | `src/engine.js` `playerTurn` | **bleibt als Engine-Verhalten.** Auslöser ist jetzt Validator V6, nicht der Regex. |
| `mentionedSkills`, Erkennung unbekannter Skills | `src/intent.js` | **bleibt, nur als Validator-Eingabe** (V4b/V4c). Darf nur abstufen. |
| `MECHANICAL` leitet Angriff und Stealth außerhalb des Kampfes zum V3-Pfad | `src/ir.js` | **entfernt.** Der Planer schreibt `use_skill` oder `stealth`; die Route folgt aus den Arten. |
| `HOLD_RE` im Kampf | `src/engine.js` `pcActionOf` | **entfällt als Weiche.** Der Planer schreibt `hold`; Produktregel E5 (§17). |
| `#`-Befehle, Erschaffung, toter SC, `pending_combat` | `src/ir.js`, `src/engine.js` | **bleiben deterministisch.** Steuerkanäle, keine Sprachdeutung. |
| A0-Gate aus S4b (`gate()`) | `tools/p0/lib/s4b.mjs` | **nur Schattenmodus** (§7) |

---

## 4. Der Planer

### 4.1 Ort und Aufruf

- **Wo:** in `prepareGenerationAsync`, an der Stelle von `interpretMessage`. Zeitpunkt: einmal je neuer oder bearbeiteter Spielernachricht, vor der Engine.
- **Aufruf:**
  - JSON, Temperatur 0,1, `maxTokens` ≈ 400 (gemessen: 51 Output-Token im Mittel);
  - eine Reparatur mit den typisierten Fehlerzeilen des Validators (V1/V2). Das ist dasselbe Muster wie `interpretMessage` heute.
- **Fehlschlag** (Transport oder ungültig nach Reparatur):
  - Abbruch mit Hinweis, kein Erzähleraufruf (wie A);
  - nicht zwischengespeichert, Regenerate fragt neu;
  - kein Rückfall auf Regex.
- **Version:** `PLANNER_VERSION` und ein Hash des statischen Prompts stehen im Record.

### 4.2 Eingabe je Zug

| Block | Quelle (A) | Inhalt | Größe (geschätzt) |
|---|---|---|---|
| Rolle, Regeln, Beispiele, Format | statisch, je Modus | wie S4b P1, ohne die Arten des anderen Modus | Kampf ≈ 1,0k; Story ≈ 2,5–3k (heute Interpreter ≈ 3,1k) |
| MODE | `state.encounter`, `state.scene.at` | `fight (round n)` oder `story at <Ort>` und die **erlaubten Arten** | < 20 |
| KNOWN SKILLS | Bogen + `content/classes.json` | ID, Name, Profil (Angriff/kein Angriff, Einzel/Fläche, Reichweite, Schadensart, Munition) | ≈ 15 je Skill |
| OPPONENTS (Kampf) | `state.encounter`, Labels (A) | ID, Label, HP-Band, Abstand (ENGAGED/SHORT/…), Haltung | ≈ 15 je Gegner |
| PRESENT | `buildCatalog().present` | ID, Name/Handle, Haltung (feindlich/neutral/freundlich) | ≈ 10 je Person |
| OBJECTS / PLACES | `buildCatalog()` | wie heute im Interpreter | wie heute |
| ENGINE FACTS | Ereignisse des letzten Zuges | deterministisch: wer wen zuletzt angriff, wer verwundet wurde, wer floh, was Alaric zuletzt tat | ≈ 30–60 |
| RECENT | letzte Erzählerantwort | die letzten ≈ 600 Zeichen, nur Prosa (§5) | ≈ 150 |
| PENDING QUESTION | Record der vorigen Spielernachricht | Text, Optionen, zurückgehaltener Intent | ≈ 40 |
| PLAYER MESSAGE | | | |

**FEATURES:** A führt heute keine Szenen-Merkmale (Decke, Strickleiter, Laterne), nur Objekte und Orte. In C v1 sind Weltziele `{"new": "<das Ding>"}` oder Objekt-IDs. S4b hat `{new}`-Ziele mitgemessen (k3_11). Eine Merkmalsliste aus der Welt ist eine spätere Erweiterung (§21).

### 4.3 Wie klein der Prompt sein kann

- **Gemessen (P1):** ≈ 1,87k Prompt-Token je Fall. Davon sind ≈ 1,33k statisch: Rolle 73, Regeln 489, Arten 206, Beispiele 522, Format 36 (Schätzung Zeichen/4). Der Rest (≈ 0,55k) ist Katalog, RECENT und Nachricht.
- **Kampfmodus:** Story-Arten, Suche/Reise und die Beispiele außerhalb des Kampfes entfallen. Statisch ≈ 1,0k, gesamt ≈ 1,5k.
- **Storymodus:** As Interpreter-Prompt (≈ 3,1k) plus `use_skill`, `ability_world`, `clarify` und die Regeln 2–6 aus S4b. Gesamt ≈ 3,5k. Das ist **kein zusätzlicher Aufruf**: Der Planer ersetzt den Interpreter.
- **Reihenfolge für Prompt-Caching:** zuerst der statische Teil je Modus, byte-identisch, dann der Zustand, zuletzt die Nachricht. Falls der Anbieter Präfix-Caching bietet, sind ≈ 70 % des Kampf-Prompts cachebar.
- **Grenze nach unten:**
  - Regeln 2, 3 und 6 (Skill-Treue, Basisangriff, Rückfrage) und die Beispiele mit `{new}` und Rückfrage nicht kürzen. Sie tragen die Sicherheitskennzahlen.
  - Kürzen lässt sich bei Beispielen, die nur Format zeigen.

### 4.4 Ausgabeschema v2

**Gemeinsam:**
- `{"intents": [ … ]}`;
- leer, wenn Alaric keine Engine-Handlung ausführt;
- jede Handlung mit `quote` (wörtlich aus der Nachricht);
- keine weiteren Felder (`additionalProperties: false`);
- **kein Feld für Ergebnis, Erfolg, Schaden, Kosten, Schwierigkeit.**

**Kampfmodus:**

```text
use_skill      {"kind":"use_skill", "skill": <id | {"new":"<seine Worte>"} | null>, "target": <id | {"new":"…"} | null>, "quote":"…"}
                 skill null = er nennt keinen Skill und deutet keinen an → die Engine nimmt den Basisangriff der Klasse
move           {"kind":"move", "dir":"closer"|"away", "target": <id | null>, "quote":"…"}
flee           {"kind":"flee", "quote":"…"}
hold           {"kind":"hold", "quote":"…"}                               (Produktregel E5)
ability_world  {"kind":"ability_world", "skill": <id | {"new":…} | null>, "target": <object id | {"new":"<das Ding>"}>,
                "goal":"<sein Ziel, ≤ 12 Wörter>", "quote":"…"}
stealth        {"kind":"stealth", "quote":"…"}                            (vor dem Umschalten im Korpus v2 abdecken)
clarify        {"kind":"clarify", "about":"target"|"skill"|"action", "question":"…", "options":[<ids oder kurze Texte>]}
```

**Storymodus:**
- die 20 Befehle aus `content/commands.json`, unverändert (`go`, `activity` mit `kind: search` …, `take`, `pay`, `quest.accept` …);
- dazu `use_skill` (Angriff außerhalb des Kampfes beginnt ihn wie heute, nicht angreifende Skills);
- `ability_world`, `stealth`, `clarify`.

**`confirm` schreibt der Planer nicht.** Der Validator erzeugt es aus dem Zustand (V6d).

### 4.5 Was der Planer entscheiden darf, und was nicht

| darf | darf nicht |
|---|---|
| welche Handlungen die Nachricht ausdrückt, in welcher Reihenfolge | ob eine Handlung gelingt, was sie kostet, was sie bewirkt |
| welcher **bekannte** Skill gemeint ist (Alias, Tippfehler, Umschreibung), wenn genau einer passt | einen anderen Skill an die Stelle eines genannten setzen; Basic Attack wählen, wenn ein Skill angedeutet ist (strukturell gesperrt, §10) |
| welches Ziel gemeint ist (Label, Teil-Label, Beschreibung, Pronomen, RECENT), wenn genau eines passt | unter mehreren passenden Zielen wählen |
| ein unbekanntes Ding oder einen unbekannten Skill als `{new}` benennen | `{new}` in eine bekannte ID umdeuten |
| das Ziel einer Weltnutzung in den Worten des Spielers (`goal`) | Erfolg, Schwierigkeit oder Folgen der Weltnutzung |
| eine Rückfrage stellen, wenn zwei Lesarten mechanisch verschieden sind | fragen, wenn genau eine passt (L1) |
| leer antworten (Frage, Plan, Rede, fremde Tat) | Handlungen anderer Figuren, Zustand, Zahlen, neue kanonische Wesen |

---

## 5. Selektiver Verlauf und Zustand

S4b: Ohne RECENT wurden 3 von 5 Verlaufsbezügen zur Rückfrage. Mit RECENT wurden alle 5 aufgelöst. RECENT hob aber in k3_11 das falsche Ding hervor.

**Regel:** Erst deterministische Engine-Fakten, dann knappe Prosa.

1. **ENGINE FACTS** aus den Ereignissen des letzten Zuges, ohne LLM:
   - „Barkscorpion B stung Alaric (last round)“;
   - „Grey Wolf B was hit by Alaric“;
   - „Bandit B moved away (SHORT)“.

   Das löst „the one that stung me“ ohne Prosa und widerspricht nie dem Brett. Der Szenenfehler in k6_07, RECENT gegen Brett, kann so nicht entstehen.
2. **RECENT:** die letzten ≈ 600 Zeichen der letzten Erzählerantwort, ohne Tracker-Blöcke (`stripTrackerBlocks`). Nur für Bezüge, die keine Engine-Tatsache sind („the one by the lantern“).
3. **PENDING QUESTION:** eine offene Engine-Rückfrage mit Optionen und dem zurückgehaltenen Intent (§9).
4. **Nicht:**
   - ältere Verläufe;
   - Lorebook;
   - der Erzähler-Preset;
   - der volle Charakterbogen.

   FC_GM zeigt: Mehr Kontext bringt keine Semantik, nur Token und p90.

**Messpunkt:** S4b v2 vergleicht Engine-Fakten + RECENT gegen nur RECENT auf den Verlaufsfällen und auf k3_11-artigen Fällen.

---

## 6. Transport: JSON-Text oder Tool-Aufruf

**Gemessen:**
- JSON-Text: 98,9 % gültig im 1. Versuch.
- Tool mit `tool_choice auto`: 85,7 %.
  - 7 der 10 Rückfragefälle in K6 hatten ein ungültiges `kind`.
  - 6 Negativfälle kamen ohne Tool-Aufruf.
- Der Tool-Pfad war je Aufruf deutlich schneller: p50 1,6 s gegen 3,4 s. Die Ursache ist unbekannt, die Läufe waren nicht verschränkt.

**Entscheidung:**
- Der **Vertrag** ist das JSON-Schema v2.
- Der **Transport** wird vor dem Einfrieren gemessen (Schritt C4, §18). Drei Varianten, verschränkt im selben Lauf:
  1. JSON-Text;
  2. erzwungener Tool-Aufruf (`tool_choice required`) mit demselben Schema;
  3. falls der Anbieter es kann: `response_format` mit JSON-Schema.
- Es gewinnt die schnellste Variante, deren Gültigkeit und Sicherheit nicht schlechter sind.

Das ist die enge Lesart des FC-Befunds: Die Tool-Schnittstelle wird nicht verworfen. Verworfen sind
- der redundante `kind`-Entwurf,
- `auto` und
- „Rückfrage als Tool-Argument ohne eigenes Beispiel“.

---

## 7. Gate + Planer oder Planer jeden Zug (Gegenhypothese geprüft)

**Gegenhypothese:** „Reiner Planer jeden Zug ist einfacher und günstig genug.“

| | Planer jeden Zug | Gate + Planer |
|---|---|---|
| **Qualität (S4b)** | 85/91, 4 falsch | identisch, Fall für Fall, in allen vier Armen |
| **Deutungsautoritäten** | 1 | 2: Gate mit A0-Matcher und geschlossener Wortliste, dazu der Planer |
| **Code** | Planer und Validator | dazu Gate (≈ 60 Zeilen in P0) und die Abhängigkeit vom Regex-Parser (`src/intent.js`, 363 Zeilen) als Autorität |
| **Fehlerfläche** | Planerfehler (gemessen), vom Validator begrenzt | dazu falsche Durchlässe des Gates. Gemessen 0, aber nur am Korpus des Autors. Jeder neue Skill-Name, jede neue Label-Form und jedes Synonym in der Wortliste kann eine Lücke öffnen. Dazu kommt Inkonsistenz: Derselbe Satz kann je nach Wortlaut verschieden behandelt werden. |
| **Records und Tests** | eine Form | zwei Pfade mit zwei Testmatrizen. Der Validator muss auf beiden laufen. |
| **Latenz** | Planer p50 3,4 s / p90 6,6 s je Zug. Im Kampf ist das neu: A ruft dort heute kein LLM vor dem Erzähler auf. | spart den Planer auf exakten Befehlen. Im Korpus 12 % der Züge, im Mittel ≈ 0,4 s je Zug |
| **Token** | Kampf ≈ 1,5–1,9k je Zug, Story ≈ 3,5k (ersetzt den Interpreter mit ≈ 3,1k). Zum Vergleich: Erzähler ≈ 7,9k, Extraktor ≈ 4,7k | spart ≈ 12 % der Planer-Token, also ≈ 1–2 % eines Zuges |
| **Ausfall des Planers** | Abbruch mit Hinweis (wie As Interpreter) | Exakte Befehle liefen weiter. Fällt der Anbieter aus, fällt aber auch der Erzähler aus; der Zug ist trotzdem nicht erzählbar. |

**Urteil: Die Gegenhypothese hält für v1. Der Planer läuft jeden Zug.**
- Der einzige echte Preis ist die Kampflatenz.
- Gegen sie wirken Caching des statischen Prompts, die Transportmessung (§6) und der kleinere Kampf-Prompt. Ein zweiter Deutungspfad ist dafür nicht nötig.

**Ist das A0-Gate langfristig nötig?** Nach heutigen Daten nein.

Es läuft in C als **Schattenmesser**:
- Es klassifiziert jeden Kampfzug.
- Es schreibt `gate: {cls, agrees_with_planner}` in den Record.
- Es entscheidet nichts.

Wieder einschalten nur, wenn alle drei Bedingungen gelten. Sie werden vor dem Live-Lauf festgelegt:
1. Mindestens 30 % der Kampfzüge sind `FAST_COMMIT`.
2. Mindestens 200 Kampfzüge zeigen 0 Abweichungen zwischen Gate und validiertem Planer.
3. Die Kampflatenz ist nach Caching und Transportwahl ein gemessenes Problem: p50 > 3 s.

Sonst wird der Schattenmesser nach der Messphase entfernt.

---

## 8. Der deterministische Validator

**Eigenschaften:**
- reine Funktion `validatePlan(plan, state, content, text) → {commit[], clarify | confirm | null, refused[], dropped[], repair_errors[]}`;
- kein LLM, keine Zufallszahl;
- jede Entscheidung trägt die Regel-ID;
- er darf nur **entfernen, abstufen** (Commit → Rückfrage oder Verweigerung) oder **einmal** eine Reparatur anfordern (V1, V2). Er ersetzt nie Skill, Ziel oder Art und ergänzt nie eine Handlung.

| Regel | Prüfung | Folge |
|---|---|---|
| **V1** Schema/IDs | Art bekannt, Pflichtfelder, IDs aus dem Katalog, keine Zusatzfelder | Reparatur mit typisierter Zeile. Danach: Abbruch wie heute |
| **V2** Art im Modus | Art ∈ erlaubte Arten des Modus (Kampf: `use_skill`, `move`, `flee`, `hold`, `ability_world`, `stealth`, `clarify`; Story: die 20 Befehle + `use_skill`, `ability_world`, `stealth`, `clarify`) | Reparatur, z. B. „go is not possible during a fight; leaving the fight is flee“. Danach: diese Handlung `refused(not_in_fight)` mit Hinweis |
| **V3** Beleg | As `guardCommands`: `quote` steht in der Nachricht; keine Frage, kein Plan, keine Verneinung, keine fremde Tat | entfernen (`dropped`), sichtbar im Record |
| **V4a** Skill bekannt | `skill` ist eine bekannte ID, `null` oder `{new}` | sonst V1 |
| **V4b** genannter Skill | Das `quote` nennt einen bekannten Skill exakt oder fast (Name, Inhalts-Aliase, Tokenabstand ≤ 2, gleiches Kopfwort), und der Plan nimmt einen anderen | `clarify(skill)` mit beiden. Nie still den genannten nehmen. |
| **V4c** Basisangriff | `skill: null` oder die Basic-Attack-ID, aber das `quote` deutet einen Skill an: Fast-Treffer eines bekannten Skills, ein unbekannter mehrteiliger Eigenname in Handlungsstellung (As Heuristik für unbekannte Skills) oder ein **Hinweisverb** der Klasse (Produktregel E1, Daten) | `clarify(skill)`. Die Basic-Attack-ID ohne die Worte „basic attack“ im `quote` wird wie `null` behandelt. |
| **V5** unbekannter Skill `{new}` | Fast-Treffer zu **genau einem** bekannten Skill? | ja: `clarify(skill)` „Meinst du Flame Lance?“; nein: `refused(unknown_skill)`, nichts gebucht |
| **V6a** Ziel gültig | Kampf: aktiver Gegner, Anwesender oder Objekt. Story: Anwesender oder Objekt | sonst V1 |
| **V6b** Ziel fehlt | Einzelziel-Skill mit `target: null` | 1 aktiver Gegner: dieser (wie A). Mehr als einer: `clarify(target)` mit Optionen. Fläche: kein Ziel nötig |
| **V6c** Ziel abwesend | `{new}` als Kreatur im Kampf | `refused(no_target)` mit Liste (wie As `no_target`) |
| **V6d** Nicht-Feind | Angriff auf eine anwesende Person mit Haltung neutral oder freundlich | `confirm` mit dem zurückgehaltenen Intent (Produktregel E2) |
| **V7** Aktionsökonomie | Kampf: höchstens eine Haupthandlung (`use_skill`, `ability_world`, `flee`, `hold`, `stealth`) und eine Bewegung, in Spielerreihenfolge. Story: Folge wie heute (`seq`) | Überzählige Handlungen: `refused(one_action)` mit Hinweis. Nie still weglassen (Produktregel E3) |
| **V8** Rückfrage allein | `clarify` oder `confirm` neben Commits | v1: Die Rückfrage gewinnt, **nichts** wird gebucht. Der ganze Zug wartet auf die Antwort. |
| **V9** Grenzen | `goal` ≤ 12 Wörter, `question` ≤ 25 Wörter, `options` ⊆ Katalog oder kurze Texte | kürzen bzw. V1 |

**Abdeckung der S4b-Fehler durch den Validator** (Nachrechnung an den gespeicherten Rohplänen ist Schritt C2):

| Fall | Regel | erwartete Wirkung |
|---|---|---|
| k4_05 (`go` im Kampf) | V2 | Reparatur: flee oder move; sonst `refused(not_in_fight)`. Keine stille Festlegung mehr |
| k5_10 (`search` im Kampf) | V2 | wie k4_05; was Wahrnehmung im Kampf ist, legt E4 fest |
| k6_08 (`blast` → Basic Attack) | V4c mit E1 | Rückfrage, wenn „blast“ als Hinweisverb gilt |
| k1_07, k1_08 (`skill` statt `attack`) | Schema v2 | entfällt: eine Art `use_skill` |
| k2_13 (Bestätigung) | V6d | `confirm`; wird so gewertet |
| k3_11 (Ziel-Zuordnung) | keine | bleibt Restfehler geringer Schwere (§16) |

---

## 9. Wann eine Rückfrage statt Mechanik

**Pflicht zur Rückfrage:**
1. **Ziel:** Zwei oder mehr Ziele passen und unterscheiden sich mechanisch. Der Planer fragt (L2); bei `target: null` erzwingt V6b die Frage.
2. **Skill:** Zwei oder mehr bekannte Skills passen. Der Planer fragt; V4b und V4c erzwingen die Frage, wenn der Text einen Skill andeutet.
3. **Fast-Treffer:** Ein unbekannter Skill passt zu genau einem bekannten (V5).
4. **Handlungsart unklar:** Angriff oder Weltnutzung, Flucht oder Rückzug, wenn beides mechanisch verschieden wäre. Das entscheidet der Planer (Regel 6).
5. **Bestätigung:** Angriff auf einen Nicht-Feind (V6d; Produktregel E2).

**Keine Rückfrage:**
- wenn genau eine Lesart passt. L1 gilt; S4b: 0 % unnötige Rückfragen.
- bei Planerausfall: Dann gibt es einen Abbruch mit Hinweis.
- bei Unmöglichem: Dann gibt es eine Verweigerung mit Grund (`refused`), z. B. unbekannter Skill ohne Fast-Treffer oder Art im Modus nicht erlaubt.

**Ablauf einer Rückfrage.** Das ist As heutiges Verhalten bei der Zielfrage (`src/engine.js` `playerTurn` → `targetQuestion`):
- Die Engine zeigt ein System-Panel mit Frage und Optionen.
- Nichts wird gebucht oder gewürfelt. Kein NPC-Zug, kein Erzähleraufruf.
- Der Record der Spielernachricht hält fest: `pending: {about, options, held_intent}`.
- **Antwort:**
  - Ist die nächste Nachricht genau eine angebotene Option (Label, Name, Skillname; normalisiert), setzt der Steuerkanal sie ohne LLM in den zurückgehaltenen Intent ein. Das ist eine geschlossene Auswahl, keine Sprachdeutung.
  - Sonst bekommt der Planer `PENDING QUESTION` als Kontext und deutet die Antwort frei („the wounded one“, „never mind, I run“).
- Eine Rückfrage ist kein Zug. Die Runde beginnt erst mit der Handlung.

---

## 10. Wie „Fire Lance → Basic Attack“ verhindert wird

Vier Schichten. Jede einzelne würde den A-Fehler schon verhindern.

1. **Schema:**
   - Der Planer **kann** Basic Attack nicht als Ersatz wählen. Ohne Skill schreibt er `null`.
   - Unbekanntes schreibt er als `{"new": "<seine Worte>"}`. Regel 2 im Prompt verbietet die Ersetzung ausdrücklich.
   - S4b: 0 Ersetzungen genannter Skills in 544 Entscheidungen.
2. **V4b / V4c / V5:**
   - Der Text „Fire Lance“ ist ein Fast-Treffer zu „Flame Lance“ (gleiches Kopfwort, Tokenabstand 1).
   - Bei `null` oder Basic Attack stuft V4c zur Rückfrage ab.
   - Bei `{new: "Fire Lance"}` fragt V5: „Meinst du Flame Lance?“
   - Bei Flame Lance passt alles.
3. **Engine:** Ein unbekannter Skill wird verweigert, nie ersetzt. Das ist die S4b-Engine-Regel, für alle Pfade gleich.
4. **Aufzeichnung:**
   - Jede Abstufung steht mit ihrer Regel im Record.
   - Ein Testfall je Regel; dazu die Mutationsprobe (§19).

---

## 11. `ability_world` durch die deterministische Engine

**Ziel:** Kreative Nutzung bekannter Fähigkeiten an der Welt, ohne dass Planer oder Erzähler Erfolg oder Zahlen erfinden.

**Handler `abilityWorld(state, content, intent, dice)`:**
- neu in der Engine;
- Kosten- und Kraftlogik aus Bs `useAbilityOnWorld` (`src/gm/runtime.js`) übernommen, als Engine-Funktion neu geschrieben.

**Ablauf:**
1. **Skill:**
   - Der Skill muss bekannt sein; `null` heißt Basisangriff, z. B. „I shoot down the dead pine“.
   - Ressourcen nach Beherrschungsstufe (`content.rules.proficiency`, wie in B).
   - Munition wird wie bei einem Angriff gebucht. Das schließt eine Lücke in B: Dort waren Munitions-Skills verweigert.
2. **Im Kampf:**
   - verbraucht Alarics Haupthandlung (V7);
   - die NPC-Züge folgen wie in As Runde;
   - B hatte `ability_world` im Kampf ganz verweigert (`active_combat_not_migrated`). C legt die Ökonomie fest.
3. **Gelingen:** eine Core-#7-Probe, **von der Engine gerechnet**:
   - Chance % = Actor ÷ (Actor + Opposition) × 100;
   - W100 aus `Dice` (zählerbasiert, im Ereignis);
   - Erfolg, wenn W100 ≤ Chance.
   - **Vorschlag**, Balancing offen (Produktregel E6): Actor = Leitwert des Skills, Opposition = Schwierigkeitswert des Ziels.
   - Standard ist `moderate` (6) aus `rules.checks.difficulty_scores`. Diese Werte sind dort als „proposed“ markiert.
   - Später: Werte je Zielklasse aus dem Inhalt.
   - Weder Planer noch Erzähler setzen die Schwierigkeit.
4. **Wirkung:**
   - **v1: keine HP- und keine Statuswirkung auf Kreaturen.** Eine fallende Laterne verletzt Bandit B nur, wenn eine spätere Regel das als Engine-Wirkung definiert (E6).
   - Der Engine-Block sagt dem Erzähler das ausdrücklich.
5. **Ereignis:**

   ```text
   ability.world_used {skill, target (id | text), goal, cost, roll, chance, success, rng_to}
   ```

   Dazu `outcome.recorded`.
6. **Erzähler:** beschreibt Gelingen oder Scheitern im Rahmen von `goal` und Ziel. Er entscheidet weder das eine noch die Zahlen.
7. **Persistenz:**
   - Bei Erfolg darf der Extraktor eine dauerhafte Änderung **am Ziel dieser Handlung** vorschlagen (Decke eingestürzt, Seil durchgebrannt).
   - Die Firewall verwirft Weltänderungen an anderen Dingen, die sich auf diese Handlung berufen.
   - Bei Scheitern gibt es keine dauerhafte Änderung durch diese Handlung.

**Der Planer erfindet keinen Erfolg.** Sein Schema hat dafür kein Feld; V1 verwirft Zusatzfelder.

---

## 12. Mehrere Handlungen in einem Zug

- **Planer:** eine Handlung je Absicht, in Spielerreihenfolge (L6; S4b K4 gemessen).
- **Validator V7, Kampf:**
  - Eine Haupthandlung und eine Bewegung.
  - Eine Bewegung vor oder nach dem Skill wird als `move` an die Kampfaktion gehängt, wie heute.
  - Ab der zweiten Haupthandlung `refused(one_action)` mit Hinweis im Panel und im Engine-Block: „Alaric's second action (burn the rope ladder) was not taken this round“.
  - Nicht gespeichert für später: Der Zustand ändert sich, ein gespeicherter Befehl wäre veraltet.
- **Story:** As Befehlsfolge mit `seq`, unverändert (z. B. `go`, dann `board.read`).
- **Rückfrage im Mehrfachzug:** V8. Der ganze Zug wartet. Kein Teil wird gebucht, bevor die Frage beantwortet ist.

---

## 13. Swipe, Regenerate, Bearbeiten, Continue

So verhält sich A heute in `prepareGenerationAsync`, und C übernimmt es unverändert.

| Aktion | Planer | Engine/Würfel | Erzähler | Extraktor |
|---|---|---|---|---|
| neue Nachricht | 1× | 1× | 1× | 1× |
| **Swipe / Regenerate** | **nein**: Record mit gleichem `input_hash` | **nein**: Ereignisse liegen auf der Spielernachricht | neu | neu, auf dem Swipe (`text_hash`) |
| Planer war fehlgeschlagen | ja (nicht zwischengespeichert) | dann 1× | dann 1× | |
| Spielernachricht bearbeitet | ja (neuer `input_hash`) | neu, ab Zustand vor der Nachricht | neu | neu |
| Continue | nein | nein | setzt fort | |
| Rückfrage offen | – | nichts gebucht | nicht aufgerufen | – |

**Folge:** Ein Swipe kann die Mechanik nie ändern, auch nicht durch eine andere Deutung. Wer eine andere Deutung will, bearbeitet seine Nachricht. Die frühere Überlegung „Plan auf dem Swipe“ (Review §7.2) ist damit verworfen.

---

## 14. Event-Sourcing, RNG, Erzähler, Welt-Persistenz

**Record der Spielernachricht** (Erweiterung von `RECORD_V4`):

```text
{ input_hash, route,
  ir:    { v, acts[source:'planner'], links },
  plan:  { version, prompt_hash, mode, ms, tokens, repaired, raw, gate_shadow },
  check: { commit[], clarify|confirm, refused[], dropped[] (je mit Regel) },
  events: [turn.begun, resource.changed, …, ability.world_used, outcome.recorded] (mit rng_to) }
```

**Event-Sourcing:**
- Der Zustand ist die Falte der Ereignisse (`foldChat`).
- `plan` und `check` sind Prüfprotokoll, keine Ereignisquelle. Beim Neuaufbau wird nie neu geplant.

**Deterministische Wiederholung:**
- `engine(state_vor, check.commit, seed)` ergibt byte-gleich `events`.
- Das ist ein Test (§19), kein Laufzeitpfad.

**RNG:**
- `Dice.from(state)` je Zug; jede gezogene Zahl landet im Ereignis.
- Swipes ziehen nicht neu, weil die Ereignisse auf der Spielernachricht liegen.

**Erzähler:**
- bekommt den Engine-Block mit Ergebnissen, Verweigerungen und Hinweisen;
- erzählt nur;
- ändert keine Zahlen (Firewall).

**Welt:**
- Extraktor → Firewall → Ownership → Envelope → Welt, wie A.
- Neu ist nur die Freigabe aus `ability_world` (§11.7).
- Der Planer hat **keinen** Schreibweg in die Welt.

---

## 15. Autoritätsgrenzen

| | entscheidet | entscheidet nie |
|---|---|---|
| **Planer** | was der Spieler meint: Art, bekannter Skill, Ziel-ID oder `{new}`, `goal`-Text, Reihenfolge, ob gefragt werden muss | Ergebnis, Zahlen, Kosten, Schwierigkeit; Ersetzung; Wahl unter mehreren Zielen; Handlungen anderer; Weltzustand |
| **Validator** | ob der Plan in diesem Zustand zulässig ist; Abstufung zu Rückfrage, Bestätigung oder Verweigerung; eine Reparatur | Skill, Ziel oder Art ersetzen; Handlungen ergänzen; freie Sprache deuten |
| **Engine** | alles Mechanische: Zulässigkeit, Kosten, Würfel, Treffer, Schaden, Gelingen der Weltnutzung, NPC-Züge, Inhalt der Rückfragen (Optionen aus dem Zustand), Ereignisse | freie Sprache deuten; Prosa |
| **Erzähler** | Worte, Ton, Beschreibung des Ergebnisses im Rahmen des Engine-Blocks | Zahlen, HP, Geld, Rang, Gelingen, neue Mechanik; Engine-Felder behaupten (Firewall) |
| **Extraktor + Firewall / Ownership / Envelope** | welche Prosa-Fakten Zustand werden, nur im Rahmen der Freigaben | Mechanik; Engine-eigene Felder; Weltänderungen ohne Freigabe |
| **Host** | Zeitpunkt, Zwischenspeicher je `input_hash`, Barriere vor dem nächsten Zug | Inhalt |

---

## 16. Die verbleibenden Fehlerklassen (S4b) und ihre Behandlung

| Klasse | Fälle | Behandlung in C | Restrisiko |
|---|---|---|---|
| Art im Modus nicht erlaubt | k4_05, k5_10 | Kampf-Prompt zeigt nur die erlaubten Arten; V2 mit Reparatur; danach Verweigerung mit Grund | keine stille Festlegung mehr; schlimmstenfalls ein verweigerter Teil |
| Ziel-Zuordnung bei Weltnutzung | k3_11 | Regel im Prompt: „target = das Ding, das die Fähigkeit trifft; goal = was geschehen soll“, plus ein Beispiel. Engine-Fakten vor RECENT (§5) | bleibt möglich. Geringe Schwere: gleiche Kosten, keine HP-Wirkung; die Persistenz betrifft das genannte Ziel, und das `goal` steht im Engine-Block |
| Hinweisverb ↔ Basisangriff | k6_08 | Produktregel E1 als Daten (Hinweisverben je Klasse); V4c; Prompt-Regel 3 und Gold aus derselben Quelle | keines, sobald E1 entschieden ist |
| Wahrnehmung im Kampf | k5_10 | Produktregel E4 | wie oben |
| redundante Art | k1_07, k1_08 (FC) | `use_skill`; die Engine leitet die Mechanik ab | entfällt |
| Bestätigung | k2_13 | `confirm` aus V6d; Gold v2 | entfällt |
| Rückfrage / kein Aufruf im Tool-Pfad | k6_05, k0_07, 13 Erstversuche (FC) | Transportmessung (§6); erzwungener Aufruf; Rückfrage-Beispiel | wird gemessen |
| Szenen- und Goldfehler | k6_07, k1_04 | Korpus v2: RECENT konsistent mit dem Brett; k1_04 über V5 (Fast-Treffer → „Meinst du …?“) | – |

---

## 17. Offene Produktentscheidungen E1–E8 (bitte entscheiden; jede wird Daten, nicht nur Prompt)

| | Frage | Vorschlag (Standard) |
|---|---|---|
| **E1** | Ist „blast“ (und „zap“, „cast at“) bei einem Magier mit mehreren Angriffszaubern ein Skill-Hinweis? (k6_08) | ja → Rückfrage. Liste je Klasse in `content/classes.json`. |
| **E2** | Angriff auf einen anwesenden Nicht-Feind (k2_13): ausführen oder bestätigen lassen? | bestätigen (`confirm`) |
| **E3** | Zwei Haupthandlungen in einer Kampfrunde (k4_01, k4_05): erste ausführen, zweite verweigern, oder vorher fragen? | erste ausführen, zweite mit Hinweis verweigern |
| **E4** | Wahrnehmung im Kampf („I scan the treeline“, k5_10): keine Handlung, freie Beobachtung ohne Kosten oder Probe mit Aktionsverbrauch? | keine Engine-Handlung (leer); der Erzähler beschreibt, was sichtbar ist |
| **E5** | „Bogen anlegen und warten“ (k8_09): `hold` (Engine) oder keine Handlung? | `hold` |
| **E6** | `ability_world`: Probe nach Core #7 mit Engine-Schwierigkeit; keine HP-Wirkung in v1. Einverstanden? Welcher Actor-Wert? | ja; Actor = Leitwert des Skills; später Wirkungen je Regel |
| **E7** | „the second one“ bei Labels A/B (k2_15) | B (Reihenfolge der Labels), keine Rückfrage |
| **E8** | Heavy Slash auf das Laternenseil, damit die Laterne auf Bandit B fällt (k3_12) | `ability_world` auf die Laterne; Bandit B nimmt in v1 keinen Engine-Schaden; der Erzähler darf es nicht als Treffer erzählen |

---

## 18. Minimaler Umsetzungsplan (kleine, einzeln prüfbare Schritte)

Jeder Schritt ist ein eigener Commit mit grüner Suite. Bis C7 ist nichts davon im Spiel aktiv.

| Schritt | Inhalt | Prüfung |
|---|---|---|
| **C0** | Neuer Branch von A (90bd450). Übernimmt nur die P0-Werkzeuge per Datei-Checkout (`tools/p0/`, `tests/eval/s4b_*`, `tests/p0/`, `docs/P0_S4B.md`, dieses Dokument); keine B-Commits. | `npm test` grün; A-Verhalten byte-gleich (V3/V4-Diff, Golden) |
| **C1** | Produktregeln E1–E8 entscheiden (Nutzer) und als Daten ablegen. **Korpus v2** als neue Datei:<br>• k6_07-Szene konsistent;<br>• `confirm` und `use_skill` im Gold;<br>• Abdeckung `stealth`, `hold`, Mehrfachzüge im Kampf, Story-Befehle neben Kampfarten.<br>**Holdout** von jemand anderem geschrieben (ChatGPT oder Nutzer), vor dem Lauf versiegelt. Korpus v1 und Ergebnisse bleiben unverändert. | Korpus-Integritätstests; Gold und Prompt-Regeln aus derselben Regeldatei |
| **C2** | `validatePlan` als reines Modul (`src/plan/validate.js`) mit V1–V9; Unit-Tests je Regel. **Offline-Nachrechnung:** die gespeicherten S4b-v1-Rohpläne (P1, FC, FC_GM, P1 ohne RECENT) durch den Validator. | Erwartung:<br>• k4_05 und k5_10 nicht mehr still festgelegt;<br>• keine neue falsche Festlegung;<br>• Liste aller Abstufungen von Hand geprüft. |
| **C3** | `plannerRequest` (`src/plan/planner.js`):<br>• Prompt je Modus aus Regeldatei und Katalog;<br>• Engine-Fakten aus den Ereignissen;<br>• RECENT-Auswahl. | Dry-Run:<br>• gleicher Zustand → gleiche Prompt-Bytes;<br>• Token je Modus gemessen;<br>• statischer Teil vorn. |
| **C4** | S4b v2: Planer (Schema v2) + Validator auf Korpus v2 und Holdout. Transportvarianten verschränkt (§6). 3 Wiederholungen auf den Stabilitätsfällen. Kriterien vorab (§19). | Kriterien §19 Block B |
| **C5** | Engine:<br>• `use_skill`-Adapter auf `pcActionOf`;<br>• Handler `ability_world` (§11);<br>• Panels für `clarify`/`confirm`, `refused`-Hinweise;<br>• V7-Ökonomie;<br>• `stealth` und `hold` als Planer-Arten. | Unit- und Golden-Tests:<br>• As Kampftests mit gleichwertigen Plänen statt `parseIntent` → identische Ereignisse;<br>• Wiederholungstest (§14). |
| **C6** | Laufzeit hinter einem Schalter (`planner: off | shadow | on`):<br>• `shadow`: A entscheidet, Planer und Validator laufen mit und werden protokolliert;<br>• `on`: C entscheidet, das Gate läuft im Schatten. | Node-Tests mit geskripteten LLM-Antworten:<br>• Swipe, Regenerate, Bearbeiten, Continue, Reload (§13);<br>• Barriere unverändert. |
| **C7** | Engine-Block-Zeilen (`ability_world`, Teilausführung, Verweigerung); Firewall-Freigabe für Weltänderungen aus `ability_world`; Vertragstext des Erzählers. | Firewall-Tests; Mutationsprobe erweitert |
| **C8** | Echte SillyTavern-Smokes (Mock-Anbieter): Kampf mit Rückfrage und Antwort, Weltnutzung, Swipe ×3, Regenerate nach Planerausfall, Reload. | wie bisherige ST-Smokes |
| **C9** | Live-Paarlauf A gegen C mit dem Spielmodell (Review §11.3), zuerst im Schattenmodus, dann `on`. | Kriterien §19 Block D |

**Bewusst nicht in v1:**
- Szenen-Merkmale aus der Welt;
- HP-Wirkungen der Weltnutzung;
- Planen und Erzählen in einem Aufruf;
- Streaming-Änderungen;
- andere Sprachen.

---

## 19. Tests, die vor einer Migration (Schalter `on` als Standard) bestehen müssen

**A. Unverändertes (Regression):**
- volle Suite grün (heute 577 auf dem Versuchsbranch);
- V3/V4-Diff und Golden-Tests von A byte-gleich mit Schalter `off`;
- As Kampftests mit äquivalenten Plänen: identische Ereignisse;
- S1-Story-Korpus (Interpreter-Spike): Der Planer im Storymodus ist im Vorzeichentest nicht schlechter als der Interpreter. Negativfälle nach Guard: 0 falsche Agency.

**B. Semantik (S4b v2, Kriterien vor dem Lauf festgelegt; Vorschlag):**
- Korpus v2:
  - ≤ 2 stille falsche Festlegungen;
  - 0 Ersetzungen genannter Skills;
  - 0 falsche Agency;
  - Rückfrage-Recall ≥ 85 %;
  - unnötige Rückfragen ≤ 5 %.
- Holdout:
  - ≤ 1 stille falsche Festlegung je 50 Fälle;
  - richtig ≥ 85 %.
- Stabilität: safe^3 = 100 %, pass^3 ≥ 90 %.
- Gültig nach Reparatur ≥ 99 %, Transportfehler sauber abgebrochen.
- Planer-Latenz im Kampf p50 ≤ 3,5 s, p90 ≤ 7 s (A-Interpreter live: 2,3–6,2 s).

**C. Determinismus und Host:**
- gleicher Record + Zustand → byte-gleiche Ereignisse (Wiederholungstest);
- Swipe ×3 → identische Ereignisse und Würfel, nur Prosa verschieden;
- Regenerate nach Planerausfall → neu geplant;
- Bearbeiten → neu geplant ab dem Zustand vor der Nachricht;
- Reload → identische Falte;
- offene Rückfrage → nichts gebucht, kein NPC-Zug, kein Erzähleraufruf;
- Antwort mit genau einer Option → kein LLM-Aufruf.

**D. Live** (Paarlauf, echtes Modell):
- 0 stille Ersetzungen in den Protokollen;
- jede Abstufung mit Regel sichtbar;
- Gate-Schatten ausgewertet (§7);
- Gesamtlatenz je Zug gegen A berichtet.

**E. Mutationsprobe** (A hat 44/44): Jede Validator-Regel V1–V9 und die Firewall-Freigabe haben mindestens einen Test, der beim Entfernen der Regel fehlschlägt.

---

## 20. Branch-Empfehlung

**Neuer Branch von A** (`claude/gen35-world-envelope-2026-10-01` @ 90bd450, 4.2.1).

Gründe:
- **A ist der gemessene stabile Stand:** Mutationsprobe 44/44, SillyTavern-Smokes, Live-Läufe.
- **C ist ein Umbau von As Frontend.** Alles hinter dem Plan ist As Code: Engine, Record, IR, Guard, Firewall, Extraktor.
- **Der Versuchsbranch** (`chatgpt/narrator-gm-tools-2026-10-02`) trägt B:
  - `src/gm/*`, die Host-Verdrahtung in `index.js` (≈ 130 Zeilen);
  - Version `4.3.0-alpha.2`;
  - `case 'hold'` in `pcActionOf`.

  C darauf zu bauen hieße, A und B zu mischen oder B wieder auszubauen. Das verletzt die Versuchsregel und macht den Vergleich A/B/C unlesbar.
- **Vom Versuchsbranch übernommen werden nur Dateien:**
  - P0-Werkzeuge, Korpora, Tests;
  - die Dokumente;
  - Bs Kosten- und Kraftlogik aus `useAbilityOnWorld` **als Vorlage** für den neuen Engine-Handler, nicht als Code-Übernahme der GM-Session.
- **Der Versuchsbranch bleibt unverändert** als Vergleichsprototyp B.
- `main` liegt 221 Commits hinter A und ist keine Basis.

---

## 21. Risiken und was dieser Entwurf nicht weiß

- **Autorenbias:** Korpus, Gold, Prompt, Gate und dieser Entwurf stammen vom selben Autor. Der Holdout (C1) und der Live-Paarlauf (C9) sind die eigentlichen Prüfungen.
- **Kampflatenz:** C fügt im Kampf einen Aufruf vor dem Erzähler hinzu (p50 3,4 s gemessen). Ob Caching und Transportwahl das auf ein akzeptables Maß senken, ist offen.
- **Ein Planer für Kampf und Story:** S4b maß 8 Arten, S1/S4a die Story-Befehle getrennt. Der gemeinsame Storymodus-Prompt (≈ 3,5k) ist ungemessen (Schritt C4).
- **FEATURES:** Ohne Szenen-Merkmale aus der Welt sind die meisten Weltziele `{new}`. Ob der Extraktor die Folgen solcher Ziele verlässlich fasst, ist ungemessen.
- **Fast-Treffer-Regeln (V4b, V5):** Schwellen zu weit erzeugen unnötige Rückfragen, zu eng lassen sie Aliase durch. Das wird mit Korpus v2 und Holdout eingestellt, vor dem Lauf festgelegt.
- **`ability_world`-Balancing (E6):** Die Probe ist ein Vorschlag. Ohne HP-Wirkung kann sich kreative Nutzung im Kampf wirkungslos anfühlen. Das ist eine Spielentscheidung, keine Architekturfrage.
- **Ein Modell, Englisch.**
