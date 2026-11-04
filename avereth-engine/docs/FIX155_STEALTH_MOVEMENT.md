# .155 – Schleichende Bewegung mit Stealth am erreichten Ort

04.11.2026. Basis .154 / `2482da2cbbd13c0172edc1e9de33deafc838b9ba`.
Gezielter Nutzerauftrag aus dem persönlichen SillyTavern-Test; kein PULSE-, Main/Minor- oder Wahrnehmungsredesign.

## Original und bestätigte Ursache

Originale: `Avereth Engine Test v4 - 2026-11-04@11h00m47s856ms (1)(1).jsonl`
und zugehöriger `avereth-events-…json`. Beide Exporte stimmen in allen 20 Eventrecords / 134 Events überein.
SHA-256 Chat: `06705e7b00b0d9bdd81132c1547e37f54dca640053d4984bee01774d748a120e`;
Events: `5c1caf36e92deaf301b48b3ac5c1fc9e78d4c51fb7181938598e7ad84ed59181`.

T11 / Chatindex I21 (ohne JSONL-Metadaten):
`*i crouch down and start sneaking deeper going through doorway straight ahead*`.
Der Originalplanner liefert korrekt `stealth` seq1 und GO seq2 mit `needs:1` zum bereits bekannten
`loc.mossback_warrens.hide_curtained_doorway_chamber`. `mapPlan()` routet wegen Stealth nach V3,
verwirft GO als zweite Aktionsart und prüft nur den leeren Ausgangsraum. Ergebnis: automatischer
Erfolg ohne Ankunft. Das ist kein unverständlicher Spielerinput und kein fehlender Dungeonweg.

`state.js:scene.moved/reset_present` löscht Concealment absichtlich. Einfaches Übernehmen des alten
Erfolgs oder Aufteilen in „hide → enter“ würde die Beobachter am Ziel weiterhin nicht prüfen.

## Fachliche Korrektur

- `planner.js:mapPlan`: außerhalb von Combat ein Stealth-Kommando und ein zugehöriges GO als eine
  schleichende Reise behandeln. Zusammenhang über das bestehende `go.needs → stealth.seq` oder
  dasselbe vollständige Handlungszitat in beiden Kommandos; kein englischer Formulierungsfilter.
  Die Planneranweisung erklärt diese Bindung. Das interne `sneak`-Kennzeichen ist kein neues
  Modell-/Schemaschlüsselwort. Unabhängiges späteres Verstecken, mehrere Ziele und zusätzliche
  Hauptaktionen werden nicht pauschal zusammengeführt. Andere GO-Abhängigkeiten werden erhalten.
- `commands.js:go`: nur nach bestandenen bisherigen Weg-/Dungeon-/Gateprüfungen die schleichende
  Vorgehensweise in der bestehenden GO-Autorisierung merken. Der Narrator bekommt „Detection pending“:
  tatsächliche Ankunft/Personen beschreiben, keinen automatischen Erfolg oder Angriff vorwegnehmen.
- `world.js:applyWorld`: tatsächliche freiwillige Ankunft merken. Erst nach Verarbeitung der lokalen
  Belegung **einschließlich der Living-Dungeon-Slotnachholung** und vor abschließender Wahrnehmung
  sowie Kampföffnung die vorhandene `checks.js:stealthEvents()` ausführen. Gleiche AGI-/Detection-
  Formel, ein Wurf gegen den besten Beobachter; im leeren Raum automatisch ohne Detection-Wurf.
  Kein Check ohne erreichten Ort, bei blockiertem Weg oder für erzwungene Verlagerung.
- Automatisches erstes Sehen des PC wird während der offenen Ankunftsprobe zurückgestellt.
  Anschließend gilt das Engineergebnis auch gegenüber einer gegenteiligen `aware`-Meldung für die
  automatische Wahrnehmung. Erfolg macht zuvor Aware nicht zu Unaware: bestehend Suspicious,
  damit kein unverdienter Ambush. Ein Widerspruch der Erzählung kann keinen noch unbemerkten
  Angreifer gegen den erfolgreichen Check in Combat ziehen; solche Pending-Commitments werden
  vor `openCommitted()` entfernt. Fehlschlag allein erzeugt weder Angriff noch Kampf.
- Ergebnis über vorhandenes `check.recorded` mit Ort/Zug/GO-Schritt persistieren; `display.js`
  zeigt die vorhandene Checkanzeige. RNG und Zustände werden gefaltet, nicht beim Reload neu gewürfelt.
  Die nächste normale Bewegung setzt Sichtbarkeit weiterhin zurück. Kein dauerhafter Sneak-Modus.

Keine Änderung an `state.js`, Stealthformel, Ambushschaden, taktischer Combatbewegung, Tür-/Gate-
oder Bevölkerungsregeln. Keine neue Eventart, Zustandsmaschine oder zusätzliche Modellanfrage.
Planner-/Extraktorschema und persönliche Erzählerkarte bleiben unverändert; das Modell muss weiterhin
die Bedeutung in die vorhandenen Kommandos übersetzen. Die vier englischen Beispielvarianten werden
als strukturierte Pläne geprüft, nicht als behaupteter neuer natürlicher GLM-Test.

