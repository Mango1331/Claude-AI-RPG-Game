# User17 – unabhängiger GPT-Erstreview .263

## Urteil

**R1 hoch: wiederkehrende gewöhnliche Dungeon-Ortsblockade.** Kein seltener Spezialfall, keine notwendige Änderung der Eingabesprache. Ursache beginnt T9, nicht erst T11. F-Rank-Test; keine E-Balancebeurteilung. Codex soll unabhängig reproduzieren und allgemeine Ursache prüfen. Keine Produktänderung beauftragt.

## Ablauf und Belege

Chat-JSONL hat 24 Zeilen inkl. Metadaten, 23 Nachrichten, 11 Eingaben (2 Erstellung, 9 regulär), 21 Eventgruppen; Build .263. 28 physische Request/Responsepaare im ST-Log. Mage, Flame Lance + Arcane Wave, Gildenregistrierung 20 cp, 30 cp verbleibend, Board fünf Angebote, Catacombs F1 für 110 cp erfolgreich angenommen. Kein Kampf und keine E-Entwicklung.

| Turn / ST-Index | Tatsächlicher Ablauf |
|---|---|
| T3 / M6 | Beide GO (Stadt und Gilde) korrekt gebucht. |
| T8 / M16 | GO loc.old_crown_catacombs autorisiert; Dungeon etabliert. PULSE trace offen, realer Halt westlich von Alderwatch, 60 Minuten gebucht. Grundsätzlich legitime Unterbrechung. |
| T9 / M18 | Spieler: *i ignore it and continue onward to the catacombs*. GO loc.old_crown_catacombs autorisiert, PULSE geschlossen. Narrator erreicht die bekannte Kapelle, Ossler führt zum Treppenkopf, Spieler bleibt vor dem Abstieg. X erster physischer Versuch erwartet arrived:true, erzeugt jedoch neue Kapelle als site unter realm.valedorn_crown statt Ziel-/Gate-Identität. Zusätzlich ungültige verkürzte place refs. Repair-Anforderung: Schemafehler plus GO objective reached without corresponding arrive delta. X Repair erwartet arrived:false, repariert die place refs, behält falsche Kapelle. Engine akzeptiert acht Deltas, null Ablehnungen im endgültigen Apply. 81.423 ms X gesamt (42.159 + 39.264). |
| T10 / M20 | Spieler: *i nod and then go down*. P liefert new:down the stairwell beneath the altar slab. GO mode travel, enter:null, scope:null. Kein gültiger Dungeonpfad von aktuellem Ort. X legt Landing before the iron-banded door unter neuer Kapelle an, Zeit 15 min. Narrator übernimmt Öl/Lampe und erfindet magische Entzündung ohne gewählte Nutzung; keine Besitzbuchung. |
| T11 / M22 | Spieler: *i enter the dungeon*. P liefert new:the dungeon beyond the iron-banded door. GO authorized, mode travel, enter:null. N: Eintritt in erste Halle, zwei Wege. X arrived:true, arrive neuer Innenort unter loc.old_crown_catacombs. Engine verweigert passage: First hall of the catacombs lies in Old Crown Catacombs, where he did not set out for. Drei scene_context-Ablehnungen folgen; zwei passage-Deltas mit Schemafehler; arrival_evidence ebenfalls abgelehnt. Kein scene.moved, kein Dungeonabschnitt, PC bleibt Landing; X applied, repaired:false. |

### Tatsächliche Ortsstruktur nach T9/T10

- Kanon: loc.old_crown_catacombs, gate names ruined chapel / chapel stair / chapel yard / chapel lodge; bekannte Beschreibung beneath a ruined chapel an hour's ride west of Alderwatch.
- Neue site loc.ruined_chapel_above_the_ford (parent realm.valedorn_crown), darunter chapel_stairwell_beneath_the_altar_slab und landing_before_the_iron_banded_door.
- Zusätzlich loc.old_crown_catacombs.old_crown_catacombs_first_level_door (parent echter Dungeon) angelegt. Der passage-Datensatz aus T9 war von der neuen Treppe zu dieser Tür gemeint; tatsächlich gebuchter link.1 verbindet den Dungeonroot mit der Tür, nicht den Treppenkopf. Damit fehlen für die folgenden Züge die korrekte kanonische Zuordnung und der tatsächliche Übergang.

