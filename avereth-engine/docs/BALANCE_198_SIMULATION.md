# Abschlussprüfung Balance .196–.198

**Build 4.3.0-c.6.6.198; Basis `.195`/`7044d29`.** Die drei freigegebenen
Änderungen sind technisch umgesetzt und getrennt geprüft. In den hier geprüften
gewöhnlichen Builds wird kein +5- oder Bossgegner innerhalb von zwei
Aktionsrunden bezwungen. Hohe Siegquoten gegen schwächere Körperpläne bedeuten
nicht automatisch kurze oder risikolose Kämpfe. Mit ausdrücklich außergewöhnlicher
Ausrüstung/Proficiency sind schnelle +5-Siege möglich und hier konkret belegt.

## Umfang und Messung

**54.200 abgeschlossene Kämpfe**, 542 Szenarien × Seeds **7001–7100**;
49.100 Hauptmatrix + 5.100 gezielte Taktik-/Extrem-Kontrollen. **0 technische
Fehler, 0 Abbrüche, 0 Fluchten.** Zusätzlich getrennte Vorher/nachher-Paare:
`.196` 4.200, `.197` 14.400, `.198` 3.600 Kämpfe. Zusammen 76.400 Kämpfe;
Validierungsläufe und einzelne Trefferregressionen sind dabei nicht mitgezählt.

Echte Engine: `tools/sim/combat.mjs` (`character`, `choose`), `initEncounter`,
`runCombat`, `attackAction`, `damagePreview`; keine eigene Schadensformel und
keine zusätzlichen Zufallswürfe im Produkt. Adapter gegen 12 Original-Simulator-
Kämpfe (Records, Würfel, HP, Abschluss) und 111 Etappenszenarien geprüft:
**123 exakte Äquivalenzvergleiche**. Alle Seeds sind fest; kein Providerkontakt.

- Warrior/Mage/Rogue auf L1/5/10/14/15. Basisattribute und neue PC-Progression
  aus dem Produkt. Ausgewogen: Warrior STR/VIT/AGI 2/2/1, Mage INT/WIL/VIT
  2/1/2, Rogue AGI/PER/VIT 2/1/2; das sind Gewichte für fünf freie Punkte.
- Gewöhnliche Körpermatrix: L1 Starterkit, L5 F-fine, L10/14 F-superior-Waffe
  und F-fine-Rüstung, L15 E-fine. Kein zusätzlicher Schild. Warrior schwere,
  Mage/Rogue leichte Rüstung. P1, keine automatische Klassenentwicklung.
- Goblin/humanoid, armored_beast, bear und spirit; gleicher Level und +5,
  jeweils normal/elite/boss. Monsterwerte und Typmultiplikatoren unverändert.
  Boss +5 ist ein kontrollierter Härtevergleich, keine Behauptung über natürliche
  Spawnhäufigkeiten. Zusätzliche Weltfälle: Guardian6/PC5 und Boss9/PC10.
- SHORT, bewusstes Gegenüberstehen, keine Hinterhalte. Native Skilltaktik:
  Heavy Slash, Arcane Bolt, Razor Cut. `max` wählt den besten legalen Schaden
  aus der sichtbaren Vorschau (keine Kenntnis zukünftiger Würfe). Defensive
  Guard/Ward sowie Bogen mit endlichen 20 Pfeilen und vier Startdistanzen separat.
- Menschen entstehen durch `materialise` samt Starterkit, echter Starterwahl
  und Signatur. Gleiches/+5-Level, native, angeglichene und Veteranen-Kits wie
  in [BALANCE_197.md](BALANCE_197.md). Angeglichene Skills sind eine ausdrücklich
  kontrollierte Alternative zur nativen Signatur, keine Produktänderung.
- Extremfälle separat: PC10, offensive Verteilung 3/1/1, **vollständiges
  F-exceptional-Kit, schwere Rüstung + Schild, P5**, optimale Skillwahl. Legale
  Kombination, aber weder durchschnittliche Ausstattung noch gewöhnliche
  Ausbildung. Keine zusätzliche Sonderwirkung.

