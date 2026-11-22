# User08 – unabhängiger GPT-Review des persönlichen Avereth-.205-Laufs

**Datum:** 22.11.2026. **Testbuild:** `4.3.0-c.6.6.205`, Experiment-HEAD [`a69daeee`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a69daeeed613850919f16eb810cc2c150c8aafd0). **Neue Kampagne**, Alaric als Mage. **Quellen:** [Original-Chat](originals/chat.jsonl), [Eventexport](originals/events.json), [ungeglättetes Spielgefühl](originals/spielgefuehl.txt), [Completion-Log in sechs bytegenauen Teilen](SOURCE_MANIFEST.md), [Messdatei](MESSWERTE_USER08_205.json). Alle Originaldateien sind unverändert und per SHA-256/Git-Blob verifiziert. Keine neuen Providerrequests, kein Codepatch und keine Node-/Replay-/ST-Suite durch diesen Review.

**Einordnung:** 29 Enginezüge (zwei Charaktererstellung + 27 Spielzüge mit Narration), dazu drei native `#assign`-Systeminteraktionen; 27 gespeicherte Extractor-Abschlüsse. Der Lauf reicht von der Registrierung in Alderwatch über die Old Crown Catacombs und Level-1-Clearance bis zum Verkauf der gesammelten Materialien. Er ist **nicht** ein gleich gepaarter Geschwindigkeitstest gegen .203/.204.

## 1. Ergebnis und Prioritäten

| Befund | Nachweis | Urteil |
|---|---|---|
| **Dungeon-Eintritt einmal fälschlich verweigert** | I19 → I20, Fehlgrund `invalid local habitat scope`; I21 → I22 gelingt die gleiche Absicht nach Umformulierung | **P2-Spielbarkeitsfehler; vor Produktfreigabe gezielt korrigieren** |
| **Handelspreis widerspricht seinen Einzelpositionen** | I59 → I62: Einzelangaben ergeben 69 cp, ausdrücklich angebotene Gesamtzahl 352 cp, so verbucht | **P2 wirtschaftliche Kontinuität; gezielt klären/sichern, keine willkürlichen Preislimits** |
| **Questboard erneut zweiter Modellaufruf** | I11 / Board T6: 4/5 Einzelverträge gültig; `snapping turtle` mit `aquatic` statt `armored_beast` | **Performancekandidat mit echtem, eng begrenztem Originalfall** |
| PULSE auf Reise und Rast | 13 tatsächliche Würfe, davon drei offene Ereignisse; zwei rastbezogene Würfe | **Funktionsfähig; keine Fehlfrequenz belegt** |
| HUD/Questbuttons | Unmittelbares Nutzerfeedback: deutlich besser erkennbar | **positiver persönlicher Abnahmebefund** |
| Handel ohne Auswahl-UI, ungleiche Stockanzeige | Nutzerfeedback und `board.read`-/Angebotscode | **QoL-/Designfrage, kein bereits bewiesener Fehler** |
| Strikt lineare Dungeons | Heutige .205-Engine führt durch stabile Teile `l1_s1` bis `l1_s4` | **Kein allgemeiner Architekturumbau nötig, nur konkrete Eintrittsursache** |

**Empfehlung:** `.205` als Teststand erhalten, aber **noch kein Produktmerge**. Die beiden nachgewiesenen Integritäts-/Spielbarkeitsstellen gesondert am Original prüfen und einen kleinen gemeinsamen Korrekturpatch nur bei bestätigtem Rot/Grün-Verhalten planen. HUD-Handel und Dungeon-Design danach separat entscheiden, nicht in den Fehlerpatch hineinziehen. Kein zusätzlicher generischer Parser-/Validator-/Promptumbau.

## 2. PULSE – tatsächliche Würfe

In den Engineevents liegen **13 `pulse.rolled`** vor: zehn geschlossene und drei offene Fenster. Eine Wiederholung des Reisestopps in zwei Runs ist allein kein Fehlerbeweis, denn im aktuellen Lauf wurde auf dem Reiseabschnitt tatsächlich gewürfelt:

