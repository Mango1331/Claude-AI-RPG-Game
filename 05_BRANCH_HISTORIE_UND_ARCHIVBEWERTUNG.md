# Avereth Engine – historische Branches, Erkenntnisse und Archiventscheidung

**Stand:** 22. Oktober 2026 · **Dokumenttyp:** historisches, **nicht bindendes** Entwicklungsarchiv.  
**Quellen:** die vier aktuellen Projektdateien `01`–`04` auf `main`, GitHub-Branchliste, Git-Vorfahrenvergleich und die tatsächlichen Dokumente/Commitlisten der drei abweichenden historischen Branches.  
**Referenz:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` bei `ef4a819d5b1be76b4229745268172d0da5ce5dd5` (Build `4.3.0-c.6.6.27`), Dokumentationsbranch `main` bei Bestandsaufnahme `e82b26348514576fd005dcf0a0afbc0fdbed9f51`.

> **Dieses Dokument nimmt keine alten Mechaniken in den Kanon auf.** Verbindlich sind weiterhin `02_DESIGN_KANON.md` und die tatsächliche Engine; `03` ist der überprüfbare Projektstand, `04` enthält offene Ideen und Reviews. Die unten genannten Commit-IDs sind historische Anker, keine Aufforderung zum Cherry-Pick oder Merge.

## 1. Entscheidung und Sicherheitsgrenze

Zum Stichtag existierten **18 Branches**: `main`, ein aktiver Entwicklungsbranch und **16 alte Branches**. Die Historie von **13 alten Branches ist vollständig in `ef4a819` enthalten** (GitHub-Compare: 0 eigene Commits). Sie sind redundant und können als Branch-Referenzen entfernt werden, ohne dass ihre Commits aus der aktuellen Entwicklungshistorie verschwinden.

**Drei alte Branches weichen ab** und besitzen eigene Commits: `Testrun-v1` (1), `chatgpt/narrator-gm-tools-2026-10-02` (30), `claude/c-planner-prototype-2026-10-02-gpt-no-temperament` (4). Ihre Ideen und historischen Ergebnisse werden nachstehend eingeordnet. **Ihre einzigartigen Commits sind durch dieses Markdown allein nicht dauerhaft als Git-Objekte geschützt.** Vor dem Löschen dieser drei Branch-Referenzen ist ein dauerhaftes Tag oder eine andere unabhängige Sicherung auf die jeweiligen HEAD-SHAs erforderlich. Ein URL-Verweis auf einen SHA ist kein Ersatz für eine Git-Referenz.

**Zielansicht:** Nur `main` (langfristige Projektdokumentation) und `claude/c-planner-prototype-2026-10-02-gpt-c666` (produktive Entwicklung) bleiben aktive Branches. Historische Varianten sind **keine** alternativen Entwicklungsziele.

## 2. Bewahrenswerte Erkenntnisse aus den drei abweichenden Branches

### 2.1 Narrator-GM-Tools / Architektur B / Herkunft von Architektur C

**Branch:** `chatgpt/narrator-gm-tools-2026-10-02` · **HEAD:** `717e2f7a12c5d2d11963aa7cc50a497ca6bad751` · **30 nur dort vorhandene Commits**.

**Historischer Nutzen:** Dieser Branch ist ein Forschungs- und Vergleichsprototyp, **nicht** der heutige Produktpfad. Er enthält die frühen Architektur-B-Experimente mit Function Calling im Narrator und die Untersuchungen, die zur Architektur C führten:

- `avereth-engine/docs/ARCHITECTURE_REVIEW_GM_TOOLS.md`: Vergleich von A (Gen 3.5), B (Narrator führt GM-Tools aus) und C (semantischer Planner vor der Engine). **Ergebnis:** B nicht in die Produktentwicklung mergen; die Host-Komplexität durch Tool-Rekursion, Sitzungs-/Swipe-Zustände, mehrfach benutzte Tool-IDs, Abhängigkeit von Function Calling und LLM-initiierter Persistenz überwiegt. Nach Host-Fixes wurden 13 B-Host-Prüfungen in drei Modi bestanden; das macht B **nicht** zur ausgewählten Zielarchitektur.
- `avereth-engine/docs/P0_S4B.md` und `tests/eval/s4b_cases.jsonl` / `s4b_scenes.json`: historische Evaluation freier Spielersprache, **91 Fälle und 7 Szenen**. Das Material begründete die semantische Planner-Richtung. Ergebnisse auf dem damaligen Korpus gelten nicht als unabhängiger Beleg für später neu entwickelte Validator-Regeln; dafür braucht es Holdout und reale Runs.
- `avereth-engine/docs/ARCHITECTURE_C.md`, Revision 3: **Planer → restriktiver Validator → deterministische Engine → Narrator → validierte Weltpersistenz**. Zentrale Invarianten: Spieleraktion, Ziel, Skill und Handlungsreihenfolge nicht heimlich ersetzen; bei Mehrdeutigkeit klären statt raten; keine stillen Standardangriffe; Mechanik, Kosten und Zufall bleiben Engine-hoheitlich; Swipes ändern nicht die bereits auf der Spielernachricht gebuchte Mechanik. Die tatsächlich implementierte heutige C-Architektur **hat sich seitdem weiterentwickelt**; diese Datei ist kein aktuelles API-Design.
- `avereth-engine/docs/RESEARCH_NL_TO_ENGINE.md` und `ARCHITECTURE_GM_TOOLS.md`: historische Grundlagenforschung und nicht für die aktuelle Engine zu übernehmende GM-Tools-Skizzen.

**Bewahren als allgemeine Engineering-Erkenntnisse:** LLM deutet Intention, Validator verhindert stillen Bedeutungswechsel, JS-Engine hält deterministische Wahrheit, World-Extractor unterliegt Firewall und Ownership, echte SillyTavern-Integration benötigt eigene Smoke-Tests; Unit-Tests allein erkennen Host-Rekursion-/Swipe-Fehler nicht. Diese Grundlinien sind inzwischen Bestandteil von C. **Nicht bewahren als neuen Patch:** Narrator-als-GM mit Engine-Function-Tools und eigenem Tool-Transaktionssystem.

**Einordnung:** Forschungszweig abgeschlossen; keine aktive Alternative zu C. **Vor Branch-Entfernung archivieren**, weil 30 nicht integrierte Commits und Vergleichswerkzeuge vorhanden sind. Vorgeschlagener Tag: `archive/2026-10-02/narrator-gm-tools` auf `717e2f7a12c5d2d11963aa7cc50a497ca6bad751`.

### 2.2 No-Temperament-Gegenexperiment

**Branch:** `claude/c-planner-prototype-2026-10-02-gpt-no-temperament` · **HEAD:** `4e84f5e4285c9036e1da2ade2b4e91266becf4cc` · **4 eigene Commits** (6.–7. Oktober 2026).

**Versuchsfrage:** Die Version `4.3.0-c.6.5-gpt-notemp` entfernte vorab gesetzte Verhaltenskategorien wie `skittish`, `aggressive`, `defensive` aus Engine und Content. NPC-/Monsterentscheidungen sollten auf tatsächlichem Schaden, Haltung, Position, Rolle und in der Story explizit etabliertem Intent beruhen; das war bewusst **kein** byte-identischer Vergleich zum damaligen Ausgangsbranch.

**Was davon wichtig bleibt:** Ein Temperament ist keine zwingende Handlungsvorschrift. Sonst fliehen Gegner mechanisch grundlos, laufen auf Endlosdistanz oder widersprechen narrativ etablierten Absichten; wichtiger sind kausaler Kampfstatus und klare Interaktion. Dies entspricht unserem Spielerqualitätsprinzip. Der aktive C-Pfad hat später mit dem .24-Hotfix (u. a. `src/combat.js`: `const temper = ctx.c ? null : …`) eine **gezielte Entkopplung vom Temperament** erhalten; die vollständige Entfernung sämtlicher Temperamentdaten aus dem gesamten System wurde dagegen nicht übernommen.

**Bewertung:** Eigenständiger Implementierungsansatz **nicht als aktueller Patch geplant**. Nur bei erneut nachgewiesenen Temperament-/Kausalitätsfehlern als Gegenprobe ansehen; keine pauschale Übernahme. Historisches Dokument: `avereth-engine/docs/PROTOTYPE_C.md`, Abschnitt „Experiment 4.3.0-c.6.5-gpt-notemp“ auf diesem Branch.

**Sicherung vor Entfernung:** Tag `archive/2026-10-07/no-temperament` auf `4e84f5e4285c9036e1da2ade2b4e91266becf4cc`.

### 2.3 `Testrun-v1` – alte Test- und Loggerartefakte

**Branch:** `Testrun-v1` · **HEAD:** `06b53578e6bd9548540704e858b03a96d5acf102` · **1 eigener Commit** vom 23. September 2026.

Einzigartige Dateien gegenüber dem Entwicklungsbranch: `CMD Silly Tavern Logger.md` (großer damaliger Completion-/Prompt-Log) und `RPG Test - 2026-09-23@04h36m27s796ms.jsonl`. Dies sind historische Rohprotokolle, **kein** alternativer Codepfad, keine neue Mechanik und keine offene Entwicklungsentscheidung. Die spätere Engine wurde in anderen, dokumentierten Läufen weiterentwickelt. Die Originalrohdaten werden bewusst nicht in dieses kurze Hauptarchiv kopiert, schon um alte Completion-Inhalte nicht erneut unkontrolliert zu verbreiten.

**Bewertung:** Im Alltag entbehrlich; bei Rückverfolgung des frühen Narrator-Verhaltens oder damaliger API-Anfragen möglicherweise nützlich. Wenn die Rohdaten erhalten bleiben sollen: Tag `archive/2026-09-23/testrun-v1` auf `06b53578e6bd9548540704e858b03a96d5acf102`. Ohne Archiv-Tag würde die Löschung als Branch-Ref den dauerhaften Zugang zu diesen einzigartigen Dateien nicht garantieren.

## 3. Die 13 vollständig übernommenen und als Branch redundanten Stände

Alle folgenden HEAD-Commits sind beim Abgleich **Vorfahren von `ef4a819`** (0 ausschließlich auf ihrem Branch vorhandene Commits). Die alten Branch-Namen werden nicht mehr gebraucht; ihre Git-Historie bleibt über den aktuellen Entwicklungsbranch erreichbar.

| Entfernbarer alter Branch | Historisches HEAD |
|---|---|
| `chatgpt/v4-livetest-fixes-2026-09-28` | `a067bd0cdad9deee5ada47011ccf7750a59248aa` |
| `claude/c-planner-prototype-2026-10-02` | `cd7a83393fcc2ba9354ffed1e876ba8a3883ba38` |
| `claude/c-planner-prototype-2026-10-02-gpt` | `e7606624f6f118979171925bc5c9e092e5c8a934` |
| `claude/c-planner-prototype-2026-10-02-gpt-c66` | `6f5404c16e3b1b56ab03a62b9abb040d00468180` |
| `claude/c-planner-prototype-2026-10-02-gpt-c661` | `abe528a3669f5a8251905735f688367fe3ab8188` |
| `claude/c-planner-prototype-2026-10-02-gpt-c662` | `93047fecefcf839c810f98fa0a2ad385905bab05` |
| `claude/c-planner-prototype-2026-10-02-gpt-c663` | `b6e2abac5b563c05622cf3d570981cdbac6c4c6c` |
| `claude/c-planner-prototype-2026-10-02-gpt-c664` | `411255ed08bbd4f879d13f6502a3c0b70cca097a` |
| `claude/c-planner-prototype-2026-10-02-gpt-c665` | `75f26182493246a4afa2bd09311130b736e1a847` |
| `claude/gen35-world-envelope-2026-10-01` | `90bd4501be4c007fd3b80e8ee1c42257a4853df2` |
| `claude/happy-wright-1a4y19` | `1cbfdd415a7f0416ae6cd396271f7f5a4a3bb750` |
| `claude/v4-integration-2026-09-30` | `d7ef49b2d8dc36a306a3578a826bc451ff03ca0e` |
| `claude/v4-integration-fixes-2026-09-30` | `32b8f46f2be60370e23f9a429d09c7afeb8defc7` |

**Wichtig:** Git-Vorfahre heißt „Commitgeschichte ist erreichbar“, nicht „jede historische Idee bleibt im aktuellen Dateistand enthalten“. Die tatsächlich übernommenen und verworfenen Designentscheidungen sind getrennt in `02`, `03`, `04` und den Patchdokumenten des Entwicklungsbranches festgehalten.

## 4. Sicheres Aufräumverfahren und Abschlusskontrolle

1. Unmittelbar vor der Aktion Branch-HEADs gegen obige SHAs prüfen; bei Abweichung **nicht** unbesehen löschen.
2. Die **13 vollständig enthaltenen** Branch-Refs können direkt entfernt werden (z. B. GitHub → Branches → Papierkorb). Sie benötigen zur Commit-Erhaltung keine zusätzlichen Tags, solange der aktive Entwicklungsbranch die Historie enthält.
3. Für die **drei abweichenden** Branches erst drei Tags auf ihre angegebenen HEADs erstellen und deren Remote-Existenz prüfen; **erst danach** die Branch-Refs entfernen. Tags sind die für das Projekt geeignete Archivform; eine bloße Markdown-Zusammenfassung oder SHA-Verlinkung allein schützt die ungemergten Git-Objekte nicht.
4. Am Ende: `main` und `claude/c-planner-prototype-2026-10-02-gpt-c666` vorhanden; keine versehentlich bewegten HEADs; bei drei Archiv-Tags exakte SHA-Zuordnung. Nach jeder Löschung prüfen, statt Fehlermeldungen zu übergehen.
5. **Status zum Anlegen dieser Datei:** Branches und Tags wurden von diesem Dokument **nicht** geändert. Das Archiv ist eine **Bewertung und Aufbewahrungsentscheidung**, kein Nachweis durchgeführter Löschungen.

**Keine Umsetzung aus historischen Alternativzweigen ohne neuen Livetest-Befund und explizite Designentscheidung.** Als nächste echte Entwicklungsarbeit gilt weiterhin der in `03`/`04` beschriebene Patch-8.2-Livetest und danach die evidenzbasierte Entscheidung über Benchmark, QoL, ROAD AHEAD und Patch 9.
