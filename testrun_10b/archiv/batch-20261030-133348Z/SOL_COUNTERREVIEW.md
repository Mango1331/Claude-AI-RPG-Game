# Batch19 – Sols unabhängige Gegenprüfung

30.10.2026. Original-ZIP `batch-20261030-133348Z(1).zip`: 52.535.544 Bytes, 50 Einträge, CRC vollständig gültig, SHA-256 `7270a50db8ab6bbfbf758affae87cfd20c056c42bca29aa0e7ea228a9b51bf98`. Identisch zum GPT-Upload trotz anderem Dateinamen. ZIP nur als Chatupload vorhanden; kein GitHub-Binärupload behauptet. Produkt-HEAD geprüft: `.125`, `e779fee3eadd7755c18643ad5c2e1b631a507830`. [GPT-Review](REVIEW.md) bleibt unverändert.

## Unabhängiger Nachweis

Alle **3923 Events aus570 gespeicherten Records** gegen ihre tatsächlichen Chat-Records verglichen, mit dem Produkt-Reducer neu angewendet und nach jedem Record `validateState` geprüft: keine Fehler. Die drei kompletten Endzustände entsprechen jeweils dem zusätzlichen vollständigen `foldChat`-Replay einschließlich dessen Fehlerprüfung. Alle35 Coin-Änderungen gegen vorigen Saldo und Delta, XP-Buchungen/Levelüberträge gegen bestehende100×Level-Schwelle sowie sieben Questabschlüsse gegen jeweils genau eine zugehörige Transaktion geprüft: konsistent.18 PP-Schlüssel, innerhalb jeder Kampagne eindeutig.

Alle **901 gespeicherten Completion-Antworten** ausgewertet: keine leere Content-Antwort, kein `finish_reason:length`; alle mit `stop`.23 Planner-,19 Extractor- und4 Board-Reparaturen; diese46 reparierten Anläufe sind keine terminalen Ausfälle. `pageErrors`/`serverErrors` leer, keine sichere Fortsetzung. Keine neue Node-Testsuite und kein ST-Smoke ausgeführt. Zusätzlich nur lesende Scratch-Sonden gegen die echten Originalzustände/`applyWorld`, keine Produktdateien oder Tests verändert.

| Profil | Inputs / Ende | Siege | Guildabschlüsse | XP gesamt | Gear/Entwicklung |
|---|---|---:|---:|---:|---|
| Warrior |200 / L12,635 Rest-XP, Limit |15/15 |4 |7235 |Superior Longsword ATK18; Starterrüstung; echter neuer aktiver Skill |
| Mage |94 / L7,640 Rest-XP, Tod |7/8 |2 |2740 |Fine Staff MATK14 und Robe DEF3/MDEF4; Arcane Bolt P3 |
| Rogue |32 / L2,90 Rest-XP, Tod |1/2 |1 |190 |Quilted Fighting Robes DEF3/MDEF3; Starterwaffe |

Kein L15 und kein `class.evolved`. Die dritte Runner-Etappe bleibt natürlich ungetestet. Keine neue `encounter_levels`-Buchung: Gildenpopulationen funktionieren mehrfach, freie Gebietsklassifikation ist dadurch noch nicht natürlich abgenommen.

## Bewertung der GPT-Befunde

**Bestätigt:** Kennzahlen, Geld/XP, Questauszahlungen, Gearkäufe, aktueller Stand ohne freie Gebietsklassifikation sowie fehlende E-Annahme. „Finer Longsword“ für80cp war Common/ATK10, kein mechanisches Upgrade; später Superior260cp/ATK18 tatsächlich angelegt. Mage besucht unterschiedliche passende Shops und verbessert beide Geararten. Warrior hat trotz erheblichem Schlussgeld keine neue Armor-Equip-Buchung; kein Beweis, dass der Runner jeden sinnvollen Upgradebedarf bereits erfüllt. Der alte Bundlefehler wird weder reproduziert noch widerlegt.

**Organischer Erfolg bestätigt:** Originalrecord151 / Playerinput76 bucht `skill.defined` und `skill.learned` für **Iron Guard Riposte**, C2/P1, nach ausdrücklicher Annahme. Ein tatsächlicher aktiver Erwerb, kein Klassenwechsel. Der Primer of Mend beim Mage öffnet nur Lernen mit Zeitfortschritt; kein neuer gelernter Mend.

**Kampftode bestätigt:** Mage beginnt den letzten Kampf mit70/150HP, nach Arcane Wave14HP, danach Arcane Bolt und17 eingehender Schaden. Rogue greift aufL2 drei korrekt gebundeneL6-Herons an:82→63→8HP. Evasive Step bewegt die Gegner aufSHORT und reduziert eingehenden Schaden um25%; ein Heron schließt auf und verursacht13Schaden. Die Fähigkeit ist ausgeführt, keine garantierte Flucht. Keine abweichende Schaden-/XP-Rechnung belegt. Beim Rogue war dieL4–7-Zielspanne verfügbar. Diese riskanten Entscheidungen sind keine Grundlage für einen pauschalen Klassen- oder HP-Buff.

## Bestätigte .125-Regression: Artzusatz ersetzt das letzte Hauptwort

