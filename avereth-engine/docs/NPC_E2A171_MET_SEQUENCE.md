# .171 — NPC E2-A: `met` beachtet die zeitliche Abfolge

**Basis:** `.170` / `317ca09eb079266be5d323d7a4fb9205b57ca907` ([Patchnote .170](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/317ca09eb079266be5d323d7a4fb9205b57ca907/avereth-engine/docs/NPC_E2A170_MET_PRESENCE.md)). Enger Korrekturbuild zum P2-Befund des [GPT-Kontrollreviews .170](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_NPC_E2A170_PRODUKTDIFF_GPT.md) §3.

**Nicht enthalten:** jede Änderung an `narratedEvent`, `enter`, `handled_by`, Gildenzeugen, Gruppenidentität, `keptHere`, PULSE; E2-B/E3. Keine neuen Modellaufrufe, keine neuen Felder oder Events.

## 1. Ausgangsfehler (reproduziert auf .170)

Echter Pfad: User04, `playerTurnV4` I71 mit den aufgezeichneten Kommandos (GO zur Halle, `known_at`), `replyTurnV4` mit Ankunft und synthetischem `met` für `npc.npcguild_clerks`. `presentHere` nahm die erste gültige Präsenzstelle und prüfte nur deren Satzglied bis zum ersten Komma oder `and`.

| Erzählung | `evidence` | .170 | .171 |
|---|---|---|---|
| The clerk stood behind the counter and left before Alaric arrived. | voll | **tritt ein** | `met_evidence` |
| ″ | `The clerk stood behind the counter` | **tritt ein** | `met_evidence` |
| The clerk stood behind the counter, then left before Alaric arrived. | voll | **tritt ein** | `met_evidence` |
| ″ | `The clerk stood behind the counter` | **tritt ein** | `met_evidence` |
| The clerk stood behind the counter, then went home. | voll | **tritt ein** | `met_evidence` |
| The clerk stood behind the counter. She had left before Alaric arrived. | kurz | **tritt ein** | `met_evidence` |
| … and waved · had left at noon. When Alaric arrived, the clerk stood behind the counter again · left for a moment and came back before Alaric arrived · left the ledger open · nodded to him. Later that evening she went home · while the stocky man with the crossbow left before Alaric arrived | | tritt ein | **tritt ein** |

## 2. Korrektur

`narration_evidence.js`: `presentHere` liefert die Position der gezeigten Präsenz; `metEvidence` prüft danach **`leftBeforeHim`** auf dem Erzähltext selbst (nicht nur auf dem Zitat). Ein verkürztes Zitat blendet damit den Rest seines Satzes nicht aus.

- **Restlicher Satz ab der Präsenz:** Das Subjekt der gezeigten Präsenz läuft weiter („… and left“, „, then went home“), bis eine andere Person (Name, Rolle, Beschreibung, Alaric) übernimmt; ein Subjektpronomen bleibt bei der zuletzt genannten Person. Geht dieses Subjekt fort, ist die Person nicht da. Zeitlich unklar heißt hier konservativ: nicht da.
- **Spätere Sätze der Antwort:** Eine Abreise derselben Person (Name/Rolle/Beschreibung oder Pronomen mit ihr als letzter Nennung) zählt nur, wenn sie als **vor Alarics Ankunft** erzählt ist („before Alaric/he arrived…“, „by the time he …“, Vorvergangenheit „had left/gone“). Eine spätere Abreise in der Szene ist ein eigener `leave`-Vorgang, kein Gegenbeleg.
- **Abreise** ist eng gefasst: `departed`, `gone`; `left` ohne Gegenstand, mit „for …“ oder mit einem Ort (hall, room, counter …), nicht „left the ledger open“ / „left a note“; `went/headed/walked/stepped/slipped/hurried … away/out/off/home`. Keine pauschale Sperre für `left`/`went`.
- **Rückkehr hebt auf:** „came back“, „returned“, „was back“ nach der Abreise.

`world.js` übergibt zusätzlich Alarics Namen. Alles Übrige (Identität, Mehrdeutigkeit, Bild/Spur/leerer Platz, Rückblick, anderer Ort aus .170) bleibt davor unverändert.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen .170 | `npc_e2a171.test.js`: **3 von 4 rot** (beide Reviewfälle voll und verkürzt; „then went home“ und Abreise im Folgesatz; „einer geht vor Ankunft, der andere ist da“ in beiden Richtungen). Grün auch auf .170: die Positivkontrollen. |
| Nach Korrektur | 4/4; alle E2-A-Regressionen (A1–A7 inkl. A1h, .170-Fälle, Gildenbearbeiter, bedingte Abgabe, Host-Swipe/Regenerate/Edit/Reload, Fold) **29/29** |
| `npm test` | **2944/2944** |
| Replay `.126`-Baseline | 2235 Fälle, 1041 abweichend, alle exakt akzeptiert (`accepted_e2a169_vs_126.json` unverändert); **keine Abweichung gegenüber .170** (kein historischer Record mit `met`) |
| ST1.19 Standard / Failsoft | beide `OK`, keine fehlgeschlagene Prüfung; neu `npc169_stoodLeftNotEntered` (gezeigt, dann vor Ankunft gegangen, kurzes Zitat → draußen, `met_evidence`) und `npc169_stoodLeftOtherMet` (der Crossbowman derselben Antwort tritt ein, ein Extractoraufruf) |
| Kontext/Kosten | unverändert: kein Prompttext, kein Erzählerkontext, keine Modellaufrufe |

## 4. Abweichungen und Grenzen

- Der Plan verlangt die Abfolge „bis zum Zeitpunkt der Ankunft“. Im **selben Satz** wird jede Abreise des Präsenzsubjekts ohne Rückkehr als Abwesenheit gewertet, auch ohne „before“ („then went home“, Reviewfall). Eine spätere Abreise **im selben Satz** nach echter Begegnung ist damit konservativ falsch-negativ.
- Wortbasiert, keine Satzanalyse: ungewöhnliche Abreise- oder Rückkehrformulierungen und Pronomenketten mit mehreren Personen können zu konservativer Ablehnung oder, bei nicht erkannter Abreise ohne Zeitmarker in einem späteren Satz, weiter zur Annahme führen. Ein freier Extractor ist weiterhin nicht belegt.
