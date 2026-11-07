# W5/W6 PULSE – Bestandsanalyse und implementierbarer Fachplan

**Stand: 07.11.2026 · unabhängige Tiefenanalyse, keine Implementierungsfreigabe.** Geprüfte Remote-HEADs: Produkt `2089dcc` / **4.3.0-c.6.6.159**, `main` `00b887e` (Auftrag nannte `2beca00`; dazwischen nur Sols User04-QoL-Plan und dessen GPT-Gegenreview, siehe §9). Keine Änderung an Produktcode, Contentwerten, `02`, `03` oder `07`. Diese Datei und die drei Read-only-Proben unter [`pulse_probes/`](pulse_probes/) sind die einzigen Artefakte.

---

## 0. Ergebnis in Kürze

- **Empfohlen: Ansatz B, eine zentrale Zugentscheidung.** Für jeden geeigneten regulären Erzählzug trifft die Engine genau eine deterministische PULSE-Entscheidung, gesteuert über die Rahmen *Stadt*, *Wildnis* und *Reise*: Fenster zu oder offen, und wenn offen, eine grobe Ereignisart. ROAD AHEAD würfelt dann nicht mehr selbst, sondern liest die Entscheidung für den Reiseabschnitt. Die Entscheidung entsteht am Ende von `resolveCommands`, wird als Event im Spielerrecord gespeichert und bei Swipe, Regenerate, Continue und Reload nur wiederverwendet.
- **Warum B:** Nur so gilt „höchstens eine Chance pro Zug“ technisch. Heute würfelt ROAD AHEAD einmal pro GO-Befehl, und der Schlüssel enthält Uhrzeit und Befehlsnummer (Probe §2.6: 80 von 200 Zwei-GO-Nachrichten bekommen widersprüchliche THE-ROAD-Zeilen). Dazu kommt: Bestehende Durchsetzungswege (`road`-Regel, Envelope, `bornHere`, Korrekturen) lassen sich ohne neuen Modellaufruf, ohne zweite Zustandsdatenbank und ohne Änderung am Extraktor-Prompt weiterverwenden.
- **Wichtigster neuer Befund:** Außerhalb einer Reise gibt es heute keine Engine-Grenze für neue Angreifer. Wen der Erzähler in einer Antwort neu einführt, der darf sofort angreifen (`envelope.js:59`). Nach Codelage (nicht per Probe belegt) darf ein neu eingeführter „feindlicher Räuber“ sogar im selben Zug Münzen nehmen (`world.js:2976`). Lebendigkeit und Kontrolle fehlen also beide. Zusätzlich hat in User04 keiner der zwei offenen Reiseabschnitte etwas ausgelöst (I64, I76; Stichprobe 2, keine Statistik).
- **Technisch am schwierigsten:** (1) Selbst gesuchter Kontakt muss abgegrenzt werden. Jagdauftrag, Spurensuche und lokale Jagderkundung dürfen durch PULSE nicht ausgebremst werden. (2) Pacingzeilen für die Reise vertragen sich nicht mit einem offenen Fenster, das einen echten Halt erzeugt („a track … never a stop“, `commands.js:658`). (3) Tests und Replay-Basis wechseln, weil der Würfelschlüssel umgestellt wird.
- **Patchaufteilung:** P1 Kern + ROAD-AHEAD-Vereinheitlichung + friedliche Fenster in Stadt und Wildnis. P2 Grenzen auch außerhalb der Reise (Erstschlag und Wegnahme durch Neue nur im Gefahrenfenster) samt Ausnahmen für selbst gesuchten Kontakt. P3 Diagnose, ST-Läufe und Feinjustierung allein über `rules.json`.

---

## 1. Quellen, Nachweisgrenzen und Kanonlage

**Kanon, verbindlich:** `02` §2 (Ankunft und Reise), §3 (Spielerhoheit), §8 PULSE [GEPLANT]. Daraus: ein gemeinsames Fenster pro geeignetem regulärem Erzählzug für Stadt, Wildnis und Reise. Keine minuten- oder expositionsbasierten Mischformen. Systemabfragen, aktive Kampfrunden und technische Wiederholungen bekommen keinen Wurf. Lange Zeitsprünge bringen keine Zusatzchancen. Ort und Zeit liefern Plausibilität, ein friedliches Ereignis oder gar keins ist möglich. ROAD AHEAD ist die Reiseintegration und keine zweite Chance. Unterbrechungen von Rast und Warten gehören zu W7 und sind nicht enthalten. `07` W5/W6/W7/PULSE-Grenze und E5. `03`: Stand .159, PULSE als Priorität vor E2/E3.

**Historisch, nicht übernommen:** `recherche/AI_RPG_RECHERCHE_20261028.md` §4.1 rechnet mit zeitabhängigen Raten λ pro Minute. Das widerspricht dem später beschlossenen nachrichtenbasierten Prinzip und wird hier nur als verworfene Option geführt (§3, B4).

**Spielerfeedback User04, nur die Lebendigkeit:** Der Spieler wünscht Gegner außerhalb von Aufträgen, Begegnungen in der Stadt, Beute, Wunder und Magie sowie Banditenverstecke, und er gibt „PULSE Engine sollte höhere Prio bekommen“ an. Seine Anmerkung zur Rast im Dungeon gehört laut Kanon zu W7 und wird hier nicht gelöst.

**In diesem Auftrag tatsächlich ausgeführt** (Read-only, gegen `2089dcc`, Skripte in [`pulse_probes/`](pulse_probes/)):
1. `pulse_probe.test.mjs`: der heutige ROAD-AHEAD-Pfad über Host und Engine (Verteilung, Uhrzeit- und Befehlsnummer-Abhängigkeit, zwei GO in einer Nachricht, Edit und Swipe).
2. `user04_frames.mjs`: Jede Spielernachricht des User04-Originalchats wird nach ihrem gespeicherten Record in Rahmen bzw. Ausschluss eingeordnet.
3. `pulse_sim.mjs`: Simulation des *vorgeschlagenen* Algorithmus als Modell, nicht als Produktcode.

**Nicht ausgeführt:** keine ST-Hostläufe, keine Modellaufrufe, keine vollständige Testsuite (es gibt keine Codeänderung). Alle Zahlen in §5 stammen aus der Simulation eines Entwurfs und belegen kein Spielerlebnis.

---

## 2. Phase A – Bestandsanalyse (.159)

Kennzeichnung: **[T]** technische Notwendigkeit · **[D]** Designpräferenz · **[R]** hypothetisches Risiko.

### 2.1 Wie wird heute entschieden, ob eine Reise unterbrochen werden darf?
`commands.js:294 roadLine()` läuft für `journey.continue` (`:535`, `:559`) und für ein GO aus der Siedlung hinaus (`:634`). Bedingung für Letzteres: ein Quest-Journey, `goSetsGoal` oder ein bekannter Ort einer anderen Siedlung, der kein Realm ist. Die Entscheidung:
`hash32(seed|turn|clock.minute|c.seq|road) % 100 < rules.travel.leg_event_pct (35)`.
Daraus wird `ctx.auth.road = 'open' | 'quiet'`. Sind noch Bedrohungen anwesend (`held`), bleibt der Abschnitt immer `quiet` mit dem Hinweis „still here … nothing new“. Offen bedeutet nur: „may (not must) bring ONE concrete interruption … stops the travel where it happens“. Die Ereignisart entscheidet allein der Erzähler. `auth.road` wird über `turn.js:31 serializableAuth` gespeichert. Ob die Ankunft gelingt, entscheidet weiterhin nur der Extraktor (`expected[seq].arrived` / `arrive`). **[T]** Die Mechanik ist deterministisch und speichert ihr Ergebnis im Record. **[R]** Der Schlüssel hängt von Uhrzeit und Befehlsnummer ab (§2.6).

