# Run 10 — natürlicher GLM-5.3-Flash-Livetest, Build .72

**Original-ZIP:** `20261024-235637Z-current_test.zip`; 10.969.495 Bytes; SHA-256 `3044429ffc63571a6edf90dacd5a4efae8c4feba975ba8b6d1dd3cdb2ac572df`; 15 Einträge, ZIP-CRC vollständig gültig. **Die Original-ZIP ist im Chat hochgeladen und unabhängig geprüft; nicht in Git als Binärdatei archiviert.** Diese Review gleicht `run.json`, `evaluation.json`, `avereth-events.json`, `calls.json`, `chat.jsonl`, `player.jsonl` und ausgewählte Antworten gegen Produktcode ab. Keine Engine-/Runneränderung und keine unabhängige Wiederholung der Tests.

## 1. Verbindliche Testbedingungen und Ergebnis

- **Tatsächlich geladener Build `4.3.0-c.6.6.72`, Git `646a6feb517351eac3220cf980d8a8341ca5df45`**, sauberer Arbeitsbaum laut Run-Bericht. **Nicht .74**; später implementierte .73/.74-Korrekturen (insbesondere strukturierte Dungeon-Ankunft) werden damit **nicht** natürlich geprüft.
- Natürlicher, freier `current_test`, SillyTavern 1.19, GLM-5.3-Flash via Custom-Endpoint, `stub:false`, `fixture:null`, Spielerpersönlichkeit „curious opportunist“. Spielstart Glassmere, Mage mit Flame Lance und Focused Ward.
- **75/100 Spielerinputs**, 46:06 Minuten Laufzeit, Ende `defeat` durch Charaktertod in Input 75. **1044 Engine-Events** in **132** gespeicherten Records, **64 `extract.applied`** für 64 erzählte Antworten; 209 Provideraufrufe (**73 Planner, 64 Narrator, 68 Extractor inklusive vier Reparaturen, vier Board**) alle `finish:stop`; ein zusätzlicher Planner-Repair; 0 PageErrors/ServerErrors; Status `integrity: OK`. Der Engine-Turnzähler beträgt am Ende 66, die Zahl der Testspielerinputs 75 (Menüs/Panelturns dazwischen).
- Zwei Pflichtetappen im Leitfaden: Charaktererstellung erfolgreich, offener 100-Züge-Zeitraum nicht erreicht. Kein Dungeon-Eintritt in diesem Lauf, folglich auch keine natürliche Abnahme der .72/.74-Dungeon-Eintrittskorrekturen.

## 2. Positive, tatsächlich verbuchte Spielabläufe

- Inputs 1–11: Character Creation, 20-cp-Gildenregistrierung **einmalig**, 2h Flame-Lance-Training mit **18 PP**, fünf echte Novice-Boardangebote, Annahme der ersten Lieferquest. Die vollständige MP-Leiste direkt nach dem Training ist **kein Beweis** für verbuchte Zauberausgaben: Selbsttraining bucht Zeit/PP, nicht Cast für Cast.
- **Waystone-Lieferung, Inputs 12–18:** echter Gegenstand `obj.t24.sealed_case_of_fever_medicines`, `object.moved` und `quest.delivered` an `npc.brother_anselm` (Input 17, Record 33), `quest.ready` (Record 34), `proof.checked ok:true`, einmalige **35 cp** Guild-Payout und **46 Quest-XP** (Record 36). Positiver End-to-End-Nachweis.
- Mehrere unabhängig gebuchte Reisen/Orte, NPC-Begegnungen, Schlaf/Erholung (Inputs 16, 40, 44, 64), nachvollziehbare Einkaufstransaktionen (Bed 6 cp, Essen 2 cp, Porridge 1 cp) und vier echte Strangle-Vine-Siege.
- **Mage Level 1→2** in Input 32 (Record 63). Kampf-XP 24 + 36 + 36 + 46 = **142**, Quest-XP **46**, insgesamt **188 verdiente XP**, am Ende 88 XP nach Levelaufstieg. `growth.noted` zweimal; noch kein angenommenes organisches Entwicklungsangebot. Wiederholungssicheres Kampfergebnis und keine doppelt gebuchte Questbelohnung nachgewiesen.

## 3. P1 — Thornhollow: reale Ware abgegeben, zweites identisches Lieferziel bleibt offen

**Beleg:** `quest.carry_the_physicians_satchel_to_thornhollow` (ab Input 53 aktiv) besitzt die Ziele **o1 DELIVER „sealed satchel of medicines“ nach Thornhollow** und **o2 GIVE „the satchel“ an Gretha in Thornhollow**. **Input 58, Record 115**: `object.moved` von `obj.t110.sealed_physicians_satchel` an `npc.gretha` und `quest.delivered` für **o1**, Schlüssel `49:1:obj.t110.sealed_physicians_satchel:o1`, gültiger `at:loc.thornhollow.grethas_cottage`. Gretha unterschreibt, der Spieler trägt den Beleg zum Guild-Schalter zurück.

