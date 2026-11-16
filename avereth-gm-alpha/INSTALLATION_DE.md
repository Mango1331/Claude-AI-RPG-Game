# Avereth GM Alpha 2 für SillyTavern 1.19

Testversion **4.3.0-gm.alpha.2**, mechanischer Kern unverändert **.200**. Für einen **neuen Testchat**, nicht für laufende Kampagnen. Keine automatische Migration. Im Spiel werden nur SillyTavern und dessen bereits eingerichtete Modellverbindung benötigt. Keine Codex-, Playwright- oder zusätzliche Node-Anwendung, kein zusätzlicher API-Key.

**Kurskorrektur-Kandidat vom 16.11.2026:** Der aktuelle Repositoryordner enthält den begrenzten Durchstich Gildenreise → NPC-Gedächtnis → Gegenstandsgebrauch → Wiedersehen. Nur für die gesondert freizugebende kurze natürliche Probe; keine breite neue Alpha-Auslieferung. Das ältere `releases/Avereth-GM-Alpha-2.zip` enthält diesen Nachtrag nicht. Zum gezielten Aktualisieren den vollständigen aktuellen Ordner `avereth-gm-alpha/` aus dem Kurskorrekturcommit verwenden und danach einen **neuen** Testchat beginnen. Bericht und Testanleitung liegen im Repository unter `experiments/dynamic-gm/KURSKORREKTUR_SPIELBOGEN_2026-11-16.md` und `NATUERLICHER_SPIELBOGEN_KANDIDAT_2026-11-16.md`.

## Installation

1. SillyTavern schließen und die eigene ST-Datenwurzel sichern. Das Alpha-Paket enthält **keine** Einstellungen oder Zugangsdaten; keine eigenen Dateien durch Testdaten ersetzen.
2. Den **gesamten Ordner `avereth-gm-alpha`** aus dem ZIP nach `SillyTavern/data/<Benutzer>/extensions/avereth-gm-alpha` kopieren. Bei der Standardinstallation ist `<Benutzer>` `default-user`. `manifest.json`, `index.js`, `gm/`, `src/`, `content/` und `presets/` müssen unmittelbar darin liegen. Eine abweichende ST-Datenwurzel entsprechend verwenden. Nicht in den alten `.200`-Extensionordner kopieren. Die Git-URL dieses Mehrordner-Repositories ist kein geeigneter Ein-Klick-Installer für diesen Unterordner.
3. ST normal starten. Unter **Extensions → Manage Extensions** die alte **Avereth Engine (.200)** deaktivieren, **Avereth GM Alpha 2** aktivieren, anschließend die Browserseite vollständig neu laden. Beide dürfen nicht gleichzeitig geladen sein. Die Alpha erkennt eine noch geladene alte Engine und verweigert den Start; sie deaktiviert keine fremden Extensions automatisch.
4. Unter Characters die Datei `presets/Avereth GM Alpha.character.json` importieren. Die alte Narrator-Karte bleibt unverändert. Auf der neuen Karte **kein altes Avereth-Lorebook und keinen alten 35.000-Zeichen-Vertrag** ergänzen.
5. **Chat Completion → Custom (OpenAI-compatible)** verwenden. Bestehenden Featherless-Endpunkt `https://api.featherless.ai/v1` und Modell `zai-org/GLM-5.3-Flash` wählen. Schlüssel bleiben ausschließlich in STs vorhandener Keyverwaltung. Das Preset `presets/Avereth GM Alpha 2.json` importieren. „Bind preset to connection“ ausgeschaltet lassen; der Import soll keine persönliche Verbindung ersetzen. Temperature 0,8, Top P 0,95, Frequency/Presence Penalty 0, Ausgabe 4096, Kontext 32768, Seed -1, Streaming aus, n=1, Function Calling aus. Alpha 2 unterstützt für Modellrequests ausschließlich diesen budgetgeprüften Chat/Custom-Modellpfad. Der frühere native Textpfad wird vor Dispatch verständlich abgewiesen; dafür wird kein neues Preset ausgeliefert.

   **Einmalig manuell in den erweiterten Custom-Verbindungseinstellungen → Include Body Parameters setzen:**

   ```yaml
   chat_template_kwargs:
     reasoning_effort: low
     clear_thinking: true
   ```

   Include Body enthält nur diesen Block. Optionaler `response_format: {type: json_object}` wird technisch unterstützt, ist aber noch kein natürlich abgenommener Standard. **Exclude Body leer, zusätzliche Custom-Headers leer, Prompt Post-Processing None, zusätzliche/temporäre Stopstrings leer.** Authentifizierung über STs Keyfeld, nicht über Custom-Headers. Alte top-level-Reasoning-, Streaming-, Sampler-, Tool- oder Budgetblöcke aus diesem Testprofil entfernen. Die Alpha verändert diese persönlichen Einstellungen nicht automatisch: Sie erklärt Konflikte und sendet dann keinen Request. Das normale ST-Reasoningfeld „Low“ allein reicht bei GLM/Custom nicht; der ST-Backendpfad entfernt es. Die verschachtelten Templateparameter sind lokal bis zum finalen Providerbody geprüft.

   Vorhandene Verbindungswerte bei Bedarf in einem getrennten ST-Verbindungsprofil behalten. Kein „Test Message“-Aufruf wird automatisch gestartet. Für Alpha 2 einen **neuen** Testchat beginnen; Alpha-1-Chats werden nicht migriert.

