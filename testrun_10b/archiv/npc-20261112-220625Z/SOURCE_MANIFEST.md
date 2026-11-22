# Quellenmanifest – NPC-/PULSE-Dreierbatch 12./13.11.2026

**Original:** vom Nutzer in der aktuellen Konversation hochgeladen: `npc-batch-20261112-220625Z.zip`. **Die ZIP selbst wurde im Rahmen dieses Reviews nicht als Git-Blob hochgeladen.** Dieses Manifest dient der Rückzuordnung, nicht als Ersatz für die Originaldateien. Beim Weiterarbeiten in einem anderen Chat das ZIP erneut zugänglich machen, sofern es nicht dort bereits als Datei verfügbar ist.

- **ZIP-Größe:** `40.540.027` Bytes; **54 ZIP-Einträge**, alle CRC-geprüft, **127.683.264` Bytes entpackt.
- **SHA-256 Original-ZIP:** `d17680a3581ab5034842b8a3c6c9aaa76ac79eb13d6262c53496f8e776df6d7d`.
- Batch gestartet `2026-11-12T22:06:25.833Z`, beendet `2026-11-13T00:54:24.845Z`. `batch.json.status=completed`, `stub=false`, `git=ebf2bf6ead4e`.
- **Engine** `4.3.0-c.6.6.179`; Runner-HEAD `ebf2bf6ead4e`, unveränderte Spielmechanik gegenüber `59f868e`.
- **Alle drei Runs:** `protection.unchanged=true`; `secretHits=0`; archivierte `integrity.ok=true`; keine PageErrors.
- Unabhängig verglichen: **358/358** Gruppen aus `avereth-events.json` gleich den gruppierten `extra.avereth.events` aus `chat.jsonl`; 2.576 Events. Keine unabhängige vollständige Node-/Replay-/ST-Neuausführung.

| Profil / Laufordner im ZIP | Inputs/Ende | SHA-256 `chat.jsonl` | SHA-256 `avereth-events.json` |
|---|---|---|---|
| `001-npc-sociable/20261112-220626Z-npc_pulse_test/` | 70 / done | `faf86a82baadf59ea7bbec6373f2f0182f34ca7a3614421db2bc9094b1f47b84` | `8e8a2a0c70afff7b3242d2fe456bfd33a35205f16cabad4f522e7dc277b87a64` |
| `002-npc-wary/20261112-230128Z-npc_pulse_test/` | 70 / done | `097bdc3a3310605ae909a486bb4946bb3f02f31e013cfbc9e8f3c8749c1e1bbc` | `dbb2df6da2449362e2f8393527474d348eb548a29204c50dcbe82cd1b52cb385` |
| `003-npc-inquisitive/20261113-001247Z-npc_pulse_test/` | 48 / repeated_model_failure | `491cfee1bb0bc49c1084fe3646e48bdc0216fb3df233814460e63f219915d321` | `7ac6c704c4411ea7ce5f81a7e943e42819f5167df93f3e3cc95b18d384622dbe` |

Zusätzlich im unveränderten ZIP pro Lauf: `run.json`, `evaluation.json`, `npc-pulse.json`, `npc-pulse.md`, `player.jsonl`, `chat-completions.jsonl`, `calls.json`, `report.md`, `import.json`, `server.log`, `server.timed.log` und `screens/final.png`. Auf Batch-Ebene `batch.json` und `report.md`. Serverlogs, Original-Requests und ggf. Zugangsinformationen nicht ungeprüft als öffentliche Git-Dateien veröffentlichen; Zugangsdaten im Review nicht übernehmen.

[Unabhängiger Review](REVIEW.md) mit Stellen und Folgebewertung.
