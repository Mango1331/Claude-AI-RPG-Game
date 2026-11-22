# Avereth .191 – GPT-Gegenbewertung des Opus-Reviews und Korrekturgrenzen

**15.11.2026 · unabhängige Review-Notiz · keine Produktänderung, keine neuen Modell-/ST-/Node-Aufrufe.**

**Quellen:** [vollständiger Opus-Gegenreview](GEGENREVIEW_OPUS.md), [GPT-Originalreview](REVIEW_GPT.md), [Produkt-Patchnotes .190](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9635f72/avereth-engine/docs/BUILD_190_LOCATION.md)/[.191](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b8d3be5/avereth-engine/docs/FOLLOWUP_190_191.md) und lesende Prüfung der realen Produktfunktionen auf Produkt-HEAD `4ed8bf2` (Gameplay `.191`; danach nur Runner-Pause). Originalreplayzahlen und Szenenmutationen stammen von Opus und sind **nicht** durch diese GPT-Notiz unabhängig ausgeführt worden.

## 1. Gesamturteil

**Opus' Ursachenanalyse ist stärker als die erste GPT-Auswertung.** Die neue Orts-/Ankunftsautorität wirkt natürlich in den zwei tatsächlich gestarteten Kampagnen: 25/26 GO-Schritte zu einem Ziel, der weitere PULSE-Halt; keine von der Engine verweigerte autorisierte Ankunft. Ein unerlaubter Ortswechsel wird abgelehnt und N1/N4 korrigieren den nächsten Zug. B5 Tor → erster Abschnitt/Slot wird konsistent gebucht.

Der `.191`-Batch ist **keine Drei-Profil-Abnahme**: Warrior 70 Inputs, Rogue 22 bis Provider-Guthabenstopp, Mage 0; die fehlenden Inputs nicht als Gameplay-Misserfolge zählen. Die Raten gegenüber `.186/.188` sind bei unterschiedlicher Lauf-/Szenenauswahl nur grobe Indizien. Die 35 `scene_context`-Ablehnungen stammen aus fünf Antworten; nur sieben sind Folge einer tatsächlich verweigerten Ankunft. Eine Erhöhung der generellen Durchlässigkeit von `scene_context` wäre kein richtiger Fix.

**Vor dem persönlichen User-Test empfehlen:** zwei eng reproduzierbare P1-Fixes und den eng positiven E2-A-Fix, optional den sicheren N1-Text-Fix. Szeneneltern-Toleranz und Kampf-Teilfortschritt benötigen ausdrücklich negative Sicherheitsproben.

## 2. P1-a – Dungeon-Slotwerbung und Thread-Speicherung

**Codebeleg:** `living.js contextLines` (Zeile ca. 942) wirbt kreative sichtbare Slots `even before an earlier encounter is resolved`. `slotForNew` (ca. 318/322) begrenzt die Belegung `more:true`; `world.js newEntity` und aktive Kampfregel verweigern weitere Kämpfer. Mit B5 sind Begegnungen ohnehin an ihre **konkrete nächste Sektion** gebunden. Der Narrator hört somit gleichzeitig eine permissive Dungeon-Karte und die eindeutige Kampfkarte.

`world.js` prüft `unbookedDungeonThreat` nur bei `thread.kind === 'threat'`. `run9_evidence.js` erkennt die ausgeschlossenen Gegner in `sign`-Threads mit alternativer Bezeichnung nicht zuverlässig. Der angenommene T70-`sign`-Thread nennt die zwei konkret abgelehnten Speer-Goblins als vorgerückte Wesen. Die alte Threadfassung bleibt eine gültige Spur (Geräusche).

**Empfehlung:** Enginewerbung für **nicht** vorgesehene freie Slots während des Kampfs entfernen; Slots für spätere B5-Sektionen niemals für eine aktuelle Sichtung als tatsächlich anwesend freigeben. Im Nichtkampf nur den explizit für den aktuellen Schritt gesetzten `dungeon.ahead`-Slot als verfügbare Kreatur verwenden. **Enger kausaler Thread-Guard**: nur Aussagen über die **jetzt** anwesenden/handelnden, eben verworfenen Gegner ablehnen, unabhängig von Threadart; frühere `sign`-Fassung beim abgewiesenen Update erhalten. Nicht jeden Hinweis auf Gerüchte, Geräusche, Spuren, entfernte Bedrohungen oder freie Slots wegwerfen.

