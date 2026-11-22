# User07 .204 – Phase 2: Originalquellen und Integrität (21.11.2026)

Die folgenden vier Dateien sind die **unveränderten Originaluploads** des erweiterten persönlichen Userspieltests. Die Git-Blobs wurden mit den lokalen Ursprungsdateien bytegenau abgeglichen (Git-Blob-SHA und SHA-256). Diese zweite Lieferung ersetzt die **Phase-1-Originale nicht**; beide Snapshots bleiben auf `main` erhalten.

| Archiv auf main | Original-Dateiname | Dateigröße | SHA-256 | Git-Blob-SHA |
|---|---|---:|---|---|
| [`ORIGINAL_CHAT_PHASE2.jsonl`](ORIGINAL_CHAT_PHASE2.jsonl) | `Avereth Engine Test v4 - 2026-11-21@17h13m41s825ms (2).jsonl` | 845.132 B | `67af3add4a068113b583b5e1ac838a900d86035e18e3b396f240a7303dad204d` | `7839b0d6faa1210fe12d11a29e73f8889d0afd62` |
| [`ORIGINAL_EVENTS_PHASE2.json`](ORIGINAL_EVENTS_PHASE2.json) | `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-21@17h13m41s825ms_] (2).json` | 301.446 B | `e15c84dbe468c73add6af37d0ad63f4cb7d9da6d77358c204883079cb2b51d0e` | `a1e6e41ff4ab1850085e118b0776dd3ab6777ce7` |
| [`ORIGINAL_CHAT_COMPLETION_LOG_PHASE2.txt`](ORIGINAL_CHAT_COMPLETION_LOG_PHASE2.txt) | `Chat Completion request {(20261121-184215).txt` | 3.800.606 B | `db4a27faf796a3e7d119fe8d62b9d9827d7b72050a8687fc8afa3712c495dc1c` | `4cc848fb3e47123158ca23d4e9c0167b1328a0c1` |
| [`ORIGINAL_USER_FEEDBACK_PHASE2.txt`](ORIGINAL_USER_FEEDBACK_PHASE2.txt) | `Userfeedback Spielgefühl(7).txt` | 1.557 B | `a5280884d775b036e1c2e2145d2f85b116feb6c5b7463e5ca2fcb70cd7a6687e` | `a536c79d5c26f87975126cca4afeab87a8017bd4` |

**Quellkonsistenz:** 64 JSONL-Nachrichtenzeilen (inkl. Metadaten), gegenüber 14 im ersten Snapshot. Der frühere Nachrichteninhalt ist unverändert; dieselbe Chat-Integrität. 58 Ereignisgruppen / 474 Einzelereignisse gegenüber 11 Gruppen / 73 Ereignissen zuvor; alle elf alten Eventgruppen sind im neuen Export als **exakter, unveränderter Präfix** vorhanden. Folglich: **eine fortgesetzte Kampagne, kein separater Testrun**.

**Umfang bis zum neuen Ende:** 31 Nutzer-Spieltexte (davon 2 Charaktererstellung und 3 lokale `#assign`-Eingaben), 26 eigentliche Erzählantworten plus ursprüngliche Begrüßung, 28 `turn.begun`-Ereignisse. Phase 2 erweitert um **25 Spielerinputs und 22 Erzählantworten**. Aktiver Dungeon-Level-1-Lauf, kein dokumentierter Abbruch/Questabschluss.

**LLM-Rohprotokoll:** 61 physische Request/Response-Paare im erweiterten Original, alle mit `finish_reason:'stop'`. Alle aufgeführten Provider-Cache-Usage-Werte sind 0. Vollständige Originalbytes mit CRLF gespeichert.

**Auswertungsgrenze:** Der [GPT-Review](REVIEW_GPT_PHASE2_2026-11-21.md) analysiert die gespeicherten Messungen und Events. Kein neues Modell-A/B, keine echte ST-Browser-Reload-Prüfung und kein unabhängiger vollständiger Node-/Replay-Test wurden daraus behauptet. Die Dateien enthalten keinen exakt gemessenen Zeitpunkt der **sicher freigegebenen nächsten Eingabe**; die berechnete Größe `ST gen_started→gen_finished + extraction.ms` ist eine Untergrenze vor zusätzlichem Speicher-/UI-Overhead.
