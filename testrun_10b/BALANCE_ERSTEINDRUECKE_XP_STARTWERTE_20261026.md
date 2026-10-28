# Avereth – gemeinsame Balancebewertung und nächste F-Balancerunde

**Stand: 28.10.2026 · Produktbasis `.113` / `55c547f`.** Zusammenführung von Sols Neubewertung und dem vom Nutzer übermittelten GPT-6-Review `Chatgpt Feedback(20261028-161936).md`. **Die nachfolgenden Versuchswerte sind konkrete Umsetzungsempfehlungen, noch keine geänderten Produktwerte oder neue Kanonentscheidungen.** Auftrag dieses Standes: Reviews zusammenführen, Dokumentation aktualisieren und Änderungen empfehlen; keine Engineimplementierung.

**Aktuelle Hauptquelle für die Balancebewertung ist diese Datei.** Die [vorherige Fassung mit frühen Eindrücken und Run-20-Originalprüfung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a1cb7976b41f3e761ba125d7eff53d43a395e1a0/testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md) bleibt als datiertes Archiv erhalten. [Sol-Scalingentwurf](ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md) und [GPT-Scalingstudie](scaling_gpt.md) enthalten weiterführende F/E-Alternativen auf Basis `.95`, keine aktuelle Ist-Beschreibung sämtlicher Systeme.

## 1. Gemeinsames Urteil und Korrekturen zwischen den Reviews

**F ist im frühen und mittleren Bereich inzwischen spielbar. Die nächste Arbeit soll tatsächlich Balance und interessante Entwicklung verändern, statt nur weitere technische Sicherheitsfälle zu sammeln.** Die größte offene Verbindung liegt zwischen bewältigten Abenteuern, verfügbarem Geld und spürbarer Ausrüstungs-/Skillentwicklung. Auf weitere Level-15-Daten muss eine erste F-Balancerunde nicht warten.

| Aussage | Zusammengeführte Bewertung |
|---|---|
| XP ×2 und Startstats7 zurücknehmen oder nochmals erhöhen | Beides derzeit nicht begründet. Vorläufig behalten; kein kontrollierter A/B-Nachweis ihrer isolierten Wirkung. |
| Außerhalb Dungeons gibt es fast nur Level1 | Für neue Jagdpopulationen überholt. `.96` verbindet Jagden und gespeicherte Habitatfenster; aktuelle Originalgegner erreichen tatsächlich höhere F-Level. |
| Alle F-Level4–14 seien schon natürlich abgenommen | Zu weit. Level4–7 sind belegt; obere Angebote existieren, aber eine tragfähige natürliche Level9–14-Laufbahn fehlt. |
| Gear und Lernen funktionieren nicht | Nicht nachgewiesen. Viele Spieler versuchen entsprechende Käufe/Trainings gar nicht. Dennoch ist ihr geringer Beitrag zur erlebten Entwicklung ein relevantes Designproblem. |
| Proficiency-P2 spart bei Bolt wegen Rundung nichts | **Im neuen GPT-Review veraltet:** `.96` behebt dies für F-Progressionskampagnen. Bolt kostet dort P1–P5 **10/9/9/9/9 MP**. Kein zweiter Rundungsfix nötig. |
| Es entstehen keine neuen Entwicklungen | Falsch als Pauschalaussage: P4, Rare-Passives und aktive Entwicklungsangebote sind natürlich belegt. Selten sind neue tatsächlich erlernte und genutzte aktive Techniken. |
| Viele Siege belegen zu schwache Monster | Nein. Auswahl, Rückkehr, Erholung und vorzeitig gestorbene Kampagnen verzerren eine Siegquote. Gruppen bleiben gefährlich. |
| Man müsse vor jeder Änderung erst obere F-Kämpfe abwarten | Zu zurückhaltend. Größere Waffenunterschiede, bessere Angebote und kürzere Entwicklungswege können jetzt bewusst als Versuch umgesetzt werden. |

Kein Klassenranking: Unterschiedliche Gegner, Seeds, Aufträge und Spielentscheidungen erklären einen erheblichen Teil der unterschiedlichen Endlevel. E bleibt als anschließendes Fachgebiet vorgemerkt, ist keine Voraussetzung dieser F-Runde.

## 2. Belastbare Beobachtungen

