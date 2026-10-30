# Unabhängiges Architekturaudit der Avereth Engine (Build .126)

**Stand:** 30.10.2026 · Produktcode `b8d2af4` (.126, `claude/c-planner-prototype-2026-10-02-gpt-c666`) · Dokumentation `main` `a611db5` · reiner Prüfbericht, keine Implementierung

## 0. Prüfbasis

- **Stände:** Produktcode `b8d2af4` (.126), Dokumentation `main` `a611db5`. 01 und 03 habe ich vollständig gelesen, 02, 04 und 06 sowie die Reviews zu Batch 17–19 gezielt. Danach habe ich den Code von der Eingabe bis zur Persistenz und zu den Tests verfolgt.
- **Selbst ausgeführt:**
  - `npm test -- --test-concurrency=4`: **2429/2429 grün in 57 s**.
  - Nur lesende Sonden gegen den aktuellen HEAD: Fold-Messung, Promptgrößen aus dem Code, Prüfung der Populations- und Item-Zuordnung.
- **Live-Daten:** Ausgewertet habe ich den einzigen neueren Originalexport auf `main` (Run `20261026-132758Z`, Build .98, 73 Eingaben, 203 LLM-Aufrufe). Die Zahlen zu Batch 17–19 stammen nur aus den Reviews, weil diese ZIPs nicht im Repo liegen.
- **Kennzeichnung:** **[N]** = nachgewiesen durch Code, Daten oder Sonde, **[P]** = plausibles Risiko, **[D]** = Designalternative.
- Ich habe nichts geändert und nichts committet. Die temporäre Arbeitskopie von `main` ist wieder entfernt, der Arbeitsbaum ist sauber.

---

## 1. Die Architektur heute

### 1.1 Ablauf eines Zuges (C-Pfad, Ruleset 2)

```
Spielernachricht
└ index.js-Interceptor → Barriere: wartet auf die Extraktion der vorigen Antwort
  └ runtime.prepareGenerationAsync
     foldChat → readTurn (V3-Regexparser, praktisch nur für Steuerkanäle)
     → Planner-LLM (≤1 Repair, dazu Transport- und Leer-Recovery)
     → parsePlan (Schema, wörtliches Zitat, Handelszustimmung)
     → agency.guardCommands → announcedAbandon / implicitBoardRead → mapPlan
        ├ Kampf/Skill/Stealth → engine.playerTurn → combat.js
        └ Story → turn.playerTurnV4 → v4/commands-Handler (+ Board-Generator-LLM)
     → withGrowth (Lernziele, Angebote; bis zu 4 Forge-Aufrufe nacheinander)
     → Events am User-Record → turnBlock (zweiter Fold) → Engine-Block
└ Narrator (eigene ST-Generation: Vertrag auf der Karte + Engine-Block + 4 letzte Austausche)
└ MESSAGE_RECEIVED → processReplyAny (Status pending) → world_jobs
     Extractor-LLM (≤3 Versuche) → parseExtraction (+ sceneIssues)
     → world.applyWorld: firewall → Delta-Handler (+ envelope, narration_evidence,
       V3-Adapter reportToEvents) → Events am Antwort-Record → HUD → saveChat
```

### 1.2 Zustand und Persistenz

- **Event-Sourcing:** Jede Nachricht trägt ihre Events in `extra.avereth`; der Zustand ist der Fold über alle Nachrichten.
- **Reducer:** etwa 100 Eventtypen in `state.js`, `domain.js`, `growth.js` und `living.js`. Der Reducer liest keinen Content. Würfelergebnisse stehen in den Events.
- **Swipes:** Antworten werden über `text_hash` gebunden, Eingaben über `input_hash`. Swipe, Regenerate und Reload verwenden Plan, Board und Würfel der Nachricht wieder.

### 1.3 Module

