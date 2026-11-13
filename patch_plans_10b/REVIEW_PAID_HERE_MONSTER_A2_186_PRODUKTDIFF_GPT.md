# Unabhängiger GPT-Produktdiff-Gegenreview – .186 (PAID HERE + Monster A2)

**Stand 13.11.2026.** Produktrepository `Mango1331/Claude-AI-RPG-Game`, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`; **Remote-HEAD bei Prüfung `13824919a85042184d7ced2fc2ca783bf6cf7103`**, identisch mit dem geprüften Produktbuild `4.3.0-c.6.6.186`. Basis `.185` (`d556580`). **Paket 1** `5ec21c4` und **Paket 2** `35d1955`, anschließend Build/Replay/Patchnote `1382491`. [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/1382491/avereth-engine/docs/PAID_HERE_MONSTER_A2_186.md).

**Grundlagen:** [GPT-Gegenreview `.185`](REVIEW_STABILIZATION_185_PRODUKTDIFF_GPT.md), [verbindlicher Monster-A1/A2-Fachplan mit GPT §8 und Opus §9 K3–K7](FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md), geltende Entscheidung für D1–D5, D7 und A2-4/D8 zurückgestellt. Der Nutzer beauftragte zuerst den kleinen `PAID HERE`-Fix mit separatem Commit/Push und gezielten Tests, danach A2 als zusammenhängenden Release mit Vollsuite und Replay.

**Eigene Prüfweise:** Tatsächlichen GitHub-Diff von `d556580` nach `1382491` abgefragt, zentrale vor/nach-Dateien und beide neuen Regressionstests gelesen, versionsbezogene Extraktorfelder und Aufrufreihenfolge von `world.js`/Materialisierung geprüft, beide Akzeptanzlisten als JSON vollständig strukturell verglichen. **Nicht unabhängig ausgeführt:** `npm test`, alle Hostpfadtests, Replay-Fold, ST-Smoke, natürlicher Modelllauf. Die Zahlen des Implementierers sind als solche gekennzeichnet.

## 1. Ergebnis

**Fachlicher GO für beide Pakete; kein verpflichtender weiterer Korrekturpatch im geprüften Diff erkennbar.** Die enge `PAID HERE`-Korrektur bewahrt das vorhandene Zahlungsmodell; Monster A2 greift in Profil, Kampftext und Beute zusammenhängend auf dieselbe einmal festgelegte Ausrüstung zu. Versionen `delta-1.15` und `extract-5.26` entsprechen dem Vertragswechsel. A1, die bereits geschlossenen Zahlungs-/Quest-/Extractorprobleme von `.185`, Regeln für Personen, Monsterkampfwerte und PULSE werden nicht ersichtlich erweitert.

**Freigabegrenze:** Aus den geskripteten Tests folgt noch keine natürliche Modell- oder SillyTavern-Abnahme. Insbesondere die tatsächliche zuverlässige `armed`-Meldung, Gruppensemantik und erzählerische Passung von Waffe/Beute sind im nächsten natürlichen Batch zu beobachten.

## 2. Paket 1 – `PAID HERE` (Commit `5ec21c4`)

- **Ursache geschlossen:** `paidLodging()` wählte in `.185` für jeden gebuchten Dienst das letzte angenommene Angebot desselben Verkäufers. Bei zwei echten Betten/Nächten konnte die ältere Leistung daher Preis und Wortlaut des neueren Angebots erhalten.
- **Neue Zuordnung:** `src/v4/domain.js` `soldUnder()` sucht beim Fold eines `service.granted`-Events die genau eine noch **offene** passende Dienstleistungszeile, nach Verkäufer, Ort, Service, **exaktem Wortlaut** und nicht bereits verwendeter `offer|line`-Zuordnung. `bookPurchase()` erzeugt `service.granted` vor `offer.closed`; dadurch ist die Zeile zu diesem Zeitpunkt tatsächlich offen. `state.services` speichert `offer` und `line` als abgeleitete Foldinformation, die Originalevents bleiben unverändert.
- **Verwendung:** `paidLodging()` liest fortan genau diese Angebotszeile; ohne eindeutige Zuordnung gibt es keine erfundene Leistung und keinen Preis, nur `a bed here`. Die `.185`-Mehrpositionsklärung bleibt erhalten.
- **Testabdeckung:** `fix186_paid_here.test.js` prüft zwei nacheinander **wirklich gebuchte** verschiedene Nächte (3/5 cp) in Narrator/Planner und nach Reload; zwei Zimmerpositionen eines Angebots, unbestimmte alte/mehrdeutige Zuordnung und die unveränderte Kaufklarstellung. Laut Implementierer **4/4**, rot auf `.185`.
- **Bestandstest `patch_prebatch99`:** Wiederkauf eines künstlich neu geöffneten Zimmer-/Essensloses wurde auf nach dem 24-Stunden-Fenster gelegt. Das schützt die inzwischen geltende innerhalb des Fensters notwendige Doppelbuchungsklärung, nicht eine neue unbeschränkte Kaufgarantie.

**Restrisiken, kein jetziger Pflichtfix:** Eindeutigkeit wird aus dem beim Fold vorhandenen offenen Angebot hergeleitet, nicht aus einer neuen expliziten Original-Event-ID. Für alte oder besonders unklare Zustände wird die Position deshalb konservativ weggelassen. `PAID HERE`/die Sperre gelten weiterhin ortsgebunden; ein Zimmer in einem gesonderten Unterraum bleibt die dokumentierte Grenze. Eine unzugeordnete, vom Enginezustand als `service.granted` belegte Unterkunft wird weiterhin als `a bed here` angezeigt; das darf weder mit sicher bekanntem Preis noch mit einer konkret identifizierten Angebotsposition verwechselt werden.

## 3. Paket 2 – Monster A2 (Commit `35d1955`)

| Teil | Gegenbefund |
|---|---|
| **D1, D4 – Standardausrüstung** | `content/monsters.json` bietet Goblin Messer/Speer/unbewaffnet 6:3:1, Schamane Fetisch/Fokus und Oger/Troll Keule; Salvage 0,55/0,4/0,7. Die alte `gear`-Tabelle bleibt neben `loadout` bestehen. Designwerte, keine nach natürlichen Läufen kalibrierte Balance. |
| **Festlegung** | `engine.js` `materialise()` ruft `creatureGear()` bei der einmaligen Profilanlage auf. Für echte Slotgegner wird zuvor in `world.js` `slotEntityEvents()` gebucht, das Slot-`entities` setzt; somit ist die Position im Slot beim Hash feststellbar. Ohne Slot hängt der Wert an der Entitäts-ID. Kein Verbrauch von Combat-Dice. |
| **A2-3 / K3** | `creature.new.armed` ist nullable und trägt eine explizite humanoide Waffenmeldung; `world.js` schreibt sie bei Neuerzeugung vor der Materialisierung. Eine Gruppenmeldung gilt bei `count > 1` für alle oder null gemäß Extractorvertrag; keine Laufzeit-Interpretation einzelner Mitglieder erfunden. Nicht-humanoide Arten ignorieren das Feld. |
| **D2/D3** | Gemeldete Waffen bekommen die Werte der passenden Waffenfamilie aus der Ankerliste oder deren bestehende höchste Stufe, nicht menschliche Ausrüstungswerte. Bogen und Fokus erhalten keinen geänderten Angriff, Nahkampfwaffen nur den neuen Angriffsnamen und ein Kennzeichen `weapon:true`. |
| **K7 Kampf/Anzeige** | `combat.js` benutzt bei `profile.attack.weapon` den gespeicherten Namen in `raw_text`, sonst die bisherige `natural attack`-Form; `context.js` ergänzt `armed`, `unarmed` oder `carries` in Kreaturkarte und Kampfblock. Kein vorab erfundener Waffenbesitz in `DUNGEON AHEAD`. |
| **D4 Beute / K5** | `lootEvents()` nutzt beim Tod `profile.gear.weapon` und einen deterministischen Verwertbarkeitswurf. Bei Erfolg entsteht **eine Waffe**, sonst nur die `broken`-Zeile. Vor dem Tod gibt es dafür kein Inventarobjekt. |
| **D5/K6 Legacy** | Fehlt `profile.gear`, läuft unverändert die bisherige `spec.gear`-Quote. Bereits festgelegte Kreaturen ohne neues Feld behalten die alte Regel. |

**Testabdeckung:** `fix186_monster_a2.test.js` prüft Distribution über 400 IDs, erwartete Beuteanteile, einmalige bewaffnete/unbewaffnete Profilanlage, Bogen/Fokus, explizite Waffen und Familienwerte, echten Host-/Kampf-/Reloadpfad, gemeinsame Gruppenmeldungen und individuellen Slot-Hash, unveränderte Nicht-Humanoide/Personen und Legacy. Laut Implementierer **10/10**.

**Wichtige Nachweisgrenze:** Der reale Replaykorpus enthält bei `.186` keine getöteten humanoiden Kreaturen. Das tatsächliche Zusammenspiel aus Kampfdarstellung, Profilwaffe und späterer Beute ist damit **durch gezielte Tests, nicht durch einen natürlichen Korpuserfolg** belegt. Die dokumentierten Restwidersprüche bei „zwei von drei Goblins tragen Speere“ und bei erst später aufgehobenen Waffen sind bewusste K3-/Profilgrenzen, keine heimliche Freigabe von Waffenübertragungen.

## 4. Replaylisten strukturell unabhängig verglichen

Echte JSON-Dateien `tests/replay/accepted_stab185_vs_126.json` und `accepted_monster186_vs_126.json` vollständig gegeneinander verglichen:

- **1077 alte Akzeptanzen und 1077 neue Akzeptanzen**.
- **1068** inhaltlich unverändert, **9** mit den exakten Kategorien `monster186 humanoid loadout` (**3**: `b17-mage#150`, `#172`, `#186`) und `monster186 armed field` (**6**: `b17-rogue#200`, `b17-warrior#42`, `b18-warrior#202/#294/#334`, `b19-warrior#294`).
- **Alle neun** enthalten die richtigen Vorgängerkategorien und vorherigen Fingerprints (`previous_acceptance_185`). **Keine** neuen oder gelöschten akzeptierten Fälle; `returned` ist identisch.
- `replay.test.js` enthält einen Schutztest gegen andere Kategorie-/Referenzänderungen.

