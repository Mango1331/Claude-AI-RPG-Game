# Run 8 – 20261024-142854Z-current_test (.68)

Unabhängiger Originalreview, 24.10.2026. **Nur Bewertung und Planung; keine Implementierungsfreigabe.**

## Testintegrität und Technik

- Original-ZIP im Chat geprüft: **10.499.227 Bytes**, SHA-256 **d937b1e1cc867836781c3de96e468e30e415c073bb742c402f97e78e7d70f5bc**, Git-Blob-SHA1 fd3c6c90b021ac20d67b0999d3b88680bb9f30d1; alle 15 ZIP-Einträge CRC-validiert. Git-Binärarchivierung bisher nicht durch diese Auswertung erfolgt.
- Echter SillyTavern 1.19.0, GLM-5.3-Flash, kein Stub und keine Fixture, Build **4.3.0-c.6.6.68**. Entwicklungsbranch-Produktcommit zum Build: 2120720; das ZIP selbst liefert keine separat verifizierte HEAD-SHA.
- **75/100 Spielerinputs**, Ende **planner_failed** in Input 75, nicht Game Over. 46:23 Laufzeit (2.783.458 ms). **61/61 Narrator-Replies extrahiert und angewendet**, sechs erfolgreiche Extractor-Reparaturen, 961 Engine-Events, integrity OK, keine Page-/Servererrors. 200 Provideraufrufe: 69 Planner inkl. fehlgeschlagener Repair, 67 Extractor inkl. sechs Repairs, 61 Narrator, zwei Board, ein Forge. Alle finish=stop. Keine .68-100-Züge-Abnahme.

## Mechanik und Fortschritt

- Inputs 1–9: Mage, Arcane Bolt und Arcane Ward; Guild-Registrierung einmalig −20 cp; fünf echte Guild-Listings; physischer Tithe-Lieferauftrag angenommen.
- Input 15: echter object.moved des originalen Tithe-Pakets an den Hermitage-Empfänger und **quest.delivered**. Input 25: proof.checked ok:true, einmalig **+40 cp und +46 Quest-XP**, abgeschlossener Guild-Vertrag. Zuvor privater Such-/Rettungsauftrag für Brother Cormac, gerettet, Hermitage-Geschenk **+18 cp**.
- Input 30: reguläres neues Tagesboard, alte Listings expired, neuer Old Crown Floor-1-Vertrag angenommen.
- Inputs 32–39: drei tatsächlich engineerzeugte Skeletons in einem Encounter; Mage gewinnt bei nur **5/80 HP und 2 MP**. **288 Combat-XP = 120+96+72**, mit vorherigen 46 Quest-XP **334 kumulierte XP**; Engine bucht Level 1→2→3, 34 Rest-XP, zehn verteilbare Statpunkte. Kein Gratis-Heal.
- Inputs 40–42: VIT +5/WIL +5, vom Engine-Evidence-Angebot stammende **Rare Passive Bone-Yard Grit** per ausdrücklicher Entscheidung erworben. Ruhe/Heilung vor weiterer Dungeon-Erkundung.
- Der Dungeon-Vertrag bleibt **active**; drei Eingangsskelette sind nicht ein vollständiger Floor-Clear.

## P1 – Planner-Abbruch bei Werkzeug aus dem Raum

