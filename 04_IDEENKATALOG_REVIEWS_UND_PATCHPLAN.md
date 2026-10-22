# Avereth Engine – Ideenarchiv, Claude-Gegenreviews und mögliche Patches

**Dokumenttyp:** nichtbindendes Entscheidungsarchiv für Chat-Übergaben; **Stand:** 22.10.2026 · Patch 8.4 (.29) implementiert und unabhängig im Code geprüft; Guard-/DEFEND-Task-Restinkonsistenz dokumentiert.  
**Quelle:** intensive Auswertung von Git, älteren Projekt-Chats, realen SillyTavern-Tests, externen Referenzen und **mehreren unabhängigen Gegenreviews in einer zweiten Claude-Sitzung**.  
**WICHTIG:** Dieses Dokument unterscheidet streng **IMPLEMENTIERT**, **BESTEHENDER DESIGN-KANON**, **ZUR REVIEW VORBEREITET**, **PLANKANDIDAT**, **EXPERIMENT**. Die Aufnahme einer Idee bedeutet **keine Freigabe**. Maßgeblich bleiben `02_DESIGN_KANON.md`, `03_AKTUELLER_PROJEKTSTAND.md` und aktueller Git-Code.

## 1. Aktueller Entscheidungsstand – nicht verwechseln

| Bereich | Stand 22.10.2026 | Nächster Schritt |
|---|---|---|
| **Patch 8 Living Dungeons (.25)** | Implementiert, erste reale Tests vorhanden; .25 zeigte doppelte Gate-Gebühr, voneinander getrennte Käfer-Encounter und falsche Todesnarration | Historischer Regressionstest |
| **Patch 8.1 (.26)** | **IMPLEMENTIERT / Git-verifiziert:** `c6baa06e159f16069efd728844c7afe7c7dc186a`, Build `4.3.0-c.6.6.26`. Gate, Group Combat, Quest-Population, UI-Panel, Combat-Truth | Laufender/fortgeschrittener GLM-5.3-Flash-Livetest; vollständigen Verlauf samt Boss/Reset noch nicht als bestätigt ausgeben |
| **Patch 8.2 (.27, ef4a819)** | **IMPLEMENTIERT / Git-Code verifiziert**; .27-GLM-Livetest 22.10. mit Telemetrie: Extractor-Median 4,87 s (7), Narrator-Median 17,85 s (7; zwei extreme Ausreißer), keine kausale Beschleunigung bewiesen | Diagnosepatch bleibt als Grundlage; A0/A/C erst mit belastbarem Weltvergleich und separaten Providerläufen bewerten |
| **Patch 8.3 (.28, 70cbb5e)** | **IMPLEMENTIERT / historisch:** echter .28-Glimmerdeep-Lauf bewies Zugang zu Ebene 1, Kill-/Loot-/XP-/Questlogik, aber vier Solo-Ambushes und falschen Cull-Task. **Diese beiden direkten reinen Beetle-Fälle führte zu Patch 8.4.** Boss/Floor-Clear noch nicht live | Regressionen als historisch dokumentierte Prüffälle behalten, nicht den alten Bug als aktuellen Stand darstellen |
| **Patch 8.4 (.29, 4d08d4f)** | **IMPLEMENTIERT / unabhängig im Git-Code geprüft:** Unverdeckte Angriffe holen bereits etablierte feindliche Gruppenmitglieder sofort in denselben Encounter, bewahren einzelnes Ambush-Opening und echte Stealth. Reiner Dungeon-Cull zeigt angeglichene Task-Zahl; `amountText` entfernt Doppelmengen. Claude: 995/995, erfolgreicher C-Smoke 21/21 mit sporadischem ST-Preset-Status-Race. **Restfehler:** DEFEAT+DEFEND kann im Task noch „six“ bei Objective/EndState „four“ zeigen | Kleiner Guard-Cull-Task-Nachtest/-Fix, dann echter .29-Providerkampf bis Boss/Floor-Clear; Testqualität und Smoke-Race separat (§15, 03 §5l) |
| **Engine Actions & QoL** | **KANDIDAT**, einschließlich Engine-only-Gildenboard, Rest/Schlaf/Wait, sichere Rückwege, ST-Quick-Replies; noch kein Patch beschlossen | Umfang und mögliche Bündelung nach Performance-Review entscheiden |
| **Patch 9 Organic Classes/Growth** | **VERBINDLICHES LANGFRISTIGES ZIEL, NICHT IMPLEMENTIERT.** Organische Entwicklung, Skill-Bausteine, bedeutende Nutzungsereignisse; *keine* Änderung der kanonischen Ausgangsklassen aus dieser Ideensammlung ableiten | Ausführliche Patchplanung nach .26-/Performance-Befunden; Reihenfolge zu ROAD AHEAD noch offen |
| **ROAD AHEAD** | **NOCH NICHT FREIGEGEBENER KANDIDAT** für Engine-verankerte Reiseetappen und Suche | Bei wiederholt schlechten Reise-/Such-Livetests ggf. vor Patch 9; sonst Patch 9 gemäß früherer Roadmap |
| **Patch 10B / Polish** | Bisheriger Plan: Combat-Utility-HUD, Focused Ward/Bewegung, weitere UI-/Balancingarbeit; Umfang noch nicht abschließend | Nicht still zu einem neuen Großpatch ausweiten |

**Wichtig bei jedem neuen Chat:** Nutzer hat ausdrücklich gebeten, **F1/#71 (Umstellung auf drei Standardklassen) aus der Videospielisierungsdebatte zu ignorieren**. Kanonische Ausgangsklassen bleiben `Warrior, Mage, Guardian, Duelist, Ranger` (Datei 02). Diskussionen über Organic Growth sind davon getrennt. Nichts dazu ungefragt ändern.

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

## 4. Konkrete Claude-Gegenreviews – was entschieden, was verworfen wurde

In mehreren unabhängigen Claude-Reviewrunden wurden der 141-Punkte-Katalog und ChatGPTs Antworten wechselseitig kritisch geprüft. Ergebnis:

### 4.1 Zuspruch und bekräftigte Erkenntnisse

