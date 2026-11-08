# GPT-Gegenreview – NPC E2/E3 Istanalyse und Fachplan (08.11.2026)

**Prüfstand:** `main` [`fc2e168`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fc2e1686e0c4bdff33eb8acf3cbd1400d1cfb242), Produkt `.168` [`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980).

**Dokumente:** [`NPC_E2_E3_ISTANALYSE_20261108.md`](../recherche/NPC_E2_E3_ISTANALYSE_20261108.md), [`NPC_E2_E3_FACHPLAN.md`](NPC_E2_E3_FACHPLAN.md), [Claude-Proben und ihr methodischer Hinweis](../recherche/npc_e2_e3_probes/README.md).

**Urteil: Analyse fachlich überzeugend, Architekturvariante A und Paketfolge E2-A → E2-B → E3 beibehalten; Fachplan vor Implementierungsfreigabe gezielt präzisieren.** Die folgenden fünf **P2-Planlücken** betreffen an Code-Schnittstellen belegbare Buchungs- oder Konsistenzrisiken und die zugesagte Testbarkeit; sie sind **keine** Behauptung eines bereits existierenden .168-Produktfehlers der noch nicht implementierten Felder. Kein neuer Grundlagenaudit, kein eigenes Memorysystem, keine zusätzliche Modellinstanz nötig.

**Nachweisgrenze des GPT-Reviews:** tatsächliche `.168`-Quellpfade, die beiden neuen Fachtexte, Claudes dokumentierte Proben und die drei bereits belegten User01/02/04-Szenen wurden unabhängig gelesen und gegeneinander geprüft. **Keine neuen Node-/ST-/Provideraufrufe oder eigenen Probeausführungen durch GPT.** Claudes Fallstatistiken und exakte Falldeltas stammen von seinen im Repository abgelegten Read-only-Proben; es wurden keine zusätzlichen Prozentsätze oder Testausführungen behauptet. **Produktdateien unverändert.**

## 1. Bestätigte positive Planung

- Der Abgleich von vor .158 nach `.168` ist wichtig: E0/E1 haben den alten Brenna-**Lieferausfall** beim aktuellen Kompaktkartenaufbau behoben; verbleiben Rückkehr **vor** Narration, Identität/Anwesenheit, persönliches Wissen und Belegdichte. Ein gespeichertes Erlebnis, seine Auslieferung und die freie Modellnutzung sind getrennte Nachweise.
- **Tam** liefert die Positivkontrolle: vorhandene Knowledge-/Memory-/Thread-Events und erzählte spontane Erinnerung funktionieren. Die nächste Ausbaustufe muss nicht mit einer neuen NPC-Datenbank beginnen.
- **User04** zeigt unterschiedliche reale Integritätsprobleme: Sammelentität für zwei Clerks, pronomenbasierte Gildenabgabe ohne persönlichen Zeugen, erzählte Rückkehr ohne `enter`, falsche Zuordnung einer Schreiberäußerung und personenungebundene Absprachen. Die Analyse trennt sie sachgerecht.
- **Variante A – vorhandene Entities, Knowledge, Facts, Memories und Threads weiterverwenden** – ist angemessener als ein paralleler autoritativer Dossierspeicher. Die Trennung E2-A/ E2-B/ E3 verhindert, dass aus falsch zugeordneten Personen umfangreichere Dossiers entstehen. `attitude` und damit `sideOf` bleiben unangetastet.
- **E0/Budget, Replay, Save/Reload und die freie Erzählerbefolgung** werden als eigene Abnahmen geplant. Keine unbewiesene Behauptung, dass ein geskripteter Extractor die E2/E3-Felder natürlich zuverlässig liefern werde.

## 2. Fünf verbindlich zu schließende P2-Planlücken

### P2-A – `expected.go.met` ohne tatsächlichen Erzählbeleg kann fiktive Anwesenheit buchen

**Plan §§2 R1, 4 E2-A, 8, 12 A1:** Der Extractor soll eine Liste mit IDs aus `KNOWN AT` liefern; die Engine prüft gebuchte Ankunft, Ort, `knownAt`, Leben und bisherigen Nicht-Anwesenheitsstatus und schreibt danach `scene.entered` (`v3({enter:[id]})`).

**Bestätigter Code:** `src/v4/catalog.js:knownAt()` liefert nur die **letzten dort gelassenen** lebenden bekannten NPCs, unabhängig davon, ob diese in der **aktuellen Narratorantwort** tatsächlich auftauchen. `src/v4/world.js:case 'enter'` überspringt bei einer am aktuellen Ort zurückgelassenen Person `presenceInReply`, denn `absentKnown` ist dann false. Claudes synthetischer `probe_keep` belegt, dass ein nacktes `enter` am Zielort schon unter .168 durchgeht.

**Planrisiko:** Eine falsch-positive `met`-ID würde diese bisherige sehr permissive Eintrittsstrecke **automatisch** betätigen. Der Narrator kann „Niemand war an der Rezeption“ erzählen, während der Extractor wegen des angebotenen `KNOWN AT`-Katalogs `met:[clerk]` angibt. Danach ändern sich Anwesenheit, Stealth-Beobachter, mögliche Wissens-/Erinnerungszuordnungen und PULSE-`held`-Voraussetzungen. „Wenn das Feld falsch/fehlend ist, bleibt alles wie heute, kein Schaden“ gilt nur bei **fehlenden** Feldern, nicht bei falsch-positiven.

**Auflage:** Das `met`-Reporting muss an **belegtes tatsächlich Erzähltes** gebunden sein, nicht nur an Existenz in der `KNOWN AT`-Liste. Z. B. ein **kurzes wörtliches `evidence`-Fragment pro Person** und enges überprüfbares Zuordnungskriterium zur Antwort (bei Pronomen/Rollenmehrdeutigkeit konservativ nicht raten). Alternativ einen gleichwertigen nachvollziehbar evidenzgebundenen Plan festlegen. Es darf kein zweiter Modellcall nötig sein. Den gesicherten Ankunftsort/Sequenz und die Zuordnung zu **genau diesem GO** überprüfen; nicht schon wegen der bloßen Spielerabsicht eintragen. Wenn der Beleg nicht trägt, bleibt der NPC abwesend, es wird nichts hintergründig „repariert“.

**Pflichtgegenfälle:** (a) GO zur Halle + `met:[clerk]`, Antwort zeigt **nur leeren Schalter** → kein `scene.entered`; (b) erwähnt bekannten Clerk nur als Erinnerung/Erwartung → kein Eintritt; (c) tatsächliche „both clerks at work“ und der tatsächlich gesehene Crossbowman → richtige IDs, eindeutige Mehrzahlbeziehung; (d) auf Strecke unterbrochenes GO → kein Ziel-`met`; (e) abwesender bekannter Gast einer **anderen** Stadt sowie geheimer/erfunden neuer Name → keine Umdeutung.

### P2-B – `handled_by` braucht tatsächlichen Vertragsabschluss und eine belegte persönliche Bearbeitung

**Plan §§2 R2, 4 E2-A, 5, 12 A2/A3:** `expected.desk.handled_by` als NPC-ID; die Engine würde nach Personen-Events nur Ort, anwesende Gildenfunktion und Lebensstatus prüfen und dann `knowledge.gained(witnessed)` zum Annahme-/Abschlussfakt schreiben.

**Befund:** Diese Bedingungen beweisen **nicht**, dass die Person die konkrete Annahme/Abgabe **selbst bearbeitet** hat. Eine anwesende Gildenperson könnte `handled_by` auch fälschlich zugeordnet bekommen. Der User04-I64-Fall ist zudem eine **bedingte Abgabe nach Ankunft**; `src/v4/commands.js:quest.turn_in` gibt außerhalb des Hallenraums `status:'conditional', condition:'arrive_guild_hall'` und der tatsächliche Abschluss wird in `world.js` erst nach gebuchter Ankunft ausgeführt. Ein `expectedKeys='desk'` nur für „am Schalter jetzt“ würde genau diesen Originalfall nicht abdecken. `quest.accept` besitzt ebenfalls eine bedingte Ankunftsvariante.

**Auflage:** Einen **eindeutig definierten Bindungspunkt** der `desk`-Antwort für direkt `resolved` **und** später tatsächlich `cmd.completed(ok:true)` abgeschlossene `conditional`-Schritte planen; `handled_by` nur für das konkrete `seq` und die konkrete akzeptierte `quest`/Fakt-ID verwenden. Keine persönliche Wissensbuchung bei `refused`, `pending`, `clarify`, nicht erreichtem Hallenort oder falsch zugeordnetem Bearbeiter. Persönliche Bearbeitung benötigt eine **kurz nachprüfbar erzählte Handlung** oder gleichwertigen evidenzgebundenen Nachweis; nicht nur `isGuildPerson`. Die schon bestehende konservative Literalevidenz bleibt Rückfall, keinesfalls global `witnessEvents` lockern.

**Pflichtfälle:** I64 **GO + bedingte Turn-in-Abgabe** mit pronomenbezogenem **tatsächlich** bearbeitendem Clerk → persönliches `completed_contract`-Wissen; keine falsche Wissenverteilung bei nur geplantem GO. I73/I74 unmittelbar akzeptierter Vertrag und tatsächlich bearbeitender neuer Clerk; danebenstehende wiry woman darf nie als **Bearbeiter** gelten. Zwei Gildenpersonen derselben Rolle, nur eine stempelt den Schein. Bei falschem Bearbeiter oder fehlender tatsächlicher Ausführung kein zusätzliches `knowledge.gained`.

### P2-C – `thread.who` ist im vorhandenen V3-Thread-Pfad noch nicht persistent und nicht absprachenunterscheidend

**Plan §§4 E2-B, 5, 7, 12 B2:** `world.js:case 'thread'` soll `who` durchreichen und bei Erledigung ohne `who` den bisherigen Personenbezug erhalten. Der Modulkatalog nennt hier nur `world.js`, `content/deltas.json`, `context.js` und `commands.js`.

**Bestätigter Originalpfad:**
`world.js:case 'thread'` → `v3({threads:[…]})` → `src/delta.js:840` → `src/threads.js:threadEvents()` → `thread.set` → `src/state.js` (das Threadobjekt wird **vollständig** ersetzt).

`threadEvents()` baut derzeit ausdrücklich ein neues Objekt aus `id,text,kind,status,since,updated,source,at,resolution` zusammen: es kennt **kein `who`** und übernimmt **keine zusätzlichen Felder** aus früheren Zuständen. `matchThread()` sucht außerdem nach Wortgleichheit/-überlappung und Kind, **ohne beteiligte Personen zu vergleichen**. Daher reicht das geplante `world.js`-Mapping nicht: `who` geht entweder beim ersten Speichern oder bei der nächsten `resolved`-Antwort verloren, und zwei verschiedene NPCs können ähnliche Versprechen fälschlich als **denselben Thread** erhalten.

**Auflage:** **`src/threads.js` und nötigenfalls `src/delta.js` explizit** in den E2-B-Modulplan aufnehmen. Das Feld bis zum gespeicherten `thread.set` nachweisbar durchreichen, bei ID-Updates/Resolution die vorhandene Bindung erhalten, die Thread-Zuordnung bei neuer freier Formulierung auf Teilnehmende abstimmen. Altthreads ohne `who` unverändert laden; nur bei sicherer Nachzuordnung erweitern, keine erfundene Migration. Persönliche Threadanzeige nicht aus reinem NPC-`who` automatisch als „zwischen Alaric und dir“ interpretieren: **beide Parteien bzw. Alarics Beteiligung müssen eindeutig sein**; `who:[npc]` allein ist kein Beweis dafür, dass der NPC Alaric etwas versprach statt einem anderen NPC.

**Pflichtfälle:** Zwei verschiedene NPCs versprechen unabhängig denselben Gegenstand/dieselbe Hilfe; ihre Threads behalten getrennte IDs und `who` auch bei `resolved`-Update ohne neue ID/Personenliste; Swipe/Reload/Fold erhalten die Bindung; ein NPC→NPC-Versprechen ohne Alaric erscheint **nicht** im `#npc`-Panel als „Open between you“; altes Threadobjekt ohne `who` bleibt gültig.

### P2-D – `knows:` kann nach Hinzufügen einer offenen Absprache weiterhin aus der Kompaktkarte fallen

**Plan §§2 R8, 4 E2-B, 12 B3:** `compactNpcCard` enthält Kopf + **drei vorhandene Felder**. Geplante Reihenfolge ist `toward Alaric` → `open between them / settled` → `last meaningful` → `knows` → `also remembers`.

Bei einem relevanten NPC mit bestehender Haltung, offener Absprache, wichtiger Erinnerung **und persönlichem Wissen** wird `knows` damit wieder zum **vierten** Feld und abgeschnitten. Der dokumentierte F7-Fehler („Brennas kenntnisrelevantes Feld wird verdrängt“) wäre in einer natürlichen E2-B-Situation also erneut vorhanden, obwohl `knows` vor `also remembers` steht.

**Auflage:** Feldprioritäten innerhalb des festen Kopf+3-Felder-Budgets so bestimmen, dass **für die jeweilige Handlung erforderliches persönliches Wissen und die relevante offene Absprache** nicht gegenseitig mechanisch verdrängt werden. Ggf. zwei Daten in einer kurzen Prioritätszeile zusammenfassen oder kontextbezogen auswählen, aber kein pauschales Mehrbudget. Die Testmatrix braucht einen NPC mit gleichzeitig *Haltung + offener Absprache + wichtiger Erinnerung + relevantem Wissen*; bestehende Brenna-Prüfung ohne Thread allein reicht nicht. Die drei Felder und 170-Zeichen-Kappen dürfen bestehen bleiben.

### P2-E – E3 „erst ab zweiter Szene“ ist durch die geplante Namensausnahme nicht gewährleistet

**Plan §§2 R10, 4 E3, 12 C1, 13 D3:** Bindende Aussage: stabile `voice/manner/interest`-Anker **nicht beim Erstkontakt**, nur aus bezeugten, wiedererkennbaren Eigenheiten; D3 empfiehlt „ab zweiter Szene“. Die konkrete `anchorAllowed(id)`-Bedingung lautet aber **„benannt ODER bedeutsame gemeinsame Erinnerung aus früherer Szene ODER offene Absprache“**. Ein NPC kann **bereits bei der ersten Einführung benannt** sein. Seine Präsenz und ein einmaliges Verhalten reichen nach dieser Bedingung zur sofortigen Speicherung: logischer Widerspruch zur beschlossenen Grenze und Risiko dauerhaft festgeschriebener Erstreaktion.

**Auflage:** Für „zweite Szene“ eine tatsächlich vorhandene **frühere, eigenständige Szene/Turn-Episode** nachweisbar machen, unabhängig davon, ob die Person heute erstmals einen Namen erhält. Eine reine Named-/Importance-/Promise-Salienz kann zusätzlich für Priorisierung dienen, **nicht** als Ersatz für nachgewiesene Kontinuität. Falls E3 stattdessen ausdrücklich wenige erstmals belegte, dauerhaft wirkende Merkmale sofort zulassen soll, D3 als **offene Designwahl** markieren und nicht heimlich als „zweite Szene“ ausgeben. Gegenfälle: beim ersten Auftreten bereits benannter NPC + temperamentvoller Satz → kein Daueranker; später tatsächlich wiederbegegnete Person mit konsistentem Verhalten → Anker; aktuelle Wut/Trauer ≠ stabiler Charakter; neues konsistent belegtes Merkmal darf alten Anker kontrolliert ablösen.

## 3. Weitere enge Präzisierungen (P3 – keine neue Generalplanung)

- **Sammelpersonen R3:** Das Verwerfen von `person.new: two clerks` schützt vor falscher Einzelidentität, lässt aber absichtlich zunächst **gar keine** individuelle Person entstehen. Den Übergang „als Gruppe sichtbar → eine konkret identifizierte Person handelt“ und sinnvolle Extractor-Reparatur/Neuaufnahme beschreiben, statt am Schalter in einer Endlosschleife immer nur `collective_person` abzulehnen. Keine automatisch erfundenen zwei vollständigen Biografien.
- **R5 Personenbehauptungen:** Ein `remark` mit NPC-Subjekt kann den **wahren Umstand, dass der NPC das behauptet hat**, speichern, ohne die behauptete Questvergabe zum Enginezustand zu machen. Den „story account“-Labelpfad auf Sprecher/Behauptung begrenzen; nicht jede andere korrekte freie NPC-Tatsache als potenziell falsch abwerten.
- **R9 `stripOwned`:** Koordinationsschnitt muss den sozialen Satzrest erhalten, aber PC-Entscheidungen, Geld, Gegenstände und kampf-/questautoritative Inhalte bei **jedem** Teilstück unverändert schützen. Fälle mit Zitat, Pronomen, Doppel-`and` und widerrechtlicher Kauf-/Siegbehauptung als rote/positive Kontrollen ergänzen; keine unbestätigte automatische Wiederherstellung alter abgelehnter Ereignisse.
- **R6 Ankunftskarten:** Vorbedingung autorisiertes, nicht bloß geplantes GO; Ankunftskarten müssen **NOT YET SHOWN** bleiben. Bei mehrteiliger Reise/Stop vor dem Ziel und bei einer Handlung mit wichtigem anwesenden NPC **vor** Abreise darf der Ersatz des Gesprächspartnerslots keine notwendige laufende Dialogkontinuität verlieren. Unter bestehendem Budget durch Szenenbeleg messen.
- **Umsetzungsschätzung:** Der Fachplan nennt E2-A/E2-B je „≈ 5 Dateien“, aber der reale Thread-Pfad und Quest-`expected`-Verarbeitung sind Querschnittsschnittstellen; Aufwand und Tests danach korrigieren. Ohne eigene Modelle gilt `0` Zusatzcalls, nicht aber `0` Extraktor-Tokens; die angegebenen +60/+130 Tokens sind vorläufige Schätzungen.

## 4. Empfehlung und nächste konkrete Planungshandlung

**Paketfolge und Variante A bestätigen; keine Implementierung freigeben, bis P2-A–E in `NPC_E2_E3_FACHPLAN.md` eng nachgebessert sind.** Nicht noch einmal sämtliche drei Originalruns oder die gesamte NPC-Architektur auditieren. Die an den aktuellen Codepfaden dokumentierten Lücken werden durch wenige zusätzliche Regeln und Gegenfälle geschlossen. Bei Nutzerdesignentscheidungen aus §13 keine stillen Festlegungen: bestehende Empfehlungen dürfen für den Entwurf als **vorläufig** markiert werden, neue soziale Spielregeln bedürfen Nutzerfreigabe.

Ein einzelner Claude-Folgeauftrag soll:
1. die fünf P2-Punkte und deren konkrete Negativfälle im bestehenden Fachplan präzisieren;
2. `src/threads.js` (ggf. `delta.js`) und direkte/bedingte Guild-`expected`-Integration in die Modul- und Testliste aufnehmen;
3. zwingende Feld- und Belegevidenz entlang bestehender Actor-/Arrival-/Guild-Pfade benennen und die D3-Salienz-/Szenengrenze konsistent machen;
4. die Dokumente auf `main` knapp überarbeiten und **keinen Produktcode** ändern;
5. den Abschluss mit fachlichem Entscheidungsvorschlag und tatsächlich ungelösten Nutzeroptionen melden.

Danach gezielter Gegencheck, erst anschließend separater E2-A-Implementierungsauftrag. Kein Pflicht-Naturtest für die **Planfreigabe**, aber eine spätere freie Modellprüfung ist für die Qualität der Actor-/Memory-Erfassung unverzichtbar.

**Quelle:** Inhaltliche technische Einordnung unter diesem festen Produkt-HEAD; keine neuen Regressionen, Node-/ST-Tests oder Modellcalls durch GPT.
