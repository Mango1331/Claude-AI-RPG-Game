# GPT – unabhängiger Gegenreview `.179` und Bewertung D3-Kontextanalyse

**10.11.2026 · Nur Analyse, keine Produktänderung oder Freigabe von D3-Code.**

- **Produktstand:** [`.179` / `59f868eaf3c4ed7942ddc42ba3d180fab44a72cd`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd), Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`. Basis [`.178` / `c2ef94d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e).
- **Quellen:** [GPT-Nachreview von `.178`](REVIEW_178_PRODUKTDIFF_GPT.md), [Sols neue D3-Messung](D3_KONTEXTANALYSE_RELEVANT.md), [Sols Produktpatchnote zu `.179`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/docs/PILOT01_179_D5_PROVENANCE.md), [ursprünglicher natürlicher Pilot](REVIEW.md), [Design-Kanon](../../02_DESIGN_KANON.md).

## 1. Urteil

**Der von GPT gemeldete D5-Fehler der verkauften und erneut ausgestellten Ware ist im geprüften Umfang geschlossen. Es besteht aus diesem Diff kein neuer verpflichtender P2-Stopp.** Der neue Marker `laid_by_pc` bezeichnet die *letzte* Bewegung aus der Hand des Spielers an einen Ort; das bisherige `had_pc` bleibt die historische Aussage „war irgendwann beim Spieler“. Dieser Unterschied ist für den von Sol reproduzierten Verkaufsfall richtig. Die neue Erkennung funktioniert auch bei aus dem Blattinventar abgelegten Gegenständen.

**D3 ist ein substanzieller, aber separater Kontext-Effektivitätsbefund:** Der Soft-Recall `relevant` wird im historischen Pilotkontext weiterhin kaum ausgeliefert. Sols Daten und der tatsächliche Packer belegen, dass die Ursache die doppelte Größenbegrenzung und die Ganz-oder-gar-nicht-Aufnahme nach den verbindlichen Abschnitten sind. **Teillieferung in den tatsächlich ungenutzten Rest ist eine fachlich plausible Option**; weder eine Prioritätserhöhung noch ein pauschales Streichen aller Spielerzitate ist dadurch freigegeben.

## 2. Eigene Prüfung von `.179`

### 2.1 Diff, Code und Nachweisart

GitHub-HEADs beim Einstieg: Produkt `59f868e`, `main` `d71cea0`. Der Vergleich `c2ef94d...59f868e` zeigt **genau zwei Fast-Forward-Commits, null zurück**:
1. [`31ef87f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/31ef87f8e34cef660e5a46e07d3e04fd76d81118) – `src/v4/domain.js`, `src/v4/trade.js`, neue `pilot01_review_d5_provenance.test.js`.
2. [`59f868e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd) – Versionsmetadaten, ST-Pilot-Smoke und Patchnote.

**Unabhängig durchgeführt:** tatsächliche Produkt-Patches und vollständige fünf neuen Regressionen gelesen; Reducer- und Handelsprädikate sowie Host-Smoke-Pfad geprüft; **fünf isolierte JavaScript-Gegenentscheidungen** auf Grundlage der aktuellen `object.created`-/`object.moved`-/`wareOnSale`-Codebedingungen ausgeführt. Alle fünf hatten das gewünschte Ergebnis:
- regulärer Verkäuferwechsel **PC → Händler → Ladenregal** mit offenem Angebot: Ware **geschützt**, obwohl `had_pc=true` bleibt;
- **PC → Ladenregal** ohne zwischenzeitlichen Fremdbesitzer: vom PC abgelegt, **nicht** als fremde Händlerware geschützt;
- `object.created` aus dem Blattinventar mit `source.how='dropped'`: selbst abgelegt, **frei aufnehmbar**;
- Händler übergibt ein Geschenk aus der Hand nach abgeschlossenem Angebot: **nicht** als Ladenschutzfall behandelt;
- übrig gebliebene, weiter ausgestellte Ware nach abgeschlossenem Angebot: **weiter geschützt**.

Diese Gegenproben sind **isolierte Codebedingungen**, keine vollständigen `applyWorld()`-/`foldChat()`-Hostabläufe. Die neuen offiziellen Tests enthalten hingegen den regulären Kauf-/Verkaufsweg mit eingespielten Planner-/Extractorantworten und die Save-/Reload-Abnahme.

### 2.2 Codebegründung