| Zeitpunkt | Exposition | Chance | Wurf | Folge |
|---|---|---:|---:|---|
| T8, Weg zu den Katakomben | `travel` | 50,75 % | 17,39 | **Offen: `trace`**, trockener Straßengraben mit Gebeinen, zerschnittenen Packriemen; neue Orts- und Gegenstandseinträge sowie `sign`-Thread |
| T14, zwei Stunden Rast in `l1_s1` | `pause/dungeon` | 17,25 % | 25,58 | **Geschlossen**, 120 Minuten Rast und Regeneration |
| T18, drei Stunden Rast in `l1_s2` | `pause/dungeon` | 19,50 % | 4,98 | **Offen: `strange`**, fernes graues Licht und gedämpftes Läuten; `thread.t18.1` als Zeichen gespeichert, 180 Minuten Rast und Regeneration bleiben gebucht |
| T26, Marktbesuch | `scene/inside` | 10,40 % | 1,43 | **Offen: `meeting`**, Händlerin wird zur ansprechbaren NPC und der Marktdistrikt erreicht |

Die erste Rast blieb wegen des zu hohen Wurfs ruhig, die zweite hatte ein Ereignis. **Ein offenes Zeichen ist nicht zwingend ein schadender Rastabbruch.** Die zweite Rast wurde voll ausgeführt; das ist vereinbar mit einem ruhigen `strange`-Ereignis. Die Testdaten erlauben keine Aussage über eine allgemeine PULSE-Häufigkeit oder über immer gleiche Reiseunterbrechungen.

## 3. Dungeon-Eintritt – konkreter technischer Rotfall

Nach T9 stand Alaric bereits am bestätigten Ort `loc.old_crown_catacombs` vor der Treppe. Bei **T10**: `*i enter the dungeon*` interpretierte der Planner den Schritt als `go.to={new:"down the stair into the catacombs"}`, fügte aber **`within:"loc.old_crown_catacombs"`** hinzu. `commands.js` prüft `within` derzeit für lokale Erkundung **von Population-Habitaten**, nicht für einen bereits erreichten echten Dungeon. Deshalb: `CANNOT GO — invalid local habitat scope`, obwohl das Spielerziel eindeutig war.

Bei **T11**: `*i enter the catacombs*` lieferte der Planner denselben Sinn mit `within:null`; der Schritt wurde autorisiert, die Engine legte den ersten kanonischen Abschnitt und zwei `risen bones` korrekt an. Die Ablehnung war weder ein verschlossenes Tor noch eine bewusste fehlende Nutzerentscheidung.

**Kleinster Prüfauftrag:** Den identischen T10-Vorzustand und die echten Plannerantworten als Rot-/Grünfall verwenden. Ein bekannter Dungeon am aktuellen Tor darf nicht allein durch einen überflüssigen `within`-Wert verweigert werden. Für ein echtes Habitat muss `within` weiterhin auf den aktuellen Populationskontext beschränkt bleiben; keine allgemeinen ungültigen Raum-/Dungeonwechsel zulassen. Zuerst die klare Zielzuordnung innerhalb des existierenden Codes prüfen, nicht ein neues Ortsmodell einführen.

**Zur Frage „nur lineare Chambers“:** Die heutigen Catacombs laufen bereits über kanonisch durchnummerierte Engineabschnitte `l1_s1` bis `l1_s4`, anschließend kann der Treppenweg freigegeben werden. Der belegte T10-Fehler entstand **vor** der Raumgenerierung durch die falsche Klassifikation des Planners. Streng lineare Dungeons würden ihn nicht automatisch beseitigen. Eine generelle Abschaffung optionaler Wege reduziert das Rollenspiel und ist durch diesen Lauf nicht begründet. Auf dem neuen Raum `l1_s3` wurde ein vom Extractor angebotener `passage`-Delta zu Recht mit `dungeon_way` zurückgewiesen; die tatsächliche spätere autorisierte Fortsetzung funktionierte trotzdem.

## 4. Questboard – Beseitigte Quote, verbleibender teurer Einzelfall

