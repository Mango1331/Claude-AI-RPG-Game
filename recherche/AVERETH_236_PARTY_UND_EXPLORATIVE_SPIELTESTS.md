# Avereth ab .236 – Partyorganisation, Dungeonzutritt und Spieltestserie

## Produkt und Nachweise

Die technische Ausgangsbasis ist [.235](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8750a97f5a986d328db4dc98a3a93d157925158c). Der finale Produktstand ist [.244](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/630abc2099b28155dae5ea573d0c8fbf08156086). **Empfehlung: GO für den unabhängigen Produkt-Diffreview, vorerst NO-GO für den allgemeinen persönlichen Usertest 17.** Im Gasthaus fallen Erzählort und tatsächlicher Aufenthaltsort beim Rückweg wiederholt auseinander. [Entscheidungsvorlage und Ausgangsbefunde](AVERETH_235_PARTY_GEGENREVIEW_UND_ENTSCHEIDUNGSVORLAGE.md)

| Build | Änderung | Nachweis |
|---|---|---|
| .236 | Ein ausdrücklich gewählter Eintritt durch einen Durchgang führt zum autorisierten ersten Abschnitt. Das Ziel „zum Eingang“ endet an der Grenze. Reservierte Gegner werden über ihre Slot-IDs wiederverwendet. | [6a35690b](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6a35690bb4ed347ad0ce1ffbead13c1f314760c0) |
| .237 | Eine Einladung mit unbekannter Bereitschaft erhält eine kompakte NPC-Entscheidung. Wer zustimmt, wird mit derselben NPC-ID aufgenommen. Ein abweichendes Entgelt bleibt als Angebot offen. Warten, Folgen, Entfernen und Auflösen buchen die vorhandenen Partyereignisse. | [8ad02acf](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8ad02acfd0c5f2b8a92a6c27cc6d8d9695211637) |
| .238 | Das lokale Partyfenster zeigt anwesende Kandidaten, offene Angebote und mögliche Mitgliederaktionen. Die Schaltflächen verwenden dieselben Unterbefehle wie die Texteingabe. Ein vorbereiteter Entwurf bleibt erhalten. | [200d9ccc](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/200d9ccc40612073f752eca3342f3847a78bc913) |
| .239 | Tatsächliche Arbeit speichert Standardberechtigte im vorhandenen Questereignis. Beim erfolgreichen Turn-in werden Sonderansprüche berücksichtigt und der verbleibende Lohn einmal geteilt. Die bestehende Zahlung bucht für Anwesende, eine offene Forderung bleibt für Abwesende bestehen. Sachbeute und persönliche Ausrüstung behalten ihre Eigentümer. | [6e62ea10](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6e62ea10c0dd6135f71fbe9248a622a4eea079d6) |
| .240 | Die strukturierte Entscheidung kann auch die expliziten ursprünglichen Konditionen aus AI/AJ beantworten. Beim Beitritt steht die Mitgliedschaft fest, bevor die Engine aus belegter Ausbildung das erste Sheet bildet. Das erhält Ossens bekannte Scout-Ausbildung. | [7be0dbdc](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7be0dbdcda453a7fd2649bea695ad7b0306f9df5) |
| .241 | Die vollständige Y-Vorgeschichte zeigte eine Lücke zwischen internem Gegnerkatalog und ausgeliefertem Narratorblock. Die beobachteten Individuen stehen jetzt direkt beim Standort. Der Extractor erhält dieselben IDs, Status, HP und die mechanische Bewaffnung. | [1f07a4a3](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1f07a4a38173b6c65c17b73f0bd9928255b758d8) |
| .242 | Eine vollständige, klar abgegrenzte JSON-Antwort in einem Markdown-Codeblock kann die Einladung beantworten. Gebühren aus alten Gesprächen werden bei einer gewöhnlichen aktuellen Einladung nicht übernommen. | [d125bd51](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d125bd512ff8603961c4ca445490ed8e77674b42) |
| .243 | Wer am bereits beobachteten Tor ausdrücklich eintritt, erhält in GO, N und X dieselbe erste Sektion. Die bestehende Zutrittsprüfung gilt auch hier. Eine als Eintritt gemeldete Rückkehr zum Ausgangspunkt löst die bestehende semantische Rückfrage aus. | [ece93907](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ece9390771f77dc8ae27d05c9bd4643f2f6aefc4) |
| .244 | Der Planner sieht Zahlungszweck, Gläubiger und Forderungs-ID zusammen. Das Partyfenster bezahlt einen ausgewiesenen Restbetrag lokal. Über `#party pay <Forderungs-ID> <cp>` ist auch eine Teilzahlung möglich. Beide Wege verwenden `payClaim` mit Besitz-, Anwesenheits-, Restbetrags- und Revisionsprüfung. | [630abc20](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/630abc2099b28155dae5ea573d0c8fbf08156086) |

