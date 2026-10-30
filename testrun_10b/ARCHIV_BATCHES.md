# Originaldateien der Batches 1–19

**Archiviert am 30.10.2026; Veröffentlichung vom Projektinhaber freigegeben.** Maßgeblicher Quellenindex für die Batch-Originaldateien. Reviews: [Runindex](README.md); nächste technische Arbeit: [Architektur-Fachplan](../patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md).

## Inhalt und Integrität

Alle **19** im Runindex besprochenen Batcharchive enthalten zusammen **787 Originaldateien**. Die ursprünglichen ZIPs umfassen **944,619,885 Bytes**; die verlustfreie TAR.XZ-Neuverpackung benötigt **70,883,940 Bytes** (rund 67.6 MiB).

- Alle regulären ZIP-Dateieinträge sind enthalten: Chats, Completion- und Serverlogs, Runnerdaten, Reports und sonstige Originaldateien. Keine Prosa, Events oder Modellantworten gekürzt.
- Jede entpackte Datei wurde nach der Neuverpackung gegen Größe und SHA-256 ihres ZIP-Originals geprüft. Zusätzlich wurde beim ZIP-Lesen die CRC geprüft.
- Der ZIP-Container selbst wird **nicht** byteidentisch archiviert. Sein ursprünglicher Dateiname, Umfang und SHA-256 stehen im Manifest; TAR-Zeitstempel/Dateimodi sind vereinheitlicht und leere Verzeichniseinträge entfallen. Die enthaltenen Dateibytes bleiben identisch.
- Vor Veröffentlichung wurden sämtliche enthaltenen Dateien auf typische Provider-/GitHub-Schlüssel, Bearer-Zugangsdaten, Schlüsselzuweisungen und JWT-Muster geprüft: keine Treffer. Eine Musterprüfung ist kein mathematischer Nachweis für die Abwesenheit jedes denkbaren Geheimnisformats.
- Es wurden keine neuen Engine-, Provider- oder natürlichen Spielläufe ausgeführt. Diese Archivprüfung ersetzt weder einen Event-Fold noch das geplante Verarbeitungs-Replay.

## Downloads

Die Archive liegen jeweils unter `original/` im vorhandenen Batchordner. Der Index ist chronologisch; die zugehörigen Originalreviews bleiben unverändert.

