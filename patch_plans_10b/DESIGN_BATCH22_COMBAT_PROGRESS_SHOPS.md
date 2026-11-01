# Designentscheidung nach Batch22: Kampf, Gefahr, Skillwachstum, Standardhandel

**Umsetzungsstand:** Die Nutzerentscheidungen AoE-Variante A, bekannte Gefahreninformationen und das zusammenhängende Skillpaket sind freigegeben und als [.148](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/130ea266e29d1daee53b14ae20e46adc0bc53ed0/avereth-engine/docs/DESIGN148_COMBAT_QOL.md) / [.149](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b7b30d0b763a4142a821d335e250dfbc4c3c8b4a/avereth-engine/docs/DESIGN149_SKILL_GROWTH.md) implementiert. Die folgenden Analysen bleiben ihre historische Begründung; §6 Punkte1–3 sind damit entschieden. **Engine-Shops (Punkt4) weiter offen**, keine Implementierungsfreigabe. Aktuelle Abnahme und nächste Schritte nur in [03](../03_AKTUELLER_PROJEKTSTAND.md).


**01.11.2026 · Analyse und Empfehlungen, keine Designfreigabe.** Produkt **.147 / [a9f00b4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9f00b4dd72c9f062bcbe454fca037c9ca01151d)** enthält ausschließlich Save-Recovery und Artikelauswahl; [technische Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a9f00b4dd72c9f062bcbe454fca037c9ca01151d/avereth-engine/docs/FIX147_BATCH22_SAVE_SELECTION.md). Die nachstehenden Vorschläge sind **nicht implementiert**. [02](../02_DESIGN_KANON.md) bleibt bis zur ausdrücklichen Entscheidung unverändert.

Quellen: [Batch22 mit Originalarchiv und Review](../testrun_10b/batch-20261101-174704Z/REVIEW.md), [Batch17](../testrun_10b/batch-20261030-040258Z/REVIEW.md) und dessen Originalrecords im vorhandenen Replaykorpus. Ergänzend tatsächlicher Produktcode: `src/combat.js`, `src/engine.js`, `src/skills.js`, `src/v4/scene_handles.js`, `skill_growth.js`, `growth.js`, `guild.js`, `items.js`, `src/display.js` und aktive `content/rules.json`-/Affinitätswerte. GPTs übermitteltes Gegenfeedback bestätigt Prioritäten und Kaufbefund; es ersetzt keine eigene Originalprüfung und beschließt keine Designänderung.

## 1. Entscheidungen und empfohlene Reihenfolge

| Priorität | Empfehlung | Bewusster Gewinn / Verlust | Noch zu entscheiden |
|---|---|---|---|
| 1 | Gewöhnliche AoE trifft Gegner im gewählten Band; ausdrücklich angegriffene NPCs bleiben zulässige Ziele. | Vorhersehbar ohne Winkel-/Positionsverwaltung; unbeabsichtigter Freundbeschuss gewöhnlicher Skills entfällt. | Bisherige Friendly-Fire-Regel ausdrücklich ändern oder beibehalten? |
| 2 | Vorhandene Gilden-/Populationsdaten als gemeldete Levelspanne und Gesamt-Killziel klar anzeigen; sichtbare Gruppengröße separat. | Bessere Risikowahl ohne PC-Skalierung, neue Gefahrenberechnung oder sichere Flucht. | Öffentliche gemeldete Levelspannen mit knapper textlicher Einordnung zeigen? |
| 3 | Offensive PP und Entwicklungsbelege zusammenpassen lassen; offensives F-Level-Fenster versuchsweise von −2 auf −4; zwei Musterbelege dürfen schon vor P5 entstanden sein. | Bestehende gute Kämpfe zählen, kein absichtliches Einstecken; P5 bleibt Voraussetzung. | Breiteres offensives Fenster und frühere Belege freigeben? |
| 4 | Engine-Shop später als regulären Weg für definierten Standardhandel bevorzugen. | Weniger neue Preis-/Händlerinterpretation; weniger verbindliches freies Feilschen im Standardgeschäft. | Fachplanumfang freigeben, insbesondere Shopidentität und feste Angebote? |

