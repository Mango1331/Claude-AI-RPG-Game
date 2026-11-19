# Unabhängiger Gegenreview · Avereth .203 Performancezyklus 3

**19.11.2026 · GPT-6.** Quellen: [Codex-Fachbericht Zyklus 3](AVERETH_203_PERFORMANCE_ZYKLUS3_2026-11-19.md), [Einzelergebnisse](performance_cycle3_203/results.json), [Testabnahme](performance_cycle3_203/gates.json), [Vergleichstreiber](performance_cycle3_203/compare.mjs), [GLM-Tokenmessung](performance_cycle3_203/measure.py). Vom GitHub-Connector bestätigt: Kandidat `experiment/203-performance-cycle3` **`25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18`**, direkte Basis B3 **`6d9770f9b31e78d37567719bf1c06d8a4942288c`**, damaliger Dokumentations-HEAD auf `main` **`c51d3c8ccabcb2755baea9c8e9bf0eec88d54c1a`**.

## Ergebnis

**GO für den eng begrenzten Zyklus-3-Kandidaten als nächsten B-Experimentstand.** Aus dem geprüften Diff ergibt sich kein Pflichtfix. **Kein allgemeines Geschwindigkeits-, Modellqualitäts-, Gameplay- oder Produktmerge-GO.** Die echte Wirkung auf neue GLM-Ausgaben, insbesondere bei Handel und Ausrüstungszuordnung, bleibt offen.

Die neue Version optimiert die *Darstellung* der Ausrüstungsbasisliste im maschinenlesenden Planner-/Extractor-Katalog. Der Diff gegenüber B3 besteht aus genau **einem Laufzeitpfad `avereth-engine/src/v4/items.js`** (zwei kleine String-Ausdrucksänderungen) und **einem Unit-Testpfad `avereth-engine/tests/v4/patch_run15_gear.test.js`**. Keine neuen Mechaniken, neue Modellrollen oder Änderungen an der Firewall, NPC-Erinnerung, Streamprüfung, Save-Logik und dem Narrator-Katalog.

## Code- und Semantikreview

`gearMarketText(content, false, 'catalog')` gibt für `gearBases(content)` bei exakt identischem `id === name` nur die ID aus; für alle anderen Einträge bleibt das Format `id=name`. Der Prompt erhält die explizite Legende `BASES (ID or ID=name):`. Im vorliegenden Contentbestand sind **46 von 59 Paaren** identisch. Die verbleibenden 13 behalten explizite Zuordnungen wie `hand_axe=hand-axe`.

Der neue Unit-Test rekonstruiert aus der tatsächlichen Promptzeile alle `gearBases`-Einträge in Reihenfolge und vergleicht **die vollständige ID-/Namensliste**, nicht nur eine exemplarische Anzahl. Der bisherige ausführliche Narrator-Text wird durch diese Änderung nicht verkürzt und gibt weiterhin `sword=sword` aus. Kategorien, Qualitätsstufen, Slotangaben und Preisinstruktionen werden nicht verändert.

**Interpretationsgrenze:** Der Test belegt eine technisch eindeutige maschinenlesbare Zuordnung. Ob GLM bei freier Handelsprosa zuverlässig versteht, dass jeder alleinstehende Listeneintrag sowohl ID als auch Name ist, ist ohne neue natürliche Providerantwort noch nicht bewiesen. In der neuen Form bleiben die nackten IDs allerdings sichtbar, und die Engine validiert die weiteren Felder wie bisher. Das rechtfertigt einen begrenzten Experiment-GO statt einer weiteren Sonderregel.

## Messwertprüfung

Die veröffentlichten Ergebnisse listen **54 betroffene physische historische Planner-/Extractor-Prompts** auf, davon 20 Planner und 34 Extractor. Der gepinnte Tokenizer und das GLM-Chattemplate rekonstruierten nach Codex-Angabe zuvor alle **86/86** tatsächlichen Promptlängen. Für die einzelne Katalogänderung wurde in der Ergebnisdatei bei **allen 54** der gleiche Unterschied von **121 Inputtokens** ermittelt:

- Gesamter untersuchter Korpus: **54 × 121 = 6.534 Tokens**.
- Zehn archivierte B-Hauptzüge: **21 × 121 = 2.541 Tokens**, also von **417.581 → 415.040 Inputtokens**.
- Unter der ausdrücklichen Annahme *fixierter alter Modellantworten*: **8.193 Outputtokens unverändert**, **33 physische Requests unverändert**, **425.774 → 423.233 Gesamttokens**, also rund **0,60 % weniger**.

