# Erster natürlicher GM-/B-Vergleich – vorbereiteter, noch nicht ausgeführter Lauf

16.11.2026. Basis `d2abb788ffc43834a092e96f11398f1b9007b93a`, ausschließlich `experiment/dynamic-gm-model`. Verbindliche Grundlage ist der [echte ST-Hostdurchstich](ST_HOSTDURCHSTICH_2026-11-16.md).

**Status: Testvorbereitung abgeschlossen, natürliche Serie nicht gestartet. Tatsächliche natürliche Providerrequests: 0.** Der Auftrag verlangt ausdrücklich: „Provideraufrufe nur nach gesonderter ausdrücklicher Nutzerfreigabe. Ohne diese Freigabe ausschließlich die Testvorbereitung durchführen.“ Eine solche separate Freigabe liegt in dieser Aufgabe noch nicht vor. Es wurden weder ein Provider noch ein Modell hinter einem vorhandenen Zugang ausprobiert und keine persönlichen ST-Einstellungen oder Zugangsdaten gelesen.

## Vorbereitetes Experiment

[Protokoll und Ausführungsvoraussetzungen](natural/README.md), [eingefrorene Fälle und Codehashes](natural/prepared.json), [Bewertungskriterien](natural/evaluation.json).

Fünf Züge pro Architektur: N1 Erstgespräch ohne erzwungene Zusage; N1 späterer Abruf ohne Originaldialog; N2 Original-Waldbewegung aus dem persönlichen .200-Lauf; N3 unterstütztes TAKE mit davon abhängigem GO; N4 freie NPC-Reaktion auf bestehender historischer Grundlage. Die historische Originalnarration, Pläne oder Extractorantworten werden **nicht als natürliche Antworten wiederverwendet**. Der lose N3-Schlüssel ist als explizite synthetische Ausgangszustandsänderung dokumentiert. Der frühere Ablenkungs-/Diebstahlfall bleibt unsupported.

Für den Gedächtnisabruf bleiben die jeweils bestätigten Ereignisse, NPC-Identitäten und Zusagen erhalten. Aus dem aktiven Prompt verschwinden Originaldialog und gekürzter Planner-RECENT. Gespeicherte Erinnerungsinhalte sind weiterhin legitime Information. Die Probe ist ein enger späterer Folgezug mit Kontextentfernung, keine tatsächliche mehrtägige Rückkehrsimulation oder Langzeitkampagne. Entsteht im Erstgespräch keine wichtige neue Information, wird der Abrufnachweis als nicht aussagekräftig markiert; es wird keine Zusage erzwungen.

Beide Arme erhalten dieselben Eingaben und Ausgangszustände. N1-Folgezustände dürfen durch legitime Geschichten auseinandergehen. Endzustandsgleichheit wird bei verschiedenen kreativen Entscheidungen nicht verlangt. Die vorab festgelegte Armreihenfolge wechselt. Alle normalen B-Phasen und dynamischen Werkzeugfortsetzungen verwenden später dasselbe tatsächliche Modell mit identischer Temperatur und Outputgrenze.

## Kosten- und Fehlergrenzen

Ein gemeinsames persistentes Ledger schreibt jede tatsächliche Provideranfrage vor Dispatch dauerhaft auf. Höchstgrenze **24**, höchstens eine gleichzeitig laufende Anfrage, keine automatischen Transportretrys. B-Plannerreparaturen werden für diese kleine feste Serie ebenfalls nicht automatisch weitergeführt; diese Abweichung zum Produkt ist offengelegt. Echte dynamische Tool-/Schemafortsetzungen sind weiterhin erlaubt und werden gezählt.

Timeout, unbekanntes Remoteende, Prozessverlust bei gesendetem Request, Concurrency-Ablehnung, Providerfehler oder abgeschnittene Antwort stoppen kontrolliert. Eine gesperrte oder bereits begonnene Serien-ID wird nicht automatisch zurückgesetzt. Fehlversuche zählen. Sind 24 Requests erreicht, werden offene Fälle als nicht ausgeführt ausgewiesen; vollständige Abdeckung wird nicht durch ein Budget-Override erzwungen.

Die erfolgreiche Basiserwartung B=etwa 15 Requests plus GM=etwa 5–9 ist nur eine Ablaufplanung, **keine gemessene Ersparnis**. Das Budget kann bei legitimen Toolabrufen oder Fehlern vorher ausgehen. Ein SDK-Loop, ein Werkzeugcall und eine spätere Modellfortsetzung werden nicht als ein physischer Request zusammengezählt.

## Tatsächliche Umsetzung der Vorbereitung

- `natural/cases.mjs`: gemeinsame Testeingaben, Quellverweise, Ausgangszustände und explizite N3-Fixtureänderung; keine erwartete Erfolgsnarration.
- `natural/adapter.mjs`: unveränderter B-/GM-Executor plus gezielte Kontextentfernung für N1. B bleibt der isolierte B-Prototyp, kein vollständig repräsentativer .200-Produktadapter.
- `natural/ledger.mjs`: persistenter gemeinsamer Budget-/Serialisierungs-/Fehlerstatus, vollständige bereinigte Request-/Responseoriginale und echte Usage, sofern geliefert.
- `natural/gateway.mjs`: gesperrter künftiger lokaler ST→Provider-Übergang. Zugangsinformation wird erst bei einem freigegebenen Lauf aus einer spezifischen Umgebungsvariable serverseitig ergänzt, nie an ST oder den Browser geschickt. Im jetzigen Auftrag nicht gestartet.
- `natural/run.mjs`: gesperrter künftiger Browserablauf über die bestehende isolierte ST-Brücke. Ein Aufruf ohne `--live` und ausdrückliche externe Freigabedatei endet vor Gateway/Browser. Prompt-/Codehashes müssen dem geprüften Manifest entsprechen.

