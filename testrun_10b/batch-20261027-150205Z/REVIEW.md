# Batch 3 – unabhängige Review des natürlichen .102-Guild-Dreierbatches

**Analysedatum 28.10.2026.** Nur Dokumentation. Vollständiges Original-ZIP batch-20261027-150205Z.zip: **66.752.395 Bytes**, SHA-256 **b0f77ddfef8d95fb7acb90f4b77bf89d34789119c706468e2809ddeff4c8d3ee**, 50 ZIP-Einträge, CRC-Prüfung ohne Fehler. Genau drei Läufe; kein vierter oder manuell gestoppter Run. Original-run.json, evaluation.json, avereth-events.json, calls.json, chat-completions.jsonl, player.jsonl, chat.jsonl und relevante Serverlogs geprüft. **Keine Node-Tests, kein ST-Replay und keine Produktänderung.**

## 1. Versuchsbedingungen und Ergebnisse

Alle Kampagnen verwenden **Build 4.3.0-c.6.6.102**, Commit **57ec7f6ef98209dc72e09508e2cd42cb1e9e8d09**, V4-C/Ruleset 2, SillyTavern 1.19, echtes **zai-org/GLM-5.3-Flash** für Testspieler und Engine, Profil unverändert, Git sauber; keine PageErrors oder Secret-Hits. Nur **Guild-Warrior, Guild-Mage, Guild-Rogue** mit eigenständigen Seeds. Ziel Level 15; hier gesetztes Maximum **250 Spielereingaben**.

| Profil | Original-Run-ID | Seed | Eingaben | Level | Endursache |
|---|---|---:|---:|---:|---|
| Guild-Warrior | 20261027-150205Z-current_test | 1604207988 | **250** | **10** | **limit:** 250 Eingaben, kein technischer Abbruch |
| Guild-Mage | 20261027-164744Z-current_test | 1604207989 | **102** | **5** | **planner_failed:** 4 Kupfer fälschlich als 40 cp |
| Guild-Rogue | 20261027-173743Z-current_test | 1604207990 | **87** | **2** | **defeat:** Engine-Tod gegen vier Bog Striders |

**Summen nur aus diesen drei Originalruns:** **439 Inputs, 1.177 Modellaufrufe, 5.236 Engine-Events, 299 zurückgewiesene Deltas**. Ein technischer Stopp, ein korrekt mechanisch gebuchter Charaktertod, ein vollständig ausgespielter Limitlauf. **32 Encounters: Warrior 22/22 Siege, Mage 7/7 Siege, Rogue 2 Siege plus ein Tod**. Insgesamt 15 als completed gebuchte Guild-Vertrags-IDs (Warrior 10, Mage 3, Rogue 2), **aber zwei davon betreffen dieselbe einmalige Dungeonräumung**. Keine Level-15-/E-Rank-Abnahme.

**Nicht mit Batch 2 gleichsetzen:** Dort waren fünf Profile und maximal 150 Eingaben enthalten, darunter zwei Exploreprofile. Hier ausschließlich Guild, maximal 250 Inputs und andere Seeds/Weltverläufe. Vergleichsqualität: technisch lange Ketten und Progressionsmuster, keine kontrollierte Klassenbalance- oder Patchwirksamkeitsstudie. Der Warrior hatte in Batch 2 L7/150, hier L10/250; ein direkter Erfolgsquotenvergleich wäre zu stark.

**Modellqualität/Overhead:** 54 protokollierte Reparaturaufrufe (Warrior 33, Mage 14, Rogue 7). Außer dem einmaligen erfolgreich wiederholten Mage-Providerfehler keine finalen Extractor-/Narrator-Leerabbrüche. Der Testspieler produzierte **75 invalid_json-Versuche** (28/22/25) auf 439 finalisierte Entscheidungen, ca. **17,1 % relativ zu Entscheidungen**; Batch 2 meldete 114/609 = 18,7 %. Ähnliche Größenordnung, **kein isolierter Wirkungsbeleg** der Runner-Klarstellung. 299 Firewall-Rejections sind nicht automatisch 299 Produktbugs.

