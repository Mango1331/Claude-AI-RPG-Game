# Runtime V4 · P0: konsolidierter Bericht (Messläufe vom 27.09.2026)

**Stand:** 28.09.2026, Branch `claude/happy-wright-1a4y19`. Er baut auf Commit `1165f6f` auf, der die Rohdaten und die zwei Harness-Korrekturen des Spielers enthält.

**Grundlage:**
- alle Rohdaten und Zusammenfassungen in `p0_out/` (S0, S0 plain_keep, S1-Stichprobe, S1 voll, S2-Stichprobe, S2-Format-Smoke, S2 voll, S3);
- der Plan [RUNTIME_V4_PLAN.md](RUNTIME_V4_PLAN.md), die Werkzeugbeschreibung [P0_SPIKES.md](P0_SPIKES.md), der Code in `tools/p0/`;
- das externe Review (ChatGPT) als nicht bindende Zweitmeinung.

**Grundsatz:** Die P0-Messungen bleiben so, wie sie gelaufen sind; `p0_out/` wird nicht verändert.
- Korrekturen stehen als **zweite Auswertung** daneben: `node tools/p0/rescore.mjs` liest die gespeicherten Antworten neu, ohne neue Modellaufrufe, und schreibt nach `p0_out/rescored/`.
- Ungültige oder konfundierte Läufe sind unten als solche markiert, nicht gelöscht.

## Inhalt

