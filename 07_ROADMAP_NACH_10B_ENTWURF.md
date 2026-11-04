# Avereth Engine – Roadmap-Kandidaten nach 10B (Entwurf für GPT/Sol/Nutzer)

**Stand: 04.11.2026 · Dokumentstatus: DISKUSSIONSENTWURF / NICHT FREIGEGEBEN.**  
**Zweck:** Alle noch offenen, bisher wegen 10B zurückgestellten Themen auffindbar und in einer **von GPT vorgeschlagenen**, später gemeinsam zu bestätigenden Prioritätenliste sammeln. **Sol soll unabhängig gegenprüfen; der Nutzer entscheidet gemeinsam mit GPT/Sol über Reihenfolge, Umfang und Freigaben.**  
**Produktbasis bei Erstellung:** V4-C / Ruleset 2, Build **.154** ([2482da2](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2482da2cbbd13c0172edc1e9de33deafc838b9ba)). **main-Status:** [03_AKTUELLER_PROJEKTSTAND.md](03_AKTUELLER_PROJEKTSTAND.md), dort inzwischen Batch28/.154 dokumentiert. **Kein Patch, keine Änderung des Produktbranches und keine automatische 10B-Schließung.**

> **Leitfrage:** Wird Avereth eine glaubwürdige, über viele Spieltage fortbestehende Welt, in der Personen den Spieler kennen, Beziehungen eine Geschichte besitzen und Dinge auch ohne Questskript geschehen? Die bekannten Videospielmechaniken sind wichtig, aber nach dem aktuellen Nutzerfokus nachgeordnet. **NPC-Memory, spontane PULSE-Ereignisse und kausale Weltkontinuität stehen bewusst vorne.**

## 0. Gültigkeit, Auswahlprozess und Aufwandsskala

### 0.1 Was diese Roadmap ausdrücklich nicht tut

