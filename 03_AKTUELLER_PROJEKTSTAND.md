# Avereth Engine – aktueller Projektstand

**Entwicklungskandidat .214 ist für den unabhängigen GPT-Diffreview vorbereitet.** Die Kapitulation mit Gegenforderung, Übergabe und anschließender Fortsetzung wurde auf der User13-Vorgeschichte offline und in SillyTavern 1.19.0 abgenommen. Die Produktfreigabe steht aus. [Fachbericht und Abnahme](recherche/AVERETH_214_SURRENDER_COMBAT_NEGOTIATION.md)

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`c2aa5737`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2aa5737625f2f0ac0d4db1f5ee794202fd741c2) · Build `4.3.0-c.6.6.214` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die separate Dokumentations- und Originalarchivlinie. Diese Tabelle ist ein Snapshot, keine Garantie für spätere HEADs. Vor neuer Arbeit aktuelle Remote-Refs prüfen.

## Letzte abgeschlossene Entwicklungsarbeit

- [User12 und .212-Fach-/Offline-Abnahme](recherche/AVERETH_212_FACH_UND_ABNAHME.md): Revisionsbindung, NPC-Sidestep, Runner-Sicherheit, Handel, lokale Reise, PULSE, Board, native Aktionen und HUD. Wiederimplementierung nach Cloud-Ausfall, gesichert auf `7cf33bc0`. 3.589/3.589 Node-Prüfungen, 2.235 historische Replays ohne neue ungeklärte Abweichung, 122/122 archivierte Weltstufen und isolierte ST-Abnahmen laut Implementiererbericht.
- [.213-Kontrollreview](recherche/AVERETH_213_GPT_KONTROLLREVIEW.md): zusätzliche Finanzkorrekturen auf `e7a36e2f`; R1 bestätigt behoben, eine konkrete R2-Variante bleibt bewusst zurückgestellt. `a89c690d` erhöht nur die Versionsnummer. Keine erneute vollständige .213-Abnahme behauptet. Nutzer entschied GO für persönlichen Test statt weiterer Minifix-Runde.
- **Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout; Character Card/Description, Narrator-Preset, Lorebook, Regex und ST-Einstellungen unverändert. Narrator Contract bleibt `.211`. Der Runner ist für persönliches Spiel nicht erforderlich.

## Aktuelle Entscheidung nach User13

Der bestätigte Gegenreview bildete die Grundlage der Implementierungsfreigabe für .214. Die zwei ursprünglichen Spielertexte schließen eine eindeutig vereinbarte Zahlung mit Stababgabe ab. Ein Gegenangebot, das ausdrücklich auch den Beutel verlangt, erfordert eine entsprechend eindeutige Autorisierung. 3.591 Node-Prüfungen und 2.235 historische Replayvergleiche bestanden. [User13-Gegenreview](testrun_10b/user-20261125-212154-213/CODEX_GEGENREVIEW.md) · [.214-Fachbericht und Reviewdiff](recherche/AVERETH_214_SURRENDER_COMBAT_NEGOTIATION.md)

Der nächste Schritt ist der unabhängige GPT-Diffreview. Ob das natürliche Verhandeln einen weiteren Wurf braucht, bleibt eine spätere Spieltestfrage.

**Arbeitsaufteilung:** Codex übernimmt beauftragte Analysen, Implementierungen, Abnahmen und Gegenreviews; GPT bleibt unabhängiger Fach-, Code- und Run-Reviewer. Keine weiteren Claude-Aufträge. Historische Fachquellen bleiben gültig als Belege ihrer jeweiligen Etappe.

## Einstieg und Fachquellen

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Forschung](recherche/README.md) · [Originalarchive](testrun_10b/README.md) · [Verbindlicher Produkt-Kanon .200](02_DESIGN_KANON.md).
