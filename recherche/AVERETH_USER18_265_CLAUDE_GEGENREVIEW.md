# Avereth .265 · User18 – unabhängiger Claude-Gegenreview

Stand 28.11.2026.
- **Geprüft:** Produkt `4.3.0-c.6.6.265`, Commit [`9dde24a5`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89), Narrator-Card .211, GLM-5.3-Flash.
- **GPT-Reviews:** [REVIEW](../testrun_10b/user-20261128-163231-265/REVIEW.md), [REVIEW_02](../testrun_10b/user-20261128-163231-265/REVIEW_02.md), [REVIEW_03](../testrun_10b/user-20261128-163231-265/REVIEW_03.md).
- **Rahmen:** keine Produktänderung, kein Providerrequest. Alle Proben liefen offline mit den archivierten Modellantworten. Skripte und Analyse-Diffs: [claude_user18_265/](claude_user18_265/).

## 1. Gesamtbewertung

Der Run zeigt keine breite Instabilität. Er zeigt **drei klar abgegrenzte Engine-Fehler, die gewöhnliches Spiel blockieren**. Alle drei sind klein zu beheben, und für alle drei habe ich die Behebung offline nachgewiesen:

1. **Sichtbare Outdoor-Gegner werden verworfen** (T10).
   - Ein einziges optionales Feld (`across`) schaltet jede Kreaturenmeldung in den Dungeon-Schwellenpfad, auch weit weg von jedem Dungeon.
   - Der Fehler besteht seit .222. Er trat schon in der eigenen .263-Modellserie auf, unbemerkt.
   - **Spielstopper** für jede Jagd, bei der das Modell das Feld füllt.
2. **Gespräch wird blockiert, sobald ein einziger Partyschritt nicht gebucht werden kann** (M23, M29, M32).
   - Die Clarify-Regel aus Patch 3 behandelt Gespräch als „nichts“. Bleibt nur der unbuchbare Partyschritt, wird der ganze Zug verworfen, ohne Erzählung.
3. **Freie Einladungen funktionieren nur einzeln und ohne HUD-Begleitauswahl** (M15).
   - Der Rekrutierungspfad ist an drei unnötige Bedingungen gebunden.
   - Sonst landet die Einladung in einem Zweig, der Einladungen gar nicht kennt.

Daneben gibt es drei mittlere Befunde:
- Der Narratorkontext verliert Party und Anwesende, während der Gildenblock immer mitläuft.
- Eine gescheiterte Plannereingabe bleibt im Narratorverlauf stehen.
- Die Sprecherzuordnung bei NPC-Entscheidungen scheitert an Erwähnungen anderer Personen im Absatz.

Ein reiner Effizienzbefund betrifft das Board: Der Repair (52,7 s) ist nachweislich ohne Nutzen.

**Gut und unverändert lassen:**
- Reise mit Gefährten: beide reisen mit, die Zeiten sind plausibel, der Questort hat die exakte ID.
- Registrierung und Zahlung.
- Native `#party invite` mit eigener NPC-Entscheidung.
- Ausrüstung und Werte der Gefährten.
- Populationsbindung.
- Die Standard-Gleichteilung.
- Die Verwerfung erfundener Gildenbeträge (`guild_canon`).

**Fortsetzung des persönlichen Spielstands:** möglich, ohne Neustart, nach dem Patch und mit einem kleinen Bedienschritt (§9).

## 2. Quellen und Reproduktion

| Original (Upload 3) | Bytes | SHA-256 | Archiv |
|---|---:|---|---|
| Chat-JSONL | 475.814 | `4f40aa45…170c` | `originals/chat.jsonl.gz`, identisch |
| Eventexport | 112.950 | `d238f4fd…6444` | `originals/avereth-events.json.gz`, identisch |
| ST-Log UTF-16LE | 4.275.492 | `de51e98e…e1b2` | `originals/st-log.txt.gz`, ein Benutzername redigiert |

- **Prüfsummen:** Alle drei SHA-256 stimmen mit REVIEW_03 überein.
- **Frühere ST-Logs:** Die beiden früheren Uploads (2.334.670 und 3.517.992 Bytes) sind **byteidentische Präfixe** des finalen Logs. Ihre Manifest-Hashes habe ich am Präfix nachgerechnet.
- **Frühere Chats und Exporte:** Sie sind keine Byte-Präfixe, sondern neu serialisiert. Ihre Hashes bleiben in den Manifesten, inhaltlich sind sie im finalen Stand enthalten. Archiviert ist deshalb nur der finale Kampagnenstand, ohne doppelte Speicherung.

**Zuordnung:** Alle **37 physischen Requests** sind den Nachrichten zugeordnet ([st_answers18.py](claude_user18_265/st_answers18.py)). Die Erzählungen sind textgleich, die Prompttokens stimmen. M30 ist kein eigener Request: Es ist derselbe gespeicherte Record wie M29 (gleicher Eingabehash).

