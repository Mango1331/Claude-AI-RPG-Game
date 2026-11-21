# Forschung – Performance und LLM-Effizienz von Avereth

**Stand 21.11.2026.** Aktuelle Arbeits-/Produktentscheidungen stehen in [03](../03_AKTUELLER_PROJEKTSTAND.md).

## User07 auf .204

T7 bereitet eine spätere Untersuchung der tatsächlich gelieferten Prompts, des Kontextinhalts und der Tokens pro gespeichertem Zug vor. Die technischen Einzelabnahmen der drei User07-Patches und die gemeinsame Prüfung stehen im [Abnahmebericht](USER07_204_PATCHABNAHME_A_B_C.md). [Forschungsvorhaben T7](USER07_T7_PROMPTS_KONTEXT_UND_TOKENVERBRAUCH.md) · [Fachpläne und Reihenfolge](../patch_plans_10b/USER07_A_QUESTBOARD_UND_HUD.md)

## Natürlicher OpenRouter-Handelstest

Der vollständige natürliche Neustart umfasst einen bestätigten ST-Canary und sechs Handelspaare. Alle zwölf Vergleichszüge bestanden Save und Reload. Der kürzere Katalog sparte in jedem gepaarten Plannerrequest 121 gemeldete Inputtokens. Die sichere Eingabe kam in B im Median der Paardifferenzen 12,726 s später. [Abschlussbericht und bereinigte Laufdaten](AVERETH_203_OPENROUTER_HANDEL_AB_ABSCHLUSS_2026-11-20.md) · [Neustartprüfung](AVERETH_203_OPENROUTER_HANDEL_NEUSTART_2026-11-20.md)

**Unabhängiger Abschlussgegenreview:** [GPT-Code- und Evidenzprüfung des natürlichen A/B](GEGENREVIEW_203_OPENROUTER_HANDEL_AB_ABSCHLUSS_GPT_2026-11-20.md) – bedingtes GO für die nachgewiesene 121-Token-Katalogeinsparung, ausdrücklich kein Geschwindigkeits-GO (B in dieser Stichprobe +12,7265 s bis zur sicheren Eingabe), kein generelles Gameplay-GO. Zwei zusätzliche A-Repairs und unterschiedliche Providerzeiten/Cache-Usage nicht als Wirkung der Katalogzeile werten.

Neun serielle Modellrequests über Wafer, zwei begonnene A-Züge, null vollständige Paare. Der Bericht dokumentiert die Sperre bei unbekanntem Remoteabschluss, die getrennte lokale ST-Prüfung des korrigierten Treibers und die gemessenen Katalogtokens. [Teilbericht und bereinigte Laufdaten](AVERETH_203_OPENROUTER_HANDEL_AB_2026-11-20.md)

**Unabhängiger Gegenreview:** [GPT-Code- und Evidenzprüfung des Abbruchs](GEGENREVIEW_203_OPENROUTER_HANDEL_TEILVERSUCH_GPT_2026-11-20.md) – Testinfrastruktur statt Enginekatalog als Blocker; enger Proxy-/Treiberfix vorhanden, GO nur für kontrollierten Neustart mit echtem ST-End-to-End-Canary und Restbudget.

## Lesereihenfolge

1. **[Work-Performanceforschung vom 19.11.](AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md):** umfangreichste neuere Messgrundlage (188 exakt rekonstruierte GLM-Promptlängen, N-Streaming/Smooth, Prefix, Questboard, Extractor, lokale Hostzeit, Modellalternativen). Keine natürliche .203-Provider-A/B-Abnahme.
2. [Rekonstruierter Forschungsstand A](LLM_KONTEXT_ST_RPG_PERFORMANCE_FORSCHUNGSSTAND_2026-11-19.md): frühes Phase-A-Prefixaudit und Kontextschichten; die Zeichenpräfixe sind keine echten Cachehits.
3. [Codex-Originalbericht B](FORSCHUNGSBERICHT_AVERETH_203_LLM_KONTEXT_SPIELQUALITAET_PERFORMANCE_2026-11-19.md): relevante Szeneninformation, NPC-Kontinuität als Qualitätsgrenze und Latenz bis zum spielbaren Zug; damals eingeschränkte Executor-/Webprüfung.
4. [Astra-6.2-Vertiefung C](AVERETH_203_VERTIEFTE_OPTIMIERUNGSRECHERCHE_2026-11-19.md): kritischer Vergleich A/B und zusätzliche Host-/Speicherhypothesen; damalige Live-Recherche eingeschränkt.

**Primärbelege:** [User06 .203 – neue natürliche Performance-Baseline](../testrun_10b/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md) · [User05-Gegenreview](GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) · [User05-Originale](../testrun_10b/user-20261118-011503/README.md) · [technischer .203-Patch](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md).

## Handels-Schlussabnahme Zyklus 3

[Vollständige ST-Abnahme, drei lokale Handelspaare und Tarifbefund](AVERETH_203_HANDEL_SCHLUSSABNAHME_2026-11-20.md)

## Technische Handels-Schlussabnahme und Gegenreview

