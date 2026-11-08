# .164 — PULSE Paket C (W7a): Rast und Warten mit Unterbrechung

**Basis:** `.163` / `6339f81a66c2c9af727e760bde3c391234020049`. Umsetzung des am 08.11.2026 ausdrücklich freigegebenen Pakets C aus [`patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) (§5.3, §5.6, §6 C, §12.4, §§14–16). [Paket-A-Patchnote .162](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/docs/PULSE162_PACKAGE_A.md) und [.163-Korrektur](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6339f81a66c2c9af727e760bde3c391234020049/avereth-engine/docs/PULSE163_SOUGHT_CONTRACT.md) bleiben für alles Übrige maßgeblich.

**Nicht enthalten:** Paket B (Dungeon-PULSE, Wander-Minions, Dungeonrast; das Dungeoninnere bleibt ohne Fenster), Paket D (Parameter), Wachen-/Schichtsystem, Mehrfachunterbrechung, neue Spawns, Balance, Kampf-RNG.

## 1. Was Paket C tut

| Baustein | Umsetzung |
|---|---|
| **C1 – Entscheidung vor der Buchung** | `pulse.js` `pulseClaimPause()` im Activity-Handler (`commands.js`), unmittelbar bevor `time.advanced` und `recoveryEvents()` gebucht werden, und nur für eine Pause, die der Handler tatsächlich bucht (`rest`/`sleep`/`wait` mit `engineMinutes`). Ist sie die erste Exposition der Nachricht, fällt dort der eine Wurf des Zugs (gemeinsame Funktion `settle()` mit A: gleicher Schlüssel `seed\|turn\|pulse`, gleiche Ausschlüsse, `held`, Fehlwurfserie, Art). `pulseFinish()` übernimmt diese Entscheidung und würfelt nicht erneut. `pulse.rolled` steht im Record **vor** Zeit und Erholung. Abgelehnte, geklärte oder ungebuchte Pausen (Dauer unklar, Zimmer nicht gebucht, `arrival pending`) rufen den Claim nie auf. |
| **C2 – Zeitpunkt und Erholung** | Ab `pulse.pause.interrupt_min` = 30 gebuchten Minuten liegt die Unterbrechung bei `m = 15 + hash(seed\|turn\|pulse.at) % (M − 29)` ∈ [15, M−15] (30 → 15, 31 → 15/16). Gebucht werden genau `m` Minuten und `recoveryEvents(s, content, m, kind)` (bestehende Berechnung, kein Rollback). Unter 30 Minuten keine Teilbuchung: volle Pause, das Ereignis trifft ihn **am Ende** (`at_end`). Die Extraktor-Zeitkappe (`timeCap`) einer mitten unterbrochenen Pause richtet sich nach `m`, nicht nach der geplanten Dauer: die Erzählung kann die Restzeit nicht nachbuchen. Mitternacht: monotone Uhr, Tageszeit per Modulo. |
| **C3 – Sicherheitsrahmen** | `pauseSafety()`: `exposed` (draußen), `street` (Siedlungsstraße), `safe` (Unterkunft). Unterbrechen: draußen `danger`, `obstacle`, `strange`; auf der Straße `trouble`; in der Unterkunft nichts. Gesperrte Arten (Gewicht 0) nur noch dort, wo C sie nicht ersetzt: Unterkunft `danger`/`obstacle`/`trouble` (wie A), Straße `danger`/`obstacle`. Übrige offene Arten bleiben Ereignis vor dem Einschlafen/beim Aufwachen (A-Zeile, Pause voll). Dungeoninneres ohne Fenster (A, `reason:'dungeon'`), anwesende Bedrohung `held`, Kampf `combat`: kein Wurf, volle Buchung. Die Firewall aus A gilt unverändert: `danger` erlaubt genau eine Gruppe, `trouble` keinen Erstschlag und keine Wegnahme. |
| **C4 – Folgehandlungen** | `resolveCommands`: neuer Abbruchgrund `rest interrupted` **vor** allen anderen für jeden Schritt mit `seq` > unterbrochener Pause (`ctx.pulse.interruptedAt`), gesetzt für **jedes** offene unterbrechende Fenster, auch bei kurzer Pause. Der Schritt kommt nicht in `happened`, `needs`-Ketten fallen mit; nichts davon war gebucht. Friedliche Fenster und geschlossene Würfe lassen Folgeschritte laufen (A-Zeile „at the end of step N, before his next steps“). `GO + rest → arrival pending` unverändert. |
| **C5 – Ursache und Erzählvertrag** | Verbindliche Ursachenklasse je Art (`CAUSE_TEXT`). Zeile `REST INTERRUPTED (the engine's; Tageszeit, Rahmen) — at <Uhr>, after m of the M min … (booked: m min, recovery for those minutes only): <Ursache>. … what he does now is his decision.`; die Aktionszeile meldet `CUT SHORT by the engine after m of the M minutes` mit der gebuchten Erholung. Folgezug einmalig (`host.js` `turnBlock`, Muster `paidCardFacts`, aus dem gespeicherten `pulse.rolled` des letzten Erzählzugs): `REST CUT SHORT (the engine's, last turn): …` bzw. `REST ENDED BY AN EVENT …`. Bringt die Antwort bei `danger`/`trouble` niemanden ins Spiel (`pulse.outcome.persisted`), erzeugt `world.js` eine Korrektur aus dem Event: Ursache nachtragen, kein neuer Angreifer, kein Kampf zur Reparatur. |

**Schema:** `pulse.rolled.safety`, `pulse.rolled.interrupt = {seq, kind, after_min, of_min, at_end, cause, minute, later}`; dieselben Felder in `auth.pulse`. Keine neuen State-Felder, kein Reducer-Umbau, kein Modellaufruf, Würfelstrom (`Dice`) unberührt.

## 2. Abweichungen vom Pseudocode des Plans

1. **Früher Claim ist endgültig.** Ausschlüsse, die erst *spätere* Schritte derselben Nachricht erzeugen würden (offener Preis, DUNGEON AHEAD, Suchkontakt aus einem späteren GO/einer späteren Suche), können eine bereits vor der Buchung entschiedene Pause nicht mehr nachträglich zurücknehmen. Ein Vorausblick auf rohe Planner-Befehle wäre gegen Auflage A2 (§12.3). Folge im Korpus: zwei „Rast, dann Jagd-GO“-Züge würfeln jetzt für die Rast (beide geschlossen, Folgeschritt läuft). Frühere Ausschlüsse (vorige Schritte, Pausenblock, `held`) gelten weiter.
2. **Unterkunft außerhalb einer Siedlung.** Der A-Rahmen kennt nur „Siedlung innen/außen“; eine Mühle mit Gastgeberin oder die Herdstube eines Hofes wären „draußen“. `pauseSafety` liest deshalb – nur für die Sicherheit, Rahmen/Chance/Art bleiben A – zusätzlich `safe` bei einem hier gewährten Quartier (`services` lodging), bei Ortsart `interior` oder bei einem Gebäudewort im Ortsnamen (ganze Wörter, `rules.json` `pulse.pause.roofed_words`/`roofed_suffixes`). Konservativ: im Zweifel keine gefährliche Unterbrechung. Belegt durch zwei Korpuszüge (§4).
3. **`later` im Event**: Anzahl der gestoppten Folgeschritte, damit Zeile und Faktzeile „later steps … not done“ nur nennen, wenn es sie gab.
4. **Testhaken `rules.pulse.force`** nimmt auch eine Liste (je Spielernachricht ein Eintrag) für den Hostsmoke; im Produkt `null`.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot/Grün (Reproskript nur mit der in beiden Builds vorhandenen API: Wildnislager mit offenem `danger`; Schlaf + Take + GO; `wait 5 + GO`; verbindliche Ursache) | `.163`: **4/4 Lücken reproduziert** (480 min voll gebucht, Art zu `meeting` umgelenkt; Take/GO ausgeführt; GO autorisiert; keine Ursache); `.164`: 4/4 behoben |
| Neue Regressionen `tests/v4/pulse_c.test.js` | **17/17**: 1/5/15/20/29 min voll mit Ereignis am Ende, 30 → 15, 31 → 15/16, lange Rast m ∈ [15, M−15] mit exakt der Erholung von m (bestehendes `recoveryEvents`), volle gegenüber verkürzter Erholung, Mitternacht; Gasthaus/Wildnislager/Straße/Dach in der Wildnis/gewährtes Quartier, Dungeoninneres, `held`, Kampf; Rast allein = Rast + look/take/GO/take+GO/`needs`-Kette, `wait 5 + GO` und `rest 20 + take` bei `danger`/friedlich/zu, GO vor Rast (`arrival pending`), ungebuchte Rast; genau ein Wurf, Serie, zwei Pausen in einer Nachricht, Pausenblock nach Unterbrechung; Swipe/Regenerate/Edit/Reload mit identischer Faltung; Zeilen, Faktzeile genau einmal, Korrektur bei fehlender Figur, keine bei `obstacle`; `trouble`-Firewall |
| Angrenzende Tests | `pulse_a` (23, ein Test auf den von C ersetzten Wildnisfall angepasst: Zusage „nie gefährlich“ jetzt für die sichere Unterkunft) und `pulse_a163` (6): **29/29** |
| Vollständiges `npm test` | **2884/2884** (`.163`: 2866; +17 C-Regressionen, +1 Replay-Akzeptanztest) |
| Replay `npm run replay:check` | **2235** Fälle, **1040** abweichend, **alle 1040** mit exakter Ausgabe akzeptiert, **0** offen/veraltet (§4) |
| Echter ST1.19-Host Standard | **96/96**, **0 PageErrors**, Exit 0 (inkl. 18 neue `pulse164_*`) |
| Echter ST1.19-Host Failsoft | **101/101**, **0 PageErrors**, Exit 0 |

**Hostsmoke `tools/st_live/pulse164_smoke.mjs`** (User04-Fixture, Lager an der Ostkante der Flutlinie, Vorbedingung offen gesetzt: verwundet HP 30/125 und Nacht; Fenster per Testhaken erzwungen):
- **Nachtlager, `danger`:** `pulse.rolled` vor `time.advanced`; nach **397 von 480 min** unterbrochen, genau 397 min gebucht, Erholung HP 30→112 = `recoveryEvents(…, 397)` und weniger als 480 min ergäben; ausgehender Narratorrequest mit `CUT SHORT by the engine after 397 of the 480 minutes`, `REST INTERRUPTED (the engine's; night, out in the land) — … ONE group …` und der `danger`-Regel des Envelopes; die Gruppe der Antwort darf angreifen, Kampf eröffnet; Save/Reload: Uhr, Bogen und `state.pulse` identisch.
- **Lager ohne erzählte Ursache:** Korrektur `REST INTERRUPTED (the engine's, last turn): the last reply did not show …` im Antwortrecord; **Swipe** verwendet den Record (gleiche Events, kein zweiter Planner-Call, gleiche Uhr/Erholung); Folgezug: `REST CUT SHORT (the engine's, last turn)` **genau einmal** im ausgehenden Request, die Korrektur einmal.
- **Gildenhalle (sichere Unterkunft), gleiches erzwungenes `danger`:** Art gesperrt (gezogen: `meeting`), **480 min** und volle Erholung, keine Unterbrechungszeile.
- **Splitwarten** 3 × 1 min: Wurf, dann zweimal `pause_block` ohne Wurf.

**Kontext:** Ein unterbrochener Zug hat zwei Zeilen von ≈ 355 und ≈ 460 Zeichen statt der üblichen Aktionszeile (+ ggf. PULSE-Zeile), also rund +100 Token nur in diesem Zug; der Folgezug ≈ 220 Zeichen Faktzeile, bei fehlender Ursache zusätzlich ≈ 400 Zeichen Korrektur. Keine Budgetänderung.

## 4. Replay

Gegen `.163` ändern sich **28** bereits akzeptierte Records, alle Pausenzüge; jede Änderung ist mit der `.163`-Ausgabe maschinell abgeglichen (alle übrigen Felder gleich, Events bis auf `pulse.rolled`/`safety` gleich, genau ein Wurf vor der Zeitbuchung) und mit eigener Begründung und `previous_acceptance_163` in `tests/replay/accepted_pulse164_vs_126.json` eingetragen. 1012 Einträge byte-gleich.

| Kategorie | Records | Änderung |
|---|---:|---|
| `pulse164 pause order` | 26 | `pulse.rolled` steht vor `time.advanced`/Erholung und trägt `safety`; Entscheidung, Buchung, Zeilen und Erholung exakt wie `.163` |
| `pulse164 early claim` | 2 (`b16-rogue-sale#57`, `b18-warrior#391`) | „Rast, dann Jagd-GO“: `.163` hatte wegen des späteren Suchkontakts nicht gewürfelt, jetzt ein Wurf für die Rast (beide geschlossen); Rast und GO wie `.163` (§2.1) |

**Im Korpus wird kein Record unterbrochen.** Eine erste Fassung hätte zwei Pausen unter Dach verkürzt (`b18-warrior#111` Schlaf am Feuer in der Mühle bei Maren, `b19-warrior#209` Herdstube des Hofhauses); das hat zur Eingrenzung §2.2 geführt, beide sind jetzt `safe` und exakt `.163`.

## 5. Grenzen

- Geskripteter Provider: Die Hostläufe belegen die technische Integration (Record, Buchung, Firewall, ausgehender Kontext), **nicht**, dass ein freies Narratormodell die Ursache immer konkret erzählt oder die Pause an der Unterbrechung enden lässt. Gegenmittel sind die Zeile, die einmalige Faktzeile und die Korrektur; ihre Befolgungsquote zeigt erst ein natürlicher Test.
- Die Korrektur bei fehlender Figur ist eine Heuristik (`pulse.outcome.persisted`: keine neue Person/Kreatur, kein Kampf, kein abgewiesener Neuankömmling).
- Rahmenklassifikation aus A unverändert: Ein Ort der Art `site` innerhalb einer Siedlung (z. B. „Straßenrand vor Ashbridge“) gilt als Innenraum und damit als sicher.
- Nach einer Unterbrechung bleibt der Pausenblock bestehen: Eine erneute Rast am selben Ort direkt danach würfelt nicht (keine Mehrfachunterbrechung). Beobachtung für D.
- „Rast, dann Reise“ hat weiterhin nur das eine Fenster der Rast (§6 C 10).
