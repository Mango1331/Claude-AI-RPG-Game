# Run 12 – World-Schauplätze und Questabhängigkeiten (.81)

Basis de2792b (.80). Umsetzung nach ausdrücklicher Freigabe des vorbereiteten Pakets C auf main. Dungeon-/Guild-Fachregeln, Kampfwerte, XP, Zeitgrenzen und Testspieler bleiben unverändert.

## Ursachen und technische Umsetzung

E197 besitzt einen GO, dessen neuer Zieltext Route und Begleiter statt der bekannten Ziel-ID enthält. E198 meldet arrived:false und 45 Minuten; weder Ankunft noch die bisherige 60-Minuten-Transitregel verlegen Alaric. E199 enthält keine Commands. E200 bezeichnet Trud und vier Goblins als present:true und meldet zwei Quests ready. Ohne Schauplatzbezug wird dies am weiterhin aktuellen Schmiedehof gebucht.

### Schauplatzbezug ohne Ortswechsel

extract-5.4 / delta-1.3 ergänzen scene an der Antwort: eine bekannte Orts-ID, ein strukturierter neuer Ortsname oder "here" für den aktuellen kanonischen Ort. Deltas dürfen scene überschreiben; null/ausgelassen erbt die Antwortszene. Damit können frühe Ereignisse und mehrere ausdrückliche Ankünfte innerhalb einer Antwort ihre jeweiligen Schauplätze behalten.

Neue Regelstand-2-C-Extraktionen benötigen scene bei GO-Antworten oder World-Änderungen. Fehlende Angaben werden mit dem vorhandenen Repair behandelt; keine zusätzlichen Retry-Stufen oder veränderten Tokenbudgets. Ältere Parser-/Replay-Pfade bleiben kompatibel. Test-Mocks übertragen ihre historischen Antworten mit explizitem here; die Engine ersetzt eine fehlende neue Schauplatzangabe nicht still durch here.

world.js vergleicht den Schauplatz read-only mit dem tatsächlich gebuchten Ort des jeweiligen Schritts. Das Label erzeugt keinen Ort und autorisiert kein arrive. Unvereinbare lokale Akteure, Objekte, Fakten, Erinnerungen und Questansprüche werden mit scene_context abgewiesen und zur Korrektur gemeldet. Zeit, ausdrückliche Ankünfte und echte Fernberichte behalten ihre bisherigen Pfade. present:false-Personen/Kreaturen dürfen weiterhin als entfernte Individuen existieren. Spontane lokale Besucher und echte NPC-Angriffe benötigen keinen PC-GO. Regelstand 1 behält seine bisherige World-Semantik.

### Reisen und Zielidentität

Tatsächliche Zwischenhalte verwenden bereits vorhandene arrive-Deltas einer autorisierten Reise, auch nach 45 Minuten und mit arrived:false für das Endziel. Kein Prosa-Fallback und keine neue Mindestzeit. scene allein bewegt niemals den PC. Bei mehreren Schauplätzen meldet der Extractor Ankünfte ausdrücklich in Reihenfolge.

Ein exakt bekannter Zielname in einem fehlerhaften {new:...}-Wrapper wird im C-Regelstand 2 auf die bestehende ID zurückgeführt. Planner-Anweisung: Begleiter/Route sind keine neuen Orte; eine konkret gewählte Route im Dialog mit einem Führer kann eine Spielerentscheidung sein, Fragen/Pläne/fremde Handlungen weiterhin nicht. Die Engine erzeugt keinen GO aus einem leeren Planner-Ergebnis.

reportedTarget erhält den expliziten Schauplatzbezug: ein abweichender tatsächlich benannter Zwischenort wird nicht auf das berichtete Endziel umgedeutet. Frühere Ortsalias-Antworten ohne diesen Kontext und Antworten mit eindeutigem Zielbezug behalten dieselbe Zielidentität.

### Questfortschritt

quest.ready/progress/close können über depends_on frühere Delta-seq-Werte derselben Antwort referenzieren (Strings). Verworfene, erst spätere oder mehrdeutig doppelte Quellen tragen keinen abhängigen Anspruch. Nach einer verworfenen Szene braucht ein dennoch lokaler Questanspruch einen explizit akzeptierten Bezug. Eine spätere tatsächlich gebuchte Ankunft hebt diese antwortlokale Unklarheit auf; explizit verworfene Quellen bleiben verworfen.

Dies ist keine neue persistente Beweisverwaltung. Inhaltliche Zielerfüllung bleibt die semantische Aufgabe des LLM: Finden, Information und Rettung sind verschieden. Die Engine prüft Zustandsübergänge und Abhängigkeiten. Ein realer Informationsgewinn kann ohne Arbeitszeit eine Suche erfüllen. Bestehende .76-Arbeits-/Abschluss-/Lohnprüfung sowie Guild-Lieferreceipts und Auszahlung bleiben unverändert; READY allein zahlt nichts aus.

E164/E174-Fakten über abziehende Goblins erzeugen weiterhin keine Bewegung. Bestehende enter/leave-/Arrival-Ereignisse sind nötig; es gibt keine automatische NPC-Bewegung aus Prosa.

## Regressionen und Abnahme

18 neue Tests in tests/v4/patch_run12_world.test.js. Gegen unverändertes .80: elf rot, sieben grüne Kontrollen; nach Umsetzung 18/18 grün. Originalkette E197–E200 wird aus Originalevents rekonstruiert; die neuen scene-Felder sind ausdrücklich hinzugefügte Protokollangaben, keine nachträglich behaupteten Original-Extractor-Daten. Die unveränderte E200-Antwort wird im neuen Runtime-Protokoll wegen fehlender Szene abgelehnt. Original-ZIP und frühere Reviews bleiben unberührt.

