# Avereth Engine – Ideenarchiv, Claude-Gegenreviews und mögliche Patches

**Dokumenttyp:** Ideen-/Reviewarchiv mit **verbindlicher Hauptroadmap in §1a**; **Stand:** 23.10.2026 · Patch 8 und 9A/9B implementiert; **9C-1 implementiert (.40/.41, `d27e877`), unabhängiges Claude-Gegenreview ausstehend**. 9C-2/9C-3 bleiben Planung (§1a.2b); Balance in 10B.  
**Quelle:** intensive Auswertung von Git, älteren Projekt-Chats, realen SillyTavern-Tests, externen Referenzen und **mehreren unabhängigen Gegenreviews in einer zweiten Claude-Sitzung**.  
**WICHTIG:** Dieses Dokument unterscheidet **IMPLEMENTIERT**, **VERBINDLICH GEPLANT**, **HISTORISCHER/ÜBERHOLTER REVIEWSTAND**, **PLANKANDIDAT** und **EXPERIMENT**. Einzelne Katalogideen sind nicht freigegeben; **die explizit beschlossene Roadmap in §1a ist verbindlich**. Git-Code und Datei 03 entscheiden über Implementierung und Teststatus; Datei 02 über den Design-Kanon. Ältere Review-Aussagen, die drei Startklassen dauerhaft ausschließen, wurden von der späteren ausdrücklichen Patch-9-Entscheidung überholt.

## 1. Aktueller Entscheidungsstand – nicht verwechseln

| Bereich | Stand 22.10.2026 | Nächster Schritt |
|---|---|---|
| **Patch 8 Living Dungeons (.25)** | Implementiert, erste reale Tests vorhanden; .25 zeigte doppelte Gate-Gebühr, voneinander getrennte Käfer-Encounter und falsche Todesnarration | Historischer Regressionstest |
| **Patch 8.1 (.26)** | **IMPLEMENTIERT / Git-verifiziert:** `c6baa06e159f16069efd728844c7afe7c7dc186a`, Build `4.3.0-c.6.6.26`. Gate, Group Combat, Quest-Population, UI-Panel, Combat-Truth | Laufender/fortgeschrittener GLM-5.3-Flash-Livetest; vollständigen Verlauf samt Boss/Reset noch nicht als bestätigt ausgeben |
| **Patch 8.2 (.27, ef4a819)** | **IMPLEMENTIERT / Git-Code verifiziert**; .27-GLM-Livetest 22.10. mit Telemetrie: Extractor-Median 4,87 s (7), Narrator-Median 17,85 s (7; zwei extreme Ausreißer), keine kausale Beschleunigung bewiesen | Diagnosepatch bleibt als Grundlage; A0/A/C erst mit belastbarem Weltvergleich und separaten Providerläufen bewerten |
| **Patch 8.3 (.28, 70cbb5e)** | **IMPLEMENTIERT / historisch:** echter .28-Glimmerdeep-Lauf bewies Zugang zu Ebene 1, Kill-/Loot-/XP-/Questlogik, aber vier Solo-Ambushes und falschen Cull-Task. **Diese beiden direkten reinen Beetle-Fälle führte zu Patch 8.4.** Boss/Floor-Clear noch nicht live | Regressionen als historisch dokumentierte Prüffälle behalten, nicht den alten Bug als aktuellen Stand darstellen |
| **Patch 8.4 (.29, 4d08d4f)** | **IMPLEMENTIERT / unabhängig im Git-Code geprüft:** Unverdeckte Angriffe holen bereits etablierte feindliche Gruppenmitglieder sofort in denselben Encounter, bewahren einzelnes Ambush-Opening und echte Stealth. Reiner Dungeon-Cull zeigt angeglichene Task-Zahl; `amountText` entfernt Doppelmengen. Claude: 995/995, erfolgreicher C-Smoke 21/21 mit sporadischem ST-Preset-Status-Race. **Restfehler:** DEFEAT+DEFEND kann im Task noch „six“ bei Objective/EndState „four“ zeigen | Kleiner Guard-Cull-Task-Nachtest/-Fix, dann echter .29-Providerkampf bis Boss/Floor-Clear; Testqualität und Smoke-Race separat (§15, 03 §5l) |
| **Automatischer ST-Live-Runner (35ead9c)** | **IMPLEMENTIERT / echter Windows-GLM-Lauf vom 22.10.2026 ausgewertet**: 19 Züge, Integrität OK, kontrollierter Player-Failure, Reasoning-/Leerantwort- und Spielerverhaltensprobleme erkannt. | **Patch 8.4.1 IMPLEMENTIERT** (Engine `e69f27b`, Runner `8f67953`, Build `.30`); Git-Code geprüft, nächster echter GLM-Livetest offen |
| **Engine Actions & QoL** | **KANDIDAT**, einschließlich Engine-only-Gildenboard, Rest/Schlaf/Wait, sichere Rückwege, ST-Quick-Replies; noch kein Patch beschlossen | Umfang und mögliche Bündelung nach Performance-Review entscheiden |
| **Patch 9A / 9A.1 (.33–.35)** | **IMPLEMENTIERT:** drei Startklassen Warrior/Mage/Rogue mit Wahl 2 aus 6 plus Basic Attack, Rogue-Pool und -Kit, Waffenangriffe für jede Klasse, trainierte/untrainierte NPCs, Regelstand pro Kampagne (Legacy behält fünf Klassen), NPC-Rollen und erzählte Bewaffnung. Details Datei 03 „Patch 9 – Umsetzungsstand“ | Kein weiterer Schritt; 9A-Livetest (.34) ausgewertet |
| **Patch 9B-1 / 9B-2 (.36–.39)** | **IMPLEMENTIERT, Git-Review bestanden:** dynamische Skills und Passives (Definition ≠ Erwerb), ein Resolver, geschlossener F-Rang-Validator, Proficiency P1–P5 mit PP-Vergabe, Effektfaktoren, Heal/Restore, erste NPC-Defensive. Erwerbspfad ab 9C-1 | Historischer 9B-Stand; aktueller Erwerb siehe 9C-1 |
| **Patch 9C Organic Skill Acquisition & Growth** | **9C-1 IMPLEMENTIERT:** .40 `d0808eb`, Reviewkorrektur .41 `d27e877`; C1/F-Komponist, Lehrer, Lernvorhaben, LP/PP und gemeinsamer Erwerbsabschluss. **9C-2/9C-3 NICHT IMPLEMENTIERT.** | Unabhängiges Claude-Review von .41; danach nächste Teilfreigabe. Interaktionsdefaults vor 9C-2/9C-3 bestätigen |
| **Patch 9D Organic Class Identity** | **VERBINDLICH GEPLANT, NICHT IMPLEMENTIERT:** organische Klassenentwicklung; Klassen-Evolution bis dahin gesperrt | Nach 9C |
| **ROAD AHEAD** | **Separater, NICHT freigegebener Kandidat** für Engine-verankerte Reiseetappen und Suche | Nur bei wiederholt belegten gravierenden Reise-/Such-Blockern gesondert priorisieren; sonst Patch 9 → 10B |
| **Patch 10A – HUD/QoL** | **Bereits implementierte frühere UI-/QoL-Arbeit**, nicht erneut als Großpatch beauftragen; offene konkrete Fälle weiterhin möglich. | Keine Dopplung mit Patch 10B | 
| **Patch 10B Balancing, Performance & Final Polish** | **VERBINDLICH GEPLANT, NICHT IMPLEMENTIERT:** XP-/Farm- und Progressionsbalance, LLM-/Prompt-/API-/Runtime-Performance, Gameplay-Polish, Langzeit- und Replay-Regressionen. Bestehende **53-Punkte-Abnahmeliste** gilt weiter. Details §1a. | Nach Patch 9, messen und simulieren statt Zahlen oder Architektur voreilig festlegen |

**Wichtig bei jedem neuen Chat (Stand 23.10.2026):** Seit Patch 9A haben **neue Kampagnen genau drei Startklassen (Warrior, Mage, Rogue)**; nur Legacy-Kampagnen (Regelstand 1, vor 9A begonnen) behalten die fünf alten Klassen. Der folgende Satz beschreibt den **historischen** Stand vor 9A: Der damals implementierte Stand hatte fünf Startklassen (Warrior, Mage, Guardian, Duelist, Ranger). Die frühere Ablehnung der isolierten Katalogidee F1/#71 wurde durch die **spätere explizite Nutzerentscheidung vom 20.10.2026 für Patch 9** ersetzt: **Warrior, Mage, Rogue** als genau drei Starterklassen. **Vor Patch 9 am bestehenden Code nichts heimlich ändern; ab Patch 9 die neue verbindliche Designentscheidung anwenden.** Die früheren Texte in §3/§4 sind historische Reviewnotizen.


## 1a. Verbindliche Roadmap nach Patch 8 – ausführliche Planungsbasis

**Geltung und Status:** Die folgenden Grundsatzentscheidungen wurden für die Roadmap am 20.10.2026 ausdrücklich getroffen und am 22.10.2026 im Projektkontext erneut überprüft. Bei Widerspruch haben sie Vorrang vor älteren Kandidaten-/Review-Sätzen in dieser Datei. **Geplant bedeutet nicht implementiert.**

### 1a.1 Reihenfolge

1. **Patch 8 Living Dungeons und gezielte Integration:** Die Builds .25–.29 sind implementiert; echte Livetests bestehen. **Patch 8.4.1** ist als Engine-Build `.30` plus Runner implementiert und per Git-Code-Review geprüft; echter `.30`-GLM-Livetest ausstehend. Danach erneuter echter GLM-Lauf. Patch 8 darf nicht zum unendlichen Sammelpatch werden.
2. **Patch 9 Organic Character Growth:** der nächste **eigenständige große Mechanikpatch**. Drei neue Startklassen und organische Charakterentwicklung, genau wie unten festgelegt. **Stand 23.10.2026:** 9A, 9A.1, 9B-1, 9B-2 und 9C-1 implementiert; Gegenreview der .41 offen; 9C-2/9C-3 (§1a.2b) und 9D geplant.
3. **Patch 10A HUD / QoL:** bezeichnet **bereits vorhandene frühere UI-/Quality-of-Life-Arbeit**; kein neuer noch ausstehender Großpatch. Verbliebene kleine UI-Probleme sind gezielt zu prüfen.
4. **Patch 10B Balancing, Performance & Final Polish:** abschließende Balance-, Optimierungs-, Integrations- und Abnahmephase **nach Patch 9**, mit der zuvor ausgearbeiteten **53-Punkte-Abnahmeliste** als Grundlage.
5. **ROAD AHEAD, Engine-only-Aktionen, Quick Replies und weitere Großideen:** **getrennte, nicht automatisch freigegebene Kandidaten**. Eine neue Priorisierung vor Patch 9 setzt belegte kritische Reise-/Suchprobleme und eine separate Entscheidung voraus.

### 1a.2 Patch 9 – Organic Character Growth

**STATUS: VERBINDLICHES DESIGN. Implementiert: 9A (Startklassen, NPC-Grundlagen), 9A.1, 9B-1 (dynamische Skills, Proficiency), 9B-2 (Passives, Heal/Restore, NPC-Defensive). 9C-1 (C1/F-Erwerb über Lehrer) ist auf .41 implementiert, Gegenreview offen. Weitere Erwerbswege, Evolution, NPC-Signaturtechniken (9C-2/9C-3; Plan §1a.2b) und 9D (Klassenidentität) bleiben offen.** Die folgenden Zeilen sind der ursprüngliche Planungstext; Aussagen wie „heute fünf Klassen“ beschreiben den Stand vor 9A.

**Spielerfahrung:** Fähigkeiten, Klasse und dauerhaftes Charakterprofil wachsen aus dem tatsächlichen Spielen: Entscheidungen, Kampfstil, Training, experimentellem Einsatz, besonderen Erlebnissen und Entdeckungen. Kein Spieler soll einen vorgefertigten Skill- oder Evolutionsbaum abarbeiten müssen. Entwicklung muss **tatsächlich mechanisch wirksam** und dauerhaft sein, nicht bloß behauptete Narrator-Prosa.

**Genau drei Startklassen ab Patch 9:**

| Neue Starterklasse | Favored Stats | Vorgegebene Anfangsinhalte |
|---|---|---|
| **Warrior** | **STR / VIT** | Fester auswählbarer Starter-Skill-Pool (Wahl 2 + Basic Attack) und Startausrüstung |
| **Mage** | **INT / WIL** | Fester auswählbarer Starter-Skill-Pool (Wahl 2 + Basic Attack) und Startausrüstung |
| **Rogue** | **AGI / PER** | Fester auswählbarer Starter-Skill-Pool (Wahl 2 + Basic Attack) und Startausrüstung |

- **Zeitliche Klärung:** Die heutige Engine hat noch **fünf Klassen**: Warrior, Mage, Guardian, Duelist, Ranger. Diese fünf sind **Bestandscode bis Patch 9**. Die spätere ausdrückliche Patch-9-Entscheidung lautet **nur drei Startklassen**. Ältere Sätze aus dem 141er-Videospiel-Katalog, dass Punkt F1/#71 verworfen sei und fünf Klassen für immer bleiben, sind in Bezug auf Patch 9 **überholt**. Vor Patch 9 **keine heimliche Umstellung**; Auswirkungen auf bestehende Spielstände bei Umsetzung gesondert prüfen.
- **Nur die Einstiegsoptionen sind fest definiert:** Anfangsklassen, vorgegebene auswählbare Starter-Skill-Definitionen und Starter-Ausrüstung. **Wichtig (Präzisierung 22.10.2026):** „feste Starter-Skills“ bedeutet NICHT, dass die bisherige Wahl von zwei Skills aus dem Klassenpool abgeschafft wurde. Eine automatische feste Zuweisung von zwei Skills wurde vom Nutzer nicht beschlossen. Bis zu einer gesonderten Entscheidung bleibt die Startskill-Auswahl erhalten. **Keine feste Liste später lernbarer Skills**, keine vordefinierten Evolutionsklassen, kein versteckter Evolutionsbaum in Guidelines, JS oder Lore.
- **Mögliche organische Resultate:** neu entstehende aktive Fähigkeiten; Weiterentwicklung/Evolution vorhandener Skills; **seltenere, tatsächlich lernbare Passives als zentraler eigener Growth-Pfad (keine Starter-Passives);** dauerhafte Boni/Charaktermerkmale; neue oder gewandelte Klassenidentität. Unterschiedliche Builds und hybride Entwicklungen müssen möglich bleiben.
- **Wodurch Entwicklung entsteht:** reale Spielerhandlungen, wiederholte und **bedeutsame** Fähigkeitsnutzung, Training, Experimente, kreative Anwendung, besondere überstandene Situationen und neu gewonnene Erkenntnisse. Reine Nutzungszähler, XP-Schwellen oder bloße Erwähnungen allein ersetzen diese Begründung nicht. Nicht jede Handlung muss eine Belohnung ergeben; kein automatisches Klassenupgrade auf festem Level.
- **Autorität:** Die LLM-Schicht erkennt Chancen und schlägt **narrativ/strukturiert** organische Entwicklungen anhand Guidelines vor. Die **deterministische JS-Engine** validiert anhand tatsächlicher Ereignisse und zulässiger Mechanik, entscheidet, bucht und persistiert Skills, Kosten, Effekte, Reichweiten, Ressourcenverbrauch, Passives und Boni. **Guidelines sind Leitplanken, keine Rezept- oder Evolutionslisten.**
- **Klarstellung des Nutzers 22.10.2026 (bindend):** Die vorgefertigten auswählbaren Starter-Skills (automatischer Basic Attack + zwei aus dem Pool) bieten dem Erzähler echte mechanische und erzählerische Beispiele beim systemgesteuerten Spielbeginn. **Ausnahmslos alle neu erworbenen Fähigkeiten außerhalb dieser Starter-Definitionen werden situations- und erfahrungsabhängig mit Regeln/Templates neu entworfen**, auch wenn sie auf bereits bekannten Effektmechaniken beruhen. **Keine vordefinierten später lernbaren Skills**, keine fixen Trainer-Skilllisten, keine abgeschriebenen alten Duelist-/Ranger-Fähigkeiten als standardmäßiger späterer Erwerb, keine Evolutionsbäume. Historische Klassen-Skills bleiben für alte Kampagnen/Replay und zur Budget-/Mechanikkalibrierung verfügbar. Templates dürfen primitives, Syntax, Budget und illustrative Beispiele enthalten, aber nicht fertige zukünftige Skills oder garantierte Freischaltrezepte.
- **Skill-/Effektbausteine:** Ein offenes Kombinationssystem auf **mechanisch definierten, validierbaren** Effekten statt beliebiger LLM-Zahlen. Kreative Umwelt-/Utility-Anwendungen dürfen entstehen; die Engine prüft Grenzen, Ziel, Dauer und Wirkung. Der Narrator kann keinen neuen Skill, Statbonus oder Klasseneintrag ohne autorisiertes Ereignis schenken.
- **Fairness und Player Agency:** Lernen bleibt durch die Spielerfigur begründet, keine ungefragte Umklassifizierung und kein bedeutungsloser Pflichtgrind. Der Spieler kann unterschiedliche Schwerpunkte verfolgen; nicht jedes Abenteuer führt denselben Warrior/Mage/Rogue entlang eines vorgezeichneten Pfades.
- **Replay/Persistenz:** Neue Fähigkeiten, Evolutions-, Passive- und Bonusereignisse müssen reproduzierbar nach Save/Reload, Chat-Replay, Swipe/Regenerate und langen Runs bestehen. Keine doppelten Belohnungen; fehlgeschlagene Extraktion oder erfundene Erzählung darf keinen Powergewinn eintragen.
- **NPC-Kompatibilität (bindende Ergänzung 22.10.2026):** Auch von der Erzählung etablierte **menschliche Klassenträger als Gegner** nutzen echte Klassen-/Skillmechanik: Basic Attack plus **zwei gewählte Starter-Skills**, bei angemessenem Rank/Level und Rolle individuell **durch Regeln/Templates neu erzeugte** weitere aktive Skills, bei glaubwürdiger seltenen Entwicklung gegebenenfalls Passives. Die Erzählung etabliert nur zulässige Tatsachen (z. B. erkennbare Klasse/Rolle, durch Plakette/Ruf belegte Ranghinweise), **nicht frei gewählte numerische Level**; das tatsächliche Level bestimmt die Engine aus einem zulässigen Bereich; die Engine erstellt validierte Profile und persistiert diese einmalig pro NPC. Kein unbegrenztes LLM-NPC-Skill-Farming und keine komplett neue NPC-Agentensimulation. Reine Zivilisten/Hintergrundrollen nicht automatisch zu Elitekämpfern machen. Die NPC-Policy muss ihre bekannten Angriffs-, Utility- und Defensivskills tatsächlich angemessen nutzen. **Keine festen höheren NPC-Skillbäume/-Kataloge.**
- **Abnahmefälle:** alle drei Startklassen korrekt; bestätigte Startskills und Startausrüstung; mehrere unterschiedliche Spielstile erzeugen plausible unterschiedliche Entwicklungen; fehlende tatsächliche Lernereignisse führen zu keinem Bonus; neue Skills/Skill-Evolutionen/Passives/permanente Boni funktionieren im Kampf und außerhalb; unberechtigte LLM-Vorschläge werden abgelehnt; Langzeit- und Replay-Stabilität bleibt erhalten.

**Nicht vorziehen:** globales XP-/Damage-Feintuning, grundsätzliche LLM-Provider-/API-Umbauten oder feste Skill-/Klassenbäume. Diese gehören nicht zur Patch-9-Mechanik; allgemeine Balance ist Patch 10B.

### 1a.2a Technischer Teilpatch-Plan für Patch 9 (Vorschlag, 22.10.2026)

**Status 23.10.2026:** 9A und 9B sind nach diesem Plan umgesetzt (Iststand Datei 03). **Für 9C gilt der überarbeitete Plan in §1a.2b**; der 9C-Absatz unten ist historisch und in zwei Punkten überholt (NPC-Skills nicht per asynchronem LLM-Schritt, sondern deterministisch beim Sheet-Bau; Skill Stone nicht beim Fund vollständig definiert, sondern beim Etablieren nur profiliert und bei Aktivierung konkretisiert). **Ursprünglicher Status:** Aus bestehendem verbindlichem §1a.2 abgeleitete Aufteilung zur Implementierung; noch keine Umsetzung, keine neue bindende Skillliste. **Mechanik-Balance des vorhandenen Blink bleibt unverändert bis Patch 10B.** Geprüfte Codebasis: Entwicklungs-HEAD 1f38bd1, Build .32.

**Architekturbefund:** Neuer Charakter: fünf registrierte Klassen, zwei aus sechs Startskills wählbar, Basic Attack separat (src/creation.js, src/intent.js, src/commands.js). Rogue, Rogue-Kit und Rogue-Skills fehlen. Skills sind statisch in content.skills: betroffen sind Combat, V4-Planner, HUD, Systembefehle, Validierung, Kontext. state.js hat skill.learned, aber speichert keine dynamische Skilldefinition. derived.js kennt bereits vier sheet.bonuses, noch kein allgemeines persistentes Passive-/Growth-Awarding. progression.awardXp greift für Favored Stats über sheet.class auf content.classes zu. #class zeigt fest behauptete Evolutionslevel. Proficiency prof/pp ist gespeichert und im Kampf berücksichtigt, aber ein produktiver PP-Fortschrittskreislauf ist im geprüften Code nicht ersichtlich. Die PC-Ownership-Fingerprints umfassen neue Boni/Passives noch nicht.

**9A – Three Starting Classes & Legacy Safety.** Basis der NPC-Seite mitziehen: Die historischen Templates (Wache, Bandit, Magier, Jäger, Abenteurer) dürfen nicht auf alte Klassen oder zufällig nur einen Starter-Skill angewiesen bleiben; **explizit klassifizierte menschliche Kampf-NPCs** haben Basic Attack und zwei gültige, aus ihrem Starter-Pool ausgewählte Skills. Bestehende Zivilisten-/Legacyprofile sauber abgrenzen, aber nicht für jede Nebenfigur zwei aktive Combat-Skills erzwingen. Neue Kampagnen: nur Warrior STR/VIT, Mage INT/WIL, Rogue AGI/PER; je Klasse definierter, auswählbarer Starter-Skill-Pool und festgelegtes Startkit. **Die bisherige Wahl von zwei Starter-Skills aus dem Klassenpool plus automatisch gewährtem Basic Attack bleibt erhalten; sie ist NICHT durch zwei zwangsläufig zugewiesene Skills zu ersetzen.** Die Poolgröße kann bei Bedarf angepasst werden, aber nur nach einer gesonderten Designentscheidung. Rogue benötigt einen echten neuen wählbaren F-Rank-Skillpool und ein passendes Kit. Die vorgefertigten Starter-Skills sind auch Stil-, Format- und Mechanik-Beispiele für den Narrator; die bereits vorhandenen Starter-Pools bleiben auswählbar. Im Neuspiel sind die alten Legacy-Klassen und deren alte Skills kein späterer statischer Lernkatalog. Rogue mit gültigem F-Rank-Angriff, Utility und passender Einhandausrüstung auf bestehendem Kampfsystem. Alte Guardian/Duelist/Ranger und ihre Skills für historische Kampagnen/Replay technisch erhalten, für neue Kampagnen aber aus Auswahl UND Parser sperren. Favored Growth, Stats, HP/MP/STA, Startkit, Rogue-Combat und alte Saves testen. Noch keine organischen Skills.