6. Die vorhandene Featherless-Quelle, das Modell und den bereits in ST gespeicherten Key weiterverwenden. Die Alpha verändert diese Verbindung nicht. Sie sendet ausschließlich über STs eigenen Backendpfad. Der kurze dynamische GM-Vertrag und relevante Memory-/Toolschema-Daten kommen einmal von der Extension; der lange alte Narrator-Prompt wird nicht angehängt. Das importierte Chat-Preset definiert Sampling und beschreibt die GM-Rolle; der Raw-Pfad verwendet keinen zweiten ST-Promptmanager-Regelblock. Für Text Completion bleiben die modellabhängigen Instruct-Tokens wichtig.

## Neues Spiel und Bedienung

1. Die neue **Avereth GM Alpha**-Karte öffnen und einen **neuen leeren Chat** anlegen.
2. Im GM-Panel **Neues Testspiel starten** anklicken. Die feste Alpha-Startszene liegt vor Alderwatch; der Seed der Kampagne wird neu erzeugt.
3. `Warrior`, `Mage` oder `Rogue` in das normale Eingabefeld schreiben und **GM senden** wählen. Anschließend zwei der angebotenen Skills wählen, z. B. `Heavy Slash and Guard`. Diese Schritte laufen lokal, ohne Modellanfrage.
4. Danach frei spielen. **GM senden**, der normale Sendepfeil und Enter benutzen im GM-Chat denselben gesicherten GM-Pfad. Shift+Enter fügt eine neue Zeile ein. Während der Generierung bleibt die Erzählung unsichtbar; erst bestätigte Weltpersistenz und Chat-Read-back geben sie frei.
5. HUD: **Charakter und Welt im GM-Panel** sowie unter bestätigten Antworten. Die Daten stammen aus Engineevents. Systembefehle wie `#help`, `#status`, `#inventory`, `#skills` und die bestehenden Enginebefehle über dasselbe Eingabefeld senden. HUD-Aktionsbuttons bereiten nur eine editierbare Eingabe vor.

Für diesen Teststand **eine ST-Sitzung / ein Browserprofil** und keine parallele externe Provideranfrage benutzen. Die Alpha serialisiert ihre eigenen Anfragen über alle Alpha-Chats und gleichoriginige Tabs. Andere Geräte, Browserprofile, fremde Extensions und externe Anbieter-Sessions kann sie nicht global sperren. Automatisch generierende Extensions im Testchat deaktivieren. Keine Gruppen-Chats.

## Stop, Fehler und Wiederaufnahme

- **Stop** verhindert weitere Schritte und die Veröffentlichung. Ein bereits an ST abgesandter atomarer Save kann noch abschließen; dann wird genau dieser Abschluss später wiederaufgenommen. Ein laufender Providerrequest ist durch den lokalen Stop **nicht** nachweislich beendet. Seine Antwort wird gegebenenfalls als Beleg gespeichert, aber nicht automatisch veröffentlicht.
- Nach Fehler oder Reload zuerst den **ursprünglichen Chat** öffnen, dann **Wiederaufnehmen**. Bereits erhaltene Antworten, berechnete Mechanik und bestätigte Saves werden wiederverwendet. Ein anderer Chat, eine kopierte Kampagne oder extern veränderter Text wird zurückgewiesen.
- Nach lokalem Timeout bleibt die Kapazität gesperrt. Eine noch ankommende bestätigte Antwort kann sie freigeben. Nach Browserverlust kann der Remoteabschluss offen bleiben. **Remoteabschluss bestätigen…** nur verwenden, wenn die Anfrage beim Anbieter wirklich beendet ist; bloßes Warten oder Drücken von Stop ist kein Beleg. Anschließend separat wiederaufnehmen. Höchstens zwei ausdrücklich gestartete Versuche derselben Anfrage; keine automatische Retryserie.
- Ein unveröffentlichter, noch nicht committeter Zug mit bestätigtem Remoteabschluss kann über **Offenen Zug verwerfen** verworfen werden. Seine Eingabe kehrt ins Textfeld zurück. Einen bereits committeten Zug nicht verwerfen: Wiederaufnahme veröffentlicht dessen gespeicherten Abschluss.
- Ein fachlich ungültiger GM-Vorschlag erhält höchstens einen gezielten automatischen Korrekturrequest. Bereits vorbereitete Effekte werden dabei wiederverwendet. Ist auch die Korrektur ungültig, hält der Zug sichtbar an; Resume wiederholt ihn nicht endlos. Dann Fehler prüfen und gegebenenfalls den unveröffentlichten Zug verwerfen. Transport-/Save-/Hostfehler lösen keine solche Modellkorrektur aus.
- **Swipe, Regenerate, Continue, Edit und Löschen** im Alpha-Chat sind vorerst gesperrt. Keine alternativen Geschichten über eine bereits bestätigte Welt legen. Fremde Extensions können ST intern dennoch mutieren; der nächste Alpha-Schritt erkennt abweichenden Text/Ereignisstand und hält an.

