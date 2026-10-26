# Avereth Engine – erste Balance-Eindrücke aus den bisherigen natürlichen Runs

**Stand:** 26.10.2026 · **UNVERBINDLICHE BEOBACHTUNGEN UND HYPOTHESEN – KEIN BALANCEBESCHLUSS, KEIN IMPLEMENTIERUNGSAUFTRAG.**  
**Bezugsstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, zuletzt unabhängig verifizierter Build `.95` / `681c2b4`; der letzte natürliche Langlauf im Archiv verwendet noch `.94`.  
**Quellen/Methode:** [Testindex](README.md), mehrere ältere und jüngere `REVIEW.md`-Dateien quer gelesen, [aktueller Stand](../03_AKTUELLER_PROJEKTSTAND.md), [Kanon `5](../02_DESIGN_KANON.md#5-kampf-und-progression), [10B-Journal, Balance und Simulator](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#3-b--kampfsimulator-erste-ergebnisse-methodische-leitplanken) und tatsächliche XP-/Stat-Formeln im .95-Produktcode. **Keine neue eigenständige Wiederholung aller Original-ZIPs, keine neue Simulation/Node-Testausführung, keine kontrollierten A/B-Läufe.** Historische Reviews und damalige Nutzer-/Implementiererbewertungen sind Ausgangsbelege, aber **keine verbindliche Schlussfolgerung**. Positive Entwicklungen sind mit zahlreichen parallel implementierten Engine-, Board-, Runner- und Player-Prompt-Korrekturen vermischt.

## 1. Kurzurteil / vorläufige Gewichtung

- **×2-XP:** Als frühe Progressionsentscheidung **plausibel und derzeit nicht erkennbar generell zu hoch**. Ein funktionierender Quest-/Kampfzyklus belohnt spürbar; die extrem langsamen Alt-Runs werden eher von gescheiterten Aktionen, ungebuchten Aufgaben und Leerlauf erklärt als von mathematisch zu knappen XP. **Sicherheit dieser Einordnung: mittel**, kein kontrollierter Balancebeweis.
- **Startwerte 7 statt 5:** Der spürbare Frühspiel-Puffer ist **mechanisch eindeutig**, der kausale Beitrag zum Überleben **nicht isoliert messbar**. Besonders Mage profitiert von MP, etwas HP, Initiative und ggf. Widerstand; kein Beleg für Übermacht. **Mechanik: hoch; Balancewirkung: niedrig bis mittel.**
- **Beide Änderungen zusammen:** Vermutlich bessere Spielbarkeit und weniger tödliche oder zeitraubende Startphasen. Zugleich mögliche **verstärkende Rückkopplung**: bessere Kampf-/Ressourcenreserve → mehr echte Erfolge → durch ×2 XP frühere Level/Staterhöhungen → erneut bessere Reserve. **Plausible Hypothese, bisher nicht quantitativ abgenommen.**
- **Level 15:** Noch keine natürliche Kampagne annähernd bis zum Ziel. Der jüngste vollständige relevante Zustand erreicht L5 nach 89 Inputs, nicht L15; das ist weder ein Beweis für zu langsame Progression noch eine Prognose, dass 1.000 Inputs genügen. **Sehr niedrige Evidenz über L5.**
- **Keine unmittelbare Zahlenempfehlung:** Weder XP erneut erhöhen/senken noch Startwerte, Monster-ATK/HP, Questpreise oder Regeneration pauschal ändern. Zuerst ein natürlicher längerer Lauf mit `.95` und erkennbar funktionierenden Kernschleifen.

## 2. Was tatsächlich geändert wurde – nicht vermischen

### 2.1 XP ×2 ab Build .67

Technik: [`PATCH10B_XP_REWARDS.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/681c2b4f6a85a30b2dba4357cd621f483ed42be5/avereth-engine/docs/PATCH10B_XP_REWARDS.md), `content/rules.json:xp.reward_multiplier = 2`; `src/progression.js:defeatXp` und `questXp` multiplizieren **nach** bisheriger Rundung. Gilt für neue Kampf-/Questbelohnungen; Rangabstand, Gegnerart, Gegnerstärke, Questtyp bleiben zusätzliche Faktoren. Bereits gespeicherte Belohnungs-Events bleiben unverändert; kein doppeltes Multiplizieren in `awardXp`, kein rückwirkendes Save-Upgrade.

Konkreter Vorher-Fall: Run 6 auf `.66`, vier Hounds zu jeweils 12 XP plus Guild-Quest 30 XP ergeben **78 XP**, der Level-1-Mage bleibt L1. Für dieselben Buchungen mit Multiplikator 2 wären es **156 XP**, also L2 mit **56 Rest-XP**; dieser mathematische Gegenfall wurde ausdrücklich als XP-Regression dokumentiert. **Er sagt nichts darüber aus, ob der Mage danach den Dungeon überleben würde**.

Die XP-Schwelle ist unverändert: von Level L zum nächsten Level benötigt man **L × 100 XP**. Für L1→L15 summieren sich die Schwellen auf **10.500 XP**; der höhere L15-Bereich ist erheblich teurer als die ersten Level. Normale Levelups geben fünf freie Punkte plus Klassenwachstum, **aber keine automatische HP-/MP-Vollheilung**. XP verdoppelt also Fortschritt und indirekt langfristig Werte, nicht sofortige Überlebensressourcen mitten im Kampf.

### 2.2 Höhere Grundstats ab Build .91

