# Avereth Engine – Unabhängiger Gesamt-Kontrollreview des Architekturumbaus `.190`

**15.11.2026 · Claude Opus.**

**Geprüft:**
- Remote-HEAD Produkt `9635f72` (`.190`) und Basis `.189` `4438241`.
- `main` `3ced7b2` mit dem [GPT-Kontrollreview](REVIEW_BUILD190_ARCHITEKTUR_PRODUKTDIFF_GPT.md).
- Grundanalyse, Fachpläne A/B/C, GPT-Gegenreview der Fachpläne, Kanon 02, die Produktdokumente `LOCATION_ARCHITECTURE_190.md` und `BUILD_190_LOCATION.md`.
- Die natürlichen Fehlerbefunde `.179`/`.183`/`.186`/`.188`, soweit sie die Grundanalyse und die Fixtures tragen.

**Ergebnis dieses Reviews:**
- Korrekturbuild `.191` (`b8d3be52c40e540ea1f11fb187914c5eddda12a5`), Patchnote [FOLLOWUP_190_191.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b8d3be52c40e540ea1f11fb187914c5eddda12a5/avereth-engine/docs/FOLLOWUP_190_191.md).
- Dieses Dokument.

**Keine natürliche Modellprobe ausgeführt.**

**Befangenheitshinweis:** Ich habe `.190` selbst implementiert. Deshalb habe ich jede Annahme gezielt gegen den Code gestellt: Zählungen statt Behauptungen, rote Proben am unveränderten Stand, ein eigener zusätzlicher Befund (R5). Wo der Umbau weniger erreicht als dokumentiert, steht das unten ausdrücklich.

---

## 0. Kurzfassung

| Frage | Antwort |
|---|---|
| Wurden die Orts- und Bewegungsentscheidungen ersetzt oder nur ergänzt? | **Gemischt.** Zwei der drei Problemkerne sind wirklich ersetzt: *wohin eine Ankunft führen darf* und *wer Teile, Wege und Ebenen eines Living Dungeons bestimmt*. Die *Namensauflösung* ist **nicht** konsolidiert, ein Resolver kam zusätzlich hinzu. Der vollständige Raumgraph bleibt für Altstände und schon markierte Gebäude, ebenso ein Legacy-Zweig für Antworten auf vor `.190` geplante Züge. |
| GPT-Grenzfälle | G1, G2, G3 und G4 **bestätigt**. G1 ist breiter als gemeldet. G3b (verschlossenes Hinterzimmer) ist präzisiert: ein älterer Fehler, kein Rückschritt. Ein eigener Befund **R5** (Halt in einer fremden Stadt) ist bestätigt. Alle wurden eng korrigiert in `.191`. |
| Zuverlässigkeit | Strukturell geschlossen: Dungeon-Selbstwiderspruch (Engine kündigt an, Erzählung baut, Engine lehnt ab), verwaiste Räume, Ebenen aus erzählter Richtung, „jede Ankunft gilt, sobald irgendein GO existiert“, Rückweg aus Wortlisten, unsichtbare Nichtankunft. Offen: Namensparaphrasen, die Ortswahl bei `{new}`-Zielen, Modellbefolgung von N1/N4. |
| Einfacher? | **Fachlich ja an den zwei entscheidenden Stellen; als Codebasis nein.** Produktcode `src/content/index.js` seit `.189`: +872/−155, netto **+717**. Die Altpfade sind gewachsen (`!explicitTravel` 9 → 11, dazu 4 `oldSteps`). |
| Performance | Engine gleich schnell (Replay 95–103 s gegen 96–100 s). Prompt leicht größer, Reparaturen im Korpus leicht weniger. **Kein Geschwindigkeitsgewinn belegt.** |
| Urteil | **GO mit Beobachtungspunkten** für den natürlichen Test, auf `.191`. |

---

## 1. Fachplan A – Ortsbuch und Bewegungsautorität

### 1.1 Antworten auf die Prüffragen

