# Sol – Gegenreview des dritten Batches

28.10.2026. Original-ZIP vollständig geprüft: **66.752.395 Bytes**, 50 Einträge, CRC fehlerfrei, SHA-256 `b0f77ddfef8d95fb7acb90f4b77bf89d34789119c706468e2809ddeff4c8d3ee`. Alle drei Chats, Events, Requests, Spielerprotokolle und Auswertungen herangezogen; entscheidende Abläufe selbst im Code verfolgt. Laufstand **.102 / 57ec7f6**, aktueller Entwicklungsstand **.103 / 48bdf5d**. Die lokale Funktions-/Host-Sonde verwendet Originaldaten und gespeicherte Antworten, keinen Provider. **Keine Produktänderung, keine neue Regression, keine Node-Vollsuite oder ST-Abnahme ausgeführt.** Original-Review und Archiv bleiben unverändert.

## Urteil und Vergleich zur GPT-Review

Der Batch ist ein deutlicher Stabilitätsnachweis: **439 Eingaben, 1.177 Engine-Modellaufrufe, 5.236 Events**, keine PageErrors, keine finalen Extractor-Abbrüche. Ein Warrior spielt 250 Eingaben durch, ein Mage endet technisch, ein Rogue stirbt. Die wesentlichen Review-Zahlen stimmen. Daraus folgt keine kontrollierte Klassenbalance und kein Level-15-Nachweis.

| Profil | Eingaben / Endlevel | Ausgang | Eigene Einordnung |
|---|---|---|---|
| Guild-Warrior | 250 / L10 | Eingabenlimit; 22 Siege | Tragfähiger Langlauf; wiederholte leichte Arbeit, keine neuen Ausrüstungskäufe |
| Guild-Mage | 102 / L5 | Plannerfehler; 7 Siege | Originalfehler bestätigt, **durch .103 bereits sicher aufgefangen** |
| Guild-Rogue | 87 / L2 | Tod im dritten Encounter | Richtige Schadens-/Todesbuchung; zu riskante Gruppenwahl und nicht ausgeführter zweiter Skill |

Vier Präzisierungen verändern die Empfehlung der GPT-Review: Der Mage benötigt für diesen Originalfall keinen neuen Hotfix; der Rogue sah eine Level-5-Empfehlung und vier Gegner; der doppelte Dungeonabschluss vergibt auch doppelt Quest-XP; der Warrior unternimmt einen konkreten, mechanisch erfolglosen Manual-Kauf. Die bei .102 diskutierten Code-Randfälle wurden inzwischen in .103 bearbeitet und sind keine erneut offenen Batch-3-Aufträge.

## 1. Mage T102: .103 verarbeitet die Originalantworten bereits sicher

C257 ist gültiges JSON, aber `offer.accept.agreed_cp:40` widerspricht den ausdrücklich genannten **4 copper**. `parsePlan()` klassifiziert diese Antwort als reinen `tradeConflict`. C258 ersetzt das durch `buy.max_cp:40`; dessen Betragsfehler zählt bisher nicht als reiner Handelskonflikt. .102 verliert damit den ersten belastbaren Befund und endet `planner_failed`. Die Verweigerung von 40 Kupfer ist korrekt; es ist weder ein Tokenlimit noch ein JSON- oder Providerfehler.

**Eigene Sonde auf .103:** Originalchat bis T101 gefaltet, T102 und beide unveränderten `plan.raw`-Antworten an `planMessage()` sowie `prepareGenerationAsync()` übergeben. Ergebnis: **zwei Antwortabrufe, `failed:false`, genau CLARIFY; Host-Ergebnis `panels`, `events:[]`**. Kein Kauf, kein Essen, kein Schlaf, keine 40-Kupfer-Zahlung und kein automatisches Ersetzen durch 4. `runtime.js:planMessage()` bewahrt seit .103 den reinen Konflikt des ersten Versuchs, auch wenn das Repair danach scheitert.

