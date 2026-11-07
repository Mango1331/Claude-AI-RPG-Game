# .161 — User01–User04: kompakte Karten und kleine Alltagsreibungen

**Basis:** `.160` / `16e73581d470581982e2bc0bd6ff3d4379099be1`. Vom Nutzer am 07.11.2026 als begrenzter QoL-Sammelpatch zur Prüfung und Umsetzung beauftragt. Keine neue Spielmechanik oder UI-Architektur. Die abgeschlossenen Runanalysen werden nicht wiederholt.

Maßgebliche Originalbelege und unabhängige Gegenbewertungen stehen in den Reviews von [User01](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/user-20261104-162404/REVIEW.md), [User02 einschließlich Sol-Nachtrag §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md) und [User04 einschließlich GPT §11](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/user-20261106-072640/REVIEW.md). Frühere Produktarbeit: [UI .157](FIX157_USER01_UI_QOL.md), [Start-/Erzähl-QoL .160](FIX160_USER04_GAMEPLAY_QOL.md). Hier dokumentiert sind die erneute gezielte Codeprüfung, tatsächlich gewählte Eingriffe und deren Abnahme.

## 1. Kandidatenbewertung und tatsächlicher Umfang

| Kandidat | Einordnung auf .160 | Entscheidung .161 |
|---|---|---|
| UI-1 Boarddetails | Karten bereits vorhanden; Rang/Questlevel wurden im aufgeklappten Bereich wiederholt, Vertrags-ID immer sichtbar | Kleiner Darstellungsfix: Metadaten einmal, Details mit eigenständigem Auftragstext/Client; ID bei gleichnamigen Aufträgen |
| UI-2 Questentwurf | Noch kein schneller Weg von Karte zum normalen Eingabefeld | Kleiner delegierter DOM-Handler; vorbereitetes, editierbares Annahmegespräch, kein Senden/Buchen |
| UI-3 Bodenobjekte | Freie erreichbare Objekte bereits korrekt über `groundAccess()` sichtbar, bislang Sammelzeile | Einzelzeilen mit Menge/Einheit, eindeutigen Duplikatreferenzen und Entwurf „Take…“ |
| UI-4 Kampfansicht | .157 liefert bereits eine führende Ansicht mit Beteiligten und weiteren sichtbaren Figuren | Bestehende Aufteilung erhalten; keine zusätzliche Zieltabelle oder pauschale Informationslöschung. Schmale Karten umbrechen besser |
| UI-5 First Strike | Mechanik korrekt; User02s Queen handelt durch Rundenfolge zweimal vor dem nächsten PC-Zug | Kurze aufklappbare Erklärung ausschließlich am tatsächlichen PC-First-Strike-Start |
| UI-6 Dungeon | Etage, Zyklus, Belegung/Kapazität und Reset bereits vorhanden; lange Beschreibung/Exits stehen davor | Vorhandene Etage/Zyklus vor Beschreibung/Exits anordnen; Tor-Systemblock unverändert, keine Dauerduplikation |
| UI-7 CSS | Bestehendes ST-CSS und `custom-`-Präfix müssen berücksichtigt werden | Nur neue Avereth-Selektoren im Chatbereich; Themefarben, Wortumbruch, Containerbreite für Combat |
| Q-1 Frühstück | Konkreter Planner-/Repairfehler, keine fehlerhafte Restmechanik | Enge Normalisierung ausdrücklich zitierter Mahlzeit von generischem `activity`/`rest` zu `other`; ergänzende Plannerregel |
| Q-2 Verkaufshelfer | Tatsächliches Modell-`clarify`, keine automatische Engineumwandlung zu `sell` | **Teilkorrektur:** präziser Plannervertrag. Kein unsicheres Wegfiltern von Clarify oder Erfinden einer Führung |
| Q-3 Zurückweichen | Originalplanner codiert explizites „into LONG“ als `closer` | Bekannte Zielentfernung + zitierte Zielbandangabe korrigieren die Richtung; normales Bewegungsbudget bleibt |
| Q-4 Clarify | Funktioniert für echte fehlende Angaben | Schutzanforderung erfüllt; Dauerfrage bei tatsächlicher Rast und echte Handelsklärung erhalten |
| Q-5 gemischte Suche | Corpse-Shortcut unterdrückt ausdrücklich zusätzliche Pool-/Lairsuche | Getrennt aufgezählte Suchanteile vor vorhandenem Shortcut unterscheiden; Umgebung im bisherigen Suchpfad prüfen |
| Q-6 Knochenverbrauch | Physische Fortschreibung fehlt; Original ist Boden-Tool/Worldangriff, kein bestätigtes gehaltenes Verbrauchsobjekt | **Zurückgestellt:** braucht einen engeren Ownership-/Verbrauchsvertrag; keine sichere lokale Löschung aus Prosa allein |

