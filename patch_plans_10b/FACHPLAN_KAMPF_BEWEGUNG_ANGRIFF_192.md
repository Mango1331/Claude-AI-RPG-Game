# Kleiner Kampffachplan – Angriff mit Annäherung, Konter- und Lauerangriffe

**Stand 15.11.2026 · Entscheidungsvorlage, keine Umsetzung.**

**Anlass:**
- [Opus-Gegenreview `.191`](../testrun_10b/archiv/npc-20261115-103140Z/GEGENREVIEW_OPUS.md), Befund P2-d.
- [GPT-Gegenbewertung](../testrun_10b/archiv/npc-20261115-103140Z/GEGENBEWERTUNG_GPT_ZU_OPUS.md), Abschnitt 7.
- Geprüft im Korrekturpaket `.192`. Dort wurde **bewusst nicht** umgesetzt: Die Frage berührt Aktionsökonomie und bedingte Absichten, die der Kanon noch offen hält (Main/Minor ist **[GEPLANT]**).

## 1. Die sieben Originalfälle

Alle Fälle stammen aus dem natürlichen Batch `.191`. Jedes Mal wird die ganze Eingabe als `illegal` verworfen: „… no declared movement brings it into range“.

| Fall | Spielereingabe (gekürzt) | Planner | Distanz | Art |
|---|---|---|---|---|
| W T14 | „I burst from the barn wall and swing Heavy Slash at the wolf's flank while it's coiled to jump“ | nur `use_skill` | SHORT | Angriff ohne angesagte Bewegung („burst“ ist Teil des Angriffs) |
| W T31 | „I hold my ground and swing Heavy Slash at the old boar as it commits“ | nur `use_skill` | SHORT | **Konter/Lauer**: Er will stehen bleiben |
| W T35 | „I finish the wounded boar with another Heavy Slash“ | nur `use_skill` | SHORT | Angriff ohne Bewegung |
| W T43 | „… meeting the wolf's charge with Heavy Slash the moment it comes in range“ | nur `use_skill` | SHORT | **Konter/Lauer** |
| R T16 | „… hold still in the willow's shade, letting it commit … then I strike with Razor Cut the moment it's clear of the water“ | nur `use_skill` | SHORT | **Konter/Lauer** |
| W T64 | „I close the thirty paces quickly and strike Goblin Lookout A with Heavy Slash before they notice me“ | `move closer` + `use_skill` | LONG | Annäherung über zwei Bänder plus Angriff, **bedingt** („before they notice me“) |
| W T65 | „I rush the thirty paces toward the goblins and engage Goblin Lookout A, then strike it with Heavy Slash“ | `move closer` + `use_skill` | LONG | Annäherung über zwei Bänder plus Angriff |

## 2. Wie die Engine heute rechnet

- `combat.js` (Reichweitenprüfung, ca. Z. 458–481) macht die angesagte Annäherung (`extra.move === 'closer'`) zum **Teil der Angriffsaktion**: höchstens ein Band, bei Skills mit Extraband eines mehr.
- Die Bewegung wird **nur zusammen mit einem zulässigen Angriff** gebucht („movement is committed below together with the otherwise legal action“).
- Reicht ein Band nicht (LONG → MEDIUM, der Angriff braucht ENGAGED), verwirft die Engine die ganze Aktion, also auch die Bewegung.
- Eine reine Bewegung ohne Angriff (W T66, „I move up to ENGAGED range“) bucht genau ein Band (LONG → MEDIUM).
- Die Meldung „no declared movement brings it into range“ ist bei W T64/T65 irreführend: Bewegung wurde angesagt, aber ein Band reicht nicht.

## 3. Warum nicht einfach den Bewegungsteil buchen

1. **Aktionsökonomie:** Im laufenden Kampf ist Annäherung plus Angriff *eine* Aktion. Eine reine Bewegung kostet den Zug, und die Gegner handeln. Ohne Main/Minor würde eine Teilbuchung dem Spieler einen Zug nehmen, den er vielleicht anders genutzt hätte (Fernangriff, Rückzug, Guard).
2. **Bedingte Absicht:** „before they notice me“ (W T64) ist an den Überraschungsschlag gebunden. Eine Annäherung ohne Schlag kann ihn verraten (Wahrnehmung, Stealth-Regeln) und ist so nicht gewählt.
3. **Konter und Lauer** (W T31, T43, R T16): Der Spieler will **nicht** herangehen. Ein Bandschritt wäre eine freiwillige Bewegung, die er ausdrücklich nicht gewählt hat.
4. **Bewegungslimits:** Zwei Bänder in einem Zug gibt es nur mit Extraband-Skills. Ein automatischer Teilfortschritt darf das nicht aushebeln.

## 4. Vorschläge (zur Entscheidung)

- **A – klare offene Entscheidung, sofort möglich, keine Buchung:**
  - Ist ein Angriff nur wegen der Reichweite unzulässig, zeigt die Karte eine OPEN DECISION: „Goblin Lookout A is two bands away (LONG). One move closes one band (→ MEDIUM); Heavy Slash needs ENGAGED. Move closer this turn, or choose another action.“
  - Die Meldung unterscheidet „keine Bewegung angesagt“ von „angesagte Bewegung reicht nicht“.
  - Kein Zug wird verbraucht, die Spielerhoheit bleibt.
  - Kosten: Text in `combat.js`/Karte; Replay-Fingerprints der betroffenen `illegal`-Fälle neu begründen.
- **B – Teilbewegung außerhalb eines Kampfes:**
  - Ist noch kein Kampf eröffnet (W T64/T65: Goblins ahnungslos) und hat der Planner ein **eigenes** `move` geliefert, wird der Bandschritt gebucht, der Angriff nicht.
  - Nur ohne bedingte Formulierung (`before …`, `if …`, `the moment …`, `while still unaware`) und mit unveränderter Wahrnehmungsprüfung am neuen Band.
  - Offene Frage: ob das Annähern selbst entdeckt wird.
- **C – Konter- und Lauerangriff:**
  - Ein eigener Fachpunkt („readied action“): Er wartet, und kommt das Ziel in Reichweite, schlägt er zu.
  - Das braucht die Initiative-/Reaktionsregeln des Kampfs und gehört zu Main/Minor. Nicht vorziehen.
- **D – im Kampf:** Teilbewegung erst mit Main/Minor (normale Ein-Band-Bewegung als Nebenaktion). Bis dahin nur A.

**Empfehlung:** Zuerst A, danach B als eigener kleiner Patch mit Negativproben (bedingte Formulierung, laufender Kampf, Stealth-Ansatz, Extraband-Skills, NPC-Parität). C und D erst mit dem Main/Minor-Fachplan.

## 5. Regressionsfälle für eine spätere Umsetzung

Aus `tests/replay/corpus191` (Produktbranch):
- **W #127/#129 (T64/T65):** A zeigt eine offene Entscheidung, kein Zug, keine Buchung. B: Bandschritt LONG → MEDIUM bei #129 („rush … then strike“); keiner bei #127 („before they notice me“).
- **W #61/#69 (T31/T35) und R #31 (T16):** Kein Bandschritt (keine Bewegung gewählt oder Konter).
- **W #29 (T15):** „sprint the ten strides … and swing“ (SHORT → ENGAGED) bleibt eine Aktion mit Treffer, unverändert.