- [`src/v4/domain.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/src/v4/domain.js): Bei `object.moved` wird `laid_by_pc` nur für `o.holder.entity === 'pc' && d.to.loc` gesetzt; jede andere Bewegung entfernt es. Bei einem teilweise abgelegten Stack erhält nur das neu entstandene Teilobjekt den Marker, nicht der bei Alaric verbliebene Rest. Bei `object.created` mit `source.how === 'dropped'` und `holder.loc` wird es ebenfalls gesetzt. `had_pc` bleibt unberührt.
- [`src/v4/trade.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/src/v4/trade.js): `wareOnSale` erkennt legitimes eigenes Ablegen über `laid_by_pc`; `displayedWare` kann solches Eigentum nicht fälschlich an ein Händlerangebot binden. `sameGoods` ignoriert den Derived-Marker als reine Stapelbuchhaltung.
- Die Ablehnungen gelten weiter nur bei ausdrücklich im Angebot benannter Ware; `.179` führt **keine** allgemeine Ladenbesitz-, Diebstahl-, NPC- oder PULSE-Regel ein.

**Ehrliche Restgrenzen:** Sols Patchnote nennt einen erzwungenen Zug aus Alarics Händen zum Ort (der Marker wird auch dann gesetzt), Dritte, die Alarics Gegenstand vorher an sich nehmen, sowie einen geschlossenen objektgebundenen Angebotsverweis, der an anderem Ort weiter greifen könnte. Das sind aus dem vorhandenen Diff **keine neuen belegten P2-Stopper**. Nicht vorsorglich zu einem allgemeinen Eigentumssystem ausbauen.

### 2.3 Teststatus

**Laut Sol** (nicht eigenständig komplett von GPT ausgeführt): neue Regressionen auf `.178` 3/5 rot, auf `.179` 5/5 grün; angrenzende Suites 29/29; vollständige Node-Suite **3050/3050**; Replay **2235 Fälle, 0 neue Änderungen**; Korpuscheck **1057 akzeptiert, 0 offen/veraltet**; ST1.19 Standard **172/0** und Failsoft **177/0**. Der erste ST-Fehlversuch hatte laut Sol einen Testaufbaufehler (Händler nicht erreicht), anschließend nach Korrektur beide Smokes grün. Produktcode und Dokumentation liefern keine Grundlage, diese Zahlen als neue GPT-Vollausführungen darzustellen.

## 3. D3 – unabhängiger Abgleich mit dem echten Kontextpacker

### 3.1 Ursache, fachlich bestätigt; Zahlen = Sols Messung

