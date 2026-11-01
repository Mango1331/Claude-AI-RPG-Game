# .145 – Finanzstabilität und Host-Abnahme

01.11.2026. Basis `.144 / f00e598`. Ein zusammenhängender Folgefix zur bestehenden
S1/S2-Vereinfachung; keine neue Finanzmechanik, Sprachregel oder Balanceänderung.

## Ursache und Korrektur

Die .144-Schnappschussprüfung verglich gespeicherte Karten, nicht den tatsächlichen
Spielertext. `onEditedV4()` ignorierte Spieler-Edits; `messageEvents()` prüfte nur
Antworttexte. Eine echte Änderung der Quelle oder von `#pay` zu `#status`, anderer ID
oder Prosa ließ deshalb die gespeicherte Zahlung weiter gelten.

- `host.foldChat()` prüft bei freien Karten und nativen Bestätigungen den tatsächlichen
  Spielertext/Inputhash sowie die gespeicherte Quellenreferenz. Eine Bestätigung muss
  weiterhin genau ihr eigenständiges `#pay ID` sein. Andere Records bleiben unverändert.
- Native Zahlungsrecords werden auf einer Kopie des bisherigen Zustands vollständig
  angewandt und erst danach übernommen. Fehler am Kartenschluss verwerfen alle ihre
  Events und stoppen den Fold; weder der alte Geldabgang noch spätere Records werden
  auf einem ungültigen Zahlungsrecord aufgebaut.
- Der Kartenschluss prüft auch Zug, Ort und lebenden/anwesenden Empfänger erneut. Ein
  alternativer extrahierter Reply, in dem der NPC geht, autorisiert die alte Zahlung nicht.
- `onEditedV4()` veranlasst bei Zahlungs-Edits sofort eine aktualisierte Anzeige und
  einen Hinweis, ohne den alten Inputhash still auf die neuen Worte zu setzen.
  Ursprünglichen Text wiederherstellen oder die Historie ab der betroffenen Nachricht
  bewusst entfernen; keine automatische Neuinterpretation historischer Geldbewegungen.
- Echter ST-Befund beim frühen Kurzlauf: ST 1.19 markiert abgearbeitete Spielerbefehle
  nachträglich als `is_system:true`. Es bleiben authentische `is_user`-Nachrichten;
  dieses Flag allein darf ihre gespeicherte Zahlung nicht invalidieren.

Die Checkpoints betreffen nur native Zahlungsrecords, nicht jeden Record der Welt.
Kein allgemeiner Transaktionsumbau, keine Nebenliste und keine neuen Protokollfelder.
Build `.145`; cmd-1.9, delta-1.14 und Narrator-Kartenrevision bleiben unverändert.

## Regressionen und Abnahme

`tests/v4/fix145_payment_persistence.test.js`: neun Gruppen. Auf unverändertem `.144`
**7 rot / 2 positive Kontrollen grün**, auf `.145` **9/9 grün**. Die vier Editfälle
ändern echte Nachrichtentexte, rufen `onEditedV4()` auf und prüfen Fold, Münzen,
Entscheidungen, verweigerten nächsten Modellaufruf, Wiederherstellung und normales Weiterspielen.
Zusätzlich: Delete, atomare Zurückweisung, Edit ohne UI-Benachrichtigung, Reload,
Regeneration, Swipe, ST-Systemflag und alternative extrahierte NPC-Abreise.

Der .144-Test, der direkt einen Quellenhash ändert, erwartet nun auch eine frühere
Ablehnung an der Quelle; die Schutzwirkung wurde nicht abgeschwächt.

| Prüfung | Ergebnis |
|---|---|
| .144-Finanz-/Hosttests plus neue Persistenztests | 28/28 |
| Vollständiges `npm test` | 2618/2618, keine übersprungenen Tests |
| `npm run replay:check` | 2235 Fälle; dieselben 398 exakt akzeptierten Abweichungen zur .126-Baseline; 0 offen/veraltet |
| Fingerprintlisten / Originalbelege | Unverändert; keine neue wirtschaftliche Abweichung akzeptiert |
| Echter ST-Standard samt Finanzkette | 32/32 (24 bestehende + 8 Finanzprüfungen), keine PageErrors |
| Echter ST-Failsoft samt Finanzkette | 37/37 (29 bestehende + 8 Finanzprüfungen), keine PageErrors im unveränderten Wiederholungslauf |