Die Lockerung der globalen Novice-Schwierigkeitsquoten funktioniert. Das erste neue Alderwatch-Board bot vier Jagden auf L4–7 und eine Level-3-Dungeon-Clearance. Es bestand **keine** Pflicht zur L1-Einzeljagd. Die tatsächliche Validierung der fünf Quests hat aber eine andere Schutzregel getroffen: Der erste Schildkrötenvertrag verwendete zur Spezies `snapping turtle` den Körperanker `aquatic`; `guild.js::habitatWhy` erkennt für diesen Typ `armored_beast`. Vier der fünf Listenpositionen waren einzeln gültig; deshalb wurde ein vollständiger **zweiter Boardrequest** ausgelöst.

Die gespeicherte Boarddiagnose nennt **55.597 ms** für den ersten und **60.248 ms** für den zweiten Modellaufruf, zusammen **115.845 ms**. Der vollständige ST-Hostzug bis zum Narratorende betrug **141,981 s**, plus 3,246 s Extractor-Untergrenze **145,227 s**. Die anschließende Questannahme funktionierte.

**Folgerung:** G1 ist kein Regressionsfall. G3 bleibt nur insofern ein gezielter Performanceansatz, als diese echte Einzelslot-/Spezies-Anker-Klasse nachprüfbar einen Vollrepair auslösen kann. Nicht sämtliche Ankerprüfungen lockern; zuerst prüfen, ob Körperplanhinweise vor dem ersten Request oder eine geprüfte Reparatur nur der abgewiesenen Position die zweite Komplettgenerierung vermeiden. Keine Garantie, dass künftige Boards ohne zweite Anfrage auskommen.

**Nebenbeobachtung:** Trotz der Engineansage „System cards display the official catalogue; do not reproduce it“ listete der Narrator fünf Titelnamen und Beträge nochmals im Text. Das ist redundante Präsentation, aber keine falsche Weltbuchung und kein dringlicher Patch.

## 5. Quest, Kampf, Persistenz

Die Registrierung buchte **20 cp** Gebühr und die Guild-Plakette genau einmal. T7 nahm den Level-1-Catacombs-Vertrag an; die Engine legte den Vertragsschein an. T8/T9 führte die Reise über einen realen PULSE-Stopp zur Katakombenpforte. T11 stellte `l1_s1` mit zwei Kreaturen her. In den folgenden Kämpfen blieben HP, MP, Treffer, Gegner-IDs und Kills Engineautorität. Weitere Dungeonabschnitte und der Level-1-Warden wurden erreicht; nach dem besiegten Warden kam der Queststatus `READY` auf. Die nachfolgende gemeinsame Rückreise und Abgabe wurde tatsächlich gebucht, **90 cp** gezahlt; der finale Gildenstatus lautet erledigt.

Die Extractorberichte sind für die **27 erzählten Züge alle `repaired:false`**, obwohl es einzelne `delta.rejected` gab, darunter erwartete Schranken gegen unzulässige Combat-Positionen und engineeigene Fakten. Das ist nicht gleichbedeutend mit „überall fehlerfreie Erzählung“, aber die beobachtete technische Extraktion blieb ohne physischen Zweitaufruf. Die Gildenabgabe gab eine `desk_handler`-Ablehnung eines ungenau zusammengefassten Zeugenbelegs aus; Geld und Queststatus waren unabhängig davon korrekt gebucht.

## 6. Handel – bestätigte Rechen- und Narrationsinkonsistenz

Beim Marktbesuch T26 wurde ein lebender Käufer von Häuten/Monsterteilen etabliert. T27 legte Alaric **fünf Positionen** aus seinem Inventar zur Veräußerung vor, ausdrücklich **ohne** den Skill Stone. Die Engine schuf fünf offene Verkaufsabsichten; der Narrator machte daraus ein gesamtes bindendes Gebot der Händlerin. T28 nahm Alaric das Gebot ausdrücklich an. Die Engine bewegte genau diese fünf Positionen an die Händlerin und buchte **352 cp** für Alaric, einmalig. Das Geldbuch folgt der **verbindlich zitierten Gesamtzahl**; keine zweite Zahlung, kein verlorener Skill Stone.

**Die geschilderte Preisrechnung ist allerdings falsch:**

| Erzählte Einzelposition | Richtige Rechnung |
|---|---:|
| 6 gewöhnliche Knochen zu 4 cp | 24 cp (Narrator sagte sogar „twelve for the six“) |
| 2 Beutel Staub zu je 1 Silber | 20 cp |
| 1 gepanzerter Knochen zu 2½ Silber | 25 cp |
| **Summe der Einzelpositionen** | **69 cp** |
| **Gesamtgebot in der Erzählung** | **34 Silber + 12 Kupfer = 352 cp** |
| **Differenz** | **283 cp** |

