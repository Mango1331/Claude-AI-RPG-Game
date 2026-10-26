# Run 20 – natürlicher Level-15-Langlauf, Build .95

**Datum:** 26.10.2026 · **Original:** `20261026-063907Z-current_test.zip`, **41.435.082 Bytes**, **SHA-256 `058e1a02ede73b17aabc939b1b4fbab8471b8182a3c8c51a3bdbaa6566a5a307`**, sämtliche ZIP-Einträge CRC-geprüft (kein Fehler). Das unveränderte Original wurde in diesem Chat bereitgestellt; **kein bestätigter Binär-Upload auf `main`**. Nicht durch einen erfundenen Git-ZIP-Link ersetzen.

**Produkt:** `4.3.0-c.6.6.95`, SHA `681c2b4f6a85a30b2dba4357cd621f483ed42be5`, V4-C / Ruleset 2, ST 1.19, GLM-5.3-Flash via lokalem Custom-Endpoint, `stub:false`, keine Fixture. Spieler-Persona „curious Guild adventurer“, Mage, `Arcane Bolt` / `Arcane Ward`, neue Kampagne mit Basisstats 7. XP-Multiplikator ×2 aktiv. Aktueller `current_test` hat **Level 15** als Ziel, 100 Inputs nur als Zwischenstand, 1.000 Inputs / 24 h Sicherheitslimit.

**Quellen und Prüfumfang:** `run.json`, `evaluation.json`, `report.md`, alle **456 Event-Records** aus `avereth-events.json`, **727** `calls.json`- und Completion-Records, relevante `player.jsonl`/`chat.jsonl`-Originalstellen, konkrete T252-Planner-/Narrator-/Extractor-Rohantworten sowie die einschlägigen Produktformeln und bisherigen Fachpatchnotes geprüft. **Keine eigenständige neue Node-/ST-Testausführung; kein neuer Simulationslauf. Nur Review, keine Produktcodeänderung.** Die Narration beweist niemals die Buchung einer Handlung.

## 1. Ergebnis

- **252 Spielereingaben, 126:57 Minuten**. Abbruch in **T252**: `extractor_failed`, keine Welt-/Quest-/Reisebuchung für die letzte Erzählerantwort; **kein Tod**.
- **Level 1→8, 324 Rest-XP**, also **3.124 kumuliert gebuchte XP**: **1.636 Kampf-XP + 1.488 Quest-XP**. **Level 15 nicht erreicht.** Levelups T25 (2), T33 (3), T48 (4), T110 (5), T152 (6), T167 (7), T215 (8).
- **30 tatsächlich abgeschlossene Encounter, 30 Siege, 44 registrierte besiegte Gegner, keine PC-Niederlage**. Darunter eine **Sechsergruppe Owlbeak Rooks**, eine **Fünfergruppe Goblins**, weitere Zweier-/Dreiergruppen und die **vollständig abgeschlossene Ebene 1** der Old Crown Catacombs.
- **Zehn echte erfolgreiche Gildenabgaben** (zehn `proof.checked ok:true` und entsprechend Quest-XP), zwei zunächst verweigerte Abgaben; der zuletzt angenommene Bog-Strider-Vertrag bleibt **ACTIVE, 3/4**, noch keine Auszahlung.
- **Endzustand vor T252:** L8 Mage, `HP 140/140`, `MP 350/380`, **711 cp**, `Arcane Bolt` auf **P2/33 PP**, `Arcane Ward` unentwickelt, **kein neuer erlernter Skill/Passive**. Die zuletzt ausgerüstete Waffe ist der **Ashwood Focus Staff, copper-cored, MATK 6**; Starterrobes weiter ausgerüstet. Iron-Shanked Walking Boots wurden für 120 cp gekauft, aber **kein entsprechendes `item.equipped`-Event** nachgewiesen.
- **100-Züge-Vergleichspunkt:** L4 mit **358/400 XP** bis zum nächsten Level, 90 cp, HP75, MP124, mit dem Ashwood Focus Staff MATK6. **Nach T110** L5. Dieser Unterschied ist ein schönes Beispiel, warum 100 Eingaben kein sinnvoller Endpunkt für den Progressionstest mehr sind.
- Event-Export **3.684 Events**, **222 `extract.applied`**; Statuszeile meldet **`integrity: 1 problem(s)`**. Dieses Problem ist nicht durch eine konkrete Fehlermeldung im `report.md` lokalisiert und darf weder ignoriert noch als erwiesene Zerstörung der Quest-/XP-Buchungen ausgegeben werden; **gezielte spätere Integritätsdiagnose offen**. Im Runner ein `serverErrors`-Eintrag zum finalen Abort, keine PageErrors.

