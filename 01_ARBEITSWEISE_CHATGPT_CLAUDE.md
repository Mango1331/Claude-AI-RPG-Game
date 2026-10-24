# Avereth Engine – Zusammenarbeit und Arbeitsweise

**Stand:** 24.10.2026 · dauerhaft gültige Arbeitsregeln. **Aktueller Projektstand:** [03_AKTUELLER_PROJEKTSTAND.md](03_AKTUELLER_PROJEKTSTAND.md). Dieses Dokument enthält bewusst keine laufenden Buildnummern, Testergebnisse oder alten Patchaufträge.

## Projekt und Rollen

Wir entwickeln Avereth Engine, ein persistentes Fantasy-Sandbox-RPG als SillyTavern-Extension. Leitprinzip: **Das LLM versteht und gestaltet die Welt wie ein Game Master; die deterministische JavaScript-Engine entscheidet, berechnet und persistiert Mechanik und Zustand.** Player Agency, sinnvolle Entscheidungen, glaubwürdige Konsequenzen und Spieltempo haben Vorrang vor Simulationsbürokratie. Der verbindliche Design-Kanon steht in [02_DESIGN_KANON.md](02_DESIGN_KANON.md).

- **Nutzer:** bestimmt Gameplay-Ziele, Prioritäten, Freigabe und Implementierer; führt echte SillyTavern-Livetests durch und liefert Originalexporte sowie Spielerfeedback.
- **ChatGPT/Codex:** prüft Quellen, Code, Git und Livetests; unterscheidet Bug, Regel, Design und Geschmack; priorisiert und schreibt umsetzbare Patchaufträge. Implementiert, testet und committet auf ausdrücklichen Auftrag auch selbst.
- **Claude Code/Sol:** implementiert freigegebene Patches oder prüft unabhängig die Arbeit von ChatGPT/Codex. Wer implementiert, wird pro Auftrag bestimmt.
- **Zweite unabhängige Architektursitzung:** bei großen, riskanten oder grundlegenden Änderungen vorab kritisch gegenprüfen lassen; bei klaren kleinen Korrekturen kein obligatorischer zusätzlicher Review.

**Auftragsgrenze:** Eigenständig und vollständig **innerhalb des freigegebenen Umfangs** arbeiten. Eine Review-Priorität, eine Patchspezifikation, ein hochgeladenes ZIP oder ein Vorschlag ist noch keine Codefreigabe. „Bewerten“ bedeutet prüfen, nicht implementieren. Große freigegebene Fachpatches werden in sich geschlossen umgesetzt; unnötige Mini-Patchketten vermeiden. Gezielte Folgekorrekturen dürfen die bestehende Patchnote ergänzen und benötigen keine neue Prozessphase.

## Einstieg und Quellenprüfung

**Bei einem neuen Chat nur zwei Einstiegsdokumente vollständig lesen:** diese Datei **01** und die kompakte aktuelle Statusübersicht **03** auf `main`. Danach je Auftrag gezielt die maßgeblichen Abschnitte aus **02**, die konkrete Fachspezifikation, betroffene Quellcodepfade und bei Bedarf Originalbelege lesen. **04**, **05**, ältere Abschnitte aus **06**, historische Patchnotes, Übergaben und `docs/PROTOTYPE_C.md` sind Nachschlagequellen, keine vollständige Pflichtlektüre.

Vor technischen Aussagen Entwicklungsbranch, aktuellen HEAD und tatsächlich implementierten Code prüfen; `main` enthält die führende Projektdokumentation, nicht zwingend den aktuellen Produktcode. Bereits unverändert gelesene Dateien im selben Chat nicht routinemäßig erneut laden. **Vor jedem Schreibzugriff die aktuelle Fassung der tatsächlich betroffenen Datei und den Branch prüfen.** Lesetiefe an Aufgabe und Risiko anpassen: ein Bug verlangt betroffene Funktions-, Event-, Persistenz- und Testpfade; kein vollständiges Studium aller Archive.

## Prüfung, Tests und Kommunikation

Livetests anhand von Spielerchat/JSONL, Engine-Events und tatsächlichen Completion-Requests gemeinsam bewerten. Gute Narrator-Prosa ist **kein** Beleg für eine Engine-Buchung. Planner-, Narrator-, Extractor-, Repair- und Provider-Latenzen sowie `finish_reason`, Reasoning und Cache getrennt betrachten. Ursache und reproduzierbaren Befund vor Lösungsvorschlägen prüfen; vorhandene Integrationspunkte nutzen, keine parallele Zustandsquelle oder unnötigen Mechanikumbau einführen.

Bei Codeänderungen passende Rot-/Grün-Regressionen, Legacy/Regelstand-1-Schutz, Replay/Swipe/Reload und nach Risiko Integrationsprüfungen vorsehen; vollständige `npm test`-Abschlussprüfung pro freigegebenem Fachpatch. ST-Smoke bei relevanten Hoständerungen. **Keine erfundenen Test-, Commit-, Smoke- oder Live-Ergebnisse.** Berichte des Implementierers von selbst geprüften Quellen und selbst ausgeführten Tests unterscheiden. Nach Umsetzung ist ein unabhängiger **Gegenreview des Diffs** vorgesehen; zusätzliche vorgelagerte/abschließende Prüfrunden nur nach tatsächlichem Risiko.

Deutsch, du-Form, knapp und fachlich vollständig. Bei klarem Implementierungsauftrag nur den kopierbaren Auftrag liefern. Keine unnötigen Codes, Logs, Wiederholungen oder Höflichkeitsprosa. Keine API-Schlüssel in Chats, Dateien, Exporten oder Commits anfordern.

## Dokumentation: genau ein maßgeblicher Ort

| Information | Maßgeblicher Ort |
|---|---|
| Arbeitsweise | Diese Datei **01** |
| Verbindlicher Kanon | **02** |
| Aktueller Produkt-, Test- und Abnahmestand | **03** |
| Ideen und Branch-Historie | **04** / **05** |
| Entscheidungen und Reviews in Patch 10B | **06** (kurze verlinkte Einträge) |
| Technische Patchumsetzung | **Eine passende Fach-Patchnote** im Entwicklungsbranch |
| Original-Livetest | `testrun_10b/<Run-ID>/REVIEW.md` und Original-ZIP |

Andere Dateien **verlinken** die maßgebliche Quelle. Normale Patches nicht in sämtlichen Übersichten erneut ausführlich beschreiben; 03 bei relevanten Status-/Abnahmeschritten kurz aktualisieren, 02 nur nach neuer Designentscheidung, 01 nur bei Prozessänderung. Keine automatische neue Datei, Auditnotiz oder weitere Prüfphase. Historische Quellen und einzigartige Entscheidungen erhalten; alte Snapshots bleiben datierte Geschichte, niemals aktuelle Aufträge.
