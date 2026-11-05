# .157 — User01 UI und Gameplay-QoL (U1–U3)

Grundlage: main `PATCH_USER01_UI_QOL.md`, ursprünglicher User01-Export und angenommenes Gegenfeedback vom 04.11.2026. Aufbauend auf S1 `.156 / c7cbcef`. Kein Finanz-, NPC-, Balance-, Lootgenerierungs- oder Dungeonreset-Umbau.

## Umsetzung

**U1 – Anzeigehierarchie.** Ein tatsächlich gelesenes, kanonisches Board erhält kompakte Karten: Titel, Rang/Questlevel, Belohnung und vorhandener Gefahrenkern bleiben sichtbar; Auftragstext, Auftraggeber und Referenz liegen in nativen, per Tastatur bedienbaren Details. Keine Buttons, Modellcalls oder Events beim Aufklappen. Der bisherige vollständige Plaintext bleibt im Record/Audit; nur seine doppelte Darstellung wird unterdrückt, wenn die strukturierten Karten vorliegen. Der Renderer liest Quest-IDs/Zustand, keine Narratorangebote oder aus Prosa geparsten Quests. Eine noch nicht erreichte Gildenhalle zeigt kein vorzeitig bestätigtes Board.

Dungeonetage erscheint auch bei geschlossenem World-HUD und im aktiven Combat-Kopf. Quelle bleibt `trueDungeonOf`/`floorAt`: Eingang 0, tatsächliche Raumetage, sonst bestehender Fallback 1; kein zusätzliches Etagenfeld. Bekannte Awareness wird als aware/unaware/suspicious angezeigt, fehlende Werte bleiben unknown; daraus entsteht kein Ambush-Versprechen. Im Kampf bleibt genau die vorhandene führende Target-Tabelle; der bestehende Filter redundanter System-Snapshots bleibt erhalten, Treffer-/Aktions-/Ablehnungslog wird nicht gelöscht. Es gab keinen Beleg für zwei tatsächlich gebuchte Combat-HUDs.

Erneute Dungeon-Clear-Angebote weisen auf einen bereits geräumten Zyklus hin. `clearDone().ok`, Annahmezeit, Reset, Rewards und Gildenregeln bleiben unverändert; lediglich die falsche Zuschreibung eines früheren eigenen Clears an „others“ ist korrigiert. Der Clear des aktuellen Zyklus besitzt bei der Erklärung Vorrang vor früheren eigenen Erfolgen. Keine genaue Reset-Zusage aus unbekannten Daten.

**U2 – vorhandene Bodenfunde.** Das World-HUD nennt bekannte, am aktuellen Ort frei erreichbare Objekte samt vorhandener Menge. Name genügt normalerweise; nur gleichnamige Funde erhalten ihre Referenz zur Unterscheidung. Anzeige und bestehender TAKE benutzen denselben kleinen `groundAccess`-Helfer. NPC-/PC-Besitz, fremde Räume und geschlossene Behälter erscheinen nicht als freie Bodenware. Kein Autoloot, neuer Befehl, Sofortbuchungsbutton oder neues Fundsystem. Teilmengen und Aufnahme buchen weiter über den bisherigen TAKE-Pfad.

**U3 – mechanisch eindeutiges Band-AoE.** Nur wenn die strukturierte Skillaktion kein ausdrückliches Ziel nennt, darf ein einziger sichtbarer, lebender, nicht kapitulierter, erreichbarer gegnerischer Bandbereich den fehlenden Anker ersetzen. Vorschau des bereits erlaubten Schritts ohne Zustandsmutation; keine zusätzliche Bewegung zum Erzeugen eines passenden Ziels. Mehrere Bänder, volle Deckung, fehlende Reichweite oder unbekannte Ziele behalten die Rückfrage. Vorhandene ausdrückliche IDs/Listen und bewusste NPC-Angriffe haben Vorrang; ein falsches genanntes Ziel wird niemals ersetzt. Kosten, Treffer, Schaden, Initiative, Opferbestimmung und physische Explosivgegenstände bleiben der bestehenden Combat-Engine überlassen.

SillyTaverns `custom-`-Präfix wird von CSS und DOM-Abnahme berücksichtigt. Die vorhandene Runner-Bildschirmlesung erkennt die neuen Boardkarten als Engineinformation statt Narratorprosa; keine Strategie-/Zieländerung des Runners. Erzählerkarte/Extractorvertrag unverändert.

## Rot/Grün und Regressionen

