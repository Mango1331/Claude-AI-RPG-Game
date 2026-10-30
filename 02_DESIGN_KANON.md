# Avereth Engine — Verbindlicher Design-Kanon und Leitplanken

**Stand:** 30.10.2026 · Fassung 15: XP-Balanceversuch .121 auf Nutzerauftrag. **[VERBINDLICH]** beschreibt gewolltes Verhalten, **[GEPLANT]** ein beschlossenes, noch nicht umgesetztes Ziel, **[OFFEN]** eine unentschiedene Idee. Tatsächlicher Produkt-/Abnahmestand ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md).

Vollständige Vorfassung mit Beschlusshistorie: [7994fa4](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/02_DESIGN_KANON.md). Alte Implementierungsberichte und überholte Zwischenstände werden hier nicht wiederholt. **Leitprinzip: LLM versteht wie ein GM; Engine rechnet und persistiert wie ein Spiel.**

## 1. Spielerfahrung und Prioritätensystem

**[VERBINDLICH]** Priorität haben Spielerhoheit und bedeutsame Entscheidungen, Spaß und Tempo, eine unabhängige lebendige Welt, verlässliche mechanische Konsequenzen und offene High-Fantasy-Progression. Technische Einfachheit unterstützt diese Ziele. Keine Tabellenbürokratie, künstlichen Pflichtwege oder zusätzlichen Mechaniken ohne praktischen Nutzen.

## 2. Zuständigkeiten von LLM und Engine

- **Planner:** natürliche Eingaben und bekannte Referenzen verstehen. Wünsche, Fragen, Hypothesen und fremde Aussagen sind keine verbindlichen PC-Handlungen.
- **Engine:** Kampf, Zahlen, Ressourcen, XP, Inventar, Geld, Reisen, Zeit, Quests, Skillbesitz und persistierte Identität entscheiden und buchen.
- **Narrator:** Prosa, Gespräche, eigenständige Weltreaktionen und lokale Entdeckungen gestalten; verbindliche Engine-Ergebnisse respektieren.
- **Extractor/Firewall:** neue erzählte Weltvorgänge typisiert übernehmen, ohne freiwillige Spielerentscheidungen oder Engine-Ergebnisse zu überschreiben.
- **Wissen:** NPCs kennen nur, was sie selbst wahrnehmen oder aus legitimer Quelle erfahren. Ein ungesprochenes Spielerziel ist kein NPC-Wissen.
- **Replay:** Das Eventlog konstruiert den Zustand deterministisch. Edit, Regenerate, Swipe und Reload dürfen keine doppelten Buchungen erzeugen.

**Ankunft:** In neuen Ruleset-2/V4-C-Berichten buchen nur explizite, chronologisch eingeordnete und autorisierte `arrive`-Deltas Bewegung. Szene, erwartetes Ziel und Reisezeit sind keine zusätzliche Berechtigung. Kompakte Reisen und echte Zwischenhalte innerhalb einer Antwort bleiben möglich; Gate-, Forced-Movement- und Agency-Schutz gelten weiter. Historische Events bleiben unverändert.

**Handelszustimmung:** Kauf-/Verkaufszusagen gelten für den konkreten aktuellen Vorgang und Ort, nicht als dauernde Vollmacht. Reise plus bedingter Kauf ist nach bestätigter Ankunft mit eindeutiger Gegenpartei, Angebot und Preislimit möglich. Ohne passende Zustimmung bleibt die Offerte offen. Im F-Balance-Versuch.123 bekommen neue reguläre F-Gear-Offerten beim Erstellen einen verbindlichen Enginepreis; eine Korrektur der erzählten Summe verlangt erneute Zustimmung statt automatischer Abbuchung. Gespeicherte Angebote bleiben unverändert, andere Handelsarten und E+-Gear flexibel. [Umsetzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c300f3d77262ab334bd343dbaf488dcfabff29dd/avereth-engine/docs/PATCH123_PP_GEAR_PREPARATION.md).

