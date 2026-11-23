# User09 – persönlicher Kurztest Avereth .207 · unabhängiger GPT-Erstreview

**23.11.2026. Build `4.3.0-c.6.6.207`, Experimentstand `609380b308d89d14c289e9ca1c4e26ed29174789`.** 13 Eingaben einschließlich zweier Charaktererstellungsschritte, **11 erzählte Züge**. Neue Mage-Kampagne in Ashbridge; Alaric registriert sich bei der Gilde, liest ein Board, nimmt „Clear Mossback Warrens Level 1“ an, begegnet einer überschwemmten Furt, erreicht über eine beschädigte Fußbrücke den Dungeon, tritt ein und stirbt beim ersten Kampf gegen drei Goblin-Scouts. Der Test endet nach Zug 13. **Keine Implementierung, kein unabhängiger Codex-Gegenreview und keine lokalen Rot-/Grün-Reproduktionen durch GPT.**

**Belegarten:** Drei Originaluploads im aktuellen RPG-Engine-Chat (siehe [Quellenmanifest](SOURCE_MANIFEST.md)); GPT hat ihre tatsächlichen Bytes lokal analysiert und den aktuellen `.207`-Code über die GitHub-Anbindung gelesen. Der originale ST-Logger ist UTF-16 LE mit CRLF und enthält vollständige `Chat Completion request`-/`response`-Blöcke. Die Originaldateien sind bei Erstellung dieses Dokuments **noch nicht als Git-Blobs archiviert** und dürfen nicht als solche verlinkt werden. Die in diesem Review genannten Ereignisindizes bezeichnen Eventexport `i`; der ST-Chat hat zusätzlich die erste Metadatenzeile (Chatnachricht = `i+1`).

## 1. Sofortiger Gameplay-Befund: HP-Schaden ist echt, aber in der normalen Systemkarte nicht sichtbar

**Korrigiertes wörtliches Nutzerfeedback (sinngemäß geglättet):** „Bei beiden fehlgeschlagenen Hindernisproben habe ich den tatsächlichen HP-Verlust überhaupt nicht bemerkt, weil ich nicht nach jeder Nachricht das Character-HUD kontrolliere. Schaden durch Naturhindernisse soll wie im Combat als deutliche eigene Engine-Meldung im Spielverlauf erscheinen.“

| Quelle | Engineergebnis | Tatsächlich sichtbares normales Systempanel |
|---|---|---|
| Zug 9, überschwemmte Furt, `feat.1`, Export `i=17` | `AGI 5 vs hard 10`, 33,33 %, d100=61, **FAIL**, `resource.changed hp=66`, also 80→66 = **14 HP** | `CHECK — Past the washed-out ford: ... FAILURE`, **kein HP-/Damageeintrag**; nur das eingeklappte Character-HUD zeigt 66/80 |
| Zug 11, morsche Fußbrücke, `feat.2`, Export `i=21` | `AGI 5 vs moderate 6`, 45,45 %, d100=70, **FAIL**, `resource.changed hp=58`, also 66→58 = **8 HP** | `CHECK — Past rotted span ... FAILURE`, **kein HP-/Damageeintrag**; nur das eingeklappte Character-HUD zeigt 58/80 |

**Priorität P1-UX:** Keine Änderung der erwürfelten Schadenhöhe nötig. `src/v4/features.js::attemptEvents/harmEvents` bucht den HP-Verlust korrekt. `src/v4/commands.js::attemptStep` fügt dem Spielerpanel nur die CHECK-Zeile hinzu. `src/display.js::worldPanel` nutzt `commandLines(state.last.outcome)` aus dem Spielereingabezug, `changeLines()` jedoch nur aus den späteren Narrator-/Extractor-Events. Der **vor dem Narrator bereits gebuchte** HP-Abzug erscheint deshalb nicht als eigener normaler Systemhinweis. Kleinste Lösung: eine klare, nicht doppelte, eventbasierte Zeile aus dem tatsächlich gebuchten `resource.changed` des aktuellen Spielzugs, z. B. `HINDERNIS — FEHLSCHLAG · HP -14 · 80 → 66/80` unmittelbar bei CHECK; gleiches Prinzip für STA, ohne das gesamte Combat-Logging zu duplizieren. Ein Narrator-Hinweis allein reicht nicht.

## 2. P1 – Nach fehlgeschlagener Brückenprobe erfolgt trotzdem eine autorisierte Reise und Ankunft