## 2. Präzise Progression statt „252 Züge = 252 Abenteuer“

| Eingaben | Gebuchte XP in diesem Fenster | Kampf-XP | Quest-XP | Levelups | Kämpfe abgeschlossen | erfolgreiche Guild-Abgaben |
|---|---:|---:|---:|---:|---:|---:|
| 1–50 | 614 | 298 | 316 | 3 | 3 | 2 |
| 51–100 | 344 | 178 | 166 | 0 | 6 | 2 |
| 101–150 | 484 | 198 | 286 | 1 | 7 | 3 |
| 151–200 | 1.056 | 786 | 270 | 2 | 7 | 1 |
| 201–250 | 602 | 152 | 450 | 1 | 6 | 2 |
| 251–252 | 24 | 24 | 0 | 0 | 1 | 0 |
| **Gesamt** | **3.124** | **1.636** | **1.488** | **7** | **30** | **10** |

XP-Schwelle bleibt nach `src/progression.js` `L×100`, damit vom Start L1 bis L15 insgesamt **10.500 XP**. Der neue Lauf hat davon **29,75 %** erreicht. **Keine lineare Hochrechnung auf L15/1.000 Eingaben:** spätere Gegner, Questlevel, Ränge, Erkundung und Entwicklungsentscheidungen sind nicht konstant. Im tatsächlich beobachteten Verlauf lagen lange, teils nützliche Stadt-, Arzt-, Reise- und Preisdialogphasen zwischen den Kämpfen; etliche zusätzliche Züge entstanden durch wirklich verweigerte Aktionen oder den Versuch, erzählte aber nicht gebuchte Dinge nachzuholen. Diese „verlorenen“ Züge wurden **nicht belastbar einzeln gezählt** und dürfen nicht pauschal von den 252 Inputs abgezogen werden.

## 3. Wichtigste positive natürliche Nachweise

### 3.1 Gruppenkämpfe und tatsächliche Gefahr

- **T20–25, Owlbeak Rooks:** Ein echter Encounter mit **sechs** Gegnern, alle besiegt, **144 XP**; Mage fällt auf **23 HP und 16 MP** vor dem nächsten Abenteuer. Frühe Gruppe trotz erhöhter Basisstats gefährlich, aber überlebbar. `Arcane Bolt` traf einzelne Ziele; der Mage hatte **keinen AoE unter seinen zwei gewählten Starterskills**.
- **T42–48, Goblin Snare-Camp:** Ein echter Encounter mit **fünf Goblins**, alle besiegt, **130 XP**. HP fällt bis auf **1 HP**, MP bis 70; zuvor hatte die Figur durch Level und Statverteilung bereits höhere Ressourcen. Der Spieler tötet einzelne Ziele gezielt, überlebt extrem knapp. Ein weiterer sechster Goblin wird erst bei T65 besiegt.
- **T152/156/165, Old Crown:** Zwei echte Zweiergruppen und ein Gallery-Warden-Boss werden besiegt, zusammen **636 Kampf-XP**; anschließend **270 Quest-XP** bei Abgabe. Die erste Dungeonetage wird formal mit `dungeon.cleared` gebucht und später nach Regeln zurückgesetzt. **Das ist die bislang relevante natürliche Positivprobe für den .94-Erstkontakt-Fix:** Es wurden kanonische Living-Slots statt eines ungebundenen Level-28-Gegners materialisiert. Die zuvor **T138/T141** vom Extractor vorgeschlagenen freien Dungeongegner wurden ausdrücklich als `dungeon_foe` **verweigert** – die Schutzregel bleibt wirksam.
- **Späteres F-Level-Farming/Novizenarbeit:** Der L8-Mage besiegt einen einzelnen Bog Strider mit 24 HP bei T251 per Ambush-Arcane-Bolt für **105 Schaden**, seine eigene Rohpower beträgt dabei **77,875** (INT33, MATK6). Der Gegner gibt **24 XP**. Das zeigt die inzwischen große Stärke gegenüber schwachen Monstern, **aber nicht** die Balance gegen Gegner auf PC-Level 8 oder im E-Rang.

### 3.2 Gilden-, Handels- und Regenerationsschleifen

