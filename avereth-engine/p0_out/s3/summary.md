# P0 / S3 Domänen-Prototyp (V12-Pfad): Ergebnis

- Datum: 2026-09-27T16:47:47.270Z · Werkzeug s3_prototype v1 · Gold gold-v4-0.1 · ohne Key, ohne Netz
- **36 von 36 Prüfungen erfüllt** · keine offene Grenzfrage

## Prüfungen

| Prüfung | Inhalt | Ergebnis | Detail bei Abweichung |
|---|---|---|---|
| gold_B_t1 | Pfad B, t1 (Nachricht 5 → Antwort 6): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t2 | Pfad B, t2 (Nachricht 7 → Antwort 8): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t3 | Pfad B, t3 (Nachricht 9 → Antwort 10): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t4 | Pfad B, t4 (Nachricht 11 → Antwort 12): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t5 | Pfad B, t5 (Nachricht 13 → Antwort 14): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t6 | Pfad B, t6 (Nachricht 15 → Antwort 16): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t7 | Pfad B, t7 (Nachricht 17 → Antwort 18): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_B_t8 | Pfad B, t8 (Nachricht 19 → Antwort 20): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t1 | Pfad A, t1 (Nachricht 5 → Antwort 6): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t2 | Pfad A, t2 (Nachricht 7 → Antwort 8): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t3 | Pfad A, t3 (Nachricht 9 → Antwort 10): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t4 | Pfad A, t4 (Nachricht 11 → Antwort 12): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t5 | Pfad A, t5 (Nachricht 13 → Antwort 14): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t6 | Pfad A, t6 (Nachricht 15 → Antwort 16): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t7 | Pfad A, t7 (Nachricht 17 → Antwort 18): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| gold_A_t8 | Pfad A, t8 (Nachricht 19 → Antwort 20): Gold-Auflösungen, PLAYER ACTIONS, Events, Zustand | erfüllt |  |
| E1 | Fünf sichtbare Verträge sind kanonisch (nach Nachricht 9: 5 × listed, Novice, 80/150/40/20/50 cp; nach Antwort 10: Weasel taken_by_other) | erfüllt |  |
| E2 | Miller's Run bleibt nach Nachricht 11 aktiv, Rang Novice aus dem Listing, kein delta.rejected | erfüllt |  |
| E3 | Ossler existiert, ist nicht da und nicht getroffen | erfüllt |  |
| E4 | „register the Herb Run“ ist Annahme in der Gildenhalle | erfüllt |  |
| E5 | Der Clerk hat die Annahme vor der Reise bezeugt (witnessed, Schritt 1, Nachricht 13) | erfüllt |  |
| E6 | Reedbeds haben den richtigen Elternort (reedbeds › eastern mill leat › Redmarch › Veyrhold) | erfüllt |  |
| E7 | Langes Sammeln ist autorisiert (Deckel 560 min, time 300 angenommen) | erfüllt |  |
| E8 | Marshmint existiert physisch (nach Antwort 16 in den Reedbeds, nach Nachricht 17 bei Alaric) | erfüllt |  |
| E9 | „carry it back to the Guild“ = take + go + bedingte Abgabe | erfüllt |  |
| E10 | Abgabe prüft den Beweis: Marshmint abgegeben, +40 cp, +15 XP, Herb Run completed, 1/5 Novice-Verträge | erfüllt |  |
| E11 | Gasthaussuche nimmt keinen Preis an: buy pending, Angebot 4/2/1 cp, Coin unverändert, overreach → Korrektur | erfüllt |  |
| E12 | `coerce` durch den Anbieter eines offenen Angebots wird abgelehnt; ein alter `taken_by`-Schlüssel scheitert am Schema | erfüllt |  |
| X1 | Registrierung: Nachricht 7 → pending mit Canon-Gebühr 20 cp; Nachricht 9 → −20 cp, Novice, Plakette | erfüllt |  |
| X2 | `pay` an den Clerk bei offener Registrierung = Annahme der Canon-Gebühr | erfüllt |  |
| X3 | Gildenhalle: Abgabe in den Reedbeds ohne go → refused; mit take + go → conditional (E9) | erfüllt |  |
| X4 | Erreicht die Antwort die Halle nicht, wird nichts abgegeben (Quest aktiv, keine Auszahlung, cmd.expired) | erfüllt |  |
| X5 | Fehlt ein expected-Feld, ist der Block unvollständig (Variante B ruft dann die Recovery) | erfüllt |  |
| X6 | Generator-Ausfall (Rev. 2.1): kein Listing, BOARD GENERATION FAILED, „invent none“, Prosa-Verträge nur overreach guild_listing, quest.offer der Gilde abgelehnt, keine Annahme | erfüllt |  |
| END | Endzustand: Day 1, 18:45, 70 cp, 15 XP, Marsh Bell unter Redmarch, Miller's Run aktiv mit offenem Beweis | erfüllt |  |
| AB | Pfad A (Recovery) und Pfad B (Block) ergeben nach jedem Zug denselben Domänenzustand | erfüllt |  |

