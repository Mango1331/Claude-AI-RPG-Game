# Avereth Engine – Ideenarchiv und spätere Kandidaten

**Stand:** 27.10.2026. **Ideen sind keine Patchfreigaben.** Aktueller Stand ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md), Designentscheidungen in [02](02_DESIGN_KANON.md), technische 10B-Befunde in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

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

## 7. Spätere technische Möglichkeiten – keine Freigabe

- Provider/Performance: effektive Reasoningbudgets, Cache und echte LLM-Kosten getrennt messen; weniger Aufrufe nur mit identischen autoritativen World-Ergebnissen und Replay-Abnahme.
- ROAD AHEAD, Such- und Chase-Erweiterungen: getrennte Kandidaten statt neuer pauschaler Reise-/NPC-Engine; erst nach natürlichen Blockern priorisieren.
- Optionales UI/UX: Engine-only-Anzeigen, Quick-Replies, Fast Travel, Rest-/Wait-Komfort. Patch 10A nicht als Ganzes neu planen.
- Aktuell detailliert offen: [F→E-Scaling GPT](testrun_10b/scaling_gpt.md), [F-/E-Entwurf Sol](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [Balance-Ersteindrücke](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).
- Historische Performance-/8.2-Versuche mit methodischen Grenzen: [vollständiger Originaltext](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7-performance--realer-26-test-und-patch-82-reviewentwurf).

## 8. Pflege

Nur echte neue oder bewusst zurückgestellte Ideen hier eintragen, mit Status und Nachweislink. Historische Patchberichte nicht wieder kopieren; tiefe Analysen in laufenden Fachdateien. **Jetzt Vorrang für technische Fehler, natürliche Sechserbatch-Abnahme und F→E-Scaling.**