**Treue Reproduktion** ([replay_chat.mjs](claude_user18_265/replay_chat.mjs)):
- Die echte Runtime `9dde24a5` verarbeitet alle **27 Engineschritte** mit den Originalantworten.
- **27/27 sind eventgleich.** Bei M17/M19 weichen allein die Einladungs-IDs ab. Diese hashen den gesamten gespeicherten Chat einschließlich Messzeiten, deshalb übernimmt der Replay nur die ID aus dem aktuellen Request. Die NPC-Entscheidung bleibt die archivierte.
- Der Endzustand ist identisch: Mühlteich, beide Gefährten, Müller anwesend, **keine Echsen**.

Kennzeichnung im Bericht:
- **[R]** Reproduktion mit Originalantworten
- **[K]** kontrollierte Änderung einer Antwort
- **[E]** experimentelle Analyseänderung, hinter `U18_FIX=1`, nicht im Produkt
- **[S]** statisch aus dem Code
- Kein Befund beruht auf einem neuen Modellaufruf.

## 3. Befunde nach Bedeutung

### B1 · Sichtbare Outdoor-Gegner werden verworfen (kritisch, Datenintegrität und Spielbarkeit)

**Ablauf T10/M28 [R]:**
- Ankunft am Mühlteich ist gebucht, beide Gefährten reisen mit, 40 + 20 min.
- X meldet zwei `creature.new`: drei Echsen und eine vernarbte Echse. Dazu korrekte Population, `life_stage`, `band`, Anker `aquatic` und je einen Text im Feld `across`.
- Beide Meldungen werden mit `dungeon_sight` abgelehnt, null Gegner angelegt.

