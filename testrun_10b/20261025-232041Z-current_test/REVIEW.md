# Avereth – unabhängiger Gegenreview des natürlichen Laufs .91

**Run:** `20261025-232041Z-current_test` · **Original-ZIP:** `20261025-232041Z-current_test.zip` · **SHA-256:** `3202d7de4bb80178abb9e249d7f14ca3d80f4558433537b07a2ee23359683ad0`

**Produkt:** `4.3.0-c.6.6.91`, Commit `b55a897af686cb165f5812e4f0dd4287288565ff`, ST 1.19, Ruleset 2, Pfad C, GLM-5.3-Flash. Quellen: Original `chat.jsonl`, `avereth-events.json`, `player.jsonl`, `chat-completions.jsonl`, `calls.json`, `evaluation.json`, `run.json`, `report.md` und gezielt verifizierter Produktcode. Keine unabhängige Testausführung, keine Produktänderung.

## 1. Gesamturteil

**58 Eingaben; nicht gestorben, sondern bei T58 durch `extractor_failed` abgebrochen.** Level-3-Magier, sechs gewonnene Kämpfe mit zusammen zehn besiegten Gegnern, zwei erledigte offizielle Gildenverträge, ein dritter Vertrag aktiv. Anfängliche HP 90 und MP 96 (Basisattribute 7; nach Klassenwahl INT/WIL 8). Nach Level 3 und Statverteilung HP-Maximum 110, MP-Maximum 168. 161 registrierte Engine-/Narrator-Aufrufe über 27:45 min. Zwei Pflichtmeilensteine, nur Charaktererstellung erreicht; geplante 100 Eingaben nicht erreicht.

Der Lauf ist **ein deutlicher Spielbarkeitsfortschritt** gegenüber den vorherigen Todesläufen nach 11 und 21 Zügen. Eine kausale Aussage allein über die neuen Startstats wäre unzulässig: Seed, Gegner, Auftrag und konkrete Entscheidungen unterscheiden sich. Der Testspieler suchte Risikohinweise, positionierte sich geschickt, nahm mehrere Rückmeldungen ernst und erholte sich. Er nutzte den stärkeren Mage mit Flame Lance allerdings auch gegen Mehrfachgegner, nicht immer konservativ. **Keine weitere Charakterverstärkung aus diesem Lauf ableitbar.**

## 2. Reproduzierbare wichtige Befunde

### P1 – T58: Extraktion einer Mehrort-Reise scheitert trotz Reparatur

Spieler will von Glassmere zu den Claygate-Lehmgruben und zum alten Brennofen reisen. Erzähler beschreibt Weg, Hauler, Gruben, drei noch unaufmerksame Wyrlings am Kilndach. Engine-World-Extraktor gibt im ersten JSON acht Deltas und `expected[1].arrived=true` zurück, aber keine Szenenannotation für mehrere vor dem abschließenden `arrive` stehende Deltas.

Der Reparaturaufruf (API 161, nach erstem Versuch 160) ergänzt `scene` in den Deltas 2–6, **nicht** in `deltas[6]` (nullbasiert: siebtes Delta `quest.detail` über die drei Wyrlings und die Feuergefahr); danach folgt `deltas[7] = arrive`. Im aktuellen `src/v4/extract.js:256–264` verlangt die Validierung bei einem abschließenden Ortswechsel für jeden vor dieser Ankunft stehenden nicht ausgenommenen Delta-Typ eine explizite `scene`-Angabe. `quest.detail` ist nicht ausgenommen. Finale Antwort bleibt ungültig mit `$.deltas[6].scene: explicitly name this earlier scene before the later arrival`.

**Folge:** `extract.failed`, keine der erzählten Änderungen dieser Antwort wird verbucht; HUD meldet `WORLD NOT RECORDED`. Kein stiller Commit, keine Datenkorruption, aber der 100-Züge-Test bricht ab. Ursache liegt bei der unvollständigen Extractor-Reparatur in Verbindung mit der strikten Annotation, nicht beim Spieler. Eng begrenzte Reparaturprüfung sinnvoll: Multi-Place-Antwort inklusive `quest.detail` vor `arrive`, erste Antwort unvollständig, Repair weiterhin lückenhaft; keine ungesicherte automatische Ortsinferenz. Ein weiterer natürlicher Langlauf ohne Gegenmaßnahme könnte aus derselben Ursache wieder enden.

