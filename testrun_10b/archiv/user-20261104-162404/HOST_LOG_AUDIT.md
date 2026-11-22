# Host-Log-Prüfung – User-Testrun 01

Quelle: vom Spieler hochgeladene Datei ST_2026-11-04_16-24-04.txt (UTF-16 LE mit BOM, 12.004.086 Byte; Hash siehe SOURCE_MANIFEST.md). Vollständiges Rohlog aus Größengründen nicht auf main abgelegt.

- Node.js v24.19.0, SillyTavern 1.19.0, Installation SillyTavern-Launcher auf Windows. Die lokale Avereth-Extension wurde geladen.
- **102 Chat Completion request / 102 Chat Completion response** im protokollierten Ausschnitt, durchgehend zai-org/GLM-5.3-Flash. Summierte Modellantwort-Usage: **1.288.657 total_tokens**, summierte gemeldete **cost 0.1257576** (Provider-/API-Ausgaben; keine Kostenabrechnung validiert).
- Beim Start erscheint zweimal „File not found“ für eine gerade nicht existierende beziehungsweise geleerte Chat-JSONL. Danach folgt reguläre Modellkommunikation und der exportierte Chat. Das ist **keine** dokumentierte fehlgeschlagene Spielaktion am Ende.
- Maßgebliche Day-2-Narrator-Anfrage (Modellaufruf 82 im serverlog-sequenziellen Zähler) enthält explizit **quest.clear_glimmerdeep_grotto_level_1 [completed]**, bevor die Antwort Brennas falsche Behauptung „still showing active“ enthält. Die Engine-Quest wurde vorher bereits abgeschlossen und ausbezahlt; Ursache ist eine Widersprüchlichkeit der generierten Prosa trotz verfügbarer Wahrheit, nicht ein Beleg für fehlenden Questabschluss.
- Beim nächsten Gespräch (Aufruf 85) ist ein Brenna-NPC-Recall im Kontext sichtbar: „recommended the Drowned Lantern ... say Brenna sent him; ... Grotto cleared and sixty copper paid out“. Die spezifische Absprache, morgen wegen Marda nachzufragen, ist nicht Teil dieses kompakten Recall-Satzes. Für Schlussfolgerungen zu vollständiger NPC-Erinnerungsarchitektur sind weitere gezielte Fälle nötig.
- 102 passende Request/Response-Zeilen sind **kein** Beweis für fehlerfreien Browser-Save, keine eigenständige Replay-Validierung und keine Aussage zu sämtlichen möglichen Providerfehlern. Der echte Gesamtablauf und die Buchungslücken stehen im Event-/Chatreview.

Die Originaldaten können für einen späteren präzisen Codevergleich nachgereicht werden; **kein Produktcode wurde in diesem Review verändert**.
