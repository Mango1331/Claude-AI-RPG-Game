# Patch 8.4.2: Letzte Integrationskorrekturen und Living-Dungeon-Abnahme (4.3.0-c.6.6.31)

Basis: Build `4.3.0-c.6.6.30`, Commit `8f67953`. Grundlage sind der zweite automatisierte Livetest vom 22.10.2026, 07:49 (`20261022-074926Z-patch_8_4`, Windows, Featherless, GLM-5.3-Flash; Fixture `tests/v4/live_1022d.json`) und dessen Auswertungen.

Der Patch ist bewusst klein: drei Engine-Korrekturen, zwei Runner-Korrekturen und ein neuer Leitfaden für die Abnahme eines vollständigen Living Dungeons. Keine neuen Gameplay-Systeme. Unverändert bleiben Kampfsystem, Gruppen-KI, Balance, Tokenlimits (Erzähler 4.096, Spieler 3.000) und Patch 9.

Engine und Runner sind getrennte Commits (Engine `5ad8494`, Runner danach). Teil A beschreibt die Engine, Teil B den Runner.

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

### B1. Ursachen (im Code bestätigt)

| Befund | Ursache |
|---|---|
| Nach Zug 33 meldete der Spieler „done“; der Bericht sagte „vom Spieler als fertig gemeldet“, obwohl `open_group_attack` fehlte (7/8) | `run_live.mjs` nahm `stop_reason: "done"` als `player_done`, ohne die Etappen abzugleichen |
| Nach `#assign` (Zug 31) sah der Spieler unter der System-Antwort das HUD der Erzählerantwort aus Zug 30 als „HUD under the newest reply“ und hielt die Punkte für nicht gebucht | `driver.mjs view` (8.4.1) nahm das HUD der neuesten Nachricht, die eines hat; System-Antworten haben keines |
| Seine eigene Eingabe sah er als „assign VIT 2 …“ | SillyTavern rendert `#assign` als Überschrift; der Treiber las den Seitentext |
| `open_group_attack` war nicht erreichbar | Der Leitfaden `patch_8_4` verlangte einen Cull mit Zahl; das Board bot solche nur im Feld. Dort legt die Engine keine Gruppen an, jeder Strider entstand einzeln aus der Erzählung. Gruppen, die ihn nicht bemerkt haben, setzt nur ein Living Dungeon |

### B2. Änderungen

| Bereich | Umsetzung | Ort |
|---|---|---|
| „done“ | Meldet der Spieler „done“, prüft der Runner nach seiner Entscheidung die Etappen. Alle Pflicht-Etappen gebucht: `done`. Sonst `incomplete` mit „7/8 required reached; open: open_group_attack“. Der Spieler erfährt nichts davon. Blocker (`player_stop`), Tod, Limit und Runner-Fehler behalten ihre Bedeutung | `run_live.mjs doneEnd`, `report.mjs` |
| Kein Leerlauf | Ist die letzte Pflicht-Etappe erreicht und jede offene in diesem Lauf nicht durchführbar, endet der Lauf `incomplete`, statt weiterzuspielen | `evaluator.mjs settled` |
| Altes HUD | Ist eine Antwort ohne HUD (die System-Antwort) neuer als das HUD, heißt sein Abschnitt „the HUD of an EARLIER reply, NOT updated since: the System answer above is newer and what it says counts“ | `driver.mjs hudStale`, `players.mjs screenText` |
| Eigene Nachricht | aus `mes` des Chats, mit `#` | `driver.mjs view` |
| Leitfaden | `patch_8_dungeon_full` (erbt `guild_dungeon_loop`; `patch_8_4` bleibt): elf Pflicht-Etappen, 60 Züge | `guides/patch_8_dungeon_full.json` |
| Prüfungen | `guild_registered_fee`, `dungeon_gate`, `dungeon_population`, `dungeon_group_fight`, `dungeon_open_group_attack`, `dungeon_guardian`, `dungeon_floor_cleared`, `dungeon_quest_ready`, `dungeon_quest_completed`, jeweils für den Ziel-Dungeon (der des Vertrags, sonst der erste betretene) und die Zielebene (die des Vertrags, sonst 1). Nur von der Engine Gebuchtes zählt: Slots, `dungeon.slot`, `dungeon.cleared` mit seinem Verdienst, `entity.status`, `quest.ready`, `quest.status`, die Auszahlung. Neue Auffälligkeiten: `registration_fee`, `gate_fee`, `group_turns`, `floor_cleared_by_others`, `turn_in` | `evaluator.mjs` |
| Nicht durchgeführt | `dungeon_open_group_attack`, wenn keine Begegnung der Zielebene mit zwei oder mehr Unaufmerksamen getroffen wurde; `dungeon_group_fight`, wenn keine mit zwei oder mehr; die Vertragsetappen, wenn das Board, das er las, nie einen Dungeon-Vertrag bot. Die Etappe bleibt offen, der Bericht nennt den Grund | `evaluator.mjs`, `report.mjs` |
| Bericht | „Offen: x (nicht erreicht) · y (nicht durchgeführt: Grund)“, „Ziel-Dungeon“, Status je Etappe | `report.mjs` |