**Runden** = höchste tatsächlich ausgeführte `record.round`, nicht der nach
Rundenende weitergeschaltete Zähler. **≤2-Anteil = schnelle Siege / sämtliche
Siege**, niemals /Versuche. Bei null Siegen ist der Anteil **nicht definiert**.
Mittel/Median der Runden, Ressourcen und Schäden beziehen sich auf alle
abgeschlossenen Kämpfe; Rest-HP nur auf Siege. Schaden meint echte HP-Differenzen,
mit Overkill abgeschnitten; `damagePerAttack/Turn` im CSV zusätzlich ungekappt
nach der Kampfberechnung. Nicht abgeschlossene Kämpfe hätten eine eigene
Abbruchspalte und würden nicht als Niederlagen gewertet.

Die folgende Aggregation ist gleichgewichtet über die definierten Szenarien;
sie ist **keine erwartete Siegquote einer zufälligen Spielwelt-Begegnung**.
Die vollständigen 542 Einzelzeilen mit Gear, Gegner, Taktik, Median, Rest-HP,
HP-Schaden aus/ein, MP/STA/Pfeilen und allen Zählern stehen in
[BALANCE_198_MATRIX.csv](BALANCE_198_MATRIX.csv). Alle 111 gepaarten Szenarien:
[BALANCE_196_198_PAIRED.csv](BALANCE_196_198_PAIRED.csv).

## Getrennte Pflichtkennzahlen

| Gruppe | Siege / Kämpfe | Siegquote | Siege ≤2 / Siege | Anteil ≤2 | Ø Aktionsrunden |
|---|---:|---:|---:|---:|---:|
| Menschen gleichstufig | 3276/3600 | 91.00 % | 0/3276 | 0.00 % | 4.22 |
| Menschen +5 | 766/3600 | 21.28 % | 0/766 | 0.00 % | 4.65 |
| Normale Körper gleichstufig | 6000/6000 | 100.00 % | 1631/6000 | 27.18 % | 3.17 |
| Normale Körper +5 | 4124/6000 | 68.73 % | 0/4124 | 0.00 % | 4.26 |
| Elite gleichstufig | 5103/6000 | 85.05 % | 0/5103 | 0.00 % | 5.07 |
| Elite +5 | 647/6000 | 10.78 % | 0/647 | 0.00 % | 4.59 |
| Boss gleichstufig | 2474/6000 | 41.23 % | 0/2474 | 0.00 % | 5.67 |
| Boss +5 (Kontrollhärte) | 0/6000 | 0.00 % | 0/0 | — | 4.07 |
| Boss Weltlevel9 gegen PC10 | 525/1200 | 43.75 % | 0/525 | 0.00 % | 5.84 |
| Guardian Weltlevel6 gegen PC5 | 201/300 | 67.00 % | 0/201 | 0.00 % | 6.26 |
| Boss +5 alternative Taktik | 0/1800 | 0.00 % | 0/0 | — | 4.36 |
| Boss +5 Extrem-Build | 210/1200 | 17.50 % | 0/210 | 0.00 % | 3.89 |
| Humanoide Waffenbeschreibung (Kontrolle) | 141/600 | 23.50 % | 0/141 | 0.00 % | 5.18 |
| Boss +5 Bogen/Reichweite | 0/800 | 0.00 % | 0/0 | — | 4.98 |
| Boss Weltlevel9 alternative Taktik | 925/2400 | 38.54 % | 0/925 | 0.00 % | 6.71 |
| Normale +5 mit Skillwahl | 1176/1200 | 98.00 % | 0/1176 | 0.00 % | 4.13 |
| Normale +5 Extrem-Build | 1200/1200 | 100.00 % | 593/1200 | 49.42 % | 2.65 |
| Guardian mit Skillwahl | 295/300 | 98.33 % | 0/295 | 0.00 % | 6.08 |