## Kostenlose Gegenproben

- **AA1.** Der Replay liest alle Nachrichten des Y-Elternlaufs und prüft Nachrichtenzahl, letzte Rolle und den vollständigen gefalteten Zustand gegen das archivierte Ende. Mit ursprünglichem Planner und ursprünglicher Extraktion führt der erklärte Eintritt nach `loc.mossback_warrens.l1_s1`. Die kontrollierte Variante mit dem Eingang als Ziel endet bei `loc.mossback_warrens`. Der an den Host übergebene Narratorblock und der tatsächliche Request an den Mock-Extractor enthalten dasselbe tote Individuum mit 0 HP und das weiterhin lebende zweite Individuum. [Y](../testrun_10b/openrouter-20261127-y-234/) · [AA](../testrun_10b/openrouter-20261127-aa-234/)
- **AI/AJ.** Auf dem Originalzustand vor der Einladung sind freiwillige Zustimmung, Ablehnung und Gegenforderung getrennt geprüft. Die gewöhnliche native Einladung benötigt einen NPC-Aufruf, eine Freitexteinladung zusätzlich den Planner. Ein fremder NPC, eine alte Einladungs-ID, eine erweiterte Antwort oder ein Chatwechsel löst keine Aufnahme aus. Regenerate verwendet den gebuchten Datensatz erneut. [AI](../testrun_10b/openrouter-20261127-ai-235/) · [AJ](../testrun_10b/openrouter-20261127-aj-235/)
- **AK.** Ein gebuchtes Warten hält Ossen in der Gilde. Auf dem Markt bleibt er abwesend. Ein dortiger Folgeversuch verschiebt ihn nicht. Alarics tatsächliche Rückkehr macht denselben Ossen wieder ansprechbar. Folgen und Auflösen erhalten dessen HP. Die beiden Reisezüge verwenden die archivierten Eingaben und Modellantworten. [AK](../testrun_10b/openrouter-20261127-ak-235/)
- **User14.** Die Standardgruppe durchquert die Katakomben mit eigenen Kampfzügen, gemeinsamer Reise und Rast. Beim regulären Abschluss entstehen 225/225 Quest-XP und 45/45 cp. Dieselbe Mitgliedschaft besteht bei der Annahme des nächsten Auftrags fort. Im getrennten Altvertragslauf ergeben der Vorschuss von 20 cp und die Abschlusszahlung von 25 cp insgesamt 45 cp. Eine synthetische Dreiergruppe teilt 91 cp in 31/30/30. Ein ausgeschiedener Abwesender behält 30 cp, Teilzahlung und erneutes Abrechnen erzeugen keine zweite Auszahlung. [User14](../testrun_10b/user-20261126-010332-215/)

## Getrennte Kostenrechnung

