# Avereth GM Alpha 1 für SillyTavern 1.19

Testversion **4.3.0-gm.alpha.1**, mechanischer Kern unverändert **.200**. Für einen **neuen Testchat**, nicht für laufende Kampagnen. Keine automatische Migration. Im Spiel werden nur SillyTavern und dessen bereits eingerichtete Modellverbindung benötigt. Keine Codex-, Playwright- oder zusätzliche Node-Anwendung, kein zusätzlicher API-Key.

## Installation

1. SillyTavern schließen und die eigene ST-Datenwurzel sichern. Das Alpha-Paket enthält **keine** Einstellungen oder Zugangsdaten; keine eigenen Dateien durch Testdaten ersetzen.
2. Den **gesamten Ordner `avereth-gm-alpha`** aus dem ZIP nach `SillyTavern/data/<Benutzer>/extensions/avereth-gm-alpha` kopieren. Bei der Standardinstallation ist `<Benutzer>` `default-user`. `manifest.json`, `index.js`, `gm/`, `src/`, `content/` und `presets/` müssen unmittelbar darin liegen. Eine abweichende ST-Datenwurzel entsprechend verwenden. Nicht in den alten `.200`-Extensionordner kopieren. Die Git-URL dieses Mehrordner-Repositories ist kein geeigneter Ein-Klick-Installer für diesen Unterordner.
3. ST normal starten. Unter **Extensions → Manage Extensions** die alte **Avereth Engine (.200)** deaktivieren, **Avereth GM Alpha 1** aktivieren, anschließend die Browserseite vollständig neu laden. Beide dürfen nicht gleichzeitig geladen sein. Die Alpha erkennt eine noch geladene alte Engine und verweigert den Start; sie deaktiviert keine fremden Extensions automatisch.
4. Unter Characters die Datei `presets/Avereth GM Alpha.character.json` importieren. Die alte Narrator-Karte bleibt unverändert. Auf der neuen Karte **kein altes Avereth-Lorebook und keinen alten 35.000-Zeichen-Vertrag** ergänzen.
5. Passendes Preset importieren:
   - **Chat Completion** (einschließlich einer bestehenden Featherless-Verbindung als Custom/OpenAI-compatible): `presets/Avereth GM Alpha 1.json` über den Preset-Import der Chat-Completion-Einstellungen.
   - **Text Completion → Featherless**: `presets/Avereth GM Alpha 1 Text Completion.json` über den Text-Completion-Preset-Import. Das zum Modell passende ST-Instruct-/Context-Template beibehalten. In der Ausgabe-Länge **4096 Tokens** wählen, soweit das Modell dies unterstützt. Kontextfenster auf den tatsächlichen Modellwert einstellen, beispielsweise 32768, nicht blind erhöhen.
6. Die vorhandene Featherless-Quelle, das Modell und den bereits in ST gespeicherten Key weiterverwenden. Die Alpha verändert diese Verbindung nicht. Sie sendet ausschließlich über STs eigenen Backendpfad. Der kurze dynamische GM-Vertrag und relevante Memory-/Toolschema-Daten kommen einmal von der Extension; der lange alte Narrator-Prompt wird nicht angehängt. Das importierte Chat-Preset definiert Sampling und beschreibt die GM-Rolle; der Raw-Pfad verwendet keinen zweiten ST-Promptmanager-Regelblock. Für Text Completion bleiben die modellabhängigen Instruct-Tokens wichtig.

## Neues Spiel und Bedienung

1. Die neue **Avereth GM Alpha**-Karte öffnen und einen **neuen leeren Chat** anlegen.
2. Im GM-Panel **Neues Testspiel starten** anklicken. Die feste Alpha-Startszene liegt vor Alderwatch; der Seed der Kampagne wird neu erzeugt.
3. `Warrior`, `Mage` oder `Rogue` in das normale Eingabefeld schreiben und **GM senden** wählen. Anschließend zwei der angebotenen Skills wählen, z. B. `Heavy Slash and Guard`. Diese Schritte laufen lokal, ohne Modellanfrage.
4. Danach frei spielen. **GM senden**, der normale Sendepfeil und Enter benutzen im GM-Chat denselben gesicherten GM-Pfad. Shift+Enter fügt eine neue Zeile ein. Während der Generierung bleibt die Erzählung unsichtbar; erst bestätigte Weltpersistenz und Chat-Read-back geben sie frei.
5. HUD: **Charakter und Welt im GM-Panel** sowie unter bestätigten Antworten. Die Daten stammen aus Engineevents. Systembefehle wie `#help`, `#status`, `#inventory`, `#skills` und die bestehenden Enginebefehle über dasselbe Eingabefeld senden. HUD-Aktionsbuttons bereiten nur eine editierbare Eingabe vor.