| Batch | Vollständige Originaldateien | Manifest / SHA-256 je Datei | Dateien | Archivbytes |
|---|---|---|---:|---:|
| 1: [batch-20261027-030034Z](batch-20261027-030034Z/REVIEW.md) | [TAR.XZ](batch-20261027-030034Z/original/batch-20261027-030034Z.tar.xz) | [MANIFEST.json](batch-20261027-030034Z/original/MANIFEST.json) | 79 | 3926860 |
| 2: [batch-20261027-073917Z](batch-20261027-073917Z/REVIEW.md) | [TAR.XZ](batch-20261027-073917Z/original/batch-20261027-073917Z.tar.xz) | [MANIFEST.json](batch-20261027-073917Z/original/MANIFEST.json) | 77 | 8616244 |
| 3: [batch-20261027-150205Z](batch-20261027-150205Z/REVIEW.md) | [TAR.XZ](batch-20261027-150205Z/original/batch-20261027-150205Z.tar.xz) | [MANIFEST.json](batch-20261027-150205Z/original/MANIFEST.json) | 40 | 4614432 |
| 4: [batch-20261028-022553Z](batch-20261028-022553Z/REVIEW.md) | [TAR.XZ](batch-20261028-022553Z/original/batch-20261028-022553Z.tar.xz) | [MANIFEST.json](batch-20261028-022553Z/original/MANIFEST.json) | 41 | 2765532 |
| 5: [batch-20261028-051913Z](batch-20261028-051913Z/REVIEW.md) | [TAR.XZ](batch-20261028-051913Z/original/batch-20261028-051913Z.tar.xz) | [MANIFEST.json](batch-20261028-051913Z/original/MANIFEST.json) | 38 | 5798968 |
| 6: [batch-20261028-101151Z](batch-20261028-101151Z/REVIEW.md) | [TAR.XZ](batch-20261028-101151Z/original/batch-20261028-101151Z.tar.xz) | [MANIFEST.json](batch-20261028-101151Z/original/MANIFEST.json) | 14 | 307988 |
| 7: [batch-20261028-111133Z](batch-20261028-111133Z/REVIEW.md) | [TAR.XZ](batch-20261028-111133Z/original/batch-20261028-111133Z.tar.xz) | [MANIFEST.json](batch-20261028-111133Z/original/MANIFEST.json) | 39 | 2951656 |
| 8: [batch-20261028-134108Z](batch-20261028-134108Z/REVIEW.md) | [TAR.XZ](batch-20261028-134108Z/original/batch-20261028-134108Z.tar.xz) | [MANIFEST.json](batch-20261028-134108Z/original/MANIFEST.json) | 27 | 545988 |
| 9: [batch-20261028-140431Z](batch-20261028-140431Z/REVIEW.md) | [TAR.XZ](batch-20261028-140431Z/original/batch-20261028-140431Z.tar.xz) | [MANIFEST.json](batch-20261028-140431Z/original/MANIFEST.json) | 39 | 2710552 |
| 10: [batch-20261028-165307Z](batch-20261028-165307Z/REVIEW.md) | [TAR.XZ](batch-20261028-165307Z/original/batch-20261028-165307Z.tar.xz) | [MANIFEST.json](batch-20261028-165307Z/original/MANIFEST.json) | 41 | 2780400 |
| 11: [batch-20261029-025441Z](batch-20261029-025441Z/REVIEW.md) | [TAR.XZ](batch-20261029-025441Z/original/batch-20261029-025441Z.tar.xz) | [MANIFEST.json](batch-20261029-025441Z/original/MANIFEST.json) | 40 | 2457448 |
| 12: [batch-20261029-055532Z](batch-20261029-055532Z/REVIEW.md) | [TAR.XZ](batch-20261029-055532Z/original/batch-20261029-055532Z.tar.xz) | [MANIFEST.json](batch-20261029-055532Z/original/MANIFEST.json) | 39 | 3811376 |
| 13: [batch-20261029-091447Z](batch-20261029-091447Z/REVIEW.md) | [TAR.XZ](batch-20261029-091447Z/original/batch-20261029-091447Z.tar.xz) | [MANIFEST.json](batch-20261029-091447Z/original/MANIFEST.json) | 39 | 4373848 |
| 14: [batch-20261029-131555Z](batch-20261029-131555Z/REVIEW.md) | [TAR.XZ](batch-20261029-131555Z/original/batch-20261029-131555Z.tar.xz) | [MANIFEST.json](batch-20261029-131555Z/original/MANIFEST.json) | 38 | 4925212 |
| 15: [batch-20261029-174048Z](batch-20261029-174048Z/REVIEW.md) | [TAR.XZ](batch-20261029-174048Z/original/batch-20261029-174048Z.tar.xz) | [MANIFEST.json](batch-20261029-174048Z/original/MANIFEST.json) | 40 | 3254868 |
| 16: [batch-20261030-002939Z](batch-20261030-002939Z/REVIEW.md) | [TAR.XZ](batch-20261030-002939Z/original/batch-20261030-002939Z.tar.xz) | [MANIFEST.json](batch-20261030-002939Z/original/MANIFEST.json) | 39 | 3938340 |
| 17: [batch-20261030-040258Z](batch-20261030-040258Z/REVIEW.md) | [TAR.XZ](batch-20261030-040258Z/original/batch-20261030-040258Z.tar.xz) | [MANIFEST.json](batch-20261030-040258Z/original/MANIFEST.json) | 38 | 4686632 |
| 18: [batch-20261030-082423Z](batch-20261030-082423Z/REVIEW.md) | [TAR.XZ](batch-20261030-082423Z/original/batch-20261030-082423Z.tar.xz) | [MANIFEST.json](batch-20261030-082423Z/original/MANIFEST.json) | 39 | 4667028 |
| 19: [batch-20261030-133348Z](batch-20261030-133348Z/REVIEW.md) | [TAR.XZ](batch-20261030-133348Z/original/batch-20261030-133348Z.tar.xz) | [MANIFEST.json](batch-20261030-133348Z/original/MANIFEST.json) | 40 | 3750568 |

## Prüfen und entpacken

Mit Python ab Version 3.9, ohne zusätzliche Pakete, im `main`-Checkout:

```powershell
python testrun_10b/verify_batch_archive.py testrun_10b/batch-20261030-133348Z/original/MANIFEST.json --extract ./batch19-original
```

Das Ziel muss leer sein. Ohne `--extract` werden nur Archiv und sämtliche Originaldatei-Prüfsummen geprüft. Alternativ lässt sich TAR.XZ mit einem geeigneten Archivprogramm entpacken. Für einen Review nur die benötigten Batches laden; laufende Produkt-/Batchcheckouts nicht dafür umstellen.

## Herkunft und Quellenstatus

Quelle sind die vom Nutzer bereitgestellten ZIPs. Bei mehrfach hochgeladenen gleichnamigen Archiven wurde eine konkret verfügbare Fassung gewählt; exakt diese ist mit ZIP-Hash dokumentiert. Der Inhalt älterer Reviews wurde nicht nachträglich geändert. Deren Aussagen „nur Chatupload“ beziehungsweise „ZIP fehlt“ gelten für den damaligen Prüfzeitpunkt; ab dieser Archivierung sind die enthaltenen Originaldateien hier verfügbar.

Einzelruns außerhalb der Batchreihe behalten ihren im Runindex angegebenen Quellenstatus. Es wird weder behauptet, deren fehlende ZIPs ebenfalls archiviert zu haben, noch dass irgendein alter Run bereits mit dem neuen Architekturplan ausgeführt wurde.
