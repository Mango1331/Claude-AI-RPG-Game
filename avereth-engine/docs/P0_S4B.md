# P0 / S4b: freie Spielersprache → Absicht → Engine

Stand 02.10.2026.

| Was | Wo |
|---|---|
| Werkzeug (v1) | `tools/p0/s4b_intent.mjs` |
| Bibliothek | `tools/p0/lib/s4b.mjs` |
| Korpus (91 Fälle) | `tests/eval/s4b_cases.jsonl` |
| Szenen (7) | `tests/eval/s4b_scenes.json` |
| Tests | `tests/p0/p0_s4b.test.js` |

Ersetzt die Skizze in `docs/RESEARCH_NL_TO_ENGINE.md` §7 und `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §11.2.

**Kein Prototyp C.** A und B bleiben unverändert. S4b ist ein reines Messwerkzeug.

---

## 0. Produktfrage und Abgrenzung

> Kann Avereth freie, natürliche RPG-Eingaben so flexibel verstehen wie ein guter LLM-GM, während die deterministische Engine weiterhin alleinige Autorität über Mechanik, Zahlen und kanonischen Zustand bleibt?

**Ausgangsfehler**, am Code belegt (Review §16.10 und A0 unten): `I Fire Lance Barkscorpion B` wird still zu Basic Attack auf B.

**Grundsatz:** Eine nicht sicher erkannte Handlung wird nie still durch eine andere mechanische Handlung ersetzt. Eine stille falsche Festlegung wiegt schwerer als eine unnötige Rückfrage oder ein nicht ausgeführter Zug.

**Semantik, nicht Resolution.** S4b wertet nur, ob die Absicht richtig strukturiert verstanden wurde. Beispiel: `I cast Arcane Burst into the hole to blow it open` → `ability_world`, skill = Arcane Burst, target = das Loch, goal = öffnen/erweitern. Nicht Teil von S4b:
- ob das Loch aufgeht;
- was es kostet;
- ob genug MP da sind.

Das entscheidet die Engine oder die Weltadjudikation danach.

---

## 1. Bewertung des ChatGPT-Feedbacks (02.10.)

| Punkt | Entscheidung | Begründung |
|---|---|---|
| 1. Die Kaskade A0 → Planer braucht eine echte Eskalationsregel; ein falscher, formal gültiger Commit von A0 muss abgefangen werden | **übernommen, abgewandelt** | Siehe die Ausführung unter dieser Tabelle. |
| 2. P1 und fc informationsgleich | **übernommen**, eine Abwandlung, eine Ergänzung | Siehe die Ausführung unter dieser Tabelle. |
| 3. Die stille falsche Festlegung ist die wichtigste Fehlermetrik; Klassen A–E | **übernommen, präzisiert** | Siehe die Ausführung unter dieser Tabelle. |
| 4. Kreative Fähigkeiten: Absicht statt Ausgang labeln | **übernommen** | `ability_world {skill, target, goal}`; das Ziel über ein großzügiges Muster. Neu ist `goal_mismatch`: Handlung, Skill und Ziel stimmen, nur der Freitext des Ziels passt nicht zum Gold-Muster. Das zählt gegen die Genauigkeit, aber nicht als Sicherheitsfehler, weil Freitext-Muster brüchig sind; diese Fälle werden zur Prüfung von Hand gelistet. |
| 5. Rückfrage-Policy: nicht fragen bei genau einer vernünftigen Lesart, fragen bei mehreren mechanisch verschiedenen | **übernommen** | Als Labelregeln L1 und L2, ergänzt um L3–L9 (§6). Die Labels folgen aus den Regeln. Wo das nicht reicht, ist der Fall als **Produktentscheidung** markiert (6 Fälle) und wird getrennt ausgewiesen. |
| 6. Zwei ernsthafte Richtungen: C1 (Planer → Engine → Erzähler) gegen C2 (typisiertes Function Calling); B ist nicht automatisch die C2-Referenz | **zugestimmt** | `fc` und `fc_gm` sind die sauber entworfene C2-Variante. B wird in S4b nicht gemessen; seine Schnittstelle ohne Typliste war in S4 das schwächste Glied. |
| Recherche-Einordnung (FIREBALL, RPGBench, LLM-Modulo, Labyrinth, Semantic Kernel, When2Call) | **zugestimmt** | Deckt sich mit `docs/RESEARCH_NL_TO_ENGINE.md` §2–§3. |

**Zu Punkt 1 (Kaskade):**
- **Was übernommen ist:** Das Gate ist eine deterministische **Abdeckungsregel**. A0 darf nur entscheiden, wenn jedes Wort des Handlungsteils durch exakte Katalogtreffer und eine geschlossene Liste von Funktionswörtern erklärt ist (§7).
- **Warum abgewandelt:** ChatGPTs Klassen „GENUINELY_AMBIGUOUS“ und „IMPOSSIBLE“ sind semantische Urteile; ein deterministisches Gate kann sie nicht treffen. Darum gilt:
  - Mehrdeutigkeit entscheidet der Planer.
  - Unmögliches weist die Engine nach jedem Pfad gleich ab: ein unbekannter Skill oder ein abwesendes Ziel wird verweigert, nicht ersetzt.
- **Warum mein Entwurf nicht reichte:** Er sagte „exakter Skill + exaktes Label“. Das hätte den Einzelgegner-Fall (k3_02: Ziel per Vorgabe „einziger Gegner“) und die zweite Handlung von k4_02 durchgelassen. Die Abdeckungsregel fängt beides.
- **Das Gate wird selbst gemessen:** unsicher durchgelassen = 0, alle 17 Fehlbuchungen von A0 eskaliert (§9).

**Zu Punkt 2 (Informationsgleichheit):**
- **Gleich für P1 und fc:**
  - der Systemtext bis auf die letzte Zeile (vom Test geprüft);
  - Usernachricht, Katalog und RECENT-Bedingung;
  - Intentklassen, Temperatur, Validator;
  - die wörtlich gleichen Fehlerzeilen in der einen Reparatur (vom Test geprüft).
- **Abwandlung:** `tool_choice: auto`, nicht erzwungen. Das Wesen von C2 ist, dass das Modell selbst entscheidet, ob es aufruft. Erzwungen wäre fc nur ein anderer Ausgabekanal. Ob das Tool im ersten Versuch aufgerufen wurde, wird darum getrennt gemessen.
- **Ergänzung:** `fc_gm` = fc mit Erzählervertrag und GM-Schritt statt Planer-Rolle. Das ist C2 in seiner echten Form; so misst S4b den GM-Kontext getrennt von der Schnittstelle, wie S4a für Story-Befehle.

**Zu Punkt 3 (Fehlerklassen):**
- **Die Klassen:** richtig · stille falsche Festlegung · verpasst · unnötige Rückfrage · Ziel weicht ab (zu Punkt 4).
- **Unterarten der falschen Festlegung:**
  - falsche Agency;
  - geraten;
  - Ersetzung;
  - falsches Ziel;
  - falsche Handlungsart;
  - falsche Argumente;
  - zusätzlich.
- **ChatGPTs Klasse D** („nötige Rückfrage unterlassen“) ist aufgeteilt:
  - geraten = falsche Festlegung (Unterart „geraten“);
  - nichts getan = verpasst.
- **Lexikografische Regel:** erst die falschen Festlegungen vergleichen, dann die Genauigkeit (§8). Eine Durchschnittsgenauigkeit verdeckt sie nicht.

---

## 2. Welche Fehlerquelle wo gemessen wird

S4 hatte Verständnis, Schnittstelle und Zuständigkeit vermischt. S4b trennt sie:

| Fehlerquelle | getrennt durch |
|---|---|
| Verständnis (Semantik) | Ausgangsklassen je Fall (§5), nach Kategorie |
| Schnittstelle / Format | gültig im 1. Versuch und nach typisierter Reparatur. Eine endgültig ungültige Antwort zählt Ende-zu-Ende als leerer Plan und steht mit Fehlerzeile in der Liste. |
| Tool-Aufruf ja/nein (Kalibrierung) | „Tool im 1. Versuch aufgerufen“ (fc, fc_gm) |
| Agency-Guard | Spalte „roh“ gegen „nach Guard“ |
| Erzählverlauf | p1 gegen p1_nohist auf den 5 Verlaufsfällen: aufgelöst / gefragt / falsch |
| GM-Kontext | fc gegen fc_gm |
| Brüchigkeit der Gold-Muster | `goal_mismatch` getrennt, von Hand zu prüfen |
| Produktentscheidungen | getrennt ausgewiesen (Kennzahl ohne sie) |
| Resolution (ob es wirkt) | nicht Teil von S4b |

---

## 3. Arme

| Arm | Schnittstelle | Kontext | RECENT | Modellaufrufe | Frage |
|---|---|---|---|---|---|
| `a0` | – | – | – | 0 | Was Avereth heute entscheidet (`readTurn` → `parseIntent`, unverändert) |
| `p1` | JSON-Text | Planer-Rolle | ja | 1 (+1 Reparatur) | C1-Planer |
| `p1_nohist` | JSON-Text | Planer-Rolle | **nein** | 1 (+1) | Braucht der Planer den Verlauf? |
| `fc` | **Tool `plan_turn`** (typisiertes `kind`, `tool_choice: auto`) | Planer-Rolle | ja | 1 (+1) | C2-Schnittstelle bei gleicher Information |
| `fc_gm` | Tool `plan_turn` | **Erzählervertrag + GM-Schritt** | ja | 1 (+1) | C2 in echter Form: hilft oder schadet der GM-Kontext? |
| Kaskade A0 → Arm | – | – | – | – | Wird in jedem LLM-Lauf ohne Zusatzaufruf abgeleitet: A0 entscheidet, wo das Gate es zulässt, sonst der Arm |

**Gleich für alle LLM-Arme:**
- Regeln, Intentklassen und Beispiele. Die Beispiele haben einen eigenen Katalog (Frost Dart, Cave Rat …); keines nennt eine Szene oder einen Skill des Korpus (vom Test geprüft).
- Katalog und Validator, die eine Reparatur mit typisierten Fehlerzeilen, Agency-Guard und Wertung.
- t 0,1, max. 2.500 Token, Reasoning wie konfiguriert, seriell.

**Prompt-Größe je Fall** (Schätzung): p1 ≈ 1,6k, p1_nohist ≈ 1,6k, fc ≈ 2,0k, fc_gm ≈ 8,1k Token.

**Designentscheidung, offen benannt:** Der Planer-Prompt enthält die Produkt-Policy (die Regeln aus §6) als Anweisung. S4b misst also, ob das Modell diese Policy auf ungesehene Formulierungen anwendet, nicht, ob es sie selbst erfindet. A0 kennt nur seine Regex-Regeln.

---

## 4. Korpus und Szenen

**Szenen** (`tests/eval/s4b_scenes.json`): Jede wird als echter Engine-Zustand gebaut:
- Klasse und Skills gewählt;
- Ankunft;
- Erzähler-Bericht mit den Anwesenden und dem Kampf.

Danach werden Bänder und HP gesetzt. A0 liest diesen Zustand. Die LLM-Arme sehen den daraus gerenderten Katalog plus Merkmale, Orte und RECENT.

| Szene | Alaric | Gegner / Anwesende | Merkmale |
|---|---|---|---|
| `burrow_fight` | Mage: Flame Lance, Arcane Burst | Barkscorpion A (ENGAGED), B (SHORT, schwer verwundet), C (MEDIUM) | rissiger Boden, Loch, Strickleiter, Geröll |
| `burrow_dry` | Mage | Dry-Brown Barkscorpion A, B (lange Labels) | Strickleiter, Geröll |
| `burrow_single` | Mage | ein Barkscorpion (ENGAGED) | wie oben |
| `wolf_fight` | Ranger: Aimed Shot, Twin Shot | Grey Wolf A, Grey Wolf B (verwundet), Dire Wolf A (riesig) | tote Kiefer, Gestrüpp |
| `bandit_fight` | Warrior: Heavy Slash, Guard | Bandit A, B (verwundet), Brede (Händler, nicht feindlich) | umgekippter Karren, Laterne am Seil |
| `burrow_after` | Mage, kein Kampf | toter Barkscorpion; zwei geflohen (nur RECENT) | Loch, Geröll, Boden |
| `town` | Mage, kein Kampf | Hesta (Händlerin) | kalte Feuerschale, klemmende Tür |

**Fälle** (`tests/eval/s4b_cases.jsonl`): 91, von Hand gelabelt, je mit Labelregel.

| Kat. | Inhalt | Fälle |
|---|---|---|
| K0 | exakt (Kontrollen; der Schnellpfad soll sie nehmen) | 8 |
| K1 | Skill-Aliase und Tippfehler | 11 |
| K2 | freie Zielreferenzen | 15 |
| K3 | bekannte Fähigkeit auf die Welt | 12 |
| K4 | Kampf + Welt in einer Nachricht | 5 |
| K5 | Suche / Reise / Kampf | 10 |
| K6 | echt mehrdeutig → fragen | 10 |
| K7 | unbekannt / unmöglich → keine Ersatzhandlung | 8 |
| K8 | keine Handlung Alarics | 12 |

Stabilitäts-Teilkorpus (`stab`): 30 Fälle aus allen Kategorien. Produktentscheidungen: 6. Verlaufsfälle (`needs_history`): 5.

**Warum 91 statt der geplanten etwa 75:**
- **K0 kam neu dazu.** Ohne exakte Kontrollen ist weder der Schnellpfad noch „das LLM verdirbt nichts, was A0 kann“ messbar.
- **K2 wuchs auf 15**, weil Referenzen die häufigste reale Form sind.
- **K8 wuchs auf 12**, weil falsche Agency die teuerste Fehlerart ist.
- **K4 schrumpfte auf 5:** Kombinierte Handlungen ohne strittige Labels sind selten.

**Was diese Größe messen kann:**
- Der Abstand A0 gegen Planer ist groß: A0 bucht 16 der 61 Problemfälle still falsch. 91 Fälle reichen dafür.
- Zwischen P1 und fc sind nur große Unterschiede messbar: etwa ≥ 8 abweichende Fälle im Verhältnis von etwa 7 : 1.

Qualität und Trennschärfe gingen vor Größe.

---

## 5. Gold-Schema und Intentklassen

**Plan:** `{"intents": [...]}`. Eine leere Liste heißt: keine Engine-Handlung.

| `kind` | Felder | Bedeutung |
|---|---|---|
| `attack` | `skill`, `target` (Id, `{"new": …}` oder `null` bei Flächen-Skill), `quote` | Angriff |
| `skill` | `skill`, `target` \| null, `quote` | Skill, der kein Angriff ist (Guard, Ward, Blink) |
| `move` | `dir` (`closer`/`away`), `target` \| null, `quote` | im Kampf näher oder weg |
| `flee` | `quote` | im Kampf fliehen |
| `ability_world` | `skill`, `target` (Merkmal-Id oder `{"new": …}`), `goal`, `quote` | bekannte Fähigkeit auf eine Sache |
| `search` | `what` \| null, `quote` | außerhalb des Kampfs suchen |
| `go` | `to` (Orts-Id oder `{"new": …}`), `quote` | außerhalb des Kampfs gehen |
| `clarify` | `about` (`target`/`skill`/`action`), `question`, `options` | nachfragen statt raten |

**`skill`** ist eine Id aus KNOWN SKILLS oder `{"new": "<Name>"}` für einen Skill, den Alaric nicht kennt.

**Was die Engine mit jedem Intent tut** (`engineView`):
- **commit:** die Handlung wird ausgeführt.
- **refused:** ein unbekannter Skill (`{"new"}`) oder ein Kampfziel, das nicht da ist, wird verweigert, nicht ersetzt.
- **ask:** `clarify`; dazu gehört ein Angriff mit Einzelziel-Skill ohne Ziel, bei dem die Engine fragt.

**Gold je Fall:**
- `accept`: eine oder mehrere akzeptierte Pläne.
- `forbid`: gefährliche Lesarten, etwa Basic Attack bei einem Skill-Alias oder ein Angriff, wo die Welt gemeint ist.
- `needs_history`, `product`, `rule`, `tags`.

**Werte in Gold-Intents:**
- exakte Id;
- `"/Muster/i"`, angewandt auf einen String oder einen `{new}`-Text;
- `{"new": "/Muster/"}`;
- eine Liste von Alternativen;
- `"any"`;
- `{"kind": "unknown_attempt", "name": "/…/"}`: irgendein verweigerter Versuch mit genau diesem unbekannten Skill.

**Ausgang je Fall,** in dieser Reihenfolge der Schwere:

| Ausgang | Bedeutung |
|---|---|
| **falsche Festlegung** | Ein Commit, den kein akzeptierter Plan deckt oder den `forbid` nennt. Unterarten: falsche Agency (in der Nachricht war keine Handlung) · geraten (nur Fragen war richtig) · Ersetzung (anderer Skill oder verbotene Lesart) · falsches Ziel · falsche Art (z. B. Angriff auf den Skorpion statt Fähigkeit auf den Boden) · falsche Argumente · zusätzlich |
| verpasst | Nichts falsch festgelegt, aber eine Handlung (oder die nötige Frage) fehlt. Dazu zählen eine leere oder ungültige Antwort und ein verweigerter Skill, wo ein bekannter gemeint war. |
| unnötige Rückfrage | gefragt, wo Handeln richtig war |
| Ziel weicht ab | Handlungen richtig, nur das Freitext-Ziel passt nicht zum Gold-Muster |
| richtig | ein akzeptierter Plan, Intent für Intent, und nichts darüber hinaus |

---

## 6. Labelregeln und Rückfrage-Regeln (vorab, objektiv vor intuitiv)

| Regel | Inhalt |
|---|---|
| **L1** eindeutig → handeln | Bleibt nach Katalog und RECENT genau eine Engine-Handlung, die zu allem passt, was der Spieler ausdrückt, ist sie das Gold. Eine Rückfrage ist dann **nicht** akzeptiert. Das gilt für Aliase und Tippfehler, wenn genau ein bekannter Skill passt (`Fire Lance` → Flame Lance), für eindeutige Teil-Labels (`Barkscorpion B`, `B`) und Beschreibungen (`the wounded one`, wenn nur einer verwundet ist). |
| **L2** mehrdeutig → fragen | Bleiben zwei oder mehr Lesarten, die sich mechanisch unterscheiden (Ziel, Skill, Handlungsart), ist das Gold die Rückfrage. Jede Festlegung ist dann Raten (falsche Festlegung). |
| **L3** nichts passt → keine Ersatzhandlung | Ein unbekannter oder nicht gelernter Skill, ein abwesendes Ziel: Gold ist der als `{"new"}` markierte Versuch (die Engine verweigert) oder eine Rückfrage. Jeder andere Skill, Basic Attack oder ein anderes Ziel ist Ersetzung. |
| **L4** kein Skill genannt | Ein Angriff ohne Skill und ohne Hinweis darauf (`I attack B`, `I hit it`, `I shoot`) ist Basic Attack. Das ist die kanonische Bedeutung, keine Ersetzung. |
| **L5** Fähigkeit auf die Welt | Eine bekannte Fähigkeit auf eine Sache, kein Lebewesen: `ability_world {skill, Merkmal, Ziel}`. Nie werten, ob es wirkt. |
| **L6** mehrere Handlungen | eine je Handlung, in der Reihenfolge des Spielers |
| **L7** Kampf oder nicht | Im Kampf ist Weggehen flee/move, nicht Reise. Außerhalb ist Suchen search und Gehen go. |
| **L8** keine Handlung | Frage, Gedanke, Plan oder Bedingung für später, Erinnerung, Rede (auch Drohung), Handlung anderer: leerer Plan. Jede Festlegung ist falsche Agency. |
| **L9** Verlauf | Referenzen, die nur RECENT auflöst (`the one that stung me`): mit Verlauf L1. Ohne Verlauf (Arm p1_nohist) ist auch eine Rückfrage akzeptiert. |

**Produktentscheidungen, bitte bestätigen oder umdrehen** (bisher: beide Lesarten akzeptiert, außer k6_08):

| Fall | Text | bisheriges Gold |
|---|---|---|
| k2_13 | `I attack the salt merchant` | angreifen **oder** bestätigen lassen |
| k2_15 | `I Flame Lance the second one` (Labels A/B) | B **oder** fragen |
| k3_12 | `I Heavy Slash the lantern's rope so the lantern drops on Bandit B` | Fähigkeit auf die Laterne **oder** fragen, wie aufzulösen |
| k5_10 | `I scan the treeline for more wolves` (im Kampf) | keine Handlung **oder** fragen; keine Suche |
| k6_08 | `I blast Barkscorpion B` | **nur fragen** (Flame Lance, Basic Attack oder Arcane Burst). Ein GM, der „blast“ als Flame Lance liest, wäre die andere Produktwahl. |
| k8_09 | `I keep my bow trained on the dire wolf and wait` | keine Handlung **oder** fragen |

