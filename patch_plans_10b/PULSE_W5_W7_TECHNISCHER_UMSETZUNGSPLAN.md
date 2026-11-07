# PULSE W5/W6/W7 – Technischer Umsetzungsplan (Patchnotes vor Freigabe)

**Stand: 07.11.2026 · Implementierungsplan, keine Implementierungsfreigabe.** Geprüfte Remote-HEADs: Produkt `16e7358` / **4.3.0-c.6.6.160**, `main` `6c307ef` (enthält GPT-Gegenreview §12 dieses Plans). Grundlage sind der bisherige [Fachplan §§0–10](FACHPLAN_W5_W6_PULSE.md), der GPT-Gegenreview §11 und die Nutzerentscheidungen §12 vom 07.11.2026, die Vorrang haben. Diese Datei ist ab jetzt der **einzige gültige Umsetzungsplan für PULSE**. Der alte Fachplan bleibt als Quellen- und Entscheidungsgeschichte erhalten; welche Annahmen daraus überholt sind, steht in §4. Am Produktcode, an `02`, `03` und `07` ändert dieser Plan nichts. **Überarbeitet am 07.11.2026 nach dem GPT-Gegenreview §12:** Die Auflagen A1, A2, C1 und B1 sowie die Hinweise aus §12.6 sind in §§0, 2, 5, 6, 7, 8 und 10 eingearbeitet; die Zuordnung steht in §13. Der Review selbst (§12) bleibt unverändert.

---

## 0. Ergebnis in Kürze

- **Die Nutzerentscheidungen A–D sind umsetzbar, ohne die Architektur zu wechseln.** Es bleibt bei *einem* deterministischen Wurf pro Erzählzug. Hinzu kommen fünf Bausteine: Tageszeit als Faktor auf die Grundchance und als Verschiebung der Ereignisarten; eine **globale Fehlwurfserie** im Event-Fold; Kampfpause über `encounter`/`pending_combat`; Dungeons über den **bestehenden Slot-Vorrat** (`dungeon.ahead`) statt über einen neuen Spawner; Rastunterbrechung, die **vor** der Zeit- und Erholungsbuchung entscheidet und nur die tatsächlich geruhten Minuten bucht.
- **Wo ich vom Wortlaut abweiche (Begründung in §2):**
  1. Den Fehlwurfbonus relativ zur Grundchance rechnen (+15 % je Fehlwurf, Deckel 1,75×, absolut höchstens 60 %), nicht als feste +Δ Prozentpunkte. Ein absoluter Bonus macht sichere Innenräume von 6 % auf effektiv 17 % ereignisreich (Simulation §7).
  2. Tageszeit wirkt als Faktor, nicht als Summand.
  3. Eine Pause ergibt genau einen Wurf: Aufeinanderfolgende reine Rast- oder Wartezüge am selben Ort zählen als *ein* Pausenblock. Das verhindert das Farmen mit aufgeteiltem Warten, ohne ein Minutenmodell.
  4. Rastunterbrechung entscheidet **vor** der Buchung der Rast. Wird unterbrochen, führt die Engine spätere Schritte derselben Nachricht gar nicht erst aus (ein weiterer Abbruchgrund in der bestehenden Befehlsschleife). Rast allein und Rast mit angehängter Folgehandlung sind dadurch gleich gefährlich; ein Rollback ist nicht nötig (§12.4, §13).
  5. Neuankömmlinge greifen in **keinem** PULSE-gesteuerten Erzählzug an und nehmen nichts weg, außer innerhalb eines Gefahrenfensters (eine Gruppe) oder bei selbst gesuchtem Kontakt. Dieser wird nur aus **tatsächlich autorisierten bzw. erfolgreichen** Handlungen dieses Zugs abgeleitet und ist an deren Ziel gebunden (§12.3).
  6. Eine anwesende Bedrohung (`held`) unterdrückt das Fenster **ohne Wurf**: kein Event, keine Änderung der Fehlwurfserie (§12.2).
- **Neuer Messbefund (.160):** Mit .160 nachgebaute User04-Turnblöcke liegen schon heute bei 21 von 36 Zügen über dem Budget von 1400 Token, allein durch Pflichtabschnitte (Median 1448). In 33 von 36 Zügen fallen Abschnitte weg, darunter oft die NPC-Karten (`present`). Deshalb ersetzt PULSE die THE-ROAD-Zeile, statt sie zu ergänzen. Ruhige Züge bekommen keine eigene Zeile; die statische Regel steht im Envelope-Abschnitt, der ein eigenes Kontingent hat.
- **Pakete:** **A** Kern, Reise und Grenzen (die einzige Voraussetzung für den ersten natürlichen Test, als Ganzes ausgeliefert), danach **C** Rast und Warten mit Unterbrechung (W7a) und **B** Dungeon-Rahmen (empfohlen in dieser Reihenfolge, §10.6), zuletzt **D** Auswertung und Parameter nach natürlichen Läufen. B und C sind voneinander unabhängig, nur die Dungeon-Rast in C setzt B voraus.

---

## 1. Stand, Quellen und Nachweise

- **Code .160** gegenüber .159: Geändert sind nur Board-Erzählauftrag (`commands.js` `board.read`), Awareness-Texte (`context.js` `npcCard`/`stateNow`), `guardianAccessLines` (`living.js`) und deren Aufnahme in den Pflichtabschnitt `resolved`. Reise-, Zug-, Firewall- und Rastpfade sind unverändert. Die Befunde aus §2 des alten Plans gelten weiter; die Zeilennummern in `commands.js` liegen ab `board.read` um +3 verschoben.
- **In diesem Auftrag ausgeführte Read-only-Proben** (Skripte in [`pulse_probes/`](pulse_probes/)):
  1. `budget160.mjs`: Narrator-Kontext aller User04-Story-Züge mit .160 aus den gespeicherten Records neu gebaut, dazu die Größe der Zeilenentwürfe.
  2. `pulse_v2_sim.mjs`: fünf Formelvarianten über einen Generator realistischer Sitzungen (15, 60 und 150 geeignete Züge) sowie der Fall aufgeteilten Wartens.
- Die .159-Proben (`pulse_probe.test.mjs`, `user04_frames.mjs`, `pulse_sim.mjs`) bleiben historische Ausgangsmessungen. Die Werte des alten Plans aus §2.6 (Mehrfach-GO, Uhrzeit- und Befehlsnummernabhängigkeit) betreffen unveränderten Code und gelten für .160 inhaltlich weiter, wurden aber nicht erneut ausgeführt.
- **Nicht ausgeführt:** keine Produktänderung, keine Vollsuite, keine ST-Läufe, keine Modellaufrufe. Simulationen modellieren einen Entwurf. Sie zeigen geöffnete Fenster, keine tatsächlich erzählten Ereignisse (GPT §11.6).

---

## 2. Bewertung der Nutzerentscheidungen

### A – Tageszeit beeinflusst Chance und Art: **übernommen, als Faktor statt Summand**
- **Grundlage im Code:** `settlement.js:25 dayPart()` kennt `day` (6–19 Uhr), `evening` (19–22 Uhr) und `night` (22–6 Uhr) und wird bereits für Straßenbelebung (`settlement.crowd`) und Zuschauerzahl (`bystanders`) genutzt. Für PULSE kommt **keine** neue Zeiteinteilung hinzu, sondern genau diese.
- **Warum Faktor:** Ein Summand (z. B. +5 nachts) hebt einen Innenraum von 3 % auf 8 % und eine Reise nur von 45 % auf 50 %. Das ist die falsche Gewichtung: Sichere Räume sollen sicher bleiben. Ein Faktor (Basis je Rahmen × Tageszeit) skaliert proportional, und die Tageszeit verschiebt vor allem die **Ereignisart** (nachts mehr `danger`, `strange` und `trouble`, weniger `meeting` und `life`).
- **Dungeons sind tageszeitunabhängig** (unter Tage, Zyklus der Living Dungeons). Die Tageszeit wirkt dort nur indirekt über Kompanien, die nach ihrem eigenen Tagesplan im Dungeon sind (`x.inside`).
- **Keine Nachtgefahr ohne Weltbeleg:** Das volle Gewicht für `danger` gilt nur, wenn die Abstammungskette des Orts (`lineage`) eine Population oder `encounter_levels` hat. Sonst halbiert sich das Gewicht, und es kommen nur Menschen dieses Landes in Frage. Stufen kommen weiter aus Population und Gebiet (`creatureContract`, `world_area`).
- **Tageszeit nach gebuchter Zeit in derselben Nachricht (siehe auch §5.3):** Für Reise zählt die Uhr in dem Moment, in dem der Abschnitt autorisiert wird (nach vorher gebuchten Schritten). Für eine Pause zählt die Tageszeit, die den größten Teil der Pausenspanne abdeckt. Für Szenen zählt die Uhr am Ende der Engine-Auflösung. Alle drei Varianten sind unabhängig von der Befehlsnummerierung, und der Zufallswert selbst hängt nie an der Uhr.

### B – Kampfpause: **übernommen, ohne Zusatzmechanik**
- Kein Wurf, wenn `s.encounter` gesetzt ist oder `pending_combat` nicht leer ist (`engine.js:169`, `openCommitted` `:894`). Das gilt auch für jeden V3-gerouteten Zug, also Kampf, Schleichen und `#`-Befehle.
- Ein Kampf, den eine Antwort beginnt (ein PULSE-`danger` oder ein Angriff einer anwesenden Figur), ändert nichts am schon gespeicherten Wurf dieses Zugs. Ab dem nächsten Zug ruht PULSE.
- **Fehlwurfserie:** wird im Kampf weder erhöht noch zurückgesetzt (kein Wurf, kein Event). Einen begonnenen PULSE-Zustand löscht die Pause nicht: Die Figuren bleiben Weltzustand. Die `held`-Prüfung hält das Fenster zu, solange anwesende Bedrohungen leben.
- **Kampfende:** Der erste Erzählzug danach ist normal geeignet.
- **Gegenargument geprüft:** Ein Reset nach *jedem* Kampf würde Ereignistrauben direkt nach einem Kampf verhindern. Das widerspräche aber der Nutzerregel „nur ein geöffnetes Fenster setzt zurück“. Die Simulation zeigt, dass offene Fenster direkt hintereinander mit Serie nicht häufiger sind als ohne (0,17 gegenüber 0,17). Empfehlung: Nutzerregel beibehalten, als offene Option in §10 führen.

