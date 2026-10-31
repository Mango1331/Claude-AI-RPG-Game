# Avereth Engine – verbindlicher Design-Kanon

**Stand: 31.10.2026.** **[VERBINDLICH]** beschreibt Regeln und Ziele, **[GEPLANT]** einen noch nicht umgesetzten Beschluss, **[OFFEN]** eine mögliche spätere Idee. **Implementierungs- und Abnahmestand nur in [03](03_AKTUELLER_PROJEKTSTAND.md).** [Ausführliche historische Fassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/02_DESIGN_KANON.md); neue Entscheidungen ändern diesen Kanon, technische Patchdetails gehören in Fachpatchnotes.

## 0. Aktuelle Kompatibilitätsentscheidung

**[VERBINDLICH]** Aktuelles Ziel ist **V4-C / Ruleset 2**. Alte V3-, V4-A-, Ruleset-1- und frühere F-Zahlenkampagnen müssen weder weiter unterstützt noch migriert werden. Ihre Exporte bleiben Belege, keine Entwicklungsgrenze. Der Startversionsschutz und die aktuelle F-Policy aus [B1 .130/.131](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc71256) sind implementiert; **ein heute neuer Kampagnenstart muss trotzdem zuverlässig funktionieren**, einschließlich echter SillyTavern-Makroauflösung. Eventlog, Save/Reload, Edit, Swipe und Regenerate innerhalb der aktuellen Konfiguration bleiben verbindlich. Laufende Batches nicht auf neue Builds umstellen.

Delivery/Escort bleiben ruhend **erhalten**, einschließlich echter Übergaben und freier Begleitungen; nur automatisch neue Angebote sind ausgesetzt. Kein pauschaler Legacy-Codeabbau ohne Prüfung gemeinsam genutzter Funktionen. [Architekturplan A–F](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md).

## 1. Spielerfahrung und Prioritätensystem

**Spielerhoheit, bedeutsame Entscheidungen, Spaß, Tempo, nachvollziehbare Folgen und freie High-Fantasy-Entwicklung** gehen vor Simulationsbürokratie. Keine zusätzliche Pflichtbestätigung, künstliche Zwischenschritte oder neue Mechanik allein zur technischen Vollständigkeit.

## 2. Zuständigkeiten von LLM und Engine

- **LLM/Planner:** Sprache, Referenzen, Absichten und Weltkontext verstehen. Hypothesen, Fragen, NPC-Zitate und Wünsche sind keine autorisierten PC-Aktionen.
- **Engine:** Zahlen, Kampf, Zeit, Orte, Ressourcen, Inventar, Geld, Quests, Fertigkeiten, Population und Zustand deterministisch prüfen und über Events buchen.
- **Narrator:** freie, glaubwürdige Prosa, Dialoge und autonome lokale Weltreaktionen; bestätigte Mechanik, PC-Agency und belegtes Wissen respektieren.
- **Extractor/Firewall:** erzählte Weltänderungen strukturiert und sicher übernehmen; keine freiwilligen PC-Entscheidungen nachträglich erfinden, keine fremde Engineautorität.
- **NPC-Wissen:** nur Wahrgenommenes oder aus legitimer Quelle Erfahrenes. Ungesprochene PC-Ziele bleiben unbekannt.
- **Integrität:** kein Spielzug aus defektem Event-Fold; kein stiller Doppelstart, keine doppelte Buchung bei Swipe/Reload/Regenerate.

**Ankunft und Reise:** Nur autorisierte, bestätigte und chronologisch gültige `arrive`-Deltas bewegen den PC. Kompakte Reisen samt realen Zwischenereignissen bleiben erlaubt; ein vorgeschlagener Zielort ist noch keine Ankunft. Kein eigenmächtiger Ortswechsel.

**Handel:** Eine konkrete Kauf-/Verkaufszusage gilt nur für den jeweiligen Vorgang. Waren, Mengen, Verkäufer, Ort und Preisbedingungen müssen stimmen; ein Angebot allein ist keine Zustimmung. **[VERBINDLICH, implementiert D .133–.136]** Reguläres F-Gear besitzt ein eindeutig ausgewiesenes Engineprofil und verbindlichen Enginepreis. Zweierpaket bedeutet zwei identifizierbare Zeilen. Bei korrigiertem/neuem Preis ist eine Buchung im selben Zug nur mit eindeutigem Kaufwillen und eingehaltenem ausdrücklich gesetztem `max_cp` möglich; `any_price` allein reicht dafür nicht, und `max_cp` bleibt auch zusammen mit `any_price` bindend. Eindeutige Einzelkäufe und ausdrücklich ausgenommene Artikel dürfen nicht durch Paketheuristik blockiert werden. Sonst Angebot offen lassen; keine stillen Teilkäufe. Flexible Dienste/Geschenke/Verkauf/E+-Gear behalten ihre eigenen Regeln. [D-Produktcommit](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bc44df1), [Reviewabschluss .136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926), [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md).