Jede Kennzahl wird zusätzlich ohne diese 6 Fälle ausgewiesen.

---

## 7. Gate der Kaskade und die Engine-Regel für Unmögliches

**Gate** (`gate()` in `tools/p0/lib/s4b.mjs`): A0 darf nur entscheiden, wenn nach dem Entfernen von
- dem exakt genannten Skill-Namen (A0s eigenem Matcher),
- dem exakten Label oder Namen des Ziels und
- einer geschlossenen Liste von Funktionswörtern (I, the, at, cast, use, attack, hit, it …)

**kein Wort** des Handlungsteils übrig bleibt.

| Klasse | Bedingung | Folge |
|---|---|---|
| `FAST_COMMIT` | attack/skill; Skill exakt genannt (oder ein reines Angriffsverb für Basic Attack); Ziel per Label, Name, Pronomen oder einziges Ziel; kein Restwort; nicht zwei Skills genannt | A0 bucht ohne LLM |
| `FAST_CLARIFY` | A0 fragt nach dem Ziel; der Spieler nannte kein Ziel; der Skill braucht eines | die Rückfrage der Engine |
| `FAST_REJECT` | ein exakt genannter Skill, den Alaric nicht kennt; kein Restwort | die Engine verweigert |
| `ESCALATE` | alles andere | Planer |

