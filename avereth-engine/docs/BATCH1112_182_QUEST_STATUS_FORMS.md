# .182 — Statuskorrektur nach Abgabe; bedeutungsneutrale Extractor-Formfehler

**Basis:** `.181` (`b9e07be`).

**Grundlage:** [Review des NPC-/PULSE-Dreierbatches 12./13.11.2026](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261112-220625Z/REVIEW.md) auf `main`:
- GPT §6 (Mage T40/T42);
- Fable §8.3 C sowie §8.4 P2-4 und P2-5;
- GPT §9.3 (Formheilung nur bedeutungsneutral, `seq` nicht blind raten);
- GPT §10 (`.181`).

**Abgrenzung:**
- Zwei getrennte Korrekturen:
  - P2-4 in `src/v4/world.js`;
  - P2-5 in `src/v4/extract.js`.
- Unverändert bleiben:
  - Guild-, Quest- und Zahlungsregeln: `statusCorrection`, Firewall, `completeContract`, bedingte Abgaben;
  - Extractor-Vertrag `content/deltas.json` (keine neue Vertragsversion);
  - Schema und Reparaturablauf in `runtime.js`.
- Kein PULSE-, Orts-, Registrierungs-, Planner- oder NPC-E3-Code.

## 1. P2-4 — Statuskorrektur nach erfolgreicher Abgabe

### Ursache

Eine Statuskorrektur (`guild.statusCorrection`) beschreibt den Vertrag in dem Zustand, in dem sie geschrieben wurde:
- **Firewall-Vorprüfung:** Die Firewall prüft alle Meldungen einer Antwort, bevor eine davon angewendet wird. Eine Meldung, die von einer Zahlung oder einem Abschluss erzählt, wird also gegen den Stand **vor** der Abgabe geprüft.
- **Notiz-Schritt:** Eine Quest-Notiz wird an ihrem eigenen Schritt geprüft, gegebenenfalls ebenfalls vor der Abgabe.

Die bedingte Abgabe („geh zur Halle und gib ab“) wird erst bei der Ankunft oder nach den Deltas gebucht: `quest.status active → completed`, Auszahlung. Die schon geschriebene Korrektur „ACTIVE: accepted, not yet turned in, nothing paid“ blieb danach stehen und ging an den nächsten Erzählerzug. Mage T42 hat sie korrekt befolgt und damit die Auszahlung zurückgenommen erzählt.

Der Replay-Korpus zeigt denselben Fehler **elfmal in natürlichen Läufen** (b17–b19, siehe §3).

### Korrektur (`world.js`, Ende von `applyWorld`)

- **Betroffene Verträge:** nur solche, deren Status sich in dieser Antwort per `quest.status`-Event geändert hat.
- **Ersetzt werden:** genau die Statuskorrekturen eines früheren Status dieses Vertrags, an derselben Stelle, durch die Korrektur seines Endstatus („COMPLETED: turned in and paid once“). Steht diese schon in der Liste, entfällt die alte.
- **Bleibt erhalten:**
  - **gescheiterte Abgabe:** kein Statusereignis, die zutreffende ACTIVE-Korrektur bleibt;
  - **andere Verträge:** deren Korrekturen bleiben unverändert;
  - **andere Korrekturarten:** zum Beispiel die Jagdabgabe-Regel.
- **Keine neue Buchung:** keine Abgabe, Auszahlung oder Änderung eines gebuchten Ergebnisses. Geändert wird nur der Korrekturtext.

## 2. P2-5 — Bedeutungsneutrale Extractor-Formfehler

### Was schon behandelt war

`normalizeSoftFields` (vor der Schemaprüfung):
- setzt fehlende Felder, die `null` sein dürfen, auf `null`;
- setzt Defaults für fehlende `desc`, `count` und `who`;
- fügt Wortlisten bei `role` und `armed` zu einem String zusammen;
- setzt Defaults bei Angebots- und Preisfeldern.

Nicht behandelt waren überzählige Eigenschaften, eine `seq` als Text oder ganz fehlend, ein einzelner String statt Liste und `null` dort, wo ein fehlendes Feld schon einen Default bekommt.

### Prüfung und Belege

Die Batch-ZIP liegt nicht im Repository. Deshalb habe ich die 1103 natürlichen Extractor-Antworten des Replay-Korpus (b16–b19) ausgewertet.