Die vorherige Serie verbrauchte 1,047038056 USD. Die neue Serie beginnt mit einem eigenen leeren physischen Requestjournal. Der Prüfproxy reserviert vor jeder Anfrage den gesamten Kontext der festgelegten Providerroute zum Preislimit sowie die maximal erlaubte Ausgabe. Seine Ausgabeschwelle von 0,95 USD lässt zusätzlich Abstand zum harten Auftragslimit von 1,00 USD. Eine fehlende endgültige Kostenbestätigung sperrt die nächste Anfrage. Der erste Elterncheck ergibt 15 Nachrichten und den Weltzustand `11aacbfc4e1fd03379e71d9cd8345ffedb3ceb7855031c73dd40d8da115dc7d7`.

## Mechanischer Weg und Altstände

Die nativen Unterbefehle von `#party` und die Schaltflächen im vorhandenen Partyfenster teilen sich `src/v4/party_actions.js`. Die Ansicht liest lokal. Ein Mitglied wartet bei sicherem Standort, folgt nach tatsächlichem Wiedersehen oder scheidet aus. Auflösen umfasst alle aktiven Mitglieder. Bei einem unbekannten Einladungsentscheid sendet die native Einladung genau einen strukturierten NPC-Request. Freitext kann einen Planner benötigen. Die Antwort bindet Identität, Einladung und Entscheidung. Das Ergebnis wird im selben Revisionsdatensatz wie die mechanische Mitgliedschaft gespeichert. Ungültige Antworten erzeugen keine Mitgliedschaft. Eine gleichbleibende abgelehnte Situation bietet keine beliebig wiederholbaren Chancen. Eine freie Erzählung und erneute Extraktion entfallen beim gewöhnlichen Beitritt. Der beschränkte strukturierte Gegenforderungspfad unterstützt einen festen Betrag aus einer passenden Quest. Weitere besondere, tatsächlich belegte Vereinbarungen laufen über das vorhandene System.

Die Engine verwendet weiterhin `party.agreement`, `party.member`, NPC-Sheets, Besitzinstanzen, Kampfbeteiligung und Save. Es gibt einen Ausgangseintrag für die Einladung, keinen neuen Vertrag für jede Folgequest. `quest.party_work` vermerkt berechtigte Standardmitarbeiter. `party.claim` und die bestehende Transaktion unterscheiden fälligen und tatsächlich bezahlten Betrag. Bestehende besondere Abreden haben Vorrang. Bereits gefaltete Saves mit alten Mitgliedschaften, Vorschüssen und Forderungen behalten ihre Identitäten. Es gibt keine rückwirkende Rekrutierung erzählter Begleiter. Sprecher- und Besitzbelege schützen weiterhin individuelle Herausgaben, Kapitulation und echte Neuverhandlungen. Die neue Organisation verändert keine autonome Kampftaktik.

Die Regressionscommits [d41bc9b0](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d41bc9b0) und [27334c48](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/27334c48) trennen alte Angebotsproben vom neuen Protokoll und prüfen zusätzliche Abrechnung und Auflösung.

## Modellläufe und Messwerte

Die zehn getrennten Archive enthalten Originalchat, Spieleraktionen, Events, vollständige physische Anfragen und Antworten, ST-Log, Elternprüfung, Endsave und SHA-256-Manifest. Vor der ersten kostenpflichtigen Anfrage hat die Steuerung den JSONL-Header getrennt, Anzahl und letzte Nachricht einschließlich Rolle geprüft und den gesamten gefalteten Startzustand mit dem Elterncheckpoint verglichen. Bei Vale blieb der fehlgeschlagene Bedienversuch getrennt von den 15 gespeicherten Spielzügen. Die alternativen Fortsetzungen beginnen am bezeichneten Stand und zählen frühere Ausgaben nicht nochmals. [Nachprüfbares Offline-Prüfprogramm](party_236/verify_series.mjs) · [Messwerte, Zustandsübergänge und Laufzeiten pro Run](party_236/messwerte.json)

