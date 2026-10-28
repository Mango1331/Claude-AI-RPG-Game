# AI-RPG-Recherche 28.10.2026 – Abgleich GPT/Claude und konsolidiertes Ergebnis

**Status:** Ideen- und Architekturrecherche, **keine Patchfreigabe**. Kurzfassung und Einordnung: [04 §7a](../04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). Der laufende Produktstand steht ausschließlich in [03](../03_AKTUELLER_PROJEKTSTAND.md).

**Entstehung:**
1. GPT-Recherche vom 28.10. (erste Fassung von §7a, main `8adf9cb`).
2. Unabhängige Claude-Gegenrecherche mit Code-Abgleich auf `.108`.
3. GPT-Bewertung dieser Gegenrecherche.
4. Claude-Endbewertung, ergänzt um eine Messung aus einem vorhandenen Lauf-ZIP.

Hier steht nur das gemeinsame Ergebnis. Wo eine Seite die andere korrigiert hat, ist das vermerkt.

## 1. Kernaussagen

- **Keine neue Architektur.** Ernstzunehmende Projekte trennen inzwischen genauso: Das LLM erzählt und schlägt vor, Code entscheidet über den Zustand (Tapestria, Quilltale, Intra, World-State Transformations 2026). RPGBench (NeurIPS 2025) bestätigt: LLMs erzählen gut, setzen Regeln aber schwach durch.
- **Avereth liegt bewusst auf der strengen Seite.** Friends & Fables lässt den Zustand von nachgelagerten LLMs „probabilistic“ aktualisieren; reine LLM-RPGs wie OurDream verlangen manuelle Korrekturen bei Geld oder Inventar. Den Preis der Strenge benennt Craft offen: „The code and logic we built to guide the AI created invisible walls.“ Die Fail-soft-Arbeit ist die Brücke zwischen beiden Seiten. Diese Wände sollen künftig **gemessen** werden (§4.9).
- **Der größte Hebel liegt darin, vorhandene Informationen erzählerisch besser zu nutzen.** Neue Speicherstrukturen sind nachrangig. Zuerst untersuchen, warum gespeicherte Informationen im natürlichen Spiel nicht wirksam werden.
- **Neue Weltdynamik zuerst deterministisch und replaybar**, mit möglichst wenigen zusätzlichen LLM-Aufrufen. Das stützen auch Lyfe Agents, Affordable Generative Agents und Intra (Autonomie in jedem Tick sei „neither necessary nor cost-efficient“).

## 2. Vergleichsprojekte – geprüfte Quellenlage

