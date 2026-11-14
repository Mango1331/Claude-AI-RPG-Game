# Originalquellen – natürlicher NPC-/PULSE-Dreierbatch 14.11.2026 (.186)

**Nutzerupload:** `npc-batch-20261114-094810Z.zip`, **42.840.256 Bytes**, SHA-256 `e5e0ed23cc5016f75bd7a4d27523f3eef76b9c9b88b2686cd380a3f8cc0e4485`. Das vollständige Archiv (inklusive großer Original-Modellaufzeichnungen, Serverlogs, Screenshots) bleibt **außerhalb des Git-Repositories** beim Nutzer; hier sind nur Prüfsummen, Struktur und Auswertung hinterlegt. Der Dateiname ist kein Git-Download-Link.

**Quelle im Archiv:** `npc-batch-20261114-094810Z/`. Enthält `batch.json` und `report.md` sowie für jeden der drei Persona-Läufe `run.json`, `report.md`, `chat.jsonl`, `avereth-events.json`, `chat-completions.jsonl`, `player.jsonl`, `calls.json`, `evaluation.json`, `npc-pulse.json`, `npc-pulse.md`, `import.json`, Screenshot und zwei Serverlogs. 54 ZIP-Einträge einschließlich Verzeichnissen; Entpackungsumfang ca. 135.934.469 Bytes.

**Build-/Runner-Beleg:** `batch.json` meldet `git=13824919a850`, `build=4.3.0-c.6.6.186`, echte GLM-5.3-Flash-Spieler (kein Stub), Seed 7/8/9, jeweils 70 Inputs, alle drei `done`, Exitcode 0 und `profileUnchanged=true`. Anfang 2026-11-14T09:48:10.995Z, Ende 2026-11-14T13:05:38.028Z.

## Prüfsummen der zentralen Primärquellen

Die relative Basis pro Persona ist `00X-<persona>/<Zeitstempel>-npc_pulse_test/`. Alle SHA-256-Werte wurden aus den **tatsächlichen Bytes des hochgeladenen ZIPs** berechnet (nicht aus Runner-Aussagen).

| Persona | Datei | Bytes | SHA-256 |
|---|---|---:|---|
| 001 Warrior | `chat.jsonl` | 1.786.162 | `0db8dc90cd475f6d6d6e3eefb25e2e5a84e621bbf63d2c771cf5991d625d430a` |
| 001 Warrior | `avereth-events.json` | 499.490 | `fed509639394215a2bf4c038705af65f61ca4ad92e9625f6a7e5531ffb695636` |
| 001 Warrior | `chat-completions.jsonl` | 12.521.557 | `57751cb86dc4a784e92a0af5b60d50761db70e5726c02f22830aa522c783635a` |
| 001 Warrior | `npc-pulse.json` | 29.371 | `06599939d78b22ae1fb1578985ed75e00ba5efee13c17686ac7ab9c61fb63295` |
| 002 Rogue | `chat.jsonl` | 2.055.905 | `eeb7fbc69fb5b63ccae8c0b7247d53065f3e479d07782eac6ea27d17b64f888e` |
| 002 Rogue | `avereth-events.json` | 649.468 | `3eb0cdcd2d1d299bd2192d80cf0b393ea76c9f76646ef9de564dedc4770624b5` |
| 002 Rogue | `chat-completions.jsonl` | 13.264.880 | `a1fb7076b1b87f07eb5b5e85467e383f02e130dd14f39a67b36b3135045ece88` |
| 002 Rogue | `npc-pulse.json` | 42.283 | `501c042ba48632d233b90b2d1d47e34f9610c8dedbd6edffe5f838b15ec3f465` |
| 003 Mage | `chat.jsonl` | 1.972.288 | `38a7527a62dd99169d0550aeedfe2ac63e54f0dd3dc66eaa1fea4ef4881298bf` |
| 003 Mage | `avereth-events.json` | 602.531 | `f5bee4a418a9777394dc2cd9c089e3e3c7055b1fd056cf50468ed5d0e2601a89` |
| 003 Mage | `chat-completions.jsonl` | 13.262.636 | `8ca72659113c40d7335384049665063a0697887def6b327f3491c3aa070e7588` |
| 003 Mage | `npc-pulse.json` | 37.519 | `8096d3ed20c696033985bdcf4a99719ef22b3c4e176e4abae8afd06f041edb75` |

## Unabhängige Konsistenzprüfung

| Persona | Chat-Nachrichten (einschließlich Begrüßung) | Eventgruppen | Einzelereignisse | Exportgruppen strukturell identisch mit `chat.jsonl`-Recordevents |
|---|---:|---:|---:|---|
| Warrior | 141 | 113 | 873 | 113/113 |
| Rogue | 141 | 123 | 1.059 | 123/123 |
| Mage | 141 | 126 | 1.059 | 126/126 |
| **Gesamt** | **423** | **362** | **2.991** | **362/362** |

Dieser Vergleich bestätigt **Exportgleichheit**, nicht die eigenständige Neuberechnung von `foldChat` oder `validateState` unter Produktcode. Die Runner-Evaluation meldet für alle drei Läufe `foldErrors=[]` und `problems=[]`; das ist ein getrennter Ausführungsbeleg.

## Nachrichtennummern

`chat.jsonl` beginnt mit Metadaten (separate erste Zeile); die eigentliche Chatliste beginnt bei Index 0 (Begrüßung). Spielerinput **I1** ist bei Chatindex 1, **I59** bei Index 117 und dessen Narrator-Antwort bei Index 118. Engine-`turn` kann wegen nativer Eingaben/Kampf/Clarifies von der Inputnummer abweichen. Im Review werden diese Zahlen ausdrücklich nicht vermischt.

**Hauptreview:** [REVIEW.md](REVIEW.md). Keine Produktänderung, kein neu durchgeführter ST-Smoke oder Live-Modellaufruf durch die Aktenablage.