**XP×5, Levelschwellen, Startwerte, Skillformeln/-kosten sowie bestehende Preise bleiben unverändert.** Keine garantierte Evolution oder Zusatzfähigkeit bei einem Level. Kein weiterer Finanz-Perfektionsaudit vor der Designentscheidung. Main/Minor bleibt der [separat vorbereitete, noch nicht umgesetzte Plan](PATCH_COMBAT_MAIN_MINOR_ACTIONS.md).

## 2. Friendly Fire, AoE und Begleiter

### Was im Mage-Run tatsächlich geschah

T19 trifft Arcane Wave drei Käfer und Brenna im Band SHORT. Brenna erhält 28 Schaden; zwei Käfer sterben, der dritte hat 1 HP. Brenna ist im Encounter zunächst neutral, nicht als Verbündete gebucht. Ihre Gegenwehr wird von `asideTurn()` mit `turned: struck by his Arcane Wave` erzeugt. Sie und der letzte Käfer greifen an; beim folgenden Spielerzug stirbt der Mage nach dem letzten Käfer an Brenna. Kein Phantomspawn und keine vom Extractor erfundene Schadensbuchung.

`combat.js:areaVictim()` trifft im C-Pfad alle Lebenden außer dem Anwender. `scene_handles.js:sideOf()` verwendet Gegnerstatus bzw. Haltung ≥20 als Verbündetenstatus. Eine erzählte gemeinsame Reise ist noch keine solche Beziehung. **Auch ein korrekt als ally geführter Begleiter wäre heute von der AoE getroffen**; lediglich seine Reaktion kann anders ausfallen. Ein reines Verbündetenlabel repariert die Flächenregel folglich nicht.

Die drei Bänder sind keine Winkel oder Koordinaten. „Bleib hinter mir“ kann denselben PC-Abstand bedeuten wie der der Käfer; „auf diese drei“ wählt heute deren Band, keine exklusive Dreierliste. Für natürliche Sprache ist das ein erheblicher Erwartungsunterschied. Mehr Raumgeometrie würde das lösen können, wäre für den gewünschten Eingriff aber unnötig aufwendig.

### Varianten

| Variante | Verhalten und Sandboxfolge | Aufwand / Nachteile |
|---|---|---|
| **A – Gegnerstandard** | Gewöhnliche Area-Skills treffen alle vorhandenen Gegner im Zielband; weitere Bänder bleiben unberührt. Ein bewusst angegriffener neutraler NPC bleibt primäres Opfer. Weitere ausdrücklich angegriffene Ziele einer autorisierten Gruppen-/Crowd-Aktion dürfen nicht durch Immunität geschützt werden. Unbeteiligte werden nicht automatisch mitgetroffen. | Begrenzter Mechanikpatch, aber mehr als ein Filterwechsel: Zielerfassung vor Kampfbeginn und Treffer im aktiven Encounter müssen übereinstimmen. Weniger Unfallrisiko/Taktik durch Freundbeschuss. |
| **B – heutige Flächenregel, klare Information** | Alle im Band bleiben betroffen. UI/Enginekontext nennen Wirkung und erkennbare Mitbetroffene; Kooperation und Verbündetenstatus werden nachvollziehbar. NPCs können nach Beschuss weiter eigenständig reagieren. | Erhält maximale physische Konsequenz, verlangt aber aktives Bandmanagement. „Hinter mir“ bleibt ohne Geometrie unzureichend. Anzeige muss aktuelle sichtbare Szene und Encounter gleichermaßen abdecken; keine zusätzliche Pflichtbestätigung. |
| **C – nur echte Verbündete schonen** | `ally` wird ausgenommen, neutrale Nebenfiguren bleiben gefährdet; bewusste Angriffe auf einen Verbündeten sind weiterhin möglich. | Weniger Eingriff in die bisherige Regel, aber abhängig von verlässlich gebuchtem Kooperationsstatus. **Brenna wäre im Original weiterhin getroffen**, solange sie neutral bleibt. Deshalb keine besonders einfache Lösung dieses Falls. |

