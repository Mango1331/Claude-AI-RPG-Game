# Technische Prüfung der Weltkontinuität auf .211

Referenz ist `experiment/210-world-continuity` bei `82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc`. Der isolierte ST-Host verwendet 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Alle in dieser Runde ausgeführten Modellpfade nutzen archivierte Antworten oder einen lokalen Mock. Physische Modellanfragen an externe Anbieter und tatsächliche Providerkosten dieser Runde betragen **0 und 0 USD**. Die alten Providerjournale dienen ausschließlich als Eingabedaten.

## Ergebnisse am Schlussstand

| Prüfung | Ergebnis | Was sie belegt |
|---|---|---|
| Gezielte Kontinuitätstests | 56/56 | Reise, Szene, persönliche Erinnerung, Objekte und der aktive Chatverlauf |
| Vollständige Node-Suite | 3.559/3.559, null übersprungen | Mechanik und Regressionen der gesamten Suite, Laufzeit 113,8 s |
| Replay-Fingerprints | 2.235 verglichen, 1.193 begründete exakte Abweichungen zum historischen Vergleich, null offen und null veraltete Ausnahmen | Gegenüber der .210-Akzeptanz kommt ausschließlich die Gildenschreiberin in `b18-warrior#222` hinzu |
| Isolierter ST-Standardlauf | 378/378, 0 Browserfehler, 755 s | Aktuelle Karte, HUD, Gilde, Host- und Weltablauf mit 351 lokalen Mockrequests |
| Isolierter ST-Failsoft-Lauf | 384/384, 0 Browserfehler, 775 s | Unter anderem sieben gezielt ausgelöste Save-/Read-back-Fehler, terminale Weltjobs, Wiederaufnahme und Schutz vor einer doppelten Kampfaktion. 358 lokale Mockrequests |
| Nativer ST-Streaming-Smoke | 59/59, 0 Browserfehler, 306 s | Vier gepufferte/gestreamte Vergleichspaare sowie zehn Fehler-/Stop-/Reloadfälle, darunter fehlerhafte Teilprosa, ungültiges JSON, fehlendes DONE und Verbindungsabbruch. Keine Weltbuchung aus den getesteten Teilantworten. |
| Native Revisionen über mehrere Spielzüge | .210 286/313, .211 313/313 | Reale Bedienung, vollständige gespeicherte Alternativen, HUD, Folgerequests und verspätete Extraktion |
| Zusätzliche HUD-Read-backs | B19, B20, C19 und 8/8 Ablesungen der vier User08-Questzweige | Historische Originalergebnisse und lokal erzeugte Alternativen im echten DOM vor/nach Reload |

[Einzelprüfungen und Rollenverteilung der vollständigen Smokes](st-smokes.json) · [Node-, Replay- und Commitnachweis](pruefstand.json) · [Native Revisionsprüfung](st-revisionen.json)

## Referenzfehler und Korrektur zweier Browserprüfungen

Der erste Standardlauf am unveränderten .211-Laufzeitcode bestand 376/378 Prüfungen, der erste Failsoft-Lauf 382/384. In beiden Läufen schlugen dieselben zwei Textprüfungen fehl, die Zahl der Browserfehler war jeweils null. `user05_currentBoardContractSentOnce` verlangte noch die Vertragsrevision `.204`. `actionHud_activeAgency` verlangte den früheren Satzteil „ordinary, low-consequence gestures“. Genau dieser Wortlaut hatte sich mit dem ausdrücklich erweiterten Narratorspielraum geändert. Am archivierten echten Request wurden die beiden Testprämissen und ihre Gegenfälle geprüft. Der User05-Test verlangt nun die Revision des tatsächlich importierten Vertrags genau einmal sowie weiterhin genau eine Kataloganweisung. Der HUD-Test verlangt den aktiven Rollenspielmodus in der Karte und prüft im Systemteil des Requests sowohl die erlaubte Ausgestaltung als auch die Grenze gegen zusätzliche Spielerentscheidungen. Fehlende, duplizierte oder der falschen Rolle zugeordnete Anweisungen wurden in gezielten lokalen Gegenproben zurückgewiesen. Die Änderungen betreffen zwei Testmodule.