**Belegte Formfehler:**
- `creature.new.desc` als ein String: 8×;
- `leave` mit `evidence`, einem Feld, das `leave` nicht hat: 1×;
- `person.new.aware = "aware"`: 1×, die Form aus Mage T3.

In jedem dieser Fälle hat die Modellreparatur genau diese Form korrigiert. In 7 Fällen war die reparierte Meldung sonst identisch.

**Nicht belegt:** fehlende oder textförmige `seq`. Diese Fälle stammen nur aus dem Batch-Review (Rogue T38/T63).

**`null` mit Bedeutung:** `person.new.role` und `fact.o` kamen als `null` vor. Dort trägt `null` Bedeutung; diese Fälle bleiben unberührt.

### Korrektur (`extract.js`: `formOnly`, `softSeq`)

| Form | Behandlung | Warum bedeutungsneutral |
|---|---|---|
| ein String in einem `string[]`-Feld (`desc`, `with`, `by` …) | → einelementige Liste | gleiche Bedeutung; der Vertrag sagt selbst „string[] is always a JSON array, even when it contains only one value“ |
| `evidence` an einem Typ ohne `evidence`-Feld (`leave` u. a.) | entfernt | `world.js` und Firewall lesen `evidence` nur dort, wo es Feld ist (`whoOf` nur bei `position`, `aware`, `intent`, `hostile`) |
| `desc: null` bei `person.new`/`creature.new`, `who: null` bei `memory` | → `[]` | derselbe Default, den ein ausgelassenes Feld schon bekommt |
| `seq` als Ziffernfolge (`"3"`) | → Zahl, wenn keine andere Meldung diese `seq` hat | die Zahl steht da; nichts wird geraten |
| `time` ohne `seq` (Rogue T38/T63) | → nächste freie Nummer nach der vorigen Meldung | **nur** wenn alle anderen Meldungen eine ganzzahlige `seq` haben, diese in Schreibreihenfolge steigen und die Nummer vor der nächsten frei ist (`[1, 2, time, 4]` → 3) |

**Bewusst nicht normalisiert** (bleibt Fehler für die bestehende eine Reparatur):