| Kampagne | Inputs / Endlevel | Kampf-XP / Quest-XP | Begonnene Kämpfe / Guildabschlüsse |
|---|---|---|---|
| `.95` Mage, Run20 | 252 / L8 | 1.636 / 1.488 | 30 / 10 |
| `.106` Warrior | 250 / L7 | 1.892 / 692 | 16 / 4 |
| `.106` Mage | 250 / L10 | 3.580 / 1.790 | 23 / 11 |
| `.112` Warrior | 80 / L6, Tod auf E-Ebene | 1.080 / 692 | 10 / 4 |
| `.113` Warrior | 150 / L9, Inputlimit | 2.660 / 1.080 | 14 / 4 |
| `.113` Mage | 77 / L5, Kampftod | 786 / 272 | 7, davon6 gewonnen / 3 |

Quellen: [Run20](20261026-063907Z-current_test/REVIEW.md), [.106/GPT](batch-20261028-051913Z/REVIEW.md), [.106/Sol](batch-20261028-051913Z/SOL_COUNTERREVIEW.md), [.112](batch-20261028-111133Z/REVIEW.md), [.113](batch-20261028-140431Z/REVIEW.md). Ältere Quellen wurden gezielt verglichen, nicht sämtliche historischen ZIPs nochmals ausgewertet. Die `.113`-Originalevents wurden zusätzlich selbst gefaltet und ausgewertet. Dessen ZIP liegt als Chat-Anhang vor, nicht auf GitHub; SHA-256 `1b3003e58a8c214eb689a1b794c4c4982c914ce6116f1066ae713736a574db84`.

- **Fortschritt:** `.113`-Warrior erzielt3.740 XP, also35,6% der10.500 XP bisL15. Von150 Eingaben berühren37 einen Kampf. Reise, Erholung, Verkauf und Gespräche sind deshalb nicht automatisch113 verlorene Eingaben. L10 ist kein belegtes Fortschrittslimit; mehrere Runs endeten am150-/250-Input-Limit.
- **Weltgefahr:** Alle22 Gegner dieses Warriors liegen aufL4–7. Seine Boards enthalten auch L9/10-Arbeit, das Mage-Board L9/10 undL13. Diese schwierigeren Angebote wurden nicht durchgehend gespielt. Der `.106`-Mage wiederholt vor allem Boar-/Adder-Jagden.
- **Konkreter Kampfdruck:** Warrior L1 gegen Hunde L6/L4:95→45 HP. Warrior L4 gegen Hunde L7/L7/L6:158→38 HP. Später L8 gegen zwei Dungeon-Gruppen L4/5:260→254 HP über beide Kämpfe. Dieselbe Welt kann gefährlichen Einstieg und später glaubwürdige Überlegenheit bieten.
- **Tod ist nicht automatisch Fehlbalance:** Mage L5 beginnt den letzten Kampf mit53/115 HP gegen einen L7-Eber mit108 HP/ATK31. Der eigene Bolt verursacht51 Schaden;26+29 Gegenschaden töten ihn vor der nächsten Entscheidung. Initiative/Kampföffnung ist als Designachse relevant, kein daraus bewiesener Rechenfehler.
- **Kaufkraft ohne Entwicklung:** `.106`-Mage endet mit1.044cp ohne Gearwechsel. `.113`: Warrior379cp, Mage333cp, ebenfalls ohne Wechsel. In beiden jüngsten Kampagnen wurde kein mechanisches Gearangebot gebucht. Also weder ein gescheiterter Upgrade-Kauf noch eine faire Endwirtschaft belegt.
- **Growth:** `.106`-Warrior Heavy Slash P4; `.106`-Mage echte Rare-Passive. `.113`-Warrior Heavy Slash P2/69 und Basic P2/33, Rare-Passive angenommen, Ironkeeper Riposte angeboten, nicht angenommen. Mage Bolt P1/54, Ward P1/0. Ein Angebot ersetzt die bewusste Annahme nicht.

## 3. Konkrete Empfehlung A: F-Waffen, echte Angebote und Kaufkraft

**Hohe Priorität. Die bisherige Minimalvariante „bis MATK12 und bessere Anzeige“ reicht als nächster Balanceversuch nicht mehr.** Sie wurde in Teilen schon `.96` umgesetzt, ohne dass Gear in den längeren Läufen zu einer tragenden Entwicklungsachse wurde. Das beweist keinen Zahlenfehler, rechtfertigt aber ein entschiedeneres Designexperiment.

