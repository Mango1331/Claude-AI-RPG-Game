# Avereth Engine – aktueller Projektstand

**Stand 27.11.2026.** Spielbar ist der Entwicklungskandidat `.251` mit GO-Empfehlung für den persönlichen Usertest 17. Die anschließende Untersuchung der Validierungsarchitektur ist mit Analyse, Gegenreview und überarbeitetem Plan abgeschlossen. Als nächster Entwicklungsschritt ist ein Codex-Auftrag zur Vereinfachung vorbereitet. Produktcode, Design-Kanon und die .251-Testfreigabe sind dadurch unverändert.

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`4933a5f0`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4933a5f005a86a381a922981d3d7377e8ba84b5c) · Build `4.3.0-c.6.6.251` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die Dokumentations- und Originalarchivlinie. Die Tabelle ist ein Snapshot, vor neuer Arbeit die Remote-HEADs prüfen.

## Letzte abgeschlossene Etappen

| Etappe | Ergebnis | Maßgebliche Quelle |
|---|---|---|
| **.251 · Validierungsarchitektur (Analyse und Plan)** | V1 „Claim + State“ innerhalb von P/N/X: JS-Sprachprüfungen im Standardpfad entfernen, Zustandsprüfungen behalten. Keine neuen Pflichtfelder, Validatoren oder Modellaufrufe. Entscheidungen D1–D9 sind vorbereitet, D4 braucht ausdrücklich das Nutzervotum. | [Claude-Analyse, Stand 2](recherche/AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) · [GPT-Gegenreview](recherche/AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md) · [Diskussionsgrundlage](recherche/AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) |
| **.245–.251 · Bekannte Wege und gemeinsame Ortswechsel** | Gasthaus, Markt, Party und zwei Gildenaufträge im Modellspiel belegt. GO für Usertest 17 mit offenem Befund zur NPC-Wiedererkennung. | [Fachbericht, Abnahme und Installation](recherche/AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md) |

Ältere Etappen ab .203 stehen im [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), die vollständige Forschung im [Forschungsindex](recherche/README.md).

## Nächste Schritte

1. **Persönlicher Usertest 17 auf .251** ist weiterhin möglich und hängt nicht vom Vereinfachungsauftrag ab. Upload und Archivierung laufen nach dem [Usertest-Ablauf](01_ARBEITSWEISE_GPT_CODEX.md#persönliche-usertests--verbindlicher-ablauf).
2. **Codex-Auftrag Validierungsvereinfachung:** [Auftrag und Abnahmeplan](recherche/AVERETH_252_CODEX_AUFTRAG_VALIDIERUNGSVEREINFACHUNG.md). Er beginnt erst, wenn der Nutzer ihn an Codex gibt. Danach folgt der unabhängige GPT-Diffreview. Bezahlte Modelltests sind nur nach eigener Freigabe erlaubt, vom freigegebenen Dollar sind rechnerisch 0,747428006 USD übrig.
3. **Kanon:** Bleibt bis zur fachlichen Abnahme der Umsetzung unverändert. Danach passt GPT gegebenenfalls die Formulierung der NPC-Wiederbegegnung an (`met` → einheitliche Anwesenheitsregel).

## Arbeitsaufteilung

Der Nutzer entscheidet über Spielgefühl, Kanon, Prioritäten und Freigaben. Codex implementiert und testet beauftragte Pakete. GPT führt unabhängige Fach-, Code- und Run-Reviews und hält die Dokumentation. Claude steht befristet (Claude Pro ab 27.11.2026 für einen Monat) ausschließlich für beauftragte unabhängige Analysen und Planung zur Verfügung, nicht für Implementierungen. Der GPT-Chat, der die .251-Reviews geführt hat, hat seine maximale Länge erreicht. Sein Übergabestand ist dieser Projektstand mit den verlinkten Berichten.

**Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout. Character Card, Narrator Contract `.211`, Preset, Lorebook, Regex und ST-Einstellungen sind unverändert.

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Design-Kanon](02_DESIGN_KANON.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalarchive](testrun_10b/README.md) · [Vorheriger ausführlicher Projektstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e65cba42803d4caa5e5ba7c3c4e3b33da1cc2aaa/03_AKTUELLER_PROJEKTSTAND.md)
