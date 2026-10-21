# Patch 8.1: Dungeon-Gate, Gruppenkampf und Spielintegration (4.3.0-c.6.6.26)

Basis: Commit `f3b5581` (4.3.0-c.6.6.25, Patch 8 Living Dungeons). Grundlage sind der Auftrag „Patch 8.1, Revision 2“ und der Livetest vom 21.10.2026, 10:17 (`tests/v4/live_1021d.json`).

Grundsatz: Das LLM schreibt Sprache, die Engine besitzt Kampf, Geld, Zustand, Aufträge und Dungeons.

Produktiv ist nur der Pfad V4-C. V3 und V4-A bleiben unverändert: `groupJoiners` liefert dort nichts, Gate-Karte, Board-Karte und STATE NOW hängen an `envx.c` bzw. `outcome.c`.

## 1. Was der Livetest zeigte

| Nachricht | Befund | Ursache |
|---|---|---|
| #11 | „Cull the Crystal Beetles“ verlangt 6 Käfer. Ein Zyklus von Glimmerdeep hält 2 bis 4 | Der Board-Generator kannte die Population nicht, `cullNumbers` übernahm jede Zahl |
| #12 | „wool cart notice — taken“, obwohl das Board ihn noch führte | Der Firewall-Filter kannte „taken“ nicht als Auftragsstatus |
| #16–#18 | Der Wächter verkauft „Entry, 10 cp“ als eigenes Angebot. Alaric zahlt, danach verlangt das Gate seine 10 cp noch einmal | Das Gate-Angebot entstand erst beim Eintreten. Das Story-Angebot wurde wie ein Ladenangebot gebucht |
| #16 | Kein Gate-Display, obwohl Alaric davorsteht | Es gab keine Anzeige |
| #24 | Awareness „the nearer one's head came up …; both watched him now“ wurde verworfen | Das Zitat verband zwei Sätze der Antwort. Außerdem las die Zählprüfung „the nearer one“ als 1 |
| #25–#27 | Angriff auf Glass Beetle B: B kämpft allein, A schaut zu und wird später in einem zweiten Encounter bekämpft | Nur das Ziel und erzählte Angreifer wurden Kombattanten |
| #28, #30 | Der Extractor verbraucht 2.500 Tokens mit Überlegen und liefert eine leere Antwort. Die Reparatur wiederholt die leere Antwort | Tote der letzten Züge fehlten im Katalog. Die Reparatur war für ungültiges JSON gebaut |
| #29 | Der Narrator lässt A bei 1/38 HP „zerplatzen“ und B (tot) „fliehen“ | Es gab keinen bindenden Endzustand nach dem Kampfschritt. `floorText` meldete „met, still standing“ |

## 2. Was der Patch einführt

