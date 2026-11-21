# Avereth Engine – Arbeitsweise und Freigaben

**Stand 21.11.2026.** Dauerhafte Prozessregeln, **keine zweite Status-/Patchchronik**. [Startseite](README.md) · [Aktueller Stand 03](03_AKTUELLER_PROJEKTSTAND.md) · [Neues Zielbild 08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) · [Design-Kanon 02](02_DESIGN_KANON.md).

## Zuständigkeiten

- **Nutzer:** entscheidet Spielgefühl, Kanon, Prioritäten und Freigaben; führt persönliche SillyTavern-Tests und ggf. lokale LLM-Batches durch, liefert Originaldaten und ungefiltertes Spielerfeedback.
- **ChatGPT/Codex:** unabhängige Code-/Design-/Run-Gegenprüfungen, Designentscheidungsvorlagen, präzise Aufträge; implementiert nur, wenn dies ausdrücklich verlangt ist. Eigene Testzahlen nur, wenn selbst ausgeführt; sonst als Implementiererangabe kennzeichnen. Startauftrag für einen neuen Chat: [README](README.md#kopierbarer-startauftrag-für-einen-neuen-gpt-chat) (Kurzfassung; Claude schreibt die Vollfassung bei Statuswechseln neu).
- **Claude/Sol/Opus:** beauftragte Implementierung oder unabhängige technische Analysen, Originalfall-Reproduktionen (lokaler Replay-Nachlauf aus aufgezeichneten Modellantworten, `tools/replay/build_corpus.mjs`). Frühere Modellaussagen sind keine automatisch richtigen Entscheidungen.
- **Engine und LLM:** In eingefrorener .200-Basis und aktueller .203-Entwicklung interpretiert bei freiem Text der Planner, die deterministische Engine autorisiert/bucht, der Narrator erzählt und der Extractor/Firewall übernimmt legitime Weltfolgen. Die drei Rollen verursachen getrennte **physische API-Aufrufe desselben GLM-Modells**. Der frühere dynamische GM ist **archiviert**, nicht die geplante Zielarchitektur. Die historische Spielflussanalyse betrachtete eine **tolerantere, spielerunterstützte Weiterentwicklung von `.200`**, inzwischen zum Teil als .203 umgesetzt ([08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md)).

**Arbeitsgrenze 21.11.:** Produkt .200 eingefroren; Entwicklungs- und Spieltestbuild .204 (`experiment/action-hud-200-v1` = `experiment/204-b-playtest-ready`). **Persönlicher User-Test 7 läuft:** Phase 2 ist von Codex und GPT unabhängig gegenreviewt; jetzt ist die gemeinsame Patchentscheidung ausstehend. Gameplay-Roadmap 07 bleibt pausiert, die B-Performanceforschung ist vorerst abgeschlossen. Keine automatische Produkt- oder Providerfreigabe. [Run](testrun_10b/user-20261121-171341-204/README.md) · [Forschungsindex](recherche/README.md).

**Ein Fachplan, Review oder Dokumentationscommit ist keine Produktfreigabe.** Bereits beschlossener Kanon bleibt maßgeblich, ist aber bei ausdrücklicher Nutzerentscheidung bewusst änderbar. Keine weiteren P2-Sonderregeln ohne konkreten Integritätsnachweis; keine neuen Mechaniken/Balanceänderungen als Nebenprojekt. Fachlich zusammenhängende Patches bündeln, keine künstlichen Mikropatch-Serien.

## Einstieg eines neuen Chats

1. Auf `main` **README, 01 und 03** lesen; für Performancearbeit [Forschungsindex](recherche/README.md). HEADs von `main`, dem Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` **und den Entwicklungsbranches `experiment/action-hud-200-v1` / `experiment/204-b-playtest-ready`** prüfen. Für einen laufenden User-Test zusätzlich dessen Runordner in `testrun_10b/`. `experiment/dynamic-gm-model` ist **historischer Quellenbranch**, keine aktive Entwicklungsaufgabe; nur zur gezielten Archivnachprüfung lesen.
2. Aufgabe eingrenzen: **02** bei verbindlichen Spielregeln, **07** bei noch geplanten Features, **06** als Fachquellenindex. Originalarchive und technische Patchnotes nur zum konkreten Fall lesen.
3. Codebehauptungen am **aktuellen Produkt-HEAD** oder bei Experimenten gezielt am Modellbranch kontrollieren, nicht an alten Plan-Zeilennummern. Nach Kontextwechsel den letzten Produktdiff prüfen; identische Quellen nicht unnötig neu auslesen.
4. Dokumente klar als **aktuell / geplant / historischer Befund / nicht freigegeben** markieren. Ein altes Modellprotokoll ersetzt keinen neuen natürlichen Run.

## Kommunikations- und Entscheidungsgate (seit 17.11.)

1. **Zuerst Zielverständnis kommunizieren.** Vor einem weitreichenden Designentscheid die tatsächlichen Nutzerwünsche in eigenen Worten spiegeln; bei Richtungsunsicherheit gezielt nachfragen, nicht still neue Prioritäten setzen.
2. **Astra/Claude analysiert; GPT gegenreviewt unabhängig; Nutzer entscheidet.** Ein schöner Bericht oder viele Mocktests lösen keine automatische Implementierung aus. Frühere Empfehlungen – auch eigene – sind überprüfbar und dürfen verworfen werden.
3. **Bei einem Fehler auch die Regel hinterfragen.** Nicht reflexhaft einen weiteren Sondervalidator oder LLM-Repair bauen; zunächst prüfen, ob Spielerbestätigung, tolerantere Interpretation oder HUD-Hilfe ganze Fehlerklassen einfacher löst.
4. **Gezielt testen und rückmelden.** Nach freigegebenem kleinen Patch früh einen echten natürlichen Spielzug testen, inklusive HUD, Swipe/Regenerate, Weltcommit und subjektivem Spielgefühl. [Zielbild](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md).

## Arbeits- und Testfolge

1. Bei einem Fehler den kleinsten belastbaren Originalfall suchen: Spielertext, tatsächlich gelieferter Modellrequest, Modellantwort, Hostlog, Events, gefalteter Zustand und UI-Verhalten unterscheiden. Erzählt heißt nicht gebucht.
2. Gezielt **Rot gegen Ausgangsbuild, Grün nach Korrektur**; echte Gegenbeispiele prüfen. Ein korrekt abgelehnter Spielerbefehl ist nicht automatisch ein Enginefehler, ein selbsttätig erfundener Erfolg aber auch kein gültiger Spielzug. NPC-Identitäts-/Orts-/Geld-/Kampf-/Questintegrität schützen.
3. Engen Host-/Startfehler früh im **echten ST-Makro-/Hostpfad** testen, bevor umfangreiche Folgeprüfungen laufen. Dann angrenzende Tests, vollständiges `npm test`, Replay/Fingerprint-Einzelfreigaben und bei Host-/Vertragsänderungen echten ST-Standard-/Failsoft-Smoke. Diesen **nur in einer isolierten SillyTavern-Testinstallation mit eigener Datenwurzel** ausführen: `tools/st_live/run_c.mjs` verändert `data/default-user` und löscht Testchats, darf also nie an persönliche ST-Daten angeschlossen werden. **Seit 13.11.2026 in jeder neuen Umgebung:** `cd avereth-engine && npm run smoke:st:check` (nur prüfen), dann `npm run smoke:st:isolated` – baut bei Bedarf eine markierte Sandbox mit SillyTavern 1.19.0 in `<tmp>/avereth-st-sandbox` und führt Standard und Failsoft mit dem Mockprovider aus; Bericht unter `<sandbox>/out/<Zeit>/report.md`. Die Smoke-Skripte verweigern jedes nicht markierte ST ([Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/ST_SMOKE_ISOLATED.md)). Scheitert der Aufbau (Netz, Browser, Ports), den Smoke als offen ausweisen, nicht als bestanden.
4. **Natürliche Modellläufe** sind eine eigene Evidenzklasse. Geskriptete Smokes/Replay/Codeprüfung beweisen nicht NPC-Spielqualität oder PULSE-Pacing. Runende, Tod, manuellen Stopp, Provider-/Windowsfehler und Integritätsverletzung sauber trennen.
5. Nach Implementierung gezielter unabhängiger **Produktdiff-Gegenreview**. Weitere Analysen nur bei einem belegten offenen Befund; keine endlose Review-Schleife.

**Parallelbetrieb:** Ein bereits lokal gestarteter Batch bleibt auf seinem eingefrorenen Checkout; Entwickler dürfen in einem **getrennten Checkout** arbeiten und pushen. Nutzerumgebung nicht durch Pull/Deploy ungefragt umstellen. Eventlog, Save/Reload, Swipe/Edit und Regenerate der aktiven Ruleset-2-Kampagnen absichern; historische Originale nicht umschreiben.

## Dokumentationspflege

**Nutzerfreigabe vom 17.11.2026:** Vollständige neue und überarbeitete Fachberichte künftig auf `main` im passenden Dokumentationsbereich, insbesondere `recherche/`, ablegen, committen und pushen. Vorher Remote-HEAD und sauberen Arbeitsstand prüfen, zwischenzeitliche Änderungen und historische Quellen erhalten. Abschließend Dateipfade, Commit-SHA und GitHub-Links melden. Das ist eine dauerhafte Dokumentationsfreigabe, keine Implementierungs-, Build- oder Providerfreigabe. Berichte nicht mehr ausschließlich lokal oder auf einem archivierten Experimentbranch hinterlassen.

| Einziger Pflegeort | Inhalt |
|---|---|
| **02** | Verbindliche Spiel-/Kanonentscheidungen, ausdrückliche geplante Regeländerungen |
| **03** | Letzter **verifizierter** Produktbuild, neue natürliche Ergebnisse, unmittelbare Prioritäten, offene Entscheidungen |
| **07** | Featurefamilien, Reihenfolge, Abhängigkeiten, aufgeschobene Optionen |
| **04** | Neue Ideen ohne beschlossene Roadmap-Priorität |
| **08** | Historisches Spielfluss-Zielbild; mehrere HUD-Teile wurden bis .203 umgesetzt, kein aktueller Statusbericht |
| **06** | Links zu Fachplänen, unabhängigen Architektur-/NPC-/PULSE-Prüfungen und Produktnachweisen |
| **Pro-Run-Ordner** | Originalreview, Quellenmanifest, Gameplayfeedback, gezielte Folgeprüfungen |
| **Produkt und Entwicklung** | Produkt .200 eingefroren; .204 mit Patchnotes auf `experiment/action-hud-200-v1` / `experiment/204-b-playtest-ready` gesondert getestet |
| **`experiment/dynamic-gm-model`** | Archiv von B/C1 und dynamischem GM mit Fehler-/Mockbelegen, kein Entwicklungs- oder Produktbranch ([Archiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md)) |

Bei einer reinen Dokumentationspflege **keine Node-/ST-Tests vortäuschen oder als notwendig erklären**: Inhaltsvergleich, Diff-, Link-, Referenz- und Git-HEAD-Prüfung reichen. Originalreviews, Historie und spezifische Fachpläne nicht blind kürzen; in Übersichten alte Detailketten nur verlinken. Bei Änderungen mindestens Dateiliste, Art der Änderung, Commit, neue/alte HEADs und Grenzen berichten. Keine Tokens/Schlüssel/Zugangsdaten in Chat, Repo oder Originalarchive aufnehmen.

## Historie und Quellen

[Aktuelle Branch-Aufräumprüfung 05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) · [10B-Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Original-Runindex](testrun_10b/README.md) · [historische 01-Vorfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/01_ARBEITSWEISE_CHATGPT_CLAUDE.md).
