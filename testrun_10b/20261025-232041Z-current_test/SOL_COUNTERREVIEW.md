# Run .91 – Sols Gegenprüfung und technische Nachprüfung

**Lauf:** `20261025-232041Z-current_test` · **Build:** `4.3.0-c.6.6.91` · Produkt-SHA `b55a897af686cb165f5812e4f0dd4287288565ff`  
**Original:** [`20261025-232041Z-current_test.zip`](./20261025-232041Z-current_test.zip) · 9.200.287 Bytes · SHA-256 `3202d7de4bb80178abb9e249d7f14ca3d80f4558433537b07a2ee23359683ad0` · Git-Blob `9b6fb2e61fb95b0802b904f7a687f195aa487280`. Original wurde im lokalen Container nochmals mit `ZipFile.testzip()`, SHA-256 und `git hash-object` geprüft; GitHub-Dateigröße und Blob-SHA stimmen überein.

**Herkunft:** Fachliches Gegenreview von Sol, vom Nutzer nach [`REVIEW.md`](REVIEW.md) übermittelt. ChatGPT hat die markierten Original-LLM-Antworten und einschlägigen Produktcodepfade unabhängig **statisch** gegengeprüft, jedoch **keinen Node-Test oder simulierten Replay** dieser Fehler selbst ausgeführt. Sol berichtet seinerseits Original-Replay und technische Sonden; deren genaue Testprotokolle liegen mit dieser Nachricht nicht als separates Artefakt vor. **Keine Produktimplementierung und keine Freigabe hierzu.**

## Gesamtstand

58 Eingaben, kein Charaktertod, Mage bis Level 3, 186 Rest-XP; sechs Kampfabschlüsse, zehn registrierte Kills, zwei abgeschlossene Gildenaufträge, 288 Kupfer am Ende, weiterhin Starterausrüstung. Der Lauf endet T58 mit `extractor_failed`, nicht wegen eines Kampf- oder Balanceproblems. Der frühere Review erkannte T58, T29 und den Handelsstillstand, **unterschätzte aber T35 und bewertete den sechsten Kill T52 fälschlich als korrekt gewähltes Ziel**. Folgende Korrekturen gelten gegenüber `REVIEW.md`:

## P1 – T52: Ziel H wird durch abwesenden Falter C ersetzt

- Die originale Planner-Antwort zu T52 nennt `target:"mon.monglasswing_topnet_glint"` (**Falter H**) und die Spielerquote `I cast Flame Lance at the glasswing moth circling over the road ahead.`.
- `src/v4/planner.js:namedPeer()` prüft unter anderem `flat(q).includes(flat(h[0]))`. Der Zeichenanfang `glasswing moth c` von `Glasswing Moth C` ist Bestandteil von `glasswing moth circling`. Die Funktion meldet daher einen angeblich ausdrücklich genannten anderen Falter und überschreibt das Planner-Ziel in `plannedToIntent` / `use_skill`.
- Die Peer-Suche filtert auf Art und Handle, **nicht** auf Anwesenheit in `scene.present`; `dead` wird erkannt, aber die bloße Abwesenheit nicht. Die Engine führt infolgedessen eine tatsächlich falsche Angriffsentscheidung aus; sie ist nicht bloß falsch erzählt.
- **Schutz bei der Korrektur:** vollständige Handle-Erkennung mit echten Wort-/Suffixgrenzen statt Präfix-Teilzeichen; eindeutige explizite Peer-Nennung vor einem Zielwechsel; außerdem kanonische Szenenpräsenz und Angreifbarkeit vor jeder Zielersetzung beziehungsweise vor dem Kampfstart. Ein explizit benanntes abwesendes Ziel darf nicht still auf ein anderes Ziel abgebildet werden.
- **Regression:** Originaltext T52 muss H als Ziel behalten. `hovering` statt `circling` darf das Ergebnis nicht ändern. Ein tatsächlich ausdrücklich genannter anwesender C darf weiterhin auf C zielen; ein ausdrücklich genannter **abwesender** C muss abgelehnt werden, nicht still angegriffen. Verifizieren, dass Questkills nur aus gültigen Kampfbuchungen entstehen.

**Korrektur zum ursprünglichen Review:** Die Zählung vor T52 war 5/6 korrekt. Der anschließend gebuchte sechste Kill darf **nicht** als unproblematischer Sieg gegen das tatsächlich gewählte Ziel beschrieben werden.

## P1/P2 – T35: korrekt normalisierter Ort wird ungleich verglichen

- Original-Extractor `T35`: `scene` und `arrive.at` sind `{new:{name:"Vineyard terraces and old kiln row east of Glassmere",kind:"wilderness",parent:"loc.glassmere"}}`. Danach werden `creature.new`, zwei `person.new` und zwei `aware`-Schritte gemeldet.
- `src/v4/world.js:resolvePlace()` sucht für `wilderness` die erste erlaubte Elternart. Aus dem Settlement `loc.glassmere` steigt sie zum Realm auf. Dies ist die bestehende beabsichtigte Ortsnormalisierung.
- `sceneMatches()` verlangt anschließend rekursiv `n.parent` gegen den tatsächlichen `p.parent`. Die unnormalisierte Parent-Referenz `loc.glassmere` passt nicht zum gespeicherten Realm; nach bestätigter `arrive`-Buchung werden lokale Folge-Deltas mit `scene_context` abgelehnt. Sol reproduzierte fünf Ablehnungen und deren Wegfall mit kanonischer Elternreferenz.
- **Schutz bei der Korrektur:** Szenenvergleich muss dieselbe **kanonische Identität** verwenden, die die Ankunft tatsächlich erzeugt hat. Keinen zweiten Ort anlegen, keine ungültigen Anwesenheiten zulassen und nicht pauschal `sceneMatches` lockern; den ursprünglichen User-/Extractor-Bezug zur kanonischen Orts-ID auflösen, ohne bei der bloßen Prüfung ein zweites mutierendes `resolvePlace` zu provozieren.
- **Regression:** Gleiches neues Wildnisgebiet unter angegebener Stadt und kanonischem Realm: ein Ort, bestätigte Ankunft, alle korrekten lokalen NPCs/Monster, keine `scene_context`-False-Positives; nicht erreichte Orte und abweichende Ortsreferenzen weiterhin abweisen.

