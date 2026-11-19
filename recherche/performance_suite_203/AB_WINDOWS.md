# Persönlicher A/B-Spieltest unter Windows

**Vorbereitung für den Gegenreview.** Die Auswahl der Varianten, die konkreten Eingaben und der Start des persönlichen Tests liegen beim Nutzer. Die folgenden Befehle wurden auf Windows nicht ausgeführt. Benötigt werden Git für Windows, eine von ST 1.19 unterstützte Node-Version (in der Sandbox 24.22.1), npm und Schreibzugriff auf einen neuen Testordner.

## Zwei getrennte Installationen

In PowerShell einmal ausführen. Die Versionsprüfung bricht ab, falls der Checkout nicht dem geprüften Stand entspricht. Jede Instanz bekommt eigene Programme, Konfiguration, Extensions, Daten und eine eigene Browser-Origin.

```powershell
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'Avereth-AB-203'
if (Test-Path $root) { throw "Testordner existiert bereits: $root" }
New-Item -ItemType Directory $root | Out-Null
$game = 'https://github.com/Mango1331/Claude-AI-RPG-Game.git'
$st = 'https://github.com/SillyTavern/SillyTavern.git'
$heads = @{
    A = '5e5b8272412b51b91f75b6e37c5b94d95c9fae11'
    B = '8df38d3fe4b62eafc2b746ada81e5f2470956dea'
}
git clone --no-checkout $game "$root\quellen"
if ($LASTEXITCODE) { throw 'Avereth-Checkout fehlgeschlagen' }
foreach ($arm in 'A','B') {
    $commit = $heads[$arm]
    git -C "$root\quellen" worktree add --detach "$root\engine-$arm" $commit
    if ($LASTEXITCODE -or ((git -C "$root\engine-$arm" rev-parse HEAD) -ne $heads[$arm])) { throw "Engine $arm prüfen" }
    git clone --depth 1 --branch 1.19.0 $st "$root\ST-$arm"
    if ($LASTEXITCODE -or ((git -C "$root\ST-$arm" rev-parse HEAD) -ne '7e8663cd9c184a550b37238218bdd32c6efc68e9')) { throw "ST $arm prüfen" }
    Push-Location "$root\ST-$arm"
    try {
        npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE) { throw 'Installation fehlgeschlagen' }
    } finally { Pop-Location }
    $extension = "$root\Daten-$arm\default-user\extensions\avereth-engine"
    New-Item -ItemType Directory -Force $extension | Out-Null
    foreach ($file in 'manifest.json','index.js','style.css','src','content','regex') {
        Copy-Item "$root\engine-$arm\avereth-engine\$file" $extension -Recurse
    }
}
```

Pro Sitzung **eine** Instanz starten. Nach vollständig bestätigtem Speichern den Server mit Strg+C beenden, dann die andere Instanz starten. Bei unbekanntem Providerabschluss erst die Belegung klären. Die vier Kapazitätseinheiten können durch einen einzigen Modellaufruf belegt sein.

```powershell
$root = Join-Path $env:LOCALAPPDATA 'Avereth-AB-203'
$arm = 'A'     # für die andere Sitzung 'B'
$port = @{ A = 8121; B = 8122 }[$arm]
Set-Location "$root\ST-$arm"
node server.js --port $port --dataRoot "$root\Daten-$arm" --browserLaunchEnabled false
```

Für A im eigenen Test-Browserprofil `http://127.0.0.1:8121` öffnen, für B im zweiten Profil `http://127.0.0.1:8122`. Jeweils nur einen Tab mit dem Spiel öffnen.

## Gleiche Startwelt und Einstellungen

Die folgenden Importpfade liegen für A unter `$root\engine-A\avereth-engine`, für B unter `$root\engine-B\avereth-engine`.