## Regressionen und technische Abnahme

19 neue Tests in `tests/v4/fix155_sneak_movement.test.js`, Fixture
`tests/v4/fixtures/manual154_stealth.json.gz` mit unverändertem Originalprefix, Originalplan,
Spielertext und früherer Antwort. Neue Ankunftsantworten sind ausdrücklich kontrollierte Gegenproben;
die alte Antwort wird nicht nachträglich als tatsächlicher erfolgreicher Eintritt ausgegeben.

- Auf unverändertem .154 in separatem Worktree: **16 rot, 3 grüne Kontrollen**.
- Auf .155: **19/19**; mit angrenzenden Planner-/Checks-/Dungeon-Tests **62/62**.
- Vollständiges `npm test`: **2742/2742**.
- `npm run replay:check`: **2235 Fälle, unverändert 479 exakt akzeptierte Baselineabweichungen,
  0 neue/offene/veraltete Einträge**, keine Fingerprintänderung. Insbesondere wird ein historisches
  unverbundenes GO mit späterem Hide nicht als schleichende Bewegung umgedeutet.
- Echter isolierter **SillyTavern-1.19-Smoke** mit Mockprovider: Standard **49/49**, Failsoft **54/54**,
  jeweils **0 PageErrors**. **51/57 Modellaufrufe**, davon **20/22 Extraktionen**, einschließlich der
  zusätzlich aktivierten bisherigen Finanz-/Save-/Fetch-Prüfungen und sieben neuer Stealthprüfungen.
  Die Originaleingabe mit Originalplan und unverändertem Chatprefix durchläuft tatsächlich
  Planner → Narrator → Extractor genau einmal; der erreichte Dungeonraum erhält erst seine Gegner,
  dann die Probe. Speicherung mit vollständigem Readback, UI-Swipe, Reload und anschließender
  normaler Spielzug sind grün. Die Modellantworten sind kontrolliert; kein natürlicher GLM-Nachweis.

Reproduktion der erweiterten Hostabnahme: `AVERETH_SMOKE_STEALTH=1`,
`AVERETH_SMOKE_FINANCE=1`, `AVERETH_SMOKE_SAVE_RECOVERY=1`, `AVERETH_SMOKE_FETCH=1`
bei `npm run smoke:st:c`, Failsoft zusätzlich `AVERETH_SMOKE_FAILSOFT=1`.
`AVERETH_ST_DIR` und bei Bedarf `PLAYWRIGHT_BROWSERS_PATH` zeigen auf die isolierte Installation.
Ein früher Entwicklungslauf hatte 48/49: Der neue Mock ließ den bereits erforderlichen
GO-`expected`-Eintrag weg und erzeugte einen unnötigen Repair. Das wurde im Mock ergänzt;
keine Produktvalidierung oder Abnahmeprüfung wurde dafür gelockert.

Abgedeckt: Original-Hostpfad und Slotmaterialisierung; leerer Raum; mehrere Beobachter mit
Erfolg/Misserfolg und gemischtem Awareness; echte/ungerechtfertigte Ambushes; keine automatische
NPC-Erstbegegnung vor Erfolg sowie Wahrnehmung nach Fehlschlag; gesperrte/verborgene Wege,
unbekanntes Ziel und Guild-Gate; erzwungene Bewegung; nicht bestätigte Ankunft; normales Hide/GO;
Combat-Aktionsschutz; unabhängige Aktionen; Eventfold, JSON-Reload, echte Reply-/Input-Edit-
Hostfunktionen und Swipefassung ohne zusätzlichen Plannerturn oder wiederholten RNG-Verbrauch.

Geänderte Produktdateien: `src/v4/planner.js`, `src/v4/commands.js`, `src/v4/world.js`,
`src/display.js`; Buildnummern in `src/util.js`, `package.json`, `manifest.json`.
Dazu die genannte Testdatei/Fixture, optionaler Hosttest `tools/st_live/stealth_smoke.mjs`,
dessen Anschluss in `tools/st_live/run_c.mjs` und diese Patchnote. Keine Runnerstrategie geändert.

## Grenzen

Die Engine bucht den Ankunftscheck nach der Extraktion, wenn die tatsächlichen Beobachter feststehen.
Die erste Prosa muss daher den Ausgang offenlassen; das sichtbare Systemergebnis und der nächste
Modellkontext sind verbindlich. Kein zusätzlicher Narratorcall, der den Text nachträglich umschreibt.
Fehlerhafte Extraktion bestätigt weiterhin keine Ankunft. Keine Garantie, dass ein natürliches Modell
immer den richtigen GO/Stealth-Zusammenhang liefert; der Originalplan selbst funktioniert nun.
Unabhängige mehrteilige Aktionen und mehrere Reiseziele sind nicht Teil dieser Zusammenführung.
Bestehende Aufzeichnungen werden nicht rückwirkend umgeschrieben. Keine allgemeine Schall-/Sicht-
Simulation, keine neuen Schlaf-/Rüstungsmodifikatoren und kein neuer dauerhafter Stealth-Schalter.
