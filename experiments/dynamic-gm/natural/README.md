# Vorbereitung: natürlicher Vergleich GM gegen B

**Status: nur vorbereitet, null natürliche Providerrequests.** Die gesonderte ausdrückliche Nutzerfreigabe aus dem Auftrag fehlt noch. Modell, tatsächlicher Endpoint, Kontextfenster und passender Tokenizer sind noch nicht verbindlich gewählt; es wird keine persönliche ST-Konfiguration gelesen. Der frühere GLM-5.3-Flash-Lauf ist historische Evidenz, keine automatische aktuelle Modellwahl oder Zugriffserlaubnis.

Die externe ST-Testbrücke aus d2abb78 wird weiterverwendet. Der Lauf benutzt ausschließlich `http://127.0.0.1:8137` und eine lokale Gatewayadresse auf 5141. Der Gateway ergänzt eine ausdrücklich dafür bereitgestellte Providerzugangsinformation ausschließlich serverseitig aus `GM_ROLEPLAY_API_KEY`. Kein anderer Token ist ein Fallback. Keine Zugangsdaten in Browsermessages, Git, Requestoriginalen oder Logdateien. ST erhält nur die lokale Gatewayadresse.

## Zuerst offline prüfen

```sh
node experiments/dynamic-gm/natural/prepare.mjs
node --test experiments/dynamic-gm/natural/preparation.test.mjs
```

`prepared.json` dokumentiert die Eingaben, Herkunft und Änderungen der Startfixtures sowie die gehashten unveränderten GM-/B-Pfade und den Vergleichsadapter. `cases.mjs` verwendet nur historische Ausgangschats, keine aufgenommenen Erfolgsantworten. Die Unitproben verwenden ausdrücklich als geskriptet markierte Antworten zur Verdrahtungsprüfung; sie sind keine natürlichen Vergleichsoriginale.

## Geplante Serie

| Zug | Gemeinsame Eingabe/Basis | Reihenfolge |
|---|---|---|
| N1-first | Wat nach w191 #92, freie Frage zu den letzten Geschehnissen. Keine vorbestimmte Zusage, Gabe oder Handlung | B, GM |
| N1-recall | Zweiter, später abrufender Gesprächszug in der jeweils bestätigten N1-Welt. Kein Originaldialog im aktiven Prompt; gespeicherte Erinnerung bleibt | GM, B |
| N2 | Persönlicher .200-Waldzug vor #5 und seine Originaleingabe | B, GM |
| N3 | Dieselbe Straßenrandbasis plus ausdrücklich protokollierter loser Holzschlüssel; TAKE, danach nur bei erhaltenem Schlüssel GO | GM, B |
| N4 | Wat und weitere NPCs auf ihrer bestehenden historischen Grundlage; Alaric betrachtet das reparierte Tor, NPCs dürfen selbst tätig sein | B, GM |

N1-recall findet nur statt, wenn beide Erstzüge erfolgreich publiziert wurden. Die Welten dürfen sich durch legitime kreative Entscheidungen unterscheiden. Der spätere Spielertext bleibt identisch, ohne einen erfolgreichen Inhalt vorzugeben. Diese enge Probe umfasst nur einen späteren Folgezug mit Kontextentfernung, keinen mehrtägigen Langzeitlauf und keine separat aufgelöste Reise/Rückkehr. Das begrenzt Gedächtnisaussagen.

Der N1-Originaldialog wird aus direkten Historienmessages und dem normalisierten/trunkierten Planner-RECENT entfernt. Der autoritative Chat bleibt unverändert, damit Ereignisfold und Identitäten erhalten bleiben. Tatsächlich gespeicherte Wissens-/Thread-/Memoryeinträge bleiben zulässiger Kontext. Es wäre ein Fehler, sie bloß wegen ähnlicher Formulierung mit zu entfernen.

Der ursprüngliche Ablenkungs-/Diebstahlfall bleibt unsupported. Die Serie erfindet keine allgemeine Check- oder Transferregel. Es wird kein Parameter innerhalb der Serie aufgrund guter oder schlechter erster Antworten angepasst.