Vorschlag für **neu erzeugte F-Waffen/Foki**, bestehende Qualitätsnamen und Slots:

| Qualität | ATK beziehungsweise MATK | Preisrichtwert am Fachhändler, cp |
|---|---:|---:|
| crude | 6 | 25–45 |
| common | 10 | 60–100 |
| fine | 14 | 110–180 |
| superior | 18 | 220–320 |
| exceptional | 22 | 400–600 |

Starterwaffen bleiben10. Keine zusätzlichen Stats, Affixe, Sockel, Slots oder versteckten Levelanforderungen. Die Tabelle ist eine neue F-Versuchskalibrierung; Waffenfamilien behalten Reichweiten und ihre vorhandenen Besonderheiten. Bei INT33/P1 hebt MATK10→22 einen Arcane Bolt von81,875 auf93,875 Rohpower, **etwa14,7%**, nicht120%. Damit wird der Kauf spürbarer, ohne die gesamte Formel umzubauen. Verteidigung und nötige Treffer entscheiden über den realen Nutzen.

**Angebot und Werte gemeinsam:** Ein tatsächlich besuchter passender Waffen-/Fokushändler soll im bestehenden Offer-System zwei bis drei passende Qualitätsoptionen führen können, darunter eine echte Verbesserung gegenüber10. Normale Händler dürfen einfache Ersatzware führen. Bestehende Verkäuferidentität, Anwesenheit, lokale Offerten und einmaliger Kauf bleiben verbindlich; kein Laden entsteht durch bloßes Erwähnen. Ein kleines Content-Sortiment analog zu den vorhandenen Gildenprimern ist zuverlässiger als ein weiterer bloßer Narratorhinweis. Namen/Beschreibung bleiben generativ; Werte, Preis und Kaufbarkeit sind sichtbar gebucht. Kein automatischer Kauf und keine automatische Bestückung jeder Taverne.

Preisrichtwerte sind Händlerorientierung, keine neue harte Kaufverweigerung. Der heutige lineare Wertansatz `8cp × Statpunkte` muss zur Qualitätsstaffel passen, etwa mit einem kleinen tabellierten Qualitätsaufschlag **nur für Gear**; sonst widersprechen Preisaudit und neues Sortiment einander. Verbrauchsgüter und feste Angebote nicht nebenbei umpreisen. Bestehende Rüstungs-/Schildwerte zunächst behalten, vorhandene Qualitätsoptionen ebenfalls sichtbar anbieten: mehr DEF wirkt bei Gruppen pro Treffer und soll nicht zugleich mit den Waffen pauschal steigen.

**Technischer Zuschnitt:** `content/gear.json`, `src/v4/items.js:itemProfile/valueOf/Shopanzeige` sowie der bestehende lokale Offer-Erzeugungspfad. Eine kleine F-Waffentabelle nach bestehender Qualität genügt; nicht die gemeinsam mit Rüstung und Verbrauchsgütern verwendeten Qualitätsfaktoren pauschal ändern. Neue F-Waffenwerte ausdrücklich aufF begrenzen: nicht unbemerkt über `rankFactor` auch sämtliche E–S-Neuerzeugung hochsetzen. Dass außergewöhnliches F22 einige bisherige E-Waffen übertrifft, ist für den Versuch bewusst akzeptiert; der spätere E-Anschluss wird gesondert kalibriert. Bereits gespeicherte Itemprofile und abgeschlossene Preise bleiben bestehen.

## 4. Konkrete Empfehlung B: Aktive Entwicklung früher lohnend machen

**Hohe Priorität, gemeinsam mit A für den nächsten Balancebuild empfohlen.** Keine neuen Effektfamilien nötig; die vorhandenen Lern-, PP-, Trainings- und Annahmepfade genügen.

| Stellgröße | Heute | Empfohlener Versuch |
|---|---|---|
| PP pro Proficiency-Aufstieg C1/C2/C3 | 75 / 100 / 150 | **50 / 75 / 100** |
| LP-Tagesgrenze Eigenstudium / Lehrer | 20 / 40 | **40 / 60** |
| Gewöhnlicher Guild-Primer | 120cp | **80cp** |

