# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Letzte verifizierte Abfrage: 13.11.2026.** **Dies ist die einzige laufende Statusquelle** – keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| | Bestätigter Stand |
|---|---|
| **Produkt** | `4.3.0-c.6.6.181` · [Produktpatch `b83b59b`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b83b59bbd6f7738ec5070a76337b539fb4b9ae00) · [Build-/Patchnote-HEAD `b9e07be`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9e07be1f9cbe2f2d6dff387e10587f78817eefb) |
| **Produktbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`b9e07be`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9e07be1f9cbe2f2d6dff387e10587f78817eefb) |
| **Dokumentation** | `main` – aktuellen HEAD vor neuer Bearbeitung abfragen |
| **Architektur** | SillyTavern-Extension V4-C / Ruleset 2; Planner → deterministische Buchung → Narrator → Extractor/Firewall; autoritatives Eventlog |
| **Letzte berichtete Produktabnahme** | `.181`: laut Implementierer **3085/3085** Node-Tests, **13/13** neue PULSE-Regressionen, **2235** Replays ohne Abweichung (neuer PULSE-Pfad durch Korpus nicht abgedeckt). **ST1.19-Standard-/Failsoft-Smoke seit `.180` nicht gelaufen**, technische Freigabe unter Vorbehalt; [unabhängiger Codegegencheck §10](testrun_10b/npc-20261112-220625Z/REVIEW.md). |
| **Letzter natürlicher NPC-/PULSE-Lauf** | [Dreierbatch 12./13.11.2026](testrun_10b/npc-20261112-220625Z/REVIEW.md) auf `.179`, 70/70/48 Eingaben, E3-Anker **0**, Rogue/Mage-Ortsdrift (P2), Mage-Planerformatabbruch; **keine natürliche E3-/PULSE-D-Vollabnahme** |
| **Aktueller NPC-/PULSE-Runner** | [Drei voneinander getrennte LLM-Spieler](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd02cd627776b9fa2e701a7815226a45002cd262/avereth-engine/docs/NPC_PULSE_3_PERSONAS_RUNNER.md): Warrior/Rogue/Mage. **Echter LLM-Batch ausgeführt**, Runner-Auswertung vorhanden; lokale Vollsuite/gesonderte Hosttests im Zuge dieses Reviews **nicht** neu ausgeführt |

**Wichtige Nachweisgrenze:** Die natürlichen Fehler wurden auf `.179` in drei LLM-Kampagnen beobachtet. P2-1/P2-3 sind in `.180`, P2-2 in `.181` mit gezielten Regressionen korrigiert, **aber noch nicht natürlich nachgeprüft**. Positiver unabhängiger Codegegencheck ist keine ST-Abnahme. [Dreierbatch samt Fable §8 und GPT §§9–10](testrun_10b/npc-20261112-220625Z/REVIEW.md).

## Was technisch bereits umgesetzt ist

| Bereich | Status; technische Details nur an der Quelle |
|---|---|
| **NPC E0/E1** | `.158`: kompakte NPC-Kontexte, Diagnose, Sofortkontinuität. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md) |
| **NPC E2-A / E2-B** | `.169–.173`: Wiederanwesenheit/Schalterbelege, Ankunftskarten, persönliche Threads, eindeutige Zuordnung. [Fachplan](patch_plans_10b/NPC_E2_E3_FACHPLAN.md) und [`.173`-Gegenreview](patch_plans_10b/REVIEW_NPC_E2B173_PRODUKTDIFF_GPT.md) |
| **NPC E3** | `.174`: `voice/manner/interest` erst aus belegter späterer Begegnung, `scene.since`, Grenzen und Karten. **0 akzeptierte Anker im alten natürlichen Pilot**. [E3-Review](patch_plans_10b/REVIEW_NPC_E3_174_PRODUKTDIFF_GPT.md) |
| **PULSE A/C/B** | `.162–.168`: gemeinsames Fenster, ROAD AHEAD, Rastunterbrechung und Dungeonwanderungen. **Paket D nur Analyse nach freiem Lauf.** [PULSE-Fachplan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) |
| **Gameplay/QoL** | `.155–.161`: Stealth S1, spielbare Board- und Dungeonanzeigen, Starter-/Userfixes, editierbare Eingabeentwürfe; **Stealth S2 noch geplant**. [Stealth-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md) |
| **Dreierbatch-Korrekturen** | `.180` Registrierungsgebühr und Planner-`[]` (P2-1/P2-3); `.181` autoritativer PULSE-Reisehalt (P2-2). [`.180` Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c45a134cbfb866133e8a8246e56b9bd7f072e39c/avereth-engine/docs/BATCH1112_180_REGISTRATION_PLANNER.md) · [`.181` Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b9e07be1f9cbe2f2d6dff387e10587f78817eefb/avereth-engine/docs/BATCH1112_181_PULSE_ROAD_STOP.md) · [Gegencheck §10](testrun_10b/npc-20261112-220625Z/REVIEW.md) |
| **Pilot-01-Korrekturen** | `.175–.179` inklusive NPC-/Kontext-/Identitäts-/Objektfixes. [Detailreview](testrun_10b/npc-20261109-160250Z/REVIEW_179_UND_D3_GPT.md) · [`.179` Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/docs/PILOT01_179_D5_PROVENANCE.md) |

## Was die natürlichen Läufe gezeigt haben

**Dreierbatch / `.179`:** 188 LLM-Eingaben (70/70/48), P2-Registrierungs-/Plannerblockade und PULSE-Ortsdrift, **0 E3-Anker**; die Folgepatches `.180/.181` sind noch nicht natürlich geprüft. [Review §§1–10](testrun_10b/npc-20261112-220625Z/REVIEW.md).

