# Batch 21 – unabhängiger Originalreview auf .145

**Sol · 01.11.2026 · ausschließlich Analyse.** Produkt: `4.3.0-c.6.6.145`, Commit [`0a2beca`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0a2beca32088d211676b612b58f6d56b2e4472d8). Der Nutzer hat den Warrior-Lauf während Eingabe 63 manuell abgebrochen; Mage/Rogue wurden nicht gestartet. Das `process_error` im Batchbericht bezeichnet hier den manuellen Prozessabbruch, keinen nachgewiesenen Engineabsturz.

## 1. Urteil

**Die Beobachtung „Verkaufen klappt, Kaufen nicht“ trifft die erlebte Schleife, aber nicht die gesamte Buchungsbilanz.** Eine Rüstung und eine Unterkunft wurden korrekt gekauft. Drei Lootverkäufe funktionieren ebenfalls. Der spätere Waffenkauf scheitert zuerst an fehlender Händleranwesenheit und wechselnden NPC-IDs, anschließend berechtigt am Geldbestand. Der dafür gedachte Verkauf der vorhandenen Ersatzrüstung scheitert dann an einer echten Schnittstellenlücke. Auch Verkäufe sind deshalb nicht generell in Ordnung.

**Der Lauf belegt keine systematische Fehlabbuchung oder beschädigte Persistenz, wohl aber wiederholte, spielbremsende Handelsblockaden.** Die wichtigsten Ursachen liegen bei Identität, Anwesenheit und zwei unterschiedlichen Gegenstandsrepräsentationen; ein weiterer allgemeiner englischer Preisparser wäre keine passende Antwort. Daneben scheitert das Board wiederholt an Singular/Plural einer bereits festgelegten Population.

## 2. Quellen und Prüftiefe

- [Original-ZIP](batch-20261101-152756Z.zip), unverändert gegenüber dem Chatupload, 11.712.628 Bytes; SHA-256 `afcc0eaa6d097d8a997977a9cacc8e41181ffcbe5c97706c645aa594d61feff0`. CRC fehlerfrei. [Manifest mit Einzeldateihashes](MANIFEST.json). Die Prüfung typischer Schlüsselzuweisungen und Provider-/GitHub-Schlüssel ergab keine Treffer; kein absoluter Geheimnisnachweis.
- Ausgewertet: Chat, Spielerentscheidungen, Completion-Requests/-Antworten, Events, Evaluation und Runnerabschluss. Die automatisch erzeugte Evaluation nennt unter `reached.quest_completed` nur den ersten Meilenstein; tatsächlich sind **zwei** Questabschlüsse gebucht.
- Aktuellen Produktcode gegen das tatsächlich benutzte `.145` geprüft. Gesamten Chat mit dessen `foldChat()` erneut aufgebaut: **0 Foldfehler, 0 Failures, `validateState()` ohne Befund**. Gezielte Read-only-Sonden mit Originalvorzuständen für T40/T49/T53, beide Rollenalias-Ablehnungen und die Boardantworten. Keine Produktdateien, Regressionen oder Fingerprintlisten geändert; keine Vollsuite oder ST-Smokes für diesen Review ausgeführt.
- **T** = Runner-Spielereingabe; **E** = Nachrichtenindex ohne die erste JSONL-Metadatenzeile. Originalrun im ZIP: `001-guild-warrior/20261101-152757Z-current_test/`.

## 3. Tatsächlicher Verlauf und Bilanz

