# Quellenmanifest User15 (.218)

Alle vier hochgeladenen Dateien wurden im GPT-Arbeitscontainer als Originalbytes gelesen. SHA-256 lokal berechnet. Chat-Events für sämtliche 99 exportierten Nachrichtenrecords exakt gleich, 979 Events. Windows-Benutzername in genau einer Logpfadangabe redigiert; UTF-16LE/BOM/CRLF erhalten. Mustercheck auf typische Provider-/GitHub-Schlüssel, Bearer und Credential-Zuweisungen ohne Treffer; kein Anspruch auf vollständige Datenschutzprüfung.

| Originaldatei | Bytes | SHA-256 | Ziel/Status |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-26@08h54m19s256ms (1).jsonl | 1709137 | a0f915366c61b6578e77a71233e9c753dac939e52d6f9900273ba6c7765505e3 | originals/chat.jsonl – archiviert |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-26@08h54m19s256ms_] (1).json | 613446 | 7b083bd51b494f568c093e033bcac069bed89e589f2439028c6f7e6c0ebe439b | originals/avereth-events.json – archiviert |
| Userfeedback Spielgefühl(20261126-142012).txt | 1404 | 03be539fef169c9f5f68d7ac52c913b0ec0385f00fb86fc3781d338076182121 | originals/feedback.txt – Git-Blob de2a131f456b746518fa103f50fb3cbd1b6dafae, lokal verifiziert |
| ST_2026-11-26_08-53-39.txt | 16405158 | 2905ad328b377cd54affe444b47618c5f21ac34ecea47f1162a1f0affa71ccf0 | originals/st-log.txt.gz – redigiert, archiviert |

Redigiertes ST-Log: 16405168 Bytes, SHA-256 3d0c6628acf7070df2f00f59aff2f80e47df00e028c708009bc0ecedf491cceb. Gzip-Datei SHA-256 feff479902fefcc083981182bec72e643b249910659570008d4777e9f5bb9c6a.

**Archivprüfung durch Codex.** Das Quellenimport-ZIP (3.560.277 Bytes) enthielt die sieben erwarteten Dateien. Die drei unredigierten Quellen stimmen in Länge und SHA-256 mit den Originaleinträgen überein. Für das Log stimmen SHA-256 des gzip-Archivs sowie Länge und SHA-256 der rekonstruierten redigierten Fassung. Der Hash des unredigierten ursprünglichen Logs ist Herkunftsangabe aus dem Erstimport. Diese privaten Originalbytes liegen im ZIP nicht vor und wurden im Gegenreview nicht erneut gehasht.

Im Runordner prüft `python restore_log.py` alle vier archivierten Quellen. Mit `--restore` entsteht die redigierte UTF-16-Fassung in einem temporären Ordner. Beide Fassungen des archivierten Logs wurden gegen [source_checksums.json](source_checksums.json) geprüft. Das vorhandene Spielerfeedback ist mit dem ZIP-Eintrag byteidentisch.