SillyTavern ist der aktuelle Host, kein notwendiger Weltbestandteil. Sprachmodelle bleiben austauschbar; keine Abhängigkeit von proprietären Modellfähigkeiten erzwingen.

## 3. Figurenhoheit, Erzählstil und autonomes Worldbuilding

**[VERBINDLICH]** Der Spieler bestimmt freiwillige Bewegung, Worte, Gedanken, Motive, Zustimmung, Angriffsziel, Skills, Beziehungen und Questwahl. Gewöhnliche notwendige Teilschritte einer gewählten Handlung dürfen erzählt werden, zusätzliche Entscheidungen nicht. Nachvollziehbare äußere Kräfte dürfen ihn physisch beeinflussen.

Narrator-Preset: Englisch, dritte Person, Vergangenheit; konkrete Wahrnehmung und glaubwürdige Dialoge statt Systemtracker. NPCs haben eigene Interessen und dürfen helfen, ablehnen, täuschen, kämpfen oder sterben. Kein Plot-Armor, erfundenes Fremdwissen oder nachträgliches Zurücksetzen etablierter Ereignisse. Neue Figuren, Orte und Fraktionen nur bei Bedarf entwickeln, dann konsistent erhalten.

Alaric Red ist die häufige Testfigur, keine Pflichtfigur oder verbindliche Klasse für alle Kampagnen.

## 4. Allgemeines Pacing und Quality of Life

- Gewählte Handlungen innerhalb einer Antwort durch bedeutungslose Abschnitte fortführen, bis Ziel, relevanter Vorfall oder echte Entscheidung erreicht ist. Atmosphäre läuft mit; kein wiederholtes „I continue“ wegen Geräuschen oder leerer Wegkurven.
- Die Grenze bleibt das gewählte Ziel: Wald betreten autorisiert keinen eigenmächtigen Höhlenbesuch. Suche soll konkrete Entdeckung oder brauchbaren Fortschritt liefern.
- Automatisches Loot nach tatsächlichen Siegen; keine wiederholten Plündereingaben und keine Trophäenpflicht als Jagdbeweis.
- Keine Traglast-/Packmechanik. Der magische Pouch dient Inventarkomfort; bewusst getragene oder ausgerüstete Dinge bleiben physisch.
- Keine nachträglichen Unterschriften, Rückgaben oder unnötigen Beweisketten. Echte Lieferungen und Reparaturen behalten ihre erforderliche reale Übergabe beziehungsweise Abnahme.

## 5. Kampf und Progression

**[VERBINDLICH]**

