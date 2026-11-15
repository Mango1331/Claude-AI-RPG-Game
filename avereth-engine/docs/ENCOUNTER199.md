# .199 – PULSE × NPC, Begegnungsbuchung A

Basis: `b1fd7860982fe16b53c1ded5d70fde3346220eb1` (.198).
Freigegebener Fachplan auf main: `3727ba6`,
`patch_plans_10b/FACHPLAN_PULSE_NPC_A_BEGEGNUNGSBUCHUNG_2026-11-15.md`.

## Verhalten

- `world.js::applyWorld` beobachtet tatsächliche `scene.entered`-Übergänge zuvor bekannter, bei Antwortbeginn abwesender lebender NPCs. Antwortlokale Mengen, kein Savefeld. Bereits Anwesende, Reisebegleiter nach Szenenreset und schon gebundene Kampfteilnehmer erhalten keine neue Schutzfrist.
- Nur die PULSE-Gates in `envelopeAllows` und `coerce` nutzen diese Ankünfte zusätzlich zu `bornHere`. `mayOpenFight(newInAnswer)` bleibt unverändert: ein bekannter neutraler NPC bekommt keine neue Angriffsfreiheit. Eine neue Kampfbindung innerhalb derselben Antwort erlaubt keinem weiteren Rückkehrer sofortige Wegnahme.
- `narration_evidence.js::presentHere` erkennt eng die lokale Türstufen-Begrüßung aus der Hesse-Originalantwort. Kein allgemeines `came`-Präsenzverb. Identität, Zitat, Zeit, anderer Ort und nachfolgende Abreise werden weiter geprüft.
- `pulse.outcome` v2 zählt tatsächlich gebuchte `thread.set`-Events und eindeutige NPC-Rückkehrfälle. `likely/none` bleibt eine Buchungsheuristik, keine Erzählqualitäts- oder Kausalitätsbehauptung. Rastkorrekturen bleiben unabhängig davon.
- `tools/st_live/live/npc_pulse.mjs` führt Version und Erfassungsabdeckung mit; historische v1-Werte sind nicht erfasst (`null`), nicht gemessene Null. Gemischte Daten zeigen Summe und Abdeckung getrennt.

Keine Änderung an Würfeln, PULSE-Chancen, Kontextkarten, Kampfregeln, Orten, E3-Buchung oder Content. Version in `package.json`, `manifest.json`, `src/util.js` auf `4.3.0-c.6.6.199`.

## Selbst ausgeführte Prüfungen

Zuerst A01/A07/A11/A15 auf .198: **4 rot / 0 grün**. Danach alle vier grün.
Die gezielte Gruppe aus `pulse_npc_arrival`, `batch191_fixes`, `pulse_a*`, `pulse_c*`, `npc_e2a*` und `npc_pulse_runner` lief mit **122/122** grün; danach fünf zusätzliche Gegenfälle im neuen Testmodul ergänzt, dessen Schlusslauf **19/19** grün war.
Vollständige Node-Suite und Replay: siehe abschließenden Ergebnisabschnitt.

### Zuordnung der Abnahmefälle

| Plan | Nachweis |
|---|---|
| A01–A03 | Neues Testmodul: bekannte/neue/anwesende Akteure, Raub, fine/confiscation einschließlich Gegenstand |
| A04 | Identitätswiederverwendung, namenloser Dienstleister, gezielte abwesende Variante des originalen Hesse-`met` |
| A05–A06 | Keine Ankunft bei Erwähnung/ungültigem Beleg/abwesender Einführung/Tod; Duplicate-enter und leave/return; bestehende E2-Host-/Begleitertests |
| A07–A09 | Geschlossene/friedliche Fenster, danger und neutrales Gegenbeispiel; pending/aktiver Kampf, neuer Kampf vor/nach Eintritt, Folgezug |
| A10 | Bestehende `pulse_a`/`pulse_a163`-Zielkontakt- und Dungeon-Ahead-Gegenfälle; Finanz-/Gilden- und E2-Hostregressionen der vollständigen Suite bleiben grün |
| A11–A14 | Unverändertes r191 #26 und `batch191_fixes`; namensunabhängige Türstufenform, PC-Name, Erinnerung/Rede/Verneinung/Konditional/anderer Ort/Abreise; bestehende E2-Identitäts-/Nichtankunftsgegenfälle |
| A15–A18 | Originalzeichen w191 #42/#96 im separaten Replay; Rückkehrzählung, akzeptierte/abgelehnte Threads, Updates/Erledigung, geschlossenes Fenster, Rastkorrektur trotz Thread |
| A19 | Offline-Runnerfixture mit v2, v1 und gemischten Daten, Null-/Erfassungsabdeckung und Markdown |
| A20 | Wiederholte Originalantwort mit identischem Fold; `npc_e2a_host` prüft Swipe/Regenerate/Edit/Reload mit einer einzigen Buchung |

