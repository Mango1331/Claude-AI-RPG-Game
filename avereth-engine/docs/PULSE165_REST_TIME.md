# .165 — PULSE C: eine unterbrochene Rast bleibt auch gegenüber dem Extractor unterbrochen

**Basis:** `.164` / `a6aa3beb3b3349909fc4584636e904908924c3f2`. Enger Korrekturbuild zum P2-Befund §2 des [GPT-Produktdiff-Gegenreviews .164](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_PULSE164_PRODUKTDIFF_GPT.md). [Paket-C-Patchnote .164](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/docs/PULSE164_PACKAGE_C.md) bleibt maßgeblich für alles Übrige. Keine neuen PULSE-Parameter, keine Balance, keine Ausweitung der Unterkunftserkennung, kein Paket B.

## Fehler

Die Engine bucht bei einer mitten unterbrochenen Pause nur `m` Minuten (`booked_min`). `world.js` zieht ein Extractor-`time`-Delta zuerst von diesen gebuchten Minuten ab und bucht den Rest bis zur allgemeinen Zugkappe `timeCap` (mindestens `default_cap_min` 120, bei langen Cuts `ceil(m · 1,25)`). Meldet die Antwort die ursprünglich geplante volle Rast, wurde damit genau die abgeschnittene Restzeit wieder gebucht.

## Korrektur

`src/v4/world.js`, nur im Zeitpfad des Extractors: Bei `auth.pulse.interrupt` (nicht `at_end`) zählen die `of_min − after_min` Minuten, die der Cut der geplanten Pause genommen hat, nach den gebuchten Minuten **ebenfalls als abgedeckt**, werden aber nie gebucht (`delta.rejected`, Regel `rest_cut`, mit Begründung). Was darüber hinausgeht, folgt der bestehenden Regel bis `timeCap`.

- `timeCap` und `booked_min` bleiben unverändert: ihre übrigen Aufgaben (Erzählzeit des Zugs, andere Engine-Buchungen, Reiseuntergrenze) sind nicht berührt.
- Eine unabhängige Handlung neben der Rast behält ihre Zeit: Mahlzeit 60 min + Nacht 480 min, Cut bei `m` → gebucht `m + 60`.
- `at_end` (unter 30 min, voll gebucht): unverändert, die gebuchten Minuten decken das Delta bereits.
- Erholung kommt ausschließlich aus der Engine-Buchung des Handlers; der Extractor bucht in diesem Zug keine Erholung.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot/Grün `tests/v4/pulse_c165.test.js` über den echten Pfad (Planner-Zug `playerTurnV4`, Narratorantwort, Extractor-Antwort, `applyWorld`) | `.164`: **5/6 rot** – 30 min, Cut bei 15, Extractor 30 → **30** statt 15; 480 min, Cut bei 35, Extractor 480 → **120** statt 35 (bis zur Kappe aufgefüllt); Mahlzeit 60 + Nacht, Cut bei 35, Extractor 540 → **120** statt 95; Gruppe + `hostile` + `time 480` → Zeitkappe statt Cut-Schutz; Regenerate der Antwort → **120** statt 35. Grün war nur `at_end` 5/20 min (schon korrekt). `.165`: **6/6** |
| Gegenfälle im Einzelnen | 30→15: insgesamt 15 min, Erholung exakt `recoveryEvents(15)`, Antwort bucht keine Erholung; 480→m: insgesamt m, `rest_cut` abgelehnt, Zustand valide; `at_end` 5/20: keine Doppelbuchung; unabhängige Mahlzeit vor der Rast: m + 60 (ohne Cut unverändert 540 wie `.164`); `person.new`/`hostile` + widersprüchliches `time`: Kampf eröffnet (`encounter.started`), nur `rest_cut` abgelehnt, keine Ursachen-Korrektur; Regenerate der Antwort + Reload: gleiche Uhr, identische Faltung |
| Angrenzend | PULSE A/163/C: **46/46** |
| Vollständiges `npm test` | **2890/2890** (`.164`: 2884; +6) |
| Replay `npm run replay:check` | **2235** Fälle, **1040** abweichend, **alle 1040** exakt akzeptiert, **0** offen; keine neue Akzeptanz nötig (im Korpus wird keine Pause unterbrochen) |
| Echter ST1.19-Host Standard | **97/97**, **0 PageErrors** (neu `pulse164_campReplyTimeNoRest`: Nachtlager nach 397/480 min unterbrochen, Extractor meldet zusätzlich `time 480` → Antwort bucht 0 min, `rest_cut`, Uhr = Beginn + 397) |
| Echter ST1.19-Host Failsoft | **102/102**, **0 PageErrors** |

Grenze wie `.164`: geskripteter Provider, kein Nachweis der Befolgung eines freien Narrators.
