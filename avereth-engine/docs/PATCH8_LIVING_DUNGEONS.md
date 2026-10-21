# Patch 8: Living Dungeons (4.3.0-c.6.6.25)

Basis: Commit `2294b9b` (4.3.0-c.6.6.24). Grundlage sind der Auftrag „Patch 8: Living Dungeons, Revision 2“ und der Livetest vom 21.10.2026, 02:22 (`tests/v4/live_1021c.json`).

Ziel: Ein System-Dungeon ist ein gemeinsamer, wiederholbarer Ort. Die Engine besitzt seine Ebenen, wesentlichen Begegnungen, Wächter und Bosse, seinen Zyklus, sein Gate und die anderen Gruppen. Der Narrator gestaltet Räume, Stimmung und Begegnung.

Produktiv ist nur der Pfad V4-C. V3 und V4-A rufen nichts davon auf.

## 1. Was der Patch einführt

| Bereich | Umsetzung | Ort |
|---|---|---|
| Dungeon-Struktur | `dungeons[root]`, einmal festgelegt beim ersten Kontakt (`dungeon.established`) | `src/v4/living.js` |
| Ebenen | Rank, Level-Fenster je Rolle, Slots, Manifestation, Siegel, Pace | `living.js` |
| Slots ↔ Kreaturen | Slot-Ref im Extractor-Katalog. Die Engine legt die Individuen an (Level, Typ, Name, `entity.slot`) | `living.js`, `world.js newEntity` |
| Begegnung voraus | `dungeon.ahead` beim GO in einen ungesehenen Teil, Zeile „DUNGEON AHEAD“ an den Narrator | `commands.js livingGo` |
| Fortschritt | `dungeon.part` je neuem Raum. Ein Pace (0–1 ruhige Teile) entscheidet, wann der nächste Slot fällig ist | `world.js arrive`, `living.js nextSlot` |
| Garantie | Bringt die Antwort die platzierte Begegnung nicht, ist sie trotzdem da; der nächste Zug erhält eine Korrektur | `world.js` nach Schritt 3 |
| Floor-Clear | Alle Slots aufgelöst → `dungeon.cleared` mit Credit (Alaric oder andere). Siegel bricht, Manifestation | `living.js clearEvents` |
| Reset | Pro Dungeon eine Zyklusdauer in Spieltagen. Nie im Kampf. Alarics Ebene wird zurückgestellt, höchstens bis zur nächsten Fälligkeit | `living.js cycleEvents` |
| Loot-Verfall | Ungenommene Altbeute auf erneuerten Ebenen verfällt; was je Alaric gehörte (`had_pc`), bleibt | `living.js decayEvents`, `domain.js` |
| Ressourcen | Fundstellen je Ebene (Glimmerdeep: Kristallader 3 Shards), einmal pro Zyklus | `living.js gatherEvents`, `commands.js activity` |
| Gate | Eingangsknoten = Dungeon-Wurzel; Zugangsregel, Gebühr (Angebot mit Zustimmung), Kapazität | `living.js gateCheck`, `commands.js` |
| Gruppen | 2 Gruppen je Dungeon mit festen Namen, Größe und Anführer. Deterministischer Tagesplan. Pro Ebenenbesuch nehmen sie eine Begegnung, die niemand getroffen hat | `living.js partyEvents` |
| Begegnung mit Gruppen | Anführer werden einmal als NPC angelegt (`npc.party_*`), Narrator und Extractor kennen sie per ID | `living.js leaderEvents` |
| Rückkehrstein | Drop von Wächter (25 %) und Boss (60 %). Bei Benutzung: verbraucht und zum Gate, in einem Schritt | `loot.js`, `living.js returnStone` |
| Culling | Zielzahl auf dem Board „(4)“, „2/4 defeated“, Ortsbindung, erst ab Annahme | `guild.js goalText`, `defeatTally`, `cullNumbers` |
| Dungeon-Clear | „— Clear Old Crown Catacombs, level 1“; bereit nur mit Alarics Credit; bei fremdem Clear zurückgezogen | `guild.js contractReady`, `living.js` |
| Pacing | GO-Zeile: Weg bis zum Ende tragen; folgenlose Geräusche, Schatten und Spuren sind kein Halt | `commands.js go` |
| .24-Fehler | Kapelle → Gate, Treppe → Level 2, Ghul-, Schleim- und Schamanen-Anchors | `living.js entranceOf`, `world.js throughGoal`, `monsters.json` |

