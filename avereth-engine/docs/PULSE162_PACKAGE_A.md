# .162 — PULSE Paket A: ein Ereignisfenster pro Erzählzug, Reise, Tageszeit, Fehlwurfserie und Firewall

**Basis:** `.161` / `bd19a30fb60c0c05ea9ecf077dc25b1cb4094088`. Umsetzung des vom Nutzer am 07.11.2026 freigegebenen Pakets A aus [`patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) (§5, §5.8, §6 A, §§12–16). **Nicht enthalten:** Rastunterbrechung mit verkürzter Erholung (Paket C), Dungeon-PULSE und wandernde Minions (Paket B), Änderungen an DUNGEON AHEAD, Abklingzeit, Balance, NPC E2/E3, UI.

## 1. Was PULSE Paket A tut

| Baustein | Umsetzung |
|---|---|
| **Ein Wurf pro geeignetem Erzählzug** | `src/v4/pulse.js`: `pulseBegin` (statische Ausschlüsse) vor den Handlern, `pulseFinish` (Exposition, dynamische Ausschlüsse, Wurf, Art, Zeile, `auth.pulse`) nach allen Handlern in `resolveCommands`. Zufallswert `hash32(seed\|turn\|pulse)`, Art `…\|pulse.kind`; weder Uhrzeit noch Schrittnummer noch Wortlaut im Schlüssel, der Würfelstrom (`Dice`, `rng.n`) bleibt unberührt. Kein neuer Modellaufruf. |
| **Nur Ruleset-2-Planner-Kampagnen** | Ältere Kampagnen (Ruleset 1, A-Pfad) behalten Patch 5 (`roadLine`) unverändert. |
| **ROAD AHEAD = Reiserahmen** | Die GO-/`journey.continue`-Handler melden nur noch den autorisierten Abschnitt an (`roadLeg`/`pulseLeg`); es gibt keinen eigenen Reisewurf mehr. Erste Exposition in Planreihenfolge: erster *autorisierter* Abschnitt oder erste gebuchte Pause, sonst die Szene. Neu als Abschnitt: Aufbruch aus einer Siedlung zu einem Ziel außerhalb (z. B. Dungeon-Tor). `auth.road` ist `'open'` nur bei offenem `danger`, sonst `'quiet'`. |
| **Rahmen × Tageszeit** | `travel`/`wild`/`street`/`inside` × `dayPart()` (Tag 6–19, Abend 19–22, Nacht 22–6), Werte vorläufig in `rules.json` `pulse.base` (35/40/45, 20/24/28, 10/12/8, 6/8/3). Reise nach der Uhr bei Autorisierung des Abschnitts, Pause nach der Tageszeit, die den größten Teil der Pause abdeckt, Szene nach der Uhr am Ende der Engine-Auflösung. |
| **Ereignisart** | grob: `meeting`, `life`, `trouble`, `obstacle`, `trace`, `strange`, `danger` (Gewichte je Rahmen/Tageszeit, `rules.json` `pulse.kinds`). Letzte Art 0, die drei davor halb; `danger` ohne Population/Gebietsstufen in der Abstammung halb. Stadt und Innenräume haben kein `danger`. |
| **Fehlwurfserie V3** | `p = min(60, 1,75·base, base·(1 + 0,15·misses))`. Echter geschlossener Wurf +1, offenes Fenster 0. Kein Wurf und keine Änderung bei Kampf/`pending_combat`, anwesender Bedrohung (`held`), Ausschluss, Wiederholung, Pausenblock-Folgezug, DUNGEON-AHEAD-Zug, validiertem Suchzug. |
| **Zustand/Events** | `state.pulse = {v, misses, recent≤4, pause}` (entsteht mit dem ersten echten Wurf); Events `pulse.rolled` (nur echter Wurf), `pulse.pause` (Pausenblock läuft weiter), `pulse.outcome` (Diagnose der Antwort). `encounter.started` beendet einen Pausenblock. |
| **Ausschlüsse** | Kampf, Dungeoninneres (Paket B; dort `governs:false`, DUNGEON AHEAD/`dungeon_foe` gelten), Lernen, identische Eingabe direkt hintereinander, DUNGEON-AHEAD-Zug, offener Preis/Zahlungskarte (HARD STOP), reines Board bzw. lokales GO + Board, nur abgelehnte/geklärte Befehle, validierter Suchzug, Pausenblock-Folgezug, `held`. `#`-Befehle und Panels erreichen die Auflösung ohnehin nicht. |
| **Pausen (A)** | Rast/Schlaf/Warten mit gebuchten Minuten sind Exposition; ein offenes Fenster bringt nur friedliche Arten vor dem Einschlafen bzw. beim Ende (`danger`/`obstacle`/`trouble` gesperrt), die Pause wird **immer voll gebucht**. Pausenblock: weitere reine Pausen am selben Ort direkt danach würfeln nicht. |
| **Narratorzeilen** | Genau eine Zeile im Abschnitt `resolved`: Reise immer (`THE ROAD — …` still here / uneventful wie Patch 5, offen als `THE ROAD — PULSE (…)` mit Art und „real stop“), Szene/Pause nur offen (`PULSE (…) — ONE concrete thing …`) oder bei `held` (`STILL HERE (PULSE) — …`). Ruhige Szenen ohne Zeile. Die stehende Regel steht im Envelope-Abschnitt (eigenes Kontingent). |
| **Firewall** (`world.js`) | Auf jedem PULSE-gesteuerten Erzählzug (auch ohne Wurf): Neuankömmlinge greifen nicht an, außer im offenen `danger`-Fenster als **eine** Gruppe (Regel `pulse`, auf Reiseabschnitten `road`); Neuankömmlinge nehmen im selben Zug nichts weg (`coerce`: Raub, Bußgeld, Beschlagnahme → `pulse_take`, „Forderung“). Bereits Anwesende und laufende Kämpfe unverändert. |
| **Gesuchter Kontakt** (§5.8) | Nur aus autorisierten Handlungen: GO mit `within`, GO direkt zum Habitat, GO ins Gebiet eines *aktiven* Jagdauftrags, *erfolgreiche* Suche nach der Art einer Population bzw. eines Vertragsziels. Zusätzlich (§3 Abweichung 2): Kreaturen der Population eines **aktiven Jagdauftrags**, wenn Alaric tatsächlich in dessen Habitat steht. Geprüft am **tatsächlich erreichten Ort** (`lineage(s.scene.at)` beim Delta, nach angewandten Ankünften) und **vor** der `road`-Regel. Personen sind nie ausgenommen. |

## 2. Diagnose

`auth.pulse` im Spielerrecord: `governs`, `rolled`, `eligible`, `reason`, `exposure`, `frame`, `phase`, `p`, `roll`, `misses`, `open`, `kind`, ggf. `sought`/`hunts`/`held`. `pulse.rolled` hält `base`, `misses_before`, `leg`, `at`. `pulse.outcome` in der Antwort: `open`, `kind`, `narrated` (**Heuristik**: im offenen Fenster kam etwas Neues in die Welt), `persisted` (Personen, Kreaturen, Merkmale, Objekte, Orte, Kampf, `rejected_pulse`).

## 3. Abweichungen vom Pseudocode des Plans

1. **Entscheidung vollständig in `pulseFinish`.** Paket A unterbricht keine Rast, daher melden Handler nur Expositionen an (Abschnitt mit Uhrzeit, Pause mit Beginn und Dauer); so stehen auch spätere Ausschlussgründe derselben Nachricht (offener Preis, nur abgelehnte Schritte) vor dem Wurf fest. Paket C verlegt nur den Pausen-Claim in den Rast-Handler.
2. **Jagdauftrag-Habitat-Ausnahme** (`huntsHere`). Gegenprobe mit den Original-Narratorantworten des Replay-Korpus (§5.3): Ohne sie hätte die Firewall 6 echte, vom Spieler herbeigeführte Jagdbegegnungen abgewiesen (Warten auf den Hecht, Locken des Ebers, Ausstochern der Schlange …). Autorisierung ist der früher gebuchte Vertrag + tatsächlicher Ort, nicht Wortlaut; die Ausnahme gilt nur für diese Population, verhindert keinen Wurf und deckt keine fremden Gruppen.
3. **`goSought` eng nach §5.8:** zuerst zählte jedes Ziel unterhalb eines Populationsorts (108 Korpuszüge als „gesucht“ ohne Wurf); jetzt nur Habitat selbst bzw. Gebiet eines aktiven Jagdauftrags.
4. **Reise-Ruhe- und `held`-Zeilen behalten den Patch-5-Wortlaut**, nur die offene Zeile ist neu (`may (not must)` entfällt).
5. **Testhaken** `rules.pulse.force` (`{open, kind?, when?}`, im Produkt `null`) für Tests und den geskripteten ST-Smoke.

## 4. Bekannte Grenzen

- Orte vom Typ `site` innerhalb einer Siedlung zählen als `inside` (wie im bestehenden `outdoorsInTown`/SETTLEMENT LIFE), auch der Start-Straßenrand vor der Stadt.
- GO zu einem *unbekannten neuen* Ort (z. B. „in den alten Bau“) ist keine Reise; die Szene am Ausgangsort bestimmt den Rahmen.
- Ein offenes Fenster bedeutet nicht, dass das Modell ein Ereignis erzählt; die Umsetzungsquote misst erst Paket D an natürlichen Läufen. Simulation und geskriptete Smokes belegen das nicht.
- `narrated` ist eine Heuristik. Die 1400-Token-Grenze wird weiterhin in vielen Zügen überschritten (§5.4); PULSE verdeckt das nicht und löst es nicht.

## 5. Abnahme

### 5.1 Tests

| Prüfung | Ergebnis |
|---|---|
| Neue gezielte Regressionen `tests/v4/pulse_a.test.js` | **23/23** (V3-Formel/Deckel; Rahmen × Tageszeitgrenzen 5:59/6:00/18:59/19:00/21:59/22:00; Mehrfach-GO ein Wurf/eine Zeile, Schlüssel unabhängig von Uhr/Schritt/Text; erster GO abgelehnt; Dungeon-Tor; GO+Board lokal/fern; Serie +1/Reset/unverändert; `held` ohne Wurf und ohne Bonus mit Hinweiszeile; Kampfpause und Wiederaufnahme; Pausen, Pausenblock, aufgeteiltes Warten; Pause + Folgeschritt; identische Eingabe; Ausschlüsse; Swipe/Regenerate/Edit/Reload/Fold; `#status`; Firewall ruhig/Gefahr/zweite Gruppe; Wegnahme; Anwesende; Ankunftsprobe (a)–(d) und fehlende Suche; Jagd-Habitat; Registrierung nur bei Autorisierung/Erfolg; Narrator- und Envelopezeilen; Ruleset 1 unverändert; kein zusätzlicher Modellaufruf) |
| Angepasste Bestandstests | `patch5` 28/28 (`withRoad` 0/100 → erzwungenes ruhiges bzw. `danger`-Fenster; offene Zeile; Anteil offener Fenster), `patch6` (37) und `patch7` (23): Überfall durch Neue nur mit `danger`-Fenster |
| Vollständiges `npm test` | **2859/2859** (`.161`: 2835; +23 PULSE, +1 Replay-Akzeptanztest) |
| Replay `npm run replay:check` | **2235** Fälle, **1040** abweichend, **1040** mit exakter Ausgabe akzeptiert, **0** offen, **0** veraltet |

### 5.2 Replay-Akzeptanz (`tests/replay/accepted_pulse162_vs_126.json`)

Gegen die vollständige `.161`-Replay-Ausgabe einzeln geprüft: **351** Einträge aus `.160/.161` byte-gleich; **166** frühere Einträge und **523** bisher baselinegleiche Fälle unterscheiden sich von `.161` **nur** in der PULSE-Entscheidung ihres Spielerrecords (`pulse.rolled`, `auth.pulse`, `auth.road` eines Abschnitts, die eine PULSE-/THE-ROAD-Zeile); jedes andere Event, Outcomefeld, jede Ablehnung und Korrektur ist exakt die `.161`-Ausgabe. Kategorien `pulse162 window` (613) und `pulse162 road` (76, Reiseentscheidung aus dem gemeinsamen Fenster statt Patch 5), jeweils mit fallbezogener Begründung (Exposition, Rahmen, Tageszeit, Wurf/Grund) und `previous_acceptance_160`. Antwortrecords ändern sich im Replay nicht (sie werden gegen die originalen Spielerrecords ohne `auth.pulse` extrahiert).

### 5.3 Gegenprobe: Firewall gegen echte Narratorantworten

Alle 1032 extrahierten Original-Antworten des Korpus erneut gegen den mit .162 aufgelösten Spielerrecord extrahiert (681 mit `auth.pulse`): **1** Antwort abgelehnt (`b18-warrior#66`: bei anwesender Bedrohung bringt der Erzähler zusätzlich ein fremdes Raubtier, das sofort angreift → gewollt). Vor der Jagd-Habitat-Ausnahme waren es 6 (s. §3.2).

### 5.4 Kontextbudget an echten Host-Turnblöcken

`prepareGenerationAsync` → `turnBlock` für 1159 Korpus-Spielerzüge mit .161 und .162: Pflichtanteil Median **1374 → 1375** Token (Mittel +2,9, max +121, min −208), Züge über Budget **389 → 395**, Züge mit weggefallenen Abschnitten **1116 → 1116**; in 27 Zügen fällt zusätzlich ein Abschnitt weg (u. a. `present` 8×, `settlement` 9×, `lore` 8×). Envelope +22 Token im Mittel (eigenes Kontingent). PULSE-/Reisezeile in 212 Zügen; Mehrfach-GO-Doppelzeilen in 7 Zügen beseitigt; 5 Züge mit zwei alten Zeilen sind `#`-Befehle mit dem Kontext historischer Records. Keine pauschale Budgeterhöhung.

### 5.5 Echter ST1.19-Host

SillyTavern 1.19.0, C-Smoke mit geskriptetem Provider (`npm run smoke:st:c` mit `AVERETH_SMOKE_QOL160=1 AVERETH_SMOKE_UI161=1 AVERETH_SMOKE_PULSE162=1`):

| Lauf | Ergebnis |
|---|---|
| Standard | **76/76**, **0 PageErrors**, Exit 0 (darin 13 neue PULSE-Prüfungen, alle QOL160/UI161-Prüfungen unverändert grün) |
| Failsoft (`AVERETH_SMOKE_FAILSOFT=1` zusätzlich) | **81/81**, **0 PageErrors**, Exit 0 |

Neues Modul `tools/st_live/pulse162_smoke.mjs` (User04-Originalpräfixe): Reiseabschnitt I75 → Fenster im Record, **genau eine** THE-ROAD-Zeile im tatsächlich ausgehenden Narratorrequest, `may (not must)` entfällt, `auth.road` folgt dem Fenster; ruhiger Hallenzug → Wurf (Rahmen `inside`), keine PULSE-Zeile bei geschlossenem Fenster; `#status` ohne Wurf, Save/Reload mit identischer Serie; erfundener Angriff eines Neuankömmlings in der Halle → `pulse`-Ablehnung, kein Kampf, Korrektur, Diagnose; vollständiger Speicher-Readback. Gemessene Requests: Reiseabschnitt 56 544 Zeichen gesamt / 6 561 Engineblock, Hallenzug 54 295 / 6 094 (`pulse162_requests.json`). Der Basis-Smoke (drei neue Barkscorpions greifen beim Betreten des Baus an) bekommt im installierten Smoke-Exemplar für genau diesen einen Zug ein erzwungenes `danger`-Fenster (`rules.pulse.force` mit `when`); ohne Fenster weist Paket A diesen Überfall korrekt ab (`fightOpened` wäre rot).

Die Provider-Antworten sind geskriptet: Der Smoke belegt den Hostpfad (Record, ausgehender Narratorrequest, Firewall, Save/Reload), **nicht**, dass ein freies Narratormodell PULSE-Ereignisse konkret erzählt.

## 6. Nächste Schritte

Unabhängiger Produkt-Diff-Gegenreview, danach natürlicher User-Test. Erst dessen Ergebnisse entscheiden über Feinjustierung (Paket D) und den Beginn von Paket C.
