# Build 4.3.0-c.6.6.186 – PAID HERE-Zuordnung und Monster A2

**Basis:** `.185` (`d556580`). Zwei getrennte Pakete, ein Build. Keine neuen Payment-Regeln, kein Z4/Z5, keine Monsterfähigkeiten, keine Bossphasen, keine Balanceänderung, kein A2-4.

## Paket 1 – PAID HERE ordnet jedes Bett seinem eigenen Angebot zu

**Grundlage:** [GPT-Review `.185` §3 R1](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_STABILIZATION_185_PRODUKTDIFF_GPT.md). **Commit:** `5ec21c4`.

**Ursache (reproduziert):** `paidLodging()` gab jedem gebuchten Bett eines Anbieters dessen **zuletzt angenommenes** Angebot. Bei zwei getrennt gekauften Nächten (3 cp „a small room for the night“, dann 5 cp „another night in the room“) zeigten Erzähler, Planner und Extractor beide als 5-cp-Nacht. `service.granted` speicherte weder Angebot noch Zeile.

**Korrektur:** Der Fold von `service.granted` legt Angebot und Zeile fest, unter denen die Leistung verkauft wurde: die **eine** noch offene Zeile dieses Anbieters am Ort mit derselben Leistung und demselben Wortlaut, die noch keinem früheren Dienst gehört (der Kauf gewährt vor dem Schließen des Angebots). Die Events bleiben unverändert; ein alter Chat erhält die Zuordnung bei jedem erneuten Fold gleich. Ist die Zeile nicht eindeutig (zwei offene Angebote mit gleichem Wortlaut, Altzustand ohne Feld), bleibt der Dienst **ohne Zuordnung**: `PAID HERE` nennt dann „a bed here“, **ohne Preis und ohne Leistungstext**. Die `.185`-Doppelbuchungsklärung liest die zugeordneten Dienste weiter.

**Tests:** `fix186_paid_here` 4/4 (alle rot auf `.185`): zwei getrennte Nächte mit eigenem Preis in Erzählerblock und Planner-Katalog, gleich nach Reload; ein Angebot mit zwei Betten; Altzustand und mehrdeutige Zeilen ohne Preis; Doppelbuchungsklärung mit zugeordnetem und nicht zugeordnetem Dienst, Bett allein bleibt kaufbar. **Geänderter Bestandstest:** `patch_prebatch99` „re-opened canonical stock“ öffnet ein schon gekauftes Los „room and supper“ künstlich wieder und kauft es binnen 24 h erneut; `.185` hatte die Klärung dort nur übersehen, weil es ein *angenommenes* Angebot suchte. Der Test prüft den Wiederkauf jetzt einen Tag später.

## Paket 2 – Monster A2: Ausrüstung humanoider Monster

**Grundlage:** [Fachplan §2.3, §3.2, §5.2, GPT §8.3, Opus §9 K3–K7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md); konservative Pilotvarianten D1–D5, D7, D8 = nein. A1 (`.184`) unverändert.

| Teil | Umsetzung |
|---|---|
| **A2-1 Profil** | `materialise` legt bei humanoiden Ankern einmalig `profile.gear = {weapon, source}` fest (`src/engine.js` `creatureGear`). Quelle: gemeldete Waffe (`armed`) vor der Standardausstattung des Ankers; Wahl per `hash32` (kein Kampfwürfel) aus dem eigenen Schlüssel: Platz im Dungeon-Slot, sonst Entitäts-ID. Andere Anker: kein `gear`, Profil wie bisher |
| **D1** | `monsters.json` `loot.anchors.*.loadout`: Goblin grobes Messer 6, grober Speer 3, keine 1; Schamane Fetisch (Fokus); Oger/Troll (Oger-Anker) Keule. Wächter und Bosse dieselbe Liste (D7) |
| **D2/D3** | Werte nach Ankerskala (Messer/Speer atk 2, Keule 4, Fetisch 1); eine gemeldete Waffe erhält die Werte der gleichen Familie des Ankers, sonst dessen beste. Fokus und Bogen werden nur getragen: kein neuer Angriff, keine Reichweite |
| **K7 Kampf** | Nahkampfwaffe ersetzt den Angriffsnamen (`profile.attack.name`, „Crude spear“, „Club“); ATK, Schadensart, Reichweite unverändert. Kampfzeile `"<Waffe> Raw = ATK n"`, ohne Waffe unverändert `natural attack …` |
| **A2-2 Anzeige** | Kreaturenkarte und Kampfblock: `armed: crude spear`, `unarmed` oder `carries … (no attack of its own)` |
| **A2-1 Beute (D4)** | Beim Tod ist die Profilwaffe Beute, wenn der Verwertbarkeitswurf gelingt (Goblin 0,55, Oger 0,7, Schamane 0,4 – erwartet etwa wie bisher 0,5/0,7/0,4), sonst Zeile „… — broken, nothing worth taking“ ohne Objekt. Einsatz ist keine Bedingung |
| **D5/K6 Legacy** | `gear` bleibt unverändert; ein Profil ohne `profile.gear` (vor A2 festgelegt) behält die alte Zufallsquote |
| **A2-3 Extractor** | `creature.new.armed` (optional, `delta-1.15`, `extract-5.26`): nur für humanoide Kreaturen; bei Gruppen nur, wenn die Waffe für **alle** gezeigt wird, sonst `null` (K3: keine Verteilung, jedes Mitglied seine eigene Standardausstattung); „unarmed“ = ausdrücklich keine Waffe. Die Engine speichert `entity.armed` (≤ 80 Zeichen) nur bei humanoidem Anker; Wörter ohne Waffenwort sind keine Angabe |
| **K5** | Die Waffe ist vor dem Tod **kein Objekt**: nicht geben, nehmen oder entwaffnen; Vertragszeile: nie als `object.new` mit der Kreatur als Halter |
| **D8/K4** | Keine Waffenanzeige in `DUNGEON AHEAD` |

