# Archivinhalt – Testlauf 20261024-030002Z-current_test

Der [ausführliche Review](REVIEW.md) bezieht sich auf das unveränderte ursprüngliche Runner-Archiv. GitHub enthält hier eine **entpackte und datensparsam veröffentlichte Kopie**, keine byteidentische Wiedergabe sämtlicher ZIP-Einträge.

## Vollständig in Git vorhandene Testdaten

- `avereth-events.json` – autoritative Engine-Ereignisse
- `calls.json` – Aufrufmetadaten
- `chat.jsonl` – Chatverlauf mit Engine-Records
- `evaluation.json` – automatische Runner-Auswertung
- `player.jsonl` – Entscheidungsprotokoll des Testspielers
- `report.md` – automatisch erzeugter Runner-Bericht
- `run.json` – Laufdetails, Zeiten, Status
- `screens/final.png`, `screens/turn-026-defeat.png` – die zwei originalen Screenshots
- `chat-completions.part-01.jsonl` bis `part-06.jsonl` – Modell-Rohantworten vollständig nach JSONL-Zeilengrenzen aufgeteilt, da große einzelne Dateien vom GitHub-Zugang nicht angenommen werden
- `server.part-01.log` bis `part-06.log` – vollständiges normales Serverlog ebenfalls an Zeilengrenzen aufgeteilt

Die nummerierten Parts enthalten **alle** Bytes der jeweiligen datenschutzbereinigten Textdatei in Reihenfolge. Sie wurden nicht zusammengefasst.

## Bewusst nicht im öffentlichen Git

- **Original-ZIP** `20261024-030002Z-current_test.zip`: unverändert im Nutzerexport aufbewahrt; SHA-256 `10e86d8d77ea967918fb13cff8c1054ae1baccc6e77692bd1b83468da12b461c`
- **`import.json`**: vollständige persönliche SillyTavern-Profil-/Konfigurationseinstellungen einschließlich Verbindungsmetadaten und Promptkonfiguration; aus Vorsicht nicht veröffentlicht
- **`server.timed.log`**: zweite, zeitgestempelte Fassung des bereits vorhandenen normalen Serverlogs; zur Vermeidung doppelter Rohdaten nicht veröffentlicht

Alle veröffentlichten Textdateien sind bei Bedarf gemäß [SANITIZATION.md](SANITIZATION.md) für lokale Benutzernamen und E-Mail-Adressen maskiert. Sonstige Kampfevents, Quests, Timestamps und Ressourcenwerte wurden nicht umgerechnet oder nachträglich korrigiert.

## Zusammensetzen der geteilten Logs

Im Testordner unter PowerShell:

```powershell
$names = @("chat-completions", "server")
foreach ($name in $names) {
  $ext = if ($name -eq "server") { "log" } else { "jsonl" }
  $target = Join-Path (Get-Location) "$name.$ext"
  $output = [System.IO.File]::Create($target)
  try {
    $parts = Get-ChildItem "$name.part-*.$ext" | Sort-Object Name
    foreach ($part in $parts) {
      $data = [System.IO.File]::ReadAllBytes($part.FullName)
      $output.Write($data, 0, $data.Length)
    }
  } finally { $output.Dispose() }
}
```

SHA-256 **der datenschutzbereinigten zusammengesetzten Dateien**:
- `chat-completions.jsonl`: `3df608a11f560575b1a4bbcaadf04e940ee217bec1226aca26a6905ee3500e6f`
- `server.log`: `43a7130b9387547b12867b05c03c7deec2a9457934ff49db6df2b5b98d717082`

Damit ist die Analyse öffentlich reproduzierbar, ohne die vollständige private ST-Profilkonfiguration zu veröffentlichen.