### P1/P2 – T23–T33: Handelsstillstand durch fehlende kanonische Gegenpartei

Am Gildenschalter kündigt eine nur **erzählte** Schreiberin 20 cp für acht Bog-Strider-Chitinplatten und eine Giftdrüse an. Der Spieler will verkaufen und versucht in T23, T24, T25, T27 und T28 wiederholt die Übergabe beziehungsweise Zustimmung. Der Planner interpretiert T24/T25/T28 als `sell` an `{new:'the Guild clerk'}`, die Engine verweigert korrekt `nobody to sell to`, weil diese Person nicht kanonisch gegenwärtig ist. Andere Formulierungen erzeugen `decision.opened` ohne gültiges bindendes `bid`. Der Narrator behauptet widersprüchlich, Beute sei zurück am Lagerplatz oder nicht im Beutel; `#bag` (T26) beweist das Gegenteil. Es findet **keine falsche Auszahlung** statt.

Erst T32 führt eine tatsächlich kanonisch erfasste `npc.npcguild_clerk` zu `offer.created` (`bid`, Gesamtpreis 55 cp); T33 akzeptiert korrekt: beide Beutearten wechseln den Besitzer, **einmalig +55 cp** an den PC, `transaction.completed`, `offer.closed`. Mehrere frühere Verkaufsentscheidungen werden abgeschlossen. Preis 55 ist ein späteres neues Angebot, nicht eine heimliche Änderung der nie gebuchten 20-cp-Offerte.

**Folgerung für geplantes Paket B:** Ein strukturiertes Händlerangebot allein genügt nicht. **Die Person, die im Gespräch ein Angebot macht, muss im autoritativen Szenen-/NPC-Zustand eindeutig identifizierbar sein**, oder die Engine muss gezielt nachfragen. Ein unbekannter oder nur frei erzählter „Guild clerk“ darf kein Kauf-/Verkaufs-Commit auslösen, darf aber auch nicht eine scheinbar definitive Preiszusage über viele Züge suggerieren. Annahme, Gegenparteipräsenz und reale Angebotserfassung zusammen testen.

### P2 – T29–T31: Echter GO-Befehl vom Agency-Guard als Frage verworfen

Spieler: `I give up on the sale for now and head to the Wren for a bed and a meal — what's the price for the night with dinner?` Planner gibt **korrekt** `go` nach `loc.glassmere.the_drowned_wren` zurück. `guardCommands` verwirft ihn dennoch mit `rule='question'`. Die Agency-Zerlegung in `src/v4/agency.js` erkennt einen Satz bis zum abschließenden Fragezeichen; die eigenständige Wegentscheidung vor dem Gedankenstrich wird so mit der nachstehenden Preisfrage vermischt.

**Konsequenz:** Die Engine bleibt am Gildenhaus. Der Erzähler beschreibt eine angeblich vollzogene Reise zur Herberge; T30 behauptet Zahlung von 4 cp und Abendessen, tatsächlich entsteht nur `decision.opened` für Unterkunft an `{new:'the innkeeper'}` am falschen Ort und **keine `coin.changed`-Buchung**. T31 wird im Engine-Ort am Gildenhaus geschlafen; Erzählung korrigiert das auf die Veranda. Die Engine schützt den Zustand, aber die Player Agency wird verworfen und die Geschichte widerspricht ihr.

Gezielte Regression: festes `I head to the Wren ... — what's the price ...?` muss `go` erhalten, Frage selbst darf keine Zahlung buchen. Kein allgemeiner Guard-Umbau erforderlich, sofern sich die Mischsatz-Ursache isolieren lässt.

### P2 – T36–T38: Sichtbarer Falter noch kein adressierbares Kampfwesen

Der Erzähler beschreibt Glasswing-Motten sichtbar an Ziegeln; zweimal versucht der Spieler Flame Lance (T36/T37). Der Planner/Engine-Pfad meldet `no_target`, weil der Falter nur erzählerisch, nicht als kanonisch gegenwärtige und anvisierbare Kreatur gespeichert ist. T38 führt erst eine räumliche Annäherung / echte Weltregistrierung herbei, dann kann T39 erfolgreich angegriffen werden. Keine Phantom-Trefferbuchung. Schwelle zwischen sichtbarem NPC-/Welttext und tatsächlich instanziiertem Kampfziel ist spielerisch unintuitiv. Präziser Integrations-Test „narrated visible enemy → targetable entity“ vor einer großen Kampfrevision.