| Bereich | Umsetzung | Ort |
|---|---|---|
| Gate-Angebot | `offer.gate.<root>` mit `dec.gate.<root>` entsteht idempotent beim Ankommen am Gate (`syncEvents`), nicht erst beim Eintreten. Entfällt die Gebühr (Waiver), wird es mit `expired` geschlossen | `living.js gateOfferEvents` |
| Eintritt nur über das Gate | Ein Story-Angebot über Eintritt (entry, admission, toll, fee, pass, way in) am Gate wird verworfen (`gate_fee`) und korrigiert. Andere Waren des Wächters (Fackel) bleiben | `world.js offer`, `living.js entryLine` |
| Narrator-Zeile | GATE nennt die Gebühr als „the engine's one fixed price (… nobody asks it twice or sells entry)“, „his entry fee is paid“ oder „no fee for him“ | `living.js contextLines` |
| Agency | „pay the fee“ zahlt nur. „pay and enter“ macht beides in Reihenfolge. „enter“ mit offener Gebühr hält am bestehenden Angebot. Ein freies Gate fragt nichts. Ein gültiger Pass fragt keinen neuen Preis | `commands.js livingGo` (bestehende Kette) |
| Waiver | `gate.contract_free` (Content, beim Etablieren gespeichert) plus ein aktiver Gildenvertrag mit `q.dungeon === root` und Tötungs- oder Clear-Arbeit. Abgeleitet aus dem Zustand, keine Textsuche am Gate | `living.js waiverOf`, `gateState` |
| Gate-Karte | „SYSTEM — DUNGEON GATE · X“: Status, Belegung/Kapazität, Gruppe, Zyklus mit Reset in d/h/m, bekannte Ebenen, Zugang, Gebühr, ENTER DUNGEON? oder ENTRY REFUSED | `living.js gateCard`, `display.js worldPanel`, `commands.js` |
| Reset-Anzeige | „renews in 2d 4h“, „2h 5m“, „59m“, oder „renewal pending“, auch im HUD | `living.js renewText` |
| Lore | `lore.dungeons`: Gate-Displays sind bekannt, nicht jeder Dungeon hat eins. Glimmerdeep: Getötetes und freie Kristalle gehören den Abenteurern | `content/lore.json` |
| Gruppenkampf | Anwesende Mitglieder einer feindlichen Gruppe treten demselben Encounter bei, jedes mit eigener Initiative, eigenen HP und eigenem Schicksal | `src/v4/group_combat.js` (neu), `engine.js` |
| Ebenenzustand | „met, alive“ / „1 of 2 alive; 1 dead“ / „all 2 defeated“ aus dem Status der Individuen | `living.js slotState` |
| STATE NOW | Letzte Zeile des Kampfschritts: jeder Kämpfer lebt (HP), ist tot, geflohen oder hat sich ergeben. Dazu Tote der Gruppe von vorher, Alaric, „fight goes on“ / „fight OVER“ | `context.js stateNow` |
| Gruppennamen | Ein Mitglied mit dem geteilten Aussehen seiner Gruppe heißt „a glass beetle“, nicht „the dog-sized beetles with glassy faceted sh“ | `context.js fightName` |
| RECENT DEAD | Der Extractor-Katalog nennt die Toten der letzten 3 Züge hier: nie `creature.new`, nie lebend, nie fliehend | `catalog.js extractorCatalog` |
| Reparatur bei leerer Antwort | Eine kurze Nachforderung „Answer now with the JSON object alone … Do not deliberate“, ohne die leere Antwort zurückzuspielen. Höchstens eine. Bleibt die Antwort leer, wird nichts angewendet und der Zustand bleibt | `extract.js extractorRequest` |
| Awareness-Evidenz | Ein Zitat aus mehreren Teilsätzen gilt, wenn jeder Teilsatz (≥ 3 Wörter) in der Antwort steht. „the nearer one“ ist keine Zahl | `identity.js resolveRef` |
| Cull-Klemme | Die Zahl eines Dungeon-Culls wird auf die Mindestpopulation eines Zyklus begrenzt (nur Minions der Art; Wächter/Boss nur, wenn namentlich genannt). Hält der Dungeon die Art nicht: Listing verworfen | `guild.js dungeonCull`, `cullNumbers`, `noCullWhy`, `living.js cullPopulation` |
| Auftragsort | `q.dungeon` und, bei genau einer Ebene, `q.floor` beim Buchen | `guild.js bookBoard` |
| Board-Karte | „SYSTEM — GUILD BOARD · Rank · Stadt“ mit Titel, Zahl, Rank, Auftraggeber, Belohnung, Aufgabe | `commands.js boardCard` |
| Board-Kanon | „taken, claimed, gone, withdrawn, available, count, forfeit …“ über einen Gildenvertrag ist Engine-Zustand. Die Korrektur nennt den Vertrag auch über den Titel | `firewall.js`, `ownership.js claimedStatus` |
| Vertragsbedingungen | In der Questzeile: „goal, count, payout and status here are its whole binding terms: a clause the story adds … binds nothing“ | `context.js` |
| Kartendarstellung | `SYSTEM — `-Zeilen werden im Panel als Überschrift gesetzt | `host.js displaySystemPanel` |

## 3. Review 1: Architektur vor der Implementierung

**Ein Besitzer je Fakt.**
- Die Gebühr steht in `dungeons[root].gate` (Patch 8). Das Angebot `offer.gate.*` ist nur ihre Darstellung als zustimmungspflichtige Entscheidung.
- Zahlung und Pass laufen über die bestehende Kette (`offer.accept` → Pass). Es gibt kein zweites Geldsystem.
- Der Waiver wird bei jeder Prüfung aus Vertrag und Gate abgeleitet (`waiverOf`). Nichts wird zusätzlich gespeichert.

**Warum das Angebot beim Ankommen entsteht.** Im Livetest sprach der Wächter den Preis aus, bevor Alaric eintreten wollte. Ohne kanonisches Angebot erfand die Story eins. Mit `syncEvents` entsteht es, sobald Alaric am Gate steht, und zwar idempotent: offen bleibt offen, ein zweites gibt es nicht. Replay und Swipe wenden dieselben Events an.

