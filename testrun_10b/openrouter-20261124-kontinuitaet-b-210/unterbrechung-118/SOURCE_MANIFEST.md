# Quellen zur abgewiesenen B7-Eingabe

ID 118 endete nach OpenRouter HTTP 429 in 188 ms. Fehlersignatur und Kostenreserve stehen in der Freigabedatei. Vor der ersten Wiederaufnahme wurde der Rücklauf vollständig gelesen und ausschließlich die von OpenRouter im Fehlerbody ergänzte Kontokennung im öffentlichen Archiv ersetzt. Die SHA-256 des ursprünglichen privaten Fehlerkörpers steht in der Freigabedatei. Die Auskunft des nichtgenerierenden Abrufs der einzelnen Generation ist dort mitarchiviert. Im ursprünglichen ST-Serverlog ist eine Ratenablehnung nachweisbar und keine weitere lokale HTTP-409-Ablehnung. Die beiden unvollständigen Chatstände enthalten den Spielertext ohne Buchungen. Der letzte vollständige Save und der für die Fortsetzung importierte Präfix sind bytegleich.

| Datei | Bytes | SHA-256 |
|---|---:|---|
| `abgebrochener-browserchat.json.gz` | 77428 | `1ec79ad17412bb02cb1003c33283ea2d1be1c73b4d99e1ef20abcf3cbc29d51f` |
| `abgebrochener-disk-save.jsonl.gz` | 46431 | `173de19d2fec3226d1cf7ea00dfc00a6dd7b8a3cf354806a278fe4a705a2b44b` |
| `fehlerantwort-118.json.gz` | 332 | `e0ab7882036dc6b1a93c62a865bb2ec4c82d93b7a614287c973e81df492f5c69` |
| `fortsetzung-start.jsonl.gz` | 46195 | `634e938cf047f062af58e8b9ed641036a259a2a400aea60214b510d034b334ec` |
| `freigabe.json` | 632 | `56c6b8fbc729adc7ead64b30206d2ccfd3ffe0dbee8563b0466199b878d50a74` |
| `fruehere-eingaberevision.json` | 342 | `c054d939a498ca5fc13468b2fe755651f398bcd7037635c150a0eadb69316102` |
| `letzte-vollstaendige-ereignisse.json.gz` | 16603 | `6c576042020505a8e3e9ce0c9814e9650ba0c19b37f0a38e4263b2b0a7a6696a` |
| `letzter-vollstaendiger-save.jsonl.gz` | 46195 | `634e938cf047f062af58e8b9ed641036a259a2a400aea60214b510d034b334ec` |
| `letzter-vollstaendiger-weltstand.json.gz` | 11198 | `a2c61043b808fa210a8dee3e5605fad5320d7c8edd82aff09c54c5b4094c4fef` |
| `kosten-nachpruefung.json` | 199 | `c5a48dd333b1b5a9fc5cd612494ad768238d7c39e3a66711551ca3fda7ea83d8` |
