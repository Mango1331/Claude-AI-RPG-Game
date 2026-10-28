# Analyse A – Monsterökologie, Sapienz und ausführbare Besonderheiten (Ergebnis)

**Stand:** 28.10.2026 · **Auftrag:** [Analyseauftrag A](ANALYSEAUFTRAG_MONSTERDESIGN_20261028.md) · **Status:** unabhängige Recherche und Designanalyse, **keine Implementierung, keine Freigabe, kein neuer Kanon**. Der laufende natürliche Batch ist unberührt.

**Geprüfter Code:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, HEAD **`96fa3ed` (Build .109)**. Zeilenangaben beziehen sich auf diesen Stand. Historische Befunde aus dem [10B-Archiv §§5–8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#5-monster-lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse) (GPT-Audit, Sol-Gegenreview, Pfade M-A bis M-D) wurden **neu am Code geprüft**, nicht übernommen.

**Kennzeichnung:**
- **[CODE]** im .109-Code nachgelesen.
- **[QUELLE]** extern belegt; der Link steht in §9.
- **[EMPFEHLUNG]** eigener Vorschlag dieser Analyse.
- **[HYPOTHESE]** Spielgefühl-Annahme ohne Messung.

---

## 0. Kurzfazit

1. **Das Ankermodell ist tragfähig und entspricht einem anerkannten Designverfahren.** Pathfinder 2e empfiehlt ausdrücklich, ein neues Wesen aus vorhandenen Werten zu bauen, auch wenn es äußerlich nichts mit dem Original gemein hat: ein regenerierender Tausendfüßler auf Troll-Werten [QUELLE PF2-GMG]. Ein großes Bestiarium (M-A) ist nicht nötig.
2. **Die echten Lücken liegen nicht in der Zahl der Anker,** sondern an drei Übergängen.
   - **Körper → Beute:** Geweih ohne Geweih, Waffen, die nie getragen wurden.
   - **Art → Verhalten/Sapienz:** Ein sprechender Goblin kämpft als „nicht sapient“; als Person bekäme er menschliche Werte.
   - **Beschreibung → Mechanik:** Für Gegner gibt es keinen einzigen ausführbaren Statuseffekt, kein Element, keine Immunität.
3. **Neu gegenüber dem bisherigen Audit [CODE]:**
   - Die Geweih-Lücke besteht in .109 unverändert.
   - Humanoide Kreaturen werfen Waffen **unabhängig** davon ab, ob sie bewaffnet gezeigt wurden (Goblin-Messer 50 %, Oger-Keule 70 %).
   - Die Wiedererkennung einer Art verlangt dieselbe Art **und** denselben Anker; es gibt keine kampagnenweite Artkonsistenz.
   - Die alten Content-Texte Core #7/#8 versprechen Elite-/Boss-Fähigkeiten, die kein Code ausführt.
4. **Empfehlung: drei Pakete in dieser Reihenfolge.**
   - **A „Glaubwürdige Körper“:** M-D erweitert um eine kleine, aus vorhandenen Daten abgeleitete Artkonsistenz.
   - **C „Sapienz, Lage und Populationen“.**
   - **B „Ausführbare Signaturen und Bosse“,** erst nach Main/Minor und F→E-Scaling.

   M-C (schlanker Hybrid) bleibt die Langfristrichtung, aber **nur über Felder mit Verbraucher**.
5. **Nicht empfohlen:**
   - eine Ökosystemsimulation;
   - eine Moral- oder Temperamentzahl als Verhaltensskript;
   - ein LLM-generierter Statblock je Art;
   - die Nachbildung des Nemesis-Systems.

   Begründung jeweils in §3 und §5.

---

## 1. Methode und Quellenlage

- **Code:** gezielt gelesen.
  - `content/monsters.json`: Anker, Skalierung, Elite/Boss, Lootmatrix, Texte Core #7/#8.
  - `content/deltas.json`: `creature.new`, `intent`.
  - `src/content.js` `anchorFor`.
  - `src/v4/world.js`: `newEntity`, Aliaskorrektur, Gruppen, Identität.
  - `src/engine.js` `materialise`.
  - `src/npcgen.js` `scaleCreature`.
  - `src/v4/domain.js` `populationAt`.
  - `src/v4/guild.js`: Jagdpopulationen.
  - `src/v4/living.js`: Dungeon-Slots.
  - `src/v4/loot.js`.
  - `src/combat.js`: `creatureCombatant`, `npcDecide`, Creature-Aktion, Resistenzen.
  - `src/skills.js`: ausführbare Effektarten.
  - `src/hud.js`: Gegneranzeige.
  - Lorebook v0.14: Monster-Scaffolds.
- **Extern:** Primärquellen, wo verfügbar.
  - Pathfinder-2e-Regeltext: Paizo-Kapitel „Monster and Hazard Creation“ (Gamemastery Guide, Vorabfassung 2019), Archives of Nethys für Monster Core.
  - D&D: SRD 5.1 sowie die offizielle D&D-Beyond-Vorstellung des Monster Manual 2024.
  - Capcoms eigene Beschreibung von Monster Hunter Wilds (PlayStation Blog).
  - Fachliteratur: Mech 1999 zu Wolfsrudeln; Ydenberg & Dill 1986 zur Fluchtökonomie.
  - Entwickleraussagen: Booth zum Left-4-Dead-Director; Koster zur UO-Ökologie.
- **Grenzen:**
  - Für Monster Hunter liegen zu Teilezerstörung, Wunden und Belohnungsgruppen nur **Sekundärquellen** vor (Fan-Wikis, Guides). Das ist als solches markiert.
  - Der PF2-Text ist die Vorabfassung von 2019; die Remaster-Zahlen können abweichen. Die zitierten **Prinzipien** sind davon unberührt.
  - Die D&D-Basic/OSE-Moralregeln liegen nur über eine Sekundärquelle (The Alexandrian) vor.
- **Nicht getan:** kein Code, keine Content-Änderung, keine Testausführung, kein LLM-Lauf.

---

## 2. Ist-/Lückenmatrix

| Bereich | Befund (.109) | Einstufung |
|---|---|---|
| **19 Kampfanker** | Direktwerte HP/ATK/DEF/MDEF/INIT, **eine** natürliche Attacke (Name, `physical`/`magical`, `ENGAGED`/`MEDIUM`), Aliasliste, `temperament`; lineare Skalierung je Level, `stronger`-Variation, Elite/Boss nur als Multiplikatoren (`npcgen.js` `scaleCreature`) [CODE] | **vorhanden** |
| **Freie Art auf Anker** | `creature.new {species, anchor, desc, count, band, cluster, stronger, threat, more}`. Nennt der Artname ein Alias eines anderen Ankers, korrigiert die Engine (`world.js` `newEntity`, „restless skeleton“ → `skeleton`) [CODE] | **vorhanden** |
| **Level aus der Welt** | Dungeon: Etagenfenster je Rolle (`living.js`); Jagdort: `place.population {anchor, species, levels}` aus dem Gildenbrett (`guild.js`, F-Progression); sonst `danger`-Fakt oder Wildnis; Fallback L1 (`engine.js` `materialise`) [CODE] | **vorhanden**; Wirkung außerhalb von Jagdorten und Dungeons **zu prüfen**. Historischer Befund (Run 20, Balance-Doku 26.10.): alle 27 Weltkämpfe auf L1; ob die F-Progression ab .96 das ändert, zeigt erst ein natürlicher Lauf |
| **Hintergrundfauna** | Passive Herden als ein Fakt `background_fauna`; `threat: false` hält Nutztiere und Grasende aus Flächenangriffen heraus [CODE] | **vorhanden** |
| **Geweih-Beute** | `deer` liefert `{species} Antler` (0–2) **ohne** `only_if`; `goat`, `doe` und `roe` sind Aliase von `deer` → *Goat Antler*, *Doe Antler* weiterhin möglich [CODE] | **historisch nachgewiesen, in .109 unverändert** |
| **Phantomwaffen** | `goblin`: „Crude {species} Knife“ mit Chance 0,5, `ogre`: Keule 0,7 plus `{species} Tusk`, `goblin_shaman`: Fetisch 0,4, jeweils **ohne Bezug** zu gezeigter Bewaffnung. Der Kampf nutzt trotzdem nur die Ankerattacke („Natural/unarmed strike“). Die Ankernotiz „authored Gear may replace the attack“ hat **keinen Code** [CODE] | **wirkliche Lücke** |
| **Artkonsistenz** | Wiedererkennung und Gruppenauflösung verlangen gleiche `species` **und** gleichen Anker. Dieselbe frei erfundene Art kann beim nächsten Mal einen anderen Anker erhalten (andere Werte, andere Beute) [CODE] | **wirkliche Lücke** (klein); Häufigkeit in Runs **zu messen** |
| **Sapienz im Kampf** | `creatureCombatant`: `sapient: false` fest. Auf dem C-Pfad bewirkt `sapient` Zurückhaltung ohne Feindschaft sowie Deckung bei Beschuss [CODE] | **historisch nachgewiesen, bestätigt** |
| **Sapienz als Person** | `person.new` eines Goblin-Häuptlings erhält eine menschliche Ruleset-2-Vorlage nach Rollenwort, sonst `commoner` mit menschlicher Basis 5 [CODE] | **wirkliche Lücke** (zweiter, ebenfalls falscher Weg) |
| **Soziale Deltas an Kreaturen** | `attitude`, `learn` und `memory` laufen über allgemeine Referenzen; Kreaturen zählen zu den Anwesenden [CODE] | nach Code **möglich**, live **nicht verifiziert** |
| **Verhalten im Kampf** | C-Pfad: `temperament` = `null`. Flucht, Kapitulation, Parley, Halten und Deckung kommen nur aus einem **erzählten** `intent`; eine einmal begonnene Flucht wird fortgesetzt; One-Roll-Chase vorhanden [CODE] | **vorhanden**, dem Kanon entsprechend; Lagewirkung ist **[HYPOTHESE]** |
| **Spezialfähigkeiten** | Ausführbare Effektarten (`skills.js`): nur `temp_def`, `temp_mdef`, `barrier`, Schadensminderung, `next_attack_buff`, `reposition`, `extra_band`, `area` (am Zaubernden), `heal`, `restore`. **Keine** Wirkung auf Gegner (kein Gift, keine Brennwirkung, kein Stun oder Slow), keine Elemente, keine Immunität. Kreaturen haben **gar keinen** Skillpfad [CODE] | **wirkliche Lücke** |
| **Resistenzen** | nur `physical`/`magical` in Prozent aus PC-Passives; Kreaturen nur über DEF/MDEF [CODE] | **teilweise** |
| **Flug** | `raptor`-Notiz: Flug ist ökologischer Zugang, **keine** zusätzliche Bandbewegung [CODE] | **bewusste Grenze**, ehrlich dokumentiert |
| **Elite/Boss** | nur Zahlen; Dungeon-Boss = Art der tiefsten Ebene mit Titel. Content-Text Core #8: „An Elite may gain one explicit defining … Trait“. Dieser und Core #7 (`fauna_text`) werden in `src/` **nicht referenziert** [CODE] | **Lücke** zwischen Text und Engine; ob der Text den Narrator noch erreicht, **zu prüfen** |
| **Gefahrenerkennung** | HUD zeigt Gegnername, HP und Band, **nicht** Level oder Rang (`hud.js`) [CODE] | **Designfrage** |
| **Lore-Gerüste** | Lorebook v0.14: „MONSTER SPECIES GENERATION BODY“ (Körperplan, Habitat, Nahrung, Verhalten, Druck, 1–2 Anpassungen, Verhältnis zu Menschen) und „SAPIENT MONSTER SOCIETIES“ [CODE] | **vorhanden**, nur narrativ |
| **Ökologie** (Aktivitätszeit, Revier, Nahrung) | nicht mechanisch; nur Narration | **[HYPOTHESE]**: nur dort mechanisch fassen, wo ein Spieler entscheidet |

---

## 3. Vergleich externer Designansätze

Bewusst unterschiedliche Ansätze. Was belegt ist, steht getrennt von der Übertragung auf Avereth.

### 3.1 Pathfinder 2e – Wesen von oben nach unten bauen, Stärken und Schwächen als Spielinhalt

- **Belegt [QUELLE PF2-GMG]:**
  - Vier Schritte: Konzept und Roadmap → Statblock → Fähigkeiten → Reality Check.
  - **Reskin-Prinzip:** „It might not look very much like a troll on the surface, but the statistics for a troll are going to get you most or all the way there.“
  - Roadmaps wie *brute*, *skirmisher*, *sniper*, *soldier* und *spellcaster* als Ausgangsprofile.
  - „Most creatures should have at least one low statistic“; Moderate-Werte sollen großzügig verwendet werden („Use this one liberally!“).
  - „The strengths and weaknesses of a creature change the PCs’ strategies … and that’s what makes playing the game fun!“
  - Schwächen: „greatly rewards effective player tactics once your players identify the weakness … Creatures typically don’t have more than one weakness.“ Breite Resistenzen bedeuten weniger HP.
  - Komplexität: Bei fünf gleichen Gegnern zugleich „avoid complex special actions“.
  - „Avoid giving your creature skill abilities that won’t matter in its interactions with PCs.“
  - Elite/Weak [QUELLE AoN]: Level ±1, Werte ±2, HP nach Stufe; „work best with creatures that focus on physical combat“; nicht mehrfach anwenden.
  - Recall Knowledge [QUELLE Roll20-PF2]: Spieler können Wissen über ein Wesen erwerben, ein kritischer Fehlschlag liefert falsches Wissen.
- **Wirkung:** Wenige Werte und eine klar erkennbare Stärke oder Schwäche erzeugen Taktik. Identifikation ist ein eigener Spielschritt.
- **Nachteil:** Werte werden von Hand austariert; Fähigkeiten-Kataloge setzen eine Spielleitung voraus.
- **Passung zu Avereth:** **hoch.**
  - Die 19 Anker sind de facto Roadmaps mit festen Zahlen.
  - Das Reskin-Prinzip bestätigt „freie Art auf Anker“.
  - Die Regel „eine Schwäche, dafür mehr HP; breite Resistenz, dafür weniger HP“ ist direkt als Budgetregel für Paket B nutzbar.
  - „Nur Fähigkeiten, die im Spiel zählen“ ist dasselbe wie „kein Feld ohne Verbraucher“.

### 3.2 D&D 5e/2024 – aufladbare Signaturangriffe, Sonderaktionen für Solo-Gegner, ehrliche Ausrüstung

- **Belegt [QUELLE SRD/DDB]:**
  - Drachenatem „Breath Weapons (Recharge 5–6)“: Ein starker Angriff steht nur zufällig wieder zur Verfügung.
  - Legendary Actions (3, jeweils am Ende eines fremden Zuges), Legendary Resistance (3/Tag), Damage Immunities.
  - Wolf: *Pack Tactics* (Vorteil, wenn ein Verbündeter neben dem Ziel steht), Biss mit möglichem Umwerfen, *Keen Hearing and Smell*.
  - Monster Manual 2024: **Habitat**- und **Treasure**-Zeilen sowie eine neue **Gear**-Zeile: „highlights notable, non-treasure items they carry“. Immunitäten gegen Schadensarten und Zustände stehen zusammen. Kämpfe im Hort geben Boni und mehr XP.
- **Wirkung:**
  - Recharge macht einen großen Angriff zum Ereignis statt zur Dauerrotation.
  - Legendary Actions geben einem einzelnen Boss genug Aktionen gegen eine Gruppe.
  - Gear und Treasure trennen „was es trägt“ von „was es hortet“.
- **Nachteil:**
  - Legendary Actions sind für eine Heldengruppe gebaut. Alaric kämpft allein, ein Boss mit drei Zusatzaktionen wäre gegen einen Einzelspieler überproportional.
  - Recharge-Würfel ohne Ankündigung sind für den Spieler nicht lesbar.
- **Passung zu Avereth:**
  - **Recharge plus Ankündigung: hoch.**
  - **Gear-Prinzip: hoch.** Es löst die Phantomwaffen direkt.
  - **Habitat-Zeile: hoch** als Populationsangabe.
  - **Legendary Actions: niedrig.** Sie widersprechen dem geplanten Main/Minor-Budget (gleiches Bewegungsbudget für PC, NPCs und Kreaturen) und dem Einzelspieler.

### 3.3 Monster Hunter – Verhalten, Körper und Lebensraum als eine sichtbare Einheit

- **Belegt (Capcom über den PlayStation Blog) [QUELLE MHWilds-PSB]:**
  - „Every locale, monster, and person acts with their own thoughts and motivations, combining dynamically …“
  - „Monsters and organisms will change and adapt according to changes in the environment.“
  - Herden und Rudel, Focus Mode zielt auf Schwachpunkte.
- **Belegt (Sekundärquellen) [QUELLE MH-sek.]:**
  - Gebiete wechseln zwischen Brachzeit (Fallow), Unwetter (Inclemency) und Überfluss (Plenty); das Apex-Monster eines Gebiets erscheint nur bei Unwetter.
  - Belohnungen kommen aus Zielbelohnung, Ausweiden, **zerbrochenen Körperteilen** und **Wunden**.
  - Ein zerbrochener Teil schwächt das Monster und nimmt ihm teils Angriffe.
  - Revierkämpfe (Turf Wars) zwischen Monstern.
- **Wirkung:**
  - Die Beute folgt dem Körper: Wer den Schwanz abtrennt, bekommt Schwanzmaterial.
  - Verhalten verrät Zustand und Ort.
  - Die Welt erklärt, warum ein Monster gerade hier ist.
- **Nachteil:**
  - Echtzeit-Teilezerstörung und räumliche Trefferzonen gibt es in einem Text-RPG mit Bandmodell nicht.
  - Jahreszeitensysteme sind aufwendig.
  - Revierkämpfe ohne Spielerentscheidung sind reine Zuschauerszenen.
- **Passung zu Avereth:**
  - **Prinzip „Beute = vorhandene Körperteile“: hoch.**
  - **Gebiet erklärt Begegnung: hoch.**
  - Teilezerstörung höchstens als **ein** angekündigter Schwachpunkt-Zustand bei Bossen (Paket B).
  - Jahreszeiten und Revierkämpfe: **niedrig**; höchstens als Erzählanlass.

### 3.4 Simulation – Dwarf Fortress und Ultima Online

- **Belegt [QUELLE DF-Wiki]:**
  - Körper bestehen aus Körperteilen; Schlachten liefert genau diese Teile.
  - Was ein Wesen nicht hat, fällt nicht an: ohne Haar kein Faden.
  - Chitin lässt sich nicht gerben.
  - Prozedurale „Forgotten Beasts“ haben zufällige Form und Material.
- **Belegt [QUELLE Koster, Ars Technica/Garriott]:**
  - Die UO-Ökologie-KI wurde in der Beta abgeschaltet, laut Koster aus **Performancegründen** („radial searches followed by pathfinding“). Der Zusammenbruch der Bestände ging auf eine geschlossene Ressourcenschleife zurück.
  - Laut Garriott sahen die meisten Spieler die Ökologie nie. Koster widerspricht Details seiner Darstellung.
- **Wirkung:** Die Simulation erzeugt absolut stimmige Beute und Welt.
- **Nachteil:** Sie ist teuer, für Spieler oft unsichtbar und mit Spielerökonomie schwer zu balancieren.
- **Passung zu Avereth:**
  - **DF-Prinzip für Beute: hoch**, aber über ein kleines geschlossenes Vokabular, nicht über Gewebeschichten.
  - **Simulation: abzulehnen.** Der Kanon schließt eine „vollständige NPC-Welten-/Agentensimulation“ ohnehin aus (02 §10).

### 3.5 Nemesis-System – persistente Individuen in einer Hierarchie

- **Belegt [QUELLE GDC/Presse]:**
  - Benannte Ork-Hauptleute haben Stärken, Schwächen und Furcht.
  - Sie erinnern sich an frühere Begegnungen („You burned me“) und steigen nach Siegen über den Spieler auf.
  - WB besitzt das US-Patent **10,926,179** (erteilt 23.02.2021) auf Teile des Systems.
- **Passung zu Avereth:**
  - Das Ziel „ein sapienter Anführer erinnert sich und hat eine Geschichte“ deckt Avereth über vorhandene NPC-Erinnerung, Beziehungen und Fakten ab (§3b im Ideenkatalog).
  - **Keine Nachbildung** des Hierarchie- und Aufstiegssystems. Das ist unnötig und rechtlich nicht prüfenswert für ein Hobbyprojekt.

### 3.6 Verhalten ohne Temperamentskript – Moral, Fluchtökonomie, Pacing

- **Belegt [QUELLE Alexandrian/B-X]:** In den alten D&D-Basisregeln (B/X) wird Moral **zu bestimmten Ereignissen** geprüft: erster Tod einer Seite, Hälfte kampfunfähig. Wer zweimal besteht, kämpft bis zum Ende.
- **Belegt [QUELLE Ydenberg & Dill 1986]:** Beutetiere fliehen, wenn die erwarteten Kosten des Bleibens die des Fliehens erreichen. Die Fluchtdistanz wächst mit dem Risiko und sinkt mit den Fluchtkosten.
- **Belegt [QUELLE Booth]:** Der Left-4-Dead-Director plant einen neuen Angriff, wenn es ruhig wird, und lässt nach langen Kämpfen Ruhe.
- **Belegt [QUELLE Mech 1999]:** Ein Wolfsrudel ist typischerweise eine **Familie** mit Arbeitsteilung der Eltern, kein Kampf um „Alpha“-Rang.
- **Passung zu Avereth:**
  - Der Kanon verbietet ein festes Temperament als Skript, verlangt aber kausale Flucht und Kapitulation (02 §5).
  - Ereignisgebundene **Lageanlässe** (Verluste, Anführer gefallen, Junge bedroht, Fluchtweg frei) sind kausal und passen.
  - Eine feste Moralzahl je Art wäre ein verkapptes Temperament. Siehe §6, Paket C2.

### 3.7 Bosse als Ablauf – MCDM *Flee, Mortals!*

- **Belegt [QUELLE DDB/MCDM]:** „Villain Actions“ sind je Kampf **einmal** in fester Reihenfolge nutzbar und geben dem Kampf eine Struktur. Gedacht für Solo- und Anführer-Rollen.
- **Passung zu Avereth:** **mittel.**
  - Ein Boss mit 1–2 einmaligen, angekündigten Phasenereignissen bei festen HP-Schwellen wird interessant, ohne Zahlenaufblähung.
  - Ob ein solches Ereignis eine Zusatzaktion außerhalb des eigenen Zuges sein darf, kollidiert mit Main/Minor. Das ist eine **Nutzerentscheidung**; ohne sie: Phase statt Zusatzaktion.

### 3.8 Biologie als Prüfstein für Beute

- Geweihe bestehen ganz aus Knochen und werden jährlich abgeworfen. Hörner haben einen Knochenkern, sind dauerhaft und mit Keratin überzogen [QUELLE Britannica, AMNH].
- Unter den Hirschen tragen nur bei den Rentieren auch die Weibchen Geweih [QUELLE AMNH].
- Folgen:
  - **Hase, Hirschkuh und Ziege tragen kein Geweih.**
  - Die Ziege trägt Horn.
  - Ein Hirsch trägt je nach Jahreszeit eines (Abwurf im Spätwinter). Das ist für Avereth als Detail vernachlässigbar, aber ein gutes Beispiel dafür, warum „im Zweifel kein Spezialorgan“ die sichere Regel ist.

---

## 4. Durchgearbeitete Fallbeispiele

Je Fall: Welt und Lore · Engine heute [CODE] · Engine mit den Paketen [EMPFEHLUNG] · zulässige Beute · Spielerentscheidungen · nötige Daten.

### 4.1 Hase, Hirschkuh, Ziege – Anatomie

- **Welt:** scheue Wildtiere nahe Siedlungen, F1–F3; Ziege auch als Nutztier.
- **Heute:**
  - `hare` ist kein Alias. Der Extractor wählt einen Anker, historisch `deer`.
  - `doe` und `goat` sind `deer`-Aliase.
  - Die Beute enthält `{species} Antler` 0–2 → *Hare/Doe/Goat Antler*.
  - Im Kampf entscheidet nur der erzählte `flee`-Intent.
- **Mit Paket A:**
  - Spezialorgane nur mit Beleg: Geweih nur bei Hirsch, Bock, Elch, Rentier oder ausdrücklich „antler“; Horn als eigenes Material mit Beleg (Ziege, Widder, Steinbock, Rind).
  - Hase auf den kleinsten passenden Anker (`rat`, „small vermin“). Zahlen und Beute (Fell, *Hare Tail*) passen dort ohnehin besser als auf `deer`.
- **Zulässige Beute:**
  - Hase: Fell, ggf. Schwanz.
  - Hirschkuh: Haut.
  - Ziege: Haut, Horn bei Beleg.
  - Hirsch: Haut, Geweih bei Beleg.
- **Spielerentscheidungen:** jagen (Fernkampf, einmalige Verfolgung), ignorieren, Nutztier in Ruhe lassen (`threat: false`).
- **Daten:** nur das vorhandene `only_if` je Material plus ein neues Material `horn`. **Kein neues Feld.**

### 4.2 Wolf und Rudel – Verhalten

- **Welt:** Familienrudel (Eltern und Nachwuchs, Mech 1999) mit Revier; meiden in der Regel Menschen, gefährlich in Not oder an der Höhle.
- **Heute:**
  - `wolf`-Anker, Gruppe kämpft gemeinsam (02 §5).
  - Flucht nur per Intent.
  - Beute: Fell, Reißzahn.
  - Rudelgröße und Ort sind reine Erzählung, außer an Jagdorten des Gildenbretts (`place.population`).
- **Mit Paket C:**
  - Eine **Population des Gebiets** (Art, Anker, Levelspanne, Gruppengröße, Aktivität) gilt ab der ersten Begegnung im Wald dauerhaft: dieselben Wölfe, nicht jedes Mal neue.
  - **Lageanlass:** Fallen die Elterntiere oder die Hälfte des Rudels, erhält der Narrator einen Engine-Hinweis, dass ein Rudel in dieser Lage typischerweise abbricht. Gebucht wird nur ein erzählter `flee`-Intent.
- **Mit Paket B (optional):** Rudeltaktik als **eine** Signatur: kleiner Schadensbonus, wenn ein zweiter Wolf am selben Ziel ENGAGED ist (wie D&D Pack Tactics, aber Prozent statt Vorteil).
- **Beute:** unverändert.
- **Spielerentscheidungen:** Engstelle suchen, Elterntier zuerst angreifen, die Höhle meiden, Rückzug.
- **Daten:**
  - `place.population` existiert bereits; nur die Felder Gruppengröße und Aktivität kämen hinzu (Verbraucher: Materialisierung, Kontextzeile).
  - Lageanlass ohne neues Feld, abgeleitet aus dem Kampfzustand.

### 4.3 Goblin und Schamane – Sapienz und Ausrüstung

- **Welt:** sapiente Monster, eigene Kultur (Mossback Warrens), nicht automatisch feindlich, handeln, verhandeln, ergeben sich.
- **Heute:**
  - `goblin` (unbewaffneter Schlag) bzw. `goblin_shaman` (Hex Bolt, MEDIUM).
  - Im Kampf `sapient: false`: keine Zurückhaltung ohne Feindschaft, keine Deckung bei Beschuss.
  - Beute: Messer mit 50 %, **auch ohne gezeigte Waffe**.
  - Als `person.new` bekäme der Häuptling eine menschliche Vorlage (Basis 5).
- **Mit Paket A:**
  - Waffenbeute **nur** bei gezeigter Bewaffnung, über das vorhandene `weaponFamily(content, desc)`.
  - Der Beutegegenstand heißt wie die gezeigte Waffe.
  - Optional ersetzt die gezeigte Waffe den Angriffsnamen (die bestehende Ankernotiz wird damit eingelöst).
- **Mit Paket C:**
  - `sapient` nur mit Beleg: Sprache, Werkzeug, Organisation; Goblin-Anker als Standardfall.
  - Folgen im Kampf über den **vorhandenen** C-Pfad (Zurückhaltung, Deckung).
  - Parley und Kapitulation per Intent wie bisher.
  - Soziale Deltas (`attitude`, `learn`) stehen nach Code bereits offen.
- **Beute:** getragene Waffe, kleiner Beutel, Fetisch nur bei Beleg.
- **Spielerentscheidungen:** verhandeln, einschüchtern, den Schamanen zuerst angreifen, Gefangene nehmen, Handel.
- **Daten:**
  - `sapient` als **ein** optionales Feld an `creature.new` mit Verbrauchern `creatureCombatant` und Beute.
  - Keine menschliche Vorlage für sapiente Monster.

### 4.4 Drakonisches Wesen (Ashen Scale Dominion) – Flug und Feuer

- **Welt:** drakonische und beschuppte Blutlinien, Feuer- und Gebirgsarten. Ältere sind sapient und politisch; ein junger, nicht sapienter Wyrm ist ein Raubtier.
- **Heute:**
  - **Kein passender Anker:** `armored_beast` (Panzer), `serpent` (Biss) oder `raptor` (Flug ohne Mechanik).
  - Erzählt der Narrator Feueratem, gibt es keinen Rechenweg. Das Ergebnis ist ein körperlicher Biss mit dem Text „Feuer“, also genau die Täuschung, die der Auftrag ausschließt.
- **Mit Paket B:**
  - **Feueratem** als Recharge-Signatur: ein Zug Ankündigung („die Kehle glüht“), dann ein Bereichsangriff. Gegenmittel: Deckung, Abstand, Schutzzauber.
  - Wiederaufladung deterministisch über den Seed.
  - **Eine** Resistenz (Feuer) nach der PF2-Regel mit weniger HP.
  - **Flug** als Positionsregel: im Flug nur im Fernkampf erreichbar; nach eigenem Sturzangriff ENGAGED.
- **Mit Paket C:** Ein sapienter Alter ist Teil des Dominion-Wissens. Tötung hat politische Folgen über die vorhandenen Fakten und Fraktionen.
- **Beute:** Schuppenplatten, Zahn; **Feuerdrüse nur bei gebuchtem Atem**. Es gilt dieselbe Regel für Beute und Kampf.
- **Spielerentscheidungen:** Deckung beim Ankündigen, Fernkampf gegen Flieger, Rückzug, Parley.
- **Daten:**
  - eine Signaturliste am fixierten Profil (Verbraucher: `combat.js`);
  - ein Elementtag an Angriffen (Verbraucher: Resistenzprüfung).
  - **Das ist das teuerste Beispiel.** Es zeigt, warum Paket B nach Main/Minor kommt.

### 4.5 Waldgeist (Verdant Fang Court) – Magie und Interaktion

- **Welt:** Waldgeister als Mitglieder des Court; Territorien, Pakte, Opfergaben, ökologische Pflichten.
- **Heute:**
  - `spirit`-Anker (magische Entladung MEDIUM, MDEF 5).
  - **Nicht** automatisch körperlos (bewusst, Sol §6.6).
  - Beute: Essenz 0–1.
- **Mit Paket C:**
  - sapient mit Beleg;
  - Haltung und Wissen über vorhandene Deltas;
  - Gaben über die vorhandenen Übergaben.
- **Mit Paket B (optional):** Resistenz gegen physischen Schaden nach PF2-Regel (dafür weniger HP) und eine Schwäche (z. B. gegen Eisen oder Feuer). Eine Schwäche, deutlich angekündigt, wenn Wissen vorhanden ist.
- **Beute:** Essenz nur bei Vernichtung. Weltfolge: Fraktionsfakt beim Court.
- **Spielerentscheidungen:** Pakt, Umweg, Gabe, Kampf mit Magie.
- **Daten:** wie 4.3 und 4.4; kein eigenes Geistersystem.

### 4.6 Generative Einmalart – „Glasrücken-Sumpfpirscher“

- **Welt:** frei erfundene Sumpfart nach dem Lorebook-Gerüst (Habitat Moor, Nahrung Amphibien, Anpassung: lichtbrechender Rückenpanzer).
- **Heute:**
  - `creature.new {species: "glassback marsh stalker", anchor: "arthropod"}`.
  - Beim nächsten Mal kann der Extractor `armored_beast` wählen: andere Werte, andere Beute, keine Wiedererkennung.
  - Giftdrüse nur, wenn „venom/sting“ im Text steht.
- **Mit Paket A:** **Artkonsistenz aus vorhandenen Entitäten.** Der erste materialisierte Pirscher legt den Anker der Art in dieser Kampagne fest; spätere `creature.new` derselben Art erhalten ihn (wie die bestehende Aliaskorrektur).
- **Mit Paket C:**
  - Population des Moors (Art, Spanne, Gruppengröße) ab der ersten Begegnung.
  - Ein besonders großes Exemplar über das vorhandene `stronger`.
  - Elite nur durch Vorgabe.
- **Beute:** Chitinplatten; Giftdrüse nur mit Beleg; kein Glas-Spezialmaterial ohne eigenen Materialeintrag.
- **Spielerentscheidungen:** Wissen sammeln (Gilde, Jäger), Vorbereitung, das Revier meiden.
- **Daten:** **kein neues Speicherfeld** für die Artkonsistenz (Abfrage über bestehende Entitäten). Die Population nutzt `place.population`.

---

## 5. M-D gegen M-C – Minimalweg und Gegenalternativen

| Pfad | Kern | Datenstruktur | Neues Feld mit Verbraucher? | Urteil |
|---|---|---|---|---|
| **M-D Minimalfix** (Archiv) | Spezialbeute nur mit Beleg, Aliasfehler korrigieren | vorhandenes `only_if`, Aliasliste | nein | **richtig, aber zu eng.** Lässt Phantomwaffen und Artkonsistenz offen |
| **M-D+ (Empfehlung, Paket A)** | M-D plus Waffenbeute nur bei gezeigter Bewaffnung (`weaponFamily` auf `desc`), Horn als eigenes Material, Artkonsistenz per Abfrage, Content-Versprechen angleichen | `only_if`, `weaponFamily`, bestehende Entitäten | nein | **empfohlener erster Schritt**: behebt alle nachgewiesenen Beutefehler ohne Balanceeingriff |
| **M-C schlanker Hybrid** (Archiv) | wenige optionale Eigenschaften an konkreten Verbrauchern | Entität, Profil | ja, je Eigenschaft | **richtige Langfristrichtung.** Wird hier in Paket C (`sapient`, Populationsfelder) und Paket B (Signaturen) zerlegt, jeweils mit benanntem Verbraucher |
| **M-E Artkarte als eigenes Event** (Gegenalternative) | Bei der ersten Sichtung einer Art bucht die Engine einen Artdatensatz (Anker, Körperteile aus geschlossenem Vokabular, `sapient`, Signaturen); alle Exemplare lesen ihn | neues Event `species.established` | ja (Loot, Kampf, Wiedererkennung, Kontext) | **ernsthafte Alternative.** **Pro:** eine Quelle für alles Artbezogene, beste Konsistenz, sauberes Replay. **Contra:** neue Pflichtstruktur, der Extractor muss Körperteile melden, Fehlbuchung beim ersten Mal bleibt dauerhaft, Migrationsfrage für alte Kampagnen. **Sinnvoll erst**, wenn Paket B Signaturen braucht, die je Art und nicht je Exemplar gelten |
| **M-F LLM-Statblock je Art** | Das LLM entwirft Werte und Fähigkeiten, die Engine prüft Grenzen | neue Statblöcke | ja | **abzulehnen.** Balance je Art und zweite Wahrheit; widerspricht „narration does not invent stats“ |
| **M-A / M-B** (Archiv) | großes Bestiarium bzw. weniger Anker | – | – | **weiterhin abzulehnen** (§3.1: Reskin genügt; weniger Anker verschärfen die Beutefehler) |

**Begründeter Minimalweg:**
1. **M-D+ zuerst.**
2. **M-C nur feldweise,** wenn ein Verbraucher feststeht.
3. **M-E** bleibt die vorbereitete Option für den Moment, in dem Signaturen artweit gelten sollen.

**Unnötige Komplexität wäre:**
- Temperament-, Ernährungs- oder Ökologiefelder ohne Verbraucher.
- Körperteile als Gewebeschichten nach dem Vorbild von Dwarf Fortress.
- Eine eigene Speziesdatenbank neben Entitäten und Events.

**Grenzfall „unbekannte Anatomie“ [EMPFEHLUNG]:** **Grundertrag ja, Spezialbeute nein.**
- Der erste, allgemeine Ankerstoff (Fell, Haut, Schuppe, Chitin, Knochen, Gel, Essenz) bleibt.
- Jedes Spezialorgan (Geweih, Horn, Hauer, Giftdrüse, Feuerdrüse, Kern) braucht einen positiven Beleg aus Art, Beschreibung, Angriff oder gebuchter Signatur.
- **Begründung:**
  - Ganz ohne Ertrag wäre es ein spürbarer Strafeffekt für kreative Arten (vgl. Monster Hunter: Ausweiden liefert immer etwas).
  - Spezialorgane ohne Beleg sind genau der nachgewiesene Fehler (Dwarf-Fortress-Prinzip: nur vorhandene Teile).
- Alte Spielstände sind nicht betroffen, weil Beute erst am Kampfende entsteht.

---

## 6. Designpakete (höchstens drei, priorisiert)

### Paket A – „Glaubwürdige Körper“: Anatomie, Ausrüstung, Artkonsistenz · **Priorität 1**

- **Inhalt:**
  - **A1:** Spezialorgane nur mit Beleg (Geweih, Hauer am `ogre`, Horn neu, Kern bei `slime` prüfen); Hase-Zuordnung (Alias im passenden Anker).
  - **A2:** Waffen- und Fetischbeute humanoider Kreaturen nur bei gezeigter Bewaffnung, Name nach der gezeigten Waffe.
  - **A3:** Artkonsistenz je Kampagne: Gleicher normalisierter Artname bekommt den Anker des ersten materialisierten Exemplars, solange kein Alias dagegen spricht.
  - **A4:** Content-Ehrlichkeit. Core-#7/#8-Texte, die nicht ausgeführte Elite/Boss-Traits versprechen, angleichen oder als „nicht ausgeführt“ kennzeichnen. Prüfen, ob sie den Narrator überhaupt erreichen.
- **Nutzen:** beseitigt alle nachgewiesenen Beutefehler; stabile Arten; keine Balanceänderung.
- **Risiken:**
  - Falsch-negative Belege: ein „Hirsch“ ohne das Wort Geweih liefert keines. Das ist bewusst die sichere Seite.
  - Regex-Belege sind wortbasiert.
  - Der seltene Fall zweier verschiedener Arten mit gleichem Namen.
- **Abhängigkeiten:** keine harten. Materialwerte bleiben Sache des F→E-Scalings; Dungeon-Slots legen Art und Anker schon fest.
- **Spätere Tests:**
  - **Positiv:** Hirsch mit Geweih liefert Geweih; Viper liefert Giftbeutel (Kontrolle); Goblin „mit rostigem Speer“ liefert einen Speer; zweiter Pirscher erhält denselben Anker.
  - **Negativ:** Hase, Hirschkuh und Ziege ohne Geweih (Ziege mit Horn nur bei Beleg); unbewaffneter Goblin ohne Messer; Oger ohne Hauer im Text ohne Hauer.
  - **Weitere:** Replay identisch; alte Kampagne unverändert.

### Paket C – „Sapienz, Lage und Populationen“ · **Priorität 2**

- **Inhalt:**
  - **C1:** Optionales `sapient` an `creature.new`, nur mit Beleg (Sprache, Werkzeug, Organisation). Verbraucher:
    - `creatureCombatant`, das den vorhandenen sapienten C-Pfad freischaltet (Zurückhaltung ohne Feindschaft, Deckung bei Beschuss);
    - die Beute (Beutel);
    - der Kontext (NPC-Karte).

    Sapiente Monster behalten die Ankerwerte und erhalten **keine** menschliche Vorlage.
  - **C2:** **Lageanlässe statt Moralzahl.** Bei ersten Verlusten, halber Gruppe, gefallenem Anführer, bedrohter Brut oder freiem Fluchtweg nennt die Engine dem Narrator die Lage. Gebucht wird nur ein erzählter Intent (der vorhandene Weg). Kein Würfel, kein Temperament.
  - **C3:** **Populationen ohne Simulation.** `place.population`, heute nur an Jagdorten, wird auch an Wildnis- und Höhlenorten angelegt, sobald dort erstmals eine Art erscheint (oder aus Brett und Lore).
    - Neue Felder nur mit Verbraucher: Gruppengröße (Materialisierung), Aktivität Tag/Nacht/immer (Kontextzeile, später ROAD AHEAD und Rast-Gefahr aus §6a des Ideenkatalogs).
    - Bestände ändern sich nur durch Events (Erlegen, Räumung), nicht durch Nahrungsketten.
  - **C4:** Sapiente Anführer als wiederkehrende Personen über die vorhandene NPC-Erinnerung (§3b). Kein Nemesis-Nachbau.
- **Nutzen:**
  - Sprechende Monster verhalten sich auch im Kampf als Personen.
  - Gebiete bekommen wiedererkennbare Bewohner.
  - Das L1-Problem außerhalb von Jagdorten wird über echte Gebietsbestände statt über Spielerlevel angegangen.
  - Flucht und Kapitulation entstehen aus der Lage.
- **Risiken:**
  - `sapient` als Fehlbuchung bei Tieren: Beleg verlangen; eine negative Gegenprobe ist Pflicht.
  - C2 verändert die Erzählhäufigkeit von Fluchten. Ein häufiger Abbruch kann Kämpfe entwerten, deshalb messen.
  - C3 berührt das Scaling; die Levelspannen der Bestände gehören in den F→E-Plan.
- **Abhängigkeiten:** Chase (Fluchtfolgen über den vorhandenen One-Roll-Pfad), F→E-Scaling (Levelspannen), Ideenkatalog §6a (Rast-Gefahr nutzt die Populationen).
- **Spätere Tests:**
  - Ein sprechender Goblin, nicht feindlich und unverletzt, hält zurück oder sucht Deckung.
  - Ein Wildschwein bleibt aggressiv (negative Gegenprobe gegen versehentliche Sapienz).
  - Wolfsrudel nach Fall beider Eltern: Lagehinweis erscheint, Flucht nur bei erzähltem Intent, keine Schleife.
  - Dieselbe Waldpopulation bei der zweiten Begegnung; nach dem Erlegen kleiner.
  - Kapitulation gibt keine XP (Kontrolle).

### Paket B – „Ausführbare Signaturen und Bosse“ · **Priorität 3, erst nach Main/Minor und F→E-Scaling**

- **Inhalt:**
  - **B1:** Kleiner, geschlossener Baukasten für Kreatursignaturen, fixiert im Profil bei der Materialisierung. Normales Wesen 0, Elite höchstens 1, Boss höchstens 2–3.
    - **Gift/Blutung** als Schaden über Zeit: N Züge, abbrechbar durch Heilung oder Gegenmittel.
    - **Aufgeladener Signaturangriff** mit **einem Zug Ankündigung** und deterministischer Wiederaufladung (Atem, Spucke, Stampfer).
    - **Eine Resistenz oder Schwäche** gegen einen Element- bzw. Schadenstag. Budget nach PF2: Resistenz bedeutet weniger HP, Schwäche mehr HP; höchstens eine Schwäche.
    - **Flug** als Positionsregel.
    - **Rudeltaktik** als kleiner Bonus bei gemeinsamem Ziel.
  - **B2:** **Beute und Kampf aus derselben Evidenz.** Was den Giftbeutel begründet, begründet auch den Giftbiss; ohne gebuchte Signatur kein Spezialorgan.
  - **B3:** **Bosse als Ablauf statt Zahl.**
    - 1–2 einmalige Phasenereignisse an HP-Schwellen: Ruf nach Artgenossen aus der Population bzw. dem Slot; Umgebungsgefahr über die vorhandenen `hazard`-Features; ein angekündigter Schwachpunkt nach dem Signaturangriff.
    - Rückzug in den Hort bei niedrigen HP (wie das Humpeln in Monster Hunter).
    - **Keine** zusätzlichen Aktionen außerhalb des Zuges ohne Nutzerentscheidung.
  - **B4:** **Gefahrenerkennung:** Wissen über eine Art (Gilde, Jäger, eigenes `learn`) zeigt Signatur, Resistenz oder Schwäche im Kontext. Optional zeigt der HUD den Rang, nicht das Level.
- **Nutzen:** Gegner unterscheiden sich spürbar über Entscheidungen (Deckung, Distanz, Element, Zielwahl) statt über Zahlen; erzählte Besonderheiten werden ehrlich.
- **Risiken:**
  - Größter Balanceeingriff der drei Pakete; F-Rang-Spieler haben heute kein Gegenmittel und keine Element-Skills.
  - Der Extractor müsste Signaturen kennen.
  - Narrator-Übertreibung bleibt ein Restrisiko.
  - Neue Gegnereffekte am PC (`current.effects` existiert, wird aber nur für eigene Buffs genutzt).
- **Abhängigkeiten:** **Main/Minor** (Aktionsbudget, Bewegung, Flug), **F→E-Scaling** (Wirkungsgrößen, E-Rang), Chase (Flug und Flucht), Living Dungeons (Bosse und Slots), Skill-Aspekte und -Tags für Elemente.
- **Spätere Tests:**
  - Viper vergiftet und hinterlässt einen Giftbeutel; Natter ohne Giftbeleg tut beides nicht.
  - Atem wird angekündigt, Deckung wirkt, Wiederaufladung ist im Replay identisch.
  - Feuerresistenter Wyrm verliert gegen Frost normal.
  - Boss-Phase genau einmal.
  - Kein Wesen erhält Zusatzaktionen über das Budget hinaus.
  - Ein Flieger ist nach seinem Sturzangriff ENGAGED.

**Warum diese Reihenfolge:**
- A ist billig, behebt nachgewiesene Fehler und schafft mit der Artkonsistenz die Grundlage, an die B später Signaturen hängt.
- C macht die Welt glaubwürdiger, ohne Zahlenbalance zu berühren (außer den Levelspannen, die ohnehin im Scaling liegen).
- B bringt die größte Kampfvielfalt, aber auch das größte Risiko und hängt an zwei offenen Plänen.

**Gegenposition:** Wer Kampfvielfalt vor Glaubwürdigkeit stellt, kann aus B einen ersten Schnitt (Gift plus angekündigter Atem) direkt nach Main/Minor vorziehen. Das ist eine Nutzerentscheidung.

---

## 7. Offene Nutzerentscheidungen

1. **Unbekannte Anatomie:** „Grundertrag ja, Spezialbeute nein“ (Empfehlung) oder „gar keine Beute ohne Beleg“?
2. **Hase und ähnliche Kleintiere:** dem nächstkleinen Anker zuordnen (Empfehlung `rat`) oder einen neuen Kleinwild-Anker schaffen? Ein neuer Anker ist nur nötig, wenn Zahlen oder Beute dort falsch wären.
3. **Sapiente Monster:** Ankerwerte plus `sapient` (Empfehlung) oder eigene, nicht menschliche Personvorlagen je Monsterkultur?
4. **Lageanlässe:** reiner Hinweis an den Narrator (Empfehlung) oder eine deterministische Engine-Entscheidung bei bestimmten Lagen? Das Zweite ist näher an einem Temperament und mit 02 §5 abzuwägen.
5. **Bosse:** nur Phasenereignisse im eigenen Zug (Empfehlung) oder echte Zusatzaktionen außerhalb des Zuges als ausdrückliche Ausnahme von Main/Minor?
6. **Paket B früher?** Erster Schnitt (Gift plus Atem) direkt nach Main/Minor oder erst nach dem F→E-Scaling?
7. **Gefahrenanzeige:** Rang im HUD zeigen oder Gefahr nur über Wissen und Erzählung vermitteln?
8. **M-E Artkarte:** bewusst offenhalten, bis artweite Signaturen gebraucht werden (Empfehlung), oder früher als Fundament anlegen?

---

## 8. Abgrenzung

- Kein neuer Kanon. Paket- und Feldnamen sind Arbeitsbegriffe.
- Keine Implementierung, keine Content- oder Regeländerung, keine Tests, kein Batch.
- Keine neuen klassischen Fantasyvölker (Elfen, Zwerge, Orks). Drakonische Linien und Waldgeister bleiben Monsterwelt.
- Kein PC-Level-Autoscaling, keine Temperamentmaschine, keine zweite Wahrheitsquelle, keine Ökosystem- oder Agentensimulation (02 §10).
- Chase/Flee: nur dort berührt, wo es den Monsterentwurf betrifft; kein zweites Chase-System.

---

## 9. Quellen

**Avereth (Code .109 und Dokumente):**
- [`content/monsters.json`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/content/monsters.json)
- [`src/v4/loot.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/v4/loot.js)
- [`src/combat.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/combat.js)
- [`src/skills.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/skills.js)
- [`src/engine.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/engine.js)
- [`src/v4/world.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/v4/world.js)
- [`src/v4/living.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/v4/living.js)
- [`src/v4/guild.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/src/v4/guild.js)
- [`content/deltas.json`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/content/deltas.json)
- [Lorebook v0.14](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96fa3ed0e9750066e20ebd94c532f7bde310b3bf/avereth-engine/lorebook/Avereth_World_Lore_v0.14.json)
- [10B-Archiv §§5–8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#5-monster-lore-audit-von-chatgpt--rekonstruierte-vollständige-analyse)
- [02 Designkanon](../02_DESIGN_KANON.md)
- [F→E-Scaling GPT](../testrun_10b/scaling_gpt.md)
- [Sols F→E-Entwurf](../testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md)
- [Balance-Beobachtungen](../testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md)

**Pathfinder 2e:**
- **[PF2-GMG]** Paizo, *Gamemastery Guide – Monster and Hazard Creation* (Vorabkapitel 2019): [PDF](https://downloads.paizo.com/PZOCUP024E_PathfinderGameMasteryGuide_MonsterHazardCreation_PF2E.pdf)
- **[AoN]** Elite/Weak (Monster Core): [Rules ID 3262](https://2e.aonprd.com/Rules.aspx?ID=3262), [Elite](https://2e.aonprd.com/MonsterTemplates.aspx?ID=22)
- **[Roll20-PF2]** [Recall Knowledge](https://roll20.net/compendium/pf2/Recall%20Knowledge%20(Untrained))

**D&D:**
- **[SRD]** SRD 5.1: [Bronze Dragon](https://dnd-srd-sphinx.readthedocs.io/en/latest/monster/bronze-dragon.html), [Wolf](https://dnd-srd-sphinx.readthedocs.io/en/latest/creature/wolf.html)
- **[DDB]** D&D Beyond: [Preview: new stat block design (2024)](https://www.dndbeyond.com/posts/1890-preview-the-new-stat-block-design-in-the-2024), [What’s new in the 2024 Monster Manual](https://www.dndbeyond.com/posts/1888-whats-new-in-the-2024-monster-manual), [MCDM *Flee, Mortals!*](https://www.dndbeyond.com/posts/1725-upgrade-your-encounters-with-mcdms-flee-mortals)
- **[Alexandrian/B-X]** Moralregeln: [The Alexandrian](https://thealexandrian.net/?p=2477)

**Monster Hunter:**
- **[MHWilds-PSB]** Capcom über den PlayStation Blog: [State of Play – Gameplay-Details](https://blog.playstation.com/?p=392343)
- **[MH-sek.]** Sekundärquellen: [Gamereactor – Wetter/Jahreszeiten](https://www.gamereactor.eu/monster-hunter-wilds-all-weather-conditions-and-how-to-change-it-1505913/), [Icy Veins – Apex bei Unwetter](https://www.icy-veins.com/monster-hunter-wilds/news/how-to-master-monster-hunter-wilds-dynamic-weather/), [Mobalytics – Wunden](https://mobalytics.gg/mhw/guides/wounds-explained), [Steam – Belohnungsgruppen](https://steamcommunity.com/app/2246340/discussions/0/596268332586404418), [Fextralife – Teilezerstörung](https://monsterhunterworld.wiki.fextralife.com/Tips), [Deltia – Turf Wars](https://deltiasgaming.com/?p=85880)

**Simulation und persistente Individuen:**
- **[DF-Wiki]** [Butcher](https://dwarffortresswiki.org/index.php/Butcher), [Skin](https://dwarffortresswiki.org/Skin), [Forgotten beast](https://dwarffortresswiki.org/index.php/Forgotten_beast)
- **[Koster]** [Did players destroy the UO ecology?](https://www.raphkoster.com/?p=46439); Garriott-Darstellung: [Ars Technica War Stories (Bericht)](https://gametyrant.com/news/ultima-online-spent-3-years-developing-systems-that-were-destroyed-by-players)
- **[GDC/Presse]** Nemesis-System: [GDC Vault – Hoge, „Helping Players Hate (or Love) Their Nemesis“](https://www.gdcvault.com/play/1025150/contactUs), [Patent US 10,926,179 (Bericht)](https://www.patentarcade.com/2021/02/warner-brothers-granted-patent-for-nemesis-system-from-middle-earth-video-games.html)

**Pacing:**
- **[Booth]** Left-4-Dead-Director: [Game*Spark-Interview (2007)](https://www.gamespark.jp/article/2007/04/10/11866.html)

**Biologie und Verhalten:**
- **[Mech 1999]** *Alpha status, dominance, and division of labor in wolf packs*, Can. J. Zool. 77: [USGS](https://pubs.usgs.gov/publication/1001725), [PDF wolf.org](https://www.wolf.org/wp-content/uploads/2013/09/267alphastatus_english.pdf)
- **[Ydenberg & Dill 1986]** *The economics of fleeing from predators*, Adv. Study Behav. 16, zitiert und erläutert in [Cooper & Blumstein 2014](https://sites.lifesci.ucla.edu/eeb-blumstein/wp-content/uploads/sites/104/2017/08/CooperBlumstein_2014_BehavEcol.pdf)
- **[Britannica, AMNH]** [Britannica – Antler](https://www.britannica.com/science/antler), [AMNH – Horns and antlers](https://www.amnh.org/explore/news-blogs/news-posts/horns-and-antlers-what-s-the-difference)