## Reproduzieren

Die Code-Checkouts müssen separat neben dem Dokumentationscheckout liegen. Die komprimierten Testbelege im Enginebranch laufen auch ohne die Forschungswerkzeuge. Das Nachspielen von Originalen und Verkettungen einschließlich Archivzuordnung beschreibt der [Kreuzvergleich](KREUZVERGLEICH.md).

```bash
cd "$CANDIDATE/avereth-engine"
node --test tests/v4/continuity211*.test.js
npm test
npm run replay:check
AVERETH_ST_SANDBOX="$ISOLATED_ST" AVERETH_CHROMIUM_EXECUTABLE="$CHROMIUM" npm run smoke:st:isolated
```

Für die Token- und Laufzeitmessung im Dokumentationscheckout ein neues Ausgabeverzeichnis anlegen. Die beiden lokalen Tokenizerdateien sind durch SHA-256 gesichert. Die Python-Umgebung benötigt `tokenizers` und `jinja2`. Die [Anleitung zu den Modellartefakten](../kontinuitaet_210/REPRODUKTION.md) nennt ihre Revision.

```bash
OUT="$(mktemp -d)"
node recherche/kontinuitaet_211/messung.mjs "$REFERENCE" "$CANDIDATE" "$OUT"
python recherche/kontinuitaet_210/promptkosten.py "$OUT/promptpaare.json.gz"
```

Die Messung verwendet die vollständigen Nachrichtenarrays auf identischen gespeicherten Eingaben. Für den Narrator bleiben die übrigen ST-Nachrichten an ihren ursprünglichen Positionen, während der Code den Weltblock neu baut und den tatsächlich verwendeten Vertrag für die jeweilige Version einsetzt. Eine Assertion prüft die bytegetreue Reproduktion des gesamten Referenzarrays. Der Zähler benutzt das gepinnte GLM-Chattemplate mit derselben Reasoning-Einstellung. Für die Laufzeit durchläuft jeder Arm dieselben Zustände und baut Fold, Narratorblock und Extractoranfrage. Zwei Aufwärmrunden gehen den sechs Messrunden mit abwechselnder Armreihenfolge voraus. Lokal gemessene Millisekunden betreffen ausschließlich diesen Ausführungspfad. Die frühere natürliche Modelllatenz und die Kosten einer künftigen Kampagne lassen sich daraus nicht ableiten.

## Was bei den Originalen geprüft wurde

- **Wren #194/#195.** Die erste physische Extraktion enthielt mehrdeutige Ortsangaben und erforderte bereits im Archiv eine Reparatur. Die zweite Antwort meldete eine bekannte Bäuerin und zwei Beobachtungen am richtigen Ziel. Wenigstens ein Test spielt die unveränderten Felder vor und nach der lokalen Änderung durch den Weltverarbeiter und faltet die resultierenden Ereignisse nach Serialisierung neu. Die Quelldaten bleiben unverändert. [Archiv](../../testrun_10b/openrouter-20261124-kontinuitaet-zusatz-wren-210/)
- **B2.** Alaric spricht Lia im Beisein Danns mit ihrem bekannten Rufnamen an und stellt sich vor. Vor der Änderung entsteht für sie kein Namenswissen. Hinterher entsteht genau ein `knowledge.gained` für Lia. Abwesende, tote, unaufmerksame und mehrdeutig bezeichnete Figuren erwerben dieses Wissen in den kontrollierten Gegenfällen nicht. Die Speicherung wird bis in den später erzeugten Narratorkontext geprüft. [B-Lauf](../../testrun_10b/openrouter-20261124-kontinuitaet-b-210/)
- **Marta C20.** Das Dossier kannte den Unterschied zwischen genau einer Person und mehreren Namensträgerinnen nicht. Auf dem Originalzustand liefert die Suche bei Mehrdeutigkeit nun eine Auswahl anhand der veröffentlichten Bezeichnungen. Der ursprüngliche Weltfehler mit zwei IDs bleibt in diesem Archiv sichtbar. Die in .210 verworfene Verschmelzung nach Ort und Beruf würde eine zweite gleichnamige Person beschädigen. [Historischer Gegenversuch](../kontinuitaet_210/npc-identitaetsversuch/)