Die Etappen des neuen Leitfadens:

| Etappe | Prüfkriterium |
|---|---|
| `creation_complete` | Mage mit Flame Lance und Blink erstellt |
| `guild_registered_fee` | registriert, die Gebühr genau einmal und vollständig gebucht |
| `dungeon_quest_active` | ein Dungeon-Vertrag angenommen (möglichst Clear Level 1) |
| `dungeon_gate` | Ebene ≥ 1 des Ziel-Dungeons, Eintrittsgebühr höchstens einmal und wie das Gate sie nennt |
| `dungeon_population` | eine Begegnung der Zielebene mit ihren Kreaturen gebucht |
| `dungeon_group_fight` | zwei oder mehr Mitglieder einer Begegnung der Engine in einem Kampf, alle von Beginn an |
| `dungeon_open_group_attack` | offener Angriff auf eine schon bestehende Begegnung, mindestens zwei unaufmerksam; alle im Kampf, höchstens eine Eröffnung, jedes Mitglied handelt in einem eigenen Zug (oder stirbt vorher) |
| `dungeon_guardian` | Wächter der Zielebene tot (Slot `guard`/`boss`) |
| `dungeon_floor_cleared` | `dungeon.cleared` der Zielebene, `credit: pc` |
| `dungeon_quest_ready` | `quest.ready` des Dungeon-Vertrags |
| `dungeon_quest_completed` | Abgabe in einer Gildenhalle, Auszahlung gebucht und gleich der des Vertrags |

**Startbefehl** auf dem Windows-PC (nach dem Pull):

```powershell
npm run live:st -- --guide patch_8_dungeon_full --max-turns 60 --headed
```

`--max-turns 60` ist nötig, weil `maxTurns` aus `live.config.json` sonst den Wert des Leitfadens überschreibt.

### B3. Tests

**Runner-Unit-Tests** (`tests/live_runner/*.test.js`, 50). Neu ist `patch842_runner.test.js` mit 9 Tests:

