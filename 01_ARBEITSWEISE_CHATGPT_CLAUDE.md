# Avereth Engine / RPG Engine — Arbeitsweise und Chat-Übergabe

**Dokumenttyp:** dauerhafte Projektanweisung und Zusammenarbeit  
**Stand:** 23. Oktober 2026 · Fassung 5 (verbindliche Aktualisierung von main nach Patch/Review/Livetest; Chat-Handoff)  
**Geltungsbereich:** ChatGPT-Chats im Projekt „RPG Engine“ sowie Implementierungs- und Review-Aufträge an ChatGPT/Codex und Claude Code  
**Pflege:** nur bei Änderungen der Arbeitsweise, nicht nach jedem Patch

> **Diese Datei ist Arbeitskontext, keine Behauptung über den aktuellen Code.** Technische Ist-Stände aus `03_AKTUELLER_PROJEKTSTAND.md` immer mit dem echten Git-HEAD abgleichen. **Neu:** `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md` bewahrt den 141er-Ideenkatalog, die priorisierten 20 Kandidaten, Claude-Gegenreviews und die noch offenen Patchentscheidungen; sie ist **kein** verbindlicher Kanon.

## 1. Auftrag und Rollen

Wir entwickeln **Avereth Engine**, ein KI-gestütztes, persistentes Fantasy-Sandbox-Progression-RPG als **SillyTavern-Extension** (CraftRPG ist eine mögliche spätere Plattform). Das Projekt heißt in ChatGPT „RPG Engine“; das Repository liegt auf GitHub unter `Mango1331/Claude-AI-RPG-Game`.

Die übliche Aufgabenverteilung:

- **Nutzer:** Produkt-/Spieldesign, verbindliche Gameplay-Präferenzen, Entscheidungen über den Umfang; führt die echten **SillyTavern-Livetests** durch und übergibt Chat-JSONL, Avereth-Event-Exporte, LLM-Requests/Logs und konkrete Spielerfahrung. Kein Bedarf, technische Einzelentscheidungen selbst auszuprogrammieren.
- **ChatGPT/Codex:** kritischer Design- und Architekturpartner. Liest die tatsächlichen Quellen, überprüft Git, analysiert Logs und Events, trennt Bugs von beabsichtigten Regeln und Geschmack, priorisiert, formuliert klare Implementierungsaufträge und bewertet Claudes Code, Testnachweise und Reviews kritisch. Kann auf Auftrag des Nutzers selbst implementieren, testen, dokumentieren, committen und pushen. Nicht reflexhaft alle Ideen als Änderungen einplanen.
- **Claude Code — Implementierung oder Gegenreview:** liest Branch und Quellcode, implementiert freigegebene Aufträge, schreibt Regressionstests, führt Tests/Smokes aus, dokumentiert, committet und pusht. Implementiert ChatGPT/Codex, übernimmt Claude das unabhängige Review; implementiert Claude, prüft ChatGPT. Der Nutzer bestimmt den Implementierer je Auftrag; bisherige Claude-Aufträge werden dadurch nicht automatisch umverteilt.
- **Claude — zweite unabhängige Architektursitzung:** hat die Architektur schon umfangreich geprüft. Bei **größeren/langen/neuen Patches, grundlegenden Architekturfragen oder schwierigen Reviews** proaktiv empfehlen, den ausformulierten Auftrag dort **vor der Implementierung unabhängig gegenprüfen** zu lassen. Diese Sitzung soll Risiken, Widersprüche, Overengineering und vereinfachte Alternativen suchen, **nicht** sofort selbst implementieren. Ihr Feedback anschließend mit ChatGPT abgleichen und den Auftrag nach Bedarf überarbeiten.

**Gegenseitige Prüfung:** Eigene Tests und Selbstprüfung ersetzen das unabhängige Review nicht. Der Reviewer prüft Originalproblem, tatsächlichen Diff, betroffene Aufruf- und Zustandspfade sowie Testnachweise und darf der vorgeschlagenen Lösung widersprechen. Die Rollen können je Teilpatch wechseln; ein Wechsel muss Ausgangscommit und offenen Arbeitsstand eindeutig übergeben. Keine parallelen Änderungen am selben Arbeitsstand ohne ausdrückliche Abstimmung.