„Alles andere“ umfasst:
- Aliase, Tippfehler und Beschreibungen;
- Weltziele und mehrere Handlungen;
- Bewegung, Suche und Reise;
- alles, was A0 als Erzählung liest oder an seinen Interpreter gibt.

Mehrdeutigkeit und Unmöglichkeit sind keine Gate-Klassen (§1). Für **jeden** Pfad gilt hinter dem Plan dieselbe deterministische Engine-Regel: Ein unbekannter Skill oder ein abwesendes Kampfziel wird verweigert, nie ersetzt.

**Gemessen** (offline, deterministisch, Korpus v1):
- 7 FAST_COMMIT, 1 FAST_CLARIFY, 3 FAST_REJECT, 80 ESCALATE;
- **unsicher durchgelassen: 0**;
- alle 17 Fehlbuchungen von A0 eskaliert;
- 25-mal eskaliert, obwohl A0 richtig lag. Das kostet nur einen Planer-Aufruf.

**Einschränkung:** Gate und Korpus stammen vom selben Autor. Der eigentliche Test des Gates sind echte Spielprotokolle.

---

## 8. Metriken und vorab festgelegte Kriterien

**Metriken je Arm** (alle Fälle, Ende-zu-Ende; eine ungültige Antwort ist ein leerer Plan):