PP je qualifizierendem Kampf, Challenge-Prüfung, Affinity, LP-Stundenraten10/20 und Skill-Schadensfaktoren bleiben bestehen. Bei18 PP wird C1-P5 nach mindestens **12 statt17** qualifizierenden Kämpfen erreichbar. Die höheren Tagesgrenzen verringern Kalendertage, nicht die gesamte notwendige Lernzeit; keine Sofortkenntnis durch Kauf. Training bleibt eine freiwillige Alternative. Bekannte Techniken nicht doppelt lernen; keine automatische Annahme und kein Gratis-Skill nach bestimmtem Charakterlevel.

Passende offene Entwicklungen und vorhandene Lernangebote müssen in den bestehenden Systemanzeigen verständlich sein: was wird gelernt, welche Quelle ist vorhanden, wie nimmt man an oder beginnt Training? Die vorhandene `#skills`-/Offer-Anzeige gezielt benutzen, keinen zweiten Skillbaum bauen. Die regulären Primer decken bereits Strike, Bolt, Guard, Ward und Mend ab. Bessere Zugänglichkeit vorhandener Rollen ist zunächst sinnvoller als noch mehr fast gleichartige Schadenszauber.

**Technischer Zuschnitt:** `content/rules.json:proficiency.promotion_progress`, `growth.lp_day_cap`, `growth.guild_manual_cp`; vorhandene `skills.js`-, `v4/growth.js`- und Guild-Offer-Pfade. Kosten-/Powerboni und `.96`-Rundung nicht nochmals ändern. Bei geänderter PP-Schwelle darf alter PP-Überhang weder verschwinden noch bei Replay rückwirkend neue Skills vergeben; Behandlung vor Umsetzung festlegen, vorzugsweise beim nächsten regulären Fortschritt mit sauberem Carryover. Historische `skill.progress`-Events bleiben unverändert.

## 5. Konkrete Empfehlung C: Schweres F finanziell lohnend machen

**Mittlere Priorität, Bestandteil derselben F-Wirtschaftsrunde sinnvoll.** Nicht alle Auszahlungen erhöhen. Statt des bisherigen engen Novice-Richtwerts10–200cp folgende Orientierung für eine übliche Jagd verwenden:

| Tatsächlich etablierte Herausforderung / Empfehlungslevel | Auszahlung, cp |
|---|---:|
| 1–3, Einstieg | 30–80 |
| 4–7 | 90–180 |
| 8–11 | 200–350 |
| 12–14 | 350–600 |

Menge, Elite-/Bossgefahr, Aufwand und Loot bestimmen die Einordnung innerhalb beziehungsweise oberhalb des Richtbereichs. Keine feste Auszahlung allein aus dem Spielerlevel. Eine einzelne gewöhnliche Schlange und eine Mehrfachjagd desselben Empfehlungslevels sind wirtschaftlich nicht gleich. Diese Bereiche gelten als Generator-/Repair-Richtwerte für **neue** Verträge, nicht als rückwirkende Preisänderung oder starre Validierungsgrenzen.

Weltpopulationen und4+1-/5-Jagden-Verteilung beibehalten. Schwere Jagden sollen mit tatsächlichem Habitat, sichtbarer Empfehlung, Gegnerzahl und Risiko attraktiv sein; sie werden nicht automatisch zum Pflichtinhalt und keine bestehende Population skaliert mit dem PC. Lootpreise nicht zusätzlich pauschal multiplizieren. Der Mehrertrag soll hochwertige Ware und Lernquellen bezahlen, statt lediglich den Geldstand zu vergrößern.

**Technischer Zuschnitt:** `rules.guild.board.payout_guide_cp` und die bestehende Board-Request-/Repair-Anleitung mit denselben Richtwerten. Auszahlungen, Quest-XP, Herkunftsprüfung und Abgabeautorität bleiben der bestehende Enginepfad. Kein neues Belohnungssystem.

## 6. Kampf und oberes F: gezielte nächste Entscheidungen

