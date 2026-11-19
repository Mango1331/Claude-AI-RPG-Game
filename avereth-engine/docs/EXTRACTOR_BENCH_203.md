# Offline-Extractorbenchmark für .203

Im Engineverzeichnis mit Node 22 oder neuer und einem zweiten Checkout von `main` mit den Originalen ausführen.

```sh
node tools/bench_extract_archive.mjs "$MAIN_CHECKOUT"
node --test tests/v4/bench_extract_revision.test.js tests/v4/patch82.test.js
```

Die Ausgabe enthält je Archiv eine JSON-Zeile. `request` ist die einsbasierte physische Requestnummer im jeweiligen Log, `id` der nullbasierte Chatindex ohne JSONL-Header. `rows` bewertet jeden physischen Versuch in Isolation. `jobs` spielt die Antworten in Reihenfolge durch das echte `runExtraction`, einschließlich Auswahl, Reparatur und Commit. `calls[].n` ist der nullbasierte Index im Log. Ein JSON-Roundtrip simuliert die lokale Speicherung. Netzwerk- und Browser-Save werden in diesem Benchmark nicht gemessen.

Der Vergleich umfasst vollständigen gefalteten Zustand und geordnete Revisionsevents. Nur die Millisekunden der Extraktionsereignisse werden beim Vergleich verschiedener Ausführungen ausgeklammert. Eine andere Reparaturentscheidung bleibt sichtbar. `valid`, beantwortete Pflichtschlüssel, Parserhinweise, durch die Firewall abgewiesene Deltas, Welt-/Eventgleichheit und einzelne Prosa-Anforderungen sind verschiedene Größen. `accepted` zählt nicht zurückgewiesene Deltaeinträge. Die gebuchten Ereignisse werden separat geprüft. `semanticComplete: null` steht für eine fehlende oder nicht auswertbare Annotation. Die Prosa-Anker in `tools/bench_extract_expectations.mjs` prüfen ausgewählte Tatsachen. Sie sind kein vollständiges Urteil über eine Szene.

Bei User05 sind 20 physische Antworten für 19 Jobs vorhanden. .203 beendet I34 schon nach dem ersten Versuch. User06 liefert 12 Antworten für zehn Jobs. Der Chat dokumentiert bei I25 einen weiteren Abschluss ohne physisches Paar im Log. Beide User06-Reparaturen sind getrennt erfasst, eine bei Questannahme und eine beim Dungeonbetreten. Beim Dungeon bestehen die beiden Prüfungen „beide Lookouts anwesend“ und „Torwache bleibt am Tor“ unabhängig voneinander. Die gebuchte historische Reparatur verletzt das zweite Kriterium. Ein exakter Replay kann daher dieselbe fachliche Lücke reproduzieren.

## X2-Ausgabeversuch

```sh
node tools/bench_extract_compact.mjs "$MAIN_CHECKOUT"
node tools/bench_extract_compact.mjs "$MAIN_CHECKOUT" --token-samples > samples.json
```

Die explizite Benchmarkvariante `B` ergänzt einen Satz im Systemauftrag. `A` verwendet den ursprünglichen Vertrag. Der Offlineversuch spielt archivierte Antworten und deren kompakte Gegenstücke durch die unveränderte .203-Verarbeitung. Bei gültigem JSON entfernt er nur Nullwerte auf Deltaobjekten, für die der bestehende Normalisierer bereits den Standardwert setzt. Nicht parsebares Original-JSON bleibt unverändert. Das Programm prüft den Normalwert, Parserfehler und Hinweise, angenommene und verworfene Deltas, ausgewählte unabhängige Anforderungen, die reale Reparaturfolge sowie Spielereignisse und Welt nach JSON-Reload. Ein zusätzlicher kontrollierter Wunsch, den Ort ohne Spielerentscheidung zu verlassen, wird in beiden Armen zurückgewiesen. Im Tam-Ostler-Fall erreicht die gebundene Zusage nach 16 weiteren Enginezügen den frisch aufgebauten Kontext ohne die ursprüngliche Prosa.

Für die sichtbaren Inhaltstokens die Felder `a` und `b` aus `samples.json` pro Antwort mit `Tokenizer.from_file(...).encode(text, add_special_tokens=False).ids` zählen. GLM-5.3-Flash-Tokenizer SHA-256 `19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d`. Die kumulierte Provider-Completion aus den historischen Antworten steht separat in `reportedCompletion`.

Auf dem Suite-Branch verwendet die Extension standardmäßig den ursprünglichen Ausgabeauftrag. „Compact extractor JSON (experiment)“ in den Avereth-Einstellungen aktiviert für Erst- und Reparaturversuche denselben kurzen Systemzusatz wie im Archivvergleich. Parser, Weltprüfung und Commitpfad sind gemeinsam. Erfolgsrate und natürliche Latenz frisch generierter kompakter Antworten sind offen.
