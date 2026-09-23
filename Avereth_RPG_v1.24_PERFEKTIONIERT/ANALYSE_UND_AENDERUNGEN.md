# Avereth RPG v1.24: Analyse und Änderungen

Stand: 23.09.2026 · Paket **Avereth RPG v1.24** · Grundlage: `Avereth_RPG_Test_Baseline_v1.23.zip` und die beiden Chat-Exporte
`JSON Kontext prüfen.json` (203 Nachrichten) und `Kontext Migration Zusammenfassung.json` (12 Nachrichten).

## Kurzfassung

- **Ergebnis:** Alle fünf JSON-Dateien aus dem ZIP liegen als überarbeitete Endfassung vor. Dazu kommen die
  Character Description (für die in Chat 2 vorgeschlagene PC-State-Delta-Regel) und die DEBUG_CALC-WorldInfo, die im ZIP
  fehlte. Die Originale sind unverändert.
- **Fixes aus dem v1.23-Testlauf (Chat 2) sind umgesetzt:**
  - Ambush-Crit +25pp steht jetzt direkt in START.
  - Schaden rechnet DEF vor der Varianz, als ausgeschriebene Formel.
  - Alaric bekommt keine erfundenen Zusatzhandlungen mehr (Anschleichen, Hinlaufen, Nachladen).
  - Erzählte Tarnung gibt keinen mechanischen Vorteil.
- **Die schlanke v1.24A-Architektur aus Chat 2 ist umgesetzt, ohne Balance- oder Lore-Änderung:**
  - 67 → 61 WorldInfo-Einträge; der Weltinhalt ist unverändert.
  - Fünf byte-identische Referenz-Caches und der Debug-Eintrag sind entfernt.
  - Die drei wörtlichen Klassenkopien sind durch eine generierte, feldweise geprüfte Aktionstabelle ersetzt.
  - Werte und Kosten sind unverändert.
- **Neu gefundene Fehler sind behoben**, u. a.:
  - vertauschte Schlüssel in Core #27–#29;
  - die Munitionsregel fehlte in der Laufzeit ganz;
  - „Combat: ACTIVE (Pending XP 10)“ lud das falsche Kampfmodul;
  - eine Quest-Zeile „Status: ACTIVE“ lud die ACTIVE-Kampf-Engine;
  - „I pay the charge“ und „bite of bread“ luden die Kampfstart-Engine;
  - „character creation“ im Text konnte einen laufenden Kampf kapern;
  - veraltete Texte in System.
- **Aktivierung (simuliert mit einem Nachbau des SillyTavern-Matching-Codes):**
  - 30 Chat-Szenarien: v1.22 besteht 12, die neue Fassung alle 30.
  - Natürliche Angriffsformulierungen: v1.22 erkennt 25 von 41, neu 40 von 41.
  - Redewendungen, die fälschlich einen Kampf laden: v1.22 12 von 26, neu 2 von 26.
- **Weniger Kontext pro Zug:** ein normaler Erkundungszug lädt 4.061 statt 4.459 Zeichen. Ein Zug mit
  „Combat: ACTIVE (Pending XP 10)“ lädt 8.223 statt 20.334 Zeichen, weil vorher fälschlich START lud.
- **Validierung:** 79 von 79 automatischen Prüfungen, 234 von 234 Regex-Tests, Build deterministisch und reproduzierbar
  (`tools/`).

## Lieferumfang und Import

Alle Dateien liegen im Ordner `Avereth_RPG_v1.24_PERFEKTIONIERT/`. Die Dateinamen folgen der Vorgabe
`originalname_PERFEKTIONIERT`, die interne Version steht in den Metadaten:

| Datei | interne Version | ersetzt | Verwendung |
|---|---|---|---|
| `Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json` | WorldInfo **v1.23** | WorldInfo v1.22 | **in SillyTavern importieren** (Standard) |
| `Avereth_RPG_WorldInfo_4096_v1.22_DEBUG_CALC_PERFEKTIONIERT.json` | WorldInfo **v1.23-debugcalc** | `…_DEBUG_CALC.json` (im ZIP nicht enthalten) | nur für Diagnose-Läufe, **statt** der Standard-WI |
| `Avereth_RPG_Character_Description_v2.2_PERFEKTIONIERT.txt` | Character Description **v2.3** (Paketbezeichnung; die Datei hat keine Versionszeile) | CD v2.2 | als Charakterbeschreibung einsetzen |
| `RPG_Core_Mechanics_v1.20_PERFEKTIONIERT.json` | Core **v1.21** | Core v1.20 | Autorenquelle, nicht zusätzlich importieren |
| `RPG_Content_v1.12_PERFEKTIONIERT.json` | Content **v1.13** | Content v1.12 | Autorenquelle, nicht zusätzlich importieren |
| `RPG_Lore_v0.7_PERFEKTIONIERT.json` | Lore **v0.8** | Lore v0.7 | Autorenquelle, nicht zusätzlich importieren |
| `RPG_System_v1.11_PERFEKTIONIERT.json` | System **v1.12** | System v1.11 | Autorenquelle, nicht zusätzlich importieren |
| `ANALYSE_UND_AENDERUNGEN.md` | – | – | dieser Bericht |
| `tools/` | – | – | Build- und Prüfskripte (siehe `tools/README.md`) |

Unverändert und weiter gültig: `RPG_First_Message_v0.4.txt`, `Avereth_Megumin_NPC_Prompt_Patch_v1.3.txt`,
`Avereth_Runtime_Recommendations_v1.23.txt` (alle Einstellungen gelten weiter), Megumin-Konfiguration.

**Import in SillyTavern**
1. Die bisherige Avereth-WorldInfo deaktivieren oder entfernen. Dann `Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json`
   importieren.
2. Die Charakterbeschreibung durch den Inhalt von `Avereth_RPG_Character_Description_v2.2_PERFEKTIONIERT.txt` ersetzen.
3. Core, Content, Lore und System **nicht** als eigene WorldInfos laden. Die WorldInfo enthält bereits alles, was zur
   Laufzeit gebraucht wird; doppelt geladene Einträge würden Budget verbrauchen und sich widersprechen.
4. Für einen Diagnose-Lauf die DEBUG_CALC-Variante **statt** der Standard-WI importieren, nie beide gleichzeitig.
   Der Test-Setup v2.6 nennt noch den alten Dateinamen `…_DEBUG_CALC.json`; gemeint ist jetzt
   `…_DEBUG_CALC_PERFEKTIONIERT.json`.
5. Einstellungen wie bisher:
   - Scan Depth 2, Context 25 %, Budget Cap 0, Recursive Search AUS
   - Match Whole Words AN, Case Sensitive AUS, Group Scoring AUS, Overflow-Alert AN, „Character Lore First“
   - `reasoning_effort: high`, `clear_thinking: true`

---

## 1. Projektverständnis

**Was Avereth ist.** Avereth ist ein textbasiertes Progression-Fantasy-Rollenspiel für **SillyTavern**. Es läuft mit
**GLM-5.3-Flash** (Reasoning-Modell), dem **Megumin-Suite-Preset** als Host (Tracker, Formatierung, NPC-Bank) und dem
optionalen NPC-Prompt-Patch. Die Spielfigur ist **Alaric**, ein nach Avereth versetzter Mensch. Er startet auf Level 1,
Rang F, alle sechs Werte 5, ohne Klasse. Die Klasse und zwei Skills wählt er in einer zweistufigen Charaktererstellung.
Das Test-Setup v2.6 sieht einen Ranger mit Aimed Shot und Power Shot gegen einen F1-Keiler vor.

**Modulaufbau (source-first, seit Chat 1, Nachricht 4–5 verbindlich).**

