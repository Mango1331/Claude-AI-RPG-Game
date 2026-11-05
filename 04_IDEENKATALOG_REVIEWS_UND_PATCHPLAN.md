# Avereth Engine – Ideenarchiv und offene Kandidaten

**Stand: 05.11.2026 · nicht priorisiert, keine Freigabe und kein zweiter Produktstatus.** [Aktueller Stand 03](03_AKTUELLER_PROJEKTSTAND.md) · [Reihenfolge/Abhängigkeiten 07](07_ROADMAP_NACH_10B_ENTWURF.md) · [verbindlicher Kanon 02](02_DESIGN_KANON.md).

Die früheren umfangreichen Entwürfe bleiben über [die letzte vollständige Suchfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), [33-Themen-Archiv](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md) und [141-Punkte-Sammlung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) erreichbar. Erledigte S1-/UI-Arbeit wird hier nicht erneut als Kandidat geführt; Quellen in [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Spieltempo, Bedienung und Spielerfeedback

- **UI/Quick Replies:** weniger doppelte Contract Details; später editierbare Formulierungsvorschläge für Questannahme/Shopinteraktion. Kein Autosenden, keine stille Buchung, keine neue Pflichtmenüführung. [User02-Feedback](testrun_10b/user-20261105-050449/USER_FEEDBACK_REVIEW.md).
- **Explorationsbeute:** interessante orts-/risikogebundene Funde außerhalb von Leichen; eventuell besondere Elite-/Minibossbeute oder seltene Stones. Fundchance, Wert, Rangverteilung und Garantien offen. Bereits vorhandene Bodenobjekte anzeigen, zulässige Raumsuche ausführen und neue Beute generieren sind getrennte Themen.
- **Engine-only-Komfort:** bekannte Boards/Offerten, sichere Rest-/Wait-/Reiseansichten und Quick Replies vereinfachen, ohne gültige Weltaktionen zu verlieren. [Fachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md).
- **Weitere Stealth-Handlungen:** lokale Search/TAKE nach [S2-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md); andere Aktionen nur bei Bedarf. Kein freier Angriff, Diebstahlrecht oder dauerhafter Schleichmodus.
- **Performance:** reale Rollenlatenz, Prompt/Cache, Repairs, Fold/Reload und Kosten je nutzbarer Handlung messen. Keine pauschale Token-/Kostenersparnis oder Modellarchitektur versprechen. [Recherche](recherche/AI_RPG_RECHERCHE_20261028.md).

## Handel – Engine-Shop als eigener offener Alternativentwurf

[Engine-Shop-Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md): Ladenidentität, kleiner Katalog, verbindliche Preise und Lootankauf als **separat zu entscheidende alternative Handelsarchitektur**. Kein Notfallback, der ungültige Extraktionen durchbucht; keine zweite Preisautorität oder unberechtigte Fernbestellung. Bestehendes Endpreis-/Zustimmungsdesign bleibt verbindlich. Gasthausfrust und falsche Narrator-Summen rechtfertigen allein keinen allgemeinen Finanzparser- oder Shopumbau.

## NPCs und lebendige Welt

Die aktuelle NPC-Etappenfolge steht ausschließlich in [07 §2](07_ROADMAP_NACH_10B_ENTWURF.md#2-npc-kontinuität--neue-fachliche-reihenfolge), Ursachen in der [Brenna-Analyse](recherche/NPC_KONTINUITAET_ANALYSE_20261104.md) und [User02 §8](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md#8-abgeschlossener-sol-gegenreview--originalfold-requests-und-ursachenprüfung). Zuerst vorhandene Informationen zuverlässig persistieren/liefern, keine zweite Dossierbank.

Später offen: belegte Persönlichkeit, wichtige gemeinsame Episoden, Absprachen, nachvollziehbare Beziehungen und Salienz. `#npc <name>` existiert als Infoansicht; Pinning wäre neu. Keine automatische Romantik/Sympathie und keine geheimen Erzählerkarten im Spielerpanel.

**PULSEs nachrichtenbasiertes gemeinsames Gate ist beschlossen**, Frequenz/Umsetzung bleiben offen; ROAD AHEAD ist dessen Reiseanbindung. Später eigene Agenden, Story-Hinweise, Gerüchte und Fraktionsuhren, ohne Agent pro NPC. Gefährliche Rast/Wartezeit ist eine eigene Frage: Unterbrechung vor voller Zeit/Regeneration, sichere Unterkünfte risikofrei, kein Umgehen durch gesplittete Rasten. [Weltrecherche](recherche/AI_RPG_RECHERCHE_20261028.md).

## Kampf, Quests und Progression

- **Aggression/Encounterstart:** User02 erlebt AWARE-Gegner als zu passiv. Verhalten und First-Strike-Nutzen fachlich untersuchen; Wahrnehmung allein ist kein Angriffswille. Keine automatische Streichung der bestehenden Eröffnungsregel.
- **Kampf-/Monstertiefe:** Main/Minor-Fachplan, plausible Körper/Loadouts/Beute, Sapienz, ausführbare Signaturen, Resistenzen/Bossphasen und bei Bedarf mehrbandige Geometrie. [Main/Minor](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md), [Monsteranalyse](recherche/MONSTERDESIGN_ANALYSE_20261028.md).
- **Flucht/Chase:** vorhandene Mechanik zuerst natürlich prüfen; kein neues Chase-System aus den historischen C1–C3-Optionen. [Fachquelle](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md).
- **Progression:** F→E/Wirtschaft/Gear/LP/PP und spätere Ränge anhand repräsentativer Spieleindrücke. User01 meldet ausreichend XP; keine pauschale Anhebung oder Farmstrafe. [F-/E-Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md).
- **Quest-/Abenteuervielfalt:** höhere prüfbare Gildenziele, ruhende Delivery/Escort gezielt reaktivieren, überlappende Jagden nur ohne Doppelcredit, mehr Living-Dungeon-Variation. Keine formalen Privatquests aus jeder Hilfe.
- **World-Skills/Summons:** vorhandene Effekt-/Aktionshoheit erweitern, keine freien Erzählboni oder kostenlosen Kampfgruppen. **History-Kompression** nur bei gemessenem Wachstum; Loot, Flüchtige, Bossslots, Questcredit und Replay erhalten.

**Pflege:** Neue Wünsche hier kurz mit Quelle erfassen, Priorität in 07, verbindliche Entscheidung in 02, tatsächliche Umsetzung/Abnahme in 03. Historische Details nur über feste Verweise; dieser Index erteilt keine Produktfreigabe.
