# 10B-3 – Kampfeskalation und mechanische Kampfchronik
**Fachlicher Implementierungsentwurf für Sol – noch NICHT implementiert oder freigegeben.**

**Baseline:** Build `.66`, Produktcommit `4cd9b338773783644a79a39f367629e6aaeead05`; Development-Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`. Git-HEAD beim Beginn erneut prüfen. Der gerade gestartete neue natürliche `current_test` ist noch **nicht ausgewertet**. Änderungen in dessen ZIP können die Priorisierung/Tests erweitern; nicht durch Vermutungen vorwegnehmen. Umfang: **ein fachlich vollständiger Kampf-/Chronik-Patch**, keine Abfolge von 10B-3a-1/a-2-Mini-Hotfixes.

## 1. Verbindliches Problem und Quelle

**Fall A – Drohung als Angriff:** `.57` Run 1 `testrun_10b/20261024-030002Z-current_test/REVIEW.md` und `06` §§4, 13.1. Banditen zogen Bögen/bedrohten den PC; ein tatsächlich ausgeführter Angriff war noch nicht belegt, trotzdem entstand feindlicher Kampf-/Schadenszustand. Belegte Gegenanforderung: Feindselige **Absicht und Drohung allein sind noch kein ausgeführter Treffer**. Ein tatsächlich ausgeführter, kausal zulässiger Angriff oder ein echtes Ambush bleibt selbstständig möglich, auch wenn der Spieler nicht zuerst angreift.

**Fall B – erfundene Kampfchronik:** Im selben .57-Run führte der Spieler **einen** Arcane Bolt auf Bandit B aus (29 Schaden, HP 90→61, MP 72→62); der Narrator behauptete zusätzlich einen zweiten und dritten Bolttreffer. Anschließend legte der Extractor eine Memory-Behauptung zu **drei** Bolttreffern an. Enginezahlen waren korrekt, die erzählte und gespeicherte Kampfchronik falsch. Die vorhandene `combat_truth.js` schützt bereits gegen **falsch behauptete Tote und Killzahlen**, nicht zwangsläufig gegen zusätzliche Treffer, Zauber oder Ressourcenverbrauch; eine blanket Aussage „es gibt keinen Combat-Truth-Schutz“ wäre falsch.

**Fachlicher Zielzustand:** Trennung von **Stand-off/Drohung/Zielen**, **erkennbarer begonnenen Aggression**, **wirklich ausgeführter Attacke mit Combat-Event**, **errechnetem Treffer/Schaden**, **bloßer NPC-Behauptung/Hörensagen** und **gespeicherter mechanischer Chronik**. Der Narrator darf Stimmung, Moral, Vorbereitung, Waffenhaltung und Sprechen frei beschreiben, aber keine zusätzlichen ausgeführten PC- oder NPC-Kampfhandlungen als Weltwahrheit buchen.

## 2. Ist-Architektur vor Sols Implementierung lesen

- `src/v4/world.js`: `envelopeAllows`, `case 'intent'`, `case 'hostile'`, `combat.pending`-Erzeugung über `v3({combat:...})`, `trueDeaths`, `case 'memory'/'thread'/'quest.detail'/'quest.progress'`. Diese Consumer **nicht** nur auf einen Regex fixen, ohne Event-/Intentpfad zu verstehen.
- `src/v4/envelope.js`: `mayOpenFight`; bereits vorhandene Kontextregeln für hostile role, genuinely cornered, provocations, newly introduced ambush, quiet-road-block. **Keine automatische Feindseligkeit aus Rolle/Temperament allein.**
- `src/combat.js`: tatsächliche `encounter`, `pending_combat`, `attackAction`, `runCombat`, `enc.log` mit `records`; `src/context.js`: `combatBlock`, `outcomeBlock`, insb. der bereits bestehende Narrator-Satz zur **gleichen Anzahl echter Projektile** und mechanischen Reihenfolge. Nicht behaupten, die Promptregel fehle – sie wurde im Run offenkundig verletzt.
- `src/v4/combat_truth.js`: existierendes `stripFalseDeaths`; `src/v4/firewall.js`/ `ownership.js`: Engine-owned Vitals, Schaden, Tod, PC-Aktionen und frei erzählbare Notizen; `src/v4/identity.js` für Gruppenbezugsauflösung.
- `tests/v4/` und `tests/` auf Negativ-/Ambush-/Gruppenkampf-/Kill-Truth-Tests scannen; diese Suites und Replay nicht ersetzen.

## 3. Verbindliche fachliche Trennung und Testmatrix

**A. Konflikt und Kampfstart:** Tatsächlichen bisherigen `hostile`- und `intent:attack`-Consumer gegen Run-1-Evidenz reproduzieren. Nicht einfach alle `hostile`-Deltas als bloße `threat` ignorieren: Verlässliche Ausführung / klare offensive Handlung muss weiterhin `combat.pending` oder einen zulässigen Encounter eröffnen. Ein eigenständig hinzugefügtes neues Schemafeld ist **nicht automatisch erlaubt**; bevorzugt vorhandene `intent`, `hostile`, `aware`, `envelope`, `narrated`-Evidence und Consumer-Gates konsistent auswerten. Bei Schemaerweiterung Event-Version/Legacy-Replay und Firewalls explizit beweisen.

**Tests vor Produktänderung (je Red-/Green-Beleg):**
1. Vier Banditen greifen zu Bögen, **drohen**, verlangen Fracht – **noch kein** Angriff, HP-/MP-Verbrauch, Initiativwurf oder Schaden. Verhandlung, Zahlung/Abgabe der Fracht, Rückzug bleiben Spielerentscheidungen.
2. Bogen **gezogen/gespannt** oder jemand nimmt Deckung: Bedrohung/Position legitim, keine automatisch verbuchte Attacke.
3. Einer der Banditen **schießt tatsächlich**: erlaubter NPC-Angriff, Enginecombat; Reihenfolge und First-Strike/Awareness wie vorher.
4. Ein neuer echter **verdeckter Hinterhalt**: spontane NPC-Gefahr darf den Kampf auch ohne vorherige PC-Zustimmung eröffnen; existing `quiet road` begrenzt bereits narrativ nicht zulässige Überfälle.
5. Eine **neutrale** NPC-Person in derselben Szene/Gruppe zeigt Angst oder diskutiert – kein automatisches hostile mass-commit; eine kausal unterstützende Gruppe darf dennoch zulässig teilnehmen.
6. Angreifergruppe wird unklar als „three of the five“ referenziert – keine beliebige Auswahl; bestehende `identity`-Guards gelten.
7. PC schlägt selbst an – zulässige PC-Entscheidung folgt unverändert Combat-Authority und echter Action-Prüfung.
8. Waffenbedrohung/Robbery ohne Kampf kann unrechtmäßige Forderung begründen, **nicht** automatischen Treffer/Engine-XP.

**B. Combat-Truth/Chronik:** Der Text eines Narrators und nachgelagerte Welt-/Memory-Deltas sind an **echte Combat-Records** zu binden, soweit sie konkrete ausgeführte Aktionen, Treffer, Zauberanzahl, Ressourcenverbrauch, Schaden, Status, Kills oder Beteiligte behaupten. Möglichst bestehende autoritative `outcome.records` und `enc.log` heranziehen. Enger, belegbarer Verbraucherfilter für **falsche Ereignisbehauptungen** statt großflächiger Streichung aller Erinnerungen.

**Tests:**
9. Genau **ein** Arcane Bolt, ein tatsächlicher Treffer → Erzähler wird auf einen Treffer begrenzt bzw. erhält klare Engine-Korrektur; eine Extractor-`memory` „three bolts struck“ darf **nicht** als Weltfakt persistieren.
10. PC verursacht echten Doppelschlag/Area-Hit/mehrere Ziele → **sämtliche** gebuchten Treffer und Ressourcen korrekt erzählbar und erinnerbar; der Filter darf keine realen Ereignisse löschen.
11. NPC trifft dreimal; PC trifft einmal → korrekte Actor-Zuordnung. Keine falsche „Alaric attacked thrice“-Ableitung.
12. Fehlgeschlagener/abgewiesener/off-target Angriff → keinerlei Treffer-Fact; NPCs dürfen darüber **reden**, Gerücht ist kein objektiver Treffer.
13. Echte Niederlage, Tod, Flucht, Kapitulation → kein Phantomkill, keine Defeat-XP aus Erzähltext; existierendes `stripFalseDeaths` und `quest.ready` bestehen.
14. Nur atmosphärische Nahkampfdetails („sparks flew“, Staub, Schreie, Zittern) → zulässige Prosa, keine fälschliche mechanische Ablehnung.
15. Memory/Thread/Questnote mit Mischung aus echtem Moment und falschem Zusatztreffer → **klauselscharf** korrigieren, belegte Teile behalten; Replay/Reload identisch.
16. Vorherige Engine-Buchung bleibt bei Narrator-/Extractor-Failure bestehen; niemals nachträglich einen zweiten Angriff buchen.

## 4. Vorgehen für einen normalen Sol-Fachpatch

1. Current `.66`-Diff, Original-Run-1-Logs und existierende Combat-/Firewall-Tests vollständig prüfen. **Kausalpfade dokumentieren**: welche Event-/Deltafolge öffnete tatsächlich Kampf und welche speicherte die falschen „3 hits“? Wenn Originalexport nur als Review aber nicht rohe Eventdaten verfügbar ist, das ausdrücklich kennzeichnen und die angelehnten Fixtures nicht als Original-Replay bezeichnen.
2. Negative Fälle als Red-Regressionen, positive Ambush-/Gruppenkampf- und Multiple-Hit-Kontrollen dazu; **nicht** alle beliebigen NPC-Angriffe verbieten.
3. Produktlogik eng verbessern, Firewalls/Replay/Legacy kontrollieren. Fachpatch darf mehrere benötigte Module ändern; kein künstlicher Mini-Patch-Limit, aber **keine** unrelated Guild-/Chase-/Loot-/Provideränderung.
4. Eigene Regressionen, betroffene `combat`-/`world`-/`context`-/`ownership`-Suites, **vollständiges `npm test`**, anschließend echter `npm run smoke:st:c` in ST 1.19, mit Head/Version/Testlogs belegen; falls ST nicht verfügbar, keine gefälschte Freigabe.
5. unabhängiger Gegenreview anhand Diff und Tests; anschließend **natürlicher GLM-`current_test`** für Storyqualität und Bedrohungsfreiheit von Player Agency. **Nicht** nur 1 synthetisches Kampfbeispiel als 100-Züge-Abnahme verkaufen.

## 5. Grenzen und Abnahmestatus

**Kein Build, Commit, Red-/Green-/Smoke-Resultat durch dieses Dokument.** Version erst bei tatsächlicher Implementierung erhöhen. 10B-3-Guild-Board ist ein **eigener** fachlicher Patchplan, nicht in diesen Kampfcode ziehen. Zahlenbalance, NPC-Sapienz-/Temperament-Redesign, Combat-Scaling, Monsterdatabase, generelles Pacing, Escort-Risikostufen und Chase bleiben außerhalb. Eventuelle neue Befunde aus dem laufenden `.66`-Run haben Vorrang gegenüber dieser auf historischen Quellen beruhenden Testmatrix.

**Definition of Done:** keine fehlerhafte Kampföffnung auf reine Drohung; positive autonome echte NPC-Attacke bleibt möglich; keine phantomhaften, dauerhaft gespeicherten Zusatztreffer; positive echte Mehrfachaktionen bleiben; Run-/Replay-/Fullsuite und ST-Smoke dokumentiert; eigener Diff-Review.