**Empfehlung: A für gewöhnliche Skills**, symmetrisch für PC und NPCs. Die Erzählung darf eine kontrollierte Technik beschreiben, die Gegner trifft. Bewusste Gewalt bleibt möglich, einschließlich gegen zunächst neutrale Personen: Ein ausdrücklich autorisiertes Angriffsziel darf nicht allein wegen seiner bisherigen Neutralität aus der Trefferliste fallen. Dafür ist keine erzwungene allgemeine Feindschaft aller Anwesenden erforderlich. Nach einem bewussten Angriff gelten die vorhandenen Reaktionen.

Gewöhnliche Skills sind dabei ausdrücklich von bestehenden geworfenen Burst-Gegenständen und Umgebungsgefahren zu unterscheiden. Diese haben bereits eigene Ziel-/Clusterpfade; keine stillschweigende Änderung an Explosionen, Fallen oder Umwelt durch einen gemeinsamen Helper. Empfehlung: deren heutige physische Folgen zunächst erhalten, klar als gefährlich kennzeichnen. Ein neuer freier „trifft alles“-Modus oder eine zweite Geometrie ist für A nicht erforderlich.

**Konkretes Beispiel:** Arcane Wave auf Käfer A in SHORT trifft Käfer A/B/C, nicht die nur begleitende Brenna. Arcane Wave ausdrücklich auf Brenna trifft sie; daraus kann ein Kampf mit ihr entstehen. Das ist keine Allzweck-NPC-Immunität. Cleave trifft weiter alle tatsächlich ENGAGED stehenden Gegner, nicht aus beliebigen Bändern herbeigezogene Monster.

Bei späterer Umsetzung `engine.js`/`scene_handles.js:caughtBy()` und `combat.js:areaVictim()`/Area-Auflösung gemeinsam prüfen. Vor einem Kampf keine unbeteiligten Entities wegen einer künftig ausgeschlossenen Flächenwirkung materialisieren oder als Gegner einordnen. Bestehende Gruppenbeitritte, Erstschlag, Zielautorität, Kosten, Deckung und bewusste NPC-/Crowd-Angriffe als Gegenfälle. Vorhandene Skill-Zahlen und Bänder beibehalten. **Kein Friendly-Fire-Code ist Teil .147.**

## 3. Gefahr und Gildenquests: bekannte Informationen besser nutzen

Der L2-Warrior kämpft gegen sechs Boars auf L4/7/4/4/7/6 mit 66–90 HP und ATK18–26. Er versucht zuvor Abstand zu gewinnen; die Geschichte lässt den Rückzug scheitern. Später greift er an. Gefährlichkeit und Niederlage sind plausibel. Auch ein besser ausgerüsteter L2 muss diese Gruppe nicht besiegen können.

Vorhanden sind `quest.level`, `qtype`, `quest.hunt.at`, die zugehörige `places[at].population.levels`, öffentliche Gildenberichte und sichtbare Entity-/Gruppeninformationen. `display.js` zeigt bereits AREA LEVELS; `guild.goalText()` betont dagegen primär Zielzahl/Fortschritt. Außerdem ersetzt `guild.bookBoard()` im Count-Board-Profil den generierten Jagd-Task durch den standardisierten Kill-/Abgabetext: Eine frei formulierte Generatorwarnung ist deshalb kein verlässlich erhaltener Warnkanal. Bereits gespeicherte Zahlen/Typen in der Anzeige nutzen, statt bloß weitere Narratoranweisungen hinzuzufügen. **Die Monster skalieren bereits unabhängig vom PC; nicht ein neues Territorien- oder Gefahrensystem erfinden.**

Empfohlene Darstellung eines bekannten Auftrags:

> Tallowwood-Boars · gemeldete Individuen L4–7 · **4 Kills insgesamt** · Wildschweine können als Rotte auftreten; aktuelle Gruppengröße unbekannt · für unerfahrene Solokämpfer riskant.

Bei der tatsächlichen Sichtung kann ergänzt werden:

> **6 Tiere sichtbar.** Die Vertragszahl ist kein Hinweis auf die Größe dieser Begegnung. Gemeldete Stärke liegt über deinem Level 2.

Das nutzt Gildenwissen, eigenes Level und sichtbar erzählte Zahl; es verrät keine verborgene exakte HP, ungesehene Verstärkung oder garantierte Siegchance. Unbekannte Daten bleiben unbekannt. Der einzige L1-Einzelgegnerauftrag bleibt ein Angebot, keine verpflichtende Route.

