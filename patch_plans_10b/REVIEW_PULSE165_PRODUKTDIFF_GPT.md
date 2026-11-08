# GPT-Gegenreview .165 – Rastzeit-Cut: Ausgangsfehler geschlossen, neue Unterbuchung bei tatsächlicher Zeit (08.11.2026)

**Produktprüfung:** `.164` [`a6aa3be`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a6aa3beb3b3349909fc4584636e904908924c3f2) → `.165` [`6df4291`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6df4291648be819b1f72ddfbd9f1fad21bd2f29c), **3 Commits vorwärts, 0 zurück**. Codefix [`2aaead5`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2aaead5d29367512d4dea5ceaa79d7f0d8a7b544), neue Tests [`a2017a2`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a2017a20d21ecfb787669f73647828eb0d406f3d), Build/Patchnote `6df4291`.

**Urteil:** Der konkret in [GPT-Gegenreview .164 §2](REVIEW_PULSE164_PRODUKTDIFF_GPT.md#2-p2--vor-paket-b-korrigieren-zeitkappe-erlaubt-nach-unterbrochener-rast-zusätzliche-narrator-minuten) gezeigte **Vollzeit-Nachbuchungsfehler ist geschlossen**; eine **neue, direkt aus dem Code ableitbare P2-Unterbuchung** bleibt bei mehreren Handlungen, wenn das Modell die **tatsächlich vergangenen Minuten** statt der ursprünglichen geplanten Dauer meldet. Deshalb **vor Paket B einen gezielten Gegenfall reproduzieren und korrigieren**. Kein erneuter Architektur-/PULSE-Gesamtaudit.

## 1. Positive Befunde und Abnahmegrenze

Der `.165`-Diff verändert funktional nur `src/v4/world.js` im `time`-Zweig. `auth.booked_min`, `auth.timeCap`, RNG, Erholung, Cut-Event, PULSE-Regeln, Dungeon- und QoL-Mechanik sind unverändert. `cutAway = of_min - after_min` wird als eigenes Kontingent `cutLeft` geführt; akzeptierte `time`-Deltas werden in der Reihenfolge `bookedLeft`, `cutLeft`, `cap` verrechnet. Dadurch kann ein fehlerhafter Extractorbericht über die **volle geplante Rast** die abgeschnittenen Minuten nicht mehr buchen (z. B. 30→15 mit `time:30`; 480→35 mit `time:480`). Der zugehörige echte Spielerzug→Reply→`applyWorld`-Test und der neue ST-Fall mit `time:480` sind passend und schließen die alte Lücke für diese Berichtsform.

**Implementiererabnahme (nicht durch GPT neu ausgeführt):** 6/6 neue Regressionen; 46/46 angrenzende PULSE-Tests; 2890/2890 vollständige Node; 2235 Replayfälle, 1040 exakt akzeptiert und 0 offen; ST1.19 Standard 97/97, Failsoft 102/102, beide 0 PageErrors. Der Produktcommit behält die bisherige Replayakzeptanzdatei unverändert bei. Der Provider ist geskriptet.

**Prüfmethode:** Eigener GitHub-Commit-/Code-/Testdiff sowie die exakte neue Buchungsarithmetik mit konkreten Werten in einer unabhängigen JS-Gegenrechnung. **Kein erneuter echter Node-, ST- oder Vollreplaylauf** durch GPT. Die unten genannten .165-Ergebnisse für den noch fehlenden Fall folgen aus dem tatsächlichen Code, sind keine Behauptung einer ausgeführten End-to-End-Reproduktion.

## 2. P2 – Zeit legitim erzählter unabhängiger Handlung wird verschluckt

**Ausgangspunkt:** Der Spieler entscheidet zuerst eine bislang nicht zeitgebuchte `other`-Handlung (Mahlzeit kochen, die Antwort etabliert 60 Minuten) und anschließend `sleep 480`. PULSE unterbricht den Schlaf nach `m=35`, der Handler bucht sofort 35 Schlafminuten samt dazugehöriger Erholung. Die Antwort erzählt **korrekt** 60 Minuten Kochen + 35 Minuten Schlaf und nennt damit **95 tatsächlich verstrichene Minuten**. `content/deltas.json` definiert `time` als **„story time that passed“**; `extract.js` verlangt die Änderungen aus **dieser Antwort**, nicht die geplante Zeit einer unterbrochenen, nie vollständig verstrichenen Rast. Daher ist `{type:'time',minutes:95}` ein zulässiger, natürlicher Fall.

**Tatsächliche Rechnung in `.165`** (`world.js`, anfangs `booked=bookedLeft=timeUsed=35`, `cutLeft=480−35=445`, `cap≥120`):

```js
const covered = Math.min(bookedLeft, 95);           // 35
const lost = Math.min(cutLeft, 95 - covered);       // 60 (!)
const want = 95 - covered - lost;                  // 0
// Ende: nur 35 min gebucht; die echten 60 min der Mahlzeit untergehen.
```

**Vergleich:** Auf `.164` ohne `cutLeft` wäre bei `time:95` die Summe `35+60=95`. `.165` ergibt `35` und verwirft 60 berechtigte Minuten als `rest_cut`. Dieser neue Fehler ist unabhängig von der guten Korrektur gegen falsche Vollzeitberichte.

**Warum der neue Test dies verfehlt:** `tests/v4/pulse_c165.test.js`, Fall „independent step before the cut rest“, simuliert als einzige `time`-Meldung **540 Minuten** (`60+480`) und erzählt sogar „sleeps through the night“ (also entgegen dem verbindlichen Cut). Dann ergibt die globale Rechnung zufällig die gewünschte `35+60=95`. Der Test prüft **nicht**, was bei einer **korrekt begrenzten** Narratorantwort und entsprechendem Extractorwert `time:95` geschieht. Auch `time:60` allein (nur unabhängig vergangene Zeit, die gebuchte Rast nicht noch einmal gemeldet) wird fälschlich gegen die Cut-/Booked-Kontingente verrechnet.

**Ursache:** `cutLeft` ist ein globaler Zeitabzug ohne Zuordnung des `time`-Deltas zur **konkreten unterbrochenen Rast**. Eine bloße Änderung des Zahlenwerts/der allgemeinen `timeCap` kann nicht gleichzeitig eine frei berichtete Vollzeitrast und einen legitimen zusätzlichen Zeitabschnitt sicher unterscheiden; es ist eine eng begrenzte Provenienz-/Zurechnungsfrage.

## 3. Pflichtgegenproben und kleinstmöglicher Folgeauftrag

1. **Rot gegen .165:** echte Spielerzug→Narrator→Extractor→`applyWorld`-Kette mit `other` (unabhängig 60 min) **vor** durch PULSE auf 35 min verkürztem `sleep 480`; Narrator beschreibt **nur 35 Minuten** Schlaf; Extractor `time:95` → Endzeit muss **95**, nicht 35 sein, Erholung nur für 35 Schlafminuten.
2. **Alternative Meldung:** einzeln berichtetes `time:60` für die selbstständige Handlung, ohne zusätzliches Zeitdelta für die schon enginegebuchte Rast → unabhängige 60 min erhalten (soweit der Extractorvertrag diese Form vorsieht). Mehrere `time`-Deltas in chronologischer Folge gegenprüfen.
3. **Weiter grün:** fehlerhafter Extractor meldet volle `time:480` zur **reinen** abgeschnittenen 480-min-Rast → nur 35; `30→15` plus `time:30` → nur 15; kurzen `at_end`-Fall, Figur+Angriff und `time`, Save/Reload/Swipe.
4. **Auflösung:** Engste eindeutige Zuordnung der gemeldeten Zeit zur abgeschnittenen Pause gegenüber **anderer tatsächlicher Zeit** finden, ohne pauschal den übrigen Turn-/Handlungs-/Zeitschutz zu lockern. Wenn das bisherige Delta-Schema die Unterscheidung nicht tragen kann, das im Review konkret benennen und eine minimal zusätzliche eindeutige Information oder Validierungsregel ergänzen; nicht nur eine andere globale Subtraktionsreihenfolge.
5. Technisch passender Rot/Grün-Nachweis, vollständige Node-/Replay-/ST-Abnahme, ehrliche Dokumentation und enger Review. **Paket B noch nicht starten**, weil dort dieselbe Cut-/Time-Integration für Dungeon-Rast verwendet wird. Kein natürlicher User-Test als Pflicht.

**P3-Beobachtungspunkte aus .164** (Gebäude-Heuristik, Narratorursachen-Heuristik) bleiben separat und begründen keinen zusätzlichen Ausbau.

**Produktstand zum Review:** `.165` / `6df4291`. Kein Produktcode geändert; dieses Dokument auf `main`.