| Lauf | Gesicherte Nachrichten Anfang → Ende | Physische Aufrufe | Input- / Outputtokens | USD |
|---|---:|---:|---:|---:|
| [Ember-241](../testrun_10b/openrouter-20261127-ember-241/) | 15 → 19 | 2 | 14.653 / 134 | 0.000640082 |
| [Vale-242](../testrun_10b/openrouter-20261127-vale-242/) | 15 → 45 | 41 | 557.492 / 15.979 | 0.026057520 |
| [Moss-242](../testrun_10b/openrouter-20261127-moss-242/) | 45 → 77 | 38 | 509.218 / 12.690 | 0.023407236 |
| [Slate-242](../testrun_10b/openrouter-20261127-slate-242/) | 43 → 45 | 3 | 40.269 / 2.493 | 0.002150010 |
| [Flint-243](../testrun_10b/openrouter-20261127-flint-243/) | 43 → 47 | 7 | 97.319 / 2.731 | 0.004547406 |
| [Hearth-243](../testrun_10b/openrouter-20261127-hearth-243/) | 53 → 89 | 41 | 589.614 / 18.100 | 0.027707628 |
| [Rowan-244](../testrun_10b/openrouter-20261127-rowan-244/) | 61 → 87 | 37 | 533.228 / 13.098 | 0.024417000 |
| [Lantern-244](../testrun_10b/openrouter-20261127-lantern-244/) | 79 → 87 | 15 | 213.401 / 5.888 | 0.009880346 |
| [Quill-244](../testrun_10b/openrouter-20261127-quill-244/) | 83 → 93 | 10 | 139.102 / 2.555 | 0.006208724 |
| [Ash-244](../testrun_10b/openrouter-20261127-ash-244/) | 15 → 19 | 1 | 248 / 31 | 0.000016120 |

| Gemeldete physische Rolle | Requests | Input | Output | Median Laufzeit |
|---|---:|---:|---:|---:|
| extractor | 73 | 1.164.339 | 41.345 | 3.90 s |
| narrator | 54 | 663.827 | 25.190 | 5.01 s |
| party_decision | 3 | 756 | 106 | 0.78 s |
| planner | 65 | 865.622 | 7.058 | 1.22 s |

**Gesamt: 195 abgerechnete physische Anfragen, 2.694.544 Inputtokens, 73.699 Ausgabetokens und 0,125032072 USD.** Verbliebener Spielraum dieses Auftrags: 0,874967928 USD. Die archivierten Endabrechnungen decken alle Anfragen einschließlich Reparaturen ab. Bei der Archivprüfung stimmten 351 Dateiprüfsummen, alle zehn Elternstände und sämtliche gespeicherten Endzustände. Die Tabelle zählt Repair zur jeweiligen physischen Rolle. Bei Hearth lag der Median je Eingabe einschließlich Speichern und kontrolliertem Reload bei 13,74 s, bei Rowan bei 16,54 s. Die erste sichtbare Prosa kam bei den jeweils sieben messbaren Erzählzügen im Median nach 7,38 s bzw. 7,19 s. Die kleinen Stichproben enthalten unterschiedliche Handlungen. Die lokale ST-Steuerung schickte die Requests nacheinander an die festgelegte Route `z-ai/glm-5.3-flash` auf `wafer/us` mit niedrigem Reasoning. Die Laufzeiten sind Requestmediane. Die JSON-Auswertung enthält zusätzlich die beobachteten UI-Zeitpunkte sowie die Dauer bis zur erneuten Prüfung des Saves. Die Preise und Laufzeiten gelten für diese Serie.

Der direkte Vergleich ist beim Anwerben am aussagekräftigsten. Ash benötigte mit dem HUD **eine** NPC-Anfrage mit 248 Input- und 31 Ausgabetokens. Vale benötigte für die freiwillige Freitexteinladung Planner und NPC-Entscheidung. Die Verwaltung in Rowan einschließlich Zahlung des Restbetrags erzeugte für die entsprechenden nativen Klicks **null** Requests. Die große verbleibende Promptlast liegt bei den normalen Spielzügen mit Weltabgleich. Ein anderer Provider oder eine andere Modellgröße wurde mit dieser Serie nicht verglichen.

## Was im tatsächlichen Spiel gebucht wurde

