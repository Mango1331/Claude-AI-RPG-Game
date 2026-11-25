# Avereth Engine – aktueller Projektstand

**25. November 2026 · Entwicklungskandidat `.213`, persönlicher Usertest 13 archiviert.** GPT-Review abgeschlossen, unabhängiger Codex-Gegenreview beauftragt und zum Zeitpunkt dieses Snapshots noch ausstehend. Keine Freigabe für ein neues Patchpaket oder Produktmerge.

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`a89c690d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a89c690dbe0037f1c4d19a8d762e5b0fed207eab) · Build `4.3.0-c.6.6.213` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die separate Dokumentations- und Originalarchivlinie. Diese Tabelle ist ein Snapshot, keine Garantie für spätere HEADs. Vor neuer Arbeit aktuelle Remote-Refs prüfen.

## Letzte abgeschlossene Entwicklungsarbeit

- [User12 und .212-Fach-/Offline-Abnahme](recherche/AVERETH_212_FACH_UND_ABNAHME.md): Revisionsbindung, NPC-Sidestep, Runner-Sicherheit, Handel, lokale Reise, PULSE, Board, native Aktionen und HUD. Wiederimplementierung nach Cloud-Ausfall, gesichert auf `7cf33bc0`. 3.589/3.589 Node-Prüfungen, 2.235 historische Replays ohne neue ungeklärte Abweichung, 122/122 archivierte Weltstufen und isolierte ST-Abnahmen laut Implementiererbericht.
- [.213-Kontrollreview](recherche/AVERETH_213_GPT_KONTROLLREVIEW.md): zusätzliche Finanzkorrekturen auf `e7a36e2f`; R1 bestätigt behoben, eine konkrete R2-Variante bleibt bewusst zurückgestellt. `a89c690d` erhöht nur die Versionsnummer. Keine erneute vollständige .213-Abnahme behauptet. Nutzer entschied GO für persönlichen Test statt weiterer Minifix-Runde.
- **Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout; Character Card/Description, Narrator-Preset, Lorebook, Regex und ST-Einstellungen unverändert. Narrator Contract bleibt `.211`. Der Runner ist für persönliches Spiel nicht erforderlich.

## Aktuelle Entscheidung: User13

[Runordner, GPT-Review und Originalquellen](testrun_10b/user-20261125-212154-213/README.md) · [Spielerfeedback und offene Designidee](testrun_10b/user-20261125-212154-213/USER_FEEDBACK_REVIEW.md).

Die kurze .213-Kampagne bestätigt im konkreten Kampf unterschiedliche Banditenlevel und das Ende der wiederholten Sidestep-Schleife; erstes Board mit fünf gültigen Aufträgen. Sie endet bei der nicht mechanisch unterstützten Kapitulation/Verhandlung. Kein Grund zur pauschalen Abschwächung der Gegner. Surrender als Hauptaktion für verhandlungsfähige intelligente NPCs, frei wählbare Gegenleistungen und mögliche Ablehnung sind gewünschte Spieloptionen; Entscheidung über die technische Ausgestaltung folgt nach dem Gegenreview. Ein zusätzlicher Würfelwurf ist **nur offene Idee**, keine beschlossene Regel. Handel, längere Progression, Dungeon und Rast wurden in User13 nicht erreicht.

**Nächster Schritt:** Codex-Gegenreview im User13-Ordner lesen und gegen Code/Originale abgleichen. Danach gemeinsam entscheiden, ob ein zusammenhängendes Surrender-/Combat-Negotiation-Paket erforderlich ist oder welche weitere natürliche Evidenz benötigt wird. Kein automatischer .214-Auftrag und kein Patch vor Entscheidung.

**Arbeitsaufteilung:** Codex übernimmt beauftragte Analysen, Implementierungen, Abnahmen und Gegenreviews; GPT bleibt unabhängiger Fach-, Code- und Run-Reviewer. Keine weiteren Claude-Aufträge. Historische Fachquellen bleiben gültig als Belege ihrer jeweiligen Etappe.

## Einstieg und Fachquellen

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Forschung](recherche/README.md) · [Originalarchive](testrun_10b/README.md) · [Verbindlicher Produkt-Kanon .200](02_DESIGN_KANON.md).
