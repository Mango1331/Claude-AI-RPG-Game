# Quellenmanifest – User05 .202, Phase B (zweiter Export)

**18.11.2026, gleicher persönlicher Test.** Alle sechs zusätzlichen Originale wurden vor Archivierung mit Original-SHA-256 und Git-Blob-SHA der bytegleichen Daten verglichen. Die beiden Screenshots sind unveränderte PNG-Binärdateien, keine skalierten Ersatzbilder. Der neue Chat-/Eventexport enthält Phase A bereits; kumulative Zahlen nicht durch Addition beider Gesamtexporte bestimmen.

| Hochgeladenes Original Phase B | Bytes | SHA-256 des Originals | Datei auf main |
|---|---:|---|---|
| `Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms (1).jsonl` | 453.662 | `57606e757f8b273e4371a9e1b14767e2349a8fbd12d8c711b2211312c5bf4523` | [originals/phase_b_chat.jsonl](originals/phase_b_chat.jsonl) |
| `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms_] (1).json` | 185.473 | `3676f3b1b54e5d20f4581cca326d83b5327180eebc05fd815a638434e01a5432` | [originals/phase_b_events.json](originals/phase_b_events.json) |
| `Chat Completion request {(20261118-005523).txt` | 1.270.250 | `5c0effe233aeb59b1b33e3d3d706b7576db5781b855fa96988a311e3453e4fe5` | [originals/phase_b_completions.txt](originals/phase_b_completions.txt) |
| `Userfeedback Spielgefühl(4).txt` | 1.227 | `248cf8c6bebd422fab6335d7fd074b0dd82805ef77ee9979bc67e2a76494908e` | [originals/phase_b_user_feedback.txt](originals/phase_b_user_feedback.txt) |
| `image(20261118-004908).png` | 29.586 | `8d2a5da2f3b2a8ebf2ffb7466639813c4fdd55584b6a874ba0b87fd7f203068e` | [screenshots/action_mode_FH.png](screenshots/action_mode_FH.png) |
| `image(20261118-004914).png` | 52.848 | `7752382e94aab09345ffe4dc1047183f5305bff6fedb35c4a792178331983205` | [screenshots/precombat_target_ids.png](screenshots/precombat_target_ids.png) |

## Prüfungsumfang

- **Chat:** eine Metadatenzeile plus **31 sichtbare Nachrichten** I0–I30; 15 Nutzernachrichten, 16 Assistentenantworten inkl. Start- und Creation-Systempanels. Die 15 früheren sichtbaren Nachrichten I0–I14 sind gegenüber Phase A unverändert; nur der Metadatenheader wurde durch ST fortgeschrieben.
- **Events:** 28 Gruppen, **243 einzelne Events**. 28/28 Gruppen stimmen strukturell mit dem entsprechenden eingebetteten Eventarray im Chat überein. Die 13 Phase-A-Gruppen (90 Events) sind unverändert enthalten. Netto: 15 neue Gruppen, 153 neue Events, 8 weitere Spielerinputs.
- **Completionlog Phase B:** 21 physische Requests und 21 Antworten (7 P / 7 N / 7 X), alle `finish_reason:stop`. Dieser Log enthält **nur Phase B**. Zusammen mit dem Phase-A-Log mit 17 Calls sind **38 Calls kumulativ** (12 P / 12 N / 12 X / 2 Board).
- **Einzeldeltas:** ein abgewiesener Dungeonweg I20; drei abgewiesene Kampfbands-/Position-Claims I24. Alle sieben Phase-B-Extractorberichte sind `applied`. Ein weiterer einzelner Identitätsdelta-Reject stammt aus Phase A (I8).
- **Secrets-Screen:** Der Completionmitschnitt und Chat wurden lokal gezielt auf API-Key-/Bearer-/GitHub-Token-/Private-Key-Muster geprüft: **keine Treffer**, keine Garantie für sämtliche denkbaren Schlüssel-/Geheimnisformate. Es liegt **kein gesonderter ST-Serverlog** vor.
- **Bild S3:** F/H-Moduswahl bei HUD-Aktion, der Modus F ist ausgewählt; eine rohe Monster-ID im Chip.
- **Bild S4:** vor dem Encounter geöffnete Zielauswahl mit vier `mon.glimmerdeep_...`-IDs statt Spielernamen.

**Hinweis zur Fortsetzung:** Phase A [Manifest](SOURCE_MANIFEST.md) und Originale nicht verändern. Neue Exporte später als Phase C mit eigener Prüfsummenliste und eigenem Kurzreview hinzufügen. Danach Gesamt-GPT-Review und Astra-Gegenreview, nicht jetzt.