| Modul | Rolle |
|---|---|
| **Core** | Mechanik: Werte, Formeln, Kampfablauf, XP, Munition, Range Bands |
| **Content** | konkrete Daten: Mensch, 5 Basisklassen mit je Basic Attack und 6 Skills, Starter-Kits, Monster-Anker F1 plus Skalierung, Elite/Boss, Ausrüstung, Evolutionen |
| **Lore** | Welt: 6 menschliche Reiche, 2 Monster-Reiche, Währung, Gilde, Material- und Alltagskultur |
| **System** | private UI-Semantik: #-Befehle, Charaktererstellung, Snapshot-Persistenz, Debug-Modus |
| **Character Description** | Verhalten des Erzählers: Handlungshoheit des Spielers, Gedanken-Firewall, NPC-Eigenständigkeit, Kampf-Erzählfokus |
| **First Message** | Startsituation und Creation Schritt 1/2 |
| **WorldInfo** | aus den vier Quellen kompilierte Laufzeitfassung; nur sie wird importiert |

Änderungen gehören immer zuerst in die Quelle. Danach wird die WorldInfo neu kompiliert.

**Laufzeitarchitektur der WorldInfo (seit v1.20/v1.21).**
- Genau **ein** konstanter Eintrag, der Kernel. Er wird immer geladen, auch über dem Budget.
- Vier sich gegenseitig ausschließende Phasen-Engines in der Inclusion Group `AVERETH_RUNTIME_PHASE`: Creation (1003)
  vor ACTIVE (1002) vor PENDING (1001) vor START (1000). Die höchste Ordnung gewinnt.
- Dazu schlüsselwortgesteuerte Detail-, Klassen-, System- und Lore-Einträge.
- Der Kampf ist eine Zustandsmaschine INACTIVE → (PENDING) → START/Initialisierung → ACTIVE → Kampfende.
- Jeder Kampfteilnehmer hat einen FIXED-Snapshot (fest) und einen CURRENT-Snapshot (laufend). Beide werden vor jeder
  Erzählung festgeschrieben und in jedem Zug unverändert weitergereicht.
- Monster haben Direktwerte. DefeatXP wird beim Kampfstart fixiert. XP werden erst am Kampfende einmalig vergeben.

**Host-Unabhängigkeit (Nutzerentscheidung, Chat 1 Nachricht 142–145 und 202).** Avereth definiert nur Zustände und
Ergebnisse. Das Format bestimmt der Host: Megumin rendert zum Beispiel `**Combat:** ACTIVE`. Keine Datei darf
Tracker-Formate, Tags oder Blockreihenfolgen vorschreiben.

**Randbedingungen.**
- 32k Kontext bei 25 % WorldInfo-Anteil ergibt rund 8.192 Token WI-Budget.
- Die Ausgabe ist auf 4.096 Token begrenzt; die „4096“ im WI-Namen bezeichnet diese Antwortlänge, nicht das Budget
  (Chat 1, Nachricht 180–181).
- Scan Depth 2 (neueste Nutzer- und letzte Modellnachricht), keine Rekursion.

**Ziel dieser Arbeit.** Die v1.24A-Blaupause aus Chat 2: „Architektur-Refactor mit identischem Gameplay“, also schlanker,
ohne doppelte Inhalte, mit weniger lexikalischen Fehlauslösern. Dazu die Korrekturen aus dem v1.23-Testlauf und alle
weiteren Fehler, die bei der Analyse auffielen. Klassen-, Skill-, Monster- und XP-Balance, Weltinhalt, NPC-Bank und
Megumin-Konfiguration bleiben unverändert (Blaupause §31).

## 2. Verwendete Ausgangsdateien

**Chat-Exporte** (ChatGPT-Exportformat; Nachrichtenbaum vollständig linearisiert und gelesen):

| Datei | Inhalt |
|---|---|
| `JSON Kontext prüfen.json` (700 KB, 203 Nachrichten) | Entwicklungschat von Baseline v1.5 bis v1.23. Er setzt einen früheren Chat mit 447 Nachrichten fort. Enthält alle Designentscheidungen, Testläufe und Nutzervorgaben. |
| `Kontext Migration Zusammenfassung.json` (166 KB, 12 Nachrichten) | Auswertung des v1.23-DEBUG-Testlaufs, Korrekturvorschläge (noch nicht angewendet), Recherche zu Zustandsminimalismus und WorldInfo-Architektur, v1.24A/B-Blaupause |

**ZIP `Avereth_RPG_Test_Baseline_v1.23.zip`** (14 Dateien). Die Zieldateien sind fett:

| Datei | Version | Umfang | Befund |
|---|---|---|---|
| **`RPG_Core_Mechanics_v1.20.json`** | Core v1.20 | 30 Einträge, 64.237 Zeichen Inhalt | überarbeitet → Core v1.21 |
| **`RPG_Content_v1.12.json`** | Content v1.12 | 12 Einträge, 24.307 Zeichen | überarbeitet → Content v1.13 |
| **`RPG_Lore_v0.7.json`** | Lore v0.7 | 19 Einträge, 12.939 Zeichen | nur Metadaten → Lore v0.8 (Welttext byte-identisch) |
| **`RPG_System_v1.11.json`** | System v1.11 | 15 Einträge, 21.758 Zeichen | überarbeitet → System v1.12 |
| **`Avereth_RPG_WorldInfo_4096_v1.22.json`** | WorldInfo v1.22 | 67 Einträge (uid 0–67 ohne 56), 136.711 Zeichen | neu kompiliert → WorldInfo v1.23 |
| `Avereth_RPG_Character_Description_v2.2.txt` | CD v2.2 | 14.432 Zeichen | nur Ergänzungen → CD v2.3 (Chat-2-Vorschlag 3) |
| `RPG_First_Message_v0.4.txt` | FM v0.4 | – | unverändert; Creation-Labels geprüft |
| `Avereth_Megumin_NPC_Prompt_Patch_v1.3.txt` | NPC v1.3 | – | unverändert (Blaupause §31) |
| `Avereth_RPG_v1.23_Change_Log.txt`, `Avereth_v1.23_Validation_Report.txt`, `Avereth_WI_Activation_Audit_v1.23.txt`, `Avereth_Runtime_Recommendations_v1.23.txt`, `Avereth_Combat_Calculation_Debug_v1.23.txt`, `Avereth_New_Test_Run_Setup_v2.6.txt` | v1.23 / v2.6 | – | Begleitdokumente; als Soll-Beschreibung und Testorakel verwendet |

**Fehlende Datei.** Changelog, Debug-Vertrag und Test-Setup verweisen auf
`Avereth_RPG_WorldInfo_4096_v1.22_DEBUG_CALC.json`. Diese Datei ist im ZIP **nicht** enthalten. Sie wird jetzt aus der
Standard-WorldInfo und System #14 generiert.

## 3. Rekonstruierter Stand aus den Chats

### 3.1 Entwicklungslinie in Chat 1 (Baseline v1.5 → v1.23)