SillyTavern ist aktueller Host, aber kein notwendiger Teil der Spielwelt. Sprachmodelle bleiben austauschbar.

## 3. Figurenhoheit, Erzählstil und autonomes Worldbuilding

**[VERBINDLICH]** Spieler bestimmt freiwillige Bewegung, Worte, Gedanken, Zustimmung, Questwahl, Angriffsziele, Skills und Beziehungen. Gewöhnliche Teilbewegungen einer bereits gewählten Handlung sind zulässig; neue freiwillige Ziele nicht. Äußere Kräfte dürfen kausal wirken. Kein Plot-Armor, erfundenes Fremdwissen oder Zurücksetzen etablierter Fakten.

Narratorstil: **Englisch, dritte Person, Vergangenheit**; lebendige Wahrnehmung und Dialoge statt Prosa-Systemtracker. NPCs dürfen eigene Interessen haben, helfen, täuschen, ablehnen, kämpfen und sterben. Figuren, Orte, Fraktionen und Konsequenzen bleiben konsistent. Alaric Red ist eine Testfigur, keine Startpflicht.

## 4. Allgemeines Pacing und Quality of Life

- Gewähltes Ziel ohne künstliches „I continue“ über belanglose Reise-/Suchschritte hinweg verfolgen, bis etwas Relevantes passiert oder eine echte Entscheidung entsteht.
- Gewähltes Ziel bleibt die Grenze: Wald betreten autorisiert nicht automatisch das Betreten einer Höhle. Suche soll konkreten Erkenntnisgewinn haben.
- Automatisches Loot nach echtem Sieg, **keine Trophäenpflicht** als Jagdbeweis, keine Traglast-/Packverwaltung.
- Pouch als Komfortinventar, bewusst ausgerüstete oder getragene Gegenstände bleiben physisch.
- Keine künstlichen Unterschriften, Rückgaben, Beweisabgaben; echte Lieferungen/Reparaturen behalten notwendige Übergabe/Abnahme.

## 5. Kampf und Progression

**[VERBINDLICH]** Engine besitzt Initiative, Reichweite, Deckung, Kosten, Treffer, Schaden, Tod und Flucht; keine heimliche Zielumdeutung oder Ressourcenabgabe für abgelehnte Handlung. Zusammengehörige Feinde kämpfen gemeinsam, bleiben aber individuelle Gegner; neutrale oder entfernte Wesen treten nicht automatisch bei. Kapitulation ist kein Kill/Defeat-XP. Monsterstärke folgt Ort, Population, Rank und Profil, **nie dynamisch dem PC-Level**.