**Gruppenkampf ohne Gruppen-KI.**
- `groupJoiners` entscheidet nur, *wer* im Kampf ist, nie *wie* gekämpft wird. Das bleibt `npcDecide`.
- Es gibt eine einzige Bestimmung für alle Kampfstarts auf Pfad C: `combatTurn` (neuer Kampf und Beitritt im laufenden Kampf), `engagementTurn` und `openCommitted`.
- Pro Kampfzug kommt kein LLM-Aufruf dazu.

**Was „feindliche Gruppe“ heißt, nur aus dem Zustand:**
- ein Dungeon-Slot (`entity.slot`);
- eine erzählte Bedrohung (`scene.threats`);
- eine feindliche Seite im Kampf;
- eine Gesetzlosen-Rolle (`actorTraits.hostileRole`).

Verwandtschaft oder ein Etikett allein reichen nicht.

**Kreaturenrudel.** Greift Alaric ein Rudeltier an, verteidigt das Rudel es. Ausnahme: Die Story hat es als `threat: false` markiert (Hirsche, Vieh, Haustier).

**Personen.** Personen treten nur einer als feindlich etablierten Gruppe bei. Eine Fraktion macht niemanden zum Gegner.

**Wer draußen bleibt:**
- Wer laut Story flieht, hält, verhandelt, in Deckung geht oder aufgibt (`STAYS_OUT`).
- Wer Alaric nicht bemerkt hat (Stealth), tritt erst bei, wenn der Kampf über seine Eröffnung hinausgeht (`later`). Endet der Hinterhalt den Kampf, tritt es nie bei.

**STATE NOW statt Prosaprüfung.** Die Engine kennt nach jedem Schritt den Zustand jedes Kämpfers. Den als letzte, bindende Zeile zu geben ist billiger und verlässlicher als eine nachträgliche Prüfung der Prosa. `combat_truth.js` bleibt als Netz bestehen.

**Cull-Klemme statt neuer Questlogik.** Die Population steht in den Slots des etablierten Dungeons. Ist er noch nicht etabliert, kommt sie aus dem *nicht ausgelösten* Ergebnis von `establishEvents`, das deterministisch ist. Das Board legt keinen Dungeon an.

## 4. Bewusste Entscheidungen und verworfene Alternativen

| Entscheidung | Verworfene Alternative | Grund |
|---|---|---|
| Story-Angebote über Eintritt am Gate verwerfen, andere Zeilen behalten | Jedes Angebot des Wächters verwerfen | Der Wächter darf eine Fackel verkaufen (Auftrag) |
| Waiver aus `q.dungeon` + `contract_free` | Den Vertragstext am Gate nach dem Dungeonnamen durchsuchen | Textsuche am Gate ist ausdrücklich ausgeschlossen. `q.dungeon` wird beim Buchen einmal festgelegt |
| Alte Verträge ohne `q.dungeon` bekommen keinen Waiver | Nachträglich aus dem Titel ableiten | Wäre Textsuche, und alte Spielstände sollen sich nicht nachträglich ändern |
| Mitglieder einer bereits kämpfenden Gruppe ziehen niemanden nach | Jeder Treffer auf ein Gruppenmitglied zieht die ganze Gruppe | Patch 5: vier Wölfe, zwei greifen an, zwei halten sich zurück. Die Gruppe hat beim Eintritt entschieden |
| Die Selbstverpflichtung eines NPC zieht nur ihn in den Kampf, nicht seine Verwandten | Verpflichtung als Gruppenbeleg | Die Story hat gewählt, wer angreift |
| Unbemerkte Mitglieder kommen nach der Eröffnung | Sofort beitreten | Stealth wäre sonst wertlos |
| Leere Extractor-Antwort: eine kurze Nachforderung ohne Echo | Die leere Antwort als Assistant-Nachricht zurückspielen (bisher) | Das Modell sah nichts, woran es anknüpfen konnte, und überlegte erneut bis zum Limit |
| STATE NOW nur bei `outcome.c && outcome.board` | Auch auf V3/V4-A | Legacy bleibt unverändert |
| Board-Karte nur auf Pfad C, nicht bei `ahead` | Immer | Wer die Halle noch nicht erreicht hat, sieht das Board nicht |
| Kein neuer Gruppen-Encounter-Typ | Eigener Gruppenkampf neben `encounter` | Zwei Kampfsysteme widersprächen der Strangler-Regel |