| Situation | Nachweis im Save und Grenze der Aussage |
|---|---|
| Natürliche Aufnahme und Organisation | Ember zeigte die geerbten Gebührenfelder und die verworfene, eingerahmte JSON-Antwort. Vale nahm Ossen mit derselben Spielerabsicht auf, ließ ihn warten, ging allein zum Markt, traf ihn wieder und setzte die Reise mit ihm fort. Ash bestätigt die direkte Einladung und das Entfernen per HUD. Die synthetischen Ablehnungs-, Gegenangebots-, Fremd-ID- und Dreiergruppenfälle sind gesonderte Offlinebelege. |
| Gemeinsamer Dungeonauftrag | Über Vale und die verifizierte Fortsetzung Moss kämpften beide durch die erste Ebene. Ossen nutzte eigene Aktionen und MP, unter anderem Flame Lance und Arcane Ward. Die Ereignisse enthalten individuelle Skill-Proficiency und Levelaufstiege. Für drei Siege entstanden je Figur 90, 270 und 270 Kampf-XP. Die Warden-Trophäe hat eine Objekt-ID und einen Träger. Das Quest-Turn-in erzeugte einmalig 90 cp für den Auftrag und davon 45 cp für Ossen sowie je 225 Quest-XP. |
| Zweite Unternehmung | Dieselbe Gruppe nahm den Mühlteichauftrag an. Alaric verteilte drei Statpunkte. Die Gruppe reiste zum lokalen Habitat und traf drei tatsächliche Schildkröten. Die Bitte, die „nächste“ anzugreifen, war bei gleicher Distanz mehrdeutig. Die Steuerung wiederholte sie mehrmals. Zwei Gegner starben, danach starb Alaric. Der überlebende Ossen erhielt 560 Kampf-XP. Dieser Auftrag wurde nicht erfolgreich abgegeben. |
| Zeit und individuelle Erholung | Gebuchte Reiseabschnitte enthalten `resource.changed` für die tatsächlichen Mitreisenden. Vale erlebte ein Rast-PULSE. Moss setzte auf dem unveränderten Stand mit lokal gebuchter Rast fort. In Hearth brachte die ausdrücklich gewählte halbe Stunde nach dem Zimmerkauf Alaric von 71 auf 75 HP und von 27 auf 32 MP, Ossen von 65 auf 70 HP und von 120 auf 132 MP. |
| Abwesender Gläubiger | Hearth ließ Ossen per HUD am Markt warten. Die alleinige Abgabe legte eine offene Forderung von 45 cp an. Wiedersehen am Markt mit derselben NPC-ID. Hearths erste natürliche Zahlung kam mangels referenzierter Forderung nicht zustande, beim zweiten Versuch entstand ein gewöhnlicher Zahlungsweg. Rowan buchte am identischen Ausgangsstand mit dem ersten Originalsatz 20 cp. Der HUD-Klick zahlte 25 cp nach. Alarics Guthaben sank von 120 auf 75 cp, Ossens stieg von 0 auf 45 cp. |
| Mossback-Tor | Auf dem vollständigen Y-Endstand stimmten Erzählung und erster neuer Raum in Slate noch nicht überein. Der Extractor meldete den Dungeonstamm. Flint buchte mit derselben Spielerwahl die erste Kammer. Das zweite Individuum war mit derselben ID dort anwesend, das erste blieb tot. Der folgende Wahrnehmungszug spielte am gespeicherten Standort. N und X erhielten den tatsächlichen Bestand. Die abweichende literarische Bewaffnung blieb ein gesonderter Befund. |
| Von der Beute zur Ausbildung | Rowan verkaufte das erste Knochenstück für 4 cp. Bei 79 cp fehlte 1 cp für den Heilprimer. Für ein zweites Stück entstand ein konkretes Gebot über 3 cp. Freitext löste eine Klärung aus. Quill bestätigte dasselbe Gebot im HUD, hatte anschließend 82 cp, kaufte das Buch im Gilden-HUD für 80 cp und las seinen individuellen Gegenstand über `#item`. Eine halbe Stunde Studium brachte **6 von 100 Lernpunkten**. Der Skill war zu diesem Zeitpunkt noch nicht erlernt. |
| Markt, Gespräche, Unterkunft | Der Junge am Brunnen verwies Alaric an The Slaked Lime. Das Zimmer kostete 10 cp. Zimmerzugang und Buchung der Unterkunft sind im Save nachvollziehbar. Eine Erzählung über Suppe führte in der anschließenden widersprüchlichen Ortssituation zu keiner bezahlten Mahlzeit. Der Alleingang von Lantern zum Markt gelang und eröffnete den Kontakt zur Händlerin. |

