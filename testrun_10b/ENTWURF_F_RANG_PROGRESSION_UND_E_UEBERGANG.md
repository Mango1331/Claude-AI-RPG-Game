# Sol – Entwicklung innerhalb von F und Übergang zu E

**26.10.2026 · Diskussionsentwurf, keine beschlossenen Werte und kein Implementierungsauftrag.** Ausgangscode: `.95` / `681c2b4`. Die Zahlen unten sind bewusst erste Vergleichsbereiche, keine fertig ausbalancierten Tabellen. XP ×2 und Startstats 7 bleiben unangetastet. Verwandte Beobachtungen: [Balance-Notiz einschließlich Run 20](BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).

## 1. Ziel und vorhandene Grundlage

F soll sich über seine gesamte Spanne interessant entwickeln: neue Handlungsmöglichkeiten, bessere Beherrschung, brauchbare Anschaffungen und zunehmend anspruchsvolle freiwillig gewählte Abenteuer. E soll daran anschließen, ohne dass Level 15 alte Techniken und Ausrüstung schlagartig wertlos macht. Keine festen Skillbäume, keine vorgeschriebene Ausrüstung und keine automatisch am Spielerlevel ausgerichtete Welt.

Die Einordnung „bisher vor allem horizontal in F entworfen“ trifft den praktischen Inhaltsstand. **Technisch beginnt E aber nicht bei null:**

| Bereich | Heute vorhanden | Noch nicht ausreichend ausgearbeitet/abgenommen |
|---|---|---|
| Charakter | F Level 1–14, E 15–29; Statwachstum; erste Klassenevolution bei 15 | Natürlich gespielte F→E-Laufbahn, Zusammenspiel aller Boni |
| Skills | F-C1/C2/C3, P1–P5, organische Quellen und Evolution; provisorische E-Budgets im Validator | Regulärer Erwerb neuer E-Techniken: der gewöhnliche Composer erzeugt C1/F; höhere Quellen und deren Angebote fehlen als vollständiger Spielpfad |
| Ausrüstung | F-Referenzbänder, Qualität, Rangskalierung, feste Instanzwerte, Kauf/Equip | Sinnvolle Upgradefolge innerhalb F; verbindlich sichtbare Angebote und passende Preise |
| Monster | 19 Grundkörpervorlagen, gemeinsame Levelstatistik auch über E hinaus; Elite/Boss | Verlässliche Auswahl höherer Weltgefahren außerhalb markierter Dungeons; begrenzte besondere Fähigkeiten |
| Gilde/Wirtschaft | Novice 1–14, Proven 15–29; Quest-/Loot-/Kaufpfade | Nutzbare Spannweite der Angebote, Belohnungen und Waren über die ganze Rangspanne |

Geprüfte Contentbereiche: `campaign_start`, `classes`, `rules`, `gear`, `monsters`, `npc_templates`, `lore`, relevante `rules_text`-Einträge sowie mechanische Grenzen der Commands/Extractor-/Narrator-Verträge. Die alten Klassen bleiben Legacy-Vergleichsmaterial; neue Kampagnen verwenden Warrior/Mage/Rogue. Maßgeblich bleiben [Kanon §§5–8](../02_DESIGN_KANON.md), die vorhandenen 9C-/9D-Fachkonzepte und der gesonderte [Board-/Handelsplan](../patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md). Nicht sämtliche historischen Patchaufträge sind aktuelle Anforderungen.

## 2. Meine Grundrichtung: vorhandene Achsen nutzen

**Rank** bestimmt das breite Machtband, **Complexity** das Mechanikbudget und **Proficiency** die Beherrschung der konkreten Technik. Material/Verarbeitung und konkrete Werte unterscheiden Gegenstände innerhalb eines Rangs. Keine zusätzlichen gespeicherten F-Unterlevel, Itemlevel, Seltenheitsleitern oder neuen Gearslots einführen.

„Frühes F / erfahrenes F / oberes F“ sind nachfolgend nur Beschreibungen für Entwurf und Vergleich. Keine Freischaltung bei festen Charakterleveln. Wer eine bezahlbare gute F-Waffe früh findet, darf sie benutzen; wer lange an einer einfachen Technik festhält, behält diese Wahl.