Die P1-Diagnose ist für den Laufstand richtig, als neuer Auftrag gegen den aktuellen HEAD jedoch erledigt. **Grenze:** Zwei von Beginn an ausschließlich fehlerhafte `buy`-Antworten erhalten dadurch nicht generell CLARIFY. Dieser andere Pfad ist im vorliegenden Abbruch nicht der entscheidende; kein weiterer vorsorglicher Betragspatch allein daraus.

## 2. Dungeon: zweimal bezahlt, aber kein doppelter Replay derselben Quest

Der einzige PC-Clear von Mossback Warrens, Ebene 1, Cycle 2 erfüllt zwei verschiedene aktive Vertrags-IDs. T196/E392 bucht **60 + 120 Kupfer** und außerdem **46 + 180 Quest-XP**. Das sind reale Enginebuchungen, keine bloßen Narratorbehauptungen oder nur falsche Evaluatorwerte. Der Spieler bemerkt die beiden Slips T157 selbst; der Narrator bestätigt beide Belohnungen. Das erklärt seine Fortsetzung, begründet aber keine verbindliche Guildregel.

Root Cause: `commands.js:quest.accept` schützt dieselbe Quest-ID, vergleicht aber nicht mit anderen aktiven Clear-Verträgen. `living.js:clearDone()` sucht pro Vertrag eine eigene PC-Räumung derselben Etage seit Annahme, ausdrücklich **in einem beliebigen Cycle**. `guild.js:completeContract()` zahlt anschließend jeden berechtigten Vertrag einmal. Es fehlt keine allgemeine Replay- oder Auszahlungssperre; dieselbe Leistung ist derzeit mehreren Verträgen anrechenbar.

**Designentscheidung erforderlich:** Sollen solche parallelen Aufträge stapelbar sein? Meine Präferenz: eine aktive Guild-Räumung pro Dungeon und Etage, statt zusätzliche Buchhaltung über den Verbrauch einzelner Clears einzuführen. Bei Freigabe an der gemeinsamen Annahme absichern, schon aktive Arbeit auf dem Board erkennbar machen; nach Abschluss und Erneuerung bleiben neue Aufträge möglich. Alte angenommene Verträge nicht rückwirkend entwerten, keine pauschale Änderung sämtlicher Hunt-/Quest-Credits. Die bestehende Boardverteilung muss bei der Darstellung berücksichtigt werden.

**Separater bestätigter Evaluatorfehler:** `tools/st_live/live/evaluator.mjs` summiert für jede `quest.status:completed` alle positiven Payout-Coin-Events desselben Records. Deshalb erhalten beide Einzelquests im Bericht den Wert 180. Künftig zugehörige Transaktionen eindeutig und nur einmal zuordnen; mehrdeutige Altdaten kennzeichnen. Das korrigiert Messwerte, nicht den tatsächlichen Geldstand.

Kleine Quellenkorrektur: Die Review vermischt stellenweise Spielereingaben mit Engine-Turns. Zweite Annahme: **T150 / Engine-Turn126**; Clear: **T191/E381 / Engine-Turn161**; Abgabe: **T196/E392 / Engine-Turn165**. Der erste Vertrag wird tatsächlich in Engine-Turn15 angenommen. Die falschen Turnbezeichnungen ändern den Befund nicht.

## 3. Rogue: harte Begegnung, aber weder belegte Zwangseskalation noch verschwundene Flucht

Die Gegnerwerte und HP-Folge der Review stimmen: vier Strider L4/L6/L4/L5 gegen L2, **95 → 86 → 49 → 14 → 0 HP**. Der Spieler eröffnet T84 ausdrücklich selbst den Kampf. Im Board, das ihm vor seiner Wahl als Engineinformation gezeigt wurde, steht **recommended level 5**; vor dem Angriff zeigt ACTIVE SCENE vier Kreaturen mit ihren HP und Distanzen. Das konkrete Risiko ist also nicht vollständig verborgen. Der NPC bezeichnet die Aufgabe allerdings als „doable solo“ und die sinnvolle schnelle Wahl – eine überoptimistische Erzählbewertung gegenüber dem mechanischen Hinweis.