## Einzeln nachgespielter Replayunterschied

Beim alten Kriegerfall `b18-warrior#222` traf Alaric auf Bexley, folgte seiner Auskunft zur Gildenhalle und sah die bereits bekannte Schreiberin hinter dem Tresen Aushänge ordnen. Auf #223 spricht der Spieler sie ausdrücklich an. Beide Stände verbuchen dieselbe Hallenankunft und 200 Minuten. In .210 schlug die direkt vor der Ankunft gemeldete Schreiberin mit `scene_context` fehl. Jetzt steht dieselbe `npc.npcguild_clerk` anschließend in der Halle. Die Zahl der Entitäten bleibt 22. Die persönliche Episode erwähnt die Schreiberin, ihre Bedeutung steigt von 2 auf 3. In #224 lehnt der Kandidat ebenso wie die Referenz eine unzulässige freie Questabschlussbehauptung ab. Geld, Auftrag und NPC-Wissen blieben in diesem Nachspiel identisch.

| Merkmal | .210 | .211 nach dem Änderungspaket zur Reihenfolge |
|---|---|---|
| Fingerprint #222 | `0f4f98a0cccaf0d62b866a07e0dd151e36eb584258971861e039bff68f0a1b9d` | `73c7311f244dec445ece389b3edd1c7a28a46b509e503aea20435c6be11f3fa7` |
| Gefaltete Welt nach #222, SHA-256 über kanonisches JSON | `834d130d2a33cd9e9193d0a92ae4c2e36ea2363b3faab12b71f9ce04313161be` | `d0332ba1c686c5b7346020e8309a5258e16899865f6f6733cd15a4aaee1259ec` |
| Folge #223/#224 | Arbeit am Viererauftrag bleibt offen | Arbeit am Viererauftrag bleibt offen, die angesprochene Schreiberin ist anwesend |

Der Vergleich verwendet `tests/replay/corpus/b18-warrior.json.gz` mit SHA-256 `d49ac22606d3caf167069d33300e1a65ec952346f770c67c287e78a275ef15e6`. Beide Stände erhielten dieselben archivierten Antworten einschließlich Repair. Der zusätzlich anerkannte Datensatz in der neuen Akzeptanzliste ist an den konkreten neuen Fingerprint gebunden. [Replaykorpus im Ausgangscommit](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc/avereth-engine/tests/replay/corpus)

## Positive Kontrollfälle während der Integration

- **Brühe A3.** Die erste Bestandsprüfung blockierte den im Original bereits richtig gebuchten Verzehr. Ein leerer Behälter ist etwas anderes als die verzehrte Portion. Der korrigierte Stand erhält den belegten Verbrauch. Ohne getrenntes identifiziertes Gefäß erzeugt eine angekündigte Rückgabe keine zweite Sache.
- **Lieferung B5.** Ein übergroßes X-`qty` konnte trotz nur eines vorhandenen Fasses vor der neuen Bestandsprüfung in den alten Übergabepfad gelangen. Die Mengenprüfung steht nun vor den Verbrauchern der Meldung. Die berechtigte Einzelfasslieferung ist der Positivfall.
- **Freiwillige Übergabe.** Eine inkonsistente Meldung über den Erhalt eines nur angebotenen Gegenstands darf dessen Eigentum nicht verändern. Eine zunächst eingesetzte Pflichtangabe löste bei den beiden eingefrorenen negativen Taschenfällen zusätzliche X-Arbeit aus. Die Endfassung behandelt den Empfangsbeleg für diesen neuen freiwilligen Fall als optional. Fehlende Bestätigung belässt die Sache beim Halter, andere eigenständige Fakten können im selben Zug gespeichert werden.
- **Gildenhinweis und Kontextbudget.** Die präzisierte Erklärung nennt weiterhin ausdrücklich die Status aktiver, abgeschlossener und abgelaufener Angebote. Ihr Einleitungstext benötigt genau so viele Zeichen wie zuvor. Im Zwischenstand mit der NPC-Korrektur blieb in allen 30 historischen Kompaktszenen dieselbe Auswahl von Kontextabschnitten erhalten. Die Byteprüfungen vergleichen weiter mit der ursprünglichen .199-Fixture und berücksichtigen ausschließlich die fachlich begründeten Texte. Der abschließende Tokenvergleich verwendet zusätzlich den tatsächlichen GLM-Tokenizer.

