# Fachplan B – Dungeonräume und Erkundungsarchitektur

**14.11.2026 · Claude · Etappe 2 von 3, keine Implementierung, keine Designfreigabe.**

**Prüfstand:** `4438241` (`.189`). **Baut auf:** [Fachplan A](FACHPLAN_A_ORTSBUCH_BEWEGUNGSPLAN_2026-11-14.md) (Ortsbuch, Bewegungsnachweis), [Grundanalyse](ORT_REISE_UMGEBUNG_ARCHITEKTUR_GRUNDANALYSE_2026-11-14.md), [GPT-Gegenreview](ORT_REISE_UMGEBUNG_GPT_GEGENREVIEW_2026-11-14.md) §3.4, Kanon §7/§10. Nachweisgrade wie in Fachplan A.

## 0. Ergebnis

**Der Befund:** Im Dungeon laufen **zwei Modelle nebeneinander**:
- **Raumgraph aus Patch 7:** Räume, Wege, verborgene Wege, Blocker, Ebene aus Richtung. Er entsteht **aus der Erzählung** („No map is generated: the place is what the story established“, `dungeon.js:20`).
- **Teil- und Slotspur aus Patch 8:** Je Ebene eine feste Folge von Begegnungen mit ruhigen Teilen dazwischen (`pace`). „Der nächste neue Teil hält den nächsten Slot“ (`living.js:135–151`, `273–285`). Sie ist **engine-bestimmt und vorab bekannt**.

Beide Mage-Fälle entstehen, weil die Spur einen Teil ankündigt, den der Graph dann nicht zulässt.

| Variante | Urteil |
|---|---|
| **B1** heutiges dynamisches System mit einer gemeinsamen Topologieprüfung | **Rückfallweg**, falls D1 abgelehnt wird; löst die Widersprüche, lässt die Kartografie beim Extractor |
| **B2** vollständig vorab erzeugtes Raumnetz | **nicht empfohlen**: Vorabaufwand ohne spielerischen Gegenwert, schwierige Migration |
| **B3** inkrementell engine-erzeugtes Raumnetz | **richtige Richtung**, in freier Form zu offen (Ausgangsverwaltung, Schleifen, Platzhalter) |
| **B4** Hybrid mit festen Schlüsselknoten | Teilgedanke übernommen (Treppe am Ende der Spur), als eigene Variante unnötig |
| **B5** Spur ohne Graph | **ernsthafte Alternative**: entfernt am meisten, verliert Verzweigungen und alternative Wege |
| **B6 (eigene) Hauptgang mit Seitenräumen** | **empfohlen**: B3, beschränkt auf das, was die Spur ohnehin vorgibt. Ein Baum je Ebene, von der Engine beim Betreten erzeugt; der Erzähler beschreibt und benennt |