| Paket | Nachr. | Wesentliche Inhalte und Entscheidungen |
|---|---|---|
| Ausgang | 0–3 | Fortsetzung des Vorgängerchats. Stand: WI v1.5, CD v1.5, Core v1.5/1.6, Content v1.2/1.3, System v1.0, Lore v0.2. Stack: SillyTavern, GLM-5.3-Flash, Megumin, NPC-Bank. Vorbilder: Aethermere, Lyozes, Obsidian Summoner. |
| – | 4–5 | **Source-first** vereinbart: Quelle ändern, WI neu kompilieren. |
| v1.6 | 11 | Münzarithmetik ohne erfundenes Wechselgeld; ganze Münzen; Trigger-Bereinigung; kompakte exakte Mechanik aller 30 Skills |
| – | 44–45 | Basic Attack bleibt nach der Erstellung; Münzstand aus Transaktionen; Items erst nach echter Übergabe. Gebühren- und Ledger-Vorschläge **bewusst ignoriert**. |
| v1.8 | 58–59 | Basic Attack als echter Klassen-Skill (automatisch P1/PP0, zählt nicht zu den 2 Wahl-Skills); feste Resolver-Reihenfolge; Multi-Hit stoppt bei 0 HP |
| v1.9 | 60–61 | Zustandsmaschine COMBAT START → ACTIVE → END; ausstehende Spieleraktion; XP erst bei Kampfende; Loot verfügbar ≠ automatisch eingesammelt |
| v1.13 | 121–125 | Wildtier-Fallback im selben Zug; DEF = Basis + Ausrüstung; **Präzisionssperre** (keine Zwischenrundung); Combat Narrative Focus Lock (CD v1.7) |
| – | 130–131 | Jagdabsicht als Kampfstart: sinnvoll, aber **nicht übernommen** |
| v1.14 | 141 | Monte-Carlo-Prüfung; HP ≥ 1 voll handlungsfähig; Initiative fix; Nutzernachricht = nur Autorisierung eigener Aktionen |
| v1.15 | 142–145 | **Alle Format-Hardlocks entfernt** (Nutzer: Megumin besitzt das Format) |
| v1.16 | 146–150 | große Verschlankung: Content 107 → 12 Einträge; MaxHP-Formel; Monster = F1-Anker + Formeln; Lore ohne Mechanik |
| v1.17 | 151–161 | CD v2.0 zu schlank (Gedankenlesen) → CD v2.1 mit THOUGHT FIREWALL. Grundsatz: „CD schlank in Mechanik, nicht im Verhalten“ |
| v1.18 | 163–167 | alle nicht-sapienten Tiere = Monster mit Direktwerten; Combat-Gate (Jagen/Spuren/Zielen ≠ Kampf); NPC-Patch v1.3 |
| v1.19 | 170–177 | Resolver-Schleifen je Phase; FIXED+CURRENT-Snapshot; harte Ressourcensperre; Creation-Freeze; Scan Depth 2 |
| – | 180–183 | „4096“ = Antwortlänge (Umbenennung in 6144 zurückgenommen); Budgetwarnung → **ein** kleiner Kernel + **ein** Resolver je Phase; Context % nicht erhöhen |
| v1.20 | 184–185 | ein konstanter Kernel; Phasengruppe; **Monster-Eintrag nur bei expliziten Phrasen, nicht bei Tiernamen**; sticky 0 |
| v1.21 | 189 | Phasenordnung Creation 1003 > ACTIVE 1002 > PENDING 1001 > START 1000; PENDING-Phase für NPC-Angriffe ohne geladenes START; `reasoning_effort` high |
| – | 192–193 | Nutzer: westliche Fantasy + Mittelalter + Mana; **STA fest 100**, alle physischen Angriffe kosten STA; S-Rang-Lore weggelassen |
| – | 195–196 | v1.21-Test: Megumin rendert `**Combat:** PENDING` → tolerante Trigger nötig. Nutzer **lehnt** „nie Ziel ableiten“ ab: ein einzelner Gegner darf Standardziel sein. Monster-Zeilen eindeutig, eine pro Zeile. |
| v1.22 | 196–199 | Range Bands ENGAGED < SHORT < MEDIUM < LONG; 1 Band Bewegung pro Zug; Basic Attack 5 STA; **keine Neubewertung der Skillkosten**; NPC DECISION LOCK |
| **v1.23** | 201–203 | Test v1.22: Snapshot fehlte, Bandsprung, Frührundung, improvisierte XP, Creation-Übergang → v1.23-Fixes; strikte Host-Unabhängigkeit; DEBUG-Testbuild. **Das ist der Stand im ZIP.** |

### 3.2 Chat 2: v1.23-Testlauf und v1.24-Blaupause

- **Testergebnis v1.23 (DEBUG-Lauf, Nachricht 5).**
  - PASS: Erstellung, Übergabe nach Schritt 2, generische Ausrüstung, Combat Gate, START-Auslösung, Direktwerte Hirsch,
    Power Shot Raw 33.25, STA und Munition, DefeatXP.
  - FAIL:
    1. Das Debug-Audit wurde nicht ausgegeben.
    2. Der **Ambush-Crit (+25pp) fehlte**: START enthielt nur „True Ambush alone gets its Opening Action.“, und das
       Detail-Modul lud nicht.
    3. Latent falsche **Schadensreihenfolge** (erst Varianz, dann DEF).
    4. **PC-Agency:** eine erfundene Duck- und Schleichhaltung wurde für den Hinterhalt genutzt; nach dem Treffer lief
       Alaric ungefragt 30 Yards, stand auf und legte einen neuen Pfeil ein.
- **Vorgeschlagene Fixes (im Chat nicht mehr umgesetzt):**
  1. Vollständige Ambush-Regel in START.
  2. Schadensformel explizit mit DEF vor Varianz.
  3. PC STATE DELTA CHECK in CD v2.3.
  4. Kein mechanischer Vorteil aus erzählter PC-Haltung.
- **Recherche (Nachricht 6–11).**
  - Nur irreduzible Fakten persistieren, Zustände ableiten.
  - WorldInfo dient gleichzeitig als Datenbank, Regelmaschine, Router und Retrieval; das ist ein Architekturproblem.
  - Messung: 67 Einträge, 380 Schlüssel, 207 einwortige. 41.482 Zeichen (30,3 %) lassen sich verlustfrei entfernen
    (5 Referenz-Caches, 3 eingebettete Klassen-Caches, Debug-Eintrag, Ranger-Orakel, doppelte Kit-Liste).
- **Blaupause.**
  - **v1.24A jetzt:** WI deduplizieren, Mechanik als kompakte Datensätze, weniger lexikalische Trigger, Megumin bleibt
    Persistenz-Eigentümer, identisches Gameplay (§31).
  - **v1.24B später:** STscript-Projektor.
- **Fehler im Chat selbst (nicht übernommen, siehe Abschnitt 8):** Die Beispieldatensätze „AimedShot ATK+.75PER“,
  „TwinShot 2×(.65ATK+.45AGI)“ und „Wolf L2 HP34 ATK9 DEF1 Hit67 Init12 XP12“ widersprechen Content und Formeln.

### 3.3 Verbindliche Nutzerentscheidungen (in allen Dateien eingehalten)

1. Source-first: Quellen sind kanonisch, die WorldInfo wird kompiliert.
2. Host-Unabhängigkeit: keine Format-, Tag- oder Tracker-Vorgaben; Megumin besitzt das Format.
3. Einziger Gegner = erlaubtes Standardziel; bei 2+ Gegnern wählt der Spieler.
4. STA fest 100 für Menschen, Basic Attack 5 STA, bestehende Skillkosten bleiben.
5. Range Bands als Maximum, eine benachbarte Bandstufe pro normaler Bewegung.
6. Kampfstart nur bei unmittelbarer feindlicher Handlung, nicht bei Jagen, Spurensuche oder Zielen.
7. Monster-Eintrag nicht auf Tiernamen (v1.20).
8. CD bleibt verhaltensreich; Lore-Inhalt bleibt.
9. Dateiname behält „4096“.
10. Keine Neubewertung von Balance oder High-Rank-Design.

### 3.4 Abgleich Chat ↔ Dateien

- **Vorhanden im ZIP:** alle v1.23-Fixes (Snapshot, DefeatXP-Lock, Bandlogik, Präzision, Current-Actor-Lock,
  Creation-Übergang, generische Ausrüstung, Host-Unabhängigkeit).
