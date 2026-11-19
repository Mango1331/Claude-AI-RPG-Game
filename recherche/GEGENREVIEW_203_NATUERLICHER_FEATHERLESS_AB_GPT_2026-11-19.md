# Unabhängiger Gegenreview · natürlicher Featherless-A/B-Test Avereth .203

**19.11.2026 · GPT-6 · technischer Quellen- und Evidenzreview.** Grundlage: [natürlicher A/B-Bericht](AVERETH_203_NATUERLICHER_FEATHERLESS_AB_2026-11-19.md), [Kennzahlen](performance_natural_ab_203/kennzahlen.json), [Testtreiber und Proxy](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/6adf43b94b420111094bf906a34d56ea4ca5617f/avereth-engine/tools/st_live/natural_ab) sowie die festgepinnten Runtimebranches A [5e5b827](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5e5b8272412b51b91f75b6e37c5b94d95c9fae11) und B [8df38d3](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8df38d3fe4b62eafc2b746ada81e5f2470956dea).

## Reviewentscheidung

**GO für die im natürlichen Lauf tragfähigen Komponenten S1, B1, den verkürzten Maschinen-Marktkatalog und die lokale Save-Optimierung als bereinigten Experimentkandidaten.** Die verkürzende Anweisung für den ersten Boardentwurf sollte vor einer späteren dauerhaften Übernahme gezielt rückgängig gemacht werden: Das neue GLM lieferte weiterhin alle vier langen Jagdfelder und zeigte in diesem echten Lauf keinen Outputgewinn. **X2 bleibt aus; ursprüngliches ST-Preset bleibt aktiv.** X1 bleibt als Benchmarkwerkzeug erhalten. Kein generelles Performance-GO der vollständigen Suite, keine Zusage kürzerer Zeit bis zum sicher spielbaren Folgezug, kein Produktmerge und kein allgemeines Gameplay-GO.

Diese Empfehlung verlangt einen engen eigenen Bereinigungsschritt mit Tests, keine neue Architektur und keine weitere breit angelegte Optimierungskampagne. Der Nutzer entscheidet, ob und wann die bereinigte Version in die .203-Entwicklung oder später ins Produkt überführt wird.

## Nachgeprüfte Kennzahlen

Aus den maschinenlesbaren Kennzahlen des veröffentlichten Laufs: 10/10 abgeschlossene und gespeicherte Hauptzüge je Arm; 32 bzw. 34 physische Requests; 413.279/8.103 vs. 432.831/8.428 Provider-Input-/Outputtokens; Cache 0/0. In Summe über zehn Züge bis zur sicheren Folgeeingabe A = **628,678 s**, B = **593,150 s** (B **35,528 s kürzer**). Der Median betrug A = **44,786 s**, B = **55,379 s** (B **10,592 s länger**). Das ist keine widerspruchsfreie allgemeine Beschleunigung; verschiedene Lage- und Reparaturausreißer dominieren kleine Stichproben.

Erster tatsächlich lesbarer Satz in den **neun beidseitig messbaren Paaren**: A-Median **18,894 s**, B-Median **9,824 s**. B war in jedem dieser neun Paare früher. Der von B gestreamte erste Satz erschien in sämtlichen zehn B-Narrationen noch vor dem physischen Narratorende. Dies stützt einen **sichtbaren Wahrnehmungsvorteil durch S1**, nicht eine schnellere Gesamtnarration oder den sicher früher freigegebenen nächsten Zug. Im gepufferten Boardfall war der erste lesbare Satz nicht im Viewport messbar.

A-Boardzug bis Folgeeingabe **205,950 s**, B **119,118 s**. Entfernt man ausschließlich diesen Zug für einen gesonderten Sensitivitätsvergleich, gilt: A **422,728 s**, B **474,032 s**, B also **51,304 s länger**. Die gesamten physischen Boardzeiten betragen A **170,55 s bei einem Request**, B **83,14 s bei zwei Requests**, davon **12,47 s** für die natürliche B-Einzelslotantwort. Diese Differenz beweist **keine kausale 87-s-Ersparnis durch den Slotrepair**; Providerstochastik, unterschiedliche Quests, Requestanzahl, zeitliche Reihenfolge und Auslastung sind vermischt. Über alle zehn Narratorrequests war die physische B-Narratorzeit sogar höher (191,56 vs. 167,16 s).

