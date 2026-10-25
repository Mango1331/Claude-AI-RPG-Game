# Run 15 – Patch B: Nutzbare Händlerausrüstung (.89)

Basis: `a25fd5e9ae368a06e28d5f82fa5b831c076c3d84` (.88). Produkt **4.3.0-c.6.6.89**; enthält auch die bestätigten [Patch-A-Gegenreviewkorrekturen](PATCH_RUN15_TRADE_INTEGRITY.md#gegenreview-übernommen-in-89).

## Ursache und Umsetzung

Run 15 T55/T96 veröffentlichte Schienbeinschützer als kostenpflichtige Ausrüstung, obwohl dafür weder ein mechanisches Profil noch ein Slot existiert. Zusätzlich konnte `equip.slot` vom tatsächlichen Slot des Gegenstands abweichen. Bestehende Gearprofile, Werte und Kaufbuchungen reichen zur Behebung aus; keine neuen Slots, Werte oder Ausrüstungsregeln.

- `items.js`: gemeinsame, aus bestehendem Content abgeleitete Ausrüstungskategorien und Slotprüfung. Neue separate Rüstungsteile werden nicht als vollständige Rüstung umgedeutet. Eine vollständige Rüstung darf entsprechende Teile beschreibend enthalten. Gewöhnliche Werkzeuge und Dekoration bleiben Waren ohne Kampfwerte.
- `extract.js` / `world.js`: nullable `offer_line.equipment` unterscheidet beabsichtigte Kampfausrüstung von gewöhnlicher Ware. `true` benötigt vor Veröffentlichung ein gültiges bestehendes Gearprofil; `false` unterdrückt eine irreführende Gearableitung aus einem dekorativen Namen. Fehlende Angaben alter Antworten bleiben nullable. Slot und Zahlen dürfen weiterhin nicht vom Extractor geliefert werden. Klare nicht unterstützte Rüstungsteilangebote werden auch ohne Flag abgewiesen. Ungeeignete Zeilen erzeugen eine Korrektur für den Erzähler; gültige andere Zeilen bleiben erhalten. Keine automatische Ersatzware und keine Abbuchung für die verworfene Zeile.
- Angebote frieren weiterhin das vorhandene `itemProfile` ein; `bookPurchase` übernimmt dieses unverändert. Neue gewöhnliche Ware behält ausdrücklich `profile:null` und kann nicht später durch ihren Namen Kampfwerte erhalten. Nahrung, Tränke, Skillquellen und Dienstleistungen behalten ihre bisherigen Mechaniken.
- `commands.js`: neue als Ausrüstung markierte Angebote ohne gültiges Profil sind vor Zahlung gesperrt. `equip` akzeptiert nur den wirklichen bestehenden Item-Slot, vor Verbrauch oder Ausrüstungswechsel. Eine exakte, eindeutige `{new:name}`-Referenz kann ein gerade in demselben Resolveraufruf gekauftes Objekt ausrüsten. Fremder Besitz oder zwei gleichnamige Käufe benötigen eine eindeutige Objekt-ID. Kein allgemeiner unscharfer Inventarresolver.
- Katalog und Erzählerkontext zeigen unterstützte Kategorien sowie gespeicherte Slots/Werte; gewöhnliche Ware wird ohne Kampfwerte gekennzeichnet. Der Marktblock im Erzählerkontext ist auf Handel beziehungsweise offene lokale Gearangebote begrenzt. Keine zusätzliche Modellanfrage, Reparaturrunde oder Lagerverwaltung.

Extractor **extract-5.9**, Delta **delta-1.6**. Commands **cmd-1.6**, Planner **plan-c0.1**, Board **board-5.1** und persönliche Erzählerkarte **.85** bleiben unverändert. Das historische P0-Mock erhält beim aktuellen Vokabular lediglich das neue nullable Feld; seine fachlichen Erwartungen bleiben gleich.

## Regressionen und Abnahme

`tests/v4/fixtures/run15_gear.json` enthält die unveränderten gefalteten Vorzustände und Extractorantworten der beiden Originalfälle. ZIP-SHA-256: `7a251693c750643116a8e298f248b4c2b3393003009196ba9cdff10afbea3032`. Original-ZIP und Reviews bleiben unverändert.

- **19 neue Geartests:** gegen .88 einschließlich der bereits grünen A-Gegenreviewkorrekturen **12 rot / 7 grüne Kontrollen**, danach **19/19**. Original T55/T96, ungültige Profile, bedingter Kauf, kosmetischer Schild, normale Ware, eingefrorene Werte, tatsächliche DEF-Verbesserung, Kauf→Equip im selben Zug, fremder Besitz, Mehrdeutigkeit, falsche Slots, Rang, geschlossenes Schema, Legacy, Event-Replay und JSON-Reload/alternative Auflösung.
- **10 neue Handelsgegenreviewtests:** Rot/Grün in der bestehenden A-Patchnote.
- **Angrenzende Gruppe: 334/334 grün.**
- **Vollständiges `npm test`: 1765/1765 grün.**
- **Echter ST-1.19-Smoke (`npm run smoke:st:c`): abschließend 21/21 grün**, fünf Extractor-Aufrufe, `extractPerReply` und `fightOpened` erfolgreich, keine PageErrors. Vier auf Platte gespeicherte Story-Replies jeweils `applied` und genau ein `extract.applied`.
- Der erste Versuch auf demselben finalen Produktquellstand erreichte **20/21**: ausschließlich `noPageErrors` scheiterte an `AbortError: The user aborted a request. @ openai.js:4565`; fünf Extraktionen, Kampfstart und Speicherung funktionierten. Unveränderte einmalige Wiederholung **21/21**. Der bereits zuvor beobachtete intermittierende ST-Abbruch ist damit nicht als dauerhaft behoben bewiesen.

## Kompatibilität und Grenzen

Die neue Angebotseinstufung gilt für neu erfasste Waren im C-/Ruleset-2-Pfad. Bestehende Offerten und Inventarobjekte werden nicht rückwirkend umgeschrieben oder neu bepreist. Alte unmarkierte Warenangebote bleiben nutzbar; Ruleset 1 behält seine Angebotserfassung. Bestehende Eventtypen buchen Kauf und Ausrüstung; Replay interpretiert keine Warenprosa neu. Die Slotprüfung verhindert auch dort neue unpassende Slotbuchungen.

Die Engine versteht weiterhin keinen beliebigen erfundenen Rüstungsnamen. Für mechanische Ware muss das LLM eine der vorhandenen Kategorien erkennbar benennen; das neue Intent-Feld und der Markttext unterstützen diese Grenze. Namen und Aussehen bleiben frei. Ein vom LLM falsch als gewöhnliche Ware eingestuftes Objekt wird kein Upgrade. Diese semantische Grenze bleibt im nächsten natürlichen Lauf zu prüfen.

Keine Änderungen an XP, Kampfwerten, Dungeon, Board/Delivery, Testspieler oder Narrator-Kartenrevision. Kein natürlicher GLM-Lauf gestartet. Ein ST-Smoke mit Mockprovider belegt den echten Hostpfad, nicht GLMs Angebotsverständnis.

## P2-Gegenreview: ein Stück aus einem Gearstapel anlegen (.90)

Basis `05696b4` (.89). Der neueste Run-15-Gegenreview `PATCH_B_CHATGPT_REVIEW.md` auf `main` ist insgesamt nachvollziehbar; dessen konkrete P2-Hypothese wurde unabhängig reproduziert: Ein Kauf von zwei gleichen Rüstungen erzeugt einen Stapel, und `equip` verbrauchte bisher mangels Menge den gesamten Halter. Der zweite Gegenstand war danach nicht mehr nutzbar. Dies war kein beobachteter Original-Run-Fehler.

Kleine Korrektur ausschließlich im vorhandenen `equip`-Handler: Nach erfolgreicher Besitz-, Profil-, Rang- und Slotprüfung trennt das vorhandene `object.moved {qty:1, split, to:{consumed:'equipped'}}` genau ein Stück ab. Die Ausrüstung verweist auf dessen eigene kollisionsfreie ID. Der Rest bleibt im Inventar; beim Ablegen oder Ersetzen kehrt nur das getragene Stück zurück. Das funktioniert auch für bereits gespeicherte, noch gehaltene Stapel. Einzelstücke, Template-Inventar, Kaufpreise, Buchungsmengen und der Reducer bleiben unverändert. Keine Save-Migration oder neue Event-/Stackmechanik; bereits durch alte fehlerhafte Events verlorene Verfügbarkeit wird nicht rückwirkend rekonstruiert.

Drei zusätzliche Regressionen in der bestehenden Geartestdatei: Kauf von zwei Rüstungen → eines anlegen → ablegen → erneut anlegen mit JSON-Reload/Event-Replay und alternativer Auflösung; bestehender Dreierstapel mit ID-Kollision und anschließendem Ausrüstungswechsel; abgewiesener Slot/Rang ohne Aufteilung. Auf unverändertem .89 **zwei rot / eine grüne Kontrolle**, danach Gear **22/22**. Angrenzende Tests **337/337**, vollständiges `npm test` **1768/1768 grün**.

Build **4.3.0-c.6.6.90**; Protokollversionen und Erzählerkarte unverändert. Kein neuer ST-Smoke erforderlich oder ausgeführt: keine Host-, Prompt- oder Protokolländerung. Die oben dokumentierte .89-ST-Abnahme bleibt ausdrücklich ein Nachweis für .89. Kein natürlicher Lauf gestartet; keine Umsetzung des besprochenen Engine-only-Boards oder Shopdesigns.
