# GPT-Review User13 · .213 · 25.11.2026

## 1. Methode und Quellen

Ausgewertet wurden die vier persönlichen Originaluploads: vollständiger gespeicherter JSONL-Chat, separat exportierte Ereignisse, kumulativer ST-Logger und spontanes Spielerfeedback. Der Chat hat 24 JSONL-Zeilen einschließlich einer Metadatenzeile und 23 Nachrichten M0–M22. Alle 21 exportierten Ereignisgruppen entsprechen exakt den Chat-Events an denselben Nachrichtenindizes; Summe 175. Die 11 gespeicherten Spielereingaben erzeugen 11 turn.begun, einschließlich zweier Charaktererstellungszüge. Neun Extractorabschlüsse applied, davon einer repariert. Keine vollständige unabhängige Engine-Fold-/Replay-Ausführung; dies ist eine Originaldaten- und Quellcodeprüfung. Der gelöschte HUD-Versuch ist über den ST-Logger als physischer Request #22 rekonstruierbar, nicht als erhaltene Chatnachricht. Die zusätzliche Screenshotbeobachtung gehört nicht zu den vier archivierten Originaluploads; derselbe Fehler ist im Logger belegt.

Build 4.3.0-c.6.6.213, Codebasis a89c690dbe0037f1c4d19a8d762e5b0fed207eab; ST 1.19.0 Release 06bde939f, Node 24.19.0, GLM-5.3-Flash, reasoning low, nicht gestreamt. Seed 1466412210. Keine Änderungen am Produktcode. 

## 2. Verlauf und erfolgreiche Verbesserungen

| Turn / Nachrichten | Ergebnis |
|---|---|
| T1–2 / M1–4 | Mage, Flame Lance + Arcane Wave; Basiswerte 5, INT/WIL 6; Start 80 HP, 72 MP, 50 cp. |
| T3 / M5–6 | Stadt und Gildenhalle erreicht, 60 Minuten; Erzähler lässt Alaric ungefragt zweimal nach dem Weg fragen, trotz Contract. Für diesen Lauf nachrangige Agency-Beobachtung; keine zusätzliche Mechanik. |
| T4–5 / M7–10 | Registrierung korrekt für 20 cp, 30 cp verbleiben, Guild plate/Novice. Der Extractor versucht zwei unnötige Fakten (Power Rank und falsches Namenssubjekt), Firewall weist sie ab. |
| T6 / M11–12 | Ein Boardgeneratorrequest, fünf gültige Aufträge ohne Board-Repair: Ratte L1/40 cp, Wasserschlangen L2/55 cp, Eber L3/80 cp, Mossback L1-Clearance Questlevel 4/150 cp, Wölfe L5/160 cp. Einsteigerwahl und schwierigere Alternativen vorhanden. |
| T7 / M13–14 | HUD-Questannahme ohne Planner; eine X-Reparatur; Auftrag active. |
| T8 / M15–16 | Reise mit offenem Danger-PULSE nach 210 Min am bekannten alten Steinbruchweg unterbrochen. Drei bewaffnete Banditen erscheinen, nicht auf PC-Level skaliert. |
| T9 / M17–18 | HUD-Rollenspielmodus, Arcane Wave + Zurückweichen als geordnete Phase. Kein P. Drei Treffer (23/20/24), 14 MP. Gegner erst Sidestep, dann erneute Annäherung statt endloser Schleife. Messerbandit trifft mit Signature Skill für 48 HP. |
| T10 / M19–20 | Freitextkapitulation nach verworfenem HUD-Versuch. Mechanisch keine Kapitulation/Abgabe, NPC verlangt mehr. |
| T11 / M21–22 | Spieler akzeptiert Abgabe von Silber und Stab. Erzähler stellt neue Übergabebedingungen, keine mechanische Abgabe und kein Kampfabschluss. |