### P2 – T48–T52: Erzähler zählt sechs Falter, Engine tatsächlich erst fünf

Die tatsächlichen Kampfabschlüsse ergeben bis T49 **fünf** Feinde des laufenden Glasswing-Auftrags (T39: 1, T43/T44: 2, T48/T49: 2). Das kanonische Questziel von **6** ist zu diesem Zeitpunkt noch nicht erfüllt. Erzähler/NPCs suggerieren sechs; der Spieler glaubt einen Anzeigefehler. Die Engine weist den verfrühten Erfolg zurück (`quest_count` und Korrektur nach T49). T51 erkennt der Narrator die 5/6 wieder; T52 wird der **sechste** Falter besiegt, Quest geht korrekt auf READY; T53 +80 cp und `quest.status completed`.

**Nicht als Quest-Zählfehler der Engine bewerten**: Die kanonische Zählung stimmt mit den registrierten Kills überein. Das Problem ist Narrator-Kontinuität und missverständliche Beschreibungen zu nicht mehr aktuellen Gegnern (inklusive Phantom-H in HUD/Umgebung). Separat prüfen, ob `Here`-/Leads-Text zu lange historisch fixiert bleibt und falsche Präsenz suggeriert.

### P2 – Fortschritt beim geplanten Handel-/Gear-Ziel unvollständig

Zwei Beuteverkäufe und Gildenbelohnungen sind belegt. T33: gültiger Verkauf +55 cp, T55: mehrere Glasswing-Materialien +35 cp, jeweils an einen tatsächlichen Käufer. T21/T53: +90 bzw. +80 cp Gildenpayout. T55 Guthaben 288 cp. **Keine konkrete Waffenkauf-/Rüstungskauf-/Equip-Testsequenz** trotz inzwischen vorhandener Münzen. Damit sind die neuen Händler-Gear-Regeln `.89` und Stapelfix `.90` in diesem GLM-Lauf nicht natürlich abgenommen.

Der bestehende Testspieler-Leitfaden fordert Ausrüstungskauf bereits ausdrücklich. Sein Verhalten wurde durch die ungewöhnlich langwierige Veräußerung und weitere Jagden dominiert. Empfehlung: kein neuer repetitiver allgemeiner Leitfaden; falls das nächste Testszenario die noch ungetestete Kauf→Equip-Strecke erreichen soll, allenfalls eine knappe Prioritätsregel nach der **ersten erfolgreichen Lootveräußerung** anwenden („vor der nächsten Jagd nach bezahlbaren, echten Gearangeboten fragen“), ohne künstliche Käufe zu erzwingen.

## 3. Was funktioniert

- Start `.91`: neue Basisattribute 7, Mage-Favored INT/WIL 8, HP 90/MP 96; normaler Levelanstieg und Statvergabe. Level 3/HP-Max 110/MP-Max 168 plausibel, keine nachträgliche Verfälschung alter Figuren im Run erkennbar.
- T8–T21: Vier Bog-Strider erledigt, Quest READY und erst am Gildenschalter verbucht; 90-cp-Auszahlung einmalig.
- T23/T53: Quests angenommen/abgegeben, korrekte Zustandsübergänge; T54 neues Gildenboard mit fünf Angeboten.
- Sechs registrierte Kampfsiege: drei Strider + einzelner Strider; ein + zwei + zwei + ein Glasflügler; kein Tod, keine erzwungenen Testfixturen. Der Magier benutzt MP und Terrain weitgehend sinnvoll.
- T32/T33 und T54/T55: offene tatsächliche Käufergebote, eindeutiger Gesamtpreis, keine doppelte Zahlung, materielle Objektbewegungen.
- T57: Nach ausdrücklich geklärter zweistündiger Ruhe HP 92→110 und MP 36→86/168, gegen Engine berechnet und verbucht.
- T58: ungültige Extraktion scheitert geschlossen; keine falsche Reise, Monster- oder Questbuchung. Robustheitsproblem, nicht Integritätsbruch.

## 4. Spielerintelligenz und Tester-Leitfaden

