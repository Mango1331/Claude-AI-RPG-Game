# Avereth – Deep Review: Kampf-Vereinfachung + Runtime V3

> **Umgesetzt** in Engine 3.0.0; Umsetzung, Messungen und Megumin-Checkliste in [RUNTIME_V3.md](RUNTIME_V3.md).
> Die Umsetzung folgt dem Vorschlag. Unterschiede:
> - Die optionale Monster-ATK-Korrektur bleibt bis nach Test 5 aus (Entscheidung im Auftrag).
> - Die Schlüssel heißen anders: `rules.cover.partial_damage_reduction_pct` statt `damage.partial_cover_pct`, die Minderung steht pro Skill als `incoming_damage_reduction`.
>
> Dieses Dokument bleibt als Stand vor der Umsetzung erhalten.

Stand: nach Testrun 4 (Commit `1bb632b`). Dieses Dokument ist **Review und Vorschlag**, keine Umsetzung: Engine, Inhalte und
Tests sind unverändert. Umgesetzt wird erst nach Freigabe (Reihenfolge in Abschnitt 8).

Messbasis: die Logger-Dateien von Testrun 2, 3 und 4 (36 Antworten, davon 35 mit Usage, alle GLM-5.3-Flash über den
Custom-Endpoint, `reasoning_effort: high`, `stream: false`), die Chat-JSONL von Testrun 4 und die Engine-Replays
(`tests/testrun_v*/fixture.json`). Die im Auftrag genannten Test-5-Zahlen (GLM low reasoning 22.429 / 1.836, Gemini 3.5
Flash 21.642 / 1.189) lagen nicht als Datei vor; sie sind unten nur eingeordnet, nicht nachgemessen.

---

## 0. Kurzfassung

1. **Die Wartezeit entsteht fast nur beim Schreiben (Decode), nicht beim Lesen.** Dauer ≈ −9,5 s + **53 s je 1.000
   Output-Token** + **1,0 s je 1.000 Prompt-Token** (R² 0,96, n = 34). Der Endpoint dekodiert mit ≈ 19 Token/s, 3–5×
   langsamer als die öffentlichen Messungen für GLM-5.3-Flash.
2. **Ein Drittel des Outputs sind Tracker-Blöcke, die die Engine schon kennt.** Reasoning 41 %, `<Blocks>` 32 %, Prosa
   22 %, Fact-Report 4 %. Das sind ≈ 600–650 Token ≈ 32–35 s pro Zug für World_State, Character_Sheet, New_NPC und
   NPC_Update, also für Zustand, den die Engine schon hat. Diese Kopie war in Testrun 4 auch falsch: Zug 13 zeigte HP
   71 statt 77, STA 57 statt 64 und XP einen Zug zu spät.
3. **Das Megumin-NPC-Dossier-System sollte vollständig raus.** Es kostet in Zug 13 **≈ 5.200 Prompt-Token (20 %)**, im
   Schnitt ≈ 200 Output-Token (≈ 11 s) und in Vorstellungszügen ≈ 850 Output-Token (≈ 45 s). Außerdem hat es in Testrun 4
   **falschen Kanon aus einem verworfenen Versuch** in jeden späteren Prompt getragen (Abschnitt 4.2). Ersatz ist ein
   kleiner NPC-Record, der fast vollständig aus Events besteht, die die Engine heute schon führt.
4. **Mechanik:** Die Entscheidungen aus dem Auftrag lassen sich klein umsetzen:
   - kein Hit-Wurf, keine Zufalls-Crits, PER raus aus dem Kampf;
   - Ambush garantiert ×1,5;
   - Partial Cover −25 % Schaden;
   - Verteidigungs-Skills wirken als Schadensminderung statt als Hit-Malus.

   Die Balance bleibt im Verhältnis erhalten, weil beide Seiten heute ≈ 73–75 % treffen. Kämpfe werden ≈ 25 % kürzer,
   was auch weniger LLM-Züge pro Kampf bedeutet. Nur Anker mit altem Hit < 70 (Oger, Hirsch, Pferd) brauchen eine
   Prüfung (Abschnitt 3).
5. **Runtime V3 = V2 minus Tracker, minus Dossiers, plus situative Teile.** Die Engine rendert Status und NPC-Record, das
   Schema wird situativ, der Verlauf begrenzt, Streaming kommt dazu. Ziel pro Zug:
   - Prompt ≈ 11–14k, Output ≈ 0,8–1,2k;
   - auf der heutigen Route ≈ 45–70 s statt 80–190 s, auf einer schnellen Route ≈ 8–15 s.
6. **Was bleibt, wie es ist:**
   - Agency und PLAYER OWNERSHIP, Thought Firewall;
   - NPC-Wissensgrenzen, Event Sourcing und Swipe-Sicherheit;
   - mechanische Autorität, Quest- und NPC-Persistenz, Lore;
   - Core-#7-Checks mit Zufall und PER.

---

## 1. Root Cause Analysis

### 1.1 Messung

| Lauf | Züge | Median Dauer | Max | Median Prompt | Median Completion | cached_tokens |
|---|---|---|---|---|---|---|
| Testrun 2 | 11 | 128 s | 224 s | 18.698 | 2.359 | 0 |
| Testrun 3 | 10 | 79 s | 232 s | 17.913 | 1.427 | 0 |
| Testrun 4 | 14 | 128 s | 555 s | 21.647 | 2.063 | 0 |

Lineare Regression über alle 34 Züge ohne den 555-s-Ausreißer (Testrun 4, Zug 7, ein Provider-Hänger von ≈ +345 s
gegenüber dem Modell):

- Dauer ≈ 7,8 s + 54,3 s × Completion-kTok (R² 0,956);
- mit Prompt: Dauer ≈ −9,5 s + 53,2 s × Completion-kTok + 1,01 s × Prompt-kTok (R² 0,960).

Daraus folgt:

- **Decode ≈ 19 Token/s.** [Artificial Analysis](https://artificialanalysis.ai/models/glm-5-3-flash) misst für
  GLM-5.3-Flash 61–95 Token/s, für [Gemini 3.5 Flash](https://artificialanalysis.ai/models/gemini-3-5-flash) 212–280.
  Die Route des Nutzers ist also selbst für dieses Modell langsam; das ist Provider- oder Routing-Sache, nicht Engine.
- **Prefill ≈ 1 s je 1.000 Prompt-Token.** Ein 26k-Prompt kostet ≈ 26 s, ein 12k-Prompt ≈ 12 s. Prefill ist
  rechengebunden und parallel, Decode speicherbandbreitengebunden und sequenziell
  ([Parasail](https://www.parasail.io/blog/prefill-vs-decode-llm-inference),
  [Redis](https://redis.io/blog/prefill-vs-decode/),
  [HF/tngtech](https://huggingface.co/blog/tngtech/llm-performance-prefill-decode-concurrent-requests)). Jedes
  Output-Token ist hier ≈ 50× so teuer wie ein Prompt-Token.
- **Kein Cache-Treffer in 35/35 Anfragen.** Z.ai cached automatisch und meldet das in
  `usage.prompt_tokens_details.cached_tokens` ([Doku](https://docs.z.ai/guides/capabilities/cache), nur über das
  Suchergebnis gelesen, der Host ist hier gesperrt). Gemini cached implizit ab 1.024 Token bei identischem Präfix
  ([Blog](https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/),
  [Doku](https://ai.google.dev/gemini-api/docs/caching); Bericht über fehlende Treffer:
  [python-genai #2064](https://github.com/googleapis/python-genai/issues/2064)). Unser Prompt verhindert das zusätzlich:
  der Lorebook-Block steht nach ≈ 7,5k statischen Token mitten im System-Prompt und wechselt je Zug, die NPC-Bank
  wächst am Ende.
- **Die Engine selbst kostet nichts Messbares:** fold, Kontext und Report-Prüfung laufen im Millisekundenbereich; die
  Replays von 15 Zügen dauern unter 1 s.

### 1.2 Woraus der Output besteht

Anteil an Content + Reasoning (Zeichen); Summenzeilen aus den 35 Zügen mit Usage (Ø 1.984 Completion-Token), die vier Block-Zeilen aus allen 36 Antworten:

| Teil | Anteil | Zeichen/Zug | ≈ Token/Zug | ≈ Sekunden/Zug (19 tok/s) |
|---|---|---|---|---|
| Reasoning | 41 % | ≈ 3.200 | ≈ 820 | ≈ 44 |
| Prosa | 22 % | ≈ 1.700 | ≈ 435 | ≈ 23 |
| **World_State** | 16,4 % | 1.334 | ≈ 340 | ≈ 18 |
| **Character_Sheet** | 5,3 % | 432 | ≈ 110 | ≈ 6 |
| **New_NPC** | 5,9 % | 479 | ≈ 120 | ≈ 6 |
| **NPC_Update** | 2,0 % | 162 | ≈ 40 | ≈ 2 |
| Fact-Report | 4 % | ≈ 340 | ≈ 85 | ≈ 5 |
| *Blocks gesamt (mit Rahmen)* | *32 %* | *≈ 2.500* | *≈ 640* | *≈ 34* |

Die fett markierten Zeilen sind **Zustandskopien**. Zusammen mit dem Blocks-Rahmen sind das 32 % des Outputs. Dazu kommen
die Reasoning-Anteile, die über diese Blöcke entscheiden: mindestens 5,6 % der Reasoning-Sätze prüfen
Dossier-Berechtigung (NAMED/VOICED/STAKED, Exclusion Veto).

### 1.3 „If the Engine already knows it, why is the LLM being asked to reconstruct it?"

Testrun 4, das Character_Sheet des Narrators gegen die Engine (Replay):

| Zug | Engine | LLM-Sheet |
|---|---|---|
| 11 | HP 77, STA 76 | HP 74 („−6 two vermin bites"), STA 76 |
| 12 | HP 77, STA 64, XP 10 | HP 71 („−3 third bite"), STA 64, XP 0 |
| 13 | HP 77, STA 64, XP 10 | HP 71, **STA 57 („−7 Aimed Shot")**, XP 10 |

In Zug 13 hat die Engine den Schuss auf „the second one" abgelehnt: kein Ziel, nichts verbraucht. Das Sheet zog trotzdem
7 STA ab. Der Spieler sieht also zwei widersprüchliche Stände: das Engine-Panel und das LLM-Sheet. Der World_State
verlangt außerdem pro Zug und pro anwesendem NPC ein Feld „*Secret:* [What they know or want that the PC doesn't know]".
Das Template erzwingt damit **jeden Zug neuen Kanon**. So ging es mit Fennicks Geheimnis:

1. Es entstand in Zug 8 als erfundenes „Tier 2"-Secret im Dossier: „went down alone three weeks ago, saw the eyes".
2. Von Zug 11 bis 13 lief es im Secret-Feld mit und wuchs dabei: erst „knew there were two", dann „known about the drain
   gap".
3. Schließlich kam es über einen Report als Erinnerung in die Engine.

Das NPC_Update von Zug 12/13 schrieb außerdem „took three bites" in Fennicks Wissen über Alaric. Die Engine hatte einen
Biss (3 HP).

**Befund:** Die Tracker sind kein Performance-Detail, sondern ein zweites, unvalidiertes Zustandssystem. Es ist langsam
(≈ 32–35 s pro Zug), falsch und erfindet Kanon.

### 1.4 Einordnung der Test-5-Zahlen aus dem Auftrag

- **GLM low reasoning, 22.429 / 1.836:** Auch mit wenig Reasoning bleiben ≈ 1,8k Output-Token. Nach Abschnitt 1.2 ist
  davon mindestens ein Drittel Blocks. Das bestätigt: Reasoning senken allein reicht nicht.
- **Gemini 3.5 Flash, 21.642 / 1.189:** 1.189 Token dauern dort bei 200+ tok/s ≈ 5–6 s Decode. Wenn Gemini-Züge
  trotzdem langsam wirkten, lag das an Prefill, TTFT oder Warteschlange, nicht am Output. Bitte die Logger-Datei eines
  solchen Zuges nachreichen, dann messe ich TTFT und Dauer getrennt.

---

## 2. Prompt-Token-Budget (echte Züge aus Testrun 4)

Zerlegt nach Zeichen je Segment und auf die gemeldeten `prompt_tokens` skaliert (4,35 bzw. 4,29 Zeichen/Token).

| Segment | Zug 7 (Gilde, 20.093) | Zug 13 (Keller-Kampf, 26.377) | V3-Ziel |
|---|---|---|---|
| Megumin: Stil/Erzählregeln (`<dialogue>`, `<narration>`, `<story>`, `<world>`, `<content>`) | 4.469 | 4.525 | 3.500–4.000 (dedupliziert) |
| **Megumin: NPC-Dossier-/Update-Regeln** | 2.570 | 2.944 | **0** |
| **Megumin: NPC-Bank `[RELEVANT NPCs]`** | 0 | 2.285 (3 Dossiers) | **0** |
| Megumin: Bann-Liste | 421 | 427 | 420 |
| Lorebook (World Info) | 1.837 | 1.361 | 1.300–1.800 (situativ, nach hinten) |
| Erzählervertrag 3.x | 4.021 | 4.073 | 3.000–3.300 |
| Persona + Rahmen | 88 | 89 | 90 |
| **Megumin: Denkschritte + `<Blocks>`-Vorlage (Tiefe 1)** | 1.508 | 1.580 | 400–500 (nur Denkschritte) |
| Verlauf: Prosa | 3.070 | 5.927 | 2.500–3.500 (begrenzt) |
| **Verlauf: alte Tracker-Blöcke** | 653 | 716 | **0** |
| Verlauf: Spielernachrichten | 84 | 162 | 100–150 |
| Engine-Block: Zustand, Karten, RELEVANT, Regeln, Kampf, RESOLVED | 560 | 1.470 | 700–1.500 |
| Engine-Block: Fact-Report-Schema | 808 | 818 | 250–500 (situativ) |
| **Summe** | **20.093** | **26.377** | **≈ 11.000–14.000** |

Hinweise:

- Die NPC-Bank wächst mit **≈ 770 Token je Dossier-NPC**. In Testrun 4 standen ab Zug 10 alle drei Dossiers in jedem
  Prompt, auch im Kampf, als keiner der drei anwesend war.
- Der Engine-Block in Zug 13 besteht aus:
  - 2.265 Zeichen situative Regeln (LOOT RESOLUTION);
  - 1.033 Zeichen Kampfblock;
  - 1.505 Zeichen RELEVANT;
  - 3.512 Zeichen Schema.

  Das Schema steht **in jedem Zug vollständig** drin, auch im Kampf, wo nur `intent`, `combat`, `enter`/`leave` und
  `memory` gebraucht werden.
- Die situativen Texte zu COIN (Core #22, 7× „tracker") und LOOT (Core #20) beschreiben die Rechnung **für einen
  LLM-Tracker**. Coin ist aber längst Engine-Sache.
- Das Ziel von 8–12k für normale und Kampfzüge ist mit V3 erreichbar. Der größte verbleibende statische Block ist
  Megumins Stilteil (≈ 4,5k); ihn zu kürzen ist eine Autorenentscheidung am Preset, keine Engine-Frage.

---

## 3. Mechanik-Migration

### 3.1 Heute

- **Hit (Core #10):** 70 + PER × 0,5, Clamp 20–95. Dazu kommen:
  - Skill-`hit_mod` (−10 … +10);
  - Proficiency (+5 pp ab P3);
  - vorbereiteter Angriff (+20 pp);
  - Deflect/Evasive Step/Quickstep (−15/−20 pp);
  - Partial Cover (−20 pp);
  - taktisch ±10/20/35 pp.

  Monster würfeln gegen einen direkten Hit (60–82).
- **Crit (Core #11):** 5 + PER/10 %, ×1,5; Ambush +25 pp. Nur das Charaktermodell kann critten.
- **Schaden:** Raw → Proficiency → Buffs → max(Power − DEF, 10 %) → Varianz 0,90–1,10 → Crit → Endure → einmal runden.
- **Initiative:** AGI + ⌊PER/2⌋, Gleichstand nach PER, dann unverzerrt einmal gewürfelt.
- **Ranger:** skaliert alle Angriffe mit AGI + PER.

### 3.2 Entscheidungen und Umsetzung

| Thema | Neu | Wie (klein) |
|---|---|---|
| Hit-Chance | Angriffe treffen, wenn sie legal sind. Illegal sind: kein Ziel, tot, Full Cover, außer Reichweite, Munition leer. Illegal verbraucht nichts. | `resolveStrike` ohne Hit-Wurf; die Legalitätsprüfung (`illegal`) gibt es schon. |
| Zufalls-Crit | entfällt | `crit`-Wurf und `rules.crit.character_base` / `per_divisor` fallen weg. |
| **Ambush** | Echter Ambush: die Opening Action macht garantiert ×1,5. | `opts.ambush` → Multiplikator statt +25 pp. |
| Multi-Hit + Ambush | **Option A (empfohlen):** alle Strikes der Opening Action ×1,5, bei Flächenangriffen jedes Ziel. | Der Ambush ist dann ein fester Faktor ×1,5 für jede Skill-Form. Option B (nur der erste Strike) machte Twin Shot/Flurry im Hinterhalt grundlos schwächer (gesamt ×1,25). |
| Monster-Ambush | **Empfehlung: symmetrisch** (auch ×1,5) | Eine Regel für alle, aber ein neues Risiko für Alaric. **Entscheidung des Nutzers.** |
| PER im Kampf | entfällt (Hit, Crit, Schaden, Initiative) | `derived.js`: `baseHit` und `crit` fallen weg, Init siehe unten. |
| PER außerhalb | bleibt: Core-#7-Checks (Wahrnehmung, Spuren, Bemerken), Awareness | unverändert. PER bereitet Gelegenheiten vor (Hinterhalt entdecken oder vorbereiten), löst aber keinen Ambush automatisch aus und ersetzt kein CHA. |
| Core-#7-Checks | bleiben zufällig (unsicher UND folgenreich) | unverändert |
| Initiative | `⌊1,5 × AGI⌋`, Gleichstand unverzerrt einmal gewürfelt | Level-1-Werte bleiben gleich: Warrior/Mage/Guardian 7, Ranger 9; nur der Duelist geht von 8 auf 9. Monster-Init bleibt direkt. |
| Ranger-Skalierung | PER-Koeffizienten wandern auf AGI | Basic 1,25 · Aimed 1,75 · Power 1,875 · Quick 1,5 · Twin 0,875 (× AGI). Bei AGI = PER = 6 ist Raw exakt wie heute (Power Shot 33,25). Basic spiegelt damit Warrior (STR 1,25) und Mage (INT 1,25). |
| Skill-`hit_mod` (25 Angriffe) | entfallen | Nur die zwei +10-Skills mit Genauigkeits-Identität bekommen Ersatz: **Aimed Shot** und **Precision Thrust** ignorieren Partial Cover. Quick Slash behält seine Identität (billig, AGI). Die anderen +5 haben schon eine Identität: Band-Move, Post-DEF, Kosten. |
| Vorbereiteter Angriff (Focus Aim, Feint) | +20 pp / +10 % → **+35 % Power** | Erwartungswert heute ≈ ×1,40. Die +35 % entsprechen der vorhandenen taktischen Stufe `tactical_power_pct`. |
| Verteidigungs-Skills | bleiben; Deflect/Evasive Step −25 %, Quickstep −20 % eingehender Schaden bis zum eigenen nächsten Zug | Der pp-Wert ÷ ≈ 75 % mittlerer Hit ergibt den gleichen Erwartungswert. Guard, Brace, Bulwark, Endure und Ward sind schon schadensbasiert und bleiben unverändert. |
| Proficiency | `hit_pp` +5 ab P3 → Power P3 1,05 · P4 1,15 · P5 1,20 | erhält den alten Erwartungswert |
| Cover | Full Cover = illegal (gibt es schon). **Partial Cover = −25 % Schaden** nach DEF, Aimed Shot und Precision Thrust ignorieren sie. | 20 pp ÷ 73 % ≈ 27 %. Deterministisch und in einer Zeile zu erklären. |
| Taktische Modifikatoren (Core #10/#12) | nur noch die Power-Stufen ±10/20/35 % | `tactical_pp` fällt weg |
| Schadensvarianz | **bleibt vorerst** (0,90–1,10) | Sie ist die einzige Unsicherheit im Kampf, die übrig bleibt („reicht der Schuss?"), ohne Miss-Frust. Über den Test-5-Eindruck entscheidet ein Schalter in `rules.json` (min = max = 1). |
| Monster-Hit | entfällt, dazu `scaling.hit`, `elite/boss.hit_pp` und `variation.hit_pp` | siehe Balance |

Die Anzeige wird dadurch nützlicher. Statt „Basic Attack 73 % · Aimed Shot 83 % · Power Shot 63 %" zeigt die Zeile den
erwarteten Schaden nach DEF (mit Varianz als Spanne):
„Basic Attack 16–19 · Aimed Shot 24–29 (ignores partial cover) · Power Shot 30–37" (Ranger gegen den Keller-Vermin, DEF 0).

### 3.3 Balance

**PC-Schaden pro Einsatz, Level 1, gegen DEF 0 (alt: Hit × Crit, neu: trifft, kein Crit):**

| Skill | alt | neu | Δ |
|---|---|---|---|
| Basic Attack (alle Klassen) | 13,0 | 17,5 | +34 % |
| Aimed Shot (+10) | 22,6 | 26,5 | +17 % |
| Power Shot (−10) | 21,5 | 33,3 | +54 % |
| Power Strike (−10) | 21,4 | 33,3 | +56 % |
| Flame Lance (−5) | 25,1 | 36,3 | +44 % |
| Twin Shot (2 × 0,5) | 18,4 | 24,5 | +33 % |

**Monster-Schaden pro Angriff** steigt um 1/Hit: bei Hit 82 um +22 %, bei Hit 60 um +67 %.

**Kampfverhältnis:** Beide Seiten verlieren ihre Fehlwürfe. Das Verhältnis „Züge bis Alaric fällt / Züge bis das
Monster fällt" ändert sich nur um den Faktor *Monster-Hit ÷ 75 %* (dazu ≈ −3 % für Alaric aus dem wegfallenden Zufalls-Crit, in der Tabelle nicht eingerechnet):

| Anker (HP/DEF/ATK/Hit) | PC-Basic bis Kill: alt → neu | Monster-Angriffe bis Ranger (DEF 3) fällt: alt → neu | Verhältnis für den PC |
|---|---|---|---|
| Ratte 16/0/6/75 | 1,2 → 0,9 | 35,6 → 26,7 | ± 0 % |
| Wolf 23/0/9/80 | 1,8 → 1,3 | 16,7 → 13,3 | +7 % |
| Eber 41/2/11/70 | 3,5 → 2,6 | 14,3 → 10,0 | −7 % |
| Goblin 45/1/11/75 | 3,6 → 2,7 | 13,3 → 10,0 | ± 0 % |
| Bär 63/2/14/70 | 5,4 → 4,1 | 10,4 → 7,3 | −7 % |
| Oger 90/2/18/60 | 7,7 → 5,8 | 8,9 → 5,3 | **−20 %** |
| Hirsch 27/0/7/65 | 2,1 → 1,5 | 30,8 → 20,0 | −13 % |

**Empfehlung:** keine globale HP- oder ATK-Änderung. Kämpfe werden auf beiden Seiten ≈ 25 % kürzer, das Kräfteverhältnis
bleibt innerhalb ±10 %, und weniger Kampfrunden heißen weniger LLM-Züge.

Die Alternative, alle Monster-HP ×1,35 und ATK × Hit, wurde durchgerechnet und verworfen. Wegen der DEF-Subtraktion
verzerrt „ATK × Hit" gegen hohe DEF massiv: der Bär gegen den Guardian ginge von 30 auf 85 Angriffe bis zum Tod.

**Nur für Anker mit altem Hit < 70** ATK leicht senken, nach Test 5 bestätigen:

- Oger 18 → 15;
- Hirsch 7 → 6;
- Pferd 8 → 7.

Elite und Boss verlieren +5 pp Hit (≈ −6 % relativ); ausgleichen ist optional (Elite-ATK 1,15 → 1,20).

**Zu beobachten:** Power-Skills legen am meisten zu (+54 %). Sie bleiben über die Kosten begrenzt:

- Power Shot: 12 STA für 33 Raw;
- Aimed Shot: 7 STA für 26,5 Raw plus Cover-Durchschlag;
- Basic Attack: kostenlos.

Aimed Shot ist damit der effiziente Schuss, Power Shot der Burst. Beide haben eine deterministische Identität.

### 3.4 Betroffene Dateien

**Inhalte:**

- `content/rules.json`: `hit.*` fällt weg; aus `crit.*` bleibt nur `ambush_multiplier`; neu `damage.partial_cover_pct`
  und `damage.incoming_reduction`; Proficiency-Power anpassen; `tactical_pp` fällt weg.
- `content/rules_text.json`: diese Einträge neu fassen:
  - Core #2 (PER-Beschreibung);
  - Core #9 (Roll Integrity: kein Hit/Crit-Wurf mehr);
  - **Core #10** (wird „Legalität und Cover");
  - Core #11 (Crits raus);
  - Core #12 (Multi-Hit/Flächen: keine geteilten Würfe mehr, nur Varianz);
  - Core #24 (Initiative, Ambush);
  - Core #26, #27, #29 (Kampfschleife, Audit);
  - System #8 und #14 (Anzeige).
- `content/classes.json`: diese Felder und die `source_text`/Beschreibungen anpassen:
  - 25 `hit_mod`;
  - 2 `next_attack_buff.hit_pp`;
  - 3 `incoming_hit_penalty`;
  - 5 Ranger-Skalierungen.
- `content/monsters.json`: das Hit-Feld der 15 Anker, `scaling.hit`, `elite/boss/variation.hit_pp` und `source_line`
  bzw. Text; optional ATK für Oger, Hirsch und Pferd.
- `content/npc_templates.json`: Hit-Felder der Vorlagen.
- `content/narrator.json` und der Vertrag, Abschnitt COMBAT NARRATIVE FOCUS: „hits and misses" wird zu „every legal
  attack lands; show where and how hard".

**Engine:**

- `src/derived.js`: `baseHit`, `crit` und `init`.
- `src/combat.js`: `resolveStrike`, `hitPreview` (wird zur Schadensvorschau), Initiative-Gleichstand, Ambush,
  `incoming_hit_penalty` → Schadensminderung.
- `src/display.js`: Optionszeile, Wurfzeilen.
- `src/context.js`: `pcLine` (Base Hit/Crit raus), Kampfblock.
- `src/commands.js`: `#stats`, `#combat`.
- `src/npcgen.js`: Hit.

**Tests:**

- Neu fassen:
  - `rules.test.js` (27 Stellen);
  - `display.test.js` (18);
  - `content.test.js` (9);
  - `review.test.js` (8);
  - `context.test.js` (6);
  - `host.test.js` (4).
- In den Replays: v4 (9 Stellen), v1 und v2 (je 2).
- Die Replays behalten Eingaben und Antworten. Weil keine Hit- und Crit-Würfe mehr gezogen werden, verschiebt sich
  aber der Würfelstrom. Die Kampf-Assertions werden deshalb auf das neue deterministische Ergebnis umgeschrieben. Die
  aufgezeichnete Prosa (drei Fehlschüsse im Keller) passt danach nicht mehr zur Engine. Das ist bei Fixtures zulässig:
  geprüft werden Reports und Zustand, nicht die Prosa.

---

## 4. Runtime V3 (kleinste Änderung, die V2 erweitert)

Grundsatz: **Das LLM ist Erzähler, nicht Zustands-Renderer.** Was die Engine weiß, rendert die Engine. Was auf diesem
Zug nicht zählen kann, wird nicht gesendet.

### 4.1 Engine-gerenderter Status statt Character_Sheet und mechanischem World_State

- Die Engine hängt an jede Antwort ein einklappbares Statuspanel, wie heute schon die Zug-Zeilen (`turnPanel`). Es wird
  aus dem fold gebildet und ist dadurch swipe-sicher. Inhalt:
  - Zeit und Ort;
  - Alaric mit HP/MP/STA, XP, Rang, Ausrüstung, Pfeilen und Coin (`pcLine` gibt es schon);
  - Anwesende mit Zustand und Abstand;
  - aktive Quests und offene Threads.
- Aus dem World_State **fallen weg**:
  - *Mood*, *Secret*, *Agenda* je Zug;
  - *Planted Seeds*, *Consequence Timers*;
  - *Arc Phase*, *Scene Phase*;
  - *Off-Screen*.

  Das sind Erzählerentscheidungen, die pro Zug neu erfunden werden (siehe 1.3). Was davon Kanon wird, landet über den
  Fact-Report in der Engine: Threads, Facts, Agenda.
- **Wirkung:** −32 % Output (≈ −600 Token ≈ −32 s pro Zug auf der heutigen Route), −716 Token Verlauf, −850 Token
  Blocks-Vorlage. Der Spieler sieht nur noch einen Stand, den richtigen.

### 4.2 Megumin-NPC-Dossier-System entfernen, kleiner Engine-NPC-Record

**Messung (Testrun 4):**

| Kosten | Wert |
|---|---|
| Dossier- und Update-Regeln, jeder Zug | 11,2–12,6k Zeichen ≈ **2,6–2,9k Token** (13–15 % des Prompts) |
| NPC-Bank `[RELEVANT NPCs]` | ≈ 770 Token je Dossier-NPC; Zug 13: **2,3k Token** für drei NPCs, von denen keiner anwesend war |
| `[CRITICAL RULE: DO NOT generate a dossier for …]` + Vorlagen in den Denkschritten | ≈ 0,15k Token |
| New_NPC-Output | 3,0–3,6k Zeichen je NPC ≈ **850 Token ≈ 45 s** (Züge 7–9) |
| NPC_Update-Output | 250–440 Zeichen in 5 von 15 Zügen |
| Durchschnitt Output | 781 Zeichen/Zug ≈ 200 Token ≈ **11 s/Zug** |
| Reasoning | ≥ 5,6 % der Reasoning-Sätze prüfen Berechtigung und Veto |
| Summe Zug 13 | **≈ −5,2k Prompt-Token (−20 %)** und im Schnitt ≈ −200 Output-Token; ohne Anhalten des Wachstums der Bank |

**Komplexität, die wegfällt:** zweites NPC-Gedächtnis neben der Engine, Exclusion Veto, NAMED/VOICED/STAKED, Canon
Lock, Locked Fields, Update-Operationen (`~` / `+` / `-`), Ausschlussliste und Image Tags.

**Schaden, den es in Testrun 4 angerichtet hat:**

- Der erste Versuch von Zug 8 wurde verworfen: Der Spieler nahm zuerst den Wolfs-Auftrag, änderte dann seine Nachricht
  auf den Vermin-Auftrag und ließ neu generieren. In diesem Versuch entstand Marettas Dossier mit:
  - Canon Lock „Took the Ashbridge Ford wolf bill first; **Alaric countersigned onto the same contract**";
  - Knowledge on PC „**walked the river road behind her** … at the ford".
- Die Bank behielt dieses Dossier. Es stand **in jedem Prompt von Zug 8 bis 15**, und das NPC_Update des nächsten Zuges
  schrieb es fort („countersigned onto her wolf contract, then took the malthouse vermin bill instead").
- Die Engine hatte genau diese Behauptung abgelehnt (PLAYER OWNERSHIP) und ist swipe-sicher. Die Bank verletzt also:
  - Swipe-Kompatibilität;
  - Event Sourcing;
  - NPC-Wissensgrenzen: Maretta „weiß" von einem Weg, der nie stattfand.
- Dazu erfinden die Dossiers bei der Vorstellung ungefragt Kanon, der nie gespielt wurde:
  - Marettas Tochter Odiva, ihren Partner Heddrun, einen „Tier 3"-Mord am Fluss;
  - Fennicks Sohn Jorey, seine Schwester Marda, den Fuhrmann Osper.

**Was die Engine schon je NPC führt, Dossier-Feld für Dossier-Feld:**

| Dossier-Feld | Engine heute | Bewertung |
|---|---|---|
| Name | `entity.name`, stabile id | vorhanden |
| Role | Vorlagen-Label + Fact `occupation` (funktional, ersetzt den alten Wert) | vorhanden |
| Where to Find | Facts `residence`/`location` | vorhanden |
| Appearance, Voice | `desc` + `traits` (≤ 240 Zeichen) | **Lücke:** nur bei `new`; per Prosa übernommene NPCs (Maretta, Fennick) haben keine |
| Read on the PC | Relation `attitude` (Wert + „last change: why") | Mechanik vorhanden, **in Testrun 4 nie gemeldet** (`relations` leer) |
| Agenda | – | **Lücke** |
| Knowledge on PC | Wissenszeilen mit Quelle (`witnessed`/`told:x`/`rumor`/`inferred`), Glaube mit FALSE-Marker, Identitätsstufe (Name/gesehen/nie gesehen) | vorhanden und strenger als das Dossier |
| letzte Interaktion | Erinnerungen mit Wichtigkeit 1–10; die Karte zeigt die drei besten | vorhanden; „meaningful" braucht eine Schwelle |
| Secrets (Tier 1–3), Reveal Hook | Facts `vis:"secret"` → „keeps secret (reveals it only for its own reasons)" | vorhanden, aber nur für Etabliertes |
| Canon Lock | harte Facts + Event-Log | durch die Bauweise gegeben |
| Background, Inner Circle, Personality, Image Tags | – | **entfallen bewusst:** entstehen im Spiel und werden erst persistent, wenn die Fiktion sie etabliert |

**Vorschlag: minimaler NPC-Record.** Er nutzt Events, die es schon gibt, und braucht drei kleine Ergänzungen:

1. `agenda` als funktionales Fact-Prädikat (eins pro NPC, neues ersetzt altes, `o:"none"` beendet).
2. Appearance und Voice für schon bekannte NPCs: `new.traits` darf `traits` eines bekannten NPC einmalig ergänzen (heute
   nur bei der Erstvorstellung).
3. **„meaningful" = Wichtigkeit ≥ 6.** Nur solche Erinnerungen mit Alaric werden zur Zeile „last meaningful interaction".
   Routine wie „Kest nodded" bleibt im Log, erscheint aber nie im Record.

Gerendert wird der Record für Anwesende (die heutige Karte, gekürzt) und für NPCs, die in der Spielernachricht oder der
letzten Antwort genannt werden. Kompakt, wie im Auftrag:

```
Kest — guild clerk
  toward Alaric: wary/protective (−25; last change: he ignored her warning)
  last meaningful: warned Alaric away from the Greyhowl posting [Day 3]
  knows: Alaric is a newly registered Novice [told:Serah]
  agenda: get the Greyhowl posting removed
```

Das sind ≈ 60–100 Token je NPC statt ≈ 770 für ein Dossier, und nur wenn der NPC gerade zählt. Die Wissenszeile bleibt
genau so streng wie heute: nur Zeilen dieses NPC, mit Quelle.

Im Vertrag kommt **ein** Absatz dazu:

> When an NPC's stance toward Alaric changes in a way that will matter later: `attitude`. What an NPC learns about him:
> `learn`. A lasting goal: `facts` p:"agenda". Appearance/voice once: `new.traits`. Routine exchanges need no report.

**Geht wirklich Kontinuität verloren?**

- **Aussehen und Stimme wiederkehrender NPCs** (Fennick „counts under his breath", Marettas Keilerzahn): heute nur im
  Dossier. Die `traits`-Ergänzung deckt das ab.
- **Agenda:** heute nur im Dossier und im World_State. Das `agenda`-Fact deckt es ab.
- **Einstellung zu Alaric:** In Testrun 4 lief sie nur über „Read on the PC". Ohne Dossier muss der Narrator `attitude`
  melden. Das ist das eigentliche Risiko, deshalb ist es Metrik in Test 5 (Abschnitt 7).
- **Erfundene Biografien:** Das ist gewollter Verlust.

### 4.3 Megumin V3-lite und Deduplizierung

Megumin behält, was Megumin gut kann: Stimme und Prosa (`<dialogue>`, `<narration>`, `<story>`, `<world>`, `<content>`,
Bann-Liste, `<config>`, die sieben „last breath"-Punkte). **Raus:**

- `<Blocks>`-Pflicht und -Vorlage;
- NPC DOSSIER, NPC UPDATES, Image-Tag-Regel;
- NPC-Bank und CRITICAL-Liste;
- „At the end of your response output exactly one `<Blocks>` section".

Doppelungen und Konflikte mit Vertrag und Engine:

| Megumin | Vertrag/Engine | Entscheidung |
|---|---|---|
| `<ANTI-OMNISCIENCE>` (perception, secrets aren't shared, inference isn't fact) | NPC KNOWLEDGE & INFORMATION BOUNDARIES + Engine-Karten | einmal, im Vertrag; Megumin behält nur den Stil-Satz |
| „Alaric is reader-controlled — never author their actions…" | INPUT VISIBILITY / THOUGHT FIREWALL, MEANINGFUL DECISION BOUNDARIES, PLAYER OWNERSHIP (Engine) | Vertrag |
| „canon / lore: The character sheet and all supplied lore are FACT" (zweimal) | CANON & INVENTION | Vertrag |
| response_shape „Do NOT open with narration every turn … Dialogue first" | Kampfstille (Testrun 4) | Megumin: „outside combat" ergänzen; das war die „habit of opening with speech" aus Testrun 4 |
| final reminder 1 „NPCs know ONLY …" | Engine-Karten „each NPC knows ONLY what its card lists" | einmal |
| Character-Sheet-Zahlenregeln („Carry every number forward …") | Engine besitzt die Zahlen | raus |

Im Vertrag fallen Abschnitte weg, die durch das Engine-Rendering überflüssig werden: PC STATE DELTA CHECK und die
Tracker-Teile von OUTPUT-FORMAT OWNERSHIP und PHYSICAL CONTINUITY. Das sind ≈ 4,0k → 3,0–3,3k Token.

**Nicht gekürzt werden:**

- Thought Firewall, Agency, Wissensgrenzen;
- Kausalität, lebende Welt, Persistenz;
- Kampffokus.

Der Lorebook-Inhalt wird **nicht** blind gekürzt; er ist situativ und mit 1,3–1,8k schon klein.

### 4.4 Situatives Fact-Report-Schema

Heute stehen 818 Token Schema in jedem Zug. V3 wählt je Modus:

| Modus | Schlüssel |
|---|---|
| Charaktererstellung | nur `{}` |
| Kampf aktiv | `intent`, `combat`, `enter`, `leave`, `concealed`, `memory` |
| Story | alle außer `intent`/`combat`; `quests`, `coin`, `items` nur mit Auslöser (Gilde, Händler, Übergabe im Text oder in der Eingabe) |

Der Parser bleibt vollständig: ein nicht angekündigter Schlüssel wird weiter angenommen und validiert. Nur der Prompt
wird kleiner, auf ≈ 250–500 Token. Die situativen Regeltexte COIN (Core #22) und LOOT (Core #20) werden auf die Teile
gekürzt, die der Erzähler braucht („report coin changes in `coin`; the engine keeps the purse"); die Tracker-Arithmetik
fällt weg.

### 4.5 Begrenzter Verlauf

- Der Interceptor bekommt `coreChat`, eine reine Prompt-Kopie (SillyTavern `script.js`:
  `let coreChat = chat.filter(…)`, danach `runGenerationInterceptors(coreChat, …)`). Er kann ältere Nachrichten **nur
  für den Prompt** entfernen; der gespeicherte Chat bleibt unberührt.
- V3 behält die aktuelle Szene und die letzten **4** Wechsel wörtlich (`DEFAULT_RECENT_TURNS = 4`; Retrieval schließt
  diese Züge heute schon aus). Älteres kommt über die Engine-Retrieval (Erinnerungen, Facts, Threads, Quests).
- Retrieval nahm in Testrun 4, Zug 15, sieben wörtliche Spielernachrichten als „episode" auf. Das wird auf drei begrenzt, und
  Erinnerungen mit Wichtigkeit ≥ 6 bekommen Vorrang.
- Wirkung: Der Verlauf ist gedeckelt bei ≈ 2,5–3,5k statt linear wachsend (Zug 13: 5,9k; nach 50 Zügen ≈ 20k+).
- Einstellbar, `0` = aus.

### 4.6 Reihenfolge für Prompt-Caching

- Statisches nach vorn, in fester Reihenfolge: Megumin-Stil → Vertrag → Persona.
- Dynamisches nach hinten: Lorebook als World Info **@Depth** statt vor der Kartenbeschreibung, Verlauf, Engine-Block
  (heute schon auf Tiefe 1).
- Das stabile Präfix wächst so von ≈ 7,5k (mit Dossier-Regeln) auf ≈ 8–9k identische Token pro Zug.
- **Ehrliche Einschätzung:** Da die Route bisher in 35 von 35 Anfragen `cached_tokens: 0` meldet, ist ungewiss, ob sie
  überhaupt cached. Die Umstellung ist kostenlos und schadet nicht; ob sie wirkt, zeigt `cached_tokens` in Test 5. Wenn
  dort weiter 0 steht, ist Caching kein Hebel auf dieser Route.

### 4.7 Streaming

- SillyTavern rendert beim Streamen über `messageFormatting`, wo die Display-Regex greift. `MESSAGE_RECEIVED` kommt erst
  nach dem Streamen; die Engine-Verarbeitung bleibt also gleich.
- Ein Regex-Skript mit „Alter Chat Display"
  ([Doku](https://github.com/SillyTavern/SillyTavern-Docs/blob/main/extensions/Regex.md)) und dem Muster
  `/<avereth>[\s\S]*?(?:<\/avereth>|$)/` blendet den Report auch **halb gestreamt** aus. Es wird mit der Erweiterung
  ausgeliefert.
- Wirkung: Die Wartezeit bis zur ersten Prosa ist Prefill + Reasoning statt der ganzen Antwort. Mit Reasoning „high"
  sind das 41 % des Outputs vor der ersten Zeile; deshalb gehört `reasoning_effort` low/none mit dem V3-Prompt in Test 5.

### 4.8 Was sich nicht ändert

- Event Sourcing in `message.extra.avereth`, Swipe/Regenerate/Continue;
- fold, PLAYER OWNERSHIP, Wissenskarten, Kampfstille;
- Lore Bridge, Quests, Coin;
- Report-Validierung, Wortersetzung.

---

## 5. Keep / Change / Remove / Move-to-Engine / Situational

| Element | Entscheidung | Grund |
|---|---|---|
| PLAYER OWNERSHIP, Agency-Prüfung (Engine) | **Keep** | trägt |
| Thought Firewall, Wissensgrenzen, Kausalität, lebende Welt (Vertrag) | **Keep** | trägt |
| Event Sourcing, Swipe-Sicherheit, fold | **Keep** | trägt |
| Engine-Karten (anwesende NPCs), RESOLVED, Kampfblock | **Keep** | kompakt, bindend |
| Kampfstille, Wortersetzung | **Keep** | Testrun 4 |
| Core-#7-Checks mit Zufall + PER | **Keep** | Auftrag |
| Megumin-Stil, Bann-Liste, `<config>`, „last breath" | **Keep** (dedupliziert) | Prosaqualität |
| Megumin response_shape „Dialogue first" | **Change** („outside combat") | Konflikt mit Kampfstille |
| Erzählervertrag 3.x | **Change** (Tracker-Abschnitte raus, Doppelungen raus) | −0,7…−1k Token |
| Fact-Report-Schema | **Situational** | −0,3…−0,5k Token |
| Situative Regeln COIN / LOOT | **Change** (Tracker-Arithmetik raus) | Engine rechnet |
| Lorebook | **Keep**, als @Depth nach hinten | Cache-Präfix |
| Verlauf | **Change** (Szene + 4 Wechsel, Rest per Retrieval) | gedeckelt |
| Alte `<Blocks>` im Verlauf | **Remove** | gibt es nicht mehr |
| Character_Sheet | **Move-to-Engine** | falsch und langsam (1.3) |
| World_State: Zeit, Ort, Anwesende, Zustand, Quests, Threads | **Move-to-Engine** | Engine weiß es |
| World_State: Mood, Secret, Agenda, Seeds, Timers, Arc/Scene Phase, Off-Screen | **Remove** | erfindet Kanon pro Zug |
| New_NPC, NPC_Update, NPC-Bank, CRITICAL-Liste, Image Tags | **Remove** | 4.2 |
| Minimaler NPC-Record (Rolle, Einstellung, letzte bedeutsame Interaktion, Wissen, Agenda) | **Move-to-Engine** (Situational gerendert) | 4.2 |
| Hit-Chance, Zufalls-Crit, PER im Kampf, Skill-`hit_mod` | **Remove** | Auftrag |
| Ambush ×1,5, Partial Cover −25 %, Def-Skills als Schadensminderung, Init ⌊1,5·AGI⌋, Ranger-AGI | **Change** | Abschnitt 3 |
| Schadensvarianz | **Keep** (nach Test 5 neu bewerten) | einzige Restunsicherheit |
| Streaming + Display-Regex | **Add** | Wartezeit bis zur ersten Zeile |

---

## 6. Risiken

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme / Messung |
|---|---|---|
| Narrator meldet ohne Dossier keine `attitude`/`learn` → NPCs „vergessen" Alaric | mittel (TR4: 0 attitude-Reports) | Vertragsabsatz 4.2; Metrik „Report-Abdeckung pro NPC-Interaktion"; sonst Korrekturzeile im nächsten Block |
| Wiederkehrender NPC wirkt anders (Aussehen, Stimme) | mittel | `traits`-Ergänzung; Testfall „NPC kehrt nach ≥ 5 Zügen zurück" |
| Begrenzter Verlauf → Wiederholungen oder verlorene Rückbezüge | mittel | 4 Wechsel + Retrieval; Schalter; Prosa-Bewertung in Test 5 |
| Spieler vermisst den erzählerischen World_State (Mood, Seeds) | niedrig–mittel | Statuspanel zeigt Mechanik; erzählerische Andeutungen gehören in die Prosa |
| Kämpfe zu kurz oder zu vorhersagbar | mittel | Varianz bleibt; Runden pro Kampf in Test 5; ATK-Feinjustierung einzelner Anker |
| Power-Skills dominieren | niedrig | Kosten (12 vs. 7 STA), Aimed Shot mit Cover-Durchschlag; Nutzungsverteilung beobachten |
| Monster-Ambush ×1,5 zu hart für Level 1 | mittel | Entscheidung des Nutzers; sonst nur PC-Ambush |
| Replays: verschobener Würfelstrom, Prosa passt nicht mehr | sicher | Kampf-Assertions neu, nicht-kämpferische bleiben |
| Streaming zeigt kurz den Report | niedrig | Regex mit `$`-Alternative; Browser-Smoke mit halber Nachricht |
| Caching bleibt bei 0 | hoch | kein Schaden; dann ist die Route das Thema, nicht der Prompt |
| Preset gehört dem Nutzer (Megumin V10 Shura liegt mir nicht vor) | sicher | Änderungen als dokumentierte Preset-Variante bzw. Liste; ich passe nur an, was im TR4-Prompt sichtbar ist |
| Reasoning low → schlechtere Reports | mittel | A/B in Test 5 (high vs. low), Report-Validität je Zug |

---

## 7. Testplan

### 7.1 Mechanik (automatisch, vor Test 5)

- **Treffen:** Ein legaler Angriff trifft immer (kein Hit-Wurf im Record). Illegal und ohne Verbrauch sind: kein Ziel,
  tot, Full Cover, außer Reichweite, keine Munition.
- **PER:** Ein Kampf mit PER 1 und einer mit PER 20 ergeben identische Records (Schaden, Initiative).
- **Ambush:** Die Opening Action macht ×1,5; bei Twin Shot und Flurry beide Strikes, bei Arcane Burst jedes Ziel.
  Außerhalb eines Ambush gibt es keine Crits.
- **Cover:** Partial Cover ergibt ×0,75 nach DEF; Aimed Shot und Precision Thrust ignorieren es; Full Cover ist illegal.
- **Verteidigung:** Deflect und Evasive Step −25 %, Quickstep −20 % bis zum eigenen nächsten Zug; Endure bleibt
  einmalig.
- **Buffs:** Focus Aim und Feint geben +35 % Power auf den nächsten (Fern-)Angriff.
- **Initiative:** ⌊1,5 × AGI⌋. Gleichstand verteilt sich unverzerrt (Seed-Verteilungstest wie beim d100).
- **Ranger:** Raw bei AGI = PER = 6 wie heute. Testrun 4 Power Shot: „16 + AGI 6×1.875 + ATK 6 = 33.25".
- **Inhalte:** kein `hit_mod`, `hit_pp`, `per_factor`, `per_divisor` oder Hit-Feld mehr in classes, monsters, templates
  und rules; kein „Hit Chance" in `rules_text`.
- **Balance als Test:** Das Kampfverhältnis je Anker ändert sich gegenüber heute um höchstens ±25 % (Tabelle 3.3).
- **Core-#7-Checks** sind unverändert (bestehende Tests).

### 7.2 Runtime (automatisch)

- **Statuspanel:** entspricht dem fold; ein Swipe-Wechsel wechselt das Panel; keine `<Blocks>` in neuen Antworten nötig.
- **NPC-Record:**
  - wird nur für Anwesende und Genannte gerendert;
  - Erinnerungen mit Wichtigkeit < 6 erscheinen nicht als „last meaningful";
  - ein neues `agenda` ersetzt das alte;
  - `traits` ergänzen einen übernommenen NPC;
  - die Wissenszeile enthält nur Zeilen dieses NPC.
- **Schema:** Im Kampf fehlen `quests` und `coin`, bei der Erstellung steht nur `{}`. Der Parser nimmt weiterhin alle
  Schlüssel an.
- **Verlauf:** Der Interceptor kürzt `coreChat` auf Szene + 4 Wechsel; der gespeicherte Chat ist unverändert;
  Swipe, Regenerate und Continue ergeben dasselbe Fenster.
- **Größe:** Der Engine-Block im Kampf bleibt unter X Zeichen, der Prompt-Anteil der Engine unter Y. Die Grenzen werden
  nach der Umsetzung aus Testrun 4 abgeleitet und festgeschrieben.
- **Replays** TR1–TR4 bleiben grün (Kampf-Assertions neu).
- **Browser-Smoke:** Eine halb gestreamte Nachricht mit `<avereth>{…` ohne Abschluss zeigt keinen Report.

### 7.3 Test 5 (echter Lauf) – Metriken je Zug

Der Logger schreibt sie schon fast vollständig; ergänzt werden TTFT und Modus.

| Metrik | Ziel |
|---|---|
| prompt_tokens | ≤ 12k (Kampf), ≤ 14k (Gilde/sozial) |
| completion_tokens / davon Reasoning | ≤ 1,2k / ≤ 40 % |
| cached_tokens | messen (Erwartung: 0 auf der heutigen Route) |
| TTFT (Streaming) | ≤ 25 s heutige Route |
| Gesamtdauer | ≤ 60–70 s heutige Route, ≤ 15 s schnelle Route |
| `<Blocks>` im Output | 0 |
| Report parsebar / abgelehnte Einträge | 100 % / Gründe klassifiziert |
| Zustand korrekt (Panel vs. Erwartung: HP, STA, Coin, Quest, Ort, Anwesende) | 100 % |
| Agency-Verstöße (PLAYER-OWNERSHIP-Ablehnungen, Prosa-Übergriffe) | 0 unentdeckte |
| Wissensverstöße (NPC nutzt etwas, das nicht auf seiner Karte steht) | 0 (Handprüfung) |
| NPC-Kontinuität (NPC kehrt nach ≥ 5 Zügen zurück: Name, Rolle, Einstellung, Agenda, Stimme) | konsistent |
| Report-Abdeckung (`attitude`/`learn` bei bedeutsamen NPC-Momenten) | ≥ 70 % |
| Kampf (Runden pro Kampf, Nutzung Basic/Aimed/Power, Schaden rein/raus) | beobachten |
| Prosaqualität (Nutzer, 1–5 je Zug) | ≥ Testrun 4 |

**Ablauf:**

1. Gleiche Eröffnung wie in Testrun 4 (Tor, Gilde, Auftrag, Kampf).
2. Dazu ein Rückkehr-NPC nach ≥ 5 Zügen und ein Hinterhalt.
3. Einmal `reasoning_effort` high und einmal low (je ≥ 8 Züge).
4. Wenn möglich einige Züge auf einer schnellen Route (Gemini 3.5 Flash) zum Vergleich.

---

## 8. Umsetzungsreihenfolge (nach Freigabe)

1. **Runtime I, größter Hebel und niedrigstes Risiko:**
   - Statuspanel;
   - Megumin V3-lite (Preset-Variante + Liste);
   - Dossier raus, NPC-Record (`agenda`, `traits`, Schwelle ≥ 6);
   - situatives Schema, COIN- und LOOT-Text gekürzt;
   - Display-Regex und Streaming.
2. **Mechanik:** Abschnitt 3 komplett, mit neuen und angepassten Tests.
3. **Runtime II:** begrenzter Verlauf, Vertrag 3.3 (Dedupe), Lorebook @Depth.
4. **Test 5** mit den Metriken aus 7.3, danach Feinjustierung: Varianz, ATK der Anker mit altem Hit < 70, Fenstergröße.

Jeder Schritt ist ein eigener Commit mit grünen Tests. Offene Entscheidungen des Nutzers:

- Monster-Ambush symmetrisch (×1,5)?
- Varianz vorerst behalten?
- Preset-Änderungen als gelieferte Datei oder als Liste zum Selbst-Einpflegen?

---

## 9. Quellen und Grenzen

- Prefill und Decode:
  - [Parasail](https://www.parasail.io/blog/prefill-vs-decode-llm-inference)
  - [Redis](https://redis.io/blog/prefill-vs-decode/)
  - [Hugging Face / tngtech](https://huggingface.co/blog/tngtech/llm-performance-prefill-decode-concurrent-requests)
- Caching:
  - [Z.ai Context Caching](https://docs.z.ai/guides/capabilities/cache)
  - [Gemini implicit caching](https://developers.googleblog.com/gemini-2-5-models-now-support-implicit-caching/)
  - [Gemini Caching-Doku](https://ai.google.dev/gemini-api/docs/caching)
  - [python-genai #2064](https://github.com/googleapis/python-genai/issues/2064)
- Durchsatz:
  - [Artificial Analysis GLM-5.3-Flash](https://artificialanalysis.ai/models/glm-5-3-flash)
  - [Artificial Analysis Gemini 3.5 Flash](https://artificialanalysis.ai/models/gemini-3-5-flash)
- SillyTavern:
  - [Regex-Doku](https://github.com/SillyTavern/SillyTavern-Docs/blob/main/extensions/Regex.md)
  - Quelltext `public/script.js` (`coreChat`, `runGenerationInterceptors`, Streaming über `messageFormatting`,
    `MESSAGE_RECEIVED` nach dem Stream)
  - `public/scripts/openai.js`, `public/scripts/tokenizers.js`
- **Gesperrt in dieser Umgebung, nicht umgangen:** arxiv.org, docs.z.ai (nur über das Suchergebnis gelesen),
  synthlabs.ai, research.thoughtworks.com.
- Nicht vorhanden: Megumin V10 Shura als Datei und die Test-5-Logger-Dateien. Alle Preset-Aussagen beziehen sich auf den
  Megumin-Stand im Testrun-4-Prompt.
