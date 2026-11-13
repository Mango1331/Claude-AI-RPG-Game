# .180 — Registrierung mit Gebühr und leere Planner-Antwort `[]`

**Basis:** `.179` (`ebf2bf6`).

**Grundlage:** [Review des NPC-/PULSE-Dreierbatches 12./13.11.2026](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261112-220625Z/REVIEW.md) auf `main`: Fable §8 (P2-1, P2-3) und GPT §9 (Freigabegrenzen).

**Abgrenzung:**
- zwei getrennte Korrekturen: P2-1 in `finance_evidence.js`, P2-3 in `planner.js`;
- `commands.js` ist unverändert: Registrierungs-, Gebühren- und Angebotsregeln bleiben gleich, ebenso Preisautorität, B15 und 8.4.2;
- kein PULSE-, Orts-, NPC-E3-, Quest-, Extractor- oder Kontextcode;
- keine Änderung an Records, Events oder Spielständen; keine Migration.

## 1. P2-1 — Registrierung mit Zahlung in derselben Nachricht

### Ursache

Der Gebührenzweig in `commands.pay` bucht die kanonische Gebühr nur, wenn `payArgument` die Zahlung als Alarics eigene Übergabe erkennt (`act` ist `outgoing` oder `will`). Die beiden Originalfälle scheitern an zwei verschiedenen Stellen dieser Prüfung:

| Fall | Eingabe | Fehler in `.179` |
|---|---|---|
| **Warrior T5** | `I slide two silver across the counter. "Here's the two silver — let's do the roll and the stone."` | „two silver“ steht zweimal im Zitat des Befehls. `findQuote` meldet `ambiguous`, `payArgument` also `money_ambiguous`. Die Reparatur setzt `money` auf `null`, danach fehlt ein Zahlverb. |
| **Rogue T5** | `"I'll register. Two silver, was it?" I count out two silver and slide them across the counter.` | Das Geld ist eindeutig, aber „count out … and slide them across the counter“ gehört zu keinem erkannten Übergabemuster. Ergebnis: `unclear`. |

In beiden Fällen lauten die Zeilen „NOT REGISTERED — confirm registration at the Guild desk“ und „REGISTERS — pending … he has not agreed to pay“. Beides ist nachgestellt, Zeile für Zeile.

Ein `guild.register` derselben Nachricht ersetzt den Zahlungswillen bewusst **nicht**, auch nicht wie in §8.4 vorgeschlagen bei „Betrag der Gebühr oder ohne Betrag“. Sonst würde aus „I'll register. Two silver, was it?“ eine Zahlung (GPT §9).

### Korrektur (`src/v4/finance_evidence.js`, `payArgument`)

1. **Mehrfachzitat (S1 für `pay.money`).** Stehen dieselben Geldworte mehrmals im Zitat **dieses einen Befehls**, wird jede Fundstelle für sich geprüft. Belegt ist das Geld nur, wenn
   - jede Stelle denselben Betrag ergibt und
   - keine Stelle Geld für Alaric verlangt (`claim`) oder einen anderen Empfänger bezahlt (`other`).

   Dann gilt es als **eine** Zahlung dieses Betrags. Ein Befehl bucht nie einmal pro Fundstelle. Der Akt ist `outgoing`, wenn mindestens eine Stelle eine Übergabe ist, sonst `unclear`. Eine bloße Frage („Two silver, was it?“) wird so nie zu einer Zahlung.

   Unterscheiden sich die Beträge oder gehört eine Stelle zu einer Forderung oder einem fremden Empfänger, bleibt das Zitat wie bisher `money_ambiguous`. Ein falscher `amount_cp` bei gleichlautenden Stellen ergibt jetzt `contradicted`/`amount_differs`, wie bei einer einzelnen Fundstelle.

   Geldnennungen **außerhalb** des Befehlszitats spielen dafür keine Rolle (Suche nur innerhalb von `within`).
2. **Abgezähltes und hingelegtes Geld.** Die bestehende Regel für hingelegte Münzen (`laid`: Verb davor, Theke oder Tisch danach) erkennt jetzt auch:
   - `count out <Geld>` mit Ablageort („count out two silver onto the desk“);
   - `count out <Geld>`, gefolgt von `[,] and [then] | then` + Ablegeverb + `them|it` + Ablageort („… and slide them across the counter“).

   Zählen muss er selbst: Satzanfang, Anführungszeichen, „I/we/then/and“. „I ask her to count out …“ zählt nicht. Ohne Ablageort bleibt es `unclear`, ebenso bei Abzählen in die Hand, in die eigene Börse oder bloßem Vorzeigen.