| Metrik | Definition |
|---|---|
| **Absicht richtig** (E2E Intent Accuracy) | richtig / alle Fälle |
| **stille falsche Festlegungen** (Silent Wrong Hard Commit Rate) | falsche Festlegungen / alle Fälle, nach Unterart; eigens auf den Fällen, die A0 heute falsch bucht |
| verpasste Handlung (Missed Action Rate) | verpasst / Fälle mit Handlung |
| unnötige Rückfrage | unnötige Rückfrage / Fälle, in denen nur Handeln richtig ist |
| Rückfrage-Recall | richtig / Fälle, in denen nur Fragen richtig ist |
| Rückfrage-Präzision | richtig / Antworten, die nur fragen |
| falsche Agency | falsche Festlegungen auf Negativfällen |
| Gate | unsicher durchgelassen, eskalierte A0-Fehlbuchungen, Anteil ohne LLM |
| Stabilität | pass^3 (in allen 3 Läufen richtig), safe^3 (in keinem Lauf falsch festgelegt), gleicher Plan |
| Betrieb | gültig im 1. Versuch / nach Reparatur, Tool im 1. Versuch aufgerufen, Latenz p50/p90 bis zum gültigen Plan, Prompt- und Output-Token |

**Schwere** (vorab): falsche Festlegung ≫ verpasst ≈ unnötige Rückfrage > Ziel weicht ab. Innerhalb der falschen Festlegungen zählen falsche Agency und Ersetzung auf einem genannten Skill am schwersten.

