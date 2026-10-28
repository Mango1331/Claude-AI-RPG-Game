# Schutzpatch .108 — Belegprüfung für unfreiwillige Ortswechsel

Basis `.107` / `3ef1211`. Grundlage: GPT-Review von `.107`, die eigene Reproduktion von fünf Lücken in `src/v4/narration_evidence.js` und die Nutzerfreigabe vom 28.10.2026 mit zwei Ergänzungen. Eng begrenzt: nur die Belegprüfung. Keine Architektur-, Combat- oder Balanceänderung, keine Prompt- oder Extractor-Versionsänderung.

## Reproduzierte Lücken in `.107`

| Narrator-Text | `.107` | Ursache |
|---|---|---|
| „The guard grabbed Alaric's sleeve but kept him at the doorway.“ | angenommen | Ein Auslösewort („grabbed“) galt als Bewegung. |
| „He remembered the night, when the guards dragged him …“ | angenommen | Die Erinnerungsprüfung begann erst nach dem letzten Komma. |
| „'I'll drag you to …,' the guard threatened.“ (gerade und typografisch) | angenommen | Einfache Anführungszeichen galten nicht als Rede. |
| „A portal shimmered in the corner …“ | angenommen | „portal“ galt als Bewegung. |
| „The watch arrested him on the landing …“ | angenommen | „arrested“ galt als Bewegung, obwohl er bleibt. |
| zusätzlich: „They'll haul him to …“ in der Erzählung | angenommen | Die Kurzform „'ll“ verlor ihr „will“. |

## Änderungen

- **Kurzformen:** werden vor dem Entfernen der Apostrophe aufgelöst: `'ll` → will, `n't` → not. `'d` wird **nicht pauschal** zu „would“: vor einem Partizip Perfekt („they'd carried him“, auch über ein Adverb hinweg: „they'd already carried“) ist es „had“, sonst „would“ („they'd haul him“).
- **Rede in einfachen Anführungszeichen:** ‘…’ und '…', die an einem Wortanfang öffnen und vor Leerzeichen oder Satzzeichen schließen, gelten als Rede. Apostrophe in Wörtern (I'll, the guard's) öffnen und schließen nichts.
- **Erinnerung und Hörensagen** werden gegen den ganzen Satz vor dem Zitat geprüft. Verneinung und Plan bleiben auf den eigenen Teilsatz beschränkt („Before he could react, two men seized him …“ bleibt gültig).
- **Bewegungswörter zweistufig:**
  - Echte Bewegung (carried, dragged, swept, fell, swallowed, marched, led …) genügt allein.
  - Ein Auslöser (grabbed, seized, arrested, captured, pulled, portal, current, flood, „gave way“ …) genügt nur mit einer Richtung im Satz (into, to, through, down, out, away, off, onto …).
- **Nutzerergänzung 1, Alarics eigene Bewegung:** Neben dem Bewegungswort steht Alaric (him, he, himself oder sein Name, höchstens drei Wörter Abstand). Bewegt der Satz eine andere Person oder einen Gegenstand, gibt es keinen Ortswechsel.
- **Nutzerergänzung 1, Zielort:** Nennt der Satz ein Ziel („… to the gap in the rocks“), muss es zum Ziel von `arrive.at` passen. Verglichen wird mit dessen eigenem Namen; ein umgebender Ort zählt nur, wenn der Satz nichts anderes nennt. Grundlage sind die erfassten Ortsnamen (`s.places`, `parent`), kein Sprachinterpreter. Ohne genanntes Ziel („swept him downstream“, „the portal swallowed him“) gilt die Prüfung nicht.
- **Nutzerergänzung 2, `'d`:** „had“ und „would“ sind getrennt umgesetzt und je als Regression abgesichert.

Ein abgelehnter Beleg wirkt wie in `.107`: kein Ortswechsel, Firewall-Regel `no_go` mit Korrektur, Alaric bleibt, wo er war. NPC-Anwesenheit (`enter`) nutzt dieselbe Normalisierung; ihr Satz-Rückfall bleibt bewusst großzügig und wird im Batch gemessen.

## Tests und Abnahme

- **19 neue Regressionen** in `tests/v4/patch_protect108.test.js`:
  - Gegen unverändertes `.107`: **11 rot**, 8 grüne Kontrollen.
  - Kontrollen: Flut, Verschleppung nach eigenem Vordersatz, Einsturz mit erzähltem Fall, Portal, das ihn verschluckt, „'d“ als „had“ (zweimal), passendes Ziel, NPC-Kurzform.
  - Nach dem Patch **19/19**.
- Die `.107`-Regressionen (25), der Krypta-Fall aus Patch 7 und der Graben-Fall aus Run 12 bleiben unverändert grün.
- Vollständiges **`npm test -- --test-concurrency=4`: 2147/2147**.
- **ST 1.19 `smoke:st:c`:** Standard **22/22** (5 Extraktionen), erweitert mit Fail-soft **27/27** (7 Extraktionsaufrufe), keine PageErrors, Status `4.3.0-c.6.6.108`.
- Kein natürlicher Lauf in diesem Patch.

## Grenzen

- Enge wörtliche Prüfung mit kurzen Wortlisten, kein Textverständnis.
- „him/he“ in drei Wörtern Abstand kann sich auf eine andere Person beziehen.
- Ein ungewöhnlich formulierter echter Ortswechsel oder ein Ziel unter anderem Namen kann abgelehnt werden. Alaric bleibt dann am Ort, und die Korrektur sagt es.
- Ein mit „to“ eingeleiteter Infinitiv („dragged him to see the captain“) gilt als genanntes Ziel.
