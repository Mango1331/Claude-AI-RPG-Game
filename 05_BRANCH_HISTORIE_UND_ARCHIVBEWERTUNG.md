# Avereth – Branch- und Archivstrategie nach der .211-Etappe

**Bestandsprüfung 24.11.2026:** **34 Remote-Branches**, **keine offenen Pull Requests**, keiner der gemeldeten Branches geschützt. `main` ist die Dokumentationslinie und hat eine von der Produktlinie `.200` **abgewichene Git-Historie**; die beiden Branches sind nicht austauschbar.

## Drei dauerhaft gewünschte Branches

| Dauerhaft | Zweck | Vor Beginn der Bereinigung überprüfter Commit |
|---|---|---|
| **`main`** | Dokumentation **nur bei Etappenabschluss** | [letzter Stand vor der Bereinigung](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/510846a3d3185cd85e510e4f3d0c4f024c6f360e) |
| **`experiment/211-scene-continuity`** | **Unveränderte Baseline vor zwei offenen Folgeschritten** | [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| **`experiment/211-openrouter-helper-single-runner`** | **Aktiver Code- und Testbranch:** Besitzfix + neuer Runner, künftige Implementierungen direkt hier | [`a1361d73`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a1361d734e30b5831db1b164222d17b1a94b74a6) |

**Vierte Übergangsreferenz:** `claude/c-planner-prototype-2026-10-02-gpt-c666` ([Produkt `.200`, `0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b)). **Noch nicht löschen**, solange seine dauerhafte Archivierung als verifizierter Remote-Tag fehlt. Erst nach Sicherung kann der .200-Branch wegfallen, ohne den Produktstand zu verlieren. Dann sind es **genau drei Remote-Branches insgesamt**.

## Aufräumen ohne Datenverlust

- Bereits vorhandene Experimentbranches `.203`–`.210`, historische Nebenalternativen und alte Testbranches sind **keine** laufenden Entwicklungszweige mehr. Einzelne Codevarianten bleiben für die Forschung wichtig.
- Vor Branchlöschung **jede entfernte Spitze** mit einem eindeutigen, remote gepushten Archiv-Tag (`archive/heads/<alter-branchname>`) bewahren; den `.200`-Stand zusätzlich als `archive/product-200-frozen`. Ohne diesen Nachweis keine Löschung. So bleiben alte Commits und ihre Eltern über Git erreichbar. Tag- und SHA-Nachweise in Git committen; die langen historischen Einzellisten nicht hier wiederholen.
- `tools/maintenance/prune_remote_branches.ps1` ist ein **Sicherungs-/Aufräumskript für den lokalen Git-Client**. Standardmäßig zeigt es einen **Dry Run**. Erst `-Apply` erstellt/verifiziert Remote-Archivtags und löscht mit SHA-gebundener Lease alle nicht mehr benötigten Remote-Branches; **`.200` bleibt zunächst erhalten** (danach vier Branches). Optional `-Apply -Archive200` sichert/löscht auch den historischen Produktbranch und erreicht das Drei-Branch-Ziel.
- **Stand dieser Dokumentationsetappe:** Das Skript ist vorbereitet; **Remote-Branches sind dadurch noch nicht gelöscht**. Vor einem produktiven Löschlauf müssen die GitHub-HEADs erneut unverändert bestätigt werden. Falls ein anderer Entwickler einen Branch inzwischen fortgesetzt hat, **abbrechen, nicht erzwingen**.
- Keine Test-Originale, binären Archive, Forschungsberichte oder alten Produktcommits löschen. Kürzungen betreffen die **Übersichten**, nicht Quellenbelege.

## Zukünftiges Arbeiten

Astra und GPT erhalten den **bestehenden Arbeitsbranch** und implementieren dort direkt. Nach jedem Fix HEAD und Diff protokollieren, aber keine eigene neue experimentelle Remote-Verzweigung anlegen. Zwischenstände für Replays mit **Commit-SHAs oder Tags**, die Baseline bleibt fix. Nur der Nutzer entscheidet eine Produktübernahme, einen neu benannten Meilensteinbranch oder die endgültige `.200`-Archivlöschung.

[Meilensteinstand](03_AKTUELLER_PROJEKTSTAND.md) · [Dauerhafte Arbeitsregeln](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [historische detaillierte Branchaufnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/292a4372654f027fb579bf8e338ff9d25d981da7/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md).