- Neue PCs starten mit Basis 7 in STR/VIT/AGI/INT/PER/WIL; +1 auf die zwei Favored Stats der Klasse bleibt. Level-ups unverändert, menschliche NPC-Basis 5 und bestehende Saves ohne nachträglichen Buff. [Implementiert .91, b55a897](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b55a897).
- Reichweite, Deckung, Initiative, Schaden, HP/MP/STA, Tod und Flucht sind Engine-owned. Kein stiller Ersatz eines ausdrücklich gewählten ungültigen Ziels und keine heimlichen Kosten für abgelehnte Handlungen.
- Zusammengehörige anwesende feindliche Gegner kämpfen als Gruppe, bleiben aber einzelne Ziele mit eigener Initiative. Neutrale, entfernte oder unbeteiligte Wesen treten nicht allein wegen eines Labels bei. Kein festes Temperamentskript und keine automatische Retreat-/Chase-Schleife.
- Kapitulation ist kein Kill und gibt keine Defeat-XP; ein späterer echter Kill kann genau einmal zählen. Monsterstärke folgt Gebiet, Rang und Profil, **nicht dem aktuellen PC-Level**.
- **Outdoor-Weltlevel (.124, F-Progression):** Bestehende Orte können ein festes typisches Gegnerfenster erhalten; der nächste explizite Vorfahr vererbt es. Festgelegte Individuen/Dungeonvorgaben und passende lokale Populationen haben Vorrang vor Gebiet und altem Fallback. Bereits vorhandene Profile, Populationen und Verträge bleiben unverändert. Art-/Körperbauauflösung bei neuen Boards und Kreaturen ist einheitlich, etablierte Populationen sind verbindlich. Gebiet und tatsächliche Zielpopulation werden getrennt aus Engine-Daten angezeigt. Keine PC-Skalierung, Entfernungssimulation, Pflichtbegegnungen oder Outdoor-Spawnslots; harmlose Fauna und menschliche NPCs werden nicht pauschal aufgebufft. [Umsetzung und Grenzen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/97d0976a558b5dbac2c57d00c1ce8fcad1254e4b/avereth-engine/docs/PATCH124_WORLD_LEVEL_COHERENCE.md).
- Frühe Fortschritte sollen spürbar sein. Der reversible Balanceversuch .121 verwendet XP-Faktor5 statt2, also 2,5-mal die bisherigen Kampf-/Questbelohnungen bei unveränderten Levelschwellen. Ziel ist ein besser erreichbarer natürlicher Level-15-Lauf, keine garantierte Dauer. Keine Farm-Nerfs oder Diminishing Returns ohne neue Entscheidung. [XP-Umsetzung .121](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00fa7f11567067da59f8a89e94a49f4c2618464f/avereth-engine/docs/PATCH10B_XP_REWARDS.md).
- Defensive/Utility-Skills müssen verständlich und sinnvoll nutzbar sein; das Combat-HUD zeigt Besitz, Kosten und Wirkung. Zahlenänderungen sind Balancearbeit, kein Nebenprodukt eines UI-Fixes.
- Proficiency P1–P5 wächst durch bedeutsame echte Nutzung, einmal pro Skill/Kampf am Ende; höchste passende Class Affinity, keine Multiplikation. Abgelehnte Aktionen, triviales Wiederholen, Waffenangriffe und Prosa geben keine PP. P5 allein verleiht keine Evolution. Im F-Balance-Versuch.123 qualifiziert ein tatsächlich ausgeführter offensiver Einsatz gegen ein Ziel auf mindestens PC-Level−2 auch ohne Gegenangriff, wenn der Kampf gewonnen und überlebt wird. Defensive/Utility-Nachweise, LP und Entwicklungsbelege bleiben unverändert; keine höhere PP-Menge.
- Kampagnen behalten ihre gespeicherte Zahlenpolicy. F-Teständerungen umfassen die Rundung der Proficiency-Kostenreduktion (.96) und die experimentelle Waffen-/Lern-/PP-/Vergütungskalibrierung (.114); keine zusätzlichen Gearslots oder heimliche Weltanpassung. Werte und Grenzen in den [F-Progressions-](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f50ca4e7cbc59530b902e8cc73e338d1db79496e/avereth-engine/docs/PATCH_F_RANK_WORLD_PROGRESSION.md) und [F-Balance-Patchnotes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/89aaf08d131344b703172e349a3f5557f531d234/avereth-engine/docs/PATCH_F_BALANCE114.md). E-Anschluss und endgültige Numerik bleiben eigene Arbeit.

**Band-AoE und Starterversuch, implementiert .116:** Fern-AoE trifft alle gültigen Ziele im gewählten Band innerhalb ihrer Reichweite, ohne Winkel-/Clusterprüfung. Ein gewähltes Band bedeutet nicht automatisch alle näheren Bänder. Bestehendes Friendly Fire bleibt erhalten. Neue V4-C/Ruleset-2-Pools bieten Cleave statt Power Strike, Arcane Wave statt Arcane Burst, Fan of Blades statt Feint. Weiterhin zwei freie Starterwahlen, keine zusätzliche Gratisfähigkeit; AoE-Pflicht gilt nur im aktuellen Testguide. Ältere Kampagnen und NPC-Pools bleiben geschützt. [Umsetzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/41a17fc50ba2fb4bc96dcc83a86dc0cea779f46e/avereth-engine/docs/PATCH_AOE116_STARTER_TRIAL.md), [spätere Mehrband-/Raumideen](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7d-flächenfähigkeiten-über-reichweitenbänder-und-spätere-räumliche-verfeinerung-29102026).