- **System/Resolved/Open** ist ein gutes *Prinzip*, kein persistentes neues `turn.mode`; aus autorisierter Aktion abgeleitet.
- **Questgenerator:** separates LLM erzeugt offizielle Listings (`boardRequest/parseBoard/bookBoard`); JS-Engine prüft, begrenzt und persistiert; Narrator ist dafür **nicht** die Quelle. E-/D-Quests sollen auch ohne dauernd neue JavaScript-Sonderfälle möglich bleiben.
- **ROAD AHEAD:** Engine muss gewöhnliche mechanische Reiseunterbrechungen (Monsteridentitäten, Loot-Funde, Hindernisse) **vor** Erzählung verankern; Narrator gestaltet Atmosphäre, Personen, Gespräche. Ungewöhnliche neue Bedrohungen bleiben über vorhandene Hostile/Envelope/Commitment-Pfade möglich.
- **Caching:** wechselnde World-Info-Einträge können einen statischen Prompt-Prefix aufbrechen; Lorebook-Position bzw. `loreSource: engine` getrennt vergleichen. Nicht während derselben fortlaufenden Livetestkampagne.
- **Performance:** bei konkreten Vorgängen unnötige LLM-Schichten vermeiden; reale Latenz, Cache-Tokens, Time-to-first-token und Korrektheit vergleichen.
- **NPCs:** persistente wichtige Rollen ja; keine autonome Vollsimulation.
- **UI:** vorhandene `#status`, `#map`, `#quests`, `#skills` und System-Panel nutzen statt neu implementieren.

### 4.2 Abgewogene Einschränkungen

- **Starrer Narrator-Längen-Cap (150 Wörter):** abgelehnt. Kürzere Standardkampfrunden als Richtwert, epischer Bosskampf darf länger sein.
- **Gegner-Intent bei jedem Zug anzeigen:** nicht als Großumbau. Zunächst nur besonders starke vorbereitete Angriffe telegraphieren.
- **PC-Tod:** keine kostenlose Rettung; kleine Systemkarte `CHARACTER DEAD` sinnvoll, ggf. Text zum Zurückswipen, **kein UI-Knopf ohne echte Funktion**.
- **Organic Growth:** Nutzungszähler **plus mechanisch bestätigte besondere Momente** und validierte kreative Ergebnisse, kein rein quantitatives Powerleveling.
- **Feste Questketten:** stabile lokale Konflikte möglich, aber keine Pflicht-Hauptquest-Skripte.
- **Questfamilien:** ggf. primärer Typ und `MIXED`/mehrere Teilziele; mechanische Erfüllung enger, Story frei.
- **Fold-Memo:** vorab die lokale Kostenzeit messen. Höchstens kurzlebiger Cache in einer unveränderten Verarbeitungsphase; **kein persistenter Replay-riskanter Cache**.
- **Combat-Extractor-lite:** nicht per Dialog-/Großbuchstabenheuristik aus Narrator-Text entscheiden. Geeignetheit aus autorisierten Aktionen *vor* Narration ableiten, Deltas für neue Fakten/Objekte/Intent/Kreaturen trotzdem möglich. A/B, da Einsparung möglicherweise nur bei Promptanweisungen liegt.
- **Fast-Travel/ROAD-AHEAD-Determinismus:** stabile Hash-Entscheidung aus Seed + *konkreter Reiseinstanz* + Route + Etappe, als Event gespeichert; sonst würden identische Routen stets identische Begegnungen wiederholen. Nur nächste Etappe vorfestlegen. Fundentdeckung ≠ automatisch nehmen/einsammeln.
- **ROAD AHEAD vs. Patch 9:** nach .26-Reisen entscheiden: mehrere nutzlose Stopps, Phantomgegner, häufige Reise-/Such-Extractorprobleme → ROAD AHEAD zuerst; überwiegend gute Reisen und Bedarf bei Skills/Progression → Patch 9 gemäß ursprünglicher Roadmap. Bei gemischter Evidenz standardmäßig Patch 9.

### 4.3 Engine-only-Gildenboard – technische Lösung aus Review

Vorsicht: **Nicht** direkt die frühe `m.route === 'panel'`-Abzweigung in `runtime.js` für `board.read` benutzen: sie umgeht `boardFor`, `generateBoard` und `bookBoard`!  
**Konsens:** Vollständigen normalen V4-C-Pfad laufen lassen (bei Bedarf eigener Board-LLM-Aufruf, `playerTurnV4`, `quest.created`, `board.refreshed`, `board.shown`, Event-Record). Nur wenn **wirklich ausschließlich** Boardlesen aufgelöst wurde, `command: {panels:[boardCard(...)], llm:null}` zurückgeben – wie beim vorhandenen CLARIFY-Muster in `src/v4/turn.js`. Vorhandene Runtime liefert dann `action: panels`, ohne Narrator und Extractor. Gemischtes „Board lesen und Schreiber fragen“ bleibt voller Storyturn.  
**Test:** Die Panel-Route blendet den auslösenden Usertext aus künftiger Prompt-Historie; nächster Narrator muss trotzdem den kanonisch gespeicherten Kontext „Alaric las gerade das Board“ samt gesehenen Quests kennen. Replays, Swipe, Tagesboard und Quest-ID vollständig prüfen.

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

## 7. Performance – realer .26-Test und Patch-8.2-Reviewentwurf

**Messungen aus ChatGPT-Auswertung der am 21.10. besprochenen Live-Exporte**; kleine nicht kontrollierte Stichprobe, Versionseffekt nicht allein belegt:

| Kennzahl | Vorher .25 | Neuer .26 |
|---|---:|---:|
| Extractor-Median | ca. **4,0 Sekunden**, 9 Aufrufe | ca. **22,8 Sekunden**, 18 Aufrufe |
| Planner-Median | ca. 2,05 s | ca. 2,21 s |
| .26 Extractor über 20s | – | 9/18 |
| .26 auffällige Extractor-Aufrufe | – | 48,1s, 44,3s, 37,6s und weitere |
| .26 Completion-Logs | – | 6 Extractor-Requests `finish_reason:length` bei 2.500 Tokens; fünf abgeschlossene Extraktionen mit Repair; ein leerer Narrator-Reply bei 4.096-Tokens-Cap |