## 2. Review 1: Architektur vor der Implementierung

**Kanonischer Zustand.** Jeder Fakt hat genau einen Besitzer:
- Die Klassifikation (Theme, Rank, Ebenen-Ranks, Kontrolle) bleibt in `places[root].dungeon` (Patch 7).
- Die lebende Struktur liegt in `dungeons[root]`: Gate, Kapazität, Zyklus, Ebenen-Slots, Gruppen.
- Ein Slot speichert Rolle und Zyklus, eine Entity das Individuum. Ob ein Slot erledigt ist, wird aus dem Status seiner Entities gelesen (tot, geflohen, ergeben). Nur „von Gruppe X erledigt, nie getroffen“ steht im Slot selbst (`taken`). Es gibt keine doppelte Speicherung.
- Ein Raum ist `places[id]`, seine Ebene ist `level`.

**Slot ↔ Entity eindeutig.**
- Der Slot hat eine Ref je Zyklus (`old_crown_catacombs_c2_l1_e3`).
- Der Extractor-Katalog nennt diese Ref für die platzierte Begegnung, die Engine überschreibt Art, Anchor, Anzahl und Level aus dem Slot.
- Fallback: dieselbe Anchor-Art bei Ankunft im neuen Teil jener Ebene. Das ist eine strukturelle Zuordnung über das angekündigte Slot plus Anchor, keine reine Namensheuristik.
- Zusätzlich erzählte Kreaturen bleiben optional und zählen nicht als Floor-Ziel.
- Refs nennen kein Pluralwort (`…_e1` statt `…_ghouls`), weil V3 sonst eine Gruppe vermutet.

**Neue Dungeons.**
- Ohne Content-Eintrag wird die Struktur aus der Klassifikation gezogen: Ebenen 1 bis zur tiefsten genannten, Kreaturen aus dem Theme, ein Wächter je Ebene, ein Boss auf der letzten.
- Kapazität und Zyklus kommen aus dem Rank (`rules.living`).
- Alles wird einmal im Event `dungeon.established` gespeichert. Ein späteres Content-Update ändert einen etablierten Dungeon nie.

**Determinismus.**
- Alle Ziehungen sind Hashes aus Kampagnen-Seed, Dungeon, Zyklus und Zweck. Der gemeinsame Würfelstrom bleibt unberührt, deshalb ändert sich an keiner bestehenden Kampagne ein Wurf.
- Swipe und Replay wenden die gespeicherten Events an.

**Fortschrittszurechnung.**
- Ein Slot gilt als von Alaric erledigt, wenn alle seine Individuen tot, geflohen oder ergeben sind. Das entscheiden die Engine-Kämpfe auf seiner Seite.
- Gruppen erzeugen nie Entities. Ihre Erfolge füllen deshalb weder XP, Loot noch Zählungen.
- Credit für eine Ebene: Alaric hat mindestens die Hälfte der Slots erledigt oder den Wächter/Boss.

**Aufwand.**
- Ein neues Modul `living.js` mit etwa 640 Zeilen.
- Koordination in `world.js` mit etwa 90 Zeilen: Gate-Abbildung, Weg durch den Zielraum, Siegel- und Gate-Prüfung, Slot-Zuordnung, Garantie.
- Hooks in `commands.js`, `guild.js`, `engine.js`, `loot.js`, `catalog.js`, `context.js` und `hud.js`.
- Kein neuer Delta-Typ, kein zusätzlicher LLM-Aufruf.

## 3. Phase A: die .24-Regressionen, am Original reproduziert

