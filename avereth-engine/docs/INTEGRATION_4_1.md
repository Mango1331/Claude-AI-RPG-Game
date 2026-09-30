# Integration 4.1: das ChatGPT-Experiment 4.0.1–4.0.9 geprüft und eingebaut

**Stand 30.09.2026, Build 4.1.4.** Dieses Dokument hält fest, was aus dem Experiment übernommen, überarbeitet, ersetzt oder verworfen wurde, und warum. Es beschreibt auch den nächsten Live-Test (§5). §8 enthält die Nachprüfung von 4.1.0 durch ein unabhängiges Review und die Korrekturen in 4.1.1. §9 enthält den Live-Lauf vom 30.09. 14:56 auf 4.1.1 und die Korrekturen und Designänderungen in 4.1.2. §10 enthält die Nachprüfung von 4.1.2 und die Korrekturen in 4.1.3. §11 enthält die Nachprüfung von 4.1.3, den Patch 4.1.4 und den echten Live-Test, der jetzt ansteht.

| | Branch | Commit |
|---|---|---|
| Basis (bisheriger Stand, unverändert) | `claude/happy-wright-1a4y19` | `1cbfdd4` |
| Experiment (unverändert) | `chatgpt/v4-livetest-fixes-2026-09-28` | `a067bd0` (4.0.9); der Live-Lauf 30.09. lief auf 4.0.8 (`2f5eeb5`) |
| Integration | `claude/v4-integration-2026-09-30` | von `1cbfdd4`; der Merge-Commit `f1b6bdd` holt `a067bd0` als Prüfgegenstand herein, die Folge-Commits überarbeiten ihn Teil für Teil; 4.1.0 = `d7ef49b` |
| Korrekturen 4.1.1 (§8), 4.1.2 (§9), 4.1.3 (§10) und 4.1.4 (§11) | `claude/v4-integration-fixes-2026-09-30` | von `d7ef49b`; 4.1.1 = `6acc7f9`, 4.1.2 = `0814ab5`, 4.1.3 = `5a8ccab` |

