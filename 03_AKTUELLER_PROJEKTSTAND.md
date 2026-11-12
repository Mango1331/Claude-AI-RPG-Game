# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Letzte verifizierte Abfrage: 12.11.2026.** **Dies ist die einzige laufende Statusquelle** – keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| | Bestätigter Stand |
|---|---|
| **Produkt** | `4.3.0-c.6.6.179` · [`59f868eaf3c4ed7942ddc42ba3d180fab44a72cd`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd) |
| **Produktbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666` |
| **Dokumentation** | `main` – aktuellen HEAD vor neuer Bearbeitung abfragen |
| **Architektur** | SillyTavern-Extension V4-C / Ruleset 2; Planner → deterministische Buchung → Narrator → Extractor/Firewall; autoritatives Eventlog |
| **Letzte berichtete Produktabnahme** | `.179`: 3050/3050 Node-Tests; Replay gegenüber bestehender akzeptierter Baseline ohne neue Änderungen; ST1.19 mit geskriptetem Provider 172/172 Standard und 177/177 Failsoft, **laut Implementiererpatchnote**, kein unabhängiger neuer Lauf dieser Dokumentationspflege |
| **Letzter natürlicher NPC-/PULSE-Lauf** | [Pilot 01](testrun_10b/npc-20261109-160250Z/REVIEW.md), **70 Eingaben auf `.174`**, nicht auf `.179` |

**Wichtige Nachweisgrenze:** Nach dem Pilot sind die Korrekturen `.175–.179` implementiert und technisch regressionsgeprüft. **Ihre Wirkung im freien Spiel mit `.179` ist noch nicht natürlich gemessen.** Kein Dokumentationsreview ändert den Produktstand.

## Was technisch bereits umgesetzt ist

| Bereich | Status; technische Details nur an der Quelle |
|---|---|
| **NPC E0/E1** | `.158`: kompakte NPC-Kontexte, Diagnose, Sofortkontinuität. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md) |
| **NPC E2-A / E2-B** | `.169–.173`: Wiederanwesenheit/Schalterbelege, Ankunftskarten, persönliche Threads, eindeutige Zuordnung. [Fachplan](patch_plans_10b/NPC_E2_E3_FACHPLAN.md) und [`.173`-Gegenreview](patch_plans_10b/REVIEW_NPC_E2B173_PRODUKTDIFF_GPT.md) |
| **NPC E3** | `.174`: `voice/manner/interest` erst aus belegter späterer Begegnung, `scene.since`, Grenzen und Karten. **0 akzeptierte Anker im alten natürlichen Pilot**. [E3-Review](patch_plans_10b/REVIEW_NPC_E3_174_PRODUKTDIFF_GPT.md) |
| **PULSE A/C/B** | `.162–.168`: gemeinsames Fenster, ROAD AHEAD, Rastunterbrechung und Dungeonwanderungen. **Paket D nur Analyse nach freiem Lauf.** [PULSE-Fachplan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) |
| **Gameplay/QoL** | `.155–.161`: Stealth S1, spielbare Board- und Dungeonanzeigen, Starter-/Userfixes, editierbare Eingabeentwürfe; **Stealth S2 noch geplant**. [Stealth-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md) |
| **Pilot-01-Korrekturen** | `.175` Dungeon-Slot/Handelsware; `.176` Kontext-/`met`-/Schalterevidenz und Börseninfo; `.177` Threads und Szenen; `.178` Identität/Ausstellung; `.179` korrekte Eigentumsherkunft `laid_by_pc`. [Produktpatchnotes/Einzelreviews](testrun_10b/npc-20261109-160250Z/REVIEW_179_UND_D3_GPT.md) · [`.179` Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/docs/PILOT01_179_D5_PROVENANCE.md) |

## Was der letzte natürliche Lauf gezeigt hat

**Pilot 01 / `.174`:** 70 echte LLM-Eingaben, 8 offene PULSE-Fenster, 17/28 Beobachtungsziele; E3-Anker 0; Schalterbelege, NPC-Duplikate, falsche Thread-Zuordnung, Primer-/Händlerbesitz und Kontextauslieferung waren natürliche Problemfelder. Die **Korrekturen sind nicht automatisch ein neuer freier Erfolgsnachweis**. [Originalreview](testrun_10b/npc-20261109-160250Z/REVIEW.md) · [Originalarchiv/Hashes](testrun_10b/npc-20261109-160250Z/SOURCE_MANIFEST.md) · [Korrekturreviews](testrun_10b/npc-20261109-160250Z/REVIEW_175_177_PRODUKTDIFF_GPT.md).

**Zuletzt archivierter persönlicher Run:** [User04 auf `.159`](testrun_10b/user-20261106-072640/REVIEW.md), 46 Eingaben, 38 Enginezüge, Level 1→8, Dungeon-Clear/Abgabe, offener Abschluss. Andere Runs im [Runindex](testrun_10b/README.md), **nicht** als zweite Teststatistik hier.

## Unmittelbare nächste Arbeit – bewusst getrennt

1. **Natürlicher NPC-/PULSE-Run auf unverändertem `.179`**: `met`/`handled_by`, E3-Gelegenheiten/Kandidaten/Kartenverwendung, bezahlte bzw. erledigte Threads, Personenidentität, Ereignisdichte/Dungeon/Rast, Guard-Ursprünge vs. Folgekaskaden und subjektives Spielgefühl auswerten. [Opus-NPC-Audit mit GPT-§9](recherche/NPC_E2_E3_KONTINUITAETSAUDIT_OPUS55.md). **Noch nicht erfolgt.**
2. **Preis-/Planner-Korrektur als getrenntes gebündeltes Paket prüfen/umsetzen:** mehrfach gleiche Betragsbelege, ungeprüfte `max_cp` beim Zielkauf, Rabatt-Autorität, Belegreparaturen und `finish=length`-Budgetprobleme. **Codebelegt, bisher nur empfohlen**, nicht implementiert. [Fable §13 + GPT §14](recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) · [Opus §5 + GPT §12](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md).
3. **NPC-/Kontext-Kandidaten nach Lauf:** D3-Teillieferung von `relevant` (nicht pauschal Spielerzitate löschen); E3-V-1 (80-Zeichen-Grenze und echter Eligibility-Hinweis im Extractor); O1-B1 (nur schlüssige Szenenreihenfolge). **O1-Whitelist, O1-B2 und O2-stay nicht freigegeben**. [D3-Messung](testrun_10b/npc-20261109-160250Z/D3_KONTEXTANALYSE_RELEVANT.md) · [O1/O2-Fachplan einschließlich GPT-§9](recherche/FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md).
4. **Noch geplante Features:** Monster A1 (Anatomie) und A2 (Bewaffnung) mit Opus-Mini-Gegenreview §9, Combat K1 Main/Minor, Stealth S2. **Kein Produktcode dafür auf `.179` geändert.** [Monsterfachplan](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md) · [Main/Minor](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) · [Roadmap 07](07_ROADMAP_NACH_10B_ENTWURF.md).

**Offene Monster-Designentscheidungen vor A2-Implementierung:** Startgewichte/Verwertbarkeit, Altprofil-Lootquote, Schleimkern nur mit Beleg, gemischte Gruppen („für alle oder Standard“) – bisher Empfehlungen, keine selbstvollziehende Freigabe. A2-Waffen in DUNGEON AHEAD **zurückgestellt**. E4/E5, PULSE D, Engine-Shops, Bossphasen und größere Balancefragen bleiben ebenfalls getrennte spätere Entscheidungen.

## Architekturentscheidungen und Grenzen

Fables Architekturdiagnose ist durch [Opus und unabhängigen GPT-Gegenreview](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) differenziert worden. **Vorab gebuchte Ankunft V1 derzeit nicht empfohlen**: geringe belegte Entlastung, alte Pfade würden nicht entfallen. **Angriffsautorisierung und tatsächlich ausgeführter Angriff getrennt halten**; Dungeon-Slotanwesenheit ist kein automatischer Erstschlag. Keine reflexartige Entfernung der erreichbaren Straßenregel. **O1-B1** ist nur eine enge alternative Normalisierung vor einer Ankunft, nicht die Freigabe ortsneutraler Ereignisse nach einer nicht erreichten Szene. Originalfallbezogene Tests statt weiterer großer Generalreviews.

## Historische Detailquellen

Die bis zum heutigen Schnitt sehr lange frühere 03-Fassung mit **allen Builds `.175–.179`, technischen Zahlen, P2-/P3-Gegenreviews und offenen Pilotfällen** bleibt [im Git-Snapshot vor dieser Konsolidierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) vollständig erhalten. Für genaue damalige Testzahlen/Fixtures die jeweiligen Produktpatchnotes und [Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) lesen. Alle Quellenarchive bleiben unverändert. **Kein neuer Test durch diese Dokumentationspflege.**
