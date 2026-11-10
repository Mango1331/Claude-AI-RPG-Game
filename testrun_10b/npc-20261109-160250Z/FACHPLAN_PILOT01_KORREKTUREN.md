# Fachplan – gezielte Korrekturen aus NPC/PULSE-Pilot 01 (Claude, 10.11.2026)

**Grundlage:** [Gegenreview](GEGENREVIEW_CLAUDE.md) (Befunde B1–B12, V1–V5) zum natürlichen Lauf `20261109-160250Z-npc_pulse_test` und der [GPT-Review](REVIEW.md). **Codebasis:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` auf [`2a8b54e`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine), Engine `.174`. Alle Zeilenangaben beziehen sich auf diesen Stand.

**Status: Plan, nicht freigegeben.** Keine Engine-, Regel- oder Runneränderung, kein Modelltest in diesem Schritt.

## 0. Grundsätze

- **Eng statt breit:** Jede Korrektur greift an der Stelle, an der die Ursache belegt ist. Kein neues Subsystem, keine neue Matchingarchitektur, kein Generalpatch.
- **Kein Budget nach oben:** Das Kontextbudget 1400 bleibt; Platz entsteht nur durch korrektere Auswahl (Fachplan NPC E2/E3 §9: „nie das Budget erhöhen“).
- **Kein zusätzlicher Modellaufruf**, keine Änderung an PULSE-Parametern (`rules.json`), Balance, E4/E5.
- **Regeln, die gelten bleiben:**
  - R1/R2 mit der §8-Identifikations- und Pronomenregel,
  - R7 (`pc` nur bei anwesender NPC-Partei),
  - `.144` S1/S2 (Preise nur als Endsumme in Münzwörtern),
  - PULSE A–C (eine Entscheidung je Nachricht, Firewall für neue Angreifer außerhalb des Dungeons).
- **Jeder Patch:**
  1. zuerst rot gegen `.174` mit einem Fixture aus den Pilot-Originalen,
  2. danach grün,
  3. dann Vollsuite, Korpus-Replay (2235 Fälle, Abweichungen kategorisiert und akzeptiert) und ST1.19-Smoke Standard/Failsoft,
  4. Kontextmessung, wo der Erzählerkontext berührt ist (`recherche/npc_e2_e3_probes/probe_context.mjs`, Messpunkte unten),
  5. Patchnote im Produktbranch und eigener Build.
- **Fixtures:** Ausschnitte aus `originals/chat.jsonl` dieses Laufs (Chat bis zur betroffenen Nachricht mit den gespeicherten Rohantworten von Planner und Extractor). Sie enthalten keine Schlüssel (`secretHits = 0`).

## 1. Übersicht und Reihenfolge

| Nr. | Patch | Befund | Prio | Art | Abhängigkeit |
|---|---|---|---|---|---|
| 1 | **K1 Dungeoneintritt** | B1 | P2 hoch | Engine, deterministisch | – |
| 2 | **K2 Objektidentität beim Kauf** | B5 | P2 | Engine, deterministisch | – |
| 3 | **K3 Kontextauswahl `gear_market`** | B2 | P2 | Kontext, deterministisch | – |
| 4 | **K4 E2-A-Evidenz in Teilsätzen** | B8 | P2 | Engine, deterministisch | – (D-2 optional) |
| 5 | **K5 Absprachenidentität** | B3, B4 | P2 | Extractorvorgabe + optional Engine (D-1) | nach K4 (gleiche Abnahmeszenarien) |
| 6 | **K6 Szenenkorrektur und Personenidentität** | B7, B6 | P3 / P2 (D-4) | Engine + Extractorvorgabe | nach K5 (Vorgaben bündeln) |
| 7 | **K7 Börse im Ergebnistext** | B9 | P2 | Ergebnistext, deterministisch | – |
| 8 | **K8 Kleinpaket P3** | B11, B12 | P3 | Engine, deterministisch | beliebig |
| – | **Finanzfolgeprüfung** | B10, Reibung `.144` | eigener Auftrag | Analyse zuerst | getrennt |

**Begründung der Reihenfolge:**
- **K1 und K2:** isoliert und ohne Wechselwirkung mit Modellvorgaben; der Rot-Grün-Nachweis ist vollständig deterministisch.
- **K3:** wirkt in jedem Zug auf den Erzählerkontext und braucht daher eine eigene Messung. Er kommt vor dem nächsten natürlichen Lauf, sonst bleiben E2/E3 beim Erzähler weiter verkürzt.
- **K4:** stellt Wiederbegegnung und Bearbeiter in den Teilen her, die die Engine selbst prüft.
- **K5 und K6:** hängen an Extractorverhalten; nur ihre Engineteile sind deterministisch prüfbar. Die Vorgabenänderungen sollten in **einem** Extractor-Build gebündelt werden, damit der nächste natürliche Lauf sie gemeinsam prüft.
- **Bündelung:** K1–K4 und K7 können einzeln oder als zwei Builds geliefert werden (Vorschlag: K1+K2, dann K3+K4+K7). K5/K6 bilden einen dritten Build.

---

## 2. K1 – Dungeoneintritt: Slotgegner unterliegen nicht der PULSE-Sperre (B1)

**Befund und Beleg:**
- **Ablauf:**
  - T65 (I129–I134): GO vom Dungeonhang `loc.mossback_warrens` in den ersten Raum. Ergebnis: „DUNGEON AHEAD … there he meets 3 goblin scouts … bring exactly these“.
  - `dungeon.slot` bindet `mon.mossback_warrens_c1_l1_e1_1..3`. `hostile` und `intent` der drei werden 6-mal mit `pulse` verworfen: „no new attacker was authorized in this scene“.
  - Die Korrektur „did not attack Alaric … no fight started“ geht an den Erzähler.
- **Folgen:** T66 ist der Angriff außer Reichweite (kein Kampf), T67 eröffnet erst der Spieler.

**Ursache:**
- [`pulse.js` L115–L130](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/pulse.js#L115-L130) (`pulseBegin`) setzt `governs = false` nur bei `insideDungeon(s)`.
- [`pulse.js` L70](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/pulse.js#L70): `insideDungeon` ist am Dungeonknoten selbst falsch (`r !== at`).
- [`commands.js` L512](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/commands.js#L512) markiert den DUNGEON-AHEAD-Zug nur als würfelfrei (`dungeonAhead`, Grund `dungeon_ahead`), nicht als nicht-PULSE-regiert.
- [`world.js` L533–L553](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L533-L553) (`envelopeAllows`) verwirft deshalb jede in der Antwort eingeführte (`bornHere`) Kreatur, auch die soeben an den Slot gebundenen.

**Widerspruch zum Plan:** Der [PULSE-Fachplan](../../patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) sagt in Abschnitt C, Punkt 1: „DUNGEON AHEAD bleibt Autorität“; Paket A, Testfall A2 (6) verlangt Slot- und Envelope-Regeln. Der Code-Kommentar `pulse.js` L22–L23 sagt dasselbe: Für Dungeongegner gilt allein die Dungeon-Firewall (`governs: false`).

**Korrekturziel:** Gegner, die die Engine in diesem Zug per DUNGEON AHEAD an einen Slot gebunden hat, prüfen Slot-, Envelope- und `attack_commitment`-Regeln wie im Dungeoninneren. Die PULSE-Sperre gilt für sie nicht.

**Änderung (eng):**
- In `envelopeAllows` (world.js L539) die PULSE-Verzweigung für eine Entität überspringen, wenn sie in dieser Antwort per `dungeon.slot` an einen Slot desjenigen Dungeons gebunden wurde, den DUNGEON AHEAD dieses Zugs nennt (`s.entities[id].slot?.dungeon`).
- Danach läuft der normale Envelope-Weg (`mayOpenFight`).
- Kein Umbau von `pulseBegin`/`governs`. Andere in derselben Antwort eingeführte Wesen bleiben unter der PULSE-Regel (am Eingang) bzw. `dungeon_foe` (innen).
- Die Diagnose `auth.pulse` bleibt unverändert (`rolled: false`, `reason: 'dungeon_ahead'`).

**Bewusst unverändert:**
- kein PULSE-Wurf auf DUNGEON-AHEAD-Zügen;
- Wanderer-Regel (Paket B);
- `dungeon_foe` für Nicht-Slotgegner;
- `attack_commitment` (eine bloße Drohung eröffnet weiterhin nichts);
- `group_unclear`.

**Regressionen:**

| Fall | `.174` (rot) | nach K1 (grün) |
|---|---|---|
| K1-1: Pilot-Fixture I0–I128 + Antwort I130 mit Original-Rohextraktion | 6× `pulse`, Korrektur „no fight started“ | kein `pulse`. Die Meldungen durchlaufen die bestehenden Prüfungen, insbesondere `attack_commitment` und Gruppenumfang. Das Ergebnis ist ein gebuchter Angriff oder deren reguläre Ablehnung, nie `pulse` |
| K1-2: wie K1-1, zusätzlich ein in derselben Antwort neu eingeführtes Nicht-Slotwesen mit `hostile` | `pulse` | weiterhin `pulse` bzw. `dungeon_foe` |
| K1-3: Start innen, DUNGEON AHEAD in den nächsten Raum | wie bisher | unverändert |
| K1-4: GO außerhalb ohne Dungeon, geschlossenes Fenster, neuer Angreifer | `pulse` | `pulse` (PULSE A unverändert) |
| K1-5: Dungeoneintritt mit sofortigem Angriff → Kampfbeginn | – | Kampf mit Gegnerinitiative nach bestehender Hinterhalts-/Aufmerksamkeitsregel |

**Abnahme:**
- Replay: Abweichungen nur in Dungeoneintrittsfällen mit `pulse`-Ablehnung von Slotgegnern; jede einzeln akzeptieren.
- ST1.19: Smoke mit Eintritt vom Dungeonhang; bestehende PULSE-B-Prüfungen unverändert.
- Kontext: kein neuer Abschnitt.

**Risiko:** gering. Ein neuer Angreifer außerhalb eines Slots gewinnt keine Rechte, denn die Ausnahme hängt an der vom Engine-Zug selbst gesetzten Slotbindung.

---

## 3. K2 – Objektidentität beim Kauf (B5)

**Befund und Beleg:**
- T41 (I82): `object.created obj.t82.primer` (liegt im Laden) und getrennt `offer.created offer.t82.5` mit der Zeile „Primer, 30 cp“.
- T42 (I83/I84): `transaction.completed` 30 cp, **`object.created obj.t83.primer`** beim PC. Die Extractormeldung `object.move obj.t82.primer → pc` wird mit `pc_inventory` verworfen ([world.js L2771](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L2771)).
- T43 (I85): Der Planner macht aus „tuck the wrapped Primer away“ den Befehl `take obj.t82.primer`; die Engine gibt „TAKES — Primer along“ aus.
- Ergebnis: zwei Primer beim PC, ein Kauf.

**Ursache:**
- [`trade.js` L266–L305](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/trade.js#L266) (`bookPurchase`) erzeugt für jede Warenzeile ein neues Objekt (L300).
- Eine erzählte Angebotszeile kennt das vor Ort liegende Objekt nicht. Bei Geboten an Alaric (`bid`) gibt es eine solche Verknüpfung (`lines[].object`), bei Verkaufsangeboten nicht.

**Korrekturziel:** Ein gekaufter Gegenstand, der bereits als Objekt beim Verkäufer oder im Laden liegt, wechselt den Besitzer. Ein zweites Exemplar entsteht nicht.

**Änderung (eng):**
1. **Verknüpfung** beim Anlegen eines erzählten Verkaufsangebots (world.js, Angebotsanlage vor L3013):
   - Eine Warenzeile erhält `object: <id>`, wenn **genau ein** Objekt gleichen normalisierten Namens am erreichten Ort liegt (`holder.loc` in der Ortslinie von `scene.at`) oder vom Verkäufer gehalten wird.
   - Das Objekt darf nicht schon an eine andere offene Zeile gebunden sein.
   - Bei Mehrdeutigkeit keine Verknüpfung (bisheriges Verhalten).
2. **Buchung** in `bookPurchase`:
   - Trägt die Zeile `object` und liegt das Objekt noch dort, dann `object.moved` zu `pc` (Menge der Zeile) statt `object.created`.
   - Sonst das bisherige Verhalten.
   - Transaktion und Münzbuchung bleiben genau einmal.

**Bewusst unverändert:**
- kanonischer Gildenbestand (`stock: 'manuals'`, ohne physische Vorabobjekte);
- Gebote an Alaric;
- die `take`-Regel. Ob die freie Mitnahme ausgestellter Ladenware ohne Kauf zulässig ist, entscheidet D-5; K2 verhindert hier nur die Verdopplung.

**Regressionen:**

| Fall | `.174` (rot) | nach K2 (grün) |
|---|---|---|
| K2-1: Fixture I0–I82, T42 `offer.accept offer.t82.5` | `object.created obj.t83.primer`, `obj.t82.primer` bleibt im Laden | `object.moved obj.t82.primer → pc`, kein neues Objekt, −30 cp einmal |
| K2-2: wie K2-1, danach T43 `take obj.t82.primer` | zweiter Primer beim PC | kein zweites Exemplar; der `take` findet nichts mehr vor Ort |
| K2-3: zwei gleichnamige Objekte im Laden | – | keine Verknüpfung, bisheriges Verhalten, Diagnose-Notiz |
| K2-4: Kauf ohne Vorabobjekt (nur erzähltes Angebot) | neues Objekt | unverändert |
| K2-5: Ausrüstung mit Profil (Basis/Qualität) | wie bisher | Profil und Traits bleiben am bewegten Objekt erhalten bzw. werden wie bisher gesetzt |
| K2-6: Fold, JSON-Round-Trip, Reload | – | identisch |

**Abnahme:**
- Replay: Abweichungen nur in Käufen mit Vorabobjekt; kategorisieren (erwartet: weniger Doppelobjekte).
- ST1.19: Kauf eines ausgestellten Gegenstands.
- Der Batch28-Hessa/Hemd-Fall bleibt ein eigener Rückgabefall und ist nicht Teil von K2.

---

## 4. K3 – Kontextauswahl: Geräte-Katalog nur bei Gerätehandel (B2)

**Befund und Beleg (Kontextdiagnose aller 63 Erzählerzüge):**
- 27 Züge mit Überlauf schon im Priorität-0-Teil; `present` dabei in allen 27 verworfen, in 11 mit NPC-Karten.
- `relevant` in 60 Zügen gebildet und nicht ausgeliefert.
- `gear_market` (506–567 Tokens) in 19 Zügen, auch auf Karrenweg, Hof und im Dungeon.

**Ursache:** [`context.js` L738–L745](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/context.js#L738-L745):
- `gear_market` wird mit **Priorität 0** hinzugefügt, sobald [`itemScan` (L672)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/context.js#L672) = Eingabe + **letzte Antwort** eines der Wörter `shop|buy|sell|merchant|smith|blacksmith|gear|equipment|armo(u)r|weapon|shield` enthält.
- Beschreibungen wie „his sword, armor and Guild plate“ oder „shield-sense“ lösen ihn aus.
- Der Packer ([L853 ff.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/context.js#L853)) hält Priorität 0 immer. Danach ist für `present` (Priorität 1) und `relevant` (Priorität 2, [L811](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/context.js#L811)) kein Platz.

**Korrekturziel:** Die Katalogregeln binden weiterhin dort, wo Ausrüstung gehandelt wird. Sonst belegen sie keinen Platz.

**Änderung (eng):** `gear_market` nur, wenn mindestens eine Bedingung gilt:
1. Ein anwesender Verkäufer hat ein offenes Angebot mit Ausrüstungsprofil (bestehende zweite Bedingung, unverändert).
2. Die **Eingabe des Spielers** (nicht die letzte Antwort) enthält eines der Handelswörter, **und** am Ort ist ein Verkäufer anwesend, also eine Person mit offenem Angebot. Es kommt kein neues Vokabular und keine neue Ortsart hinzu.
3. Der Spieler handelt in diesem Zug (`buy`/`sell`/`offer.accept` in den Auflösungen des Ergebnisses).

Die Priorität 0 bleibt, wenn der Abschnitt kommt. Keine Änderung an `quests`, `resolved`, Prioritäten oder Budget.

**Bewusst unverändert:**
- Inhalt des Katalogs;
- `price_contract`;
- Ausrüstungsregeln in `.144`;
- Kartenformat;
- Reihenfolge der Abschnitte.

**Regressionen:**

| Fall | `.174` (rot) | nach K3 (grün) |
|---|---|---|
| K3-1: Zustand T19 (Karrenweg, Antwort enthält „armor“) | `gear_market` geliefert, `present` verworfen | kein `gear_market`; `present` (Dodd) geliefert |
| K3-2: Zustand T52 (Woolpack, Bettverhandlung) | `present` (Bedienung) verworfen | `present` geliefert; ob `relevant` passt, wird gemessen |
| K3-3: Zustand T65 (Dungeon, „shield-sense“) | `gear_market` geliefert | nicht geliefert |
| K3-4: Schmied mit Ausrüstungsangebot anwesend | geliefert | geliefert |
| K3-5: Eingabe „I want to buy a shield“ bei einem anwesenden Verkäufer | geliefert | geliefert |
| K3-5b: T41–T43 Buchladen (Eingabe „buy“, Verkäufer mit offenem Angebot) | geliefert | geliefert |
| K3-6: Eingabe „buy“ auf der Landstraße ohne Händler | geliefert | nicht geliefert |

**Messung (Pflicht):** `probe_context.mjs` vor und nach K3:
- auf den Pilotpunkten I38, I100–I114, I128, I130;
- auf den bisherigen Messpunkten User01 I61/I62/I69, User02 I62/I63/I73, User04 I71/I72/I73, B3 und Tam offen/erledigt.

**Abnahmegrenze:**
- kein neuer Priorität-0-Abschnitt; kein Messpunkt mit mehr Tokens;
- in den Pilotpunkten wird `present` mit anwesenden NPCs wieder geliefert;
- berichtet wird, in wie vielen Messpunkten `relevant` passt.

Reicht das nicht, entscheidet D-3, nicht dieser Patch.

---

## 5. K4 – E2-A-Evidenz in Teilsätzen (B8)

**Befund und Beleg:** Nachgestellt im [Gegenreview, B8](GEGENREVIEW_CLAUDE.md):
- T24 und T33 scheitert `met` an Evidenzen aus zwei wörtlichen, mit „ ... “ verbundenen Stellen. Je ein Teilsatz besteht die vollständige Prüfung.
- T24 und T26 scheitert `handled_by` an mehrsätziger Evidenz, gemeldet als „it is spoken, not narrated“.
- T24 kostet das die Anwesenheit der Schreiberin und damit Bearbeiterbuchung und Ankerprüfung.

**Ursache:**
- [`narration_evidence.js` L53–L63](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/narration_evidence.js#L53-L63): `narratedEvent` verlangt die Evidenz als **eine zusammenhängende Wortfolge innerhalb eines Satzes**.
- `metEvidence` ([L294](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/narration_evidence.js#L294)) und `deskHandlingEvidence` ([L462](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/narration_evidence.js#L462)) prüfen nur das Ganze.
- Aufrufer in world.js: `metArrivals` [L2046](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L2046) und `deskHandlers` [L2084](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L2084).

**Korrekturziel:** R1/R2 unverändert streng. Eine Evidenz, die aus mehreren wörtlichen Stellen besteht, zählt, wenn **eine** dieser Stellen für sich alle Bedingungen erfüllt.

**Änderung (eng):**
1. Die Evidenz in wörtliche Teilstücke zerlegen:
   - an „...“/„…“ und an Satzenden außerhalb wörtlicher Rede;
   - Teilstücke mit weniger als drei Wörtern entfallen.
2. Jedes Teilstück durchläuft die **vollständige** bestehende Prüfung gegen die Originalprosa:
   - `narratedEvent` mit Rahmung, Negation, Plan, Erinnerung und Hörensagen;
   - Identifikation nach §8;
   - Präsenz (für `met`) bzw. Bearbeitungsverb, Schalterobjekt und Handelnder (für `handled_by`).
3. Das erste bestehende Teilstück trägt den Beleg. Besteht keines, bleibt die Ablehnung mit dem Grund des aussagekräftigsten Teilstücks.
4. Bei mehrsätziger Evidenz meldet die Prüfung „the quote spans several sentences; one sentence of the reply is the evidence“ statt „it is spoken, not narrated“. Das hilft auch der Extractor-Reparatur.

**Bewusst unverändert:**
- §8-Pronomenregel: T7 bleibt abgelehnt, denn die Schreiberin wird erst nach dem Pronomen benannt;
- `HANDLES`/`DESK_OBJECT` ([L222–L223](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/narration_evidence.js#L222-L223)), Erweiterung siehe D-2;
- `known_at`- und Ankunftsbedingungen;
- `enter`-Pfad;
- Rückfall auf die `.158`-Literalprüfung.

**Regressionen:**

| Fall | `.174` (rot) | nach K4 (grün) |
|---|---|---|
| K4-1: Prosa I48, `met` mit „ ... “ (T24) | `met_evidence` | Schreiberin eingetreten (`met`) |
| K4-2: Prosa I66 (T33) | `met_evidence` | `met` angenommen |
| K4-3: Teilstück „A painted sign showed the clerk at work … the clerk was not there“ | abgelehnt | abgelehnt (Teilstücke einzeln: Bild bzw. Verneinung) |
| K4-4: Teilstücke mit Alarics Pronomen bzw. anderem Handelnden (`handled_by`) | abgelehnt | abgelehnt |
| K4-5: Teilstück in Erinnerungsrahmung („He remembered … ... the clerk waved“) | abgelehnt | abgelehnt (Rahmung aus dem Originalsatz) |
| K4-6: T24 `handled_by` nach K4-1 | „no Guild person present“ | „no handling of a contract step“ (Wortschatz); mit D-2 angenommen |
| K4-7: T7 Pronomen ohne vorherige Benennung | abgelehnt | abgelehnt |

**Abnahme:**
- Bestehende E2-A-Suiten (`npc_e2a*`, `fix158`) unverändert grün.
- Replay: nur Fälle mit mehrteiliger Evidenz ändern sich; jeden Eintritt einzeln prüfen (keine erfundene Anwesenheit).
- ST1.19: E2-A-Smoke mit zweiteiliger Evidenz.

---

## 6. K5 – Absprachenidentität (B3, B4)

**Befund und Beleg:**
- **`thread.t34.1`** (I72, I88, I116):
  - T36 Zusage Mullers (Kupfer für den Gnasher), T46 von Muller bestätigt, T48 bezahlt; nie erledigt.
  - T58 per gleicher ID durch Mullers 40-Silber-Schuld an Garvin Hesse ersetzt, Parteien `[npc.muller, pc]`.
- **`thread.t11.1`** (I22, I34): T11 Bericht über Hessa als `promise`, T17 per ID durch einen Szenenzustand ersetzt und an `pc` gebunden.

**Ursache:**
- **Extractor:**
  - Er verwendet IDs für andere Sachverhalte, stuft Berichte als `promise` ein und meldet die Erledigung nicht.
  - Seine Vorgabe ([`content/deltas.json`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/content/deltas.json), Delta `thread`, Index 28) verlangt die Listen-ID „never a new thread for a listed matter, however it is worded now“. Wann ein Sachverhalt ein **anderer** ist, sagt sie nicht.
- **Engine:** [`threads.js` L118–L147](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/threads.js#L118-L147) (`threadEvents`). Per ID ersetzt ein offenes Update den Text vollständig ([L135](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/threads.js#L135): „an update may say it better“) und vereinigt die Parteien. Eine deterministische Gegenstandsprüfung ist nicht möglich: Ein Wortvergleich hätte auch Dodds legitime Fortschreibung T21 getrennt.

**K5a – Extractorvorgabe (jetzt):** In der `thread`-Summary drei Sätze ergänzen bzw. präzisieren:
1. „The id names the same matter: the same parties and the same thing promised or owed. A different promise or debt of the same person is a new thread (id null).“
2. „promise/debt only when a party commits or confirms it in this reply; a report about someone (they sent for help, they are ill) is a fact or a rumor.“
3. „Resolve a promise or debt when the reply shows it kept or paid, also when the payment is part of a trade.“

Die Extractorprompt-Länge vorher und nachher über den Requestmessweg messen. `EXTRACTOR_VERSION` folgt der bisherigen Praxis (an Tests gebunden).

**K5b – Engine (nur nach Entscheidung D-1):**
- Bei `promise`/`debt` mit ID und Status `open` bleibt der gespeicherte Text die Absprache, wie sie geschlossen wurde. Die neue Formulierung wird als `latest` mitgeführt (nur im Record und in `#npc`, nicht als neuer Kartentext). Parteien und Erledigung bleiben wie heute.
- Wirkung im Pilot:
  - `thread.t34.1` behielte den Kupfertext mit `[muller, pc]`; das ist für die Kupferzusage richtig. Die Hesse-Schuld ginge als `latest` mit und würde nicht zur Absprache.
  - `thread.t11.1` behielte den Berichtstext. Er bliebe eine falsche `promise`, aber ohne „questioning Alaric“.
  - Dodds Thread behielte „offers a free ride“ statt „drives Alaric on“; das ist unschädlich.