## 5. Review 2: Integration nach der Implementierung

- **Bestehende Schwarmtests.** Einige Tests stellen bis zu zwölf Käfer einer Gruppe in eine Szene und prüfen Einzelkämpfe. Mit der Gruppenregel kämen alle hinein. Angepasst wurden `hotfix_scroll`, `patch71` und `patch72_items`: Unbeteiligte verlassen vorher die Szene (`scene.left`), oder die Erwartung folgt der neuen Semantik (der Schwarm kämpft mit). Die geprüften Mechaniken (Rolle, Loot, Gegenstände) sind unverändert.
- **Firewall.** `v9_04` und `v12_04` des Firewall-Korpus werden jetzt verworfen (Status „taken“ bzw. „count“ über einen Gildenvertrag). Beides sind Behauptungen über Engine-Zustand, also ist das Verwerfen richtig.
- **Angebotsstatus.** Ein nicht mehr fälliges Gate-Angebot wird mit `expired` geschlossen. Der Validator erlaubt nur `open`, `accepted`, `declined` und `expired`.
- **Kontextbudget.** Die neuen Zeilen kosten den Narrator 29 bis 40 Tokens je Zug. Bei Nachricht 17 fiel dadurch zuerst RELEVANT heraus. Nach dem Kürzen bleibt RELEVANT dort erhalten. Im Kampfzug 27 fällt jetzt `relevant` statt `lore` (siehe §7).
- **Mutationsproben.** Jeder Fix einzeln zurückgenommen:

| Fix entfernt | Fehlschlagende Tests |
|---|---|
| Gruppenbeitritt | group 1–5, 7 |
| Angebot beim Ankommen | gate 1, 3, 4, 6 |
| Cull-Klemme | board 1, 3 |
| Verwerfen des Story-Eintritts | gate 2 |
| STATE NOW | truth 2 |
| Alte Reparatur | truth 4 |

## 6. Review 3: kritischer Abschluss

Der Gesamtdiff wurde noch einmal auf Wechselwirkungen gelesen:
- `worldPanel` zeigt die Gate-Karte nur, wenn der letzte `scene.moved` der Antwort an einer Dungeon-*Wurzel* endet (`livingOf` kennt nur Wurzeln). Innere Räume zeigen keine Karte. Wer aus dem Dungeon zum Gate zurückkehrt, sieht sie erneut: Das ist eine neue Ankunft und gewollt.
- `combatTurn` prüft die Legalität eines Angriffs, bevor jemand beitritt. Ein unmöglicher Angriff startet nichts und zieht niemanden hinein (Test group 6). Späte Beitritte entfallen bei `illegal` und bei `terminal`.
- Im laufenden Kampf ziehen nur *neu* eintretende Leads (frisches Ziel, Beitretende, von Flächenangriffen Erfasste) ihre Gruppe nach, mit `exclude` aller bisherigen Kämpfer. Kein Mitglied wird zweimal hinzugefügt.
- `claimedStatus` meldet „gone“ nur für Teilsätze, die ohnehin als Engine-Zustand erkannt sind (`stripOwned` → `ownedClause`). Eine Erzählung wie „die Käfer sind weg“ ohne Vertragsbezug bleibt unberührt.
- Die Pronomen-Ausnahme der Zählprüfung (`\w+er one`) erfasst auch „number one“. Das ist harmlos, weil es dort ebenfalls keine Gruppengröße ist.
- **Secrets.** Die Fixture enthält nur `mes`, `is_user`, `is_system` und `extra.avereth`/`avereth_panel`. Die Prüfung auf Schlüsselmuster ist negativ. Keine Logs, Header oder Endpunkte.

## 7. Grenzen und offene Punkte