**`#assign int 5`-Vorfall:** vorheriger Kampf-Narrator ca. 12:31:52, Extractor 34,27 s; Nutzer `#assign int 5` ca. 12:32:19, Systempanel erst ca. 12:32:27, also ~7,5s Wartezeit. **Konkreter Codegrund:** `avereth-engine/index.js` wartet vor normalem neuem Turn mit `await pendingWorld.job` auf vorherigen Extractor, **auch bei `#assign`**. Barriere existierte bereits in .25. Nicht als Beweis eines .26-eigenen Defekts formulieren.

**Performance-Review-Prompt wurde bereits vollständig formuliert (Arbeitstitel „Patch 8.2 – Runtime Performance, Extractor Latency & Fast System Actions“).** Zweite Claude-Sitzung soll **nur unabhängig reviewen**, nicht committen. Sein Leistungsumfang:

- **P1 Messung:** pendingWorld-Barriere, Planner/Narrator/Extractor, Repair, Fold, Provider-Tokens/Cache, Event-/UI-/Savezeit.
- **P2 Extractor:** Reasoning-/Length-Abbrüche, doppelte Kataloge/Statusdaten, sinnvolles Repair, keine pauschale Tokenlimit-Erhöhung, keine Delta-Verluste.
- **P3 Fast-Systembefehle:** `#assign` soll zügig sein, aber **NICHT** einfach `await pendingWorld.job` entfernen; sonst kann `laterTurns()` den alten Extraktorcommit verweigern. Sequenz/Event-Persistenz korrekt halten.
- **P4 Sichere LLM-Abkürzungen:** reine Engine-Befehle ohne Planner/Narrator/Extractor; Board nicht vorschnell dazu mischen, sofern Generator gebraucht.
- **P5 Cache-A/B:** aktuelle Lore/World Info vs. nach Char Defs vs. `loreSource: engine`; gleiche Testsequenzen, `cached_tokens`, Antwortbeginn, Qualität. **Separater Test, nicht mitten im aktuellen Run.**
- **P6 `foldChat` messen**, nur bei echtem Bottleneck sehr kurzfristige, korrekt invalidierte Memoisierung.
- **Nicht im Umfang:** ROAD AHEAD, Patch 9, große UI-Neufassung, komplettes `combat_lite`, Modellwechsel, große 3→2-Aufruf-Neuarchitektur.
- **Abnahme:** kontrollierter langsamer vorangehender Extractor + `#assign`, kein verlorener World-Commit, keine doppelten Events, Swipe/Regenerate/Edit/Chatwechsel, echte End-to-End-Latenz.

Nach Review **Befunde/Alternative kritisch abgleichen**, erst dann Implementierungsauftrag erstellen. Kein bestätigter Fix zum Stand 21.10.

## 8. Offene Reihenfolge und konkrete Tests

**Aktuell dringlich:** .26-Livetest und Performance. Mechanisch im berichteten .26-Run bereits positiv: **drei Glas-Käfer in einem Encounter**, später **zwei Mineral Slimes in einem Encounter**, passender Guild-Dungeonauftrag ohne zweite Gatezahlung, Loot/XP und Level 2. Noch nicht gesamter Floor/Boss/Reset vollständig geprüft.

**Wichtig für den nächsten Chat:**
1. Aktuellen Git-HEAD prüfen, Dateien 01–04 lesen, .26-Originalexporte ansehen.
2. Performance-Review von zweiter Claude-Sitzung entgegennehmen und unabhängig beurteilen. **8.2 ist bis dahin nicht freigegeben.**
3. Den 20-Punkte-Katalog **nicht** automatisch implementieren; nächster Entscheid voraussichtlich über kleines Engine Actions & QoL-Paket.
4. ROAD AHEAD vor Patch 9 **nur** bei echten Wiederholungsproblemen außerhalb von Dungeons (unbegründete Reise-Stopps, Phantomgegner, Reise-/Such-Extractor-Längenabbrüche); bei guter Reisemechanik Patch 9 priorisieren.
5. Engine-only-Rest darf nicht ohne Gefahren-/Eventregel in unsicheren Orten durchgebucht werden.
6. Größere Features in zweiter Claude-Sitzung reviewen; kleine eindeutige Fixes nicht endlos gegenprüfen; laufende Tests nicht durch Settingswechsel verfälschen.
7. Keine Git-Veränderung im Entwicklungsbranch oder neue Patchimplementierung nur aufgrund dieser Dokumentation.

**Quellenhinweis:** Der vollständige historische 141er-Katalog und die Reviewdialoge befinden sich in den früheren ChatGPT-Projektchats; diese MD ist die konsolidierte Wiederaufnahme, keine wortgetreue Abschrift. Die konkrete 20-Kandidaten-Auswahl, Designentscheidungen, Gegenargumente und der Performance-Patchreview sind hier möglichst vollständig zusammengefasst.


## 9. Neues unabhängiges Claude-Review des Performance-Patches 8.2 – 21.10.2026

**Quelle:** zweite Claude-Architektursitzung, vom Nutzer als Textdatei `Eingefügter Text(20261021-131712).txt` im anschließenden Projektchat übergeben. **Nur Review/Lesen – keine Codeänderung.** Aktueller Code-HEAD bei Review `c6baa06`. Der Performance-Patch ist **noch nicht freigegeben oder implementiert**.

### 9.1 Neue wesentliche Messbefunde aus Claudes Vergleich .25 vs. .26

| Messung | Ergebnis / Einordnung |
|---|---|
| Extractor-Systemprompt | Laut Claude in .25/.26 exakt gleich: 30.089 Zeichen |
| Extractor-Promptgröße insgesamt | durchschnittlich 8.376 → 8.509 Tokens (**+1,6 %**) |
| GLM-Durchsatz | etwa 72–78 generierte Tokens/s in beiden Builds |
| Board-Extractor vergleichbare Anfrage | .25: **297 Tokens, 3,8 s**; .26: **2.271 Tokens, 31,5 s**, Prompt ~9.077 vs. ~9.071 Tokens |
| .26 Extractor | 18 Aufrufe, Median **22,8 s**, p90 laut Claude **37,6 s**, 5 Reparaturen, 6 Length-Abbrüche am 2.500-Tokenlimit |
| .26 Narrator | Einzelne ausufernde Reasoning-Spuren, ein leerer Reply am 4.096-Tokenlimit |
| Planner | Weiterhin ~2,2 s Median, wenig betroffen |
| Repair nach leerem Extraktor | Laut Claude kurz und effektiv; aufwendiges Reasoning geschah vor allem im ersten Request |
| Im ST-Preset | `reasoning_effort: low`, `clear_thinking: true` für alle Rollen; `v4Llm` berücksichtigt gegenwärtig den `purpose` nicht für separate Requestparameter |
| Narrator-Cache | Laut Claude im neuen .26-Lauf im Mittel ~48 % statt ~6 % bei .25; Änderungen an World-Info-Settings vor Interpretation klären |