**Kriterien, ob ein LLM-Arm die Produktfrage trägt** (alle vier erfüllt; die summary.md prüft sie selbst):

| | Kriterium |
|---|---|
| **K-S** Sicherheit | höchstens 3 stille falsche Festlegungen auf allen 91 Fällen, davon höchstens 1 auf den 17 Fällen, die A0 heute falsch bucht |
| **K-V** Verständnis | Absicht richtig auf der Problemklasse (K1–K5, K7; 61 Fälle) ≥ 80 % und ≥ A0 + 30 Prozentpunkte |
| **K-F** Fragen | Rückfrage-Recall ≥ 70 % und unnötige Rückfragen ≤ 15 % der reinen Handlungsfälle |
| **K-N** Negativ | höchstens 1 falsche Agency auf den Negativfällen |
| **K-R** Robustheit | im Stabilitätslauf safe^3 ≥ 29/30 und pass^3 ≥ 80 % |

**Vergleiche** (lexikografisch: erst falsche Festlegungen, dann Genauigkeit):
- **P1 gegen fc (C1 gegen C2-Schnittstelle):**
  - Liegt eine Seite um ≥ 2 falsche Festlegungen vorn, entscheidet das.
  - Sonst entscheidet ein Vorzeichentest auf „richtig“ mit p ≤ 0,05.
  - Sonst sind beide gleichwertig innerhalb der Messgenauigkeit. Dann entscheiden Latenz, Token, Integration und der Live-Paarlauf.