### 2.2 Was verhindert auf einem ereignislosen Abschnitt zusätzliche Gegner?
Allein die Prüfung in `world.js:486 envelopeAllows`: Ist `auth.road === 'quiet'`, die Figur in dieser Antwort neu (`bornHere`, `:356`) und läuft kein Kampf, wird die Feindseligkeit mit Regel `road` abgelehnt. Die Korrektur lautet „did not attack … uneventful“. Schon anwesende Figuren folgen weiter dem Envelope. Die Neuen bleiben anwesend, aber ohne Kampf (Test `patch5.test.js:272`). **Außerhalb einer Reise gibt es kein Gegenstück:** `envelope.js:59` gibt `newInAnswer → ok` zurück, also darf jede neu eingeführte Figur angreifen, sofern `attack_commitment` belegt ist. `coerce()` (`world.js:2959`) lässt nach Codelage Raub durch eine neue Figur mit feindlicher Räuberrolle zu, und Bußgelder durch eine neue Autoritätsfigur (nicht per Probe belegt). Kreaturenstufen kommen aus Population und Gebiet (`population.js:23 creatureContract`, Kontext `world_area` und `world_populations`, `context.js:654–660`) und nie aus der Stufe des Spielercharakters. Das deckt bereits „keine dynamische Stufenanpassung“ ab. **[T]** Für Stadt und Wildnis gibt es heute weder eine Grenze noch eine Chance. Ob dort etwas passiert, entscheidet allein der Erzähler.

### 2.3 Wann steht ein regulärer Erzählzug fest, und wo passt das Fenster hinein?
Der Ablauf (`runtime.js:645` bis `plannedTurn` `:330`): Planner → `mapPlan` → `playerTurnV4` (`turn.js:60`): `turn.begun` → `syncEvents` → `resolveCommands` → `syncEvents` → `outcome.recorded` (`:108`). Der Record wird **vor** dem Erzähler am Spielertext gespeichert (`commit()`). Neu entschieden wird nur, wenn sich `input_hash` der letzten Spielernachricht ändert, der Planner gescheitert ist oder das Board erneut versucht wird. Swipe, Regenerate und Continue verwenden den Record wieder. Kein Story-Turn entsteht bei Panels (`#`-Befehle laufen ohne `turn.begun` durch, `engine.js:106`), Klarstellungsfragen (Route `panel` bzw. clarify-only, `turn.js:86`) und Planner-Fehlern (`NOT EXECUTED`). Kampf und deklariertes Schleichen nehmen die V3-Route. **Passende Stelle für das Fenster:** am Ende von `resolveCommands`, wenn die Entscheidungen aller Handler bekannt sind (Abschnitte, Rast, offene Käufe) und vor `outcome.recorded`. **[D]** Dort statt in `playerTurnV4`, weil Tests `resolveCommands` direkt aufrufen und `auth.road` daraus lesen (`patch5.test.js:335`).

### 2.4 Was schützt GO, Zwischenhalte, Ankunft und Fortsetzung?
- GO-Autorisierung pro Handler (`commands.js:562ff`): Gate, Gebühr, Siegel, Dungeon-Navigation, `viaStop`.
- Ankunft nur durch die Extraktorbestätigung, Fortsetzung über Ziele (`intents`): Ein unterbrochener Weg bleibt `active` (Test patch5 (9)).
- Pacing: `JOURNEY PACING` (`:628`), die DEPARTS/CONTINUES-Zeile (`:560`) und `pace` (`:658`): Reiseroutine wird bis zum Ziel getragen, kein erzwungenes „continue“.
- Bekannte Begleiter reisen mit (`go.with`), Zurückgelassene bekommen `entity.left`.
- **[T]** PULSE darf nichts davon ändern. Es setzt kein `scene.moved`, keine Ankunft und kein Ziel und keinen Befehl um; es liefert nur Zeilen und `auth`. **[R]** `pace` sagt „a sound, a shadow or a track … never a stop“. Bei einem offenen Fenster der Art *Spur* widerspricht das der THE-ROAD-Zeile und muss im Wortlaut gelöst werden (§4.7).

### 2.5 Stadt, Wildnis und Reise vereinheitlichen
Wiederverwendbar: `settlementOf` und `lineage` (`domain.js`), `trueDungeonOf` (`dungeon.js:47`), `settlementLife` mit Tageszeit, Größe und Außenbereich (`settlement.js:118`), `world_area`, `world_populations`. Lebende Dungeons bleiben ein eigenes, schon engineseitiges System (DUNGEON AHEAD, `living.js:329`), das laut Kanon nicht zu PULSE gehört. **[D]** Ein Modul mit drei Rahmen und einer gemeinsamen Entscheidung. ROAD AHEAD ist der Rahmen *Reise*. Dungeons sind ausgeschlossen.

### 2.6 Doppelwürfe bei mehreren Befehlen pro Nachricht
Probe (`pulse_probe.test.mjs`): Zwei GO-Abschnitte in einer Nachricht ergeben **200 von 200 doppelte THE-ROAD-Zeilen, davon 80 widersprüchlich** (offen und ruhig zugleich); `auth.road` übernimmt den letzten Wert. Gleicher Zug mit +10 Minuten oder Befehlsnummer 2 statt 1: **121 von 200 Entscheidungen kippen**. Ein vorgeschalteter zeitgebuchter Schritt („ich warte zehn Minuten, dann gehe ich weiter“) verschiebt also den Wurf. **[T]** Mit der Zugentscheidung (einmal pro Aufruf, Schlüssel ohne Uhrzeit und Befehlsnummer) ist beides behoben.

### 2.7 Reproduzierbarkeit
| Fall | heute (Probe/Code) | mit PULSE (§4.3) |
|---|---|---|
| Swipe / Regenerate / Continue | Record wiederverwendet, gleich (Probe: `swipe_same_road: true`) | unverändert |
| Save/Reload | Fold spielt gespeicherte Events ab, entscheidet nichts neu | unverändert; `pulse.window` ist ein Event |
| Edit der letzten Spielernachricht | wird neu aufgelöst; gleiche Zugnummer, gleicher Wurf (`edit_same_road: true`), solange Uhrzeit und Befehlsnummer gleich bleiben | gleicher Wurf, unabhängig von Wortlaut, Uhrzeit und Befehlsnummer |
| Edit älterer Nachrichten | Fold ignoriert den neuen Text (außer bei Zahlungen) | unverändert |
| Löschen und neu senden, NOT EXECUTED und erneut senden | gleiche Zugnummer | gleicher Wurf, kein Ausweg zum Neuwürfeln |
| Verarbeitungsreplay (Neuauflösung) | gleich bei gleichem Code | bewusst andere Werte durch den neuen Schlüssel, im Replay als eigene Kategorie zu führen |

### 2.8 Wiederverwendbare Strukturen
Hash-Wurf nach Muster `living.js:31 roll` und `roadLine`, ohne den `Dice`-Strom anzutasten: Der Würfelzähler `rng.n` bleibt unberührt, Kampf- und Suchwürfe verschieben sich nicht. Weiter: `ctx.auth` und `serializableAuth`, `ctx.extra` → `playerActionsBlock` (`context.js:274`) im Abschnitt `resolved` mit Priorität 0, also immer zugestellt; `delta.rejected` plus `corrections`; `bornHere`; die `held`-Prüfung; `entity.left`; `scene.threats`; das Muster aus `applyEvent`-Reducer und `validateState`; die Replay-Kategorien aus A1.

### 2.9 Was NPC-E0/E1 verlangt, ohne E2
Durch PULSE eingeführte Personen sind gewöhnliche `person.new`. Unbenannte Szenenfarbe verwirft der Extraktor wie bisher (`ambient`). Wiederkehrende Personen laufen über KNOWN AT und die Continuity-Karten aus E0/E1. **[T]** Keine Tagesabläufe, Agenden oder Offscreen-Simulation (E2/E3). Eine fremde Figur aus einem Ereignis weiß von Alaric nur, was sie selbst gesehen hat oder was öffentlich bekannt ist (Zeugenregel aus E1). **[R]** Die PULSE-Zeile erhöht den Priorität-0-Anteil von `resolved`. Was über das Budget von 1400 hinausgeht (`context.js:32`), verdrängt niedriger eingestufte Abschnitte (`relevant`, `lore`, möglicherweise `npc_continuity`). Messbar über die Kontextdiagnose aus .158.

