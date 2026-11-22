# Quellenmanifest – natürlicher NPC-/PULSE-Dreierbatch auf Build .188 (14.11.2026)

**Originalupload:** `npc-batch-20261114-161005Z.zip`; **42.201.972 Byte**, SHA-256 `5251b06ca0c741e7f2e9131ac63845be32ad49f3ceca3036bca5c707e21a7052`. 54 Archiveinträge inklusive Verzeichnissen, 132.694.567 Bytes unkomprimiert.

**Originale Quellbasis:** `npc-batch-20261114-161005Z/`, drei Personenordner mit `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `player.jsonl`, `run.json`, `evaluation.json`, `npc-pulse.json/.md`, `report.md`, Serverlogs und Screenshot sowie `batch.json`, `report.md` an der Wurzel. Vollständige Original-ZIP bleibt beim Nutzer und wird nicht nach GitHub hochgeladen.

**Eigens erstelltes reduziertes Opus-Gegenreview-Paket:** `npc-batch-20261114-161005Z-OPUS-GEGENREVIEW.zip`; **8.401.646 Byte**, SHA-256 `f4fe16f4952826764099d06f5edd0277e0e9e6da60c3c9214ff7a1b362e74b9c`. Der Nutzer erhält die Datei als Anhang/Download im Chat, **nicht** als erfundenen GitHub-Link. Enthält `batch.json` und die drei vollständigen `run.json`, `report.md`, `chat.jsonl`, `avereth-events.json`, `evaluation.json`, `npc-pulse.json/.md`, `calls.json`, `player.jsonl` plus pro Profil `chat-completions-FOCUS.jsonl` mit **vollständigen, byteidentisch übernommenen Original-JSONL-Zeilen**, keine Kürzung von Anfrage/Antwort **innerhalb** einer gewählten Zeile. Der mitgelieferte `MANIFEST.json` nennt jeden Dateihash, die pro Profil gewählten `turn`-Zahlen und alle Original-Aufruf-`n`-IDs. Ausgelassen: Serverlogs, Screenshots und Requests außerhalb der Fenster. Die Voll-ZIP bleibt für zusätzliche Requests verfügbar.

## Buildbeleg und Abschluss

Aus `batch.json` und den drei unveränderten `run.json`:
- Fixierter Git-HEAD **`823fd6f54c06`**, Build **`4.3.0-c.6.6.188`**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, drei **saubere** Checkouts (`dirty=[]`).
- Drei echte LLM-Personas, **kein Stub**: `npc-sociable` (Warrior, Seed 7), `npc-wary` (Rogue, Seed 8), `npc-inquisitive` (Mage, Seed 9); GLM-5.3-Flash.
- Je **70 Inputs**, drei `done`-Enden, Exitcode 0, `profileUnchanged=true`, Analyse `ok=true`, keine Secret-/Browser-/Serverfehler.
- Batch `startedAt=2026-11-14T16:10:05.810Z`, `endedAt=2026-11-14T18:09:57.906Z`.
- **Achtung Chronologie:** Bei der späteren Dokumentationsprüfung lag der Produktbranch bereits auf `.189` (`4438241`). **Der hochgeladene Lauf ist ausschließlich .188**, niemals ein natürlicher Test des späteren Builds .189.

## Primärdateien – SHA-256 der Original-Bytes

| Persona | Chat `chat.jsonl` | Events `avereth-events.json` | Requests `chat-completions.jsonl` | `calls.json` |
|---|---|---|---|---|
| Warrior | `bd5e90babb492eaacfed770dcf8e2630d5e17b31cf83d9613df8591ebbe8225b` | `93cc6764732761f97ffd3a28f0f43a9431fdc77e921e4a643af1945614ea0f96` | `2b511baeac9648bc800b11b26be406f63f00f5c42dd884465479793da40219e5` | `843b839ed094ae4a3b9bc341bc63b71737c742ed3eb28ec6ae37e3b714f437de` |
| Rogue | `f030d34e8ef584b39a15e45703b19e9050d45c26fa0131df3804d00dc1062951` | `7ac4058cadf658f99b4746765b3ee5d539ec1727224f382e74b524af266e987f` | `826a9a6cad3dacfaf3e09dbadf36b6a4af561a7005342067412ec0fff5cff1f6` | `7285541c857cfbb84c03f7011b4c1f590031ba3d8496735a0e66db3b407b1fbd` |
| Mage | `676212144d2a12a072ceb2791e540569f1563ef15841ed2334e7d26ef9abba0e` | `afd729677d7c1976ade35505ca0b46192f8a212406b29bd55dbeb088962c9ccb` | `d0d65200b4fc69c11a80aa9aac38812173d04adbcfbd804365d99a3831cfb034` | `64988bc0545a39b8c0662166de86a7bfbaefa0ae01467f9013835e39a91f29d8` |

## Unabhängige Export-/Chatkonsistenz

Die `avereth-events.json`-Gruppen wurden in den Originalbytes eingelesen und jeweils mit `chat.jsonl` → `extra.avereth.events` des **gleichen Chatindexes** als JSON-Strukturen verglichen. Alle Gleichheiten stimmen; das ist **nicht** eine erneute `foldChat`-Ausführung.

| Persona | Nachrichten ohne JSONL-Metadatenzeile | Exportgruppen identisch | Engineevents | Modellaufrufe | FOCUS-Modellaufrufe |
|---|---:|---:|---:|---:|---:|
| Warrior | 141 | **138/138** | **1.139** | 219 | 121 |
| Rogue | 141 | **136/136** | **1.120** | 215 | 109 |
| Mage | 141 | **128/128** | **1.102** | 204 | 112 |
| **Summe** | **423** | **402/402** | **3.361** | **638** | **342** |

Die `evaluation.json` meldet `integrity.ok=true`, `foldErrors=[]`, `problems=[]` in allen drei Läufen. **Rogue meldet außerdem zwei fehlgeschlagene Einzelnachrichten-Extraktionen** (Chat #80, #98), die den Batch nicht beendeten. Als valide Engineevents gelten nur gebuchte Ereignisse, nicht ungebuchte Prosa.

**Nachrichtenzählung:** `chat.jsonl` enthält zuerst eine Metadatenzeile, danach die Chatobjekte; Chatindex `#0` ist die Begrüßung, Spielerinput I40 = Chatindex #79, Antwort #80. `calls.json` `turn` ist der Input-/Turnindex, `n` die Aufrufnummer pro Profil; nicht miteinander vermischen.

**Review:** [REVIEW.md](REVIEW.md). Durch diesen Review wurden keine Produktdateien, natürliche Laufdaten oder Engineevents verändert.