Die Stufen der drei Banditen werden bereits in M16 mit 3, 1, 6 festgelegt; M17 Kampfprofile bestätigen 100, 80, 130 HP. In der Reihenfolge HUD A/B/C: L1 (Axt), L3 (Knüppel), L6 (Messer). Ende T9: 60/80, 77/100, 106/130 HP; PC 32/80. Die Welt darf gefährliche Begegnungen erzeugen. Kein Anlass, Gegner allein aufgrund dieses Laufs wieder abzuschwächen. Der Spieler entschied sich selbst für den Angriff per HUD; sein begleitender Text war in diesem Modus Rollenspiel, keine fehlende Angriffserkennung. Kein Nachweis, dass jede Stärkeverteilung langfristig ausgewogen ist.

## 3. R1 – Kampfkapitulation, fehlende PC-Mechanik (P1)

Originalsequenz:

- Gelöschter HUD-Free-Versuch vor T10: Zurückweichen + Text „fuck *i curse and lift my hands and say* okay okay... i surrender... i only have 3 Silver left but its not worth to lose my life over it. *i throw the 3 silver out of my pouch towards them“. ST-Request #22: other mit Kapitulation und Münzwurf, hud_binding.id 36d336a6-08da-472a-b9ec-ec48ef2c9f00, decision conflict, seqs []. Die Modellbegründung erwägt sogar die Vereinbarkeit, lehnt mangels expliziten Bewegungsworts ab. In der UI „HUD und Freitext sind noch nicht eindeutig verbunden“.
- M19 / Request #23: identischer Text ohne HUD. Planner other, what „surrender and throw 3 silver from his pouch to the bandits“.
- M20: Fenn nimmt laut Prosa die drei Silber auf, verlangt ganzen Beutel und Stab. X speichert demands und took als Fakten, nicht als Besitz-/Geldtransfer. Fünf weitere Delta-/Identitätsvorgänge, u.a. zwei abgewiesene Positionsdeltas; keine Zahlung.
- M21 / Request #26: „i accept *i say and give them all my silver and the staff*“. Planner other, what „hands over the whole pouch of silver and the staff to the bandits“.
- M22: NPC fordert Ablegen, Rückwärtsgehen, Abholen durch Martel. Der Text zeigt ausdrücklich noch keine ausgeführte Stabübergabe. X erfasst Namen, sichtbaren Dungeon und Bedrohungsthread.

T10 und T11 haben encounter.updated, aber outcome.records leer. Beide bleiben Runde 2, aktiver PC, HP 32, MP 58, Geld 30 cp. Starter Arcane Staff bleibt ausgerüstet; nur eine coin.changed im Gesamtexport (Registrierung -20 cp). Die Spielhandlung ist narrativ sinnvoll, besitzt jedoch keine mechanische Auflösung. Der Erzähler kann bereits autonom ein Gegenangebot formulieren; es fehlt der kanonische mechanische Anschluss.

Codeprüfung am Produktcommit:
- `src/action_input.js:214–228` reconcileHudPlan verlangt passende use-Bindung; sonst gesamte Eingabe abgelehnt.
- `src/v4/runtime.js:380–381,443`: actionRefused liefert events:[].
- `src/v4/planner.js:253–279`: Kampf-Storyvokabular nur activity; keine PC-Surrender- oder Verhandlungsaktion. `mapPlan` Zeilen 913–943 markiert sonstige Storyhandlungen/other als nicht ausgeführt und kann narrative ohne mechanische Hauptaktion liefern.
- `src/combat.js:883,1026–1030`: bestehende NPC-Surrender-Logik, kein entsprechender PC-Mechanismus. Terminalprüfung um Zeile 1180 prüft u.a. PC defeated/escaped; surrender darf nicht blind mit NPC-Ausscheiden gleichgesetzt werden.
- `src/v4/world.js`: vorhandener coerce-Pfad für Raub/Fine usw. ist keine freiwillige PC-Kapitulationsvereinbarung. Keine Umdeutung freiwilliger Abgabe in Raub, keine freie Extractor-Autorität über PC-Inventar.

