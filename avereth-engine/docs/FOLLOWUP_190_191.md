# Build 4.3.0-c.6.6.191 – Korrekturen aus dem Gesamt-Kontrollreview von `.190`

**Basis:** `.190` (`9635f72`, Patchnote [BUILD_190_LOCATION.md](BUILD_190_LOCATION.md)).

**Anlass:**
- der [GPT-Kontrollreview von `.190`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_BUILD190_ARCHITEKTUR_PRODUKTDIFF_GPT.md) mit den Grenzfällen G1–G4;
- der Opus-Gesamtreview `patch_plans_10b/REVIEW_BUILD190_GESAMTARCHITEKTUR_OPUS.md` auf `main`.

Alle Fälle wurden zuerst am unveränderten `.190` reproduziert (`tests/v4/review190_negative.test.js`) und nur dort korrigiert, wo sie sich bestätigten.

| Fall | Befund auf `.190` | Korrektur |
|---|---|---|
| **G1** Ende einer Dungeonebene | **bestätigt und weiter als gemeldet:** Am letzten Abschnitt führten „on“, „deeper“ und jedes andere Wort hinab zur nächsten Ebene; „down“ ging nur zufällig durch denselben Zweig. „up“ außerhalb des ersten Abschnitts einer tieferen Ebene führte vorwärts. Jedes „out“ („step out into the next hall“) führte zum Tor. | `sectionStep`: Am Ende hinab nur bei „down“ oder Treppen-/Ebenenwort, sonst `CLARIFY` (nichts gebucht). „up“ ohne Weg hinauf → `CLARIFY`. Hinaus nur bei „Dungeon verlassen“, „zum Tor/zur Oberfläche“ oder „out of <Dungeonname>“. Siegel unverändert. |
| **G2** Gebäudeblocker | **bestätigt:** Ein offener Weg vom unerreichbaren Lagerraum ins Ziel hob die verschlossene Tür vom Flur aus auf. | `wayRefused` (Gebäude außerhalb von Dungeons): Hat das Ziel einen versperrten Weg, gilt nur ein offener Weg von Alarics Standort aus über bekannte Wege (`openWay`). Ohne versperrten Weg weiter keine Wegprüfung (D1b). |
| **G3** D3-Spielerhoheit | **bestätigt:** „I rest downstairs; I stay here“ bei gehaltenem Zimmer – die Erzählung brachte ihn ins Zimmer. | Die stillschweigende Zimmerausnahme für Ruleset 2 ist **zurückgenommen** (konservativer Verzicht: die Engine kann „ich bleibe hier“ nicht ohne Wortliste erkennen). Ins Zimmer zu gehen ist sein GO; Plannerregel 7e. Ruleset 1 unverändert. |
| **G3b** verschlossenes Hinterzimmer im Stadtgebäude | **präzisiert, kein `.190`-Rückschritt:** Wege in Stadtgebäuden verwarf schon `.189`; der Riegel war nur ein Hindernis im Raum, und kein GO prüfte ihn. | GO-Handler außerhalb von Dungeons: Ein aktives Hindernis hier, dessen Kernwörter den Zielort nennen („locked office door“ → Back office), sperrt, solange keine aufgezeichneten Wege zum Ziel bestehen (dann entscheidet die Wegprüfung). |
| **G4** widerlegter Ortsbericht | **bestätigt:** Ein als falsch erwiesener Ort galt im Ortsbuch als bekannt (gültige Referenz, Namensauflösung). | `knownPlace` schließt `known: 'false'` aus. Ein GO dorthin wird mit „the report … proved false“ abgelehnt. Im beworbenen Katalog bleibt er wie in `.189` mit seinem Vermerk als Gesprächsinformation. |
| **R5** (eigener Befund) | **bestätigt:** Für ein bekanntes Ziel galt jeder Ort als „Halt kurz davor“ (`arrived:false`), auch eine andere Stadt. GO zur Gildenhalle Ashbridge → gebucht in Glassmere. | Ein Halt vor einem bekannten Ziel muss auf dem Weg liegen: in Alarics Stadt oder der Stadt des Ziels, sonst offen in deren Reich. |

**Tests:**
- `review190_negative.test.js`: 9 Fälle mit positiven und negativen Proben, dazu eine Architekturprobe (gescheiterte Extraktion → kein Abschnitt, gleiche Preview-ID beim nächsten GO).
- Angepasst:
  - `delve` erhält eigene GO-Worte (ein Abstieg wird ausdrücklich „down“ gesagt);
  - der D3-Test der Stufe 4 entspricht der Rücknahme.

**Replay** (2235 Fälle):
- Genau ein Datensatz ändert sich: `b18-rogue#90`. Ohne GO ist die Zimmerankunft wieder `no_go` wie in `.189`; begründet und gefingerprintet (`review190 …`).
- Die natürlichen Fenster sind unverändert.

**Abnahme `.191`:**
- `npm test` **3232/3232**.
- Voller Replay: 2235 Fälle, 1092 Abweichungen gegen `.126`, alle gefingerprintet, 0 offen. R5 ändert keinen Korpusfall.
- Natürliche Fenster unverändert.
- Isolierter ST1.19-Smoke: Standard **225/225**, Failsoft **230/230**, je 0 PageErrors.
- Kein natürlicher Lauf.