**9B – Event-sourced Dynamic Skills / Effects / Passives.** Die **Passives sind Kernfunktion, kein optionaler kleiner Statbonus**: keine Starter-Passives; validierte organische Passive-Definitionen, Effektauslösung und Persistenz für PC **und** NPCs. Anfangs einfache konstante Boni über vorhandenes `sheet.bonuses` nutzen, aber bei belegtem Bedarf auch enginevalidierte ereignis- oder bedingungsgebundene Effekte ermöglichen; komplexe neue Effektarten separat absichern, keine freie unvalidierte JS-Logik. Bei NPCs einmal erzeugte Definitionen wie beim Spieler am jeweiligen Entity-Sheet bzw. an der Event-Historie fixieren. Für die dynamischen Fähigkeiten das schon vorhandene Skillobjektformat und seine tatsächlich unterstützten Effektarten wiederverwenden; keine neue, parallele Kampf-DSL. Den produktiven PP-Fortschritt aus **bedeutsamem**, gebuchtem Skillgebrauch/Training nach geltenden Proficiency-Regeln ergänzen (Vorschlag von Claude, nicht reine Spam-Nutzungszahl; P5 ist keine automatische oder fest vorgegebene Evolution). Baseline an vorhandenen Skills und überzogenen Gegenbeispielen testen, ein vollständiger dynamischer Skill vom Event bis Combat/World/Planner/#skills/Replay als Abnahme. Kampagneneigene, versionierte und durch Events rekonstruierbare Definitionen für neue/evolvierte Skills, Passive und dauerhafte Boni; keinen globalen Content-Map-Mutationszustand. Gemeinsamer Skillresolver für Combat, Planner, World/Utility, Context, #skills/#skill, HUD, Validierung. Kleine zulässige, kombinierbare Effekt-Primitiven mit Regeln für Rank, Power-Budgets, Targets, Reichweiten, Kosten, Dauer, Trade-offs; keine ungeprüften LLM-Zahlen oder frei erfundenen Effekttypen. Passive/Perma-Boni tatsächlich in Derived/Combat und PC-Ownership integrieren. Einmalige IDs, Freeze/Versionierung, keine Mutation eines laufenden Encounter-Snapshots; Save/Load, Replay/Swipe und zweifache Grants absichern. Erwerb hier ausschließlich durch den produktiven Validator mit Test-Evidenz, noch nicht automatisch narrativ.

**9C – Organic Acquisition & Skill Evolution. [HISTORISCH, ersetzt durch §1a.2b]** **NPC-Generierung** ergänzen: Ein echter Class-/Rank-/Level-Fakt muss, soweit explizit von Narrator/Extractor belegt, typisiert und validiert zur Engine gelangen (aktuelles `person.new` hat dafür keine eigenen Felder). Für wichtige erfahrene menschliche Kämpfer sollen bei erstmaliger relevanter Materialisierung weitere individuelle aktive Skills und gegebenenfalls seltene Passives aus dem gleichen geprüften Skillbaukasten konstruiert werden. Anders als beim PC können vorherige NPC-Erfahrungen als glaubwürdig etablierter Hintergrund statt simulierte 100 Kämpfe dienen; weder Rank noch Klasse darf aus bloßen dramatischen Adjektiven frei erfunden werden. **Nur bei relevanten NPCs einmalig**, per Event fixiert, keine zusätzlichen Modellaufrufe pro Runde oder Massengenerierung für Nebenfiguren. **Zusätzliche Skills hängen von Level/Rank und konkretem Charakter ab, ohne starre Skill-pro-Level-Tabelle.** Neuentwicklungen dürfen **nicht** aus vordefinierten Erwerbspools kommen: ein Lehrer, Skill Stone, Trial oder kreatives Selbsttraining begründet einen LLM-Entwurf **erst in der jeweiligen Situation**. Die Engine kann Ereignisbelege und mechanische Zulässigkeit prüfen, aber nicht die erzählerische Plausibilität als deterministische Wahrheit beurteilen; narrative Stimmigkeit bleibt Aufgabe der LLM-/GM-Schicht. Spielerzustimmung für freiwillige Skillannahmen/Wechsel ist sinnvoll, die Form (insbesondere keine unnötigen Popups für jede passive Weiterentwicklung) noch getrennt zu entscheiden. Validator für LLM-strukturierte Vorschläge auf Grundlage belegter Spielerhandlungen, bestätigtem Training, echten Lehrern/Skill Stones, innovativer Fähigkeitennutzung, Umweltinteraktionen, Entdeckungen und bedeutsamer Erlebnisse. LLM macht Vorschläge; Engine prüft kanonische Evidenz, Grenzen, Kosten, Rank, Eigentum und Dopplungen und bucht erst danach Events. Keine verborgenen Skills/Upgrade-Listen, keine reinen Nutzungscounter/XP-Level als Freischaltautomat, kein Reward für Narrator-Prosa oder ungefragte Spielerhandlungen; cross-class und unterschiedliche Evolutionswege bleiben möglich. Die in 9B implementierte PP-Progression verwenden; Affinity-Wirkung auf diese echte Lernprogression prüfen, statt allein auf gespeicherte PP-Felder zu vertrauen. Gültige Welt-/Combat-Skills testen, negative Vorschläge und Replay prüfen. Erste kurze echte GLM-Growth-Probe statt großer Dauertests.

**9D – Organic Class Identity, Consent & Integration.** **NPC-AI-Integration** abnehmen: Einen Gegner mit Basic Attack und zwei Starts plus höheren organischen Skills/Passives nicht auf den höchsten Damage-Skill reduzieren; glaubwürdige, effiziente Auswahl aus gültigem Attack/Defense/Utility-Repertoire unter Kosten, Reichweite, Kampflage und Engine-Authority, ohne allgemeine strategische NPC-Simulationsmaschine. **Keine neuen NPC-Skills nach jedem Encounter generieren oder beim erneuten Treffen austauschen.** Offene Klassenidentität/einzelne Evolutionen anhand persistierter Lernhistorie, Stil und expliziter Spielerentscheidung. Keine fest verdrahteten Evolutionsklassen, garantierten Level-15/30-Schwellen oder vorgeschriebenen Builds. Base/Origin getrennt von aktiver freier Klassenbezeichnung speichern, bestehende Favored-Stats- und Level-up-Regeln dürfen bei einer neuen, nicht in content.classes stehenden Identität nicht brechen. #class/HUD zeigen echte Geschichte, Passive und aktuelle Wirkung. Zwei unterschiedliche plausible Entwicklungen derselben Startklasse, Hybrid-, Combat-/World- und Legacy-Save-Fälle plus vollständiger Replay-/Swipe-/GLM-Integrationsabnahme. Danach Patch 9 abgeschlossen; globales XP-/Damage-/Performance-Balancing erst in 10B.

**Neuer verpflichtender Patch-9-Testfall (Nutzerfeedback aus zusätzlichem .32-GLM-Livetest, 22.10.2026): BLINK/DEFENSIVE SKILL UTILIZATION.** Nutzer berichtet, dass Alaric in den bisherigen Läufen Blink nie freiwillig nutzte, auch nicht in einer am 22.10. tödlich ausgegangenen weiteren Dungeonpartie; den noch nicht geprüften ZIP-Export zur Ursachenbestätigung separat analysieren. **Im Code unabhängig bestätigt:** `src/hud.js combatHud()` listet unter „Attack reach“ ausschließlich `content.skills` mit `.attack`; Blink und andere Defense-/Utility-Skills fehlen in dieser **Kampfoptionen-Zeile**, sind aber im allgemeinen Charakter-HUD unter „Skills“ vorhanden. `mage.blink` (8 MP) ist derzeit ein `reposition` um **ein Range Band**, nicht die eigene mechanische `flee`-Fluchtaktion. Das Nichtbenutzen allein beweist daher weder KI- noch Combat-Fehler. **Bereits in 9A** den engen HUD-/Spieler-Sichtbarkeits-Fix aufnehmen: alle tatsächlich bekannten kampfverwendbaren Skills in Attack / Defensive / Utility deutlich erkennbar zeigen, mit Ressourcenkosten und relevanter Wirkung, ohne neue Mechanik oder unzulässige Taktikautomatik. 9B/D Regression: Engine, Planner, HUD, GLM-Testspieler und **humane NPC-AI** erkennen/verwenden die nichtoffensiven Skills. Gezielter pre-death-Szenariovergleich: Mage hat Blink tatsächlich gelernt, noch >=8 MP, Nahkampf-Bedrohung, legitime Rückzugsentscheidung; Testspieler erhält die real sichtbare Oberfläche, darf auch angreifen, Blink oder `flee` wählen; evaluator erfasst getrennt **Skill angeboten**, **im Spielermodell sichtbar**, **gewählt**, **Engine bucht 8 MP + Distanzänderung**, **Flucht/Folge-Turn**, **Überleben/Tod**. Wenn Player Blink nicht wählt, nicht automatisch als Enginefehler ausgeben; nach Player-Log und aktuellem HUD erklären. Zusätzlich Focused Ward/Guard/Evasive Step im Kampf und situative NPC-Defensive/Utility-Nutzung prüfen. Tod ist eine legitime Spielfolge, kein automatisch fehlerhaftes Ergebnis.

**Claudes technisches Review der zwei Patch-9-Ergänzungen (22.10.2026; Empfehlungen, noch keine automatisch beschlossenen Systemdesigns):**
- **9A:** Pro Kampagne Version der Charakter- **und NPC-Regeln** erhalten, einschließlich Materialisierung bisher noch nicht gebuchter historischer NPCs; nicht global alle alten Vorlagen migrieren. Dreierklassen bei echten Kämpfern; Basic Attack plus zwei **rollenbezogen deterministisch und nicht nur durch `skill_pool.slice(0,2)`** ausgewählte Starter-Skills, danach fester `entity.sheet_set`-Snapshot. Alte Abhängigkeiten Bogen→Ranger, Präzisionswaffe→Duelist, schwere Waffe→Guardian auflösen. Bei Bogen ist **klassenunabhängiger Waffen-Basic-Attack** über vorhandene Waffenfamilien das bevorzugte **noch nicht verbindlich beschlossene** Modell; Rogue-Starteroption Fernkampf ebenfalls offen. Für gewöhnliche Bürger und Arbeiter ist ein internes **untrainiertes Kampfprofil ohne zwei Kämpfer-Startskills** sinnvoll; `class:null` als Lore-Aussage „die Person hat keine Klasse“ ist **noch nicht beschlossen**, weil der Weltkanon Klassen bei Erwachsenen kennt. Zwischen *Lore-Klasse* und *erlerntem Kämpfer-Kit* unterscheiden. Runner-Setup, Guides und ST-Karte ebenfalls auf neue Einstiegsauswahl anpassen. Veraltete feste Klassen-Evolutionsschwellen schon in den Neuspieltexten von 9A entfernen, alte Kampagnen nach eigenem Regelstand behandeln.
- **9B:** Einen echten Skill von Erstellung→Event→Planner→HUD/System→Kampfwirkung→Replay testweise vollständig durchspielen. Validator auf vorhandenes aktives Skill-Schema eichen; bekannte bestehende Skills nicht unbeabsichtigt ungültig machen, überstarke Entwürfe zurückweisen. Passive-Grundbausteine **nicht** auf vier `sheet.bonuses` beschränken: auch begrenzte Ressourcen-/Werteboni, MP-/STA-Kostenmodifikatoren, Schadensresistenzen, einfache Bedingungseffekte mit expliziten Budgets testen. PP-Fortschritt aus relevantem Skillgebrauch in 9B fertig verdrahten. **Minimale** situative Defense-/Utility-Wahl für NPCs mit vorhandenen Skills bereits in 9B, nicht erst in 9D, damit diese Fähigkeiten auch früh relevant sind; 9D umfassendere Integration.
- **9C:** Erzähler- und Extractor-Angaben über menschliche NPCs dürfen Rolle und belegbare Merkmale melden, aber **keine beliebigen Levelzahlen**; Engine wählt Level aus plausibler Rang-/Ortsbandbreite (bei Dungeon-Anführern `reach`/Dungeon-Rang berücksichtigen, statt überall Level 3). Neue individuelle Skills nur für wichtige NPCs per **eigenem asynchronen LLM-Entwurfsschritt vor bzw. bei relevanter Etablierung**, nicht innerhalb des synchronen `materialise()`, das auch in Combat-Probeaufrufen läuft. Ist der Kampf schon gestartet, bleibt der gesperrte Encounter-Snapshot unverändert; normale Starts funktionieren auch ohne späteren Skill. Höchstbudget pro NPC/Rang gegen unbegrenzte Skillfülle, aber **keine feste Zahl neu erzeugter Skills je Level**. Einen Skill Stone beim Fund individualisiert definieren, persistieren und erst danach lehrbar machen; keine versteckte statische Skillbank. In 9C kann NPC-End-to-End zunächst Erzeugen/Speichern zeigen, NPC-Defensive-Verwendung folgt 9B/9D.
- **Passives und Zustimmung:** Seltene Passives benötigen bedeutsame zusammenhängende Belege, **keine starre Mehrtagesschwelle oder Grind-Zählpflicht**. Eine Systembestätigung ist besonders bei irreversiblen Skill-Ersetzungen, Gebühren, Verlusten/Trade-offs und Klassenidentitätsänderung sinnvoll; obligatorische Popup-Bestätigung **bei jedem** rein positiven Skill-/Passive-Erwerb ist bisher **nicht beschlossen**, vor 9C festlegen. Spielerhandlungsfreiheit bleibt verbindlich.
- **Nicht freigegeben durch dieses Review:** automatisches Entfernen der Klassen von allen Zivilisten, zwangsweise Bogen-Exklusivität einer Klasse, starre Passives-Auslösetage oder Levelzahlen/Passives nach frei erfundener Narrator-Willkür.

**Arbeitsökonomie:** gezielte Regressionen während jedes Teilpatches, eine komplette npm-Test-Abschlussprüfung je fertiggestelltem Teilpatch. Browser-Stubs nur bei geänderter Browseranbindung, kein GLM-Dauerlauf bei Claude. 9A kurzer Creation-Smoke; 9B überwiegend deterministische Tests; 9C kurzer echter Growth-Lauf inklusive klassifiziertem erfahrenem NPC mit dynamischem Skill; 9D gezielte volle Gameplay-Integration einschließlich NPC-Skill-Einsatz und seltenem Passive. Vor 9A den Rogue-Auswahlpool und die Rogue-Ausrüstung sowie die vorhandenen Pools prüfen, ohne aus ihnen einen fest zugewiesenen Zwei-Skill-Loadout abzuleiten. Nutzer führt parallel weiteren Dungeon-Livetest durch; dessen Befunde separat prüfen.

### 1a.2b Patch 9C – technischer Plan nach Architekturprüfung (23.10.2026)

**Status:** Die Hauptroadmap Organic Character Growth bleibt verbindlich. **9C-1 ist implementiert:** `d0808eb` (.40, Claude) plus `d27e877` (.41, gezielte Korrekturen durch ChatGPT/Codex). **Unabhängiges Claude-Gegenreview von .41 ausstehend.** Die übrigen Implementierungsdetails sind technischer Review-Entwurf, keine Freigabe für 9C-2/9C-3. Nur ausdrücklich freigegebene Teilpatches werden umgesetzt. Technische Einfachheit gilt weiter; endgültige Zahlen, Lernraten und Scaling bleiben 10B.

**Verifizierte Planungsausgangsbasis (.39, historisch):** Repository `Mango1331/Claude-AI-RPG-Game`, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, HEAD `0cd22d32b6a814fc7729b9ad55efd3b6b5190d17`, Build `4.3.0-c.6.6.39`. Code und bestehende Schnittstellen wurden gelesen; für diesen Plan wurden keine neuen Engine-Tests oder LLM-Läufe ausgeführt.

**Reviewgeschichte:** erster GPT-Entwurf → Claude-Gegenprüfung → GPT-Vereinfachung → Claude-Bewertung → erneute kritische GPT-Prüfung → technischer Plan `b557f14` → Claudes Code-Gegenprüfung → gezielte Präzisierung nach erneuter Codeprüfung. Die Implementierungsdetails früherer Fassungen werden gezielt fortgeschrieben; vollständiger früherer Reviewstand und offene Entscheidungen sind unter K nachvollziehbar. Keine Rückkehr zu fertigen späteren Skillkatalogen, festen Evolutionsbäumen, einer Passive pro Rang, einem allgemeinen Lernagenten oder einer vollständigen NPC-Simulation.

#### A. Architektur, auf der der Plan tatsächlich aufsetzt

| Vorhandener Code | Verifizierte Aufgabe und Konsequenz |
|---|---|
| `src/v4/runtime.js plannedTurn` | Planner → Guard → `mapPlan`; danach V4-Commands oder V3-Kampfauflösung mit `c:true`. Erwerb muss beide Produkt-Routen erreichen. Eine Hook ausschließlich hinter `playerTurnV4` würde Kampfabschlüsse verpassen. |
| `src/v4/turn.js playerTurnV4`, `src/v4/commands.js` | Synchroner Event-Emitter, `activity train/study`, `engineMinutes`, `time.advanced`, `outcome.recorded`. Noch keine Lernwirkung. |
| `src/v4/trade.js bookPurchase` | `service.granted` entsteht beim Erwerb eines Services. Das ist eine Unterrichtsberechtigung, **kein Nachweis absolvierter Lernzeit**. |
| `src/skills.js` | Geschlossener Validator, `defineSkill`/`learnSkill`, PP-Buchung, Effect- und Restoration-Rechnung. Dynamische Skills bisher nur F; Definition und Besitz getrennt. |
| `src/passives.js`, `src/derived.js` | Passive-Definition/Besitz, dauerhafte und bedingte Boni, Kosten, Resistenz und abgeleitete Werte. Wiederverwenden, keine zweite Passive-Berechnung. |
| `src/content.js skillOf`, `derived.js actionsOf` | Gemeinsame Auflösung statischer und dynamischer Fähigkeiten; bestehende Combat-, Planner-, HUD- und Befehlswege nutzen sie bereits. |
| `src/combat.js` | `attackAction`/`resolveStrike`, `skillAction`, konkrete Reichweiten, Kosten, Effekte, Zugschleife und XP. Aktive Effekte liegen im Kampfsnapshot unter `current.effects`. |
| `src/engine.js` | `worldUse` für Weltanwendungen/Feature-Proben; `materialise` und `openCommitted` bauen NPC-Sheets synchron, auch im Antwortpfad. |
| `src/state.js`, `src/v4/domain.js` | Fold und Reducer. Nur gebuchte Events rekonstruieren den Zustand; keine Generierung, Würfel oder LLM-Aufrufe beim Fold. |
| `src/v4/world.js`, `ownership.js` | Extractor-Weltänderungen und deklarierte Ownership-Gates. Neue Fachlogik gehört gemäß Strangler-Regel in ein Fachmodul. |
| `src/v4/items.js` | Bereits persistente Item-Profile und Rank-Prüfung; Skill Stones erweitern vorhandene Objekte, keine zweite Inventarliste. |

**Wichtige Grenzen:** Feuer/Eis usw. sind derzeit `aspects` ohne Elementarmechanik. Dynamisches AoE ist auf das vorhandene `caster_engaged` begrenzt; ein Item-Burst ist keine automatische Freigabe für beliebige Spellflächen. `reposition.bands` existiert, die aktuelle Ausführung bewegt aber nur einen Band-Schritt. Brennen, Slow und eine allgemeine Statusmaschine existieren nicht.

#### B. Spellmodell: vorhandene Berechnung plus typisierte Effekte

Die Nutzervorstellung „Basiszahl plus Effekt“ passt grundsätzlich. Sie wird **in das bestehende Skillformat eingebaut**, nicht als zweites Spellformat daneben:

- Angriff: `attack.base` + vorhandene Stat-Skalierungen + ATK/MATK-Anteil; dieselbe bestehende Schadenspipeline.
- Schutz/Heilung: vorhandenes `effects[]` mit Basis, Stat und Koeffizient.
- Bewegung: `reposition.bands`, also eine Zahl in Reichweitenbändern; keine vorgetäuschten Meter und kein allgemeines Feld `base` für alle Einheiten.
- Zusatzfunktion: eine unterstützte Kombination aus `effects[]`; Kosten, Ziel und Ablauf gehören zur validierten Definition.
- Thema: `aspects` sowie Name/Beschreibung; ein Aspekt allein autorisiert keinen zusätzlichen mechanischen Effekt.

| Beispiel | Mechanisch in der Definition | Aufgabe des Narrators |
|---|---|---|
| Feuerprojektil | Magischer Angriff, vorhandene Berechnung, Aspekt Fire | Hitze, Flammen und Treffer passend zum gebuchten Ergebnis beschreiben |
| Wirbel/Explosion | Nur eine tatsächlich unterstützte AoE-Form mit festgelegten Zielregeln | Gebuchte Ziele beschreiben, keine weiteren Opfer oder Schäden erfinden |
| Schutzzauber | Barrier oder DEF/MDEF-Effekt mit festem Wert und Ablauf | Sichtbare Gestalt und Wirkung erzählen |
| Blinkartige Technik | Reposition um die definierte Zahl von Bändern | Den gebuchten Ortswechsel im Kampfraum erzählen |
| Eis mit echtem Slow | Erst zulässig, wenn ein Slow-Executor und dessen Regeln implementiert sind | Keine erfundene verlorene Aktion oder Bewegungsreduktion |
| Feuer mit laufendem Brennschaden | Erst zulässig, wenn ein periodischer Schadenseffekt vollständig implementiert ist | Keine nachträglichen HP-Abzüge durch Verbrennungsprosa |

**Entscheidende Richtung:** Bei normalen Skills **Definition → Engine-Auflösung → Narration**. Keine zweite Entscheidung „Narrator erzählt Slow → Extractor trägt es als Kampfstatus nach“. Letzteres macht Formulierungen und Regenerate mechanisch wirksam und widerspricht dem bereits engine-eigenen Kampf.

**Freie Weltanwendungen bleiben möglich:** Planner autorisiert den Einsatz und sein Ziel; Engine bucht Kosten/Probe, Narrator gestaltet die offene Weltwirkung, Extractor meldet erlaubte Weltfakten/Feature-Änderungen. `worldUse` und Feature-Prüfungen wiederverwenden. Ein brennender Vorhang oder eine veränderte Umgebung ist eine andere Domäne als freie HP-, Stat-, Initiative- oder Skilländerungen. Keine kostenlose Weltteleportation aus einem Combat-Reposition-Skill.

