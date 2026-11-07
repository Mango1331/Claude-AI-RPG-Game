# Quellenmanifest – User04 (.159)

**Runstart 06.11.2026 07:26:40, eingereicht/geprüft 07.11.2026.** Alle vier gelieferten Originale sind vollständig archiviert. Chat, Events und großer ST-Log wurden ausschließlich mit Gzip verlustfrei verpackt; keine Kürzung, Zeichenreparatur oder Umformatierung der Originalbytes. Feedback liegt unverändert als UTF-8-Text vor. Dekompression und SHA-256-Vergleich wurden für jede Datei tatsächlich geprüft.

| Originaldatei | Originalbytes | SHA-256 der Originalbytes | Archiv |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-06@07h26m40s980ms.jsonl | 1,244,835 | `e9ad13dd241751dcf62d5fbdb76718f929f7e08df4913d4e9a5ac5b373cb86d6` | [originals/chat.jsonl.gz](originals/chat.jsonl.gz) |
| avereth-events-Avereth Engine Test v4 - 2026-11-06@07h26m40s980ms.json | 392,858 | `ceabc66fad26234f87d6b20bf0e8009aa627143a57e4affa4099827cb16bc514` | [originals/events.json.gz](originals/events.json.gz) |
| Userfeedback Spielgefühl(1).txt | 3,156 | `9b078b696e8190fa68733114181aea30a560ade44f19dc0b71237a430d1aed5f` | [originals/user_feedback.txt](originals/user_feedback.txt) |
| ST_2026-11-06_07-26-13.txt | 14,579,616 | `b2b30a4e43382d379e501491791aa30b2b99ac5d3a142dcdead0b383483ba086` | [originals/serverlog.txt.gz](originals/serverlog.txt.gz) |

`gzip -dc originals/chat.jsonl.gz` bzw. entsprechende Datei lesen/entpacken. Der Serverlog ist **UTF-16LE mit BOM**; erst nach Dekompression korrekt als UTF-16 lesen. Für den Requestvergleich wurden die PowerShell-Codepageartefakte ausschließlich in der lokalen Analyseansicht korrigiert. Originalnamen, komprimierte Größen und zusätzliche Archivhashes stehen in [PROBE_RESULTS.json](PROBE_RESULTS.json).

**Indexregel:** I0 ist die erste sichtbare Chatnachricht; JSONL-Metadaten davor nicht mitzählen. 78/78 Eventexportgruppen sind strukturell identisch mit den entsprechenden eingebetteten Chatevents. Der Log enthält auch zwei nicht im finalen Chat behaltene Narratorvarianten; finale Spielzüge und komplette Logkosten werden getrennt ausgewiesen.

**Datengrenze:** Gezielt gescannte API-Key-/Bearer-/Private-Key-Muster ohne Treffer. Keine vollständigen Requestkopien als zusätzliche Reviewartefakte. Lokale Server-/Chatnamen im Original bleiben Originalbelege; keine Produktdateien geändert.