Die UI-Blockade ist der erste sichtbare Fehler; ein Fallback ohne HUD löst die darunterliegende Lücke nicht. Unbegrenzt aufeinanderfolgende rein narrative Verhandlungen könnten mechanisch den Kampf einfrieren; im Original sind zwei solche Züge belegt. Keine unbedingte Behauptung, jede Dialoghandlung müsse eine Kampfrunde kosten. Die konkrete Verhandlungsmechanik einschließlich Aktionsbudget und NPC-Reaktion muss fachlich festgelegt werden.

## 4. R2 – Kampfidentität und Budgetpriorität (P2)

T9: Der Engine-Messerbandit npc.npctollknife (Bandit C) führt den Treffer aus. Narration M18 weist den Lungenschlag dem großen Knüppelbanditen zu und erfindet dessen Waffenwechsel; X akzeptiert einen armed-Fakt für npc.npctollcudgel „long knife (dropped the cudgel)“. Drei Positionsberichte in M18 und zwei in M20 sind korrekt abgelehnt (world_rule: engine-owned ACTIVE combat). Der Zustand der taktischen Positionen bleibt geschützt, die erzählte Identität weicht ab. NPC-Namen Fenn/Berrin/Martel erscheinen anschließend narrativ; kein neuer Personen-Duplikatnachweis.

Kontextdiagnostik: bei M18, M20, M22 ist present jeweils budgetbedingt entfernt; combat und chronicle sind vorhanden, guild_authority, quests und help bleiben geliefert. Bei M16 wird der neue pulse_cue (28 geschätzte Tokens) gestrichen. Kontextbudget 1400, rulesBudget 800. Der Zusammenhang ist eine plausible Ursache/Verbesserungsrichtung, kein bewiesener isolierter Kausaltest. Codex soll den tatsächlichen N-Request und Prioritätsmechanismus prüfen. Vor Kampfentscheidung sind Identität, Waffe, erkennbare Gefahr und aktuelle Position vorrangig; kein pauschales Budgetwachstum. Keine exakten HP/Levelanzeigen erzwingen, falls der Designkanon sie vor Kampf nicht offenlegt.

## 5. Performance

28 physische Requests und Responses, alle finish stop, kein Cache-Hit oder 429 beobachtet. Die Rollen aus den Requestsystemen klassifiziert:

| Rolle | Aufrufe | Inputtokens | Outputtokens |
|---|---:|---:|---:|
| P | 8 | 82.552 | 649 |
| N | 9 | 99.577 | 4.138 |
| X | 10 (1 Repair) | 141.476 | 4.725 |
| B | 1 | 2.568 | 1.071 |
| Gesamt | 28 | 326.173 | 10.583 |

Die gespeicherten P/B/N/X-Zeiten (ms) je abgeschlossenem Erzählzug:

| Turn | P | B | N | X | Summe s |
|---|---:|---:|---:|---:|---:|
| 3 | 37084 | 0 | 49385 | 76161 | 162.630 |
| 4 | 10116 | 0 | 20790 | 35702 | 66.608 |
| 5 | 7759 | 0 | 57098 | 10308 | 75.165 |
| 6 | 6940 | 57885 | 25416 | 42047 | 132.288 |
| 7 | 0 | 0 | 29361 | 48018 | 77.379 |
| 8 | 5378 | 0 | 29886 | 62438 | 97.702 |
| 9 | 0 | 0 | 28329 | 30545 | 58.874 |
| 10 | 6447 | 0 | 48911 | 47157 | 102.515 |
| 11 | 6144 | 0 | 27666 | 31113 | 64.923 |