**Tests:** `fix186_monster_a2` 10/10. Auf `.185` rot: Datei (keine `creatureGear`), im Hostpfad wird `armed` als unbekanntes Feld abgelehnt und ein Goblin kämpft mit „Natural/unarmed strike“. Fälle: Q1 Standardliste (400 IDs, Verteilung 6:3:1), Oger/Troll/Schamane; D4 erwartete Waffenbeute 400 Kämpfe je Anker; Q4/Q5 Beute unabhängig vom Einsatz, „broken“ ohne Objekt, keine zweite Waffe; Q6/R7/D2 Fetisch und Bogen ohne Angriffsänderung; R6/D3 Name aus Text, Werte des Ankers, „bare hands“, Wörter ohne Waffe; R5/D5 Altprofil mit alter Quote und erhaltener Tabelle; Q3/D7 Slotschlüssel unabhängig von der ID, Boss ohne bessere Waffe; Q2/K7 Hostpfad mit Speer: Profil, Karte, Kampf (`skill_name`, `raw_text`), Kampfblock, Reload gleich; K3 Gruppe mit/ohne Angabe; R2 Wolf mit `armed` ignoriert, R3 Beschreibung ohne Wirkung, R4 Person unverändert, R8 spätere Waffe ändert das Profil nicht.

**Geänderte Bestandstests:** Versionsprüfungen `fix144`, `fix183` (`delta-1.14` → 1.14 oder 1.15) und `fixes_4_1_5` (`extract-5.26`).

## Gemeinsame Endabnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | 14/14 (Paket 1: 4, Paket 2: 10) |
| Angrenzende Suites (Monster, Kampf, Loot, Payment, Dungeon, PULSE, Envelope) | 509/509 |
| `npm test` | **3161/3161** |
| Replay gegen `.185` | **2235 Fälle, 9 geändert**, feldweise geprüft: **3** (b17-mage #150, #172, #186) legen Steinbruch-Gnolle (Goblin-Anker) mit Waffe fest (2 Speere/2 Messer, 1/1, 1/1) – ohne `profile.gear` und mit Ankerangriff exakt `.185`; **6** (b17-rogue #200, b17-warrior #42, b18-warrior #202, #294, #334, b19-warrior #294) geben in einem abgelehnten `creature.new` das neue Feld `armed: null` zurück – sonst exakt `.185`. Paket 1 ändert keinen Korpusrecord. Im Korpus wird kein humanoides Monster getötet: Kampf- und Beutewirkung belegen nur die Regressionen |
| Korpuscheck | `accepted_monster186_vs_126.json`: 1077/1077 mit Fingerprint, Schutztest in `replay.test.js` |
| Save/Reload, Fold | Fold-Gleichheit und `validateState` in den Hosttests beider Pakete; Korpusfold 0 Fehler, 0 Validierungsprobleme; Altprofile ohne `gear` und Altdienste ohne Zuordnung getestet |
| ST1.19 Standard/Failsoft | **nicht ausgeführt:** keine isolierte SillyTavern-Installation. **Offen**, wegen der Vertragsänderung `delta-1.15` besonders relevant |

## Grenzen

- **Keine natürliche Abnahme.** Ob der Extractor `armed` (und die Gruppenregel) sauber meldet, zeigt nur ein natürlicher Lauf.
- **Restwiderspruch K3:** Zeigt die Erzählung nur zwei von drei Goblins mit Speer, gilt die Standardausstattung je Mitglied; Karte und Kampf zeigen sie ab dem nächsten Zug.
- **Später aufgenommene Waffen** ändern das Profil nicht (wie bei Personen).
- **Zahlen** (6:3:1, Verwertbarkeit) sind Designwerte, nicht gemessen; die Beute variiert im Namen (Speer statt Messer).
- **PAID HERE:** Bei echter Mehrdeutigkeit wird ein Bett ohne Preis genannt; ein Zimmer als eigener Unterort zeigt es dort weiterhin nicht.