Der Extractor übernahm das explizite Gesamtgebot `offer.t60.3` mit `price_cp:352`. Bei ausdrücklicher Annahme wurde dieser Preis korrekt als Kaufpreis ausgezahlt; der Widerspruch der Einzelbeträge wurde **nicht** aufgelöst. Die nächste Narration wiederholte folgerichtig drei Gold, fünf Silber und zwei Kupfer. Der endgültige Geldstand **472 cp** ist mechanisch konsistent mit 50 − 20 + 90 + 352, aber die 352 beruhen auf einer in sich widersprüchlichen Händlerkalkulation.

**Abgrenzung:** Das ist kein Beleg einer falschen Coin-Transaktion oder ein Grund, die Engine starr an Richtpreise zu ketten. Es ist ein **semantischer Angebots-/Preis-Konsistenzfall**. Für eine Korrektur zuerst mit Originalnarration und exakt gespeichertem Gebot prüfen, ob ein widersprüchlicher Gesamtpreis gegen ausdrücklich bezifferte, vollständig erfasste Einzelpreise vor Annahme eine gezielte Klärung benötigt. Bewusster Lotbonus, Rabatt und Preisverhandlung müssen weiterhin möglich sein, dann aber klar begründet. Keine automatische stillschweigende Umrechnung eines zugesagten Gesamtangebots und kein Refactor des Geldbuchs.

**Sekundäre Kontinuität:** Der Guild-Clerk ist in der Anfangsszene ausdrücklich „she/her“, bei der Rückkehr wird derselbe bestehende Clerk als „he/him“ erzählt. Außerdem lässt die Verkaufsszene Alaric bereits unaufgefordert aus dem Laden treten, bevor der Spieler im Folgeturn selbst das Verlassen erklärt. Beide Punkte sind reale Erzähl-/Spielerhoheitsbeobachtungen, zunächst niedrigere Priorität als Dungeonzug und Preisinkonsistenz. Der Markt-Händler wurde am Ort `Alderwatch market district` gebucht; die erzählte Ladenfront erhielt keine eigene kanonische Shop-Site. Keine ungesicherte Behauptung, dadurch sei eine Warenliste verloren gegangen.

## 7. Nutzerfeedback zu Handel-HUD und Shops

**HUD:** Die neu gestalteten Questboard- und Actionbuttons sind aus Spielersicht „viel besser zu erkennen“. Dieser Befund gehört ausdrücklich als positives Ergebnis in den Run.

**Verkaufen/Kaufen wie Action-HUD:** Sinnvoller eigenständiger **QoL-Fachplan**, noch keine Freigabe zur Implementierung. Das Spielerinventar könnte als Liste mit vorhandenem Bestand, Teilmengenreglern und ausdrücklicher „Anbieten“-/„Verkaufen“-Aktion dargestellt werden. Entscheidend ist die bestehende Unterscheidung: Auswahl/Anbieten legt noch keinen Preis und keinen Verkauf fest. Nach einem echten Bid könnte eine bewusste Annahme über dieselbe Engine-`offer.accept`-Buchung erfolgen. Schutz für Skill Stones, ausgenommene Artikel, Mengen, Ausrüstung, Preise, identischen Empfänger und Save/Reload behalten. Käufe ebenso nur aus wirklich angebotenem Bestand. Die Engine hat den aktuellen Fünfpositionenverkauf ohne HUD bereits zuverlässig gebucht; der Mehrwert ist Komfort, nicht ein Beweis des Fehlens einer Verkaufsfunktion.