`v4/domain.js:populationAt` (308–316) verwendet nur `kindOf(text,{species:true}).head`. Die gespeicherte Art `wild boar` hat so den Kopf `boar`, `wild boar sow` dagegen `sow`, `wild boar yearling` dagegen `yearling`. Beide verlieren den Match trotz richtigem Ort und Körperbau. `world.js:newEntity` und `engine.js:materialise` erhalten deshalb keine Population; es folgen alter niedriger Fallback, kein `population_at`, kein entsprechender Questcredit. Der schützende .125-Giant-Boar/Turtle-Fix ist hier zu eng. Das ist eine konkrete Regression meines Vergleichs, kein Beleg für einen untragfähigen Enginekern.

Originalzustandssonden, identische Prosa/Antwort bis auf die ausdrücklich genannte Vergleichsvariable:

| Originalrecord | Originalart | .125 unverändert | Nur Species auf `wild boar` normalisiert |
|---|---|---|---|
|214 |wild boar yearling |L1, ungebunden |L6, gebunden |
|218 |wild boar sow |L1, ungebunden |L6, gebunden |
|272 |wild boar sow |L1, ungebunden |L5, gebunden |

Der vorherige .124-`namesKind`-Prädikatvergleich trifft in allen drei Originalfällen zu. Die Sonde ist kein vollständiger .124-Neulauf. Besonders272 ist eindeutig: Der Narrator beschreibt eine große Sau und ausdrücklich „She was no yearling“. Dass dieselbe erwachsene Art als L1 erscheint, ist keine bewusste Jungtierkalibrierung.

**Wichtige Präzisierung zur Review:** Die erste `quest.ready`-Ablehnung bei Record126 (3/4) liegt lange vor diesen Varianten; dort sind tatsächlich erst drei passende Boars gefallen und selbst die Geschichte sagt „One more“. Sie ist kein Symptom dieser Regression. Bei290/384 sind2/3 nach gespeichertem Zustand ebenfalls korrekt. Insgesamt vier im Kampf getötete ungebundene Varianten: zwei Sauen, zwei Jahrlinge. Keine rückwirkende Freigabe ihrer Kills; eine hypothetische höhere XP-Gesamtsumme wäre wegen anderer Kämpfe/Levelverläufe nicht belastbar.

## Jungtiere: bestehende Regel statt neuer Grundsatzentscheidung

Die GPT-Forderung nach Klärung ist sinnvoll, aber die Jagdsemantik ist teilweise bereits beschlossen: `monsters.json:kind_words.young` und `guild.js:cullKind` (953–957) schließen Jungtiere aus gewöhnlichen Jagdzielen aus, sofern das Ziel sie nicht ausdrücklich nennt. **`yearling` fehlt** in dieser bestehenden Wortgruppe; `namesYoung('wild boar yearling')` liefert tatsächlichfalse. `sow` allein ist dagegen kein Jungtiermerkmal.

Darum Artidentität, Individuenstärke und Questberechtigung getrennt erhalten: Eine Sau ist dieselbe Art. Ein Jahrling kann derselben Art angehören, ohne automatisch einen Erwachsenenauftrag erfüllen zu dürfen. Die konkrete Junior-Levelwahl ist bisher kein ausgearbeitetes System; das zufällige L1 durch fehlenden Artmatch ist dafür kein verlässliches Design. Keine neue vollständige Alters-/Speziesengine nur für diesen Befund.

## Empfohlener nächster Fachfix, noch nicht implementiert

1. Populationsabgleich so korrigieren, dass die **konkrete bekannte Tierart** mit nachgestellten Individuenmerkmalen erkannt wird. Gemeinsame Adjektive bleiben unzureichend. Nicht global `namesKind` lockern oder schlicht nur auf gleiches Bodyplan-Anchor prüfen. Species als Art und Alter/Geschlecht als Beschreibung im Extractor sauberer trennen; Prompt allein ist keine Absicherung.
2. Bestehende Jungtierregel in derselben Regressionsmatrix ausdrücklich prüfen: erwachsene Sau zählt bei erfülltem Level/Ort/Annahmezeitpunkt; ausdrücklich junge Variante nur für erlaubtes Ziel. Vor numerischem Junior-Ausbau den kleinsten gewünschten Default festlegen. Keine rückwirkende Profil-/Killmigration und kein offenes Wörterbuch für jede neue Fantasyart erforderlich.
3. Original272 plus214/218: richtige Population/Level für erwachsene Artvarianten, eigener Jungtiergegenfall, weiterhin Giant Boar≠Giant Snapping Turtle, fremde Art trotz gleicher Merkmale, anderer Ort, bestehendes Profil, Replay. Allgemeine Gilden- und Dungeontexte unverändert lassen. Die vorhandenen18+3 Gebietstests decken nachgestellte Alters-/Geschlechtsnomen bislang nicht ab.

Der P2-Paketangebotsfehler bleibt ein getrennter Handelspunkt. Keine neue XP-/PP-/Startwerteänderung aus diesem Batch. Der Warrior kommt ohne E-Skalierung bereits aufL12, aber vier Kämpfe gegen ungebundene Varianten und lange Wiederholungen verfälschen das Tempo. Natürliche Gebietsfenster und E-Annahme weiter beobachten; keinen Runner zur künstlichen Erfüllung zwingen. Keine weiteren vorsorglichen Bewegungs-/Anwesenheitsfilter aus korrekt verworfenen fremden Szenen ableiten.

**Gesamturteil:** Technisch stabiler Batch mit funktionierenden Transaktionen, mehrfach korrekten Populationen, Gear und echtem organischem Lernen. Die GPT-Review ist im Kern bestätigt. Der relevante neue Defekt ist ein begrenzter Artklassifikationsfehler aus.125; seine Ursache ist abgesichert, seine Behebung braucht keine neue Weltarchitektur. Produkt und Runner bleiben unverändert.