| Bereich | Module (Größe) | Kurzurteil |
|---|---|---|
| Kern | `state.js`, `v4/domain.js`, `validate.js`, `rng.js` | solide und deterministisch |
| Mechanik | `engine.js`, `combat.js` (89 KB), `skills.js`, `passives.js`, `progression.js` | überwiegend gut geschnittene Funktionen |
| Progression | `v4/growth`, `skill_growth`, `passive_growth`, `class_growth`, `feats`, `forge`, `skill_composer` | sauber getrennt: Engine rechnet, LLM benennt nur; einheitlich über `decision.opened/closed` |
| Eingabe | `v4/planner.js` (92 KB), `agency.js`, `commands.js` (146 KB, Handler-Map), `turn.js` | funktioniert; viele englische Zusatzheuristiken |
| Welt-Commit | `v4/world.js` (218 KB), `firewall.js`, `ownership.js`, `envelope.js`, `narration_evidence.js`, `extract.js`, `delta.js` (V3) | **Hauptproblemzone** |
| Domänen | `guild.js` (97 KB), `living.js`/`dungeon.js`, `trade.js`/`items.js`/`economy.js`, `identity.js`, `settlement.js` | Living Dungeons gut; Handel und Populationen fragil |
| Kontext | `context.js`, `v4/catalog.js`, `retrieval.js` (BM25) | drei getrennte Zustandsprojektionen, gemeinsame Formatierung |
| Host | `index.js`, `host.js`, `world_jobs.js`, `continuation.js`, `narrator_recovery.js` | sorgfältig gebaut |

Insgesamt sind es rund 27.000 Zeilen Quellcode, 202 Testdateien und 21 MB Tests einschließlich Fixtures.

### 1.4 Stärken, die erhalten bleiben sollten

1. **Klare Autoritätsgrenze und Event-Sourcing.** Zahlen gehören der Engine, die Historie ist unveränderlich. Echte Batches mit 3.923, 4.790 und 5.556 Events lassen sich mit identischem Endzustand neu falten. Das ist das Rückgrat des Projekts.
2. **Swipe-, Reload- und Barriere-Design.** Records hängen am ST-Swipe, sind per Hash gebunden und laufen nicht doppelt. `world_jobs` prüft Chatidentität, Message-Objekt, Swipe-ID und Hash, bevor es schreibt.
3. **Sichere Fortsetzung bei Fehlern.** NOT EXECUTED, `world_not_applied`, Narrator-Recovery, Retry-Budgets und Prüfung des gespeicherten Chats. Die Wirkung ist belegt: Batch 1 hatte noch 5 technische Stopps bei 6 Runs, Batch 19 hat 0.
4. **Beim Kampf entscheidet ausschließlich die Engine** (keine Trefferwürfel, nur Schadensstreuung). Die geplante Main/Minor-Regel passt ohne Umbau in das vorhandene Initiative- und Turn-Modell.
5. **Progression ohne Freitext-Mechanik.** `skill_composer` baut Fähigkeiten aus Bausteinen, die Forge liefert nur Namen.
6. **Living Dungeons:** jeder Fakt mit genau einem Eigentümer, Zufall per Seed-Hash je Zyklus, replaystabil.
7. **Messkultur:** Telemetrie pro Aufruf (Dauer, `finish`, Token, Cache), Originalzustands-Regressionen nach dem Rot/Grün-Prinzip, Ownership-Assertions in Tests (`tests/helpers.js`).
8. **Der Planner selbst ist gesund.** Bei .98 gab es 1 Repair auf 63 Aufrufe. Sein Kampfprompt ist mit 13,7k Zeichen gegenüber 39k bereits schlank.

---

## 2. Schwachstellen, nach Priorität

### S1 [N] – Kernproblem: Die Grenze zwischen LLM und Engine wird auf der Extraktionsseite über englische Freitext-Heuristiken geschlossen

Der Extraktor liefert freie Strings, etwa `species`, Itemnamen, Preis-Zitate (`said`) oder Rollen. Die Engine interpretiert diese Strings erneut mit Wortlisten und Kopfnomen-Regeln. Im Code stehen rund 1.300 Regex-Literale, davon mindestens etwa 215 Zeilen mit englischen Wortalternativen. Die meisten liegen in `firewall.js`, `intent.js`, `commands.js`, `ownership.js`, `world.js`, `planner.js` und `delivery.js`.

**Belege**

- **Kette .124 → .125 → .126:** `populationAt` (`v4/domain.js:308`) ordnet über das Kopfnomen zu. Der Fix in .126 ergänzt eine Wortliste `individual: ["adult","male","female","sow"]`.
- **Meine Sonde gegen den aktuellen HEAD:**

  | Bleibt gebunden | Fällt aus der Population (ungebunden, Fallback-Level, kein Questcredit) |
  |---|---|
  | `wild boar sow`, `wild boar yearling`, `old wild boar`, `grey she-wolf` | `red deer stag`, `red deer hind`, `grey wolf alpha`, `grey wolf bitch`, `wild boar tusker`, `wild boar matriarch` |

  Das ist dieselbe Fehlerklasse wie in .125/.126, auf Funktionsebene nachgewiesen. Natürlich aufgetreten ist sie in den Läufen noch nicht.
