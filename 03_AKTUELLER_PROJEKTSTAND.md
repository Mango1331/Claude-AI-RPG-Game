# Avereth Engine – aktueller Projektstand

**Build .220 steht für den unabhängigen GPT-Diffreview bereit.** Die beiden Befunde aus dem .219-Review sind im Produktpfad bestätigt und behoben. Ereigniszeit und Reiseminuten werden getrennt gebucht. Bei einem Wechsel unterwegs erhält jedes Mitglied MP nur für den eigenen Weg. Der persönliche Usertest 16 folgt nach unauffälligem Review und Nutzerentscheidung. [Reproduktion und Abnahme](recherche/AVERETH_220_REISEZEIT_UND_MITREISENDE.md) · [Produktdiff .219 → .220](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/0a7a91b90d204e01c49747829308abf940343449...cc327a1ae44b0aac3605f416078c693b2600ffff)

## Aktuelle Referenzen

| Zweck | Verifizierte Referenz |
|---|---|
| Aktiver Entwicklungs-/Testbranch | `experiment/211-openrouter-helper-single-runner` · [`cc327a1a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc327a1ae44b0aac3605f416078c693b2600ffff) · Build `4.3.0-c.6.6.220` |
| Fester Kontinuitätsvergleich | `experiment/211-scene-continuity` · [`c2ddc780`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ddc780d4c57b219f9cd7a1d134efceca7e459d) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` · [`0cd14806`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

`main` ist die separate Dokumentations- und Originalarchivlinie. Diese Tabelle ist ein Snapshot, keine Garantie für spätere HEADs. Vor neuer Arbeit aktuelle Remote-Refs prüfen.

## Letzte abgeschlossene Entwicklungsarbeit

- .219 setzte das User15-Paket in sieben Etappen einschließlich Reisemana und lokaler Handlungsdurchführung um. Der GPT-Diffreview bestätigte die Etappe grundsätzlich und führte zum gezielten Folgepaket .220. [User15-Fachbericht](recherche/AVERETH_219_USER15_FACH_UND_ABNAHME.md)

- .218 korrigierte die Autorisierung von Partyabreden, doppelte Vergütung und angekündigte Übergaben. User15 spielte auf diesem Stand solo. [Party-Gegenreview](recherche/AVERETH_218_PARTY_GEGENREVIEW.md) · [Persönlicher Solorun](testrun_10b/user-20261126-085419-218/)

- .216 verarbeitete sieben belegte Extractorantworten lokal und sparte im User14-Originalzug drei Folgeanfragen mit 46.330 Inputtokens. Dieser Stand bildet die Vergleichsbasis für den Partykandidaten. [Extractor-Abnahme](recherche/AVERETH_216_EXTRACTOR_NORMALISIERUNG.md)

- [User12 und .212-Fach-/Offline-Abnahme](recherche/AVERETH_212_FACH_UND_ABNAHME.md): Revisionsbindung, NPC-Sidestep, Runner-Sicherheit, Handel, lokale Reise, PULSE, Board, native Aktionen und HUD. Wiederimplementierung nach Cloud-Ausfall, gesichert auf `7cf33bc0`. 3.589/3.589 Node-Prüfungen, 2.235 historische Replays ohne neue ungeklärte Abweichung, 122/122 archivierte Weltstufen und isolierte ST-Abnahmen laut Implementiererbericht.
- [.213-Kontrollreview](recherche/AVERETH_213_GPT_KONTROLLREVIEW.md): zusätzliche Finanzkorrekturen auf `e7a36e2f`; R1 bestätigt behoben, eine konkrete R2-Variante bleibt bewusst zurückgestellt. `a89c690d` erhöht nur die Versionsnummer. Keine erneute vollständige .213-Abnahme behauptet. Nutzer entschied GO für persönlichen Test statt weiterer Minifix-Runde.
- **Persönliches ST-Profil:** vollständige Engine-Extension aus dem Entwicklungscheckout; Character Card/Description, Narrator-Preset, Lorebook, Regex und ST-Einstellungen unverändert. Narrator Contract bleibt `.211`. Der Runner ist für persönliches Spiel nicht erforderlich.

## Persönliche Usertests 13 und 14

Der bestätigte Gegenreview bildete die Grundlage der Implementierungsfreigabe für .214. Die zwei ursprünglichen Spielertexte schließen eine eindeutig vereinbarte Zahlung mit Stababgabe ab. Ein Gegenangebot, das ausdrücklich auch den Beutel verlangt, erfordert eine entsprechend eindeutige Autorisierung. 3.591 Node-Prüfungen und 2.235 historische Replayvergleiche bestanden. [User13-Gegenreview](testrun_10b/user-20261125-212154-213/CODEX_GEGENREVIEW.md) · [.214-Fachbericht und Reviewdiff](recherche/AVERETH_214_SURRENDER_COMBAT_NEGOTIATION.md)

User14 spielte .215 mit Ossen bis zum ersten Katakombenkampf. Erzählung und gespeicherte Abrede trugen die gemeinsame Reise, im Kampf blieb Ossen Zuschauer. Der Runordner hält das ursprüngliche Feedback, die damals offene Party-Idee und beide Reviews fest. [Spielerfeedback](testrun_10b/user-20261126-010332-215/FEEDBACK_SPIELGEFUEHL.md) · [Offene Idee aus User14](testrun_10b/user-20261126-010332-215/PARTY_FACHPLANUNG_OFFEN.md) · [Gegenreview am Original](testrun_10b/user-20261126-010332-215/CODEX_GEGENREVIEW.md)

Auf .216 untersuchte Codex die Party zunächst separat vom Extractorpatch. Nach dem GPT-Fachreview bestätigte der Nutzer D1–D9 und beauftragte den Architekturplan. Vor der Implementierung bestätigte er mit D10–D12 den XP-Anspruch bei vorzeitigem Ausscheiden, die Folgen einer Trennung für Quest-XP und Geld sowie das Beobachtungsfenster beim gemeinsamen Rückzug. Der erste GPT-Produktreview dieser Umsetzung führte zu R1–R6 und zum Korrekturkandidaten .218. [Entscheidungen in § 12](recherche/AVERETH_PARTY_SYSTEM_FACHPLANUNG.md#12-gemeinsame-designentscheidungen-nach-gpt-review) · [Architekturauftrag](recherche/AVERETH_PARTY_ARCHITEKTUR_FACHPLAN_AUFTRAG.md) · [Patchplan mit Abnahmematrix](patch_plans_10b/FACHPLAN_PARTY_SYSTEM.md) · [Freigabestand vor der Implementierung](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fba804716d91b3070634eb5c4bbbce7355938550)

**Arbeitsaufteilung:** Codex übernimmt beauftragte Analysen, Implementierungen, Abnahmen und Gegenreviews; GPT bleibt unabhängiger Fach-, Code- und Run-Reviewer. Keine weiteren Claude-Aufträge. Historische Fachquellen bleiben gültig als Belege ihrer jeweiligen Etappe.

## Einstieg und Fachquellen

[Startnachricht für neue GPT-Chats](README.md#einstieg-eines-neuen-gpt-chats) · [Arbeitsweise](01_ARBEITSWEISE_GPT_CODEX.md) · [Etappenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Forschung](recherche/README.md) · [Originalarchive](testrun_10b/README.md) · [Verbindlicher Produkt-Kanon .200](02_DESIGN_KANON.md).
