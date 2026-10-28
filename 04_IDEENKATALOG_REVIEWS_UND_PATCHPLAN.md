# Avereth Engine – Ideenarchiv und spätere Kandidaten

**Stand:** 28.10.2026. **Ideen sind keine Patchfreigaben.** Aktueller Stand ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md), Designentscheidungen in [02](02_DESIGN_KANON.md), technische 10B-Befunde in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

**Verlustfreie historische Quelle:** Die zuvor sehr ausführliche Fassung mit sämtlichen alten Patch-8-/9-Plänen, Gegenreviews und einzelnen Messergebnissen bleibt [auf dem ursprünglichen main-Commit 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) vollständig erhalten. Historische Formulierungen wie „nächster Patch“ sind damit nicht automatisch aktuelle Aufträge.

## 1. Abgeschlossene Patchgenerationen – kurze Chronik

| Bereich | Beständiges Ergebnis | Quellen |
|---|---|---|
| Patch 8 (.25–.32) | Living Dungeons, Gate/Etagen, gruppierte Kämpfe und technische ST-Integration; als Entwicklungsphase abgeschlossen | [Abschlusscommit .32](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/211ee659e93072ff8f3e359be13eca93f8fecab3), [vollständige Historie](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) |
| Patch 9A/B (.33–.39) | Drei Startklassen Warrior/Mage/Rogue mit Wahl von zwei Starter-Skills, NPC-Kampfprofile, dynamische Skills/Passives, Proficiency | [frühere Planung und Reviews](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#1a2-patch-9--organic-character-growth), [gültiger Kanon](02_DESIGN_KANON.md) |
| Patch 9C (.40–.54) | Lernen, Forge/Stone, Passive-/Skill-Wachstum und Evolution technisch aufgebaut und punktuell live getestet | [9C-Abschlusscommit](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36), [historische Fachpläne](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) |
| Patch 9D (.55–.57) | F→E-Klassenidentität technisch implementiert, gezielter Fixture-Test bestanden; **keine natürliche Level-1–15-Abnahme** | [alte vollständige Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), [03](03_AKTUELLER_PROJEKTSTAND.md) |
| Patch 10A | Frühere HUD-/QoL-Mechaniken vorhanden, **kein neuer Sammelpatch** | [historische Begründungen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) |
| 10B (laufend) | Technische Stabilisierung und Langlaufbefunde; Scaling F→E noch offen | [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [Tests](testrun_10b/README.md) |

Vergangene Varianten und überholte Freigaben stehen nur noch im Archivlink. Offene theoretische Punkte nicht als implementiert deklarieren; bindende Entscheidungen aus [02](02_DESIGN_KANON.md) nicht durch alte Entwürfe ersetzen.

## 2. Übergeordnete Erkenntnis – die zentrale Richtung

**„LLM versteht wie GM, Engine rechnet wie Spiel“.** Nächste Optimierung: nicht jede mechanische Handlung doppelt vom Narrator beschreiben/entscheiden lassen.

| Handlungskategorie | Zuständigkeit | Beispiele |
|---|---|---|
| **Systemvorgang** | Engine+UI, im reinen Fall weder Narrator noch Extractor | Bekanntes Guild-Board lesen, `#status`, `#bag`, `#map`, Questjournal, reine Infoabfrage |
| **Mechanisch aufgelöst** | Engine bucht; Narrator bei relevantem Erzählgewinn, Extractor nur für noch offene Weltfakten | Combat, Kauf, Loot, Rest, Questcredit, Dungeon-Gate, bekannte sichere Wege |
| **Offene Situation** | Narrator kreativ; Extractor/Firewall persistieren zulässige Weltänderungen | Gespräch, Verhandlung, ungewöhnlicher Zauber/Umwelteinsatz, frei erkundete Welt |
| **Mischturn** | Vollständige autorisierte Kommandoliste; offenster Teil bestimmt nötige Narration/Extraktion | „Board lesen UND Schreiber befragen“ ist keine reine Panel-Aktion |

Claude schlug persistentes `turn.mode: system|resolved|open` vor. **Konsens nach Gegenreview:** kein weiteres persistentes State-Feld, kein großes Router-Framework. Ein **abgeleitetes, lokales Ausführungsprofil** beim ersten Bedarf, zunächst nur `panel` vs. `full`; später `combat_lite` oder szenenspezifische Prompts nur bei echtem Nutzen. Bestehende `command.panels`, Outcomes und Routing sind maßgeblich.

**Engine first ≠ Narrator stumm überall.** Freie, bedeutungsvolle Weltreaktionen bleiben LLM-Aufgabe. Kein starrer Storygenerator und keine falschen automatischen PC-Handlungen.

## 3. Großer 141-Punkte-Ideenkatalog – thematisch verdichteter Index

Im langen Chat wurden **141 nummerierte Punkte** kritisch bewertet. Diese Übersicht bewahrt die Themen, Beschlüsse und konkreten Kandidaten; sie ist **keine Liste von 141 genehmigten Features**:

- **01–13 Architektur/Truth:** kompakter bindender STATE NOW; klare Action-Endzustände; objektive Fakten von NPC-Behauptungen/Gerüchten trennen; alte Promptregeln bereinigen; stabile Monsterhandles; nur relevante Extractor-Arbeit; Spielerwissen; unabhängige Handlungsschritte; schlanke Szenensummary; sichere Extractor-Fehlerbehandlung.
- **14–28 Dungeons:** erkennbare System-Dungeons, Gate-Info (in .26 implementiert), Floor-Fortschritt, bedeutungsvolle statt leere Räume, optionale Karte, bekannte Rangwarnung, Bossphasen und telegraphierte Angriffe, Resetvarianten, seltene Events, CLEAR-Karte, sichere Rückwege, sichtbare fremde Gruppen.
- **29–43 Gildenquests:** allgemeine mechanische Questfamilien `CULL/CLEAR/ESCORT/DELIVER/RECOVER/DEFEND` als **Gerüst statt fester Story**; Erfüllbarkeit bereits bei Boardbuchung; aktive Questanzeige; optional angeheftetes Ziel; enginegebuchter Fortschritt; READY vs. TURN-IN; keine Trophäen; echte Escort-/Deliverybedingungen; alternative Lösungswege; tagesstabiles Board; regionale Identität; `q.dungeon` für Orts-Credit; kausale Folgeaufträge; Qualitätsfilter.
- **44–56 Reisen/Suchen:** persistente Reiseabsicht; `lokale Bewegung / bekannte Reise / offene Erkundung`; nur entscheidungsrelevante Unterbrechungen; mögliche Pacing-Tendenz nach ruhigen Abschnitten; Suche ohne triviale Checks/Endlosschleifen; orts-/tageszeitbezogene Gefahren; persistente Orte; Ziel nicht bei Nebenentdeckung verlieren; sichere Schnellreise als spätere Option.
- **57–70 NPCs/Städte:** persistente wichtige NPCs und Dienstleistungsrollen, kleine Tagesroutinen statt autonome Vollsimulation, zuverlässige Standardshops, begrenzt persistente Sortimente, bedeutsames statt rein erwähnungsbasiertes Memory, Ereignisreferenzen, grobe Relations, Gerüchteausbreitung, vereinfachte Fraktionsinteressen, wiederkehrende Abenteurer; keine globale Temperamentmaschine.
- **71–87 Progression/Loot:** **#71 Klassenumbau AUSDRÜCKLICH VERWORFEN/IGNORIEREN**; organische Klassenentwicklung ohne starre Evolutionsbäume, enginekompatible Skill-Bausteine, Targets/Reichweite, Umweltwirkungen, permanente Besonderheiten, Training, Synergien, Skill Stones, unterschiedliche Elite-/Bossfähigkeiten, erkennbare Lootqualität, automatische Beute, Sammelverkauf, plausible Wertbereiche.
- **88–101 UI:** unterschiedliche klare Systemkarten, Debug- vs. Spieleransicht, bedeutende Ereignisse hervorheben, Gruppenkampf-HUD, Defense-/Utility-Skills sichtbar, Kosten vor Aktionen, HP-Truth, Fokuszeile, bekannte Orts-/Dungeon-Karte, Inventar-/Questjournal, hilfreiche **optionale** Action-Vorschläge/Quick-Action-Menüs.
- **102–117 LLM/Performance:** reine Ansichten ohne Planner/Narrator/Extractor, gezieltes Planner-/Extractor-Skip, Board-Generator nur bei Bedarf, redundante Promptregeln streichen, szenenabhängige Module, STATE NOW priorisieren, echtes Provider-Caching A/B, Retrieval-Caching, `foldChat` messen und ggf. lokale Memoisierung, error-specific Repair, Reasoning-Budget, Modellvergleich, Zwei- vs. Drei-Aufruf-Architektur **nur experimentell**, Token-/Latenzmetrik, NPC-Memory-Komprimierung.
- **118–130 unbequemere Alternativen:** stärkere Quest-/NPC-/Ortsgerüste teils empfohlen; Skill-Bausteine positiv; harte Traglast, Waffenhaltbarkeit, Hunger/Durst und komplett geskriptete Kampagne **nicht empfohlen**; Fast Travel optional; Narrator nur in harten Mechaniken beschränken.
- **131–141 QS:** Golden-Tests aus realen Logs, komplette Abenteuerläufe, getrennte Narrator-/Engine-/Extractor-Qualität, schwierige frühere Fehler als Regression, Release-Latenzprüfung, Promptwachstum, Tests für *kreative Freiheit*, lange Event-Chats, Analyse abgelehnter Deltas, echter GLM-Livetest als dritte Stufe, kontrollierte A/B-Vergleiche.

### 3a. Konkrete 20 Kandidaten – Priorisierungsarchiv, keine Freigabe

| ID | Kandidat und Nutzen | Planung |
|---|---|---|
| **K01** | **Engine-only-Gildenboard:** offizielle Quests nicht nochmals durch Narrator wiederholen; weniger LLM-Kosten/Fehler | Kleines eigenständiges QoL-Thema, sehr hoch |
| **K02** | **Veraltete Combat-Promptregel** nach Gruppencombat korrigieren | Kleine Code-Inkonsistenz, hoch |
| **K03** | **Dungeon-Cull-Ortsbezug `q.dungeon`** im Kill-Credit verwenden | Kleine Engine-Konsistenz, hoch |
| **K04** | Einfache Systemkarten: Quest angenommen/ready, Floor-Clear, Boss, Level-up, Tod | QoL, hoch |
| **K05** | Defense-/Utility-Skills im Combat-HUD statt nur Angriff | UI, hoch; evtl. Patch 10B |
| **K06** | Spielergewähltes aktuelles Quest-/Reiseziel als Fokuszeile | QoL, hoch |
| **K07** | Allgemeine Pflicht-/optionale/alternative Questmeilensteine für E-/D-Ränge | Mittel/groß, später |
| **K08** | Quest-Qualitätsfilter: Ziel/Ort/Monster/Schwierigkeit und Prüfbarkeit | Mittel, später |
| **K09** | Persistente wichtige Stadt-NPCs/Einrichtungsrollen | Mittel |
| **K10** | Bekannte Ortsreferenzen robust wiederverwenden | Mittel |
| **K11** | Besseres Journal, bekannte Orte, Quest-Historie ohne doppelte Statequelle | Mittel |
| **K12** | **ROAD AHEAD**: Engine-verankerte Reisebegegnungen | Eigenständiges größeres Feature |
| **K13** | Engine bestimmt konkrete Funde bei bereits bestehender Suche; keine zweite Suchengine | Mit ROAD AHEAD |
| **K14** | Allgemeiner Skill-Effect-Baukasten, keine starren Klassenbäume | Mit Patch 9 prüfen |
| **K15** | Bedeutsame Nutzungs-/Entwicklungsmomente statt bloßer Zähler | Mit Patch 9 |
| **K16** | Kreative Skill-Umweltwirkungen mit gültigen Engine-Effekten | Mit Patch 9 |
| **K17** | Bossphasen und telegraphierte Spezialangriffe | Später optional |
| **K18** | Combat-Extractor-lite als kontrolliertes A/B-Experiment | **Nicht** automatisch Teil Performance-Patch |
| **K19** | Abgeleitete `full/panel`-Ausführungsprofile | Erst bei tatsächlichem Fall |
| **K20** | Optionales SillyTavern-Quick-Action-Interface | QoL, nach sicherem Fast-Path |

**Review-Querverweis:** Ältere Antworten zum Videospielisierungskatalog enthielten #71 als Vorschlag zur Änderung der Startklassen. Nutzer hat diese Idee ausdrücklich ausgeschlossen. Nicht als Beschluss behandeln.

### 3b. Späterer NPC-Memory- und Identitäts-Langzeittest – vorgemerkt, **nicht aktuell** (27.10.2026)

**Priorität und Beschluss:** Ausschließlich als **späterer Qualitäts-/Reviewauftrag** festhalten. **Jetzt keine Umsetzung, keine Runner- oder Promptänderung, keine gesonderten NPC-Memory-Livetests.** Der aktuelle Schwerpunkt bleibt **technische Stabilität, Fehler-/Recovery-Ursachen, echte Batch-Abnahmen und F→E-Scaling/Balance**. Erst nach diesen Arbeitsbereichen bei ausreichend langen natürlichen Gesprächsverläufen erneut aufgreifen; kein Blocker für die aktuelle Patch- oder Batchphase.

**Bisheriger Evidenzstand:** Die Architektur trennt Weltfakten, NPC-eigenes Wissen/Glauben, episodisches Memory und Beziehungen (`avereth-engine/src/knowledge.js`, `src/context.js`). Bestehende synthetische Tests prüfen u. a. eine Wiederbegegnung nach 200 fremden Spielzügen (Mara: Versprechen und Haltung), Geheimnisgrenzen, Namenskenntnis und Beziehungen (`tests/scenarios/memory.test.js`, `npc_record.test.js`). Historische Testruns V2/V10 untersuchten einzelne Erstkontakte und Erinnerungen. **Keine systematische natürliche Langzeitabnahme** der tatsächlichen Dialogverwendung über wiederholte Begegnungen nachgewiesen. In [10B-Run vom 25.10. 08:13](testrun_10b/20261025-081303Z-current_test/REVIEW.md) wurde Brast trotz früherer Rettung erneut gefangen und später unter zweiter NPC-Identität angelegt; [Folgereview](testrun_10b/20261025-113248Z-current_test/REVIEW.md) bezeichnet die natürliche NPC-Kontinuität weiterhin als offen. Davon **getrennt** ist das Vergessen eigener Questabschlüsse durch den automatischen Testspieler in [Run 4 vom 24.10.](testrun_10b/20261024-044642Z-current_test/REVIEW.md): Testspieler-Memory ist nicht NPC-Memory.

**Späterer rein beobachtender Prüfumfang bei ohnehin stattfindenden längeren Originalruns:** Wiederholt angetroffene wichtige NPCs und tatsächliche Gespräche chronologisch abgleichen: (1) dieselbe kanonische NPC-ID, Name, Erscheinung und Position; (2) was die Person über Alaric sehen/hören oder aus einer Quelle erfahren konnte, einschließlich Geheimnissen und falschen Gerüchten; (3) überdauernde gemeinsame Erinnerungen, Zusagen, Konflikte, Haltung und Beziehungen; (4) welcher dieser Inhalte im konkreten Turn **im Narrator-Kontext tatsächlich enthalten** war und ob das NPC-Gespräch dazu passt; (5) Persistenz nach Zeitabstand und gegebenenfalls Save/Reload/Replay. **Gespeichert ≠ in diesem Kontext abgerufen ≠ vom Modell im Dialog benutzt**; die drei Stufen getrennt beurteilen.

**Bewertungsschutz:** Kein pauschaler Memory-Bug allein wegen fehlender Erwähnung einer unwichtigen Begebenheit, bewusstem Vergessen, glaubwürdigem Irrtum oder Lüge. Dagegen Identitätsduplikate, unbegründete Wissenslecks, falsche Wiederbegegnungen und objektiv unwahre persistierte Erinnerungen mit konkreten Originalbelegen dokumentieren. Für die spätere Auswertung keine erzwungenen Gespräche oder heimliche Enginezustandsinformationen an den Testspieler geben; vorhandene natürliche NPC-Interaktionen auswerten. **Vorläufig kein zusätzlicher Testspielerleitfaden und kein neuer Produktpatch.**


#### Optionale zweistufige NPC-Memory – Ideenentwurf, **Machbarkeit offen / kein Implementierungsauftrag**

**Grundidee:** Nicht jeden in der Welt auftauchenden NPC mit einem teuren Langzeitdossier ausstatten. Gewöhnliche Figuren (z. B. Gildenschreiber, Verkäufer, Wächter, Wirte, einfache Bürger) sollen mit **schlankem, dauerhaft konsistentem Personenprofil** auskommen. Nur ausgewählte, für Alarics Geschichte bedeutsame Personen bekommen ein **vertieftes gemeinsames Erinnerungsprofil**. Ob das mit der vorhandenen Engine, Speicherstruktur und einem vertretbaren Prompt-/Tokenbudget sinnvoll funktioniert, ist **erst später technisch zu prüfen**; keine Zusage, dass alle Punkte umgesetzt werden.

- **Stufe 1 – gewöhnliche NPCs:** stabile Identität/ID und Name bzw. bekannter Name; wer kennt Alarics Namen und wer erkennt ihn nur vom Sehen; grober persönlicher Bezug zu Alaric (**unbekannt / bekannt / freundlich / Freund / Rivale / Feind**, mit vorsichtigen, nicht automatisch erzwungenen Übergängen); eigene etablierte Merkmale wie Aussehen, Rolle/Beruf, Auftreten, Sprache, Aufenthalts-/Arbeitsort sowie vorhandene Klasse/Fähigkeiten, soweit relevant. Wenige wichtige aktuelle Eigeninteressen oder feste Tatsachen können bleiben. **Keine ausufernden episodischen NPC-Tagebücher**, kein vollständiges Gesprächsprotokoll für jede Wache und nicht pauschal alle Händler zum „wichtigen NPC“ machen. Auch gewöhnliche Figuren dürfen einen entscheidenden Vorgang sachlich korrekt wissen, ohne allein deshalb Stufe 2 zu benötigen.
- **Stufe 2 – ausgewählte wichtige/wiederkehrende NPCs:** zusätzlich zur stabilen Grundidentität ein bewusst begrenztes, **ereignisbasiertes gemeinsames Gedächtnis**: wichtige mit Alaric erlebte Situationen, Versprechen, gegenseitige Hilfe oder Verletzungen, geteilte Geheimnisse, Vertrauensbrüche, Schuld- und Dankesverhältnisse, Beziehungsgeschichte, erkennbare Ziele/Motive und Veränderungen des eigenen Lebenszustands. Nicht jedes Gespräch speichern, sondern bedeutsame, nachvollziehbare Wendepunkte mit Ursache, Beteiligten, Zeitpunkt/Ort sowie tatsächlichem Wissen der Figur.
- **Zwei denkbare Wege zur Auswahl:** (a) Die **Engine erkennt** einen NPC mit nachweislich wiederkehrender Bedeutung, wichtigen gemeinsamen Ereignissen oder längerfristigen Bindungen und schlägt ihn ggf. als vertieft zu führende Figur vor; (b) der **Spieler markiert eine bereits existierende Person** ausdrücklich, beispielsweise mit einem **noch nicht existierenden, rein vorgeschlagenen Systembefehl** `#NPC Name`. Der Befehl wäre eine bewusste *Merken-/Vertiefen-Markierung*, **keine** Erlaubnis, aus dem Namen einen neuen Menschen zu erzeugen, Wissen zu erfinden oder rückwirkend nicht belegte Beziehungen festzulegen. Bei Namensgleichheit müsste die Engine eine eindeutige vorhandene NPC-ID ermitteln oder nachfragen. Ob automatische Auswahl, manueller Befehl oder beides praktikabel ist, bleibt offen.
- **Beispiele für Stufe-2-Erinnerungen (nur falls wirklich erlebt/belegt):**
  - Eine Heilerin erinnert sich daran, dass Alaric ihr vor Wochen während eines Überfalls geholfen und danach ein vereinbartes Heilmittel beschafft hat; sie begrüßt ihn entsprechend und weiß zugleich, **welchen Teil** sie selbst miterlebt hat.
  - Ein ehemaliger Reisegefährte erinnert sich an den gemeinsamen Kampf am Pass, daran, wer verletzt wurde und dass Alaric damals sein Leben riskierte; ein beim Abschied gegebenes Versprechen kann später wieder aufgegriffen werden.
  - Ein Händler, der vom gewöhnlichen Kontakt zum wichtigen Vertrauten geworden ist, erinnert sich an Alarics Hilfe bei einem Diebstahl, eine noch offene persönliche Schuld und einen späteren Vertrauensbruch. Seine Haltung kann sich **begründet** verändern, statt plötzlich zurückgesetzt zu werden.
  - Eine Rivalin erinnert sich, dass Alaric ihr bei einem Wettbewerb zuvorkam, später aber ihren Bruder rettete; Rivalität und Dankbarkeit dürfen nebeneinander bestehen, statt auf einen simplen Freund-/Feind-Schalter reduziert zu werden.
  - Ein Informant hat Alaric ein Geheimnis unter vier Augen verraten. Nur tatsächlich Eingeweihte dürfen es wissen; andere NPCs erfahren es gegebenenfalls erst durch glaubwürdige Weitergabe, Gerüchte oder Beobachtung.
  - Nach langer Abwesenheit erkennt ein wichtiger NPC Alaric wieder und bezieht sich auf **ein besonders relevantes gemeinsames Ereignis**, ohne bei jeder Begegnung dieselbe Erinnerung künstlich zu wiederholen oder alle vergangenen Gespräche wortgetreu aufzuzählen.
- **Möglicher technischer Ansatz – zunächst nur prüfen:** Bestehende `knowledge`-/`memories`-/Relations-Events und NPC-IDs **wiederverwenden**, keine parallele zweite Wahrheit oder wachsende Dossierbank einführen. Für Stufe 2 nur ausgewählte, wichtige Episoden samt Herkunft und Zeit speichern bzw. gezielt abrufen; vergangene Episoden behalten, aber die im aktuellen Narrator-Prompt dargestellte Auswahl knapp halten. Herkunfts-/Wissensgrenzen und Änderungen bestehender Fakten (z. B. Versprechen erfüllt, Beziehung gewandelt, Gerücht als falsch erkannt) müssen unterscheidbar bleiben. **Archivierte Fakten, gespeichertes NPC-Wissen und tatsächlich im Gespräch verwendeter Kontext sind drei verschiedene Prüfebenen**.
- **Offene Fragen für die spätere Machbarkeitsprüfung:** Wie werden Wichtigkeit, automatische Auswahl und ggf. Rückstufung ohne Fehlentscheidungen bestimmt? Wie viele hervorgehobene NPCs und Ereignisse bleiben bei langen Kampagnen performant? Was darf `#NPC Name` anzeigen/markieren, ohne Geheimnisse des NPC an den Spieler zu verraten? Wie werden Doppel-IDs, Namenswechsel, Tod, Abwesenheit, Save/Reload, Swipe und alte Spielstände behandelt? Was geschieht, wenn ein wichtiges Ereignis nicht sauber extrahiert oder eine Erinnerung objektiv falsch erzählt wurde? Wann lohnt sich gegenüber Stufe 1 tatsächlich die vertiefte Speicherung?
- **Ergänzung aus der Recherche (28.10.2026):** Abruf und Wissensgrenzen gibt es bereits. `src/retrieval.js` bewertet wie Generative Agents (Entität, Wichtigkeit, Wortnähe, Ort, Quest, Beziehung, Aktualität), RELEVANT erhält 25 % des Kontextbudgets, `learn` kennt Quellen, Gerüchte und `claims`. Stufe 2 bräuchte daher keine neue Wissensstruktur, sondern höchstens eine Bogen-Verdichtung aus Events, die nie Fakten erzeugt und bei Swipe oder Bearbeitung der Quellnachricht verfällt. Erst zu prüfen, wenn die Messung oben eine Lücke zeigt. [§7a](#7a-externe-ai-rpg-recherche-28102026--konsolidiertes-ergebnis-keine-freigabe), [Fachdatei §4.4](recherche/AI_RPG_RECHERCHE_20261028.md#44-bogen-gedächtnis-ebene-4-erst-nach-der-messung-aus-3b)
- **Qualitätsziel, kein Gameplayzwang:** Wichtige Personen sollen sich wie **dieselben Menschen mit gemeinsamer Geschichte** anfühlen; normale Figuren müssen nicht mehr als ihre stabile Rolle, Identität und grundlegende Haltung mitbringen. NPCs dürfen lügen, irren, unterschiedliche Perspektiven haben und sich entwickeln; sie dürfen nicht unbegründet alles wissen oder mechanisch bestätigte Ereignisse vergessen/umschreiben. **Kein Zwang zu zusätzlichen sozialen Gesprächen** im Testspielerleitfaden.

**Status ausdrücklich zurückgestellt:** Nur Ideenablage für eine spätere Design- und technische Machbarkeitsprüfung. **Aktuell keine Umsetzung und keine zusätzlichen Memory-Abnahmen**. Priorität bleibt bei **technischen Fehlern, zuverlässigen natürlichen Tests und Scaling F→E**.

## 4. Frühere Claude-/ChatGPT-Gegenreviews

Alte Einzelreviews zu Patch 8.2–8.4, Provider-Caching, Narrator-/Extractor-Verhalten und Runner-Integration sowie die damaligen Rot-/Grün-Überlegungen sind [im Git-Vollarchiv](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#4-konkrete-claude-gegenreviews--was-entschieden-was-verworfen-wurde) lesbar. Keine zweite laufende Patchplanung daraus ableiten.

## 5. Besondere Frage: Quest-Erweiterbarkeit E-/D-Rang

**Aktueller Stand:** Questgenerator = separater LLM-Aufruf; Engine validiert und bucht offizielle Quests, nicht Narrator. Bereits vorhanden: `GO, FIND, TALK, GET, GATHER, GIVE, DELIVER, USE, REPAIR, DEFEND, ESCORT, ATTACK, DEFEAT`; Novice bekommt engere Generatorvorgaben. Laut `content/rules.json` ungefähr Novice F 1–14, Proven E 15–29, Veteran D 30–44, Elite C 45–59. Die eigentliche Korrektheit neuer Gilden-Ränge muss später real getestet werden.

**Entscheidungsrichtung:** Nicht jeden neuen Rang und jede Quest ins JS hardcoden. Stabile **mechanische Zielbausteine**, kreatives LLM-Problem und Auftraggeber; Engine kontrolliert Abschluss. Ein D-Rang-Auftrag kann ein starker Einzelgegner oder mehrere Meilensteine sein. Erforderliche, optionale und alternative Bedingungen bei echtem Bedarf ergänzen; keine starren drei Stufen, keine Pflicht-Trophäen. Mehrstufige Aufgaben und alternative Verhandlung/Vertreibung sind noch nicht automatisch für jede Generierung mechanisch abgesichert.

## 6. Engine-only-Aktionen, Rest, Wait und SillyTavern – neuere Überlegung

**NEUER KANDIDAT, NICHT IMPLEMENTIERT:** Engine-only-Routinen statt Füllnarration; parallel natürliche Sprache und optionale `#`-Kommandos oder SillyTavern **Quick Replies/STscript** als UI-Auslöser. ST ist lediglich Bedienoberfläche; **nur Avereth** bestimmt Events, Zeit, Kosten, Player Agency und Replay.

| Aktion | Stand im .26-Code | Vorschlag |
|---|---|---|
| `#status/#skills/#bag/#quests/#journal/#map/#assign` | Bereits Engine-only-Kommandos, `#assign` state-changing | Bestehende Mechanik weiter nutzen, Performance-Barriere beachten |
| Guild-Board `board.read` | Offizielles Engine-Panel existiert, aber Narrator wiederholt es | **Engine-only-Panel** bei reinem Lesen (K01) |
| **Rest/Sleep** | `src/v4/commands.js engineMinutes()`, `recoveryEvents()`, `time.advanced` und `resource.changed` deterministisch; Narrator wird noch gefragt | Sicherer Ort: direkte Karte (Dauer, Regeneration, Uhrzeit), ohne leere Prosa. Wildnis/Dungeon: erst Gefahren-/Unterbrechungsprüfung, nicht blind volle Erholung |
| **Wait / Zeit vorspulen** | Zeitlogik vorhanden, aber nicht allgemeiner `#wait`-Fastpath | Bei sicherem Zeitabschnitt Engine-only, sonst Fristen/ereignisrelevante Unterbrechung berücksichtigen |
| **Fast Travel** | `go`, Journey-Pacing und sichere bekannte Dungeonrückwege teilweise vorhanden, aber kein genereller Fast-Travel-Befehl | Bekannte sichere Verbindungen direkt mit korrekter Weltzeit; gefährliches Überland erst nach ROAD-AHEAD/Encounter-Regel; **kein Teleportieren** |
| Standard-Guild-Quest annehmen/abgeben | Engine verwaltet Slip, READY, Payout | In wirklich mechanischen Standardfällen Panel-only prüfen; Gespräch über individuelle Bedingungen bleibt Narrator |
| Shop/Waren, Sammelverkauf, normale Potions, Gear | Teile bereits Engine-owned | Nur feste bekannte Angebote und einfache transaktionssichere Fälle Engine-only prüfen |
| ST Quick Replies | Plattformfunktion verfügbar, keine zugesagte Integration im Branch | Optionales Button-/Slashkommando-Frontend; freie Sprache bleibt vollwertig |

**Wichtig:** Die „Quick Replies“ erhöhen alleine keine Geschwindigkeit, solange die vorherige Extraktion mittels `pendingWorld.job` den neuen Command blockiert. Zuerst den Performance-Review bzw. sicheren Fast-Path klären.

### 6a. Zufallsereignis beim Rasten – ausdrückliches aktuelles Nutzerfeedback

Nutzer berichtet: **im .26-Livetest wiederholt stundenlang im Dungeon gerastet, immer ohne Vorkommnis**. Das fühlte sich mechanisch zu folgenlos an, weil der Narrator das Rasten einfach abwickelt.

- **Reisen haben bereits** in `commands.js roadLine()` einen deterministischen Hashwurf pro Etappe mit `rules.travel.leg_event_pct`, jedoch nur als **Erlaubnis einer erzählten Unterbrechung**; die Engine bestimmt noch nicht verbindlich welche Gegner/Hindernisse auftreten.
- **Rest/Sleep hat aktuell KEINEN entsprechenden orts-/risikoabhängigen Unterbrechungswurf.** Zeit und volle Regeneration werden bei angegebener Dauer gebucht.
- **Noch nicht eingebaut:** Gefahr nach Zone/Sicherheit, Dauer, Zeit seit letzter relevanter Begegnung/Pacing-Tendenz, geeignete konkrete Erlebnisse (Kampf, Entdeckung, andere Abenteurer, ggf. nichts).
- Der Nutzer erinnert sich an unsere frühere Diskussion: **zufällige Ereigniswahrscheinlichkeit kann bei langer ereignisloser Zeit steigen**; keine Garantie, dass immer nach X Nachrichten ein Event entsteht.
- **Noch keine freigegebene neue Mechanik.** Beim Engine-only-Rest oder ROAD AHEAD als wichtigen Design-Testfall berücksichtigen. Nicht stundenlange Ruhe im gefährlichen Dungeon ohne überprüfte Gefahrenlage automatisch als sicher behandeln; keine PC-Folgehandlung erfinden.
- **Präzisierter Vorschlag nach der Recherche (28.10.2026, keine Freigabe):**
  - **Gefahrenrate je Spielminute statt je Rastversuch:** p = 1 − e^(−λ·t). Geteilte Rasten tragen dasselbe Risiko, und ein Swipe würfelt über den Seed-Hash nicht neu.
  - λ steigt bei langer ereignisloser Zeit in gefährlicher Umgebung, **bleibt aber unter 100 %**. Die klassische Dota-PRD erreicht 100 % und damit einen festen Begegnungstermin; das ist nicht gewollt.
  - Zurücksetzen nach einem bedeutenden Ereignis, Ruhefenster nach schwerem Kampf, an sicheren Orten λ = 0.
  - Vorsicht (Wache, versteckter Lagerplatz) senkt λ.
  - Der Wurf liefert die **Minute der Unterbrechung**: Zeit und Regeneration werden nur bis dahin gebucht.
  - **Was** auftritt, legt die Engine aus der echten Belegung fest (Living-Dungeon-Slots, wandernde Gruppen, Regionstabelle), wie bei DUNGEON AHEAD. Das ist nicht nur Kampf.
  - ROAD AHEAD nutzt dieselbe Rate je Etappe.
  - [Fachdatei §4.1](recherche/AI_RPG_RECHERCHE_20261028.md#41-gefahr-bei-rast-warten-und-reise-nutzerfeedback-6a)

## 7. Spätere technische Möglichkeiten – keine Freigabe

- Provider/Performance: effektive Reasoningbudgets, Cache und echte LLM-Kosten getrennt messen; weniger Aufrufe nur mit identischen autoritativen World-Ergebnissen und Replay-Abnahme.
  - **Messbasis 28.10.2026:** Der Live-Runner erfasst die Werte je Rolle bereits (`report.md` „Performance“/„Laufzeit (gemessen)“).
  - Lauf `20261026-132758Z` (.98, 73 Eingaben):
    - Median 21 s Spielzeit je Zug, mit Testspieler Ø 25 s.
    - API-Zeit: Erzähler 45 %, Extraktor 35 % (davon Reparaturen 5 %), Planner 16 %.
    - **Prompt-Caching wirkt (≈ 75 %)**; frühere Werte mit `cached_tokens` = 0 und ≈ 19 Token/s aus V3/Pretest 5 sind überholt.
    - Der Extraktor schreibt so viele Inhaltszeichen wie der Erzähler.
  - Lange Tests entstehen vor allem durch die Zahl der Eingaben.
  - **Prüfideen:**
    - kompaktere Extraktor-Ausgabe (nur geänderte Felder), Gültigkeit messen;
    - Reparaturquote des Extraktors;
    - Erzähler-Länge;
    - Erzählermodell A/B (Endpoint bietet u. a. GLM-5.3, DeepSeek-V4-Pro, Kimi-K2.6; Rollenmodell-Unterstützung ungeprüft);
    - neue Kennzahl **Zeit je tatsächlich ausgeführter Handlung**.
  - [Fachdatei §4.8](recherche/AI_RPG_RECHERCHE_20261028.md#48-laufzeit--korrigierte-messbasis)
- ROAD AHEAD, Such- und Chase-Erweiterungen: getrennte Kandidaten statt neuer pauschaler Reise-/NPC-Engine; erst nach natürlichen Blockern priorisieren.
- Optionales UI/UX: Engine-only-Anzeigen, Quick-Replies, Fast Travel, Rest-/Wait-Komfort. Patch 10A nicht als Ganzes neu planen.
- Aktuell detailliert offen: [F→E-Scaling GPT](testrun_10b/scaling_gpt.md), [F-/E-Entwurf Sol](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [Balance-Ersteindrücke](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).
- Historische Performance-/8.2-Versuche mit methodischen Grenzen: [vollständiger Originaltext](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7-performance--realer-26-test-und-patch-82-reviewentwurf).

### 7a. Externe AI-RPG-Recherche (28.10.2026) – konsolidiertes Ergebnis, **keine Freigabe**

**Einordnung:**
- Entstanden in vier Schritten: GPT-Recherche (erste Fassung dieses Abschnitts, `8adf9cb`), unabhängige Claude-Gegenrecherche mit Code-Abgleich auf `.108`, GPT-Bewertung, Claude-Endbewertung mit Messung aus einem vorhandenen Lauf-ZIP.
- Vollständiger Abgleich, geprüfte Quellenlage, Umsetzungswege und alle Quellen: **[Fachdatei](recherche/AI_RPG_RECHERCHE_20261028.md)**.
- Externe Projekte sind Ideengeber, keine Vorlage zur Nachahmung. Priorität bleibt bei natürlichem Batch, technischer Abnahme, F→E-Scaling und Combat Main/Minor.

**Kernaussagen:**
1. **Keine neue Architektur.** Ernstzunehmende Projekte trennen ebenfalls „LLM erzählt und schlägt vor, Code entscheidet“ (Tapestria, Quilltale, Intra, World-State Transformations 2026). RPGBench: LLMs erzählen gut, setzen Regeln aber schwach durch.
2. **Avereth liegt bewusst auf der strengen Seite.** Friends & Fables aktualisiert den Zustand „probabilistic“ über nachgelagerte LLMs; reine LLM-RPGs wie OurDream brauchen manuelle Korrekturen. Craft benennt den Preis der Strenge: „invisible walls“. Fail-soft ist die Brücke; diese Wände sollen künftig gemessen werden.
3. **Vieles existiert schon.**
   - Retrieval nach Generative Agents (`src/retrieval.js`).
   - Wissen je Person mit Übertragungsweg, Quelle, Gerücht und `claim` (`src/delta.js`).
   - Fakten mit `until` statt Löschen.
   - Deterministische Simulation außerhalb der Szene (`src/v4/living.js` `syncEvents`).
   - Seed-Hash-Wurf je Reiseetappe und DUNGEON AHEAD.
   - Der Runner misst bereits Laufzeit je Rolle.

   Der Hebel liegt daher in **besserer Nutzung vorhandener Informationen**, weniger in neuen Speicherstrukturen.
4. **Neue Weltdynamik zuerst deterministisch und replaybar**, mit möglichst wenigen zusätzlichen LLM-Aufrufen.

| Idee | Konsolidierte Prüfrichtung (keine Freigabe) | Fachdatei |
|---|---|---|
| **Gefahr bei Rast, Warten, Reise** | Präzisiert in **§6a**: Rate je Spielminute, steigend, aber unter 100 %, Unterbrechungsminute mit anteiliger Regeneration, Inhalt aus echter Belegung. | [§4.1](recherche/AI_RPG_RECHERCHE_20261028.md#41-gefahr-bei-rast-warten-und-reise-nutzerfeedback-6a) |
| **NPC- und Fraktionsuhren** | Wenige Fortschrittsuhren (Blades in the Dark, Dungeon-World-Fronts) für Stufe-2-NPCs (§3b), Fraktionen und Konflikte; Prototyp etwa 3 je Region.<br>Die Uhr bildet eine Absicht ab, kein Drehbuch:<br>• tickt nur bei erfüllten Weltbedingungen;<br>• kann anhalten oder zurücklaufen;<br>• Alarics validierte Handlungen drehen sie vor oder zurück.<br>Eine volle Uhr hat nur kleine, engine-eigene Folgen (NPC-Ort, Agenda, offener Thread, Aushang), nie XP, Geld oder Kampf. Tick nach dem Muster von `syncEvents`. | [§4.2](recherche/AI_RPG_RECHERCHE_20261028.md#42-npc--und-fraktionsuhren) |
| **Wissensverbreitung außerhalb der Szene** | Kein neues Wissensmodell. Haltung nach Übertragungsweg wie in `delta.js`, nicht nach Zahl der Weitergaben.<br>Die Engine erfindet keine Verfälschungen, das wäre nicht erzählter Inhalt.<br>Verbreitung bei vergehender Zeit über Ort, kontaktreiche Berufe und Beziehungen, mit Verzögerung; Geheimnisse nie. Zuerst nur im Kontext wirksam, kein globaler Ruf. | [§4.3](recherche/AI_RPG_RECHERCHE_20261028.md#43-wissensverbreitung-außerhalb-der-szene) |
| **Bogen-Gedächtnis (Ebene 4)** | Erst nach der Messung aus §3b. Szenenbruch als Auslöser, Event mit Text und Quell-Event-IDs, nie Fakten; verfällt bei Swipe oder Bearbeitung der Quelle (Smart Memory kann das nicht). | [§4.4](recherche/AI_RPG_RECHERCHE_20261028.md#44-bogen-gedächtnis-ebene-4-erst-nach-der-messung-aus-3b) |
| **Story Sifting statt LLM-Aftermath** | Feste Muster über dem Event-Log (Felt/Winnow): Rettung → Wiedersehen, Versprechen → Frist, Schuld, wiederholter Konflikt.<br>**Nur Erzählhinweis im RELEVANT-Kontext, nie gebucht.** Höchstens 1 Hinweis je Zug, mit Wiederholungsschutz. Freie Konflikte werden nicht automatisch zu Quests. | [§4.5](recherche/AI_RPG_RECHERCHE_20261028.md#45-story-sifting-nur-als-erzählhinweis) |
| **Kontext nach Ort und Aufgabe** | Bleibt gültig. Zuerst Abruflücken messen, keine Vektordatenbank als Pflicht, keine ST-Memory-Erweiterungen parallel zur Avereth-Persistenz. | [§2/§3](recherche/AI_RPG_RECHERCHE_20261028.md#3-was-avereth-bereits-hat-code-108) |
| **Skills als Weltoperationen; Summons/Begleiter** | Effekt-Tags auf vorhandene Delta-Typen, ohne feste Ausführungsreihenfolge.<br>Summons: keine kostenlosen Zusatzaktionen, Befehl kostet eine Aktion, Anzahl begrenzt (PF2e-Minion als Muster). Prototyp-Hypothese: 1 Wesen, Befehl = Minor. Balance erst mit Main/Minor. | [§4.6/§4.7](recherche/AI_RPG_RECHERCHE_20261028.md#46-skills-als-weltoperationen) |
| **Laufzeit** | Siehe **§7**: aktuelle Messbasis, Caching wirkt bereits, Hebel bei Erzähler-Länge und Extraktor-Ausgabe, neue Kennzahl „Zeit je ausgeführter Handlung“. | [§4.8](recherche/AI_RPG_RECHERCHE_20261028.md#48-laufzeit--korrigierte-messbasis) |
| **Spielgefühl messen** | Objektiv aus Events: Wiederbegegnungen, Threads, Orts- und Szenenvielfalt, wiederholte Auftragsarten, **„unsichtbare Wände“ je 100 Eingaben**.<br>**Wiederholungsmaß ohne LLM:** wiederkehrende Wort-5-Gramme je NPC bzw. Erzähler.<br>Dazu eine qualitative Stichprobe mit festem Protokoll (Wiederbegegnungen, je 50 Eingaben, Szenen nach Ablehnungen). Ein LLM-Bewerter ist höchstens Hilfsmittel. Dasselbe Protokoll für den eigenen OurDream-Vergleich. | [§4.9](recherche/AI_RPG_RECHERCHE_20261028.md#49-spielgefühl-messen) |

**Quellenlage, korrigiert gegenüber der ersten Fassung:**
- Tapestria ist noch nicht veröffentlicht (Designdokument mit Warteliste).
- Quilltale ist ein kleines Projekt mit Selbstmessung.
- Craft veröffentlicht keinen Harness.
- OurDream:
  - Öffentlich gefunden ist nur „Obsidian Summoner RPG [V4.6]“ auf winkme.ai (Valdoria, `#system/#bag/#pets`).
  - Creator-Zuordnung, „ourdream-ai-wiki“ und die Goblin-Overlord-Fassung sind **nicht belegt**; „Mørkyn“ war nicht auffindbar.
  - Grundlage für Vergleiche ist nur der eigene Test mit kopierten Originalszenen.

**Reihenfolge:**
1. **Jetzt, ohne Produktänderung:**
   - Batchauswertung einschließlich der vorhandenen Laufzeittabellen;
   - Zeit je ausgeführter Handlung;
   - „unsichtbare Wände“;
   - qualitative Stichprobe.
2. **Nach F→E-Scaling und Combat Main/Minor:** Gefahr bei Rast und Reise, danach ein Uhren-Prototyp.
3. **Bei nachgewiesenem Bedarf:** Bogen-Gedächtnis, Sifting-Hinweise, Wissensverbreitung.
4. **Später, eigenständig designen:** Skill-Weltoperationen, Summons und Begleiter.
5. **Nicht verfolgen:** Vektordatenbank als Pflicht, parallele ST-Memory-Erweiterungen, dauerlaufende Multi-Agent-LLMs.

Zusätzliche LLM-Aufrufe, Kosten, Save/Reload/Swipe, Geheimnisgrenzen und Replay-Sicherheit bleiben jeweils eigene Abnahmekriterien.

### 7b. Vertiefende externe Recherche A – Monsterökologie und Creature-Design (28.10.2026)

**Analyseauftrag angelegt, keine Implementierungsfreigabe:** [Monsterökologie, Sapienz, Sonderfähigkeiten – Forschungs- und Analyseauftrag](recherche/ANALYSEAUFTRAG_MONSTERDESIGN_20261028.md). Externe Designmuster zu Habitat/Verhalten, freien Arten auf vorhandenen Kampankern, anatomisch korrektem Loot, intelligenten Monsterkulturen und **mechanisch echten** Spezialfähigkeiten prüfen. Historischen GPT-/Sol-Monsteraudit §§5–7 im [10B-Archiv](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#5-monster--lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse) kritisch als Ausgangslage verwenden, nicht wiederholen. M-D/M-C bleiben **unverbindliche Hypothesen**. Keine Code-/Content-/Runner-/Batchänderung.

**Ergebnis (28.10.2026, Claude, keine Freigabe):** [Fachanalyse Monsterdesign](recherche/MONSTERDESIGN_ANALYSE_20261028.md) auf Code-Stand .109.
- **Ankermodell bestätigt:** Das „Reskin“-Prinzip aus PF2 trägt freie Arten auf wenigen Ankern; ein Bestiarium (M-A) ist nicht nötig.
- **Neu belegte Lücken:**
  - Geweih ohne `only_if` (Hase/Hirschkuh/Ziege) besteht in .109 weiter.
  - Humanoide werfen Waffen unabhängig von gezeigter Bewaffnung ab.
  - Dieselbe Art kann verschiedene Anker erhalten.
  - Kreaturen haben im Kampf `sapient: false`; als Person erhielten sie menschliche Vorlagen.
  - Für Gegner gibt es keinen ausführbaren Statuseffekt, kein Element und keine Immunität.
  - Core-#7/#8-Texte versprechen Elite-/Boss-Fähigkeiten ohne Code.
- **Drei priorisierte Pakete:**
  1. **A „Glaubwürdige Körper“** (M-D+: Spezialbeute und Waffen nur mit Beleg, Artkonsistenz per Abfrage, kein neues Feld).
  2. **C „Sapienz, Lage, Populationen“** (`sapient` mit Beleg, Lagehinweise statt Moralzahl, `place.population` über Jagdorte hinaus).
  3. **B „Ausführbare Signaturen und Bosse“** (Gift, angekündigter Recharge-Angriff, eine Resistenz oder Schwäche, Flug, Bossphasen); erst nach Main/Minor und F→E-Scaling.
- Acht offene Nutzerentscheidungen stehen in der Fachanalyse §7.

**GPT-Gegenreview und Nutzerüberlegung zur Ausrüstung (nur Bewertungen, 28.10.2026):** Die [Fachanalyse, neuer §10](recherche/MONSTERDESIGN_ANALYSE_20261028.md) ergänzt rollenabhängige **Standard-Loadouts** (etwa Goblin-Kämpfer/Dolch, Späher/Bogen, Schamane/Fokus) als mögliche Vereinfachung: **Besitz, eingesetzter Kampf-Angriff und verwertbarer Loot getrennt**, keine Phantomwaffen und kein pauschaler „alle Goblins haben Dolche“-Zwang. Weiterer Vorbehalt: kein globaler Art→Anker-Lock, Paket A nicht automatisch balance-neutral, C-Sapienz/Lage/Populationen getrennt planen, B-Fähigkeiten nur mit Enginewirkung und taktischen Gegenmöglichkeiten; Körperteil als Beute erzwingt nicht automatisch einen Kampfeffekt. **Nichts davon ist entschieden oder implementierungsfreigegeben.**

## 8. Pflege

Nur echte neue oder bewusst zurückgestellte Ideen hier eintragen, mit Status und Nachweislink. Historische Patchberichte nicht wieder kopieren; tiefe Analysen in laufenden Fachdateien. **Jetzt Vorrang für technische Fehler, natürliche Sechserbatch-Abnahme und F→E-Scaling.**