[Brühe und Rückgabe](../../testrun_10b/openrouter-20261124-kontinuitaet-a-209/) · [Taschenfoki](../../testrun_10b/openrouter-20261124-kontinuitaet-fokus/tasche/) · [Archivreplay mit Folgezuständen](KREUZVERGLEICH.md)

### Warum kein automatischer Taschenabgleich übernommen wurde

Unter den 68 archivierten Spielerplänen enthielten sechs einen TAKE. Vier nannten eine vorhandene ID. Die beiden übrigen nannten eine vermeintlich neue Sache. In B8 waren neue Bretter richtig, in C19 wäre „the bag“ eine Dublette von Wrens Tasche. In beiden Situationen war bereits eine Person mit eigenem Eigentum anwesend, und es schloss sich ein Ortswechsel an. Die Gegenprobe verwendet zusätzlich dasselbe C19-Präfix, denselben Plan und denselben booleschen X-Bericht. Einmal überlässt Wren tatsächlich ihre Tasche, im anderen Verlauf behält sie sie und Alaric nimmt einen zweiten freien Beutel. Beide strukturierten Eingaben sind identisch. Ein Zusammenlegen nach dem einzigen nahen Besitzer würde eine der beiden Geschichten beschädigen. Mit unverändertem alten P und **einem** zutreffenden, auf die vorhandene ID bezogenen X-MOVE kann die Engine C19 bereits korrekt buchen. [Ausführbare Gegenprobe](take-herkunft.mjs) · [Einzelergebnisse](take-herkunft.json)

## Promptgröße, Aufrufe und lokale Dauer

| Rolle auf identischem Archivpräfix | Anzahl | .210 GLM-Inputtokens | .211 GLM-Inputtokens | Differenz |
|---|---:|---:|---:|---:|
| Planner | 25 | 261.011 | 264.328 | +3.317 |
| Planner-Repair | 1 | 12.797 | 12.986 | +189 |
| Narrator | 24 | 288.118 | 288.197 | +79 |
| Extractor | 24 | 333.907 | 335.562 | +1.655 |
| Extractor-Repair | 3 | 45.527 | 45.734 | +207 |
| **Gesamt** | **77** | **941.360** | **946.807** | **+5.447 (+0,58 %)** |

Alle 77 Referenzarrays stimmten vollständig mit dem jeweils archivierten physischen Request überein. Bei beiden Builds wurden die 53 P-/X-Anfragen samt vier Repairs beim Nachspiel in derselben Rollenfolge bedient. Die 24 N-Arrays wurden offline rekonstruiert. Das getrennte 68-Eingaben-Korpus liest ebenfalls nur Antworten aus den historischen Journalen. Keiner dieser Zähler ist eine neue Provider-Usage. Der kontrollierte bedingte Originalzug B3 benötigt neben der generellen Eingabeänderung zusätzliche Inhalte. Im isolierten Reisevergleich lagen der wörtliche Rahmen im P-Output bei +35, die X-Ergebnisbelege bei +28 sichtbaren Tokens. Die Modellhäufigkeit und das Reasoning für solche Antworten sind unbekannt. [Komplette Rollenmessung einschließlich Min/Max je Request](promptkosten.json) · [Messprogramm](messung.mjs)

Der Median für 24 aufeinanderfolgende lokale Fold-/N-Kontext-/X-Vorbereitungen betrug 192,7 ms auf .210 und 226,3 ms auf .211. Der Median der sechs **gepaarten** Laufzeitdifferenzen betrug +23,4 ms pro 24 Züge. Einzelne Durchgänge beider Arme waren wesentlich langsamer. Es wurden keine Ausreißer entfernt. Diese Messung beschreibt lokale Arbeit auf dem Testhost, während im Hintergrund auch Browserprüfungen liefen. Sie rechtfertigt keine Aussage über reale Spielzuglatenzen. [Alle sechs Wertepaarungen](laufzeit.json)