- **`aware` an `person.new`/`creature.new` (Mage T3), auch mit Wert `"aware"`.**
  - Ein Replay-Vergleich hat gezeigt: Die Modellreparatur schreibt daraus eine eigene `aware`-Meldung (`scene.awareness = aware`, b18-warrior#164).
  - „aware“ ist nicht dasselbe wie „kein Eintrag“: Bei einer gelungenen Schleichprobe wird ein `aware`-Beobachter `suspicious`, einer ohne Eintrag `unaware` (`checks.js`).
  - Weglassen wäre also ein Schleichvorteil. Nachbilden hieße, eine neue Meldung mit eigener `seq` zu erfinden.
- **Jede andere überzählige Eigenschaft** (zum Beispiel `remote`): könnte Bedeutung tragen.
- **`null` in einem Feld, das einen Wert braucht** (`role`, `count`).
- **`seq` als Text,** wenn eine andere Meldung diese Zahl schon hat.
- **`time` ohne `seq` ohne eindeutigen Platz:** keine freie Nummer, andere Meldungen ohne `seq` oder nicht steigende Reihenfolge.
- **Ein Ort als `{"new": "name"}`:** `kind` und `parent` tragen Bedeutung; das ist eventuell Warrior T56, ohne Original nicht prüfbar.

### Die sieben verworfenen Extraktionen des Batches

| Fall | Ursache laut Fable §8.3 C | Ergebnis `.182` |
|---|---|---|
| Rogue T38, T63 | `time` ohne `seq` | **behoben**, wenn der Platz eindeutig ist (alle anderen `seq` ganzzahlig und steigend, Nummer frei); sonst wie bisher Reparatur |
| Mage T3 | überzähliges `aware` an `person.new` | **bewusst nicht** normalisiert (siehe oben), bleibt Reparaturfall |
| Warrior T56 | Form einer Ortsreferenz | genaue Form ohne Original nicht bestimmbar. Ortsformen tragen Bedeutung (`kind`, `parent`, Identität) und werden nicht automatisch geändert; bleibt Reparaturfall |
| Mage T20, T21, Rogue T51 | im Review nicht benannt (T51: verlorene Ankunft) | ohne Originalbelege nicht prüfbar; offen |

### Teilannahme (Fable §8.4 P2-5): geprüft und zurückgestellt

Fables Vorschlag lautet: „Bleibt eine Meldung ungültig, nur diese ablehnen; ihre abhängigen Meldungen fängt die vorhandene Sperre.“ Das ist mit den bestehenden Regeln nicht nachweislich sicher.

1. **Ein ungültiges `arrive` verschiebt Folgemeldungen.** Die `scene_context`-Sperre nach einer abgelehnten Ankunft (`travel … ok: false`) setzt eine Meldung voraus, die die Welt selbst ablehnt. Eine schon im Schema verworfene Meldung erreicht die Welt nicht.
   - Ohne das `arrive` wird jede lokale Meldung mit `scene: here` am Abreiseort gebucht.
   - Das ist genau die Fehlerklasse von P2-2 (`.181`).
   - Der Test „no partial acceptance“ zeigt es: Dieselbe `person.new`-Meldung landet ohne ihr `arrive` am Straßenrand vor Ashbridge.
2. **Bezüge zwischen Meldungen** laufen über `ref`, Gruppen-Refs und `depends_on`. Die vorhandenen Sperren (`blockedPeople`, `blockedCreatures`, `quest_dependency`) greifen nur bei Meldungen, die die Welt kennt und ablehnt.
   - Eine im Schema verworfene `person.new` hinterlässt keinen gesperrten Ref.
   - Spätere `hostile`/`aware`/`intent` könnten dann über den Resolver eine andere anwesende Person treffen.
3. **Fehlende Reihenfolge:** Eine ungültige Meldung ohne lesbare `seq` hat keinen Platz in der Erzählreihenfolge, gegen den Folgemeldungen geprüft werden könnten.
4. **Atomicity:** Die Firewall prüft alle Meldungen einer Antwort zusammen (Vorprüfung). Eine Teilannahme müsste die verworfenen als abgelehnte Meldungen mit allen Folgesperren in diese Prüfung zurückführen. Das ist eine eigene Änderung der Extraktionssemantik mit eigenem Abnahmebedarf, keine Formkorrektur.

Teilannahme bleibt deshalb **ausdrücklich zurückgestellt**. Eine ungültige Antwort geht wie bisher in die eine begrenzte Reparatur und scheitert danach sichtbar und vollständig.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `tests/v4/fix182_quest_status_forms.test.js`: **14/14** |
| Rot gegen `.181` | **10 von 14 rot** (Produktdateien auf `.181`, Tests unverändert): <br>– P2-4: bedingte Abgabe mit Zahlungsbehauptung; Notiz vor der Ankunft; anderer Vertrag daneben; **zwei Verträge ändern sich in derselben Antwort** (Abgabe und Annahme bei Ankunft, ein dritter unverändert); **Hostpfad mit Reload und Wiederholung** <br>– P2-5: neutrale Formen gültig; `time` ohne `seq`; Hostpfad „desc als String“ zweimal (auf `.181` „WORLD NOT RECORDED“, Ankunft verloren); Hostpfad Rogue T38; **keine Autorität durch Normalisierung** |
| Reine Gegenfälle, auf beiden Ständen grün | Abgabe findet nicht statt: ACTIVE-Korrektur bleibt, nichts bezahlt · bedeutungstragende Formen bleiben Fehler (`aware` jeder Wert, `remote`, `evidence` als Zahl, `role`/`count: null`, doppelte `seq`, leerer String, `{"new": "name"}`) · Hostpfad Mage T3 (`aware` zweimal): sichtbar gescheitert, nichts gebucht · keine Teilannahme: ein `arrive` falscher Form samt nachfolgender Person bucht weder Ankunft noch Person |
| Schutzbedingungen | Ein Begleiter als String (`with: "Bren"`) wird zur Liste und weiter von `companions()` geprüft (`arrive.with: unknown person Bren`, niemand erzeugt). `time` ohne `seq` bleibt der Zeitobergrenze unterworfen (`time_cap`). Personen nach der Ankunft stehen am erreichten Ort. Gültige Antworten: Im Replay ändert sich kein Record mit gültiger Erstantwort (die 7 P2-5-Änderungen sind sämtlich zuvor ungültige Erstantworten). |
| Save/Reload, Determinismus | Hostpfad User04 I64: Der Record trägt die Endkorrektur; `foldChat` ergibt denselben gültigen Zustand; dieselbe Antwort ein zweites Mal ergibt dieselben Events und Korrekturen |
| P2-4 Originalfixture | User04 I63/I64 (`go` + bedingte Abgabe, Originalprosa): genau eine Abgabe, eine Auszahlung von 90 cp, eine erfolgreiche Ausführung (`cmd.completed`); die Firewall lehnt die freie Zahlungsbehauptung weiter ab |
| Angrenzende Suites | Guild, Extractor/Recovery, World, PULSE, Failsoft, NPC E2: **533/533** |
| `npm test` | **3100/3100** (`.181`: 3085) |
| Replay gegen `.181` | **2235 Fälle, 18 geändert**, jeder einzeln geprüft (unten) |
| Voller Korpuscheck | `accepted_batch182_vs_126.json`: 1068 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet. Die 1050 übrigen `.177`-Einträge sind byte-gleich; der Schutztest in `replay.test.js` prüft das. |
| ST1.19 Standard/Failsoft | **nicht ausgeführt:** keine isolierte SillyTavern-Installation in der Umgebung (wie `.180`/`.181`). `run_c.mjs` lief nicht, auch nicht gegen Benutzerdaten. **Der Smoke steht vor einer Freigabe aus.** |

**Die 18 Replay-Änderungen:**

| Gruppe | Records | Änderung |
|---|---|---|
| P2-4 (11) | b17-mage#138, b17-rogue#22, #156, b17-warrior#114, #158, #214, b18-rogue#26, b18-warrior#314, b19-mage#36, b19-rogue#32, b19-warrior#310 | Vertrag in derselben Antwort `active → completed`; aus „… is ACTIVE: accepted, not yet turned in, nothing paid …“ wird „… is COMPLETED: turned in and paid once …“. Events, Ablehnungen und alle anderen Korrekturen sind gleich. |
| P2-5 (6) | b17-mage#172, b17-rogue#106, b17-warrior#328, b18-mage#40, b18-rogue#52, b19-warrior#218 | Erste Antwort (`desc` als String bzw. `leave` mit `evidence`) ohne Reparatur gelesen: `extract.applied repaired=false`, die vorhandene Reparaturantwort bleibt ungenutzt. Die Welt-Events sind gleich. |
| P2-5 (1) | b17-mage#34 | wie oben; die Modellreparatur hatte die eine Beschreibung zusätzlich in zwei Einträge geteilt. Jetzt behält die Kreatur sie als einen Eintrag (Beschreibungstext, nichts darauf gebucht). |

**Ausdrücklich unverändert:**
- b18-warrior#164 (`aware`; nach dem Befund oben nicht normalisiert);
- b17-mage#28: Die Erstantwort hatte noch einen anderen Fehler, deshalb läuft die Reparatur weiter.

**Rekonstruktion:**
- **P2-4:** läuft auf dem Original-Fixture User04 I63/I64. Die Zahlungsbehauptung (`fact … completed and paid` bzw. Quest-Notiz) ist synthetisch, nach dem in Fable §8.4 beschriebenen Mechanismus von Mage T40.
- **P2-5:** Die Formen stammen aus dem Korpus bzw. aus Fable §8.3 C; die Antworten sind gescriptet.

## 4. Grenzen

**P2-4:**
- Korrigiert werden nur Statuskorrekturen (`statusCorrection`) eines Vertrags mit Statusereignis in derselben Antwort.
- Ein Erzähler, der die Auszahlung aus eigenem Antrieb zurückhält (GPT §6, P3), wird dadurch nicht verhindert. Er bekommt aber keine falsche Vorgabe mehr, sondern „COMPLETED: turned in and paid once“.

**P2-5:**
- Mage T3 (`aware`) bleibt ein Reparaturfall: Scheitert auch die Reparatur, geht die Extraktion samt Ankunft wie bisher ganz verloren.
- Genauso bei Orten als `{"new": "name"}` und bei anderen überzähligen Feldern.
- Teilannahme gültiger Meldungen wäre die nächste, gesondert zu entscheidende Stufe.

**Reparaturanteil:** Er sinkt nur um die belegten neutralen Formen (im Korpus 7 von 72 reparierten Extraktionen). Die übrigen Reparaturen sind überwiegend legitime Integritätssperren (GPT §9.3); das ist kein Reduktionsziel.
