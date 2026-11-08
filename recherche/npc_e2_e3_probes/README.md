# Read-only-Proben zur NPC-E2/E3-Istanalyse (08.11.2026)

Diese Skripte sind die Proben, die für die [Istanalyse](../NPC_E2_E3_ISTANALYSE_20261108.md) tatsächlich ausgeführt wurden. Sie lesen den Produktcode und die Originalläufe. Sie schreiben **keine** Produkt-, Test- oder Akzeptanzdatei und machen **keinen** Modellaufruf. Sie sind kein Bestandteil der Produktsuite.

**Aufruf:** Produktbranch (hier `8c7ee1f`, Build .168) als Worktree auschecken, `main` als zweiten Worktree, dann:

```bash
ENG=<produkt-worktree>/avereth-engine MAIN=<main-worktree> node probe_u04.mjs
```

`probe_context.mjs` braucht zusätzlich `RUN=<pfad zur .jsonl oder .jsonl.gz>` und `IDX=<indices, kommagetrennt>`.

| Skript | Methode (Analyse §1) | Inhalt |
|---|---|---|
| `probe_context.mjs` | 2 – `turnBlock` | Erzählerblock wie der aktuelle Kontextcode ihn liefern würde: gelieferte/verworfene Abschnitte, NPC-IDs, `budgetedTokens`, Auszüge `CURRENT INTERLOCUTORS` / `KNOWN PEOPLE` / `KNOWN AT` (Budget 1400 / Regeln 800) |
| `probe_u04.mjs` | 1 – Fold | User04: Events, Ablehnungen und historische E0 je Index; NPC-Endzustand, Threads |
| `probe_evidence.mjs` | 3 – Belegfunktionen | User04 I72 `presenceInReply` für Schreiber/Crossbowman; I64 `guildParticipationEvidence` auf Originalprosa und Kontrollsatz; I6 Sammelperson |
| `probe_i73.mjs` | 1 – Fold | User04 Annahme I73: Quest-, Fakt- und Wissensevents |
| `probe_clerks.mjs` | 1 – Fold | User04 Wissen der Schreiber/wiry woman/Crossbowman; Erinnerungen und Fakten I64–I74 |
| `probe_tam.mjs` | 1 – Fold | User02 Tam: Erinnerungen, Wissen, Fakten, Threads, abgelehnte soziale Deltas |
| `probe_promises.mjs` | 4 – Zählung | User02/User01: `promise`-Threads, absprachenartige Fakten, abgelehnte Erinnerungen/Threads |
| `probe_preds.mjs` | 4 – Zählung | User01/02/04: NPC-Anzahl, bedeutsame Erinnerungen, `attitude`-Events, Faktprädikate |
| `probe_keep.mjs` | 5 – lokale Reproduktion | User04 nach I71: synthetisches `person.new` eines anders beschriebenen Schreibers (→ `keptHere`) und `enter` der am Zielort gelassenen Personen ohne Beleg, jeweils mit `replyTurnV4` auf der Originalprosa I72 |

**Lesart:** Fold zeigt historisch gespeicherte Events. `turnBlock` zeigt den heutigen Kontextcode auf diesem historischen Zustand. Beides ist kein neuer natürlicher Lauf.