## PLAYER ACTIONS des Normalpfads (so bekäme sie der Erzähler)

- **t1**: 1. GOES — to Adventurers' Guild hall (report whether he arrives and where).
- **t2**: 1. REGISTERS — pending: the Guild's registration fee is 2 silver (20 cp), one-time. Let the clerk name it and explain; stop there: he has not agreed to pay.
- **t3**: 1. PAYS — the Guild registration fee, 20 cp: registered, Guild Rank Novice; the crystal reads Power Rank F; he receives his Guild plate. / 2. READS the Novice board — BOARD (canonical; show exactly these, invent no other official contract): Miller's Run Escort · 80 cp | Weasel Sign at Fenwick's Coop · 150 cp | Herb Run — Marshmint · 40 cp | Missing Dog, Tanner's Row · 20 cp | Fence Repair, Widow Marsh · 50 cp.
- **t4**: 1. ACCEPTS — "Miller's Run Escort" at the Guild desk; the clerk logs it (the Guild pays 80 cp on completion).
- **t5**: 1. ACCEPTS — "Herb Run — Marshmint" at the Guild desk; the clerk logs it (the Guild pays 40 cp on completion). / 2. GOES — to reedbeds east of the mill leat (report whether he arrives and where).
- **t6**: 1. GATHERS marshmint until the end of the day (at most 560 minutes; the story decides how long it takes and what it yields).
- **t7**: 1. TAKES — marshmint (1 basket) along. / 2. GOES — to Adventurers' Guild hall (report whether he arrives and where). / 3. TURNS IN, when he reaches the Guild hall — "Herb Run — Marshmint": the desk checks 1 basket of marshmint → accepted; the Guild pays 40 cp. If the reply does not reach the hall, nothing is turned in.
- **t8**: 1. NOTHING TO DO — "Herb Run — Marshmint" is already turned in. / 2. GOES — to an inn (report whether he arrives and where). / 3. WANTS — a room for the night, a bath and laundry; no price is known. / OPEN DECISION — Alaric wants a room for the night, a bath and laundry; no price is known. Let the seller name the prices, then stop: he has not agreed to pay.

## Grenzentscheidungen, die die Daten verlangten (vor P1 bestätigen)

- **Befehle `drop` und `use`:** Ein Delta darf Alarics Besitz nie bewegen oder verbrauchen (§5.1). V11 „leave the heads on the floor“ und Tränke/Rationen brauchen deshalb Befehle. Aufgenommen in `tools/p0/draft/commands.json`; §4.1 ergänzen.
- **Anwesenheit bei Rückkehr:** Die Ankunft leert die Szene; wer da ist, meldet der Block mit `enter` oder `person.new`. Die Regel aus §6.2 „Ankunft an einem Ort mit dort Anwesenden“ würde Kulissenfiguren (den Abenteurer aus Antwort 10) bei der Rückkehr wieder anwesend machen.
- **IDs neuer Personen:** Die ID kommt aus Name oder Rolle (`npc.guild_clerk`, `npc.ossler`), nicht aus dem `ref` des Blocks. `ref` verbindet nur Deltas innerhalb eines Blocks. So ergeben Block (B) und Recovery (A) dieselben IDs.
- **Erwartungsfeld bei `buy`/`pay` pending:** `{priced: bool}` statt `{offer: {…}}` (§5.3): Die Preise stehen im `offer`-Delta, das Feld fragt nur, ob einer genannt wurde.
- **Abgabe eines erledigten Vertrags:** `refused` (already_completed) mit PLAYER-ACTIONS-Zeile „NOTHING TO DO“ (Nachricht 19).
- **`pay` bei offener Registrierung:** `pay` an die Gilde oder den Clerk mit 20 cp oder ohne Betrag gilt als Annahme der Canon-Gebühr; gleichwertig zu `offer.accept offer.registration`.
- **Auszahlung:** Die Engine zahlt bei der bedingten Abgabe mit der Ankunft (Antwort 18), auch wenn die unveränderte 3.1.7-Prosa die Auszahlung in Antwort 20 erzählt. Ein `coin.gift` der Gilde wird abgelehnt.
- **Aushang für Nicht-Mitglieder:** Der Generator läuft schon bei der Ankunft in der Halle (Antwort 6), vor der Registrierung, für den Novice-Rang. Lesen darf jeder; annehmen nur ein Mitglied.
- **Neue Orte mit neuem Elternort:** Reedbeds unter dem neuen „eastern mill leat“, Marsh Bell unter der neuen Gasse: eine Ebene verschachtelter `new`-Eltern reicht für den Lauf (§5.1).
- **Zeitdeckel:** Lokales `go` 120 min; `activity until end_of_day` ab 10:40 = 560 min; die Deckel gelten für die Summe der `time`-Deltas einer Antwort.
- **Zeugen:** Die Engine bucht das Wissen der Anwesenden bei der Auflösung des Befehls (Schritt = seq), also vor der Reise im selben Zug (E5).
- **`expected.go.arrived` und `arrive`:** Beide müssen übereinstimmen; ein Widerspruch ist ein Validatorfehler.