## Konkrete Bewertung

### 1. Drei Änderungen und F→E

E-Waffen/Foki jetzt **7/11/15/19/23** gegenüber F **6/10/14/18/22**;
jedes gleichqualitative E-Stück ist stärker. Die `.196`-Paare isolieren allein
die Waffe: PC15 mit F-exceptional-Rüstung gegen Bär15/elite, E-exceptional
Siegquoten Warrior **87→100 %**, Mage **85→99 %**, Rogue **2→38 %**. Alle
F-Kontrollen bleiben exakt gleich. Rundung kann einzelne +1-Schritte im
Kampfergebnis neutralisieren; der angezeigte und tatsächlich abgeleitete
Ausrüstungswert steigt dennoch korrekt. D–S unverändert.

NPC14 hat **97 statt 123** Statpunkte in beiden Generatoren; keine Änderung
an Spielerprogression oder Monster-Körpern. Fine-Schild **5/3/64** statt
4/3/56. Gegen Bär6/elite sinkt bei PC5/fine der mittlere HP-Verlust Warrior
**94,79→89,75**, Mage **115,10→110,09**, Rogue **108,56→103,83**; die gepaarten
magischen Kämpfe sind vollständig identisch. Keine neue Inventar-/Kampfmechanik.

### 2. Menschliche Gegner

Gleichstufige Menschen sind mit den geprüften Kits häufig besiegbar (**91 %**),
+5-Menschen deutlich gefährlicher (**21,28 % PC-Siege**). **0/766** dieser
+5-Siege enden innerhalb von zwei Runden. Gegen +5-Veteranen mit superior/fine
und P3 gewinnen Warrior und Rogue in den geprüften Paaren **0/100** je Fall;
Mage je nach PC-Level **24/47/57/62 %**. Das ist keine gleichmäßige Klassenkurve:
NPC-Mages investieren nach vorhandener Priorität INT/WIL/PER kaum in VIT,
tragen leichte Rüstung und wechseln ihre ausgewürfelten Angriffe mit Ward.
Ein L19-Mage hat hier 170 HP gegenüber dem ausgewogenen PC14 mit 275 HP,
kann mit Flame Lance aber einen Treffer von 144 Schaden austeilen (Seed7001).
Der verbleibende Skill-/Taktikmix erklärt stark verschiedene Ausgänge trotz
identischem normalen Punktebudget. Kein Beleg für einen benötigten pauschalen
Human-Buff oder erneute versteckte Favored-Punkte.

### 3. Bosse und Körperpläne

Bosse gleicher Stufe: **41,23 % PC-Siege**, keiner in ≤2 Runden. Bei Boss+5
liegen alle Standard-Builds bei **0/100 pro Fall**; auch die untersuchten
gewöhnlichen Alternativtaktiken und Bogenstartdistanzen ändern daran nichts.
Die mittleren 4,07 Runden im Hauptfeld sind **frühe Niederlagen des PC**, keine
schnellen Bosskills. Das sind bereits harte Herausforderungen.

Weltboss9/PC10 mit mixed/P1:

| Körperplan | Warrior / Mage / Rogue Siege je100 | Erklärung |
|---|---:|---|
| Goblin | 100 / 100 / 100 | 293 HP, geringere Abwehr/Angriff; trotzdem ca. 5–6 Aktionsrunden, Rest-HP 47,6/28,1/28,4 % |
| Gepanzert | 0 / 0 / 0 | Hoher HP-/DEF-Vorrat; Kampf dauert im Mittel 6,8–8,0 Runden bis zur PC-Niederlage |
| Bär | 0 / 0 / 0 | Hoher HP-/Angriffswert, PC überlebt die nötigen Angriffszyklen nicht |
| Spirit | 100 / 25 / 100 | Hohe MDEF trifft Mage, magische Treffer treffen die schwache MDEF der PC-Kits; geringe Rest-HP |

