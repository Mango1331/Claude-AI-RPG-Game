# Quellenmanifest – natürlicher NPC-/PULSE-Pilot 01 (.174)

**Originalupload:** `20261109-160250Z-npc_pulse_test.zip` vom 09.11.2026. **ZIP:** 14.298.286 Byte, SHA-256 `5bec029a12f418eea657b705e32e2f3555a9d00cea7a588e76f420e95c2a8449`; alle 16 Archiveinträge CRC-geprüft und korrekt.

**Git-Archiv mit ALLEN 14 unveränderten Originaldateien:** [originals/originals.tar.xz](originals/originals.tar.xz), **717.732 Byte**, SHA-256 `8a84430feb6557e82bbb1a86b7c4d1bb0007f715a002171a6dcc0c029fe2fe16`; Git-Blob-SHA **`cf5541f69f0276734e7294ec87656b000dfae210`**, beim Upload bytegenau mit lokalem `git hash-object` verglichen. Das TAR/XZ enthält exakt die 14 Original-Dateimitglieder aus dem ZIP ohne Veränderung der Einzeldateibytes; nur die äußere ZIP-Verpackung wurde nicht redundant archiviert. Entpacken: `tar -xJf originals/originals.tar.xz`. Unter Windows `Get-FileHash originals/originals.tar.xz -Algorithm SHA256` zur Kontrolle.

| Archiviertes Einzeloriginal | Bytes | SHA-256 |
|---|---:|---|
| avereth-events.json | 605.712 | `f8ef5cc99e6045798bf37994cc7ad519eeefe175733eaaeae214681bc26ba56f` |
| calls.json | 168.672 | `9397132ccf954ab86bdf7fe82940166110bc12683888abe64429ae26752af0c0` |
| chat-completions.jsonl | 12.988.912 | `fc0dd99930c5d1a2e7bda5aebd6d78290e83d0929b05a5d6664aa510e7f1f50f` |
| chat.jsonl | 2.084.622 | `2544fed0f39ff99f0f90307dd7ef473b24baabe6bf4d7ecefef813badd3e2b99` |
| evaluation.json | 107.332 | `8450db3c930ef8758506110fc8dd62155dd459b90150d44b2b78e67c02dfa1e4` |
| import.json | 14.565 | `a6b77471a8a975df9783d62dad974de8fe4ce6e4b65e230b3342c124fcd4204a` |
| npc-pulse.json | 52.191 | `2c5eab4f1e02a9d134f6e81e1717ea7bc7e33458f501b91ae0a7984788e892b0` |
| npc-pulse.md | 10.372 | `e6116e60294908050e34e88766529e7bbd6e5bfed885159f0c316625ffd80853` |
| player.jsonl | 546.152 | `26a354f543326e4097587c8d5ff42cc2b3d4cd57fae51dcdaaff806694f02ad5` |
| report.md | 34.692 | `6adf0fba504d0b3769236ee19924207decee3d68ff131541000755fc9ca30194` |
| run.json | 25.512 | `161d79a80d9dcfaf232bc55688690ef186346478d8cb8a15613149d68909446d` |
| screens/final.png | 139.171 | `738e7ee6c5b02c886301c4e2b0db8c2f0bf58be8b256a03ac10ed6a53e3e7617` |
| server.log | 13.731.617 | `0906835f5439613ec1ec8a9a6b795217398174aa657ec8a3389e049e08731019` |
| server.timed.log | 14.873.038 | `dcca7b7c37e448b15c4dcb21375eadc3b411694fd1024b9c60c116d068ccc6e1` |

**Zusätzlich direkt lesbare exakte Originale** (jeweils ursprünglicher Git-Blob-Hash kontrolliert): [run.json](originals/run.json), [report.md](originals/report.md), [evaluation.json](originals/evaluation.json), [npc-pulse.json](originals/npc-pulse.json) und [npc-pulse.md](originals/npc-pulse.md). Diese Dateien sind bewusst auch im vollständigen TAR/XZ enthalten.

**Prüfkonvention:** T1–T70 bezeichnet gesendete Spieleingaben. I0 ist die erste Chatnachricht; die JSONL-Metazeile zählt nicht. Im Quellenvergleich stimmten **130/130** flache Eventgruppen strukturell exakt mit den Original-Chatevents überein; insgesamt **1.076** Events. `report.md`/`npc-pulse.md` sind Runneroriginale, `REVIEW.md` der eigenständige Review, `PROBE_RESULTS.json` neu berechnete Kurzdaten.

**Sicherheit:** `run.json` bestätigt `protection.unchanged=true` und `secretHits=0`; im Review selbst wurden keine API-Keys veröffentlicht. Ein automatischer Scan ist kein absoluter Negativbeweis. Vollständige Modellrequests sind **nur im Originalarchiv**, nicht erneut als ausformulierte Git-Reviewpassagen veröffentlicht.