**Trennlinie:** Implementierer berichtet **509/509** angrenzende Tests, **3161/3161** `npm test`, **2235** Replayfälle mit neun einzeln feldweise begründeten Differenzen, **1077/1077** Korpuscheck und gültige Fold-/Reloadstates. Die eigene Prüfung bestätigt die **Akzeptanzlistenstruktur und Codeursachen**, nicht die eigenständige erneute Ausführung aller 2235 Fälle oder der ganzen Testsuite.

## 5. Empfehlung für den Anschluss

**Keinen neuen Korrekturpatch ohne neue Evidenz.** Erst den echten isolierten ST1.19-Standard-/Failsoft-Smoke mit separater Datenwurzel nachholen (neuer Extractorvertrag `delta-1.15`/`extract-5.26`, nie gegen persönliche ST-Daten laufen lassen). Danach einen **gezielten natürlichen** Gasthaus-/Gilden-/Humanoid-Kampf-Smoke und den bereits vorgesehenen Warrior/Rogue/Mage-Dreierbatch auf eingefrorenem `.186`-Checkout ausführen.

Im Batch getrennt zählen: erzeugte `armed`-Felder, davon Gruppenmeldungen, neu festgelegte `profile.gear`, Kampftext mit derselben Waffe, real erbeutete/beschädigte Waffen; `PAID HERE`/Mehrpositionskauf, offene `#pay`-Karte, `priced`-Reparatur und Questannahme; E3-Wiederbegegnungen und tatsächlich gezeigte dauerhafte Anker sowie PULSE-Orts-/Rastprobleme. Keine künstliche Erfolgsquote aus bloß erfolgreich beendeten Kindläufen.

**Keine Produktänderungen durch diesen Review.** Monster A2 ist technisch prüfbereit; eine natürliche Spieler- und Modellfreigabe liegt noch nicht vor.