Diese Werte sind eine **retrospektive Prompt-/Replay-Rechnung**. Die Folge von Modellantworten, Reparaturen und Tokenkosten neuer natürlicher Anfragen kann abweichen. Es wurden **null neue Provideranfragen** ausgeführt, daher ist auch kein Sekunden-, Cache- oder Geldvorteil natürlich gemessen. Die mitunter anders verlaufene A-.203-Referenz darf nicht als exakt gepaarte Einsparung umgedeutet werden.

## Unabhängige Qualitätsbewertung

Der Codex-Testtreiber führt die **20 Haupt- und zwölf Zusatzrevisionen** aus den archivierten Chats mit denselben Modellantworten durch B3 und den Kandidaten. Die assert-geprüften Ergebnisse sind 32/32 gleiche gespeicherte Welten, geordnete Ereignisse und volle X-Verarbeitungsreihenfolge. Der Vergleich prüft für die echten Extractor-Anfragen auch, dass das neue Nachrichtenarray nur die ersetzte Marktzeile enthält. Der bestehende synthetische Mischfall kombiniert Kampf, einen bepreisten Buckler, Geschenk und NPC-Zusage einschließlich Reload; kein natürlicher Warenkauf wurde dadurch ersetzt.

**Implementiererabnahme (nicht selbst neu ausgeführt):** 28/28 gezielte Tests, 3.412/3.412 Node, 2.235/2.235 Replay-Fingerprints mit 1.131 bekannten exakt akzeptierten Abweichungen und null neuen, isolierte ST-Smokes `action_finance` 36/36, `user05_review` 108/108 und `narrator_streaming` 59/59, jeweils ohne PageErrors. **Vollständige Standard-/Failsoft-Browser-Sammlung nicht erneut ausgeführt.** Für ein isoliertes Stringkatalog-Experiment ist dies kein eigener Blocker; vor einer Gesamtintegration der Performancebranches sollte die kombinierte vollständige ST-Abnahme wiederholt werden.

Die weiteren untersuchten Ideen wurden fachlich richtig *nicht* integriert: X bei leeren Expected-Schlüsseln zu überspringen verändert alle 17 betroffenen Weltzustände; Plannerantworten allein nach identischem Spielertext zu wiederholen übergeht in zwei von sechs Paaren abweichende Kommandos; Repair-Deltakürzung kann unabhängige Fakten verlieren; dichtere Schemafeldlisten hatten keinen Modellqualitätsnachweis. Für diese Ideen kein erneutes pauschales GO.

## Entscheidung zu weiterer Arbeit

**B4 / Zyklus-3-HEAD als Testkandidat behalten**, ohne neue breite Reparaturheuristiken einzuführen. Beim nächsten zulässigen natürlichen Vergleich zuerst die Fachqualität von *Original-B3 gegen Zyklus-3-Katalog* in drei möglichst gepaarten Handels-/Ausrüstungsszenen betrachten: eindeutige Artikel-ID, Qualität, Preisbindung, tatsächliche Zahlungsfolgen und parallele NPC-Zusage. Abwechselnde Armreihenfolge und gleiche Startwelten, alle Repairs und vollständigen Read-backs mitzählen. Die vorgeschlagene Grenze von 18 physischen Generierungen/0,10 USD ist **nur ein Plan**. Der bisher verifizierte Featherless-Chat-Tarif erlaubt keine automatisierten Benchmarks; hierfür wäre ein berechtigter Zugang samt neuer ausdrücklicher Freigabe nötig.

Bekannte offene Spielfragen User06-Torwache, zu lang anwesender B-Müllerjunge, Todesursache/Fairness sowie längerfristige NPC-/Questqualität bleiben unabhängig davon offen. Die neue Katalogzeile ist weder Ursache noch Lösung dieser Bestandsfälle.

**Reviewumfang:** GitHub-Remote-Branch, Basisvergleich, konkreter Laufzeit- und Unit-Testdiff, Fachbericht, maschinelle Tokenmess- und Replaywerkzeuge und deren veröffentlichte Ergebnisse unabhängig gelesen. Keine eigenständige Node-/ST-Gesamtsuite und keine neue Anbieterinferenz. Kein Produktcode und keine bestehenden Laufdaten verändert. Dieser Bericht ist Dokumentations- und Experimentfreigabe, keine Produktfreigabe.
