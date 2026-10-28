# Avereth Engine – 10B: kompakter Technik-/Scaling- und Quellenindex

**Stand:** 28.10.2026. **Kein paralleler aktueller Projektstand.** Aktuelle Engineversion, Testnachweise und unmittelbare Arbeitsschritte nur in [03](03_AKTUELLER_PROJEKTSTAND.md). Bindende Spielregeln [02](02_DESIGN_KANON.md); neue oder später zurückgestellte Ideen [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

**Vollständiges ursprüngliches 10B-Journal (ca. 224 KB, §§0–32, sämtliche Reviewketten, Rot-/Grün-Vorüberlegungen und datierte Statusmeldungen):** [unveränderter main-Stand 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Die Kürzung beseitigt Wiederholungen, keine historischen Belege. **Alle dortigen „offen“-/„nächster Schritt“-Aussagen sind zeitgebunden und nicht als heute gültiger Patchauftrag zu übernehmen.**

## 1. Prioritäten und Nachweise

**Jetzt:** technische Stabilität, echte GLM-/ST-Batchbeobachtung und F→E-Scaling/Balance unter Quell-/Replaykontrolle. Keine Produktfixes allein aus einer Narrator-Behauptung und keine große Balancemodifikation während laufender Vergleichsbatches.

| Arbeitsbereich | Aktueller Sinn und Beweisschwelle | Hauptquelle |
|---|---|---|
| **A: Natürliche Langläufe** | Engine-/Runner-Fehler, vollständige Turns, Abschlussgründe, wiederholte Blockaden, echte Geld-/XP-/Loot-/Quest-Ereignisse, Wiedereinladung/Replay; Tod ≠ automatisch Balancebug | [Runindex](testrun_10b/README.md), [Sechserbatch](testrun_10b/batch-20261027-030034Z/REVIEW.md) |
| **B: Kampfsimulator** | Belegbare Taktik-/Kit-/Range-Parität vor jeder numerischen Klassenbewertung; ursprüngliche PC/NPC-Asymmetrie macht ältere Ergebnisse nicht allgemein gültig | [historische Methodik und Simulation](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#3-b--kampfsimulator-erste-ergebnisse-methodische-leitplanken), [Balance-Eindrücke](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md) |
| **Kampfaktionsökonomie (geplant)** | Höchstens ein Main + ein Minor pro eigenem Turn; normale Bewegung und berechtigter Mobility-Skill belegen denselben Minor-Slot; Code-/Replay-/Bewegungs-/NPC-/PP-Analyse mit Umsetzungs- und Abnahmeplan. Noch keine Produktänderung; laufenden .104-Batch als Vergleich erhalten | [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) |
| **Scaling F→E** | Gemeinsam Monster/NPC/PC/Skills/Spells/Gear/Preise/Questbelohnungen/Regionen/Feindlevel bewerten, nicht isoliert XP erhöhen | [GPT-Audit](testrun_10b/scaling_gpt.md), [Sols Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md) |
| **Provider und Recovery** | Reasoning-only/Length, Schemafehler und echte Transportprobleme strikt trennen; maximal begrenzte Wiederholung ohne doppelte Commits; echte GLM-Abnahme fehlt auch nach Mock-Smokes | [Patch .101](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md), [Sols Gegenreview](testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md) |

Die ursprüngliche 53-Punkte-10B-Abnahmebasis und alle zwischenzeitlichen Einzelbefunde sind im [alten Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#10-konsolidierte-problem-designmatrix-startklar-für-viele-weitere-runs) vorhanden; sie sind **keine automatisch freigegebene Arbeitsliste**. Neu gewonnene Evidenz in die betreffenden Fachreview-/Testdateien schreiben.

## 2. Historische Produktphasen in 10B – abgeschlossen oder durch spätere Builds überholt

| Zeitraum/Build | Dauerhafte Änderung | Tiefe Quellen |
|---|---|---|
| **.58–.60: 10B-1/2** | Eindeutige Fakten-IDs, Guard-Voraussetzungen, Liefer-/Übergabe- und Proof-Buchungen, enger Nachfix | [damalige Patches §§13–18](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#13-sols-unabhängiger-drei-run-gegenreview-folgeabstimmung-und-der-erste-implementierungsauftrag-24102026), [Delivery-Spezifikation](patch_plans_10b/PATCH_RUN11_DELIVERY_AND_FACTS.md) |
| **.61–.66: 10B-4** | Planner/Extractor-Recovery, Phasendiagnose, Host/Chatwechsel-/Reload-Sicherheit, Telemetrie, SillyTavern-1.19-Swipe-ID-Hotfix | [Abfolge §§19–26](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#19-10b-4a--kleiner-planner-leerantwort-fix-durch-chatgpt-build-61-24102026), [Hotfix .66](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cd9b338773783644a79a39f367629e6aaeead05) |
| **.67** | Kampferfahrung und Guild-Quest-XP auf ausdrücklichen Nutzerauftrag nach Rundung verdoppelt; keine abschließende Scalingfreigabe | [XP-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_XP_REWARDS.md) |
| **.78–.87** | Quest-/Dungeon-/World-Nachweis- und Ortsschutz, freie NPC-Hilfe ohne neue formale Privatquests, NPC-Kontinuität, vorläufige Gildenboard-Zusammensetzung | [damalige Fortschreibung §§29–31](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#29-run-12-fachpakete-25102026), [NPC-Kontinuität .85](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2bab56663acb7eb1bf53a528385c37c20a7cc9f7) |
| **.88–.98** | Kauf-/Verkaufs- und Gearpfade, Klassenstartwerte, Combat-/Welt-/Dungeon- und Habitat-/Katalogfixes nach realen Runs; kein endgültiges Gear-/Wirtschaftsbalancing | [Run-Reviews](testrun_10b/README.md), [Habitat .98](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c1ed54b596bb50bfc55b50d2c3d99baeddba72e7) |
| **.99–.100** | Vorbatch-Authority-, Reise- und World-Regressionen, Batch-Vorbereitung | [Fachplan](patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md), [Patchnote .100](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/65d56e93cf45fdea62517150784f475561f86820/avereth-engine/docs/PATCH_PRE_BATCH_RUN22.md) |
| **.101** | Recovery nach Fehlerart + ein gesichertes Narrator-Regenerate; explizites autorisiertes arrive, einheitliche Ortsauflösung, kurzlebige Handelsautorität, geprüfter Sale und neue mechanische Zähljagden | [Commit c9e3fa5](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6), [einzige ausführliche Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md) |

**Wichtig:** Historisch „offene“ Fehler aus frühen .57-Runs nicht ohne erneuten Beleg auf .101 übertragen. Echte Originalfälle für Regressionen weiter verwenden; keine alten Befunde oder Testmetriken als neue Abnahme ausgeben.

## 3. Batch 1 – maßgebliche Ursachenkette

Sechs tatsächlich gestartete .100-Läufe aus dem ursprünglich neunteiligen Batch, drei Dungeonprofile gar nicht gestartet. **Fünf** autonome technische Stopps (drei Extractor, zwei Narrator); **einer** vom Nutzer während Lauf 6 manuell abgebrochen. Kein Level-15-Beleg. Wiederkehrende Fehler: Reasoning verbraucht Completion-Budget ohne Text; Schema-/Repairabweichungen; Populationsherkunft fehlt bei natürlich eingeführten Gildenzielmonstern; uneinheitliche Ortsauslegung, Reisezeitpunkte und transaktions-/abgabeabhängige Autorität.

- [GPT – sechs vollständige Einzelbewertungen](testrun_10b/batch-20261027-030034Z/REVIEW.md)
- [Sol – unabhängige Gegenprüfung und abschließende Fachpakete A/B/C, Abschnitte 11–12](testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md)
- [Quelle, Seeds und Archivstatus](testrun_10b/batch-20261027-030034Z/README.md)

Die .101-Patchnote ist der **einzige** aktuelle Implementierungsnachweis; ob GLM in einem neuen natürlichen Batch dauerhaft stabil bleibt, ist **noch nicht nachgewiesen**. Ein Mock-Smoke alleine beweist das nicht.

## 4. Noch nicht entschiedene Design-/Scalingbereiche

**Monster und Loot (später differenziert prüfen):** Die vorhandenen **19 Anchors sind heterogene Kampf-/Verhaltensprofile, kein vollständiger Arten-/Anatomiekatalog**. Beispiele aus dem früheren Monsterreview: anatomisch unpassende Spezialbeute, freie Species/Alias-Zuordnung, Sapienz/Temperament bei generischen Creatures, Effektname ohne mechanischen Skillstatus. **Kein pauschaler Species-Redesign-Auftrag**; zuerst eng nachweisbare Fälle und die bestehende Content-/Composer-Struktur nutzen. [ChatGPT- und Sol-Originalreviews §§5–7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#5-monster-lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse).

**Flucht und Verfolgung (zurückgestellt):** Fälle wiederholten Nachsetzens auf Hasen/Füchse; vorhandene One-Roll-Chase-/Flee-Pfade nicht durch eine zweite Chase-Engine verdoppeln. Erst prüfen, ob die Parser-/Intent-Anbindung oder der tatsächlich gebuchte Bewegungs-/Encounterzustand falsch ist. Kein pauschales Auto-Catch, keine garantierte Entkommensschwelle. [Originaldesign C mit Gegenfällen und Messmatrix §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#8-c--verfolgung-flucht-rückzug-ausführlicher-design-fix-kandidat).

**XP/Schwierigkeit/Geld/Ausrüstung:** Keinen Gegner ungefragt an den PC-Level skalieren. Gebiet, Rang, Habitat, Gegnerprofil, Gruppe und Fähigkeiten gemeinsam mit Quest-/Loot-/Steinpreisen beurteilen. Alte Zahlen (12/18/20 XP, Elites/Bosse, 400 cp Stone-Richtwert gegen 30–80 cp Shoppreis, Blink 8 MP/ein Band) sind **frühere Vergleichsannahmen, keine aktuellen beschlossenen Sollwerte**. Keine weiteren Buffs/Nerfs ohne echte Gegenvergleiche. [Frühere Prüfmatrix §9–11](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#9-andere-10b-prioritäten--vollständige-aber-noch-nicht-freigegebene-fachbereiche), [aktueller Vergleichsstoff](testrun_10b/README.md).

**Langzeitqualität:** 100 Turns zunächst als Vergleichscheckpoint, 500/1000 als spätere Stressoptionen; Fold-/Kontextwachstum, Save/Reload/Swipe, Objekt-/Quest-/NPC-Gedächtnis beobachten. Vertiefte NPC-Memory-Idee ausdrücklich **zurückgestellt**: [04 §3b](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3b-späterer-npc-memory--und-identitäts-langzeittest--vorgemerkt-nicht-aktuell-27102026).

## 5. Regeln für weitere Patches und Reviews

- Neues technisches Problem zuerst mit Originalevent, Gegenbeispiel, Engine-Quelle und Rot-/Grün-Regressionsnachweis eingrenzen. Gründe wie Narrator-Prosa, alte P0-Listen oder Parser-Fehlermeldung sind **keine** automatische Mechanikfreigabe.
- Fachpatches voneinander trennen, nach Bedarf echte ST-Smokes plus gesamte Node-Suite; kein doppelter World-Commit durch Retrys/Swipes/Reloads. Simulationsvergleich nur mit geklärter Taktikparität.
- **Nicht** bei jeder neuen Version komplette Berichte hier anfügen. Aktueller Stand in [03](03_AKTUELLER_PROJEKTSTAND.md); Originalreview ausschließlich beim betreffenden Test; technische Implementierung in der Patchnote im Entwicklungsbranch. Diese Datei ist Index und verlässliche fachliche Leitplanke.
