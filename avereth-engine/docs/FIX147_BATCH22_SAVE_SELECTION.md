# .147 – Batch22: Save-Recovery und Artikelauswahl

Basis `.146` / `9136f8ff664ad12e29fc74190f5d8a0909e3d4eb`, Ziel **4.3.0-c.6.6.147**. Ein gemeinsamer Technikpatch; keine Design-, Preis-, XP-, PP-, Prompt- oder Runnerstrategieänderung. Originalquelle: [Batch22-Review](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261101-174704Z/REVIEW.md).

## Ursachen und Korrekturen

**Speichern:** Rogue T282 erhielt einen HTTP-Serverfehler nach Windows-`EPERM` beim atomaren Dateiumbenennen. Der Runner stoppte trotz anschließend exportierbarer E-Klassenannahme. Die Ursache der externen Dateisperre ist unbekannt. Ein Zusammenhang mit einem PowerShell-Lesebefehl wird nicht behauptet.

`tools/st_live/live/driver.mjs` hält jetzt fest, ob der fehlgeschlagene Save-Request tatsächlich abgeschlossen ist. Nur nach abgeschlossenen HTTP-5xx-Antworten und einem ruhigen, unveränderten Testchat darf die Speicherung einmal wiederholt werden. Netzwerkabbrüche mit ungewissem serverseitigem Schreibstatus, Integritäts-/Clientfehler, laufende Extraktion, Chatwechsel und noch laufende Writes bleiben harte Stopps. Es werden weder Spielerinput noch Engine, Planner, Narrator oder Extractor erneut ausgeführt.

Zunächst wird gelesen, ob eine nachfolgende normale Speicherung den vollständigen Chat bereits gesichert hat. Falls ja: keine weitere Schreiboperation. Sonst genau ein normaler ST-Save, ohne `force`, nach Abschluss vorheriger Save-Requests. Der anschließende Readback prüft Nachrichtenanzahl, Texte/Rollen/Namen, vollständige Avereth-Records sowie Swipeauswahl/-daten gegen den eingefrorenen und den weiterhin aktuellen Chat. Fehlender/abweichender Readback bleibt `chat persistence failed`. Originalfehler und Ausgang werden in Runnerlog/Notes erhalten. Die vorhandene schlankere Prefixprüfung anderer Failsoft-Wege bleibt unverändert. Externe ST-Installationsdateien wurden nicht geändert.

**Artikelauswahl:** Rogue T75/76 wählte Common-Dolch `offer.t146.15/l4` korrekt; `selectionWhy()` nahm das Verb `hand` als zusätzliche `hand-axe`-Bestellung. Die Prüfung nutzte außerdem Wörter aus Angebots-/Preisprosa als Artikelidentität.

`src/v4/trade.js` gleicht nun zusammenhängende Bezeichnungen aus den tatsächlichen Artikeln/Diensten ab. Zusammensetzungen bleiben zusammen (`hand-axe`/`hand axe`, nicht `hand`); längere passende Bezeichnungen unterscheiden z. B. Common-/Fine-Dolch. `said` ist keine Quelle für Artikelidentitäten mehr. Mehrdeutige gemeinsame Bezeichnungen erzwingen nicht den Kauf sämtlicher Alternativen. Bestehende Kaufklausel-/Kommentar-/Ausschlussregeln bleiben; echte fehlende Positionen und nicht bestellte Zusätze werden weiter abgewiesen. Buchungsfunktionen, Preiszustimmung, Mengen und Guthaben sind unverändert.

## Rot/Grün und Abnahme

Neue Dateien: `tests/v4/fix147_selection.test.js`, `tests/live_runner/fix147_save_recovery.test.js` und kompakte Originalfixture `tests/v4/fixtures/batch22_fix147.json.gz`. Die Fixture nennt Originalarchiv und dessen SHA-256. Sie enthält den tatsächlichen Vorzustand und die T75–77-Inputs/Pläne sowie originale Kauf-/Klassenrecords für die verlustfreie Speicherprüfung.

