# Stat-Balancepatch .195 – fünf frei verteilbare Punkte pro Level

Basis ist Produkt-HEAD `3a4ad81889c3344b8feb802124703758f5239ac5`, der reguläre
Merge von PR #15 mit beiden Bossloot-Commits bis `b230aea`. Die Merge-Eltern sind
`e7dac41` und `b230aea`; die Commit-Historie bleibt erhalten.
Arbeitsbranch dieses Patches: `codex/stat-growth-5`.

## Neue Regel und tatsächliche Buchung

- Level-up: **5 freie Statpunkte + 0 automatische Favored-Punkte** statt 5+2.
- Charakterstart unverändert: alle sechs Stats Basis 5, bei der Basisklassenwahl
  einmalig +1 auf jedes der zwei Favored-Attribute. Warrior, Mage und Rogue
  starten also jeweils mit 32 Attributpunkten und gewinnen danach je Level 5.
- Der Spieler kann alle freien Punkte wie bisher auf beliebige gültige Stats
  verteilen; Favored-Zuordnungen und Klassenentwicklung bleiben bestehen.

`content/rules.json progression.favored_growth_per_level` ist 0. `awardXp` in
`src/progression.js` berücksichtigt diese Konfiguration und schreibt für neue
Level-ups `favored: []`. Der vorhandene generische Eventreducer benötigt keine
Änderung. Es gibt weder Migrationen noch Versions-/Altfall-Sonderpfade oder neue
Statwachstumsmechaniken für Rare+-Klassen.

Die Klassenbeschreibungen in `content/classes.json` und die zugehörigen
Progressions-/Klassen-/Systemtexte in `content/rules_text.json` erklären die
einmaligen Startboni und die fünf freien Punkte korrekt. `#class` verwendet
diese Texte bereits. Die Level-up-Anzeige nennt weiterhin korrekt +5 freie
Punkte; am Renderer ist dafür keine Änderung nötig.

XP-Beträge, Levelschwellen, Carryover, Power-Rank-Schwellen, Ressourcenrefill,
Klassenwahl/-evolution, Skill-Proficiency, Bossloot und Ausrüstung werden nicht
verändert. Die NPC-Generierung bleibt unverändert; die Regression vergleicht
die erzeugten NPC-Sheets bei gleicher Vorlage/Stufe vor und nach der Regel.

## Regressionen und Replay

`tests/v4/stat_growth195.test.js` umfasst 15 gezielte Prüfungen:

- alle drei Basisklassen: Startwerte, Level 1→2 ohne automatische Stats,
  drei Level-ups aus einer Belohnung und freie manuelle Verteilung;
- Carryover und sämtliche Power-Rank-Übergänge ohne automatische Evolution;
- unveränderte NPC-Generierung und erhaltene Favored-Zuordnungen;
- tatsächlicher `#class`-Text.

Die neuen Level-up-/Anzeigeregressionen wurden vor der Änderung rot ausgeführt.
Bestehende Regel-, HUD-, Befehls- und Progressionstests erwarten nun die
ausdrücklich beschlossene Verteilung ohne automatische Punkte. Keine
Assertion wurde deaktiviert oder als erwarteter Fehler markiert.

Historische Originaldateien und die .126-Baseline bleiben unverändert.
78 Records wurden einzeln gegen .194 verglichen. Ausschließlich die Favored-
Listen in 82 neuen `level.up`-Events wechseln von zwei Attributen zu `[]`.
Alle anderen Events/Recordfelder sind exakt gleich, einschließlich XP,
Carryover, fünf freien Punkten je Level, Kampf, RNG, Geld, Bossloot und
Klassenentwicklung. Für jeden Record dokumentiert
[STAT_GROWTH_195_REPLAY.md](STAT_GROWTH_195_REPLAY.md) die Level, Attribute,
freien Punkte und verbleibenden XP; die Freigabe liegt in
`tests/replay/accepted_stat195_vs_126.json`. Alle anderen Fingerprints wurden
unverändert übernommen. Keine pauschale Fingerprintneuberechnung.

Selbst ausgeführte Abnahme am 15.11.2026:

| Prüfung | Ergebnis |
|---|---|
| Neue gezielte Regressionen | **15/15** |
| Gezielte Regel-/Start-/Progressionssuite einschließlich der neuen Tests | **43/43** |
| Gezielte Content-/Befehls-/HUD-Suite einschließlich der neuen Tests | **35/35** |
| Vollständiges `npm test` | **3290/3290**, 0 fehlgeschlagen/übersprungen |
| Vollständiges `npm run replay:check` | **2235 Fälle**, 1131 exakt akzeptierte Abweichungen gegen .126, **0 offen, 0 veraltet** |

Die gezielten Suiten überlappen; ihre Zahlen werden nicht addiert. Gegen .194
ändern sich ausschließlich die 78 oben einzeln begründeten Records. Die
Originalereignisse falten weiterhin ohne Fold-/Validierungsfehler.
ST-Smokes, natürliche LLM-Batches und Provider-API-Läufe werden für diese Runde
gemäß Auftrag nicht ausgeführt. Zentrale Dokumentation auf `main` bleibt
unverändert. Der unabhängige Produktdiff-Review erfolgt nach der Lieferung;
der Statpatch wird mit diesem Auftrag nicht gemergt.
