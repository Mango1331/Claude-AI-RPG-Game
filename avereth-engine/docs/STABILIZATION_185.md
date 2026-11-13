# Build 4.3.0-c.6.6.185 – Stabilisierung nach dem natürlichen Dreierbatch

**Basis:** `.184` (`efcad4c`). **Quellen:** [Batchreview 13.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261113-135417Z/REVIEW.md) (auf `main`), Fable [Payment-Tiefenanalyse](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/PAYMENT_TIEFENANALYSE_183.md) mit [GPT-Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/PAYMENT_TIEFENANALYSE_183_GPT_GEGENREVIEW.md), [GPT-Review Monster A1 R1](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_MONSTER_A1_184_PRODUKTDIFF_GPT.md). Die Batch-ZIP liegt nicht im Repository: Die Originalfälle sind mit dem im Review dokumentierten Wortlaut auf den Host-Pfad nachgebaut (User01/User04-Chats, Testgasthaus „The Hearthstone“).

Keine neue Zahlungsarchitektur, keine Lockerung von `#pay`, Preisbeleg, Münzwortregel, Firewall (außer Z3.3) oder Extractor-Schema. NPC E3, PULSE, Monster A2 und Kampf unverändert.

## Korrekturen (je ein Commit)

| | Fall | Änderung |
|---|---|---|
| **R1** | Monster A1: Kreatur mit „… bred in the hills as a guard“ (Rollenwort hinter Zeichen 40) | **Reproduziert:** Der Hund kassierte im User01-Antwortpfad 5 cp Strafe (`coin.changed`), „kept by a thief“ einen Raub. `envelope.mayTake` liest Rollenwörter nur noch bei `kind: npc`. Kreaturen behalten die Kampfregel (`pending_combat`, kämpft gegen ihn); echte Wache und echter Dieb unverändert |
| **T22/T27** | Mage: „I'd like to accept the … contract — and what can you tell me …?“ fiel als Frage | Die Satztrennung am Gedankenstrich kennt jetzt auch „and/but/also/so“ vor der Frage – nicht nach einer nur erwogenen Tat („whether I should“, „I might“, „thinking about“). Eine verworfene Annahme eines gelisteten Vertrags gibt dem Erzähler `NOT ACCEPTED … stays LISTED … not his and not active`; der Gildenblock sagt, ein `[listed]`-Vertrag wird nie als seiner oder aktiv erzählt, auch auf Nachfrage |
| **T41–T43** | Extractor verliert die Hülle | Die eine Reparaturanfrage nennt das verlangte Gerüst (mit den Schlüsseln und Feldern dieses Zugs) und je Verstoß: fehlgeleitete Antworten auf oberster Ebene, fehlende/unbekannte Felder, die Felder des Typs. Schema, Parser, Reparaturzahl unverändert |
| **Z3.3** | Mage T23: Koje „for traveling members“ als Gildengebühr abgelehnt | `guild_canon_price` prüft bei `lodging`/`meal`-Zeilen, die ein Bett oder Essen nennen, nur Gebühr/Dokumentwörter, nicht `member*`. Registrierung, Plakette, Lizenz, Gebühr, Rang, Vertragsschein bleiben gesperrt, auch falsch als Unterkunft etikettiert |
| **Z3.1** | Rogue T38: `priced: true` ohne `offer` | Ein solcher Kaufschlüssel ohne Angebot in der Antwort und ohne offenes Angebot dafür am Ort löst die **eine** vorhandene Reparatur aus (Angebot mit Wortbeleg melden oder `priced: false`). Kein erzeugtes Angebot |
| **Z1.1** | Rogue T40: Zahlungskarte unsichtbar | Das Spielerpanel zeigt jede offene Karte am Ort: `PAYMENT CARD — NOT PAID: 4 cp to Wren for … · wallet 50 cp → 46 cp · to pay exactly this, send on its own: #pay dec.pay.t4.1`. Aus dem angezeigten Zustand gelesen; bezahlte, ersetzte, verfallene Karten erscheinen nicht |
| **Z2/Z1.3** | Rogue T39, Mage T24: „he pays it and takes it“ | Die Zeile des bedingten Kaufs lässt nur die eine Endsumme mit Münzwort nennen und verbietet Münz- und Warenübergabe in dieser Antwort. **Buchung unverändert am Antwortende**; gelingt sie, zeigt das Panel sofort `BOUGHT — …`, der nächste Erzählerblock erhält `BOUGHT AFTER THE LAST REPLY … it is done`. Gescheiterte Käufe nennen den echten Grund (keine Endsumme / Ablehnungsgrund des Angebots) statt des Gildenshop-Texts; `pay` ohne erkannte Übergabe sagt, was fehlt |
| **Z1.2/E-3** | Rogue T40–T43: bezahltes Zimmer niemandem bekannt; latenter Doppelabzug | Erzählerblock, Planner- und Extractor-Katalog nennen `PAID HERE` – nur mit Beleg (`service.granted` der Engine **und** angenommenes Angebot desselben Anbieters an diesem Ort, 24 h). **Mehrpositionskauf**, der das bezahlte Bett erneut enthält: weder 7 cp noch still 4 cp, sondern Rückfrage (`CLARIFY`, nichts gebucht) bzw. `NOT BOUGHT` mit Grund. **Keine Sperre** für ein einzeln gekauftes Bett (weitere Nacht möglich) |

