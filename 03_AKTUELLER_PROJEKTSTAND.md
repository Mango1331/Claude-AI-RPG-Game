# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Stand: 05.11.2026 · einzige laufende Quelle für Build, Abnahme, offene Technik und nächste Arbeit.** [Arbeitsweise 01](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon 02](02_DESIGN_KANON.md) · [Roadmap 07](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalruns](testrun_10b/README.md).

## Aktueller Produktbuild und verifizierbare Grenzen

**Produktbranch:** `claude/c-planner-prototype-2026-10-02-gpt-c666` · **Build `4.3.0-c.6.6.158`** · [Commit `82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6). `main` führt die Dokumentation. Beim nächsten Einstieg beide Remote-HEADs erneut prüfen; neuere Arbeit nicht auf diese Referenz zurücksetzen.

V4-C / Ruleset 2, SillyTavern-Extension ohne zusätzliche Runtime-Abhängigkeiten. Planner versteht Spielerabsichten, Engine berechnet und bucht, Narrator erzählt, Extractor/Firewall persistieren zulässige Weltfolgen. Autoritativer Zustand entsteht aus den Chatevents; Save/Reload, Swipe/Edit und Replay bleiben verbindlich.

| Zuletzt umgesetzt | Maßgebliche Produktquelle |
|---|---|
| **.158 User02-Technik + NPC E0/E1:** Floor-/Passage-/Ankunftsgrenzen, Raumsuche, begrenzte Exit-Recovery, angenommene Führung, Kontextdiagnose/-auslieferung, Faktobjekte und persönlicher Gildenzeuge | [Umsetzung und Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md) |
| **.156 Stealth S1:** GO, vorbereitete Reisefortsetzung und lokale Ein-Band-Bewegung mit heimlicher Vorgehensweise; Detection gegen tatsächliche Beobachter am erreichten Ort | [S1-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX156_STEALTH_MANNER.md) |
| **.157 UI/QoL U1–U3:** kompakte Boardkarten, permanente Dungeonetage, bekannte Awareness, freie erreichbare Bodenobjekte und automatische Ankerwahl für genau ein gültiges gegnerisches AoE-Band | [UI-/QoL-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX157_USER01_UI_QOL.md) |

Architektur A/B1/C/D, Living Dungeons und F→E-Klassenannahme sind ältere Produktgrundlagen; ihre Fixkette und Fachquellen stehen in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). **NPC E0/E1 ist mit .158 als erster begrenzter Kontinuitätsschnitt implementiert; Stealth S2, E2+ und PULSE bleiben offen.**

## Teststand – Nachweisarten getrennt

| Nachweis | Ergebnis / Grenze |
|---|---|
| **Implementiererabnahme .158** | Node **2793/2793**, gezielte neue Suite **23/23** (erste Originalfälle auf sauberer .157: 6 rot/1 Kontrollfall grün). Replay **2235 Fälle, 515 exakt akzeptiert, 0 offen/veraltet**; gegenüber .157 ändern sich 41 einzeln begründete Datensätze ausschließlich bei Fakten/persönlichem Gildenwissen. Echter ST1.19-Host mit geskriptetem Provider: **Standard 70/70, Failsoft 76/76**, jeweils **0 PageErrors**. [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md). Kein unabhängiger GPT-Gegenreview und keine natürliche .158-Modellabnahme. |
| **Natürlicher User02 auf .157** | **37 Userinputs, 34 Enginezüge, 609 Events**, Mage L1→L7, drei Siege, Level-1-Clear, Abgabe und Lootverkauf; manuell beendet, kein technischer Terminalabbruch. |
| **Abgeschlossener Sol-Gegenreview** | 69/69 Exportgruppen identisch; alle **75 Chatprefixe** ohne Fold-/Validatorfehler; **32/32** originale Extraktionen mit gleichen persistierbaren Events/Zuständen reproduziert; **32/32 tatsächliche Narrator-Kontexte** exakt rekonstruiert. [Review §8](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md#8-abgeschlossener-sol-gegenreview--originalfold-requests-und-ursachenprüfung), [Mess-/Gegenprobendaten](testrun_10b/user-20261105-050449/SOL_PROBE_RESULTS.json). |
| **Natürliche Teilnachweise** | Zwei S1-Sneak-GOs funktionieren, Board-CSS positiv. **U3 wird bei I21 tatsächlich mit Planner-`target:null` und `unique area band` ausgeführt.** Eine vollständig ziellose Sprachvariante, vollständige Bodenfund→TAKE-Kette sowie weitere S1-Reise-/Unterbrechungsfälle sind damit nicht umfassend abgenommen. |
| **Bekannte Prüfgrenzen** | Alter zusätzlicher `smoke:browser`: GenerateRaw-Gebührenfixture scheitert bereits auf .155; kein Nachweis einer .156/.157-Regression. Der strenge, im Produkt ausgeschaltete Ownership-Assert meldet beim Original I8 einen `learn`/`entity.updated`-Konflikt; separat dokumentiert, keine bestandene strenge Ownership-Abnahme. Natürliche Windows-/Langzeit-Saveabnahme bleibt auf beobachtete Fälle begrenzt. |

## Persönlicher Test 02 – belegte Ausgangsbefunde auf .157

**Die folgenden Fehler sind die Ausgangsbelege für .158. Technische Korrektur umgesetzt; natürliche Gegenprüfung bleibt offen.**

**Vollständige Quelle:** [GPT-Review mit abgeschlossenem Sol-Nachtrag](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md), [16 chronologische Feedbackpunkte](testrun_10b/user-20261105-050449/USER_FEEDBACK_REVIEW.md), [Originale/Manifest](testrun_10b/user-20261105-050449/SOURCE_MANIFEST.md). Detailanalyse und ursprüngliche GPT-Bewertung bleiben dort; keine zweite Vollreview hier.

| Gewicht / Thema | Belegter Stand |
|---|---|
| **P1 Dungeon-/Floorintegrität** | Glimmerdeep besitzt nur Floor 1. Bereits **I28** entsteht dennoch ein Raum mit mechanischem Level 2; bei I46 ist es umgekehrt: Name Level 2, gespeicherter Floor 1. I48 verwirft vier erzählte Käfer korrekt als unzulässige Population. Kontrollierte Ankunft an einem schon angelegten Floor-2-Raum gelingt ohne zugehörigen Living-Floor; der Validator bleibt grün. Kein bloßer HUD-Fehler. |
| **P2 Raumsuche** | I43 wird wegen des Wortes „loot“ als erledigte Leichenplünderung beendet. Gegenprobe ohne dieses Wort führt den bestehenden Suchcheck aus; echte Corpse-Loot-Kontrolle bleibt korrekt gesperrt. |
| **P2 Exit/Ankunft** | I50: nach leerer Extractorantwort liefert Repair `arrived:false` und nur Zeit; keine vorhandene korrekte Ankunft durch World abgewiesen. Gegenprobe mit zulässigem Ankunftsdelta erreicht die Dungeonwurzel. |
| **P2 NPC-/Szenenübergänge** | Tam erinnert Drink/Brokerzusage, aber nicht autorisierte Nebenraumwechsel verwerfen Folgefakten und eine bedeutsame Erinnerung. Im tatsächlichen Request fehlen anwesende NPC-Karten mehrfach; auch Dungeontexte werden durch Priorität-0-Blöcke verdrängt. |
| **Kein neuer Kampf-/Finanzbug aus diesen Szenen** | Queen handelt regelkonform nach First Strike in Runde 1 und erneut vor Alaric in Runde 2. Angenommene 169 cp korrekt gebucht, obwohl erzählte Einzelpreise 199 cp ergeben; Endwallet 280 cp. Falsche 400/800-cp-Zwischenwerte korrigiert der vorhandene Preisweg in der Gegenprobe auf 40/80 cp. |

## Nächste fachliche Reihenfolge

1. **Unabhängiger GPT-Diff-Gegenreview von .158** auf Lücken, unnötige Eingriffe und Integritätsrisiken. Die Implementiererabnahme ersetzt diesen nicht.
2. Danach **persönlicher freier User-Run**: NPC-Kontinuität, angenommene Führung, Suche und Dungeonübergänge; anschließend längere Progression. Keine neue Pflicht-Vollbatchserie. E0 zeigt gelieferte/verlorene Engineabschnitte, garantiert keine natürliche Modellverwendung. Alte fehlerhafte Events/verworfene Erinnerungen werden nicht automatisch rekonstruiert.
3. **Stealth S2, E2+ und PULSE** bleiben eigene offene Vorhaben nach [07](07_ROADMAP_NACH_10B_ENTWURF.md), keine Nebenfeatures von .158.

**Freigabe:** Technikpaket + NPC E0/E1 ausdrücklich freigegeben und als .158 umgesetzt. Kein Auftrag für weitere Features. Nächster natürlicher User-Run nach unabhängigem Gegenreview.

## Abnahme und offene Grenzen

**10B wurde am 04.11.2026 auf .154 / `2482da2` als technischer Zwischenstand für persönliche Spieltests teilabgenommen.** Keine pauschale Abnahme späterer Builds oder fertige F-/E-, NPC-, Wirtschafts- und Weltbalance. Zusätzliche Vollbatches sind keine Pflicht; natürliche freie Usertests sind jetzt die primäre Datengrundlage. Level 15 und ausdrückliche E-Annahme bleiben Langlaufmeilensteine, keine allgemeine Erfolgsquote.

Ältere relevante Grenzen nur mit Quellen weiterführen: [Batch28](testrun_10b/batch-20261103-171839Z/REVIEW.md) – bekanntes bei Hessa verwahrtes Hemd fehlt im Ankunftskatalog, Rückgabe erzeugt zweite Objektidentität; Pricing-Repair positiv, natürliche ID-Repairquote offen. [User01](testrun_10b/user-20261104-162404/REVIEW.md) – Ursprung von Stealth/UI- und Brenna-Befunden; [NPC-Fachanalyse](recherche/NPC_KONTINUITAET_ANALYSE_20261104.md) enthält die Ursachen und Gegenbewertungen. Frühere Testzahlen/Entscheidungsgeschichte im [Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) und [Runindex](testrun_10b/README.md), nicht als laufende zweite Statusliste.