- Zehn echte Guild-Zyklen und 30 gewonnene Kämpfe; keine doppelt gebuchte Auszahlung im geprüften Eventpfad. `proof.checked` bei Goblins T98/T103 zunächst **false, not_ready**, Abschluss erst nach später bestätigtem READY und regulärem T110-Turn-in. Kein beliebiger Erzählerabschluss.
- **Käufe/Verkäufe werden mehrfach echt gebucht**, etwa Rook-/Goblin-Lootverkauf +160 cp T70, Lodging+Meal 3 cp bei T102 mit tatsächlichem `sleep` und HP-/MP-Regeneration, weitere Services/Herbergen. Der XP-Lauf ist damit nicht von einer ausschließlich erzählten Wirtschaft abhängig.
- Der T101-„drei Kupfer für Bett und Suppe“-Wunsch führt zu einer **sicheren CLARIFY**, T102 trennt die Einzelpreise 1+2 cp und bucht beide plus Schlaf. Kein T89-.94-ähnlicher Planner-Hard-Abbruch. **Dies ist ein positiver Mechanismusnachweis für .95-Sicherheit**, aber noch **kein Beweis**, dass jeder eigentlich eindeutige Einzelpreis heute ohne unnötige Nachfrage verarbeitet wird.
- **T50 Mandrake Tonic:** `object.consumed` und `resource.changed MP 70→95`, **kein HP-Heileffekt**. Der Spieler hatte es bei **1 HP** zur „Erholung nach fast tödlichen Wunden“ eingesetzt und blieb bei 1 HP. Das ist primär ein Fehlverständnis von Produktwirkung/Narration, **kein Engine-Heal-Defekt**. Der echte lange Rest bei T60 führt **1→120 HP und 95→204 MP**.

## 4. Befunde und offene technische Risiken – nach Evidenz

### P1 – T252: Extractor-Repair endet mit externem Abort; Weltänderung bleibt ungebucht

**Originalhandlung:** Der Spieler will von der Black Weir zu den Eel-Weirs zurückreisen. Planner bucht ein gültiges `go`, Narrator beschreibt eine Rückkehr und sagt am Ende **„Four striders down, the cull done“**. **Enginezustand ist aber 3/4**, weil im vorliegenden Vertrag vier Monster nötig sind und bis T251 nur drei `Bog Strider`-Kills dieser Reihe registriert wurden. Der Tester selbst bemerkt im Entscheidungslog die Diskrepanz HUD 3/4 gegenüber Narrator 4/4.

- Extractor-Erstantwort (API-Aufruf **726**, `finish=stop`, ~5,3 s) enthält `arrive`, `thread` und **`quest.ready`** mit der Begründung, die Erzählung melde vier getötete Strider und die Boote seien wieder unterwegs. Der dafür angegebene `depends_on`-Fakt betrifft die Boote, **keinen vierten enginegebuchten Kill**.
- Die Extraktion benötigt daraufhin einen **Repair** (API-Aufruf **727**). Dieser erhält **keine gültige Modellantwort**, nach ~125,3 Sekunden entsteht `signal is aborted without reason`; ST meldet einen `Generation failed AbortError`. `extract.failed` wird als einziger Event der Erzählerantwort i504 gespeichert; **keine Buchung von Ankunft, Zeit, Faden oder Questabschluss**.
- **Abgrenzung:** Das ist eine Kombination aus Narrator-Zählfehler (3/4→erzählte 4/4), unzulässigem READY-Versuch aus Erzählbehauptung und einem Transport-/Host-Abbruch des Repairs. Kein Hinweis, dass die Engine einen vierten Kill fingiert oder den Questvertrag bezahlt hätte. Nicht vorsorglich den Guild-Canon aufweichen.
- **Enger Folgebedarf:** Im natürlichen Replay den Extractor-Repair-Fehler inklusive exaktem Validatorgrund diagnostizieren; Transport-Abort von falscher Modellantwort trennen. Bestehende Recovery-/Retry-Grenzen prüfen, bevor ein zusätzlicher Host-Retry eingebaut wird. Wenn ein System-„NOT RECORDED“ nach fehlgeschlagener Extraktion erscheint, den Spieler nicht als autoritativ zurückgekehrt zählen. Kein blindes automatisches doppelt-Senden derselben Usernachricht.

### P2 – Ausrüstungsentscheidung ist finanziell teuer, aber kein Upgrade