- **Offen aus Chat 2:** die vier Testlauf-Fixes und die v1.24A-Deduplizierung. **Jetzt umgesetzt.**
- **Regressionen und Widersprüche** (Details in Abschnitt 4 und 5):
  - WI #25 lud wieder auf Tiernamen (gegen die v1.20-Entscheidung).
  - Core #27–#29 hatten rotierte Schlüssel.
  - Die Core-Munitionsregel (#21) war nie in die WorldInfo kompiliert.
  - WI #12 war eine veraltete Zusammenführung ohne DefeatXP-Lock.
  - Die offene Crit-Cap-Referenz aus Chat 1 (Nachricht 191, „im nächsten Core-Patch entscheiden“) stand noch in Core #11.
  - Veraltete Bezeichnungen in System.
  - Die Metadaten nannten veraltete Quellversionen (Core v1.18, Content v1.11, Lore v0.6).

## 4. Durchgeführte Verbesserungen

Jede Textänderung ist im Build-Skript als exakte, einmalig passende Ersetzung hinterlegt (`tools/build/patch_sources.py`).
Die Validierung stellt sicher, dass außerhalb dieser Stellen kein Zeichen des Originals verloren ging.

### 4.1 WorldInfo v1.23 (Laufzeit)

**Kernel (#0, konstant):**
- TOTAL DEF/MDEF ergänzt.
- Ordinale Bandlogik: ENGAGED=0 … LONG=3; Ziel legal, wenn sein Band ≤ dem Band der Aktion ist.
- **Munitionsregel**: gelistete Munition wird einmal mit den Kosten verbraucht; zu wenig Pfeile = illegale Aktion.
- „DEF/MDEF applies BEFORE variance“.
- **PC ACTION SCOPE**: eine erklärte Aktion autorisiert nur sich selbst; Vorteile nie aus erzählter Haltung.
- **START FALLBACK** gilt auch für eine von Alaric begonnene neue Begegnung, falls kein Kampfmodul geladen ist
  (Abschnitt 5, Punkt 5).

**START (#1) und PENDING (#55):**
- Die vollständige **Ambush-Regel** steht in Schritt 8: +25pp Crit, kein Treffer- oder Schadensbonus, danach normale
  Initiative. Unaufmerksamkeit muss auf Fakten oder Spielerhandlungen beruhen.
- **Schadenskette als Formel**: `PostDEF = max(Power − TOTAL DEF/MDEF, Power × 0,10)` → Resistenz/Schwäche → × eine
  Varianz → × Crit → Endmodifikatoren → **einmal runden (min. 1)**.
- Munition in Legalitäts- und Kostenschritt.
- Initiative-Gleichstand: höhere PER, sonst einmal ohne Bevorzugung auflösen.
- Aktionsumfang im Erzählschritt.
- Die wörtlich eingebetteten Klassentexte (9.640 Zeichen, dreimal in START, PENDING und Creation) sind durch **eine
  generierte, beschriftete Aktionstabelle** ersetzt.
  - Pro Zeile steht eine Aktion mit benannten Feldern Kosten, Munition, Reichweite, Treffer und Raw-Formel. So verlangt
    es die Lehre aus Chat 1, Nachricht 195, als komprimierte Monsterzeilen falsch gelesen wurden.
  - Die Tabelle wird beim Build **Feld für Feld (247 Felder) und Zahl für Zahl gegen Content zurückgelesen**.

**ACTIVE (#2):** Munition in Legalität und Kosten, explizite PostDEF-Formel, Aktionsumfang für Alaric.

**Creation (#54):**
- Die System-UI-Labels sind festgeschrieben (Routing).
- Die Starter-Kits kommen aus Content [STARTER GEAR].
- Das Ranger-Testorakel „DERIVED VALIDATION“ und die doppelte „STARTER KIT MAP“ sind entfernt. Die Referenzwerte stehen
  jetzt vollständig für alle fünf Klassen in Anhang B.
- Generierte Aktionstabelle.

**#12 Progression:** neu aus Core #3 und #25 aufgebaut. Die alte Zusammenführung war veraltet, und ihr fehlte der
DefeatXP-Lock: „calculate/record each eligible defeated target“ widersprach der Sperre.

**Entfernt (#62–#67):**
- Fünf Referenz-Caches, jeweils **byte-identisch** mit den Klasseneinträgen #19–#23. Ihre Infofragen-Trigger wandern
  in #19–#23.
- Der Debug-Eintrag #67. Als Schlüsselworteintrag konnte er keinen dauerhaften Modus bilden; er lebt jetzt in System
  #14 und in der DEBUG_CALC-Variante.

**Trigger-Hygiene** (alle Regex-Schlüssel sind mit SillyTaverns `parseRegexFromString` geprüft):

| Eintrag | Vorher | Nachher |
|---|---|---|
| #2 ACTIVE / #55 PENDING | `Combat.{0,12}ACTIVE` mit NOT-ANY-`Combat.{0,12}PENDING`. „Combat: ACTIVE (Pending XP 10)“ blockierte ACTIVE und lud START. Quest-„STATUS: ACTIVE“ lud ACTIVE. Übergänge wie „PENDING -> ACTIVE“ luden PENDING. | Zwischen „Combat/Encounter [State/Status/Phase]“ und dem Wert ist nur Dekoration erlaubt. Pfeilübergänge werden zum Zielzustand aufgelöst. „Pending XP“ ist ausgeschlossen. #-Befehle starten nie ein Kampfmodul. |
| #1 START | Plaintext-Skillnamen und ein Verb-Regex auf 1 Nachricht. „bite“ und „charge“ lösten aus („I pay the charge“, „a bite of bread“). NOT ANY auf allgemeine Wörter blockierte echte Angriffe mit Frage. | Alle Schlüssel gelten nur für die **neueste** Nachricht (`^\x01…`), bei Scan Depth 2, damit NOT ANY die Creation-Marker sieht. Verb-Morphologie korrigiert; Redewendungen lokal ausgeschlossen. Zweiter Regex für subjektgeführte und Projektil-Formulierungen. NOT ANY nur noch für #-Befehle und Skill-Infofragen. |
| #54 Creation | Nacktes „CHARACTER CREATION“ lud die Erstellung mitten im Kampf, mit der höchsten Ordnung 1003. | Explizite Schritt-Marker und UI-Labels; gesperrt bei „CHARACTER CREATION COMPLETE“ und bei Kampfphasen-Markern |
| #3, #6 | Skillnamen im Tracker lösten bei Scan Depth 2 in jedem Zug aus. | Skillnamen zählen nur in der neuesten Nachricht. |
| #4 Status, #7 Elemente | Erzählung („frozen puddle“, „bleeding boar“, „smoke“, „wet“) lud die Einträge. | Großgeschriebene Statusnamen bzw. CAPS-Tags aus Tracker und System, oder Statuswörter in der Spielernachricht |
| #25 Monster | Tiernamen in der Spielernachricht (rat, wolf, boar, deer, bird …) luden jedes Mal 5,9k Zeichen. | Nur explizite Phrasen (v1.20-Entscheidung) und `#system` mit Monsterbegriff. START/PENDING tragen Anker und Formeln ohnehin. |
| #19–#23 Klassen | nur Klassenwörter | plus Infofragen zu eigenen Skills und `#skills`/`#class` |
| #45 Befehlsrouter | `#befehl` irgendwo in der Nachricht, auch mitten im Satz | nur wenn `#` das erste Zeichen ist (System-Regel) |

**Metadaten:**
- Alle 61 Einträge haben den vollständigen Feldsatz der Vorlage.
- Jeder Eintrag nennt seine Quelle (`rpg_master_source`, `rpg_compile_mode`).
- Die Top-Level-Metadaten nennen die richtigen Quellversionen, die entfernten Einträge und eine Änderungsliste.
- Die empfohlenen Einstellungen sind unverändert.

### 4.2 Core v1.21

| Eintrag | Änderung | Grund |
|---|---|---|
| #11 | „…capped as already defined by Core“ → „No cap on the PER-derived portion is defined; do not invent one.“ | Die Referenz zeigte ins Leere; Core definiert keine Obergrenze (Chat 1, Nachricht 191). Es wird keine neue Mechanik erfunden. |
| #12 | Zeile mit ordinaler Bandlogik | Chat-2-Empfehlung (Range-Algebra). Wiederholt die bestehenden Regeln nur formal. |
| #18 | „V1.3 DELIBERATE NON-DEFINITIONS“ an die heutige Modulaufteilung angepasst | Die Liste nannte Klassen, Skills und Monster als undefiniert; sie liegen längst in Content und System. |
| #21 | Munition: Content-Feld „Ammo“, Verbrauch einmal zusammen mit den Kosten nach voller Legalität, keine Kosten/Munition/Würfe/Zugfortschritt bei zu wenig Pfeilen, magische Projektile ohne Munition | Core nannte „Twin Shot“ direkt (Schichtverletzung), Content hatte kein Munitionsfeld. |
| #23 | START-Datensicherheit gilt auch für eine von Alaric begonnene neue Begegnung ohne geladene Initialisierungsregeln | Sicherheitsnetz für nicht erkannte Formulierungen (Abschnitt 5, Punkte 4 und 5) |
| #24 | Ambush-Herkunftsregel und **PC ACTION SCOPE** | Chat-2-Fixes 3 und 4 |
| #26 | Schritt 8 mit vollständiger Ambush-Regel | Chat-2-Fix 1 |
| #27 | „Defense is always applied BEFORE variance: PostDEF = …“ | Chat-2-Fix 2 |
| #27/#28/#29 | Schlüssel zurückrotiert | ACTIVE hatte END-, END hatte AUDIT- und AUDIT hatte ACTIVE-Schlüssel (Abschnitt 5, Punkt 1). |
| alle | Vorlagenfelder vervollständigt (#21 und #22 hatten 8 fehlende Felder); Trigger-Felder spiegeln die WorldInfo; `rpg_compile` je Eintrag; Metadaten v1.21 | „Kanonische Quelle soll wieder wahr sein“ (Chat 1, Nachricht 191 §18) |

### 4.3 Content v1.13

- Ranger: Feld `Ammo: 1 arrow when fired from a bow` bei Basic Attack, Aimed Shot, Power Shot und Quick Shot;
  `Ammo: 2 arrows when fired from a bow` bei Twin Shot.
- Der Satz „With a bow, consumes 1 physical arrow.“ steht jetzt als Feld.
- Alle Zahlen sind unverändert; die Prüfung vergleicht jede Zahl.
- Metadaten v1.13, veraltete Versionsangaben (v1.10/v1.11) und Test-Marker entfernt, Trigger-Felder gespiegelt.

### 4.4 Lore v0.8

- Welttext **byte-identisch**.
- Nur die Metadaten sind geändert: Versionsangaben der Einträge standen auf v0.5, Kompatibilität jetzt Core v1.21 und
  Content v1.13, Trigger-Felder gespiegelt.
- #0 ist zur Laufzeit schlüsselgesteuert statt konstant; die Quelle sagt das jetzt korrekt.

### 4.5 System v1.12

| Eintrag | Änderung |
|---|---|
| #1, #10 | Veraltete „V0.1“-Labels entfernt. „While Creation_State is not READY“ → „Until CHARACTER CREATION COMPLETE has been committed“; das Feld Creation_State existiert nicht mehr. |
| #5 | „path-specific Growth“ → nur explizit durch eine Evolution gewährtes Wachstum (Content #10: Evolution gibt kein generelles Wachstum). „obsolete Stage-III passive“ → „former Class Passive“. Domain-„Radius“ → Range-Band-Reichweite (Standard SHORT). |
| #11 | Schlüssel „combat overlay“ entfernt; Overlays wurden in v1.15 gestrichen. |
| #12 | Absatz SYSTEM UI LABELS (Routing-Labels STEP 1/2, STEP 2/2, CLASS SELECTED, Select exactly 2 Skills, CHARACTER CREATION COMPLETE). Kit „from Content [STARTER GEAR]“, „ZERO world narration“. DERIVED VALIDATION (Ranger-Orakel) und doppelte STARTER KIT MAP entfernt. Schlüssel auf die Laufzeit-Labels abgeglichen; vorher „CLASS ACCEPTED“ und „Choose exactly 2 Skills“, die nirgends ausgegeben werden. |
| #14 | BUILD RULE: Das Debug-Audit existiert nur im separaten DEBUG_CALC-Build, mit harter Ausgaberegel am Anfang. |

### 4.6 Character Description v2.3

Nur Ergänzungen; der v2.2-Text ist vollständig erhalten (geprüft):
- Neuer Abschnitt **PC STATE DELTA CHECK** vor „WORLD INDIFFERENCE & NARRATIVE FRICTION“. Er enthält:
  - Vergleich mit dem vorherigen PC-Zustand;
  - jede freiwillige Änderung von Position, Haltung, gehaltenen Gegenständen, bereiter Munition oder Fortbewegung braucht
    eine Erlaubnis durch die aktuelle Nutzereingabe;
  - ein Angriff autorisiert kein Hingehen, Nachladen oder Plündern;
  - erfundene Haltung gibt keinen mechanischen Vorteil.
- Punkt 10 im FINAL SANDBOX CHECK.

### 4.7 DEBUG_CALC-Variante

- Sie ist mechanisch identisch mit dem Standard. Nur START, PENDING und ACTIVE enthalten zusätzlich:
  - eine **kurze harte Ausgaberegel direkt unter dem Titel** (der v1.23-Lauf hatte den langen Vertrag geladen, aber
    nicht ausgegeben);
  - den sichtbaren Rechenprüfungsblock;
  - eine Erinnerungszeile am Ende.
- Die Prüfung stellt sicher, dass der Standardtext darin vollständig und unverändert enthalten ist.
- Größe: +1.349 Zeichen je Phase.

## 5. Eigene zusätzliche Verbesserungen

Diese Punkte stehen in keinem der Chats. Sie stammen aus der eigenen Analyse und den Prüfwerkzeugen.

1. **Rotierte Schlüssel Core #27/#28/#29.** Das ACTIVE-Kapitel trug die END-Schlüssel, END die AUDIT-Schlüssel und AUDIT
   die ACTIVE-Schlüssel. Wer die Quellen direkt nutzte, bekam zum falschen Zeitpunkt das falsche Kapitel.
2. **Munitionsregel fehlte zur Laufzeit.** Core #21 war in keinen WI-Eintrag kompiliert, und Content kannte kein
   Munitionsfeld. Jetzt: Kernel, START/PENDING/ACTIVE und die Aktionstabelle mit Ammo-Feld.
3. **Phasen-Kollisionen.** „Combat: ACTIVE (Pending XP 10)“ und „Combat: ACTIVE, Pending XP 10“ luden START statt ACTIVE.
   Übergangszeilen wie „PENDING -> ACTIVE“ luden die falsche Phase. Der nie beobachtete Schlüssel „STATUS: ACTIVE“
   (Chat 1, Nachricht 187, nur angenommen) machte jede Quest-Zeile zum Kampfauslöser.
4. **START-Auslösung, zweiter Prüfdurchgang.** Ein Test mit 41 Angriffs- und 26 Alltagsformulierungen zeigte:
   - Kleingeschriebenes „I lunge at the wolf“ bzw. „I charge the boar“ startete nach meiner ersten Überarbeitung keinen
     Kampf mehr (Regression, jetzt behoben).
   - Formulierungen wie „I put an arrow in its eye“, „I bash it with my shield“, „open fire“ oder „cut its throat“
     erkannte schon v1.22 nicht.
   - Redewendungen wie „strike a deal“, „hit the road“ oder „cast a glance at“ luden START.
   - Ergebnis: Angriffe 25/41 → 40/41, Fehlauslösungen 12/26 → 2/26.
5. **Kernel-Sicherheitsnetz für nicht erkannte Angriffe.** Beginnt eine neue Begegnung, ohne dass ein Kampfmodul geladen
   ist, wird nicht improvisiert. Die Handlung wird als PENDING eingefroren und im nächsten Durchgang regulär
   initialisiert. Bisher galt das laut Core #23 und Kernel nur für NPC-Angriffe.
6. **Creation-Kapern.** Das nackte Schlüsselwort „CHARACTER CREATION“ plus Ordnung 1003 hätte eine Frage wie „did
   character creation give me 20 arrows?“ mitten im Kampf in die Erstellungs-Engine geleitet.
7. **Veraltetes Progressionsmodul #12** (siehe 4.1) und **veraltete System-Texte** (siehe 4.5).
8. **Tracker-Echo.** Skill-, Status- und Elementwörter aus Tracker und Erzählung luden Detailmodule in fast jedem Zug
   (Szenarien S03–S05, S19–S21).
9. **Quellen-Metadaten.**
   - Einheitliche Versionsangaben.
   - Jedes Quell-Entry nennt sein Laufzeitziel (`extensions.rpg_compile`).
   - Keine Quelle behauptet `constant: true`, wenn die Laufzeit das nicht tut.
   - Vollständige Vorlagenfelder.
10. **Reproduzierbarkeit.** Build- und Prüfskripte liegen bei (`tools/`). Der Build ist deterministisch, jede
    Textersetzung ist abgesichert, die Aktionstabelle wird im Rückweg geprüft. Die ST-Aktivierung wird mit einem Nachbau
    von `world-info.js` simuliert.

## 6. Externe Recherche (mit Quellen)

| Quelle | Abruf | Verwendetes Ergebnis |
|---|---|---|
| SillyTavern `public/scripts/world-info.js`, Branch `release`: <https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/public/scripts/world-info.js> | direkt abgerufen (HTTP 200, 265 KB) | siehe Liste unten |
| SillyTavern-Docs `Usage/worldinfo.md`: <https://raw.githubusercontent.com/SillyTavern/SillyTavern-Docs/main/Usage/worldinfo.md> | direkt abgerufen (HTTP 200) | Bedeutung von Scan Depth, Inclusion Groups/Group Override, Budget, Rekursion und Match Whole Words (Gegenprobe zu den Code-Befunden) |
| GLM-5.3-Flash: Modellkarte <https://huggingface.co/zai-org/GLM-5.3-Flash>, Z.AI-Doku <https://docs.z.ai/guides/vlm/glm-5.3-flash>, Unsloth <https://unsloth.ai/docs/models/glm-5.3-flash> | nur über Websuche; direkter Abruf durch die Netzwerkrichtlinie blockiert | `reasoning_effort` kennt `low/high/max`; ohne Angabe oder bei anderem Wert (z. B. „medium“) gilt `max`. `clear_thinking` ist standardmäßig `false` und für Chat auf `true` zu setzen. Das bestätigt die bestehende Empfehlung (high, clear_thinking true). Das in v1.19 empfohlene „medium“ wäre stillschweigend als `max` behandelt worden. |

Ergebnisse aus `world-info.js`, wie sie verwendet wurden:
- Scan-Puffer = `'\x01'` + Nachrichten (neueste zuerst), verbunden mit `'\n\x01'` (Z. 295–297). Deshalb beschränkt
  `^\x01[^\x01]*` einen Regex-Schlüssel auf die neueste Nachricht.
- `matchKeys` (Z. 337 ff.): Für Regex-Schlüssel gelten nur ihre eigenen Flags; die Einstellungen Case Sensitive und
  Match Whole Words werden ignoriert. Mehrwortige Klartext-Schlüssel sind reine Teilstring-Treffer.
- `parseRegexFromString` (Z. 2901 ff.): Ein unmaskierter `/` macht einen Schlüssel ungültig.
- `selectiveLogic` 0–3 (Z. 33–37).
- Budget `round(% × Kontext / 100)` (Z. 4736) mit Überlaufverhalten (Z. 5061 ff.); `ignoreBudget`.
- Schlüssel laufen durch `substituteParams` (Z. 4915).

Nicht verwendet: `docs.sillytavern.app` war durch die Netzwerkrichtlinie gesperrt; stattdessen diente die Markdown-Quelle
derselben Doku auf GitHub. Die Quellen der Chat-2-Recherche (u. a. SillyTavern-, STscript- und Megumin-Suite-Doku,
GDC- und Game-AI-Pro-Artikel) habe ich als Kontext übernommen, aber nicht erneut geprüft. Konkrete Designentscheidungen
stützen sich nur auf die direkt geprüften Quellen oben und auf die Dateien selbst.

## 7. Unsicherheiten

1. **Kein Live-Test möglich.** SillyTavern und GLM laufen in dieser Umgebung nicht. Die Aktivierung ist mit einem
   Nachbau der ST-Logik simuliert (Stand `release`-Branch 23.09.2026).
   - Die Anker auf die neueste Nachricht (`^\x01`) hängen am Pufferformat. Im ersten Testzug bitte im WI-Log prüfen,
     dass START nur bei echten Angriffen und ACTIVE bei `**Combat:** ACTIVE` lädt.
2. **Token-Zahlen sind Schätzungen** (Zeichen ÷ 4). Der Tokenizer-Download war durch die Netzwerkrichtlinie gesperrt.
   Der größte Zug (START) liegt bei rund 18.500 Zeichen, geschätzt etwa 4.600 Token, deutlich unter rund 8.192 Token
   Budget.
3. **Phasenmarker des Hosts.**
   - Getestet sind unter anderem: `**Combat:** ACTIVE`, `Combat: ACTIVE — Round 2`, `Combat State: ACTIVE`,
     `[Combat: ACTIVE]`, `Combat: PENDING -> ACTIVE`, `COMBAT ENDED`.
   - Falls Megumin eine andere Bezeichnung verwendet (etwa „Battle:“ oder deutsch „Kampf:“), greifen die Phasentrigger
     nicht. Dann bitte die Zeile melden; der Regex lässt sich gezielt erweitern.
4. **Creation-Routing** braucht sichtbare Labels (`CHARACTER CREATION — STEP 1/2` bzw. `STEP 2/2`, `CLASS SELECTED`) in
   den letzten zwei Nachrichten. Die First Message liefert STEP 1/2 (geprüft). Schritt 2 hängt davon ab, dass das Modell
   das System-Label ausgibt, was System #12 jetzt ausdrücklich verlangt.
5. **Angriffserkennung bleibt lexikalisch.**
   - Offene Lücke: 1 von 41 Proben („I engage the wolf“ ist bewusst nicht erfasst, „engage“ ist zu allgemein).
   - Verbleibende Fehlauslöser: 2 von 26 („smash the lock“, „attack the problem“). Sie laden START für einen Zug; dessen
     eigenes Combat Gate hält den Zustand INACTIVE.
   - Nicht erkannte Angriffe fängt das Kernel-Sicherheitsnetz. Der erste Angriff wird dann eine Antwort später
     aufgelöst statt improvisiert. Das ist eine kleine, bewusste Verhaltensänderung im Fehlerfall.
6. **Tabellenform statt Fließtext.** Die Aktionstabelle ist inhaltlich exakt (geprüft). Ob GLM sie genauso zuverlässig
   liest wie die längeren Klassentexte, zeigt erst der Testlauf; die Tabelle folgt der Lehre aus Nachricht 195 (eine
   Aktion pro Zeile, benannte Felder).
7. **Arcane Burst.** Content sagt „resolve damage separately against each valid target“. Core-AoE nennt einen
   gemeinsamen Trefferwurf, es sei denn, der Skill sagt „resolves separately“. Ob auch der Treffer getrennt gewürfelt
   wird, ist nicht eindeutig. Das bleibt unverändert, weil es eine Balance-Entscheidung ist.
8. **GLM-Parameter** stammen aus einer Suchzusammenfassung, nicht aus einem direkten Seitenabruf (siehe 6).
9. **DEBUG_CALC** musste neu erzeugt werden, weil die Datei im ZIP fehlte. Ob sie mit der ursprünglichen Datei
   übereinstimmt, ist nicht prüfbar. Inhaltlich folgt sie dem Debug-Vertrag v1.23 und System #14.

## 8. Nicht übernommene Vorschläge

| Vorschlag (Quelle) | Entscheidung und Grund |
|---|---|
| STscript-Projektor, `averethState` (Chat 2, v1.24B) | Nicht umgesetzt. Laut Blaupause für später vorgesehen. Es bräuchte ST-Skripting und einen zweiten Persistenz-Eigentümer; Megumin bleibt Eigentümer. |
| Kompaktes Kontextformat „RPGCTX“, gelernte Skill-Datensätze im PC-Zustand, Encounter-Objekt statt Phasenwert, NPC-Wissensmatrix (Chat 2) | Nicht umgesetzt. Alles würde ein Tracker-Format vorschreiben, was die Host-Unabhängigkeit verletzt (Nutzer, Chat 1, Nachricht 202), oder einen Projektor brauchen. Die Matrix ist mit Megumin laut Chat 2 nicht abbildbar. |
| START/PENDING/ACTIVE zu einer Engine zusammenlegen (Chat 2, mittelfristig) | Nicht umgesetzt. Die Phasentrennung ist erprobt; eine Zusammenlegung würde das Routing ändern. |
| Aktionstabelle als eigener Eintrag, einmal geladen | Nicht möglich, ohne Rekursion einzuschalten (bewusst AUS) oder den Eintrag konstant zu machen. Die Tabelle bleibt in den Phasen-Engines eingebettet. |
| „Nie ein Ziel ableiten, auch bei nur einem Gegner“ (Chat 1, Nachricht 195) | Vom Nutzer abgelehnt (Nachricht 196). Ein einziger Gegner bleibt Standardziel. |
| Neubewertung der STA-Kosten (Aimed 10, Power 18, Twin 15 …) (Chat 1, Nachricht 193) | Nicht übernommen. Der Nutzer entschied: bestehende Kosten bleiben. |
| PER-Obergrenze für Treffer/Crit, High-Rank-Initiative/-Bewegung (Chat 1, Nachricht 191) | Vom Nutzer vertagt. Nur die ins Leere zeigende Cap-Referenz wurde entfernt; eine Obergrenze wurde nicht erfunden. |
| Jagdabsicht startet Kampf (Chat 1, Nachricht 130–131) | Nicht übernommen (so entschieden). Das Combat Gate bleibt konservativ. |
| Context % erhöhen, Ausgabe auf 6144/8192 anheben, WI in „6144“ umbenennen | Verworfen (Nachricht 180–183; der v1.22-Lauf zeigte genug Reserve). Der Name behält „4096“. |
| Namenssperre für Routine-NPCs (Megumin benennt jeden Sprecher) | Nicht umgesetzt. NPC-Patch und Megumin-Konfiguration bleiben unverändert (Blaupause §31). |
| Tracker-Kosmetik aus dem v1.23-Lauf („Level: 1 (+10 XP)“, „5 Silver“ doppelt) | Nicht gepatcht. Das ist Host-Formatierung. |
| CD oder Lore kürzen | Nicht übernommen. Grundsatz „CD schlank in Mechanik, nicht im Verhalten“, Lore-Inhalt unverändert (Chat 2, Blaupause). |
| Beispielwerte aus Chat 2 („AimedShot ATK+.75PER“, „TwinShot 2×(.65ATK+.45AGI)“, „Wolf L2 34/9/1/67/12/12“) | Nicht übernommen, weil sie Content und Formeln widersprechen. Korrekt ist Aimed Shot = 10 + AGI×0,625 + PER×1,125 + ATK; Twin Shot = 2 × (4 + AGI×0,4375 + PER×0,4375 + 50 % ATK); Wolf L2 = HP 28, ATK 11, DEF 0, MDEF 0, Hit 80, Init 13, DefeatXP 20 (geprüft). |

---

## Anhang A: Validierungsergebnisse

**79 von 79 automatischen Prüfungen bestanden** (`tools/validation/validation_report.json`), u. a.:
- JSON gültig, striktes UTF-8 ohne BOM, gleiche Serialisierung wie die Originale.
- Vollständiger Feldsatz, uid = Schlüssel, eindeutiger `displayIndex`, Feldtypen.
- Alle 47 Regex-Schlüssel je WorldInfo sind für SillyTavern gültig.
- Genau ein konstanter Eintrag; Phasengruppe 1003/1002/1001/1000; keine sticky-, cooldown- oder delay-Werte.
- Die entfernten Einträge #62–#66 waren byte-identisch mit #19–#23.
- 53 wörtlich übernommene WI-Einträge sind identisch mit ihrer Quelle, und ihre Trigger-Felder sind gespiegelt.
- Inhalte sind nur in den dokumentierten Einträgen geändert; alle entfernten oder umformulierten Zeilen sind in
  `removed_lines.json` einzeln belegt; jede Zahl in Content #5 ist erhalten.
- Veraltete Texte sind entfernt; keine Host-Format-Vorgaben.
- Creation-Labels in First Message, System #12 und WI #54 sind konsistent.
- Versionsangaben sind einheitlich.
- DEBUG_CALC enthält den Standardtext vollständig; der CD-v2.2-Text ist vollständig erhalten.
- Rechen-Fixtures bestehen (Anhang B); 234 Regex-Tests; 30 Aktivierungsszenarien.

**Aktivierungssimulation** (neueste Nachricht und letzte Modellnachricht, Scan Depth 2, Budget 8.192 Token geschätzt,
Phasengruppe; „Einträge“ = geladene WI-uids):

| # | Szenario | v1.22: Phase / Einträge | v1.22 | v1.23: Phase / Einträge | v1.23 | Zeichen alt → neu |
|---|---|---|:-:|---|:-:|--:|
| S01 | Creation Schritt 1: Spieler wählt Ranger nach der First Message | Creation / #0 #54 | ✅ | Creation / #0 #54 | ✅ | 15590 → 14262 |
| S02 | Creation Schritt 2: zwei Skills gewählt (Power Shot darf keinen Kampf starten) | Creation / #0 #54 #3 | ✅ | Creation / #0 #54 | ✅ | 16736 → 14262 |
| S03 | Erster Story-Zug nach CHARACTER CREATION COMPLETE | — / #0 #3 | ✅ | — / #0 | ✅ | 4459 → 4061 |
| S04 | Fährtenlesen mit bereitem Bogen (kein Kampf) | — / #0 #3 | ✅ | — / #0 | ✅ | 4459 → 4061 |
| S05 | Nur Zielen (kein Kampf) | — / #0 #3 #25 | ✅ | — / #0 | ✅ | 10367 → 4061 |
| S06 | Angriffserklärung (START) | START / #0 #1 #3 | ✅ | START / #0 #1 | ✅ | 20334 → 18518 |
| S07 | Angriff mit Tiernamen (START; Monster-Eintrag soll nicht laden) | START / #0 #1 #3 #25 | ❌ | START / #0 #1 | ✅ | 26242 → 18518 |
| S08 | ACTIVE-Zug, Spieler schreibt nur „again“ | ACTIVE / #0 #2 #3 | ❌ | ACTIVE / #0 #2 | ✅ | 8254 → 8223 |
| S09 | ACTIVE-Zug mit Tracker „Combat: ACTIVE (Pending XP 10)“ + Power Shot | START / #0 #1 #3 | ❌ | ACTIVE / #0 #2 | ✅ | 20334 → 8223 |
| S10 | ACTIVE-Zug mit „Combat: ACTIVE, Pending XP 10“ | START / #0 #1 #3 #25 | ❌ | ACTIVE / #0 #2 | ✅ | 26242 → 8223 |
| S11 | PENDING-Marker (Megumin-Stil) + Spielerangriff | PENDING / #0 #55 #3 | ✅ | PENDING / #0 #55 | ✅ | 18352 → 18523 |
| S12 | Übergangszeile „Combat: PENDING -> ACTIVE“ | PENDING / #0 #55 #3 | ❌ | ACTIVE / #0 #2 | ✅ | 18352 → 8223 |
| S13 | Ausweiden nach „Combat: ACTIVE -> INACTIVE“ | — / #0 #3 #13 | ✅ | — / #0 #13 | ✅ | 7737 → 7339 |
| S14 | #skill Power Shot außerhalb des Kampfes | — / #0 #45 #61 #47 #3 #66 | ❌ | — / #0 #45 #61 #47 #23 | ✅ | 10469 → 10208 |
| S15 | #skill Power Shot während ACTIVE (System-Abfrage friert den Kampf ein) | ACTIVE / #0 #2 #45 #61 #47 #3 #66 | ❌ | — / #0 #45 #61 #47 #23 | ✅ | 14264 → 10208 |
| S16 | Infofrage „what does Twin Shot do?“ | — / #0 #3 #66 | ❌ | — / #0 #3 #23 | ✅ | 6308 → 7198 |
| S17 | Quest-Tracker „Status: ACTIVE“ beim Erkunden | ACTIVE / #0 #2 #3 | ❌ | — / #0 | ✅ | 8254 → 4061 |
| S18 | Frage mitten im Kampf, die „character creation“ erwähnt | Creation / #0 #54 #45 #61 #52 #3 | ❌ | — / #0 #45 #61 #52 | ✅ | 20677 → 7997 |
| S19 | Mage-Tracker listet Arcane Ward (Erkundung) | — / #0 #6 | ❌ | — / #0 | ✅ | 4533 → 4061 |
| S20 | Erzählung mit smoke/wet/frozen (Erkundung) | — / #0 #3 #4 #7 | ❌ | — / #0 | ✅ | 8298 → 4061 |
| S21 | Vögel erwähnt (Wrens Gänse) | — / #0 #3 | ✅ | — / #0 | ✅ | 4459 → 4061 |
| S22 | Maut: „I pay the charge“ | START / #0 #1 #3 #14 | ❌ | — / #0 #14 | ✅ | 22930 → 6657 |
| S23 | „I take a bite of bread“ | START / #0 #1 #3 | ❌ | — / #0 | ✅ | 20334 → 4061 |
| S24 | Angriff plus Ausruf/Frage | — / #0 #3 #25 | ❌ | START / #0 #1 | ✅ | 10367 → 18518 |
| S25 | Twin Shot im ACTIVE-Kampf (Multi-Hit-Detail erwünscht) | ACTIVE / #0 #2 #3 #25 | ✅ | ACTIVE / #0 #2 #3 | ✅ | 14162 → 9369 |
| S26 | Lore-Frage zu Veyrhold | — / #0 #3 #39 | ✅ | — / #0 #39 | ✅ | 4969 → 4571 |
| S27 | #combat während ACTIVE | ACTIVE / #0 #2 #45 #61 #51 #3 | ❌ | — / #0 #45 #61 #51 | ✅ | 12844 → 8646 |
| S28 | Duelist: kleingeschrieben „I lunge at the wolf“ (START) | START / #0 #1 #25 | ✅ | START / #0 #1 | ✅ | 25096 → 18518 |
| S29 | Bogenschützen-Formulierung „I put an arrow in its eye“ (START) | — / #0 #3 | ❌ | START / #0 #1 | ✅ | 4459 → 18518 |
| S30 | Redewendung „I strike a deal with the merchant“ (kein Kampf) | START / #0 #1 #3 | ❌ | — / #0 | ✅ | 20334 → 4061 |

v1.22 besteht 12 von 30, die überarbeitete WorldInfo 30 von 30. S15 und S27 sind gewollt ohne Kampf-Engine:
#-Befehle sind laut System schreibgeschützt und frieren die Story-Zeit ein. Der Kampfzustand bleibt im Tracker
erhalten, und die PERSISTENCE-Regel des Kernels verbietet jedes Zurücksetzen.

**Formulierungs-Probe** (`node tools/validate/phrase_probe.js`): Von 41 Angriffsformulierungen erkennt v1.22 25, die
neue Fassung 40. Von 26 Alltagsformulierungen laden bei v1.22 12 fälschlich START, neu 2.

## Anhang B: Test-Checkliste und Referenzwerte

Diese Werte ersetzen das aus System #12 entfernte Ranger-Orakel und gelten für alle Klassen auf Level 1, direkt nach der
Erstellung mit Starter-Kit. Sie sind aus Content und Core berechnet (`tools/validation/fixtures_L1.json`) und von Hand
nachgerechnet. Raw-Werte sind ungerundet und gelten ohne Proficiency, Buffs und Varianz.

| Klasse | STR VIT AGI INT PER WIL | MaxHP | MaxMP | MaxSTA | Init | TOTAL DEF/MDEF | ATK/MATK | BaseHit | Crit | Raw-Werte |
|---|---|---|---|---|---|---|---|---|---|---|
| Warrior | 6 6 5 5 5 5 | 85 | 60 | 100 | 7 | 7/3 | 6/0 | 72,5 | 5,5 % | Basic Attack 17,5; Heavy Slash 25; Power Strike 33,25; Quick Slash 20,375; Charge 23,375 |
| Mage | 5 5 5 6 5 6 | 80 | 72 | 100 | 7 | 3/4 | 0/6 | 72,5 | 5,5 % | Basic Attack 17,5; Arcane Bolt 27,25; Flame Lance 36,25; Arcane Burst 21,5 |
| Guardian | 5 6 5 5 5 6 | 85 | 64 | 100 | 7 | 10/5 | 5/0 | 72,5 | 5,5 % | Basic Attack 15,875; Shield Strike 21,25; Heavy Bash 28,125; Shield Charge 21,75 |
| Duelist | 6 5 6 5 5 5 | 80 | 60 | 100 | 8 | 3/4 | 6/0 | 72,5 | 5,5 % | Basic Attack 17,5; Precision Thrust 24,5; Lunge 30; Flurry 13 je Schlag; Guarded Thrust 21 |
| Ranger | 5 5 6 5 6 5 | 80 | 60 | 100 | 9 | 3/4 | 6/0 | 73 | 5,6 % | Basic Attack 17,5; Aimed Shot 26,5; Power Shot 33,25; Quick Shot 21; Twin Shot 12,25 je Schlag |

**Monster-Referenzen:**
- Keiler F1: HP 41, ATK 11, DEF 2, MDEF 0, Hit 70, Init 7, Gore (physisch, ENGAGED), DefeatXP 10 (gleicher Rang).
- Wolf L2: HP 28, ATK 11, DEF 0, MDEF 0, Hit 80, Init 13, DefeatXP 20.

**Schadensbeispiele (Core #11):**
- 17,5 gegen DEF 2 mit Varianz 0,94 → 15.
- 12,25 gegen DEF 2 mit Varianz 1,08 und Crit → 17.
- Reihenfolge prüfen: Power Shot 33,25 gegen den Keiler (DEF 2) mit Varianz 1,10: richtig (33,25 − 2) × 1,10 = 34,375
  → **34**; falsch wäre 33,25 × 1,10 − 2 = 34,575 → 35. Im v1.23-Lauf traf der Schuss einen Hirsch mit DEF 0
  (Varianz 0,97 → 32); deshalb blieb die falsche Reihenfolge dort unsichtbar.

**Ablauf für den nächsten Testlauf** (Test-Setup v2.6 bleibt gültig, ergänzt um die v1.24-Punkte):
1. Erstellung Ranger → Werte wie oben. Schritt 2 (Aimed Shot + Power Shot) bleibt ohne Welterzählung. Das Kit ist
   generisch (Shortbow ATK 6, Light Armor, Köcher mit 20 Pfeilen).
2. Wald, Fährte, Keiler beobachten, zielen → alles INACTIVE. **Neu:** Alaric duckt oder schleicht nicht ungefragt.
3. Basic Attack aus MEDIUM → START mit vollständigem Snapshot. Raw 17,5; 5 STA; 1 Pfeil.
4. Keiler-Bewegung nur MEDIUM → SHORT, kein Sprung auf ENGAGED.
5. Power Shot in ACTIVE → Profil unverändert kopiert. Raw 33,25; Treffer 63 %; STA 95 → 83; Pfeile 19 → 18;
   **DEF vor Varianz**.
6. **Neu:** Hinterhalt nur bei echter, vom Spieler erklärter oder etablierter Unaufmerksamkeit. Dann Opening Action mit
   +25pp Crit, kein Treffer- oder Schadensbonus.
7. **Neu:** Nach dem Treffer läuft Alaric nicht zum Ziel, steht nicht auf, legt keinen Pfeil ein und plündert nicht
   ungefragt.
8. XP: +10 Pending → persistent 0 → 10 genau einmal, Phase INACTIVE.
9. **Neu:** „I charge the boar“ oder „I lunge at the wolf“ startet den Kampf. „I pay the charge“ und „strike a deal“
   starten keinen. `#skill Power Shot` mitten im Kampf lädt keine Kampf-Engine.
10. DEBUG_CALC: Die sichtbare Rechenprüfung muss in jeder Kampfantwort erscheinen.

## Anhang C: Reproduzierbarkeit

```bash
cd Avereth_RPG_v1.24_PERFEKTIONIERT
python3 tools/build/main.py         # erzeugt alle *_PERFEKTIONIERT-Dateien aus dem Baseline-ZIP
python3 tools/validate/validate.py  # 79 Prüfungen, Exit-Code 0 = alles bestanden
```
Details stehen in `tools/README.md`. Der Build ist deterministisch: zwei Läufe mit unterschiedlichem Python-Hash-Seed
ergeben byte-identische Dateien.
