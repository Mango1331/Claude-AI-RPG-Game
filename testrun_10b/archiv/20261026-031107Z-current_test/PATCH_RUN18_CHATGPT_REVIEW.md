# Unabhängiger Gegenreview – Build .94, Dungeon-Erstkontakt (Run 18)

**Produkt:** Build `4.3.0-c.6.6.94`, [Commit `21f3822a468c6d78d0bfc9feed4840eb8b276fbd`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/21f3822a468c6d78d0bfc9feed4840eb8b276fbd). Basis `.93` + Runner-Umstellung `f51336c`.  
**Ursprung:** [Run-.93-Review](REVIEW.md), [verifiziertes Original-ZIP](20261026-031107Z-current_test.zip), SHA-256 `96966a0e853e6ca618998834f78e315ecb504fc3e0ea6efa2213935aa5898203`, 9.687.546 Bytes, Git-Blob `5716a69fd4d778dc39cad5e60e7ec136f6fe35da` (lokale SHA und Git-Blob erneut berechnet und mit `main` verglichen).  
**Prüfgrundlage:** Commit-Diff und aktueller Code in `world.js`, `engine.js:materialise`, `living.js:establishEvents/levelSpan/floorAt/slotForNew`, `dungeon.js:rankAt`, acht neue Tests `patch_run18_entry.test.js`, Patchnote `PATCH_RUN18_DUNGEON_ENTRY.md`, Runner-Prompt und Stand auf `main`. **Statische, unabhängige Code-/Testfallprüfung; keine eigene Ausführung der Node-/SillyTavern-Tests und kein natürlicher GLM-Lauf. Produktcode unangetastet.**

## Entscheidung

**Keine anhand des geprüften Diffs belegte neue P1-Regression. Build .94 ist technisch plausibel für den nächsten natürlichen Level-15-GLM-Lauf vorbereitet.** Der ursächliche Dungeon-First-Contact-Fehler ist enger korrigiert als eine Balanceanpassung; alte Saves/Profile behalten bewusst ihren bisherigen Zustand. Die dynamische Eignung ist erst im natürlichen Lauf bestätigt.

## 1. Ursprungsfehler T57/T58

Der .93-Lauf betrat `loc.old_crown_catacombs` als Dungeon-Wurzel (Floor 0), nachdem eine frühere Passage korrekt verweigert worden war. Der frei gemeldete `creature.new`-Skeleton wurde unmittelbar bei Eintritt materialisiert, **vor** `dungeon.established`: Level 28 / E, 192 HP, ATK 69 aus der Dungeon-Gesamtrangspanne F–E. Erst danach definierte die Living-Population Floor 1 als F-Rang. Der Spieler sah lediglich die 192 HP; Level und ATK waren nicht sichtbar. Der spätere Kampf gegen das bestehende Profil rechnete regelkonform, die Profil-/Begegnungsentstehung war es nicht.

### Korrektur im Code

- `src/v4/world.js:newEntity`: Bei einem `creature.new` unter V4-C/Ruleset 2 prüft die Engine den **tatsächlich erreichten** `trueDungeonOf(s, s.scene.at)` und emittiert, wenn nötig, `establishEvents` als Engine-Schritt, **bevor** `slotForNew` bzw. die freie Kreaturenprüfung läuft.
- Die bisherige Ausnahme `livingBefore.has(root)` bleibt **nur für Ruleset 1** relevant. In Ruleset 2 werden ungebundene Kreaturen der Dungeon-eigenen Arten auch beim erstmaligen Eintritt am Root gegen die Living-Population geprüft und, falls kein zulässiger Slot existiert, **vor `entity.created`, `scene.entered` und `entity.updated.profile` abgewiesen**.
- Der Eingang ist weiterhin `floorAt(root) === 0`. `slotForNew` nimmt **keine Floor-1-Slots am Root**; die F-Erststockpopulation wird nicht rückwirkend als Eingangsbegegnung behauptet.
- Zusätzlicher Schutz: `src/v4/living.js:levelSpan(s,root)` nutzt nach etablierter Population bewusst das erste Ebenenfenster als Größenordnung für am Root weiterhin erlaubte **andere** Kreaturen (z. B. nicht zur Dungeonpopulation gehörende Wildtiere), statt `rankAt(root)` mit F–E über die gesamte Range 1–29 auszuwürfeln. Das ist anhand `materialise()` und `levelSpan()` nachvollziehbar, auch wenn der entsprechende Tier-Test den konkreten Tierlevel nicht explizit behauptet.
- `syncEvents` und Passage-/Präsenz-Guards bleiben in ihren regulären Rollen; eine zuvor nicht gebuchte Ankunft wird nicht künstlich herbeigeführt.

**Bewertung:** Der Mechanismus trifft genau den Fehlereintritt und verschiebt nicht pauschal das Weltlevel nach dem PC-Level. Kritische Reihenfolge wird als Event-Folge getestet.

## 2. Acht neue Regressionen und Gegenproben

Neue `tests/v4/patch_run18_entry.test.js` nutzt die originale T56/T57-World-Übergangskette und Originalantworten in `fixtures/run18_entry.json`. Die Tests decken ab:

1. Abgelehnte T56-Passage bleibt abgelehnt; T57 Root-Ankunft bleibt erhalten, **kein freies Skelett**.
2. `dungeon.established` wird genau **einmal vor `dungeon_foe`-Ablehnung** gebucht; keine erdachte `dungeon.slot`-Zuordnung.
3. Mehrere bzw. entfernte ungebundene Dungeon-Gegner werden ebenfalls nicht eingeführt.
4. Gewöhnliche, nicht klassifizierte Ruine lässt weiterhin echte freie Kreaturen zu.
5. Nicht feindliche Dungeon-Szeneriekreatur oder andersartige lokale Fauna am Eingang bleiben erlaubt.
6. Kanonische Slots auf tatsächlich bestehenden F- bzw. E-Räumen materialisieren mit korrekten Levelspannen und wiederverwendbarer Identität.
7. Replay und JSON-Reload reproduzieren dieselben Events; Änderung des Story-Swipes entwertet den alten Ankunftsrecord.
8. Historische .93-Profile einschließlich Level 28 bleiben in gespeicherten Kampagnen erhalten, ohne rückwirkende Umskalierung.

**Abnahme lt. Implementierer und Patchnote:** Auf unveränderter .93 drei rot/fünf grün, auf .94 **8/8 grün**; angrenzend **100/100**, gesamte Node-Suite **1831/1831**. Erste Suite deckte zwei Rule-1-Regressionen auf, woraufhin die historische Ausnahme für Ruleset 1 erhalten wurde; alte Tests nicht zurechtgebogen. Abschließender ST-1.19-Mock-Smoke **21/21** mit fünf Extractor-Aufrufen, ohne PageErrors, vier aktuelle Story-Replies je einmalig gespeichert. **Diese Zahlen stammen aus dem verifizierten Implementierungsbericht, nicht aus eigenständig erneut ausgeführten Tests.**

### Verbleibende Gültigkeitsgrenzen

Der neue Kontrollpunkt läuft vor `creature.new`, sofern der True Dungeon **zu diesem Zeitpunkt bereits kanonisch klassifiziert und erreicht** ist. Ein in derselben Antwort erst **nach** einer Kreatur neu klassifizierter Dungeon ist damit nicht unabhängig abgenommen; daraus folgt ohne konkreten Replay aber **kein nachgewiesener .94-Fehler**. Die vorhandene Story-/World-Reihenfolge darf für diesen hypothetischen Fall nicht leichtfertig umsortiert werden.

Der Eingang ist **nicht automatisch Floor 1**. Der Test einer am Eingang erlaubten artfremden Kreatur behauptet keine exakte Levelspanne; der Codepfad mit bereits aufgebauter Population lässt die Floor-1-Minionspanne erkennen. Bei zukünftigen natürlichen Erstkontakten kann zusätzlich beobachtet werden, ob erlaubte Wildtiere am Eingang plausibel bleiben. Das rechtfertigt jetzt **keine** zusätzliche Architekturänderung.

Ein als altes .93-Ereignis bereits gespeichertes Level-28-Skelett bleibt unverändert; die Korrektur schützt **neue** Ereignisse. Ein Test ab neu gestarteter Kampagne ist daher sachgerecht.

## 3. Runner: keine weitere Ausdehnung

`tools/st_live/live/players.mjs:PLAYER_MECHANICS` ergänzt exakt die zwei vorher vereinbarten Klarstellungen:

- Nach Beseitigen einer fehlenden Voraussetzung eine zuvor abgelehnte Folgehandlung **ausdrücklich erneut durchführen**; Registrierung bedeutet nicht automatisch Quest-Annahme, vor der Auftragsreise `ACTIVE` prüfen.
- **Allowed / pending / conditional / announced** ist nicht **completed**; bei widersprüchlicher Reiseprosa zählt der bestätigte tatsächliche Ort.

Entscheidungsfreiheit, bestehende JSON-Erinnerung, Level-15-Ziel, 100-Zug-Vergleichspunkt und Limits bleiben unverändert. Die bestehende Runner-Prompt-Regression sucht beide Texte. Laut Patchnote kein separater kompletter Runner-Selbsttest wegen dieser reinen Textänderungen; kein Anlass für eine zusätzliche größere Runner-Patchrunde, solange die natürliche Anwendung noch nicht beobachtet wurde.

Die 42 JSON-Reparaturen des alten Runs stammen vom **Guide vor** dem Runner-Commit `f51336c`; deren Ausbleiben ist mit .94 nicht bewiesen. Erst ein echter GLM-Lauf mit dem neuen Prompt erlaubt den Vergleich. **Keinen voreiligen Plain-Text-Fallback, keinen Eingaben-Umschreiber und keine weiteren Sonderformulierungen einbauen.**

## 4. Nächster Schritt

**Neuen natürlichen Level-15-Lauf mit .94 und aktuellem `current_test` starten.** Nicht nur Tod/Sieg, sondern tatsächliche Levelstufen, XP/Kampf, Ausrüstungskauf→Equip, Geld, HP/MP, Questzyklen, echte Dungeon-Erstkontakte und den JSON-Reparaturanteil gegenüber dem vorigen Run vergleichen. Das bestehende Board-/Handelsthema bleibt unabhängig. Keine Stat-/XP-Buffs aus dem alten Level-28-Tod ableiten.

**Keine Produkt- oder Guide-Implementierung durch diesen Review.**