**Technische Vereinfachung:** Der verbindliche Erwerbskern von 9C braucht zunächst nur vorhandene Effektarten. Kein generisches Feuer/Eis/Poison-Interaktionssystem, keine frei programmierbaren Effekte, keine Pflicht, alle Ideen des LLM umzusetzen. Bei einer nicht unterstützten Hauptwirkung benennt die Engine die Grenze; sie vergibt keinen kosmetischen „Slow“-Skill und behauptet keine Wirkung.

**Spätere schmale Erweiterungspunkte, noch kein freigegebener Featureumfang:**
- Periodischer Schaden braucht eine gespeicherte Quelle, ein betroffenes Ziel, eine feste Tick-Phase, Betrag, Restdauer und eine einfache Stacking-Regel. Anbindung an die Zugschleife, denselben HP-/Barrier-Abzug und `onDefeat`; nicht als erneuter Angriff mit nochmals Kosten, Varianz oder Crit. Kill-Credit/XP, PC-Tod, Kampfende und Replay gehören dazu.
- Slow braucht eine eindeutige beeinträchtigte Mechanik. Am einfachsten zunächst **eine begrenzte Behinderung gewöhnlicher Bewegung**, ohne zusätzliche Zugausfälle oder neue Initiativeberechnung. Angriff mit Annäherung, selbständige Bewegung, NPC-Schließen und Flucht dürfen keinen unbeabsichtigten Umgehungsweg bilden; magische Reposition ist getrennt zu behandeln.
- Für beide zunächst kampfgebunden und ohne außerweltliche Dauertimer. Noch keine Weltzeit-Statuspersistenz.
- Neue Art erst in Validator, Executor, Ablauf, Anzeige und Regression vollständig unterstützen, **danach** dem Komponisten anbieten. Keine automatische Regel „jedes Feuer brennt, jedes Eis verlangsamt“.
- Diese mechanischen Erweiterungen verlangen eine eigene begrenzte Freigabe; sie sind kein Vorwand, den ersten Lern-/Erwerbspfad zu verschieben. 10B stimmt Zahlen ab, ersetzt aber keine fehlenden Executoren.

#### C. Kleinster sinnvoller Modulzuschnitt

**Zwei neue Fachmodule genügen für den Kern:**
1. `src/skill_composer.js`: reine deterministische Komposition für PC, NPC und Fallback; liefert eine vorhandene Skill- oder Passive-Definition bzw. strukturierte Fehler. Keine Zustandsänderung, kein LLM, keine zweite Kampf-DSL.
2. `src/v4/growth.js`: Quellenprüfung, Vorhaben, Lern-/Trainingsfortschritt, Erwerbsberechtigung, Kandidaten und Transaktionsvorbereitung. Die Funktionen arbeiten mit Zustand, geprüften Eingaben und Events; keine Abhängigkeit vom SillyTavern-UI.

`src/v4/runtime.js` erhält nur die kleine asynchrone Forge-Orchestrierung. Sollte deren Schema/Prompt/Parser umfangreich werden, darf Claude es in ein kleines `src/v4/forge.js` auslagern. Kein Pflichtmodul auf Vorrat, kein Plugin-Framework und keine Queue-Infrastruktur.

`skills.js` und `passives.js` bleiben Besitzer ihrer Validatoren und Registry-Schnittstellen. `combat.js` bleibt zuständig für Kampfauflösung. World-Applier und Engine-Fassade delegieren, statt neue umfangreiche Fachlogik aufzunehmen.

#### D. Ein Entwurf, ein Komponist, eine Definition

Ein kleiner interner **Entwurf** beschreibt die gewünschte Mechanik, z. B.:

- Hauptfunktion: Angriff, Schutz, Reposition, Heilung, Ressourcenumwandlung oder Vorbereitung.
- Unterstützte Angriffsform bzw. Zusatzfunktion; getrennt von thematischen Aspekten.
- Rang, Complexity, Disziplin-Tags, Aspekte.
- Zulässige Ressourcen- und Skalierungsart.
- Eine mechanische Priorität, z. B. Wirkung, Reichweite oder Effizienz.
- Referenz auf die geprüfte Erwerbsgrundlage.

Das ist eine geschlossene Auswahl **mechanischer Bauformen**, keine Liste fertiger Fähigkeiten. Nicht jedes Feld muss der Spieler nennen; der vorhandene Planner übersetzt die erklärte Absicht in diese Felder, und der Komponist ergänzt technische Defaults. Fehlende entscheidende Semantik darf er nicht frei erfinden.

**Komposition:**
1. Quelle und unterstützte Hauptfunktion prüfen.
2. Rang-/Complexity-Grenzen und vorhandene Effekte wählen.
3. Mit einer kleinen deterministischen Regel Basis, Koeffizienten, Kosten und Effektwerte erzeugen. Nicht für jedes Merkmal gleichzeitig das Maximum wählen; eine einfache konfigurierbare Verteilung genügt, kein Optimierungsalgorithmus.
4. Namen/ID innerhalb der Kampagne eindeutig machen.
5. Bestehenden vollständigen Validator ausführen.
6. Exakte Definition liefern oder ohne Buchung fehlschlagen.

**Numerische Regeln:** Vorläufige Kalibrierung und Lernraten stehen zentral im Content, möglichst als Erweiterung von `rules.json`. Bestehende 9B-Grenzen verwenden, statt in mehreren Modulen neue Werte zu erfinden. Gültigkeitsregeln wie bekannte Effektart, endliche Zahlen, zulässige Referenzen, keine Ressourcenzyklen und unterstützte Targets gelten sofort; exakte Balance kommt in 10B.

**Blink:** `reposition` soll langfristig seinen `bands`-Parameter tatsächlich ausführen. Das technische Weiterreichen und Begrenzen des Parameters darf ergänzt werden, ohne `mage.blink` zu buffen: dessen 8 MP und ein Band bleiben in Patch 9 unverändert. Neue zulässige größere Bandwerte erst nach passender Freigabe; keine vorgezogene Reichweitenentscheidung.

**Persistenz:** Gespeichert wird die fertig berechnete Definition. Der Fold komponiert sie nie neu. Neue Defaults in 10B verändern deshalb nicht stillschweigend die gespeicherten Basiswerte alter dynamischer Skills. Eine umfassende Garantie, dass beliebige spätere globale Kampfregeländerungen historische Ergebnisse unverändert lassen, wird damit nicht behauptet.

**IDs/Namen:** Stabile Ableitung aus Kampagnen-/Quellen-/Vorhabenidentität, Kollisionsprüfung und deterministische Auflösung. Namen müssen den aktuellen Zeichen-/Längenregeln und der kampagnenweiten Eindeutigkeit entsprechen; ein wiederholtes „Precision Technique“ ist kein zulässiger Fallback. Ein Buchstabensuffix wie römisch „II“ ist möglich; Platz dafür innerhalb der 40 Zeichen reservieren und den vollständigen Namen erneut prüfen. Statische und alle dynamischen Definitionen einschließlich NPC-Signaturen zählen mit; ID und Anzeigename werden getrennt validiert. Das gehört bereits zum Komponisten in 9C-1.

#### E. Quellen und Lernvorhaben

**Keine zweite Quellen-Datenbank:** Lehrer bleiben Entities, Stones/Handbücher bleiben Objects, Kämpfe/Proben bleiben Engine-Ereignisse. Ein Vorhaben referenziert diese Quellen und hält die für das Lernen relevanten, geprüften Angaben fest.

**Vorhandene Quellenwege zuerst, kein neues `growth.source`-Delta in 9C-1:** Die Lernlogik prüft vorhandene Entities/Objects, gebuchte Services und etablierte Fakten. Ein kleines internes Quellenprofil am Vorhaben enthält Referenzen und die geprüfte Grundlage; es ist kein neuer Extractor-Befehl.
- Lehrer: nachweisbare Kompetenz aus etablierter Rolle/Ausbildung oder tatsächlichem Sheet; Anwesenheit und konkrete Unterrichtszusage zusätzlich prüfen. Bezahlter Unterricht über bestehendes `offer`/`service.granted`, unentgeltlicher über ein belegt etabliertes Fakt, z. B. `teaches`. Ein bloßes Angebot ist noch keine angenommene bezahlte Leistung.
- Lernmaterial/Stones: bestehendes `object.new` und gespeicherte Objektprofile verwenden. **Auf .39 erkennt `itemProfile` noch keine Skill Stones oder Lehrmaterialien; `kind:document` liefert sogar ausdrücklich kein Profil.** Eine kleine Erweiterung der vorhandenen Profilbildung bleibt daher nötig. In 9C-1 genügt der vollständige Lehrerpfad; Stones sind 9C-2.
- Namenswörter dürfen eindeutig erkennbare, unterstützte Quellmerkmale liefern; keine umfassende Wortlisten- oder Freitextinterpretationsmaschine bauen. Unklare Merkmale werden nicht erfunden. Die vom Planner vorgeschlagene Hauptfunktion bleibt gegen die tatsächliche Quelle zu prüfen; sie legitimiert sich nicht selbst.
- `service.granted` enthält ein `what`, der aktuelle Reducer in `v4/domain.js` behält aber nur die letzten zehn Services und verwirft `what`. Eine Unterrichtsberechtigung darf dadurch nicht unbemerkt ablaufen oder ihr Fach verlieren: den nötigen Quellnachweis einmal am Vorhaben sichern. Keine neue Services-Datenbank.
- Die Engine bestimmt zulässige Hauptfunktionen, Tags/Aspekte und Grenzen. Quellen/Fakten buchen weder LP noch Skilldefinitionen, Erfolge oder Boni.
Ein neues typisiertes Extractor-Delta wird erst bei einem konkreten nachgewiesenen Bedarf erwogen, nicht auf Vorrat.

Quellenmerkmale werden am bestehenden Entity/Object gespeichert und im Katalog knapp sichtbar gemacht. Bei Stones sind die mechanisch relevanten Profile nach Etablierung fest. Ein Narrator darf sie später nicht beliebig umschreiben. Existierende Rollen/Sheets, `service.granted` und Fakten können Angaben bestätigen; widersprüchliche Tatsachen haben Vorrang. Ein generischer Klassen- oder Commoner-Fallback ist kein Beleg für Meisterkompetenz. Kein Kampfsheet nur für Unterricht erzeugen.

**Zustandsgerüst:** Ein neuer, vom Event-Fold rekonstruierter Teil `state.growth` hält Vorhaben, offene Kandidaten und eine begrenzte Ansicht relevanter Engine-Belege. Aktive/offene Einträge und Belege haben konfigurierbare Grenzen; abgeschlossene/aufgegebene Vorhaben werden zu kompakten Abschlussnachweisen verdichtet. Benötigte Herkunft, Definitionen und Replay-/Deduplizierungsschutz dürfen dabei nicht verloren gehen. Quellen selbst bleiben an Entities/Objects. Eventfamilien für Vorhabenstart, Fortschritt, Angebot und Abschluss genügen; Namen beim Implementieren an bestehende Konventionen anpassen. Definition/Besitz bleiben die vorhandenen Skill-/Passive-Events. Historische Kampfdetails nicht unbegrenzt zusätzlich kopieren; ein gebundener Beleg bleibt am Vorhaben/Kandidaten nachvollziehbar, auch wenn er aus der aktuellen Promptauswahl fällt. Keine zweite Ereignischronik.

**Neue Vorhaben:** Ziel, Quellreferenz/Belege, Entwurf, LP, Zustand `active|ready|completed|abandoned` und bereits angerechnete Belege. Zum Einstieg höchstens drei aktiv als **vorläufiger Content-Default**, keine neue Verwaltungsoberfläche. `#skills` zeigt die Vorhaben kurz an; natürlicher Text genügt zum Starten, Fortsetzen und Aufgeben.

**Planner-Erweiterung:** `activity train/study` erhält eine kleine optionale Lernangabe: bekanntes Skill-/Vorhaben-/Kandidatenziel oder neues Ziel, Lehrer/Gegenstand, Hauptfunktion, Tags/Aspekte. Schema, Vokabular, `planContext`, `parsePlan`, `mapPlan` und Guard auf denselben Feldern halten; keine isolierte Schemaänderung. Quote muss die eigene Handlung des Spielers tragen. Fragen, Wunschdenken und NPC-Handlungen starten kein Training.

**Quellenprüfung vor Gutschrift:** Lehrer kompetent, anwesend und bereit; Material besessen/zutreffend; keine neue Disziplin allein durch Behauptung. Klassenübergreifend bleibt Lernen mit passender Quelle erlaubt. Selbstübung kann eine bereits legitimierte Richtung oder bekannte Skills vertiefen. Eine Quelle darf Themen einführen, aber keine höhere numerische Macht frei deklarieren.

**Fortschritt:**
- Gebuchte Trainingszeit → LP eines neuen Vorhabens oder PP eines bekannten Skills.
- `service.granted` allein → keine LP.
- Qualifizierender Kampf → PP wie bisher und zusätzlich LP nur für ein tatsächlich passendes aktives Vorhaben.
- Höchste passende Affinität einmal anwenden.
- Eine Stunde wird nicht dreimal voll an drei Vorhaben vergeben.
- Schlüssel pro Session/Kampf/Probe schützen gegen Wiederholung; unabhängig von bloß gleicher Uhrzeit.
- Tagesweise summieren: pro Vorhaben bzw. bekanntem Skill und Spieltag gebuchte Minuten sowie bereits gutgeschriebenen Fortschritt halten; eine neue Gutschrift ist `f(Tagessumme) − bereits vergeben`. Rundung und Tagesgrenze liegen in `f`, nicht je Sitzung. So ergeben 60 Minuten und dreimal 20 Minuten denselben Fortschritt.
- Bei unterschiedlichen Lernraten (Lehrer/Selbstübung) die Minuten nach Lernart summieren und gemeinsam auswerten; ein Wechsel darf frühere Selbstlernzeit nicht nachträglich zum Lehrertarif vergüten. Keine neue Balancing-Regel: Raten und Grenzen bleiben konfigurierbare Defaults.
- Sitzungen über Mitternacht anhand des tatsächlich gebuchten Zeitintervalls auf die Spieltage teilen. Dieselbe Minute wird nur einmal einem Lernziel zugeordnet; keine zusätzliche Restminuten-Leiste.

Die bestehenden LP-Schwellen C1/C2/C3 (100/200/300) und die früher vorgeschlagenen Raten (Lehrer 20/h, selbst 10/h, Kampf 12) sind **Test-/Startdefaults, keine neu beschlossene Balance**. Tagesgrenzen und Vorhabenzahl konfigurierbar halten. Keine komplizierte Anti-Farm-Simulation. P5 bleibt das Proficiency-Maximum.

#### F. Eine gemeinsame Abschlussbuchung

Progression und Definition bleiben getrennt:
1. Synchroner Engine-Zug prüft Handlung, bucht legitime Zeit/Fortschritt und markiert ein Vorhaben als `ready`.
2. Eine gemeinsame Abschlussstufe sucht bei **jedem erfolgreichen regulären `plannedTurn`** im tatsächlich entstandenen Zustand nach `ready`-Vorhaben, auch nach einem Kampf über den V3-gerouteten C-Pfad. Sie verlangt kein neues Ready-Ereignis im aktuellen Zug.
3. Sie bereitet den Entwurf vor; in 9C-1 deterministisch, in 9C-2 optional durch die Forge gestaltet.
4. `defineSkill`/`learnSkill` bzw. `definePassive`/`gainPassive` und alle Quellen-/Abschlussereignisse werden auf einer privaten Zustandskopie vollständig geprüft.
5. Erst bei vollständigem Erfolg wird die ganze Eventfolge in den **bestehenden** Nachrichten-Record übernommen. Keine zusätzliche Event-Datei oder Datenbank.
6. Outcome/Systemanzeige und Narrator-Kontext nennen die wirklich gebuchte Fähigkeit.

**Atomar bedeutet hier:** Bei fehlgeschlagenem Abschluss keine halbe Definition, kein Stone-Verbrauch, kein entferntes Vorgängerskill und kein verlorenes LP. Eine zuvor legitim durchgeführte Trainingsstunde bleibt eine durchgeführte Stunde; ein Fehler beim letzten Erwerb ist kein Grund, den ganzen Tag rückwirkend zu erstatten.

Fertige Lernvorhaben vergeben während eines aktiven Kampfes nichts; sie warten auf das reguläre Ende. Laufende Snapshots bleiben unverändert. Quellen-, Rang- und Besitzprüfung unmittelbar vor Abschluss wiederholen.

**Integration:** Gemeinsame Finalisierung hinter beiden erfolgreichen `plannedTurn`-Routen, vor Übergabe an den Narrator. Ein im Antwortpfad (`openCommitted`) beendeter Kampf muss seine Belege/Fortschritte synchron über den gemeinsamen Kampfabschluss buchen; dort darf ein Vorhaben `ready` werden. Der nächste geeignete normale Spielerzug findet diesen Zustand auch ohne neues Kampf-/Trainingsevent. Dafür braucht es keinen zusätzlichen asynchronen Erwerbs-/Forge-Hook im Antwortpfad; ein bloßer späterer Scan ersetzt jedoch nicht die dortige Fortschrittsbuchung. Abschluss bleibt außerhalb laufender Kämpfe und nur für eine lebende, gültige Spielfigur zulässig. Keine Finalisierung bei bloßen Info-Panels oder fehlgeschlagenem Planner. Direkte synchrone Engine-/Node-Tests verwenden dieselbe deterministische Abschlussfunktion; kein Engine-Kern wird wegen der Forge asynchron. V3/V4-A bekommen keinen neuen LLM-Erwerbsworkflow als Nebenaufgabe.

#### G. Forge, besondere Erwerbe und Passives

**Forge erst in 9C-2:** Kleines geschlossenes Schema nach dem Board-Muster. Name, Beschreibung und erlaubte kreative Formwahl; keine frei gewählten Zahlen, Preise, Ränge, Quellen oder zusätzlichen Effektarten. Die geprüfte Quelle beschränkt die Auswahl. Der Komponist und danach der Validator bleiben maßgeblich.

- Nur bei echtem anstehendem Abschluss, außerhalb eines laufenden Kampfes.
- Eine Reparatur, danach gültiger deterministischer Fallback. Ist auch kein gültiger Fallback möglich, bleibt das Vorhaben bereit bzw. der Gegenstand erhalten.
- Antwort, Entwurf, Ausführungs-/Quellschlüssel, Version und technische Call-Metadaten im bestehenden User-Record ablegen.
- Bei gültigem Record wiederverwenden; Fold/Reload ruft kein LLM auf.
- Nach asynchronem Aufruf Kampagne, Input-Hash, Quelle und Gültigkeit des Records nochmals prüfen. Ein veraltetes Ergebnis darf nichts buchen.
- Bestehende Extractor-/Commit-Barriere erhalten; keine Hintergrundjobs oder parallele Zustandsautorität.

**Skill Stones:** Profil bei Etablierung, vollständige Definition bei erster gültiger Aktivierung. Besitz, Rang, Quelle und Dopplungen zuerst prüfen. Verbrauch einer konkreten Einheit nur zusammen mit erfolgreichem Abschluss. Quelle/Objektidentität legt die Bindung fest; Regenerate erzeugt nicht wiederholt neue Techniken aus demselben gespeicherten Erwerbsversuch. Ein bereits gebuchter Skill wird nie still umbenannt oder neu komponiert.

**Besondere Erfahrung:** Keine vollständige Chatanalyse. Kleine Belege aus den tatsächlichen Engine-Auflösungen verwenden. Weil `enc.log` gekürzt wird, nötige zusammenfassende Belege während der Auflösung bzw. am Kampfende festhalten; spätere Herkunft nicht aus den letzten 20 Zeilen raten. Ein passender PP-Beleg kann helfen, ist aber nicht die einzige zulässige Quelle für eine neue Disziplin.

**Kein neues `growth.hint`-Delta als Pflichtumfang:** In 9C-2 zunächst die vorhandenen bzw. am tatsächlichen Auflösungspfad verdichteten Engine-Belege nutzen. PP-Belege sind ein Ausgangspunkt, aber nicht die einzige mögliche Grundlage einer neuen Disziplin. Erst eine konkrete nachgewiesene Lücke rechtfertigt einen weiteren Extractor-Typ. Engine prüft tatsächliches Geschehen, Zusammenhang, Dopplung und ausreichende Quelle; keine Vergabe aus bloßer Erzählerbehauptung und kein Forge-Aufruf für jeden Hinweis.

**Vorgeschlagener Interaktionsdefault, noch als Gameplay-Detail zu bestätigen:** mögliche spontane Entwicklung einmal dezent anzeigen; eine passende Handlung des Spielers greift sie auf. Keine Pflicht-Popups und keine Zwangsaktionen. Bereits ausreichend belegte Entwicklung darf dann sofort bereit sein; kein allgemeiner nachgeschalteter Vollgrind.

**Passives:** Dieselben Quellen-/Abschlussregeln und der vorhandene Passive-Validator. Keine Starter-Passives, keine Passive pro Level/Rang. Seltenheit über außergewöhnliche Quellen und vorläufige Vergaberegeln, nicht über eine neue Besitzobergrenze. Dauerhafte ATK/DEF-, Pool- und Resistenzwirkungen über Passives; neue Core-Stat-Bonusregeln sind kein Pflichtumfang von 9C. Belohnungen können Unterricht, ein Gegenstand oder eine belegte besondere Erfahrung sein; kein Gegenstandszwang.

#### H. Evolution, NPCs und Rangunterstützung

**Evolution:** eigener unveränderlicher Nachfolger mit gespeicherter Vorgängerreferenz. P5 erlaubt die Entwicklung, ist allein aber kein Auslöser. Dasselbe Vorhaben-/Quellmodell nutzen; keine zweite EP-Leiste. Bereits maßgebliche Erfahrung anrechnen, statt nach P5 pauschal ein vollständiges LP-Ziel von null zu verlangen.

**Vorgeschlagener Default:** konkreten Nachfolger anbieten und nach Zustimmung den Vorgänger aus den aktiven Skills nehmen. Definition, vorherige Proficiency und Abstammung bleiben über Events/Historie erhalten. **Vorgeschlagener Zustimmungsweg, noch offen:** `#skills` zeigt den konkreten Kandidaten mit Veränderung und Ersatzfolge. Eine ausdrücklich auf diesen eindeutig referenzierten Kandidaten gerichtete Trainingsaktion kann die Zustimmung sein; Frage, Lernwunsch oder Training des alten Skills genügen nicht. Bei bereits erfüllten Voraussetzungen kein neues Mindeststunden-Ziel nur zur Bestätigung. Ein kleines gemeinsames Austauschereignis bzw. geprüfte Abschlussfolge genügt; kein Klassenbaum und keine Migrationsmaschine.