**Bewusst unverändert:**
- R7 (`pc` nur bei anwesender NPC-Partei);
- `.173`-Zuordnung ohne ID (Art, Parteien, Eindeutigkeit);
- keine automatische Erledigung aus Handelsbuchungen, weil eine Verknüpfung von Verkauf und Schuld nicht deterministisch ist.

**Regressionen:**

| Fall | `.174` | nach K5 |
|---|---|---|
| K5-1: Inhalt der `thread`-Summary (Vorgabentest) | alter Wortlaut | neue Sätze vorhanden |
| K5-2 (nur K5b): Fold der Originalrecords I0–I116 | `t34.1`-Text = Hesse-Schuld | Text = Kupferzusage, `latest` = Hesse-Schuld, Parteien `[muller, pc]` |
| K5-3 (nur K5b): Dodds Thread T16→T21→T23 | Text ersetzt, erledigt | Text bleibt, `latest` gesetzt, erledigt wie bisher |
| K5-4: `.173`-Suite (A, A2, B, C, Altthread, Host) | grün | grün |
| K5-5: Karten- und `#npc`-Anzeige mit `latest` | – | Karte zeigt die Absprache; `#npc` nennt zusätzlich den neuesten Stand |

**Abnahme:**
- Replay: Mit K5a sind keine Änderungen zu erwarten, denn Rohantworten werden nicht neu erzeugt. Mit K5b ändern sich nur Threadtexte von ID-Updates; alle akzeptieren.
- Natürliche Wirkung von K5a: erst im nächsten Lauf (§12).