Die nächsten Angebote sollten unterschiedliche Entscheidungen ermöglichen: mehr Schaden, Schutz, Beweglichkeit, Flächenwirkung, Ausdauer oder neue Anwendungsmöglichkeiten. Nicht bloß denselben Bolt mehrmals mit anderem Namen kaufen. Der Erwerb weiterer Starter-Bauformen bleibt möglich; daraus wird kein versteckter späterer Fertigkeitenkatalog.

## 3. F-Ausrüstung: echte Verbesserungen trotz starker Startwaffe

Heute entstehen gewöhnliche/gute/überlegene/außergewöhnliche F-Stäbe mit ungefähr **MATK 6/8/10/12**. Der Starterstab hat bereits **10**. Run 20 belegt das Problem: teurere Namen und Kupfer-/Silberkerne führten dreimal zu demselben MATK6-Profil. Höherer Preis ist weder ein Statbonus noch dessen Nachweis.

Zwei ernsthafte Varianten:

- **A – F-Spielraum nach oben öffnen:** Startwaffe 10 vorerst behalten; bessere reguläre F-Waffen erhalten erkennbaren Nutzen darüber. Das schützt den inzwischen spielbaren Einstieg, erfordert aber eine gemeinsame Prüfung der F-Obergrenze und des E-Anschlusses.
- **B – Startwaffe wieder näher an gewöhnliche Ware setzen:** Das alte 4–10-Band bietet dann wieder Kaufentwicklung. Weniger neue Tabellen, aber faktisch ein Startnerf nach mehreren knappen Gruppenkämpfen. Ohne Vergleichsnachweis derzeit nicht meine Präferenz.

**Vorläufig bevorzuge ich A.** Beispiel für eine neue Referenzrichtung, ausdrücklich nicht zusätzlich zu bisherigen Statmultiplikatoren anzuwenden:

| Angebotssituation | Denkbarer Waffenwert ATK oder MATK | Grober Verkaufspreis, cp | Gedachter Nutzen |
|---|---:|---:|---|
| Einfache F-Ware/Ersatz | 6–10 | 30–80 | Ersatz, anderer Waffentyp; kein behauptetes Upgrade |
| Solide bessere F-Ware | 12–14 | 100–180 | Nach ersten Erfolgen erreichbare Verbesserung |
| Hochwertige F-Arbeit | 16–18 | 220–400 | Spürbare Investition, Alternative zu Training/Verbrauchsgütern |
| Seltene obere F-Arbeit | 20–22 | 450–800 | Mehrere Erfolge oder besonderer Fund; kein alltäglicher Dorfbestand |
| Einstieg in E | 24–32 | 800–1.800 | Übergang, später innerhalb E weiterzuentwickeln |

**Diese Zahlen verändern den heutigen F-Referenzrahmen und die E-Anknüpfung deutlich.** Es sind Vergleichsanker, keine Preisgarantien. Kein Anspruch, dass alle F-Gegenstände aus dem Handel verschwinden. Gute F-Ware darf schlechter E-Ware nahekommen; Rang bleibt eine breite Einordnung.

Bei Rüstung vorsichtiger vorgehen: zusätzliche DEF reduziert jeden gegnerischen Treffer. Ein kleiner Schutzbonus kann gegen sechs schwache Gegner enorm und gegen einen starken Boss bescheiden wirken. Als erste obere-F-Vergleichspunkte etwa leichte Rüstung DEF6–8/MDEF6–8, schwere Rüstung DEF10–12/MDEF3–5, Schild DEF5–7/MDEF3–5 betrachten – **nicht alle Maxima gleichzeitig als Pflichtausstattung**. Grundverteidigung, Passives, Klasseneffekt und aktive Abwehr gemeinsam prüfen. Der heutige Zehn-Prozent-Schadensboden verhindert zwar völlige Schadenslosigkeit, garantiert aber noch keine interessante Begegnung.

Bestehende Slots genügen. Boots, Handschuhe oder Schmuck können normale Kleidung/Werkzeuge bleiben; kein versteckter Kampfbonus. Besondere Materialnamen dürfen Unterschiede beschreiben, aber nur ein von der Engine gespeichertes Profil verleiht Werte. Verzauberungen mit neuen Effekten brauchen separat unterstützte Mechanik; ein selten klingender Name autorisiert keine Zusatzboni.