**Pilot 01 / `.174`:** 70 echte LLM-Eingaben, 8 offene PULSE-Fenster, 17/28 Beobachtungsziele; E3-Anker 0; Schalterbelege, NPC-Duplikate, falsche Thread-Zuordnung, Primer-/Händlerbesitz und Kontextauslieferung waren natürliche Problemfelder. Die **Korrekturen sind nicht automatisch ein neuer freier Erfolgsnachweis**. [Originalreview](testrun_10b/npc-20261109-160250Z/REVIEW.md) · [Originalarchiv/Hashes](testrun_10b/npc-20261109-160250Z/SOURCE_MANIFEST.md) · [Korrekturreviews](testrun_10b/npc-20261109-160250Z/REVIEW_175_177_PRODUKTDIFF_GPT.md).

**Zuletzt archivierter persönlicher Run:** [User04 auf `.159`](testrun_10b/user-20261106-072640/REVIEW.md), 46 Eingaben, 38 Enginezüge, Level 1→8, Dungeon-Clear/Abgabe, offener Abschluss. Andere Runs im [Runindex](testrun_10b/README.md), **nicht** als zweite Teststatistik hier.

## Unmittelbare nächste Arbeit – bewusst getrennt

1. **Nächste Implementierung nach `.180/.181`: P2-4 (falsche Queststatus-Korrektur nach bedingter Abgabe) und begrenztes P2-5 (bedeutungsneutrale Extractor-Formfehler)**; danach E3-V-1. Bestehende [Originalbelege und unabhängige Bewertungen §§8–10](testrun_10b/npc-20261112-220625Z/REVIEW.md) reichen für einen konkreten Umsetzungsauftrag; kein neues Fable-Audit. **ST1.19-Smoke nur in isolierter Testinstallation**, nicht mit persönlicher ST-Datenwurzel.
2. **Preis-/Planner-Korrektur als getrenntes gebündeltes Paket prüfen/umsetzen:** mehrfach gleiche Betragsbelege, ungeprüfte `max_cp` beim Zielkauf, Rabatt-Autorität, Belegreparaturen und `finish=length`-Budgetprobleme. **Codebelegt, bisher nur empfohlen**, nicht implementiert. [Fable §13 + GPT §14](recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) · [Opus §5 + GPT §12](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md).
3. **NPC-/Kontext-Nacharbeit belegt:** E3 im Dreierbatch weiterhin **0 Anker**, zwei Kandidaten scheitern an 80-Zeichen-Regel; **E3-V-1** ist begründet. Bei `handled_by` zählt der Evaluator nur nachgelagerte zusätzliche Wissensbuchungen – er **übersieht mehrere bereits im Spielerzug gebuchte `knowledge.gained`** (GPT §9.1). Keine pauschale Bearbeiter-Freigabe. `relevant` in 48/173 Erzählkontexten; D3-Teilauslieferung bleibt begrenzter Kandidat. [Dreierbatch §§8–10](testrun_10b/npc-20261112-220625Z/REVIEW.md) · [D3-Voranalyse](testrun_10b/npc-20261109-160250Z/D3_KONTEXTANALYSE_RELEVANT.md).
4. **Noch geplante Features:** Monster A1 (Anatomie) und A2 (Bewaffnung) mit Opus-Mini-Gegenreview §9, Combat K1 Main/Minor, Stealth S2. **Bis `.181` dafür keine Umsetzung.** [Monsterfachplan](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md) · [Main/Minor](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) · [Roadmap 07](07_ROADMAP_NACH_10B_ENTWURF.md).

**Offene Monster-Designentscheidungen vor A2-Implementierung:** Startgewichte/Verwertbarkeit, Altprofil-Lootquote, Schleimkern nur mit Beleg, gemischte Gruppen („für alle oder Standard“) – bisher Empfehlungen, keine selbstvollziehende Freigabe. A2-Waffen in DUNGEON AHEAD **zurückgestellt**. E4/E5, PULSE D, Engine-Shops, Bossphasen und größere Balancefragen bleiben ebenfalls getrennte spätere Entscheidungen.

## Architekturentscheidungen und Grenzen

Fables Architekturdiagnose ist durch [Opus und unabhängigen GPT-Gegenreview](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) differenziert worden. **Vorab gebuchte Ankunft V1 derzeit nicht empfohlen**: geringe belegte Entlastung, alte Pfade würden nicht entfallen. **Angriffsautorisierung und tatsächlich ausgeführter Angriff getrennt halten**; Dungeon-Slotanwesenheit ist kein automatischer Erstschlag. Keine reflexartige Entfernung der erreichbaren Straßenregel. **O1-B1** ist nur eine enge alternative Normalisierung vor einer Ankunft, nicht die Freigabe ortsneutraler Ereignisse nach einer nicht erreichten Szene. Originalfallbezogene Tests statt weiterer großer Generalreviews.

## Historische Detailquellen

Die bis zum heutigen Schnitt sehr lange frühere 03-Fassung mit **allen Builds `.175–.179`, technischen Zahlen, P2-/P3-Gegenreviews und offenen Pilotfällen** bleibt [im Git-Snapshot vor dieser Konsolidierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) vollständig erhalten. Für genaue damalige Testzahlen/Fixtures die jeweiligen Produktpatchnotes und [Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) lesen. Alle Quellenarchive bleiben unverändert. **Kein neuer Test durch diese Dokumentationspflege.**