### C – PULSE im normalen Spiel, auch Quest, Dungeon und Rast: **übernommen, mit drei harten Grenzen**
1. **DUNGEON AHEAD bleibt Autorität.** Ein GO in einen ungesehenen Teil, der DUNGEON AHEAD auslöst, ist in dieser Nachricht das Ereignis: kein PULSE-Wurf, Serie unverändert. Andere Dungeonzüge (untersuchen, suchen, zurückgehen, sprechen, rasten) sind geeignet. `danger` im Dungeon ist **kein neuer Gegner**, sondern bindet den nächsten ungetroffenen **Minion-Slot** dieser Ebene (`living.js:249 nextWaiting`) per bestehendem `dungeon.ahead` an seinen Raum. Guard und Boss wandern nie, und ohne freien Minion gibt es kein `danger`. Nicht-Slot-Gegner lehnt `world.js` schon heute ab (`dungeon_foe`).
2. **Gebuchtes wird nicht zurückgenommen.** PULSE entscheidet vor der Buchung, die es beeinflusst (Rast), oder wirkt nur nach vorn (Szene, Reise). Kein Rollback und keine nachträgliche Reservierungslogik.
3. **Selbst gesuchter Kontakt ist an Handlung und Ziel gebunden** (GPT §11.4). Die Ausnahme gilt nur für den Zug mit der Suchhandlung (`go.within`, Suche oder Spurensuche nach der Art einer etablierten Population, GO zu deren Habitat bzw. `q.hunt.at`) **und** nur für Kreaturen dieser Population bzw. der Vertragsart. Maßgeblich ist nur eine Handlung, die die Engine in diesem Zug autorisiert hat (`ctx.resolutions`, bestätigte `auth.gos`) bzw. eine erfolgreiche Suche, nie die bloße Planner-Absicht (§12.3). Fremde Neuankömmlinge unterliegen weiter PULSE.
- **Rast:** Sichere Unterkünfte (Innenraum einer Siedlung) werden nie durch Gefahr unterbrochen; dort sind nur friedliche Szenen beim Einschlafen oder Aufwachen möglich. Draußen und auf der Straße ist eine Unterbrechung mit Paket C möglich, im Dungeon erst mit Paket B (§12.6). Das ist der W7-Teil, den der Nutzer ausdrücklich will. Er braucht eine Erweiterung im Rast-Handler und einen zusätzlichen Abbruchgrund in der Befehlsschleife, keinen W7-Gesamtumbau.
- **Kombinationen:** Pro Nachricht gibt es eine Exposition: die **erste in Planreihenfolge**, also der erste autorisierte Reiseabschnitt oder die erste gebuchte Pause, sonst die Szene am Ende (§5.3).

### D – Steigende Chance nach Fehlwürfen: **übernommen, mit relativem, gedeckeltem Bonus und einem globalen Zähler**
- **Ein globaler Zähler**, weil es nur ein gemeinsames Fenster gibt. Getrennte Zähler je Umgebung würden mehrere Spannungsspeicher parallel aufbauen (z. B. Stadt hoch, Reise hoch), die sich beim Wechsel entladen. Sie wären schwerer nachzuvollziehen und widersprächen dem einen Fenster.
- **Formel:** `p_eff = min(60, 1,75 · p_base, p_base · (1 + 0,15 · misses))`, mit `p_base = Basis[Rahmen] · Tageszeitfaktor`. Das ist eine Variante der Nutzerformel aus §12.2, bei der Tageszeit und Serie multiplikativ statt additiv wirken.
- **Simulation (60 geeignete Züge pro Sitzung):** Die Rate steigt von 1,36 auf 1,82 offene Fenster je 10 Züge. Die längste Ruhephase sinkt im 95-%-Fall von 34 auf 24 Züge. Innenräume bleiben unter 8 %. Offene Fenster direkt hintereinander bleiben bei 0,17 wie ohne Serie. Ein absoluter Bonus (+5/Deckel 60) führt dagegen zu Innenräumen bei 17 % und Dreierclustern in 82 % statt 55 % der Sitzungen.
- **Was die Serie bewegt:** Nur ein *tatsächlich durchgeführter* Wurf verändert sie: `roll ≥ p` → +1, `roll < p` → Fenster offen, Reset auf 0. Keine Änderung, weil gar nicht gewürfelt wird, bei: Kampf, **anwesender Bedrohung (`held`)**, Ausschluss, Systemabfrage, Planner-Fehler, identischer Wiederholung, Folgezug im selben Pausenblock, DUNGEON-AHEAD-Zug und validiertem Suchzug (§12.2).
- **Mehrere Aktionen pro Nachricht:** ein Wurf, also höchstens +1.
- **Spam:** Der Pausenblock bewirkt, dass „warte eine Minute“ ×10 einen Wurf ergibt, genau wie „warte zehn Minuten“ (Simulation mit V3: 10 aufgeteilte Wartezüge auf der Straße ergeben ohne Regel 1,35 statt 0,10 offene Fenster, 8 einstündige Lagerrasten 1,94 statt 0,20). Eine identische Eingabe direkt hintereinander zählt als technische Wiederholung (`state.inputs`). Verschiedene kurze Erzählzüge in der Stadt bleiben normale Züge mit niedriger Grundchance, die Serie ist gedeckelt.
- **Offen, aber nicht erzählt:** Die Serie wird trotzdem zurückgesetzt, weil die Engine nur das geöffnete Fenster sicher kennt. Ein Reset erst bei *erzählt* hinge an der Heuristik des Extraktors und würde nach ignorierten Fenstern Ereignisstürme erzeugen (die Chance bliebe hoch, während das Modell die Fenster weiter liegen lässt). Stattdessen misst Paket A die Umsetzungsquote getrennt (§6, Paket A, Diagnose A5), und die offene Zeile ist verbindlich formuliert.

---

## 3. GPT-Gegenreview §11: Abgleich

| Auflage | Umsetzung in diesem Plan | Verändert durch §12? |
|---|---|---|
| keine ungeschützte P1/P2-Zwischenversion | **Paket A liefert Kern und Firewall gemeinsam aus**, als einzige Basis für natürliche Tests. Interne Commits auf dem Arbeitsbranch sind erlaubt, keine Zwischenauslieferung | nein |
| gesuchte Kontakte handlungs- und zielgebunden | `auth.pulse.sought` aus den Befehlen *dieses* Zugs; die Firewall prüft `population_at` bzw. die Vertragsart der neuen Kreatur | nein |
| kombinierte Board-/Reisezüge eindeutig | reines Board und lokales GO plus Board ausgeschlossen; Fernreise plus bedingtes Board: Der Abschnitt ist die Exposition (Reise), das Board bleibt bedingt | §12: Quest-/Reisehandlung fällt nicht weg, erfüllt |
| Weg zum Dungeon | **Abweichend von GPTs Präferenz einbezogen:** Ein autorisiertes GO aus einer Siedlung zu einem Ziel außerhalb gilt als Reiseabschnitt (`settlementOf`, deterministisch), sodass keine Stadt-PULSE auf der Strecke entsteht. Den Eintritt in den Dungeon vom Tor aus regelt DUNGEON AHEAD | §12 verlangt Reise- und Questabdeckung |
| konkrete Ereignisse von offenen Fenstern trennen | drei Stufen im Record: `open` (sicher), `narrated` (Heuristik), `persisted` (gebuchte Folge) | nein |
| Budget nach .160 messen | gemessen (§8); Konsequenz: Ersatz statt Zusatz, kein Zeilenblock im ruhigen Zug, statische Regel im Envelope | nein |
| keine unautorisierten Angriffe, Wegnahmen, Ankünfte, XP, Beute, Quests | Firewall A3 gilt für *alle* PULSE-gesteuerten Erzählzüge, nicht nur für geeignete; Ankunft, XP, Beute und Quests bleiben in den bestehenden Pfaden | §12 erweitert auf Rast und Dungeon: B/C |
| ROAD AHEAD keine zweite Chance | `roadLine` würfelt nicht mehr; der Reiseabschnitt ist eine Exposition des einen Wurfs | nein |
| Replay ohne Pauschalakzeptanz | eigene Replay-Kategorien, Einzelfallprüfung der geänderten Reisewürfe (§6 A, Tests) | nein |
| kein Mitleidszähler / keine Abklingzeit | **überholt durch §12 D:** gedeckelte Fehlwurfserie, ohne Garantie | ja |
| W7-Warten ausgeschlossen | **überholt durch §12 C:** Pause geeignet; Unterbrechung nur mit Paket C | ja |

---

## 4. Überholte Annahmen aus dem Fachplan §§0–10

| Alte Stelle | Alte Annahme | Jetzt |
|---|---|---|
| §4.4, §7.6 | `rest`/`sleep`/`wait` und Lernen ausgeschlossen | Pausen geeignet (Pausenblock); Lernen bleibt ausgeschlossen (engineseitiger Zeitblock mit Wachstumsabschluss; nicht in §12 verlangt) |
| §4.4 | Dungeoninneres und -tor ausgeschlossen | Dungeoninneres geeignet (Paket B) außer bei einem DUNGEON-AHEAD-Zug; das Tor zählt als Wildnis |
| §4.4 | Ziel oder Ort eines Jagdauftrags als Ausschluss | nur der Suchzug selbst, gebunden an Handlung und Ziel |
| §4.6, §7.7 | kein Mitleidszähler | gedeckelte relative Fehlwurfserie |
| §4.5 | Tageszeit nur für Art und Plausibilität | Tageszeitfaktor auf die Chance und Artverschiebung |
| §4.8, §4.12 | P2 trennt die Firewall vom Kern | Firewall Teil von Paket A |
| §4.12 | P1/P2/P3 | A/B/C/D (§6) |
| §7.5 | Weg zum Dungeon ausgeschlossen | Reiseabschnitt |
| §5 | 35/20/10 ohne Tageszeit | Tagesbasis 35/20/10 (+6 innen, 15 Dungeon) mal Tageszeitfaktor (§5.2) |
| §4.5 | ruhige Zeile pro Zug in Stadt/Wildnis | entfällt; statische Regel im Envelope |

Weiter gültig: Architektur B2, Schlüssel ohne Uhrzeit, Befehlsnummer oder Text, Ereignisarten als grober Rahmen, `held`-Prüfung, keine neuen Modellaufrufe, Extraktor-Prompt unverändert.

---

## 5. Gemeinsames Modell

### 5.1 Ablauf je Erzählzug (C-Pfad, Ruleset ≥ 2)
```
playerTurnV4 → resolveCommands(c:true)
  pre:   pulse = pulseBegin(s, content, ordered, envx)   // Ausschlüsse, Pausenkandidat, Suchmenge; kein Wurf
  Handler:
    go / journey.continue → nach Autorisierung: pulseClaim(ctx, 'travel', {seq, go})      // erster autorisierter Abschnitt
    livingGo mit aheadEvents → ctx.pulse.dungeonAhead = true                                // Paket B
    activity rest|sleep|wait mit gebuchten Minuten → vor Buchung: pulseClaim(ctx,'pause',{minutes,kind})     // erste Exposition; Unterbrechung Paket C
    Befehlsschleife: Schritte nach einer unterbrochenen Pause → refused 'rest interrupted'                      // Paket C
  post:  pulseFinish(s, content, ctx, emit)  // Szene, falls nichts beansprucht; Event, Zeilen, auth.pulse
outcome.recorded (auth.pulse über serializableAuth)
reply → world.js: Firewall A3 liest s.last.outcome.auth.pulse; am Ende pulse.outcome (Diagnose)
```
`pulseClaim` würfelt beim ersten Aufruf und gibt danach immer dieselbe Entscheidung zurück. Mehrfachaufrufe sind dadurch harmlos.

### 5.2 Rahmen, Tageszeit und Grundchance (vorläufig, `rules.json` `pulse`)
| Rahmen | Erkennung | Tag | Abend | Nacht | Begründung |
|---|---|---:|---:|---:|---|
| `travel` | erster autorisierter Abschnitt (Bedingung aus `roadLine` **oder** Aufbruch aus einer Siedlung zu einem Ziel außerhalb) | 35 | 40 | 45 | Tag = bisherige, von GPT akzeptierte Hypothese; Dämmerung und Nacht moderat höher, Hauptwirkung über die Art |
| `wild` | außen, außerhalb einer Siedlung, kein Dungeoninneres (Tor zählt als Wildnis) | 20 | 24 | 28 | wie Reise, aber kürzere Exposition pro Zug |
| `street` | `outdoorsInTown` | 10 | 12 | 8 | `settlement.crowd`: Abend Kneipenbetrieb, Nacht fast leer (weniger Ereignisse, mehr `trouble`) |
| `inside` | Siedlung, nicht außen (Gasthaus, Halle, Laden) | 6 | 8 | 3 | geschützter Raum; Abend Schankstunde; Nacht schlafendes Haus |
| `dungeon` | `insideOf(trueDungeonOf)` (Paket B) | 15 | 15 | 15 | unter Tage; DUNGEON AHEAD liefert bereits die Erkundungsbegegnungen |