**Wichtiger Vergleich:** Bei INT33 erhöht MATK10→20 einen unveränderten Arcane Bolt von 81,875 auf 91,875 Rohpower, rund 12,2 %. Zehn zusätzliche MATK sind nicht zehn Prozent oder eine Verdopplung des gesamten Schadens. Angezeigte Vorher-/Nachher-Werte sind deshalb wichtiger als Marketingnamen.

## 4. Skills und Zauber: vertikal, aber ohne Koeffizientenexplosion

Die gemeinsame Grundformel ist bereits geeignet:

`Rohpower = Basis + Summe(Stat × Koeffizient) + Waffenanteil`

Proficiency, Situation, Variation und Verteidigung kommen danach. Fähigkeiten wachsen bereits durch Stats, Gear und Beherrschung. **Keine zusätzliche automatische Multiplikation mit Charakterlevel oder Skill-Rang darüberlegen.** Affinity bleibt Lern-/PP-Geschwindigkeit, kein zusätzlicher Schadensfaktor.

Heutige F-Obergrenzen für generierte Offensive sind ungefähr C1 Basis12/Koeffizient1,9, C2 16/2,4, C3 18/2,6; die Kostenbereiche liegen bei 5–10, 8–16 und 12–22. Das sind Grenzen, keine Anweisung, jede Technik an jedem Maximum zu bauen. Einfache Quellen erzeugen heute häufig konservativere C1-Techniken. Dass eine neue Technik nicht stärker als ein gewählter Starter ist, kann bei geringerem Preis/Kosten oder anderer Funktion korrekt sein.

Zur Größenordnung, **heutige** Skills bei MATK10/P1, vor Verteidigung:

| INT | Arcane Bolt, 10 MP | Flame Lance, 16 MP |
|---:|---:|---:|
| 10 | 38,75 | 49,75 |
| 25 | 66,875 | 85,375 |
| 40 | 95 | 121 |
| 60 | 132,5 | 168,5 |

Meine Richtung: **F-Kalibrierung zunächst als Ausgangspunkt behalten**, vertikales Wachstum über tatsächlich erreichbare C2/C3-Entwicklung, PP, Gear und neue Rollen ermöglichen. Reine Grundschadens-, Fernreichweiten-, Flächen- und Defensiveffekte teilen sich ein Budget. Nicht für jede Phase neue pauschale Koeffizienten erfinden.

Für E gibt es schon provisorische Caps: C1 Basis18/Koeffizient2,0, C2 24/2,5, C3 27/2,7; Barrier-/Heal-Grenzen werden erweitert. Diese Werte sind noch kein schlüssiger E-Erwerbspfad. Ein Vergleich zeigt die offene Frage: F-C1 am bisherigen Maximum, Stat40 und Waffenanteil20 ergibt bei P5 **129,6**; E-C1 am heutigen Maximum bei P1 nur **118**. Ein neu gelernter E-Skill muss nicht jede meisterhafte F-Technik schlagen, aber ein ausdrücklich als direkter Nachfolger angebotener Skill darf nicht versehentlich schwächer sein.

**Zwei mögliche E-Richtungen:** Bei einer echten Evolution passende Beherrschung übernehmen; bei einer neu gelernten Technik P1 erhalten und deren höheres Budget/andere Funktion klar zeigen. Für eine reine offensive E-C1-Verbesserung etwa Basis24–30 bei Koeffizienten um 2,0–2,1 als Gegenprobe untersuchen, statt den Koeffizienten beliebig zu vervielfachen. Keine automatische F→E-Umschreibung sämtlicher Skills beim Klassenaufstieg und kein pauschales Zurücksetzen von P5. Diese Entscheidung bleibt offen.

### Zusatzeffekte und Klassenidentität

Fern-AoE für Mage und ENGAGED-Cleave für Warrior bleiben interessante optionale Start-/Lernbauformen; Rogue darf andere Antworten auf Gruppen haben. Zwei wählbare Startskills bleiben eine echte Wahl. Fläche, Mehrfachschlag, Reichweite und Bewegung müssen gegen Einzelzielwirkung/Kosten abgewogen werden. Vorhandene Flächenlogik kann Unbeteiligte treffen.

