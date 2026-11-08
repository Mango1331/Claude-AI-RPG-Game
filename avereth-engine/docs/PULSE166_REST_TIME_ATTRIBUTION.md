# .166 — PULSE C: Zeitzuordnung bei unterbrochener Rast neben einer unabhängigen Handlung

**Basis:** `.165` / `6df4291648be819b1f72ddfbd9f1fad21bd2f29c`. Enger Korrekturbuild zum P2-Befund §2 des [GPT-Gegenreviews .165](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_PULSE165_PRODUKTDIFF_GPT.md). [.165-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6df4291648be819b1f72ddfbd9f1fad21bd2f29c/avereth-engine/docs/PULSE165_REST_TIME.md) und [Paket C .164](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a6aa3beb3b3349909fc4584636e904908924c3f2/avereth-engine/docs/PULSE164_PACKAGE_C.md) bleiben maßgeblich für alles Übrige. Keine PULSE-, Balance- oder Dungeonänderung, keine Vertragserweiterung, kein Paket B.

## Fehler

`.165` zog von jedem Extractor-`time`-Delta nach den gebuchten Minuten pauschal die ganze abgeschnittene Rastzeit (`of_min − after_min`) ab. Erzählt die Antwort korrekt „eine Stunde gekocht, nach 35 Minuten Schlaf geweckt“ und meldet `time: 95`, wurden die 60 Minuten der Mahlzeit als `rest_cut` verworfen: **35 statt 95**.

## Warum die globale Zeitmeldung allein nicht reicht

`time` ist laut `content/deltas.json` die gesamte in der Antwort verstrichene Zeit. Ob 95 Minuten „60 Kochen + 35 Schlaf“ (richtig) oder „35 Schlaf + 60 weitergeschlafen“ (gegen den Cut) bedeuten, ist aus der Zahl nicht ableitbar. Die Zuordnung liefert der **bestehende** Extractorvertrag aber schon: Für jeden Activity-Schritt beantwortet der Extractor verpflichtend `expected["<seq>"] = {minutes, done}` („how long it took“). Für die unterbrochene Rast ist das die Darstellung der Antwort, wie lange er geruht hat.

## Korrektur

`src/v4/world.js`, nur die Berechnung des Abzugs (`cutLeft`) im Zeitpfad des Extractors:

| Lage | Als abgeschnittene Rastzeit abgedeckt (nie gebucht) |
|---|---|
| Rast allein in der Nachricht (kein anderer stattgefundener Schritt davor) | wie `.165` die ganze abgeschnittene Zeit, **unabhängig** von der Extractorangabe: außer der Rast gibt es nichts, dem weitere Zeit gehören könnte |
| Andere stattgefundene Handlung vor der Rast | nur, was die Antwort der Rast **über den Cut hinaus** zuschreibt: `min(of − after, max(0, expected[seq].minutes − after))` |
| dasselbe ohne Angabe der Rastminuten | konservativ die ganze abgeschnittene Zeit wie `.165` |

Der Rest der Zeitregel bleibt: gebuchte Minuten decken zuerst, danach der Abzug, danach Buchung bis `timeCap`. `timeCap`, `booked_min`, Erholung (nur aus der Engine-Buchung) und die Ablehnung `rest_cut` unverändert. Die Summe ist von der Reihenfolge getrennter `time`-Deltas unabhängig.

**Bewusst unverändert:** Meldet der Extractor nur die 60 Minuten der Mahlzeit (die gebuchte Rast nicht mit), gilt wie seit Prototype C für jede enginegebuchte Aktivität das Größere aus Engine-Buchung und gemeldeter Gesamtzeit, also 60. Das ist kein Cut-Effekt (ohne Cut ergäbe dieselbe Meldung neben 480 gebuchten Minuten 480) und vom Vertrag nicht als Teilmeldung vorgesehen; eine Teilzeit-Semantik wäre eine eigene, breitere Vertragsänderung.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot/Grün `tests/v4/pulse_c166.test.js` über den echten Pfad (Planner-Zug `playerTurnV4`, Narratorantwort, Extractor-Antwort mit `expected` und `time`, `applyWorld`) | `.165`: **3/6 rot** – Mahlzeit + Schlaf, Cut bei 35, Antwort hält sich an den Cut, `time: 95`, Rast `minutes: 35` → **35** statt 95; getrennte Deltas 60 + 35 → **35** statt 95; nur `time: 60` → **35** statt 60. Grün auf beiden: Mahlzeit + volle Nacht gegen den Cut (`time 540` bzw. 60 + 480, Rast 480) → 95; reine Rast mit `time 480`, Rast 480 **oder** widersprüchlich 35 → 35; 30 → 15 mit `time 30` → 15; ohne Cut 540. `.166`: **6/6**, Erholung nur für die 35 Schlafminuten, identische Faltung |
| Angrenzend | PULSE A/163/C/165: **52/52** (`.165`-Regressionen unverändert grün) |
| Vollständiges `npm test` | **2896/2896** (`.165`: 2890; +6) |
| Replay `npm run replay:check` | **2235** Fälle, **1040** abweichend, **alle 1040** exakt akzeptiert, **0** offen; keine neue Akzeptanz (im Korpus keine unterbrochene Pause) |
| Echter ST1.19-Host Standard | **97/97**, **0 PageErrors** (`pulse164_campReplyTimeNoRest` weiter grün: reine Nachtrast mit Extractor `time 480` bucht 0 min zusätzlich) |
| Echter ST1.19-Host Failsoft | **102/102**, **0 PageErrors** |

Der gemischte Fall ist im Host nicht eigens geskriptet (die Cut-Minute hängt vom Zug ab, die Mock-Antworten sind statisch); er ist über den echten Node-Pfad belegt. Grenze wie `.164`: geskripteter Provider, kein Nachweis der Befolgung eines freien Narrators oder Extractors; die Zuordnung hängt bei gemischten Nachrichten an der Rastangabe des Extractors.