Die Trennung ist wesentlich: Vier benötigte Kills garantieren weder vier gleichzeitig angreifende Tiere noch vier leicht einzeln erreichbare Ziele. Der Spieler darf nach anderen Individuen suchen, abwarten, Hilfe finden, einen anderen Auftrag nehmen oder sich einem riskanten Kampf stellen. Der Narrator darf eine passende Weltreaktion etablieren, aber muss keine Einzelgegner für den PC abspalten.

**Rückzug:** Vor einem Kampf ist Umkehren eine normale Handlung, keine sichere Teleportation. Im Kampf bedeutet einen Schritt zurückzugehen noch nicht erfolgreich zu fliehen; bestehende Bewegung/Flucht und Risiken verständlich anzeigen. Keine garantierte Flucht, kein automatisches Retten und keine neue Gegenangriffsmechanik. T31 Cleave+Guard verschafft im aktuellen System keine zweite volle Skillaktion; das ist gesondert vom Main/Minor-Plan zu beurteilen.

**Progression:** Schon gültige mittlere/obere F-Jagden deutlich neben Anfängeraufträgen anzeigen, mit vorhandenen Levelspannen, Ziel und Entlohnung. Nicht jedes Board ans PC-Level anpassen und keinen unsichtbaren Bonus für weiter entfernte Orte einführen. Batch22 zeigt nach viel L1-Wolf-/L4–7-Adder-Wiederholung später 185–700 Kampf-XP pro Sablewood-Begegnung und 2.025 XP für den Boarvertrag. Solche Chancen müssen erkennbar sein, nicht erzwungen werden.

## 4. Organische Skillentwicklung: konkrete Engpässe statt pauschal mehr XP

### Belegte Regeln und Vergleich

**Aktive F-Werte** in `rules.f_balance` haben Vorrang vor älteren allgemeinen Tabellen: PP je Promotion **C1 50 / C2 75 / C3 100**; LP-Tagescaps vor Affinität **self40 / teacher60**; Gildenmanual **80 cp**. Nicht versehentlich aus `proficiency.promotion_progress` 75/100/150 oder aus alten `growth`-Caps andere aktuelle Werte ableiten.

`ppAward()` gibt Basis12 × höchste Tag-Affinität; Rogue/Precision ergibt18. `fightProgress()` erlaubt seit .123 offensiven PP auch beim Sofortsieg, wenn der tatsächliche getroffene Gegner mindestens PC-Level−2 hat. Ein starker Zuschauer genügt nicht. Defensive/Utility verlangen weiterhin eigene Wirksamkeit und echte Bedrohung. Ein Skill erhält pro Encounter höchstens einmal PP.

| Hauptdaten | Batch17, Originalstand .122 | Batch22, .146 |
|---|---|---|
| Warrior | L15; Cleave P1/54, Guard P1/0, Basic P1/36 | L2 gestorben, kein Langzeitvergleich |
| Mage | L15; Arcane Bolt P1/36, Wave P1/36 | L2 gestorben, kein Langzeitvergleich |
| Rogue | L13; Razor Cut P2/40, Fan P1/36 | L15; Piercing Thrust **P3/8**, Fan **P1/36**, Basic **P1/36** |

Batch17 wurde aus den gespeicherten Originalchats des Replaykorpus gefaltet. Sein enger Gegenangriffsgate für offensive PP wurde bereits in .123 gelockert; die alten Werte sind deshalb **kein Nachweis eines weiterhin identischen Bugs**. Batch22 prüft die neuere Regel tatsächlich: mehrere Sofortsiege geben korrekt18 PP.

Im Batch22 wurden alle21 Encounter am tatsächlichen Abschlusszustand geprüft: Piercing Thrust qualifiziert gegen seine **wirklich getroffenen Gegner** in nur **6 Kämpfen**; 6×18=108 PP erklärt exakt P3/8. Das Level steigt durch XP×5 und Gildenbelohnungen schneller als die Stufen derselben Population. Wiederholte L1-Wölfe geben sinnvollerweise kaum Skillwachstum; auch mehrere noch belohnte L4–7-Schlangen fallen aber schon aus dem Fenster.

