# Avereth Engine – verbindlicher Design-Kanon

**Stand 09.11.2026 · geltende Spielregeln mit NPC E3.** **[VERBINDLICH]** bezeichnet geltende Regeln, **[GEPLANT]** einen noch nicht umgesetzten Beschluss, **[OFFEN]** eine unbeschlossene Option. Tatsächlicher Implementierungs-/Abnahmestand ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md), technische Detailquellen in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). [Ungekürzte Vorfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/02_DESIGN_KANON.md).

## 0. Aktuelle Kompatibilitätsentscheidung

**[VERBINDLICH] V4-C / Ruleset 2.** Alte V3-/V4-A-/Ruleset-1- und frühere F-Zahlenkampagnen brauchen keine allgemeine Unterstützung oder Migration; ihre Exporte bleiben Originalbelege. Neue Kampagnen müssen einschließlich echter ST-Makroauflösung zuverlässig starten. Eventlog, Save/Reload, Edit, Swipe und Regenerate der aktuellen Konfiguration schützen; laufende Batches nicht unbemerkt aktualisieren.

Delivery/Escort bleiben ruhend erhalten, einschließlich echter Übergaben und freier Begleitungen; nur automatisch neue Angebote sind ausgesetzt. Gemeinsam genutzte Funktionen nicht als vermeintlichen Legacy-Code entfernen.

## 1. Spielerfahrung und Prioritätensystem

**Spielerhoheit, bedeutsame Entscheidungen, Spaß, Tempo, nachvollziehbare Folgen und freie High-Fantasy-Entwicklung** gehen vor Simulationsbürokratie. Keine zusätzlichen Pflichtbestätigungen, künstlichen Zwischenschritte oder Mechaniken allein zur technischen Vollständigkeit.

## 2. Zuständigkeiten von LLM und Engine

- **LLM/Planner:** Sprache, Referenzen, Absichten und Weltkontext verstehen. Fragen, Hypothesen, NPC-Zitate und Wünsche sind keine autorisierten PC-Aktionen.
- **Engine:** Zahlen, Kampf, Zeit, Orte, Ressourcen, Inventar, Geld, Quests, Fähigkeiten und Population deterministisch prüfen, berechnen und als Events buchen. Zustand aus dem Eventlog falten, keine zweite frei veränderbare Zustandsbank.
- **Narrator:** freie glaubwürdige Prosa, Dialoge und lokale Weltreaktionen innerhalb bestätigter Mechanik, Spielerhoheit und belegter Wissensgrenzen.
- **Extractor/Firewall:** zulässige erzählte Weltfolgen strukturiert übernehmen, keine freiwilligen PC-Entscheidungen nachträglich erfinden oder Engineautorität übernehmen.
- **NPC-Wissen:** nur Wahrgenommenes oder aus legitimer Quelle Erfahrenes; ungesprochene PC-Ziele bleiben unbekannt. Ein tatsächlich gemeinsam erlebter Vorgang bleibt etabliert, auch wenn seine technische Wissensbuchung fehlschlägt. Buchung korrigieren, kein rückwirkendes Weltretcon.
- **Integrität:** kein autoritativer Spielzug auf defektem Fold, kein stiller Doppelstart oder Doppelbuchung. Mechanisch gültige Handlungen dürfen nicht dauerhaft an falscher Identität, Anwesenheits- oder Inventarauflösung scheitern. Seltene fortsetzbare Erzählwidersprüche bei korrektem Zustand sind tolerierbar, dauerhafte Blockaden nicht.

**Ankunft/Reise:** Nur autorisierte, bestätigte und chronologisch gültige `arrive`-Deltas bewegen den PC. Kompakte Reisen mit realen Zwischenereignissen sind erlaubt; vorgeschlagenes Ziel oder erzählte Ankunft allein ist keine Buchung.

