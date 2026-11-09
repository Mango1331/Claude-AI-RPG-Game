# GPT – unabhängiger Kontrollreview NPC E2-B .173 (09.11.2026)

**Urteil: FREIGABE für den Abschluss des technischen Pakets E2-B.** Der in [GPT-Review .172](REVIEW_NPC_E2B172_PRODUKTDIFF_GPT.md) aufgezeigte P2-Fehler der Threadzuordnung ist im tatsächlichen `.173`-Produktcode geschlossen. **Kein weiterer verpflichtender P2-Diff-Stopper** im abgegrenzten Korrekturpatch. E2-A und E2-B sind damit in ihrem jeweiligen technischen Integrationsumfang implementiert und geprüft; **E3 bleibt bis zur eigenen Nutzerentscheidung und Umsetzung ungeöffnet**. Natürliche freie Narrator-/Extractorbefolgung noch nicht validiert.

## 1. Version, Quellen und Prüfmethode

Produkt `.172` / [`a3c906f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a3c906fc4692a95025ba494b00b93fcd7ae2eaa5) → `.173` / [`dec7590`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/dec75907ce970927722b6acf6608bdfa6b20256e), GitHub-Compare **genau 2 Commits vorwärts, 0 zurück**:
- [`74af01a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/74af01a580a4cbf184b9457fa68d4acef5cb2e1b): `src/threads.js` und neue gezielte World-/Hostregressionen `npc_e2b173.test.js`.
- [`dec7590`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/dec75907ce970927722b6acf6608bdfa6b20256e): Version, ergänzte reale ST-Hostprüfungen und [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/dec75907ce970927722b6acf6608bdfa6b20256e/avereth-engine/docs/NPC_E2B173_THREAD_MATCH.md).

**Selbständig geprüft:** Remote-Branch-HEADs, beide Commit-Patches, vollständige `threads.js`-Quelle, `npc_e2b173.test.js`, ST-Smokepatch, Produktpatchnote, Git-Blob-SHA der vollständigen Replayakzeptanzdatei auf beiden Produktständen. Die **unveränderten tatsächlichen `.173`-Funktionen** `findThread()`/`threadEvents()` wurden zusätzlich isoliert in JavaScript mit `normText()`/`tokenize()` aus dem gleichen aktuellen `src/util.js` und konstruierten gebundenen Thread-Zuständen ausgeführt. **Keine neue vollständige `npm test`-, SillyTavern-, freie Provider- oder 2235-Fälle-Runtime-Replayausführung durch GPT.** Code auf Produktbranch durch Review **nicht** verändert.

## 2. P2-Gegenfall gegenprüft

In `.172` war `matchThread()` bei vorhandenen Parteien auf **irgendeine** gemeinsame NPC-ID eingeschränkt; der exakte Match nutzte `.find()` und ignorierte `kind`. Das konnte persönliche Vereinbarungen verschmelzen, ihren Bezug zu Alaric fälschlich erweitern oder die falsche Erledigung buchen.

Die neue Implementierung `findThread()`:
1. filtert die offenen Threads schon vor dem Exact-Match nach kompatibler Art;
2. verlangt bei einem neuen parteiengebundenen Report, dass **jede** gemeldete Partei im Kandidatenthread enthalten ist; teilweise Überschneidung allein reicht nicht;
3. prüft bei exakt gleichem Text **alle** kompatiblen Kandidaten und meldet bei mehr als einem Treffer `ambiguous`, worauf `threadEvents()` den Bericht ablehnt, statt einen willkürlichen Thread zu ändern;
4. lässt Umformulierungsabgleich ohne gemeldete Parteien nur bei historisch ungebundenen Threads zu;
5. erhält den bewährten ID-Updatepfad, die gebundenen Parteien bei `resolved` und die `thread.set`-Events.

**Eigene JavaScript-Gegenproben aus `.173`:**

| Konstruiertes Beispiel | Tatsächliches `.173`-Ergebnis | Urteil |
|---|---|---|
| Alt `promise:[pc,Tam]`, neu `promise:[Tam,Bess]`, identische Worte | **neue ID** `thread.t10.1`, `who:[Tam,Bess]` | korrekt, Alaric wird nicht fälschlich Partei |
| Derselbe Sachverhalt, ähnliche statt identische Worte | **neue ID** | korrekt |
| Bericht mit exakt gleichen Parteien `[pc,Tam]` | Wiederverwendung der alten ID | korrekt |
| Teilmenge `[Tam]` des gespeicherten `[pc,Tam]` | Wiederverwendung | entspricht dokumentierter konservativer Subset-Regel, wenn World `pc` wegen fehlender Anwesenheit aus dem Bericht entfernt |
| Zwei gleichlautende offene Threads `[pc,Tam]` und `[pc,Bess]`, ID-/parteiloser Abschluss | **kein `thread.set`**, `reject:'ambiguous thread: 2 ...'` | korrekt |
| Derselbe Abschluss, aber ausdrücklich `who:[pc,Bess]` | Erledigung nur des Bess-Threads | korrekt |
| Alt `promise:[pc,Tam]`, neu `debt:[pc,Tam]` gleicher Text | **neuer `debt`-Thread**, Promise bleibt | korrekt |

**Keine neue P2-Integritätslücke in diesen R7-Pfaden gefunden.** Die World-/Extractor-Integration inklusive `#npc` wird von Claudes neuen `npc_e2b173.test.js`-Regressionen durch den realen Interpreter-/World-/`thread.set`-/Foldpfad, Regenerate/Swipe/Edit/Reload sowie einem echten ST-Smokefall mit geskripteter Providerantwort geprüft. Der von GPT ausgeführte isolierte Test ist kein eigenständiger Ersatz für diese End-to-End-Abnahmen.

