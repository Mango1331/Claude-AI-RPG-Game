# Avereth Engine – Fachquellen und Reviews zu Patch 10B

Der [Projektstand](03_AKTUELLER_PROJEKTSTAND.md) nennt die spielbare Fassung und den nächsten Arbeitsschritt. Die Quellen hier dokumentieren, welche Entscheidungen zum persönlichen Test geführt haben.

## .208 nach User09 und User10

[.208 · Tagesboard, Hindernisschaden und geordnete Kampfhandlungen](patch_plans_10b/FACHPLAN_208_TAGESBOARD_UND_KAMPFAKTIONEN.md) · [Technische Abnahme des Experimentbranches](recherche/ABNAHME_208_TAGESBOARD_UND_KAMPFAKTIONEN.md)

## User11 – Forschungsgegenreview zu .208

[Unabhängiger GPT-Kontrollreview](recherche/USER11_208_GPT_GEGENREVIEW_TRUST_MAJOR_MINOR_2026-11-24.md) · [Codex-Entscheidungsvorlage](recherche/USER11_208_ENTSCHEIDUNG.md) · [Major-/Minor-Balance und HUD](recherche/CODEX_MAJOR_MINOR_USER11_208.md) · [natürliche OpenRouter-Spieltests](testrun_10b/README.md). Keine Produktfreigabe; HUD und Reise-Planer für .209 getrennt bewerten.

## .211 – Natürliche OpenRouter-Langzeitprüfung und Besitzkorrektur

[Unabhängiger GPT-Gegenreview](recherche/AVERETH_211_GPT_GEGENREVIEW_NATUERLICHER_LANGZEITTEST_2026-11-24.md) · [Astra-Fachbericht und Entscheidung](recherche/AVERETH_211_NATUERLICHER_LANGZEITVERGLEICH.md) · [Szenenbelege](recherche/langzeittest_211/BEOBACHTUNGEN.md) · [Spielarchive](testrun_10b/openrouter-20261124-langzeit-211/README.md). Bedingtes GO für persönlichen Test auf `8c88669b`, kein Produktmerge.

## .211 – Offline-Kontinuität und Revisionssicherheit

[Unabhängiger GPT-Gegenreview](recherche/AVERETH_211_GPT_GEGENREVIEW_OFFLINE_2026-11-24.md) · [Astra-Fachbericht](recherche/AVERETH_211_SPIELKONTINUITAET_OFFLINE.md) · [Abnahme](recherche/kontinuitaet_211/ABNAHME.md) · [Langzeittestentwurf](recherche/kontinuitaet_211/LANGZEITPLAN.md). Technisch für natürliche Modellprüfung freigegeben; keine Produktübernahme.

## .210 – Kontinuität, Narrator-Freiheit und zweiter Entwicklungszyklus

[Unabhängiger GPT-Gegenreview und neue Spielzielvorgabe](recherche/AVERETH_210_GPT_GEGENREVIEW_SPIELFLUSS_KONTINUITAET_2026-11-24.md) · [Astra-Fachbericht .210](recherche/AVERETH_210_KONTINUITAET.md) · [Technische .210-Abnahme](recherche/kontinuitaet_210/TECHNISCHE_ABNAHME.md). Die zweite Entwicklungsetappe wird offline geprüft; spätere natürliche OpenRouter-Langzeittests sind separat.

## Entscheidungsweg zu User08

| Frage | Quelle |
|---|---|
| Was sollte sich nach User07 ändern? | [A · Questboard und HUD](patch_plans_10b/USER07_A_QUESTBOARD_UND_HUD.md) · [B · Gildenroutine, Dungeon und Extractor](patch_plans_10b/USER07_B_GILDENROUTINE_DUNGEON_UND_EXTRACTOR.md) · [C · Campausstattung und Suche](patch_plans_10b/USER07_C_CAMPAUSSTATTUNG_UND_SUCHE.md) · [Gegenreview der Fachpläne](patch_plans_10b/GEGENREVIEW_USER07_FACHPLAENE_A_B_C_GPT_2026-11-21.md) |
| Was belegte die erste gemeinsame Abnahme? | [A–C-Abnahme](recherche/USER07_204_PATCHABNAHME_A_B_C.md) · [Gegenreview des Gesamtdiffs](patch_plans_10b/REVIEW_USER07_204_ABC_GESAMTDIFF_GPT_2026-11-21.md) |
| Welche Befunde führten zur C-Korrektur und wer hat sie geprüft? | [Natürlicher Camp-Gegencheck](testrun_10b/archiv/user07-camp-openrouter-20261122/REVIEW_GPT.md) · [Technische Abnahme für Ortsbindung und Kupfertopf](recherche/USER07_204_C_KORREKTUR_ABNAHME.md) · [Unabhängiger Diffreview und Freigabe zum persönlichen Test](patch_plans_10b/REVIEW_USER07_204_C_KORREKTUR_GPT_2026-11-22.md) |
| Welche Fassung gehört in den neuen Chat? | [User08-Testanleitung mit Build, Installation und Abnahmeumfang](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a69daeeed613850919f16eb810cc2c150c8aafd0/avereth-engine/docs/USER08_205_PLAYTEST.md) |
| Wie wurden Mengenwahl und gespeicherte Handelsgebote geprüft? | [Umsetzungsfachplan](patch_plans_10b/FACHPLAN_207_HANDELS_HUD.md) · [Technische Abnahme](recherche/ABNAHME_207_HANDELS_HUD.md) |

## Weitere Quellen

- [Testläufe und Originaldaten](testrun_10b/README.md)
- [Forschungsberichte und Performancevergleiche](recherche/README.md)
- [Fachpläne und unabhängige Reviews](patch_plans_10b/)
- [Vollständiger früherer Fachindex mit Produktpatches, Prüfzahlen und Einzelfällen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/292a4372654f027fb579bf8e338ff9d25d981da7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md)