Vor einem natürlichen Start fehlen: separate Nutzerfreigabe; tatsächlicher Providerendpoint und Modell-ID; bestätigtes Kontextfenster/Outputcap; ein zum Modell passender verifizierter Tokenizer und die eigens bereitgestellte Zugangsinformation. Historische Nutzerangaben zu GLM-5.3-Flash ersetzen diese Konfiguration nicht. Ein fremder API-/Git-Token wird nicht als Zugangsfallback verwendet. Das technische Freigabefeld im Runner ersetzt die verlangte Nutzerentscheidung nicht.

Die Tokenprüfung verlangt vollständiges modellgerechtes Inputcounting einschließlich Chatformat-Overhead plus reservierter Ausgabe. Keine Schätzung aus Zeichen oder einem unpassenden Tokenizer. Das konkret eingesetzte Roleplaymodell und der Providerpfad sind noch nicht abgenommen. Daher wird die vorbereitete Livefunktion nicht als bereits erfolgreich getestet ausgegeben.

## Ausgeführte lokale Prüfungen

`node --test experiments/dynamic-gm/natural/preparation.test.mjs`: **15/15 bestanden**, 0 fehlgeschlagen/übersprungen, ca. **3,85 s**. Ausschließlich lokale kontrollierte Antworten, keine natürliche Generierung.

Geprüft wurden: 24er-Hartgrenze und persistenter Wiederanlauf; gegenseitiger Ausschluss bei asynchroner Tokenzählung; Timeout-/Remote-unbekannt-Sperre; Prozessverlust; Concurrency-/Providerfehler und Trunkierung; Kontext-/Settingsprüfung vor Dispatch; Bereinigung von Request/Response-Credentialecho; getrennte Freigabe und unveränderte Hashes; CLI-Sperre ohne Freigabe; N1-Historien-/RECENT-Entfernung bei erhaltener strukturierter Erinnerung; Quellen-/Fixturegrenzen; tatsächliche B-/GM-Callbackverdrahtung mit ausdrücklich geskripteten Antworten.

Die Verdrahtungsproben B=3 und GM=1 Callback sind **Testdaten**, keine natürlichen Vergleichsergebnisse. Es wurden keine breiten Tests, erneute ST-Smokes, historischen Replays, Produktänderungen oder Gameplayänderungen durchgeführt. Der Browserhostnachweis aus d2abb78 bleibt vorherige Evidenz und wurde hier nicht als natürliche Probe umbenannt.

## Grenzen des vorgesehenen B-Vergleichs

B besitzt echte Planner-/Narrator-/Extractor-Phasen, aber sein Prompt ist der vorhandene Prototypprompt aus exportierten statischen Blöcken und ausgewählter Historie. Er bildet nicht sämtliche produktiven ST-Injections ab; die importierten Terminalblöcke besitzen bekannte Encodingartefakte. Der Prototyp verwirft bei fachlichen Ablehnungen den ganzen Kandidaten. Das Produkt hat teilweise andere Recovery-/Teilbuchungsabläufe. Die kleine Serie deaktiviert automatische Wiederholungsreparaturen.

Der dynamische GM hat wesentlich weniger globale Kanon-/Regelinstruktionen. Das ist Teil des derzeitigen Prototypstands, kann aber Qualitätsunterschiede durch fehlende Kontextinformation verursachen. Eine schlechte Antwort beweist dann nicht automatisch ein prinzipielles Versagen der Zielarchitektur. Ebenso ist ein kürzerer Prompt kein eigener Qualitätsbeweis. Solche Unterschiede werden anhand der tatsächlichen Messages und Originalantworten benannt; nachträgliche Promptänderungen werden nicht innerhalb derselben Serie verrechnet.

## Noch unbeantwortete Entscheidungsfragen

| Frage | Tatsächlicher Stand |
|---|---|
| Funktioniert der dynamische GM mit einem echten RP-Modell? | Noch nicht geprüft; nur Offline-/Mocknachweise vorhanden |
| Qualitativer Vorteil gegenüber B? | Keine natürliche Evidenz; keine Bewertung vergeben |
| Direkt erzeugtes Gedächtnis ausreichend zuverlässig? | Offen; bei synthetischen Gegenfällen bestehen bekannte Fehler |
| Tatsächliche Request-/Tokenersparnis? | Nicht gemessen; nur Budgetplanung vorhanden |
| Kritische Fehler für längeren persönlichen Spieltest? | Bekannte synthetische Risiken bleiben: Memoryauslassung, Orts-/Fortsetzungswiderspruch, erfundene Zustimmung, fremdes NPC-Wissen und ausgelassene Mechanik. Natürliche Häufigkeit unbekannt |
| Architektur bestätigt, korrigieren oder Alternative wählen? | Keine neue belastbare Entscheidung aus dieser Vorbereitung ableitbar. Der kleine freizugebende Vergleich ist der nächste Erkenntnisschritt |

**Empfehlung:** Die vorbereitete kleine Serie nach gesonderter ausdrücklicher Freigabe und vollständiger Modell-/Tokenizerkonfiguration durchführen. Ergebnisse zuerst technisch, dann semantisch und schließlich narrativ anhand vorab festgelegter Kriterien bewerten. Keine Produkt- oder persönliche Spieltestfreigabe aus der Vorbereitung ableiten.
