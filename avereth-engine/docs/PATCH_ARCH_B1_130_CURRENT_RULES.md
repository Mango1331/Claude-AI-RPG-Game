# Architekturpatch Etappe B1 (.130) – aktuelle Regeln statt Kampagnenvarianten, Versionsschutz

Build **`4.3.0-c.6.6.130`** auf dem Produktbranch, Grundlage `5635316` (.129). Verbindlicher Plan:
`patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md` (main), §4 B1. B2, C und D sind nicht begonnen.

## B1.1 – Entfernte Schalter

`f_progression`, `f_balance`, `starter_aoe` und die Yearling-Option werden nirgends mehr als Kampagnenvariante
ausgewertet. Ihr bisheriger „an“-Wert ist die einzige Regel; die Werte selbst sind unverändert. Neue Kampagnen schreiben
die drei Felder nicht mehr, der Reducer übernimmt sie nicht mehr nach `state.meta`. Kein neues Feld, keine Migration.

| Datei | entfernte Lesestellen (Diffzeilen) | jetzt fest |
|---|---|---|
| `src/engine.js` | 10 | `startCampaign` ohne `fBalance` und ohne Schreiben der Schalter; `materialise`: Ort der Begegnung inkl. `e.at`, lokale Danger-Linie, Wildnis-Fallback, Population, Gebietsstufen, Jungtiere; Skillkosten mit Mastery-Ausgleich |
| `src/state.js` | 1 | `meta` ohne die drei Schalter |
| `src/combat.js` | 10 | Skillkosten überall mit Mastery-Ausgleich (`skillCostAmount(..., true)`) |
| `src/skills.js` | 3 | Promotionsschwellen `rules.f_balance.promotion_progress` (C1 50, C2 75, C3 100); offensives PP-Kriterium immer |
| `src/content.js` | 1 | Startpool: `starter_aoe_pools` des Regelwerks, sonst Klassenpool |
| `src/commands.js`, `src/hud.js`, `src/display.js`, `src/context.js` | 3 / 1 / 1 / 2 | Kostenanzeige; `world_area` im Kontext; F-Marktpreise |
| `src/v4/guild.js` | 12 | Weltprogression auf dem Novice-Board; Yearlings sind Jungtiere (kein Cull-Ziel); Handbücher (80 cp); F-Zahlungsrichtwerte |
| `src/v4/world.js` | 7 | F-Itemprofile und -Retailpreis; Kreaturenpopulation; Gebietsklassifikation |
| `src/v4/commands.js` | 3 | Boardzeile mit Gegnerstufen bzw. Questlevel; lokale Habitatwahl; Gildenhandbücher |
| `src/v4/domain.js` | 2 | `namesYoung` ohne Yearling-Option |
| `src/v4/extract.js` | 1 | Delta `area` immer im Vokabular |
| `src/v4/growth.js` | 1 | LP-Tagesdeckel `rules.f_balance.lp_day_cap` (Lehrer 60, selbst 40) |
| `src/v4/items.js` | 1 | Fachhändlerbestand ohne Schalter |

Die alten Nicht-F-Werte (`rules.proficiency.promotion_progress`, `rules.growth.lp_day_cap`, `rules.growth.guild_manual_cp`)
stehen noch im Content, werden aber von keinem Code mehr gelesen (Bereinigung mit Paket E).

## B1.2 – Versionsschutz aus `campaign.started`

`campaignSupport(chat)` (`src/v4/runtime.js`) liest den eigenen `campaign.started`-Record der Kampagne (roh, damit eine
bearbeitete Begrüßung ihn nicht verdeckt). Unterstützt:

- Runtime V4, Pfad `c`, Ruleset 2, `private_quests: false`, lesbarer Startbuild, **und**
- entweder die .126-Konfiguration (alle drei Schalter `true`) **oder** keine Schalter bei Startbuild ≥ `4.3.0-c.6.6.130`.

Builds werden numerisch verglichen (`parseBuild`: `4.3.0-c.6.6.130` → `[4,3,0,6,6,130]`); fehlende oder unlesbare
Builds werden abgelehnt. Abgelehnt mit Grund: V3, Pfad A, kein gepinnter Pfad, Ruleset 1, formale private Quests,
fehlender/unlesbarer Build, ältere F-Konfiguration (teilweise Schalter oder schalterlos vor .130).

Hosteintritte (`index.js`): Interceptor (nach Kampagnenanlage, vor jedem Lesen, Planen, Record oder Save: `abort`,
leerer Prompt), `MESSAGE_RECEIVED`, `MESSAGE_EDITED`, `resumeReport` (World-Job, Report) und der World-Job selbst.
Meldung einmal pro Chat und Grund: „UNSUPPORTED CAMPAIGN — … Nothing was booked, saved or sent to a model …“.
Neue Kampagnen starten immer auf V4-C (`newRuntime()`/`newPlanner()` fest); die Einstellungsfelder Runtime/Planner
sind noch sichtbar, aber wirkungslos (UI-Entfernung mit Paket E).

## Abnahme

- **Verarbeitungskorpus** `npm run replay:check`: **2.235 Fälle, 0 Abweichungen** zur .126-Baseline (`b8d2af4`);
  0 Replay-, Fold- und Validierungsfehler. Alle zehn Korpusruns sind laut `campaignSupport` unterstützt.
