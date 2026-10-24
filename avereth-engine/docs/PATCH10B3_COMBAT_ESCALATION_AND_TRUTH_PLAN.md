# 10B-3 – Kampfeskalation und mechanische Kampfchronik

**Abschluss 24.10.2026:** Als Build **.70** implementiert und technisch abgenommen; Ergebnisse und Grenzen stehen einmalig in der [Patchnote](PATCH10B3A_COMBAT_ESCALATION_AND_TRUTH.md). Die folgenden Abschnitte bleiben der historische Fachplan.
**Fachlicher Implementierungsentwurf für Sol – noch NICHT implementiert oder freigegeben.**

**Aktuelle Planungsbasis:** Natürliche Runs 1 (.57), 6 (.66), [8 (.68)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-142854Z-current_test/REVIEW.md). Der separate Planner-Sequenz-Hotfix ist inzwischen als **Build .69** implementiert; er ist kein Bestandteil von 3A. Vor 3A-Implementierung tatsächlichen Git-HEAD prüfen. Fachlich ein zusammenhängender Combat-/Dungeon-Truth-Patch, **noch nicht implementiert oder freigegeben**.

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

**Kein Build, Commit, Red-/Green-/Smoke-Resultat durch dieses Dokument.** Version erst bei tatsächlicher Implementierung erhöhen. 10B-3-Guild-Board ist ein **eigener** fachlicher Patchplan, nicht in diesen Kampfcode ziehen. Zahlenbalance, NPC-Sapienz-/Temperament-Redesign, Combat-Scaling, Monsterdatabase, generelles Pacing, Escort-Risikostufen und Chase bleiben außerhalb. Neuere echte Runs gehen historischen Hypothesen vor. Die ergebnisoffene Slot-Entscheidung nach Sols Run-8-Gegenreview ist in §§7–8 eingearbeitet.

**Definition of Done:** keine fehlerhafte Kampföffnung auf reine Drohung; positive autonome echte NPC-Attacke bleibt möglich; keine phantomhaften, dauerhaft gespeicherten Zusatztreffer; positive echte Mehrfachaktionen bleiben; Run-/Replay-/Fullsuite und ST-Smoke dokumentiert; eigener Diff-Review.

## 6. Ergänzung zum vollständigen Combat-Fachpatch nach Run 6

[Run 6](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-104654Z-current_test/REVIEW.md) bestätigt einen zusätzlichen engen Combat-Truth-Fall: Drei Skelette beteiligen sich am selben Encounter; nur A und B sterben, C lebt mit **36 HP**. Der Narrator schildert trotzdem „three heaps of bone“. Die Engine verbucht Kills, HP und Tod korrekt. **Fehler: präsentierte bzw. potenziell persistierte Erzählbehauptung**, nicht ein zusätzlicher echter Engine-Kill. Zusammen mit den Phantom-Arcane-Bolts aus Run 1 gehört das in **denselben** Combat-/Chronik-Fachpatch.

**Erweiterte Abnahmekontrollen:** (1) Aus zwei tatsächlichen Kills darf keine dritte mechanische Todes-/Loot-/XP-/Memory-Tatsache entstehen; Engine-Combat-Records haben Vorrang. (2) Der Narrator erhält eine eindeutige aktuelle Liste toter und lebender Combatants; wenn freie Prosa dennoch widerspricht, muss wenigstens der folgende Extractor solche Aussagen am Engine-Truth-Gate abweisen. Eine Garantie völlig fehlerfreier freier Prosa ohne belegten Host-Ausgabepfad wird **nicht** behauptet. (3) Eine reale Mehrfachaktion oder Area-Attacke darf weiterhin korrekt dargestellt werden. (4) Ein Doppelwunsch „Basic Attack, then Flame Lance“ bucht nur tatsächlich zulässige PC-Aktionen, keine Phantom-Folgeaktion. (5) Bei PC-Tod im gemeinsamen Encounter bleiben HP, MP, noch lebende Gegner und ausstehende XP konsistent; Run 6 endete mit **0 XP für den verlorenen Encounter**.

**Trennung von Balance:** Sol hat in Build .67 Kampf-/Quest-XP nach Rundung verdoppelt ([Patchnote](PATCH10B_XP_REWARDS.md)); diese Combat-Korrektur darf keine weitere Multiplikation, Schadensänderung, HP-/Monster-Nerfs oder geänderte Levelkurve enthalten. Drohung, tatsächlich erfolgter NPC-Angriff, positiver Ambush und neutrale Anwesende gemeinsam mit den vorhandenen Tests überprüfen. Vorher Original-Beleg und relevanten Combat-/World-Consumer prüfen, danach Rot/Grün, Vollsuite und echten ST-Host-Smoke.