| Gegenstand | Originalbefund |
|---|---|
| Umfang | 63 gesendete Eingaben; T1–62 abgeschlossen, T63 während der Narratorphase manuell unterbrochen; final 58 gebuchte Engine-Turns einschließlich des begonnenen T63 |
| Fortschritt | Level 1 → **3**, danach 50 XP im aktuellen Level; zusammen **350 erhaltene XP**, keine E-Entwicklung |
| Kämpfe | **2/2 Siege**, jeweils ein gewöhnlicher L1-Marsh-Lynx; erster Kampf zwei Spieler-Kampfaktionen, zweiter mit Cleave in einer Aktion beendet; kein Tod/Flucht |
| Gilde | Registrierung einmal −20 cp; **zwei** erfüllte Jagden, je +45 cp/+115 XP; zwei getrennte Lynx-Entities und Siege, keine doppelte Bezahlung desselben Kills |
| Handel | Lootverkäufe +70, +14, +109 cp; Rüstung −72 cp; Unterkunft −2 cp |
| Endbestand | **239 cp**, Starter Longsword weiterhin ausgerüstet; Fine Chain Mail ausgerüstet, Starter Heavy Armor einmal im Inventar; HP **135/135**, MP84, STA100 |
| Skills | Basic Attack P1/18 PP, Cleave P1/18 PP, Guard P1/0 PP; keine Evolution, kein neuer Skill |
| Stabilität | Kein technischer Terminalfehler vor dem manuellen Stopp; 55 gespeicherte Story-Extraktionen `applied`; kein nachgewiesener hängender Extractor nach gültiger Antwort |

Die acht Geldtransaktionen sind vollständig erklärbar: `50 − 20 + 45 + 70 + 14 − 72 + 45 + 109 − 2 = 239 cp`. Guild- und Handelsnachzählungen erzeugen keine zusätzlichen Gutschriften. Der erfolgreiche Rüstungskauf T29/E57 bucht **72 cp, eine Rüstung und Ausrüsten**; die Unterkunft T62/E123 bucht **2 cp und einen Aufenthalt**, anschließend Schlaf.

## 4. Priorisierte technische Befunde

### A – Hoch: bekannte Händler werden beim Wiederbesuch nicht zuverlässig handelbar

**Original:** T27 ist der bekannte Schmied korrekt per `enter` anwesend. T40/E80 meldet der Extractor beim erneuten Besuch nur `arrive` und `offer`, aber kein `enter`. Ankunft setzt die Szene zurück; das Angebot des echten `npc.npcalderwatchsmith` wird mit „seller … is not present“ verworfen. Die Read-only-Wiederholung von `applyWorld()` mit Originalzustand/-antwort reproduziert genau das.

T41–44 verschärft das Modell den Fehler durch `npc.alderwatch_smith` und `npc.smith`: Das sind nicht die etablierten IDs. T42–44 entstehen deshalb erneut keine gültigen Angebote. T47 führt der Narrator eine Schmiedin ein; deren echte Einführung/Anwesenheit ermöglicht schließlich ein Angebot `offer.t94.16` zu 260 cp.

**Ursache:** Der Übergang „bekannt am Ort“ → „jetzt wieder anwesend“ fehlt im Extractorbericht. `world.js::offerLines()` fordert zu Recht aktuelle Anwesenheit; der bekannte Händler im Ortskatalog allein genügt nicht. Dazu kommen erfundene Identitätsvarianten. Der bestehende Extractorvertrag verlangt bereits `enter` für wiederkehrende NPCs; ein weiterer gleichlautender Promptsatz garantiert daher keine Lösung.

**Nicht empfehlen:** Händlerpräsenz global aus einem Angebot oder bloßem Aufenthaltswissen ableiten. Empfehlenswert ist eine eng begrenzte Wiederherstellung/Repair fehlender oder falscher Händlerreferenzen über die vorhandene kanonische Identität und die tatsächlich erzählte Begegnung; bekannte Abwesenheit muss weiterhin gelten. Originalfolge T27 → Verlassen → T40 sowie ausdrücklich geschlossener/leerer Laden als Gegenfälle verwenden. Das ist eine gezielte Orts-/Identitätskorrektur, keine neue Finanzarchitektur.

### B – Hoch: gültige Verkaufsware im Sheet-Inventar wird vom World-Gebot nicht erkannt

**Original:** Beim Ausrüsten der Fine Chain Mail wird die alte Rüstung korrekt durch `item.changed` ins Inventar gelegt. Ab T49 existiert `starter_heavy_armor:1` tatsächlich. Planner und Extractor verwenden die korrekte Katalogreferenz `item.starter_heavy_armor`. Trotzdem lehnen T49/E98, T53/E106 und spätere Gebote sie als nicht im Besitz ab. An einer anderen Verkaufsstelle wiederholt sich derselbe Fehler.

