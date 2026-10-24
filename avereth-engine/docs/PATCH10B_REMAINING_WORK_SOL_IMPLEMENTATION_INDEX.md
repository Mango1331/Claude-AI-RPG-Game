# Avereth Engine – 10B: verbleibende Fachpatches / Sol-Implementierungsindex
**Stand 24.10.2026 – PLANUNG, KEINE NEUEN PRODUKTPATCHES**

**Projekt:** `Mango1331/Claude-AI-RPG-Game`, Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`.
**Verifizierte Produktbasis vor dieser Planung:** `4.3.0-c.6.6.66`, Produktcommit `4cd9b338773783644a79a39f367629e6aaeead05` und unveränderter Narrator-Vertrag `.55`; neuer Branch-HEAD kann ausschließlich diese Planungsdokumentation enthalten.
**Abnahme bisher:** Sol hat `npm test` 1426/1426, `tests/v4/patch10b4c2_world_jobs.test.js` 19/19 sowie echten ST-1.19-Smoke 21/21 mit Mockprovider ausgeführt. ChatGPT hat den engen .66-Diff unabhängig quellengeprüft (`06` §26.2), nicht die Tests selbst ausgeführt. Die zuerst misslungene .66-Smoke-Ausführung und `swipe_info`-Rückwechsel-Risiko bleiben offen. **Nutzer startet parallel einen neuen natürlichen GLM-`current_test` mit unverändertem Guide; Run-/ZIP-Ergebnis steht in dieser Planungsminute noch aus.** Keine bereits erfolgreiche .66-100-Züge-Live-Abnahme behaupten.

## 1. Neue normale Fachpatches statt Mini-Fix-Serie

| Fachliches Paket / eigene Patchnote | Was gehört zusammen? | Nachweis-/Freigabestatus |
|---|---|---|
| **10B-3 / Kampf & Kampfchronik** – `PATCH10B3_COMBAT_ESCALATION_AND_TRUTH_PLAN.md` | Drohung von Attacke trennen; echte autonome Ambushes erhalten; narrativ erfundene zusätzliche Treffer/Spells nicht als Memory-/Quest-/Story-Wahrheit etablieren; Combat-Records maßgeblich | **Offener bestätigter .57-Befund**, technisch spezifiziert; Implementierung nach Prüfung neuer .66-Rundaten |
| **10B-3 / Gildenboard** – `PATCH10B3_GUILD_BOARD_AUTHORITY_PLAN.md` | Nur Engine-autorisiertes offizielles Tagesboard als annahmefähige Gildenangebote; Phantomjobs und zurückkehrende abgeschlossene Verträge verhindern; private NPC-Arbeit frei lassen | **Offener bestätigter .57-Befund**, getrennt vom Combat-Fachpatch |
| **10B-4d / Narrator-Lifecycle** – `PATCH10B4D_NARRATOR_EMPTY_RECOVERY_PLAN.md` | Gültigen bereits einmal gebuchten Playerturn nach echter leerer ST-Narratorantwort höchstens einmal **über legitime ST-Swipe-/Regenerate-API** neu erzählen; keine doppelte Enginebuchung | **Offener P0-Stabilitätsbefund**, **technische Freigabe bedingt:** ST-Host-API/-Eventreihenfolge zuerst beweisen |
| **10B / Monsteranatomie & Loot** – `PATCH10B_MONSTER_ANATOMY_AND_LOOT_CANDIDATE.md` | Freie Spezies + bestehende 19 mechanische Anchors bewahren, anatomisch falsche Loot-Drops vermeiden, automatische faire Beute sicherstellen | **Design-/Bugfixkandidat; keine ausdrückliche Implementierungsfreigabe** |
| **10B / Chase & Flucht** – `PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md` | Bestehenden einmaligen `chase`-Pfad über korrekten NPC-`flee`-Intent und Spielerziel erreichen; endlose Range-Band-Schleifen abbauen | **Design-Fix-Kandidat; keine ausdrückliche Implementierungsfreigabe** |

**„Normale“ Patches:** Jeder Eintrag ist ein fachlich in sich prüfbares Arbeitspaket, nicht ein künstliches 10B-3a-1/3a-2/3a-3-Splitmodell. Sol darf die jeweils tatsächlich relevanten Module innerhalb *eines* Fachpatches ändern, mit eigener Testmatrix und eigenem technischen Abschlussreview. Erst danach der nächste Fachbereich. Keine Vermischung Combat/Gilde/Narrator nur wegen eines gemeinsamen .57-Laufes. Implementierungsreihenfolge ist ein Vorschlag **und kann durch das neue echte .66-ZIP geändert werden**.

## 2. Empfohlene Reihenfolge nach dem laufenden echten Run

**GATE 0 – Erst den gerade laufenden .66-Run original auswerten.** Aus `run.json` Build/Git-SHA/Endgrund; aus `chat.jsonl`, `avereth-events.json`, `calls.json` / `chat-completions.jsonl`, `evaluation.json`, `report.md` und Screenshots Planner-/Narrator-/Extractor-/Worldwahrheit gegeneinander prüfen. Richtig prüfen: `extraction.status`, `extract.applied`, `recovery:empty|transport`, erfolgreich-leere `commands/deltas`, `extractor_failed_soft`, `wait_ms`, langes Reasoning sowie widersprüchliche Gilden-/Kampf-/Weltbehauptungen. Fehlerfolge, Ursache und Spielerwirkung unterscheiden. Echte ST-Realität kann den bisherigen Prioritätenkatalog überholen. **Guide `tools/st_live/live/guides/current_test.json` nicht ändern.**

**GATE 1 – Solltet ihr erneut echte Stabilitätsfehler sehen:** zuerst diesen technischen P0 begrenzen und eigens mit ST-Mock-Smoke/echtem GLM prüfen. Kein 100-Züge-Test mit bekanntem unkontrolliertem Hänger und keine Vortäuschung grüner Integrationsläufe.

**GATE 2 – Fachliche 10B-Patches:** Entsprechend Original-ZIP entweder
- **Combat/Chronik (10B-3)**: alte Banditendrohung und Phantom-Arcane-Bolts mit positivem Ambush-/Multi-Hit-Nachweis, oder
- **Gildenboard (10B-3)**: offizielle Angebotswahrheit vor Narrator-Darstellung, echte Tageslisten, private Jobs unverändert;
- **Narrator-Recovery (10B-4d)** als **eigener** technischer Hostpatch, sobald die ST-Generation-API wirklich belegt ist.

**GATE 3 – Erst nach ausdrücklicher Entscheidung für einen neuen Designpatch:** Monster-Auto-Loot nach belegbarer Anatomie und bestehende Chase-Erreichbarkeit. Die beiden Quellen enthalten **konkrete Fehler-/QoL-Kandidaten**, aber kein Mandat, frei generierte Species zu beschneiden oder Zahlenbalance neu zu schreiben.

## 3. Kleiner F60-2-Restfall – reguläre Wartung, KEIN 10B-Großpatch

Der bereits verifizierte `10B-2b`-Teil F60-2 in `src/v4/world.js`/ `additionalContainerReturn` erkennt unzulässig *neu* eingeführte Behälterrückgabepflichten in manchen Formulierungen **nicht**. `06` §18.2 belegt u. a.:
- `The courier must return the empty crate.` → bereits erkannt.
- `You must bring back the empty crate to the shop.` → **nicht** erkannt.
- `The crate must go back to the shop.` → **nicht** erkannt.

**Wartungsauftrag bei Gelegenheit** (nicht ungefragt zum Guild-Patch aufblasen): Tests gegen die beiden noch unerkannten Formulierungen **rot** auf .66, minimal `additionalContainerReturn`-/Klauseltest reparieren, andere Nebensätze beibehalten; negative Gegenfälle `The wagon must be back by noon` und **wirklich im ursprünglichen Vertrag vereinbarte Rückgabe** unverändert zulässig; Replay/Delivery D1–D12 und Fullsuite/Smoke prüfen. Keine pauschale `must/back`-Blacklist, keine neue Questjurisdiktion, kein neuer Parser für ganz Englisch. Wenn der Nutzer für den nächsten großen Patch nur einen Fachbereich auswählt, F60-2 als **separaten bestehenden Wartungspunkt** dokumentiert lassen.

## 4. Weitere 10B-Bereiche: bewusst ohne implementierungsreife Patchnote

`06` §9 umfasst XP-/Level-/Gegnerstärke-/Wirtschafts-/Stone-Preisfragen, Reise-/Tageszeit-Widersprüche (Run 2) und Warte-/Performanceaspekte. **Noch kein globaler Balanceauftrag.** Insbesondere Level-×100-XP, Elite-/Bossmultiplikatoren, Lootwerte, Skillstone-Preise, Gegnerlevel, Reisekappen und Langzeit-Skalierung nicht pauschal ändern. Der ursprüngliche 10B-Simulator ist vorhanden; erst nach echten Kampfläufen und nutzerseitiger Zahlenentscheidung einsetzen. Wenn ein **konkreter neuer Livefehler** eine eigene fachliche Stabilisierung verdient (z. B. narrativ falsche Tageszeit bei bereits gebuchtem GO), aus dem Originalrun dann eine zusätzliche separate Patchnote mit eigener Red-/Green-Evidenz ableiten, nicht hier ohne Quelle „implementiert“ markieren.

## 5. Verbindliche Regeln für Sols nächsten größeren Implementierungsauftrag

1. Vorher `main`-Dateien `01` (Arbeitsweise), `02` (Kanon), `03` (aktueller Stand), `04` (Ideenpool) und **`06` (aktuelles 10B-Reviewjournal)** lesen. `avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md` als technische .58–.66-Vorgeschichte, aktuellen Produkt-HEAD und diese konkreten Fachnoten lesen.
2. **Neueste Live-ZIP und Diff vor der endgültigen Patchauswahl** kritisch gegenprüfen; historische .57-Läufe nicht als .66-Nachweis ausgeben. Bei unvollständigen Originalfiles Evidenzgrenze nennen.
3. Fachlichen Scope pro Paket komplett innerhalb **einer** Implementierung lösen; Red-Regressionen vor Fix, negative und positive Countercases, Legacy-/Save-/Replay/Swipe; dann `npm test` mit SHA/Anzahl. Produkt-/Versionsdateien nur nach **wirklicher** Implementierung anpassen.
4. Bei Host-/Narrator-/World-Job-Änderungen **echter `npm run smoke:st:c` auf ST 1.19 Pflicht**, die vor .66 aufgetretene `MESSAGE_RECEIVED`-vor-`swipe_id=0`-Reihenfolge als Regression behalten. Andere Patches mit Host-Berührung ebenso. Browser/Provider nicht verfügbar → ausdrücklich **nicht bestanden/nicht durchgeführt**, keine stille Freigabe.
5. Event-/Engine-Ownership vor Narrator-Prosa; kein freies XP/Coins/Loot/Attack/Queststatus, kein Pflicht-Re-Loot, kein zweiter Spielerzug bei Swipe/Regenerate; keine per Modell erzwungenen Nonempty-Deltas/Commands.
6. Ein zusammenhängender **Produkt-Patchbrief**, betroffene Source-/Testsuite, Red/Green, echte komplette Tests, ST-Smoke (wenn Pflicht), neue Engineversion/Commit-SHA, neuer natürlicher `current_test` nach independent Review. Historische Bugreports erhalten; auf `main` §27 Planungsstand und später neue dokumentierte **tatsächliche** Ergebnisse aufnehmen.
7. Nutzer-/ChatGPT-Gegenreview auf **Fachpatch-Ebene** vor dem nächsten Patch. Keine Micro-Fix-Serie als Standard, aber echte dringende regressionsbedingte Hotfixes sind weiterhin erlaubt.

## 6. Dokumentation und Releasegrenzen

- Diese Datei ist die **einzige aktuelle Übersichtsseite der noch nicht umgesetzten 10B-Fachpatches**; die fünf Fachnoten enthalten Details. Alte `06`-Reviews bleiben vollständig.
- Auf `main` steht §27 für diese Planung, §§13–26 für bisherige Code-/Live-Historie. Root 01–04 bleiben bei Planungsstand unverändert; `02_DESIGN_KANON.md` wird durch Planungsnotizen **nicht** um neue „verbindliche Entscheidungen“ erweitert.
- **Keine Produktänderungen, keine neue Buildnummer, kein Red-/Green-/Smoke-Ergebnis im Zuge dieser Planerstellung.** Aktueller fachlicher Ausgangspunkt bleibt .66 mit den von Sol berichteten 1426/1426 Node- und 21/21 ST-Smoke-Nachweisen; der neue GLM-Run läuft nach Nutzerangabe parallel.