**Evidenzgrenze:** Die Aussagen über Engine-Card und Thread-Text sind aus Opus' Originalrequest-/Replaysichtung; die Codepfade wurden hier lesend gegengeprüft, nicht durch eigenen Replay reproduziert.

## 3. P1-b – Stadt-Jagdort und falsche Reisegeographie

**Codebeleg:** `guild.js bookBoard` setzt neue progressive Jagdorte kategorisch mit `parent = realmOf(s, need.branch) || need.branch`. Dadurch wird `Millrace Row culvert, Ashbridge` nicht Kind von `loc.ashbridge`, auch wenn der Boardtext und die Lage städtisch sind. `sameSettlement`/PULSE bewerten daraus folgerichtig eine Überlandreise. Die beobachteten 45/50 Minuten, Straßen-PULSE und die falsche Reichshalteposition sind **Folgen dieses Datenfehlers**. Der GPT-Erstreview hatte die tatsächliche Reichshaltebuchung beschrieben, aber die ursächliche geographische Fehlklassifikation nicht gefunden.

**Empfehlung:** Gezielter, deterministischer **Ortsumfang** bei der Boardbuchung: ein eindeutig *in* der Gildenstadt gelegener Ort bekommt deren Siedlungs-ID als Eltern; echte Wildnis, Straßen außerhalb, Dungeons und Orte `near/outside/north of <Town>` bleiben Reichsorte. **Nicht bloß alle Namen, in denen „Ashbridge“ vorkommt, unter die Stadt hängen.** Der Begriff kann eine Richtungsangabe sein. Wenn ein neues Boardfeld nötig erscheint, zunächst die einfachste robuste explizite geografische Form prüfen und keine neue globale Namens-Heuristik einführen. Unverwechselbare, vorhandene IDs/Quest-Populationen erhalten; alte Spielstände nicht still retconnen.

**Pflicht:** Original T7 und Reise T9/T14/T18/T20 auf neuem Board-Nachlauf sowie negative Beispiele „outside <town>“, „the <town> road to …“, entlegene Habitate; gleiche NPC-/Quest-/Population-Gültigkeit, keine doppelten Jagdorte. Vergleich des PULSE-Modus und der erwarteten Local- statt Travel-Zeit.

## 4. P2-a – NPC-`met` bei Wortzielen

**Codebeleg:** `world.js metArrivals` (ca. 2215–2233) verlangt `expected[k].arrived === true && g.to && s.scene.at === g.to`. Für `go {new}` ist `g.to = null`, obwohl die Engine ein Ziel angelegt und die Ankunft bestätigt hat. Das erklärt den originalen Rogue-T13-Fall mit Witwe Hesse. Die bestehende Liste `outcome.known_at[k]` und der belegte Sprecher-/Anwesenheitsnachweis bleiben zwingend.

**Empfehlung:** `met` am **tatsächlich erreichten, dem konkreten GO-Schritt zugeordneten Ort** prüfen, nicht blind an `g.to`. Nur Personen, die dieser Schritt bereits als bekannt/üblicherweise dort zugeordnet hat, deren Anwesenheit mit Erzählbeleg belegt wird; keine nachträglich neu erdachten Personen, kein `met` auf einem Zwischenhalt oder bei abgelehnter Ankunft. Kein neuer allgemeiner NPC-Namensmerge.

## 5. P2-b – Elternszene ist nicht automatisch lokale Anwesenheit

**Original W T12:** Der Extractor meldet die Siedlung/den Lebensraum, während der PC nach bestätigtem GO in einem konkreten Kindort ist. Die alten Kausalitätswächter verwerfen daraufhin fünf mögliche Weltfolgen, darunter legitime Personen und Aussagen.

**Vorsicht:** `Siedlung` als Sammelbegriff ist nicht beweissicher identisch mit **dem konkreten Zimmer**; eine Person auf der Straße derselben Stadt ist nicht automatisch im verschlossenen Hinterzimmer. Die Opus-Empfehlung „Elternszene einfach als hier werten, wenn keine verweigerte Ankunft“ kann legitime Schutzregeln gegen falsche lokale Präsenz unterlaufen. Begrenzte Positivkorrektur ist sinnvoll, aber nur mit:
- tatsächlich im selben Schritt bestätigter Ankunft im Kindort,
- exakt zugehöriger Siedlungs-/Habitatvorfahr, **nie** Reich/Region,
- korrekter Chronologie und **belegter Szene für den konkreten NPC/das Objekt**,
- Ausschluss vorangestellter Meldungen vor dieser Ankunft, abgelehnter Ankünfte, fremder Unterräume und gesperrter Zugänge.