**1. Dieselbe verbindliche Ortsidentität bei Planner, Extractor und World?**
- **Teilweise.**
- **Einheitlich ist die Menge gültiger Referenzen:** `knownPlaceIds` → `valid_places`, verwendet in Planner-Schema (`catalogIds`), Route-Filter (`planContext`) und Extractor-Schema (`extractorCatalog`). Vorher gab es drei verschiedene Mengen (Katalog-Enum, Zustand, gefilterte Route).
- `valid_places` steht nicht im Prompt, sondern ist nur ein lokaler Validierungssatz: gemessen an drei langen Korpusläufen 0 zusätzliche Zeichen im Request bei 32–49 unbeworbenen gültigen Orten. Es kostet also keine Tokens.
- **Nicht einheitlich ist die Auflösung von Wörtern zu Orten.** Aufrufstellen `.189` → `.191`:

| Funktion | `.189` | `.191` |
|---|---|---|
| `placeIdentity` | 9 | 8 |
| `knownByName` | 5 | 5 |
| `guildDestination` | 7 | 7 |
| `entranceOf` | 3 | 3 |
| `roomByName` | 3 | 5 |
| `resolvePlaceRef` (neu) | 0 | 5 |

- `resolvePlaceRef` sitzt als **weitere Stufe** im GO-Handler (nach `guildDestination` und `knownByName`), in `placeIdentity`, in `resolvePlace` (nur Mehrdeutigkeit) und in `arrivalPlace`.
- Das von Fachplan A versprochene Ergebnis „1 Auflöser mit 7 geordneten Stufen“ ist **nicht** erreicht.
- Der neue Resolver ist ehrlich streng: genauer Name, Dungeon-Kopfwort, Präfix mit Ortsrest, Mehrdeutigkeit wird zur Rückfrage. Er hat aber die alten Auflöser nicht abgelöst.

**2. Treffen verschiedene Stellen dieselbe Bewegungsentscheidung neu?**

*Wohin eine Ankunft darf* (Ruleset 2): nur noch `allowedArrival` auf Grundlage der im GO-Schritt gespeicherten Felder `mode`, `enter`, `scope` und `meant`. Entfallen sind:
- die implizite Regel „jede Ankunft, sobald ein GO existiert“ (Firewall);
- `elsewhere`;
- `scopedPlaces` mit seinen zwei unabhängigen Ableitungen pro Antwort;
- die `arrivalPlace`-Ebenenvorprüfung.

Das ist eine echte Ablösung.

*Auf welchem Weg* entscheiden weiterhin mehrere Stellen, alle mit denselben Funktionen:
- `dungeonGo` / `livingGo` / `sectionStep` auf Befehlsseite;
- `wayRefused` / `sectionArrival` auf Weltseite.

Das Siegel wird dreimal geprüft (`sectionStep`, `livingGo`, `wayRefused` über `sealRefusal`), das Tor zweimal (`gateCheck`, `gateRefusal`). Das ist redundant, aber nicht widersprüchlich, weil dieselbe Funktion mit demselben Zustand entscheidet. Der frühere Widerspruch (Spur gegen Graph gegen Vertrag) entstand durch *verschiedene* Ableitungen. Die gibt es für neue Züge nicht mehr.

**3. Vereinfachung oder zusätzliche Autoritätsschicht?** Für die Ankunft eine Vereinfachung: vier verstreute Regeln wurden durch eine Prüfung über einen gespeicherten Schritt ersetzt. Für die Namensauflösung eine zusätzliche Schicht.

**4. Tannery Rows und Glimmerdeep strukturell beseitigt?**

*Glimmerdeep: ja.*
- „Grotto mouth“ wird an das Tor gebunden. Ein Schritt mit Torwort endet am Tor.
- Ein Raum eines nicht angesteuerten Dungeons wird abgelehnt, und zwar **ohne verwaisten Raum** (Anlegen erst nach der Prüfung, Rücknahme bei Ablehnung).
- Das Innere läuft über Engine-Abschnitte.