Pausen nutzen den Rahmen ihres Orts: Lager draußen = `wild`, Unterkunft = `inside`, Dungeon = `dungeon`. Die Dauer der Pause verändert die Chance **nicht** (Kanon: keine Zusatzchance nur wegen langer Rast).

### 5.3 Exposition und Kombinationen
**Regel (nach §12.4 geändert):** Es beansprucht die **erste Exposition in Planreihenfolge**:
- ein autorisierter Reiseabschnitt (ein abgelehnter oder bedingter Abschnitt beansprucht nichts; GPT §11.7), oder
- eine Pause: `rest`/`sleep`/`wait` mit von der Engine gebuchten Minuten (`engineMinutes`), deren Handler die Buchung tatsächlich ausführen würde. Eine abgelehnte Rast („room not booked“, Klärungsfrage nach der Dauer, `arrival pending`) beansprucht nichts; bloße Erwähnungen von Ruhe im Text sind keine Pause.

Gibt es keine von beiden, gilt die Szene am Ende.

**Folgehandlungen nach einer unterbrochenen Pause** („rastet 3 h, nimmt die Schlüssel, geht weiter“, User04 I47) führt die Engine nicht aus. Die bestehende Befehlsschleife in `resolveCommands` bekommt dafür einen weiteren Abbruchgrund neben `afterTravel`/`unmet`: `{status:'refused', reason:'rest interrupted', line:'NOT DONE — … his rest was cut short before this; he decides again.'}`. Ein so abgelehnter Schritt kommt nicht in `happened`, darauf aufbauende `needs`-Schritte fallen nach der vorhandenen Logik mit. Nichts davon war gebucht, also ist kein Rollback nötig.

**Bestehende Regeln greifen weiter:**
- GO plus Rast: Ruleset 2 lehnt Aktivitäten nach **jedem** autorisierten GO derselben Nachricht schon heute ab (`afterTravel`, „arrival pending“), auch nach einem lokalen GO. Die Rast wird dort nicht gebucht und beansprucht nichts; Exposition ist der Reiseabschnitt bzw. bei lokalem GO die Szene.
- Rast, dann Reise: Die Pause beansprucht das Fenster; ohne Unterbrechung läuft die Reise danach ohne eigenen Wurf.

### 5.4 Eignung und Ausschlüsse (`pulseBegin`)
Ohne Wurf, Serie unverändert:
- Planner- oder Interpreter-Fehler, Panels, Klarstellung (es entsteht ohnehin kein Record)
- `s.encounter`, `pending_combat`, V3-Route, Erstellung, toter Charakter
- `pending` bei `buy`/`pay`/`guild.register`, neue Zahlungskarte (HARD STOP)
- nur `board.read` oder lokales GO plus `board.read`
- alle Befehle abgelehnt oder clarify ohne freie Handlung
- Lernen
- validierter Suchzug, wenn er die erste Exposition wäre (§5.8)
- anwesende Bedrohung (`held`): Fenster unterdrückt, **kein Wurf** (§12.2)
- DUNGEON-AHEAD-Zug
- Folgezug im selben Pausenblock (gleicher Ort, voriger geeigneter Zug war eine Pause, kein Kampf dazwischen)
- identische Eingabe direkt hintereinander (`state.inputs`)

Reiner Dialog und Questzüge (annehmen, abgeben, Fortschritt) sind geeignet.

### 5.5 Ereignisarten (Gewichte Tag/Abend/Nacht, vorläufig)
| Rahmen | meeting | life | trouble | obstacle | trace | strange | danger |
|---|---|---|---|---|---|---|---|
| travel | 30/25/15 | – | – | 15/15/15 | 20/20/15 | 10/10/15 | 25/30/40 |
| wild | 25/20/10 | – | – | 10/10/10 | 30/25/20 | 15/15/20 | 20/30/40 |
| street | 35/35/30 | 40/35/15 | 20/25/45 | – | 5/5/10 | – | 0 |
| inside | 45/45/40 | 50/45/40 | 5/10/20 | – | – | – | 0 |
| dungeon (B) | 10 (nur mit Kompanie auf dieser Ebene) | – | – | – | 35 | 25 | 30 (nur mit freiem Minion-Slot) |

Für alle Arten gilt:
- **Wiederholungsschutz:** Die letzte Art hat Gewicht 0, die drei davor zählen halb (`s.pulse.recent`).
- **Fehlender Weltbeleg:** `danger` hat halbes Gewicht, ein nicht verfügbarer Anteil (Kompanie, Minion) wird anteilig auf die übrigen Arten verteilt.
- **Bedeutung `trouble`:** Spannung, Forderung, versuchter Diebstahl, **niemals** Erstschlag oder Wegnahme im selben Zug (Firewall A3).

### 5.6 Zustand, Event, Schlüssel
```
s.pulse = { v:1, misses:0, recent:[{turn,frame,kind}]≤4, pause:{at, turn, minute}|null }   // fehlt in alten Saves → Default
event pulse.rolled { v:1, turn, exposure:'travel'|'pause'|'scene', frame, phase, base, misses_before, p, roll,
                     open, kind|null, leg:seq|null, interrupt?:{seq, after_min, of_min, cause},
                     wander?:{dungeon, floor, slot} }
pulse.rolled wird NUR bei einem tatsächlichen Wurf emittiert (nie bei held, Ausschluss, Pausenfolgezug, Suchzug)
reducer: misses = open ? 0 : misses+1; recent push bei open; pause = exposure==='pause' ? {at, turn, minute} : null
         'encounter.started' → pulse.pause = null (Pause endet mit Kampf)
auth.pulse = { v:1, governs:true, rolled, eligible, reason?('held'|'sought'|…), exposure?, frame?, phase?, open?, kind?, sought?, interrupt? }
Schlüssel: r = hash32(`${seed}|${turn}|pulse`)%10000/100 · Art: …|pulse.kind · Unterbrechungsminute: …|pulse.at
```
`governs:true` steht auf **jedem** Erzählzug im C-Pfad außerhalb des Kampfes, auch auf ausgeschlossenen Zügen. Die Firewall gilt daher auch dort, wo nicht gewürfelt wurde. Die Würfelfolge (`Dice`, `rng.n`) bleibt unberührt.

### 5.7 Determinismus und Persistenz
- **Swipe, Regenerate, Continue:** Der Record wird wiederverwendet.
- **Reload:** Die Events werden abgespielt, die Serie ergibt sich aus dem Fold.
- **Edit der letzten Nachricht:** gleicher Zustand davor, gleiche Serie, gleicher Zufallswert. Ein durch den Edit geänderter Rahmen kann ein anderes `open` ergeben; das ist kein Nichtdeterminismus (GPT §11.7).
- **Edit älterer Nachrichten:** Der Fold ignoriert den neuen Text.
- **Löschen oder Verzweigen:** Der Fold berechnet die Serie aus der verbleibenden Kette neu.
- **Planner-Fehler, leere Erzählung, Extraktionsfehler:** Entweder gibt es kein Event, oder es existiert bereits vor der Erzählung und wird bei Regenerate wiederverwendet.

### 5.8 Selbst gesuchter Kontakt (nach §12.3)
- **Quelle:** Die Handler registrieren `ctx.pulse.sought` erst, **nachdem** sie eine Handlung autorisiert bzw. eine Suche erfolgreich aufgelöst haben:
  - GO mit `within` (lokale Jagderkundung) nach `ctx.auth.gos.push` → `{population: c.within}`
  - GO zu einem Ort mit `population` bzw. zu `q.hunt.at` eines aktiven Jagdauftrags, nach Autorisierung → `{population}`
  - `activity` `search` mit `check.success` und einem Fokus, der die Art einer Population der Abstammungskette nennt (`namesKind`) → `{population}`
  - dieselbe erfolgreiche Suche nach der Art eines aktiven ATTACK/DEFEAT-Ziels ohne Population → `{contract: qid, kinds}`
- Rohe Planner-Befehle, abgelehnte, bedingte oder geklärte Schritte und fehlgeschlagene Suchen registrieren nichts.
- **Wirkung:** Bei Szenen- und Pausenexposition mit validierter Suchhandlung wird nicht gewürfelt (`reason:'sought'`; sein Aufsuchen ist das Ereignis). Ein **Reiseabschnitt behält seinen Wurf**, auch wenn sein Ziel das Jagdhabitat ist: Das Fenster gilt unterwegs, die Ausnahme nur für die Zielpopulation.
- **Firewall:** Ausgenommen sind nur Neuankömmlinge, deren `population_at` (aus `creatureContract` dieser Antwort) einem registrierten Eintrag entspricht, bzw. unabhängige Kreaturen der registrierten Vertragsart. Personen sind nie ausgenommen. Alles Übrige, auch bei laufender Jagdquest, unterliegt PULSE.

---

## 6. Patchpakete

### Paket A – Kern, Reise und Grenzen (technisch notwendige Grundlage plus Sicherheitsgrenzen; ein Build)
1. **Ziel und Abgrenzung:** Ein Wurf pro Erzählzug für die Rahmen Reise, Wildnis, Straße und Innenraum, mit Tageszeit und Fehlwurfserie. ROAD AHEAD liest diesen Wurf. Pausen werden gewürfelt, aber **nicht unterbrochen**: friedliche Arten vor dem Einschlafen oder beim Aufwachen, `danger`/`obstacle`/`trouble` gesperrt bis Paket C. Dungeoninneres bleibt **vorläufig ausgeschlossen** bis Paket B. Firewall für alle PULSE-gesteuerten Erzählzüge. Diagnose in drei Stufen im Record. **Nicht enthalten:** Dungeon-`danger`, Rastunterbrechung, Report-Aggregation, Parameterfeinschliff.
2. **Dateien und Funktionen:**
   - `src/v4/pulse.js` (neu): `pulseBegin`, `pulseClaim`, `pulseFinish`, `pulseFrame`, `pulsePhase`, `pulseChance`, `pulseKind`, `pulseSought`, `pulseLines`
   - `src/v4/commands.js`: `roadLine` → `roadLeg` (Begleiterlogik `companionOf` bleibt im GO-Handler unverändert, nur Wurf und Zeile entfallen); GO/`journey.continue` → `pulseClaim('travel')`; neue Reiseerkennung „Aufbruch aus Siedlung“; `resolveCommands` → `pulseBegin`/`pulseFinish`; `pace`/`JOURNEY PACING`-Zusatz im offenen Fenster; `activity` → `pulseClaim('pause')` ohne Unterbrechung
   - `src/v4/turn.js` `serializableAuth`
   - `src/state.js` Reducer (`pulse.rolled`, Reset bei `encounter.started`)
   - `src/validate.js` (`s.pulse`)
   - `content/rules.json` `pulse` (Basis, Faktoren, Arten, Serie, Deckel, `recent`); `travel.leg_event_pct` wird zum Alias für `pulse.base.travel.day`
   - `src/v4/world.js` (`envelopeAllows`, `coerce`, Gruppenlimit, `road`-Korrekturtext, `pulse.outcome`)
   - `src/v4/envelope.js` `envelopeLines` (statische Regel)
