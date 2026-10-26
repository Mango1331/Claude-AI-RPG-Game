# Run20 – technische Folgekorrekturen (.97)

Basis `.96` / `f50ca4e`, Build **4.3.0-c.6.6.97**, 26.10.2026. Alle drei Fachpläne auf main geprüft; F-Progression, XP, Gearwerte und Runner bleiben unverändert.

## A – Extractor und Repair: gezielte Verbesserung, begrenzter Abbruch bleibt

Der Originalfehler ist eine fehlende Szenenannotation am Thread `deltas[1]` vor der späteren Ankunft, kein defekter Questzähler. Bei einem solchen Repairfehler erhält das Modell jetzt die tatsächliche Engine-Ausgangsszene und den ausdrücklichen Auftrag, frühere Schauplätze korrekt anzugeben und unabhängige Deltas/Expected-Antworten zu erhalten. Kein automatisches Annotieren, Sortieren oder Erfinden von Ankünften. Normale Calls bekommen keinen zusätzlichen Repairtext.

Der Custom-Endpoint-Host unterscheidet nun seinen eigenen 120000-ms-Timer (`LLM_TIMEOUT`), äußeren Abbruch (`LLM_CANCELLED`) und Provider-/HTTP-Fehler (`LLM_PROVIDER`). `ask` protokolliert `error_kind: timeout/cancelled/provider/aborted/transport`; unbestimmte AbortErrors werden nicht als erwiesene Timeouts ausgegeben. Historische Fehler werden nicht rückwirkend klassifiziert.

**Entscheidung:** Kein neuer dritter Call nach einem Repair-Transportfehler. Dafür ist keine nachgewiesene Verbesserung vorhanden; er verlängerte Ausfälle und ersetzt keine funktionierende Providerverbindung. Bestehende Recovery nach primärem Transportfehler bzw. zwei leeren Antworten bleibt. Scheitert der normale Repair, endet die Extraktion weiter sichtbar als `failed`, ohne Weltbuchung oder Pending-Hänger. Message-/Swipe-/Turn-Sicherungen und Token-/Zeitlimits bleiben erhalten. Externe Ausfälle können den nächsten Run weiterhin abbrechen.

Die originale Fünf-Delta-Antwort wurde mit ihrem tatsächlichen Katalog und Startort geprüft. Nach alleiniger Ergänzung der korrekten Thread-Szene wird die Ankunft gebucht, der falsche READY-Anspruch bei **3/4** Kills aber weiter als `quest_count` abgelehnt; keine Auszahlung/XP. Diese Schutzprobe ist schon auf `.96` grün.

## B – Guild-Ortsbezug: vor dem kommenden Run korrigiert

Der Hallen-GO berücksichtigt das unmittelbar vorangehende strukturierte GO-Ziel derselben Handlung. Auch ein als „bereits hier“ abgewiesenes Wethervord-GO bleibt Kontext für die nachfolgende Hallenreferenz. Eine lokale Eintrittsformulierung verwendet das gegenwärtige Settlement. Diese Auslegung setzt weder Ankunft noch Bewegung voraus. `guildDestination` bleibt die gemeinsame kanonische Hallenauflösung; bei fehlender Filiale wird verweigert statt Alderwatch gewählt. Kein neues Gebäude oder Ortsparser.

Explizite Hallen-Stadtangaben haben weiterhin Vorrang. Die bisher erlaubte ortsungebundene Rückkehr aus Wildnis bleibt; Guild-Landmarken sind weiterhin keine Hallen. Der Originalinput und alle drei Plannerkommandos von T203 autorisieren jetzt weder Alderwatch noch eine Auszahlung. Eine bekannte passende Hallenreise bleibt möglich, ihre Ankunft bleibt bestätigungspflichtig. Nicht jede beliebige sprachliche Ortsbindung wird durch diesen kleinen strukturierten Fix erkannt.

## C – `repriced`: kleiner bestätigter Integritätsfix

Der Validator erkennt den bereits regulär gebuchten terminalen Status `repriced` an. Reducer, Eventformat und Handelsberechnung ändern sich nicht. Nur `open` ist annehmbar; alte Preise werden nicht wieder geöffnet. Die Regression geht durch echte World-Offerten10→12→12Kupfer: zwei Angebote, eines ersetzt; neue Offerte einmal bezahlt, unveränderte Wiederholung erzeugt nichts Neues. Unbekannte Status bleiben Fehler. Replay benötigt keine Migration.

## Abnahme

- Zehn neue Regressionen: auf unverändertem `.96` **acht rot/zwei grüne Kontrollen**, danach10/10. Original-T203-State vor Message406 und originale Call726-Antwort/State vor letzter Antwort aus dem lokalen Run20-Export; Fixture enthält diese Daten, keine ZIP-Neuarchivierung. Bei State203 wurden nicht benötigte Erinnerungen/Wissen/Claims/Threads/Credits entfernt, bei State252 nur Erinnerungen.
- Angrenzend **60/60** (einschließlich Run19, Transport-Recovery und World-Job-Lifecycle); vollständiges **npm test:1881/1881**.
- Hosttimer per injiziertem Timer/Fetch am tatsächlichen `v4Llm`-Quelltext getestet: kein120s-Warten, weiterhin120000ms-Limit. Timeout, externer Abbruch und HTTP503 getrennt geprüft. Schemafehler + Repairtimeout bleibt bei zwei Calls, ohne `extract.applied`.
- Echter ST1.19-Mock-Smoke: **21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte aktuelle Story-Records jeweils applied und genau ein extract.applied. Kein natürlicher GLM-Langlauf gestartet. Ein grüner Mock-Smoke beweist keine allgemeine Providerverfügbarkeit.

Die F-Policy aus `.96` bleibt intakt; keine Balanceänderung, neue Recovery-Schlange, Eventmigration oder zusätzliche Spielerpflicht.