**Stealth als Vorgehensweise:** Zusammenhängende schleichende Bewegung verdrängt ihr Vorhaben nicht. GO, vorbereitete Reisefortsetzung und lokaler Ein-Band-Schritt nutzen bestehende Weg-/Ankunfts-/Wahrnehmungsregeln. Detection am tatsächlich erreichten relevanten Ort gegen tatsächliche Beobachter, bei Dungeonankunft nach Population. Zielgebundenes Anschleichen gilt weder für frühere Zwischenhalte noch spätere unabhängige Züge. Kein garantierter Erfolg, freier Angriff, Tür-/Combat-Bypass oder dauerhafter Stealthmodus. Suche/Aufnahme gesondert nach [S1/S2-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md).

**Handel und Zustimmung:** Zusage gilt nur für den konkreten Vorgang; Waren, Menge, Verkäufer, Ort und Preisbedingungen müssen passen. Angebot ist keine Zustimmung. Reguläres F-Gear besitzt eindeutiges Engineprofil und verbindlichen Enginepreis; Zweierpakete brauchen zwei identifizierbare Zeilen. Bei korrigiertem/neuem Preis im selben Zug nur mit eindeutigem Kaufwillen und eingehaltenem ausdrücklich gesetztem `max_cp` buchen. `any_price` allein genügt dafür nicht; `max_cp` bleibt auch zusammen damit bindend. Keine stillen Teilkäufe; eindeutige Einzelkäufe und ausdrücklich ausgenommene Artikel nicht durch Paketheuristik blockieren. Flexible Dienste, Geschenke, Verkauf und E+-Gear behalten ihre Fachregeln.

**Freie Zahlungen/Endpreis:** Freie ausgehende Zahlungen nur über sichtbare Karte und eigenständiges natives `#pay <ID>`; Käufe, Registrierung und Dienste behalten ihre Fachwege. Neue variable NPC-Angebote/Gebote benötigen eine ausdrücklich genannte verbindliche **Endsumme für das gesamte Los**. Keine mehrdeutigen erzählten Stück-/Positionspreise zusammenrechnen. Gespeicherte Enginepreise, Mengenrechnung, Warenkörbe, feste Gebote und ausdrückliche Preisgrenzen bleiben. [Finanzfachplan](patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md). Ein Engine-Shop ist ein separat zu entscheidender Alternativentwurf, kein Teil des geltenden Handelsdesigns.

SillyTavern ist aktueller Host, kein notwendiger Teil der Spielwelt; Sprachmodelle bleiben austauschbar.

## 3. Figurenhoheit, Erzählstil und autonomes Worldbuilding

**[VERBINDLICH]** Der Spieler entscheidet freiwillige Bewegung, Worte, Gedanken, Zustimmung, Questwahl, Angriffsziele, Skills und Beziehungen. Gewöhnliche Teilbewegungen einer gewählten Handlung sind zulässig, neue freiwillige Ziele nicht. Äußere Kräfte dürfen kausal wirken. Kein Plot-Armor, erfundenes Fremdwissen oder Zurücksetzen etablierter Fakten.

Narration **Englisch, dritte Person, Vergangenheit**; Wahrnehmung/Dialog statt Systemtracker. NPCs haben eigene Interessen, dürfen helfen, täuschen, ablehnen, kämpfen und sterben. Direkt zuvor etablierte soziale Gespräche, Grenzen und Bekanntheit dürfen durch eine Zwischenaktion nicht grundlos zurückgesetzt werden. Stimmung und Distanz dürfen sich plausibel unterscheiden; Flirt erzeugt keine automatische Zuneigung oder formale Quest. Alaric Red ist eine Testfigur, keine Startpflicht.

**[VERBINDLICH] NPC-Wiederbegegnungen.** Eine Ankunftskarte erinnert an eine bekannte Figur mit Bezug zum Zielort. Die Engine führt `met` als persönliche Wiederanwesenheit, wenn der bestätigte Ankunftsschritt und die erzählte Begegnung zusammenpassen. Die Rolle des Gildenbearbeiters und sein persönliches Bearbeitungswissen gehören der belegten Person. Sprecher und Identität bleiben an die jeweilige Figur gebunden. [E2-A](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/93acd574409bff44c39bd7bc203e526fc76da262/avereth-engine/docs/NPC_E2A_INTEGRITY.md) · [Kontrollreview zur Zeitfolge](patch_plans_10b/REVIEW_NPC_E2A171_PRODUKTDIFF_GPT.md).