### 2.10 Zusätzliche Modellaufrufe, Kontext und Laufzeit
**Notwendig: keine zusätzlichen Modellaufrufe.** Planner, Erzähler und Extraktor bleiben, der Extraktor-Prompt bleibt in P1 und P2 unverändert (Test patch5 (35)). Kontext: Eine THE-ROAD-Zeile kostet heute etwa 107 Token (Probe, Schätzung Zeichen/4). Vorgeschlagen sind höchstens rund 90 Token im offenen Fenster und rund 25 Token für einen ruhigen Zug in Stadt oder Wildnis (erst ab P2). Laufzeit: zwei Hashes und Scans über `scene.present` und `auth.gos`, unter einer Millisekunde. Recordgröße: rund 150 Byte pro geeignetem Zug.

---

## 3. Phase B – Lösungsansätze

| | B1 Reisegate ausweiten | **B2 zentrale Zugentscheidung (empfohlen)** | B3 nur Erzählerhinweis | B4 nachträgliches Extraktorbudget / Zeitrate |
|---|---|---|---|---|
| Idee | `roadLine`-Muster in weitere Handler kopieren (activity, Stadt-GO …) | ein Aufruf pro Zug, Rahmen aus dem Zugergebnis, ROAD AHEAD liest nur | „Die Welt lebt“-Satz in `settlement`/`world_area`, keine Engine-Chance | Ereignisse nach der Antwort zählen und überzählige ablehnen, oder λ pro Minute |
| Eine Chance pro Zug | nein, jeder Handler würfelt (das heutige Problem in §2.6) | **ja, per Konstruktion** | ohne Bedeutung | nein bzw. kanonwidrig (Minuten) |
| Durchsetzbar | nur je Handler | **ja**, eine `auth.pulse`, bestehende Firewall-Pfade | nein | nur ablehnend, ohne Anstoß zu Lebendigkeit |
| Nachrichten ohne Befehl (reiner Dialog) | nicht erfasst | erfasst | erfasst | erfasst |
| Aufwand und Risiko | klein, aber verstreut | mittel, an einer Stelle | sehr klein, ohne Wirkungskontrolle | mittel, Kanonbruch |

**Entscheidung: B2.** B1 vervielfacht genau den Defekt aus §2.6. B3 ist praktisch der heutige Stand: User04 hatte zwei offene Abschnitte und null Ereignisse. B4 widerspricht `02` §8 (Minuten) oder liefert nur Verbote. B2 übernimmt aus B1 die bewährte `road`-Regel und aus B3 die Rahmenzeilen.

---

## 4. Phase C – Fachplan

### 4.1 Architektur und Ablauf
```
playerTurnV4
 └ resolveCommands(…, {c:true})
     ├ Handler (go / journey.continue registrieren Reiseabschnitte: ctx.pulse.legs.push({seq, go, held}))
     └ pulseWindow(s, content, ctx)          ← NEU, genau einmal, nur auf dem Planner-Pfad, Ruleset ≥ 2
         1 eligible?  (§4.4)   → nein: auth.pulse = {v, eligible:false, reason}, keine Zeile
         2 frame      travel | wild | town (+ inside/outdoor, Tageszeit)
         3 held?      vorhandene Bedrohung → geschlossen („still here … nothing new“)
         4 draw       hash32(seed|turn|pulse) % 100 < pct[frame]
         5 kind       gewichtete Auswahl hash32(seed|turn|pulse.kind) mit Wiederholungsschutz (§4.6)
         6 emit       {t:'pulse.window', d:{…}}  → Reducer s.pulse.recent
         7 lines      ctx.extra (THE ROAD bzw. PULSE), auth.pulse, auth.road (abgeleitet)
 └ outcome.recorded  (auth.pulse über serializableAuth)
Erzähler: liest outcome.extra im Abschnitt resolved (Priorität 0)
Extraktor: unverändert
world.js: road-Regel (P1) bzw. pulse-Regel (P2) liest s.last.outcome.auth
```

### 4.2 Betroffene Funktionen und Schnittstellen
| Datei | Änderung | Stufe |
|---|---|---|
| `src/v4/pulse.js` (neu) | `pulseWindow(s, content, ctx)`, `pulseEligible`, `pulseFrame`, `pulseDraw`, `pulseKind`, `pulseLines`; reine Funktionen | P1 |
| `src/v4/commands.js` | `roadLine` wird zu `roadLeg` (registriert den Abschnitt, würfelt nicht, schreibt keine Zeile); Aufruf von `pulseWindow` am Ende von `resolveCommands`; Pacingwortlaut im offenen Fenster (§4.7) | P1 |
| `src/v4/turn.js` | `serializableAuth` um `pulse` erweitern | P1 |
| `src/state.js` / `src/validate.js` | Reducer und Schema für `pulse.window` und `s.pulse` (§4.3) | P1 |
| `content/rules.json` | Block `pulse` (Prozente, Arten, Gewichte, `recent`); `travel.leg_event_pct` wird zum Alias für `pulse.window_pct.travel` | P1 |
| `src/v4/world.js` | P1: `road`-Korrektur neu formulieren („brought no attack“ statt „uneventful“), Gruppenlimit im Gefahrenfenster der Reise; P2: Regel `pulse` für Erstschlag und Wegnahme durch Neue, Ausnahme für selbst gesuchten Kontakt | P1 klein, P2 Logik |
| `src/v4/envelope.js` | P2: optional `newInAnswer` abhängig von `auth.pulse`, besser die Prüfung in `world.js` neben `road` halten | P2 |
| `src/context.js` | keine Pflichtänderung (Zeilen laufen über `outcome.extra`); Diagnosezähler | P3 |
| Extraktor, Planner, Narrator-Systemprompt | **keine** | – |

### 4.3 Ereignis- und Zustandsmodell, Determinismus
- **Event:** `pulse.window { v:1, turn, frame, sub, open, kind|null, pct, roll, held:[ids], leg:seq|null }`. Nur bei geeigneten Zügen. Ausgeschlossene Züge erscheinen nur in `auth.pulse.reason`, ohne Event.
- **Zustand:** `s.pulse = { v:1, recent:[{turn, frame, kind}] }`, höchstens vier offene Fenster. Das ist keine zweite Datenbank, sondern ein kleiner Teil des bestehenden Event-Sourcing. Alte Spielstände ohne `s.pulse` gelten als leer.
- **Schlüssel:** `${s.meta.seed}|${s.turn}|pulse` (bzw. `|pulse.kind`). `s.turn` ist bereits die neue Zugnummer nach `turn.begun`. **Uhrzeit, Befehlsnummer und Text gehören ausdrücklich nicht in den Schlüssel.** Folgen: ein Wurf pro Zug; Edit, Löschen und erneutes Senden würfeln nicht neu; der `Dice`-Strom wird nicht berührt.
- **Rückwärtskompatibilität:** Alte Records haben `auth.road` und kein `auth.pulse`. `world.js` behandelt sie wie bisher. Ein Fold würfelt nie neu.

### 4.4 Auslöser und Ausschlüsse
Geeignet ist ein Zug nur, wenn **alle** Bedingungen erfüllt sind. Grundsätzlich wird nichts gewürfelt bei:
| Ausschluss | Grund | Art |
|---|---|---|
| `#`-Befehle, Panels, Klarstellungsfrage, Planner- oder Interpreter-Fehler | kein Story-Turn bzw. Systemabfrage | [T] Kanon |
| Kampf läuft, `pending_combat`, V3-Route (Kampf, Schleichen, Erstellung, toter Charakter) | aktive Kampfrunde | [T] Kanon |
| in einem echten Dungeon oder an seinem Tor, GO hinein | DUNGEON AHEAD ist zuständig | [T] |
| Aktivität `rest`/`sleep`/`wait` außerhalb einer Reise | W7 | [T] Kanon |
| Lernen (`train`/`study`) | engineseitig gebuchter Zeitblock, Wachstumsabschluss | [D] |
| nur `board.read` bzw. reine Informationsaktion | Informationsabfrage im Erzählgewand | [D] |
| Kauf, Zahlung oder Gildenregistrierung `pending`, neue Zahlungskarte | HARD STOP beim Preis darf nicht konkurrieren | [T] Finanzen |
| alle Befehle abgelehnt oder clarify, keine freie Handlung | ungültige Eingabe | [T] Kanon |
| selbst gesuchter Kontakt: `go.within`, Ziel oder Ort eines aktiven Jagdauftrags, Suche an einem Populationsort | sein Aufsuchen ist schon das Ereignis | [D], prüfen (§7) |