**[GEPLANT, nicht implementiert] Main/Minor:** Neue Ruleset-2/V4-C-Encounter erhalten pro normalem eigenem Turn höchstens eine Haupt- und eine Nebenaktion. Normale Ein-Band-Bewegung und berechtigter Mobility-Skill belegen **denselben** Minor-Slot, kein zusätzlicher Gratisschritt. Im Angriffsskill enthaltene Extra-Bewegung bleibt Teil der Hauptaktion. PC/NPC/Kreaturen teilen das Bewegungsbudget; Spezialskills setzen Besitz voraus. Alte laufende Encounter und Ruleset 1 bleiben unverändert. [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md).

## 6. Quests und Gilde

**Neue Kampagnen ab .83:** Nur Gildenquests sind formal. Private Bitten, Arbeit, Rettung und Gefallen bleiben freie Weltinteraktionen über Fakten, Beziehungen, Threads und Erinnerungen: keine privaten Questobjekte, Annahme-/READY-/Abgabestufen oder automatische Privatquestbelohnungen/-XP. Ein anwesender NPC darf tatsächlich Geld oder Gegenstände als Dank, Vorschuss oder Bezahlung geben; Versprechen und Wiedererwähnung zahlen nichts. Historische Privatquests bleiben ladbar. [Umsetzung b70bd1f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b70bd1f).

**Offizielles Board und Ausführung:**

- Freiwillige konkrete Weltaufträge, keine Hauptquestpflicht. Neue automatische Ruleset-2/V4-C-Boards: **4 Jagden + 1 geeignete Dungeon-Level-Räumung**, ohne geeigneten bekannten Dungeon **5 Jagden**. Novice behält die machbare schwache Einzelgegner-Einstiegsjagd. Eine Dungeonjagd verbraucht nicht die Räumungskategorie. [Umsetzung .84/.87](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1584dd7).
- F-Progressionsboards enthalten zusätzlich passende Empfehlungen4–7 und8–14. Population, Art, Ort und Stärke müssen zusammenpassen; beim Boardlesen keine Monster erzeugen, umwerten oder den PC bewegen. Gewöhnliche F-C1-Primer dürfen über tatsächlich anwesendes Gildenpersonal freiwillig gekauft und mit echter Lernzeit studiert werden; Preise stehen in der aktuellen Zahlenpolicy, nicht in einer zweiten Kanontabelle.
- Neue automatische Jagd: ein quantitatives DEFEAT-Ziel, gespeicherte Population/Zählregel, derzeit tatsächliche Kills. Flucht oder erzählter Ersatzerfolg genügt nicht; keine zusätzliche Story-READY-Pflicht oder Trophäen. Board und HUD zeigen Menge und Fortschritt.
- Dungeon-Clearance folgt dem tatsächlichen Ebenenerfolg statt willkürlicher Killzahl. Pro kanonischem Dungeon/Etage höchstens ein neuer aktiver Räumungsvertrag; nach Abschluss/Aufgabe zählt für neue Arbeit erst ein nach Annahme erbrachter PC-Clear. [Umsetzung .104](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9ffa2c).
- **Vorläufig keine neuen doppelten gezählten Jagden:** gleiche Außenpopulation oder überlappende Dungeon-Encounter werden bei Generator/Repair und Annahme unabhängig von Titel, Menge, Auftraggeber, Tag oder Filiale gesperrt. Andere Populationen und mechanisch getrennte gewöhnliche/Bossziele bleiben unabhängig; Clearance ist separat. Historische aktive Doppelverträge und Ruleset 1 bleiben gültig. Keine Kill-Verbrauchsverwaltung; [spätere Freiheit in 04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7e-spätere-questfreiheit-und-überlappende-jagdaufträge-30102026). [Umsetzung .120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f).
- Tagesangebote bleiben stabil; andere Abenteurer entfernen nicht nachträglich das sichtbare Angebot. Annahme, Slipstatus, Nachweise, READY, ausdrückliche Abgabe, Zahlung und Quest-XP/Promotion sind Engine-owned.