**Zusätzliche Entscheidung (B5-Verzicht):** Die Raum-für-Raum-Navigation gilt nur noch in **echten Living Dungeons**. Die Patch-7-Regel „zwei betretene Räume einer Stätte machen sie raumweise“ entfällt. Sie hat in `.188` die Tannery Rows zu einem Pseudo-Dungeon gemacht (Rogue #62).

---

## 1. Heutige Zusammenarbeit [C]

| Baustein | Stelle | Aufgabe |
|---|---|---|
| Klassifikation | `dungeon.js:7–21`, `complexOf` 31, `dungeonOf` 41, `trueDungeonOf` 47 | „raumweise“ (`rooms`) gegenüber „echter Dungeon“ (`dungeon.real`) |
| Living-Struktur | `living.js:1–30`, `establishEvents` 159–194 | Gate, Kapazität, Reset, Ebenen mit Rang, Slots, Pace, Siegel, Ressourcen je Ebene, Parteien; deterministisch aus Seed |
| Spur | `floorRun` 135–151, `nextSlot` 274, `aheadEvents` 346–383 | nächster Slot im nächsten neuen Teil; `DUNGEON AHEAD`-Zeilen |
| Gate | `gateCheck`, `gateOfferEvents`, `entranceOf` 501, `sealRefusal` 523 | Zutritt, Gebühr, versiegelte Ebene |
| Teile | `world.js arrive()` 2686–2692 | ein neu betretener Raum zählt als Teil (`dungeon.part`) |
| Slot-Materialisierung | `slotForNew` `living.js:286–315` | ordnet ein **erzähltes** `creature.new` einem Slot zu |
| Graph | `links`, `exitsFrom` 253, `wayBetween` 240, `blockerOf` 167, `roomKnown` 181, `roomByName` 324, `levelVia` 358, `floorRefusal` 415 | Wege, Richtung, Blocker, Bekanntheit, Ebene aus Richtung |
| Befehl | `dungeonGo` `commands.js:421–470` (`explore` 464), `livingGo` 475–517, GO-Zeile 697 | Weg wählen, Raum suchen („a stair, a door, a passage“), Gate, `DUNGEON AHEAD` |
| Extractor-Vertrag | Typen `passage` (1,1k Zeichen), `feature` (1,6k), Regel „Down means another Dungeon FLOOR“ (`extract.js:146`), Raum als `{new, kind:'interior', parent}` | Räume und Wege **meldet die Erzählung** |
| World | `arrivalPlace` 285–301, `resolvePlace` 166–174, `wayRefused` 2434–2475, `passage`-Annahme, `arrive()` Linkerzeugung 2678–2684 | Raum anlegen, Ebene ableiten, Weg prüfen, Weg aus dem Gehen erzeugen |

**Inhalt:** drei kanonische Dungeons [C `lore.json`]:
- **Mossback Warrens:** 2 Ebenen; Ebene 1 Diener, Diener, Wächter; Ebene 2 Diener, Boss.
- **Glimmerdeep Grotto:** 1 Ebene; Käfer, Schleime, Glimmer Queen als Boss.
- **Old Crown Catacombs:** 2 Ebenen; Ebene 1 versiegelt bis zum Wächter.

Weitere Dungeons kann das Spiel aus seiner Klassifikation entdecken.

---

## 2. Originalproben [D][R]

| Fall | Was geschah | Ursache im Modell |
|---|---|---|
| **`.186` Mage #63–#82** | GO „the Grotto mouth“; fünf erzählte Räume (Mundtunnel, Galerie, Kristallkamm, Höhlung), jede Ankunft abgelehnt („lies in Glimmerdeep Grotto, where he did not set out for“). Die fünf Räume **blieben angelegt**, nie betreten, im gemeinsam genutzten Dungeon | Zielauflösung (→ Fachplan A); Anlegen vor der Prüfung (→ A); **Räume aus Erzählung** in einem persistenten Dungeon |
| **`.188` Mage #90–#102** | Ein NPC berichtet von der „deep gallery … where the floor slopes down“, der Extractor legt einen berichteten Raum an. Dreimal GO, `explore` autorisiert, `DUNGEON AHEAD`: „a part of level 1 he has not seen: there he meets The Glimmer Queen“. Die Erzählerzeile sagt „a stair“, die Erzählung geht „down“. `levelVia` macht daraus Ebene 2, die nicht existiert, oder es gibt keinen gemeldeten Weg. Dreimal `TARGET NEEDED` | **Spur (Ebene 1, Queen)** gegen **Graph (Treppe = Ebene+1)** gegen **Vertrag („Down means another FLOOR“)** |
| **`.188` Mage #111/#112** | GO `{new}` über die Gabelung in einen neuen Teil → Raum angelegt, Queen materialisiert, keine Probleme | der Weg „neuer Teil durch ein GO ins Unbekannte“ funktioniert |
| **`.188` Rogue #61/#62** | Die Tannery Rows (ein Viertel, Stätte im Reich) tragen `rooms: true` (zwei Innenräume betreten). Die berichtete Stätte „lime pits' sluice“ gilt als Raum ohne Weg; autorisierte Ankunft abgelehnt | Raumregel außerhalb echter Dungeons |
| **`.186` Warrior/Rogue Mossback** | 2 bzw. 2 Räume, 1–2 Teile, Slots materialisiert, keine Topologieablehnung | Normalfall ohne Berichte und Treppen |
| **Natürliche Abstiege auf Ebene 2** | **keiner** in `.186`/`.188`; der Replay-Korpus (b16–b19) hat nur einen etablierten Living Dungeon, 5 Teile, keine Räume mit Ebene | Mehrebenenfälle sind nur geskriptet belegt |
| **Skript-Abdeckung** | 44 Testdateien mit Topologie; Patch-7-Fälle: Wege in beide Richtungen, Rutsche einseitig, zwei Türen gleichen Namens, Eisentür und Schacht als zwei Wege, verborgene Platte auf dem Rückweg, versperrter Weg, „back“, Truhe, Begleiter von Raum zu Raum, Karte nach Ebenen, Swipe; Patch 8: Gate-Ebene, Treppe hinab zu Ebene 2 (live 21./22.10.) | was eine neue Architektur weiter leisten oder bewusst aufgeben muss |

**Folgerung:** Wo die Engine den neuen Teil **selbst** bestimmt (GO ins Unbekannte, `livingGo` „the engine places what that part holds before the story tells it“), funktioniert der Dungeon. Wo Raum, Weg oder Ebene **aus der Erzählung** kommen, entstehen die Widersprüche. Wie häufig Verzweigungen, Schleifen und alternative Wege im natürlichen Spiel genutzt werden, ist **nicht belegt**. In beiden Läufen gab es eine Gabelung, in Tests mehrere.

---

## 3. Varianten

### B1 – Dynamisches System, eine verbindliche Topologieprüfung

**Inhalt:**
- **Prüfung:** Die Erzählung erzeugt Räume und Wege weiter. Eine einzige Funktion `dungeonStep(state, step)` entscheidet für GO-Handler und World gleich, was eine Ankunft im Dungeon erlauben darf (Fachplan A2 `enter`).
- **Ebene:** Die Ebene eines neuen Raums ist die vom Schritt bestimmte. „Down“ ist nur dann eine neue Ebene, wenn die Spur einen Abstieg erlaubt (letzter Teil oder Wächter tot). Sonst ist es ein Gefälle auf derselben Ebene.
- **Berichtete Räume:** Sie sind über einen Weg erreichbar, den diese Antwort zeigt.
- **Anlegen:** erst nach der Prüfung.

**Wirkung:** `.188` Mage ✓, `.186` Mage ✓ (mit A), Rogue #62 nur mit B5-Verzicht.

**Bleibt:** Raum-, Durchgangs- und Ebenenmeldungen des Extractors, `roomByName`, Linkerzeugung aus dem Gehen, Reparaturen bei Ortsreferenzen im Dungeon.

**Entfällt:**
- `explore`-Umschreibung,
- `elsewhere`/`unseen` (über A),
- die Vorprüfung in `arrivalPlace`,
- zwei der sieben `floorRefusal`-Aufrufe.

**Bewertung:** kleiner Umbau, der den Widerspruch schließt, aber nicht dessen Quelle (die Erzählung baut den Dungeon). Sinnvoll als Sofortfix und als Rückfallweg.

### B2 – Vollständig vorab erzeugtes Raumnetz

**Inhalt:** Beim Etablieren erzeugt die Engine je Ebene alle Räume, Verbindungen (mit Richtung), verborgenen Ausgänge, Hindernisse und Slotplätze. Der Erzähler beschreibt nur.

**Wirkung:** alle Widersprüche ✓; vollständige `#map` möglich.

**Gegenargumente:**
- **Vorabaufwand:** Raumanzahl, Layout und Platzierung sind ohne spielerischen Gegenwert festzulegen, denn Parteien und Reset arbeiten über Slots, nicht über Räume.
- **Erzählung:** Der Erzähler muss vorgegebene Details glaubwürdig übernehmen. Erfundene Hindernisse oder Gegenstände kollidieren mit vorab erzeugten.
- **Migration:** Bestehende, erzählte Räume in laufenden Kampagnen lassen sich nicht in einen vorab erzeugten Plan einpassen.
- **Kanon:** Am nächsten an einer „universellen Raumstruktur“ (§7), die der Kanon nicht will.

**Bewertung:** **nicht empfohlen.** Es ist am meisten neuer Code und Zustand, ohne dass ein Originalfall mehr gelöst wird als mit B3/B6.

### B3 – Inkrementell engine-erzeugtes Raumnetz

**Inhalt:**
- **Erzeugen beim Betreten:** Geht Alaric durch einen unerforschten Ausgang, erzeugt die Engine **vor der Erzählung** den nächsten Raum: ID, Ebene, Verbindung, Sichtbarkeit, Slot nach Pace und seine eigenen unerforschten Ausgänge (Anzahl und Art deterministisch aus dem Seed).
- **Erzähler:** beschreibt und benennt.
- **Persistenz:** Einmal Erzeugtes bleibt im Eventlog und gilt für spätere Besuche.

**Wirkung:** alle Widersprüche ✓.

**Gegenargumente:**
- **Unerforschte Ausgänge** brauchen einen Platzhalterzustand (Link mit offenem Ende): Wie viele, welche Richtung, wohin führen sie, wenn zwei auf denselben Raum zielen (Schleife)?
- **Verzweigungsgrad** und **Schleifen** sind neue Designzahlen.
- **Planner:** muss Ausgänge eindeutig wählen.

**Bewertung:** richtige Autorität, in freier Form mehr Zustand als nötig.

### B4 – Hybrid mit festen Schlüsselknoten

**Inhalt:** Beim Etablieren werden je Ebene der Eingang, die Treppe hinab, der Wächter- und der Bossraum fest angelegt. Gewöhnliche Räume entstehen bei der Erkundung.

**Wirkung:** Bossraum und Treppe sind früh bekannt (Berichte können sie meinen); der Rest wie B3.

**Gegenargumente:**
- **Doppelte Festlegung:** Die Spur legt **schon heute fest, wann** Wächter und Boss kommen (Pace). Ein fester Raum dafür ist eine zweite Festlegung derselben Sache.
- **Reset:** Er setzt Slots, nicht Räume zurück. Feste Bossräume fügen nichts hinzu.

**Bewertung:** Den Teilgedanken übernimmt B6 (die Treppe liegt am Ende der Spur). Als eigene Schicht unnötig.

### B5 – Bewusst vereinfachte Mechanik: Spur ohne Graph

**Inhalt:**
- **Position:** Ein Dungeon wird **nur** über die Spur geführt. Alarics Position ist (Ebene, Teil k).
- **Bewegungen:** „weiter“ (Teil k+1, neu erzeugt), „zurück“ (k−1 … 1), „hinaus“ (Gate), „hinab“ (nur am Ende der Ebene, wenn die Spur es erlaubt).
- **Teile:** Jeder Teil ist ein Ort mit ID und Erzählername. Personen, Kreaturen, Gegenstände und Hindernisse haben weiter ihren Teil.
- **Kein Graph:** keine Links, kein `wayBetween`, keine Ebene aus Richtung.

**Wirkung:** alle Widersprüche ✓. Das ist **die größte Löschung** von Topologiecode im Dungeon.

**Verlust:**
- **Verzweigungen und Wegwahl:** alternative Wege, Schleifen, Rutschen, zwei Wege zwischen denselben Räumen. Eine erzählte Gabelung ist nur noch Kulisse („weiter“ nimmt die eine).
- **Verborgenes:** Seitenkammern, die man suchen muss, nur über eine Zusatzregel.
- **Patch 7:** Die Wegfälle (A1, beide Richtungen, Rutsche, „zwei Türen“) entfallen für Dungeons.

**Bewertung:** **ernsthafte Alternative.** Wenn D1 bejaht wird, aber Verzweigungen nicht wichtig sind, ist B5 die einfachste tragfähige Lösung.

### B6 (eigene) – Hauptgang mit Seitenräumen

**Inhalt:** die Spur aus B5 als **Hauptgang**, dazu die Graphteile, die die Erkundung tragen, alles **von der Engine beim Betreten** erzeugt:
- **Hauptgang:** Teil 1 … n je Ebene. „Weiter“ führt vom zuletzt erreichten Teil des Hauptgangs zum nächsten, „zurück“ über bekannte Wege. Slots liegen nach Pace auf dem Hauptgang, wie heute.
- **Treppe:** Der Teil, in dem die Spur einen Abstieg erlaubt, erhält einen Ausgang „down“: wenn eine tiefere Ebene existiert, nach dem Wächter oder bei unversiegelter Ebene. Nur dort entsteht Ebene+1. **Es gibt keinen Ausgang zu einer nicht existierenden Ebene.**
- **Seitenräume:** Beim Erzeugen eines Teils legt ein Seed-Wurf fest, ob er einen Seitenausgang hat (offen oder verborgen) zu einer Kammer ohne Weiterweg: Fundort, Ressource, gelegentlich ein freier Diener. Das ergibt einen **Baum**: keine Schleifen, kein Platzhalter mit unbekanntem Ziel.
- **Berichtete Räume** im Dungeon werden **kein neuer Ort**, sondern ein **Name für einen kommenden Teil**. „The deep gallery“ heißt dann „der Teil, in dem die Queen steht“ oder „der nächste Teil“. Das ist eine Notiz am Dungeon, kein Ort.
- **Erzähler:** gibt dem erzeugten Teil seinen Namen (`place.named` beim ersten Betreten) und gestaltet ihn frei. Er darf Hindernisse, Gefahren und Gegenstände **in** einem Teil oder **an** einem vorhandenen Ausgang melden; die Typen `feature` mit `on` und `object.new` gibt es schon.
- **Was der Erzähler nicht darf:** Räume, Durchgänge oder Ebenen erfinden.
- **Der Planner** wählt aus `EXITS` (heute schon Regel 7c): weiter, zurück, Seitenausgang, hinab, hinaus. „Back“, „the previous room“ und „the way I came“ sind „zurück“.

**Wirkung auf die Proben:**

| Probe | Ergebnis |
|---|---|
| `.188` Mage | „deep gallery“ ist der kommende Teil mit der Queen; GO „weiter“ erzeugt ihn auf Ebene 1; die Queen materialisiert; Kampf möglich |
| `.186` Mage | mit A: GO zum Gate; jeder weitere Schritt erzeugt einen Teil; keine Ablehnung |
| Rogue #62 | durch den B5-Verzicht keine Raumregel außerhalb echter Dungeons |
| Mossback/Catacombs | Treppe am Wächter- bzw. Siegelpunkt; „level 2 does not exist“ kann nicht entstehen |

**Verlust gegenüber heute:**
- **Schleifen und mehrere Wege** zwischen denselben Räumen.
- **Erzählte Geheimgänge** ohne Engine-Seitenausgang.
- **Grundriss:** frei erzählt, aber nur noch Kulisse. Eine erzählte Kreuzung bietet mechanisch „weiter“ und gegebenenfalls einen Seitenausgang.

**Gegenüber B5 bleibt:** Seitenkammern mit verborgenem Zugang, also Suche mit Ergebnis (Kanon §4), und eine ehrliche `#map` als Baum.

---

## 4. Vergleich

| Kriterium | B1 | B2 | B3 | B5 | **B6** |
|---|---|---|---|---|---|
| Mage `.186` / `.188` | ✓ (mit A) / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ |
| Wer baut Räume, Wege, Ebenen | Erzählung → Extractor | Engine vorab | Engine beim Betreten | Engine (nur Spur) | Engine beim Betreten |
| Verzweigung, Rückweg, Verborgenes | voll / voll / voll | voll | voll | keine / trivial / Zusatzregel | Baum / voll / Seitenkammer |
| Schleifen, mehrere Wege | ja | ja | ja | nein | nein |
| Neue Designzahlen | keine | Raumanzahl, Layout, Hindernisse | Ausgangszahl, Schleifenregel | keine | Seitenkammer-Chance (eine Zahl) |
| Neuer Zustand | keiner | Vollnetz je Ebene | offene Ausgänge | Teilindex | Ausgänge je Teil (als Links, vorhanden) |
| Extractor im Dungeon | Räume, Wege, Ebenen | nur Inhalte | nur Inhalte | nur Inhalte | nur Inhalte und Namen |
| Migration bestehender Kampagnen | keine | schwer | mittel | mittel (Räume → Teile) | mittel (erzählte Räume werden Seitenräume oder Hauptgang) |
| Kanon §7/§10 | unverändert | Spannung „universelle Raumstruktur“ | präzisiert | präzisiert | präzisiert |
| Aufwand | S–M | XL | L | M | M–L |

### 4.1 Tokens, Aufrufe, Latenz [D][S]

**Messung im Dungeonzug `.188` Mage Turn 50:** Zeilen mit Dungeon-, Weg- und Ebenenbezug machen etwa aus:
- Planner 7,1k von 50,8k Zeichen,
- Erzähler 10,1k von 57,2k,
- Extractor 17,5k von 63,1k (einschließlich der allgemeinen Reise- und `feature`/`passage`-Teile).

Dazu kommen vier Vertragsregeln mit Dungeon-, Raum- oder Ebenenbezug (2,2k Zeichen).

| | B1 | B6 |
|---|---|---|
| Modellaufrufe | unverändert | unverändert: Erzeugung ist deterministisch, kein Modell |
| Extractor im Dungeon | unverändert | `passage`, Raumorte und Ebenenregel entfallen (etwa 1,5–2k Zeichen Vertrag) [S] |
| Planner, Erzähler | unverändert | `EXITS` werden genauer (+0,1–0,3k), `DUNGEON AHEAD` bleibt [S] |
| Reparaturen | Dungeon-Ortsreferenzen bleiben | entfallen im Dungeon [S] |
| Latenz | unverändert | unverändert |

Die Einsparung ist klein und auf Dungeonzüge begrenzt. **Der Gewinn ist Zuverlässigkeit, nicht Tokens.**

### 4.2 Fold und Persistenz

**B6** verwendet vorhandene Eventtypen:
- `place.created` mit `by: 'dungeon'`,
- `link.set` mit `hidden`, `dir`, `feature`,
- `dungeon.part`, `dungeon.slot`.

Neu ist der Teilindex im Raum (`part: k`, `main: true|false`). Er ist deterministisch aus Seed, Zyklus und Teil, und ein Swipe erzeugt nichts doppelt: Das Muster `dungeon.ahead` ist vorhanden, und der Test Patch 7 (44) prüft schon, dass ein Swipe Räume einmal erzeugt.

### 4.3 Reset, andere Besucher, Beute

| Thema | Verhalten unter B6 |
|---|---|
| Reset | erneuert Slots und Ressourcen wie heute (`cycleEvents`). Die erzeugten Räume bleiben; die Slots des neuen Zyklus liegen wieder nach Pace auf dem Hauptgang, also bei einem späteren Besuch in denselben Teilen. Das ist verständlich und neu konsistent |
| Andere Parteien | wirken über Slots (`taken`), nicht über Räume: unverändert |
| Ressourcen | heute je Ebene (`resources [{floor}]`): unverändert; eine Seitenkammer kann ihr Fundort sein |
| Beute, Truhen, Fallen | in einem Teil gemeldet wie heute (`object.new`, `feature`) |
| Gate, Gebühr, Kapazität, Siegel | unverändert (`livingGo`, `sealRefusal`); das Siegel steuert den Treppenausgang |

---

## 5. Empfehlung: B6, mit B1 als Sofort- und Rückfallweg

### 5.1 Datenvertrag

```text
dungeons[root].run.floors[n]   unverändert: parts, pace, slots, cleared
places[id] (Teil)              + part: k, main: true|false, by: 'dungeon', level: n
links                          unverändert; Hauptgang k→k+1, sobald k+1 erzeugt ist; side: true für Seitenausgang; dir:'down' nur an der Treppe
unerforschte Ausgänge          kein eigener Zustand: "weiter" führt vom zuletzt erreichten Hauptgangteil zum nächsten; die
                               Seitenkammer wird zusammen mit ihrem Teil erzeugt (unbetreten, sichtbar oder verborgen), so ist
                               jeder Link vollständig und es gibt keinen Platzhalter mit offenem Ziel
Berichte                       dungeons[root].notes: [{name, of: 'next'|'slot:<id>'|'down', by, turn}] (Name eines kommenden Teils)
```

### 5.2 Ablauf eines Schritts im Dungeon

1. **Planner:** `go` mit Ausgangs-ID aus `EXITS`, oder „weiter“, „zurück“, „hinab“, „hinaus“. Der vorhandene Planner-Typ `go` bleibt; das Ziel ist eine Link- oder Raum-ID. „Weiter“ ist `{new: …}` wie heute, nur nicht mehr frei benannt.
2. **GO-Handler:** Gate und Kapazität (unverändert). Bei „weiter“ erzeugt die Engine den nächsten Hauptgangteil: Raum, Link, gewürfelte Seitenkammer, Slot nach Pace. `DUNGEON AHEAD` nennt den Teil und seinen Inhalt. Der Bewegungsnachweis aus Fachplan A erhält `target.id` = der neue Teil, `enter.level` = n.
3. **Erzähler:** erzählt den Weg dorthin, benennt und gestaltet den Teil.
4. **Extractor:** meldet Ankunft ja oder nein (A2/A4). Dazu Inhalte, den Namen (`place.named`) sowie Hindernisse und Gegenstände **in** diesem Teil oder **an** einem seiner Ausgänge. **Keine** Räume, Wege oder Ebenen.
5. **World:** Ankunft gegen den Nachweis; `dungeon.part` wie heute; materialisiert den Slot.
   - Kreaturen ordnet `slotForNew` weiter zu, aber ohne die Mehrdeutigkeit, weil Teil und Slot feststehen.
   - Eine Raum- oder Durchgangsmeldung im Dungeon wird verworfen, wie heute eine erzählte Ebene.

### 5.3 Ersetzte und entfallende Technik

| Heute | Unter B6 |
|---|---|
| `explore` und `{new: Raumname}`-Umschreibung, GO-Zeile „a stair, a door, a passage“ (`commands.js:464`, 625–626, 697) | entfällt (der nächste Teil ist bestimmt) |
| `levelVia` aus erzählter Richtung, `floorRefusal` auf erzählte Räume und Wege (3 der 7 Aufrufe in `world.js`), Vorprüfung `arrivalPlace` 285–301 | entfällt; die Ebene ist Eigenschaft des erzeugten Teils. `floorRefusal` bleibt einmal als Abwehr erzählter Ebenen |
| `passage`-Meldung, Raum-`{new}` im Dungeon, `resolvePlace` Dungeonzweig 166–174, `roomByName` | entfällt im Dungeon |
| Linkerzeugung aus dem Gehen (`arrive()` 2678–2684) im Dungeon | entfällt (Links entstehen mit dem Teil) |
| `wayRefused`: `unseen`/`exploring`/`elsewhere`, `passageInto` | entfällt im Dungeon (Weg ist Link oder „weiter“) |
| Regel `rooms: true` für Stätten außerhalb echter Dungeons (Patch 7, `arrive()` 2649–2650) | entfällt (B5-Verzicht); `wayRefused` kehrt außerhalb von Dungeons sofort zurück |
| Berichteter Raum im Dungeon (`known: reported`) | wird Notiz für einen kommenden Teil, kein Ort |

**Bleibt:**
- `wayBetween`, `blockerOf`, `exitsFrom` für „zurück“ und versperrte Wege,
- `sealRefusal`, Gate, Gebühr, Kapazität,
- Slots, Pace, Reset, Parteien, Ressourcen,
- `feature` an Ausgängen (Falle auf dem Rückweg, Patch 7 review A3),
- Begleiter von Teil zu Teil,
- `#map` nach Ebenen.

**Neu:**
- Teilerzeugung mit Seitenkammer-Wurf in `living.js` (geschätzt 60–100 Zeilen),
- Notizen zu berichteten Teilen (20–40 Zeilen),
- eine Vertragszeile für den Extractor („in a Dungeon: report what is in the part and its name; never rooms, ways or levels“).

**Nettobilanz [S]:**
- **Entfällt:** 150–250 Zeilen, vor allem aus `world.js` 2434–2475, 285–301 und 166–174, `commands.js` (Explore-Zweig von `dungeonGo`) und `dungeon.js` (`roomByName`, Teile von `levelVia`), dazu 1,5–2k Zeichen Vertrag.
- **Kommt hinzu:** 80–140 Zeilen.
- **Größerer Gewinn:** die Zahl der Stellen, an denen Ebene und Weg bestimmt werden, sinkt von vier auf eine.

### 5.4 Spielgefühl

**Gewinn:**
- Ein Dungeon ist zuverlässig bis zum Boss spielbar.
- Was die Engine ankündigt, ist erreichbar.
- Berichte über Kammern münden in reale Teile.
- Verborgene Seitenkammern belohnen die Suche.

**Verlust:**
- Schleifen, zweite Wege und erzählte Geheimgänge ohne Engine-Ausgang.
- Der Grundriss ist frei beschrieben, mechanisch aber ein Baum.

**Einschätzung:** Für eine Videospielstruktur (Kanon §7) und die beobachtete Nutzung (eine Gabelung in zwei Batches) ist das angemessen [P]. Ob Spieler Schleifen vermissen, zeigt nur ein natürlicher Lauf.

### 5.5 Kanon und Entscheidung

- **D1 (Grundanalyse):** „Die Engine erzeugt Räume, Ausgänge und Ebenen eines Living Dungeons beim Betreten; der Erzähler beschreibt und benennt.“ Das präzisiert §7 (Engine besitzt Slots und Struktur). Es ist **kein** universelles Raumschema, weil Seitenkammern und Pace je Dungeon variieren, und kein Drehbuch (§10).
- **Neue Designzahl:** die Seitenkammer-Chance. Ein Vorschlag wäre 25–35 % je Hauptgangteil, ein Drittel davon verborgen; das ist zu entscheiden.
- **Außerhalb echter Dungeons** ist Raum-für-Raum-Navigation keine Mechanik mehr. Das ist eine eigene Bestätigung: Patch-7-Fälle wie der verschlossene Waffenraum im Wachturm werden zu Hindernissen im Raum, nicht auf einem Weg.

### 5.6 Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Laufende Kampagnen mit erzählten Räumen | Bestehende Räume bleiben. Der am weitesten erreichte Raum je Ebene gilt als letzter Hauptgangteil; andere werden Seitenräume ohne Weiterweg. Eine Migration als Fold-Regel, kein Umschreiben von Events |
| Der Erzähler erfindet weiter Räume | Ablehnung wie heute (`place` im Dungeon). Weil `DUNGEON AHEAD` und `EXITS` den Teil vorgeben, sinkt der Anreiz; messen |
| Planner wählt keinen Ausgang | „weiter“ ist Standard; „zurück“ eindeutig; Rückfrage nur bei zwei Seitenausgängen |
| Patch-7-Tests | ein großer Teil wird für Dungeons durch B6-Fälle ersetzt; für Nicht-Dungeons fallen Wegfälle weg (bewusst) |
| Reports, die „hinab“ meinen, bevor die Treppe offen ist | Notiz `of: 'down'`; der Erzähler erhält „the way down is sealed / not reached yet“ (heute schon für Siegel) |

### 5.7 Regressionen

| # | Fall | Erwartung |
|---|---|---|
| R-B1 | `.188` Mage #89–#100 am Original | Bericht „deep gallery“ → Notiz; GO → Teil auf Ebene 1 mit Queen; kein `TARGET NEEDED` |
| R-B2 | `.186` Mage #63–#82 (mit A) | Gate, dann Teile 1…k; keine Ablehnung; keine verwaisten Räume |
| R-B3 | `.188` Rogue #61/#62 | Tannery Rows ohne Raumregel; Ankunft an der Stätte |
| R-B4 | Mossback: Ebene 1 bis Wächter, dann Treppe, Ebene 2, Boss | Treppe nur nach Wächter; Ebene 2 existiert; Rückweg nach oben |
| R-B5 | Catacombs: versiegelte Ebene 1 | kein Abstieg vor dem Wächter; Notiz „down“ ohne Ort |
| R-B6 | Glimmerdeep: „down“ ohne tiefere Ebene | keine Ebene 2; ein Gefälle bleibt Ebene 1 |
| R-B7 | Rückweg durch einen Teil mit Falle am Ausgang | Falle löst einmal aus (Patch 7 review A3) |
| R-B8 | verborgene Seitenkammer | nicht in `EXITS`, nicht auf `#map`; Suche findet sie; dann betretbar |
| R-B9 | Wiederbesuch nach Reset | dieselben Räume; neue Slots wieder auf dem Hauptgang; besiegter Boss des alten Zyklus bleibt tot |
| R-B10 | andere Partei hat einen Slot genommen | Teil ohne Gegner (`taken`), Pace unverändert |
| R-B11 | Swipe und Regenerate eines Erkundungszugs | ein Teil, ein Link, keine Doppelung; Fold gleich |
| R-B12 | erzählter Raum oder Durchgang im Dungeon | abgelehnt, ohne Kaskade auf ortsneutrale Inhalte des Teils |
| R-B13 | Begleiter von Teil zu Teil, Zurückbleibende | wie Patch 7 (31) |
| R-B14 | Wachturm außerhalb eines Dungeons | keine Wegprüfung zwischen seinen Räumen; ein Hindernis bleibt Hindernis im Raum |

### 5.8 Umsetzungsstufen

| Stufe | Inhalt | Abnahme |
|---|---|---|
| B-S1 | B1 als Sofortfix: Ebene aus der Spur, eine Topologiefunktion, Anlegen nach Prüfung (mit A-S3) | R-B1, R-B2, R-B6 |
| B-S2 | B5-Verzicht: Raumregel nur in echten Dungeons | R-B3, R-B14 |
| B-S3 | B6 nach D1: Teilerzeugung, Seitenkammern, Notizen, Vertrag ohne Räume und Wege, Migration als Fold-Regel | R-B4–R-B13; ein kurzer natürlicher Lauf mit **Mossback bis Ebene 2** und Glimmerdeep bis zur Queen |

**Nicht umbauen:** Gate, Gebühr, Kapazität, Slots, Pace, Reset, Parteien, Ressourcen, Rückkehrstein, `DUNGEON AHEAD` als Engine-Ansage, PULSE Paket B.
