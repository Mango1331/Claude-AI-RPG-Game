# Sol — unabhängiger Gegenreview zu Batch18 / .123

30.10.2026. Geprüfter Produkt-HEAD `c300f3d77262ab334bd343dbaf488dcfabff29dd`; main vor diesem Nachtrag `04c099d`. Originalreview unverändert. Keine Produktänderung, keine neuen Tests, kein neuer Node-/ST-Abnahmelauf. Die unten genannten Sonden rufen unveränderte Produktfunktionen mit Originalzuständen auf; sie sind keine implementierten Fixes.

## Originalprüfung und Gesamturteil

Originalupload `batch-20261030-082423Z(1).zip`: **68.763.867 Bytes,49 Einträge,CRC fehlerfrei**, SHA256 `87680ec773cf04d1b1655e16fd7c6d3218afa1ffdf6a19f629fc6a78609e1fa1`. Identisch mit der Prüfsumme des GPT-Reviews; ZIP nicht auf GitHub hochgeladen. Alle drei Runs tatsächlich.123/c300f3d, natürliche GLM-Läufe ohne Fixture/Stub, saubere Quell-Worktrees, unveränderte Profile, secretHits0, keine PageErrors.

**Alle4790 Events aus den Originalchats sequenziell mit `applyEvent` neu gefaltet, nach jeder Nachricht `validateState` und Ortsbaumzyklen geprüft, Endzustände vollständig mit `foldChat` verglichen: null Abweichungen oder Validierungs-/Zyklusfehler.** Alle26 Geldänderungen und XP-Salden einschließlich Levelabzügen rechnerisch korrekt. Alle23 PP-Events zusätzlich mit `advancePp` geprüft: richtige Zielstände, keine doppelten Vergabeschlüssel. Sechs Guildabschlüsse jeweils mit einmaliger Auszahlung: Warrior45/140/40/140cp, Mage40cp, Rogue40cp.

| Profil | Inputs | Ende | abgeschlossene Kämpfe | XP gesamt | Gear / PP |
|---|---:|---|---|---:|---|
| Warrior |200|L11,465 Rest-XP,Limit|12 Siege|5965|später echte WaffeATK18 und RüstungDEF7; Basic/Quick Slash P3|
| Mage |22|L3,Tod|2 Siege,1 Niederlage|415|Startergear; Bolt P1/36|
| Rogue |200|L6,435 Rest-XP,Limit|18 Siege,1 weiterer Kampf offen|1935|Common-Light-Armor48cp; Piercing Thrust P3|

GPTs Zahlen und die zwei Hauptprioritäten sind bestätigt. Der Rogue-Blocker ist jedoch **kein nachgewiesener Narratorfehler bei der Anchorwahl**, sondern ein exakt reproduzierter Widerspruch zwischen Boardprüfung und Engine-Normalisierung. Beim Harlow-Verlauf lässt sich die fehlende Präsenz ebenfalls enger erklären. Gültiges Replay beweist keine fachliche Richtigkeit veröffentlichter Verträge oder erzeugter Profile.

Alle **1187** aufgezeichneten Modellantworten enden mit `finish:stop`, keine leere Antwort, kein `length`, kein unbeantworteter Call. Es gibt Reparaturen und sichere Fortsetzungen wegen semantisch/schemafehlerhafter Ausgaben, aber in diesem Batch **keine neue Reasoning-Budget-Erschöpfung**. Keine generische Provider-Recovery aus diesem Lauf ableiten. Die200er-CLI-Limits sind echte Grenzen; keine E-Klasse erreicht, dritte Etappe daher weiterhin natürlich ungeprüft.

## 1. P1 bestätigt: Die Engine trennt ihre eigene Population von den tatsächlich berichteten Tieren

Die am Board gespeicherte Population lautet `giant snapping turtles`, Anchor `aquatic`, Level4–7. Ort und aktive Jagd stimmen. Im Original-Extractor-Call58 / Chatindex42 steht zweimal ausdrücklich **`species:'giant snapping turtle', anchor:'aquatic'`**. Der Extractor liefert also den gespeicherten Anchor korrekt.

Der Ablauf im Produktcode:

1. `guild.js:habitatWhy` prüft `anchorFor(content,h.species)`. Der Alias `turtle` in `monsters.json` gehört zu `armored_beast`; das Wortmatching von `content.js:anchorFor` erkennt aber `turtles` nicht. Deshalb kann die plural bezeichnete Population mit `aquatic` veröffentlicht werden.
2. `world.js:newEntity` prüft die nun singular bezeichnete Kreatur. `anchorFor('giant snapping turtle')` ergibt `armored_beast`. Der vorhandene Alias-Fallback überschreibt den vom Extractor korrekt gelieferten `aquatic`-Anchor.
3. `domain.js:populationAt` verlangt Anchor-Gleichheit. Die lokale `aquatic`-Population passt nun nicht mehr, trotz passender Spezies und korrektem Ort.
4. `engine.js:materialise` erhält keine Population, benutzt deren Level4–7 nicht und zieht im tatsächlichen Originalzustand Level1. Ohne passende Population entsteht kein `population_at`.
5. `guild.js:areaOf` zählt gebundene Hunts ausschließlich über `population_at`. Daher0/4; diese letzte Schutzentscheidung ist richtig.

