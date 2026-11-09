# .173 — NPC E2-B-Korrektur: persönliche Threads eindeutig zuordnen

**Basis:** `.172` / `a3c906fc4692a95025ba494b00b93fcd7ae2eaa5`. Enger Fix des P2-Befunds aus dem unabhängigen [GPT-Produktdiff-Review .172](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/REVIEW_NPC_E2B172_PRODUKTDIFF_GPT.md) §2. Geändert ist nur `src/threads.js` (Zuordnung eines Thread-Reports ohne ID). R6-Ankunftskarten, R8-Karten, R9, `world.js`, Gilde, E2-A und PULSE sind unverändert; es gibt keine Migration alter Threads und keine Kontextänderung.

## 1. Fehler (.172)

`matchThread` nahm für einen Report mit Parteien jeden offenen Thread, der **eine** NPC-Partei mit ihm teilte, und wählte bei exakt gleichem Text mit `.find()` den ersten. `threadEvents` vereinigte dann die Parteien. Die Fälle wurden auf unverändertem .172 über den echten Pfad (Extractor-Antwort → `replyTurnV4` → World → `delta.js` → `threads.js` → `thread.set` → Fold) reproduziert:

| Fall | .172 | .173 |
|---|---|---|
| A: Alarics Absprache `[pc, Tam]`, danach Tam–Bess im gleichen Wortlaut `[Tam, Bess]` | Alarics Thread übernommen, Parteien `[pc, Tam, Bess]`; `#npc Bess` zeigt „Open between you“ | eigener Thread `[Tam, Bess]`; Alarics Thread bleibt `[pc, Tam]`; `#npc Bess` ohne Absprache, `#npc Tam` nur seine |
| A2: wie A, Text umformuliert (Wortnähe ≥ 0,6) | ebenso verschmolzen | eigener Thread |
| B: zwei offene gleichlautende `[pc, Tam]`, `[pc, Bess]`; Erledigung ohne ID und ohne `who` | der erste wird `resolved` | keiner; `delta.rejected` „ambiguous thread … give its id“, beide offen |
| C: `promise [pc, Bess]`, danach `debt` gleichen Texts und gleicher Parteien | Promise übernommen, bleibt `promise` | eigener `debt`-Thread |
| Altthread ohne `who`, `debt`-Report seines exakten Texts | Altthread erhält Parteien | eigener Thread, Altthread unverändert |
| Host (Alderwatch): Schreiberin verspricht Alaric die Karte, danach einem Träger im selben Wortlaut | `[pc, clerk, hob]` | zwei Threads `[pc, clerk]` / `[clerk, hob]` über Parser, Regenerate, Swipe, Edit, Reload |

## 2. Neue Zuordnungsregel (`findThread`, `matchThread` ist ihr Ergebnis)

Ein Report **ohne** ID benennt einen offenen Thread nur, wenn alle drei Bedingungen gelten:

1. **Art passt:** gleiche `kind`, oder eine der beiden unbekannt. Das gilt jetzt auch für exakt gleichen Text; vorher prüfte nur der Wortnähe-Pfad die Art.
2. **Parteien passen:**
   - Report **mit** Parteien: Jede gemeldete Partei ist Partei des Threads (alle, oder eine Teilmenge, wenn World Alaric weggelassen hat, weil niemand der Partei anwesend ist). Eine bloß überlappende Parteienmenge passt nicht. Eine neue Partei kommt nur über die ausdrückliche Thread-ID hinzu. Ein Thread ohne Parteien (älter als E2-B) passt nur über den exakten Wortlaut.
   - Report **ohne** Parteien: Exakter Wortlaut passt zu jedem Thread, Umformulierung nur zu Threads ohne Parteien. Eine gebundene Absprache wird ohne Parteien also nicht über ähnliche Worte umgeschrieben.
3. **Eindeutig:** Passen mehrere Threads über ihren exakten Wortlaut, wird keiner genommen; `threadEvents` lehnt mit `ambiguous thread` ab, auch bei `open`, damit kein dritter Duplikat-Thread entsteht. Bei Wortnähe bleibt die bestehende Regel: nur genau ein Kandidat, sonst neuer Thread bzw. „cannot resolve an unknown thread“.