Original Zug 11: „*i walk over it and continue my way to the Dungeon*“. Planner erstellt `attempt feat.2` (seq=1), danach `go Mossback Warrens` mit `needs:1` (seq=2). Die Engine meldet in seq=1 ausdrücklich `FAILS ... He does not get past it`, beschädigt Alaric um 8 HP, vermerkt aber `cmd.resolved status:'resolved'`. Anschließend wird seq=2 dennoch `authorized`. Der Narrator schildert trotz misslungener Überquerung ein neues, vom Spieler nicht gesondert gewähltes Straddeln des Stegs und die erfolgreiche Überquerung bis zum Dungeon. Der Extractorbericht hat `expected['2'].arrived:false` und zugleich einen `arrive`-Delta nach `loc.mossback_warrens`; die Engine bucht `scene.moved` und den zerstörten Steg.

**Codeursache:** `src/v4/features.js::attemptEvents` gibt bei Fehlschlag `status:'resolved',success:false` zurück. `src/v4/commands.js::resolveCommands` markiert `r.done || status nicht in refused/pending/clarify` als erfüllten Vorgängerschritt für `needs`; es wertet `success:false` beim pass/disable-Versuch dort nicht als Nicht-Erfüllung des Erfolgsziels. Ein bedingter GO kann so nach einem misslungenen PASS weiterlaufen. **P1 fachlicher Konsistenzfehler**, ernstzunehmender GO-Blocker vor dem nächsten großen Nutzerlauf. Keine pauschale Umstellung aller `resolved`-Aktionen auf nicht erfolgt; gezielt Abhängigkeit vom erforderten Erfolg des Hindernisversuchs lösen. Gegenfälle: erlaubte unabhängige Bewegung trotz misslungener Probe, Erfolg mit Tool, tatsächlicher alternativer Weg, Hazard verändert/zerstört, Repeat nach Reload. Die Extraction-Behauptung `arrived:false` trotz tatsächlich gemeldetem Ankunftsdelta zusätzlich prüfen.

## 3. Gefahr, Fairness, Stürze: existierende Mechanik und offene Designfrage

Das PULSE-Reisesystem würfelte **7-mal**, davon **1 offenes Event** (Zug 8: `travel p=50,75, roll=40,81, kind=obstacle`), aus dem die angeschwollene Furt entstand. Die Fußbrücke ist eine neue **narrative Folgegefahr der gewählten Umleitung**, kein zweiter offener PULSE-Wurf. Beide Hindernisse sind `kind:'hazard',harm:'hp'`, wurden vor dem Versuch sichtbar etabliert und hatten erkennbare Alternativen, wenn auch keine garantierte sichere Route.

Der bestehende kanonische Prototypwert aus `content/rules.json` ist **easy 4, moderate 8, hard 14, very_hard 20 HP** bei fehlgeschlagener Probe; ein passendes gehaltenes Werkzeug erleichtert den Schwierigkeitsschritt. `src/v4/features.js::harmEvents` begrenzt reinen Terrain-/Hazardschaden ausdrücklich auf **mindestens 1 verbleibenden HP**. Die Engine kann also Sturzverletzungen und auch erhebliche HP-Verluste abbilden, aber ein normaler Hazard verursacht derzeit nie allein den Charaktertod. Eine echte fallhöhenabhängige Schadensregel ist damit **nicht** nachgewiesen. Es ist eine separate Designentscheidung, ob und wann ein ausdrücklich riskierter extremer Sturz tödlich sein dürfte. Empfohlener Grundsatz: ein sichtbarer/erkundbarer Risikohinweis, realistische Gegenoptionen (Umweg, sichern, Hilfsmittel, anderes Vorgehen), engineeigene Schadensermittlung und klare Anzeige; keine unvorhersehbare sofortige Tötung durch eine zufällig erzählte Umweltkomplikation. Nicht aufgrund dieses Einzelruns PULSE-Häufigkeiten oder die Grundschadensskala ändern.

**Spielbalance:** Zwei Risiken senkten Alarics HP vor dem Dungeon von 80 auf 58. Die erste Goblingruppe bestand aus L2, L3 und L5. Sein Arcane Wave traf alle drei mit 23–24 Schaden, jedoch überlebten sie. Die Gegner schlugen ihn anschließend für 17+13+10+19=59 Schaden bis HP 0, ehe er erneut handeln konnte. Das ist laut `encounter.started` eine mechanisch nachvollziehbare Niederlage, kein nachgewiesener Kampfschaden-Buchungsfehler. Die Novice-L3-Dungeonquest trug eine ausdrückliche Warnung vor Gruppen und stärkeren Feinden; keine automatische Solo-Sicherheit. Die Verletzungen waren dennoch ein entscheidender Informationsverlust, weil die HP-Meldung im sichtbaren Verlauf fehlte. Fairness/Nutzersicht beim nächsten Test gezielt prüfen.

## 4. Sonstige Beobachtungen und Umfangsgrenzen