---

## 7. K6 – Szenenkorrektur und Personenidentität (B7, B6)

**K6a – Korrektur mit dem endgültigen Ort (B7, P3, deterministisch)**

**Beleg:** Der Engineblock T62 meldet in der Kopfzeile „crossroads cairn“, die Korrektur im selben Block „Alaric remains at the Woolpack … do not invent a completed journey“.

**Ursache:** [`world.js` L996–L1003](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L996-L1003) bildet den Text bei der `scene_context`-Ablehnung mit dem damaligen `scene.at`. Ein späteres angenommenes `arrive` derselben Antwort aktualisiert ihn nicht.

**Änderung:**
- Den Korrekturtext erst am Ende der Antwort mit dem endgültigen Ort bilden.
- Wurde Alaric nach der Ablehnung angenommen bewegt, entfällt „remains at“. Es bleibt der Hinweis, dass die Dinge der übersprungenen Szene nicht gebucht sind.

**Regressionen:**
- K6a-1: Fixture T61 (I121/I122). Rot: Korrektur nennt die Woolpack. Grün: keine Ortsbehauptung, Hinweis auf nicht gebuchte Szene.
- K6a-2: Ablehnung ohne spätere Ankunft. Korrektur unverändert.

**K6b – Wiedererkennung eines bekannten Gegenübers (B6, P2, nur nach Entscheidung D-4)**

