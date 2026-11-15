# Build 4.3.0-c.6.6.190 – Orte, Reisen und Dungeon-Erkundung (Architekturumbau)

**Basis:** `.189` (`4438241`). **Technische Einzelheiten je Stufe:** [LOCATION_ARCHITECTURE_190.md](LOCATION_ARCHITECTURE_190.md).
**Grundlage:**
- die Grundanalyse und die Fachpläne A/B/C auf `main`;
- die beiden GPT-Gegenreviews mit ihren bindenden Sicherheitsbedingungen;
- die Entscheidungen D1–D6 vom 14.11.2026.

## Was sich im Spiel ändert

| Bereich | Neu in `.190` |
|---|---|
| Bekannte Orte | Ein Ort, den Alaric kennt, gilt als gültige Referenz, auch wenn der Katalog ihn nicht bewirbt. Andere Worte für ihn führen zu ihm („the tannery rows“ → die bekannten Tannery Rows, „the Grotto mouth“ → das Tor von Glimmerdeep). Zwei Kandidaten führen zu einer Rückfrage statt zu einem dritten Ort. Ähnliche Namen bleiben getrennt (Furt/Gildenhalle, Räucherei/Karren dahinter, Steinbruch/Weg dorthin). |
| Personen bekannter Orte | Der GO-Eintrag nennt auch die bekannten Personen der Teile eines Ziels („usually in rendering shed“), ohne dass sie damit anwesend wären. Meister Ostrek bleibt eine Person. |
| Abgelehnte Ankunft | Der Spieler sieht im Panel: `NOT ARRIVED — Alaric remains at X; Y was not reached.` |
| Ankunftsprüfung | Eine Ankunft ist nur dort zulässig, wohin der GO-Schritt führt: Ziel, Halt auf dem Weg, ein Halt kurz vor dem Ziel oder bei einem neuen Ziel der eine neue Ort. Ein anderer Ort derselben Stadt gilt nicht als erreicht. Ein GO „zum Eingang“ endet am Tor; das Hineingehen ist der nächste Schritt. Eine lokale Jagderkundung bleibt im Habitat. Ein gemeldeter Ort wird erst angelegt, wenn die Ankunft zulässig ist, verwaiste Räume entstehen nicht mehr. |
| Rückweg in einer Nachricht | „… then return to the inn“ ist ein eigener Schritt (`RETURNS`). |
| Living Dungeons (B5) | Jede Ebene ist eine feste, endliche Folge von Abschnitten der Engine. Der GO kündigt den nächsten Abschnitt an; angelegt wird er erst mit der bestätigten Ankunft, benannt von deren Bericht, und er bleibt derselbe bei Wiederbesuch, Swipe und Reload. Begegnungen liegen in jedem Zyklus im selben Abschnitt. Der Weg hinab liegt am Ende der Ebene, hinter dem Siegel, falls es eines gibt. Hinter der Spur kommt nichts mehr. Ein Gefälle ist ein Weg weiter, keine neue Ebene. Räume, Gänge, Treppen und Ebenen aus der Erzählung werden abgelehnt. EXITS zeigen „on“, „down“ oder „nothing further“. |
| Gebäude außerhalb echter Dungeons (D1b) | Gebäude werden nicht mehr automatisch in Raumgraphen umgewandelt. Räume bleiben Räume, ein versperrter Weg hält ihn weiter draußen, ein unbekannter Weg ist kein Ablehnungsgrund. |
| Teilbewegung ohne GO (D3) | Ohne GO kommt Alaric nur in das Zimmer, das er dort hat, und nur wenn er in diesem Zug dort schläft oder ruht. Bezahlen allein bewegt ihn nicht. Brot kaufen öffnet kein Hinterzimmer, ein privates Büro bleibt zu. |
| Rückzug ohne Kampf | Die Engine liest keinen Rückweg mehr aus Wortlisten. Ein wirkungsloser Schritt oder eine Flucht ohne Kampf löst genau eine begrenzte Planner-Reparatur aus. |
| Planner-Vertrag | Regel 7d: Aufbruch jetzt, gemeinsames Losgehen, eine Tat an einem anderen genannten Ort und „ich folge ihr zur Halle“ sind `go`. Fragen, Vorschläge, „whenever“ und die Zustimmung einer NPC bewegen niemanden (D2). |
| Erzähler | Am Kopf des Engineblocks stehen `WHERE` (mit den nicht erreichten Orten der letzten Antwort), `TRAVEL THIS TURN` und `NOT HERE` (Personen, von denen er spricht, die woanders sind). Im Modellverlauf trägt eine Antwort mit abgelehnter Ankunft eine Engine-Zeile, nur in der Promptkopie (N4). |
| Extractor | Ein `expected`-Schlüssel, nach dem niemand gefragt hat, macht den Bericht nicht mehr ungültig und bewegt niemanden. |