S2 bleibt erhalten: Gesamtpreise, gespeicherte Angebotsannahme, Mengen-/Losrechnung,
ausdrückliche Limits und atomare Kauf-/Verkaufsbucher. Die volle Suite enthält die
positiven Gear-, Gebots-, Registrierungs-, Gildenbelohnungs- und NPC-Geschenkfälle.

## Echter SillyTavern-Pfad

`tools/st_live/run_c.mjs` unterstützt optional `AVERETH_SMOKE_FINANCE=1` mit dem
isolierten Fixture-Helfer `finance_smoke.mjs`. Die normalen Standard-/Failsoft-Prüfungen
bleiben erhalten. Keine Änderung an der natürlichen Driver- oder Spielerstrategie.

Die Zusatzkette spielt echte Nachrichten über ST: NPC etablieren → Karte → `#pay` →
wiederholtes `#pay` → `#bag` → Speichern/Browserreload/denselben Chat öffnen → Quelle
und Bestätigung über den ST-Texteditor ändern → ohne Geld blockieren → Text restaurieren
→ normalen Zug erzählen/extrahieren → Swipe → Regenerate. Sie prüft genau eine native
Transaktion, keine Modellanfrage für die nativen Befehle und den bestätigten Erzählerfakt.

ST lädt je nach Benutzereinstellung nach Reload nicht denselben Chat automatisch.
Die Fixture öffnet deshalb ausdrücklich dessen gespeicherte ID und verwendet einen
frischen Driver-Requesttracker für die neue Seitennavigation. Das ist Testaufbau,
kein Workaround im Produkt und kein automatisches Bestätigen von Zahlungen.

Ausgeführt mit vorhandener **SillyTavern 1.19.0** und Chromium 153, Mockprovider,
`AVERETH_SMOKE_FINANCE=1`; Failsoft zusätzlich mit `AVERETH_SMOKE_FAILSOFT=1`.
Standard: 9 Planner-, 11 Narrator-, 13 Extractor-Anfragen insgesamt; Failsoft:
12/12/15. Das umfasst auch den isolierten Finanz-/Reload-Aufbau und Fehlerproben,
nicht nur das gewöhnliche Kampfszenario. `#pay`, dessen Wiederholung und `#bag`
erzeugen nachweislich **keine** zusätzliche Modellanfrage. Genau eine native Transaktion,
gespeicherte 45 statt 50 cp auch nach Reload; normales Spiel und Kampf laufen danach weiter.

Erster Failsoft-Lauf: 36/37, ausschließlich `noPageErrors` rot wegen zweimal
`AbortReason @ openai.js:4565` aus ST, sämtliche Fachprüfungen grün. Unveränderte
Wiederholung 37/37, keine PageErrors. Keine Filterung dieser Meldungen und kein
Produkt-Workaround. Frühe ST-Kurzläufe deckten das oben behobene Systemflag auf;
daneben musste die Reload-Fixture den richtigen Chat wieder öffnen und ihren
Requesttracker nach der Seitennavigation neu aufbauen. Die finalen Läufe verwenden
denselben Produktcode wie Node-Suite und Replay.

## Freigabemaßstab und tolerierte Grenzen

Kein natürlicher Langlauf wurde gestartet. Die Tests belegen Host-/Buchungsstabilität,
nicht perfekte Semantik eines echten LLMs oder bereits erreichte Komfortschwellen.
Seltene lokale Rückfragen, Fehlablehnungen und kleine Erzählwidersprüche sind gemäß
Nutzerentscheidung tolerierbar, solange Geld/Zustand nicht schwerwiegend beschädigt
werden und das Spiel fortsetzbar bleibt. Dafür keine vorsorglichen Parser-Mikrofixes.

Historische Zahlungsautorisierung durch Edit umzuschreiben bleibt bewusst blockiert;
Wiederherstellen des Texts macht den Zustand wieder nutzbar. Für abweichende historische
Chats gibt es keine automatische Migration. Normale unveränderte Batches benötigen
diesen Wiederherstellungsschritt nicht.

Nach Abschluss der technischen Abnahme Stopp; anschließend natürliche Warrior-/Mage-/
Rogue-Batches bis Level 15 und angenommener E-Klasse zur tatsächlichen Spielbeobachtung.

**Empfehlung: Batch-bereit.** Kein schwerwiegender offener Blocker aus dieser Abnahme.
Kein weiterer vorsorglicher Finanzreview und kein eigenständig gestarteter Langlauf.
