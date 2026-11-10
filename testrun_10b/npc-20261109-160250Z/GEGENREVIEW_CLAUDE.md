# NPC/PULSE-Pilot 01 – unabhängiger Gegenreview (Claude, 10.11.2026)

**Run:** `20261109-160250Z-npc_pulse_test`, Build `4.3.0-c.6.6.174`, Runner [`2a8b54e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc), Profil `npc-sociable` (Warrior), 70 Eingaben. **Gegenstand:** die Originaldaten in [originals/originals.tar.xz](originals/originals.tar.xz) und der vorhandene [GPT-Review](REVIEW.md). **Ergebnis:** [Fachplan der Korrekturen](FACHPLAN_PILOT01_KORREKTUREN.md).

Zählweise wie im GPT-Review: T1–T70 sind die gesendeten Spielereingaben, I0–I140 die nullbasierten Chatnachrichten ohne Metazeile. Die Engine zählt eigene Züge (`state.turn`); diese Zahl liegt ab T22 um bis zu fünf unter T, weil Befehle wie `#assign` und `#status` keinen Erzählerzug bilden. Im Folgenden gilt immer T.

## 1. Urteil

**Ich bestätige die drei Kernbefunde des GPT-Reviews:** die wiederverwendete Absprachen-ID, den doppelten Primer und den doppelten Fuhrmann. Die Ursachen liegen allerdings zum Teil anders, als GPT annimmt. Dazu kommen **zwei übersehene, im Code eindeutig belegte Fehler**:

1. **Dungeoneintritt T65:** Die Engine verwirft den Angriff der Gegner, die sie selbst per DUNGEON AHEAD gebucht hat, mit der PULSE-Regel. Dem Erzähler meldet sie anschließend „no fight started“. GPT führt diesen Fall als Schutzbeispiel; er widerspricht jedoch dem PULSE-Fachplan.
2. **Kontextbudget:** Der Geräte-Katalog `gear_market` (rund 506 Tokens, Priorität 0) wird schon durch beiläufige Wörter wie „armor“ oder „shield“ in der letzten Antwort ausgelöst. Er verdrängt dann die NPC-Detailkarten (`present`) und den Abruf aus dem Kampagnenrecord (`relevant`). `relevant` erreichte den Erzähler nur in **2 von 63** Erzählerzügen (T4, T5). In 60 wurde es gebildet und verworfen, in einem gar nicht gebildet.

Weitere übersehene Befunde:
- Die Zusage Mullers wurde T48 bezahlt, aber nie erledigt.
- Mehrsätzige oder mit „...“ verbundene Evidenzen kosten die Rückkehr der Schreiberin T24 und mit ihr die Bearbeiterbuchung.
- Ein erzählt bezahltes Abendessen T57 wurde nicht gebucht.
- T62 erhielt eine widersprüchliche Korrektur.
- Bei Wat Dodd steht der falsche Fakt „name = Alaric Red“.

Drei Bewertungen des GPT-Reviews widerlege ich (§4):
- Das PULSE-`life`-Fenster T46 ist sichtbar erzählt.
- Den zweiten Primer holte T43 der Planner per `take`, nicht die Extraktion.
- Die T26-Ablehnung beruht nicht auf „gesprochener Evidenz“, sondern auf Satzgrenzen und dem Wortschatz der Prüfung.

**Gesamtbild:** Weder ein Architekturumbau noch eine Budgeterhöhung ist begründet. Alle bestätigten Fehler lassen sich mit eng begrenzten Korrekturen an genau benennbaren Stellen beheben. E3 und große Teile von PULSE B/C sind in diesem Lauf **nicht abgedeckt**, aber nicht widerlegt.

## 2. Methode und Integrität

| Prüfung | Ergebnis |
|---|---|
| Archiv | `originals.tar.xz` entpackt; alle 14 SHA-256-Werte stimmen mit dem [Quellenmanifest](SOURCE_MANIFEST.md) überein |
| Eigener Fold | `chat.jsonl` mit der Engine von `2a8b54e` (Engine `.174`) gefaltet: 141 Nachrichten, 70 Eingaben, **0 Foldfehler** |
| Eigene Auswertung | je Nachricht Plan, Events, Ablehnungen, Korrekturen, Roh-Extraktion und Kontextdiagnose; gezielte Verläufe je Person, Thread, Objekt und PULSE-Wurf |
| Nachgestellte Prüfungen | `metEvidence` und `deskHandlingEvidence` (`src/v4/narration_evidence.js`) auf der Originalprosa mit den Originalevidenzen und mit deren Teilsätzen ausgeführt (§3.1 B8) |
| Erzählerrequests | aktuellen Engineblock einzelner Züge aus `chat-completions.jsonl` gelesen (T19, T62), Kontextdiagnose aller 63 Erzählerzüge ausgewertet |
| Code | die beteiligten Pfade auf `2a8b54e` gelesen; Zeilenangaben im [Fachplan](FACHPLAN_PILOT01_KORREKTUREN.md) |
| Nicht gemacht | kein neuer Modellaufruf, kein ST-Lauf, kein Korpus-Replay; keine Codeänderung. Rot-Grün-Nachweise sind Teil der späteren Patches |

## 3. Befunde

### 3.1 Bestätigte Fehler

**B1 – Dungeoneintritt: PULSE verwirft die eigenen Slotgegner (T65, I129–I134). P2 (hoch).**
- **Ablauf:**
  - T65 betritt Alaric vom Hang (`loc.mossback_warrens`) aus den ersten Raum.
  - Das Ergebnis des Spielerzugs enthält „DUNGEON AHEAD … there he meets 3 goblin scouts … bring exactly these“. Die Engine bindet die drei Goblins per `dungeon.slot` an den Raum.
  - Der Erzähler lässt sie angreifen („the nearest one's weight shifted, and it came“). Der Extractor meldet `hostile` und `intent`.
  - Beides wird **6-mal mit der Regel `pulse`** verworfen: „no new attacker was authorized in this scene“.
  - Die Korrektur an den Erzähler lautet: „did not attack Alaric … (the engine's PULSE); no fight started“.
- **Folgen:**
  - T66 ist der Heavy Slash außer Reichweite, weil kein Kampf läuft.
  - Erst T67 eröffnet Alaric selbst den Kampf, ohne Hinterhaltsregel für die Goblins.
- **Ursache:**
  - `pulseBegin` setzt `governs: false` nur, wenn Alaric zu Beginn des Zugs schon **im** Dungeon steht (`insideDungeon`).
  - Am Eingang bleibt `governs: true`, und die PULSE-Sperre für in dieser Antwort neu eingeführte Angreifer trifft die Slotgegner.
  - Dagegen sagen der Code-Kommentar in `pulse.js` und der [PULSE-Fachplan](../../patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) (Abschnitt C, Punkt 1: „DUNGEON AHEAD bleibt Autorität“; Paket A, Testfall A2 (6): DUNGEON AHEAD und anwesende Gegner nach „unveränderten Slot- und Envelope-Regeln“): Für diese Gegner gilt allein die Dungeon-Firewall.
- **Abgrenzung:** Das ist kein Schutzfall, wie GPT ihn einordnet. Die Engine widerspricht ihrer eigenen Buchung. Jeder Dungeoneintritt vom Eingang aus, bei dem die Gegner zuerst handeln, ist betroffen.

**B2 – Kontextpriorität: `gear_market` verdrängt NPC-Karten und Abruf (ganzer Lauf). P2.**
- **Zahlen aus `narration.context` aller 63 Erzählerzüge:**
  - In **27** Zügen überstieg schon der Priorität-0-Teil das Budget von 1400 (Überlauf 12–606 Tokens).
  - `present` (Priorität 1) fiel in allen 27 weg. In **11** davon enthielt es Karten anwesender NPCs, zum Beispiel die Bedienung der Woolpack T50–T57, mit der Alaric um Bett und Essen verhandelt, und Dodd T18–T20 während der Mitfahrt.
  - `relevant` (Priorität 2) wurde in **60** Zügen gebildet und nicht ausgeliefert.
- **Hauptverursacher:**
  - `gear_market` mit 506–567 Tokens in **19** Zügen, darunter auf dem Karrenweg T19, im Dungeon T65 und auf dem Hof T64.
  - Ausgelöst wird es, wenn Eingabe **oder letzte Antwort** eines der Wörter `shop|buy|sell|merchant|smith|gear|equipment|armor|weapon|shield` enthält. Auf der Landstraße war das „armor“, im Dungeon „shield-sense“.
  - Daneben belegen `quests` (Priorität 0, 387–451 Tokens) und `resolved` (bis 706) dauerhaft Platz.
- **Auswirkung:** keine falschen Buchungen. Die E2/E3-Fortsetzung kommt aber beim Erzähler nur verkürzt an, denn die Detailkarte enthält die vollständigen offenen Absprachen. Der Runnerbefund „agreement_on_card: 1 (+2 nur gekürzt)“ hängt daran.

**B3 – Absprachenidentität: Muller-Zusage überschrieben und nie erledigt (T36–T58). P2.**
- **Ablauf:**
  - T36 entsteht `thread.t34.1` (`debt`): „Muller said he'd put copper in for whoever cleared the millpond gnasher“. Muller ist nicht anwesend; World entfernt `pc` gemäß R7, der Thread bleibt ohne Parteien.
  - T46 bestätigt Muller selbst: „Four copper … That's what I promised, and I'll stand to it.“
  - T48 zahlt er die 4 cp; als Verkauf der Zähne korrekt gebucht. Der Thread wird **nicht erledigt**.
  - T58 erzählt Muller eine **andere** Schuld (40 Silber an Garvin Hesse). Der Extractor meldet dafür `id: "thread.t34.1"` mit `who: ["npc.muller","pc"]`.
  - `threadEvents` ersetzt per ID den Text („an update may say it better“) und vereinigt die Parteien.
- **Ergebnis:** Alaric ist Partei einer offenen Schuld Mullers an Hesse. Die ursprüngliche, längst bezahlte Zusage ist verschwunden.
- **Ursache:**
  - Der Extractor verwendet die ID für einen anderen Sachverhalt und lässt die Erledigung aus.
  - Seine Vorgabe in `content/deltas.json` (Thread-Summary) verlangt die vorhandene ID „however it is worded now“, sagt aber nicht, dass eine andere Schuld derselben Person ein neuer Thread ist.
  - Die Engine prüft bei ID-Updates von Absprachen weder Gegenstand noch neue Parteien.

**B4 – Pseudo-Absprache Hessa (T11, T17). P2 (gleiches Muster wie B3).**
- **Ablauf:**
  - T11 erzählt der Bauer über Hessa. Der Extractor legt sie mit `present: false` an und eröffnet `thread.t11.1` als `promise`: „Widow Hessa … sent for the Guild … half blind“. Das ist ein Bericht, keine Absprache.
  - T17 ersetzt er per ID den Text durch einen Szenenzustand („met at her mill door … questioning Alaric about the kill“) und fügt `pc` hinzu. Hessa ist anwesend, das ist nach R7 zulässig.
- **Folgen:** Der Thread bleibt offen. Der LLM-Spieler bemerkt T24 die „stale lead“ im HUD.
- **Nebenbefund P3:** `role: "null"` wird als Text übernommen; Beruf und Deskriptor lauten „null“.
- **Korrektur zum GPT-Review:** Hessa war T17 anwesend. Ihr `met` scheiterte zwar (gespeicherter Ort Reed Banks statt Mühle), der `enter`-Pfad buchte sie aber korrekt.

**B5 – Objektidentität: ein bezahlter Primer, zwei Exemplare (T41–T43). P2.**
- **Ablauf:**
  - T41 entstehen der Primer im Schaukasten (`obj.t82.primer`, liegt im Laden) und getrennt davon die Angebotszeile „Primer, 30 cp“ ohne Bezug auf das Objekt.
  - T42 bucht `bookPurchase` den Kauf (−30 cp) und **erzeugt immer ein neues Objekt** (`obj.t83.primer`). Die Extractormeldung, den vorhandenen Primer zu Alaric zu bewegen, wird verworfen (`pc_inventory`).
  - T43 macht der **Planner** aus „tuck the wrapped Primer away“ den Befehl `take obj.t82.primer`. Die Engine erlaubt die Mitnahme aus dem Laden kostenlos.
- **Ergebnis:** zwei Primer, ein Kauf. Der Erzähler rechtfertigt es mit „beside its twin“.
- **Korrektur zum GPT-Review:** Nicht die Extraktion bewegte den zweiten Primer, sondern ein vom Spieler ausgelöster und von der Engine aufgelöster `take`.

**B6 – Personenidentität: doppelter Fuhrmann, Torv nie anwesend (T49–T61). P2 (Duplikat), P3 (Folgen).**
- **Ablauf T49–T60:**
  - T49 kommt der Torffuhrmann `npc.npccarter_woolpack` in die Woolpack. T50 bietet er die Mitfahrt an (`thread.t47.1`, Parteien `[npccarter_woolpack, pc]`). T57 verlässt er die Szene.
  - T60 erzählt der Erzähler „The carter was in the yard behind the inn“.
  - Der Extractor legt dafür eine **neue** Person mit `present: false` an. Die Engine erzeugt `npc.carter`, denn die Wiedererkennung `keptHere` greift nur bei `present !== false`.
- **Ablauf T61:**
  - Die Antwort fasst Hof, Begrüßung („Name's Torv“) und eine Stunde Fahrt bis zum Steinmal (Cairn) an der Kreuzung zusammen.
  - Abgelehnt werden: `person.named` Torv (`scene_context`, die Delta-Szene „Hof“ gilt als nicht erreicht), `arrive.with` (nicht bei Alaric) und `met` (Schritt 1 endete an der Kreuzung, nicht im Hof).
  - Die Erledigung von `thread.t47.1` trägt danach drei Parteien, darunter das Duplikat.
- **Ergebnis:** Der Fahrer, mit dem Alaric eine Stunde fährt, war im Zustand nie anwesend und hat keinen Namen; die gemeinsame Fahrt ist nicht gebucht.

**B7 – Widersprüchliche Korrektur (T61 → T62). P3.**
- Der Engineblock T62 meldet in der Kopfzeile den Ort „crossroads cairn on the south road“. Im selben Block steht als Korrektur: „Alaric remains at the Woolpack … do not invent a completed journey.“
- Ursache: Die Korrektur wird bei der `scene_context`-Ablehnung von Delta 2 mit dem **damaligen** Ort gebildet; das spätere `arrive` (Delta 3) desselben Zugs bewegt Alaric. Der Erzähler folgte zum Glück der Kopfzeile.

**B8 – E2-A-Evidenz: Teilsätze verworfen, Bearbeiter 0 von 3 (T7, T24, T26, T33, T61). P2.**

Nachgestellt mit den Originalfunktionen auf der Originalprosa:

| Fall | Originalevidenz | Ergebnis | gleiche Prüfung je Teilsatz |
|---|---|---|---|
| T24 `met` Schreiberin | zwei wörtliche Stellen, mit „ ... “ verbunden | „its words are not in the reply“ | 2. Teil „the clerk looked up, and recognition crossed her face“: **ok** |
| T33 `met` Schreiberin | zwei Stellen mit „...“ | dito (Rückkehr kam dann über `enter`) | 1. Teil: **ok** |
| T61 `met` Fuhrmann | zwei Stellen mit „...“ | (vorher an `met_without_arrival` gescheitert) | – |
| T24 `handled_by` | drei Sätze mit Dialog | „it is spoken, not narrated“ | 1. Satz: kein Bearbeitungsverb („checked“) |
| T26 `handled_by` | zwei erzählte Sätze | „it is spoken, not narrated“ | „pulled … slip“, „pressed … seal“: Verben nicht im Wortschatz |
| T7 `handled_by` | „She dipped the quill, entered it …, and stamped a slip“ | „no one is named before the pronoun“ | – |

- **Ursache, Teil 1 (Satzgrenzen):** `narratedEvent` sucht die Evidenz als **zusammenhängende** Wortfolge innerhalb **eines** Satzes. Mehrsätzige oder ausgelassene Evidenz scheitert immer, auch wenn jeder Teil wörtlich und erzählt ist. Die Meldung „it is spoken“ ist dann irreführend.
- **Folgekette T24:**
  - Die Schreiberin war im Zustand nicht anwesend.
  - `desk_handler` lehnt ab („no Guild person present at the desk“).
  - Der `manner`-Anker wird mit `anchor_absent` verworfen. Er hätte mit 100 Zeichen ohnehin `anchor_value` (über 80) verfehlt.
- **Ursache, Teil 2 (Prüfung):**
  - T7 ist nach der §8-Pronomenregel korrekt abgelehnt: Die Schreiberin wird in dieser Antwort erst **nach** dem Pronomen benannt.
  - T24 und T26 scheitern zusätzlich am engen Verbwortschatz `HANDLES`.
- **Korrektur zum GPT-Review:** Die T26-Ablehnung beruht nicht auf gesprochener Evidenz und nicht auf der Clerk-Referenz (`npc.guild_clerk` wurde korrekt aufgelöst).

**B9 – Währungskanon: erfundener Wechselkurs, unvollständiges Ergebnis (T27–T42). P2 (Integration).**
- **Ablauf:**
  - T27 lehnt die Engine den Primer für 80 cp bei 70 cp Börse korrekt ab. Der Ergebnistext lautet nur „NOT BOUGHT — not enough coin. Nothing changes hands.“
  - Der Erzähler erklärt den Mangel mit „I don't break silver down here“. T28–T30 tauscht ein Geldwechsler „one silver for ninety-seven / ninety-five coppers“.
  - Das widerspricht dem Kanon (Lore, Regeln: 10 Kupfer = 1 Silber). Gebucht wird zu Recht nichts.
  - Der Spieler hält sich daraufhin für reicher, als er ist, und verliert rund 15 Züge mit Wechsel, Fellverkauf und Nachrechnen.
- **Geldbuch:** Das Ledger ist korrekt (Endstand 55 cp; hier stimme ich GPT zu).
- **Ursache:** Der Ergebnistext nennt weder Börse noch Fehlbetrag noch, dass Silber und Kupfer eine Börse sind. Der Erzähler füllt die Lücke frei.

**B10 – Abendessen erzählt bezahlt, nicht gebucht (T57). P2 (Finanzbereich).**
- **Ablauf:**
  - Das Angebot T55 lautet „Supper's still two copper if you want it when the bell goes“ (bedingt). Der Planner bucht T57 `buy` mit Höchstpreis 2.
  - Der Erzähler lässt Alaric „Two copper, aye“ bezahlen. Gebucht wird nichts („NOT BOUGHT — no single valid canonical offer“); die Börse bleibt 55 cp.
- **Ursache:** Eine Zustimmung im Voraus kauft nur feste Angebotszeilen (`binding`). Ein bedingtes Angebot wird nie fest, auch wenn die Antwort die Bedingung (Glocke) erfüllt. Der Extractor meldete die feste Nennung „Two copper, aye“ nicht.
- **Abgrenzung:** Das gehört in den Finanzbereich und wird dort separat behandelt (Fachplan §10).

**B11 – Falscher Namensfakt (T16). P3.**
- Der Extractor meldet `learn` mit `s` = Fuhrmann statt `pc`. Gespeichert wird `npc.npccarter_hazel name = "Alaric Red"`. Der Personenname „Wat Dodd“ bleibt richtig.

**B12 – `role: "null"` als Text (T11).** P3, siehe B4.

### 3.2 Plausible Verdachtsfälle (keine sichere Fehlerursache)

- **V1 – Ein Rudel, zwei „Gruppen“ (T19):**
  - Das offene `danger`-Fenster erlaubt eine feindliche Gruppe. Der Extractor teilt das erzählte Dreierrudel in Leithund und Flankengruppe auf; die Flanken werden mit `road` verworfen.
  - Der Erzähler folgt der Korrektur konsistent (die Flanken bleiben „at the hedge lines“).
  - Regelkonform, aber die Granularität („eine Gruppe“ = Extractor-Gruppierung) ist fraglich. Weitere Daten nötig.
- **V2 – Unbekannter Müller (T63/T64):**
  - Die Ablehnung von `npc.muller` ist richtig, denn der Erzähler trennt den Müller ausdrücklich von Muller („Muller said he'd found somebody“).
  - Der Extractor legt den Müller aber auch nicht als neue Person an; das Brot, das Alaric bekommt, geht als abhängige Meldung verloren.
- **V3 – Stimmung als Dauerfakt (T45):** Mullers `mood` („drinking since the afternoon bell“) wird bei der ersten Begegnung als freier Fakt gespeichert. R10 prüft nur `voice`/`manner`/`interest`.
- **V4 – Planner-Abbrüche:** vier Plannerantworten `finish_reason=length` mit leerem Inhalt (T20, T23, T31, T37); 16 Planner-Reparaturen. Die Fortsetzung war sicher; Kosten und Laufzeit steigen.
- **V5 – Engine-Heuristik `narrated`:** T46 „none“, obwohl das `life`-Fenster erzählt ist (§3.3). Das betrifft Diagnose und Runner-Auswertung, nicht den Zustand.

### 3.3 Regelkonformes Verhalten (ausdrücklich geprüft)

**NPC und Anwesenheit:**
- **T63/T64:** `npc_presence` für den Müller ist richtig (V2).
- **T13, T19:** `attack_commitment` ist richtig; Gnasher und Leithund drohen erst, der Spieler greift an.
- **T7:** `desk_handler` folgt der §8-Pronomenregel.
- **T36:** `pc` ist ohne anwesende NPC-Partei aus der Schuld entfernt (R7).

**PULSE:**
- **T19:** `road` für die Flanken entspricht der Ein-Gruppen-Regel (V1).
- **T46:** Das `life`-Fenster ist erzählt: „a carter came in shaking rain off his hat, calling … that the west road ford was running high“, als Gerücht gespeichert (`thread.t43.1`).
- Die übrigen sieben offenen Fenster sind sichtbar umgesetzt: T8 Hochwasser, T15 Fuhrmann, T19 Hunde, T36 Frau und Kind, T49 Fuhrmann in der Woolpack, T61 Stadtgespräch über Wellow Ford, T62 Müllersjunge.
- Die acht Runner-Hinweise `new_world_content_in_closed_window` sind aufgesuchte oder ortsübliche Personen: Schreiberin, Bauer, Hessa (nur erwähnt), Geldwechsler, Harl, Buchhändler, Muller mit Bedienung. Ausnahme ist T60, das Duplikat aus B6.

**Kampf und Handel:**
- **T20 ff.:** Positionen im laufenden Kampf gehören der Engine.
- **T66:** Heavy Slash außer Reichweite, korrekt abgelehnt (nach B1).
- **Preise ohne Währungswort** (T27 „Primer's eighty“, T28, T37 „Fourteen the pair“, T51, T52, T57): Ablehnung gemäß `.144` S2. Die Reibung (T37–T40, T52–T55) ist real, aber eine Folge der gewollten Regel.

### 3.4 Fehlende Testabdeckung

- **E3:** 0 Anker.
  - Der Extractor meldete im ganzen Lauf genau einen Ankerkandidaten (T24, `manner`, 100 Zeichen, Person nicht anwesend) und daneben eine Stimmung (V3).
  - Ein E3-Versagen der Engine ist damit nicht belegt. Die Abdeckung fehlt, weil kaum Wiederbegegnungen stattfanden und der Extractor fast keine Merkmale meldete.
- **Gildenbearbeiter:** 0 angenommen (B8).
- **NPC-Absprachen:** keine Absprache nur zwischen NPCs. Eine ungebundene Absprache existierte zeitweise (B3), wurde aber später gebunden.
- **PULSE:**
  - kein Wurf im Dungeon (die vier Dungeonzüge waren DUNGEON AHEAD und Kampf), keine Rastunterbrechung, kein Wanderer;
  - nur eine Pause (sichere Unterkunft, geschlossen);
  - 44 Würfe aus einer Seed-Serie sind keine Grundlage für Paket D.
- **Begleitung:** Begleitete Reisen kamen nur mit Dodd vor (3). Eine Gruppe als Kampfpartei gab es nicht.

## 4. Abgleich mit dem GPT-Review

| GPT-Aussage | Bewertung | Beleg |
|---|---|---|
| P2 Thread-ID `t34.1` für fremde Schuld | **bestätigt**, ergänzt: Die ursprüngliche Zusage war T48 bezahlt und blieb offen; die Extractorvorgabe fördert die ID-Wiederverwendung | B3 |
| „die angebliche Gegenleistung war bei Muller selbst noch nicht bestätigt“ | **widerlegt**: T46 „That's what I promised, and I'll stand to it“, T48 gezahlt | I92, I95 |
| P2 Doppelprimer | **bestätigt**, Ursache präzisiert: `bookPurchase` erzeugt immer ein neues Objekt | B5 |
| T43 „die Extraktion bewegt jetzt zusätzlich den Vitrinenprimer“ | **widerlegt**: Planner-`take`, aufgelöst durch die Engine; die Extraktionsbewegung T42 war verworfen | I83–I85 |
| P2-Kandidat doppelter Fuhrmann | **bestätigt** als Duplikat (T60 entfernte `person.new`, kein `keptHere`); Folgen T61 ergänzt | B6 |
| Gildenbearbeiter 0/3 | **bestätigt**; Ursachen T24/T26 präzisiert | B8 |
| T26 „nicht passende Clerk-Referenz und gesprochene Evidenz“ | **widerlegt**: erzählte Evidenz über zwei Sätze und fehlende Verben | B8 |
| T17 `met` „mangels belegter korrekter Anwesenheit“ verworfen | **teilweise**: `met` scheiterte, Hessa wurde über `enter` aber korrekt anwesend | B4 |
| Hessa-Bericht wird zur `promise` | **bestätigt**, ergänzt: Textersatz durch Szenenzustand T17, HUD-Folge | B4 |
| E3 nicht abgedeckt, nicht als defekt bewiesen | **bestätigt**; der einzige Kandidat wäre auch an `anchor_value` gescheitert | §3.4 |
| T65 `pulse` als Sicherungsbeispiel | **widerlegt**: Defekt gegen den eigenen DUNGEON AHEAD und den PULSE-Fachplan | B1 |
| T46 `life`-Fenster „nicht erkennbar umgesetzt“ | **widerlegt**: Fuhrmann mit Neuigkeiten; Heuristik falsch-negativ | §3.3, V5 |
| T19 „echte Gefahrensteuerung“ | **regelkonform**, mit offener Granularitätsfrage | V1 |
| Geldledger konsistent; Wechsel nur erzählt | **bestätigt**, ergänzt: Kanonbruch durch Ergebnistext ohne Börse (B9) und ungebuchtes Abendessen (B10) | B9, B10 |
| T63/T64 Müller korrekt verworfen | **bestätigt**, ergänzt um den nicht angelegten Müller | V2 |
| „Die Engine verweigert unbelegte Namensmeldungen erfolgreich“ (Torv) | **nicht als Schutz zu werten**: Ablehnung aus Szenenchronologie, der Name ging verloren | B6 |
| PULSE D, E4/E5, Balance nicht aus einem Lauf ableiten | **bestätigt** | §3.4 |
| *nicht erwähnt* | Kontextüberlauf mit verdrängten NPC-Karten und Abruf | B2 |
| *nicht erwähnt* | widersprüchliche Korrektur T62, falscher Namensfakt T16, `"null"` als Beruf | B7, B11, B12 |

## 5. Grenzen dieses Gegenreviews

- **Anzahl der Läufe:** Ein einzelner natürlicher Lauf mit einem Modell; die Häufigkeiten (z. B. 27/63 Überläufe) gelten für diesen Lauf.
- **Was die Daten tragen:** Die Ursachen sind im Code gelesen und für B8 durch Funktionsaufrufe auf der Originalprosa belegt. Für B1, B2, B5 und B7 belegen die Originalrecords das Verhalten der unveränderten Engine `.174`. Ein deterministisches Nachspielen mit Testfixture ist Teil des jeweiligen Patches.
- **Extractor- und Erzählerverhalten** (B3, B4, B6, B9) ist Modellverhalten. Ob geänderte Vorgaben wirken, zeigt erst ein weiterer natürlicher Lauf.
