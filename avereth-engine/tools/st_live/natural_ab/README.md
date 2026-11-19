# Natürlicher ST-1.19-Vergleich für Avereth .203

Der Testspieler sendet höchstens zehn Eingaben pro Hauptarm im Wechsel. Alle Modellausgaben stammen vom konfigurierten OpenAI-kompatiblen Featherless-Endpunkt. Die Begleitwerkzeuge verändern die beiden gepinnten Extensions nicht.

## Umgebung

Unter Linux werden zwei saubere Engine-Checkouts (`5e5b8272412b51b91f75b6e37c5b94d95c9fae11` und `8df38d3fe4b62eafc2b746ada81e5f2470956dea`), ein main-Checkout mit den User06-Originalen, das ST-Programm bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` einschließlich seiner installierten npm-Abhängigkeiten, Node 24, Playwright, Chromium, Python mit `aiohttp` und `httpx` benötigt. Der bestehende Live-Runner erzeugt zwei neue Datenwurzeln, Karten und Hosts auf Loopback. Das Originalpreset ist für beide Arme gleich. Beide verwenden die dokumentierten Custom-Body-Felder `reasoning_effort: low` und `clear_thinking: true`.

Den API-Schlüssel über die geschützte Umgebungsvariable `FEATHERLESS_API_KEY` bereitstellen. Nur der Python-Transport benötigt ihn während des Spiels. Ports 18541, 18542, 18551 und 18552 müssen frei sein. Die beiden Hosts teilen den einen Transportprozess. Die Modellliste wird ausschließlich lokal beantwortet. Ein Prozess-Lock und das vor Versand synchronisierte Journal zählen die physischen Versuche über beide Ports. Das gesperrte Intervall umfasst Responsebody, Streamabschluss und Fehlerprüfung. Ein nicht regulär abgeschlossener Versuch sperrt weitere Generierungen. Ein neuer Prozess mit demselben Journal verweigert den Start nach einem offenen oder fehlgeschlagenen Versuch.

## Autorisierter Lauf

Den folgenden Ablauf nur für einen eigens freigegebenen Providerlauf verwenden. Ein Wiederaufruf gegen denselben Spielstand kann trotz identischer Eingaben eine andere Erzählung erzeugen. Die Auswertung eines bereits vorliegenden Laufs ist vollständig offline möglich.

```sh
export AVERETH_REF=/pfad/zur/referenz AVERETH_SUITE=/pfad/zur/suite
export AVERETH_MAIN=/pfad/zu/main AVERETH_ST_DIR=/pfad/zu/SillyTavern
export AVERETH_CHROMIUM_EXECUTABLE=/usr/bin/chromium
export FEATHERLESS_API_BASE_URL=https://api.featherless.ai/v1
export FEATHERLESS_MODEL=zai-org/GLM-5.3-Flash
umask 077
export AVERETH_AB_DIR=$(mktemp -d)
cd /pfad/zum/testbranch/avereth-engine/tools/st_live/natural_ab
PYTHONDONTWRITEBYTECODE=1 python -m unittest test_proxy
python -u proxy.py > "$AVERETH_AB_DIR/proxy.log" 2>&1 &
transport_pid=$!
env -u FEATHERLESS_API_KEY node setup.mjs > "$AVERETH_AB_DIR/runner.log" 2>&1 &
runner_pid=$!
```

`preflight.json` wird erst nach zwei echten abgeschlossenen Antworten geschrieben. Zu beiden Vorprüfungen gehören Modellprüfung, Benutzertext, Bodyabschluss und der Übergang über den realen ST-Server. Der Test startet die Hauptzüge nach `touch "$AVERETH_AB_DIR/main.ready"` und die optionalen Paare nach `touch "$AVERETH_AB_DIR/optional.ready"`. Die Dateien dürfen auch vorher gesetzt werden. Die Reihenfolge prüft der Runner. In jeder Messsituation den ST-Host seine eigene Welt und seine Datei bestätigen lassen. Bei einem Fehlabschluss im physischen Journal den Versuch an dieser Stelle beenden. Der Runner erzeugt dann einen Teilstand. Nach Ende des Runners und regulär abgeschlossener physischer Belegung den Testtransport mit `kill "$transport_pid"` beenden.

Ausgangspunkt ist in beiden Armen der 11 Nachrichten lange, gespeicherte User06-Präfix bis einschließlich Gildenregistrierung. Klasse, Ausrüstung, Gildenmitgliedschaft, Ort und Ereignisse werden vor der ersten Anfrage nach Reload verglichen. Der deterministische Spieler verwendet funktional entsprechende Namen, Aufträge und Ziele des jeweiligen Arms. Eine spätere Begegnung oder ein Kampf hängt von der tatsächlichen Welt ab. Zusatzversuche verwenden getrennte Dateien mit identischen kopierten Revisionen der B-Kampagne. X2 liest dieselbe Prosa erneut. Zwei Presetpaare regenerieren aus derselben Spielerrevision. Das dritte verwendet zwei Kopien des historischen User06-Kampfstands unmittelbar vor I21 und sendet dieselbe Aktion Arcane Wave über den echten HUD. Alle neuen Antworten stammen vom Provider. Bis zu drei Paare je Option und insgesamt höchstens 120 physische Anfragen.

## Offline-Auswertung

```sh
node audit.mjs "$AVERETH_AB_DIR" "$AVERETH_MAIN" "$AVERETH_REF" "$AVERETH_SUITE"
node messages.mjs "$AVERETH_AB_DIR" "$AVERETH_REF" "$AVERETH_SUITE"
python aggregate.py "$AVERETH_AB_DIR"
```

Für die lokale Zusatzmessung `AVERETH_GLM_TOKENIZER` und `AVERETH_GLM_TEMPLATE` auf den im Suite-Bericht gepinnten GLM-Tokenizer und das Chattemplate setzen. `tokens.py` nutzt Python mit `tokenizers` und `jinja2`, überprüft beide Dateihashes sowie die Nachrichtenhashes gegen den tatsächlich versandten Body und gibt sichtbare lokale Tokens getrennt von der Provider-Usage aus. `export.py LAUFVERZEICHNIS ZIELORDNER` verpackt die technischen Logs, Turnaufzeichnungen, Modelleinstellungen und Weltstände. Für die abschließende Negativprüfung des Archivs muss dem Exporter der Schlüssel als Umgebungsvariable zur Verfügung stehen. Die ST-Datenwurzeln und vollständige ST-Profile gehören nicht ins Archiv.

Für die Übergabe wurde die abschließende lokale HTTP-EOF-Bestätigung in die Fehlerbehandlung des Transports eingeschlossen. Im aufgezeichneten Lauf folgte sie unmittelbar auf den Journaleintrag unter derselben globalen Sperre. Alle 86 Antworten kamen an. Alle angeschlossenen Spielrevisionen wurden im ST-Host bestätigt.
