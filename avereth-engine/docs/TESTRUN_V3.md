# Testrun-3: Auswertung

**Quelle:** der zweite echte Lauf mit der Engine (Stand `acc7a9a`, mit Kampfanzeige). 14 Züge: Charaktererstellung, Stadttor, Gildenhalle mit Sponsorin, Rattenkeller. Drei Artefakte:
- Chat-Export (JSONL, 29 Nachrichten mit `extra.avereth`);
- Event-Log-Export der Extension;
- SillyTavern-Konsolen-Logger.

**Logger-Lücke:** Im Logger fehlen die Züge 8 und 9 (Request und Response) und der Anfang von Zug 10. Die Konsole hatte ältere Zeilen schon verworfen. Für die Fixture gilt deshalb:
- Zug 9 hatte ohnehin keinen Report; sein Text kommt aus dem Chat.
- Den Report von Zug 8 setzt die Fixture aus den aufgezeichneten Events (angenommene Teile) und den abgelehnten Einträgen (wörtlich) zusammen.

Die echten Eingaben, der Seed und die rohen GLM-Antworten mit ihren `<avereth>`-Reports liegen in `tests/testrun_v3/fixture.json`.

**Determinismus-Beleg:** Der Replay mit dem damaligen Code reproduziert den exportierten Event-Log **exakt**: alle 29 Nachrichten-Records, Würfel für Würfel, auch mit dem zusammengesetzten Report von Zug 8.

## Setup

| Punkt | Wert |
|---|---|
| Modell | `zai-org/GLM-5.3-Flash`, reasoning high, **max_tokens 4096**, kein Streaming |
| Host | Megumin-Preset mit `<Blocks>`-Trackern (World_State, Character_Sheet, NPC-Dossiers) |
| Avereth | Engine-Extension, Narrator Contract v3 als Kartenbeschreibung, WorldInfo deaktiviert |
| Prompt | 14,6k–23,1k Token gesamt; **Engine-Block 1,1k–2,7k Token** (der Höchstwert entstand, weil drei NPCs fälschlich im Keller standen, siehe Fehler 1) |

## Verlauf

| Zug | Eingabe (gekürzt) | Engine | Befund |
|---|---|---|---|
| 1–2 | Ranger; Aimed Shot + Power Shot | Erstellung korrekt | sauber (Erstellungsregel aus Testrun 2 greift) |
| 3 | geht zum Stadttor | Wachsergeant und Fuhrmann „carter_muller“ per `new` | Der Name steckt nur im Ref („Muller“ im Text), die Engine führt „the carter“ |
| 4 | gibt ein Silber, fragt nach der Gilde | Coin −2 cp (Torzoll) | GLM meldet den Sergeanten als gehend **und** mit Position und Bewusstsein → zwei irreführende Korrekturen (**Fehler 7**) |
| 5 | folgt der Wegbeschreibung in die Gildenhalle | Odile Ferran, „hesta“, „drem“ per `new` | **Der Fuhrmann vom Tor „folgt“ in die Gilde** (SHORT galt als mitgehend, **Fehler 1**); Hesta und Drem ohne Namen (**Fehler 4**) |
| 6 | verbeugt sich: „Im Alaric no family name“ | – | **kein Report** (**Fehler 3**); „Im Alaric“ ohne Apostroph wird nicht als Vorstellung erkannt (**Fehler 6**) |
| 7 | unterschreibt, bietet ein Silber an | – | **kein Report**: Antwort bei 4.096 Token abgeschnitten, mitten im NPC-Dossier („Cut“, **Fehler 3**) |
| 8 | Handschlag, gibt Hesta das Silber | Fakten, 2 Quests angeboten, 2 Threads | „Hesta Gault“ ist unbekannt → `learn` abgelehnt; **Zahlung auf Hestas Seite gebucht** → abgelehnt, das Silber bleibt in Alarics Beutel (**Fehler 4, 5**) |
| 9 | nimmt die Rattenquest | – | **kein Report**: Quest-Annahme und der Gerbermeister Rennick fehlen der Engine |
| 10 | „bleib zurück“, steigt in den Keller | Ratten per `new`, Angriff gemeldet (PENDING) | **Odile, Drem und der Fuhrmann „folgen“ in den Keller** (Fehler 1). Die Ratten stürmen laut Text vom Haufen an der Rückwand heran, stehen im Report aber auf `ENGAGED` (**Fehler 8**). `position`/`aware` für Rennick werden abgelehnt: nie eingeführt. |
| 11 | „Basic attack the nearest one“ | Kampfstart; Ratten (Init 10) vor Alaric (Init 9); zwei Bisse 80 → 74 | **Alarics Aktion verschwindet**: Das Ziel „the nearest one“ war mehrdeutig, und der Hinweis ging beim Kampfstart verloren (**Fehler 2**). GLM erzählt trotzdem einen Schuss. |
| 12 | weicht zurück, Power Shot auf die große Ratte | 37 Schaden, große Ratte tot; Biss 74 → 71 | Die erneute Angriffsmeldung des Rudels erzeugt eine Korrektur (Fehler 7); Antwort ohne Tracker-Boxen |
| 13 | schießt auf das Rudel | 17 Schaden, Rudel tot, +20 XP | **kein Report** (Antwort ohne Tracker und Report beendet) |
| 14 | holt Pfeile, nimmt die Ohren, geht hoch | – | **kein Report**: bei 4.096 Token abgeschnitten („Cut“); Quest-Abschluss und Belohnung fehlen der Engine |

