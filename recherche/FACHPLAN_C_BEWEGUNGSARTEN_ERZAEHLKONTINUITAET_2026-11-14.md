# Fachplan C – Bewegungsarten, NPC-Begleitung und erzählerische Ortskontinuität

**14.11.2026 · Claude · Etappe 3 von 3, mit Gesamtabgleich (§8). Keine Implementierung, keine Designfreigabe.**

**Prüfstand:** `4438241` (`.189`). **Selbstprüfung vom 14.11.:** C4 korrigiert (`move` bleibt Bandschritt auch vor einem Kampf), C1-b korrigiert (neuer Plannertyp nötig, `plan.notes` ist Engine-Ausgabe), N4-Hostweg im Code bestätigt, Gesamtabgleich angepasst (§8). **Baut auf:**
- [Fachplan A](FACHPLAN_A_ORTSBUCH_BEWEGUNGSPLAN_2026-11-14.md) (Ortsbuch, Bewegungsnachweis) und [Fachplan B](FACHPLAN_B_DUNGEONRAUM_ARCHITEKTUR_2026-11-14.md) (Dungeon B6),
- [Grundanalyse](ORT_REISE_UMGEBUNG_ARCHITEKTUR_GRUNDANALYSE_2026-11-14.md), [GPT-Gegenreview](ORT_REISE_UMGEBUNG_GPT_GEGENREVIEW_2026-11-14.md) §3.5 und §5,
- [O1/O2](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md), [Opus 5.5](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) §2.3.

Nachweisgrade wie in Fachplan A.

## 0. Ergebnis

| Variante | Urteil |
|---|---|
| **C1** Streng explizite Reisen, besserer Plannervertrag und klare Rückmeldung | **empfohlen als Grundlage** |
| **C2** Bedingte NPC-Begleitung | **nur eng**: eine ausdrückliche Zusage, mitzugehen, sobald die Person aufbricht. Fragen und Vorschläge bleiben Dialog. Optional, geringe Häufigkeit |
| **C3** Implizite Teilbewegung | **nur Stufe a** (innerhalb derselben Stätte: Raum ↔ Halle, Zimmer); **nicht** zu Händlern, Gesuchtem oder Gegenübern im Ort |
| **C4** Vereinfachtes Bewegungsmodell | **Teile übernommen**: `move` nur für Bandschritte gegenüber Anwesenden, ein wirkungsloser `move` außerhalb des Kampfes wird eine Plannerreparatur statt einer Wortdeutung; `within` geht in `go` auf; Rückweg über die Route |
| **C5** Erzählerführung und Rückführung | **empfohlen**: Ortskopf (N1), sichtbarer Spielerhinweis (N2), **neu: Verlaufsmarkierung** (N4). Automatische Neuerzeugung (N3) **nicht** |

**Kernbefund:**
- **Der Planner ist nicht das Hauptproblem.** Mitgehen funktioniert schon heute in 17 von 27 Nachrichten mit Begleitwörtern über ein normales GO (Regel 7b). Das ist eine Näherung über Begleitwörter, keine Einzelprüfung aller Nachrichten.
- **Was die Drift trägt:** der Erzähler, der aus Fragen, Suchen und Gesprächen Reisen macht, und der Verlauf, in dem seine falsche Szene stehen bleibt.
- **Was fehlt:** Ein menschlicher Spieler erfährt heute **gar nicht**, dass eine erzählte Ankunft nicht stattfand. `playerFacingLines` (`host.js:459`) filtert „ENGINE REFUSED …“ aus dem sichtbaren Panel.

Ein klarer zusätzlicher Spielerbefehl („ich gehe mit ihr“) kostet in den Daten etwa einen Zug je 100 Eingaben. Das ist billiger als jede automatische Deutung.

---

## 1. Heutiges Bewegungsmodell [C]