Input 75: Spieler will eine kalte Knochenplatte in einem Türschloss ausprobieren. Bekanntes Objekt obj.t146.flat_thing_wrapped_in_oilcloth_and_tied_with_cord befindet sich **auf dem Tisch**, nicht im PC-Inventar. Ein nachträglich vom Extractor versuchtes neues Objekt direkt in holder=pc wurde zuvor korrekt als pc_inventory verworfen.
Planner-Call 199 liefert attempt(feature=feat.3, tool=obj.t146...), was richtigerweise wegen fehlenden Besitzes abgelehnt wird. Reparatur-Call 200 erzeugt **seq1 take(obj.t146...), seq2 attempt(tool=obj.t146...)**. Trotzdem verwirft src/v4/planner.js:parsePlan die gesamte Sequenz: Die Menge held stammt aus dem ursprünglichen CATALOG (Zeilen 430–434); attempt.tool wird in Zeile 504 **für jede Aktion gegen diesen Start-Snapshot** geprüft. Infolgedessen scheitert auch die reparierte geplante Handlung mit Fehler commands[1] attempt: tool must be ... held. **Keine neue Story und keine unberechtigte Aktion**, aber der Langlauf bricht ab.
Empfehlung: **ein enger P1-Planner-Hotfix vor einem weiteren Langlauf**, nicht Besitzregeln lockern. Test positiv: legitimes am Standort aufnehmbares Objekt, explizites take→attempt in einer Spieleraktion, genau ein TAKE und danach gültige Validierung. Negativ: Tool ohne Besitz und TAKE; fremder Besitz, falscher Ort, misslungener TAKE, mehrdeutige Identität, Replay/Swipe und gescheiterte Sequenz. Alternative bei unauflösbarer Sequenz: ehrliche Rückfrage statt Totalabbruch. Das Schloss selbst darf nicht automatisch aufgehen.

## P1 – nicht autorisierter Dungeon-Gegner als Schlüsselträger

In Input 61 beschreibt der Narrator einen riesigen patched greater skeleton mit Schlüsseln um den Hals. Die Engine verweigert den Extractor-Versuch creature.new im Eventrecord 122 **korrekt** mit dungeon_foe: Er ist kein zugelassener Encounter dieses Floors. Der Narrator hält ihn dennoch weiterhin als tatsächlich patrouillierende Gefahr und **notwendigen Träger des Abstiegsschlüssels** in der Geschichte.
Inputs **62, 63, 64, 66, 67, 70** enthalten Angriffsversuche mit Engine-Panel ATTACK — TARGET NEEDED, ohne Damage/MP/eröffneten Encounter. Eine spätere Suche behandelt die nicht existierende Gestalt weiter als Plotblockade. **Korrekte Mechaniksperre, unzureichende narrative und faktische Rückbindung.** In **10B-3A Kampfeskalation/Kampfchronik** als vollständigen Fachfall integrieren: abgelehnter Dungeon-Foe darf weder als besiegbarer aktueller Gegner noch als unentbehrlicher Key-Carrier weitergeführt werden. Echte autorisierte Dungeon-Gegner und atmosphärische Lore erhalten; keine freie Spawn-Erlaubnis.

## P2 / offene Kontrollen

- Private Quest Find Brother Cormac: Cormac wurde gerettet, quest.ready existiert und 18 cp wurden tatsächlich geschenkt; Queststatus bleibt bis zum Ende active. Statusabschluss gesondert prüfen, keine zusätzliche Zahlung erfinden.
- Spieler erklärt sechs Kupfer für die Guild-Bunk zu bezahlen; es entsteht nur decision.opened purchase (Seller-Nachweis fehlt), **kein coin.changed −6**, obwohl Narrator echte Zahlung und Bett behauptet; Ruhe regneriert dennoch HP. Kauf- und Erzählerwahrheit prüfen, nicht blind sechs Kupfer abziehen.
- 10B-3B: echter Delivery-Beleg, Boardrotation und Guild-Auszahlung nun positiv im Live-GLM nachgewiesen. Erwerbsarbeit als Arbeitgeberauftrag wurde hier **nicht** gezielt durchlaufen und ist damit nicht vollständig natürlich abgenommen.
- 70,1 s längster Narratoraufruf, aber kein Transport-Timeout oder Host-Blocker. 61 Story-Extraktionen im echten GLM-Lauf ohne fehlende Commits.

## Priorität und Grenze

**Run 8 verbessert Progression und Questautorität substanziell, aber scheitert an 75/100.** Ein gezielter Planner-Ownership-/Same-Turn-Sequenz-Hotfix soll den belegten Totalabbruch beseitigen; danach das bereits geplante **10B-3A als normales großes Fachpaket** mit dem Phantomgegner/Key-Plotproblem ergänzen. Keine erneute XP-Erhöhung, kein pauschaler Schadens- oder Monster-Nerf. Diese Review führte keine Node-Tests und keinen ST-Smoke aus. Original-ZIP separat unverändert nach GitHub hochladen und Hash prüfen.