# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 17.11.2026.** Dieses README ist die Einstiegshilfe auf `main`. Aktuelle Produktdaten, Testnachweise und Arbeitsstände stehen **nur in [03](03_AKTUELLER_PROJEKTSTAND.md)**.

## Aktueller Kurs in 60 Sekunden

- **Produktbasis bleibt `4.3.0-c.6.6.200`:** [Commit `0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) auf `claude/c-planner-prototype-2026-10-02-gpt-c666`. Combat, Charaktererstellung, Leveln/Stats, Loot, NPC-Memory, Quests und HUD sind ausgereifte **Bestandsfunktionen**. Keine neue Produktversion freigegeben.
- **Der eigentliche Verbesserungswunsch:** Die sehr strenge Engine soll **weniger unnötige Reparaturen und Spezialfallprüfungen** bei Reisen, Ortswechseln, Handel und alltäglichen Zahlungen verursachen. Dem bisherigen Narrator darf sie mehr zutrauen, der Spieler darf bei Unsicherheit selbst bestätigen oder bearbeiten. [Bestätigtes Zielbild und Ideen 08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md).
- **Drei Modellphasen sind drei API-Aufrufe:** V4-C nutzt normalerweise Planner → deterministische Engine → Narrator → Extractor/Firewall, ggf. plus Reparaturen. Der Nutzer nennt alle Modellaufrufe oft „Narrator“, da überall dasselbe GLM-Modell arbeitet. Eine freiere, `.200`-basierte Architektur soll nur dort Phasen sparen, wo ihre Fachaufgabe nicht gebraucht wird.
- **Echte Fehlerlage:** Persönlicher `.200`-Waldlauf: Narratorgeschichte sichtbar, Weltabschluss/Extractor scheiterte samt Concurrency-Folgefehlern. Die alternative dynamische GM-Alpha scheiterte am 17.11. trotz drei API-Aufrufen erneut an einer einfachen natürlich erzählten Gildenankunft.
- **Zwei Experimente sind ARCHIVIERT, nicht geplant:** Hybrid B/C1 und dynamischer GM/Alpha auf [`experiment/dynamic-gm-model`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model). Ihre Fachberichte, Tests und technischen Lehren bleiben erhalten. Keine neue GM-Produktarchitektur oder Weiterentwicklung der Alpha geplant. [Archiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md).
- **Aktiv:** Abschlussanalyse durch Astra Ultra zur **kleinstmöglichen sinnvollen Flexibilisierung von `.200`**, danach unabhängiger GPT-Gegenreview und gemeinsame Nutzerentscheidung. **Noch kein Codeauftrag, kein Produktbuild.** Gameplay-Features aus 07 sind pausiert, keine alten Architektur-Experimente vorgelagert.

## Neue Ideen zur Prüfung – keine bereits geltenden Regeln

- **Combat-HUD als Eingabehilfe:** bekannte Skills, Ziele und Reichweiten direkt auswählbar; die Engine erhält den Skill und die Gegner-ID ohne Tippfehler/Planner. **Zusätzlicher freier Rollenspieltext in derselben Nachricht** bleibt möglich (z. B. Begleitern zurufen). Komplexer Freitext und Dash/Move + Attacke dürfen weiterhin den Planner benötigen.
- **Weniger starre Narrator-/Extractorbelege:** eindeutig erzählte, durch Spielerhandlung gedeckte Ankunft oder kleine Alltagsfolgen ggf. übernehmen, statt weitere Modell-Reparaturen zu verlangen. Bei Unsicherheit Vorschlag mit **„So übernehmen“ / „Bearbeiten“ / ggf. Verwerfen**.
- **Videospielartige Grundshops:** vorbereitete Alltagsangebote/Preise ähnlich Questboard; vereinfachte kleine Zahlungen. Vorhandenes `#pay`-System prüfen, bevor neue Befehle erfunden werden. Hohe oder ungewollte Buchungen bleiben besonders schützenswert.
- **Automatische Fortschrittsanzeige:** „Erzählung sichtbar / Weltabgleich läuft / ✓ bestätigt gespeichert / ⚠ Fehler“. Nächste Eingabe **schreiben ja**, vor Weltcommit **ausführen nein**; Swipe/Regenerate/Events korrekt behalten.
- **Mehr eigene Vorschläge von Astra erwünscht:** bestehende HUD- und Engine-Daten stärker nutzen und **ganze Klassen unnötiger Repair-Aufrufe** vermeiden. Alle Vorschläge vor Implementierung gemeinsam besprechen.

## Lesereihenfolge (nicht alle alten Reviews pauschal einlesen)

| Datei | Zweck |
|---|---|
| [01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) | Rollen, neue Abstimmungspflicht, Tests und Freigaben |
| [03 – Projektstand](03_AKTUELLER_PROJEKTSTAND.md) | **Einzige aktuelle Build-/Arbeits-/Testquelle** |
| [08 – Neues Nutzerziel](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) | **Verbindliches Zielverständnis**, offene Vereinfachungs- und HUD-Ideen, Abnahmefragen |
| [02 – Design-Kanon](02_DESIGN_KANON.md) | Geltende Regeln der unveränderten `.200`; zur Lockerung **noch nicht** entschieden |
| [07 – Gameplay-Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) | Pausierter Featurevorrat, keine aktive Patchreihenfolge |
| [06 – Quellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) | Technische Detailberichte und frühere Architekturprüfungen |
| [Archiv – Architekturversuche](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md) | B/C1 und GM-Alpha samt Fehlversuchen und wiederverwendbaren Ideen |
| [04 – Ideenspeicher](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) | Weitere nicht priorisierte Vorschläge |
| [Runindex](testrun_10b/README.md) | Originale User-Runs und Quellen |

## Entscheidungs- und Arbeitsregeln

**Vor Codearbeit gemeinsam klären**, was der Nutzer tatsächlich will und welches Restrisiko bewusst akzeptiert wird. Astra analysiert, GPT gegenreviewt unabhängig, Nutzer entscheidet. Keine automatische große Implementierung nur wegen eines Modells, eines Berichts oder grüner Mocktests. **Bestehende funktionierende Mechanik/UI erhalten**; neue Lockerungen an realen Freitextfällen und natürlichem Rollenspiel überprüfen. Keine neuen Providerläufe ohne Auftrag.

## Startauftrag für den nächsten Reviewer

> Projekt Avereth Engine, `Mango1331/Claude-AI-RPG-Game`. Lies auf `main` README, 01, 03 und besonders **08**. Produktreferenz `.200` / `0cd1480`; nicht den dynamischen GM als neuen Produktpfad behandeln. Analysiere bzw. gegenreviewe **Vereinfachung und mehr Freiheit der bestehenden Engine**: Reise-/Ort-/Paymentguards kritisch prüfen, HUD-Skill/Zielwahl mit freiem Rollenspieltext, Spielerbestätigung statt LLM-Reparaturen, optionaler Planner/Extractor, sichtbarer gespeicherter Zug. Alte Analysen und Experimente nur als Belege, keine automatisch richtigen Entscheidungen. **Keine Codearbeit vor gemeinsamem Nutzerentscheid.** Kurz auf Deutsch berichten, natürliche Tests von Mocks unterscheiden.

**Archivschutz:** Historische Reviews und Produktpatchnotes nicht nur wegen der neuen Richtung verändern oder löschen. Frühere [README-Fassung 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/README.md) bleibt über Git erreichbar. Diese Änderung ist reine Dokumentation.