## 3. Bestätigte Paketgrenzen / Regressionen

- **E2-B R6** Ankunftskarten und die maximale Zwei-Slot-Auswahl inklusive Schutz für angesprochene anwesende NPCs sind in diesem Korrekturdiff **unverändert**.
- **R8 / D1/D4/D6** Kompaktkarte, nur persönliche offene Absprachen in `#npc`, erledigte Anzeige bis zu neuer bedeutungsvoller Erinnerung und bedingte Rückfrage statt zugesagter Einladung unverändert.
- **R9** soziales Erinnerungsrest-Filtering und Ownershipregeln unverändert; keine neue frei erfundene Quest-/Besitz-/Zeitbuchung.
- **E2-A** `met`-Präsenzfirewall, `handled_by` und Gruppenidentität sowie PULSE, Guild und Combat unverändert.
- **E3** `scene.since`, `manner`, `interest`, Personality-Anker und spätere Beziehungsmechanik **nicht implementiert**.

## 4. Replay-/Testdaten und Kosten

**Unabhängiger vollständiger Git-Blob-Abgleich:** `avereth-engine/tests/replay/accepted_e2b172_vs_126.json` ist auf `.172` und `.173` **byteidentisch**, Blob-SHA `d8d13c3b046ca5738c538a143992bbd344fc78ec`; **1048** akzeptierte Einträge, keine still veränderte Akzeptanz. Das beweist nicht, dass GPT selbst alle 2235 Fälle durchlaufen hat.

**Implementiererabnahme laut Claude/Patchnote** (keine neu ausgeführten GPT-Runtime-Tests):
- `npc_e2b173.test.js`: **9/9**, davon auf unverändertem `.172` **6/9 rot**, neu und angrenzend **104/104**.
- Vollständiges `npm test`: **2970/2970**.
- Gesamtreplay gegen `.126`: **2235 Fälle, 1048/1048 exakt akzeptiert, 0 offen**, **0 Änderungen** gegenüber `.172`.
- Echter ST1.19-Host: **145/145 Standard und 150/150 Failsoft**, je keine falsche Prüfung. Zwei neue Tests `npcAgreementSeparate`/`npcPanelOnlyHis`; Testprovider geskriptet.
- **Keine zusätzlichen Modellaufrufe und keine Kontextcodeänderung.**

**P3-Budgetbeobachtung bleibt offen:** Tam-Fall bei gebundener **erledigter** Absprache ist laut beiden implementierten Messungen `1484` geschätzte Budgettokens gegenüber `1437` auf `.171`, also **+47** statt geplanter Nicht-GO-Zunahme höchstens +15. Davon +26 auf der Kompaktkarte (1 über dem +25-Teilziel), +21 im nun personenrelevanten Threadabruf. Bei nominellem Budget 1400 bedeutet `1484` einen **84-Tokens-Pflichtüberlauf** in dieser synthetischen Situation; `.171` lag bereits bei 37 Tokens darüber. Es handelt sich um den *internen Schätzer/Packlogik*, keine gemessene physische Modellkontextüberschreitung. **Nicht für diesen engen R7-Fix umbauen.** Beim späteren E3-Kontextumbau unter Beibehaltung des Recalls Redundanz zwischen Karte und `relevant` prüfen, Abweichung transparent messen; keine pauschale Budgeterhöhung.

Weitere **P3-/Qualitätsgrenzen:** eine neue Absprache `[Tam]` kann bei späterer Meldung `[pc,Tam]` als separater Thread entstehen (sicherer als falsche Verpflichtung); ein ohne ID/Parteien umformulierter `resolved`-Report zu gebundenem Thread kann nicht zugeordnet werden und bleibt offen; `who`-Teilmenge wird beibehalten, wenn die Engine `pc` bei fehlender persönlicher Begegnung ausgelassen hat. Diese Folgen sind konservative Zuordnungsentscheidungen, nicht neuerlich nachgewiesene falsche Mehrpersonenbindung. Die **freie Modellqualität** beim Liefern passender `thread.who`, Identität, Ankunfts-/Absprachenkontekste ist ungetestet.

## 5. Abschluss, nächste Schritte

**E2-B mit Build `.173` technisch abgeschlossen.** Die zentrale P2-Lücke aus `.172` wurde eng und nachvollziehbar repariert, ohne Featureumfang oder bestehende Autoritätsgrenzen zu verändern. **Keinen ungefragten weiteren E2-B-Zwischenbuild.**

Der nächste geplante fachliche Abschnitt ist **NPC E3 – Persönlichkeitsanker**, im überprüften [Fachplan](NPC_E2_E3_FACHPLAN.md) (§2 R10, §4 E3, §12 C1–C6). Dafür sind die **neuen sozialen Nutzerentscheidungen D2, D3 und D13** noch verbindlich zu treffen: nur tatsächlich gezeigte Persönlichkeit; frühestens aus späterer Begegnung; ob in dieser späteren Begegnung ein einzelner belegter Anker genügt. Empfehlung aus dem Plan zunächst unverändert: alle drei Ja bzw. eine belegte spätere Beobachtung genügt, mit konservativer Stimmungssperre. **Keine E3-Implementierungsfreigabe in diesem Review.** Danach eigenständiger E3-Auftrag und erneut ein Produktdiff-Gegenreview.

Der persönliche **natürliche NPC-Spieltest** bleibt der einzige valide Beleg für freie Modellbefolgung, Spielgefühl, tatsächliche Kontextabrufwirkung und false-positive/negative-Quoten; die technischen geskripteten Tests ersetzen ihn nicht.

Nur Dokumentation auf `main` geändert. Produktbuild `.173` blieb unverändert.