**Am Code und mit Original-`applyWorld()` reproduziert:**

- `commands.js::objectOf()` erkennt `item.<template>` im Sheet-Inventar.
- `trade.js::heldUnits()` bestätigt für diese Rüstung **1**, `bookSale()` besitzt bereits den passenden `item.changed`-Abgangspfad.
- `world.js::bid()` benutzt dagegen das lokale `objectRef()`, das Stringreferenzen ausschließlich in `s.objects` sucht. Der identische Kataloggegenstand wird dort nicht erkannt.

**Folge:** Es entsteht kein verbindliches Gebot, folglich kein Verkauf und kein zusätzlicher Kaufspielraum. Die Narration behauptet T50 trotzdem eine Zahlung von 30 cp; die Engine bucht sie zu Recht nicht ohne gültigen Verkauf. T52 erklärt der Narrator die noch vorhandene Rüstung daraufhin fälschlich zur zweiten, bereits verkauften Garnitur. Aus einem lokalen Repräsentationsfehler entsteht ein mehrzügiger Erzähl-/Handelskonflikt.

**Kleinster sinnvoller Korrekturweg:** Die vorhandene Auflösung und Mengenprüfung für verkäufliche Sheet-Items auch an der Gebotsgrenze verwenden; keinen zweiten physischen Gegenstand erzeugen und keine allgemeine Inventory-Firewall lockern. Positive Kette: alte Rüstung ablegen → Gebot → einmal verkaufen → Geld → finanzierbarer Kauf. Negativ: weiterhin angelegte Waffe darf nicht allein durch Erwähnung als zusätzliches Inventarstück gelten. Der Starter-Schwertverkauf T51 ist davon zu unterscheiden: Das Schwert ist noch ausgerüstet und nicht im freien Inventar; diese Ablehnung ist keine gleiche Fehlablehnung.

### C – Mittel, wiederholt: die richtige Gegenpartei scheitert an ihrem kurzen Anzeigelabel

**Original:** T21/E41 und T22/E43 wählen korrekt `offer.t40.3` der alten Frau, Betrag und Ware passen. `acceptanceWhy()` lehnt `party_words:"the old woman"` trotzdem ab: „counterparty the old woman is not the merchant“. T25 klappt dieselbe Annahme mit „Merchant“. T61 wiederholt sich das bei „the landlady is not the innkeeper“; T62 klappt es mit „innkeeper“.

Die NPCs besitzen bereits die passenden Beschreibungen (`old woman …`, `landlady …`). Die gespeicherte Angebots-ID verweist auf die richtige Person. Die zusätzliche Prüfung vergleicht jedoch mit dem kurzen Rollenlabel. Direkte Funktionssonden auf Originalzuständen reproduzieren beide Ablehnungen; bei unveränderter Angebotsidentität ohne das widersprechende Kurzlabel bestehen die übrigen Prüfungen.

**Bewertung:** Kein vernünftiger menschlicher Spieler muss eine Gastwirtin erst „innkeeper“ statt „landlady“ nennen. Das ist eine Engine-Fehlablehnung, kein wünschenswerter Bedienstandard. Identität anhand der vorhandenen eindeutigen Person/Angebots-ID und etablierten Beschreibungen prüfen; tatsächlich andere Empfänger weiter ablehnen. Keine neue freie Synonymliste und kein pauschales Entfernen der Gegenparteiprüfung.

### D – Hoch für Guild-Progression: Singular/Plural lässt gültige Tagesboards scheitern

**Original:** Alle vier Boardabfragen brauchen Repair. T4 und T30 veröffentlichen danach fünf Angebote, T18 und T59 bleiben erfolglos.