**Kein automatisches „Complexity +1 → P1“:** Das frühere Argument war unvollständig. `rawPower` enthält ATK/MATK-Anteile; P5 wirkt auch darauf und auf Kosten. Bei Stat 10 und Waffenanteil 20 ergibt ein C1-Maximalangriff auf P5 61,2 Rohkraft, ein C2-Maximalangriff auf P1 nur 60, dazu möglicherweise höhere Kosten. Obergrenzen sind keine Mindestwerte. Nachfolger nach tatsächlicher Hauptwirkung, Kosten und Funktion prüfen. **Einfacher vorläufiger Implementierungsdefault:** die erreichte Proficiency übernehmen (bei P5: P5 und 0 PP), statt einen automatischen Reset oder eine komplizierte Umrechnung einzuführen. Neue Evolution braucht neue passende Belege nach dem letzten Erwerb; kein Wiederverwenden derselben Grundlage für eine Evolutionsschleife. Kein universeller Nachweis, dass ein neuer Skill in jeder Situation stärker ist. Trade-offs sichtbar anbieten; 10B stimmt die Werte ab.

**NPC-Signaturen:** deterministischer Komponist an `materialise` vor `entity.sheet_set` und Encounter-Snapshot. `humanSheet` bleibt eine Berechnung ohne eigenen Event-Emitter. Ein umgebender Engine-Schritt erstellt die Definitionen, validiert die Folge, gibt sie vor dem finalen Sheet aus und setzt das Sheet einmalig. Bei Wiederbegegnung wird nichts neu generiert.

- Seed + NPC-Identität + etablierte Rolle/Ausbildung/Rang/Fähigkeiten.
- Kein Verbrauch zusätzlicher Kampf-RNG-Würfe nur für das Skilldesign.
- Fakten/Sheet vor Template-Fallback; ein dramatisches Adjektiv erzeugt keinen beliebigen Level.
- Ein einfacher konfigurierbarer Umfang genügt. Seed-Variation füllt offene Details, überstimmt keine bereits etablierte Technik.
- Keine allgemeinen Zusatzkampftechniken für untrainierte Zivilisten. Das ist kein Verbot aller denkbaren nichtkämpferischen Besonderheiten der Welt.
- Zunächst NPC-Kompositionen erzeugen, die die vorhandene Angriffs-/Defensivpolicy tatsächlich nutzen kann. Heal/Restore/Blink für NPCs sind heute nicht ausgewählt; sie nicht als funktionierende neue NPC-KI behaupten. Deren umfassendere Integration bleibt 9D bzw. einer konkreten Freigabe.
- Keine LLM-Aufrufe bei Sheet-Bau oder NPC-Zügen.
- `materialise` wird auch im Probelauf `areaLegal` auf Zustands-/Encounter-Kopien aufgerufen. Definitionen müssen dort vor dem Snapshot ebenfalls nur in die private Kopie gelangen. Der echte Pfad bucht dieselbe gültige Definition genau einmal; Trial verändert weder persistente Registry noch Content-Maps oder den echten RNG-Stand.

**Ownership:** Definitionen sind weiterhin Engine-eigen. Im Antwortpfad eine gezielte deklarierte Engine-Folge mit Gate, keine pauschalen `skills`-Schreibrechte für `person.new`, `hostile` oder `fact`. Quellen dürfen Weltattribute melden; mechanischer Erwerb bleibt ausschließlich der geprüften Abschlusslogik vorbehalten. `state.growth` im Ownership-Fingerprint der Progression berücksichtigen; reine Quellenbeschreibungen bleiben Weltattribute. Fingerprints, State-Validierung und Tests erweitern.

**Ränge:** Tabellenbasierter Zugriff ab 9C-1, zunächst nur vorhandene F-Werte aktiv. In 9C-3 E als erste kontrollierte höhere Stufe mit ausdrücklich provisorischen Grenzen abnehmen. Unbekannte/nicht kalibrierte Ränge werden verständlich abgelehnt, nicht still auf F zurückgesetzt. D–S-Kalibrierung ist kein Pflichtumfang. Den erforderlichen Rang beim neuen Erwerb/bei Evolution und bei der Erzeugung eines NPC-Sheets zentral prüfen. Wegen monotoner Spieler-Ränge und fester NPC-Profile ist kein zusätzliches paralleles Rang-Gate für jeden Kampfeinsatz vorgesehen. Vorhandene Nutzungs-/Kosten-/Target-Validierung bleibt bestehen. Ein später eingeführter Rangverlust oder Skilltransfer würde diese Annahme neu prüfpflichtig machen. STA-Basis ist 100, kann durch vorhandene Passives steigen; keine blinde Kostenmultiplikation und kein daraus abgeleitetes generelles Verbot höherer Kosten.

**Regeltexte und Narrator ab 9C-1:** `content/rules_text.json`, Eintrag `content.10.r2`, sperrt heute „no evolution, passive or class change is offered or narrated as gained“. Die pauschale Sperre gezielt durch den jeweiligen Implementierungsstand ersetzen: 9C-1 erlaubt Engine-gebuchten Skill-Erwerb; Passives folgen in 9C-2, Skill-Evolution in 9C-3, Klassen-Evolution bleibt bis 9D gesperrt. Der aktive Narrator-Vertrag (`content/narrator.json` und referenzierte Vertragsquelle) darf **neuen** Erwerb nur erzählen, wenn ihn der Engine-Block als gebucht ausweist. Bereits bekannte Skills bleiben normal erzählbar. Unterricht/Zusage ist kein Erwerb. Relevante Regeln und der reale Promptpfad müssen dies widerspruchsfrei liefern.

#### I. Teilpatches und konkrete Abnahme

| Teilpatch | Lieferumfang | Nachweis |
|---|---|---|
| **9C-1: Composer & Learning – IMPLEMENTIERT .41, Gegenreview offen** | Zwei Fachmodule; F-Komponist für vorhandene Effekte; strukturierte Lernabsicht und Quellen; tatsächliche Trainings-LP/PP; Vorhaben; gemeinsame deterministische Abschlussbuchung; vorhandene Anzeigen/Ownership; Regeltexte und Narrator zum ersten Erwerb | Eine neue, nicht im Content vorhandene F-Technik aus echter Lernaktion erwerben und im Produktpfad ausführen; Angriff UND mindestens ein nichtoffensiver Formfall; PP-Training; falsche Quelle/ungültiger Entwurf ohne Erwerb; Session-/Replay-Deduplizierung; Legacy |
| **9C-2: Forge & Special Acquisition** | Seltener Forge-Aufruf; Stones/Materialien über vorhandene Objekte; belegte spontane Kandidaten; echter Passive-Erwerb; Fehler-/Stale-Record-Schutz | Echte individuelle Fähigkeit im GLM-Lauf erwerben UND einsetzen; Stone genau einmal verbraucht; Quelle/LP bei Fehlschlag erhalten; Passive mechanisch wirksam; Regenerate/Reload ohne neue Vergabe |
| **9C-3: Evolution & NPC Integration** | Herkunft/Nachfolger und angenommener Austausch; NPC-Signaturen vor Snapshot; kontrollierte E-Unterstützung | P5-Entwicklung mit sichtbarer Linie; keine kostenlose Dopplung/ungefragter Verlust; wiederkehrender NPC mit persistenter eingesetzter Technik; NPC-Start aus Narrator-Antwort; F/E-Prüfung, Legacy und Replay |

Keine zusätzliche neue Testspieler-Infrastruktur. `tools/st_live/live/guides/current_test.json` bleibt der einzige neue Live-Guide. Engine- und Runner-Commits getrennt, falls überhaupt ein Runner-Fix nötig ist.

**Pro Teilpatch:** gezielte Regressionen während der Arbeit, eine vollständige `npm test`-Abschlussprüfung; nur bei relevanter Hostintegration zusätzlicher verfügbarer ST-Smoke. Keine Tests für jede Beispielzahl, sondern echte Invarianten und mindestens ein vollständiger Produktpfad. Testberichte nennen Ausführung und Grenzen; keine erfundenen Live-Passes.

**Besonders wichtige Regressionen:**
- Forge-/Erwerbsabschluss nach V4-Aktivität **und** nach C-Kampfabschluss über den V3-gerouteten Pfad; im Antwortpfad bereit gewordenes Vorhaben wird im nächsten geeigneten regulären Spielerzug ohne neues Ready-Ereignis genau einmal abgeschlossen.
- Zwei gleich benannte Entwürfe, doppelte Quelle, bereits gelernter Skill, keine Fallback-Namenskollision.
- Training nur gekauft vs. tatsächlich absolviert; Quelle abwesend/ungeeignet; Service-Nachweis trotz gekürzter Service-Ansicht erhalten; 60 Minuten vs. dreimal 20, gemischte Lernarten und Mitternacht; keine Mehrfachgutschrift derselben Session; „ich würde gern lernen …“ ohne Lernhandlung bucht weder Training noch Fortschritt.
- Definition/Erwerb/Stone-Verbrauch/Austausch als vollständige Folge; Rücknahme des zugehörigen Records nimmt alles zurück.
- Keine Definition beim Fold, keine Content-Map-Mutation, keine Änderung gesperrter Snapshots, keine neue Fähigkeit allein aus Erzählerbehauptung; NPC-Signaturen im Trial nur auf Kopien, im Commit genau einmal; Reload/Replay identisch.
- Neue Skillform im Planner, Combat-HUD, `#skills/#skill`, Context und realer Ausführung; tatsächlicher Narrator-Prompt erlaubt nur gebuchten Erwerb und weiterhin keine Klassen-Evolution. Vokabular-/Planner-/Extractor-/Ownership-Versionen bei ihren Änderungen nachvollziehbar erhöhen; optionale neue Felder dürfen alte Records nicht ungültig machen.
- Echte Weltanwendung bleibt über die vorhandenen Autoritätsgrenzen eingeschränkt.

#### J. Review-Freigabe und Abgrenzung zu 10B

**Aktuelle Freigabegrenze:** 9C-1 wurde beauftragt und implementiert. Zuerst unabhängiges Claude-Gegenreview von `d0808eb` → `d27e877`; 9C-2/9C-3 bleiben gesondert freizugeben. Keine erneute allgemeine Debatte über beschlossene Startklassen.

**Jetzt festlegen:** Datenmodell, Einheiten, Ownership, unterstützte Hauptfunktionen, Buchungsreihenfolge, Persistenz, Fehlerverhalten und Integrationspfade.

**10B:** endgültige Power-/Kosten-/Dauergrenzen, LP-/PP-Raten und Tageslimits, Seltenheit, NPC-Häufigkeit, Progressionstempo, Gesamtbalance, Blink-Buff, breite Rangkalibrierung und Performance-Feintuning. Diese spätere Abstimmung ist kein Grund, technische Validierung oder tatsächliche Effektwirkung heute wegzulassen.

**Nicht als bereits implementiert ausgeben:** Forge, Skill Stones/Lernmaterial, Durchbrüche, Passive-Erwerb, Skill-Evolution, NPC-Signaturen, E-Erweiterung und Burn/Slow. Tatsächlich implementiert ist der schmalere 9C-1-Lehrerpfad mit C1/F und fünf Grundfunktionen. .41 korrigiert Tages-LP/PP, Lehrerkompetenz und gebundene Zusagen; fünf Regressionen vorher rot/nachher grün, 17/17 gezielt und 1147/1147 gesamt hier ausgeführt. Kein neuer Livetest; Gegenreview ausstehend.


#### K. Review-Verlauf und ausdrücklich offene Entscheidungen

**Nachvollziehbarkeit:** `b557f14` hat §1a.2b neu gefasst, die frühere Claude-Bewertung und die Entscheidungstabelle also nicht wörtlich erhalten. Der [vollständige vorherige Plan einschließlich aller 13 Claude-Anmerkungen und beider offenen Fragen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c918973/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) bleibt unverändert in Git lesbar. Die folgende Übersicht hält den gültigen Verlauf und die verbleibenden Entscheidungen im aktuellen Arbeitsstand sichtbar.

1. Erster GPT-Entwurf → Claude-Architekturprüfung → GPT-Neuprüfung → Claude-Bewertung: gemeinsamer Komponist, seltene Forge, getrennte Definition/Besitz, vorhandene Trainings-/Inventarwege und deterministische NPCs.
2. Erneute GPT-Codeprüfung: ATK/MATK fehlen in Claudes früherem P1-Vergleich; kein zwingender Neustart auf P1, kein neuer pauschaler LP-Vollgrind nach P5, kein Gegenstandszwang für Belohnungen. Weltfakten können geprüfte Lehrer-/Materialquellen belegen. NPC-Seed überstimmt keine etablierte Technik. STA 100 ist der Grundwert, keine unveränderliche Obergrenze; aus 10.500 XP folgt keine feste Kampfanzahl.
3. Technischer Plan `b557f14`: zwei Fachmodule, vorhandenes Spell-/Effektmodell, mechanische Auflösung vor Narration, gemeinsamer Abschluss über beide C-Routen, Balance in 10B.
4. Aktuelle Claude-Gegenprüfung, erneut am Code .39 geprüft: kein Quellen-/Hint-Delta auf Vorrat; Tagesaggregation; persistentes Ready am nächsten regulären Spielerzug abschließen; Erwerbs-Rangprüfung ohne zusätzliches Combat-Gate; gültige eindeutige Namen; konkreter optionaler Zustimmungsweg; Regeltexte/Narrator; NPC-Trial-Pfad. Ergänzend: Quellnachweis trotz Service-Kürzung sichern und gemischte Lernraten nicht rückwirkend umwerten.

| Offene Nutzerentscheidung | A | B | Aktuelle Empfehlung / Zeitpunkt |
|---|---|---|---|
| Spontaner Durchbruch | Einmaliges dezentes Angebot, passende Spielerhandlung greift es auf | Automatischer Erwerb bei eindeutig qualifizierendem Ereignis | **A empfohlen, nicht beschlossen**; vor 9C-2. Automatischer Fortschritt ist nicht grundsätzlich ein Agency-Verstoß. |
| Umgang mit Vorgänger nach Evolution | Konkreter angenommener Nachfolger ersetzt aktiven Vorgänger; Historie bleibt | Beide bleiben nutzbar | **A leicht bevorzugt, nicht beschlossen**; vor 9C-3. Begründung: übersichtliche Entwicklungslinie, kein pauschaler Stärkevergleich. Training des eindeutigen Kandidaten als Zustimmung ist ebenfalls nur ein Vorschlag. |

**9C-1 ist von diesen beiden Gameplayentscheidungen unabhängig.** Numerische Startwerte bleiben provisorisch; endgültige Abstimmung in 10B. Die Empfehlungen zu diesen offenen Gameplayfragen geben 9C-2/9C-3 nicht frei.

### 1a.3 Patch 10B – Balancing, Performance & Final Polish

**STATUS: VERBINDLICHE ABSCHLUSSPHASE, NOCH NICHT IMPLEMENTIERT. Patch 10A ist nicht erneut zu entwickeln.** Die bestehende **53-Punkte-Abnahmeliste** bleibt Grundlage. Dieser Abschnitt bündelt nachgewiesene Hauptentscheidungen; er **erfindet keine 53 Einzelpunkte** und ersetzt deren Originalfassung nicht.

**A. XP, Progression, Loot und Farm-Balance**
- Bestehende Levelschwelle **Level × 100 XP** als Ausgangsbasis prüfen; Gegner-XP **12 / 18 / 20** als **Simulationsvarianten**, nicht bereits festgelegte Endwerte vergleichen. Elite **×1,5**, Boss **×2,5** als vorhandene Balancingannahmen mitprüfen.
- Spürbarer, eher zügiger früher Fortschritt; langfristig sinnvolle Powerkurve einschließlich Patch-9-Entwicklung. Monsterjagd, Exploration und Dungeons sollen **auch ohne Gildenquest** Fortschritt erlauben. Questreward, Kampf-XP, Loot, Risiko und Aufwand zusammen simulieren.
- **Kein Farm-XP-Nerf** oder künstliche Diminishing Returns nur wegen wiederholter Gegnerjagd. Kein automatisches Level-Scaling von Monstern an Alaric; Rang, Ort und Monsterprofil bleiben maßgeblich. Nicht vor belastbaren Langzeitdaten pauschal an Zahlen drehen.

**B. LLM-/Prompt-/Provider- und Engine-Performance**
- Unabhängig messen: Interpreter/Planner, Board, Narrator, Extractor, System-Panels; Input-/Output-Tokens, Reasoning, Caching, Latenz, Reparaturen und Fehler. Die **103 LLM-Aufrufe** aus einem früheren Audit (je 34 Interpreter/Narrator/Extractor plus 1 Planner) sind **historische Messung**, nicht automatisch die aktuelle Runtime.
- Prompt-Reihenfolge, Lorebook-/Vertrag-Prefixe, dynamische World-Info, Kontextbudget und echte Provider-Cache-Treffer systematisch A/B prüfen; strukturierte Ausgaben und Antwort-/Reasoning-Limits so abstimmen, dass keine wichtigen Fakten oder Narrative verloren gehen.
- Unnötige LLM-Aufrufe nur dann vermeiden, wenn Mechanik, World-Persistenz und Erzählerqualität gleich bleiben. Engine-only-Anzeigen bei wirklich reinen Systemaktionen sind Kandidaten. **Kein Qualitätsverlust bloß für Geschwindigkeit; keine unbewiesene 3→2-Aufruf-Zusammenlegung oder zusätzliche große Persistenz-/Memory-Architektur.**
- Lange Event-Chats, Fold-/Replay-Kosten und State-Wachstum messen; keine Optimierung, die deterministischen Replay, Save/Load, Regenerate oder Authority-Firewall beeinträchtigt.

**Blink-Balancing – ausschließlich 10B (Nutzerentscheidung 22.10.2026):** Derzeit kostet `mage.blink` 8 MP und setzt maximal **ein Range Band** um; es verbraucht die Hauptaktion. Normale Bewegung kombiniert mit einem Angriff kann dadurch attraktiver sein. In 10B anhand der Turn-Ökonomie, Nahkampf- und Fernkampf-Gegner, MP-Ressourcen und Escape-Mechanik testen, ob **zwei oder drei Range Bands** angemessen sind. Den `effects[].bands`-Parameter tatsächlich im Combat-Resolver berücksichtigen, sofern Reichweitenbuff; aktuell benutzt `skillAction()` für `reposition` nur einen Schritt, unabhängig vom Parameter. Regression ENGAGED→MEDIUM/LONG, Gegner-Nachsetzen, Reichweiten-Cap, Skillkosten, kein unberechtigtes sofortiges `flee`. **Patch 9 darf Blink nicht buffen.** Dort nur nichtoffensive Skills sichtbar machen und ihre vorhandene Benutzung regressionsprüfen.

**C. Gameplay-Qualität, UI und Integration**
- **Vorhandenes 10A-/Runtime-HUD erhalten**, keine zweite UI-Großimplementierung. Gezielt prüfen: Defense-/Utility-Skill-Anzeige samt Kosten/Wirkung, Focused Ward + Movement, Inventar, Status, Quest- und Level-up-Systemkarten, Lesbarkeit und sinnvolle kurze Engine-Meldungen.
- Kompletten Sandbox-Spielablauf abnehmen: Charakteraufbau und organische Entwicklung, Gildenquests, Reisen, Suchen, NPC-Gespräche, Kampfgruppen, Dungeon-Gates/Etagen/Bosse/Reset, Loot, Shop, READY/Turn-in, freie Entscheidungen. Keine bedeutungslosen Reisezwischenstopps, Trophäenpflicht oder starren Hauptquestketten.
- Narrator-Kreativität beibehalten, aber keine nicht gebuchten Gegenstände, Gegner, Skills, Statpunkte, XP oder Erfolge als tatsächlich erfolgt darstellen. Keine vermischten Zuständigkeiten von Spieler, LLM-Erzähler, Planner und JS-Engine.

**D. Langzeit-/Regressionstests und Freigabe**
- Echte und automatisierte Mehrstufenläufe sowie Stresstests um **100 / 500 / 1.000 Züge**: Promptwachstum, Latenz, State-/Eventwachstum, Inventar, offene Quests, NPC-/Weltgedächtnis, Save/Reload, Swipe/Replay und Stabilität.
- Reale Fehlerfälle als Regressionen: Gruppencombat, Quest-Cull-Zahlen, Boss/Etage/Reset, mehrfacher Verkauf, XP/Level-up und echte Statbuchung, leere Narrator-Ausgabe, Fehlinterpretation langer Spieleraktionen, unautorisiertes Gegner-Spawning, Inventar-/Questwahrheit.
- **53-Punkte-Abnahmeliste** vollständig gegen Code, Regressionstests und echte GLM-/SillyTavern-Runs prüfen; nicht nur Zahl bestandener Tests, sondern belastbare mechanische und erzählerische Qualität. Restpunkte sichtbar dokumentieren und priorisieren.

**Abschlusskriterium:** Patch 10B ist **keine Sammelstelle für unbegrenzt neue Features**. Finale Balance beruht auf Messung, die wichtigsten Qualitäts-/Performance-Ausreißer sind korrigiert oder transparent bewertet, und die bestehende Abnahmeliste belegt ein dauerhaft stabiles und unterhaltsames RPG.

### 1a.4 Historische Notizen richtig lesen

Alle älteren Hinweise „F1/#71 Klassenumbau verworfen“, „fünf Starterklassen bleiben dauerhaft“, „Patch 8.2 noch nicht implementiert“ oder „kein realer automatisierter GLM-Test“ sind **historische Aussagen**, sofern durch die jüngeren Designentscheidungen oder die echten Implementierungs- und Testnachweise überholt. **Patch 9: drei Klassen verbindlich. Patch 10A: nicht wiederholen. Patch 10B: ausdrücklich geplant.** Später folgende Abschnitte des Archivs bleiben als Review-Geschichte erhalten, nicht als gleichrangige aktuelle Arbeitsaufträge.


## 2. Übergeordnete Erkenntnis – die zentrale Richtung

**„LLM versteht wie GM, Engine rechnet wie Spiel“.** Nächste Optimierung: nicht jede mechanische Handlung doppelt vom Narrator beschreiben/entscheiden lassen.

| Handlungskategorie | Zuständigkeit | Beispiele |
|---|---|---|
| **Systemvorgang** | Engine+UI, im reinen Fall weder Narrator noch Extractor | Bekanntes Guild-Board lesen, `#status`, `#bag`, `#map`, Questjournal, reine Infoabfrage |
| **Mechanisch aufgelöst** | Engine bucht; Narrator bei relevantem Erzählgewinn, Extractor nur für noch offene Weltfakten | Combat, Kauf, Loot, Rest, Questcredit, Dungeon-Gate, bekannte sichere Wege |
| **Offene Situation** | Narrator kreativ; Extractor/Firewall persistieren zulässige Weltänderungen | Gespräch, Verhandlung, ungewöhnlicher Zauber/Umwelteinsatz, frei erkundete Welt |
| **Mischturn** | Vollständige autorisierte Kommandoliste; offenster Teil bestimmt nötige Narration/Extraktion | „Board lesen UND Schreiber befragen“ ist keine reine Panel-Aktion |