- **Ausrüstungswerte aus Namenswörtern:** `itemProfile`/`qualityOf` (`v4/items.js:73`, `:188`).
  - `finer longsword` und `dwarven-steel longsword` werden Common (ATK 10).
  - `quarterstaff`, `falchion`, `dirk`, `sling` und `grimoire` erhalten **kein Gearprofil**. Der Equip-Handler lehnt dann mit „the engine knows no gear values“ ab (`v4/commands.js:1288` ff.).
  - Der „finer longsword“ aus Batch 19 ist genau dieser Fall.
- **Questzählung = zwei Textabgleiche hintereinander.** Erst bindet `populationAt` beim Erzeugen, danach prüft `defeatTally` → `cullKind` beim Lesen (`guild.js:221`, `:953`). Weil der Fortschritt beim Lesen abgeleitet wird, verändert jede Matcher-Änderung rückwirkend laufende Verträge. Deshalb braucht .126 das Schutzflag `yearlings: !!s.meta.f_progression`.
- **Weitere englische Heuristiken:** `narration_evidence.js` ist ein handgeschriebener Parser für Modalität und Verneinung, `firewall.js` arbeitet mit Wortlisten wie `GUILD`/`DESK_ROLE`/`CONTRACT_DOC`, `agency.js` und `planner.js` ebenfalls (`HANDING`, `SHOWING`, `PARTING` …).

**Langfristige Folge**

- Jeder neue Wortlaut im Livetest erzwingt eine neue Regel. In den 41 sichtbaren Commits (25.–30.10.) wuchsen `src`, `content` und `index.js` um **+2.939/−816 Zeilen**, also 3,6 : 1.
- Mit E/D-Rängen, Monsterökologie und neuen Arten wächst die Namensvielfalt, und mit ihr diese Liste. Außerdem sind die Engine-Schutzmechanismen faktisch an englische Sprache gebunden [P].

### S2 [N] – Handel ist der häufigste Fehlerherd

- **16 der 39 Builds .88–.126** tragen laut Commitbetreff Korrekturen an Handel, Preis, Kauf oder Zustimmung.
- Den Fachplan „Paket B“ (engine-veröffentlichte Angebote) habt ihr am 25.10. zurückgestellt. Seitdem gab es 12 weitere Handels-Builds.

**Strukturelle Ursachen**

- **Zwei Buchungswege:** Command-Handler vor dem Narrator und Welt-Commit nach dem Narrator. Letzterer enthält aufgeschobene und bedingte Käufe: `offerLines` (151 Zeilen), `bid`, `settleDeferred`, `settleCanonicalPurchases`, `awaitsPurchase`, `handedBought` in `world.js`.
- **Preise** kommen aus Prosa-Belegen und werden über englische Zahlwörter erneut eingelesen (`coinEvidence`).
- **Werte** kommen aus Namen, siehe S1.
- **Zustimmung** wird mehrfach geprüft: `parsePlan` → `acceptanceWhy` (dieselbe Funktion noch einmal im Handler) → `evidenced` im Welt-Commit. Die Logik ist konsistent geteilt, aber über drei Stufen verteilt.

### S3 [N] – Der Welt-Commit ist ein Monolith mit einer zweiten, verdeckten Regelschicht

- **`applyWorld`** (`world.js:189`) ist **eine einzige Funktion mit 2.544 Zeilen (≈200 KB)**: rund 100 innere Helfer, rund 40 gemeinsame veränderliche Lokale (`refs`, `groups`, `bought`, `settlements`, `pendingSteps`, `arrived` …) und eine reihenfolgeabhängige Schleife über 37 Deltatypen.
- **Änderungshäufigkeit:** `world.js` wurde in **23 von 41 Commits** geändert.
- **Interner V4→V3-Adapter:** 16 Deltaarten werden zurück in V3-„Reports“ übersetzt und durch `reportToEvents` geschickt (`delta.js:221`, eine 723-Zeilen-Funktion mit eigenen `world_rule`-Ablehnungen).
- **Fünf Prüfstufen hintereinander:** parseExtraction/sceneIssues → firewall → ownership/envelope/narration_evidence → Handler → reportToEvents.
- **Folge:** Die Handler lassen sich nicht einzeln testen, und jeder Fix kann Nebenwirkungen über gemeinsame Lokale haben.

### S4 [N] – Szenen- und Ankunftschronologie treibt die meisten Extraktor-Reparaturen