- T18, Calls48/49: gespeicherte Art **`boars`**, neu gemeldete Art **`boar`**. Anchor, Ort und Level4–7 stimmen. `guild.js::habitatWhy()` vergleicht `normText(population.species)` strikt und meldet einen Populationskonflikt. Der Repair korrigiert stattdessen `life_stage`, nicht den wirklichen Konflikt.
- T59, Call178: erneut `boar`/`boars`, außerdem `bog strider`/`bog striders`. Der Repair Call179 entfernt dann drei benötigte Habitatdeskriptoren und macht aus drei gültigen Angeboten nur noch zwei.
- Read-only-Sonden mit Originalvorzuständen und `parseBoard()` ergeben Call48/49 jeweils **4 gültige**, Call178 **3**. Ausschließlich die Artwörter auf die bereits etablierten Pluralformen zurückgesetzt: jeweils **5 gültige**, keine weiteren Änderungen. Call179 bleibt wegen fehlender Habitate ungültig.

**Bewertung:** Die Sperre gegen Umdeuten einer Population ist sinnvoll, der grammatische Numerus allein belegt aber keine andere Population. Kleine bestehende Arten-/Populationsauflösung verwenden oder für bekannte Habitate deren kanonische Definition übernehmen; Anchor/Level/Alter/Ort unverändert prüfen. Repair soll das konkret widersprechende Feld mit erwartetem Wert nennen. Kein beliebiges Entfernen von `s` und kein Freigeben echter Populationskonflikte.

## 5. Was korrekt abgefangen wurde – und was nur erzählt wurde

| Stelle | Bewertung |
|---|---|
| T20 Peltpreis „Seven“ ohne eigene Währung | Bewusste S2-Einschränkung, kein neuer Parserfehler. T21 wiederholt der Händler „Seven silver“; danach +70 cp korrekt. |
| T41/T44 erzählter Schwertkauf | Kein gültiges Händlerangebot; neue Ware im PC-Inventar wird abgewiesen. Sicherheitsentscheidung richtig, Kaufnarration falsch. |
| T47 Angebot260 / T48 Kauf | Verbindlicher Enginepreis für Superior-F-Schwert **260 cp**, Guthaben **241 cp**: „not enough coin“ ist korrekt. Erzählte 180 cp überschreiben den Enginepreis nicht. |
| T50/T54–56 Rüstungsverkauf | Narrator behauptet Vollzug, Engine bucht nichts. Die fehlende Geldbuchung ist Folge von Befund B, kein Beleg für verloren gegangene gültige Zahlung. Ein gültiger Verkauf zu25 oder30 cp hätte die fehlenden19 cp gedeckt. |
| T16 Brot vor Rückreise | Extractor ordnet `arrive` vor dem zuvor erzählten Geschenk an, ohne frühere `scene`. Der Geber ist anschließend nicht lokal; Geschenk wird abgewiesen. Echter Chronologie-/Modellfehler, hier lokal auf ein Brot begrenzt und **nicht batch-blockierend**; Gildenabgabe +45cp funktioniert trotzdem. |
| T36 Geschenk vor Rückreise | Hier stehen Geschenk und Übergabe korrekt vor `arrive`; Gegenstand wird gebucht. Nur eine nach der Ankunft platzierte Erinnerung mit altem Schauplatz wird abgewiesen. |
| T28 Verlassen des Schmieds | Planner bucht keinen passenden GO für den lokal erzählten Ausgang; `arrive` wird abgewiesen, kanonisch bleibt der Spieler im Laden. Lokaler Bewegungs-/Modellkonflikt; nicht als neuer schwerer Reiseblocker belegt. |
| Gildenbelohnungen/Nachzählungen | Je Quest einmal45cp und115XP; keine doppelte Auszahlung durch Narrator/Extractor. |

**Kein Nachweis einer neuen .145-Regression:** Der Lauf benutzt .145, aber die belegten Handelsursachen liegen in vorhandenen Schnittstellen. Ohne gezielten Vorher-/Nachher-Vergleich darf man sie nicht den neuen Edit-/Fold-Sicherungen zuschreiben. Umgekehrt beweist dieser Lauf auch nicht die natürliche Qualität aller S1-Karten: Es wurde kein `#pay` ausgeführt. Die bisherige Hostabnahme bleibt davon getrennt.

## 6. Testspieler, Tempo und Balance

