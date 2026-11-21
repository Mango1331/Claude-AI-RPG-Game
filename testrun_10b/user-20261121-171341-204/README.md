# User07 – erster persönlicher User-Spieltest auf Avereth .204

**Stand 21.11.2026 · Persönlicher Run begonnen; unabhängiger Codex-Gegenreview abgeschlossen; neues Nutzer-/GPT-Boardprinzip für nächsten Patch dokumentiert.**

- **Build:** `4.3.0-c.6.6.204`, geprüfte Entwicklungsbasis `b51e850bfa233b32f10ba01c563002ab26061c85` (`experiment/action-hud-200-v1`, `experiment/204-b-playtest-ready`). Die eingefrorene Produktversion `.200` ist nicht Teil dieses Tests.
- **Durchgeführte Eingaben:** sechs Spielerinputs (zwei Charaktererstellung, dann Reise zur Gildenhalle, Registrierungsanfrage, Zahlung/Abschluss, Questboard-Lesen); vier Narratorantworten. Letzter archivierter Zustand: Engine hat fünf Novice-Boardeinträge erzeugt, keine Quest angenommen. Der User-Run ist **nicht als abgeschlossen oder langfristig validiert** ausgewiesen.
- **Provider:** Nutzerlauf über Featherless mit `zai-org/GLM-5.3-Flash`; API-Requestlog protokolliert `stream:false` bei den Erzählrequests. Vergleich zu einer anderen Providerroute ist kein natürlicher A/B-Test dieses Runs.
- **Trennung:** [Nutzerfeedback](USER_FEEDBACK.md), [frühere GPT-Einordnung und prüfbedürftige Hypothesen](GPT_DISKUSSIONSSTAND.md) sowie [Analyseauftrag an Codex](CODEX_ANALYSEAUFTRAG.md) sind ausdrücklich getrennt. Der [abgeschlossene Codex-Gegenreview](CODEX_GEGENREVIEW.md) und der [spätere GPT-/Nutzer-Designnachtrag](REVIEW_GPT_NACHTRAG_2026-11-21.md) behalten getrennte Provenienz.

## Originalquellen – bytegenau auf main

Die drei neu hochgeladenen `(1)`-Dateien wurden **unverändert** als Git-Blobs gespeichert; die unten angegebenen Git-Blob-SHAs wurden gegen die lokalen Originalbytes abgeglichen. Einfachere Archivnamen ändern ihren Inhalt nicht.

| Archiv | Ursprünglicher Uploadname | Bytes | SHA-256 |
|---|---|---:|---|
| [`ORIGINAL_CHAT.jsonl`](ORIGINAL_CHAT.jsonl) | `Avereth Engine Test v4 - 2026-11-21@17h13m41s825ms (1).jsonl` | 156,137 | `9498fa2c1cf9bd5a6f7f4a0956009eefbe2b6aabd97525d69ed65a2000f8b4c5` |
| [`ORIGINAL_EVENTS.json`](ORIGINAL_EVENTS.json) | `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-21@17h13m41s825ms_] (1).json` | 55,625 | `9fbc052c832cffed3e7610efe8421e1fe62e9de8ad4a83f9ac9ee555b0b3d27e` |
| [`ORIGINAL_CHAT_COMPLETION_LOG.txt`](ORIGINAL_CHAT_COMPLETION_LOG.txt) | `Chat Completion request {(20261121-165350).txt` | 798,198 | `0d619e66f10eef010e0f18dc0bf94a5b69fd8bf9731e0b145c4c2cddf5fd629f` |

Git-Blob-SHAs: `ORIGINAL_CHAT.jsonl` = `2bf129ff2b4cca8c8e268fd11f62ebf629b4cd84` · `ORIGINAL_EVENTS.json` = `82be942501b7f0709380c41f0a2274f4893ef43c` · `ORIGINAL_CHAT_COMPLETION_LOG.txt` = `e741550411b39725b9b44234ed81e07d0d062385`.

Die Dateien des früheren Uploads **ohne** Suffix `(1)` sind ein kürzerer Zwischenstand desselben Runs und wurden hier nicht mit den späteren, vollständiger fortgeschriebenen Quellen vermischt.