Claude schlug persistentes `turn.mode: system|resolved|open` vor. **Konsens nach Gegenreview:** kein weiteres persistentes State-Feld, kein großes Router-Framework. Ein **abgeleitetes, lokales Ausführungsprofil** beim ersten Bedarf, zunächst nur `panel` vs. `full`; später `combat_lite` oder szenenspezifische Prompts nur bei echtem Nutzen. Bestehende `command.panels`, Outcomes und Routing sind maßgeblich.

**Engine first ≠ Narrator stumm überall.** Freie, bedeutungsvolle Weltreaktionen bleiben LLM-Aufgabe. Kein starrer Storygenerator und keine falschen automatischen PC-Handlungen.

## 3. Großer 141-Punkte-Ideenkatalog – thematisch verdichteter Index

Im langen Chat wurden **141 nummerierte Punkte** kritisch bewertet. Diese Übersicht bewahrt die Themen, Beschlüsse und konkreten Kandidaten; sie ist **keine Liste von 141 genehmigten Features**:

- **01–13 Architektur/Truth:** kompakter bindender STATE NOW; klare Action-Endzustände; objektive Fakten von NPC-Behauptungen/Gerüchten trennen; alte Promptregeln bereinigen; stabile Monsterhandles; nur relevante Extractor-Arbeit; Spielerwissen; unabhängige Handlungsschritte; schlanke Szenensummary; sichere Extractor-Fehlerbehandlung.
- **14–28 Dungeons:** erkennbare System-Dungeons, Gate-Info (in .26 implementiert), Floor-Fortschritt, bedeutungsvolle statt leere Räume, optionale Karte, bekannte Rangwarnung, Bossphasen und telegraphierte Angriffe, Resetvarianten, seltene Events, CLEAR-Karte, sichere Rückwege, sichtbare fremde Gruppen.
- **29–43 Gildenquests:** allgemeine mechanische Questfamilien `CULL/CLEAR/ESCORT/DELIVER/RECOVER/DEFEND` als **Gerüst statt fester Story**; Erfüllbarkeit bereits bei Boardbuchung; aktive Questanzeige; optional angeheftetes Ziel; enginegebuchter Fortschritt; READY vs. TURN-IN; keine Trophäen; echte Escort-/Deliverybedingungen; alternative Lösungswege; tagesstabiles Board; regionale Identität; `q.dungeon` für Orts-Credit; kausale Folgeaufträge; Qualitätsfilter.
- **44–56 Reisen/Suchen:** persistente Reiseabsicht; `lokale Bewegung / bekannte Reise / offene Erkundung`; nur entscheidungsrelevante Unterbrechungen; mögliche Pacing-Tendenz nach ruhigen Abschnitten; Suche ohne triviale Checks/Endlosschleifen; orts-/tageszeitbezogene Gefahren; persistente Orte; Ziel nicht bei Nebenentdeckung verlieren; sichere Schnellreise als spätere Option.
- **57–70 NPCs/Städte:** persistente wichtige NPCs und Dienstleistungsrollen, kleine Tagesroutinen statt autonome Vollsimulation, zuverlässige Standardshops, begrenzt persistente Sortimente, bedeutsames statt rein erwähnungsbasiertes Memory, Ereignisreferenzen, grobe Relations, Gerüchteausbreitung, vereinfachte Fraktionsinteressen, wiederkehrende Abenteurer; keine globale Temperamentmaschine.
- **71–87 Progression/Loot:** **#71 Klassenumbau AUSDRÜCKLICH VERWORFEN/IGNORIEREN**; organische Klassenentwicklung ohne starre Evolutionsbäume, enginekompatible Skill-Bausteine, Targets/Reichweite, Umweltwirkungen, permanente Besonderheiten, Training, Synergien, Skill Stones, unterschiedliche Elite-/Bossfähigkeiten, erkennbare Lootqualität, automatische Beute, Sammelverkauf, plausible Wertbereiche.
- **88–101 UI:** unterschiedliche klare Systemkarten, Debug- vs. Spieleransicht, bedeutende Ereignisse hervorheben, Gruppenkampf-HUD, Defense-/Utility-Skills sichtbar, Kosten vor Aktionen, HP-Truth, Fokuszeile, bekannte Orts-/Dungeon-Karte, Inventar-/Questjournal, hilfreiche **optionale** Action-Vorschläge/Quick-Action-Menüs.
- **102–117 LLM/Performance:** reine Ansichten ohne Planner/Narrator/Extractor, gezieltes Planner-/Extractor-Skip, Board-Generator nur bei Bedarf, redundante Promptregeln streichen, szenenabhängige Module, STATE NOW priorisieren, echtes Provider-Caching A/B, Retrieval-Caching, `foldChat` messen und ggf. lokale Memoisierung, error-specific Repair, Reasoning-Budget, Modellvergleich, Zwei- vs. Drei-Aufruf-Architektur **nur experimentell**, Token-/Latenzmetrik, NPC-Memory-Komprimierung.
- **118–130 unbequemere Alternativen:** stärkere Quest-/NPC-/Ortsgerüste teils empfohlen; Skill-Bausteine positiv; harte Traglast, Waffenhaltbarkeit, Hunger/Durst und komplett geskriptete Kampagne **nicht empfohlen**; Fast Travel optional; Narrator nur in harten Mechaniken beschränken.
- **131–141 QS:** Golden-Tests aus realen Logs, komplette Abenteuerläufe, getrennte Narrator-/Engine-/Extractor-Qualität, schwierige frühere Fehler als Regression, Release-Latenzprüfung, Promptwachstum, Tests für *kreative Freiheit*, lange Event-Chats, Analyse abgelehnter Deltas, echter GLM-Livetest als dritte Stufe, kontrollierte A/B-Vergleiche.

### 3a. Konkrete 20 Kandidaten – Priorisierungsarchiv, keine Freigabe

| ID | Kandidat und Nutzen | Planung |
|---|---|---|
| **K01** | **Engine-only-Gildenboard:** offizielle Quests nicht nochmals durch Narrator wiederholen; weniger LLM-Kosten/Fehler | Kleines eigenständiges QoL-Thema, sehr hoch |
| **K02** | **Veraltete Combat-Promptregel** nach Gruppencombat korrigieren | Kleine Code-Inkonsistenz, hoch |
| **K03** | **Dungeon-Cull-Ortsbezug `q.dungeon`** im Kill-Credit verwenden | Kleine Engine-Konsistenz, hoch |
| **K04** | Einfache Systemkarten: Quest angenommen/ready, Floor-Clear, Boss, Level-up, Tod | QoL, hoch |
| **K05** | Defense-/Utility-Skills im Combat-HUD statt nur Angriff | UI, hoch; evtl. Patch 10B |
| **K06** | Spielergewähltes aktuelles Quest-/Reiseziel als Fokuszeile | QoL, hoch |
| **K07** | Allgemeine Pflicht-/optionale/alternative Questmeilensteine für E-/D-Ränge | Mittel/groß, später |
| **K08** | Quest-Qualitätsfilter: Ziel/Ort/Monster/Schwierigkeit und Prüfbarkeit | Mittel, später |
| **K09** | Persistente wichtige Stadt-NPCs/Einrichtungsrollen | Mittel |
| **K10** | Bekannte Ortsreferenzen robust wiederverwenden | Mittel |
| **K11** | Besseres Journal, bekannte Orte, Quest-Historie ohne doppelte Statequelle | Mittel |
| **K12** | **ROAD AHEAD**: Engine-verankerte Reisebegegnungen | Eigenständiges größeres Feature |
| **K13** | Engine bestimmt konkrete Funde bei bereits bestehender Suche; keine zweite Suchengine | Mit ROAD AHEAD |
| **K14** | Allgemeiner Skill-Effect-Baukasten, keine starren Klassenbäume | Mit Patch 9 prüfen |
| **K15** | Bedeutsame Nutzungs-/Entwicklungsmomente statt bloßer Zähler | Mit Patch 9 |
| **K16** | Kreative Skill-Umweltwirkungen mit gültigen Engine-Effekten | Mit Patch 9 |
| **K17** | Bossphasen und telegraphierte Spezialangriffe | Später optional |
| **K18** | Combat-Extractor-lite als kontrolliertes A/B-Experiment | **Nicht** automatisch Teil Performance-Patch |
| **K19** | Abgeleitete `full/panel`-Ausführungsprofile | Erst bei tatsächlichem Fall |
| **K20** | Optionales SillyTavern-Quick-Action-Interface | QoL, nach sicherem Fast-Path |

**Review-Querverweis:** Ältere Antworten zum Videospielisierungskatalog enthielten #71 als Vorschlag zur Änderung der Startklassen. Nutzer hat diese Idee ausdrücklich ausgeschlossen. Nicht als Beschluss behandeln.

## 4. Konkrete Claude-Gegenreviews – was entschieden, was verworfen wurde

In mehreren unabhängigen Claude-Reviewrunden wurden der 141-Punkte-Katalog und ChatGPTs Antworten wechselseitig kritisch geprüft. Ergebnis:

### 4.1 Zuspruch und bekräftigte Erkenntnisse

- **System/Resolved/Open** ist ein gutes *Prinzip*, kein persistentes neues `turn.mode`; aus autorisierter Aktion abgeleitet.
- **Questgenerator:** separates LLM erzeugt offizielle Listings (`boardRequest/parseBoard/bookBoard`); JS-Engine prüft, begrenzt und persistiert; Narrator ist dafür **nicht** die Quelle. E-/D-Quests sollen auch ohne dauernd neue JavaScript-Sonderfälle möglich bleiben.
- **ROAD AHEAD:** Engine muss gewöhnliche mechanische Reiseunterbrechungen (Monsteridentitäten, Loot-Funde, Hindernisse) **vor** Erzählung verankern; Narrator gestaltet Atmosphäre, Personen, Gespräche. Ungewöhnliche neue Bedrohungen bleiben über vorhandene Hostile/Envelope/Commitment-Pfade möglich.
- **Caching:** wechselnde World-Info-Einträge können einen statischen Prompt-Prefix aufbrechen; Lorebook-Position bzw. `loreSource: engine` getrennt vergleichen. Nicht während derselben fortlaufenden Livetestkampagne.
- **Performance:** bei konkreten Vorgängen unnötige LLM-Schichten vermeiden; reale Latenz, Cache-Tokens, Time-to-first-token und Korrektheit vergleichen.
- **NPCs:** persistente wichtige Rollen ja; keine autonome Vollsimulation.
- **UI:** vorhandene `#status`, `#map`, `#quests`, `#skills` und System-Panel nutzen statt neu implementieren.

### 4.2 Abgewogene Einschränkungen

- **Starrer Narrator-Längen-Cap (150 Wörter):** abgelehnt. Kürzere Standardkampfrunden als Richtwert, epischer Bosskampf darf länger sein.
- **Gegner-Intent bei jedem Zug anzeigen:** nicht als Großumbau. Zunächst nur besonders starke vorbereitete Angriffe telegraphieren.
- **PC-Tod:** keine kostenlose Rettung; kleine Systemkarte `CHARACTER DEAD` sinnvoll, ggf. Text zum Zurückswipen, **kein UI-Knopf ohne echte Funktion**.
- **Organic Growth:** Nutzungszähler **plus mechanisch bestätigte besondere Momente** und validierte kreative Ergebnisse, kein rein quantitatives Powerleveling.
- **Feste Questketten:** stabile lokale Konflikte möglich, aber keine Pflicht-Hauptquest-Skripte.
- **Questfamilien:** ggf. primärer Typ und `MIXED`/mehrere Teilziele; mechanische Erfüllung enger, Story frei.
- **Fold-Memo:** vorab die lokale Kostenzeit messen. Höchstens kurzlebiger Cache in einer unveränderten Verarbeitungsphase; **kein persistenter Replay-riskanter Cache**.
- **Combat-Extractor-lite:** nicht per Dialog-/Großbuchstabenheuristik aus Narrator-Text entscheiden. Geeignetheit aus autorisierten Aktionen *vor* Narration ableiten, Deltas für neue Fakten/Objekte/Intent/Kreaturen trotzdem möglich. A/B, da Einsparung möglicherweise nur bei Promptanweisungen liegt.
- **Fast-Travel/ROAD-AHEAD-Determinismus:** stabile Hash-Entscheidung aus Seed + *konkreter Reiseinstanz* + Route + Etappe, als Event gespeichert; sonst würden identische Routen stets identische Begegnungen wiederholen. Nur nächste Etappe vorfestlegen. Fundentdeckung ≠ automatisch nehmen/einsammeln.
- **ROAD AHEAD vs. Patch 9:** nach .26-Reisen entscheiden: mehrere nutzlose Stopps, Phantomgegner, häufige Reise-/Such-Extractorprobleme → ROAD AHEAD zuerst; überwiegend gute Reisen und Bedarf bei Skills/Progression → Patch 9 gemäß ursprünglicher Roadmap. Bei gemischter Evidenz standardmäßig Patch 9.

### 4.3 Engine-only-Gildenboard – technische Lösung aus Review

Vorsicht: **Nicht** direkt die frühe `m.route === 'panel'`-Abzweigung in `runtime.js` für `board.read` benutzen: sie umgeht `boardFor`, `generateBoard` und `bookBoard`!  
**Konsens:** Vollständigen normalen V4-C-Pfad laufen lassen (bei Bedarf eigener Board-LLM-Aufruf, `playerTurnV4`, `quest.created`, `board.refreshed`, `board.shown`, Event-Record). Nur wenn **wirklich ausschließlich** Boardlesen aufgelöst wurde, `command: {panels:[boardCard(...)], llm:null}` zurückgeben – wie beim vorhandenen CLARIFY-Muster in `src/v4/turn.js`. Vorhandene Runtime liefert dann `action: panels`, ohne Narrator und Extractor. Gemischtes „Board lesen und Schreiber fragen“ bleibt voller Storyturn.  
**Test:** Die Panel-Route blendet den auslösenden Usertext aus künftiger Prompt-Historie; nächster Narrator muss trotzdem den kanonisch gespeicherten Kontext „Alaric las gerade das Board“ samt gesehenen Quests kennen. Replays, Swipe, Tagesboard und Quest-ID vollständig prüfen.

## 5. Besondere Frage: Quest-Erweiterbarkeit E-/D-Rang

**Aktueller Stand:** Questgenerator = separater LLM-Aufruf; Engine validiert und bucht offizielle Quests, nicht Narrator. Bereits vorhanden: `GO, FIND, TALK, GET, GATHER, GIVE, DELIVER, USE, REPAIR, DEFEND, ESCORT, ATTACK, DEFEAT`; Novice bekommt engere Generatorvorgaben. Laut `content/rules.json` ungefähr Novice F 1–14, Proven E 15–29, Veteran D 30–44, Elite C 45–59. Die eigentliche Korrektheit neuer Gilden-Ränge muss später real getestet werden.

**Entscheidungsrichtung:** Nicht jeden neuen Rang und jede Quest ins JS hardcoden. Stabile **mechanische Zielbausteine**, kreatives LLM-Problem und Auftraggeber; Engine kontrolliert Abschluss. Ein D-Rang-Auftrag kann ein starker Einzelgegner oder mehrere Meilensteine sein. Erforderliche, optionale und alternative Bedingungen bei echtem Bedarf ergänzen; keine starren drei Stufen, keine Pflicht-Trophäen. Mehrstufige Aufgaben und alternative Verhandlung/Vertreibung sind noch nicht automatisch für jede Generierung mechanisch abgesichert.

## 6. Engine-only-Aktionen, Rest, Wait und SillyTavern – neuere Überlegung

**NEUER KANDIDAT, NICHT IMPLEMENTIERT:** Engine-only-Routinen statt Füllnarration; parallel natürliche Sprache und optionale `#`-Kommandos oder SillyTavern **Quick Replies/STscript** als UI-Auslöser. ST ist lediglich Bedienoberfläche; **nur Avereth** bestimmt Events, Zeit, Kosten, Player Agency und Replay.

| Aktion | Stand im .26-Code | Vorschlag |
|---|---|---|
| `#status/#skills/#bag/#quests/#journal/#map/#assign` | Bereits Engine-only-Kommandos, `#assign` state-changing | Bestehende Mechanik weiter nutzen, Performance-Barriere beachten |
| Guild-Board `board.read` | Offizielles Engine-Panel existiert, aber Narrator wiederholt es | **Engine-only-Panel** bei reinem Lesen (K01) |
| **Rest/Sleep** | `src/v4/commands.js engineMinutes()`, `recoveryEvents()`, `time.advanced` und `resource.changed` deterministisch; Narrator wird noch gefragt | Sicherer Ort: direkte Karte (Dauer, Regeneration, Uhrzeit), ohne leere Prosa. Wildnis/Dungeon: erst Gefahren-/Unterbrechungsprüfung, nicht blind volle Erholung |
| **Wait / Zeit vorspulen** | Zeitlogik vorhanden, aber nicht allgemeiner `#wait`-Fastpath | Bei sicherem Zeitabschnitt Engine-only, sonst Fristen/ereignisrelevante Unterbrechung berücksichtigen |
| **Fast Travel** | `go`, Journey-Pacing und sichere bekannte Dungeonrückwege teilweise vorhanden, aber kein genereller Fast-Travel-Befehl | Bekannte sichere Verbindungen direkt mit korrekter Weltzeit; gefährliches Überland erst nach ROAD-AHEAD/Encounter-Regel; **kein Teleportieren** |
| Standard-Guild-Quest annehmen/abgeben | Engine verwaltet Slip, READY, Payout | In wirklich mechanischen Standardfällen Panel-only prüfen; Gespräch über individuelle Bedingungen bleibt Narrator |
| Shop/Waren, Sammelverkauf, normale Potions, Gear | Teile bereits Engine-owned | Nur feste bekannte Angebote und einfache transaktionssichere Fälle Engine-only prüfen |
| ST Quick Replies | Plattformfunktion verfügbar, keine zugesagte Integration im Branch | Optionales Button-/Slashkommando-Frontend; freie Sprache bleibt vollwertig |

**Wichtig:** Die „Quick Replies“ erhöhen alleine keine Geschwindigkeit, solange die vorherige Extraktion mittels `pendingWorld.job` den neuen Command blockiert. Zuerst den Performance-Review bzw. sicheren Fast-Path klären.

### 6a. Zufallsereignis beim Rasten – ausdrückliches aktuelles Nutzerfeedback

Nutzer berichtet: **im .26-Livetest wiederholt stundenlang im Dungeon gerastet, immer ohne Vorkommnis**. Das fühlte sich mechanisch zu folgenlos an, weil der Narrator das Rasten einfach abwickelt.

- **Reisen haben bereits** in `commands.js roadLine()` einen deterministischen Hashwurf pro Etappe mit `rules.travel.leg_event_pct`, jedoch nur als **Erlaubnis einer erzählten Unterbrechung**; die Engine bestimmt noch nicht verbindlich welche Gegner/Hindernisse auftreten.
- **Rest/Sleep hat aktuell KEINEN entsprechenden orts-/risikoabhängigen Unterbrechungswurf.** Zeit und volle Regeneration werden bei angegebener Dauer gebucht.
- **Noch nicht eingebaut:** Gefahr nach Zone/Sicherheit, Dauer, Zeit seit letzter relevanter Begegnung/Pacing-Tendenz, geeignete konkrete Erlebnisse (Kampf, Entdeckung, andere Abenteurer, ggf. nichts).
- Der Nutzer erinnert sich an unsere frühere Diskussion: **zufällige Ereigniswahrscheinlichkeit kann bei langer ereignisloser Zeit steigen**; keine Garantie, dass immer nach X Nachrichten ein Event entsteht.
- **Noch keine freigegebene neue Mechanik.** Beim Engine-only-Rest oder ROAD AHEAD als wichtigen Design-Testfall berücksichtigen. Nicht stundenlange Ruhe im gefährlichen Dungeon ohne überprüfte Gefahrenlage automatisch als sicher behandeln; keine PC-Folgehandlung erfinden.

## 7. Performance – realer .26-Test und Patch-8.2-Reviewentwurf

**Messungen aus ChatGPT-Auswertung der am 21.10. besprochenen Live-Exporte**; kleine nicht kontrollierte Stichprobe, Versionseffekt nicht allein belegt:

| Kennzahl | Vorher .25 | Neuer .26 |
|---|---:|---:|
| Extractor-Median | ca. **4,0 Sekunden**, 9 Aufrufe | ca. **22,8 Sekunden**, 18 Aufrufe |
| Planner-Median | ca. 2,05 s | ca. 2,21 s |
| .26 Extractor über 20s | – | 9/18 |
| .26 auffällige Extractor-Aufrufe | – | 48,1s, 44,3s, 37,6s und weitere |
| .26 Completion-Logs | – | 6 Extractor-Requests `finish_reason:length` bei 2.500 Tokens; fünf abgeschlossene Extraktionen mit Repair; ein leerer Narrator-Reply bei 4.096-Tokens-Cap |

**`#assign int 5`-Vorfall:** vorheriger Kampf-Narrator ca. 12:31:52, Extractor 34,27 s; Nutzer `#assign int 5` ca. 12:32:19, Systempanel erst ca. 12:32:27, also ~7,5s Wartezeit. **Konkreter Codegrund:** `avereth-engine/index.js` wartet vor normalem neuem Turn mit `await pendingWorld.job` auf vorherigen Extractor, **auch bei `#assign`**. Barriere existierte bereits in .25. Nicht als Beweis eines .26-eigenen Defekts formulieren.

**Performance-Review-Prompt wurde bereits vollständig formuliert (Arbeitstitel „Patch 8.2 – Runtime Performance, Extractor Latency & Fast System Actions“).** Zweite Claude-Sitzung soll **nur unabhängig reviewen**, nicht committen. Sein Leistungsumfang:

- **P1 Messung:** pendingWorld-Barriere, Planner/Narrator/Extractor, Repair, Fold, Provider-Tokens/Cache, Event-/UI-/Savezeit.
- **P2 Extractor:** Reasoning-/Length-Abbrüche, doppelte Kataloge/Statusdaten, sinnvolles Repair, keine pauschale Tokenlimit-Erhöhung, keine Delta-Verluste.
- **P3 Fast-Systembefehle:** `#assign` soll zügig sein, aber **NICHT** einfach `await pendingWorld.job` entfernen; sonst kann `laterTurns()` den alten Extraktorcommit verweigern. Sequenz/Event-Persistenz korrekt halten.
- **P4 Sichere LLM-Abkürzungen:** reine Engine-Befehle ohne Planner/Narrator/Extractor; Board nicht vorschnell dazu mischen, sofern Generator gebraucht.
- **P5 Cache-A/B:** aktuelle Lore/World Info vs. nach Char Defs vs. `loreSource: engine`; gleiche Testsequenzen, `cached_tokens`, Antwortbeginn, Qualität. **Separater Test, nicht mitten im aktuellen Run.**
- **P6 `foldChat` messen**, nur bei echtem Bottleneck sehr kurzfristige, korrekt invalidierte Memoisierung.
- **Nicht im Umfang:** ROAD AHEAD, Patch 9, große UI-Neufassung, komplettes `combat_lite`, Modellwechsel, große 3→2-Aufruf-Neuarchitektur.
- **Abnahme:** kontrollierter langsamer vorangehender Extractor + `#assign`, kein verlorener World-Commit, keine doppelten Events, Swipe/Regenerate/Edit/Chatwechsel, echte End-to-End-Latenz.