- **Hirsche und andere friedliche Tiere** bleiben nur dann draußen, wenn der Extractor sie mit `threat: false` markiert hat. Fehlt die Markierung, verteidigt eine Herde ihr Mitglied wie ein Rudel.
- **Laufender Livetest-Vertrag.** „Cull the Crystal Beetles“ im Live-Spielstand behält 6: Bereits gebuchte Aufträge werden nicht umgeschrieben. Die Klemme greift für neue Listings. Alte Verträge ohne `q.dungeon` erhalten keinen Waiver.
- **RELEVANT im Kampf.** In Kampfzügen kann der Abschnitt RELEVANT wegen des Budgets (1400 Tokens) wegfallen. Der Kampfzustand hat Vorrang.
- **NPC-Gerüchte über Auftragsstatus** („the wool cart job's taken“) werden nicht als Fakt gespeichert, sondern verworfen und korrigiert. Eine gewollte Fiktion „jemand anderes hat ihn genommen“ ist damit nur über die Engine möglich (`takenByOthers`).
- **Spätere Mitglieder** einer Gruppe, die erst nach Kampfbeginn die Szene betreten, kommen wie bisher über ihre erzählte Verpflichtung hinein (`addCombatant`), nicht automatisch.
- **Die Fixture** ist der Livetest bis #31 (echte Daten) plus synthetische Fortsetzungen im Test (scripted Planner und Extractor). Live gegen ein echtes Modell wurde 8.1 nicht gespielt.

## 8. Prompt- und LLM-Änderungen

Es gibt keinen neuen LLM-Aufruf. Der Extractor repariert wie bisher höchstens einmal.

Tokens neu gegenüber alt an Fixture-Zügen:

| Prompt | Zug 17 | Zug 21 | Zug 25 | Zug 29 |
|---|---|---|---|---|
| Narrator | +29 | +29 | +30 | +40 (STATE NOW) |
| Extractor | 0 | 0 | 0 | +67 (RECENT DEAD) |
| Planner | 0 | 0 | ≈0 | ≈0 |

Neue oder geänderte Textstellen:
- GATE-Gebührklausel;
- STATE NOW — BINDING;
- „these are its whole terms“ in der Questzeile (nur Pfad C);
- RECENT DEAD im Extractor-Katalog;
- die Reparaturnachricht bei leerer Antwort;
- die Korrektur „Entry to X is fixed by the engine at its gate …“.

## 9. Events und Felder

| Event/Feld | Neu oder geändert |
|---|---|
| `offer.created` `offer.gate.<root>` (`seller: 'gate'`, `canon: true`, `service: 'dungeon_entry'`) | entsteht jetzt beim Ankommen (`syncEvents`) |
| `decision.opened` `dec.gate.<root>` (`kind: 'payment'`) | ebenso |
| `offer.closed` / `decision.closed` mit `expired` | neu, wenn die Gebühr entfällt (Waiver) |
| `dungeons[root].gate.contract_free` | neu, aus `lore.json living.gate` beim Etablieren |
| `quest.dungeon`, `quest.floor` | neu, beim Buchen eines Dungeon-Auftrags |
| Listing `l.dungeon` | neu, beim Parsen des Boards |
| Firewall-Regel `gate_fee` | neu |
| `encounter.combatants` | enthält jetzt Gruppenmitglieder (bestehendes Format) |

Alte Kampagnen brauchen keine Migration. Ein schon etablierter Glimmerdeep ohne `contract_free` fällt auf den Content-Wert zurück (`x.gate.contract_free ?? content`).

## 10. Tests

| Datei | Inhalt |
|---|---|
| `tests/v4/patch81.test.js` (29) | gate 1–8 (Angebot beim Ankommen, Story-Eintritt verworfen, zahlen/eintreten, frei/Pass/voll/zu, Waiver und Gegenfälle, Replay/Swipe); display 1–4 (Karte bei Ankunft, d/h/m, Karte beim Ansehen, Lore); group 1–7 (Käfer A+B, ein Encounter bis zum Ende, Wolfsrudel/Hirsche/Personen, feindliche Gruppen, Stealth, illegaler Angriff/AoE, engage und Story-Verpflichtung, Patch-5-Wölfe); truth 1–5 (Ebenenzählung, STATE NOW, RECENT DEAD, leere Antwort, Teilsatz-Evidenz); board 1–5 (Klemme 2 statt 6, Boss nur namentlich, Board-Karte, „taken“ verworfen, Vertragsbedingungen) |
| `tests/v4/live_1021d.json` | Livetest 21.10.2026 10:17, 31 Nachrichten, ohne Secrets |
| Angepasst | `v4_firewall` (v9_04, v12_04 verworfen), `hotfix_scroll`, `patch71`, `patch72_items` (Schwarm, siehe §5) |

`npm test` 960/960. `smoke:st:c` OK.