## Exploratives Spiel und nächste Fachentscheidung

**Was sich bereits wie ein zusammenhängendes Abenteuer spielt.** Ein Dungeonfund hatte später einen anderen Wert als seine Kampfwerte. Der Spieler konnte ein Stück verkaufen, ein zweites verbindliches Gebot suchen, den Erlös für ein konkretes Lernziel einsetzen und erste Fortschritte sehen. Eine feste Preistabelle oder ein automatischer Verkauf sämtlicher Funde hätte diese Entscheidung entwertet. Ebenso blieb Ossen nach der Quest eine Figur mit eigenen Ressourcen und Ansprüchen. Die erste Aufgabe der Gruppe bestimmte ihre nächste Unternehmung nicht mehr.

**Was tatsächlich Arbeit verursacht.** Die Steuerung musste nach einer klaren freien Verkaufsannahme in Rowan auf das bereits vorhandene Handels-HUD zurückgreifen. Damit war der Verkauf möglich. Die Existenz eines firm gebundenen Gebots und der unmittelbar verfügbare Abschluss sollten im Spiel besser sichtbar sein. Für gleich weit entfernte Kampfziele wäre ein direkter Verweis auf die konkret auswählbaren sichtbaren Ziele hilfreicher als eine weitere allgemeine Klärung. Das gilt besonders vor einem gefährlichen Zug wie in Moss. Diese beiden Vorschläge verwenden bereits vorhandene Daten und brauchen keinen Modellaufruf. Ein zusätzlicher automatischer Angriff auf irgendeinen „nächsten“ Gegner würde dem Spieler eine relevante Zielwahl abnehmen.

**Offener, spielrelevanter Ortsbefund.** Hearth 15 wählt die Rückkehr aus dem eigens gespeicherten Schlafzimmer zur Gaststube. P liefert `go.to.scene`, die Engine autorisiert einen Standpunkt im Schlafzimmer, N erzählt den Abstieg. Die folgenden Extraktionen verwerfen lokale Folgen am anderen Ort. In Hearth 16 liefert P bei gemeinsamem Aufbruch zum Markt ein leeres Kommandoarray. Die erzählte Händlerin ist im Save außer Reichweite. Lantern 1 und 2 bestätigen vom vollständigen Stand nach Zimmerkauf denselben Konflikt sogar beim ausdrücklich genannten Elternort. Im abschließenden Zug ist eine andere gewöhnliche Reise aus dem Zimmer mechanisch erfolgreich. Eine universelle Reisesperre ist damit widerlegt. Der Schutz vor der Abbuchung für eine abwesende Gegenpartei hat in diesen Fällen funktioniert. [Hearth](../testrun_10b/openrouter-20261127-hearth-243/) · [Lantern](../testrun_10b/openrouter-20261127-lantern-244/)

