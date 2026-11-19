# Offline-Extractorbenchmark für .203

Im Engineverzeichnis mit Node 22 oder neuer und einem zweiten Checkout von `main` mit den Originalen ausführen.

```sh
node tools/bench_extract_archive.mjs "$MAIN_CHECKOUT"
node --test tests/v4/bench_extract_revision.test.js tests/v4/patch82.test.js
```

Die Ausgabe enthält je Archiv eine JSON-Zeile. `request` ist die einsbasierte physische Requestnummer im jeweiligen Log, `id` der nullbasierte Chatindex ohne JSONL-Header. `rows` bewertet jeden physischen Versuch in Isolation. `jobs` spielt die Antworten in Reihenfolge durch das echte `runExtraction`, einschließlich Auswahl, Reparatur und Commit. `calls[].n` ist der nullbasierte Index im Log. Ein JSON-Roundtrip simuliert die lokale Speicherung. Netzwerk- und Browser-Save werden in diesem Benchmark nicht gemessen.

Der Vergleich umfasst vollständigen gefalteten Zustand und geordnete Revisionsevents. Nur die Millisekunden der Extraktionsereignisse werden beim Vergleich verschiedener Ausführungen ausgeklammert. Eine andere Reparaturentscheidung bleibt sichtbar. `valid`, beantwortete Pflichtschlüssel, Parserhinweise, durch die Firewall abgewiesene Deltas, Welt-/Eventgleichheit und einzelne Prosa-Anforderungen sind verschiedene Größen. `accepted` zählt nicht zurückgewiesene Deltaeinträge. Die gebuchten Ereignisse werden separat geprüft. `semanticComplete: null` steht für eine fehlende oder nicht auswertbare Annotation. Die Prosa-Anker in `tools/bench_extract_expectations.mjs` prüfen ausgewählte Tatsachen. Sie sind kein vollständiges Urteil über eine Szene.

Bei User05 sind 20 physische Antworten für 19 Jobs vorhanden. .203 beendet I34 schon nach dem ersten Versuch. User06 liefert 12 Antworten für zehn Jobs. Der Chat dokumentiert bei I25 einen weiteren Abschluss ohne physisches Paar im Log. Beide User06-Reparaturen sind getrennt erfasst, eine bei Questannahme und eine beim Dungeonbetreten. Beim Dungeon bestehen die beiden Prüfungen „beide Lookouts anwesend“ und „Torwache bleibt am Tor“ unabhängig voneinander. Die gebuchte historische Reparatur verletzt das zweite Kriterium. Ein exakter Replay kann daher dieselbe fachliche Lücke reproduzieren.
