# Quellenmanifest – natürlicher NPC-/PULSE-Dreierbatch 13.11.2026 (.183)

**Originaldatei:** `npc-batch-20261113-135417Z.zip` (vom Nutzer hochgeladen). Die vollständige Original-ZIP liegt **nicht** im Git-Repository und wird nicht als archivierter Git-Blob ausgegeben.

- **Original-ZIP:** 32.746.174 Bytes, 55 Einträge, 102.811.098 Bytes entpackt, CRC aller Einträge geprüft (0 Fehler).
- **SHA-256 Original:** `51b2751b8933f4afd5b6c81331d00875f1045a746c2c26faf7d9e624aca9e933`.
- **Start / Ende:** 13.11.2026 13:54:18.079 UTC / 15:55:18.870 UTC.
- **Run-Commit:** `86465eb2a75e` (Produkt `4.3.0-c.6.6.183`, sauber); tatsächliche LLM-Kampagnen, Seeds 7/8/9, `stub=false`.
- **Integrität der Originaldaten:** 283/283 exportierte Eventgruppen mit den eingebetteten Chatevents identisch; 2.416 Events insgesamt; in archivierter Bewertung alle `integrity.ok=true`, jeweils 0 Fold-/Validatorfehler. Die gespeicherten Outcomes sind Endzustände, nicht automatisch bestandene Tests.

| Profil / Pfad in Original-ZIP | Inputs / Ende | SHA-256 chat.jsonl | SHA-256 avereth-events.json |
|---|---|---|---|
| `001-npc-sociable/20261113-135418Z-npc_pulse_test/` | 70 / done | `cde7a0ff91ad396502f775440167636f912e841f1411583241b6329d4ee2911a` | `6d60c89a728cbf53260e1bc643f4a36ca198d4402dd4ae5a55748e3e1c08437a` |
| `002-npc-wary/20261113-144454Z-npc_pulse_test/` | 43 / repeated_model_failure | `3f76f4771b71ab425e6772847d32399b9055d9461a9284e8caeb99bd97bed73e` | `37516d09f297aa017d962e0a1abda78e7bc8fd38dd44e266e7a838fdac07438b` |
| `003-npc-inquisitive/20261113-152658Z-npc_pulse_test/` | 39 / defeat | `6db885acab2ad850c0c903be0c28616f0589ed5187a551cc5408df190f504c3d` | `f042a7971ad05305830d823081159d63d8a56f02c674df4ad41ee1071a3337e0` |

## Claude-Gegenreview-ZIP (separates Nutzerartefakt)

- Datei: `npc-batch-20261113-135417Z-CLAUDE-GEGENREVIEW.zip`.
- **11.074.283 Bytes**, unter 30 MiB; ZIP-CRC fehlerfrei.
- **SHA-256:** `f0f23f3f28c290326ad8bbf9b42fb38c0ca67155e2ec18102d2b25f08d4983d4`.
- Auszug mit unveränderten Originalbytes: pro Lauf `chat.jsonl`, `avereth-events.json`, `chat-completions.jsonl`, `player.jsonl`, `calls.json`, `evaluation.json`, `run.json`, `npc-pulse.json/.md`, `report.md`, plus Batch-Metadaten. Zusätzlich `CLAUDE_REVIEW_GUIDE.md` und Datei-Prüfsummen `HASHES.json`.
- **Nicht enthalten:** Screenshots, `server.log`, `server.timed.log`, `import.json`. Es ist **kein** vollständiger Originalersatz und liegt separat beim Nutzer, nicht in Git. Modellrequests können Kontextdaten enthalten: Quellenpaket vor öffentlicher Weitergabe prüfen und keine Schlüssel ins öffentliche Repository kopieren.

[Unabhängiger Review](REVIEW.md). Den tatsächlichen Run/Original anhand der SHA prüfen, bevor fremde Gegenreviewaussagen als Belege übernommen werden.