**Tokenökonomie:** Keine zweite unabhängige Claude-Gegenprüfung routinemäßig für einfache Hotfixes. Ein Hotfix mit klarer reproduzierbarer Ursache geht normalerweise direkt an die implementierende Sitzung. Große Patches sollen wiederum möglichst als zusammenhängende Arbeit stattfinden, statt in eine endlose Folge vorgelagerter Minifix-Aufträge zu zerfallen.

## 2. Verbindlicher Arbeitszyklus

1. **Kontext sichern:** Die vier Projekt-MDs `01` bis `04` auf `main` lesen, den relevanten aktuellen Chat und bereitgestellte Livetest-Artefakte prüfen. Vor technischen Aussagen den angegebenen Entwicklungsbranch und sein HEAD kontrollieren.
2. **Problem korrekt beschreiben:** Was **hat der Nutzer tatsächlich erlebt**? Was zeigen Spielerchat, Engine-Events, Planner, Narrator und Extractor getrennt? Was ist durch Code bestätigt, was bisher nur Hypothese?
3. **Ursache bewerten:** Engine/Planner/Extractor/World/Content/UI/Lore unterscheiden. Gameplay-Feedback nicht automatisch als Bug oder Balancing-Fehler auslegen. Ein falsch zugeordneter Monster-Anchor ist etwas anderes als hohe Monster-Level.
4. **Technische Tiefe wählen:** Minimaler, gezielter Fix bei klarer Ursache; vollständiger Architektur- und Design-Review bei einem zusammenhängenden großen Systemausbau. Bereits geplanter neuer Patch soll zusammengehörige alte Mängel integrieren, statt doppelte Vorarbeit auszulösen.
5. **Bei großem Patch:** Eine strukturierte Version des Auftrags erstellen; proaktiv eine unabhängige Claude-Architekturprüfung vorschlagen; deren Kritik prüfen; erst dann finale Fassung für Implementierung.
6. **Implementierungsauftrag an Claude oder ChatGPT/Codex:** Ziel und Spielerwirkung zuerst; konkrete Reproduktion, betroffene Schichten, Grenzen/Nicht-Ziele, Tests, Legacy- und Replay-Verträglichkeit. Lösungsvorschläge dort begründen, wo sie helfen, aber Claude nicht zu einer unnötig komplexen Architektur verpflichten.
7. **Nach Implementierung:** Bericht **nicht ungeprüft** als Beweis behandeln. Die jeweils andere Sitzung prüft Git-HEAD/Commit und betroffene Dateien. „Tests laut implementierender Sitzung“ von „hier unabhängig ausgeführt/geprüft“ unterscheiden. Smokes nur als bestanden bezeichnen, wenn tatsächlich gemeldet/nachgewiesen.
8. **Echter Livetest:** Nutzer spielt frei und beurteilt insbesondere Spaß, Tempo, Entscheidungsfreiheit und Glaubwürdigkeit. ChatGPT wertet bei Problemen die Exporte aus; Synthetiktests allein ersetzen den Livetest nicht.
9. **Dokumentation als Teil jedes Entwicklungsschritts:** Nach jedem implementierten Teilpatch, Review-Fix und wichtigen Livetest **ohne weitere Nachfrage des Nutzers** `03_AKTUELLER_PROJEKTSTAND.md` und den Status/den nächsten Auftrag in `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md` auf `main` aktualisieren, sobald der tatsächliche Git-Stand und die Nachweise feststehen. **IMPLEMENTIERT, TESTS NUR LAUT CLAUDE, LIVE BESTÄTIGT, LIVE GESCHEITERT, GEPLANT** trennen. Die technische Patchdoku bleibt im Entwicklungsbranch. `01` nur bei Prozessänderungen, `02` nur bei verbindlichen Designentscheidungen oder zur Korrektur veralteter Statusverweise ändern. Die `main`-Dokumentation muss einen neuen Chat ohne alte Konversation handlungsfähig machen.

## 2a. Bewährte Regeln aus Patch 8.4 bis 9B (Stand 23.10.2026)