„Feuer“ bedeutet heute nicht automatisch Burning, „Eis“ nicht automatisch Slow. Elemente/Aspekte sind teilweise nur Beschreibung; ein allgemeines Burn-/Slow-System ist nicht fertig ausführbar. Solche Effekte wären ein gesonderter, begrenzter Ausbau. Für einen ersten F→E-Schritt reichen vorhandene Angriffe, Barrieren, Abwehr, Heilung und Bewegung als Bausteine; keine neue Statusbibliothek als Voraussetzung.

**Ressourcen nicht gleichsetzen:** Mage-MP wachsen mit INT/WIL; menschliche STA bleiben derzeit 100 und regenerieren im Kampf nicht. Ein 30-MP-E-Skill bei großem Manapool und ein 30-STA-Schlag sind wirtschaftlich sehr verschieden. Bei unverändertem STA-Pool sollten E-Kosten nicht einfach parallel zu MP angehoben werden. Erst Aktionen pro Kampf, Wirkung pro Hauptaktion und Anteil am Ressourcenpool vergleichen; eine generelle STA-Erhöhung ist hier nicht beschlossen. P2 soll spürbar günstiger, P3–P5 zunehmend meisterhaft wirken, ohne dass Anfängeraktionen unbrauchbar werden.

**Ein konkreter Meisterschaftseffekt geht heute durch Rundung verloren:** P2 reduziert Kosten auf ×0,95. Bei Arcane Bolt mit 10 MP ergibt das 9,5, gerundet wieder **10 MP**; P2 erhöht dessen Power nicht. Ohne weitere Boni hat der erreichte P2-Aufstieg aus Run20 deshalb noch keinen praktischen Bolt-Vorteil. Das ist regelkonforme Rechnung, aber eine schwache Belohnung nach mehreren relevanten Kämpfen. Für den späteren Entwurf Rundung, Kostenstufen oder einen kleinen garantierten ersten Effizienzgewinn vergleichen; bezahlte Skills nicht versehentlich kostenlos machen. Nicht PP insgesamt beschleunigen, bevor die tatsächliche Wirkung der erreichten Stufen stimmt.

## 5. Erwerb und Trainingspreise: mehrere sinnvolle Geldentscheidungen

Heute sind Manuals mit 120 cp und Skill-Stones mit 400 cp Richtwerte; gewöhnliche neue Quellen führen bislang zu C1/F. Eine vollständige C2/C3-/E-Quelle braucht passende Kompetenz und eine ausführbare Definition, nicht nur einen teureren Namen.

| Quelle | Erstes Preisgespräch für F, cp | Bedeutung/Grenze |
|---|---:|---|
| Lehrer, klar begrenzter C1-Unterricht | 40–100 | Kompetenz/Zusage; Lernzeit weiterhin tatsächlich buchen |
| C1-Manual | 100–180 | Wiederverwendbares Material für langsameres Eigenstudium |
| C1-Skill-Stone | 350–500 | Schneller Zugang; Verbrauch erst beim gültigen Erwerb |
| C2-Manual / Stone | 250–450 / 800–1.200 | Höheres Mechanikbudget, keine Erfolgsgarantie durch Preis |
| C3-Manual / Stone | 500–900 / 1.600–2.400 | Seltenes Angebot bzw. bewusste Sparentscheidung |

E-C1 könnte zunächst etwa bei Manual400–700, Unterricht200–500 und Stone1.200–2.000 liegen; höhere E-Quellen erst danach sinnvoll kalibrieren. Gleiche Complexity verschiedener Ränge ist nicht dieselbe Macht. Preisbasis ausdrücklich benennen: eine Stunde, mehrere Einheiten oder die Zusage für eine Technik – keine doppelte Rechnung zwischen Unterrichtsberechtigung und Lernzeit. Manuals und sofortige Stones erfüllen unterschiedliche Zwecke.

PP-Training bleibt eine Alternative zu passenden Kämpfen. Gegen triviale Ziele keine Gratis-PP erzwingen. Aber es müssen Herausforderungen, kompetente Lehrer und Materialien auch auffindbar sein. Aktuelle Standard-NPC-Vorlagen liegen überwiegend niedrig bzw. beim Abenteurer bis F14; für E-Unterricht fehlen im normalen Angebot glaubwürdige erreichbare Spezialisten. Dafür vorhandene Rollen/Sonderprofile gezielt ergänzen, nicht jede Stadtwache auf E setzen.

Rare-/Legendary-Passives bleiben besondere Entwicklungen, keine regulären 200-cp-Waren. Skill- und Klassenevolution, Passive-Qualität und Itemqualität nicht zu einer einzigen Seltenheitsleiter vermischen.