1. [Ergebnis in Kürze](#1-ergebnis-in-kürze)
2. [Die Läufe und ihre Gültigkeit](#2-die-läufe-und-ihre-gültigkeit)
3. [S0 Structured Output](#3-s0-structured-output)
4. [S2 World Deltas: A gegen B](#4-s2-world-deltas-a-gegen-b)
5. [S1 Interpreter](#5-s1-interpreter)
6. [S3 Domänen-Prototyp](#6-s3-domänen-prototyp)
7. [Werkzeugfehler und ihre Korrektur](#7-werkzeugfehler-und-ihre-korrektur)
8. [Das externe Review: Zustimmung und Widerspruch](#8-das-externe-review-zustimmung-und-widerspruch)
9. [Folgen für Runtime V4](#9-folgen-für-runtime-v4)
10. [Nach P0: S1 mit Agency-Guard (offline gemessen)](#10-nach-p0-s1-mit-agency-guard-offline-gemessen)
11. [Nach P0: S2 mit Autoritäts-Firewall (offline gemessen)](#11-nach-p0-s2-mit-autoritäts-firewall-offline-gemessen)
12. [Nachtrag: vom Prototyp ins Produkt (4.0.0)](#12-nachtrag-vom-prototyp-ins-produkt-400)

---

## 1. Ergebnis in Kürze

| Spike | Ergebnis | Status |
|---|---|---|
| **S0** | JSON per Anweisung mit Reasoning wie konfiguriert (low): 30/30 gültig im ersten Versuch, 100 % inhaltlich richtig, p50 4,8 s. `json_schema` nimmt der Provider an, **erzwingt es aber nicht**. `reasoning_effort: none` wirkt nicht als „aus“ (mehr Reasoning, Abbrüche) | entschieden: **Plain JSON + lokaler Validator, Reasoning low** |
| **S1** | Negativ-Präzision **93,1 %** (81/87), Gate ≥ 98 %. Recall 94,2 % (Gate ≥ 90 %), p50 3,7 s (Gate ≤ 6 s) | **nicht bestanden** (Präzision) |
| **S2** | A: 100 % gültig und vollständig, Semantik 87,4 %. B: Block gültig und vollständig 43,9 % (Gate ≥ 80 %), Semantik 67,3 % | **D2 = A** (Extraktion nach jeder Antwort) |
| **S3** | 36/36 Prüfungen; mit dem Stand von `1165f6f` erneut 36/36 | **bestätigt** |

**Was P0 zeigt:**
- Das Domänenmodell trägt (S3).
- Das Datenformat ist kein Problem mehr, sobald der Prompt die Schema-Regeln nennt (S0, S2 nach der Korrektur).
- Die zwei offenen Punkte sind semantisch:
  - **Spieler-Agency** beim Interpreter (S1);
  - **Autorität** der Weltänderungen, die der Extraktor aus der Prosa liest (S2).

---

## 2. Die Läufe und ihre Gültigkeit

Zeiten in UTC, 27.09.2026. Alle Läufe über SillyTavern mit `zai-org/GLM-5.3-Flash`; Include Body `clear_thinking: true`, `reasoning_effort: low`.

| Lauf | Zeit | Ordner | Inhalt | Gültigkeit |
|---|---|---|---|---|
| S3 | 16:47 | `s3/` | Domänen-Prototyp, offline | **gültig** |
| S0, Runde 1 | 16:57–18:39 | `s0/` | schema_keep, schema_off, plain_off (148 Aufrufe) | **konfundiert**: plain_keep fehlt. Format und Reasoning ändern sich gleichzeitig, und die gewählte Kombination wurde nie gemessen (§3) |
| S0 plain_keep | 18:59–19:04 | `s0_plain_keep/` | nur plain_keep (33 Aufrufe) | **gültig**; der Text „json_schema abgelehnt“ ist ein Reporting-Fehler (§3) |
| S1 Stichprobe | 19:12–19:20 | `s1_sample/` | 80 von 256 Fällen | gültig (Vorlauf) |
| S1 voll | 19:26–19:49 | `s1/` | 256 Fälle | **gültig** |
| S2 Stichprobe | A 19:53–20:11, B 20:32–21:03 | `s2_sample/` | 19 Züge (V11, V12) | **ungültig**: Hidden-Schema-Problem. A war nur zu 26,3 % gültig, weil der Prompt die Schema-Regeln nicht nannte (§4). Die `decision.json` dieses Ordners gilt nicht |
| S2 mit 429 | zwischen 20:11 und 20:32 | nicht im Repo | B mit parallelen Pools | **ungültig und nicht verwendet**: `runB` startete B-gen und B-block gleichzeitig (§7). Der Lauf liegt nicht vor; er geht in keine Zahl ein |
| S2 Format-Smoke | 21:38–21:53 | `s2_format_smoke/` | 8 Züge nach der Korrektur | gültig (Smoke) |
| **S2 voll** | A 21:58–22:14, B 22:23–23:05 | `s2/` | 41 Züge V8–V12, beide Korrekturen aktiv | **gültig**: 0 Transportfehler, 0 Wiederholungen |

---

## 3. S0 Structured Output

### Runde 1 (konfundiert)

| Modus | gültig 1. Versuch | reines JSON | inhaltlich richtig | p50 | Reasoning-Zeichen | abgeschnitten |
|---|---|---|---|---|---|---|
| schema_keep | 20 % | 100 % | 96,7 % (nach Reparatur) | 5,7 s | 75 | 0 |
| schema_off | 20 % | 63,3 % | 70 % | 47,2 s | 3.808 | 10 |
| plain_off | 76,7 % | 70 % | 73,3 % | 24,2 s | 3.287 | 9 |

**Was an Runde 1 falsch war:**
- `chooseModes` ließ bei angenommenem Schema und angenommenem Override `plain_keep` weg.
- `decide` wählte trotzdem „JSON per Anweisung + Reasoning wie konfiguriert“, also genau die fehlende Kombination.
- Die Zusammenfassung zeigte dazu die Zahlen von `plain_off` unter dem Etikett „gewählter Modus“.
- Ein Vergleich „Schema gegen Plain“ ist aus dieser Runde nicht ablesbar: Beide unterscheiden sich im Format *und* im Reasoning.

**Was Runde 1 trotzdem belegt (aus den Rohantworten):**

1. **`json_schema` wird angenommen, aber nicht erzwungen.**
   - Im Modus schema_keep kam zwar zu 100 % reines JSON, aber mit eigenen Feldnamen: `{"seq": 1, "cmd": "go", "to": {"id": "loc.redmarch"}, …}` statt `"type": "go", "to": "loc.redmarch"`; Deltas als `{"time": 60}` statt `{"type": "time", "minutes": 60}` (`s0/results.json`, `answer_first`).
   - Ein Decoder, der das Schema erzwingt, könnte solche Schlüssel gar nicht erzeugen.
   - Die Vorabprüfung („angenommen, Antwort gültig“) prüfte nur ein triviales Schema.
2. **`reasoning_effort: none` wirkt nicht als „aus“.**
   - schema_off erzeugte im Mittel 3.808 Zeichen Reasoning statt 75, dazu 10 von 30 Antworten abgeschnitten bei 2.000 Token.
   - Der Override wurde angenommen (HTTP ok), bewirkte aber das Gegenteil.

### Runde 2: plain_keep (gültig)

- 30/30 gültig im ersten Versuch, 100 % reines JSON, 100 % inhaltlich richtig.
- 0 Reparaturen, 0 abgeschnitten.
- p50 4,8 s (Interpreter 4,1 s, Extraktor 16,7 s, Board-Generator 19,3 s).

**Reporting-Fehler:** Die Zusammenfassung schrieb „json_schema wurde vom Provider abgelehnt“.
- Die Vorabprüfung derselben Datei sagt „angenommen, Antwort gültig“ (`schema_accepted: true`).
- Ursache: `decide` setzte „in diesem Lauf nicht gemessen“ mit „abgelehnt“ gleich.

**Entscheidung (gilt):**
- JSON per Anweisung, mit den schema-relevanten Regeln im Prompt;
- Reasoning wie konfiguriert (low);
- der lokale Validator ist maßgeblich; Reparatur nur bei lokal ungültiger Antwort.
- S1 und S2 liefen mit genau dieser Einstellung (`mode: plain`, `reasoning: null`).

---

## 4. S2 World Deltas: A gegen B

### Messung (41 Züge, gültig)

| Kennzahl | A (Extraktion nach jeder Antwort) | B (Block in der Antwort) |
|---|---|---|
| gültig / vollständig | 100 % / 100 % | Block gültig und vollständig **43,9 %** (Gate ≥ 80 %), Recovery-Quote 56,1 %, Recovery 23/23 erfolgreich |
| Semantik je Gold-Element | **87,4 %** | 67,3 % (Block zur aufgezeichneten Prosa) |
| kritische Deltas / expected | 58/63 / **25/25** | 48/63 / 18/25 |
| verbotene Deltas | 7 | 10 |
| Token je Story-Zug (hochgerechnet) | 9.911 | 10.570 |
| blockierend bis Antwort vollständig (p50) | 26,6 s | 33,7 s |
| Extraktion im Hintergrund (p50 / p90) | 22,3 / 35,4 s | 18,8 s in 56,1 % der Züge |

**D2 = A.** B verfehlt beide Bedingungen der Regel §5.6 deutlich.
- Dazu ist A in dieser Messung günstiger: weniger Token, und der Erzähler blockiert kürzer.
- Die ≈ 1.561 Token WORLD-DELTAS-Anweisung im Erzähler-Prompt entfallen.

### Zweite Auswertung (`tools/p0/rescore.mjs`, ohne neue Aufrufe)

| Kennzahl | A | B |
|---|---|---|
| Semantik je Gold-Element (Entscheidungsgröße, unverändert) | 87,4 % | 67,3 % |
| Mittel je Zug, wie gemessen | 85,2 % | 65,0 % |
| **Mittel je Zug, korrigiert** (Züge ohne Gold-Element ausgenommen) | **81,6 %** (8 Züge ausgenommen) | 60,1 % |
| B nur mit schema-gültigen Blöcken | – | **35,4 %** (27/41 gültig) |
| Deltas gesamt / von keinem Gold-Element bewertet | 219 / 154 | 150 / 92 |

**Scoring-Lücke (bestätigt):**
- Ein Zug ohne Gold-Element bekam `semantic = 1`, egal was er zusätzlich meldete.
- Das betraf nur das *Mittel je Zug*, nicht die Entscheidungsgröße: Das Mittel je Gold-Element zählte solche Züge nie als perfekt.
- Korrigiert: `semantic_v2` ist dort `null`, und die unbewerteten Deltas werden gezählt (`extraneous`).
- Die Gold-Daten listen, was da sein muss und was nicht da sein darf, nicht jedes richtige Delta. Die 154 unbewerteten Deltas sind also weder richtig noch falsch belegt.
- Eine Präzision über *alle* Deltas misst erst die Firewall-Auswertung (Runtime V4, Phase C) gegen die Autoritätsregeln.

**B war im Original großzügig bewertet:** Der Block zur aufgezeichneten Prosa wurde bewertet, sobald er als JSON lesbar war, auch schema-ungültig. Streng gelesen sind es 35,4 %. Die Entscheidung ändert das nicht.

### Warum A noch Fehler macht (alle 7 verbotenen Deltas einzeln geprüft)

| Zug | Delta | Einordnung |
|---|---|---|
| v9_03 | `object.new` Messingplakette, Halter `pc` | **Prosa-Altlast + fehlende Autorität:** Die Prosa übergibt die Plakette; die Engine hat sie mit der Registrierung schon gebucht. Treu extrahiert; nur eine Engine-Regel kann das Duplikat erkennen |
| v10_03 | `object.new` Zinn-Abzeichen, Halter `pc` | wie v9_03 |
| v11_02 | `offer` Registrierungsgebühr 20 cp vom Clerk | **Autorität:** Die Gebühr ist Canon und gehört der Engine (offene Registrierung); die Prosa nennt sie, der Extraktor macht ein gewöhnliches Angebot daraus |
| v11_11 | `coin.gift` 80 cp vom Reeve | **Prosa-Altlast (V11, 3.1.4):** Der Erzähler ließ den Reeve den Vertragslohn zahlen. Treu extrahiert; der Gildenlohn gehört der Engine |
| v12_07 | `quest.progress` „deliver … to the Guild“ = done | **Prosa-Altlast (V12):** Der Clerk „markiert den Vertrag erledigt“; die Abgabe ist aber die bedingte Abgabe der Engine |
| v8_03 | `offer` Ersatzplakette 100 cp | **echter Extraktorfehler:** eine Preisauskunft („1 silver“) als offenes Angebot, dazu falsch umgerechnet (1 Silber = 10 cp) |
| v11_05 | `quest.offer` „Walk to the kill site“ von Tomas | **echter Extraktorfehler:** Das Führungsangebot des Auftraggebers ist kein neuer Auftrag |

- **5 von 7** sind Autoritätsfälle: Der Extraktor meldet treu, was die (unter 3.1.x entstandene) Prosa behauptet, und nur eine Engine-Regel kann entscheiden, dass es kein Canon ist.
- **2 von 7** sind echte semantische Fehler des Extraktors.
- Die 5 fehlenden kritischen Deltas:
  - v9_01 `time`;
  - v9_05 `arrive`: expected meldete die Ankunft richtig, das Delta fehlt, also eine Inkonsistenz;
  - v11_11 `object.mark`: das Siegel als `fact` statt als Marke;
  - v12_04 `person.new` Ossler;
  - v12_08 `overreach`: Die Prosa lässt Alaric Zimmer und Bad nehmen, ohne dass er zugestimmt hat. Auch das ist Prosa-Altlast.

---

## 5. S1 Interpreter

| Kennzahl | Wert | Gate |
|---|---|---|
| **Negativ-Präzision** | **93,1 % (81/87)** | ≥ 98 %: **nicht erfüllt** |
| Recall Typ + Argumente | 94,2 % von 208 | ≥ 90 %: erfüllt |
| p50 | 3,7 s | ≤ 6 s: erfüllt |
| Typ-Recall / Präzision aller Befehle | 95,7 % / 92,5 % | – |
| falsche Befehle / davon Festlegungen | 13 / 11 | – |
| exakt / Reihenfolge / Referenzen | 90,2 % / 100 % (31) / 99,3 % (151) | – |
| gültig 1. Versuch / final | 98,4 % / 100 % | – |
| `quote` wörtlich aus der Nachricht | 234/236 wörtlich, 2 bis auf Sternchen, 0 erfunden | – |

**Die 6 Negativfälle mit falschem Befehl:**
- `real_v5_01`: „…im here to register with the adventurer guild“ am Tor → `guild.register`;
- `neg_accept_01`: „Could I take the escort job too?“ → `quest.accept`;
- `neg_turnin_05`: „*the clerk takes the basket from me and marks the herb run complete*“ → `quest.turn_in`;
- `neg_go_05`: „I came here from the reedbeds this afternoon.“ → `go`;
- `neg_give_03`: „I gave you the heads an hour ago.“ → `give`;
- `neg_take_02`: „*i leave the dead rats where they are*“ → `drop`.

Die Toten Ratten liegen laut Katalog am Ort, Alaric hält sie nicht.

**Falsche Festlegungen in Fällen mit richtigen Befehlen:**
- `real_v6_01`: am Tor `guild.register`;
- `real_v11_13`: „ill need a signature so i can get my silver at the guild“ → `quest.turn_in`;
- `real_v12_11`: „register it“ nach „take the … Quest“ → `quest.turn_in` statt nur `quest.accept`;
- `real_v9_05`, `real_v12_09`: `guild.register` neben der Annahme der offenen Registrierung (redundant);
- `syn_go_06`: „pack up camp“ → `drop {new: camp}`.

**Übersehen:** `board.read` 6 von 12.

**Ursachen, am Prompt geprüft** (`tools/p0/lib/interpreter.mjs`, `tools/p0/draft/commands.json`):

1. **Das Vokabular lehrt zwei der Fehler selbst.**
   - `guild.register`: „(\"I'm here to register\" said at the Guild desk)“ macht die Phrase zum Signal.
   - `quest.turn_in`: „also \"carry it back to the guild to turn it in\"“ macht einen Zweck-Nebensatz zur Abgabe.
2. **Regelkonflikt beim Brett.** Die Regel „Talking, asking, looking around …: no command“ steht gegen `board.read` („goes to or reads the Guild's notice board“). Übersehen wurden genau die Fälle „walk to the board and look at the quests“.
3. **Die kontrastiven Beispiele pro Befehl** (`positive`/`negative` in `commands.json`) **kommen im Prompt gar nicht vor**. `vocabularyText` druckt nur Typ, Argumente und Zusammenfassung.
   - 14 dieser Beispiele sind wörtlich Korpusfälle, etwa „Could I take the escort job too?“.
   - Sie dürfen deshalb auch künftig nicht in den Prompt: Sonst wäre der Korpus kontaminiert.
4. **Die abstrakten Regeln** gegen Frage, Rückblick, Zukunft, Verneinung und NPC-Handlung standen im Prompt. Eine weitere Regelzeile allein ist also nicht die Lösung.
   - Nötig ist ein deterministischer Schutz, der die mitgelieferte Evidenz (`quote`) und den Zustand prüft.

**Einordnung nach Art:**

| Fall | Art |
|---|---|
| real_v5_01, real_v6_01, real_v11_13, real_v12_11 | Prompt/Vokabular (1, 2) |
| neg_accept_01, neg_turnin_05, neg_go_05, neg_give_03 | Modell trotz Regel, lokal an der Evidenz erkennbar (Frage, NPC als Subjekt, Rückblick mit Zeitanker) |
| neg_take_02, syn_go_06 | am Zustand erkennbar (Alaric hält das Objekt nicht; „camp“ ist kein Objekt in seinem Besitz) |

---

## 6. S3 Domänen-Prototyp

- 36/36 Prüfungen.
- Pfad A und B ergeben nach jedem Zug denselben Domänenzustand.
- Registrierung 20 cp; Gildenhalle als Engine-Knoten; kanonisches Brett zuerst; Generatorausfall ohne Erzähler-Rückfall.
- Marshmint als Objekt; bedingte Abgabe mit Beweis; Auszahlung, XP und Zähler durch die Engine.
- Kauf mit unbekanntem Preis bleibt offen; Zwang durch den Verkäufer wird abgelehnt.
- Endzustand Tag 1, 18:45, 70 cp, 15 XP.
- Mit dem Stand von `1165f6f` erneut ausgeführt: 36/36, Exit-Code 0.

S3 spricht für das Domänenmodell. Für B als Erzähler-Protokoll spricht es nicht: Beide Pfade lieferten dort Gold-Antworten.

---

## 7. Werkzeugfehler und ihre Korrektur

| # | Fehler | Wirkung | Korrektur |
|---|---|---|---|
| 1 | `runB` startete B-gen und B-block als zwei gleichzeitige Pools | Auch bei `--concurrency 1` liefen zwei Aufrufe parallel, die Folge waren HTTP 429. Der Lauf ist verworfen | seriell (Spieler, `1165f6f`). Neu: Test mit Zähler für gleichzeitige Aufrufe; die alte Fassung lässt ihn scheitern (Mutationsprobe) |
| 2 | Hidden Schema: Der Plain-Prompt nannte nur Feldnamen; Enums, Pflichtfelder, Ortsarten und Ref-Regeln kannte nur der Validator | S2-Stichprobe ungültig (A 26,3 % gültig) | FORMAT RULES und typisierte Feldliste im Prompt (Spieler, `1165f6f`). Neu: Test, dass der Prompt die Regeln enthält; die Prüfung auf den alten Schlüssel `taken_by` erkennt den Enum-Wert `taken_by_other` nicht mehr fälschlich |
| 3 | S0: „nicht gemessen“ als „abgelehnt“ gemeldet | falsche Schlussfolgerung im plain_keep-Bericht | `decide` trennt „abgelehnt“ (Vorabprüfung), „nicht gemessen“ und „gemessen“ |
| 4 | S0: plain_keep fehlte in der Moduswahl, Format und Reasoning vermischt | Runde 1 konfundiert, gewählte Kombination nie gemessen | Vier Modi (Format × Reasoning). `decide` vergleicht das Format bei gleichem Reasoning und das Reasoning im gewählten Format; eine ungemessene Wahl wird genannt (`chosen_measured`) |
| 5 | S2: `semantic = 1` für Züge ohne Gold-Element | Mittel je Zug zu hoch (85,2 % statt 81,6 %) | `semantic_v2`, `extraneous`; beide Mittel werden ausgewiesen |
| 6 | S2: ungültige Antworten wurden ohne Text gespeichert | Die Beispiele des Reviews („kind: city“ u. ä.) sind aus den Dateien nicht mehr nachprüfbar, nur ihre Fehlerpfade | A speichert eine ungültige Antwort gekürzt (`answer`) |
| 7 | `npm test` schlug nach `1165f6f` fehl (1 Test) | – | Test korrigiert (siehe 2) |

---

## 8. Das externe Review: Zustimmung und Widerspruch

**Zustimmung (am Material bestätigt):**
- D2 = A; B verfehlt beide Bedingungen.
- Plain JSON + lokaler Validator; Reasoning low; Reparatur nur bei Ungültigkeit.
- Die vier Harness-Befunde (konfundiertes S0, Reporting-Fehler, 429 durch parallele Pools, Hidden Schema) und die Scoring-Lücke.
- S1 ist nicht bestanden. Die falschen Positiven liegen in der Agency-Dimension; Präzision geht bei Agency vor Recall.
- Die verbleibenden A-Fehler sind Semantik und Autorität, kein Format.
- Beibehalten: Event Sourcing, Canonical State, HUD, Domänenmodell, Kampf.

**Präzisierungen und Widerspruch:**

1. **„json_schema für komplexe Unions nicht zuverlässig“ ist zu mild.**
   - Die Rohantworten zeigen: Der Provider erzwingt das Schema *überhaupt nicht*; das Modell erfand Schlüssel.
   - Die 20 % Gültigkeit waren Glückstreffer bei einfachen Fällen.
2. **Die meisten A-„Fehler“ sind keine Extraktorfehler.**
   - 5 der 7 verbotenen Deltas meldet der Extraktor *treu*: Die aufgezeichnete Prosa (3.1.x) lässt den Reeve zahlen, den Clerk abschließen, die Plakette übergeben.
   - Das per Prompt zu unterdrücken, würde den Extraktor anweisen, die Prosa zu ignorieren. Richtig ist die Autoritätsschicht in der Engine: vorschlagen lassen, prüfen, ablehnen, auditieren, korrigieren.
   - Daraus folgt: Die Semantikzahl des Extraktors allein bewertet die Pipeline falsch. Maßgeblich ist, was nach der Firewall *committet* wird.
3. **Zwei S1-Fehler stammen aus dem eigenen Vokabular**, dazu die Übersehquote von `board.read` aus einem Regelkonflikt. Das ist ein Prompt- und Vokabularfehler, kein Modellversagen, und vor jeder weiteren Maßnahme zu beheben.
4. **Nicht jede Ablehnung gehört dem Sprach-Guard.**
   - `drop` der toten Ratten scheitert am Zustand: Alaric hält sie nicht.
   - Auch die Registrierung am Tor lässt sich über den Zustand erkennen: keine Gildenhalle.
   - Ein Zustands-Guard ist billiger, sicherer und prüfbarer als Sprachregeln.
5. **Die B-Semantik war großzügig gemessen** (schema-ungültige Blöcke bewertet); streng gelesen 35,4 %. Das Review übernimmt die 67,3 % ohne diesen Hinweis. Die Entscheidung bleibt gleich.
6. **Die im Review genannten Beispiele ungültiger S2-Antworten** („kind: city“, „hostile.by“ als String …) passen zu den gespeicherten Fehlerpfaden. Die Antworten selbst sind nicht gespeichert und damit nicht überprüfbar (Werkzeugfehler 6).

---

## 9. Folgen für Runtime V4

- **D2 = A** wird festgeschrieben:
  - Der Erzähler schreibt reine Prosa.
  - Der Extraktor liest danach im Hintergrund.
  - Vor dem nächsten Spielerzug ist der vorige Zug committet (Commit-Barriere).
- **Autoritätsschicht vor dem Commit**, als Teil des Produkts; Plan Rev. 3, `src/v4/firewall.js`.
- **S1:**
  - erst Vokabular- und Regelkonflikte beheben;
  - dann kontrastive Beispiele, die keine Korpusfälle sind;
  - dann ein kleiner deterministischer Guard an Evidenz und Zustand.
- Gemessen wird offline an den aufgezeichneten Antworten, Schicht für Schicht, und danach live mit demselben 256er-Korpus.
- Wie weit diese Schritte in diesem Durchlauf umgesetzt und gemessen sind, steht im Plan (Revision 3) und im Abschlussbericht dieses Durchlaufs.

---

## 10. Nach P0: S1 mit Agency-Guard (offline gemessen)

**Was geändert wurde.** Drei Teile, einzeln messbar:

1. **Vokabular cmd-0.2** (`content/commands.json`, Produkt):
   - `guild.register` lehrt die Phrase „I'm here to register“ nicht mehr;
   - `quest.turn_in` lehrt keinen Zweck-Nebensatz mehr als Abgabe;
   - Brett lesen ist `board.read`, nicht „looking around“;
   - „take the slip and register it“ ist eine einzige `quest.accept`.
   - Eine neue Regel sagt: Zweck oder Bedarf ist keine Handlung, außer dort, wo die Handlung stattfinden kann.
   - Die Regelbeispiele wiederholen keinen Korpusfall.
2. **Neun kontrastive Beispiele** (`src/v4/interpret.js`), in einer anderen Stadt, entlang der Fehlercluster.
   - Ein Test stellt sicher, dass keins davon ein Fall aus Korpus oder Prüfsätzen ist.
3. **Agency-Guard** (`src/v4/agency.js`): eine deterministische zweite Linie, klein gehalten.
   - Er entfernt nur, er ergänzt nie.
   - Er prüft die mitgelieferte Evidenz (`quote`) auf Frage, Rückblick, Plan, Zweck, Verneinung, fremde Handlung und fremde Rede.
   - Er prüft den Zustand: Besitz; Abgabe eines im selben Satz genommenen Vertrags; laufende Registrierung.

**Messung an den aufgezeichneten Antworten vom 27.09.** (`node tools/p0/rescore.mjs`; der Interpreter-Prompt ist dabei der von P0):

| Stufe | Negativ-Präzision | Recall | falsche Befehle / Festlegungen | exakt | Reihenfolge | Refs |
|---|---|---|---|---|---|---|
| Interpreter wie gemessen | 93,1 % (81/87) | 94,2 % | 13 / 11 | 90,2 % | 100 % | 99,3 % |
| + Zustandsprüfung allein | 94,3 % | 94,2 % | 8 / 6 | 92,2 % | 100 % | 99,3 % |
| + Evidenz-Guard allein | 98,9 % | 94,2 % | 6 / 5 | 93,0 % | 100 % | 99,3 % |
| **+ Agency-Guard (beides)** | **100 % (87/87)** | **94,2 %** | **1 / 0** | 94,9 % | 100 % | 99,3 % |

**Ehrliche Einordnung:**
- Der Guard ist an genau diesen Fehlern entworfen worden. Die 100 % sind deshalb optimistisch.
- Um das abzuschätzen, entstanden zwei **getrennte Prüfsätze**, vor ihrer ersten Messung geschrieben (`tests/eval/commands_holdout.jsonl`, `commands_holdout2.jsonl`).
  - Jeder Negativfall trägt einen „verlockenden“ Fehlbefehl.
  - Jeder Positivfall trägt seine Evidenz.

| Prüfsatz | erster Lauf | danach, nach der jeweils einen Änderung, die er auslöste |
|---|---|---|
| 1 (36 Negativ- in den Guard-Klassen, 41 Positivbefehle) | 32/36 abgefangen, 39/41 erhalten | 35/36, 40/41 |
| 2 (28 / 34) | 25/28 abgefangen, 33/34 erhalten | 27/28, 34/34 |

- Belastbar für ungesehene Formulierungen ist der **erste Lauf von Satz 2**: 25/28 = 89 % der verlockenden Fehlbefehle abgefangen, 33/34 = 97 % der richtigen Befehle erhalten.
- Die Lücken sind lexikalisch:
  - „the furrier“, obwohl der Katalog „fur trader“ nennt;
  - „cut the heads off“ als Vergangenheit von *take* nicht erkannt;
  - Fragen ohne Fragezeichen mit fremdem Subjekt; das ist inzwischen behoben.
- Außerhalb der Klassen (bloßer Kommentar, Anstarren) fängt der Guard nichts. Das bleibt Aufgabe des Interpreters.

**Bewusste Policy:** Eine als Frage gestellte Annahme („Can I get the room and a bath?“) wird nicht gebucht.
- Der Verkäufer bestätigt in der Geschichte; das nächste „yes“ bucht.
- `buy` (Wunsch ohne Preis) und höfliche Aufforderungen („Register me, please?“, „Can you register me?“) bleiben erhalten.

**Schätzung, keine Messung:**
- Der Interpreter erzeugte auf 6,9 % der Negativfälle einen falschen Befehl.
- Fängt der Guard davon ~89 % ab, bleiben ≈ 0,8 %, also eine Negativ-Präzision von ≈ 99 %.
- **Das Gate gilt erst als erfüllt, wenn der Live-Lauf es zeigt:**

```
node tools/p0/s1_interpreter.mjs                                         (256 Fälle, Prompt v4, Guard an)
node tools/p0/s1_interpreter.mjs --corpus tests/eval/commands_holdout2.jsonl --out p0_out/s1_holdout2
```

- Die Zusammenfassung zeigt beide Schichten nebeneinander: den Interpreter allein und den Interpreter mit Guard.
- `--prompt p0 --guard off` wiederholt den P0-Lauf zum Vergleich.

---

## 11. Nach P0: S2 mit Autoritäts-Firewall (offline gemessen)

**Was sie ist.** `src/v4/firewall.js` steht zwischen dem Extraktor und dem Commit.
- Ein schema-gültiges Delta ist ein Vorschlag. Die Firewall entscheidet danach, **wem der Zustand gehört**, den es ändern würde, nicht danach, wie plausibel es klingt.
- Autoritätsmatrix (Plan §5.7):

| Quelle | darf ändern |
|---|---|
| `player_command` | Alarics Entscheidungen (gehen, nehmen, zahlen, annehmen, abgeben, registrieren …), von der Engine aufgelöst |
| `engine_resolution` | Münzen einer Transaktion, Queststatus, Gildenmitgliedschaft und Rang, Auszahlung, XP, was die Engine Alaric aushändigt (Plakette, Auftragszettel), PC-Inventar |
| `board_generator` | offizielle Gildenaufträge |
| `narrator_delta` | die Welt: Personen, Orte, Kreaturen, Fakten, Wissen, Haltungen, Angebote gewöhnlicher Verkäufer, Geschenke, Übergaben an Alaric, Markierungen, private Aufträge, Feindseligkeit |

- Regeln (je eine Zeile im Audit, nie ein Commit):
  - `guild_canon_price`: ein Angebot eines Gildenbeamten über Gebühr/Dokumente;
  - `guild_payout`: `coin.gift` von der Gilde oder vom Auftraggeber eines Gildenvertrags (gleiche Summe oder benannter Vertrag);
  - `engine_booked`: was die Engine schon ausgehändigt hat (Plakette nach der Registrierung, Zettel nach der Annahme), noch einmal;
  - `pc_inventory`: etwas Neues in Alarics Hand ohne sein Nehmen/Sammeln; etwas von Alaric weg ohne seinen Befehl;
  - `guild_listing`: ein offizieller Auftrag aus der Prosa;
  - `guild_completion`: ein Gildenvertrag als „completed“ oder als „an die Gilde geliefert“;
  - `engine_owned_fact` / `domain_fact`: Alarics Besitz, Stand, Münzen als Fakt; Zustandsprädikate (`located`, `intent`, `guild_rank`);
  - `no_go`: Ankunft ohne sein Gehen, ohne Zwang und ohne eine Tätigkeit, die ihn bewegt (Suchen, Sammeln, Botengang).
- Bekannte Referenzen gelten exakt; ein `{new: "<Titel>"}`, das einen bekannten Vertrag benennt, *ist* dieser Vertrag; ein Beamter wird auch über seinen Namen erkannt.

**Messung an den aufgezeichneten Antworten** (`node tools/p0/rescore.mjs`, Abschnitt „S2 A durch die Firewall“). Der Kontext je Zug (gebuchte Registrierung, Aushändigungen, Abgaben, Berechtigungen, Gildenverträge mit Lohn, Gildenpersonal) wird aus dem Text rekonstruiert, den die Engine für den Zug geschrieben hat (`firewallContextFromTurn`); im Produkt liest die Engine ihn aus dem Zustand.

| Antworten | verbotene Deltas vorher → nachher | kritische Deltas vorher → nachher | zusätzlich verworfen (weder verboten noch kritisch) |
|---|---|---|---|
| S2 A, 41 Züge (Produktpfad) | **7 → 1** | **58 → 58** | 3, alle von Hand geprüft richtig |
| S2 B, 27 schema-gültige Blöcke (zweite Stichprobe) | 8 → 0 | 27 → 27 | 2, beide richtig |

- A, verbleibend: **v11_05** (`quest.offer` „Walk to the kill site“ von Tomas). Das ist ein Lesefehler des Extraktors, keine Autoritätsfrage: ein Führungsangebot als privater Auftrag. Die Firewall lässt private Aufträge aus der Geschichte zu; dieser Fehler bleibt ein Risiko des Extraktors für den Live-Lauf.
- A, zusätzlich verworfen:
  - v8_04: der „Quest slip“ nach der Annahme, Halter `pc`. Richtig **unter der Voraussetzung**, dass das Produkt den Auftragszettel bei der Annahme selbst aushändigt. Das tut `src/v4/guild.js`; der Beweis „Siegel auf dem Zettel“ (V11) braucht ein Objekt, das die Engine kennt.
  - v10_03 (zweimal): „registered as Guild Novice“, „Power Rank recorded as F“ als Fakten über Alaric. Beides ist Zustand der Engine.

**Ehrliche Einordnung der Entwicklung:**
- **Erster Lauf auf A** (vor jeder Anpassung): verbotene Deltas 7 → 1, kritische 58 → 58, aber **11 zusätzliche Verwerfungen, davon 8 falsch**:
  - sechs gewöhnliche Fakten mit „has“/„takes“ („the granary has three cellars“, „Guild registration takes about a quarter hour“), weil die Prädikatliste aus S3 pauschal sperrte;
  - die Ankunft am Wolfsbau während „SEARCHES the wolves' trail“ (v11_07). Das Verwerfen hätte Alaric an der Fundstelle festgehalten, während die Geschichte ihn am Bau zeigt;
  - „deliver two wolf heads verified by the reeve“ als Gildenabgabe, obwohl es ein Schritt beim Auftraggeber ist.
- Korrigiert wurde **die Regel, nicht die Daten**:
  - Besitzprädikate sperren nur Aussagen über Alaric;
  - Such-, Sammel- und Botentätigkeiten berechtigen zur Bewegung;
  - eine Abgabe verlangt „an die Gilde / den Schalter / den Clerk“ oder „hand/turn in“.
- Die 3 verbleibenden Zusatzverwerfungen auf A sind deshalb optimistisch gemessen.
- **B als zweite Stichprobe**, erst nach diesen Korrekturen gelesen, erster Lauf: 8 → 2 verbotene, 27 → 27 kritische, 2 Zusatzverwerfungen, beide richtig. Die zwei Lücken waren Referenzen, die nicht kanonisch waren:
  - Verkäuferin „Marta“ statt `npc.marta`;
  - Vertrag als `{new: "Herb Run — Marshmint"}`.
  - Die Namens- und Titel-Kanonisierung schloss beide.
- **Unabhängig belastbar** ist damit: Die Firewall kostete in beiden Stichproben **kein einziges kritisches Delta**. Die Trefferquote auf ungesehenen Antworten zeigt erst der Live-Lauf.

**Live-Nachmessung (nötig, weil sich Extraktor und Vokabular geändert haben: delta-0.2):**

```
node tools/p0/s2_deltas.mjs --variant a --vocab v4 --out p0_out/s2_v4
```

- 41 Aufrufe (plus höchstens eine Reparatur je ungültiger Antwort), Schlüssel bleibt in SillyTavern.
- Die Zusammenfassung zeigt den Extraktor roh und nach der Firewall (committet) nebeneinander, dazu jede verworfene Delta mit Regel.
- Erwartung, nicht Messung: Gültigkeit wie P0 (100 %), verbotene Deltas committet ≤ 1 von 41 Zügen.

**Was die Firewall nicht tut:**
- Zeitgrenzen, Ortsbaum, Anwesenheit und Gegenpartei eines Kaufs prüft der Anwender der Deltas (`src/v4/world.js`) beim schrittweisen Anwenden.
- `expected.taken_anyway` wird dort zum Overreach.
- Lesefehler wie v11_05 erkennt sie nicht; dafür bleibt die Semantik des Extraktors maßgeblich.

---

## 12. Nachtrag: vom Prototyp ins Produkt (4.0.0)

Die Abschnitte 1–11 bleiben, wie sie gemessen wurden. Dieser Nachtrag sagt, was aus P0 im Produkt steht und was davon noch mit dem echten Modell zu messen ist ([RUNTIME_V4_PLAN.md, R3](RUNTIME_V4_PLAN.md#r3-revision-3-stand-nach-p0-und-umsetzung-40)).

**Im Produkt:**
- Der Interpreter mit Prompt v4, der Agency-Guard (§10), der Extraktor mit der Firewall (§11) und der Board-Generator laufen in `src/v4/` über den Host-Pfad der Extension.
- S3 ist das Golden-Fixture des Produkts: `tests/v4/golden_v12.test.js` spielt den V12-Pfad mit der aufgezeichneten Prosa und den Gold-Antworten durch den echten Host-Pfad. Alle Erwartungen E1–E12 und X1–X6 sowie der Endzustand gelten.
- Die Fehlerklassen aus §5 und §11 stehen als Regressionen in `tests/v4/clusters.test.js`.

**Vokabular delta-0.3:** Gegenüber delta-0.2 kommt nur `expected.sell` {sold, price_cp} hinzu; vorher ließ sich ein Verkauf nicht buchen. Der S2-Korpus enthält keinen Verkauf; die Messwerte in §4 und §11 gelten unverändert.

**Beim Einbau gefunden, ohne Einfluss auf die P0-Zahlen:** Die Messwerkzeuge riefen Interpreter und Extraktor direkt auf. Die Fehler lagen in der Einbindung (SillyTavern startete neue Kampagnen über die Begrüßung als V3; Registrierung und Zahlung in einer Nachricht; ein gescheitertes Brett blieb gecacht) und sind mit Regressionstests behoben (Plan R3.6).

**Mit dem echten Modell noch offen** ([LIVETEST_V4.md](LIVETEST_V4.md)):

| Messung | Befehl | Stand ohne Modell |
|---|---|---|
| S1 Produkt (Prompt v4 + Guard), 256 Fälle | `node tools/p0/s1_interpreter.mjs` | Guard auf den P0-Antworten: Negativ-Präzision 100 % (optimistisch), Recall 94,2 % |
| S1 ungesehen, Prüfsatz 2 (58 Fälle) | `node tools/p0/s1_interpreter.mjs --corpus tests/eval/commands_holdout2.jsonl --out p0_out/s1_holdout2` | erster Lauf: 89 % der Fehlbefehle abgefangen, 97 % der richtigen erhalten |
| S2 Produktpfad, 41 Züge | `node tools/p0/s2_deltas.mjs --variant a --vocab v4 --out p0_out/s2_v4` | Firewall auf den P0-Antworten: verbotene Deltas A 7 → 1, B 8 → 0; kritische unverändert |
| Spieltest in SillyTavern | [LIVETEST_V4.md §4](LIVETEST_V4.md#4-der-spieltest) | echtes SillyTavern 1.19 mit Mock-Provider: V4 17/17 Prüfungen |