Ein Goblinboss ist damit im Vergleich leichter, aber keine beliebige
Ein-Runden-Belohnung. Das Bosslabel ersetzt keinen starken Körperplan.
`creatureGear` ist nach bestehender Regel eine feste humanoide Bewaffnung:
eine Beschreibung „exceptional E-Rank longsword“ erfindet **keinen** neuen
Qualitätsmultiplikator auf den Monsterangriff. Die sechs bewaffneten
Elite-/Boss-Kontrollen nutzen diesen echten Pfad. Für einen ausrüstungsstarken
menschlichen Veteranen gelten dagegen die echten Gear-/Skill-Werte des
Human-Sheets. Beide Modelle dürfen bei der späteren Weltplatzierung nicht
verwechselt werden.

### 4. Schnelle +5-Siege: ausschließlich der markierte Extremfall

Gewöhnliche +5-Monster (auch mit besserer P1-Skillwahl): **0 schnelle Siege**.
Im Extremfeld gewinnen dagegen alle 1.200 Kämpfe, davon **593/1.200 = 49,42 %**
in höchstens zwei Runden. Das konzentriert sich genau auf Goblin und Spirit:

| PC10 Extrem-Build gegen Normal15 | Warrior | Mage | Rogue |
|---|---:|---:|---:|
| Goblin: Anteil schneller Siege | 93 % | 100 % | 100 % |
| Spirit: Anteil schneller Siege | 100 % | 100 % | 100 % |
| Bär / gepanzert | 0 % / 0 % | 0 % / 0 % | 0 % / 0 % |

Konkrete Kausalkette, Seed7001: Goblin15 normal hat **171 HP / DEF7**.
Offensiver Warrior10 hat STR33, exceptional-Waffe ATK22, P5 Heavy Slash;
Power **97,8**, nach DEF **90,8**, Treffer **97 und 94**. Der Goblin ist in
Runde2 tot. Rogue mit AGI33/P5 Piercing Thrust: Power **108,9**, Treffer
**109 und 106**. Spirit15 hat nur **152 HP**, trotz MDEF22 verursacht der
entsprechende Mage10 **98 und 89**. Hohe Angriffsstat/P5/Gear gegen schwächere
HP-Körper erklären die zwei Runden vollständig. Der Boss desselben Levels
hat wesentlich mehr HP: Goblin15 **428**, Bär15 **598**. Selbst Extrem-Builds
gewinnen gegen +5-Bosse nur **210/1.200**, alle gegen Goblin, keiner in zwei
Runden. Kein zusätzlicher Bonus oder fehlerhafte Level-/Rangbuchung gefunden.

### 5. Relevante Taktik statt pauschaler Zahlenänderung

Guardian6 gepanzert gegen Rogue5/mixed/P1: native Razor-Cut-Taktik **1 %**
Siegquote, beste sichtbare Skillwahl mit Piercing Thrust **95 %**; beide
Varianten **0 schnelle Siege**. Gegen normalen gepanzerten +5-Gegner auf
PC10 verbessert dieselbe Wahl **0→98 %**. Gegen Goblin-Weltboss9 verkürzt
Rogue die mittlere Dauer **5,99→5,00 Runden** und erhöht Rest-HP
**28,4→42,5 %**. Guard/Ward verlängert mehrere Kämpfe, garantiert aber keinen
Sieg: beim Warrior-Spirit-Weltboss sinkt die Siegquote bei defensiver
Standardpolitik **100→0 %**. Weniger Angriffsaktionen können den Schutzvorteil
aufzehren. Diese vorhandenen Unterschiede dürfen nicht mit genereller
Unterlegenheit einer Klasse oder einem pauschal zu starken Boss verwechselt werden.

### 6. Empfehlungen und Grenzen

- **Keine automatische Nachkorrektur nötig:** Der freigegebene normale
  +5-Maßstab wird in dieser Matrix erfüllt. Keine Mindestkampfrunden,
  Spielerlevel-Autoskalierung oder flächigen Boss-/NPC-Buffs einführen.
