# .175 — Pilot 01, Block A: Dungeoneintritt, Kaufobjekt, ausgestellte Ware (K1, K2, D5)

**Basis:** `.174` / Runner `2a8b54e`.

**Grundlage auf `main`:**
- [Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md) B1, B5;
- [Fachplan](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/FACHPLAN_PILOT01_KORREKTUREN.md) §2–§3;
- Auflagen C/D aus dem [GPT-Kontrollreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/REVIEW_FACHPLAN_GPT.md);
- Entscheidung D5 des Implementierungsauftrags.

**Abgrenzung:** keine Änderung an PULSE-Parametern, Kampfregeln, Kontext oder Extractor; kein Modellaufruf; kein Diebstahlsystem.

## 1. K1 – Slotgegner beim ersten Dungeoneintritt

**Fehler `.174`:**
- Vom Dungeonknoten aus (Pilot T65, `loc.mossback_warrens`) bucht DUNGEON AHEAD die drei Goblins des Slots `scouts`.
- Ihre `hostile`/`intent`-Meldungen verwirft trotzdem die PULSE-Regel für neu eingeführte Angreifer (6× `pulse`); die Korrektur meldet „no fight started“.
- Ursache: `pulseBegin` setzt `governs: false` nur, wenn Alaric zu Zugbeginn schon **im** Dungeon steht.

**Korrektur (`src/v4/world.js`):**
- World merkt sich die Kreaturen, die **diese Antwort** an den Slot bindet, den DUNGEON AHEAD für **diesen Zug** reserviert hat (`aheadBorn`). Bedingung: `x.ahead.turn === s.turn`, gleicher Zyklus, Slot `ahead` oder `ahead.next`, Ebene passend.
- Nur für diese Kreaturen entfällt die PULSE-Sperre. Ihr Angriff durchläuft danach die bestehenden Envelope-Regeln: `mayOpenFight`, `attack_commitment`, Gruppe.
- **Unverändert:**
  - andere neu eingeführte Wesen derselben Antwort;
  - Slotgegner früherer Züge;
  - PULSE A außerhalb des Dungeons;
  - `dungeon_foe`;
  - `auth.pulse`-Diagnose (`reason: 'dungeon_ahead'`, kein Wurf).