## 7. Run 8: frei erfundener Dungeon-Gegner als Plotblockade

[Unabhängiger Originalreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-142854Z-current_test/REVIEW.md): Ein „patched greater skeleton“ trägt angeblich den einzigen Schlüssel für den Abstieg. Der Narrator beschreibt es als aktiv, die Engine lehnt creature.new mit dungeon_foe ab (Record 122). Sechs vergebliche Angriffsversuche enden als ATTACK — TARGET NEEDED. Die Engine verhindert regelwidrige Kampfwerte, lässt aber die spielerische und narrative Blockade bestehen.

**Revision nach Sols Gegenreview:** Der Narrator soll passende Feinde **innerhalb bereits vorhandener freier Dungeon-Encounter-Slots** kreativ ausgestalten dürfen. Nur unzulässige Zuordnungen werden weiterhin verworfen; eine Ablehnung muss außerdem im nachfolgenden Story-/Memory-Kontext wirken. Das reine zusätzliche Verbot neuer erzählter Gegner wäre zu restriktiv. Die dafür erforderlichen technischen und spielerischen Bedingungen stehen in §8.

## 8. Kontolliert flexible Dungeon-Slot-Zuordnung

### 8.1 Belegte Zustände und Ist-Mechanik

Old Crown Catacombs, Floor 1, Cycle 1, echter Run 8:

- **bones:** 3 autorisierte Skeletons, Level 5/4/3; tatsächlich besiegt.
- **gallery:** Skeletal Gravekeeper, **Level 1**, konkrete Entity mon.old_crown_catacombs_c1_l1_e2 bereits erzeugt, noch **lebendig/unresolved**. Das ist **kein** freier Slot.
- **warden:** Gallery Warden, **ein freier Guard-Slot Level 4** (armoured skeleton). Diese Gelegenheit dürfte die Szene mit dem patched greater skeleton glaubwürdig ausgestalten, aber nicht mechanisch aufwerten.

**Ursache ist zweifach:** living.js:slotForNew (um Zeile 267) akzeptiert nur ein für den aktuellen Turn gesetztes dungeon.ahead. Zugleich sperrt living.js:nextWaiting (um Zeile 246) den Guard regulär, solange ein früherer Minion-Slot nicht resolved ist. **Nur ahead optional zu machen reicht nicht.** world.js:newEntity verweigert richtigerweise ungeordnete Dungeon-Foes; slotEntityEvents erzeugt bereits die vorgesehenen autoritativen Entity-/Slot-Events, clearEvents verlangt alle Slots resolved. Diese vorhandenen Wege sind wiederzuverwenden.

### 8.2 Fachlich vollständige Lösung innerhalb von 10B-3A

1. **Default bleibt wie bisher:** GO, aheadEvents und nextSlot bestimmen reguläre Begegnungen und ruhige Abschnitte. Ein gültiges aktuelles ahead hat Vorrang; kein Narrator-Gegner darf den autorisierten Encounter ersetzen.
2. **Kreative Zuordnung als enger zusätzlicher Weg:** Wird ein Gegner tatsächlich **gegenwärtig** und **kausal in der Szene** eingeführt, darf die Engine ihn einem **eindeutigen freien Slot auf demselben Floor und im selben Cycle** zuordnen, auch ohne ahead. Abgleich mit Species/Anchor, Role, Orts-/Szenenbeleg, existierenden Entities und bereits belegten oder entschiedenen Slots. Bloß das Wort „skeleton“ ist bei mehreren Kandidaten **kein eindeutiger Nachweis**. Ein Gerücht oder ein entfernter Feind führt nicht zu Spawn.
3. **Bewusste begrenzte Out-of-Order-Ausnahme:** Ein konkret passender **Warden** darf bei glaubhafter Begegnung **vor Abschluss** eines vorherigen Minion-Slots als realer Gegner auftreten. Nicht automatisch alle Guards freischalten oder den Dungeon-Standardrhythmus beseitigen. Der schon erzeugte Gravekeeper bleibt unabhängig lebendig und ungelöst. Die frühe Guard-Belegung muss **persistent, atomar und einmalig** sein und darf frühere Slots nicht löschen oder als resolved markieren.
4. **Mechanik ausschließlich aus dem Slot:** Level 4, Anzahl 1, Combattyp, HP, Attacken, XP/PP, Loot, Reset, IDs und Kampfregeln für den Gallery Warden sind verbindlich. „Riesig“, „geflickt“ oder „unheimlich“ sind freie Beschreibung, **kein Monster-Level- oder Schaden-Upgrade**. Kein zweites Spawnsystem, kein neues Monsterarchiv und keine Bonusgegner außerhalb des vorhandenen Budgets. Echte autonom handelnde Feinde bleiben möglich; Drohungen allein eröffnen weiterhin keinen falschen Treffer.
5. **Dungeon-Clear und Gate bleiben autoritativ:** Der Warden darf vorzeitig sichtbar, angesprochen, vermieden oder bekämpft werden. Selbst sein Tod öffnet den nächsten Floor **nicht automatisch**, wenn der bestehende gallery-Slot noch unresolved ist. Vorhandene dungeon.cleared-/sealRefusal-/Quest- und Resetbedingungen bleiben bestehen. Begegnung ist **keine erzwungene PC-Kampfentscheidung**.
6. **Schlüsselgeschichte nur mit echter Objekt-/Gate-Authority:** Ein echter Gegner kann glaubwürdig einen Schlüssel tragen, aber ein **notwendiger** Schlüssel muss als gültiger Gegenstands-/Gate-/Questfakt entstehen und darf keinen unlösbaren Zugang schaffen. Der Narrator darf nicht durch ein ausgedachtes Schlüsselattribut die enginekontrollierte Dungeon-Versiegelung aufheben. Echte vorhandene Schlüssel/alternative Wege bleiben erhalten.
7. **Wenn kein Slot zulässig ist:** dungeon_foe bleibt korrekt; das Narrator-Folgekontext-/World-/Memory-Gate muss **die spezifische Falschbehauptung** (aktiver unbesiegbarer Feind, zwingender Schlüsselträger) korrigieren oder als unbestätigte Wahrnehmung kennzeichnen. Keine endlosen ATTACK-TARGET-NEEDED-Schleifen. Atmosphäre, Schatten, Gerüchte, historische Kreaturen, friedliche NPCs sowie freie Monster **außerhalb** echter System-Dungeons bleiben möglich. Keine pauschale Prosa-Zensur.