- Bei .98 betrafen **30 von 38 Repair-Fehlern** die Reihenfolge von Szene und Ankunft („explicitly name this earlier scene …“, „arrival must come before …“, `extract.js:255–281`).
- Von 84 verworfenen Deltas lauteten 30 auf `scene_context` und 7 auf `no_go`. Der Run endete mit `extractor_failed` aus genau diesem Grund.
- Die Builds .99–.101, .107–.110 und .117–.120 bearbeiten weiter dieses Feld. Batch 19 ist mit 19 Extraktor-Repairs auf etwa 280 Extraktionen deutlich besser; die Struktur ist aber geblieben.
- **Spannung zum Kanon:** 02 §2 nennt „Reisen, Zeit“ als Engine-Aufgabe. Eine Ankunft bucht aber erst das `arrive`-Delta, das der Extraktor aus der Prosa liest – also faktisch die Erzählung.

### S5 [N] – Prompts wachsen durch Anlagerung; nur ein Modell für alle Rollen

- **Statische Anteile am aktuellen HEAD (aus dem Code gemessen):**
  - Planner-Story: 39.149 Zeichen
  - Extractor-System: 42.063 Zeichen
  - Narrator-Vertrag: 35.855 Zeichen
- **Pro Zug** sind das bei .98 rund 34k Prompt-Token, davon 70–85 % statische Regeln. Seit .98 wuchs der Planner um 4 %, der Extractor um 11 %.
- Dieselbe FREE-HELP-Regel steht an **6 Stellen** (`context.js`, `catalog.js`, `extract.js`, `interpret.js`, `planner.js`, Narrator-Vertrag).
- Der Cache wirkt (etwa 75–79 %), die Kosten sind also nicht das Problem. Das Problem sind Regelverdünnung, Repair-Quote und Wartbarkeit.
- **Nur ein Modell:** `v4Llm` ignoriert `purpose` und verwendet immer `oai.custom_model` (`index.js:140`). Ein eigenes Modell pro Rolle ist nicht möglich. Die Recherche nennt genau das als ungeprüften Hebel.
- **Latenz bei .98:** LLM-Zeit pro Zug Median 19,5 s, p90 37 s. Narrator Median 8,9 s, Extractor 6,0 s, Planner 2,8 s. Batch 19 lag bei etwa 2,8 Aufrufen pro Eingabe.

### S6 [N] – Die Tests prüfen überwiegend nicht die aktuelle Produktkonfiguration

- Neue Kampagnen erhalten `f_progression`, `starter_aoe` und `f_balance` (`engine.js:78`).
- Der V4-Harness `Chat4` **entfernt diese Flags standardmäßig** (`tests/v4/harness.js:29–31`). Von 63 Testdateien mit `Chat4` aktivieren nur 3 die aktuellen Flags, `fBalance` keine.
- Die Tests sind nach Patchnummern organisiert (202 Dateien). Einen Überblick, welches Modul wie gut abgedeckt ist, gibt es nicht.
- Die Originale von Batch 14–19 liegen nicht im Repo. Unabhängige Replays bleiben dadurch Handarbeit und sind in einem neuen Chat nicht wiederholbar.

### S7 [N] – Regel- und Pfadversionen hängen an verstreuten Bool-Flags

- Die Achsen: `runtime` v3/v4 × Pfad a/c × `ruleset` 1/2 × `f_progression` × `f_balance` × `starter_aoe` × `private_quests`.
- Daraus entstehen **rund 380 Verzweigungsstellen**, darunter `rulesetOf(` 138-mal und `cPath` 82-mal.
- Das C-Flag wird pro Zug von Hand durch Kampf- und Weltfunktionen gereicht (`{ c }`), statt aus der Kampagne zu kommen.
- **Inkonsistenz zum Kanon:** XP×5 gilt global für alle Kampagnen (`content/rules.json:426`). PP, Lernpunkte und Preise sind dagegen pro Kampagne geschützt. 02 sagt, Kampagnen behalten ihre gespeicherte Zahlenpolicy.
- **Ehrliche Einordnung:** Code, der ausschließlich V3 oder V4-A dient (V3-Report-Pfad in `host.js`, Interpreter-Zweig), ist nur ein moderater Anteil. Wer ihn entfernt, gewinnt spürbar, aber nicht entscheidend. Die große Komplexität steckt im aktiven C-Pfad.

### S8 [P] – Der gespeicherte Chat wächst vor allem durch Kopien

