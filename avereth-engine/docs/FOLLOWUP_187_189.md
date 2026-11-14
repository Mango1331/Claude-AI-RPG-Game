# Builds 4.3.0-c.6.6.188 und .189 – zwei Negativregressionen zu `.187`

**Basis:** `.187` (Build `5b4d493`, Patchnote [BATCH186_FIXES_187.md](BATCH186_FIXES_187.md)).

**Anlass:** [Unabhängiger GPT-Tiefenreview von `.187`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_BATCH187_DREI_ETAPPEN_PRODUKTDIFF_GPT.md) am 14.11.2026 (R1/R2). Er fand keinen Grund für einen neuen Architektur- oder Paymentpatch, empfahl aber vor dem nächsten natürlichen Lauf zwei gezielte Negativregressionen:
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

## 3 – `.189`: die Proben des Reviews selbst (`e67afbe`)

Nach dem Build `.188` wurden die wörtlichen Proben aus §3.3 und §3.4 des Reviews nachgetestet. Drei davon fielen noch durch:
- „kill the rats for the village“ mit „Pay me five copper and I'll do it“ blieb Arbeit, weil „pay me“ und „I'll do it“ noch nicht als Zeichen galten, dass der Anbieter selbst bezahlt arbeitet.
- „a single step and hold my position“ führte noch zum Rückweg.
- „staying at this ambush spot“ führte noch zum Rückweg.

**Ergänzt:**
- Bei `HIRED`: „pay me“, „I'll/I will do it“.
- Bei den Bleibe-Zeichen: „hold my position/place/post“, „stay at/by/on this/that“, „a single / only one / just one step“.

**Tests:** in den beiden Nachkorrekturtests ergänzt.
- Rattenfänger als Hostfall: gekauft bei „I hire you“.
- Tabelle: `unclear`.
- Drei Review-Formulierungen: kein GO.

Weil sich der Code gegenüber `.188` geändert hat, ist das ein eigener Build `.189`.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| `fix187_*` | 20/20 (2 neue Tests, beide rot auf `.187`; Review-Proben in `.189` ergänzt) |
| `npm test` | **3190/3190** (`.188` und `.189`) |
| Replay | unverändert gegenüber der `.187`-Akzeptanz: 2235 Fälle, 1088/1088 akzeptiert, keine neue Abweichung (kein Korpusfall enthält einen angeheuerten Jäger oder einen ortsfesten Rückweg) |
| ST1.19 isoliert `.189` | Engine `4.3.0-c.6.6.189`, Checkout `e67afbe` mit genau der Versionsänderung des Buildcommits `6d8a772`. **Standard OK 224/224, Failsoft OK 229/229, je 0 PageErrors** (464 s / 476 s) |
| ST1.19 isoliert `.188` (`smoke:st:check` → ready, `smoke:st:isolated`) | ST 1.19.0 (`7e8663c`), Engine `4.3.0-c.6.6.188`. Checkout `1266272` mit genau der Versionsänderung des Buildcommits `823fd6f`. **Standard OK 224/224, Failsoft OK 229/229, je 0 PageErrors**. Mockprovider; Sandbox-Werkzeug unverändert seit `24d2aa9` |

## Grenzen

- Beide Regeln hängen an Wörtern; Formulierungen außerhalb der genannten Zeichen fallen auf die `.187`-Regeln zurück.
- Ein Jäger, der „for me“ sagt und sich nicht als Täter nennt, gilt weiter als Seite des Anbieters.
- Ob sich die Modelle natürlich so verhalten, zeigt nur ein natürlicher Lauf. Empfohlen ist zunächst ein kurzer natürlicher Test, kein langer Batch.