Der Spieler holt an den Eel-Weirs Gegnerhinweise ein, hält trockenen Boden, überprüft Ressourcen und Statvergabe, erkennt ungültige Verkäufe anhand `#bag`, nutzt informierte Falter-Lockstrategie und ruht später. Er akzeptiert allerdings auch mehrfach risikoreichere Gruppenjagden, ein geringer Erfahrungsfortschritt ist nicht zwangsläufig beste Sicherheitsentscheidung. Keine weitere Stat-Erhöhung oder vereinfachte Dungeons notwendig.

**Leitfaden grundsätzlich beibehalten.** Er enthält bereits Risikoeinschätzung und Beute→Ausrüstung. Wenn eine einzige Ergänzung vorgenommen wird, sollte sie die Ausrüstungsbeschaffung nach erstem Geldgewinn priorisieren, nicht noch mehr allgemeine Warnsätze zu Gruppen/Kampftod anhängen. Spieler-JSON-Probleme betreffen den **Runner**: 33 zuerst unbrauchbare Spielerantworten wurden repariert; das ist Latenz/Protokollökonomie, nicht die Denkqualität des Spiels.

## 5. Prioritäten vor dem nächsten großen Test

1. **P1 Robustheit:** Eine eng begrenzte Regression zum T58-Extractor-Reparaturfall (`quest.detail` vor `arrive`, pro-Delta-Szene fehlt), dann minimaler gezielter Fix. Keine automatische Ortsbuchung aus Prosa.
2. **P2 Agency:** T29-Falschrückweisung eines echten `go` in einer Mischung aus Reisehandlung und anschließender Preisfrage reproduzieren und isoliert beheben.
3. **P2 Händler:** T23–T33 als konkreten Realfall in den strukturierten Handelsfachplan aufnehmen: kanonische Sprecheridentität und Szenenpräsenz vor verbindlicher Quote. Die geplante Händlerarchitektur ist durch diesen Lauf ausdrücklich **weiter gerechtfertigt**, kein theoretisches Qualitätsprojekt.
4. **P2 Kampferzählung:** Nichttargetable sichtbare Falter und vorzeitig ausgerufene 6/6-Rechnung getrennt testen. Keine Änderung von Monster- oder Questzahlen ohne Beleg.
5. **P2 Spielerziel:** Gear-Kauf und Equip erneut natürlich beobachten; bisher keine empirische Abnahme der beiden Gear-Patches im natürlichen Lauf.

**Keine Produktcodeänderung, keine Tests selbst ausgeführt.** Dieser unabhängige Gegenreview basiert auf dem Original-ZIP und ist von dessen automatisch generiertem `report.md` getrennt.

## 6. Übergabe an Sol – unabhängiger Gegenreview, noch keine Implementierung

Bitte prüfe die Befunde **ergebnisoffen am Original-ZIP und am tatsächlichen Produktcode von Build .91**. Nutze `REVIEW.md` als Such- und Prüfhilfe, nicht als bereits bewiesene Fehlerursachen. Priorisiere T58 (Mehrort-`scene`-Repair und Laufabbruch), T29 (falsch verworfener `go` in gemischter Aussage/Frage), T23–T33 (kanonische Händleridentität und gebundene Quote) sowie T36–T52 (Kampfzielregistrierung und Questzählung). Trenne reproduzierbare Engine-Bugs, reine Narrator-Diskrepanzen, Testspielerentscheidungen und Designfragen. Bestehende Sicherungen gegen falsche Buchungen nicht leichtfertig lockern.

Berücksichtige den offenen Fachplan `patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md`: Befunde können seinen Handlungsbedarf präzisieren, ersetzen aber **keine Umsetzungsfreigabe**. Schreibe dein Gegenreview gegebenenfalls als `SOL_COUNTERREVIEW.md` in diesen Ordner. Noch keine Produktimplementierung.

**Original-ZIP:** `20261025-232041Z-current_test.zip`, SHA-256 `3202d7de4bb80178abb9e249d7f14ca3d80f4558433537b07a2ee23359683ad0`. Der Export wurde im Chat bereitgestellt; seine Ablage auf `main` ist bei Erstellung dieses Reviews **nicht bestätigt**. Für unabhängige Vollprüfung den unveränderten Originalexport zusätzlich bereitstellen.