Die größere Entscheidung betrifft, welche Orte eine eigene ID und einen eigenen Personenbestand brauchen und wie eine freiwillige Bewegung zwischen zwei bereits bekannten, verschachtelten Orten gewählt wird. Die vorhandene Dungeonkarte (`#map`) und die Party- und Handelsfenster bieten für einen gewöhnlichen, bereits gespeicherten Innenraum keinen direkten Rückkehrknopf. Ein kontextbezogenes „zurück zur Gaststube“ auf derselben GO-Autorität wäre für einen vorhandenen, begehbaren Rückweg überschaubar und ohne regulären zusätzlichen Planner möglich. Ein Freitextweg braucht dieselbe nachvollziehbare Auswahl von Ziel und Übergang. Ein im Schlafzimmer gewählter Blick zum Fenster, der Gang zur Gaststube, die Rückkehr zum Markt und der Zugang zu einem Dungeon unterscheiden sich in ihren Folgen. Das pauschale Hochstufen jedes erwähnten Elternorts, eine Mahlzeit allein aus der Prosa oder eine Wortausnahme für „downstairs“ würde diese Grenzen aufheben. Vor einem Umbau sollten Nutzer und GPT das gewünschte Spielgefühl zwischen Karte, kurzem Ortswähler und freiem Text festlegen. Abnahme: Zimmer kaufen, später selbst hinuntergehen, dieselbe Wirtin antreffen, dieselbe Mahlzeit genau einmal bezahlen, anschließend allein oder gemeinsam zum Markt gelangen.

**Weitere Grenzen.** Die erwähnten Waffen können in der Prosa vom Sheet abweichen. Ossens ausgerüsteter Stab und die mechanischen Waffen der beiden beobachteten Gegner waren im ausgelieferten Kontext vorhanden. Eine zusätzliche Bestätigungsrunde pro Narration hätte laufende Kosten und löste den konkreten Ortsbefund nicht. Taktik, private Abreden, Kapitulation und Dreiergruppen sind technisch geschützt. Diese Serie belegt keinen neuen natürlichen Kapitulationsabschluss oder kompletten Durchlauf mit drei Mitgliedern. Auch der eigentliche Erwerb von Mend nach 100 Lernpunkten und ein erfolgreicher zweiter Questabschluss bleiben vom hier nachgewiesenen Spielverlauf getrennt. Die bereits verfügbaren Kauf-, Lern- und Partnermechaniken rechtfertigen aus diesen Fällen kein neues Gruppeninventar, Charismaattribut oder allgemeines Vertragssystem.

## Technische Abnahme und Übergabe


| Prüfung auf dem finalen Produktcommit | Ergebnis |
|---|---|
| Vollständige Node-Suite | **3.609/3.609 bestanden**, null übersprungen. [Testausgabe](party_236/node-suite.log.gz) |
| Historische Replay-Suite | **2.235 Fälle** gegenüber der unveränderten Basis. 1.386 historisch genehmigte Abweichungen entsprechen exakt den akzeptierten Ausgaben. Keine neue Abweichung und keine Fingerprintaktualisierung. [Replay-Ausgabe](party_236/historische-replays.log.gz) |
| User15 auf .235 und .244 | Alle **108** normalisierten Ereignisfolgen stimmen direkt zwischen beiden Produktständen überein. Je 30 Plannerrequests, 45 Narratorkontexte, 45 Extraktionen, fünf X-Repairs und zwei Boardrequests. Über die 30 Plannerrequests zusammen 4.320 Zeichen zusätzlich, im Mittel 144 Zeichen. Die Längen der anderen Kategorien sind identisch. Das sind Offline-Zeichenmessungen mit Originalantworten. [Vergleich je Nachricht](party_236/user15-vergleich.json) |
| Persönliche Originale und Party-Kampagne | User13-Kapitulation und persönliche Besitzgrenzen, User14 mit Standard- und Vorschussabrechnung, User16-Szene und Erinnerung, AI/AJ/AK, vollständiges Y, Slate und die Hearth-Forderung liefen im Offline-Produktpfad. Einbezogen sind alte Saves, wiederholte Abgabe, Unterbrechung, Wiederaufnahme und revidierte Eingaben. [Protokoll](party_236/originalgegenproben.log.gz) |
| Isoliertes SillyTavern 1.19 | Party 44/44, Szene 33/33, Handel 41/41, Streaming 59/59. Beim Speicherlauf bestanden zuerst 59/60. Die Browserkonsole meldete einmal „Stale origin or records before write“. Beim unveränderten Wiederholungslauf bestanden 60/60. Der erste Fehler blieb archiviert. Ein zuvor belegter lokaler Testport betraf nur den Start des Testprofils. [Einzelprüfungen inklusive Erstversuch](party_236/st-pruefungen.json) |

