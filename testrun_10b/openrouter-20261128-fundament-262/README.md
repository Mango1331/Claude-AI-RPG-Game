# Old Crown Catacombs mit Ossen · Vergleich .261 und .262

Je Build zwölf gleichlautende Spielereingaben in demselben zusammenhängenden Abenteuer. Die ersten elf Schritte führen von der Gilde über Einkauf und Rückkehr zur ersten Kammer. Die zwölfte Eingabe setzt den gespeicherten Spielstand fort und bezeichnet einen der beiden Gegner per kanonischer ID. Diese Hilfestellung des Runners schränkt die Aussage über freie menschliche Zielwahl ein.

| Produkt | Gilde bis Dungeon | Kampf aus demselben gespeicherten Abenteuer |
|---|---|---|
| [.261](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4b637c981459e1e5ff9f4bd480bc071723fe5bce) | [Base](Base/SOURCE_MANIFEST.json) | [BaseFight](BaseFight/SOURCE_MANIFEST.json) |
| [.262](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/489b2cdab0ae491a3d0fed2a9ca4981736cac022) | [Candidate](Candidate/SOURCE_MANIFEST.json) | [CandidateFight](CandidateFight/SOURCE_MANIFEST.json) |

Die Startprofile stimmen für die ersten 15 Nachrichten aus AI und ihren gefalteten Zustand überein. Die beiden Fortsetzungen prüfen ihren jeweils eigenen Endstand. Jeder Ordner enthält Startchat, Schlusschat, Aktionen, Events, Start- und Endwelt nach Speicherung, HUD, Laufprofil, ST-Log, Requestjournal und physische Antworten. Die Archivdateien lassen sich per gzip öffnen. Die SHA-256-Werte im Manifest beziehen sich auf die komprimierten Bytes. Lokale Verzeichnisse im ST-Log wurden ersetzt. Im Requestjournal stehen die übergebenen Modellparameter und Nachrichten.

**Reproduktion:** python evaluate.py verifiziert alle vier Manifeste und berechnet Kosten, Tokens und Browserzeiten. Alle 61 physischen Anfragen wurden einzeln abgerechnet. [Messwerte](comparison.jsonl) · [Fachbericht und Interpretation](../../recherche/AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md)