**Ursache [S]:** [world.js:1523–1552](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/v4/world.js#L1523-L1552).
- `if (d.across == null)` ist der **alleinige Schalter**. Jede Meldung mit `across` geht in den Schwellenpfad.
- Dort wird `root = trueDungeonOf(scene) || scene.approaching` gebildet. Am Teich ist das `null`, also gibt es weder Dungeon noch Slot, und die Ablehnung ist zwingend.
- Das Feld steht im Schema jeder Kreaturenmeldung (`across: string|null`). Erklärt wird es nur in einer Dungeonregel ([deltas.json:17](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/content/deltas.json#L17)).
- GLM füllt optionale Felder gern beschreibend aus („lizards basking on the flat stones…“).

**Seit wann:** seit .222 ([0696b766](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0696b7665752755f66ef825c269254d099a92e9a), 27.11., „Bind visible entrance opponents to the living dungeon encounter“). Vorher gab es das Feld nicht.

**Wer ist noch betroffen** ([scan_across.py](claude_user18_265/scan_across.py) über alle Archive auf main):
- 27 X-Berichte enthalten `across`.
- Echte Outdoor-Fälle ohne Dungeonbezug gibt es **zwei voneinander unabhängige**:
  - User18, die Echsen.
  - Der **Bär an den Coldwell-Bootshäusern in der .263-E-Rank-Serie**, M36 (Hunt/Pelt/Return/Sale teilen denselben Präfix). Abgelehnt, dazu zwei abhängige Meldungen (`aware`, `position`). Der Bär entstand erst im nächsten, gescripteten Suchzug neu. In der damaligen Auswertung ist das nicht vermerkt.
- Alle übrigen Treffer liegen im Dungeon oder vor dem Mossback-Eingang mit gesetztem `approaching`. Dort ist der Schwellenpfad richtig.
- **Wer ist gefährdet:** jede Jagd, Wildsichtung oder Begegnung im Freien, sobald das Modell `across` füllt. Das ist nicht steuerbar.

**Rot/Grün [R][K][E]:**

| Probe | Ergebnis |
|---|---|
| .265, Original-X | 0 Echsen, 2× `dungeon_sight` (rot) |
| .265, nur `across:null` | 4 Echsen, Population gebunden |
| Analyse-Fix, Original-X | 4 Echsen: L1/L2/L1 und eine Variante `strong` L1. Population `crowans_mill…`, gleiche Positionen, T11 ohne Doppelanlage |
| Analyse-Fix, Coldwell-Bär (.263 M36, gespeicherte X-Antwort) | Bär angelegt, `aware`/`position` angenommen |
| Analyse-Fix, gesamte Produktsuite | 3.667/3.667, darunter alle Dungeon-Schwellen- und Patch-8-Tests |

Der Fix ([fix_across.analysis.diff](claude_user18_265/fix_across.analysis.diff)) ist eine Zeile Bedingung: Den Schwellenpfad gibt es nur, wo eine Living-Dungeon-Schwelle existiert, also innen, am Tor oder bei reserviertem Schwellenslot während `approaching` (`thresholdSlot`). Sonst gilt die normale Kreaturenverarbeitung mit allen Populations-, Range- und Identitätsregeln, und `across` wird ignoriert. Dungeon-Slots, reservierte Begegnungen und Fernsichtungen bleiben unverändert.

**Warum T11 die Tiere nicht nachmeldet [R]:**
- Der Spieler beobachtet nur, also P `commands:[]`.
- Die Erzählung spricht von „the four on the stones“ wie von Bekanntem.
- Der X-Katalog enthält in `PRESENT` nur Dann und Sera. Es gibt weder eine ID noch einen Hinweis, dass die Tiere fehlen.
- X meldet nur, was „diese Antwort etabliert“: den Müller, Fakten und eine Erinnerung.
- Das ist folgerichtiges Modellverhalten auf unvollständigem Zustand, kein zweiter Engine-Fehler.
- Die .263-Serie zeigt den Gegenfall: Dort brachte ein erneuter **Suchzug** den Bären als neue Sichtung.
- **Empfehlung:** keinen Nachmelde-Mechanismus bauen. Die Wurzel in T10 beheben genügt.

### B2 · Gespräch wird blockiert (hoch, Spielfluss)

**Ablauf [R]:**

| Zug | Eingabe | P-Antwort | Ergebnis |
|---|---|---|---|
| M23 | „lets split it 3 ways equally and talk about our tactic …“ | `party offer` an Sera, `share:"half"` (erfunden) | Ganzer Zug: CLARIFY „work and compensation must match“ |
| M29 (= M30) | „*I study the four gnasher lizards …* let me and Sera ambush them and then you hit the ones running dann“ | zwei `coordinate`, `priority:null` | Ganzer Zug: CLARIFY „Quote the tactical request“ |
| M32 | dieselbe Taktik in Anführungszeichen | `coordinate` `priority:"target"`, `target:"the ones running"` (nach P-Repair) | Ganzer Zug: CLARIFY |

**Ursache [S]:**
- [turn.js:85–94](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/v4/turn.js#L85-L94), Patch 3: Gibt es ein Clarify und **keinen weiteren buchbaren Schritt**, wird die ganze Nachricht verworfen. Gespräch und Beobachten erzeugen keinen Schritt, gelten also als „nichts“.
- Dazu kommt die Wortprüfung in [party.js:361–372](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party.js#L361-L372). `target` verlangt eines der Wörter `target|attack|shoot|take on|focus`, „hit“ fehlt. `priority:null` hat gar kein Muster. Und `target` muss eine anwesende ID sein, die es (wegen B1) nicht gab.
- **Fazit:** GPTs Befund „Taktikgespräch blockiert“ ist richtig. Die Ursache liegt aber nicht in der Taktikmechanik, sondern in der allgemeinen Clarify-Regel. Eine Erweiterung der Wortlisten wäre der falsche Hebel.

**Probe [E]** ([fix_talk.analysis.diff](claude_user18_265/fix_talk.analysis.diff)):
- Ein nicht buchbarer `party coordinate/offer` wird zu `TALK — … said as conversation; not a binding party arrangement. Companions answer for themselves; nothing mechanical changes.`
- Mit den archivierten P-Antworten erzählen M23, M29 und M32 dann normal. Es wird kein Angriff und keine Vereinbarung gebucht.
- Die Suite besteht 3.667/3.667. Das zeigt zugleich: **Kein Test deckt diesen Fall ab.**

**M21 (verwandt):**
- Die P-Antwort ist schemawidrig (`coordinate` mit `who:null`), auch nach dem P-Repair.
- Folge: „NOT EXECUTED — planner failed“ nach 51,9 s. Der gültige Teil (Weg zum Osttor) ging mit verloren.
- Auch hier reicht eine Trennung: Ungültige Party-Gesprächsschritte werden verworfen, der Rest wird normal validiert. Einen weiteren Repair braucht es nicht.

**Was die Taktikmechanik tatsächlich bewirkt [S]** (für die Erklärung an den Spieler; GPTs Darstellung ist im Kern korrekt):

| Priorität | Wirkung im Kampf |
|---|---|
| `target` | Gefährte wählt dieses Ziel, solange es angreifbar ist ([party_line.js:54–63](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party_line.js#L54-L63)). Beim Gruppenrückzug verfolgt er es weiter ([combat.js:1109–1116](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/combat.js#L1109-L1116)) |
| `protect` | Greift an, wer den Geschützten zuletzt traf. Bleibt beim Rückzug, solange der Geschützte im Nahkampf steht |
| `independent` | Einzige Wirkung: macht einen Gruppenrückzug nicht mit |
| `front` | Keine eigene Wirkung (Standardposition) |
| `rear` | Startet auf der Gegenseite der gemeinsamen Linie, also weiter von den Gegnern ([party_line.js:5–13](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party_line.js#L5-L13)) |
| `watch` | Nur Kosten: keine Erholung während der Rast ([commands.js:1030](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/v4/commands.js#L1030)). Einen Erkennungs- oder Überfallvorteil habe ich im Code nicht gefunden |
| `rest` | Beendet die Wache |

- **Ablauf:** Eine Spieleranfrage wird zuerst als `request` gespeichert („asked, awaiting reply“). Wirksam wird sie erst, wenn der NPC mit eigenen Worten zustimmt, gemeldet von X und geprüft durch die Sprecherzuordnung (B4).
- **Ohne Taktik:** Autonome Gefährten kämpfen auch ohne jede Absprache. Für das gewünschte „ich greife an, die anderen kämpfen selbst“ ist keine Taktik nötig.

### B3 · Kombinierte Einladung scheitert (hoch, Spielbarkeit)

**Ablauf M15 [R]:**
- HUD-Questannahme mit freiem Text „if you want to team up we can“.
- P liefert `quest.accept` und zwei `party invite`, je mit erfundenem `share:"half"`.
- Die Quest wird aktiv, beide Einladungen enden mit `clarify` „No active membership“.
- In der Erzählung sagt Dann „Team up? Aye“. Die X-Meldung wird verworfen (B4), und es gab ohnehin keine offene Einladung.

**Ursache [S], GPT bestätigt:**
- [runtime.js:451–473](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/v4/runtime.js#L451-L473): Der Rekrutierungspfad mit NPC-Entscheidung läuft nur bei drei Bedingungen gleichzeitig: keine HUD-Eingabe, genau **ein** Partyschritt, sonst nur `go/other`.
- Andernfalls geht die Einladung an `partyDecision` ([party.js:387](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party.js#L387)). Diese Funktion **hat keinen `invite`-Zweig** und fällt in die Prüfung bestehender Mitgliedschaft.
- Das erfundene `share:"half"` hätte keinen Schaden angerichtet, weil `hasPartyTerms` ohne Bedingungen im Spielertext die Standardabrede wählt.

**Probe [E]** ([fix_invites.analysis.diff](claude_user18_265/fix_invites.analysis.diff)):
- Alle freien Einladungen laufen nacheinander über denselben vorhandenen Pfad, auch neben HUD-Auswahl und anderen Befehlen.
- M15 bucht dann Questannahme und beide Mitgliedschaften. Jede NPC-Entscheidung ist ein eigener Helper-Aufruf (synthetische Entscheidung).
- Variante „Sera lehnt ab“: Nur Dann tritt bei, die Quest bleibt aktiv.
- Die Suite besteht 3.667/3.667.
- **Lücke:** Der Narrator erfährt das Ergebnis nur über den Partyblock im Kontext, und der fällt aus dem Budget (B5). Nötig ist zusätzlich eine kurze Aktionszeile „PARTY — Dann joined / Sera declined“.

**Gesperrte Einladungsbuttons:**
- [action_composer.js:335–339](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/action_composer.js#L335-L339) sperrt bei laufendem Weltabgleich, Erzählung, Begegnung, Entwurf oder nicht leerem Eingabefeld. Der Grund erscheint nur als Tooltip (`title`).
- Die X-Antwort zu M16 kam 23,9 s nach der Erzählung. Ein noch laufender Weltabgleich ist damit plausibel, aber weiter **nicht nachgewiesen**.
- Empfehlung: den Grund sichtbar anzeigen.

### B4 · Namen und Sprecherzuordnung (mittel; GPT teilweise widerlegt)

- **Namensspeicherung ist korrekt [S][R]:** `known_name: null` heißt bei dieser Engine „ganzer Name bekannt“ ([delta.js:262–266, 943–950](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/delta.js#L262-L266)). Dann heißt dauerhaft „Dann Weaver“. Der GPT-Befund „known_name wieder null“ ist eine Fehlinterpretation.
- **Tatsächlich fehlerhaft, aber folgenlos:** Das X-Delta `learn {who: Dann, s: Dann, p: knows_name, o: Alaric}` ist angenommen und als Behauptung über Dann selbst gespeichert. Dass Dann Alarics Namen kennt, war bereits korrekt gebucht (M10, `f.pc.name`). Kein Handlungsbedarf, nur beobachten.
- **Relevant ist die Sprecherzuordnung** ([party.js:25–64](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party.js#L25-L64)). Ohne Redebegleitsatz („Dann said“) zählt sie alle in der Erzählung genannten Anwesenden. In M16 („Dann was already up… He glanced at Sera.“) sind das zwei, also wird abgelehnt. Probe [K]: Auch mit vollem Namen in der Erzählung bleibt die Ablehnung. Die Ursache ist die Mehrdeutigkeit, nicht der Kurzname.
- **M26 und M28 sind zu Recht nicht gebucht:** Das Zitat ist über eine Erzählunterbrechung zusammengesetzt, bzw. es ist eine offene Frage mit Alternativen. Das sind keine Entscheidungen.
- **Folge für Taktik:** Eine NPC-Zustimmung zur Taktik kommt nur durch, wenn der Narrator genau einen Sprecher markiert. Das ist ein Grund mehr, Taktik standardmäßig als Gespräch zu behandeln (B2) und verbindliche Absprachen über einen eindeutigen Weg (HUD, Helper-Entscheidung) zu führen.

### B5 · Narratorkontext verliert Party und Anwesende (mittel)

Bei Budget 1.400 lieferten die Narratoraufrufe 1.545–1.679 Tokens.

- **Fällt bei T9/T10/T11 jedes Mal heraus:** `party` (119 Tokens) und `present` (64–201).
- **Läuft immer mit, auch am Mühlteich:** `guild_authority` (174–229) mit Priorität 0 ([context.js:838](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/context.js#L838)), bei jedem C-Zug. Ebenso `quests` (376).
- **Partyblock:** Er hat Priorität 1 ([context.js:830](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/context.js#L830)).
- **Empfehlung:** kein höheres Budget. Stattdessen den Gildenblock nur in der Gildenhalle oder bei Gildenbezug mitgeben, und eine kompakte Partyzeile (Mitglieder, Modus, Abrede) mit Priorität 0, solange Mitglieder anwesend sind.

### B6 · Gescheiterte Eingabe bleibt im Narratorverlauf (mittel, Kontinuität)

- [host.js:585–604](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/host.js#L585-L604) entfernt aus dem Promptverlauf nur Eingaben mit `action_error`.
- Ein Plannerfehler (M21, `interp.failed`) bleibt deshalb als gewöhnliche Spielerzeile stehen. Clarify-Eingaben (M23, M29) werden dagegen über `is_system` ausgeblendet.
- Im Original enthält der N-Request zu M26 und M35 genau einmal „lets split it 3 ways“ (M21). Danach sagt Sera „Equal shares. Fair enough.“
- Hier harmlos, weil die Standardabrede ohnehin gleich teilt. Allgemein erscheint eine nicht ausgeführte Handlung aber als geschehen.
- **Empfehlung:** ein `interp.failed`-Record gilt beim Filtern wie `action_error`.

### B7 · Board-Generierung (Effizienz)

**Ablauf [R]:** Board 56,5 s, danach Repair 52,7 s.

**Auslöser des Repairs:** vier überzählige `habitat.place`-Felder. Der Boardprompt sagt bereits ausdrücklich „no duplicate place field in habitat“, das Modell lieferte das Feld trotzdem.

**Probe [K]** ([board18.mjs](claude_user18_265/board18.mjs)):
- Mit `parseInitialBoard` und der echten Boardanforderung.
- Erste Antwort **nur ohne `habitat.place`**: 4 gültige Angebote und dieselbe Ablehnung der Eberliste wie der archivierte Repair.
- **Der Repair hat nichts verbessert.**

**Warum der Repair alles neu erzeugt:**
- [runtime.js:779](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/v4/runtime.js#L779) nutzt die vorhandene Einzelplatz-Reparatur nur ohne `need.minimum`.
- Novice-Boards haben `minimum:4`, also wird alles neu erzeugt.
- **Empfehlung:** `habitat.place` vor der Prüfung entfernen, wenn es mit dem DEFEAT-`where` übereinstimmt. Das spart einen ganzen Aufruf.

**Latenz:** Die Boardaufrufe in allen Archiven liegen bei 51–93 s je Aufruf (etwa 1.100 Ausgabetokens, rund 20 Tokens/s). Das ist Modelllatenz, kein Engineproblem.

**NPCs reden vorab von einem Auftrag, den es nicht gibt:**
- Vor dem Boardlesen gibt es keine offizielle Liste. Der Narrator erfand Danns „Mill road“-Job, und das wurde korrekt als Gerücht und Thread gespeichert, der Gildenbetrag als `guild_canon` verworfen.
- Der Boardprompt sieht diesen Thread nicht, deshalb fehlt der Job auf dem Board.
- **Die einfachste Lösung ohne Modellaufruf:** offene Gerücht- und Anfrage-Threads der Gildenhalle als optionale Inspiration in den Boardprompt geben.
- **Frühere Boarderzeugung beim Gildenbesuch:**
  - *Vorteil:* NPCs können über echte Angebote sprechen.
  - *Nachteil:* Die Latenz bleibt, und zwar beim Ankunftszug, nicht beim Lesen.
  - *Bedingung:* Ohne Hintergrundaufruf braucht das eine Architekturänderung.
  - *Einordnung:* Designidee, nicht für .266.

**Gesamtperformance des Runs [R]:**
- 847,4 s Stufenzeit: P 196 + 26 (P-Repair), N 254, X 256, Board 109, Party-Helper 5,5.
- Davon 107,5 s für vier gescheiterte Eingaben.
- **Hohe P-Zeiten** gehen auf Ausgabelänge und Provider-Durchsatz zurück:
  - Partybefehle tragen etwa 15 Nullfelder (M21: 599 Ausgabetokens).
  - M27 brauchte 47 s für 305 Tokens.
- **„I look at the questboard“ vs. „I go and look …“:** Ohne `go` entfällt nur die Reiseauflösung. Der Plannerauf­ruf bleibt, der Unterschied ist in den Messungen nicht nachweisbar.

### B8 · Party-HUD (Bedienbarkeit)

**Bestand [S]:**
- `Party` ist ein einzelner Button im Composer. Er öffnet einen `<dialog>` mit `<pre>`-Text und Buttons ([action_composer.js:71–75](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/action_composer.js#L71-L75)).
- Im CSS sind nur die Buttons des Dialogs eingefärbt, nicht die Dialogfläche selbst (`style.css:187`). Daher weiße Fläche, graue Schrift, schwarze Buttons.
- Im World-HUD steht die Party als eine Zeile `Party · A · B` ([hud.js:328](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/hud.js#L328)).
- `partyControls` liefert Einladen, Warten, Mitkommen, Entfernen, Auflösen und Bezahlen pro Person.
- **Nicht vorhanden:** Taktik-Befehle, eine native Mehrfacheinladung und eine HUD-Taktikauswahl.

**Vorschlag mit vorhandenen Bausteinen:**
1. **Party als `details.avereth-shop`** neben „Rasten“ und „Bekannte Wege“, standardmäßig eingeklappt. Zusammenfassung: „Party (2)“.
2. **Eine Zeile pro Mitglied:** Name, Klasse/Level, HP/MP/STA, Modus, Abrede, Priorität bzw. offene Anfrage, dazu die vorhandenen Buttons.
3. **„Taktik“ als eingeklappte Unterzeile je Mitglied:**
   - Buttons für `target` (eine Auswahl der anwesenden Gegner wie bei der Zielauswahl), `protect` (Alaric oder andere Mitglieder), `rear`/`front`, `watch`/`rest`, `independent`.
   - Ein Klick schreibt keinen Freitext. Er löst wie die Einladung eine **Helper-Entscheidung des NPCs** aus. So bleibt die Autonomie erhalten, ohne Abhängigkeit von Sprecherheuristiken.
4. **Mehrfacheinladung:** Kontrollkästchen bei den anwesenden Kandidaten und ein Button. Intern läuft für jeden die vorhandene `partyControl`-Einladung mit eigener Entscheidung.
5. **Sperrgrund sichtbar** neben den Buttons statt nur als Tooltip.

Kein zweites permanentes Kampfpanel und kein Pflichtschritt. Das CSS nutzt die gemeinsame Klasse `avereth-shop`, wie es [HUD_STYLE.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/docs/HUD_STYLE.md) bereits vorsieht.

### Weitere geprüfte Punkte

- **Belohnungsaufteilung [S], kein Umbau:**
  - [party_rewards.js:76–95](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9dde24a5337e2b43dd4e2d58db45a19d4e7baa89/avereth-engine/src/party_rewards.js#L76-L95) teilt die Auszahlung abzüglich echter Sonderansprüche gleichmäßig auf Alaric und die Standardmitglieder mit **tatsächlicher Questarbeit** (`standard_workers`).
  - Beide Abreden sind als `standard` gespeichert: „equal shares of shared quest work“.
  - Die GPT-Aussage ist korrekt. Einen schwerwiegenden Buchungsfehler habe ich nicht gefunden.
  - Nicht natürlich geprüft, weil es keinen Kampf gab.
- **Gefährten [R]:**
  - Dann und Sera sind L3-Rogues mit HP 100, MP 60 und STA 100, beide mit den Skills Basic Attack, Long Lunge und Feint.
  - Ausrüstung: Dann Starter Dagger, Sera Bow mit 20 Pfeilen, beide Light Armor.
  - In M16 erzählt der Narrator von Danns „sword belt“, im Werteblatt hat er einen Dolch. Ab T9 sagt er selbst „Dagger for me“. Eine Kleinigkeit.
- **Reisekontinuität:**
  - Beide Gefährten reisen in T9 und T10 als `travellers` mit.
  - Ankunft an der exakten Questort-ID.
  - 15 und 60 min, ohne Repair. Gut.
- **Konsistenz der Regeln:** Taktik ist dreifach geprüft:
  - P mit Enum,
  - Engine mit Wortliste (`kinds`),
  - X mit Sprecherzuordnung.

  Die mittlere Prüfung wiederholt die semantische Entscheidung des Planners nur schlechter. Das ist der in §5 beschriebene Vereinfachungshebel.

## 4. Bewertung der GPT-Befunde

| GPT | Bewertung |
|---|---|
| R1 kombinierte Einladung, Pfadbedingungen in `runtime.js:452–460`, fehlender invite-Zweig | **bestätigt** [R][S]; Behebung nachgewiesen [E] |
| R1 Sprecher „voller Name vs. Prosa“ | **widerlegt als Ursache**: die Mehrdeutigkeit mehrerer genannter Personen entscheidet [K] |
| R2 Dialog-CSS, Sperrgründe nur als Tooltip, Versionswarnung blockiert nicht | **bestätigt** [S]; Sperrursache weiter **offen** |
| R3 Boardzeiten, Repair durch `habitat.place`, keine Vorgeschichte im Boardprompt | **bestätigt**, ergänzt: der Repair war ohne Nutzen [K]; die Vollneugenerierung folgt aus `need.minimum` |
| R5 `across` als alleiniger Schalter, `dungeon_sight` | **bestätigt** [R][K]; ergänzt: seit .222, derselbe Fehler in der .263-Serie, Fix nachgewiesen [E] |
| R5/R3 T11 keine Nachmeldung | **bestätigt** [R]; Erklärung siehe B1, kein eigener Fix nötig |
| R6 Standardparty genügt, P verwechselt Standard mit 50-%-Sondervertrag | **bestätigt** [R]; zusätzlich ist die Clarify-Regel die eigentliche Blockade (B2) |
| R6 M26/M28 X-Partydeltas | **bestätigt**, zu Recht nicht gebucht |
| R7 gescheiterte Eingabe im N-Verlauf | **bestätigt** und Mechanismus belegt (B6) |
| R7 Partyabschnitt aus dem Budget gefallen | **bestätigt**, ergänzt: ebenso `present`, während `guild_authority` immer mitläuft (B5) |
| Sonstiges: `known_name` null „falsch“ | **widerlegt**: null bedeutet ganzer Name bekannt (B4) |
| Sonstiges: falscher `learn`-Claim | **bestätigt**, folgenlos |
| REVIEW_03 Fortsetzung prüfen | **positiv**, Weg in §9 offline nachgewiesen |

## 5. Gemeinsamer Patchvorschlag für .266

Grundsatz: **Gespräch von mechanischer Entscheidung trennen, Sonderpfade zusammenführen.** Keine neuen Wortlisten, Validatoren oder Repairs.

| # | Änderung | Umfang | Nachweis |
|---|---|---|---|
| 1 | `creature.new.across` nur bei Living-Dungeon-Schwelle auswerten, sonst normale Kreaturenverarbeitung | 1 Bedingung in `world.js` | [E] User18 und Coldwell grün, Suite grün |
| 2 | Nicht buchbare `party coordinate/offer` → `TALK`-Aktionszeile, nie Abbruch des Zuges; schemawidrige Party-Gesprächsschritte des Planners verwerfen statt des ganzen Plans | `turn.js`, Planner-Validierung | [E] M23/M29/M32 erzählen; Suite grün |
| 3 | Alle freien Einladungen über den vorhandenen Rekrutierungspfad, auch mehrere und neben HUD/anderen Befehlen; Aktionszeile „PARTY — … joined/declined“ für den Narrator | `runtime.js` | [E] M15 grün, Ablehnungsvariante grün |
| 4 | Kontextpriorität: `guild_authority` nur mit Gildenbezug; kompakte Partyzeile Priorität 0 bei anwesenden Mitgliedern | `context.js` | [S] |
| 5 | Prompt-Verlauf filtert `interp.failed` wie `action_error` | `host.js`, 1 Bedingung | [S] |
| 6 | Board: `habitat.place` = DEFEAT-`where` vor Prüfung entfernen | Boardparser | [K] identisches Ergebnis ohne Repair |
| 7 | Party-HUD als eingeklappte Zeile mit Mitgliederzeilen, Mehrfacheinladung, optionaler Taktikhilfe über Helper-Entscheidung, sichtbare Sperrgründe | `action_composer.js`, `style.css`, nativer Parteipfad | Entwurf |
| 8 | Narrator-Card .211 inhaltlich unverändert, nur die Revisionskennung auf den Build | Card, Versionsprüfung | Nutzerentscheidung |

Mit 1–3 entfällt die engine-seitige **Wortprüfung** `kinds` für Spieleranfragen. Der Planner entscheidet die Kategorie, die Engine prüft nur Zustand und Ziel-ID. Unklares wird Gespräch. Das entfernt eine der drei Taktikprüfungen statt eine vierte hinzuzufügen.

## 6. Abgrenzung

- **Für .266 erforderlich:** 1, 2, 3, 5, 8. Das sind die Blockaden und die Integrität.
- **Für .266 empfohlen, klein:** 4, 6.
- **Für .266 sinnvoll, wenn 7 im selben Paket bleibt:** HUD.
- **Nur beobachten:**
  - Share-Regeln und Sondervereinbarungen (Nutzerentscheidung).
  - Der falsche `learn`-Claim.
  - Die Sprecherheuristik bei NPC-Entscheidungen. Sie wird durch 2 und 7 weniger wichtig.
  - `watch` ohne Nutzen.
- **Spätere Designideen:**
  - Board beim Gildenbesuch vorbereiten.
  - Gildengerüchte als Boardinspiration.
  - Mehrstufige Kampfskripte. Ausdrücklich **nicht** für .266.

## 7. Durchgeführte Gegenproben

| Probe | Art | Ergebnis |
|---|---|---|
| Treue Reproduktion M1–M35 | [R] | 27/27 eventgleich |
| T10 `across:null` | [K] | 4 Echsen |
| T10 Analyse-Fix | [E] | 4 Echsen, Population, T11 ohne Doppel |
| Coldwell-Bär .263 M36 mit Fix | [K][E] | angelegt, abhängige Meldungen angenommen |
| M15 Mehrfacheinladung mit Fix | [E] | beide bzw. eine Mitgliedschaft, Quest aktiv |
| M23/M29/M32 Gesprächsweg | [E] | Erzählung statt Clarify |
| M16 Sprecher mit vollem Namen | [K] | weiterhin abgelehnt (Mehrdeutigkeit) |
| Board ohne `habitat.place` | [K] | = Repairergebnis |
| Fortsetzung auf Originalsave | [E] | 4 Echsen, Ort, Uhr, Party unverändert |
| Produktsuite mit allen drei Analyseänderungen | [E] | 3.667/3.667 |
| Szenenkatalog der Archive (`across`) | [R] | 2 Outdoor-Fälle, Rest legitimer Schwellenpfad |

## 8. Offene Risiken und nicht Geprüftes

- **Nicht im natürlichen Spiel geprüft:** ein regulärer Partykampf, XP, Loot und Auszahlung. Der Run erreichte keinen Kampf.
- **Modellverhalten unter den Vorschlägen:** Ob der Narrator `TALK`-Zeilen ohne erfundene Kampfvorteile umsetzt, ist offline nicht messbar und braucht eine Modellprobe.
- **Mehrfacheinladung:** Die Probe nutzt synthetische NPC-Entscheidungen. Die Reihenfolge der Entscheidungen kann die zweite beeinflussen (gleiche Situation, eigene Helper-Aufrufe).
- **Gesperrte Buttons:** Ursache weiter nicht belegt.
- **`watch`:** Ein möglicher Wachnutzen in PULSE ist statisch nicht gefunden. Eine Laufzeitprobe fehlt.
- **Analyse-Diffs:** Sie sind Machbarkeitsbelege, kein Produktpatch. Insbesondere fehlen beim Einladungspfad Aktionszeilen und Panels.

## 9. Fortsetzung des persönlichen Spielstands

Ein Neustart ist nicht nötig. Nach dem Patch:

1. Die Nachrichten **ab M29** löschen: die drei Clarify-Paare und den Beobachtungszug T11. Die Engine re-extrahiert nur die letzte Erzählung.
2. **M28 bearbeiten:** eine minimale Textänderung genügt, die Erzählung bleibt erhalten. Alternativ M28 per Swipe neu erzeugen.
3. Die Engine erkennt die Änderung und stellt eine neue X-Anfrage. Das ist der einzige Modellaufruf.

Probe [E] ([continue18.mjs](claude_user18_265/continue18.mjs)) auf dem Originalsave mit der archivierten T10-Antwort als neuer X-Antwort: Danach existieren alle vier Echsen. Ort, Uhr (11:10) und beide Gefährten bleiben unverändert.

Die tatsächliche neue X-Antwort kann vom Original abweichen. Sie wird aber nicht mehr an `across` scheitern.

## Anhang · Archiv und Werkzeuge

- **Archiv:** [User18-Archiv](../testrun_10b/user-20261128-163231-265/README.md), finaler Kampagnenstand `originals/*.gz`, [source_checksums.json](../testrun_10b/user-20261128-163231-265/source_checksums.json), [restore_log.py](../testrun_10b/user-20261128-163231-265/restore_log.py).
- **Redaktion:** Im ST-Log ist genau eine lokale Pfadangabe redigiert (Windows-Benutzername → `<redacted>`). Der Hash des privaten Originals ist nur Herkunftsangabe. Weitere Zugangsdaten oder Endpunkte enthält das Log nicht; `127.0.0.1:8000` ist der lokale ST-Server.
- **Feedbacktexte:** bleiben, wie von GPT übertragen, ohne nachgewiesene Byteidentität.
