# .216 · Das Delta-Array einer Extractorantwort verlustfrei übernehmen

Im persönlichen Usertest 14 konnte die Engine die erste Antwort auf eine bereits gebuchte Questannahme vollständig auswerten, sobald das darin enthaltene Array eine Ebene höher stand. Auf dem Originalzug verarbeitet `.216` genau diese Antwort. Dadurch entfallen der automatische Reparaturversuch und beide Anfragen der manuellen Wiederaufnahme. Der Spieler kann nach einem Narrator- und einem Extractoraufruf weiterspielen. [Originalreview](../testrun_10b/user-20261126-010332-215/REVIEW.md) · [Unabhängiger Gegenreview](../testrun_10b/user-20261126-010332-215/CODEX_GEGENREVIEW.md)

| Referenz | Stand |
|---|---|
| Ausgangspunkt | `4.3.0-c.6.6.215` · `9a9545523fe142aec7cced1c1176f4b7baca5222` |
| Getesteter und regulär gepushter Entwicklungskandidat | `4.3.0-c.6.6.216` · `bf44a5fbf439e8b43153f6db8b575048fc1e3e1f` · `experiment/211-openrouter-helper-single-runner` |
| Produktumfang | Ein Leser im V4-Extractor, fünf gezielte Regressionstests und drei Versionsangaben. Bestehende Spielstände benötigen keine Migration. [Produktdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/9a9545523fe142aec7cced1c1176f4b7baca5222...bf44a5fbf439e8b43153f6db8b575048fc1e3e1f) |

## Welche Antwort übernommen wird