- Bei .98 waren es **25,6 KB pro Eingabe**; hochgerechnet etwa 26 MB nach 1.000 Eingaben.
- Davon sind nur **21 % Events**. **39 % sind Kopien in `swipe_info`**, weil `syncSwipe` das komplette `extra` klont. Etwa 20 % sind gerendertes HTML (`display_text`, `hud`), dazu kommt Roh-Telemetrie.
- `saveChat` überträgt den ganzen Chat, und das mehrmals pro Zug. Ein Problem ist das noch nicht gemessen; ab 500+ Zügen sollte man es messen.

### S9 [P] – Folds werden nicht zwischengespeichert

- Jeder Aufruf faltet den ganzen Chat neu, etwa 6-mal pro Zug. Dazu kommt `historyKey`, das den kompletten Chat serialisiert (`runtime.js:653`).
- Gemessen: 9,5 ms pro Fold bei 73 Eingaben. Hochgerechnet sind das etwa 130 ms pro Fold bei 1.000 Zügen, also unter einer Sekunde pro Zug. Heute unkritisch.

### S10 [P] – Kopplung an den Host

- Der Narrator-Vertrag liegt auf der Charakterkarte und muss bei Revisionswechsel manuell ersetzt werden.
- `globalThis.fetch` ist überschrieben, eng begrenzt, um Narrator-Antworten zu wiederholen.
- Der `generateRaw`-Fallback hat keine Telemetrie und keine Temperatursteuerung.
- Fold-Fehler erscheinen nur in der Statuszeile; der Zug läuft auf einem teilweise gefalteten Zustand weiter.

### S11 [N, geringe Priorität] – Die Spielereingabe wird mehrfach gelesen

- Der V3-Regexparser läuft auf dem C-Pfad bei jeder Nachricht, obwohl er nur Steuerkanäle (`#`-Befehl, Erstellung, Tod) und die Telemetrie `a0` bedient (`runtime.js:565`).
- Der Agency-Guard ist durch P0-Daten begründet (13 falsche Commitments auf 256 Nachrichten) und bleibt sinnvoll.
- Die zusätzlichen Regex-Netze um den Planner (`announcedAbandon`, `implicitBoardRead`, `skillHint`) gehören zu derselben Klasse wie S1.

### S12 [N, gering] – Historie im Quelltext

- 5.195 Kommentarzeilen stehen 19.860 Codezeilen gegenüber, mit 1.074 Verweisen auf Builds und Runs.
- Das hilft bei der Nachverfolgung, erschwert aber das Lesen. Es gibt 5 Importzyklen, darunter `state ↔ growth` und `world ↔ commands`. Das ist unkritisch.

---

## 3. Vorschläge

### V1 – Geschlossene Referenzen statt Freitextabgleich *(höchster Hebel)*

**Prinzip:** Wo die Engine eine LLM-Aussage an ein Engine-Objekt binden muss, zeigt der Katalog eine **geschlossene Liste von IDs oder Enums**. Die Engine prüft dann nur noch die Gültigkeit. Heuristiken bleiben als Fallback, etwa für alte Kampagnen oder wenn das Feld fehlt.

- **Kreaturen:**
  - `creature.new` erhält zwei Felder: `population` (Orts-ID aus PLACE ANCESTRY oder `null`) und `life_stage` (`adult`/`young`).
  - Die Engine prüft, ob der Ort in der Linie liegt und der Anker stimmt.
  - Die Daten sind bereits da: Der Katalog zeigt `population:wild boar, boar, levels 4-7` schon am Ort (`catalog.js:378`).
- **Kill-Gutschrift als Event:** Beim Tod wird die Zuordnung zu Vertrag oder Population gebucht, statt sie bei jedem Lesen aus Text abzuleiten.
  - Damit gibt es keine rückwirkenden Änderungen mehr und keine Schutzflags wie `yearlings`.
  - Das ist zugleich die Grundlage für 04 §7e (überlappende Jagden mit eindeutiger Kill-Zuteilung) und 7c (Lebenszyklus der Gegner).
- **Waren:** Angebotszeilen für Ausrüstung bekommen `base` (Content-Vorlage) und `quality` (Enum). Werte und Richtpreis rechnet die Engine; der Name bleibt Erzählung.