**Main/Minor ist der nächste eigenständige Gameplayversuch**, keine Voraussetzung fürA–C und kein neuer Mini-Hotfix: den [bereits vorbereiteten Fachplan](../patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) umsetzen, sobald separat freigegeben. Höchstens eine Haupt- und eine Nebenaktion; normale Ein-Band-Bewegung und Mobility-Skill teilen denselben Minor-Slot; dieselben Regeln für Gegner. Das kann Blink/Evasion und Positionierung nützlicher machen, ohne einen weiteren globalen HP-Puffer. Bereits beschlossene Aktionszuordnungen aus dem Fachplan übernehmen, hier keine neuen Potion-/Guard-Sonderregeln hinzufügen.

Allgemeine Monsterwerte, Gruppenzahlen, Initiative und First Strike für die erste A–C-Runde nicht zusätzlich verändern. Ein korrekt gebuchter Tod ist kein automatischer Nerfauftrag. Der tatsächliche Doppelangriff vor der nächsten Entscheidung ist anschließend zusammen mit der Aktionsökonomie zu bewerten, nicht durch eine spontane Sonderausnahme für den letzten Eber.

**Verbleibende Dungeonlücke:** Standard-Rollenfenster eines reinen F-Bands liegen heute bei Minions1–5, Guards4–8, Boss5–9; rein numerisch wird10–14 kaum genutzt, Boss-/Elite-Multiplikatoren erhöhen die Gefahr dennoch. Nicht pauschal sämtliche frühen Dungeons auf12–14 setzen. Ein anschließender Weltcontent-Schritt kann einzelne ausdrücklich schwere, feste F-Etagen mit höheren **bestehenden** Levelspannen und entsprechendem Boardhinweis vorsehen. Kein neues Spezies-, Gebiets- oder Rangsystem. Die präzise Spreizung bleibt dafür eine offene Designentscheidung; keine heimliche Hochstufung alter Dungeons.

## 7. Umsetzungsempfehlung und Auswertung

**Empfehlung jetzt: A+B+C als fachlich zusammenhängende F-Balancerunde freigeben.** Nicht drei weitere spekulative Reviews abwarten. Innerhalb der Umsetzung passende Formelbeispiele und wenige bestehende Encounter vergleichen; kein riesiger neuer Simulator als Voraussetzung. Main/Minor anschließend separat, damit eine veränderte Aktionsökonomie und neue Itemwerte nicht ununterscheidbar zusammenfallen.

- Neue natürliche Kampagnen auf dem Balancebuild; für einen wirklichen Level15-Versuch das vorhandene150-/250-Input-Limit großzügiger konfigurieren, statt künstlich XP zu schenken. Freie Quest-, Gear- und Skillwahl bleibt erhalten, keine Einkaufspflicht und keine Fixtures im natürlichen Lauf.
- Wenige Wirksamkeitsfragen: Bringt ein echter Kauf einen merklichen Vorteil? Wird mindestens eine zusätzliche Technik gelernt/genutzt? Sind schwereF-Jagden nach Verbrauch und Erholung lohnend? Wie viel XP entsteht pro abgeschlossenem Abenteuer, nicht nur pro Eingabe?
- Nebenwirkungen bewusst akzeptieren und beobachten: bessere Waffen können frühe Kämpfe verkürzen; schnelleres P5 bringt Entwicklungen früher; höhere obere-F-Löhne erhöhen Kaufkraft. Das sind gewollte Versuchseffekte. Wenn sie triviale Dauersiege oder wirtschaftliche Belanglosigkeit erzeugen, Werte gemeinsam nachjustieren.
- **Rollback:** vor dem Produktpatch `.113` als Vergleich erhalten, Änderungen fachlich trennbar committen. Neue Versuchsprofile bleiben gespeicherte Instanzen; ein Code-Revert darf nicht als automatische Rückrechnung bestehender Kampagnen ausgegeben werden. Für einen sauberen Rückvergleich frische Kampagnen verwenden.
- **Unverändert:** XP×2, Startstats7, Levelschwellen, allgemeine Stat-/Schadensformeln, Monster-ATK/HP, Regeneration, bestehende Gearslots, Legacy-Regelstand1 und formale Gildenautorität. E-Quellen und endgültige F→E-Balance folgen später, nicht nebenbei.

**Status dieses Commits:** ausschließlich gemeinsame Bewertung und konkreter Balancevorschlag; keine Produkt-, Runner-, Kanon- oder Teständerung, keine neue Test- oder Smoke-Abnahme. Bereits bestehende technische Reviewfragen bleiben in ihren Runreviews, nicht als neue Balanceblocker.