**Filialen und Abgabe:** Der Narrator darf eine tatsächlich betriebene Adventurers'-Guild-Filiale in einer kanonischen, auch neuen Siedlung etablieren. Die Engine verleiht den funktionalen Status nach gültigem Beleg: eine Filiale pro Siedlung, passende bestehende Orte/Empfangsräume wiederverwenden. Spielerbehauptung, Schild oder Gerücht allein genügt nicht; Filialstatus bewegt den PC nicht. Ein erfüllter Vertrag kann an **jeder anerkannten Filiale** abgegeben werden, nach tatsächlichem Aufenthalt beziehungsweise autorisierter bestätigter Ankunft. GO plus Abgabe im selben Zug ist möglich. Angebotsannahme bleibt an das zugehörige Board gebunden. Gründung oder Namensvariante erzeugt keinen automatischen Auftrag/Refresh; die erste ausdrückliche Boardabfrage darf das reguläre Angebot anlegen. [Umsetzung .117](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9a76eb), [Identitätsfix .120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f).

**Delivery/Escort bleiben erhalten:** Nur automatische neue Liefer- und Escortangebote sind ausgesetzt. Vorhandene Boards, Verträge, Daten, Tests, physische Transfers, Mengen/Provenienz, Empfänger/Zielprüfung, READY, Belohnung und XP bleiben funktionsfähig. Keine rückwirkende Umschreibung. Eine gültige Boardlieferung hat ein DELIVER-Ziel mit Ware/Menge und eindeutigem Empfänger/Ziel oder erlaubter Ablage; keine zusätzlichen GIVE-Ziele, Unterschriften oder nachträglichen Behälterrückgaben. Freie Übergaben/Begleitungen bleiben möglich. Hindernisse sind kausal, keine Pflichtkämpfe oder immer gleiche Hochwasserszenarien.

## 7. Dungeon-Design: langfristig verbindliche Videospielstruktur

- System-Dungeons sind physische **gemeinsame** Weltorte, keine privaten MMO-Instanzen. Gate, Kapazität, Etagen, Themen, Population, Ressourcen, wesentliche Gefahren und Resetintervalle sind individuell; kein fixes Zimmermuster oder Pflichtzähler „drei Kämpfe“.
- Mehrere Ebenen mit sinnvollen Wegen, Guardians/Minibossen und Abschlussboss. Stärke folgt Dungeon/Etage, nicht PC-Level oder Gildenrang. Gefahr muss verständlich sein, kann aber tödlich bleiben.
- Engine persistiert Population/Slots, Identität, Anwesenheit, Belegung, Fortschritt, Boss-/Clearstatus, Loot und spielzeitabhängige Resetzyklen. Entfernte Reservierung ist keine tatsächliche Begegnung. Narrator gestaltet innerhalb dieser Fakten.
- Andere Abenteurer teilen Population und Ressourcen ohne vollständige NPC-Simulation. Fremde Erfolge verleihen dem PC weder XP/Loot noch persönlichen Clearcredit. Keine widersprüchlichen Resets bei aktiven Kämpfen/Anwesenden.
- Floor-Clear erfüllt die vorher festgelegten wesentlichen Bedingungen, nicht zwingend die Tötung jedes Lebewesens. Alternative Lösungen nur, wo das Ziel sie zulässt. Bekannte sichere Rückwege dürfen zusammengefasst werden; seltene Rückkehrsteine sind kein kostenloser Standard.
- Natürliche Höhlen/Ruinen sind nicht automatisch System-Dungeons mit Gate, Kapazität und Reset. Dungeons sind regional verschieden, niedrige Ränge häufiger; Gilde, Adel, Krone, Tempel oder Händler können Rechte besitzen. Gebühren nur mit Zustimmung, keine universelle Gildeneigentümerschaft.

Grundlagen: [Patch8-/9-Archiv](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md), [Slot-/Anwesenheitskorrekturen](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md). Natürliche Nachweise ausschließlich in 03/Runreviews, keine pauschale Vollabnahme jeder Dungeonregel.

