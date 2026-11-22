# Originalarchiv Batch 22

Das vollständige unveränderte Uploadarchiv `batch-20261101-174704Z.zip` liegt hier in **acht binären Teilen** unter `parts/`. Es handelt sich nicht um acht unabhängige ZIPs. Die Teile wurden nicht neu gepackt; ihre Verkettung ergibt bytegenau den Upload.

- Größe: **61.070.612 Bytes**.
- SHA-256: `ce1bb79b3a6d7ea312c8f2406feb66daebb9c35b8d752e3b7ac2f48c2b513406`.
- 41 Originaldateien; CRC-Prüfung aller ZIP-Einträge erfolgreich.
- [MANIFEST.json](MANIFEST.json) enthält Datei-, Teil- und Gesamthashes.
- `batch.json`, `report.md` und die drei jeweiligen `run.json`, `evaluation.json`, `report.md` liegen zusätzlich unverändert lesbar im Ordner. Chats, Completions, Events, Screenshots und Serverlogs sind vollständig im zusammensetzbaren Originalarchiv enthalten. [Unabhängiger Review](REVIEW.md).

Nach dem Klonen des Repositories diesen Ordner öffnen und ausführen:

```powershell
python reassemble.py
```

Das Skript kontrolliert jeden Teil und anschließend die fertige ZIP inklusive aller CRCs. Eine bereits bestehende Zieldatei wird nicht überschrieben. Es extrahiert keine Dateien und benötigt keine Drittanbieterpakete. Bei Bedarf danach die ZIP mit einem üblichen Archivprogramm entpacken.

Alternativ unter Bash, im selben Ordner:

```bash
cat parts/batch-20261101-174704Z.zip.part{01..08} > batch-20261101-174704Z.zip
sha256sum batch-20261101-174704Z.zip
```

Den Ausgabehash mit obigem SHA-256 vergleichen. Einzelteile allein lassen sich nicht entpacken. Originalberichte sind automatisch erzeugte Runnerausgaben; ihre Erfolgsmarkierungen ersetzen die technische Einordnung in `REVIEW.md` nicht.