**Zusatz: paarweise Medianbetrachtung.** Die angegebenen **10,592 s längerer B-Median** sind die Differenz der *separaten Gruppenmediane*, **nicht** der Median aller einzelnen A/B-Differenzen. Aus den zehn veröffentlichten `turns[].phaseMs.ready` ergibt sich für die paarweise definierte Differenz B−A der Median **−6,568 s** (B im Median dieser Differenzen schneller); **6/10 Paaren** endeten früher in B, **4/10** später. Ohne den Boardzug beträgt der Median der verbleibenden neun Differenzen **−1,773 s**, obwohl die Summe in B höher ist. Dass beide Medianverfahren verschiedene Vorzeichen ergeben, ist bei diesen asymmetrischen Zügen korrekt und muss transparent ausgewiesen werden. Wegen divergierender Spielwelten und starker Providerstreuung bleibt auch daraus **kein kausaler allgemeiner Performancegewinn** ableitbar.

Der zusätzliche B-Verbrauch von **19.877 Tokens** ist arithmetisch korrekt und umfasst zwei weitere physische Modellgenerierungen. Er darf nicht als behauptete Mehrkosten jedes einzelnen Optimierungsbausteins umgedeutet werden. Den reinen P-/X-Katalogeffekt weist der Bericht mit **78 weniger Eingabetokens je 22 betroffenen B-Aufrufen = 1.716** bei jeweils ansonsten gleichem Prompt nach. Den kleineren Save-Request stützt zusätzlich der kontrollierte technische Vergleich; die natürlichen Save-Mediane von A 167,5 ms und B 142,0 ms sind kein Beweis für eine stabile, große End-to-End-Ersparnis.

## Paketentscheidungen

| Paket | Natürliche Evidenz | Empfehlung |
|---|---|---|
| **S1** | 9/9 beidseitig messbare erste Sätze früher; alle zehn SSE-Antworten regulär verarbeitet, gespeichert und nachgeladen. Vorherige Mock-Gegenfälle decken Teilprosa und Abbrüche. | **Behalten**, natives Streaming ohne Smooth für persönliche Erprobung. |
| **B1** | Ein echter lokal fehlerhafter Intro-Boar durch einen gültigen Einzelslot in 12,47 s ersetzt; vier gültige Originalangebote erhalten; 5/5 Board gültig. Kein natürlicher Vollrepair derselben Eingabe zum Vergleich. | **Behalten**, wegen korrekter gezielter Reparatur, nicht wegen bewiesener Ersparnis von 87 s. |
| **P2-A Maschinenkatalog** | 1.716 nachgemessene Eingabetokens in 22 Requests weniger, Test hatte wenig echten Handel. | **Behalten**, qualitative Handels-/Gear-Gegenfälle weiter relevant. |
| **Save** | 20/20 Save+Read-back+Reload, kleinerer Lookup, geringe natürliche Latenzdifferenz. | **Behalten**. |
| **Kurzer erster Boardentwurf** | GLM schrieb alle optionalen Felder trotzdem; die Anleitung erhöhte die Inputlänge um 42 Token, während die B-Erstantwort mehr Provider-Output als A verbrauchte. Unterschiedliche Texte erlauben keine Attribution. | **Gezielt zurücknehmen**; B1 unangetastet lassen. |
| **X2** | 3 neue Modellantwortpaare, 0 Repairs, aber keine exakt gleichen Welten; 59 weniger Provider-Output gegen 96 mehr Input, also 37 Tokens mehr. Weltabweichungen können auch stochastisch sein; kein eindeutiger Qualitätsfehler durch den Prompt belegt. | **Standard aus**, nicht wegen fehlender Weltidentität allein als strukturell kaputt einstufen. |
| **Card before Lore** | 3 neue natürliche Paare, Cache 0/0, kein konsistenter Latenzvorteil, gleiche Inputlängen. | **Originalpreset beibehalten**; alternatives Preset als unveröffentlichtes Experiment erhalten. |
| **X1/kontextsensitive Module** | X1 ist Prüfinfrastruktur; Modul-Routing und pauschale Budgetkürzung wurden bereits in der Suiteprüfung verworfen. | **Keine Laufzeitintegration/Neuverhandlung**. |