Eine Testannahme wurde korrigiert: Im unveränderten Hesse-Vorzustand war sie zu Antwortbeginn bereits anwesend und geht erst beim Ortswechsel verloren. A2 stellt ihre Präsenz am erreichten Haus richtig her; gemäß A1 zählt dies **nicht** als neue Schutzfrist/Rückkehr. Der abwesende `met`-Gegenfall entfernt sie ausschließlich in einer synthetischen Zustandskopie vor dem Aufruf. Originalchat und Antworten bleiben unverändert.

## Replay: einzelne Unterschiede

Standardcorpus: **2.235 Fälle**, keine neue Abweichung gegenüber einem separat ausgecheckten .198. Gegen die bestehende .126-Baseline bleiben **1.131 bereits exakt akzeptierte Unterschiede**, **0 offen, 0 veraltet**. Keine Annahmeliste, Normalisierung oder Originaldatei geändert.

Zusätzlich beide vollständigen `.191`-Corpora auf .198 und .199 offline verarbeitet: **179 verarbeitete Records** (r191 42, w191 137). **66** Unterschiede, davon **65 ausschließlich `pulse.outcome`**, **1 tatsächliche Präsenzkorrektur**. Alle alten/neuen Fingerprints, Diagnosewerte und Einzelbegründungen stehen in [ENCOUNTER199_REPLAY.json](ENCOUNTER199_REPLAY.json). Diese Datei ist ein Prüfnachweis, keine pauschale Replayannahme.

Für die 65 Diagnosefälle wurde jeweils der gesamte Record ohne `pulse.outcome` auf Gleichheit geprüft; innerhalb der Diagnose bleiben alle alten Felder außer der begründet erweiterten Heuristik gleich. Die neuen Threadzahlen stimmen jeweils mit den akzeptierten `thread.set`-Events überein. Bestehende Original-Providerfehler werden offline wiedergegeben: r191 enthält weiterhin eine ursprünglich fehlgeschlagene Extraktion; kein neuer Replay-/Fold-/Validierungsfehler.

`r191#26`: `met_evidence`-Ablehnung entfällt; `scene.entered` und `entity.updated.at` buchen Widow Hesse. Die bestehende Erinnerung erhält sie als tatsächliche Zeugin; die automatische Episode nennt sie als beteiligte Person (Wichtigkeit 2 → 3). IDs späterer V3-Calls verschieben sich wegen des zusätzlichen Eintrittscalls. `extract.applied.rejected` fällt von 1 auf 0. Kein Geld-, XP- oder Kampfdiff. Vollständige entfernte/zusätzliche Events sind im Einzelbeleg erhalten.

Die zusammenhängende Kette `r191 #26–#43` wurde außerdem auf beiden Builds mit denselben aufgezeichneten Antworten ausgeführt. Nach #26/#27 ist Hesse jetzt anwesend; ab der nächsten Reise #28 stimmen die Präsenzlisten wieder überein. Pro Schritt sind PC-Sheet (einschließlich Münzen/XP), Quests, RNG, Encounter, pending_combat und Spielerort gleich. Spätere Guildauszahlung bleibt 40 cp, Endbestand 70 cp. Erinnerung/letzter NPC-Ort behalten die berechtigte Präsenzgeschichte. Keine Übersetzung oder Veränderung der Replayoriginale.

## Grenzen und weitere Abnahme

Kein zusätzlicher Narratorabschnitt, keine zusätzliche Provideranfrage. Berechtigte Präsenz und ggf. Ablehnungstexte verändern nur den daraus folgenden sachlichen Kontext.
Keine natürlichen Modellläufe und keine vollständigen ST-Smokes ausgeführt. ST1.19-Standard/Failsoft/PageErrors bleiben die vereinbarte gesammelte Abnahme nach B1. Kein GO für den persönlichen Spieltest; unabhängiger Produktdiff-Review und Merge von A gehen B1 voraus. Main und Produktbranch bleiben bis zur Übernahme unverändert.

## Abschließende Ergebnisse

- `npm test`: **3.325/3.325 bestanden**, 0 fehlgeschlagen, 0 übersprungen.
- `npm run replay:check`: **2.235 Fälle**, 0 neue/offene Unterschiede und 0 veraltete Annahmen; bestehende 1.131 Annahmen unverändert.
- Separate `.191`-Replays: 179 Records, 0 neue Replay-/Fold-/Validierungsfehler; 66 einzeln dokumentierte Unterschiede.
- Folgeprüfung r191 #26–#43: 18 Schritte gegen .198 geprüft, keine Änderung an PC-Sheet/Quests/RNG/Kampf/Spielerort.
- ST-Smokes und natürliche LLM-Läufe ausdrücklich nicht ausgeführt.