Eine rein rechnerische Zählsonde auf **denselben aufgezeichneten Treffern** ergibt bei einem offensiven Fenster −4 statt −2 **13 statt6** geeignete Piercing-Thrust-Kämpfe. Dies ist keine neu simulierte Kampagne: Frühere stärkere Skills hätten spätere Entscheidungen/Schäden verändern können. Es zeigt den konkreten Gate-Effekt, nicht ein garantiertes neues Ergebnis.

Zweiter Engpass: `skill_growth.developmentEvents()` hängt weiterhin global an `fightQualifies()` einschließlich gegnerischen Angriffs. Das passt nicht zum bereits zugelassenen offensiven PP-Sofortsieg. Batch22 verwirft dadurch z. B. **vorhandene** Muster in `enc.t8` (Fan/closing), `enc.t48` und `enc.t53` (Thrust/closing), obwohl diese Angriffe qualifizierte PP verdienen. Es wurden nur drei `growth.noted`-Kämpfe gebucht. Keine Notwendigkeit, neue Muster aus Prosa zu erfinden – die Kampfrecords enthalten sie schon.

Zusätzlich fordert `skillEvidence()` **P5 und zwei weitere Kämpfe mit passendem Muster, die bereits bei P5 begonnen wurden**. Mit18 PP braucht C1 mindestens12, C2 mindestens17 und C3 mindestens23 qualifizierende Verwendungen bis P5; danach noch mindestens zwei passende Kämpfe. In einem Lauf mit21 Siegen ist eine C2-AoE-Evolution daher selbst bei häufiger Verwendung nicht selbstverständlich. Kaum genutzte Starter müssen nicht nebenbei meistern.

### Zielbild und empfohlener begrenzter Versuch

Eine tatsächlich häufig verwendete Hauptfähigkeit soll im F-Spiel mehrere Proficiency-Stufen und bei passenden Erfahrungen eine erste freiwillig anzunehmende Evolution erreichen können. Eine zusätzliche Technik soll durch reale Ausbildung/Quelle oder einen passenden Breakthrough erreichbar sein. **Nicht jede Starterfähigkeit muss bis L15 P5 haben; L15 löst keinen freien Skill aus.**

Empfohlener zusammenhängender Skill-Versuch nach Freigabe:

1. **Offensive PP-Fenster in F auf PC−4 erweitern**, weiter anhand tatsächlich getroffener Gegner. Im bestehenden Challenge-Abschnitt eine begrenzte offensive Einstellung verwenden, nicht den gemeinsamen −2-Wert global absenken: defensive LP-/Belegpfade und Passives dadurch nicht ungewollt ändern. PP-Basis12, Affinitäten und Promotionkosten zunächst beibehalten.
2. **Offensive Entwicklungsmuster an dieselbe belegte offensive Qualifikation binden.** Sofortsieg ist kein Ausschluss. Nur wirklich ausgeführte, geeignete Attacken und tatsächlich gespeicherte Muster zählen. Defensive Muster behalten ihre eigenen Wirksamkeitsbedingungen; Kombinationen müssen die relevanten Verwendungen belegen. `fightQualifies()` nicht pauschal für alle Lern-/Entwicklungsarten lockern.
3. **P5 behalten, aber zwei passende echte Musterbelege derselben Technik dürfen vor oder nach P5 entstanden sein.** Keine Pflicht, erst nach Meisterschaft nochmals einen geeigneten Gegner angreifen zu lassen. Verschiedene Encounter, bisherige kleine Belegablage, verbrauchte Belege, Nachfolgeridentität, Komplexitätsgrenze und ausdrückliche Annahme erhalten. Das ist eine ausdrückliche Änderung der bisherigen „zwei zusätzliche P5-Kämpfe“-Regel und braucht Nutzerentscheidung.

Dies belohnt zügige echte Siege und wiederkehrenden sinnvoll belegten Einsatz. Mehrere Warte-/Angriffsaktionen im selben harmlosen Encounter geben weiterhin kein zusätzliches PP; keine neue Farmzählung oder Pflicht, Schaden einzustecken. Risiken: mehr Mastery in etwas schwächeren F-Begegnungen und frühere stärkere Nachfolger. Deshalb zuerst Kosten/Wirkungen, XP und Levelkurve unverändert lassen und in einem nächsten freigegebenen Batch beobachten.

