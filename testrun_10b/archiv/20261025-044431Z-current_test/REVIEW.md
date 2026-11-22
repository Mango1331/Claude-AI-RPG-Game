# Run 12 – freier 100-Input-GLM-Langlauf auf Build .78

**Original:** `20261025-044431Z-current_test.zip`, **14.602.417 Bytes**, SHA-256 `723d2660837dcf849a8b416ccea87346589e8153f97fbf1864f9dcc9e8ac7e0d`. ZIP-CRC: fehlerfrei, 14 Einträge. Original in dieser Unterhaltung geprüft; **ZIP nicht nach `main` hochgeladen**. Referenz: `run.json`, `evaluation.json`, `avereth-events.json`, `report.md`, `chat.jsonl`, `player.jsonl`, `calls.json`; Prüfung von `content/gear.json` auf Produktcommit. Engine-Events mit `E` = Nachrichtenindex `i` des Exportlogs; davon getrennt sind die echten Spielerinputs 1–100.

## 1. Rahmen und Ergebnis

- **Geladener Build:** `4.3.0-c.6.6.78`, Commit [`aa788dd`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/aa788dd93097a37bc68c9c0bbc7729ece23c707d); Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`. Freier, echter GLM-5.3-Flash über ST 1.19, `stub:false`, `fixture:null`, persona `curious opportunist`.
- **100/100 Inputs**, regulär `done`, **57:58 min**; **86 gebuchte Engine-Turns**, **1.448 Engine-Events**, **84 `extract.applied`**, **271 Engine-/Narrator-Calls** (97 Planner, 85 Narrator, 87 Extractor, 2 Board). Erfolgreiche Reparaturen: zwei Planner, drei Extractor und ein Boardversuch mit Repair; keine PageErrors/ServerErrors; am Ende **`integrity: OK`**.
- Mage, Level **1** geblieben; **ein realer Kampf**, **ein Sieg, 32 Combat-XP**, keine Levelaufstiege. **Kein Guild-Payout, keine abgeschlossene Privatquest und kein Verkauf**. Anfang 50 cp, nach Registrierungsgebühr 20, Käufen/Gaben/Beute verbleiben **2 cp**. Keine Aussage zur allgemeinen Gruppen-Kampfbalance aus diesem Lauf.
- Erstmals natürlich gebuchter Eintritt in die **Mossback Warrens, Ebene 1**, E142. Auch zweite Ebene / Shaman-Ereignisse wurden erzeugt; ohne Spieler-Kampfabschluss. Spieler zieht sich vernünftigerweise vor übermächtigem Shaman zurück.
- Testziel `open_run_duration` erreicht; **„100/100“ heißt technisch überlebtes Beobachtungsfenster und nicht, dass Board, Dungeon und Quests insgesamt korrekt funktionieren.**

## 2. P1 – Generator scheitert und Guild-Board bleibt unbrauchbar

**E11, Input 6:** `board.failed` mit **3 gültigen statt 5 verlangten Notices**. Mindestens `Ledger to Quarry Gate` scheitert am seit .77/.78 gewollten Generatorfilter für das generische `Recipient at …`. `calls.json` dokumentiert zwei Boardaufrufe (ein Repair); trotz Repair kein vollständiges 2 Hunts/2 Deliveries/1 Dungeon-Board. Ab E12 erzählt der Narrator das Board als leer, ohne eine benutzbare Guild-Auswahl; Spieler verlegt seine Tätigkeit auf freie NPC-Aufträge.

**Einordnung:** Die strengere semantische Boardkontrolle ist richtig; **der Generator bzw. einmalige Reparaturpfad liefert sie noch nicht zuverlässig**. Den Filter nicht zurückdrehen, stattdessen die Ausgabe/Reparaturanweisung auf spezifische Empfängerrollen konditionieren und vollständiges Familienprofil trotz einem verweigerten Einzel-Listing wiederherstellen. Kein erfundenes Board-Listing, kein zweiter, ungebundener Halluzinationspfad und keine erneute Mehrfach-DELIVER-Aufgabe.

**Regressionen:** Originalantwort/Repair aus E11, `Recipient` und `someone` als Ablehnungsgegenfall; `Healer at Quarry Camp Infirmary`, `Gretha at Thornhollow`, `deposit at Receiving Shed` gültig; nach genau einem Repair vollständiges, variiertes Board. Falls das Modell bei erlaubtem Repair weiterhin ungültig bleibt: nützlicher Fehlerzustand ohne fälschlich „Board dauerhaft leer“ zu behaupten. Legacy-Boards unverändert.

**Grenze:** **Die eigentlichen .78-E83/E165-Lieferkorrekturen wurden in Run 12 nicht natürlich getestet**, weil kein neuer Liefervertrag wirksam übernommen und an einen Empfänger übergeben wurde. 1563/1563 von Nutzer gemeldete grüne Node-Tests sind **kein** Live-Nachweis für funktionierende Lieferungen.

## 3. P1 – Dungeon-Monsterbelegung erzeugt sechs statt drei Goblins

**E146, Input 73**, auf Level 1 im `low_crawl_beyond_the_chamber`:

1. Der Extractor-/Worldpfad erzeugt zunächst **`mon.mossback_warrens_c1_l1_e2_1` bis `_3`**, je mit `entity.created` und `scene.entered` als Goblin Warriors. Diese tragen lediglich eine Narrator-Quelle, sind **nicht** als Dungeon-Slotpopulation autoritativ registriert.
2. Im selben Engine-Record werden **`_4` bis `_6`** erzeugt, nochmals drei Goblins, die erst danach `entity.updated.slot` erhalten und im offiziellen **`dungeon.slot warband`** als Level **4/3/2** registriert werden.
3. Die Evaluation markiert deshalb exakt **drei `unslotted_dungeon_creature`** in E146. Es handelt sich nicht um sechs selbstständig erwürfelte Dungeongegner, sondern um **doppelte Materialisierung innerhalb eines Antworten-/Slotverarbeitungswegs**.

Der Schutz gegen frei erzählte Dungeonmonster reagiert in E118, E128 und E152 korrekt mit `dungeon_foe`-Ablehnung. E146 zeigt jedoch, dass derselbe Schutz beim **zugelassenen Slottreffer** die bereits erzeugten ersten drei nicht konsistent auf die Slotgruppe bindet/unterdrückt. **P1: Dungeonpopulation ohne doppelte NPC-/Monsterkörper buchen**; keine freie Monster-Spawning-Erlaubnis an der Firewall vorbei.

**Regression:** Reproduzierbarer E146-Fall, nach einem echten Slot-Encounter exakt drei Slot-Entities, null weitere `mon.*` für dieselbe Narratorgruppe, gleiche Levels/Profile wie der Slot; Wiederholungsantwort/Replay/Reload darf keine weiteren drei anlegen; bereits aktive Monster und eigenständige echte Gruppen außerhalb eines Dungeon-Slots bleiben gültig. Im Test den Commit-Vorgang von `entity.created`, `scene.entered`, `dungeon.slot` gemeinsam prüfen, nicht nur Slotcount.

## 4. P1 – Narrator-Abgang ohne Engine-Abgang; Fremdort-Materialisierung am Ende

**Dungeon-Kontinuität E164–E174:** Der Narrator behauptet, die Goblins hätten ihre Kammer verlassen und seien an anderer Stelle beschäftigt. `fact.asserted` dokumentiert das sogar als Aussage (E164, E174); die gebuchten Goblin-Entities erhalten aber **kein** entsprechendes `scene.left`/Bewegungs- oder vergleichbares State-Ereignis. Spieler-Notizen und HUD zeigen deshalb wiederholt noch drei mechanisch existierende Goblins, während die Prosa deren Abwesenheit versichert. Der korrekte Schutz der Level-/HP-Engine ersetzt keine konsistente World-/Scene-Truth.

**Noch deutlicher E196–E200:** E196 bucht `scene.moved → loc.the_smiths_yard`. Bei Input 99 (E198) und Input 100 (E200) folgt **kein** weiterer autorisierter `go` und keine weitere `scene.moved`. Input 100 lautet lediglich *„Up the rocks on the left — we look first, and count them proper before we pick a fight.“*; der Planner liefert dazu `commands: []`. Der Erzähler steht hingegen schon am Goblinlager und präsentiert den gefesselten Trud. **E200 materialisiert Trud und vier Goblins mit `entity.created` + `scene.entered` im mechanisch weiterhin aktuellen Schmiedehof**; parallel werden zwei Privatquests als `quest.ready` gebucht, weil Trud nun gefunden sei. **Das ist ein echter Orts-/Agency-Fehler, nicht nur unpräzise Prosa.**

**P1-Patchrichtung:** `scene.entered`-/`entity.created`-Gates bei Narratorberichten, die ein neues, nicht autorisiert erreichtes entferntes Gelände voraussetzen; `quest.ready` darf nicht auf dieser unautorisierten Szene beruhen. Kein stilles GO aus Narratorprosa zurückbringen. Zulässige Ankünfte durch echte `go`/Journey und wirkliche Begegnungen am aktuellen Ort weiterhin ermöglichen. Für reale NPC-Abgänge nur eindeutig durch handlungsfähige Deltas belegte Bewegung/Leave buchen, nicht aus `fact.asserted` extrapolieren.

**Regressionen:** Original E198→E200 bei `loc.the_smiths_yard`, Planner-Commands leer: weder Camp-NPCs in `scene.present` noch quest.ready für Camp-Entdeckung; echtes `go` zum Camp + dortiger Narratorreport darf den Entdeckungsweg ermöglichen. E164/174: `fact.asserted: goblins left` ohne tatsächliches `scene.left` ist keine autoritative Bewegung. Sicherstellen, dass lokale neue NPCs und bewusst vom PC beobachtete äußere Ankünfte nicht pauschal verhindert werden.

## 5. Gear- und Ökonomietest – echter Kauf, aber klassenschlechtere Wahl

- **E77/Input 39:** tatsächlicher Händlerkauf Jagdmesser **8 cp**, `offer.closed`, `transaction.completed`, `coin.changed`. **E79/Input 40:** `item.equipped` in `weapon`, Messer **ATK 6, MATK 0**, vorheriger `starter_arcane_staff_r2` explizit entfernt.
- Der Starter Arcane Staff hat laut `content/gear.json` **MATK 10**. Das Messer ist daher **kein ersichtliches Upgrade für offensive Magier-Skills**; die Engine bucht den klar autorisierten Tausch korrekt, der Spieler bewertet seine Klasse aber nicht hinreichend.
- **E113/Input 57:** später echtes `item.equipped` für gefundenes **leaf-bladed shortsword ATK 4, MATK 0**; ebenfalls kein Caster-Fokus, sogar weniger physischer ATK als das Messer. Nicht behaupten, dass es die nächste Magier-Kampfperformance im Test verschlechtert hat: **nach beiden Wechseln wurde kein weiterer Kampf gebucht**.
- **Kein dokumentierter Lootverkauf und kein Verkaufserlös.** Starterkauf, Verpflegung und Quest-/Erzählentscheidungen verbrauchen Geld; Endstand **2 cp**. Der neue Runner priorisiert Käufe und Anlegen jetzt tatsächlich, aber nicht klassengerecht. Das ist zunächst **Testspieler-/Guide-QoL**, kein nachgewiesener Schadenrechenfehler; Freiwilligkeit/Spielerfreiheit erhalten.
- Empfehlung für Guide-Präzisierung: vor Kauf/Equip **rollenrelevante Attributänderung** (Mage MATK/MP/Defensivwert statt blind ATK) vergleichen, nicht einfach jede seltene oder neue Waffe ersetzen. Nur kaufen, wenn besser und bezahlbar; Beuteverkauf bleibt eine Möglichkeit, kein Pflichtpfad.

## 6. Sonstiges, Abgrenzungen und Priorität

- **Private NPC-Aufträge .76:** Mehrere freiwillige Aufträge zu Trud angenommen (E75, E115, E181), weitere Angebote; keine beweisbare zu frühe auftragsbezogene Bezahlung. Zwei Quests erhalten erst in E200 `quest.ready` durch den **unerreichten** Camp-Schauplatz – mit dem obigen P1 zusammen prüfen. Keine Privatquest als `completed` gebucht und keine private CP-Zahlung.
- **Zeit-/Schlafkontinuität:** Inputs 97–99 reden über eine Nacht/„first light“. In E194 verweigert die Engine `arrive:no_go` und kappt erfundene **720 Minuten** auf **120 Minuten**. Nach der erzählten Nacht bleibt die mechanische Uhr zunächst am Abend: Erzähler/HUD auseinander. **P2:** Schlaf/mehrstündige Zeit nur auf vom Spieler wirklich gewählte Ruhe-/Wartehandlung buchen; Erzählung und tatsächlichen Folgetag synchron halten, keine globale Zeitcap-Aufweichung.
- **Befunde zu komplexen NPC-/Loot-Geschichten:** Spieler verfolgt bewusst den vermissten Trud, übernimmt Marta als Begleiterin und entscheidet, gegen den 433-HP-Shaman nicht zu kämpfen. Das belegt breite Sandbox-Spielbarkeit und Player Agency **teilweise**, ist aber weder Dungeon-Clearance noch 3–5er-Kampfkalibrierung. Kein Grund, Schaden/HP/NPC-Flucht pauschal zu ändern.
- **Technische Stabilität:** Ende `integrity: OK`, echte Engine-Laufzeit stabil, vierstellige Eventfolge, erfolgreich fortgesetzte Reparaturen und reguläres 100-Input-Ende. Integritätsprüfung meldet bei E146 keine Regelverletzung, obwohl die fachliche Slot-Doppelung deutlich ist: zusätzlicher **szenariobasierter** Test notwendig.

## 7. Fachlich getrennte nächste Schritte

1. **P1 Board-Repair/Generator:** korrektes fünfstufiges Profil auch nach ungültiger Empfängerbezeichnung wiederherstellen; keine Lockerung der sachlich richtigen Empfängerprüfung.
2. **P1 Dungeon-Slot-/Gruppenmaterialisierung:** E146 als Rot/Grün; keine sechs Entity-Spawns für drei Goblins.
3. **P1 Scene/GO-Firewall und Dungeon-Abgänge:** E200 (Trud + vier Goblins ohne GO am Schmiedehof) verhindern; E164/174 Goblin-Erzählung vs. Engine-Entities konsistent halten; Quest-READY an echte Orts-/Handlungsnachweise binden.
4. **P2 Guide für Klassenausrüstung:** Mage-Waffe MATK 10 nicht grundlos durch 0-MATK-Waffe ersetzen; reale spätere Kampfprobe mit sinnvollem Gear. Ruh-/Zeitkontinuität getrennt beurteilen.
5. **Noch offen:** Natürliche E83/E165-Lieferabnahme auf .78, Board-Korrektur, Test von Begegnungen mit drei oder fünf Gegnern und balanciertem Gear. Kein Combat-Zahlenpatch auf Grundlage dieses Runs freigeben.

**Review-Status:** Analyse/Archiv, **keine Codeänderungen oder zusätzlichen Tests durchgeführt**. ZIP nur im Chat verifiziert, kein Git-Binärarchiv. Fachliche Gegenbelege, Grenzen und Testideen oben; ein Patch benötigt eigene Freigabe/Implementierung.