- **Questboard:** Genau eine physische Boardgeneration von ca. **61 s**. Fünf offizielle Verträge und fünf Primerangebote wurden gebucht. Kein zweiter vollständiger Boardrequest und kein ungültiger Erstentwurf in diesem Lauf. Der neue .206-Patch ist dadurch nicht als kausal beschleunigend bewiesen, der Ablauf arbeitet aber wie gewünscht.
- **HUD:** `quest.accept` (Zug 7) und `Arcane Wave` (Zug 13) wurden ohne Planner ausgeführt. Der neue Handelsbereich, Mengenwahl und Verhandeln wurden **nicht natürlich benutzt**; daraus folgt weder GO noch NO-GO zum Handelsspielgefühl.
- **Kleine Narrator-Agency-Abweichung (P2):** Bei der ersten Reise zum Gildenhaus lässt der Narrator Alaric ungefragt nach dem Weg fragen („He asked once“), obwohl der Spieler nur die Bewegung autorisiert hatte. Keine mechanische Folgewirkung beobachtet. Keine neue allgemeine Narrator-Patchserie daraus ableiten.
- **Extractor:** 11 gespeicherte Weltabschlüsse, davon drei mit `repaired:true` (Züge 4, 7 und 11). Fünf `delta.rejected`-Einträge insgesamt (darunter Identitätskorrektur, Gruppen-Awareness, drei Engine-eigene Kampffakten); dies ist **nicht** gleich fünf gescheiterte Spielzüge. Der Planner benötigt einmal JSON-Repair bei der Gildenzahlung (Zug 5).
- **SillyTavern:** Der Logger zeigt vor den eigentlichen Requests eine `File not found`-Meldung zu einem alten/fehlenden Chat. Der neue Run setzte normal fort; kein belegter Saveverlust daraus. Der Serverlog enthält 36/36 passende physische Request-/Response-Blöcke, anders als die unvollständig korrelierbare Logabdeckung bei User08.

## 5. Zeiten und API-Tokens

**11 Erzählzüge; zwei zusätzliche Charaktererstellungseingaben ohne LLM-Erzählzug.** Gemessen: von `gen_started` bis `gen_finished` der Narration (Host), danach `extraction.ms` einschließlich jeder X-Reparatur. Host + X bleibt eine **Untergrenze** bis zur sicheren nächsten Eingabe: Es fehlen separate Zeitmarken für bestätigtes Persistenz-Read-back und tatsächliche Host-Freigabe.

| Messpunkt | Mittel | Median | Min | Max |
|---|---:|---:|---:|---:|
| Host bis Erzählende (s) | 40,13 | 32,97 | 20,73 | 92,32 |
| Extractor einschließlich Reparatur (s) | 22,36 | 24,51 | 4,21 | 45,77 |
| Host + Extractor als Untergrenze (s) | **62,49** | **50,59** | **37,99** | **98,34** |

**Physische Aufrufe:** 36 Request-/Responsepaare = Planner 10, Board 1, Narrator 11, Extractor 14 (die 3 überzähligen Extractorantworten entsprechen den 3 Reparaturen). Die 10 Planneraufrufe ergeben sich aus neun freigeplanten Zügen einschließlich einer Reparatur; zwei HUD-Züge umgehen den Planner. Inputtokens 446.632, Outputtokens 10.075, Summe 456.707, gemeldete Cachetokens 0. Alle 36 Aufrufe `stream:false`. [Einzelwerte](MESSWERTE_USER09_207.json).

Die größten Host-Latenzen liegen beim ersten freien Zug (82,14 s; Planner 50,09 s) und Questboard (92,32 s; Board ca. 61 s). Im Vergleich zu User08 `.205` (Host+X 56,68 s Mittel / 52,65 s Median bei 27 Erzählzügen) zeigen sich hier 62,49 / 50,59 s; **kein** gepaarter A/B-Vergleich und keine messbare kausale Verschlechterung oder Verbesserung. Keine Kosten- oder Cacheprognose aus den angezeigten Usage-Zahlen.

## 6. Entscheidung und nächste Prüfung

**Empfehlung:** Die sichtbare Schadensmeldung und die Erfolgsabhängigkeit von Hindernis-PASS vor einem weiteren längeren persönlichen Run als gemeinsamen kleinen Patch prüfen. Vorher unabhängiges Codex-Gegenreview auf Originalpräfix und `.207`-Code. Kein genereller Umbau von PULSE, Reise, Dungeon, Kampfbalance, Handels-HUD oder Charakterregeln. Insbesondere keine weiteren Provideraufrufe ohne Freigabe.

**Nicht ausgeführt:** Replay-/Rot-Grün-Läufe, neue Browser-Smokes, natürliche Provideraufrufe, vollständige Node-Suite und Code-/Preset-/Loreänderungen. Der eingefrorene Produktbranch steht weiter auf `.200`.