Nach Review **Befunde/Alternative kritisch abgleichen**, erst dann Implementierungsauftrag erstellen. Kein bestätigter Fix zum Stand 21.10.

## 8. Offene Reihenfolge und konkrete Tests

**Aktuell dringlich:** .26-Livetest und Performance. Mechanisch im berichteten .26-Run bereits positiv: **drei Glas-Käfer in einem Encounter**, später **zwei Mineral Slimes in einem Encounter**, passender Guild-Dungeonauftrag ohne zweite Gatezahlung, Loot/XP und Level 2. Noch nicht gesamter Floor/Boss/Reset vollständig geprüft.

**Wichtig für den nächsten Chat:**
1. Aktuellen Git-HEAD prüfen, Dateien 01–04 lesen, .26-Originalexporte ansehen.
2. Performance-Review von zweiter Claude-Sitzung entgegennehmen und unabhängig beurteilen. **8.2 ist bis dahin nicht freigegeben.**
3. Den 20-Punkte-Katalog **nicht** automatisch implementieren; nächster Entscheid voraussichtlich über kleines Engine Actions & QoL-Paket.
4. ROAD AHEAD vor Patch 9 **nur** bei echten Wiederholungsproblemen außerhalb von Dungeons (unbegründete Reise-Stopps, Phantomgegner, Reise-/Such-Extractor-Längenabbrüche); bei guter Reisemechanik Patch 9 priorisieren.
5. Engine-only-Rest darf nicht ohne Gefahren-/Eventregel in unsicheren Orten durchgebucht werden.
6. Größere Features in zweiter Claude-Sitzung reviewen; kleine eindeutige Fixes nicht endlos gegenprüfen; laufende Tests nicht durch Settingswechsel verfälschen.
7. Keine Git-Veränderung im Entwicklungsbranch oder neue Patchimplementierung nur aufgrund dieser Dokumentation.

**Quellenhinweis:** Der vollständige historische 141er-Katalog und die Reviewdialoge befinden sich in den früheren ChatGPT-Projektchats; diese MD ist die konsolidierte Wiederaufnahme, keine wortgetreue Abschrift. Die konkrete 20-Kandidaten-Auswahl, Designentscheidungen, Gegenargumente und der Performance-Patchreview sind hier möglichst vollständig zusammengefasst.


## 9. Neues unabhängiges Claude-Review des Performance-Patches 8.2 – 21.10.2026

**Quelle:** zweite Claude-Architektursitzung, vom Nutzer als Textdatei `Eingefügter Text(20261021-131712).txt` im anschließenden Projektchat übergeben. **Nur Review/Lesen – keine Codeänderung.** Aktueller Code-HEAD bei Review `c6baa06`. Der Performance-Patch ist **noch nicht freigegeben oder implementiert**.

### 9.1 Neue wesentliche Messbefunde aus Claudes Vergleich .25 vs. .26

| Messung | Ergebnis / Einordnung |
|---|---|
| Extractor-Systemprompt | Laut Claude in .25/.26 exakt gleich: 30.089 Zeichen |
| Extractor-Promptgröße insgesamt | durchschnittlich 8.376 → 8.509 Tokens (**+1,6 %**) |
| GLM-Durchsatz | etwa 72–78 generierte Tokens/s in beiden Builds |
| Board-Extractor vergleichbare Anfrage | .25: **297 Tokens, 3,8 s**; .26: **2.271 Tokens, 31,5 s**, Prompt ~9.077 vs. ~9.071 Tokens |
| .26 Extractor | 18 Aufrufe, Median **22,8 s**, p90 laut Claude **37,6 s**, 5 Reparaturen, 6 Length-Abbrüche am 2.500-Tokenlimit |
| .26 Narrator | Einzelne ausufernde Reasoning-Spuren, ein leerer Reply am 4.096-Tokenlimit |
| Planner | Weiterhin ~2,2 s Median, wenig betroffen |
| Repair nach leerem Extraktor | Laut Claude kurz und effektiv; aufwendiges Reasoning geschah vor allem im ersten Request |
| Im ST-Preset | `reasoning_effort: low`, `clear_thinking: true` für alle Rollen; `v4Llm` berücksichtigt gegenwärtig den `purpose` nicht für separate Requestparameter |
| Narrator-Cache | Laut Claude im neuen .26-Lauf im Mittel ~48 % statt ~6 % bei .25; Änderungen an World-Info-Settings vor Interpretation klären |

**Kausale Bewertung:** Längere Reasoning-Ausgaben bei praktisch gleich großem Prompt sind belegt; reine Katalog-Aufblähung als Hauptursache **unwahrscheinlich**. Provider-/Modellschwankung **plausibel, nicht bewiesen**. Kleine neue Kataloginhalte könnten das Entscheidungsverhalten trotzdem beeinflussen; keine voreilige vollständige Entwarnung für alle Promptänderungen.

### 9.2 Claudes Empfehlungen für einen kleineren 8.2a-Patch

- **S1 Messung:** optionale Provider-`usage`/`finish_reason`, Latenzen und Zeit an `pendingWorld.job`, `foldChat`-Messung; kein Mitschreiben kompletter Prompts.
- **S2 rollenspezifische Request-Extras:** `plan`, `extract`, `board` getrennt steuerbar, ohne bestehendes globales ST-Preset oder den Narrator umzuschalten; bei leeren Zusatzfeldern aktuelle Requests unverändert.
- **S3 Benchmark:** originale bzw. aus echten .25/.26-Fixtures exakt reproduzierte Extractor-Anfragen A/B/C mehrfach ausführen; Token, Zeit, Length-Fehler und **inhaltliche Korrektheit** der Delta-Ergebnisse vergleichen; kein normaler npm-Unit-Test.
- **S4 leerer Narrator-Reply:** keine Extractor-Verarbeitung für leere Erzählung; sichtbarer Fehler-/Regenerate-Hinweis.
- **Auslagern:** `#assign`-Fast-Path wegen komplizierter Eventreihenfolge; Engine-only-Board in separaten QoL-Patch; Lore-Caching-Konfiguration separat vergleichen; `foldChat` nur optimieren, wenn messbar relevant.

**Warum `#assign` nicht blind beschleunigen:** `closeLatePending()` und `laterTurns()` schützen den vorherigen Extractor-Commit. Ein Systembefehl mit Stats-Events vor diesem Commit könnte dessen Weltänderungen entwerten. Schutzbarriere nicht einfach überspringen; kurzere Extractor-Laufzeit soll Wartezeit bereits reduzieren.

### 9.3 ChatGPTs kritische Rückprüfung des neuen Reviews

Am unveränderten Code `index.js` und `src/v4/runtime.js` überprüft:

1. **Provider-Steuerung nicht überschätzen.** Offizielle Modelldokumentation `https://huggingface.co/zai-org/GLM-5.3-Flash` nennt für GLM-5.3-Flash lediglich `reasoning_effort: low|high|max`, und `max` ist Standard, wenn Parameter fehlt oder falsch ist. Das aktuell verwendete `low` ist bereits die kleinste dokumentierte Stufe. Der Benchmark darf **„Reasoning disabled“ nicht als garantiert verfügbare Variante B voraussetzen**; zunächst realen Provider-Request und seine tatsächliche Wirkung prüfen. Variant C (kürzere gezielte Promptanweisung, etwa unsichere optionale Deltas nicht lange abzuwägen) erscheint interessant, aber **kein impliziter neuer Default**.
2. **Telemetrie an technischen Records:** Statt Provider-Daten ohne Not in kanonische `extract.failed`/`cmd.interpreted`/Gameplay-Events zu mischen, vorzugsweise optionale Felder in `plan`, `interp`, `board` und `extraction`-Records. Event-Fold, Swipe und bestehende Fixtures unverändert absichern.
3. **Kompatible `v4Llm/ask`-Rückgabe:** Derzeit erwartet `ask()` einen String. Bei Metadatenobjekten vorhandene String-Mocks, Reparaturpfade und `generateRaw`-Fallback weiter unterstützen. Bei ST-Custom-Endpoint `custom_include_body` strukturiert und ohne mögliche unbeabsichtigte Überschreibung von `messages`, `model`, `max_tokens`, `stream` etc. mischen; ein leeres Extra bleibt exakt neutral.
4. **Leere Narration:** Guard für sichtbar leere `MESSAGE_RECEIVED`-Antwort **und** prüfen, was ST tut, wenn gar keine Assistant-Nachricht erzeugt wird. Keine Behauptung `finish_reason:length`, wenn diese Information im Narrator-Hook nicht vorliegt.
5. **Benchmarkqualität:** Nicht nur Delta-Mengen vergleichen; Validität, Vollständigkeit, falsche/fehlende Fakten, vom World-Applier angenommene/abgelehnte Deltas und End-State vergleichen. Wiederholungen und A/B/C-Varianten zeitlich ausbalancieren, Providerrauschen beachten; möglichst **exakte Originalrequests** statt unbemerkt anders aufgebauter Fixture-Prompts.

**Vorläufige Bewertung:** 8.2a als **Mess-/Konfigurationsbasis** sinnvoll; die standardmäßig verhaltensneutrale Version ist **noch kein belegter Performance-Fix**. Welche Prompt- oder Provider-Einstellung tatsächlich beschleunigt, erst **nach** Benchmark entscheiden. `#assign`, ROAD AHEAD, Patch 9 und QoL-Katalog bleiben getrennt und unverändert.

## 10. Zweite Claude-Rückmeldung zum Performance-Review – abschließender Entwurfsstand (21.10.2026)

**Noch keine Codeimplementierung und keine ausdrückliche Nutzerfreigabe.** Claude hat die vorherigen ChatGPT-Präzisierungen akzeptiert und den Performance-Patch weiter verkleinert. Ihr Review wurde nur lesend gegen `c6baa06` sowie den .26-Chat geprüft.

### 10.1 Benchmark-Hypothese: Wirkt das vermeintliche `low` überhaupt?

Die offizielle GLM-5.3-Flash-Modellkarte (`https://huggingface.co/zai-org/GLM-5.3-Flash`) und das vLLM-Rezept (`https://recipes.vllm.ai/zai-org/GLM-5.3-Flash`) nennen `reasoning_effort = low|high|max`; fehlende/ungültige Werte fallen auf `max` zurück, **Thinking kann laut Modellvorlage nicht ausgeschaltet werden**. Im ST-Completion-Log steht `low`, aber das ist **kein Beleg**, dass der finale Provider/Serving-Endpoint es tatsächlich verwendet.

**Benchmarkvarianten, bei ansonsten identischen Parametern einschließlich `clear_thinking`:**
- **A0:** kein `reasoning_effort` gesendet (voraussichtlich Modell-Default `max`, wenn Serving es so umsetzt);
- **A:** `reasoning_effort: low`;
- **C:** identisch zu A, plus kurze konkrete Promptanweisung, unsichere optionale Deltas nicht unnötig auszudiskutieren.
- **Wiederholungen in gemischten Runden** `A0/A/C/A0/A/C`, nicht drei zeitliche Blöcke. Exakte bzw. gegen Logs verglichene `extractionRequest()`-Requests aus .25/.26-Fixtures; Zeit, Reasoning-/Completion-Tokens, Abbrüche, Delta-Korrektheit und **angewendeten Engine-Endzustand** vergleichen.

**Wichtige Interpretationsgrenze:** Gleiche Werte für A0 und A **beweisen nicht**, dass `low` ignoriert wird (Stochastik, Endpoint-Defaults, Proxy-Übertragung, verborgenes Serving-Verhalten). Ein starker wiederholter Unterschied stützt die Wirksamkeit von `low`; idealerweise die Provider-/Serving-Request-Weitergabe selbst prüfen. Nicht ohne Nachweis Engine-Prompt oder Provider voreilig als Ursache festlegen.

### 10.2 Gemeinsamer kleiner 8.2a-Zuschnitt

1. **Metadaten und Profiling, verhaltensneutral:** `v4Llm()` gibt auf Custom-Endpoint bei Verfügbarkeit `finish_reason` und `usage` mit; `ask()` akzeptiert **String oder Objekt**, `generateRaw` und bestehende Test-Mocks bleiben funktionsfähig. Technische Daten als **optionale Felder vorhandener Chat-Records** (`plan`, `interp`, `board`, `extraction`), nicht als neue Kanon-Gameplay-Events. Bereits vorhandene Event-`ms` belassen. Keine Tokenwerte schätzen, wenn Provider sie nicht liefert.
2. **Warte-/Laufzeiten:** `pendingWorld.job`-Wartezeit, `foldChat()` und soweit im Host realistisch Narrator-Gesamtzeit erfassen. Keine kompletten Prompts in Debuglogs, keine unnötigen zusätzlichen LLM-Aufrufe.
3. **Leere Narrator-Antwort:** `MESSAGE_RECEIVED` mit vorhandener leerer Assistant-`mes` **startet keinen Extractor**; neutraler Systemhinweis. Nachricht 36 des .26-Runs war `mes:''`, danach trotzdem 17,6 Sekunden nutzlose Extraktion mit 0 Deltas – konkreter Regressionstest. Auch Host-Fall „gar keine Assistant-Nachricht“ prüfen, keine erfundene `finish_reason`-Angabe. Bereits auf User-Record gebuchte Kampfergebnisse erhalten, kein doppeltes Replay.
4. **Keine rollenspezifischen Request-Extra-Einstellungen** in 8.2a; `low` ist bereits die kleinste dokumentierte Stufe, weshalb eine weitere UI vor Messung keinen nachgewiesenen Nutzen bringt. **Kein `#assign`-Fast-Path**, kein Engine-only-Board, kein Fold-Cache, kein `combat_lite`, kein ROAD AHEAD/Organic Growth.

**8.2a alleine ist ein Diagnose-/Fehlerschutz-Patch, noch kein nachgewiesener Performancegewinn.** A0/A/C-Benchmark anschließend als eigenständiges Werkzeug ohne Eingriff in das laufende .26-Spiel, `8.2b` nur auf Basis wirklich belegter Verbesserungen und ohne Verlust gültiger Engine-Weltänderungen.

### 10.3 Nächster Schritt

Wenn Nutzer 8.2a freigibt: kleinen Implementierungsauftrag mit obigen Grenzen an Claude Code; automatisierte Regressionen, `npm test`, relevanter SillyTavern-C-Smoke, aktueller Git-HEAD, event-/record-kompatible Implementierung. Danach A0/A/C-Benchmark prüfen, **erst dann** Prompt-/Provider-Defaults in 8.2b ändern. Kein weiteres endloses Design-Pingpong ohne neue Messung.


## 11. Patch 8.2 wirklich implementiert – unabhängiger Git-Code-Review (21.10.2026)

**Branch:** `claude/c-planner-prototype-2026-10-02-gpt-c666`, HEAD `ef4a819d5b1be76b4229745268172d0da5ce5dd5`, Build `4.3.0-c.6.6.27`. Ein neuer Commit direkt nach .26 (`c6baa06`). **Frühere Abschnitte 7/9/10 sind historische Review-/Planungsstände; sie bedeuten nicht mehr „8.2 nicht implementiert“.**

**Laut Git implementiert:** Rollenneutrale LLM-Telemetrie in bestehenden Records (keine neuen Spiel-Events), String-/Objektkompatibilität in `ask()`, LLM-/Fold-/Barrier-/Narrator-Zeiten, übersichtliche Statuszeile. Leere Narrator-Nachrichten erhalten `extraction.status='skipped'`, `NO STORY TEXT` und keinen Extractor; vorher auf User-Record verbuchter Kampf bleibt erhalten; Replay und Swipe im Test. Der 8.2-Custom-Endpoint trägt `usage` und `finish_reason` mit, `generateRaw` nicht. Anfragen/Modelldefaults unverändert, **keine rollenabhängige Reasoning-Setting-UI**.

**Claude-Bericht:** `npm test` 975/975 (15 neue Tests) und SillyTavern-1.19-C-Smoke grün, erneut auf finalem Stand; ein einmaliger ST-interner Statuscheck-Ausreißer verschwand beim Wiederholen. Diese Läufe wurden **von Claude ausgeführt und gemeldet**, nicht von ChatGPT unabhängig ausgeführt. Code und Versionswerte in Git unabhängig geprüft. Erster kurzer `.27`-GLM-Livetest **am 22.10. durchgeführt und in Datei 03 §5g ausgewertet**; echter A0/A/C-Providerbenchmark weiterhin **ausstehend**.

**Benchmark `tools/bench_extract.mjs`:** Laut Claude 17/18 .26-Extractor-Erstaufrufe mappbar, für 17 derselbe angeforderte Prompttext wie im alten Log; die 18. ist die künftig ausgelassene Extraktion einer leeren Narrator-Antwort. A0 (ohne `reasoning_effort`), A (`low`), C (`low` plus kurze Schlussanweisung); kein API-Key in Implementierungsumgebung, daher noch **keine** echten Zeit-/Qualitätsresultate. Voller Lauf würde bei 3 Runden ungefähr 153 Requests auslösen (~1,3 Millionen Prompttokens); `--only`-Subset zur ersten Prüfung.

**Unabhängiger Review-Hinweis vor dem teuren Benchmark:** Die Funktion `worldSummary()` vergleicht **nur eine gekürzte Projektion des Zustands**. Sie betrachtet z. B. Entitäten nur nach Kind/Status/Ort/Gruppe, Orte nur per ID, Wege nur nach Anzahl, Erinnerungen nur nach Anzahl, Fakten ohne alle Felder und Gegenstände ohne Mengen/Attribute. PC-Inventory/Stats, Relation-/Knowledge-Inhalt, Questdetails und weitere legitime Extractor-Weltänderungen werden nicht vollständig berücksichtigt. `identical_world` kann darum eine **falsch-positive Übereinstimmung** anzeigen. *Kein Gameplayblocker für Build .27,* aber die Bewertung muss vor einer 8.2b-Entscheidung fachlich aussagekräftiger gemacht oder mit manuellen Referenzurteilen ergänzt werden. Kein Komplettvergleich temporärer State-/RNG-Metadaten auf Verdacht.

**Nachtrag zur Reihenfolge (22.10.):** `.27` wurde mit echtem Provider kurz live erprobt; bestätigte Old-Crown-Floor-Zuordnung `name level 1` / `level:2` und unerreichbarer numerischer Cull (03 §5g–5h). Der daraus entstandene **Patch 8.3 (.28)** ist inzwischen unter `70cbb5e` implementiert und von ChatGPT im Git-Code nachvollzogen (§5i). Vor dem nächsten großen Designpatch jetzt den **frischen .28-Gesamtlivetest** vom Gate bis Floor-Clear durchführen. Der neu erkannte gemischte Dungeon-Cull-Randfall in `cullEndState()` verdient einen separaten engen Regressionstest; nicht still in den eigentlichen Skelett-Cull integrieren. Parallel später Bench-Judge härten, Narrator-Lorebook-Cache kontrolliert A/B testen und A0/A/C kontrolliert ausführen; **erst daraus** sinnvollen 8.2b-Provider-Default ableiten. `#assign`-Fastpath, Engine-only-Board, Rest/Wait/Fast-Travel, ROAD AHEAD, Patch 9 und Organic Growth bleiben eigenständige Kandidaten. Kein Force-Push für kosmetische Commitnachricht.


## 12. Patch 8.3 (.28) – unabhängiger Source-Review und offener Randfall (22.10.2026)

**Bestätigt aus GitHub:** Commit `70cbb5e4ec77ea1ad9fe24fc46b86c2c42cb12ed`, Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Version in `package.json` und `manifest.json`: `4.3.0-c.6.6.28`. `src/v4/dungeon.js levelVia()` trennt echtes Gate/Level 0 von Ebene 1; `living.js runNow()` und `cullPopulation()` nutzen eine deterministisch gezogene Population, `guild.js cullKind()` gleiche Artregel für das Board und `defeatTally()`; `areaOf()` begrenzt Dungeon-Culls auf deren Dungeon/Etage. Numerische Culls erhalten einen gezählten statt eines pauschalen Floor-Clear-Endzustands. Gilden- und Quest-Kontext wurden minimal berichtigt. Elf neue Tests in `tests/v4/patch83.test.js`; 986/986 und ST-Smoke 21/21 sind **Claudes gemeldete Läufe**, von ChatGPT nicht unabhängig ausgeführt. Dokumentations- und Nachweisdaten siehe Datei 03 §5i und `avereth-engine/docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md`.

**Technisches Review-Risiko für gemischte Dungeon-Verträge:** `cullEndState()` greift bei **jeder** numerischen `DEFEAT`-Aufgabe mit `q.dungeon` und ohne `q.clear`, auch wenn sie neben einem Kampf weitere substanzielle Arbeiten (z. B. Reparatur, Rettung, Lieferung) enthält. Es kann deshalb andere verpflichtende Ziele aus `desired_end_state` entfernen. Der reine Old-Crown-Cull ist nicht betroffen. Dies ist **kein nachgewiesener Live-Fehler**, sondern ein direkt aus dem Code ableitbarer Randfall: Einen gemischten Auftrag als Fixture ergänzen und nur echte reine Culls umformulieren; andere Zielzustände nicht überschreiben. `areaOf()` akzeptiert weiter fehlende/unbekannte Gegnerorte (Legacy-Fallback); nur gezielt untersuchen, wenn solche Entity-Daten im Livetest auftreten.

**Test- und Planentscheidung:** Patch 8.3 ist **technisch bereit für einen neuen GLM-Livetest**, nicht bereits spielerisch als vollständig bewiesen zu bezeichnen. Alte .27-Events werden nicht rückwirkend korrigiert; eine neue Kampagne vermeidet das persistierte Etagen- und 3er-Cull-Problem. Keine globalen XP-/Balance-/Scaling-Änderungen, keine unverifizierte Cache-Optimierung und kein früher Übergang zu Patch 9/ROAD AHEAD.


## 13. Erster echter .28-GLM-Livetest – Bewertung und Prioritäten (22.10.2026)