## 2. P1 – Mage T102: Planner scheitert trotz ausdrücklich erlaubter Zimmerzahlung

**Originaler Dialog:** Die Wirtin im Sleeping Dog bietet ein Zimmer für **4 cp** oder bei Guild-Nachweis für **3 cp** an. Der Spieler fordert T100–101 den Rabatt; bei T101 kommt bereits eine **gültige CLARIFY-Antwort**, ob er 4 cp akzeptiert oder 3 cp verlangt. In T102 sagt er unmissverständlich: **“I accept the room at 4 copper, pay, take supper and sleep until morning.”**

**Original-C257** erzeugt formal gültiges JSON mit offer.accept auf das aktuelle Zimmerangebot, setzt jedoch **agreed_cp:40**, während der Modell-Reasoningtext selbst “4 copper” nennt. Validator lehnt ab. **Original-C258** (Repair) wechselt zu buy und setzt jetzt **max_cp:40**; derselbe falsche Faktor zehn bleibt. Der endgültige Validatorfehler lautet: **buy seq 1: max_cp 40 is not what his words “I accept the room at 4 copper, pay” say: 4 cp**. Beides sind gültige Modellantworten mit finish=stop, also **kein Provider-, Token- oder JSON-Formatfehler**. Die Engine verweigert korrekt die unzulässige 40-cp-Zahlung, aber die ganze Kampagne endet mit planner_failed, bevor Narrator und Extractor für T102 laufen.

**Ursache:** falsche Modellbetrag-Konversion **auch nach Reparatur**, kombiniert mit einer zu engen sicheren Fortsetzung: Das neue Handels-CLARIFY aus .102 greift nicht für diesen buy.max_cp-Konflikt. Keine automatische Commandzahl von 40 auf 4 umschreiben und den Validator nicht lockern. **Rottests:** komplette T99–102-Kette samt vorhandener Zimmer-Offerte, vorheriger CLARIFY-Antwort, C257/C258; Preise/Waren-/Partygrenzen erhalten. **Ziel:** gültige 4-cp-Angebotsannahme oder bei reinem Preis-/Zustimmungskonflikt eine sichere spielbare Rückfrage ohne irgendeine Buchung. Mischkommandos für Mahlzeit/Schlaf dürfen keine unberechtigten Teilaktionen auslösen.

## 3. P1/P2 – Warrior: ein Floor-Clear löst zwei aktive Guildverträge aus

**Originalzustände aus Quest- und Transaktionsereignissen:**
- Quest **quest.clear_mossback_warrens_level_1**: angenommen Engine-Turn **15**, Vertragspreis **60 cp**.
- Nach Board-Erneuerung auch **quest.clear_mossback_warrens_level_1_3**: angenommen Engine-Turn **150**, Vertragspreis **120 cp**, **derselbe Dungeon und dieselbe Ebene 1**.
- Genau **ein** mechanischer Abschluss **dungeon.cleared**: Engine-Turn **191**, msg **381**, Dungeon **loc.mossback_warrens**, **cycle=2**, floor=1, Kredit PC (3 eigene, 0 fremde Dungeon-Slots).
- Gleichzeitige Abgabe Engine-Turn **196**, msg **392**: **zwei** quest.status → completed und **zwei** transaction.completed an PC **60 + 120 = 180 cp**. Beide Einzel-Quests werden im Evaluator mit payout_cp=180 aggregiert; er markiert beim 60-cp-Vertrag zu Recht die Diskrepanz.

