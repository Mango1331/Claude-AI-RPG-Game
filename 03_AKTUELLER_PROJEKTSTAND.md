# Avereth Engine – abgeschlossener Meilenstein und nächste Etappe

**Meilensteinabschluss: 24. November 2026 · Astra-Ultra-Kontinuitätsrunde .210/.211 und natürlicher Langzeitvergleich.** Keine tagesaktuelle Testliste. Der Stand wird **erst am Ende einer Entwicklungs-, Test- oder Freigabeetappe** geändert; zwischenzeitliche Tests und Commits nur in ihren Originalordnern bzw. Berichten.

## Ergebnis der abgeschlossenen Etappe

- `.211` verbessert die **Rücknahme von Spielerentscheidungen**: Swipe, Edit, Regenerate, Folgeevents, HUD und Save/Reload wurden offline und in natürlichen ST-1.19-Läufen geprüft.
- Vier natürliche OpenRouter-Kampagnen auf `.210`/`.211` ergaben **122 vollständig extrahierte Erzählzüge**. Einzelne NPC- und Ortsfolgen funktionieren; **allgemeine Reise-, NPC- und Gegenstandskontinuität bleibt NO-GO**. Eine globale Beschleunigung ist nicht belegt.
- Ein **kleiner, separat geprüfter Besitzfix** verhindert die vorzeitige Übergabe eines bloß vorgezeigten Gegenstands (`8c88669b`). Der persönliche Test damit ist begrenzt freigegeben; **kein Produktmerge**.
- Danach wurde ein **OpenRouter-Einzelrunner** für natürliche Level-, Quest-, Ausrüstungs- und hilfsbereite NPC-Spiele vorbereitet. Seine volle lokale Node-/ST-/Provider-Abnahme steht noch aus; dies ist kein freigegebener Produktbuild.

[Unabhängiger GPT-Gegenreview der Langzeitserie](recherche/AVERETH_211_GPT_GEGENREVIEW_NATUERLICHER_LANGZEITTEST_2026-11-24.md) · [Astra-Fachbericht](recherche/AVERETH_211_NATUERLICHER_LANGZEITVERGLEICH.md) · [Originale der vier Kampagnen](testrun_10b/openrouter-20261124-langzeit-211/README.md).

## Relevante Code-Referenzen

| Zweck | Fixierter Ausgangspunkt / derzeitiger Arbeitsstand |
|---|---|
| **Vor den zwei offenen Folgeänderungen:** `.211` nach Astra-Ultra-Kontinuitätsrunde | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| **Erste noch nicht allgemein übernommene Änderung:** Besitz-/Vorzeige-Fix | [`8c88669b`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c88669b82420f7656687f5d40e13ec83cbcd732), im aktuellen Entwicklungszweig enthalten |
| **Zweite offene Änderung und aktueller Arbeitszweig:** OpenRouter-Einzelrunner | `experiment/211-openrouter-helper-single-runner` · [`a1361d73`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a1361d734e30b5831db1b164222d17b1a94b74a6) · [Runner-Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a1361d734e30b5831db1b164222d17b1a94b74a6/avereth-engine/docs/LIVE_RUNNER.md) |
| **Historische eingefrorene Produktlinie:** `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). Bis zu einer ausdrücklich sicheren Archivierung nicht löschen. |

`main` ist die **separate Dokumentationslinie**, nicht automatisch derselbe Commit wie eine Enginefassung. Ein Commit in dieser Tabelle ist ein **Meilenstein-Snapshot** und **kein Versprechen**, dass der Branch bis zum nächsten Etappenabschluss nicht weiterentwickelt wurde. Vor jeder Arbeit Remote-HEAD neu kontrollieren.

## Nächste Etappe

**Natürliche Einzel-/Batchtests mit dem OpenRouter-Runner und danach eine gebündelte Auswertung.** Der Spieler entwickelt Level, erledigt Gildenaufträge, verbessert Gear und spricht mit NPCs bzw. hilft bei Problemen. Neue Originale, Messungen und Gegenreviews werden pro Run archiviert; diese Seite bleibt während der Etappe unverändert.

[Zentrale Testübersicht](testrun_10b/README.md) · [Forschungsberichte](recherche/README.md) · [Branchbereinigung und künftig nur bestehende Arbeitsbranches](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Produkt-Kanon .200](02_DESIGN_KANON.md).