**Originalzustandssonde:** Originalbericht und Prosa aus Chat42 erneut durch `applyWorld`: beide Tiere `armored_beast`,L1,keine Populationsbindung. Kontrollsonde, ausschließlich die zwei Species-Texte auf `giant snapping turtles` geändert: dieselbe Engine erzeugt `aquatic`,L7/L5,jeweils mit korrektem `population_at`. Keine neue Population, kein neuer RNG, keine geänderte Enginefunktion. Damit sind verlorene Reise/Ankunft oder ein generell defekter Killzähler als Ursache dieses Beispiels widerlegt.

**Empfehlung für einen Fachpatch:** Verbindliche lokale Populationsdaten vor dem freien Anchor-Fallback berücksichtigen, wenn Ort und tatsächliche Art eindeutig passen; Generatorvalidierung und Materialisierung dürfen Singular/Plural nicht widersprüchlich auswerten. Bestehende `populationAt`/`namesKind`/Ortsabstammung nutzen, kein zweites Spawnsystem. Die ursprüngliche Namens-zu-Anchor-Sicherung gegen falsche Körperpläne außerhalb etablierter Populationen erhalten. Neue widersprüchliche Boardprofile nicht veröffentlichen; bereits etablierte Verträge nicht pauschal umschreiben.

Keine nachträgliche Aufwertung oder Umdeklaration bereits bekämpfter L1-Turtles. Kein Name-plus-Ort-Ersatz für `population_at` beim Zählen. Ein künftig korrekt erzeugtes L4–7-Tier muss auch **vor dem Kampf** tatsächlich die entsprechenden Werte erhalten. Dies erhöht die reale Gefahr gegenüber den bisherigen falschen L1-Gegnern; die18 Rogue-Siege sind keine Aussage über die Balance der vorgesehenen L4–7-Jagd.

**Abnahmefälle:** Original Chat42; singular/plural gleiche Fachbedeutung; untergeordneter Jagdort; andere Art im selben Habitat; anderer Ort; widersprüchlicher neuer Boardanchor; bereits profilierte und tote Individuen unverändert; neue passende Gegner korrekt skaliert/gebunden; Killcredit nur seit gültiger Annahme und einmal; Replay/Reload. Nicht sämtliche ungebundenen Kreaturen automatisch zu Questgegnern machen.

## 2. P2 bestätigt: Bundlezeile wird auf ein einzelnes Profil reduziert

Original Chat172 durch `applyWorld` reproduziert: `fine longsword and fine plate armor, the pair` → eine Linie, ein Armor-Profil,72cp. Chat173 kauft dieses eine Objekt; Chat175 rüstet es nur im Armor-Slot aus. Das behauptete Fine-Schwert ist mechanisch nicht vorhanden. Später Chat317/319 funktionieren zwei getrennte Linien für260+72cp, zwei Gegenstände und beide Slots korrekt.

Präzisierung der Verantwortung: Die **erste passende Gearart** aus `items.js:gearKindOf` war bereits vor.123 eine Schwäche bei zusammengesetzten Warenbezeichnungen. Der neue Preisregler verstärkt sie sichtbar, indem er das ganze vermeintliche Paar auf den Einzelwert72cp normalisiert. Keine vollständige neue Handelsregression behaupten; aber auch nicht nur den Extractor verantwortlich machen: Die Engine akzeptiert einen ungeeigneten Einteilvertrag und verleiht ihm einen verbindlichen falschen Umfang.

**Kleinster sinnvoller Fix:** Bei neuen Gear-Offerten über `gearOfferWhy` eindeutig mehrteilige, mechanisch nicht als ein Einzelprofil darstellbare Warenzeilen zur Klärung zurückweisen. Zwei reguläre Artikel brauchen zwei vorhandene Angebotslinien und deren jeweilige Preise; keine automatische Prosa-Bündelzerlegung oder neue Paketengine. Ein einzelnes Schwert mit Scheide oder eine vollständige Rüstung ist nicht schon wegen eines Verbindungswortes ein ungültiges Bundle. Gespeicherte Offerten und tatsächlich erworbene Objekte nicht rückwirkend verändern.

**Abnahmefälle:** Originalpaar abgewiesen/klargestellt, zwei getrennte Positionen korrekt gekauft/equipped, korrekte Mengensummen, Preiszustimmung nach Korrektur, Einzelartikel mit beschreibendem Zubehör, alter gespeicherter Vertrag und Replay. Bestehendes `bookPurchase` und die F-Retail-Regel erhalten.

