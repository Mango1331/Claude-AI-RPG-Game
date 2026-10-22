# Patch 8.4.2: Letzte Integrationskorrekturen und Living-Dungeon-Abnahme (4.3.0-c.6.6.31)

Basis: Build `4.3.0-c.6.6.30`, Commit `8f67953`. Grundlage sind der zweite automatisierte Livetest vom 22.10.2026, 07:49 (`20261022-074926Z-patch_8_4`, Windows, Featherless, GLM-5.3-Flash; Fixture `tests/v4/live_1022d.json`) und dessen Auswertungen.

Der Patch ist bewusst klein: drei Engine-Korrekturen, zwei Runner-Korrekturen und ein neuer Leitfaden für die Abnahme eines vollständigen Living Dungeons. Keine neuen Gameplay-Systeme. Unverändert bleiben Kampfsystem, Gruppen-KI, Balance, Tokenlimits (Erzähler 4.096, Spieler 3.000) und Patch 9.

Engine und Runner sind getrennte Commits. Teil A beschreibt die Engine, Teil B den Runner.

---

## Teil A — Engine

### A1. Ursachen (im Code bestätigt)

| Befund | Ursache |
|---|---|
| Zug 5: „I put one silver on the counter“ zur Registrierung. Der Planner gab `pay` 10 cp „for Guild registration“ und `guild.register`. Gebucht wurden −10 cp an die Angestellte, die Registrierung blieb mit 20 cp offen. Der Erzähler schob die Münze zurück. Zug 6 zahlte 20 cp: 30 cp für eine Gebühr von 20 | `v4/commands.js pay`: Nur ein Betrag in Höhe der Gebühr wurde zur Registrierung. Jeder andere fiel in den allgemeinen Zahlungszweig und wurde gebucht |
| Die Antworten #40 und #48 lösten die Strider-Threads mit `t10.1`, `t11.1`, `t9.1` auf. Die Engine kennt sie als `thread.t10.1` … Alle vier wurden als „unknown thread“ abgewiesen; die Bedrohung stand nach 4/4 weiter unter „Here“ | `threads.js threadEvents` suchte die ID nur wörtlich (`state.threads[th.id]`). Der Extraktor sieht `thread.t10.1`, kürzt es aber |
| Tote Strider im HUD als „dead, ENGAGED“ | `hud.js worldRows` zeigte die Entfernung auch für Tote |

### A2. Änderungen

| Bereich | Umsetzung | Ort |
|---|---|---|
| Gebühr | Gilt eine Zahlung erkennbar der Registrierung (ein `guild.register` derselben Nachricht oder ein Zweck mit registration/membership/guild/fee), am Schalter, vor der Mitgliedschaft, und entspricht ihr Betrag nicht der Gebühr, ist sie **refused**: kein `coin.changed`, kein `transaction.completed`. Der Erzähler bekommt „NOT PAID — 10 cp (1 Silver) is not the Guild's registration fee (2 silver (20 cp), one-time): nothing is paid, his coin stays 50 cp … Let the clerk name the fee“. Der Spieler sieht „ACTION NOT POSSIBLE — … the Guild's registration fee is 2 silver (20 cp), not 10 cp (1 Silver); nothing was paid“. Die Registrierung bleibt zu 20 cp offen, die Gebühr danach bucht genau einmal. Nennt die Zahlung einen anderen Zweck (ein Trinkgeld „for her trouble“), bleibt sie gewöhnlich, auch in derselben Nachricht | `v4/commands.js pay` |
| Thread-Bezüge | `threadById`: ein Thread mit oder ohne Präfix `thread.`; Aktualisierung und Auflösung gelten dem bestehenden Thread, nie einem neuen. Unbekannte IDs bleiben abgewiesen, eine zweite Auflösung ändert nichts | `threads.js` |
| Tote im HUD | Tote stehen unter Present weiter als „dead“, ohne Entfernung und Deckung | `hud.js` |

### A3. Tests

`tests/v4/patch842.test.js` (7 Tests) an `live_1022d.json`. **Auf .30: 6 rot, 1 Absicherung grün.**

| Test | Prüft | .30 |
|---|---|---|
| fee 1 | Züge 5 und 6 nachgespielt: NOT PAID, Registrierung offen zu 20 cp, Spielerhinweis mit Gebühr; danach registriert, 30 cp übrig, genau eine Zahlung | rot (−10, dann −20) |
| fee 2 | ein höherer Betrag (30 cp) ebenso; danach die Gebühr einmal | rot |
| fee 3 | Gebühr direkt (unverändert); Trinkgeld mit eigenem Zweck in derselben Nachricht, danach und vor der Registrierung bleibt gewöhnlich | grün (Absicherung) |
| threads 1 | `threadById`, Auflösung und Aktualisierung über die Kurzform, unbekannte ID, zweite Auflösung | rot |
| threads 2 | Antwort #48 mit ihren aufgezeichneten Thread-Deltas: beide aufgelöst, kein neuer Thread, „Here“ ohne Strider | rot |
| threads 3 | Antwort #40 ebenso | rot |
| HUD | Stand nach dem Cull (#52): vier tote Strider ohne Entfernung, die Fischer mit | rot |

Angepasst: `tests/testrun_v8/live.test.js` (die tote Big Cellar Rat ohne „ENGAGED“).

### A4. Offene Risiken (Engine)

- **Zweck einer Zahlung.** Die Erkennung des Registrierungszwecks beruht auf dem `for`-Text des Planners und einem `guild.register` derselben Nachricht. Gibt der Planner einer Gebührzahlung einen ganz anderen Zweck, gilt sie als gewöhnliche Zahlung.
- **Gate-Gebühr.** Für die Dungeon-Gebühr gilt die Regel nicht; ihr Weg über das kanonische Gate-Angebot ist unverändert. Der Dungeon-Leitfaden (Teil B) prüft, ob sie genau einmal gebucht wird.
- **Threads ohne Wesen.** Ein Thread kann weiter ein Wesen nennen, das nicht gebucht ist (Zug 21 des Laufs). Das bleibt bewusst außerhalb dieses Patches.

---

## Teil B — Runner

Siehe den Runner-Commit; Abschnitt folgt.