**Kausale Bewertung:** Längere Reasoning-Ausgaben bei praktisch gleich großem Prompt sind belegt; reine Katalog-Aufblähung als Hauptursache **unwahrscheinlich**. Provider-/Modellschwankung **plausibel, nicht bewiesen**. Kleine neue Kataloginhalte könnten das Entscheidungsverhalten trotzdem beeinflussen; keine voreilige vollständige Entwarnung für alle Promptänderungen.

### 9.2 Claudes Empfehlungen für einen kleineren 8.2a-Patch

- **S1 Messung:** optionale Provider-`usage`/`finish_reason`, Latenzen und Zeit an `pendingWorld.job`, `foldChat`-Messung; kein Mitschreiben kompletter Prompts.
- **S2 rollenspezifische Request-Extras:** `plan`, `extract`, `board` getrennt steuerbar, ohne bestehendes globales ST-Preset oder den Narrator umzuschalten; bei leeren Zusatzfeldern aktuelle Requests unverändert.
- **S3 Benchmark:** originale bzw. aus echten .25/.26-Fixtures exakt reproduzierte Extractor-Anfragen A/B/C mehrfach ausführen; Token, Zeit, Length-Fehler und **inhaltliche Korrektheit** der Delta-Ergebnisse vergleichen; kein normaler npm-Unit-Test.
- **S4 leerer Narrator-Reply:** keine Extractor-Verarbeitung für leere Erzählung; sichtbarer Fehler-/Regenerate-Hinweis.
- **Auslagern:** `#assign`-Fast-Path wegen komplizierter Eventreihenfolge; Engine-only-Board in separaten QoL-Patch; Lore-Caching-Konfiguration separat vergleichen; `foldChat` nur optimieren, wenn messbar relevant.

**Warum `#assign` nicht blind beschleunigen:** `closeLatePending()` und `laterTurns()` schützen den vorherigen Extractor-Commit. Ein Systembefehl mit Stats-Events vor diesem Commit könnte dessen Weltänderungen entwerten. Schutzbarriere nicht einfach überspringen; kurzere Extractor-Laufzeit soll Wartezeit bereits reduzieren.

### 9.3 ChatGPTs kritische Rückprüfung des neuen Reviews

Am unveränderten Code `index.js` und `src/v4/runtime.js` überprüft:

1. **Provider-Steuerung nicht überschätzen.** Offizielle Modelldokumentation `https://huggingface.co/zai-org/GLM-5.3-Flash` nennt für GLM-5.3-Flash lediglich `reasoning_effort: low|high|max`, und `max` ist Standard, wenn Parameter fehlt oder falsch ist. Das aktuell verwendete `low` ist bereits die kleinste dokumentierte Stufe. Der Benchmark darf **„Reasoning disabled“ nicht als garantiert verfügbare Variante B voraussetzen**; zunächst realen Provider-Request und seine tatsächliche Wirkung prüfen. Variant C (kürzere gezielte Promptanweisung, etwa unsichere optionale Deltas nicht lange abzuwägen) erscheint interessant, aber **kein impliziter neuer Default**.
2. **Telemetrie an technischen Records:** Statt Provider-Daten ohne Not in kanonische `extract.failed`/`cmd.interpreted`/Gameplay-Events zu mischen, vorzugsweise optionale Felder in `plan`, `interp`, `board` und `extraction`-Records. Event-Fold, Swipe und bestehende Fixtures unverändert absichern.
3. **Kompatible `v4Llm/ask`-Rückgabe:** Derzeit erwartet `ask()` einen String. Bei Metadatenobjekten vorhandene String-Mocks, Reparaturpfade und `generateRaw`-Fallback weiter unterstützen. Bei ST-Custom-Endpoint `custom_include_body` strukturiert und ohne mögliche unbeabsichtigte Überschreibung von `messages`, `model`, `max_tokens`, `stream` etc. mischen; ein leeres Extra bleibt exakt neutral.
4. **Leere Narration:** Guard für sichtbar leere `MESSAGE_RECEIVED`-Antwort **und** prüfen, was ST tut, wenn gar keine Assistant-Nachricht erzeugt wird. Keine Behauptung `finish_reason:length`, wenn diese Information im Narrator-Hook nicht vorliegt.
5. **Benchmarkqualität:** Nicht nur Delta-Mengen vergleichen; Validität, Vollständigkeit, falsche/fehlende Fakten, vom World-Applier angenommene/abgelehnte Deltas und End-State vergleichen. Wiederholungen und A/B/C-Varianten zeitlich ausbalancieren, Providerrauschen beachten; möglichst **exakte Originalrequests** statt unbemerkt anders aufgebauter Fixture-Prompts.

**Vorläufige Bewertung:** 8.2a als **Mess-/Konfigurationsbasis** sinnvoll; die standardmäßig verhaltensneutrale Version ist **noch kein belegter Performance-Fix**. Welche Prompt- oder Provider-Einstellung tatsächlich beschleunigt, erst **nach** Benchmark entscheiden. `#assign`, ROAD AHEAD, Patch 9 und QoL-Katalog bleiben getrennt und unverändert.

## 10. Zweite Claude-Rückmeldung zum Performance-Review – abschließender Entwurfsstand (21.10.2026)

**Noch keine Codeimplementierung und keine ausdrückliche Nutzerfreigabe.** Claude hat die vorherigen ChatGPT-Präzisierungen akzeptiert und den Performance-Patch weiter verkleinert. Ihr Review wurde nur lesend gegen `c6baa06` sowie den .26-Chat geprüft.

### 10.1 Benchmark-Hypothese: Wirkt das vermeintliche `low` überhaupt?