Durchschnitt 93,120 s, Median 77,379 s, Summe 838,084 s. Nicht gemessen: Zeit bis zur sicheren nächsten Eingabe; keine Spielerlesezeiten; ausgeschlossener gelöschter Request #22 hat keine gespeicherte Zugzeit. Gegenüber User12 71,50 s/62,81 s ist dies ein anderer kurzer Run (keine kontrollierte A/B-Aussage). Requests #22–28 der drei Kapitulationsversuche: 7 Requests, 59.904 Inputtokens, keine mechanische Zielerreichung. Das HUD sparte dagegen P bei Questannahme und erfolgreichem Kampfzug.

## 6. Empfehlungen – noch keine Implementierung

P1: PC-Surrender als mögliche Hauptaktion gegen verhandlungsfähige intelligente NPC-Gegner, mit freiwillig wählbaren Gegenleistungen und identischer Freitext-/HUD-Semantik. NPCs entscheiden situativ, ob sie akzeptieren, ablehnen oder ein Gegenangebot machen; keine Erfolgsgarantie. Angebot, actual handover, ablehnende Reaktion, Gegenforderung und endgültige Einigung auseinanderhalten; echte Abgabe exakt einmal enginebuchen; keine beliebige neue NPC-Forderung automatisch abbuchen; keine unbegrenzte kostenlose Kampfpause, keine automatisch gewährte Flucht und kein XP-/Loot-Exploit. Die genauen Regeln für Runde, Teilübergabe, Ablegen, Verweigerung, Waffenverlust und Friedensschluss müssen vor Umsetzung entschieden werden. Bestehende Handler soweit fachlich passend wiederverwenden.

P2: HUD-Bindung grundsätzlich so prüfen, dass freier Text mit expliziter Minor-Aktion und einer zulässigen Hauptaktion zusammenspielen kann, ohne die gewählte Mechanik stumm zu überschreiben. Kein spezieller Regex für diesen Satz. Kontextprioritäten untersuchen. 

**Offene Designidee aus der nachträglichen Nutzeranmerkung:** Je nach Situation könnte ein Wurf darüber entscheiden, ob die Banditen die angebotenen Silbermünzen akzeptieren oder mehr fordern, z.B. den Stab. Der Narrator hat im Original bereits selbst ein Gegenangebot gewählt; ein zusätzlicher Wurf könnte deshalb redundant sein. Zunächst vergleichen, ob die bestehende NPC-/Narratorautonomie mit eindeutiger mechanischer Ergebnisbindung genügt. Würfelwurf, Wahrscheinlichkeit/Formel, neue Diplomatieattribute und weitere Mechaniken sind nicht beschlossen und nicht jetzt zu implementieren.

Keine Rücknahme der .212/.213-Gegnerstärke, kein erneuter allgemeiner Finanzpatch aus diesem Lauf. Usertest 13 liefert keinen Nachweis über neuen Handel, Dungeonübergänge, Rast, Skill-Stone-Verteilung oder längere Progression. Ein Paket „Surrender & Combat Negotiation“ ist ein Vorschlag für die spätere Patchentscheidung, keine Freigabe einer neuen Version.

## 7. Auftrag für Codex-Gegenreview

Originaldaten unabhängig nachspielen (keine echten Providerrequests); event fold und Endzustand, gelöschten HUD-Versuch #22, P/N/X-Pfade T9–11, NPC-Identitätszuordnung, tatsächliche Kontextzustellung und PULSE-Gefahr prüfen. Vorhandene NPC-Surrender-, Flee-, Combat-Intent-, Inventar-, Coin-/Coerce- und Trade-Mechanik auf Wiederverwendung prüfen. Bewertung von situativer Narratorreaktion gegenüber optionalem mechanischem Wurf ergebnisoffen halten. In `CODEX_GEGENREVIEW.md` belegte Befunde, eventuelle Abweichungen, einfache Lösungsoptionen und Designfragen berichten. Keine Implementierung bis zur gemeinsamen Entscheidung.