## Was B hier tatsächlich bedeutet

`architecture201/Prototype` wird unverändert verwendet: optionale enge GO-Route, echte Plannerantwort, Engine, Narration, echte Extraktion, gesamte Kandidatenvalidierung und bestätigte Veröffentlichung. Alle tatsächlich aufgerufenen Modellphasen gehen an denselben gewählten Provider und werden gezählt. Kein Skript ersetzt eine natürliche Plan-, Narrations- oder Extractorantwort.

**Das ist kein vollständiger Produkt-.200-Benchmark:** B verwendet den vorherigen Prototyp-Narratorprompt aus exportierten statischen Blöcken, ausgewählte Historie und Enginekontext; er reproduziert nicht sämtliche ST-Preset-/Lorebook-/Extension-Injections. Die importierten Terminalblöcke enthalten dokumentierte Encodingartefakte. Die Validierung verwirft den Kandidaten bei fachlichen Ablehnungen komplett, während das Produkt teilweise gültige Teile übernehmen kann. Zusätzliche automatische Plannerrepairs werden für diese Pilotserie unterbunden; B kann deshalb früher scheitern als ein Produktlauf mit Recovery. Die dynamische Architektur wird ebenfalls ohne automatische Recoveryneustarts getestet, ihre echten Tool-/Schemafortsetzungen bleiben erlaubt und gezählt.

Die GM-Prompts und B-Prompts bleiben ihre vorhandenen Architekturverträge; Umfang und tatsächlich gelieferte Erinnerungen werden als Teil des Ergebnisses ausgewiesen. Die GM-Variante hat einen erheblich kleineren Regel-/Kanonvertrag. Ein möglicher Fehler durch fehlende Informationen darf nicht pauschal als prinzipielle Architekturunfähigkeit interpretiert werden. Umgekehrt wird Kürze nicht ohne Inhalts-/Qualitätsprüfung als Erfolg bewertet. Ein eventuell später nötiger besser angeglichener Vergleich wäre eine neue, separat erkennbare Serie.

## Globale Begrenzung und Stopps

`RequestLedger` ist ein einziges dauerhaftes Ledger für beide Arme. Vor jedem **physischen** Upstreamdispatch wird ein fsync-gesicherter Eintrag angelegt. Der 25. Dispatch wird abgewiesen. Gateway und Runner führen keine automatischen Transportretrys aus. Auch fehlgeschlagene und verworfene Antworten zählen. Nach Prozessverlust bei `sent`, Timeout oder unbekanntem Remoteabschluss bleibt die Serie gesperrt. 429, Providerfehler und abgeschnittene/unvollständige Antworten stoppen kontrolliert; keine Recoverykette.

Der erfolgreiche Basispfad von B umfasst für fünf Züge ungefähr 15 Requests. Der GM benötigt mindestens fünf, bei den mechanischen Fällen voraussichtlich weitere Fortsetzungen. Damit kann das 24er-Budget bereits knapp werden. Die Serie verspricht keine vollständige Abdeckung: Budgeterschöpfung wird samt nicht ausgeführten Fällen berichtet. Keine Seite erhält zusätzliche Requests außerhalb des Ledgers; inhaltlich unterschiedliche Aktionen werden nicht auf identische Endzustände gezwungen.

Die lokale ST-Weiterleitung ist kein zusätzlicher Modellrequest. Gezählt wird die tatsächliche externe HTTP-Anfrage des Gateways, nicht SDK-/Nutzerturns. Ein erneuter Start derselben Serien-ID mit vorhandenen Daten wird verweigert. Vorbereitungsproben und natürliche Serie haben getrennte Verzeichnisse und Statuskennzeichnungen.

## Modellkonfiguration und zukünftiger expliziter Start

Ein künftiger Start benötigt **nach** Nutzerfreigabe eine lokale Datei außerhalb Git, referenziert durch `GM_APPROVAL_FILE`. Beispiel ausschließlich als Struktur, nicht als erteilte Freigabe:

```json
{
  "approved": false,
  "userApprovalReference": "noch ausstehend",
  "series": "avereth-first-natural",
  "endpoint": "https://PROVIDER/v1/chat/completions",
  "model": "TATSAECHLICHE_MODELL_ID",
  "tokenizerId": "VERIFIZIERTER_TOKENIZER",
  "tokenizerModule": "/workspace/avereth-setup/approved-model-tokenizer.mjs",
  "contextWindow": 32000,
  "maxOutput": 2000,
  "temperature": 0.7,
  "maxRequests": 24,
  "hashes": {}
}
```

Fenster und Outputcap sind keine bestätigten Werte des zukünftigen Modells. Sie müssen vor der Serie mit dessen wirklicher Konfiguration abgeglichen werden. Für beide Architekturen gelten danach dieselben Temperatur-/Outputgrenzen. Das lokale Tokenizermodul muss `modelId`, `tokenizerId` und `countRequestTokens(body)` exportieren und die gesamte Provideranfrage einschließlich Chatformat-Overhead modellgerecht zählen. Ein tiktoken-Fallback für ein unbekanntes GLM-Modell wäre kein Nachweis. Vor Dispatch wird Input plus erlaubte Ausgabe gegen das Kontextfenster geprüft. Fehlt ein passender verifizierter Tokenizer, bleibt der natürliche Lauf blockiert; Promptzeichen werden nicht als tatsächliche Tokens ausgegeben.

`hashes` muss exakt der geprüften `prepared.json` entsprechen. Eine Userfreigabe im Chat ist Voraussetzung; das boolesche Dateifeld ist nur eine zusätzliche Ausführungssperre und ersetzt sie nicht. Providerendpoint darf keine Zugangsdaten oder Queryparameter enthalten. Es wird kein vorhandenes persönliches ST-Secretsfile gelesen.

Der vorbereitete Startbefehl lautet später:

```sh
# Erst die isolierte ST-Testinstanz mit st-launch.mjs starten.
# Nach gesonderter Freigabe und lokal bereitgestellter Modellkonfiguration:
node experiments/dynamic-gm/natural/run.mjs --live
```

**Dieser Befehl wurde hier nicht mit `--live` ausgeführt.** Der Ablauf hinter der gesperrten Livegrenze ist vorbereitet, aber noch nicht mit einem tatsächlichen Roleplaymodell oder dessen Tokenizer abgenommen. Ohne `--live`/Freigabedatei beendet der Runner sich vor Gateway und Browser.

## Originale und Bewertung

Ausgabewurzel: `/workspace/avereth-setup/natural-comparison/<series>/`. Gespeichert werden vollständige tatsächlich gesendete Providerbody-Messages, Rohantworten ohne Zugangsdaten, Usage, Finishreason, HTTP-Status, Timing und Requestidentität. Einzelne Modellantworten und Ereignisse bleiben zusätzlich in den Turnjournalen nachvollziehbar. `summary.json` enthält bestätigte Anzeigezeit und Abschlussstatus; die Gatewayzeit ist davon getrennt. Providerusage bleibt `null`, falls der Provider sie nicht liefert; es werden keine Tokens erfunden.

Vor Commit natürlicher Originale erfolgt eine erneute Zugangsdatenprüfung und Formatkontrolle. Der Runner schreibt zunächst nur in die isolierte Ausgabewurzel; er pusht selbst nichts. Geplant sind danach ein Vergleichsbericht und nur bereinigte, nachvollziehbare Originale im Experimentbranch.

Die Bewertung ist vorab in `evaluation.json` festgelegt: technische Korrektheit, semantische Fehler und subjektive Erzählqualität werden getrennt. Kein Modell-als-Judge-Aufruf und keine versteckte Zusatzextraktion. Unterschiedliche zulässige NPC-Entscheidungen sind erlaubt. N1 ohne neue Zusage ist nicht automatisch ein Fehler; Aufnahme und Abruf werden für tatsächlich etablierte wichtige Inhalte geprüft. Fehlen solche Inhalte, ist diese Gedächtnisprobe nicht aussagekräftig und wird entsprechend markiert.