## Welt-/Spielqualität und Grenzen

Die beiderseits gebuchte blaue Notiz und die später wiedererkannte Abmachung mit der jeweiligen Schreiberin sprechen für grundlegende Kurzzeitkontinuität. In A folgt die Szene nach dem doppeldeutigen Wort „quarry“ einem anderen Jagdort; das ist eine echte beobachtete Abweichung, beweist keine nachgewiesene Reparatur durch B. In B bleibt ein Müllerjunge nach der erzählten Weiterreise möglicherweise zu lange in `scene.present`; das könnte dem älteren User06-I18-Torwachenmuster ähneln und gehört in den gezielten Präsenzreview. In den Hauptzügen gab es keinen mechanischen Kampf, keine Questabgabe und kein Loot; die gesonderte natürliche Arcane-Wave-Presetprobe erreichte identische mechanische HP-/MP-/Kampfereignisse.

Die zehn Testzüge verwenden zwei **zunehmend divergierende stochastische Spielbögen**; A kam in allen Zugpaaren zuerst. Für Einzeloptimierungen, Fehlerwahrscheinlichkeiten und Langzeit-NPC-Wissen lässt sich daraus keine verlässliche kausale Schätzung gewinnen. Es wurden keine echten Abbruchströme provoziert; sie bleiben durch den zuvor geprüften S1-Mock-Korpus abgesichert. Die natürlichen Prüfungen unterscheiden formal gültige JSON-Antworten von vollständiger, glaubwürdiger Weltchronologie.

## Eigenständiger Prüfungsumfang

Mit dem GitHub-Connector wurden die Remote-HEADs `main` **11d8b50745a6c87378cf693b43541c8dbaffd40d**, der Testbranch **6adf43b94b420111094bf906a34d56ea4ca5617f**, A **5e5b8272412b51b91f75b6e37c5b94d95c9fae11** und B **8df38d3fe4b62eafc2b746ada81e5f2470956dea** überprüft. Der Testbranch ist genau **einen Commit vor B** und ergänzt ausschließlich zwölf Test-/Auswertungsdateien, keinen Produktionslaufzeitcode. Die ursprüngliche Codex-Auswertung, die maschinenlesbaren Kennzahlen, die Requeststeuerung (`proxy.py`), den Zugtreiber (`play.mjs`), die Parser-Auditlogik und den Aggregator habe ich unabhängig gelesen und die berichteten zentralen Summen überprüft.

Die gesamte komprimierte Sammlung der 54 Laufdateien wurde in diesem Review **nicht** unabhängig entpackt; die Wiederholbarkeit dieses Archivs ist eine Implementiererangabe. Keine neue Providerinferenz und keine zweite vollständige Node-/Replay-/ST-Suite wurden ausgeführt.

## Nächste Entscheidung

**Einmalige schlanke Abschlussbereinigung:** Auf einem neuen, von Suite B abgeleiteten Experimentbranch nur den kompakten **ersten** Boardentwurf zurücknehmen, nicht B1 oder S1; X2 standardmäßig ausgeschaltet lassen; Originalpreset nutzen. Gezielte Board-/ST-Regressionen, vollständige Node-Suite und Replay-Fingerprints prüfen. Diesen „Lean“-Kandidaten als nächste menschliche Spieltestversion vorschlagen. Erst nach dessen unabhängiger Diffprüfung über Merge in die .203-Entwicklungsbasis und langfristig in den Produktbranch entscheiden.

Der vollständige User06-Gegenreview zur Torwache und Tod/Fairness bleibt ein separates Gameplaythema; ein belegter Bestandsfehler soll nicht still als Fehler der Performance-Suite gezählt werden.
