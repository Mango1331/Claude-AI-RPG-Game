# Avereth Engine – unpriorisierter Ideenspeicher

**Stand 17.11.2026.** Hier stehen **nur offene, nicht bereits als umsetzungsreifer Fachplan priorisierte Ideen**. Keine zweite Roadmap. [Prioritäten 07](07_ROADMAP_NACH_10B_ENTWURF.md) · [aktueller Stand 03](03_AKTUELLER_PROJEKTSTAND.md) · [Fachquellen 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Neu: Vereinfachungen der bestehenden `.200` – zur Analyse, nicht beschlossen

Die folgenden **vom Nutzer angeregten Ideen** werden unter [Zielbild 08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) mit Astra und unabhängigem Gegenreview untersucht. Nicht als implementierte Fähigkeiten oder Roadmapfreigabe behandeln.

| Idee | Noch zu prüfen |
|---|---|
| **Skill- und Gegnerbuttons im Combat-HUD** | Bekannte IDs statt Tippfehler, optional Bewegung; freier Text an Begleiter **zusammen mit** der typisierten Kampfaktion, ohne kostenlose Zusatzmechanik |
| **Spielerentscheidung statt Reparaturrequests** | Vorschlag aus Text/Engine: „So übernehmen“, „Bearbeiten“ und ggf. „Nicht übernehmen“. Einmalige Buchung, Swipe/Regenerate/Edit und Reload sauber |
| **Tolerantere Reisen und Weltfolgen** | Plausibel erzählte Ankunft / wichtige NPC-Abrede ggf. auch ohne perfekten strukturierten Beleg übernehmen; ungewollte Spielerentscheidung nicht miterfinden |
| **Standardshops und kleine Zahlungen** | Tavernenkatalog/Grundpreise, bekannte Angebote und die bereits vorhandene `#pay`-Karte nutzerfreundlich verwenden; einfache Käufe ggf. ohne weitere Modellsuche |
| **Automatischer Weltabschluss-Status** | „Erzählung sichtbar – Abgleich läuft – ✓ gespeichert – ⚠ Fehler“; nächsten Zug bereits schreiben, aber erst nach bestätigter Persistenz ausführen |
| **Weitere vereinfachende Spieler-/HUD-Hilfen** | Astra soll zusätzliche Optionen suchen, die überstrenge Fehlerklassen reduzieren statt nur neue Sonderfixes zu produzieren |

## Noch ohne eigene Umsetzungsauswahl

| Richtung | Weiter zu klären |
|---|---|
| **Erkundung und Beute außerhalb von Kämpfen** | Wenige orts-/risikogebundene seltene Funde, Elite-/Minibossmaterial und Stones; keine automatische Verdopplung von `search`-, Dungeon- oder Kampfloot. Kampfbeute besonderer Gegner ist kein Ideenpunkt mehr: Bossloot V1 entschieden ([U1–U11](patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md)), Status in 07 |
| **Journal/Karte/Quick Replies** | Zusätzliche editierbare Hilfen jenseits der seit `.161` umgesetzten Quest-/TAKE-Entwürfe; keine Buchung oder Modellanfrage durch UI-Klick |
| **Engine-only-Komfort** | Bekannte Board-/Offertenansichten sowie sichere Rest-/Wait-/Reiseschritte, ohne neue Preisautorität oder Teleport. [Entwurf](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md) |
| **Monster und lebendige Welt** | Spätere Sapienz, situative Flucht, glaubwürdige Monsterkulturen, kleine Populationen, Fähigkeiten/Bossphasen **als getrennte Features**. [Monsterdesign](recherche/MONSTERDESIGN_ANALYSE_20261028.md) |
| **NPC-Eigenleben** | Agenden, Gerüchte, Fraktionsuhren und Salienz **erst nach belastbarer E2/E3-/PULSE-Evidenz**; keine dauerlaufenden Agenten oder zweite Dossierdatenbank |
| **Spieltempo/Performance** | Reale Prompt-/Cache-/Repair-/Rollenzeit und Kosten je ausführbarer Handlung messen, bevor ein größerer Runtime-Umbau beschlossen wird |
| **Neue Quest-/Abenteuerfamilien** | Delivery/Escort nur gezielt reaktivieren; Kill-Doppelzählung vermeiden; mehr Dungeonvielfalt ohne festes Drei-Kampf-Skript |

**Nicht hier als unerledigte Idee wiederholen:** NPC E0–E3, PULSE A/B/C, Orte/Reisen/Dungeons `.190–.192`, Stealth S1, UI U1–U3 und alle erledigten 10B-Fixes sind implementiert (Stand: [03](03_AKTUELLER_PROJEKTSTAND.md)). Main/Minor K1, Monster A1/A2, Bossloot V1, Angriff mit Annäherung, Stealth S2, Shops und die konkrete NPC-/Kontextarbeit besitzen eigene Fachpläne; ihr Status/ihre Abhängigkeiten stehen in [07](07_ROADMAP_NACH_10B_ENTWURF.md).

## Historische große Ideenkataloge

Die Detailfülle bleibt **bewusst nur historisch** erhalten: [letzte umfangreiche Ideenfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), [33-Kandidaten-Katalog](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md), [ursprüngliche 141-Punkte-Sammlung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). Kein ungeprüftes altes Brainstorming als Freigabe oder verbindlichen Kanon behandeln.

**Pflege:** Eine neue Idee kurz hier, bewusste Priorisierung in 07, verbindliche Regel nur in 02, tatsächlicher Produktstatus in 03.