| Element | Stelle | Wirkung |
|---|---|---|
| **Regel 1** | `planner.js:56` | Fragen, Wünsche, Pläne, Bedingungen für später, Dialog: keine Handlung |
| **Regel 7** | `planner.js:62` | außerhalb des Kampfes ist Weggehen `go`, auch wenn er es Rückzug nennt; `move` für Schritte „during a fight“; Suche ist `activity search`. **In der Praxis** bucht `mapPlan` `move` auch außerhalb eines aktiven Kampfes als Bandschritt gegenüber anwesenden Kreaturen (`.186` #113: SHORT → MEDIUM vor den Speeren, Test `fix187_way_back`) |
| **Regel 7a / 7c** | `planner.js:63`, `67` | „back“, „return“ über `RECENT ROUTE`; Dungeonwege über `EXITS` |
| **Regel 7b / 7b-route** | `planner.js:65–66` | klare Annahme einer angebotenen Führung durch eine anwesende Person ist `go`; eine Wegwahl gegenüber einem Führer ist `go`; eine bloße Einladung oder ein künftiger Plan ist nichts |
| **`mapPlan`** | `planner.js:770–850` | wirkungsloser `move` außerhalb des Kampfes wird Fiktion; seit `.187`: Rückweg aus Wortlaut (`retreatGo`, `BACK_WAY` 741, `STAYS` 764) |
| **`ROAMING`** | `commands.js:57`, `786` | `activity gather/search/errand` setzt `auth.roam`: Die Firewall erlaubt dann eine Ankunft ohne GO |
| **Händlersuche** | `commands.js:744–749` | „ordinary shop or service … is found, not searched for“: `FINDS — … he decides where to go, nothing is entered` (**bewusst keine Mitbewegung**) |
| **`within`** | `commands.js:630–642` | lokale Jagderkundung; sonst `invalid local habitat scope` (Korpus 10×, `.188` Mage #109) |
| **Firewall** | `firewall.js:410–417` | `arrive` ohne GO, ohne Streifen und ohne belegte äußere Ursache → `no_go` mit dem Korrektursatz |
| **Zimmerausnahme** | `firewall.js:411` (`lodgedHere`), `world.js:121` | nur Ruleset < 2, für alle aktuellen Kampagnen aus |
| **Korrektur an den Erzähler** | `world.js` (`.187` benannt), `context.js:871` | höchstens 4 Korrekturen à 400 Zeichen, spät im Engineblock |
| **Panel** | `display.js:283` | „ENGINE REFUSED n reported changes (…)“ |
| **Spielersicht** | `host.js:453–475` `playerFacingLines` | **filtert genau diese Zeile heraus**: Ein menschlicher Spieler sieht keinen Hinweis; nur das HUD nennt den Ort |

---

## 2. Originalproben [D]

### 2.1 Ankünfte ohne GO (16 von 26 in `.186`/`.188`, Grundanalyse §3.3)

**Zählweise:** Die Chat-Nummer bezeichnet die **Spielernachricht**; die abgelehnte Ankunft steht in der Antwort mit der folgenden Nummer. Die Grundanalyse §3.3 zählt nach Antworten.

| Ursprung | Fälle | Beispiel | Was der Planner tat |
|---|---|---|---|
| Planner verfehlt eine klare Bewegung | 3 | `.188` Mage #121 „I'm heading back to the Guild hall to report“; `.186` Warrior #117 `move away`; `.186` Rogue #55 Flucht durch die Spalte | `[]`, `move`, `[]` gegen Regel 7 |
| Vorschlag oder bedingte Zusage, NPC führt | 2 (+2 Wiederholungen) | `.188` Warrior #109 „ready to walk with her … whenever she is“; Rogue #75 „Shall we go ask him … now, then?“ | regelgerecht `[]` (n168: „not departing yet“; n111: „‚Shall we go‘ is a question“) |
| Teilbewegung einer gewählten Handlung | 4 | `.186` Rogue #97 Händlersuche → Schmiede; #75 Durchquerung → Grotto; `.188` Mage #57 Verkauf → Apotheke; Rogue #121 Hinterzimmer → Halle | `activity search` mit **FINDS**, `attempt`, `offer.accept`, `[]` |
| Erzähler bewegt ohne Bewegungsbezug | 2 | `.188` Warrior #137 Wache; Rogue #7 Frage nach dem Weg | `[]` regelgerecht |
| Folgefehler | 1 | `.188` Rogue #99 | – |
| **Wiederholung derselben unerreichten Szene** | 4 | `.186` Warrior #120; `.188` Warrior #112, Rogue #78, Mage #60 | – |

**Batch 28 (`.154`, Opus 5.5 §2.3):** Von 18 Ursprüngen waren:
- 8 „Arbeit oder Begleitung, die eine Person anführt“, darunter „Let's walk the lines.“ als `activity work`,
- 4 eine klare Bewegung ohne GO,
- 2 ein Zimmer nach der Buchung,
- 2 das Nachbarhaus,
- 2 Lager oder Kampf.

### 2.2 Wie oft Mitgehen schon funktioniert [D]

Spielernachrichten mit Begleit- oder Folgewörtern („follow“, „lead the way“, „with her“, „together“, „shall we“):

| | GO gebucht | kein GO | davon Erzähler bewegt trotzdem |
|---|---|---|---|
| `.186` | 6 | 3 | 0 |
| `.188` | 11 | 7 | 4 (Warrior #109, Rogue #75, #77, Mage #121) |

### 2.3 Wiederholung und Rückkehr [D]

| Episode | Ablauf |
|---|---|
| **Warrior #110–#114** | Korrektur vollständig im nächsten Request. #112 beginnt **richtig** in Dagnys Haus, geht aber erneut zum Reeve, weil der Spieler Werrin anspricht. #114 bleibt ganz in Dagnys Haus |
| **Rogue #76–#80** | Korrektur gekürzt (400 Zeichen). #78 wiederholt, #80 zurück in der Halle |
| **`.186` Warrior #117–#130** | rund sechs Antworten |

**Mechanik der Wiederholung:**
- Die falsche Szene steht **wörtlich** im Verlauf des nächsten Requests (Assistant-Nachricht).
- Die Spieler-LLM spricht Personen dieser Szene an.
- Der Erzähler löst den Widerspruch mit einer erneuten Reise.

**Ergebnis:** Die Korrektur wirkt, verliert aber gegen die Spielernachricht.

---

## 3. Varianten

### C1 – Streng explizite Reisen mit klarer Rückmeldung

**Inhalt:** Nur eindeutig gewählte Ortswechsel werden gebucht, wie heute. Dazu drei Verbesserungen ohne neue Engine-Wortlisten:

**C1-a Plannervertrag (LLM-Regeln, keine Engine-Heuristik):**
- Eine **Aufforderung in der ersten Person Plural zu sofortigem Aufbruch** ist `go`: „Let's go to …“, „Let's walk the lines“, „We head out to …“.
- Eine **Tätigkeit an einem anderen genannten Ort** ist `go` + Tätigkeit („I go check the traps“).
- **Ankündigungen eigener Bewegung im Präsens** sind `go` („I'm heading back to the Guild hall“).
- Fragen, Vorschläge mit Fragezeichen, „whenever …“ und „later“ bleiben **keine** Handlung.
- Die Regeln kommen mit Beispielen und Gegenbeispielen in die Plannerregeln; abgesichert wird über Regressionen am Planner-Mock und an Originalnachrichten, nicht über Code.

**C1-b Ehrliche Antwortgrenze:** Bucht der Planner kein GO, obwohl die Nachricht eine Bewegung **erwägt**, gibt er das als mechanikfreien Eintrag zurück, nicht als Buchung, etwa `{"type": "proposed", "what": "travel", "to": …, "quote": …}`. **Korrektur:** Ein solches Feld gibt es noch nicht. `plan.notes` sind Notizen der Engine aus `mapPlan` (`planner.js:804–902`, „not taken …“), keine Planner-Ausgabe. C1-b braucht also einen **neuen** Plannertyp ohne Wirkung; er ist klein, aber eine Vertragserweiterung. Der Erzähler erhält dann: „He only asked or proposed to go to … The reply may let them answer and get ready; it ends before anyone sets off. He decides in his next message.“
- Das stützt sich auf das Sprachverständnis des Planners, nicht auf eine Wortliste der Engine.

**C1-c Spielerinformation (N2):** Bei abgelehnter Ankunft erscheint im **sichtbaren** Panel: `NOT ARRIVED — Alaric is still at Dagny's blue-door house; he has not gone to the reeve's hall.`
- `playerFacingLines` lässt diese eine Zeile durch und filtert die übrigen Bücherzeilen weiter.

**Wirkung auf die Proben:**

| Probe | Ergebnis |
|---|---|
| Mage #121, Batch 28 „Let's walk the lines“ | ✓ (a) |
| Warrior #109, Rogue #75 | Erzähler beendet die Antwort vor dem Aufbruch (b) [P: Modellfolgsamkeit] |
| Wiederholungen | durch (c) und C5 seltener |
| Händlersuche, Verkauf, Durchquerung | unverändert explizit; der Erzähler erhält die FINDS-Zeile wie heute |

**Kosten:** etwa ein zusätzlicher Spielerzug, wenn ein Spieler wirklich mitgehen will (`.188`: ≈ 2 Fälle in 210 Eingaben) [S].

**Spielerhoheit:** voll erhalten.

**Entfällt:** nichts. Die Abhilfe ersetzt künftige Wortlisten.

### C2 – Bedingte NPC-Begleitung

**Inhalt:** Eine **ausdrückliche Zusage**, mitzugehen, sobald die Person aufbricht, wird ein bedingtes GO: `go` mit `with: <npc>` und `when: 'departs'`.
- Beispiele: „I'll follow you to Werrin as soon as you're ready“, „Lead on, I'm right behind you“.
- Die Bedingung entsprechen dem Muster des bedingten Kaufs.
- **Wirksam** wird es, wenn die Antwort zeigt, dass die Person aufbricht und Alaric mitkommt (A4-Schrittantwort „departed with … yes/no“).
- **Sonst** verfällt es ohne Ablehnung.

**Abgrenzung (GPT-Gegenreview §3.5, übernommen):**
- **Keine** Fragen („Shall we go now?“), Vorschläge oder hypothetischen Einladungen.
- Die Zustimmung der NPC ersetzt nie Alarics eigene Zusage.
- Der Erzähler darf die Spielerzusage nicht erfinden; sie muss im Zitat stehen.

**Wirkung:**
- Warrior #109 ✓, weil „ready to walk with her … whenever she is“ eine Zusage ist; die Frage bleibt, ob GPT das als hinreichend ausdrücklich sieht.
- Rogue #75 ✗ (Frage, bleibt C1-b).

**Häufigkeit:** in `.186`/`.188` 1 Fall, in Batch 28 ein Teil der 8 [D].

**Kosten:**
- eine Bedingungsart (es gibt schon sieben, Fable §3.1),
- ein Feld im Bewegungsnachweis (`when`),
- eine Antwort im A4-Schritt,
- Kanon §2: Ergänzung zur bedingten Handlung.

**Bewertung:** **optional.** Wird sie gewünscht, dann nur so eng.

### C3 – Begrenzte implizite Teilbewegungen

**Drei Grenzen geprüft:**

| Stufe | Grenze | Fälle in den Daten | Risiko | Urteil |
|---|---|---|---|---|
| **a** | innerhalb **derselben Stätte**: Kind, Eltern oder Geschwister der aktuellen Stätte; kein Dungeon; kein Hindernis; kein Kampf | `.188` Rogue #121 (Hinterzimmer → Halle); Batch 28: 2× Zimmer nach Buchung; O2-Fall | gering: kein neuer Ort, keine Reise, kein PULSE | **empfohlen** (ersetzt die abgeschaltete Zimmerausnahme und O2-stay) |
| **b** | zum **Gegenüber einer gewählten Handlung** im selben Ort (Verkauf an X → X's Laden) | `.188` Mage #57 | mittel: „ich verkaufe ihr“ belegt keinen Weg; der Laden kann woanders sein (GPT §3.5) | **nicht empfohlen**; Planner-Regel „gehe zu X und verkaufe“ (C1-a) genügt |
| **c** | zum **Ziel einer Suche** im Ort (Händlersuche → Schmiede) | `.186` Rogue #97 | mittel: die Engine hat bewusst „FINDS … he decides where to go“ entschieden | **nicht empfohlen**; FINDS bleibt, C5 stärkt die Einhaltung |

**Stufe a im Detail:**
- **Zulässig:** ein `arrive` ohne GO, wenn alle Bedingungen gelten:
  - Das Ziel liegt in derselben Stätte (`complexOf`), außerhalb echter Dungeons.
  - Es steht kein gesperrter Ausgang dazwischen (nach Fachplan B gibt es außerhalb von Dungeons keine Wege).
  - Es läuft kein Kampf und kein Stealth-Schritt.
- **Behandlung:** Das ist **eine** Bedingung in der Firewall, die `lodgedHere` ersetzt.
- **Nicht erlaubt:** ein neuer Ort außerhalb der Stätte, ein Wechsel der Siedlung, ein Dungeon.

### C4 – Vereinfachtes Bewegungsmodell

**Inhalt:**
- **`move` bleibt der Bandschritt gegenüber Anwesenden**, im Kampf und davor (`.186` #113). **Korrektur:** In der ersten Fassung stand „nur im Kampf“; das hätte gültige Annäherungs- und Rückzugsschritte vor einem Kampf verboten.
- **Ein wirkungsloser `move` außerhalb eines Kampfes** (niemand, gegenüber dem sich das Band ändern könnte; `.186` #117) löst **eine Plannerreparatur** aus: „this step moves him relative to nobody; if he goes somewhere, answer with go (back via RECENT ROUTE or a place), else no command“. Heute deutet die Engine den Wortlaut (`.187`–`.189`). Damit entscheidet das LLM die Bedeutung, und die Engine prüft nur die Wirkung.
  - **Entfällt:** `retreatGo` mit `BACK_WAY` und `STAYS` (`planner.js:741–764`) und der `wayBack`-Zweig in `mapPlan`.
  - **Bleibt:** „back“ über `RECENT ROUTE`. Mit Fachplan A ist die Route ungefiltert und das Ziel im Ortsbuch aufgelöst.
- **`within` entfällt** als eigene Art. Ein GO `{new}` im aktuellen Habitat erhält über den Umfang des Ortsbuchs (Fachplan A) sein Habitat als Eltern. Die Fehlerklasse `invalid local habitat scope` verschwindet (Korpus 10×).
- **Keine Ortsgranularität unter der Stätte** für Bewegungen außerhalb von Dungeons (C3-a).

**Wirkung:**
- `.186` Warrior #117: Planner-Reparatur → `go` zurück (Route) [P: Reparaturerfolg].
- `.188` Mage #109 ✓.

**Kosten:**
- Eine Plannerreparatur bei einem wirkungslosen `move` außerhalb des Kampfes. In `.186`/`.188` war das 1 Fall; heute kostet jede Planner-Reparatur ~12k Prompt-Tokens [D].
- Im Gegenzug fallen Code und Wortlisten weg.

**Bewertung:** **übernehmen.** Die Teile sind klein und belegt.

### C5 – Erzählerführung und Rückführung

**N1 – Ortskopf statt verstreuter Korrekturen.** Am Anfang des Engineblocks ein kurzer, **aus Outcome und Bewegungsnachweis abgeleiteter** Kopf (Form nach GPT §5):

```text
WHERE — Dagny's blue-door house (Causeway hamlet).
TRAVEL THIS TURN — none chosen. / GOES — to …; may stop at …; PULSE: a real stop short of …
NOT HERE — Werrin (reeve's hall, not reached).
```

- Die Ortskorrekturen gehen darin auf: Sie werden nicht mehr gekürzt und stehen nicht mehr am Ende.
- Keine absolute Formel „ends here“: PULSE-Halt und äußere Kräfte bleiben möglich.
- **„NOT HERE“** nennt die Personen, die die Spielernachricht anspricht und die nicht anwesend sind. Das löst den Konflikt aus Warrior #111/#112 direkt: „He speaks to Werrin, who is not here; answer from where he is.“

**N2 – Spielerinformation:** C1-c.

**N4 (neu) – Verlaufsmarkierung statt Neuerzeugung.**
- **Ansatz:** Der Erzähler sieht im nächsten Request seine vorige Antwort wörtlich. Die Engine hängt dieser Assistant-Nachricht **nur im Modellrequest** eine Zeile an: `[ENGINE: in this reply Alaric did not reach the reeve's hall; he remained at Dagny's house. Werrin was not met.]`
- **Was unverändert bleibt:** Im Chat ändert sich nichts. Der Spieler sieht N2, Eventlog und Fold bleiben unberührt.
- **Wirkung:** setzt genau an G5 an (falsche Szene im Verlauf).
- **Wie (geprüft [C]):** Der Interceptor bearbeitet schon heute eine **Promptkopie** des Verlaufs. `projectPromptHistory` (`host.js:556–583`, aufgerufen `index.js:382`) entfernt alte Trackerblöcke und kürzt den Verlauf; gespeicherter Chat, Swipes und Spieleransicht bleiben unberührt. Die Markierung ist dort eine weitere Projektion aus den gespeicherten `corrections` des Records.
- **Kosten:** ~40–80 Tokens je betroffenem Zug [S].
- **Risiko:** gering im Host (vorhandener Weg). Offen ist nur die Modellwirkung: ob der Erzähler die Markierung gegen eine widersprechende Spielernachricht befolgt [P].

**N3 – automatische Neuerzeugung:** **nicht empfohlen.**
- **Datenlage:** Mit N1 und N4 liegt die Wiederholung (K7) ohnehin an der Wurzel an. In den Daten beginnt der Erzähler schon heute am richtigen Ort (#112).
- **Kosten:** N3 bräuchte eine atomare Rücknahme von Teilbuchungen (GPT §5): Zeit, Wissen, `met`, Quests. Dazu eine sichtbare Ersatzantwort und ~10–20 s je Fall.
- **Wann neu prüfen:** nur, wenn nach N1+N4 die Wiederholung im natürlichen Lauf nicht unter eine Antwort fällt.

---

## 4. Vergleich

| Kriterium | C1 | C2 | C3-a | C3-b/c | C4 | C5 (N1, N2, N4) | N3 |
|---|---|---|---|---|---|---|---|
| Fälle `.186`/`.188` (16 ohne GO + 4 Wiederholungen) | K3: 1–2, K4: Antwortgrenze | K4: 1 | 1 (+ Batch 28: 2) | 2 | K3: 1 | K7: 4 (Ziel), Spielerinfo alle | K7 |
| Spielerhoheit | voll | Zusage im Zitat nötig | unverändert (kein neuer Ort) | gefährdet | voll | voll | voll |
| Neue Wortlisten | keine (LLM-Regeln) | keine | keine | Gefahr | **minus** zwei Listen | keine | – |
| Neue Zustände und Bedingungen | ein wirkungsloser Plannertyp `proposed` | 1 Bedingungsart | 1 Firewallbedingung (ersetzt eine) | mehrere | – | Kopf aus vorhandenen Daten | Rücknahmelogik |
| Tokens | +0,1–0,3k Plannerregeln | +wenig | 0 | – | −Regeln, +1 seltene Reparatur | Kopf ~0,2k, N4 ~0,05k je Fall | +1 Erzähler +1 Extractor je Fall |
| Latenz | 0 | 0 | 0 | – | seltene Reparatur ~2–4 s | 0 | +10–20 s je Fall |
| Kanon | nein | §2 Ergänzung | §3 umgesetzt, Bestätigung | §3/§2 | nein | nein | Hostdesign |

**Zentrale Fragen kurz beantwortet:**

| Frage | Antwort |
|---|---|
| Wie viel implizite Bewegung hilft wirklich? | Innerhalb der Stätte (C3-a) spürbar und sicher. Darüber hinaus rettet sie in den Daten 2 Fälle und kostet die Klarheit, die das FINDS-Design bewusst gewählt hat |
| Wann gefährdet sie die Spielerhoheit? | Sobald ein Gegenüber, ein Gesuchtes oder die Zustimmung einer NPC einen Weg ersetzt, den der Spieler nicht gewählt hat |
| Ist ein zusätzlicher Befehl störender als die Erkennung? | Nein, bei rund 1 Zug je 100 Eingaben und klarer Rückmeldung (N2) |
| Wie neue Wortlisten vermeiden? | Bedeutung erkennt der Planner (Regeln mit Beispielen); die Engine prüft nur Wirkung (ein `move`, der niemanden betrifft, geht als Reparatur an den Planner zurück). Die Rückweg-Wortlisten entfallen |
| Wie die Wiederholung verhindern? | N4 nimmt der falschen Szene die Autorität im Verlauf, N1 nennt abwesende Personen, die der Spieler anspricht |
| Wie den Spieler informieren? | Eine sichtbare Zeile „NOT ARRIVED — …“ (heute herausgefiltert) |
| Braucht es automatische Antwortkorrektur? | Nein, nicht vor einer Messung nach N1+N4 und den Fachplänen A/B |
| Was entfällt? | `retreatGo`/`BACK_WAY`/`STAYS`, `wayBack` in `mapPlan`, `within` und seine Ablehnung, `lodgedHere`, verstreute Ortskorrektursätze (in N1 gebündelt) |

---

## 5. Empfehlung

**C1 + C3-a + C4 + C5 (N1, N2, N4).** C2 nur auf deinen Wunsch und nur eng. Kein C3-b/c, kein N3.

**Spielerhoheitsgrenzen:**
1. Eine Bewegung entsteht nur aus Alarics eigenen Worten in dieser Nachricht: Aufbruch, Präsensankündigung, Annahme einer angebotenen Führung (heute 7b), ausdrückliche Mitgehzusage (C2, optional).
2. Fragen, Vorschläge, „later“ und „whenever“ ohne Zusage, Wünsche, die Zustimmung einer NPC und die Absicht eines Gegenübers sind **nie** eine Bewegung.
3. Innerhalb der Stätte darf die Erzählung ihn ohne GO in einen Nebenraum führen, nie hinaus.

**Was überflüssig wird:**

| Heute | Ersatz |
|---|---|
| `retreatGo`, `BACK_WAY`, `STAYS`, `wayBack`-Zweig (`planner.js:741–850`, Teile) | Plannerreparatur bei wirkungslosem `move`, „back“ über `RECENT ROUTE` |
| `within` und `invalid local habitat scope` (`commands.js:630–642`) | GO mit Habitatumfang (Fachplan A) |
| `lodgedHere`, `roomOfHere` (`world.js:121`, `firewall.js:411`) | C3-a als eine Bedingung |
| Stay-Korrektursätze in `world.js` (`.187`), Kürzung auf 400 Zeichen | N1-Kopf |
| Filterregel, die den Spieler blind lässt | N2-Zeile |

**Bleibt unverzichtbar:**
- `no_go` (keine Teleports),
- die Kaskade für Inhalte unerreichter Orte,
- FINDS ohne Mitbewegung,
- Regel 1 (Fragen sind keine Handlung),
- Regel 7b (Annahme einer Führung).

### 5.1 Regressionen

| # | Fall | Erwartung |
|---|---|---|
| R-C1 | `.188` Mage #121 „I'm heading back to the Guild hall“ (Planner-Mock mit Originalnachricht) | `go` zur Gildenhalle |
| R-C2 | Batch-28-Muster „Let's walk the lines“ | `go` + `activity` |
| R-C3 | `.188` Rogue #75 „Shall we go ask him … now, then?“ | **kein** GO; Hinweis `proposed_travel`; Erzählerzeile „ends before anyone sets off“ |
| R-C4 | `.188` Warrior #109 „ready to walk with her … whenever she is“ | ohne C2: kein GO, Hinweis; mit C2: bedingtes GO, wirksam nur bei erzähltem Aufbruch |
| R-C5 | `.188` Rogue #121 Hinterzimmer → Halle (C3-a) | Ankunft ohne GO angenommen |
| R-C6 | Gegenfall C3-a: Ankunft im Nachbarhaus, auf der Straße, im Dungeon | `no_go` |
| R-C7 | `.186` Rogue #97 Händlersuche | FINDS; die Erzählung führt ihn in die Schmiede → `no_go`; N2-Zeile sichtbar |
| R-C8 | `.186` Warrior #117 `move away` gegenüber Goblin A auf LONG (C4) | Planner-Reparatur → `go` zurück; `.186` #113 (SHORT → MEDIUM vor dem Kampf) bleibt Bandschritt; im Kampf bleibt `move` |
| R-C9 | `.187`/`.189`-Rückwegfälle (#117 Original, „holding my ground“, „a single step“) | dasselbe Ergebnis wie `.189`, ohne Wortlisten |
| R-C10 | `.188` Mage #109 lokale Erkundung | GO mit Habitatumfang, keine Ablehnung |
| R-C11 | Warrior #110 → #111/#112 (N1/N4) | Request #112 enthält Kopf und Verlaufsmarkierung; „NOT HERE — Werrin“ |
| R-C12 | Spielerpanel nach `no_go` | sichtbare Zeile „NOT ARRIVED — …“; andere Bücherzeilen bleiben gefiltert |
| R-C13 | PULSE-Straßenhalt, erzwungene Bewegung, Kampfflucht | unverändert |

### 5.2 Messkriterien (kurzer natürlicher Lauf)

| Kennzahl | heute | Ziel |
|---|---|---|
| Ankünfte ohne GO je 100 Eingaben | `.188`: 11 / 210 ≈ 5 | ≤ 2 |
| Wiederholungen derselben unerreichten Szene | 4 | 0–1 |
| Länge einer Widerspruchsepisode | bis 2 Antworten (`.188`), 6 (`.186`) | ≤ 1 |
| Planner-Reparaturen wegen `move` | – | gering (Zahl melden) |
| Spieler erfährt die Nicht-Ankunft | nein (menschlich) | ja |

---

## 6. Prüfung: ergeben A, B und C zusammen eine zu komplexe Lösung?

**Ein Bewegungsobjekt für alle drei Pläne:** der Bewegungsnachweis aus A, ein ausgebautes `auth.gos`.
- **B** füllt `target` und `enter` im Dungeon.
- **C** füllt `when` (C2, optional) und bezieht `WHERE`/`NOT HERE` daraus.
- Es entsteht **kein** zweites Planobjekt und keine zweite Prüfstelle.

**Eine Antwortform für die Ankunft:** die A4-Schrittantwort.
- Dungeon (B): Ankunft im erzeugten Teil.
- Begleitung (C2): „departed with …“.
- PULSE-Halt: „road“.

**Eine Topologieautorität:** außerhalb echter Dungeons keine (B5-Verzicht); im Dungeon die Teilerzeugung aus B6. C3-a braucht nur `complexOf`.

**Kein Teil verlangt eine neue Ortsart, ein neues Eventformat für den Fold oder einen weiteren Modellaufruf.**

**Komplexität:** Sie steigt an keiner Stelle, solange die in A, B und C gelisteten Altpfade nach den Schattenmodi entfernt werden. Ohne diese Entfernung wäre jede der drei Lösungen eine zusätzliche Schicht. Deshalb ist das Entfernen eine Abnahmebedingung, keine Option.

---

## 7. Spielqualität gegenüber Technik

| Verzicht | Verlust | Gewinn |
|---|---|---|
| Keine Teilbewegung zu Händlern, Gesuchtem, Gegenübern | ein Satz mehr („I go to her shop“) | keine stillen Reisen, klare Spielerhoheit, Engine-Ankündigung FINDS bleibt glaubwürdig |
| Fragen sind keine Reise | ein Zug mehr bei „Shall we go?“ | keine Reise, die der Spieler nur erwogen hat |
| Keine automatische Neuerzeugung | die falsche Antwort bleibt sichtbar (mit N2-Hinweis) | keine Rücknahmelogik, keine verdeckten Doppelbuchungen, keine Wartezeit |
| wirkungsloser `move` als Reparatur statt Wortdeutung | gelegentliche Plannerreparatur | zwei Wortlisten weniger, eine Fehlerklasse weniger |

---

## 8. Gesamtabgleich der Fachpläne A, B und C

### 8.1 Technische Kompatibilität

| Paar | Befund |
|---|---|
| A ↔ B | B6 liefert den Dungeonteil, den A als `target`/`enter` einträgt; A's Auflöser schließt Dungeonräume aus der Namensauflösung aus, weil sie engine-erzeugt sind und nur benannt werden. **Kompatibel** |
| A ↔ C | C4 (`within` entfällt) braucht A's Umfang; C1-b/N1 lesen A's Nachweis; C3-a braucht A's Sicht „bekannt“ nicht. **Kompatibel** |
| B ↔ C | B5-Verzicht (keine Räume außerhalb von Dungeons) und C3-a (Nebenraum ohne GO) passen zusammen: Außerhalb von Dungeons gibt es keine Wege mehr, nur die Stättengrenze. **Kompatibel** |

**Revision gegenüber Etappe 1:** A4 (Ankunft als Schrittantwort) wird **wichtiger**, weil B und C2 dieselbe Antwortform nutzen. A4 bleibt zweite Stufe, ist aber Voraussetzung für C2. Ohne A4 entfällt C2.

**Revision nach Selbstprüfung:**
- Der Auflöser aus A ist enger als zuerst geplant: nur „beginnt mit“, nicht „enthält“. Sein Beitrag gegen Duplikate ist damit klein. Der größere Hebel bleibt, das Ziel beim GO aufzulösen und in `KNOWN AT` die Kinderorte zu zeigen.
- `move` bleibt in C4 als Bandschritt vor einem Kampf erhalten.
- Die Kompatibilität der drei Pläne ändert sich dadurch nicht.

### 8.2 Doppelte Zuständigkeiten

**Neu entstehende Doppelungen:**
- Der **N1-Kopf** könnte neben den verbleibenden Korrekturtexten stehen. Bedingung: Die Ortskorrekturen gehen **in** N1 auf.
- Der **Bewegungsnachweis** könnte neben `ctx.extra`-Zeilen (`THE WAY`, `KNOWN AT`) stehen. Bedingung: Diese Zeilen werden **aus** dem Nachweis erzeugt.

**Sonst:** keine neue Prüfung oder Zustandsbank.

### 8.3 Tatsächlich entfallende Codepfade (Gesamtliste)

| Quelle | Pfad |
|---|---|
| A | Katalog als Gültigkeitsgrenze (`extract.js:39–44`-Enum aus `catalog.js:411`); Sonderregel `catalog.js:110–112`; Routefilter `planner.js:330`; `scopedPlaces` zweimal (`place_refs.js:60–92`, `extract.js:482`, `world.js:241`); Namensteil von `resolvePlace` und `placeIdentity` (vereint); `elsewhere`/`unseen`/`exploring` (`world.js:2455–2475`); Vorprüfung `arrivalPlace` (285–301); Anlegen vor Prüfung; Altpfade `!explicitTravel` (9 Zweige), `implicitArrivals`, `laterLegs` |
| A4 | `arrive`-Delta für GO-Schritte, `arrival_evidence` (`world.js:1717–1720`), `expected`/`arrive`-Abgleich in `sceneIssues`, `TRAVEL CHRONOLOGY` |
| B | `explore` (`commands.js:464`, 625–626, 697); Raum- und Durchgangsmeldungen im Dungeon; `roomByName`; `levelVia` aus Erzählung; 3 von 7 `floorRefusal`-Aufrufen; Linkerzeugung aus dem Gehen im Dungeon; Raumregel außerhalb echter Dungeons |
| C | `retreatGo`, `BACK_WAY`, `STAYS`, `wayBack`; `within` mit Ablehnung; `lodgedHere`/`roomOfHere`; verstreute Ortskorrektursätze |

**Gesamtbilanz [S]:**
- **Entfällt:** etwa 400–650 Zeilen Logik und 3–4k Zeichen Extractor-Vertrag.
- **Kommt hinzu:** etwa 200–340 Zeilen (Auflöser, Nachweis, Teilerzeugung, Kopf, Verlaufsmarkierung).
- **Ergebnis:** **netto 200–300 Zeilen weniger**, vor allem aber **eine** statt vier Stellen für Ziel, Ebene und Weg. Die Zahlen sind Schätzungen aus den genannten Bereichen, keine gezählten Diffs.

### 8.4 Reihenfolge

| Schritt | Inhalt | Abhängigkeit | Designentscheidung |
|---|---|---|---|
| 1 | Messwerkzeug Ortsvorfälle (A-S0) | – | – |
| 2 | **N2** sichtbarer Spielerhinweis | – | – |
| 3 | Ortsbuch und Auflöser (A-S1) | 1 | – |
| 4 | B1-Sofortfix und B5-Verzicht (B-S1, B-S2) | 3 | Bestätigung B5-Verzicht |
| 5 | Bewegungsnachweis im Schattenmodus, Umschalten, Altpfade löschen (A-S2/S3) | 3, 4 | – |
| 6 | N1 und N4, C1-a/b, C4 | 5 (Kopf aus Nachweis) | – |
| 7 | C3-a | 4, 5 | Bestätigung §3 |
| 8 | B6 (B-S3) | 5 | **D1** |
| 9 | A4 (A-S4) | 5 | Kanon §2-Wortlaut |
| 10 | C2 (optional) | 9 | **D2 eng** |

**Sichere Zwischenstände:** Nach jedem Schritt ist die Engine voll funktionsfähig. Die Schritte 2–7 brauchen keine neue Spielregel.

### 8.5 Risiken und Pflichtproben vor einem Umbau

**Pflichtproben (Originale):**
- A: R-A1–R-A6 (Rogue #80/#82, `.186` Mage #63/#64, Warrior #122, Rogue #98)
- B: R-B1–R-B6 (`.188` Mage, `.186` Mage, Rogue #62, Mossback-Abstieg, Catacombs-Siegel, Glimmerdeep „down“)
- C: R-C1–R-C11

**Sicherheitsproben (dürfen sich nicht ändern):**
- R-A7–R-A18 (Mehrdeutigkeit, Verborgenes, `no_go`, PULSE-Halt, erzwungene Bewegung, Gilde, Gate, Habitatcredit, Begleiter, `met`, Swipe)
- R-B7–R-B14 (Falle am Rückweg, Seitenkammer, Reset, Parteien, Swipe, erzählter Raum, Begleiter, Wachturm)
- R-C6, R-C7, R-C13

**Weitere Pflichten:**
- **Replay:** jede Abweichung einzeln begründet.
- **ST-Smoke:** isoliert bei Host-, Vertrags- und Panel-Änderungen (N2, N4, A4).
- **Hauptrisiken:**
  - Kopfwortauflösung legt falsch zusammen (A),
  - Migration laufender Dungeons (B),
  - Modellfolgsamkeit bei N1/N4 und C1-b (C).

### 8.6 Erwartete messbare Verbesserungen

| Kennzahl | heute (`.186`/`.188`) | Erwartung | Beleg durch |
|---|---|---|---|
| Ankünfte, die die Engine nach eigener Autorisierung ablehnt | 10 (je nach Lesart 7–10; GPT §4.1) | 0 bei Ziel-, Ebenen- und Raumgründen | Regressionen, Replay, natürlicher Dungeonlauf |
| Verwaiste Orte, doppelte Orte und NPCs | 6 / 1 / 1 | verwaist 0; Duplikate 0 für die Originalfälle, allgemein weniger [P]: Die enge Präfixregel aus Fachplan A trifft in 65 natürlichen GOs genau einen Fall; Duplikate mit ganz anderem Namen bleiben möglich | Messwerkzeug über natürliche Läufe |
| Ankünfte ohne GO je 100 Eingaben | ≈ 4–5 | ≤ 2 [P] | natürlicher Lauf |
| Wiederholte unerreichte Szenen | 4 | 0–1 [P] | natürlicher Lauf |
| Ortsbezogene Extractor-Reparaturen | 16 von 24 (FOCUS `.188`) | etwa halbiert [S] | Budgetwerkzeug |
| Tokens je Spielzug | – | ±2 % [S] | Budgetwerkzeug |
| Latenz je Spielzug | – | unverändert | p50/p95 |

**Nicht erwartet:**
- deutlich weniger Tokens,
- weniger Modellaufrufe,
- weniger `scene_context` als Ziel an sich (die Kaskade bleibt richtig).

### 8.7 Erforderliche Kanon- und Spielerentscheidungen

| # | Entscheidung | Empfehlung |
|---|---|---|
| **D1** | Living Dungeons: Die Engine erzeugt Teile, Ausgänge und Ebenen beim Betreten (B6); der Erzähler beschreibt und benennt | ja |
| **D1a** | Seitenkammer-Chance (Designzahl) | 25–35 %, ein Drittel davon verborgen (Vorschlag) |
| **D1b** | Raum-für-Raum-Navigation nur in echten Living Dungeons (B5-Verzicht) | ja |
| **D2** | Ausdrückliche Mitgehzusage als bedingte Bewegung (C2) | optional, nur so eng |
| **D3** | Teilbewegung innerhalb derselben Stätte ohne GO (C3-a); nicht zu Gegenübern oder Gesuchtem | ja (Stufe a), nein (b/c) |
| **D4** | Kanon §2: „bestätigte Ankunftsantwort des autorisierten Schritts“ statt „`arrive`-Delta“ (A4) | ja, Semantik unverändert |
| **D5** | Automatische Antwortneuerzeugung | nein (erst nach Messung neu prüfen) |
| **D6** | Ankunft vor der Erzählung, Innenräume abschaffen | nein |

### 8.8 Umsetzungswürdigkeit

**Ja, gestuft.**
- **Schritte 1–7** bringen ohne neue Spielregel den größten Teil des Nutzens:
  - Ortsbuch,
  - Sofortfix im Dungeon,
  - Spielerhinweis,
  - Bewegungsnachweis,
  - Ortskopf und Verlaufsmarkierung.
  
  Sie zielen auf belegte Fehlerklassen: Ziel und Identität, Selbstwidersprüche, Wiederholung, blinde Spieler.
- **Die großen Schritte B6 und A4** lohnen sich nur, wenn die kleinen Stufen gemessen haben, dass die verbleibenden Fälle dort liegen. B6 ist zusätzlich durch beide Mage-Expeditionen gut begründet.

**Nicht umbauen:**
- Ankunft vor der Erzählung,
- Abschaffen der Innenräume,
- automatische Neuerzeugung,
- Teilbewegung zu Händlern, Gesuchtem oder Gegenübern,
- Slots, Pace, Gate und Reset der Dungeons,
- PULSE,
- die Kaskade für unerreichte Inhalte.

**Grenze der Aussage:** Alle Wirkungen hinter „[P]“ und „[S]“ hängen an der Modellfolgsamkeit und an zwei natürlichen Batches. Ein kurzer natürlicher Lauf nach Schritt 6 ist die nächste belastbare Messung, vor jeder großen Stufe.