Reiner Dialog und „NOTHING TO BOOK“-Züge sind **geeignet**. Reise plus Lager („reise bis zur Dämmerung und schlage ein Lager auf“): Das Fenster gilt nur für den Abschnitt, das Lager bleibt W7. Lange Zeitsprünge zählen nie mehr als einmal.

### 4.5 Ereignisrahmen
Rahmen: **travel**, wenn ein `roadLeg` registriert ist (Bedingung wie heute); sonst **town** (`settlementOf`, unterteilt in Straße/innen und Tag/Nacht über `dayPart`); sonst **wild** (außen, kein Dungeon). Arten (vorläufig, `rules.json`):

| Art | Reise | Wildnis | Stadt (Tag) | Bedeutung und harte Grenze |
|---|---|---|---|---|
| `meeting` | 25 | 20 | 35 | Leute oder Kreaturen, die ihn nicht angreifen |
| `life` | – | – | 40 | Stadtleben mit Aufhänger: Nachricht, Auflauf, Fest, Bitte (kein automatischer Auftrag) |
| `trouble` | – | – | 20 | Reibung, Forderung, Diebstahlversuch; **kein** Erstschlag, **keine** Wegnahme |
| `obstacle` | 15 | 10 | – | versperrter Weg, Wetter, Furt |
| `trace` | 20 | 30 | 5 | Spur oder Fund (auch Hinweis auf ein Versteck); nichts wird automatisch genommen oder betreten |
| `strange` | 10 | 15 | – | Wunder, Magie, Seltsames; mechanisch nur über seine Handlung |
| `danger` | 30 | 25 | 0 (Nacht: offen, §7) | **eine** feindliche Gruppe dieses Landes; Stufe aus Population oder Gebiet |

Fensterwahrscheinlichkeit (vorläufig): **Reise 35**, damit der Anteil offener Abschnitte dem heutigen Patch 5 entspricht; **Wildnis 20**; **Stadt 10**. Begründung in §5.

Zeilenentwürfe (Englisch, Stil der Engine):
- *Reise offen:* `THE ROAD — on this leg toward X, ONE thing happens that fits the land and the hour: <KIND TEXT>. It stops the travel where it happens, short of X, and is a real stop; what he does about it is his decision. If nothing of this kind can fit what he does, nothing happens.`
- *danger:* `… one group of this land's people or creatures turns on him or bars his way with hostile intent; its strength is the land's (AREA LEVELS / populations), never his. One group, nobody joins it.`
- *Stadt offen:* `PULSE — around him, ONE thing of the town's life happens that he can notice: <KIND TEXT>. It takes nothing of his, starts no fight and binds him to nothing; he may ignore it.`
- *ruhig, Reise:* Wortlaut wie heute, um rund 30 % gekürzt. *Ruhig, Stadt/Wildnis (P2):* `NO WORLD EVENT this turn — the scene follows what he does; nobody new turns on him or takes from him.`

### 4.6 Wiederholungsschutz und offene Ereignisse
- Dieselbe Art kommt nie zweimal hintereinander (Gewicht 0). Die letzten drei offenen Arten zählen nur halb. Simulation: 0 direkte Wiederholungen (§5).
- **Offene Ereignisse:** Die heutige `held`-Prüfung gilt in jedem Rahmen. Solange anwesende Bedrohungen (Kreatur mit `threat !== false` oder `scene.threats`) da sind, bleibt das Fenster zu, mit der Zeile „X still here … nothing new“. Friedliche Reste blockieren nicht.
- **Kein Mitleidszähler.** Die Wahrscheinlichkeit hängt nie davon ab, wie lange nichts passiert ist. Nach einem offenen Fenster gibt es keine Abklingzeit (§7).

### 4.7 Zusammenspiel mit GO, unterbrochener Reise und Ankunftsbestätigung
- Mehrere Abschnitte in einer Nachricht: Das Fenster gilt für den **ersten** registrierten Abschnitt. Weitere bekommen „only if he gets past it; nothing else meets him“. Danach gibt es nur noch ein `auth.road`.
- `auth.road` wird abgeleitet: `'open'` nur bei offenem Fenster der Art `danger`, sonst `'quiet'`. Damit erzwingt die bestehende `road`-Regel ab P1, dass Neue nur im Gefahrenfenster angreifen; `world.js` braucht dafür keine Logikänderung, nur einen neuen Korrekturtext. Das Gruppenlimit ist eine kleine eigene Ergänzung (§4.8).
- Im offenen Fenster wird `pace` und `JOURNEY PACING` ergänzt: „except the one event THE ROAD names: that is a real stop“. Ruhiger Abschnitt: wie heute bis zur Ankunft, ohne erzwungenes „continue“.
- Ankunft, Ziele, Begleiter, Fallen (`pendingSpring`) und Wegestopps (`viaStop`) bleiben unverändert. PULSE bucht keine Ankunft.

### 4.8 Grenzen für Erzähler, Extraktor und Firewall
| Grenze | Mechanismus | Stufe |
|---|---|---|
| Höchstens eine Chance pro Zug | ein Aufruf, Schlüssel ohne Uhrzeit und Befehlsnummer | P1 |
| Reise: Neue greifen nur im `danger`-Fenster an | `auth.road` abgeleitet + `road`-Regel | P1 |
| Höchstens eine feindliche Gruppe pro Gefahrenfenster | `world.js` zählt neue feindliche Gruppen; eine zweite wird mit `pulse` abgelehnt | P1 (Reise) / P2 |
| Stadt und Wildnis: Erstschlag durch Neue nur im Gefahrenfenster | Regel `pulse` neben `road`, mit Ausnahme für selbst gesuchten Kontakt | P2 |
| Keine Wegnahme durch Neue (Raub) im selben Zug | `coerce()`: `bornHere` + `auth.pulse` → `pulse` | P2 |
| Keine Münzen, kein XP, keine Quests, kein Ortswechsel durch PULSE | unverändert: `coin_evidence`, `pc_inventory`, engineseitiger Kampf, Questregeln, `arrive` | – |
| Keine automatische Beute | Fund bleibt Weltobjekt, nehmen nur per `take` | – |
| Keine dynamische Stufenanpassung | `creatureContract`, `world_area`, `world_populations` | – |
| Friedliche Überproduktion | nicht durchsetzbar und unschädlich, nur Diagnose | P3 |

### 4.9 Diagnose
`auth.pulse` im Record (geeignet bzw. Grund, Rahmen, Prozent, Wurf, Art). `delta.rejected` mit `road` bzw. `pulse`. P3: im `extract.applied`-Summary `pulse: {open, introduced}` (Zahl neuer Personen, Kreaturen und Merkmale im offenen Fenster) als grobe Umsetzungsquote; Zähler in `perfSummary` und im Run-Report pro Rahmen. Die Kontextdiagnose aus .158 erfasst die zusätzlichen Token in `resolved` und verdrängte Abschnitte.

### 4.10 Token, Kosten und Laufzeit
Kein neuer Aufruf (§2.10). Erwartete Mehrkosten pro Sitzung im User04-Stil (11 geeignete von 46 Nachrichten): 1–2 offene Fenster × ca. 90 Token, dazu in P2 bis zu 9 ruhige Zeilen × ca. 25 Token. Reisezeilen werden kürzer als heute. Gegenrechnen müsste man Sols C1/C2 (§9).

