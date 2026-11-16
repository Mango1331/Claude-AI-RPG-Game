# GM Alpha 2 – Konfigurations- und Transportabnahme

16.11.2026. Ausgangscommit `50d51a1a6d27d46c0a9b8129c89167f219392950`, ausschließlich `experiment/dynamic-gm-model`. Version **4.3.0-gm.alpha.2**. Mechanischer Kern und Content weiterhin bytegleich `.200` (`0cd14806cd0c7fe2ab0d54b8463c486ee572714b`). Kein neuer Branch, keine Produkt-/Mainänderung, kein natürlicher Provideraufruf.

## Implementiert

- Bevorzugter und einzig budgetgeprüfter Modellpfad: ST 1.19 Chat Completion / Custom, Featherless `/v1`, `zai-org/GLM-5.3-Flash`. Nur Loopback ist zusätzlich für lokale Mocktests erlaubt. Keine automatische Veränderung persönlicher Verbindungseinstellungen oder Schlüssel. Alpha-2-Preset setzt 0,8 / 0,95, beide Penalties 0, 4096 Ausgabe, 32768 Gesamtkontext, Reasoning Low, Seed -1 und nichtstreamende Einzelausgabe. Kein wirkungsloser Preset-Stil als vermeintliche Steuerung.
- Include Body muss den dokumentierten `chat_template_kwargs`-Block mit Low/clear_thinking true enthalten. Es wird vor Dispatch geparst, streng geprüft und als kanonisches JSON/YAML neu aufgebaut. Nur dieser Block und optional `response_format:{type:json_object}` sind erlaubt. Geschützte Felder, widersprüchliche verschachtelte Werte, unbekannte Extras, Exclude Body, Custom-Headers, Post-Processing und Stopstrings werden abgewiesen. STs spät angewandtes Backendmerge erhält ausschließlich diesen geprüften Block. Normales UI-Reasoning bleibt bei GLM im Backend wirkungslos; der tatsächliche verschachtelte Parameterpfad wurde geprüft.
- Vollständige lokale Tokenzählung mit dem originalen HF-GLM-Tokenizer, Revision `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`, und @mlc-ai/web-tokenizers 0.1.6. Eingebauter System/User-Templatepfad enthält das Low-Präfix und Generierungspräfix. Unsupported Media-/Assistant-/Native-Tool-Formate scheitern vor Dispatch. **Input + 4096 + 512 ≤ 32768**, ohne Kürzung von Text, Memory oder Schemas. Die lokale Zählung wird nicht als Provider-Usage ausgegeben.
- Kurzer positiver Stil im echten GM-CORE, genau einmal pro Request. Dritte Person/Vergangenheit für Narration, Spielersprache, konkrete Szenen, eigene NPC-Stimmen/Motive, variables Tempo, weniger Wiederholungen; JSON-Feldnamen und Mechanik bleiben davon getrennt.
- Genau eine abgeschlossene `stop`-Choice mit nichtleerem parsebarem JSON-Objektcontent erforderlich. Length, fehlendes Finish, leerer Content, ungültiges JSON und Inline-Reasoning werden verständlich abgelehnt. Separater Reasoningtext wird nicht in Prosa/Diagnose übernommen. ST-maskierte Fehler bleiben Remote-unknown; kein automatischer Retry oder voreilige Freigabe.
- Diagnose pro physischem Request: ID/Phase, Modell, Laufzeit, HTTP-/Finishgrund, soweit vorhanden Prompt-/Completion-/Reasoning-Tokens und wirksame nicht geheime Parameter. Fehlendes bleibt null. Diagnose und Antwortbeleg werden zusammen gespeichert. Bis zu 100 abgeschlossene Diagnosen bleiben im Kapazitätsjournal, die Oberfläche zeigt die letzten 20. Keine Keys, Auth-Header oder Reasoningtexte. Lokaler Timeout meldet ausdrücklich weiter belegte Kapazität.
- Vorabprüfung erfolgt vor Lease/Versuchsbuchung. Korrigierbare lokale Konfigurations-/Budgetfehler verbrauchen keinen Remoteversuch. Save-/Reload-/Idempotenzmechanismen bleiben erhalten. Keine Schemaverdichtung oder neue Memoryselektion.

## Tatsächliche Prüfung

