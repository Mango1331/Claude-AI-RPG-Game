# Avereth Engine – unabhängiges Review des natürlichen Laufs auf Build .82

**Original:** `20261025-081303Z-current_test.zip`; Build `4.3.0-c.6.6.82`, Entwicklungscommit `d9476455a7459f75c38d023b0214bde269a3f121`.

**Prüfgrundlage:** `report.md`, `evaluation.json`, `avereth-events.json`, `chat.jsonl`, `chat-completions.jsonl` und gezielt eingesehener GitHub-Code (`world.js` auf `.82`). Ereignisse und LLM-Antworten wurden gegengeprüft; **keine Engine-Tests lokal ausgeführt, keine Repository-Datei geändert**. Die Schweregrade bewerten die beobachtete Spielerwirkung, nicht bereits vollständig reproduzierte Ursachen in eigenständigen Tests.

## 1. Lauf und positive Abnahme

- 100/100 natürliche Spielereingaben; regulär abgeschlossen; 77:21 Minuten Gesamtdauer. Keine unüberwundenen Planner-/Extractor-Hänger, keine beobachtete erzwungene Spielbeendigung.
- Drei gewonnene Kämpfe: Zug 20–22 gegen zwei kanonische Glimmerdeep-Käfer (216 XP), Zug 71 gegen ersten Steinbruch-Gegner (24 XP), Zug 86–87 gegen einen zweiten eigenständigen Gegner (30 XP). Keine Niederlage.
- Spieler kehrt nach Käferkampf zurück, verkauft Beute, steigt auf Level 2 auf, weist Statuspunkte zu und verfolgt mehrere private Geschichten. Guild-Registrierung und Tor-/Shopkäufe werden gebucht. Technische Engine/Spielbarkeit sind deutlich besser als in älteren vorzeitigen Abbrüchen.
- Die engineeigene Dungeon-Sperre verhindert auf Zug 14 korrekt den unerlaubten Spawn von zwei narrativ beschriebenen Käfern und damit unverdiente Kampffolgen. Die erste tatsächliche Slotbegegnung findet Zug 19/20 statt. Die Guard-Regel darf zur Fehlerbehebung **nicht** einfach entfernt werden.
- Die `quest.ready`-Meldung für „Learn whether Brast is alive“ schon beim ersten Lebenszeichen ist dem Ziel entsprechend richtig: *feststellen, ob Brast lebt*, nicht *ihn bis nach Hause retten*. Gleiches gilt grundsätzlich für eine reine Suchquest nach dem Standort eines Wagens. Wiederholte/narrativ widersprüchliche Statusmeldungen sind dagegen separat zu behandeln.

## 2. P1 – Kritische Identitäts- und Kontinuitätsverletzung: Brast zweimal gerettet

**Direkt belegt:** Zug 70 erzeugt `npc.brast` im Steinbruch. In Zügen 72–76 wird er befreit, zu Fuß aus dem Steinbruch und nach Glassmere begleitet; Zug 77 verlässt er die Szene. Zug 88 kommt derselbe `npc.brast` in einem *neuen* überhangartigen Steinbruchraum erneut als eingeklemmter Gefangener vor (`scene.entered`), Zug 90–92 erfolgt eine zweite Befreiung. Zug 98 erzeugt die Engine zudem eine weitere Figur `npc.brast_wenlock`, die den bereits etablierten Brast Wenlock beschreibt; Zug 99 ist sie präsent.

**Wirkung:** Die Spielerhandlung von über einem Dutzend Zügen wird sachlich rückgängig erzählt. Gleichzeitig persistieren doppelte NPC-Identitäten und mehrfach variierende `quest.ready`-Notizen. Das ist nicht nur Erzählkosmetik.