| | |
|---|---|
| **Nutzen** | Beendet die Fehlerklasse aus .124–.126 und die Namensfehler im Gear. Weniger Wortlisten, sprach- und modellrobuster. |
| **Aufwand** | Mittel, etwa 1–2 Fachpatches (Kreaturen/Quest getrennt von Waren). |
| **Risiko** | Das LLM kann aus der Liste falsch wählen; die Engine schützt über Anker und Linie. Schemaänderung im Extraktor nötig, mit A/B auf aufgezeichneten Antworten. |
| **Module** | `extract.js`, `deltas.json`, `catalog.js`, `world.js` (`newEntity`), `domain.js`, `guild.js`, `items.js`, `state.js` (neues Credit-Event) |
| **Einschränkung** | Kaum spürbar. Exotische Waffen werden auf die nächste Basisvorlage abgebildet; eine Unterpopulation mit abweichendem Level muss als eigene Art erscheinen. |

### V2 – Engine-veröffentlichte Angebote für Standardwaren [D, schränkt ein]

Das ist Paket B, enger geschnitten: Ausrüstung, Verbrauchsgüter und Primer werden als strukturierte Angebote geführt. Die Engine prüft sie, veröffentlicht sie einmal mit Zeilen-IDs und zeigt sie als Panel. Ein Kauf verweist nur noch auf Zeilen-IDs. Freie Erzählwaren bleiben unverbindliche Prosa.

**Light** (empfohlen, zuerst):
- Bedingte Käufe im selben Zug („geh zum Schmied, kauf wenn unter X“) bleiben erlaubt.
- Sie werden aber nur gegen ein in derselben Antwort engine-veröffentlichtes Angebot abgerechnet.
- Preisbelege über Prosa und Namenswerte entfallen für Standardwaren.

**Strikt:**
- Gekauft wird erst in der nächsten Eingabe.
- Damit entfällt die aufgeschobene Kaufabwicklung in `applyWorld` vollständig, etwa 300–400 Zeilen.

| | |
|---|---|
| **Einschränkung** | Keine spontanen Pakete oder gefeilschten Sonderwaren als mechanisch wirksame Ausrüstung (Pakete werden zwei Zeilen). Bei „strikt“ eine Eingabe mehr pro Einkauf. |
| **Nutzen** | Bricht den häufigsten Fehlerherd (S2) an der Wurzel und erledigt das Paket-Problem aus Batch 18 strukturell. |
| **Aufwand** | Groß bei „strikt“, mittel bei „light“. |
| **Risiko** | Erzählfluss beim Händler. Mit einem kurzen Panel plus Narrator-Prosa lässt sich das abfedern. |

### V3 – Reise und Ankunft entscheidet die Engine [D, schränkt ein]

- Eine legale, autorisierte `go`-Bewegung bucht die Engine vor der Erzählung.
- Ob die Reise unterbrochen wird, entscheidet ein replaystabiler Gefahrenwurf über die Zeit (die vorgemerkte Idee „ROAD AHEAD“, Modell `1−e^(−λt)` aus 04 §6a).
- Der Narrator erzählt Ankunft oder Unterbrechung. Der Extraktor meldet nur noch erzwungene Bewegungen und ungeplante Halte.

| | |
|---|---|
| **Einschränkung** | Der Narrator kann eine Reise nicht mehr spontan unterbrechen; Zwischenfälle auf dem Weg kommen nur aus dem Engine-Wurf. |
| **Nutzen** | Beseitigt den Haupttreiber der Repairs (S4) und stimmt mit Kanon §2 überein (Reisen gehören der Engine). |
| **Aufwand** | Groß. Verlangt eine Designentscheidung zu Reisegefahren. |

**Kleinere Alternative:** höchstens ein Szenenwechsel mit Weltänderungen pro Antwort. Kosten: mehr Fortsetzungseingaben bei Mehrstationsreisen. Gewinn: kleiner, aber billig.

**Empfehlung:** erst nach V1/V2 entscheiden und vorher die Chronologie-Repairs in Batch 19 und den folgenden Batches nachzählen.

### V4 – Welt-Commit nach Deltafamilien zerlegen und V3-Adapter auflösen

- Ein explizites Transaktionsobjekt `WorldTxn` ersetzt die geteilten Lokalen.
- Die Handler werden nach Familien in Module verschoben: Personen/Kreaturen, Bewegung/Szene, Handel/Geld, Quest/Gilde, Fakten/Gedächtnis, Features/Dungeon.
- Die von `reportToEvents` genutzten Teile werden direkt aufrufbar, sodass es eine Regelschicht weniger gibt.
- **Begründung** ist nicht die Dateigröße, sondern messbare Änderungshäufigkeit, die Kopplung über gemeinsame Lokale und fehlende Einzeltestbarkeit.