| Test | Prüft |
|---|---|
| B1 done | Der zweite Livetest gegen `patch_8_4`: `incomplete`, „7/8 required reached; open: open_group_attack“; der `.28`-Lauf gegen den Grundablauf: `done` |
| B1 settled | Lauf endet, wenn die letzte Etappe erreicht und der Rest nicht durchführbar ist; nicht bei einer noch erreichbaren |
| B2 | Live #59–#62: `#assign` gebucht (VIT 7, WIL 9, INT 8), der Spieler sieht `#assign VIT 2 WIL 2 INT 1`, die System-Antwort und das HUD als nicht aktualisiert |
| Leitfaden | elf Pflicht-Etappen, jede mit Prüfung, 60 Züge, keine Befehle in den Zielen, `patch_8_4` erhalten |
| zweiter Livetest | kein Ziel-Dungeon, nur die Erstellung erreicht; die Doppelzahlung als `registration_fee`; der Feld-Cull zählt für keine Dungeon-Etappe |
| `.28` (Glimmerdeep) | Vertrag, Gate (vertragsfrei, 0 cp), Population (4 Käfer), READY, Abgabe (60 cp); kein Gruppenkampf (vier Einzelkämpfe), offener Angriff offen, aber möglich |
| `.29` (Catacombs) | Gruppenkampf der drei Skelette (#20); offener Angriff nicht durchgeführt (beim Eintritt aufmerksam); der Ghul ist kein Wächter |
| nachgespielter Flame Lance | `.28`-Zug #19 auf diesem Build: alle vier im Kampf, eine Eröffnung, A, B, C handeln: `dungeon_open_group_attack` erreicht |
| Bericht | `incomplete` mit offenen Etappen und Grund, Ziel-Dungeon, Status in der Etappentabelle |

**Stub-Selbsttest** (`selftest.mjs`, echte SillyTavern-1.19-Kopie, Chromium, Stub-Provider; kein Livetest; einmal ausgeführt): 47 Prüfungen OK (bisher 46). Der Stub-Spieler meldet „done“ nach der Erstellung; das ist jetzt `incomplete` mit den offenen Etappen (`playerDoneChecked`). Im vierten Lauf folgt `#status` auf eine Erzählerantwort; vor dem nächsten Zug sieht der Spieler `#status` und das HUD als nicht aktualisiert (`ownCommandAndOlderHud`). Die leere Erzählerantwort kommt jetzt in Zug 5.

### B4. Offene Risiken (Runner)

- **Unaufmerksame Gruppe.** Ob ein Dungeon eine Gruppe bereitstellt, die ihn nicht bemerkt hat, entscheidet die Engine beim Betreten. In den beiden ausgewerteten Dungeon-Läufen war das einmal so (.28, Glimmerdeep: vier Käfer) und einmal nicht (.29, Catacombs: die Skelette bemerkten ihn beim Eintritt). Ohne sie bleibt die Etappe „nicht durchgeführt“, und der Lauf ist unvollständig.
- **Guardian und Floor-Clear in 60 Zügen.** Im ersten automatisierten Lauf (.29) stand der Spieler in Zug 10 auf Ebene 1 und hatte bis Zug 19 weder Wächter noch Clear. Eine ganze Ebene mit Wächter kann knapp werden; dann endet der Lauf mit `limit`, und der Bericht zeigt, was offen ist.
- **Tod.** Ein Mage der Stufe 1 kann am Wächter sterben (Lauf 2: 1 HP). Der Leitfaden rät zur Rast, beeinflusst die Engine aber nicht.
- **Kein Dungeon-Vertrag.** Bietet das Board auch am nächsten Morgen keinen, bleiben drei Etappen nicht durchgeführt; der Dungeon selbst wird trotzdem geprüft.
- **Zielwahl.** Nimmt der Spieler einen Vertrag für Dungeon A und geht in Dungeon B, zählt B nicht.
- **Erzähler und Extraktor** bleiben unverändert: Reasoning-Ausreißer und leere Antworten sind weiter möglich (eine leere Erzählerantwort beendet den Lauf).

### Bekannte Restthemen (nicht Teil dieses Patches)

- Eine bezahlte Wagenfahrt bucht keine Reise (Zug 29 des zweiten Livetests).
- Ein Thread kann ein Wesen nennen, das nicht gebucht ist (Zug 21).
- Reasoning-Ausreißer von Erzähler und Extraktor.
- Ungültige JSON-Antworten des Spielers (fünf im zweiten Lauf, jede repariert).