## 2. UI: Datenfluss und Bedienvertrag

### Board und Bodenfunde

`src/hud.js::renderBoardCards()` behält Titel, Rang, Questlevel, Belohnung, kanonisches Ziel, Gefahren und vorhandenen Renewalhinweis. Aufgeklappte `Contract details` wiederholen Rang/Questlevel nicht. Der eigenständige `task`/`desired_end_state` und vorhandene Client bleiben zugänglich. Sichtbare technische IDs werden nur zur Unterscheidung gleicher normalisierter Titel ergänzt; genau dann steht dieselbe Referenz auch im Entwurf. Es entsteht keine neue Quest oder Annahmebuchung.

`renderHud()` ersetzt nur die flache Bodenzeile durch `groundItems()`. Die zulässige Objektmenge wird weiterhin ausschließlich mit dem bestehenden `groundAccess(state, object).ok` bestimmt. Mengen größer eins und Einheiten werden angezeigt, gleiche normalisierte Namen durch Objekt-ID unterschieden. Gehaltene, fremde oder nicht erreichbare Objekte werden dadurch nicht neu freigegeben. Die schlichte `worldRows()`-Projektion bleibt für andere Verbraucher vorhanden; im gerenderten Worldpanel wird sie zugunsten der Einzelansicht ausgeblendet.

`src/ui_actions.js::installDraftActions()` wird einmal beim vorhandenen Extension-Init in `index.js` installiert. Ein Listener am Dokument verarbeitet spätere und neu gerenderte `button[data-avereth-draft]`. Ein `Symbol.for`-Marker verhindert doppelte Bindung auch bei erneuter Installation. Ein Dokument ohne DOM-Ereignis-API wird unverändert übersprungen; dadurch bleiben die bestehenden Node-Hostmocks verwendbar.

Der Klick schreibt ausschließlich in `#send_textarea`, bewahrt vorhandenen Text und hängt den Entwurf bei Bedarf als neue Zeile an. Eine bereits identisch vorhandene Entwurfszeile wird nicht dupliziert. Ein `input`-Event aktualisiert ST, danach Fokus/Cursor ans Ende. Fehlendes, deaktiviertes oder schreibgeschütztes Feld bleibt unberührt. Kein `send`, `Generate`, Provider-, Planner- oder Engineaufruf befindet sich in diesem Modul. Der Spieler kann ändern oder bewusst senden; erst dann gelten die normalen Aufenthalts-, Quest-, TAKE- und Integritätsprüfungen. Alte Karten geben keine Zustandsberechtigung.

Beide Texte werden als escaped Datenattribute erzeugt; HTML-Sonderzeichen und beide Anführungszeichen sind abgesichert, sichtbare Labels ebenfalls escaped. Gleichnamige Quest-/Objektentwürfe bewahren ihre konkrete Referenz. Die Buttons sind echte `type="button"` und damit auch per Tastatur bedienbar; sie sind keine Inline-Skripte.

### Kampf, Dungeon und schmale Darstellung

Die bestehende Combatansicht bleibt führend und zeigt weiterhin aktuelle Runde/Akteur, Ressourcen, Feinde, weitere Kampfteilnehmer und sichtbare Nichtteilnehmer getrennt. Die neue First-Strike-Hilfe benötigt `enc.first_strike`, keinen Ambush, `last.outcome.started` und einen tatsächlichen PC-Angriffsrecord in Runde 0. Spätere Züge oder der echte Titanhinterhalt erhalten keine unpassende Dauererklärung. Der Text erklärt die verbrauchte Runde-1-Aktion und zwei mögliche Gegneraktionen über die Rundengrenze; Awareness ist kein Ambushversprechen.

`worldRows()` ordnet vorhandene `Dungeon level` und `Dungeon cycle` vor lange Klassifikation/Exits. Belegung, Kapazität und bekannte Erneuerungszeit kommen unverändert aus `livingRows()`. Kein zusätzlicher Gateblock, keine neue Zeitberechnung, keine unbekannte Etage oder verborgene Information.

