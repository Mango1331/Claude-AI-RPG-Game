# Unabhängiger Gegenreview – Build .92, Run-16-Fixes

**Produkt:** `4.3.0-c.6.6.92`, Commit [`7a00e8f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7a00e8febaf0e5f1974353985c496d17d2137920), Basis .91 `b55a897`.  
**Originalbeleg:** [Run .91](./REVIEW.md), [Sols Gegenprüfung](./SOL_COUNTERREVIEW.md), [Original-ZIP](./20261025-232041Z-current_test.zip).  
**Gegenreview-Methode:** tatsächlicher Produkt-Diff und betroffene `planner.js`, `scene_handles.js`, `engine.js`, `world.js`, `extract.js`, `agency.js`, neue `tests/v4/patch_run16.test.js`, Fixture und `docs/PATCH_RUN16_TARGET_AND_WORLD.md` statisch geprüft. **Node-/ST-Tests nicht selbst ausgeführt; Testmetriken sind Sols dokumentierte Abnahme.** Keine Produkt- oder Konfigurationsänderung.

## Gesamtentscheidung

**Keine belegte neue P1-Regression; Freigabe für einen neuen natürlichen GLM-Lauf von Build .92.** Die vier fachlichen Fixbereiche sind erkennbar auf die realen Run-91-Fehler begrenzt. Die zusätzlichen Schutzprüfungen sind wichtiger als bloße Promptreparaturen. Der strukturelle Handel aus T23–33 ist nach wie vor offen und gehört zum separat vorbereiteten Händlerpaket.

## 1. T52 – Zielautorität: bestätigt

Die alte `namedPeer()`-Teilzeichensuche identifizierte in „glasswing moth **circling**“ fälschlich das vollständige Handle „Glasswing Moth **C**“ und überschrieb das korrekte Planner-Ziel H. Neu:

- `planner.js:namedPeer`: vollständige Handle-Nennung nur mit alphanumerischen Wortgrenzen; die bewusste einzelne Buchstabenansprache bleibt erhalten.
- `scene_handles.js:attackTargetHere`: eine lebende lokale Person/Kreatur in `scene.present` oder ein noch aktiver Combatant des aktuellen Encounters.
- `planner.js:mapPlan` prüft das schließlich gewählte Ziel nach jeder Peer-Korrektur. `engine.js:playerTurn` prüft bei C-Angriffen nochmals unmittelbar vor mechanischem Kampfstart.

Regressionen enthalten Originalformulierung T52, Variante „hovering“, explizite anwesende bzw. abwesende Buchstabenziele sowie einen direkten Angriff, der den Planner umgeht. **Mechanisch plausibler Doppelzaun; kein Hinweis auf den ursprünglichen falschen Zielwechsel in .92.** Die bestehenden Regeln für ausdrücklich gewählte Ziele und laufende Encounter bleiben maßgeblich.

## 2. T35 – Ort und Szenenidentität: bestätigt

`world.js:placeParent` wird jetzt sowohl bei `resolvePlace` als auch beim *read-only* Vergleich `sceneMatches` angewendet. Die vorherige Abweichung zwischen angegebener Stadt und kanonischem Realm als Elternort einer Wildnis wird dadurch aufgehoben. Der Vergleich erzeugt **keine** Orte und verleiht **keine** Reiseberechtigung; er prüft weiterhin den bereits erreichten Ort. Tests verifizieren ursprüngliche T35-Ankunft, dieselbe eine Ortsidentität, lokale Wesen einschließlich bestehender 12er-Gruppenobergrenze, fremde Elternorte sowie verweigerte Reise.

**Abwägung:** Die nachgelagerte Ortsprüfung bleibt eng, soll aber nie erneut gegen eine unnormalisierte Elternreferenz laufen. Der gemeinsame Helper ist zweckmäßig; keine neue Szenen-Zustandsquelle.

## 3. T58 – Ereignisreihenfolge und Repair: bestätigt, mit begrenzter Erkennung

Der Extractor-Vertrag (`extract-5.10`) fordert explizit: nach einer erzählten Ankunft deren `arrive`-Delta **vor** anschließenden lokalen Person-/Kreaturen-Einführungen einordnen. `parseExtraction` entdeckt ein `person.new`, `creature.new` oder `enter`, das ausdrücklich auf dieselbe Zielreferenz wie eine **spätere** Ankunft verweist. Dies löst die bereits bestehende Reparatur aus, führt jedoch weder selbst eine Ankunft herbei noch sortiert es Deltas eigenmächtig. Vorherige Prüfung fehlender `scene`-Felder bleibt aktiv; `world.js` prüft danach weiterhin Präsenz und Reihenfolge anhand des tatsächlichen Zustands.

Die neuen Tests unterscheiden den formalen Repairfehler vom materiellen Fehler der zu früh eingeführten drei Wyrlings. Sie testen beide Ablehnungen, eine korrekt sortierte Reparatur, verweigerte Ankunft, echte entfernte Sichtungen, mehrfache Ankunft, Replay/Reload/Swipe-Unabhängigkeit und einmalige Buchung.

**Enge Restgrenze, kein festgestellter Defekt:** Der zusätzliche Parser-Check erkennt nur *ausdrücklich gleich dargestellte* Ortsreferenzen; verschieden bezeichnete Alias- oder semantisch gleichwertige Ziele müssen weiterhin vom World-Schutz abgewehrt werden. Der LLM-Repair kann nach wie vor scheitern. Ein Mock-Smoke belegt nicht, dass natürliche GLM-Antworten stets korrekt repariert werden. **Kein Anlass, die sichere World-Firewall zu lockern.**

## 4. T29 – Handlung und anschließende Preisfrage: bestätigt

Der vorherige Agency-Guard las die zusammengezogene „I … head to the Wren … — what's the price …?“-Nachricht als Frage und entfernte den `go`-Befehl. `agency.js:sentences` trennt nun die selbständige Ich-/Wir-Handlung vor einer abgesetzten Frage. Dabei normalisiert `normText` bereits Gedankenstriche auf `-`; der reale Run-91-Text mit `—` bleibt abgedeckt. Vorhandene Guards gegen bloße Fragen, nicht erklärte/bedingte Reisen und Verneinungen bleiben erhalten. Keine Zahlung oder Zimmerbuchung wird aus einer Preisfrage erzeugt.

## 5. Testergebnisse und Beobachtungsgrenzen

Laut implementierter Patchnote: 17 neue Tests, davon auf .91 sieben rot und zehn grüne Kontrollen, auf .92 17/17 grün. Angrenzende Planner/Kampf/World 87/87, Agency 15/15, gemeinsam fokussiert 32/32, volle Node-Suite **1789/1789**.

SillyTavern 1.19 mit Mockprovider im abschließenden Durchlauf **21/21**, fünf Extractor-Aufrufe, vier Storyantworten jeweils genau einmal persistiert, keine PageErrors. **Erster Durchlauf 20/21**, zwei Host-PageErrors (u. a. Parser-/Abort-Meldungen); unveränderte Wiederholung grün. Sol bezeichnet die Ursache ausdrücklich als offen. Das ist **kein belegter Defekt der Run-16-Änderungen**, bei Wiederholung aber erneut zu diagnostizieren statt dauerhaft zu ignorieren.

Diese Zahlen sind **Implementierer-Bericht und überprüfter Repository-Testcode, keine vom Gegenreview selbst ausgeführten Messungen**.

## 6. Nächste Abnahme und Prioritäten

1. **Neuer natürlicher GLM-Lauf mit .92**, neue Kampagne, Testspieler ohne erzwungene Sonderroute. Vor allem T35/T52/T58/T29-ähnliche Situationen und Hostfehlermuster beobachten.
2. **Handel:** T23–33 (fehlender kanonischer Anbieter) weiterhin offen; dies ist durch `patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md` als eigenständiges Fachpaket geplant. Weder Prosa-Angebote noch neue Kataloge als automatisch korrekt ansehen.
3. **Gear:** Der bisherige natürliche Lauf hat trotz 288 Kupfer keinen Kauf→Equip-Nachweis geliefert. Nach der nächsten normalen Lootverwertung beobachten; keine neuen Stats oder Slots erforderlich.
4. **Kein weiteres pauschales Buffing** und keine Änderung der Testspieler-Vorsichtsregeln ohne erneuten konkreten Spielbefund.

**Fazit:** Fachlich enger, gut abgesicherter Reparaturpatch; nach statischer Gegenprüfung **kein neuer Blocker** vor der natürlichen Abnahme. Dies ist keine umfassende formale Beweisführung zur Abwesenheit aller Grenzfälle.