**Bewertung:** Eine einzige mechanische Dungeonleistung wurde tatsächlich **zweimal vergütet**. **Ob das ungewollt ist, bleibt eine ausdrückliche Design-/Guild-Autoritätsfrage**: Können zwei unabhängige zeitgleich angenommene Vertrags-IDs mit identischem Dungeon/Floor/Cycle dieselbe Räumung erfüllen? Falls nein: Board-Duplikat oder Annahme blockieren; keine pauschale Quest-Credit-/Reward-Fortschreibung. Falls ja: beide Einzelbeträge sind formal gültig, aber die Evaluator-Angabe je Quest ist irreführend. **Nicht** rückwirkend Geld umschreiben oder ohne Regelentscheidung die Guild-Buchung ändern. Für Scaling muss die Doppelauszahlung korrekt separat gekennzeichnet werden.

## 4. P1/P2 – Rogue: korrekter Tod, aber vier viel zu starke Gegner als Gruppe

Rogue L2 mit **95 HP, ATK 10, DEF 3** trifft im finalen Encounter **enc.t64** auf **vier Bog Striders**: Gegner 1 **L4/38 HP/ATK13**, Gegner 2 **L6/48 HP/ATK17**, Gegner 3 **L4/38 HP/ATK13**, Gegner 4 **L5/43 HP/ATK15**. Alle gleichzeitig Teil des Encounters. Die gebuchten PC-HP sinken **95 → 86 → 49 → 14 → 0**; zwei Striders fallen vorher, aber der Spieler stirbt mechanisch mit pc_dead=true im Engine-Event. Kein Narrator-Falschtod, kein technischer Crash. Ausrüstung Starter, keine Skill-Proficiency-Steigerung, zuvor zwei gültige Wolf-Vertragsabschlüsse und einmal 14 cp Lootverkauf.

**Offene Fairnessfrage, kein bestätigter Balancebug:** Vier L4–6-Gegner gegen einen L2-Rogue sind eine extreme Kombination aus Levelgefälle und Überzahl. Prüfen, ob Guild-Auftrag, Habitat, sichtbare Gefahrhinweise und Fluchtmöglichkeiten diese Gefahr rechtzeitig erkennen lassen. T81–T87 zeigt wiederholte offensive Razor-Cut-Kommandos; später erwähnte Evasive-Step-/Rückzugsabsichten müssen anhand der **tatsächlich gebuchten cmd.resolved- und Encounter-Aktionen** überprüft werden, nicht aus dem Spielertext allein. Keine globale XP-/Schadenserhöhung vor dieser Analyse.

**Separater NPC-/Kreaturen-Kontinuitätskandidat:** Der früher erschlagene einohrige Wolf **mon.wolfone_eared** (Encounter T24) und später **mon.creatureone_eared_wolf** (T66) sind verschiedene IDs bei sehr ähnlicher Beschreibung. Ein neuer ähnlich verletzter Wolf ist möglich; ob der einzigartige erste Gegner unzulässig wiedergeboren wurde, bedarf vollständiger Narrator-/Habitat-Prüfung. Noch kein bewiesener Duplikatbug.

## 5. Langlauf / F→E-Scaling – Warrior und Mage

| Indikator | Guild-Warrior | Guild-Mage | Guild-Rogue |
|---|---:|---:|---:|
| Inputs / Level | 250 / **L10** | 102 / **L5** | 87 / **L2** |
| Siege / Encounters | **22/22** (30 getötete Gegner) | **7/7** (9 getötete Gegner) | **2/3**, Tod beim dritten |
| Guild-Abschlüsse | **10 IDs**, davon 2 auf einem Clear | 3 | 2 |
| Gebuchte Ortsbesuche | 32 | 24 | 14 |
| Echte Verkäufe | 1 / 31 cp | 1 / 54 cp | 1 / 14 cp |
| Ausrüstung | vier Aus-/Wiederanlegungen des Startergear | keine Änderung | keine Änderung |
| Skillentwicklung | **Heavy Slash P2 und P3** | keine Proficiencyänderung | keine |