3. **Datenfluss:** wie §5.1. Neu sind nur die Funktionen in `pulse.js` plus `auth.pulse`; Zeilen laufen über `ctx.extra` in `resolved`. Das abgeleitete `auth.road` lautet `'open'` nur bei offenem `danger`, sonst `'quiet'`. Damit greift die alte Regel weiter, und alte Records bleiben gültig.
4. **Schema und Persistenz:** §5.6. `validateState` akzeptiert ein fehlendes `s.pulse`; der Reducer legt es beim ersten Event an.
5. **Lösung (Pseudocode):**
```js
// pulse.js
export function pulseBegin(s, content, ordered, envx) {
  const P = { v:1, governs:true, claimed:null, sought:[] };   // sought füllen erst die Handler (§5.8)
  P.reason = exclusion(s, content, ordered) // §5.4 ohne held/sought; null = geeignet
  return P;
}
export function pulseClaim(s, content, ctx, emit, exposure, info = {}) {
  const P = ctx.pulse; if (P.claimed) return P.claimed;            // eine Entscheidung je Nachricht
  if (P.reason) return (P.claimed = { rolled:false, open:false, reason:P.reason });
  if (P.sought.length && exposure !== 'travel') return (P.claimed = { rolled:false, open:false, reason:'sought' });
  const frame = pulseFrame(s, content, exposure, info), phase = pulsePhase(s, exposure, info);
  const held = heldThreats(s, info.go);                              // wie roadLine heute
  if (held.length) return (P.claimed = { rolled:false, open:false, reason:'held', held, exposure, frame }); // §12.2: kein Wurf, kein Event
  const st = s.pulse || DEFAULT, R = content.rules.pulse;
  const base = R.base[frame][frame === 'dungeon' ? 'day' : phase];
  const p = Math.min(R.cap_abs, R.cap_mult * base, base * (1 + R.step * st.misses));
  const roll = parseInt(hash32(`${s.meta.seed}|${s.turn}|pulse`), 16) % 10000 / 100;
  const open = roll < p;
  const kind = open ? pulseKind(s, content, frame, phase, exposure, st.recent) : null;
  const d = { v:1, rolled:true, turn:s.turn, exposure, frame, phase, base, misses_before:st.misses, p, roll, open, kind, leg:info.seq ?? null };
  emit({ t:'pulse.rolled', d });
  return (P.claimed = d);
}
export function pulseFinish(s, content, ctx, emit) {
  const d = ctx.pulse.claimed || pulseClaim(s, content, ctx, emit, 'scene');
  ctx.auth.pulse = { v:1, governs:true, eligible: !ctx.pulse.reason, sought: ctx.pulse.sought, ...pick(d) };   // sought: nur validierte Einträge
  if (d.exposure === 'travel') ctx.auth.road = d.open && d.kind === 'danger' ? 'open' : 'quiet';
  ctx.extra.push(...pulseLines(s, content, d, ctx));                 // höchstens eine Zeile, Reise ersetzt THE ROAD
}
```
   **Firewall** (`world.js`, neben der `road`-Regel):
```js
const P = auth.pulse;
if (P?.governs && bornHere.has(id) && !s.encounter && !trueDungeonInside) {
  if (!soughtMatch(s, content, P.sought, id)) {                      // nur validierte Einträge dieses Zugs (§5.8)
    const g = groupKey(s, id);                                       // entity.group oder 'persons'
    if (!(P.open && P.kind === 'danger' && (!hostile.size || hostile.has(g)))) { reject(d, 'pulse', …); correction(…); return false; }
    hostile.add(g);
  }
}
// coerce(): Neuankömmling auf PULSE-gesteuertem Zug → keine Buchung im selben Zug (robbery, fine, confiscation);
// er fordert, Alaric entscheidet; bereits anwesende Autorität: unveränderte mayTake-Regeln
if (P?.governs && bornHere.has(by)) { reject(d, 'pulse_take', …); correction('demanded, not taken'); return; }
```
   **Zeilen** (Englisch, kompakt):
   - offene Reise: `PULSE (the engine's; <phase>, road toward X) — ONE concrete thing happens on this leg: <KIND>. It is a real stop short of X; what he does is his decision. If the reply cannot fit it, nothing happens.` (≈ 60–105 Token, ersetzt THE ROAD ≈ 103)
   - offene Szene: `PULSE (the engine's; <phase>, <frame>) — ONE thing happens around him that he notices: <KIND>. It takes nothing of his and binds him to nothing.` (≈ 55)
   - Pause in A: `… before he settles or as he wakes; the rest itself is as booked.`
   - Envelope, statisch: `New arrivals of this reply do not attack Alaric or take anything from him unless a PULSE line names DANGER (then one group).`
   - Bei offenem Fenster ergänzen `pace`/`JOURNEY PACING`: `except the one event PULSE names: that is a real stop.`
   **Diagnose A5:** `world.js` schreibt am Ende von `applyWorld` für Züge mit `auth.pulse` das Event `pulse.outcome { turn, open, kind, narrated:'likely'|'none', persisted:{persons, creatures, features, objects, fight, rejected_pulse} }`. `narrated` ist eine Heuristik (neue Elemente bzw. Delta in einem offenen Zug) und wird als solche ausgewiesen.
6. **Alternativen:**
   - Wurf in `playerTurnV4` statt in `resolveCommands`: verworfen, weil Tests und Pause-Claim den `ctx` brauchen.
   - Getrennte Zähler: verworfen (§2 D).
   - Absoluter Bonus: verworfen (§7).
   - Ruhige Zeile pro Zug: verworfen (Budget §8).
   - Firewall nur auf geeigneten Zügen: verworfen; ausgeschlossene Züge wären sonst die Lücke.
7. **Rückwärtskompatibilität:**
   - Alte Records mit `auth.road` ohne `auth.pulse` behandelt die Firewall wie bisher.
   - Fehlendes `s.pulse` gilt als Default.
   - A-Pfad und Ruleset 1 bleiben unverändert.
   - Gespeicherte Events werden nie neu gewürfelt.
8. **Abhängigkeiten:** .160 (vorhanden). Keine Abhängigkeit von B/C. Konflikt nur mit parallelen Änderungen an `resolveCommands`, `envelopeAllows`/`coerce` und `rules.json` `travel`; vor dem Start mit Sol abstimmen.
9. **Tests:**
   - *Unit* (reine Funktionen): Eignung je Ausschluss, Rahmen und Tageszeit (Grenzen 5:59/6:00/18:59/19:00/21:59/22:00), Formel und Deckel, Serie (+1/Reset/unverändert bei jedem Ausschluss), Art mit Wiederholungsschutz und Weltbeleg, Schlüssel unabhängig von Uhrzeit, Befehlsnummer und Text, Pausenblock, identische Wiederholung.
   - *Host* (Chat4): Mehrfach-GO ergibt ein Event; ein abgelehnter erster GO plus ein zweiter autorisierter GO beansprucht den zweiten; GO plus Board lokal: kein Wurf; Fernreise plus bedingtes Board: Reise; Aufbruch zum Dungeon-Tor: Reise; Kampf: kein Event; Kampfende: nächster Zug geeignet; Swipe, Regenerate, Reload und Edit gleich; Serie nach Reload gleich.
   - *Firewall-Gegenfälle* (GPT §11.4): (1) Suchzug mit erlaubtem Zielkontakt; (2) derselbe Ort, Gespräch, PULSE möglich; (3) Jagdauftrag und fremde Räuber im ruhigen Fenster: abgelehnt; (4) anwesende Gefahr reagiert nach Envelope; (5) zweite feindliche Gruppe im Gefahrenfenster abgelehnt; (6) Raub, Bußgeld oder Beschlagnahme durch Neuankömmling: Forderung statt Buchung; (7) bereits anwesende Wache beschlagnahmt nach unveränderter Regel; (8) ausgeschlossener Board-Zug mit erfundenem Angriff: abgelehnt.
   - *A1 (`held`, §12.2):* fünf Dialogzüge neben einer anwesenden Bedrohung, zunächst ohne Kampf → kein `pulse.rolled`, `misses` unverändert; danach, ohne Bedrohung, die Basischance ohne angestauten Bonus; `roll ≥ p` +1, `roll < p` Reset, `held` ±0.
   - *A2 (Suchausnahme, §12.3):* (1) abgelehntes Jagd-GO plus erfundener Räuber bzw. Zielkreatur → keine Ausnahme, `pulse` lehnt ab; (2) gültige gezielte erfolgreiche Suche → passender Populationskontakt erlaubt; (3) gleiche Stadt bzw. gleiches Habitat, gewöhnliches Gespräch → normales PULSE; (4) zwei Planner-Befehle, nur einer autorisiert → nur dessen Eintrag; (5) fehlgeschlagene Suche → keine Ausnahme; (6) DUNGEON AHEAD und anwesende Gegner nach unveränderten Slot- und Envelope-Regeln.
   - *Replay:* neue Kategorien `pulse_fields` (zusätzliches `auth.pulse`, die PULSE-Zeile anstelle von THE ROAD) und `pulse_roll` (geänderte Reiseentscheidung). `pulse_roll`-Fälle einzeln mit Beleg prüfen, keine Pauschalakzeptanz.
   - *ST-Host:* Reise offen und ruhig, Stadt-Straße abends, Wildnis nachts, `#status` und Kampf ohne Event, Reload.
10. **Risiken und Gegenfälle:**
    - Ein provozierter Neuankömmling greift erst im nächsten Zug an. Das ist gewollt und an Spielerhoheit und Drohregel gekoppelt, muss aber kommuniziert werden.
    - Ein Erzähler, der Grenzen ignoriert, erzeugt sichtbare Korrekturen.
    - Der Pacing-Zusatz kann Reisen öfter stoppen; das wird in ST-Smokes beobachtet.
    - Budget: Netto etwa 0 auf Reisezügen, +55 auf offenen Szenenzügen.
    - Die Unterscheidung Lokal-Board gegen Fern-Board hängt an `sameSettlement`.
11. **Abnahme:**
    - Alle obigen Tests grün, Vollsuite grün, Replay ohne unbegründete Abweichung, ST-Smokes ohne PageErrors.
    - In einer Probe über die User04-Records kein PULSE-Event in Kampf-, System-, Board- oder DUNGEON-AHEAD-Zügen.
    - Mehrfach-GO-Probe: 0 von 200 widersprüchliche Zeilen.
    - Budgetprobe mit **echten Host-Requests** des neuen Builds (nicht nur Zeichen/4-Schätzung): gelieferte und weggefallene Abschnitte vor und nach PULSE, besonders `present` und `npc_continuity`. Pflichtanteil auf Reisezügen nicht größer als vorher, auf offenen Szenenzügen höchstens +60 Token. Nicht behaupten, die 1400-Token-Grenze sei eingehalten; die schon bestehenden Überläufe werden ausgewiesen, nicht verdeckt (§12.6).
    - **Erst danach natürlicher Testlauf.**

### Paket B – Dungeon-Rahmen (spielmechanische Erweiterung)
1. **Ziel:** Dungeon-Erkundung außerhalb des Kampfes bekommt PULSE ohne neuen Spawner. **Abgrenzung:** DUNGEON-AHEAD-Züge ohne Wurf; Guard/Boss nie; keine Siegel-, Wege- oder Lootänderung.
2. **Dateien:**
   - `pulse.js` (Rahmen `dungeon`, Arten, `wander`)
   - `commands.js` `livingGo` (`ctx.pulse.dungeonAhead = true`, wenn `aheadEvents` Zeilen liefert)
   - `living.js` (`wanderSlot(s, root, floor)` = `nextWaiting` nur für Rolle `minion`, nicht getroffen; `nextWaiting` dafür exportieren)
   - `rules.json`
