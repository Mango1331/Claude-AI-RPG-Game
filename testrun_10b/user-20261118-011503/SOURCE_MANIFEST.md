# Originalmanifest – User05, Zwischenstand A (.202)

**Erster Export:** `Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms.jsonl`. Alle sechs Originale (vier Textdateien und zwei PNG-Screenshots) wurden mit der Git-Blob-SHA des hochgeladenen Byteinhalts abgeglichen; Zeilenenden und Bildbytes nicht geändert. Sie liegen auf GitHub sowie zusätzlich im separat bereitgestellten vollständigen Originalbundle.

| Hochgeladenes Original | Bytes | Original SHA-256 | Archiv auf main |
|---|---:|---|---|
| `Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms.jsonl` | 181777 | `125adfaa6da20e61e7c6cd4082480fb281ce50a0f7cb167ddb3906de973e1b33` | [`originals/chat.jsonl`](originals/chat.jsonl) |
| `avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-18@01h15m03s850ms_].json` | 63480 | `a7cba6daf33fad9a98243cdf009b8c7a2449b5a59a3c09463e326530db562148` | [`originals/events.json`](originals/events.json) |
| `Chat Completion request {(20261118-002629).txt` | 967600 | `b8d7e49b2f96c259174fd1ccb0f1fe9d480e18b2cbda28997faaecff5aac3f72` | [`originals/completions.txt`](originals/completions.txt) |
| `Userfeedback Spielgefühl(3).txt` | 1263 | `0ff00ba6e43427fff0921243a9b16fa6bfd9dfb714544667c20512c5aa62afae` | [`originals/user_feedback.txt`](originals/user_feedback.txt) |
| `image(20261118-002612).png` | 53088 | `3ad70266f978f38503dfebaa4368f142aadd427c51d5ff5dffa2f621d8d14b2c` | [\`screenshots/action_composer_guild.png\`](screenshots/action_composer_guild.png) |
| `image(20261118-002620).png` | 58832 | `0bb3e7a0e5d4d86dee77e9476e98aedcf430adf2dad44ae946714963ec29d72a` | [\`screenshots/action_dropdown_items.png\`](screenshots/action_dropdown_items.png) |

**Screenshots – Bildbelege:**

- **S1 / 00:26:12:** World-HUD „Day 1, 09:15 – Glassmere – Adventurers’ Guild hall“, darunter dauerhaft große Auswahlzeile mit Aktion-/Ziel-Dropdowns, Checkbox für Annäherung, Auswahlknopf, H/F-Hilfetext und Weltabgleich-/Retryzeile.
- **S2 / 00:26:20:** Geöffnete Aktionsliste mit Basic Attack, Flame Lance, Arcane Wave sowie mehrfach Guild plate, Guild contract slip und Small Pouch; das Dropdown mischt Fähigkeiten mit nicht direkt verwendbaren Dokumenten/Behältern.

**Audit und Grenzen:** JSONL enthält **einen Metadatenheader und 15 sichtbare Chatnachrichten**; der Eventexport indexiert diese ab I0 nach dem Header. Alle **13** Eventgruppen entsprechen byteunabhängig strukturell exakt den Chatrecord-Events, insgesamt **90 Events**. Der Completionmitschnitt enthält 17 Request-/Responsepaare (fünf P, fünf N, fünf X, zwei Board); API-Key-/Bearer-/Secret-Muster wurden lokal gescannt, **keine Treffer** in den geprüften Mustern. Das ersetzt keine Garantie für beliebige unbekannte Geheimnisformate. Originaltexte enthalten keine künstlichen Lücken, Rewrites oder geschätzten Calls. **Keine zusätzlichen ST-Serverlogs** wurden für User05 geliefert; der Completiondump ist ein Request-/Antwortmitschnitt, kein PowerShell-Serverlog.

**Fortsetzung:** Weitere Exporte und Feedback vom *gleichen Test* später unter neuen Originaldateinamen im selben Ordner archivieren, ohne diese sechs Quellen zu überschreiben. Review als Phase B ergänzen und Astra-Gegenreview erst nach vollständiger natürlicher Questphase.
