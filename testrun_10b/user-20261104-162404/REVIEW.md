# User-Testrun 01 – persönlicher GLM-Livetest auf Build .155

**Stand 04.11.2026 · Review / keine Produktimplementierung.** Dies ist der erste hier gesondert archivierte persönliche User-Testlauf, kein Batch-Runner-Lauf. Ausgangsbuild 4.3.0-c.6.6.155 / Produktcommit [62672d8](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/62672d875ad02204c06d9b9f76425f1127572ad7); SillyTavern 1.19.0 auf Windows, natürliches Modell zai-org/GLM-5.3-Flash. Bericht auf Basis der vier vom Spieler eingereichten Dateien, nicht nachträglich reproduzierter Engine-Tests. Persönliches Feedback einschließlich Originalwortlaut und getrennten Bewertungen: [USER_FEEDBACK_REVIEW.md](USER_FEEDBACK_REVIEW.md).

## 1. Quellen, Umfang und Zuverlässigkeitsgrenzen

- Vollständiger [Chat](originals/chat.jsonl) (75 Nachrichten ohne JSONL-Metadaten: 37 Spielerbeiträge inklusive Erstellung und #assign, 38 Assistenzbeiträge inklusive Begrüßung), [Eventexport](originals/events.json) (67 Recordgruppen; **635 Events**) und [unverändertes Originalfeedback](originals/Userfeedback%20Spielgef%C3%BChl.txt) auf main archiviert. Die 67 Eventgruppen wurden per Index und Inhalt mit den Events des JSONL verglichen: **67/67 identisch**, keine Abweichung. Alle 67 Gruppen melden Build .155.
- **33 Engine-Turns** (turn.begun), 31 Extractor-Ergebnisse mit Status applied, darunter **3 reparierte Extraktionen** (Chat I18/I32/I42); 1 reparierter Planner-Output (I59). **29 abgewiesene Extractor-Deltas**, überwiegend Schutzentscheidungen, nicht 29 verlorene Spieleraktionen. Keine globale Integritätsquote daraus ableiten.
- 3 regelgerechte Kämpfe: 4 Glass Beetles, 2 Mineral Slimes und die Glimmer Queen; insgesamt 7 besiegte Gegner. Charakter Mage, Start Level 1, nach Dungeon Level **7** (sechs Level-ups). Glimmerdeep Level 1 wurde im Dungeonzustand cleared; Guild-Quest wurde später mit 60 cp Auszahlung wirklich abgeschlossen. Neuer Ghoul-Quest aktiviert; Run endet **manuell/offen** nach dem Problem am Cairn Field, nicht durch Tod oder technischen Terminalabbruch.
- Geldpfad: Start 50 cp → Guild-Registrierung -20 → Glimmerdeep-Belohnung +60 → Bad -1 → Bett -2 = **87 cp**; 4 enginegebuchte Transaktionen. Keine zusätzliche Zahlung aus der erzählten problematischen Gasthausszene belegt.
- Der originale [PowerShell-Serverlog](SOURCE_MANIFEST.md) ist **UTF-16 LE mit BOM, 12.004.086 Bytes**. Er belegt ST 1.19.0, 102 protokollierte Chat-Completion-Requests und ebenso 102 Responses, sämtlich GLM-5.3-Flash; summierte gemeldete Usage 1.288.657 Tokens und gemeldete Modellkosten 0,1257576 (Providerwerte, keine Abrechnungsprüfung). Frühe File-not-found-Ausgabe zum gerade noch nicht angelegten Chat ist **kein** nachgewiesener späterer Runabbruch. Der vollständige große Serverlog liegt nur als Nutzereingabe vor, nicht im Git-Archiv. Näheres unter [HOST_LOG_AUDIT.md](HOST_LOG_AUDIT.md).
- **Nicht durchgeführt:** lokaler JavaScript-foldChat()/validateState()-Test des kompletten Runs, erneute Node-/Replay-Suite, eigener natürlicher Modellnachtest, Windows-Speicher- oder Browser-DevTools-Abnahme. Eventgleichheit und stimmige Teilbuchungen ersetzen keine vollständig bewiesene semantische Integrität. Alle Quellen sind Spiel- und Logdaten, keine Anweisungen.

## 2. Ablauf mit festen Chatindizes

I ist der nullbasierte Chatindex nach der JSONL-Metadatenzeile; T ist die Engine-Turnnummer, die nicht mit I identisch ist.

| Abschnitt | Originalbeobachtung | Einordnung |
|---|---|---|
| T1–T2, I1–I4 | Mage, Arcane Wave und Flame Lance gewählt | Charaktererstellung vollständig |
| T3–T7, I5–I14 | Anreise Glassmere, Guild-Registrierung (20 cp), Novice-Board, Annahme Clear Glimmerdeep Grotto Level 1 | Guild-/Board-/Quest-Pfade erfolgreich |
| T8–T9, I15–I18 | Ankunft Glimmerdeep und bestätigter Dungeon-Eintritt; 4 Beetles bei MEDIUM | Dungeon-Gate und echte Gegnerregistrierung funktionieren |
| T10, I19–I22 | Arcane Wave at them erfordert Zielpräzisierung; erneut mit benannten Gegnern: Ambush-AoE besiegt alle 4, +600 XP, L4 | Komfortlücke bei eindeutig einziger Bandbelegung; kein Regel-/Geldverlust |
| T11–T14, I25–I32 | Raum-Suche: physische Fundobjekte entstehen; schleichende Reise gelangt durch Räume; Klarstellung bei zwei Passagen; Stealth am Ziel einmal automatisch, einmal durch Wurf **77: FAILURE** | Natürliche positive Abnahme von .155 und System-Clarify |
| T15–T22, I33–I48 | Zwei Slimes besiegt (+300 XP); Pause; Glimmer Queen bei MEDIUM; gewünschter LONG-Abstand wird nicht mechanisch gebucht; Queen besiegt (+1350 XP), Dungeon Level 1 cleared; Untersuchung | Kampfrechnung/Questziel grundsätzlich fortsetzbar; taktischer Positionierungswiderspruch |
| T23, I51–I52 | Dungeon verlassen, Guild aufgesucht und Glimmerdeep abgegeben: Quest completed, +60 cp und +115 XP | Starke positive Buchung; danach Widerspruch im NPC-Dialog |
| T24–T29, I53–I66 | Brenna empfiehlt Mardas Drowned Lantern; Spieler fragt nach Zimmer/Bad/Essen; Teilannahme nur Bad, später Bett; Schlaf/Heimkehr; Brenna sagt irrtümlich Quest sei aktiv, korrigiert sich erst nach Hinweis | Einzelhandel-UX und NPC-/Narrator-Kontinuität |
| T30–T32, I67–I72 | Neuer Boardtag, neuer Ghoul-Auftrag angenommen, Weg zum Schäfer Hesk | Neue Quest/örtliche Reise erfolgreich; Board enthält bereits neuen Glimmerdeep-Auftrag |
| T33, I73–I74 | Spieler will losgehen **und sich bei Annäherung an Ghule anschleichen**. Planner erzeugt journey.continue plus getrennte Stealth-Aktion; Reise NOT TAKEN; Erzähler setzt ihn trotzdem ans Cairn Field | **Erneuter semantischer Handlungsverlust / Erzählungs-Zustands-Split**; letzter Engine-Ort bleibt Hesk-/Shepherd-Shelter |

## 3. Technische und narrative Befunde – getrennt gewichtet

### A. Wichtig: kombinierte Reise + späteres Schleichen scheitert erneut (T33/I73–I74)

Eingabe: „ill go now *i say and make my way over. once i get close enough i crouch down to sneak up on the sleepy ghouls*“.

Originalplanner: journey.continue (seq1) + stealth (seq2), **nicht** das von .155 zusammengeführte stealth + abhängige GO. mapPlan wählt V3-Stealth; Note: „not taken (the prototype resolves one kind of action per message)“ für die Reise. Die Engine prüft Hesk als Beobachter (Stealth d100 2: SUCCESS), **nicht** die Ghule am Ziel. Die nachfolgende Ankunft wird mit no_go verweigert; vier abhängige Meldungen mit scene_context. Der World-HUD-Ort bleibt „shepherd's shelter on the eastern road“, während die Prosa Alaric bereits hinter Steinen am Cairn Field verortet. **Kein bestätigter Ortswechsel** und kein erwiesener Stealth-Erfolg gegen Ghule.

**Bewertung:** prioritäre Fortsetzungslücke der natürlichen Aktionskombination; nicht automatisch Beweis, dass der in T12/T13 erfolgreiche .155-Fix generell rückgängig oder defekt ist. Abgrenzung: journey.continue + bedingtes späteres Schleichen ist ein anderer Planner-/Sequenzfall als gebundenes stealth + GO. Vor Fix anhand Originalplan, Journey-Zustand und Erzählung den erwarteten zulässigen Ablauf definieren; ggf. „näherkommen, dann schleichen“ mit echten Entscheidungs-/Encountergrenzen unterscheiden. Schutz gegen unbelegte Reise ist korrekt; die ungebuchte Erzählung nicht. **Keine Implementation genehmigt.**

### B. T17/I41–I42: LONG-Bewegung wird zu „closer“, Erzählung widerspricht Engine

Eingabe: „i crouch down and walk into LONG distance before i Flame Lance at the Queen“. Queen zuvor MEDIUM. Planner erzeugt move closer zur Queen und Flame Lance. Engine eröffnet Ambush von der mechanischen Situation; Queen schließt MEDIUM → SHORT. Narrator schreibt hingegen, er habe sich in LONG positioniert, „well beyond reach“. Dies beweist **keine** allgemeine Maximalreichweite MEDIUM für Höhlen. Zu prüfen sind Semantik von „into LONG distance“, Distanzänderung/Bewegungsregel, offener Raum und Prosaabgleich; die gewünschte Abstandserhöhung wurde nicht wie beschrieben gebucht. **Taktisches Handlungs-/Darstellungsproblem, gezielter Testkandidat.** Ob räumliche Hindernisse eine Reichweitengrenze setzen sollen, ist eine **offene Designfrage** des Spielers, keine getroffene Festlegung.

### C. Quest abgeschlossen, Brenna behauptet aktiv (T23 → T27)

Quest.status von active → completed und Auszahlung 60 cp sind vor dem nächsten Tag eindeutig enginegebucht (I52). In I62 lässt der Erzähler Brenna sagen, der Job stehe noch auf active. **Der tatsächliche Narrator-Request im Serverlog enthält den Questzustand als [completed]**; zudem zeigt späterer NPC-Recall: Brenna empfahl das Inn und „noted the Grotto cleared and sixty copper paid out“. Daher ist der akute Fehler **keine fehlende Engine-Questbuchung und nicht einfach eine fehlende Retrievalinformation**. Der Narrator widerspricht vorhandenem Zustand. Nach Spielerhinweis spielt Brenna ein Nachschlagen im Ledger, ohne zweite Questzahlung.

Zweite, getrennte Frage: Die spezifische soziale Verabredung, sie solle morgen nach Marda fragen, ist zwar im Chat vorhanden, aber im maßgeblichen verdichteten „last meaningful“-NPC-Satz nicht enthalten. Die auf Nachfrage gelieferte Erinnerung deckt nur die Inn-Empfehlung ab. **Bewertung:** belastbarer Hinweis auf verbesserungswürdige Auswahl/Verwendung sozialer Episoden und NPC-Konsistenz; Personennamen, Temperament, Beziehungen und Selbstständigkeit gesondert entwerfen. **Keinen #NPC-Befehl ohne Nutzerentscheidung als beschlossen ansehen.**

### D. Gasthaus: „all three“ wird nur teilweise ausgeführt (I55–I60)

Die erste Szene nennt Bad, Bett und Essen, aber zunächst wird nur das Bad als vollständiges verbindliches Engine-Angebot erkannt; der Narrator nennt weitere Preise uneindeutig. Der „all three“-Planner erzeugt offer.accept für das Bad und separate buy-Versuche für Bett und Essen, dazu sleep. Tatsächlich werden **nur 1 cp für das Bad** bezahlt; die anderen beiden Käufe bleiben pending, Schlaf im selben Schritt refused. Erst nach weiterer Preisnennung wird Bett separat für 2 cp angenommen. Dazu eine offer-Ablehnung „a price the reply does not name“. Kein doppelter Geldabzug; aber der Spielerwunsch zu einem verständlichen Paket führt zu zusätzlichem Aufwand und unstimmiger Zwischenprosa. **P2-UX/Angebotsidentität** – prüfen, ob drei auf einmal konkret vereinbarte Leistungen oder offene Preiszustimmungen vorlagen; keine Preise erfinden oder automatisch zukünftige Mahlzeiten abbuchen.

### E. Höhlenobjekte sind gespeichert, aber nicht bequem auswählbar (I25–I28)

Nach der Suche entstehen als **Engine-Objekte am Raumort** u.a. rusted pick-head, damp canvas satchel, clay jar of pitch-sealed wax und broken trowel in oilcloth; später clay flask und board with scratched message. Es ist daher technisch falsch, aus dem fehlenden Loot-HUD abzuleiten, der Extractor habe überhaupt keine Dinge persistiert. **Das konkrete Problem ist Sichtbarkeit/Entscheidungs-UI** für am Ort liegende, beschriebene Objekte (aufnehmen/liegenlassen), getrennt von automatisch vergebenem Combat-Loot. Daneben gibt es bislang wenig **interessanten wertvollen** Explorationsloot; kein mechanischer garantierter Vorrat wurde für Dungeons bewiesen. Ein späterer optionaler Loot-Generator wäre eine **eigene Designentscheidung**, nicht Teil des Sichtbarkeitsfixes.

### F. Wiederholbarer Level-1-Clear-Auftrag vor Dungeonreset – prüfen

Nach dem abgeschlossenen Glimmerdeep-Clear und noch nicht abgelaufenem Dungeonzyklus zeigt der Day-2-Boardrefresh bereits einen **neuen Questdatensatz** für „Clear Glimmerdeep Grotto, Level 1“ (neue Quest-ID mit Suffix _2). Der Spieler hat diesen zweiten Auftrag nicht angenommen. **Prüfhypothese:** Ist die erneute Listung vor Cycle-Reset bewusst und erfüllbar? Ohne Prüfung der Board-/Cycle-Bedingungen nicht als definitiv unmöglichen Quest fixieren. Für spätere Regression vormerken.

### G. Schutzablehnungen und Warnsichtbarkeit

29 delta.rejected umfassen u.a. engine_owned_fact, ambient, dungeon_foe, creature_continuity, scene_context, no_go und offer. Ein Teil verhindert Doppelquestzahlungen, ungültige Gegner und erzählerisch erzwungene Items. **Nicht** jede Ablehnung ist ein Produktfehler. Relevante Kollisionen sind insbesondere die abgewiesene tatsächliche Ankunft in T33, widersprüchliche Kampfposition und im Inn die Zusatzschritte. Nutzerseitig sichtbare Not-Taken-/Rejected-Hinweise sind hilfreich, lösen den Prosa-/State-Split aber nicht von selbst.

## 4. Gameplay- und UI-Befunde

- **Arcane Wave „at them“ (I19–I22):** alle vier beobachteten Beetles standen im selben einzig belegten Reichweitenband MEDIUM; Planner lieferte target=null, die Engine verlangte ausdrücklich ein Referenzziel. Der Spieler konnte mit der angebotenen Liste handeln; beim zweiten Versuch traf die AoE tatsächlich alle vier. **QoL-Kandidat:** eindeutige Bandbelegung ggf. ohne erneute Zieleingabe zulassen, ohne mehrdeutige Ziele oder ungewollte Freunde/Nebenstehende einzubeziehen.
- **System CLARIFY (I29–I30):** zwei tatsächlich verschiedene Passagen werden als Zielauswahl angeboten, ohne einen Narratorzug als Pseudo-Handlung zu verschwenden. **Positives Feedback, Verhalten schützen.**
- **World HUD / Etageninfo:** im aufgeklappten World-HUD gibt es „Levels: level 1 ...“. Die kompakte Summary wechselt jedoch von „Glimmerdeep Grotto, level 1 — ...“ bei einem Eingangszimmer zu bloß „pillar-field chamber“, „crystal gallery ...“ oder „queen's chamber“. **UX-Lücke der ständig sichtbaren Etagenangabe**, nicht gänzlich fehlendes technisches Floor-Wissen.
- **Target HUD / Awareness:** aktuell sichtbare Ziele, Position und HP sind da; Awareness/Unaware/Suspicious fehlt in der gewünschten schnellen Zielansicht. UI darf die enginegeprüfte Awareness nutzen, **nicht** garantierten zukünftigen Ambush versprechen. Während aktiver Kämpfe erscheinen die Zielinformationen teils doppelt im oberen Hinweis und im Combat-HUD. Layoutkandidat, kein Kampfrechendefekt.
- **Questboard:** fünf dicht beschriebene Einträge mitsamt Killtotal, reported level, Mindestlevelwarnung, Client und Auszahlung sind korrekt informationsreich, aber nach Spielerfeedback schwer zu scannen. Erst Anzeige-/Priorisierungsebene entwerfen, keine spielentscheidenden Gefahrenhinweise unbesehen entfernen.
- **XP:** +600 (Beetles), +300 (Slimes), +1350 (Queen), +115 (Guild turn-in) in diesem kurzen erfolgreichen Dungeonbogen; sechs Levels → L7. Spielerwertung explizit **„XP ist NICHT zu wenig“**. Diesen natürlichen Gegenbeleg gegen pauschale XP-Erhöhungen berücksichtigen; kein allgemeiner Balancebeweis für Rogue/Warrior, Langzeit-F/E oder andere Builds.

## 5. Vorläufige fachliche Reihenfolge – keine Patchfreigabe

1. **P1-Kandidat, Spieleraktion verloren:** T33 journey.continue + konditionales Stealth – aktuelle Story und Zustand trennen sich stark.
2. **P1/P2-Kandidat, taktische Semantik:** gewollter LONG-Abstand → move closer und widersprechende Erzählung; Schwere und zulässige Bandbewegung nach Code-Gegenprüfung konkretisieren.
3. **P2-Kandidaten:** vorhandener completed-Queststatus vom Narrator ignoriert; drei zusammengehörige Inn-Angebote nur teilweise verarbeitet; ggf. nicht passend verfügbare Dungeon-Clear-Wiederholung.
4. **QoL- und Designreviews:** lesbareres Board, sichtbarer Dungeonfloor, Awareness auf Target-Karten, HUD-Deduplikation, eindeutige AoE-Bandauflösung, am Ort liegende Fundobjekte, wertvollerer Nicht-Kampf-Loot.
5. **Offene Sozialdesign-Entscheidungen:** langfristige wichtige NPC-Beziehungen/Episoden, Selektion wichtiger NPCs und eventuell #NPC als bewusste Option; Daten- und Promptkosten nicht ungeprüft aufblasen.

**Nicht behauptet:** .155 allgemein stabilitätsgescheitert, fehlende Objekterfassung als Ursache des Lootproblems, fehlender Questabschluss als Engine-Buchungsfehler, LONG generell in Höhlen unmöglich, XP generell zu hoch, eine zweite Zahlung am Inn, vollständige Git-Archivierung des 12-MB-Serverlogs, automatischer Auftrag zur Implementierung.

## 6. Rückfragen (bis zur Nutzerantwort offen halten)

1. **LONG/Abstand:** Soll ein gewünschter Abstand von LONG **auch in Höhlen grundsätzlich erreichbar** sein, wenn Raumgröße/Sichtlinie es zulassen, oder wolltest du in der konkreten Queen-Kammer tatsächlich bewusst bei MEDIUM bleiben?
2. **Loot-Auswahl:** Meinst du mit „oben in der UI“ eine ständig sichtbare Liste **aller am Ort verfügbaren aufnehmbaren Objekte** oder nur eine kompakte Auswahl, die nach einer Suche/Untersuchung erscheint? Hierzu noch keine Implementierungsfestlegung.
3. **Wichtige NPCs:** Soll die Engine wichtige wiederkehrende NPCs automatisch priorisieren, während #NPC nur ein optionales manuelles Markieren ist, oder möchtest du gerade die Auswahl selbst kontrollieren? Die Zwischenlösung bleibt ein Vorschlag.
4. **Explorationsloot:** Soll jeder relevante Dungeon/Banditenstützpunkt verlässlich etwas **wertvollen** Noncombat-Loot enthalten oder nur eine spürbare Fundchance? Keine Loot-Quote festgelegt.

Die Fragen ändern nichts am archivierten Originalfeedback und an den belegten technischen Befunden. Keine Produktdateien geändert und keine neuen Tests ausgeführt.