Neue CSS-Regeln sind auf Avereth-Klassen innerhalb `.mes_text` begrenzt und unterstützen STs `custom-`-Präfix. Buttons erben Schrift/Farbe und verwenden Themeborder bzw. neutrale transparente Flächen; Tastaturfokus bleibt sichtbar. Namen und Systemtexte brechen auch ohne Leerzeichen. Ein Combat-Containerquery bei 420 px reagiert auf die tatsächliche Kartenbreite, auch im schmalen Chat eines breiten Browserfensters. Namen stehen dann über HP/Range/Cover, deren Feldnamen bleiben sichtbar. Keine globale ST-Breite oder Einstellung wird verändert.

## 3. Kleine Gameplaykorrekturen und Grenzen

### Q-1: gewöhnliche Mahlzeit statt Rast

User02 I63: `*i eat breakfast and then i go to the guild hall*`. Der erste Originalrequest lieferte `activity(kind:"activity", what:"breakfast")`; die Schemaprüfung lehnte den Typ ab, Repair ersetzte ihn durch `rest`. Erst die intakte Rastvalidierung fragte nach Dauer. Der GO blieb bereits zuvor autorisiert. Eine `BREAKfast`-Teilstringtheorie wäre falsch.

`src/v4/planner.js::parsePlan()` normalisiert nur `activity` mit `kind` `activity`/`rest`, einem tatsächlich in der Spielereingabe enthaltenen Quote und explizitem Essen einer Mahlzeit. Zitate mit ausdrücklich gewählter Rast, Schlaf, Warten, Erholung oder Training/Lernen sind ausgeschlossen. Die neue `other`-Aktion bewahrt Sequenz, Quote und eventuelle `needs`, erfindet keine Dauer, Heilung oder Ressource. Nachfolgendes GO bleibt eigenständig. Der Planner erhält zusätzlich die semantische Regel, um den Fehler möglichst schon vor Schema/Repair zu vermeiden. Beide tatsächlichen Originalantworten werden geprüft.

### Q-2/Q-4: Vermittlungsannahme und tatsächlicher Handel

User02 I65: `i would like to take you up on that offer of selling to the guild`. Der Originalplanner erzeugte selbst eine mengenbezogene `clarify`. Daher wäre eine Änderung am `sell`-Handler wirkungslos; ein pauschales Löschen von Handelsklärungen gefährdete echte Verkäufe. Tams persönliche Zusage rechtfertigt außerdem kein aus dieser einzelnen Äußerung erfundenes GO oder NPC-Ergebnis.

`MECH_RULES` unterscheidet nun die Annahme von Verkaufshilfe, zukünftige Brokerplanung und Gespräche von einer gegenwärtigen Verkaufsentscheidung. Eigenständig gewählte Bewegung bleibt zulässig, echte `sell`/`offer.accept` und fehlende Transaktionsangaben bleiben unverändert. **Dies ist eine Promptkorrektur mit natürlicher Modellgrenze:** Der Test beweist die ausgelieferte Instruktion und erhaltene echte Klärungen, keine gemessene Befolgungsquote eines freien Planners. Eine alte gespeicherte `clarify` wird nicht nachträglich umgedeutet.

### Q-3: explizites Zielband korrigiert nur die Bewegungsrichtung

User01 I41: `*i crouch down and walk into LONG distance before i Flame Lance at the Queen*`; Originalcommands enthalten `move(dir:"closer", target:Queen)` und Flame Lance. Die Queen steht im Originalzustand MEDIUM. `mapPlan()` gleicht jetzt ein explizites zitiertes `to/into ENGAGED|SHORT|MEDIUM|LONG` mit dem bekannten aktuellen Band desselben aufgelösten Ziels ab und korrigiert die Richtung. Fehlendes/unbekanntes Ziel wird nicht ergänzt; kein neuer Positionszustand wird in der Mappingphase geschrieben.

Die Originalgegenprobe enthält damit einen normalen `after_move` **away, MEDIUM → LONG**. Die vorhandene Kampfengine führt diesen Rückwärtsschritt **nach** dem Angriff aus; der Gegner kann anschließend nach bestehenden Regeln wieder schließen. `.161` implementiert keine neue Reihenfolge „erst zurück, dann zaubern“, keinen zusätzlichen Schritt und keine allgemeine Zusage, am Turnende LONG zu stehen. Reichweite, Kampf und Raumregeln bleiben bindend. Der ursprüngliche Fehler `closer` ist damit eng korrigiert; freie Bewegungsgeometrie bleibt außerhalb des Patches.

### Q-5: Leiche geschützt, ausdrücklich mitgewählte Umgebung gesucht

