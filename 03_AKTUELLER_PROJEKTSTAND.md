# Avereth Engine – aktueller Projektstand

**Stand 27.11.2026.** Der Entwicklungskandidat `.261` ist technisch abgenommen. Der abschließende unabhängige GPT-Diffreview steht aus. Anschließend entscheidet der Nutzer über den persönlichen Usertest 17.

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`4b637c98`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4b637c981459e1e5ff9f4bd480bc071723fe5bce) · Build `4.3.0-c.6.6.261` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die Dokumentations- und Originalarchivlinie. Die Tabelle ist ein Snapshot, vor neuer Arbeit die Remote-HEADs prüfen.

## Letzte abgeschlossene Etappen

| Etappe | Ergebnis | Maßgebliche Quelle |
|---|---|---|
| **.261 · Extractor** | Technische Recovery, Typ-Aliase und Teilübernahme bei zusätzlichen Root-Feldern. | [Abnahme und Installation](recherche/AVERETH_261_EXTRACTOR_RECOVERY_ABNAHME.md) |
| **.252–.260 · Claim + State** | Vereinfachte Validierung und geprüfte mechanische Schutzgrenzen. P7 wurde zurückgestellt. | [Fachbericht und Replay-Einzelbewertung](recherche/AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md) |

Ältere Etappen ab .203 stehen im [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), die vollständige Forschung im [Forschungsindex](recherche/README.md).

## Nächste Schritte

1. GPT prüft den [Diff von .260 zu .261](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/7bdb570103d8876cb2a0ff7cac8c8de83e9b1e79...4b637c981459e1e5ff9f4bd480bc071723fe5bce).
2. Nach dem Gegenreview entscheidet der Nutzer über Usertest 17. Für neue Originale gilt der [Usertest-Ablauf](01_ARBEITSWEISE_GPT_CODEX.md#persönliche-usertests--verbindlicher-ablauf).

## Arbeitsaufteilung

Der Nutzer entscheidet über Spielgefühl, Kanon, Prioritäten und Freigaben. Codex implementiert und testet beauftragte Pakete. GPT führt unabhängige Fach-, Code- und Run-Reviews und hält die Dokumentation. Claude steht befristet (Claude Pro ab 27.11.2026 für einen Monat) ausschließlich für beauftragte unabhängige Analysen und Planung zur Verfügung, nicht für Implementierungen. Der GPT-Chat, der die .251-Reviews geführt hat, hat seine maximale Länge erreicht. Sein Übergabestand ist dieser Projektstand mit den verlinkten Berichten.

**Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout. Character Card, Narrator Contract `.211`, Preset, Lorebook, Regex und ST-Einstellungen sind unverändert.

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Design-Kanon](02_DESIGN_KANON.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalarchive](testrun_10b/README.md) · [Vorheriger ausführlicher Projektstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e65cba42803d4caa5e5ba7c3c4e3b33da1cc2aaa/03_AKTUELLER_PROJEKTSTAND.md)