## 8. Welt, Lore und Klassen

High Fantasy auf Avereth mit sicheren Siedlungen, Wildnis, Politik, Handel, Familie, Magie, Monstern und Dungeons; westlich-mittelalterliches Materialbild, keine moderne Technik. Menschen bilden die normale menschliche Zivilisation; keine stillschweigende Einführung klassischer intelligenter Fantasy-Völker. Monster können Tiere, magische oder intelligente Wesen, Einzelindividuen und Gesellschaften sein, nicht pauschal Feinde. Sapienz und Macht sind getrennt.

Menschliche Großmächte: **Valedorn Crown, Caelreth, Duskreach**; Monsterreiche: **Ashen Scale Dominion, Verdant Fang Court**. Bündnisse/Konflikte kreuzen Arten und Reiche. Die transnationale Adventurers' Guild herrscht nicht überall; seltene S-Ranks lösen nicht jedes kleine Problem.

**Klassen und Skillhoheit:**

- Regelstand pro Kampagne bleibt fix. Ruleset 2: **Warrior(STR/VIT), Mage(INT/WIL), Rogue(AGI/PER)**. Basic Attack automatisch, zwei frei gewählte Starter aus Klassenpool, passendes Starterkit. Alte fünf Klassen/NPC-Vorlagen nur in Ruleset 1.
- Nach Erstellung keine festen Skill-/Evolutionsbäume und kein versteckter Katalog alter Klassenskills. Neue Definitionen entstehen aus legitimer Erfahrung, Lernen, Training, Entdeckung oder Entwicklung und kalibrierten Bausteinen. Class Affinity beeinflusst Lern-/PP-Geschwindigkeit, nicht Schaden; Fähigkeiten klassenübergreifend lernbar.
- Die Engine komponiert und validiert Zahlen, Rang/Complexity, Tags und Effekte. Seltene gebündelte Forge-Aufrufe gestalten Name und getrennte beschreibende Erscheinung, nie zusätzliche Mechanik. Keine regelmäßigen Zusatzaufrufe im Kampf.
- Definition und Besitz sind getrennt; gebuchte kampagneneigene Definitionen bleiben unveränderlich und Engine-owned. Kein Freitext-Code oder PER-Schadenskanal. Passives und Klassenmerkmale verwenden gemeinsame Effekt-/Summengrenzen; höhere Maxima füllen Ressourcen nicht auf.
- Jede Klasse darf jede Waffe verwenden. Bow Shot kommt mit gehaltenem Bogen und geht mit ihm, ohne Proficiency oder Klassenwechsel. Gelernte Waffentechniken sind normale Skills.
- Trainierte menschliche NPCs: Basic Attack plus zwei deterministisch gewählte/persistierte Starter; untrainierte Personen nur ihre tatsächliche Waffe. Rolle und Waffe aus der Welt, kein Trainingsnachweis allein durch Feindseligkeit/Lager/Waffenbesitz. Erfahrene NPCs können belegte eigene Skills/Passives besitzen, ohne starre Levelquoten oder teure Forge für Nebenfiguren.
- Heil-/Ressourcenskills wirken nur mechanisch; Rückgabe von MP/STA nur aus der jeweils anderen Ressource und nie mehr als bezahlt. HP/Barrier/Effekte ganzzahlig, keine Ressourcenzyklen.

### Kanonische Passive-Lore und Qualitätsstufen – verbindlicher Beschluss 23.10.2026

Eine Passive ist eine dauerhaft erworbene Eigenschaft oder geprüft automatisch wirkende Fähigkeit, kein temporärer Segen/Trank. „Bleibender Abdruck“ ist ein Lorebild, keine universelle Seelenmagie. Herkunft oder Klasse garantieren keine Erweckung, latentes Talent ist kein Besitz.