Primärbelege: Chat-JSONL des Laufs (Branch #1), Event-Export, Chat-Completion-Log (mit verworfenem Seitenzweig; nur über exakten Text zugeordnet). Die Chronik des Experiments steht in [CHATGPT_FIX_BRANCH_2026-09-28.md](CHATGPT_FIX_BRANCH_2026-09-28.md).

---

## 1. Harte Mechanik, weiche Welt: Bewertung der Verschiebung

Das Experiment verschiebt V4 von „die Engine muss alles vorab autorisieren“ zu „die Engine besitzt die Mechanik, die Welt entsteht erst, wenn die Geschichte sie braucht“. **Die Richtung ist richtig und bleibt.** Die Grenze sieht jetzt so aus:

| Hart (Engine) | Weich (Geschichte → Extraktor → gespeichert) |
|---|---|
| Kampf, HP, Schaden, Initiative, Reichweite, Skills, Ressourcen | was NPCs tun, sagen, geben, wohin sie gehen |
| Kreaturprofile, **fest ab dem Sichtbarwerden** (4.0.4) | Beziehungen, Haltungen, Erinnerungen |
| XP, Level; Münzen, Handel, Gebühren; Gildenrang, Vertragsstatus, Auszahlung, Quest-XP | Weltfakten, Orte, Wege, Zeugen, Belege |
| Spielerentscheidungen (Agency-Guard, Overreach) | Questfortschritt und Bereitschaft (`quest.ready`) |
| einmal gezeigte Aushänge des Bretts | das Brett selbst: erzeugt erst beim ersten Lesen (4.0.7) |

**Wo die Verschiebung das Spiel verbessert:**
- Das Brett wird nicht mehr vorab erzeugt.
- Verträge sind fertig, wenn die Geschichte das Ziel erreicht hat (`quest.ready`), nicht wenn ein generierter Belegtext wörtlich im Inventar liegt.
- NPC-Geschenke und Weltursachen sind kein Overreach.
- Weiche Felder dürfen fehlen (weniger Reparaturaufrufe).
- Kreaturen zeigen Handle, HP und Reichweite vor dem ersten Schlag.
- Der Lauf vom 30.09. zeigt das: Eskorte, vier Wölfe mit festen Profilen, Abgabe mit richtiger Auszahlung.

**Wo Schutz verloren ging und in 4.1 zurückkam:**
- V3-Ansichten waren mitverändert: NPC-Karten, HUD-Namen, Überschriften, der V3-Erzählvertrag und die Wortersetzung.
- Zwei Klauseln der Overreach-Regel fehlten (§4).
- Der Schutz der Münzen vor erfundenen Strafen fehlte.
- „invent no other official contract“ fehlte in der Brettzeile.
- Ein kritisches P0-Delta ging verloren (§4).

Die 4.0.9-Heuristiken, die Wortlisten auf einen Einzelfall zuschnitten, sind durch Zustandsregeln ersetzt (§2).

---

## 2. Entscheidungsmatrix

| Änderung (Version) | Entscheidung | Begründung |
|---|---|---|
| Kampf-, Level-, Handelsformeln unangetastet; Szenen-Handles „Wolf A–D“ (4.0.3); Materialisierung beim Sichtbarwerden (4.0.4) | **übernommen** | live bewährt (vier Wölfe, feste Profile) |
| Reichweitenregel, Rückfall GO-Ankunft zuerst, Firewall je Schritt, `power_rank` als Zustand (4.0.3) | **übernommen** | korrekt, getestet |
| `quest.ready` + Abgabe nach Geschichte statt Belegliste (4.0.5) | **übernommen** | gewünschte Freiheit; Auszahlung/XP bleiben Engine |
| NPC-Geschenke, `forced_by`, weiche Felder, 1 Aufruf + 1 Reparatur (4.0.5–4.0.6) | **übernommen** | weniger Fehlbuchungen und Aufrufe |
| keine generische CHECK-DIE, Suche als Engine-Check (4.0.5) | **übernommen** | Tests auf den neuen Stand gebracht |
| Brett erst beim Lesen, Barriere ohne Zeitlimit, Interpreter fail-closed (4.0.7) | **übernommen** | keine vorab erfundene Welt; kein Zug ohne gelesene Absicht |
| Novice-Profil (Monster, Eskorte, Lieferung), Titel-zuerst-Zeilen (4.0.8) | **übernommen**, Format unverändert | vom Nutzer bestätigt |
| Erstanzeige-Schutz des Bretts (4.0.9, C1) | **übernommen** | richtige, enge Grenze; spätere Abgänge bleiben möglich, Zufallsabgang 0 % |
| „came from“-Guard, Interpreterbeispiele für Fortsetzung und Zeugenunterschrift (4.0.9, C4) | **übernommen** | am Beleg bestätigt |
| Harter Stopp bei unbekanntem Preis (4.0.9, C7) | **übernommen**, ergänzt | Frage `taken_anyway` zählt erfundene Zustimmung |
| XP 12/15 (4.0.9, D) | **übernommen**, Core-#25-Text und Tests nachgezogen | §3 D |
| `quest.detail`-Regel (4.0.9) | **überarbeitet** | Betrag in jeder Münze/Wortform; P0 wieder 58/58 kritisch |
| `quest.ready`-Sperre nach abgelehnter Ankunft (4.0.9, C3) | **überarbeitet** | ohne Stichwort-Regex; Test stürzte ab |
| Herden als Kulisse (4.0.9, C5) | **ersetzt** | Temperament des Körperbaus statt Nutztier-/Weide-Wortlisten |
| Münzen aufheben (4.0.9, C6) | **überarbeitet** | keine falsche „schon im Beutel“-Ablehnung; Münzen nie Gegenstand, Beute über `coin.gift` |
| `journey.party`, Rekrutierungs-Regex, Rollen-Merge von `person.new` (4.0.9, C2) | **ersetzt** | `arrive.with`, `person.named`, Ortsnotiz, JOURNEY READY aus dem Vertragszustand |
| Wegfall der Rollenprüfung bei `coerce` (4.0.6) | **verworfen** | Geld ist hart: Strafe nur durch Obrigkeit, Raub nur durch Räuber |
| V3-Änderungen in context/hud/engine/intent/delta, `narrator.json`, Standard der Wortersetzung | **verworfen** (V4-gebunden oder zurück) | V3 byte-gleich (Differenzlauf) |

---

## 3. Befunde des Laufs 30.09. (4.0.8)

| # | Befund | Ursache am Beleg | ChatGPT 4.0.9 | 4.1 |
|---|---|---|---|---|
| C1 | zwei eben gezeigte Aufträge entfernt | Erzähler erfand in Nachricht 14 „bereits vergeben“, Extraktor meldete `listing.gone` | Erstanzeige-Schutz | übernommen |
| C2 | Begleiter verloren, doppelte NPCs (Dren, Aldsa, zweiter Fahrer) | **zwei Ursachen:** Ankunft leert die Szene, niemand kommt mit; kein Delta, um eine namenlose Person zu benennen | Party-Lesezeichen aus Rollenwörtern (wool, flock, shepherd …), Rollen-Merge | `arrive.with`; `person.named`; Ortsnotiz der Zurückgebliebenen; `person.x`-Verweise lösen auf |
| C3 | Eskorte „bereit“ trotz abgelehnter Ankunft | Folge von C4/C2 | Sperre nur bei Stichworten in der Notiz | Sperre bei jeder abgelehnten Ankunft für Eskorte/Lieferung |
| C4 | „*i nod and we continue*“ ohne Wirkung | JOURNEY READY verlangte einen anwesenden Begleiter (C2); „came from“-Guard falsch | Guard-Fix, Beispiele | + JOURNEY READY aus dem Zustand: aktive Eskorte/Lieferung außerhalb ihrer Stadt |
| C5 | zwölf Schafe als zwölf Kampfprofile | jede Gruppe wurde einzeln | Wortlisten Nutztiere + Weide | große passive Gruppe scheuer Tiere = ein Fakt; Rudel, Angreifer und Ziele eines Angriffsauftrags bleiben einzeln |
| C6 | Phantom-„copper“ nach der Auszahlung | „take the copper“ legte ein Objekt an; die Kasse (120 cp) stimmte | Aufheben verweigert | Münzen nie Objekt; Aufheben erlaubt; Gildenlohn nie doppelt |
| C7 | Wasser vor Zustimmung bezahlt und getrunken | Erzähler erfand „at his nod“; Extraktor: `taken_anyway:false` | harter Stopp | + Frage an den Extraktor geschärft |
| D | 80 XP, kein Level-up | 4×10 + 2×10×2 | 12/15 | 4×12 + 2×15×2 = 108 → Level 2, 8 Rest; wirkt auf jedem Level gleich (+20 % Kampf, +50 % Quest) |

**Widerspruch zu ChatGPTs Schlüssen:**
- C2: Die Rollen-Heuristik trifft nur diesen Lauf und verschmilzt gleichartige Namenlose falsch.
- C5: Wortlisten erfassen weder andere Tiere noch andere Wörter.
- C6: „bereits im Beutel“ stimmt für Beute nicht.
- C3: Die Stichwort-Regex greift nicht, wenn die Notiz anders formuliert ist. Zudem stürzte der zugehörige Test ab.

---

## 4. Zusätzlich gefunden

- **V3 war mitverändert** (NPC-Karten, HUD-Namen, Kampf-Zielfrage, Erzählvertrag, Wortersetzung). Jetzt V4-gebunden; der Differenzlauf der Fixtures v8–v12 ist byte-gleich zu `1cbfdd4` bis auf den Build-Stempel.
- **P0: ein kritisches Delta verloren** (v12_04 „payout eight silver“, gebucht 80 cp). Die 4.0.9-Regel erkannte nur „N cp“. Jetzt wieder 58/58, verbotene 7 → 1.
- **Overreach-Regel:** Die Umschreibung in delta-0.9 hatte zwei Klauseln aus dem Lauf 28.09. verloren: Eigene Worte aus der Spielernachricht sind nie Overreach, und eine nicht gebuchte Zahlung, Annahme oder Reise bleibt Overreach. Beides ist wieder drin.
- **Wildnis außerhalb von Städten** setzt den Szenenort auf das Reich (`realm.solmere`). Der Validator kannte nur V3-Orte und lehnte das ab, auch im Live-Lauf ab Nachricht 26. V4-Ortsknoten gelten jetzt.
- **Ein gescheitertes Brett** hinterließ kein `board.failed` mehr (Audit). Wieder da.
- **JOURNEY READY** fügte Detail-Objekte als „[object Object]“ zusammen. Jetzt wird deren Notiztext gelesen.
- **Aus dem Replay:**
  - Ein beliebiger Jagdauftrag hätte die Schafe wieder einzeln gemacht. Jetzt zählen nur die im Auftrag genannten Tiere.
  - Automatisches Wiedereinsetzen Zurückgebliebener hätte Aldsa an die Furt zurückgeholt, obwohl sie in Millbrook war. Das entfällt; nur die Ortsnotiz bleibt.
- **Tests des Experiments** prüften teils Zwischenstände: `QUEST FRICTION`, `check`-Delta, ein Angriff aus SHORT ohne Annäherung. Außerdem liefen 52 der 420 Tests auf 4.0.9 rot; ChatGPT hatte die Suite nie ganz laufen lassen.

---

## 5. Nächster Live-Test (Warrior-Baseline, Build 4.1.1)

**Einrichtung** wie [LIVETEST_V4.md §2](LIVETEST_V4.md#2-einrichtung-in-sillytavern), mit folgenden Abweichungen:
- Extension aus `claude/v4-integration-fixes-2026-09-30`; die Statuszeile zeigt `Avereth Engine 4.1.1`.
- Neuer Chat mit Begrüßung `outside Tidecross, Solmere`.
- Erschaffung: `Warrior`, dann `Heavy Slash + Quick Slash`.

| # | Eingabe (sinngemäß) | Erwartet |
|---|---|---|
| 1 | in die Stadt, zur Gilde | Ankunft in der Halle; **noch kein Brett** |
| 2 | registrieren | Gebühr 2 Silber genannt, Halt, nichts bezahlt |
| 3 | zahlen, Plakette nehmen, Novice-Brett lesen | 30 cp, Novice. **Fünf Aushänge, je ein Titel pro Zeile:** mindestens zwei Monsteraufträge, eine Eskorte, eine Lieferung. In dieser Antwort verschwindet keiner |
| 4 | Eskorte (oder Lieferung) annehmen | angenommen, Vertragszettel |
| 5 | zum Auftraggeber, gemeinsam aufbrechen | HUD/ACTIVE SCENE: die Begleiter sind **nach jedem Ortswechsel** noch da (dieselben Handles). Nennt die Geschichte einen Namen, heißt **dieselbe** Person so (keine zweite) |
| 6 | unterwegs „wir warten, dann gehen wir weiter“ | `DEPARTS/CONTINUES`, keine abgelehnte Ankunft |
| 7 | Kampf (Wölfe o. Ä.) | jeder Gegner einzeln mit HP/Reichweite **vor** dem ersten Schlag; eine friedliche Herde ist nur Kulisse |
| 8 | Ankunft am Ziel | Vertrag bereit (`QUEST READY`) |
| 9 | zurück, am Schalter abgeben | ausgeschriebener Lohn **einmal**, Quest-XP; mit vier L1-Wölfen und einer L2-Standard-Eskorte **Level 2** |
| 10 | „ich nehme die Münzen“ | kein Gegenstand „copper“, Kasse unverändert |
| 11 | Taverne: etwas ohne Preis bestellen | Preis genannt, **Halt**; erst nach „ja“ bezahlt, einmal |
| 12 | „drei davon, bitte“ bei einem genannten Stückpreis (4.1.1) | dreimal der Preis abgebucht, drei Stück im Inventar |
| 13 | nach einem Kampf: „ich durchsuche ihn und nehme seine Münzen“ (4.1.1) | Beute einmal gutgeschrieben; ohne eigenes Nehmen bleibt die Kasse gleich |

**Worauf achten:**
- nach jeder Ankunft die Liste der Anwesenden (`arrive.with`);
- doppelte Personen (`person.named`);
- ob „wir gehen weiter“ nach dem Aufbruch als `DEPARTS/CONTINUES` erkannt wird, und vor dem Aufbruch nicht;
- die System-Zeilen `NOT APPLIED` und `ENGINE REFUSED`;
- Münzen im HUD: jede Änderung einmal, keine aus bloßer Erzählung;
- unbekannte Preise: Halt, erst nach Zustimmung bezahlt; bei Mengen („drei davon“) der Gesamtpreis.

**Zurückschicken:** wie [LIVETEST_V4.md §6](LIVETEST_V4.md#6-zurückschicken): Chat-Export, Event-Log, Request-Log, **keine Schlüssel**.

---

## 6. Restrisiken

- **Neue Vokabeln:** `arrive.with` und `person.named` hängen daran, dass der Extraktor sie benutzt. Das ist nicht live gemessen.
  - Die aufgezeichneten Antworten vom 30.09. kennen sie nicht.
  - Ohne sie bleibt der Stand von 4.0.8: Begleiter fallen bei Ankunft aus der Szene, Namenlose können doppelt werden. Die Geschichte bringt sie über `enter` oder einen Namen zurück.
- **Rückkehr an einen Ort:** Wer dort blieb, kommt nur zurück, wenn die Geschichte ihn einführt. „Der Fahrer“ findet dann denselben Fahrer.
- **Angriff auf eine Kulissenherde:** Er findet kein Ziel, bis die Geschichte einzelne Tiere zeigt. Nur Tiere, die ein aktiver Angriffs-/Besiegen-Auftrag nennt, bleiben von vornherein einzeln.
- **Quest-Notiz:** Steht eine Maut im selben Satz wie der Lohn, wird die Notiz vorsichtshalber abgelehnt.
- **C7:** Der harte Stopp und die Frage `taken_anyway` sind Modellverhalten.
- **XP:** Die Konstanten beschleunigen das Leveln gleichmäßig um etwa 30 %. Die Skalierung nach Rang ist bewusst zurückgestellt.
- **`forced_by`:** Eine erzwungene Ortsänderung glaubt die Engine dem Extraktor (begrenzt durch die Regel).
- **Interpreter fail-closed:** Ein gescheiterter Aufruf bricht den Zug ab (Regenerate).
- **Erstanzeige-Schutz:** Er gilt für jede Antwort, die das Brett zeigt, auch beim erneuten Lesen.

---

## 7. Nachweise (Build 4.1.0)

| Prüfung | Ergebnis |
|---|---|
| `npm test` | **448/448** (Basis `1cbfdd4`: 392/392; 4.0.9: 368/420) |
| V3-Differenzlauf der Fixtures v8–v12 (Prompts, Records, Nachforderungen, Endzustand) | identisch zu `1cbfdd4`, nur der Build-Stempel |
| Replay des Laufs 30.09. auf 4.1.0 (`tests/v4/live_0930.test.js`) | C1, C3–C7 und D wie erwartet; Level 2 mit 8 XP, 120 cp → 119 cp |
| Mutationsprobe: elf Korrekturen einzeln zurückgedreht | jede lässt mindestens einen Test fehlschlagen |
| P0-Rescore (Firewall, Agency-Guard) | verboten 7 → 1, kritisch 58 → 58 (4.0.9: 57); Guard 100 % Negativ-Präzision, Recall 94,2 % |
| Browser-Smoke (V3 + V4) | OK |
| echtes SillyTavern 1.19, Mock-Provider, Dummy-Schlüssel | V4 17/17, V3 OK; Schlüssel danach entfernt |

---

## 8. Nachprüfung von 4.1.0 und Korrekturen 4.1.1

Ein unabhängiges Review (ChatGPT, 30.09.2026) hat Gegenbeispiele gegen 4.1.0 gemeldet. Jedes wurde isoliert am Code von `d7ef49b` reproduziert, bevor etwas geändert wurde. Die Regressionstests stehen in `tests/v4/review_4_1.test.js`. Alle 17 Tests schlagen auf 4.1.0 fehl und laufen auf 4.1.1 durch.

| # | Befund | Urteil | Korrektur 4.1.1 |
|---|---|---|---|
| 1 | `coin.gift` erzeugt Geld: 90 cp „from the counter“ nach der Auszahlung, 14 cp aus der Börse eines toten Banditen ohne TAKE | **bestätigt**, dazu zwei weitere Wege: Verkaufserlös plus `coin.gift` vom Käufer (doppelt), „Wechselgeld“ nach einem Kauf zum genauen Preis | drei strukturelle Fragen im World-Applier, siehe unten |
| 2 | Kauf von drei Stück bucht einen Preis und ein Stück | **bestätigt, breiter**: Das Limit rechnete mit der Menge, die Buchung nicht; Angebotszeilen mit eigener Menge wurden doppelt multipliziert; `offer.accept` kannte gar keine Menge; der bedingte Kauf verlor sie | ein Mengenmodell in `src/v4/trade.js` |
| 3 | Verkauf von mehr als vorhanden; Teilverkauf überträgt den ganzen Stapel | **bestätigt**; „negativer Bestand“ **widerlegt** (der Eintrag wird bei ≤ 0 gelöscht). Das echte Problem: verkaufte und bezahlte Phantomeinheiten | dasselbe Modul: Bestandsprüfung, geteilter Stapel, Preis der verkauften Menge |
| 4 | `journeyReady()`: ein angenommener Escort gilt allein in einer anderen Stadt als unterwegs | **bestätigt**; bei zwei Aufträgen gewann der erste | gespeicherter Beginn der Reise (`quest.journey`) |
| 5 | `hunted()`: Schafe werden über den Alias „goat“ Ziele eines Ziegenauftrags | **bestätigt**; ebenso Mäuse/Ratten, Raben/Krähen, Rinder/Pferde | Zuordnung nach der genannten Art |
| 6 | C3-Sperre: eine abgelehnte zweite Ortsänderung blockiert die legitime Bereitschaft | **bestätigt**; dazu ein eigener Fehler (ein unbekannter Begleiter in `arrive.with` zählte als abgelehnte Reise) und der häufigere Fall „schon am Ziel, ohne `go` in die Halle geführt“ | Sperre nach Erzählreihenfolge und Reiseziel |
| 7 | v11_05: ein Hilfsangebot wird privater Auftrag | Zahlen **bestätigt** (7 → 1 verbotene, 58/58 der vorhandenen kritischen Deltas, 63 im Gold); strukturell nicht ohne Textheuristik trennbar | Klarstellung im Vokabular von `quest.offer`; messbar erst live |
| 8 | Aussagekraft der Tests | **zutreffend**; das Repository hat keine CI | Nachweise unten nach Testart getrennt |

**Geld (1).** Die Firewall bleibt unverändert, sie prüft weiter die Gilde. Neu entscheidet der World-Applier, bevor er ein `coin.gift` bucht, anhand von drei Fragen:
- **Wer gibt es?** Eine lebende, anwesende Person darf Alaric Geld schenken. Die Gegenseite eines Handels, den die Engine in diesem Zug gebucht hat, kann das nicht: Der Käufer eines Verkaufs und der Verkäufer, dem Alaric den genauen Preis gezahlt hat, schenken nichts. Wechselgeld auf eine selbst gewählte Zahlung (`pay` mit Betrag) bleibt erlaubt.
- **Hat Alaric es genommen?** Geld von allem anderen (Leiche, Börse, Theke, Truhe) nimmt Alaric. Es gehört ihm nur, wenn er in PLAYER ACTIONS etwas genommen hat oder sucht bzw. sammelt. Als Nehmen zählt ein TAKE mit `taken: true` oder ein sofort gebuchtes TAKE.
- **Ist es schon gebucht?** Die Engine merkt sich ihre eigenen Gutschriften (`transaction.completed` an `pc`, Ort und Tag). Das betrifft die Gildenauszahlung und Verkaufserlöse. Genommenes Geld am selben Ort am selben Tag ist dieses Geld.

Jede Ablehnung bringt eine Korrektur in den nächsten Engine-Block. `isLooseCoin` erkennt jetzt auch „the bandit's coins“ und „the silver on the counter“. Ein TAKE davon legt also kein Phantomobjekt neben die Gutschrift.

**Handel (2, 3).** Eine Angebotszeile ist ein Posten aus `qty` Einheiten für `price_cp`, bei einem Stückpreis ist `qty` 1. Bei allen bisherigen Daten ist `qty` 1, dort ändert sich nichts.
- Ein Teil eines Postens wird nur zu einem ganzzahligen Stückpreis verkauft, sonst wird mit Hinweis auf die Losgröße abgelehnt.
- `buy`, `offer.accept` und der bedingte Kauf buchen über dieselbe Funktion.
- `offer.accept` hat ein nullbares `qty` (Vokabular `cmd-0.7`, Interpreter `interp-4.6`). Fehlende nullbare Argumente ergänzt der Parser als `null`, wie beim Extraktor.
- Verkäufe prüfen den Bestand beim Anbieten und beim Buchen. Ohne Mengenangabe geht ein Objekt ganz und ein Bogen-Gegenstand einzeln, wie bisher.

**Reise (4).** `quest.journey` wird gesetzt, wenn Alaric
- der Fortsetzung dieses Auftrags zustimmt (`journey.continue`), oder
- bei angezeigter Reise dieses Auftrags (Beteiligte anwesend) aufbricht und dabei die Siedlung verlässt.

Danach ist die Reise ohne anwesende Begleiter fortsetzbar. Die Regel „außerhalb der Stadt des Bretts“ entfällt. Kampagnen, die unter 4.1.0 mitten in einer Reise stehen, haben keinen Marker. Für sie gilt nur der Story-Pfad (Beteiligte anwesend) oder ein neues `go`.

**Tiere (5).** Verglichen werden die Hauptwörter von Gruppenart und Auftragsziel in beide Richtungen, nicht mehr die Aliasse des Körperbaus. Die Nominalphrase endet an Ort, Nebensatz oder Partizip, sodass in „the wolves harrying the sheep“ nur die Wölfe Ziele sind. Oberbegriffe, die für den ganzen Körperbau gelten, stehen als Daten in `monsters.json` (`rat`: vermin, rodent; `raptor`: bird).

**C3 (6).** Die Sperre greift nur bei einer abgelehnten Ankunft, die Alaric aus seiner Siedlung (außerhalb: von seinem Ort) wegführen würde. Sie muss in der Erzählung vor dem `quest.ready` liegen, und davor darf keine Ankunft angenommen worden sein. Abgelehnte Begleiter zählen nicht.

**Unverändert (Vorgabe):** die Architektur aus harter Mechanik und freier Welt, das Brett beim ersten Lesen und seine Formatierung, die Novice-Mischung, die Kampfmechanik, der geschichtsbasierte Abschluss, `arrive.with` und `person.named`, XP 12/15.

**Restrisiken 4.1.1:**
- Ein TAKE von etwas anderem (etwa einem Schwert) erlaubt auch Beute-Geld, das der Erzähler dazuerfindet. Die erste Sperre dagegen ist die Overreach-Regel des Extraktors.
- Genommenes Geld am selben Ort und Tag wie eine Engine-Gutschrift wird abgelehnt, auch wenn es wirklich neues Geld wäre (konservativ).
- Ein Geschenk einer anwesenden Person bleibt frei. Überreicht jemand anderes als der Auftraggeber die schon gebuchte Auszahlung erneut, fängt das nur die Firewall-Regel zu Auftraggeber und Summe.
- `pay` mit einem Betrag, der mehreren Stück eines Angebots entspricht, bleibt eine reine Zahlung. Der Interpreter soll dafür `offer.accept` mit `qty` nehmen.
- Ein Auftrag, der nur einen Oberbegriff außerhalb der Datenliste nennt („pests“), macht eine scheue Gruppe zur Kulisse. Ein Angriff darauf findet dann kein Ziel, bis die Geschichte einzelne Tiere zeigt.
- `offer.accept.qty`, die Losgrößen-Semantik, die Herkunft in `coin.gift` und die Abgrenzung in `quest.offer` sind Modellverhalten. Offline ist davon nichts gemessen.

**Nachweise 4.1.1, nach Testart getrennt:**

| Testart | Prüfung | Ergebnis |
|---|---|---|
| deterministisch | `npm test` | **465/465** (4.1.0: 448) |
| deterministisch | neue Regressionstests `review_4_1.test.js` | 17/17; auf 4.1.0 (`d7ef49b`) 0/17 |
| deterministisch | V3-Differenzlauf v8–v12 gegen die Basis `1cbfdd4` | identisch bis auf den Build-Stempel |
| deterministisch | P0-Rescore der gespeicherten Antworten (nur Firewall und Guard) | unverändert zu 4.1.0: verboten 7 → 1, kritisch 58 → 58 von 63. Die neuen Geldregeln sitzen im World-Applier und werden davon nicht erfasst; im Gold gibt es kein kritisches `coin.gift` |
| kontrolliertes Replay | Lauf 30.09. (`live_0930.test.js`): Nachricht 51 auf den neuen Katalog umgestellt, Ziele neu zugeordnet, zusätzliche Schläge bis Kampfende | alle Prüfungen grün; die Reise ist ab Nachricht 23 gespeichert begonnen |
| Mock-Provider-Smokes | Browser-Smoke V3 + V4; echtes SillyTavern 1.19 mit Mock-Provider und Dummy-Schlüssel | OK; V4 17/17, V3 OK; `secrets.json` danach `{}` |
| echter Modell-Live-Test | — | **keiner** für 4.1.1; §5 ist der nächste |

---

## 9. Live-Lauf 30.09.2026 14:56 (Build 4.1.1) und Korrekturen 4.1.2

**Material:**
- Chat-Export, Event-Export und CMD-Logger des Laufs;
- die Auswertung von ChatGPT.

Dem Logger fehlt der Anfang (Erschaffung und Registrierung). Chat und Events enthalten ihn vollständig.

**Nachgespielt:** Der Lauf ist als `tests/v4/live_0930b.json` gespeichert: Seed, Begrüßung, Erschaffung, die fünf Aushänge und 38 Züge mit den aufgezeichneten Interpreter- und Extraktor-Antworten. Auf 4.1.1 nachgespielt, ergibt er denselben Endzustand wie live:
- 36 Kampf-XP;
- 30 cp;
- zwei Paar Beingelenke mit je `qty` 2;
- der Vertrag bereit;
- der erste Strider lebend.

Erst danach wurde geändert.

### Befunde, Urteil, Ursache

| # | Befund (ChatGPT) | Urteil | Ursache im Code | Korrektur 4.1.2 |
|---|---|---|---|---|
| 1 | „walk back to the city“ als `npc_actor` verworfen | **bestätigt** | Der Agency-Guard nahm jedes Wort aus den Labels der Anwesenden als Akteur-Wort, auch das „Walk“ aus „Oss, Steward of the Eelmongers' Walk“ | `actorWords` nimmt aus jedem Label-Teil nur Name und Rolle, bis zum ersten Beziehungswort (`of`, `at`, `with` …). „the steward takes …“ und „Oss walks …“ bleiben `npc_actor` |
| 1 | „the guild building“ wurde ein neuer Ort, der Erzähler erfand ein Gildenbüro, später eine zweite Halle | **bestätigt** | (a) `go {new}` mit „guild“ blieb ein neuer Ort. (b) `resolvePlace` erkannte „guild building“ nicht als Halle. (c) Außerhalb einer Siedlung listete der Katalog nur die Städte des Reichs, **keine Hallen**. Die Wehre lagen richtig außerhalb von Glassmere; genau deshalb fehlte die Halle im Katalog | `go` auf „…guild…“ geht zur Halle der Siedlung, in der er ist. Draußen geht es zur Filiale des einen aktiven Vertrags, sonst zu der der Mitgliedschaft. Steht er schon in der Halle: „already here“. Draußen führt der Katalog die Hallen der Städte des Reichs und die vier neuesten im Spiel entstandenen Orte des Reichs. `resolvePlace` kennt „building“ |
| 1 | Abgabe im erfundenen Büro | **richtig abgelehnt** (Schutz hat gehalten) | – | unverändert |
| 2 | Der zurückkehrende Strider wurde „Bog Strider D“; der erste blieb lebend im Zustand | **bestätigt** | `creature.new` legte immer ein neues Tier an. Nichts verband die Rückkehr mit dem Tier, das die Szene verlassen hatte | Zeigt ein `creature.new` **ein** Tier einer Art, und gibt es am selben Ort genau ein lebendes, abwesendes Tier dieser Art und dieses Körperbaus, tritt dieses Tier wieder ein (`scene.entered`, dieselbe ID). Bei zwei oder mehr Kandidaten bleibt es ein neues Tier. Keine allgemeine Identitätsverwaltung |
| 3 | Vertrag „bereit“ bei 3 von 4 Tötungen; vier Paar Gelenke | **bestätigt** | `quest.ready` prüfte keine Zahl. Die vier Paare kamen, weil der Extraktor dem letzten Tier zwei Paare zuschrieb | Für DEFEAT-Ziele mit Zahl zählt die Engine die toten Tiere der genannten Art seit Annahme (`defeatTally`). Bei weniger ist `quest.ready` nur mit `alternative` gültig: Die Geschichte sagt, wie das Ziel anders erreicht wurde (der Rest dauerhaft vertrieben, die Kolonie zerschlagen). Sonst wird es abgelehnt (`quest_count`), und die Korrektur nennt die Zahl. Trophäen sind keine Zählung. Die Zahl steht im Katalog und im Quest-Gedächtnis (`defeated (engine count): 3 of 4 bog striders`) |
| 3 | Fakt „drei tot“ nach zwei Tötungen | **bestätigt** (weicher Fakt) | Fakten sind Gedächtnis. Die Engine prüft keine Zahlen darin | Die Engine-Zählung steht jetzt im Kontext. Der Erzählervertrag sagt „never state another“. Der Fakt selbst wird **nicht** abgefangen (Restrisiko) |
| 4 | „found 3 killed 2 *i say calmly*“ fragte nach einem Angriffsziel | **bestätigt** | `parseIntent` las „killed“ im gesprochenen Teil als Angriff | V4: Markiert der Spieler Taten mit Sternchen und nennt darin sein Sprechen („i say“), zählen nur die Sternchen-Teile als Taten (`deedsOf`). „Die! *i say and Heavy Slash at it*“ bleibt ein Angriff |
| 5 | „Heavy Slash at it“ bot Oss und die Köderfrau an | **bestätigt** | Das Pronomen fand keinen Namen, also galten alle gültigen Ziele | V4: „it“ meint die Kreaturen unter den Zielen. Bei zwei Kreaturen fragt die Engine weiter |
| 6 | „keep myself hidden as i lay in wait“ ohne Mechanik | **bestätigt** | `STEALTH_RE` kannte „hidden“ und „lay in wait“ nicht | V4 erkennt auch „keep myself hidden / out of sight / low“, „lay/lie in wait“ und „hold myself hidden“ als Heimlichkeit. Der Versuch geht an die V3-Heimlichkeitsmechanik; Erfolg ist nicht garantiert |
| 7 | `"type": "place"` im Extraktor | **bestätigt**, zweimal: Nachricht 50 (`place` neben dem `arrive`) und später (`place` in Fakt-Form, „Guild hall at Marlow's Staithe“) | Das Modell erfand einen Delta-Typ. Das Schema lehnte ihn ab, die vorhandene Reparatur lief. Der Event-Export zeigt die reparierte Fassung | Neue Vokabelregel: Nur die gelisteten Typen existieren; ein neuer Ort entsteht nur als Ortsreferenz eines `arrive` (oder `person.new at`). Regressionstest mit der aufgezeichneten Antwort. **Kein** neuer Fehlerbehandlungsmechanismus |
| + | Ein Fakt über das Zollhaus „at the landward end of the Eelmongers' Walk“ wurde der Schreiberin zugeordnet | **zusätzlich gefunden** | Der Rückgriff von `idOf` aufs letzte Wort traf „Walk“ in ihrer Rolle „…at the Eelmongers' Walk tollhouse“ | Der Rückgriff gilt nur für kurze Bezüge (höchstens drei Wörter, kein Beziehungswort) und vergleicht mit dem Kopfwort der Rolle |

### Gewünschte Designänderungen

1. **Aufgabe statt Endzustand.** Das Brett zeigt `task`, einen Imperativsatz des Board-Generators („Hunt and cull … so the eel boats can launch safely again.“). `desired_end_state` bleibt getrennt und intern: im Katalog, im Quest-Gedächtnis und im Annahme-Satz. Aushänge ohne `task` zeigen wie bisher den Endzustand. `#quest <Name>` zeigt die Aufgabe. Die Abschlusslogik ist unverändert.
2. **Jagdnachweis durch Körperteile.** Der Generator gibt Jagd- und Beseitigungsaufträgen einen artspezifischen Körperteil als Nachweis und keine örtliche Abnahme. Der Annahme-Satz nennt ihn: „Proof: … brought to a Guild hall; no local inspection, witness or signature is required.“ Ein `quest.detail` zu einem Jagdauftrag verliert Sätze, die eine Unterschrift, Prüfung oder Bestätigung zur **Bedingung** machen (ein Unterschriftswort zusammen mit must/before/until/only/once …). Der Rest der Notiz bleibt, und der Erzähler bekommt eine Korrektur. Liefer- und andere Aufträge behalten Quittungen.
3. **Overreach gelockert.** Die natürlichen Schritte einer gebuchten Handlung gehören zu ihr, etwa bei der Registrierung Unterschreiben, Messstein und zurück zum Schalter. Das steht gleichlautend in der Overreach-Regel des Extraktors (delta-0.14) und im Erzählervertrag. Hart bleiben:
   - Zahlen, Kaufen, Verkaufen;
   - Annehmen, Aufgeben, Abgeben von Aufträgen;
   - Angreifen;
   - Aufbruch zu einem anderen Ziel;
   - Inventar und alle Mechanik.

Unverändert und im Replay bestätigt: Erschaffung, Registrierung und einmalige Gebühr, Brett und Annahme, Kampfrechnung, Kampf-XP (36), Beuteerfassung, der Schutz vor der Abgabe an einem nicht autorisierten Ort.

Versionen:
- Engine 4.1.2;
- Vokabular `delta-0.14`;
- Extraktor `extract-4.9`;
- Board-Schema mit nullbarem `task`.

### Nachweise 4.1.2, nach Testart getrennt

| Testart | Prüfung | Ergebnis |
|---|---|---|
| deterministisch | `npm test` | **485/485** (4.1.1: 465) |
| deterministisch | neue Einzeltests `tests/v4/fixes_4_1_2.test.js` (je Befund der Fall des Laufs und der Fall, der bleiben muss) | 13/13 |
| deterministisch | Mutationsprobe: `agency.js`, `catalog.js`, `commands.js`, `intent.js`, `world.js` einzeln auf 4.1.1 zurückgesetzt | jede Datei lässt Tests fehlschlagen (2–7) |
| deterministisch | V3-Differenzlauf v8–v12 | identisch bis auf den Build-Stempel (die Intent-Änderungen gelten nur in V4) |
| deterministisch | P0-Rescore der gespeicherten Antworten | identisch mit 4.1.1; die Guard-Änderung verschiebt keine Messung |
| kontrolliertes Replay | Lauf 14:56 (`tests/v4/live_0930b.test.js`, 7 Tests): Rückkehr des Striders, keine Bereitschaft bei 3 von 4, keine örtliche Unterschrift, beide Teile des Rückwegs, Fakt nicht an der Schreiberin, die drei Eingaben | grün. Wo 4.1.2 anders entscheidet, weicht das Replay ab: Der zweite Kampf läuft gegen den zurückgekehrten Strider (nicht „D“), mit einfachen Angriffen bis zum Ende |
| Mock-Provider-Smokes | Browser-Smoke V3 + V4; echtes SillyTavern 1.19 mit Mock-Provider und Dummy-Schlüssel, V4 und V3 | OK; `secrets.json` danach `{}` |
| echter Modell-Live-Test | – | **keiner** für 4.1.2 |

**Lokal getestet, nicht live bestätigt:**
- ob der Board-Generator `task` schreibt und Jagdaufträgen Körperteile statt Unterschriften gibt;
- ob der Extraktor `alternative` nutzt, nur wenn die Geschichte es trägt;
- ob er keinen `place`-Typ mehr sendet;
- ob der Erzähler mit Halle im Katalog und `go` zur Halle keine Büros mehr erfindet;
- ob die gelockerte Overreach-Regel nichts durchlässt, was hart bleiben soll.

Die aufgezeichneten Antworten des Laufs sind die des Modells unter 4.1.1. Das Replay zeigt, was die Engine aus ihnen macht, nicht, was das Modell unter 4.1.2 antworten würde.

### Restrisiken 4.1.2

- **Heimlichkeit gegen Anwesende:** Die V3-Heimlichkeitsmechanik (`stealthEvents`) ist unverändert. Was sie gegen später eintreffende Tiere bewirkt, ist live nicht gesehen.
- **Nachricht 39:** „*I nod and go back down but i keep myself hidden …*“ läuft ganz als Heimlichkeit über V3. Das „go back down“ geht dabei verloren (wie jede Bewegung in einer V3-Heimlichkeitsnachricht).
- **Rückkehr eines Tieres:** Sie wird nur erkannt, wenn es genau ein passendes, abwesendes, lebendes Tier gibt. Bei zwei entkommenen Tieren derselben Art entsteht weiter ein neues. Ein wirklich neues Einzeltier derselben Art, während das entkommene noch lebt, wird als das alte gelesen (die seltenere Verwechslung).
- **Tötungszahl:**
  - Sie zählt nur Tiere, die die Engine als tot kennt (Kampf) und deren Art der Auftrag nennt. Tötet die Geschichte Tiere außerhalb eines Kampfes, fehlen sie in der Zählung; dann bleibt nur `alternative`.
  - Ein Extraktor, der `alternative` zu großzügig füllt, macht den Vertrag trotzdem bereit. Die Schranke ist die Extraktor-Regel, nicht die Engine.
- **Weiche Fakten** mit falschen Zahlen („three dead“) werden nicht abgefangen, nur durch die sichtbare Engine-Zählung überschrieben.
- **Erfundene Hallen:** Der Erzähler kann weiter Hallen erfinden. Die Engine bucht dort nichts, und `go` „zur Gilde“ führt jetzt zur echten Halle. Ein `arrive` an einer erfundenen „Guild hall“ ohne `go` bleibt ein gewöhnlicher Ort.
- **`go` mit „guild“:** Jeder `go {new}` mit dem Wort „guild“ geht zur Halle. Ein Ziel wie „the guild quarter“ würde ebenfalls dorthin führen.
- **Unterschriftsfilter:** Er arbeitet mit Wörtern. Ein Satz, der eine Unterschrift und „only“/„before“ enthält, ohne sie zur Bedingung zu machen, geht der Notiz verloren (mit Korrektur). Ein geschickt umschriebener Bedingungssatz kommt durch; dagegen stehen der Annahme-Satz und der Erzählervertrag.
- **`deedsOf`:** Es greift nur bei Sternchen mit einem Sprechverb darin. „I say I killed two“ ohne Sternchen läuft wie bisher.

### Nächster Live-Test (Build 4.1.2)

Einrichtung wie §5, Extension aus `claude/v4-integration-fixes-2026-09-30`; die Statuszeile zeigt `Avereth Engine 4.1.2`. Zusätzlich zu §5:

| # | Eingabe (sinngemäß) | Erwartet |
|---|---|---|
| 1 | Novice-Brett lesen | Jede Zeile sagt, **was zu tun ist** (Imperativ). Jagdaufträge nennen einen Körperteil als Nachweis, keine Unterschrift |
| 2 | Registrierung mit Messstein | Der Erzähler darf Unterschrift, Stein und Rückweg zum Schalter zeigen. Kein `overreach` dafür im Event-Log |
| 3 | einen Jagdauftrag annehmen | Annahme-Satz mit „Proof: … no local inspection, witness or signature is required“. Kein Zwischenstopp zum Abzeichnen |
| 4 | ein Tier entkommen lassen, später kommt es zurück | dieselbe ID im HUD (kein „D“). Nach dem Tod ist es tot |
| 5 | weniger Tiere töten als verlangt, Trophäen mitnehmen | Der Vertrag wird **nicht** bereit (`quest_count` in `#audit`), außer die Geschichte sagt klar, wie der Rest erledigt ist |
| 6 | „*i say calmly*“ mit einem Bericht über Getötetes | keine Zielfrage |
| 7 | „keep myself hidden as i lay in wait“ | eine Heimlichkeitsprobe in den System-Zeilen |
| 8 | draußen: „walk back to the city and to the guild building“ | zwei `GOES`, das zweite zur Halle der Stadt. Dort ist Abgabe möglich |

**Worauf achten:**
- `NOT APPLIED` / `ENGINE REFUSED` mit `quest_count`, `guild_quest_detail`;
- Extraktor-Reparaturen im Request-Log (ein erneuter `place`-Typ);
- ob Aushänge `task` haben.

---

## 10. Nachprüfung von 4.1.2 und Korrekturen 4.1.3

ChatGPT hat 4.1.2 (`0814ab5`) am Code geprüft und drei konkrete Lücken gemeldet. Jede wurde auf 4.1.2 reproduziert, bevor etwas geändert wurde. Die Regressionstests stehen in `tests/v4/review_4_1_2.test.js`, dazu ein Test am echten Endzustand des Laufs 14:56 in `live_0930b.test.js`.

| # | Befund | Urteil | Korrektur 4.1.3 |
|---|---|---|---|
| 1 | Der zweite Abschlussweg umgeht die Tötungszählung: `completeContract` nimmt einen Auftrag auch an, wenn der gelistete Nachweis im Inventar liegt | **bestätigt**. Drei getötete Wölfe und vier Paar Ohren: Die Abgabe bezahlte 90 cp, obwohl die Zählung `quest.ready` abgelehnt hätte. Im Nachspiel des Laufs 14:56 griff der Fehler nur zufällig nicht, weil der Extraktor die Einheit „pairs of leg joints“ schrieb und der Nachweis „pairs“ verlangte. Mit passender Einheit zahlt 4.1.2 auch dort | Eine Prüfung für alle Wege: `contractReady` in `src/v4/guild.js` |
| 2 | Die Jagd-Erkennung ist zu allgemein: Jedes ATTACK/DEFEAT-Ziel machte einen Auftrag zur Jagd | **bestätigt**. „Repariere den Wachposten“ mit einem Rattenkampf verlor die Prüfung des Wachhauptmanns vollständig (`guild_quest_detail`). Der Annahme-Satz widersprach sich selbst: „Proof: ‚signed by the watch captain‘ … no local inspection, witness or signature is required“ | Jagd = Tötungsarbeit; gemischte Aufträge behalten ihre Nachweise |
| 3 | `deedsOf`: „I attack the wolf. *I shout* Get back!“ | **bestätigt**: Die Engine erkannte keinen Angriff | Sätze außerhalb der Sternchen, die eine eigene Tat im Präsens erklären, zählen wieder |
| + | selbst gefunden: Ein Jagdauftrag ohne gelisteten Nachweis hieß im Annahme-Satz „Proof: no fixed verification listed brought to a Guild hall“ | Fehler aus 4.1.2 | Fällt zurück auf „trophies of the kills“ |
| + | selbst gefunden: 4.1.2 änderte Prompt und Schema des Board-Generators (`task`, Jagdnachweis), die Version blieb `board-4.4` | Versäumnis in 4.1.2 | `board-4.5` |

**Eine Prüfung für alle Wege (1).**

Jeder Abschluss eines Gildenauftrags läuft über `completeContract`:
- die Abgabe am Schalter;
- die Abgabe bei Ankunft in der Halle.

Die Firewall verbietet `quest.close` für Gildenaufträge. `completeContract` fragt jetzt `contractReady`, und dieselbe Funktion bestimmt auch die Ankündigung „TURNS IN, when he reaches the Guild hall“.

Bedingungen der Prüfung:
- Das Ergebnis muss belegt sein: durch die Bereitschaft der Geschichte (`quest.ready`) oder den gelisteten Nachweis in der Hand.
- Ein DEFEAT-Ziel mit Zahl braucht zusätzlich die Tötungen nach der Engine-Zählung.
- Ausnahme: Die Geschichte hat erzählt, wie das Ziel anders erreicht wurde. Dieses `alternative` aus `quest.ready` bleibt jetzt am Auftrag gespeichert (`ready_alternative`).
- Trophäen zählen nicht als Tötungen.

Folgen:
- Eine glaubwürdige andere Lösung bleibt möglich und wird genau einmal bezahlt.
- Ein Auftrag ohne Zahl (Kräuter, „the weasel“) ist unverändert.
- Eine Bereitschaft, die ein älterer Build ohne Zählung gebucht hat (die Kampagne vom 14:56-Lauf), wird bei der Abgabe ebenfalls geprüft. Katalog und Quest-Gedächtnis zeigen sie dann als „NOT READY FOR TURN-IN“ statt „READY“.

**Jagd oder gemischt (2).**

Eine Jagd besteht aus ATTACK/DEFEAT. Daneben sind nur erlaubt:
- FIND und GO, um die Ziele zu finden und zu erreichen;
- DEFEND für das, was sie bedrohen. Die Bog Striders des Laufs (FIND, DEFEAT, DEFEND) bleiben damit eine Jagd.

Jedes andere Ziel (REPAIR, DELIVER, ESCORT, GATHER, GET, GIVE, USE, TALK) macht den Auftrag gemischt:
- keine Streichung von Unterschriftsbedingungen in `quest.detail`;
- kein „no local inspection“ im Annahme-Satz.

Die Tötungszählung gilt weiter für jedes DEFEAT-Ziel mit Zahl, auch in gemischten Aufträgen. Board-Generator und Erzählervertrag sagen jetzt: Gemischte Arbeit behält den Nachweis, den ihre anderen Teile brauchen.

**Taten außerhalb der Sternchen (3).** Mit der Sprechkonvention („*I shout*“) zählen neben den Sternchen-Teilen auch Sätze außerhalb, die mit „I“ beginnen und im Präsens eine Tat erklären. Beispiele: „I attack the wolf.“ und „and I slash at the wolf“. Weiter als Rede gelten:
- Berichte in der Vergangenheit („I found three and killed two“);
- Drohungen und Pläne („I will kill you all“, Core #23);
- Perfekt („I have killed two“);
- alles ohne „I“ am Satzanfang.

Das gilt nur in V4.

**Beobachtung beim Nachspiel, nicht geändert.** In der aufgezeichneten Antwort des Laufs (Modell unter 4.1.1) kommt Alaric am erfundenen „Guild desk tollhouse“ an. Die Engine nimmt diese Ankunft als neuen Ort an, weil die Geschichte entscheidet, wo er ankommt. Die Abgabe dort lehnt sie ab. Seit 4.1.2 steht im PLAYER-ACTIONS-Satz „GOES — to Adventurers' Guild hall, Glassmere“. Ob der Erzähler trotzdem noch ein Büro erfindet, ist Punkt 2 des nächsten Live-Tests. Einer Empfehlung aus dem Review folgend kommt vorher kein weiterer Sonderfall dazu.

### Nachweise 4.1.3, nach Testart getrennt

| Testart | Prüfung | Ergebnis |
|---|---|---|
| deterministisch | `npm test` | **496/496** (4.1.2: 485) |
| deterministisch | neue Regressionstests `review_4_1_2.test.js` (10) und am Endzustand des Laufs 14:56 (`live_0930b.test.js`, 1) | 11/11; die drei Befunde vorher auf 4.1.2 reproduziert (Abgabe bezahlt, Notiz verworfen, kein Angriff) |
| deterministisch | Mutationsprobe: sechs Teilkorrekturen einzeln abgeschaltet (Zählung bei der Abgabe, Jagd-Erkennung, `deedsOf`, READY-Anzeige, Nachweis-Rückfall, gespeicherte Alternative) | jede lässt 1–4 Tests fehlschlagen |
| deterministisch | V3-Differenzlauf v8–v12 | identisch bis auf den Build-Stempel |
| deterministisch | P0-Rescore der gespeicherten Antworten | identisch mit 4.1.2 |
| Mock-Provider-Smokes | Browser-Smoke V3 + V4; echtes SillyTavern 1.19 mit Mock-Provider und Dummy-Schlüssel, V4 und V3 | OK; `secrets.json` danach `{}` |
| echter Modell-Live-Test | – | **keiner** für 4.1.2 oder 4.1.3 |

### Restrisiken 4.1.3

- **Alternative:** Nur der Extraktor schreibt `alternative`, und die Engine prüft nicht, ob die Geschichte sie trägt. Ein zu großzügiges `alternative` macht den Auftrag bezahlbar. Das ist der bewusste Preis dafür, dass andere Lösungen möglich bleiben.
- **Tötungen außerhalb der Kampfmechanik** zählen nicht (wie 4.1.2); dann hilft nur `alternative`.
- **Spielstände unter 4.1.2:** 4.1.2 schrieb eine angenommene Alternative nur in die Notiz. Ein dort so bereit gebuchter Auftrag gilt unter 4.1.3 bei der Abgabe als nicht bereit, bis die Geschichte die andere Lösung erneut feststellt (der Katalog zeigt „NOT READY FOR TURN-IN“). Ein unter 4.1.2 gespielter Spielstand ist nicht bekannt; der letzte Live-Lauf lief auf 4.1.1.
- **Gemischte Jagden:** Eine Jagd mit einem TALK-Ziel („sprich mit dem Vogt“) gilt als gemischt. Eine örtliche Unterschrift darin wird nicht gestrichen; das ist der Stand vor 4.1.2 und die vorsichtige Seite.
- **DEFEND mit DEFEAT gegen Menschen** (eine Wachschicht gegen Räuber) gilt als Jagd. Eine Bestätigungsbedingung darin wird gestrichen.
- **`deedsOf`:**
  - „I'm attacking …“ (Kurzform) und Taten ohne „I“ am Satzanfang zählen außerhalb der Sternchen weiter nicht.
  - Ein Satz wie „I strike the wolf“ nach „*i say*“ gilt als Tat, auch wenn er gesprochen gemeint war.
- **Karte:** Erzählervertrag und Board-Generator haben sich geändert. Für den Live-Test muss die Kartenbeschreibung neu aus `content/narrator/Avereth_Narrator_Contract_v4.txt` kopiert werden.

### Nächster Live-Test (Build 4.1.3)

Einrichtung wie §5, Extension aus `claude/v4-integration-fixes-2026-09-30`; die Statuszeile zeigt `Avereth Engine 4.1.3`. Die Kartenbeschreibung neu aus dem Erzählervertrag v4 kopieren. Die fünf entscheidenden Situationen (Review 4.1.2):

| # | Situation | Erwartet |
|---|---|---|
| 1 | Ein Monster entkommt und kommt später zurück | dieselbe ID im HUD, kein „D“; nach dem Tod ist es tot |
| 2 | Alaric kehrt ausdrücklich zu einer bekannten Gildenhalle zurück („back to the city and to the guild“) | `GOES — to Adventurers' Guild hall, …`, Ankunft in der Halle; kein neuer Ort, kein erfundenes Büro |
| 3 | Ein Jagdauftrag wird abgeschlossen | Tötungen (HUD/Kampfzeilen), Trophäen (Inventar) und Bereitschaft passen zusammen. Bei weniger Tötungen als verlangt: kein `QUEST READY`, und die Abgabe wird mit „the engine counts N of M …“ abgelehnt, auch mit genug Trophäen |
| 4 | Eine glaubwürdige andere Lösung ohne alle Tötungen (Anführer tot, der Rest flieht endgültig) | `QUEST READY` mit dem Grund; die Abgabe wird angenommen |
| 5 | Die Abgabe | Lohn und Quest-XP genau einmal; eine zweite Abgabe: „already turned in“ |

Aus §9 weiter mitprüfen:
- Aushänge im Imperativ;
- Jagdnachweis ohne Unterschrift, bei gemischten Aufträgen mit dem passenden Nachweis;
- Registrierung ohne `overreach`;
- „*i say*“-Berichte ohne Zielfrage;
- „keep myself hidden“ als Heimlichkeitsprobe.

---

## 11. Nachprüfung von 4.1.3 und Korrekturen 4.1.4

Eine unabhängige Prüfung von 4.1.3 (`5a8ccab`) hat drei Punkte gemeldet. Alle drei wurden auf 4.1.3 nachgewiesen, bevor etwas geändert wurde. Die Regressionstests stehen in `tests/v4/review_4_1_3.test.js`. Alle fünf Tests schlagen auf 4.1.3 fehl und laufen auf 4.1.4 durch. Der Patch ist klein und enthält keinen Umbau.

| # | Befund | Urteil | Korrektur 4.1.4 |
|---|---|---|---|
| 1 | Gesprochenes löst Kampf aus: `*I say* I strike the wolf.` | **bestätigt**; mein eigener 4.1.3-Test erwartete sogar den Angriff. Dieselbe Lücke gab es auf der anderen Seite der Sprechmarke: „I strike you down *I shout*“, „I strike you down. *I shout*“ und „Get back! *I shout* and I slash at the wolf“ waren Angriffe | Was eine Sprechmarke als gesagt ausweist, ist nie eine Tat (siehe unten) |
| 2 | Die Jagd-Erkennung sieht nur Verben: `FIND bandits` + `DEFEAT bandits` galt als Jagd | **bestätigt** | Kampf gegen Menschen ist keine Jagd. Erkannt wird das über die Rollenwörter der NPC-Vorlagen |
| 2+ | selbst gefunden: Die Tötungszählung zählte nur Kreaturen | **bestätigt**: Bei „DEFEAT 2 bandits“ blieb es nach zwei toten Banditen bei „0 of 2“. Bereitschaft und Abgabe wären ohne `alternative` nie möglich gewesen | Menschen zählen nach ihrer Rolle |
| 3 | Die Anzeige der Bereitschaft folgt nicht `contractReady`: Bei voller Zahl und Nachweis in der Hand nahm der Schalter an, der Katalog zeigte nichts | **bestätigt** | Katalog und Quest-Gedächtnis zeigen, was `contractReady` entscheidet |

**Rede (1).** Mit einer Sprechmarke („*I say*“, „*I shout*“) gilt außerhalb der Sternchen:
- **Die Worte danach** bis zum nächsten Sternchen-Teil sind gesagt: `*I say* I strike the wolf.`, `Get back! *I shout* and I slash at the wolf`.
- **Die Worte direkt davor** sind ebenfalls gesagt: `I found three and killed two *I say calmly*`, `I strike you down *I shout*`. Das gilt auch mit Punkt, wenn nach der Marke nichts mehr kommt: `I strike you down. *I shout*`.
- **Ausnahme:** Ein mit Punkt abgeschlossener Satz vor einer Marke, die danach eigene Worte hat, ist erzählt. Deshalb bleibt `I attack the wolf. *I shout* Get back!` ein Angriff.
- **Was sonst zählt:** die übrigen Sätze außerhalb der Sternchen nur, wenn sie eine eigene Tat im Präsens erklären; die Sternchen-Teile immer (`*I shout* Get back! *I strike the wolf*` ist ein Angriff).

Das gilt nur in V4. Wer nach einer Sprechmarke handeln will, schreibt die Tat in Sternchen.

**Jagd gegen Menschen (2).**
- Eine Jagd ist Tötungsarbeit gegen Tiere oder Monster.
- Nennt ein Tötungs- oder Suchziel Menschen, ist der Auftrag keine Jagd: `FIND bandits`, `DEFEAT the raiders`, `Rook's brigands`, `FIND the missing trapper`.
- Erkannt werden Menschen an den Rollenwörtern, die die Engine schon für NPCs kennt (`content/npc_templates.json`: bandit, brigand, raider, outlaw, guard, soldier, mercenary, poacher, hunter …). Es gibt keine neue Liste und keine Questtypen.
- Die allgemeinen Wörter man/woman/boy/girl zählen nicht (`the wolf-man`, `a man-eating tiger` bleiben Monster). Ein Besitzer zählt ebenfalls nicht (`the miner's cave troll`).
- Folge: Ein Banditenauftrag behält seinen Nachweis und die örtliche Bestätigung. Der Annahme-Satz sagt nicht „no local inspection“.
- Board-Generator (`board-4.6`) und Erzählervertrag sagen jetzt: Arbeit gegen Menschen ist keine Jagd, ihr Nachweis passt zur Arbeit und besteht nie aus Körperteilen.

**Zählung von Menschen (2+).**
- Ein DEFEAT-Ziel, das Menschen nennt, zählt tote Personen gleicher Rolle seit der Annahme. „raiders“ und ein toter „brigand“ sind beide Banditen.
- Ein Ziel mit Tieren oder Monstern zählt nur Kreaturen wie bisher, also nie einen toten „wolf hunter“.
- Ergeben haben sich Menschen nicht als tot, sie zählen nicht. Das bleibt eine Sache für `alternative`.

**Anzeige = Verhalten (3).** `readyText` fragt jetzt `contractReady`:
- „READY FOR TURN-IN: …“ steht genau dann da, wenn der Schalter annehmen würde.
- Mit dem gelisteten Nachweis in der Hand heißt es „the listed proof is in hand (…)“.
- Eine von der Zählung gesperrte Bereitschaft der Geschichte erscheint als „NOT READY FOR TURN-IN“.
- Der Test prüft sieben Fälle gegen Katalog, Quest-Gedächtnis und die tatsächliche Abgabe.

**Beobachtet, nicht geändert:** V4 legt Personen mit `template: 'commoner'` an (`src/v4/world.js`). Der Kampf nimmt diese Vorlage vor den Rollenwörtern, also kämpft ein Bandit in V4 mit Werten eines Bürgers. Das ist eine Balancefrage außerhalb dieses Patches; sie wird im Live-Test sichtbar, wenn Menschen kämpfen.

### Nachweise 4.1.4, nach Testart getrennt

| Testart | Prüfung | Ergebnis |
|---|---|---|
| deterministisch | `npm test` | **501/501** (4.1.3: 496) |
| deterministisch | neue Regressionstests `review_4_1_3.test.js` | 5/5; auf 4.1.3 (`5a8ccab`) 0/5 |
| deterministisch | angepasste 4.1.3-Erwartungen (gewollte Regeländerung) | `*i say* I strike the wolf.` und `Get back! *I shout* and I slash at the wolf` jetzt Rede; `isHunt` bekommt `content`; die Board-Version wird nur noch als „nicht mehr 4.4“ geprüft |
| deterministisch | Mutationsprobe: fünf Teilkorrekturen einzeln abgeschaltet | jede lässt 1–2 Tests fehlschlagen |
| deterministisch | V3-Differenzlauf v8–v12 | identisch bis auf den Build-Stempel |
| deterministisch | P0-Rescore der gespeicherten Antworten | identisch mit 4.1.3 |
| Mock-Provider-Smokes | Browser-Smoke V3 + V4 | OK |
| Mock-Provider-Smokes | echtes SillyTavern 1.19, V4 | erster Lauf 16/17: `noPageErrors` durch eine Fehlermeldung aus SillyTaverns eigener Verbindungsprüfung (`AbortReason @ openai.js:4565`, abgebrochene Statusabfrage; kein Engine-Code). Einmalige Wiederholung 17/17 |
| Mock-Provider-Smokes | echtes SillyTavern 1.19, V3 | OK |
| Mock-Provider-Smokes | `secrets.json` nach den Läufen | `{}` |
| echter Modell-Live-Test | – | **steht aus**; nächster Schritt |

### Restrisiken 4.1.4

- **Rollenwörter:** Menschen werden nur an den Rollenwörtern der NPC-Vorlagen erkannt. „cultists“, „smugglers“ oder „pirates“ stehen dort nicht und gelten weiter als Monster. Der Board-Generator ist angewiesen, ihnen trotzdem keinen Körperteil-Nachweis zu geben.
- **Sprechkonvention:**
  - Die Regel hängt an Sprechverben in den Sternchen („say“, „shout“, „ask“ …). „*I yell*“ ist keine Marke; die Nachricht wird dann wie ohne Konvention gelesen.
  - Eine Tat direkt vor einer Marke ohne Punkt wird als gesagt gelesen. Das ist die vorsichtige Seite: kein Kampf aus Worten.
- **Menschen, die sich ergeben,** zählen nicht als besiegt; die Geschichte kann das über `alternative` feststellen.
- Alle Restrisiken aus §10 und §9 gelten weiter.

### Der echte Live-Test (Build 4.1.4)

**Einrichtung** wie [LIVETEST_V4.md §2](LIVETEST_V4.md#2-einrichtung-in-sillytavern):
- Extension `avereth-engine/` aus `claude/v4-integration-fixes-2026-09-30`; die Statuszeile zeigt `Avereth Engine 4.1.4`.
- Die Kartenbeschreibung **neu** aus `content/narrator/Avereth_Narrator_Contract_v4.txt` kopieren (geändert in 4.1.2, 4.1.3 und 4.1.4).
- Neuer Chat, Erschaffung als Warrior.

**Zu prüfen:**

| # | Situation | Erwartet |
|---|---|---|
| 1 | Ein Monster entkommt und kommt später zurück | dieselbe ID im HUD (kein neues „D“), nach dem Tod tot |
| 2 | Ausdrücklich zurück zu einer bekannten Gildenhalle | `GOES — to Adventurers' Guild hall, …`; Ankunft in der Halle, kein erfundenes Büro |
| 3 | Jagdauftrag abschließen | Tötungen, Trophäen und Bereitschaft passen zusammen. Bei zu wenigen Tötungen: kein `QUEST READY`, und die Abgabe wird auch mit genug Trophäen abgelehnt („the engine counts N of M …“) |
| 4 | Eine glaubwürdige andere Lösung (Anführer tot, der Rest flieht endgültig) | `QUEST READY` mit dem Grund; die Abgabe wird angenommen |
| 5 | Abgabe | Lohn und Quest-XP genau einmal; eine zweite Abgabe: „already turned in“ |
| 6 | Mit Sprechmarke reden, ohne zu kämpfen: „I could kill them all *I say*“, „*I say* I strike first next time.“ | kein Kampf, keine Zielfrage |
| 7 | Mit Sprechmarke kämpfen: „I attack the wolf. *I shout* Get back!“ oder die Tat in Sternchen | ein Angriff |
| 8 | Falls das Brett einen Auftrag gegen Menschen zeigt (Banditen, Räuber) | kein „no local inspection“ im Annahme-Satz. Tote Banditen zählen in „defeated (engine count)“ |

**Zurückschicken:** wie [LIVETEST_V4.md §6](LIVETEST_V4.md#6-zurückschicken): Chat-Export, Event-Log, Request-Log. **Keine Schlüssel, keine Authorization-Header.**