| Projekt | Belegt | Bedeutung für Avereth | Vorbehalt |
|---|---|---|---|
| Craft / Friends & Fables | F&F hat Modelllücken „with code and logic“ gefüllt und Kontext aus Kostengründen gedeckelt; der Code schuf „invisible walls“. Franz: Recherche-Schritt, dann Erzählung, dann nachgelagerte Zustands-LLMs, bis zu „a dozen“ Aufrufe je Nachricht. Patch 26.03: Plot-Updates nur noch jeden dritten Zug, Planning-Schritt „for performance“ abgeschaltet. | Unsichtbare Wände als Messgröße; seltener laufende Hintergrundschritte sind üblich. | Craft veröffentlicht keinen Harness und ist eine Baukasten-Plattform ohne festen Kanon. Die Lehre lautet **nicht** „weniger Prüfungen“. |
| Tapestria | Regel-Engine ohne jeden LLM-Zugriff („enforced architecturally“), Event-Log zuerst, Prüfschicht gegen erfundene Weltänderungen, Wissen aus bezeugten Events, das sich über soziale Bindungen verbreitet, Aftermath-Durchgang am Sitzungsende. | Bestätigt Avereths Grundmodell; Vorbild für Wissensverbreitung. | Noch nicht veröffentlicht (Warteliste); reines Designdokument. |
| Quilltale | Dataclass-Zustand, JSON-Übergänge mit Prüfung, episodisches NPC-Gedächtnis mit Bedeutung 1–3. Eigene Messung: 85 % Faktenkonsistenz, 11–12 % ungültige Übergänge, NPCs erfinden Gegenstände. | Nur die Idee eines festen Bewertungsszenarios. | Kleines Projekt (12 Sterne, 28 Commits). Die Fehleinschätzung des eigenen LLM-Bewerters ist dort selbst dokumentiert. |
| Intra (Ian Bicking) | Geerdete gegen ungeerdete Ergebnisse; nur deklarierte Zustandsänderungen; Referenzen vor dem Eintrag in die Historie normalisieren; NPCs antworten zu viel; keine NPC-Prompts in jedem Tick. | Bestätigt die Aufteilung in Planner, World und Extractor. | Kein Langzeitgedächtnis. |
| World-State Transformations (Góngora et al., 05/2026) | Das LLM wählt aus einer endlichen Liste von Weltänderungen, symbolische Prüfungen lehnen ab. Fazit: Fehler gemindert, nicht beseitigt. Eine feste Ausführungsreihenfolge ließ Spieler scheitern. | Vorbild für Skills als Weltoperationen (§4.6). | 8 Spieler, Vorstudie. |
| Wanderfolk | Gerüchte über soziale Bindungen; Ruf von −100 bis +100 bestimmt Preise und Jobs; Vektorgedächtnis; Grok. | Gegenbeispiel: globaler Ruf statt Wissen je Person. | Herstellerangaben. |
| SillyTavern Smart Memory | Ebenen, fünf Wissensmarken (knows, suspects, believes-false, unaware, hiding), Budgets je Ebene. **Bearbeiten, Verstecken, Swipe oder Branchwechsel nehmen gebildete Erinnerungen nicht zurück**; eingeschobene Profile zerstören das Prompt-Caching. | Avereths nachrichtengebundener Event-Fold ist hier strukturell überlegen. Deshalb nicht parallel installieren. | – |
| SillyTavern Memory Books | Szenenbereiche werden zu JSON-Erinnerungen und Lorebook-Einträgen, Verdichtung zu Arcs und Kapiteln. | Vorbild für Bogen-Gedächtnis (§4.4). | – |
| AI Dungeon | Automatische Zusammenfassung plus Memory Bank (Embeddings); Budget nach Abzug des Pflichtteils ≈ 25 % Story Cards, 50 % Verlauf, 25 % Memory Bank. Eigene Doku: Abruf unvollkommen. | Bestätigt Budgetierung nach Kategorien. | – |
| OurDream | Öffentlich kaum etwas. Gefunden: eine Karte „Obsidian Summoner RPG [V4.6]“ auf **winkme.ai** (Valdoria, `#system`, `#bag`, `#pets` für Vertragskreaturen). | `#bag`/`#status` und Summons als Genre-Kern haben dort ihr Vorbild. | Creator-Zuordnung, „ourdream-ai-wiki“ und die Goblin-Overlord-Fassung von TelegAI sind **nicht belegt**. „Mørkyn“ war nicht auffindbar. Verlässlich ist nur der eigene Test des Nutzers. |
| Forschung | Generative Agents (Erinnern, Reflektieren, Planen); Lyfe Agents (10–100× billiger, Summarize-and-Forget); Affordable Generative Agents (regelbasierter Alltag statt wiederholter Aufrufe); Zep/Graphiti (bitemporale Fakten, ungültig statt gelöscht); Talk of the Town (NPCs „observe, tell, misremember, and lie“); Felt/Winnow (Story Sifting, Winnow auch für unvollständige Muster). | Siehe §3 und §4. | Teils nur Abstracts oder Selbstangaben. |
| Spieldesign | Pseudo-Random Distribution (Warcraft III/Dota 2); AI Director aus Left 4 Dead (Druck aufbauen, dann Ruhe); RimWorld-Storyteller; Progress Clocks und Faction Turns aus Blades in the Dark; Fronts aus Dungeon World (höchstens etwa 3); Minion-Trait aus Pathfinder 2e. | Vorlagen für §4.1, §4.2 und §4.7. | Inspiration, keine fertige Balance. |

## 3. Was Avereth bereits hat (Code `.108`)