| Befund (.24) | Ursache am Code | Korrektur |
|---|---|---|
| #16 Ankunft „Ruined chapel above the Old Crown Catacombs“ als `passage` abgelehnt | Die gemeldete Kapelle war ein Kind des Dungeons. `wayRefused` sah einen Raum eines Dungeons, „für den er nicht aufgebrochen war“ | `entranceOf`: Ein Gate-Name (Content `living.gate.names`) oder Dungeon-Name plus Lagewort ist die Dungeon-Wurzel, also der Eingangsknoten |
| #32 Black Corridor auf Level 1 | Der GO galt dem Treppenraum (Level 2). Der neue Korridor wurde ohne Link von der Bier Chamber erreicht; `arrive()` legte einen `walked`-Link ohne `dir` an; `levelVia` erbte Level 1 | `throughGoal`: Ein neuer Teil jenseits des Zielraums wird durch diesen Raum erreicht. Zeigt dieselbe Antwort einen Übergang mit `dir`, trägt der gegangene Link diese Richtung (`passageInto`). Siegel werden auf die künftige Ebene geprüft |
| #34 Ghul auf Skelett-Body-Plan, Level 14 | Kein Anchor für Ghule; gleichverteilte Level über F (1–14) | Neue Anchors `ghoul`, `slime`, `goblin_shaman` mit Loot. Bei zwei passenden Anchors gewinnt der spezifischere Name. Level aus dem Rollenfenster der Ebene |

**Content-Audit der drei Seeds:**
- Skelette → `skeleton`
- Ghule → `ghoul`
- Kristallkäfer → `arthropod`
- Mineralschleime → `slime`
- Goblin-Späher und -Krieger → `goblin`
- Goblin-Schamane → `goblin_shaman`

## 4. Bewusste Entscheidungen und Regeln

- **Level-Fenster.** Je Rolle ein Anteil des Rank-Bands der Ebene. F (1–14): Minion 1–5, Wächter 4–8 (Elite), Boss 5–9 (Boss). E: 15–19, 18–22, 20–24. Werte in `rules.living.role_spans`; es gibt keine Bindung an Alarics Level.
- **Siegel.** Old Crown Catacombs: Ebene 2 erst nach dem Clear von Ebene 1, Manifestation „the pale grave-light in the seal … gutters out“. Mossback und Glimmerdeep haben kein Siegel. Ein bereits betretener Raum einer gesiegelten Ebene (alter Spielstand) bleibt erreichbar.
- **Gates der Seeds.**

  | Dungeon | Zugang | Gebühr | Kapazität |
  |---|---|---|---|
  | Old Crown Catacombs | frei (Tempelwärter) | — | 6 |
  | Glimmerdeep Grotto | Gildenmitglieder (Akademie) | 10 cp | 6 |
  | Mossback Warrens | Gildenmitglieder (Gilden-Ledger) | — | 8 |

  Die Gebühr läuft als Angebot (`offer.gate.*`) und wird nur mit `offer.accept` bezahlt. Der Pass gilt, bis er wieder draußen ist.
- **Reset.** Seeds alle 3 Spieltage, generierte Dungeons nach Rank (3–7 Tage).
  - Reihenfolge der Zeit: erst die Gruppen-Schritte bis zur Fälligkeit, dann der Reset, dann der Rest.
  - Schritte vor dem Zyklusbeginn nehmen dem neuen Zyklus nichts.
- **Verfallsregel.** Gegenstände in Räumen erneuerter Ebenen verfallen beim Reset (`object.consumed by dungeon_reset`), ausgenommen:
  - was je in Alarics Besitz war;
  - was in seinem aktuellen Raum liegt;
  - was am Gate liegt.
- **Gruppen.**
  - Besuchschance 35 % je Gruppe und Tag, Eintritt 7–14 Uhr, Aufenthalt 150–330 Minuten, 70 Minuten je Ebene.
  - Pro Ebenenbesuch nehmen sie die nächste ungetroffene Begegnung in Reihenfolge; Wächter und Boss erst nach den Minions.
  - Nie auf Alarics Ebene, solange er dort ist.
  - Gebucht wird erst ab der Etablierung, keine rückwirkende Vergangenheit.