**Folge im Originalfall:** Statt `pulse` entscheidet jetzt `attack_commitment`. Die Originalevidenz („…and the nearest one's weight shifted, and it came“, mit „...“ gekürzt) ist nach dieser bestehenden Regel noch kein ausgeführter Angriff. Der Kampf beginnt deshalb wie bei Gnasher und Hunden mit Alarics Zug. Mit einem erzählten Angriff („lunged at Alaric …“) eröffnen die Slotgegner den Kampf.

## 2. K2 – gekaufte Ware wechselt den Besitzer

**Fehler `.174`:**
- T41 entsteht der Primer im Schaukasten (`obj.t82.primer`).
- T42 erzeugt `bookPurchase` beim Kauf ein zweites Objekt (`obj.t83.primer`).
- T43 macht der Planner-`take` das Schaukastenexemplar kostenlos zu Alarics: zwei Primer, ein Kauf.

**Korrektur (`src/v4/trade.js`, `src/v4/world.js`):**
- **Verknüpfung beim Anlegen eines erzählten Angebots** (`displayedWare`): Eine Warenzeile nennt das Objekt nur, wenn **genau ein** Objekt vor Ort oder beim Verkäufer passt:
  - gleicher normalisierter Name der Zeile bzw. ihres Erscheinungsnamens;
  - kein Questobjekt;
  - nicht schon an eine andere offene Zeile gebunden;
  - mindestens die angebotene Menge;
  - bei Ausrüstung dasselbe Profil (Basis, Qualität, Slot).
- **Kauf** (`bookPurchase`): Eine verknüpfte Zeile bewegt dieses Objekt (`object.moved`), eine Teilmenge per Abspaltung (`qty`, `split`). Ohne Verknüpfung oder wenn das Objekt nicht mehr dort liegt, bleibt die bisherige Neuerzeugung.
- Transaktion und Münzbuchung bleiben genau einmal.

## 3. D5 – ausgestellte Ware wird gekauft, nicht genommen

**`wareOnSale` (`src/v4/trade.js`):** Ein Objekt ist Ware eines offenen, fremden Verkaufsangebots, wenn eine Zeile es nennt (K2) oder eine Warenzeile gleichen Namens am Liegeort bzw. beim Verkäufer steht.

**Folgen:**
- `take` lehnt ab mit „CANNOT TAKE — … is …'s ware for sale (…); it becomes his by buying it“ (`commands.js`).
- Eine Extractorbewegung zu Alaric lehnt World mit Regel `for_sale` ab.
- **Nicht betroffen:** eigene Gegenstände, bezahlte Ware (Angebot geschlossen bzw. Objekt bei ihm) und alles, was kein offenes Angebot nennt.

## 4. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Fixture | `tests/v4/fixtures/pilot01_npc_pulse.json.gz`: die 141 Originalnachrichten des Piloten mit Records, ohne Erzähler-Reasoningtext; 183 KB |
| Rot gegen `2a8b54e` | `pilot01_k1_dungeon_entry.test.js`: **3 von 5 rot** (Originalfall 6× `pulse`, Angriffsvariante, Nicht-Slotwesen) · `pilot01_k2_purchase_object.test.js`: **3 von 7 rot** (Original T41–T43, D5-`take`, Teilmenge). Die übrigen Gegenfälle sind auf beiden Ständen grün |
| Grün | **5/5** und **7/7** |
| Gegenfälle | **K1:** Nicht-Slotwesen bleibt gesperrt, Slot früherer Züge unverändert, PULSE A (T19-Flanken) unverändert · **K2:** zu kleiner Stapel und zwei gleiche Objekte (keine Verknüpfung, alte Neuerzeugung, nichts bewegt), Ausrüstung mit anderem Profil (keine Verknüpfung), gleiches Profil (verknüpft, bewegt, Profil erhalten) · **D5:** frei liegender Gegenstand ohne Angebot wird genommen |
| Originalkette T41–T43 | T42 bewegt `obj.t82.primer`; die Extractorbewegung T42 lehnt die bestehende Regel ab („already holds it“), der `take` T43 ebenfalls („he holds it already“); ein Primer, −30 cp einmal, JSON-Round-Trip gleich |
| `npm test` | **3001/3001** |
| Replay | Korpus **2235 Fälle, 0 geändert** gegenüber `2a8b54e` (keine Korpusfälle mit Dungeoneintritt vom Knoten oder ausgestellter Kaufware) |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **158** wahr, 0 falsch (`.174`: 151). Neu `pilot01_*` (7, `AVERETH_SMOKE_PILOT01=1`, `tools/st_live/pilot01_smoke.mjs`): Eintritt T65 ohne PULSE-Veto, Slotgegner da, Kampf eröffnet; Buchladen D5-`take` abgelehnt, gekauft wird das Schaukastenexemplar, „tucked away“ fügt nichts hinzu, Save/Reload gleich |
| ST1.19 Failsoft | `OK`, **163** wahr, 0 falsch (`.174`: 156) |
| Kontext | unverändert (kein Kontextcode berührt) |

## 5. Grenzen

- **K1:** Ob ein erzählter Angriff als ausgeführt gilt, entscheidet weiterhin `attack_commitment`. Mit „...“ gekürzte Angriffsevidenz findet diese Regel nicht; das ist eine bestehende Strenge außerhalb dieses Auftrags.
- **K2:** Eine Ware, die mangels Eindeutigkeit nicht verknüpft wurde (zwei gleiche Objekte), wird wie bisher neu erzeugt. Das ausgestellte Exemplar bleibt dann liegen und ist nach geschlossenem Angebot nicht mehr als Ware geschützt.
- **D5:** Es gibt kein Diebstahlsystem. Ob ein Spieler bewusst stehlen kann, ist eine getrennte Entscheidung.
