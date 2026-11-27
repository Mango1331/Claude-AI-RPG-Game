# Quellenmanifest User16 (.220)

M zählt Chatnachrichten ohne JSONL-Header ab 0, T Enginezüge, Request physische Modellanfragen ab 1. Alle 33 Exportrecords entsprechen den Chat-Eventlisten exakt (259 Events). Chat und Eventexport tragen durchgehend .220. Seed 526138360. Entwicklungsbranch beim Review bestätigt auf `cc327a1ae44b0aac3605f416078c693b2600ffff`; persönlicher ST-Installationscommit nicht unabhängig aus dem Log ableitbar. ST 1.19.0, release 06bde939f, Node v24.19.0.

| Quelle | Originalbytes | SHA-256 Original | Status |
|---|---:|---|---|
| Userfeedback Spielgefühl(20261126-234908).txt | 771 | 000a9ab053dcf60c1b815a4c78659b6d9fa9964160c5b1d7ffed611cfe026bee | Originalbyte-Git-Blob aceef8a0a97b5236b6e6915b9f743cb5ca83e200, via Connector übertragen und mit lokal berechnetem Blob-SHA abgeglichen |
| avereth-events-[_Avereth Engine Test v4.png_,_Avereth Engine Test v4 - 2026-11-26@23h39m37s334ms_].json | 155959 | 1f4f4a78f1479249e759a2ac7d1c7fadc0a8014934958241a2d843b23599306c | Originalbyte-Git-Blob 7e7941bcd4c6a1d653cd1ff534acbd531d8fd34b, via Connector übertragen und mit lokal berechnetem Blob-SHA abgeglichen |
| Avereth Engine Test v4 - 2026-11-26@23h39m37s334ms.jsonl | 505086 | 21e7c1a1b86bb29d592ad1d9a00d48b037d2cd1f48b9535fc423aa9cd0509ee2 | Originalbyte-Git-Blob a7425694cf92f6153530ab4b37ea1ba91708af40, via Connector übertragen und mit lokal berechnetem Blob-SHA abgeglichen |
| ST_2026-11-26_23-39-01.txt | 5159896 | 2bf0c0a5ad4c32301f7e5906c998e5e9b031c54762a73eecf515b1ad0e927feb | Redigiertes Gzip importiert und verifiziert |

Das private Log enthält einen Windows-Benutzernamen in genau einer lokalen Pfadangabe. Nur dieser Teil wurde durch <redacted> ersetzt; UTF-16LE-BOM und CRLF erhalten. Rekonstruierte redigierte Fassung: 5.159.906 Bytes, SHA-256 26b8d6a8c8fd7fba08b8b88343d8851700ecfca3da0df92eac2a78ad00af6c96. Gzip: 1.053.251 Bytes, SHA-256 b98a0ac6715ca591b4a8b2f94fdf2a6a59897518cc5014e88b0b906d25df5d53. Mustercheck auf typische Provider-/GitHub-Schlüssel, Bearer und Credential-Zuweisungen ohne Treffer; kein vollständiger Datenschutz-Audit.

Direkter Git-Transfer scheiterte an DNS; der Connector übertrug die drei anderen Originale exakt. Der Versuch, das große Log als Blob zu übertragen, scheiterte mit Transportfehler. Das geprüfte ZIP `Avereth_Usertest16_220_Quellenimport.zip` (1.130.999 Bytes) enthält alle vier Archivdateien und Prüfsummen/Restore-Skript/.gitattributes, alle sieben Einträge geprüft. Codex hat das fehlende `originals/st-log.txt.gz` aus dem ZIP importiert. Alle sieben ZIP-Einträge wurden mit den Archivbytes verglichen und alle vier Quellen mit `python restore_log.py --restore` erfolgreich geprüft. Die drei vorhandenen Originale bleiben byteidentisch. Der Hash der privaten unredigierten Fassung ist Herkunftsangabe und aus der redigierten Fassung nicht erneut prüfbar.

[Maschinenlesbare Prüfsummen](source_checksums.json) · [Wiederherstellung](restore_log.py). Keine Produkt- oder Provideränderung.
