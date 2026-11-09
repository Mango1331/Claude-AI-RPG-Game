# .170 — NPC E2-A: `met` nur bei gezeigter Anwesenheit

**Basis:** `.169` / `93acd574409bff44c39bd7bc203e526fc76da262` ([Patchnote .169](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/93acd574409bff44c39bd7bc203e526fc76da262/avereth-engine/docs/NPC_E2A_INTEGRITY.md)). Enger Korrekturbuild zum P2-Befund des [GPT-Produktdiff-Gegenreviews .169](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_NPC_E2A169_PRODUKTDIFF_GPT.md) §2.

**Nicht enthalten:** jede Änderung an `enter`, `handled_by`/`deskHandlingEvidence`, Gildenzeugen, Sammelidentitäten, `keptHere`, Sprecherlabel, PULSE; E2-B/E3. Keine neuen Modellaufrufe, keine neuen Felder oder Events.

## 1. Ausgangsfehler (reproduziert)

`metEvidence` prüfte nach `narratedEvent` und der Identität nur Ausschlusslisten (Bild, leerer Platz, Spur). Eine erzählte, eindeutig benannte, aber **abwesende** Person passierte. Echter Pfad (User04: `playerTurnV4` I71 mit den aufgezeichneten Kommandos → `replyTurnV4`, synthetisches `met`), auf unverändertem .169:

| `evidence` | .169 | .170 |
|---|---|---|
| The clerk had left the Guild hall before Alaric arrived (Reviewfall) | **tritt ein** | `met_evidence` (Vorvergangenheit) |
| The clerk departed at dawn | **tritt ein** | `met_evidence` |
| The clerk went home an hour before Alaric came | **tritt ein** | `met_evidence` |
| The clerk left the hall as Alaric came in | **tritt ein** | `met_evidence` |
| The clerk had gone back to the archive long before | abgelehnt (`AWAY`) | abgelehnt (`AWAY`) |
| The clerk was working in the other town | **tritt ein** | `met_evidence` (anderer Ort) |
| The clerk was drinking at the Drowned Oar that evening | **tritt ein** | `met_evidence` (bekannter Ort außerhalb) |
| Yesterday the clerk sat behind the counter | **tritt ein** | `met_evidence` (Rückblick) |
| Earlier the clerk had stood behind the counter | **tritt ein** | `met_evidence` |
| He looked for the clerk at the counter | **tritt ein** | `met_evidence` |
| He expected the clerk at the counter | abgelehnt (`narratedEvent`) | abgelehnt |
| The clerk stood behind the counter and waved · …had both clerks at work this time · the stocky man with the crossbow sat over fresh maps again · The clerk was sorting slips behind the long counter · He saw the clerk at the long counter | tritt ein | **tritt ein** |

## 2. Korrektur

`narration_evidence.js` `metEvidence` endet jetzt mit **`presentHere`**: Name oder Rolle sind notwendig, nicht hinreichend. Für die kleinste Stelle des Zitats, die genau diese Person benennt, braucht es eine **positive Gegenwartsaussage**:

- **Sie tut etwas der Szene**: das Verb direkt nach ihrer Nennung (Adverbien und ein „with …“ ihrer Beschreibung dazwischen) ist eine Szenenhandlung im Erzählpräteritum (`stood`, `sat`, `waved`, `sorted` …), oder `was/were` + Verlaufsform (`was sorting`) bzw. + Ort (`was behind the counter`). Alles andere (`left`, `went`, `departed`, unbekannte Verben) ist **kein** Beleg; `had/has` + Partizip ist Vorvergangenheit.
- **oder sie wird gesehen bzw. der Ort hat sie**: `saw/found/spotted/noticed/met/greeted … the clerk` oder `had/held` + Person + Ort („had both clerks at work“). Eine Suche („looked for“) ist kein Sehen.
- **im selben Satzglied kein Rückblick** (`yesterday`, `earlier`, `ago`, `before`, `previously`, `formerly`, `once`) **und kein anderer Ort**: `other/another/elsewhere/home/away/outside`, ein Siedlungswort (`town`, `market`, `road`, `inn` …), das nicht im Namen des erreichten Orts oder seiner Oberorte steht, oder ein bekannter Ort außerhalb dieser Linie (`world.js` `metArrivals` übergibt `here`/`elsewhere` aus `lineage`).

Die bisherigen Prüfungen (`narratedEvent`, Identität/Mehrdeutigkeit, Bild, leerer Platz, Spur) bleiben unverändert davor. Konservativ: unklare oder unbekannte Formulierungen werden abgelehnt (falsch-negativ statt erfundener Anwesenheit).

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen .169 | `npc_e2a170.test.js`: **3 von 4 rot** (Reviewfall; neun weitere Abreise-/Ort-/Rückblick-/Suchvarianten; Mehrdeutigkeit + „einer ging, der andere steht da“). Grün auch auf .169: die positiven Kontrollen. |
| Nach Korrektur | 4/4 grün; bestehende E2-A-Regressionen A1–A7 inkl. A1h, Gildenbearbeiter und bedingte Abgabe (I64/I73/I74), Host-Swipe/Regenerate/Edit/Reload, Fold: **25/25** |
| `npm test` | **2940/2940** |
| Replay `.126`-Baseline | 2235 Fälle, 1041 abweichend, alle mit exakter Ausgabe akzeptiert (`accepted_e2a169_vs_126.json` unverändert): **keine Abweichung gegenüber .169**, da kein historischer Record `met` enthält |
| ST1.19 Standard / Failsoft | beide `OK`, keine fehlgeschlagene Prüfung; neu `npc169_leftNotEntered` (der abgereiste Clerk bleibt draußen, `met_evidence`) und `npc169_leftOtherMet` (der Crossbowman derselben Antwort tritt ein, ein Extractoraufruf) |
| Kontext/Kosten | unverändert gegenüber .169: kein Prompttext, kein Erzählerkontext, keine Modellaufrufe |

## 4. Grenzen

Die Präsenzprüfung liest nur die Wörter um die Nennung (keine Satzanalyse). Echte Anwesenheit mit Verben außerhalb der Szenenliste („came in from the back“, „bustled about“) oder mit Einschüben („The clerk, who …, stood“) wird abgelehnt; das bleibt im natürlichen Test zu beobachten. Ein freier Extractor ist weiterhin nicht belegt.