**Technische Prüffragen:**
1. Welche kanonische Orts-/Companion-/Leave-Information für `npc.brast` lag nach Zug 76/77 vor und wurde dem Narrator in Zug 88 geliefert?
2. Warum erlaubte `person.new`/`scene.entered` dieselbe bekannte Person an einem neuen Ort ohne ausreichend belegte Bewegung? Unterscheide *bestehende Identität referenzieren* und *physisch anwesend/umgezogen*.
3. Warum löste `Brast Wenlock` statt `Brast` eine zweite Identität aus? Namenserweiterungen sollen nur bei eindeutiger Identität zusammengeführt werden, nicht pauschal ähnliche Namen.
4. Wie kann der nächste Narrator den bereits erfolgten Rettungszustand zuverlässig sehen, ohne seine Kreativität an anderen Stellen zu beschneiden?

**Regression:** Rettung → Begleitung zum entfernten Ort → Leaving → Rückkehr zum Tatort → unberechtigt erneutes `person.new present:true` → keine Rückteleportation und keine zweite Figur. Außerdem echte Rückreise, eindeutige Namenserweiterung und Reload prüfen.

## 3. P1 – Offizielles Guild-Board zweimal vollständig ausgefallen

**Direkt belegt:** Züge 8 und 47: je Originalversuch und Reparatur, dann `board.failed` mit *„board requires 2 hunts, 2 deliveries and 1 suitable Dungeon clearance; include existing notices“*. Alle vier LLM-Antworten enthalten jeweils fünf Vorschläge. Die letzte Kategorie ist in zwei Originalantworten eine gewöhnliche „Clear ... Glimmerdeep“-Jagd, in Reparaturen teils gänzlich weggelassen. Keine der Antworten wird als gültiges Board akzeptiert; das Spiel zeigt keinerlei offizielle auswählbare Guild-Verträge.

**Wirkung:** Eine Kernschleife (offizielle Guild-Aufträge/Progression/Dungeon-Kontrakt) bleibt für diesen ganzen Testlauf aus. Private Weltquests kompensieren das nur teilweise.

**Korrekturgrenze:** Generator-/Validator-Vertrag und Repair genau abgleichen, insbesondere die eindeutige *Dungeon-clearance*-Typisierung und Erhalt der vorgeschriebenen 2+2+1-Struktur. **Nicht** die 2+2+1-Abnahmeregel lockern oder willkürliche neue Boardquests aus dem Narrator buchen. Rottests mit den vier gesicherten Antwortformen, Grünfälle mit wirklicher Dungeon-Räumung sowie dauerhaften Board-IDs und Publikation/Annahme/Turn-in.

## 4. P1/P2 – Schauplatzprotokoll schützt korrekt, verliert aber auch echte Zwischenschritte

**Direkt belegt:** `evaluation.json`: 36 `scene_context`-Ablehnungen, verteilt auf 12 Züge (13, 24, 41, 48, 52, 57, 59, 62, 65, 66, 81, 94). Auffällig ist die vielfache `answer.scene`-Zuordnung zum **Endort**, während frühere Deltas vor der Reise auftreten, `d.scene` aber null bleibt. Beispielsweise:

- Zug 13: wahrgenommene Merkmale von Glimmerdeep vor einem spät gelisteten `arrive` verworfen.
- Zug 57: tatsächlich in der Geschichte übergebene Anzahlung und Lohnabrede mit Dunn sowie sein Weggang verworfen (sechs Szeneablehnungen). Daneben wird eine nicht autorisierte Ankunft in Glassmere zu Recht abgelehnt.
- Zug 59: Ovells erzählte Auszahlung von zwei Silber und zugehörige Fakten/Threads wegen Antwortszene „Gasse außerhalb des Ladens“ verworfen (sieben Szeneablehnungen). Daneben nicht autorisierter Ortswechsel abgewiesen.
- Zug 62: weitere erzählte Zahlung von Dunn in der Gaststube verworfen, weil die globale Antwortszene bereits die eigene Schlafkammer ist.

**Einordnung:** Die World-Firewall zeigt reale Schutzwirkung gegen nicht autorisierte Ortswechsel. Sie darf nicht pauschal gelockert werden. Der Fehlerkandidat sitzt an der Schnittstelle *semantische zeitliche Sortierung/Schauplatzannotation → korrekte lokale Prüfung*. Die Engine kann nur den Schauplatz prüfen, den der Extractor ihr tatsächlich liefert. Es ist gesondert zu prüfen, ob der Navigator die Ankunft in falscher Reihenfolge meldet und welche Deltas wirklich von einer unautorisierten Reise abhängen.

