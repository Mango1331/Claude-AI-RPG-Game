# Avereth Engine – Patch 10B: Masterplan, Designreviews, Testbefunde und Entscheidungsspeicher

**Status:** Aktive **Beobachtungs-, Design- und Messphase**, **keine produktive 10B-Implementierungsfreigabe**.  
**Erstfassung:** 24.10.2026 · **Hauptdokument auf \`main\`**.  
**Entwicklungszweig:** \`claude/c-planner-prototype-2026-10-02-gpt-c666\`, beim Anlegen verifizierter HEAD \`fd20d0dce0b0fc508b17810872b7933a5f00e994\`, Engine \`4.3.0-c.6.6.57\`. Neue Git-HEADs stets live prüfen; diese Zeile ist ein datierter Snapshot.

> **Diese Datei ist ab jetzt der zentrale lebende Informationsspeicher für 10B.** Hier sammeln wir ausführliche Reviews, Befunde aus natürlichen SillyTavern-Läufen, Simulatoranalysen, Optionen, offene Fragen, Freigaben und später tatsächlich implementierte Fixes. Die vier übergeordneten Root-Dateien \`01\`–\`04\` bleiben Rollen/Kanon/Projekt-Übergabe/historischer Ideenkatalog; sie erhalten während der langen 10B-Phase **nur bei wesentlichem Meilenstein** einen kurzen Status und einen Link hierher. **Keine regelmäßigen parallelen 10B-Langtexte** in \`03\` oder \`04\`.

**Interpretationsschlüssel:** **[BELEGT]** = Code/Event/Quellenpfad nachgewiesen; **[BERICHTET]** = vom jeweiligen Reviewer/Implementierer angegeben, nicht zwangsläufig hier unabhängig nachgetestet; **[HYPOTHESE]** = plausible, noch isoliert zu reproduzierende Ursache; **[DESIGN-FIX-KANDIDAT]** = für spätere Auswahl festgehaltenes Spielgefühl-/Designproblem; **[EMPFOHLEN, NICHT FREIGEGEBEN]** = begründete bevorzugte Richtung; **[FREIGEGEBEN]** erst nach ausdrücklicher Nutzerentscheidung; **[IMPLEMENTIERT]**, **[TESTS BESTANDEN]**, **[LIVE ABGENOMMEN]** nur bei dazugehörigem tatsächlich verifiziertem Nachweis.

---

## 0. Was wir gerade tun – kompakte laufende Startseite

**Unveränderter Kern:** „LLM versteht wie ein GM, die Engine rechnet wie ein Spiel“; Player Agency, sinnvolle Entscheidungen, lebendige große Welt und gute Progression **vor** starrer Simulation. Keine unaufgeforderte neue Monster-Speziesdatenbank, kein automatisches Monster-Level-Scaling zum PC, kein künstlicher XP-Farm-Nerf, keine zusätzlichen Pflicht-Reise-/Jagd-Miniturns. Klassische eigenständige Fantasyvölker (Elfen, Zwerge, Orks usw.) sind **bewusst nicht Bestandteil des gegenwärtigen Weltkanons**. Menschen und Monster existieren; Monster können intelligent sein, politische Verbände bilden oder friedlich sein.

**Patch-Vorgeschichte:** Patch 9D F→E Normal/Rare durch den gezielten **synthetischen** .57-Fixture-Livetest \`20261024-021009Z-current_test\` (23 Züge, 5/5, Reload bestätigt) für seinen eingegrenzten Pfad live abgenommen. Das ist **kein** Nachweis, dass in einer frei gespielten Kampagne Level 1→15 und Evolution bereits organisch erreicht werden. 10B ist keine Fortsetzung der alten Fixture-Zwangsroute.

**Drei Untersuchungsstränge:**

| Strang | Gegenstand | Belegstatus 24.10.2026 | Aktuelle Aktivität |
|---|---|---|---|
| **A – offene freie ST-Kampagnen** | \`current_test\` ohne Fixture ab echter Level-1-Erstellung; Ziel 100 echte Spielerzüge | Run 1 26 Züge/Tod; Run 2 25 Züge/leerer Narrator. **0/2** erreichen Horizont | **JETZT:** weitere Runs starten und jeweils ausführlich reviewen/archivieren; nicht für Testerfolg manipulieren |
| **B – deterministische Kampf-/Wirtschaftssimulation** | echte JS-Engine, 3 Startklassen, Builds und Monster, Seeds | Portabler Simulator \`fd20d0d\` **implementiert**; zusätzliche 60.700 Läufe durch ChatGPT zuvor berichtet; Methodik muss fair eingegrenzt werden | Daten sammeln, Taktik-, Startdistanz- und NPC-Seitenasymmetrien ausweisen; **keine** globalen Nerfs |
| **C – Verfolgung, Flucht, Rückzug, Bewegung, Monsterverhalten** | scheue Tiere, Band-System, Zeit-/Turn-Aufwand, Flee/Chase-Intent | Reale Hasen-/Fuchsjagd als Reibung dokumentiert; **bestehender** One-Roll-Escape-/Chase-Code verifiziert; genauen Fehlerpfad weiter isolieren | **DESIGN-FIX-KANDIDAT, ZURÜCKGESTELLT**, nach weiteren Runs/gezieltem Repro entscheiden |

**Querschnitt M – Monster/Lore/Content:** Mein erster Lore-/Monster-Audit und Sols ausführlicher unabhängiger Gegenreview sind in §§5–8 getrennt dokumentiert. **Vorrangige technische Empfehlung für später: D (eng begrenzter Anatomie-/Lootfix), danach nur bei echtem Nutzen C (kleiner Hybrid).** Keine der Varianten ist implementierungsfreigegeben. Teil C und Monsterverhalten haben Schnittmengen, werden nicht isoliert als zwei neue Systeme entworfen.

**Testarchiv:** [\`testrun_10b/README.md\`](testrun_10b/README.md). Pro Lauf ein Unterordner \`testrun_10b/<Run-ID>/\` mit **unveränderter Original-ZIP** und **\`REVIEW.md\`**; nicht doppelt entpackt in Git. Der Nutzer übernimmt nötigen Binär-Webupload, ChatGPT das Review samt Index. Neue Runs in dieser Masterdatei **nur als knappe Querverweise**, vollständige turngenaue forensische Analyse bleibt im jeweiligen \`REVIEW.md\`.

**Wichtige Trennung:** Eine hohe P0/P1-Triage-Priorität bedeutet **nicht**, dass während der laufenden Test-Sammelphase heimlich ein Patch umgesetzt wird. Ein echter Verlust von Player Agency wird als späterer Fix-Kandidat ernst genommen, aber numerische Balance folgt erst auf belastbare Evidenz.

---

## 1. Dokumentations- und Quellenarchitektur für eine längere 10B-Phase

**Wer entscheidet was?**

- \`01_ARBEITSWEISE_CHATGPT_CLAUDE.md\`: dauerhaftes Rollenmodell und Methode; nur bei veränderter Arbeitsweise nachführen.
- \`02_DESIGN_KANON.md\`: **ausschließlich verbindliche** Nutzerentscheidungen (kein automatisch „kanonisch“ gewordener Reviewvorschlag).
- \`03_AKTUELLER_PROJEKTSTAND.md\`: wenige Zeilen zu aktuellstem Build/HEAD, offener 10B-Testphase, Verweis auf diese Datei; historische Patch-9-Chronik bleibt.
- \`04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md\`: übergreifende historische Ideen und 10B-Kurzverweis, **kein** zweites täglich fortzuschreibendes vollständiges 10B-Journal.
- **\`06_PATCH10B_MASTERPLAN_UND_REVIEWS.md\` (hier):** Status- und Designjournal, zusammengeführte unabhängige Reviews, Ideenalternativen, Umsetzungs-/Abnahme-Matrix und Entscheidungshistorie.
- \`testrun_10b/<Run-ID>/REVIEW.md\` + ZIP: **unveränderte Evidenz und vollständige Einzelauswertung**. Keine großen ZIPs hier in der Haupt-MD wiederholen.
- Entwicklungsbranch \`avereth-engine/docs/\`, \`src/\`, \`content/\`, \`tests/\`: **tatsächliche Produktimplementierung**, technische Patchnotes und Regressionen; Haupt-Dokumentation auf \`main\` **ersetzt keinen aktuellen Git-Abgleich**.

**Ein neuer Test:** ZIP prüfen → Chat, Event-Log, Planner-/Extractor-/Narrator-Calls und Runnerstatistik getrennt rekonstruieren → \`REVIEW.md\` in eigenem Testordner + Index ergänzen → **hier nur** neue Befundklasse/Häufigkeit/Querverweis eintragen, falls inhaltlich neu. Keine unaufgeforderte Änderung an 01–04. Jede Einzelauswertung benennt ggf. unterschiedliche Builds, Modellparameter, Seeds und fehlende Belege.

**Eine künftige Freigabe:** Nutzer benennt die betroffene Kennung (z. B. \`10B-M01\`) und den Umfang. Erst dann werden Engine-/Test-/Patchnotes, Status \`FREIGEGEBEN → IMPLEMENTIERT → GETESTET → LIVE ABGENOMMEN\` **mit Commits und Prüfbelegen** fortgeschrieben. Vorher werden Alternativen gespeichert, keine Zahlen festgesetzt.

**53-Punkte-Abnahmeliste:** In früherer Projektplanung als bestehende externe/originäre Checkliste bezeichnet. Die Original-53 Einzelpunkte liegen hier **nicht als verifizierte fortlaufend nummerierte Liste** vor. Deshalb **keine 53 Punkte erfinden**; der umfangreiche vorhandene 10B-Abschnitt in [Datei 04 §1a.3](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) fasst belegte Bereiche zusammen, ersetzt die Original-Checkliste ausdrücklich nicht.

---

## 2. Verifizierte technische Ausgangsbasis und Grenzen der Nachweise

- **Code:** Dev-HEAD \`fd20d0d\`; Build \`4.3.0-c.6.6.57\`; aktueller Combat-Pfad V4-C/Ruleset 2 mit drei echten Startklassen **Warrior, Mage, Rogue**; fünf Klassen nur Legacy-Ruleset 1. Patch 9D F→E zielgerichtet live gezeigt, höhere Rangbereiche nicht pauschal als fertig bezeichnet.
- **Open Guide:** \`tools/st_live/live/guides/current_test.json\`: freie Level-1-Klasse und Startskills, kein Fixture, \`openRun.minTurns=100\`, Guide-Limit 105. Lokales \`live.config.json maxTurns:40\` wird seit Runner-Fix für Open-Guides nicht stillschweigend priorisiert; explizites \`--max-turns\` muss ≥100 sein. Die gezielte 9D-Fixture blieb in \`patch9d_fixture.json\`.
- **Kampfsimulator:** \`avereth-engine/tools/sim/combat.mjs\`, \`baseline.json\`, \`package.py\`, \`README.md\`, \`tests/sim/combat.test.js\`. Keine veränderten Produktbalancewerte. Sol: drei Kontrolltests und 1275/1275 Gesamttests (seine Ausführung, keine laufende Komplettsuite durch dieses Dokument). Paket wurde zusätzlich in anderer ChatGPT-Auswertung unter Node 22 statt nur Sols Node 24 gestartet.
- **Sol – Monster-Review:** referenziert selbst \`fd20d0d\`/Build .57, überprüft reale \`content/monsters.json\`, \`src/content.js\`, \`src/combat.js\`, \`src/v4/world.js\`, \`src/v4/loot.js\`; kein eigener Folgecommit, keine neuen Zahlen. Quelle: vom Nutzer übermittelte Datei \`Chatgpt Feedback(8).md\` (24.10.2026), **Original-Gegenreview, nicht als Implementierung ausgeben**.
- **Livetest-Status:** Run 1 und 2 haben eigene autoritative ZIPs und Reviews; gemeinsame funktionierende Gilden- und Liefermechanik, aber verschiedene Abbruchursachen; beide Mage. Aus 0 echten Kämpfen in Run 2 kann man weder eine frühere Kampfbughäufigkeit bestätigen noch eine Klassenbalance bewerten.

**Quellenrangfolge:** Direktes Event/Commit/Code > unabhängiger reproduzierter Test > technische Dokumentation > Reviewer-Zusammenfassung > freie Narrator-Erzählung. Bei einem unbekannten Lauf keine Zahlen, Aussagen oder Tool-Prüfungen als selbst neu ausgeführt behaupten.

---

## 3. B – Kampfsimulator, erste Ergebnisse, methodische Leitplanken

### 3.1 Was B liefert

Der Simulationsauftrag wurde in [\`fd20d0d\`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fd20d0dce0b0fc508b17810872b7933a5f00e994) auf Dev ausgeführt. **218** Szenarien, **30** Basis-Builds über Level 1/5/10/14/15, **36** gespiegelte PC-vs.-NPC-Klassenkämpfe, vier einfache PC-Taktiken; Monstergruppen und originale Enginefunktionen statt eines Python-/Excel-Nachbaus. Output CSV, JSONL, Metadata; detaillierte Kampfprotokolle optional. Seeds dienen echter deterministischer Wiederholung.

CLI-Basis:

\`\`\`sh
npm run sim:combat -- --smoke
npm run sim:combat -- --scenario warrior-0-1-wolf-0-1-ENGAGED --runs 500 --seed 100 --out results
\`\`\`

Die Basis-Monstermatrix betont Wolf/Boar; ergänzende Läufe über **alle 19** bestehenden mechanischen Anker wurden von ChatGPT ausgeführt und zuvor mit **17.100 Kämpfen** berichtet. Ebenso **43.600** Baseline-Kämpfe: zusammen **60.700**. Diese Daten werden **nicht** mit den Original-ST-ZIPs oder natürlichen Kampagnen statistisch gleichgesetzt.

### 3.2 Was die ersten Zahlen zeigen – und ausdrücklich noch NICHT beweisen

In der vorangegangenen Simulationsauswertung wurde für die Basismatrix berichtet: Warrior durchschnittlich 100 % PC-Siege (dort 12.400/12.400), Mage etwa 89,7 %, Rogue etwa 88,4 %. Einzelner Level-15-Oger-Fall: Rogue 0/100, Mage 87/100, Warrior 100/100. **Diese auffälligen Resultate sind Hypothesen-Anlässe, keine fertige Klassenrangliste**: unterschiedliche Builds, Kits, Reichweite, Monsterprofile und vier primitive Taktiken; die Klassenvergleiche sind **PC-Taktik gegen native NPC-Steuerung**, nicht symmetrisch gesteuerte Spieler beider Seiten. Sol hat die 60.700 externen Durchläufe **nicht unabhängig wiederholt**. Kein Skill-/HP-/DPS-Tuning freigeben, bevor paarige Seeds und vergleichbare Seiten/Kampflagen die beobachtete Differenz tragen.

### 3.3 Gezielte Folgemessungen – derzeit nur Methodik

1. Klassen getrennt pro Level, Skillwahl, Ausrüstungs-Tier, Starter-/E-Kit und Eröffnungsdistanz vergleichen.
2. Startseite, Reihenfolge, Initiative, identische Seeds und Aktionen dokumentieren; NPC-gegen-PC-Steuerungsasymmetrie nicht als „symmetrisches PvP“ ausgeben.
3. Einen Gegner pro mechanischer Rolle und Band testen (Nahkampf/Biss, Panzer, Fernkampf/Magie, Gruppen, Elite/Boss), nicht nur 19mal die Zahlentabelle.
4. Taktikfamilien bewusst erweitern, statt zu unterstellen, die vorhandenen vier seien optimal; niedrige Quoten von Mage/Rogue erst mit fairer Mobilität/Verteidigung/Mana prüfen.
5. HP, Ressourcen, Schaden pro Turn, tatsächliche getroffene Ziele, Flee/Draw/Laufzeit, Kampfturns und autoritative Logs auswerten. Keine aus Narrator-Text abgeleiteten Treffer.
6. Nach ersten 100 Seeds für verdächtige Paarungen 500–1.000 Seeds, aber nur nach Reproduzierbarkeits- und Balancing-Plausibilitätsprüfung.
7. Trennung von **testbaren aktuellen Regeln** und **noch nicht existierenden Spezialeffekten** (Gift/Flug usw.), die nicht einfach imaginär in die Simulation eingerechnet werden dürfen.

---

## 4. A – offene echte SillyTavern-Livetests: vollständige Quellverweise und bisherige Muster

### Run 1 – \`20261024-030002Z-current_test\`

**Quelle:** [Review](testrun_10b/20261024-030002Z-current_test/REVIEW.md) + [Original-ZIP](testrun_10b/20261024-030002Z-current_test/20261024-030002Z-current_test.zip). 26/100 Züge in 21:01 min; Level-1-Mage, **Arcane Bolt + Arcane Ward**, Endzustand HP 0, 23/100 XP, 64 cp; **defeat** gegen fünf Level-2-Banditen. Integrität laut Runner OK. Charaktererstellung, Gilde, zwei aktive Aufträge, sechsteilige Transportquest (40 cp +23 XP), 3-cp-Herberge, 1-cp-Essen und zweiter Escort real gespielt.

**Wichtigster P0-Agency-Befund:** Am Fluss zeigen fünf Wegelagerer gespannte Bögen und fordern die Fässer. Noch kein Pfeil geschossen, der NPC-Fahrer sagt „Hold“. Trotzdem werden fünf \`hostile\`/ \`combat.pending\`-Entitäten festgeschrieben; Long Lunge trifft den Mage für **26 HP bevor** er auf die Forderung reagieren kann. Der Spieler hat keine Chance, die Ware herauszugeben, zu verhandeln oder vernünftig auszuweichen. **Keine automatische „alle Drohenden greifen sofort an“-Regel aus einer bedingten Forderung ableiten.** Tatsächliche Schüsse und Hinterhalte dürfen selbstverständlich mechanisch stattfinden. Das ist Player-Agency/Extractor/Combat-Commitment, **nicht** ein Beweis zu hoher Banditen-HP.

**Weitere bestätigte Integrationsabweichungen:** Kutschbock-Betreten als \`go\` in einen Phantomort plus großer Reisesprung; vier erzählte Bogenschützen werden überwiegend als Nahkampf-Rogue-Sheets materialisiert; **ein** gebuchter Arcane Bolt (29 Schaden, -10 MP) wird zu angeblich drei erzählten Treffern, später sogar als falsche Erinnerung übernommen. Daraus folgen separate Regressionen für Travel-Intent, Rollen-/Equipment-Consistency und Narrator-/Memory-Truth.

### Run 2 – \`20261024-033325Z-current_test\`

**Quelle:** [Review](testrun_10b/20261024-033325Z-current_test/REVIEW.md) + [Original-ZIP](testrun_10b/20261024-033325Z-current_test/20261024-033325Z-current_test.zip). 25/100 Züge in 26:19 min; Level-1-Mage, **Arcane Bolt + Focused Ward**, Endzustand 80/80 HP, 72/72 MP, 91 cp, 23/100 XP, **kein Kampf**, **narrator_empty** statt Tod. Echtes 60-cp-/23-XP-Gilden-Turn-in, korrekter realer Gegenstandstransfer bei der Tinkturenlieferung, organischer privater Nachtwachenjob (+1 cp).

**Technischer Stopper:** Narrator-Call verbraucht alle **8192 Completion-Tokens** für **34.573 Zeichen Reasoning**, \`finish_reason=length\`, **0 sichtbare Zeichen** Storytext. Kein Browser-/Engineabsturz. P0 für Test-Stabilität, nicht als Schadensproblem. **Vorsicht:** Endloses stilles Regenerieren oder doppeltes Engine-Commit wäre ein schlechter Fix; mögliche streng begrenzte leere Antwort-Recovery zunächst als isolierte Option testen.

**Weitere Integrationsabweichungen:** erzählte Abendrückreise trotz 08:18/08:33 mechanischer Uhr; zweimal unzulässige **amtliche** Guild-Listings aus dem Narrator und zwei korrekterweise verweigerte \`quest.accept\`-Versuche; privat bezahlter Job noch \`active\` (Objectives/Abschlusssemantik gesondert prüfen), ein \`extract.failed\`, Dummy-Weltfakt \`x=x\`. Firewall verhindert immerhin Phantom-Guild-Payouts und bindende Angebote abwesender Verkäufer.

### Einordnung 1 versus 2

**Gemeinsam:** natürliche Questannahme, physische Lieferung, Preis-/Geldbuchung, Gildenabschluss, +23 XP funktionieren; **beide** bleiben weit unter 100 Zügen und nutzen nur Mage. **Verschiedene** Ursachen: Run 1 Agency/Kampfeskalation und Tod, Run 2 Provider-/Narrator-Budget ohne sichtbaren Text. Die übergeordnete Erzähler↔Engine-Wahrheitsgrenze tritt in beiden auf, aber die Symptome sind **keine** bewiesen identische Softwareursache. Neue Runs, besonders andere Klassen und länger fortgesetzte Wirtschaft/XP/Skills, sind nötig.

**Neue Befunde** künftig zuerst in den jeweiligen Run-Review schreiben, hier unter §11 als eigenständige Kennung/Kategorie ergänzen. Bei 10/20 Runs diese Masterdatei **nicht** mit kompletten chronologischen Wiederholungen auffüllen.

---

## 5. Monster-/Lore-Audit von ChatGPT – rekonstruierte vollständige Analyse

### 5.1 Untersuchungsziel und damaliger Befund

Der Nutzer vermutete eine verlorene Trennung zwischen mechanischen Monster-Archetypen und vorgesehenen Fantasy-„Rassen“. Ich habe den aktuellen V4-C-Content (\`content/monsters.json\`, \`content/lore.json\`, NPC-Templates), das **Avereth World Lore v0.14**-Lorebook, alte Lore/WorldInfo-Quellen und die Kampfsimulationen verglichen. Ergebnis des damaligen Audits: **Die mechanische Bestiariumsabdeckung ist deutlich kleiner als der generative Worldbuilding-Spielraum.** Zugleich gibt es **keinen belegten historischen vollständigen Artenkatalog**, den man nur wiederherstellen müsste. Das Lorebook definiert **Monsterökologie und zwei Monsterreiche**, nicht eine erschöpfende Artendatenbank.

Die erste ChatGPT-Bewertung bezeichnete die 19 Anker vereinfachend als „Körperbau-Vorlagen“ und schlug eine **separate schlanke Spezies-Ebene** als denkbare Lösung vor. Die unabhängige Prüfung durch Sol zeigte, dass diese Abstraktion zu grob ist und ein Pflicht-Speziesregister **nicht nötig** erscheint (siehe §6/7). Dieser Erkenntnisfortschritt wird ausdrücklich dokumentiert, statt den früheren Vorschlag rückwirkend als immer schon richtig zu deklarieren.

### 5.2 Tatsächlicher Weltkanon und Generierungsfreiheit

Das aktuelle Lorebook besitzt **50 Einträge**, unter anderem:

- **MONSTER ECOLOGY / FAUNA:** Selbst vertraute Wölfe, Hirsche, Pferde, Eber, Bären, Vögel, friedliche und domestizierte Tiere sind mechanisch „Monsters“ mit Level und Rank. Das Etikett bedeutet **nicht** feindlich. Die Fauna lebt als natürliche Populationen; F-Rang ist für gewöhnliche Siedlungsnähe üblich, stärkere Entwicklungen selten.
- **MONSTER SPECIES GENERATION:** Neue Arten anhand Ökologie, Körperbau, Habitat, Nahrung, Verhalten, Selektionsdruck, sichtbarer Anpassung und Verhältnis zu Menschen erfinden; Zahlen über den nächstpassenden **mechanischen Anchor**, nicht über freie Erzählerstatistik. Ein höheres Individuum muss nicht eine separate Species-ID bekommen.
- **SAPIENT MONSTER SOCIETIES:** Intelligente Monster sind nicht automatisch Menschen mit Fell oder grundsätzlich Gegner. Kultur/Gesellschaft können aus Art, Reproduktion, Lebensdauer, Landschaft, Geschichte, Macht und sozialer Struktur entstehen. Ein feindlicher Encounter definiert nicht die moralische Gesamthaltung eines Reichs.
- **Ashen Scale Dominion:** Vulkanische östliche Hochländer, Cinder Throne, alte drakonische und beschuppte Blutlinien, weitere Gebirgs-/Feuerarten; Macht über Blutlinien, Territorial-/Eidbeziehungen, lange Geschichte, Handel und Diplomatie möglich. Nicht automatisch ein böser Menschenfeind.
- **Verdant Fang Court:** Alte westliche Wälder, Thornheart, intelligente Tierlinien, verwandelte Prädatoren, Waldgeister; Territorien, Bündnisse, ökologische Verpflichtungen, Handel/Konflikte mit Caelreth.
- **Dungeon- und Reiseökologie:** Monster sind nicht bloß Wegwerf-Encounten; sie sollen sich aus Ort, Umwelt, Gesellschaft und konkretem Questanlass ergeben. Ein generativ neues Waldmonster ist nicht deshalb ungültig, weil es nicht in einer globalen Namensliste steht.

**Ausdrückliche Nutzerklarstellung nach dem Audit:** Große klassische intelligente Fantasyvölker wie **Elfen, Zwerge und Orks** wurden **mit Absicht nicht eingeführt**. Aktuell ist menschliche Zivilisation menschlich; daneben bestehen Monster und teils intelligente Monsterreiche. Nur aufgrund möglicher Fantasykonventionen **keine neuen Standard-Rassen** in Lore, NPC-Templates oder Character Creation eintragen. Die drakonischen Linien eines Monsterreichs sind Monsterwelt-Bestandteil, **nicht** schon automatisch eine implementierte zweite klassische spielbare Race.

### 5.3 Die 19 tatsächlichen Anchors – Funktionskategorien, nicht Speziesgesetz

**IDs aus \`content/monsters.json\`:**

\`rat\`, \`wolf\`, \`boar\`, \`deer\`, \`horse\`, \`bear\`, \`feline\`, \`serpent\`, \`raptor\`, \`arthropod\`, \`aquatic\`, \`goblin\`, \`ogre\`, \`armored_beast\`, \`spirit\`, \`skeleton\`, \`ghoul\`, \`slime\`, \`goblin_shaman\`.

**Annahme des ersten Audits:** Diese Anchors repräsentieren grob morphologische Kampfvorlagen und füllen mechanische Zahlen/Stärke. **Genauerer Codebefund (Sol und hier nachgeprüft):** Die Liste **mischt** eine Speziesgruppe (\`wolf\`), grobe Tiergestalt (\`raptor\`), Lebensraum (\`aquatic\`), spezielle Verteidigung (\`armored_beast\`), Wesenart (\`spirit\`) und **Kampfrolle** (\`goblin_shaman\`). Die gemeinsame Funktion ist ein **pragmatisches Combat-Ausgangsprofil**, keine biologische Taxonomie. Zusätzliche Einträge nur wegen hübscher Artennamen sind konzeptionell nicht nötig.

**Was die Anker bereitstellen:** F-Rang-/Level-basierbares HP/ATK/DEF/MDEF/INIT, natürliche Angriffsart und Reichweite, Aliasbegriffe, Temperament, abgeleitete Material-/Loot-Kategorien. Freier Speziesname ist im \`creature.new\` bereits unabhängig vom mechanischen Anchor möglich; dass eine Species keinem Alias entspricht, bedeutet allerdings keine automatische semantische JS-Zuordnung.

### 5.4 Drei konkrete Abdeckungsprobleme, die der erste Audit herausarbeitete

**I. Artenname passt nicht zu Beuteorgan.** In einem vorangegangenen Livetest wurde das Tier \`hare\` auf \`deer\` verankert; nach einem Kampf erschien **F-Rank Hare Antler**. Es war kein reiner Prosa-Fauxpas, sondern materialisierte Anatomie aus der generischen \`deer\`-Lootmatrix. Sol hat denselben Mechanismus zusätzlich für \`Doe Antler\` und \`Goat Antler\` unabhängig über den Lootcode reproduziert. Die Ursache bleibt auch dann bestehen, wenn man „hare“ bloß einer anderen unpassenden Kategorie zuordnet.

**II. Wichtige Monsterreiche sind im Content nicht als eigenständige Kampf-Spezieslisten ausgearbeitet.** Das ist **nicht automatisch ein Defekt**: Ein einzelnes intelligentes Drakonisches Wesen oder Waldgeist darf aus existierenden Kampfwerten mit freien Details entstehen. Probleme entstehen erst, wenn Narrator-Seiten das für den Spieler wesentliche Versprechen (Feueratem, Flug, Giftresistenz, kulturelle Waffen) machen, die Engine jedoch nur normalen Nahkampfschaden ausführt.

**III. Eine generative Welt braucht persistente Individualität ohne hundert feste Monster-Einträge.** Wenn ein zuvor etablierter Glaspanzer-Käfer erneut erscheint, soll er nicht bei jeder Erzählung unerkannt Form, Beute, Magie oder Verhalten wechseln. Zugleich darf das System nicht jeden beliebigen einmaligen Hasen zu einer neuen Tabellenzeile machen.

### 5.5 Frühe Audit-Empfehlung und Revision

Mein erstes Audit tendierte zu „Kampfanker + Species-Layer + Volk/Gesellschaft“, um Zahlen, Anatomie/Loot und Kultur zu entkoppeln. Diese Trennung als **Denkmodell** bleibt nützlich, aber **eine neue verpflichtende Datenbankschicht ist als technische Konsequenz nicht belegt**. Bereits vorhandene Entity-Daten enthalten Artname, Beschreibung, Anker und feste Profile. Gesellschaft und Lore können im existierenden Lorebook, Fraktions- und NPC-Wissen bleiben. **Revidierte bevorzugte Richtung nach Sols Gegenprüfung:** vorhandene Pfade reparieren, nur wirklich benötigte optionale Eigenschaften hinzufügen. Keine unkontrollierte neue zweite Truth-Source.

---

## 6. Sols unabhängiger Monster-Gegenreview – detailliert und quellengetreu

**Quellcharakter:** Vom Nutzer am 24.10. übermittelte Datei \`Chatgpt Feedback(8).md\`, Sols **Review**, kein Patch. Sol nennt Codebasis \`fd20d0d\`/Build .57, Main-Dokumente bei damals \`a90a61f\`; **keine** Engine-, Balance- oder Dokumentenänderung als Teil seines Reviews. Die folgenden Feststellungen sind nach Sol gegliedert; dort wo Gitcode jetzt unabhängig nachgelesen wurde, ausdrücklich gekennzeichnet.

### 6.1 „Die 19 Anker sind keine reinen Body Plans“

Sols erste Kritik: \`goblin_shaman\` ist eher eine magische Kampfrolle, \`aquatic\` ein Lebensraum, \`armored_beast\` eine defensive Spezialisierung. Anker enthalten nicht nur Statblock, sondern Reichweite, Schadensart, Temperament, Aliase und indirekte Lootmatrix. **Verifiziert** durch \`monsters.json\`. **Folge:** Ein neues System mit „19 anatomischen Körpertypen“ wäre von Beginn an eine falsche Interpretation der bestehenden Daten. Keine automatische Umbenennung aller Anker, solange keine konkreten Probleme gelöst werden.

### 6.2 Species bereits frei, aber Aliasauflösung eingeschränkt

\`creature.new\` kann \`species\` und \`desc\` frei ausdrücken; ein vorhandener Anker ist dennoch erforderlich. \`src/content.js:anchorFor\` durchsucht normierte **Aliaswörter**; das ist keine generative Ähnlichkeitsbewertung, auch wenn ein LLM „nächstpassend“ erzählen kann. \`src/v4/world.js\` verbessert bestimmte klare bekannte Aliasfehlzuordnungen bei Materialisierung.

**[BELEGT]** Wer \`Glassback Marsh Stalker\` kreiert, kann einen bestehenden Anchor plus feste Entity-Identität nutzen, ohne einen Eintrag \`glassback_marsh_stalker\` in einem globalen Species-Katalog. **Offen** bleibt, ob die konkret gewählte Kampfvorlage mechanisch zum sichtbaren Körperbau/Angriff passt; das ist eine Validierungs-/Konsistenzfrage.

### 6.3 Loot/Anatomie als unabhängig reproduzierter Fehler

Sols Kontrollfälle:

| Species | Anchor | Aus der aktuellen Beuteannahme ableitbar |
|---|---|---|
| Hase | \`deer\` | \`Hare Antler\` |
| Hirschkuh | \`deer\` | \`Doe Antler\` |
| Ziege | \`deer\` (sogar vorhandener Alias) | \`Goat Antler\` |

In \`src/v4/loot.js\` wählt die Lootfunktion die \`loot.anchors[anchorId]\`-Materialliste, prägt den **Speciesnamen** an die Materialien und prüft ein optionales \`only_if\`, **falls** es am Material gesetzt ist. Geweih besitzt die nötige Eigenschaftsprüfung derzeit nicht. \`aquatic\` mischt zudem verschiedene Tiere wie Fisch/Hai/Krokodil mit zu ähnlichen Materialannahmen. **Kritikpunkt:** Alias-Zuordnung allein beheben reicht nicht, wenn der nächste Anker andere falsche Körperteile liefert.

**Engster späterer Korrekturpfad:** Spezialmaterial nur dann zuschreiben, wenn bestätigter Art-/Körper-/Beschreibungshinweis vorliegt; bei Unsicherheit **lieber keine fragwürdige Spezialbeute** als ein nicht existierendes Organ. Beliebige LLM-Erzählung darf nicht heimlich bereits festgebuchten anatomischen Fakt überschreiben. Ein konservativer allgemeiner Ertrag bleibt denkbar.

### 6.4 Sapienz wird im generischen Kampfprofil hart verworfen

\`src/combat.js:creatureCombatant()\` setzt aktuell im \`fixed\`-Snapshot ausdrücklich \`sapient: false\`; bei echten Charakterbogen-NPCs \`characterCombatant()\` dagegen \`true\`. Die Art „intelligenter Goblin“ kann in Gesprächen handeln, aber im generischen Kampfpfad nicht mit denselben Sapienz-Entscheidungen gerechnet werden.

**[BELEGT]** Das ist ein eigener Befund, **nicht** durch einen neuen Species-Katalog behoben. **Option**: eine validierte, nachweisbare individuelle Sapienz-Angabe bei mechanischer Materialisierung – ohne automatisch intelligente Monster als „Menschenklasse“ zu kodieren. **Risiko:** Willkürlich erfundene Intelligenz/Attitude würde NPC-Angriffe, Flucht und Diplomatie ändern; eine neue Variable braucht einen echten Consumer und verlässliche Autorisierung.

### 6.5 Temperament ist im maßgeblichen C-Combat-Pfad kein KI-Treiber

\`npcDecide(ctx,npcId)\` setzt \`temper = ctx.c ? null : ...\`. Der C-Pfad orientiert sich stärker an Lage, Initiative, Reichweite, belegter Feindseligkeit und verarbeiteten \`intent\`-Hinweisen. Schöne neue Labels wie \`timid\`, \`territorial\`, \`cunning\` ohne Anbindung ändern dessen Entscheidungen **nicht**. **[BELEGT]** Im aktuellen Code. Ein neues Temperament-Wörterbuch wäre deshalb **keine** funktionierende Verhaltenskorrektur.

**Differenzierung zu Teil C:** Eine scheue Spezies darf außerhalb eines Encounters glaubwürdig weglaufen. Im **laufenden C-Kampf** benötigt echtes Flee/Retreat aber den tatsächlichen Intent-/KI-Pfad; das verlorene Signal kann erklären, warum aus einer beschriebenen Jagd endloses Band-Nachrücken wird. **Noch kein Beweis für genau den Hasenfall** ohne sein Originaleventlog.

### 6.6 Effektname und tatsächlich berechneter Monsterangriff

Der generische Angriff hat Attack-Power, Schadensart und Reichweite. \`Sting\` bedeutet **nicht automatisch Poison DoT**, \`Corroding Touch\` kein Korrosionssystem, \`spirit\` nicht automatisch körperlos, \`raptor\` nicht automatisch dreidimensionale Flughöhe oder Flugreichweite. Rank, Level, Elite und Boss skalieren zunächst Zahlen, nicht Organe, Utility und Spezialangriffsketten.

**Konsequenz:** Monster-Beschreibung darf kreative Farbgebung sein; **wo Spielerentscheidungen vom Versprechen abhängen**, müssen Skills/Status/Flug/Resistenzen in vorhandenen ausführbaren Mechaniken vorkommen oder der Narrator darf diese Fähigkeiten **nicht als angewendet** verbuchen. Wenn bestehende Skill-/Effekt-Primitiven reichen, diese verwenden. Kein „jeder giftige Pfeil bekommt automatisch eine neue volle Statusengine“.

### 6.7 Sols Abgrenzung zu Kampfsimulation und alten Loredaten

Sols Review hat die **60.700 Kämpfe nicht unabhängig neu gerechnet**. Seine Analyse der PC-vs.-NPC-Asymmetrie steht daher neben, nicht als Bestätigung jeder Quote. Er hat außerdem **keine komplette historische Löschungsspur** aller alten Rassen-/Species-Dateien geführt; er fand keinen belegten früheren verpflichtenden Artkatalog. Eine verlorene vollständige Artenliste oder neue Fantasy-Rassen lässt sich daher nicht aus der aktuellen Code-/Lore-Diskrepanz behaupten.

---

## 7. Zusammenführung ChatGPT ↔ Sol: Übereinstimmungen, Korrekturen, echte offene Fragen

| Thema | Mein erster Audit | Sols Gegenreview | Gemeinsame derzeitige Wertung |
|---|---|---|---|
| „19 Anker“ | Richtigerweise kein fertiger Artenkatalog, aber als „Körperbau-Vorlagen“ zu eng beschrieben | Heterogene Mischung aus Art, Rolle, Lebensraum, Defense, Level-/Angriffsprofil | **Sols Präzisierung akzeptiert.** Vorhandene Datennutzung ist maßgeblich |
| Lore der Monsterreiche | Große intelligente Monsterreiche ohne ausgearbeitete Speziesliste | Das ist generative Weltgestaltung, kein technischer Beweis für einen Species-Layer | **Weder fehlendes Volk noch Bug per se** |
| Hasengeweih | Konkreter, aus Livetest abgeleiteter Loot-/Anatomiefehler | Code-Repro auch für Doe/Goat + \`only_if\`-Mechanik | **Bestätigte priorisierbare Content-/Loot-Schwäche** |
| „Spezies-Schicht“ | Als denkbarer Lösungsansatz beschrieben | Vollständige verpflichtende Datenbank unbelegt/zu aufwendig | **Nicht freigeben**; freie \`species\` existiert bereits |
| Sapienz | Lore/Menschen-vs.-Monster-Gesellschaft betont | Genaues \`sapient:false\` im Creature-Snapshot gefunden | **Eigenständige Integrationslücke**, später separat entscheiden |
| Monsterverhalten | Artenökologie, scheue Räuber/Prädatoren | Temperament im C-Pfad ignoriert; konkrete Intents wichtiger | **Verknüpfung mit Teil C**, keine nutzlosen Taglisten |
| Magische/biologische Special Effects | Fehlende individuelle Monsteridentität beklagt | Namen nicht mit ausführbaren Effekten verwechseln | **Mechanische Zusagen einzeln priorisieren**, keine zweite DSL |
| Simulationsquoten | 60.700 Kämpfe und Auffälligkeiten berichtet | Nicht unabhängig wiederholt; zusätzlich PC/NPC-Asymmetrie | **Hypothesen für kontrollierte B-Messung**, keine Klassen-Nerfs |
| Neue klassische Fantasy-Rassen | Historisch kein vollständiger Katalog belegt | Keine fremde Rassenliste nachgewiesen | **Nutzer-Kanon ist ausschlaggebend:** bewusst keine Einführung |

### 7.1 Die vier Designpfade (bewusst noch nicht freigegeben)

| Option | Kern | Plus | Kosten / Fallstrick | jetziger Status |
|---|---|---|---|---|
| **M-A: vollständiger Species-Katalog** | Für jede Art fester Profil-/Loot-/Kulturdatensatz | Große Konsistenz für häufige ikonische Arten | Riesige Pflege, LLM-Freiheit enger, doppelte Zustandswahrheit, unbrauchbar für unbegrenzte Einmalarten | **Nicht empfohlen** als Standard |
| **M-B: Anker stark reduzieren** | Wenige universelle Körper-/Kampfklassen | Formal kleinere Content-Matrix | Problem der falschen Organe bleibt, mehr Gegner wirken gleich, Bestandsquests/Dungeons anfassen | **Nicht voreilig** |
| **M-C: schlanker Hybrid** | Existierende Anker, freie Species, wenige bestätigte optionale Eigenschaften an konkreten Consumers, optionale Wiederverwendung zentraler Arten | Skalierbar und anpassbar; Kultur/Lore frei, Mechanik eindeutig | Tags ohne Verbraucher bringen nichts; Validator/Replay/Sync erforderlich | **EMPFOHLENE LANGFRISTRICHTUNG, NICHT FREIGEGEBEN** |
| **M-D: Minimalfix** | Geweih/ähnliche Sonderbeute nur bei konkreter anatomischer Evidenz, bekannte Aliasfehlzuordnung, sonst Anker/Balancing belassen | Beseitigt reale Fehler ohne Rechen-/Balance-Umbau | Deckt Sapienz, Gift, Flug und Combat-Rollen nicht ab | **BEVORZUGTER ERSTER SPÄTERER FIX, NICHT FREIGEGEBEN** |

**Aktueller Vorschlag:** D zuerst **nach Freigabe**, C nur in wirklichen Spielbedarfspfaden als spätere Option; A/B nicht als reflexhaften großen Redesign-Patch anfangen. Der Nutzer will **zunächst weitere Tests**. Deshalb ist selbst D derzeit ein **registrierter Fixkandidat**, kein Sofortauftrag.

### 7.2 Konkrete Beispielabbildung ohne vollständige Artentabelle

| Wesen | Welt-/Identitätsseite | Kampf | Loot / Sonderfähigkeit |
|---|---|---|---|
| **Hase** | \`hare\`, scheues normales Beutetier; nicht humanoid | Grober Tieranker, Level/Rang wie heutiges System | Fell/harmloser Ertrag, **kein Geweih**; keine neue globale Species-ID nötig |
| **Hirschkuh/Ziege** | Eigenständiger freier Artname, bekannte Ökologie | \`deer\`-Werte können zunächst genügen | Kein Geweih ohne belegte Anatomie; kein pauschaler \`deer\`-Drop |
| **Wolf** | \`wolf\`, Rudel/territoriale Situation durch Szene und Worldstate | Bestehender \`wolf\`-Anchor | Passende natürliche Beute; Flee/Attack aus Situation/Intent, nicht bloß temperament-Label |
| **Goblin / Schamane** | Monster, evtl. intelligent, sozial, ausgerüstet, in einer Monsterkultur | \`goblin\` oder \`goblin_shaman\`; Sapienz/Ausrüstung nur bei bestätigter mechanischer Zuordnung | Wirkliche geführte Waffe/Spruch sollten Kampf-/Loot-Records entsprechen |
| **Drakonisches Wesen** | Freie drakonische Linie im Ashen Scale Dominion, **kein** neues klassisches Spielervolk | Vorhandener Ansatz bei passender Tier-/Panzerbasis | Echte Flug-/Atemwirkung benötigt ausführbare, begrenzte Mechanik, keine Prosa-Gratis-Fähigkeit |
| **Waldgeist** | Freier Spirit mit Ort/Pakt/Lore, ggf. intelligenter Bewohner des Verdant Fang Court | \`spirit\`-Anchor plus bestätigte Extra-Mechanik falls nötig | Nicht automatisch körperlos/unverwundbar; nur gebuchte Fähigkeiten gelten |
| **Einmaliges generatives Monster** | Individuelle feste Beschreibung + vorhandenes ID/Profil | nächstpassender verfügbarer Anchor | Keine globale Pflichtregistrierung; Spezialfähigkeit nur bei tatsächlicher Engineunterstützung |

### 7.3 Offene Nutzerentscheidungen, nicht künstlich vorentscheiden

- **Anatomie-/Beutegrenze:** Bei unbekanntem Körperbau nur allgemeines konservatives Material oder komplett kein Spezialloot? Wann darf Beschreibung eine feste Anatomie-Eigenschaft begründen? Wie alte Savegames behandeln?
- **Sapienz:** Mechanisch getrennt von Creature-Zahlen führen, und woran ist die Einstufung verlässlich zu erkennen? Keine pauschal freundlichen/feindlichen intelligenten Monster.
- **Ausrüstung/Loot:** Verliert ein humanoides Monster nur tatsächlich geführte Waffen? Generisches Zufallsloot darf keinen nie besessenen Zweihänder behaupten.
- **Sonderfähigkeiten:** Welche **erste reale** Fähigkeit rechtfertigt zusätzlichen Engineeffekt – Gift, ein echter Feueratem, Flug, Resistenz oder etwas anderes? Möglichst bestehendes Skill-/Statusmodell.
- **Wiederkehrende Arten:** Wann eine generierte individuelle Eigenschaft konsistent wiederverwenden (wiederkehrende Kampagnenarten), ohne bei jeder Einmalsichtung globalen Content anzulegen?
- **Flucht/Verfolgung:** Kann die gerade vorhandene Flee/Chase-Mechanik mit den neuen Monster-Intent-Signalen funktionieren, bevor man Anker-/Bewegungssystem neu schneidet?

---

## 8. C – Verfolgung, Flucht, Rückzug: ausführlicher DESIGN-FIX-KANDIDAT

**Status:** **DESIGN-FIX IN DIE LANGFRISTIGE 10B-LISTE AUFGENOMMEN**, **noch kein Implementierungsauftrag**. Der Nutzer möchte **zuerst weitere freie Livetests**. „Design-Fix“ bezeichnet hier eine bewusst anzustrebende Verbesserung des Spielgefühls, **nicht** einen bereits implementierten oder zahlenmäßig beschlossenen Bewegungspatch.

### 8.1 Reale Spielerwirkung und ursprünglicher Anlass

Im erfolgreichen .57-Fixture-/Abnahmelauf war das Nachsetzen gegen einen **fliehenden Hasen** unnötig lang; eine weitere **Fuchsjagd** wurde ähnlich unangenehm berichtet. Wiederholtes „näher herangehen → Tier vergrößert Distanz → wieder näher herangehen“ erzeugt **Spielerfriktion ohne neue Entscheidung**. Der Wunsch ist nicht, dass jeder Hase gefangen werden muss. Er darf eindeutig entkommen; ein schneller Rogue soll eventuell besser jagen können als ein schwerer Warrior, und ein Mage mit Fernkampfmöglichkeit darf anders spielen. Der Spieler sollte aber nicht zehnmal denselben mechanisch nahezu identischen Befehl senden müssen, nur um einen abzusehenden Ausgang zu erfahren.

**Evidenzqualität:** Beobachtung/Designfeedback aus früherer ZIP-Auswertung; **vollständiger turn- und eventgenauer separater Hasen-/Fuchs-Codepfad ist in dieser 10B-Datei noch nicht als isoliertes Replay beigefügt**. Daher bei Umsetzung erst das konkrete damalige Originalereignis gegen den heutigen Code nachstellen. Die nachfolgenden Codefakten sind präziser als die damalige bloße Vermutung „es gibt kein Chase-System“.

### 8.2 Was der aktuelle Code wirklich schon besitzt – von ChatGPT an Dev-HEAD verifiziert

**\`src/combat.js\` im C-Pfad \`ctx.c\`:**

1. **Range Bands:** Zielrelativer Abstand, \`ENGAGED\`, \`SHORT\`, \`MEDIUM\`, \`LONG\`. \`moveAction\`/ \`repositionPc\` verschieben normal jeweils **einen** Band-Schritt; NPC von \`LONG\` weiter \`away\` kann den Encounter verlassen.
2. **\`npcDecide\`:** Bei \`ctx.c\` wird \`temperament\` **auf \`null\` gesetzt**. Ohne explizit verarbeiteten NPC-\`intent\` schließt ein Gegner außerhalb seiner Reichweite eher zum Angriff auf; per Intent \`flee\` oder \`retreat\` kann er ausweichen. **Ein narrativ „scheues Tier“ ist nicht automatisch ein mechanisch fliehendes Tier.** Die weiter unten vorhandenen skittish-Temperamentregeln laufen im C-Pfad nur eingeschränkt/nicht als normaler KI-Zweig durch.
3. **\`fleeing(enc,id)\`:** Unterscheidet eine tatsächlich als \`fleeing:true\` gebuchte **Flucht** von bloßem \`retreat\`. Nur als Flee erfasste Ziele können direkt die spezielle Chase-Verzweigung erreichen.
4. **\`runCombat\`:** \`act.kind='move'\`, \`act.dir='closer'\`, \`act.target\` bezeichnet **genau einen bereits fliehenden Gegner** → \`chase(ctx,id)\`; sonst normale Ein-Band-Bewegung.
5. **\`chase()\`:** Es gibt **bereits eine einmalige Entscheidung**, nicht zwingend Band-für-Band-Jagd: \`escapeRoll\` entscheidet, ob der fliehende NPC entkommt (aus Reichweite, Encounter beendet) **oder** auf \`ENGAGED\` eingefangen und mit \`caught:true\` an weiterer Flucht im gleichen Kampf gehindert wird.
6. **\`pcFlee()\`:** Wenn **kein** Feind ENGAGED ist, kann PC unmittelbar entkommen; bei Nahkampfbindung entscheidet eine einmalige \`escapeRoll\`. Kein neuer eigener Chase-Simulator erforderlich, bevor dieser Pfad auf Erreichbarkeit und Fairness geprüft ist.
7. **\`escapeRoll()\`:** Aktuelle Formel als technische Ist-Dokumentation: \`chance = clamp(50 + 5*(init_runner - max(init_pursuers)) - 10*(number_pursuers - 1), 15, 85)\`, dann d100. **Keine Freigabe dieser Zahlen als perfekte 10B-Balance.** Es ist entscheidend, für wen \`ok\` gilt: Bei \`chase\` bedeutet erfolgreicher \`escapeRoll\` des *gejagten* NPC **Entkommen**, andernfalls \`caught\`; das darf im UI nicht irreführend als PC-Fluchterfolg gelesen werden.
8. **Verfolgung und normale Bewegung sind nicht identisch:** \`move closer\` ohne das passende Ziel, ohne \`fleeing\` oder nach einem nur erzählten Zurückweichen erreicht die One-Roll-Chase-Route eventuell **nicht**. Genau dieser Übergang ist ein wichtiger Prüfpunkt.

**Codeverweise:** [\`src/combat.js\` auf Dev-Commit \`fd20d0d\`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/combat.js), insbesondere \`repositionPc\`, \`moveAction\`, \`npcDecide\`, \`fleeing\`, \`escapeRoll\`, \`pcFlee\`, \`chase\`, \`runCombat\`.

**Kritische neue Erkenntnis:** Den ursprünglichen C-Entwurf „kurze Verfolgung als Probe neu entwickeln“ als **bereits teilweise implementiert** markieren. **Nicht** eine zweite Chase-Engine bauen, sondern herausfinden, ob die normale natürliche Sprache und die NPC-Fluchtabsicht den vorhandenen Pfad tatsächlich nutzen.

### 8.3 Zu prüfende Ursachekette der wiederholten Jagd

**H1 – Intentverlust auf der NPC-Seite:** Das LLM beschreibt „Hase flieht“, aber kein eindeutiger, von \`npcDecide\` berücksichtigter \`flee\`-Intent wird gebucht. Die Engine setzt \`retreat\`, \`hold\`, \`close_and_attack\` oder reine Distanz an. **Nicht bestätigt**, bis Eventlog nachgewiesen.

**H2 – unpräziser Spielerbefehl:** Der Spieler sagt „ich gehe hinterher“ oder „ich nähere mich“, der Planner liefert \`move closer\` ohne gültiges \`act.target\`/nicht fliehenden Zielstatus. Die Engine macht regelgerecht nur einen Band-Schritt, obwohl der Spieler faktisch „ich verfolge das Tier“ meint. Die natürliche Sprache muss sinnvoll zwischen Positionieren und längerer Verfolgung unterscheiden – **ohne** jedem Näherrücken automatisch einen Chase-Wurf anzuhängen.

**H3 – Reichweiten-/Abstandsgrenzen:** Wenn NPC und PC abwechselnd einen Band-Schritt machen, keine neue Terrain-/Ausdauer-/Distanzentscheidung entsteht und \`fleeing\` nie wahr wird, setzt sich die Schleife fort. Auch an LONG muss ein plausibles Entkommen/Abbruch möglich sein.

**H4 – LLM-Handlungs- und Zeitbild:** Der Erzähler kündigt Weglaufen an, aber der Engine-Snapshot sagt \`retreat\`, \`hold\` oder anderes. Fehlinterpretation durch Testspieler/HUD statt fehlende Mechanik. UI muss den tatsächlich gebuchten Zustand/Folgeoptionen klar vermitteln.

**H5 – NPC-Sapienz/Temperament:** Generische Kreaturen tragen \`sapient:false\`, und \`temperament\` wird im C-Pfad nicht normal angewendet. Eine pauschale Änderung könnte aber auch aggressive Wildtiere, Dungeons und Gruppenbegegnungen unabsichtlich schwächen. **Nur zielgerichtet** mit negativen Gegenfällen testen.

**H6 – faire Klassenmittel:** Mage-Fernkampfreichweite, Rogue-Bewegung, Warrior-Position und Blink beeinflussen, ob ein Spieler jagen, warten, schießen oder abbrechen kann. Kein universeller „einfach alle fliehenden Ziele gratis treffen“-Fix.

### 8.4 Lösungen in aufsteigender Eingriffstiefe

**C0 – Keine neue Mechanik, nur korrekte Routen erreichen (bevorzugter Prüfpfad):**
- Narrator-/Extractor-Intent \`flee\` vs. \`retreat\` korrekt und einmalig festhalten, Engine-State entscheidet.
- Eindeutig natürliche Spielerabsicht „ich **jage/verfolge** genau dieses bereits fliehende Tier“ im Planner auf bestehendes zielgebundenes \`move closer\` / \`chase\` abbilden; kein generischer \`go\`-Teleport, keine neuen Befehle.
- Aus dem One-Roll-Resultat **klare** Narration: Tier ist **weg** oder **eingeholt**. Spieler muss danach nicht mit \`move closer\` denselben verlorenen Gegner wieder fangen.
- Wiederholte Bänderbewegung bei schlichtem Positionieren bleibt zulässig, aber ohne versteckten Flee-Status.

**C1 – Enger Feinschliff an Fluchtpolitik/Outcome:** Falls C0 zu wenig ist: Nach glaubhafter Flucht von LONG oder konkreter Szenengefahr den Encounter konsistent als escaped beenden, oder festhalten, warum der Gegner am Ort verbleibt. Nur den tatsächlich fehlerhaften Tier-/NPC-Pfad berühren, keine neuen allgemeingültigen statischen „scheu = immer weglaufen“-Zwangsregeln.

**C2 – Optionale kurze längerfristige Chase-Probe:** Nur wenn echte Szenarien trotz C0/C1 mehrere bedeutungsvolle Hindernisse/Entscheidungen erfordern (z. B. fliehender Dieb durch mehrere Straßen, Nebel/Terrain, Verzweigung), vielleicht begrenzte wiederholte Proben. Das ist **weiter entfernt** und wäre **ein neues Feature**, keine automatische 10B-Pflicht.

**C3 – Gesamte Bewegungs-/Speed-Rebalance:** Freiere Bewegung+Attack, mehrere Bands, AGI/STA/Speed, geänderte Flee-Odds, Blink-Sonderreichweite. Das würde Kampfbalance stark beeinflussen, insbesondere Rogue/Warrior/Mage. Nur nach Simulator- und echten Spielerbelegen. Nicht Teil einer kleinen Chase-Korrektur.

### 8.5 Verbindliches gewünschtes Gameplay-Ergebnis (Designrichtung, noch keine Codefreigabe)

- Ein fliehendes schwaches Wildtier darf entkommen; die Engine sagt **zeitnah und eindeutig**, dass es weg ist, statt endlose gratis Wegpunkte zu produzieren.
- Ein berechtigter Jäger kann einmal sinnvoll versuchen aufzuholen; Regeln/Terrain/Geschwindigkeit dürfen scheitern lassen.
- Eine Jagd braucht nur **so viele Spielerinputs wie neue Entscheidungen** auftreten – nicht einen pro Range Band ohne neue Lage.
- \`flee\`, \`retreat\`, \`reposition\`, \`chase\` und \`move\` behalten unterscheidbare Kosten und Ergebnisse.
- Entkommene Gegner werden **nicht** automatisch als erschlagen, erbeutet, gecleart oder für Quests angerechnet.
- Es gibt keine automatische PC-Übernahme durch Narrator, keine garantierten Treffer nach Flucht, keine Gratis-Mehrfachaktionen.
- Bestehende Systemflucht des PCs ist ebenfalls fair, nicht trivial garantiert und nicht durch bloße Wortwahl blockiert.
- Combat-Records, SAVE/LOAD, Replay und klare HUD-Wahrheit stimmen mit der Szene überein.

### 8.6 Gezielte spätere Regressionen / Messmatrix

| Fall | Erwartung / Beobachtung |
|---|---|
| Z1: Hase wird im Feld überrascht, flieht **eindeutig** mit mechanischem \`flee\` | \`fleeing\` entsteht oder die Flucht endet direkt in \`escaped\`; kein Phantom-Enemy |
| Z2: Spieler schreibt „Ich verfolge den fliehenden Hasen“ | genau ein legitimer \`chase\`-Pfad oder bewusst begründete Ablehnung |
| Z3: Spieler schreibt nur „Ich gehe einen Schritt näher“ | normale Bewegung statt unbeabsichtigte Zwangs-Jagd |
| Z4: Einmalige Chase-Probe gelingt dem Jäger | zielgerichteter \`caught\`-State/ENGAGED, nicht sofort erneut weg |
| Z5: Einmalige Chase-Probe gelingt dem Flüchtenden | \`escaped\`, aus Encounter entfernt, kein Kill/Loot/XP/Cull |
| Z6: Fuchs weicht nur defensiv zurück (\`retreat\`, nicht Flee) | nicht fälschlich \`caught\` wie bei beendeter Flucht |
| Z7: Nahkämpfer vs. fliehender schneller Gegner | Chance/Kosten fair; keine garantierte Eroberung |
| Z8: Mage auf Distanz | legitime ranged attack/Skill, Kosten und Reichweite eingehalten |
| Z9: Rogue mit Mobilität und langsamer Warrior | keine unabsichtlichen unendlichen Manöver; Taktikdifferenz messbar |
| Z10: aggressiver Eber bleibt und kämpft | nicht wegen allgemeinem \`temperament\`-Fix plötzlich überall scheu |
| Z11: sapienter Dieb/Feind flieht nach Verletzung | nach explizitem Intent, Beziehung und Lage nachvollziehbar |
| Z12: PC versucht berechtigte Flucht aus ENGAGED vs. LONG | \`pcFlee\`-Randfälle und Min/Max-Odds, kein kostenloser Doppelzug |
| Z13: erneut geladener Encounter | \`fleeing\`, \`caught\`, \`escaped\` konsistent und deterministic im Fold |
| Z14: Gruppenflucht bzw. mehr als ein Bedränger | kein versehentlicher automatischer Sieg oder doppelte Flucht-Buchung |

**Metriken:** Anzahl Spielerzüge pro Jagd, tatsächlich neue Entscheidungen, Entkommen/Einfangen, Range-State-Wechsel, NPC-Intent-Häufigkeit, typisierte Action-Records, nachlaufende verwaiste Gegner, Loot-/Quest-Fehlgutschriften. Mit **echten** Replay-Inputs beginnen, nicht dem Narrator frei erfundene Wegstrecken als Engine-Tatsachen unterschieben.

---

## 9. Andere 10B-Prioritäten – vollständige, aber noch nicht freigegebene Fachbereiche

### 9.1 Leveln, XP, Farmen, Wirtschaft, Drops

Ausgangspunkt: Levelschwelle \`Level × 100 XP\`, existierende XP- und Gegnerstärkeregeln. Im alten 10B-Plan sind **12 / 18 / 20** Gegner-XP-Vergleiche als **zu prüfende Varianten**, nicht beschlossene Endwerte; Elite ×1,5 und Boss ×2,5 als Modellannahmen. Questbelohnungen, wilde Monsterjagd, Dungeon, Shop, Gear und Fähigkeitstraining gemeinsam betrachten. Kein wiederholtes Töten durch automatisches diminishing XP entwerten. Schwierigkeit hängt vom Gebiet/Rang/Gegner ab, nicht verstecktem PC-Level-Scaling.

**Echtes Preisbeispiel für später:** F-Rang-Skill-Stones wurden im älteren .48-Livetest für **30/40/50/60/80 cp** angeboten, gespeicherter Richtwert **400 cp**. Kauf wurde trotz Preis-Audit erlaubt. Das ist **keine** unrechtmäßige Transaktion oder 9C-Bug, sondern später zu entscheidende Balancing-/Preisautoritätsfrage. Varianten: besserer Narrator-Preisanker, wirklich Engine-owned Preisvalidierung oder begründete Grenzen. Nicht jetzt alle Händlerpreise hart sperren.

**Automatische Beute** bleibt QoL-Prinzip; besondere anatomische Beute muss hingegen plausibel sein und nur von tatsächlich besiegten, nicht geflohenen Monstern kommen. Waffenloot bei humanoiden Monstern muss mit Kampf-/Equipment-Records vereinbar sein.

### 9.2 LLM/Provider/Performance und robuste Laufzeit

Run 2 belegt die Gefahr „Reasoning verbraucht Ausgabe vollständig“. Run 1 belegt gefährliche Narrator-/Extractor-Wahrheitsbrüche trotz \`integrity: OK\`. Getrennte Messung von **Planner, Board, Narrator, Extractor, Forge, Systempanelen**, Tokenlängen, sichtbarem Text vs. Reasoning, Finishreason, Reparaturquoten, Caching und tatsächlicher Browser/Providerzeit. Nur ausreichend begründete Reparaturen, nie doppelte Engineaktionen durch Retries. Keine unbewiesene Zusammenlegung von 3→2 Modellcalls, kein neuer Groß-Memory-Layer allein für Speed.

**Langläufe:** Dauer und Speicherwachstum für 100/500/1000 Turns, Event-Fold, Reload, Swipe, Regenerate/Edit/Delete, Quest-/NPC-/Location-Zustand. API-Keys bleiben in lokalem PowerShell/Environment; nicht in Logs/Git.

### 9.3 Spielergefühl, UI, Sandbox

Kein neues 10A-HUD als Eigenpatch. Sichtbarkeit nichtoffensiver Skills, kontextuell richtige Defense/Utility, lesbare kurze Engine-Nachrichten, Quests, Dungeons, Geld, Reisen und Schlaf **spielen** statt bloß automatisiert rechnen. Guild-Authority und Narrator/Engine-Truth aus beiden Runs gehört vor rein kosmetisches CSS. Eigene Klasse/Skills/Passives/P5/Feats nur durch tatsächlich gebuchte und replayfähige Entwicklung; keine freien Narrrator-Upgrades.

**Blink – getrennte 10B-Entscheidung:** \`mage.blink\` kostet aktuell **8 MP**, verschiebt **ein** Range Band und verbraucht die Hauptaktion. Ein späterer 2–3-Band-Buff ist erwägenswert, **nicht beschlossen**. Mit Flee/Chase-/Gear-/Mage-Effekt und Simulationsbalance testen; nicht im Chase-Minifix nebenbei buffen.

### 9.4 100-Züge-Horizont als Qualitätsziel, nicht als Game-Over-Verbot

Sterben darf passieren, wenn der Spieler berechtigt ein Risiko eingeht. Ein 26-Züge-Tod beweist allein keine zu harten Banditen. Der spezifische Run-1-Fehler ist die **ungefragte Eskalation der Verhandlung**; diese Agency-Frage darf man nicht durch wahlloses HP-Senken kaschieren. Ein leerer Modelltext wie in Run 2 ist ein **technischer** Abbruch; je mehr echte Long-Runs wir archivieren, desto leichter werden Ursache und Häufigkeit greifbar.

---

## 10. Konsolidierte Problem-/Designmatrix (startklar für viele weitere Runs)

| ID | Kategorie | Nachweis 24.10. | Gewicht | Möglicher späterer Lösungsraum | Freigabe |
|---|---|---|---|---|---|
| **10B-T01** | Agency / Bedrohung vs. Angriff | Run 1 fünf pending + Schaden vor PC-Entscheidung | P0 bei Fixplanung | Extractor-Combat-Gate, aktive Gewalt vs. Drohung unterscheiden; echten First Strike erlauben | **OFFEN** |
| **10B-T02** | Narrator-Verfügbarkeit | Run 2 8.192 Tokens, 0 Text | P0 Teststabilität | Provider-Promptbudget/Reasoning prüfen; maximal begrenztes sicheres Empty-Recovery | **OFFEN** |
| **10B-T03** | Narrator- und Memory-Truth | Run 1 erfundene 2.+3. Arcane Bolts → falscher Fact | P1 | Kampfaktionenzählung aus Engine-Records, Memory-Quellen prüfen | **OFFEN** |
| **10B-T04** | Guild-Authority | Run 2 zwei Phantomjobs, zweimal \`no such contract\` | P1 | Offizielle Listings nur aus Board-/Quest-State, private Jobs weiter frei | **OFFEN** |
| **10B-T05** | Zeit-/Reise-Konsistenz | Run 2 Abend trotz 08:33; Run 1 Phantom-Kutschbock-Ort | P1 | GO-/Zeit-Verträge, Story an bestätigten Zustand binden, keine Reise-Minutenzügepflicht | **OFFEN** |
| **10B-T06** | Ausrüstung / Kampfdarstellung | Run 1 vier erzählte Bogenschützen, vorwiegend Nahkampf-Sheets | P1 | Materialisierung/Role-Weapon-Reach-Konsistenz | **OFFEN** |
| **10B-T07** | Private Quest-Lifecycle | Run 2 +1 cp, Quest aktiv | P1/P2 **Hypothese** | Objectives-/Bestätigung und private Completion prüfen | **OFFEN** |
| **10B-T08** | LLM-/Extractor-Verträge | Run 2 Extractor failed, Fact \`x=x\`; 17 Player-JSON-Reparaturen | P2 | atomare Validierung, Dummy-Fact-Filter, JSON-Ausgabevertrag | **OFFEN** |
| **10B-T09** | NPC/Location/Pacing | Run 2 \`no_go\` im begleiteten Innenraum, „Present“ leer | P2 | begrenzte Escort-Location-Regel oder ehrliche UI-Semantik | **OFFEN** |
| **10B-M01** | Loot/Anatomie | Hare/Doe/Goat Antler reproduzierbar | deutlich / lokaler echter Bug | **D:** Spezialbeute nur bei bestätigtem Körpermerkmal; keine globale Species-Tabelle | **OFFEN** |
| **10B-M02** | Monster-Sapienz | \`creatureCombatant: sapient:false\` | Architekturdefizit | nur belegte individuelle Sapienz über vorhandenen State/Consumer | **OFFEN** |
| **10B-M03** | Monster-Specials | Gift/Flug/Korrosion nur Prosa/Angriffslables | Designlücke bei relevanten Fällen | bestehende typisierte Skill-/Effekt-Primitive punktuell wiederverwenden | **OFFEN** |
| **10B-M04** | Monsterloot tatsächliche Waffen | optionales humanoides Gear ohne echten Combat-Gear-Nachweis | **nachprüfen** | Equipment/Dropbindung, kein Phantomitem | **OFFEN** |
| **10B-C01** | Chase-FeeI / repetitives Nachsetzen | Hasen-/Fuchsjagd, alter Livetest; One-Roll-Code vorhanden | **DESIGN-FIX-KANDIDAT** | erst vorhandenen \`fleeing\`/ \`chase\`-Pfad erreichbar machen, nicht zweite Engine | **ZURÜCKGESTELLT** |
| **10B-C02** | Rückzug/Flee-Fairness | bestehendes \`pcFlee\`, Chance 15–85; ältere FLEE-/Guard-Agency-Fälle | **prüfen** | Parser-/Intent-Priorität, faire Escapes und Klassenmittel | **ZURÜCKGESTELLT** |
| **10B-B01** | Kampfbalance | 218 Szenarien / 60.700 Simulationen, PC-NPC-Asymmetrie | Messhinweis | faire Paarungen, Range-/Kit-/Taktik-Kontrolle | **KEINE NUMERIK FREI** |
| **10B-B02** | Blink-Rangemodell | 8 MP, Hauptaktion, ein Band | bekannte Gameplayabwägung | 2/3 Bands vs. Flee und Klassenbalance testen | **OFFEN** |
| **10B-P01** | Loot/Shop/Skill-Stone-Ökonomie | .48 Richtwert 400 cp vs. Shop 30–80 | Preisbalance | Richtwerte vs. Engine-owned Angebotspreise | **OFFEN** |
| **10B-P02** | Langzeitstabilität | 0/2 natürliche Runs erreichen 100 Turns | Testziel | neue Tests, 500/1000 Stress später | **IN BEOBACHTUNG** |

**Status-Update-Regel:** Befund **nur** auf „bestätigt“ setzen, wenn reproduzierbarer Code/Eventpfad vorliegt. \`OFFEN\` ist nicht „vergessen“. Bei Auswertung weiterer Runs Spalte Nachweis/Gegenbeispiel ergänzen. Keine stillen Teileinträge zu Großdesigns umdeuten.

---

## 11. Noch ausstehende Design- und Releaseentscheidungen

**Jetzt keine Entscheidung erforderlich:** Nutzer setzt offene Tests fort. Das ist die aktuelle ausdrücklich gewählte Strategie.

Später zu entscheiden, nach Evidenz:

- Welche wiederholt beobachteten **Player-Agency- und Narrator-/Engine-Authority-Fehler** blockieren Weiterlaufen und brauchen zuerst kleine reproduzierte Fixes, bevor wir weitere Runs sammeln?
- Wie viel Provider- und Testspielerformat-Zuverlässigkeit muss eine 100-Turn-Runde praktisch besitzen; sicherer Narrator-Empty-Retry ja/nein unter Replay-Schutz?
- Monsteraudit **D** tatsächlich zuerst freigeben? Soll unklarer Spezialdrop unterdrückt, durch generischen Ertrag ersetzt oder mit enger \`only_if\`-Evidenzprüfung versehen werden?
- Welche Monsterfähigkeiten / Sapienzänderungen sind aus echtem Spiel nötig, statt „weil High Fantasy“ auf Vorrat?
- Ist beim Chase zuerst die **natürliche Parser-/Intent-Anbindung** schuld oder das tatsächliche One-Roll-Regeldesign? Nur den belegten Fehler fixen.
- Ab wann ist B methodisch ausreichend für **Klassen- und Monsterbalance**? Sols PC-vs.-NPC-Vergleiche nicht als endgültig spiegelgleich behandeln.
- Abschließendes XP-/Farm-/Stone-/Gear-Balancing, Blink, Spell-/Passive-Werte, Lootwert, Dungeonprogression und Perf erst mit ausreichendem Gameplaybeleg und ursprünglicher 53-Punkte-Prüfgrundlage entscheiden.

**Verbindlicher Handoff-Satz für neue Chats:** *„Patch 10B befindet sich in der Befundsammlung; die ausführliche lebende Hauptquelle ist \`06_PATCH10B_MASTERPLAN_UND_REVIEWS.md\`, die echten Einzellaufbelege liegen unverändert unter \`testrun_10b\`. Bitte nicht aus alten 03/04-Patchnotizen sofort neue Codeaufträge machen. Der Nutzer lässt vorerst freie Tests laufen; neue Design-, Monster- und Chase-Reviews dokumentieren, erst nach ausdrücklicher Freigabe implementieren.“*

---

## 12. Technische Quellen und datierte Reviews

**Git-Produktausgangspunkt:**
- [Simulator-Commit \`fd20d0d\`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fd20d0dce0b0fc508b17810872b7933a5f00e994).
- [Monsterdaten (\`monsters.json\`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/content/monsters.json).
- [Lootcode (\`src/v4/loot.js\`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/v4/loot.js).
- [Combat (\`src/combat.js\`)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/combat.js).
- [Content / Aliasresolution](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/content.js).
- [World-/Creature-Materialisierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/src/v4/world.js).
- [Aktuelles Lorebook v0.14](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/lorebook/Avereth_World_Lore_v0.14.json).
- [Simulator-Hinweise](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/fd20d0dce0b0fc508b17810872b7933a5f00e994/avereth-engine/tools/sim/README.md).

**Unabhängige Reviews:**
- ChatGPT: zuerst \`Avereth_10B_Lore_Monster_Audit_20261024.md\`, damals zusätzlich \`Avereth_10B_Befunde_und_Artenaudit_20261024.zip\` mit ersten Matrixdaten; Kernaussagen in §§5,7 vollständig als historische Position und nach Prüfung revidierte Empfehlung dokumentiert. Die ursprünglichen Artefakte waren Chat-Dateien, nicht automatisch schon Git-Quellen.
- Sol: Datei \`Chatgpt Feedback(8).md\`, am 24.10. vom Nutzer übermittelt; **in §§6–7 ausführlich und inhaltstreu dokumentiert**; Zahlen nicht eigenständig nachgerechnet und keine Freigabe für neue Species-Architektur erteilt.
- Ursprünglicher C-Entwurf / Nutzerfeedback: älterer erfolgreicher .57-9D-Lauf mit repetitiver Hasen-/Fuchsjagd; historische Varianten aus [Datei 04, §1a.2d](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), technischer aktueller Code-Gegencheck in §8.
- [Run 1 – REVIEW + ZIP](testrun_10b/20261024-030002Z-current_test/) und [Run 2 – REVIEW + ZIP](testrun_10b/20261024-033325Z-current_test/). Bei neuen Runs bleibt deren eigene vollständige Auswertung führend.

**Pflegevermerk:** Historisches nicht löschen, wenn es eine echte Entscheidung oder eine widerlegte Hypothese erklärt; dabei **klar den aktuellen Status darüberstellen**. Diese MD ist absichtlich ausführlich, die vier anderen Projekt-MDs sollen bei normalen 10B-Runs schlank bleiben.