**Bewusst nicht umgesetzt:**
- **A4** (eine Ankunftsantwort je Schritt): nicht gleich sicher prüfbar, Hindernisse sind dokumentiert.
- **Automatische Neuerzeugung** (D5): entfällt.
- **Ankunft vor der Erzählung** (D6): entfällt.
- **`within`:** bleibt; die Habitatintegrität prüft jetzt der Bewegungsnachweis.

**Bestehende Kampagnen:**
- Es werden keine Events umgeschrieben.
- Eine Antwort auf einen vor `.190` geplanten Schritt behält die damaligen Dungeonregeln.
- Von der Erzählung angelegte Räume älterer Spielstände bleiben erhalten und zählen als erste Abschnitte.
- Bereits markierte Gebäude behalten ihre Wege.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| `npm test` | 3223/3223 |
| Replay, alle 2235 Fälle gegen `.126` | 1092 abweichend, alle einzeln begründet und mit Fingerprint; 0 offen, 0 veraltet |
| Pflichtregressionen am Original | `.188` Rogue #80/#82: bestehende Tannery Rows, kein Duplikat, Ostrek eine Person. `.186` Mage: Tor erkannt, Innenraum getrennt. Ähnliche Namen getrennt. Verborgene Räume verborgen. Mehrdeutigkeit → Rückfrage. NOT ARRIVED sichtbar. |
| Dungeon | Glimmerdeep mit einer Ebene, `.188` Queen in ihrem Abschnitt, Mossback mit zwei Ebenen, Catacombs-Siegel, Rückweg/Wiederbesuch/Reset, Erschlagene bleiben tot, andere Abenteurer, Swipe/Fold, Migration älterer Spielstände |
| Laufzeit (Replay 2235 Fälle) | `.189` 96–100 s, `.190` 95–103 s (im Rauschen) |
| ST-Smoke isoliert (ST 1.19.0, Mock-Provider) | Standard **225/225**, Failsoft **230/230**, je 0 PageErrors. Neu im echten Hostpfad geprüft: `NOT ARRIVED` in ST sichtbar (ohne `ENGINE REFUSED`); der nächste Erzählerblock beginnt mit `WHERE … not reached` und trägt die N4-Zeile; die Fahrt aus Pilot T61 wird nicht gebucht (D2) |

**Gemessen offline** (`tools/location_report.mjs`, gleiche Modellantworten):

| | `.189` | `.190` |
|---|---|---|
| Korpus b16–b19: abgelehnte Deltas | 552 | 547 |
| Korpus: primäre Ortsablehnungen + Kaskade | 19 + 79 | 18 + 77 |
| Korpus: unautorisierte Ankünfte | 19 | 18 |
| Korpus: verwaiste Orte | 0 | 0 |
| natürliche `.186`/`.188`-Fenster: verwaiste Orte | 1 (Grottenraum) | 0 |
| natürliche Fenster: Extraktion fehlgeschlagen | 2 | 1 |
| Korpus: Extractor-Reparaturen gespart (unangefragte Schlüssel) | – | 4 |
| Produktcode `src`/`content`/`index.js` | | +804 / −155 Zeilen |

**Grenzen der Messung:**
- Die festen Antworten des Korpus können nicht zeigen, wie ein Modell die neuen Referenzen, Abschnitte, den Ortskopf oder die Reparatur nutzt.
- Wiederholungen, Driftdauer, Tokens je erfolgreichem Zug und p50/p95 der Modellzeit lassen sich nur in einem natürlichen Lauf messen.
- **Empfehlung:** ein kurzer natürlicher Lauf mit Mossback bis Ebene 2, Glimmerdeep bis zur Queen und einer Tannery-Rows-Rückkehr.