- **Volle Suite** `npm test -- --test-concurrency=4`: **2460/2460**.
- **Neue Regressionen** `tests/v4/b1_current_rules.test.js` (8): numerischer Buildvergleich; Korpus unterstützt; neue
  Kampagne ohne Schalter, mit Build, unterstützt; elf historische Konfigurationen abgelehnt (je Grund); bearbeitete
  Begrüßung; schalterlose Kampagne spielt aktuelle Werte (AoE-Pool, Schwellen, `area`, Yearling); **Host**: abgelehnte
  Kampagne über Interceptor, `MESSAGE_RECEIVED`, `MESSAGE_EDITED`, `CHAT_CHANGED`, `MESSAGE_SWIPED` ohne Record,
  Geld-/Zeitänderung, Save und Provideraufruf, eine Meldung; aktuelle Kampagne läuft normal (Planner, Record, Engineblock).
- **Rot:** auf `5635316` (.129) rot (Schutz fehlt); mit entfernter Interceptor-Schutzzeile rot genau im Host-Ablehnungstest.
- **Chromium-Mock-Smoke** `node tools/browser_smoke.mjs`: **OK** (Legacy-Seite: V3, Pfad A, ältere F-Konfiguration,
  unlesbarer Build je abgelehnt ohne Speichern/Anfrage; V4-Seite spielt jetzt V4-C).
- **Echter SillyTavern 1.19.0** `npm run smoke:st:c`: **OK**, ebenso Failsoft-Variante (`AVERETH_SMOKE_FAILSOFT=1`);
  frische schalterlose .130-Kampagne, Status `integrity: OK`, keine Seitenfehler, kein Schlüssel im Browser.

### Äquivalenznachweis für die angepassten Tests

Die 68 nach dem Umbau roten Tests wurden zusätzlich auf `.129` mit eingeschalteten Schaltern im Testharness
(`Chat4`, `campaign()`) ausgeführt und mit B1 verglichen. Jede verbleibende Abweichung hat einen der drei Gründe:

1. **Historische Fixtures** (`live_1018_weald`, `live_1021`, Planner-C6-Run u.a.): ihr eigener Startrecord trägt keine
   Schalter, daher spielte .129 sie mit alten Regeln; B1 hat keine alte Variante mehr (das Produkt lehnt sie ab).
2. **Ruleset-1-Content** (`loadContent()`, z.B. September-Replays): .129 schrieb dort nie Schalter.
3. **Tests, die ausdrücklich die historische Variante prüften** (`delete s.meta.f_*`, „historical stays unchanged“).

Für Produktkampagnen (V4-C, Ruleset 2) ist B1 gleich .126/.129 – belegt durch den Korpus (0 Abweichungen).

### Testanpassungen (je begründet)

- **Hosttests** (`patch8_lib.campaign()`): pinnen Pfad C wie eine Produktkampagne (`Chat4` neue Option `planner`).
- **Varianten-Tests ersetzt durch aktuelle Regel:** `patch_f_progression` (keine Schalter, Build im Start; Handbuch 80 cp),
  `patch_balance114`, `patch123_pp_prices` (260 cp Retail, Offensivaward), `patch124_territories`, `patch_free_help`
  (Vokabular = Content), `patch_run21_habitat_catalog` (Variante „legacy“ entfällt), `patch_aoe116` (Arcane Burst keine
  Startwahl, erlernte Definition unverändert), `chain.test.js` (Startrecord + `campaignSupport` statt `meta`-Schalter).
- **Startpool:** Feint→Fan of Blades, Power Strike→Cleave, Arcane Burst→Arcane Wave (gleicher Slot) in `patch9a`,
  `patch9b1`, `patch9b2`, `patch9c_completion(_review)`, `live_1023_fix`, `run_report` (historische Erstellung), Sim-Konfiguration
  `tools/sim/baseline.json`. Feint-Wirkung in `patch9a` bleibt geprüft (als später erlernter Skill gesetzt).
- **F-Zahlen statt alter Zahlen:** PP-Schwellen 50/75/100 (`patch9b1`, `patch9a`), Mastery-Kostenausgleich
  (`patch9b2` Guarded Cut 6, `patch9b1` Arcane Ward P3 9), LP-Deckel 60/40 (`patch9c1`, `patch9c2b`, `patch9c2c`; der
  „Tagesanspruch verbraucht“-Fall bleibt mit einer weiteren Sitzung geprüft), Boardzeile „quest level“ (`patch81`).
- **Weltprogression auf dem Board:** Listings mit Habitat und F-Fenstern (`patch_run14_board`, `patch10b3b`, neue
  Testhilfe `progressionBoard()` für `patch9c2a`/`patch9c2b`).
- **Historische Läufe unter aktuellen Regeln, Sicherheitsabsicht erhalten:** `patch4` (Defeat-XP = gesperrte XP der zwei
  Kills, Flüchtiger keine), `fixes_4_1_5` (Wildnisstufe 3: 185/185/230 XP; Rast zwischen den Kämpfen als Vorbedingung),
  `planner_c6` (Yearling zählt nicht – eigener Assert; ausgewachsener zweiter Eber als Vorbedingung für READY/Zahlung),
  September-Replays `live_0930*` (Vorbedingung `settledLand()`: Danger „settled“ auf dem Startrealm ergibt nach aktueller
  Regel Stufe 1 – die aufgezeichneten Kämpfe laufen dadurch identisch zu .129).

## Einschränkungen / offen für spätere Pakete

- V3-, V4-A- und Ruleset-1-Code bleibt (vom Schutz abgelehnt) bis Paket E; auf Engine-Ebene sehen solche Testkampagnen
  jetzt die aktuellen F-Werte.
- Einstellungsfelder Runtime/Planner und die alten Content-Werte bleiben bis Paket E.
- Der Schutz kennt keine Teilmigration: eine abgelehnte Kampagne läuft nur auf ihrem Startbuild weiter.