### 4.11 Risiken, Regressionen und Gegenfälle
1. **Selbst gesuchter Kontakt falsch eingestuft** [R]: Ein Jagdziel greift nicht mehr zuerst an, oder umgekehrt rutscht ein ungewollter Hinterhalt durch. Gegenfälle: Jagdauftrag am `hunt.at`, „ich folge den Spuren“ (`go.within`), Suche am Höhlenort, Provokation eines Neuen.
2. **Verhalten in der Stadt ändert sich** [D]: Ein im selben Zug provozierter Neuer droht nur noch, angegriffen wird im nächsten Zug (Envelope `provoked_only`, die Ursache steht dann fest). Das passt zur Spielerhoheit, muss aber benannt werden.
3. **Testumbau** [T]: Die patch5-Tests (8–15, 35) mit `withRoad`, die Semantik von `open` (Banditenforderung wird zu Art `trouble`/`meeting`) und die Golden- bzw. Replay-Ergebnisse für Reisenachrichten (neuer Schlüssel). Für das Replay die Kategorie „pulse_key“ führen.
4. **Erzähler setzt Ereignisse zu wenig oder zu viel um** [R]: Messen (§4.9), Wortlaut „ONE thing happens … if nothing can fit, nothing happens“ statt „may (not must)“ (§7).
5. **Pacingwiderspruch** [T]: siehe §4.7.
6. **Budgetdruck** [R]: Priorität 0 in `resolved` wächst, gemeinsam mit Sols `STATE NOW`-Erweiterung.
7. **Sichtbare Korrekturen** [R]: Ignoriert der Erzähler die Grenze, folgt eine Korrektur im nächsten Zug (wie heute bei `road`).
8. **Alte Kampagnen** [T]: Der A-Pfad und Ruleset 1 bleiben unverändert, alte Records folden unverändert.

### 4.12 Umsetzungsstufen
| Stufe | Inhalt | Abnahme |
|---|---|---|
| **P1** Kern | `pulse.js`, Event, Reducer und Schema, `rules.json`, `roadLeg` mit einer Entscheidung, abgeleitetes `auth.road`, Reise-Arten mit Gruppenlimit, offene Fenster in Stadt und Wildnis **ohne `danger`**, Diagnosefelder, Pacingwortlaut | deterministische Tests §6, Replay kategorisiert, 2 ST-Smokes (Reise, Stadt) |
| **P2** Grenzen | Regel `pulse` (Erstschlag und Wegnahme durch Neue), Ausnahme für selbst gesuchten Kontakt, `danger` in der Wildnis, ruhige Zeile in Stadt und Wildnis | Gegenfälle §4.11 (1, 2) rot/grün, ST-Smoke Wildnis |
| **P3** Beobachtung | Umsetzungsquote, Report-Zähler, Feinjustierung nur über `rules.json`, Entscheidung über Abklingzeit | natürliche Spielbeobachtung (§6, N) |

Aufwand (Schätzung): P1 mittel (neues Modul ca. 200–250 Zeilen, Eingriffe in `commands.js` ca. 40 Zeilen, Reducer und Schema ca. 25 Zeilen, rund 30 neue und 10 angepasste Tests). P2 mittel bis hoch, vor allem wegen der Kontaktabgrenzung und der Gegenfälle in `world.js`. P3 klein im Code, aber nur mit echten Läufen sinnvoll.

---

## 5. Simulation und Verteilung (Entwurf, nicht Produkt)

`pulse_sim.mjs` mit 2000 Seeds × 300 geeigneten Zügen je Rahmen:

| Rahmen | Anteil offen | längste Ruhephase | längste Folge offen | direkte Artwiederholung | feindlich pro Zug |
|---|---:|---:|---:|---:|---:|
| Reise (35) | 0,349 | 21 | 8 | 0 | 0,089 |
| Wildnis (20) | 0,200 | 45 | 5 | 0 | 0,047 (P2) |
| Stadt (10) | 0,100 | 92 | 4 | 0 | 0 |

Artverteilung Reise: meeting 0,23 · danger 0,25 · trace 0,21 · obstacle 0,18 · strange 0,13. Durch den Wiederholungsschutz liegt `danger` unter seinem Gewicht von 30.

**Herleitung der Startwerte, ohne festen Zielprozentsatz:**
- **Reise 35:** Der Anteil offener Abschnitte bleibt wie im eingeführten Patch 5, der Wert ändert sich also nicht. Neu ist nur die Ereignisart, und der feindliche Anteil sinkt rechnerisch auf rund 9 % der Abschnitte. Heute ist „offen“ für alles zugleich zuständig und wurde in User04 bei 2 von 2 Abschnitten gar nicht umgesetzt.
- **Stadt 10 / Wildnis 20:** User04 hatte 8 geeignete Stadt- (7 nach Entscheidung §7.5), 1 Wildnis- und 2 Reisezüge. Daraus ergeben sich rechnerisch **1,7 offene Fenster** pro solcher Sitzung, die Wahrscheinlichkeit für keines liegt bei **14,6 %**. Eine stadtlastigere Sitzung mit 15 geeigneten Zügen (Simulation B) kommt auf 2,3 Fenster, P(keines) = 0,069, und 0,36 Gefahrenereignisse. Das passt zu „gelegentlich“ und lässt viele Züge ruhig.
- **Gegenseite:** Bei 10 % sind in der Stadt lange Ruhephasen möglich (P(30 ruhige Züge in Folge) ≈ 4 %). Das ist der Preis dafür, dass es keinen Mitleidszähler gibt. Die Grundlebendigkeit liefert weiter `SETTLEMENT LIFE` ohne Ereignis.
- **Alle Werte bleiben vorläufig**, als „Provisional values, no world law“ in `rules.json` nach dem Muster von Patch 5. Endgültig festgelegt werden sie erst nach P3.

---

## 6. Teststrategie und Abnahmeszenarien

**D** deterministischer Unit- oder Replaytest (Node, Host-Harness `Chat4`, gescriptete Antworten) · **H** echter ST-Host-Smoke mit Testkonfiguration, die eine Art erzwingt (z. B. `window_pct = 100`, feste Art) · **N** spätere natürliche Spielbeobachtung.