1. **10B bleibt zunächst offen.** Der technische Abschluss wird anhand der natürlichen Runs separat vom Nutzer entschieden; die neue Roadmap ist **Vorbereitung**, kein stiller Abschlussbeschluss. [10B-Maßstab](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#wann-10b-endet-und-wir-wieder-eine-roadmap-erstellen).
2. **Keine Implementierungsfreigabe.** Nicht einmal bereits ausgearbeitete Fachpläne wie Main/Minor oder Engine-Shops dürfen allein wegen ihrer Platzierung umgesetzt werden. Sols Gegenreview und Nutzerentscheidung zuerst.
3. **Kein Neustart der Engine.** Die bestehende Event-/Fold-/Replay- und Autoritätsarchitektur bleibt Grundlage; LLM für Erzählung, Sprache und kreative Vorschläge, Engine für bindende Mechanik. Bereits gelöste Probleme nicht als neue Features wieder aufrollen. [Kanon](02_DESIGN_KANON.md).
4. **Einordnung ist nicht Prioritätszwang.** Rangnummern sind die vorgeschlagene Arbeitsreihenfolge bei heutigem Kenntnisstand. Ein Vorhaben kann nach dem Spielertest entfallen, kleiner werden, aufgeteilt oder vorgezogen werden.
5. **Bestehende Detailpläne verlinken statt kopieren.** Die Formulierungen unten sind Ziele, Grenzen, Abhängigkeiten und grober Aufwand – keine fertigen Implementierungsspezifikationen.

### 0.2 Grobe Schätzung des technischen Umsetzungsaufwands

Die Werte sind **qualitative Größenordnungen für einen fachlich abgegrenzten Entwicklungsblock einschließlich Regressionen, Replay und erforderlicher ST-Abnahme**, **keine Stundenzusage** und **nicht** der Aufwand der vielen anschließenden menschlichen Spielstunden.

| Zeichen | Einordnung | Unverbindliche Arbeitsgröße | Charakter |
|---|---|---|---|
| **XS** | Untersuchung/Spieltest | Wenige Stunden bis einige Tage Analyse | Kann ohne Code erfolgen |
| **S** | Klein | Etwa 1–3 Entwicklerarbeitstage | Lokalisierte Anpassung, begrenzte Integrationsfläche |
| **M** | Mittel | Etwa 4–10 Entwicklerarbeitstage | Mehrere Module, gezielte End-to-End-Tests |
| **L** | Groß | Grob 2–5 Entwicklungswochen | Mehrere eng abgestimmte Patches und natürliche Abnahme |
| **XL** | Sehr groß | Mehr als etwa 5 Entwicklungswochen | Eigenständiger Entwicklungsabschnitt mit Designtests und Teilfreigaben |

**Hohe Unsicherheit:** Einzelne Module und aktuelle LLM-Probleme sind nicht neu kalkuliert. Aufwand hängt erheblich von tatsächlich gefundenen Lücken, Feature-Tiefe, gewünschter Content-Vielfalt und Integrationsregressionen ab. Ein Codepatch mit anschließendem menschlichem Langzeittest kann kalendarisch länger dauern. **Zusätzliche LLM-Aufrufe sind in einer Welt-/NPC-Engine nicht kostenlos**; Kosten und Latenz gehören in jede spätere Fachabnahme.

### 0.3 Gemeinsame Qualitätsbedingungen

Für jedes Feature: bestehende NPC-/Orts-/Objektidentitäten, Quellenwissen und Player-Agency respektieren; keine fremde NPC-Perspektive als Allwissen. Gültige World-/Kampf-/Geldzustände ausschließlich über Engine-Events; **Save/Reload, Edit, Swipe, Regenerate und Replay** stabil halten. Modellfehler begrenzt reparieren, aber keine unvalidierte freie Buchung; kein pauschales erhöhtes Retry- oder Tokenbudget. **Keine zusätzlichen Pflichtnachrichten** für belanglose Bewegung, Suche, Erholung, Handel oder NPC-Gespräch. Kreativität des Narrators schützen, statt die Welt vollständig in Tabellen oder eine skriptartige Questreihenfolge zu pressen.

## 1. Vorgelagerte Entscheidung: Stabilität und menschliche Testkampagne

**Nicht als Nummer 34 in den Featurestapel mischen.** Dies ist die Voraussetzung für eine sinnvolle Auswahl der ersten großen Patches.

- **10B-Entscheidung:** [Batch27/.153](testrun_10b/batch-20261103-103117Z/REVIEW.md) hatte einen Extractor-Runstopper; [Batch28/.154](testrun_10b/batch-20261103-171839Z/REVIEW.md) dokumentiert **keinen technischen Endabbruch** bei drei Profilen, jedoch nur einen längeren Warrior-Run sowie zwei kurze regelgerechte Tode und eine **lokale semantische Gegenstandsidentitätsabweichung**. .154 zeigt einen natürlichen erfolgreichen unknown-pricing-Repair; der neue Objekt-ID-Repair wurde dadurch nicht natürlich belegt. Damit ist Stabilität **besser**, aber kein vollständiger Endproduktnachweis. 10B erst nach gemeinsamer Bewertung formell schließen.
- **Konkreter technischer Restpunkt aus Batch28 – P2, nicht automatisch neuer 10B-Patch:** Bei autorisierter Rückkehr zu NPC Hessa kennt der Extractor ein früher abgegebenes PC-Hemd nicht im Katalog, erzeugt bei Reparaturrückgabe deshalb ein **neues** Objekt; das Original bleibt bei Hessa. Sols Originalgegenprobe zeigt, dass eine zielgerichtete Katalogreferenz die alte ID nutzbar machen kann, während World weiterhin Anwesenheit und Transfer prüfen muss. Bei späterer Freigabe **gezielt** als Referenz-/Identitätsfix behandeln, **kein** generelles Crafting-/Finanz-Refactoring. [Batch28 §3](testrun_10b/batch-20261103-171839Z/REVIEW.md). Falls die menschliche Kampagne früh Reparatur-/Verwahrungsübergaben testet, ist dieser Punkt vorab abzuwägen.
- **Menschlicher Langlauf als erstes Produkt-Experiment (W1 + T4):** Ein Charakter über mehrere Ingame-Tage, bevorzugt **5–10 Tage oder länger**, mit echter selbstgewählter Route. Nicht dem LLM-Runner dieselbe Guild-/Level-15-Mission nachspielen. Aufgezeichnete Situationen: Bekanntschaft schließen, etwas Persönliches erzählen, Versprechen/Gefallen, Wiederbesuch nach einigen Nachrichten, Orten und Tagen; gleiche Person begrüßt den Spieler, erkennt ihn korrekt und erinnert Wichtiges, ohne alles zwanghaft wiederholen zu müssen. Spielerinteresse, künstliche Leerlaufzüge und Weltgefühl festhalten. Testtage sind Orientierung, kein Pflichtkalender.
- **NPC-Memory getrennt diagnostizieren:** (1) Person wird **als dieselbe ID** wiedergefunden; (2) relevante Erlebnisse/Fakten sind **persistiert**; (3) sie werden **in den konkreten LLM-Kontext geladen**; (4) das Modell **nutzt** sie natürlich im Dialog. Nichtverwendung einer unwichtigen Episode ist allein kein Bug, Identitätsduplikat und unbegründetes Vergessen bedeutender Erlebnisse dagegen schon. Quellenwissen, Lügen, Geheimnisse und glaubhaftes menschliches Vergessen unterscheiden.
- **Messung:** Szenen- und NPC-Tagebuch mit wenigen klaren Beispielen und optionalen Originalexporten, nicht jedem Zug eine Testpflicht auferlegen. Bei ernstem Befund Quell-Record, vorhandene Fakten, Kontext und Erzählertext gemeinsam prüfen. [Memory-Vorarbeit](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3b-späterer-npc-memory--und-identitäts-langzeittest--vorgemerkt-nicht-aktuell-27102026), [Spielgefühl-Messung](recherche/AI_RPG_RECHERCHE_20261028.md#49-spielgefühl-messen).

## 2. Empfohlene Reihenfolge – Gesamtliste aller 33 offenen Themen

Die **Rangnummer ist eine Vorschlagsreihenfolge**, die **ID** ein dauerhaftes Kennzeichen aus der gemeinsamen Ideenauswahl. Aufwand umfasst, sofern nicht anders bezeichnet, **Umsetzung plus technische Tests**, nicht die anschließende offene Live-Spielzeit. Etappen dienen der Orientierung und sind **keine bereits beschlossenen Patchnummern**.

### Etappe A – NPC-Memory und soziale Kontinuität (01–04)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **01 · W1** | **NPC-Memory im menschlichen Langzeittest.** 5–10 Ingame-Tage, Freundschaften, wiederkehrende Gespräche, Versprechen, Wiedersehen. Persistenz, Retrieval und tatsächlich genutzte NPC-Erinnerung getrennt beurteilen. | **XS–S** (Test/Auswertung) | **Sofort sinnvoll, kein Featurepatch nötig**; Originalbelege statt voreilig neuer Dossierarchitektur. |
| **02 · T4** | **Menschliches Spielgefühl systematisch messen.** Wiederbegegnungen, NPC-Dialogvariation, Szenen-/Ortsvielfalt, Leerlauf, „unsichtbare Wände“, Spielspaß und soziale Natürlichkeit protokollieren; optionale Vergleichsszenen mit einem anderen KI-RPG. | **XS–S** | Zusammen mit W1; kein zusätzlicher permanenter Auswertungs-LLM nötig. [§4.9](recherche/AI_RPG_RECHERCHE_20261028.md#49-spielgefühl-messen). |
| **03 · W2** | **Vertieftes NPC-Gedächtnis nur bei belegter Lücke.** Wenige bedeutsame gemeinsame Episoden, Beziehungswandel, Versprechen, Verletzungen, Dankbarkeit und eventuelle wichtige NPC-Auswahl. Die vorhandene Facts/Memory/Knowledge-Schicht nutzen. | **L**, bei neuer Verdichtungsarchitektur **XL** | **Bedingt:** Wenn W1 bereits zuverlässig ist, zunächst **überspringen**. Keine zweite Dossierbank und kein „#NPC“ als schon existierenden Befehl darstellen. [Detailentwurf](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3b-späterer-npc-memory--und-identitäts-langzeittest--vorgemerkt-nicht-aktuell-27102026). |
| **04 · W3** | **Stabile Stadt-NPCs und Tagesroutinen.** Wiedererkennbare Wirte, Ladenpersonal, Wachen und Bürger mit dauerhafter Identität, typischen Orten und wenigen plausiblen Routinen statt neu erfundener Gegenstücke beim Wiederbesuch. | **M–L** | Zuerst gegen bereits vorhandene Identitäts-/Weltfunktionen prüfen; keine autonome Vollsimulation, keine erzwungenen täglichen NPC-Ticks. [K09 / NPC-Städte](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3a-konkrete-20-kandidaten--priorisierungsarchiv-keine-freigabe). |

### Etappe B – Spontane Welt und orts-/zeitabhängige Begegnungen (05–07)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **05 · W5** | **PULSE ENGINE – freie spontane Ereignisse.** Ohne formale Quest können Straßenstreit, arrogante Bürger, Wiederbegegnung, Gerüchte, zufällige Reisende, neutrale Entdeckung oder Bedrohung entstehen. Wahrscheinlichkeit, Sorte und Haltung orientieren sich an **Ort, Ingame-Zeit, Sicherheit, Aktivität, Population, Fraktionen und jüngsten Ereignissen**. Auch „es passiert nichts“ ist ein gültiges Ergebnis. | **XL** gesamt; sinnvoll in **L-Teilschritte** zerlegen | **Eigenständiger Designentscheid** zwischen Nachrichtenzähler und vergangener Spielzeit bzw. Hybrid. Frühe „PULSE“-Absprachen sind im heutigen main **nicht als vollständiger autoritativer Fachplan erhalten**; keine alten W100-/Schwellenzahlen automatisch einführen. Keine unmotivierte Zufallsfeindschaft, keine Begegnung mitten in ununterbrechbaren Entscheidungen. |
| **06 · W6** | **ROAD AHEAD – echte Reisebegegnungen.** Engine verankert geeignete Unterbrechung/Person/Gegner/Hindernis/Fund **vor** der Erzählung; der Narrator erzählt frei und der Spieler entscheidet. Begegnungen nicht allein durch Gildenquests erzeugen. | **L** | Ergänzt vorhandenen Reise-Hashwurf, der derzeit nur eine erzählte Unterbrechung erlaubt. Orts-/Populations-/Gefahrenidentität, Reise-Agency und Replay; **kein automatischer Angriff bei bloßer Drohung**. [K12/K13](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3a-konkrete-20-kandidaten--priorisierungsarchiv-keine-freigabe). |
| **07 · W7** | **Gefahren beim Rasten, Warten und während gefährlicher Zeitintervalle.** Risiko nach echter Spielzeit, Sicherheit, Vorsichtsmaßnahmen und Ruhefenstern; die Unterbrechung findet **vor** voll gebuchter Zeit/Regeneration statt. Kann auch neutrale Begebenheit sein. | **M–L** | Mit PULSE/ROAD-AHEAD-Risikomodell abstimmen; sichere Unterkünfte risikofrei, keine garantierte Begegnung nach fixem Zähler, geteilte Rasten dürfen Risiko nicht umgehen. [§6a](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#6a-zufallsereignis-beim-rasten--ausdrückliches-aktuelles-nutzerfeedback), [Recherche §4.1](recherche/AI_RPG_RECHERCHE_20261028.md#41-gefahr-bei-rast-warten-und-reise-nutzerfeedback-6a). |

**PULSE-Fachentscheidung vor Code:** Nicht jeder Spielerinput ist dieselbe Gefahrenexposition (ein kurzes Gespräch, eine Stunde Warten, ein Ritt durch die Wildnis). Kandidaten: Ereignisfenster nur auf geeigneten freien Szenen, gewichtete Exposition aus **Zeit + Ortsgefahr** und eine begrenzte Pacing-/Cooldown-Regel. Szenenwechsel und größere Ereignisse können Fenster zurücksetzen. **Hostilität ist eine zweite, getrennte, lokale Entscheidung**, nicht „Encounter = Angriff“; Neutralität, Fraktion, Tageszeit, plausibler Anlass und aktuelle Beziehung zählen. Die KI darf einem harmlosen NPC keinen ungerechtfertigten Kampf aufzwingen. Ein Ereignis kann mit einem etablierten NPC oder dessen Folgen verknüpft werden. **Engine muss seed-/eventstabil entscheiden**, damit Swipe/Reload nicht beliebig neue Würfe und Ausgänge erzeugen. Möglichst **keine eigene zusätzliche LLM-Anfrage pro Spielerzug**. Mechanische Spawns/Orte vor Narration, kreative konkrete Ausgestaltung im zulässigen Kontext. Erst ein kleiner Prototyp in Stadt + Straße + Wildnis, dann mehr Biome/Szenen.

### Etappe C – NPC-Eigenleben und kausale Weltentwicklung (08–11)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **08 · W4** | **NPC-Eigeninitiative und persönliche Ziele.** Figuren können innerhalb glaubwürdiger Grenzen tätig werden, statt nur auf Spielerkommandos zu antworten; etwa jemanden aufsuchen, Hilfe bitten, ein Geschäft schließen oder eine offene persönliche Sache verfolgen. | **L** | Auf W3, W1 und bestehender Agenda-/Thread-/Time-Mechanik aufbauen; keine LLM-Simulation jedes unsichtbaren NPCs pro Tick. Freiwillige PC-Aktionen bleiben ausschließlich beim Spieler. |
| **09 · W8** | **Begrenzte NPC-/Fraktionsuhren.** Kleine Fortschrittsuhren für relevante Konflikte/Personen, abhängig von lebenden Beteiligten, vorhandener Ware, Wegen und vergehender Zeit; Ereignisse sind kleine überprüfbare Folgen. | **M–L** als kleiner Prototyp, **L/XL** flächendeckend | Zunächst wenige Fälle pro Region; keine festen Skripts, keine automatischen Geld-/XP-/Kampfergebnisse. [Recherche §4.2](recherche/AI_RPG_RECHERCHE_20261028.md#42-npc--und-fraktionsuhren). |
| **10 · W9** | **Gerüchte und Informationsverbreitung.** Wissen darf zwischen NPCs über Kontakte, Ort, Beruf, Beziehung und Zeit wandern; „weiß“, „glaubt“, „vermutet“ bleiben getrennt; Geheimnisse bleiben geschützt. | **L** | Existierendes Wissensmodell und Quellketten verwenden, keine globale telepathische Rufzahl. Zuerst konkrete Testgeschichte mit nachvollziehbarem Übertragungsweg. [§4.3](recherche/AI_RPG_RECHERCHE_20261028.md#43-wissensverbreitung-außerhalb-der-szene). |
| **11 · W10** | **Story Sifting / natürliche Anschlussgeschichten.** Aus realen Events Hinweise wie „Rettung → späteres Wiedersehen“ oder „Versprechen → fälliger Zeitpunkt“ generieren, nicht als automatische neue Quests oder Weltfakten. | **S–M** für Erzählhinweise, **L** für umfassende Threads | Nur gebuchte Ereignisse, sparsam höchstens ein relevanter Hinweis und Anti-Wiederholung; Narrator darf folgen oder ignorieren. [§4.5](recherche/AI_RPG_RECHERCHE_20261028.md#45-story-sifting-nur-als-erzählhinweis). |

### Etappe D – Handel, Spieltempo und Bedienbarkeit (12–17)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **12 · Q1** | **Engine-Shops statt wackliger Standard-Prosa-Offerten.** Ladenidentität statt wechselnder Kassierer-NPC-ID, ortsgebundener kleiner Katalog, kanonische Preise, sichere neue Angebote und Lootankauf. Erzähler/NPC bleiben lebendig und frei in besonderen Angeboten. | **XL** gesamt, mehrere **M/L**-Teile | **Explizite Designänderung** nur nach Freigabe. Shop nicht als Notfallback, der ungültige Extraktionen durchbucht. Nicht parallel zwei verbindliche Preisquellen. [Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md), [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#handel--engine-shop-fallback). |
| **13 · Q2** | **Direkte Engine-Anzeigen für bekannte Boards und Offerten.** Reines erneutes Lesen eines bereits geprüften Boards/Angebots braucht keinen vollständigen freien Erzählertext; gemischte Interaktionen bleiben narrativ. | **M** | Vorhandene Cards/Board/Offer-IDs wiederverwenden, nicht heimlich Quests oder Produkte generieren; unnötige Parserwege überspringen, Save/Host korrekt. [Board-/Offertenfachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md). |
| **14 · Q3** | **Sichere Engine-only Rest/Wait/Fast Travel.** Verständliche Zeit-/Erholungskarten und kompakte sichere Wege statt Füllzüge; unsichere Zeiten und Wege müssen die neue Gefahr-/Begegnungslogik berücksichtigen. | **M–L** | **Nach W6/W7** für gefährliche Fälle; sichere Teilfunktionen können früher kommen. Kein Teleport, keine Regeneration über bereits eingetretene Unterbrechung hinaus. [Historie §6](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#6-engine-only-aktionen-rest-wait-und-sillytavern--neuere-überlegung). |
| **15 · T1** | **LLM-Aufrufe, Latenz und API-Kosten gezielt optimieren.** Rollen-Zeit/Kosten je **tatsächlich ausgeführter** Handlung, Promptwachstum, Cache, Extraktor-Kompaktheit, A/B-Modelle und sichere Fastpaths. | **M** zur Messung und kleinen Optimierung, **L/XL** bei Architekturänderung | Gerade wegen teurer Nachtbatches wertvoll; bestehendes Caching funktioniert bereits. Keine pauschale 2-vs-3-LLM-Umstellung ohne identische autoritative Weltresultate. [Recherche §4.8](recherche/AI_RPG_RECHERCHE_20261028.md#48-laufzeit--korrigierte-messbasis). |
| **16 · Q4** | **Erkundung, Suchen, konkrete Funde und Flucht/Verfolgung.** Bessere orts- und risikogebundene Entdeckungen, persistente Such-/Reiseabsicht, keine trivialen Check-Schleifen; vorhandenen One-Roll-Chase korrekt nutzen. | **L** | Mit W6 eng abstimmen; keine zweite Such- oder Chase-Engine, wenn bestehende Mechanik ausreicht. [Historischer Index K10/K13](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3a-konkrete-20-kandidaten--priorisierungsarchiv-keine-freigabe). |
| **17 · Q5** | **UI, Journal, Karte, Questfokus und optionale Quick Replies.** Klare bedeutende Systemkarten, bekannte Orte/Personen, Verlauf, Skill-/Kampfinfos; optionale Knöpfe ohne Abschaffung freier Sprache. | **M–L** | Inhalte aus bestehendem Zustand, keine zweite Journal-Datenbank. UI soll Spielzeit sparen, nicht Pflichtmenüs aufdrängen. [K04–K06/K11/K20](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3a-konkrete-20-kandidaten--priorisierungsarchiv-keine-freigabe). |

**Hinweis zur Reihenfolge:** Q2, Q3 und T1 können als **kleine, getrennte Quick-Wins vor Q1** sinnvoll sein, falls die menschlichen Tests einen klaren Zeit-/API-Flaschenhals beweisen. Die Rangliste stellt deshalb die **inhaltliche Wunschpriorität** dar, **keinen rigiden Bauplan**. Der deutlich größere Shopumbau braucht eine gesonderte Entscheidung.

### Etappe E – Kampf-, Monster- und Skilltiefe (18–24)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **18 · K1** | **Main-/Minor-Aktionsökonomie.** Normaler Bewegungsschritt und berechtigter Mobility-Skill teilen Minor; Angriff etc. Main; PC-/NPC-Parität und Reihenfolge. | **L** | **Bereits designbeschlossen**, technisch offen; Fachplan auf .154 neu abgleichen, aktuell kein automatischer Folgepatch. [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md). |
| **19 · K2** | **Plausible Monsterkörper, Bewaffnung und Loot.** Kein Geweih von unpassenden Arten, keine nie getragenen Waffen als Beute; Rollen-Loadouts, Körper-/Artidentität und tatsächlicher Einsatz konsistent. | **M–L** | Bestehende Anker/Populationen respektieren, keine unmotivierte Generaltabelle oder sämtliches Gear als garantierte Beute. [Monsteranalyse Pakete A](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **20 · K3** | **Monster-Sapienz, Populationen, Verhalten, Monsterkulturen.** Intelligente Wesen nicht pauschal geistlose Feinde; Verhalten aus Situation, Art, Zielen und sozialen Umständen. | **L** | NPC-/Monsterrollen und bestehende World-/Combat-Daten konsistent verbinden; kein moralischer Temperamentzwang und kein globaler Art→Anker-Lock. [Monsteranalyse Paket C](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **21 · K4** | **Ausführbare Spezialfähigkeiten, Schwächen und Bossphasen.** Gift/Status, elementare Wirkungen, Immunität/Resistenz, Flug und angekündigte Boss-Spezialangriffe statt bloßem Flavor. | **XL**, in **L**-Pakete aufteilbar | Erst K1 und ausreichende F-/E-Balancegrundlage; keine neuen Fähigkeiten ohne Enginewirkung, Gegenmaßnahmen und lesbare Bedrohung. [Monsteranalyse Paket B](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **22 · K5** | **Organische Skills mit World-Effekten.** Licht, Barriere, Objekte bewegen, Wege öffnen, aufdecken, Umwelt nutzen, ohne nur neue Angriffsvarianten zu erzeugen. | **L–XL** | Mechanische Effekt-/Delta-Ownership und echte Source-Evidenz erweitern, kein frei ausgeführter Modellcode. [Recherche §4.6](recherche/AI_RPG_RECHERCHE_20261028.md#46-skills-als-weltoperationen). |
| **23 · K6** | **Summons und dauerhafte/zeitlich begrenzte Begleiter.** Kommandierbare Wesen mit Herkunft, Zeit, Skills, Anwesenheit und begrenzten Aktionen; keine kostenlose zusätzliche Kampfgruppe. | **XL** | Nach K1, effektiver PC-/NPC-Aktion und Save/Replay; Minion-Ansatz ist nur Hypothese, nicht finale Balance. [Recherche §4.7](recherche/AI_RPG_RECHERCHE_20261028.md#47-summons-und-begleiter). |
| **24 · K7** | **Erweiterte AoE-/Raumgeometrie.** Explizit mehrbandige Skills, später bei Nutzen Richtung/Sektor/Cluster. Bestehende Band-AoE nicht wieder neu erfinden. | **M** für wenige mehrbandige Effekte; **L–XL** für Geometriesystem | Bedarf erst im Gameplay prüfen, nicht als Pflicht für K4/K5. [Historischer §7d](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7d-flächenfähigkeiten-über-reichweitenbänder-und-spätere-räumliche-verfeinerung-29102026). |

### Etappe F – Questvielfalt, Adventure-Content und langfristige Progression (25–30)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **25 · Q6** | **Höhere Gildenquests und echte Questvielfalt.** Neben CULL/CLEAR auch geeignete RECOVER/DEFEND und komplexere E-/D-Aufgaben, überprüfbare Ziele ohne starre Pflichtplotkette. | **L–XL**, pro Objective-Familie **M–L** | Nicht jede spontane Hilfe zur formalen Privatquest machen; gesperrte Varianten erst nach Ziel-/Transferprüfung. [Ideenkatalog §5/K07–K08](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#5-besondere-frage-quest-erweiterbarkeit-ed-rang). |
| **26 · Q7** | **Delivery-/Escortangebote gezielt wieder aktivieren.** Bestehende ruhende Mechaniken erst nach echten Player-Agency-, Reise-, Übergabe- und Berechnungs-Gegenfällen für neue Boards freigeben. | **M–L** | Vorhandene Implementierung nicht pauschal löschen oder als vollständig unmöglich behandeln. Keine Trophäen-/Unterschriftenbürokratie. [Kanon §6](02_DESIGN_KANON.md#6-quests-und-gilde). |
| **27 · Q8** | **Überlappende Jagden und individuelle Spezialziele.** Wolf-Cull gleichzeitig mit eindeutigem Rudelalpha; falls überlappende individuelle Kills, dauerhafte gerechte Zuordnung ohne Double-Payout. | **L** | Nur bei konkretem Spielerwunsch und modellierter Kill-Kreditregel; nicht per Questtitel dieselbe Population duplizieren. [Historischer §7e](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7e-spätere-questfreiheit-und-überlappende-jagdaufträge-30102026). |
| **28 · Q9** | **Mehr Dungeon-/Abenteuervielfalt.** Variation von Etagen, dynamischen fremden Gruppen, Ressourcen, Besonderheiten, Guardians/Bossen und Auswahlmöglichkeiten. | **L–XL** je Content-/Mechanikbreite | Patch 8 Living Dungeons existiert bereits; kein erzwungener Drei-Kampf-Korridor und kein XP ohne persönlichen Credit. [Kanon §7](02_DESIGN_KANON.md#7-dungeon-design-langfristig-verbindliche-videospielstruktur). |
| **29 · K8** | **Endgültige F→E- und Wirtschafts-/Progressionsbalance.** XP×5-Provisorium, PP/LP, Gear, Gefahr, Preise, Skillwachstum und F→E anhand realer Spielereindrücke und Daten beurteilen. | **L** für Messung + gezielte Kalibrierung; **XL** falls umfassender Umbau | Keine pauschale XP-Anhebung nur wegen Warrior-Strategie mit vielen L1-Gegnern. [Scaling-GPT](testrun_10b/scaling_gpt.md), [Sol-Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md). |
| **30 · K9** | **Höhere Ränge/Charakterentwicklung E→D und darüber.** Organische Klassenoptionen, neue anspruchsvollere Skill-/Passive-Effekte, Rank-Budgets und offene B+-Slotkapazität. | **XL**, je Rang getrennt | K8-Grundwerte, K1/K4/K5 je Bedarf und reale E-Langläufe zuerst. Keine festen versteckten Klassen- oder Skillbäume. [Kanon §8](02_DESIGN_KANON.md#8-welt-lore-und-organische-klassen). |

### Etappe G – Technikpflege und explorative Fernziele (31–33)

| Rang / ID | Offenes Vorhaben und Ziel | Aufwand | Voraussetzungen und Entscheidungsgrenze |
|---|---|---|---|
| **31 · T2** | **Zustand/abgeschlossene Gegner kompakter halten.** Unwichtige tote Einzelgegner nach sicherer Abwicklung nur als nachweisbar ausreichende Karriere-/Quest-/Dungeonbilanz führen. | **L–XL** | **Nur bei gemessenem Wachstum**. Lebende Flüchtige, Loot, Boss-/Guardianzyklen, personalisierter Credit, World-Quellen und Replay dürfen nicht verlorengehen; bloß Entities löschen reicht nicht. [Historischer §7c](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7c-geplante-langzeitoptimierung-gegner-lebenszyklus-kompakte-tatenbuch-zählung-und-dungeon-bossnachweise-28102026). |
| **32 · T3** | **Historische Architektur B2/E aufräumen.** Rein historische Privatquest-/V3-/V4-A-/Ruleset-1-Reste nur nach Nutzungsinventar entfernen, gemeinsame C-Pfade erhalten. | **M–L** | Keine Altformatmigration gefordert; bei riskanten geteilten Funktionen nicht blind löschen. [Architekturplan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). |
| **33 · T5** | **Explorative Gen4-/Craft-/Resolver- und KI-Architekturvergleiche.** Andere Kontext-/Turn-Resolution-Ideen höchstens als isolierte Messung/Prototyp prüfen, nicht als stillen Engine-Neubau. | **XS–M** für Recherche/Prototyp, **XL** für echte Umstellung | **Am schwächsten spezifizierter Kandidat.** Frühere Forschungs-/Vergleichsideen sind kein beschlossener Architekturpfad; nur mit konkret nachgewiesenem Nutzen gegenüber V4-C und separater Nutzerfreigabe. [Historischer Architektur-/Performanceindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3-großer-141-punkte-ideenkatalog--thematisch-verdichteter-index). |

## 3. Abhängigkeiten und sinnvolle Teilfreigaben

**Die Reihenfolge ist bewusst kein 33-Patches-am-Stück-Zwang.** Für die ersten wertvollen Erkenntnisse reichen Beobachtung und wenige kleine gezielte Korrekturen. Sinnvolle fachliche Pakete:

| Pfad | Vorab prüfen | Erstes kleines verwertbares Ergebnis | Nicht als Voraussetzung erzwingen |
|---|---|---|---|
| **NPC-Memory** | W1/T4, Originalkontext und NPC-ID | Nachweislich dieselbe Person erinnert sich an ein bedeutendes Ereignis **nach mehrfacher Abwesenheit**, ohne Wissensleck | W2-Archiv, NPC-Markierungsbefehl, globale Vektorsuche |
| **NPC-Stadtleben** | W3 + bestehende Orts-/NPC-IDs | 2–3 wiederkehrende Personen mit konsistenter Rolle, Ort und Haltung | Jede Bürgerfigur bekommt Tagesplan und autonome LLM-Ausführung |
| **PULSE** | W5-Fachentscheidung, Verhältnis Nachricht/Zeit, Ereignisklassen | Wenige replaystabile **friedliche und gefährliche** Szenen an passenden Orten; kein Event durch bloßes Nachladen | Monsterökosystem, alle Fraktionsuhren, ein LLM-Call pro Tick |
| **ROAD AHEAD / Rest** | W6/W7, reisewahre Ankunft, Zeit- und Zielbindung | Eine nicht questgebundene Reiseunterbrechung sowie eine unterbrochene riskante Rast mit korrekter anteiliger Erholung | Vollständige Fast-Travel-/Karten-UI |
| **Weltverlauf** | W4/W8, vorhandene Agendas/Threads und Uhrzeit | Ein NPC verfolgt eine begrenzte Absicht während der PC fort ist; bei Rückkehr gilt derselbe Zustand | Persistente autonome Agenten für alle Stadtbewohner |
| **Handel/Komfort** | Q1-Designfreigabe, Q2/Q3-Grenzen | Ein stabiles Geschäft mit korrektem Sortiment, genau einem gebuchten Kauf und Replay | Alle Dienste, Crafting, Kreditwirtschaft oder Sonderhandel |
| **RPG-Ausbau** | K1, reale Spielerpräferenzen und F-/E-Daten | Eine Haupt-/Nebenaktionsfolge mit PC-/NPC-Parität; später einzelne Monster- oder World-Skill-Funktion | D–S-Rang, Boss-/AoE-Universalsystem |

### Nicht voraussetzen, dass das Testziel schon als Feature existiert

Ein manueller Langlauf **vor PULSE** kann zeigen, ob der Narrator von selbst interessante unabhängige Ereignisse erfindet und wie stabil vorhandene NPCs sind. Er kann **nicht** die Zuverlässigkeit eines noch nicht implementierten PULSE-Zufallsgenerators beweisen. Für PULSE nach Implementierung einen eigenen Wiederholungstest mit vielen Orts-/Zeit-/Seed-Kombinationen plus menschlicher Qualitätserfahrung vorsehen.

Ein guter NPC-Memory-Test verlangt **keine** erzwungene Abfrage „Erinnerst du dich?“. Die stärkere Qualitätsbeobachtung ist, ob ein NPC bei natürlicher Rückkehr **sinnvoll** an die gemeinsame Geschichte anknüpft – und gerade nicht bei jedem Satz dasselbe alte Ereignis wiederholt.

## 4. Aufgeschobene Unterpunkte / Abdeckung des historischen Ideenkatalogs

Die 33 Kennzeichen decken den aktuell [in 04 geführten offenen Katalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), die [historische Langfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), die [28.10.-Recherche](recherche/AI_RPG_RECHERCHE_20261028.md) und die [Monsterfachanalyse](recherche/MONSTERDESIGN_ANALYSE_20261028.md) auf Themenebene ab. **Nicht jeder der historischen 141 Punkte ist eine neue unabhängige Baustelle.**

| Historischer Kandidat / Themenblock | Heutige Zuordnung / Grund |
|---|---|
| K01 Engine-only Board; K19 Panel-/Full-Profil | **Q2/T1**; keine neue parallele Routerarchitektur |
| K02 Combat-Prompt-Konsistenz; K03 Dungeon-Cull-Credit | **Zunächst gegen 10B-Umsetzungen prüfen**; keine automatische neue Featureposition, nur bei aktuellem reproduziertem Fehler |
| K04 Systemkarten; K05 Defense-/Utility-HUD; K06 Fokuszeile; K11 Journal; K20 Quick Replies | **Q5/Q2**; vorhandene HUD-/Karten-Teile sind keine neue Gesamtimplementierung |
| K07 höhere Questmeilensteine; K08 Quest-Qualität | **Q6/Q9** |
| K09 persistente wichtige NPCs | **W3** |
| K10 Ort-/Identitätsreferenzen; K13 konkrete Suchfunde | **Q4/W6**; Batch28-Identitätsrestpunkt separat in §1 |
| K12 ROAD AHEAD | **W6**, verbunden mit **W5/W7** |
| K14 Skill-Effektbaukasten; K15 organische Entwicklung; K16 Umwelt-Wirkungen | **K5/K9** nur für **noch nicht umgesetzte** Teile; Kern-9C/9D und .149 bleiben implementiert |
| K17 Bossphasen und Signaturangriffe | **K4/Q9** |
| K18 Combat-Extractor-lite A/B | **T1** nur bei echten Zeit-/Integritätsmessungen |
| Reisen/Suchen 44–56 | **W5/W6/W7, Q3/Q4** |
| NPCs/Städte 57–70 | **W1–W4, W8–W10, Q1** |
| Progression/Monster 71–87 | **K2–K9, Q9**; **historische Idee #71 zur Änderung der Startklassen ist ausdrücklich verworfen** |
| UI 88–101 | **Q2/Q5** |
| Performance 102–117 | **T1/T2**, nur nach gemessenem Nutzen |
| Weitere klassische RPG-Regeln 118–130 | **Nicht wieder öffnen**, soweit als bürokratisch verworfen: harte Traglast, Hunger/Durst, Waffenhaltbarkeit, fest geskriptete Handlung |
| QS 131–141 | **W1/T4 und laufende Patchabnahme**; Golden-Tests/Replay/Naturtests sind **Qualitätspraxis**, keine elf neuen Gameplayfeatures |
| Engine-Shop-Fachplan | **Q1**, Geschäft, Katalog, Quellen-/Preisautorität statt alter Verkäufer-Semantik |
| Monsteranalyse A/C/B | **K2/K3/K4**, jeweils unterschiedliche fachliche Fragen |
| Gegner-Killhistorie/Population | **T2/K3/Q8**, nicht pauschal alle toten NPCs löschen |
| Zwei Ebenen NPC-Memory, Bogen-Gedächtnis, Story-Sifting | **W1/W2/W10**, Retrieval zuerst messen |
| NPC-Fraktionsuhren, Gerüchte | **W4/W8/W9** |
| Main/Minor, Summons und World-Skills | **K1/K6/K5**, keine kostenlosen Extraaktionen |

### Bewusst nicht erneut als offene neue Ideen aufführen

- **Bereits vorhanden:** Engine-owned Geld/Kampf/Quest/Fold, automatische Beute, Living-Dungeon-Grundstruktur, organische Skill-/Passive-/Klassenentwicklung, F→E-Angebot/Annahme, bisherige Band-AoE, bestehende World/NPC-Fakten und Beziehungsschicht, Guild-Boards sowie .152–.154 Reparatur-/Identitätsschutz. Erweiterungen oben sind ausdrücklich **Zusätze**, keine Wiederholung der Basispakete.
- **Ausdrücklich nicht gewünscht:** Feste spätere Skill- und Klassenbäume, pauschale NPC-Levelskalierung auf den PC, formale Privatquests für jede Hilfsaktion, Trophäennachweise, Traglast-/Bedürfnisbürokratie, Pflichtmenüs, Autopilot-Spielerentscheidungen, globale NPC-Temperament-Zwangsregeln, überall laufende LLM-Agenten und mehrere konkurrierende Memory-/Finanz-Statequellen.
- **Späterer Problembeleg ≠ neue Roadmappflicht:** Eine einzelne 10B-Bugreproduktion bleibt ein gezielter Wartungsfall, nicht ein Vorwand für einen großen Architekturpatch. [Aktuelle Fehlerklasse und Status](03_AKTUELLER_PROJEKTSTAND.md).

## 5. Vorschlag für Sols unabhängigen Gegenreview

Bitte **vor jeder Implementierungsfreigabe**:

1. **Quellabgleich:** Sind alle in [02](02_DESIGN_KANON.md), [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), der historischen [Kandidatenliste](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), [Recherche](recherche/AI_RPG_RECHERCHE_20261028.md), [Monsteranalyse](recherche/MONSTERDESIGN_ANALYSE_20261028.md) und Fachplänen tatsächlich noch offenen Themen abgedeckt? Welche sind implementiert, verworfen, doppelt oder neu erfunden?
2. **Ist-Code-Abgleich:** Besonders NPC-Memory/Knowledge/Context, NPC-Routinen, World-Events, Reise-Hash, Living-Dungeon-Ticks, Trade/Shop, Main/Minor und F-/E-Progression. **Nicht** allein aufgrund einer historischen Lücke im .109-Code behaupten, dieselbe Funktion fehle noch auf .154.
3. **PULSE-Spezifikation prüfen:** Freier sozialer Stadt-Encounter **und** Wildnisgefahr müssen enthalten sein; das vorhandene ROAD AHEAD ist nur der Reiseteil. Nachrichtenzähler vs. Weltzeit, Ruhefenster, Hostilitätsverteilung und günstige Modellaufrufe sind **offene Entscheidungen**, nicht bereits verbindliche Zahlen.
4. **Aufwand und Abhängigkeiten challengen:** Insbesondere W2 vor/mit W3, PULSE↔ROAD-AHEAD↔Rest, Fraktionsuhren vs. NPC-Memory, Engine-Shop vs. bekannte Händleridentität, K1 vs. K4/K6 und F→E-Scaling. Wo hilft ein **kleiner** Patch, wo ist der Umbau überraschend groß?
5. **Risiko- und Quality-Gates:** Spielerhoheit, Source-Knowledge/Geheimnisse, NPC-Identität, nichtquestgebundene Ereignisse, ökonomische Ownership, Replay/Swipe/Reload, Providerkosten und natürliche GLM-Testbarkeit. Zu jeder priorisierten Etappe ein minimales, tatsächlich überprüfbares Erfolgskriterium.
6. **Alternativen ehrlich bewerten:** Wenn W1 bereits gutes natürliches Memory nachweist, W2 nicht nur aus Vollständigkeit bauen. Wenn PULSE vor ROAD AHEAD ein schwieriges Strukturproblem erzeugt, einen anderen technischen Teilauftrag vorschlagen, aber Nutzerfokus auf spontanes Stadtleben **nicht** stillschweigend unter Reisegefahren begraben.
7. **Empfohlene Änderungen konkret nennen** (Reihenfolge/Begründung/Aufwand/fehlender Kandidat), **ohne** Roadmap oder Produktcode ungefragt als beschlossene Folge zu implementieren.

**Anschließende gemeinsame Entscheidung:** Nutzer + GPT + Sol ordnen Reihenfolge neu, entscheiden über 10B-Abschluss separat, definieren danach nur **den ersten** tatsächlich freigegebenen Fachpatch und seinen natürlichen Testumfang. Keine ganze XXL-Roadmap auf einmal implementieren.

## 6. Maßgebliche Quellen

- [02 – Verbindlicher Designkanon](02_DESIGN_KANON.md)
- [03 – Aktueller Projektstand, Stand .154 / Batch28](03_AKTUELLER_PROJEKTSTAND.md)
- [04 – Aktuelle offene Ideen](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md)
- [06 – 10B-Stabilisierung und Abschlusskriterien](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md)
- [Vollständige historische 04-Fassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md)
- [NPC-/Weltdynamik-/Performance-Recherche](recherche/AI_RPG_RECHERCHE_20261028.md)
- [Monsterdesign-Fachanalyse mit Gegenreview](recherche/MONSTERDESIGN_ANALYSE_20261028.md)
- [Main-/Minor-Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md)
- [Engine-Shops-Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md)
- [Board-/Offer-Fastpath-Fachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md)
- [F→E-Balance / Sol](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md) · [GPT](testrun_10b/scaling_gpt.md)
- [10B-Originalrunindex](testrun_10b/README.md)

---

**Entwurfsvermerk:** Diese Datei enthält **33 priorisierte Feature-/Qualitätskandidaten** plus **separat** den aktuellen konkreten Batch28-P2-Identitätsrestpunkt und die vorgelagerte 10B-/Spielertestentscheidung. Bereits vorhandene Lösungen werden nicht als erneut offener Komplettbau gezählt. **Nichts ist mit Anlage dieser Datei freigegeben oder umgesetzt.**
