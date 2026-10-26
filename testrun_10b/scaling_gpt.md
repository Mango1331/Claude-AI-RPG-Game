# Avereth Engine – unabhängige F→E-Scaling-Studie (GPT)

> **Entwurfsstand 26.10.2026 · rein konzeptionell · NICHT IMPLEMENTIERT · KEIN DESIGNBESCHLUSS · KEIN PATCHAUFTRAG.**
>
> Eigenständige Prüfung als Vergleichsbasis für Sols separat entstehende Scaling-Untersuchung. Absichtlich keine Übernahme von Sols Scaling-Vorschlägen. Zahlenempfehlungen mit **[VORSCHLAG]**, gesicherte Code-/Content-Fakten mit **[IST]**, Vermutungen mit **[HYPOTHESE]** gekennzeichnet. Alte Run-Eindrücke und Balancenotizen liefern Beobachtungen, **keine Regeln**.
>
> **Quellenstand:** Repo [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game), Dokumentation auf `main`; Engine-Stand [`681c2b4` / Build `4.3.0-c.6.6.95`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/681c2b4f6a85a30b2dba4357cd621f483ed42be5) auf `claude/c-planner-prototype-2026-10-02-gpt-c666`. Primär gelesen: `content/{rules,monsters,npc_templates,gear,classes,lore}.json`, `src/{npcgen,derived,progression,skills,skill_composer,combat,engine}.js`, `src/v4/{world,items,guild,living,dungeon,loot,growth,skill_growth,class_growth,settlement,commands}.js`, [Design-Kanon ``5–8](../02_DESIGN_KANON.md), [10B-Journal](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [Run-20-Review](20261026-063907Z-current_test/REVIEW.md) und [bisherige Balance-Ersteindrücke](BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md). Keine neue automatisierte Simulation, kein neues Replay, keine Testausführung und keine Codeänderung.

## 0. Meine Hauptthese

**Das System muss nicht erst „von Level 1 auf E programmiert“ werden: Viele Formeln existieren bereits über das gesamte F-/E-Levelband. Es fehlen vor allem _erreichbare, verlässlich zusammenhängende Angebotsketten_ von Weltgefahr → Gegnerlevel → Questlevel → XP/Beute → Händlerauswahl → Ausrüstung/Skills → neue Herausforderungen.**

Die Welt soll **nicht den Spieler hochskalieren**. Ein Level-1-Wolf bleibt Level 1. Ein Level-12-Wolf ist **eine andere, vorab begründete Population/Variante desselben Ankers**, ein Level-20-Wolf in einem E-Gefahrengebiet möglich, aber keine heimlich verstärkte Begegnung, die nach Alarics Aufstieg mutiert. Gleiches gilt für menschliche NPCs. Spieler können Warnungen beachten, gezielt trainieren, einfachere Aufträge farmen, gefährlichere Orte aufsuchen, fliehen, handeln oder scheitern.

**Mein bevorzugter Minimalansatz:** F nicht nach Unterrängen fragmentieren, sondern mit ein paar **an Orten/Verträgen festen Level-Gefahrenfenstern** ausgestalten; erst danach E-Gebiete, Proven-Aufträge, E-Händlerware und qualifizierte E-Technikquellen aktivieren. Zahlen nicht pauschal buffen, sondern Zuweisungs-/Erreichbarkeitslücken schließen.

## 1. Verbindlicher Rahmen und aktuelle Lücken

| Thema | **[IST] im Content/Code** | Das noch nicht gelöste F→E-Problem |
|---|---|---|
| Power Rank | F = **L1–14**, E = **L15–29**, D = L30–44 usw. (`rules.ranks.bands`) | E-Klassengrenze existiert, aber die Welt stellt vorher kaum stärkere Inhalte bereit |
| Spieler | Ruleset 2: Basiswerte **7**, zwei Favored Stats **8**; Levelaufstieg +5 frei und +1 in den beiden Favored Stats; XP ×2 | Levelkurve wächst, verfügbare Gegner/Jobs/Upgrades bleiben oft bei Novice-L1 |
| Monster | 19 Anker; lineare HP/ATK/DEF/MDEF/INIT-Steigerung je Level; Elite/Boss-Modifikatoren | Außerhalb Dungeons fällt unbekannte Gefahr häufig auf L1 zurück |
| NPC-Menschen | Eigene Basis **5**; +5 freie Punkte/Level, Favored Growth; trainierte NPCs nutzen Starter-Skills, ab L5 eine individuelle Signaturtechnik | Übliche Templates enden größtenteils L3–8; „Adventurer“ reicht bis L14, E-Profis bislang kaum vorgedacht |
| Gilde | Novice 1–14 und Proven 15–29, fünf erledigte Aufträge + entsprechender Power Rank für Beförderung | Run 20: 35/35 Boardangebote L1–3; spätere F-Aufgaben kaum sichtbar |
| Dungeons | F/E-Ränge, Etagen, Slots Minion/Guard/Boss, deterministische Levelspannen und Respawns | Wie ein Spieler andere F-/E-Dungeons findet, wie je Etage sinnvolle Gefahrenfenster entstehen und E-Bosse aussehen |
| Equipment | F-Referenzen, Qualitätsstufen, E-Rang-Faktor `1.75`, E-Einsatzbeschränkung, feste Itemprofile | Starter-R2-Waffen bereits F-sup.; höherwertige Ware, echte Preise, sichtbarer Vorher/Nachher-Nutzen im Handel |
| Skills/Spells | F-C1–C3 + **vorläufige E-C1–C3-Kalibrierung**; Proficiency und dynamische Evolution | Standardlehre/-Composer erlaubt **nur F**, E-Content hat keinen normalen zugänglichen Lernpfad |
| Klassenentwicklung | E-Klassenauswahl ab L15 mit Normal/Rare-Trait implementiert | Kein Ersatz für E-Skill-, Ausrüstungs-, Gegner- und Weltprogression |
| Wirtschaft | 1 Silber = 10 Kupfer, 1 Gold = 100 Kupfer; Gear-/Itempreis-Richtwerte; Guild-Payout-Guides | Richtwerte sind **keine autoritativen Angebote**; realer Händler kann für identische Werte extrem verschiedene Preise nennen |

**Wichtig:** Ruleset 1 bleibt unverändert. Neue Vorschläge betreffen ausschließlich die noch zu entwerfende F-/E-Progression für Ruleset 2, sofern später freigegeben.

## 2. Levelkurve des Spielers: Zahlen nicht voreilig ersetzen

**[IST]** Benötigte XP zum nächsten Level = `100 × aktuelles Level`; aufsummiert von L1 bis L15 **10.500 XP**, von L15 bis L30 zusätzlich **33.000 XP**. Kampf- und Gilden-XP werden seit Build .67 nach bestehender Basisrundung verdoppelt. Keine Sofortvollheilung durch Level-up. Skill-PP ist **nicht** dasselbe wie XP: Nur qualifizierende Kämpfe zählen, in der Regel nur wenn ein Gegner höchstens zwei Level unter dem Spieler lag und aktiv angegriffen hat.

| Bereich | XP für das jeweilige nächste Level | Bedeutung |
|---|---:|---|
| L1→2 | 100 | Einstieg bewusst flott |
| L5→6 | 500 | Erste merkliche Progressionssteigung |
| L8→9 | 800 | Im Run 20 werden oft noch L1-Gegner besiegt |
| L14→15 | 1.400 | Hohe F-Abschlussanforderung, bevor E-Optionen freigeschaltet werden |
| L15→16 | 1.500 | E beginnt ohne automatisch neue XP-Regel |
| L29→30 | 2.900 | Langfristiges E-Ende (noch keine natürliche Abnahme) |

**[HYPOTHESE]** Die aktuelle ×2-XP-Wahl ist nicht das Hauptproblem. Der L8-Mage in Run 20 bekam 3.124 XP in 252 Inputs, davon 1.636 Kampf-XP und 1.488 für zehn Gildenquests; 27 Nicht-Dungeon-Encounters waren nur L1. Ein höherer Gegnerlevel und sinnvoll höheres Questlevel erhöhen XP bereits ohne neue globale Multiplikatoren. Der beobachtete Dungeonblock war vergleichsweise XP-produktiv.

**[VORSCHLAG]** Bis ein normaler F-Mittel-/Spätspiel-Lauf mit passenden L5–14-Kontrakten und Gegnern existiert, **keine** neue XP-Tabelle, keine Kill-Farm-Strafe, keinen automatischen Level-Sprung und keinen verpflichtenden „L15 nach X Turns“-Benchmark. Die echte Zahl produktiver Abenteuerhandlungen ist aus den bisherigen 252 Inputs nicht exakt zu extrahieren, solange freiwillige Reise/Handel/Soziales und gescheiterte Engineaktionen nicht begründet klassifiziert werden.

## 3. F-Rang horizontal UND vertikal ausgestalten (L1–14)

**Kein neuer offizieller „F1/F2/F3“-Power-Rang.** Intern sind einige Gefahr-/Angebotsfenster nützlich, aber sie sollten nicht als Charakterklassen, starrer Storyfortschritt oder versteckte Ausrüstungs-Tiers verkauft werden.

| **[VORSCHLAG] Gefahr-Fenster** | Typische Herkunft | Spielinhalt/Grund |
|---|---|---|
| **F-Einstieg L1–3** | befestigte Wege, Höfe, nahe Wildnis, frühe Guild-Jagden | Einzeltier/kleine Gruppe, niedrige Kosten, Startspiel |
| **F-entwickelt L4–7** | entlegenere Waldgebiete, Grenzstraßen, alte Lager, Banditenrouten | koordinierte Gegner, erstmals bedeutsamer Gear-/Skillbedarf |
| **F-anspruchsvoll L8–11** | abgelegene Jagdreviere, gefährliche Ruinen, erfahrene Bande, tiefere F-Etagen | stärkere Gegner mit klarer Rückzugsoption, Elite/Wächter möglich |
| **F-Oberband L12–14** | seltenere F-Schauplätze, riskante grenznahe Wildnis, starke F-Bosse | Vorbereitung auf L15, keine E-Freigabe vorzeitig |
| **E-Einstieg L15–19** | etablierte E-Territorien, E-Dungeons, organisierte E-Feindverbände | neue Rank-Ausrüstung und Techniken möglich |
| **E-Mitte L20–24 / E-Hoch L25–29** | schwerere E-Gebiete und Etagen, glaubwürdig seltenere Gegner | nicht alles in E sofort bei L15, neue Quell-/Gear-Qualitäten |

Diese Stufen sind **Orientierungsbereiche**, keine Gleichsetzungsregel „PC L8 → Gegner L8“. Eine Figur darf mit L20 zurück zur L1-Hasejagd; dort wächst weder XP noch PP magisch an. Umgekehrt kann vor L15 ein warnend beschriebenes E-Gebiet existieren, auch wenn der Besuch fahrlässig wäre.

### 3.1 Ortsgebundene Gefahr, minimale technische Umsetzungsidee

**[IST]** `monsters.level_selection` kennt `settled 1–1`, `wilderness 1–3`, `deep_wilderness 4–7`, `hunting_territory 1–14`, `unknown 1–1`. `npcgen.chooseCreatureLevel()` nutzt exakt das gewählte Band, sonst `unknown`. In `engine.materialise()` geht ein vorhandenes Dungeon-Level-Fenster vor; außerhalb entscheidet Ortskontext/gebuchte Gefahr. Im Run 20 waren alle **27** Nicht-Dungeon-Kämpfe L1. **Eine Quest-Empfehlung L8 allein erzeugt noch keinen L8-Mob.**

**[VORSCHLAG]** Ein bereits vorhandener Ort/ein begrenztes Revier kann einen **einmal festgestellten Gefahrbereich** samt Quelle und Bekanntheitsgrad besitzen: z. B. `danger {rank:F,levels:[6,9],source:'scouts',known:'reported'}`; Schema und Storageweg sind lediglich Illustration. Keine zweiten parallel verwalteten Welt-Fakten, keine automatischen Nachkalibrierungen. In bestehender `place`-/`fact`-/Dungeon-Authority andocken; zuerst genau prüfen, ob `place.danger`, `place.where`, Ortsvererbung und `scene.location` dasselbe bedeuten. Die festgelegte Gefahr muss bis zum `creature.new`-/Materialisierungsweg gelangen, sonst bleibt trotz schönem LLM-Text alles L1.

**Erzeugungspriorität, konzeptionell:** 1. bereits gespeicherter individueller Level/Statblock; 2. Living-Dungeon-Slot/Etagenfenster; 3. bereits **weltseitig** etablierter lokaler/territorialer Gefahrenbereich; 4. glaubwürdiger Standard für klar bekannte Siedlungsnähe/gewöhnliche Wildnis; 5. vorsichtiger L1-Fallback bei wirklich unbekanntem Kontext. Quest- oder Spielerlevel sind **nicht** stillschweigend die fünfte Ersatzquelle.

**Spieler-Wissen:** Vor einem gefährlichen Gebiet Möglichkeit zu Information durch Guild-Board, Spuren, Bewohner, Karte, Gerüchte, Ausrüstung oder Sichtkontakt. Ein solcher Hinweis ist **kein sicherer exakter Levelscanner**. Wenn eine Quest ausdrücklich nach gefährlichem Revier verlangt, muss die Information zu diesem Revier konsistent sein. Reise in gefährliches Gebiet darf weiterhin eine freie Entscheidung sein.

**Enges Interface statt Großarchitektur:** Gefahr an kanonischem Gebiet/Ort fixieren und nur dort erzeugen. Die 19 bestehenden Kampfanker erhalten freie Artennamen und werden weiterhin **nicht** zum vollständigen Artenkatalog umgebaut. Eine Quest darf ein bereits existierendes gefährliches Gebiet referenzieren, nicht durch jedes Vorlesen eines Notices die Welt retroaktiv hochskalieren.

### 3.2 Welt und Gegnerarten: keine erzwungene Hochstufung gewöhnlicher Tiere

- Häufige Wölfe, Rat/Fauna und einfache Goblins bleiben als schwache Formen plausibel; höherstufige Formen benötigen glaubwürdige ökologische/soziale Erklärung: alte Rudelalpha-Tiere, besonders wehrhafte Tiere, magische Verformung, jahrzehntelang gefährliches Habitat, Elitewächter, trainierte humanoide Gegner.
- **Artenfamilie ≠ Levelband:** Ein Name kann innerhalb F/E mehrere Profile tragen. Nicht jedes „Level-18-Rat“ muss ein riesiges mutiertes Nagetier sein. Ein identischer gewöhnlicher Feldhase sollte nicht plötzlich E-Stärke erhalten; E-Fauna gezielt plausibel benennen und auffindbar machen.
- Magische, fliegende, giftige, verfluchende oder soziale Besonderheiten dürfen **nicht** nur als Namens-Dekoration erscheinen, wenn der Text dem Spieler reale mechanische Folgen verspricht. Die jetzigen Anker skalieren zunächst Grundangriff, Resistenz/Stats und Temperament, **keine neuen Monsterfähigkeiten**. Größere neue Wirkungsfamilien als **separaten späteren Mechanikentwurf** prüfen.
- Intelligente Monster mit Kultur und Ausrüstung sind nicht automatisch menschliche NPCs; aber tatsächlich getragene Ausrüstung, Verhalten und Beute dürfen sich nicht widersprechen. Anatomisch falsches Loot (historischer Hasen-Geweih-Fall) nicht durch eine neue Vollspecies-Datenbank lösen.

## 4. Monster: tatsächlich vorhandene Formeln bis E und Grenzen

**[IST]** Für Anchor-Level-1-Werte `H1,A1,D1,M1,I1` und `g=L−1`:

- `HP=round(H1×(1+0.20g))`
- `ATK=round(A1×(1+0.22g))`
- `DEF=max(0,round((D1+1)×(1+0.20g)−1))`; MDEF analog
- `INIT=round(I1×(1+0.05g))`
- individuelle `strong`-Variation ca. +20 % HP/ATK, +1 DEF/MDEF, +2 Initiative; nur bei begründetem Körper-/Konditionsbefund
- `elite` anschließend **HP×1.75, ATK×1.15, DEF/MDEF×1.1, INIT+2**; `boss` **HP×2.5, ATK×1.3, DEF/MDEF×1.2, INIT+3**.

**Beispielwerte normale Gegner, keine Variation, gerundet:**

| Mechanischer Anker | L1 HP/ATK | L7 | L14 (F-Spitze) | L15 (E-Beginn) | L20 (E) | L29 (E-Spitze) |
|---|---:|---:|---:|---:|---:|---:|
| Wolf | 23 / 9 | 51 / 21 | 83 / 35 | 87 / 37 | 110 / 47 | 152 / 64 |
| Goblin | 45 / 11 | 99 / 26 | 162 / 42 | 171 / 45 | 216 / 57 | 297 / 79 |
| Skeleton | 30 / 10 | 66 / 23 | 108 / 39 | 114 / 41 | 144 / 52 | 198 / 72 |
| Ogre | 90 / 18 | 198 / 42 | 324 / 69 | 342 / 73 | 432 / 93 | 594 / 129 |

**Interpretation:** L14→L15 ist **kein sprunghafter numerischer Power-Knick** bei Monstern, sondern ein sanfter kontinuierlicher Übergang. Boss/Elite und Gruppen sind dagegen starke diskrete Schwierigkeitsfaktoren. Ein E-Boss kann auch bei gleicher Species deutlich schwerer sein als mehrere F-Normalgegner. **Nicht** einfach 5 E-Monster gleichzeitig auf L15 setzen und „E-Mitte“ nennen. Das Kombinieren von Gruppenaktionszahl, hohen Angriffsformeln, Buff-/Crowd-Control und HP braucht Simulation.

**[VORSCHLAG] Zwei unabhängige Achsen beibehalten:** (A) Level/Rank = individueller Grundpower, (B) Encounter-Typ normal/elite/boss = besondere Rolle. Gruppengröße ist eine **dritte** Achse. Geografisch hohe Level ersetzen nicht taktische Vielfalt. Die natürliche Gruppe von sechs Rooks (23 HP Rest) und fünf Goblins (1 HP Rest) zeigt bereits, wie stark Gruppe und Ressourcenkosten wirken. Nicht alle Gegnergruppen im F-Hochband automatisch vergrößern.

**Wichtige offene Designs:** F1-/F14-/E15-Einzelgegner und 2er-, 3er-, 5er-Gruppen gegen Warrior/Mage/Rogue; zu früher One-Shot; Initiativ-/Ambush-Vorteile; problematische hochdefensive Gegner; überstarke Fern-AoEs; Heilpausen und Flucht. Erst fair vergleichen, **dann** die Koeffizienten verändern. Kein Monster-HP- oder ATK-Multiplikator zusätzlich zum vorhandenen Level- und Elite-/Boss-Scaling ohne Befund.

## 5. Dungeons: F→E-Etagen modellierbar, aber Levelspan-Design prüfen

**[IST]** Living Dungeons fixieren Rank-Bänder, Etagen, wichtige Slots, Teams, Gates, Clears und Resets. `living.spansFor` verteilt bei F allein (L1–14) grob folgende Rollenbereiche:

| Nur F | Minion | Guard/Elite | Boss |
|---|---|---|---|
| Etage eines F-Bands | L1–5 | L4–8 | L5–9 |

Für reine E-Etagen (L15–29) ergeben sich:

| Nur E | Minion | Guard/Elite | Boss |
|---|---|---|---|
| Etage eines E-Bands | L15–19 | L18–22 | L20–24 |

**Achtung:** Diese Rollenformel **nutzt nicht automatisch den gesamten Rang bis L14 oder L29**. Das ist bisher keine nachgewiesene Fehlfunktion: Rollen sind absichtlich nur Teilbänder. Eine gemischte Einordnung F–E könnte allerdings bis zu 29 Level Breite einbeziehen und entsprechend andere Spannen erzeugen. Vor neuer Scalinglogik tatsächliche Klassifikation pro Dungeon-Etage und vorab festgelegte Slots prüfen.

**[VORSCHLAG]** Bei wirklich gefährlicheren Etagen **pro Etage** sinnvoll zunehmende oder als ausdrücklich unterschiedlich festgelegte feste Levelbereiche erlauben. Eine späte F-Etage mit Normalen L9–12 und Boss L13–14; frühe E-Etage mit Normalen L15–18 und Boss L19–21; E-Hochgebiet ggf. L24–29. Diese Beispiele sind **Zielbilder**, nicht aus dem momentanen `spansFor` automatisch verfügbare Zahlen. Dungeonrank ≠ automatisch passende Stärke sämtlicher Etagen; verschiedene Dungeons dürfen komplett verschieden sein.

**Welt- und Zugangsrisiko:** Dungeons bleiben gemeinsame Weltorte; mehrere Gruppen können sie betreten und Kämpfe erledigen. Zugangseinschränkungen/Gebühren gehören zum spezifischen Dungeon; Gilde besitzt nicht alle Dungeons. Kein mit dem Spielerlevel mitspringendes Reset. E-Dungeon-Rewards und Return Stones sollten an echten E-/Boss-Level und gebuchte Loot-/Clear-Ereignisse geknüpft sein, nicht an frei erzählte Schatztruhen. **Engine-owned** Warnungen/Slotbeschreibung müssen E-Risiko vermitteln, damit „zu tief“ eine bewusste Entscheidung ist.

## 6. NPCs und menschliche Gegner – der zweite starke Content-Gap

**[IST]** Ruleset-2-Menschen nutzen `npc_templates.json:ruleset_2`; ihre Grundwerte sind **5**, anders als die neuen Spieler-Startwerte **7**. Über die Level bekommen sie +5 frei auf Prioritätsstats, plus Favored-Growth, ermittelt mit `humanSheet/rulesetTwoSheet`. Nichttrainierte Bürger haben keine automatisch erfundenen Skills; trainierte Kämpfer Basic Attack und zwei Starter-Skills; trainierte NPCs ab Level 5 eine individuelle Signaturtechnik (vor dem Kampf fixiert). Die vorhandenen **Default-Templates sind überwiegend niedrig**: Commoner L1–3, Laborer L1–4, Hunter L1–5, Guard L2–8, Bandit L1–6, Hedge Mage L1–6; Adventurer L1–14.

**Daraus folgt nicht:** Jeder erfahrene NPC ist unzulässig, jeder menschliche Gegner müsse bei Level 8 enden oder jeder NPC braucht eine feste Klasse. Aber der normale Generator **hat zu wenige glaubwürdige E-Human-Profile und Quellen**.

**[VORSCHLAG]** Der humanSheet-/Sheet-Bau sollte über **rollenbezogene, einmal festgelegte Levelkontexte** auch L15–29 bedienen: erfahrene Guild-Adventurer, Veteranen kleiner Wachen, Elitejäger, Offiziere, Magierausbilder, Grenztrupps, hochrangige Briganten. **Nicht** alle heutigen Commoner/Hunter/Shopkeeper hochskalieren; L20 ist ein ungewöhnlich trainierter Mensch, kein gewöhnlicher Schmied. E-NPCs haben weiterhin keine automatisch erhaltene E-Klassenentwicklung allein wegen ihres Titels – einen tatsächlich unterstützten Skill-/Trait-Pfad braucht es explizit oder sie bleiben bei glaubwürdig ausgewählten Fähigkeiten.

**Human-NPC-Gear:** Heute verwenden Guards/Trained NPCs feste Itemwerte wie ATK5/6 und DEF3, selbst wenn das NPC-Level steigt; zusätzliche Stats kompensieren nicht zwingend diese Ausrüstungslücke. Ein glaubwürdiger L18-Gildenjäger sollte mit passender, vorher persistierter Ausrüstung auftreten. Diese nicht aus PC-Starterkit ableiten, sondern aus **NPC-Rolle + Welt-/Guild-Rank + lokaler Verfügbarkeit**. Keine automatische E-Waffe für jeden L15-Dorfwächter.

**Klassenentwicklung:** F→E-`classDrafts` des PC ist bereits umgesetzt. Es entscheidet anhand tatsächlicher Karriere/Evidenz und gibt Normal/Rare mit aktivem E-Trait. **Kein** allgemeiner vorgefertigter E-Klassenkatalog nötig. NPCs können eigene, welttreue Karrieren haben; das Engine-System für einen einmalig erzeugten PC-Evolutionsoffer sollte nicht ohne Fachprüfung auf alle NPCs gespiegelt werden (Performance, Evidenz, Savegame).

## 7. Spieler-Builds, Statwachstum und Ressourcendruck

**[IST]** Ruleset 2: Warrior STR/VIT, Mage INT/WIL, Rogue AGI/PER, zwei aus sechs Starter-Skills frei gewählt, Basic Attack automatisch. Jeder neue PC beginnt bei 7 in allen sechs Stats, +1 für zwei Favored Stats. Klassenentwicklung ab Level 15 ist **separat** gebucht und gibt ein E-Trait (Normal/Rare) aus begrenztem Budget: Normal z. B. `stat_bonus=4`, `max_bonus=20`, Kostenersparnis 8 %; Rare `6`/`35`/15 %. Das ist nicht gleich einem neuen E-Zauber.

**[VORSCHLAG]** Vor Eingriffen in Stats das Zusammenspiel von Levelpunkten, Favored Growth, E-Trait, Waffenwerten und defensiven Effekten simulieren. Spieler können ihre freien Punkte stark fokussieren, NPCs verteilen sie templatebasiert; dadurch können **bei gleichem Level** große Build-Unterschiede auftreten. L8-Mage mit INT33 aus Run 20 wurde gegen L1-Bog-Strider naturgemäß sehr stark. Ein passender E-Gegner benötigt nicht automatisch die „gleichen Stats“, sondern eine faire Begegnung relativ zu tatsächlichem DPS, HP und Verteidigungsprofil.

**Ressourcenbalance:** MP-Maximum skaliert aus INT/WIL, HP aus VIT/Level, STA menschlich gedeckelt. Die **absolute Erholung** steigt bei höherem Pool, weil prozentuale Regeneration gilt. Wenn hochrangige Zauber linear teurer werden, können spätere C2/C3/E-Kosten trotzdem stärker drücken als bloße MP-Zuwächse. Diese Wechselwirkung muss bei 1-v-1 und Gruppen mit mehreren Kämpfen pro Quest bewertet werden. Kein automatisches Full-Heal-on-Levelup.

## 8. Skills, Zauber, Damage, AoE und der Zugang zum E-Rang

### 8.1 E-Skill-Kalibrierung existiert bereits

**[IST]** Die zentralen maximalen Offensivwerte nach Rank und Complexity (P1-Budget) stehen in `rules.skill_design`:

| Rank / Complexity | Max. Base Power | Max. Summe Stat-Koeffizienten | Kostenband |
|---|---:|---:|---:|
| F C1 | 12 | 1,9 | 5–10 |
| F C2 | 16 | 2,4 | 8–16 |
| F C3 | 18 | 2,6 | 12–22 |
| E C1 | 18 | 2,0 | 8–14 |
| E C2 | 24 | 2,5 | 12–22 |
| E C3 | 27 | 2,7 | 16–30 |

E hat **vorläufig `effect_scale=1.5`** für Barrier-/Heal-Basisgrenzen (nicht beliebig alle Formeln). Das ist eine **Obergrenze für dynamische Definitionen**, nicht die Behauptung, jeder individuelle E-Spruch erreiche diese Werte. Es gibt keine automatisch erlernten E-Skills bei Rankup. D–S haben noch keine freigegebenen Skillbudgets.

**Problem im Istpfad:** `src/skills.js` kann den E-Rang als Kalibrierung grundsätzlich prüfen; `src/skill_composer.js:composeSkill` erzeugt neue Lehrer-/Manual-/Stone-Fähigkeiten jedoch **fest als F/C1**; `src/v4/growth.js:sourceTarget` verweigert alles außer F. Eine bloße E-Rank-Beschriftung auf einem Stein erzeugt daher **noch keinen nutzbaren E-Zauber**. Klassevolution bei L15 funktioniert getrennt davon.

### 8.2 Mein konzeptioneller E-Skill-Pfad

**[VORSCHLAG]** Den vorhandenen Skill-Composer mit **explizitem Rank als geschlossenem Parameter** auf E/C1–C3 erweitern, mit unveränderter Schema-/Calibrationsprüfung und Engine-Authority. Keine separaten „E-Spells per Template“, keine offene numerische LLM-Macht. **Erwerbsvoraussetzungen**: Figur hat Power Rank E, die Quelle ist tatsächlich eine E-kompetente Lehrperson/ein E-Manual/E-Skill-Stone, Technikform ist unterstützt, Quelle/Preis/Gegenstand sind wirklich gebucht; Fortschritt durch bestehende LP-Lernziele oder entsprechend echte Skill-Stone-Aktivierung. E-Stones/-Manuals nicht automatisch beim L15-Rankup verschenken.

**Neue Techniken vs. Evolution:** Ein F-Skill auf P5 entwickelt sich höchstens bis C3 nach wirklichen bedeutsamen Kämpfen. Der Schritt **F→E** braucht eine **eigene belegte Quelle/Entscheidung**; sonst würde C3/F durch reines Schleifen ohne echte E-Exposition heimlich ranghöher. Eine E-Ausprägung kann nach Engine-Budget auf bestehender Technik aufbauen, aber niemals einfach dieselbe Skill-ID rückwirkend verändern. Vor Designentscheidung klar zwischen (A) zusätzlichem E-Skill, (B) E-Nachfolger eines F-Skills, (C) Klassen-Trait unterscheiden.

**[VORSCHLAG] Nicht frühzeitig entscheiden:** ob LP-Schwellen für E weiterhin nur von Complexity abhängen, ob teurere Quellen zusätzlich nötig sind und ob E-C1 bereits beim ersten E-Lehrer erhältlich sein soll. Neue E-Skills sollten spürbar wertvoll, aber **nicht obligatorisch für jeden E-Kampf** sein. Gute F-Skills auf hohem P-Rang dürfen als Nischenoption weiter nützlich bleiben.

### 8.3 Stat-Schaden, Flächen und Status-Effekte

- Schaden folgt bereits `base + Σ(coef×Stat)`, dann Resistenz/DEF/Varianz/Taktik; E erhöht vor allem Base- und etwas Coeffizient-Budgets. **Ein E-Ziel stirbt nicht automatisch langsamer**, wenn INT+MATK des fokussierten PCs stark gestiegen sind – Gegner-HP und Resistenz ebenfalls betrachten.
- Skill-Proficiency P2–P5 verbessert Kosten/Power/Effekt nach bestehender Tabelle, aber nur durch echte qualifizierende Nutzung. In einem permanenten L1-Gebiet kommt ein L8-Abenteurer bei L1-Monstern **regelkonform nicht voran**. Neue stärkere Regionen helfen organischem Skillwachstum ohne PP-Buff.
- **Offene AoE-Idee, nicht umgesetzt:** Bei Mage statt `arcane_burst` (derzeit `caster_engaged` um den Zaubernden) ein echter **ranged area hit**; für Warrior statt eines Starter-Einzelangriffs optional `cleave` auf ENGAGED. Rogue muss keinen identischen AoE erhalten. Da neue Fernflächen im Skill-Validator/Kampfsystem noch keine allgemein unterstützte Zielgeometrie besitzen, handelt es sich um einen eigenen technischen Designpatch. Gegen Gruppen kann Fernfläche extrem stark sein, ohne gegen Single-Target gut sein zu müssen. Keine Pflichtwahl aus dem Sechserpool machen.
- **Element-Aspekte sind bisher weitgehend Metadaten**, keine freien Burn-/Freeze-/Poison-Debuffs. Feuer/DOT, Eis/Slow, Wind/Push usw. dürfen nicht allein durch LLM-Prosa in Zahlen umgesetzt werden. Für E wäre eine **kleine, gesondert validierte Effektgrammatik** naheliegend, aber zunächst prüfen, ob einfache vorhandene Effekte für ein abwechslungsreiches E-Angebot reichen. Keine ungeprüften Proc-/Stun-/Turn-Deny-Ketten und keine kostenlose AoE+CC+DoT-Überladung.
- Heilung, Barrier, Schutz und Mobilität müssen nicht denselben Multiplikator wie Offensive erhalten. Bestehende Kosten- und Effektcaps pro Complexity beachten, insbesondere wenn AoE mehr als einen Gegner trifft.

## 9. Ausrüstung F innerhalb des Rangs und Übergang E

### 9.1 Tatsächliche Itemformeln

**[IST]** F-Referenzwerte für Martial ATK und Arcane Focus MATK **4–10**; Quality schiebt von `crude at=0` über `common .35`, `fine .7` und `superior 1` bis `exceptional 1.25`. `rankFactor=1+0.75×RankIndex` ergibt **F 1.0, E 1.75**. Einzelwerte werden bei Erzeugung auf dem Objekt fixiert; Handelsangebote müssen denselben Snapshot beim Kauf mitnehmen. `valueOf` nimmt für Gear **8 cp pro Statpunkt × rankFactor² / rankFactor**, also effektiv **8×SummeStats×rankFactor**. Itempreise des Händlers sind **frei, persistent und verbindlich**, der Richtwert nur Plausibilitätsaudit (0.5–2×).

**Abgeleitete _Richtwerte_ für reine Fokusstäbe (kein realer Marktpreis!):**

| Qualität | F MATK | F Richtwert | E MATK | E Richtwert |
|---|---:|---:|---:|---:|
| crude | 4 | 32 cp | 7 | 98 cp |
| common | 6 | 48 cp | 11 | 154 cp |
| fine | 8 | 64 cp | 14 | 196 cp |
| superior | 10 | 80 cp | 18 | 252 cp |
| exceptional | 12 | 96 cp | 20 | 280 cp |

**Die zentrale Unstimmigkeit:** Die R2-Starterwaffen (Starter Staff/Longsword/Dagger) besitzen **MATK/ATK 10**, also bereits den normalen F-**superior**-Wert. Ein `common`-Händlerstab MATK6 ist ein echtes **Downgrade**. Run 20 kaufte MATK6 trotz teurer Angebote. Das ist nicht durch L15 oder E-Gear zu lösen, sondern zuerst innerhalb F als Fortschritts-/Angebotsproblem zu verstehen.

### 9.2 Konkrete Vorschläge für F-Gear

**[VORSCHLAG]** Starterwaffe 10 **nicht heimlich nerfen**, weil eine frühere bewusste Startkorrektur und Builds/Runs darauf aufbauen. Stattdessen den Sinn von Upgrades klarstellen:

- **F common/fine** bleiben für normale Stadt-NPCs, Ersatzwaffen und frisch gewonnene Charaktere zugänglich. Sie sind kein Upgrade für R2-PC-Waffen. Ein Händler darf solche Produkte trotzdem anbieten; er darf dem Spieler den Wert nicht als Upgrade vortäuschen.
- **F superior** trifft Startwert **10**; kann wegen Reichweite, Waffengattung, anderer Slot-/Stilvorteile nützlich sein, aber **nicht** wegen höherer ATK.
- **F exceptional/rare** bietet **12** (ca. +20 % ATK gegenüber 10) als klaren späten F-Power-Zuwachs. Für Mage zusätzlich Roben-/Offhand-Nutzen; Warrior Schutz-/Waffenwahl; Rogue Präzision/Bewegung durch vorhandene Mechanik, **keine nichtimplementierten neuen Slots**.
- Alternative statt immer +ATK: physische DEF/MDEF, verlässliche besondere Gegenstände mit existierenden `item_effects`, Verbrauchsmaterialien, Schutz gegen konkretes Gebiet. Solange Equipment keine On-Hit- oder Affixmechanik hat, **nicht** „Poison dagger with passive DOT“ als tatsächliche Mechanik ausgeben.
- Bei Shops die **echten mechanischen Profile** `slot/rank/ATK/MATK/DEF/MDEF` und ggf. den Vergleich zum aktuell angelegten Item **im autoritativen Systemangebot** zeigen. Ein schönerer Stab ohne höhere MATK ist ein stilistisches/Backup-Produkt, kein verstecktes Leistungsversprechen.

**Preis- und Geldeffekt:** Die F-Richtwertformel setzt superior MATK10 bei nur 80 cp an; Run 20 sah tatsächlich einen MATK6-Stab für **240 cp** (andere MATK6-Stäbe 400/550 cp). Hier liegen Preisbewertung, Preiskonsistenz und sichtbare Werte auseinander. **Nicht blind alle Preise auf Richtwert zwingen**, sondern überlegen, wann Handel eine ausdrücklich erkennbare Qualität, Seltenheit, Handwerkskunst oder Rolle enthält. Was keine mechanische Mehrleistung hat, kann zwar Luxus-/RP-Aufpreis kosten, sollte dann als solcher erkennbar sein.

### 9.3 E-Gear ab L15: vorhandene Formel genügt vorerst

E-Fokuswaffen von MATK11–20 überlappen den F-Ausnahmebereich 12. Das ist sinnvoll: Eine schlechte E-Waffe muss einer außergewöhnlichen F-Waffe nicht überlegen sein. **Ein generelles „E = immer besser als jede F-Waffe“ ist nicht zwingend sinnvoll.** Das unterstützte `rankRefusal` erlaubt Gegenstände höherer Stufe schon vorher zu besitzen, aber nicht zu tragen/aktivieren. E-Angebote dürfen bei qualifizierten Regionen/Händlern sogar vor L15 existieren, wenn der Spieler klar versteht, dass er sie erst später benutzen kann.

**[VORSCHLAG]** Normaler E-Shop führt verlässlich einige E-common/fine Optionen und spezielle Meisterhändler oder Dungeon-Funde E-superior/exceptional. In einer Dorf-Taverne nicht automatisch E-Waffen anbieten, nur weil der Spieler E erreicht. Hochrangige Händler, Materialquellen und Reisewege erhalten dadurch eigenständigen Wert. Keinen festen „Upgrade alle fünf Level“-Zwang; einmaliges Itemprofil und vorhandene Ausrüstungsslots beibehalten.

**Armor und Offhand:** F light DEF2–4, MDEF2–5; heavy DEF5–8, MDEF1–3; shields DEF3–5, MDEF2–4. E×1.75 ergibt mehr Schutz, aber wegen defensiver Damageformeln und kleiner Auf- bzw. Abrundungen ist nicht jede +1 DEF gleich bedeutsam. Gleichartige konkrete Armor-Beispiele vor finaler Preistabelle gegen physische/magische E-Angriffe simulieren.

## 10. Verbrauchsmaterialien, Heilung, Skills Stones, Manuals, Loot

### 10.1 Consumables und Shoppreise

**[IST]** Restoreprofile skalieren Betrag nach Quality und Rank; offensives Item Power ebenso. Für Richtwerte gelten aktuell ca. **0,8 cp je geheiltem HP/MP**, **0,5 cp je STA**, `0.6 cp pro Item-Attack-Power`, AoE-Item-Faktor **1.5** und Rangfaktor. F-Standardheilung 30 HP = **24 cp**, 25 MP = **20 cp** laut Content-Note. Die konkreten Werte sind Richtlinien, **nicht** erzwungene Händlerpreise.

**[VORSCHLAG]** Für F und E eine kleine **Funktionsmatrix** statt nur einen Potionnamen: kurzfristige HP-/MP-/STA-Regeneration, mehrstufige Bandagen/Heiltränke, Fernwurf-/AoE-Item mit klarer Anzahl Anwendungen, angemessene Reiseversorgung. E-Produkte brauchen höheren Rang bzw. sichere Zugänglichkeit, sind nicht automatisch gratis und sollten die Engine-heilfähigen Ressourceneffekte wirklich buchen. Kosten **gegen durchschnittliche Questvergütung und Gegnergefährlichkeit** bewerten: Wenn ein 1.000-cp-E-Hunt 400 cp Heiltränke erfordert, ist das anders als ein 100-cp-Quest mit 400 cp Nachversorgung. Versorgung und Schlaf bleiben sinnvolle Alternativen.

### 10.2 Loot über F und E

**[IST]** Automatisches Monsterloot wird bei Kampfende genau einmal gebucht. Tierische Materialien haben Basiswert und aktuell pro höherem Rang einen **×3-Wertfaktor** (F→E), unabhängig von einem kleineren Levelsprung innerhalb F. Ein `F`-L14-Wolf hinterlässt nach dem Rangwertmodell für gleiche Pelzart prinzipiell gleich bewertete F-Materialien wie ein F-L1-Wolf, obwohl der Kampf viel schwieriger war. E-Materialien sind dann dreimal so viel wert. **Das ist ein echter möglicher Wertverteilungsbruch an der Rangschwelle.**

**[VORSCHLAG]** Innerhalb von F sollen herausfordernde Gegner/Elite/Boss und Qualität/Seltenheit eine reale Belohnung rechtfertigen können, **ohne** die Anatomie oder das Inventar zu erfinden. Denkbar sind **seltenere/höherwertige** gebuchte Materialien oder zusätzliche glaubwürdige Mengen/Komponenten (nicht pauschal „Level ×3 Verkaufswert“). E kann bessere Rohstoffe für E-Waren liefern, aber das aktuelle `×3` prüfen, bevor bei E große Händlerwerte und Gildenvergütungen festgelegt werden.

Loot von humanoiden NPCs: tatsächlich ausgerüstete Waffen/Armor, tatsächliche Inventargegenstände und plausible Geldbörsen – nicht automatisch ein teurer E-Schwertdrop von einem schlecht ausgerüsteten L18-Dorfwächter. Körperteile weiterhin nach tatsächlicher Anatomie. Skill-Stones sind **keine gewöhnliche sichere Standardbeute**.

### 10.3 Stones, Manuals und Lehrerökonomie

**[IST]** F-Skill-Stone **Richtwert 400 cp**, Manual **120 cp**; das ist ein Auditwert, keine automatische Kaufpreisverweigerung. In früheren echten Shops wurden F-Stones für 30–80 cp angeboten. Passive Stones sind **legendär und extrem selten** und gehören gerade **nicht** in die normale E-Upgrade-Preisleiter.

**[VORSCHLAG]** Preis und Verfügbarkeit von F-/E-Technikquellen getrennt von Waffen-/Trankpreisen bewerten. E-Lehrer/Manuals/Stones dürfen kostbarer und weniger allgegenwärtig sein, brauchen aber **keine noch nicht erfundene exakte 1.75²-Multiplikationsregel**. Bei einer E-Skill-Quelle zählen: belegte Technikfunktion, Rank, Kompetenz/Authentizität, Lernzeit, ggf. Materialverbrauch, reale Verfügbarkeit und Personenzustimmung. Dokument mit Rang E darf nicht allein wegen des Etiketts E-Power erzeugen.

**Konkrete Testkette später:** Ein E-Rank-Manual wird im Shop sichtbar mit Preis und lehrbarer Technik angeboten; PC unter L15 kann es rechtmäßig kaufen/halten, aber nicht daraus E lernen; ab L15 kann eine passende E-Lernsession starten; LP bleibt persistent und Skill wird genau einmal mit gültigem Engineprofil gelernt. Dasselbe für E-Stone und kompetenten E-Lehrer; Legacy-Regelstand1 unverändert.

## 11. Gilde: Novice-F und Proven-E als Erlebnis statt Zahlenetikett

**[IST]** Novice-Katalog L1–14, Proven L15–29; der Proven-Rang ist eine **Guild-Mitgliedschaftsstufe**, nicht die automatische Charakter-Power. Beförderung benötigt **mindestens fünf tatsächlich abgeschlossene Verträge des aktuellen Guild-Rangs** und Power Rank E. In Run 20 hatte der Spieler bereits zehn Novice-Abschlüsse, aber war L8: die fehlende Beförderung ist **regelkonform**. Run-20-Board: alle 35 Angebote Novice L1–3.

`rules.guild.board.payout_guide_cp`: **Novice 10–200 cp**, **Proven 100–600 cp**, höhere Stufen ebenfalls vorläufige Ratgeber. Für eine L14-Jagd können 200 cp u. U. zu wenig sein; für E-Monster mit wertvollem Loot 600 cp ebenfalls – die Angaben sind **Richtwerte**, keine validierte Endwirtschaft.

**[VORSCHLAG] Drei Mechanismen auseinanderhalten:**

1. **Qualifizierte Boardauswahl:** Ein Novice-Board darf eine leichte L1-Jagd **und** ausgewiesene L5–8-/L9–14-Aufträge anbieten, sofern die Region solche Risiken glaubhaft kennt. Die verbindliche eine leichte Einführung bleibt erhalten. **Nicht** alle fünf Notices an Spielerlevel angleichen und nicht jede Nacht eine komplett andere Liste erfinden. Das aktuelle Profil `4 Hunts + 1 passende Dungeon-Clear` bzw. `5 Hunts` bleibt vorerst gültig.
2. **Erfüllbare Gegnerzuordnung:** Eine L10-Quest gegen eine entfernte Goblinbande muss zu einer **tatsächlich existierenden** L10-tauglichen Gegnerpopulation/Region führen, statt bei der Kampfmaterialisierung auf L1-Goblins zurückzufallen. Questlevel ≠ Encounter-Level, beide müssen jedoch **inhaltlich kohärent** sein. Keine „überall L10“-Weltmutation.
3. **Faire E-Karte:** Erst wenn Spieler wirklich E-Power/Proven erreichen, E-Aufträge und E-Dungeon-Clears wie normale freigeschaltete Guild-Leistungen anbieten. Ein gut ausgerüsteter L14-F-Abenteurer darf zuvor riskante E-Umgebung entdecken oder freiwillig meiden, aber E-Gildenmitgliedschaft nicht voreilig vortäuschen.

**XP und Vergütung:** `questXp` hängt von Questlevel und `qtype` ab, nicht vom tatsächlich im Kampf gebuchten Kill-XP. Eine „L12-Aufgabe“ mit bloß L1-Gegnern wäre entsprechend ein potenzieller Exploit **oder** schlicht falscher Questaufbau. Auftrag und Bedrohung müssen zusammenpassen; keine harte Doppel-XP-Gutschrift aus reinem Beschreiben einer härteren Mission. Zusätzliche Rollen/Questfamilien dürfen normale Weltinteraktionen nicht wieder als verbotene private Quests einführen.

## 12. Preisökonomie über F→E: ein kohärentes, aber offenes Budget

Eine **verbindliche Preisliste lässt sich aus einem Mage-Run nicht verantwortbar ableiten**. Für eine erste Planungsprobe genügen drei Vergleichstypen; **alle Beträge illustrativ**:

| Geldquelle/-senke | Gegenwärtiger Contentanker | Erste Designfrage |
|---|---|---|
| Einsteiger-Novice | 10–200 cp Richtwert; L1-Kills 24 XP (normal) | Ab wann ist ein qualitätsstärkeres F-Item realistisch erreichbar? |
| F-Oberband | höhere L-/Quest-XP, aber weiterhin Novice-Rang | Können gewinnbare L8–14-Hunts mehr kosten/mehr auszahlen als E-Anfängeraufgaben? |
| Proven E | 100–600 cp Richtwert, E-Skills/Equipment erfordern höheres Angebot | Reicht das nach Heilung/Service/Verbrauch wirklich für nützliche E-Fortschritte? |
| F-Fokus common / superior | MATK6 Richtwert 48 cp / MATK10 Richtwert 80 cp | Warum real MATK6 mehrfach 240–550 cp? Soll das echte Material-/Luxusmarke oder Preisinstabilität sein? |
| E-Fokus common / fine | MATK11 Richtwert 154 cp / MATK14 Richtwert 196 cp | E-Gear muss höher verfügbar/teurer werden, aber nicht durch willkürliche Fantasiepreise |
| F-Skillquellen | Stone ca. 400 cp, Manual ca. 120 cp | Normale F-Schulen/Lehrer/Manuals vs seltene Sofortsteine; tatsächlich erreichbar? |
| Materialbeute | F→E ×3 | Innerhalb F kaum Wertsteigerung trotz großer Kampfrisiken |

**[VORSCHLAG]** Zunächst für **F-L1/5/10/14 und E-L15/20/29** je ein konkretes Beispielbudget mit 1–2 Jagden, Loot, 1 Heil-/Schlafblock, optional Training und einem sinnvollen Equipmentkauf aufstellen. Weder alle Verkäuferpreise standardisieren noch den freien Markt komplett deregulieren: Verkäuferangebote dürfen variieren, aber der Spieler soll **Wert, Vergleich und Spielwirkung** erkennen. Die autoritativen Engine-Snapshots sollten den sichtbaren Shop nicht verstecken.

## 13. F→E-Migrations- und Persistenzfragen

- **Keine Retroaktivität:** Bestehende Kampagnenmonster, NPC-Level/-Stats, Itemprofile, Shops und Questbedingungen werden nicht automatisch auf neue Werte umgerechnet. Ein älterer F-Stab bleibt MATK6 oder 10 wie beim Kauf belegt.
- **Weltgefahr festlegen, nicht bei jeder Begegnung neu würfeln:** Wiederkehrende Reviere/Monstergruppen behalten Kontinuität. Warnungen/Bekanntheitsgrad sind getrennt von den echten persistenten Werten.
- **Dungeon-Rollen unverändert source-of-truth:** Kein Zusatz-System, das beim Wiederbetreten denselben Slot neu nach PC-Level auswählt.
- **E-Skill erst nach tatsächlicher Quelle/Annahme:** Neue Skilldefinitionen dürfen weder durch falsche Storytags noch Reload/Doppelkauf wiederholt gebucht werden.
- **F→E-Ranggrenze bei Level 15** bleibt Kanon. Wo Spieler ein E-Gear vorher erwerben, ist es besitzbar, aber vor Rangfreigabe nicht automatisch equipbar.
- **Regelstand1 isolieren:** NPC-Templates, PC-Startstats und Skills wurden in Patch9A/9C teilweise nach Ruleset getrennt. Jeder neue Skalierungsbaustein braucht klare Legacy-Gegenfälle und darf alte World-/Gear-Snapshots nicht mutieren.

## 14. Risiken und bewusst vermiedene Lösungen

| Versuchung | Warum ich sie **nicht** empfehle |
|---|---|
| **Alle Gegner auf PC-Level+0 setzen** | Bricht Weltkohärenz, Gebietswahl, Levelgefälle, leichte Rückreisen und Kanon |
| **Questlevel als versteckte individuelle Monsterhöhe erzwingen** | Kann die Welt beim Lesen eines Notices mutieren; Gefahr und Gebiet bleiben undefiniert |
| **Neuer Voll-Specieskatalog mit 200 E-Monstern** | Die 19 Anker + freie Species/Lore decken Kampfgrundwerte; anatomische und Spezialfähigkeitsprobleme sind gezielte Fachthemen |
| **E als doppelten Schaden/HP-Bonus bei Level 15 definieren** | Vorhandene Level- und Elite-/Bossformeln decken Power bereits kontinuierlich ab; Doppel-Skalierung droht |
| **Spieler wegen L8/250 Inputs weitere ×2 XP geben** | Ursachen liegen in niedrigem Gegner-/Questmix und tatsächlichen Zügen; Dungeonphase war schon XP-reich |
| **Starterwaffen von ATK10 wieder auf 6 nerfen** | Bewusster Fix; würde fehlende Shop-Upgrade-Klarheit durch Rückschritt kaschieren |
| **Alle Skills beim E-Rang automatisch zu E machen** | Unterläuft Quellen, P5, Lernziele, freie Skillwahl und geklärte Klassenentwicklung |
| **E = sofort DoT/Stun/AoE für alle Monster und Zauber** | Noch nicht implementierte/validierte Status-/Flächenmechanik, Gruppenkampf wird sprunghaft |
| **Alle F-Jagden ab PC-L8 abschaffen** | Löscht freiwillige Farm-/Roleplay-/Explorationsoptionen; bessere Gefahren müssen zusätzlich angeboten werden |
| **Balancing über den Runner steuern** | Player soll frei entscheiden; keine künstlichen Quests/Stat-/Loot-Vorgaben im Live-Guide |

## 15. Mögliche Implementierungsreihenfolge – nur als Designhypothese

**Paket A – F-Gefahr in der Welt real verfügbar machen:** Vorhandene Orts-/Region-Fakten, `scene.location` und Monster-`materialise` identifizieren; wenige glaubwürdige stabile F-Gefahrenbänder und Rückfalllogik; keine neue Pflichtsimulation. Ziel: natürliche L4–14-Nicht-Dungeon-Gegner ohne PC-Level-Scaling; bekannte L1-Orte bleiben L1. **Zuerst nur Design-/Funktionsreplay, später Codefreigabe.**

**Paket B – Gildenboard und Gegnerfenster kohärent:** Bestehendes 4+1/5-Hunt-Profil erhalten, aber sinnvolle Auswahl über L1–14; Quest-/Gebietsbezug stabil; L1-Einstiegsjagd behalten; kein erfundener höherer Gegner beim Turn-in. Proven E erst nach tatsächlicher Beförderung.

**Paket C – F-Equipment und Markttransparenz:** Qualitäten, echte Itemwerte, Shopansicht, Starter-MATK10 und real zugängliche späte F-Angebote gemeinsam betrachten. Keine neue Slot-Engine. Reine Preisrichtwerte nicht als Zwangspreise missverstehen.

**Paket D – E-Bevölkerung und E-Dungeons:** Rangabhängige, weltgebundene gefährliche Regionen, erfahrene NPCs mit passender persistierter Ausrüstung, E-Etagen/Elite/Bosse und erkennbare Risikohinweise. Erst bestehende Levelspans/Gruppenmechanik simulieren, nicht sofort neue Monsterfähigkeiten.

**Paket E – E-Skillquellen und Funktionsgrammatik:** E-Composer-/Learn-Pfad durch bestehende Validatoren und echte Quellen schließen. Klassenevolution bei L15 unangetastet. Fortgeschrittene Elemente, Fern-AoE, DoT/Slow gesondert entwerfen, wenn klar, dass Basis-E-Skills nicht ausreichen.

**Paket F – Cross-rank-Ökonomie- und Klassenabnahme:** F/E-Questvergütung, Lootverkauf, Ressourcenkosten, Upgrades, Training vergleichen. 3 Klassen mit Gegenparts L1/L5/L10/L14/L15/L20; 1v1, 2v1, 3v1, 5v1, normal/elite/boss; echte Shop-/Quest-Replays und Living-Dungeon-Resets. Kein globaler Stat- oder XP-Patch ohne vorherige sichtbare Evidenz.

**Diese Reihenfolge ist KEINE freigegebene Roadmap**; sie soll die Vergleichsdiskussion mit Sol strukturieren. Kleine nachgewiesene Enginebugs aus Run20 (`repriced`-Validator, Guild-Place T203, Extractor-Repair) sind separat und dürfen nicht als „Scaling-Paket“ aufgebläht werden.

## 16. Konkrete Vergleichsfragen GPT ↔ Sol, bevor irgendetwas beschlossen wird

1. **Wie klein bleibt das kanonische Gebiet-/Gefahrenmodell?** Bestehende Place-/Fact-/Dungeon-Authority oder neue Region-ID? Woher der langfristig stabile Levelspan?
2. **Wie bleibt L1-Siedlungsnähe glaubwürdig, während F4–14 wirklich auftaucht?** Welt-/Questverknüpfung statt PC-Skalierung.
3. **Wie verhindern wir, dass ein L10-Questlevel lediglich L1-Gegner mit höheren XP-Payouts dekoriert?** Prüfung von Ort, Rolle und Zielbedrohung, ohne Missionen deterministisch zu skripten.
4. **Wie teuer und wichtig sollen F-Gear-Quality und E-Gear sein?** Starter-ATK10, F-exceptional12, E-common11, echte Händlerpreise und Kauftransparenz berücksichtigen.
5. **Wie bekommen trainierte E-NPCs glaubwürdige Waffen und E-Techniken?** Bisheriger 2-Skill-NPC-Ansatz vs. zusätzliche echte Rank-Quellen.
6. **Wie wird E-Lernen praktisch erreichbar?** E-Rang-Werte existieren, `sourceTarget` und `composeSkill` derzeit F-only.
7. **Braucht E schon neue Effektfamilien?** Oder zuerst vorhandene Offensive/Barrier/Heal/Movement und befristete Buffs besser in echten Begegnungen erproben?
8. **Wie verteilen Dungeon-Floors das gesamte Rangband?** E-Minions 15–19, Guards 18–22, Boss 20–24 bei reiner E-Rang-Floor – wie L25–29 nutzen?
9. **Was ist eine faire Ökonomie?** Kupfer je gefährlicher F-/E-Quest, durchschnittlicher Loot, Heil-/Trainingsaufwand, sinnvolle Upgrade-Kosten, Marktaudit vs. echter Preis.
10. **Womit beweisen wir Fortschritt?** Nicht nur Level/Turns, sondern XP pro qualifiziertem Encounter, realer Upgrade-Nutzen, freigeschaltete Fähigkeiten, Gruppenrisiko und intakte Saves.

## 17. Persönliche vorläufige Empfehlung (ausdrücklich unverbindlich)

Ich würde **F bis Level 14 in der Welt erst vollständig erlebbar machen**, gleichzeitig E-Inhalte **vorbereiten, aber nicht künstlich aus Level 15 herbeizaubern**. Für E braucht es vor allem glaubwürdige E-Gebiete/Entdeckungen, trainierte NPCs, passende Händlerware, erreichbare E-Lernquellen und interessante Dungeons – nicht automatisch das zweite komplette Monster-/Skill-/Weltregelsystem.

**Im jetzigen Stand unverändert lassen:** ×2-XP, Startstats 7, Rankband F1–14/E15–29, Klassenentwicklung L15, 6 wählbare Starter-Skills (2 gewählt) und PP-Qualifikationsregeln. Der Mage-Fern-AoE/Warrior-Cleave-Vorschlag bleibt ein **separater, optionaler Designkandidat**. Solange Skills/Items/Gegner bei echten Mid-F-Rank-Herausforderungen noch nicht gut genug getestet wurden, bitte keine neuen numerischen Endwerte für E als beschlossen erklären.

**Gesamtstatus:** Umfangreiche **Vergleichsstudie**, **kein Patch**, **keine Implementierung**, **keine Veränderung der Hauptdokumentation 01–06 oder des Enginebranches**.