- **13 neue Tests auf unverändertem .146: 7 rot, 6 grüne Kontrollen.** Bei zwei negativen Speicherfällen bestand schon vorher der sichere Abbruch; dort wird zusätzlich die nun vorgesehene genau einmalige Speicherwiederholung geprüft. Kein früherer Sicherheitsdefekt wird daraus erfunden.
- Danach **13/13 grün**. T75/76 buchen den richtigen Dolch für 80 cp einmal; T77 bleibt gültig. Echte Zweierbestellungen, Qualitätsunterscheidung, Kommentare, ausgeschlossene Ware, Reload/Events und wiederholte Annahme geprüft. Die getrennte Aliasfrage `Smith B` ist durch `party_words:null` isoliert, nicht als mitbehoben ausgegeben.
- Angrenzende Auswahl-/Service-/Runnerprüfung: **49/49**. Insbesondere die vorhandenen .134–.136-Mehrartikelregeln und Run19-Übernachtungen unverändert geschützt.
- **Vollständiges `npm test`: 2648/2648**, abschließender Lauf mit begrenzter Testkonkurrenz; keine geänderten alten Erwartungen.
- **`npm run replay:check`: 2235 Fälle, 398 bestehende exakt akzeptierte Abweichungen gegenüber .126, 0 offen/veraltet. Keine neue Abweichung gegenüber .146; keine Fingerprintliste verändert.**
- Echter **ST1.19 Standard: 36/36**, **Failsoft: 41/41**, inklusive Finance-Prelude mit `#pay`, Edit, Reload, Swipe, Regenerate und normaler Fortsetzung. **33/39 Modellaufrufe, 13/15 Extractor-Aufrufe**; zusätzliche Speicherproben verursachen keine Modellaufrufe und ändern keine Engineevents.

Die optionale echte Hostprobe `AVERETH_SMOKE_SAVE_RECOVERY=1` injiziert HTTP500 an den realen ST-Save-Endpunkt, lässt die einmalige Driver-Wiederholung normal auf den Testdatenträger schreiben und liest vollständig zurück. Dauerhaftes HTTP500 muss weiterhin stoppen. Bereits ausgeführte Zahlungsrecords bleiben identisch; im Node-Driverfall bleibt auch die originale E-Klassenentwicklung exakt einmal erhalten. **Dies ist ein echter ST-Hosttest mit simuliertem Serverfehler unter Linux, keine native Windows-EPERM-Abnahme.**

Ein Zwischenlauf scheiterte ausschließlich am nicht unterdrückten ST-`AbortError` in `openai.js`, alle Fachprüfungen waren grün. Wiederholung auf unverändertem finalem Code: Standard36/36 ohne PageErrors; anschließend Failsoft41/41 ohne PageErrors. Injizierte Speicherfehlermeldungen werden separat aufbewahrt, nicht als unerwartete Seitenfehler ausgegeben.

Reproduzierbare Hostkommandos:

```bash
AVERETH_ST_DIR=/path/to/test-SillyTavern AVERETH_SMOKE_FINANCE=1 AVERETH_SMOKE_SAVE_RECOVERY=1 npm run smoke:st:c
AVERETH_ST_DIR=/path/to/test-SillyTavern AVERETH_SMOKE_FINANCE=1 AVERETH_SMOKE_SAVE_RECOVERY=1 AVERETH_SMOKE_FAILSOFT=1 npm run smoke:st:c
```

## Grenzen und Abschluss

Ein dauerhaft gesperrtes Windows-Ziel bleibt blockiert; eine Speicherwiederholung beseitigt nicht die unbekannte Sperrursache. Die Recovery ist auf den natürlichen Runner/Batch-Driver begrenzt, keine globale ST-Speicherreparatur für beliebige manuelle Chats. Ein gespeicherter vollständiger Readback ist erforderlich; kein bloßes erfolgreiches Promise.

Die Artikelauswahl ist ein begrenzter Katalogabgleich, kein allgemeiner englischer Satzparser. Weitere Sprachsonderfälle wurden nicht untersucht oder nachgerüstet. `Smith B`, Bruchbeträge und NPC-Kontinuität bleiben ihre getrennten bekannten Grenzen. Originalarchive/-reviews unverändert. Kein natürlicher Batch gestartet. Friendly Fire, Gefahrendarstellung, Lernschwellen und Engine-Shops werden anschließend ausschließlich als Designvorschläge auf main bewertet.
