# 10B-3 – Kampfeskalation und mechanische Kampfchronik
**Fachlicher Implementierungsentwurf für Sol – noch NICHT implementiert oder freigegeben.**

**Aktuelle Planungsbasis:** Historische Fehler aus .57 sowie [Run 6 auf .66](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-104654Z-current_test/REVIEW.md); neuer Produktcommit .67 7bfb7f25 (XP ×2). Vor Implementierung HEAD und neue .67-Originalbelege prüfen. Eine zusammenhängende Implementierung, keine Mini-Hotfix-Serie; noch nicht freigegeben.

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

## 4. Fachliche Umsetzung und Abnahme

Original-Run-1-Events und die betroffenen Combat-/Firewall-Pfade prüfen: welche Folge öffnete den Kampf, welche speicherte „3 hits“? Fehlende Rohdaten ausdrücklich benennen; abgeleitete Fixtures sind kein Original-Replay. Die Testmatrix oben schützt echte Ambushes, Gruppenangriffe und Mehrfachtreffer.

Gemeinsame Arbeits-/Testregeln: [01](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/01_ARBEITSWEISE_CHATGPT_CLAUDE.md). Zusätzlich betroffene `combat`-/`world`-/`context`-/`ownership`-Suites und echter ST-1.19-Smoke; anschließend natürlicher GLM-Run zur Narrations-/Agency-Qualität. Ein synthetischer Kampf ersetzt keine 100-Züge-Abnahme.

## 5. Grenzen und Abnahmestatus

**Kein Build, Commit, Red-/Green-/Smoke-Resultat durch dieses Dokument.** Version erst bei tatsächlicher Implementierung erhöhen. 10B-3-Guild-Board ist ein **eigener** fachlicher Patchplan, nicht in diesen Kampfcode ziehen. Zahlenbalance, NPC-Sapienz-/Temperament-Redesign, Combat-Scaling, Monsterdatabase, generelles Pacing, Escort-Risikostufen und Chase bleiben außerhalb. Eventuelle neue Befunde aus dem laufenden `.66`-Run haben Vorrang gegenüber dieser auf historischen Quellen beruhenden Testmatrix.

**Definition of Done:** keine fehlerhafte Kampföffnung auf reine Drohung; positive autonome echte NPC-Attacke bleibt möglich; keine phantomhaften, dauerhaft gespeicherten Zusatztreffer; positive echte Mehrfachaktionen bleiben; Run-/Replay-/Fullsuite und ST-Smoke dokumentiert; eigener Diff-Review.

## 6. Ergänzung zum vollständigen Combat-Fachpatch nach Run 6

[Run 6](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-104654Z-current_test/REVIEW.md) bestätigt einen zusätzlichen engen Combat-Truth-Fall: Drei Skelette beteiligen sich am selben Encounter; nur A und B sterben, C lebt mit **36 HP**. Der Narrator schildert trotzdem „three heaps of bone“. Die Engine verbucht Kills, HP und Tod korrekt. **Fehler: präsentierte bzw. potenziell persistierte Erzählbehauptung**, nicht ein zusätzlicher echter Engine-Kill. Zusammen mit den Phantom-Arcane-Bolts aus Run 1 gehört das in **denselben** Combat-/Chronik-Fachpatch.

**Erweiterte Abnahmekontrollen:** (1) Aus zwei tatsächlichen Kills darf keine dritte mechanische Todes-/Loot-/XP-/Memory-Tatsache entstehen; Engine-Combat-Records haben Vorrang. (2) Der Narrator erhält eine eindeutige aktuelle Liste toter und lebender Combatants; wenn freie Prosa dennoch widerspricht, muss wenigstens der folgende Extractor solche Aussagen am Engine-Truth-Gate abweisen. Eine Garantie völlig fehlerfreier freier Prosa ohne belegten Host-Ausgabepfad wird **nicht** behauptet. (3) Eine reale Mehrfachaktion oder Area-Attacke darf weiterhin korrekt dargestellt werden. (4) Ein Doppelwunsch „Basic Attack, then Flame Lance“ bucht nur tatsächlich zulässige PC-Aktionen, keine Phantom-Folgeaktion. (5) Bei PC-Tod im gemeinsamen Encounter bleiben HP, MP, noch lebende Gegner und ausstehende XP konsistent; Run 6 endete mit **0 XP für den verlorenen Encounter**.

**Trennung von Balance:** Sol hat in Build .67 Kampf-/Quest-XP nach Rundung verdoppelt ([Patchnote](PATCH10B_XP_REWARDS.md)); diese Combat-Korrektur darf keine weitere Multiplikation, Schadensänderung, HP-/Monster-Nerfs oder geänderte Levelkurve enthalten. Drohung, tatsächlich erfolgter NPC-Angriff, positiver Ambush und neutrale Anwesende gemeinsam mit den vorhandenen Tests überprüfen. Vorher Original-Beleg und relevanten Combat-/World-Consumer prüfen, danach Rot/Grün, Vollsuite und echten ST-Host-Smoke.

## 7. Run 8 (.68) – Phantom-Dungeon-Gegner als unerreichbarer Schlüsselträger

[Originalreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-142854Z-current_test/REVIEW.md): Der Narrator erzeugt einen `patched greater skeleton` mit Schlüsseln am Hals. Extractor `creature.new` wird in Engine-Record 122 mit `dungeon_foe` korrekt zurückgewiesen. Trotzdem behauptet der Narrator weiterhin einen realen patrouillierenden Gegner und macht dessen Schlüssel zum notwendigen Zugangsobjekt. Sechs Angriffsversuche (Inputs 62,63,64,66,67,70) enden mit `ATTACK — TARGET NEEDED`, ohne Ressourcenverlust. **Mechanik sicher, Gameplay/Plot blockiert.**

**In diesem vollständigen Combat-/Truth-Patch ergänzen:** Ein abgelehnter nicht autorisierter Dungeon-Gegner darf beim nächsten Narrator/Extractor-/Memory-Durchlauf nicht weiter als aktueller Kampftarget oder notwendiger Key-Carrier als Fakt gelten. An der tatsächlichen `dungeon_foe`-Rejection und dem Context-/Narrator-Korrekturpfad ansetzen. Echte engineautorisierte Dungeon-Feinde, echte Schlüssel, neutraler NPC und subjektives Gerücht bleiben möglich. Nicht alle beschriebenen Wesen spawnen und keine Dungeon-Gates umgehen. **Rot/Grün:** abgelehnter Gegner samt Schlüsselbindung wird nachvollziehbar korrigiert; legitimer engineautorisierter Encounter bleibt targetierbar; keine Phantomfakten/Blockaden bei Replay/Reload.

**Unabhängiger technischer Defekt aus demselben Run:** Input 75 scheitert an `src/v4/planner.js:parsePlan`, weil auch die reparierte legale `take→attempt`-Kette das Tool gegen den Inventory-Startsnapshot validiert. **Vor neuem Langlauf ein eigener enger Planner-Sequenz-Hotfix**, keine Aufweichung des Besitzrechts. Nicht mit Combat-Ursache oder neuer Balance vermischen.