- **Cull-Zahl.** Lässt der Generator die Zahl weg, setzt die Engine sie beim Buchen: 1 für ein einzelnes Tier, sonst 3–5. Sie ist ab dann fest und auf dem Board sichtbar. ATTACK-Ziele einer Jagd werden als DEFEAT gebucht.
- **Ortsbindung der Zählung.** Clear-Aufträge zählen im genannten Dungeon, sonst im Reich des Gildenzweigs. Wesen ohne bekannten Ort zählen weiterhin (alte Spielstände).
- **Pacing.**
  - Jede GO-Zeile auf Pfad C endet mit „Carry the way forward … never a stop.“ (+46 Tokens).
  - Im Dungeon sagt „DUNGEON AHEAD“, wo der Weg endet: an der Begegnung, an einem ruhigen Teil oder an „nichts mehr auf dieser Ebene“.
  - Es gibt keinen Autoplay und keine zweite Reiseengine.

## 5. Review 2: Integration nach der Implementierung

| Prüfpunkt | Ergebnis |
|---|---|
| Dungeon von Eingang bis Endboss spielbar | Ja, Test (1): Gate, 2 Minion-Gruppen, ruhiger Teil, Wächter (Elite), Clear, Siegel, Ebene 2, Ghul, Boss (Level 21, Typ boss), Loot, Ausgang, Reset, neuer Besuch |
| Räume und Ebenen korrekt verbunden | Ja, (6)/(13B): Treppe in zwei Zügen und in einem Zug |
| Population und Respawn konsistent | Ja, neue Refs je Zyklus; Tote bleiben tot; kein zweiter Boss (`dungeon_slot`-Ablehnung) |
| Belegung durch Gruppen | Ja, (3): Gate voll → „CANNOT ENTER … is full“ |
| Boss und Loot nur einmal | Ja, Loot je Entity einmal (`looted`); Boss je Zyklus ein Individuum |
| Questfortschritt und Payout | Ja, (4) Cull 2/N mit Orts- und Zeitbindung; (5) Clear → `dungeon_clear` → 60 cp an der Theke; (3) fremder Clear → `failed` |
| Swipe, Replay, Legacy | Ja, (8) Swipe gleiche Dungeon-Events, Fold gleich; V3/V4-A ohne Hooks; volle Suite grün |
| Pacing verbessert | Im Prompt ja, (9)/(10); im echten LLM nicht gemessen (siehe Review 3) |
| Keine globale Balance-Änderung | Ja: XP, Schaden und Monsterwerte unverändert; Level-Fenster nur in etablierten Dungeons; der Würfelstrom anderer Kampagnen ist unberührt |

Beim Review 2 nachgebessert:
- **Zeitreihenfolge.** Gruppen-Schritte vor einem Reset räumten den neuen Zyklus (gefunden im Durchspiel). Jetzt gilt: bis zur Fälligkeit buchen, dann Reset, dann weiter. Schritte vor `cycle_start` nehmen nichts.
- **Treppe in einem Zug.** Übergang und Ankunft in derselben Antwort: Der gegangene Link übernimmt `dir`, die Siegelprüfung nutzt die künftige Ebene. Ein Übergang in den gerade neu betretenen Raum beginnt am vorherigen Raum.
- **Pass.** Er verfiel im Folgezug vor dem Eintreten; jetzt gilt er bis zum Wiederaustritt.
- **Pace.** Von Gruppen erledigte Slots zählen nicht mehr als ruhige Teile.
- **Theme-Erkennung.** Satzzeichen trennen Arten („skeletons, ghouls“ sind zwei Arten); Pluralwörter sind kein Adjektiv.

## 6. Review 3: kritischer Abschluss

**Wirklich erfüllt (Engine-Mechanik, getestet):**
- Ebenen, Slots und Level-Fenster
- Wächter, Boss und Identität über Zyklen
- Floor-Clear mit Credit
- Siegel
- Reset mit Zurückstellung und Verfallsregel
- Ressourcen
- Gate mit Zugang, Gebühr und Kapazität
- Gruppen mit Zeitplan, Konkurrenz um Begegnungen und stabilen Anführern
- Rückkehrstein
- Cull-Zahl und Clear-Aufträge
- Pacing-Zeilen
- Die drei .24-Fehler