## Speicherung und Rückkehr zu .200

Die eigenen Alpha-Journale liegen im selben ST-Benutzerprofil unter `user/files/avereth-gm-alpha-*.json`, die bestätigten Chats im normalen ST-Chatordner. Die globale Kapazitätsdatei heißt `avereth-gm-alpha-capacity.json`. Chatmetadata verknüpfen die Kampagne mit ihrem unveränderlichen Ursprung. **Chats und Alpha-Journale gemeinsam sichern**. Ein Chat-Export allein enthält keine offenen Requestbelege. Browsercache ist nicht die maßgebliche Speicherung; ST-Neustart behält die Dateien.

Für `.200` die Alpha in Manage Extensions deaktivieren, die alte Engine wieder aktivieren, Browser vollständig neu laden und die **alte Narrator-Karte mit deren altem Preset und separaten Chats** öffnen. Keine Alpha-Kampagne unter `.200` fortsetzen. Die Alpha ändert weder die alte Karte noch deren Einstellungen, Schlüssel oder Spielstände. Die ursprünglichen Presets bleiben separat; bei Rückkehr das alte Preset wieder auswählen.

Siehe [LIMITATIONS.md](LIMITATIONS.md) und den [Browser-Abnahmebericht](abnahme/ABNAHME_2026-11-16.md). Technisch geprüft mit Mockantworten; **natürliche Featherless-Rollenspielqualität noch nicht abgenommen**.

## Kontext und Diagnose in Alpha 2

Ein mitgelieferter lokaler GLM-Tokenizer zählt alle System-/Usernachrichten einschließlich Schemas, Memory, Toolergebnissen und Chattemplate. Es gilt Input + 4096 Ausgabe (auch Reasoning) + 512 Reserve ≤ 32768. Keine Schätzung aus Zeichen/4, keine Provideranfrage zum Zählen. Das gebündelte WASM/Tokenizerartefakt wird einmal lokal geladen; das Paket ist dadurch größer. Bei Überlauf hält die Alpha vor Dispatch an, ohne Memory zu kürzen. Der Kurskorrektur-Kandidat teilt wiederholte Schemadefinitionen verlustfrei; große Kampagnen können trotzdem einen kontrollierten Halt erreichen. Ein anderer Featherless-Servingstand kann abweichen; lokale Zählung und gemeldete Provider-Usage sind getrennt.

Unter „Wiederherstellung und Hilfe → Requestdiagnose“ stehen die letzten verfügbaren Requestdaten, Phase, Modell, Dauer, Abschlussgrund und Tokenwerte. Fehlende Werte sind `null`, keine berechneten Providertokenzahlen. Gespeichert werden bis zu 100 abgeschlossene Diagnosen; die Oberfläche zeigt die jüngsten 20. Kein Reasoningtext, keine Auth-Header oder Schlüssel. „Show thoughts aus“ schaltet GLM-Reasoning nicht ab. Fehlerhüllen können von ST verändert werden; insbesondere ein maskierter 429 bleibt konservativ „Remoteabschluss unbekannt“.

Der Stil wird genau einmal vom GM-Systemvertrag gesendet. Preset-Prompt-Managertexte, alte Charakterverträge und Lorebooks ergänzen diesen Raw-Pfad nicht. Keine alten Narrator-Regeln hinzufügen. Technische Abnahme: [Alpha 2](abnahme/ABNAHME_ALPHA2_2026-11-16.md).