- **PC-Startwerte:** sechs Kernstats STR/VIT/AGI/INT/PER/WIL auf Basis 7 und +1 auf zwei klassentypische Favored Stats; [implementiert .91](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b55a897).
- **Outdoor:** Levelspannen aus lokalem Gebiet/Vorfahr, individueller Vorgabe oder expliziter Population; keine künstliche PC-Skalierung und keine automatische Gegnergenerierung beim Boardlesen. [Gebietsfix .124](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/97d0976), [Population/Alter C .132](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8908850).
- **Jagdcredit:** bestätigte Populationszugehörigkeit, Alter (`adult`/`young`), individuelle Stärke und tatsächlicher Sieg/erlaubte Flucht bestimmen den Credit; keine Gleichsetzung bloß ähnlicher Namen. Dungeon-/Einzelziele bleiben getrennt. [C-Abnahme](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md#5-paket-c--ausdrückliche-population-alter-und-individuelle-identität).
- **XP:** der aktuelle experimentelle F-Versuch benutzt Faktor 5 bei unveränderten Levelschwellen; kein automatischer Farmnerf. [Implementiert .121](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f1). Endgültige F-/E-Balance offen.
- **Proficiency:** P1–P5 wächst durch echte qualifizierende Verwendung (höchstens einmal je Skill/Kampf); keine PP durch triviale Wiederholung, Prosa oder nicht ausgeführte Aktionen. Qualifizierter offensiver Einsatz kann auch beim Sofortsieg zählen, Defensive/Utility brauchen eigene Belege; P5 allein ist keine Evolution. [PP-Anpassung .123](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c300f3d).
- **AoE:** seit [.116](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/41a17fc) trifft Flächenangriff alle gültigen Ziele **im gewählten Reichweitenband**, nicht automatisch alle anderen Bänder. Friendly Fire bleibt. Aktuelle F-Startervarianten umfassen Cleave, Arcane Wave und Fan of Blades; weiterhin zwei freie Starterwahlen. Erweiterte Raumgeometrie nur als [offene Idee](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).
- **Skills im HUD:** Besitz, Kosten und Wirkung verständlich anzeigen; Balanceänderungen sind eigene Aufträge. [F-Testkalibrierung](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/89aaf08).

**[GEPLANT – nicht implementiert] Main/Minor:** pro normalen Turn maximal eine Haupt- und eine Nebenaktion; normale Ein-Band-Bewegung und Mobility verwenden denselben Minor-Slot, kein Gratisbewegungsbudget. PC-/NPC-Parität, Besitz und Turnpersistenz schützen. Alte Kompatibilitätsanforderungen des [ursprünglichen Fachplans](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) vor Umsetzung gegen aktuelle Policy prüfen.

## 6. Quests und Gilde

**[VERBINDLICH]** Nur Gildenquests sind formal; Hilfe, Gefallen, Rettung, Arbeit und Geschenke bleiben freie Weltvorgänge, keine formalen Privatquest- oder automatischen XP-Ereignisse. Tatsächliche vereinbarte Bezahlung bleibt möglich. [Umsetzung .83](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b70bd1f).

- Automatisches Board: **4 Jagden + 1 geeignete Dungeon-Ebenenräumung**, andernfalls 5 Jagden; sinnvoller F-Einstieg und höhere Zielspannen. Boardlesen erzeugt weder Monster noch Ortswechsel. [Abschluss .87](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1584dd7).
- Jagden zählen tatsächliche, zeitlich passende individuelle Ergebnisse der gebundenen Population; keine bloße Behauptung/Trophäe. Dungeon-Clearance beruht auf erfolgreichem tatsächlichem Floor-Clear, nicht willkürlichen Killzahlen.
- Vorerst keine neuen mechanisch überlappenden gezählten Jagdverträge auf dieselbe Population/Encounter. Keine doppelte Auszahlung, keine Kill-Verbrauchsbuchhaltung. Unterschiedliche Einzel-/Boss- und Clearanceziele bleiben möglich. [Schutz .120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f); [spätere Freiheiten](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).
- Etablierte, belegte Gildenfilialen auch in neuen Siedlungen können Aufträge annehmen und ausgeführte Verträge bezahlen, **aber nur bei tatsächlicher/autorisiert bestätigter Anwesenheit**. Keine automatische Reise oder neue Quest durch bloße Namensnennung. [Filialen .117–.120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9a76eb).
- Aufträge/Annahmen, Mengen, Fortschritt, `READY`, Abgabe und Geld/XP werden von der Engine geführt. Angebote werden nicht heimlich durch fremde Abenteurer entfernt.
- **Delivery/Escort:** ruhend, nicht abgeschafft. Bestehende mechanische Transfers, Mengen, Empfänger/Ziele, Belohnungen und freie Übergaben bleiben möglich; keine automatisch neu angebotenen Liefer-/Escortaufträge und keine künstliche zusätzliche Abnahmebürokratie.

## 7. Dungeon-Design: langfristig verbindliche Videospielstruktur

Dungeons sind gemeinsame persistente Weltorte (keine privaten MMO-Instanzen), mit eigenem Gate, Etagen, Kapazität, Gegnerpopulation, Ressourcen, Bossen/Guardians und spielzeitgebundenem Reset. Stärke folgt Dungeon/Etage, nicht PC-Level. Engine besitzt Slotidentität, An-/Abwesenheit, Kämpfe, Clear, Loot und Reset; Narrator gestaltet innerhalb der Fakten. Keine Pflichtfolge von drei Kämpfen oder universelle Raumstruktur.

Andere Abenteurer können dieselben Gegner/Ressourcen nutzen; fremde Siege geben keinen PC-Credit. Floor-Clear folgt den vorher festgelegten Bedingungen, nicht zwingend der Tötung aller Lebewesen. Gefahren dürfen tödlich sein, müssen aber nachvollziehbar werden. Sichere bekannte Rückwege können kompakt erzählt werden; keine kostenlosen universellen Teleports. Gewöhnliche Höhlen sind nicht automatisch System-Dungeons. [Patch-8-Grundlagen](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md), [Slot-/Anwesenheitsdetails](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md).

## 8. Welt, Lore und organische Klassen

Avereth ist High Fantasy ohne moderne Technik. Menschliche Großmächte: **Valedorn Crown, Caelreth, Duskreach**; Monsterreiche: **Ashen Scale Dominion, Verdant Fang Court**. Menschen sind die normale menschliche Zivilisation, keine automatische Einführung klassischer intelligenter Fantasyvölker. Monster können Tiere, intelligente Wesen oder Gesellschaften sein, nicht grundsätzlich Feinde. Adventurers' Guild ist transnational, aber kein Weltstaat; seltene S-Ranks lösen nicht jedes Problem.

**Ruleset 2:** Warrior (STR/VIT), Mage (INT/WIL), Rogue (AGI/PER); Basic Attack und **zwei frei gewählte Starterfähigkeiten**. Danach keine festen Skill- oder Klassenbäume. Skills, Passives und Klassenentwicklung beruhen auf echter Erfahrung, Training, Lernen, Entdeckung und geprüfter Annahme. Engine erzeugt/validiert Effekte, Zahlen, Kosten und Besitz; LLM darf beschreiben und Namen anbieten, nicht zusätzliche Wirkungen erschaffen. Definitionen bleiben persistiert, kein Freitext-Code. Klassenzugehörigkeit ist Affinität, keine Exklusivität für andere Skills/Waffen. Bow Shot ist an den gehaltenen Bogen gebunden.

Trainierte menschliche NPCs haben passenden, persistierten Skillbestand, gewöhnliche NPCs keine kostenlosen Zusatzfähigkeiten. Ressourcenfähigkeiten dürfen weder unendliche Ressourcenzyklen schaffen noch ungebuchte Heilung auslösen.

### Passive-Lore und Qualitätsstufen

Eine Passive ist ein bleibendes erworbenes, enginegebuchtes Merkmal, kein zeitbegrenzter Segen. **Ordinary** = schwache erlernbare Disziplin, **Rare** = außergewöhnlich belegte individuelle Entfaltung, **Legendary** = sagenhafte charakterprägende Entwicklung. Qualität folgt belegter Ereignisbedeutung, nicht Pflichtwürfen/Farmzählern. Kein automatisches Starterpassive.

Unter B-Rang höchstens **vier Passive-Slots insgesamt**, unabhängig von Qualität und auch für NPCs; Erwerb im sicheren Moment nur nach ausdrücklicher Zustimmung. Bei vier Slots kann ein legitimes Rare/Legendary **genau ein ausdrücklich gewähltes altes Passive atomar ersetzen**; keine freie Rücknahme. B+-Kapazität offen. Passive Stones nur Rare/Legendary und äußerst selten; aktive Skill Stones getrennt, Besitz nur aus validierten Quellen. Gemeinsame Effektcaps, keine parallele Bonusengine. [9C-Abschluss .52](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36).

### Skills und Klassenentwicklung – implementierte Regeln

- Gelernt wird durch legitime Quelle/Vorhaben, Zeit, LP/Affinität und tatsächliche Übung; gewöhnliche Lehrer/Stones/Manuals beginnen auf F/C1.
- Maximal drei offene Entwicklungsangebote und eines je Skill. P5 und **mindestens zwei weitere unterschiedliche qualifizierende Erfahrungen** für Evolution; Nachfolger ersetzt Vorgänger und erbt Proficiency auf **0 PP**. Basic Attack bleibt.
- Passive-Nichtkampfbelege verlangen unterschiedliche echte erfolgreiche Engineprüfungen über Features/Tage; identische Ereignisse spammen keine Rare-Angebote. Geeignete trainierte NPCs ab vorläufig Level 5 können eine persistente Signatur erhalten.
- **F→E bei Level 15:** Power-Rank steigt, eine angebotene Normal-/Rare-Klassenentwicklung wird **erst nach ausdrücklicher Annahme** aktiv; gewöhnlich 2–3 einmalig festgelegte Optionen, keine Neuwürfel durch Aufschub. Klassenfeature außerhalb der vier Passive-Slots, aber mit gemeinsamen Caps. Basisklasse und Favored Stats bleiben; erster Wechsel maximal Rare. D–S und B+-Budget sind offen. [9C-Abschluss](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36), [9D-Startimplementierung](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6777e6c).

## 9. UI und technische Komfortprinzipien

Lesbare System-/Combat-Karten statt Narratortracker, vorhandene CSS/QoL behalten. Optionale Quick Actions, Engine-only-Board/Handel, sichere Rest-/Wait-Wege und zusätzliche AoE-Geometrie sind **[OFFEN]**, keine implizite Freigabe. [Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

## 10. Explizit unerwünschte Auswüchse

Keine Pflicht-Continues, Beweistrophäen, Traglast, Temperament-/Fluchtloops, versteckte PC-Levelanpassung, Farm-Nerfs ohne Beschluss, umfassende NPC-/Pathfinding-Simulation, zweites Zustandsmodell, starres Dungeon-Drehbuch, unnötige LLM-Aufrufe oder Architektur-/Balanceumbauten als Nebenfolge kleiner Bugs. Keine autonomen freiwilligen PC-Handlungen.

## 11. Pflege

Nur ausdrücklich neue Designentscheidungen hier eintragen. Kein Patchlog, keine Teststatistiken und keine „noch geplant“-Behauptung für umgesetzte Regeln. Aktueller Stand in [03](03_AKTUELLER_PROJEKTSTAND.md), Ideen in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), Detailnachweise im jeweiligen Commit/Fachpatch.
