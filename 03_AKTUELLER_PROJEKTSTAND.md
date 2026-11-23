# Avereth Engine – aktueller Projektstand

**Meilensteinstand: 23. November 2026.** Diese Seite hält den übergeordneten, technisch geprüften Entwicklungsstand fest. Sie ist **keine fortlaufende Chronik einzelner Usertests** und wird nicht nach jedem Test oder kleinen Commit aktualisiert. Die detaillierte Testhistorie und die aktuellen Auswertungen werden in der [Usertest-Übersicht](testrun_10b/README.md) gepflegt.

## Entwicklungsstand

| Verwendung | Branch | Referenzcommit |
|---|---|---|
| Aktuelle für den persönlichen Spieltest technisch abgenommene Entwicklungsfassung **`4.3.0-c.6.6.208`** | `experiment/208-board-hazard-main-minor` | [`cb1eb944`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cb1eb944a041b26be9210199d780be9ff740f74d) |
| Eingefrorene Produktfassung **`.200`** (unverändert) | `claude/c-planner-prototype-2026-10-02-gpt-c666` | [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

**Technische Abnahme und nächster Schritt.** Die Entwicklungsfassung `.208` wurde in zwei getrennten Etappen umgesetzt und für den nächsten **persönlichen Usertest** technisch freigegeben. Sie veröffentlicht vier einzeln gültige und konfliktfreie Tagesboard-Angebote bereits nach dem ersten Modellaufruf, zeigt gebuchten Hindernisschaden unmittelbar an und unterstützt geordnete **Major-/Minor-Kampfaktionen** im HUD einschließlich Rückzug und zeitlich begrenztem Ausweichen. Die Prüfung umfasst gezielte Node-Tests, die vollständige Suite, Replay-Abgleich und isolierte SillyTavern-1.19-Smokes. Exakte Prüfzähler, Messgrenzen, bekannte Einschränkungen und die Liste der manuell auszutauschenden Engine-Dateien stehen ausschließlich im [Abnahmebericht `.208`](recherche/ABNAHME_208_TAGESBOARD_UND_KAMPFAKTIONEN.md). **Das ist keine Freigabe zum Produktmerge.**

Ältere Versionen, Entwicklungsschritte und deren Einzelabnahmen bleiben über den [Fach- und Reviewindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) und die verlinkten historischen Dokumente nachvollziehbar. Ein exakter Commit gilt immer nur für den oben genannten Meilenstein, nicht automatisch als Live-HEAD nach späteren Änderungen.

## Usertests

**Zentrale Übersicht aller persönlichen Usertests:** [`testrun_10b/` – Tests, Originaldaten, Feedback, Reviews und Gegenreviews](testrun_10b/README.md).

Dort werden neue Runs jeweils im eigenen Unterordner abgelegt und in der Testübersicht verlinkt. Auch die Fortsetzungen eines Runs, Messwerte, Originalprotokolle, Quellenmanifeste, Testfeedbacks sowie unabhängige Gegenreviews gehören in diesen Bereich – **nicht erneut als Einzelberichte auf diese Statusseite**.

[Ältere Testläufe im Archiv](testrun_10b/archiv/README.md) · [Durchschnittsmessungen und Architekturvergleich](testrun_10b/durchschnittsmessungen/README.md).

**Pflegeregel:** Die Testübersicht wird mit neuen Runs fortgeschrieben. Diesen Projektstand nur bei wesentlichen Architektur-/Release-Meilensteinen oder gebündelt nach ungefähr **zehn weiteren Usertests** aktualisieren. Einzelne neue Tests, Folgecommits und Zwischenmessungen lösen allein keine Aktualisierung dieser Seite aus.

## Weitere maßgebliche Quellen

[Designkanon](02_DESIGN_KANON.md) · [Arbeitsweise und Abnahmeregeln](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Fach- und Reviewindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Projektchronik bis Oktober](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md).