## Unstrittige, aus den Originaldaten erkennbare Eckpunkte

- **Turn 5 (Registrierungszahlung):** Spielertext `*i pay the 2 silver and say* Alaric Red as the name im 18 and a Mage and i have not been assessed yet`. Die Engine hat **20 cp einmalig bezahlt**, Guild Rank Novice gebucht, die Gildenplatte erzeugt. Der Planner protokolliert **39.678 ms und JSON-Reparatur**. Das Eventlog dokumentiert danach **vier abgelehnte Extractor-Deltas**, davon **zwei `no_go` (Messraum und Rückweg)** und **zwei `scene_context` (Fakten)**; der Extractor selbst meldet **35.653 ms ohne Repair**. Das bedeutet nicht, dass die Registrierung fehlgeschlagen ist.
- **Turn 5 Browser-Generierungsfenster:** Im Originalchat `gen_started=2026-11-21T16:39:40.006Z`, `gen_finished=2026-11-21T16:43:46.205Z`: **246,199 s bis zur abgeschlossenen Erzählgenerierung**. Das ist *nicht* identisch mit sicherer Folgeeingabe, weil der Extractor anschließend noch Zeit benötigt.
- **Turn 6 (Board):** Spielertext `*i nod and walk over to the questboard and look at it*`. Planner **3.550 ms**; fünf `board.shown`-Einträge, Questboard-Zustand und Systemkarten vorhanden; Extractor **20.958 ms**, ein `ambient`-Delta abgelehnt. Browser-Generierungsfenster `2026-11-21T16:50:11.718Z` bis `16:52:34.883Z`: **143,165 s** einschließlich Planner/Board/Narrator; zusätzlich Extractor. In der Erzählung stehen die fünf Aufträge noch einmal, obwohl sie bereits im Engine-Board angezeigt werden.
- **Vorläufige GPT-Auswertung** (durch Codex **unabhängig verifizieren**): Im Turn 6 nahm die anfängliche Boarderzeugung einschließlich zweitem Versuch ca. **118,12 s**, die Narration ca. **21,27 s** in Anspruch; in Turn 5 entfiel der überwiegende Teil der Dauer auf den Narrator. Dieser Abschnitt legt **keine** kausale Erklärung oder Optimierungsmaßnahme fest.

**Nicht behauptet:** Ein eigenständiger Replay-/Save-/Reload-Nachlauf der drei Originale durch GPT, eine belastbare Langzeit-FPS/Latenz-Aussage, bewiesener Zeitgewinn durch Character-Description-Kürzungen oder eine bereits erfolgte Codex-Implementierung.

## Ergebnis und Grundlage für den nächsten Patch

[Codex hat die Originale und den tatsächlichen `.204`-Code unabhängig geprüft](CODEX_GEGENREVIEW.md). Erst **danach** entwickelte der Nutzer die neue Präferenz, bei technisch gültigen F-/Novice-Aufträgen **keine erzwungene leichte Einstiegsquest oder zwingende Staffelung** zu verlangen. [Detaillierte Diskussion und GPT-Bewertung](REVIEW_GPT_NACHTRAG_2026-11-21.md) · [fortgeschriebenes Nutzerfeedback](USER_FEEDBACK.md) · [historischer und neuer Diskussionsstand](GPT_DISKUSSIONSSTAND.md).

**Vorläufige Patchrichtung:** unnötige globale Board-Kompositionsquoten gegenüber gültigen Einzelverträgen abschwächen; im User07-Erstentwurf wäre der zweite vollständige Request von 56,168 s dann möglicherweise entfallen. **Unverändert wichtig:** spielbare, prüfbare Quests, Novice L1–14, gültige Dungeon-/Population-/Zählmechanik, verlässlicher Tageswechsel und kein implizites Wiederfreigeben anderer Questtypen. Daneben steht die schon identifizierte Messraum-Routine als separates Kontinuitätsthema. Bis zur ausdrücklichen nächsten Patchentscheidung **kein Runtime-/Preset-/Lore-/Contract-Code geändert**.