- **Retrieval im Stil von Generative Agents** (`src/retrieval.js`): Gewichte entity 3, importance 2, lexical 2, location 1,5, quest 1,5, relation 1, recency 0,5 mit 0,99^Alter. Der Abschnitt RELEVANT erhält 25 % des Kontextbudgets, dazu höchstens drei frühere Spielerepisoden (`src/context.js`). Die von GPT vorgeschlagenen Gedächtnisebenen 3 (Episoden) und 5 (gezielter Abruf) gibt es also schon.
- **Wissen je Person** (`src/delta.js`, `src/knowledge.js`):
  - `learn` mit `how: witnessed/told/rumor/inferred/public`, Quelle `told:<id>`.
  - Ein bekannter Fakt ergibt `knows`, als Gerücht oder Schluss `suspects`.
  - Hörensagen ohne Fakt erzeugt nie Weltwahrheit, sondern einen `claim` mit `truth: unknown`, bei Widerspruch zu einem bestehenden Fakt `false`.
  - Geheimnisse sind nur durch Erzählen oder Bezeugen lernbar; Abwesende bezeugen nichts.
  - Erinnerungstexte werden aus Sicht des Betrachters gerendert (Name, „the stranger“ oder „someone unseen“).
- **Fakten mit Gültigkeit:** Beendete Fakten bleiben im Log (`until`); das entspricht im Kern Zeps „ungültig statt gelöscht“.
- **Threads** (`mystery/threat/sign/promise/debt/rumor`), `agenda`-Fakt, NPC-Karten mit Wissen, Agenda und Geheimnissen.
- **Deterministische Simulation außerhalb der Szene:** `src/v4/living.js` `syncEvents` (Dungeon-Zyklen, Tagespläne fremder Gruppen, Räumung, Verfall). Das ist die Vorlage für neue Weltdynamik.
- **Seed-Hash-Wurf je Reiseetappe** (`roadLine`, `rules.travel.leg_event_pct`) und **DUNGEON AHEAD**: Die Engine legt fest, was kommt, der Narrator erzählt.
- **Nachrichtengebundene Events mit Fold:** Swipe, Bearbeitung und Neuladen sind abgedeckt, die zentrale Schwäche der ST-Memory-Erweiterungen also nicht.
- **Laufzeitmessung je Rolle existiert schon im Runner** (`tools/st_live/live/report.mjs`, Abschnitte „Performance“ und „Laufzeit (gemessen)“): Aufrufe, Reparaturen, Median und p90, Prompt-, Cache-, Antwort- und Reasoning-Tokens je Rolle, Zeitanteile für Planner, Board, Erzähler, Extraktor und Warten sowie die Bedenkzeit des Testspielers.

## 4. Konsolidierte Designrichtungen

Für alle gilt: Nur validierte Events werden kanonisch. Swipe, Replay und Save/Reload müssen identisch bleiben. Keine erfundene Folgehandlung Alarics. Jede Richtung ist eine eigene spätere Designentscheidung mit eigener Abnahme.

### 4.1 Gefahr bei Rast, Warten und Reise (Nutzerfeedback §6a)

- **Die Einheit ist Spielzeit, nicht die Zahl der Versuche (neu).** Jede Zone hat eine Gefahrenrate λ je Minute. Eine Rast der Dauer t wird mit p = 1 − e^(−λ·t) unterbrochen. Eine in Stücke geteilte Rast trägt damit dasselbe Gesamtrisiko: Ausnutzen durch Ein-Stunden-Häppchen ist ausgeschlossen. Ein Swipe würfelt über den Seed-Hash wie bei `roadLine` nicht neu.
- **Steigende Rate bei langer Ruhe, aber gedeckelt.** λ wächst mit ereignisloser Zeit in gefährlicher Umgebung (Idee der PRD), bleibt aber **unter 100 %**.
  - *Korrektur durch GPT:* Die klassische PRD erreicht 100 % und hat damit eine feste Höchstzahl erfolgloser Versuche. Meine erste Formulierung „keine starre Garantie, aber eine Obergrenze“ war widersprüchlich. Gewollt ist keine Begegnung nach exakt X Rasten.
