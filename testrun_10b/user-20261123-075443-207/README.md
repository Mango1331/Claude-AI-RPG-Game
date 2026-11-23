# User10 – abgebrochener zweiter persönlicher .207-Spieltest

**23.11.2026 · `.207` / `experiment/207-trade-hud` / `609380b3`.** Neuer Mage Alaric in Ashbridge, 6 Spieleraktionen einschließlich Charaktererstellung und 4 Erzählzüge. Registrierung erfolgreich, erstes Boardlesen gescheitert. Der Run endet ohne weitere Erkundung oder Handel.

[Fehleranalyse & unabhängiger GPT-Erstreview](REVIEW.md) · [Messpunkte und API-Aufrufe](MESSWERTE_USER10_207.json) · [Originalquellenmanifest](SOURCE_MANIFEST.md).

**Kernbefund:** Erstentwurf: vier gültige von fünf Quests; der einzige fehlerhafte Level-1-Millpond-Snapper-Auftrag hatte Habitatlevel 4–7 und den falschen Bodyplananker `aquatic`. Das LLM reparierte nur die Levelspanne zu 1–3. Die lokale Ankerkorrektur aus `.206` wird im zweiten Versuch nicht aufgerufen. Daher `board.failed` nach 105,618 Sekunden und zwei physischen Boardaufrufen; **keine** offiziellen Quests gebucht. Das Gildenprimer-Angebot bleibt separat gültig.

**Originaldateien sind derzeit nur als Chat-Uploads verfügbar, nicht als GitHub-Blobs archiviert.** Der Run ist ein diagnostischer Abbruch und kein repräsentativer Full-Run oder A/B-Vergleich. Keine Code- oder Presetänderung.

[Index](../README.md) · [Durchschnittsmessungen](../durchschnittsmessungen/README.md)