3. **Datenfluss und Slot-Lebenszyklus (nach §12.5 präzisiert):**
   - **Auswahl `wanderSlot(s, root, floor)`:** erster Slot in `run.floors[floor].slots` mit Rolle `minion`, `!slotMet`, `!resolved` (also auch nicht `taken` durch eine Kompanie), `entities.length === 0`; nur aktuelle Ebene und aktueller Zyklus (`x.cycle`). Guard und Boss nie. Gibt es keinen, entfällt `danger` (Gewicht wird verteilt).
   - **Keine Überschreibung einer gültigen Referenz:** `dungeon.ahead` wird nur ausgegeben, wenn `x.ahead?.turn !== s.turn`. Da DUNGEON-AHEAD-Züge ohnehin keinen PULSE-Wurf bekommen (`ctx.pulse.dungeonAhead`), kann in derselben Nachricht kein `ahead`/`ahead.next` verloren gehen. Ein `x.ahead` früherer Züge ist wirkungslos, weil `slotForNew` und `catalogLines` nur `ahead.turn === s.turn` lesen (`living.js:284`, `:927`).
   - **Eigener Zustandsübergang:** Das Event `dungeon.ahead { id, ahead:{turn, cycle, floor, slot, ref, wander:true} }` bindet nur den Slot für *diese* Antwort. **Getroffen** (`at`, `met_turn`, `entities`) wird der Slot ausschließlich über das bestehende `dungeon.slot` aus `slotEntityEvents`, wenn `slotForNew` eine gültige Kreatur der Antwort zuordnet. Erzählt die Antwort keine, bleibt der Slot ungetroffen und unverbraucht; das offene Fenster verbucht nichts unsichtbar.
   - **Pace:** `dungeon.part` (`run.parts`) zählt nur neu betretene Teile und wird nicht verändert. `nextSlot` summiert die Pace aller Slots bis zum nächsten wartenden (`living.js:264`), auch des gewanderten. Die folgende DUNGEON-AHEAD-Begegnung wird also nicht vorgezogen; die Teile, in denen der gewanderte Minion gestanden hätte, bleiben ruhig. Die Begegnungsdichte der Ebene bleibt gleich, der Slot wird genau einmal verbraucht.
   - **Reset:** `dungeon.reset` setzt `x.ahead = null` und erneuert die Ebenen. Ein Reset zwischen Wurf und Extraktion hebt die Bindung auf; dann gelten die bestehenden Regeln (kompatibler Minion des neuen Zyklus oder `dungeon_foe`), nie ein Gegner außerhalb der Slots.
   - **Extraktor-Katalog:** `catalogLines(extractor)` bekommt für `wander` die Formulierung „when the reply shows X coming to him here“ statt „where he arrives“. Das ist dynamischer Katalogtext, keine Änderung am festen Extraktor-Prompt.
   - `meeting` nur, wenn `x.inside` eine Kompanie auf seiner Ebene hat; ihr Name kommt aus dem Kompanie-Datensatz.
4. **Schema:** `pulse.rolled.wander`; `dungeon.ahead` unverändert (zusätzliches Feld `wander` wird ignoriert bzw. nur diagnostisch gelesen).
5. **Zeile:** `PULSE (the engine's; <floor>) — DANGER: <say(slot)> of this level comes to him here (the engine's encounter; nothing else).` Für `trace`/`strange`: `… no foe; the level's foes come only as the engine adds them.`
6. **Alternativen:** eigener Wandergegner (verworfen: zweiter Spawner); Guard wandern lassen (verworfen: Siegel- und Ebenenlogik); nur Atmosphäre ohne `danger` (verworfen: Nutzerwunsch nach Folgen).
7. **Kompatibilität:** Alte `dungeon.ahead` ohne `wander` bleiben unverändert; Pace (`run.parts`) bleibt unberührt.
8. **Abhängigkeit:** A.
9. **Tests:**
   - Unit: `wanderSlot` (nur Minion, nicht getroffen, nicht von einer Kompanie genommen, richtige Ebene und richtiger Zyklus).
   - Host: Untersuchen im Raum mit offenem `danger` → Kreatur füllt den Slot, Stufe aus dem Slot, Kampf normal; ohne freien Minion kein `danger`.
   - Host: DUNGEON-AHEAD-Zug ohne Event.
   - Host: Nicht-Slot-Gegner weiterhin `dungeon_foe`.
   - Host: ein Reset (`dungeon.reset`) zwischen den Zügen.
   - B1 (§12.5): Wanderung vor dem fälligen `run.pace`-Teil, danach GO in den nächsten Abschnitt → keine zusätzliche Begegnung, gleiche Gesamtzahl; offenes `danger` ohne erzählte Kreatur → Slot unverbraucht, nächster Zug normal; Save/Reload und Swipe → identischer Slotzustand; Reset zwischen Wurf und Validierung; gewanderter Minion besiegt → `nextWaiting`, `nextSlot`, `clearEvents` und `defeatTally` ohne Verdopplung und ohne vorzeitige Ebenenräumung; Guard und Boss nie gewählt; Slot einer Kompanie (`taken`) nie gewählt.
   - Replay: unveränderte Dungeonverläufe.
   - ST: ein Dungeonlauf.
10. **Risiken:** Der Dungeon wird schneller „geleert“, weil Minion-Slots früher getroffen werden. Dagegen: Gewicht 30 % von 15 % ≈ 4,5 % pro Zug. Prüfen, ob `clearEvents` und `defeatTally` für Kontrakte einen gewanderten Slot korrekt zählen.
11. **Abnahme:** keine Kreatur außerhalb der Slots; Stufen gleich den Slotstufen; Guard und Boss unberührt; jeder Slot genau einmal verbraucht; Pace- und Räumungszählung wie ohne Wanderung; Replay der Dungeonfixtures unverändert. Erst mit B gilt Dungeon-Rast als voll unterstützt.

### Paket C – Rast und Warten mit Unterbrechung (W7a; spielmechanische Erweiterung mit Sicherheitsgrenze)
1. **Ziel:** Eine Pause kann gefährlich unterbrochen werden, bevor Zeit und Erholung voll gebucht sind. Dabei gleich sicher, ob die Rast allein steht oder eine Folgehandlung angehängt ist. **Abgrenzung:** Sichere Unterkunft nie durch `danger`/`trouble`. Keine nachträgliche Rücknahme, keine Mehrfachunterbrechung, kein Wachen- oder Schichtsystem. **Dungeoninneres bleibt in C ausdrücklich ohne Unterbrechung** (wie in A ausgeschlossen); Dungeon-Rast mit Folgen kommt erst mit B (§12.6).
2. **Dateien:** `commands.js` `activity` (Zweig für die Ruhebuchung) und die Befehlsschleife von `resolveCommands` (ein zusätzlicher Abbruchgrund `rest interrupted`); `pulse.js` (`pauseSafety`, Unterbrechungsminute, Ursachentabelle); `rules.json` (`pulse.pause`); `host.js` `turnBlock` (einmalige Faktzeile im Folgezug, Muster `paidCardFacts`); `world.js` (keine neue Angriffsregel, `danger` wirkt über A3 bzw. über `wander` aus B).
3. **Datenfluss:**
```js
// activity: vor time.advanced / recoveryEvents; nur wenn der Handler die Pause tatsächlich bucht
if (booked && (RESTING.has(c.kind) || c.kind === 'wait')) {
  const d = pulseClaim(s, content, ctx, emit, 'pause', { minutes: booked, kind: c.kind, safety: pauseSafety(s, content) });
  if (d.open && INTERRUPTS(d.kind, d.safety)) {                      // §C-Tabelle unten
    if (booked >= R.pause.interrupt_min /* 30 */) {
      const m = 15 + parseInt(hash32(`${seed}|${turn}|pulse.at`), 16) % (booked - 29);   // m ∈ [15, booked−15]
      d.interrupt = { seq: c.seq, after_min: m, of_min: booked, cause: d.cause };
      booked = m;                                                    // nur die geruhten Minuten
      ctx.pulse.interruptedAt = c.seq;                               // spätere Schritte: Abbruchgrund in der Schleife
    } else d.at_end = true;                                          // < 30 min: keine Teilunterbrechung, Ereignis nach der Pause
  }
}
// danach unverändert: time.advanced(booked), recoveryEvents(s, content, booked, kind)
// Befehlsschleife (resolveCommands), neben afterTravel/unmet:
//   ctx.pulse?.interruptedAt != null && c.seq > ctx.pulse.interruptedAt
//     → { status:'refused', reason:'rest interrupted', line:'NOT DONE — … his rest was cut short before this; he decides again.' }
```
   - `recoveryEvents` rechnet je Minute mit Abrundung und Deckelung (`commands.js:203`), daher ist die Teilbuchung exakt.
   - **Kurze Pausen (§12.4 b):** Unter `interrupt_min` = 30 gebuchten Minuten gibt es keine Unterbrechung mitten in der Pause. Die Pause wird voll gebucht, und ein offenes Fenster wird als Ereignis **am Ende** der Pause erzählt. Für ≥ 30 Minuten liegt m sicher in [15, M−15]; `time.advanced` ist nie negativ und nie größer als gebucht. Ein Mitternachtswechsel ist unkritisch, weil die Uhr monoton weiterzählt und die Tageszeit nur per Modulo bestimmt wird.
   - **Was unterbricht** (`INTERRUPTS`, Ursache von der Engine bestimmt, §12.4 c):

     | Art | `exposed` (draußen) | `street` (Siedlung außen, nachts) | `safe` (Unterkunft) | Ursache (verbindlich) |
     |---|---|---|---|---|
     | `danger` | ja | – | nie | eine Gruppe von Kreaturen oder Menschen dieses Landes kommt heran (die Firewall erlaubt genau diese Gruppe) |
     | `obstacle` | ja | – | nie | Wetter oder Gelände: Unwetter, Kälte, steigendes Wasser, Rauch |
     | `strange` | ja | – | nie | ein unerklärliches Licht oder Geräusch ganz nah |
     | `trouble` | – | ja | nie | jemand macht sich an seinen Sachen zu schaffen bzw. Streit dicht neben ihm (**keine Wegnahme**, A3) |
     | übrige | nein | nein | nein | Ereignis vor dem Einschlafen bzw. beim Aufwachen |
4. **Schema:** `pulse.rolled.interrupt`; `auth.pulse.interrupt`; keine neuen State-Felder.
5. **Zeilen:**
   - `REST INTERRUPTED (the engine's) — at <HH:MM>, after <m> of the <M> min he chose (booked: <m> min, recovery for those minutes only): <CAUSE>. Tell this cause; what he does is his decision.` Unterbrechung **und** Ursachenklasse sind Engine-Fakten, das Modell gestaltet nur die Einzelheiten. Bei `wander` (B) ist die Ursache der Slot.
   - **Folgezug (verbindlich, einmalig):** `turnBlock` ergänzt nach dem Muster `paidCardFacts` eine Faktzeile: `REST CUT SHORT (the engine's, last turn): at <HH:MM> after <m> of <M> min, <CAUSE>; recovery as booked.` (≈ 35 Token, nur nach tatsächlicher Unterbrechung).
   - **Ursache mit Figur nicht erzählt:** Hat die Antwort bei `danger`/`trouble` keinen passenden Neuankömmling gebracht (`pulse.outcome`), kommt zusätzlich eine gezielte Korrektur aus dem Event: Ursache nachtragen, keinen neuen Kampf erfinden. Still früher aufwachen ohne Grund gibt es nicht.