Eine zweite Messung bearbeitet tatsächlich einen früheren Antworttext auf zwei unveränderten alten Chats. Die Laufzeiten unten sind Mediane aus je sechs Messungen nach zwei Aufwärmrunden. Die Messabschnitte „Edit“ und „anschließender Fold“ sind synchron und schließen Host-Speicherung, Rendering und eine spätere Extraktion aus. Auf .210 blieb die alte Welt unter geändertem Text aktiv. Die beiden Builds erledigen hier fachlich unterschiedlich viel Arbeit. [Revisionszeitmessung](revisionszeit.mjs) · [Einzelwerte und geprüfte SHAs](revisionszeit.json)

| Originalchat | Meldungen | Inaktive Folgemeldungen .211 | Edit .210 / .211 | Fold .210 / .211 |
|---|---:|---:|---:|---:|
| b18-warrior | 401 | 266 | 0,02 / 4,18 ms | 11,34 / 3,28 ms |
| b19-mage | 189 | 122 | 0,01 / 2,74 ms | 5,15 / 2,15 ms |

## Originalzustände im ST-Browser

In einer separaten ST-1.19-Datenwurzel wurden vollständig aus dem Originalnachspiel entstandene Chats gespeichert, erneut geöffnet und gegen den direkten Disk-Read-back geprüft. B19 zeigte die überflutete Gasse mit Fuhrperson und beiden Banditen, B20 das Haus von Mother Wren und die tatsächlich anwesende Heilerin. Doss bleibt in der Welt als bekannter Zollmann zurück. C19 macht den offenen Fehler im Spielerinventar sichtbar. Dort liegt `the bag`, bei Wren zusätzlich die originale Tasche. Hier ist die Anzeige korrekt, die ursprüngliche Eigentumszuordnung jedoch falsch. In allen drei Fällen stimmten Disk-Ereignisse, vollständiger Fold und sichtbare HUD-Felder vor und nach Reload überein. Dieser Zusatzlauf benötigte null Generierungen, auch beim lokalen Stub. [DOM-Felder, IDs und Read-back-Prüfung](original-hud-dom.json) · [Browserreproduktion](original-hud-dom.mjs)

## Nachvollziehbare Änderungspakete

### Native Revisionen mit zwei unterschiedlichen Fortsetzungen

Der Browsertest startet ST 1.19 mit einer eigenen Datenwurzel. Er bedient native Swipes, Edit und Regenerate, liest den sichtbaren HUD aus dem DOM und faltet die per `/api/chats/get` zurückgelesenen Ereignisse nach vollständigem Reload. Er hält eine laufende Extraktion sowie in einem getrennten Versuch einen Save während eines Chatwechsels an. Die am Ende aktive Antwort und beide Chatdateien behalten die zu ihnen gehörenden Folgen. Im Test eines früheren Eingabe-Edits kehrt der aktive Zustand zur Gildenhalle mit Brenna, 3 Silber und dem angenommenen Auftrag zurück. Die verworfenen Bodenfunde fehlen in den Folgeprompts. Die exakte ursprüngliche Eingabe stellt ihren bisherigen Verlauf wieder her.

Zwei weitere Chats beginnen mit demselben archivierten C19-Präfix. Der Spieler bittet Wren um ihre Tasche und Begleitung. Die künftige Antwort kennt er beim Senden noch nicht. Die beiden vom Mock erzeugten Fortsetzungen prüfen eine tatsächliche Revision derselben Eingabe. Zwei getrennte, vom selben Präfix gespielte Folgefragen zeigen außerdem, welche Welt jede Modellrolle anschließend erhält.

| Nach Save, Read-back und Reload | Wren lehnt ab | Wren übergibt die Tasche und begleitet Alaric |
|---|---|---|
| Ort, Person, Uhrzeit | Armenhaus, Wren anwesend, 18:55 | Halloran-Hof, Wren anwesend, 19:55 |
| `obj.t40.mother_wrens_leather_satchel` | ein Exemplar bei Wren | dasselbe Exemplar bei Alaric und im Inventar-HUD |
| Geld und Wissen | 40 Kupfer, „Bellthread“ unbekannt | 40 Kupfer, persönlich mitgeteiltes Wissen samt Erinnerung an Wren |
| Unabhängige nächste Frage | P und N kennen diesen Rufnamen nicht. X erhält Armenhaus, Wren und die Tasche bei Wren. | P und N kennen den Rufnamen. X erhält den aktuellen Folgetext, Hof, Wren und Tasche bei Alaric. Frühere persönliche Erinnerungen werden X hier nicht nochmals vollständig mitgesendet. |

