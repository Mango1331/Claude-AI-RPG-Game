# Featherless-Promptcache bei Avereth .203

**Der jüngste Lauf hatte wiederverwendbare Präfixe.** Bei zwei Extractoraufrufen waren sämtliche 15.395 Eingabetokens identisch. Bei einem Boardrepair vergingen zwischen bestätigtem Ende und nächstem Versand 48 ms bei 2.264 identischen Präfixtokens. Beide Cachezähler meldeten jeweils null. Eine andere Reihenfolge der Promptteile löst diesen Befund allein nicht auf. Der stärkste beobachtete Unterschied ist der Abrechnungsweg.

## Welche Information der Anbieter tatsächlich liefert

Featherless dokumentiert automatisches Caching ausreichend langer, exakt übereinstimmender, kürzlich bedienter Präfixe, als Größenordnung rund 1.000 Tokens. Das Wort „eligible“ lässt Ausnahmen zu. Ein spezieller Requestparameter ist nicht vorgesehen. Die dokumentierten Felder `usage.cached_tokens` und `usage.prompt_tokens_details.cached_tokens` zählen zum Cachepreis abgerechnete Inputtokens. `usage.cost` bezeichnet die abgerechnete USD-Gebühr und entfällt laut Dokumentation bei Abonnements. Ein technischer GPU-Cache kann für einen Client unsichtbar bleiben. Die genannten Seiten geben für diese Kombination keine verbindliche TTL, Workerzuordnung oder Garantie pro Präfix an. [Requestpreise und Credits](https://featherless.ai/docs/request-pricing-and-credits) · [Completions, Usage und SSE](https://featherless.ai/docs/completions)

Alle fünf offiziellen Quellen wurden am 19.11.2026 direkt abgerufen. Für **zai-org/GLM-5.3-Flash** nennt Featherless pro Million Tokens 0,15 USD regulären Input, 0,03 USD gecachten Input und 0,50 USD Output. Die öffentlichen Tarifbedingungen beschränken Chat auf persönliche interaktive Nutzung und schließen automatisierte Benchmarks aus. Developer rechnet tokenbasiert gegen Guthaben ab. Das dokumentierte authentifizierte GET auf `/v1/plan` ergab im aktuellen Testzugang HTTP 200 und die Kategorie **Chat**. Der Bericht speichert ausschließlich die Kategorie. Die Limit-/Guthaben- und sonstigen Kontofelder wurden nicht übernommen. Die Tarifabfrage belegt den aktuellen Stand, keine historische Kontohistorie. [Modellpreise](https://featherless.ai/blog/glm-5-3-flash-vs-qwen-3-8-flash-next-vs-qwen-3-8-27b) · [Plan-Endpunkt](https://featherless.ai/docs/api-reference-plan) · [Tarifbedingungen](https://featherless.ai/pricing)

## Originale und Methode

User04 umfasst 124 physische Antworten aus dem komprimierten Windows-Serverlog, User05 alle 64 aus drei vollständigen Abschnitten. Für User04 wurde die umkehrbare CP850/UTF-8-Konsolenverwechslung rückgängig gemacht. Aus dem bereinigten jüngsten Archiv wurden alle 86 finalen Nachrichtenarrays per SHA-256 dem physischen Journal zugeordnet, einschließlich Vorproben und Zusatzversuchen. Offizieller Tokenizer und Chattemplate sind per Dateihash gepinnt. Für **274/274** Requests stimmen neu tokenisierte Gesamtlänge und gemeldete Promptlänge exakt überein. Jeder der drei Korpora beginnt eine eigene Vergleichsreihe. Bei User05 gehören die drei archivierten Protokollabschnitte zu derselben Reihe. Ob der Anbieter zwischen zwei Requests dieselbe Kontositzung oder denselben Worker verwendete, ist aus den Daten nicht ersichtlich. [Daten je Request und Vergleichspartner](performance_cycle2_203/praefixe.json) · [Archiv der natürlichen A/B-Daten](performance_natural_ab_203/laufdaten.tar.gz)

Die Tabelle zeigt je Korpus und Rolle den größten exakten Tokenpräfix mit einem früheren Request derselben Rolle. Bei Gleichstand zählt der jüngste Vorgänger. Alter ist im natürlichen Lauf Start bis Start am Proxy, in den älteren Logs der Abstand der Provider-`created`-Sekunden. Im JSON ist zusätzlich der bekannte Abstand ab Ende des früheren natürlichen Requests hinterlegt. Spalte „Parameter“ enthält Temperatur, Ausgabelimit und Transport. Alle tabellierten Paare verwenden dasselbe Modell, `reasoning_effort=low` und `clear_thinking=true`. In den Narratorbeispielen ist Top-p 0,95. Die übrigen erfassten Parameter und ihre Änderungen stehen pro Zeile im JSON. Nur beim jüngsten N-Maximum wechselt der Transport zwischen den Partnern von gepuffert zu SSE.

| Korpus | Rolle | Früher → später | Gesamter Input später | Identischer Präfix | Alter, s | Parameter | Gemeldeter Cache später |
|---|---|---:|---:|---:|---:|---|---:|
| User04 | P | 49 → 50 | 13139 | 13019 | 5 | 0,1 / 2000 / JSON | 13014 |
| User04 | N | 51 → 54 | 11987 | 9700 | 153 | 0,9 / 8192 / JSON | 9895 |
| User04 | X | 68 → 69 | 15362 | 14550 | 9 | 0,1 / 4000 / JSON | 14676 |
| User04 | B | 12 → 13 | 3949 | 2611 | 12 | 0,6 / 3000 / JSON | 2821 |
| User05 | P | 15 → 18 | 13688 | 12036 | 926 | 0,1 / 2000 / JSON | 0 |
| User05 | N | 53 → 55 | 12563 | 9949 | 118 | 0,9 / 4096 / JSON | 0 |
| User05 | X | 44 → 45 | 15638 | 14960 | 21 | 0,1 / 4000 / JSON | 0 |
| User05 | B | 11 → 12 | 3759 | 2602 | 59 | 0,6 / 3000 / JSON | 0 |
| AB | P | 18 → 25 | 13752 | 11716 | 143,667 | 0,1 / 2000 / JSON | 0 |
| AB | N | 4 → 7 | 12251 | 12251 | 28,035 | 0,9 / 4096 / SSE | 0 |
| AB | X | 50 → 73 | 15395 | 15395 | 487,876 | 0,1 / 4000 / JSON | 0 |
| AB | B | 10 → 14 | 2685 | 2336 | 208,289 | 0,6 / 3000 / JSON | 0 |

P steht für Planner, N für Narrator, X für Extractor und B für die Tafel. Passive-Generierung und zwei Vorproben sind in der Detaildatei ebenfalls enthalten.

| Evidenz | User04 | User05 | Natürlicher A/B-Lauf |
|---|---:|---:|---:|
| Beide Cachefelder vorhanden, Werte identisch | 124/124 | 64/64 | 86/86 |
| Positiver Cachewert | 80/124 | 0/64 | 0/86 |
| Gebührenfeld vorhanden | 124/124 | 0/64 | 0/86 |
| N-Folgepaare mit unveränderter Lore und positivem Cache | 18/18 | 0/9 | 0/16 |
| N-Folgepaare mit geänderter Lore und positivem Cache | 0/19 | 0/9 | 0/9 |
| Änderung der Kartenbeschreibung in N-Folgepaaren | 0/37 | 0/18 | 0/25 |
| Änderung Engineblock / Änderung Nachrichtenverlauf in N-Folgepaaren | 37/37 · 37/37 | 17/18 · 18/18 | 21/25 · 21/25 |
| Median gemeinsamer Präfix mit unmittelbar vorigem physischen Request, alle Rollen | 10 | 10 | 10 |

Aufeinanderfolgende physische Rollenwechsel gab es 116-mal bei User04, 57-mal bei User05 und 74-mal im A/B-Lauf. Ihr unmittelbarer gemeinsamer Präfix umfasste nur 9–11 Tokens. Der Vergleich mit der vorherigen passenden Rolle erklärt, warum trotzdem viele lange theoretische Treffer existieren. Die getrennt geprüfte Spieler-Persona änderte sich innerhalb keiner N-Reihe.

User04 meldet insgesamt **825.898** Cached-Inputtokens und 0,14687729 USD. Mit den drei dokumentierten Preisen lässt sich jede seiner Gebühren nachrechnen. Bei den 18 positiven Narratoren liegt die gemeldete Menge um 127–248 Tokens über dem besten aus den geloggten früheren Eingaben rekonstruierbaren Präfix. Der Anbieter kann weitere Kontexte verarbeiten. Ein Präfixmodell bildet weder internen Cachezustand noch tatsächliche Gebühren exakt ab.

Der Fingerprint `fp1-nst-nes` ist in User04 119-mal und in User05 63-mal vorhanden. Im neuen Lauf lässt er sich für 68 gepufferte Antworten aus ST wiederherstellen, einmal erscheint `fp1-neb-api`. Für 17 SSE-Antworten enthält das bereinigte Archiv keinen vollständigen Fingerprint. Die Usage für diese Streams ist über die physische Erfassung vorhanden. Derselbe sichtbare Fingerprint tritt über Läufe mit und ohne gemeldeten Cache auf. Die beiden verglichenen X-Requests 71 und 72 hatten gleiche Requestparameter, 11.381 gemeinsame Starttokens und nur 1,705 s Abstand ab dem vorigen Abschluss. Cache war null. Die vollständige Gleichheit der X-Inputs 50 und 73 ist ein weiterer Gegenfall mit größerem Zeitabstand.

**Entscheidung.** Ein identischer Präfix ist für die angegebenen Paare nachgewiesen. Für User04 sind auch die abgerechneten Treffer nachgewiesen. User05 und A/B erfüllen häufig die veröffentlichte Längenvoraussetzung und zeigen damit eine technische Möglichkeit, deren tatsächliche Nutzung unbekannt bleibt. Für beide Nullläufe steht kein Treffer im Gebührenzähler. Abrechnungs-/Tarifunterschiede sind als Erklärung plausibel. Weder der heutige Planstatus noch die Antwortdaten belegen den historischen Tarif jedes Requests oder die Routing-/Cacheursache beim Anbieter. **NO-GO für weitere Promptumsortierungen oder automatisierte Providerbenchmarks auf dem verfügbaren Zugang.**

## Späterer kontrollierter Cacheversuch

Voraussetzungen sind ein für Benchmarks zugelassener Zugang, ein erneutes nichtgenerierendes GET auf `/v1/plan` und ausdrückliche Freigabe von Modell, Anzahl und Geldbetrag. Ein eigenes Budget für Cache und Spielfluss vermeidet eine Vermischung. Der folgende Vorschlag erteilt keine Freigabe.

1. Zuerst acht serielle Transportproben, maximal 16.000 Input- und 128 Outputtokens je Request, maximal 0,03 USD bei den oben genannten Preisen. Zwei echte lange X-Systempräfixe aus dem Korpus verwenden, jeweils mit kurzem unterschiedlich formuliertem Schluss aus der gleichen Szene. Ausgeben lassen, was in das kleine Messziel passt. Output dieser begrenzten Probe dient nur der Cachingmessung. Statt Fülltext echte Regeln und Fakten verwenden.
2. Je Präfix vier Varianten senden. Erster Block gepuffert, gepuffert sofort, SSE sofort, SSE nach vorab festgelegten 120 s. Zweiter Block mit vertauschter Transportreihenfolge. Modell, Sampling, Systemteil und sichtbare Suffixlängen festhalten. Für SSE vollständige Usage aus dem terminalen Paket erfassen. Fehlen Usage oder Gebühren, als fehlend ausweisen. Nach unbekanntem Abschluss bleibt die globale Sperre geschlossen.
3. Pro Request tatsächliches Tokenpräfix zum besten Vorgänger, Alter seit dessen Ende, Gesamtinput, beide Cachefelder, Gebühr, Finish, Dauer und Sichtbarkeit ausgeben. Der erste Request einer Serie kann bereits abgerechnete Treffer haben. Kein erzwungenes kaltes Modell voraussetzen. Sind auf dem berechtigten Zugang auch die kontrollierten Werte nicht prüfbar oder immer null, an dieser Stelle stoppen.
4. Nur bei verifizierbarer Meldung und **zusätzlicher** Freigabe ein Rollenexperiment ansetzen. Standardpreset und Karte-vor-Lore auf zwei unveränderten Narratorszenen mit identischer, dann wechselnder tatsächlich aktivierter Lore kreuzen. Beide Anordnungen erhalten dieselben Nachrichten und werden in A–B-/B–A-Reihenfolge gespielt. Dazu zwei getrennte P- und X-Kontrollblöcke mit eigenen statischen Präfixen. Vor Versand Limit für diesen zweiten Block berechnen und genehmigen lassen. Rollen getrennt auswerten. Die Paardifferenzen der Zeiten samt Median und alle Cache-/Kostenwerte berichten.