Folge:
- Warrior T5 braucht keine Reparatur mehr.
- Beide Originalfälle laufen über den unveränderten Gebührenzweig: `offer.accept` des Registrierungsangebots, genau eine Buchung von 20 cp, „REGISTERS — done“ bzw. „REGISTERS — he asks to be registered and pays the fee at once“.

## 2. P2-3 — Planner-Antwort als nacktes Array

### Ursache

`parsePlan` las Antworten nur über `extractJsonObject`. Für `[]` lieferte `tolerantJson` „report is not a JSON object“. Die Reparaturanfrage (`interpret.repairMessage`, für Planner und Interpreter gemeinsam) wiederholte nur diesen Fehler und nannte das verlangte Format nicht. Die Leerantwort-Recovery (10B-4a) greift nur bei wirklich leerem Text.

Mage-Verlauf in `.179`:
- T46: `[]`, Reparatur `[]`.
- T47 und T48: zuerst Prosa, Reparatur `[]`.

Dreimal `planner_not_executed`, danach `repeated_model_failure`.

### Korrektur (`src/v4/planner.js`)

- **`parsePlan`:** Ist die **ganze** Antwort ein leeres JSON-Array, gilt sie als `{"commands":[]}`. Ein `<think>`-Block oder ein Codezaun darum ist erlaubt. Die Antwort durchläuft danach dieselbe Prüfung wie `{"commands":[]}`.
- **Weiter abgelehnt:** ein nicht-leeres Array, ein Array neben Prosa, `[[]]`, `[null]` und jede ungültige JSON-Antwort. Die Fehlerzeile lautet dann „the answer must be one JSON object {"commands":[...]}, never a bare array; {"commands":[]} only when he takes no mechanical action in this message“.
- **`planRepairMessage`** (nur Planner, der Interpreter behält `repairMessage`): Die eine Reparatur nennt das Format `{"commands":[...]}` ausdrücklich. Außerdem verlangt sie, die Spielernachricht erneut zu lesen: Jede mechanische Handlung dieser Nachricht wird als Befehl geplant.

### Was das nicht löst (GPT §9.2)

`[]` wird zu „keine mechanische Handlung“, also zu einem gewöhnlichen Gesprächszug. Die Engine macht daraus **kein** `go`, keine Zustimmung und keine Zahlung.

Mage T48 („Done — I go in first now, and draw the big one.“) kann eine echte Eintrittsabsicht enthalten. Liefert das Modell dafür `[]`, bricht der Zug nicht mehr ab. Die Bewegung fehlt dann aber weiterhin. Das ist die Fehlinterpretation des Modells; dieser Patch behebt sie nicht und verdeckt sie auch nicht. Der falsche Ort aus P2-2 bleibt davon unberührt.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `tests/v4/fix180_registration_planner.test.js`: **22/22** grün |
| Rot gegen `.179` | **14 von 22 rot** (Produktdateien auf `.179`, Tests unverändert): alle Positivfälle P2-1 (Warrior T5, Rogue T5 auf Ruleset 1 und 2, `payArgument`) und P2-3 (T24, T46, T47/T48, Hostpfad, Reparaturtext). Rot sind auch die Gegenfälle, die einen Positivteil enthalten: Trinkgeld neben der Gebühr, `contradicted` statt `money_ambiguous`, Formatfehlertext, `[]` als dritte Recovery-Antwort. |
| Reine Gegenfälle, auf beiden Ständen grün | Frage nach der Gebühr, auch neben `guild.register` · unklare Zustimmung (nur abgezählt, in der Hand behalten, nur Börse genannt) · falscher Betrag (8.4.2) · zwei Zahlbefehle für dieselben zwei Silber: eine Abbuchung, auf Ruleset 2 „NOT PAID — already registered; no second registration fee“ · abgezähltes Geld ohne Registrierungswunsch: keine Registrierung, nur Karte · ausgeführtes `go` zu T48 bleibt `go` · Failsoft (`{bad`, nicht-leeres Array): sichtbare Nichtausführung ohne Buchung |
| Weitere Gegenfälle | Mehrfachzitat mit Forderung („You owe me two silver“) oder fremdem Empfänger (Tam): `money_ambiguous` · Trinkgeld neben der Gebühr bleibt eigene Karte (B15) · nicht-leeres Array, Array neben Prosa, ungültiger Befehl im Array: ungültig, keine dritte Anfrage · zweimal Prosa: Fehlschlag nach einer Reparatur · echte Leerantworten: unveränderte 10B-4a-Recovery |
| Angrenzende Suites | `patch842`, `patch843`, `patch_guild_start111`, `fix138/142/144_finance`, `patch10b4a_planner_empty`, `patch10b4c3_recovery_observability`, `patch_batch101_recovery`, `planner_c*`, `fix154_repair_diagnostics`, `unit/report`: **230/230** |
| `npm test` | **3072/3072** (`.179`: 3050) |
| Replay gegen `.179` | **2235 Fälle, 0 geändert** (Baseline aus `ebf2bf6` geschrieben). Der Korpus enthält 1103 Planner-Antworten, davon **0** nackte Arrays, und keinen Fall `money_ambiguous`. Die neuen Pfade belegen deshalb nur die Regressionen, nicht der Replay. |
| Voller Korpuscheck | 1057 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet; Akzeptanzliste unverändert |
| ST1.19 Standard/Failsoft | **nicht ausgeführt.** In der Arbeitsumgebung war kein SillyTavern vorhanden. Die Installation der ST-1.19.0-Abhängigkeiten wurde von der Berechtigungsprüfung der Umgebung abgelehnt. Ersatzweise auf dem Node-Hostpfad geprüft: Failsoft-Probe `{bad` (`patch_failsoft.test.js`, `fix180` Test 22) und nicht-leeres Array ergeben `not_executed` mit `planner_not_executed`, ohne Event und ohne RNG-Verbrauch; `[]` ergibt einen normalen Kontextzug. **Der ST-Smoke (`AVERETH_ST_DIR=… npm run smoke:st:c`, auch mit `AVERETH_SMOKE_FAILSOFT=1`) steht vor einer Freigabe noch aus.** |

