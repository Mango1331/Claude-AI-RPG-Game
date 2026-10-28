# Avereth Engine – Patch 10B: Fachthemen und Quellenwegweiser

**Stand: 28.10.2026, einschließlich Fail-soft Teil 1 auf .105.** **Kein paralleler aktueller Projektstand:** Build, Abnahme, Freigabe und nächster Schritt stehen ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md). Verbindliche Regeln: [02](02_DESIGN_KANON.md). Originaltests: [testrun_10b/README.md](testrun_10b/README.md).

Das ungekürzte **historische 10B-Journal (ca. 224 KB, §§0–32)** bleibt [auf Commit 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) erhalten. Alte „offen“-/„als Nächstes“-Angaben sind **historisch, keine freigegebenen Patches**. Alte 53-Punkte-Matrix und die Reviewketten dort gezielt nachschlagen, nicht wieder vollständig in diese Datei kopieren.

## 1. Laufende Fachbereiche und Entscheidungsgrenzen

| Bereich | Fachliche Leitplanke / Beweisschwelle | Vertiefung |
|---|---|---|
| **Natürliche GLM-/ST-Langläufe** | Spielerchat, Engine-Events und Completion-Requests gemeinsam auswerten. Regelgebuchter Tod, manuelles Ende, Modelltransport, Planner-/Extractor-Abbruch, sichere Fortsetzung und verlorene Spielerhandlung **getrennt** zählen. | [Alle Runs](testrun_10b/README.md), [Batch 4](testrun_10b/batch-20261028-022553Z/REVIEW.md) |
| **Fail-soft/Recovery (Teil 1 implementiert; Teil 2 offen)** | Unverbindliche Modellfehler dürfen nicht jeden Lauf abbrechen; **niemals** aus fehlerhafter Prosa Geld, Ware, Ortswechsel, Schlaf, Quests, Kampf oder irreversible Events erfinden. Planner-Rückfrage ohne Buchung, Extractor-Deltas nach Autorität und kausaler Abhängigkeit, atomarer Replay-/RNG-Schutz, kanonische Korrektur für Folge-Narration. Kein blindes try/catch um mutierende Reducer. | [Zweistufiger Fachplan und Abnahme](patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md), [Originalgegenprüfung](testrun_10b/batch-20261028-022553Z/SOL_COUNTERREVIEW.md) |
| **Kampf: Main + Minor (Design verbindlich, Umsetzung ausstehend)** | Maximal eine Haupt- und eine Nebenaktion; normale Bewegung und Mobility-Skills teilen den Minor-Slot. NPC-/PC-Parität, atomare Phasen, Legacy/Replay/First Strike/Ambush und Fairnessvergleich beachten; noch kein Produktpatch. | [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md), [02 §5](02_DESIGN_KANON.md#5-kampf-und-progression) |
| **F→E-Scaling (keine Zahlenfreigabe)** | PC/Monster/NPC/Region, Skills, Gear, Loot, Kaufpreise, Guild-/Combat-XP und erreichbare Lernquellen **zusammen** untersuchen; keine Level-Autoskalierung der Monster und keine ungesicherten Pauschalbuffs. | [GPT](testrun_10b/scaling_gpt.md), [Sol](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [Beobachtungen](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md) |
| **Simulation/Encounter-Fairness** | Echte NPC-/PC-Skill- und Taktikparität ist Voraussetzung für seriöse Zahlenbalance. Rogue-L2-Tod gegen vier L6/7-Wölfe ist ein Fairness-Prüffall, **kein** bestätigter Anlass für sofortigen Nerf. | [Batch 4 §4](testrun_10b/batch-20261028-022553Z/REVIEW.md#4-rogue-input-29--echter-tod-vier-level-67-wölfe-gegen-level-2), [ältere Sim-Methodik](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#3-b--kampfsimulator-erste-ergebnisse-methodische-leitplanken) |

**Abnahmegrenzen:** Testfixtures/Mock-Smokes sind kein natürlicher GLM-Level-15-Beleg. Bei jedem Patch originalgetreue Rot-/Grün-Fälle, echte positive und negative Gegenbeispiele, vollständige Node-Suite und risikogerechten ST-Smoke vorsehen. Replay/Swipe/Reload, idempotente Buchungen und keine doppelte Auszahlung bleiben unantastbar.

## 2. Produktgeschichte: nur die für 10B relevanten Fixketten

| Version | Dauerhafter Kern / späterer Status | Quelle |
|---|---|---|
| **.58–.66** | Fakt-/Guard-/Delivery-Nachweise, technische Recovery und ST-1.19-Host-/Swipe-Schutz | [Historischer Reviewpfad](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#19-10b-4a--kleiner-planner-leerantwort-fix-durch-chatgpt-build-61-24102026), [Hotfix .66](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cd9b338773783644a79a39f367629e6aaeead05) |
| **.67** | Combat- und Guild-XP auf Nutzerauftrag verdoppelt; keine endgültige Scalingfreigabe | [XP-Notiz](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_XP_REWARDS.md) |
| **.78–.98** | Quest-/Dungeon-/World-Authority, NPC-Kontinuität, Handel, F-Startwerte/Lernquellen und Habitat-/Encounter-Korrekturen; keine endgültige Wirtschaftsbalance | [Runindex](testrun_10b/README.md), [Habitat .98](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c1ed54b596bb50bfc55b50d2c3d99baeddba72e7) |
| **.99–.100** | Reise-/Kaufautorität vor dem ersten großen Batch, Vorbereitung Runner-Matrix | [Prebatch-Notiz](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/65d56e93cf45fdea62517150784f475561f86820/avereth-engine/docs/PATCH_PRE_BATCH_RUN22.md) |
| **.101** | Recovery nach Fehlerklasse, autorisierte chronologische Ankunft, Trade-/Quest-Weltverträge | [Patchnote .101](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md) |
| **.102–.103** | Verkauf, wiederkehrende NPCs, Provider-/Narrator-Recovery, offene Angebote und Clarify/Chronologie nach weiteren Batches | [Commits .102](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/57ec7f6ef98209dc72e09508e2cd42cb1e9e8d09), [.103](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/48bdf5d74515e31812651d64a77f0511d1038048) |
| **.105** | Sichere Modellfehlerfortsetzung mit erhaltener Engine-Autorität, geschützten Korrekturen, terminalem Hostabschluss und bestätigten Fehlerrecords; Teil 2 und Combat offen. | [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f44bebc2bf4a1245a2c8c4e8140e7a86f0b7a420/avereth-engine/docs/PATCH_FAILSOFT_CONTINUATION.md) |
| **.104** | Clear-Duplikatprävention, eindeutige Quest-Belohnungsattribution, vorhandene kanonische Manualkäufe bei erfüllten Voraussetzungen. **Main/Minor und Fail-soft nicht umgesetzt.** | [Patchnote .104](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016/avereth-engine/docs/PATCH_BATCH3_GUILD_CLEAR_AND_CANON_PURCHASES.md) |

## 3. Natürliche Batchkette und neueste Rückschlüsse

| Batch / Version | Maßgebliches Ergebnis | Unabhängige Originalreview |
|---|---|---|
| **1 / .100** | Sechs gestartet, fünf technische Stopps, ein manueller Stopp. Ausgangspunkt des .101-Recovery-Fachpakets, nicht dessen Live-Abnahme. | [GPT](testrun_10b/batch-20261027-030034Z/REVIEW.md), [Sol](testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md) |
| **2 / .101** | Fünf ausgewertete Runs, davon zwei technische Endabbrüche; Guild-Warrior/Rogue 150 Inputs. | [Review](testrun_10b/batch-20261027-073917Z/REVIEW.md) |
| **3 / .102** | 439 Inputs: Warrior 250/L10, Mage 102/L5 fataler Plannerpreis, Rogue 87/L2 regelgebuchter Tod; echte Narrator-Provider-Recovery. Folgebefunde führten zu .103/.104. | [GPT](testrun_10b/batch-20261027-150205Z/REVIEW.md), [Sol](testrun_10b/batch-20261027-150205Z/SOL_COUNTERREVIEW.md) |
| **4 / .104** | 212 Inputs: Warrior 137/L7 Planner-Abbruch bei Quote/Stückpreis; Mage 46/L5 Extractor-Abbruch nach nicht gebuchter Gasthausreise; Rogue 29/L2 echter Tod. **Zwei konkrete Fail-soft-Rotfälle, ein mechanischer Gegenfall.** | [Review](testrun_10b/batch-20261028-022553Z/REVIEW.md), [Quellen](testrun_10b/batch-20261028-022553Z/README.md) |

**Die .104-Batch-Rotfälle sind nicht identisch:** Beim Warrior verhindert ein unsicherer Handel zunächst korrekterweise eine Auszahlung; die Fehlermeldung darf nur die Unterhaltung, nicht den Geldstatus entkoppeln. Beim Mage sind unautorisiert erzählte Ankunft, Kauf und Schlaf **ein zusammenhängender Abhängigkeitskonflikt**; bloßes Ignorieren des falsch geformten Ambient-NPC-Deltas würde Phantomzustände konservieren. Ein regelgebuchter Tod ist kein Soft-Recovery-Fall. Die natürliche .104-Runde hat die doppelte Clear-Vertragsgrenze und den Manual-Kauf nicht systematisch abgenommen. Keine unzulässige A/B-Aussage zwischen .102 und .104 (unterschiedliche Seeds/Abbruchgründe).

## 4. Spätere Designfragen – vorgemerkt, nicht zur Implementierung freigegeben

- **Monster/Beute/Sapienz:** 19 Anchors sind unterschiedliche Kampf-/Verhaltensprofile, **kein** vollständiger Arten-/Anatomiekatalog. Konkrete anatomische Beutefehler und Sapienz-Konflikte gezielt prüfen, keinen pauschalen Species-Umbau. [Alte Reviews §§5–7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#5-monster-lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse).
- **Chase/Flee/Pacing:** tatsächliche Intent-/Engine-Anbindung und gebuchte Orts-/Encounterzustände prüfen, bevor eine neue Chase-Engine, ein Auto-Catch oder Fluchtgarantien erwogen werden. [Historischer Gegenfall §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#8-c--verfolgung-flucht-rückzug-ausführlicher-design-fix-kandidat).
- **Langlaufqualität:** bei 100/250/500/1.000 Inputs Kontext-/Promptwachstum, Fold, Reload, Swipe, NPC-/Quest-/Objektgedächtnis beobachten. Vertiefte NPC-Memory bleibt zurückgestellt; [Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).
- **Balanceregel:** keine heimliche PC-Level-Anpassung der Monster, keine XP-Abschwächung oder Gear-/Preisbuffs aus einem einzelnen Todes-/Stoppfall. Ältere Einzelpreise, XP-Zahlen und Blink-Annahmen sind **historische Vergleichswerte, kein freigegebener Zielzustand**.

## 5. Pflege- und Reviewregel

Fachliche Änderungswünsche erst mit Original-Engineevent, Spielerchat, passenden LLM-Requests, gezeigtem Istcode und Gegenfällen unterlegen. Keine Implementierung allein aus einem Review oder aus der Existenz eines Patchplans. **Technische Details in die Fachpatchnote des Entwicklungsbranches; vollständige Liveanalyse zum Run; nur knapper Status nach 03; hier nur übergreifende Leitplanken und Quellen.** Bereits gelesene historische Archive nicht pauschal erneut vollständig laden.
