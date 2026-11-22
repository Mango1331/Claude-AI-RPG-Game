# Quellenmanifest – User05 `.202`, Phase C (dritter Gesamtexport)

**18.11.2026 · dieselbe ursprüngliche Kampagne – kein eigenständiger Test.** Die vier beigefügten Originaldateien sind auf `main` unter neuen Namen **byteidentisch** abgelegt, Originale A und B unverändert. Der Phase-C-Chat und die Phase-C-Events enthalten die gesamten A-/B-Abschnitte erneut; **nicht** die kumulativen Chat-/Eventdaten der Exporte addieren. Der neue Completion-Mitschnitt umfasst dagegen nur die **26 physischen Aufruf-/Antwortpaare der Phase C**.

| Nutzer-Originaldatei | Bytes | Original SHA-256 | Git-Blob-SHA (Byteidentität) | Git-Datei |
|---|---:|---|---|---|
| `Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms (2).jsonl` | 692.407 | `4c8022fda2c6c0c77fbfc91440d2edffa45e7ecf4d668b414ae1683d514e14ae` | `e68b8ef2b2fb718078ab6438497c5bcb5b59a9b8` | [`originals/phase_c_chat.jsonl`](originals/phase_c_chat.jsonl) |
| `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms_] (2).json` | 245.135 | `1969d5b99f4f231bcb1256751b6703a85be6d2eb792445a153f6e615912140bf` | `cfab23e988db6bbd7ffd36d61149d66b17c6b6f0` | [`originals/phase_c_events.json`](originals/phase_c_events.json) |
| `Chat Completion request {(20261118-034031).txt` | 1.463.594 | `850894f11a536c63ca73c55136738e18026cb8f82859d03a2e27f5f41a671d59` | `5abc6204474391eab5917054b8bcb7547cc25993` | [`originals/phase_c_completions.txt`](originals/phase_c_completions.txt) |
| `Userfeedback Spielgefühl(5).txt` | 1.818 | `a46873ebf768a3909e6bcf478b90d4ab13716251987d52cb651b35898a46849b` | `3902d7dd2fa9bcc95e3bd1b6e449953242ccca2c` | [`originals/phase_c_user_feedback.txt`](originals/phase_c_user_feedback.txt) |

Die gemessenen Checksummen wurden direkt aus den Nutzeruploads berechnet. Für die Git-Archivierbarkeit wurden die bytegleichen Git-Blob-Hashes unabhängig mit lokalem `git hash-object` ermittelt und vor Commit mit den über GitHub erzeugten Blob-IDs verglichen. **Die CRLF-Zeilenenden in Completion und Feedback bleiben erhalten.** Keine Screenshots für Phase C hochgeladen; die beiden Screenshots aus Phase B und die aus A liegen im selben User05-Ordner und bleiben unverändert.

## Konsistenzkontrollen

- Phase-C-Chat: 1 Metadatenzeile und **54 sichtbare Nachrichten** I0–I53; davon **26 Spielerinputs** und 28 Assistant-/System-/Storybeiträge.
- Phase-B-Präfix: **31/31** sichtbare Nachrichten mit dem vorigen Export inhaltlich identisch. Die Metadatenzeile ist durch den neueren Speicherstand aktualisiert; gleicher Chat-/Kampagnenschlüssel und Seed.
- Phase-C-Eventexport: **41** Gruppen für die Nachrichten mit Events, **341** einzelne Events. **41/41** Gruppen mit den im Chat gespeicherten `extra.avereth.events` identisch. Zuwachs zu Phase B: **13 Gruppen / 98 Events**.
- Phase-C-Completiondump: **26/26** vollständige Requests/Responses, alle `finish_reason:'stop'`. Rollen: **11 Planner/Intent**, **7 Narrator**, **8 Extractor** (ein Repair). Entsprechend keine zusätzlichen Boardcalls; **5 von 6** Intent-Planern für Folge-HUD-Aktionen werden wegen falsch verschachtelter `hud_binding` abgewiesen.
- **Gesamt** A+B+C: **64 physische Modellantworten** (23 Planner/Intent, 19 Narrator, 20 Extractor inkl. einer C-Reparatur, 2 Board). **64/64 `cached_tokens:0`**. Summierte *gemeldete Providerusage*: 772.826 Prompttokens, 17.785 Completiontokens, 790.611 gesamt.
- In den Dateien zielgerichtet auf typische `Authorization: Bearer`, `sk-...`, GitHub-PAT-, Private-Key- und Klartext-API-Key-Muster geprüft: **0 Treffer** in diesen Mustern. Das ist keine Garantie gegen beliebige andere Geheimnisformate. Die Originaltexte wurden nicht umgeschrieben.
- Kein PowerShell-/ST-Serverlog separat für diese Phase; der Completiondump ist ein vollständiger Mitschnitt der verwendeten Modellrequests und Antworten, kein umfassender Netzwerk- oder DOM-Zeitstempelbeweis.

**Befundgrenze:** Ein Extraktionsereignis `extract.applied` belegt den Engine-Weltabschluss des jeweiligen Storyzugs, aber nicht aus sich heraus, dass die ST-UI zu jedem früheren Millisekundenzeitpunkt den richtigen Status zeigte. Umgekehrt sind `action_error`-Hinweise nach I45 **modellseitige Verweigerungen des HUD-Vertrags** und keine fehlgeschlagenen Extractorabschlüsse.

[Gesamter User05-Ordner](README.md) · [Review Phase C](REVIEW_GPT_PHASE_C.md) · [Feedback Phase C](USER_FEEDBACK_PHASE_C_REVIEW.md) · [Phase B](SOURCE_MANIFEST_PHASE_B.md) · [Phase A](SOURCE_MANIFEST.md).