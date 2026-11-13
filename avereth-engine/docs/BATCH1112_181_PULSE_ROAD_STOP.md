# .181 — Von PULSE angeordneter Reisehalt ist ein mechanischer Halt

**Basis:** `.180` (`c45a134`).

**Grundlage:** [Review des NPC-/PULSE-Dreierbatches 12./13.11.2026](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261112-220625Z/REVIEW.md) auf `main`:
- GPT §§3–4;
- Fable §8.3 H und §8.4 P2-2;
- GPT §9.3 mit der Freigabe der engen Ausnahme.

**Abgrenzung:**
- Geändert ist nur `src/v4/world.js` (`applyWorld`).
- Unverändert bleiben:
  - PULSE-Wahrscheinlichkeiten, -Arten und -Texte;
  - Extractor-Vertrag `content/deltas.json` (keine neue Vertragsversion);
  - `scene_context`, `met` und Firewall;
  - Quest-, Populations-, Dungeon-, NPC-, Registrierungs- und Planner-Code.
- Der historische Ruleset-1-Transit (`!explicitTravel`) ist unverändert.
- Records, Events und Spielstände behalten ihre Form; eine Migration ist nicht nötig.

## 1. Ursache

**Halt ohne Ort:** PULSE entscheidet im Spielerzug über das eine Ereignisfenster. Ist es auf einer autorisierten Reiseetappe offen (`auth.pulse.exposure = 'travel'`, `open = true`), lautet die Erzählerzeile aus `pulse.js` `lineFor`: „It is a real stop short of <Ziel>“. Die Engine weiß also vor der Erzählung, dass Alaric unterwegs anhält, bucht dafür aber keinen Ort.

**Abgeschalteter Transit:** Seit `.101` bewegt eine Ruleset-2-Antwort den Spieler nur über ein explizites `arrive`. Der frühere Transitblock ist dort durch `!explicitTravel` abgeschaltet, ausdrücklich damit fehlende Ankunft, `expected` oder Reisezeit niemanden bewegen.

