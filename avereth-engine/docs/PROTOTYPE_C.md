# Prototyp C: semantischer Planner hinter einem Feature-Flag (Build 4.3.0-c.1)

Stand: 02.10.2026.

| | |
|---|---|
| Branch | `claude/c-planner-prototype-2026-10-02` |
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

1. **Extension:** den Ordner `avereth-engine/` aus dem Branch `claude/c-planner-prototype-2026-10-02` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren; die alte Kopie vorher löschen. SillyTavern neu laden. Die Statuszeile zeigt `Avereth Engine 4.3.0-c.1`.
2. **Verbindung, Karte, Preset, Lorebook:** wie in [LIVETEST_V4.md §2](LIVETEST_V4.md#2-einrichtung-in-sillytavern).
   - Quelle **Custom (OpenAI-compatible)**: nur dort läuft der Planner mit Temperatur 0,1 wie gemessen.
   - Vertrag v4 (Revision 4.2.0, unverändert), Preset „Avereth Narrator V4“, Lorebook v0.13.
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
