# Avereth Engine – Roadmap nach 10B

**Stand 09.11.2026 · fachliche Orientierung.** Aktueller Build, Nachweise und konkrete offene Fehler ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md); Regeln in [02](02_DESIGN_KANON.md). Leitbild bleibt eine glaubwürdige, fortbestehende Welt mit wiedererkennbaren Menschen und frei entstehenden Geschichten. Spielerhoheit und Tempo gehen vor Vollsimulation.

## 1. Aktuelle Entwicklungs- und Testschritte

| Strang | Nächster Schritt |
|---|---|
| **NPC E3** | Nach technisch abgeschlossenem E2-A/E2-B die sozialen Entscheidungen D2, D3 und D13 treffen. E3 als eigenes Paket nach Nutzerfreigabe umsetzen. [Fachplan §13](patch_plans_10b/NPC_E2_E3_FACHPLAN.md#13-offene-designentscheidungen) |
| **Natürliche NPC- und PULSE-Tests** | E2-Kontinuität, das freie Modellverhalten und PULSE A, C und B im persönlichen Spiel beobachten. Paket D dient anschließend der Auswertung und Feinjustierung. [Aktueller Stand und Nachweise](03_AKTUELLER_PROJEKTSTAND.md) |
| **Stealth S2** | Heimliche lokale Search/TAKE auf S1 aufbauen. Auswahl und Freigabe sind separat. [Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md) |

S1, U1–U3 und der User02-Technikschnitt sind umgesetzt. Der ausgewertete User02-Run bleibt ein Originalbeleg für die früheren Integrationsfälle. [User02 einschließlich Sol-Nachtrag §8](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md).

## 2. NPC-Kontinuität – neue fachliche Reihenfolge

**Maßgebliche Analyse:** [Brenna einschließlich GPT-/Sol-Gegenreviews §§9–10](recherche/NPC_KONTINUITAET_ANALYSE_20261104.md); zusätzliche Original-Requestnachweise für Tam und verlorene Episoden in User02 §8. Speicherung, akzeptierte Episode, tatsächliche Auslieferung und Modellverwendung getrennt nachweisen.

**Planbasis war .168 am 08.11.2026.** E0/E1 sind seit .158 umgesetzt. E2-A (.169–.171) und E2-B (.172–.173) sind technisch abgeschlossen. Die E3-Regeln sind im Fachplan vorbereitet und die Nutzerentscheidungen stehen aus. [Ist- und Ursachenanalyse](recherche/NPC_E2_E3_ISTANALYSE_20261108.md) · [Fachplan](patch_plans_10b/NPC_E2_E3_FACHPLAN.md) · [Aktueller Stand](03_AKTUELLER_PROJEKTSTAND.md).

| Etappe | Fachziel / Abnahme |
|---|---|
| **E0 Diagnose** | Kompakte Metadaten der tatsächlich gelieferten/verworfenen Abschnitte, relevanten NPC-IDs und Budgetgrößen im Record; auch Dungeon-/Szenenkontext beachten. Kein zusätzlicher Modellcall, keine zweite State-Wahrheit oder vollständige Promptkopie pro Zug. |
| **E1 Sofortkontinuität** | Relevanten Gesprächspartner kompakt und unter Budgetgrenzen liefern, wiederholte Pflichttexte begrenzen, Freitext über **World und Delta** erhalten sowie Gildenwissens-/Abgabeübergänge korrigieren. Brenna-Kette „Gespräch → Board → derselbe NPC“ und Tam als Positivkontrolle natürlich prüfen. |
| **E2 Wiederbegegnungen/Absprachen · technisch abgeschlossen** | Relevante bekannte Figuren bei autorisierter Rückkehr erinnern, ohne Anwesenheit zu erfinden; wichtige offene Gesprächsfäden wiederaufgreifbar halten, keine formalen Privatquests. |
| **E3 Persönlichkeitsanker · Design offen** | Wenige belegte Merkmale zu Stimme, Temperament und Interessen; situationsabhängig, keine dauerhafte Biografie aus einer einzelnen Reaktion. |
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
| **W5** | **PULSE A und B sind umgesetzt.** Ein gemeinsames Fenster je geeignetem Erzählzug. Umgebung, Tageszeit und begrenzte Fehlwurfserie formen die Chance. In Living Dungeons reserviert die Wanderbegegnung einen freien Minionslot. Ereignisdichte und Parameter folgen aus der natürlichen Auswertung in D. [Kanon](02_DESIGN_KANON.md#8-welt-lore-und-organische-klassen) |
| **W6** | **ROAD AHEAD nutzt seit Paket A dasselbe Ereignisfenster.** Der Reiseabschnitt behält die Regeln für bestätigte Ankunft und autorisierte Zielkontakte. [PULSE-Plan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) |
| **W10** | Story Sifting: Hinweise aus tatsächlichen Events, keine neuen Weltfakten, PC-Aktionen oder automatischen Quests. Kann vor großen Uhren sinnvoll sein. |
| **W4** | NPC-Eigeninitiative und eigene Ziele; vorhandene Agenda-/Thread-/Zeitmechanik erweitern, nicht jeden unsichtbaren NPC simulieren. |
| **W8** | Wenige NPC-/Fraktionsuhren mit kleinen überprüfbaren Folgen, keine automatischen Geld-/XP-/Kampfergebnisse. |
| **W9** | Gerüchte/Informationsverbreitung über legitime Quellen; Wissen, Vermutung und Geheimnisse trennen. |
| **W7** | **Rastunterbrechung ist mit C und B umgesetzt.** Die Engine entscheidet vor der Buchung über vergangene Zeit und Erholung. Sichere Unterkünfte bleiben sicher. Im Dungeon kann die Wanderbegegnung unterbrechen. [Kanon](02_DESIGN_KANON.md#8-welt-lore-und-organische-klassen) |

**PULSE A, C und B sind technisch abgeschlossen.** Die Reviewkorrekturen reichen bis .168. Der natürliche Test liefert die Grundlage für Paket D. [Aktueller Abnahmestand](03_AKTUELLER_PROJEKTSTAND.md) · [PULSE-Fachplan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md).

### Handel, Tempo und Bedienung

| ID | Kandidat / Entscheidungsgrenze |
|---|---|
| **Q1** | Engine-Shops als gesonderte alternative Handelsarchitektur mit Ladenidentität, Katalog und kanonischem Preis; kein Fehler-Fallback oder zweite Preisautorität. [Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md). |
| **Q2** | Bereits bekannte Boards/Offerten direkt anzeigen; vorhandene IDs nutzen, gemischte Interaktionen bleiben narrativ. [Fachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md). |
| **Q3** | Sichere Engine-only Rest/Wait/Reisewege; gefährliche Varianten erst nach passender W6/W7-Integration. Kein Teleport. |
| **T1** | Tatsächliche Rollenzeit, Prompt, Cache, Repair und Kosten je nutzbarer Handlung messen. Kleine Basismessung früh, größere Architektur erst nach Befund. |
| **Q4** | Suche/Erkundung verbessern; **Flucht/Chase existiert grundsätzlich**. Zuerst natürliche End-to-End-Abnahme und gegebenenfalls enger C0-Intent-/Hostfix; C1–C3-Terrain/Speed/Stamina sind unbeschlossene Optionen. [Chase-Fachplan](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md). |
| **Q5** | Kompaktere Contract Details und editierbare Quest-/TAKE-Entwürfe sind seit .161 umgesetzt. Weitere Journal-, Karten- und Shopentwürfe bleiben Kandidaten. [Stand und Patchquellen](03_AKTUELLER_PROJEKTSTAND.md) |

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

Vorhandene Mechanik und Originalbelege haben Vorrang bei der Planung. E4/E5 bleiben getrennte Entscheidungen. PULSE D stützt sich auf natürliche Läufe mit den umgesetzten Paketen. UI rendert autoritativen Zustand und kann editierbaren Spielertext vorbereiten. Der Hessa-Objektfall aus Batch28 bleibt ein einzelner Kontextfehler. [Aktuelle Priorität und Freigabe](03_AKTUELLER_PROJEKTSTAND.md).

## 5. Historie und Quellen ohne zweite Dokumentation

[Ausführliche Vorfassung vor dieser Aktualisierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/07_ROADMAP_NACH_10B_ENTWURF.md) mit 33-Themen-Tabellen, Aufwand und Gegenreview; [ältere Vollfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md). Alte Rangzahlen sind kein Auftrag. Neue Kandidaten in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), Umsetzungsnachweise in Produktpatchnotes, Originalerfahrung im [Runindex](testrun_10b/README.md).
