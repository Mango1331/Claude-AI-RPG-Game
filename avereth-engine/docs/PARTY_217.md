# Partyentwicklung .217

Interne Sicherung auf dem Entwicklungsbranch. Ausgangspunkt ist .216 auf `bf44a5fb`. Der verbindliche Fachplan mit D10–D12 steht auf main, Dokumentationscommit `fba80471`.

## Foundation

Das Ereignisprotokoll speichert Vorschlag, zustimmende Parteien, Mitgliedschaft und Reisemodus. Erst das reguläre X nach der Annahme legt ein bisher fehlendes Profil anhand der dann bekannten Ausbildung fest. Reise, Torkontrolle und Katalog lesen dieselben Entitäten. Der Composer öffnet die lokale Partyansicht vor dem Senden.

Die Offlineprobe `node tools/replay/party217.mjs <User14>/originals/chat.jsonl` nutzt die gespeicherten Spieler- und Narratortexte sowie vorgegebene strukturierte Antworten. Sie prüft Beitritt, Sprecher, Warten, Wiederaufnahme, Austritt und Ossens mechanischen Bogen mit 20 Pfeilen. Die bisherigen Planner- und Ownership-Tests bestanden. Die Gruppenauflösung, Progression und technische Gesamtabnahme folgen in den nächsten Paketen.

## Gemeinsamer Kampf

Auf dem Foundation-Commit `81f244cd` baut die Gruppenauflösung auf. Ein neu eröffneter Encounter mit zugesagtem Kampfpartner verwendet eine gemeinsame Positionslinie. Vorschau und Angriff lesen den Abstand zwischen Handelndem und Ziel. Initiative, Skillkosten, Schaden und Munition benutzen die bestehenden Kampffunktionen. Belegte Gruppenabreden halten Paare und persönliche Zustimmungen fest. Eine Flucht belegt den eigenen Zug, das Beobachtungsfenster endet spätestens am früheren PC-Platz.

Die Originalpräfixprobe erreicht einen echten Schuss Ossens. Zwei gegnerische Ziele, getrennte und gemeinsame Flucht sowie Teilfrieden wurden lokal geprüft. Die 18 bestehenden Eingabetests und der User13-Surrenderlauf bestanden. XP-/Questabrechnung und Gesamtabnahme folgen.

## Progression und Besitz

Der Encounter teilt seinen tatsächlichen XP-Pool nach den Teilnahmeintervallen auf. Jeder Überlebende erhält seine eigenen XP-, Level- und gegebenenfalls Stat-Ereignisse. Skillfortschritt verwendet die Belege des jeweiligen Anwenders. Der Questnachweis bindet aufgelöste Ziele an ihre Quellen und Teilnehmenden. Die Gilde zahlt an den Auftragnehmer, private Ansprüche verweisen auf die akzeptierte Abrede. Zahlungen schreiben beide Geldbestände und eine Quittung. Sachbeute und zugesagte Erlöse bleiben an das tatsächliche Los gebunden.

Die Originalpräfixprobe umfasst nun eine isolierte Abschlussrechnung mit 180 Kampf-XP, 450 Quest-XP, 90 cp, Trennung, Tod, Teilzahlung und wiederholter Abgabe. 61 bestehende Progressions-, Gilden- und Beutetests bestanden. Anzeige, durchgängige Kampagne und Hostabnahme folgen.

## Gameplay und Kandidatenstand

HUD und lokales Panel lesen den Fold. Anwesende zeigen eigene Ressourcen und Ausrüstung, getrennte Mitglieder den letzten beobachteten Stand. Die tatsächlich gebuchte Rast regeneriert die individuellen Ressourcen der Ruhenden. Ein Wachdienst erhält keine Rastgutschrift.

Der durchgehende Offlinepfad in `tools/replay/party_campaign217.mjs` startet vor M13 ohne neue Party. Dieselbe Kampagne erreicht Bones, Gallery und Warden, Gildenabgabe und Trennung. Ergebnis bei Seed 3509323178 sind drei Slotnachweise, 225/225 Quest-XP und 45/45 cp im aktiven Spielstand. Der vollständige Implementierungsstand wird vor Node-, Replay- und Browserabnahme remote gesichert. Testergebnisse und mögliche Korrekturen folgen.

## Hostgegenproben

Der erste Browserlauf zeigte, dass die Bones bereits vor der taktischen Bitte fallen konnten. Der zweite Lauf belegte Beitritt, Schuss mit Pfeilverbrauch, Swipe, Reload, Teilfrieden und lokale Panelzugriffe einschließlich pending X. Er deckte außerdem eine echte Fehlklassifizierung auf: Der allgemeine Akteursfilter behandelte die angeredete Person in „Ossen, protect me“ als Sprecher. Der Gruppenpfad erkennt die direkte Anrede und prüft danach weiterhin Person, Beleg und Ziel. Der erneute Browserlauf enthält auch dieselbe Aktion mit null, einem und zwei Begleitern.

## Zusatzabnahme vor dem Gesamtvergleich

Der Originalpfad wurde mit aktiver Schreibrechteprüfung bis zur Abgabe durchgespielt. Auf einer Kopie desselben erreichten Clears wartet Ossen im Raum des Wardens. Alaric erhält am Schalter 90 cp, trifft Ossen tatsächlich wieder und begleicht die 45 cp in zwei ausdrücklich gebuchten Zahlungen. Die Einzelproben prüfen zusätzlich Dreieranteil, persönliche Rüstung und Trank, Eigenbesitz beim Tod, zugewiesene Sachbeute, realen Verkaufserlös und einen durch einen wartenden Begleiter belegten Dungeonplatz. Der isolierte ST-Lauf mit 39 Prüfungen bestand auf dem vorherigen Kontrollstand. Der abschließende Lauf prüft den gesicherten Kandidaten einschließlich gemeinsam aufgelöster Minor-/Major-Folgen.

Die vollständige Node-Suite hat zusätzlich einen von der Importreihenfolge abhängigen Fehler beim direkten Einstieg über das Schema aufgedeckt. Die bereits aufrufenden Gilden-/Weltpfade reichen ihre Bereitschaftsprüfung jetzt an die Mitgliedschaftsentscheidung weiter. Das Ownership-Inventar führt Partyabreden und Forderungen als enginegebundene Region. Ein weiteres Regressionsbeispiel prüft das einmalige Umbuchen einer Standardrüstung vom eigenen Rucksack in den Slot und weiter an den tatsächlichen Empfänger.

Beim Festlegen oder Übernehmen eines Kampfprofils erhält jedes generierte individuelle Ausrüstungsstück seine durchgehende Objektreferenz. Eine Gegenforderung nach dem Bogen bindet den benannten Inhaber und dessen eigene Erklärung. Die Offlineprobe mit beiden Originalchats prüft Forderung, Annahme, physische Empfänger-ID, gebrochene Besitzkette und Friedenspaare. Gewöhnliche Skillfläche und physischer Wurfcluster sind getrennt geprüft, einschließlich Alaric im realen Cluster eines anderen Werfers. Der Browser prüft die zugestellten Positions- und Angriffsrecords im Narratorrequest.
