# Integration 4.1: das ChatGPT-Experiment 4.0.1–4.0.9 geprüft und eingebaut

**Stand 30.09.2026, Build 4.1.0.** Dieses Dokument hält fest, was aus dem Experiment übernommen, überarbeitet, ersetzt oder verworfen wurde, und warum. Es beschreibt auch den nächsten Live-Test (§5).

| | Branch | Commit |
|---|---|---|
| Basis (bisheriger Stand, unverändert) | `claude/happy-wright-1a4y19` | `1cbfdd4` |
| Experiment (unverändert) | `chatgpt/v4-livetest-fixes-2026-09-28` | `a067bd0` (4.0.9); der Live-Lauf 30.09. lief auf 4.0.8 (`2f5eeb5`) |
| Integration | `claude/v4-integration-2026-09-30` | von `1cbfdd4`; der Merge-Commit `f1b6bdd` holt `a067bd0` als Prüfgegenstand herein, die Folge-Commits überarbeiten ihn Teil für Teil |

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

## 5. Nächster Live-Test (Warrior-Baseline, Build 4.1.0)

**Einrichtung** wie [LIVETEST_V4.md §2](LIVETEST_V4.md#2-einrichtung-in-sillytavern), mit folgenden Abweichungen:
- Extension aus `claude/v4-integration-2026-09-30`; die Statuszeile zeigt `Avereth Engine 4.1.0`.
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

**Worauf achten:**
- nach jeder Ankunft die Liste der Anwesenden;
- doppelte Personen;
- die System-Zeilen `NOT APPLIED` und `ENGINE REFUSED`;
- Münzen im HUD.

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

## 7. Nachweise

| Prüfung | Ergebnis |
|---|---|
| `npm test` | **448/448** (Basis `1cbfdd4`: 392/392; 4.0.9: 368/420) |
| V3-Differenzlauf der Fixtures v8–v12 (Prompts, Records, Nachforderungen, Endzustand) | identisch zu `1cbfdd4`, nur der Build-Stempel |
| Replay des Laufs 30.09. auf 4.1.0 (`tests/v4/live_0930.test.js`) | C1, C3–C7 und D wie erwartet; Level 2 mit 8 XP, 120 cp → 119 cp |
| Mutationsprobe: elf Korrekturen einzeln zurückgedreht | jede lässt mindestens einen Test fehlschlagen |
| P0-Rescore (Firewall, Agency-Guard) | verboten 7 → 1, kritisch 58 → 58 (4.0.9: 57); Guard 100 % Negativ-Präzision, Recall 94,2 % |
| Browser-Smoke (V3 + V4) | OK |
| echtes SillyTavern 1.19, Mock-Provider, Dummy-Schlüssel | V4 17/17, V3 OK; Schlüssel danach entfernt |