- **Verlauf (p1 gegen p1_nohist)** auf den 5 Verlaufsfällen: Der Planer braucht den Erzählverlauf, wenn alle drei gelten:
  - p1 löst mindestens 2 Fälle mehr auf (richtige Handlung);
  - p1_nohist rät nicht seltener falsch;
  - die übrigen Kennzahlen bleiben gleich.
- **GM-Kontext (fc gegen fc_gm):** dieselbe lexikografische Regel. Ist fc_gm schlechter, schadet der Erzählerkontext C2 in seiner echten Form. Ist er gleich, ist C2 semantisch tragfähig, und die Frage wandert zu Latenz und Integration.
- **Kaskade:** Pflicht ist „unsicher durchgelassen“ = 0. Tragfähig ist sie, wenn
  - „richtig“ der Kaskade ≥ „richtig“ des Arms − 2 ist und
  - die Kaskade nicht mehr falsch festlegt als der Arm.

  Berichtet wird, welcher Anteil der Züge ohne LLM entschieden wird.

---

## 9. A0, heute gemessen (offline, deterministisch, 02.10.)

`node tools/p0/s4b_intent.mjs --arm a0`

| | A0 |
|---|---|
| Absicht richtig, alle Fälle | 36/91 = **39,6 %** |
| Absicht richtig, Problemklasse (K1–K5, K7) | 12/61 = **19,7 %** |
| **stille falsche Festlegungen** | **17** (14 Ersetzungen, 1 falsches Ziel, 1 falsche Art, 1 falsche Agency) |
| unnötige Rückfragen (von reinen Handlungsfällen) | 33,3 % |
| Rückfrage-Recall / -Präzision | 70 % / 31 % |

