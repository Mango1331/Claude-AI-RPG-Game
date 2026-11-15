# Avereth Engine – Unabhängiger Kontrollreview Build .190 (Architekturumbau)

**15.11.2026 · Code-/Dokumentationsreview, kein Produktpatch und keine neue Testsuite ausgeführt.** 

## 0. Prüfumfang und Ergebnis

**Produkt-HEAD geprüft:** `9635f722e8fb843ae65a7b271cfd3b73241e98b3`, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`. **Main-HEAD geprüft:** `91d82bc151bdf008346c2f1716b85a6967dec4fc`. Gegenüber der Basis `.189` `4438241`: 7 Produktcommits, Buildversion konsistent in `manifest.json`, `package.json`, `src/util.js`. Originalquellen: [technischer Etappenbericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9635f72/avereth-engine/docs/LOCATION_ARCHITECTURE_190.md), [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9635f72/avereth-engine/docs/BUILD_190_LOCATION.md), Design-Kanon auf `main`, Fachpläne A/B/C und [GPT-Gegenreview der Fachpläne](../recherche/GEGENREVIEW_FACHPLAENE_A_B_C_2026-11-14_GPT.md).

**Implementierer-Abnahme (dokumentiert, nicht in diesem Review unabhängig neu ausgeführt):** Node **3223/3223**, 2235er Replay **1092 fingerprint-akzeptierte Änderungen, 0 offen/veraltet**, isolierter ST1.19-Smoke Standard **225/225**, Failsoft **230/230**, 0 PageErrors. Replaylaufzeit rund 95–103 s statt 96–100 s; kein belegter Geschwindigkeitsgewinn. Produktcode `src/content` seit `.189` +804/−155, **netto +649 Zeilen**; das Ziel „weniger unabhängige Ortsentscheidungen“ ist wichtiger als bloße Zeilenzahl, aber die verlangte **Nettovereinfachung ist zahlenmäßig noch nicht gezeigt**.

**Gesamturteil:** Substanzieller, real gepushter Umbau. Die bewusste **Nicht-Umsetzung von A4** (einheitlicher Extraktor-Ankunftsbeleg) ist gemäß Sicherheitsvorbehalt zulässig. `within` korrekt vorläufig behalten. Die ursprünglichen Engine-Dungeon-Selbstwidersprüche haben einen deutlich besseren strukturellen Gegenentwurf. **Noch keine vorbehaltlose Kontrollfreigabe:** Drei neue negative Grenzfälle am tatsächlichen Code müssen gezielt getestet und gegebenenfalls eng korrigiert werden, bevor ein großer natürlicher Test den neuen Build als stabil behandelt. Nachweis: statische Codepfade; in diesem Review keine eigenständig ausgeführten Rot-/Grün-Proben.

## 1. P1-Negativprobe – ungewollter Ebenenwechsel am Ende der Dungeonspur

**Datei:** `avereth-engine/src/v4/sections.js`, `sectionStep` (ca. Zeilen 81–115), `sectionExits` (ca. 117–130); Aufruf in `commands.js`, GO-Handler (etwa 645 ff.).

**Codeverhalten:** Ist Alaric am **letzten Abschnitt** einer Ebene mit vorhandener nächster Ebene und ist das Siegel offen, gelangt `sectionStep` zum abschließenden `return below ? {to:below} : preview(level+1,...)` – **ohne die Bedingung `DOWN.test(w)`**. Vorher prüft es `DOWN.test(w)` nur für einen Abstieg *vor* dem Ende oder auf nicht existierende Ebenen. Das bedeutet: Eine bloße Richtungsangabe `{new:"on"}` beziehungsweise „I go on“ am Ende kann den Schritt auf Ebene 2 lenken, obwohl der Spieler kein „down“ gewählt hat. `sectionExits` bewirbt an dieser Stelle lediglich den **Abstieg**, nicht den regulären nächsten Abschnitt. Der Code widerspricht damit dem gewählten Design, dass der Spieler über den Ebenenwechsel entscheidet.

**Vor der Freigabe gezielt rot/grün:**
- Mossback: Ebene 1, letzter Teil, Zugang zu Ebene 2 offen, Spieler `go {new:"on"}`: **kein** Ebenenwechsel. Verständlicher Hinweis auf Ende bzw. den bewusst zu wählenden Abstieg.
- Derselbe Zustand, `go {new:"down"}`: gültiger Abstieg.
- Siegel aktiv: auch `down` bleibt verweigert.
- `up` von einem *nicht ersten* Abschnitt einer tieferen Ebene darf niemals als automatisches **Vorwärtsgehen** interpretiert werden (dieselbe Verzweigung führt ohne passenden Spezialfall zur nächsten Sektion). Für nicht anwendbare Richtungsworte klären oder ablehnen, nicht anders bewegen.

**Schwere:** P1-Spielerhoheit/Navigation, eng lokalisierbar; keine neue Architektur notwendig.

## 2. P1-Negativprobe – gesperrter Gebäuderaum über fremden offenen Zugang erreichbar

**Datei:** `avereth-engine/src/v4/world.js`, `wayRefused` (ca. 2470 ff.), Zweig `!dungeonOf(from) && !dungeonOf(to)`.

**Codeverhalten:** In Nicht-Dungeons werden alle `linksAt(s,to)` gesammelt, auch solche **von anderen Räumen**. Nur wenn **alle** eingehenden Wege blockiert sind, verweigert die Engine den Zutritt. Ein offener Weg von einem dritten, vom aktuellen Standort aus nicht erreichbaren Raum genügt damit, eine **verschlossene direkte Tür** zum Ziel nicht als Sperre zu behandeln. Es gibt in diesem Zweig keine Pfadsuche oder Prüfung, ob einer der offenen Wege tatsächlich vom aktuellen Ort benutzt werden darf.

**Negativprobe:** Gasthausflur -> private Kammer über versperrte Tür; derselbe Zielraum besitzt einen offenen Durchgang zum verschlossenen Lagerraum auf der anderen Seite. Ein autorisiertes GO zum **bekannten Zielraum** aus dem Flur darf nicht wegen dieses **unzugänglichen** offenen Durchgangs die Sperre überwinden. Positiv: eine tatsächlich offen erreichbare Alternative darf weiter funktionieren. Falls die vereinfachte Nicht-Dungeon-Navigation keine Pfadsuche mehr erhalten soll, braucht es einen kleinen konservativen, **standort- und zugangsbezogenen** Schutz statt eines erneuten allgemeinen Graphsystems.

**Schwere:** P1-Zutritts-/Blockerinvariante. Die existierenden Tests „eine verschlossene Tür“ + „anderer offener Raum“ beweisen den kombinierten Fall nicht.

## 3. P1/P2-Negativprobe – D3 lässt eine Schlaf-/Rastbuchung den gewählten Raum ersetzen

**Dateien:** `avereth-engine/src/v4/world.js`, `firewallContext` (`lodgedHere`, `roomOfHere`, ca. 124–140); `firewall.js` `arrive` (ca. 411).

**Codeverhalten:** Ruleset 2 erlaubt eine ohne GO gemeldete Zimmerankunft, wenn `o.auth.rest` vorliegt, eine Unterkunft am Gebäude gebucht ist und die **Zielraumbezeichnung** Zimmer/Bed/Berth enthält. Nicht geprüft wird, ob die **Spielernachricht** tatsächlich das Gehen in dieses Zimmer autorisierte. Beispiel: Der Spieler wählt ausdrücklich „I rest downstairs by the fire“ und besitzt ein bezahltes Zimmer im Gasthaus; der Erzähler lässt ihn trotzdem ohne GO „up to the small room“ gehen. Die Bedingungen `rest` + `lodging` + `room` sind dann zwar erfüllt, der Ortswechsel aber nicht gewählt.

**Negativprobe:** Gleiche Unterkunft und Buchung, **„I rest at the downstairs table; I stay here“**, Erzähler meldet `arrive` in `small room upstairs`: `no_go`; „I go upstairs to my paid room and sleep“ darf über den eng belegten Teilakt weiter funktionieren. Keine allgemeine zusätzliche Regex-Wortliste als vermeintliche Lösung; besser die vorhandene Spielerentscheidung/Planner-Autorität verwenden oder die automatische Ausnahme konservativ zurücknehmen. Wenn sie nur mit erheblicher neuer Komplexität sicher ist, D3-Vereinfachung bewusst opfern und ein ausdrückliches GO verlangen.

**Schwere:** Spielerhoheit, Abnahme erforderlich. Dieser Fall wird durch den grünen Test „zahlen allein reicht nicht; Schlaf ja“ nicht abgedeckt.

## 4. P2-Nachprüfung – Bekanntheitsgrenze im neuen Ortsbuch

**Datei:** `avereth-engine/src/v4/place_book.js` `knownPlace`, `knownPlaceIds` (frühe Zeilen). `knownPlace` gibt für **jede Nicht-Raum-Stätte** `true` zurück, sobald sie im `state.places` existiert; `known === "false"` wird nicht ausgeschlossen. `known.js` kennt ausdrücklich den Zustand eines als falsch erwiesenen Ortsberichts (`KNOWN.false`), und `reportedPlaces` führt diese Orte nicht mehr als gültige Berichtsziele. Der erweiterte `valid_places`-Satz für Extraktor/Planner kann sie dennoch enthalten.

**Gezielte Probe:** Ein Ort wird nur berichtet und der Bericht später als falsch erwiesen; Prüfen, ob die angeblich einheitliche „bekannt“-Sicht diese ID weiterhin als berechtigtes Reiseziel und Modellreferenz anbietet. Auch nicht entdeckte, aber als Nicht-Raum bereits persistierte Orte kontrollieren. Ein bekanntes widerlegtes Gerücht kann weiterhin als **Gesprächsinformation** bleiben, ohne als erreichbarer Orts-ID-Match zu gelten. Kein pauschales Herausfiltern, das historische Notizen unlesbar macht.

**Schwere:** P2/Vertragsprüfung; keine Behauptung einer im natürlichen Lauf bereits beobachteten Fehlbuchung.

## 5. Positiv bestätigtes und Beweisgrenzen

- Releaseversion ist an den relevanten drei Stellen `.190`; Produktbranch und `main` sind tatsächlich auf den berichteten Commits.
- Im Produkt stehen `place_book.js`, `movement.js`, `sections.js`, die Original-Rogue-/Mage-Fixtures, die überarbeitete `expected`-Normalisierung, `NOT ARRIVED`, N1 und N4.
- Der neue Dungeon erzeugt seine nächsten Abschnitts-IDs im GO als **Preview**; `place.created` und der Slot/Progress werden laut Implementierung erst mit bestätigter Ankunft gebucht. Das adressiert die ursprünglichen verwaisten Raumdeltas grundsätzlich.
- Die unangeforderten `expected`-Schlüssel werden vor der Schema-Validierung entfernt; ein zusätzlicher `arrived:true`-Schlüssel ist damit selbst **keine Autorisierung**.
- A4 bleibt aus ausdrücklich dokumentierten Evidenz-/Chronologie-/Migrationsgründen unimplementiert. Der originale Kanon zur Ankunft bleibt entsprechend gültig. Das ist **kein** unerledigter Pflichtfix gegen den vom Nutzer zugelassenen Sicherheitsvorbehalt.
- `within` bleibt, weil die Habitatpopulation ohne dieses Feld nicht ohne neue Semantik ersetzt werden kann.
- Legacy-Pfade sind weiterhin vorhanden und werden von Testfällen angesprochen; daher **Netto-Codezuwachs +649** seit `.189`. Behauptung „netto einfacher“ ist erst über nachgewiesene weniger widersprüchliche Zuständigkeitsentscheidungen/natürliche Wirkung zu prüfen.
- Alle Node-/Replay-/ST-Smoke-Zahlen stammen aus Implementiererprotokoll und Patchnote, **nicht** aus erneuter unabhängiger Ausführung; in dieser Umgebung wurde kein Repository lokal geklont.

## 6. Empfehlung vor der nächsten natürlichen Serie

**Kleiner negativer Kontrollpatch statt weiterer Architekturarbeit:** die drei P1-Negativproben aus §§1–3 zuerst als *exakte positive und negative Host-/Engine-Regressionen* ausführen, Ursachen bestätigen oder widerlegen, nur belegte Lücken eng korrigieren. Die P2-Bekanntheitsfrage separat mit einem kurzen Test entscheiden. **Keine** weitere vollständige Architekturanalyse, keine großflächigen Änderungen an Payment, PULSE, NPC E3 oder A4.

Danach Node-Vollsuite, voller 2235er Replay (nicht nur Quick Guard), kurze isolierte Standard-/Failsoft-Smokes für veränderte Wege; erst dann ein kurzer **natürlicher** Lauf mit Glimmerdeep Queen, Mossback bis Ebene 2, Tannery-Rows-Rückkehr und einer realen Nicht-Ankunft. Der Lauf soll die ersten realen Modell-/Spielzeit-/Token- und Driftwerte zu `.190` liefern.

**Keine Produktänderung durch diesen Review.**