| # | Szenario | D | H | N |
|---|---|---|---|---|
| 1 | normale Stadtinteraktion ohne Ereignis | geeignet, ruhig: keine PULSE-Zeile (P1) bzw. ruhige Zeile (P2); keine Änderung an Weltzustand oder Kampf | Shop-Gespräch | Häufigkeit |
| 2 | friedliche unerwartete Begegnung in der Stadt | Stadt mit 100 %, `meeting`: Zeile vorhanden; Neuer gespeichert, kein Kampf, keine Münzänderung; neue Angriffsdelta mit `pulse` abgelehnt (P2) | ja | wirkt sie natürlich? |
| 3 | Reise mit echter Unterbrechung | Reise offen `danger` bzw. `obstacle`: `arrived:false`, Ziel bleibt `active`, Ort `realm` | ja | |
| 4 | Reise ohne Unterbrechung und ohne erzwungenes „continue“ | ruhig: Ankunft in derselben Antwort, wie patch5 (8) | ja | Pacing |
| 5 | Ereignis in der Wildnis mit offener Spielerentscheidung | `trace`/`strange`: kein `take`, kein `scene.moved` ohne sein GO, nächster Zug frei | ja | |
| 6 | mehrere Befehle pro Nachricht | genau ein `pulse.window`; zwei GO-Abschnitte ergeben eine Entscheidung (statt heute 80 von 200 Widersprüchen); Warte- oder Zeitschritt davor ändert den Wurf nicht | – | |
| 7 | aktiver Kampf und reine Systembefehle | `#status`, `#pay`, Klarstellungs-Panel, Kampfrunde, Schleichen über V3: kein Event, `auth.pulse` fehlt | ja (`#status`) | |
| 8 | Save/Reload, Swipe, Regenerate, Edit | `foldChat` deepEqual, gleiches `auth.pulse` nach Swipe, Regenerate und Edit der letzten Nachricht; Löschen und neu senden ergibt den gleichen Wurf | ja (Reload) | |
| 9 | vorhandene Bedrohungen | `held`: Fenster zu, keine weitere Gruppe; im Gefahrenfenster wird eine zweite feindliche Gruppe mit `pulse` abgelehnt | | |
| 10 | keine unautorisierte Orts-, Kampf-, Münz-, XP- oder Questveränderung | Raub durch Neue abgelehnt (P2), Ankunft nur über `arrive`, kein `quest.*` durch Ereignisse, XP nur aus engineseitigem Kampf | | |
| 11 | keine Verdopplung des alten ROAD-AHEAD-Ereignisses | kein Wurf mehr in `roadLeg`; alter Record mit `auth.road` ohne `pulse` foldet und extrahiert wie bisher | | |
| 12 | Ausschlüsse Dungeon/W7 | `rest`/`sleep`/`wait`, Dungeoninneres und Tor: kein Fenster; DUNGEON AHEAD unverändert | | |
| 13 | selbst gesuchter Kontakt (P2) | Jagdauftrag, `go.within`, Suche am Höhlenort: kein Fenster, keine `pulse`-Ablehnung | ja | |
| 14 | Verteilung | reine Funktion über 2000 Seeds: Anteil je Rahmen innerhalb der Binomialgrenze (±0,01), keine direkte Wiederholung, keine Abhängigkeit von Verlauf, Uhrzeit, Befehlsnummer oder Text | | |
| 15 | Korpus | Klassifizierer im Stil von `user04_frames.mjs` über die Replay-Basis: Zahl geeigneter Züge je Rahmen, erwartete Fenster pro Sitzung | | |

---

## 7. Offene Designentscheidungen (für GPT und den Nutzer)

1. **„soll“ oder „darf“ im offenen Fenster.** Empfehlung: „ONE thing happens … if nothing of this kind can fit, nothing happens“. „may (not must)“ hat in User04 bei 2 von 2 Abschnitten nichts ausgelöst.
2. **Gibt die Engine die Ereignisart vor?** Empfohlen ja, nur grob (§4.5): Das ermöglicht Vielfalt, Wiederholungsschutz und eine harte Grenze für Feindseligkeit, ohne die Geschichte festzulegen.
3. **`danger` in der Stadt nachts:** 0 (empfohlen für P1/P2) oder ein kleiner Wert (Straßenräuber). Raub ohne seine Entscheidung bleibt dabei ausgeschlossen.
4. **Abgrenzung des selbst gesuchten Kontakts** (Liste §4.4): kein Fenster und keine Grenze (empfohlen), oder eigenes Fenster mit Jagdart.
5. **Weg zum Dungeon** (z. B. User04 I15, von der Gildenhalle zu den Katakomben): ausschließen (empfohlen, einfacher) oder als Reiseabschnitt bis zum Tor behandeln.
6. **`wait` in der Stadt** (kurzes Warten auf jemanden): mit W7 ausschließen (empfohlen, kanontreu) oder ab einer Mindestdauer zulassen.
7. **Abklingzeit nach einem offenen Fenster:** keine (empfohlen für P1) oder eine Sperre für den direkt folgenden Zug. Das ist zulässig, weil es Ereignisse dämpft statt erzwingt.
8. **Startwerte** 35/20/10 und Artgewichte (§5): bestätigen oder ändern.

---

## 8. Empfohlene Patchaufteilung und erwarteter Aufwand
Siehe §4.12. Erwarteter Test- und Integrationsaufwand: P1 = rund 30 neue und 10 angepasste deterministische Tests, Vollsuite, Replay-Neukategorisierung (Reisenachrichten wegen „pulse_key“), 2 ST-Host-Smokes. P2 = rund 15 Gegenfall-Tests in `world.js`, 1–2 ST-Smokes. P3 = mindestens ein natürlicher Spielerlauf mit Auswertung der Diagnosezähler, bevor die Werte endgültig werden.

## 9. Integrationskonflikte
- **Sols User04-Plan** (`PATCH_USER04_START_BOARD_STATE.md`, main `4955eb7`, GPT-Abnahme §7 in `00b887e`): berührt `src/context.js` (C1 `STATE NOW`/`npcCard`, C2 Zugangsstatus), `src/v4/living.js` (Zugangstext), `src/v4/commands.js` (`board.read`-Zeile) und `content/rules.json`/`campaign_start.json`. **Überschneidungen:** `commands.js` (andere Funktion; ein Merge ist trivial, sofern nicht beide `resolveCommands` ändern), `rules.json` (verschiedene Blöcke) und vor allem das **gemeinsame Priorität-0-Budget in `resolved`**, das beide Pläne erweitern. Empfehlung: Sols Paket zuerst, danach PULSE P1 mit gemeinsamer Budgetmessung. `board.read`-Züge sind bei PULSE ausgeschlossen, Sols Boardprosa wird also nicht berührt.
- **Kanonpflege:** Nach Freigabe und Umsetzung `02` §8 von [GEPLANT] auf den umgesetzten Stand bringen sowie `03`/`07` aktualisieren. Das ist **nicht** Teil dieses Auftrags und erst nach einer Abstimmung mit Sol vorgesehen.
- **Replay-Basis:** Die Neukategorisierung aus P1 trifft jede gespeicherte Reisenachricht der Basis. Nicht gleichzeitig mit einem anderen Patch ändern, der Replay-Kategorien umbaut.

## 10. Reproduktion der Proben
Arbeitsverzeichnis: eine Produkt-Worktree auf `2089dcc` (`<eng>` = deren `avereth-engine`-Ordner).
```bash
ENG=<eng> node --test patch_plans_10b/pulse_probes/pulse_probe.test.mjs
```
```bash
ENG=<eng> node patch_plans_10b/pulse_probes/user04_frames.mjs testrun_10b/user-20261106-072640/originals/chat.jsonl.gz
```
```bash
ENG=<eng> node patch_plans_10b/pulse_probes/pulse_sim.mjs
```
Ergebnisse dieses Laufs: §2.6, §2.7, §5. `pulse_sim.mjs` modelliert den Entwurf und ist kein Produktcode.


---

## 11. Unabhängiger GPT-Gegenreview – Architekturabnahme mit fachlichen Auflagen (07.11.2026)

**Ergebnis:** Die Wahl einer **zentralen, deterministischen PULSE-Entscheidung pro geeignetem Erzählzug** wird bestätigt. W5/W6 ist für die nächsten Entwicklungsarbeiten fachlich richtig priorisiert, und die Integration des bisherigen ROAD-AHEAD-Gates ist plausibel. **Der Gesamtplan ist als Grundlage geeignet, P1 sollte jedoch nicht allein als fertig freigegebene PULSE-Grundfunktion ausgeliefert werden.** Drei konkrete Grenzfälle und der Integrationsnachweis sind vor einem natürlichen Usertest nachzuschärfen. Diese Gegenbewertung ändert keinen Produktcode und erteilt noch keine Implementierungsfreigabe.

### 11.1 Unabhängig geprüfte Grundlage und Nachweisgrenze

Geprüft wurden Claudes Fachplan §§0–10, alle **drei** eingecheckten Read-only-/Simulationsskripte und die auf `.159` maßgeblichen Codepfade `src/v4/commands.js` (`roadLine`, `resolveCommands`, GO, Board), `src/v4/turn.js`, `src/v4/world.js` (`bornHere`, `envelopeAllows`, `coerce`), `src/v4/envelope.js` (`mayOpenFight`, `mayTake`), `src/context.js` (Pflichtsektionen) sowie `content/rules.json`. Der vorherige User04-Originalreview ist bereits vorhanden.

