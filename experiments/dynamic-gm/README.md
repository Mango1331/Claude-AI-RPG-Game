# Dynamischer GM – isolierter Werkzeugvertrag

Aktiver Branch ausschließlich `experiment/dynamic-gm-model`. Produktbasis bleibt `.200` / `0cd1480`; dieser Nachtrag baut auf `c7622605419855233a305b9c1c5c2b039c28ddf8` auf. Keine Produktintegration, kein natürlicher Modelllauf. Die [Rollenentscheidung auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md) bleibt Grundlage.

Vom Repositoryroot (Node 24):

```sh
node --test experiments/dynamic-gm/test.mjs experiments/dynamic-gm/safety.test.mjs
node experiments/dynamic-gm/measure.mjs
```

Der zweite Befehl liest den alten Executor mit `git show c762260:...` ausschließlich lesend, lädt ihn temporär mit denselben unveränderten .200-/architecture201-Abhängigkeiten und misst Alt/Neu. Er schreibt `comparison.json`. `measurements.json` bleibt das historische Messartefakt von c762260. Keine Providerverbindung; alle Transportantworten sind geskriptet.

## Vertrag

- `finish` und `world` validieren und veröffentlichen einen vollständigen Abschluss unmittelbar. Kein obligatorischer Bestätigungsrequest.
- `world` mit `continue:true` speichert den aufgelösten Kandidaten und liefert Engineergebnisse an eine weitere GM-Anfrage. Danach `finish` mit `continuation:true`, neuer `narration`, optionalen `speech`-Akten und `threads`. Die Fortsetzung wird an den unveränderlichen Text angehängt. Neue Mechanik/Ortswechsel sind dort unzulässig; zulässige zusätzliche Memorytypen sind derzeit Versprechen, Schulden und Gerüchte über den vorhandenen Thread-Lebenszyklus.
- `speech:[{id,speaker,text,to:[ids],promise:true}]` nutzt denselben Inhalt für angezeigten Sprechakt und gespeicherte Zusage. Sprecher/Adressaten müssen etabliert sein. PC-Sprechakte erfordern ein identisches tatsächlich zitiertes Spielerwort; PC-Versprechen sind über diesen Kanal gesperrt. Optionale `knowledgeRefs` müssen dem Sprecher gehören. `claims.at` muss zum bestätigten Ort passen. Freie Prosa besitzt dadurch keine allgemeine semantische Garantie.
- `resolve` liefert einen vollständigen Spieleraktionsbatch an bestehende Planvalidierung/Engine, ohne Planner-Modellrequest. Höchstens ein Batch je Zug. `recall` liefert eine Figurenperspektive; `describe` situationsbezogene vorhandene Schemas. Jede erforderliche Modellfortsetzung wird gezählt.
- Der direkte Abschluss prüft vorhandene Intent-/Autorisierungssignale und einen engen Erkenner für die Verwendung gehaltener Gegenstände. Eine erkennbare Tranknutzung kann nicht durch einen leeren Batch übergangen werden. Dies ist ein konservativer Auslassungsschutz, kein universeller Freitextplanner; nicht erkannte Paraphrasen bleiben ein Qualitätsrisiko.

## Host und Persistenz

`OriginHost` in `publication.mjs` erweitert ausschließlich den isolierten ST-Mock um `saveChatFor(chatId, ...)` und `readChatFor(chatId)`. Ein echter Adapter muss diese explizite Zielbindung implementieren. `DynamicGM` verwendet darüber den bestehenden `HeldPublication`-Ablauf. Journal und Zug besitzen eine dauerhafte Ursprungs-Chat-ID. Epoch/Token werden nach Reload desselben Chats erneuert; ein anderer Chat wird vor Dispatch, Commit und Veröffentlichung abgewiesen. Alte Experimentjournale ohne Ursprung werden nicht still einem aktuellen Chat zugeordnet.

Scheduler, atomarer Journal-Save, vier Kapazitätseinheiten, Antwortbelege und Publikationsreihenfolge stammen unverändert aus `architecture201`. Nach `before_commit` wird die aktuelle Hostgültigkeit nochmals geprüft. Ein verzögerter Save schreibt ausschließlich in den expliziten Ursprungs-Chat. Ein Journal gehört in diesem Prototyp einem Chat; Mehrchatverwaltung und echtes Browser-/Windowsverhalten sind noch nicht implementiert.

## Dateien und Abnahme

`runtime.mjs`: GM-Koordinator. `contract.mjs`: Auslassungsschutz, typisierte Sprechakte und Memoryfortsetzung. `publication.mjs`: Chatbindung. Tests: ursprüngliche G1–G4 plus Sicherheits-/Fortsetzungsfälle. [Ergebnisbericht](PROTOTYP_ERGEBNIS_2026-11-16.md), [Vergleich](comparison.json), [Verifikation](verification.json).

**Technisch geeignet für einen isolierten echten ST-Hostdurchstich mit geskriptetem Mockprovider. Keine Freigabe für natürliches Spiel oder Produktintegration.** G3 Ablenkung/Diebstahl bleibt absichtlich unsupported. Die drei ursprünglichen semantischen Fehler und ein freier Widerspruch in einer Fortsetzung sind weiterhin nachgewiesen. Tests namens `COUNTEREXAMPLE` bestätigen Fehlerexistenz, keinen erfolgreichen Schutz.