| Kat. | richtig / falsch festgelegt / verpasst / unnötig gefragt |
|---|---|
| K0 exakt | 7 / 0 / 0 / 1 |
| K1 Aliase | 1 / 6 / 4 / 0 |
| K2 Referenzen | 3 / 1 / 1 / 10 |
| K3 Welt | 0 / 6 / 0 / 6 |
| K4 Kampf + Welt | 0 / 1 / 2 / 2 |
| K5 Suche/Reise | 3 / 0 / 7 / 0 |
| K6 mehrdeutig | 7 / 0 / 3 / 0 |
| K7 unbekannt | 5 / 2 / 1 / 0 |
| K8 keine Handlung | 10 / 1 / 0 / 1 |

**Die stillen Fehlbuchungen von A0, typische Muster:**
- **Basic Attack statt des genannten Skills:** `Fire Lance`, `fire spear`, `twinshot`, `heavy-slash`, `Fireball`.
- **Angriff auf den einzigen Gegner statt Fähigkeit auf die Welt:** `I Flame Lance the cracked floor`, `burn through the rope ladder`, `Arcane Burst into the hole`.
- **Angriff auf die Händlerin Hesta**, weil sie als einziges Ziel anwesend ist:
  - beim Anzünden einer Feuerschale;
  - beim Öffnen einer Tür;
  - bei einem Gedanken: `I wonder whether Flame Lance could melt the lock`.
- **`… the one who cut Brede's purse`** → Angriff auf Brede.

**Hinweis zu K5:** 10 Fälle außerhalb eines Kampfs gibt A an seinen Story-Interpreter (S1) weiter, statt sie selbst zu entscheiden. A0 zählt dort als „verpasst“. Das gemessene A0 ist der deterministische Teil von A.

---

## 10. Was S4b beantworten kann, und was ausdrücklich nicht

**Beantwortet:**
1. Löst eine LLM-Semantikstufe Aliase, Referenzen, kreative Nutzung, Kampf + Welt und Suche/Reise **ohne** stille Ersatzhandlungen besser als A heute?
2. Fragt sie bei echter Mehrdeutigkeit, und nur dann?
3. Verweigert sie Unbekanntes, statt es zu ersetzen (mit der Engine-Regel)?
4. C1 gegen C2 auf der Ebene der Absicht: Kostet die Tool-Schnittstelle bei gleicher Information Genauigkeit oder Sicherheit?
5. Schadet oder hilft der Erzählerkontext in C2s echter Form (fc_gm)?
6. Braucht der Planer den Erzählverlauf?
7. Trägt ein deterministischer Schnellpfad, und wie viele Züge spart er?
8. Wie stabil sind die Entscheidungen über 3 Läufe?
9. Latenz und Token der Semantikstufe.

