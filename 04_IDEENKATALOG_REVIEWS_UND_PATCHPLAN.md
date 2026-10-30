# Avereth Engine – Ideenarchiv und spätere Kandidaten

**Stand: 30.10.2026. Ideen sind keine Patchfreigaben.** Aktueller Stand in [03](03_AKTUELLER_PROJEKTSTAND.md), verbindliche Regeln in [02](02_DESIGN_KANON.md), Fachindex in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

Die ausführliche vorherige Fassung einschließlich aller Beispiele/Varianten bleibt [auf 7994fa4](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), die alte Patch-8/9-Planung [auf 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). Historische Prioritäten sind keine laufende Aufgabenliste.

## 1. Abgeschlossene Patchgenerationen – kurze Chronik

Patch8/Living Dungeons und Patch9/Klassen, Skills, Passives, Lernen/Evolution sind implementierte Grundlagen, keine neuen Sammelaufträge. [Historischer Stand](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md), [9C-Abschluss 79c8e36](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36). Patch10A-HUD/QoL ebenfalls nicht neu aufrollen. Umgesetzte10B-Ketten und Commitlinks einmal im [Fachindex06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## 2. Übergeordnete Erkenntnis – die zentrale Richtung

**Prüfidee:** Reine Systemansichten benötigen keine zweite erzählerische Entscheidung. Mechanisch bereits aufgelöste Handlungen könnten nur bei echtem Erzählgewinn zusätzlich narrativ verarbeitet werden; offene Gespräche/Erkundung bleiben LLM-Aufgabe. Mischturns müssen alle autorisierten Teile erhalten.

Kein weiteres persistentes `turn.mode` und kein Routerframework. Bei nachgewiesenem Bedarf vorhandene Panels/Outcomes für ein lokales `panel/full`-Profil verwenden. **Nicht pauschal als bereits umgesetzt oder freigegeben behandeln.** [Board-/Handelsplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md).

## 3. Großer 141-Punkte-Ideenkatalog – thematisch verdichteter Index

Der historische Katalog umfasst Autorität/Kontext, Dungeons, Questziele, Reisen/Suchen, NPC-Kontinuität, Progression/Loot, UI, Performance und Qualitätssicherung. Nummerierung und Einzelbewertungen im [Vollarchiv](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). **#71 war verworfen; die später ausdrücklich beschlossene organische Klassenentwicklung aus 02 bleibt gültig.** Kein Widerspruch aus alten Vorschlägen ableiten.

### 3a. Konkrete 20 Kandidaten – Priorisierungsarchiv, keine Freigabe

| Historische Kandidaten | Heutige Einordnung |
|---|---|
| K01 Engine-only-Board; K19 Ausführungsprofile | Geplanter Komfortweg, siehe§2/§6; keine zweite Boardengine. |
| K02 alte Combat-Promptregel | Historischer Einzelprüfpunkt, vor neuer Arbeit aktuellen Prompt abgleichen. |
| K03 Dungeon-Cull-Ort; K04 Systemkarten; K05 Defense-/Utility-HUD; K08 Questprüfbarkeit; K09/K10 NPC-/Ortsidentität | Vorhandene Mechaniken und mehrere spätere Fixketten. Nur konkret belegte Restlücken bearbeiten, nicht die ursprünglichen Featureaufträge wiederholen. [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). |
| K06 Fokuszeile; K11 Journal/Karte; K20 Quick Actions | Optionale UI-Erweiterung, keine zweite Datenquelle. |
| K07 Questmeilensteine | Später§5/§7e, keine Pflichtstufen. |
| K12 ROAD AHEAD; K13 konkrete Suchfunde | Separate spätere Designfrage; bestehende Reise-/Suchmechanik bevorzugen. |
| K14 Skillbaukasten; K15 belegte Entwicklung | Mit Patch9 technisch vorhanden; neue Weltwirkungen nicht automatisch enthalten. |
| K16 Skill-Umweltwirkungen; K17 Bossphasen | Offen; nur mit ausführbarer Mechanik und taktischem Nutzen. |
| K18 Combat-Extractor-lite | Kontrolliertes späteres Experiment, kein automatischer Teil jedes Performancepatches. |

### 3b. Späterer NPC-Memory- und Identitäts-Langzeittest – vorgemerkt, **nicht aktuell** (27.10.2026)

**Zurückgestellt, keine zusätzlichen Runner-/Memory-Aufträge.** Vorhandene `knowledge`, episodische Erinnerungen, Beziehungen und Retrieval zuerst nutzen. Später in ohnehin natürlichen Langläufen wiederkehrende Personen anhand kanonischer ID, eigener Wissensquellen, gemeinsamer Vergangenheit und tatsächlich gelieferter Narrator-Kontexte prüfen. **Gespeichert, abgerufen und im Dialog benutzt sind drei verschiedene Stufen.**

Brast-Duplikate und Wiederrettung sind historische Gegenfälle, inzwischen mit Kontinuitätsfix [.85/2bab566](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2bab566); das ersetzt keine natürliche Langzeitabnahme. Fehlende Erwähnung einer Kleinigkeit, Irrtum oder Lüge sind kein automatischer Memorybug. Identitätsduplikate, Wissenslecks und falsch persistierte Geschichte brauchen konkrete Belege. Keine erzwungenen Testgespräche oder geheimen Zustandsdaten für den Spieler.

#### Optionale zweistufige NPC-Memory – Ideenentwurf, **Machbarkeit offen / kein Implementierungsauftrag**

Gewöhnliche Figuren könnten bei stabilem Personen-/Rollen-/Orts-/Beziehungsprofil bleiben; wenige wichtige wiederkehrende Figuren zusätzlich begrenzte gemeinsame Episoden behalten. Denkbare Auswahl: belegte Bedeutung durch die Engine oder ausdrückliche Markierung einer **vorhandenen** Person. Ein `#NPC`-Befehl existiert nicht, Auswahl/Rückstufung ist offen.

Bestehende IDs, Fakten, Quellen, Beziehungen und Ereignisse wiederverwenden, keine parallele Dossierbank. Geheimnisse, Namenswechsel/Tod, fehlerhafte Extraktion, Swipe/Reload und Budgetgrenzen prüfen. Erst messen, ob heutiger Abruf genügt; Verdichtung darf keine neuen Fakten schaffen. Detaillierte Beispiele in der [Vorfassung§3b](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#3b-späterer-npc-memory--und-identitäts-langzeittest--vorgemerkt-nicht-aktuell-27102026), [Recherche§4.4](recherche/AI_RPG_RECHERCHE_20261028.md#44-bogen-gedächtnis-ebene-4-erst-nach-der-messung-aus-3b).

## 4. Frühere Claude-/ChatGPT-Gegenreviews

Historische Patch8-/9-Reviews, Caching- und Performanceversuche stehen [im Gitarchiv](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#4-konkrete-claude-gegenreviews--was-entschieden-was-verworfen-wurde), neue Bewertungen beim jeweiligen Run. Keine zweite laufende Patchplanung hier.

## 5. Besondere Frage: Quest-Erweiterbarkeit E-/D-Rang

Mechanische Objective-Bausteine existieren bereits; höhere Gildenränge sind noch nicht umfassend natürlich abgenommen. Später kreative Probleme/Autoren mit wenigen überprüfbaren Zielen verbinden, statt jeden Rang und jede Geschichte fest zu codieren. Erforderliche, optionale oder alternative Meilensteine nur bei Nutzen ergänzen; keine Pflichtdreistufigkeit oder Trophäen.

Der aktuelle automatische Boardumfang bleibt4+1 / 5 aus 02. Freiere Aufträge und Überschneidungen sind§7e, kein Auftrag zur Reaktivierung von Delivery oder formalen Privatquests.

## 6. Engine-only-Aktionen, Rest, Wait und SillyTavern – neuere Überlegung

Informationspanels und `#assign` bestehen bereits. Darüber hinaus mögliche Fastpaths für reines Boardlesen, bekannte Angebote, sichere Ruhe/Wartezeit, normale Questverwaltung und bekannte sichere Wege prüfen. Freie Sprache bleibt vollwertig; Quick Replies wären nur optionale Bedienoberfläche. [Board-/Handelsfachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md).

Keine Vollregeneration oder Teleportation aus Komfortgründen. Mischturns und gefährliche Reisen brauchen ihre Weltverarbeitung. Zusätzliche Buttons sparen keine Wartezeit, wenn die Extraktionsbarriere weiterhin blockiert. Alte Tabellen mit Codebasis.26 sind [historische Momentaufnahmen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#6-engine-only-aktionen-rest-wait-und-sillytavern--neuere-überlegung), keine aktuelle Bestandsaufnahme.

### 6a. Zufallsereignis beim Rasten – ausdrückliches aktuelles Nutzerfeedback

**Offene Idee:** Stundenlanges Rasten in gefährlichen Dungeons soll nicht selbstverständlich risikolos sein. Der bestehende Reisewurf ist keine allgemeine Rastgefahrenengine.

Prüfmodell: Risiko nach Spielzeit statt Versuchsanzahl, etwa `p = 1 − exp(−λ·t)`, damit Aufteilen keine Vorteile gibt. Gefahr kann bei ereignisloser Zeit steigen, bleibt unter100%; sichere Orteλ=0, Vorsicht und Ruhefenster berücksichtigen. Replaystabiles Unterbrechungsdatum bestimmen, Zeit/Regeneration nur bis dahin buchen; Ereignisse aus echter lokaler Belegung, nicht nur Kampf. ROAD AHEAD könnte dasselbe Prinzip nutzen. Kein aktueller Implementierungsauftrag; [Analyse§4.1](recherche/AI_RPG_RECHERCHE_20261028.md#41-gefahr-bei-rast-warten-und-reise-nutzerfeedback-6a).

## 7. Spätere technische Möglichkeiten – keine Freigabe

- **Performance:** vorhandene Rollenmessungen, Reasoningbudgets, Cache, Repairquote, Promptwachstum, Fold/Save/Reload und Zeit je tatsächlich ausgeführter Handlung messen. Alte V3-Cachewerte nicht als aktuelle Aussage verwenden. Weniger Tokens/Aufrufe nur mit geprüfter Ergebnisqualität und Authority.
- **Scaling:** F-Testwerte sind bereits teilweise implementiert, endgültige F-/E-Wirtschaft und Anschluss offen. [Balancebeobachtungen](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md), [Sol](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [GPT](testrun_10b/scaling_gpt.md). Kein erneutes blindes Umsetzen alter Vorschlagszahlen.
- **Reise/Suche/Chase und UI:** konkrete verbleibende Reibung zuerst belegen, keine globale neue Simulationsarchitektur.

### 7a. Externe AI-RPG-Recherche (28.10.2026) – konsolidiertes Ergebnis, **keine Freigabe**

**Maßgebliche Analyse mit Quellenkritik und Messwerten:** [AI_RPG_RECHERCHE_20261028.md](recherche/AI_RPG_RECHERCHE_20261028.md). Hier nur die Kandidaten, keine zweite Kopie der Recherche:

| Kandidat | Begrenzung |
|---|---|
| Rast-/Reisegefahr | §6a; echte Belegung, anteilige Zeit/Regeneration. |
| Wenige NPC-/Fraktionsuhren | Absichten, kein Drehbuch; kleine überprüfbare Folgen statt XP/Geld/Kampf aus einer Uhr. |
| Wissensverbreitung | Bestehende Quellen/Gerüchte nutzen, zeitliche Verzögerung, Geheimnisse schützen; kein globales Allwissen. |
| Episodenverdichtung / Story Sifting | Erst Abruflücke messen; Hinweise aus Events, keine neu gebuchten Fakten, Quellen bei Swipe/Edit beachten. |
| Skill-Weltoperationen / Begleiter | Vorhandene Effekte nutzen; kein kostenloses Zusatzaktionsbudget, Balance erst mit Main/Minor. |
| Spielgefühl messen | Wiederbegegnungen, Vielfalt, Wiederholung und „unsichtbare Wände“ neben Laufzeit betrachten. |

Externe Projekte sind Ideengeber mit unterschiedlicher Evidenz, keine getestete Ersatzarchitektur. OurDream-Zuordnungen teils unbelegt; verlässlich nur konkrete Originalszenen. Keine Pflicht-Vektordatenbank, parallele ST-Memory oder dauerlaufenden LLM-Agenten. Reihenfolge/Freigabe nach03, nicht aus dieser Kandidatentabelle ableiten.

### 7b. Vertiefende externe Recherche A – Monsterökologie und Creature-Design (28.10.2026)

Recherche abgeschlossen, **keine Umsetzung freigegeben**: [Analyse samt Gegenreview](recherche/MONSTERDESIGN_ANALYSE_20261028.md), historische Codebasis.109. Freie Arten auf heterogenen Kampfankern statt vollständigem Bestiarium bleiben sinnvoll.

Spätere Pakete: anatomisch glaubwürdige Beute/Ausrüstung; Sapienz und kausale Lage/Population; schließlich tatsächlich ausführbare Signaturen, Resistenzen, Flug/Bossphasen mit Gegenmaßnahmen. Rollen-Loadouts sind eine Option, kein Beschluss. Besitz, tatsächlicher Kampfangriff und Loot getrennt halten, kein pauschaler Art→Anker-Lock. Körperteilbeute verleiht keinen Kampfeffekt. Alte Lücken vor Arbeit erneut am Code prüfen; acht offene Entscheidungen und Details in der Fachanalyse, nicht hier duplizieren.

### 7c. Geplante Langzeitoptimierung: Gegner-Lebenszyklus, kompakte Tatenbuch-Zählung und Dungeon-Bossnachweise (28.10.2026)

**Spätere Machbarkeitsprüfung, keine Lösch-/Migrationsfreigabe.** Gewöhnliche abgeschlossene Gegner könnten langfristig durch kompakte, belegte Ergebnisse ersetzt werden; stabile Handles im laufenden Kampf bleiben Pflicht. Zuerst Entity-/Eventwachstum, Promptanteile und Fold-/Savezeiten messen.

Unbedingt bewahren:

- Individuelle benannte Bosse/Guardians mit Dungeon, Etage, Slot, Zyklus, Ergebnis und persönlichem/fremdem Credit; keine falschen Klassenfeats aus bloßen Killzahlen.
- Lebende Flüchtige, mögliche Wiederbegegnungen, aktive Kämpfe, offene Loot-/Questnachweise und wichtige NPCs.
- `guild.defeatTally` mit Annahmezeit, Art/Population/Ort und persönlichem Erfolg; ein globales „wolves10“ reicht nicht.
- `living.resolved/byPc`, Slot-/Clearstatus und Resetzyklen. Eine fehlende Entity wird derzeit teils als erledigt behandelt: nichts vor dauerhafter Ergebnisbuchung entfernen.
- Einmaliges Loot und Event-Replay/Swipe/Retcon. Löschen aus `state.entities` verkürzt nicht die ursprüngliche ST-Eventhistorie; Checkpoints wären eine eigene größere Entscheidung.

Spätere Prüfung: Entity-Verbraucher inventarisieren, sicheren Abschlusszeitpunkt und kleinste Ergebnisstruktur bestimmen, dann Legacy-/Quest-/Boss-/Mehrzyklus-/Reloadfälle abnehmen. [Technische Einzelbelege der Vorfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#7c-geplante-langzeitoptimierung-gegner-lebenszyklus-kompakte-tatenbuch-zählung-und-dungeon-bossnachweise-28102026). Keine neuen Kampf-/XP-/Spawnregeln als Nebenfolge.

### 7d. Flächenfähigkeiten über Reichweitenbänder und spätere räumliche Verfeinerung (29.10.2026)

**Band-AoE ist in .116 implementiert**, gültige Regeln in [02§5](02_DESIGN_KANON.md#5-kampf-und-progression), [Produktcommit41a17fc](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/41a17fc). Nicht nochmals als Featureauftrag behandeln.

Später könnten einzelne Skills ausdrücklich mehrere Bänder zugleich treffen. Ob ENGAGED dazugehört, entscheidet der Skill. 360Grad/Sektoren/echte Cluster erst bei belegtem Gameplay-Nutzen und vertretbarem Aufwand; keine Voraussetzung für die heutige AoE und keine automatische Ausweitung.

### 7e. Spätere Questfreiheit und überlappende Jagdaufträge (30.10.2026)

**Nutzerwunsch für eine spätere stabile Phase, keine aktuelle Freigabe.** Vorläufiger Schutz aus [.120/ca7a78f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f) soll langfristig zusammenhängende Anliegen nicht ausschließen.

- Allgemeine Wolfs-Cull und konkret identifizierter Rudelalpha können getrennte Ziele sein; andere Titel allein schaffen keine andere Population.
- Bei echten Überschneidungen möglicherweise jeden individuellen Kill dauerhaft höchstens einem Jagdvertrag zuordnen: spezifisches Ziel zuerst, danach nachvollziehbare Reihenfolge. Abbruch/Abschluss/Replay dürfen alte Kills nicht neu verteilen. Umfang/Migration erst prüfen, keine solche Verbrauchsbuchhaltung beschlossen.
- Dungeon-Clearance als Gesamterfolg gesondert entscheiden. Kein doppelter Vertragspayout und kein Erfolg aus bloßer Prosa.
- Vorhandene Quest-/Delivery-/Escortmechanik bevorzugen. Keine automatische Reaktivierung neuer Lieferangebote, kein universelles Questframework und keine formalen Privatquests. Ausbau erst nach stabilen natürlichen Vergleichsläufen und eigenem Auftrag.

## 8. Pflege

Nur neue oder bewusst zurückgestellte Ideen mit Status und Quelle ergänzen. Ausführliche Varianten in der Fachquelle, abgeschlossene Implementierungen im Fachindex06, laufende Priorität ausschließlich in 03. Keine zweite Patch- oder Abnahmeliste.