**Warrior:** 250 Inputs, 22 Kampfsiege, vier wiederholte Eel-Hound-/Boar-/Dungeonaufträge, ein korrekt freigegebener Mossback-Warrens-Floor nach Guardian und PC-Slotcredit. Die technische World-/Combat-/Guild-Kette trägt erstmals über **250 natürliche Eingaben**. Bei Input **100**: **Level 4, 236 Rest-XP, 99 cp**, Starterwaffe/-rüstung und Heavy Slash P1/72 PP. Bei Input 250: **Level 10**, noch **kein Level 15/E-Rang**, dafür zwei echte Heavy-Slash-Prof-Stufen (Engine-Turn 111 und 172), 12 growth.noted, **keine Growth-Angebote**. Vier equipmentChanges bedeuten nur temporäres Ablegen/Wiederanlegen von Startergear, **kein neues höherwertiges Equipment**. Erster dokumentierter Lootverkauf erst Input **238** für 31 cp. Die Verbindung aus Geld, Gear-Upgrade, Trainingsmöglichkeiten und Skillfortschritt bleibt schwach. Der doppelt bezahlte Dungeon-Clear darf Level-/Geldscaling nicht verzerren.

**Mage:** Nach 102 Eingaben **Level 5**, 7 Siege, drei gültige Guildabschlüsse, tatsächlicher Glimmerdeep-Floor-Clear, 24 Ortsbesuche. Bei Input **100**: **216 cp, HP 45, MP 124**, Starterstaff/-robes; Arcane Bolt P1/54, Arcane Ward P1/0. Ein echter Lootverkauf für 54 cp, keine Gear-/Skill-Prof-Verbesserung. Spätere Zimmer-/Rabatthandlung scheitert am Planner; kein natürlicher Level-15-Test.

**Rogue:** Bis 87 Inputs L2, zwei Wolf-Jagden und dann unverhältnismäßig starke Strider-Gruppe. Nicht automatisch aus seiner niedrigen Progression auf generell falsche XP-Tabellen schließen: unterschiedlich viele Encounters, Questwahl, längere Bewegungs-/Sozialphasen und vorzeitiger Tod.

**Folgerung:** Keine pauschale XP-Erhöhung und keine neue Testspielerpflicht zum Gearshopping. Sinnvolle F→E-Gegenprüfung verknüpft Levelkurve, effektiv gewonnene Encounter, Gegnerlevels, Gruppenrisiko, Lootverkauf, tatsächliche Gearpreise/Verfügbarkeit, PP/Skillnutzen und Questbelohnungen.

## 6. Positiver .102-Nachweis: echter transienter Narratorproviderfehler abgefangen

Mage **T29/C71** liefert bei einem Narratorrequest **HTTP 200 mit Fehlercode internal_server_error** und keinen brauchbaren Storytext. **C72** ist der erneute identische Narratorrequest mit erfolgreicher Ausgabe; die Partie läuft mit regulärer Extraktion weiter. In der gespeicherten ST-Usernachricht steht **narrator_recovery: attempts 1, reason provider, status 200**. Der aktualisierte Evaluator meldet **markedAttempts=1, withStory=1, applied=1**. Diese wichtige .102-Funktion ist damit **mindestens einmal natürlich mit echtem GLM** bestätigt; nicht lediglich durch den Mock-Smoke. Die anderen zwei Läufe haben keine markierte Narrator-Recovery. Keine doppelte Engineaktion in der protokollierten Kette erkennbar.

**Grenze:** Ein positiver HTTP-200-Error-Gegenfall beweist nicht alle 429/5xx-/Abort-/Reload-/Doppelinitialisierungsvarianten. Der Mage-Abbruch T102 liegt ausdrücklich im **Planner**, unabhängig von dieser Recovery.

## 7. Weitere technische und methodische Grenzen