**[VERBINDLICH] Persönliche Absprachen.** Absprachen und Schulden bleiben an ihre Art und gespeicherten Parteien gebunden. Die Engine ordnet eine Meldung ohne ID zu, wenn die bekannte Art und die gemeldeten Parteien passen und die Zuordnung eindeutig ist. `#npc` zeigt offene Absprachen zwischen der jeweiligen Figur und Alaric. Die Erzählerkarte kann eine eingelöste Absprache als `settled between you` zeigen, bis eine jüngere bedeutsame gemeinsame Erinnerung vorliegt. Der Erledigungsstatus bleibt bestehen. Eine gemeinsam vereinbarte Rückfrage zu einem aufgeschobenen bedingten Angebot begründet ausschließlich diese Rückfrage. [Entscheidungen D1, D4 und D6](patch_plans_10b/NPC_E2_E3_FACHPLAN.md#13-offene-designentscheidungen) · [Threadzuordnung `.173`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/dec75907ce970927722b6acf6608bdfa6b20256e/avereth-engine/docs/NPC_E2B173_THREAD_MATCH.md).

**[VERBINDLICH seit .174] NPC E3 – Persönlichkeitsanker.** Wenige dauerhafte Merkmale (`voice`, `manner`, `interest`) entstehen nur aus tatsächlich gezeigten eigenen Worten oder Handlungen der Figur, nicht aus Spielerzuschreibungen oder situativer Stimmung (D2). Frühestens eine spätere belegte Begegnung erlaubt einen Anker; mehrere Züge einer durchgehenden Anwesenheitsspanne zählen als dieselbe Begegnung (D3). Eine klare Beobachtung in dieser späteren Begegnung genügt; weitere belegte Erfahrungen dürfen einen Anker ändern, höchstens einmal je Merkmal und späterer Anwesenheitsspanne (D13). Kein Beziehungs- oder Temperamentspunktesystem. [E3-Regel R10 und Entscheidungen §13](patch_plans_10b/NPC_E2_E3_FACHPLAN.md).

## 4. Allgemeines Pacing und Quality of Life

- Gewähltes Ziel über belanglose Reise-/Suchschritte verfolgen, bis etwas Relevantes passiert oder eine echte Entscheidung entsteht; keine Pflicht-Continues.
- Ziel bleibt Autorisierungsgrenze: Wald betreten erlaubt nicht automatisch Höhleneintritt. Suche soll konkreten Erkenntnisgewinn haben.
- Automatisches Loot nach echtem Sieg, keine Trophäenpflicht als Jagdbeweis, keine Traglast-/Packverwaltung.
- Pouch als Komfortinventar; bewusst ausgerüstete/getragene Gegenstände bleiben physisch.
- Keine künstlichen Unterschriften, Rückgaben oder Beweisabgaben; echte Lieferung/Reparatur behält erforderliche Übergabe/Abnahme.

## 5. Kampf und Progression

**[VERBINDLICH]** Initiative, Reichweite, Deckung, Kosten, Treffer, Schaden, Tod und Flucht gehören der Engine. Keine heimliche Zielumdeutung oder Ressourcenabgabe für abgelehnte Handlungen. Zusammengehörige Feinde kämpfen gemeinsam, bleiben individuelle Gegner; neutrale/entfernte Wesen treten nicht automatisch bei. Kapitulation gibt kein Kill-/Defeat-XP. Stärke folgt Ort, Population, Rank und Profil, nie dynamisch dem PC-Level.

- **Start:** Neue Kampagnen beginnen mit STR/VIT/AGI/INT/PER/WIL jeweils Basis 5, +1 auf zwei klassentypische Favored Stats. Bereits gespeicherte Starts behalten ihre Werte; keine rückwirkende Umstellung.
- **Outdoor:** Levelspanne aus Gebiet/Vorfahr, individueller Vorgabe oder expliziter Population; keine PC-Skalierung oder Monstererzeugung beim Boardlesen.
- **Jagdcredit:** tatsächliche Populationszugehörigkeit, `adult`/`young`, individuelle Stärke und tatsächlicher Sieg/erlaubte Flucht entscheiden. Ähnliche Namen genügen nicht; Dungeon-/Einzelziele bleiben getrennt.
- **F-XP-Versuch:** Faktor 5 bei unveränderten Levelschwellen. Endgültige F-/E-Balance offen; kein automatischer Farmnerf.
- **Proficiency P1–P5:** echte qualifizierende Nutzung, höchstens einmal je Skill/Encounter. Offensive F-Skills zählen gegen tatsächlich getroffene Gegner bis **PC-Level−4** bei erfolgreichem überlebtem Kampf, einschließlich Sofortsieg. Defensive/Utility behalten eigene Wirksamkeits-/Bedrohungsbedingungen. PP-Basis, Affinitäten, Promotionskosten und LP-Raten bleiben gleich; keine PP aus Prosa, abgelehnten Aktionen oder Encounterverlängerung.
- **Evolution:** P5, zwei verschiedene passende echte Encounter, geprüftes Angebot und ausdrückliche Annahme. Belege dürfen vor/nach P5 entstehen; verbrauchte Belege/Vorgängeridentitäten nicht erneut verwenden. Nachfolger ersetzt Vorgänger, erbt Proficiency mit **0 PP**; Basic Attack bleibt. Maximal drei offene Entwicklungsangebote, eines je Skill. Ein Manual ist eine Quelle, kein Ersatz gebuchter Lernzeit.
- **Gewöhnliche Skill-AoE:** gegnerische Seite im gewählten bestehenden Wirkungsband treffen, unbeteiligte Neutrale/Verbündete schonen. Explizit angegriffene NPCs und autorisierte Gruppen bleiben gültige Ziele mit bestehenden Gewaltreaktionen. PC-/NPC-Parität bei Kampfeintritt und Trefferauflösung; narrative Begleitung allein macht keinen Verbündeten. Kosten, Treffer, Schaden und Bänder bleiben. Physische Explosivgegenstände, Fallen und Umwelt behalten ihre Wirkungen. Cleave, Arcane Wave und Fan of Blades bleiben freie Starteroptionen.
- **Eindeutiges Band-AoE:** Bei fehlender ausdrücklicher Zielwahl genau ein sichtbares, erreichbares gegnerisches Band als eindeutige Auswahl zulassen; mehrere Möglichkeiten klären. Ausdrücklich benannte oder ungültige Ziele nie still ersetzen.
- **Gefahrenanzeige:** Populations-Levelspanne, Vertragskillzahl und sichtbare Gegnerzahl trennen. Bekannte Gruppen-/Levelrisiken zeigen, keine verborgenen Gegner/Werte, Solo- oder Fluchtgarantie. Skills im HUD mit Besitz, Kosten und Wirkung verständlich darstellen; Balance separat entscheiden.

**[GEPLANT] Main/Minor:** pro normalem Turn maximal eine Haupt- und eine Nebenaktion. Normale Ein-Band-Bewegung und Mobility teilen denselben Minor-Slot; kein Gratisbewegungsbudget. PC-/NPC-Parität, Besitz und Turnpersistenz schützen. [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) vor Umsetzung gegen aktuelle Kompatibilitätspolitik prüfen.

## 6. Quests und Gilde

**[VERBINDLICH]** Nur Gildenquests sind formal. Hilfe, Gefallen, Rettung, Arbeit und Geschenke bleiben freie Weltvorgänge, keine formalen Privatquests oder automatische XP-Ereignisse; tatsächlich vereinbarte Bezahlung bleibt möglich.

- Board: **4 Jagden + 1 geeignete Dungeon-Ebenenräumung**, sonst 5 Jagden; sinnvoller F-Einstieg und höhere Zielspannen. Boardlesen erzeugt weder Monster noch Ortswechsel.
- Jagden zählen tatsächliche, zeitlich passende individuelle Ergebnisse der gebundenen Population; keine Trophäen-/Behauptungslösung. Clearance beruht auf wirklichem Floor-Clear, nicht willkürlicher Killzahl.
- Vorerst keine neuen mechanisch überlappenden gezählten Jagden auf dieselbe Population/Encounter. Keine Doppelzahlung oder Kill-Verbrauchsbuchhaltung; unterschiedliche Einzel-/Boss- und Clearanceziele bleiben möglich.
- Etablierte belegte Filialen können annehmen/auszahlen, auch in neuen Siedlungen, nur bei tatsächlicher/autorisiert bestätigter Anwesenheit. Keine Reise/neue Quest aus bloßer Namensnennung.
- Angebote, Annahme, Menge, Fortschritt, `READY`, Abgabe, Geld/XP und Rang sind Enginezustand. Angebote nicht heimlich durch fremde Abenteurer entfernen.
- Delivery/Escort ruhen, sind nicht abgeschafft. Transfers, Mengen, Empfänger/Ziele, Belohnungen und freie Übergaben erhalten; keine neuen automatischen Angebote oder künstliche Abnahmebürokratie.

## 7. Dungeon-Design: langfristig verbindliche Videospielstruktur

Dungeons sind gemeinsame persistente Weltorte, keine privaten MMO-Instanzen. Gate, Etagen, Kapazität, Gegnerpopulation, Ressourcen, Bosse/Guardians und spielzeitgebundener Reset gehören zur verbindlichen Struktur. Stärke folgt Dungeon/Etage, nicht PC-Level. Engine besitzt Slotidentität, Anwesenheit, Kampf, Clear, Loot und Reset; Narrator gestaltet innerhalb dieser Fakten. Keine Pflichtfolge dreier Kämpfe oder universelle Raumstruktur.

Andere Abenteurer können dieselben Gegner/Ressourcen nutzen; fremde Siege geben keinen PC-Credit. Clear folgt vorher festgelegten Bedingungen, nicht zwingend der Tötung aller Lebewesen. Gefahren dürfen tödlich sein, müssen nachvollziehbar werden. Sichere bekannte Rückwege dürfen kompakt erzählt werden, keine universellen Teleports. Gewöhnliche Höhlen sind nicht automatisch System-Dungeons. [Fachgrundlagen](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md).

## 8. Welt, Lore und organische Klassen

**[VERBINDLICH seit .162 für Ruleset-2-Planner-Kampagnen: Paket A] PULSE:** Höchstens **ein gemeinsamer deterministischer Ereigniswurf je geeignetem erzählendem Spielerzug** (Schlüssel Kampagnen-Seed + Zugnummer; weder Uhrzeit, Befehlsnummer noch Wortlaut). **ROAD AHEAD ist der Reiserahmen dieses Fensters**, kein zweiter Reisewurf; es zählt die erste Exposition in Planreihenfolge (autorisierter Reiseabschnitt oder gebuchte Pause), sonst die Szene. Rahmen Reise/Wildnis/Siedlungsstraße/Innenraum **und Tageszeit** (Tag/Abend/Nacht) bestimmen Grundchance und grobe Ereignisart (`meeting`, `life`, `trouble`, `obstacle`, `trace`, `strange`, `danger`; Stadt und Innenräume ohne `danger`). **Nach jedem echten erfolglosen Wurf steigt die nächste Chance relativ und gedeckelt** (`min(60 %, 1,75 × Basis, Basis × (1 + 0,15 × Fehlwürfe))`), ein offenes Fenster setzt die Serie zurück; Kampf/`pending_combat`, anwesende Bedrohung, Systemabfragen, ungültige oder wiederholte Eingaben, Lernen, offene Preise, reine Boardzüge, DUNGEON-AHEAD-Züge, aktiv gesuchte Kontakte und Folgezüge eines Pausenblocks würfeln nicht und verändern die Serie nicht. **Firewall:** Wer in einer Antwort neu auftaucht, greift nur im offenen Gefahrenfenster als eine Gruppe an und nimmt im selben Zug nichts weg (Forderung statt Buchung); bereits Anwesende, laufende Kämpfe und aktiv gesuchte Zielkontakte am tatsächlich erreichten Ort (autorisierte Suche/GO, Habitat eines angenommenen Jagdauftrags) behalten ihre Regeln. Pausen erhalten das Fenster, werden in Paket A aber nie verkürzt. Werte vorläufig (`rules.json` `pulse`). [Patchnote .162](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/docs/PULSE162_PACKAGE_A.md).
**[VERBINDLICH seit .164: Paket C] PULSE-Rast:** Rast, Schlaf und Warten **außerhalb sicherer Unterkünfte** können unterbrochen werden; die Engine entscheidet das eine Fenster **vor** der Zeit-/Regenerationsbuchung und bucht nur die tatsächlich vergangenen Minuten samt Erholung (ab 30 min frühestens nach 15 und spätestens 15 min vor dem Ende; kürzere Pausen voll, Ereignis am Ende). Draußen unterbrechen Gefahr, Hindernis und Seltsames, auf der Straße Ärger (nie Erstschlag oder Wegnahme); sichere Unterkunft (Siedlungsraum, gewährtes Quartier, Dach in der Wildnis) nie gefährlich, dort nur friedliche Ereignisse vor dem Einschlafen/beim Aufwachen. Eine Unterbrechung stoppt spätere Handlungen derselben Nachricht; der Spieler entscheidet neu. Die Ursache ist eine Engine-Tatsache. Im Dungeoninneren seit .167 nur durch dessen Wanderbegegnung (Paket B). [Patchnote .164](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/docs/PULSE164_PACKAGE_C.md).

**[VERBINDLICH seit .167: Paket B] PULSE im Dungeon:** Im Inneren eines Living Dungeons gilt dasselbe eine Fenster je Zug. Eine spontane Dungeongefahr ist **ausschließlich** ein freier, noch ungetroffener Minion seiner Ebene und seines Zyklus, der zu ihm kommt (nie Wächter oder Boss, kein neuer Gegner, gleiche Stufen); ohne freien Minion keine Gefahr. DUNGEON AHEAD bleibt autoritativ (sein Zug würfelt nicht), höchstens eine Begegnungsreferenz je Zug; ein Slot wird nur durch eine tatsächlich erzählte, gültige Kreatur verbraucht. Pace, Räumung, Quests und Siegel bleiben wie ohne Wanderung. Dungeon-Rast wird nur durch diese Begegnung unterbrochen (Regeln aus Paket C). [Patchnote .167](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/docs/PULSE167_PACKAGE_B.md).

**[GEPLANT] PULSE Paket D:** Auswertung/Feinjustierung nach natürlichen Läufen. [Technischer Plan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md), [Roadmap W5/W6/W7](07_ROADMAP_NACH_10B_ENTWURF.md).

Avereth ist High Fantasy ohne moderne Technik. Menschliche Großmächte **Valedorn Crown, Caelreth, Duskreach**; Monsterreiche **Ashen Scale Dominion, Verdant Fang Court**. Menschen sind normale menschliche Zivilisation, keine automatische Einführung klassischer intelligenter Fantasyvölker. Monster können Tiere, intelligente Wesen oder Gesellschaften sein, nicht grundsätzlich Feinde. Adventurers' Guild ist transnational, kein Weltstaat; seltene S-Ranks lösen nicht jedes Problem.

**Ruleset 2:** Warrior (STR/VIT), Mage (INT/WIL), Rogue (AGI/PER), Basic Attack plus **zwei frei gewählte Starterfähigkeiten**. Danach keine festen Skill-/Klassenbäume. Erwerb aus echter Erfahrung, Training, Lernen/Entdeckung und geprüfter Annahme. Engine erzeugt/validiert Effekte, Zahlen, Kosten und Besitz; LLM beschreibt/bietet Namen, keine freien Zusatzwirkungen oder ausführbaren Freitextcode. Klasse ist Affinität, keine Exklusivität für andere Skills/Waffen. Bow Shot verlangt den gehaltenen Bogen.

Lernen benötigt legitime Quelle/Vorhaben, Zeit, LP/Affinität und tatsächliche Übung; gewöhnliche Lehrer/Stones/Manuals beginnen auf F/C1. Trainierte menschliche NPCs besitzen passenden persistierten Skillbestand, gewöhnliche NPCs keine kostenlosen Zusatzfähigkeiten. Geeignete trainierte NPCs können ab vorläufig Level 5 eine persistente Signatur erhalten. Ressourcenfähigkeiten erzeugen keine unendlichen Zyklen oder ungebuchte Heilung.

### Passive-Lore und Qualitätsstufen

Passive sind bleibende erworbene enginegebuchte Merkmale, keine temporären Segen. **Ordinary** = schwache erlernbare Disziplin, **Rare** = außergewöhnlich belegte individuelle Entfaltung, **Legendary** = sagenhafte charakterprägende Entwicklung. Qualität folgt Ereignisbedeutung, nicht Farmzählern/Pflichtwürfen; kein automatisches Starterpassive.

Unter B-Rang höchstens **vier Slots insgesamt**, auch für NPCs und unabhängig von Qualität. Erwerb im sicheren Moment nur mit ausdrücklicher Zustimmung. Bei vollen Slots kann legitimes Rare/Legendary **genau ein ausdrücklich gewähltes altes Passive atomar ersetzen**; keine freie Rücknahme. B+-Kapazität offen. Passive Stones nur Rare/Legendary und äußerst selten; aktive Skill Stones getrennt, Besitz nur aus validierten Quellen. Gemeinsame Effektcaps, keine parallele Bonusengine. Nichtkampfbelege verlangen unterschiedliche echte erfolgreiche Engineprüfungen über Features/Tage; identisches Spammen erzeugt kein Rare-Angebot.

### Skills und Klassenentwicklung – implementierte Regeln

Skill-/Evolutionbedingungen stehen zusammen in §5. **F→E bei Level 15:** Power-Rank steigt; angebotene Normal-/Rare-Klassenentwicklung erst nach ausdrücklicher Annahme aktiv. Gewöhnlich 2–3 einmalig festgelegte Optionen, kein Neuwürfeln durch Aufschub. Klassenfeature außerhalb der vier Passive-Slots mit gemeinsamen Caps. Basisklasse/Favored Stats bleiben; erster Wechsel maximal Rare. D–S und B+-Budgets offen. Implementierungsquellen im [Fachindex 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) und Produktstand in 03.

## 9. UI und technische Komfortprinzipien

Lesbare System-/Combat-Karten statt Narratortracker; vorhandenes CSS/QoL erhalten. Bodenfunde, Dungeonetage und Awareness aus bestehenden bekannten Engine-Fakten projizieren; kein Autoloot, neue Buchung oder Spoiler. Boardkarten schaffen keine neuen Quests/Etagen/Gegner. Seit .161 dürfen Quest- und Bodenfundkarten editierbare Spielersätze im normalen ST-Eingabefeld vorbereiten; kein automatisches Senden, keine Buchung oder Modellabfrage durch den Button. Annahme und TAKE bleiben im normalen Planner-/Enginepfad. Weitergehende Quick Actions, Engine-only-Board/Handel, sichere Rest-/Wait-Wege und zusätzliche AoE-Geometrie bleiben eigene offene Vorhaben; [Ideenarchiv](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

## 10. Explizit unerwünschte Auswüchse

Keine Pflicht-Continues, Beweistrophäen, Traglast, Temperament-/Fluchtloops, versteckte PC-Levelanpassung, Farm-Nerfs ohne Beschluss, umfassende NPC-/Pathfinding-Simulation, zweite Zustandsbank, starres Dungeon-Drehbuch, unnötige LLM-Aufrufe oder Architektur-/Balanceumbauten als Nebenfolge kleiner Bugs. Keine autonomen freiwilligen PC-Handlungen.

## 11. Pflege

Neue Designentscheidungen nur ausdrücklich übernehmen. Historische Commitketten/Tests in 06 bzw. Fachpatchnotes, aktueller Produktstand in 03, Auswahl in 07. Redaktionelle Kürzung ändert keine Spielregel; Detailbelege der Vorfassung bleiben über den festen Archivlink oben erreichbar.