Technik: [`PATCH_PC_START_STATS.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/681c2b4f6a85a30b2dba4357cd621f483ed42be5/avereth-engine/docs/PATCH_PC_START_STATS.md); neue PCs **STR/VIT/AGI/INT/PER/WIL = 7** statt jeweils 5; zwei klasseneigene Favored Stats erhalten weiterhin +1, also 8/8. Menschliche NPCs und alte Kampagnen bleiben bei ihren bisherigen Werten.

Der Mage startet dadurch rechnerisch bei:

| Mage, Level 1 | Vor .91 (Basis 5) | Ab .91 (Basis 7) | Veränderung |
|---|---:|---:|---:|
| HP-Maximum | 80 | 90 | +10 / **+12,5 %** |
| MP-Maximum | 72 | 96 | +24 / **+33,3 %** |
| Initiative (AGI) | 7 | 10 | +3 |
| Grund-DEF aus VIT | 1 | 1 | keine Änderung in dieser Ganzzahlstufe |
| Grund-MDEF aus WIL | 1 | 2 | +1 |

Ableitung über `src/derived.js` und die aktuellen `rules.derived`-Faktoren: `HP=50+5×Level+5×VIT`, `MP=8×INT+4×WIL`, `Initiative=floor(1,5×AGI)`, defensive Grundwerte `floor(VIT/4)` und `floor(WIL/4)`. **Diese Tabelle umfasst ausdrücklich nicht alle Klassen oder alle aus Stats skalierenden Angriffs-/Skillformeln.** Jede Klasse erhält zwei Punkte pro ursprünglichem Basisattribut mehr; die relativen Effekte unterscheiden sich durch Favored Stats, Fähigkeiten und Ausrüstung. Direkte Schadenssteigerungen der Skillformeln durch INT/andere Stats sind plausibel, werden hier aber nicht als pauschaler DPS-Prozentsatz ausgegeben.

**Spielgefühl-Hypothese:** Die zusätzlichen 24 MP sind für den frühen Mage wahrscheinlich wichtiger als die 10 HP. Mehr Aktionsreserve kann vor allem eine weitere Fähigkeit oder weniger erzwungene Schlaf-/Rastzyklen bedeuten. Auch der höhere MP-Pool erhöht bei prozentualer Regeneration die **absolute** MP-Menge pro Reststunde. Die Initiative kann den Zeitpunkt des ersten eigenen Zugs verbessern. Die HP-Steigerung verhindert dagegen keine beliebig starken Gruppenangriffe.

## 3. Querblick auf aussagekräftige natürliche Runs (keine kontrollierte Messreihe)

| Stand / Run | XP ×2? / Stats 7? | Beobachtetes Ergebnis | Bedeutung und Einschränkung |
|---|---|---|---|
| **.66, Run 6** [Review](20261024-104654Z-current_test/REVIEW.md) | Nein / Nein | 35 Inputs, L1, vier echte Hound-Siege plus Guild-Turn-in = 78 XP; Tod gegen 3 Skelette Lv4/3/2 | Gutes **identisches XP-Rechenbeispiel**, aber Gruppen-/Dungeonrisiko nicht durch XP-Rechnung erklärt |
| **.67, Run 7** [Review](20261024-120700Z-current_test/REVIEW.md) | Ja / Nein | 100 Inputs, nur L2; Lieferung und private Arbeit verursachten viel Leerlauf | Verdopplung allein garantiert keine zügige Progression, wenn wenige echte Belohnungen entstehen |
| **.68, Run 8** [Review](20261024-142854Z-current_test/REVIEW.md) | Ja / Nein | L3 nach 3-Skelett-Sieg (288 Kampf-XP; 334 kumuliert), aber nur 5/80 HP und 2 MP | XP kann **sprunghaft** voranschreiten, während der Kampf beinahe tödlich ist; schon vor Stats-7 |
| **.72, Run 10** [Review](20261024-235637Z-current_test/REVIEW.md) | Ja / Nein | 75 Inputs, L2, Tod beim Fünfer-Wespenkampf | Gute Quest-/Kampfbelege, aber große Gruppe; kein Beweis, dass XP zu klein oder +2 Stats nötig waren |
| **.76, Run 11** [Review](20261025-020335Z-current_test/REVIEW.md) | Ja / Nein | 100 Inputs, L4, 8/8 Encounters gewonnen, drei vergütete Gildenaufträge | Bereits **ohne** Startwertboost sind längere, erfolgreiche Kampagnen und mehrere Level möglich |
| **.82, Run 13** [Review](20261025-081303Z-current_test/REVIEW.md) | Ja / Nein | 100 Inputs, L2, nur 3 Kämpfe; Boardausfälle/NPC-Handlungen lenken ab | Fortschritt pro Input stark von tatsächlichen Tätigkeiten und technischem Leerlauf abhängig |
| **.87, Run 15** [Review](20261025-124809Z-current_test/REVIEW.md) | Ja / Nein | 100 Inputs, L3; drei Questabgaben, 7 registrierte Kills, mehrere Lootverkäufe | Ökonomie kann Geld aufbauen, ohne dass automatisch bessere Gear-/Skillprogression entsteht |
| **.91, Run 16** [Review](20261025-232041Z-current_test/REVIEW.md) | Ja / Ja | 58 Inputs, L3, 6 Encounters/10 Kills, 2 Guild-Abschlüsse, kein Tod; Extractor-Abbruch | Kompatibel mit besseren Ressourcen; aber Spielauswahl und spätere Codefixes verhindern A/B-Zuordnung |
| **.92, Run 17** [Review](20261026-012245Z-current_test/REVIEW.md) | Ja / Ja | 57 Inputs, L3, 5 Siege/9 Kills, 2 Guild-Abschlüsse, kein Tod; Planner-Abbruch | Gute Novizen-Kernschleife; kein kontrollierter Schadenstest gegenüber altem Mage |
| **.93, Run 18** [Review](20261026-031107Z-current_test/REVIEW.md) | Ja / Ja | 58 Inputs, L3; Tod durch fälschlich am Dungeon-Eingang erzeugtes **Lv28/E-Skelett** | **Kein** verwertbarer Beleg, Startstats seien zu niedrig oder Dungeon-F-Schaden zu hoch; Ursache durch .94 adressiert |
| **.94, Run 19** [Review](20261026-044406Z-current_test/REVIEW.md) | Ja / Ja | 89 Inputs, L5 mit 8 Rest-XP; 8/8 Encounters, 15 Kills, 3 Guild-Auszahlungen, kein Tod; Planner-Abbruch | Bisher stärkster **gemeinsamer** Beleg für eine längere erfolgreiche frühe Progression; Run endete an Handelsinterpretation, in .95 adressiert |

**Wichtige Verzerrungen:** Fast alle detaillierten jüngeren Stichproben sind **Mage**, häufig GLM-5.3-Flash; Personas/Startorte/Klassen-Skills/Gegnergruppen sind nicht konstant. Mit den Builds änderten sich Dungeons, Quests/Board, Handel, World-Identität, Schadensziele, Runner-Prompt und Mechanikguards. Manche 100-Input-Runs mussten bei ihrem damaligen Testziel zwangsläufig aufhören, andere endeten an Provider/Planner/Extractor oder Tod. **Die Tabellenzeilen sind nicht als Experiment „.90 vs .91“ zu lesen.**

## 4. Frühprogression: Was die XP-Verdopplung wahrscheinlich tut

### Eher positiv

1. **Sichtbare Belohnung nach echten Erfolgen:** Quest-XP von z. B. 46/120/180 und Kampf-XP von 24 pro gewöhnlichem Level-1-Ziel erlauben frühen Stufenfortschritt, wenn Spieler die Arbeit tatsächlich abschließen. Bei drei Skeletten in Run 8 waren es 288 Combat-XP in einem Encounter; ein dreifacher Kampf kann ein komplettes frühes Levelbudget abdecken.
2. **Mehr Anreiz, Abenteuer zu spielen statt Verwaltungsdialoge zu stapeln.** Eine hohe XP-Belohnung *bei Erfolg* macht Gildenjagden attraktiv; sie entfernt nicht die Notwendigkeit, geeignete Gegner, Rast und Risiko zu wählen.
3. **Die bisherigen Langsamkeitsfälle scheinen überwiegend „zu wenige echte Buchungen pro Spielerzug“:** Phantomangebote, nicht vorhandene Schalter, Händler-/Buchungsprobleme, abgelehnte Reise/Questannahme, endlose Lieferlogik. An solchen Stellen würde eine weitere XP-Verdopplung überhaupt nichts an der Ursache ändern.

### Mögliche Probleme / ausdrücklich nur Hypothesen

- **Sprunghafte Mehrfach-Levelups:** Run 8 zeigt zwei frühe Level aus einem riskanten Encounter. Das kann sich belohnend anfühlen, aber ggf. die Zeit für eigenes Ausprobieren von neuen Skills, Trainingszielen oder unterschiedlicher Ausrüstung zwischen Levelstufen verkürzen.
- **XP-Tempo vs. erlernte Fertigkeiten:** Wenn XP stark steigt, Skill-/Passive-Progression aber eigene Nutzungskriterien hat, kann Charakterlevel die tatsächliche Vielfalt der Spieloptionen überholen. Dass die jüngsten Charaktere noch kaum neue Skills hatten, könnte teils damit zusammenhängen; **belegt ist vor allem die fehlende natürliche Langzeitabnahme**.
- **Questmix und XP-Quellen:** Ein Spieler, der die Gilde effizient abarbeitet, dürfte eine ganz andere XP/Zug-Kurve zeigen als ein frei reisender Erkundungsspieler mit seltenen offiziellen Abschlüssen. Das ist möglicherweise **gewünschte** Spezialisierung, kein Fehler. Ob es zu einem unfairen Zwang zu einer einzigen Spielweise wird, ist offen.
- **Spätere Ranggrenzen:** Gegner-XP berücksichtigt Level, Stärke, Typ und Rangabstand. Die ×2-Einstellung multipliziert eine bereits differenzierte Basis. Bei starken Elites/Bossen oder E-Gegnern könnten überproportionale XP-Spitzen entstehen; es gibt dazu bisher **keine natürliche L5→15-Datenbasis**.

## 5. Höhere Startwerte: Spielgefühl, Gefahren und mögliche Nebeneffekte

### Wahrscheinlich nützlicher Puffer

- Alte Mage-Anfänge: 80 HP/72 MP. Neue Mage-Anfänge: 90 HP/96 MP. Die MP-Steigerung ist relativ größer und kann mehrere Kämpfe/Rastphasen spürbar verändern.
- In Runs 16/17 werden Kills, Gildenabschlüsse, sinnvolle MP-Verwendung und Regeneration tatsächlich gebucht, ohne dass das Spiel sofort endet. Das **passt** zur beabsichtigten verbesserten Einstiegserfahrung; es beweist ihre Ursache nicht.
- **Mehr Initiative und eventuell Skill-Schaden** können das Risiko mindern, vor der zweiten eigenen Aktion zu sterben. Ob die neuen Werte in echten gleichartigen Gruppenkämpfen reichen, lässt sich nicht aus den verschiedenen Starts/Builds ableiten.

### Risiken, noch spekulativ

1. **Anfänger-Gegner könnten zu harmlos werden**, wenn die zusätzlichen Ressourcen plus bessere Initiative aus einfachen 1-vs-1-Kämpfen einseitige Farmkämpfe machen. Aus acht Siegen in Run 19 ohne Gegner-/Ressourcenvergleich folgt das aber nicht.
2. **Angriffs-/Defensivschwellen sind diskret**: Eine +2-Stats-Erhöhung erzeugt je nach Klasse und Teiler eine andere DEF-/MDEF-Stufe. Das kann Warrior, Mage und Rogue verschieden treffen; keine verallgemeinerte Klassenrangliste aus Mage-Runs.
3. **Magier-lastige Samples verschleiern andere Probleme:** Warrior und Rogue sind im gleichen natürlichen Langzeitumfang nicht getestet. Ressourcen, effektive Angriffe, Distanzspiel und defensive Skills können sich anders auswirken.
4. **Der Dungeon bleibt gefährlich, wenn Gruppen und Ränge wirklich höher liegen.** Run 18s Lv28-Spawn war ein Enginefehler, kein Balancefall; die legitimen frühen Gruppenbegegnungen aus Run 6 (3 Skelette) und Run 10 (5 Wespen) verdienen Vergleich, aber nicht pauschale Nerfs.
5. **Stat-Erhöhungen und ×2 XP greifen ineinander:** Mehr Siege begünstigen schnellere Levelups; damit erhöhen die unveränderten fünf freien Punkte und Favored-Stat-Wachstum den Abstand gegenüber gleichstufigen, nicht nachträglich geboosteten NPCs möglicherweise schneller. Ob das in späteren Leveln ein Problem wird, ist offen.

## 6. Level-15-Ziel: vorsichtiger Ausblick

Die mathematische Summe **10.500 XP bis L15** ist fix unter der aktuellen Progressionsformel. Run 19 hatte nach L5 noch **8 Rest-XP**, also rechnerisch **1.008 kumulierte XP** aus 89 Inputs (rund **9,6 %** des gesamten L1→15-XP-Budgets). Daraus eine lineare Hochrechnung abzuleiten wäre **fachlich schlecht**:

- XP pro Gegner steigt mit Gegnerlevel, Stärkefaktor, Art und Rangdifferenz.
- Später kann der PC mehrere Gegner schneller oder sicherer besiegen; umgekehrt können schwierige Gruppen Kämpfe bremsen oder töten.
- Quests wechseln, höhere Empfehlungslevel und Questtypen verändern Auszahlungen.
- Frühzeit sind Charaktererstellung, Guild-Einschreibung, fehlendes Gear, Wege und Systemlernen übergewichtet; spätere Phasen könnten schneller werden, aber auch mehr Erkundungszeit verlangen.

**Erste vorsichtige Vermutung:** Für Level 15 ist der Weg über sinnvoll steigende Gilden-/Gebietsrisiken und funktionierende Shop-/Skillzyklen wichtiger als eine weitere pauschale XP-Anpassung. Der großzügige 1.000-Turn-Rahmen sollte erst dann als zu eng gelten, wenn ein echter funktionaler Langlauf seine Grenzen erreicht.

## 7. Ökonomie, Ausrüstung und Skill-Growth: mögliche Balanceschatten

**Geld ≠ Power.** In Run 15 lagen zeitweise über 600 cp im Inventar, in Run 19 **289 cp** am Ende, und dennoch blieb im jüngsten Test **Starterstaff/Starterrobe**. Ein älterer echter Jagdmesser-Kauf in Run 12 tauschte beim Mage **MATK 10 gegen MATK 0** – eine wirksam bestätigte, aber für Zauber schlechte Wahl. Solche Beobachtungen zeigen zunächst eine **fehlende/nicht genutzte Upgrade-Schleife**, keine bewiesene Geldinflation oder zu hohe Level-XP.

Eine mögliche Ökonomie-Hypothese: **Loot-Verkaufswerte, Gildenlöhne, Gearpreise und tatsächliche Fähigkeitspreise könnten auseinanderlaufen**. Der ältere 10B-Plan nennt beispielhaft sehr niedrige erzählte Skill-Stone-Preise gegenüber einem höheren Richtwert. Da Verkäufer-/Angebotsidentität und Preisbuchung lange instabil waren, taugen diese Zahlen noch nicht als belastbare Wirtschaftsstatistik. Der geplante strukturiert erzeugte Angebots-/Board-Fachplan ist separat und nicht allein wegen dieser Notiz freigegeben.

**Skill-Erwerb:** Startauswahl und vorhandene Skills funktionieren; einzelne Runs belegen eine Rare-Passive bzw. Skillentwicklungsangebote. Aber **keine überzeugende natürliche Level-1→15-Kette** aus trainierter Fähigkeit, Entwicklung, Evolution, Ausstattung und F→E. Das könnte später wichtiger sein als reine XP-Geschwindigkeit: Der Charakter steigt mechanisch auf, ohne dass seine interessanten Optionen im selben Tempo wachsen. **Nur Beobachtung, keine Forderung nach Gratis-Skills.**

**Regeneration:** Prozentuale HP-/MP-Erholung pro gebuchter Stunde wirkt in mehreren Runs; unmittelbare Levelups heilen nicht. Bei 96 statt 72 MP und 15 % MP-Regeneration je Stunde ist die absolute Erholung nach einer regulären Ruhephase größer; die **wirtschaftlichen Kosten und Zeitkosten echter Rast** gehören später in die Progressionsbewertung.

## 8. Welche Daten helfen als Nächstes wirklich? (keine neuen Runnerpflichten)

Für den nächsten natürlichen `.95`-Run, möglichst mit einer frischen Kampagne, vorhandene Events/Logs **nachträglich auswerten** – nicht das Spiel oder den Player-Guide dafür skripten:

1. **Level-/XP-Kurve:** Inputs je Stufenaufstieg, kumulierte XP, Kampf- vs. Quest-XP, Gegnerlevel/-rang, XP pro tatsächlichem Kampf und pro 25–50 echten Spielerinputs.
2. **Kampfdruck:** 1-vs.-1/2/3/5, Eröffnungsband, eigene bis zur zweiten Aktion erlittene HP, MP pro Kampf, Restressourcen beim Kampfende, notwendige Rast/Flucht, HP-/MP-Kosten je Quest.
3. **Schwierigkeit vs. tatsächliche Empfehlung:** Quest-/Dungeon-Einstufung, tatsächliche Monster-/Floor-Profile und erkennbare Warnungen sauber voneinander trennen.
4. **Ausrüstung/Skills:** Zeitpunkt erster *wirklicher* Shopkauf→Equip, tatsächliche Werteverbesserung nach Klasse, erster neu erworbener Skill/Passive, sinnvolle Skillnutzung/Proficiency vs. Level.
5. **Ökonomie:** verdiente Guild-cp und Lootverkauf, tatsächliche Käufe/Servicekosten, verfügbare sinnvolle Upgrades – Geld in der Tasche allein ist keine getestete Wirtschaft.
6. **Leerlauf:** Technische/semantische Ablehnungen und unbestätigte Narratorerfolge getrennt von echten freiwilligen Stadtbesuchen, Reisen oder Gesprächen. Nur so unterscheidet man zu langsames XP von unnötig verlorenen Spielzügen.

Bei späterem Verdacht: gezielte **paarige Simulationen** mit identischen Gegnern, Seeds, Positionen, Skillkits und Player-Taktik für Basisstats 5 vs. 7 (und ×1 vs. ×2 XP separat); im Status klar halten, dass XP **keinen einzelnen Kampftreffer** ändert, sondern die mittel-/langfristige Levelkurve. Die alte 10B-Basismatrix (ca. 60.700 simulierte Kämpfe) hat PC-/NPC-Taktikasymmetrie und ist keine Klassen-Balancefreigabe.

## 9. Persönliche Arbeitshypothesen – ausdrücklich nicht beschlossen

| Hypothese | Meine vorläufige Neigung | Sicherheitsgrad / entscheidender Gegenbeleg |
|---|---|---|
| **XP ×2 behalten** | **Eher ja**: frühe Belohnungen fühlen sich relevanter an; funktionierende Questzyklen schaffen Fortschritt, ohne bisherige Langzeitübermacht zu zeigen | Mittel; ein längerer Run könnte plötzliche Levelsprünge/zu schnelles F→E offenlegen |
| **Basisstats 7 behalten** | **Eher ja**: Magierressourcen/startfähiges Spiel wirken glaubwürdiger; die Rücknahme wäre jetzt schlecht begründet | Niedrig–mittel; gepaarte Gruppenkampfsimulation könnte Über-/Unterkorrektur zeigen |
| **Frühe Gruppen sind potenziell die eigentliche Härtespitze** | Plausibel: 3–5 Feinde handeln mehrfach, HP-Bonus schützt begrenzt | Niedrig–mittel; vergleichbare neue Gruppenkämpfe mit legitimen Slots fehlen |
| **L1→L5 wirkt recht zügig, L5→L15 kann trotzdem lang sein** | Plausibel, weil die Schwelle je Level steigt und höherklassige Angebote noch kaum erprobt sind | Niedrig; 10.500-XP-Gesamtsumme allein beweist kein langsames Spiel |
| **Progression der Skills könnte hinter der Levelzahl zurückbleiben** | Beobachtungswürdig; selten echte zusätzliche Skills trotz häufigem XP-/Gildenfortschritt | Niedrig; erst mechanische Skill-/Gear- und Langzeitevents prüfen |
| **Das Hauptproblem für Level 15 bleibt vorerst Spielablauf statt Zahlen** | Eher ja: Abbrüche, echte Händler-/Orts-/Quest-Zyklen bestimmen XP pro Input stark | Mittel; nach stabiler .95-Kampagne erneut beurteilen |
| **XP-Erhöhung + Stats wirken gegenseitig verstärkend** | Theoretisch ja, möglicherweise erwünscht; weder endgültiger Buff noch Nerf ableitbar | Niedrig; erst echte späterlevelige Monster, Builds und Ressourcen messen |

### Schlussfolgerung

**Nichts hiervon ist verbindlich.** Die zwei bereits getroffenen Balanceentscheidungen sind bislang **plausible, eher hilfreiche Startbedingungen**, aber noch keine geprüfte Endbalance. Priorität ist **beobachten statt nachjustieren**: zunächst längerer natürlicher `.95`-Lauf, dann entscheiden, ob es wirklich um XP, Startstärke, Klassenasymmetrie, Gruppengefahr, Gear/Skills oder bloß um technische Umwege geht.

Nicht aus diesem Dokument neue Patchprioritäten, verbindliche Kanonregeln, Spielertest-Routen, XP- oder Statänderungen ableiten.
## Nachtrag: frühe Gruppen-AoE und laufender 250-Züge-Test (26.10.2026)

**Status: neue Nutzeridee und erste technische Gegenüberlegung, kein verbindlicher Kanon und keine Implementierungsfreigabe.** Der Nutzer erwägt, innerhalb der **jeweils sechs wählbaren Starterskills** mindestens Mage und Warrior **eine AoE-Option** anzubieten; Rogue ist ausdrücklich optional. Beim Mage soll der bisherige `mage.arcane_burst` (AoE nur ENGAGED um den Zaubernden) **durch einen Fernkampf-AoE** ersetzt werden. Für Warrior wird ein physischer **Cleave** nach Art der bisherigen Arcane-Burst-Flächenmechanik vorgeschlagen. Rogue darf als stärkerer Einzelziel-/Mobility-/Präzisionsstil abweichen; die Annahme „Rogue = nur Assassin“ ist kein verbindliches Klassenlimit.

### Design-Eindruck – plausibler Spielwert, mehrere offene Risiken

1. **Pro:** Eine frühe aktive Gegenoption zu bereits enginekorrekt als Gruppen kämpfenden Monstern. Gerade 3–5 Gegner können mehrfach handeln; ein AoE reduziert möglicherweise die Zahl gefährlicher gegnerischer Aktionen, anstatt globale Monster-HP/ATK zu verringern. Das könnte Spaß, Spielbarkeit und taktische Vielfalt verbessern.
2. **Pro:** Verschiedene Klassenidentitäten: Mage distanziert/positionierend; Warrior als Frontlinien-Sweeper; Rogue kann Präzision, Mobility, Disengage, Ambush und einzelne gefährliche Ziele betonen. **Gleiche Werkzeuganzahl ist nicht gleichbedeutend mit identischen Werkzeugen.**
3. **Balance-Risiko:** AoE-Mehrfachtreffer sind potentiell eine massive Schadens-/Tempoverbesserung gegen Gruppen. Bei sonst gleichen Formeln kann Gesamtschaden grob mit Zielzahl wachsen. Besonders zusammen mit bereits erhöhten Startstats und XP ×2 könnte dies **indirekt** zu deutlich schnellerem Leveln führen, weil Gegner leichter besiegt werden – nicht weil jeder Kill zusätzliche XP hätte. Gegen einen einzelnen Gegner sollte AoE nicht die immer beste Angriffswahl sein.
4. **Spielerentscheidung:** Von sechs verfügbaren Skills wählt der Spieler anfangs **zwei**. Das neue AoE wäre also ein **Angebot**, kein automatisch verfügbares Grundrecht jeder Figur. Wenn Gruppenkämpfe zwingend ein AoE verlangen würden, wäre die Starterauswahl nur scheinbar frei. Das muss in Tests berücksichtigt werden.
5. **Risikozone und Gegenwirkung:** Warrior-Cleave erfordert Nahkampf/ENGAGED; Mage-Fern-AoE könnte eine Gruppe vor ihrem ersten Herankommen treffen. Reichweite, Deckung, Zielgruppe, Kosten, Eigentreffer/Friendly Fire, Schadensverteilung und tatsächlich benutzte Bewegung können deshalb nicht einfach identische Werte bekommen. Eine AoE-Option sollte eine **situative Alternative** zu Heavy Slash/Power Strike bzw. Arcane Bolt/Flame Lance bieten, nicht jeden anderen Offensivskill ersetzen.
6. **Nur Hypothese:** Auch defensive/evasive/positionierende Optionen könnten gegen Gruppen helfen. Daher beweisen frühe Gruppentode **nicht**, dass zwingend alle Klassen einen AoE brauchen. Normale Novizen-Einzelkämpfe und Gruppen mit Gegner-Leveln oberhalb des PCs getrennt betrachten.

### Technische Abgrenzung aus Codeprüfung (.95)

- In `content/classes.json` hat Mage bereits sechs Starter-Skills inklusive `mage.arcane_burst`: Complexity 2, 14 MP, `range.band=ENGAGED`, `area=caster_engaged`; er trifft alle am Zaubernden ENGAGED befindlichen gültigen Ziele. Das ist **kein Fernkampf-AoE**.
- Warrior hat sechs Starter-Skills (Heavy Slash, Guard, Power Strike, Quick Slash, Charge, Deflect), **keinen** AoE. Ein Cleave könnte die etablierte `caster_engaged`-Ziellogik mit physischem Angriff und STA nutzen, sofern Klasse und Aktionsprofil zum gewünschten Spielgefühl passen. Welcher der sechs dafür ersetzt würde, ist **nicht entschieden**.
- Rogue hat ebenfalls sechs Starter-Skills ohne AoE; eine pauschale Übertragung der Warrior-Lösung ist **nicht nötig** und derzeit nicht beschlossen.
- **Wichtig:** `src/skills.js` erlaubt für die formale Area-Skill-Definition aktuell nur `shape=caster_engaged` und fordert bei Area `range.band=ENGAGED` ohne Multi-Strike. `src/combat.js` berechnet normale Char-AoE gegen am Zaubernden ENGAGED stehende Ziele; eine separate `burst`-Geometrie gibt es bereits für explosive geworfene **Items** mit vorbestimmtem Zielcluster. Ein Mage-Fern-AoE benötigt deshalb **eine eng geprüfte Erweiterung/Übernahme vorhandener Zielcluster-/Reichweitenmechanik**; nicht bloß einen JSON-Wert austauschen und Erfolg behaupten. Bei C können AoE-Angriffe auch andere anwesende Kreaturen als die eigentlichen Gegner treffen; das ist ein wichtiger Friendly-Fire-/Player-Agency-/Narrator-Truth-Test.
- Vor einem konkreten Fachplan erst die **natürliche** Gruppenkampf- und Skill-Auswahl beobachten; dann passend abgegrenzte Tradeoffs und Regressionen formulieren. **Keinen AoE ohne ausdrücklichen Auftrag implementieren.**

### Laufender 250-Züge-Test: keine vorzeitige XP-Schlussfolgerung

Nach Nutzerangabe läuft **der erste natürliche Test mit 250 Inputs**, bislang **noch nicht Level 10**. Build, tatsächlich bestätigter Charakterlevel, Anzahl **effektiv gebuchter** Aktionen, XP-Quellen, Kampf-/Quest-Dichte, Runende und Integrität sind ohne den abgeschlossenen Originalexport **nicht verifiziert**. Daraus weder lineare Hochrechnung auf 1.000 Turns noch Aussagen über zu kleine XP ableiten.

Bei der späteren Auswertung besonders **produktive Spielzüge vs. verlorene Verwaltungs-/LLM-/Engine-Missverständnis-Züge** unterscheiden. Hilfreich wären: XP/Level über Spielzüge, Charakteraktivität, echte Questzahlungen, Kampfgegner-/Gruppendichte, legitime Risikoentscheidungen, Skillwahl/-einsatz und gebuchter Loot/Shop/Equip. Die XP-×2- und Stats-7-Entscheidungen bleiben bis dahin unverändert und werden weiter beobachtet.

**Keine Designkanon-, Runner- oder Produktcodeänderung durch diesen Nachtrag.**


## Nachtrag: Run 20 – 252 Inputs auf .95, erste belastbarere Früh-/Mittelspiel-Daten (26.10.2026)

**UNVERBINDLICHE neue Beobachtungen und Balancehypothesen, keine neue Designregel/XP-/Stat-/Skillentscheidung und keine Patchfreigabe.** Vollständiger Original-/Engine-Review: [`20261026-063907Z-current_test/REVIEW.md`](20261026-063907Z-current_test/REVIEW.md). Dieser Run ist länger als alle bisherigen, aber **kein kontrolliertes A/B-Experiment**. Original ZIP (41.435.082 Bytes, SHA-256 `058e1a02ede73b17aabc939b1b4fbab8471b8182a3c8c51a3bdbaa6566a5a307`) im Chat CRC-geprüft; separater Git-Binärupload nicht bestätigt.

### Neue Messpunkte statt intuitiver Turnzahl

- **252 echte Spielerinputs, L8 und 324 aktuelle XP**, insgesamt **3.124 kumulierte XP**; **30/30 Kämpfe gewonnen, 44 echte Kills, zehn abgeschlossene offizielle Gildenquests**. Kein Tod, Abschluss durch T252-Extractor-Reparatur-Transportabbruch. Level 15 also nicht erreicht.
- L2 T25, L3 T33, L4 T48, L5 T110, L6 T152, L7 T167, L8 T215. **Checkpoint T100: L4, 358/400 XP**. L5 nur zehn Eingaben später, danach Dauer und XP-Quellen sehr unterschiedlich. Die Einordnung „noch nicht Level 10 nach ~250 Inputs“ wird dadurch bestätigt, aber kein Modell allgemeiner Levelgeschwindigkeit.
- **XP pro 50 Inputs:** 614 / 344 / 484 / **1.056** / 602 (plus 24 auf T251). Die starke Spitze **T151–200** entstand vor allem durch Dungeonmonster und einen wertvollen Clearance-Auftrag: Zwei Zweiergegner-Encounters **168+216 XP**, Warden **252 XP**, Dungeonabgabe **270 XP**. Langsameres Leveln in den übrigen Fenstern war daher nicht nur Eingabeverschwendung, sondern auch unterschiedliche **Qualität/Höhe der gewählten Gegner und offiziellen Aufgaben**.
- **XP-Quellen:** **1.636 Kampf-XP (52,4 %)** und **1.488 Quest-XP (47,6 %)**. Beide tragen wesentlich bei; weder Kampf noch Gildenabgabe ist numerisch entbehrlich. Der Charakter verdient insgesamt **29,75 % der 10.500 XP bis L15**. Ein gedankenloses Fortschreiben der ersten 252 Züge würde die dynamischen Gegner-, Quest- und Spielentscheidungen ignorieren. **„Effektive Abenteuerzüge“ sind nicht objektiv nachgezählt**; soziale Gespräche, Reise, Einkauf, Schlaf und Training können sinnvolles Gameplay sein und sind nicht per se „verschwendet“.
- Für eine verlässlichere Turn-Prognose brauchen wir eine zusätzliche Phase mit **Level-8–12-relevanten** Gegnern und geeigneten Quests sowie Zeit- und Risikoaufwand. Der 1.000-Input-Rahmen ist mit diesem einen Datenpunkt weder widerlegt noch bestätigt.

### Entscheidender neuer Befund: Gildenboard kann unterhalb des tatsächlichen Spielerlevels stecken bleiben

**Alle 35 in dieser Kampagne generierten Guild-Angebote waren Novice, Level 1–3:** 12× L1, 16× L2, 7× L3. Das aktuelle Regelwerk erlaubt für die Novice-Stufe aber **Level 1–14**. Die Aufnahme in „Proven“ verlangt mindestens fünf erledigte Novice-Verträge **und** den E-Powerrang des Spielers, erst ab Level 15; der L8-Spieler mit zehn Erfolgen bleibt also zu Recht Novice.

**Hypothese mit mittlerer Wichtigkeit:** Die bisherige Board-Erzeugung bietet fast nur niedrigstufige F-Rang-Arbeit an, obwohl das F-/Novice-Band noch bis L14 reicht. Das könnte zu einem **vermeidbar zähen Mittelspiel** führen: immer mehr triviale 24-XP-Monster und niedrig empfohlene Quests bei immer höheren Schwellen von 700/800/900 XP. Ohne neue anspruchsvollere **F-Rang**-Angebote wird die XP-Verdopplung zunehmend weniger spürbar. **Aber:** Das ist ein einzelfallbezogenes Generations-/Auswahlmuster und **keine harte Codegrenze Level 3**. Vor einer Änderung prüfen, ob Spielerbitten nach schwererer F-Rang-Arbeit, andere Branches und Board-Neugenerierungen höhere L4–14-Aufträge erzeugen. Ein sinnvolles späteres Designziel könnte größere **vielfältige Auswahl innerhalb des bestehenden festen Rangbands** statt PC-Level-Skalierung sein. Das würde die Freiheit und Gebietsstärke erhalten und stärkere Fortschritte nur gegen stärkere Gefahr ermöglichen.

### Gruppen: nicht zu leicht trotz 30/30

- **Sechs Owlbeak Rooks (T20–25):** Nach Sieg noch **23 HP/16 MP**. **Fünf Goblins (T42–48):** nach Sieg **1 HP**. Der Magier hatte die aktuellen stärkeren Basisstats und XP×2, erhielt trotzdem schwere Ressourcenverluste. **Ein eindeutiges Gegenargument gegen „30 Siege = viel zu leicht“.**
- Gleichzeitig halfen konzentrierte Einzelzielzauber, taktische Angriffe und anschließende echte Rast, sodass alle Kämpfe überstanden wurden. Das kann gute risikobehaftete Spielbarkeit sein, keine Fehlkalibrierung.
- **Rückbezug auf die AoE-Idee:** Der Spieler wählte **Arcane Bolt + Arcane Ward** statt Arcane Burst und benutzte fast nur Bolt. Das bereits vorhandene Mage-AoE ist **nahkampfbasiert**; ein optionaler Fern-AoE und ein Warrior-Cleave könnten bei Gruppen helfen, aber nur, wenn sie nicht zum erzwungenen Starterpick werden. Ein AoE sollte gegen ein Einzelziel nicht pauschal stärker sein als der passende Single-Target-Skill. **Wichtige neue Erkenntnis:** 6er- und 5er-Encounters sind in den Logs **echte Gruppen-Encounters**, daher lässt sich der hypothetische Flächenschadennutzen später mit identischen historischen Gegner-/Runden-Setups gezielt simulieren. Eine AoE-Fähigkeit ersetzt nicht Erkundung, Risikoentscheidung, Cover, Ressourcen oder Rückzug.
- **Separates Risiko, spekulativ:** Ein Fern-AoE kann mehrere Gegner **vor deren ersten Aktionen** treffen. Ein früher solcher Skill könnte den gefährlichen Gruppenteil *stärker als erwartet* entschärfen, während ein ENGAGED-Warrior-Cleave erst nach der Annäherung wirkt. Beides sollte nicht blind dieselbe Rohpower/Mana-/Staminakosten erhalten. Der Fern-AoE benötigt nach aktuellem Code außerdem eine eigene definierte Zielcluster-/Geometrie-Lösung; `caster_engaged` allein genügt nicht.

### Höhere Startwerte + XP: bestätigte Spielbarkeit, aber nicht isolierte Wirkung

- L8 hat **140 HP Maximum**, **380 MP Maximum** und **INT 33**, nach normalen Levelups und überwiegend INT/WIL-Zuweisungen. L8 gegen einen Bog Strider mit **24 HP**: `Arcane Bolt` erzeugt 77,875 Rohpower und im Ambush **105 Schaden**. Das zeigt ein starkes Übergewicht gegen **Level-1-Fauna**, nicht notwendigerweise gegen hochrangige Gegner.
- Die bis L8 ungebremste F-Rang-Einzelzielstärke könnte einen Teil der Schwierigkeit aus den repetitiven Novizenjagden nehmen. Statt sofort Startstats/XP zurückzunehmen zuerst den **Gegnerlevel-/Gefahr-/Auftragsmix** bei höheren eigenen Leveln bewerten.
- Die zwei nur sehr knapp gewonnenen Frühgruppenkämpfe zeigen andererseits, dass `7` als Basis nicht automatisch sicher oder trivial bedeutet. Vor einer Balanceänderung lieber einen vergleichbaren Warrior/Rogue-Start und eine echte L8–12-Kampagne abwarten.

### Gear und Skills sind möglicherweise der engere Progressionsengpass

- Der Spieler zahlte **90 cp (Willowwood Staff + Tonic)**, später **240 cp (Ashwood Staff)** und **120 cp (Walking Boots)**. Der ausgerüstete Mage-Waffenbonus ist **MATK 6**, der ursprünglich ausgerüstete Starterstab hatte **MATK 10**. Das ist trotz erfolgreicher Käufe/Equip **keine echte Waffenverbesserung**, eher ein **Downgrade**. Boots wurden gekauft, aber nie eindeutig ausgerüstet. Am Ende **711 cp** Bargeld und Starterrobes. **Folgerung:** Der Spieler kann im Verlauf reich werden und neue Dinge kaufen, ohne seine Leistungsfähigkeit sinnvoll zu erhöhen. Die Problemursache könnte im Produktangebot, der Item-Werbewirkung, der Anzeige oder in seiner Entscheidungslogik liegen; nicht allein fehlendes Gold oder XP.
- Trotz **30 Encounters** nur **sechs gültige PP-Fortschrittsbuchungen**, alle für Bolt (P1→P2/33 PP), **kein neuer Skill und keine Passive**. Das kann **regelkonform** sein: PP gibt es nur bei ernsthafter Nutzung gegen echte Herausforderung, ein einfaches L1-Monster im Endgame soll keine Farmquelle für Skill-Power sein. Der Charakter wählt außerdem ständig denselben Skill; Arcane Ward scheint praktisch keine Progression zu erhalten. **Spielgefühl-Risiko:** Level 8, viel stärkerer Schaden, aber dasselbe Fähigkeitsspektrum wie am Start. Nicht ohne Prüfung die PP-Bedingungen senken; erst Ursachen für fehlende echte neue Skills/Growth-Angebote und Zugänglichkeit von Training beobachten.
- Eine höhere XP-Kurve zusammen mit **zu wenig ansteigendem Questlevel, Gear-Nutzen und Skillwachstum** könnte eine numerische, aber monoton spielende Figur erzeugen. Das ist **derzeit eine Designhypothese**, noch keine nachgewiesene Fehlbalance.

### Ungeklärter technischer Endabbruch ist kein Balanceereignis

Die letzte Erzählerantwort behauptete **4/4 Bog Striders**, obwohl die Engine **3/4** registrierte. Der Extractor schlug vorzeitig `quest.ready` vor, sein erster JSON-Plan scheiterte aber **nachweislich an der fehlenden `scene` beim früheren `thread` vor der `arrive`-Aktion** – nicht am READY-Vorschlag als protokolliertem Repair-Grund. Der anschließende Repair bekam **keine Modellantwort** und der Host abortierte nach ca. 125 s. Es wurde **kein** vierter Kill oder Questabschluss gebucht. Der Status meldet zudem **ein nicht näher ausgewiesenes Integritätsproblem**. Beides separat im Run-Review dokumentiert; daraus keine XP-, Skill- oder Mobwertänderung folgern. Die Engine-Guards schützen hier zumindest gegen die frei erfundene Questvollendung.

### Aktualisierte unverbindliche Tendenz

| Offene Frage | Meine erste Neigung nach Run 20 | Belastbarkeit |
|---|---|---|
| **XP ×2 weiterhin behalten?** | **Ja, vorerst.** XP steigen bei höherwertigem Dungeon deutlich; schwache Novice-Monster und Verwaltungs-/World-Umwege bremsen dennoch | Mittel |
| **Startstats 7 weiterhin behalten?** | **Ja.** Zwei tatsächliche Gruppenkämpfe waren trotz Boost fast tödlich | Mittel für diese Mage-Erfahrung; niedrig über andere Klassen |
| **Sind frühe Gruppen zu stark?** | **Teilweise sehr riskant**, aber nicht global unangemessen: 6er/5er erfolgreich bei Rest-HP23/1 | Mittel für die konkreten Encounter; niedrig für breite Balance |
| **AoE Mage/Warrior früh anbieten?** | **Interessante taktische Option**, kein unmittelbarer Grund zur Pflicht- oder Overpower-Variante | Niedrig–mittel |
| **Wird L15 in 1.000 Eingaben erreichbar?** | **Offen.** L8 nach 252 und wechselnde XP-Fenster erlauben keine seriöse Turn-Prognose | Niedrig |
| **Was könnte Progression am stärksten bremsen?** | Nicht allein XP: **Novice-Auftragsauswahl 1–3 trotz Level 8**, wenig sinnvolle Gear-Upgrades, kaum organische neue Skills | Mittel für beobachtete Symptome; Ursachen offen |

**Handlungsentscheidung: keine.** Weder die existierende ×2-XP-/Stats7-Entscheidung noch die sechs Starter-Skills oder das Guild-System werden aufgrund dieses Dokuments verändert. Längere Läufe und gezielte Gegenproben vor Design- oder Codefreigabe.