Die offizielle GLM-5.3-Flash-Modellkarte (`https://huggingface.co/zai-org/GLM-5.3-Flash`) und das vLLM-Rezept (`https://recipes.vllm.ai/zai-org/GLM-5.3-Flash`) nennen `reasoning_effort = low|high|max`; fehlende/ungültige Werte fallen auf `max` zurück, **Thinking kann laut Modellvorlage nicht ausgeschaltet werden**. Im ST-Completion-Log steht `low`, aber das ist **kein Beleg**, dass der finale Provider/Serving-Endpoint es tatsächlich verwendet.

**Benchmarkvarianten, bei ansonsten identischen Parametern einschließlich `clear_thinking`:**
- **A0:** kein `reasoning_effort` gesendet (voraussichtlich Modell-Default `max`, wenn Serving es so umsetzt);
- **A:** `reasoning_effort: low`;
- **C:** identisch zu A, plus kurze konkrete Promptanweisung, unsichere optionale Deltas nicht unnötig auszudiskutieren.
- **Wiederholungen in gemischten Runden** `A0/A/C/A0/A/C`, nicht drei zeitliche Blöcke. Exakte bzw. gegen Logs verglichene `extractionRequest()`-Requests aus .25/.26-Fixtures; Zeit, Reasoning-/Completion-Tokens, Abbrüche, Delta-Korrektheit und **angewendeten Engine-Endzustand** vergleichen.

**Wichtige Interpretationsgrenze:** Gleiche Werte für A0 und A **beweisen nicht**, dass `low` ignoriert wird (Stochastik, Endpoint-Defaults, Proxy-Übertragung, verborgenes Serving-Verhalten). Ein starker wiederholter Unterschied stützt die Wirksamkeit von `low`; idealerweise die Provider-/Serving-Request-Weitergabe selbst prüfen. Nicht ohne Nachweis Engine-Prompt oder Provider voreilig als Ursache festlegen.

### 10.2 Gemeinsamer kleiner 8.2a-Zuschnitt

1. **Metadaten und Profiling, verhaltensneutral:** `v4Llm()` gibt auf Custom-Endpoint bei Verfügbarkeit `finish_reason` und `usage` mit; `ask()` akzeptiert **String oder Objekt**, `generateRaw` und bestehende Test-Mocks bleiben funktionsfähig. Technische Daten als **optionale Felder vorhandener Chat-Records** (`plan`, `interp`, `board`, `extraction`), nicht als neue Kanon-Gameplay-Events. Bereits vorhandene Event-`ms` belassen. Keine Tokenwerte schätzen, wenn Provider sie nicht liefert.
2. **Warte-/Laufzeiten:** `pendingWorld.job`-Wartezeit, `foldChat()` und soweit im Host realistisch Narrator-Gesamtzeit erfassen. Keine kompletten Prompts in Debuglogs, keine unnötigen zusätzlichen LLM-Aufrufe.
3. **Leere Narrator-Antwort:** `MESSAGE_RECEIVED` mit vorhandener leerer Assistant-`mes` **startet keinen Extractor**; neutraler Systemhinweis. Nachricht 36 des .26-Runs war `mes:''`, danach trotzdem 17,6 Sekunden nutzlose Extraktion mit 0 Deltas – konkreter Regressionstest. Auch Host-Fall „gar keine Assistant-Nachricht“ prüfen, keine erfundene `finish_reason`-Angabe. Bereits auf User-Record gebuchte Kampfergebnisse erhalten, kein doppeltes Replay.
4. **Keine rollenspezifischen Request-Extra-Einstellungen** in 8.2a; `low` ist bereits die kleinste dokumentierte Stufe, weshalb eine weitere UI vor Messung keinen nachgewiesenen Nutzen bringt. **Kein `#assign`-Fast-Path**, kein Engine-only-Board, kein Fold-Cache, kein `combat_lite`, kein ROAD AHEAD/Organic Growth.

**8.2a alleine ist ein Diagnose-/Fehlerschutz-Patch, noch kein nachgewiesener Performancegewinn.** A0/A/C-Benchmark anschließend als eigenständiges Werkzeug ohne Eingriff in das laufende .26-Spiel, `8.2b` nur auf Basis wirklich belegter Verbesserungen und ohne Verlust gültiger Engine-Weltänderungen.

### 10.3 Nächster Schritt

Wenn Nutzer 8.2a freigibt: kleinen Implementierungsauftrag mit obigen Grenzen an Claude Code; automatisierte Regressionen, `npm test`, relevanter SillyTavern-C-Smoke, aktueller Git-HEAD, event-/record-kompatible Implementierung. Danach A0/A/C-Benchmark prüfen, **erst dann** Prompt-/Provider-Defaults in 8.2b ändern. Kein weiteres endloses Design-Pingpong ohne neue Messung.


## 11. Patch 8.2 wirklich implementiert – unabhängiger Git-Code-Review (21.10.2026)

**Branch:** `claude/c-planner-prototype-2026-10-02-gpt-c666`, HEAD `ef4a819d5b1be76b4229745268172d0da5ce5dd5`, Build `4.3.0-c.6.6.27`. Ein neuer Commit direkt nach .26 (`c6baa06`). **Frühere Abschnitte 7/9/10 sind historische Review-/Planungsstände; sie bedeuten nicht mehr „8.2 nicht implementiert“.**

**Laut Git implementiert:** Rollenneutrale LLM-Telemetrie in bestehenden Records (keine neuen Spiel-Events), String-/Objektkompatibilität in `ask()`, LLM-/Fold-/Barrier-/Narrator-Zeiten, übersichtliche Statuszeile. Leere Narrator-Nachrichten erhalten `extraction.status='skipped'`, `NO STORY TEXT` und keinen Extractor; vorher auf User-Record verbuchter Kampf bleibt erhalten; Replay und Swipe im Test. Der 8.2-Custom-Endpoint trägt `usage` und `finish_reason` mit, `generateRaw` nicht. Anfragen/Modelldefaults unverändert, **keine rollenabhängige Reasoning-Setting-UI**.

**Claude-Bericht:** `npm test` 975/975 (15 neue Tests) und SillyTavern-1.19-C-Smoke grün, erneut auf finalem Stand; ein einmaliger ST-interner Statuscheck-Ausreißer verschwand beim Wiederholen. Diese Läufe wurden **von Claude ausgeführt und gemeldet**, nicht von ChatGPT unabhängig ausgeführt. Code und Versionswerte in Git unabhängig geprüft. Erster kurzer `.27`-GLM-Livetest **am 22.10. durchgeführt und in Datei 03 §5g ausgewertet**; echter A0/A/C-Providerbenchmark weiterhin **ausstehend**.

