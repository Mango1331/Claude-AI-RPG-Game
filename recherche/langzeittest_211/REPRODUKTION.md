# Rohbelege offline nachprüfen

Voraussetzung ist ein Git-Checkout dieses Repositories. Node 24 und Python 3 genügen für die Auswertung. Die folgenden Schritte lesen ausschließlich bereits bezahlte und archivierte Antworten. Für die Browserläufe wurde Chromium mit zwei oder mehr getrennten lokalen ST-Datenwurzeln verwendet. Aus jedem abgeschlossenen Zug wurden der Browserzustand, das Backend-Read-back, die Ereignisgruppen sowie der Fold nach einem tatsächlichen Chat-Reload geprüft.

```sh
git worktree add --detach /tmp/av-ref210 82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc
git worktree add --detach /tmp/av-ref211 c2ddc780d4c57b219f9cd7a1d134efceca7e459d
git worktree add --detach /tmp/av-anzeige 8c88669b82420f7656687f5d40e13ec83cbcd732
studie=testrun_10b/openrouter-20261124-langzeit-211
forschung=recherche/langzeittest_211
python "$forschung/offline.py" "$studie" /tmp/avereth-211-nachspiel
python "$forschung/kosten.py" /tmp/avereth-211-nachspiel
python "$forschung/kennzahlen.py" "$studie"
node "$forschung/editvergleich.mjs" /tmp/av-ref211 /tmp/avereth-211-nachspiel RA RB
node "$forschung/gleiches_ergebnis.mjs" /tmp/av-ref210 /tmp/avereth-211-nachspiel PA HB GA GB
node "$forschung/anzeige-original.mjs" /tmp/av-anzeige /tmp/avereth-211-nachspiel
```

Für den Gegenvergleich dasselbe Skript auf dem jeweils anderen Checkout ausführen. Die Rohreplays der Weltstufe verwenden den bereits gespeicherten Spielerzug sowie genau dessen echte Narration und Extractorantworten. Sie isolieren Änderungen **nach** der Spielerbuchung. Der Fordvergleich wiederholt zusätzlich den echten Planner vor der Spielerbuchung. Die vier freien Kampagnen isolieren durch ihren gemeinsamen Start keine späteren Einzelunterschiede. Der Archivexport bewahrt vollständige Modellantworten einschließlich Reasoning, jedoch keine Authentifizierungsheader. Im Pilot wurde ein Kontoidentifikator redigiert und der Hash vor Redaktion dokumentiert.

## Browserverfahren

Basis des Testspielers und des Kostentors ist der im Labor-Skript fest gepinnte Stand des früheren ST-Live-Runners. Die DOM-Instrumentierung stammt aus dem Testwerkzeug bei `3a507c08b5551756cf0654d22b8cc10fff52d2a2`. ST 1.19.0 ist auf `7e8663cd9c184a550b37238218bdd32c6efc68e9` gepinnt. Der Startweltimport entfernt keine gespeicherten Engine-Metadaten. Vor der ersten Eingabe liest der Browser unter anderem Manifest, Planner-/Weltdateien, Character Description, Preset, Temperatur, Kontext und Streamschalter zurück. Die Builds bringen unterschiedliche Character-Description-Stände mit. Auf .211 erlaubt der geänderte Agency-Absatz ausdrücklich die kurze, bedingte Reise. Der gemeinsame Preset- und Lorehash steht in den Konfigurationen der Arme.

Der Proxy erzwingt einen globalen physischen Slot, eine feste Modellroute und eine Reservierung vor Versand. Für die natürliche Serie wurde jede Eingabe mit Vorabsicht an den Spielerprozess übergeben. Erst nach abgeschlossenem Extractor, bestätigtem Speichern, freigegebener UI und Reload wurde der nächste Spielerzug freigegeben. Lokale Systemantworten zählen als Eingaben. Bei Revisionsversuchen sind die Methoden, Chatstände und Hashes in eigenen Dateien archiviert. Die Revision per Regenerate verwendet dieselbe ST-Hostfunktion wie die Oberfläche, die Pfeile und der frühere Edit wurden im DOM ausgelöst. Das Studienlabor lässt sich mit `labor.py` in ein leeres Verzeichnis materialisieren. Der historische Routenwechsel in `routenpruefung.py` ist an die konkrete abgeschlossene HTTP-Zurückweisung gebunden.

Für die zusätzliche Schlüsselprüfung kann eine ausschließlich lokale Wegwerfkopie von .211 den Versuchs-Diff anwenden. Der Diff gehört zu keinem Spielkandidaten.

```sh
git worktree add --detach /tmp/av-katalogprobe c2ddc780d4c57b219f9cd7a1d134efceca7e459d
git -C /tmp/av-katalogprobe apply "$(pwd)/$forschung/katalog-gegenprobe.diff"
node "$forschung/empfaenger-nachspiel.mjs" /tmp/av-ref211 /tmp/avereth-211-nachspiel loan
node "$forschung/empfaenger-nachspiel.mjs" /tmp/av-katalogprobe /tmp/avereth-211-nachspiel loan
node "$forschung/schluessel-grenze.mjs" /tmp/av-katalogprobe /tmp/avereth-211-nachspiel
```

Die Zahlung aus der separaten Revisionsprobe lässt sich mit `python "$forschung/zahlungsrevision.py" /tmp/avereth-211-nachspiel` aus beiden unveränderten Save-Ketten und tatsächlichen HUD-Texten prüfen. Die Ablehnungsbelege 4 und 522 enthalten im veröffentlichten 429-Body jeweils eine redigierte Konto-ID. Das Archiv nennt den Hash vor der Redaktion. Das globale Journal behält seine ursprünglichen Transportrollen, während die Statistiken Vorprüfungen und die Benennung einer passiven Fähigkeit anhand ihrer endgültigen Requesttexte zuordnen.