- Nach einem bedeutenden Ereignis wird λ zurückgesetzt; nach einem schweren Kampf gibt es ein Ruhefenster (wie im Left-4-Dead-Director).
- **Sichere Orte haben λ = 0:** gebuchtes Zimmer, Gilde, befriedete Siedlung.
- **Vorsichtsmaßnahmen senken λ (neu, Prüfidee):** Wache halten, versteckter Lagerplatz, Feuer aus oder Fallen. Die Vorsicht des Spielers lohnt sich so mechanisch, ohne neuen Befehl.
- **Der Zeitpunkt wird mitgezogen (neu):** Der Wurf liefert die Minute der Unterbrechung. Zeit und Regeneration werden nur bis dahin gebucht, statt volle Erholung und danach ein Überfall.
- **Was auftritt, entscheidet die Engine** aus der echten Belegung: Living-Dungeon-Slots, wandernde Gruppen oder eine Regionstabelle. Das folgt dem Muster von DUNGEON AHEAD. Nicht nur Kampf: Abenteurergruppe, Spur oder Fund, Störung ohne Kampf.
- **ROAD AHEAD** nutzt dieselbe Rate je Etappe. Die heutige reine *Erlaubnis* einer Unterbrechung würde zu einer festgelegten Begegnung.
- **Abnahme:**
  - Replay und Swipe sind identisch.
  - Eine Verteilungssimulation über viele Seeds zeigt keine festen Abstände und keine Ereignisse an sicheren Orten.
  - Die Regeneration bis zur Unterbrechung ist korrekt.

### 4.2 NPC- und Fraktionsuhren

- **Nur für Bedeutsames:** Stufe-2-NPCs aus §3b, Fraktionen, offene Konflikte. Startwert für einen Prototyp sind etwa 3 aktive Uhren je Region. Das ist kein notwendiges Endlimit (GPT-Präzisierung angenommen).
- **Eine Uhr bildet den Fortschritt einer Absicht ab, sie ist kein Drehbuch** (GPT-Korrektur angenommen).
  - Sie tickt nur, solange Bedingungen aus dem Weltzustand erfüllt sind: NPC lebt und ist frei, der Weg ist passierbar, die benötigte Person oder Ware existiert.
  - Sie hält an, wenn eine Bedingung fällt, und kann zurücklaufen.
  - Alarics Handlungen drehen sie über normale validierte Deltas vor oder zurück, z. B. über einen gelösten Thread oder eine geräumte Banditenstellung.
- **Eine volle Uhr hat nur kleine, engine-eigene Folgen:** Ortswechsel des NPC, Agenda erfüllt oder gescheitert, neuer offener Thread, Aushang am Brett. Sichtbar wird das erst, wenn Alaric es sieht oder erfährt; der Narrator erzählt es. Nie XP, Geld oder Kampfergebnisse.
- **Anschluss:**
  - Die Uhr wird an `agenda` bzw. `thread` gehängt.
  - Sie tickt in einer Funktion nach dem Muster von `syncEvents` bei `time.advanced`, mit Varianz über den Seed-Hash.
  - Alles läuft als Events und damit replaybar.
- **Offen:**
  - Wer legt eine Uhr an? (Engine beim Hervorheben eines NPC; der Extractor höchstens als Vorschlag.)
  - Was zeigt `#journal`? (Nur Bekanntes.)
  - Geheimnisgrenzen.

### 4.3 Wissensverbreitung außerhalb der Szene

- **Kein neues Wissensmodell.** Die Haltung (`knows/believes/suspects`) folgt wie bisher dem **Übertragungsweg**, nicht der Zahl der Weitergaben.
  - *Korrektur durch GPT angenommen:* Mein Vorschlag, bei jedem Schritt eine Stufe abzusteigen, hätte der vorhandenen Semantik in `delta.js` widersprochen.
- **Die Engine erfindet keine Verfälschungen.** Präzisierung zu GPT: Technisch wüsste die Engine sehr wohl, dass ihre eigene Verfälschung falsch ist (`truth: false` wäre korrekt). Der Grund ist ein anderer: Es wäre neuer, nicht erzählter Inhalt. Falsche Versionen entstehen nur aus erzählten Behauptungen (`believe`, `learn` mit `how: rumor`).
- **Verbreitung bei vergehender Zeit** über dieselbe Siedlung, Berufsrollen mit vielen Kontakten (Wirte, Händler, Gildenpersonal) und Beziehungen.
  - Mit Verzögerung und Wichtigkeitsschwelle.
  - `visibility: secret` verbreitet sich nie automatisch.
  - Die Quelle bleibt als Kette `told:<id>` erhalten.