**Gleichzeitig** verweigert Record **116** `quest.ready` (`quest_delivery`) und der Guild-Schalter in **Inputs 60, 66 und 67** weiterhin `proof.checked/not_delivered` mit „the satchel → the midwife Gretha“; **o2** fehlt trotz identischer physischer Übergabe. Aus dem aktuellen Quellcode `src/v4/delivery.js:180–199`: `bookDelivery` reserviert die einzige Ware für o1 und reduziert `available` von 1 auf 0; o2 kann deshalb keinen eigenen Receipt erhalten. `deliveryStatus` in Z. 114–121 verlangt aber eine Buchung **für jede objective-ID**.

**Bewertung: bestätigter P1-Mechanikfehler**, nicht fehlende Unterschrift, nicht fehlender Postläufer und nicht der Ort („Gretha's cottage“ liegt in Thornhollow). Ein physischer Übergang darf **zusammenhängende, wirklich identische DELIVER/GIVE-Aufgaben** derselben Fracht zugleich erfüllen, aber **nicht** zwei verschiedene Waren, zwei notwendige separate Übergaben, zweite Auszahlung oder doppelte Mengen erzeugen. Bitte Red/Green-Regressionsfall mit exakt diesem 2-Ziele-Vertrag plus Gegenfall für zwei eigenständige Güter/Empfänger. Grethas bereits gespeicherten Receipt und Reload/Replay berücksichtigen. Der Narrator erzeugte aus der Fehlermeldung außerdem erfundene Wartefristen, die den Spieler über mehrere Inputs beschäftigen; **keine separaten Post-Mechaniken** einführen.

## 4. P1 — private Arbeitsquest wird ohne Spielerauftrag ausgeführt und bezahlt

Input **48**, Record **96**: spontane Privatquest `quest.an_hour_of_pushing_the_stuck_cart_to_market`, Ziel: Karren befreien **und zum Markt bringen**. Input **49**, Record **97**: Spieler schreibt **nur** „I accept the hour of pushing the cart to market.“ Planner verbucht **`quest.accept`**, **kein `go`**, **keine Arbeitsaktivität**.

Narrator Record **98** führt dennoch den Schub zum Markt eigenständig aus. Engine verweigert `arrive` zum Markt folgerichtig mit **`no_go`**, bucht aber **45 Minuten**, `quest.status active→completed` und **+3 cp** von der Bäuerin. Der PC bleibt auf `loc.lower_wall_of_the_south_terraces`, obwohl der Markt als erreicht und die Leistung als abgeschlossen erzählt wird.

**Bewertung: nachweisbarer P1-Agency-/Kohärenzbruch.** `quest.accept` berechtigt weder automatisch zu Reise noch zu geleisteter Arbeit; ein vom Erzähler produzierter Abschluss darf die erforderlichen eigenen Spielerhandlungen nicht ersetzen. Den privaten Quest-Pfad und die `quest.status`-Authority gezielt prüfen, ohne spontane Privatjobs grundsätzlich zu verbieten. Regression: Annahme allein vs. anschließendes ausdrücklich autorisiertes Schieben/GO; keine Zahlung bei nicht erbrachtem Ziel, kein unnötiges Arbeitsbürokratiesystem.

## 5. P1/P2 — „TARGET NEEDED“ bei Pflanzenarbeit und unvollständiger Vine-Quest

**Inputs 22–24**, Chat-Messages **45/47/49**: Spieler versucht, die Wucherungen mit einer Schere zu schneiden. Planner ordnet die Versuche mechanisch als **Basic Attack auf noch nicht existierende Wesen** ein. Dreimal `ATTACK — TARGET NEEDED`, weder Zeit noch Fortschritt. Erst Nachfragen und eigenständiges Gehen zum Wall-Ende führen in Inputs 26–27 zu einem tatsächlichen Gegner. **Inputs 35/36**, Messages **71/73**: derselbe Ablehnungsmechanismus auch für gezielte Flame-Lance-Angriffe gegen bisher nur erzählte kleine Vine-Knoten. Input 37 `GO` führt zu zwei neuen Wesen, danach geht das Abenteuer weiter.

**P1-Spielbarkeitswirkung:** Erzählte gegenwärtige Ziele sind nicht automatisch mechanische Ziele, und der Spieler verliert reale Eingaben in einer Schleife. Unterscheiden: körperliches Räumen/Schneiden als Arbeit (nur bei nicht kämpfender Flora), tatsächliche lebende Gegner und das eigenständige Erreichen neuer Orte. Einen ungültigen Angriff nicht einfach zum freien Treffer machen; aber nicht jeden Schneideversuch reflexhaft als `use_skill` behandeln und die Bewegungsabsicht verlieren. Gezielt gegen die bereits vorhandenen `.72`-GO-Prioritäten prüfen.

**Wichtige getrennte Positivabgrenzung:** Der Guild-Cullvertrag verlangt ausdrücklich **sechs** mechanisch besiegte Strangle-Vines, die Engine verzeichnet **vier**. `quest.ready` wird in **Record 94** folgerichtig mit **`quest_count: 4 of 6`** verweigert. Kein Payout und keine Quest-XP: **korrekt**. Der Narrator lässt Maretta dennoch „that's the whole of them“ und den abgeschlossenen Herbstpick ausrufen; der Spieler wartet danach mehrfach beim Guild-Schalter auf vermeintliche Bestätigung. **Narrative Korrektur/P2**, keine Lockerung des sechs-Gegner-Kriteriums, keine Phantomkills/XP. Die Guild-Post-Fristen sind in diesem Fall keine Entschuldigung für die fehlenden zwei Abschlüsse.

## 6. Kampfende: fünf Glaswespen, Flucht/Fairness getrennt von korrekter Rechnung

In **Input 69** trifft der PC auf fünf gebuchte Glaswespen im Sunfield Apiary; Input 70 zeigt noch Planbesprechung, ohne voreiligen Kampf. **Input 71** eröffnet `enc.t62` mit Flame Lance, besiegt Wasp A (54 Schaden, 24 HP), doch der Level-2-Mage (85 HP, INIT 7) steht **fünf Gegnern mit INIT 8** gegenüber. Nach dem First Strike laufen **acht Wespenattacken in den Runden 1 und 2** vor der nächsten PC-Entscheidung; HP **85→44**. **Input 72** besiegt B (53 Schaden), drei Stiche: **44→29**.

Input **73**: autorisierter `flee`, **25 %**, Wurf **90**, misslungen, drei weitere Treffer: **29→14**. Input **74**: `Focused Ward` kostet 14 MP, absorbiert **3×5 = 15 Schaden**, HP bleibt 14. Obwohl die Eingabe „ward, then try again to run“ lautet, zählt der Round-Action-Slot **nur die Ward**, keine zweite Gratis-Flucht. Input **75**: weiterer `flee`, **25 %**, Wurf **66**, misslungen, drei Stiche **14→0**. `encounter.ended`: `pc_dead:true`, zwei Wespen besiegt, `xp_awarded:0`. **Numerisch und vom Rundenablauf her konsistent.**

**Offene Balance-/Agency-Frage, kein nachgewiesener Bug:** Bei fünf schnellen Gegnern und 25-%-Fluchtchance ist Rückzug aus ENGAGED praktisch sehr riskant. Run 9 hatte bereits eine ähnlich tödliche Dreiergruppe. Erst gezielte Simulationen für Startband SHORT/MEDIUM, Initiativfolge/First Strike, Gruppengröße und Fluchtchance durchführen; Spieler-QoL und echte Rückzugsentscheidungen höher gewichten als scheinbaren Simulationsrealismus, aber **kein globaler Schadens- oder XP-Fix aus einem Todesfall**.

## 7. Host/Runner und überprüfte Grenzen

- **209/209 Provider-Calls `finish:stop`**, keine Transportfehler, keine leeren Antworten, 1 Planner-Repair und 4 Extractor-Repairs, alle weiteren Extraktionen übernommen. Der Runner dokumentiert **44 nicht unmittelbar parsbare Player-LLM-JSON-Versuche**, überwunden durch Folgeschritte; kein Engine-Abbruch. P2: Spieler-Agent-Ausgabeformat/Recovery untersuchen, nur wenn natürliche Spielentscheidungen dadurch merklich leiden.
- Kein bekannter neuer Swipe-/Hostfehler; kein neuer Gruppenfakten-Integritätsfehler (Status `integrity: OK`). Keine belegte natürliche Prüfung von `.73` / `.74` oder `story_ref`-Wiederbegegnung.
- Die originale ZIP liegt **nicht** in Git; Hash und Größe sichern Herkunft. Ein späterer ZIP-Upload muss unverändert und auf Zugangsdaten geprüft erfolgen. Der Nutzer hat keine Veröffentlichung von Schlüsseln autorisiert; Review enthält keine URL-/Credential-Rohdaten.

## 8. Reihenfolge

1. **P1 — Zusammengehörige DELIVER/GIVE-Ziele bei nur einer echten Übergabe** (Thornhollow-Originalfall) inkl. Replay und Gegenfällen.
2. **P1 — Private Quest-Abnahme ohne ausgeführte Arbeit/GO** verhindern; keine narrativ erfundene Reise oder Auszahlung.
3. **P1 — Arbeits-/Pflanzenaktionen und nicht materialisierte Ziele** gegen die echten Vines absichern; den korrekten `4/6`-Cull-Gate dabei beibehalten.
4. **P2 — Kampf-/Fluchtsimulation** für 3–5 schnellere Gegner und Startdistanz. Keine Balanceänderung, bevor die Ursachen der ersten drei Punkte behoben sind.
5. Erst danach einen natürlichen Langlauf **mit dem dann wirklich geladenen neuen Build** beginnen. `.74` ist **nicht** durch Run 10 abgenommen.

**Nur Review/Dokumentation. Keine Produktänderungen, kein rückwirkend erfundener Test-Pass.**