6. **Alternativen:**
   - Volle Buchung, dann Rücknahme: verworfen (widerspricht §12, erfordert Rollback).
   - Reservierung mit Commit nach Extraktion: verworfen. Die Entscheidung fällt ohnehin vor der Erzählung; eine Extraktionsabhängigkeit würde Buchungen von der Modellprosa abhängig machen.
   - Rast nur als letzter Schritt unterbrechen und sonst voll buchen (frühere Fassung): **verworfen nach §12.4 a**, weil ein angehängtes „und danach sehe ich mich um“ die Gefahr umginge. Ersetzt durch den Abbruchgrund für spätere Schritte; ein allgemeines Conditional-System ist nicht nötig, weil die Entscheidung fällt, bevor die späteren Handler laufen.
7. **Kompatibilität:** Alte Rastbuchungen bleiben unverändert; neue nur mit `pulse.rolled`.
8. **Abhängigkeit:** A; der Dungeonzweig zusätzlich B.
9. **Tests:**
   - Unit: Dauer 1/5/15/20/29 min → keine Teilunterbrechung, Ereignis am Ende, volle Buchung; 30/31 min → m = 15 bzw. m ∈ {15, 16}; große Dauer → m ∈ [15, M−15]; Mitternachtswechsel; nie negatives oder zu hohes `time.advanced` bzw. zu hohe Erholung; sichere Unterkunft → nie unterbrochen.
   - Kombinationen (§12.4): `rest` allein gegenüber `rest + look`/`rest + take + GO` mit gleichem Seed → gleiche Unterbrechung, Folgeschritte `rest interrupted`, nichts davon gebucht, darauf aufbauende `needs`-Schritte ebenfalls nicht; `go` (lokal) `+ rest` → Rast `arrival pending` (bestehende Regel), Szene beansprucht; Fern-GO `+ rest` → Reise beansprucht, Lager `arrival pending`; `rest + GO` → Pause beansprucht, GO bei Unterbrechung `rest interrupted`; abgelehnte Rast (Zimmer nicht gebucht, Dauer unklar) → keine Exposition.
   - Faktzeile im Folgezug genau einmal; Korrektur bei fehlender Figur.
   - Host: Lager nachts, offenes `danger` → Teilbuchung, Gruppe darf angreifen, Kampf beginnt, nächster Zug Kampf.
   - Host: Gasthaus nachts, offenes `life` → volle Buchung, Szene beim Aufwachen.
   - Host: „warte 1 min“ ×10 → ein Wurf.
   - Host: Swipe und Reload → gleiche Minuten und gleiche Erholung.
   - Host: Dungeon-Rast mit `wander`.
   - ST: Lager- und Gasthausnacht.
10. **Risiken:**
    - Der Erzähler zeigt die Ursache nicht. Gegenmittel: verbindliche Ursachenklasse in der Zeile, Faktzeile im Folgezug, gezielte Korrektur bei fehlender Figur (§12.4 c).
    - Eine Folgehandlung entfällt nach der Unterbrechung; das ist sichtbar und gewollt, der Spieler entscheidet neu.
    - „Rast, dann Reise“ verliert den eigenen Reisewurf (ein Fenster je Nachricht); das wird in D beobachtet.
11. **Abnahme:** In keinem Test gibt es Erholung über die gebuchten Minuten hinaus; Unterkünfte werden nie unterbrochen; Rast allein und Rast mit angehängter abhängiger Handlung sind gleich gefährlich; keine Teilbuchung ohne verbindliche Ursache; kein Rollback gebuchter Events; Swipe, Reload und Edit sind gleich.

### Paket D – Auswertung und Parameter (spätere Optimierung)
1. **Ziel:** Natürliche Läufe auswerten, die Werte nur in `rules.json` anpassen.
2. **Dateien:** `perfSummary`/Run-Report (Zähler je Rahmen, Tageszeit und Art: `open`, `narrated`, `persisted`, `rejected pulse`, Unterbrechungen), `tools/st_live`-Auswertung.
3. **Daten:** nur Lesen vorhandener Events.
4. **Entscheidungen danach:** Umsetzungsquote, gefühlte Häufigkeit, Cluster, `danger`-Anteil, Abklingzeit ja/nein, Stadt-`danger` nachts, Reset nach Kampf.
5. **Abnahme:** Die Auswertung reproduziert die Event-Zählungen exakt; Parameteränderungen bekommen eigene Tests ohne Codeänderung.

---

## 7. Simulation (`pulse_v2_sim.mjs`, Entwurfsmodell)

Sitzungsgenerator: Stadtsegmente (55 % innen), Reiseabschnitte, Wildnis, Dungeon (35 % Kampf, 10 % DUNGEON AHEAD, also ohne Wurf), Pausen (Lager oder Unterkunft); Uhr fortlaufend, Tageszeit nach `dayPart`.

| 60 geeignete Züge | offen je 10 | P(0) | längste Ruhe Median / 95 % | offen nach offen | Sitzungen mit 3 in 5 | `danger` je Sitzung | innen / Straße / Reise effektiv |
|---|---:|---:|---|---:|---:|---:|---|
| V0 ohne Serie | 1,36 | 0 | 19 / 34 | 0,171 | 0,55 | 2,0 | 5,5 % / 9,6 % / 38,5 % |
| V1 +5 abs, Deckel 60 | 2,41 | 0 | 8 / 12 | 0,153 | 0,82 | 2,9 | 17,3 % / 21,4 % / 46,1 % |
| V2 +20 % rel, Deckel 2× | 1,94 | 0 | 13 / 23 | 0,168 | 0,74 | 2,7 | 8,7 % / 15,1 % / 48,9 % |
| **V3 +15 % rel, Deckel 1,75× (empfohlen)** | **1,82** | 0 | **14 / 24** | 0,169 | 0,70 | 2,6 | **8,0 % / 13,9 % / 48,1 %** |
| V4 +10 % rel, Deckel 1,5× | 1,69 | 0 | 15 / 27 | 0,170 | 0,66 | 2,4 | 7,2 % / 12,6 % / 46,4 % |

Kurze Sitzungen (15 Züge): P(kein Fenster) V0 9,8 % → V3 2,7 %. Lange Sitzungen (150 Züge): Ruhe im 95-%-Fall V0 42 → V3 29.

Aufgeteiltes Warten, **mit V3 nachgerechnet** (§12.6; die erste Fassung hatte versehentlich V2 verwendet):
- Straße, Tag: ein langes Warten 1 Wurf und 0,10 offene Fenster; 10 aufgeteilte Wartezüge ohne Pausenblock 10 Würfe und 1,35 Fenster, 30 aufgeteilte 4,29; mit Pausenblock 1 Wurf und 0,10.
- Lager draußen, Tag: eine lange Rast 0,20; 8 einstündige Rasten ohne Pausenblock 1,94; mit Pausenblock 0,20.

Lagerpausen: rund 11–12 % der Nächte draußen enthalten ein offenes `danger` (Anteil an allen Pausen 0,058, etwa die Hälfte davon draußen).

Modellgrenzen: Der Wiederholungsschutz ist bei der Art nicht nachgebildet, und Dungeon (35) sowie Lager (+5 Punkte) sind mit leicht höherem `danger`-Anteil gerechnet als in §5.5. Die `danger`-Zahlen sind damit eher zu hoch. Spieler-Sitzungsprofile sind synthetisch und nicht aus Korpusdaten geschätzt.

**Bewertung:** V3 senkt die langen Ruhephasen um etwa 30 %, ohne Innenräume nennenswert zu beleben und ohne Doppelfenster zu verstärken. Offen bleibt GPTs Einwand (§12.6): rund 70 % der synthetischen 60-Zug-Sitzungen haben irgendwo drei offene Fenster in fünf Zügen (ohne Serie 55 %). Ob das lebendig oder aufdringlich wirkt, entscheidet erst der natürliche Test (D); eine Abklingzeit wird vorher nicht eingebaut. Die Zahlen bleiben **Hypothesen für den ersten natürlichen Test**; wie viele Ereignisse tatsächlich erzählt werden, kann erst Paket D messen.

---

## 8. Kontextbudget nach .160 (`budget160.mjs`)

Gemessen an 36 User04-Story-Zügen, mit .160 aus den gespeicherten Records neu gebaut:
- Gesamtgröße im Median 1570 Token; Pflichtanteil (`budgetedTokens`) im Median 1448 bei einem Budget von 1400.
- **21 von 36 Zügen überschreiten das Budget** schon mit Priorität-0-Abschnitten.
- **33 von 36** verlieren Abschnitte, oft `present`, `relevant`, `lore`, im Dungeon zusätzlich `features`.
- `resolved` im Median 261 Token, maximal 821 (Board).

Zeilenentwürfe (`estimateTokens`): THE ROAD heute 103; PULSE Reise mit `danger` 105; Szene `life` 55; Rastunterbrechung 56; eine ruhige Zeile wäre 24.

**Folgerungen:**
1. Die Reisezeile **ersetzt** THE ROAD (netto etwa 0).
2. Kein Text in ruhigen Zügen; die statische Regel steht im Envelope (eigenes Kontingent, zählt nicht gegen das Budget).
3. Offene Szenenzüge +55, das betrifft etwa 10–25 % der geeigneten Züge.
4. Der bestehende Budgetdruck (`present` fällt weg) ist **unabhängig von PULSE** und gehört nicht in diesen Plan. Hinweis an Sol bzw. E1: Wegfallende NPC-Karten in Dungeon- und Reisezügen.
5. **Keine Aussage über Budgeteinhaltung** (§12.6): Kleine PULSE-Zeilen lösen die 21/36 geschützten Überläufe nicht. Abnahme A misst echte Host-Requests (gelieferte und weggefallene Abschnitte, besonders `present`/`npc_continuity`), ohne pauschale Budgeterhöhung.

---

## 9. Gesamtabnahme und Testmatrix

| Szenario | D (Unit/Replay) | H (ST-Host) | N (natürlich) |
|---|---|---|---|
| normale Stadtinteraktion ohne Ereignis | A | A | A |
| friedliche Stadtbegegnung, abends Straße | A | A | A |
| Reise mit Unterbrechung / ohne, ohne erzwungenes „continue“ | A | A | A |
| Wildnis nachts mit offener Spielerentscheidung | A | A | A |
| mehrere Befehle, Mehrfach-GO, GO + Board | A | – | – |
| Kampf, Kampfstart, Kampfende, `#`-Befehle | A | A | A |
| Save/Reload, Swipe, Regenerate, Edit, Löschen | A | A (Reload) | – |
| vorhandene Bedrohung, zweite Gruppe, Raub durch Neuankömmling | A | – | A |
| Fehlwurfserie über Reload, Kampf, Ausschlüsse | A | – | – |
| Dungeon-Erkundung mit `wander`, DUNGEON-AHEAD-Zug | B | B | B |
| Rast sicher / Lager unterbrochen / aufgeteiltes Warten | C | C | C |
| Umsetzungsquote, gefühlte Frequenz, Cluster | – | – | D |

---

## 10. Offene Entscheidungen