**Befund:**
- T60 legt der Extractor für „The carter was in the yard“ eine neue Person mit `present: false` an. Die Engine erzeugt `npc.carter`, obwohl `npc.npccarter_woolpack` derselbe Fuhrmann ist und mit Alaric eine offene Mitfahrabsprache hat.

**Ursache:**
- [`keptHere`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L2106) wird nur bei `present !== false` aufgerufen ([L1111](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L1111)) und verlangt `e.at === scene.at`.
- Der Fuhrmann hatte nach `scene.left` (T57) kein `at` (geprüft im Fold vor I120). Eine Erweiterung über die Ortslinie allein hätte ihn deshalb nicht gefunden.

**Optionen:**

| Option | Inhalt | Bewertung |
|---|---|---|
| (a) | nur Extractorvorgabe, gebündelt mit K5a: „the <role> for a person already known here, above all a party of an open agreement, is that person's id; person.new only for someone new“ | ohne Risiko, Wirkung erst natürlich prüfbar |
| (b) | zusätzlich deterministisch: `person.new` (anwesend oder entfernt) wird der bekannten Person zugeordnet, wenn **genau eine** lebende bekannte NPC-Person mit gleichem Rollenkopf **Partei einer offenen Absprache mit Alaric** ist, zuletzt in derselben Siedlung war und kein `distinct_from` widerspricht | trifft den Pilotfall. Risiko: ein anderer Fuhrmann derselben Stadt würde zugeordnet. Wat Dodd (auch Fuhrmann, Ashbridge) wäre nur ausgeschlossen, weil seine Absprache erledigt war |