### 8.3 Positiv- und Negativtests (Red/Green)

| Fall | Erwartung |
|---|---|
| Run 8: gallery-Gravekeeper lebt, warden frei, kein ahead | Eindeutige kreative Warden-Darstellung kann einmalig zu **einem Level-4-Warden** gebunden werden; Gallery bleibt unresolved |
| Gültiges ahead benennt anderen Slot | ahead gewinnt; kein willkürlicher Austausch |
| Warden zuerst getötet, Gallery offen | Floor-/Clear-/Gate-/Queststatus **nicht** unverdient abgeschlossen |
| Identischer Warden nochmals genannt, Swipe/Reload, Reset, Firmen-/NPC-Entscheidung | Keine zweite Slotbelegung, kein doppeltes XP/Loot, Zyklus/Identität konsistent |
| Bereits occupied, killed, fled, taken; anderer Floor/Cycle | Keine unzulässige Kreatur und kein Revival aus Prosa |
| Mehrere ähnlich passende freie Slots oder falscher Anchor | Keine Zufallsauswahl; auf zulässigen Weg/Klärung zurückfallen |
| Visuelle Vorahnung, Gerücht, friedlicher Besucher | Darf als Erzählung vorkommen, erzeugt **keinen** unerlaubten Encounter |
| Abgelehnter Feind mit einzigem Schlüssel | Korrigierte Folge-Narration/Facts; mechanischer Fortschritt bleibt möglich |
| Wirklich gebundener Warden, echtes Schlüsselobjekt | Objekt-/Gate-Authority, Loot und Dungeon-Sperre sind konsistent; keine Gratisöffnung |
| Echte Ambushes, Gruppenangriffe, ein Treffer vs. drei Phantomhits | Sämtliche ursprünglichen Combat-/Chronik-Regressionen bleiben wirksam |

### 8.4 Abnahme und Umfangsgrenze

**10B-3A bleibt ein normal großer, fachlich zusammenhängender Patch:** Kampfeskalation und Combat-Facts (§§1–6) **sowie** kreative, enginegebundene Dungeon-Gegner mit aktivem Narrator-/Plotabgleich (§§7–8). Sol soll die Ursache zuerst an bestehenden Event-/Encounter-/World-Verbrauchern reproduzieren; bevorzugt die vorhandenen slotEntityEvents und Ownership-/Replay-Schutzmechanismen. Keine vollständige Neuarchitektur von Living Dungeons und keine Anpassung von XP, Startdistanzen oder globalem Schaden. Insbesondere die bestehende Testfamilie patch83/patch841 und relevante World-/Combat-/Context-Tests erweitern; Gesamtsuite, echter ST-Smoke, danach natürlicher GLM-Test. **Keine Produktcodeänderung durch diesen Plan.**
