# Runtime V4 · P0: Spikes S0–S3 (Werkzeuge, Anleitung, Stand)

**Status:** P0 ist gemessen (27.09.2026, `p0_out/`). **Ergebnis, gültige und ungültige Läufe, Werkzeugkorrekturen: [P0_BERICHT.md](P0_BERICHT.md).** Kurz:
- S0: Plain JSON, Reasoning low;
- S1: Präzision 93,1 %, nicht bestanden;
- S2: D2 = A;
- S3: 36/36.

Die Anleitung unten gilt weiter, mit den Korrekturen aus P0_BERICHT §7:
- S0 misst vier Modi;
- S2 läuft seriell, mit den Schema-Regeln im Prompt;
- `tools/p0/rescore.mjs` wertet gespeicherte Antworten neu aus, ohne Aufrufe.

`tools/p0/` wird von keiner Engine-Datei importiert.

Grundlage: [RUNTIME_V4_PLAN.md](RUNTIME_V4_PLAN.md) §16 (P0), §4 (Befehle), §5 (Deltas), §6 (Domänen), §11 (Tests).

## Inhalt

1. [Überblick](#1-überblick)
2. [Sicherheit: Der Key bleibt, wo er ist](#2-sicherheit-der-key-bleibt-wo-er-ist)
3. [Anleitung für Windows](#3-anleitung-für-windows)
4. [S0 Structured Output](#4-s0-structured-output)
5. [S1 Interpreter](#5-s1-interpreter)
6. [S2 World-Delta-Strategie (A gegen B)](#6-s2-world-delta-strategie-a-gegen-b)
7. [S3 Domänen-Prototyp (V12-Pfad)](#7-s3-domänen-prototyp-v12-pfad)
8. [Was P0 schon ergeben hat](#8-was-p0-schon-ergeben-hat)
9. [Dateien](#9-dateien)
10. [Prüfung der Werkzeuge](#10-prüfung-der-werkzeuge)

---

## 1. Überblick

| Spike | Werkzeug | Frage | Aufrufe | Dauer (geschätzt) | Key nötig | Ergebnis |
|---|---|---|---|---|---|---|
| Vorab | `tools/p0/check.mjs --ping` | Ist SillyTavern (oder der Provider) erreichbar, welche Einstellungen gelten? | 1 | Sekunden | über ST: nein | Konsole |
| **S0** | `tools/p0/s0_structured.mjs` | Hält der Provider `json_schema` ein? Was kostet Reasoning an Zeit und Token? | 3–4 Vorab + 4 Modi × 10 Fälle × 3 Wiederholungen = **120**, + höchstens 1 Reparatur je ungültiger Antwort (bis P0_BERICHT §7: 3 Modi, 90) | 5–25 min | über ST: nein | `p0_out/s0/summary.md`, `decision.json` |
| **S1** | `tools/p0/s1_interpreter.mjs` | Übersetzt der Interpreter Spielertexte richtig in Befehle, ohne falsche Agency? | **256** (ein Aufruf je Korpusfall), + Reparaturen; schnell: `--sample 80` | 8–30 min (Stichprobe 3–10 min) | über ST: nein | `p0_out/s1/summary.md` |
| **S2** | `tools/p0/s2_deltas.mjs` | Variante A (Extraktion nach jeder Antwort) oder B (Block in der Antwort, Recovery nur bei Bedarf)? | A **41** + B **82** (41 Erzähler + 41 Block zur aufgezeichneten Prosa), + 1 Recovery je fehlerhaftem Block | 20–40 min | über ST: nein | `p0_out/s2/summary.md`, `decision.json` |
| **S3** | `tools/p0/s3_prototype.mjs` | Tragen die Domänengrenzen den V12-Pfad? | **0** (offline) | unter 1 s | nein | `p0_out/s3/summary.md` |
| Rückgabe | `tools/p0/report.mjs` | – | 0 | Sekunden | nein | `p0_out/P0_ERGEBNIS.md` |

**Token gesamt** (Hochrechnung aus den Läufen, GLM-5.3-Flash):
- S0 ≈ 0,1 Mio.;
- S1 ≈ 0,45 Mio.;
- S2 ≈ 0,9 Mio.

Die Werkzeuge messen die echten Werte und schreiben sie in die Ergebnisse.

**Reihenfolge:** check → S0 → S1 → S2 → S3 → report.
- S1 und S2 übernehmen die S0-Entscheidung (strukturierter Modus, Reasoning) aus `p0_out/s0/decision.json`. Mit `--mode json_schema|plain` und `--reasoning <wert>|keep` lässt sie sich überschreiben.
- S3 braucht weder Key noch Netz und kann jederzeit laufen.

**Go/No-Go nach P0** (Plan §16):
- Interpreter: Präzision auf Negativfällen ≥ 98 %, Recall ≥ 90 %, p50 ≤ 6 s (S1);
- D2 nach der Regel §5.6 entschieden (S2);
- S3 ohne offene Grenzfrage.

---

## 2. Sicherheit: Der Key bleibt, wo er ist

**Grundsatz:** Kein API-Key gehört in Claude, ChatGPT, GitHub, einen Commit, eine hochgeladene Datei, Test-Fixtures, Logs, Screenshots, die Dokumentation oder eine Chat-Ausgabe.

### Zwei Wege zum Provider

| | **Weg B: über SillyTavern (empfohlen, Standard)** | Weg A: Umgebungsvariablen (`--backend direct`) |
|---|---|---|
| Wo liegt der Key? | Nur in SillyTavern (`data/default-user/secrets.json`), wie beim Spielen | Zusätzlich im Speicher der PowerShell-Sitzung |
| Sehen die Werkzeuge den Key? | **Nein.** Sie rufen SillyTavern auf (`/api/backends/chat-completions/generate`, wie `generateRaw`); SillyTavern setzt den Key serverseitig ein | Ja, im Prozess; er geht nur in den `Authorization`-Header |
| Was lesen die Werkzeuge? | Aus den ST-Einstellungen: Quelle, Endpoint-URL, Modell, Include/Exclude-Body-Text, Header-Text, Post-Processing; mit `--profile` aus dem Connection Profile auch die `secret-id` (nur die Kennung, nie den Wert) | `AVERETH_AB_API_BASE`, `AVERETH_AB_API_KEY`, `AVERETH_AB_MODEL`, optional `AVERETH_AB_EXTRA_BODY` |
| Gleiche Einstellungen wie im Spiel? | Ja, automatisch (auch `reasoning_effort` und `clear_thinking` aus den Include Body Parameters) | Nur, wenn man sie von Hand gleich setzt |
| Muss der Spieler den Key im Klartext haben? | **Nein** | Ja. SillyTavern zeigt gespeicherte Keys nur maskiert (`allowKeysExposure: false`, letzte 3 Zeichen), also aus dem Provider-Konto |
| Voraussetzungen | SillyTavern läuft lokal, Quelle „Custom (OpenAI-compatible)“ gewählt und gespeichert, keine Basic-Auth, keine Benutzerkonten | Node ≥ 20, die Werte des Providers |

**Empfehlung: Weg B.** Der Key verlässt SillyTavern nie, und die Messung läuft mit genau den Einstellungen, mit denen gespielt wird. Weg A bleibt Rückfall, falls SillyTavern mit Passwort oder Benutzerkonten läuft.

### Was die Werkzeuge in jedem Fall tun

- **Ausgaben ohne Geheimnisse:**
  - Sie schreiben nie Key, Header oder Endpoint-URL in eine Ausgabe.
  - `describe()` zeigt nur Modellname, Profilname und die Namen der Include-Body-Schlüssel, nie deren Werte.
- **Fehlertexte gereinigt:** Alles, was wie ein Key aussieht (`sk-…`, `Bearer …`, `?api_key=…`) oder dem gesetzten Key gleicht, wird ersetzt.
- **Letzte Sperre:** Vor jedem Schreiben prüft `assertNoSecrets`; findet es den Key oder einen Authorization-Header, bricht das Werkzeug ab. `report.mjs` prüft zusätzlich auf Key-Muster.
- **`.gitignore`:** `p0_out/`, `.env`, `*.env` und `.env.*` sind ausgeschlossen, im Repo-Root und in `avereth-engine/`.
- **`check.mjs --backend direct`:** zeigt beim Key nur „gesetzt (Länge N, Inhalt wird nicht angezeigt)“ und bei der URL nur den Host.

---

## 3. Anleitung für Windows

Platzhalter: `<DEIN_REPO_PFAD>` = Ordner des geklonten Repos. Die Werkzeuge liegen in `<DEIN_REPO_PFAD>\avereth-engine`.

### 3.1 Vorbereitung (einmal)

```powershell
node --version                 # muss v20 oder neuer sein
cd "<DEIN_REPO_PFAD>"
git fetch origin
git checkout claude/happy-wright-1a4y19
git pull
cd "<DEIN_REPO_PFAD>\avereth-engine"
npm test                       # optional: 315 Tests, alle grün, ohne Netz
```

### 3.2 Weg B (empfohlen): über SillyTavern

1. SillyTavern starten (`Start.bat`) und das Fenster offen lassen.
2. In SillyTavern unter **API Connections** (Stecker-Symbol) prüfen: Chat Completion, Quelle **Custom (OpenAI-compatible)**, Endpoint und Modell wie beim Spielen. Einmal „Connect“, damit die Einstellung gespeichert ist.
3. In einer PowerShell:

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
node tools/p0/check.mjs --ping
```

**Erwartete Ausgabe:**
- „Verbindung: OK“, Modell, Include-Body-Schlüssel und `reasoning_effort`;
- „Testaufruf: OK …“ und „Bereit für S0“.

**Abweichungen:**
- SillyTavern läuft nicht auf `http://127.0.0.1:8000`: überall `--st-url http://127.0.0.1:<PORT>` anhängen.
- Soll ein Connection Profile gelten: `--profile "<Name>"`.

### 3.3 Weg A (Rückfall): Umgebungsvariablen nur für diese Sitzung

**Die Werte:**
- **Endpoint** und **Modell** stehen in SillyTavern unter API Connections → Custom: „Custom Endpoint (Base URL)“, z. B. `https://…/v1`, und „Model ID“, im Lauf `zai-org/GLM-5.3-Flash`.
- **Der Key:** SillyTavern zeigt ihn nur maskiert an. Nimm ihn aus deinem Provider-Konto (Seite „API Keys“). Technisch steht er auch in `SillyTavern\data\default-user\secrets.json`; diese Datei nur lokal öffnen und nie weitergeben.

**Setzen, nur für dieses PowerShell-Fenster:**

```powershell
$env:AVERETH_AB_API_BASE = "<DEINE_API_BASE_URL>"
$env:AVERETH_AB_MODEL = "zai-org/GLM-5.3-Flash"
$env:AVERETH_AB_EXTRA_BODY = '{"reasoning_effort":"low","clear_thinking":true}'
$sec = Read-Host "API-Key (Eingabe bleibt unsichtbar)" -AsSecureString
$env:AVERETH_AB_API_KEY = [System.Net.NetworkCredential]::new('', $sec).Password
Remove-Variable sec
```

- Der Key wird nicht angezeigt und nicht in der PowerShell-Historie gespeichert. Die Historie enthält nur die `Read-Host`-Zeile.
- `$env:`-Variablen verschwinden, wenn das Fenster geschlossen wird.
- Nie `$env:AVERETH_AB_API_KEY = "sk-…"` tippen: Diese Zeile landet in der Historie.

**Prüfen, ohne den Key zu zeigen:**

```powershell
if ($env:AVERETH_AB_API_KEY) { "Key gesetzt, Länge $($env:AVERETH_AB_API_KEY.Length)" } else { "Key NICHT gesetzt" }
node tools/p0/check.mjs --backend direct --ping
```

An jeden Befehl in §4–§6 dann `--backend direct` anhängen.

**Optional `.env`:** Node ≥ 20.6 liest sie mit `node --env-file=.env …`. `.env` ist per `.gitignore` ausgeschlossen. Die Sitzungsvariablen sind trotzdem besser: Eine Datei bleibt auf der Platte.

### 3.4 Die Spikes

```powershell
cd "<DEIN_REPO_PFAD>\avereth-engine"
node tools/p0/s0_structured.mjs
node tools/p0/s1_interpreter.mjs
node tools/p0/s2_deltas.mjs
node tools/p0/s3_prototype.mjs
node tools/p0/report.mjs
```

**Kürzere Varianten:**
- `s1_interpreter.mjs --sample 80` misst eine geschichtete Stichprobe.
- `s2_deltas.mjs --variant a` und später `--variant b` teilen S2 in zwei Läufe. Das Werkzeug führt beide Ergebnisse zusammen und entscheidet, sobald beide da sind.
- `--runs V12,V11` beschränkt S2 auf zwei Läufe.

**Probeläufe ohne Aufruf:** `--dry-run` zeigt Anfragen und Größen.

### 3.5 Zurückschicken

**Eine Datei:** `<DEIN_REPO_PFAD>\avereth-engine\p0_out\P0_ERGEBNIS.md`, erzeugt von `report.mjs`.
- Sie enthält nur Zusammenfassungen und Entscheidungen.
- Keine Keys, keine Header, keine Endpoint-URL, keine Rohantworten.

**Optional für die Detailanalyse:** `p0_out\s1\results.json` und `p0_out\s2\b.json`.
- Sie enthalten Modellantworten, aber keine Keys oder Header; die Werkzeuge prüfen das vor dem Schreiben.

**Nicht** schicken:
- Screenshots der API-Einstellungen;
- `secrets.json`;
- `settings.json`;
- die SillyTavern-Konsole.

### 3.6 Aufräumen

```powershell
Remove-Item Env:AVERETH_AB_API_KEY, Env:AVERETH_AB_API_BASE, Env:AVERETH_AB_MODEL, Env:AVERETH_AB_EXTRA_BODY, Env:AVERETH_ST_URL -ErrorAction SilentlyContinue
Clear-History
```

Danach das PowerShell-Fenster schließen. Weg B braucht kein Aufräumen: Der Key war nie außerhalb von SillyTavern. `p0_out\` ist von Git ausgeschlossen und darf bleiben oder gelöscht werden.

---

## 4. S0 Structured Output

**Frage (Plan §4.3, §10):** Nutzen Interpreter, Recovery-Extraktor und Board-Generator `json_schema` oder JSON per Anweisung (Modus C)? Und lässt sich Reasoning für diese Aufrufe abschalten?

**Vorab (3–4 Aufrufe):**
1. Verbindung.
2. `reasoning_effort: none`, bei Ablehnung `minimal`. Über SillyTavern ändert das Werkzeug dafür nur diesen einen Schlüssel in einer Kopie der Include Body Parameters, ohne ihn zu duplizieren (SillyTavern verwirft sonst den ganzen Text).
3. Ein `json_schema`-Probeaufruf.

**Modi** (je 10 Fälle × 3 Wiederholungen = 30 Aufrufe, wie im Plan):

| Modus | Schema | Reasoning |
|---|---|---|
| `schema_keep` | `json_schema` (strict) | wie konfiguriert |
| `schema_off` | `json_schema` | Override |
| `plain_keep` | Schema als Text im Prompt | wie konfiguriert |
| `plain_off` | Schema als Text im Prompt | Override |

- Lehnt der Provider etwas ab, wählt das Werkzeug die passenden Modi selbst.
- `--modes` legt sie fest (etwa `--modes plain_keep`).
- Ein Modus, der dreimal nur Fehler liefert, wird abgebrochen.
- **Korrektur nach P0 (P0_BERICHT §3, §7):** Die erste Fassung ließ `plain_keep` weg. Damit waren Format und Reasoning vermischt, und die gewählte Kombination blieb ungemessen. Jetzt laufen alle vier.
  - `decide` vergleicht das Format bei gleichem Reasoning und das Reasoning im gewählten Format.
  - Eine ungemessene Wahl meldet es ausdrücklich (`chosen_measured: false`).
  - „Nicht gemessen“ heißt nie mehr „abgelehnt“.

**Die 10 Fälle** (`tools/p0/s0_cases.mjs`) sind kleine Fassungen echter V4-Aufrufe aus dem Lauf 07:10:
- Modus-Klassifikation;
- 5 Interpreter-Fälle: Gildenweg; Abgabe + Gasthaus; Gedanke ohne Befehl; Preisgrenze; Sammeln bis Tagesende;
- 3 Extraktor-Fälle: Ankunft Reedbeds; Ossler nicht anwesend; Gasthaus-Angebot + Overreach;
- ein Board-Generator-Fall (2 Listings).

Jeder Fall hat ein striktes Schema, eine Inhaltsprüfung und eine Gold-Antwort.

**Messung je Modus:**
- Fehler;
- gültig im 1. Versuch;
- reines JSON (ohne Aufräumen);
- gültig nach Reparatur;
- inhaltlich richtig;
- p50/p90;
- Prompt-, Output- und Reasoning-Token;
- abgeschnittene Antworten;
- das Ganze auch nach Rolle.

**Entscheidung** (`decision.json`):

| Wahl | Bedingung |
|---|---|
| Reasoning aus | So zuverlässig wie mit Reasoning (Fehler, Gültigkeit, Inhalt je höchstens 5 Punkte schlechter) **und** p50 mindestens 15 % schneller oder höchstens halb so viele Reasoning-Token bzw. -Zeichen |
| `json_schema` | Fehlerquote ≤ 5 %, gültig im 1. Versuch ≥ 95 %, nicht schlechter als JSON per Anweisung (≤ 2 Punkte Gültigkeit, ≤ 5 Punkte Inhalt) |
| sonst | JSON per Anweisung mit Reparatur |

Das Gate „p50 ≤ 6 s“ misst S1 mit dem echten Interpreter-Prompt.

---

## 5. S1 Interpreter

**Frage (Plan §4, §11.2, §11.7):** Wie genau übersetzt ein Interpreter-Prompt Spielertexte in Befehle? Vor allem: wie selten erfindet er eine Handlung (falsche Agency)?

**Prompt** (`tools/p0/lib/interpreter.mjs`):
- **Grundlage:** das Entwurfs-Vokabular `tools/p0/draft/commands.json` (19 Befehle, Regeln, Beispiele).
- **Aufbau:** Regeln und Vokabular stehen im System-Prompt, dazu vier kurze Beispiele aus einer anderen Stadt; Katalog und Spielernachricht im User-Teil. Mit `--no-examples` fallen die Beispiele weg.
- **Größe:** ≈ 1,5–1,6k Token, wie im Plan geschätzt.
- **Schema:** Die Befehle bilden eine diskriminierte Union; die Referenzen sind Enums aus dem Katalog der Szene oder `{new: …}`.
- **Modus C:** Statt des ganzen Schemas steht nur eine kurze Formatzeile im Prompt; geprüft wird lokal gegen das volle Schema.

**Korpus v0** (`tests/eval/commands.jsonl`, Szenen in `tests/eval/scenes.json`): 256 Fälle, davon 87 ohne Befehl.
- **88 echte Spielernachrichten** aus den Läufen V2–V12, mit Tippfehlern.
- **168 synthetische Fälle:**
  - Positive: jede der 19 Befehlsarten; Präteritum, Mehrfachhandlungen, Preisgrenzen, „any price“, Referenzen bei einem und bei zwei aktiven Verträgen, „the Guild“ → Gildenhalle, erledigte Quest.
  - Negative: Frage, Gedanke, Hypothese, Plan, Erinnerung, Verneinung, vom Spieler geschriebene NPC-Handlung, zitierte Rede.
- **Neutrale Fälle** (`allow`): Handlungen, die beide Lesarten tragen, etwa „sword ready“ als `equip`. Sie gelten nicht als falsch, zählen aber auch nicht als nötig.

**Messung** (`tools/p0/lib/score.mjs`):

| Kennzahl | Bedeutung | Schwelle |
|---|---|---|
| **Präzision auf Negativfällen** | Anteil der Fälle ohne Befehl, in denen kein unerlaubter Befehl entsteht | **≥ 98 %** |
| **Recall** | Anteil der Gold-Befehle mit richtigem Typ **und** richtigen Argumenten | **≥ 90 %** |
| **p50 Latenz** | Median des ersten Versuchs | **≤ 6 s** |
| Recall nur Typ, Präzision aller Befehle, exakte Fälle | Zusatz | – |
| Falsche Befehle / davon Festlegungen | pay, buy, accept, turn in … an Stellen, wo der Spieler nichts entschied | – |
| Reihenfolge, Referenzauflösung | bei Mehrfachhandlungen bzw. Referenz-Argumenten | – |
| Fehler pro Befehlstyp | Gold, richtig, falsches Argument, fehlt, falsch erzeugt | – |
| Negativfälle nach Art, echt vs. synthetisch | Aufschlüsselung | – |

`summary.md` listet jede Abweichung mit Text und Befehlen.

---

## 6. S2 World-Delta-Strategie (A gegen B)

**Frage (Plan §5.6, D2):**
- **Variante B:** Der Erzähler schreibt den kleinen Delta-Block selbst, Recovery nur bei Bedarf.
- **Variante A:** Nach jeder Antwort extrahiert ein eigener Aufruf.

**Daten:**
- **Züge:** 41 aufgezeichnete Story-Züge aus 5 Läufen (`tests/eval/deltas.jsonl`):
  - V8: 26.09. 23:09;
  - V9: 01:19;
  - V10: 02:30;
  - V11: 04:11;
  - V12: 07:10.
- **Zu jedem Zug:**
  - Spielernachricht;
  - V4-PLAYER-ACTIONS;
  - Katalog;
  - aufgezeichnete Prosa ohne alten Report;
  - Gold: 25 Erwartungsfelder, 63 kritische Deltas, 113 verbotene Deltas;
  - der vollständige aufgezeichnete Erzähler-Prompt (`tests/eval/s2_requests.json`, dedupliziert).
- **Bereinigung:** Der Persona-Text ist durch einen neutralen Satz ersetzt. Der Datensatz enthält keinen Megumin-Text.

**V4-Prompt** (`v4Messages`):
- Im Vertrag wird der alte Fact-Report durch den `<avereth>`-Block ersetzt.
- Im Engine-Block entfallen CORRECTIONS sowie RESOLVED/FACT REPORT. An ihre Stelle treten PLAYER ACTIONS, der CHECK DIE des Laufs und WORLD DELTAS aus `tools/p0/draft/deltas.json`.
- Die Schlussanweisung verlangt den Block.
- Der Lore-Hinweis zum alten Report ist angepasst.

**Drei Messungen:**

| Teil | Was | Aufrufe | misst |
|---|---|---|---|
| **A** | Recovery-Extraktor liest die aufgezeichnete Prosa | 41 | Gültigkeit, Vollständigkeit, semantische Genauigkeit gegen Gold, Token, Latenz |
| **B-gen** | Erzähler schreibt Prosa + Block mit dem V4-Prompt (Parameter der Läufe: temperature 0.9, top_p 0.95, max 4096); fehlt/ungültig/unvollständig → Recovery | 41 + r × 41 | **Block gültig und vollständig**, Recovery-Quote r, Recovery-Erfolg, Erzähler-Token und -Latenz, Blockgröße |
| **B-block** | Derselbe Erzähler schreibt im eigenen Kontext nur den Block zur *aufgezeichneten* Prosa | 41 | semantische Genauigkeit von B, direkt vergleichbar mit A (gleiche Prosa, gleiches Gold) |

- Mit `--agreement` extrahiert S2 zusätzlich B-gens eigene Prosa. Das kostet einen Aufruf je Zug und ergibt einen Übereinstimmungswert.
- **Semantische Genauigkeit** wird je Gold-Element gerechnet: Jedes Erwartungsfeld und jedes kritische Delta zählt einmal, ein verbotenes Delta als Fehler. Zum Vergleich steht das Mittel je Zug daneben.
- **Korrektur nach P0 (P0_BERICHT §4):**
  - Ein Zug ohne Gold-Element zählte im Mittel je Zug als 100 %. Jetzt steht daneben das korrigierte Mittel ohne solche Züge (`semantic_v2`).
  - Deltas, die kein Gold-Element bewertet, werden gezählt (`extraneous`).
  - `runB` ruft B-gen und B-block nacheinander auf, nicht mehr gleichzeitig.
  - Der Extraktor-Prompt nennt die schema-relevanten Regeln (FORMAT RULES).
- **Global verboten:** ein `quest.offer` mit Gilde, Brett, Schalter oder Clerk als Geber (D3).

**Entscheidung** (`decision.json`, Regel §5.6):
- **B**, wenn der Block in ≥ 80 % der B-gen-Antworten gültig und vollständig ist **und** B-blocks semantische Genauigkeit höchstens 5 Punkte unter A liegt;
- sonst **A**.

Dazu rechnet S2 aus den Messwerten Token je Zug sowie blockierende und Hintergrund-Latenz beider Varianten hoch (wie Plan §9).

**Einschränkung:** Der Zustandskopf der aufgezeichneten Engine-Blöcke stammt aus 3.1.x (etwa RELEVANT-Zeilen). PLAYER ACTIONS und der Block sind V4. Für die Frage „schreibt der Erzähler den Block zuverlässig und richtig“ ist das tragbar. Den Golden-V4-Test ersetzt es nicht.

---

## 7. S3 Domänen-Prototyp (V12-Pfad)

**Frage (Plan §16 S3, §11.1):** Tragen die geplanten Domänengrenzen den kritischen Pfad des Laufs 07:10? Der Pfad reicht von Gildenhalle, Registrierung und Brett über Miller's Run, Herb Run, Reedbeds, Sammeln, Rückkehr, Beweis, Abgabe und Auszahlung bis zum Gasthaus-Angebot ohne automatischen Kauf.

**Gold-Daten** (`tests/testrun_v12/gold_v4.json`) für die 8 Züge. Je Zug:
- Befehle;
- Auflösungen;
- PLAYER-ACTIONS-Kernsätze;
- Erwartungsschlüssel;
- Gold-Block (B);
- Gold-Recovery (A, andere Formulierungen und Referenzen);
- erwartete Events;
- Zustandsauszüge.

Dazu der Aushang (5 Listings) und Varianten.

**Das Fixture:** `tests/testrun_v12/fixture.json` enthält den Lauf mit den unveränderten 3.1.7-Antworten.

**Prototyp** (`tools/p0/s3_prototype.mjs`, zum Wegwerfen): ein kleines Domänenmodell mit Befehlshandlern, schrittweiser Delta-Anwendung und Board-Generator. Es spielt beide Pfade ab. Geprüft werden:
- Gold-Auflösungen, PLAYER ACTIONS, Events (B, in Reihenfolge) und Zustand je Zug, für A und B;
- die **12 Erwartungen** aus Plan §11.1;
- Registrierung pending → bezahlt (Canon 20 cp), auch per `pay`;
- Gildenhalle: Abgabe draußen `refused`, mit `go` `conditional`; keine Ankunft → nichts abgegeben;
- fehlendes Erwartungsfeld → unvollständig;
- **Generator-Ausfall** (Rev. 2.1): kein Listing, `BOARD GENERATION FAILED`, „invent none“, Prosa-Verträge nur als `overreach guild_listing`, `quest.offer` der Gilde abgelehnt;
- Endzustand: Tag 1 18:45, 70 cp, 15 XP, Marsh Bell unter Redmarch, Miller's Run aktiv mit offenem Beweis;
- A und B ergeben nach jedem Zug denselben Zustand.

**Ergebnis:** **36 von 36 Prüfungen erfüllt.** Verfälschte Gold-Daten lassen die passenden Prüfungen scheitern, etwa Zeit über dem Deckel, fehlendes `take`, Ossler anwesend oder eine Auszahlung per `coin.gift`. Das sichert `tests/p0/p0_spikes.test.js` ab.

---

## 8. Was P0 schon ergeben hat

**Korrekturen und Präzisierungen am Plan**, aus S1 und S3; vor P1 zu bestätigen:

| # | Befund | Folge |
|---|---|---|
| 1 | **Befehle `drop` und `use` fehlen in §4.1.** Kein Delta darf Alarics Besitz bewegen oder verbrauchen, also brauchen „leave the heads on the floor“ (V11) und Tränke bzw. Rationen Befehle | im Entwurfs-Vokabular ergänzt (19 Befehle) |
| 2 | **Anwesenheit bei Rückkehr** (§6.2): Die Ankunft leert die Szene; wer da ist, meldet der Block (`enter`/`person.new`). Sonst würde Kulisse (der Abenteurer aus Antwort 10) bei der Rückkehr wieder anwesend | Regel im Prototyp |
| 3 | **IDs neuer Personen** aus Name oder Rolle, nicht aus dem `ref` des Blocks. Nur so ergeben Block und Recovery dieselben IDs | Regel im Prototyp |
| 4 | **Erwartungsfeld für `buy`/`pay` pending:** `{priced}` statt `{offer: …}` (§5.3); die Preise stehen im `offer`-Delta | Entwurf `deltas.json` |
| 5 | **Abgabe eines erledigten Vertrags** = `refused` („NOTHING TO DO“) | Regel im Prototyp |
| 6 | **`pay` bei offener Registrierung** = Annahme der Canon-Gebühr | Regel im Prototyp |
| 7 | **Auszahlung** bei der bedingten Abgabe mit der Ankunft; ein `coin.gift` der Gilde (oder des Auftraggebers als Vertragslohn, V11) wird abgelehnt bzw. ist in S2 verboten | Prototyp, S2-Gold |
| 8 | **Aushang schon bei Ankunft** in der Halle, auch vor der Registrierung (Novice); lesen darf jeder, annehmen nur ein Mitglied | Prototyp |
| 9 | **`quest.close`** ergänzt (§5.1 kannte es, der Entwurf nicht); ein Gildenvertrag schließt nie per Delta als erledigt | Entwurf `deltas.json` |
| 10 | **Recovery-Grund:** Ein fehlendes Erwartungsfeld macht den Block *unvollständig*, nicht *ungültig* (§3.4); der Validator trennt das | `checkBlock` |
| 11 | **Modus C:** kurze Formatzeile statt Schema-Text im Prompt. Das spart beim Interpreter ≈ 2k Token je Aufruf | S1-Prompt |

**Gemessen am 27.09.2026** (Einzelheiten und Korrekturen: [P0_BERICHT.md](P0_BERICHT.md)):
- S0: JSON per Anweisung, Reasoning wie konfiguriert (low). `json_schema` wird angenommen, aber nicht erzwungen.
- S1: Negativ-Präzision 93,1 % (Gate ≥ 98 %: nicht bestanden), Recall 94,2 %, p50 3,7 s.
- S2: D2 = A.
- S3: 36/36.

---

## 9. Dateien

| Datei | Inhalt |
|---|---|
| `tools/p0/check.mjs` | Verbindungsprüfung, zeigt nie den Key |
| `tools/p0/s0_structured.mjs`, `s0_cases.mjs` | S0 |
| `tools/p0/s1_interpreter.mjs` | S1 |
| `tools/p0/s2_deltas.mjs` | S2; nach P0 mit `--variant a --vocab v4` der Produktpfad (Extraktor `src/v4/extract.js` + Firewall `src/v4/firewall.js`) |
| `tools/p0/s3_prototype.mjs` | S3 (Wegwerf-Prototyp) |
| `tools/p0/s4_gm_tools.mjs` | S4 (02.10.2026, nur auf dem GM-Tools-Branch): der Erzähler mit den GM-Tools (Prototyp B) auf dem S1-Korpus, mit `--compare p0_out/s1/results.json` neben dem Interpreter; Anleitung `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §11.1 |
| `tools/p0/report.mjs` | Ergebnisse bündeln |
| `tools/p0/rescore.mjs` | gespeicherte Antworten offline neu auswerten (korrigiertes Scoring, Agency-Guard und Firewall des Produkts), ohne Aufrufe; schreibt `p0_out/rescored/` |
| `tools/p0/lib/provider.mjs` | Backends SillyTavern, direct, mock (seit S4 auch `tools`/`tool_choice` hin und die Tool-Aufrufe der Antwort zurück) |
| `tools/p0/lib/structured.mjs` | strukturierter Aufruf, Reparatur, Transport-Retry |
| `tools/p0/lib/schema.mjs` | strikter Schema-Dialekt |
| `tools/p0/lib/interpreter.mjs`, `score.mjs` | Interpreter-Prompt, -Schema, Bewertung |
| `tools/p0/lib/deltas.mjs` | Delta-Schema, Blockanweisung, Recovery-Prompt, Block-Prüfung, Gold-Vergleich |
| `tools/p0/lib/util.mjs` | Argumente, JSON, Statistik, Secret-Schutz |
| `tools/p0/draft/commands.json`, `deltas.json` | Entwürfe des Befehls- und Delta-Vokabulars (P1/P3 übernehmen sie nach `content/`) |
| `tests/eval/commands.jsonl`, `scenes.json` | S1-Korpus |
| `tests/eval/deltas.jsonl`, `s2_requests.json` | S2-Datensatz |
| `tests/testrun_v12/fixture.json`, `gold_v4.json` | Lauf 07:10 und V4-Gold (S3, später Golden-V4-Test) |
| `tests/p0/*.test.js`, `mock_openai.mjs` | Offline-Tests, Mock-Provider |

---

## 10. Prüfung der Werkzeuge

**`npm test`:** 315 Tests, grün, davon 24 neue in `tests/p0/`. Sie laufen ohne Netz und prüfen:
- Secret-Schutz;
- Include-Body-Bearbeitung;
- Schema-Dialekt;
- Reparatur- und Transport-Retry;
- das direkte Backend gegen einen lokalen Mock: Key nur im Header, nie in Fehlern oder Dateien;
- das SillyTavern-Backend gegen einen nachgebauten ST-Server: CSRF, Cookie, Einstellungen, Profil, klare Fehlermeldungen;
- alle Gold-Daten (schema-gültig, erfüllbar);
- die Entscheidungsregeln von S0 und S2;
- S1-Gates mit perfektem und fehlerhaftem Mock;
- S3 mit verfälschten Gold-Daten.

**End-to-End mit echtem SillyTavern 1.19:** SillyTavern lief mit der Quelle Custom, gerichtet auf einen lokalen Mock-Provider. Der Mock verlangte einen Key, der nur in den ST-Secrets stand. Nacheinander liefen `check --ping`, S0 (1 Wiederholung), S1 (25 Fälle), S2 (3 Züge, A und B), S3 und `report`. Ergebnis:
- Alle 68 Provider-Anfragen trugen den Key aus SillyTavern; die Werkzeuge kannten ihn nicht.
- 49 Anfragen trugen `response_format: json_schema`.
- `reasoning_effort` kam 18× als konfiguriertes „low“, 50× als Override „none“.
- Die Erzähler-Aufrufe kamen mit den Laufparametern (0.9 / 0.95).
- Kein Key in Ausgaben oder Konsole.