**Benchmark `tools/bench_extract.mjs`:** Laut Claude 17/18 .26-Extractor-Erstaufrufe mappbar, für 17 derselbe angeforderte Prompttext wie im alten Log; die 18. ist die künftig ausgelassene Extraktion einer leeren Narrator-Antwort. A0 (ohne `reasoning_effort`), A (`low`), C (`low` plus kurze Schlussanweisung); kein API-Key in Implementierungsumgebung, daher noch **keine** echten Zeit-/Qualitätsresultate. Voller Lauf würde bei 3 Runden ungefähr 153 Requests auslösen (~1,3 Millionen Prompttokens); `--only`-Subset zur ersten Prüfung.

**Unabhängiger Review-Hinweis vor dem teuren Benchmark:** Die Funktion `worldSummary()` vergleicht **nur eine gekürzte Projektion des Zustands**. Sie betrachtet z. B. Entitäten nur nach Kind/Status/Ort/Gruppe, Orte nur per ID, Wege nur nach Anzahl, Erinnerungen nur nach Anzahl, Fakten ohne alle Felder und Gegenstände ohne Mengen/Attribute. PC-Inventory/Stats, Relation-/Knowledge-Inhalt, Questdetails und weitere legitime Extractor-Weltänderungen werden nicht vollständig berücksichtigt. `identical_world` kann darum eine **falsch-positive Übereinstimmung** anzeigen. *Kein Gameplayblocker für Build .27,* aber die Bewertung muss vor einer 8.2b-Entscheidung fachlich aussagekräftiger gemacht oder mit manuellen Referenzurteilen ergänzt werden. Kein Komplettvergleich temporärer State-/RNG-Metadaten auf Verdacht.

**Nachtrag zur Reihenfolge (22.10.):** `.27` wurde mit echtem Provider kurz live erprobt; bestätigte Old-Crown-Floor-Zuordnung `name level 1` / `level:2` und unerreichbarer numerischer Cull (03 §5g–5h). Der daraus entstandene **Patch 8.3 (.28)** ist inzwischen unter `70cbb5e` implementiert und von ChatGPT im Git-Code nachvollzogen (§5i). Vor dem nächsten großen Designpatch jetzt den **frischen .28-Gesamtlivetest** vom Gate bis Floor-Clear durchführen. Der neu erkannte gemischte Dungeon-Cull-Randfall in `cullEndState()` verdient einen separaten engen Regressionstest; nicht still in den eigentlichen Skelett-Cull integrieren. Parallel später Bench-Judge härten, Narrator-Lorebook-Cache kontrolliert A/B testen und A0/A/C kontrolliert ausführen; **erst daraus** sinnvollen 8.2b-Provider-Default ableiten. `#assign`-Fastpath, Engine-only-Board, Rest/Wait/Fast-Travel, ROAD AHEAD, Patch 9 und Organic Growth bleiben eigenständige Kandidaten. Kein Force-Push für kosmetische Commitnachricht.


## 12. Patch 8.3 (.28) – unabhängiger Source-Review und offener Randfall (22.10.2026)

**Bestätigt aus GitHub:** Commit `70cbb5e4ec77ea1ad9fe24fc46b86c2c42cb12ed`, Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Version in `package.json` und `manifest.json`: `4.3.0-c.6.6.28`. `src/v4/dungeon.js levelVia()` trennt echtes Gate/Level 0 von Ebene 1; `living.js runNow()` und `cullPopulation()` nutzen eine deterministisch gezogene Population, `guild.js cullKind()` gleiche Artregel für das Board und `defeatTally()`; `areaOf()` begrenzt Dungeon-Culls auf deren Dungeon/Etage. Numerische Culls erhalten einen gezählten statt eines pauschalen Floor-Clear-Endzustands. Gilden- und Quest-Kontext wurden minimal berichtigt. Elf neue Tests in `tests/v4/patch83.test.js`; 986/986 und ST-Smoke 21/21 sind **Claudes gemeldete Läufe**, von ChatGPT nicht unabhängig ausgeführt. Dokumentations- und Nachweisdaten siehe Datei 03 §5i und `avereth-engine/docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md`.

**Technisches Review-Risiko für gemischte Dungeon-Verträge:** `cullEndState()` greift bei **jeder** numerischen `DEFEAT`-Aufgabe mit `q.dungeon` und ohne `q.clear`, auch wenn sie neben einem Kampf weitere substanzielle Arbeiten (z. B. Reparatur, Rettung, Lieferung) enthält. Es kann deshalb andere verpflichtende Ziele aus `desired_end_state` entfernen. Der reine Old-Crown-Cull ist nicht betroffen. Dies ist **kein nachgewiesener Live-Fehler**, sondern ein direkt aus dem Code ableitbarer Randfall: Einen gemischten Auftrag als Fixture ergänzen und nur echte reine Culls umformulieren; andere Zielzustände nicht überschreiben. `areaOf()` akzeptiert weiter fehlende/unbekannte Gegnerorte (Legacy-Fallback); nur gezielt untersuchen, wenn solche Entity-Daten im Livetest auftreten.

**Test- und Planentscheidung:** Patch 8.3 ist **technisch bereit für einen neuen GLM-Livetest**, nicht bereits spielerisch als vollständig bewiesen zu bezeichnen. Alte .27-Events werden nicht rückwirkend korrigiert; eine neue Kampagne vermeidet das persistierte Etagen- und 3er-Cull-Problem. Keine globalen XP-/Balance-/Scaling-Änderungen, keine unverifizierte Cache-Optimierung und kein früher Übergang zu Patch 9/ROAD AHEAD.


## 13. Erster echter .28-GLM-Livetest – Bewertung und Prioritäten (22.10.2026)

**Quellen und Details:** siehe Projektstand `03_AKTUELLER_PROJEKTSTAND.md` §5j; drei Nutzerdatenexporte des Glimmerdeep-Runs. **.28 bestätigt** den seitlichen Gate-Zugang zur ersten F-Rank-Ebene, deterministische vier Gegner, korrekte Loot-/XP-/Level-up- und Questturn-in-Buchungen (60 cp und 23 Quest-XP), Rückweg, Rast und Offscreen-Party-Fortschritt. **Nicht erprobt:** Old-Crown-Treppe, Siegel, zweiter Dungeonlevel, Glimmer-Queen/Guardian, kompletter Floor-Clear.

