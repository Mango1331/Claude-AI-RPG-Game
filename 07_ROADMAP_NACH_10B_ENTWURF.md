# Avereth Engine – Roadmap nach 10B

**Stand: 05.11.2026 · fachliche Orientierung, keine Implementierungsfreigabe.** Aktueller Build, Nachweise und konkrete offene Fehler ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md); Regeln in [02](02_DESIGN_KANON.md). Leitbild bleibt eine glaubwürdige, fortbestehende Welt mit wiedererkennbaren Menschen und frei entstehenden Geschichten. Spielerhoheit und Tempo gehen vor Vollsimulation.

## 1. Tatsächliche Arbeit jetzt – vor der langfristigen Kandidatenliste

**S1 und UI U1–U3 sind umgesetzt; User02 ist vollständig gegengeprüft.** Ihre alten „noch testen/jetzt implementieren“-Einträge sind keine neuen Arbeitsaufträge mehr; verbleibende Naturtestgrenzen stehen in 03. [User02 einschließlich Sol-Nachtrag §8](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md) ist die aktuelle fachliche Grundlage.

| Nächste Auswahl | Abgrenzung |
|---|---|
| **User02-Technikschnitt konkretisieren** | Dungeon-Floorgrenze und Passage-/Ankunftszuordnung zuerst eingrenzen; Raumsuche, Exit-Recovery und begleitete Szenen gezielt behandeln. Vorhandene Originalfälle und Gegenproben nutzen; kein Großaudit, neues Dungeonsystem oder Finanzumbau. |
| **NPC E0/E1 als erstes NPC-Fachpaket** | Weiterhin vorgesehen. Die Nutzerpriorität war an das Ausbleiben relevanter neuer Technikfehler gebunden; User02 hat solche geliefert. Nach deren Eingrenzung konkreten Auftrag festlegen. |
| **Stealth S2** | Heimliche lokale Search/TAKE auf S1 aufbauen; keine Voraussetzung für NPC E0/E1. Keine neue Diebstahl-/Geräuschsimulation. [Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md). |
| **Weitere Welt-/NPC-Auswahl** | Nach stabiler Grundkontinuität E2/E3 und gegebenenfalls einen begrenzten PULSE-Prototyp auswählen. Große Beziehungs-/Agenda-Anbindung später. PULSE benötigt keine vorherige vollständige Langzeit-Beziehungsmechanik. |

Die Auswahl ist eine Empfehlung auf Basis des Reviews, keine selbst erteilte Produktfreigabe. Keine zusätzliche Pflicht-Vollbatchserie und keine pauschale XP-, First-Strike- oder Shopänderung aus User02.

## 2. NPC-Kontinuität – neue fachliche Reihenfolge

**Maßgebliche Analyse:** [Brenna einschließlich GPT-/Sol-Gegenreviews §§9–10](recherche/NPC_KONTINUITAET_ANALYSE_20261104.md); zusätzliche Original-Requestnachweise für Tam und verlorene Episoden in User02 §8. Speicherung, akzeptierte Episode, tatsächliche Auslieferung und Modellverwendung getrennt nachweisen.

| Etappe | Fachziel / Abnahme |
|---|---|
| **E0 Diagnose** | Kompakte Metadaten der tatsächlich gelieferten/verworfenen Abschnitte, relevanten NPC-IDs und Budgetgrößen im Record; auch Dungeon-/Szenenkontext beachten. Kein zusätzlicher Modellcall, keine zweite State-Wahrheit oder vollständige Promptkopie pro Zug. |
| **E1 Sofortkontinuität** | Relevanten Gesprächspartner kompakt und unter Budgetgrenzen liefern, wiederholte Pflichttexte begrenzen, Freitext über **World und Delta** erhalten sowie Gildenwissens-/Abgabeübergänge korrigieren. Brenna-Kette „Gespräch → Board → derselbe NPC“ und Tam als Positivkontrolle natürlich prüfen. |
| **E2 Wiederbegegnungen/Absprachen** | Relevante bekannte Figuren bei autorisierter Rückkehr erinnern, ohne Anwesenheit zu erfinden; wichtige offene Gesprächsfäden wiederaufgreifbar halten, keine formalen Privatquests. |
| **E3 Persönlichkeitsanker** | Wenige belegte Merkmale zu Stimme, Temperament und Interessen; situationsabhängig, keine dauerhafte Biografie aus einer einzelnen Reaktion. |
| **E4 Salienz/Beziehungsentwicklung** | Automatische Wichtigkeitsauswahl und später begründeter Beziehungsverlauf. Größere Verdichtung erst bei Bedarf; optionales Pinning separat entscheiden. |
| **E5 Eigenleben/PULSE-Anbindung** | Relevante eigene Agenden mit kleinen plausiblen Folgen verbinden; keine NPC-Agenten pro Tick oder Vollsimulation von Tagesplänen. |