**Nicht beantwortet:**
- ob eine Handlung wirkt, was sie kostet, welche Folgen sie hat (Engine, Weltadjudikation);
- Prosaqualität und Treue der Erzählung zum Ergebnis;
- Persistenz kreativer Weltfolgen;
- Swipe, Regenerate und Streaming in SillyTavern;
- Gesamtlatenz eines Zuges mit Erzähler;
- Planen und Erzählen in **einem** Aufruf;
- andere Modelle als das eingesetzte;
- andere Sprachen als Englisch;
- echte Spielprotokolle statt eines kuratierten Korpus.

Das ist Sache des Live-Paarlaufs (Review §11.3) nach S4b.

---

## 11. Befehle (seriell) und Rückgabe

Windows/PowerShell; der Key bleibt in SillyTavern (`docs/P0_SPIKES.md` §3.2). SillyTavern läuft mit der Quelle „Custom (OpenAI-compatible)“ und dem Spielmodell.

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
git checkout chatgpt/narrator-gm-tools-2026-10-02
git pull
node tools/p0/s4b_intent.mjs --arm a0
node tools/p0/s4b_intent.mjs --arm p1 --dry-run
node tools/p0/s4b_intent.mjs --arm p1 --concurrency 1
node tools/p0/s4b_intent.mjs --arm fc --concurrency 1
node tools/p0/s4b_intent.mjs --arm p1 --tags stab --reps 3 --concurrency 1
node tools/p0/s4b_intent.mjs --arm fc --tags stab --reps 3 --concurrency 1
node tools/p0/s4b_intent.mjs --arm p1_nohist --concurrency 1
node tools/p0/s4b_intent.mjs --arm fc_gm --concurrency 1
node tools/p0/s4b_intent.mjs --report p0_out/s4b_a0/results.json p0_out/s4b_p1/results.json p0_out/s4b_fc/results.json p0_out/s4b_p1_nohist/results.json p0_out/s4b_fc_gm/results.json --out p0_out/s4b_report
```

- **Reihenfolge = Priorität.**
  - p1 und fc sind die Hauptfrage.
  - Die beiden Stabilitätsläufe prüfen K-R.
  - p1_nohist und fc_gm sind Zusatzfragen; fc_gm ist der teuerste Lauf (≈ 8k Prompt-Token je Fall).
- **Ausgaben:**
  - `p0_out/s4b_<arm>/`;
  - Stabilitätsläufe in `p0_out/s4b_<arm>_stab/`;
  - der Vergleich in `p0_out/s4b_report/`.
- **Umfang** (Schätzung):
  - Haupt- und Zusatzläufe: je 91 Aufrufe (+ Reparaturen);
  - Stabilitätsläufe: je 90 Aufrufe;
  - zusammen ≈ 1,5 M Prompt-Token.

**Zurückschicken:**
- alle `summary.md`: `s4b_a0`, `s4b_p1`, `s4b_fc`, `s4b_p1_stab`, `s4b_fc_stab`, `s4b_p1_nohist`, `s4b_fc_gm`, `s4b_report`;
- die `results.json` von p1, fc, p1_nohist und fc_gm. Sie enthalten die Pläne je Fall, aber keinen Key, keinen Header und keine URL.

---

## 12. Grenzen und Risiken dieses Designs

- **Optimismus:** Korpus, Labels und Gate stammen vom selben Autor. Ein Fall wurde nachträglich gelockert: k6_07 akzeptiert auch eine Rückfrage zum Skill, weil Ziel und Skill dort offen sind. Echte Spielprotokolle sind der eigentliche Test.
- **Die Policy steht im Prompt:** S4b misst, ob sie angewandt wird, nicht, ob ein Modell sie selbst findet.
- **Gold-Muster für Ziele sind Näherungen.** Darum gibt es `goal_mismatch` mit Prüfung von Hand.
- **A0 läuft auf einem V3-gebauten Zustand mit V4-Kennzeichen.** Kämpfe gehen in V4 denselben Regex-Pfad (`route 'fight'`); die Ausgaben für die Beispielsätze waren identisch (Review §16.10).
- **Ein Modell, Englisch, eine Wiederholung** (außer den Stabilitätsläufen), t 0,1.
- **Statistik:** Zwischen nahen Armen erkennt S4b nur große Unterschiede. Für feinere braucht es einen größeren Lauf oder echte Protokolle.