Auf .210 kennt der Narrator den positiven Wortlaut aus der Chatgeschichte, obwohl die gespeicherte Welt und der nächste Extractor die Tasche noch bei Wren im Armenhaus führen. In diesem C19-Versuch bestand die Referenz 91/101 Prüfungen bei 15 lokalen Requests, der Kandidat 101/101 bei 14. Die zweite Ausführung umfasst auch An-/Absage, einen bestätigten Read-back vor der nächsten Eingabe und wiederholten Wechsel der gespeicherten Antworten. [C19-Prüfwerte aus beiden Instanzen](st-wren.json)

Mit identischem Prüfprogramm bestand .210 im vollständigen Lauf 286/313 Prüfungen bei 35 lokalen Requests (8 P, 13 N, 14 X). Bei einer nativen Swipe-Auswahl und bei einem verspäteten X war „Gespeichert“ bereits sichtbar, als der Read-back noch die vorige Auswahl lieferte. Der zusammenhängende .211-Lauf bestand 313/313 Einzelprüfungen mit 36 physischen lokalen Mockrequests (8 P, 13 N, 15 X). Der Teil für native Revisionen ohne das Taschenpaar umfasst 212 Prüfungen. Hier benötigt .211 bei zwei tatsächlich editierten Erzählungen je einen zusätzlichen X; die Rückwahl einer bereits extrahierten Fassung benötigt keine neue Extraktion. Die Zähler sind technische Bedien- und Zustandsprüfungen und zählen mehrere Beobachtungen desselben Vorgangs. [Revisionsbelege und geprüfte Felder pro Phase](st-revisionen.json)

Zur Reproduktion im Enginecheckout `AVERETH_ST_DIR=/pfad/zur/isolierten/SillyTavern node tools/st_live/continuity_revision_smoke.mjs` ausführen. Für den Referenzlauf die drei Dateien `tools/st_live/continuity_revision_smoke.mjs`, `tools/st_live/live/stub_provider.mjs` und `tools/st_live/live/revision_handover.mjs` aus dem Prüfbranch in einer temporären .210-Testkopie verwenden. Die angegebenen Git-Commits und das Originalarchiv müssen vom Checkout aus auflösbar sein.

### Auszahlung, Kampfressourcen und Questfortschritt nach frühem oder spätem Swipe

Für den User08-Chat M0–56 erzeugte die reguläre Extraktion auf dem Endstand zwei getrennte lokal geskriptete Alternativen zum Original. Bei einer Änderung der Antwort M22 entfallen die abhängigen Kämpfe und die spätere Questabgabe. Bei einer Änderung erst an M56 bleibt der Kampf verbucht, während Alaric seine Auszahlung noch nicht bekommen hat. In beiden Fällen wurden Original → Alternative → Original → Alternative und drei Dateischreib-/Lesezyklen geprüft. Beim frühen Wechsel blieben die 264 gespeicherten Folgeereignisse aus 34 späteren Nachrichten im Audit. Nach Rückwahl entstand genau eine Auszahlung von 90 Kupfer. Der vollständige Fold der wiederhergestellten Fassung war mit dem Original identisch. [Node-Reproduktion](av211-ledger-revisions.mjs) · [Zustandswerte](av211-ledger-revisions.json)

| Sichtbarer Zweig im Browser | Geld | Ressourcen | Aktive Quest |
|---|---:|---|---|
| Frühe Alternative M22 | 3 Silber | HP 80/80, MP 72/72 | angenommen, noch nicht erfüllt |
| Späte Alternative M56 | 3 Silber | HP 43/100, MP 105/168 | erfüllt und abgabebereit |
| Wiederhergestelltes Original, beide Fälle | 1 Gold 2 Silber | HP 43/105, MP 105/168 | nach Abschluss aus der aktiven Liste entfernt |