**Alternative:** Nur PP-Basis12→18 erhöhen (bei Affinität1,5 also27 statt18 PP) ist eine einfache Zahländerung, behebt aber weder ausgeschlossene Kämpfe noch verlorene Sofortsiegmuster. Die sechs Original-Thrust-Vergaben ergäben162 PP, immer noch nicht P5. Deshalb gegenüber dem obigen Versuch nachrangig; nicht gleichzeitig alle Stellschrauben erhöhen. Alternative P4-Evolution wäre noch schneller, schwächt aber die verständliche Bedeutung von P5 als Meisterschaft – nicht empfohlen.

### Lernen und Training nicht mit Evolution verwechseln

`growth.learningActivity()`/`dayClaim()` verlangen einen legitimen Lerngegenstand/Lehrer, gebuchte Zeit und Affinität. C1 braucht100 LP. Selbststudium10 LP/h, Unterricht20 LP/h; Tagescaps40/60 vor Affinität. Bekannte Skills können nach60 Minuten Praxis einmal am Spieltag12×Affinität PP erhalten. Reale Übung ist damit bereits eine Alternative zu verlängerten Kämpfen.

Rogue/Guard (Defense, Affinität1) hat zwei gebuchte Selbstlern-Sitzungen à120 Minuten: 2×20=40 LP. **Kein Capverlust** in diesen Sitzungen. Er kaufte später ein weiteres Manual, lernte aber nicht dadurch weitere60 LP. Ein Manual ist Quelle, kein sofortiger Erwerb. Guard wäre mit insgesamt10 Stunden Selbststudium über mindestens drei Spieltage oder fünf Stunden Unterricht über mindestens zwei Tage erreichbar. Unterschiedliche Affinitäten verändern diese Größen.

**Empfehlung: LP100 und Raten/Caps zunächst nicht absenken.** Vorhandenes Lernziel, Fortschritt, Quelle und nächste sinnvolle Übungsdauer über `goalText()`/`#skills` klar darstellen; vorhandene Lernvorhaben nicht als unbekannte neue Ware erscheinen lassen. Keine automatische Lernsitzung und kein pauschales Verbot eines zweiten Manuals: ein Spieler darf zusätzliche Bücher kaufen, sie ersetzen nur keinen Fortschritt. Erst wenn wirklich gewollte, korrekt gebuchte Lernhandlungen trotz dieses überschaubaren Aufwands unpraktisch bleiben, eine numerische Lernverkürzung beschließen. Keine übermäßige neue Runneranleitung als Ersatz für sichtbare Spielinformation.

## 5. Engine-Shops nach den positiven Handelsnachweisen

Batch22 widerlegt „Kaufen funktioniert nicht“: Rogue tätigt16 Käufe und11 Verkäufe; mehrere einzelne Gearupgrades und ein echter Zweiteilekauf funktionieren, ebenso Verkauf→Kauf im selben Input. Geldbilanz480 cp konsistent, keine systematische Doppelbuchung belegt. Deshalb bestehende `bookPurchase()`/`bookSale()` und Zustandsprüfungen beibehalten.

Trotzdem sehe ich **Standardshops als sinnvolleren langfristigen Weg**: Viele verlorene Inputs stammen vor der Buchung aus wechselnden freien Preisen, falschen Waren-/Händlerreferenzen und fehlenden Endpreisen. Ein Enginekatalog macht diese begrenzten Standardentscheidungen wiederholbar; der Narrator kann Persönlichkeit, Dialog, besondere Wünsche und Atmosphäre frei gestalten.

Die technische Ausgestaltung und offenen Einzelentscheidungen stehen bereits im [Engine-Shop-Fachplan](FACHPLAN_ENGINE_SHOPS.md), keine zweite Spezifikation hier. Für die Entscheidung nach Batch22 präzisieren:

- Für definierte reguläre F-Ausrüstung/Standardware **ein regulärer Engineweg**, kein automatischer „freie Extraktion misslang, also buchen“-Fallback und keine konkurrierenden Standardpreise.
- Kanonischer **betriebener Laden** als Handelspartner; Bedienpersonal bleibt eine echte unabhängige Person. Tatsächliche Ankunft und Verfügbarkeit erforderlich, kein Ladenverkauf aus Gerücht oder Vorschau.
- Vorhandene F-Gearpreise übernehmen. Standardloot-Ankauf benötigt ausdrücklich abgegrenzte Kategorien und noch freizugebende Preisregeln; erzählerische Schätzwerte nicht still als Ankaufspreise behandeln.
- Natürliche Sprache und bestehende Angebotsannahme weiter nutzen. Keine Pflicht, IDs abzuschreiben oder ein Menü zu bedienen. Eine echte Erstetablierung kann nicht schon vor ihrer Erzählung als fertiger Shop bekannt sein.
- Freie persönliche Geschenke, S1/#pay, Gildenvergütung und vorhandene Servicewege erhalten. Individuelle Sondergeschäfte bleiben fachlich abgegrenzt; der Standardshop darf sie nicht automatisch bewerten oder gegen fehlende Zustimmung abwickeln.
- **.147 beseitigt den nachgelagerten Auswahlfehler unabhängig vom Shopentwurf.** Ein Katalog ohne korrigierte Auswahl hätte denselben Dolch weiterhin verweigern können. Katalog, jeweilige Bestellung und ein einmaliger Kauf sind weiterhin verschiedene Dinge.

Kosten/Nachteile: ein mittlerer Fachpatch statt eines Zahlenfixes, weniger freie verbindliche Verhandlung bei Standardware, einmalige Festlegung wiederbestellbarer Artikel und realer Geschäftsidentität. Gewinn: weniger neues LLM-Preiswissen pro Einkauf, besser vorhersehbarer Gearfortschritt, vorhandene Buchungsintegrität bleibt. Nicht erforderlich, die gesamten Finanzen erneut umzubauen. Vor Umfangsfreigabe keine Shopimplementierung.

## 6. Noch erforderliche Nutzerentscheidungen und Abnahme späterer Designs

1. **AoE A, B oder C?** Empfehlung A, mit ausdrücklich möglichen NPC-/Gruppenangriffen und zunächst unveränderten Burst-/Umweltfolgen. Die heutige Friendly-Fire-Regel gilt bis zum Beschluss weiter.
2. **Gefahr öffentlich als gemeldete Levelspanne + Gesamtziel + bekannte Gruppeninformation zeigen?** Empfehlung ja; keine garantierte Soloeignung, geheimen Zahlen oder Prozent-Siegchancen.
3. **Skillversuch freigeben:** offensiv F−4, konsistente Sofortsiegmuster, zwei echte Belege vor/nach P5? Empfehlung ja als gemeinsames Paket bei unveränderten PP-Mengen/LP-/XP-Werten. Die frühere Pflicht zweier zusätzlicher P5-Kämpfe würde bewusst entfallen.
4. **Standardshops regulär freigeben?** Empfehlung ja als späteres eigenes Fachpaket; Umfang/Ankaufregeln aus dem verlinkten Plan vorher bestätigen. Positive freie Geschäfte sind ein Argument für Wiederverwendung, nicht gegen Vereinfachung ihrer unsicheren Vorbereitung.

Spätere Abnahme gezielt an Verhalten: Brenna-/Käfer-Original plus bewusste NPC-Attacken und NPC-AoE-Parität; Vertragsgesamtzahl versus tatsächliche Gruppe; Sofortsieg mit gespeichertem Muster versus triviales/unbenutztes Skill; LP aus echten Sitzungen; unveränderte Kampfzahlen/XP und wiederholte Saves. Keine große zusätzliche Architektur oder endlose Sammlung neuer englischer Beispielsätze.

**Messgrößen für den nächsten anschließend freizugebenden Naturbatch:** aktive Kämpfe/Quests bis L15 statt nur Gesamtinputs; PP-berechtigte Einsätze und Ablehnungsgrund pro Skill; echte Entwicklung/Lernabschlüsse; Inputs pro Geschäft; beabsichtigter/unbeabsichtigter NPC-Schaden; bestätigter abschließender Save. Provider-Ausreißer werden getrennt beobachtet, nicht als drittes Technikprojekt begonnen. Kein natürlicher Batch wurde für dieses Dokument gestartet.