- **Wirkung zuerst nur im Kontext:** Die NPC-Karte zeigt, was die Person gehört hat. Kein globaler Ruf, wie Wanderfolk ihn verwendet.
- Vorbilder: Talk of the Town, Tapestria.

### 4.4 Bogen-Gedächtnis (Ebene 4), erst nach der Messung aus §3b

- **Auslöser sind Szenenbrüche:** ein Thread wird gelöst, ein Dungeon geräumt, eine Region verlassen.
- **Speicherung als Event** mit dem Text und den IDs der Quell-Events. Replay ruft das LLM nicht erneut auf.
- **Erzeugt nie Fakten** (gemeinsame Grundregel).
- **Neu:** Nimmt ein Swipe oder eine Bearbeitung ein Quell-Event zurück, verfällt auch die Zusammenfassung. Das ist genau die Lücke, die Smart Memory hat.
- **Im Kontext** als Rückblick mit niedriger Priorität innerhalb von RELEVANT.

### 4.5 Story Sifting nur als Erzählhinweis

- **Feste Muster über dem Event-Log**, z. B. Rettung → Wiedersehen, Versprechen → Frist fällig, offene Schuld, wiederholter Konflikt mit derselben Person. Winnow-artig auch halbfertige Muster.
- **Treffer werden nicht gebucht** (GPT-Korrektur angenommen; meine erste Fassung „als Thread-Kandidaten buchen“ ist verworfen). Sie erscheinen als optionaler Hinweis im RELEVANT-Abschnitt, ähnlich „Earlier sign“, und werden bei jedem Zug deterministisch aus dem Zustand berechnet.
- Der Narrator darf den Hinweis aufgreifen. Erst erzählte und validierte Folgen werden Welt.
- **Neu:** höchstens ein Hinweis je Zug und ein Wiederholungsschutz, damit ein NPC nicht in jeder Szene dieselbe Erinnerung bringt.

### 4.6 Skills als Weltoperationen

- Organische Skills erhalten Effekt-Tags (Licht, Barriere, Gegenstand bewegen, Enthüllen, Weg öffnen). Diese werden auf vorhandene Delta- und Weltänderungstypen abgebildet: Das LLM wählt, die Engine prüft.
- **Lehre aus dem Paper von 2026:** keine feste Ausführungsreihenfolge der Operationen.

### 4.7 Summons und Begleiter

- **Grundsatz:** keine kostenlosen Zusatzaktionen. Ein Befehl kostet eine Aktion des Beschwörers; die Zahl aktiver Wesen ist begrenzt (Muster: Minion-Trait aus Pathfinder 2e).
- **Prototyp-Hypothese, keine Balance** (GPT-Einwand angenommen): 1 aktives Wesen, Befehl kostet die Minor-Aktion. Endwerte erst zusammen mit Main/Minor und der tatsächlichen Stärke der Wesen.
- Umsetzung über bestehende Entitäten, Encounter und Events mit Ursprung (Skill und Beschwörer) und Dauer. Keine parallele Kampfengine.

### 4.8 Laufzeit – korrigierte Messbasis

**Korrektur an der Claude-Gegenrecherche:** Die zunächst genannten ≈ 19 Token/s, 41–61 % Reasoning-Anteil und `cached_tokens` = 0 stammen aus V3/Pretest 5 (September) und sind **überholt**. GPTs Vorbehalt war berechtigt. Aktuelle Messung aus dem vorhandenen Lauf `testrun_10b/20261026-132758Z-current_test` (Build `.98`, GLM-5.3-Flash über lokalen Endpoint, `reasoning_effort` low, 73 Eingaben):