**Priorität hoch: Ambush-Loop trotz einer Gegnergruppe.** Vier `glass beetle` stehen als **eine** `entity.group` und ein Slot am gleichen Ort, `scene.awareness=unaware`. Jeder der vier offensichtlichen Flame-Lance-Angriffe startet eine separate `COMBAT START — AMBUSH`-Eröffnung mit sofortigem Krit-Kill. Die restlichen Gegner handeln überhaupt nicht und bleiben mehrfach `unaware`, auch nachdem Schüsse und laute zerstörte Panzer beschrieben werden. **Aus Code begründbare Wechselwirkung:** `src/v4/group_combat.js groupJoiners()` hält noch `unaware`-Gruppenmitglieder bis nach dem Opening zurück; bei einem One-Shot endet der Kampf sofort und der Aufmerksamkeitswechsel/Beitritt bleibt aus. Dies ist nicht der Beweis einer neuen falschen HP-Formel, aber ein offensichtlicher **Challenge-, Gruppenreaktions- und Kausalitätsmangel** (bemerkenswert: Patch 8.1 sollte bereits gemeinsame Beetle-Combat-Encounters ermöglichen). Vor einem mechanischen Fix sauber die Voraussetzungen für Sehen/Hören, tatsächlich gewählte Stealth, Art/Hostility, Reaktionszeit und wahrgenommene Magie modellieren; **kein blanket group aggro**, keine Telepathie, keine XP-/Damage-Nerfs; Tests für beobachtbare laute One-Shot-Kills, bewusst unbemerkte stille Kills und überlebenden Erstgegner.

**Priorität mittel bis hoch: Offizieller Dungeon-Cull trägt widersprüchliche Zahlen.** Die Engine speicherte `DEFEAT qty:4` und `desired_end_state:4 crystal beetles`, das Board zeigt „(4)“ und gleichzeitig im nicht überarbeiteten `task` **„Cull at least six crystal beetles“**. Zieltyp/Erfüllbarkeit ist jetzt in der Engine konsistent, **die öffentliche Ausschreibungsbeschreibung nicht**. Nicht nur `desired_end_state` korrigieren: Aufgabenbeschreibung, offiziellen Text und HUD auf denselben festen Contract-Snapshot synchronisieren. Nur reine Culls automatisch umschreiben; gemischte Dungeonarbeiten dürfen keine weiteren Ziele verlieren (`cullEndState()`-Risiko aus §12). Die tatsächlichen Gegner waren `glass beetle`, technisch als allgemeine Beetle-Art für das Ziel erfasst; semantische Art-/Namensanzeige prüfen, ohne unnötige Einschränkung von allgemeinen Hunts.

**Separate Performancearbeit:** 16 Planner-Aufrufe Median 2,44 s; Board-Erzeugung 31,33 s; 15 Narrator-Antworten Median 11,55 s, max 41,42 s; 15 Extractor-Phasen Median 4,27 s, max **95,82 s** ohne Reparatur; weitere Reparatur bei 2.500 Completion-Tokens insgesamt 31,98 s. **8/15 Narrator-Provider-Responses ohne Cache**; Lorebook-Prefix A/B weiter sinnvoll. Durchschnitt/Median gegenüber .27 nicht als Kausalnachweis werten, kein blindes Reduzieren der Token-Limits und kein Mischen von Narrator-Cache-Optimierung in Combat-Fix.

**Entscheidung offen:** Statt großflächigem Patch sofort **gezieltes unabhängiges Claude-Gegenreview** zu Combat-Awareness (reproduzierbare vier Solo-Ambushes trotz Gruppe) und der Cull-Task-Zahl. Bei bestätigtem Mechanikloch kleiner abgrenzbarer Folgeschritt mit Regressionen; danach echter mehrteiliger Dungeonlauf bis Guardian/Boss. ROAD AHEAD/Organic Growth/Scaling bleiben unverändert eigenständige Vorhaben.

## 14. .28-Gegenreview – Combat-Alarmierung statt falscher Stealth-Sonderfall (22.10.2026)

**Quelle:** Unabhängiger Claude-Review des echten .28-GLM-Exports mit eigener Durchsicht von `engine.js`, `combat.js`, `group_combat.js`, `world.js` und anschließender Bestätigung anhand des Git-Codes durch ChatGPT (vgl. Datei 03 §5k). **Keine Implementierung** in diesem Review; letzter verifizierter Build bleibt .28/70cbb5e.

**Bestätigter dreigliedriger Fehler:** Gegnergruppe im selben Raum erhält `unaware`, aber PC hat **keine** echte Stealth-Deckung (`scene.concealed=[]`). `groupJoiners` schiebt trotzdem alle anderen nach `later`; bei tödlichem Opening werden sie nicht aufgenommen; `persistCombat` kennzeichnet die als `unaware` ausgelassenen Zeugen nicht `wary`. Narrator/Extractor setzen konsistent die fehlerhafte Engine-Annahme fort. 8.1-Test `group 5 (stealth)` setzt selbst `concealed=[]` und zeigt damit die Ursache der Designverwechslung. Änderung für **unverdeckten Spielerangriff**: Mitglieder der **bereits begründeten feindlichen Gruppe** vor der Opening Action beitreten lassen, auch wenn zuvor `unaware`; jeder nur eigene reguläre Aktion, lediglich überraschtes Ziel bekommt gegebenenfalls Ambush-Krit. Überlebende anschließend `aware/wary`, ohne dass der Narrator den alten ahnungslosen Zustand neu erzeugen darf. Sonderfälle `threat:false`, friedliche NPCs, Rückzug/Parley, echtes unbemerktes Stealth und Replay prüfen. Kein pauschales Gruppen-Aggro und keine Balanceänderung.

**Designentscheidung zu lauten Aktionen aus echter Deckung:** Solche Aktionen sollen grundsätzlich die Gruppe **alarmieren können**, aber Alarmierung ist **nicht** automatische Kenntnis von Alarics exakter Position. Diese Akustik-/Wahrnehmungsgrenze ist **nicht Teil des sofortigen engen Fixes**; kein ad-hoc-Lärmsystem. Bis zu einem entsprechenden Mechaniktest die Aussage „Versteckt = alle Angriffe bleiben lautlos“ ausdrücklich **nicht** als Kanon interpretieren.