Weitere Fälle: autorisierter Zwischenhalt unter 60 Minuten, bekannte Ziel-ID, abweichender Zwischenort, lokale und entfernte NPCs, echte spontane Angriffe, verweigerte und extern erzwungene Ankünfte, mehrere Schauplätze, erfolglose Abhängigkeiten, später gültige Ankunft, Informationssuche gegenüber separater Rettung, Regeln von Legacy, malformed JSON-Struktur, begrenzter Repair, Replay/Reload und Swipe ohne doppelte Entities/Aktionen.

Angrenzend 170/170, vollständiges npm test 1604/1604. Echter ST-1.19-Mock-Smoke der finalen Fassung: 21/21, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte Replies jeweils applied und genau einmal extract.applied. Auch die vorbereitenden .81-Smokes bestanden. Nur der Mock-Antwortaufbau wurde an das neue Wire-Format angepasst; keine Änderung am natürlichen current_test oder an der Spielerlogik. Narrator-Vertrag bleibt .55.

## Grenzen

Kein natürlicher GLM-Langlauf. Das LLM muss den Schauplatz und die Zielerfüllung korrekt klassifizieren; eine falsche, aber schemafähige here-Angabe ist keine sprachlich beweisbare Wahrheit. Falsche GO-/Arrival-Erkennung wird nicht durch Textheuristiken erzwungen. Fehlt eine bestätigte Ankunft weiterhin, bleibt der bisherige Ort bestehen und unpassende lokale Folgen werden nicht gebucht. Geschädigte Altsaves werden nicht automatisch bereinigt. Keine pauschale Pflicht zur Arbeit bei Such-/Informationsquests.

## Gegenreview-Folgekorrektur .82 (25.10.2026)

Der P2-Prüfkandidat ist reproduziert: Die Delta-Schleife trug zurückgestellte private Abschlüsse und Guild-Lieferbereitschaft bereits in acceptedSteps ein. Später abgelehnte Quellen konnten daher einen abhängigen READY-/Fortschrittsanspruch hinterlassen; Event-Replay erhielt den falschen Zustand. Derselbe Fehler betraf zurückgestellte Lohnzahlungen und Warenübergaben vor einem Kaufangebot. Ein zirkulärer Nachweis (Abschluss hängt vom eigenen Lohn ab) konnte ebenfalls durchgehen.

Dies ist eine begrenzte Lücke in der antwortlokalen Annahmeprüfung, kein Bedarf für einen Umbau der World-, Reise- oder Questarchitektur. world.js unterscheidet nun ausstehende und endgültig angenommene Deltas. Die vorhandenen verzögerten Quest-/Lohnprüfungen und davon abhängige Ansprüche werden gemeinsam abgeschlossen: erst bestätigte Quellen, dann ihre Abhängigen; Lohn wartet weiterhin auf den privaten Abschluss, unabhängig von der Extractor-Reihenfolge. Jeder Eintrag wird höchstens einmal ausgeführt. Bleibt nur eine unauflösbare Abhängigkeit, wird sie abgelehnt. Warenübergaben werden nach ihrer bisherigen Kaufprüfung freigegeben oder verworfen. Eine dabei verworfene Doppelübergabe macht das tatsächlich gültige Kaufangebot nicht selbst ungültig.

Die bestehenden Fachprüfungen bleiben maßgeblich: autorisierte Arbeit, physische Lieferung, Geber, Lohnhöhe, einmalige Zahlung und Inventar-Firewall. Schauplatzprüfung erfolgt weiterhin am ursprünglichen Delta-Schritt. Keine neue persistente Beweisverwaltung, Eventtypen, Wire-Felder, LLM-Anfragen oder Budgets; Extractor extract-5.4 / delta-1.3 und Narrator-Vertrag .55 bleiben unverändert. Historische Events werden unverändert gefaltet, geschädigte Altsaves nicht nachträglich bereinigt.

14 zusätzliche Regressionen in der bestehenden World-Testdatei: auf unverändertem .81 sieben rot/sieben grüne Kontrollen, nach Fix 32/32 einschließlich der 18 ursprünglichen World-Fälle. Abgedeckt sind bestätigte und verworfene private Abschlüsse, Guild-Liefernachweise und Löhne; transitive READY-/Progress-/Close-Ketten; echte und als Kaufdoppelung verworfene Übergaben; Zahlung vor Abschluss; zirkuläre Belege und Event-Replay. Dieselben 32/32 auch mit aktivierter Decision-Ownership-Prüfung. Angrenzend 110/110; vollständiges npm test final 1618/1618.

Erster Volllauf 1617/1618: der unveränderte Runner-Mock »9D live: send refuses a disconnected or wrong chat« scheiterte beim Reload mit seinem Ein-Millisekunden-Verbindungsbudget. Separat 5/5 und im unveränderten zweiten Volllauf vollständig grün; Runner-Code und Timeout wurden nicht geändert. Kein erneuter ST-Smoke, da .82 keine Host-/Protokolländerung enthält; der oben dokumentierte echte 21/21-Smoke gehört zu .81. Kein natürlicher GLM-Langlauf gestartet. Die bestehenden Grenzen der semantischen Klassifikation durch das LLM bleiben offen.