Vier vorher lokal erzeugte Zweigstände wurden anschließend in eine frische ST-Instanz importiert. Je Stand wurden tatsächlicher DOM, gespeicherter Datensatz und kompletter Fold nach nativem Save/Read-back sowie nochmals nach Browser-Reload geprüft (8/8 Ablesungen). Auf den inaktiven Folgezeilen erschienen keine aktiven HUD-Panels. Die Variante mit Auszahlung erreicht Stufe 6 und darum das höhere HP-Maximum. Der Importtest selbst erzeugte keine neue ST-Modellantwort. Den tatsächlichen nativen Swipevorgang mit anschließender freier Folgeeingabe belegt der separate 313er-Lauf. [ST-DOM-Beleg](av211-ledger-hud-dom.json) · [Prüfprogramm](av211-ledger-hud-dom.mjs) · [Originalchat](../../testrun_10b/user-20261122-161817-205/originals/chat.jsonl)

### Code und Testmaterial

Der Laufzeitstand ist `10de728d4260e07ebf791cd2585ed93dc944bc7a`. Die [Prüfstanddatei](pruefstand.json) enthält die vollständigen Zwischencommits, geänderten Laufzeitpfade und SHA-256 der sechs komprimierten Regressionstestfixtures.

| Paket | Commits auf dem gemeinsamen Experimentbranch |
|---|---|
| Szenenfolge und einzeln begründete Replayakzeptanz | `b2790f72`, `1ccde172` |
| Kanonischer Status der Gildenangebote und gleich großer Budgetabschnitt | `ed3829bd`, `df68f810` |
| Bezeugte Vorstellung, Dossier, personenbezogene Erinnerung und Schutz vor bloß gedachten/zitierten Erklärungen | `3b38ade5`, `2a404c1e`, `10de728d` |
| Freiwillige Übergabe, Stapel, Materialverbrauch, obere Mengenprüfung und Brühe-Positivkontrolle | `5960d96d`, `cd1acc95` |
| Native Revisionsprüfung und gültiger Verlauf im Host | `686b07ba`, `aaa2ccbf` |
| Reisegrenzen, Unterbrechung im lokalen Gebiet, zeitlicher Halt und striktes internes X-Schema | `3b1c06d1`, `2f411093`, `6bdc1ef4` |
| Historische Kontext-Snapshots und Buildkennung | `804428bd`, `b15dc380`, `ee4cc313` |
| Gegenprobe für Wrens Reise und Tasche über native Antworten und Folgezüge | `65df153e` |
| ST-Smoke gegen die aktuelle Vertragsrevision und die weiterhin wirksamen Grenzen des Rollenspiel-HUD prüfen | `762a55ee`, `c2ddc780` |

Gegen .210 ändern sich in der Runtime inklusive Verträgen, Manifest und Paketdefinition **26 Dateien mit 622 hinzugefügten und 110 entfernten Textzeilen**. Testcode, Browserprüfungen und Gzip-Fixtures sind davon getrennt. Vor allem der Host benötigt zusätzliche Logik für ältere Chatexporte, Herkunft einer Revision, Wiederherstellung und Read-back. Kampfschaden, Aktions-HUD-Layout, Preise, Quoten, Lorebook und Sampling wurden in diesem Versuch nicht angepasst.

Der vollständige Schlussstand `c2ddc780d4c57b219f9cd7a1d134efceca7e459d` umfasst gegenüber .210 einschließlich aller Tests und Vergleichsdaten 52 geänderte Dateien (+2.390/−135 Textzeilen). Gegenüber dem Laufzeitstand `10de728d4260e07ebf791cd2585ed93dc944bc7a` ändern sich ausschließlich vier Testdateien unter `tools/st_live/`. [Vollständiger Entwicklungsdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc...c2ddc780d4c57b219f9cd7a1d134efceca7e459d)

Im isolierten Folgeversuch braucht die Instanz die vollständige Extension vom Kandidaten und die dazugehörige `avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt` mit Revision .211. Die Testprofile verwenden getrennte ST-Datenwurzeln. Eine Aktualisierung der persönlichen Installation gehört erst zu einer späteren ausdrücklichen Entscheidung.