Für Alpha 1 **eine ST-Sitzung / ein Browserprofil** und keine parallele externe Provideranfrage benutzen. Die Alpha serialisiert ihre eigenen Anfragen über alle Alpha-Chats und gleichoriginige Tabs. Andere Geräte, Browserprofile, fremde Extensions und externe Anbieter-Sessions kann sie nicht global sperren. Automatisch generierende Extensions im Testchat deaktivieren. Keine Gruppen-Chats.

## Stop, Fehler und Wiederaufnahme

- **Stop** verhindert weitere Schritte und die Veröffentlichung. Ein bereits an ST abgesandter atomarer Save kann noch abschließen; dann wird genau dieser Abschluss später wiederaufgenommen. Ein laufender Providerrequest ist durch den lokalen Stop **nicht** nachweislich beendet. Seine Antwort wird gegebenenfalls als Beleg gespeichert, aber nicht automatisch veröffentlicht.
- Nach Fehler oder Reload zuerst den **ursprünglichen Chat** öffnen, dann **Wiederaufnehmen**. Bereits erhaltene Antworten, berechnete Mechanik und bestätigte Saves werden wiederverwendet. Ein anderer Chat, eine kopierte Kampagne oder extern veränderter Text wird zurückgewiesen.
- Nach lokalem Timeout bleibt die Kapazität gesperrt. Eine noch ankommende bestätigte Antwort kann sie freigeben. Nach Browserverlust kann der Remoteabschluss offen bleiben. **Remoteabschluss bestätigen…** nur verwenden, wenn die Anfrage beim Anbieter wirklich beendet ist; bloßes Warten oder Drücken von Stop ist kein Beleg. Anschließend separat wiederaufnehmen. Höchstens zwei ausdrücklich gestartete Versuche derselben Anfrage; keine automatische Retryserie.
- Ein unveröffentlichter, noch nicht committeter Zug mit bestätigtem Remoteabschluss kann über **Offenen Zug verwerfen** verworfen werden. Seine Eingabe kehrt ins Textfeld zurück. Einen bereits committeten Zug nicht verwerfen: Wiederaufnahme veröffentlicht dessen gespeicherten Abschluss.
- **Swipe, Regenerate, Continue, Edit und Löschen** im Alpha-Chat sind vorerst gesperrt. Keine alternativen Geschichten über eine bereits bestätigte Welt legen. Fremde Extensions können ST intern dennoch mutieren; der nächste Alpha-Schritt erkennt abweichenden Text/Ereignisstand und hält an.

## Speicherung und Rückkehr zu .200

Die eigenen Alpha-Journale liegen im selben ST-Benutzerprofil unter `user/files/avereth-gm-alpha-*.json`, die bestätigten Chats im normalen ST-Chatordner. Die globale Kapazitätsdatei heißt `avereth-gm-alpha-capacity.json`. Chatmetadata verknüpfen die Kampagne mit ihrem unveränderlichen Ursprung. **Chats und Alpha-Journale gemeinsam sichern**. Ein Chat-Export allein enthält keine offenen Requestbelege. Browsercache ist nicht die maßgebliche Speicherung; ST-Neustart behält die Dateien.

Für `.200` die Alpha in Manage Extensions deaktivieren, die alte Engine wieder aktivieren, Browser vollständig neu laden und die **alte Narrator-Karte mit deren altem Preset und separaten Chats** öffnen. Keine Alpha-Kampagne unter `.200` fortsetzen. Die Alpha ändert weder die alte Karte noch deren Einstellungen, Schlüssel oder Spielstände. Die ursprünglichen Presets bleiben separat; bei Rückkehr das alte Preset wieder auswählen.

Siehe [LIMITATIONS.md](LIMITATIONS.md) und den [Browser-Abnahmebericht](abnahme/ABNAHME_2026-11-16.md). Technisch geprüft mit Mockantworten; **natürliche Featherless-Rollenspielqualität noch nicht abgenommen**.