Die fachliche Basis war Produkt `8750a97f5a986d328db4dc98a3a93d157925158c`. Der am Remote bestätigte Kandidat auf `experiment/211-openrouter-helper-single-runner` ist `630abc2099b28155dae5ea573d0c8fbf08156086`. Alle Zwischenstände wurden regulär gesichert. Der zuletzt vor dem Berichtscommit bestätigte Archivstand auf `main` ist `1a4c8abade34c97dae21920f482fe536c8e10d9a`. Die eingefrorene Produktlinie .200 steht auf `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`, der Kontinuitätsvergleich auf `c2ddc780d4c57b219f9cd7a1d134efceca7e459d`.

**Entscheidung:** Die neue Party und die korrigierte Dungeonsektion sind bereit für den unabhängigen GPT-Produktdiff. Für einen allgemeinen persönlichen Usertest 17 empfehle ich **NO-GO**, bis der wiederholte Verlust gewöhnlicher Innenraumbewegungen fachlich beurteilt ist. Der konkrete nächste Review sollte Hearth 15–17 und Lantern 1–4 mit dem positiven Gegenbeispiel Flint vergleichen. Das verlangt keine erneute Öffnung der Kampf-, XP- oder Eigentumsregeln. Die zehn Modellläufe decken gemeinsame und getrennte Abenteuer, Gefahren, Schuld, Markt, Unterkunft und Ausbildung ab. Weitere Wiederholungen allein zur Ausschöpfung des Budgets bringen für diese Entscheidung wenig zusätzliche Evidenz.

## Installation ab persönlichem Build .220

SillyTavern schließen, den eigenen Save sichern und die Extension aus dem angegebenen Produktcommit aktualisieren. Am einfachsten den vollständigen Ordner `avereth-engine` als zusammengehörigen Stand in das bestehende Extension-Verzeichnis kopieren. Typische Ziele sind `SillyTavern/data/<user>/extensions/avereth-engine/` und bei globaler Installation `SillyTavern/public/scripts/extensions/third-party/avereth-engine/`. Wer nur die geänderten Laufzeitdateien ersetzt, benötigt die folgenden Pfade relativ zur Extension. Danach ST starten, den Browser vollständig neu laden, die Buildanzeige und das lokale Partyfenster prüfen. Card, Preset, separat installierter Narrator Contract, Regex und Lorebook benötigen keinen erneuten Import.

- `content/commands.json`
- `content/deltas.json`
- `manifest.json`
- `package.json`
- `src/action_composer.js`
- `src/context.js`
- `src/delta.js`
- `src/hud.js`
- `src/party.js`
- `src/party_rewards.js`
- `src/state.js`
- `src/threads.js`
- `src/util.js`
- `src/v4/agency.js`
- `src/v4/catalog.js`
- `src/v4/commands.js`
- `src/v4/delivery.js`
- `src/v4/extract.js`
- `src/v4/interpret.js`
- `src/v4/living.js`
- `src/v4/loot.js`
- `src/v4/narration_evidence.js`
- `src/v4/narrator_stream.js`
- `src/v4/ownership.js`
- `src/v4/party_actions.js`
- `src/v4/planner.js`
- `src/v4/pulse.js`
- `src/v4/runtime.js`
- `src/v4/travel_continuation.js`
- `src/v4/turn.js`
- `src/v4/world.js`

[Gesamtdiff seit .235](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/8750a97f5a986d328db4dc98a3a93d157925158c...630abc2099b28155dae5ea573d0c8fbf08156086) · [Installationsdiff seit .220](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/cc327a1ae44b0aac3605f416078c693b2600ffff...630abc2099b28155dae5ea573d0c8fbf08156086)