*Tannery Rows: nur für die belegte Formulierungsklasse.* Gelöst sind „the tannery rows“ → „the Tannery Rows behind the Ashbridge tanneries“ (Präfix plus Ortsrest), der Zielort bei `KNOWN AT` und Ostrek als eine Person. Eine andere Paraphrase („the rows behind the tannery“, „the tannery yards“) trifft keine Stufe. Dann entsteht wieder ein `{new}` und ein möglicher Doppelort. Das ist die bewusste Strenge gegen Falschzusammenlegungen: Die Probe vor dem Umbau zeigte 4 von 5 Fehlzusammenlegungen bei einer „Enthält“-Regel. **Restrisiko, Beobachtungspunkt.**

**5. Ungewöhnliche Formulierungen, ähnliche Orte, fremde Umfänge?** Ähnliche Orte bleiben getrennt (Furt/Gildenhalle, Räucherei/Karren, Steinbruch/Weg, Stadt/Stadttor). Mehrdeutigkeit führt zur Rückfrage. Orte einer anderen Siedlung sind ausgeschlossen. Ungewöhnliche Paraphrasen werden absichtlich *nicht* aufgelöst; siehe 4.

**6. NPCs in Kinderorten wiedererkannt ohne falsche Anwesenheit?**
- **Ja.** `knownAt` nennt bis zu drei Personen bekannter Teilorte als „usually in …“; Anwesenheit entsteht nur durch einen gebuchten Eintritt (Regression Rogue #82).
- Die enge Namensregel `usualPersonNamed` (kürzerer Name, abwesend gemeldet, an genau diesem Ort oder einem Teilort, eindeutig) **weicht bewusst von Fachplan A §4.4 ab**. Sie ist nötig, weil Stufe 1 die Rogue-#80-Antwort erst anwendbar machte. Sie ist begrenzt und getestet, bleibt aber eine Heuristik. **Beobachtungspunkt.**

**7. Messbar verbessert / bleibt:** siehe §5.

### 1.2 A4

Die Nicht-Umsetzung ist **technisch begründet und bleibt notwendig.** Das `arrive`-Delta ist heute der einzige vom Text getrennte, ausdrückliche Ankunftsbeleg. Die Weltprüfung, die Szenenreihenfolge (`scene_context`) und die Chronologie hängen an seiner Sequenz. Ein einheitlicher `reached`-Schlüssel bräuchte drei Dinge:
- ein Zitat als Beleg;
- eine Positionsangabe;
- eine Zwei-Formen-Migration.

Alle drei sind nur im natürlichen Lauf prüfbar. Der doppelte Vertrag (`expected.arrived` plus `arrive`) bleibt damit tragbar. Seine schädlichste Nebenwirkung, dass ein unangefragter Schlüssel den ganzen Bericht ungültig macht, ist seit `.190` behoben (4 gesparte Extractor-Reparaturen im Korpus).

### 1.3 Sicherheitsinvarianten

Durch gezielte Tests belegt:
- `no_go` unverändert;
- `scene_context`-Kaskade unverändert (abgelehnte Szene bleibt abgelehnt);
- NPC-Wissen und `met` an den bestätigten Schritt gebunden;
- PULSE-Straßenhalt unverändert (`.181`-Suite grün);
- Gildenbedingungen unverändert (Run19-Suite).

Neu streng: Ein „Guild hall“ einer anderen Stadt, als „erreicht“ gemeldet, wird nicht angelegt.

---

## 2. Fachplan B – B5

| Prüffrage | Befund |
|---|---|
| 1. Kündigt die Engine einen Abschnitt an, den sie dann nicht erreichen lässt? | **Auf `.190` ja, in einer Form (G1, siehe §4).** Sonst nein: Die Preview wird beim Bericht einer Innenraum-Ankunft genau auf diese ID abgebildet, und Tor sowie Gebühr werden vor der Preview entschieden. **Restrisiko:** Meldet der Extractor die Ankunft in einer unpassenden Form (etwa als Stätte unter dem Reich), greift die Abbildung nicht; die Ankunft wird dann abgelehnt, nicht falsch gebucht. Beobachtungspunkt. |
| 2. Kann ein Boss unerreichbar werden? | Seine Position ist das Ende der Spur, die Spur ist endlich und wird nicht übersprungen. Er wird erst angekündigt, wenn die Diener der Ebene erledigt sind (`nextWaiting`). Ein stehen gelassener Diener blockiert ihn also, bis Alaric zurückgeht. Das ist so beabsichtigt, kein Fehler. In Altständen verlängert sich die Spur um die noch wartenden Begegnungen (natürliches `.150`, `fix150`). |
| 3. Verwaiste Abschnitte bei Abbruch, Fehlextraktion, Swipe? | **Nein**, belegt: gescheiterte Extraktion → kein Abschnitt, nächster GO → dieselbe Preview-ID (neue Probe); Swipe/Fold gleich (Patch 8 (8), B5-Preview-Test). |
| 4. Endlich, stabil, zyklenkonsistent? | Ja. Die Spurlänge folgt aus der Pace des ersten Zyklus (`trackPace`, deterministisch). Begegnungen jedes Zyklus liegen im selben Abschnitt. Erschlagene bleiben tot; Abschnitte bleiben gleich, ohne Umbenennung. |
| 5. Neues Problem bei Rückzug oder Ebenenwechsel? | **Ja, auf `.190`:** G1 (siehe §4). Behoben in `.191`. Rückweg: der Link, über den ein Abschnitt entstand; hinaus nur bei ausdrücklichem Verlassen. |
| 6. Was ist entfallen? | Für neue Züge in echten Living Dungeons: erzählte Räume, Gänge, Treppen und Ebenen, `explore`, die Ebene aus erzählter Richtung, die Vorprüfung. Außerhalb: die automatische Gebäudeumwandlung (`markEvents` 5 → 2 Aufrufstellen). |
| 7. Was bleibt nur für Bestand? | Der ganze Patch-7-Graph: `wayBetween`, Passagenzweig mit `levelVia`/`floorRefusal`, `throughGoal`, `unseen`, der `oldSteps`-Zweig, bereits markierte `rooms:true`-Gebäude. Er wird für Altstände und für Rückwege über Engine-Links gebraucht. |
| 8. Insgesamt sinnvoll? | **Ja.** Die Selbstwidersprüche aus `.186`/`.188` (Engine kündigt Queen an, Erzählung sagt Treppe, Graph macht Ebene 2, Engine lehnt ab) sind für neue Züge ausgeschlossen. Der Spielverlust (keine Schleifen, keine erzählten Geheimgänge) entspricht dem Beschluss. |

**Mehr Dungeonmechanik als B5 braucht?**
- **Ja.** Neben B5 leben der vollständige Raumgraph und die Ebenenableitung aus Richtungen weiter.
- Für neue Living-Dungeon-Züge würden Abschnitte plus ein Link je Abschnitt genügen.
- Der Rest wäre nur entfernbar mit einer Entscheidung, Altstände in Dungeons nicht mehr fortzuführen, und dem Umbau von rund 38 Testdateien.
- Empfehlung: nach einem natürlichen Lauf entscheiden, nicht jetzt.

---

## 3. Fachplan C

| Prüffrage | Befund |
|---|---|
| 1. Erkennt der Planner gewählte Reisen zuverlässiger? | **Unbelegt.** Regeln 7d/7e sind reiner Vertragstext. Nur ein natürlicher Lauf zeigt die Wirkung. |
| 2. Rückweg-Wortlisten ersetzt? | Ja. `retreatGo` hatte 3 Aufrufstellen, jetzt 0; `BACK_WAY`/`STAYS` sind entfernt. |
| 3. Neue Fehler oder unnötige Reparaturen? | Im Korpus 0 ausgelöste Reparaturen. Kosten bei Auslösung: ein zusätzlicher Planner-Aufruf (~12k Prompt-Tokens), höchstens zwei Planner-Aufrufe. Nachteil: Antwortet die Reparatur ungeeignet, bleibt der Schritt Fiktion. Beobachtungspunkt. |
| 4. Fragen und Vorschläge bleiben ohne Bewegung? | Planner-Regel 1 und 7d. Engine-seitig gesichert über `no_go` und den Bewegungsnachweis: Eine Ankunft ohne Schritt bleibt abgelehnt (Pilot T61). |
| 5. Kann der Erzähler noch ungewollte Ortswechsel durchsetzen? | Buchen nicht, beschreiben ja. Zwei Lücken: (a) Auf `.190` galt bei bekanntem Ziel jeder Ort als „Halt kurz davor“, auch eine fremde Stadt (R5, behoben). (b) Bei einem `{new}`-Ziel darf die Erzählung den neuen Ort wählen, und ein bekannter Ort mit anderen Worten gilt als belegt. Ohne Ortsidentität lässt sich das nicht prüfen. Bewusstes Restrisiko. |
| 6. Verhindern N1/N4 die Mehrzug-Drift? | Wahrscheinlich ja, weil sie an der Wurzel ansetzen: Ortskopf am Blockanfang, Markierung der falschen Szene im Verlauf. **Hypothese.** Belegt ist nur, dass beides im echten ST-Request ankommt (Smoke). |
| 7. Sieht der menschliche Spieler die Ortsinformation? | Ja. `NOT ARRIVED — …` ist in der ST-Chatansicht sichtbar, `ENGINE REFUSED` bleibt verborgen (ST-Smoke `n2NotArrivedVisibleInST`). |
| 8. Habitatintegrität mit `within`? | Ja. `allowedArrival` hält eine Erkundung im Habitat und seinen Teilen; ein Ort daneben wird abgelehnt (Regression). |
| 9. D3 sicher genug, oder lieber ausdrückliches GO? | **Ausdrückliches GO ist die einfachere und sichere Lösung.** G3 zeigt, dass „Rast gebucht plus Zimmer gehalten“ nicht ausdrückt, dass er dorthin geht. Die Engine-Ausnahme ist in `.191` zurückgenommen, der Planner führt „ich gehe in mein Zimmer und schlafe“ als GO (7e). D3 bleibt damit inhaltlich erfüllt: Bewegung nur bei ausdrücklicher Handlung. |

---

## 4. GPT-Grenzfälle und eigener Befund

Alle Fälle zuerst am unveränderten `.190` reproduziert (`tests/v4/review190_negative.test.js`), dann korrigiert.

| Fall | Urteil | Probe auf `.190` | Korrektur `.191` |
|---|---|---|---|
| **G1** | **bestätigt, breiter** | Am letzten Abschnitt mit offener Ebene darunter: `on` → Preview Ebene 2. Ebenso „deeper“ und jedes andere Wort; „down“ ging nur zufällig durch denselben Zweig. „up“ auf `l2_s2` → Abschnitt 3. „step out into the next hall“ → Tor. | Am Ende hinab nur bei „down“ oder Treppen-/Ebenenwort, sonst `CLARIFY`. „up“ ohne Weg → `CLARIFY`. Hinaus nur bei ausdrücklichem Verlassen. Siegel unverändert (Regression grün). |
| **G2** | **bestätigt** | Flur → Kammer über verschlossene Tür. Kammer → offene Luke zum versperrten Lagerraum. Ein GO zur Kammer gelang. | Hat das Ziel einen versperrten Weg, zählt nur ein offener Pfad vom Standort aus (`openWay`). Ein echter offener Umweg geht weiterhin (Regression). |
| **G3** | **bestätigt** | „I rest at the downstairs table; I stay here“, Zimmer gehalten, Erzählung „up to his room“ → gebucht. | Zimmerausnahme für Ruleset 2 zurückgenommen. Zimmer nur per GO; „I go upstairs to my paid room and sleep“ als GO plus Schlaf funktioniert. Zahlen oder Brot bewegen nicht. |
| **G3b** | **präzisiert** | Verschlossenes Hinterzimmer in einem Stadtgebäude: Ein GO ging hinein. Ursache: Stadtgebäude verwerfen erzählte Wege schon seit `.189`, der Riegel ist nur ein Hindernis im Raum. Kein `.190`-Rückschritt. | Ohne aufgezeichnete Wege zum Ziel sperrt ein Hindernis hier, dessen Kernwörter das Ziel nennen. |
| **G4** | **bestätigt, präzisiert** | Ein als falsch erwiesener Ortsbericht galt als bekannt, als gültige Referenz und für die Namensauflösung. Im *beworbenen* Katalog stand er schon vor `.190`, mit dem Vermerk „proved false“. | `knownPlace` schließt `known:'false'` aus; GO dorthin abgelehnt. Der Vermerk im beworbenen Katalog bleibt als Gesprächsinformation. Verborgene Räume waren schon ausgeschlossen (Stufe-1-Test). |
| **R5** (eigener Befund) | **bestätigt** | GO zur Gildenhalle Ashbridge, Erzählung „he ends up somewhere else“ (`arrived:false`) in Glassmere → gebucht. | Ein Halt vor einem bekannten Ziel muss in Alarics Stadt, der Stadt des Ziels oder offen in deren Reich liegen. Ein Halt in der eigenen Stadt bleibt erlaubt (.181 P2-2). |

**Nicht als Fehler gewertet:** Der beworbene Katalog zeigt widerlegte Orte mit Vermerk. Ein vorgesehener Boss kann von nicht erledigten Dienern blockiert werden.

---

## 5. Gesamtbewertung der Umbauziele

### A – Zuverlässigkeit

**Strukturell geschlossen** (für neue Züge auf Ruleset 2):
1. Dungeon-Selbstwiderspruch zwischen Spur, Graph und Vertrag. Es gibt nur noch eine Quelle für Teile und Ebenen, die erzählte Treppe ist keine Ebene mehr.
2. Verwaiste Räume und Orte bei abgelehnter Ankunft. Natürliche Fenster: 1 → 0; Korpus 0.
3. „Jede Ankunft gilt, sobald irgendein GO existiert“: ein anderer Ort derselben Stadt als „erreicht“, ein Raum eines fremden Dungeons, eine Stadt als Halt.
4. Rückweg aus Wortlisten.
5. Unsichtbare Nichtankunft für den Spieler.
6. Bericht durch unangefragten Schlüssel zerstört.
7. Automatische Gebäudeumwandlung.

**Nur noch in Randfällen:**
- Doppelte Orte durch abweichende Paraphrasen.
- Die Ortswahl der Erzählung bei `{new}`-Zielen.
- Personen-Doppelungen jenseits der engen Kurznamenregel.
- Extractor-Formabweichungen beim Abschnittsbericht.

**Könnte in neuer Form wiederkommen:** Erzähldrift über mehrere Züge. N1 und N4 sind Modellhinweise; ob das Modell ihnen folgt, ist offen.

**Getrennt erzählter und tatsächlicher Standort:** deutlich zuverlässiger. Der Engine-Standort ist eindeutig bestimmt, die Abweichung wird dem Spieler (N2) und dem Erzähler (N1/N4) gezeigt.

**Grenze der Offline-Belege:** Die Replays lesen jede Antwort auf ihrem *originalen* Vorzustand. Antworten auf vor `.190` geplante Züge laufen deshalb über den Legacy-Zweig. Die natürlichen Ortskennzahlen (14 primäre + 63 Kaskade) bleiben dadurch zwangsläufig gleich. Die neue Architektur ist nur durch gezielte Tests und Smokes belegt.

### B – Technische Vereinfachung

| | `.189` | `.191` |
|---|---|---|
| Gültige Ortsmengen | 3 | 1 (`valid_places`) |
| Ableitungen „wohin darf die Ankunft“ | implizit Firewall + `elsewhere` + `scopedPlaces` ×2 + Vorprüfung | 1 (`allowedArrival` über gespeicherten Schritt) |
| Quellen für Dungeonteile und -ebenen (neue Züge) | Erzählung + Spur + Graph + Vertragsregel | 1 (`sections.js`), Graph nur für Rückweg-Links |
| Rückweg-Interpretation | Engine-Wortlisten | Planner-Reparatur |
| Name → Ort | 6 Auflöser | 6 Auflöser + `resolvePlaceRef` (**nicht vereinfacht**) |
| Altpfad-Zweige in `world.js` | 9 `!explicitTravel` | 11 + 4 `oldSteps` (**gewachsen**) |
| Neue Module | – | `place_book.js` 139, `movement.js` 140, `sections.js` 151 Zeilen |
| Produktcode netto | – | **+717 Zeilen**: `world.js` +156, `commands.js` +87, `planner.js` −28, `place_refs.js` −30 |

**Gesamturteil zur Vereinfachung:**
- Weniger *widersprüchliche* Zuständigkeiten an den zwei Stellen, an denen die meisten Fehlerepisoden entstanden: Ankunft und Dungeon. Das ist konkret an den Funktionen oben belegt.
- Mehr Code und mehr Altpfade.
- Die Namensauflösung ist nicht vereinfacht.
- Neue und alte Logik laufen parallel: im Legacy-Zweig für alte Antworten, im Raumgraph für Altstände und in der Seal/Gate-Mehrfachprüfung (redundant, aber konsistent).

### C – Performance

- **Nachgewiesen:**
  - Engine-Rechenzeit unverändert (Replay 2235 Fälle: `.189` 96–100 s, `.190` 95–103 s).
  - Planner-Prompt +1,1k Zeichen (≈ +280 Tokens, etwa 2–3 % eines Planner-Aufrufs).
  - Extractor-Vertrag +0,24k Zeichen.
  - N1: 2–3 Zeilen pro Erzähleraufruf.
  - N4: etwa 200 Zeichen pro Antwort mit abgelehnter Ankunft im Verlauf.
  - `valid_places` kostet 0 Tokens.
  - Extractor-Reparaturen im Korpus −4 (unangefragte Schlüssel).
- **Hypothesen:**
  - weniger Ortsdrift-Episoden, also weniger Folgereparaturen und kürzere Spielerkorrekturen;
  - gelegentliche Planner-Reparatur bei wirkungslosem Schritt (+1 Aufruf).
- **Fazit:** zuverlässiger angelegt, **nicht schneller**. Der Promptumfang wächst leicht.

### D – Spielgefühl

Die akzeptierten Einschränkungen sind spürbar, aber begrenzt:
- **Lineare Dungeons:** Erzählte Gabelungen sind nur Kulisse.
- **Ebenenwechsel:** Er muss am Ebenenende ausdrücklich gesagt werden (`.191`: sonst kommt eine Rückfrage). Das ist der kleinste sinnvolle Formularpunkt.
- **Zimmer:** Per GO statt implizit; das übernimmt der Planner, der Spieler schreibt weiter frei.
- **Halte unterwegs:** Mehr Ablehnungen bei Erzählung, die vom Weg abweicht.

Die Rückfragen (`CLARIFY`) bleiben selten und beschränken sich auf echte Mehrdeutigkeit: zwei gleichnamige Orte, Ebenenende, „up“ ohne Weg. Kein Formularspiel, sofern der Planner 7d/7e im natürlichen Lauf befolgt.

### E – Wartbarkeit

Künftige Ortsprobleme lassen sich an weniger Stellen beheben:
- Ankunftserlaubnis: `movement.js allowedArrival`;
- Dungeonbewegung: `sections.js sectionStep`/`sectionArrival`;
- Bekanntheit: `place_book.js knownPlace`.

Die Namensauflösung bleibt über sechs Funktionen verteilt. Das ist der nächste sinnvolle Konsolidierungsschritt, nach dem natürlichen Lauf und an dessen Fehlern gemessen. Die Altpfade sind die größte Wartungslast. Ihr Entfernen braucht eine ausdrückliche Bestandsentscheidung.

---

## 6. Regressionsbelege und Abnahme `.191`

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `tests/v4/review190_negative.test.js`: G1 (3), G2, G3, G3b, G4, R5 und eine Architekturprobe (Fehlextraktion → kein Abschnitt, gleiche Preview-ID) |
| Angepasst | `delve` mit eigenen GO-Worten; D3-Test der Stufe 4 |
| `npm test` | **3232/3232** |
| Voller Replay (2235 Fälle) | 1092 Abweichungen gegen `.126`, alle mit Fingerprint; durch `.191` genau 1 Änderung (`b18-rogue#90` wieder `no_go` wie `.189`, begründet); 0 offen |
| Natürliche `.186`/`.188`-Fenster | unverändert gegenüber `.190`; 0 verwaiste Orte |
| Save/Reload, Swipe, Fold | durch Patch-8-Swipe/Fold, B5-Preview-Swipe, die Stufe-1-Tests und die Probe |
| Isolierter ST1.19-Smoke | Standard **225/225**, Failsoft **230/230**, 0 PageErrors |

---

## 7. Abschließende Antworten

1. **War der Umbau technisch richtig?** Ja. Die zwei Ursachen der meisten Episoden (die Ankunftsautorität und die von der Erzählung gebaute Dungeontopologie) sind durch eine Quelle ersetzt. Das war mit Hotfixes nicht zu erreichen.
2. **Grundsätzlich reduziert oder nur neue Mechanik?** Für Ankunft und Dungeon grundsätzlich reduziert. Für die Namensidentität eher neue Mechanik neben alter. Für die Erzähldrift neue Hinweise, deren Wirkung noch unbelegt ist.
3. **Einfacher trotz mehr Code?** Fachlich ja, an den entscheidenden Stellen messbar (siehe Tabelle §5B). Als Codebasis nein: +717 Zeilen, mehr Altzweige, Namensauflösung unverändert verteilt.
4. **Ist B5 die richtige Dungeonlösung?** Ja. Das Modell ist endlich, stabil über Zyklen und verwaist nicht. Die Lücken, die der Review fand (G1), waren eng und sind korrigiert.
5. **Wirklich geschlossen:** siehe §5A, die sieben Punkte.
6. **Restrisiken:**
   - Paraphrasen-Doppelorte;
   - Ortswahl bei `{new}`;
   - Extractor-Form beim Abschnittsbericht;
   - Befolgung von 7d/7e und N1/N4;
   - Kurznamen-Personenregel;
   - die Last der Altpfade.
7. **Notwendige kleinere Korrekturen:** G1, G2, G3 (Rücknahme), G3b, G4, R5. Alle in `.191`, jede mit Rot/Grün-Regression.
8. **Kann der natürliche Test beginnen?** Ja, auf `.191`.

### Einstufung: **GO mit Beobachtungspunkten**

Beobachtungspunkte für den natürlichen Lauf:
- **Mossback bis Ebene 2:** Rückfrage am Ebenenende, ausdrücklicher Abstieg, Rückweg.
- **Glimmerdeep bis zur Queen:** Abschnittsnamen; Ankunftsform des Extractors.
- **Tannery-Rows-Rückkehr mit freier Paraphrase:** Doppelort?
- **Eine reale Nichtankunft:** sichtbare N2-Zeile; Folgt der Erzähler N1/N4 im nächsten Zug?
- **Ein Zimmer- oder Rastzug:** Bildet der Planner 7e ab?
- **Zahl der Planner-Reparaturen und der Rückfragen:** Schreibt der Spieler Formulare?
- **Erste reale Werte:** Tokens und Latenz je Zug.