**Grenzen:** Vorhandenes `#npc <name>` zeigt Spielerwissen; `#npc pin/unpin` ist unbeschlossen. Erzählerkarten können Geheimnisse enthalten und gehören nicht ungefiltert in das Spielerpanel. `attitude` wirkt schon auf Kampfseiten; keine automatische Flirt-/Sympathiepunktevergabe. Beziehungssichtbarkeit, Vergessen und eine Budgeterhöhung sind offene Entscheidungen. Die historische Originalanalyse zählt teilweise bis E6; spätere Aufträge deshalb zusätzlich mit Fachthema benennen.

## 3. Langfristige Kandidaten – 33 historische Kennungen

Die IDs bleiben Suchbegriffe, **keine starre Rangliste oder pauschale Baufolge**. Die früheren Aufwandsschätzungen, Detailgrenzen und Quellen stehen im [fixierten vollständigen Katalog](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/07_ROADMAP_NACH_10B_ENTWURF.md#3-langfristige-kandidaten--33-historische-kennungen). Hier nur Ziel und wesentliche Abhängigkeit; Einzelpläne bei konkretem Auftrag lesen.

### NPCs und lebendige Welt

| ID | Kandidat / Entscheidungsgrenze |
|---|---|
| **W1** | Freie persönliche NPC-Livetests über mehrere Tage; Brenna/Tam als belegte Vergleichsfälle, keine Pflichtdialogfolge. |
| **T4** | Spielerlebnis, Dialogfluss und QoL aus Originalfeedback beurteilen; kein permanentes Bewertungs-LLM. |
| **W3** | Wiedererkennbare Stadtfiguren/typische Orte auf vorhandenen Identitäten; zuerst E0–E2. |
| **W2** | Persönliche Episoden, Absprachen und Persönlichkeit nach E1 schrittweise vertiefen. |
| **W5** | **PULSE:** ein gemeinsames nachrichtenbasiertes Ereignisfenster für Stadt, Wildnis und Reise. Auslöserprinzip beschlossen, Implementierung/Frequenz/Wiederholschutz offen. |
| **W6** | **ROAD AHEAD ist Reiseintegration von PULSE**, kein zweiter Encounterwurf. GO, Unterbrechung und Ankunft erhalten; heutiges Reise-Gate im freigegebenen Geltungsbereich ablösen. |
| **W10** | Story Sifting: Hinweise aus tatsächlichen Events, keine neuen Weltfakten, PC-Aktionen oder automatischen Quests. Kann vor großen Uhren sinnvoll sein. |
| **W4** | NPC-Eigeninitiative und eigene Ziele; vorhandene Agenda-/Thread-/Zeitmechanik erweitern, nicht jeden unsichtbaren NPC simulieren. |
| **W8** | Wenige NPC-/Fraktionsuhren mit kleinen überprüfbaren Folgen, keine automatischen Geld-/XP-/Kampfergebnisse. |
| **W9** | Gerüchte/Informationsverbreitung über legitime Quellen; Wissen, Vermutung und Geheimnisse trennen. |
| **W7** | Gefährliche Rast-/Warteintervalle gesondert entscheiden; Unterbrechung **vor** voller Zeit-/Regenerationsbuchung. Sichere Unterkünfte bleiben sicher. |

**PULSE-Grenze:** höchstens eine Chance je geeignetem regulärem erzählendem Spielerzug; reine Systemansichten, aktive Kampfrunden, geblockte Eingaben und technische Wiederholungen erzeugen keine Zusatzwürfe. Kein Minuten-/Expositionshybrid. Ort/Tageszeit/Population beeinflussen plausible Chance und Ereignisart; friedliche Ereignisse oder kein Ereignis sind erlaubt. Lange Zeitsprünge allein erzeugen keine Zusatzchancen. Erst Stadt plus eine Wildnis-/Reisesituation, Rast und Agenda-/Uhrenanbindung später gesondert. [Verbindlicher Beschluss](02_DESIGN_KANON.md#8-welt-lore-und-organische-klassen), [Weltrecherche](recherche/AI_RPG_RECHERCHE_20261028.md).

### Handel, Tempo und Bedienung

| ID | Kandidat / Entscheidungsgrenze |
|---|---|
| **Q1** | Engine-Shops als gesonderte alternative Handelsarchitektur mit Ladenidentität, Katalog und kanonischem Preis; kein Fehler-Fallback oder zweite Preisautorität. [Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md). |
| **Q2** | Bereits bekannte Boards/Offerten direkt anzeigen; vorhandene IDs nutzen, gemischte Interaktionen bleiben narrativ. [Fachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md). |
| **Q3** | Sichere Engine-only Rest/Wait/Reisewege; gefährliche Varianten erst nach passender W6/W7-Integration. Kein Teleport. |
| **T1** | Tatsächliche Rollenzeit, Prompt, Cache, Repair und Kosten je nutzbarer Handlung messen. Kleine Basismessung früh, größere Architektur erst nach Befund. |
| **Q4** | Suche/Erkundung verbessern; **Flucht/Chase existiert grundsätzlich**. Zuerst natürliche End-to-End-Abnahme und gegebenenfalls enger C0-Intent-/Hostfix; C1–C3-Terrain/Speed/Stamina sind unbeschlossene Optionen. [Chase-Fachplan](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md). |
| **Q5** | Weitere UI-Iteration, Journal/Karte/Quick Replies; User02 wünscht weniger doppelte Contract Details und später vorbereitende Quest-/Shoptexte. Keine automatische Buchung oder Pflichtmenüführung. |

Q2/Q3 und kleine T1-Messungen können bei belegtem Nutzen vor dem größeren Q1-Umbau liegen. Verbesserte Raumsuche, neue Explorationsbeute und Shoparchitektur sind unterschiedliche Fachthemen.

### Kampf, Monster und organische Entwicklung

| ID | Kandidat / Entscheidungsgrenze |
|---|---|
| **K1** | Main/Minor ist designbeschlossen, technisch offen. Bewegung und Mobility teilen Minor; PC-/NPC-Parität. [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md). |
| **K2** | Plausible Körper, Bewaffnung und tatsächlicher Loot; keine garantierte Vollausrüstung als Drop. |
| **K3** | Sapienz, Populationen, Verhalten und Monsterkulturen; kein pauschaler Feindstatus oder Temperamentzwang. |
| **K4** | Ausführbare Spezialfähigkeiten, Resistenzen und Bossphasen; Main/Minor nur bei tatsächlich geänderter Aktionsökonomie Voraussetzung. [Monsteranalyse für K2–K4](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **K5** | World-Skills wie Licht, Barrieren und Umweltinteraktion mit geprüfter Effekt-/Delta-Autorität. |
| **K6** | Summons/Begleiter erst mit klarer Aktionsökonomie, Kosten, Präsenz und Persistenz; keine Gratis-Kampfgruppe. |
| **K7** | Mehrbandige AoE/Geometrie nur bei Bedarf; vorhandene Band-AoE und U3 nicht neu erfinden. |
| **K8** | F→E-, Wirtschafts- und Progressionsbalance an natürlichen Spielszenen prüfen; keine pauschale XP-Erhöhung oder Farmstrafe. |
| **K9** | Höhere Ränge E→D und darüber getrennt entwickeln; keine festen Klassen-/Skillbäume, B+-Slotbudget offen. |

User02s Wunsch nach aktiveren passenden Gegnern und nützlicheren Tränken ist ein Gameplaybefund, keine Freigabe zum Entfernen von First Strike oder Einführen pauschaler Rastgefahr. [Welt-/Skill-/Summonrecherche](recherche/AI_RPG_RECHERCHE_20261028.md), [F-Rang-/E-Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md).

### Quests, Abenteuer und Technikpflege

| ID | Kandidat / Entscheidungsgrenze |
|---|---|
| **Q6** | Höhere Gildenquests und zusätzliche prüfbare Objective-Familien, keine formalen Privatquests aus jeder Hilfe. |
| **Q7** | Ruhende Delivery-/Escortangebote nach Gegenfällen gezielt reaktivieren; bestehende Mechaniken erhalten. |
| **Q8** | Überlappende Jagden/Spezialziele erst mit gerechter eindeutiger Killzuordnung ohne Doppelzahlung. |
| **Q9** | Mehr Dungeon-/Abenteuervielfalt auf vorhandenen Living Dungeons; kein Drei-Kampf-Korridor oder fremder PC-Credit. |
| **T2** | Gegner-/History-Kompression nur bei gemessenem Wachstum; lebende Flüchtige, Loot, Quests, Bossslots und Replay schützen. |
| **T3** | Historische B2/E-Reste nur nach Nutzungsinventar entfernen, gemeinsam genutzte C-Pfade erhalten. |
| **T5** | Gen4-/Craft-/Resolver-/KI-Vergleiche nur als beauftragte isolierte Untersuchung mit konkretem Nutzen, kein stiller Engine-Neubau. |

## 4. Abhängigkeiten und Entscheidungsgrenzen

Vorhandene Mechanik und originale Reproduktion gehen einer neuen Architektur voraus. Persönliche Langzeitbeziehungen sind keine Pflichtvorstufe eines kleinen PULSE-Prototyps; Rastunterbrechung ist wiederum kein kostenloser Teil davon. UI rendert bekannten Zustand, autorisiert keine Handlungen. Der Hessa-Objektfall aus Batch28 bleibt ein konkreter Kontextfehler, kein Crafting-/Finanz-Gesamtauftrag. Aktuelle Priorität und Freigabe nur in [03](03_AKTUELLER_PROJEKTSTAND.md).

## 5. Historie und Quellen ohne zweite Dokumentation

[Ausführliche Vorfassung vor dieser Aktualisierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/07_ROADMAP_NACH_10B_ENTWURF.md) mit 33-Themen-Tabellen, Aufwand und Gegenreview; [ältere Vollfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md). Alte Rangzahlen sind kein Auftrag. Neue Kandidaten in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), Umsetzungsnachweise in Produktpatchnotes, Originalerfahrung im [Runindex](testrun_10b/README.md).