**Gildenprimer versus Markthändler:** Im aktuellen Code öffnet `board.read` automatisch `openGuildManuals()` und zeigt fünf kanonische Primer-Angebote. Ein gewöhnlicher Marktladen bietet dagegen nicht allein aufgrund einer erzählten Ladenfront eine mechanisch abgesicherte komplette Warenliste: In diesem Zug wollte der Spieler **verkaufen**, nicht das Verkaufssortiment erfragen; es entstand ein konkreter Käufer und später sein Bid, kein Katalog freier Kaufangebote. Das Verhalten ist erklärbar, die **unterschiedliche Auffälligkeit/Präsenz der Warenliste** bleibt aber eine legitime UI-Designfrage. Empfehlung: Shop-/Verkaufsansicht auf Wunsch öffnen, Guildprimer nicht automatisch bei jeder Boardlektüre hervorheben, sofern dies das gewünschte konsistente UX-Modell ist. Erst fachlich entscheiden; keinen Shopbestand erfinden.

## 8. Performance – Vergleichbarkeit und Grenzen

**27 Erzählantworten**, mit ST-`gen_started → gen_finished` und dem jeweils zugehörigen `extra.avereth.extraction.ms`. Es existiert für diesen persönlichen Lauf **kein gemessener Zeitpunkt** des bestätigten Save-Read-backs und der wirklichen erneuten Host-Eingabefreigabe. Diese Größen sind **Untergrenzen**, nicht T4-End-to-End.

| Dauer pro Erzählzug | Arithmetisches Mittel | Median | P90 (Nächstrang) |
|---|---:|---:|---:|
| Bis Narratorende | **37,777 s** | **33,903 s** | 48,318 s |
| Host plus Extractorjob, Untergrenze | **56,681 s** | **52,648 s** | 93,339 s |

Der einzelne Questboardzug lag bei 145,227 s Untergrenze und beeinflusst den Mittelwert. **27/27** gespeicherten Extraktorantworten benötigen laut Engine keinen Repair. Im Completion-Log sind **75 physische Request/Response-Paare** nachweisbar (21 Planner, 26 Narrator, 26 Extractor, zwei Board), zusammen **940.716 gemeldete Prompt- und 21.106 Completiontokens**, **0 Cachetokens** und `stream:false`. Die 75 geloggten Paare reichen **nicht** zum Anspruch, alle 27 gespeicherten Narrator-/Extractorjobs seien vollständig physisch erfasst; deshalb Aufrufzahlen als **Logabdeckung**, nicht globalen lückenlosen Verbrauch, ausweisen.

**Historische Vergleichsbasis:** Das entsprechende `.204`-User07-Fenster Phase 2 hatte Host+X-Untergrenze **73,92 s Mittel / 62,61 s Median** bei 22 Erzählzügen. Der neue .205-Lauf liegt bei **56,68 / 52,65 s**. Das ist ein beobachteter Unterschied zwischen **verschiedenen Szenen**, kein kausaler, gepaarter Architekturgewinn. Gleichwertig direkte Vorher-/Nachher-Messpunkte und die älteren .202/.203-Serien bleiben in [Durchschnittsmessungen](../durchschnittsmessungen/README.md) getrennt.

## 9. Empfohlene nächste Entscheidung, kein stiller Patch

1. **P2-A:** Eindeutigen Dungeon-Eintritt unabhängig von irrtümlichem `within` am bestätigten Dungeonroot zulassen; mit T10/T11 Originale gegenprüfen. Keine Habitat- oder Dungeon-Wegschutzlockerung.
2. **P2-B:** Das echte 352-cp-Angebot gegen seine eigenen Einzelpreisangaben als gezielten wirtschaftlichen Konsistenzfall prüfen. Korrektur des richtigen Entscheidungsmoments, nicht rückwirkende Save-Manipulation.
3. **Performance:** Die exakt belegte Schildkröten-/Anker-Boardreparatur als begrenzten Kandidaten untersuchen, aber keinen neuen großen Repairapparat bauen.
4. **Späteres QoL:** Mengenwählbares Kauf-/Verkaufs-HUD und konsistente Shop-/Gildenwarenanzeige als eigenständige Designrunde, ausdrücklich ohne automatische Kauf-/Verkaufsentscheidung.
5. **Kein sofortiger Dungeonarchitekturumbau:** Bestehende lineare Abschnittsfolge erhalten; erst bei weiterem Spielmaterial entscheiden, ob optionale Wege tatsächlich stören.

**Kein Implementierungs-GO durch diesen Review.** Der Nutzer entscheidet nach den Quellen und dem Spielgefühl, welche der kleinen Korrekturen vor einem neuen Run umgesetzt werden sollen.