- Weltplatzierung weiterhin nach realem Körperplan, Level, Ausrüstung und
  Skills bewerten. Soll ein konkreter Goblinboss härter sein, zunächst seine
  vorhandene Rolle/Level-/Profilwahl prüfen; nicht alle Bosse anheben.
- P5 + Voll-exceptional ist ein spürbarer Vorteil. Die hier belegten schnellen
  normalen +5-Siege sind nach der Vorgabe zulässig. Ihre tatsächliche Häufigkeit
  im Spiel hängt von Ausrüstungszugang/Ausbildung ab und ist keine Frage dieses Patches.
- Den vertagten Preisbruch **F-exceptional Richtwert440 vs. E322 cp** separat
  wirtschaftlich prüfen. Händlerpreise nicht als garantiert ausgeben.
- Keine Aussage über sämtliche Skillsets, Rare+-Entwicklung, Gruppen,
  Begleiter, Hinterhalte, Verbrauchsitems oder Ortsgefahren. Die Simulation
  isoliert Einzelkämpfe ohne Heiltränke/Unterstützung. NPC-Politik ist kein
  symmetrischer PvP-Gegner. Eine Erwartung, jeder PC müsse jeden +5-Boss solo
  besiegen können, wäre aus diesen Ergebnissen nicht ableitbar.

Die `.195`-Analyse auf `main` bleibt unverändert. Die E-Paare reproduzieren
unter anderem deren 87/85/2-%-Ausgangsfälle; NPC-Vergleiche hier verwenden
zusätzlich vollständige Materialisierung/Signaturen und SHORT statt des dortigen
rohen Sheet-/ENGAGED-Kontrollfalls. Absolute Werte verschiedener Setups sind
nicht als Patchwirkung vermischt. Jede Vorher/nachher-Reihe hier hat identische
Seeds, Gear, Taktik und Ausgangslage außer der jeweils freigegebenen Änderung.

## Reproduktion und Prüfstatus

Vom Engineverzeichnis aus:

```sh
node tools/sim/balance/run.mjs --stage final --out /tmp/avereth-balance-final
node tools/sim/balance/followup.mjs "$PWD" /tmp/avereth-balance-final
```

Für Paare separate unveränderte Engine-Checkouts der Commitstände verwenden
(z.B. `git archive <commit>:avereth-engine` vom Repository-Root aus):

```sh
node tools/sim/balance/run.mjs --stage 196 --before /tmp/base195 --engine /tmp/base196 --out /tmp/balance-pairs
node tools/sim/balance/run.mjs --stage 197 --before /tmp/base196 --engine /tmp/base197 --out /tmp/balance-pairs
node tools/sim/balance/run.mjs --stage 198 --before /tmp/base197 --engine "$PWD" --out /tmp/balance-pairs
```

Die Werkzeuge schreiben JSONL-Einzelresultate, vollständige Summaries,
Szenariodefinitionen, Records/Würfel für Beispielseeds und Metadaten/Hashes.
Sie verändern weder den Produktcode noch historische Korpora. Node v24.22.1.

| Build | gezielte neue Regressionen | vollständiges npm test | vollständiger Replay | neue Fingerprints |
|---|---:|---:|---:|---:|
| .196 | 5/5 | 3295/3295 | 2235/2235 | 0 |
| .197 | 6/6 | 3301/3301 | 2235/2235 | 0 |
| .198 | 5/5 | 3306/3306 | 2235/2235 | 0 |

Je Replay: alle 1.131 früher begründeten Abweichungen exakt bestätigt,
0 offene/veraltete Einträge, 0 Replay-/Fold-/Validierungsfehler. Originaldaten
und Fingerprintfreigaben unverändert. Keine ST-Smokes, natürlichen Modell-
oder Providerläufe. Unabhängiger Produktdiff-Review und spätere gesammelte
ST-Abnahme stehen aus; **kein persönlicher Spieltest-GO**.
