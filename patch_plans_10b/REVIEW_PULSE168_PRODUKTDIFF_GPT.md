# GPT-Kontrollreview: Build .168 – PULSE-B-Ausschlüsse (08.11.2026)

**Urteil: FREIGABE für den späteren natürlichen User-Test.** Der P2-Kontrollflussfehler aus dem [unabhängigen .167-Review](REVIEW_PULSE167_PRODUKTDIFF_GPT.md#3-p2--bestehende-pulse-ausschlüsse-innerhalb-von-living-dungeons-werden-übersprungen) ist mit .168 im tatsächlichen Produktcode korrigiert, ohne eine neue kritische Diff-Lücke. Damit sind **PULSE A + C + B technisch implementiert und in ihrem engeren Integrationsumfang gegengeprüft**; die natürliche Modell-/Spielgefühlvalidierung und **Paket D (Parameterentscheidungen) bleiben bewusst ausstehend**.

**Quellen und Version:** Produktbasis [`.167` / `58c29fa`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8) → Produkt-HEAD [`.168` / `8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980). GitHub-Compare: **3 Commits vorwärts, 0 zurück**, Mergebase exakt .167. [`14ee4f6`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/14ee4f64ba3b6a060c61111fc7c191cdd8fce430) Funktionskorrektur, [`09af18f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/09af18f177129ac45dbc72a1217a27ca2d65bb95) Tests, [`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980) Build/Patchnote.

## 1. Eigene Code- und Diffprüfung

**Funktionaler Produktdiff nur `src/v4/pulse.js::pulseBegin()`, drei hinzugefügte/zweite entfernte Zeilen.** Statt `else if` nach `insideDungeon()` werden `learning` und `repeat` jetzt **nach** der Kampf-/Dungeonentscheidung jeweils nur bei `!P.reason` geprüft. Dies löst genau das .167-Problem:

- `encounter`/`pending_combat` setzen zuerst `reason:'combat'`; zusätzliche statische Prüfungen überschreiben den Grund nicht.
- Living Dungeon bestimmt `P.dungeon=root`, `P.governs=false` und zunächst keinen Ausschlussgrund. Anschließend werden `learning` bzw. die direkt identische Folgeeingabe korrekt als `reason:'learning'` / `reason:'repeat'` eingetragen; `settle()` führt dann **keinen** `pulse.rolled`-Wurf durch, verändert die Fehlwurfserie nicht und erzeugt keinen Wander-Claim.
- Ein echter Dungeon **ohne** Living-Datensatz setzt weiterhin `reason:'dungeon'`, `governs:false`; das ist der frühere vollständige Dungeon-Ausschluss.
- Zwei **unterschiedliche** gültige normale Dungeonaktionen bleiben berechtigt; DUNGEON AHEAD hat weiter den dynamischen Ausschluss. `living.js`, `commands.js`, `world.js`, `rules.json`, Slot-/Rast-/Zeitschutz-/Pacingregeln wurden in .168 **nicht** verändert.

Die alte B-Testkorrektur ist legitim: Ein direkter `pulseBegin`-Test nutzte einen Setupzustand mit unmittelbar identischen bisherigen Kampfeingaben; das Setzen eines **abweichenden** letzten Inputs verhindert den neuen Repeat-Ausschluss, sodass der Test weiterhin die *Dungeon-Rahmenerkennung* und nicht eine technische Wiederholung prüft. Die neue Regression `tests/v4/pulse_b168.test.js` prüft gerade die andere Seite mit zwei tatsächlich gleichen Eingaben.

## 2. Prüfbelege und Grenzen

Die drei neuen, im Git-Diff gelesenen Node-Testfälle behandeln:
1. Identische aufeinanderfolgende `other`-Erkundung in einer echten Ruleset-2-Living-Dungeon-Szene nach einem ersten Ereigniswurf: **`reason:'repeat'`, kein `pulse.rolled`, kein `dungeon.ahead`, Fehlwurfserie und `recent` unverändert, Chat-Fold identisch**.
2. Ein vom Planner gültig aufgelöstes `study mage.flame_lance` (60 min): **`reason:'learning'`, kein Wurf und keine Wanderreservierung**; das Lernen selbst bleibt eine gültige Handlung.
3. Positivkontrollen: verschiedene Eingaben würfeln, offenes `danger` reserviert einen freien Minionslot; `encounter`, `pending_combat`, DUNGEON AHEAD und Dungeon ohne Living-Datensatz weiterhin wie spezifiziert.

**Unabhängiger Replaydatei-Abgleich:** Die vollständige Akzeptanzdatei `tests/replay/accepted_pulse167_vs_126.json` hat in .167 und .168 dieselbe **Git-Blob-SHA `29147028e9931f08c296420e169158eff5af6d36`** und weiterhin **1040 akzeptierte Einträge**. Kein stilles Umklassifizieren / keine Änderung der Acceptance-Basis. Dies ist **kein eigener Runtime-Replaylauf**.

**Implementiererabnahme laut Claude**, nicht durch GPT neu ausgeführt: `.167` **2/3 Regressionen rot**, `.168` **3/3 grün**; angrenzende PULSE **75/75**, Living Dungeons **107/107**; vollständige Suite **2914/2914**, Replay **2235 Fälle / 1040 akzeptiert / 0 offen/veraltet**; echter ST1.19-Host **116/116 Standard**, **121/121 Failsoft**, beide **0 PageErrors**. Die bisherigen B-Smokes blieben grün; *die neuen Repeat-/Learning-Fälle sind in Node durch den echten Spielerzug-/Extractorpfad geprüft, aber nicht als eigenständige ST-Hostfälle neu geskriptet*. Der Provider ist geskriptet; keine Aussage über freie Modellbefolgung.

**Prüfmethode und Aussagegrenze:** Der GPT-Review hat die tatsächlichen Commit-Patches, Endcode, Node-Regressionen und beide Git-Replay-Akzeptanzblobs unabhängig gelesen/abgeglichen. **Keine neuen Node-, ST-, Replay- oder freien Modelltests von GPT selbst**; Produktcode im Review unverändert.

## 3. Abschluss und offene Beobachtungen

**Kein weiterer verpflichtender technischer Hotfix aus diesem .168-Diff.** Paket A (Basis-Welt/Reise), Paket C (Rast/Warten, Nachfixes .165/.166) und Paket B (Dungeon inklusive Rast, Nachfix .168) bilden jetzt den gemeinsam integrierten technischen PULSE-Stand.

Bereits bekannte, aktuell nicht blockierende **Beobachtungspunkte**: tatsächliche Erzählumsetzung offener Fenster durch freie Modelle, Kontext-/Budgetfolgen, Ereignishäufigkeit und mögliche Häufung, die heuristische Unterkunftserkennung, gemischte Vertragsziel-Erzählerprojektion und die Konsistenz der Extractor-`expected[seq].minutes` bei gemischten Handlungen. Diese Punkte sind **kein Auftrag für spontane weitere Implementierungs-/Planungsrunden**.

**Nächster sinnvoller Schritt:** Wenn der Nutzer wieder testen möchte, ein **natürlicher, nicht auf PULSE hin manipulierter User-Run** auf dem aktuellen Produktbuild mit JSONL/Events/ST-Log und spontanem Spielgefühlfeedback. Erst dessen Beobachtungen begründen Paket D (Parameter/Erzählgewicht). Solange kein Test gewünscht ist, optional unabhängige **NPC-Kontinuitätsanalyse E2/E3** nach gesondertem Auftrag; nicht PULSE D vorziehen.

**Git-Stand bei der Prüfung:** Produkt `.168` / `8c7ee1f`, `main` separat für Reviews und Arbeitsstand. Keine Änderungen am Produktbranch.