**Quests:** `bookBoard` passt Zahl und Zielzustand, nicht den ursprünglichen `task`-Fließtext an; „(4)“ und „at least six“ erscheinen zusammen. Reine Dungeon-Culls deterministisch mit synchroner Anzeige aus endgültigen `objectives` berichtigen, ohne fremde Mengen/Etagen-Zahlen oder gemischte Aufgaben zu beschädigen. Bei unklarer Zuordnung statt willkürlicher Zahlwort-Ersetzung besser zuverlässigen kanonischen Text aus strukturierten Zielen rendern. `objectiveText`-Duplikat („DEFEAT 4 beetles crystal beetles“) behutsam bei echtem Doppel-Nomen entfernen.

**Performance-Kandidat separat:** Board-Retry brauchte 12,4 s; ein unzulässiger **zweiter** Glimmerdeep-Job löste Neu-Generierung aller fünf Vorschläge aus. Gezielt nur fehlende gültige Einträge nachfordern wäre sinnvoll, hat aber eigenen Validator-, Persistenz- und Latenztestumfang. Narrator-Cache und Extractor-Stalls eigenständig betrachten. Keine Parameteränderungen im Combat-Fix.

**Nächster Reihenfolgepunkt:** Enger Combat-/Questtext-Fix mit rotem .28-Live-Regressionstest, dann ausführlicher Glimmerdeep-/Old-Crown-Run bis Guardian, Siegel und vollständigem Clear; später separat Board-Retry und Cache. Keine Freigabe von Organic Growth/ROAD AHEAD aus diesem Review.

## 15. Patch 8.4 (.29) – Git-Review abgeschlossen; enger Schutz-Cull-Randfall (22.10.2026)

**Git-Verifikation:** Entwicklungsbranch HEAD `4d08d4f6c8eb7a96e0534066d4b38a1f18d74098`, Build `4.3.0-c.6.6.29` in drei Versionsquellen, genau ein Commit nach `.28`/`70cbb5e`. 12 Dateien geändert, darunter `src/v4/group_combat.js`, `src/v4/guild.js`, `src/v4/catalog.js`, neue `tests/v4/patch84.test.js` (9 Regressionen) und Fixture `live_1022b.json`. Claude berichtet 995/995 Node-Tests und einen 21/21 C-Smoke. Seltene negative `noPageErrors`-Runs hängen laut Claudes markiertem Gegenversuch mit SillyTavern-Preset-Status-Abbrüchen beim Setup zusammen; der eigene Git-Review **bestätigt diese Browserdiagnose nicht unabhängig**. Umfang und Details siehe `03_AKTUELLER_PROJEKTSTAND.md` §5l sowie `avereth-engine/docs/PATCH8_4_GROUP_AWARENESS_CULLS.md`.

**Mechanikbewertung:** Für einen unverdeckten Angriff des PC wird ein beitrittsberechtigtes `unaware`-Mitglied eines etablierten feindlichen Verbands in `groupJoiners` nun als `now` statt `later` geführt, sofern der PC nicht in `scene.concealed` steht. Der eine Ambush-Krit auf das konkret unaufmerksame Ziel bleibt; die anderen handeln nach Opening Action in eigener Initiative, und der Kampf endet nicht nach dem ersten Kill. Gegenüber `.28` zeigen Produktpfad-Regressionen eine echte Vier-Beetle-Begegnung, HP 80→53, kein zweiter Ambush gegen denselben Verband und erhaltene Replay-/Swipe-Stabilität. Echte Deckung, friedliche Gruppen und ausdrückliche `threat:false`-Ausnahmen erhalten ihre separate Bedeutung. Kein ungetesteter Schadensnerf. Lautes Zaubern aus tatsächlicher Deckung bleibt ein eigenständiges künftiges Wahrnehmungsthema.

**Reiner Cull-Text:** `cullTask` gleicht die eindeutig dem Monsterziel zugeordnete Anzahl nach `cullNumbers` auch im öffentlichen `task` an; `cullEndState` überformt nur `pureCull` vollständig. `amountText` wird von beiden `objectiveText`-Varianten genutzt. Der echte Beetle-Fall lautet damit konsistent 4 statt 6, ohne Etagenzahl oder Zweck zu löschen. Gemischte `REPAIR`-Quests behalten ihre anderen Aufgaben.

**Neu verifizierte Testlücke:** Der neue grüne Test `8.4 cull 2` erstellt ausdrücklich eine `DEFEAT + DEFEND`-Quest mit Task „Cull six crystal beetles ... and guard the apprentices“, `DEFEAT qty:4` und `desired_end_state` „Four crystal beetles ... and apprentices ... come to no harm“. `isHunt` bezieht `DEFEND` ein, wodurch `cullNumbers` die Zahl anpasst; `pureCull` schließt `DEFEND` aus, wodurch `cullTask` den ursprünglichen Task unverändert lässt. Der Test behauptet aktuell ausdrücklich, dieser alte Task sei korrekt. **Klarer verbliebener Anzeige-/Test-Erwartungsfehler, obwohl der reine Beetle-Cull behoben ist.** Nächster Kleinstfix: wenn `DEFEND` und die Killzahl tatsächlich gekürzt wurde, die **eindeutig zuordenbare** Killzahl im `task` angleichen, ohne Schutzpflicht, anderen Endzustand oder andere Mengen zu verlieren. Test auf einheitliche Task/Qty/EndState-Menge drehen; kein weiterer allgemeiner Quest-Refactor.

**Empfohlene Reihenfolge:** Falls alle offiziell angezeigten Dungeon-Aufträge bereits vor dem nächsten Test widerspruchsfrei sein sollen, zuerst diesen kleinen Task-Nachtrag. Der **Combat-Fix selbst ist bereit für den echten `.29`-GLM-Livetest** mit gegnerischen Turns, anschließend Glimmer Queen/Level-Clear sowie Old-Crown-Gate/Siegel. Board-Nachgenerierung, Narrator-Cache-A/B, Extractor-Spikes und ST-Status-Preset-Race sind separate Performance-/Testharness-Themen. Organic Growth und ROAD AHEAD sind nicht freigegeben.