| Qualität | Verbindliche Bedeutung |
|---|---|
| **Ordinary** | Schwache erlernbare Disziplin, etwa kleiner Core-Stat-Bonus; keine Garantie für kurze Routine, Tagesarbeit oder Level-up. |
| **Rare** | Seltene individuelle Vertiefung aus außerordentlicher Eignung/Bewährung, Erleuchtung oder bestätigter Entdeckung. |
| **Legendary** | Sagenhafte charakterprägende Entfaltung; kein automatischer S-Rang und kein Umgehen der Effektgrenzen. |

Training, persönliche Erfahrung/Anpassung und außergewöhnliche Entdeckung sind gleichberechtigte Quellen ohne Pflichtquote oder pauschalen Budgetvorrang. Seltene Qualität verlangt entsprechend besondere Enginebelege; kein bloßer Kill-/Nutzungszähler, keine festen späteren Passive-Bäume oder Starter-Passives. Zufallsentscheidungen nur gespeichert/replaystabil, Seltenheit primär über Ereignisqualität.

**Kapazität und Entscheidung:** Unter B-Rang höchstens **vier Passives insgesamt**, gleiche Slots für alle Qualitäten, auch bei NPCs. Angebot erst am nächsten geeigneten sicheren Zeitpunkt außerhalb laufenden Kampfs, ohne Pflichtschlaf; Erwerb nur nach ausdrücklicher Annahme. Offene Angebote bleiben gespeichert. Bei vier belegten Slots kann ein legitimes neues Rare/Legendary genau ein ausdrücklich gewähltes altes Passive dauerhaft **atomar** ersetzen. Ordinary kann keinen fünften Platz schaffen. Keine freie Respezialisierung oder kostenlose Wiederherstellung; Herkunft/Austausch bleiben nachvollziehbar. B+-Kapazität offen, technisch keine zusätzlichen Plätze erfinden.

**Einmaligkeit und Stones:** Ablehnung entscheidet den konkreten Entwicklungsbeleg; neue echte Erfahrung darf neue Entwicklung ermöglichen, nicht derselbe Beleg erneut würfeln. Ablehnen verbraucht keinen Stone, erfolgreiche Annahme eine Einheit atomar. Passive Stones nur **Rare/Legendary**, außerordentlich selten und wertvoll, keine Ordinary-Stones und kein gewöhnliches Ladenangebot. Nur Engine-validierte vertrauenswürdige Quellen, kein mechanisches Artefakt aus beliebigem `object.new`. Aktive Skill Stones sind davon getrennt.