**Konkrete, vollständig gebuchte Kette:**
- T39 `Willowwood Focus Staff + Mandrake Tonic` **−90 cp**, T40 Equip des Staff mit **MATK6**. Der zuvor ausgerüstete `starter_arcane_staff_r2` hat **MATK10**.
- T73 weiterer `Ashwood Focus Staff, copper-cored` für **−240 cp**; T76 ausgerüstet, ebenfalls **MATK6**. Aus Sicht der Zauberformel hat sich die Waffe also gegenüber dem Starterstab **verschlechtert**, nicht verbessert. Der zweitgekaufte Stab ist kein belegter Power-Upgrade, sondern wurde in der Spielerhandlung zeitweilig als **Backup** bezeichnet.
- T75 **Iron-Shanked Walking Boots −120 cp**; gekauft, aber bis zum Ende **kein passender Slot-Equip-Nachweis**.
- Summe **450 cp** für die beiden Staff-Pakete/Boots (90 inkl. Tonic + 240 + 120), ohne bisher einen mechanischen Vorteil des aktuellen MATK-Slots gegenüber dem Starter-Staff zu belegen. **Geldverbrauch ≠ Progression**.
- **Wertung:** Preiszahlung und Equip sind echte Engine-Events, keine fiktiven Anschaffungen. Eine direkte fehlerhafte Gear-Buchung ist hier **nicht** nachgewiesen. Problem liegt in **Angebotsqualität, verständlicher Anzeige der Werte und Spielerentscheidung**; vor einem neuen Economy-Patch klären, ob realistische F-Rank-Upgrade-Optionen überhaupt angeboten wurden. Bei natürlicher Auswertung den **Vorher-/Nachher-MATK/DEF/Utility-Nutzen** und nicht bloß „hat gekauft“ zählen.

### P2 – Skills entwickeln sich wesentlich langsamer als Level

- Trotz **30 Encounters** hat der Mage nur sechs ausgewiesene `skill.progress`-Vergaben, alle für `Arcane Bolt` mit je **18 PP**, davon fünf? **genau sechs**: T11, 25, 48, 152, 156, 165. Er erreicht **P2/33 PP**, `Arcane Ward` bleibt ohne bestätigte PP-Nutzung, **keine neue Fähigkeit, Passive oder Skill-Evolution**.
- `growth.noted` dokumentiert vereinzelte Muster, aber keine offenen `development`-Angebote. Ein nicht bedeutsamer/trivialer Kampf darf nach Kanon keine PP geben; die vielen späteren schwachen F-Gegner könnten also **regelkonform** keine zusätzliche Proficiency auslösen. Die Klasse hat zwei gewählte Skills, aber der Player nutzt fast ausschließlich einen; ohne Ward-Anwendung fehlt für manche Growth-Pfade jede Grundlage.
- **Hypothese:** Das Spiel kann im Bereich L5–L10 numerisch stark werden, während sein Fähigkeitenrepertoire weitgehend identisch mit L1 bleibt. Das ist *noch keine* Verletzung der organischen Growth-Regeln; Spielerauswahl und Seltenheit bedeutsamer Kämpfe müssen getrennt geprüft werden.

### P2 – Run zeigt Gruppengefahr und Gefahr einer falschen Balanceintuition

- **30/30 Siege** darf nicht als „Kämpfe zu leicht“ gelesen werden. T25 endet bei **23 HP**, T48 bei **1 HP**, und der Spieler musste bei mehreren Nachfolgeschritten bewusst Recovery organisieren.
- Zugleich sind späte Level-1-Gegner für den L8-Mage mit INT33, starkem Einzelziel-Zauber und Ambush-Mechanik trivial. Daraus lässt sich eine mögliche **Differenz zwischen großen frühen Gruppen und schwachen späteren Solo-Quests** ableiten; noch **keine allgemeine Monster-Nerf- oder AoE-Freigabe**.
- Die früher als Kandidat diskutierten **frühen AoEs** für Mage und Warrior wären gerade bei sechs Rooks/fünf Goblins taktisch wertvoll; ein AoE darf nicht allein wegen dieser zwei Begegnungen zur zwingenden Startskill-Wahl werden. Das Mage-Angebot `Arcane Burst` ist bereits ein am PC zentrierter **ENGAGED-AoE**; der diskutierte Ersatz wäre ein technisch andersartiger **Fernbereichs-AoE**.

### P2 – Statusintegrität nicht ignorieren

