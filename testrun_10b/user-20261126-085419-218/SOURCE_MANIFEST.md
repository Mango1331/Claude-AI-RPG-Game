# Quellenmanifest User15 (.218)

Alle vier hochgeladenen Dateien wurden im GPT-Arbeitscontainer als Originalbytes gelesen. SHA-256 lokal berechnet. Chat-Events für sämtliche 99 exportierten Nachrichtenrecords exakt gleich, 979 Events. Windows-Benutzername in genau einer Logpfadangabe redigiert; UTF-16LE/BOM/CRLF erhalten. Mustercheck auf typische Provider-/GitHub-Schlüssel, Bearer und Credential-Zuweisungen ohne Treffer; kein Anspruch auf vollständige Datenschutzprüfung.

| Originaldatei | Bytes | SHA-256 | Ziel/Status |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-26@08h54m19s256ms (1).jsonl | 1709137 | a0f915366c61b6578e77a71233e9c753dac939e52d6f9900273ba6c7765505e3 | originals/chat.jsonl – Import offen |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-26@08h54m19s256ms_] (1).json | 613446 | 7b083bd51b494f568c093e033bcac069bed89e589f2439028c6f7e6c0ebe439b | originals/avereth-events.json – Import offen |
| Userfeedback Spielgefühl(20261126-142012).txt | 1404 | 03be539fef169c9f5f68d7ac52c913b0ec0385f00fb86fc3781d338076182121 | originals/feedback.txt – Git-Blob de2a131f456b746518fa103f50fb3cbd1b6dafae, lokal verifiziert |
| ST_2026-11-26_08-53-39.txt | 16405158 | 2905ad328b377cd54affe444b47618c5f21ac34ecea47f1162a1f0affa71ccf0 | originals/st-log.txt.gz – redigiert, Import offen |

Redigiertes ST-Log: 16405168 Bytes, SHA-256 3d0c6628acf7070df2f00f59aff2f80e47df00e028c708009bc0ecedf491cceb. Gzip-Datei SHA-256 feff479902fefcc083981182bec72e643b249910659570008d4777e9f5bb9c6a.

**Transportblocker:** Direkter Git-Zugriff im GPT-Container schlägt an DNS fehl; der GitHub-Connector kann die lokalen großen Dateien nicht unmittelbar als Binärpayload übernehmen. Deshalb liegt im Chat ein vollständiges geprüftes Importpaket Avereth_Usertest15_218_Quellenimport.zip (3560277 Bytes), mit ausschließlich diesem Runordner. Feedback und Dokumente sind separat über den Connector gesichert. Keine Behauptung einer vollständigen Remote-Archivierung.

Import: ZIP in Wurzel des vorhandenen Repository-Checkouts auf main entpacken (nur Dateien dieses Runordners). Vor Übernahme HEAD/Arbeitsbaum prüfen; keine fremden Änderungen überschreiben. Im Runordner `python restore_log.py` bzw. `py restore_log.py` ausführen; alle vier Quellen müssen PASS ergeben. `--restore` rekonstruiert das redigierte UTF-16-Log in einem temporären Ordner außerhalb des Repos. .gitattributes schützt Originalbytes. Commit nur des eigenen Runordners, regulärer Push, Remote verifizieren, Importstatus in README/Manifest vervollständigen. Prüfsummenprüfung wurde lokal bereits erfolgreich ausgeführt.