1. **Startwerte:** Basis- und Tageszeittabelle §5.2, Artgewichte §5.5, Serie V3 (`step` 0,15 / `cap_mult` 1,75 / `cap_abs` 60). Empfohlen als erste Hypothese.
2. **Reset der Serie nach einem Kampf**, den der Spieler selbst begonnen hat: Nutzerregel (unverändert) empfohlen; beobachten in D.
3. **`danger` in der Stadt nachts:** 0 empfohlen bis D. Auch dann wäre nur eine Forderung möglich, keine Wegnahme.
4. **Lernen** (`train`/`study`) bleibt ausgeschlossen (nicht in §12 verlangt). Soll es geeignet werden?
5. **Neuankömmling-Bußgeld als Forderung statt Buchung** (A3): Das verzögert legitime Konsequenzen um einen Zug. Empfohlen; die Alternative wäre eine engere Autoritätsausnahme mit höherem Missbrauchsrisiko.
6. **Paketreihenfolge:** A → C → B → D, von GPT bestätigt (§12.6).
7. **Abklingzeit bzw. Häufung** (3 offene Fenster in 5 Zügen bei rund 70 % der synthetischen Sitzungen): erst nach dem natürlichen Test entscheiden (D).
8. **„Rast, dann Reise“** ohne eigenen Reisewurf: hinnehmen (ein Fenster je Nachricht) oder später eine zweite Exposition zulassen. Empfehlung: hinnehmen.

## 11. Reproduktion
Produkt-Worktree auf `16e7358` (`<eng>` = deren `avereth-engine`).
```bash
ENG=<eng> node patch_plans_10b/pulse_probes/budget160.mjs testrun_10b/user-20261106-072640/originals/chat.jsonl.gz
```
```bash
ENG=<eng> node patch_plans_10b/pulse_probes/pulse_v2_sim.mjs
```

---

## 12. Unabhängiger GPT-Gegenreview – technische Planprüfung vor Freigabe (07.11.2026)

**Urteil:** Die neue Architektur und die grobe Paketaufteilung A → C → B → D sind **fachlich überzeugend**. **Keine erneute Grundsatzanalyse notwendig.** Die Implementierung sollte aber **erst nach vier eng begrenzten Präzisierungen** der Pakete A/C/B freigegeben werden. PULSE wurde für diesen Gegenreview nicht implementiert; die Node-, Replay- und ST-Abnahmen wurden nicht ausgeführt.

**Prüfgrundlage:** Vollständiger technischer Umsetzungsplan §§0–11, beide eingecheckten Read-only-/Simulationsskripte und einschlägige Produktquellen des aktuellen `.160` (`commands.js` `resolveCommands`, GO, `activity`, `recoveryEvents`; `living.js` `nextWaiting`, `nextSlot`, `aheadEvents`, `slotForNew`, `applyLivingEvent`; `state.js` Event-Fold/`encounter.started`; `world.js` neue Figuren/Envelope/`coerce`; `envelope.js` `mayOpenFight`). Die von Claude berichteten Simulationsergebnisse und 21/36-Kontextüberläufe sind in ihren Skripten methodisch nachvollziehbar, wurden aber in diesem GPT-Durchgang **nicht erneut in einem vollständigen Runtime-Checkout ausgeführt**. Das Skript `pulse_v2_sim.mjs` modelliert Fensteröffnungen, nicht erfolgreiche vom Narrator erzählte Szenen.

### 12.1 Bestätigte Entscheidungen

- **Ein deterministischer Wurf pro geeignetem Erzählzug** statt per GO-Handler, zusammen mit bestehendem Event-Fold, ist die richtige Grundarchitektur. Keine zweite ROAD-AHEAD-Chance und kein neuer Modellcall.
- **Tageszeit als Faktor** auf die ortsgebundene Grundchance plus andere Ereignisgewichte ist besser als ein ortsunabhängiger absoluter Aufschlag. Die Tag-/Abend-/Nacht-Unterteilung aus dem Produkt zu übernehmen vermeidet eine neue Kalenderlogik. Dungeons unabhängig vom Tageslicht ist plausibel.
- **Globale, gedeckelte relative Fehlwurfserie** ist eine sinnvolle erste Implementierung des Nutzerwunsches. Die Variante +15 % relativ je echter Fehlentscheidung, Deckel 1,75× und absolut 60 % ist **vorläufig akzeptabel**, nicht als endgültig balanciert bewiesen. Combat und nicht geeignete Züge sollen weder zusätzlichen Wurf noch Serienänderung auslösen.
- **Paket A enthält Kern **und** zwingende Firewall-Grenzen.** Damit entfällt die vormals unsichere Trennung P1/P2. Die PULSE-Korrektur muss neue Angriffe und unbelegte Wegnahmen auch auf ausgeschlossenen C-Erzählzügen verhindern, ohne etablierte Kampf-/Kontrakt- und DUNGEON-AHEAD-Reaktionen zu beschädigen.
- **Dungeon-Slots statt neuer Gegnerdatenbank** ist der richtige Ausgangspunkt, sofern die bestehenden Rollen und Pace-/Clear-Regeln tatsächlich weitergelten.
- **Rastunterbrechung vor** Zeit- und Regenerationsbuchung statt Rollback ist architektonisch richtig. `recoveryEvents()` berechnet Ressourcen für genau die übergebenen Minuten; die Floor-Rundung und Ressourcendeckelung bleiben bei Teilbuchung erhalten. Dafür braucht es nicht zwingend eine zweite Zahlungs-/Reservierungslogik.
- **Kontextbudget:** Den 103-Token-ROAD-Block zu ersetzen und bei ruhigen Zügen keine neue Zeile zu erzeugen ist sinnvoll. Pflichtkontextüberläufe von `.160` dürfen aber nicht durch eine pauschale Budgeterhöhung versteckt werden.

### 12.2 **Auflage A1 – „vorhandene Bedrohung“ ist kein erfolgloser Ereigniswurf**

Im aktuellen Pseudocode `pulseClaim()` wird bei `held.length > 0` zwar `open=false`, es wird jedoch weiterhin `pulse.rolled` emittiert und der vorgeschlagene Reducer zählt `misses+1`. **Damit wächst der Bonus in einem Zustand, in dem ein neues Ereignis ausdrücklich verboten ist**: Zum Beispiel kann Alaric mehrfach mit einer noch anwesenden Gefahr sprechen; anschließend trifft ihn ein künstlich aufgebauter hoher Bonus, obwohl keine der vorangegangenen Nachrichten eine echte PULSE-Chance hatte.

**Erforderliche Korrektur:** `held` (genau wie bereits laufender Kampf) als **unterdrücktes Fenster ohne tatsächlichen Wurf und ohne Serienänderung** behandeln, nicht als misslungenen RNG-Wurf. Der diagnostische Record darf `reason:'held'` enthalten; die Zustandsreduktion darf nur auf einem echten `rolled:true` `misses` erhöhen bzw. zurücksetzen. Ebenfalls klar unterscheiden: `roll >= p` → echter Fehlwurf und +1; `roll < p` → eröffnet und Reset; `held`/gebockte Aktion/Safe-Stop → kein Wurf und keine Änderung. Tests mit wiederholten `held`-Dialogzügen, zunächst ohne Kampf, danach ohne künstlich angestaute Serienverstärkung.

### 12.3 **Auflage A2 – Suchausnahme aus bestätigten und zielgebundenen Handlungen ableiten**

`pulseBegin()` berechnet laut §6 A `P.sought` bereits aus **allen rohen, sortierten Planner-Befehlen**, also vor deren `HANDLERS`-Validierung. `pulseFinish` überträgt sie in `auth.pulse`, und der neue `envelopeAllows`-Pfad soll für `soughtMatch` Angriffe erlauben. **Das ist eine Autorisierungslücke**, falls ein `go.within`, Jagd-GO oder Suchbefehl im selben Turn tatsächlich verweigert oder nur zur Klärung gestellt wird. Rohes Planner-Intent ist noch keine autorisierte Begegnung.

**Erforderliche Korrektur:** Ausnahmen **erst aus gültigen `ctx.resolutions`, bestätigten `auth.gos` und ggf. erfolgreich durchgeführten Such-/Erkundungshandlungen** ableiten; nicht aus Absichten allein. Beim Ausschluss des eigentlichen Suchzugs dieselbe *gültige* Handlungsbasis verwenden. Die Ausnahme bleibt auf **die konkrete bestehende Zielpopulation/Vertragsart und diesen Turn** begrenzt. Fremde Figuren werden auch bei laufender Jagdquest weiterhin nach PULSE gegatet. Negative Tests: (1) abgelehntes Jagd-GO + im Text erfundener Räuber/gesuchter Gegner: keine Ausnahmewirkung; (2) gültige gezielte Suche: passender Kontakt erlaubt; (3) gleiche Stadt/Habitat, gewöhnliches Gespräch: normales PULSE; (4) zwei Planner-Befehle, nur einer autorisiert; (5) DUNGEON-AHEAD- bzw. bestehende Gegner-Einführung weiterhin nach den vorhandenen Slot-/Envelope-Regeln.

### 12.4 **Auflage C1 – Unterbrechung darf weder durch Folgeaktion umgangen noch bei kurzen Pausen ungültig werden**

**(a) Letzter-Schritt-Regel:** §6 C formuliert „nur wenn die Rast der letzte Engine-Schritt ist“ und empfiehlt, bei `rest → späteres X` die Rast **immer voll zu buchen**. Damit lässt sich die Gefahr durch ein triviales angehängtes „und danach sehe ich mich um“ zuverlässig umgehen. Der Vorschlag ist zwar rollback-sicher, **unterläuft aber unmittelbar den beschlossenen Sinn gefährlicher Rast**.

**Korrekturvorschlag:** Nicht pauschal die volle Rast als sicher buchen. Als bevorzugte Option `rest` vor der Buchung bewerten und **nachfolgende abhängige Handlungen bei einer möglichen Unterbrechung konditional zurückstellen**, statt sie im selben Record vorab endgültig auszuführen. Alternativ ein transparentes, engeres zulässiges Muster wählen (z. B. die kombinierte Handlung insgesamt nur bis zu dem gemeinsamen sicheren Buchungspunkt autorisieren), falls ein übergreifendes Conditional-System zu aufwendig wäre. Claude soll die geringste notwendige Integration in vorhandenes `c.needs`/Buchungsmodell nennen. Keine nachträgliche Rücknahme bereits gebuchter Ereignisse. Nicht jede zeitliche Erwähnung von Rest als echten `rest`-Befehl behandeln; nur legitim gebuchte Pausen.

**(b) Sehr kurze Pausen:** Das Beispiel `clamp(15, booked-15, hash % booked)` hat bei `booked < 30` widersprüchliche Grenzen und bei einer einminütigen Wartezeit überhaupt keinen inneren ganzzahligen Unterbrechungszeitpunkt. Den Fall ausdrücklich definieren (z. B. kurze Wartezeit nicht *mitten darin* unterbrechen, sondern allenfalls ein äußerliches Ereignis vor/nach der Aktion; für echte Teilunterbrechung minimale Dauer verlangen). Test 1/5/15/20/29/30/31 Minuten und Mitternachtswechsel, ohne negative/zu hohe `time.advanced`- oder Recoverywerte.

**(c) Unterbrechung ohne konkreten Grund:** Der Satz in §6 C „Erzähler zeigt keinen Grund für das Aufwachen. Das ist harmlos“ ist zu optimistisch. Mechanisch verlorene Rastzeit und geringere Erholung ohne verständlich erzählten Anlass wären ein **sichtbarer Buchungs-/Erzählwiderspruch**. Für jede Teilbuchung einen **mindestens kausal konkreten verbindlichen Unterbrechungsgrund** liefern bzw. bei missachtender Narration eine gezielte, auf dem Event aufbauende Korrektur. Die Ursache muss keinen frei erfundenen Kampf erzwingen; die Engine darf aber nicht still ein frühes Aufwachen ohne Grund buchen. Auch `go + rest`, `rest + look`, `rest + GO` und sichere Unterkünfte testen.

