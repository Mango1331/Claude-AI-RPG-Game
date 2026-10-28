# Prototyp C: semantischer Planner hinter einem Feature-Flag (Build 4.3.0-c.6.6)

> **HISTORISCHE ARCHITEKTUR- UND ENTWICKLUNGSCHRONIK seit Prototype C (ab 02.10.2026).** Die folgenden ursprünglichen Ausgangsstände und datierten Patchnotizen sind nicht der aktuelle Code-/Abnahmestand und **keine vollständige Einstiegslektüre**. Bei neuem Chat auf `main` nur [01 Arbeitsweise](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/01_ARBEITSWEISE_CHATGPT_CLAUDE.md) und [03 aktuellen Projektstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md) vollständig lesen. Bei einer konkreten Implementierungsfrage diese Chronik nur nach Bedarf zusammen mit Code, Diff und [10B-Fachindex](PATCH10B_REMAINING_WORK_SOL_IMPLEMENTATION_INDEX.md) heranziehen.


Stand: 02.10.2026.

| | |
|---|---|
| Branch | `claude/c-planner-prototype-2026-10-02-gpt` |
| Ausgangscommit | `90bd450` (Build 4.2.1, „Stand A“). Ohne Flag läuft A unverändert (§8) |
| Arbeitshypothese (eingefroren) | `docs/ARCHITECTURE_C.md` Rev. 3 auf `chatgpt/narrator-gm-tools-2026-10-02` @ `717e2f7`. Sie wird hier nicht weiterentwickelt; dieses Dokument nennt nur, wo der Prototyp bewusst von ihr abweicht (§7) |
| Schalter | Engine-Einstellung **„Prototype C: semantic planner“** (`planner`), Standard **aus** |
| Nicht vermischt | Experiment B (GM-Tools, S4b-Werkzeuge) bleibt auf seinem Branch; hier ist nichts davon übernommen |

**Worum es geht:** der kleinstmögliche Prototyp der Architektur C. Gebaut ist nur, was die bekannten Fehlerklassen über einen neuen Pfad abdeckt:
- `Fire Lance` als Alias oder Tippfehler;
- freie Zielreferenzen;
- Suche vs. Reise;
- Fähigkeiten auf Weltobjekte;
- unbekannte Skills;
- Fragen und Eingaben ohne Spielerhandlung;
- einfache Mehrfachhandlungen.

**Danach endet die Implementierung.** Der nächste Schritt ist die echte Spielsitzung (§9). Eine weitere Schicht kommt erst, wenn der Prototyp oder eine echte Sitzung einen konkreten Fehler zeigt, der sie verlangt.

**Nicht gebaut** (bewusst):
- Function Calling;
- ein aktives A0-Gate;
- Wahrnehmung, Deckung, Umweltschaden, Presentation Context;
- allgemeinere kreative Handlungen;
- neue Würfel-, Event- oder State-Logik über die eine Weltaktion hinaus (§5).

## Inhalt