Der Spieler sucht tatsächlich Händler auf, verkauft Loot, kauft eine Rüstung, verteilt Statpunkte und kontrolliert HUD/Inventar. Das frühere Problem „er geht nie einkaufen“ trifft diesen Lauf **nicht**. T40–56 verbrauchen allein17 Eingaben für Schmiedbesuch, Reparaturversuche, Zustandsabfragen und erfolglose Ersatzverkäufe. Dazu kommt die frühere Schleife bei der alten Frau. Mehr Kaufzwang im Runner würde diese Situation eher verschärfen.

Eigene Fehlentscheidungen gibt es: T28 rechnet der Spieler159−140 bei20cp Reserve falsch; es fehlen nur1cp. Später hält er mehrfach an narrativen Kauf-/Verkaufserfolgen fest, obwohl HUD und Ablehnung widersprechen. T45 `#equipment` und T46 `#audit` sind dagegen sinnvolle Diagnosen. Ein lokaler Abbruch der Geschäftsversuche nach wiederholtem identischem Grund wäre besser als weitere Umformulierungen. Das ersetzt aber nicht die nachgewiesenen Enginekorrekturen B/C.

**Kein Anlass für eine XP- oder Klassenbalanceänderung:** Level3 nach63 Inputs wirkt langsam, aber es gab nur zwei L1-Gegner und zwei Questabschlüsse. Die350XP sind korrekt; der Großteil der zusätzlichen Eingaben erzeugt keinen vorgesehenen Kampffortschritt. Beide Kämpfe werden gewonnen, der zweite mit Cleave sofort. Das testet Einstiegsüberleben und grundlegenden Skill-PP, weder höhere F-Gegner noch den Weg zu Level15 oder Klassenevolution. Kein Dungeon betreten, Mage/Rogue nicht gestartet. Zweimal denselben Einstiegsauftrag an verschiedenen Tagen zu wählen ist zudem keine Aussage über den Ertrag der vorhandenen höherstufigen Jagden.

Die Welt erzählt frei weiter: Hilfe bei der Bauernfamilie, kostenlose Unterkunft und Essen, spätere Tagesarbeit. Eine formale Privatquest entsteht nicht. Die angekündigte Mauerarbeit wird vor dem Abbruch noch nicht ausgeführt oder bezahlt; daraus lässt sich keine Lohnbuchungsbewertung ableiten. Die Prosa ist anschaulich, verschlechtert aber den Spielfluss dort, wo sie technische Ablehnungen als künstliche NPC-Sturheit auslegt oder ungebuchte Käufe als erledigt darstellt.

## 7. Empfehlung für die nächste Entscheidung

1. **Ein begrenztes Handels-Integrationspaket** für kanonische Händlerreferenz/aktuelle Begegnung, Rollenalias-Annahme und Sheet-Item-Gebote. Die bestehenden Buchungsfunktionen, Endpreise, Zustimmung und Anwesenheitssicherheit erhalten. An den vollständigen Originalketten prüfen, nicht an zehn neuen englischen Betragsvarianten. Schwerpunkt: Rüstung verkaufen → ausreichendes Guthaben → Schwert260cp einmal kaufen; anschließend normal weiterspielen.
2. **Davon getrennt das kleine Boardproblem**: kanonische Population wiederverwenden beziehungsweise passende Artidentität erkennen und konkrete Repairdiagnose liefern. Original Calls48/49/178/179 plus tatsächlich andere Art/Anchor/Level als Gegenfälle.
3. **Kein weiterer vorsorglicher Finanzumbau, keine XP-/Gearpreisänderung und kein verschärfter Runner-Kaufzwang.** Die übrigen lokalen Prosa-/Geschenkverluste dokumentieren und tolerieren. Nach den ausgewählten Integrationskorrekturen wieder natürliche Daten sammeln.

Der manuelle Stopp ist nachvollziehbar: Der Zustand ist technisch fortsetzbar, aber die wiederholten Handelsblockaden sind häufig genug, um sie nicht als exotische Restunschönheiten abzutun. **Empfehlung: diese konkreten Schnittstellen beheben, nicht S1/S2 erneut grundsätzlich aufrollen.** Dieser Review implementiert nichts.
