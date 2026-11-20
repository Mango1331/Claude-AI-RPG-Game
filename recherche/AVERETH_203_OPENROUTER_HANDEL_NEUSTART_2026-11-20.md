# OpenRouter-Handelstest · Neustartprüfung vom 20.11.2026

**Der isolierte Testtreiber hat das lokale Gate bestanden. Der natürliche Canary wartet auf den Abschlussbeleg zum alten Request 9.** Für den Neustart wurden bislang null Generierungen ausgelöst. Die sechs natürlichen Handelspaare, ihre Qualitätsbewertung und die paarweisen Mediane stehen aus.

## Geprüfte Stände

| Bestandteil | Commit |
|---|---|
| Engine A | `6d9770f9b31e78d37567719bf1c06d8a4942288c` |
| Engine B | `25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18` |
| ST 1.19.0 | `7e8663cd9c184a550b37238218bdd32c6efc68e9` |
| Testwerkzeug vor Neustart | `eb656853e87388fc2ab9fe3dd0f321bacf3a8752` |
| Testwerkzeug mit Restbudget und Canary | `e970e13bf60f8e8b40396137e34c1e958af0ba01` |

## Eigene lokale Abnahme

- Vier Python-Testmethoden mit positiven und negativen Einzelfällen bestanden. Der Transport prüft den vollständigen Stream. Zusätzlicher Inhalt nach Stop, SSE-Fehler, leere oder ungültige Daten, weitere Stop-Choices und fehlender Abschluss sperren den Erfolg. Die enge Normalisierung lässt den bestätigten leeren Usage-Nachtrag passieren. Die Kostentests prüfen die Obergrenze auch für eine höhere Nachbuchung.
- Alle 16 gezielten Node-Tests für Streamrevision und Belegung bestanden, einschließlich Clientabbruch, fehlendem DONE und Revisionsbindung.
- Auf den beiden gepinnten ST-Hosts lief zuerst ein lokaler A-Canary in einer eigenen Chatdatei, anschließend ein lokales A/B-Paar. Jeder Zug durchlief Planner, nativen Narratorstream und Extractor mit drei lokalen Antworten. Alle drei erreichten Weltbuchung, bestätigten Save, Read-back und Reload. Der Canary prüfte auch die Eingabefreigabe nach Reload. Alle drei ergaben denselben Weltfingerprint. Der Narratortext stammt aus dem früheren natürlichen Versuch, Planner und Extractor waren geskriptet.
- Das natürliche Testprogramm verwendet diesen Canary vor sämtlichen Paaren. Der Proxy schreibt die Generation-ID bei Verfügbarkeit bereits während des Streams ins neue Journal. Die große Regression der unveränderten Engines wurde gemäß Auftrag ausgelassen. Der bekannte gemeinsame Preisbindungsbefund bei einer eigenständigen NPC-Zusage mit „tomorrow“ bleibt außerhalb der Katalogbewertung.

[Lokale Messdaten und Weltbelege](openrouter_handel_203/neustart_lokal.json) · [Technische Reproduktion](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/e970e13bf60f8e8b40396137e34c1e958af0ba01/avereth-engine/tools/st_live/openrouter_trade)

## Kostenloser Providerabgleich und offenes Gate

Die Route `wafer/us` für `z-ai/glm-5.3-flash` war verfügbar, mit unveränderten Preisen von 0,042 USD je Million Eingabe- und 0,184 USD je Million Ausgabetokens. Die früheren lokalen ST-/Proxyports waren frei. Eine frische Laufwurzel enthält die beiden Vergleichsseeds und den aktuellen Routendatensatz. Das alte Journal blieb unverändert und gesperrt.

Die authentifizierten Kostenendpunkte waren erreichbar. Der gemeldete Gesamtverbrauch des Schlüssels lag unter den bereits gebuchten und konservativ reservierten 0,046565124 USD des Versuchs. Diese Summe bleibt vollständig angerechnet. Kumulativ gilt weiterhin höchstens 60 Requests und 0,50 USD. Es wurden bereits neun Requests versendet. Der Neustart darf höchstens 51 weitere und höchstens 0,453434876 USD verbrauchen. Bei einer höheren Einzelabrechnung sinkt das Restlimit.

Die Kostenübersicht weist keinen individuellen Abschlussstatus aus. Der Zugriff auf die accountweite Aktivität und Analytics über die API erforderte einen Managementschlüssel (HTTP 403). Der dokumentierte Abruf einer einzelnen Generation funktioniert mit dem vorhandenen Schlüssel und ihrer ID. Für den alten Planner Nr. 8 war dies anhand seiner archivierten ID nachprüfbar. Für den unmittelbar folgenden Narrator Nr. 9 fehlt diese ID im alten Journal und in den verfügbaren ST-Logs. Sichtbar sind HTTP 200 und ein anschließender Verbindungsabbruch. Der identische Prompt zu Nr. 4 hatte 12.642 Inputtokens. Der öffentliche Aktivitätslink führt zur Anmeldung.

Für die Zuordnung genügt die OpenRouter-Generation-ID des Wafer-Narrators vom **20.11.2026 um 01:02:17 MEZ**. Damit kann der bestehende Schlüssel Status und Kosten lesen. Das Programm gleicht Zeit, Modell, Anbieter und Promptlänge ab und setzt das Restbudget vor der ersten neuen Generierung. Die frühe Sperre folgt der Vorgabe des Gegenreviews, eine Überschneidung mit dem alten Provideraufruf auszuschließen. Die zwischenzeitlich verstrichene Zeit ersetzt diesen Beleg nicht. [Unabhängiger Gegenreview](GEGENREVIEW_203_OPENROUTER_HANDEL_TEILVERSUCH_GPT_2026-11-20.md) · [Vorheriger natürlicher Teilversuch](AVERETH_203_OPENROUTER_HANDEL_AB_2026-11-20.md)