**Abgrenzung:** Die jetzt eingecheckten Probeskripte und die 2000-Seed-Simulation habe ich für diesen Review **nicht eigenständig in einem vollständigen .159-Checkout ausgeführt**. Die 80/200 Doppelentscheidungen, 121/200 Schlüsseländerungen, simulierten Häufigkeiten und User04-Rahmenzahlen sind daher Claudes protokollierte Messungen, **nicht** von mir unabhängig replizierte Laufresultate. Die Probe `pulse_probe.test.mjs` enthält weit überwiegend **Mess- und Ausgabecode**, nicht Assertions für alle berichteten Häufigkeiten: ihre Resultate dürfen nicht mit einer bereits bestandenen PULSE-Produktsuite gleichgesetzt werden.

### 11.2 Architektur B2 und technischer Grundgedanke bestätigt

- Die gegenwärtige `roadLine()`-Entscheidung hängt tatsächlich von **Seed, Turn, Uhrzeit und `c.seq`** ab und wird für mehrere GO-Schritte erneut getroffen. Claudes zentrale einmalige Entscheidung beseitigt das strukturelle Mehrfachwürfelproblem, ohne andere Würfelströme verschieben zu müssen.
- Das bestehende `world.js` schützt mit `auth.road === 'quiet'` lediglich neue **Angreifer auf ruhigen Reiseabschnitten**, und nur sofern kein Kampf läuft. `envelope.js:mayOpenFight()` gestattet `newInAnswer` im Grundsatz; `coerce()` lässt unter seinen speziellen Rollen-/Beweisbedingungen auch echte Wegnahme durch den Erzähler zu. **Folgerung:** Eine zusätzliche kontextgebundene Grenze außerhalb von Reise ist sachlich nötig, nicht nur Dekoration.
- Ein `pulse.window`-Event, schmale `auth.pulse`-Daten und das bestehende Event-Fold-Prinzip sind ein geeigneter Architekturweg: kein neuer Modellaufruf, keine zweite Spielweltwahrheit, kein Uhrzeit-λ-System.
- Die grobe Ereignisart kann von der Engine vorgegeben werden, ohne konkrete NPC-Identität, Dialoge, versteckte Magie oder freie Ereignisfolgen als festes Drehbuch zu erzwingen.

### 11.3 **Kritischer Auflagenpunkt 1: P1/P2 dürfen keine ungeschützte Zwischenfunktion erzeugen**

P1 soll laut §4.12 bereits **offene friedliche Stadt-/Wildnisfenster** ausliefern; gleichzeitig bleibt die **Grenze gegen neue Angreifer/automatische Wegnahme außerhalb der Reise** bis P2 offen. Das ist im Code unmittelbar relevant: `mayOpenFight(..., {newInAnswer:true})` gibt zunächst `ok:true` zurück, und `world.js:coerce()` entscheidet über Rollen-/Belegkriterien, nicht über `pulse`.

**Empfehlung:** P1 und P2 dürfen auf einem isolierten Arbeitsbranch aufeinanderfolgen; **erst gemeinsam** eine PULSE-Grundfunktion für natürliche Userläufe freigeben. Entweder:
1. P1 als **rein technischen Zwischenstand** kennzeichnen, nicht für neue natürliche PULSE-Runs verwenden; P2 implementiert und testet die verbindlichen Grenzen vor der Abnahme, oder
2. eine **minimale Basissperre** für neue eigeninitiierte Angriffe/Wegnahmen bereits mit dem erstmals aktivierten Stadt-/Wildnisfenster in P1 liefern und die komplizierte gesuchte-Kontakt-Abgrenzung in P2 verfeinern.

Für beide Varianten gilt: Nicht als tatsächlich „friedlich“ geschütztes Fenster ausweisen, solange die entsprechende Firewallregel fehlt. Dies gilt auch für den **`trouble`-Fall** (Stadt ohne `danger`, aber mögliche Räuber-/Diebstahlszene). Eine bloße Narratorzeile, dass kein Geld genommen wird, ist keine mechanische Garantie.

**Plausible Ausnahme präzise halten:** Bestehende Gewalt-/Kampfzustände und legitime **explizite Spielerhandlungen** dürfen nicht durch eine globale neue PULSE-Sperre annulliert werden. Bei `coerce()` die Semantik von `robbery`, `fine`, `confiscation`, vorbestehender Autorität und ausdrücklich autorisierten Interaktionen unterscheiden. „Neu in der Szene“ allein darf weder alle behördlichen/vereinbarten Übergaben erlauben noch jede legitime Konsequenz verbieten. Gegenfälle als Tests vorsehen.

### 11.4 **Auflagenpunkt 2: selbst gesuchter Kontakt nicht pauschal auf Ortsniveau ausnehmen**

§4.4 nennt als Ausschluss unter anderem **„Ziel oder Ort eines aktiven Jagdauftrags“**. Das wäre zu weit: Ein Spieler kann mehrere Nachrichten am selben Jagdort verbringen; dadurch fiele genau dort das gewünschte freie Weltgeschehen fort. Gleichzeitig könnte eine sehr allgemeine Ausnahme „Jagdauftrag vorhanden“ das neue Angriffs-Gate für **unzusammenhängende neue Figuren** öffnen.

**Empfehlung:** Die Ausnahme an **die tatsächlich gewählte Handlungsabsicht und den belegten Zielkontakt** binden, z. B. konkrete `go.within`-Erkundung, ausdrückliche Suche/Annäherung an die etablierte Jagdpopulation und den passenden erfolgreichen Zielkontakt. **Nicht** jeden Turn am Ort einer angenommenen Jagdquest zu einer Ausnahme machen. Für weitere unabhängige Begegnungen gelten PULSE-Regeln weiterhin. Unterscheiden zwischen (a) Spieler sucht aktiv einen Gegner, (b) anwesender Gegner reagiert auf ihn, (c) Erzähler erfindet einen zusätzlichen fremden Überfall. Nur (c) muss dem ruhigen Fenster unterliegen; (a) und (b) benötigen ihre bisherigen Kampf-/Anwesenheitsregeln.

Notwendige rote/positive Gegenfälle: (1) Hunt-/Suchzug erzeugt den erlaubten Zielkontakt; (2) derselbe Ort, unabhängiges Gespräch, PULSE bleibt möglich; (3) Jagdauftrag, aber neu erzählte **fremde** Räubergruppe im ruhigen Fenster wird nicht durch die Jagdausnahme autorisiert; (4) bereits anwesende Gefahr reagiert weiterhin nach dem bestehenden Envelope.

### 11.5 **Auflagenpunkt 3: Board- und Reise-Rahmen anhand kombinierter Handlungen eindeutig definieren**

§4.4 schließt **„nur `board.read`“** aus; §9 spricht pauschal von ausgeschlossenen **Board-Zügen**. Ein `GO + board.read` wie User04 I71 ist nach dem Wortlaut nicht zwingend ausgeschlossen, besonders bei einer kurzen innerstädtischen Bewegung. Es darf nicht zufällig zum PULSE-Aufhänger werden, der die bereits bedingte Hallankunft oder Sols neue Boarddarstellung stört.

**Empfehlung:** Absicht explizit definieren und testen. Für den ersten Prototyp sind **reine Boardturns und kombinierte lokale GO+Board-Lesezüge**, deren Zweck die Gildenkarte ist, als Ganzes ausgeschlossen; falls ein späterer Reisezug ein Board erst **nach bestätigter Ankunft** liest, muss die Reisephase eigenständig und eindeutig autorisiert sein. Kein zweites weltfremdes Ereignis am Gildentresen nur, weil ein GO vor dem Boardlesen steht.

**Daneben:** Ein GO aus der Stadt heraus zum Dungeon-Tor wird vom alten `roadLine()` nicht immer als normaler Reiseabschnitt registriert. Es darf dann **nicht allein aufgrund des Startortes irrtümlich als Stadt-PULSE** mitten auf der Strecke auftreten. Zwei saubere Varianten:
- im ersten Prototyp diesen Grenzfall ausschließen und als echte Abdeckungsgrenze dokumentieren (Claudes §7-Empfehlung), oder
- ihn anhand realer Abreise-/Zielinformationen bewusst zum Reiserahmen erklären und gegen die bestehenden GO-/DUNGEON-AHEAD-Grenzen testen.