1. In beiden Testprofilen denselben V4-Charakter mit identischer Begrüßung und gleichem Startort importieren. Die Description ist `content/narrator/Avereth_Narrator_Contract_v4.txt`. Beide Checkouts enthalten denselben Text. Jeweils `lorebook/Avereth_World_Lore_v0.14.json` als Character Lore verknüpfen. In beiden Instanzen die identischen World-Info-Einstellungen verwenden.
2. `presets/Avereth Narrator V4.json` importieren. V4-C, Modell-ID, Featherless-Tarif, Custom-Chat-Completion-Verbindung, Reasoning-/Body-Einstellungen, Ausgabegrenze, Kontextgrenze, Postprocessing, Lore und Enginebudgets für beide Arme protokollieren. Zugangsdaten ausschließlich in der jeweiligen ST-Verbindungsmaske hinterlegen. Das ausgelieferte Preset nennt 131.072 Kontext und 4.096 Ausgabe. Die tatsächlich nutzbare Tarifgrenze mit Ausgabereserve prüfen. Eine abweichende Testgrenze für beide Arme gleich wählen und notieren.
3. Einen bestätigten neuen Startchat im Testprofil A nach der Charaktererstellung exportieren. Den vollständigen ST-JSONL einschließlich Chatmetadaten und `extra.avereth` in B unter demselben Charakter importieren. Nach Reload Startort, Spielzug, PC-Werte, Inventar und Zahl der Events vergleichen. Alternativ zwei bewusst unterschiedliche Starts als ungepaarte Spielverläufe kennzeichnen.
4. **A** spielt gepuffert mit dem Originalpreset. **B** enthält Markt-, Board- und Saveänderungen bereits im Code. Für den Streamingarm in ST natives Streaming einschalten und Smooth Streaming ausschalten. `Compact extractor JSON (experiment)` ist standardmäßig aus. Das separate Preset `Avereth Narrator V4 - Card before Lore.json` ist optional. Erst die vom Gegenreview gebilligten Optionen auswählen und danach Streaming nochmals prüfen, denn beide Presetdateien enthalten `stream_openai: false`.
5. Die erste Runde kann S1, B1, Marktkatalog, Board-Erstentwurf und Save gemeinsam vergleichen. Für die Frage, ob Karte-vor-Lore oder X2 einen Unterschied macht, jeweils nur diese Option variieren. Mit zehn Zügen je Version lässt sich ein Paketeffekt beschreiben, die Einzeleffekte lassen sich so nur eingeschränkt zuordnen.

## Etwa zehn Spielerabsichten je Version

Vergleichbare Entscheidungspunkte sind Gildenregistrierung und Beitrag, Board lesen, ein Angebot prüfen und annehmen, eine Reise mit Ortswechsel, ein Gespräch mit einer benannten Person, spätere Nachfrage zu deren Zusage, HUD-Kampf und eine freie kombinierte Handlung. Ereignisse aus einem abweichenden Spielverlauf nur paaren, wenn Gelegenheit und Ausgangslage vergleichbar sind. Gleichstände, Ausfälle, abgewiesene Angebote und zusätzliche Repairs zählen mit.

| Pro Absicht protokollieren | Erhebung |
|---|---|
| Sendeklick, erster lesbarer Prosasatz im Chat, vollständige Erzählung, sichere nächste Eingabe | Lokale Bildschirmaufnahme mit Zeitbasis oder Browser-Performanceaufnahme. Reasoning, Platzhalter und HUD zählen nicht als Prosa. Weltabgleich und sichtbares „Gespeichert“ getrennt markieren. |
| Planner, Board, Narrator, Extractor und physische Wiederholungen | Vorhandene Turn-Performance, ST-Verbindungsdiagnostik und vorhandene Abschlussrecords. Nummer, Rolle, Dauer und Fehler jeder physischen Anfrage festhalten. |
| Weltcommit und Read-back | Bestehende Konsolenmeldung `[Avereth] world completion` mit `persisted`, `extraction_status` und `save_readback_ms`. B enthält zusätzlich Zeitpunkte in der Browserzeitbasis. In A ist der Commit relativ zum Ende aus der Dauer ableitbar. Wiederhergestellte Ereignisse nach Reload mit dem gerade bestätigten Stand vergleichen. |
| Tokens und Kosten | Vorhandene gemeldete Prompt-, Completion- und Cachewerte übernehmen. Fehlende Werte, besonders bei Streams, als unbekannt führen. Sichtbare lokale Inhaltstokens und Provider-Usage getrennt halten. Keine zusätzlichen Payload- oder Schlüsselprotokolle einschalten. |
| Spielqualität | NPC-Partei und Wissensquelle, offene Zusage, Questziel, Ort, HP/XP, Loot und Zahlung prüfen. Auch glaubwürdige Zusammenhänge, freie Spielerentscheidungen und Erzählfluss anhand einer konkreten Stelle festhalten. |

Unvollständige Narration, doppelte Buchung, fremde Zusage oder unbestätigtes Speichern als eigenen Befund sichern. Reload kann in beiden Einstellungen einen ungesendeten Entwurf verlieren. Wichtige Entwürfe vor einem absichtlichen Reload separat sichern. Die persönliche Durchführung beginnt erst mit ausdrücklicher Freigabe.