**Rekonstruktion:**
- Die Original-ZIP des Batches liegt nicht im Repository (`SOURCE_MANIFEST.md`).
- Die Spielertexte von Warrior T5, Rogue T5 und T48 stammen wörtlich aus dem Review. T46 und T47 sind sinngemäß nachgebildet.
- Die Planner-Antworten sind nach der Beschreibung im Review rekonstruiert: `pay` 20 cp mit „two silver“ plus `guild.register`, bzw. `[]`. Die genauen Zitatgrenzen der Originalbefehle sind nicht bekannt; Rogue T5 ist deshalb mit kurzem und mit ganzem Zitat geprüft.
- Die Hallen stammen aus vorhandenen Fixtures:
  - Live-Chat 22.10.2026, Ruleset 1, vollständiger Hostpfad mit Planner-Reparatur;
  - Glassmere aus Batch 6, Ruleset 2: Planner-Prüfung, Agency-Guard, Handler.

## 4. Grenzen

- **Mehrfachzitat:** Gleichlautende Stellen im selben Befehlszitat gelten als eine Zahlung. Gehören sie in Wirklichkeit zu zwei Vorgängen, zählt dieser Befehl nur einen. Ein zweiter Vorgang braucht einen eigenen Befehl, wie bei einer einzelnen Fundstelle. `playerPrice` (Preisbelege, V4-Nachtrag B-1) bleibt unverändert.
- **Übergabemuster:** Nur „count out“ mit Ablage auf Theke, Tisch, Pult usw. ist neu. Andere freie Formulierungen bleiben `unclear`, etwa „Here, two silver.“ oder „Counting out two silver, I slide them across“; die Registrierung bleibt dann offen wie in `.179`. Der Text „NOT REGISTERED … no free payment was proposed“ (P3-11) ist unverändert.
- **Ruleset 1:** Auf Altkampagnen wird eine zweite Gebührenzahlung derselben Nachricht wie bisher zur Zahlungskarte und nicht als zweite Gebühr abgelehnt. Es gibt keinen Doppelabzug ohne eigenes `#pay`.
- **`[]`:** nur eine syntaktische Korrektur. Ob das Modell eine echte Handlung (T48) als Gespräch liest, misst erst der nächste natürliche Lauf. Der neue Reparaturtext gilt für jede Planner-Reparatur, auch für Geldbeleg-Hinweise. Er ändert keine Enginelogik, aber die Modellanfrage.
- **ST1.19-Smoke:** steht aus (siehe Abnahme).
