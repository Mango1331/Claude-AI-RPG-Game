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