# Avereth Engine – Arbeitsweise und Freigaben

**Stand 12.11.2026.** Dauerhafte Prozessregeln, **keine zweite Status-/Patchchronik**. [Startseite](README.md) · [Aktueller Stand 03](03_AKTUELLER_PROJEKTSTAND.md) · [Design-Kanon 02](02_DESIGN_KANON.md).

## Zuständigkeiten

- **Nutzer:** entscheidet Spielgefühl, Kanon, Prioritäten und Freigaben; führt persönliche SillyTavern-Tests und ggf. lokale LLM-Batches durch, liefert Originaldaten und ungefiltertes Spielerfeedback.
- **ChatGPT/Codex:** unabhängige Code-/Design-/Run-Gegenprüfungen, präzise Aufträge; implementiert nur, wenn dies ausdrücklich verlangt ist.
- **Claude/Sol/Opus:** beauftragte Implementierung oder unabhängige technische Analysen. Frühere Modellaussagen sind keine automatisch richtigen Entscheidungen.
- **Engine und LLM:** Planner interpretiert, JS-Engine autorisiert/bucht, Narrator erzählt, Extractor/Firewall übernimmt legitime Weltfolgen. Spielspaß, Spielerhoheit und persistente Konsistenz vor Vollsimulation.

**Ein Fachplan, Review oder Dokumentationscommit ist keine Produktfreigabe.** Bereits beschlossener Kanon bleibt maßgeblich, ist aber bei ausdrücklicher Nutzerentscheidung bewusst änderbar. Keine weiteren P2-Sonderregeln ohne konkreten Integritätsnachweis; keine neuen Mechaniken/Balanceänderungen als Nebenprojekt. Fachlich zusammenhängende Patches bündeln, keine künstlichen Mikropatch-Serien.

## Einstieg eines neuen Chats

1. Auf `main` **README, 01 und 03** lesen. Die tatsächlichen Remote-HEADs von `main` (Dokumentation) und `claude/c-planner-prototype-2026-10-02-gpt-c666` (Produkt) ermitteln.
2. Aufgabe eingrenzen: **02** bei verbindlichen Spielregeln, **07** bei noch geplanten Features, **06** als Fachquellenindex. Originalarchive und technische Patchnotes nur zum konkreten Fall lesen.
3. Codebehauptungen am **aktuellen Produkt-HEAD** kontrollieren, nicht an alten Plan-Zeilennummern. Nach Kontextwechsel den letzten Produktdiff prüfen; identische Quellen nicht unnötig neu auslesen.
4. Dokumente klar als **aktuell / geplant / historischer Befund / nicht freigegeben** markieren. Ein altes Modellprotokoll ersetzt keinen neuen natürlichen Run.

## Arbeits- und Testfolge

1. Bei einem Fehler den kleinsten belastbaren Originalfall suchen: Spielertext, tatsächlich gelieferter Modellrequest, Modellantwort, Hostlog, Events, gefalteter Zustand und UI-Verhalten unterscheiden. Erzählt heißt nicht gebucht.
2. Gezielt **Rot gegen Ausgangsbuild, Grün nach Korrektur**; echte Gegenbeispiele prüfen. Ein korrekt abgelehnter Spielerbefehl ist nicht automatisch ein Enginefehler, ein selbsttätig erfundener Erfolg aber auch kein gültiger Spielzug. NPC-Identitäts-/Orts-/Geld-/Kampf-/Questintegrität schützen.
3. Engen Host-/Startfehler früh im **echten ST-Makro-/Hostpfad** testen, bevor umfangreiche Folgeprüfungen laufen. Dann angrenzende Tests, vollständiges `npm test`, Replay/Fingerprint-Einzelfreigaben und bei Host-/Vertragsänderungen echten ST-Standard-/Failsoft-Smoke.
4. **Natürliche Modellläufe** sind eine eigene Evidenzklasse. Geskriptete Smokes/Replay/Codeprüfung beweisen nicht NPC-Spielqualität oder PULSE-Pacing. Runende, Tod, manuellen Stopp, Provider-/Windowsfehler und Integritätsverletzung sauber trennen.
5. Nach Implementierung gezielter unabhängiger **Produktdiff-Gegenreview**. Weitere Analysen nur bei einem belegten offenen Befund; keine endlose Review-Schleife.

**Parallelbetrieb:** Ein bereits lokal gestarteter Batch bleibt auf seinem eingefrorenen Checkout; Entwickler dürfen in einem **getrennten Checkout** arbeiten und pushen. Nutzerumgebung nicht durch Pull/Deploy ungefragt umstellen. Eventlog, Save/Reload, Swipe/Edit und Regenerate der aktiven Ruleset-2-Kampagnen absichern; historische Originale nicht umschreiben.

## Dokumentationspflege

| Einziger Pflegeort | Inhalt |
|---|---|
| **02** | Verbindliche Spiel-/Kanonentscheidungen, ausdrückliche geplante Regeländerungen |
| **03** | Letzter **verifizierter** Produktbuild, neue natürliche Ergebnisse, unmittelbare Prioritäten, offene Entscheidungen |
| **07** | Featurefamilien, Reihenfolge, Abhängigkeiten, aufgeschobene Optionen |
| **04** | Neue Ideen ohne beschlossene Roadmap-Priorität |
| **06** | Links zu Fachplänen, unabhängigen Architektur-/NPC-/PULSE-Prüfungen und Produktnachweisen |
| **Pro-Run-Ordner** | Originalreview, Quellenmanifest, Gameplayfeedback, gezielte Folgeprüfungen |
| **Produktbranch / `avereth-engine/docs`** | Tatsächlicher Codepatch, technische Patchnote, Tests und Kompatibilitätsaussagen |

Bei einer reinen Dokumentationspflege **keine Node-/ST-Tests vortäuschen oder als notwendig erklären**: Inhaltsvergleich, Diff-, Link-, Referenz- und Git-HEAD-Prüfung reichen. Originalreviews, Historie und spezifische Fachpläne nicht blind kürzen; in Übersichten alte Detailketten nur verlinken. Bei Änderungen mindestens Dateiliste, Art der Änderung, Commit, neue/alte HEADs und Grenzen berichten. Keine Tokens/Schlüssel/Zugangsdaten in Chat, Repo oder Originalarchive aufnehmen.

## Historie und Quellen

[Historischer Branchvermerk 05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) · [10B-Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Original-Runindex](testrun_10b/README.md) · [historische 01-Vorfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/01_ARBEITSWEISE_CHATGPT_CLAUDE.md).
