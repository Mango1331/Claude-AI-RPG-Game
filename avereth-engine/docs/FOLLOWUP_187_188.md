# Build 4.3.0-c.6.6.188 – zwei Negativregressionen zu `.187`

**Basis:** `.187` (Build `5b4d493`, Patchnote [BATCH186_FIXES_187.md](BATCH186_FIXES_187.md)).

**Anlass:** Unabhängiger Review von `.187` am 14.11.2026. Er fand keinen Grund für einen neuen Architektur- oder Paymentpatch, empfahl aber vor dem nächsten natürlichen Lauf zwei gezielte Negativregressionen:
- den angeheuerten NPC-Jäger,
- den ausdrücklich ortsfesten Rückwärtsschritt.

Beide Risiken bestätigten sich im Host. Die Nachkorrekturen sind klein und fachlich getrennt.

## 1 – Angeheuerter Jäger ist kein Werk Alarics (`06eed03`)

**Risiko bestätigt (rot auf `.187`):** Alaric heuert einen Jäger an, und der nennt sich selbst als den, der die Tat ausführt und dafür bezahlt wird. Trotzdem stufte `paidWorkLine` die Zeile als Alarics eigene Arbeit ein. `offer.accept` lehnte sie dann ab, auch bei „I hire you“. Drei Beispiele:
- „Twelve copper for my trouble“ (`for my` galt als Seite des Anbieters).
- „My wages are twelve copper“ (`wages` galt als Lohn für Alaric).
- „kill the beast troubling his camp for him“ (`for him` galt als Seite des Anbieters).

**Korrektur in `trade.js paidWorkLine`.** Die Tat-Prüfung (DEED) ist unverändert, die Richtung wird jetzt in drei Stufen bestimmt:
1. **Alaric wird bezahlt** (bounty, reward, „your wages“, „we'll pay you“, „Alaric kills …“, Beute „stays Alaric's“) → Arbeit.
2. **Der Anbieter nennt sich als bezahlten Täter** („for my trouble“, „my fee/wages/price“, „hire me“, „I'll track it down“, „myself“) → `unclear`. Er bietet also einen Dienst an, den Alaric kaufen kann; die Engine fragt nach, außer Alarics Worte heuern ihn ausdrücklich an.
3. **Die Tat geschieht für die Seite des Anbieters** („for the village“, „for us“, „for me“) → Arbeit.

„for him/her/them“ entscheidet nicht mehr, weil daraus keine Seite hervorgeht.

**Tests:** 1 neuer Test, auf `.187` rot.
- Drei Jägerzeilen: Angebot gespeichert, mit „I hire you“ gekauft (−12 cp), kein `NOT BOUGHT`, Reload gleich.
- Ohne Anheuerwort: Rückfrage, keine Buchung.
- Rogue #116, „I'll pay you“ und „We'll pay you“ bleiben Arbeit.
- Die bisherigen `.187`-Tests sind unverändert grün: Original #116, gespeichertes Angebot, `coin.gift`, gekaufte Dienste, Tabelle.

## 2 – Ortsfester Rückwärtsschritt ist kein Rückweg (`1266272`)

**Risiko bestätigt (rot auf `.187`):** Ein Schritt zurück, der den Weg nennt, aber ausdrücklich am Ort bleibt, wurde zum GO zurück nach Mossback Warrens. Beispiele:
- „I back up the track a few paces, holding my ground here at the bend“
- „two steps back along the path, staying where I am“
- „… but do not leave the bend“

**Korrektur in `planner.js mapPlan`:** Der `.187`-Rückweg gilt nicht, wenn die Worte des Schritts sagen, dass Alaric bleibt. Als Bleibe-Zeichen gelten:
- „stay here/put/where/in place/at the …“
- „hold/stand my ground“, „keep my place/post/position“
- „where I am“
- „without leaving“, „do not leave“
- eine kurze Strecke: „a/two/a few paces“, „steps“, „strides“, „yards“

Der Schritt bleibt dann Erzählung (`NOTHING TO BOOK`). Wie er geht („staying low“, „staying close to the wall“), ist kein Bleiben; ein solcher Schritt bleibt der Rückweg. Die Flucht im Kampf ist unverändert.

**Tests:** 1 neuer Test im #117-Originalzustand, auf `.187` rot.
- Drei ortsfeste Varianten: kein GO, eine Erzählzeile.
- Original #117 und zwei Gegenfälle („staying low and quiet“, „staying close to the wall“) bleiben GO nach Mossback Warrens.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| `fix187_*` | 20/20 (2 neu, beide rot auf `.187`) |
| `npm test` | **3190/3190** |
| Replay | unverändert gegenüber der `.187`-Akzeptanz: 2235 Fälle, 1088/1088 akzeptiert, keine neue Abweichung (kein Korpusfall enthält einen angeheuerten Jäger oder einen ortsfesten Rückweg) |
| ST1.19 isoliert | siehe Nachtrag unten |

## Grenzen

- Beide Regeln hängen an Wörtern; Formulierungen außerhalb der genannten Zeichen fallen auf die `.187`-Regeln zurück.
- Ein Jäger, der „for me“ sagt und sich nicht als Täter nennt, gilt weiter als Seite des Anbieters.
- Ob sich die Modelle natürlich so verhalten, zeigt nur ein natürlicher Lauf. Empfohlen ist zunächst ein kurzer natürlicher Test, kein langer Batch.
