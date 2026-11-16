# Avereth Engine – Branchbestand und Aufräumfreigabe

**Aktualisiert 16.11.2026.** GitHub-Remote geprüft: **20 vorhandene Branches**, darunter `main` und der bisherige Produktbranch. Nach dieser Prüfung wurde der dritte Zielbranch `experiment/dynamic-gm-model` vom unveränderten Experimentcommit `80d5fcb` erstellt. **Das Anlegen eines neuen Branches löscht noch keinen alten.** Das Aufräumziel sind **genau drei Branches**; Löschen erst nach Prüfung der aufgeführten Sicherungen.

## Verbindliche Zielstruktur

| Behalten | Aufgabe | Ausgangsstand |
|---|---|---|
| `main` | Zentraldokumentation, Architekturberichte, pausierte Roadmap | laufende Dokumentation; kein Produktcheckout |
| `claude/c-planner-prototype-2026-10-02-gpt-c666` | **Produkt `.200`, eingefrorener Rückfallstand** | [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |
| `experiment/dynamic-gm-model` | Dynamischer kreativer GM, Engine-Werkzeuge, fortlaufende isolierte Prototypen | von [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c), enthält `.200` **plus** `experiments/architecture201` |

**Roadmap-Status: ON HOLD.** Keine Entwicklung neuer Gameplayfeatures auf dem Produktbranch bis nach Architektur- und natürlicher Qualitätsabnahme; bestehende Featurepläne in [07](07_ROADMAP_NACH_10B_ENTWURF.md) behalten ihren Inhalt, sind aber keine aktive Arbeitsreihenfolge. [Status 03](03_AKTUELLER_PROJEKTSTAND.md) und [neue GM-Analyse](recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md).

## 13 Branches direkt löschbar (vollständig im Produkt-`.200`-HEAD enthalten)

Vergleich jeweils gegen `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`: `ahead_by = 0`, Commit ist echter Vorfahre, keine ausschließlich dort erreichbaren Commits.

1. `claude/pulse-a-fix-163`
2. `claude/pulse-b-exclusions-168`
3. `claude/pulse-c-time-165`
4. `claude/pulse-c-time-166`
5. `claude/pulse-package-a-162`
6. `claude/pulse-package-b-167`
7. `claude/pulse-package-c-164`
8. `claude/v4-integration-fixes-2026-09-30`
9. `codex/balance-196-198`
10. `codex/bossloot-v1`
11. `codex/npc-e3-compact-200`
12. `codex/pulse-npc-encounter-a`
13. `codex/stat-growth-5`

Der aktuelle Produktbranch enthält deren Commits bereits. PRs #15 bis #19 sind regulär gemergt; die dazugehörigen `codex/*`-Arbeitsbranches können weg. Branchlöschung löscht keine gemergten Commits und keine PR-Historie.

## Vier Sonderbranches: erst dauerhaft archivieren, dann löschen

Diese vier Branches sind **nicht** im Produkt-`.200`-HEAD enthalten und besitzen eigene Commits:

| Alter Branch | SHA | Eigene Inhalte | Vorgeschlagener Archivtag |
|---|---|---|---|
| `Testrun-v1` | `06b53578e6bd9548540704e858b03a96d5acf102` | ein eigener Commit, alte SillyTavern-Rohdaten/Logger (`CMD Silly Tavern Logger.md`) | `archive/2026-11-16-testrun-v1` |
| `chatgpt/narrator-gm-tools-2026-10-02` | `717e2f7a12c5d2d11963aa7cc50a497ca6bad751` | **30 eigene Commits**: alte GM-Tools-Architektur, Tests und Code; für neuen dynamischen GM als **historischer Ideen- und Prototypfundus relevant**, keinesfalls pauschal mergen | `archive/2026-11-16-gm-tools` |
| `claude/c-planner-prototype-2026-10-02-gpt-no-temperament` | `4e84f5e4285c9036e1da2ade2b4e91266becf4cc` | vier eigene Commits zu NPC-/Kampfentscheidungen ohne Temperamentzwang; separates alternatives Regelverhalten | `archive/2026-11-16-no-temperament` |
| `claude/pulse-package-a` | `60682c842b90e5dca287ca9bc7d5439a6818f530` | ein eigener alter PULSE-Paket-A-Zwischencommit; produktive PULSE-Fassung liegt bereits auf `.200`, aber dieser Commit ist nicht erreichbar | `archive/2026-11-16-pulse-package-a` |

**Bedingung:** Vor Löschung jedes Branches einen dauerhaft auf GitHub vorhandenen Tag direkt auf dessen angegebenen SHA setzen, Remote-Tag verifizieren und erst dann die Branch-Ref entfernen. Ein alter Commitlink oder eine Markdown-Löschliste schützt vor Git-Garbage-Collection **nicht**. Alternativ kann ein anderes dauerhaft erreichbares Repository-Ref zur Sicherung verwendet werden. Die vier Stände sind historische Quellen, **keine Entwicklungsbranches und keine stillschweigende Produktfreigabe**.

Das GM-Tools-Archiv ist für das neue Modell besonders wertvoll: Vor einem neuen Tool-/GM-Entwurf gezielt nach bereits gelösten Problemen/Ideen durchsuchen. **Nicht** die alte divergente 30-Commit-Linie blind in `.200` mergen. Die frühere pauschale Weisung „nicht wieder GM-Tools betrachten“ aus dem Vermerk vom 22.10.2026 ist durch die neue Nutzerentscheidung **überholt**; die alten Codeannahmen sind aber ebenfalls nicht automatisch gültig.

## Ein weiterer einmaliger Branch: Prototyp übertragen

`experiment/architecture-prototype-201` steht bei [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c) **einen Commit vor** `.200`; sein HEAD ist **genau der Ausgangscommit** des neuen Branches `experiment/dynamic-gm-model`. Sobald der neue Branch geprüft ist, ist der alte Experimentbranch ohne Datenverlust löschbar. [Draft-PR #20](https://github.com/Mango1331/Claude-AI-RPG-Game/pull/20) darf dabei **nicht** in das Produkt gemergt werden; bereits **geschlossen und als überholt markiert**, nicht gemergt (16.11.2026).

## Sicherheitsgrenzen und Durchführung

1. Zielbranches über GitHub oder `git ls-remote --heads origin` erneut prüfen. Den neuen Modellbranch samt `experiments/architecture201` auf GitHub verifizieren.
2. Die vier abweichenden alten Commits über Tags archivieren und die Tags **remote** prüfen; bei einem Fehler keinen Sonderbranch löschen.
3. Nur die **13 vollständig übernommenen** und die **fünf gesicherten/übertragenen** alten Branches löschen. `main`, Produktbranch und `experiment/dynamic-gm-model` nie in den Löschbefehl aufnehmen.
4. Arbeitskopien lokal separat bereinigen (`git fetch --prune`; lokale Branches nur nach Prüfung, kein `-D` als pauschales Rezept). Kein Force-Push, kein Merge, keine Änderungen an Tests/Produktcode.
5. Nachher die GitHub-Branchliste nachzählen: **exakt drei aktive Branches**. Ein laufender externer Checkout/PR darf keinen dieser Löschbranches mehr als Arbeitsziel voraussetzen.

**Prüfstand vor tatsächlicher Löschung:** 20 alte Branches inklusive `main` und Produkt, + 1 neuer Modellbranch = 21 Remote-Branches. Ziel 3, daher **18** alte Branchrefs zu entfernen: 13 enthalten + 4 archivieren + 1 übertragener Experimentbranch. GitHub-Löschung/Taganlage wird in dieser Dokumentation **nicht** als bereits ausgeführt behauptet.

[Historischer Altvermerk mit 18er-Inventar](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md).