| | Wert |
|---|---|
| Spielzeit je Zug | Median 21,1 s, p90 38,7 s; mit Testspieler Ø 25,1 s |
| API-Zeit gesamt | 1.371 s: **Erzähler 45 %**, **Extraktor 35 %** (davon Reparaturen 5 % der Gesamtzeit; 13 von 74 Extraktor-Aufrufen waren Reparaturen), Planner 16 %, Board 4 % |
| Prompt-Caching | **wirksam**, ≈ 75 % aller Prompt-Tokens aus dem Cache |
| Ausgabe | Der Extraktor schreibt **genauso viele Inhaltszeichen wie der Erzähler** (93k gegenüber 92k). Reasoning-Anteil an der gesamten Ausgabe (Zeichen): Erzähler ≈ 21 %, Extraktor ≈ 28 %, Planner ≈ 42 %. |
| Testspieler | ≈ 16 % der Zugzeit (eigene GLM-Aufrufe) |

**Folgerungen:**
- Lange Tests entstehen vor allem durch die **Zahl der Eingaben** (Ziel Level 15). 200 Züge kosten bei ≈ 25 s ohne Ausfälle rund 1,4 h je Run.
- Caching ist bereits ausgeschöpft und kein Hebel mehr.
- **Mögliche Hebel, zu prüfen, nicht freigegeben:**
  - Erzähler-Länge.
  - **Kompaktere Extraktor-Ausgabe** (neu): nur geänderte Felder, keine Null-Felder. Der Effekt auf die Gültigkeit muss gemessen werden.
  - Reparaturquote des Extraktors.
  - Engine-only-Befehle.
  - Ein **stärkeres oder anderes Erzählermodell im A/B-Vergleich** (neu, die Lehre aus Craft): Der Endpoint des Nutzers bietet laut Preflight u. a. GLM-5.3, DeepSeek-V4-Pro und Kimi-K2.6. Ob Avereth ein eigenes Modell je Rolle unterstützt, ist ungeprüft.
- **Fehlende Kennzahl** (GPT-Vorschlag, angenommen): **Zeit je tatsächlich ausgeführter Spielerhandlung.** Zugzeit dividiert durch die Züge ohne `NOT EXECUTED`, `soft_continued` oder Plannerabbruch. Das ist aus den vorhandenen Records berechenbar und braucht keine Runner-Änderung.
- Wird ein Aufruf künftig übersprungen, müssen alle Events, Speicherungen und Prüfungen trotzdem stattfinden (GPT-Hinweis).

### 4.9 Spielgefühl messen

- **Objektiv aus Events und Records:**
  - Wiederbegegnungen derselben NPC-ID.
  - Geöffnete und gelöste Threads.
  - Vielfalt von Orten und Szenentypen.
  - Wiederholung von Auftragsarten.
  - **„Unsichtbare Wände“ je 100 Eingaben (neu, Craft):** `NOT EXECUTED`, abgelehnte Deltas, Korrekturen, die Spieler zu sehen bekommen.
- **Wiederholungsmaß ohne LLM (neu):** der Anteil wiederkehrender Wort-5-Gramme zwischen Erzählerantworten bzw. Zeilen derselben NPC in einem gleitenden Fenster. Damit wird GPTs berechtigter Einwand messbar, ein NPC könne trotz korrekter ID „immer dieselben drei Sätze“ sagen.
- **Qualitative Stichprobe mit festem Protokoll** (GPT-Einwand angenommen; Kombination statt Entweder-oder):
  - alle Wiederbegegnungen bekannter NPCs;
  - die erste Szene nach jeweils 50 Eingaben;
  - jede Szene direkt nach einer Ablehnung.
  - Bewertet werden Persönlichkeit, Atmosphäre, Kreativität und Reaktion.
- **Ein LLM-Bewerter ist höchstens Hilfsmittel, kein Abnahmekriterium.** Quilltale dokumentiert dessen Fehlkalibrierung selbst.
- Dasselbe Protokoll auf eine eigene OurDream-Sitzung anwenden, damit der Vergleich auf echten Szenen beruht.

## 5. Gemeinsame Reihenfolge

1. **Jetzt (ohne Produktänderung):**
   - natürlichen Batch auswerten, einschließlich der vorhandenen Laufzeittabellen je Rolle;
   - Zeit je ausgeführter Handlung und „unsichtbare Wände“ je 100 Eingaben;
   - qualitative Stichprobe nach §4.9.