**Was der Extractor tut:** Der Extractor-Vertrag erlaubt für einen Halt unterwegs „report no arrive (or the realm's id …)“. Ohne `arrive` blieb Alaric am Abreiseort. Lokale Meldungen mit `scene: here` entstanden dann dort: Hunde, Anführer und Reisende landeten in der Gildenhalle.

**Originalfälle:**

| Fall | Fenster | Folge in `.180` |
|---|---|---|
| Rogue T32 | `meeting` auf der Etappe | Person am Abreiseort |
| Rogue T36 | `danger` auf der Etappe | zwei Hunde in der Alderwatch-Gildenhalle; später Kill ohne Credit, „already here“ |
| Mage T44 | `danger` auf dem Weg zu den Mossback Warrens | Anführer in der Ashbridge-Gildenhalle; der Planner liest danach „HERE is the Guild hall“ |
| Warrior T27 | Extractor meldet den Zwischenort „Alder dip …“ | korrekt, Gegenfall |

**Prüfung des alten Transits:** Der historische Block taugt für Ruleset 2 nicht unverändert:
- Er bewegt nach erzählter Reisezeit (`roadMinutes`), nicht nach der PULSE-Entscheidung.
- Er kennt auch Bewegungen innerhalb einer Siedlung, sobald genug Minuten vergangen sind.
- Er zieht Begleiter aus `expected.with` ohne die Prüfung, die `companions()` bei einem expliziten `arrive` vornimmt.

Wiederverwendet sind deshalb nur seine Bausteine: Zielort Reich, `arrive()`, Begleiter, Marke `transit` und Anzeige „On the way to …“. Die Bedingung ist neu und eng.

## 2. Korrektur (`src/v4/world.js`)

**Bedingungen (alle müssen gelten):**
- Ruleset-2-C-Pfad (`explicitTravel`);
- das PULSE-Fenster des Zugs ist offen und gehört zu einer Reiseetappe;
- mindestens ein autorisiertes `go`;
- die Antwort enthält **kein** `arrive`, auch kein abgelehntes;
- kein `go` meldet `arrived = true`;
- kein Kampf;
- Alaric steht noch am Abreiseort;
- das Reich des Abreiseorts (`realmOf`) existiert, ist nicht der Abreiseort selbst und ist nicht Ziel eines `go`.

**Ort:** Ziel des Halts ist die Reichsstraße. Ein expliziter Extractor-Bericht würde für „draußen unterwegs“ denselben vorhandenen Ort nennen. Es entsteht kein neuer Ort und kein Wegpunkt.

**Zeitpunkt in Erzählreihenfolge:**
- Lokale Meldungen, die die Antwort **ausdrücklich** an den Abreiseort legt (`scene` = Abreiseort), geschehen vor dem Aufbruch und werden dort gebucht.
- Vor der ersten anderen lokalen Meldung (`here`, `null` oder ein anderer Ort) bucht die Engine den Halt.
- Gibt es keine solche Meldung, wird der Halt nach den Deltas gebucht, vor der Auswertung von `expected` und den Abgabe- und Lieferprüfungen.

**Buchung:**
- `arrive(Reich, party)`, wie ein explizites `arrive` es täte:
  - Begleiter über `companions()`: Reise-Schützling (`along`) und die von `expected.<seq>.with` genannten, anwesenden Personen; unbekannte Namen werden sichtbar abgelehnt.
  - Wer zurückbleibt, behält den Abreiseort (`entity.at` bzw. `left`).
- Danach die Anzeige `scene.moved {place: "On the way to <Ziel>"}`. Erzähler- und Plannerkontext zeigen daraufhin „Duskreach — On the way to Mossback Warrens“, der Planner-Katalog `here: Duskreach`.
- `transit` wird gesetzt. Damit gibt es am Halt keine Ankunft beim Ziel, keine Reisezeit-Untergrenze, keinen erreichten Intent, keine Lieferung, Übergabe oder Gildenabgabe und keine Schleich-Ankunftsprüfung.

**Warum das die `.101`-Entscheidung respektiert:** Ein fehlendes `arrive`, `expected`, `scene` oder vergangene Zeit bewegen weiterhin niemanden. Bewegt wird nur, wenn die Engine selbst den Halt angeordnet hat. Belege dafür sind das autorisierte `go` und das gebuchte offene PULSE-Reisefenster aus `auth.pulse` des Spielerzugs, nicht der Text der Antwort. Ein gemeldetes `arrive` hat immer Vorrang.

**Unverändert, weil an die bestehende Autorität gebunden:**
- **Populationen:** `populationAt` und die Package-C-Prüfung lesen den Ort zum Zeitpunkt der Meldung. Am Halt im Reich gehört eine Kreatur also nicht zum Habitat.
- **Jagdcredit:** zählt erst nach der Ankunft im Habitat.
- **Dungeonzugang** und Gate: unverändert.
- **Weiterreise:** Vom Halt aus ist `go` zum Ziel oder zurück zur Halle normal autorisiert; in `.180` stand da „already here“.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `tests/v4/fix181_pulse_road_stop.test.js`: **13/13** |
| Rot gegen `.180` | **9 von 13 rot** (nur `world.js` auf `.180`, Tests unverändert): Mage T44 samt Weiterreise und Rückweg, Rogue T36 (Hunde; Tomcat am Halt kein Habitatmitglied, im Habitat Mitglied), Rogue T32 (Reisender unterwegs und dort zurückgelassen), Begleiter und Zurückbleibende, kein zweiter Halt bei gehaltenen Gegnern, Positivgrenze, Erzählreihenfolge |
| Reine Gegenfälle, auf beiden Ständen grün | geschlossenes Fenster · Warrior T27 (gemeldeter Zwischenort gewinnt, genau eine Bewegung, kein Label) · Grenzen ohne Bewegung: kein `go`, geschlossenes, Szenen- oder Pausenfenster, keine PULSE-Entscheidung, Reich als Ziel, Start schon auf der Straße · gemeldete Ankunft: `arrive` bewegt wie gemeldet; `arrived:true` ohne `arrive` wird abgelehnt (`arrival_evidence`) und bucht keinen Halt; ein gemeldetes, abgelehntes `arrive` erzeugt keinen Halt daneben |
| Hostpfad Mage T44 | Ein `pulse.rolled` im Spielerzug, keines in der Antwort. Eine Bewegung vor `entity.created`. Zeit nur „180 narration“, keine Reise-Untergrenze. Erinnerung „first saw {pc} at On the way to Mossback Warrens“. `foldChat` ergibt denselben Zustand, `validateState` meldet keine Probleme. |
| Erzählreihenfolge | Fixture Run 22 (Alderwatch → Glassmere; der **eigene** Zug öffnet „strange“): Ein Geschenk mit `scene` = Abreiseort wird an der Halle gebucht, der Halt folgt danach. Dasselbe Geschenk als `here` findet unterwegs statt; die zurückgelassene Schreiberin übergibt nichts. |
| Geänderter Bestandstest | `patch_batch101_world` „elapsed travel time alone does not move …“: Dessen Fixture zieht selbst ein offenes Reisefenster, wodurch der Fall unter die neue Regel fiel. Der Test prüft jetzt `.101` („Zeit allein bewegt nicht“) mit erzwungen geschlossenem Fenster; die Variante mit offenem Fenster steht in `fix181`. Der Test ist auf `.180` und `.181` grün. Sonst ist kein Bestandstest geändert. |
| Angrenzende Suites | `pulse_*`, `patch5`, `patch2`, `patch7`, `patch8*`, `patch_batch101_*`, `c132_population`, `npc_e*`, `fix158_continuity`, `patch10b_run9`, `patch_guild*`, `patch_f_progression`, `fix180`, `fix181`: **505/505** |
| `npm test` | **3085/3085** (`.180`: 3072) |
| Replay gegen `.180` | **2235 Fälle, 0 geändert** (Baseline aus `c45a134` geschrieben) |
| Voller Korpuscheck | 1057 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet |
| ST1.19 Standard/Failsoft | **nicht ausgeführt:** keine isolierte SillyTavern-Installation in der Umgebung; die Installation der ST-Abhängigkeiten wurde in Patch 1 von der Berechtigungsprüfung abgelehnt und nicht erneut versucht. `run_c.mjs` lief nicht, auch nicht gegen Benutzerdaten. **Der Smoke steht vor einer Freigabe aus.** |

**Aussagekraft des Replays:**
- Der Korpus (b16–b19) stammt von vor PULSE (`.162`). Keines der 1053 Original-Outcomes enthält `auth.pulse`, und Antworten laufen im Replay auf dem originalen Chatstand. Der neue Pfad ist dort also unerreichbar; „0 geändert“ belegt nur, dass sich an anderer Stelle nichts verschiebt.
- Ergänzend ausgewertet: Bei der Neuberechnung öffnen sich im Korpus 37 Reisefenster. Alle 37 aufgezeichneten Folgeextraktionen melden ein explizites `arrive`, auch verkettet würde der Halt dort also nie greifen. Diese Antworten entstanden allerdings ohne die PULSE-Erzählerzeile.
- Im Dreierbatch mit PULSE-Zeile hatten 3 von 4 unterbrechenden Reisefenstern kein `arrive` (Fable §8.2).

**Nachweisgrenze:**
- Die Original-ZIP liegt nicht im Repository (`SOURCE_MANIFEST.md`). Die Fälle sind nach den Angaben des Reviews nachgebaut: `go`, Fensterart, `expected.1.arrived=false`, kein `arrive`, `scene: here`, Personen bzw. Kreaturen.
- Mage T44 und T32 nutzen vorhandene Inhaltsorte (Ashbridge-Gildenhalle, Mossback Warrens, Alderwatch, Ashbridge).
- Das Habitat „Millbrook allotments“ und der Tomcat-Vertrag sind für T36 als Zustand angelegt.
- PULSE ist über `rules.pulse.force` (nur Tests) offen bzw. geschlossen gesetzt. Nur das Run-22-Fixture nutzt seinen natürlichen Zug.

## 4. Grenzen und Auswirkungen auf natürliche Läufe

**Ort des Halts:**
- Der Halt ist immer die Reichsstraße des Abreiseorts, nicht ein genauer Wegpunkt. Bei Reisen in ein anderes Reich (Alderwatch → Ashbridge) steht Alaric auf der Straße seines Ausgangsreichs, wie beim alten Transit.
- Meldet der Extractor einen echten Zwischenort, gewinnt dieser (Warrior T27).

**Gesperrte oder fehlende Meldungen:**
- Ist ein `arrive` gemeldet, aber abgelehnt, bucht die Engine keinen Halt. Es gilt die bestehende `scene_context`-Sperre für Folgemeldungen (unverändert).
- Legt der Extractor Meldungen ausdrücklich an den Abreiseort, obwohl die Erzählung sie unterwegs zeigt, entstehen sie dort. Alaric endet danach trotzdem auf der Straße und lässt sie zurück.
- Meldungen, die ausdrücklich das **Ziel** als Szene nennen (die Männer „an den Warrens“), werden wie bisher als `scene_context` abgelehnt, weil Alaric dort nicht ist.

**Kein Halt:**
- **Ohne offenes PULSE-Reisefenster** gilt `.101` unverändert: Die Antwort ohne `arrive` lässt ihn am Abreiseort, auch wenn die Erzählung ihn unterwegs zeigt.
- **Nach einem Kampf** am Abreiseort in derselben Antwort bucht die Engine keinen Halt (kein Ortswechsel während eines Kampfes).

**Was erst natürlich messbar ist:**
- Ob der Planner vom Halt aus selbständig weiterreist (Mage T48), ist erst im nächsten natürlichen Lauf messbar. Katalog und Kontext zeigen jetzt den Straßenort und „On the way to …“.
- **Reisezeit:** Nur die erzählte Zeit wird gebucht. Erzählt die Antwort keine Zeit, vergeht für die Teilstrecke keine (keine Untergrenze am Halt, wie beim alten Transit).

**Spielwirkung:**
- Jagden, Begegnungen und Gespräche aus offenen Reisefenstern finden mechanisch unterwegs statt.
- Ein Vertragskill zählt erst nach einem weiteren `go` ins Habitat.
- Die Folgeschleifen aus dem Batch sollten entfallen: Rogue T41–T69 (Beweisbürokratie) und Mage T45–T48.