1. [Ablauf eines Zuges](#1-ablauf-eines-zuges)
2. [Was der Planner sieht](#2-was-der-planner-sieht)
3. [Schema](#3-schema)
4. [Validator](#4-validator)
5. [Mapping auf die Engine](#5-mapping-auf-die-engine)
6. [Abdeckung der bekannten Fehlerklassen](#6-abdeckung-der-bekannten-fehlerklassen)
7. [Bewusste Abweichungen von der Arbeitshypothese](#7-bewusste-abweichungen-von-der-arbeitshypothese)
8. [Nachweise ohne echtes Modell](#8-nachweise-ohne-echtes-modell)
9. [Die echte Testsession](#9-die-echte-testsession)
10. [Bekannte Grenzen](#10-bekannte-grenzen)
11. [4.3.0-c.2: Korrekturen nach dem Live-Test vom 03.10.2026](#11-430-c2-korrekturen-nach-dem-live-test-vom-03102026)
12. [4.3.0-c.4: Temperament als Tendenz, nicht als Gesetz](#12-430-c4-temperament-als-tendenz-nicht-als-gesetz)
13. [4.3.0-c.5: Handlungen, die aufeinander aufbauen](#13-430-c5-handlungen-die-aufeinander-aufbauen)
14. [4.3.0-c.6: Folgen statt Lästigkeit](#14-430-c6-folgen-statt-lästigkeit)

---

## 1. Ablauf eines Zuges

```
Spielernachricht (V4-Kampagne, Schalter an)
 ├─ Steuerkanäle: #-Befehle, Charaktererschaffung, toter PC → wie A, kein Planner-Aufruf
 └─ Planner: EIN LLM-Aufruf (purpose "plan", Temperatur 0,1, max. 900 Tokens, kein Streaming)
     → Validator (src/v4/planner.js parsePlan): Struktur und Zustand; bei Fehlern genau eine Reparatur,
       danach Abbruch ohne Buchung ("planner failed", nicht gecacht, Regenerate plant neu)
     → Agency-Guard von A (src/v4/agency.js): Frage, Rede, Bedingung, fremde Tat → verworfen, im Record
     → Mapping (src/v4/planner.js mapPlan) auf A's vorhandene Eingänge:
         ├─ Kampf, Skill, Weltaktion, Schleichen → Intent für playerTurn (A's Engine, Würfel, Events)
         ├─ Story-Befehle (go, pay, search …)   → playerTurnV4 (A's Handler)
         └─ Rückfrage                          → System-Panel CLARIFY; nichts ausgegeben, nichts gewürfelt
     → Erzähler und Extraktor unverändert
```

**Ersetzt** wird nur das Lesen freier Spielertexte:
- in Kämpfen A's Regex-Lesung (`src/intent.js`);
- in der Geschichte A's Interpreter (`src/v4/interpret.js`).

Ein Story-Zug kostet so viele LLM-Aufrufe wie in A. Ein Kampfzug kostet einen mehr, weil A dort keinen Aufruf macht.

**Record** der Spielernachricht (`extra.avereth`):
- `plan`: Version `plan-c0.1`, Modus `fight`/`story`, Dauer, Reparatur, Rohantworten (je höchstens 2000 Zeichen);
- `a0`: A's eigene Lesung derselben Nachricht, passiv mitgeschrieben;
- `dropped`, `notes`, `free`, `hint`, `mapped`;
- außerdem `ir.reason = 'planner'` und `interp.version = 'plan-c0.1'`.

**Swipe und Regenerate** nutzen den Plan der Nachricht über `input_hash`, genau wie A die Interpreter-Antwort:
- kein zweiter Planner-Aufruf;
- dieselben Events und Würfel.

Ein gescheiterter Plan wird nicht gecacht.

## 2. Was der Planner sieht

| Teil | Inhalt |
|---|---|
| System, Kampf | Planner-Rolle, neun Regeln (aus S4b P1, an das eingefrorene Schema angepasst), sieben Typen, Beispiele mit eigenem Katalog; von den Story-Befehlen nur `go` und `activity` |
| System, Geschichte | A's gemessener Interpreter-Prompt unverändert, dahinter der Planner-Abschnitt |
| CATALOG | A's Katalog: Ort, Anwesende mit Handles, Alarics Coin/HP, Orte, Objekte, Angebote, Aufträge |
| KNOWN SKILLS | `id: Name — Kurzmechanik` (Angriff/Fläche/Reichweite/Kosten); die einzigen erlaubten Skill-IDs |
| OPPONENTS (nur im Kampf) | `id: Label — unhurt/wounded/badly wounded · Band` |
| ENGINE FACTS | die letzten höchstens sechs Kampfschritte |
| RECENT | das Ende der letzten Erzählung, höchstens 600 Zeichen, mit dem Hinweis, dass Katalog und Engine-Fakten Vorrang haben |

Gleicher Zustand ergibt denselben Prompt. Ein im echten SillyTavern gesendeter Request liegt nach dem Smoke unter `<AVERETH_ST_OUT>/planner_alias_request.json`.

## 3. Schema

Format wie beim Interpreter: `{"commands": [{"seq", "type", …, "quote"}]}`. Die Story-Befehle sind A's Vokabular, unverändert. Dazu kommen sieben Typen:

| Typ | Felder | Bedeutung |
|---|---|---|
| `use_skill` | `skill`, `target` | Skill oder einfacher Angriff gegen eine Kreatur oder Person. `skill`: ID aus KNOWN SKILLS, `{"new": "<sein Name>"}` oder `null` (Angriff ohne Skill); `target`: ID, `{"new": …}` oder `null` |
| `ability_world` | `skill`, `target`, `target_words`, `goal` | Skill auf ein Ding: `target` Objekt-ID oder `{"new": …}`, `target_words` seine Worte für das Ding, `goal` sein Ziel in seinen Worten |
| `move` | `dir`, `target` | `closer` / `away` im Kampf |
| `flee` | – | er will weg |
| `stealth` | – | er versteckt sich oder schleicht |
| `other` | `what` | eine eigene Tat, die kein Befehl abdeckt |
| `clarify` | `about`, `question`, `options` | statt zu handeln: eine Rückfrage (`target`/`skill`/`action`) |

Jeder Befehl außer `clarify` trägt `quote`, die wörtlichen Worte der Nachricht, auf denen er steht.

## 4. Validator

`parsePlan` prüft **Struktur und Zustand** und ersetzt nie einen Wert. Jede Prüfung akzeptiert oder lehnt ab:
- JSON-Objekt mit `commands`-Liste;
- `type` bekannt; Story-Befehle gegen A's Interpreter-Schema;
- nur erlaubte Felder. Ein unbekanntes Feld (etwa `damage`) ist ein Fehler: „the engine decides outcomes“;
- fehlende Felder sind ein Fehler;
- `quote` steht wörtlich in der Nachricht oder lässt sich wie beim Agency-Guard verankern;
- `skill` ist eine Skill-ID des Contents, `{"new": …}` oder `null`;
- `use_skill.target` ist eine Gegner- oder Anwesenden-ID, `{"new": …}` oder `null`. Bei einer Objekt-ID folgt der Hinweis „use ability_world“;
- `ability_world.target` ist eine Objekt-ID oder `{"new": …}`. Eine Kreatur ist ein Fehler. `target_words` steht in `quote`;
- `move.dir`, `clarify.about/question/options` sind wohlgeformt.

**Bei Fehlern:**
- Genau ein Reparaturaufruf, mit den Fehlerzeilen.
- Scheitert auch er, bricht der Zug ab: Hinweis „Avereth Engine: planner failed (…)“, nichts gebucht, nichts gecacht.

Ergänzt nur fehlende `seq` und fehlende nullbare Felder als `null`, wie A's Interpreter-Parser.

## 5. Mapping auf die Engine

Deterministisch, in `mapPlan`. Was die Engine nicht nehmen kann, wird eine Rückfrage, eine Ablehnung, die A schon kennt, oder eine sichtbare „NOT TAKEN“-Zeile. Nie wird es ein anderer Wert.

**Rückfrage:**
- Eine `clarify` steht allein und bucht nichts.
- Angezeigt wird ein CLARIFY-Panel mit der Frage des Planners und seinen Optionen als Namen (Labels, Handles, Skill-Namen).
- Bewusst nicht A's Angriffs-Zielfrage: Die nennt einen Skill und einen Angriff, was bei „welcher Wächter?“ falsch wäre.

**Skill:**
- `{"new": …}`, eine unbekannte ID oder ein nicht gelernter Skill → A's Hinweis „Alaric does not know X“. Nichts ausgegeben.
- `skill: null` (oder die Basic-Attack-ID, ohne dass „basic attack“ dasteht) → zuerst das **Sicherheitsnetz** (`skillHint`): Deuten die Worte des Befehls auf einen Skill, kommt ein CLARIFY-Panel mit seinen Angriffs-Skills in Bogenreihenfolge. Sonst gilt die Basic Attack der Klasse (D1).
- Das Netz ist kein zweiter Parser. Es prüft geschlossene Merkmale:
  - genannter Content-Skill;
  - unterscheidendes Wort eines eigenen Skills, exakt oder ein Tippfehler entfernt („lance“, „lnace“);
  - zusammengeschriebener Name;
  - Magie-Wort;
  - Klassenverb (Mage: blast, zap);
  - „use my X on“ für ein X, das er nicht hält.

**Ziel:**
- `{"new": …}` → A's „… is not a target in this fight“.
- Eine ID → Angriff auf sie, mit einem angehängten Schritt (`move`) wie bei A.
- `null`:
  - Flächenskill → nominelles ENGAGED-Ziel (Flächenregel, D3);
  - eine eigene Referenz („the other one“) → „not a target“;
  - genau ein Gegner → dieser (D2; auch bei einem Pronomen);
  - sonst A's Zielfrage.

**Weltaktion (`ability_world`)**, neu in der Engine:
- Die Engine bucht Kosten (mit Proficiency) und Pfeile und zieht einen Prüfwürfel (d100).
- Sie löst **keinen** Schaden und keine Wirkung auf Kampfbeteiligte aus.
- Der Erzähler bekommt „an attempt on a thing … CHECK DIE … narrate none“ und urteilt nach Core #7.
- Im Kampf ist das Alarics Aktion des Zuges (`combat.js worldAction`), außerhalb ein Story-Zug (`engine.js worldUse`).

**Im Kampf:**

| Was er meint | Ergebnis |
|---|---|
| Suche | NOT TAKEN: „searching is not possible during a fight (not resolved by the engine yet)“ |
| Reise (`go`) | NOT TAKEN: „travel is not possible during a fight; to get away, flee“. Nie in Flucht umgedeutet |
| Flucht | A's Flucht |
| Warten | A's `hold` |
| andere Story-Befehle, `other`, `stealth` | NOT TAKEN |

**Mehrfachhandlung:**
- Die erste Hauptaktion wird genommen; jede weitere ist NOT TAKEN („one main action per turn“).
- Ein Schritt geht mit einem Angriff (A's Angriff mit Bewegung).
- Ein Schritt neben Flucht, Weltaktion oder einem Skill ohne Reposition ist im Kampf NOT TAKEN. Ein zweiter Schritt ebenso.

**Außerhalb eines Kampfes:**
- Story-Befehle gehen an A's Handler.
- Neben einer mechanischen Hauptaktion (Skill, Weltaktion, Schleichen) sind Story-Befehle NOT TAKEN (der Prototyp löst eine Art Handlung pro Nachricht).
- `other`, `flee` oder `move` ohne mechanische Hauptaktion sind Erzählung wie in A (PLAYER ACTIONS / NOTHING TO BOOK). Sie stehen im Record unter `plan.free`.

**NOT TAKEN** steht an zwei Stellen:
- im Engine-Block als `- NOT TAKEN THIS TURN (it does not happen; do not narrate it as done): …`;
- unter der Antwort als System-Zeile `NOT TAKEN — …`.

## 6. Abdeckung der bekannten Fehlerklassen

Alle Fälle in `tests/v4/planner_c.test.js` (16 Tests). Sie laufen über den Produktpfad (`prepareGenerationAsync`, wie SillyTavern ihn spielt) mit gescripteten Planner-Antworten. Wo A versagte, zeigt der Test zuerst A's Lesung bei ausgeschaltetem Schalter.

| Fehlerklasse | A (Schalter aus) | Prototyp C | Tests |
|---|---|---|---|
| `Fire Lance` als Alias/Tippfehler | „I Fire Lance Barkscorpion B“ → stille Basic Attack | Flame Lance auf B, MP −16. Lässt der Planner den Skill weg (`null`), fragt das Sicherheitsnetz nach, statt eine Basic Attack zu buchen („Fire Lance“, „flame lnace“, „blast“, „use my fire spear“). „basic attack“ und „with my staff“ bleiben Basic Attack | 2, 3; ST-Smoke |
| Freie Zielreferenzen | Regex: Zielfrage oder falsches Ziel | Der Planner löst über OPPONENTS (HP-Wort, Band), ENGINE FACTS und RECENT auf („the wounded one“ → A). Eine fremde ID → Reparatur; `{"new"}` → „not a target“; eine eigene Referenz wird nie vom einzigen Gegner überschrieben (D2) | 4, 5, 6 |
| Suche vs. Reise | – | Im Kampf bleibt beides, was er meint, und ist sichtbar nicht ausführbar; Flucht bleibt Flucht. Außerhalb gehen beide an A's Handler | 7 |
| Fähigkeiten auf Weltobjekte | „I Flame Lance the cracked floor“ → Zielfrage nach den Skorpionen | Weltaktion: Kosten, Prüfwürfel, sein Ziel bleibt erhalten, kein Schaden; `target_words` muss in seinen Worten stehen; eine Kreatur ist kein Ding. Außerhalb eines Kampfes ebenso, ohne Kampfbeginn | 8, 9; ST-Smoke |
| Unbekannte Skills | – | `{"new": "Fireball"}` und das nicht gelernte Arcane Bolt → „does not know“, nichts ausgegeben; eine erfundene ID → Reparatur → Abbruch | 10 |
| Fragen, keine Handlung | – | leerer Plan; eine als Befehl missverstandene Frage verwirft A's Agency-Guard; „Where is the inn?“ → NOTHING TO BOOK | 11 |
| Einfache Mehrfachhandlungen | – | Schritt zurück + Skill; zweite Hauptaktion NOT TAKEN (Engine-Block und System-Zeile); Warten = A's `hold`; Schritt neben Flucht oder Weltaktion NOT TAKEN; außerhalb des Kampfes bleibt freie Tat Erzählung (`plan.free`) | 12, 13 |
| Swipe, Regenerate, Fehlschlag | – | kein zweiter Planner-Aufruf, gleiche Events; ein gescheiterter Plan wird nicht gecacht | 14, 15; ST-Smoke |
| Prompt | – | Skills, Gegner mit Labels und HP-Wort, Engine-Fakten, kurzer RECENT; im Kampf keine Handelsbefehle; unbekannte Felder abgelehnt | 16 |

## 7. Bewusste Abweichungen von der Arbeitshypothese

Rev. 3 bleibt die Arbeitshypothese. Der Prototyp weicht bewusst ab, wo die volle Fassung eine neue Schicht oder ein offenes Produktthema bräuchte:

| Rev. 3 | Prototyp | Warum |
|---|---|---|
| A0-Gate im Schattenbetrieb mit Live-Metriken | kein Gate; `plan.a0` schreibt A's Lesung derselben Nachricht passiv mit (Route, Art, Skill, Ziel) | Das Gate ist eine eigene Schicht; der Vergleich ist mit dem Record trotzdem möglich. Story-Züge haben dort nur A's Route (A's Interpreter wird nicht zusätzlich aufgerufen) |
| E4 (offen): Suche im Kampf als bezahlte Wahrnehmung oder sichtbar nicht ausführbar | sichtbar nicht ausführbar | kein Wahrnehmungssystem im Prototyp |
| E11: Reihenfolge des Spielers bleibt („step back → attack“) | A's Engine nimmt den Schritt nach dem Angriff (Core #12/#24 „either order“) | Engine-Migration nicht Teil des Prototyps. Der Schritt geht nicht verloren, nur die Reihenfolge ist A's |
| E6/E8: Weltaktion mit von der Engine entschiedenem Erfolg | Kosten und Prüfwürfel; der Erzähler urteilt nach Core #7 | Die Zahlen von E6 sind offen; das ist A's Praxis mit dem Prüfwürfel |
| E12: enge Nachfrage bei Beinahe-Treffern | `{"new"}` wird abgelehnt („does not know“) | Regel 2 des Prompts: Ein Tippfehler wird nur abgebildet, wenn genau ein bekannter Skill passt |
| V4b (Prüfung benannter Ziele), V5 (Rollenprüfung) | nur `target_words` muss in seinen Worten stehen | kleinstmöglicher Validator |
| eine Nachricht, alle Teile | außerhalb eines Kampfes nur eine Art Handlung pro Nachricht; der Rest ist NOT TAKEN | kein Zusammenführen von V3- und V4-Zügen im Prototyp |

## 8. Nachweise ohne echtes Modell

| Prüfung | Befehl | Ergebnis |
|---|---|---|
| Volle Suite (A's 550 Tests + 16 Prototyp-Tests) | `npm test` | 566/566 |
| Prototyp-Tests (Fehlerklassen, §6) | `node --test tests/v4/planner_c.test.js` | 16/16 |
| **Schalter aus = A:** drei Live-Läufe und 18 Kampf-Eingaben, die den Läufen fehlen (hold, wait, flee, hide, Fireball, Alias, Boden, Suche …), durch `90bd450` und diesen Stand; Engine-Block, Record und State byte-gleich (nur Build-Stempel ausgenommen) | `git worktree add --detach /tmp/base 90bd450` und `node tools/c_flag_off_diff.mjs /tmp/base/avereth-engine .` | 122/122 Schritte, 18/18 Eingaben identisch |
| Gegenprobe des Werkzeugs: eine geänderte `hold`-Begründung (während der Arbeit gefunden und zurückgenommen) | dasselbe, mit der Änderung | 4 Abweichungen gemeldet |
| `index.js` in Chromium, SillyTavern nachgebaut | `npm run smoke:browser` | OK |
| **Echtes SillyTavern 1.19, Schalter aus**, Runtime V4 | `AVERETH_ST_DIR=… npm run smoke:st:v4` | OK (alle Prüfungen) |
| **Echtes SillyTavern 1.19, Schalter an** (§9 gescriptet) | `AVERETH_ST_DIR=… npm run smoke:st:c` | 20/20 |

**Was der Smoke mit Schalter im echten SillyTavern gezeigt hat** (Mock-Provider hinter der Quelle Custom, Dummy-Schlüssel):
- Die Checkbox im Engine-Panel schaltet den Planner ein (vorher aus).
- Die Erschaffung ruft ihn nicht auf.
- Jede freie Nachricht macht genau einen Planner-Aufruf: Temperatur 0,1, `max_tokens` 900, ohne Streaming. Außerhalb des Kampfes geht er mit dem Interpreter-Prompt, im Kampf mit dem Planner-Prompt.
- „I Fire Lance Barkscorpion B“ bucht Flame Lance auf B (MP 72 → 56). `plan.a0` zeigt, dass A dieselbe Nachricht als Basic Attack gelesen hätte.
- „I flame lnace the one that stung me“ mit `skill: null` erzeugt ein CLARIFY-Panel mit „Basic Attack · Flame Lance · Arcane Burst“. Kein Erzähleraufruf, nichts ausgegeben.
- Die Weltaktion auf den Boden bucht MP und Prüfwürfel; der Erzähler bekommt „an attempt on a thing“.
- Ihr Swipe erzeugt eine neue Antwort ohne zweiten Planner-Aufruf, mit gleichen Events, gleichem MP und gleichem Engine-Block.
- Die Suche im Kampf steht als NOT TAKEN im Engine-Block und als System-Zeile unter der Antwort.
- Jede Antwort wird genau einmal gelesen.
- **Schlüssel:** von SillyTavern auf dem Server gesetzt. Er stand in keiner Anfrage oder Antwort des Browsers und nicht in der Chat-Datei.

**Was das nicht zeigt:** wie gut das echte Modell plant. Alle Planner-Antworten sind gescriptet. Geprüft sind Validator, Mapping, Engine, Host und Schlüssel, nicht die Semantik. Die zeigt nur die echte Sitzung (§9).

## 9. Die echte Testsession

**Der API-Schlüssel bleibt in SillyTavern.** Der Planner-Aufruf geht wie Interpreter und Extraktor an SillyTavern (`/api/backends/chat-completions/generate`), das den Schlüssel auf seinem Server einsetzt. Nichts hier verlangt, ihn irgendwohin zu kopieren.

### 9.1 Einrichtung

1. **Extension:** den Ordner `avereth-engine/` aus dem Branch `claude/c-planner-prototype-2026-10-02-gpt-c666` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren; die alte Kopie vorher löschen. SillyTavern neu laden. Die Statuszeile zeigt `Avereth Engine 4.3.0-c.6.6.8`.
2. **Verbindung, Karte, Preset, Lorebook:** wie in [LIVETEST_V4.md §2](LIVETEST_V4.md#2-einrichtung-in-sillytavern).
   - Quelle **Custom (OpenAI-compatible)**: nur dort läuft der Planner mit Temperatur 0,1 wie gemessen.
   - Vertrag v4 (Revision 4.3.0-c.6.6.6, unter Build c.6.6.8 unverändert: die Kartenbeschreibung vollständig durch `content/narrator/Avereth_Narrator_Contract_v4.txt` ersetzen; SillyTavern liest die Beschreibung bei jeder Antwort neu, ein laufender Chat spielt also ab der nächsten Antwort mit ihr, die Statuszeile zeigt `narrator contract: current`), Preset „Avereth Narrator V4“, Lorebook v0.14 (seit c.6.6.8; die Ortszeile der Begrüßung auf Alderwatch, Glassmere und Ashbridge kürzen, [LOREBOOK.md](LOREBOOK.md#einrichtung-in-sillytavern)).
3. **Schalter:** Engine-Panel → **„Prototype C: semantic planner“** anhaken.
   - Er gilt für jede V4-Kampagne, auch eine laufende, ab der nächsten Nachricht.
   - Ausschalten bringt A zurück.
4. **Neuer Chat** (empfohlen), Erschaffung wie gewohnt.
   - Die bekannten Fälle sind Mage-Fälle: `Mage`, dann `Flame Lance + Arcane Burst`.
   - Jede andere Klasse geht auch; dann die Skill-Namen unten durch deine ersetzen.

### 9.2 Ablauf

**Frei spielen, in eigenen Worten.** Wichtig ist, dass jede Fehlerklasse mindestens einmal vorkommt. Die Sätze sind Beispiele, keine Pflicht.

**A. Bis zum Kampf** (2–4 Nachrichten): etwa eine Höhle, einen Bau oder einen Keller erkunden, bis Gegner auftauchen. Außerhalb des Kampfes einmal:
- eine Fähigkeit auf ein Ding („I burn the dead stump with Flame Lance to clear the path“);
- eine Suche („I search the verge for tracks“);
- eine Frage („Is the road to Redmarch safe?“).

**B. Im Kampf** (je eine Nachricht):

| # | Klasse | Beispiel | Erwartet |
|---|---|---|---|
| 1 | Alias | `I Fire Lance <Label>` | Flame Lance auf dieses Ziel, nicht Basic Attack; oder eine CLARIFY-Frage |
| 2 | Tippfehler | `flame lnace the big one` | Flame Lance oder CLARIFY, nie eine stille Basic Attack |
| 3 | freie Referenz | `I Flame Lance the wounded one` / `the one that stung me` / `the one by the wall` | das gemeinte Ziel; bei echter Mehrdeutigkeit eine Rückfrage |
| 4 | Weltobjekt | `I Flame Lance the ceiling above them` | Weltaktion: MP, Prüfwürfel, kein Schaden durch die Engine; der Erzähler erzählt den Versuch |
| 5 | Suche | `I look for a way out` | NOT TAKEN, nichts ausgegeben |
| 6 | Reise | `I walk back to Redmarch` | NOT TAKEN, keine Flucht |
| 7 | Flucht | `I run for the exit` | Flucht |
| 8 | Frage | `Would Arcane Burst hit all of them?` | nichts gebucht, die Antwort erklärt |
| 9 | unbekannter Skill | `I cast Fireball at <Label>` | „Alaric does not know Fireball“, nichts ausgegeben |
| 10 | zwei Handlungen | `I step back and Flame Lance <Label>` | beides genommen |
| 11 | zwei Hauptaktionen | `I Flame Lance <A>, then Arcane Burst` | die erste genommen, die zweite NOT TAKEN |
| 12 | einfacher Angriff | `I hit <Label> with my staff` | Basic Attack |

**C. Robustheit:**
- einmal eine Kampfantwort **swipen**: gleiche Würfel, kein neuer Plan;
- einmal **Regenerate**;
- erscheint `planner failed`: Regenerate.

**Bitte je Nachricht notieren:**
- was gemeint war und was die System-Zeilen zeigen;
- ob eine CLARIFY-Frage berechtigt war;
- jede NOT-TAKEN-Zeile, die falsch war;
- alles, was still verschwand oder still geändert wurde;
- die Wartezeit bis zum ersten Wort.

### 9.3 Zurückschicken

- **Chat-Export** (`.jsonl`). Jede Spielernachricht trägt `extra.avereth.plan`: die Rohantwort des Planners, A's eigene Lesung (`a0`), Verworfenes, NOT TAKEN, Hinweise des Sicherheitsnetzes. Keine Schlüssel.
- **Event-Log** (Engine-Panel → *Export event log*).
- Deine **Notizen**.

**Nicht schicken:** `secrets.json`, `settings.json`, Screenshots der API-Einstellungen, die SillyTavern-Konsole.

**Auswertung danach:** je Nachricht A's Lesung (`plan.a0`) gegen den Plan gegen das Gemeinte. Eine neue Schicht kommt nur, wenn ein konkreter Fehler sie verlangt.

## 10. Bekannte Grenzen

- **Semantik ungemessen:** Die Tests scripten die Antworten des Planners. Wie oft das echte Modell richtig plant, zeigt erst die Sitzung. Der Holdout aus Rev. 3 (N = 120, frischer, isolierter Autor) ist nicht gelaufen.
- **Sicherheitsnetz:** Es fängt genannte Skills, Tippfehler, Magie-Wörter und die Klassenverben. Eine freie Umschreibung ohne diese Merkmale („I hurl fire at it“) wird bei `skill: null` eine Basic Attack. Das bleibt die Aufgabe des Planners (Regel 2) und ein Fall für den Holdout.
- **Falsch-positive Rückfragen** sind möglich, wenn ein Alltagswort einem Skill-Wort ähnelt („burst“, „frame“). Das Netz fragt dann lieber nach.
- **Latenz:** ein zusätzlicher Aufruf je Kampfzug; in Story-Zügen ersetzt der Planner den Interpreter.
- **Andere Quellen als Custom:** `generateRaw` mit der Temperatur des Presets; nicht gemessen.
- **Außerhalb eines Kampfes** löst der Prototyp eine Art Handlung pro Nachricht (§5). Eine freie Tat neben Story-Befehlen erzählt der Erzähler wie in A oder lässt sie aus; `plan.free` zeigt solche Stellen.
- **Reihenfolge:** Schritt und Angriff nimmt A's Engine in ihrer Reihenfolge (E11 offen).

---

## 11. 4.3.0-c.2: Korrekturen nach dem Live-Test vom 03.10.2026

Grundlage ist der Live-Lauf vom 03.10.2026 auf 4.3.0-c.1 (Planner an, GLM-5.3-Flash). Spielersätze und rohe Planner-Antworten stehen wörtlich in `tests/v4/live_1003.json`, die Tests in `tests/v4/planner_c2.test.js`.

**Grundsatz:** Alle Engine-Regeln dieses Abschnitts gelten nur auf dem Planner-Pfad. `plannedTurn` übergibt `c: true` an `playerTurnV4`; das Outcome trägt `auth.c`. Mit Schalter aus bleibt A byte-gleich (`tools/c_flag_off_diff.mjs`: 122/122 Schritte, 18/18 Eingaben, gegen `90bd450` und gegen `8c01212`). Einzige Ausnahme ist `#assign` (D), ein deterministischer `#`-Befehl außerhalb des Planners.

### A. Vertragsabbruch und Contract Slip

Befund im Log:
- **#22** „ill decline the quest myself …“ (Eastgate Yard): Die Rohantwort war `quest.abandon`, Begründung des Modells „Decline quest. quest.abandon.“. Die Quest war sofort `abandoned`. Die Interpreter-Regel „Commitments … only … now“ griff nicht. A's Agency-Guard erkennt einen Plan nur mit Zeitanker („tomorrow“, „later“).
- **#24** „turn the slip back in“: Die Rohantwort war `quest.turn_in` mit `quest: "obj.slip.wolves_on_the_salt_road"`. Die Reparatur machte daraus `{"id": …}`, beides schemawidrig, der Zug scheiterte.

Korrekturen:
- **Planner-Prompt** (`CONTRACT_RULES`, nur der Planner, nicht A's Interpreter):
  - Quest und Slip sind verschiedene Dinge.
  - `quest.turn_in` gilt nur für einen erledigten Vertrag.
  - Den Slip eines nicht erledigten Vertrags zurückgeben ist `quest.abandon` mit der Quest-ID.
  - Angekündigter Abbruch ist kein Befehl.
  - Der Slip eines nicht mehr aktiven Vertrags geht per `give`.
  - Dazu drei Beispiele aus einer anderen Stadt.
- **Deterministische zweite Linie** (`announcedAbandon`): Ein `quest.abandon`, dessen Wortlaut ihn nur ankündigt („I'll / ill / I will / going to … decline, cancel, give up, hand back, return“), wird verworfen. Es steht als `NOT A DECISION (quest.abandon: plan)` sichtbar im Record. „I abandon the quest / I give up this contract / I cancel this job“ bleiben.
- **Validator:** Steht in einem Quest-Argument eine Slip-ID, bekommt die eine Reparatur die Zeile „obj.slip.X is the contract slip (an object), not the contract; the contract is quest.X“. Es wird nichts ersetzt; fail-closed bleibt.
- **Engine** (`abandonGuild`, `abandonContract`):
  - Abbruch eines Gildenvertrags an der Gildenhalle: Der Slip geht an die Gilde (`object.consumed by guild`).
  - Mit einem `go` zur Halle davor wird der Abbruch bedingt und erst bei Ankunft gebucht (wie `quest.turn_in`).
  - Sonst sofort; der Slip bleibt dann bei ihm.
  - Nie Auszahlung, Quest-XP oder `completed`. Ein Turn-in eines aufgegebenen Vertrags lehnt die Engine weiter ab.

### B. Zeit

Befund: Zeit entstand nur aus der Erzählung (Extraktor, gedeckelt). **#16/#17**, der Fußweg zum Eastgate Yard: Ortswechsel gebucht, 0 Minuten.

| Fall | Regel (Planner-Pfad) |
|---|---|
| genannte Dauer („wait two hours“, „rest 30 minutes“, „sleep 8 hours“, jede Aktivität mit Minuten außer Suchen, dessen Prüfung unverändert bleibt) | genau diese Minuten, von der Engine mit dem Zug gebucht |
| genanntes Ende („until morning“, „until night“) | bis zur nächsten dokumentierten Tageszeit, über Mitternacht (`rules.time.until`, morning = 08:00, die bestehende Regel) |
| bloßes `rest` / `sleep` (weder Dauer noch Ende; seit 4.3.0-c.3) | eine Rückfrage (CLARIFY: „How long does he want to rest/sleep?“): keine Zeit, keine Erholung, kein Erzählerzug; ein Swipe oder Regenerate der Rückfrage bucht nichts. Bis c.2 galten feste 60 / 480 min |
| Warten, Suchen u. a. ohne Dauer | wie A: die Erzählung entscheidet, gedeckelt |
| erfolgreicher `go` an einen anderen Ort | die Minuten der Erzählung; reichen sie nicht, eine Untergrenze: 15 min in derselben Siedlung, 60 min anderswo |
| Doppelbuchung | Die Zeitangaben des Extraktors decken zuerst die schon gebuchten Minuten. Nur was darüber hinausgeht, zählt (z. B. Rast 30 + Weg 15) |
| Swipe / Regenerate | Gebuchte Zeit steht im Record der Spielernachricht und wird wiederverwendet |

Werte stehen zentral in `rules.time.engine_clock`. Sie sind vorläufig, noch kein Balancing.

### C. Natürliche Regeneration

- REST und SLEEP: Die Engine bucht mit dem Zug `resource.changed` für HP, MP und STA, nach einer Formel für beide: je Stunde ein Anteil des Maximums (`rules.recovery.per_hour_pct`: HP 10 %, MP 15 %, STA 25 %, vorläufig).
- Abgerundet, nie über das Maximum. 0 Minuten bedeuten 0 Erholung, volle Werte bleiben unverändert.
- WAIT und Reisen erholen nicht.
- Ein `recover`-Delta des Extraktors für Alaric wird danach abgelehnt (`engine_recovery`); MP kam dort nie hinzu.
- Erzähler und Spieler sehen die Werte: PLAYER ACTIONS, System-Zeilen `TIME —` und `RECOVERY —`.
- Ein Swipe wendet nichts erneut an.

### D. `#assign` mit mehreren Stats

- `#assign INT 3` wie bisher; `#assign INT 3 WIL 1 AGI 1` vergibt genau 5 Punkte, in dieser Reihenfolge, als einzelne `stat.assigned`-Events. Auch `INT +3` und Kommas gehen.
- Erst wird der ganze Befehl geprüft: gültige Stats, positive ganze Zahlen, vollständige Paare, Summe ≤ freie Punkte.
- **Ein Stat zweimal wird abgelehnt** (nicht zusammengerechnet).
- Ist irgendein Teil falsch, wird nichts angewendet: `NOT APPLIED — <Grund>. Nothing was assigned.`
- Das gilt bei beiden Schalterstellungen. Bisher wurden gültige Paare einzeln angewendet und ungültige übersprungen; der Test in `tests/unit/context.test.js`, der genau das festhielt, ist auf die neue Regel umgestellt.

### E. Wortwahl des Erzählers

Im Stil-Prompt des Presets „Avereth Narrator V4“ (Abschnitt Prose) steht eine Zeile mehr: vertraute, moderne englische Wörter für gewöhnliche mittelalterliche Dinge; kein seltenes Fachvokabular nur für Atmosphäre; ein nützlicher Zeitbegriff wird beim ersten Mal aus dem Kontext verständlich; moderne Wortwahl ja, moderne Technik nein. Der Erzählervertrag ist unverändert (Revision 4.2.0). **Das Preset muss neu importiert werden.**

### Grenzen von c.2

- Ob GLM die neuen Prompt-Regeln befolgt, zeigt erst der Live-Retest. Für den angekündigten Abbruch gibt es die deterministische zweite Linie; die Unterscheidung „Slip zurück“ = `quest.abandon` liegt beim Planner.
- Eine Rast wird mit dem Zug vollständig gebucht. Eine Unterbrechung durch die Geschichte verkürzt sie nicht (die Engine hat sie aufgelöst).
- Ohne Schalter gelten Zeit- und Erholungsregeln nicht (A unverändert).


---

## 12. 4.3.0-c.4: Temperament als Tendenz, nicht als Gesetz

Grundlage ist der Live-Lauf vom 03.10.2026, 23:43, auf 4.3.0-c.3 (Planner an). Die Fixture `tests/v4/live_1003b.json` enthält:
- die Nachrichten 0–42 als aufgezeichnete Events;
- Spielernachricht 43 mit ihrer rohen Planner-Antwort;
- Antwort 44 mit ihrer rohen Extraktor-Antwort.

Die Tests stehen in `tests/v4/planner_c4.test.js`.

**Befund:** Der Erzähler etablierte den Quarry Strider Mate als in die Enge getrieben und angreifend („Cornered now…“, „claws first, straight across the open floor at him“). Der Extraktor meldete `hostile` und `intent: attack`. Der World Applier lehnte beides ab: „skittish: it flees from threats and fights only when cornered“. Die nächste Antwort musste den Angriff zurücknehmen.

**Ursache im Code:**
- `opensViolence` (`src/policy.js`) behandelt das Temperament eines Tiers als Gesetz. skittish darf nur auf ENGAGED und unverletzt kämpfen (`cornered_only`), defensive nur auf ENGAGED (`reach_only`).
- `mayOpenFight` (`src/v4/envelope.js`) fragt diese Funktion, und der World Applier (`envelopeAllows` in `src/v4/world.js`) lehnt danach `hostile` und `intent: attack` ab. Der Mate stand auf MEDIUM.
- `npcDecide` (`src/combat.js`) lässt ein skittish Tier ohne Intent immer fliehen, außer auf ENGAGED und unverletzt. Einmal getroffen, flieht es den Rest des Kampfes, auch auf Armlänge.
- Rückt Alaric nur nach, entsteht eine Schleife: Das Tier flieht von MEDIUM auf LONG, er rückt auf MEDIUM nach, und so weiter, ohne Ende.

**Lösung, nur auf dem Planner-Pfad:**

| Stelle | Änderung |
|---|---|
| `mayOpenFight` | Ein Tier, das nur sein Temperament abhält, darf sich gegen Alaric wenden, wenn die Geschichte es so etabliert (`tendency: true`). Menschen behalten `provoked_only`. Einen toten oder abwesenden Angreifer lehnt weiter die Weltregel ab (`combat.by`). Schaden kommt weiter nur aus der Engine. |
| WORLD ENVELOPE | Für dieselben Tiere steht eine Tendenz statt einer Grenze: „Skittish by nature, a tendency and not a law: they flee from threats and fight when cornered or given cause“. defensive entsprechend. Die Zeile für Menschen bleibt unverändert. |
| `openCommitted` | Jeder Angreifer, den eine Antwort festlegt, greift in seinem Zug an, denn seine Feindseligkeit ist der etablierte Intent. A gibt nur dem ersten `attack`. Ein anderer gemeldeter Intent geht vor. |
| `npcDecide`, skittish ohne Intent | Auf ENGAGED wehrt es sich, verletzt oder nicht. Bedroht sucht es Abstand und entkommt von LONG aus. Bedroht heißt: seit seinem letzten Zug angegriffen, oder Alaric hat den Kampf eröffnet, bevor es handelte. Sonst hält es, wachsam. Ein Verfolger, der nur nachrückt, steht so am Ende auf Armlänge. Ein etablierter Intent geht wie bisher vor. defensive, cautious und aggressive bleiben unverändert. |
| Durchleitung | `plannedTurn` übergibt `c: true` auch an Züge über V3 (`playerTurn`), deren Outcome dann `c` trägt. Der World Applier liest `auth.c` oder `outcome.c`. Kämpfe erhalten `ctx.c`. |

**Der Live-Fall nach dem Patch:**
1. Antwort 44: `hostile` und `intent: attack` werden angenommen.
2. Der Kampf öffnet mit der Antwort.
3. Initiative: Mate 15, Alaric 7.
4. Der Zug des Mate: SHORT → ENGAGED, Talons/Beak, 4 Schaden durch die Engine. Die Prosa allein kostet keinen HP-Punkt.
5. Tritt Alaric im nächsten Zug zurück, hält der Mate wachsam. In A würde er fliehen.

**Kein neuer LLM-Aufruf.** Planner, Erzähler und Extraktor sind unverändert, ebenso Vertrag und Preset. Ein Neuimport ist nicht nötig.

**A unverändert:** Mit Schalter aus gilt alles wie vorher.
- `tools/c_flag_off_diff.mjs`: 122/122 Schritte und 18/18 Eingaben, gegen `90bd450` und gegen `999167b`.
- `tests/v4/gen35_envelope.test.js` ist unverändert grün.

### Grenzen von c.4

- Ob eine Ursache plausibel ist, prüft die Engine nicht. Das bleibt beim Erzähler, der die Tendenz sieht. Eine Regel-Engine oder einen Kausalgraphen gibt es bewusst nicht.
- Ein `intent: attack` ohne `hostile` wird für ein Tier gespeichert, wie in A für aggressive Tiere. Einen Kampf eröffnet er nicht.
- Ein Patt ist möglich: Hält Alaric, hält auch ein unbedrohtes skittish Tier, wie ein defensives in Deckung.
- Der Vertrag (Revision 4.2.0) spricht von Tieren, die „nur in die Enge getrieben“ kämpfen. Auf dem Planner-Pfad sagt die Zeile im Engine-Block selbst, dass es eine Tendenz ist.
- Menschen sind unverändert.

---

## 13. 4.3.0-c.5: Handlungen, die aufeinander aufbauen

Grundlage ist der Live-Lauf vom 04.10.2026, 01:48, auf 4.3.0-c.4 (Planner an). Die Fixture `tests/v4/live_1004.json` enthält:
- die Nachrichten 0–38 als aufgezeichnete Events (Alaric rastet am Wegrand vor Alderwatch, Tag 1, 14:59);
- Spielernachricht 39 in ihren zwei Fassungen aus dem API-Dump, je mit roher Planner-, Erzähler- und Extraktor-Antwort.

Die Tests stehen in `tests/v4/planner_c5.test.js`.

**Befund:**
- „*i next go back to the guild and look at the quest board again*“: Der Planner plante richtig `go` (Gildenhalle), dann `board.read`. Die Engine lehnte das Lesen ab: „CANNOT READ — the Guild board is in the Guild hall.“ Der Erzähler machte daraus, dass Alaric nicht lesen kann; „unreadable to Alaric“ wurde gespeichert.
- „*i next go back to the guild and take the Cull the Bog Striders quest and register it ad make my way over to the eel weirs*“: Der Planner schrieb `quest.accept {"new": "Cull the Bog Striders"}`. Die Engine fand dazu keinen Vertrag („no such contract“). Der Gang zu den Eel Weirs lief trotzdem.
- In derselben Antwort sagte die Schreiberin, einen solchen Vertrag gebe es nicht. Der Erzähler zeigte zwei neue offizielle Listings ohne BOARD-Block der Engine (Rat Cull, Meadowfever Herb). Der Extraktor meldete sie als Fakten („Novice board lists …“), und sie wurden gespeichert.

**Ursache im Code:**
1. **Identität fehlt außerhalb der Halle.** `buildCatalog` zeigt Board-Listings nur in der Halle (`BOARD`). Den Vertrag, den Alaric am Morgen gelesen hatte (`listed`), konnte der Planner am Wegrand nur als `{new}` mit den Worten des Spielers nennen. `pickQuest` löst `{new}` bewusst nur über den exakten Titel auf, und der lautet „Cull the Bog Striders at the Reed Flats Eel-Weirs“.
2. **Ort gegen den Startzustand geprüft.** `board.read`, `quest.accept` und `guild.register` prüften die Halle am Ort zu Beginn der Nachricht. Ein früherer GO derselben Nachricht zählte nicht. Den Mechanismus dafür gibt es seit c.2 für `quest.turn_in` und `quest.abandon`: ein Conditional `arrive_guild_hall`, das der World Applier bei der Ankunft bucht. `boardFor` erzeugte das Board für die Halle des GO sogar schon. Die drei Handler nutzten beides nicht.
3. **Keine Abhängigkeit im IR.** Ein Plan konnte nicht sagen, dass Schritt 3 auf Schritt 2 aufbaut. `resolveCommands` führte jeden Schritt für sich aus.
4. **Wortlaut.** „CANNOT READ“ klingt nach Analphabetismus statt nach „hier hängt kein Board“.
5. **Board-Autorität ohne Rückfallnetz.** Die Extraktor-Regel `overreach guild_listing` gab es. Gemeldet wurden die Listings aber als Fakten, und die Firewall hatte für einen Board-Aushang als Fakt keinen Guard. `quest.offer` mit einem Board als Geber lehnte sie nur in der Halle ab.

**Lösung, nur auf dem Planner-Pfad:**

| Stelle | Änderung |
|---|---|
| Katalog (`buildCatalog`, `catalogText`, `catalogIds`) | Neue Zeile **KNOWN CONTRACTS**: Gildenverträge, die auf dem Board einer anderen Halle noch aushängen, mit id und dem Ort, an dem sie angenommen werden. Planner und Extraktor sehen sie auf C. Wissen ist nicht Verfügbarkeit: ob und wo er einen annehmen kann, entscheidet die Engine. Auf A bleibt der Katalog unverändert. |
| `board.read`, `quest.accept`, `guild.register` | Führt ein früherer GO der Nachricht zu einer Gildenhalle (`hallAhead`, dieselbe Regel wie bei Abgabe und Aufgabe), wartet der Schritt auf die Ankunft. **board.read:** das Board dieser Halle, im Engine-Block mit „when he reaches the Guild hall“; `board.shown` erst bei der Ankunft. **quest.accept:** nur in der Halle des Boards, zu dem der Vertrag gehört. Bei der Ankunft prüft der Schalter erneut, ob er noch aushängt: dann aktiv mit Slip, sonst NOT ACCEPTED mit Korrektur. **guild.register:** das Gebührenangebot gilt in dieser Halle. Ohne GO zu einer Halle bleibt die Ablehnung. Die Zeile von `board.read` lautet auf C: „NO BOARD HERE — … he sees no listing this turn.“ |
| `quest.accept` | Ein an einem früheren Tag gesehenes Listing wird wie bei einem neuen Lesen des Boards erneut ausgewürfelt (`takenByOthers`). Mit dem ausgelieferten Inhalt (0 % pro Tag) ändert sich nichts. |
| Planner (`ORDER_RULES`, `parsePlan`) | Optional `"needs": <seq>` für einen Schritt, der erst nach einem früheren Schritt derselben Nachricht Sinn ergibt. Beispiele: erst den Vertrag nehmen, dann zum Einsatzort; erst zahlen, dann übersetzen. Ein Schritt, der für sich steht, bekommt kein `needs`: „I drop the broken cup and walk home“. Der Validator nimmt nur die seq eines früheren Schritts derselben Antwort an. |
| `resolveCommands` | Ist der Schritt hinter `needs` nicht geschehen (refused, pending, clarify, vom Guard verworfen), wird der abhängige Schritt nicht ausgeführt: „NOT DONE — …: it was to follow step N, which did not happen.“ Als geschehen gilt auch ein Schritt, dessen Ziel schon erreicht war (`done`): schon hier, schon seiner, schon abgegeben, schon Mitglied, hält es schon. „Schon abgegeben“ zählt bei der Annahme nicht. Ebenso eine Registrierung, die eine Zahlung dazwischen abgeschlossen hat. Schritte ohne `needs` bleiben wie bisher unabhängig. |
| World Applier | Ein Conditional `accept` oder `board` bucht nur die eigene Halle. `listing.gone` für einen Vertrag, den die Engine in dieser Antwort bei der Ankunft annimmt, wird abgelehnt (`engine_booked`), unabhängig von der Reihenfolge der Deltas. Decision Ownership: `arrive` darf `guild.board` über das Gate `conditional` schreiben. |
| Firewall | Ein `fact` „<Gildenboard> lists/posts/offers …“, der keinen bekannten Vertrag nennt, wird als `guild_listing` abgelehnt, mit Korrektur. Ein `quest.offer`, dessen Geber ein Gildenboard ist („the Novice board“), wird auch außerhalb der Halle abgelehnt. |

**Der Live-Fall nach dem Patch:**
1. Board lesen: GO (authorized), dann „READS the Novice board, when he reaches the Guild hall — BOARD“ mit den vier echten Listings. Erreicht die Antwort die Halle, folgt `board.shown`, und die Listings sind in dieser Antwort geschützt (`board_first_display`). Erreicht sie sie nicht, hat er nichts gesehen (`cmd.expired`).
2. Vertrag nehmen: Der Planner findet `quest.cull_the_bog_striders_at_the_reed_flats_eel_weirs` unter KNOWN CONTRACTS. Der Plan lautet: GO, `quest.accept` (id), GO zu den Eel Weirs mit `needs: 2`. Die Antwort bringt ihn in die Halle, dann wird der Vertrag aktiv, dann folgt der Slip, dann die Eel Weirs, in dieser Reihenfolge.
3. Ist der Vertrag inzwischen weg, wird die Annahme abgelehnt, Schritt 3 ist NOT DONE, und eine Behauptung, er gehöre ihm, wird abgelehnt.
4. Die zwei erfundenen Listings der Live-Antwort werden abgelehnt (`guild_listing`) und nicht gespeichert.

**Was sich an Prompts ändert:**
- Das Planner-System bekommt `ORDER_RULES`.
- Planner- und Extraktor-Katalog bekommen auf C die Zeile KNOWN CONTRACTS.
- Die Engine-Zeilen auf C sind neu: gestaffelte Zeilen, NO BOARD HERE, NOT DONE.
- Erzählervertrag und Preset bleiben unverändert. Ein Neuimport ist nicht nötig.

**Kein neuer LLM-Aufruf, kein neues State-Feld.** Neu sind die Conditional-Arten `accept` und `board` in `outcome.conditionals` und `needs` an den aufgezeichneten Befehlen.

**A unverändert:** `tools/c_flag_off_diff.mjs`: 122/122 Schritte und 18/18 Eingaben, gegen `90bd450` und gegen `49dab09`.

### Grenzen von c.5

- **`needs` kommt vom Planner.**
  - Lässt er es weg, läuft ein abhängiger Schritt wie in c.4.
  - Setzt er es an einen unabhängigen Schritt, unterbleibt dieser, wenn der frühere scheitert (fail-closed).
  - Wie zuverlässig das echte Modell es setzt, zeigt erst der Live-Retest.
- **Annahme bei Ankunft und Weitergehen:** Der abhängige GO wird freigegeben, sobald die Annahme gestaffelt ist. Erreicht die Antwort die Halle nie, verfällt die Annahme. Eine erzählte Weiterreise nimmt die Engine aber nicht zurück. Im Engine-Block steht: „If the reply does not reach the hall, nothing is accepted.“
- **Dieselbe Ursache, nicht gestaffelt:** `guild.promote` und das Zahlen der Registrierungsgebühr verlangen weiter, dass er in der Halle steht (fail-closed wie bisher).
- **Abgabe, Nachricht 35/36 desselben Laufs:** Das ist eine andere Ursache. Die Staffelung griff. Das Conditional wurde aber beim Ankunftsschritt geprüft, vor dem `quest.ready` derselben Antwort, und scheiterte deshalb. Das ist nicht Teil von c.5. Vorschlag: Abgabe-Conditionals nach den Deltas der Antwort prüfen.
- **KNOWN CONTRACTS** führt alle noch aushängenden Listings anderer Boards. Pro Listing gibt es keinen „gesehen“-Eintrag (`board.shown` ist reines Audit). Ein gestaffeltes Lesen, dessen Antwort die Halle nie erreicht, bucht die Listings trotzdem, denn das Board hängt dort ohnehin. Deshalb heißt die Zeile „listed on a Guild board elsewhere“, nicht „read“.
- **Listings bleiben ausgehängt,** bis andere sie nehmen (Inhalt: 0 % pro Tag) oder `listing.gone` sie entfernt. Das Weltmodell ist unverändert. Die Annahme prüft wie ein erneutes Lesen.
- **Der Firewall-Guard ist lexikalisch:** Board plus ein Gilden-, Rang-, Quest- oder Contract-Wort plus ein Aushang-Verb.
  - Ein nicht-gildisches „quest board“ würde auf C abgelehnt; der Inhalt kennt keins.
  - Anders formulierte Aushänge kommen durch.
  - Das ist ein Rückfallnetz. Der eigentliche Schutz ist der BOARD-Block der Engine.

---

## 14. 4.3.0-c.6: Folgen statt Lästigkeit

Grundlage ist der Live-Lauf vom 04.10.2026, 16:35, auf 4.3.0-c.5 (Planner an), dazu die Designpunkte des Nutzers. Die Fixture `tests/v4/live_1004b.json` enthält:
- die Nachrichten 0–30 mit Text und Events;
- die rohen Planner- und Extraktor-Antworten der Züge 5/6, 13, 17, 23/24, 28 und 29/30.

Die Tests stehen in `tests/v4/planner_c6.test.js`. Alles gilt nur auf dem Planner-Pfad; mit Schalter aus ist A unverändert.

| # | Befund im Lauf / Wunsch | Ursache im Code | Änderung (nur C) |
|---|---|---|---|
| 1 | Das Board soll Alarics Ausschnitt des Tages sein: fünf Angebote, am selben Tag dieselben, am nächsten neue. | Plan §6.4: An einem neuen Tag bleiben alte Listings stehen, nur Lücken werden gefüllt (`boardNeed`, `boardFor`). `takenByOthers` würfelt sie weg (Inhalt: 0 %). | `boardFor` verlangt an einem neuen Tag fünf neue. `board.read` lässt beim ersten Lesen des Tages die nicht genommenen Aushänge ablaufen (`quest.status` → `expired`) und bucht die fünf neuen. Scheitert der Generator, bleibt nichts als „heute" stehen. `takenByOthers` läuft auf C nicht. `quest.accept` lehnt einen Aushang eines früheren Tages ab („no longer on the board: the Guild renews its board every day"). Der Katalog zeigt im BOARD nur den Tag; KNOWN CONTRACTS nennt gestrige Aushänge als „no longer on the board". |
| 2 | Der Trophäen-Beweis widersprach dem Inventar: Die Erzählung gab beide Hauer ab, die Firewall hielt sie bei Alaric (#30). | Der Beweis kam aus Engine-Texten: die ACCEPTS-Zeile („Proof: 2 tusks … brought to a Guild hall"), „verification examples" in Questgedächtnis und Katalog. Die Erzählung machte daraus eine Notiz „Proof is two boar tusks". `contractReady` brauchte die Hauer gar nicht (`story_outcome`). Güter-Aufträge dagegen kamen mit `quest.ready` ganz ohne die Güter durch. | Jagd: Beweis ist der Vertragszettel. Die Engine markiert ihn **READY**, sobald der Vertrag angenommen würde, und **COMPLETED** nach der Auszahlung (`slipMarks`, Engine-Schritt). Trophäen werden weder verlangt noch abgegeben, auch nicht im alten Pfad. Güter (GATHER; GET, wenn der Vertrag das Ding als Objekt-Beweis führt): Sie müssen in seinen Händen sein und gehen an die Gilde. Lieferung (DELIVER): Solange er die Ware trägt, ist sie nicht geliefert. |
| 3 | „use some cloth to stop my bleeding" (#23) und „go to the stone" (#11) gingen verloren. | `mapPlan` legte `other` außerhalb von Kämpfen nur in `plan.free` (Record) ab. | `other` wird ein Schritt in seiner Reihenfolge: `DOES — "…": his own action; tell it as it happens. It books nothing …`. HP, Gegenstände und Münzen bleiben Engine-Sache. Ein `recover` der Erzählung wird weiter abgelehnt. |
| 4 | „follow the directions" wurde `journey.continue` „with Odo Fell" (#17). | `journeyReady` wertete Reisewörter in Questnotizen und offenen Threads aus, wenn jemand Genanntes anwesend war. Die Wegbeschreibung enthielt „road", „ride" … | Auf C zählen nur Verträge, deren Arbeit eine Reise ist (ESCORT, DELIVER; private Arbeit: escort/deliver/guide/accompany), oder eine begonnene Reise (`q.journey`). Threads zählen nicht. |
| 5 | Bei der Abgabe (#30) wurde eine dritte „Guild desk clerk" angelegt. Die zwei Schreiber, die ihn registriert hatten, waren mit `at` = Gildenhalle vermerkt. | Bekannte Personen eines Ortes erreichten weder Erzähler noch Extraktor, wenn er dorthin zurückging („only the story knows …"). | Ein GO zu einem bekannten Ort hängt **KNOWN AT …** mit Personen und ids an die PLAYER ACTIONS; Erzähler und Extraktor sehen sie. Rückfall im World Applier: Eine unbenannte Service-Person (Schreiber, Wirt, Händler …) am Ort wird zur bekannten Person dieser Rolle. Das gilt, wenn es genau eine gibt oder ihre Beschreibung eindeutig passt (live: „spectacles"). Sonst entsteht eine neue. |
| 6 | Kulissen-Personen (Torwache, gepanzerter Mann am Board) wurden Entitäten mit Fakten und Erinnerungen. | Jedes `person.new` wird gespeichert. | Eine unbenannte Person ohne Service-Rolle, auf die sich kein anderes Delta der Antwort bezieht, wird nicht gespeichert (`ambient`, im Audit). Name, ein Bezug oder eine Service-Rolle machen sie dauerhaft. |
| 7 | „Boar den chamber" (interior) wurde in der Root-Hollow abgelehnt (#24). | `PLACE_PARENTS.interior` erlaubt keine `wilderness`. | Auf C darf ein Inneres (Höhle, Bau, Kammer) in der Wildnis liegen. |

**Prompts und Texte:**
- **Neue Engine-Zeilen:** DOES, KNOWN AT, die Ablauf-Ablehnung, die Beweis- und Übergabesätze.
- **Questgedächtnis (Erzähler):** „proof: the contract slip …" bzw. „goods to hand over …" statt „verification examples".
- **Katalog (Planner/Extraktor):** dieselben Proof-Texte; KNOWN CONTRACTS mit abgelaufenen Aushängen; JOURNEY READY nur noch bei strukturierter Reise.
- **Board-Generator:** An einem neuen Tag ist „ON THE BOARD ALREADY: nothing", „WRITE: 5".
- **Unverändert:** Vertrag, Preset und Planner-Systemprompt.

**Kein neuer LLM-Aufruf. Kein neues State-Feld, keine Migration.** Neu sind nur Werte in bestehenden Strukturen: der Quest-Status `expired`, Engine-Marken auf Vertragszetteln und die Ablehnungsregel `ambient`. Alte Chats laufen weiter: gestrige Aushänge laufen beim nächsten Lesen ab.

**A unverändert:** `tools/c_flag_off_diff.mjs`: 122/122 Schritte und 18/18 Eingaben, gegen `90bd450` und gegen `227d90d`.

### Grenzen von c.6

- **Deadlines:** `schedule.deadline` wird weiter nicht durchgesetzt. Aktive Verträge bleiben aktiv, ob mit oder ohne Deadline.
- **Slip-Marken sind Anhängsel:** Wird ein Güter-Vertrag wieder unfertig (Ware weg), bleibt die READY-Marke stehen. Entscheidend ist die Prüfung am Schalter.
- **Güter-Abgleich:** Er läuft über das Kopfwort des Ziels („venom sacs" → sac). Der Vertragszettel selbst zählt nie mit. Schwache Ein-Wort-Köpfe können fremde Gegenstände treffen.
- **Hydration:**
  - Die Hydration nennt die bekannten Personen, setzt sie aber nicht in die Szene. Das tut die Geschichte. Der Rückfall greift nur bei eindeutigem Treffer.
  - Ein wirklich neuer Schreiber ohne Namen kann bei genau einem bekannten Schreiber derselben Rolle mit ihm verschmelzen. Ein Name verhindert das.
- **Kulissen-Regel:** Sie hängt am Bezug innerhalb derselben Antwort. Spricht Alaric die Wache erst im nächsten Zug an, entsteht sie dann neu.
- **Leichen- und Identitäts-Dubletten** anderer Art sind nicht Teil von c.6.

### Nachtrag 4.3.0-c.6.1: zwei Reviewpunkte

Beide Punkte sind am Code bestätigt. Geändert ist nur C; A ist unverändert. Die Tests stehen in `tests/v4/planner_c6.test.js` (R1–R3).

1. **Ein Board-Tag wird nur vollständig gebucht.**
   - *Befund:* `generateBoard` nahm jede positive Zahl gültiger Listings an; `parseBoard` schneidet nur nach oben ab. `board.read` rotierte damit. Beispiel: 5 verlangt, 2 hart abgelehnt. Die 5 alten Aushänge liefen ab, 3 neue wurden gebucht, ohne Repair.
   - *Jetzt:* Auf C gilt eine Antwort nur mit genau `need.missing` gültigen Listings. Sonst folgt der bestehende zweite Versuch mit Begründung: „3 valid listings of the 5 asked for; refused: "…" (…); write all 5“.
   - Scheitert auch der, ist die Generierung gescheitert (`board.failed`): nichts gebucht, nichts abgelaufen. Das Board bleibt beim alten Tag, und das nächste Lesen versucht es neu. Das gilt auch für das allererste Board.
   - A bucht weiter, was gültig ist.
2. **Der Generator verlangt bei Jagden keine Körperteile mehr.**
   - *Befund:* `boardRequest` verlangte noch „a species-appropriate body part of each kill … as its one proof entry“. Das widerspricht c.6: Der Vertragszettel zeigt READY, Trophäen sind Beute.
   - *Jetzt:* Auf C ersetzt eine eigene Regel diese Zeile:
     - Eine reine Jagd, Keulung oder Räumung ist durch ihr Ergebnis in der Welt erfüllt. Der magische Vertragszettel zeigt sie READY, `proof` ist `[]`.
     - Körperteile sind Beute.
     - Gemischte Arbeit behält einen Beweis nur für ihre anderen Teile.
     - Ernte-, Bergungs- und Lieferarbeit behält ihre Dinge als Objectives (GATHER, GET, DELIVER).
   - Im Strukturbeispiel mit dem Viehhalter entfällt auf C „with proof appropriate to“.
   - Sonst ist der Prompt gleich; ein Test prüft, dass sich genau diese zwei Zeilen unterscheiden. Der A-Prompt ist byte-gleich.

Es gibt keinen neuen LLM-Aufruf (der Repair ist der bestehende zweite Versuch), kein neues State-Feld und keine Migration.

**Grenzen:**
- Der Prompt steuert, die Engine erzwingt `proof: []` nicht. Schreibt das Modell trotzdem einen Trophäen-Beweis an eine Jagd, verlangt und nimmt die Engine ihn auf C nicht (c.6).
- Schon gebuchte Listings behalten ihre Beweise.
- Scheitert auch der Repair, zeigt der Tag keine Aushänge. Die gestrigen bleiben gelistet, sind aber nicht annehmbar. So verhält sich c.6 schon bei einem Generatorfehler.

### Nachtrag 4.3.0-c.6.2

- **Kampf:** Ein Schritt innerhalb des Kampfes ist `move` (closer/away, nach Range Bands), das Verlassen bleibt `flee`. Der Kampf-Prompt des Planners bietet kein `go` mehr an. Der Zweck einer Handlung („to draw them around me“) ist kein eigenes `other`. Live war „i walk towards the next beasts as i try to gather them all around me …“ zu `go` + `other` geworden, beides wurde nicht ausgeführt.
- **Erzählervertrag (Revision 4.3.0-c.6.2, Kartenbeschreibung ersetzen):** Die Regel „hunt/cull is proven by trophies“ ist entfernt. Neu:
  - Nachweis ist, was der Engine-Block nennt.
  - Die anerkannten Niederlassungen der Gilde geben standardisierte, schwach verzauberte Contract Slips aus. Ein Slip zeigt nur den festgestellten Status (ACTIVE, READY, COMPLETED), überwacht nichts und zahlt nichts aus.
  - Körperteile sind Beute oder echte Questgegenstände, wenn ihr Beschaffen selbst ein Objective ist.
- **Board:** Nur das Lesen, das das Board des Tages aushängt, zeigt die Aushänge als neu. Ein weiteres Lesen am selben Tag zeigt dieselben, ausdrücklich nicht als neu.

### Nachtrag 4.3.0-c.6.3-gpt

Der Live-Lauf vom 05.10.2026 zeigte vier kleine, voneinander getrennte Restfehler. Dieser GPT-Branch behebt sie ohne neuen LLM-Aufruf und ohne Änderung der Kampfmechanik:

- **Agency-Guard / „next time“:** Ein langes Planner-Zitat enthielt erst „let's get together next time“ und danach die ausdrücklich jetzige Handlung „travel back …“. Die alte Planprüfung verband den Future-Marker mit einem früheren `return` und ließ dadurch die wirkliche Reise samt `needs`-Kette ausfallen. Für die Planprüfung muss der Future-Modal nun das letzte Handlungsverb des betreffenden Commands regieren. Echte Pläne wie „Tomorrow I'll walk …“ und „I'll walk … tomorrow“ bleiben Pläne.
- **`quest.ready`:** Der Escort erreichte seinen ausdrücklich genannten Endzustand („We're delivered“; Wagen/Fahrer am Ziel), der Extraktor speicherte aber nur Fakten/Memory. Die semantische Zuständigkeit bleibt beim Extraktor; er bekommt deshalb direkt nach der REPLY einen abschließenden Pflichtcheck gegen jeden aktiven Guild-`desired_end_state`. Ein klar erreichtes Ergebnis muss zusätzlich `quest.ready` ergeben. Kein Regex-Questresolver und kein automatisches READY nur aufgrund eines Ortsnamens wurden eingeführt.
- **NOT DONE bleibt nicht getan:** Der Erzähler darf eine von der Engine als NOT DONE/CANNOT/REFUSED/NOT TAKEN markierte Handlung und deren Ausführungsschritte nicht nachträglich erzählen.
- **PC-Sprache und Ortsidentität:** Der Erzähler schreibt Alaric keine nicht vom Spieler gegebenen gesprochenen Sätze und benennt bereits etablierte Orte nicht für Atmosphäre um. Ein bekannter Ort behält seinen kanonischen Namen.
\n

### Nachtrag 4.3.0-c.6.4-gpt

Der Live-Lauf vom 05.10.2026 trennt Planner-Verständnis und Engine-Auflösung weiter:

- **Targetloses Combat-Move + AoE:** „dash forward in the middle of all of them and then Arcane Burst“ wurde korrekt als `move closer target:null` + Arcane Burst geplant. Das Movement behält nun seine eigene Zielbindung: `target:null` verschiebt die vorhandenen Hostiles relativ zu Alaric um genau ein Range Band, danach trifft die AoE nur Gegner, die tatsächlich ENGAGED sind. Ist nach diesem einen Schritt niemand ENGAGED, bleibt die kombinierte Aktion atomar illegal: keine Bewegung, keine Kosten.
- **Taktische Sichtbarkeit:** Der Extraktor kann eine sichtbare Person mit `person.new relevant:true` als unmittelbar entscheidungsrelevant markieren (z. B. beobachteter Bandit, Gefangener, Gesprächspartner). Solche Personen werden nicht als Ambient-Kulisse verworfen und können vor Combat mit ihrem Range Band im Systemblock erscheinen. Hintergrund-Passanten bleiben filterbar.
- **Target-Handles:** Eine einzelne anonyme NPC-Rolle heißt z. B. `Bandit Leader`, nicht `Bandit Leader A`. Erst echte Dubletten derselben Rolle bekommen `A/B/…`. Die bestehende Creature-Konvention (`Wolf A`, `Rat A/B`) bleibt unverändert.
- **Tagesboard:** Auf C kann `listing.gone: taken_by_other` kein verbliebenes Angebot von Alarics aktuellem Tagesboard mehr verbrauchen. Rücknahme/Ablauf oder Alarics eigene Annahme bleiben getrennte Zustandsänderungen.
- **Narrator-Grenzen:** Ein illegaler Combat-Zug darf auch seine mitgebuchte Bewegung nicht teilweise in der Prosa ausspielen. Erfundenes PC-Sprechen umfasst nun auch indirekte Scheinantworten wie „whatever he answered“.
- **Combat UI:** Die gespeicherten Engine-Panels bleiben dieselbe Wahrheit, werden in SillyTavern aber als eine eigene, offene System-Karte (`<div class="avereth-system-panel">`, eine Zeile je Eintrag) über der Erzählung dargestellt. (Korrektur c.6.6: Test und CSS erwarteten hier einen einklappbaren „AVERETH ENGINE · COMBAT LOG“-Block, den der Code nie erzeugt hat; der Live-Build vom 07.10.2026 zeigte die Karte. Test und CSS folgen jetzt dem Build.) Während ACTIVE Combat ersetzt ein offenes taktisches HUD die redundanten Character-/World-Klappzeilen und zeigt aktive Gegner zeilenweise mit HP, Range und Cover, dazu Turn Order und Alarics Attack-Reichweiten. Bereits sichtbare Personen, die noch nicht im Encounter/der Initiative sind, bleiben in einem getrennten „Visible · not in the fight yet“-Abschnitt mit Range/Cover sichtbar; das ist reine Anzeige und macht sie nicht automatisch zu Gegnern.

Bekannte Grenze bleibt **GO → STEALTH in derselben Nachricht**, wenn erst die GO-Narration die späteren Beobachter konkret etabliert. Der Live-Workaround mit zwei Nachrichten bewies, dass der Stealth-Check am erreichten Ort korrekt gegen den dortigen Beobachter läuft; eine echte Ein-Zug-Lösung würde einen zusätzlichen Narration→Mechanik-Zwischenschritt erfordern und ist nicht Teil dieses kleinen Patches.

### Nachtrag 4.3.0-c.6.5-gpt

Der Live-Lauf vom 06.10.2026 schärft vier Grenzen, ohne den Planner wieder durch Keyword-Semantik zu ersetzen:

- **Wahrnehmung/Ambush:** bloße Co-Präsenz bedeutet nicht mehr automatisch, dass ein NPC Alaric gesehen hat. `perceiveAll` speichert ersten Sichtkontakt nur bei explizitem `aware`; fehlende Awareness heißt beim Kampfbeginn `unknown`, nicht heimlich `aware`. Der Narrator darf ein gewöhnliches GO nicht als Crouch/Sneak/Hide inszenieren.
- **Temperament/Flucht:** Auf C ist `skittish` ein Bias. Ein bedrohtes Wesen kann taktisch genau ein Band zurückweichen (`retreat`) und bleibt im Encounter; bloßes Temperament lässt es auf LONG nicht verschwinden. Ein echtes `flee` braucht expliziten Fluchtwillen oder einen stärkeren Grund.
- **Reise/Return-Memory:** `scene.history` wird deterministisch aus den Bewegungsereignissen gefaltet und dem semantischen Planner als RECENT ROUTE gegeben. Begriffe wie „back“, „return“ und „the city“ sollen damit auf bekannte Ziele auflösen statt einen neuen generischen Ort zu erzeugen. Eine begonnene Journey läuft durch gewöhnliche Wegstrecken und Gespräche bis Ziel oder echter Entscheidung/Komplikation.
- **Quest-Endzustand:** Der Board-Generator muss im `desired_end_state` sämtliche substantiell erforderlichen Ergebnisse enthalten. Objectives dürfen keine zusätzliche Pflicht verstecken, die der Endzustand nicht nennt.
- **Combat-Handles:** Der aktive C-Pfad wird bis in Encounter/Joiner-Labeling getragen; eine eindeutige anonyme Rolle bleibt z. B. `Bandit Leader`, während echte Dubletten `Young Bandit A/B` bleiben.

### Nachtrag 4.3.0-c.6.6

Der Live-Lauf vom 07.10.2026 18:10 (Build c.6.5-gpt-notemp; Orte, Reisen und Wahrnehmung sind dort wie auf -gpt; Fixture `tests/v4/live_1007.json`, Tests `tests/v4/c66.test.js`). Leitlinie: Quality of Life heißt weniger Bedienarbeit ohne Entscheidung, nicht weniger Gefahr.

- **Sehen ≠ Ambush-Awareness (Korrektur von c.6.5):** Wer mit Alaric anwesend ist und nicht als `unaware` etabliert wurde, hat ihn gesehen (NPC-Karte, Erinnerung) wie vor c.6.5. Ambush bleibt an `scene.awareness` gebunden: nur ein etabliertes `unaware` gibt sie, `unknown` nicht. Ein `unaware` derselben Antwort zählt unabhängig von der Reihenfolge ihrer Deltas. c.6.5 hatte beides gekoppelt, so dass Anwesende ihn nicht mehr „kannten“.
- **Agency „später“:** Ein Befehl ist nur dann ein Plan, wenn jede Teilhandlung, die ihn nennt, in ihrer eigenen Klausel Zukunftsanker und Futur-Modal trägt (Klauseln an Satzzeichen und Konjunktionen, ohne eigenes Subjekt gehören sie zur vorigen Handlung). c.6.3 band das an das letzte Verb des Zitats.
- **Orte nach Geografie:** Der Extraktor-Katalog (C) nennt das Reich selbst als Ort („die Straßen und das Land zwischen den Siedlungen“); eine Stätte (Wegstation, Furt) darf darin liegen. Regel: parent ist, wo der Ort liegt, nicht woher Alaric kam. Hat dieselbe Antwort ihn schon aus der Startsiedlung gebracht, liegt ein danach betretener neuer Ort nicht mehr in ihr (Thornwick-Kapelle). Die 120-Minuten-Kappung der Rückreise war allein Folge des falschen Parents; an der Zeitlogik ist nichts geändert.
- **Reisen:** Wer das Paket übergibt, reist nicht mit (Begleiter nur bei ESCORT). Ein READY-Vertrag hat sein Ziel erreicht: seine Journey ist zu Ende, der Rückweg ist ein neues GO; ein überzähliges `journey.continue` neben diesem GO bleibt stumm und blockiert es nicht. Planner: Ziel ≠ Route (Regel 7b). Extraktor: Sehen oder Passieren eines Ortes ist keine Ankunft (Regel und go-Frage). delta-0.19.
- **Vor dem Kampf:** Ein zielloser Flächenangriff vor jedem Kampf öffnet ihn mit dem sichtbaren taktischen Feld (Kreaturen, vom Erzähler als relevant markierte Personen, Angreifer; nie Geräusche oder Spuren, die keine Entitäten sind), bewegt Alaric ein Band und trifft nur, wer danach ENGAGED ist; geht das nicht, beginnt nichts und nichts wird bezahlt. `relevant` bleibt an der Person gespeichert; die ACTIVE-SCENE-Zeilen zeigen nur noch diese Akteure. `aware` auf eine Gruppen-Ref gilt für jedes Mitglied.
- **Flucht und Verfolgung (C):** Alaric flieht: niemand ENGAGED mit ihm → er ist weg; im Nahkampf gebunden → ein Fluchtwurf (Initiative gegen den Schnellsten, der ihn hält, 15–85 %), misslingt er, bleibt er. Die Zurückgelassenen verlassen seine Szene. „Ich jage ihn“ (move closer auf einen Gegner, der in seinem letzten Zug floh): ein Wurf, gefangen (ENGAGED, flieht nicht mehr, wehrt sich) oder entkommen. Ein bloßer Rückzug (`retreat`) wird wie bisher eingeholt. Größeres Verfolgungssystem (mehrere Verfolger, Gelände, Ausdauer) ist bewusst nicht Teil dieses Patches.
- **Anzeige:** Test und CSS folgen der ausgelieferten System-Karte (siehe Korrektur im c.6.4-Nachtrag); das Kampf-HUD bleibt unverändert.

**Stealth vor nicht materialisierten Beobachtern (nur Analyse, kein Fix).** `stealthEvents` (src/checks.js) würfelt im Spielerzug gegen `scene.present`. Bringt erst die Erzählung desselben Zuges die Beobachter hervor (GO + Schleichen in einer Nachricht, oder „ich schleiche zur Lichtung“), ist zum Zeitpunkt des Wurfs niemand da: der Check ist automatisch erfolgreich, `pc` wird `concealed`, und die später materialisierten Beobachter bekommen weder Wurf noch Awareness. Ursache ist die Reihenfolge Engine-vor-Erzählung, nicht eine Regel. Spätere Architektur: ein deklariertes Schleichen bleibt als offene Absicht im Zug stehen; nach dem Extraktor löst `applyWorld` den Vergleich gegen die dann materialisierten Beobachter (gleiche Formel, gleiche Würfel), setzt deren Awareness und gibt das Ergebnis der nächsten Erzählung mit; die laufende Erzählung erzählt das Schleichen ergebnisoffen. Bis dahin: zwei Nachrichten (erst hingehen, dann schleichen) liefern den korrekten Wurf.

### Nachtrag 4.3.0-c.6.6.1 (Livetest 10./11.10.2026)

- **Delivery-Gegenstände:** Offizielle Guild Contract Slips und andere Dokumente wie eine Oil Requisition Slip sind unterschiedliche Objekte, auch wenn der Name generische Wörter teilt. Die Engine prüft DELIVER/GIVE-Readiness anhand tatsächlich gebuchter Übergaben der einzelnen benötigten Questgegenstände, nicht anhand eines abgelehnten Object-Transfers oder einer erzählten Verwechslung. Keine zusätzliche Proof-Bürokratie für Culling.
- **Unterwegs-State:** Wenn eine ausdrücklich gewählte Fernreise nach erheblicher Reisezeit vor dem Ziel an einer wirklichen Entscheidung stoppt, wechselt die aktuelle Szene in die Region/Realm mit einer Unterwegs-Bezeichnung. Ein nur sichtbares entferntes Ziel bleibt weiterhin *keine* Ankunft. Der Reise-Zeitverbrauch bleibt wie bisher.
- **Tactical Scene:** NPC-Relevanz und ausdrücklich etablierte Bedrohung sind getrennte szenenbezogene Zustände (Extractor `person.new.threat`). Ein relevanter neutraler Gefangener wird nicht allein deshalb als feindlicher Combatant eines targetlosen AoE eröffnet. Bekannte Kreaturen bleiben als konkrete mögliche Gegner sichtbar.
- **Escort:** Der mitreisende NPC muss eindeutig im ESCORT-Objective identifiziert sein; ein bloß erwähnter Auftraggeber oder Wegweiser reist nicht automatisch mit.
- **Bewusst offen:** Bereits bekannte Limitierungen in Combat-Gruppenbeteiligung, NPC-Fluchtzustand, Full-Cover-AoE und das Verhindern erfundener Alaric-Rede sind keine vollständigen Änderungen dieses Patches. Die Temperament-Architektur bleibt unverändert.

Build: `4.3.0-c.6.6.1`. Narrator Contract Revision bleibt `4.3.0-c.6.5-gpt`; Character Card, Preset und Lorebook brauchen für diesen technischen Patch keinen Neuimport.

### Nachtrag 4.3.0-c.6.6.2 (nach Review des Livetests 10.10.2026)

- **Delivery: eine Prüfung statt zwei.** Das Quittungs-Gate von c.6.6.1 (`delivery_receipts`, Ablehnung `quest_delivery`) ist zurückgebaut; es konnte einen erzählten Abschluss dauerhaft blockieren (Replay #23: zurück in Tidecross, Auftrag weiter aktiv). Es gilt wieder die seit c.6 vorhandene, bei jedem Lesen neu berechnete Prüfung `contractReady` (src/v4/guild.js): `quest.ready` der Geschichte bleibt stehen; solange Alaric einen Liefergegenstand noch hält, zeigen Slip, Questgedächtnis und Abgabe „NOT READY … he still carries …“. Verlässt der Gegenstand gebucht seine Hand, ist der Auftrag ohne neue Bestätigung bereit. Neu: GIVE eines Gegenstands zählt wie DELIVER (Botschaften/Warnungen hinterlassen nichts in der Hand); mit dem Auftrag verknüpfte Gegenstände (`for_quests`, passendes Kopfwort) entscheiden vorrangig, der Namensvergleich nur ohne Verknüpfung; der Guild Contract Slip zählt nie; gemischte Aufträge prüfen die Lieferung vor den Waren; was für eine Lieferung gesammelt wird, ist keine Ware für die Gilde. Beim akzeptierten `quest.ready` mit offenem Liefergegenstand bekommt der nächste Erzählerzug eine Korrektur.
- **Gebuchte Gegenstände (Firewall `granted`, nur Planner-Pfad):** Gildendokumente bleiben Identitäten (Contract Slip ≠ Oil Requisition Slip); gekaufte Waren gelten als dasselbe Ding, wenn die wesentlichen Namenswörter des einen alle im anderen stehen („skewer of grilled eel“ = „grilled eel skewer“, „oil lamp“ ≠ „oil flask“). Mit Planner aus gilt die Wortprüfung von 4.2.1 unverändert.
- **Übergabe in Geste (Planner-Regel `HANDOVER_RULES`):** Bittet jemand laut RECENT um einen bestimmten Gegenstand und Alaric hält genau diesen hin, ist das `give` dieses Gegenstands. Kein `give` bei Zeigen, Ansehen, „aber ich gebe es nicht her“, bloßer Frage oder einem anderen Gegenstand als dem erbetenen. Der Agency Guard ist unverändert.
- **Unterwegs:** Die Durchreise aus c.6.6.1 nimmt mit, wer mitreist (Begleiter der laufenden Reise, `with` der Extraktor-Antwort), und wählt den kleinsten vorhandenen Ort: Realm-Straße bei bekanntem Ziel außerhalb der Siedlung, laufender Reise oder mehr als zwei Stunden zu einem neuen Ziel; sonst die eigene Siedlung (Gasthaussuche: aus dem Gebäude, nicht aus der Stadt). Keine neuen Wegpunkte.
- **Mindestzeit:** 60 Minuten nur, wenn der Weg eine Siedlungsgrenze überschreitet; lokale Wege, auch in der Wildnis (Wolfsspur #32/#34), 15 Minuten. Erzählte längere Zeit bleibt.
- **Keine Feinde:** `creature.new threat: false` (Packpferd, Vieh, Haustier) hält eine Kreatur aus dem Feld eines Flächenangriffs vor dem Kampf heraus; ohne Angabe bleiben Kreaturen wie bisher mögliche Gegner. Ein gezielter Angriff bleibt möglich.
- **Zurückgestellt:** Rudel/Gruppenbeteiligung im Kampf (live 10.10.: nur Wolf A im Encounter). Eine kleine, eindeutige Lösung ohne neue Gruppenzuordnung ließ sich nicht abgrenzen: dieselbe Art heißt nicht dasselbe Rudel, und die Live-Wölfe kamen aus zwei getrennten `creature.new`.

Tests: `tests/v4/c662.test.js` (inkl. Live-Ausschnitt `tests/v4/live_1010.json`, #13–#23 wie gespielt und korrigiert). Planner aus: gegenüber c.6.6.1 nur das normalisierte Feld `threat: null` im Roh-Record neuer Kreaturen. Build: `4.3.0-c.6.6.2`. Narrator Contract Revision bleibt `4.3.0-c.6.5-gpt`; Character Card, Preset und Lorebook brauchen keinen Neuimport.

### Nachtrag 4.3.0-c.6.6.3 (Livetests 11.10.2026, Glassmere und Ashbridge)

- **Bereitgestellte Gegenstände:** Was jemand für Alaric hinstellt oder ihm zuschiebt und nicht festhält, liegt am Ort (Extraktor-Regel: `holder "here"`); `take` gelingt sofort, eine davon abhängige Reise (`needs`) findet statt. Ein Gegenstand seines aktiven Vertrags, den jemand Anwesendes noch verwahrt (die Kiste der Chirurgin, der Korb des Krämers), ist „take, sofern sie ihn nicht zurückhalten“: Die Geschichte entscheidet, deren Übergabe bucht ihn, und der davon abhängige Schritt geschieht nur, wenn der Take geschieht. Alles andere, was ein NPC hält, bleibt dessen (`CANNOT TAKE`, abhängige Schritte `NOT DONE`, ausdrücklich ohne NPC-Hilfe als Ersatz).
- **Übergabe am Ziel:** „Ich gehe hoch und gebe es ihr selbst“ ist `go` + `give` (needs). Ist der Empfänger noch nicht da, wird die Übergabe bedingt (`GIVES, when he reaches …`) und gebucht, sobald die Geschichte den Gegenstand dort in die Hände des Empfängers gibt (Firewall `handingOver`, Gate `player.give`); sonst behält er ihn. Mitnehmen, Zeigen, eine Übergabe an einem anderen Tag sind kein `give`.
- **READY und Objektzustand:** Ein `quest.ready`, dessen Lieferung nur auf einer im selben Durchlauf abgelehnten Übergabe beruht (Alaric hält den Gegenstand noch), wird nicht gebucht (`quest_delivery`); die tatsächliche Übergabe und ihre Erzählung machen den Auftrag READY, ohne Quittung. Sonst gilt `contractReady` aus c.6.6.2 unverändert; der Hinweis auf noch Getragenes wird jetzt nach allen Übergaben der Antwort gegeben.
- **Ziel bleibt Ziel:** Die Korrekturen sagen ausdrücklich, dass Ziel und Empfänger bleiben und keine neue Adresse erfunden wird (Ursache der „kranken Mutter im Mühlenhaus“ war der Hinweis „he still carries“ nach der abgelehnten Übergabe). Dieselbe Zeile steht im Vertrag.
- **QUEST FRICTION (Vertrag, Revision 4.3.0-c.6.6.3):** Vorrang für Komplikationen mit handelnden Akteuren (Monster, Tiere, Wegelagerer, Diebe, Rivalen, NPCs mit eigenen Zielen, Verfolgung, Schutz), Wetter und Wasser nur sekundär und nicht zweimal in Folge; kein garantierter Kampf; sichere Botengänge dürfen ruhig bleiben. Der Board-Generator nennt bei Eskorte/Lieferung den Grund für die Gildenhand (gemeldete Wegelagerer oder Tiere, wertvolle Fracht, Rivalen), Hochwasser ist nicht der Standard.
- **Klein:** Ein Abschied vom Empfänger („that's my part done“) ist kein `quest.turn_in`; „zurück zur Gilde“ aus einem Dorf ohne Gildenhalle meint die Halle des Vertrags. Die Durchreise wird vor den Deltas der Antwort entschieden: wen er unterwegs trifft, trifft er unterwegs (Erinnerung und Ort), nicht im Laden, den er verlassen hat.

Tests: `tests/v4/c663.test.js`. Planner aus: unverändert gegenüber c.6.6.2. Build: `4.3.0-c.6.6.3`. **Narrator Contract Revision `4.3.0-c.6.6.3`: Kartenbeschreibung neu einsetzen.** Preset und Lorebook unverändert.

### Nachtrag 4.3.0-c.6.6.4 (Livetest 15.10.2026: automatische Beute und Korrekturen)

- **Automatische Beute (nur Planner-Pfad C):** Endet ein Kampf, schreibt die Engine im selben Zug gut, was die getöteten Gegner hinterlassen (`src/v4/loot.js`, aufgerufen in `persistCombat`). Es gibt keinen SEARCH-Check, keinen Zeitverbrauch und keinen Spielerbefehl. Erreichbarkeitsregel: Alaric lebt und ist nicht geflohen. Es zählt nur ein Gegner, der in diesem Kampf tot ist, also nicht geflohen, nicht ergeben und nicht überlebend. Jeder Gegner wird höchstens einmal geplündert (`entity.looted` = Encounter-ID).
- **Determinismus:** Mengen und Zufallsfunde hängen nur vom Hash aus Encounter, Gegner und Material ab. Die Events liegen in der Spielernachricht, auf der der Kampf aufgelöst wird. Reload, Erzähler-Swipe und Regenerate ziehen daher nichts neu.
- **Tiere und Monster:** Materialien nach Anchor bzw. Körperbau (`content/monsters.json` → `loot.anchors`: Fell, Haut, Zähne, Klauen, Hörner, Schuppen, Federn, Chitin, Gift …), benannt nach der eigenen Art des Geschöpfs („F-Rank Grey Wolf Pelt“). Sie geben kein Geld.
  - Rang = Power Rank des Geschöpfs (`profile.rank`) als Feld `rank`, dazu `level`, `material`, `species`, `anchor`.
  - Richtwert `value_cp` = Basiswert × 3^Rangstufe: F ×1, E ×3, D ×9 …
- **Humanoide:**
  - Goblin und Oger (Anchor mit `humanoid`): ein paar Kupfer und grobe Ausrüstung mit fester Wahrscheinlichkeit.
  - Menschen: Waffe und Rüstung von ihrem Blatt (nicht improvisiert oder unbewaffnet), Content-Gegenstände aus ihrem Gepäck und ein Geldbeutel nach Blatt bzw. Vorlage (`purse_cp_by_template`).
  - Ausrüstung kommt ins Gepäck und wird nie angelegt.
- **Stapel:** Gleiches Material derselben Art und desselben Rangs bildet einen Stapel (`obj.loot.<art>.<material>.<rang>`; neues Event `object.added` erhöht ihn). Ein anderer Rang ist ein eigener Stapel. Es gibt weder Gewicht noch Slots.
- **Erzähler und Extraktor:**
  - Der Engine-Block nennt die Beute als LOOT: schon im Gepäck, keine Entscheidung Alarics, kein Häuten oder Durchsuchen zeigen, keine weiteren Funde. Die Zeile „nothing is taken automatically“ und die Situationsregel LOOT entfallen dann.
  - Vertrag: Absatz AUTOMATIC LOOT. Extraktor-Regel: für diese Beute kein `object.new`, `object.move` oder `coin.gift`.
  - Sagt der Spieler danach „ich plündere/häute den Wolf“, antwortet die Engine LOOTED ALREADY bzw. NOTHING MORE, ohne Check.
- **Eskorte:** READY gibt es nur, wenn Alaric mit der eskortierten Partei gereist ist oder der Auftraggeber eine Alternative vereinbart hat (`alternative`).
  - Nachweis der Reise: `quest.journey`, gesetzt bei einer Ankunft mit einem Party-Mitglied, das zum ESCORT-Ziel passt.
  - Sonst wird `quest_escort` abgelehnt, mit der Korrektur „IN PROGRESS“.
  - Ein Kampf ist nicht nötig. Abgeschlossene Aufträge bleiben unberührt.
- **Zweck statt Übergabe:** „I'm here to deliver this crate“ ist eine Absicht, kein `give`. Der Agency-Guard verwirft ein `give`, dessen Zitat nur den Zweck nennt, wenn die Nachricht sonst kein Übergabeverb enthält. „Here is the crate, I hand it to you“ bleibt ein `give`. Die bedingte GO+GIVE-Übergabe aus c.6.6.3 ist unverändert.
- **Gebuchtes Zimmer:** Hat Alaric hier in den letzten 24 Stunden eine Unterkunft gekauft, ist der Weg in einen Raum dieses Hauses kein `no_go` (Raum = Ort mit diesem Haus als Elternort). Jeder andere Ort ohne `go` bleibt `no_go`.
- **Ortskontinuität (Vertrag):** Absatz LOCAL WAYS: Wege innerhalb der Stadt, in der er schon ist, sind keine Rückreise dorthin.
- **Bestehende Kampagnen:** c.6.6.3-Chats laden unverändert. Geprüft am Live-Chat vom 15.10.2026 (`tests/v4/live_1015.json`): gleicher Zustand wie unter c.6.6.3, 0 Fehler, 217 cp, 47 XP, beide Aufträge abgeschlossen. Der alte Kampf gegen das armored_beast wird nicht nachträglich geplündert, denn Beute entsteht nur am Kampfende eines neuen Zugs.

Tests: `tests/v4/c664.test.js` (Fälle 1–17 der Anforderung in 10 Tests). Planner aus: identisch zu c.6.6.3 (122/122 Live-Schritte, 18/18 Kampfeingaben). Build: `4.3.0-c.6.6.4`. **Narrator Contract Revision `4.3.0-c.6.6.4`: Kartenbeschreibung neu einsetzen.** Ein neuer Chat ist dafür nicht nötig. Preset und Lorebook sind unverändert.

**Grenzen von c.6.6.4:**
- Erbeutete Ausrüstung lässt sich noch nicht anlegen: `equip` kennt Werte nur für Content-Vorlagen, die Beute-Ausrüstung trägt ihre Werte in `gear`.
- `value_cp` ist nur ein Richtwert. Händler kaufen danach noch nicht zu festen Preisen.
- Die Erreichbarkeitsregel ist bewusst einfach: Ein Gegner, der in einen Abgrund oder einen Fluss stürzt, wird trotzdem geplündert, wenn er im Kampf tot ist.

### Nachtrag 4.3.0-c.6.6.5 (fortgesetzter Livetest 15./16.10.2026: Handel, Städte, Komfort)

Die Spezifikation zählt Spielerzüge ohne den ersten „Mage“-Zug: Spec-Zug 41 = Nachricht #87/#88 (Alaric betritt den Laden mit Messer und Schere), Spec-Zug 42/43 = #89–#92 (der kaputte Verkauf).

**P0 – Handel:**
- **Vorzeigen ist keine Übergabe.** „*i take out every monster part i carry with me*“ war im Live-Planner vier `give` (die c.6.6.2-Regel „er holt hervor, worum gebeten wurde“ griff, weil die Händlerin sagte „put it on the counter“).
  - Neue Planner-Regel mit Beispielen.
  - Deterministischer Guard in `announcedAbandon`: Ein `give`, das nur zeigt (show, appraisal, „so she can look“), wird verworfen (`plan.dropped`, Regel `shows`). Ebenso eines, das bei einem Händler nur auslegt (take out, lay out, auf den Tresen), außer die Nachricht gibt, verkauft oder tauscht ausdrücklich oder der Gegenstand ist für einen aktiven Auftrag bestimmt.
  - Der Erzähler erhält die Zeile SHOWS: „sie bleiben seine“.
- **Ankaufsgebot (`bid`).** Neues Extractor-Delta `bid {buyer, lines:[{object, qty}], price_cp}` mit Alarics Objekt-IDs und einem Gesamtpreis. Gespeichert wird es als Offer mit `bid: true`. Der Planner-Katalog zeigt es unter BIDS; der World-Applier nimmt nur Dinge an, die Alaric hält.
- **Verkauf.** `offer.accept` auf ein Gebot ist ein Verkauf über den vorhandenen `bookSale`-Pfad (`src/v4/trade.js`, jetzt mit mehreren Stapeln und einem Gesamtpreis). Es gibt keine zweite Buchungslogik.
  - Gebucht werden genau die Objekte und Mengen. Ein Teilstapel wird abgespalten und behält Rang, Art, Herkunft und Wert.
  - Danach wird das Gebot geschlossen.
  - Ein Gebot für nicht mehr gehaltene Ware verfällt ohne Buchung.
  - Ein reines Pauschalgebot wird ganz angenommen, außer der Spieler schränkt ein („only the fangs“).
  - `sell` auf ein bebotenes Objekt nimmt das Gebot an.
- **Nie stillschweigend kaufen.** Ein gewöhnliches Offer, das der Spieler mit „sell“ annimmt, wird nicht bezahlt.
  - Benennen seine Zeilen genau Alarics eigene Dinge, also der Altfall des c.6.6.4-Extractors („mudwyrm parts: 2 skins … the lot“), wird es als Verkauf dieser Dinge gebucht.
  - Sonst fragt das System nach (CLARIFY), ohne etwas zu buchen.
- **Münzen.** Die Münzen, die die Händlerin danach in der Erzählung hinzählt, sind die Verkaufsgutschrift, kein Geschenk (`engine_booked`). Reload, Swipe und Regenerate buchen nichts doppelt.

**P1:**
- **Gildenzettel.** Ein abgeschlossener Gildenauftrag (`quest.status → completed`) legt seinen Zettel bei der Gilde ab (Reducer: `holder {consumed: 'guild'}`, wie beim Abbruch).
  - Annahme, READY, unterwegs oder abgelehnte Abgabe ändern nichts; die Gildenplakette bleibt.
  - Weil der Zustand aus den gespeicherten Events gefaltet wird, verschwinden auch die drei Zettel der vor diesem Build abgeschlossenen Aufträge aus dem effektiven Inventar. Das geschieht idempotent, ohne neues Event und ohne Änderung an Quest, Auszahlung oder XP.
  - Das Systempanel zeigt „ITEM - … → filed at the Guild desk“.
- **Städte** (`src/v4/settlement.js`, Content `rules.settlements`).
  - **Größe:** Die Größe einer Siedlung folgt ihrem Content-`sub` (capital/seat/city → city; vom Erzähler erzeugte Siedlungen gelten als village).
  - **Erzähler:** Im Planner-Pfad bekommt der Erzähler SETTLEMENT LIFE: wie belebt die Straße gerade ist (Tageszeit) und welche Alltagsgewerbe es gibt. Die Menge ist ausdrücklich Kulisse; der Extractor speichert unbenannte Passanten weiterhin nicht.
  - **Kampf in der Menge:** Ein Angriff auf einen Passanten („the fishmonger“) macht diesen zur Person (Vorlage commoner) und zum Ziel. Ein Flächenangriff im Gedränge trifft die nächststehenden Menschen (Stadt am Tag 3, Kleinstadt 2, Dorf 1, nachts 0). In Gebäuden wird niemand erfunden.
- **Geschäftsarten.** Monsterteile-Ankäufer (ab Kleinstadt), Schmied, Kramladen, Apotheke/Alchemist, Arkanbedarf (Stadt), Leder/Schneider, Gasthäuser, Ställe und Marktstände sind Funktionen, keine feste Ladenliste.
  - Ein schon etablierter Laden wird über Ortsname oder Beruf der Person dort zuerst genannt, Martas Laden also als Monsterteile-Ankäufer.
  - Ein Dorf sagt ehrlich, was es nicht hat, und nennt größere Orte.
- **Läden ohne SEARCH.** Eine Suche nach einem gewöhnlichen Laden oder Dienst in einer Siedlung ist kein Wurf mehr: Das Ergebnis heißt FINDS, nennt die Gewerbe und kostet 10 Minuten. Der Spieler wählt selbst, wohin er geht. Geheimes, Verborgenes oder Illegales (Hehler, Schwarzmarkt) bleibt SEARCH.
- **Kampf-XP.** `strengthOf` vergleicht die festen Werte einer Kreatur zusätzlich mit einer Referenzkreatur gleichen Levels und Typs (`rules.xp.strength`).
  - **Formel:** Haltbarkeit (HP, durch DEF/MDEF erhöht) mal ATK, Quadratwurzel, gedeckelt bei 2,5×. Der Wert ist nie kleiner als bisher und wird beim Kampfbeginn festgeschrieben.
  - **Wirkung:** Gewöhnliche Tiere bleiben bei den XP ihres Levels; der starke Panzer-Mudwyrm (84/14/6) gäbe 23 statt 14 XP.
  - **Alte Kämpfe:** Gespeicherte XP (12/12/14) bleiben unverändert.

**P2:**
- **Loot im Kampfende-Block:** Unter COMBAT END steht „LOOT ACQUIRED:“ mit den Mengen dieses Kampfes. Es gibt keine doppelte ITEM-Zeile; ohne Loot erscheint kein Block.
- **Magischer Beutel (Vertrag und LOOT-Zeile):** kein Gewicht, kein Packen, keine Riemen.
- **Angriffsform:** Ein magischer oder Fernkampfangriff Alarics trägt im Engine-Block den Hinweis „Magical / Ranged / Projectile: from where he stands, no step and no melee blow“ (nur Planner-Pfad).
- **SEARCH-Ergebnis im Systempanel:** Probe, Chance, Wurf und Ergebnis werden angezeigt.
- **Erfundener Zoll:** Ein abgelehntes `coerce` mit Münzen erzeugt die Korrektur „was not paid“; der Vertrag erlaubt vollzogene Zahlungen nur, wenn die Engine sie gebucht hat.

**Beobachtungen:**
- **B1, Defekt belegt:** Ein defensives Nahkampf-Tier hielt unter Fernbeschuss endlos in Deckung (84 → 0 HP ohne Reaktion). Jetzt rückt es im Planner-Pfad vor, wenn es in der Deckung erneut getroffen wird, und flieht bei ≤ 25 % HP. Ohne erneuten Treffer bleibt es in Deckung.
- **B2:** Giftorgane (Schlangen-Giftbeutel, Gliederfüßer-Giftdrüse) gibt es nur noch von Kreaturen, deren Art, Beschreibung oder Angriff Gift zeigt (`only_if`).
- **B3:** unverändert, die großzügige Regel ist gewollt.
- **B4:** Grenzen wie bisher.

**Wiederaufnahme des Livetest-Chats:** Der gespeicherte Verlauf #89–#92 enthält den falschen Verkauf und wird beim Laden unverändert repliziert (257 cp, künstliches Paket). Diesen Teil nicht weiterspielen:
1. Chat sichern.
2. In SillyTavern an Nachricht #88 (Erzählerantwort „The door stuck, then gave …“) „Branch“ wählen. Der Branch enthält #0–#88 samt Engine-Records.
3. Im Branch weiterspielen.

Alternativ #89–#92 löschen.

Tests: `tests/v4/c665.test.js` (17 Tests, Fixture `tests/v4/live_1016.json`). Die Mutationsproben sind dokumentiert, alle 16 Fixes sind einzeln geprüft. Planner aus: identisch zu c.6.6.4 (122/122 Live-Schritte, 18/18 Kampfeingaben); geteilte Fixes (Zettel ablegen, XP-Stärke, SEARCH-Anzeige, `bid`) gelten auch dort, berühren den Vergleichskorpus aber nicht. Build: `4.3.0-c.6.6.5`. **Narrator Contract Revision `4.3.0-c.6.6.5`: Kartenbeschreibung neu einsetzen.** Preset und Lorebook sind unverändert.

**Grenzen von c.6.6.5:**
- Erbeutete Ausrüstung lässt sich weiter nicht anlegen. Preise bleiben verhandelt, `value_cp` ist nur ein Richtwert.
- Ob ein Händlerpreis ein `bid` wird, entscheidet der Extractor. Fällt er auf ein falsch gerichtetes `offer` zurück, greift die Zweitsicherung (Verkauf, wenn die Zeilen Alarics Dinge benennen, sonst CLARIFY).
- Die Siedlungsgröße für vom Erzähler erzeugte Orte ist pauschal „village“. Die Belebung ist Erzähler-Kontext, kein simuliertes Bevölkerungsmodell.
- Der Show-Guard erkennt englische Formulierungen.

### Nachtrag 4.3.0-c.6.6.6 (Livetest „Branch #3“, 18.10.2026: Präsenz, Flächenzauber, Questzählung, Münzanzeige)

Grundlage: Chat und Events von Branch #3 (Abzweig von #88, gespielt unter c.6.6.5) und der konsolidierte CMD-Logger (Planner- und Extractor-Antworten #89–#119). Fixture: `tests/v4/live_1018.json`.

**Belegte Ursachen:**
- **Welpen verschwunden (#117/#118).** Der Planner las „walk into the dark looking for the pups“ als `go {new: …}`. Der Extractor legte die Höhle als Unterort der Gasse an, meldete die Ankunft aber mit `with: null`. `arrive()` setzt die Szene immer zurück (`reset_present`), und Kreaturen werden dabei nicht übernommen. Danach zeigte der Planner „PRESENT: nobody besides Alaric“, und #119 endete mit ATTACK — TARGET NEEDED.
- **Arcane Burst traf nur Hund A (#111).** Der Kampf enthielt nur A (Kampfbeginn #106: nur A hatte angegriffen). B, C und D standen laut Szene (`scene.position`, Extractor #110) auf ENGAGED, waren aber keine Combatants. Die Flächenauflösung in `combat.js` kennt nur Combatants.
- **0 von 4 trotz zwei Kills.** Ziel „feral dogs of the pack“ (Einheit „hounds“), Art „feral hound“. `namesKind` vergleicht nur Wortköpfe („pack“ bzw. „hound“), die Einheit wurde nicht gelesen, und „dog“ und „hound“ galten nicht als dieselbe Art.
- **Doppelte Fortschrittseinträge.** Der Reducer `quest.progressed` hängt immer an; der World-Applier prüft nicht auf Wiederholung.
- **Keine Münzanzeige beim Verkauf.** Die Buchung (+280, 337 → 617) passiert im Spielerzug. Das Systempanel zeigte bisher nur Münzänderungen aus der Antwort des Erzählers.
- **Gruppenbewegung.** Vor einem Kampf landete `move` nur in der Erzählung (#105, #113). Im Kampf bewegte `move closer` nur Combatants (#109); B, C und D blieben unverändert, und der Extractor setzte ihre Distanz danach selbst.

**Änderungen (alle nur im Planner-Pfad, außer wo vermerkt):**
- **Präsenz bei Unterorten** (`src/v4/world.js` `soughtHere`, `arrive`).
  - Bei einem Schritt in einen Teil des aktuellen Ortes, aus ihm heraus oder in einen Nachbarteil desselben Ortes kommen die anwesenden Kreaturen mit, die sein GO benennt (Art oder Name: „toward the pups“). Sie stehen auf SHORT; Wahrnehmung und Relevanz bleiben erhalten.
  - Alle anderen bleiben, wo sie waren; niemand wird pauschal in einen anderen Raum versetzt.
  - Neue Extractor-Regel (`content/deltas.json`, delta-0.21): Wer nach einem solchen Schritt mit ihm dort ist, gehört in `arrive.with`. Das gilt für Kreaturen und Personen.
- **ENGAGED ist Distanz, nicht Kampfteilnahme** (`src/v4/scene_handles.js` `approachedBy`, `areaCaught`; `src/engine.js` `caughtBy`, `areaLegal`).
  - Ein Flächenangriff trifft jeden Anwesenden, der nach dem erklärten Ein-Band-Schritt ENGAGED steht: Feind, Unbeteiligter oder Verbündeter (Friendly Fire).
  - Wer außerhalb des Kampfes getroffen wird, tritt vorher in den Kampf ein, aber nur wenn der Angriff legal ist (Probelauf auf Kopien). Ein abgelehnter Burst (kein MP, niemand in Reichweite) zieht niemanden hinein.
  - Getroffene handeln danach selbst (`npcDecide`: wehren, fliehen, abwarten).
  - **Review-Korrektur:** Treffererfassung und Seite sind getrennt.
    - Die Flächenziele sind in Vorprüfung und Auflösung (`src/combat.js` `areaVictim`) alle lebenden Kampfteilnehmer in Reichweite außer dem Zaubernden, unabhängig von ihrer Seite. Das schließt bereits kämpfende Verbündete (`side: 'ally'`) und ergebene Gegner ein. Pfad A behält „nur Gegner“.
    - Die Reichweite seines nominellen Ziels kann einen Flächenangriff nicht mehr verhindern (ein Hund auf SHORT blockierte den Burst, der den Gefährten auf ENGAGED erreicht).
    - Wer von außen erfasst wird, tritt mit seiner eigenen Seite ein (`src/v4/scene_handles.js` `sideOf`): Feinde der Szene als `hostile`, wer Alaric freundlich gesinnt ist (Haltung ≥ 20) als `ally`, alle anderen als `neutral`. Nur `hostile` sperrt Defeat-XP.
    - Die Reaktion entscheidet der Zug des Getroffenen (`asideTurn`). Ein Verbündeter bleibt auf Alarics Seite und tritt aus der Reichweite. Ein Neutraler handelt nach seinem Temperament (`npcDecide`): Greift er an, wird er ab diesem Zug Alarics Gegner (Anzeige „turns on Alaric, struck by his Arcane Burst“). Flieht er, weicht er zurück oder sucht er Deckung, bleibt er neutral. Ungetroffene halten sich heraus.
    - Die Geschichte kann einen Nicht-Feind im Kampf umdrehen (`hostile`-Delta → `combat.intent attack`).
    - Ein Kampf, den Alarics Angriff unter lauter Nicht-Feinden eröffnet, endet nicht vor diesem Angriff (`terminal`).
    - Der Kampfblock des Erzählers markiert NEUTRAL bzw. ON ALARIC'S SIDE.
  - Pro Wirkung wird einmal MP abgezogen; Schaden, Tod, XP und Loot laufen über die bestehenden Kampfregeln.
  - Selbsttreffer gibt es nicht: Die Skilldefinition („ENGAGED AREA centered on caster“) trifft nur, wer mit dem Zauberer ENGAGED ist.
  - Der Mechanismus fragt nur `effects.kind = area` ab und gilt damit für jeden künftigen Flächenzauber.
  - Der Planner beschreibt Flächenskills jetzt als „everyone ENGAGED with Alaric, friend or foe“ und hat ein Beispiel „step in among them and then Ember Ring“ (move + use_skill).
- **Bewegung** (`src/v4/commands.js` `moveStep`, `src/v4/planner.js`, `src/engine.js`).
  - Ein Schritt vor dem Kampf („I walk into the middle of them“) wird zu einem Engine-Befehl. Er verschiebt die Distanz des genannten Ziels um ein Band, sonst die der sichtbaren Feinde; nur wenn es keine gibt, die der übrigen Szene.
  - Der Erzähler bekommt MOVES mit den neuen Distanzen, das Systempanel zeigt MOVED.
  - Ein Schritt im Kampf bringt ihn auch den Feinden außerhalb des Kampfes ein Band näher.
  - Kombinierte Eingaben („walk in front of them and then Arcane Burst“): erst der Schritt, dann der Angriff, wie bisher mit genau einem Schritt pro Zug.
- **Questzählung** (`src/v4/guild.js` `defeatTally`, `drivesOff`; `src/v4/domain.js` `namesKind`, `sameKinds`, `namesYoung`; Content `monsters.json kind_words`, `rules.json guild.drive_off`).
  - Ein Ziel zählt über seinen Text **oder** seine Einheit. Wörter, die der Content als dieselbe Art führt (dog = hound …), gelten gleich.
  - Junge einer Art (pups, cubs, brood …) zählen nur, wenn das Ziel sie selbst nennt.
  - Erlaubt der Vertrag ausdrücklich das Vertreiben („driven off or destroyed“, „Clear … from …“), zählt jede Kreatur, die die Engine aus einem Kampf fliehen sah (`fled`, gesetzt in `persistCombat`), als vertrieben.
  - Ein bloßes `scene.left` der Erzählung zählt nicht. READY braucht dann weiter die `alternative` der Geschichte.
  - Zählung und Anzeige (der Zählstand als „2 of 4 … (2 killed, 2 driven off)“) gelten in beiden Pfaden; `fled` entsteht nur im Planner-Pfad.
  - Auszahlung und Quest-XP bleiben beim Turn-in an der Gilde.
- **Keine Duplikate** (`src/v4/domain.js` `progressKey`, Reducer `quest.progressed`; `src/v4/world.js`).
  - Ein Fortschritt wird über das Ziel identifiziert, dessen Verb und Gegenstand er nennt (o2), und ersetzt dessen Eintrag. Dieselbe Meldung noch einmal ändert nichts und erzeugt kein Event.
  - Der Reducer wirkt beim Falten: Der gespeicherte Livetest-Chat hat damit sofort zwei statt drei Einträge.
- **Münzanzeige** (`src/v4/turn.js` `coinBooked`, `src/display.js`).
  - Gebuchte Münzänderungen eines Spielerzugs erscheinen als eigene Systemzeilen, z. B. `SALE COMPLETE · +280 copper · sold …` und `COIN: 337 → 617 copper`.
  - Ebenso PURCHASE COMPLETE, PAID, GUILD PAYOUT und COIN RECEIVED.
  - Die Werte stammen ausschließlich aus den `coin.changed`-/`transaction.completed`-Events. Angebote und Gebote erzeugen keine Zeile.
- **Kleinigkeit:** Der Kampfbericht eines Flächenangriffs zeigt die Summe der XP aller durch ihn Besiegten (vorher nur die des letzten).

**Kompatibilität:** Keine Savegame-Migration nötig.
- Alle Änderungen wirken beim Laden: Questzählung und Duplikatbereinigung über Reducer und Zählung, die Branch-#3-Kampagne zeigt danach 2 von 4 und zwei Fortschrittseinträge.
- Historische Events bleiben unverändert.
- Was die Engine damals nicht entschieden hat (die Welpen in #118, der Burst in #111), wird nicht rückwirkend neu berechnet.

**Vertrag** (Revision `4.3.0-c.6.6.6`): neue Absätze DISTANCE AND AREA (Distanzen nach MOVES, Flächentreffer für Freund und Feind, sonst niemand) und SCENE CONTINUITY. **Kartenbeschreibung neu einsetzen.** Preset und Lorebook sind unverändert.

Tests: `tests/v4/c666.test.js` (13 Tests zu den erwarteten Regressionstests 1–8 und zur Review-Korrektur). Mutationsproben: jeder der 19 Fixes einzeln zurückgedreht, jeder fällt durch. Gesamt 705/705. Planner aus: identisch zu c.6.6.5 (122/122 Live-Schritte, 18/18 Kampfeingaben). Smokes: Browser, SillyTavern V3, V4 und C OK. Build: `4.3.0-c.6.6.6`.

**Grenzen von c.6.6.6:**
- Die Präsenzübernahme erkennt das Ziel des GO über Art- und Namenswörter (englisch). Personen übernimmt nur die Geschichte über `arrive.with` (Extractor-Regel), nicht die Engine. Das ist so gewollt, damit NPCs nicht ungefragt versetzt werden.
- Die Distanzen bleiben ein Bandmodell relativ zu Alaric. Ein Gruppenschritt nähert ihn allen Feinden um ein Band. „Mitten hinein“ von MEDIUM aus braucht zwei Züge; eine echte Formation (wer steht neben wem) gibt es nicht.
- Für Nicht-Combatants setzt die Engine die Distanz nur bei Alarics eigenem Schritt. Danach meldet der Extractor sie weiter (Kreaturen und NPCs dürfen sich selbst bewegen). Eine Erzählung, die Alaric selbst näher rückt als gebucht, wird nur über den Vertrag begrenzt.
- „Vertrieben“ zählt automatisch nur bei einer Flucht aus einem Kampf. Eine Vertreibung ohne Kampf (Drohen, Feuer, Lärm) bleibt Sache der Geschichte: `quest.ready` mit `alternative`, geprüft wie bisher.
- Verbündete und Neutrale im Kampf greifen keine Monster an: Das Kampfsystem kennt keine Angriffe zwischen NPCs. Sie halten sich heraus oder weichen zurück, bis sie selbst zu Alarics Gegnern werden.
- Für Nicht-Feinde, die er tötet, gibt es keine Kampf-XP (Beute ja). Wer sich gegen ihn wendet, bekommt ab dann gewöhnliche Defeat-XP.
- Ob jemand Verbündeter ist, liest die Engine nur aus der Haltung (≥ 20). Einen eigenen Gruppen- oder Gefährtenstatus gibt es nicht.

### Nachtrag 4.3.0-c.6.6.7 (Kampfbeginn und Reaktionen; Livetest „Branch #3“, 18.10.2026)

Nur Pfad C (`ctx.c`). Pfad A ist unverändert. Balancing, Handel, Auftritte, Preset, Lorebook und Vertrag sind ebenfalls unverändert (Vertragsrevision bleibt `4.3.0-c.6.6.6`).

**Befund 1: Der eigene erste Angriff wartete auf seinen Initiativplatz.**
- Live (`*i arcane burst*` unter vier aufmerksamen Hunden): A und B standen ENGAGED, C und D auf SHORT. C und D rückten in ihren Zügen vor Alaric heran, danach traf der Burst alle vier.
- Ursache: Ein vom Spieler ausgelöster Kampf ohne Ambush legte nur `enc.trigger` an und führte ihn erst an Alarics Platz in der Zugfolge aus. Einen vorgezogenen Angriff gab es nur für den Hinterhalt (Opening Action).

**Neu: First Strike** (`src/combat.js` `initEncounter`, `runCombat`):
- Ein offener Angriff, der einen Kampf eröffnet, wird zuerst aufgelöst, vor jedem anderen Zug, mit den Distanzen dieses Moments. Ein im selben Satz erklärter Schritt gehört dazu.
- Es gibt keinen Ambush-Bonus.
- Der Angriff ist die Aktion seines Urhebers in Runde 1. Sein Platz in der Zugfolge wird einmal übersprungen (`enc.spent`). Es entsteht keine zweite Aktion, keine zweite Kostenbuchung und kein zusätzlicher Zug.
- Wer dabei fällt, handelt nicht mehr. Danach läuft die Initiative regulär.
- Der Hinterhalt (Ziel nicht aufmerksam) bleibt wie bisher: Opening Action mit kritischem Treffer, und Alarics Runde-1-Zug bleibt ihm.
- Ein unmöglicher Angriff (zu wenig MP, außer Reichweite) bucht nichts: kein MP-Abzug, kein Schritt, kein Kampf.

**Symmetrie für NPCs:**
- Die Regel gilt auch, wenn ein NPC den Kampf eröffnet: ein feindliches Delta in der Antwort oder ein offenes `pending_combat`. Sein Angriff kommt zuerst, auch wenn Alaric im nächsten Zug angreift; Alaric überholt ihn nicht.
- Die gespeicherte Absicht des NPCs wird danach gelöscht, damit er nicht doppelt angreift.
- Bedrohliche Haltung, Aufmerksamkeit oder ein bloßes `pending_intents: attack` gelten nicht als Bindung. Erst `pending_combat` oder ein laufender Kampf binden.

**Befund 2: Ein getroffener Nicht-Feind antwortete nicht, wenn der Kampf damit endete.**
- Nachgestellt an #111 mit einem Packpferd neben dem letzten Hund: Der Burst tötete den Hund. `terminal()` beendete den Kampf sofort, und das mitgetroffene Pferd reagierte nie.
- Zusätzlich reagierte `asideTurn` auf jeden früheren Treffer, auch auf einen längst beantworteten.

**Neu: offene Reaktionen** (`reactionsDue`, `asideTurn`):
- Bevor der Kampf endet, antwortet jeder lebende, nicht kapitulierte Nicht-Feind, den Alaric seit dessen eigenem letzten Zug getroffen hat, genau einmal.
- Die Antwort zählt als Aktion dieser Runde. Der Platz in der Zugfolge wird übersprungen, solange er noch aussteht.
- Verbündete bleiben Verbündete und weichen zurück. Neutrale folgen ihrem Temperament (`opensViolence` + `npcDecide`): Ein scheues Tier weicht aus, ein aggressiver Wächter greift an.
- Erst ein tatsächlicher Angriff macht einen Neutralen zu Alarics Feind, mit gewöhnlichen Defeat-XP ab dann; der Kampf geht weiter.
- Bereits beantwortete Treffer lösen nichts mehr aus. Wer nichts mehr zu beantworten hat, bleibt einfach stehen.
- Rückwirkende XP gibt es nicht, und es entstehen keine Endlosschleifen: Eine Antwort ohne Seitenwechsel beendet den Kampf.

**Befund 3 (P2): Räumliche Kontinuität der Erzählung.**
- Kleine Korrektur im Kontext des Erzählers (`src/context.js`):
  - Ein Schritt vor einem Angriff steht als `X: first moves SHORT -> ENGAGED (now ENGAGED), then Bite -> Alaric`.
  - Am Ende steht eine Zeile „Where everyone stands after these steps …“ mit den Bändern aller Lebenden.
- Das Panel kennzeichnet den Kampfbeginn als „— First Strike (no Ambush) —“, den Angriff mit „(FIRST STRIKE)“.

**Tests:** `tests/v4/c667.test.js` mit 11 Tests: A–I, Pfad A unverändert, P2.

| Test | Prüft |
|---|---|
| A | Hundeszene: Burst trifft genau A und B, 14 MP einmal, kein Crit; C und D rücken danach heran; nächster Zug „Alaric's Turn (Round 2)“ |
| B | Einzelziel |
| C | Hinterhalt unverändert |
| D | NPC hat sich bereits gebunden (Antwort-Delta oder `pending_combat`) |
| E | Schritt + Burst im selben Satz, Distanzen beim Wirken; ein Schritt in einer früheren Nachricht eröffnet keinen Kampf |
| F | Unmöglicher Angriff bucht nichts |
| G | Nur ein Neutraler wird getroffen: Pferd weicht aus, Kampf endet, keine XP; aggressiver Wächter greift an, höchstens eine Aktion je Runde |
| H | Letzter Hund tot, Pferd antwortet noch; XP nur für den Hund |
| I | Keine leeren Züge; ein Gefährte beantwortet einen Treffer genau einmal |

- Mutationsproben: 8 Fixes einzeln zurückgedreht, jeder fällt durch.
- Gesamt: 716/716.
- Planner aus: identisch zu c.6.6.6 (122/122 Live-Schritte, 18/18 Kampfeingaben).
- Smokes: Browser, SillyTavern V3, V4 und C OK.
- Build: `4.3.0-c.6.6.7`.

**SillyTavern:** Nur den Extension-Ordner ersetzen. Karte, Preset und Lorebook bleiben, weil die Vertragsrevision unverändert ist.

**Grenzen von c.6.6.7:**
- Der First Strike verbraucht Alarics Runde 1. NPCs, die in der Zugfolge vor ihm stehen, handeln deshalb in Runde 1 und in Runde 2 vor seiner zweiten Aktion. Das ist regelkonform, wirkt aber wie zwei Züge des Gegners am Stück.
- Eine Reaktion vor Runde 1 wird mit der Rundenzahl 1 protokolliert.
- `pending_intents: attack` allein bindet nicht. Ein NPC, der nur „gleich angreifen will“, wird vom First Strike überholt.
- Es gibt weiterhin keine Angriffe zwischen NPCs. Verbündete und Neutrale greifen keine Monster an.
- Die Raumkontinuität der Erzählung wird nur über den Kontext geführt. Die Engine prüft die Prosa nicht auf Positionsfehler.

### Nachtrag 4.3.0-c.6.6.8 (Lorebook v0.14: kleinere Welt, Dungeon-Kanon)

Nur Welt-Lore und Content. Keine Mechanik ändert sich, Pfad A und C sind unverändert, und die Vertragsrevision bleibt `4.3.0-c.6.6.6`. Einzelheiten stehen in [LOREBOOK.md, „Änderungen v0.13 → v0.14“](LOREBOOK.md#änderungen-v013--v014-kleinere-welt-build-430-c668).

**Welt:**
- Fünf Großmächte: Valedorn Crown, Caelreth, Duskreach, Ashen Scale Dominion, Verdant Fang Court.
- Startstädte: Alderwatch, Glassmere, Ashbridge. Veyrhold, Solmere und Ilyrion entfallen samt ihren Städten.
- Spiel über Land.
- Dungeons sind persistente, geteilte Orte der Welt. Gewöhnliche Höhlen bleiben Höhlen.

**Lorebook:** 67 → 50 Einträge, 51.747 → 45.056 Zeichen. Im Schnitt 882 → 839 aktivierte Token je Generierung, Budget-Schnitte 29 → 16.

**Content:**
- `lore.json`: Die entfernten Reiche und Städte sind ganz gestrichen, samt ihrer Rückfall-Lore.
- `campaign_start.json`: drei Startorte.
- Kein Code für alte Kampagnen: Nach jedem Patch beginnt ein neuer Lauf. `src/` ist unverändert bis auf die Versionsnummer.

**Tests:**
- `tests/unit/lorebook.test.js` mit 5 Tests, darunter neu die Welt von v0.14.
- `context.test.js` startet den Lore-Test in Ashbridge, weil Solmere keine Lore mehr hat.
- Die aufgezeichneten Läufe der Regressionstests spielen in Tidecross, Redmarch und Lumenford. Diese Städte liegen nur als Testdaten in `tests/legacy_world.json`; `tests/helpers.js` lädt sie dazu, die Extension nicht.
- Gesamt: 717/717.
- Planner aus, gegen c.6.6.7 (122 Live-Schritte): Zustand und Records sind identisch, wenn man die Orte der alten Welt beiseitelässt (sie stehen in den Tests jetzt am Ende der Ortsliste). Engine-Blöcke unterscheiden sich nur in Zeilen der Rückfall-Lore.
- Smokes: Browser, SillyTavern V3, V4 und C OK. Sie starten jetzt in Ashbridge, Glassmere und Alderwatch.
- Build: `4.3.0-c.6.6.8`.

**SillyTavern:**
- Den Extension-Ordner ersetzen.
- `lorebook/Avereth_World_Lore_v0.14.json` importieren, v0.13 löschen und v0.14 als Character Lore verknüpfen.
- In der Begrüßung die `{{pick::…}}`-Ortszeile auf die drei Startstädte kürzen ([LOREBOOK.md, Einrichtung Schritt 5](LOREBOOK.md#einrichtung-in-sillytavern)).
- Die Karte (Vertrag) und das Preset bleiben.

**Grenzen von c.6.6.8:**
- Eine Begrüßung, die noch Redmarch, Tidecross oder Lumenford nennt, startet in einer der drei Startstädte (nach Seed), während der Text von der alten Stadt spricht. Die Ortszeile ersetzen.
- Die World-Info-Einträge stehen weiter vor dem Vertrag (Position 0). Das Prompt-Caching bricht dort ab; ein Umbau ist nicht Teil dieses Patches.

### Nachtrag 4.3.0-c.6.6.9 (Patch 1: Memory-Retrieval, Live-Lauf 18.10.2026 23:37)

Nur die Auswahl für den Abschnitt RELEVANT (`src/retrieval.js`, `src/context.js`). Folgendes bleibt unverändert:
- Budget, Kontextsektionen, Vertrag und Preset;
- Event-Log, Kampf, XP und Threads;
- alle LLM-Aufrufe.

**Befund:** Bei #63 („continue my journey towards the Dungeon location from the map i saw“) fehlte im Engine-Block alles zum Dungeon aus der Karte. Kartenhändler-Erinnerung, Dungeon-Thread und Dungeon-Lage standen auf den Plätzen 18, 19 und 41. Den Platz in RELEVANT belegten neuere Kämpfe, die Wunde und doppelte Wolfszeilen. Es gab drei Ursachen:
1. **Anfrage:** Die Anfrage war Spielernachricht plus 1.500 Zeichen der letzten Antwort. Damit trafen fast alle Einträge: 51 von 95 erreichten den Höchstwert des lexikalischen Scores, mit der Spielernachricht allein waren es 4.
2. **Alaric als Fokus:** Alaric zählte als Fokus-Entität. Jede Erinnerung mit ihm bekam +3, ein Fakt ohne ihn (der Kartenhändler über den Dungeon) nicht.
3. **Wortgleiche Zeilen:** Sie kosteten das Budget doppelt, im Lauf 15-mal.

**Neu:**
- **Anfrage:** Die Spielernachricht zählt voll. Aus der letzten Antwort zählen nur die bekannten Namen, die sie nennt (NPCs, Orte, Quests), dazu die Namen der Anwesenden, mit halbem Gewicht. Eine namenlose Kreatur geht nicht als Beschreibung ein („low, heavy bulk“ traf sonst jedes andere Tier); ihr Signal läuft über die ID.
- **Entität:** `pc` zählt nicht mehr. Fokus sind die Anwesenden und die NPCs, die Spielernachricht oder letzte Antwort beim Namen nennen; das ist neu für Abwesende.
- **BM25:** `1 − e^(−x/6)` statt `min(1, x/6)`. Keine Kappung, starke Treffer bleiben unterscheidbar.
- **Gleiche Zeilen:** Wortgleiche Zeilen gleicher Art werden zu einer Zeile mit `(×n)` zusammengefasst. Verschiedene Zeit, verschiedener Name oder anderer Wortlaut bleiben getrennt. Das Event-Log bleibt, wie es ist.
- **Export:** `retrieveRelevant()` (aus `buildContext` herausgezogen) liefert Rangfolge und gepackte Zeilen für Tests.

**Ergebnis im Lauf** (34 Spielerzüge, Standardbudget 1.400):

| | vorher | nachher |
|---|---|---|
| Dungeon-/Kartenzeilen im Engine-Block bei #45 / #63 / #67 | 1 / 0 / 0 | 6 / 5 / 5 |
| doppelte Zeilen in RELEVANT, gesamt | 15 | 0 |
| Kampfzeilen je Zug | 1,3 | 0,5 |
| RELEVANT-Token je Zug | 303 | 299 |
| Engine-Block je Zug | 558 Token | 554 Token |
| Rechenzeit Context Builder je Zug | 8,1 ms | 3,5 ms |

**Tests:**
- `tests/v4/retrieval_p1.test.js` mit 9 Tests:
  - A (#45) und B (#63, zweimal), auf `tests/v4/live_1018_weald.json` (#0–#63 des Laufs);
  - C (vier Tests): NPC nach 20 Kämpfen, Anwesende und Kampf, Quest und Ortsfakt, mehrdeutiges Wort;
  - D (zwei Tests): Duplikate, und 5.000 Einträge unter 2 s.
- Mutationsproben: 6 Teiländerungen einzeln zurückgedreht, jede fällt durch.
- Gesamt: 726/726.
- Planner aus, gegen c.6.6.8 (122 Live-Schritte): Zustand und Records identisch. 47 Engine-Blöcke unterscheiden sich, ausschließlich im Abschnitt RELEVANT; die 18 Kampfeingaben sind identisch.
- Build: `4.3.0-c.6.6.9`.

**SillyTavern:** Nur den Extension-Ordner ersetzen. Karte, Preset und Lorebook bleiben.

**Grenzen von c.6.6.9:**
- Nennt der Spieler das Ziel nicht („I keep walking“), hat die Anfrage kein Thema. Dann entscheiden Ort, Wichtigkeit und Aktualität. Ein dauerhaftes Vorhaben (Active Intent) fehlt noch.
- Offene Threads bleiben offen, bis sie gelöst werden. Überholte Hinweise konkurrieren weiter mit; ihre Lebensdauer regelt erst ein Thread-Lifecycle.
- Fast gleiche Zeilen (zwei Fakten zur selben Sache mit anderem Wortlaut) werden nicht zusammengefasst.
- Lexikalisch heißt wörtlich: „cave“ findet „Dungeon“ nicht. Es gibt keine Embeddings; `rank()` hat dafür einen `semantic`-Haken.

### Nachtrag 4.3.0-c.6.6.10 (Patch 2: Ziele, Berichtsorte, Thread-Lebenszyklus, Live-Lauf 18.10.2026)

Leitsatz: Die Engine merkt sich Alarics Absichten und relevante Weltinformationen zuverlässig. Sie leitet daraus keine Entscheidungen für ihn ab und bewegt ihn nicht automatisch zu seinem Ziel. Kampf, XP, Dungeon-Mechanik, Item-Typen und Reise bleiben unverändert. Es gibt keinen neuen LLM-Aufruf: Planner, Interpreter und Extraktor sind dieselben.

**Befund:**
- Alaric brach am ersten Tag zum Dungeon von der Karte des Kartenhändlers auf. Nach Jagd, Lager, zwei Kämpfen und einem Steinbruch-Tunnel fand „I continue my journey towards the Dungeon location from the map“ nichts, was sich an das Ziel erinnerte.
- Der Dungeon war Fakt, Erinnerung und Thread, aber kein Ort. Das Tal, das er fand, wurde ein neuer Ort neben ihm.
- Zehn Threads waren offen, keiner wurde je geschlossen. Das HUD zeigte die letzten fünf.

**Ziele** (`src/v4/intents.js`, Zustand `intents`, Event `intent.set`):
- **Herkunft:** Nur Spielerbefehle schreiben Ziele. Der Extraktor hat kein Delta dafür, der Erzähler kann also kein Ziel setzen.
  - `go` zu einem Berichtsort oder in eine andere Siedlung macht das Ziel „reach <Ort>“.
  - `intent.set` gilt nur für eine feste Entscheidung („I decide to make for the old Dungeon tomorrow“). Neugier, Frage, Vielleicht oder Wunsch sind kein Ziel. Ein unbekannter Name bleibt Wortlaut: Ein Ziel erzeugt keinen Ort.
  - `intent.drop` gibt ein Ziel auf oder erklärt es für erreicht.
  - `journey.continue` frischt das Ziel auf.
- **Status:** `active`, `paused`, `done`, `dropped`. Stabile IDs `intent.<n>`, dazu `since`, `updated`, `quote`, `why`.
  - Kampf, Rast, Schlaf, Umwege und Ortswechsel ändern nichts.
  - Ein neues Ziel mit Ort pausiert das bisherige; aufgegeben ist es erst auf seine Aussage hin.
  - Bei Ankunft am Zielort oder darin wird das Ziel `done`, gesetzt durch das Gate `player.goal` im Ankunftsfall.
- **„I continue“** (`continueOptions`): Optionen sind aktive Ziele mit Ort, an dem er noch nicht ist, und die `journeyReady()`-Reise eines Auftrags.
  - Eine nur aus Notizen gelesene Reise weicht einem eigenen Ziel.
  - Eine Eskorte, eine Lieferung unterwegs oder eine Reise mit Begleiter bleibt eine eigene Option.
  - Ist das Ziel der Zielort dieser Reise (er brach zur Stadt der Lieferung auf), ist es dieselbe Reise. Der Auftrag behält Begleiter und Handhabung.
  - Bei genau einer Option geht es weiter; bei mehreren fragt die Engine (`CLARIFY — continue which: …`) und bucht nichts.
  - „Weiter zum Ziel“ ist ein GO mit Reise-Zeitdeckel. Die Erzählung entscheidet, wie weit er kommt; die Engine bewegt ihn nicht.
- **Planner und Erzähler:**
  - Der Katalog hat die Zeile `GOALS (Alaric's own; never a reason to act for him)`.
  - `JOURNEY READY` nennt das Ziel bzw. bei mehreren Optionen alle, mit dem Hinweis, dass ein „I continue“ ohne Namen nachfragt.
  - Der Engine-Block hat den Abschnitt `ALARIC'S GOALS (his own decisions: remember them; never act, decide or move him toward them for him)` mit höchstens 3 Zeilen.

**Berichtsorte** (`src/v4/known.js`, `places[id].known`/`reports`, Event `place.updated`, Delta `place.reported`):
- **Anlegen:** Was jemand erzählt, eine Karte zeigt oder ein Gerücht nennt, bekommt eine Orts-ID mit `known: reported` und einem Bericht `{by, how: told|map|rumor|written, where, turn, minute}`.
  - Die Angaben des Berichts bleiben Angaben des Berichts, sie werden keine Weltfakten.
  - Ein zweiter Bericht unter gleichem Namen im selben Reich ist derselbe Ort und ergänzt seine Berichte.
- **Im Katalog:** „<Name> — known only by report (on a map, <Quelle>: <Lage>); not seen yet“. Höchstens 4 Berichtsorte stehen zusätzlich in PLACES.
- **Ankunft:** Führte das GO dieses Zuges zum Berichtsort und meldet der Extraktor die Ankunft unter neuen Worten (`{new: "Dungeon valley with the dark cleft"}`) oder ohne Ort, ist es dieselbe ID (`reportedTarget`). Der Ort und ein Berichtsort, in dem er liegt, werden `visited`.
- **Widerlegt:** `place.reported` mit `false: true` setzt `known: false`, aber nur für einen Ort, den er nicht gesehen hat. Fakten bleiben unberührt, und „I continue“ führt nicht mehr dorthin.
- **Unverändert:** Orte aus Lore oder Erzählung (ohne `known`). Spieler und Erzähler legen weiter neue Orte an.

**Threads** (`src/threads.js`, V3 `src/delta.js` und V4 `world.js` gemeinsam):
- **IDs:** Die Engine vergibt `thread.t<Zug>.<n>`, der Wortlaut ist nie die Identität. Jeder Thread kennt seinen Ort (`at`).
- **Aktualisieren:** Der Extraktor sieht `THREADS (open; update or resolve by id)` mit höchstens 6 aktuellen Threads, Text auf 80 Zeichen gekürzt.
  - Er aktualisiert oder schließt per ID. Eine unbekannte ID wird abgelehnt.
  - Ohne ID trifft gleicher Wortlaut oder eine Umformulierung (≥ 60 % Wortüberschneidung, genau ein Kandidat) denselben Thread.
  - Abschließen geht nur für einen bekannten Thread, mit Beleg in der Antwort. Der Abschluss behält den Wortlaut und ergänzt `resolution`.
- **Kurzlebige Hinweise:** `sign` (neu) und `threat` sind nicht mehr aktuell, wenn er anderswo ist und 6 h vergangen sind, oder nach 3 Tagen.
  - Das ist eine Sicht, kein Event: Nichts wird geschlossen, und am Ort sind sie wieder aktuell.
  - Rätsel, Versprechen, Schulden, Gerüchte und Fristen bleiben, bis die Geschichte sie auflöst.
  - Ein Ortswechsel allein beendet nichts.
- **Retrieval:** Aktuelle Threads haben Wichtigkeit 0,7 und ihren Ort. Erledigte und verblasste Threads haben 0,2 und den Vermerk „Resolved thread … — <resolution>“ bzw. „Earlier sign … no longer current“. Keine globale Thread-Liste pro Prompt.
- **Vertrag:** `deltas.json` `delta-0.6` (`thread` mit `id`, `resolution`, `kind: sign`; neues Delta `place.reported`), `commands.json` `cmd-0.9` (`intent.set`, `intent.drop`).

**HUD und Journal:**
- **HUD:** zeigt Goals (ohne IDs), Fristen, „Here“ (bis 3 Threads dieses Ortes), „Leads“ (bis 3 dauerhafte von anderswo) und „Journal: N more“. Die letzten 5 globalen Threads entfallen; Kampf- und Questanzeige bleiben.
- **`#journal`:** Ziele nach Status, Orte nur aus Berichten, offene Threads ([here]), nicht mehr aktuelle und erledigte Threads.
- **Kein NPC-Wissen:** Was ein NPC weiß oder glaubt, erscheint weder im HUD noch im Journal.

**Tests:** `tests/v4/patch2.test.js`, 11 Tests auf Produktinhalt (Ashbridge, Planner an):
- 1–2 Karte und Berichtsort;
- 3–5 Ziel durch Schlaf, Höhle, Kampf und Ortswechsel, „I continue my journey“;
- 6 Zielwechsel, Aufgeben, Wortziel und zwei Ziele mit Rückfrage;
- 7 Ankunft unter anderem Namen;
- 8 Thread-Lebenszyklus;
- 9 widerlegter Bericht und Gerücht;
- 10 Lieferung plus Ziel;
- 11 HUD und Journal;
- 12 Kosten;
- V3-Pfad.

**Ergebnisse:**
- Gesamt: 737/737.
- Kosten im Szenario: Ziel-Abschnitt 59 Token, THREADS-Zeile 84, GOALS plus JOURNEY READY 82. Live-Lauf 18.10. (#63, alte Slug-IDs): THREADS-Zeile 217 Token.
- Planner aus, gegen c.6.6.9 (122 Live-Schritte, 18 Kampfeingaben): Nach Ausblenden der neuen Felder (`intents`, Thread-`id`/`at`, `known`) sind die Zustände identisch.
  - Unterschiede gibt es nur in der RELEVANT-Reihenfolge (aktuelle Threads mit Ort), bei den Schemafeldern `id`/`resolution: null` in Extraktor-Deltas und in den HUD-Zeilen.
- Smokes: Browser, ST Default, ST V4 und ST C sind grün.
- Build: `4.3.0-c.6.6.10`.

**SillyTavern:** Nur den Extension-Ordner ersetzen und einen neuen Lauf beginnen.

**Grenzen von c.6.6.10:**
- **Keine Reisemechanik (Patch 5):** Etappen, Entfernung, Reisezeit und Zufallsbegegnungen fehlen. „Weiter zum Ziel“ bleibt ein GO mit Zeitdeckel.
- **Keine Dungeon-Struktur (Patch 7):** Ebenen und Bewohner fehlen. Ein Ort im Dungeon ist ein Unterort.
- **Namensabgleich:** Berichtsorte werden nur über gleichen Namen im selben Reich zusammengeführt („the old Dungeon“ = „The Old Dungeon“). Ein ganz anderer Name aus einer anderen Quelle wird ein zweiter Berichtsort, bis er dort ankommt.
- **Nur V4:** Ziele gibt es nur im V4-Pfad. Der V3-Pfad hat Thread-IDs und Zusammenführung, aber keine Ziele.

### Nachtrag 4.3.0-c.6.6.11 (Patch 3: Mechanische Konsistenz und Spielerautonomie, Live-Lauf 18.10.2026)

Leitsatz: Die Engine führt tatsächliche Spielerhandlungen zuverlässig und nachvollziehbar aus. Der Erzähler gestaltet ihre Erlebnisse, darf aber nicht eigenmächtig mechanische Tatsachen oder Spielerentscheidungen verändern. Kein neuer LLM-Aufruf; Kampf, XP, Dungeon-Mechanik und Reise unverändert.

**Bestätigte Ursachen (Lauf 18.10.2026) und Behebung:**

| # | Befund | Ursache | Behebung |
|---|---|---|---|
| #51 | „I use the flint and steel to make a small light and continue“ → „Alaric does not know flint and steel“, „continue“ fallen gelassen | Planner schrieb `ability_world` mit Skill `{new: "flint and steel"}`; `use` hätte das Ding verbraucht; Story- und Mechanik-Befehle nie gemischt | Ein gehaltenes Ding an Stelle eines Skills wird `use` dieses Dings (`mapPlan`, `heldUse`); Planner-Regel 2; `use` nach Verhalten (Werkzeug bleibt) |
| #31/#37 | Wildschweinfleisch gegessen und erneut gegessen, als ein Stück | Fleisch war ein Ding ohne Portionen; „kochen und essen“ als `craft`, später `use` verbrauchte alles | Essen in Portionen (`food`, `unit: portion`), eine Mahlzeit = 1 Portion, Rest bleibt; `use` eines im selben Zug genommenen Dings als Bedingung (gebucht erst, wenn die Geschichte es ihm gibt) |
| #8/#10 | „two silver“ → 200 cp → „zwei Gold“, Erzähler schrieb den Preis um | Extraktor rechnete falsch; Engine rechnet nur Zahlen | Beträge mit Wortlaut (`said`) liest die Engine selbst (`coinFromWords`); ohne Wortlaut: ein Betrag, der genau eine Münzeinheit neben einem im Text genannten liegt und selbst nirgends steht, ist dieser (`amount.corrected` im Audit); Ablehnungszeile „der Preis bleibt“ |
| #21 | „Lager am Steinkreis … und auf die Jagd“ → CLARIFY, die Jagd ging verloren | Eine Rückfrage hielt die ganze Nachricht an | Eine Rückfrage hält nur ihren Schritt und die darauf aufbauenden (`needs`); die übrigen werden gebucht, die Frage steht als OPEN QUESTION und im System-Block |
| #73 | Kleider aus, Stab „bei den Kleidern“ – Robe und Stab blieben angelegt | `unequip` nur für ein Teil; `drop` ging nicht für Angelegtes | `unequip` ohne Objekt = alles Getragene (nicht Waffe/Schild in der Hand); `drop` von Angelegtem nimmt es erst ab; HUD zeigt den echten Zustand; Wiederaufnehmen + `equip` stellt es her |
| #42 | Wolf B als tot gespeichert, Engine hielt ihn lebendig | Freier Status-Fakt; der Tote (Wolf A) war nicht mehr im Katalog | Leben/Tod von Kämpfern (mit Kampfwerten) ist Engine-Zustand: widersprechende Fakten abgewiesen, wiederholende nicht erneut gespeichert; gleich aussehende Kreaturen in Fakten mit Handle |
| #56 | „claw raked deep across his ribs“ blieb nach voller Heilung | Wundfakt ohne Lebensdauer | Wunde Alarics nur bei HP < Max (`scope.hurt`, Lesezeit); bei voller HP abgewiesen; Narbe bleibt |
| #20 | „pc hunted_and_ate a pair of wood pigeons“ | Extraktor machte die erfundene Mahlzeit zu Alarics Fakt | Alarics Taten mit seinen Dingen sind keine Fakten (`pc_decision`), Korrektur; Engine-Block-Zeile „HIS THINGS“ bei Reise/Aktivität; Extraktor-Regel: Overreach auch für Essen, Verbrauch, Jagd |

**Allgemeines Modell** (`src/v4/items.js`, `content/rules.json` `items`):
- `tool` (Standard): benutzt, nicht verbraucht. `consumable`: Trank, Fackel, Öl, Verband, Pfeil … pro Nutzung 1 (oder die genannte Menge). `food`: Portionen, frisch 2 Tage, haltbar (getrocknet, gesalzen, Ration …) 14 Tage, danach „spoiled“ (Essen bleibt seine Wahl, die Zeile sagt es). `equipment`: Gear mit Slot.
- Bestimmt einmal beim Erzeugen aus dem Namen (Kauf, `object.new`, Nehmen); gespeichert als `use`/`fresh_until` am Objekt. Keine zweite Inventarstruktur.
- Katalog: Essen mit Portionen und „food“ bzw. „food, spoiled“.

**Beträge:** Neues optionales Feld `said` an Angebotszeilen, `bid` und `coin.gift` (`delta-0.7`). Spielerseitig (`pay`, `buy`, `sell`): ein Betrag, der seinen eigenen Worten widerspricht („two silver“ ≠ 200), geht in den bestehenden einen Reparaturaufruf (kein neuer Pflichtaufruf). Ein Verkäufer hat für dieselbe Sache einen Preis: ein neues Angebot schließt das alte (`repriced`), ein unverändertes wird nicht doppelt angelegt.

**Befehle:** `cmd-1.0`: `use` (Werkzeug/Essen/Verbrauch, `{new}` nach `take`), `unequip` (Objekt nullable = alles Getragene), `drop` (auch Angelegtes).

**Tests:** `tests/v4/patch3.test.js` (12): Live-Replays #51, #8/#9, #42, #20 mit den aufgezeichneten Planner-/Extraktor-Antworten; Portionen/Verderb, Werkzeug vs. Verbrauchsgut, Rückfrage + unabhängige Schritte, Ausziehen/Ablegen/Wiederanlegen, mechanische Fakten (HP, Ausrüstung, Wunde, Narbe), Spielerbeträge, Geldgeschenk mit Wortlaut, Kosten. Angepasst: `p0_spikes` (Gold-Antworten mit `said`), `gen35_scope` (Wundfakten haben `scope.hurt`). Gesamt 749/749; Smokes Browser, ST Default, ST V4, ST C grün.

**Kosten:** Planner-Systemprompt +140 Token (5.842 → 5.982), Extraktor +130 (5.401 → 5.531), Engine-Block +32 Token nur in Zügen mit Reise oder Aktivität. LLM-Aufrufe unverändert (Planner + Extraktor).

**Grenzen:**
- Item-Verhalten nach Namenswörtern: ein Ding mit ungewöhnlichem Namen kann falsch eingeordnet sein (Standard: Werkzeug, nie verbraucht).
- Essen „aus dem Rucksack“ im Kampf ist weiter nicht möglich (Story-Befehle im Kampf außer Warten).
- Mischung Skill-auf-Ding (`ability_world`) mit Story-Schritten bleibt eine Art Aktion pro Nachricht (V3-Pfad); nur gehaltene Dinge an Skill-Stelle werden umgedeutet.
- Die Einheitenprüfung ohne `said` greift nur, wenn der falsche Betrag selbst nirgends im Text steht und genau ein Kandidat passt.

**Review-Nachbesserung (gleicher Build, Commit nach `83b3dc2`):**

| Punkt | Befund | Behebung |
|---|---|---|
| 1 Wunden | `scope.hurt` wurde nur gegen die aktuellen HP gelesen: verwundet → voll geheilt → neuer HP-Verlust machte die alte Wunde wieder aktuell (reproduziert) | Der Reducer schließt beim Event `resource.changed` (pc, hp ≥ `scope.hurt`) die Wunde dauerhaft (`until`), im Fold und damit bei jedem Replay gleich (`src/state.js`) |
| 2 Geldbelege | Ein `said`, das nicht in der Antwort steht, ließ die gemeldete Zahl durch („nine gold“ → +7 cp) | `evidenced` (`src/v4/world.js`): Ein fehlender Wortbeleg zählt nicht (`amount.unproven`). Dann entscheiden die Summen der Antwort: Die Zahl steht in der Antwort → gilt; genau eine Münzeinheit neben der einzigen passenden Summe → diese; die Antwort nennt Summen, aber nicht diese → nichts gebucht (Geschenk abgelehnt, Angebotszeile nicht angelegt, Gebot abgelehnt, jeweils mit Korrektur); die Antwort nennt gar keine Summe („a few coins“) → die Zahl des Extraktors gilt bewusst, das Buchungsevent hält sie fest. Gildenauszahlungen und Käufe aus Angeboten bucht die Engine selbst und sind nicht betroffen |
| 3 Planner-CLARIFY | Eine Planner-Rückfrage hält die ganze Nachricht an | Bewusst beibehalten, Grenze dokumentiert: Die Antwort ist die erneut gesendete Nachricht, ein jetzt gebuchter Schritt geschähe doppelt. Die Rückfrage trägt kein Zitat und kein `needs`, welche Schritte auf ihr ruhen, ist also unbekannt. Im Kampf hält sie ohnehin die eine Hauptaktion. Das Panel nennt jetzt die wartenden Schritte („Also waiting with it: …“). Teilbuchung bräuchte eine Fortsetzung des angehaltenen Plans (Architektur, nicht Patch 3). Story-CLARIFY aus den Befehls-Handlern bleibt pro Schritt |
| 4 Erinnerungen | Eine erfundene Jagd oder Mahlzeit ging als `memory` durch, obwohl dieselbe Aussage als `fact` abgelehnt wird | Der Memory-Pfad prüft Sätze mit Alaric als Handelndem und einem Ressourcen-Verb (essen, jagen, kaufen, bezahlen …) gegen dieselbe `actedOn`-Prüfung wie die Fakten-Firewall. Ohne eigene Handlung wird der Satz gestrichen, der Rest der Erinnerung bleibt; ist nichts übrig: `pc_decision` mit Korrektur. Mehrdeutige Verben („caught his breath“, „spent the night“, „used“, „picked“, „gave“) zählen nicht |

Tests: `tests/v4/patch3.test.js` +4 (review 1–4; die Fixes 1, 2 und 4 per Gegenprobe ohne Fix rot), der `coin.gift`-Test verschärft, `gen35_ownership` mit tatsächlichem `pay`. Gesamt 753/753, Smokes Browser, ST Default, ST V4 und ST C grün. Keine Prompt-Änderung, kein LLM-Aufruf mehr.

Weitere Grenzen: `actedOn` ordnet „hunted/cooked …“ jeder Aktivität zu (wie bei den Fakten), eine Schlafaktivität deckt also eine erzählte Jagd. Ein „He …“ zählt nur, wenn die Erinnerung mit „Alaric“ beginnt. Ein Geschenk ohne Wortlaut in einer Antwort, die andere Summen nennt, wird abgelehnt, auch wenn es plausibel wäre.

### Nachtrag 4.3.0-c.6.6.12 (Patch 4: Gruppenkampf und Encounter-Kontinuität, Live-Lauf 18.10.2026)

Leitsatz: Jeder tatsächliche Teilnehmer eines Kampfes ist eine eigene persistente mechanische Einheit. Die Engine entscheidet Kampfhandlungen, der Erzähler erzählt sie, und der Extraktor erschafft keine zweite Kampfrealität. Der Kampfkern (V3, `src/combat.js`) bleibt die Grundlage; es gibt keine zweite Gruppen-Datenbank, kein neues Rudel-KI-System und kein Rebalancing.

**Diagnose (Wolfsszene #40–#44 aus `live_1018_weald.json`, Hundeszene aus `live_1018.json`, Szenarien auf dem Produkt-Content):**

| Bereits korrekt | Beleg |
|---|---|
| Gruppe mit `count` → Einzel-Entities, Handles A–D, eigene Profile und HP | #40: `mon.crequarry_pack_1..4`, Wolf A–D |
| Initiative: Nachzügler mit eigenem Platz, `turn_index` verschoben, keine Doppelzüge | Wolf C tritt in Runde 2 bei und handelt ab Runde 3 |
| First Strike = Aktion von Runde 1 (`enc.spent`), Ambush nur bei `unaware` | c.6.6.7-Tests A–F |
| Fluchtprobe des Spielers gegen alle Nahkampfgegner (−10 je weiterem); Überlebende bleiben mit ihren HP erhalten | `pcFlee`, `escapeRoll`, `persistCombat` |
| XP je Gegner einmal (`enc.defeated`), Loot je Leiche einmal, Gegnerflucht = `escaped`/`fled`, kein Kill | Diagnose: 4 Wölfe → 48 XP, 4 Felle, 8 Zähne |
| AoE nach Bändern zum Zeitpunkt des Wirkens; Neutrale bleiben neutral | c.6.6.6/c.6.6.7-Tests |

| Bestätigter Fehler | Ursache | Behebung |
|---|---|---|
| D1: dieselbe Gruppe erneut genannt („the four wolves pace the rim“) → vier weitere Wölfe | `creature.new` legte bei `count > 1` immer neu an; nur einzelne, abwesende Rückkehrer wurden erkannt | Anwesende Tiere derselben Art (Anker und Artname gleich) sind die erneut genannten; neu sind nur die überzähligen. Ausnahmen: ein Neuzugang in einen laufenden Kampf, ein stärkeres Individuum, ein anderer Eintrag derselben Antwort |
| D2: `hostile` mit „the wolves“, „the pack“ oder der Gruppen-Ref einer früheren Antwort → kein Wolf greift an, Ablehnung | Die Gruppen-Zuordnung (`groups`) galt nur innerhalb einer Antwort | `members()`: Gruppen-Ref (`entity.group`), Pluralart oder Kollektiv meint jedes lebende Mitglied hier, für `hostile`, `intent` und `aware`. Mitglieder mit einer anderen Absicht in derselben Antwort zählen nicht. Eine unpassende Zahl bindet niemanden und erzeugt eine Korrektur |
| E1: Wolf kämpft → Alaric flieht → Wolf kehrt zurück, Erzählung „unaware“ → Ambush mit garantiertem Crit | `scene.left` löscht die Awareness; nichts merkt sich den Kampf | `entity.wary` beim Kampfende für Kämpfer und Zuschauer; ein erzähltes `unaware` innerhalb von `rules.combat.wary_min` (360 min) wird abgewiesen (Korrektur). Seine Schleichprobe oder ausreichend Zeit bleiben ein echter Überraschungsmoment; der normale First Strike einer neuen Begegnung bleibt |
| F2: fliehender Wolf (Intent `flee`) kehrt auf LONG um und greift wieder an | `npcDecide` verbraucht das Intent nach einem Zug; das Temperament entschied danach „close and attack“ | Wer im letzten Zug geflohen ist, flieht weiter, bis er draußen ist; eingeholt (ENGAGED) kämpft er |
| N1: Erzähler beschreibt Bisse von Wölfen außerhalb des Kampfes | Der Kampfblock nannte nur Personen als „not fighting“ | Zeile „Here but NOT in the fight: Wolf C (LONG), …: no attack and no damage from them this turn“ |

**Live-Muster #41/#43 (jeder Wolf ein eigener Kampf mit First Strike):** Das ist kein Engine-Fehler. Die anderen Wölfe hatten sich in der Erzählung nicht zum Angriff verpflichtet (Heulen, Halten, Abziehen). Greifen sie laut Erzählung an, kommen sie jetzt auch als Gruppe in den Kampf (D2), und ihr erster Angriff ist ein NPC-First-Strike.

**Extraktor:** `hostile`-Beschreibung präzisiert (alle Angreifer, IDs oder Gruppen-Ref; bloßes Beobachten oder Umkreisen ist kein Angriff), `delta-0.8`.

**Tests:** `tests/v4/patch4.test.js` (9 Tests, Anforderungen 1–9, 12, 16–19, 21–24); 9–11, 13–15 und 20 bleiben durch c.6.6.6/c.6.6.7 abgedeckt, 25 und 26 durch die Patch-1-, -2- und -3-Tests der Suite. Gegenproben: Jeder der fünf Fixes einzeln abgeschaltet → der zugehörige Test wird rot. Gesamt 762/762; Smokes Browser, ST Default, ST V4 und ST C grün.

**Kosten:** Extraktor-Systemprompt +34 Token (5.531 → 5.565). Kampfblock +40 Token nur in Kämpfen mit Kreaturen außerhalb des Encounters. Planner unverändert, keine neuen LLM-Aufrufe.

**Grenzen:**
- Personengruppen („the bandits“) werden nicht als Gruppe aufgelöst; Personen kommen einzeln (`person.new` hat kein `count`).
- (Überholt durch die Review-Nachbesserung unten: ob eine erneute Nennung die Anwesenden meint, sagt jetzt `creature.new.more`.)
- Ein im laufenden Kampf geflohener Gegner, der im selben Kampf zurückkehrt, ist ein neuer Teilnehmer (die Verfolgung `chase` behält dagegen denselben).
- Zuschauer werden nur dann wachsam, wenn sie Alaric bemerkt hatten (Awareness nicht `unaware`).

**Review-Nachbesserung (gleicher Build, Commit nach `d27aea0`):**

| Fall | Befund (reproduziert) | Behebung |
|---|---|---|
| 1 Rudelverstärkung mit neuer Ref | `creature.new {ref:"wolves", count:5}` zum Rudel `cre.quarry_pack`: A–D behielten ihre Gruppe, E bekam „wolves“; „cre.quarry_pack“ meinte danach vier | Neuzugänge zu einer anwesenden Gruppe erben deren Namen; wiederverwendete Tiere ohne Gruppe erhalten ihn ebenfalls |
| 2 Zwei Rudel derselben Art | Ein eigenständiges Paar neben den vier wurde mit zwei der vier verschmolzen (Art + Anker gleich) | Neues nullable Feld `creature.new.more` (`delta-0.9`): `true` = andere (eigene Gruppe, nie der Name einer vorhandenen), `false` = die Anwesenden erneut, `null` ohne eigene Gruppen-Ref = unklar: nichts verschmolzen, nichts verdoppelt, Ablehnung `group_unclear` und Korrektur an den Erzähler („If others came, the story shows them arriving“). „the wolves“ über zwei Gruppen bindet niemanden. Der Katalog zeigt die Gruppe jeder Kreatur |
| 3 Friedliche Gruppe wird feindlich | `members()` filterte `threat: false`: „farm dogs“ griffen nach der Provokation nicht an | Gruppenreferenzen lösen die Identitäten unabhängig von `threat` auf; ob ein Angriff zulässig ist, entscheidet die bestehende World Envelope pro Tier. Anwesenheit allein startet weiterhin nichts |

Tests: `tests/v4/patch4.test.js` +3 (review 1–3; jeder Fix einzeln abgeschaltet → rot), Test (1, 4) auf die explizite Semantik angepasst. Gesamt 765/765. Kosten: Extraktor-Systemprompt +50 Token (5.565 → 5.615), Katalog etwa 3 Token je gruppierter Kreatur. Keine neuen LLM-Aufrufe.

Verbleibende Grenzen: Ohne `more` werden Neuankömmlinge derselben Art nicht angelegt, bis eine spätere Antwort sie klar meldet (bewusst: lieber sichtbar fehlend als still falsch zugeordnet). Ob der Extraktor `more` zuverlässig setzt, zeigt erst ein Live-Lauf.

**Letzte Prüfung der `more`-Semantik (gleicher Build, Commit nach `aaf4e06`):**

| Fall | Befund (reproduziert) | Behebung |
|---|---|---|
| `more:false` mit zwei Rudeln | `creature.new {ref:"east pair", count:2, more:false}` nahm zwei Wölfe der Quarry-Gruppe (Auswahl nach Art); eine `position` derselben Antwort traf einen Quarry-Wolf | Die Gruppen-Ref bestimmt die Individuen; ohne sie wählt `more:false` nur, wenn die Tiere dieser Art hier eine einzige Gruppe sind, sonst `group_unclear` (keine Auswahl) |
| Einzelner Neuzugang zum Rudel | `{ref:"cre.quarry_pack", count:1, more:true}`: neuer Wolf ohne Gruppe; die Rudel-Ref meinte weiter vier; als Einzeltier unter der Rudel-Ref galt er zudem als „Gruppe als ein Wesen“ (`delta.js`) | Neuzugänge unter der Ref einer anwesenden Gruppe treten ihr bei, mit fortlaufender Einzel-Ref („cre.quarry_pack 5“ → `mon.crequarry_pack_5`); die Gruppen-Ref in derselben Antwort meint die ganze Gruppe samt Neuzugang |

Eindeutige Semantik (keine Zuordnung nach bloßer Artgleichheit, kein neues Feld; die Gruppe steht im Katalog als „group …“):

| Meldung | Bedeutung |
|---|---|
| `ref` = Gruppe hier, `more:false` oder `null` | diese Gruppe erneut erwähnt (Überzählige treten ihr bei) |
| `ref` = Gruppe hier, `more:true` | Neuzugänge, die dieser Gruppe beitreten |
| andere `ref`, `more:true` | eigenständige neue Gruppe bzw. einzelner Neuankömmling ohne Rudel |
| andere `ref`, `more:false` | die Tiere dieser Art hier, nur wenn sie eine einzige Gruppe sind; sonst `group_unclear` |
| andere `ref`, `null`, Art hier vorhanden | `group_unclear` (nichts verschmolzen, nichts verdoppelt, Korrektur an den Erzähler) |

Tests: `tests/v4/patch4.test.js` +2 („last review“ 1–2: Entity-IDs, gespeicherte Gruppen, `position`/`hostile` derselben und einer späteren Antwort); jede Teiländerung einzeln abgeschaltet → rot. Vokabular `delta-0.91` (nur die Beschreibung von `creature.new`).

### Nachtrag 4.3.0-c.6.6.13 (Patch 5: Reisen, Reisekontinuität und Begegnungen)

Leitsatz: Reisen sind zusammenhängende Unternehmungen durch eine persistente Welt. Gewöhnliche Wegstrecken darf die Erzählung zusammenfassen; tatsächliche Begegnungen und Entscheidungen bleiben mechanisch nachvollziehbar. Der Erzähler gestaltet die Reise, verbindliche Zustände und Folgen bestimmt nur die Engine. Es gibt kein zweites Reisesystem: Ziele bleiben `s.intents` (Patch 2), Etappen bleiben `go`/`journey.continue` mit dem Transit von c.6.6.2, Begegnungen bleiben `creature.new`/`person.new` mit der World Envelope und dem Kampfkern.

**Bereits vorhanden (gesichert durch Tests):** Zielorte als feste IDs („back to the city“ ist Ashbridge, kein neuer Ort); Berichtsorte sind Ziele, kein Besuch; eine Etappe ohne Ankunft stellt Alaric auf die Straße des Reichs („On the way to …“); Zeit wird einmal gebucht, Caps (`travel_cap_min` 10080 usw.) gelten und müssen nicht ausgeschöpft werden; Reisezeit heilt nicht (`recover` nur bei Rast/Schlaf auf seinen Befehl); kein `go`/`journey.continue` während eines Kampfes; Ziel bleibt durch Kampf und Rast aktiv, pausiert bei neuem Ziel, endet durch Ankunft oder `intent.drop`; Lieferungen hängen an `owedObjects`/`contractReady`; die Patch-3-Firewall gilt auf jeder Etappe.

| Bestätigter Fehler | Ursache | Behebung |
|---|---|---|
| Gruppenposition (Patch-4-Lücke): `position {who:"east pair"}` bewegte ein Tier | `case 'position'` nutzte `mapRef` | `members()` wie bei `aware`/`intent`/`hostile`; eine eigene ID bewegt nur dieses Tier; „the wolves“ über zwei Gruppen bewegt niemanden (`group_unclear`) |
| Weitere Etappe auf der Straße: tote und lebende Wölfe der letzten Begegnung blieben Stunden später „PRESENT“ | Transit zog nur um, wenn der Ort wechselte (`via !== startAt`) | Auch eine weitere Etappe auf der Reichsstraße (≥ `go_min_elsewhere` erzählte Wegminuten, keine Ankunft) bewegt die Szene weiter; Mitreisende kommen mit, der Rest bleibt zurück |
| Neues Rudel unter der Ref eines früheren („wolves“) ging verloren | Die V3-Regeln hielten `wolves 1` für den toten `mon.wolves_1` („known, not duplicated“) | Neuankömmlinge erhalten eine eigene Ref (fortlaufend), ihre Gruppe einen eigenen Namen, wenn der alte schon vergeben ist |
| „Follow the northern road until I find a village“ war nach der ersten Unterbrechung vergessen | Ein `go {new}` setzte kein Ziel; `continueOptions` kannte nur Ziele mit Ort | Führt der Transit ihn ohne Ankunft auf die Straße, wird das Gesuchte sein Ziel ohne Ort (`intent.seek`); „I continue“ setzt es fort (Cap `unknown_place_cap_min`); erledigt erst, wenn der Extraktor die Ankunft dieses GO meldet (dann mit `place`) |
| Eskorte: der Schützling blieb am Straßenrand, wenn der Extraktor ihn bei der Ankunft nicht nannte | `arrive.with` war die einzige Quelle | Ein GO/„continue“ einer laufenden Questreise trägt den Schützling (`go.with`, `along`); er kommt an, solange die Geschichte ihn nicht trennt. Ein GO, das die Reise erst beginnen könnte (noch in der Stadt), nimmt niemanden mit |
| Eskorte READY auf offener Straße („as good as there“) | Die READY-Prüfung kannte nur die fehlende Reise | Auf der Reichsstraße ist eine Eskorte nicht fertig (`quest_escort`); die Ankunft muss stattfinden |
| Zuschauer ohne Awareness-Eintrag wurden nicht wachsam | `persistCombat` verlangte eine gesetzte Awareness | Nur wer ausdrücklich `unaware` ist, hat den Kampf verpasst |
| Nichts bemaß die Straße: jede Etappe ein Hinterhalt oder keiner, nach Laune des Erzählers | Die Envelope erlaubt jedem Neuankömmling der Antwort den Angriff | Kleiner Mechanismus (unten) |

**Die Straße (`roadLine`, `src/v4/commands.js`):** Nur für Etappen jenseits der Siedlung (bekannter Ort anderswo, Berichtsort, Ziel, Questreise). Die Engine entscheidet allein, ob diese Etappe *eine* konkrete Unterbrechung bringen darf (`rules.travel.leg_event_pct`, 35 %), nie welche. Der Wurf kommt aus `hash32(seed|turn|minute|seq)`: derselbe bei Swipe und Replay, kein Würfel des Kampfes wird verbraucht. Der Erzähler erhält eine Zeile:
- `open`: „may (not must) bring ONE concrete interruption that fits the land he crosses and the hour … what he does about it is his decision“
- `quiet`: „uneventful: no ambush, attack or obstacle … Scenery, weather, far-off animals and harmless travellers are atmosphere“
- noch Anwesende einer Unterbrechung: „X, Y are still here … nothing new meets him on this leg“ (`quiet`). So wird eine Unterbrechung nicht mit jeder Nachricht neu erzeugt.

Durchgesetzt wird nur `quiet`: Wen die Antwort auf die Straße bringt, greift nicht an (`road`, Korrektur); er ist da, mehr nicht. Was erscheint, wählt der Erzähler aus Lore, Ankern und Ort; es gibt keine Spawnliste, keinen Generator und keinen LLM-Aufruf dafür.

**Dieselben Individuen (`entity.left`):** Lebende Kreaturen, die er zurücklässt, behalten `left: {at, minute, turn, leg}`. Nennt die Geschichte an *diesem* Ort dieselbe Art wieder (ohne Anwesende dieser Art, nicht `more:true`), sind es diese, mit ihren HP, Gruppe und Wachsamkeit: an einem festen Ort innerhalb `wary_min`, auf der offenen Straße nur in der Antwort, in der er weiterging (kein Verfolgen über beliebige Strecken; das gilt jetzt auch für das einzelne Rückkehrtier). Weniger als dort sind oder zwei Gruppen: `group_unclear`, nichts gewählt, nichts erzeugt. Tote bleiben tot und liegen, wo sie fielen.

**Zustand:** keine neue Reise-Struktur. Neu sind nur `intent.seek` (Ziel ohne Ort), `entity.left` (wo eine Kreatur zurückblieb), `go.along` (Begleiter einer laufenden Reise) und `outcome.auth.road`.

**Tests:** `tests/v4/patch5.test.js` (27 Tests zu den Anforderungen 1–35; Doppelungen mit Patch 2/3/4 und c.6.6.2/c.6.6.4 sind dort belassen). Gegenproben: 15 Teiländerungen einzeln abgeschaltet → jeweils mindestens ein Test rot. Gesamt 794/794; Smokes Browser, ST Default, ST V4, ST C grün.

**Kosten:** Extraktor-Systemprompt unverändert (5.638 Token, `deltas.json` unverändert). Erzähler: eine ROAD-Zeile je Reiseetappe (35–100 Token), die CONTINUES-Zeile +25 Token mit seinen ersten Worten zum Weg. Planner unverändert. Keine neuen LLM-Aufrufe. Laufzeit der Engine messbar unverändert.

**Grenzen:**
- Wie dicht Begegnungen sind, ist ein Anteil ohne Land- oder Tageszeitbezug; das „Was“ bleibt beim Erzähler (kein Biom-Ökosystem).
- `open` ist eine Erlaubnis, keine Pflicht; ob der Erzähler die `quiet`-Zeile befolgt, wird nur für Angriffe durchgesetzt (eine erfundene Brücke oder ein Sturm bleibt Erzählung).
- Personengruppen haben weiterhin kein `count`; zurückgelassene Personen erkennt die Engine über `entity.at` und Namen wie bisher.
- Die erste Etappe eines offenen Suchziels („bis ich ein Dorf finde“) bekommt keine ROAD-Zeile, weil erst die Antwort zeigt, ob er die Stadt verlässt.
- Ob ein Schützling am Ziel ankommt, folgt aus der laufenden Reise; trennt die Geschichte die beiden ohne `leave`, merkt die Engine das nicht.

**Review-Nachbesserung (gleicher Build):** Ein einzelner Wolf, lebend in Höhle A zurückgelassen, wurde zum Wolf einer anderen Höhle B im selben Reich (Ursache: der Einzeltier-Rückkehrpfad verglich nur `entity.location`, also das Reich, nicht den konkreten Ort). Jetzt gilt für Einzeltiere wie für Gruppen nur `entity.left.at === scene.at`: an einem festen Ort ohne Zeitgrenze (der Steinbruchwolf aus Patch 4 ist auch Stunden später derselbe), auf der Straße nur in der Nähe (`nearby`). Damit jeder Weg aus der Szene `left` setzt, schreibt `persistCombat` es auch für Gegner, die fliehen oder die Alaric durch seine Flucht zurücklässt. Test: `patch 5 review` (Höhle A, Höhle B, Rückkehr nach A mit gleicher ID und HP); Gegenprobe mit der alten Ortsregel → rot. Suite 795/795, alle vier Smokes grün.

### Nachtrag 4.3.0-c.6.6.14 (Patch 6: Exploration, Entdeckungen und Umweltgefahren)

Aufgebaut auf Patch 10A (`4.3.0-c.6.6.13-10a.3`, nur Darstellung; erhalten). Vor Beginn lief die Suite mit 806 Tests; ein Golden-Test erwartete noch „NOT APPLIED“ in der sichtbaren Anzeige, die 10A.2 bewusst ruhig hält. Er prüft jetzt den ungefilterten Panel-Record (`extra.avereth.panel`).

Leitsatz: Die Umgebung bietet Probleme und Entdeckungen. Der Spieler entscheidet frei; die Engine verwaltet Risiken, Würfe und Folgen; der Erzähler beschreibt sie. Ein Ort bleibt derselbe Ort, eine überwundene Gefahr bleibt überwunden, und ein Erfolg entsteht nicht aus erzählerischer Behauptung.

**Bereits vorhanden:** SEARCH als PER-Probe gegen Moderate 6 (C-Pfad), deterministisch im Turn-Record; Orte, Berichtsorte und Besuche (Patch 2); Fakten, Threads und Objekte mit stabilen IDs; die Item-Regeln aus Patch 3 (Werkzeug bleibt, Verbrauchsgut wird verbraucht); `ability_world` mit Kostenbuchung; HP/MP/STA sind Engine-Eigentum (kein Delta kann sie setzen); Spuren als Fakt oder Thread, Kreaturen nur durch `creature.new`.

| Bestätigte Lücke | Behebung |
|---|---|
| Dieselbe Suche würfelte bei jeder Wiederholung neu, bis sie gelang | Suchgedächtnis (`s.searches` aus `check.recorded`): dieselbe Suche am selben Ort, nichts dort verändert, kein neues Werkzeug → „SEARCHED ALREADY“, kein Wurf, auch keine neue Fund-Berechtigung (sonst hätte die Erzählung denselben Fund ein zweites Mal ins Inventar geben können) |
| Ein Misserfolg durfte als „false lead“ erzählt werden | C-Pfad: „nichts Neues gefunden, klar gesagt; nichts, was er falsch glaubt“ |
| Hindernisse und Fallen hatten keinen Zustand (eine eingestürzte Brücke war ein freier Fakt) | `s.features` mit Event `feature.set` und Extractor-Delta `feature` (`delta-0.92`) |
| `ability_world`: der Erzähler bekam einen Würfel und wählte die Schwierigkeit nach dem Wurf | Auf ein Merkmal: Engine-Probe (Hauptstat des Skills gegen die festgelegte Difficulty), Ergebnis bindend; einmal entschärft, kostet ein zweiter Einsatz nichts |
| Patch-5-Randfall: `creature.new {count:1, more:true}` bei einem zurückgelassenen Tier lieferte dieses | Der Einzeltier-Rückkehrpfad gilt nicht für `more:true` |

**Ablauf einer Gefahr:**
1. Die Erzählung etabliert sie (`feature`): Art, Stat, Difficulty, Schaden ja/nein, Auslöser; sichtbar oder verborgen. Die Etablierung selbst richtet nie Schaden an.
2. Sichtbar: Der Spieler entscheidet (`attempt` examine/pass/disable, ein Skill, ein Werkzeug, ein anderer Weg, gehen). Die Engine würfelt vor der Erzählung und bucht Status und Schaden.
3. Verborgen: Eine erfolgreiche Suche am Ort findet sie. Sonst löst sie nur durch seine Handlung aus (enter/touch/cross). Die Engine würfelt seine Reaktion, bucht den Schaden einmal und markiert sie als ausgelöst und bekannt.
4. Überwunden (`passed`), entschärft (`disabled`) oder zerstört (`destroyed`) bleibt so; kein zweiter Wurf, keine zweite Belohnung. Ein aktives Hindernis bleibt beim Wiederbesuch aktiv.

**Konfiguration (`rules.exploration`):** Schaden nach Difficulty (easy 4, moderate 8, hard 14, very hard 20; HP nie unter 1 durch eine Ortsgefahr), Werkzeug erleichtert um eine Stufe. Difficulty Scores aus `rules.checks.difficulty_scores`.

**Tests:** `tests/v4/patch6.test.js` (18 Tests zu den Anforderungen 1–37). 30 und 37 sichern die Patch-4-, Kampf-, Handels- und Fluchttests der Suite; 34 (Begleiter beim Szenenwechsel) die Patch-5-Tests. Gegenproben: 12 Teiländerungen einzeln abgeschaltet → jeweils mindestens ein Test rot. Gesamt 824/824.

**Kosten:** Extractor-Systemprompt +293 Token (5.638 → 5.931, das neue Delta `feature`). Planner-Systemprompt +203 Token (5.982 → 6.185, Regel 10 und `attempt`). Katalog und Engine-Block nur, wenn an diesem Ort Merkmale existieren (eine Zeile). Keine neuen LLM-Aufrufe; Laufzeit unverändert.

**Grenzen:**
- Merkmale gehören zu dem Ort, an dem Alaric ist, als die Erzählung sie etabliert. Wege zwischen Räumen kamen mit Patch 7: Das Hindernis eines Wegs gehört zu beiden Räumen.
- Wiedererkennung per ID oder mit denselben Worten. Ganz andere Worte für dasselbe Ding erzeugen ein zweites Merkmal, wenn der Extractor die ID nicht nutzt.
- ~~Eine verborgene `enter`-Falle löst beim GO in den bekannten Ort aus, bevor die Erzählung zeigt, ob er ankommt.~~ Behoben in der Review-Nachbesserung (unten).
- Ortsgefahren töten nicht (HP mindestens 1); DEF und Resistenzen mindern ihren Schaden nicht.
- Ob ein Weg „plainly impossible“ ist, liest der Planner (`possible: false`); die Engine prüft das nicht inhaltlich.
- Kein XP für Erkundung (bewusst: gehört ins Progression-Review).

#### Review-Nachbesserung zu 32c7d2c (gleicher Build 4.3.0-c.6.6.14)

| Befund (reproduziert, Test vorher rot) | Fix |
|---|---|
| Eine verborgene `enter`-Falle sprang schon beim autorisierten GO (`springHidden` in `commands.js`): Wurde die Reise unterbrochen und der Extractor bestätigte keine Ankunft, waren Schaden, Wurf und `disabled` trotzdem gebucht | `pendingSpring` würfelt beim GO vor (gleiche Würfel des Zugs, swipe-stabil) und bucht nichts. Ein Conditional `{kind: 'spring', condition: 'arrive', at, feature, success, record}` geht ins Outcome. Erst `arrive(at)` im World-Applier (bindend bestätigte Ankunft dort) bucht `check.recorded`, Schaden und Fallenstatus (`applySpring`), einmal und nur wenn die Falle noch verborgen und aktiv ist. Ohne Ankunft verfällt das Conditional still (kein `cmd.expired`: das GO bleibt, wie es lief) |
| Verborgene `touch`/`cross`-Fallen sprangen bei jedem Versuch an irgendeinem anderen Merkmal desselben Ortes (Truhe öffnen → Stolperdraht am Fenster) | Neues Feld `on` an Merkmalen (Delta `feature.on`, `delta-0.93`): Die Erzählung sagt, zu welchem Merkmal eine verborgene Gefahr gehört (die Nadel im Schloss *dieser* Truhe). `attemptEvents` löst nur eine Gefahr aus, deren `on` das gehandhabte Merkmal ist. Ohne `on` löst ein Versuch an etwas anderem nichts aus; die Engine rät keine räumliche Beziehung. Betreten (`enter`) bleibt davon unberührt |
| SEARCH-Spam-Schutz per EXAMINE umgehbar: jeder neuere History-Eintrag eines Merkmals (auch „examined“ oder ein gescheiterter Versuch) galt als Veränderung | Die Suche merkt sich den Ortszustand als Signatur (`placeState`: id, Status, verborgen/sichtbar aller Merkmale dort; `searches[].sig`). Dieselbe Suche würfelt nur neu, wenn sich diese Signatur geändert hat: etwas gefunden, überwunden, entschärft, zerstört oder neu etabliert. Ansehen oder ein gescheiterter Versuch ändern sie nicht. Anderer Fokus und anderes Werkzeug bleiben eigenständige Suchen. Ein Fund wird vor dem Suchprotokoll gebucht, damit die Signatur den Ort so festhält, wie die Suche ihn hinterlässt |

**Gewählte Semantik (Erzähl-Timing):** Die Engine würfelt die Reaktion vor der Erzählung, damit der Erzähler das Ergebnis kennt. Er bekommt es als Bedingung: „IF HE GETS IN — … Only if the story has him get in; if he does not reach it in this reply, nothing springs.“ Gebucht wird nur, was die Ankunft bestätigt. Ein späterer neuer GO an denselben Ort würfelt neu (neuer Zug, neue Würfel), solange die Falle verborgen und aktiv ist.

**Tests:** `patch 6 review 1–3` in `tests/v4/patch6.test.js`. Test 12/13/17 wurde auf die neue Semantik umgestellt: Wurf vor der Erzählung, Buchung erst mit der Ankunft, Swipe der Antwort mit denselben Würfeln und ohne zweiten Schaden, ausgelöste Falle springt nicht wieder. Gegenproben: Jeder der drei Fixes einzeln zurückgenommen → genau der zugehörige Review-Test rot. Gesamt 827/827. Browser-Smoke, ST-V3 (Checks identisch zu Patch 5), ST-V4 und ST-C grün.

**Kosten:** Extractor-Systemprompt +42 Token (5.931 → 5.973, Feld `on`). Planner unverändert. Keine neuen LLM-Aufrufe.

### Nachtrag 4.3.0-c.6.6.15 (Patch 7: Dungeon-Grundlagen, Raumverbindungen und persistente Erkundung)

**Vorher schon vorhanden:**
- der Ortsbaum (`site`, `interior` in `interior`) mit stabilen IDs für gleichnamige Orte unter demselben Elternteil;
- Ankünfte nur nach GO oder erzwungener Ursache (Firewall `no_go`);
- `scene.history` und RECENT ROUTE für „back“;
- Berichtsorte (Patch 2);
- zurückgelassene Kreaturen mit `left.at` und dieselben Individuen bei Rückkehr (Patch 4/5);
- Objekte mit genau einem Halter, `take` nur durch den Spieler (Patch 3);
- Merkmale, Fallen und Suche (Patch 6);
- Gilden-Readiness nach Engine-Zählung.

**Bestätigte Lücken** (vor dem Patch nachgestellt):

| Lücke | Fix |
|---|---|
| Hinter einer verschlossenen Tür: GO `{new: "the armory"}` und die Ankunft führten hindurch | `dungeonGo` (Planner-GO) und `wayRefused` (jede Ankunft im World-Applier) prüfen bekannte, begehbare Wege; ein Hindernis bleibt, bis `attempt` es überwindet |
| Jeder neue Raum lag im Raum, aus dem er genannt wurde (Halle › Korridor › Waffenkammer); Identität nur über den Elternteil | Räume liegen im Dungeon; Identität über Namen und Ebene im ganzen Dungeon, nicht über den Elternteil allein; keine Realm-weite Namenssuche in Dungeons |
| Nie gefundene Räume einer Ruine standen als PLACES neben den bekannten; draußen auch die Räume anderer Ruinen | `catalogPlaces`: aus einem Dungeon nur bekannte Räume des eigenen, sonst nur der Dungeon selbst; verborgene nur für den Extractor |
| Kein Begriff von Wegen, Richtung oder Ebene | `s.links` mit `link.set`; Delta `passage` (`delta-0.94`); Ebenen über `dir` |
| Patch-6-Rest: ein `on`, das vor seinem Merkmal im selben Bericht stand, blieb leer | Nachauflösung nach der Delta-Schleife, nach Namen am selben Ort, unabhängig von der Reihenfolge |
| Unterbrochene Erkundung ohne Ankunft im Dungeon: der Transit setzte ihn auf die Straße | kein Transit aus einem Dungeon |

**Ablauf:**
1. Die Erzählung zeigt Wege (`passage`: von, nach, Name, verborgen, Einbahn, auf/ab, Hindernis). Der Komplex wird Dungeon, der Zielraum ein Raum davon (Ebene über die Richtung), der Weg wird einmal gespeichert.
2. GO zu einem bekannten Raum (per ID, Raumname oder Wegname): Er gelangt nur über bekannte offene Wege durch besuchte Räume dorthin. Mehrere Räume fasst die Engine zusammen. BLOCKED, NO KNOWN WAY oder eine Rückfrage (zwei gleichnamige Türen, zurückgelassene Kreaturen auf dem Weg) ändern nichts.
3. GO weiter in Unbekanntes (`{new}`): erlaubt. Die Ankunft legt den Raum an, und der gegangene Weg wird gespeichert (`walked`). Ein Name, den ein aktives Hindernis hier trägt, ist blockiert.
4. Jede Ankunft prüft der World-Applier erneut. Ohne Weg: abgelehnt (`passage`) mit Korrektur. Eine erzwungene Ankunft geht durch einen angrenzenden Weg. Ein Raum eines anderen Dungeons wird nur erreicht, wenn er dorthin aufbrach.
5. Suche findet verborgene Wege (der von seiner Suche genannte zuerst). Der Erzähler kann sie nicht aufdecken.
6. HUD: `Exits` (nur bekannte, mit Blockade). `#map`: bekannte Räume nach Ebene. Narrator: DUNGEON-Abschnitt (Raum, Wege, verborgene Wege, Weg hinaus), nur dieser Raum und seine Nachbarn.

**Tests:** `tests/v4/patch7.test.js`, 16 Tests.
- Zentraler Nachweis ist der Wachturm-Integrationstest (23). Ablauf:
  - Eingang, Korridor, verschlossene Waffenkammer: untersucht; per GO, Name und Erzählung nicht betretbar; Versuch scheitert, dann gelingt er;
  - Klinge genommen, Helm bleibt;
  - zurück, bröckelnde Treppe (Gefahr im Weg, `attempt pass`), Ebene 2;
  - Krypta: „cleared“ ist keine Zählung; drei Ratten, zwei tot, eine flieht; Vertrag READY nach Engine-Zählung, keine Auszahlung im Dungeon;
  - Suche findet die verborgene Nebenkammer, Kriechgang zurück als alternative Route;
  - hinaus über bekannte Wege, später zurück zur Krypta über mehrere Räume; die verborgene Druckplatte springt erst bei bestätigter Ankunft, einmal, danach nie wieder.
- Zum Schluss geprüft: alle IDs, Wege, Tür- und Treppenzustände, Tote, Gegenstände, XP und der Fold.
- Gezielte Tests decken 1–44 ab: Identität, zwei Ruinen, Städte unverändert, beide Richtungen und Schacht, verborgener Weg, später blockierter Weg, „back“, gleichnamige Türen, unbetretene Zwischenräume, Gefahr auf dem Rückweg, Stolperdraht am Türweg, Ratten bleiben im Raum, Truhe mit Ring, Begleiterin, Reihenfolge `on`, HUD/#map/Kontext, Swipe, Erkundung ohne Ankunft, Karte, gegangener Weg, Ebenen.
- Gegenproben: 16 Teiländerungen einzeln zurückgenommen, jeweils mindestens ein Test rot. Eine davon zeigte eine echte Lücke: Ein gleichnamiger Raum am Fuß einer Treppe verschmolz mit dem oberen. Behoben durch die erwartete Ebene beim Auflösen.
- Gesamt 843/843.

**Kosten:**
- Extractor-Systemprompt +247 Token (5.973 → 6.220: Delta `passage`, `object.new.in`);
- Planner-Systemprompt +115 Token (6.185 → 6.300: Regel 7c);
- Katalog und Narrator nur in Dungeons: EXITS-Zeile bzw. DUNGEON-Abschnitt, etwa 100 Token für einen Raum mit fünf Wegen;
- keine neuen LLM-Aufrufe; Wegsuche per Breitensuche über die wenigen Wege eines Dungeons.

**Grenzen:**
- Ein Dungeon wird nur durch `passage` markiert oder durch den Gang zwischen zwei Räumen eines Gebäudes in der Wildnis. Meldet der Extractor keine Wege, verhält sich ein Gebäude wie bisher.
- Ebenen nur relativ über Treppenrichtung (Eingangsebene 1). Ohne `dir` bleibt die Ebene unbekannt.
- Ein Weg über mehrere Räume fasst nur besuchte Räume zusammen. Durch einen gesehenen, aber nie betretenen Raum geht er Raum für Raum.
- ~~Verborgene `enter`-Fallen in Zwischenräumen eines zusammengefassten Wegs springen nicht.~~ Behoben in der Review-Nachbesserung: Der Weg hält an der Falle.
- `passed` gilt für Alaric (und wer mit ihm geht); für andere entscheidet die Erzählung.
- Kein Respawn, keine wandernden Gruppen, keine Fraktionen (Patch 8).

#### Review-Nachbesserung und Dungeon-Worldbuilding (4.3.0-c.6.6.16, noch Patch 7)

**Technische Fälle** (alle vorher reproduziert, Test rot):

| Fall | Fix |
|---|---|
| A1: Ein zweiter Weg zwischen denselben Räumen (Lüftungsschacht neben der verschlossenen Eisentür) verschmolz mit dem ersten (`linkBetween` nahm den ersten Fund) | `sameWay`: ein Bericht meint den Weg seines Namens; ein unbenannter, gegangener Weg bekommt den Namen; sonst ein neuer Weg. Ein GO durch einen benannten Weg nimmt genau diesen (`knownRoomNamed` liefert den Weg mit): Die Tür bleibt BLOCKED, der Schacht führt hinein und zurück. Verborgene Wege bleiben getrennt verborgen |
| A2: Ein bekannter, unbesuchter Raum ohne Weg (Krypta von einer Karte) galt dem World-Applier als „unseen“ und war per `arrive` erreichbar | „unseen“ heißt nur noch: in dieser Antwort neu, oder ein Ort, den Alaric nicht kennt, ohne Weg, gefunden von einem GO ins Unbekannte. Ein bekannter Raum braucht einen Weg; zeigt die Erzählung ihn in derselben Antwort (`passage`), gilt die Ankunft. Planner-GO dorthin = „GOES — on to find a way to …“. Erzwungen ohne angrenzenden Weg: abgelehnt |
| A3: Eine verborgene Falle in einem Zwischenraum eines zusammengefassten Wegs wurde übersprungen | `firstStop`: Der Weg hält im ersten Raum mit verborgener aktiver Falle (Betreten, oder `cross` am Weg dorthin). Die Falle wird vorgewürfelt (Swipe-stabil) und mit der Ankunft dort gebucht. `viaStop` hält ihn dort fest, auch wenn die Erzählung weitererzählt. Entschärfte oder verbrauchte Fallen halten nichts an |
| A4: Jeder begehbare Komplex hieß `dungeon: true` | Navigation heißt jetzt `rooms: true`. Ein echter Dungeon ist eine eigene, kleine Klassifikation am selben Ort (`places[id].dungeon`). Narrator-Abschnitt „ROOMS — …“, „DUNGEON — …“ nur für echte Dungeons |

**Worldbuilding** (`lore.json` `lore.dungeons` und Lorebook-Eintrag 35):
- Dungeons sind verbreitet und regional verschieden; hochrangige sind selten und politisch bedeutsam.
- Mögliche Halter: Adel, Herrscher, Gilde, Akademien, Tempel, Handelshäuser. Die Gilde vermittelt und führt Akten, besitzt aber nicht alle Dungeons. Gebühren zahlt Alaric nur selbst.
- Jeder Dungeon hat einen eigenen Rang oder Rang-Bereich über seine Ebenen, nie an Alaric angepasst. Ein unbekannter Rang bleibt unbekannt.
- Ein Theme ist eine Weltidentität, keine Spawn-Tabelle.

**Klassifikation** (Delta `dungeon`, `delta-0.95`):
- `theme`, `rank_min`/`rank_max`, `level`, `control`, `how: seen|guild|hidden|rumor`.
- `seen`/`guild` ist kanonisch und Alaric bekannt.
- `hidden` ist kanonisch und ihm unbekannt: nicht im HUD, wohl beim Narrator. Erst `guild` oder `seen` macht es ihm bekannt.
- `rumor` ist nur Gerücht und erscheint im HUD als „rumoured“.
- Spätere andere Werte werden mit `world_canon` abgelehnt und als Korrektur erzählt.
- Kreaturenprofile hängen weiter am Gefahrenkontext des Ortes (`chooseCreatureLevel`), nie an Alarics Level oder an diesen Metadaten.

**Novice-Dungeons:** Je Startstadt einer, weil die Startstadt zufällig gewählt wird:

| Dungeon | Nahe | Rang | Theme |
|---|---|---|---|
| Mossback Warrens | Ashbridge | F–E (Ebene 1 F, Ebene 2 E) | Goblin-Tunnel |
| Glimmerdeep Grotto | Glassmere | F | Kristallhöhlen |
| Old Crown Catacombs | Alderwatch | F–E | Untote Katakomben |

- Sie werden beim Kampagnenstart in den Ortsbaum gesetzt (`seedPlaces`): im Reich, mit `near`/`where`, klassifiziert und in Räumen erkundbar.
- Ein echter Dungeon ist im Reich über seinen Namen eindeutig (`knownByName`): eine neue Erwähnung mit anderem Elternort findet denselben Ort.
- Planner-Katalog: die nahen Dungeons (höchstens zwei).
- Narrator: „KNOWN DUNGEONS NEAR …“ nur in der Gildenhalle oder wenn ein Dungeon zur Sprache kommt.
- Board-Generator: bekommt die nahen Dungeons mit der Vorgabe „höchstens ein Räumungsauftrag, nur in einem Abschnitt passenden Rangs (Novice: F), Name exakt, Abschnitt und konkretes Ergebnis; zählt als Culling-Job“. Das Novice-Profil (Culling, Eskorte, Lieferung) bleibt. Der Auftrag ist ein gewöhnlicher Gildenvertrag (Zählung, READY, Auszahlung nur an der Gilde).

**Tests:** 6 neue Tests in `tests/v4/patch7.test.js` (A1, A2, A3, Worldbuilding 9/10/12/13, 11/14, C3/15/16/17). Zwei bestehende Patch-7-Tests habe ich an das bewusst geänderte Verhalten angepasst: GO zu einem Kartenraum sucht einen Weg; der Narrator-Abschnitt heißt „ROOMS“. Gesamt 849/849.

**Mutationsproben:** 11 Proben; 10 werden erkannt (A1 zweimal, A2, A3 zweimal, Kanon überschrieben, verborgen gezeigt, Gerücht als Kanon, Dungeon-Kopie per Name, Board ohne Dungeon-Vorgabe). Die HUD-Variante von A4 ist äquivalent, weil ein unklassifizierter Komplex nichts anzeigt. A4 ist durch die Daten- und die Kontextprüfung abgedeckt.

**Kosten:**
- Extractor-Systemprompt +195 Token (6.220 → 6.415, Delta `dungeon`); Planner unverändert (6.300).
- Narrator in einem echten Dungeon ~156 Token (DUNGEON + ROOMS); KNOWN DUNGEONS ~109 Token nur bei Bedarf.
- Board-Generator: eine Zeile, wenn ein Dungeon nahe ist.
- Keine neuen LLM-Aufrufe.

**Grenzen:**
- ~~Kreaturenstärke in Dungeon-Ebenen folgt noch nicht dem Ebenen-Rang (Balancing, Patch 9/10B); der Narrator kennt den Rang.~~ Behoben im Final Review (unten): Die Stufe neuer Kreaturen folgt dem Rang-Band. Weiteres Balancing bleibt Patch 9/10B.
- Kontrolle und Zugang sind Information, keine Lizenz- oder Gebührenmechanik.
- `rooms` ersetzt das `dungeon: true` aus c.6.6.15; ein so markierter Altstand gilt weiter als in Räumen erkundbar, nicht als echter Dungeon.

#### Final Review: Rang-Konsistenz, Wissensgrenzen und Board-Limit (4.3.0-c.6.6.17, Abschluss Patch 7)

Ausgangsstand e4d61b8. Alle drei Lücken habe ich vor dem Fix mit Tests reproduziert (rot).

| Fall | Ursache | Fix |
|---|---|---|
| 1: Ein Goblin der Mossback Warrens (Rank F–E) bekam Stufe 1, eine Kreatur einer A-Rang-Krypta ebenfalls | `materialise()` wählte die Stufe nur aus dem Gefahrenfakt des Ortes (`danger`); im Dungeon fehlt er, `unknown` ergibt 1–1. Die Dungeon-Klassifikation floss nie ein | In einem echten Dungeon (`trueDungeonOf`) würfelt die Engine die Stufe einer neuen Kreatur ohne eigene Stufe einmal aus dem Rang-Band (`rules.ranks.bands`, F 1–14 … S 90–104). Maßgeblich ist der Rang der Ebene, auf der sie getroffen wird (`rankAt`: `levels[n]`, sonst der Gesamtrang des Dungeons). Das Ergebnis steht im Profil. `met_at` hält den Raum der ersten Materialisierung fest. Alarics Level, Power-Rank und Gilden-Rang fließen nicht ein. Eine eigene Stufe der Kreatur und ein vorhandenes Profil bleiben. Unklassifizierte Ruinen und Wildnis nutzen weiter `chooseCreatureLevel` |
| 2: Das Board veröffentlichte, was die Welt verborgen hält | `boardRequest` nutzte `dungeonText(…, {all: true})`, also auch `hidden`-Felder | Kleine Trennung der Wissensebenen: `dungeon.guild` listet die Felder, die die Gilde in ihren Akten hat (Content-Dungeons beim Seed vollständig; im Spiel nur durch `how: 'guild'`). Board und die Narrator-Zeile „KNOWN DUNGEONS NEAR …“ nutzen `dungeonText(…, {guild: true})` und `nearDungeons(…, {guild: true})`: weder Verborgenes noch das, was nur Alaric gesehen hat, noch Gerüchte. Spielstände von vor diesem Build ohne `guild` zeigen Content-Dungeons wie gesät (`guildRecord`) |
| 3: Zwei Dungeon-Aufträge auf einem Novice-Board wurden angenommen | `parseBoard` kannte nur Rang, Level und Anzahlen | `parseBoard(answer, content, need, state)`: Ein Listing, das einen gildenbekannten nahen Dungeon beim Namen nennt, ist ein Dungeon-Auftrag. Höchstens einer pro Board, auch über einen Nachschub hinweg (ein Titel in `need.have`, der den Dungeon nennt, zählt mit). Liegt nicht der ganze Rang-Bereich des Dungeons im Board-Rang, muss das Listing eine Ebene nennen (`level 1`, `first level`), deren Rang die Gilde kennt und die passt. Ein abgelehntes Listing löst wie bisher die eine Reparaturrunde aus. Kein Ersatzauftrag, kein zusätzlicher Aufruf. Beim Nachschub sagt der Prompt zudem: „A Dungeon job is on the board already“ |

**Tests:** 5 neue Tests in `tests/v4/patch7.test.js` (final 1/2/4, 3/6, 5, 7/8, 9/10/11). Sie decken die zwölf geforderten Fälle ab. Fall 12 (Fold, Swipe/Replay) prüfen Test final 1/2/4 (Fold gleich Live-Stand) und die bestehenden Patch-7-Tests. Gesamt 854/854; alle vier Smokes grün (`smoke:st` 50/53 wie zuvor, gleiche false-Schlüssel).

**Mutationsproben:** 13 Proben, alle erkannt: Rang ignoriert, Ebenen-Rang ignoriert, `met_at` entfernt, Board-Text `all` statt `guild`, Board-Liste ohne Gilden-Filter, Gilden-Sicht gleich öffentliche Sicht, Altstand-Fallback entfernt, Seed ohne Gilden-Schlüssel, Kontext ohne Gilden-Sicht, Zählprüfung entfernt, bestehender Auftrag nicht gezählt, Abschnittsprüfung entfernt, Ordinalzahlen nicht gelesen.

**Kosten:**
- Board-Prompt bei frischem Board byte-identisch (System 1.625, User 189 Token).
- Beim Nachschub mit bestehendem Dungeon-Auftrag 54 Token kürzer (203 → 149).
- Extractor 6.415 und Planner 6.300 unverändert.
- Keine neuen LLM-Aufrufe.

**Grenzen:**
- Kreaturen, die vor diesem Build ein Profil bekamen, behalten es; es wird nichts neu berechnet.
- Die Abschnittsprüfung erkennt Ebenen über Zahl oder Ordinalzahl. Ein Listing, das einen Teil nur poetisch benennt („the burrows“), gilt als „kein Abschnitt“ und wird in einem gemischtrangigen Dungeon abgelehnt.
- Ein Dungeon-Auftrag wird über den exakten Dungeon-Namen erkannt, so wie der Prompt es verlangt.

Patch 7 ist damit bereit für den Live-Test mit GLM-5.3-Flash.

### Hotfix 4.3.0-c.6.6.18: Scorchburst Scroll (Live-Test 20.10.2026, kein Patch 8)

**Fehler (reproduziert am Live-Chat `tests/v4/live_1020.json`, #37):**
- Alaric warf den bei Marrec gekauften `scorchburst scroll, first-circle, one use` auf die elf übrigen Kristallkäfer.
- Der Planner las richtig `use` des Scrolls.
- Der `use`-Handler (`src/v4/commands.js`) kennt Verbrauchsgüter nur als verbrauchbar. Er buchte deshalb `object.consumed` und `cmd.resolved` und sonst nichts: kein Kampf, kein Schaden.
- Der Narrator erzählte trotzdem die Feuerexplosion.

**Effektmodell (klein, datengetrieben):**
- **Profil:** `content/gear.json` `item_effects` beschreibt offensive Verbrauchsgüter in der Form eines Skills (`item: true`). Der Loader registriert sie unter ihrer Id in `content.skills`, aber nicht unter einem Namen: Alaric kennt keinen Skill, er hält ein Ding.
- **Scorchburst-Profil:**
  - F-Rang, magisch, Feuer, geworfen bis SHORT.
  - Fester Rohwert 22. Das ist der Wert des Scrolls selbst, vergleichbar mit Arcane Burst eines F-Rang-Magiers (INT 6, MATK 6: 21,5). Er hängt nicht an Alarics Level, Werten oder Power-Rank und nicht an den Gegnern.
  - Fläche `burst` mit höchstens 3 Zielen, 1 Nutzung. (Überholt durch Patch 7.1: Power 32, kein Trefferlimit, Cluster-Modell.)
- **Erkennung:** `itemEffectOf` nimmt das eigene `effect` eines Objekts, sonst das Profil, dessen `match`-Wörter (`scorchburst`, `scroll`) alle im Namen stehen. Damit wird auch der unter c.6.6.17 gekaufte Scroll erkannt, unabhängig von Turn und Objekt-Id. Neue offensive Verbrauchsgüter brauchen nur einen weiteren Eintrag.
- **Planner-Abbildung:** `mapPlan` macht aus dem `use` eines gehaltenen Dings mit Angriffsprofil (`itemAttack`) einen Angriff mit diesem Profil (`item`).
  - Ein genanntes Ziel bleibt das Ziel.
  - Sonst wählt `burstAim` die Distanz innerhalb der Reichweite, in der die meisten sichtbaren Gegner stehen (bei Gleichstand die nähere), und darin den ersten.
  - Ist niemand in Reichweite, kommt das vorhandene System-Panel „TARGET NEEDED — Nothing was spent or rolled“ ohne Narrator-Aufruf.
  - Ein Schritt in derselben Nachricht wird nicht mitgenommen („er wirft von dort, wo er steht“).
  - Planner-Schema und Prompt bleiben unverändert.
- **Ziele (`burstCaught`):** Getroffen wird das Ziel und, wer in derselben Distanz zu Alaric steht, Freund wie Feind, in Kampf- und dann Szenenreihenfolge, höchstens 3. Die Distanz zu Alaric ist das einzige räumliche Wissen der Engine. Ein Burst trifft nie alle eines Raums oder einer Art, nur weil sie dort sind.
- **Kampf:** Alles läuft über den bestehenden Pfad (`storyTurn` → `combatTurn` → `runCombat` → `attackAction`/`resolveStrike`). Es gibt keine zweite Schadensrechnung.
  - Ohne Kampf eröffnet der Wurf einen Kampf (First Strike), mit den Getroffenen als Combatants.
  - In einem Kampf treten Getroffene außerhalb dazu.
  - Jede Kreatur behält ihr eigenes Profil (Level, HP, MDEF).
  - HP, Tode, XP, Loot und Auftragsfortschritt laufen über die vorhandenen Verfahren.
  - `attackAction` erlaubt das Profil nur mit dem gehaltenen Item (`extra.item`): ohne Proficiency, ohne MP, mit Reichweitenprüfung.
- **Verbrauch:** `object.consumed` wird genau einmal gebucht, und erst wenn der Angriff aufgelöst wurde (`usedUp`). Ein abgelehnter Wurf (niemand in Reichweite, Ziel zu weit, unzulässig im Kampf) verbraucht nichts. Der alte `use`-Handler lehnt ein Angriffs-Item ab, statt es still zu verbrauchen.
- **Narrator und Panel:** Der Record nennt das Item und „used up“ und dass der Burst genau die gelisteten Ziele trifft, niemanden sonst. Es gilt die bestehende Regel „Narrate exactly these resolved steps“.

**Tests:** 7 neue Tests in `tests/v4/hotfix_scroll.test.js` (Fälle 1–9 der Vorgabe, dazu Kampf-im-Kampf und XP/Loot), alle am Live-Chat. Gesamt 861/861. Alle vier Smokes grün; `smoke:st` 50/53 mit unveränderten false-Schlüsseln. 11 Mutationsproben, alle erkannt. Extractor 6.415 und Planner 6.300 Token unverändert; kein zusätzlicher LLM-Aufruf.

**Swipe, Regenerate und Replay:**
- Der Spielerzug liegt mit seinen Events auf der Spielernachricht. Swipe und Regenerate verwenden diese Events wieder, solange der Text der Nachricht gleich ist (Hash). Das ist die gewollte Replay-Semantik: gleiche Würfel, keine Doppelbuchung.
- Ein bloßes Regenerate von #38 behebt den alten Zug deshalb **nicht**: Es nutzt die c.6.6.17-Events von #37 (Verbrauch ohne Wirkung) weiter. Das prüft Test 7.
- Neu ausgeführt wird der Zug erst, wenn die Spielernachricht neu ist (gelöscht und neu gesendet) oder ihr Text sich ändert (bearbeitet). Dann sind die alten Events mit der alten Nachricht verschwunden; im ganzen Chat gibt es genau einen Verbrauch.
- Weitere Swipes des neuen Zugs nutzen wieder dessen eigene Events: kein doppelter Schaden, keine doppelte XP, kein zweiter Verbrauch.

**So führst du #37 unter dem neuen Build erneut aus:**
1. Extension auf `4.3.0-c.6.6.18` aktualisieren und SillyTavern neu laden. Die Statuszeile der Extension zeigt dann „Avereth Engine 4.3.0-c.6.6.18“.
2. Im Chat die letzte Narrator-Antwort (#38, „The word left his mouth …“) und deine Nachricht #37 („\*i say\* Thornash \*and throw the scroll at them\*“) löschen. Danach steht der Chat bei #36: Der Scroll ist wieder in „Carried“, kein Kampf.
3. Denselben Text erneut senden. Der Planner liest wieder `use`; die Engine löst den Wurf jetzt als Kampf auf. Das System-Panel zeigt „Alaric: Scorchburst scroll (FIRST STRIKE) → … · scorchburst scroll, first-circle, one use used up“ mit drei Treffern.
4. Danach nur noch normal swipen oder regenerieren. Das verwendet die neuen Events wieder.
- Alternativ kannst du nur #38 löschen und #37 bearbeiten (jede Textänderung) und dann regenerieren.

**Hinweis zum Live-Stand (kein Teil dieses Fixes):**
- Die zwölf Käfer haben seit Turn 15 feste Profile aus dem F-Band des Final Reviews: Level 13, 5, 13, 14, 3, 13, 5, 14, 5, 3, 9, 6.
- Mit dem Live-Seed trifft der Wurf die Käfer E, F und G in SHORT (Level 5, 13, 14): 23, 19 und 18 Schaden.
- Die drei schlagen sofort zurück: 27 + 27 + 13 in Runde 1, 24 in Runde 2. Alaric (71 HP) stirbt deterministisch in Runde 2.
- Das ist die Folge der festen Käfer-Level und seiner Wahl, kein Fehler des Scrolls. Das Balancing des F-Bands gegen Level-1-Charaktere bleibt eine Frage für Patch 9/10B.

### Patch 7.1 (4.3.0-c.6.6.19): Item-Stärke, Rank-Anforderungen und echte AoE

**Item-Werte als Snapshot (`objects[id].profile`):**
- Ein konkreter Gegenstand bekommt seine Werte einmal, wenn er etabliert wird. Wege dorthin: eine Angebotszeile, Loot, die Story (`object.new`) oder das Nehmen.
- Beim Kauf wird genau das Profil der Angebotszeile übertragen (`src/v4/trade.js`), ohne neue Berechnung und ohne Würfel. Spätere Änderungen an `content/gear.json` ändern kein bestehendes Item.
- Die Werte kommen aus `src/v4/items.js` `itemProfile`:
  - **Angriffsitems:** Standardprofil der Art (`item_effects`) × Qualität × Rank-Faktor (1 + 0,75 R). Das Profil enthält Power, Schadensart, Reichweite, Fläche, Nutzungen und den Rank.
  - **Ausrüstung:** Die Art (Fokus, Schild, schwere oder leichte Rüstung, Waffe) wird über Wörter im Namen erkannt. Die Werte liegen im F-Referenzbereich (`f_rank_reference`), dessen Position die Qualität bestimmt; außergewöhnliche Stücke liegen darüber. Ein Rank im Namen („E-Rank“) wird übernommen.
  - **Content-Vorlagen** (Starter-Stab) behalten ihre Werte.
- **Qualitätsstufen** (`gear.json` `instances.quality`): crude, common, fine, superior, exceptional. Das stärkste genannte Wort entscheidet.
- **Gewöhnliche Dinge** (Essen, Werkzeug, Dokumente, Ressourcen) bekommen kein Profil.
- **Abwärtskompatibilität:** Loot-Ausrüstung aus c.6.6.4 wird über ihre gespeicherten `rank` und `gear` gelesen (`profileOf`). Ein Scroll ohne Snapshot (der Live-Scroll aus c.6.6.17) nutzt das aktuelle Standardprofil seiner Art.
- **Kein Zugriff für den Extractor:** Ein `profile` in einer Angebotszeile ist nicht Teil seines Vokabulars. Das Schema lehnt es ab, und die Engine übernimmt aus einer Zeile nur Wortlaut, Art, Menge und Preis.

**Ausrüstung mit eigenen Werten:**
- Ein eigenes Stück wird als Inline-Item getragen (`equipment[slot] = {object, atk, matk, def, mdef, rank, family, …}`). Es fällt nie auf eine gleichnamige Vorlage zurück.
- Beim Ablegen, Wechseln oder Fallenlassen kehrt das Objekt mit seinen Werten zurück.

**Preise:**
- Händler nennen ihre Preise weiter selbst (`price_cp`). Die Engine bucht exakt den vereinbarten Preis.
- Jede Angebotszeile trägt zusätzlich ihren Richtwert (`profile.value_cp`):
  - Ausrüstung: Punkte × 8 cp × Rank-Faktor.
  - Angriffsitems: Power × 0,6 cp × 1,5 bei Flächenwirkung × Nutzungen × Rank-Faktor.
- Bei gleicher Art ist die stärkere Variante mehr wert. Ein Preis außerhalb des 0,5- bis 2-Fachen bekommt einen `audit`-Vermerk an der Zeile. Er wird nicht abgelehnt, denn Händler dürfen abweichen.
- Beispiele für F-Rang:

| Item | Wert | Richtwert |
|---|---|---|
| rusty sword | ATK 4 | 32 cp |
| iron sword | ATK 6 | 48 cp |
| fine longsword | ATK 8 | 64 cp |
| masterwork longsword | ATK 10 | 80 cp |
| enchanted longsword | ATK 12 | 96 cp |
| crude scorchburst scroll | Power 24 | 22 cp |
| scorchburst scroll | Power 32 | 29 cp |
| fine scorchburst scroll | Power 40 | 36 cp |
| superior scorchburst scroll | Power 48 | 43 cp |
| enchanted scorchburst scroll | Power 59 | 53 cp |

**Scorchburst:**
- Ein gewöhnlicher Scroll hat Power 32. Das sind etwa anderthalb Arcane Bursts eines F-Magiers am Bandanfang (21,5) und liegt unter Flame Lance als Einzelzielangriff (36,25).
- Gegen gewöhnliche F-Kreaturen (MDEF 0–3, 34–86 HP) richtet er 28–35 Schaden je Ziel an: spürbar, aber kein sicherer Kill über Level 5.
- Der Richtwert passt zum Livepreis von 25 cp.
- Die Power gehört dem Item: kein INT, kein MATK, kein Level, keine Proficiency (`share: 0`). Die Schadensrechnung ist unverändert `resolveStrike`.

**Rank-Anforderung (`rankRefusal`):**
- Rankgebundene Ausrüstung und Angriffsitems sind nur bis zum eigenen Power-Rank nutzbar.
- Ein Profil kann mit `requires_rank` eine Ausnahme festlegen.
- Geprüft wird an drei Stellen: beim Ausrüsten (Handler), beim Aktivieren (Engine, vor jedem Kampf) und im Kampfpfad (`attackAction`).
- Eine Ablehnung verbraucht, bucht und würfelt nichts. Besitzen, Tragen und Verkaufen bleiben möglich.

**AoE ohne Trefferlimit (Cluster):**
- `max_targets` und jede Kappung sind entfernt.
- Ein `burst` trifft das Ziel und alle im selben **Cluster** (enger Knoten) in derselben Distanz zu Alaric, wie viele es auch sind (`burstCaught`). Freunde und Unbeteiligte zählen mit.
- **Herkunft des Clusters:**
  - Ein neues Feld `cluster` im Position-Delta legt ihn fest: ein kurzes Wort für alle, die die Erzählung dicht zusammenstellt. „apart“ stellt jemanden allein.
  - ~~Ohne ein solches Wort stehen Kreaturen, die eine Erzählung gemeinsam als Gruppe einführt, zusammen.~~ Korrigiert in c.6.6.20, siehe unten.
  - Wer allein steht, wird allein getroffen. Dasselbe Distanzband allein reicht nie.
- **Persistenz:** Ein Engine-Schritt behält den Cluster (der Reducer übernimmt ihn bei einer reinen Band-Änderung). Wer aus dem Band rückt, ist nicht mehr im Knoten.
- **Unveränderliche Treffer:** Die Treffer werden aus dem gespeicherten Zustand zum Zeitpunkt des Wurfs berechnet. Spätere Berichte ändern sie nicht.
- **Zielwahl:** Ohne genanntes Ziel wählt `burstAim` den Knoten mit den meisten Feinden in Reichweite.
- Arcane Burst (`caster_engaged`) trifft wie bisher alle ENGAGED, ohne Limit.

**Tests:**
- 14 neue Tests in `tests/v4/patch71.test.js` (Fälle 1–18), dazu die angepassten Hotfix-Tests (10 statt 3 Treffer, Power 32) und eine Loot-Profil-Prüfung in `c664`.
- Gesamt 875/875. Alle vier Smokes grün; `smoke:st` 50/53 mit gleichen false-Schlüsseln.
- 19 Mutationsproben, alle erkannt.

**Kosten:**
- Extractor +76 Token (6.415 → 6.491, Feld `cluster`, `delta-0.96`).
- Planner unverändert (6.300).
- Keine neuen LLM-Aufrufe.

**Live-Stand Glimmerdeep (c.6.6.19, überholt durch c.6.6.20):** Die Prognose von zehn getroffenen Käfern beruhte auf dem Gruppen-Fallback und gilt nicht mehr.

### Patch 7.1 Final Review (4.3.0-c.6.6.20): Gruppe ist kein Cluster, Rank in Klammern

**1. Gruppe ist kein räumlicher Cluster:**
- `clusterOf` (`src/v4/scene_handles.js`) liest nur noch `scene.positions[id].cluster`. Der Rückfall auf `entities[id].group` ist entfernt. Die Gruppe beschreibt, wer jemand ist, nicht wo er steht.
- Ohne etablierten Cluster steht jeder allein, und ein Burst trifft nur sein Ziel. Es werden keine Treffer erfunden.
- **Woher der Cluster kommt:**
  - `creature.new` hat ein neues, optionales Feld `cluster`. Der Extractor setzt es nur, wenn die Antwort die Gruppe dicht gedrängt zeigt. Die Engine speichert es beim Einführen für alle Anwesenden (`src/v4/world.js`).
  - Später setzt das Position-Delta den Cluster, für Einzelne oder für eine Gruppe über ihren Ref.
  - „apart“ nimmt jemanden heraus.
- Unverändert bleiben: kein Trefferlimit, alle im Knoten werden getroffen, Friendly Fire, persistente Positionen, deterministische Treffer und Replay, keine zusätzliche LLM-Phase.
- Extractor-Vokabular `delta-0.97`: +53 Token (6.491 → 6.544). Planner unverändert (6.300).

**2. Rank in eckigen Klammern:**
- `rankInName` (`src/v4/items.js`) erkennt `[D] wand`, `[D-Rank] wand`, `D-Rank wand`, `D rank wand`, `Rank D wand`, `Rank-D wand` und `D-ranked` für F, E, D, C, B, A und S, in jeder Groß- und Kleinschreibung.
- Vorher fand das `\b` vor `[` nie einen Treffer, und `[D] wand` wurde als F gespeichert.
- Nicht als Rank gelesen werden „a rank, rotting hide“ (Adjektiv), „frank“, „ranks“ und „cranky“.

**Glimmerdeep-Livefixture neu geprüft:**
- #30 beschreibt die Käfer als „clustered along a wall vein“. Die Extraktion lief unter c.6.6.17 und kannte noch kein Feld `cluster`.
- #36 beschreibt sie danach als „spreading into a loose half-circle“, also aufgefächert.
- Der gespeicherte Zustand bei #37 enthält deshalb keinen Knoten: zwölf Käfer einer Gruppe, zehn davon in SHORT, jeder für sich.
- Ein erneut gesendetes #37 trifft nur Käfer A, den nächsten bei Alaric (ENGAGED, Level 13): 28 Schaden, 82 → 54 HP.
- Käfer A beißt zweimal (28 und 25). Alaric bleibt mit 18 von 71 HP am Leben. Der Scroll ist verbraucht.
- Die Prognose „zehn Treffer“ gilt nur, wenn die Erzählung die zehn ausdrücklich zusammenstellt. Der Test injiziert diesen Fall und prüft ihn getrennt.

**Tests:**
- 3 neue Tests in `tests/v4/patch71.test.js`:
  - zwölf Goblins in SHORT, vier davon im Knoten → genau vier Treffer;
  - Knoten über `creature.new`, über den Gruppen-Ref und „apart“;
  - Rank-Schreibweisen F bis S.
- Angepasst: `hotfix_scroll` 1–5, 2b, 3b, 9 und Patch-7.1-Test 13/14 und Extractor-Pfad. Wo zehn oder drei Treffer erwartet werden, ist der Knoten jetzt ausdrücklich gesetzt.


### Patch 7.2 (4.3.0-c.6.6.21): Konsolidierung und Grundlage für Verbrauchsgüter

**7.2A – V4-C als Produktpfad:**
- Der Planner ist Standard für neue Kampagnen (`index.js` `DEFAULTS.planner: true`). Das Panel heißt „Semantic planner (V4-C) for new campaigns“.
- Eine neue V4-Kampagne speichert ihren Pfad in `campaign.started` (`path: 'c'|'a'`). `campaignPath` (`src/v4/runtime.js`) liest ihn, die Einstellung ändert ihn nie.
- **Ältere Kampagnen** haben keinen Pfad gespeichert. Sie folgen der Planner-Einstellung, wie sie vor 7.2 gespeichert war:
  - `src/settings.js` `migrateSettings` friert beim ersten Laden ohne `settingsRev` den gespeicherten Wert als `legacyPlanner` ein.
  - Erst danach wird `planner` für neue Kampagnen auf `true` gesetzt.
  - Ein vor 7.2 gespeichertes „aus“ ist vom alten Standard nicht zu unterscheiden. Laufende Spiele behalten es, neue starten auf V4-C. Wer V4-A für neue Kampagnen will, schaltet den Planner im Panel wieder aus; diese Wahl bleibt.
- Ein Planner-Fehler bricht den Zug mit Hinweis ab und fällt nie auf den Interpreter zurück. Swipe und Regenerate nutzen die gespeicherten Entscheidungen.
- Historischer Stand vor 7.2: Commit `9e949c1` (4.3.0-c.6.6.20). Der Tag `avereth-4.3.0-c.6.6.20` ließ sich aus der Sitzung nicht pushen (Git-Proxy); nachholen mit `git tag avereth-4.3.0-c.6.6.20 9e949c1 && git push origin avereth-4.3.0-c.6.6.20`.
- Smokes: `smoke:st:c` prüft den neuen Standard (Planner an, Pfad `c`). `smoke:st:v4` und die V4-Seite von `smoke:browser` spielen V4-A bewusst gewählt (Pfad `a`).

**7.2B – Identität und Gruppenkardinalität:**
- **Neues Modul `src/v4/identity.js`** (nebenwirkungsfrei):
  - `groupMembers`: welche Kreaturen hier eine Gruppenreferenz meint.
  - `groupWords`: ob eine Referenz eine Gruppe nennt, die die Engine nicht auflösen kann.
  - `resolveRef` → `single` | `all` | `unclear`.
  - Die bisherigen Closures `members` und `groupWords` in `world.js` sind jetzt dünne Aufrufe. Stufe A lief ohne Verhaltensänderung: 882/882 Tests unverändert grün.
- **Vertrag `delta-0.98`:** `hostile`, `intent`, `aware` und `position` haben `scope` (`all`|`part`|null) und `evidence` (Zitat). Regel GROUP REFS: Ein Wesen nennt der Extractor über sein Handle. Ein Gruppen-Ref zählt nur mit `scope: "all"`. `"part"` und `null` buchen niemanden.
- **Prüfung von `evidence`:**
  - Das Zitat muss in der Antwort stehen.
  - Eine darin genannte Zahl muss der Gruppengröße entsprechen.
  - Das ist kein Beweis für „alle“. Diese Deutung bleibt beim Extractor.
- **Ablehnung:** Ein ungeklärter Gruppen-Ref wird als `group_unclear` auditiert. Bei `hostile` und `intent attack` bekommt der Narrator eine kurze Korrektur.
- **Live-Fall Glimmerdeep:** Der Swarm-Ref ohne `scope` für den Biss eines einzelnen Käfers bucht keinen Schwarm mehr. Das eigene Handle bucht genau diesen Käfer.
- **Gefundener Fehler:** Ein Neuzugang einer Gruppe wurde nach der Zahl der Lebenden nummeriert (11 + 1 = „12“). Diese Nummer gehörte durch den toten Käfer E schon Käfer L, der Neue ging verloren. Neue Nummern meiden jetzt jede bestehende Kreatur (`takenRef`).
- **Aufgezeichnete Live-Läufe:** Sie stammen aus dem alten Vertrag. `tests/v4/replay_lib.js` `answerOf` ergänzt für ihre drei Gruppen-Refs `scope: "all"` mit dem wörtlichen Zitat; die Engine prüft das Zitat gegen die Prosa.
- **Extractor-Kosten:** +223 Token (6.544 → 6.767), gemeinsam mit 7.2D. Planner unverändert (6.300).

**7.2C – Kampfwahrheit in Facts, Memories, Threads und Questnotizen:**
- **Eine gemeinsame Prüfung:** `src/v4/combat_truth.js` `combatTruth` arbeitet Satz für Satz:
  - Ein Satz, der Tote einer Art zählt oder einen Kämpfer tötet, wird gegen die gebuchten Tode geprüft.
  - Ein Kämpfer, den die Engine lebend führt, gilt als lebend.
  - Eine unbekannte Art zählt nur, wenn Alaric der Töter ist.
- **Angebunden an:**
  - die Fact-Firewall (`ctx.combatClaim`);
  - Memory (Satz weg, Rest bleibt);
  - Thread (Text und Auflösung; eine Auflösung allein aus falschen Toden löst nichts);
  - `quest.detail` (Satz weg);
  - `quest.progress` (abgelehnt).
- **Narrator:** bekommt die Zahl der Engine einmal als Korrektur.
- **Bleibt erhalten:**
  - Was jemand sagt, glaubt oder als Gerücht erzählt (Zuschreibungswort vor der Behauptung).
  - Jeder Thread der Art `rumor`.
  - Die Weltgeschichte anderer („the hunter killed two deer“).
  - Das Kampferinnern ohne falsche Zahl.
- **Grenzen:** Tode in anderen Worten („the swarm is no more“) werden nicht gelesen.

**7.2D – Verbrauchsgüter (heal, restore_mp, restore_sta):**
- **Content:** `content/gear.json` `item_effects` hat drei neue Einträge: Healing potion 30 HP, Mana potion 25 MP, Stamina tonic 30 STA (gewöhnlich, F).
  - Erkennung über `match_any`.
  - Richtwert in `instances.value.restore_cp_per_point` (HP und MP 0,8 cp, STA 0,5 cp je Punkt). Das ist bewusst kein Balancing.
- **Snapshot:** `itemProfile` legt `kind: restore` mit Betrag fest: Standard × Qualität × Rank-Faktor (crude 23, fine 38, superior 45, E-Rank 53 HP).
- **Strukturierte Klassifikation:**
  - `object.new` und Angebotszeilen haben `effect` (heal|restore_mp|restore_sta|null).
  - Die Engine nimmt das Feld nur für ein Verbrauchsgut (`useOf` = consumable). „Rope“ mit `heal` bleibt ohne Wirkung.
  - Unbekannte Tränke haben keine Wirkung.
- **Außerhalb eines Kampfes:**
  - Der `use`-Befehl bucht die Wirkung, nie über das Maximum. Er verbraucht genau die getrunkene Menge.
  - Bei vollem Wert lehnt er ab: nichts wird verbraucht, das Item bleibt.
  - Ein „trotzdem trinken“ ohne Wirkung ist nicht vorgesehen, dafür gibt es kein Feld im Vertrag.
- **Im Kampf (V4-C):**
  - Der Planner macht aus `use` die Hauptaktion (`itemRestore`). Neben dem bestehenden Kampf-Dispatcher läuft der kleine Pfad `src/combat.js` `itemAction`, analog zu `skillAction`.
  - Ein Schritt ist erlaubt. Eine zweite Hauptaktion bleibt NOT TAKEN.
  - Die Initiative bleibt, eine Verpflichtung (Core #23) geht vor. Die Gegner handeln danach.
  - Verbrauch nur nach legaler Auflösung (`usedUp`, wie Scorchburst).
  - Eine Ablehnung kostet nichts, auch keinen Schritt.
- **V4-A:** Der Story-Befehl `use` lehnt im Kampf ab. V4-A hat keinen Item-Pfad im Kampf.
- **Rank:** Eine Rank-Anforderung gilt nur, wenn das Profil `requires_rank` nennt. Der Core bindet Heilmittel an keinen Power-Rank.
- **Anzeige:** Panel und Narrator-Block zeigen den Wert vorher → nachher.
- **Scorchburst:** unverändert. `itemAttack` greift vor `itemRestore`, `itemEffectOf` liefert Angriffsprofile wie zuvor.

**Tests:**
- Neu sind 20 Tests in vier Dateien:
  - `patch72_path` (5, davon einer zur Settings-Migration);
  - `patch72_identity` (7);
  - `patch72_truth` (4);
  - `patch72_items` (4).
- Angepasst wurden Tests, die Gruppen-Refs ohne `scope` nutzten, mit dem Zitat der jeweiligen Prosa: `patch4`, `patch5`, `patch7`, `planner_c`, `runtime`, `c66`, `patch71`, `hotfix_scroll`.
- Gesamt 898/898. 20 Mutationsproben, 19 erkannt. Die überlebende ist gleichwertig zum Original: Ein Schritt vor einer abgelehnten Trank-Aktion würde ohnehin nie gespeichert.

### Hotfix 7.2.1 (4.3.0-c.6.6.22): mehrere GO-Ankünfte, Registrierung als Behauptung

Livetest 20.10.2026 13:37 (`tests/v4/live_1020b.json`, Build c.6.6.21).

**1. Mehrere bestätigte GO-Ankünfte.**
- Ablauf im Livetest:
  - „*i walk into the city ahead and make my way over to the adventurers guild*“: Der Planner las zwei GOs (Alderwatch, dann Gildenhalle).
  - Der Narrator brachte Alaric in die Halle.
  - Der Extractor meldete beide als `arrived` und ein einzelnes `arrive`-Delta für Alderwatch.
- Ursache (`src/v4/world.js`, schon vor 7.2 vorhanden):
  - Das Delta setzte die Ankunft und `explicitArrival`. Damit fiel die Schleife vor den Deltas aus.
  - Die Nachbuchung nach den Deltas lief nur bei `!arrived`. Die zweite Etappe wurde nie gegangen, Alaric blieb in der Straße.
- Fix: Nach dem `arrive`-Delta geht Alaric gleich weiter.
  - Bedingungen für die Weiterreise:
    - Eine GO-Etappe des Zuges nennt diesen Ort.
    - Jede spätere Etappe ist als `arrived` gemeldet.
  - Das passiert vor den übrigen Deltas der Antwort. Wen die Antwort in der Halle trifft (die Angestellte), der ist in der Halle und nicht im Ort davor.
  - Eine frühere Etappe führt nie zurück. Eine nicht gemeldete Etappe beendet den Weg, wo er ist (unterbrochene Reise). Ein Ort, den keine Etappe nennt, verhält sich wie bisher.

**2. Registrierung als Fakt.**
- In der Folge lehnte die Engine Registrierung und Board ab („not at a Guild hall“). Die Geschichte registrierte Alaric trotzdem, und der Fakt „clerk registered_alaric: registration completed“ wurde gespeichert.
- Fix: Ein Fakt, der Alarics Registrierung oder Mitgliedschaft behauptet, wird abgelehnt, solange die Engine ihn nicht registriert hat (`guild.membership`). Das gilt auch, wenn der Fakt über eine andere Person formuliert ist.
  - Dazu kommt eine kurze Korrektur an den Narrator.
- Was erlaubt bleibt:
  - Fakten darüber, was die Registrierung verlangt.
  - Verneinte Fakten („not registered yet“).
  - Dieselbe Aussage, nachdem die Engine registriert hat.
- Der `purpose`-Guard des Planners bleibt unverändert. Seine Ablehnung war Folge des falschen Ortes.

**3. „walk back to the clerk“** (Nebenprüfung, ohne Änderung):
- Der Planner las ein GO zu `{new: "the clerk's counter"}`.
- Der Extractor meldete die Ankunft in der Halle, in der Alaric schon war.
- Es entstanden kein Ort, kein Szenenwechsel und kein anderer Zustandsfehler.

**Tests:** `hotfix_721` (6, aus dem Livetest):
- zwei Etappen, Ziel Halle, die Angestellte dort;
- umgekehrte Antwort;
- unterbrochene Reise;
- Registrierung und Board nach der Ankunft;
- abgelehnter Registrierungs-Fakt;
- erlaubter Fakt nach der Registrierung.

Ohne den Fix scheitern 1, 4 und 5.

**Nachprüfung (drei Etappen):**
- Eine nicht erreichte Zwischenetappe beendet den Weg, auch wenn eine spätere Etappe fälschlich als erreicht gemeldet wird.
- Das gilt nach dem `arrive`-Delta (`laterLegs`) und, schon vor 7.2 offen, ebenso ohne Delta (Schleife vor den Deltas).
- Wird nur die Endetappe gemeldet, geht er wie bisher dorthin.
- Tests 7 und 8 scheitern ohne die Korrektur.

### 4.3.0-c.6.6.23: Dungeon-Auftrag am Board, Lore-Bridge in der Halle

Livetest 21.10.2026 00:16 (`tests/v4/live_1021.json`).

**1. Board scheitert am Dungeon-Auftrag.**
- Ablauf im Livetest:
  - Der Generator schrieb den Auftrag in den Old Crown Catacombs (Rank F–E; level 1: F, level 2: E) für „the upper galleries“.
  - Die Prüfung (`dungeonPartWhy`) liest nur „level N“ und lehnte ab.
  - Der Retry schrieb „upper galleries (Rank F)“ und wurde wieder abgelehnt. Damit scheiterte das ganze Board.
- Ursache:
  - Die Anfrage verlangte „the part (a level, a gallery)“.
  - Die Ablehnung nannte nie die gültige Ebene.
- Fix: Anfrage und Ablehnung nennen jetzt die erlaubte Ebene, hier „level 1“ (`fittingLevels`).
- Die Prüfung bleibt unverändert:
  - Eine Galerie, „upper“ oder ein Rank-Buchstabe allein ist weiterhin keine Ebene.
  - Level 2 (Rank E) bleibt abgelehnt.

**2. World Info.**
- Die Meldung „World info budget reached after 5 entries“ am Board ist das dokumentierte Verhalten (siehe [LOREBOOK.md](LOREBOOK.md), Order).
  - Gilde (290) und Brett (286) bleiben, das Quest-Gerüst (284, 547 Token) fällt.
  - Die Board-Aufträge schreibt ohnehin der eigene Board-Generator ohne World Info.
- Gefunden wurde dabei ein Fehler der Lore-Bridge in V4:
  - Sie nannte in einem Unterort (der Gildenhalle) nur den Unterort, nie die Stadt. Der Stadt-Eintrag (Alderwatch-Seed) aktivierte dort nie.
  - Jetzt nennt sie Reich, Stadt und Unterort.
- Das Lorebook ist unverändert.

**Tests:** `board_1021` (4).

### 4.3.0-c.6.6.24: Kampf ohne Temperament, Skelett-Anchor, Kapitulation ohne XP

Livetest 21.10.2026 00:53 in den Old Crown Catacombs (`tests/v4/live_1021b.json`).

**1. Kein Temperament auf dem Planner-Pfad (C).**
- Der Ansatz stammt aus dem Branch `…-gpt-no-temperament` und ist minimal übertragen, nicht gemergt.
- Im Kampf (`npcDecide`) entscheidet keine Kategorie mehr (skittish, aggressive, defensive, cautious):
  - In Reichweite schlägt der Gegner zu, außer Reichweite rückt er nach.
  - Eine Person, die aus der Ferne getroffen wird und nur im Nahkampf zuschlagen kann, sucht einmal Deckung.
  - Flucht und Kapitulation kommen nur aus dem Intent der Geschichte. Eine laufende Flucht läuft weiter, ein Gefangener kämpft.
- Eine Person greift von sich aus nur an, wenn mindestens eines davon gilt:
  - Schaden;
  - feindliche Haltung (`attitude ≤ -20`);
  - Rolle eines Gesetzlosen (bandit, robber …);
  - sie hat den Kampf selbst eröffnet.
- Wachen sind damit nicht mehr per Etikett aggressiv. Ein Unbeteiligter, den Alaric trifft, wehrt sich als Person. Ein Tier, das die Geschichte als kein Feind zeigt (`threat: false`), weicht zurück.
- Die Story-Hülle nennt für Tiere keine „Skittish by nature“-Zeile mehr.
- Hintergrund-Herden erkennt die Engine an `threat: false`, nicht an „skittish“.
- V3 und V4-A sind unverändert.
- Im Livetest wichen die Skelette auf dem Ratten-Body-Plan („skittish, threatened: gains distance“, „skittish, wary: seeks cover“) Runde um Runde zurück.

**2. Skelett-Anchor.**
- Neuer Body-Plan `skeleton` als Engine-Ergänzung, nicht aus Content #7:
  - Werte 30/10/2/0/8;
  - Angriff „Bony strike“;
  - Loot: Bone und Grave Dust statt Pelt und Tail.
- Er steht im Anchor-Enum des Extractors.
- Benennt die Spezies eindeutig die Aliase eines anderen Body-Plans („restless skeleton“) und die des gewählten nicht, gilt der benannte. Im Livetest wählte der Extractor „rat“.
- Das Schema verlangt `temperament` nicht mehr.

**3. Kapitulation ohne XP.**
- Eine Kapitulation beendet die Teilnahme des Gegners, gibt aber keine Defeat-XP.
- Wird derselbe Gegner danach getötet, zählt seine XP genau einmal (`xp_counted`).
- Im Livetest: 156 XP für die Kapitulation, 156 erneut für den Kill. Jetzt: 0 und dann 156.
- Die XP-Werte (60/96/156 aus Level 5/8/13) sind unverändert.

**4. Toter Gegner als Ziel.**
- „*i Basic Attack D*“ mit D tot: Der Planner setzte C ein.
- Nennen die Worte das Handle eines anderen Wesens derselben Art, gilt dieses (`namedPeer`). Ein toter Gegner wird nicht angegriffen und nicht ersetzt; nichts wird verbraucht, das Panel sagt es.

**5. Combat Truth.**
- „the restless skeleton in the First Burial Gallery was destroyed … Alaric's bolt“ wurde als getötete „first burial gallery“ gelesen, mit der Korrektur „killed none“.
- Ein Zählausdruck direkt nach einer Ortspräposition benennt den Ort, nicht die Toten.

**Tests:** `combat_1021` (5). Ohne Fix scheitern alle 5. Angepasst wurden die Temperament-Erwartungen auf Pfad C in `planner_c4`, `planner_c6`, `c66` und `c665`; die Legacy-Erwartungen bleiben.

### Patch 8 (4.3.0-c.6.6.25): Living Dungeons

Vollständige Beschreibung, Architekturentscheidungen, die drei Review-Runden und die Grenzen: `docs/PATCH8_LIVING_DUNGEONS.md`.

- **Neues Modul `src/v4/living.js`.** Ein System-Dungeon wird beim ersten Kontakt einmal festgelegt (`dungeon.established`):
  - Gate mit Zugang, Gebühr und Kapazität;
  - Ebenen mit Rank, Level-Fenstern je Rolle und Begegnungs-Slots;
  - Wächter und Endboss;
  - Zyklus und Gruppen;
  - Fundstellen.
- **Seeds und neue Dungeons.** Die Seeds haben eigene Einträge (`lore.json dungeons[].living`). Neue Dungeons erhalten die Struktur aus ihrer Klassifikation.
- **Begegnungen.** Die Engine platziert die nächste Begegnung, bevor der Narrator erzählt („DUNGEON AHEAD“). Der Extractor meldet sie per Slot-Ref. Bleibt sie aus, ist sie trotzdem da.
- **Ebenenabschluss.**
  - Floor-Clear mit Credit.
  - Siegel (Old Crown).
  - Reset nie im Kampf und nie vor Alarics Augen, mit Verfallsregel für Altbeute.
- **Gruppen.** Andere Gruppen gehen nach einem deterministischen Tagesplan in den Dungeon. Sie füllen die Belegung und nehmen Begegnungen. Ihre Anführer sind stabile NPCs.
- **Aufträge.**
  - Cull-Aufträge zeigen ihre Zahl („(4)“, „2/4 defeated“).
  - Clear-Aufträge zeigen ihre Ebene und hängen am Ebenenstatus.
  - Bei fremdem Clear werden sie zurückgezogen.
- **Rückkehrstein** als seltener Wächter- oder Boss-Drop.
- **Pacing-Klausel** auf jeder GO-Zeile.
- **.24-Fehler:**
  - Kapelle → Gate;
  - Treppe → Level 2;
  - neue Anchors Ghul, Schleim, Goblin-Schamane.
- **Tests:** `tests/v4/patch8.test.js` (16), Fixture `tests/v4/live_1021c.json`.

### Patch 8.1 (4.3.0-c.6.6.26): Dungeon-Gate, Gruppenkampf, Spielintegration

Livetest 21.10.2026 10:17 (`tests/v4/live_1021d.json`). Vollständige Beschreibung, Entscheidungen, drei Reviews und Grenzen: `docs/PATCH8_1_GATE_GROUP_COMBAT.md`.

- **Gate.**
  - Das kanonische Gebührenangebot `offer.gate.*` entsteht idempotent beim Ankommen am Gate.
  - Ein Story-Angebot über Eintritt wird verworfen (`gate_fee`). Andere Waren des Wächters bleiben.
  - Zahlen, Zahlen-und-Eintreten, freie Gates und gültige Pässe verlangen nie einen zweiten Preis.
  - Ein Gildenvertrag für Arbeit in diesem Dungeon (`q.dungeon`) erlässt die Gebühr, wo das Gate es erlaubt (`gate.contract_free`).
- **Anzeige.**
  - Die System-Karte „SYSTEM — DUNGEON GATE“ zeigt Belegung, Kapazität, Zyklus mit Reset in d/h/m, bekannte Ebenen, Zugang und Gebühr.
  - Lore-Sätze erklären Gate-Displays. Glimmerdeep hat Beuterechte.
- **Gruppenkampf (`src/v4/group_combat.js`).**
  - Anwesende Mitglieder einer feindlichen Gruppe kämpfen im selben Encounter.
  - Ein Rudel verteidigt sein Mitglied.
  - `threat: false`, Fliehende, Haltende und Aufgebende bleiben draußen.
  - Unbemerkte Mitglieder kommen erst nach der Eröffnung.
- **Kampfwahrheit.**
  - Die Ebenenzeile zählt lebend/tot.
  - Der Kampfschritt endet mit „STATE NOW — BINDING“.
  - Der Extractor-Katalog nennt RECENT DEAD.
  - Eine leere Extractor-Antwort bekommt eine kurze Nachforderung ohne Echo.
  - Awareness-Evidenz wird teilsatzweise geprüft.
- **Board.**
  - Ein Dungeon-Cull wird auf die Mindestpopulation eines Zyklus begrenzt. Hält der Dungeon die Art nicht, wird das Listing verworfen.
  - `q.dungeon` und `q.floor` werden beim Buchen gesetzt.
  - Die System-Karte „SYSTEM — GUILD BOARD“ zeigt die Listings.
  - „taken/claimed/gone“ über einen Vertrag ist Engine-Zustand.
- **Tests:** `tests/v4/patch81.test.js` (29). Angepasst: `v4_firewall`, `hotfix_scroll`, `patch71`, `patch72_items`.

### Patch 8.2 (4.3.0-c.6.6.27): LLM-Performance, Diagnose und Zuverlässigkeit

Livetest 21.10.2026 13:33 (`tests/v4/live_1021e.json`). Vollständige Beschreibung, Messwerte, Benchmark und Grenzen: `docs/PATCH8_2_LLM_PERFORMANCE.md`.

- **Befund .26.**
  - Der Extractor braucht im Median 22,8 s statt 5,1 s, bei gleichem Systemprompt und +1,6 % Prompt-Token.
  - Gewachsen ist das Reasoning: Completion-Median 702 statt 390 Token, 7 von 18 Erstaufrufen mit ≥ 2.000 Token.
  - Nachricht 36: Der Narrator lieferte nach 4.096 Token keinen Text, der Extractor las die leere Antwort 17,6 s lang.
- **Telemetrie (nur Records, nie Events).**
  - `v4Llm` gibt auf dem Custom-Endpoint `{content, finish_reason, usage}` zurück. `ask()` liest String und Objekt gleich.
  - `callMeta` übernimmt nur Gemeldetes (`finish`, `prompt`, `cached`, `completion`, `reasoning`).
  - Die Aufrufe stehen in `plan.llm`, `interp.llm`, `board.llm` und `extraction.llm`.
  - Die lokalen Kosten stehen in `perf` (`wait_ms`, `engine_ms`, `folds`, `fold_ms`), die Narrator-Zeit in `narration.ms`.
  - Die Statuszeile zeigt „last turn: …“.
- **Leere Narrator-Antwort.**
  - Kein Extractor-Aufruf, `extraction.status: 'skipped'`.
  - Die Warnzeile „NO STORY TEXT …“ und ein Toast melden es.
  - Die Engine-Ergebnisse des Zuges bleiben. Swipe und Regenerate lesen die neue Antwort genau einmal.
  - Die Extractor-Sperre ist unverändert.
- **Benchmark (`tools/bench_extract.mjs`).**
  - Varianten A0 (ohne `reasoning_effort`), A (wie geloggt) und C (A plus Schlussanweisung), verschränkt und mehrfach.
  - Die Engine bewertet nach übernommenen und abgelehnten Deltas und nach der Abweichung zur Live-Welt.
  - Dry-Run auf .26: 17 von 18 Requests zugeordnet und byte-gleich neu gebaut.
  - Der echte Lauf braucht einen Provider-Schlüssel.
- **Tests:** `tests/v4/patch82.test.js` (15).

### Patch 8.3 (4.3.0-c.6.6.28): Dungeon-Etagen, erreichbare Culls, Quest-Kontext

Livetest 22.10.2026 02:00 (`tests/v4/live_1022a.json`). Vollständige Beschreibung, Entscheidungen, alte Spielstände und Grenzen: `docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md`.

- **Etagen.** Das Gate eines echten Dungeons ist Ebene 0. Jeder Weg vom Gate hinein führt auf Ebene 1 (`levelVia`, angepasst an `floorAt`). Gebäude ohne `dungeon.real` bleiben unverändert.
- **Erreichbare Culls.**
  - Die Zahl auf dem Board kommt aus der gezogenen Population des Zyklus, den Alaric antrifft (`runNow`).
  - Zahl und Zählung nutzen dieselbe Regel (`cullKind`): Art nach `namesKind`, Wächter und Boss nur beim Namen.
  - Ein Dungeon-Cull zählt nur in seinem Dungeon und auf seiner Ebene.
- **Cull oder Clear.**
  - Ein Dungeon-Cull mit Zahl bekommt einen Zielzustand aus dieser Zahl.
  - Ein Clear ohne Zahl bleibt ein Clear und wird nicht mehr von der Cull-Prüfung abgewiesen.
  - Der Generator wird angewiesen: „One listing is one of the two, never both“ (`board-4.7`).
- **Kontext.**
  - „locals confirm“ entfällt.
  - QUEST PLAY nennt bei Dungeon-Aufträgen den Dungeon selbst als Komplikation.
  - BLOCKED erlaubt das Herantreten an das Hindernis, aber kein Darüberhinaus.
- **Alte Spielstände:** Gespeicherte Ebenen bleiben unverändert. Der .27-Raum wird nur durch eine neu generierte Nachricht 16 korrigiert. Für den nächsten Dungeon-Livetest wird eine neue Kampagne empfohlen.
- **Tests:** `tests/v4/patch83.test.js` (11, auf `ef4a819` alle rot). Angepasst: `review_4_1_3`, `testrun_v11/live`.

### Patch 8.4 (4.3.0-c.6.6.29): Gruppenreaktion, einheitliche Cull-Zahl

Livetest 22.10.2026 03:42 (`tests/v4/live_1022b.json`). Vollständige Beschreibung, Entscheidungen und Grenzen: `docs/PATCH8_4_GROUP_AWARENESS_CULLS.md`.

- **Gruppenreaktion.**
  - Nur echte Deckung (`scene.concealed`) hält unbemerkte Gruppenmitglieder aus der Eröffnung heraus.
  - Bei einem offenen Angriff sind sie von Beginn an im Kampf: Das Ziel behält seinen Hinterhalt, die anderen handeln danach nach Initiative.
  - Der Kampf geht über einen in der Eröffnung getöteten ersten Gegner hinaus; alle Kämpfer sind `aware`.
  - Ein unbemerkter Kill aus der Deckung bleibt unbemerkt.
- **Cull-Zahl.**
  - Der Task eines reinen Dungeon-Culls nennt die Zahl der Engine: Ersetzt wird nur die eigene Zahl vor dem Art-Wort; ist sie mehrdeutig, gilt der Task der Engine.
  - Gemischte und schützende Aufträge behalten Zielzustand und Pflichten.
  - Die Mengenangabe nennt eine Einheit nur einmal.
- **Tests:** `tests/v4/patch84.test.js` (9; auf .28 sieben rot, zwei Absicherungen grün). Angepasst: `8.1 group 5 (stealth)` nutzt echte Deckung.

### Patch 8.4.1 (4.3.0-c.6.6.30): Stabilisierung nach dem ersten echten Livetest

Erster automatisierter Livetest 22.10.2026 05:43 (`tests/v4/live_1022c.json`). Vollständige Beschreibung: `docs/PATCH8_4_1_LIVETEST_STABILIZATION.md`.

- **Statpunkte.**
  - Worte, die freie Stat Points ausgeben, sind keine Handlung: Die Engine weist sie ab (NOT DONE), der Spieler wird auf `#assign <STAT> <n>` hingewiesen, im Kampf ebenso.
  - Die DOES-Zeile schließt Werte, Statpunkte und Skills aus.
  - Das Level-up-Panel nennt `#assign`.
- **Gegner im Living Dungeon.**
  - Eine erfolgreiche Suche verlangt dort einen Fund oder eine Spur, keinen Gegner.
  - Eine Kreatur, die die Geschichte dort bringt und die keine Begegnung der Engine ist, wird abgewiesen (`dungeon_foe`): kein Wesen, kein Kampf, keine XP. Der nächste Erzählerblock erhält eine Korrektur. Wesen ohne Gefahr und alles außerhalb bleiben.
- **Board.** Ein Clear-Vertrag heißt nicht „Cull …“ (`board-4.8`).
- **Tests:** `tests/v4/patch841.test.js` (11; auf .29 acht rot, drei Absicherungen grün).
- **Live-Runner** (eigener Commit, `docs/LIVE_RUNNER.md`):
  - Der LLM-Spieler spielt die Spielfigur mit kurzen Handlungen, Rede und Befehlen (`#assign` nach dem Level-up).
  - Er schickt die Reasoning-Felder des Profils an denselben Endpoint und dasselbe Modell. Eine Reasoning-Schleife bekommt kürzere Requests statt desselben.
  - Der HUD erscheint als eigener Abschnitt.
  - Eine leere Erzählerantwort beendet den Lauf kontrolliert; ein Befehl mit System-Antwort ist ein gültiger Zug.
  - Hinweise des Runners sind vom Spiel getrennt; Beobachtungen gehören zum Zug davor.
  - Neue Prüfungen `numeric_cull_active` und `open_group_attack` im Leitfaden `patch_8_4`.
  - Tests: `tests/live_runner/patch841_runner.test.js` (13), Stub-Selbsttest 46 Prüfungen (11 neu).

### Patch 8.4.2 (4.3.0-c.6.6.31): Letzte Integrationskorrekturen

Zweiter automatisierter Livetest 22.10.2026 07:49 (`tests/v4/live_1022d.json`). Vollständige Beschreibung: `docs/PATCH8_4_2_FINAL_INTEGRATION.md`.

- **Registrierungsgebühr.** Ein falscher Betrag für die Registrierung wird nicht gebucht (NOT PAID); die Gebühr danach bucht genau einmal.
- **Thread-Bezüge.** Threads gelten mit und ohne Präfix `thread.`; die Auflösungen des Extraktors greifen wieder.
- **HUD.** Tote stehen ohne Entfernung unter Present.
- **Tests:** `tests/v4/patch842.test.js` (7; auf .30 sechs rot, eine Absicherung grün).
- **Live-Runner** (eigener Commit, `docs/LIVE_RUNNER.md`):
  - „done“ des Spielers wird gegen die gebuchten Etappen geprüft (sonst `incomplete`).
  - Nach einer System-Antwort ist das ältere HUD als nicht aktualisiert gekennzeichnet; eigene Nachrichten erscheinen mit `#`.
  - Neuer Leitfaden `patch_8_dungeon_full`: elf Etappen einer Living-Dungeon-Expedition, nur von der Engine Gebuchtes zählt, „nicht durchgeführt“ statt Fehler. Start: `npm run live:st -- --guide patch_8_dungeon_full --max-turns 60 --headed`.
  - Tests: `tests/live_runner/patch842_runner.test.js` (9).

### Patch 8.4.3 (4.3.0-c.6.6.32): Letzte Dungeon-Konsistenz

Automatisierter Living-Dungeon-Livetest 22.10.2026 09:00 (`tests/v4/live_1022e.json`, 10/11). Vollständige Beschreibung: `docs/PATCH8_4_3_FINAL_DUNGEON_CONSISTENCY.md`.

- **Kapazität.** Simulierte Gruppen treten nur ein, wo Platz ist, sein eigener Platz gezählt (live 7/6).
- **Rückzug.** Außerhalb eines Kampfes ist ein Rückzug an einen Ort `go` (Planner-Regel 7); ein `flee` mit bekanntem Ziel oder „back through“ wird zum `go` auf dem gewöhnlichen Weg. Ohne Ziel bucht die Engine keinen Ort.
- **Erholung.** Die Rastzeile verlangt, die gebuchte Erholung so zu erzählen.
- **Tests:** `tests/v4/patch843.test.js` (9; auf .31 fünf rot, vier grün).
- **Live-Runner** (eigener Commit): Die Wächter-Etappe behält ihre ID (das Monster als `entityId`); „nicht durchgeführt“ nennt nur, was gebucht ist (keine Gruppe mit zwei als `unaware` gebuchten Mitgliedern). Tests: `tests/live_runner/patch843_runner.test.js` (2).
- **Nachweise ohne neue Expedition:** Awareness (`patch84.test.js`, Wiedergabe des `.28`-Falls), bezahltes Gate (`patch8`, `patch81`, neu: erneutes Betreten), Reset (`patch8 (reset)`, `patch8 (1)`, `8.3 cull 4`).

### Patch 9A (4.3.0-c.6.6.33): Drei Startklassen und NPC-Grundlagen

Erster Teil von Patch 9 (Organic Character Growth). Vollständige Beschreibung: `docs/PATCH9A_STARTING_CLASSES.md`.

- **Regelstand pro Kampagne.** Neue Kampagnen spielen nach Regelstand 2, aufgezeichnete und laufende behalten Regelstand 1 (fünf Klassen, alte NPC-Vorlagen, alte Texte).
- **Startklassen.** Warrior, Mage, Rogue; weiter zwei aus sechs Starter-Skills, Basic Attack automatisch, keine Starter-Passives. Mage mit Flame Lance + Blink bleibt möglich; Blink unverändert.
- **Waffen.** Jede Klasse kann einen Bogen nutzen (Bow Shot, Pfeile werden verbraucht); kein gelernter Skill, keine Klassenänderung.
- **NPCs.** Ausgebildete Kämpfer: Basic Attack + zwei Starter-Skills nach Rolle, festgehalten; Zivilisten untrainiert, auch mit Lore-Klasse.
- **Anzeige.** `#class` ohne feste Evolutions-Level; Combat-HUD mit Attack, Defense, Utility und Kosten.
- **Tests:** `tests/v4/patch9a.test.js` (16); `npm test` 1090/1090.


### Patch 9B-1 (4.3.0-c.6.6.36): Dynamische Skills und Proficiency

Vollständige Beschreibung: `docs/PATCH9B1_DYNAMIC_SKILLS_PROFICIENCY.md`.

- **Registry.** Eigene Skill-Definitionen pro Kampagne (`skill.defined`, nur Engine, nur Regelstand 2), getrennt vom Erwerb (`skill.learned`). Ein Resolver (`content.js skillOf`) für statische und dynamische Skills in Kampf, Planner, Intent, HUD, Befehlen, Kontext und Validierung.
- **Validator.** Geschlossenes Schema; nur F-Rang nach der Kalibrierung von `content.6.r2`; keine PER-Schadensskalierung, kein Freitext-Code.
- **Content.** Complexity und Disziplin-Tags der 18 Starter-Skills (Werte unverändert). Es zählt die höchste Affinität.
- **Proficiency.** P1–P5 mit Schwellen nach Complexity (75/100/150) und Übertrag; P5 ist das Ende. Effektfaktoren 1,05/1,10/1,15 für DEF/MDEF/Barrier, gleiche Rundung in Kampf und `#skill`.
- **PP.** 12 × höchste Affinität, einmal pro Skill und Kampf, gebucht am Kampfende. Bedingungen: sinnvolle Nutzung und eine echte Herausforderung. Außerhalb eines Kampfes: eine gewürfelte Probe einmal pro Feature. Legacy unverändert.
- **Tests:** `tests/v4/patch9b1.test.js` (14).
- **Nachbesserung (4.3.0-c.6.6.37):** Effektfaktoren nur unter Regelstand 2 (Legacy behält die geschriebenen Werte). Optionale, validierte `aspects` (Fire, Ice, …) als reine Metadaten dynamischer Skills, getrennt von den Affinitäts-Tags. Tests: 16.

### Patch 9B-2 (4.3.0-c.6.6.38): Dynamische Passives, Heil- und Ressourceneffekte, NPC-Verteidigung

Vollständige Beschreibung: `docs/PATCH9B2_PASSIVES_EFFECTS_NPC_DEFENSE.md`.

- **Passives.** Eigene Definitionen pro Kampagne (`passive.defined`), Besitz erst durch `passive.gained`; nur Engine, nur Regelstand 2. Dauerhafte Boni über `deriveCharacter`. Kostenreduktion einmal gerundet in einer gemeinsamen Funktion. Resistenzen als Final-Damage-Modifikator, bedingte Boni zum Ausführungszeitpunkt. Grenzen pro Passive und in Summe.
- **Effekte.** `heal` und `restore` (MP ↔ STA, höchstens die bezahlten Kosten), im Kampf und außerhalb nach derselben Regel; bei vollem Wert abgelehnt ohne Kosten.
- **NPCs.** Trainierte NPCs verteidigen sich unter konkreter Bedrohung (Guard, Deflect, Arcane/Focused Ward, Evasive Step) und nutzen Feint, wenn ein vorbereiteter Schlag mehr bringt. Nie zweimal hintereinander, höchstens dreimal pro Kampf; sonst wie bisher.
- **Korrektur.** Numerische Effektwerte sind ganzzahlig (eine Barrier von 13,5 HP ließ gebrochene HP zurück).
- **Tests:** `tests/v4/patch9b2.test.js` (13).
- **Nachbesserung (4.3.0-c.6.6.39):** Die Schadensvorschau folgt der echten Pipeline (bedingte Passives, Resistenz, Endure, Rundung); die NPC-Angriffswahl prüft reduzierte Kosten. Tests: 15.

### Patch 9C-1 (4.3.0-c.6.6.40): Deterministischer Skill-Erwerb und Training

Vollständige Beschreibung: `docs/PATCH9C1_SKILL_ACQUISITION_TRAINING.md`.

- **Composer.** `src/skill_composer.js` baut aus `strike|bolt|guard|ward|mend`, Tags und Aspekten eine C1-F-Definition. Zahlen aus `rules.json composer`. Name und ID sind kampagnenweit eindeutig („Ember Bolt“, „Ember Bolt II“). Gebucht wird über `defineSkill`.
- **Lernen.** `activity train/study` mit `learn`, `teacher`, `tags`, `aspects` (Vokabular `cmd-1.1`). Der Lehrer muss anwesend, kompetent und zugesagt sein (Trainingsleistung oder Fakt `teaches`); die Evidenz steht am Ziel. Wünsche und Bitten verwirft der Guard (`wish`).
- **Fortschritt.** Tageskonto pro Ziel und Spieltag mit Kappen, Lehrer- und Eigenzeit getrennt, Teilung an Mitternacht. Kampf-LP auf dem gemeinsamen Kampfende-Pfad. Bekannte Skills: 12 PP × Affinität ab 60 Minuten pro Tag.
- **Abschluss.** Nach beiden regulären Planner-Routen: bereite Ziele werden atomar Definition, Skill und geschlossenes Ziel, im selben Record vor dem Outcome (`learned`). Nichts bei Panels, fehlgeschlagener Planung oder im Kampf.
- **Texte.** `#skills` LEARNING, NEW SKILL im System-Block und im Kontext, `content.10.r2`, Vertrag v4 Revision 4.3.0-c.6.6.40, Extraktor-Regel `teaches` (`delta-1.0`).
- **Tests:** `tests/v4/patch9c1.test.js` (12).
- **Reviewkorrektur (4.3.0-c.6.6.41):** Tagesabschnitte vor Konto-Kürzung auswerten; PP auf fortgeschriebenem Stand buchen; alle Lehrerdisziplinen prüfen; Zusagen zusätzlicher Lehrer am Ziel binden und verbrauchte Services gegen Wiederverwendung nach Historienkürzung schützen. Kein neues Modul oder Eventtyp. Fünf Regressionen vorher rot, danach grün; gezielt 17/17, `npm test` 1147/1147. Unabhängiges Gegenreview ausstehend; kein neuer Livetest.
- **Nachkorrektur (4.3.0-c.6.6.42):** .41 von Claude unabhängig bestätigt. Trainingszeilen desselben Kaufs erhalten unterschiedliche stabile IDs; alte Records behalten ihre bisherigen Schlüssel. Kauf mit zwei Lernzielen vorher rot, danach grün; zusätzliche Prüfung von Listenkürzung, Replay und alten Records. Gezielt 19/19, `npm test` 1149/1149. Kein neuer Eventtyp oder neues Modul, gezieltes Gegenreview der .42 ausstehend.

### Patch 9C-2a (4.3.0-c.6.6.43): Forge am bestehenden Lehrer-Erwerb

Beschreibung: `docs/PATCH9C2A_FORGE_TEACHER_ACQUISITION.md`. Implementierung durch ChatGPT/Codex; Claude-Gegenreview offen.

- Ein gebündelter Forge-Aufruf für bereite Lehrer-Ziele, höchstens ein Repair; die Engine bestimmt die unveränderte Mechanik und schließt synchron und atomar ab. Ungültige Einträge erhalten einzeln freie Composer-Namen.
- Forge-Name und optionales `flavor`; Flavor ist eine kurze, separate Beschreibung und niemals Effekttext. Vertragsrevision `.43`.
- Doppelerwerb nach Technik-Signatur gesperrt, auch für .42-Definitionen und nach Kürzung der Abschlussliste; bestehende Skalierung und statische Starter unverändert.
- Record-Cache für Board-Retry/Regenerate, auch für bereits gebuchte alte Namen; Telemetrie; Stale-Schutz vor Record- und Host-Veröffentlichung. Keine neuen Events, Zahlen oder Quellen.
- 14 neue Regressionen einschließlich tatsächlichem Host-Binding mit simulierten LLM-Antworten. Vollständiges Testergebnis siehe Patch-Doku. Echter ST-/GLM-Livetest hier mangels Installation, Browser und Schlüssel nicht möglich; keine Live-Abnahme.
- Stones, Material, neuer Passive-Erwerb, Durchbrüche und Evolution folgen separat.

**Reviewkorrektur .44:** Claude bestätigte .43 unabhängig mit 33/33 gezielten und 1163/1163 Gesamttests. Ein alter doppelter Lernauftrag wird jetzt auf den bestehenden Skill geschlossen und gibt seinen Platz frei. Ein veralteter Interceptor bricht seinen eigenen Durchlauf ab; der Abbruchcallback ist laut ST-1.19.0-Quellcode aufruflokal. Korrigierter Host-Test für überholte Aufträge, Edit, Swipe, Löschen und Chatwechsel; produktpfadbasierter Duplikat-/Replay-Test. Rot/Grün und vollständige Ergebnisse in der Patch-Doku. Vertrag bleibt .43, Performanceumbau unterbleibt; R3 wird im Livetest beobachtet. Gegenreview der .44 und echter ST-Livetest noch offen.

### Patch 9C-2b (4.3.0-c.6.6.46): Skill Stones und Lernmaterial

Vollständige Beschreibung: `docs/PATCH9C2B_STONES_MATERIALS.md`.

- **Quellen.** Ein erkennbarer Skill Stone oder ein Manual mit belegter Lehre (`teaches` an `object.new` oder an einer Angebotszeile, `delta-1.1`) erhält bei der Etablierung ein festes Profil: Funktion, Tags, Aspekte, Rang. Es ist keine fertige Definition, und Fehlendes wird nicht ergänzt.
- **Stone.** Aktivierung über `use`. Die Engine prüft und merkt vor; der gemeinsame Abschluss bucht mit derselben Forge Definition, Besitz, Vorhaben und genau eine verbrauchte Einheit, oder nichts.
- **Manual.** `activity study` mit `material` (`cmd-1.2`) bindet das Material an das Vorhaben. Eigenstudium mit Tageskappe; das Material wird nicht verbraucht. Lesen allein lehrt nichts.
- **Texte.** `content.10.r2`, Vertrag v4 Revision 4.3.0-c.6.6.46.
- **Tests:** `tests/v4/patch9c2b.test.js` (11).
- **Review-Korrektur (4.3.0-c.6.6.47):** Ein „Skill Stone“ ohne belegte Lehre wird bei Aktivierung abgelehnt (nicht als Werkzeug erzählt). Ein aus einem Manual bereites Vorhaben wird nur vergeben, solange er das Manual hält; die LP bleiben. Tests: 13.
- **Live-Korrektur (4.3.0-c.6.6.48):** Aus dem Livetest von `.47`. Ein Stein mit belegter Lehre ist bei jedem Namen mit „stone“ eine Quelle. Ein Eigenname trifft nur die eine anwesende Person, deren Name oder Handle ihn trägt. Die Übergabe einer gebuchten Ware durch denselben Verkäufer in derselben Menge ist der Kauf selbst, in beiden Kaufpfaden. `buy` trifft bei genau passender Zeile nur diese. Ein gewöhnliches Werkzeug gibt beim Benutzen keinen Skill, keine LP und keine Fähigkeit. Tests: `patch9c2b_live` (5).

### Patch 9C-2c (4.3.0-c.6.6.49): Passive-Erwerb in drei Qualitätsstufen

Einzelheiten: `docs/PATCH9C2C_PASSIVE_ACQUISITION.md`.

- **Qualitäten und Grenzen.** Ordinary, Rare, Legendary auf einer Passive-Engine; Budgets je Qualität, gemeinsame Summen, vier Plätze (PC und NPC).
- **Core-Stats.** Neuer Effekt `core_stat_bonus`; `effectiveStats` gilt an jeder Lesestelle.
- **Ablauf.** Ein Beleg der Engine wird beim nächsten sicheren Zug zum Angebot (Forge nur für den Namen) und erst durch Annahme gebucht (`passive.accept`, `passive.decline`, `cmd-1.3`). Ablehnung ist endgültig; Rare oder Legendary können bei vollen Plätzen ein benanntes Passive atomar ersetzen (`passive.lost`).
- **Quellen.** Ordinary durch zehn Tage Eigentraining eines Core-Stats; Rare durch einen gewonnenen Kampf gegen einen Gegner 5 Level höher bei höchstens 25 % HP (Grenzfall mit gespeichertem Wurf); Legendary nur über eine autorisierte Engine-Quelle. Ein „Passive Stone“ der Erzählung ist nichts.
- **Texte.** Narrator-Vertrag Revision .49.
- **Tests.** `patch9c2c` (9).
- **Review-Korrektur (4.3.0-c.6.6.50):** Ein Austausch senkt HP, MP und STA auf die neuen Maxima ab, auch über einen verlorenen Core-Stat, ohne aufzufüllen. Kostenreduktionen zählen wie bei der echten Kostenberechnung zusammen. Bei 4/4 wird jeder Rare- oder Legendary-Kandidat gegen jeden Einzelersatz geprüft, und `#passives` nennt die lohnenden. Die Live-Abnahme ist an Ordinary und Trainingsbeleg gebunden und endet erst mit `passive_verified`. Tests: `patch9c2c_review` (3), Runner +1.

### Mini-Fix 4.3.0-c.6.6.51: Tokenbudgets und Planner-Abhängigkeiten

Aus dem Livetest von `.50` (23.10.2026, 11:07). In Zug 10 brachen Planner und Repair bei 900 Tokens ohne Antwort ab, und es gab keinen Story-Zug. Das Reasoning drehte sich darum, ob der Schlaf ein `needs` auf das Bezahlen braucht: `ORDER_RULES` sagte „the go needs the pay“, das gemeinsame Bett-Beispiel hatte keins. An anderen Tagen buchte „take the room and sleep“ die Nacht, obwohl noch kein Preis bekannt war. Der Erzähler erzählte sie im Zimmer, bezahlt wurde erst am nächsten Morgen.

- **Budgets** (`src/v4/runtime.js LLM`, Repair jeweils mit dem Budget seines Aufrufs): Planner 900 → 2000, Extraktor 2500 → 4000, Forge 900 → 1500. Board und Interpreter bleiben unverändert.
- **Eine `needs`-Regel.**
  - `ORDER_RULES`: Wer ein Zimmer oder Bett nimmt und darin schläft oder rastet, braucht für den Schlaf den Schritt, der es nimmt (`offer.accept`, `buy` oder `pay`). Ein Zimmer mit noch offenem Preis oder einer bloßen Preisgrenze gehört ihm noch nicht.
  - Training, Studium und Schlaf stehen für sich und haben kein `needs` untereinander oder auf einen Kauf.
  - Neues Beispiel: Training, Zimmer, Schlaf.
  - Im Prompt des Planners trägt das Bett-Beispiel nun `needs` (`interpreterSystem(vocab, { needs: true })`). Der Interpreter von Runtime V4-A kennt kein `needs` und behält es unverändert.
- **Engine** (`src/v4/commands.js resolveCommands`, nur Planner-Pfad):
  - Eine Rast oder ein Schlaf in einem Zimmer, das er in derselben Nachricht nimmt, findet erst statt, wenn das Zimmer gebucht ist. Das gilt mit oder ohne `needs` des Planners. Das Zimmer erkennt die Engine an einer Lodging-Zeile des Angebots oder an Zimmer- oder Bettwörtern.
  - Ein offener Preis (`pending`), ein bedingter Kauf (`conditional`) und ein abgelehnter Kauf gelten nicht als gebucht. Dann: `NOT DONE`, es vergeht keine Zeit, es gibt keine Erholung, keine Münzen werden bewegt und kein `service.granted` entsteht.
  - Alle anderen `needs` bleiben unverändert: Quest, Fähre (auch ein bedingt vereinbarter Kauf vor einem `go`), Übergabe, Schlaf nach einem `go`.
  - Es gibt kein neues Unterkunftssystem.
- **Runner:** `roleOf` erkennt die neuen Limits neben den alten. Die Stub-Smoke `run_c.mjs` erwartet für den Planner 2000.
- **Tests:** `tests/v4/c6651_lodging.test.js` (7), `tests/live_runner/c6651_runner.test.js` (1).
- **Review-Korrektur (.51):**
  - Ein Schlaf, der selbst einen anderen Ort nennt („in the hayloft“), oder ein Schlaf nach einem `go` an einen anderen Ort („out to the stable“) steht für sich. Eine Zimmeranfrage blockiert ihn nicht. Ein `go` hinauf ins Zimmer ist kein anderer Ort.
  - Als gebucht gilt nur ein Zimmer oder Bett, das die Engine ihm in dieser Nachricht zugeteilt hat (`service.granted`, Lodging oder Zimmerzeile). Eine allgemeine Zahlung „für das Zimmer“ ohne Buchung oder ein Teil des Preises reicht nicht.
  - Tests: +2.

### Patch 9C-Abschluss (4.3.0-c.6.6.52): Organic Breakthroughs, Skill-Evolution, C2/C3, minimaler E-Rang, NPC-Signaturen

Einzelheiten: `docs/PATCH9C_COMPLETION.md`. 9C-2d und 9C-3 bilden einen Patch nach den Beschlüssen vom 23.10.2026 auf `main`.

- **Nutzungsbuch:** Qualifizierende Kämpfe buchen die Muster jedes Skills (`growth.noted`): Gegnergruppe ENGAGED, Bandwechsel, Teildeckung, volle MEDIUM-Reichweite, Gegenschlag, durchgelassener Schaden, dazu Skills nacheinander.
- **Belege:**
  - Evolution: P5 plus 2 Kämpfe auf P5 mit Muster.
  - Durchbruch: Basic Attack mit Muster in 3 Kämpfen.
  - Kombination: zwei Skills nacheinander in 3 Kämpfen.
  - Kämpfe eines Belegs zählen nie doppelt; kein Beleg für eine bereits vorhandene Form.
- **Angebot und Annahme:**
  - im sicheren Zug, höchstens 3 offene Entwicklungen insgesamt, eine Evolution pro Skill;
  - generisches Paar `development.accept`/`development.decline` (`cmd-1.4`), `passive.*` bleibt Alias;
  - Evolution ersetzt den Vorgänger atomar (`skill.evolved`, P5/0 PP, `skill_history`); Basic Attack bleibt;
  - die Abstammung blockiert das Neuerlernen des Vorgängers.
- **Composer:** ein Schritt ist Complexity +1 mit vorhandenem Feature; C3 ist das Ende. Lehrer, Stones und Manuals bleiben C1. E-Rang hat eine provisorische Tabelle und eine Rangprüfung ab Level 15, aber keinen eigenen Spielpfad. D–S werden abgelehnt.
- **NPC-Signaturen:** trainiert und Level ≥ 5, eine Technik (Starter einen Schritt weiter, nie Fläche oder Mehrfachtreffer), vor `entity.sheet_set`, deterministisch, ohne LLM; im Kampf genutzt.
- **Passives:** Ordinary aus 3 erfolgreichen Engine-Proben eines Core-Stats an verschiedenen Features über 2 Tage; Rare-Duplikatschutz nach Gegnerart und Ort (`similar`).
- **Texte:** Narrator-Vertrag Revision .52, `content.10.r2` SKILL DEVELOPMENT IN PLAY, Katalog POSSIBLE SKILL.
- **Tests:** `patch9c_completion` (11); `patch9b1` (4) an E angepasst.
- **Review-Korrektur (.52):** Ordinary-Proben als gültige Auswahl über alle unbenutzten; Rare-Quelle ist der Dungeon, sonst der Bereich; keine Signatur aus oder als Fläche/Mehrfachtreffer; defensive Signatur vor ihrem Guard. Tests: `patch9c_completion_review` (4).
- **Kurzer Livetest (.52):** Leitfaden `current_test` (Warrior, Guard und Heavy Slash, Durchbruch/Kombination aus etwa drei Kämpfen, Annahme, `#skills`/`#skill`, Einsatz; NPC-Signatur optional; ≤ 35 Züge), neue Auswerter-Etappen für Skill-Entwicklung und NPC-Signatur. Tests: `patch9c_completion_runner` (3).
- **Livetest-Korrektur (.53):** Fakten über Orte keine Integritätsprobleme; `role`/`armed` als Wortliste gelesen; nach `extract.failed` nennt die Korrektur den Ort (vor dem Tor); an der Dungeon-Wurzel keine freien Gegner seiner Arten; Ruleset 2 Startwaffen ATK/MATK 10 (eigene Gegenstände, Legacy/NPC unverändert); Leitfaden Überleben vor Muster. Tests: `live_1023_fix` (7).
- **Livetest-Korrektur (.54):** eine erklärte Flucht ist die Hauptaktion, eine Abwehr, die sie nur deckt, verdrängt sie nicht; Partial Cover nur über Distanz (`partialCoverAt`, Schlag und Vorschau, 9C-Muster nur aus wirksamer Deckung); Leitfaden: Novice-Einzelkämpfe zuerst, Dungeon optional. Tests: `live_1023c_fix` (7).

## Patch 9D — F→E Organic Class Evolution (.55)

Basis `.54` `be276456`: Lifetime-Tatenbuch aus fixierten Kampfwerten und persönlichen HP-Schadensanteilen; Normal/Rare-E-Klassen als eine persistente Auswahl ab Level 15; ausdrückliche Annahme oder Aufschieben über development.accept/decline. Grundklasse/Favored Stats bleiben erhalten. Eine eigene validierte Klasseneigenschaft wirkt über dieselben Effektquellen und gemeinsamen Caps wie Passives, ohne einen Passive-Platz zu belegen. Historie/Vermächtnis 1/2/4, #class/#feats, HUD und Narrator-Vertrag .55. Kleine NPC-Auswahl für bekannte Repositionierung, Heal und Restore, mit bestehenden Taktikgrenzen. Details/Budgets: `PATCH9D_CLASS_EVOLUTION.md`.

Nur F→E und Normal/Rare produktiv; Legendary-Belege werden bewahrt. D–S-Profile, Domains, Discovery-Verteilung und höhere Vermächtnisskalierung fehlen ausdrücklich. Node-Fixtures mit Seeds 7/19/41 und eigene Runner-Meilensteine. Abschlussprüfung: 1258/1258 npm-Tests bestanden (24.10.2026, Codex/Sol). Echter ST-/GLM-Fixture-Test hier nicht durchgeführt: Browser, ST und API-Key fehlen; unabhängiges Claude-Gegenreview ausstehend. Runner-Änderungen separat committen.

### 9D Reviewfix (.56, 24.10.2026)

Claude bestätigte .55 unabhängig mit 1258/1258 und fünf konkreten Befunden. Skill-Evolutionen geben nun zusammen höchstens einen Rare-Punkt; sichtbare Taten bleiben. Persönlicher Sieg nutzt den positiven tatsächlichen Schaden dieses Kampfes, damit angeschlagene Rückkehrer zählen. Automatisches nutzloses NPC-Blink entfällt. Level-Prüfungen/Anzeige lesen Regelwerte, der Reducer keine feste 15. Runner-Bericht nennt Fixture/Seed/synthetische Vorgeschichte/Reload; alte Fixture-Statpunkte werden nur im isolierten Aufbau verteilt. Build .56, Vertrag .55 unverändert. Rot/Grün sechs betroffene Prüfungen, danach 19/19; angrenzend92/92, volle Suite **1262/1262**, alle fünf Runner-Fixtures gefaltet/validiert. Engine und Runner separat. Echter ST-/GLM-Lauf weiterhin offen; keine neue Erweiterung aus den sonstigen Reviewhinweisen.

### 9D Live-Follow-up (.57, 24.10.2026)

Original .56-Lauf `20261024-010241Z-current_test`: 25 Züge/25:13min, **5/5 Mechanik-Etappen**, Ironbound Fury angenommen und wirksam eingesetzt; manuelles API-Verbinden/Senden nötig, Abschluss-Reload auf ST-Startbildschirm gescheitert, Persistenz nicht live bestätigt. .57 stellt beim Fixture-Start und Abschluss die genaue gespeicherte Chat-/Kartenidentität und API-Verbindung wieder her, verweigert Senden/Speichern im falschen Chat und benennt Reload-Fehler ausdrücklich. Eindeutig benannte offene Klassenwahl korrigiert fehlerhafte Gruppen-/Kind-ID vor Schema-Prüfung; bestehende Agency-/Consent-/Combat-/Replay-Guards bleiben. #class/Katalog/Guide erklären natürliche Wahl. Bericht markiert Ausreißer aus vorhandenen Spieler-/Spiel-/Providerzeiten, ohne Modellparameter zu ändern. Sieben betroffene Regressionen auf .56 rot (3/10), danach10/10; angrenzend132/132; Gesamtsuite **1269/1269**. VM-/Runtime-Tests, kein erneuter ST-/GLM-Lauf. Build .57, Vertrag .55, Engine/Runner getrennt. Details/Nachtest in `PATCH9D_CLASS_EVOLUTION.md`.


### 10B-1 (.58, 24.10.2026)

Kollisionsgeschützte automatische Fakten-IDs einschließlich gleicher Turns und funktionaler Historie; kanonische Registrierungszahlung darf dem vom Guard redundant entfernten Registrierungswunsch folgen. Keine Freigabe echter Guard-Ablehnungen. Zwei Produktmodule, keine neuen Events oder Mechaniken. Rotlauf 5/11, grün 11/11; angrenzend 125/125; Vollsuite 1286/1286. Alte Eventlogs/Explizit-IDs unverändert, neue automatische IDs auch in Legacy/V4-A korrigiert. Unabhängiges Review und Live-Abnahme offen; Vertrag .55 unverändert. Details: `PATCH10B1_FACT_ID_DEPENDENCIES.md`.


### 10B-2 (.59, 24.10.2026)

Positive engine-owned Lieferbelege (`quest.delivered`) statt bloßem Holder-Verlust/Story-READY unter Ruleset 2/C. Direkte und bedingte Übergabe bewahren Menge, Empfänger und Ort; Splits/Zurücknehmen zählen nicht doppelt, falsche Gildenboden-Ablage zahlt nicht. Andere Questarten, Legacy und V4-A bleiben geschützt. 27 neue Prüfungen: .58 rot 6/27, danach 27/27; vollständige Endsuite 1313/1313. Echter Host-Swipe/JSON-Reload und originale Lieferzustände aus Runs 1/2 geprüft. ST-Smoke versucht, aber ohne AVERETH_ST_DIR/ST-Checkout vor Hoststart blockiert; Review und Live-Abnahme offen. Keine Guide-/Balanceänderung; Vertrag .55. Details `PATCH10B2_DELIVERY_HANDOVER.md`.

### 10B-2b (.60, 24.10.2026)

Lieferablage nur am konkret autorisierten, etablierten Ort; Zusatzpflichten klauselscharf statt ganze Notizen verwerfen; passender institutioneller Priorei-Empfang ohne beliebige NPC-Ersatzregel. Ungeeignete Namenszwillinge und klar nichtphysische Board-DELIVER/GIVE abgefangen; getrennte Template-Neuzugänge und echte object.added-Zuwächse zählen korrekt, zurückgegebene Einheiten nicht erneut. Originale Run-4-Zustände für Ledger, Medicine und Maren geprüft; fehlende Präsenz wird nicht erfunden. Ledger-Test isoliert den original gebuchten GIVE, kein vollständiges identisches GO→GIVE-Reenactment behauptet. 25 neue Prüfungen: auf .59 14 rot/11 grün, danach25/25; bisherige10B-2 27/27; angrenzend983/983; Vollsuite1338/1338. ST-Smoke ausgeführt, ohne ST-Checkout/AVERETH_ST_DIR vor Hoststart blockiert. Kein Runner-/Guide-/Balanceeingriff, Vertrag .55. Gegenreview und Live-Abnahme offen; Grenzen pro F60-1–10 in `PATCH10B2B_DELIVERY_FOLLOWUP.md`.


## Patch 10B-4a – Planner-Leerantworten (.61, 24.10.2026)

Eng begrenzter Teil von 10B-4: Zwei Planner-Aufrufe ohne JSON-Text (normal + bestehender Repair, je 2000 Ausgabetokens) erhalten genau **einen** frischen dritten Planner-Versuch mit 4000 Tokens. Er nutzt denselben Planner-Validator und denselben Spielerinput; es wird kein Befehl geschätzt oder vor einem gültigen JSON-Ergebnis gebucht. Nichtleere ungültige Antworten, Providerfehler, Narrator und Extractor bleiben bei bisherigen Regeln. Sieben neue Tests in `tests/v4/patch10b4a_planner_empty.test.js`; **in der ChatGPT-Implementierungsumgebung nicht selbst ausgeführt**, ebenso wenig Gesamtsuite oder ST-Smoke. Vor technischer Freigabe lokal ausführen und echtes Ergebnis nachtragen. Detaillierte technische Notes: `docs/PATCH10B4A_PLANNER_EMPTY_RECOVERY.md`. 10B-3 und die übrigen Teile von 10B-4 nicht implementiert.


## Patch 10B-4c.1 – bounded Extractor retry (.62, 24.10.2026)

Der World-Extractor erhält innerhalb einer bereits ausstehenden Extraktion genau einen neuen Versuch nach einem primären Transportfehler/null (gleiche Originalanfrage, 4000 Ausgabetokens). Wenn Normalantwort und bisherige JSON-Reparatur beide vollständig leer waren, folgt einmalig ein frischer `extract_recovery`-Aufruf mit 6000 Tokens. Jeder Beleg passiert unverändert `parseExtraction`, erwartete Ergebnisfelder und die `applyExtraction`-Firewall; keine bereits fehlgeschlagenen/abgeschlossenen Turns werden neu geschrieben, keine Aktionen erfunden. Normale valide Antworten und reguläre Reparaturen behalten ihren bisherigen Aufrufumfang.

Zunächst 11 neue Regressionstests und zwei angepasste Altregressionen. Unabhängiger .62-Prüflauf: **10/11** sowie **1380/1381** grün; einzig Test 10 hatte eine falsche Annahme zu `laterTurns` (roher Playertext ohne Engine-Events). Der Test ist korrigiert; vor jedem zusätzlichen Extractor-Call wird jetzt die Aktualität des ursprünglichen `pending`-Replies geprüft. Fünf neue Schutz-/Gegenproben ergeben **16 Zieltests**, erwartete Vollsuite **1386**. **Nach diesen Korrekturen noch nicht erneut lokal ausgeführt**; die früheren 1370/1370 gehören zum alten .61-Stand. .62 bleibt die Buildversion. ST-Smoke/echter GLM-Lauf und Host-Recovery bleiben getrennt offen. Technische Details: `docs/PATCH10B4C1_EXTRACTOR_RECOVERY.md`; 10B-Master `06`, §21 auf `main`.


## Patch 10B-4c.2 – Host-Lifecycle und Pending-Recovery (.63, 24.10.2026)

Auf Basis der lokal bestätigten **1386/1386** Node-Tests von Build .62 kapselt `src/v4/world_jobs.js` die aktive Extraction pro Chat/Reply. `index.js` bindet Chat-ID/-Referenz, Nachrichtenobjekt, Swipe, Text-Hash, AbortSignal und Laufzeit-Barriere; veraltete Jobs dürfen nicht weitermachen oder buchen. Gespeicherte `pending`-Extraktionen werden bei Reload/Chat-Reentry und vor dem nächsten normal aufzulösenden Spielerzug wieder aufgenommen. Doppelte Host-Ereignisse dürfen keinen zweiten Job starten. Die Barriere wartet auch, bis die Welt-Events gespeichert sind. Bei Custom-Endpoint-Calls wird ein Abbruchsignal in `fetch` übertragen; `generateRaw`-Antworten können nur nachträglich verworfen, nicht garantiert unterwegs beendet werden. Keine Recovery von bereits endgültig `failed`-Extraktionen, keine Narrator-Regeneration.

**14 neue scripted Lifecycle-Regressionen geschrieben, aber noch nicht ausgeführt; erwartete Gesamttestzahl 1400.** Lokale Abnahme und ST-Host-Verifikation ausstehend. Technische Notes `docs/PATCH10B4C2_HOST_LIFECYCLE_RECOVERY.md`, vollständiger Masterstand `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` §22 auf `main`. 10B-3 und Narrator-Recovery bleiben offen.


## Patch 10B-4c.3 – Recovery-Beobachtung (.64, 24.10.2026)

Nach unabhängig bestätigten **1400/1400** Node-Tests auf Build .63 speichert Planner-/Extractor-Recovery optional die Ursache (`recovery: 'empty' | 'transport'`) auf dem Player-/Reply-Record. Der `current_test`-Evaluator und `report.md` zählen Recovery-Versuche und kennzeichnen deren validierte Resultate mit **0 Commands** beziehungsweise **0 Deltas** als Prüfhinweis, nicht als nachgewiesenen Defekt oder automatischen Stopp. Kein neuer Retry, kein Eingriff in Mechanik, Firewall, GPT-Provider/Host oder Runner-Abbruchlogik.

**12 neue Regressionstests, noch nicht ausgeführt; erwartete Vollsuite: 1412**. Technische Details: `docs/PATCH10B4C3_RECOVERY_OBSERVABILITY.md`; Master `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` §23. Echte SillyTavern-/GLM-Liveprüfung ausstehend. Planner-Transportretry, risikoärmeres Edit-Invalidate und Narrator-Recovery bleiben separate Folgearbeiten.


## Patch 10B-4c.4 – Review-Nachtrag (.65, 24.10.2026)

Die vom Nutzer nach `.64` bestätigten **1412/1412 Node-Tests** sind Grundlage dieses zusätzlichen kleinen Patches. Nach unabhängiger Neubewertung von Claudes gesamtem 10B-4-Review bekommt der Planner nun **genau einen zusätzlichen Versuch nach einem primären Transportfehler** (`plan_recovery`, unveränderter Prompt/2000 Tokens, kein dritter JSON-Repair; Herkunft `plan.recovery:'transport'`). Vor jedem zusätzlichen Planner-Call wird das aktuelle Host-Input-/Chat-Prädikat geprüft. Der Test-Runner nutzt für `extractor_timeout` den strukturierten `extraction`-Status des Drivers und zählt fortgesetzte `extractor_failed_soft`-Züge mit Vorbehalt zu möglichen verlorenen Weltfakten. Sonstige Empfehlungen bleiben gemäß begründeter Entscheidungstabelle bewusst offen.

Technische Details, alle akzeptierten und verworfenen Claude-Punkte: `docs/PATCH10B4C4_INDEPENDENT_REVIEW_DECISIONS.md`; 10B-Master §24 auf main. **9 neue Tests angelegt, bisher NICHT lokal ausgeführt**, erwartet 1421 insgesamt, Produktbuild `.65`. Echte ST-/GLM-Abnahme weiterhin offen.

### 10B-4c.2 Hotfix (.66, 24.10.2026)

Initial fehlende Swipe-ID wird für Job-Zugehörigkeit und Deduplizierung als `0` behandelt; echte Swipewechsel und übrige Guards bleiben. Ursache, Rot/Grün, vollständige Node-/ST-Ergebnisse und offene Beobachtungen einmalig in der [Hotfixnote](PATCH10B4C2_SWIPE_ZERO_HOTFIX.md).

### Private Arbeitsaufträge (.76, 25.10.2026)

Annahme allein erledigt und bezahlt keinen Privatjob. Bestehende Spielerhandlungen erhalten optional einen geprüften Auftragsbezug; tatsächliche Arbeit und einmalige Bezahlung bleiben über vorhandene Events erhalten. Gemeinsame Arbeit/Reise in einem Input, spätere Auszahlung und unabhängige Geschenke bleiben möglich. Umsetzung, Rot/Grün und Node-/ST-Abnahme einmalig in der [Fach-Patchnote](PATCH10B_PRIVATE_JOB_AGENCY.md).

### Run-12-Fachfix .79 (25.10.2026)

Dungeon-Slotidentität und lokale Präsenz getrennt; neue Gildenlieferungen speichern explizite Empfänger-/Orts-/Übergabesemantik. World-Reisekette bleibt vorbereitet und offen. Umsetzung, Rot/Grün und Abnahme: [PATCH10B_RUN12_DUNGEON_GUILD.md](PATCH10B_RUN12_DUNGEON_GUILD.md).

### World-Fachfix .81 mit Gegenreview-Folgekorrektur .82 (25.10.2026)

Run-12-Paket C umgesetzt: expliziter Schauplatzbezug für neue C-Extraktionen, korrekte Zwischenhalt-/Zielzuordnung und antwortlokale Questabhängigkeiten. Keine neue Bewegung aus Prosa oder pauschale GO-Pflicht für NPCs. Die .82-Korrektur gibt verzögerte Quellen erst nach endgültiger Prüfung für abhängige Questansprüche frei. Protokoll, Tests und Abnahme: [PATCH10B_RUN12_WORLD_STATE.md](PATCH10B_RUN12_WORLD_STATE.md).

### Freie NPC-Hilfe .83 (25.10.2026)

Neue Kampagnen führen nur Gildenquests formal; NPC-Hilfe und freiwillige Zahlungen bleiben normale Weltvorgänge. Altspielstände behalten ihre Semantik. Umsetzung, Grenzen und Abnahme: [PATCH10B_FREE_HELP.md](PATCH10B_FREE_HELP.md).

## Run 13: Guild-Board .84

Nummerierte Jagden in einem Dungeon verbrauchen im festen 2+2+1-Profil nicht mehr die Räumungskategorie. Generator, Teilnachfüllung und Validator verwenden dieselbe Einteilung; historische Profile behalten ihre Grenze. Originalfälle und Abnahme: [PATCH_RUN13_GUILD_BOARD.md](PATCH_RUN13_GUILD_BOARD.md).

## Run 13: NPC-Kontinuität .85

Gebietsbezogener, begrenzter Rückruf bekannter Personen; keine stille Wiedereinführung abwesender NPCs durch `person.new`, kontrollierte Namenserweiterung und ausdrücklich unterschiedliche Identitäten. Eigenständige Rückkehr bleibt über `enter` möglich, ohne PC-GO. Vertrag .85. Originalnachweise, Regressionen und Grenzen: [PATCH_RUN13_NPC_CONTINUITY.md](PATCH_RUN13_NPC_CONTINUITY.md).

## Run 14: World-Delta .86

Präzise Reparaturhilfe für vorhandene neue Objektnamen, mehrdeutige Deklarationen abgesichert, zeitliche Szenenannotation vor späterer Ankunft und kanonische Geberpräsenz bei Sachgeschenken. Kein neues Referenzsystem. Technik und Abnahme: [PATCH_RUN14_WORLD_DELTAS.md](PATCH_RUN14_WORLD_DELTAS.md).

## Run 14: Gildenboard .87

Neue Ruleset-2/C-Boards bieten vorläufig vier Jagden und eine passende Dungeon-Räumung, ohne geeigneten Dungeon fünf Jagden. Bestehende Lieferangebote und das vollständige Delivery-System bleiben erhalten. Technik und Abnahme: [PATCH_RUN14_HUNT_BOARD.md](PATCH_RUN14_HUNT_BOARD.md).

## Run 15: Handelsintegrität .88 (Patch A)

Einmalige Kauf-/Verkaufsbuchung, Zustimmung zu Gegenpartei und Gesamtpreis, mengenrichtige Preisnachweise, Abgrenzung fremder Empfehlungen und kommerzielle Übergaben. Bestehende Transaktionspfade und Saves bleiben erhalten. Der Gegenreview ist in .89 berücksichtigt. Technik, Originalfälle und Abnahme: [PATCH_RUN15_TRADE_INTEGRITY.md](PATCH_RUN15_TRADE_INTEGRITY.md).

## Run 15: Händlerausrüstung .89 (Patch B)

Neue Gearangebote benötigen bestehende Engine-Profile und Slots; gewöhnliche Ware bleibt ohne Kampfwerte. Kauf → Equip und Slotprüfung sind abgesichert. Keine neuen Slots oder Balancewerte. Gegenreview-Folgekorrektur .90 trennt beim Anlegen genau ein Stück aus einem Gearstapel ab. Technik und Abnahme: [PATCH_RUN15_GEAR_MARKET.md](PATCH_RUN15_GEAR_MARKET.md).

## Run 18: Dungeon-Erstkontakt .94

Dungeonpopulation vor der ersten Kreaturprüfung einrichten; kein ungebundener Gesamtrang-Gegner beim erstmaligen Erreichen des Eingangs. Zwei kurze Runnerhinweise präzisieren erneute Annahme und bestätigte Ausführung. Originalfall, Gegenproben, Kompatibilität und Abnahme: [PATCH_RUN18_DUNGEON_ENTRY.md](PATCH_RUN18_DUNGEON_ENTRY.md).

## Run 19 / Build .95 (26.10.2026)

[Handelszustimmung und sichere System-Klärung](PATCH_RUN19_TRADE_CONSENT.md), [Gildenziele und kanonische Orte](PATCH_RUN19_GUILD_PLACES.md). Gemeinsame Abnahme ausschließlich in der Handelspatchnote. Runner, XP und Kampfwerte unverändert.

## F-Rang-Progression / Build .96 (26.10.2026)

Neue Kampagnen: weltgebundene Jagdpopulationen über F, sichtbare Shopwerte, kaufbare C1-Primer und wirksame erste Proficiency-Kostenersparnis. Entscheidungen, Kompatibilität und Abnahme ausschließlich in [PATCH_F_RANK_WORLD_PROGRESSION.md](PATCH_F_RANK_WORLD_PROGRESSION.md). Kein E-Ausbau, keine zusätzlichen Gearslots oder XP-/Startwertbuffs.


## Vorbatch-Fachpaket .99 — 27.10.2026

Gemeinsame Handelsbuchung und aktuelle Zustimmung/Verfügbarkeit, zeitlich gebundene World-Ausführung mit lokalen Szenenablehnungen und konsistente Board-Eignungsinformation/Repair. Technische Änderungen, Gegenfeedback, echte Abnahme und Grenzen ausschließlich in [PATCH_PRE_BATCH_RUN22.md](PATCH_PRE_BATCH_RUN22.md). Keine Balance- oder Runneränderung.

## 27.10.2026 – Batch-1-Fachpaket .101

Recovery, explizite chronologische Ankunft, gemeinsame Ortsidentität, geprüfter Verkaufsweg und neue mechanische Zähljagden: [technische Patchnote mit Abnahme und Grenzen](PATCH_BATCH1_WORLD_CONTRACTS.md). Keine Balance- oder Testspieleränderung; natürliche Batch-Abnahme folgt separat.

## 28.10.2026 — .105: sichere Modellfehlerfortsetzung (Teil 1)

Lokale Extractor-Semantikhinweise, sichtbare Planner-Nichtausführung, geschützte Narrator-Korrekturen und kontrollierte Runner-Fortsetzung mit Save-Readback. Geld, Kampf und World-Autorität bleiben geschützt. [Technik, Tests und Grenzen](PATCH_FAILSOFT_CONTINUATION.md). Teil 2 nicht umgesetzt.

## 28.10.2026 — .106: Fail-soft Gegenreview und Teil 2

Gemeinsamer Speicherblock für Planner/World, harte Behandlung unbekannter Fehlercodes; einheitliche Handels-Preisgrenzen mit Mengenbezug, präzise Ortsreferenz-Reparatur und getrennte Angebots-IDs. [Umsetzung, Regressionen und Abnahme](PATCH_FAILSOFT_PART2_AND_REVIEW.md). Keine Combat-/Balanceänderung.

## 28.10.2026 — .107: Schutzpatch nach technischem Audit

Unfreiwillige Ortswechsel nur mit wörtlich erzählter Verlagerung; bekannte abwesende Personen kommen nur per erzählter Ankunft, nie über `position`/`aware`; eine abgelehnte Namenserweiterung sperrt nicht die anwesende Person; Persistenzsperre chat-gebunden; drei Preisformulierungen; NOT EXECUTED mit tatsächlich festgestelltem Grund. [Umsetzung, Rot/Grün und Grenzen](PATCH_PROTECT107_AUDIT_FIXES.md). Keine Combat-/Balanceänderung.

## 28.10.2026 — .108: Belegprüfung für unfreiwillige Ortswechsel

Nur Bewegungen Alarics selbst, zum Ziel von `arrive.at`; Auslöser (grabbed, arrested, portal) nur mit erzählter Richtung; Rede in einfachen Anführungszeichen, satzweite Erinnerung und Kurzformen (`'ll`, `n't`, `'d` als had/would) erkannt. [Umsetzung und Abnahme](PATCH_PROTECT108_FORCED_EVIDENCE.md).

## 28.10.2026 — .114: erste gemeinsame F-Balancerunde

Neue V4-C-Kampagnen: F-Waffen6/10/14/18/22, lokales Fachhändlersortiment, PP50/75/100, LP-Tagesgrenzen40/60, Primer80cp und gestaffelte Novice-Vergütungsrichtwerte. Historische Kampagnen behalten ihre Zahlenpolicy; XP, Startstats, Monster und Aktionsökonomie unverändert. Umsetzung, Nachweise und Grenzen: [PATCH_F_BALANCE114.md](PATCH_F_BALANCE114.md).