2. **Nach F→E-Scaling und Combat Main/Minor:** Gefahr bei Rast und Reise (§4.1); danach ein kleiner Prototyp für Uhren (§4.2).
3. **Bei nachgewiesenem Bedarf:** Bogen-Gedächtnis (§4.4), Story-Sifting-Hinweise (§4.5), Wissensverbreitung (§4.3).
4. **Später, eigenständig designen:** Skill-Weltoperationen (§4.6), Summons und Begleiter (§4.7) zusammen mit Aktionsökonomie und Balance.
5. **Nicht verfolgen:** Vektordatenbank als Pflicht, ST-Memory-Erweiterungen parallel zur Avereth-Persistenz, dauerlaufende Multi-Agent-LLMs.

## 6. OurDream-Vergleich (eigener Test des Nutzers)

- Ungewöhnliche Handlung: Was bleibt an Handlungsfreiheit?
- Wie wird ein neuer NPC eingeführt?
- 20–30 Züge ohne Kampf: Trägt die Welt ruhige Phasen?
- Woran erinnert sich ein NPC später, und ist er nach über 100 Zügen noch dieselbe Person?
- **Wo** muss manuell korrigiert werden (Geld, Inventar, Ort), und deckt sich das mit Avereths Ablehnungen?
- Wie handeln `#pets`/Summons im Kampf: Bekommt jedes Wesen eine volle Aktion?
- Was hat das Update konkret geändert? Originalszenen kopieren; öffentlich ist dazu praktisch nichts belegt.

## 7. Quellen

- Craft und F&F: [Craft – A New Approach](https://www.craftrpgs.com/blog/craft-a-new-approach-to-ai-rpgs) · [How Franz works](https://fables.gg/blog/how-franz-works) · [Patch Notes 26.03](https://fables.gg/patch-notes/patch-notes-2603-craft-update) · [F&F Changelog](https://help.fables.gg/changelog)
- Projekte: [Tapestria Architektur](https://tapestria.quest/docs/architecture/) · [Quilltale](https://github.com/Aeesh/Quilltale) · [Intra (Bicking)](https://ianbicking.org/blog/2025/07/intra-llm-text-adventure) · [Wanderfolk](https://www.indiedb.com/games/wanderfolk) · [Obsidian Summoner RPG V4.6 (winkme.ai)](https://winkme.ai/@Obsidian-Summoner-RPG-[V4.6]-552897c3)
- SillyTavern und Memory: [Smart Memory](https://github.com/senjinthedragon/Smart-Memory) · [Memory Books](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) · [ST-Memory-Leitfaden 2026](https://www.roborhythms.com/sillytavern-memory/) · [AI Dungeon Memory](https://latitudegames.notion.site/What-is-Memory-f2bc3e77bb1b48aca3716aeba21b8d21) ([Hilfeseite](https://help.aidungeon.com/faq/the-memory-system)) · [SillyTavern Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- Forschung: [RPGBench](https://arxiv.org/abs/2502.00595) · [World-State Transformations](https://www.alphaxiv.org/abs/2605.24719.md) · [Generative Agents](https://arxiv.org/abs/2304.03442) · [Lyfe Agents](https://arxiv.org/html/2310.02172v1) · [Affordable Generative Agents](https://arxiv.org/abs/2402.02053v2) · [Zep/Graphiti](https://arxiv.org/abs/2501.13956v1) · [Talk of the Town](https://ojs.aaai.org/index.php/AIIDE/article/view/12825) · [Winnow](https://github.com/mkremins/winnow) · [Felt](https://github.com/mkremins/felt)
- Spieldesign: [Dota 2 PRD](https://liquipedia.net/dota2/Random_Distribution) · [AI Director, Booth-Interview](https://www.gamespark.jp/article/2007/04/10/11866.html) · [RimWorld Storyteller](https://rimworldwiki.com/wiki/About_RimWorld) · [Blades: Progress Clocks](https://roll20.net/compendium/BITD/Rules:Progress%20clocks) · [Dungeon World Fronts](https://roll20.net/compendium/dw/Rules:Fronts) · [PF2e Minion](https://2e.aonprd.com/Traits.aspx?ID=109) · [PF2e Summoned](https://2e.aonprd.com/Traits.aspx?ID=706)
