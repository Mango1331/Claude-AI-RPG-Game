# Forschung – Performance und LLM-Effizienz von Avereth .203

**Stand 19.11.2026.** Die Quellen bleiben getrennt und unverändert. Aktuelle Arbeits-/Produktentscheidungen stehen allein in [03](../03_AKTUELLER_PROJEKTSTAND.md).

## Lesereihenfolge

1. **[Work-Performanceforschung vom 19.11.](AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md):** umfangreichste neuere Messgrundlage (188 exakt rekonstruierte GLM-Promptlängen, N-Streaming/Smooth, Prefix, Questboard, Extractor, lokale Hostzeit, Modellalternativen). Keine natürliche .203-Provider-A/B-Abnahme.
2. [Rekonstruierter Forschungsstand A](LLM_KONTEXT_ST_RPG_PERFORMANCE_FORSCHUNGSSTAND_2026-11-19.md): frühes Phase-A-Prefixaudit und Kontextschichten; die Zeichenpräfixe sind keine echten Cachehits.
3. [Codex-Originalbericht B](FORSCHUNGSBERICHT_AVERETH_203_LLM_KONTEXT_SPIELQUALITAET_PERFORMANCE_2026-11-19.md): relevante Szeneninformation, NPC-Kontinuität als Qualitätsgrenze und Latenz bis zum spielbaren Zug; damals eingeschränkte Executor-/Webprüfung.
4. [Astra-6.2-Vertiefung C](AVERETH_203_VERTIEFTE_OPTIMIERUNGSRECHERCHE_2026-11-19.md): kritischer Vergleich A/B und zusätzliche Host-/Speicherhypothesen; damalige Live-Recherche eingeschränkt.

**Primärbelege:** [User06 .203 – neue natürliche Performance-Baseline](../testrun_10b/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md) · [User05-Gegenreview](GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) · [User05-Originale](../testrun_10b/user-20261118-011503/README.md) · [technischer .203-Patch](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md).

## Optimierungssuite und Vorversuche

Die Optimierungssuite verwendet S1 und B1 als Basis. Der Bericht dokumentiert alle zehn Etappen, den isolierten A/B-Vergleich, die abgelehnten Vorschläge und die offenen natürlichen Qualitätsfragen. [Gesamtauswertung und Etappencommits](AVERETH_203_OPTIMIERUNGSSUITE_2026-11-19.md) · [Windows-Aufbau für den späteren Spieltest](performance_suite_203/AB_WINDOWS.md).

Der frühere Integrationsversuch verband S1 und B1 und prüfte X1/X2 offline. [Integrationsbericht](AVERETH_203_PERFORMANCE_INTEGRATION_B1_X1_X2_2026-11-19.md) · [B1-Offlineanalyse](AVERETH_203_B1_GILDENBOARD_EINZELSLOT_2026-11-19.md).

**Noch kein GO:** Character-Card-Kürzung, Card-vor-Lore im Produkt, globale Kontextbudgetsenkung, Modell-/Tarifwechsel oder Architekturumbau. Der User06-Run ist durch Charaktertod beendet. Vier Originale und eine technische Performance-Vorauswertung sind archiviert; vollständiger Gameplayreview und abschließende Bewertung stehen aus.
