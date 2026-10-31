# Avereth Engine – Zusammenarbeit und Arbeitsweise

**Stand: 31.10.2026.** Dauerhafte Arbeitsregeln, **keine** Patch-, Test- oder Statushistorie. **Aktueller Stand in [03](03_AKTUELLER_PROJEKTSTAND.md), Designentscheidungen in [02](02_DESIGN_KANON.md).**

## Projekt, Rollen und Freigaben

**LLM versteht und erzählt wie ein GM; die deterministische JS-Engine prüft, berechnet und persistiert wie ein Spiel.** Spielerfreiheit, glaubwürdige Konsequenzen und sinnvolles Tempo vor Simulationsbürokratie.

- **Nutzer:** Design, Priorität und Freigabe; führt natürliche SillyTavern-Batches lokal durch und liefert Originalarchive/Feedback.
- **ChatGPT/Codex:** unabhängiger Code-, Git-, Design- und Run-Gegenreview; schreibt konkrete Patchaufträge und kann auf ausdrücklichen Auftrag selbst implementieren.
- **Claude/Sol:** implementiert oder prüft unabhängig entsprechend dem jeweiligen Auftrag.
- **Größere riskante Architektur-/Designänderung:** gezielten unabhängigen Gegenreview einplanen. Ein klarer Hotfix braucht keine vorsorgliche zusätzliche Auditphase.

**Review, Patchplan, ZIP und Empfehlung sind keine Implementierungsfreigabe.** Innerhalb eines ausdrücklich freigegebenen Auftrags eigenständig arbeiten, aber nicht unbemerkt neue Mechanik, Balance, Testszenarien oder Architektur als Nebenprojekt beginnen. Vorhandene Funktionen bevorzugen. Zusammenhängende Fachkorrekturen nicht unnötig in Mikroreleases zerlegen.

## Einstieg und Quellen

Im neuen Chat zuerst nur **01 und 03 vollständig** auf `main`; danach relevant: 02 (Kanon), 04 (Ideen), 06 (Fachindex), konkrete Fachpatchnote und tatsächlich betroffene Codepfade. Historische Reviews und Archive nur für belegte Fragen, keine Pflichtkomplettlektüre.

**Vor technischen Behauptungen** Produktbranch/HEAD und betroffenen Code prüfen: `main` ist die Dokumentationsquelle, nicht automatisch der neueste Produktbuild. Nach Unterbrechung Änderungen seit dem letzten geprüften Commit ansehen; unveränderte Quellen nicht erneut lesen. Originalzip, vorhandene Completion-Requests, Engine-Events und Chat gemeinsam auswerten; schöne Prosa ist keine mechanische Buchung. Modellfehler, Enginefehler, Spielerbedienung, regelgerechten Tod und Infrastruktur unterscheiden.

## Effiziente Arbeits- und Testfolge

1. **Ursache belegen:** kleinen Originalfall reproduzieren, betroffene Host-/Event-/Persistenzpfade prüfen; Regression gegen Basis erst rot, danach grün, soweit möglich.
2. **Bei engem Integrations-/Start-Hotfix den realen Fehler früh prüfen:** minimal korrigieren, **kurzen echten ST-Hostlauf mit dem Originaleingang** bis zur ersten erfolgreichen Aktion durchführen. Nicht erst stundenlang sämtliche historischen Testmatrizen abarbeiten. Bei C/D-Mechanikpatches fachlich passende Integrationsketten wählen.
3. **Abschließend pro freigegebenem Codepatch** angrenzende Tests, aktuelle vollständige Node-Suite, Replay/Fingerprintprüfung und bei relevanten Host-/Protokolländerungen echten ST-Standard-/Failsoft-Smoke. Ein statischer Mock-Smoke ersetzt keinen Makro-Starttest und keinen natürlichen Batch; Node-, Host-, Replay- und Modell-Livenachweis getrennt benennen.
4. **Ehrlich berichten:** nur tatsächlich ausgeführte Tests und echte Ergebnisse nennen, Implementiererberichte von unabhängig geprüften Daten trennen. Nach Implementierung unabhängiger **Diff-Gegenreview**, keine wiederholte Prüfkette ohne neuen Befund.

Alte Kampagnen begrenzen die neue V4-C-/Ruleset-2-Entwicklung nicht. Historische Originalbelege unangetastet lassen, alte Zahlen und Legacy-Runtime nicht aus Prinzip weiter unterstützen. Event-/Geld-/Questintegrität, Swipe, Reload und Replay **für aktuelle Kampagnen** erhalten. Laufende Batches nie unbemerkt aktualisieren.

Kosten und Zeit an Aufgabe ausrichten: gezielte Dateisuche, zusammengehörige Arbeit bündeln, bei reiner Dokumentationspflege Inhalts-/Diff-/Linkprüfung statt Node/ST; keine neuen Berichtsdateien allein für eine Statuskorrektur. Nutzer erhält eine kompakte Entscheidung mit tatsächlichem Commit und den offenen Punkten. Deutsch, du-Form; angeforderte Patchtexte direkt kopierbar. Keine Schlüssel/Zugangsdaten in Chat/Commit/Exports.

## Maßgebliche Dokumentationsorte

| Inhalt | Ein Ort |
|---|---|
| Zusammenarbeit/Tests | **01** (hier) |
| Verbindlicher Design-Kanon | **02** |
| Laufender Produkt-/Abnahmestand und nächste Schritte | **03** |
| Bewusst offene Ideen | **04** |
| Fachquellen und Commitwegweiser 10B | **06** |
| Technische Implementierung und rote/grüne Regressionen | Jeweilige Dev-Fachpatchnote und Produktcommit |
| Natürlicher Livetest | Originalexport + `testrun_10b/<Run>/REVIEW.md`, Verweise im Runindex |

In Übersichten **nur die jeweils maßgebliche Quelle verlinken**, keine vollständigen alten Patchberichte wiederholen. Historische Vorfassungen über festen Commitlink erhalten. 03 nur bei relevantem Statuswechsel aktualisieren, 02 nur bei Designentscheidung, 01 nur bei Prozessänderung. Keine erfundenen Abnahmeergebnisse oder automatischen Freigaben.