Unverändert:
- Zuordnung über die **ID** (auch ohne `who`, Parteien bleiben, neue Parteien kommen hinzu).
- Parteien bleiben bei Aktualisierung und Erledigung erhalten.
- Ein Altthread ohne `who` erhält Parteien über ID oder exakten Wortlaut gleicher Art.
- Reports ohne Parteien zu ungebundenen Threads verhalten sich wie bisher, abgesehen von der Artprüfung und dem Eindeutigkeitsschutz beim exakten Text.

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen unverändertes .172 | `tests/v4/npc_e2b173.test.js`: **6 von 9 rot** (A, A2, B, C, Altthread mit anderer Art, Host). Grün auch auf .172 sind die Positivkontrollen (Erledigung per ID ohne `who`, Erledigung mit vollständigen Parteien, Aktualisierung mit gleichen Parteien bzw. nur der NPC-Partei, wenn Alaric fehlt) und der Fold-Test. Spielerzustand aus User02 nach I53, Bess und alle Extractor-Antworten synthetisch. |
| Neue Regressionen | **9/9 grün**: A, A2, B, C, zwei Positivkontrollen, Altthread (exakt + Art), Fold, Host (Parser, Regenerate, Swipe, Edit, Reload, Folgekarte, `#npc` beider Personen) |
| E2-B / E2-A / angrenzend | `npc_e2b` (14) und `npc_e2b_host` (2) unverändert grün, darunter Tam/Bess/Brenna, D1/D4/D6; `npc_e2a*`, `fix158`, `fix160`, `fix161`, `gen35_ownership`, `coverage`, `patch842` 104/104 |
| `npm test` | **2970/2970** |
| Replay `.126`-Baseline | Recordvergleich gegen .172: **0 von 2235 Records geändert**. `accepted_e2b172_vs_126.json` gilt unverändert: 1048 abweichend, 1048 exakt akzeptiert, 0 offen. Keine neue Akzeptanzdatei, alte Dateien unverändert. |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **145** wahr, keine falsch (.172: 143). Neu im E2-B-Smoke: `npc172_npcAgreementSeparate` (Schreiberin verspricht dem Armbrustschützen im fast gleichen Wortlaut: eigener Thread `[clerks, crossbowman]`, Alarics bleibt `[pc, clerks]`) und `npc172_npcPanelOnlyHis` (echtes `#npc clerk` im Host: genau Alarics eine Absprache). Alle übrigen `npc172_*` (Ankunftskarte, Erledigung, Save/Reload, Regenerate, „settled“) weiter wahr. |
| ST1.19 Failsoft | `OK`, **150** wahr, keine falsch (.172: 148) |

**P3-Kontextbudget, nachgemessen** (Tam, User02 nach I53, synthetisch; Engine-Schätzer, Budget 1400). .173 ist identisch zu .172 (Kontextcode unverändert):

| Fall | .171 | .172 / .173 | Δ | davon |
|---|---|---|---|---|
| Absprache offen | 1453 | 1473 | +20 | Kompaktkarte +20 |
| Absprache erledigt | 1437 | 1484 | **+47** | Kompaktkarte +26, Abruf `relevant` +21 (erledigter Thread über seine Partei gefunden) |

Abweichung zum Fachplan §9: Nicht-GO-Ziel **+15 um 32 Tokens überschritten** (erledigter Fall), Kartenziel +25 um 1 überschritten. Das ist eine dokumentierte Abweichung; die Budgetgrenze hält (prioritätsgebundener Packer). Keine Budgeterhöhung und kein Kontextumbau in diesem Fix. Kandidat für eine spätere getrennte Entscheidung: die Redundanz zwischen Kompaktkarte und `relevant` vermeiden, ohne Abrufverlust.

## 4. Grenzen

- Eine Absprache, die ohne Alaric als Partei entstand (`[Tam]`) und später von Angesicht zu Angesicht gleichlautend mit `[pc, Tam]` gemeldet wird, wird ein neuer Thread (Alaric kommt nur per ID hinzu). Das ist bewusst konservativ: keine falsche Verpflichtung, höchstens ein doppelter Eintrag.
- Mehrdeutige Reports werden nur abgelehnt, nicht nachgefragt; die Auflösung braucht eine spätere Antwort mit ID oder vollständigen Parteien.
- Freier Extractor: Ob ein Modell ID oder vollständige Parteien zuverlässig meldet, ist ungetestet (Smoke/Host geskriptet).
- P3-Budget (Tam erledigt +47, §3) bleibt eine dokumentierte Abweichung; in diesem Fix gibt es keinen Kontextumbau.