User04 I91: Der Originalplanner benennt `what:"the corpse, pool and lair of the Titan"` vollständig. `remainsSearch()` erkennt wegen `corpse` die gesamte Suche als erledigtes Auto-Loot; der normale Umgebungscheck entfällt. Die vorhandene .158-Ausnahme für room/chamber usw. löst diesen konkreten Pool-/Lairfall nicht.

`src/v4/commands.js::HANDLERS.activity()` prüft bei vorhandenen bereits gutgeschriebenen Leichen und einer Suche die explizit durch Komma/`and` getrennten Fokusanteile mit demselben bestehenden `remainsSearch()`. Nur bei beiden Anteilen wird `what` auf die separat genannte Umgebung begrenzt. Ein klarer Narratorzusatz hält fest, dass die Leiche bereits geplündert ist und keine zweite Leichenbeute gewährt. Reine Leichensuche einschließlich zweier Leichenbeschreibungen bleibt im alten Shortcut ohne Wurf/Zeit.

Die Umgebung nutzt anschließend unverändert die vorhandenen Suchregeln: PER-Check, Activity-/Zeitfreigabe, Bestätigung durch den normalen Extractor und Wiederholungsschutz. Die Änderung generiert keinen Loot, keinen zweiten Check pro Komponente und keine neue Terrainwortliste. Im Originalgegenfall entsteht jetzt genau der bisher unterdrückte Suchcheck; Inventar bleibt gleich. Der reale geskriptete Hostpfad bestätigt anschließend 30 Minuten über den vorhandenen Zeitweg. Die Suche selbst bucht diese Zeit nicht vorab. Ungetrennte oder sprachlich beliebig verschachtelte Freitexte werden nicht durch einen neuen Grammatikparser erschlossen.

### Q-6: bewusst keine automatische Knochenlöschung

User04 I35–I38, `obj.t34.small_pale_thing_on_the_altar`: gewöhnliches `item`/`tool` ohne Magieeffekt, gescheiterte Untersuchung, danach Basic-Attack-Worldanwendung zum Zermahlen. Die Antwort erzählt Essen; die tatsächliche Extraktion enthält nur fünf Minuten Zeit. Das Bodenobjekt bleibt bestehen. Der Befund ist real, aber kein fehlgeschlagener bestehender Consumable-Use eines gehaltenen Gegenstands.

Der vorhandene TAKE/USE-/Objektpfad bindet Besitz und Verbrauch an konkrete autorisierte Handlungen. Aus diesem Worldangriff plus freier Prosa automatisch `object.consumed` abzuleiten würde eine neue Verbrauchsbefugnis schaffen; ein explizites TAKE zu erfinden wäre ebenfalls unzulässig. Eine globale Anweisung zur freien Objektlöschung wäre größer und riskanter als der belegte Einzelfall. Deshalb hier **kein Produktfix**. Ein späterer enger Plan müsste die Bestätigung eines konkreten physischen Verbrauchs und dessen Ownership-/Mengenprüfung festlegen. Anschauen, nichtverbrauchendes Benutzen und erfundene magische Wirkungen bleiben davon getrennt.

## 4. Reproduzierbare Abnahme

`tests/v4/fix161_user_qol.test.js`: **13 neue Tests**, auf unverändertem `.160` **elf rot / zwei Schutzfälle grün**. Nach Umsetzung **13/13**; zusammen mit .157/.160 **47/47**. Abgedeckt: erhaltene Boardbedingungen und nützliche IDs, Escaping/Duplikate, zugängliche Bodenobjekte/Mengen/Nichtmutation, First Strike vs. spätere Züge/Ambush, Dungeonreihenfolge, beide originalen Frühstückspläne, echte Rast- und Handelsklärung, ausgelieferter Plannervertrag, Originalrückschritt und unbekanntes Ziel, originale gemischte Suche, reine Leichenkontrollen und keine Wiederholungswürfe.

Die bestehende .160-Boardassertion prüft weiterhin den erhaltenen Auftragstext anstelle der absichtlich nicht mehr routinemäßig sichtbaren technischen ID. Keine Mechanikassertion wurde entfernt. Nach der DOM-Fähigkeitsprüfung bestehen auch **28/28** gezielt nachgeprüfte Host-/Start-/QoL-Tests.

Fixture `tests/v4/fixtures/user_qol161.json.gz` hält nur die benötigten Originalzustände, Spielereingaben, Commands und für echte ST-Prüfung projizierten Chatpräfixe. Quelle Produkt `.160`; Original-SHA-256: User01 `1eb5bdaea88e860b9461a22faf4fce0cd01b1bfb2709681111f8eb719c760a48`, User04 `e9ad13dd241751dcf62d5fbdb76718f929f7e08df4913d4e9a5ac5b373cb86d6`. Bereits vorhandene .157-User02- und .160-User04-Fixtures werden wiederverwendet. Keine Reasonings oder Serverlogarchive dupliziert.