**Quellen und Details:** siehe Projektstand `03_AKTUELLER_PROJEKTSTAND.md` §5j; drei Nutzerdatenexporte des Glimmerdeep-Runs. **.28 bestätigt** den seitlichen Gate-Zugang zur ersten F-Rank-Ebene, deterministische vier Gegner, korrekte Loot-/XP-/Level-up- und Questturn-in-Buchungen (60 cp und 23 Quest-XP), Rückweg, Rast und Offscreen-Party-Fortschritt. **Nicht erprobt:** Old-Crown-Treppe, Siegel, zweiter Dungeonlevel, Glimmer-Queen/Guardian, kompletter Floor-Clear.

**Priorität hoch: Ambush-Loop trotz einer Gegnergruppe.** Vier `glass beetle` stehen als **eine** `entity.group` und ein Slot am gleichen Ort, `scene.awareness=unaware`. Jeder der vier offensichtlichen Flame-Lance-Angriffe startet eine separate `COMBAT START — AMBUSH`-Eröffnung mit sofortigem Krit-Kill. Die restlichen Gegner handeln überhaupt nicht und bleiben mehrfach `unaware`, auch nachdem Schüsse und laute zerstörte Panzer beschrieben werden. **Aus Code begründbare Wechselwirkung:** `src/v4/group_combat.js groupJoiners()` hält noch `unaware`-Gruppenmitglieder bis nach dem Opening zurück; bei einem One-Shot endet der Kampf sofort und der Aufmerksamkeitswechsel/Beitritt bleibt aus. Dies ist nicht der Beweis einer neuen falschen HP-Formel, aber ein offensichtlicher **Challenge-, Gruppenreaktions- und Kausalitätsmangel** (bemerkenswert: Patch 8.1 sollte bereits gemeinsame Beetle-Combat-Encounters ermöglichen). Vor einem mechanischen Fix sauber die Voraussetzungen für Sehen/Hören, tatsächlich gewählte Stealth, Art/Hostility, Reaktionszeit und wahrgenommene Magie modellieren; **kein blanket group aggro**, keine Telepathie, keine XP-/Damage-Nerfs; Tests für beobachtbare laute One-Shot-Kills, bewusst unbemerkte stille Kills und überlebenden Erstgegner.

**Priorität mittel bis hoch: Offizieller Dungeon-Cull trägt widersprüchliche Zahlen.** Die Engine speicherte `DEFEAT qty:4` und `desired_end_state:4 crystal beetles`, das Board zeigt „(4)“ und gleichzeitig im nicht überarbeiteten `task` **„Cull at least six crystal beetles“**. Zieltyp/Erfüllbarkeit ist jetzt in der Engine konsistent, **die öffentliche Ausschreibungsbeschreibung nicht**. Nicht nur `desired_end_state` korrigieren: Aufgabenbeschreibung, offiziellen Text und HUD auf denselben festen Contract-Snapshot synchronisieren. Nur reine Culls automatisch umschreiben; gemischte Dungeonarbeiten dürfen keine weiteren Ziele verlieren (`cullEndState()`-Risiko aus §12). Die tatsächlichen Gegner waren `glass beetle`, technisch als allgemeine Beetle-Art für das Ziel erfasst; semantische Art-/Namensanzeige prüfen, ohne unnötige Einschränkung von allgemeinen Hunts.

**Separate Performancearbeit:** 16 Planner-Aufrufe Median 2,44 s; Board-Erzeugung 31,33 s; 15 Narrator-Antworten Median 11,55 s, max 41,42 s; 15 Extractor-Phasen Median 4,27 s, max **95,82 s** ohne Reparatur; weitere Reparatur bei 2.500 Completion-Tokens insgesamt 31,98 s. **8/15 Narrator-Provider-Responses ohne Cache**; Lorebook-Prefix A/B weiter sinnvoll. Durchschnitt/Median gegenüber .27 nicht als Kausalnachweis werten, kein blindes Reduzieren der Token-Limits und kein Mischen von Narrator-Cache-Optimierung in Combat-Fix.

**Entscheidung offen:** Statt großflächigem Patch sofort **gezieltes unabhängiges Claude-Gegenreview** zu Combat-Awareness (reproduzierbare vier Solo-Ambushes trotz Gruppe) und der Cull-Task-Zahl. Bei bestätigtem Mechanikloch kleiner abgrenzbarer Folgeschritt mit Regressionen; danach echter mehrteiliger Dungeonlauf bis Guardian/Boss. ROAD AHEAD/Organic Growth/Scaling bleiben unverändert eigenständige Vorhaben.

## 14. .28-Gegenreview – Combat-Alarmierung statt falscher Stealth-Sonderfall (22.10.2026)

**Quelle:** Unabhängiger Claude-Review des echten .28-GLM-Exports mit eigener Durchsicht von `engine.js`, `combat.js`, `group_combat.js`, `world.js` und anschließender Bestätigung anhand des Git-Codes durch ChatGPT (vgl. Datei 03 §5k). **Keine Implementierung** in diesem Review; letzter verifizierter Build bleibt .28/70cbb5e.

**Bestätigter dreigliedriger Fehler:** Gegnergruppe im selben Raum erhält `unaware`, aber PC hat **keine** echte Stealth-Deckung (`scene.concealed=[]`). `groupJoiners` schiebt trotzdem alle anderen nach `later`; bei tödlichem Opening werden sie nicht aufgenommen; `persistCombat` kennzeichnet die als `unaware` ausgelassenen Zeugen nicht `wary`. Narrator/Extractor setzen konsistent die fehlerhafte Engine-Annahme fort. 8.1-Test `group 5 (stealth)` setzt selbst `concealed=[]` und zeigt damit die Ursache der Designverwechslung. Änderung für **unverdeckten Spielerangriff**: Mitglieder der **bereits begründeten feindlichen Gruppe** vor der Opening Action beitreten lassen, auch wenn zuvor `unaware`; jeder nur eigene reguläre Aktion, lediglich überraschtes Ziel bekommt gegebenenfalls Ambush-Krit. Überlebende anschließend `aware/wary`, ohne dass der Narrator den alten ahnungslosen Zustand neu erzeugen darf. Sonderfälle `threat:false`, friedliche NPCs, Rückzug/Parley, echtes unbemerktes Stealth und Replay prüfen. Kein pauschales Gruppen-Aggro und keine Balanceänderung.

**Designentscheidung zu lauten Aktionen aus echter Deckung:** Solche Aktionen sollen grundsätzlich die Gruppe **alarmieren können**, aber Alarmierung ist **nicht** automatische Kenntnis von Alarics exakter Position. Diese Akustik-/Wahrnehmungsgrenze ist **nicht Teil des sofortigen engen Fixes**; kein ad-hoc-Lärmsystem. Bis zu einem entsprechenden Mechaniktest die Aussage „Versteckt = alle Angriffe bleiben lautlos“ ausdrücklich **nicht** als Kanon interpretieren.

**Quests:** `bookBoard` passt Zahl und Zielzustand, nicht den ursprünglichen `task`-Fließtext an; „(4)“ und „at least six“ erscheinen zusammen. Reine Dungeon-Culls deterministisch mit synchroner Anzeige aus endgültigen `objectives` berichtigen, ohne fremde Mengen/Etagen-Zahlen oder gemischte Aufgaben zu beschädigen. Bei unklarer Zuordnung statt willkürlicher Zahlwort-Ersetzung besser zuverlässigen kanonischen Text aus strukturierten Zielen rendern. `objectiveText`-Duplikat („DEFEAT 4 beetles crystal beetles“) behutsam bei echtem Doppel-Nomen entfernen.

**Performance-Kandidat separat:** Board-Retry brauchte 12,4 s; ein unzulässiger **zweiter** Glimmerdeep-Job löste Neu-Generierung aller fünf Vorschläge aus. Gezielt nur fehlende gültige Einträge nachfordern wäre sinnvoll, hat aber eigenen Validator-, Persistenz- und Latenztestumfang. Narrator-Cache und Extractor-Stalls eigenständig betrachten. Keine Parameteränderungen im Combat-Fix.

**Nächster Reihenfolgepunkt:** Enger Combat-/Questtext-Fix mit rotem .28-Live-Regressionstest, dann ausführlicher Glimmerdeep-/Old-Crown-Run bis Guardian, Siegel und vollständigem Clear; später separat Board-Retry und Cache. Keine Freigabe von Organic Growth/ROAD AHEAD aus diesem Review.

## 15. Patch 8.4 (.29) – Git-Review abgeschlossen; enger Schutz-Cull-Randfall (22.10.2026)

**Git-Verifikation:** Entwicklungsbranch HEAD `4d08d4f6c8eb7a96e0534066d4b38a1f18d74098`, Build `4.3.0-c.6.6.29` in drei Versionsquellen, genau ein Commit nach `.28`/`70cbb5e`. 12 Dateien geändert, darunter `src/v4/group_combat.js`, `src/v4/guild.js`, `src/v4/catalog.js`, neue `tests/v4/patch84.test.js` (9 Regressionen) und Fixture `live_1022b.json`. Claude berichtet 995/995 Node-Tests und einen 21/21 C-Smoke. Seltene negative `noPageErrors`-Runs hängen laut Claudes markiertem Gegenversuch mit SillyTavern-Preset-Status-Abbrüchen beim Setup zusammen; der eigene Git-Review **bestätigt diese Browserdiagnose nicht unabhängig**. Umfang und Details siehe `03_AKTUELLER_PROJEKTSTAND.md` §5l sowie `avereth-engine/docs/PATCH8_4_GROUP_AWARENESS_CULLS.md`.

**Mechanikbewertung:** Für einen unverdeckten Angriff des PC wird ein beitrittsberechtigtes `unaware`-Mitglied eines etablierten feindlichen Verbands in `groupJoiners` nun als `now` statt `later` geführt, sofern der PC nicht in `scene.concealed` steht. Der eine Ambush-Krit auf das konkret unaufmerksame Ziel bleibt; die anderen handeln nach Opening Action in eigener Initiative, und der Kampf endet nicht nach dem ersten Kill. Gegenüber `.28` zeigen Produktpfad-Regressionen eine echte Vier-Beetle-Begegnung, HP 80→53, kein zweiter Ambush gegen denselben Verband und erhaltene Replay-/Swipe-Stabilität. Echte Deckung, friedliche Gruppen und ausdrückliche `threat:false`-Ausnahmen erhalten ihre separate Bedeutung. Kein ungetesteter Schadensnerf. Lautes Zaubern aus tatsächlicher Deckung bleibt ein eigenständiges künftiges Wahrnehmungsthema.

**Reiner Cull-Text:** `cullTask` gleicht die eindeutig dem Monsterziel zugeordnete Anzahl nach `cullNumbers` auch im öffentlichen `task` an; `cullEndState` überformt nur `pureCull` vollständig. `amountText` wird von beiden `objectiveText`-Varianten genutzt. Der echte Beetle-Fall lautet damit konsistent 4 statt 6, ohne Etagenzahl oder Zweck zu löschen. Gemischte `REPAIR`-Quests behalten ihre anderen Aufgaben.

**Neu verifizierte Testlücke:** Der neue grüne Test `8.4 cull 2` erstellt ausdrücklich eine `DEFEAT + DEFEND`-Quest mit Task „Cull six crystal beetles ... and guard the apprentices“, `DEFEAT qty:4` und `desired_end_state` „Four crystal beetles ... and apprentices ... come to no harm“. `isHunt` bezieht `DEFEND` ein, wodurch `cullNumbers` die Zahl anpasst; `pureCull` schließt `DEFEND` aus, wodurch `cullTask` den ursprünglichen Task unverändert lässt. Der Test behauptet aktuell ausdrücklich, dieser alte Task sei korrekt. **Klarer verbliebener Anzeige-/Test-Erwartungsfehler, obwohl der reine Beetle-Cull behoben ist.** Nächster Kleinstfix: wenn `DEFEND` und die Killzahl tatsächlich gekürzt wurde, die **eindeutig zuordenbare** Killzahl im `task` angleichen, ohne Schutzpflicht, anderen Endzustand oder andere Mengen zu verlieren. Test auf einheitliche Task/Qty/EndState-Menge drehen; kein weiterer allgemeiner Quest-Refactor.

**Empfohlene Reihenfolge:** Falls alle offiziell angezeigten Dungeon-Aufträge bereits vor dem nächsten Test widerspruchsfrei sein sollen, zuerst diesen kleinen Task-Nachtrag. Der **Combat-Fix selbst ist bereit für den echten `.29`-GLM-Livetest** mit gegnerischen Turns, anschließend Glimmer Queen/Level-Clear sowie Old-Crown-Gate/Siegel. Board-Nachgenerierung, Narrator-Cache-A/B, Extractor-Spikes und ST-Status-Preset-Race sind separate Performance-/Testharness-Themen. Organic Growth und ROAD AHEAD sind nicht freigegeben.

## 16. Automatisierter ST-Live-Runner – Code-Review und erste Windows-Abnahme (22.10.2026)

**Git-Stand:** Runner-Hauptcommit `044d5b38057367f94bdd7273b7296f3254bae8be`, nachfolgender aktueller Entwicklungs-HEAD `b0221181602ddbaf7c05b08bae4b2d4633e04983` (Chrome-Browserwahl statt nur Edge/Chromium). Engine-Version unverändert `.29`. 22 Dateien im Commit inkl. Guide-, Spieler-, Driver-, Profil-/Server- und Export-Modulen; 20 neue Tests. Claude: Node 1015/1015, Stub-Test 26/26; eigene unabhängige **Ausführung** durch ChatGPT nicht erfolgt. Der Stub läuft in der Cloud gegen eine isolierte ST-Instanz, nicht den Featherless-Proxy oder das echte Windows-Profil. Dokumentation: `avereth-engine/docs/LIVE_RUNNER.md`.

**Positiv:** Gewünschte Trennung ist tatsächlich im Code: LLM-Spieler nur gerenderter Chat/HUD/Toasts und eigene Notizen; Fold/Engine-Records allein im Test-Evaluator. Die Leitfäden legen Mage → Gilde → Novice-Board → Dungeon-Quest → Fight/READY → Abgabe fest und erlauben adaptive, variierende Spielertexte, optional Guardian/Floor-Clear. Eigene isolierte ST-Instanz, keine Regression/Swipe-Verschleierung und automatische Exporte (Chat, Events, Provider-Log, Calls, Spielerentscheidungen, Evaluation, Report) sind implementiert. Geplante Sperren gegen schreibenden Zugriff auf das persönliche Profil und gegen unbeabsichtigte Key-Exporte vorhanden. Aussage zur absoluten Sicherheit erst mit lokalem Test stützen.

**Featherless-Fünf-Modelle-Proxy – konkrete Integrationsgrenze:** Nutzer startet seinen bestehenden Proxy einmal manuell und lässt ihn laufen. Der Runner soll ihn nicht starten/stoppen, sondern seine Verbindung nutzen. Im Code werden `reverse_proxy`/`proxy_password` **nicht** ins isolierte Profil importiert; bevorzugt wird die Chat-Completion-Quelle `custom` mit `custom_url`. Ob das tatsächliche Profil so eingestellt ist, kann Cloud-Code-Review nicht wissen. `--inspect` und `--check --ping` vor dem ersten Test durchführen; gegebenenfalls Unterstützung der bestehenden Anbindungsform ohne Änderung des persönlichen ST-Profils ergänzen. Die aktuelle Ping-Prüfung erkennt nur HTTP-Erreichbarkeit von `/models`, kontrolliert aber weder die konkrete GLM-ID noch die erwartete fünf Modelle umfassende Liste; Empfehlung: Zielmodell-Verfügbarkeit als Preflight-Assertion hinzufügen.

**Zeitmodell:** LLM-Spieler verursacht eigenständige Provider-Aufrufe, Standard maximal 3000 Antworttokens. 80 Züge und 240 Minuten sind Grenzen, nicht die erwartete Normaldauer. Historische .28-Daten (Planner 2,4s, Narrator 11,6s, Extractor 4,3s median) sprechen zusammen mit zusätzlichen Spieler-Calls eher für eine planbare ~15–30-minütige Normalrunde bei 25–40 Zügen, **keine garantierte Zeit**; die 1–2h von Claude sind noch ungemessene konservative Schätzung. Erste Windows-Echtzeitmessung abwarten. Testleitfaden darf natürliche Umwege zulassen, soll aber bei den Pflichtetappen kein künstliches Ausdehnen fördern.

**Weiterer Prüfbedarf:** Event-basierte Meilensteine bedeuten nicht automatisch korrekte Narrator-Prosa. Qualitative GLM-Auswertung bleibt unabhängige Review-Aufgabe. Vor weiteren Tests: `--inspect` für Profil-Preset/Karte/Lorebook/Custom-URL, Probe-Lauf/Exportkontrolle, danach vollständiger Patch-8.4-Gruppenlauf. DEFEND-Cull-Task-Mismatch aus §15 bleibt separat. Nie API-Schlüssel hochladen.


### Update 22.10.2026 – Proxy-Preflight-Nachtrag `35ead9c`

Claude hat im Folgecommit `35ead9c21564c8aa134dfd93978184cdef2bd883` den zuvor offenen Featherless-Anbindungsfall korrigiert. Neues `preflight.mjs`: GET `/models` plus exakte Modell-ID als Check, Inspect und Start-Preflight. Profilimport berücksichtigt bei ST 1.19 das aktive Top-Level-Proxy-Preset (`selected_proxy`/`proxies`) statt veralteter `oai_settings.reverse_proxy`-Werte; Custom bleibt getrennt über `custom_url`. Das echte Passwort bleibt im Originalprofil, Test-Proxy erhält Schlüssel nur aus env in der isolierten Instanz und wird nach dem Lauf bereinigt. ST-Welcome-Screen-Race und Proxy-Dialog behandelt; Bericht mit realen Timingdaten; `maxTurns=40` in Beispielconfig. Claude: npm 1023/1023, Runner-Tests 28, drei Stub-Läufe; hier Code-Review, **noch keine eigene lokale/GLM-Verifikation**. Empfohlener nächster Schritt: Nutzer auf Windows `--inspect --ping` durchführen und Ausgabe ohne Secrets prüfen, erst danach echten `.29`-Lauf. `--inspect --ping` zeigt Fehler visuell, kann aber ohne nonzero Exit-Code enden.


### Realer Windows/Featherless-Livetest 22.10.2026 – `20261022-054329Z-patch_8_4` (Build .29, Git `35ead9c`)

**Quelle:** vom Nutzer bereitgestellter vollständiger ZIP-Export (Chat, `avereth-events.json`, `player.jsonl`, `calls.json`, Provider-Requests, `report.md`, Logs). Unabhängige Log- und Event-Analyse durch ChatGPT. **Erster echter** Windows-ST-1.19-/Chrome-/Featherless-Test mit `zai-org/GLM-5.3-Flash`; Verbindung über Custom `http://127.0.0.1:5050/v1`, `/models`-Preflight erfolgreich; Userprofil laut Report unverändert und Geheimnis-Scan sauber. 19 abgeschlossene Spielzüge, 18:22 min, 6/8 Pflichtetappen (Charakter erstellt, Gildenmitglied, Board, Dungeonvertrag, Dungeon betreten, erste Kämpfe gewonnen), 321 Engine-Events, Integrität OK, 53 Spiel-LLM-Aufrufe; **danach automatischer, kontrollierter Runner-Abbruch beim Versuch für Zug 20** (`player failure: no usable decision ... after 3 attempts`). Kein Engine-Crash.

**P0 1 – GLM-Spieler hängt in Reasoning:** `player.jsonl`: bei Zug 20 drei Versuche mit `finish_reason=length`, exakt 3000 Completion-Tokens, 0 Zeichen `content`/JSON, jeweils ca. 11k Reasoning-Zeichen. Über 27 Spieler-API-Versuche insgesamt acht unbrauchbar, davon die drei terminalen. Spieler-Request hat `max_tokens=3000`, `temperature=.8`, *kein* explizites Thinking-Budget; lange Spielertexte und lange `observations`. Nötig: providerkompatible und überprüfte Reasoning-Begrenzung/Deaktivierung für nur den **LLM-Spieler**, knapper strukturierten JSON-Output, begrenzte Spielertexte/Notizen, nachvollziehbare Fallbacks, eigene Tests für `finish_reason=length`/leeren Content und begrenzte Wiederholungen. Nicht einfach Budget erhöhen. 19 Züge: Spiel 8:01 min + Spielerentscheidungen 7:53 min, zusammen 18:22 einschließlich Einrichtung.

**P0 2 – zwei echte leere Narrator-Returns:** Zug 17 (Provider-Call 48) und Zug 18 (Call 50): beide `finish_reason=length`, 4096 Completion-Tokens, ausführliches Reasoning, `message.content=""`; SillyTavern-Chat-Narrator-Nachrichten 35 und 37 existieren, haben aber leeren `mes` und nur Engine-System-Panel, Extraktion jeweils `skipped: empty reply`. Mechanisches Kampfergebnis bleibt korrekt (First Strike 35 Schaden, dann Basic Attack 16, Gegner tot, +13 XP, L2); jedoch zwei Züge ohne Story. Runner-Treiber betrachtet neue Chat-Nachricht mit leerem Narrator-Text dennoch als abgeschlossen; künftig leere Antwort deutlich als Fehler/Anomalie erkennen, stoppen oder streng definierte Retry-Strategie; keinesfalls still als erfolgreiche Story fortfahren. Unklar, ob Provider-spezifisches Thinking-Limit sinnvoll; keine Annahme ohne Test.

**P1 – Statpunkte nur erzählt statt vergeben:** Zug 19 schrieb Spieler in Fließtext `2 WIL, 2 INT, 1 VIT`, statt `#assign WIL 2 INT 2 VIT 1`. Planner interpretierte als `other` `resolved`, mit `DOES ... it books nothing`, Narrator schrieb trotzdem *The points settled in him...*. Tatsächliches End-HUD unverändert `Free Stat Points 5`, `INT 7, WIL 7, VIT 5` (INT/WIL +1 stammt vom automatischen Favored-Level-Up), kein Stat-Zuweisungsevent. **Runner:** verbindlich `#assign` ausführen und Ergebnis lesen, relevante `#bag`-/`#equipment`-Kommandos nutzen, nicht nur „may use“ im Spielerprompt. **Engine/Planner-Narrator-Konsistenz separat:** mechanische Punkteverteilung in Prosa als nicht gebuchte Aktion ausdrücklich zurückweisen/erklären, statt als erfolgreich darzustellen.

**Items:** Keine bestätigte Verwendung erfundener Gegenstände in diesen 19 Zügen. Wundset und Azure Tincture wurden im Shop gekauft: `object.created` bei Zug 9, `object.consumed` bei Zug 15. 24 Kupfer abgebucht; Tincture stellte MP 8→33 her; Set behandelte Wunden ohne HP-Heilung. HUD zeigt außerhalb Combat `Equipped` und (gekürztes) `Carried`, Combat-HUD blendet diese aus: Runner-Lesbarkeit/Inventar-Gedächtnis aus **spieleröffentlichen** Informationen ausbauen, aber nicht unbewiesene Item-Halluzination behaupten.