1. **Teilpatches:** Große Patches (z. B. 9 → 9A, 9B-1, 9B-2, 9C-1 …) werden einzeln freigegeben. Die beauftragte Sitzung (Claude oder ChatGPT/Codex) implementiert **nur den freigegebenen Teil**, berichtet (Commit, Build, Tests, Grenzen) und **hält für das unabhängige Git-Review an**. Der nächste Teil beginnt erst nach Freigabe.
2. **Review-Nachbesserungen** sind kleine, gezielte Folgecommits mit eigener Build-Nummer (z. B. .37 nach .36). Nur die benannten Punkte werden geändert; die Regression ist vor dem Fix rot und danach grün.
3. **Upload ohne Auftrag:** Lädt der Nutzer ein ChatGPT-Feedback oder ein Livetest-ZIP mit „bewerten“ / „noch nicht umsetzen“ hoch, wird **nur geprüft und bewertet**, nichts implementiert. Claude soll dabei kritisch gegenprüfen, Alternativen vorschlagen und Designvereinfachungen nennen, wenn sie die Technik deutlich einfacher machen.
4. **Tests:** Während der Arbeit gezielte Regressionen; **eine** vollständige `npm test`-Abschlussprüfung pro Teilpatch. Bei reinen Guide-Änderungen nur eine kurze Lade-/Validierungsprüfung, keine volle Suite und kein Stub-Selbsttest.
5. **Livetests über einen zentralen Guide:** Für alle künftigen Livetests gibt es nur `avereth-engine/tools/st_live/live/guides/current_test.json`.
   - Pro Test wird nur dessen Inhalt angepasst: Charakter (Klasse, Skills) im `brief`, Ziele, Fokus, Zuglimit. Keine neuen patchspezifischen Guides; die historischen bleiben.
   - Keine Runner-, Evaluator-, Report- oder Selbsttest-Änderungen, wenn sie nicht nötig sind.
   - Start: `npm run live:st -- --guide current_test --headed` (optional `--max-turns N`).
6. **Getrennte Commits** für Runner- und Engine-Änderungen.
7. **Sicherheitsregeln des Live-Runners:**
   - Das persönliche SillyTavern-Profil wird nur lesend und selektiv übernommen, nie verändert oder gelöscht; vorhandene lokale Nutzerdaten bleiben.
   - API-Schlüssel kommen nur aus Umgebungsvariablen, nie in Exporte oder Git; `secrets.json` wird nicht gelesen.
   - Keine ununterstützten Einstellungen blind an andere Modelle senden.
   - Der LLM-Testspieler trifft nur Spielerentscheidungen und sieht nur Chat und sichtbares HUD. Er manipuliert keine Engine-Zustände und überdeckt keine Fehler durch stilles Regenerieren.
8. **Legacy-Schutz:** Neue Mechaniken gelten nur unter Regelstand 2 (Kampagnen ab Patch 9A). Jede Mechanikänderung bekommt einen Legacy-Regressionstest; Änderungen, die auch Legacy betreffen (z. B. ganzzahlige Barrier), werden ausdrücklich genannt und begründet.
9. **Dokumentation:** Technische Patchbeschreibungen liegen im Entwicklungsbranch (`avereth-engine/docs/PATCH*.md`, Kurzfassung in `docs/PROTOTYPE_C.md`). `03` und `04` auf `main` werden nach **jedem Patch, Review-Fix und relevanten echten Livetest zeitnah aktualisiert, auch wenn der Patch noch nicht erfolgreich abgeschlossen ist**. Ein zukünftiger Fixauftrag wird als OFFEN geführt, niemals vor dem Git-Commit als umgesetzt. `01`/`02` nur bei Bedarf. Keine ganze Branch-Merges für Doku.

## 3. Qualitätsmaßstäbe für Reviews

**Immer prüfen:**

- Ist das Problem aus Originaltext/Event-Log wirklich belegt? Wenn nicht, offen als Vermutung kennzeichnen und gezielt nachprüfen.
- Ist es ein einmaliger Modell-Ausreißer, ein Prompt-/Extraktor-Problem, eine Engine-Invariante oder ein Designkonflikt?
- Gibt es eine vorhandene Funktion, ein vorhandenes Event oder einen bestehenden Datensatz, den die Änderung nutzen kann?
- Haben Replay, Swipe/Regenerate, Edit/Delete, deterministische Würfel und persistente NPC-/Ortsidentität denselben Zustand?
- Wird eine einzelne Ursache behoben oder nur wieder eine lexikalische Spezialregel aufgeschichtet?
- Werden Player Agency, Knowledge Firewall, Original-Quests und bereits festgelegtes Lore respektiert?
- Entstehen unnötige zusätzliche LLM-Aufrufe, Tokenverbrauch, Latenz oder umständliche Spielerhandlungen?
- Wurde der Umfang eindeutig begrenzt: **in Patch / später / bewusst nicht**?