Wenn die sichere Belegprüfung zu komplex wird, **lieber die bestehende Ablehnung samt klarer Extractor-Reparatur** als pauschales Lockerungs-Bypass. Nicht als „kostenfreie“ Korrektur einordnen.

## 6. P2-c – Ortskopf

`context.js` schreibt `TRAVEL THIS TURN — none chosen … unless something in the world moves him`. Das ist für den Narrator semantisch weit: Er kann ein NPC-Angebot als external movement verstehen. Eine enge Formulierung auf `only a genuinely involuntary force, with narrated proof`, nicht ein mitgehendes NPC, ist ein sinnvoller kleiner Textfix. Fragen oder angenommene Einladungen bleiben ohne eigenen Aufbruch keine Reise. Kein bedingtes GO wieder einführen.

## 7. P2-d – Angriff und Bewegung nicht automatisch koppeln

Opus dokumentiert sieben komplett verworfene Angriffsentscheidungen; der Fall „30 Schritte schnell heran und schlagen“ ist für User-Tests spürbar. Es ist sinnvoll, **den zuvor explizit gewählten, rechtmäßig möglichen Bandschritt** nicht allein wegen des unzulässigen Angriffs zu verlieren. Aber: Eine bedingte Spielerentscheidung („nur wenn ich sofort zuschlagen kann“), ein durch PULSE/Blocker/Bewegungsbudget gestoppter Schritt oder eine dem Kampf zugrunde liegende Aktionswirtschaft darf nicht durch eine automatische Teilbuchung gebrochen werden.

**Empfehlung:** Vor einer Änderung einen kleinen Fachvergleich anhand Original T14/T31/T35/T43/T64/T65/R T16: War ein selbständiges MOVE gebucht oder nur semantischer Teil eines unteilbaren Angriffs? Welche Reihenfolge und welche Kosten gelten? Positiv: unabhängiger legaler MOVE erfolgt, illegaler Angriff nicht. Negativ: bedingter/unmöglicher MOVE, aktiver Combat mit fehlender Action oder mehrere Bandschritte; keine heimliche Freigabe des Angriffs. Dies ist ein eigener kleiner Kampffachpatch, nicht Teil der Ortsfixes um jeden Preis.

## 8. P3 und Teststand

`pulse.outcome.narrated` zählt nicht alle Threads; die Opus-Einordnung als **diagnostischer** Fehlalarm ist plausibel. Änderungen daran sollten sicherstellen, dass wirklich das offene Fenster (Spuren, Seltsam, Ereignisse) erzählerisch behandelt wurde, nicht nur irgendein Thread in der Antwort. Keine Änderung an PULSE-Würfen oder Autorisierung. Runner-Provider-/Guthabendiagnose ist optional und nachrangig.

**Umsetzungsreihenfolge:** (I) P1-a Dungeon-Karte + kausaler Thread-Guard, (II) P1-b Stadt-Jagdort, (III) P2-a `met`, (IV) P2-c Narrator-Ortskopf. P2-b nur nach Sicherheitsproben, P2-d als gesonderter Combat-Abnahmeauftrag. Für jeden fixierten Punkt erst rote Gegenprobe am `.191`-Original, dann grüner Patch; volle Node-Suite, alle 2235 historischen Replayfälle und der kleine neue `.191`-Reproduktionskorpus. Die beiden neuen natürlichen Läufe sind als Regressionen nützlich, dürfen aber nicht reflexartig vollständig in die alte Baseline hineingezwungen werden; Originaldaten/Providerstopp und absichtliche Änderungen ausdrücklich abgrenzen. ST-Host-Smokes bei Prompt-/Host-/Vertragsänderungen. Kein neuer natürlicher API-Batch, keine neue Großarchitektur.

**Fazit:** Opus hat den früheren GPT-Review materiell verbessert und mehrere reale Ursachen identifiziert. Der B5-/Bewegungsumbau ist durch den begrenzten Pilot **nicht widerlegt**, sondern in der Bewegungsautorität teilweise bestätigt. Weitere Architekturumbauten für weniger API-Aufrufe oder vermeintlich weniger `scene_context` sind durch diese Daten nicht gerechtfertigt.