**Abnahme:** Die **beiden** Varianten „Rast allein“ und „Rast mit nachfolgender, davon abhängiger harmloser Aktion“ dürfen nicht unterschiedlich sicher werden, bloß weil ein weiteres Kommando angehängt wurde. Kein Rollback nötig.

### 12.5 **Auflage B1 – Wander-Minions und Dungeon-Pace/Slot-Lebenszyklus gemeinsam prüfen**

`living.js:nextWaiting()` sucht den ersten noch nicht getroffenen Slot; `nextSlot()` prüft zusätzlich den Rhythmus `run.parts` gegen `run.pace`, bevor ein normaler Dungeon-Ahead-Begegnungszug fällig wird. Ein direktes PULSE-`wanderSlot` auf Basis von `nextWaiting` könnte den Minion **absichtlich früher** in den bestehenden Raum ziehen und durch `dungeon.ahead` auf diesen Slot binden, ohne den üblichen Pace-Zähler zu aktualisieren.

Das ist **nicht per se falsch** (Wanderbegegnung darf gerade unerwartet sein), muss aber als eigener gültiger Zustandsübergang statt als bloße spätere `slotForNew`-Nebenwirkung spezifiziert werden:

- Nur **freier, noch ungetroffener Minion derselben aktuellen Etage und desselben Dungeonzyklus**, keine bereits platzierte/taken/auf andere Kompanie gebuchte Gruppe; Guard und Boss bleiben stationär.
- Das neue `dungeon.ahead` überschreibt das bisherige pro Dungeon flüchtig gespeicherte `x.ahead`; verhindern, dass dadurch eine andere bereits autorisierte Begegnungsreferenz derselben Nachricht oder ein vorgemerkter `ahead.next` verloren geht.
- Die Slot-Daten müssen **auch bei anschließendem Reset, Swipe/Reload sowie bei nicht erzählter Begegnung** konsistent bleiben. Ein offenes Ereignisfenster darf einen Minion nicht unsichtbar als `met` oder `resolved` verbuchen, wenn kein gültiger Creature-Record zustande kommt.
- Nach erfolgreichem Treffen/Kampf überprüfen, dass `nextWaiting`, `nextSlot`, `run.parts`, Clear-Bedingungen und `defeatTally` keine Verdopplung oder unverdiente Extra-Floor-Clears erzeugen.

**Tests konkret:** PULSE-Wanderung vor dem fälligen normalen `run.pace`-Teil, danach GO in den nächsten Dungeonabschnitt; `ahead` des gleichen Zuges; unbesetzter PULSE-Encounter nach narrativem Ausfall; Wiederholung nach Save/Reload; Reset vor/zwischen PULSE und Validierung; Guard-/Boss-Grenze. Eine bestehende gewünschte frühe Minionbegegnung ist spielmechanisch zulässig, solange ihr Slot genau einmal konsumiert wird.

### 12.6 Ergänzende Einordnung und Parameter

- **Simulation:** Die relative +15-%-Variante V3 ist eine vertretbare **Startannahme**. Die 60-Zug-Simulation zeigt aber auch **ca. 70 % der synthetischen Sitzungen mit mindestens drei offenen Fenstern in fünf Zügen**; ob sich das „lebendig“ oder „zu aufdringlich“ anfühlt, bleibt offen. Die Werte messen **Fenster**, nicht tatsächlich erzählte Begegnungen. Ein Cooldown/garantierter Misserfolg wird vor dem ersten natürlichen Run nicht automatisch nötig.
- **Methodischer Detailhinweis:** Die gesonderte Split-Wait-`farm()`-Probe verwendet im Skript ausdrücklich `VARIANTS.V2_rel20_cap2x`, **nicht die empfohlene V3-Variante**. Der strukturelle Spam-Effekt wird dadurch belegt; konkrete numerische Farmwerte dürfen nicht als V3-Messung bezeichnet werden. In einer nächsten Probe mit V3 wiederholen, falls für die Entscheidung relevant.
- **Gemessener Kontextraum:** Nur zusätzliche PULSE-Zeilen klein zu halten hilft, löst die bereits **21/36 geschützten Budgetüberläufe** bei `.160` nicht. Vor der Implementierungsabnahme reale PULSE-Hostrequests prüfen, besonders `npc_continuity` und `present`, und nicht behaupten, die 1400-Tokenschranke sei dadurch eingehalten.
- **Kampfpause:** Wie geplant keine Änderung an `misses` während `encounter` oder `pending_combat`, insbesondere kein impliziter Reset bei einem selbst initiierten Kampf. Ein offenes Fenster setzt `misses` bereits deterministisch zurück, selbst wenn es vom Narrator missachtet wird; narrativer Erfolg als gesonderte Heuristik kennzeichnen.
- **Tag/Nacht, sichere Innenräume:** Werte der Tabellen §§5.2/5.5 und abs. Deckel 60 % für den ersten Test **vorläufig annehmbar**, kein neuer Zwangs-Balance-Audit. Keine spontanen Erstschläge in der Stadt in der ersten Version.
- **Reise zum Dungeon:** Die Abweichung von meiner früheren konservativen Ausschlusspräferenz ist **fachlich akzeptabel**, **sofern** die neue Erkennung ein tatsächlich autorisiertes **außerörtliches GO** nutzt und DUNGEON-AHEAD am Tor nicht verdrängt. Ein gezielter kombinierter Reise-/Dungeoneintritt und lokaler Stadt-GO gehören in die Tests.
- **Paketreihenfolge:** A → C (W7a außerhalb Dungeon) → B (Dungeonrahmen und Dungeonrast) → D ist sinnvoll. C darf dabei den Dungeonbereich ausdrücklich noch nicht als voll unterstützt ausgeben; B hängt das fehlende Slot-Rasten an.

### 12.7 Entscheidungsempfehlung

**Jetzt freigabefähig nach gezielter Plan-Nachbesserung, nicht nach neuer Grundlagenanalyse.** Claude soll **A1 und A2** in den technischen Paket-A-Notizen konkret korrigieren; **C1** im Paket C und **B1** im Paket B so spezifizieren, dass vor einem späteren Auftrag keine offene Sicherheits-/Buchungsentscheidung übrig bleibt. Solange dies nicht geschieht, ist die allgemeine Architektur befürwortet, aber der Plan **nicht uneingeschränkt zur vollständigen Implementierung abgenommen**.

**Keine Implementierung in diesem Review; Produkt bleibt `.160`.** Nach dem eng begrenzten Plan-Nachtrag kann Paket A separat freigegeben und vollständig getestet werden; für C/B gelten ihre eigenen Abnahmestufen. Bei der Prüfung der tatsächlichen Patch-Diffs darf die konkrete Codebasis begründete kleine Abweichungen vom Pseudocode erfordern, solange die vier Schutzanforderungen erfüllt bleiben.

---

## 13. Umsetzung des GPT-Gegenreviews §12 (Claude, 07.11.2026)

Die vier Auflagen und die Hinweise aus §12.6 habe ich am Code von `.160` geprüft und **alle übernommen**. Bei C1 a nehme ich GPTs bevorzugte Option in einer einfacheren Form, als GPT erwartet hat: Die Unterbrechungsentscheidung fällt, bevor die späteren Handler laufen. Deshalb genügt ein zusätzlicher Abbruchgrund in der Befehlsschleife; ein Conditional-System für die Folgehandlungen ist nicht nötig.

| Auflage | Befund im Code | Änderung im Plan |
|---|---|---|
| **A1** `held` ist kein Fehlwurf | Pseudocode hätte `pulse.rolled` mit `open:false` ausgegeben und `misses` erhöht | `held` → `{rolled:false, reason:'held'}`, kein Event, Serie ±0; `pulse.rolled` nur bei echtem Wurf (§0, §2 D, §5.4, §5.6, Pseudocode A, Tests A1) |
| **A2** Suchausnahme nur aus validierten Handlungen | Suchmenge kam aus rohen Planner-Befehlen vor `HANDLERS` | Handler registrieren `ctx.pulse.sought` erst nach Autorisierung bzw. erfolgreicher Suche; die Ausnahme gilt nur für die registrierte Population bzw. Vertragsart; Personen nie (§5.8, Pseudocode A, Tests A2 (1)–(6)) |
| **C1 a** Umgehung durch Folgehandlung | Die Befehlsschleife hat schon eine Kette von Abbruchgründen (`afterTravel`, `unmet`, `room`); Ruleset 2 lehnt Aktivitäten nach einem GO derselben Nachricht ohnehin ab | erste Exposition in Planreihenfolge; bei Unterbrechung werden spätere Schritte nicht ausgeführt (`rest interrupted`), `needs`-Schritte fallen mit; kein Rollback (§5.3, Paket C 2/3/6/9/11) |
| **C1 b** kurze Pausen | `clamp(15, booked-15, …)` ist unter 30 Minuten widersprüchlich | Mindestdauer 30 für Teilunterbrechung, darunter Ereignis am Ende; m = 15 + hash % (M−29) ∈ [15, M−15]; Tests 1/5/15/20/29/30/31 und Mitternacht (Paket C 3/9) |
| **C1 c** Unterbrechung ohne Grund | verbleibende Lücke im Entwurf | verbindliche Ursachenklasse je Art und Ort; einmalige Faktzeile im Folgezug; gezielte Korrektur, wenn eine Ursache mit Figur nicht erzählt wurde (Paket C 3/5/10) |
| **B1** Wanderung, Pace und Slot-Lebenszyklus | `dungeon.ahead` setzt nur `x.ahead`; getroffen wird ein Slot erst über `dungeon.slot` aus einer zugeordneten Kreatur; `nextSlot` summiert die Pace aller Slots bis zum wartenden; `dungeon.reset` setzt `x.ahead = null` | Auswahlregel, kein Überschreiben eines gültigen `ahead` desselben Zugs, kein unsichtbarer Verbrauch, Pace unverändert, Reset-Verhalten, dynamische Katalogzeile für den Extraktor, Tests (Paket B 3/9/11) |
| §12.6 Split-Wait mit V2 | zutreffend | mit V3 neu gerechnet: Straße 1,35 statt 0,10, Lager 1,94 statt 0,20; mit Pausenblock jeweils wie eine lange Pause (§7) |
| §12.6 Budget | zutreffend | Abnahme mit echten Host-Requests, keine Aussage über Einhaltung der 1400 (§6 A 11, §8 5) |
| §12.6 Häufung 3 in 5 | zutreffend | als offene Beobachtung für D, keine Abklingzeit vorab (§7, §10 7) |
| §12.6 Dungeon in C | zutreffend | C unterbricht im Dungeon nicht; erst B (Paket C 1, B 11) |

**Neue Nachweise:** nur die mit V3 neu gerechnete Split-Wait-Probe (`pulse_probes/pulse_v2_sim.mjs`, nachgerechnet gegen `16e7358`). Die Hauptsimulation ist unverändert (60 Züge V3: 1,82 je 10, 95-%-Ruhe 24, 3-in-5 0,699). Die übrigen Aussagen stammen aus Codelektüre von `.160` (`resolveCommands` Befehlsschleife ab `commands.js:1631`, `living.js` `applyLivingEvent` `:204`, `nextSlot` `:257`, `slotForNew` `:269`, `catalogLines` `:921`). Nichts implementiert, keine Testsuite, keine ST-Läufe.

**Freigabestand aus meiner Sicht:** Die in §12.7 genannten offenen Sicherheits- und Buchungsentscheidungen von A, C und B sind damit im Plan festgelegt. Offen bleiben nur die Parameter- und Beobachtungsfragen in §10. Die Implementierungsfreigabe liegt beim Nutzer.