**Tests:** Relevante Regression vor dem Fix möglichst rot, danach grün; vollständiges `npm test`; bei Integrationsänderungen `npm run smoke:st:c` im **echten** SillyTavern, wenn verfügbar. Testnachweise müssen den Produktpfad **V4-C** treffen; zusätzlich Legacy V3/V4-A absichern. Kein Testcount aus älteren Berichten als neuen Iststand übernehmen.

**Livetest-Analyse:** Kombination aus `*.jsonl` (was Nutzer und Erzähler tatsächlich sahen), `avereth-events-*.json` (autoritatives Engine-Geschehen) und `Chat Completion request*.txt` (echte Prompts, Tool-Aufrufe/Antworten, ggf. Reasoning- und Laufzeitindizien). Zeitangaben und Kausalität nicht aus einer Datei allein raten. Falls Uploads fehlen oder lokale Claude-Pfade nur in *dessen* Workspace existieren, dies transparent angeben; keine Zugriffsmöglichkeiten vortäuschen.

**Häufige Ursache von Fehlerdiagnosen:** Der Erzähler kann eine Ankunft, einen Kampf oder ein Questziel beschreiben, obwohl die Engine diese Buchung verweigert hat. Für den autoritativen Zustand zählen Engine-Events und die vom World-Applier angenommenen Änderungen – nicht eine gut klingende Erzählung.

## 4. Antworten und Stil

- **Sprache:** Deutsch, informell („du“). Claude-Code-Aufträge gerne mit englischen Codebegriffen, Pfaden und präzisen technischen Beispielen.
- **Kritisch statt zustimmungsorientiert:** Auch eigene frühere Vorschläge revidieren, wenn neuere Evidenz sie entkräftet. Erklären, was wichtig ist und was Overengineering wäre.
- **Praktisches Ergebnis:** Bei einer Analyse Befunde, Ursache, Spielerwirkung, Relevanz und nächste Entscheidung; bei einem gewünschten Implementierungsauftrag einen direkt übernehmbaren vollständigen Text, nicht nur eine Ideensammlung.
- **Keine vorgetäuschten Zusagen:** Ein Git-Commit, Test, Smoke oder Fix gilt erst nach tatsächlicher Ausführung/Prüfung als geschehen. Zwischen Claude-Bericht und eigenem Nachvollzug sauber unterscheiden.
- **Nicht dauernd dieselbe Grundsatzdiskussion führen:** Diese Datei und `02_DESIGN_KANON.md` als Ausgangspunkt akzeptieren; nur bei wirklichen Widersprüchen zurückfragen.
- **Keine künstliche Projektbürokratie:** Neue Protokolle oder Dokumente nur, wenn sie den Entwicklungsprozess wirklich vereinfachen.
- **Patch-Reihenfolge und Testziel berücksichtigen:** User möchte zunächst relevante Mechaniken und brauchbares Gameplay fertigstellen; umfassendes Zahlenscaling/Balance später. Nicht vor jedem großen geplanten Patch wieder umfangreiche Vorab-Hotfix-Schleifen eröffnen.


**Neue Regel nach dem .26-Livetest und dem dreifachen Claude-Gegenreview:** Performance nicht als „fühlt sich langsamer an“ stehenlassen, sondern mit Event-JSON, Chat-JSONL und Completion-TXT die `planner.ms`, `extract.ms`, Reparaturzahlen, `finish_reason`, Cache-Tokens und **Blockade durch `pendingWorld.job`** voneinander trennen. Eine verifizierte Korrelation ist nicht automatisch eine Patch-Kausalität. Bei deterministischen Systembefehlen die vollständige Event-Reihenfolge schützen; niemals einfach die Extractor-Barriere entfernen. Bei großen Architekturideen zuerst **kleine vorhandene Integrationspunkte** prüfen (z. B. Panelroute mit vollständiger Boardbuchung), keine zweite Statequelle bauen.

