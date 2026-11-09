# GPT – unabhängiger Produktdiff-Gegenreview NPC E2-B, Build .172 (09.11.2026)

**Urteil:** Die E2-B-Funktionen R6 (Ankunftskarten), R8 (Karten und #npc) und R9 (Erinnerungsrest) sind in den geprüften Implementierungs- und Testpfaden weitgehend fachplangerecht. **Ein neuer P2-Integritätsfehler in R7 ist vor E3 zu korrigieren:** Die automatische `threadEvents → matchThread`-Zuordnung verschmilzt selbstständige persönliche Absprachen, wenn diese eine einzelne NPC-Partei gemeinsam haben; bei mehreren gleichlautenden gebundenen Threads kann eine Erledigung ohne Parteien/ID willkürlich den ersten schließen. **Kein Neudesign der NPC-/Memoryarchitektur und keine weitere allgemeine Audit-Runde nötig.**

**Produktvergleich:** `.171` [`4980db1`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4980db1b7ef2f449951882082afb661453a7cb00) → `.172` [`a3c906f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5). GitHub-Compare: **drei Commits vorwärts, null zurück**, Basis identisch. [`5285d2c` Code](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5285d2cec3fc896eed518d1e2655df73d45c3105), [`732ca3d` Regressionen/Replay](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/732ca3d), [`a3c906f` Build/Smoke/Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5).

**Quellen:** [Fachplan E2/E3](NPC_E2_E3_FACHPLAN.md) R6–R9/B1–B5, insbesondere entschiedene D1/D4/D6; [Ist-Analyse](../recherche/NPC_E2_E3_ISTANALYSE_20261108.md); [Produktpatchnote .172](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5/avereth-engine/docs/NPC_E2B_CONTINUITY.md). Produktcode `context.js`, `threads.js`, `v4/world.js`, `v4/ownership.js`, `src/commands.js`, Vokabular, neue Node-/Hosttests, ST-Smoke, die zwei gesamten Replayakzeptanz-JSONs.

**Prüfgrenze:** Tatsächliche Code- und Commitpatches gelesen. `src/threads.js::matchThread` und `threadEvents` wurden **direkt aus dem .172-Quelltext** in JavaScript mit den originalen `normText`-/`tokenize`-Implementierungen und konstruierten gültigen Threadobjekten ausgeführt (Resultate §2). **Keine erneute komplette Node-Suite, kein echter SillyTavern-Lauf und kein 2235er-Runtime-Replay durch GPT.** Die zugehörigen World-/Parser-/UI-Folgen sind über die lesbaren Codepfade nachzuvollziehen, aber der neue P2-Fall muss noch als End-to-End-Rot/Grün-Regressionsfall real ausgeführt werden. Der Produktbranch wurde durch dieses Review nicht verändert.

## 1. Positive Befunde

- **R6 / Ankunftskarten:** `arrivalPeople()` nimmt den letzten **`authorized`**-GO und dessen `outcome.known_at[seq]`, nicht die Stelle des Spielers als implizite NPC-Anwesenheit. Kein neues `scene.entered`. Der Ausgangsort behält den Vorrang für ausdrücklich angesprochene/interagierende Personen; maximal zwei Slots, freie Slots wieder mit nächsten Interlocutors gefüllt (späterer ST-Fix B1a2). Zielkarte ist `NOT YET SHOWN`; der Erzähler sieht eine gekürzte `KNOWN AT`-Zeile für nicht verkartete Personen, der Extractor weiterhin die vollständige Liste. Brenna-/Marda-Gegenfälle B1/B1a/B1b und die neuen Hostchecks sind passend. Kein E2-A-Präsenz-Guard wurde gelockert.
- **R7 / positiver Pfad:** `world.js` bindet `who` an vorhandene lebende NPC-IDs bzw. `pc`, für `pc` muss eine beteiligte NPC-Person anwesend sein. `delta.js` reicht das Feld unverändert weiter; `threads.js` speichert es im `thread.set`-Objekt und erhält es bei Erledigung per ID. Alte Threadobjekte ohne Parteien bleiben ladbar. `#npc` zeigt nur `status:open`, `promise/debt`, `who⊇{pc,npc.id}`. **R7-Matching ist aber zu permissiv (§2).**
- **R8 / D1, D4, D6:** An einem vertrauten NPC erscheinen offene/erledigte Absprachen in der bestehenden Haltungszeile; die nächsten zwei Auswahlfelder `last meaningful` und `knows` sind nicht durch `also remembers` verdrängt. `settled between you` verdrängt offene Darstellung nach Erledigung; ein jüngerer bedeutsamer gemeinsamer Moment beendet die hervorgehobene Anzeige ohne den erledigten Thread neu zu öffnen. Die ausdrückliche bedingte Nachfrageregel (Brenna-Dinner) ist als **Gesprächsfortsetzung, nicht zugesagtes Essen oder Sympathie** in Prompt, Tests und Plan dokumentiert.
- **R9 / Ownership:** Koordinationsreste nur im Store `memory`, Teilstücke erneut durch vorhandene Ownership-/PC-Entscheidungs-/Kampf-/Geldwächter; der zuvor ungewollt erhaltene `READY`-Teil und nominale Teilungen sind durch gezielte Replaykontrollen entschärft. Ein tatsächlicher neuer sozialer Rest (`b17-warrior#254`) wird protokolliert. Keine pauschale Freigabe früherer Szenenverlagerungen.
- **Paketgrenze:** Keine E3-Anker, kein `scene.since`, keine Beziehungszahlen, keine geänderten PULSE-/Kampf-/Dungeonregeln, keine Migration, keine zusätzlichen Modellaufrufe.

## 2. **P2 – ID-lose Absprachen verschiedener Parteien verschmelzen / unklarer Abschluss wählt erste ID**

**Code:** [`src/threads.js::matchThread` ab Zeile 39](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5/avereth-engine/src/threads.js#L39-L59) und [`threadEvents` ab Zeile 113](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5/avereth-engine/src/threads.js#L113-L137). `world.js:case 'thread'` löst die gemeldeten Parteien auf und gibt sie als `who` an die vorhandene V3-Threadpipeline weiter; es gibt danach keine zusätzliche Parteien-Deduplizierung.

**Ursache A – nur eine gemeinsame NPC-Partei genügt:** Bei einem neuen Report mit `who` berechnet `matchThread`

```js
const npcs = who.filter(x => x !== 'pc');
const theirs = open.filter(x => (x.who || []).some(p => npcs.includes(p)));
```

Ein Thread `{who:['pc','npc.tam']}` gehört also zu `theirs`, wenn ein **anderer** Report `{who:['npc.tam','npc.bess']}` nennt. Stimmen Wortlaut oder grobe Überlappung, wird er wiederverwendet, und `threadEvents` vereinigt `cur.who` mit `th.who`. Die separate Tam-Bess-Vereinbarung wird damit als bereits bestehende Tam-Alaric-Vereinbarung behandelt. Das `pc` bleibt erhalten; Folge-Panel und Karten behaupten nun eine persönliche Vereinbarung Alarics, die er **nie getroffen hat**.

**Ursache B – fehlende Partei/ID bei gleichen Texten:** Der Legacy-Zweig `matchThread(state,text,kind,who=null)` verwendet bei exakter Textgleichheit `open.find(...)`. Sind zwei voneinander getrennte offene, gleichlautende `promise`-Threads mit `who:['pc','npc.tam']` und `who:['pc','npc.bess']` vorhanden, wird eine Erledigungsantwort ohne ID/Parteien **willkürlich** dem ersten zugewiesen, ohne Mehrdeutigkeitsschutz. Genau solche unabhängigen gleichlautenden Absprachen werden mit E2-B erstmals ausdrücklich als eigenständige Personen-Threads unterstützt.

**Ursache C (verwandter Guard):** Bei einem exakten Texttreffer wird der gemeldete `kind` nicht geprüft. Ein neuer `debt`-Report mit demselben Text wie ein bestehender `promise` kann den bestehenden Thread und seine Art übernehmen. Bei der engen Match-Korrektur ebenso absichern; kein genereller Thread-Redesignbedarf.

**Eigenständig mit den tatsächlichen .172-Funktionen ausgeführt (konstruierter deterministischer Zustand):**

| Fall | Ergebnis .172 | Soll |
|---|---|---|
| Alt `thread.t7.1`: `promise`, `who:[pc,Tam]`. Neu: **gleicher Text**, `who:[Tam,Bess]` | Altthread `thread.t7.1` erneut benutzt; `who:[pc,Tam,Bess]` | **Neuer eigener Thread**, Alaric nicht fälschlich Partei |
| Alt `who:[pc,Tam]`, neu **ähnlich umformulierter** Text, `who:[Tam,Bess]` | Ebenso falsche Zusammenführung | Eigener Thread |
| Zwei gleichlautende Altthreads `[pc,Tam]` und `[pc,Bess]`; Abschluss ohne ID und ohne `who` | Erster `thread.t2.1` wird `resolved` | **Mehrdeutig: keinen** still schließen, bis eindeutig identifizierbar |
| Zwei gleichlautende Altthreads `[pc,Tam]` und `[pc,Bess]`; Abschluss mit `who:[pc,Bess]` | Bess korrekt getroffen | Diese Positivkontrolle erhalten |
| Alt `promise:[pc,Bess]`, neuer `debt:[pc,Bess]` gleicher Text | Alt-Promise wiederbenutzt und bleibt `promise` | Neue Art nicht still ersetzen/gleichsetzen |

**Einstufung P2:** Anders als eine bloß fehlende Modell-Erinnerung wird hier ein autoritativer Thread **falsch aktualisiert oder erledigt**; durch `who` gelangen daraus falsche persönliche Verpflichtungen in den Erzählerkontext und das Spielerpanel. Das verletzt das für E2-B ausdrücklich freigegebene Ziel eindeutiger Personen- und Absprachenkontinuität. Noch keine echte World-/Extractor-Kettenreproduktion durch GPT; Claude soll die reale Pfadregression gegen .172 zunächst rot ausführen.

**Enger Fixvorschlag:**

1. In `src/threads.js` die **ID-lose automatische Threadidentifikation** an **eindeutigen, kompatiblen Parteienmengen und Art** festmachen; bloße Teilmengenüberschneidung von NPCs reicht nicht. Die genaue Kompatibilitätsregel am Code und den dokumentierten Update-Fällen begründen. Ein tatsächliches **Hinzufügen neuer Parteien** ist über eine ausdrückliche vorhandene Thread-ID möglich; nicht still allein aus ähnlichen Worten.
2. `matchThread` darf bei zwei gleich guten exakten/nahen Kandidaten **nicht** `.find` auf den ersten setzen. Mit `who:null` nur den eindeutig identifizierten alten Thread automatisch erledigen; bei Mehrdeutigkeit bestehende Threads erhalten. `kind` auch auf dem Exact-Pfad beachten.
3. Positivkontrollen: eindeutiger Text+identische Parteien → Update; berechtigte Erledigung per ID ohne `who` bewahrt Parteien; zwei verschieden benannte Personen ohne gemeinsamen NPC bleiben getrennt; historischer `who`-loser Thread bekommt nur per eindeutigem Exact/ID Personen; NPC-NPC-Versprechen gelangt nicht in `#npc`; unterschiedliche Texte/Arten, Swipe, Regenerate, Reload.
4. Vollständige angrenzende Node-/Replay-/ST-Abnahme und eigener enger Korrekturbuild; keine Änderungen an R6-Ankunftskarten, R8, R9, Guild, E2-A, PULSE oder E3.

## 3. Replayakzeptanz – unabhängig vollständig strukturell verglichen

Die gesamten JSON-Dateien `tests/replay/accepted_e2a169_vs_126.json` auf `.171` und `accepted_e2b172_vs_126.json` auf `.172` wurden geprüft:

- **1041** bisher akzeptierte Fälle, **1048** auf .172.
- **1037** der vorherigen Einträge sind vollständig identisch.
- **4** bestehende Einträge geändert, jeder besitzt unter `previous_acceptance_169` exakt das vollständige vorherige Objekt.
- **7** neue akzeptierte IDs, keine alte ID verloren.
- **11** Abweichungen insgesamt: **10** mit Kategorie `e2b172 thread who field` (neues `who:null` im Echo eines schon abgelehnten Threaditems), **1** mit Kategorie `e2b172 memory social rest` (`b17-warrior#254`).
- `returned`-Metadata identisch.

Dies bestätigt die **Integrität der Akzeptanzdateien und Vorgänger**, nicht den Inhalt aller 2235 neu ausgeführten Runtimefälle durch GPT. Claudes dokumentierter maschineller Recordvergleich und die Integrationssuite tragen die inhaltliche Abnahme der elf Änderungen.

## 4. Tests und Host – Implementiererabnahme, nicht GPT-eigen

Claudes Bericht/Patchnote: **16/16 neue E2-B-Tests**, davon 13 rot gegen unveränderte .171; angrenzende Tests grün; `npm test` **2961/2961**; Replay **2235 Fälle**, **1048/1048** exakt akzeptiert, **0 offen**. Echter ST1.19-Host: **143/143 Standard**, **148/148 Failsoft**, davon neun neue `npc172_*`-Prüfungen. Der Host benutzt geskriptete Providerantworten. Die anfängliche Fehlverdrängung des Ausgangsinterlocutors bei nur einer Ankunftskarte wurde vor Commit mit B1a2 und erneutem Hostlauf korrigiert.

Die neue E2-B-Suite prüft u.a. zwei ähnlich klingende Absprachen **verschiedener NPCs** und den richtigen Abschluss **mit explizitem `who`**. Sie prüft nicht das **partielle Partei-Overlap** (Tam an beiden unabhängigen Threads), zwei **exakt gleiche** gebundene Threads bei späterer **unklarer** Resolution ohne `who` und den `kind`-Konflikt. Der scripted ST-Smoke prüft eine einzelne Zusage mit explizitem ID-/Wortlaut-Resolutionpfad; nicht die Mehrdeutigkeitsfälle.

## 5. P3 – Kontext-/Budgetkosten und verbleibende Modellabhängigkeit

**Messwerte aus Claudes Bericht (nicht eigenständig neu gemessen):** GO-Züge gegen .171: `−40 / +35 / −155` geschätzte Tokens, innerhalb GO-Ziel ≤+40. Die Basismessungen für Nicht-GO-Züge `−5 / 0` liegen innerhalb ≤+15. **Aber** die synthetische D4-/Tam-Situation mit wirklicher gebundener Absprache benötigt **+20 Tokens offen**, **+26 Tokens erledigt auf der Karte** und **+47 Tokens im ganzen betroffenen Zug** (+21 durch nun personenbasiert abgefragten erledigten Thread). Das überschreitet in dieser zusätzlichen Fachfallkonstellation die **geplante Nicht-GO-Delta-Grenze +15**; die Karten-Teilzielgrenze +25 wird beim erledigten Fall knapp um 1 überschritten. Das ist **eine dokumentierte Abweichung zur Fachplan-Zielmessung**, nicht bereits der Beleg eines absoluten Kontextfenster-Overflows; der Packer hält Pflichtabschnitte, die neue Prio-0-Karte verdrängt dafür teils `relevant`/`lore`. Eine verlässliche spätere E3-Budgetplanung sollte diesen speziellen Zustand separat behandeln (Redundanz von Thread in kompakter Karte **und** `relevant` vermeiden, sofern ohne Recallverlust). **P3-Mess-/Qualitätsbeobachtung, kein separater sofortiger Architekturfix**; bei der engen R7-Korrektur die kontextbezogenen Kosten und Abrufverdrängung nachmessen und bei stabiler Budgetgrenze keine Erweiterung.
 
Extractor-Systemprompt laut implementierter Messung **+105 geschätzte Tokens** statt prognostiziert +60, keine zusätzlichen Modellaufrufe. Die reale Zuverlässigkeit freier Modelle bei `thread.who`, `met` und der tatsächlichen Verwendung der Ankunftskarten ist noch ungetestet. Gruppenentitäten aus Altsaves bleiben zusammen; das ist ein bekannter Altbestandskompromiss.

## 6. Übergang

**Zuerst enger R7-P2-Matching-Fix auf .172**, tatsächliche Rot/Grün-Regression über `playerTurnV4/replyTurnV4` bzw. `World → delta.js → threads.js → thread.set` und repräsentative R8-`#npc`-Folge, vollständige Node-/Replay-/ST-Abnahme, ein gezielter GPT-Kontrollreview. **Danach E2-B als technisch geschlossen behandeln**, sofern der Fix stabil ist. **E3 noch nicht starten**; seine späteren sozialen Entscheidungen D2/D3/D13 sind eigenständig freizugeben. Kein Umwerfen der E2-B-Fachplanarchitektur, kein zusätzlicher Freimodell-/User-Test als technische Pflicht vor E3.

Nur dieses Review auf `main` gespeichert; Produkt `.172` bleibt unverändert.