## 6. Wirtschaft als zusammenhängender Kreislauf

Ein Upgrade muss gegenüber Lootverkauf, Unterkunft, Tränken und Lernen eine echte Wahl sein. Keine harte globale Preisliste und keine automatische Preissteigerung mit dem PC. Denkbare **lokale Normalbereiche zum Vergleich**:

| Ware/Leistung | Grober Richtbereich cp, keine feste Lore |
|---|---:|
| Einfaches Essen / gewöhnliches Bett | 1–5 / 2–8 |
| Common F-Verbrauchsgut | etwa 15–40, je Wirkung/Menge |
| Bessere F-Verbrauchsgüter | etwa 40–100; tatsächliche Mehrwirkung sichtbar |
| Kleine Novice-Jagd | etwa 30–80 Belohnung |
| Gewöhnliche F-Arbeit | etwa 80–200 |
| Anspruchsvollere obere F-Arbeit | etwa 200–450, besondere Risiken gegebenenfalls 400–800 |
| Erste E-Arbeit | etwa 400–1.600, je Aufwand/Gefahr und Gruppengröße |

Die oberen Bereiche würden bestehende Novice-/Proven-Preisguides erweitern. Belohnung folgt der **tatsächlichen Aufgabe**, nicht dem Level ihres Abnehmers. Ein L12-Spieler erhält für dieselbe kleine Rattenjagd nicht plötzlich 400 cp. Umgekehrt darf ein gefährlicher oberer-F-Auftrag nicht nur deshalb zum Anfängerlohn werden, weil sein Label Novice lautet. Quota, Reise und Risiko gemeinsam betrachten, ohne zusätzliche Nachweispflichten zu erzeugen.

Heutige Verbrauchsgüter: F-Heiltrank30HP/Richtwert24cp, Manatrank25MP/20cp, Ausdauertonikum30STA/15cp. Bei 380 MP ist ein 25-MP-Trank deutlich weniger nützlich als beim Start mit 96 MP. Stärkere Angebote anhand **absoluter gespeicherter Wirkung** entwickeln; keinen mit dem Trinkenden automatisch mitskalierenden Trank einführen. E-Rang alleine muss nicht die einzige bessere Trankqualität sein.

Loot folgt tatsächlicher Spezies/Anatomie, Rang und besiegtem Profil; vorhandenes Auto-Loot bleibt. E-Materialien erhalten heute bereits den Faktor3 je Rang, während Gearwerte etwa ×1,75 skalieren. Einkauf, Ankauf und Lootzusammensetzung müssen daher zusammen betrachtet werden. Kein garantiertes Buy/Sell-Arbitragegeschäft, keine Wiederverkaufswerte oberhalb des bezahlten Kaufpreises als Standard. Lokale Knappheit und Sonderpreise bleiben möglich, aber als solche erkennbar; weder 240 noch 550 cp machen MATK6 zum Upgrade.

**Vor numerischem Feinschliff nötig:** Der Spieler muss die bestätigten Werte, Wirkung, Menge, Preis und vorhandenen Slot sehen können. Die bereits vorbereitete strukturierte Angebotsanzeige ist dafür der passende separate Fachbereich. Noch mehr Kaufanweisungen im Testspieler ersetzen diese Information nicht.

## 7. Gegner und Umgebung separat: Weltgefahr statt Spielerservice

Die Nutzerbeobachtung ist plausibel: Ein generatives Modell kann neue Hindernisse unbewusst passend zum Spieler schreiben. Eine bloße Promptregel „nicht mitskalieren“ schützt deshalb weniger als **vorher gebundene, persistierte Weltvorgaben**. Umgekehrt zeigt Run20 gerade den anderen Fehler: fast alle freien Gegner bleiben beim unbekannten Level-1-Standard.

Meine schlanke Richtung, noch ohne Datenmodellentscheidung:

1. Bestehende Lore-, Dungeon- und Gebietsvorgaben haben Vorrang. Für relevante noch offene Orte legt die Engine beim ersten Bedarf einen kleinen Gefahrrahmen aus dem übergeordneten Weltkontext fest, unabhängig von PC-Level, Ausrüstung und letzter Siegesserie. Bestehende Orts-/Faktenmechanik bevorzugen; keine Weltkarte/Hexsimulation bauen.
2. Der Rahmen erlaubt mehrere Populationen/Gefahren, nicht „jedes Wesen dieses Waldes ist Level8“. Körpervorlage, Zahl, soziale Gruppe, Normal/Elite/Boss und gegebenenfalls bekannte besondere Eigenschaft bleiben eigene Größen. Ein Reh und ein Oger desselben Levels sind verschieden gefährlich.
3. Der Narrator gestaltet Bewohner, Spuren, Motive und Begegnungen innerhalb dieses Rahmens. Enginezahlen und erstmals materialisierte Identitäten werden gespeichert. Rückkehr oder Aufstieg würfeln bekannte Wesen nicht neu.
4. Sichere Straßen und Siedlungsnähe überwiegend schwach; gewöhnliche Wildnis gemischt; bekannte Jagdgebiete und gefährliche Ruinen anspruchsvoller; einzelne hochrangige Territorien auch nahe bewohnter Gegenden möglich. Das sind Weltverhältnisse, keine automatische Entfernungsschwierigkeit und keine Erhöhung nach absolvierten Quests.
5. Gildenangebote beziehen sich auf dieselbe tatsächliche Gefahr. „Ich suche schwierigere Arbeit“ kann zu einem vorhandenen gefährlicheren Gebiet führen, verändert aber nicht den bisher harmlosen Wald. Neue Gebiete dürfen entstehen, ihr Gefahrrahmen darf nicht aus dem Level des Fragenden gerechnet werden.
6. Unmögliche oder zu riskante Unternehmungen bleiben möglich. Vorher wahrnehmbare Warnungen, glaubwürdige Berichte, Messung oder sichtbare Stärke geben Entscheidungsgrundlagen; keine Pflicht zur Offenlegung sämtlicher versteckter Monsterwerte. Vermeiden, verhandeln, andere Route, später zurückkehren oder Hilfe suchen bleiben echte Antworten.

Schon vorhanden sind `settled`1, `wilderness`1–3, `deep_wilderness`4–7 und `hunting_territory`1–14. Der bisherige Lookup verwendet allerdings die Gefahr an `scene.location`; relevante konkrete Orte werden nicht automatisch so eingeordnet. **Erst Datenzuführung/Ortsbezug prüfen**, bevor neue Kategorien hinzugefügt werden. E-Gefahr15–29 benötigt außerhalb Dungeons eine entsprechend etablierte Weltquelle, nicht einen pauschalen PC15-Schalter. Keine globale NPC-Bewegungssimulation und keine neuen intelligenten Fantasyvölker.

## 8. E-Monster: Numerik besteht bereits, Begegnungsdesign fehlt noch

`npcgen.js:scaleCreature` setzt dieselben Formeln fort. Beispielwerte aus heutigem Code, **normale** Wesen ohne individuelle Variation/Elite/Boss:

| Level/Rank | Skelett HP / ATK / DEF | Goblin HP / ATK / DEF |
|---|---|---|
| 1/F | 30 / 10 / 2 | 45 / 11 / 1 |
| 7/F | 66 / 23 / 6 | 99 / 26 / 3 |
| 14/F | 108 / 39 / 10 | 162 / 42 / 6 |
| 15/E | 114 / 41 / 10 | 171 / 45 / 7 |
| 22/E | 156 / 56 / 15 | 234 / 62 / 9 |
| 29/E | 198 / 72 / 19 | 297 / 79 / 12 |

**Keinen zusätzlichen pauschalen E-Statmultiplikator darüberlegen, nur weil E noch wenig getestet ist.** Zwischen14 und15 ist der rohe Unterschied klein, während E-Gear, Klassenbonus, neue Skillbudgets und Rang-XP gleichzeitig anders wirken. Es ist offen, ob später eine besondere Fähigkeit den Rangwechsel stärker kennzeichnen soll. Dann höchstens ein charakteristisches, bereits ausführbares Merkmal für eine konkret etablierte E-Kreatur als ersten Schritt – keine automatische Ladung Gift/Flug/Immunität für jeden E-Goblin. Solche Merkmale brauchen echte Engineunterstützung.