- Bei den **299 delta.rejected** dominieren Autoritäts- und Szenenprüfungen (Warrior 176, Mage 73, Rogue 50). Das ist **kein entsprechender Bugcount**; 23 Warrior-dungeon_foe-Rejections sind teils erwünschte Sperren gegen erfundene Monster. Umgekehrt einzelne abgewiesene legitime Angaben mit Originalturns nachstellen, bevor Filter verändert werden.
- **Handelsrichtung**: pro Run ein korrekt gebuchter Verkauf und keine erneute belegte Umkehr wie Batch 2 T122. Das beweist nicht alle unabhängigen/teilweisen Gebotslose, unbestimmten Käufer oder gemischten Kauf-/Verkaufssituationen. Die zuletzt bei .102-Code-Review benannten Randfälle bleiben eigenständige Regressionsthemen.
- **NPC-Identität**: Reine Guildprofile decken den Dialogumfang und die oft komplexen Rückkehrketten der Exploreprofile nicht angemessen ab. Nicht behaupten, die .102-NPC-Rückkehrlogik sei jetzt grundsätzlich natürlich abgenommen. Größeres NPC-Memory-Projekt bleibt zurückgestellt.
- **Modellfehler**: JSON-Formatfehler des Testspielers weiterhin vorhanden; Planner/Extractor häufig repariert, aber hier keine finalen Extractor-Ends. Kein Blanket-Prompt-/Tokenpatch anhand der Erfolgsquote.
- **Board-/Dungeonlohn**: Doppelte aktive Floorverträge und aggregierte Payout-Zuordnung als **mechanische/evaluatorische Sonderfrage** zuerst klären; nicht von selbst die Board-Generierung deterministisch umstellen.

## 8. Priorisierung – reine Empfehlungen

1. **P1 Planner bei expliziten Kaufpreisen**: Mage T99–102, C257/C258 mit Preis 4 vs 40 cp als unverändertes Rotfixture; sicherer CLARIFY-Fortsetzungspfad oder bestätigtes korrektes Offer, keine stillen Zahlkorrekturen oder Teilbuchungen.
2. **P1/P2 Dungeon-Duplikate**: Warrior zwei gleichzeitig aktive Verträge auf dieselbe Mossback-Floor-/Cycle-Räumung, Auszahlung 60+120 cp. Erst Vertrags-/Guildregel entscheiden, dann enge Rot-/Grün-Gegenfälle einschließlich Quest-ID-genauer Evaluation.
3. **P1/P2 Rogue-Encounter-Fairness**: L2 vs L4/4/5/6, Original-Positions-/Angriffs-/Flee-/Warnereignisse und Spielerentscheidung prüfen; erst nach Taktikparitätsklärung Scalingwerte ändern.
4. **P2 .102-Code-Randfälle**: Verkaufswunsch ohne bestimmten Käufer, Planner-CLARIFY nach erster konfliktbehafteter/zweiter leerer Antwort, NPC enter/person.new-Chronologie und Fetch-Reload-Wiederholung als negative Tests. Nicht durch diese Batchdaten bereits als neue bestätigte Fehler deklarieren.
5. **F→E-Scaling** aus Warrior L10/250, Mage L5/102 und den realen Ausrüstungs-/Skilldaten; Level 15 nicht erreicht, keine neue numerische Designfreigabe.

**Abnahme bei späteren Patches:** erst archivierten Originalfall auf dem jeweiligen Produktstand rot, dann minimaler Fix und Gegenfälle grün, Node-Vollsuite und bei Host-/ST-Änderungen echter ST-Smoke; natürlicher GLM-Guild-Vergleich im Anschluss. **Diese Review implementiert nichts.**

## 9. Archivstatus

Die Review plus [README.md](README.md) liegen im neuen Batch-3-Ordner auf main. Die **66,8-MB-Original-ZIP ist damit nicht automatisch auf GitHub archiviert**. Einen etwaigen späteren Binärupload ausschließlich gegen den obigen SHA-256 prüfen. Original-Raw-Logs, Testspielerentscheidungen und längere Fachnachweise befinden sich im hier hochgeladenen ZIP.