Am Anfang von `parseExtraction`, vor Feldnormalisierung, Referenzauflösung und Entfernen unangeforderter Schrittnummern, prüft der Extractor den Antwortumschlag. Fehlt das eigene Root-Feld `deltas` und steht das einzige eindeutig zuordenbare Array direkt als `expected.deltas` darin, setzt er genau dieses Array an den Root und entfernt den Eintrag aus `expected`. Eine leere Liste darf tatsächlich leer sein. Alle anderen Root-Felder, Schrittbelege, Werte und die Reihenfolge der Listeneinträge durchlaufen dieselben nachgelagerten Prüfungen wie bei einer korrekt strukturierten Antwort. Eine fehlende Schrittantwort bleibt unvollständig. [Extractor](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bf44a5fbf439e8b43153f6db8b575048fc1e3e1f/avereth-engine/src/v4/extract.js#L541)

Alle sieben Rohtexte enden nach dem vollständigen Array und der schließenden Klammer von `expected`. Nur die äußerste `}` fehlt. Für die Übernahme liest der neue Pfad den Originaltext als striktes JSON, gegebenenfalls mit genau dieser einen Endklammer. Ein einzelner umschließender Codezaun und ein vorangestellter Denkblock lassen sich abgrenzen. Anführungszeichen, Klammern, Unicode und scheinbare Schlüssel **in einem Beleg** bleiben Bestandteil des Belegs. Abgebrochene Listen, mehrere mögliche Quellen oder eine schon vorhandene Root-Angabe einschließlich `null` liefern keine solche Zuordnung.

Der vorhandene gemeinsame JSON-Leser verwendet letztlich `JSON.parse`. Bei zwei gleichen Membernamen bleibt nur der letzte Wert im Objekt sichtbar. Für die Umhängung prüft deshalb ein auf diesen Umschlag begrenzter Durchlauf die Schlüssel im Quelltext je Objekt, einschließlich JSON-Escapes und innerer Belegfelder. Zwei konkurrierende `deltas`-Felder, doppelte Schlüssel beim Umhängen und weitere direkte Arrays im Schrittobjekt lassen sich so zurückweisen. Gewöhnliche eindeutige Root-Berichte benutzen weiterhin den bestehenden Leser. Schema, Szenenchronologie, Identitäten, Finanzbelege und Welt-Firewall entscheiden anschließend über die Nutzdaten. [Bestehender JSON-Leser](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bf44a5fbf439e8b43153f6db8b575048fc1e3e1f/avereth-engine/src/v4/json.js) · [Regressionen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bf44a5fbf439e8b43153f6db8b575048fc1e3e1f/avereth-engine/tests/v4/extractor216_envelope.test.js)

## Fünf Originalzüge, sieben physische Treffer

M ist der nullbasierte Index im Chat ohne JSONL-Kopf. # zählt physische Requests ab eins. Die Tabelle umfasst ausschließlich X. Beide Produktstände erhielten dieselbe gespeicherte Vorgeschichte und dieselben archivierten Antworttexte. Der lokale Ersatz für den Provider gab nur die nächste tatsächlich protokollierte Antwort zurück. Jede Zeile endet mit angewandter Extraktion und fehlerfreiem Fold.

| Original | X bei .215 | X bei .216 | Input .215 → .216 | Eingesparter Input | Auswirkung der früheren Antwort |
|---|---|---|---:|---:|---|
| User12 M16 | #19, #20 | #19 | 29.738 → 14.652 | 15.086 | Vier identische Deltas. Der geschützte Vergütungsfakt wird in beiden Varianten abgewiesen. |
| User12 M68 | #86, #87 | #86 | 30.893 → 15.282 | 15.611 | Zwei inhaltlich identische Questdetails. |
| User12 M148 | #202, #203 | #202 | 31.738 → 15.700 | 16.038 | Drei identische Vorschläge. Die Firewall weist einen engineeigenen Fakt zurück. |
| User13 M14 | #15, #16 | #15 | 29.876 → 14.725 | 15.151 | #15 meldet dieselben beiden Questdetails wie #16 und zusätzlich den bereits bekannten Beruf der Gildenangestellten. Beide Antworten erzeugen auf demselben Präfix die gleichen fachlichen Events. |
| User14 M14 | #17, #18, #19, #20 | #17 | 61.343 → 15.013 | 46.330 | #17 erfasst Questdetail, Ossen, Garrick und Ossens Vorschlag als Thread. #20 meldete sieben Deltas, darunter einen zurückgewiesenen Vergütungsfakt. |
| **Summe** | **12** | **5** | **183.588 → 75.372** | **108.216** | **Sieben Folgeanfragen entfallen in diesen fünf Abläufen.** |

User14 #17 und #18 sind verschiedene physische Antworten mit identischem Text. Auch #19 besteht isoliert auf demselben Präfix. Seine sieben Deltas entsprechen nach der Umhängung denen von #20. Für alle sieben Treffer ergab der Vergleich mit den manuell korrekt angeordneten Feldern derselben Originaldaten denselben validierten Bericht, vollständig und ohne semantischen Reparaturhinweis. Drei entfallene X-Aufrufe in User14 sind #18 mit 15.585, #19 mit 15.013 und #20 mit 15.732 Inputtokens. Einschließlich N #16 mit 11.147 Inputtokens sinkt dieser Zug von **72.490 auf 26.160**. Der HUD-Klick hat den Auftrag bereits vorher ohne Planner angenommen und genau einen Contract Slip erzeugt.

Die Rechnung benutzt die protokollierten Promptgrößen. Eine Wallclockzeit für einen natürlichen `.216`-Lauf wurde nicht gemessen. Das frühere Auswerten bewahrt die Entscheidung des ersten brauchbaren Berichts. In den drei User12-Zügen und bei User13 sind die fachlichen Events nach Abzug der Extraktionsdiagnostik identisch. Im User14-Zug entstehen aus #17 tatsächlich andere Weltbelege als aus #20. Der weitere Verlauf einer solchen Kampagne ist offen. M26 im historischen User14-Export bleibt `pending`; seine physische Antwort #37 war bereits mit `.215` lesbar. [Originale User12](../testrun_10b/user-20261125-005145-211/SOURCE_MANIFEST.md) · [User13](../testrun_10b/user-20261125-212154-213/SOURCE_MANIFEST.md) · [User14](../testrun_10b/user-20261126-010332-215/SOURCE_MANIFEST.md)

## Was weiterhin eine Reparatur erfordert

Verglichen wurden alle 107 physischen X-Antworten dieser drei Läufe, 81 aus User12, zehn aus User13 und 16 aus User14. User12 Phase A ist im B-Log enthalten. #90 wurde mit dem gespeicherten alternativen Swipe geprüft. Für die inzwischen ersetzten Eingaben vor #69 und #182/#183 wurden Spielertext, Planner- und Narratorantwort aus dem Log auf das jeweilige vorherige Chatpräfix gesetzt. Beide Builds erhielten dieselbe Variante. Von 107 isolierten Antworten waren bei `.215` 90 sofort vollständig, gültig und ohne semantische Einwände, bei `.216` sind es 97. Der anschließende Weltpfad kann einzelne Deltas weiterhin abweisen. Alle 97 anwendbaren Kopien bestanden Fold und Zustandsprüfung.

| Verbleibende Originalantworten | Grund |
|---|---|
| User12 #55, #119, #129, #133 | Unbekannter Deltatyp `object`, fehlende Personenrolle, Objekt statt Subjekt-ID beim Fakt bzw. unvollständiges `object.new`. |
| User12 #76 | Enthält einen konkurrierenden `deltas`-Eintrag mit literalem `[...]`. Beide Builds weisen den Bericht zurück. Jetzt benennt der Reparaturhinweis die konkurrierenden Felder. Dies ist die einzige weitere geänderte Diagnose der Stichprobe. |
| User12 #144, #182, #193 | Schema lesbar, Beleg für tatsächliche Geldübergabe bzw. konkreten Handelspreis unzureichend. |
| User14 #3, #32 | #3 ist im Inneren beschädigtes JSON. #32 fehlt `aware.level`, außerdem ist die Reihenfolge der Szenen nicht ausreichend belegt. #4 und #33 sind weiter erforderlich. |

## Reproduzieren und prüfen

Die mitgelieferte Offline-Abnahme lädt Originale aus der Dokumentationskopie, prüft die sieben physischen Antworten einzeln gegen den kanonischen Bericht und spielt die fünf X-Zyklen im Produktpfad. Sie prüft Anzahl, Tokenkosten, gefalteten Zustand und Invarianten. Sie benötigt Node ab 20 sowie Python 3 mit Standardbibliothek. In zwei getrennten Produktcheckouts sind die Engine-Verzeichnisse an dasselbe Skript auf `main` zu übergeben. [Ausführbare Originalabnahme](abnahme_216_extractor.mjs)

```sh
node recherche/abnahme_216_extractor.mjs /pfad/zur/215/avereth-engine
node recherche/abnahme_216_extractor.mjs /pfad/zur/216/avereth-engine
```

Auf dem Entwicklungskandidaten bestanden **41 gezielte Prüfungen** mit Umschlag, Reparatur, Questannahme, Szenenreihenfolge und Revision, darunter fünf neue Regressionen. Die vollständige Node-Suite bestand mit **3.596/3.596**, ohne Skip. `npm run replay:check` wurde separat auf `.215` und `.216` ausgeführt. Jeweils 2.235 Fälle gegen Referenz `b8d2af4b`, davon 1.193 bereits mit exakt ihrem Ergebnis akzeptiert, null ungeklärte Abweichungen und null nun identische frühere Ausnahmen. Für den historischen Korpus war keine Fingerprintänderung erforderlich. Die abweichenden früheren Weltberichte der neueren Usertests sind oben einzeln ausgewiesen.

In SillyTavern enthält nur `avereth-engine/src/v4/extract.js` neues Laufzeitverhalten. Für eine konsistente Buildanzeige gehören `src/util.js` und `manifest.json` zur Aktualisierung, die Paketversion steht in `package.json`. Der Offlinevergleich hat keinen kostenpflichtigen Provider aufgerufen. Die eigenständige Party-Fachplanung steht zur gemeinsamen Entscheidung. [Fachplanung](AVERETH_PARTY_SYSTEM_FACHPLANUNG.md)
