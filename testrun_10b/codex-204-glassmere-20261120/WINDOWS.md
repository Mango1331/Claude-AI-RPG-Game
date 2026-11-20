# Update in einer bestehenden Windows-Installation

1. SillyTavern beenden. Den aktiven Extensionordner, die bisherige Charakterkarte und den bestehenden Chat sichern. In PowerShell im vorhandenen SillyTavern-Stammordner starten. Das Beispiel verwendet das Profil `default-user`. Bei eigenem Benutzernamen oder abweichender Datenwurzel den Pfad anpassen. Bei einer global installierten Avereth-Extension ausschließlich deren tatsächlichen Ordner aktualisieren.
2. Den geprüften Build holen und die Laufzeitdateien in den bestehenden Extensionordner kopieren. Die Befehle verwenden einen neuen temporären Checkout. Sie wurden anhand des Linux-Testprofils geprüft, auf Windows nicht ausgeführt.

```powershell
$ErrorActionPreference = 'Stop'
$src = Join-Path $env:TEMP ("avereth-204-" + [guid]::NewGuid())
$dst = Join-Path $PWD 'data\default-user\extensions\avereth-engine'
if (!(Test-Path (Join-Path $dst 'manifest.json'))) { throw 'Aktiven Avereth-Ordner angeben.' }
git clone --single-branch --branch experiment/204-b-playtest-ready https://github.com/Mango1331/Claude-AI-RPG-Game.git $src
if ($LASTEXITCODE -ne 0) { throw 'Checkout fehlgeschlagen' }
git -C $src checkout --detach b51e850bfa233b32f10ba01c563002ab26061c85
if ($LASTEXITCODE -ne 0 -or (git -C $src rev-parse HEAD) -ne 'b51e850bfa233b32f10ba01c563002ab26061c85') { throw 'Build prüfen' }
$engine = Join-Path $src 'avereth-engine'
foreach ($name in 'manifest.json','index.js','style.css','src','content','regex') {
  Copy-Item -Path (Join-Path $engine $name) -Destination $dst -Recurse -Force
}
```

3. ST 1.19 mit `Start.bat` starten, den Browser vollständig neu laden und unter „Manage extensions“ **4.3.0-c.6.6.204** prüfen. In einer Kopie der Avereth-Karte die **Description** vollständig aus `$engine\content\narrator\Avereth_Narrator_Contract_v4.txt` einsetzen. Die Begrüßung der V4-Karte beibehalten. `$engine\lorebook\Avereth_World_Lore_v0.14.json` als Character Lore verknüpfen. Das originale Chat-Completions-Preset `$engine\presets\Avereth Narrator V4.json` laden.
4. Native Streaming **ein**, „Smooth Streaming“ **aus**, „Compact extractor JSON (experiment)“ **aus**. Für dieselbe Modellumgebung wie im Lauf OpenRouter, GLM-5.3-Flash (`z-ai/glm-5.3-flash`), Wafer US ohne Fallback, Reasoning `low`, Narrator 0,9 / Top-p 0,95, 4.096 Ausgabetokens und Kontext 131.072 verwenden. Die Loopback-Adresse des Codex-Testproxys ist nur innerhalb der Sandbox gültig. Mit der konfigurierten lokalen Verbindung einen neuen V4-C-Testchat starten.
