# User18 (.265) · Offline-Reproduktion und Gegenproben

Zum [Gegenreview](../AVERETH_USER18_265_CLAUDE_GEGENREVIEW.md). Kein Providerrequest, keine Produktänderung. Die `*.analysis.diff` sind Machbarkeitsbelege hinter `U18_FIX=1`, kein Produktpatch.

| Datei | Zweck |
|---|---|
| `st_answers18.py` | ordnet die 37 physischen Antworten des ST-Logs den Chatnachrichten zu (Erzählungen textgleich, Prompttokens geprüft; M30 = gespeicherter Record von M29) |
| `replay_chat.mjs` | treue Reproduktion durch die echte Runtime; optional mit Adapter (`answer`, `extra`, `stopAt`, `prose`, `append`) |
| `adapt18_across_null.mjs` | Kontrolle: nur `across` der T10-Kreaturen auf null |
| `adapt18_invites.mjs` | M15 mit synthetischen NPC-Entscheidungen (`U18_SERA=decline`) |
| `adapt18_talk.mjs` | stoppt nach einer Nachricht (`U18_STOP`) zur Prüfung der Planner-Auflösung |
| `continue18.mjs` | Fortsetzung auf dem Originalsave: M29+ entfernen, M28 bearbeiten, re-extrahieren |
| `reextract.mjs`, `reextract_prose.mjs` | eine gespeicherte X-Antwort auf dem Originalpräfix neu anwenden (optional mit Prosaänderung) |
| `board18.mjs` | erste Boardantwort mit und ohne `habitat.place` gegen die echte Boardanforderung |
| `scan_across.py` | alle Archive auf `creature.new.across` und Ort/Ergebnis durchsuchen |

```bash
A=../../testrun_10b/user-20261128-163231-265
python3 -I $A/restore_log.py --restore                   # Pfad des redigierten Logs
gunzip -c $A/originals/chat.jsonl.gz > chat.jsonl
python3 -I st_answers18.py chat.jsonl <redigiertes-log> > answers.json
node replay_chat.mjs <engine-root> chat.jsonl answers.json -               # 27/27 eventgleich
U18_FIX=1 node replay_chat.mjs <analyse-root> chat.jsonl answers.json -    # mit angewandten Analyse-Diffs
```

`<engine-root>`: `avereth-engine` auf `9dde24a5`; `<analyse-root>`: Kopie mit den drei Diffs. Die Redaktion betrifft nur den Logkopf.