### Codebefund (gepinnt .263)

[commands.js L657–674](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/commands.js#L657-L674): vorhandener Ansatzpunkt scene.approaching und knownRouteTarget; die Korrektur setzt konkrete Zustandsvoraussetzungen voraus. [commands.js L526–538](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/commands.js#L526-L538): livingGo benötigt den echten Dungeonroot. [world.js L2903–2953](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L2903-L2953): sectionArrival kann autorisierte Dungeonabschnitte materialisieren, aber bei fehlendem passenden Dungeon-GO kein freier Eintritt aus fremdem Ort. [world.js L2834–2871](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L2834-L2871): Wege-/Dungeon-Schutz und konkrete Fehlermeldung. Der letzte Schutz verhindert einen aus Sicht des falsch gespeicherten Ortsgraphen nicht autorisierten Übergang. Nicht einfach abschalten.

**Empfehlung:** den bekannten Dungeon als Ziel/Anker vom GO über tatsächlich bestätigte Zwischenhalte bis zum Gate und expliziten Eintritt konsistent erhalten. Der semantische Unterschied zwischen Gate erreicht und Dungeon betreten bleibt. Eine kanonische Zielidentität darf nicht durch eine neue Beschreibung des Eingangs verloren gehen. X-Repair darf eine falsche Ortsidentität nicht bloß mittels arrived:false in einen gültigen Zwischenhalt umdeuten. Kein globales Fuzzy-Matching, keine pauschale Umhängung beliebiger Orte, kein automatisches Teleportieren oder Betreten, keine neue Pflichtbestätigung. Vorhandene Mechanismen (approaching, bekannte Wege, gateCheck, sectionArrival, Bewegungsnachweis, PULSE) zunächst gemeinsam prüfen. Abnahme der gesamten zusammenhängenden Kette einschließlich erster X-Antwort und Repair, nicht nur isolierter T11. Gegenproben: echte andere Kapelle/Unterbrechung; nur bis Tor gehen; unbekannter Dungeon; blockierter/gebührenpflichtiger Zugang; mehrere mögliche Dungeons; freiwilliger Eintritt, kein automatisches Betreten; Save/Reload/Revisionsschutz; bekannte Ziele und Party. Keine neue Wortliste als Hauptlösung. Noch keine ausgeführte Reproduktion; Codex-Gegenreview nötig.

R2: Reisezeit T8 60 + T9 60 + T10 15 min. T8 nennt noch etwa 20 Minuten bis Kapelle, T9 bucht erneut 60. Verdacht überhöhte Teiletappenzeit, keine gesicherte Sollgesamtzeit (Ritt vs Fußweg); zusammen mit R1 prüfen.

R3: HUD nach Nutzerfeedback; [Designideen](OFFENE_DESIGNIDEEN.md). Öl-/Lampenübergriff T10 separat notiert, nicht als primärer Blocker.

## Messfenster

9 reguläre Erzählzüge, N+X arithmetisches Mittel 49,659 s, Median 45,584 s; nur gespeicherte N-/X-Dauern addiert, keine sichere Browserfolgeeingabe. 28 physische Request-/Responsepaare, 354.414 prompt tokens und 9.083 completion tokens laut Log; GLM-5.3-Flash, stream:false, reasoning low. Keine Kostenableitung. T9 6,155 s P + 31,780 s N + 81,423 s X = 119,358 s Komponentenzeit. T11 6,687 + 26,752 + 30,373 = 63,812 s; keine erfolgreiche Ankunft. Kein neuer Providerrequest, keine Suite ausgeführt.

[Originalmanifest](SOURCE_MANIFEST.md) · [Feedback](USER_FEEDBACK.txt). Originaldateien im Chat vollständig vorhanden, im Git-Runordner noch nicht vollständig übertragen. Erstreview ist belegte Analyse, kein bestätigter Patch.