**Empfehlung:** (a) jetzt; (b) erst entscheiden, wenn ein weiterer Lauf das Muster wiederholt.

**Grenze:** Die zusammengezogene Antwort T61 (Hof, Begrüßung, Fahrt) bleibt eine Erzählerverdichtung. `met` des Fuhrmanns im Hof und `arrive.with` scheitern auch mit (a)/(b), weil Schritt 1 an der Kreuzung endete und der Fuhrmann vorher nicht anwesend war. Das ist eine natürliche Beobachtung, kein Patchziel.

---

## 8. K7 – Börse und Fehlbetrag im Ergebnistext (B9)

**Befund und Beleg:**
- T27 (I53/I54): „NOT BOUGHT — not enough coin. Nothing changes hands.“
- Der Erzähler erfindet „I don't break silver down here“. T28–T30 nennt ein Geldwechsler „one silver for ninety-seven/ninety-five coppers“; das verletzt den Kanon (10 Kupfer = 1 Silber).
- Der Spieler verliert rund 15 Züge; das Geldbuch bleibt korrekt.

**Ursache:**
- [`commands.js` L1224](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/commands.js#L1224) gibt bei `booked.error = 'not enough coin'` ([trade.js L285](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/trade.js#L285)) nur die Fehlerkurzform aus.
- Der vorhandene Weg für bedingte Käufe (world.js L3044: „NOT BOUGHT — N cp needed, he has M cp“) nennt beides.

**Änderung (eng):** Für „not enough coin“ den Text erweitern:
> NOT BOUGHT — {Preis} costs {cp}; he has {Börse} ({in Silber/Kupfer}), {Differenz} short. Silver and copper are one purse (10 copper = 1 silver): no coin needs changing. Nothing changes hands.

Gleiche Form im Weg für bedingte Käufe. Kein neuer Kontextabschnitt, kein Erzählervertrag.

**Regressionen:**
- K7-1: `offer.accept` 80 cp bei 70 cp. Rot: Kurzform. Grün: Börse, Differenz, Kanonsatz.
- K7-2: Kauf mit ausreichender Börse. Unverändert.

**Abnahme:** ST1.19-Smoke Kauf mit Fehlbetrag. Ob der Erzähler danach den Wechsel nicht mehr erfindet, zeigt erst ein natürlicher Lauf.

---

## 9. K8 – Kleinpaket P3 (B11, B12)

| Nr. | Befund | Änderung | Regression |
|---|---|---|---|
| K8-1 | T16: `learn` mit `s` = lernender NPC, `p: name`, `o` = Alarics Name → Fakt „Wat Dodd name = Alaric Red“ | Ein `name`-Fakt über eine NPC-Person, dessen Wert Alarics Name ist, wird abgelehnt (`identity_subject`). Der beabsichtigte Wissensgewinn über `pc` bleibt nur bei korrektem Subjekt | rot/grün mit Rohantwort I32; bestehende `learn`-Tests |
| K8-2 | T11: `role: "null"` als Beruf und Deskriptor | `"null"`, `"none"`, `""` als fehlende Rolle behandeln (world.js `occupation`, `person.new`-Deskriptoren) | rot/grün mit Rohantwort I22 |

---

## 10. Getrennte Finanzfolgeprüfung (nicht Teil dieses Plans)

- **B10, T57:** Ein bedingtes Angebot („when the bell goes“) wird durch die erfüllte Bedingung nie fest. Eine Zustimmung im Voraus kauft nur feste Zeilen ([world.js L3030](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc/avereth-engine/src/v4/world.js#L3030)). Der Extractor meldete die feste Nennung „Two copper, aye“ nicht. Ergebnis: erzählt bezahlt, nicht gebucht.
- **Reibung der `.144`-S2-Regel:**
  - T37–T40: „Fourteen the pair“, Plannerfehler T38.
  - T52–T55: Bett und Abendessen mit zwei Plannerfehlversuchen.
  - Die Regel ist gewollt; die Kosten in Zügen sind jetzt natürlich belegt.

**Empfehlung:** eigene Analyse nach dem Muster des [Zahlungsaudits](../../patch_plans_10b/PAYMENT_SYSTEM_AUDIT.md), mit diesen drei Originalfällen. Keine Änderung an S1/S2 aus diesem Plan heraus.

## 11. Offene Designentscheidungen

| Nr. | Frage | Empfehlung |
|---|---|---|
| **D-1** | Bleibt der Text einer Absprache nach Anlage fest, mit neuer Formulierung als `latest` (K5b)? | **ja, mit K5a ausliefern**: verhindert stille Bedeutungsverschiebung, kostet keinen Kartenplatz. Alternative: nur K5a und abwarten |
| **D-2** | Bearbeiterwortschatz erweitern (`checked`, `pressed`, `sealed`, `pulled`) und `desk`/`tray` als Schalterobjekt? | **vorsichtig ja** für die drei Verben mit Siegel/Hauptbuch/Zettel (T24 „checked it against a ledger“, T26 „pressed the Guild's seal“, „pulled a fresh slip“), Negativtests für Alaric und Umstehende. `tray` nicht (zu allgemein) |
| **D-3** | Braucht `relevant` eine Mindestzuteilung unter dem Budget? | **erst nach K3-Messung**; kein Vorgriff |
| **D-4** | Deterministische Wiedererkennung über eine offene Absprache (K6b, Option b)? | **noch nicht**; zuerst Vorgabe (a) und weitere natürliche Daten |
| **D-5** | Darf ausgestellte Ladenware ohne Kauf per `take` mitgenommen werden? | eigene Entscheidung (Diebstahl/Besitz); K2 verhindert nur die Verdopplung |
| **D-6** | Zählt ein vom Extractor in Anführer und Gruppe geteiltes Rudel für das `danger`-Fenster als eine Gruppe (V1)? | **abwarten**; regelkonform, Erzähler folgte der Korrektur |

## 12. Was erst weitere natürliche Daten zeigen

- **NPC E3:** Nur ein Ankerkandidat in 70 Eingaben, ungültig.
  - Nötig sind Wiederbegegnungen mit bekannten Personen.
  - Zu klären: Meldet der Extractor Dauermerkmale überhaupt, und halten sie die 80 Zeichen ein?
  - Erst danach über Vorgaben oder Kartenkappung entscheiden.
- **Wirkung K4 und D-2:** Wie oft werden Wiederbegegnung und Bearbeiter mit Teilsatzbelegen jetzt angenommen, und gibt es Fehltreffer? Messpunkt: Gildenrückkehr, Annahme, Abgabe.
- **Wirkung K5a/K6(a):** ID-Wiederverwendung, Pseudo-Absprachen, Erledigungen, doppelte Personen.
- **Wirkung K3:** Nutzt der Erzähler Detailkarten und `relevant` sichtbar? Das zeigt die Originalpassage, nicht die Diagnose allein.
- **PULSE:** Würfe im Dungeon, Rastunterbrechung, Wanderer, Pausen in unsicherer Umgebung. Paket D erst mit mehreren Läufen und Seeds.
- **Erzählerverdichtung** mehrerer Orte in einer Antwort (T61): Häufigkeit und Folgen.
- **Heuristik `narrated`** (T46 falsch-negativ): Häufigkeit; danach entscheiden, ob Runner oder Engine einen Gerücht-/Threadbeleg mitzählen sollen.

**Vorschlag für den nächsten Lauf:**
- nach K1–K4 (+K7) und dem Vorgabenbuild K5a/K6a: ein freier `npc-wary`-Lauf mit Rückkehr zu bekannten Personen;
- keine erzwungenen Anker, keine Skripte;
- der bestehende Runner misst Ankerauslieferung, Absprachen und Kontext bereits.

## 13. Gemeinsamer Abnahmerahmen

| Schritt | Inhalt |
|---|---|
| Rot | Fixture-Fälle aus den Pilot-Originalen gegen unverändertes `.174`; Rot muss am Verhalten scheitern, nicht an fehlenden Funktionen |
| Grün | dieselben Fälle nach dem Patch |
| Suiten | betroffene Suiten (`pulse_*`, `npc_e2a*`, `npc_e2b*`, `npc_e3`, Handel/Objekte) und `npm test` vollständig |
| Replay | Korpus 2235 Fälle gegen `.174`; jede Abweichung einer Patchursache zugeordnet und akzeptiert, sonst Stopp |
| Kontext | K3 Pflichtmessung; sonst Nachweis „unverändert“ an den Standardmesspunkten |
| ST1.19 | Smoke Standard und Failsoft mit den neuen Prüfungen (Dungeoneintritt, Kauf eines ausgestellten Gegenstands, zweiteilige Evidenz, Fehlbetrag) |
| Doku | Patchnote je Build im Produktbranch; Projektstand auf `main` |