## 3. Harlow: fehlendes Enter bewiesen, keine beschädigte Tasche

Beim ersten Geschäft Chat260/261 wird Harlow korrekt eingeführt und der30-cp-Lotverkauf einmal gebucht. Nach dem Weggehen speichert die Engine seinen letzten Ort. Bei der Rückkehr Chat328 wird der Spieler korrekt zum Laden bewegt; die neue Szene beginnt mit zurückgesetzter Anwesenheitsliste. Die Prosa sagt ausdrücklich: „Harlow was there“ und beschreibt ihn physisch hinter dem Tresen. Der Extractor meldet jedoch nur Zeit, Ankunft und26-cp-Bid, **kein `enter`**. Deshalb ist `npc.harlow` zwar bekannt und zuletzt dort gewesen, aber nicht aktuell `scene.present`; die Offerte wird korrekt abgelehnt.

**Kontrollsonde gegen dieselbe unveränderte Funktion:** Originalzustand/Prosa/Bid, nach der Ankunft ein `enter` mit dem tatsächlich vorhandenen Harlow-Satz ergänzt → Harlow anwesend, gültige26-cp-Offerte, **keine Ablehnungen**. Bestehender Präsenzbeleg und Handelsweg funktionieren also. Der Bericht verlor ein notwendiges World-Ereignis; eine ausufernde Taschenverzauberung entsteht erst in der Erzählung als Erklärung dafür. Keine tatsächlich verschwundene Tasche, kein reparaturbedürftiges Inventar und keine zusätzliche Geldquelle nachgewiesen.

P2-Beobachtung zur Extraktionsvollständigkeit, nach Population und Bundle. Nicht aus dem letzten `at` alle NPCs automatisch wieder erscheinen lassen und nicht Handelsgeschäfte ohne aktuelle Anwesenheit erlauben. Falls später adressiert: bestehende Ankunft/Enter-Sequenz präzisieren und diesen Originalfall als Integrationstest verwenden; kein neuer allgemeiner NPC-Präsenz-Fallback aus dieser Einzelbeobachtung.

## 4. Balance und Runner: was dieser Batch tatsächlich zeigt

- **PP:**23 korrekte +18-Vergaben, P3 bei häufig genutzten C1-Skills. Natürliche Sofortsieg-PP beim Mage belegt; keine zusätzliche Multiplikation nötig. Späte L1-Turtles qualifizieren bei höherem PC-Level richtigerweise nicht. Cleave und Fan werden wenig bzw. gar nicht wirksam benutzt; ihre P1-Endstände allein beweisen keine falsche PP-Schwelle.
- **Gear:** reguläre Einzelpreise und späterer zweizeiliger Warrior-Kauf funktionieren. Rogue kauft früh freiwillig Rüstung, erreicht100cp aber nicht; Mage stirbt mit70cp. Die neue Einkaufspflicht für diese beiden Klassen wurde daher noch nicht bei erfüllter Geldbedingung natürlich geprüft. Kein weiteres Runner-Forcing aus diesem Ergebnis ableiten.
- **Mage-Tod:** Nach L4-Pike-Sieg steht er bei59/100HP. Vor dem nächsten Angriff zeigt der tatsächliche Player-Screen bereits **Mire Pike B95/95HP,ENGAGED**, aber nicht dessen Level7/ATK31. Die Warnung ist stärkerer Gegner plus eigener verwundeter Zustand, keine vollständig transparente Levelinformation. Nach dem ersten Austausch nur3HP; der nächste Angriff endet tödlich. Kein nachgewiesener Rechenfehler. „Unvorsichtig“ ist als Risikobewertung vertretbar, als vollständige Schuldzuweisung an den Spieler zu stark. Kein automatisches Herunterskalieren der Umgebung empfehlen.
- **Tempo:** W200/L11 und R200/L6 rechtfertigen nach Batch17 mit zweimal natürlichem L15 noch keinen neuen XP-Faktor. Der Rogue verbringt sehr viele Inputs mit einem inkohärenten Hunt und anschließender Erzählung; beim Warrior verbrauchen Handel, Verhandlungen, Wege und Vorbereitung Zeit. Zuerst diese konkreten Reibungen beseitigen, dann Fortschritt beurteilen.

**Priorität:** ein begrenzter Populations-/Anchor-Kohärenzpatch, danach eine kleine Sicherung mehrteiliger Gearzeilen; beide können fachlich getrennt in einem Produktpatch erfolgen. Die bestätigten Schutzregeln für Killcredit, Geld, Inventar und Präsenz bleiben bestehen. Anschließend natürlicher Batch; vorerst keine zusätzliche XP-/PP-/Klassenbalanceänderung und keine pauschale neue Runneranweisung. Engine weiterhin.123, kein Produktfix durch diesen Review.
