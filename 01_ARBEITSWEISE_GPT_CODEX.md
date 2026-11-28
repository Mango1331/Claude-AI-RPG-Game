# Avereth Engine – dauerhafte Arbeitsweise und Freigaben

[Kopierbare Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Meilensteinstand](03_AKTUELLER_PROJEKTSTAND.md) · [Verbindlicher Produktkanon](02_DESIGN_KANON.md) · [Branchstruktur](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md)

## Verantwortung und Entscheidung

- **Spieler/Nutzer:** bestimmt Spielgefühl, Prioritäten, Kanon und endgültige Produktfreigaben. Persönliche ST-Tests und Feedback sind maßgeblich.
- **Codex:** zuständig für beauftragte technische und fachliche Analysen, Architekturuntersuchungen, Implementierungen, Tests und unabhängige Gegenreviews von GPT-Befunden; belegt Ergebnisse an Originaldaten. Bei umfangreicher Entwicklung kann Codex lokal oder in einer verfügbaren Cloud-Umgebung arbeiten.
- **ChatGPT/GPT:** unabhängige Fach-, Code- und Run-Gegenreviews; Ergebnisse als **selbst geprüft** oder **aus Implementiererbericht** unterscheiden.
- **Engine/LLM:** Planner interpretiert Spielerhandlungen, Engine bucht deterministische Fakten, Narrator erzählt, Extractor erfasst gültige Weltfolgen. Wichtig sind **Spielspaß, Spielerhoheit, korrekter Save, HUD und Revidierbarkeit** – nicht eine möglichst hohe Zahl abgewiesener Deltas.

**Aktive Werkzeuge:** Codex und GPT bleiben die reguläre Entwicklungs- und Reviewkette. Ergänzend hat der Nutzer am 27.11.2026 Claude Pro für einen Monat ausschließlich zur unabhängigen Code-/Architekturanalyse und Planung freigegeben. Claude darf beauftragte Analyseberichte und vom Nutzer beauftragte Dokumentationspflege auf `main` veröffentlichen, aber keine Produktimplementierung, keinen Produktmerge und keine Kanonänderung durchführen. Abgeschlossene Claude-Aufträge stehen im [Forschungsarchiv](recherche/archiv/README.md). Für den regulären Ablauf ist ein Claude-Abonnement nicht erforderlich. Frühere Claude-/Astra-Berichte bleiben unveränderte Fachquellen. Ihre Autorennamen, Repository- und Branchbezeichnungen sind keine aktuellen Arbeitsaufträge.

**Ein Dokumentationscommit, Modelltest oder positiver Review ist kein automatischer Produktmerge.** Nutzer entscheidet vor allgemeiner Übernahme. Keine unaufgeforderte Kampf-/Ökonomie-Neubalance und keine Sondervalidatoren ohne belegte allgemeine Ursache.

## Branches – ab dieser Etappe verbindlich

1. **`main` nur für Dokumentation und Mess-/Testindizes.** Einträge bei Etappenabschluss bündeln; konkrete Runs dürfen ihren Originalordner bekommen, ohne dass `03`, `06` oder `recherche/README` jedes Mal geändert werden.
2. **`experiment/211-scene-continuity`: feste Referenz vor den beiden folgenden Änderungen.** Nicht für neue Implementierungen bewegen.
3. **`experiment/211-openrouter-helper-single-runner`: einziger fortlaufender Entwicklungs-/Testbranch.** Folgefixes, Runneränderungen und kleine Implementierungen **direkt hier committen und pushen**; nicht für jede Untersuchung einen neuen `experiment/*`-Branch anlegen. Vor jedem Versuch HEAD notieren, bei Bedarf einzelne Vergleichscommits/Tags markieren.
4. **Historischer `.200`-Branch:** bis zur Entscheidung über einen verifizierten dauerhaften Archiv-Tag beibehalten. [Bereinigungsplan](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md). Für drei **Gesamtbranches** muss .200 nach Sicherung als Tag entfallen; bis dahin sind es vier einschließlich `main`.

**Ausnahme:** Eine größere risikoreiche Alternative darf in einem separaten lokalen Worktree oder mit einem **temporären Commit-/Tag-Snapshot** geprüft werden. Einen zusätzlichen Remote-Branch nur mit ausdrücklichem Grund/Freigabe anlegen. Temporäre Versuche nicht als neue Produktversion ausgeben.

## Arbeitsstand sichern

Nach dem Cloud-Ausfall bei der ersten .212-Implementierung gilt: Jedes abgeschlossene Teilpaket auf dem vorhandenen Entwicklungsbranch committen, **sofort regulär pushen und den Remote-HEAD verifizieren**. Vor langen Browser-/Regressionstests den erreichten Stand sichern. Ein Zwischenpush ist keine Gesamtabnahme. Lokale Codex-Arbeit im Windows-Git-Checkout ist möglich; alternativ Cloud, sofern verfügbar. Ein neues Cloud-Environment erhält nicht automatisch ungepushte Dateien eines früheren Workspaces. Keine Force-Pushes und keine konkurrierenden Implementierungsaufträge auf demselben Branch. Vor Änderungen und vor dem Push den aktuellen Remote-HEAD prüfen; abweichende Änderungen nicht überschreiben. Keine echten Providerrequests, Installationen oder Produktmerges ohne passenden ausdrücklichen Auftrag.

## Persönliche Usertests – verbindlicher Ablauf

Ein Upload der Usertest-Dateien ist bereits der Auftrag zur Archivierung und unabhängigen Auswertung:

1. GPT sichert Chat-JSONL, Eventexport, ST-Log, ursprüngliches Spielerfeedback und ggf. weitere Quellen im eigenen Runordner unter `testrun_10b/` auf main. Originale/Prüfsummen, Build, tatsächlicher Commit und belegte Datenlücken dokumentieren; ggf. lokale Pfade und Zugangsdaten vor Git-Upload redigieren und die Änderung offenlegen. Wenn eine direkte Übertragung scheitert, verifizierte Teilarchive oder nachvollziehbares Importverfahren nutzen; fehlende Originale niemals als archiviert bezeichnen.
2. GPT erstellt `REVIEW.md`, Feedback und Quellenmanifest, bewertet tatsächliche Spielprobleme und trennt gewünschte Funktionen von bloßen Erweiterungsideen. Daten aus früheren oder gelöschten Varianten und kumulativen Logs nicht doppelt zählen. Kein Patch allein aufgrund des Uploads.
3. Codex erstellt unabhängig `CODEX_GEGENREVIEW.md` im selben Runordner, prüft tatsächlichen Code und Originaldaten, reproduziert wichtige Befunde soweit möglich und berichtet Unterschiede. Keine ungefragte Implementierung.
4. Nutzer und GPT entscheiden anhand beider Reviews über den nächsten zusammenhängenden Patch oder weitere natürliche Tests. Priorität für allgemeine Spielblockaden, Spielerhoheit und harte Zustandsintegrität; seltene fortsetzbare Sonderfälle zurückstellen.
5. Nur beauftragte Implementierung, passende Offline-Abnahme, unabhängiger Diffreview und ausdrückliche Test-/Produktfreigabe. Eine vollständige Suite nicht ohne sachlichen Grund nach einer rein dokumentarischen oder Versionsnummernänderung wiederholen.

## Testfolge

1. Bei einem Fehler originalen Spielertext, tatsächlich gesendete P/N/X-Requests, Antworten, HUD, Events und gefalteten **Save nach Reload** trennen. Fehlerklasse und allgemeine Ursache prüfen, keine Namens-Sonderfälle.
2. Rot auf dem Ausgangscommit, Grün auf dem Kandidaten; wichtige Gegenbeispiele, Node-/Replay-Abnahme und bei Host-/Vertragsänderungen isolierte ST-Smokes. Bestehende Fingerprints nur mit exakter sachlicher Begründung ändern.
3. **SillyTavern-Tests niemals auf persönliche Daten richten.** `tools/st_live/run_c.mjs` löscht Testchats im verbundenen Profil. Ausschließlich markierte Sandbox: `cd avereth-engine`, `npm run smoke:st:check`, `npm run smoke:st:isolated`. Fehlt ein benötigter Browser/Provider, als **nicht ausgeführt**, nicht als PASS berichten.
4. Natürliche Modellläufe sind andere Evidenz als Mock-/Replaytests. Echte Anfragen, Reasoning, Kosten, Revisionsfälle und Abbrüche getrennt dokumentieren. Laufende Tests auf **festem Checkout** beenden, nicht still im Prozess den Branch wechseln.
5. GPT-Gegenreview vor allgemeiner Übernahme. Nur neue belegte Ursachen weiterverfolgen – keine endlose Patch-/Review-Schleife.

## Dokumentation nur beim Etappenabschluss

| Ort | Inhalt und Pflege |
|---|---|
| **`02_DESIGN_KANON.md`** | Verbindliche Produktregeln und ausdrücklich entschiedene spätere Änderungen; historische .200-Regeln nicht still als .211-Regeln ausgeben |
| **`03_AKTUELLER_PROJEKTSTAND.md`** | **Ein einziger kurzer Snapshot der letzten abgeschlossenen Etappe**: Baseline, aktueller Arbeitszweig, Entscheidung und nächste Etappe |
| **`05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md`** | Dauerhafte Branch-/Tagentscheidung und Archivstrategie; kein tägliches HEAD-Protokoll |
| **`06_PATCH10B_MASTERPLAN_UND_REVIEWS.md`** | Etappenindex mit Verweisen; **keine** komplette Wiederholung von Fachberichten |
| **`recherche/`** | Ausführliche Untersuchungen, Reviews und begründete technische Entscheidungen. Im Forschungsindex pro **Etappe** eine Sammelzeile |
| **`testrun_10b/`** | Jeder Run erhält Originale, Manifest, nachvollziehbare Berichte; der Runindex gruppiert **Etappen**, nicht jede Testantwort |
| **`testrun_10b/durchschnittsmessungen/`** | Vergleichbare Mittel-/Medianmessungen; ältere Architektur getrennt im Archiv |

**Änderungstakt:** Kleine Commits, gezielte Regressionsläufe, neue Einzelruns oder Tokenmessungen erfordern **keine** routinemäßige Änderung an `03`, `06`, `05` oder dem Forschungsindex. Runordner und Reviews werden trotzdem unmittelbar archiviert; bei ausdrücklicher Übergabe oder gebündelter Pflege darf der aktuelle Snapshot den offenen Reviewstatus nennen. Ein einziger gebündelter Dokumentationscommit nach der Etappe genügt. Alte Inhalte **nicht duplizieren**, sondern auf unveränderliche Originalberichte oder historische Git-Commits verlinken. Historische Fachpläne und ältere Runs in Archivregistern führen. Physische Originalpfade nur ändern, wenn Links, Elternpräfixe, Replays, Prüfsummen und Reproduktion erhalten bleiben. Testquellen mit festen Verbraucherpfaden in-place archivieren. Dokumentationspflege erfordert keinen fingierten Node-/ST-Test; Links, Diff und HEAD genügen.

[Frühere ausführliche Arbeitsanweisung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/510846a3d3185cd85e510e4f3d0c4f024c6f360e/01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Fachquellen](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Runindex](testrun_10b/README.md).