T86 und T87 enthalten zuerst Razor Cut, danach Evasive Step. `planner.js:mapPlan()` nimmt nach der bestehenden Ein-Hauptaktion-Regel jeweils nur den Angriff. Die zweite Fähigkeit steht ausdrücklich als **NOT TAKEN** im Ergebnis; der Spieler sieht diese Meldung vor T87 bei nur noch 14 HP und wiederholt dieselbe Kombination. Es gibt hier **keinen ausgeführten Flee**, den die Engine anschließend verloren hätte. Ob ein rechtzeitiger einzelner Flucht-/Defensivzug erfolgreich gewesen wäre, ist durch diesen Verlauf nicht getestet. Nicht behaupten, eine Flucht hätte sicher funktioniert oder der Tod sei allein der Klassenbalance geschuldet.

Zusätzliche Reibung: T82/T83 und früher T63/T64 werden „hinlaufen und angreifen“ aus MEDIUM vollständig verweigert. `combat.js:resolveStrike()` prüft Bewegung und Angriff gemeinsam: ein normaler Band reicht nicht bis ENGAGED, deshalb wird auch keine Annäherung gebucht. Das entspricht dem aktuellen Bewegungsbudget, erzeugt aber wiederholte natürliche Annäherungsversuche. **P2 Bedienungs-/Ablauffrage**, kein Grund für mehr Schaden oder kostenlose Zusatzbewegung. Zunächst eine klare Rückmeldung zur nötigen separaten Annäherung erwägen; eine Änderung der Teilauflösung erst gesondert beurteilen.

## 4. Zusätzlich übersehen: Warrior T153–155, Manual nur erzählt gekauft

T153: „I go to the Guild counter and buy the Primer of Mend for 120 cp, then read it to learn the mend skill.“ Geld reicht; die kanonischen SHOP-Zeilen mit 120 cp waren dem Spieler sichtbar. Die Engine autorisiert GO und den anschließenden Kauf bedingt auf Ankunft/Preis, verweigert das sofortige Lernen wegen ausstehender Ankunft.

Der Narrator erzählt anschließend Münzübergabe, gekauftes Buch und Übungen. Der Extractor meldet **Ankunft, `expected.2.priced:true` und einen Buyback-Fakt**, aber **kein ausführbares `offer`**. World setzt die Kaufentscheidung auf `priced`, findet keine dadurch ausführbare Übergabe und lässt sie am Ende des Reisezuges verfallen. Gebucht werden **weder -120 cp noch ein Primer**. T155 wird das Training deshalb richtig mit **no source** abgelehnt. Das ist keine bestätigte PP- oder Skillformelstörung und auch nicht bloß fehlendes Spielerinteresse an neuen Skills.

**P2 Integrationsfall:** Original T153–155 für Ankunft → bereits kanonischer Warenbestand → Kaufentscheidung → Lernquelle gezielt nachstellen. Prüfen, ob die vorhandene gültige Canon-Offerte samt tatsächlicher Verkäuferpräsenz nach Ankunft genutzt werden kann; andernfalls gezielten Repair-/Systemhinweis geben, dass keine Ware gekauft wurde. `priced:true` allein darf niemals Geld oder Inventar erzeugen. Nicht ungeprüft fehlende NPC-Anwesenheit oder einen weiteren Angebotsvertrag erfinden. Der jetzige Material-/Inventarschutz bleibt richtig; die Abwicklung und Rückmeldung brechen die beabsichtigte Lernkette ab.

## 5. Progression, Modellqualität und Runner