## Was funktioniert hat

- **Mechanik:** Initiative 10/10 gegen 9 mit Gleichstands-Wurf, Bisse 3 Schaden, Power Shot 37 und Basic Attack 17 (Core #11), 1 Pfeil pro Schuss, STA 100 → 88 → 83, +20 XP. Alles stimmt.
- **Kampfanzeige:** Die System-Zeilen zeigten jede Runde mit Wurf und `HP vorher - Schaden = HP nachher` (Rückmeldung des Spielers: „die Messages mit den Kalkulationen waren gut“).
- **Erstellung:** kein doppeltes Starter-Kit mehr (Testrun-2-Fix wirkt).
- **Agency:** keine Zahlung, Abgabe oder Quest-Annahme ohne Spielerentscheidung.

## Notizen des Spielers

| Notiz | Befund | Umsetzung |
|---|---|---|
| NPCs außerhalb des Kampfs reden ständig; der Sponsor ist okay, der Gebäudebesitzer nervt | Der Vertrag verbot jeden Kommentar Unbeteiligter, GLM hielt sich nicht daran. Rennick war der Engine nicht einmal bekannt (Zug 9 ohne Report). | Neue Zeile im Kampfblock des Engine-Blocks („Combat focus“): nennt die anwesenden Nicht-Kämpfer; höchstens ein kurzer Zuruf pro Antwort von jemandem mit direktem Einsatz (Sponsor, Begleiter); Besitzer, Schaulustige und Passanten schweigen. Der Vertragsabschnitt COMBAT NARRATIVE FOCUS sagt dasselbe. |
| Initiative offener: bei klarer Feindseligkeit vor dem ersten Schuss festlegen und HP zeigen | Die Engine legte die Reihenfolge erst mit der nächsten Spielernachricht fest | **Kampf-Vorschau:** Meldet eine Antwort einen Angriff auf Alaric, fixiert die Engine den Kampf sofort (Profile, Initiative, Reihenfolge; Core #26) und zeigt über **dieser** Antwort: `COMBAT START`, Initiative, Reihenfolge, HP, Entfernungen und wer vor Alaric handelt. Die Runde selbst läuft wie bisher mit der nächsten Nachricht (Core #23/#24). |
| „ich ziele und schieße, bin 2., dann wird meine Action weggenommen“ | Der Hinweis „Ziel mehrdeutig“ ging beim Kampfstart verloren (Fehler 2) | Die Aktion bleibt erhalten: Erst handeln die Schnelleren, dann Alaric. „the nearest one“ wählt das nächste Ziel nach Entfernung. Stehen zwei gleich nah (hier beide `ENGAGED`), bleibt die Wahl beim Spieler (Core #23) und wird angezeigt: `Alaric: which target? Cellar rat pack or Big rat`. |
| Heranlaufen aus der Entfernung sollte die Aktion kosten | Core #12/#24 erlaubt pro Zug **einen** Bandwechsel **plus** eine Hauptaktion. Wer auf SHORT steht, rückt heran und beißt im selben Zug. Wer auf MEDIUM oder LONG steht, braucht einen oder zwei Züge nur fürs Heranlaufen, und Alaric schießt zuerst. Im Test meldete GLM die Ratten auf `ENGAGED`, obwohl sie noch anstürmten (Fehler 8). | Core bleibt unverändert. Die Report-Legende erklärt jetzt die Bänder, und die Anzeige zeigt `Range:` pro Gegner. |
| Rattenrudel als ein Gegner ist okay | – | bleibt so |
| Handel: bei Coin oder Loot eine Zeile wie bei XP und Schaden | – | Neue System-Zeilen aus den Report-Events, zum Beispiel `COIN -2 Copper → 4 Silver 8 Copper · city entry toll`, `ITEM +3 Standard Arrow → 23 carried`, `QUEST ACCEPTED — …`, `+150 XP → XP 50/200`, `LEVEL UP`, Erholung als `STA 70 + 20 = 90/100` |
| Megumin-Boxen fehlen bei manchen Antworten | Drei Antworten ganz ohne Boxen (Züge 6, 12, 13), zwei mit abgeschnittenen Boxen (7 und 14). Inhaltlich stimmten die Antworten sonst; in den Zügen 6 und 13 fehlte mit den Boxen auch der Report. | Host-Preset, keine Engine-Änderung. Der Report steht jetzt vor den Boxen (siehe Fehler 3). |
| NPC-Charakterbögen zweimal „Cut“ | Die Antworten zu Zug 7 und 14 endeten mit `finish_reason: length`: Reasoning und Antwort erreichten zusammen das Limit von 4.096 Token (Zug 14: 12.500 Zeichen Reasoning plus 3.650 Zeichen Antwort). | **Setup:** In SillyTavern „Max Response Length“ auf mindestens 8.192 stellen oder den Reasoning-Aufwand senken. Die Engine verliert dabei keinen Report mehr, weil er vor den Boxen steht. |
| Im Logger fehlt ein Stück | bestätigt: Züge 8–9 | Fixture aus Chat und Event-Log ergänzt (siehe oben) |

## Fehler, Ursachen, Behebung

| # | Fehler | Ursache | Behebung |
|---|---|---|---|
| 1 | Fuhrmann, Registrarin und Drem „folgen“ in den Keller und bezeugen den Rattenkampf (Tod, Kampferinnerung) | Heuristik aus Testrun 2: Nach einem `place`-Wechsel galten NPCs auf SHORT oder ohne Position als mitgehend | Nach einem Ortswechsel bleibt nur, wen der Report am neuen Ort platziert (`new`, `enter`, `position`, `aware`, ein Angriff). Ein genauerer Name für denselben Ort („Guild hall, front desk“) ist kein Wechsel. Wer bekannt ist und wieder platziert wird, kommt zurück in die Szene. Report-Text `place`/`enter` erklärt das. |
| 2 | „the nearest one“ wird beim Kampfstart stillschweigend verworfen | Beim PENDING-Start wurde nur eine Aktion mit `kind` weitergereicht; der Mehrdeutigkeits-Hinweis fiel weg | Der Hinweis bleibt im RESOLVED-Block („stop at his decision“) und in der Anzeige. `nearest`/`closest` löst nach Range Band auf, bei Gleichstand fragt die Engine. Außerhalb eines Kampfs gilt das nur für benannte Ziele („the nearest wolf“). |
| 3 | 5 von 13 Story-Antworten ohne Report | (a) Zwei Antworten wurden am Token-Limit im NPC-Dossier abgeschnitten; der Report stand „at the very end“ dahinter (Züge 7, 14). (b) GLM beendete zwei Antworten ohne Tracker und Report (Züge 6, 13) und ließ einmal nur den Report weg (Zug 9). | (a) Der Report steht jetzt **direkt nach der Erzählung, vor den Tracker-Blöcken** (Report-Anweisung, Vertrag v3.1, Korrekturtext). (b) Fehlt ein Report, bittet der nächste Engine-Block darum und erlaubt dem nächsten Report, die Entscheidungen des Zuges ohne Report nachzutragen (Zahlung, Quest-Annahme). Die Spielerhoheit prüft dann beide Nachrichten, nur für genau diesen Fall (neues Event `report.missing`). |
| 4 | „hesta“ und „drem“ ohne Namen; „Hesta Gault“ später unbekannt | GLM schreibt Namen nur in den Ref; der Resolver kannte keine Teil- oder Vollnamen | Ein Ref-Wort, das die Antwort nur großgeschrieben verwendet und das kein Deskriptor ist, wird zum Namen (Hesta, Drem, Muller). Ein Vollname, dessen erster Teil der bekannte Name ist, findet die Person unter den Anwesenden und wird ihr voller Name („Hesta Gault“). Ein Namensteil findet eine Person mit mehrteiligem Namen („Gault“). |
| 5 | Alarics Zahlung an Hesta nie abgebucht | GLM buchte die Münze auf Hestas Seite; NPC-Beutel werden nicht geführt | Report-Text `coin`: „Alaric's coin … only his purse is tracked“. Die Ablehnung nennt die Korrektur konkret: `{"who":"pc","cp":-10}`. |
| 6 | „Im Alaric“ ist keine Vorstellung; an „them“ gerichtet hört niemand den Namen | Das Muster verlangte `i'm`; „look at them“ galt nicht als Ansprache der Gruppe | `i'?m`; „to/at them“ spricht alle Anwesenden an, die Alaric bemerken |
| 7 | Irreführende Korrekturen | `position`/`aware` für jemanden, der im selben Report geht; erneute Angriffsmeldung eines Kämpfers; ein Angriff als bloßer Name (`"combat": ["Big rat"]`) wurde übersprungen | Alle drei still behandelt. Unbekannte Personen bekommen den Hinweis `(introduce new people via "new")`. |
| 8 | Anstürmende Ratten auf `ENGAGED` | Die Report-Legende nannte nur die Bandnamen | Legende im Report-Text `position` (und für `new`): `ENGAGED` = jetzt in Armreichweite; ein Ansturm, der noch nicht angekommen ist, ist nicht ENGAGED; SHORT = ein paar Schritte; MEDIUM = quer durch einen großen Raum oder Hof; LONG = ein weiter Bogenschuss |
| 9 | Kleinkram | „adventuress“ fehlte in der Abenteurer-Vorlage; „first saw Alaric“-Erinnerungen standen mehrfach und ohne Subjekt im RELEVANT-Block | Vorlage ergänzt; Begegnungs-Erinnerungen bleiben auf der NPC-Karte und fehlen im RELEVANT-Block |
| 10 | Absturz „unknown skill null“, wenn eine menschliche NPC aus dem Verborgenen angreift, aber von dort keine Attacke hat, die Alaric erreicht (beim Prüfen der Vorschau gefunden, im Testrun nicht aufgetreten, schon im alten Code) | Die Eröffnungsaktion rief den Angriff ohne Skill auf | Die NPC hält ihre Eröffnungsaktion („ambush attack impossible“), danach läuft der Kampf normal weiter |
| 11 | Rattenquest in Zug 8 ohne Level angeboten: Sie hätte beim Abschluss 0 Quest-XP gebracht (Hinweis der externen Review, siehe [REVIEW_CHATGPT.md](REVIEW_CHATGPT.md)) | Eine neue Quest wurde auch ohne `level`/`type` angelegt; erst der Abschluss meldete „grants no Quest XP“ | Eine neue Quest braucht `level` und `type`, sonst wird sie nicht angelegt, und die Korrektur fordert den vollständigen Eintrag an; bekannte Quests behalten ihre gesperrten Werte |

**Belege:** `tests/testrun_v3/regression.test.js` spielt den echten Lauf ab. Mit dem alten Code schlagen 12 von 13 Tests fehl, mit dem neuen bestehen alle. Der Replay zeigt:
- der Fuhrmann bleibt am Tor, Odile und Drem bleiben in der Gilde; nur Hesta, im Keller platziert, sieht die Ratten sterben;
- Hesta heißt nach Zug 8 „Hesta Gault“;
- die Kampf-Vorschau erscheint über der Antwort von Zug 10;
- Zug 11 fragt nach dem Ziel;
- der Engine-Block bleibt unter 2.600 Token (vorher 2.681 durch die mitgeschleppten NPC-Karten).

Dazu kommen:
- Unit-Tests für das Nachtragen, die Namen, `nearest`, die Handelszeilen, die Kampf-Vorschau und den Hinterhalt ohne Reichweite;
- der Browser-Smoke-Test mit einem NPC-Angriff im echten Chromium.

## Beobachtet, bewusst nicht geändert

- **Core #12/#24 (Bewegung plus Aktion):** bleibt unverändert, siehe Notizen des Spielers. Wer Heranlaufen als ganze Aktion will, müsste Core ändern; das wäre eine Balance-Entscheidung.
- **Gleich nahe Ziele:** Die Engine wählt nicht für Alaric (Core #23), auch nicht nach „wer zuletzt gebissen hat“.
- **Rattenrudel als ein Gegner:** vom Spieler ausdrücklich akzeptiert.
- **Erzählung gegen RESOLVED:** In Zug 11 erzählte GLM einen Schuss, den die Engine nicht aufgelöst hatte. Der RESOLVED-Block sagt jetzt ausdrücklich „stop at his decision and let the player name one“.
- **Tracker-Zeit:** GLMs `World_State` zeigte zeitweise eine andere Uhrzeit als die Engine; die Engine-Uhr ist verbindlich.

## Setup-Hinweise für den nächsten Lauf

1. **Charakterkarte:** Beschreibung durch den neuen Inhalt von `content/narrator/Avereth_Narrator_Contract_v3.txt` ersetzen (Stand 3.1: Report-Position, Zuschauer im Kampf). Mit der alten Beschreibung funktioniert alles weiter; nur die Anweisungen widersprechen sich dann bei der Report-Position.
2. **Max Response Length ≥ 8.192** oder den Reasoning-Aufwand senken, sonst werden lange Antworten samt Dossiers weiter abgeschnitten („Cut“).