Die abschließende ST-Statuszeile weist **`integrity: 1 problem(s)`** aus, während der automatische Bericht keinen konkreten Verursacher auflistet. Dieser Sachverhalt ist **offen**; weder „Integrität OK“ noch eine bestimmte Schadensfolge behaupten. Später `#audit`/Integritätsdetail bzw. Enginefold/Validator gezielt auswerten. Nicht aus dem 252-Abort ohne Beleg ableiten, dass genau er die eine Integritätswarnung verursacht hat.

## 5. Performance und Runner

| Segment | Nachweis |
|---|---|
| Modellrollen | **248 Planner**, **223 Narrator**, **249 Extractor**, **7 Board**, zusammen **727** Engine-/Narratorcalls |
| Repairs | **11 Planner**, **26 Extractor** (einschließlich des **fehlgeschlagenen T252-Repairs**) |
| Player-JSON | **35 erste Entscheidungen im falschen Format** bei 252 Eingaben = **13,9 %**; jeweils ein anschließender JSON-Reparaturaufruf; diese Reparaturen zusammen **114,13 s**. In Run 19 waren es 20/89 (22,5 %). Verschiedene Durchläufe/Personas – keinen kausalen Erfolg behaupten, aber deutliche beobachtete Reduktion. |
| Modellabschluss | 248/248 Planner `finish=stop`; 223/223 Narrator `finish=stop`; beim Extractor **248 gültige `finish=stop`**, finaler Repair **ohne Antwort** |
| Zeit | **126:57 min gesamt**; Runner weist **101:47 min Spiel**, **17:44 min Spielerentscheidung** aus; Phasen nicht doppelt addieren. Laufendes Wachstum von Prompt/Cache beachten, aber kein belegter genereller 250-Turn-Kontextkollaps. |
| UI/Host | 0 Browser-PageErrors, **ein** Server-Abort am Ende, 222 `extract.applied`; keine bisherige 900-s-Hostpending-Schleife |

**Grenzen:** Das ist der erste derart lange echte .95-Test, fast ausschließlich Mage, derselbe Player-/Narrator-Provider. Keine zweite Klasse, keine kontrollierte Gegner-/Loadout-Vergleichsreihe, keine tatsächlich abgeschlossene Level-15-Kampagne. Die Zahl 252 ist **weder notwendige** noch **hinreichende** Anzahl für L8 in einem anderen Sandbox-Lauf.

## 6. Ergebnis, Prioritäten, weitere Abnahme

1. **Vor dem nächsten sehr langen Lauf:** Ursache des konkreten T252-Extractor-Repairs isolieren (Validatorgrund, Art des Provider-Aborts, vorhandene Recovery). Die **erzählt-falsche 4/4-Questmeldung** als separate Narrator-/Truth-Gegenprobe dokumentieren. Nicht einfach den 4. Kill automatisch erfinden.
2. **Integritätswarnung 1** separat lokalisieren. Nicht pauschal jeden abgewiesenen `delta.rejected` zum Enginefehler erklären; viele Guards blockieren legitimerweise ungedeckte Erzählerbehauptungen.
3. **Balance beobachten, nicht drehen:** Das 252-Input-Sample liefert echte Gruppen-, Dungeon- und XP-Evidenz, aber keine Gründe für globale ×2-XP-/Startstats-Rücknahme oder weitere Buffs. Mehr in der [laufenden unverbindlichen Balance-Notiz](../BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).
4. **Gear-/Skill-Pfad gezielt bewerten:** Wurde dem Mage eine *wirklich stärkere* MATK-/Defensiv-Ausrüstung angeboten, konnte er sie erkennen, und welchen Skill hat er tatsächlich sinnvoll benutzt? Keine automatische Ausrüstung, Kaufpflicht oder Gratis-Evolution.
5. **Nächste natürliche Tests:** bei fortbestehender Codebasis freie Erkundung erhalten, aber abgeschlossene Eventbelege für Levelstufen, Quest- und Skill-Rangfortschritt, Partygröße, Risiko, HP/MP, Verkäufe/Käufe/Equip, Dungeon-Reset und Abbrüche vergleichen. Run-IDs nicht zu einer statistisch homogenen Versuchsserie erklären.

**Dokumentations-/Codegrenze:** Diese REVIEW und der zusätzliche Balance-Nachtrag sind **Analyse, kein Patchauftrag**. Original-ZIP ist lokal verifiziert, aber über den verfügbaren GitHub-Textschreibpfad nicht als Binärdatei auf `main` hochgeladen; diesen Schritt erst nach tatsächlich verifiziertem Git-Upload als erledigt markieren.