Eigene Datenwurzel `/workspace/avereth-setup/gm-alpha2-host/data`; ST-Port 8139, lokale Mockprovider 5143/5145. ST 1.19 Source `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Chromium 156.0.8078.79. Nur neu angelegte Testdaten; keine persönliche Installation oder Schlüssel. Browser blockiert externe Verbindungen, Mockantworten sind geskriptet. Keine Produktsuite oder Replay-Fingerprintänderung erforderlich/ausgeführt.

| Prüfung | Ergebnis | Aussage |
|---|---:|---|
| Gezielte Node-Tests | **40/40** | Alpha-Fachabläufe, Steuerung, Parameterpolicy, Budgetgrenzen, unveränderte Engine-/Contentkopien |
| Darin Tokenizerprüfung | **107/107 Referenzvektoren** | Gepinntes unabhängiges Python-HF/Jinja gegen gebündeltes Browser-WASM/Template; ASCII, Deutsch, CJK, Emoji, Combining Characters, Spezialtokens, zufällige JSON-artige Texte |
| Installierte Alpha, Spiel-/Lifecycle-Browserfälle | **23/23**, 0 PageErrors | 22 technische Anforderungen und **eine bestätigte bekannte semantische Schwäche** |
| Echter ST-Backend-Transport | **27/27**, 0 PageErrors | Finalen ST→Mock-Body geprüft; erlaubte Werte, unerlaubte Overrides ohne Dispatch, Oversize, Stil und Fehlerhüllen |
| Separater echter Presetimport | **1/1**, 0 PageErrors | Verbindungsquelle/-URL unverändert; tatsächlicher Wechsel von anderem Temperaturwert |
| Native Send/Enter/Erstellung/HUD | **1/1**, 0 PageErrors | Lokale Fachabläufe, keine Modellrequests |
| Echter ST-Serverneustart und Wiederaufnahme | **1/1**, 0 PageErrors | Identischer Weltzustand, keine neue Generierung |

Damit **53 abschließende Browserprüfungen**, davon **52 technische Erfolge und eine Fehlerdemonstration**, null PageErrors. Abschließende Hauptserie: **27** tatsächliche HTTP-Requests durch ST an den lokalen Mock; Transportserie **11**, zusammen **38 geskriptete Mockrequests**. Preset/UI/Serverneustart: jeweils null. Frühere Entwicklungsdurchläufe sind nicht in diese Abschlusszahl eingerechnet. Keine synthetische Mock-Usage wird als natürliche Token-/Geschwindigkeitsmessung ausgegeben.

Die Hauptserie enthält: Wat mit dauerhafter Zusage und Reload, bekannten Weg und Original-Waldvorstand mit Engineauflösung/GM-Fortsetzung, bewusst nicht erreichte Ankunft, bedingte Befehlsfolge, NPC-Gabe plus neue Zusage ohne erneute Zeit-/RNG-Buchung, historischen Kampf auf Kopie, Stop/Chatwechsel, Savefehler, späte Antwort, Reload nach Weltcommit, zweiter Tab und blockierte Swipes/Regenerate. Der frühere native Textpfad ist nun ausdrücklich als vor Dispatch abgelehnte Einschränkung geprüft. Das ist eine absichtliche Verringerung unterstützter Providerpfade, keine heimlich gleichwertig behauptete Textabnahme.

Transportprüfungen erfassen **den echten finalen ST→Mock-Body**, nicht nur den Browserbody. Temperature 0,8, Top P 0,95, 4096, stream false, n=1, kein natives tools und `chat_template_kwargs:{reasoning_effort:low,clear_thinking:true}` kommen an. Alle zehn benannten kritischen Include-Body-Felder wurden mit unzulässigen Varianten getestet. Oversize stoppt ohne Providerdispatch. Das Stilpräfix steht genau einmal in der Systemnachricht. Antwortdiagnosen bewahren gemeldete Zahlen und unterscheiden unbekannte Werte, Length, leere/ungültige/fehlend abgeschlossene Antworten, getrenntes Reasoning und ST-maskierten 429.

Die erste Spiel-Browserreihe hatte **22/23**: Wiederaufnahme nach lokalem Timeout traf auf die Kapazitätssperre. Der zunächst zusätzliche separate Diagnose-Save wurde entfernt; Diagnose und Receipt werden nun in einem Abschlusscheckpoint gespeichert. Eine gezielte Node-Regression prüft genau zwei Leasewrites (Dispatch, Abschluss), keinen zusätzlichen Diagnoseschritt und Wiederverwendung ohne neuen Dispatch. Die wiederholte vollständige Browserreihe besteht **23/23**, einschließlich dieses Falls. Kein Test wurde durch Freigabe unbekannter Kapazität oder abgeschwächte PageError-Prüfung grün gemacht. Entwicklungslog und erster Fehler-Screenshot bleiben in der eigenen Testwurzel erhalten.

Nachweise: [Node](results/alpha2-unit.log), [Browser](results/browser.json), [Transport](results/transport.json), [Preset](results/presets.json), [UI](results/ui.json), [Neustart](results/restart.json). Die früheren Alpha-1-Abnahmeberichte sind historisch und ersetzen diese Ergebnisse nicht.

## Grenzen und Empfehlung

- Lokale Übertragung und offizieller HF-Tokenizer sind belegt; Featherless' aktiver Template-/Tokenizerstand und natürliche Wirkung von Low/Clear Thinking bleiben **Cloud-Hypothesen**. 512 Reserve ist eine technische Vorsichtsreserve, keine bekannte Servingdifferenz. Bei abweichender Providerrevision neu prüfen.
- Kein Nachweis natürlicher literarischer Qualität oder vollständiger Semantik. Fehlende Zusagen in freier Prosa, erfundene Zustimmung, falsche Ankunft, Geheimnislecks und Fortsetzungswidersprüche bleiben relevante bekannte Risiken. Ein optionaler JSON-Modus löst diese nicht.
- Große Langkampagnen können jetzt kontrolliert am Budget anhalten. Kein Memoryverlust, aber auch keine intelligente Kürzung; Schemaverdichtung ist ein späterer eigener Auftrag.
- Text Completion/andere Modelle sind bis zu eigener Template-/Budgetabnahme gesperrt. Keine tiefen ST-Backendänderungen nötig. Modifizierte Hostserver oder fremde Extensions, die interne Funktionen/Fetch/Dateien manipulieren, sind keine von einem Browserplugin isolierbare Vertrauensgrenze.
- Neue Alpha-2-Testchats verwenden; keine Migration, keine alternativen Swipes. `.200` und bestehende Kampagnen bleiben getrennt.

**Empfehlung:** Geeignet für einen ersten **kurzen, manuell ausgelösten Featherless-Spieltest** nach der beschriebenen einmaligen Custom-Konfiguration: Gespräch/Zusage, Wiedersehen, Waldbewegung, eine Werkzeugfortsetzung. Dabei echte Usage, Finishgründe und Spielqualität ansehen. Keine automatische Benchmarkserie und kein GO für eine lange Kampagne oder die Produktübernahme allein aus dieser technischen Abnahme.

## Reproduktion und Paket

```sh
node experiments/dynamic-gm/alpha/build.mjs
node --test experiments/dynamic-gm/alpha/alpha.test.mjs experiments/dynamic-gm/alpha/transport.test.mjs experiments/dynamic-gm/alpha/tokenizer.test.mjs
node experiments/dynamic-gm/alpha/st-launch.mjs
# Eigenes Terminal; ausschließlich markierte Testdaten/Loopback:
node experiments/dynamic-gm/alpha/browser.mjs
node experiments/dynamic-gm/alpha/transport-browser.mjs
node experiments/dynamic-gm/alpha/preset-check.mjs
node experiments/dynamic-gm/alpha/ui-check.mjs
# Eigene ST-Instanz stoppen und mit demselben Launcher neu starten:
node experiments/dynamic-gm/alpha/restart-check.mjs
node experiments/dynamic-gm/alpha/build.mjs
python3 experiments/dynamic-gm/alpha/package.py
```

ZIP: `releases/Avereth-GM-Alpha-2.zip`; SHA-256 in der gleichnamigen `.sha256`-Datei. Sortierte Dateireihenfolge, feste ZIP-Zeitstempel/Rechte, identische Eingaben erzeugen identische Bytes. Original-Alpha-1-ZIP bleibt erhalten. Der größere Paketumfang stammt aus dem lokalen GLM-Tokenizer/WASM, nicht aus neuen Gameplaymechaniken.