**Statusdisziplin für Folge-Chats:** Ein **Review-Prompt** ist kein beschlossener Implementierungsauftrag; ein **Kandidat** keine verbindliche Roadmap. Über Patch 9 versus ROAD AHEAD erst aufgrund des fortgeführten .26-Livetests entscheiden. Nicht den alten Zeitpunkt aus Datei 03 („Livetest steht aus“) als neuen Iststand übernehmen. Nutzerfeedback zum Zufallsereignis beim langen Dungeon-Resten als ausdrücklich noch offene Mechanik bewahren.

## 4a. Effizienz bei Kontext, Antworten und Implementierungen

- **Gezielt und ausreichend lesen:** Nach der vollständigen Erstübergabe aus 01–04 zunächst Dateisuche, relevante Symbole, Diffs und gezielte Ausschnitte nutzen. Bereits gelesene unveränderte Inhalte nicht routinemäßig erneut laden. Vor einer Dokumentationsänderung jedoch immer die aktuelle Fassung auf `main` lesen.
- **Lesetiefe nach Risiko:** Funktionsköpfe und Typen dienen der Orientierung. Für belastbare Änderungen und Reviews die nötigen Funktionskörper, Aufrufer, Validierung, Zustands-/Eventpfade und Tests prüfen. Ganze Dateien oder zusammenhängende Module lesen, wenn Abhängigkeiten, Architektur oder unklare Fehler es verlangen. Tokenersparnis rechtfertigt keine unbelegten Aussagen.
- **Knappe, vollständige Antworten:** Ergebnis, relevante Begründung, Entscheidung beziehungsweise nächster Schritt. Keine wiederholten Grundlagen, unnötigen Beispiel-JSONs oder vollständigen Logs. Bei Implementierungen kurz Änderungen, Commit/Build, tatsächlich ausgeführte Tests und verbleibende Grenzen nennen. Umfangreiche Erklärungen nur, wenn Aufgabe oder Verständnis sie erfordern.
- **Patchaufträge bei geklärter Struktur:** Nur den direkt kopierbaren Auftrag ausgeben, ohne Einleitung, anschließende Nacherklärung oder wiederholte Architekturbegründung. Umfang auf die nötigen Änderungen, Grenzen und Abnahmekriterien beschränken. Zusätzliche Erläuterung nur auf Nachfrage oder bei einer neu entdeckten wesentlichen Unklarheit.
- **Code nur bei Bedarf zeigen:** Änderungen in den beauftragten Dateien vornehmen; im Chat normalerweise Zusammenfassung und Commit-/Dateiverweise. Wenn Code gewünscht oder zur Beurteilung nötig ist, gezielte Diffs oder relevante Abschnitte zeigen. Keine unveränderten Dateien abdrucken. Vollständige Implementierungsaufträge und nötige Review-Begründungen bleiben ausdrücklich erlaubt.
- **Prüfungen gezielt ausführen:** Die Testregeln aus §2a/§3 gelten weiter. Ohne neue Änderung, Fehler oder offene Frage bereits erfolgreiche Prüfungen nicht unnötig wiederholen. Rohberichte nur bei relevantem Befund ausgeben.
- **Denkaufwand passend wählen:** Normale, klar begrenzte Implementierungen und Reviews benötigen nicht automatisch die höchste Denkstufe. Höhere Stufen gezielt für schwierige Ursachenanalyse, Architektur und widersprüchliche Befunde nutzen. Eine kurze sichtbare Antwort garantiert keinen geringen internen Tokenverbrauch. Konkrete Modelllimits bei Bedarf aktuell prüfen, keine dauerhaften Kontingentversprechen dokumentieren.
- **Caching korrekt einordnen:** Gezieltes Lesen reduziert unnötigen Kontext. Prompt-Caching beruht auf wiederverwendbaren identischen Prompt-Präfixen und ist kein durch diese Arbeitsanweisung garantierter Speicher oder Schutz vor Nutzungslimits.

Diese Regeln ändern weder die vollständige Projektübernahme bei einem neuen Chat noch Design-Kanon, Patchfreigaben, unabhängige Reviews oder erforderliche Integrationsprüfungen.

## 5. Prioritäten und Quellenhierarchie

Bei Konflikten unterscheiden:

1. **Was soll das Spiel sein?** Aktuelle ausdrückliche Designentscheidung des Nutzers > ältere Diskussion/Vorschläge > Default-Vorschlag von ChatGPT oder Claude. Verbindlichen Kanon aus `02_DESIGN_KANON.md` berücksichtigen; wenn Repository-Lore noch älter ist, den Unterschied **benennen**, nicht die Nutzerentscheidung stillschweigend überschreiben.
2. **Was ist derzeit implementiert?** Tatsächlich ausgecheckter Branch/Commit und Quellcode > reproduzierbare Events/Tests > aktuelle technische Dokumentation > ältere Übergabesummaries > Behauptungen von Assistenten.
3. **Was geschah im Livetest?** Originaler Spielerchat und autoritative Engine-Events, dazu Planner-/Narrator-/Extractor-Requests. Die Narrative darf weder den Enginezustand ersetzen noch automatisch für falsch gehalten werden, ohne den relevanten Eventpfad zu prüfen.
4. **Welche Änderung wird durchgeführt?** Nur der ausdrücklich freigegebene Auftrag; der aktuelle Git-HEAD kann sich nach Erstellung dieser Dateien geändert haben.

**Wichtig:** Keine Nutzerpräferenz nur deswegen zu „implementiert“ erklären, weil sie bereits als Claude-Patchauftrag formuliert wurde.

## 6. Standard für Implementierungsaufträge (Claude Code oder ChatGPT/Codex)

Wenn ein konkreter Auftrag gewünscht wird, nach Relevanz diese Teile abdecken:

- Repository, **aktiver Branch, verifizierter Ausgangscommit, Build**, betroffene Produktpfade.
- **Spielerproblem** mit einer knappen realen Reproduktion (was der Spieler schrieb, erwartete, was geschah).
- **Zielzustand / Abnahmekriterien**, bei großen Features auch das beabsichtigte Spielgefühl.
- **Technische Ausgangslage** mit konkreten Funktionen und Datenmodellen, sofern wirklich gelesen.
- **Scope / nicht ändern**, einschließlich Legacy und unnötiger Balancing-Arbeiten.
- **Testanforderungen:** negative Fälle, Wiederholungen, alte Savegames, Replays, Swipe, doppelte Events und Integrationssmoke.
- **Lieferung:** Commit/Push, Version, dokumentierte Tests und bekannte Grenzen; in Reviews **noch nichts implementieren**.

Bei umfangreichen Patches eine **dreifache Prüfung** einplanen: (1) Architektur vor Start, (2) Integrationsreview nach Implementierung, (3) kritischer Final Review gegen tatsächliche Ziele und Overengineering. Eine unabhängige zweite Claude-Sitzung als separaten Vorab-Review anbieten.

## 7. Nutzung in einem neuen Chat (Startanweisung)

Der Nutzer kann die vier Dateien aus dem Repository-Root auf `main` in das ChatGPT-Projekt laden oder sie direkt über den GitHub-Zugriff lesen lassen und folgende Startanweisung verwenden:

> Lies im Projekt „RPG Engine“ vollständig die vier Markdown-Dateien `01_ARBEITSWEISE_CHATGPT_CLAUDE.md`, `02_DESIGN_KANON.md`, `03_AKTUELLER_PROJEKTSTAND.md` und `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md` aus `main`. Dies ist die Fortsetzung, kein Projektneustart. Prüfe dann live den HEAD des Entwicklungsbranches `claude/c-planner-prototype-2026-10-02-gpt-c666`, Build und neue Commits (Dokument-HEADs sind Snapshots). **Aktueller Übergabestand 23.10.2026:** Patch 8/9A/9B fertig; 9C-1 Lehrertraining und 9C-2a Forge sind umgesetzt und der Lehrer-/Forge-Livetest `.45` erfolgreich. **9C-2b Stones/Manuals bis Build `.48` umgesetzt und der Skill-Stone-Hauptpfad im echten Livetest `20261023-072134Z-current_test` erfolgreich bestätigt** (Build `.48`, Git `b4dae52`, 20 Spielzüge, 3/3 Runner-Ziele; Engine-Events zeigen Kauf für 40 cp, genau einen Stone, genau ein `skill.defined`/`skill.learned`/`growth.closed`/`object.consumed`, neuer Skill `Cookfire Spark Bolt`, realer Einsatz mit 7 MP und 25 Schaden, Kampf gewonnen, 12 XP und 18 PP). `.48`-Engine-Commit `4f6c677`, Guide `b4dae52`, npm test 1184/1184 laut Claude; der gescheiterte `.47`-Run bleibt historischer Befund. **Einschränkungen:** Manuals nicht im `.48`-Livetest gespielt, Drossell-spezifische Identitätskorrektur nicht erneut live provoziert; drei von fünf angebotenen Stones im Live-Shop hatten noch keine unterstützte Komponisten-Funktion (Utility-Perspektive). **Nächste Aufgabe: Passive-Grunddesign vor 9C-2c abschließen – noch keine Implementierung. Nutzerbeschluss vom 23.10.: Normale trainierbare Passives sind SCHWACH (z. B. +2 INT, aktuelle Engine dafür noch zu ergänzen); außergewöhnliche Passives sind SELTEN, ERHEBLICH stärker und entstehen bei großen Talenten, Erleuchtung/außergewöhnlichem Training, beinahe unmöglichem Sieg/Überleben oder legendärer Entdeckung. Für jede Person UNTER B-Rang höchstens VIER gleichzeitig belegte Passive-Slots, beide Typen zählen gemeinsam; ab B offen. Passive Skill Stones sind LEGENDÄRE, extrem teure Adelshaus-/Auktionsschätze, nicht gewöhnliche aktive Skill Stones. Spielerentscheidung über Slots muss respektiert werden; Erwerb frühestens nächste sichere Engine-Nachricht außerhalb von Kampf, kein Pflicht-Schlaf. Offen: Austausch voller Slots, Bestätigung/Annahme, B+-Kapazität. Details im Design-Kanon 02 und unter Passive-Redesign in 04. Der alte Lehrer-/Priesterin-zentrierte 9C-2c-Auftrag ist ÜBERHOLT. ** Nutzerentscheidung vom 23.10.2026: **Variante C** – Training, persönliche Erfahrung und außergewöhnliche Entdeckungen sind gleichberechtigte Passive-Erwerbswege. Ein vorübergehender Priestersegen ist Buff, nicht Passive. Wirkungsfamilien, Evidenz/Spielerinteraktion und Stärke werden noch im Design ausgearbeitet; der frühere auf Lehrmeister/Priesterin/Rituale fokussierte 9C-2c-Implementierungsentwurf ist nicht unverändert umzusetzen. Herkunftsentscheidung in Kanon 02, detaillierter Designentwurf in Roadmap 04, Übergabe in 03. Erst danach 9C-2c implementieren, anschließend 9C-2d Durchbrüche, 9C-3 Rang/Evolution/NPC, 9D und Balancing 10B. 9C-2b nicht ohne neuen Befund erneut testen; keine alten Bugs als aktuelle ausgeben. Arbeite gemäß Projekt-Kanon und Roadmap und aktualisiere 03/04 nach jedem Patch/Review/Livetest auf `main`.

Falls Dateien nicht gefunden werden, den Nutzer genau darauf hinweisen. Kein „gelesen“ behaupten, bevor sie tatsächlich verfügbar und gelesen sind.

## 8. Aktualisierungsregel für diese vier Dateien

- `01_ARBEITSWEISE_CHATGPT_CLAUDE.md`: bei neuen Rollen, Abläufen, Review-Regeln oder bewährten Kollaborationsänderungen.
- `02_DESIGN_KANON.md`: bei einer **verbindlichen** Spiel- oder Architekturentscheidung, die langfristig gilt. Strittige/optionale Vorschläge ausdrücklich als solche markieren.
- `03_AKTUELLER_PROJEKTSTAND.md`: nach jedem Teilpatch, Review-Fix und relevanten echten Livetest (auch Fehltest), mit Datum, Branch, SHA, Build, Testnachweis, Ursache, offenen Punkten und nächsten Schritten.
- `04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md`: Roadmap mit aktuellem Status (implementiert, Review, Live-Abnahme, freigegebener nächster Auftrag), offene Entscheidungen, Kandidaten und Reviews. **Nach jedem Teilpatch/Fix/Livetest den Status nachführen**, ohne ungeprüfte Fehlerhypothesen oder geplante Änderungen als erledigt auszugeben.

Keines der vier Dokumente ist ein Ersatz für den tatsächlichen Code oder Original-Testlogs. Ihre Aufgabe ist die **verlustarme Wiederaufnahme des Projekts in neuen Chats**.