## Prüfung

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `fix185_r1_creature_authority` 4, `fix185_quest_accept` 5, `fix185_extractor_repair` 5, `fix185_payment` 13: **27/27** |
| Rot gegen `.184` (Produktdateien auf `.184`) | R1 3/4 · T22 5/5 (der Gegenfall „tomorrow“ fiel dort als Frage statt als Plan) · Extractor: Datei rot (`repairForm` fehlt; Reparatur ohne Gerüst) · Payment 10/13. Der Doppelabzug ist auf `.184` **reproduziert**: Annahme „stew 4 + room 3“ nach bezahltem Zimmer bucht 7 cp, der bedingte Kauf ebenso |
| Auf beiden Ständen grün (Gegenfälle) | echte Wache/Dieb; verfallene Karte ohne Anzeige; nichts bezahlt → kein PAID HERE, nach 24 h nicht mehr; Eintopf allein, „another night“ allein, beide Positionen ohne bezahltes Zimmer werden gebucht |
| Angrenzende Suites | Finanz/Handel (`fix138`–`fix144`, `patch_*trade*`), `fix160`, `fix18*`, `gen35_envelope`, `pulse_a`, Firewall-Unit, `patch_guild120`, `planner_c*`: **409/409** |
| `npm test` | **3146/3146** |
| Replay gegen `.184` | **2235 Fälle, 11 geändert**, jeder feldweise zugeordnet (unten) |
| Voller Korpuscheck | `accepted_stab185_vs_126.json`: 1077 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet; Schutztest in `replay.test.js` |
| Spielerpanel / Modellkontext | getrennt geprüft: Panel über `display_text` der Antwortnachricht, Kontext über `buildContext`, Planner-Katalog `catalogText`, Extractor-Katalog |
| ST1.19 Standard/Failsoft | **nicht ausgeführt:** keine isolierte SillyTavern-Installation in dieser Umgebung. **Offen** |

**Die 11 Replay-Änderungen** (feldweise gegen `.184` geprüft, sonst identisch):

| Kategorie | Records | Was sich ändert |
|---|---|---|
| `stab185 conditional purchase line` (4) | b17-warrior #65, #269 · b18-warrior #233 · b19-mage #141 | Zeile des bedingten Kaufs und ihre OPEN-DECISION-Zeile |
| `stab185 purchase reason` (5) | b16-rogue-sale #80 · b17-warrior #66 · b18-warrior #234 (dazu Reparatur nach Z3.1) · b18-rogue #268 · b18-warrior #260 | Grund des nicht gebuchten Kaufs |
| `stab185 priced repair` (1) | b17-warrior #270 | nur `repaired: true` (Z3.1; der Korpus hat keine Reparaturantwort, die erste Antwort bleibt) |
| `stab185 bought after reply` (1) | b19-mage #142 | `BOUGHT`-Panelzeile und Korrektur für den nächsten Block; Buchung (40 cp) unverändert |

In den vier Z3.1-Fällen hat der Erzähler einen Preis genannt („Four silver, and that's with the bath water heated“) und unter der alten Zeile die Zahlung erzählt; live würde die Reparatur das Angebot nachfordern. R1, T22, T41–T43, Z3.3, PAID HERE und E-3 ändern keinen Korpusrecord.

## Grenzen

- **Keine natürliche Abnahme.** Ob Erzähler die neue Kaufzeile, NOT ACCEPTED und PAID HERE befolgen und ob die Reparatur mit Gerüst die Hülle rettet, zeigt nur ein natürlicher Lauf.
- **Z3.1 kostet einen Aufruf**, wenn der Extractor `priced: true` ohne Angebot meldet (im Korpus 4 von 2235 Fällen).
- **PAID HERE** kennt nur Betten (Leistung `lodging`) am selben Ort; ein Zimmer im Obergeschoss als eigener Ort zeigt es dort nicht. Mahlzeiten und Waren werden nicht markiert (Waren stehen im Inventar).
- **Rückfrage statt Restbuchung:** Bei „Zimmer + Essen“ nach bezahltem Zimmer bucht die Engine nichts, bis eine Endsumme für den Rest genannt ist (E-3, GPT).
- **T22-Trennung bleibt wortbasiert:** Eine erwogene Annahme ohne die Signalwörter vor „— and what …?“ würde als Annahme gelesen; der Planner entscheidet zuerst.
- **Z4** (Zahlungswille ohne Verbliste) und **Z5** (P1a–P1g) sind nicht Teil dieses Builds.