- Warrior: Heavy Slash endet **P3/66 PP**. Zwölf wirkliche Gutschriften zu je 18 PP ergeben 216 PP, passend zu zwei Aufstiegen à 75 und 66 Rest-PP. Evolution setzt P5 voraus; das fehlende Evolutionsangebot ist hier **kein belegter Defekt**. 22 Siege sind nicht automatisch 22 qualifizierende PP-Kämpfe. Mage hat drei Arcane-Bolt-Gutschriften zu je 18, also P1/54; auch das stimmt.
- Alle drei Klassen bleiben beim Startergear; die vier Warrior-Equipmentevents sind Aus-/Wiederanlegen. Es gab je einen Lootverkauf, beim Warrior erst T238. Die Daten testen Gearpreise/-stufen kaum. Daraus weder „Gear ist zu teuer“ noch „höhere Ausrüstung ist unnötig“ ableiten. Keine weitere XP- oder Startwerteerhöhung; zunächst passende Kämpfe, tatsächliche Kaufgelegenheiten und funktionierende Lernquellen beobachten.
- Die drei Guild-Profile laufen mit richtiger Klasse, getrennten Seeds und Archiven. **75 ungültige Spieler-Erstantworten** sind bestätigt (28/22/25); die Protokolle zeigen erfolgreiche Transportrequests mit Parserfehlern. Die Rate relativ zu finalen Entscheidungen ist keine unmittelbare Modell-Fehlerwahrscheinlichkeit. Kein sauber kontrollierter Vergleich zum anders zusammengesetzten Batch 2.
- **Keiner der 1.177 aufgezeichneten Engine-Aufrufe endet mit `finish_reason:length`.** 54 Reparaturaufrufe und 299 Rejections sind bestätigt; viele davon betreffen richtig geschützte Kampfzahlen, Dungeonpopulation oder Bezahlungen. Keine Grundlage für pauschal größere Tokenbudgets oder lockerere Firewalls.
- Mage T29/C71→C72 bestätigt die .102-Provider-Recovery natürlich: **identischer Request**, ein Fehlerobjekt, dann gültige Geschichte, ein gespeicherter Provider-Recovery-Marker und reguläre Extraktion. Keine zweite Engineaktion. Das ist mehr als ein Mock-Smoke; es beweist noch keine natürliche .103- oder allgemeine Providerabnahme.
- Zwei einohrige Wölfe mit ähnlicher Beschreibung und unterschiedlichen IDs sind ein Kontinuitätskandidat, kein bewiesener Wiederbelebungsfehler. Keine explizite Identitätsgleichsetzung im geprüften Verlauf gefunden. Anatomieähnlichkeit allein darf unterschiedliche Tiere nicht verschmelzen.

## Empfehlung

**Kein weiterer P1-Hotfix allein für den bereits von .103 aufgefangenen Mage-Fall.** Der nächste natürliche Vergleich kann auf .103 stattfinden. Keine Engine-, Balance- oder Runneränderung wurde hier vorgenommen.

Für anschließende fachliche Arbeit priorisiere ich: **(1)** Guildentscheidung zur Stapelbarkeit, dazu korrekte Einzelquest-Auswertung; **(2)** die konkrete Canon-Manual-Kauf-/Lernkette; **(3)** nur bei Bedarf die verständlichere Auflösung/Rückmeldung vor Nahkampfreichweite. Rückzug als erste Hauptaktion und Vorrang von Level-/Gruppenhinweisen sind mögliche kurze Runner-Präzisierungen, kein Anlass für ein weiteres langes Bedienhandbuch oder vorgeschriebene Quests/Builds.

Die Review ist insgesamt fundiert. Ihr größter inzwischen überholter Punkt ist die neue P1-Einstufung des Mage-Folgefixes; ihre wichtigsten Ergänzungen sind die sichtbare Risikoempfehlung, die tatsächliche Ein-Aktions-Auswahl und der erfolglose Manual-Kauf. **Original-ZIP im Chat verifiziert; kein Binärupload auf GitHub vorgenommen.**