Dieser Fehler ist ein **Engine-Ortsidentitätsfehler**, kein bloßes Sichtbarkeits- oder Kampfzielproblem.

## P1 – T58: formaler Repairfehler plus falsche Ereignisreihenfolge

- Im echten Extractor-Repair zu T58 trägt `quest.detail` (Delta 7/`deltas[6]`) weiterhin `scene:null`, obwohl das finale `arrive` erst als Delta 8 erscheint. `src/v4/extract.js:parseExtraction` lehnt deshalb die Antwort ab. Keine Weltänderung wird gebucht.
- Eine Reparatur allein dieses Felds wäre **nicht ausreichend**: Drei `creature.new`-Wyrlings und deren Anwesenheits-/Wahrnehmungsdetails stehen als Delta 3 ff. **vor** `arrive`. Selbst mit hinzugefügter `scene`-Annotation ist der PC zu diesen Zeitpunkten noch nicht am Brennofen; `world.js:sceneMatches` würde die lokalen Vorgänge verwerfen.
- Der Repair muss daher sowohl vollständige Szenenangaben als auch die **erzählte Reihenfolge** der Vorgänge berücksichtigen. Fernhinweise/zeitliche Vorereignisse können vor der Ankunft bleiben, konkrete lokale Wesen nur nach bestätigter Ankunft. Nicht ungeprüft Reihenfolge im Enginecode umsortieren und keinen fehlenden Ankunftsnachweis fingieren.
- **Regressionen:** (1) Original-Antwort fehlerhaft, Repair mit nur ergänztem `quest.detail.scene`: strukturell valide, lokale frühe Kreaturen weiterhin nicht fälschlich anwesend. (2) Inhaltlich korrekt reparierte Reihenfolge mit bestätigt gebuchter Ankunft: die drei Kreaturen werden genau einmal registriert. (3) Misslungene Ankunft: keine Kreaturen-/Quest-Fakten am Zielort.

**Überholte erste Priorität:** „Nur `quest.detail.scene` ergänzen“ behebt den Laufabbruch oberflächlich, nicht die World-Integration.

## Bestätigte übrige Befunde

- **T29, P2 Agency-Guard:** Planner erzeugt `go` zur Herberge aus `I give up on the sale for now and head to the Wren for a bed and a meal — what's the price for the night with dinner?`. `src/v4/agency.js:sentences/touched` behandelt die vorangehende Handlung im Mischsatz wegen des späteren Fragezeichens als Frage; `guardCommands` verwirft den gesamten `go`. **Gezielter Guard-Test**: Reise bestehen lassen, Preisfrage erzeugt weder Zahlung noch Zimmerbuchung.
- **T23–T33, P2 Handel:** Die preisnennende Guild-Schreiberin ist zunächst nicht als anwesende kanonische Person verfügbar; Extractor/Planner greifen zeitweise zu Gebäude- oder erfundenen NPC-IDs. `buy/sell` verweigert zurecht Buchung, obwohl Narrator definitive Zusagen schildert. Erst nach kanonischer Registrierung von `npc.npcguild_clerk` gelingt T33 der echte Verkauf (+55 cp). Für [Paket B](../../patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md) ist **Sprecher- und Präsenzbindung vor jeder Quote** ein notwendiger Vertrag; keine parallele Prosa-Offerten-Hintertür.
- **T49:** Engine-Gegnerzähler 5/6 richtig; vorzeitige Aussage von sechs Kills Narratorfehler. Das T52-Problem ist separat als P1 zu behandeln.
- **Gear und Testspieler:** 288 Kupfer, kein kauf-/anlegebarer Upgrade-Pfad natürlich getestet. Keine weitere Startstat-Erhöhung; allenfalls knappe Priorität „nach erfolgreichem Lootverkauf Ausrüstungsupgrade aktiv prüfen“. Kein langer Zusatzleitfaden.

## Empfohlene fachlich getrennte Umsetzung *nach gesonderter Freigabe*

1. **Kampf-Zielautorität, P1:** `namedPeer`, explizite Handles und Präsenz-/Combat-Guards schmal absichern; Rot-/Grün-Regression Original T52.
2. **World-Ortskonsistenz, P1:** Ortsnormalisierung T35 und Ankunftsreihenfolge/Extractor-Repair T58 gemeinsam entlang kanonischer Szenen-ID prüfen, aber als zwei testbare Teilursachen behandeln. Geschlossene Ablehnungen weiterhin sicherstellen.
3. **Agency-Mischsatz, P2:** T29 getrennt und ohne allgemeine Guard-Umgestaltung beheben.
4. **Handel, P2:** T23–T33 in den bereits geplanten Handelsfachpatch integrieren; **keine** Vorabimplementierung eines zweiten Katalogs oder Parallelmechanismus.

**Nicht freigegeben:** Produktcode ändern, Board-/Handelspaket B vorziehen, Encounter-Zahlen/Dungeonbalance verändern, weiteres generelles Buffing oder den Testspieler mit längeren Vorsichtstexten überfrachten.