[`D3-Messung von Claude`](D3_KONTEXTANALYSE_RELEVANT.md) rekonstruiert die **65 historischen Pilot-Züge** mit `outcome.recorded` und heutiger Engine `.179`, Budget **1400**, eigenes Regelbudget **800**. Der Code in [`src/context.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/src/context.js) bestätigt die Mechanik:
- `retrieveRelevant()` ordnet Einträge aus Erinnerungen, Fakten, aktiven Quests und Threads über [`rank()`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd/avereth-engine/src/retrieval.js) und packt sie bereits **in etwa 25 % des Gesamtbudgets**.
- `buildContext()` macht aus den ausgewählten Einträgen danach **einen einzigen `relevant`-Abschnitt mit Priorität 2**.
- Der äußere Packer hält Priorität 0 vollständig (auch mit Überlauf), dann Priorität 1; `relevant` wird **nur als Ganzes** angenommen, wenn es zuletzt noch hineinpasst. Ein kurzer Rest genügt nicht für die gesamte Liste.

**Sols gemessene Resultate, in dieser Nachprüfung nicht selbst an 65 Foldzuständen neu berechnet:**

| Größe | Sols D3-Messung |
|---|---:|
| Priorität 0, mittlere Kosten | **1320 / 1400 Tokens** |
| Schon P0 allein über Budget | **18 / 65 Züge** |
| `relevant` gebildet / tatsächlich geliefert | **62 / 2 Züge** |
| Mittlere Größe von `relevant` | **310 Tokens**, ca. 8,5 Einträge |
| Frei nach P0 in 47 Zügen ohne Überlauf | Ø **195 Tokens** |
| Am Ende ungenutzt (47 Züge), Median | **33 Tokens** |
| Priorität 1 für `relevant` | **2** geliefert, keine Verbesserung |
| Priorität 0 für `relevant` | **62**, aber `present` **30 → 4** und Budgetüberläufe **18 → 59** |
| Teillieferung in ungenutztem Platz, Simulation | **+27** Züge mit ≥1 zusätzlichem Eintrag, davon **18 Sozialzüge**; **67** zusätzliche Einträge |

Diese Werte sind rechnerisch und nach Packercode plausibel. **Sie zeigen potentielle Auslieferung, nicht, ob der Erzähler die Information versteht oder sich korrekt daran hält.** Der alte Pilot war ein `.174`-Lauf; die Messung über diesen Record mit `.179` ist eine kontrollierte Rekonstruktion, **kein natürlicher Beleg einer frischen `.179`-Kampagne**.

### 3.2 Entscheidung zu den Varianten

**A – Nur vollständige Einträge in den *tatsächlich noch freien* Rest packen: technisch sinnvoll als getrennte, kleine Option.** Sie erhält P0 und bestehende P1-Karten. Die Abschnittsüberschrift, pro Eintrag benötigte Tokens und die jeweilige Rangfolge müssen in den Rest passen; einzelne Zeilen nie mitten im Wort kürzen und keinen Abschnitt mit leerer Überschrift senden. Keine Änderung am Regelbudget, an `quests`, an der Priorität der Ankunfts-/Kompaktkarten oder am bestehenden `retrieveRelevant()`-Ranking.

**D – „Abruf entrümpeln“ nur selektiv, nicht pauschal.** Sol zählt **95/530** ursprüngliche Spielerzitate (18 %) und **29/530** historische K8-Namensfehler (5 %). Letztere sind als **eindeutig falsche Fakten** zu behandeln und dürfen nicht durch erneute Priorisierung als wahr beim Erzähler ankommen; K8 verhindert solche neuen Meldungen, alte Pilotevents bleiben aber als Testbeleg bestehen. **Wörtliche Spieleräußerungen sind dagegen nicht automatisch Datenmüll**: Wer wem eine Zusage gab, was Alaric einem NPC sagte oder welche Information er offenlegte, kann gerade für NPC-Wissen und Wiederbegegnungen relevant sein. Sols 95er-Gruppe darf nicht ungesehen aus dem Abruf entfernt werden. Erst echte Redundanz gegen den gelieferten Dialog bzw. klassifizierbare irrelevante Episoden eng filtern; keine rückwirkende Veränderung der gespeicherten Erinnerungen.

**B – Verbindliche Questkarten verdichten: vorerst nicht.** `quests` verursacht die größte Last, ist aber autoritative Welt-/Zielinformation. Vor Änderungen wäre die Designentscheidung nötig, welche Vertragsangaben auch bei einem nebensächlichen NPC-Gespräch *immer* bindend verfügbar sein müssen. Nichts automatisch kürzen, das Auftragsabschluss oder Preis-/Zieltreue betrifft.

**C/E – Prioritäten verschieben oder Tokenbudget erhöhen: nein.** P0-Abruf verdrängt nach Sol unmittelbar die wichtigen `present`-Karten; P1 bringt nichts. Ein höheres Budget ist nicht begründet und widerspricht der bisher getroffenen D3-Grenze.

**Wichtiges Gegenbeispiel zur Ursachenzuschreibung:** In T61 kannte der Erzähler den Fuhrmann samt offener Mitfahrabsprache **bereits aus `npc_arrival`**. Die doppelte Fuhrmann-ID war daher keine direkte Folge fehlenden `relevant` im Erzählerblock, sondern ein Extractor-/Identitätsproblem. Die K6b-Anweisung und der nächste natürliche Lauf sind dafür die relevanteren Nachweise.

## 4. Weitere Reihenfolge

**Empfehlung für die laufende Entwicklung:**

1. **`.179` im vereinbarten D5-Korrekturumfang abschließen.** Kein zusätzlicher Pflichtpatch aufgrund dieses Review; nicht noch einmal eine K1–K8-Generalabnahme aufsetzen.
2. **Jetzt einen natürlichen NPC-/PULSE-Lauf mit dem zweiten Profil** (`npc-wary`) auf dem fixierten Produktstand durchführen, um erstmals K5a/K6b/D6 im freien Modell, NPC E3 und die noch schwache Rast-/Dungeon-PULSE-Abdeckung zu untersuchen. Keine erzwungenen Anker oder RNG-Events, kein unnötiger Enginepatch vor dem Test. Gameplay-Gefühl bleibt eine menschliche Bewertung, die der LLM-Runner nicht ersetzen kann.
3. **D3 A als eigenständige, kleine Verbesserung** bei der nächsten gezielten Kontextpflege erwägen; **D nur gegen nachweislich falsch/überflüssige Einträge**. Auf den historischen 65 Zügen vor/nach messen, zusätzlich Pilotstellen T17/T24/T46/T58/T61, NPC-Karten, ungenutztes Budget, P0-Überlauf und Soft-Recall überprüfen. Erst danach anhand natürlicher Daten über weitere Prio-/Queständerungen entscheiden.

**Keine neuen Designentscheidungen getroffen:** Eine D3-Implementierung ist hier **nicht** automatisch freigegeben, ebenso wenig PULSE D, E4/E5, Balanceänderungen oder ein erweitertes Eigentums-/Diebstahlsystem.

**Dokumentationsort:** Nur unabhängiger Review auf `main`, unveränderte Produktbranch.
