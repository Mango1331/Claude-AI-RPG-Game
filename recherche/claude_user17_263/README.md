# User17 (.263) · Offline-Reproduktion und Gegenproben

Zum [Gegenreview](../AVERETH_USER17_263_CLAUDE_GEGENREVIEW_ORTSIDENTITAET.md). Kein Providerrequest, keine Produktänderung.

| Datei | Zweck |
|---|---|
| `st_answers.py` | ordnet die 28 physischen Antworten des ST-Logs den Chatnachrichten zu (prüft Erzählungen und Prompttokens) |
| `replay17.mjs` | spielt den Chat durch die echte Runtime eines Engine-Verzeichnisses; meldet je Schritt Eventgleichheit, GO-Felder, Ankünfte, Ablehnungen, Zeit |
| `probes.mjs` | Gegenproben P1–P13 (Auswahl über `U17_PROBE`) |
| `adapt_A_gate_identity.mjs` | Kette A: nur T9-X kanonisch |
| `adapt_B_recover_T11.mjs`, `adapt_B2_flip.mjs` | Kette B/B2: falscher Zustand, T11 mit Dungeon-ID |
| `variant_B_target_identity.analysis.diff` | Analyseprototyp Variante B (hinter `U17_VARIANT=B`), kein Produktpatch |
| `dump.py` | lesbare Übersicht eines Chatbereichs (Befehle, Freigaben, Deltas, Ablehnungen) |

```bash
A=../../testrun_10b/user-20261128-051828-263
python3 -I $A/restore_log.py --restore            # gibt den Pfad des redigierten Logs aus
python3 -I st_answers.py $A/originals/chat.jsonl <redigiertes-log> > answers.json
node replay17.mjs <engine-root> $A/originals/chat.jsonl answers.json -            # treue Reproduktion
U17_ANSWERS=$PWD/answers.json U17_PROBE=P1 node replay17.mjs <engine-root> $A/originals/chat.jsonl answers.json probes.mjs
```

`<engine-root>` ist ein `avereth-engine`-Verzeichnis auf `928172b9`; für B eine Kopie mit angewandtem Diff und `U17_VARIANT=B`. Die Redaktion ändert nur den Logkopf; die Antwortzuordnung ist davon unberührt.