| Nachweis | Tatsächlich ausgeführt |
|---|---|
| Vollständiger Node-Dateisatz von `npm test` | **2835/2835**, 0 fehlgeschlagen/übersprungen, Exit 0; `--test-concurrency=4 --test-reporter=tap` |
| Vollreplay | **2235 Fälle**, **517 exakt akzeptiert**, **0 offen/veraltet**. Bestehende `.160`-Akzeptanzen unverändert; keine neue Fingerprintfreigabe nötig |
| Echter ST1.19-Host Standard | **63/63**, **0 PageErrors**, Exit 0 |
| Echter ST1.19-Host Failsoft | **68/68**, **0 PageErrors**, Exit 0 |

`tools/st_live/ui161_smoke.mjs` ergänzt den bestehenden C-Smoke (`AVERETH_SMOKE_UI161=1`, gemeinsam mit `AVERETH_SMOKE_QOL160=1`). Tatsächliche ST-Sanitisierung und Re-Rendering, Buttons nach doppelter Installation, vorhandener Entwurf, Doppelklick, editierbarer Text, keine Requests/Buchungen, gleichnamige Objekte und bösartig aussehende escaped Titel werden im DOM geprüft. Breites Fenster mit 320-px-Chatkarte und schmaler 390-px-Viewport prüfen Containerbreite; Screenshots der konkreten Elemente dienen der Sichtprüfung im dunklen ST-Theme. Ein zusätzlicher sichtbarer Nichtkämpfer ist nur eine Renderkopie, keine neue Spielweltbuchung. Die Originalpfade Frühstück+GO, Rückschritt+Flame Lance und gemischte Suche werden mit geskripteten Providerantworten durch Host, Extraktion und Save geführt.

Der erste Hostabnahmelauf legte eine falsch formulierte Testassertion offen: Rückwärtsschritte stehen im vorhandenen `after_move`, nicht im Vorwärtsfeld `move.to`. Diese Prüfung wurde auf den tatsächlichen Record präzisiert. Automatische ST-Verbindungschecks wurden durch redundante Testprofilumschaltung abgebrochen; das Werkzeug wartet nun deren Netzruhe ab und ändert API/Source nur bei Bedarf. Keine Console-Fehler werden dafür ausgefiltert. Frühere abgebrochene/infrastrukturell fehlerhafte Läufe zählen nicht als bestandene Abnahme.

Bei den direkt eingesetzten historischen Präfixen war ein sofortiger vollständiger Speicherreadback einmal noch nicht identisch. Die endgültige Zusatzprüfung führt deshalb ausdrücklich `saveChat()` und Reload aus und prüft danach sowohl den unveränderten gesamten gefalteten Zustand als auch die vollständigen gespeicherten Records/Swipes. Sie ist ein expliziter Save-/Reloadnachweis; keine behauptete neue Garantie über sämtliche asynchronen Autosave-Zeitpunkte. Die vorhandenen normalen Driver-/Persistenzprüfungen bleiben Teil des Grundsmokes.

## 5. Änderungsgrenzen und nächster Schritt

Produktdateien: `src/hud.js`, neues `src/ui_actions.js`, dessen `index.js`-Anbindung, `style.css`, `src/v4/planner.js`, `src/v4/commands.js`; Versionsmetadaten in `manifest.json`, `package.json`, `src/util.js`. Hinzu kommen gezielte Tests/Fixture, Hostprüfwerkzeug und diese Patchnote. Keine neue Runtime-Abhängigkeit.

Keine Kampf-/First-Strike-, XP-, Attribut-, Monster- oder Rastbalance geändert. Keine NPC-E2-/Gildenzeugen-/Wiederanwesenheitsreparatur, kein Shop, kein Engine-only-Board, keine Questresetänderung, PULSE oder Rastunterbrechung. .160s Karten-/Narratortrennung und seine Awareness-/Siegelhinweise bleiben erhalten. Historische Originale werden nicht umgeschrieben; neue Darstellung gilt auch beim Rendern vorhandener gespeicherter Zustände.

Q-2 bleibt als Promptkorrektur natürlich zu beobachten; Q-6 ist ausdrücklich offen. Nach Veröffentlichung folgt der unabhängige GPT-Produktdiff-Gegenreview und ein normaler User-Test. Keine zusätzliche Pflichtbatchserie oder allgemeine Neuanalyse ist begründet.