[Codex-Schlussabnahme mit ST-Mock-Handelspaaren](AVERETH_203_HANDEL_SCHLUSSABNAHME_2026-11-20.md) · [unabhängiger GPT-Gegenreview](GEGENREVIEW_203_HANDEL_SCHLUSSABNAHME_GPT_2026-11-20.md). Technisches GO für den unveränderten OpenRouter-A/B-Katalogvergleich; ein gemeinsam vorhandener Preisbindungsfehler (unabhängige morgige NPC-Zusage) wird getrennt behandelt. Keine neue natürliche Providerinferenz durch die lokale Schlussabnahme.

## Performance-Forschungszyklus 3

Katalogkürzung mit 121 GLM-Inputtokens je P-/X-Aufruf, vier verworfene bzw. zurückgestellte Versuche und Abnahme des neuen Kandidaten. [Messungen und Fachentscheidungen](AVERETH_203_PERFORMANCE_ZYKLUS3_2026-11-19.md)

**Unabhängiger Gegenreview:** [GPT-Review von Zyklus 3](GEGENREVIEW_203_PERFORMANCE_ZYKLUS3_GPT_2026-11-19.md) – GO für den neuen B-Experimentkandidaten, 2.541 offline berechnete Inputtokens weniger je zehn archivierte B-Züge; natürliche Handelsqualität und Latenz weiterhin offen.

## Performance-Forschungszyklus 2

Aus den archivierten natürlichen Antworten wurden ein entbehrlicher Extractor-Repair, der vollständige Board-Erstvertrag und die Meldesemantik des Promptcaches untersucht. Die Messungen unterscheiden lokale Gegenproben, tatsächliche historische Gebühren und offene natürliche Qualität. [Paketentscheidungen und Abnahme](AVERETH_203_PERFORMANCE_ZYKLUS2_2026-11-19.md) · [Cacheanalyse, aktueller Tarif und kontrollierter Testplan](AVERETH_203_FEATHERLESS_CACHE_ZYKLUS2_2026-11-19.md)

**Unabhängiger Gegenreview:** [GPT-Code- und Evidenzprüfung Zyklus 2](GEGENREVIEW_203_PERFORMANCE_ZYKLUS2_GPT_2026-11-19.md) – GO für die drei engen B1/B2/B3-Änderungen auf dem Experimentbranch, keine neue echte Provider-/Zeitmessung; automatisierte Benchmarks auf dem bestätigten Chat-Tarif nicht freigegeben.

## Natürlicher Featherless-A/B-Spieltest

Je zehn Spielzüge mit echten GLM-Antworten und sechs Zusatzpaare zu X2 und Preset. Der Bericht enthält die Messung der ersten sichtbaren Prosa und der sicheren Zugfreigabe, alle Repairs, die gespeicherten Welten und die Einzelurteile zu den Optimierungen. [Ergebnisse, Rohdaten und Reproduktion](AVERETH_203_NATUERLICHER_FEATHERLESS_AB_2026-11-19.md)

**Unabhängige Bewertung:** [GPT-Gegenreview des natürlichen A/B-Laufs](GEGENREVIEW_203_NATUERLICHER_FEATHERLESS_AB_GPT_2026-11-19.md) – früher lesbare Prosa nachgewiesen; gesamter Token- und Latenzgewinn nicht belegt. Empfehlung: S1/B1, kurzer Maschinenkatalog und Save behalten, erste Board-Kürzungsanweisung vor dauerhafter Übernahme gezielt zurücknehmen; X2 und Card-before-Lore ausgeschaltet lassen.

## Optimierungssuite und Vorversuche

Die Optimierungssuite verwendet S1 und B1 als Basis. Der Bericht dokumentiert alle zehn Etappen, den isolierten A/B-Vergleich, die abgelehnten Vorschläge und die offenen natürlichen Qualitätsfragen. [Gesamtauswertung und Etappencommits](AVERETH_203_OPTIMIERUNGSSUITE_2026-11-19.md) · [Windows-Aufbau für den späteren Spieltest](performance_suite_203/AB_WINDOWS.md).

**Unabhängiger Schlussreview:** [GPT-Code- und Evidenzgegenreview der Performance-Suite](GEGENREVIEW_203_PERFORMANCE_SUITE_GPT_2026-11-19.md) – begrenztes GO für einen persönlichen A/B-Performancevergleich, kein allgemeines Gameplay- oder Produkt-GO; User06-Anwesenheit und natürliche GLM-Wirkung bleiben offen.

Der frühere Integrationsversuch verband S1 und B1 und prüfte X1/X2 offline. [Integrationsbericht](AVERETH_203_PERFORMANCE_INTEGRATION_B1_X1_X2_2026-11-19.md) · [B1-Offlineanalyse](AVERETH_203_B1_GILDENBOARD_EINZELSLOT_2026-11-19.md).

**Noch kein GO:** Character-Card-Kürzung, Card-vor-Lore im Produkt, globale Kontextbudgetsenkung, Modell-/Tarifwechsel oder Architekturumbau. Der User06-Run ist durch Charaktertod beendet. Vier Originale und eine technische Performance-Vorauswertung sind archiviert; vollständiger Gameplayreview und abschließende Bewertung stehen aus.