**Patch-8.4-Testabdeckung unvollständig:** Eintritt in Level 1 löste sofort gemeinsame Aggro aller drei Skelette aus (3er-Gruppe, besiegt, 96 XP). **Nicht** explizit getestet: offenen Angriff auf *bis dahin unaufmerksame* Gruppe sowie unbemerkten Einzel-Ambush (zweiter Gegner Robed Waiting Thing war laut Engine **First Strike, no Ambush**). Gewählter Cull-Auftrag `Cull the Burial Gallery Skeletons` war *Clear all of level 1*, **kein numerischer Cull**; daher 8.4-Count-Konsistenz nicht beurteilt. Nach Zug 19 erscheint weiterer Skeletal Gravekeeper (48 HP) und die Quest bleibt `active`; Abschluss/Turn-in noch nicht erreicht, daher kein Quest-Bug hieraus ableiten. Separate gezielte Szenarien für Group Awareness und **numerisch** spezifizierte Cull-Aufträge.

**Nächste Reihenfolge:** Erst Runner/Provider-Robustheit + Statbefehl + leere Narrator-Antworten beheben (minimal, regressionsgetestet, Original-ST unberührt), danach erneut echter Windows-Lauf; Engine-Konsistenzproblem „Prosa-Stat-Assignment“ separat beheben. Kompletten ZIP-Lauf für Claude-Auswertung verwenden, keine Secrets posten.

### Patch 8.4.1 umgesetzt – Engine `.30` und Live-Runner (22.10.2026, Code-Review)

**Git-Stand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` HEAD `8f679533bf9331f3ad656b9bdb7f21ac5310e66e`, Engine-Commit `e69f27b8d141337e32880c5ba0413113e9337f9d`. Version `4.3.0-c.6.6.30`. Beide Commits und zentrale Quellen über GitHub unabhängig gelesen; **keine unabhängige Testausführung**, noch kein echter Windows-/GLM-Lauf auf `.30`. Claude meldet 1047/1047 Unit-/Regressionstests, 46/46 ST-1.19-Stub-Selbsttest-Prüfungen und C-Smoke OK. Doku: `avereth-engine/docs/PATCH8_4_1_LIVETEST_STABILIZATION.md`, Regressionen `tests/v4/live_1022c.json`, `tests/v4/patch841.test.js`, `tests/live_runner/patch841_runner.test.js`.

**Engine:** Freitext-Statpunkteverteilung als `other` wird abgelehnt bzw. `#assign`-Hinweis an Spieler/Erzähler ausgegeben; Level-up-Hinweise nennen `#assign`. Im *bereits bestehenden* Living Dungeon verweigert der World-Applier ein nicht an Engine-Encounter gebundenes feindliches `creature.new` (`dungeon_foe`, inklusive nächstem Korrekturhinweis), ohne Quest/XP/Kampf zu buchen. Legitime Engine-Encounter, neutrale Tiere und offene Welt außerhalb solcher Dungeons bleiben. Living-Dungeon-Suche fordert keine zusätzlichen Erzähler-Encounter mehr. Clear-Aufträge ohne numerischen Killzähler heißen nicht länger „Cull ...“. Risiken: feindselige **Personen** sind von der neuen Kreaturregel nicht erfasst, unklare Statprosa und falsche Artbezeichnungen benötigen Livetest.

**Runner:** Der LLM-Spieler schreibt Handlungen/Dialog/Systemkommandos statt Narrator-Prosa/innerer Monologe (meist kurze Nachricht; Nachbesserungsversuch bei >600 Zeichen); `#assign` nach Level-up sowie bedarfsgerechte `#bag`/`#equipment`/`#status`-Nutzung. Auf identischem Endpoint/Modell übernimmt er im Normalfall Profil-Reasoningfelder `reasoning_effort` und `clear_thinking` ohne Credentials, prüft sie mit kurzem Provider-Request und sendet bei HTTP 400/422 keine abgelehnten Felder. `finish_reason=length` mit leerem Spieler-Content führt zu kürzerem/minimalem Prompt statt unveränderter Wiederholung. HUD aus Spieler-HTML einmal separat; Runner-eigene Toasts nicht im Spielersichtkontext, en-US-Browser. `turnOutcome`: Story-/System-/Engine-Antwort sowie `narrator_empty`/`missing`; leere echte Storyantworten stoppen den Lauf mit Diagnose, ohne Swipe/Regenerate. Beobachtungszuordnung, Evaluator und `.gitignore` verbessert.

**Echte nächste Abnahme:** Auf Nutzer-Windows bereits bestehende lokale Repo-Konfiguration/Playwright/Proxy wiederverwenden; auf Branch `git pull --ff-only`, Proxy manuell starten, API-Key im PowerShell-Prozess prüfen, `npm run live:st:check -- --ping` einschließlich *Spieler-Reasoning-Probe* prüfen, `npm run live:st -- --guide patch_8_4 --headed` (40 Züge). Neues Ergebnis-ZIP auswerten, nicht automatisch aus grünen Stub-Tests auf GLM-Verbesserung schließen. **Narrator max_tokens bleibt 4096, Player max_tokens 3000; kein automatischer Swipe**. Der neue Guide verlangt numerischen Cull und offenen Angriff auf zunächst unaufmerksame Gruppe; numerischer Dungeon-Cull ist selten, Board füllt nur Lücken, kann daher Etappenbudget überschreiten. Kein vorschneller neuer Fix ohne Testbefund.


### Zweiter echter automatischer GLM-Livetest (22.10.2026, .30, Run 20261022-074926Z-patch_8_4)

**Unabhängig aus ZIP-Rohdaten geprüft:** Build 4.3.0-c.6.6.30, Git 8f67953, 33 Züge in 13:14 Min., 91 Spiel-API-Calls, 28/28 Narrator-Antworten mit Storytext, kein leerer Narrator; GLM-Spieler-Entscheidungen gesamt 2:13 Min. (zuvor 7:53 Min.), Median 3,5 Sekunden. 39 Spieler-API-Versuche, fünf anfänglich ungültige JSON durch Retry korrigiert, null Reasoning-Length-Abbrüche. Spielereingaben deutlich kürzer und auf Handlung/Dialog begrenzt.

**Bewährt:** Numerischer Outdoor-Cull mit 4 Bog Striders, READY 4/4, Turn-in und 90 Kupfer plus 60 Quest-XP korrekt. Zug 31 #assign VIT 2 WIL 2 INT 1 wurde mit drei stat.assigned-Events wirklich gebucht: VIT 7, WIL 9, INT 8, 0 freie Punkte. Das LLM meldete wegen eines noch sichtbaren älteren HUDs fälschlich, der Befehl habe nicht gewirkt; im folgenden Narrator-HUD stimmen alle Werte. 120 cp = 1 Gold 2 Silver ist ebenfalls korrekt.

**Nicht bestanden: Gruppenprüfung, jedoch kein belegter Produktbug.** Vor offenem Angriff in Zug 11 war nur *ein* Strider als Entity in der Szene und keiner Gruppe zugeordnet; drei andere wurden bloß im Erzähltext vermutet. Später kamen zwei Strider gleichzeitig durch combat.pending in denselben Kampf. Damit ist die Engine-Gruppenfunktion für eine schon vorhandene, unaufmerksame Gruppe nicht geprüft. Evaluator meldet korrekt 7/8 Pflichtetappen und open_group_attack=false.

**Neuer Runner-Bug:** Spieler meldete bei Entscheid für Zug 34 stop_reason=done und behauptete alle neun Milestones erreicht zu haben. run_live.mjs vertraute diesem Stop ohne Prüfung auf finished(evaluate(chat)) und reportete player_done trotz 7/8. Abschluss nur mit tatsächlich erfüllten Pflichtetappen als vollständig ausweisen, sonst incomplete oder begründete Fortsetzung.

**Neuer Engine-/Narrator-Bug Guildregistrierung:** Start 50 cp, Gebühr 20 cp. Zug 5 buchte die Engine eine 10-cp-Teilzahlung als coin.changed und transaction.completed; Narrator wies sie zurück und ließ Münze zurückschieben. Zug 6 wurden die 20 cp regulär noch einmal abgezogen. Insgesamt 30 cp bezahlt statt 20 cp, keine Rückbuchung. Live-Regression mit zweistufiger Registrierung ergänzen.

**Weitere Qualitätsbefunde:** HUD-Here behauptete letzten Strider auf dem Damm, obwohl noch keine targetable Entity existierte; der Angriff wurde korrekt ohne Ressourcenverlust verweigert. Tote Strider blieben als dead, ENGAGED im Present-HUD, der Here-Text wiederholte den letzten Ambush nach 4/4. Wagenfahrt bis Westgate wurde erzählt, während der Engine-Ort nach abgewiesenem scene.moved noch eel-weirs blieb; erst nächster Zug synchronisiert. Reine Systemantwort zu #assign erzeugt kein neues HUD und lädt zu falsch datierten Player-Beobachtungen ein.

**Empfohlene enge Nacharbeit vor Patch 9:** Registrierungstransaktion; Runner-Done-Validierung; echter Test einer zuvor bestehenden group mit mehreren unaware Mitgliedern; gezielte Aktualitäts-/HUD-/Narrator-Orts-Konsistenz. Keine globalen XP-, Kampf- oder Tokenänderungen allein aus diesem Lauf.


### Patch 8.4.2 (.31) im Git geprüft – Dungeon-Volltest ausstehend (22.10.2026)

**Verifizierter Entwicklungs-HEAD:** `4d43523d9f447e77237f4d80cb5d98a1c071efde`, Produkt-Engine `5ad84946dabfb7f32288c7f8dbc79bb2984c91f2`, Build `4.3.0-c.6.6.31`. Git-Commits und Kerncode von ChatGPT unabhängig gelesen, Tests **nicht** selbst ausgeführt. Claude meldet `npm test` 1063/1063 (ein Abschlusslauf), ST-1.19-Stub-Selbsttest 47/47 und 50 Runner-Tests. Details: `avereth-engine/docs/PATCH8_4_2_FINAL_INTEGRATION.md`.

**Engine:** Falsche Beträge bei klarer Gildenregistrierung werden nicht als freie Zahlung gebucht; abgekürzte und volle Thread-IDs werden auf dasselbe bestehende Objekt aufgelöst; tote Gegner erhalten im normalen HUD keine aktive Distanz/Cover-Anzeige. **Runner:** LLM-"done" bei offenen Pflichtetappen wird als `incomplete` behandelt, altes HUD nach Systemantwort als veraltet markiert und User-Befehle mit Original-`#` angezeigt. Neuer Guide `patch_8_dungeon_full`: elf verpflichtende, dungeonbezogene Engine-Meilensteine von Anmeldung und Gate über Population/Group-Awareness, Guardian, Floor-Clear bis Vertrag-READY/-Abgabe, 60 Züge per CLI. Outdoor-Cull ist bewusst kein Pflichtziel mehr; dieser war im zweiten GLM-Lauf bereits erfolgreich geprüft.

**Nächster Schritt:** Nutzer unter Windows `git pull --ff-only`, API-Key/Featherless-Proxy wie bisher, dann `npm run live:st -- --guide patch_8_dungeon_full --max-turns 60 --headed`; ZIP vollständig unabhängig prüfen. Nicht erreichte Gruppe/Guardian/Floor-Clear bleiben `incomplete`, kein automatischer Produktfehler. **Gezielte Prüflücke bei eigener Roh-Event-Analyse beachten:** Der aktuelle Evaluator kann `dungeon_gate` als erreicht markieren, wenn eine Gate-Gebühr angeboten wurde, aber gar kein Zahlungsevent vorhanden ist (`!before.length` im Fee-Check); echte Gate-Buchung getrennt anhand `offer.created`/`coin.changed` prüfen. Das ist derzeit **kein bewiesener Enginefehler**, und soll keinen neuen Großpatch vor dem echten Test auslösen. Die Node-24-libuv-Assertion beim Prozessende nach vorher vollständig grünem Preflight war bisher nur als mögliche Shutdown-Störung beobachtet, nicht als Featureblocker verifiziert.

### Erster automatisierter kompletter Living-Dungeon-Livetest (.31) – 22.10.2026, Run 20261022-090042Z-patch_8_dungeon_full

**Unabhängige ZIP-Analyse (Chat, Engine-Events, Calls, Evaluator, Spieler-Log, Bild) durch ChatGPT:** Entwicklungscode `4d43523d9f44`, Build `4.3.0-c.6.6.31`, GLM-5.3-Flash über Featherless/Custom; **29 Züge, 17:47 Minuten, 79 Spiel-API-Calls (27 plan, 25 Narrator, 26 Extractor, 1 Board)**; Runner endet korrekt als **`incomplete`, 10/11 Pflichtetappen**. Einzige ungetestete Etappe: `dungeon_open_group_attack` (kein bei offenem Angriff bereits vorhandener Verband mit mindestens 2 `unaware` Mitgliedern). Diese fehlende Testchance ist **kein belegter Group-Combat-Produktbug**; bereits aufmerksame 2 Crystal Beetles kämpften ab Zug 10 gemeinsam, mit eigenen Turns.

**Wesentlicher mechanischer Erfolg:** `Clear the Outer Grottos of Glimmerdeep` wird als Dungeon-Vertrag registriert (Zug 7); Gate erlaubt gegen aktiven Vertrag gebührenfreien Eintritt (Zug 9; ursprünglich spezifizierte Gebühr 10 cp, **kein bezahlter Gate-Fall überprüft**). Engine bucht Slot `beetles` mit 2 Gegnern, `slimes` mit 1 Gegner und Slot `queen` mit Glimmer Queen. 3 Kämpfe: Beetles 60 XP, Quartz Ooze 36 XP, Queen 240 XP; Queen stirbt Zug 27; **`dungeon.cleared` mit `credit:pc`, cycle 1, floor 1, 3/3 wichtigen Slots**, `quest.ready` danach. Zug 29 zurück zur Guild Hall, `quest.status:completed`, **+120 cp, +30 Quest-XP** und Filing des Slips; Geld-/XP-Buchung stimmig. Registrierungsgebühr genau **einmal -20 cp**, nach +120 cp 150 cp vor späteren Käufen (keine neuen). Zwei `level.up` bei der Queen, korrekt zehn freie Punkte, Zug 28 `#assign INT 3 WIL 2 VIT 5` → INT 11/WIL 10/VIT 10, null frei. Profil und Geheimnisse unberührt.

**NEUER BESTÄTIGTER Engine-Bug 1 – Dungeon-Kapazität:** Glimmerdeep `capacity=6`; zunächst PC inside 1, später Wren Company 2 und Ashen Hands 4 gleichzeitig via `dungeon.party enter` (Event an Nachricht 36, Minuten 753 und 799) ⇒ 7/6 echte anwesende Plätze, wie Spieler-HUD notierte. `src/v4/living.js partyEvents` prüft bei simulierter NPC-Parteizulassung `occupancy(s, now).parties + st.p.size <= now.capacity`, **ignoriert `occupancy().pc`**. Enge Korrektur: vorhandene Totalbelegung einschließlich PC bei NPC-Eintritt berücksichtigen; Regression Spieler zuerst drin, Parteien 2+4, Kapazität 6, keine 7/6, Event-Replay/chronologischen Zeitspannen prüfen. Kein neuer Dungeon-Simulationsumbau.

**NEUER BESTÄTIGTER Integrationsbug 2 – Rückzug nicht gebucht:** Zug 20: Spieler `I back away quietly between the columns and slip back through the cleft, away from the queen...`, Narrator schildert ausdrücklich Rückweg in die Second Chamber. Planner `cmd.interpreted.commands=[]`, Extraktor versucht `arrive` Second Chamber, Engine weist konsequent `delta.rejected no_go` zurück (kein autorisierter `go`). Faktischer `scene.at` bleibt **Queen's Crystal Bowl** während der anschließenden sechs Stunden Rast. Primär Planner-Klassifikation einer klaren Rückzugs-/Ortswechselhandlung, nicht fehlender Authority-Guard. Gezielte Regression mit diesem Originalturn, keine Freigabe für unautorisierte Narrator-Moves.

**Konsistenz-/Designprüfpunkte (separat bewerten):** Rest Zug 22/23 bucht 120+240 Minuten und MP 8→29→72, HP 62→78→80, obwohl der Narrator in Zug 22 ausdrücklich behauptet, kein Rest stelle verbrauchtes Mana wieder her. Boss bleibt ohne Alarm; weil Bewegung nicht gebucht wurde, fand die Rast mechanisch in dessen Raum statt. Ob und unter welchen Bedingungen langes Rasten in gefährlichen Dungeonräumen Unterbrechungsrisiko benötigt, ist separate **Designentscheidung**, nicht ohne Auftrag eine kostenlose-/strafende Zufallsmaschine hinzufügen. Narrator Zug 15 endet mitten im Wort: Call 40 `finish_reason=length`, max 4096, **17.482 Reasoning-Zeichen**, nur 1009 Storyzeichen; keine vollständig leere Narrator-Antwort. Extractor Zug 23 Call 63 ebenfalls `finish_reason=length` nach 2500 Tokens/10.863 Reasoning-Zeichen, wurde repariert; kein fataler Gameplay-Abbruch. Nicht erneut globale Tokenlimits/Preset ändern ohne Prüfung.

**Kleiner Runner-Berichtsfehler:** Guardian-Etappe wird als Monster-ID `mon.glimmerdeep_grotto_c1_l1_e3` statt Milestone `dungeon_guardian` ausgegeben: beim Zusammenstellen von `evaluation.milestones` überschreibt `...reached[check]` das äußere `id`, weil das Guardian-Hit-Detail `id: d.id` enthält. Guardian-Kill selbst korrekt gebucht, daher reines Reporting. Beim nächsten kleinen Runner-Commit Detailschlüssel `entity`/`entityId` nutzen bzw. `id`-Überschreiben vermeiden.

**Einordnung:** Der zuvor fehlende vollständige Living-Dungeon-Hauptloop ist **real erfolgreich nachgewiesen**; `10/11` ist trotzdem **nicht** Full-Pass für besondere unaufmerksame Gruppen-Awareness und weder eine automatische Engine-Niederlage noch 11/11. Priorität für einen möglichst kleinen Abschlussfix: Kapazität und Rückzugs-GO, ggf. Milestone-Bericht/Narrator-MP-Wahrheit; nicht einen weiteren großen Patch-8-Featureblock. Nach Claudes unabhängiger Bewertung entscheiden, ob ein kurzer gezielter Awareness-Nachtest nötig ist; Ziel bleibt Patch 9 danach.


### Patch 8 FINAL – 8.4.3 umgesetzt und im Git geprüft, Übergang zu Patch 9 (22.10.2026)

**Implementierungsstand:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` bei HEAD `1f38bd12bd713a2345c57a276290609c7f8e4238` (Runner), zuvor Engine-Commit `211ee659e93072ff8f3e359be13eca93f8fecab3`. Build **4.3.0-c.6.6.32**. Quelltext von ChatGPT unabhängig geprüft; **Tests von Claude gemeldet, nicht selbst ausgeführt:** vollständige Suite **1074/1074**, Runner **52/52**, neun neue Engine-Regressionen gegen Live-Fixture `live_1022e.json` (auf Vorversion fünf rot, vier grün). Dokumentation im Entwicklungsbranch: `avereth-engine/docs/PATCH8_4_3_FINAL_DUNGEON_CONSISTENCY.md`.

**Fixes bestätigt im Code:** `src/v4/living.js partyEvents` rechnet beim Eintritt simulierter NPC-Gruppen mit `occupancy(...).total` (also inklusive PC) statt `parties`, unterbindet Glimmerdeep 7/6; `src/v4/planner.js` klassifiziert in Regel 7 explizite Ortsrückzüge außerhalb eines Kampfes als `go` und enthält engen `retreatGo`-Fallback für falsch als `flee` klassifizierte, räumlich aufgelöste Rückzüge, mit normaler Dungeon-Wege-/Sperrprüfung. Im Kampf bleibt `flee` erhalten; ohne bekanntes Ziel kein erfundener `go`. `src/v4/commands.js`: Erholungshinweis für Erzähler verdeutlicht, dass gebuchte HP/MP-Rückkehr zu erzählen ist. `tools/st_live/live/evaluator.mjs`: Guardian-Milestone-`id` nicht mehr durch Gegner-ID überschrieben; Gegner `entityId`, präzise Formulierung wenn kein `unaware` gebucht.

**Abnahmeentscheidung für Projektplanung:** **Patch 8 mechanisch/entwicklungstechnisch abgeschlossen**, auf Basis des echten 29-zügigen GLM-Dungeon-Laufs (10/11 automatisierte Etappen; Guardian, 3 Encounters, `dungeon.cleared`, Quest-READY, 120 cp und 30 Quest-XP korrekt) plus gezielter deterministischer Replays für offenen Angriff einer zuvor `unaware` Gruppe, bezahltes Gate einschließlich Passablauf/Wiedereintritt und 3-Tage-Dungeon-Reset. **Nicht als 11/11 im echten GLM-Lauf ausgeben**: Dort war die besondere Awareness-Gruppe nicht vorhanden; `incomplete` bleibt richtige Evaluator-Markierung. Keine weitere 60-Züge-Expedition als Pflicht.

**Restrisiken, nachrangig oder bei künftigen normalen Runs beobachten:** Das Modell wurde nach neuer Planner-Regel nicht real live getestet; direktes `go` Second Chamber in Regression gescriptet, Fallback bei `flee` geht nur in vorherige Third Gallery, beide regulär autorisiert. Narrator-/Extractor-Reasoning-Ausreißer können weiterhin vorkommen; Erholungs-Prompt ist nur klargestellt, nicht live verifiziert; ein längerer Rest im gefährlichen Guardian-Raum war durch vorherigen Rückzugfehler möglich und Sicherheits-/Balance-Design dazu ist nicht entschieden; Gate-Evaluator hat frühere abstrakte Prüfbedingung, die angebotene Gebühr ohne gebuchte Zahlung als erreicht zählen *kann*, Produkt-Gate-Regressionen prüfen die Buchung selbst. Diese bekannten Risiken sind **keine neuen Patch-8-Blocker**.

**Nächster großer Patch: Patch 9 – Organic Character Growth**, keine neue allgemeine Patch-8-Fixrunde. Zielklassenauswahl exakt Warrior/Mage/Rogue mit Startkits; neue Skills, Passives, dauerhafte Boni und Klassen-Evolutionen später organisch anhand von Player-Handlungen, Training, Entdeckungen, Erfahrung; LLM schlägt nur innerhalb flexibler Guidelines vor, deterministische JS-Engine prüft, bucht und persisted, kein fester versteckter Evolutions-/Skillbaum. Skalierung/Performance-Balance für 10B aufheben. Vor Implementierungsauftrag ggf. konkretes Patch-9-Design-/Acceptance-Sheet wiederlesen bzw. ausarbeiten, dann von Claude in geplanten Schritten implementieren lassen.