Kein rein textbasierter Ortsraten-Ersatz und kein „PULSE-Ankunft“ ohne bestätigtes `arrive`. **Meine Präferenz für den ersten Prototyp ist die enge Ausschlussvariante**, um den eigentlichen PULSE-Kern vor zusätzlichen Reise- und Dungeongrenzfixes prüfbar zu halten. Später kann W6 das decken.

### 11.6 Ereignisfenster versus tatsächlich spielbares Ereignis

Die Simulation berechnet **offene Fenster**, nicht erfolgreiche Begegnungen im natürlichen Spiel. User04s zwei bisherige offene Reiseabschnitte führten zu keiner Unterbrechung; das ist ein motivierender Befund, aber bei N=2 kein allgemeiner statistischer Nachweis der bisherigen Erzählerausfallquote.

**Designempfehlung:** Das offene Fenster ist keine bloße Erlaubnis, beliebig folgenlos weiterzuschreiben. Die Instruktion soll ein **konkretes, wahrnehmbares, kausal zur Umgebung passendes Ereignis** verlangen, sofern der bestätigte Spielzustand es zulässt; sonst soll sie die Leerstelle ausdrücklich zulassen und niemals Weltfakten erfinden. Ein friedliches Ereignis braucht keine Kampf-, Geld- oder Questbuchung. Rein erzählerische Hintergrundfiguren bleiben als Stadtleben weiterhin möglich, ohne als „erfolgreiche PULSE-Auslösung“ gezählt zu werden.

Die Instrumentierung in P3 muss deshalb mindestens **drei Stufen** getrennt zählen: `window_open`, **tatsächlich erzählte konkrete Situation** und **validiert persistierte Weltfolge (falls eine entstand)**. Es wäre irreführend, nur die Zahl neu angelegter Personen/Kreaturen als Erfolg zu verwenden: Ein beobachtetes Naturphänomen oder eine authentische Spur kann spielbar relevant sein, ohne eine neue Person zu erzeugen. Technisch ist eine solche Zählung möglicherweise nur heuristisch möglich; dann **nicht** als präzise Engine-Wahrheit darstellen. Die natürliche Run-Auswertung bleibt die Entscheidungsgrundlage.

### 11.7 Kontext-/Kosten- und Replayhinweise

- `resolved` ist im aktuellen `context.js` eine geschützte Priorität-0-Sektion. User04 überzog bereits vor dem PULSE-Plan in vielen Zügen das nominelle Budget. **Nach Sols C1/C2** mit *tatsächlich ausgegebenen* Turnblöcken messen: Pflicht- und optionale Abschnitte, Drops, Narrator-Eingabe und spätere Completion. Nicht allein die 90/25-Token-Zielwerte aus Zeichen/4 als Kostenbeweis verwenden.
- Für **jeden geeigneten Zug** ein persistiertes Fenster-/Entscheidungsevent halten; die Menge und der Reducer müssen begrenzt bleiben. `auth.pulse` plus `pulse.window` ist dabei vertretbare diagnostische Redundanz, solange der Eventzustand nicht zu einer zweiten Autorität gegenüber dem Turn-Outcomes wird.
- Bei mehreren GO-Schritten den **ersten tatsächlich autorisierten Reiseabschnitt** und das eine Fenster stabil festlegen. Ein abgelehnter/bedingter Schritt darf nicht eine spätere zulässige Handlung unbemerkt falsch klassifizieren; der vorhandene `ctx.resolutions`-Status ist dafür wichtiger als nur eine frühe Registrierung.
- Eine identische Seed-/Turn-Hashzahl garantiert **denselben Zufallswert**, nicht zwangsläufig dasselbe `open`-Ergebnis bei absichtlich geänderter Rahmeneinstufung (Stadt → Reise). Solche Edits im Test nicht fälschlich als Nichtdeterminismus behandeln.
- `pulse_probe.test.mjs` und `pulse_sim.mjs` sind ausgezeichnete **Planungsproben**, aber noch **keine** Implementierungs-Regressionen für das neue Produkt. Die endgültigen Assertions müssen zentrale Auswahl, Ausschlüsse, Rückwärtskompatibilität, Erstschlag, Raub und Multi-GO direkt gegen neuen Code abdecken.
- **Keine Pflicht-Neukategorisierung historischer Replayfälle zu „akzeptiert“ ohne Einzelfallbeleg.** Der neue Würfelschlüssel ändert erwartbar einzelne Reiseausgaben; alte Events aus echten Saves und ihre Folds bleiben unberührt.

### 11.8 Empfehlung zu den acht offenen Designfragen (§7)

| Frage | GPT-Empfehlung für den ersten Prototyp |
|---|---|
| **1. „soll“ oder „darf“** | **Eine konkrete Situation soll auftreten**, wenn welt- und actionspezifisch plausibel; kein Ereignis erzwingen, das nur mit erfundener Mechanik möglich wäre. Bei fehlendem Fit kein falscher Stop. |
| **2. Engine bestimmt Art** | **Ja, grob**: meeting/life/trouble/obstacle/trace/strange/danger. Ausgestaltung beim Modell; Buchungen weiterhin Engine/Firewall. |
| **3. Gefahr in der Stadt** | Anfangs **kein spontaner neuer Erstschlag** auch nachts; `trouble` erlaubt Spannungen, Forderung oder versuchten Diebstahl **ohne automatische tatsächliche Wegnahme**. Nach natürlichem Run neu entscheiden. |
| **4. Selbst gesuchter Kontakt** | **Handlungs- und zielgebundene Ausnahme**, nicht pauschal kompletter Jagdort oder alle neu eintreffenden Figuren; siehe §11.4. |
| **5. Weg zum Dungeon** | Für P1 **ausnehmen**, wenn die bestehende ROAD-AHEAD-Klassifikation keine eindeutige echte Reise hergibt. Keine falsche Stadt-PULSE auf dem Auswärtsweg. Später gezielt W6 erweitern. |
| **6. Kurzes Warten** | **W7**, vorerst unabhängig von Dauer ausgeschlossen, sofern der Zug primär `wait/rest/sleep` ist; nicht bloß nach Textsplit beurteilen. |
| **7. Abklingzeit** | **Keine** feste Cooldown-Regel für die erste technische Grundversion, aber doppelte offene Fenster unmittelbar hintereinander und die subjektive Häufigkeit beobachten. Rückstands-/Mitleidszähler weiterhin nicht einführen. |
| **8. Startwerte und Artgewichte** | **35 % Reise / 20 % Wildnis / 10 % Stadt vorläufig akzeptabel** als erste messbare Hypothese, keinesfalls feste Weltnorm. User04-artige 1,7 offene Fenster sind **nicht** 1,7 tatsächlich erlebte Ereignisse. Echte Frequenz erst mit natürlichem Spiel beurteilen. |

### 11.9 Priorisierte nächste Umsetzung

**Empfehlung:** Sols kleines User04-QoL-Paket zuerst abschließen. Danach W5/W6 auf einem eigenen **Produkt-Arbeitsbranch** beginnen und P1 mit mechanischen Tests umsetzen; P2 unmittelbar anschließend oder die minimale Firewall-Sperre schon in P1 vorziehen. **Erst die vollständig geschützte P1+P2-Baseline** gegen vollständige Node-Suite, Replay und echte ST-Smokes abnehmen; danach naturspielerisch PULSE-Intensität, Abwechslung und konkrete Wirkungen beurteilen. P3 bleibt iterativ und ohne vorzeitige starre Frequenzgesetzgebung.

**Fazit:** Eine bessere Architekturalternative ist nicht erkennbar. **Es bestehen drei gezielte Ausführungsauflagen, aber kein Anlass, Claude einen neuen vollständigen PULSE-Audit zu geben.** Keine Produkt- oder Kanonänderung durch diesen Gegenreview; der Nutzer entscheidet über die Umsetzung.