**Nur synthetisch geprüft, nicht im echten SillyTavern mit einem echten LLM:**
- ob der Narrator die „DUNGEON AHEAD“-Begegnung bringt und an ihr anhält;
- ob der Extractor die Slot-Ref aus dem Katalog verwendet;
- ob die Pacing-Klausel die „continue“-Schleifen tatsächlich senkt.

Abgesichert ist das durch die Garantie: Die platzierte Begegnung ist auch ohne Erzählung da, und der nächste Zug wird korrigiert. `smoke:st:c` deckt den allgemeinen C-Pfad ab, aber keinen Dungeon.

**Bewusst schmal (keine Platzhalter, aber minimal):**
- Gruppen haben nur einen Anführer als NPC; die übrigen Mitglieder sind Zahl und Erzählung.
- Fraktion ist ein Merkmal (`affiliation`), keine Simulation.
- Ressourcen gibt es nur als Content-Fundstellen (Glimmerdeep); generierte Dungeons haben keine.
- Gruppen kämpfen nie vor Alarics Augen.
- Die HUD-Belegung zählt Alaric als 1; Begleiter zählen beim Eintritt (`gateCheck`).

**Sonderregeln, die man kennen muss:**
- Gate-Namen pro Seed (`living.gate.names`).
- Die Siegel-Ausnahme für bereits betretene Räume.
- Die Engine-Cull-Zahl, wenn der Generator keine nennt.

**Komplexität:**
- Ein neues Modul, keine neue Delta-Art, kein neuer LLM-Aufruf.
- `world.js` wächst um Koordinationsfunktionen, nicht um Fachlogik (Strangler-Regel).

**Zwischenmeldungen:** Im Dungeon endet jeder GO an einem engine-definierten Punkt, und nie folgt mehr als ein ruhiger Teil (Test 9). Außerhalb des Dungeons gibt es nur die GO-Klausel.

**Laufzeit und Prompt:**
- Die Suite läuft etwa 26 s, vorher 26,8 s.
- Promptgröße im Dungeon-Zug (Narrator-Kontext und Engine-Block): +86 Tokens Kontext, +86 Tokens AHEAD-Zeilen.
- Extractor-Katalog +64, Planner-Katalog +17, jeder GO +46.

## 7. Alte Kampagnen

- Beim ersten Zug in oder an einem Dungeon wird die Struktur deterministisch ergänzt (`dungeon.established`).
- Räume, Wege, Tote und Profile bleiben, wie sie sind. Vorher getroffene Kreaturen gehören keinem Slot an.
- Bereits falsch gespeicherte Ebenen werden nicht repariert. Im .24-Spielstand liegen Black Corridor und Sagging Hollow weiter auf Level 1.
- Laufende Clear-Aufträge alter Spielstände werden aus ihren Zielen erkannt (`clearOf`).
- Für die Siegel-Ausnahme siehe §4.

## 8. Tests

| Datei | Inhalt |
|---|---|
| `tests/v4/patch8.test.js` (16) | (1) kompletter Seed-Dungeon; (2) neuer D-Rank-Dungeon; (3) Gruppen, Belegung, fremder Boss, Rückzug des Auftrags; (4) Cull mit Zahl und Zurechnung; (5) Clear und Auszahlung; (6) .24-Regressionen am Original; (7) alter Spielstand; (8) Swipe und Replay; (9) lange Erkundung ohne Leerlauf; (10) Reise außerhalb; außerdem Gate und Gebühr, Rückkehrstein, Reset, Ressourcen, Gruppen-Anführer, Treppe in einem Zug |
| `tests/v4/patch8_lib.js` | Hilfen (scripted Planner und Extractor, Kampf bis zum Ende) |
| `tests/v4/live_1021c.json` | Livetest 21.10.2026 02:22 ohne Secrets (nur `mes` und `extra.avereth`) |
| Angepasst | `gen35_ownership` (`dungeons` ist eine Engine-Domäne); `patch7` (Warrens-Gate verlangt Mitgliedschaft: Test registriert Alaric) |