Dungeons haben den Vorteil festgelegter Rang-/Ebenenfenster. Das beweist noch keine E-Balance: Gruppe, Elite-/Bossfaktor, Deckung und Ressourcen müssen mitgeprüft werden. Ein E-Einzelgegner und drei E-Wächter sind kein vergleichbarer Auftrag. Die kanonische Population darf nicht zur Schonung eines unterlegenen PCs reduziert werden.

Auch vorhandene XP-Grenzen beachten: Bei Stärke1 gibt F14 gegen einen F-PC336 XP, E15 gegen F720; nach Wechsel des PCs zu E sind es für dieselben Ziele168 bzw.360. Das folgt der **vorhandenen Rangdifferenzregel**, nicht einem neuen Anti-Farming-Vorschlag. Ein späterer E-Lauf darf diese Sprünge nicht versehentlich als falsche XP-Verdopplung behandeln. Keine Entscheidung zur Levelkurve in diesem Dokument.

## 9. Was ich zur Verfeinerung zuerst entscheiden würde

| Offene Entscheidung | Meine vorläufige Neigung | Noch nötiger Vergleich |
|---|---|---|
| Starter10 senken oder F-Waffenraum öffnen? | Raum nach oben öffnen, Einstieg vorerst schützen | Waffen-/Rüstungswirkung gegen gleiche Gruppen und obere-F-Gegner |
| E-Skills sofort viel stärker oder anschließendes Budget? | Vergleichbare Rolle/Beherrschung berücksichtigen, eher mehr Basis und neue Funktion als explodierende Koeffizienten | F-P5 gegen E-P1, Kosten und indirekte Klasseneffekte |
| Neue Skills vor allem kaufen oder entwickeln? | Mehrere Quellen erreichbar machen; kein ausschließliches Grinding und keine Gratisvergabe | Erwerbszeit/Geld/PP gegen tatsächlichen Spielnutzen |
| Preise frei lassen oder vollständig festsetzen? | Engine-Richtwerte und sichtbare bestätigte Offerten; begründete lokale Abweichung | Kaufkraft, Looterlöse, Trank- und Trainingskosten |
| Weltgefahr fest oder mitwachsend? | Weltgebunden und persistent; konkrete Ausgestaltung offen | Bestehende Danger-Fakten und Dungeonfenster zuerst richtig anschließen |
| Mehr Ressourcen oder andere Skillkosten? | STA100/MP-Wachstum zunächst getrennt bewerten | Alle drei Klassen, nicht nur den Mage-Run |

Sinnvolle Reihenfolge späterer Facharbeit: **sichtbare Angebote und ausführbare Weltgefahr → F-Ausrüstung/Quellen/Preise gemeinsam → Skill-/Ressourcenvergleich → E-Gesamtübergang**. Kein neuer Patchauftrag aus dieser Reihenfolge. Zuerst ein kleiner Vergleichssatz aus vorhandenen Formeln und den Originalgruppen, anschließend natürliche Läufe; keine riesige neue Simulationsmatrix als Voraussetzung.

Vor jeder Zahlenumsetzung Altstände klären: individuelle Gegenstandsprofile und dynamische Skilldefinitionen sind bereits gespeichert; statische Starter-Skills und allgemeine Regeln werden dagegen aus dem Content geladen. Eine Tabellenänderung ist deshalb nicht automatisch für alle Saves folgenlos. Legacy-Regelstand1 schützen und bewusst entscheiden, welche Balanceänderungen bestehende Regelstand2-Kampagnen übernehmen sollen.

## Quellen und Grenze

Codebezug ist [Produktcommit681c2b4](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/681c2b4f6a85a30b2dba4357cd621f483ed42be5/avereth-engine): `content/{rules,classes,gear,monsters,npc_templates,lore,campaign_start,rules_text}.json`; `src/{derived,skills,skill_composer,npcgen,progression}.js`; `src/v4/{items,growth,skill_growth,class_growth,living,guild}.js`. Die Ist-Tabellen wurden aus diesen Formeln abgeleitet, nicht aus neuen Kämpfen simuliert. Die vorgeschlagenen Preis-/Wertbereiche sind Sols Entwurf. Originalbeobachtungen und Unsicherheiten bleiben in der Balance-Datei und den Runreviews.

**Keine Engine-, Kanon-, Runner-, XP- oder Balancewerte geändert.** Nächster Schritt ist gemeinsame Auswahl und Verfeinerung dieser Richtungen, nicht automatische Umsetzung sämtlicher Beispiele.