**Regression:** Erzählung „Gespräch/Zahlung in A → Aufbruch/Ankunft in B“ sowie „vorzeitiges Ereignis in nie erreichtem B“ müssen unterschiedlich behandelt werden. Die Quelle muss per-delta mit A markiert sein; ein `scene`-Label darf nie Reiseberechtigung erzeugen. Gleichzeitig Folgen einer verweigerten Ankunft weiter abweisen. Reparatur ohne zusätzliche Endlos-Retries.

## 5. P1/P2 – Geldwerte und private Löhne werden nicht verlässlich gebucht

**Kanon:** 5 Silber Startvermögen = 50 Kupfer; 1 Silber = 10 Kupfer (die übrigen Engine-Käufe bestätigen das).

**Konkrete Abweichungen:**

- Zug 25/26: Narrator nennt 5 Silber + 8 Kupfer für Käferbeute = 58 Kupfer; das kanonische Angebot und die tatsächlich gebuchte Transaktion betragen **50** Kupfer. Die acht Kupfer gehen verloren.
- „Runner to Millbrook“ (angelegt Zug 49): Zwei Silber werden in der Quest als **`payout_cp:200`** geführt statt 20. Der Extractor überträgt später ebenfalls 200 cp. Abweichung um Faktor 10.
- „A push for the mired cart“ (angelegt Zug 55): angebotener Silberlohn wird als **`payout_cp:100`** gespeichert, nicht 10. Auch beim späteren Zahlungsversuch tauchen 100 cp auf. Einträge müssen anhand des tatsächlichen, vor der Vergabe erzählten Betrags validiert werden.
- Zug 44: Acht Silber für erledigte College-Arbeit korrekt als 80 cp erkannt, jedoch **`private_payment` abgewiesen**, weil Steward statt Questgeber Dace zahlen möchte. Das kann bei klar nachgewiesener autorisierter Zahlungsvertretung zu restriktiv sein, darf aber nicht in eine Beliebig-Person-zahlt-Regel umkippen.
- Züge 57, 59, 62: Zahlungen aus korrekter Szene nicht gebucht, wie Abschnitt 4.
- Quest-Report: zwei private Quests als completed, aber **keine gebuchten privaten Quest-Auszahlungen**. Damit leidet die Belohnungsschleife trotz erreichten Zielen.

**Prüffragen:** Wird `reward_cp` im LLM-Schema ohne maschinell überprüften Einheitenbeleg erzeugt? Stimmt das Quellzitat (z.B. „two silver“) eindeutig nicht mit der Zahl überein? Werden erlaubte Stellvertreter-Zahler schon im Vertrag/bei der Abrede persistent repräsentiert? Wo kann eine vorhandene Quelle mit Betrag/Einheit statt neuer Freitextheuristik genutzt werden?

**Regression:** 1s=10cp, 2s=20cp, 5s8c=58cp; Vertragsanbahnung → Auszahlung in korrekter Höhe; abweichender/unautorisierter Zahler weiter zurückweisen; autorisierter Arbeitgeber-Stellvertreter nur bei belegter Autorisierung. Keine rückwirkende Geldgutschrift in diesem Testsave.

## 6. P2 – Dungeon-Narrator zeigt vorzeitige, nicht kämpfbare Feinde

Zug 14 erzählt zwei Käfer im Grotto-Mund. `dungeon_foe` verweigert sie korrekt, da sie nicht zum kanonischen Slot gehören. Der Spieler versucht Züge 15, 16 und 17 drei Attacken auf die Erzählgegner; jedes Mal `TARGET NEEDED` und „no targetable actor“. Erst nach Bewegung zum tatsächlichen Slot werden zwei Käfer in Zug 19 und im Kampf 20–22 korrekt registriert.

**Wirkung:** Drei verlorene Eingaben und sichtbare Entkopplung von Erzählung und Engine. **Nicht** durch Öffnen der Dungeon-Foe-Firewall reparieren. Zu untersuchen sind Scene-/Dungeon-Context für den Erzähler, kanonische Ahead-Hinweise und Korrektur nach `dungeon_foe`.