| | |
|---|---|
| **Voraussetzung** | Golden-Replay-Korpus (V6). Am besten **nach** V1/V2, weil diese Teile davon wegfallen. |
| **Aufwand** | Groß, aber mechanisch. Schrittweise je Familie, mit eigenen reinen Refactor-Commits. |
| **Risiko** | Subtile Änderungen in der Reihenfolge. Mitigation: alle historischen Events plus die Testsuite vor und nach jedem Schritt identisch. |

### V5 – Prompts pflegen und Modelle pro Rolle wählen

1. **Modell pro Rolle:** `index.js` reicht `purpose` an ein Setting weiter (Planner, Extractor, Board, Forge).
   - Aufwand klein, Risiko klein.
   - Ermöglicht A/B mit GLM-5.3 oder DeepSeek-V4-Pro nur für den Extraktor; laut Preflight sind diese Modelle am Endpoint vorhanden.
2. **Regelregister:** Jede Prompt-Regel verweist auf ihren Test oder Livefall. Regeln regelmäßig mit den vorhandenen Werkzeugen gegen aufgezeichnete Antworten prüfen (`bench_extract.mjs`, `narrator_ab.mjs`) und überflüssige streichen.
   - Policy-Texte wie FREE HELP stehen dann nur noch an einer Stelle und werden pro Rolle eingesetzt.
3. **Schlanker Extraktor im Kampf [D]:** reduziertes Vokabular in Kampfzügen, analog zum schon schlanken Kampf-Planner.
   - Einschränkung: Neuigkeiten des Narrators mitten im Kampf, etwa ein gefundener Gegenstand, werden erst nach dem Kampf gebucht.
   - Gewinn: kürzere Prompts in Kampfzügen. Erst messen.

**Nicht empfohlen** als Hauptmaßnahme: Structured Outputs oder JSON-Schema des Providers. 35 von 38 Repair-Fehlern waren semantisch, nicht syntaktisch.

### V6 – Belastbarere Nachweise

- **Harness umdrehen:** Standard ist die aktuelle Produktkonfiguration; Legacy-Tests aktivieren alte Flags ausdrücklich. Aufwand klein bis mittel. Einige alte Tests werden dabei rot – das zeigt nur, dass sie bisher eine andere Konfiguration geprüft haben, und ist erwünscht.
- **Golden Replay als Testschritt:** Events und Chat jedes Batches, ohne Secrets und komprimiert, ins Repo oder als Release-Asset. Ein Skript faltet alles neu und validiert nach jedem Record. Was Sol bisher von Hand macht, wird so automatisch.
- **Neue Kennzahl:** Zeit je tatsächlich ausgeführter Handlung (von euch bereits akzeptiert), dazu die Repair-Ursachen nach Klasse.

### V7 – Eine Regelversion statt Bool-Flags; Legacy-Entscheidung

- `campaign.started` erhält eine `policy`-Version. Content-Werte und Pfadlogik lesen dann `policyOf(state)` statt fünf einzelner Flags. Das C-Flag kommt aus der Kampagne, nicht mehr aus dem Zug.
- **Legacy (eure Entscheidung):** V3, V4-A und Ruleset 1 auf reines Replay einfrieren, also nur Falten und Anzeigen, keine neuen Kompatibilitätsfixes. Später eventuell entfernen.
  - Gewinn moderat.
  - Lohnt nur, wenn es keine echten Langzeitkampagnen außer Testständen gibt.
- Die XP-Policy entweder ebenfalls versionieren oder den Kanontext anpassen.

### V8 – Kleinere Härtungen *(niedrige Priorität, jeweils erst messen)*

- **Persistenz verschlanken:**
  - kein gerendertes HTML speichern, stattdessen beim Render-Event erzeugen
  - Roh-Telemetrie nur bei Repair oder Fehler speichern
  - Wachstum pro Zug grob halbieren
- **Fold-Cache** über eine Präfix-Signatur, erst ab gemessenem Bedarf.
- **Narrator-Vertrag aus der Extension einspeisen**, nicht von der Karte. Einschränkung: Spieler bearbeiten ihn nicht mehr auf der Karte.
- **Fold-Fehler im Produktivbetrieb sichtbar sperren** statt weiterzuspielen.
- **V3-Parser** auf dem C-Pfad nur noch für Steuerkanäle laufen lassen.

### Abwägung der Einschränkungen im Überblick