Alle Erwerbswege nutzen dieselbe Definition/Besitz-/Eventlogik und gemeinsame Effektcaps, keine PP-Leiste für Passives und keine parallele Bonusengine. Zeitbuffs oder neue automatische Welt-/Stealthreaktionen sind eigene spätere Features. Die alten Einschränkungen „Core-Stats unmöglich“ und „Annahmeweg offen“ sind überholt: [9C-2c-Implementierung und historische Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Aktuelle Nachweise in 03.

### Patch 9C – verbleibende verbindliche Gameplayregeln, historische Details in Git

Implementiert im [Abschluss .52 /79c8e36](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36); Werte sind kalibrierbar, kein neuer alter Patchauftrag.

- Neue Skills brauchen legitime Quelle und konkretes Lernvorhaben; Tageslernzeit/LP und Affinität zählen mechanisch. PP und LP können im selben Kampf wachsen. Lehrer, gewöhnliche Stones und Manuals beginnen F/C1; stärkere Formen durch legitime Entwicklung, keine D–S-Freigabe.
- Durchbrüche und Evolutionen nur nach belegtem Angebot und ausdrücklicher Annahme; höchstens drei offene Entwicklungsangebote insgesamt und eines je Skill. Einmalige Belege, Replay-/Swipe-Sicherheit.
- Evolution braucht P5 und mindestens zwei weitere unterschiedliche qualifizierende Kampferfahrungen mit passendem Muster, nicht nur volle PP. Nachfolger ersetzt Vorgänger, übernimmt erreichte Proficiency mit 0 PP und gespeicherter Abstammung. Basic Attack bleibt. Mechanisch wirksame Schritte nur aus vorhandenem Effektrepertoire.
- Nichtkampf-Passivebelege aus verschiedenen echten erfolgreichen nichttrivialen Engineprüfungen über verschiedene Features/Tage, keine erzählten Erfolge. Gleiche außergewöhnliche Kämpfe erzeugen nicht beliebig neue Rare-Angebote.
- Geeignete trainierte NPCs ab vorläufig Level 5 erhalten höchstens eine deterministische persistente Signatur vor dem Snapshot; keine erfundenen Trainingsstufen oder automatisch unbeherrschten Angriffe.

### Patch 9D – bindende F→E-Klassenentwicklung, historische Durchführung archiviert

Implementiert .55–.57, [Startcommit6777e6c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6777e6c02bc3c06f3a4d14ef82fb9e2c5b42c091). Fixture-Abnahme ist kein natürlicher Level 1→15-Nachweis.

- Klassenevolution beim Power-Rank-Aufstieg, erstmals F→E Level 15. Rank steigt sofort; Klasse aus einmalig fixierten gewöhnlich2–3 Normal-/Rare-Optionen nach ausdrücklichem Entscheid im sicheren Zeitpunkt. Aufschieben würfelt nicht neu; andere Angebote blockieren nicht. Basisklasse/Favored Stats bleiben.
- Eine enginevalidierte aktive E-Klasseneigenschaft außerhalb der vier Passive-Slots, aber mit gemeinsamen Caps. Spätere Evolution ersetzt das Merkmal, keine Stapelung.
- Qualität aus tatsächlicher persönlicher Beteiligung und Herausforderung, kein Last-Hit-/Farmtrick. Erste Evolution höchstens Rare; kein fester Klassenbaum.
- Evolutionshistorie bleibt; vorläufige Vermächtniswertung Normal 1 / Rare 2 / Legendary 4 begrenzt das jeweils aktive Budget. D–S-Skalierung/B+-Kapazitäten offen. Keine synthetische Fixture-Vorgeschichte in echten Saves und keine Ruleset-1-Umschreibung.

## 9. UI und technische Komfortprinzipien

Kompakte lesbare System-/Combat-Karten statt improvisierter Narratortracker. Combat-HUD zeigt tatsächliche Skills, Kosten und Wirkungen; bestehende nützliche CSS/QoL erhalten. Kleine UI-Fixes brauchen kein Redesign. Mobility- und Defensivbalance nur im passenden Fachpatch, alte Patch-9-Blinkwerte sind keine aktuelle Spezifikation.

## 9a. Noch offene Video-Gameification-Kandidaten – ausdrücklich KEIN neuer Kanon

Engine-only-Board/Handel, sichere Rest-/Wait-/Wegabläufe, Quick Replies, ROAD AHEAD, risikogerechte Rast und zusätzliche Ausführungsprofile bleiben [Ideen/Planung in 04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), keine pauschale Produktfreigabe. Keine sichere Vollregeneration im gefährlichen Dungeon allein aus einem späteren UI-Fastpath ableiten. Erledigte HUD-/Patch-9-Arbeit nicht erneut als neues Projekt starten.

## 10. Explizit unerwünschte Auswüchse

Keine Pflicht-Continues, Beweistrophäen, Traglast-/Routinebürokratie, Temperament-/Fluchtloops, versteckte PC-Levelanpassung, unbeschlossenen Farm-Nerfs, vollständigen NPC-/Pathfinding-Simulationen, zweiten Zustandsquellen, starren Dungeonabläufen, unnötigen LLM-Aufrufen oder Architektur-/Balanceumbauten als Nebenfolge kleiner Bugs. Keine autonomen freiwilligen PC-Handlungen.

## 11. Lesen und Aktualisieren

Nur neue ausdrückliche Designentscheidungen ändern diesen Kanon. Reviews sind Hinweise, kein Beschluss. Unterschiede zu Produktcode, Lore und Narrator-Vertrag benennen; Implementierungs-/Teststand nur in 03, Ideen in 04, technische Nachweise in Dev-Patchnotes. Historische Regeln nur gezielt über die verlinkte Vorfassung nachlesen.