## 7. P2 – Questannahme von Ovells Beastrun scheitert an Präsenz

Ab Zug 79 existiert „Finish the quarry beast“ nur `offered`. Der ausdrückliche Annahmeversuch in Zug 80 wird mit `the giver is not here` abgelehnt, obwohl die Erzählung einen Dialog mit Ovell beschreibt. Zug 87 ist der zweite Quarry-Beast tatsächlich besiegt, `quest.ready` wird jedoch mit `the quest is offered` abgewiesen. Die Regel „nicht ohne erreichbaren Geber annehmen“ ist richtig, aber der vorausgehende NPC-Präsenz-/Narrationswiderspruch muss geklärt werden. Eigenständiger Kandidat oder Folge von Befund 2/4; kein Schnellfix durch automatische Annahme.

## 8. Sonstige Beobachtungen, nicht voreilig als P1 klassifizieren

- Die `quest.ready`-Meldungen für rein informationsbezogene Ziele vor der eigentlichen Rettung sind **nicht** automatisch Fehler. Im Gegensatz dazu ist Brasts erneute Gefangenschaft nach der belegten Rückkehr klar falsch.
- Die letzten, narrativ angekündigten Geräusche eines weiteren Quarry-Beasts sind am Ende nicht als angreifbares Monster verbucht; der Angriff in Zug 100 wird zu Recht verweigert. Das zeigt einen ähnlichen Narrator-/Encounter-Konflikt wie im Dungeon, beweist aber ohne weiteres nicht denselben technischen Ursprung.
- Der automatisierte Testspieler lieferte laut Bericht 48-mal im Erstversuch kein gültiges Entscheidungs-JSON. Das betrifft die Qualität/Latenz des Testspielers, nicht unmittelbar die Engine; kein Anlass, den Engine-Patch zu verbreitern.
- `evaluation.json` listet neun automatische Reparaturen für Planner/Extractor (5/4) und zwei gescheiterte Board-Calls; keine Planner-/Extractor-Transportlücke.
- Ein einzelner 100-Züge-Lauf ist keine statistische Leistungs- oder Balancemessung. Zahlenbalance/XP/Monsteranatomie deshalb hier nicht anfassen.

## 9. Empfehlung zur weiteren Arbeit

**Keine Kette neuer Mikro-Hotfixes und kein Architekturumbau.** Die Befunde zu fachlichen Paketen bündeln und zuerst reproduzieren:

1. **Kontinuität/Ortsbezug:** Brast-Doppelrettung und Namensduplikat; NPC-Präsenz bei Ovell; temporale Zuordnung innerhalb mehrörtiger Antworten. Die drei Fälle berühren dieselbe Grenze zwischen erzählter und kanonischer Welt, brauchen aber jeweils eigene Rot-/Grünregressionen. Eingrenzen, wo der Narrator fehlgeleitet ist und wo World unerlaubte Bewegungsfolgen durchlässt.
2. **Guild und Belohnung:** reproduzierbar scheiterndes 2+2+1-Board; getrennt davon Betrags-/Währungseinheiten und autorisierter Zahlender. Die beiden Blocker nicht durch gelockerte Regeln „grün“ machen.
3. **Begegnungspräsentation:** vorzeitige Dungeon-Käfer und nicht gebuchtes Monster am Laufende nur dann gemeinsam korrigieren, wenn ein nachgewiesener gemeinsamer Mechanismus vorliegt.

**An Sol zunächst Review-/Reproduktionsauftrag:** Originaldaten inklusive E14–19, E25–26, E44, E47, E57–62, E70–80, E84–99 auswerten; vorhandene Engine-Tests ohne Modifikation gegen `.82` reproduzieren; nur bestätigte Defekte in fachlich zusammenhängenden Patches lösen. Sonst den dokumentierten Stand erhalten. Kein weiterer natürlicher Test vor Beseitigung mindestens der beiden P1-Gameplay-Blocker (Guild-Board und Brast-Kontinuität), sofern die Gegenanalyse sie bestätigt.
