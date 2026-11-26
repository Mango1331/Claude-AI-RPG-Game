# Avereth Engine – aktueller Projektstand

**.217 steht auf dem Entwicklungsbranch für den unabhängigen GPT-Diffreview bereit.** Der gemeinsame Lauf von Alaric und Ossen reicht von der Gildenhalle bis zur Abgabe mit 225/225 Quest-XP und 45/45 cp. Eine abwesende Partei kann ihren Anspruch beim Wiedersehen einlösen. Der persönliche Test folgt dem Diffreview. [Fach- und Abnahmebericht](recherche/AVERETH_217_PARTY_SYSTEM.md) · [Vergleich ab .216](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/bf44a5fbf439e8b43153f6db8b575048fc1e3e1f...d42621682d19cbd8819ca27594614e04a79ed0d1)

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`d4262168`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d42621682d19cbd8819ca27594614e04a79ed0d1) · Build `4.3.0-c.6.6.217` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die separate Dokumentations- und Originalarchivlinie. Diese Tabelle ist ein Snapshot, keine Garantie für spätere HEADs. Vor neuer Arbeit aktuelle Remote-Refs prüfen.

## Letzte abgeschlossene Entwicklungsarbeit

- .216 verarbeitete sieben belegte Extractorantworten lokal und sparte im User14-Originalzug drei Folgeanfragen mit 46.330 Inputtokens. Dieser Stand bildet die Vergleichsbasis für den Partykandidaten. [Extractor-Abnahme](recherche/AVERETH_216_EXTRACTOR_NORMALISIERUNG.md)

- [User12 und .212-Fach-/Offline-Abnahme](recherche/AVERETH_212_FACH_UND_ABNAHME.md): Revisionsbindung, NPC-Sidestep, Runner-Sicherheit, Handel, lokale Reise, PULSE, Board, native Aktionen und HUD. Wiederimplementierung nach Cloud-Ausfall, gesichert auf `7cf33bc0`. 3.589/3.589 Node-Prüfungen, 2.235 historische Replays ohne neue ungeklärte Abweichung, 122/122 archivierte Weltstufen und isolierte ST-Abnahmen laut Implementiererbericht.
- [.213-Kontrollreview](recherche/AVERETH_213_GPT_KONTROLLREVIEW.md): zusätzliche Finanzkorrekturen auf `e7a36e2f`; R1 bestätigt behoben, eine konkrete R2-Variante bleibt bewusst zurückgestellt. `a89c690d` erhöht nur die Versionsnummer. Keine erneute vollständige .213-Abnahme behauptet. Nutzer entschied GO für persönlichen Test statt weiterer Minifix-Runde.
- **Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout; Character Card/Description, Narrator-Preset, Lorebook, Regex und ST-Einstellungen unverändert. Narrator Contract bleibt `.211`. Der Runner ist für persönliches Spiel nicht erforderlich.

## Persönliche Usertests 13 und 14

Der bestätigte Gegenreview bildete die Grundlage der Implementierungsfreigabe für .214. Die zwei ursprünglichen Spielertexte schließen eine eindeutig vereinbarte Zahlung mit Stababgabe ab. Ein Gegenangebot, das ausdrücklich auch den Beutel verlangt, erfordert eine entsprechend eindeutige Autorisierung. 3.591 Node-Prüfungen und 2.235 historische Replayvergleiche bestanden. [User13-Gegenreview](testrun_10b/user-20261125-212154-213/CODEX_GEGENREVIEW.md) · [.214-Fachbericht und Reviewdiff](recherche/AVERETH_214_SURRENDER_COMBAT_NEGOTIATION.md)

User14 spielte .215 bis zum ersten Katakombenkampf mit Ossen. Sein Feedback und der abgeschlossene Gegenreview begründen den abgegrenzten Extractorpatch und die ergebnisoffene Party-Planung. Die gemeinsam bestätigten Planungsentscheidungen stehen in [§ 12 der Erstanalyse](recherche/AVERETH_PARTY_SYSTEM_FACHPLANUNG.md#12-gemeinsame-designentscheidungen-nach-gpt-review). Der Fachplan bindet Ossens Profil, Teilnahme und Lohnanspruch an die belegten Spielereignisse. Für die Kapitulation greift er auf die User13-Originalprobe zurück. [Fachplan und technische Gegenproben auf .216](patch_plans_10b/FACHPLAN_PARTY_SYSTEM.md) · [Kapitulationskorrektur .215](recherche/AVERETH_215_KAPITULATION_AUTORISIERUNG.md) · [User14-Gegenreview](testrun_10b/user-20261126-010332-215/CODEX_GEGENREVIEW.md)

**Arbeitsaufteilung:** Codex übernimmt beauftragte Analysen, Implementierungen, Abnahmen und Gegenreviews; GPT bleibt unabhängiger Fach-, Code- und Run-Reviewer. Keine weiteren Claude-Aufträge. Historische Fachquellen bleiben gültig als Belege ihrer jeweiligen Etappe.

## Einstieg und Fachquellen

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Forschung](recherche/README.md) · [Originalarchive](testrun_10b/README.md) · [Verbindlicher Produkt-Kanon .200](02_DESIGN_KANON.md).