15 neue fachliche Tests auf unverändertem `.156`: **10 rot, 5 bereits grüne Kontrollen**. Auf .157 alle grün. Enthalten sind die originalen vier MEDIUM-Beetles aus User01 (Prefix bis I18), Batch22-Mage/Brenna, tatsächliche einmalige AoE-Ausführung/Kosten, aktive Encounters, Mehrband-/Deckungs-/Reichweitengegenfälle, explizite NPC-/abwesende Ziele, Bewegungsvorschau, Etagenfallback, Awareness, escaped HTML, Board-Plaintextfallback, freie/gesperrte/gehaltene Gegenstände, Teilmengen/TAKE und alte/neue/eigene/fremde Clears. Ein zusätzlicher Replay-Linientest pinnt alle 479 bisherigen Einträge unverändert.

Angrenzende HUD-/User-/Dungeon-/Stealth-Prüfungen: 57/57 in der frühen fokussierten Gruppe. Finale UI-/Runnergruppe: 164/164. Volle finale Node-Suite: **2770/2770**. Die alte HUD-Prüfung behält ihre vier festen Spalten und erwartet ausdrücklich die um Awareness ergänzte Beschriftung; keine Kampfwerte geändert.

## Fingerprint-Replay

2235 Originalzustandsfälle; **481 Abweichungen exakt akzeptiert, 0 offen, 0 veraltet**. Alle bisherigen **479 Einträge einschließlich ihrer Begründungen unverändert**; Gesamtdigest zusätzlich gepinnt. Nur folgende zwei neue Fälle:

| Fall | Beabsichtigte Änderung |
|---|---|
| b17-rogue#183 | „Fan of Blades on both beetles at SHORT“; Planner `target:null`, B/C lebend/sichtbar/hostile im einzigen gültigen Band. Statt Target-Rückfrage ein Angriff für 14 STA, Sieg über B/C, regulärer Abschluss des bereits laufenden Encounters, 480 XP und bestehendes Loot (6 Platten, 2 Drüsen). Kein Coin-/Handelsereignis. |
| b17-rogue#185 | Benennt B und C ausdrücklich im Text, aufgezeichneter Planner ebenfalls `target:null`; derselbe mechanisch eindeutige Bandfall und reguläre Abwicklung. |

Die beiden Records werden unabhängig auf ihren jeweiligen Originalvorzuständen geprüft; keine zwei Belohnungen in einer fortgeschriebenen Kampagne. Keine pauschale Fingerprintaktualisierung. Anzeigeänderungen benötigen keine neuen wirtschaftlichen Freigaben; keine weiteren Event-/Resultatabweichungen im Korpus.

## Abschließende technische Abnahme

**Echter ST-Standard: 62/62**, 65 Modellaufrufe / 25 Extraktionen, 0 PageErrors. **Finaler Failsoft: 68/68**, 71 Modellaufrufe / 27 Extraktionen, 0 PageErrors; enthält zusätzlich die schmale Combat-Ansicht. Ein vorheriger Lauf auf demselben finalen Produktstand war ausschließlich wegen `AbortError`/`AbortReason` aus ST `openai.js` rot; unveränderte Wiederholung vollständig grün, keine Fehlerfilterung oder Produktumdeutung. Ein erster erweiterter Failsoft-Lauf bestand 67/68: ausschließlich der neu geprüfte horizontale Umbruch des AoE-Labels im schmalen Combat-HUD war rot; fachliche und Persistenzprüfungen grün. Die Inline-Badge-Breite wurde korrigiert, keine Mechanik geändert. Die isolierte Browserprüfung enthält tatsächlich gespeicherte User01-Board-/Raumzustände, Boardlesen über den Produkthost, Aufklappen per Tastatur, schmalen Chat, Bodenfunde/Etage und den bestehenden Combat-Renderer. Geskriptete Modellantworten belegen den Hostvertrag, keinen neuen natürlichen GLM-Spieltest.

**Getrennte bekannte Harness-Grenze:** Der zusätzliche ältere `smoke:browser` scheitert am GenerateRaw-Gebührenfixture (zweiter Interpreter-/Repair-Aufruf statt des erwarteten einen). Identischer Befund auf unverändertem `.155` und .157: `generateRawPath:false`, `requests:false`, keine Browser-Seitenfehler. Kein Nachweis einer .156/.157-Regression; keine Produkt-/Finanzänderung als Workaround. Echte ST-Abnahme oben separat.

## Grenzen / nächste Prüfung

S1 `.156` bleibt die Grundlage; S2 (heimliche Suche/Aufnahme) wartet auf persönlichen Test. Keine allgemeine Main/Minor-Ökonomie, kein neues NPC-Memory, keine Engine-Shops oder zusätzlichen Lootfunde. Mehrdeutige AoE-Wahlen werden weiterhin geklärt. Der bestehende Etagenfallback ist keine neue Entdeckung verborgener Ebenen. Ob Informationsdichte und Kartenaufteilung persönlich gut spielen, beurteilt der nächste User-Test; technische Sichtprüfung ersetzt dieses Urteil nicht.