| Option | Einschränkung für Spieler/Welt | Technischer Gewinn | Empfehlung |
|---|---|---|---|
| V1 Populations-/Gear-Enums | kaum | hoch (S1, Questzählung, Gear) | **ja, zuerst** |
| V2 light, Engine-Angebote | keine gefeilschten Sonderwaren als Gear | hoch (S2) | **ja** |
| V2 strikt | eine Eingabe mehr pro Einkauf | zusätzlich ~300–400 Zeilen weniger | nach V2 light entscheiden |
| V3 Engine-Ankunft + Reisegefahr | keine spontanen Reiseunterbrechungen durch den Narrator | hoch (S4) | nach Messung |
| Ein Szenenwechsel pro Antwort | mehr „continue“-Eingaben | mittel | nur falls V3 abgelehnt |
| Kampf-Extractor-lite | Kampfneuigkeiten später gebucht | mittel | A/B |
| Kampfrunden als Panel, Narrator nur an Schlüsselpunkten | weniger Prosa pro Runde | −2 LLM-Aufrufe pro Runde | höchstens als **optionaler** Modus |
| Weniger freie `fact`-Deltas | gröberes Weltgedächtnis | mittel (29 % der Deltas, 28 % davon verworfen) | **nicht jetzt**; erst messen, ob Retrieval sie nutzt |
| Legacy einfrieren | alte Saves nur lesbar | moderat | eure Entscheidung |

---

## 4. Fahrplan (fachlich getrennt)

**Phase 0 – Messen und absichern** *(keine Spieländerung, klein)*
- Golden-Replay-Korpus mit Skript
- Harness-Standard auf Produktkonfiguration
- Repair-Ursachen und Zeit je ausgeführter Handlung
- Messung von `saveChat` ab 500 Zügen
- Modellwahl pro Rolle (nur die Möglichkeit, Standard unverändert)

Abnahme: Testsuite grün, Korpus aus Batch 17–19 identisch gefaltet.

**Phase 1 – Kreaturen und Jagd (V1a)**
- `population` und `life_stage` in `creature.new`
- Kill-Gutschrift als Event
- Alter Matcher nur noch Fallback für Legacy

Nicht enthalten: XP, PP, Level-Fenster.

**Phase 2 – Handel (V1b + V2 light)**
- Gear-`base`/`quality`
- Engine-Angebote für Standardwaren
- Paket-Fall aus Batch 18 als Regression

Danach anhand von Livedaten entscheiden, ob „strikt“ nötig ist.

**Phase 3 – Reise und Szene (V3 oder die Ein-Szenen-Regel)**
Designentscheidung mit Messdaten aus Phase 0, eigener Kanonbeschluss.

**Phase 4 – Struktur (V4 + V5.2)**
- Welt-Commit nach Familien zerlegen
- V3-Adapter auflösen
- Regelregister und Prompt-Bereinigung mit A/B

Nur reine Refactor-Commits mit identischem Replay.

**Phase 5 – Regelversion und Legacy (V7)**

**Unabhängig davon** kann der Main/Minor-Kampfplan jederzeit kommen; der Kampfkern trägt ihn. Er sollte nur nicht mit Phase 2 oder 3 in einen Patch gemischt werden.

### Bewusst unverändert lassen

- Event-Sourcing auf ST-Records, Hash-Bindung der Swipes, Barriere, `world_jobs` und die Mechanismen für sichere Fortsetzung
- Die Kette Planner → Engine → Narrator → Extractor. Kein Zurück zu Narrator-Function-Calling oder Inline-Reports: Die GLM-Belege aus Test 5 sprechen dagegen.
- Kampfkern, Living Dungeons, Skill-Composer und Forge nur für Namen
- Agency-Guard für Commitments (durch P0-Daten begründet), aber nicht weiter ausbauen
- XP×5, PP und Startwerte – das ist Balancearbeit, keine Architektur
- BM25-Retrieval statt Vektordatenbank
- Kein Neuschreiben im Großen; jede Phase ist für sich abnehmbar.

### Entscheidungen, die bei euch liegen

1. Gibt es echte V3-, V4-A- oder Ruleset-1-Kampagnen, die weiter spielbar bleiben müssen? (Davon hängt V7 ab.)
2. V2 light oder strikt – wie viel freies Feilschen um mechanisch wirksame Ausrüstung ist euch wichtig?
3. Ankunft durch die Engine plus Reisegefahr (V3) oder die Ein-Szenen-Regel?
4. Dürfen Original-Batchexporte (ohne Secrets) dauerhaft ins Repo oder als Release-Asset?
