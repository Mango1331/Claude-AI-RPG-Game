# Avereth Engine – Testrun-Sammlung vor Patch 10B

**Übergeordneter 10B-Plan und die ausführlichen Monster-/Chase-Reviews:** [`06_PATCH10B_MASTERPLAN_UND_REVIEWS.md`](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Diese Testarchiv-README führt nur Original-Runs und deren Reviews, nicht die gesamte 10B-Architekturdebatte.

Hier sammeln wir **unveränderte Original-ZIP-Exporte** aus den SillyTavern-Livetests und die dazugehörigen **ausführlichen, unabhängigen Reviews**. Zuerst mehrere Runs beobachten, danach wiederkehrende Fehler und Gameplay-Probleme bewerten. Diese Sammlung ist **kein Implementierungsauftrag**.

## Ordnerstruktur

```text
testrun_10b/
├── README.md                         ← zentraler Index und Arbeitsweise
└── 20261024-030002Z-current_test/     ← ein Unterordner je echter Run-ID
    ├── REVIEW.md                     ← ausführliche Auswertung
    └── 20261024-030002Z-current_test.zip  ← unveränderter Originalexport
```

**Verbindlicher Ablauf:** Pro Test **genau ein Unterordner** mit der unveränderten, **nicht entpackten Original-ZIP** und `REVIEW.md`. Kein doppeltes Ablagen entpackter Dateien, keine separate README je Test erforderlich. Zusätzliche gezielte Dateien nur, wenn für einen konkreten Run sachlich notwendig.

Der Nutzer lädt den Originalexport als ZIP in den betreffenden Unterordner auf `main` hoch. ChatGPT prüft den ZIP-Inhalt, erstellt den ausführlichen Review und aktualisiert dieses zentrale Verzeichnis. Jede ZIP behält ihren vom Runner ausgegebenen Originalnamen. Bei mehreren Testläufen niemals vorhandene Exporte oder Reviews überschreiben.

## Testverzeichnis

| Run-ID | Build / Spieltest | Ergebnis | Review | Original-ZIP |
|---|---|---|---|---|
| [20261024-030002Z-current_test](20261024-030002Z-current_test/) | .57, Mage Level 1, GLM-5.3-Flash, ohne Fixture | 26/100 Züge; Charaktertod gegen fünf Banditen; Engine-Integrität OK | [REVIEW.md](20261024-030002Z-current_test/REVIEW.md) | [20261024-030002Z-current_test.zip](20261024-030002Z-current_test/20261024-030002Z-current_test.zip) |
| [20261024-033325Z-current_test](20261024-033325Z-current_test/) | .57, Mage Level 1, GLM-5.3-Flash, ohne Fixture | 25/100 Züge; Narrator-Antwort leer nach 8.192 Reasoning-Tokens; Engine-Integrität OK; kein Kampf | [REVIEW.md](20261024-033325Z-current_test/REVIEW.md) | [20261024-033325Z-current_test.zip](20261024-033325Z-current_test/20261024-033325Z-current_test.zip) – SHA-256 und Git-Blob verifiziert |
| [20261024-041150Z-current_test](20261024-041150Z-current_test/) | .57, Mage Level 1, GLM-5.3-Flash, ohne Fixture | **21/100** Spielerinputs (20 abgewickelte Züge), **Planner-Ausfall** nach zwei leeren Length-Antworten; Delivery-Quest-Übergabeschleife; 40 cp/23 XP einmalig gebucht | [REVIEW.md](20261024-041150Z-current_test/REVIEW.md) | [20261024-041150Z-current_test.zip](20261024-041150Z-current_test/20261024-041150Z-current_test.zip) – auf `main` vorhanden, 3.652.300 Bytes; GitHub-Blob `42b8d4b114d15415257dfe587e874e7ab89941e4` |
| [20261024-044642Z-current_test](20261024-044642Z-current_test/) | **.57, vor 10B-1**, Mage Level 1→2, GLM-5.3-Flash, ohne Fixture | **61/100** Spielerinputs, 60 Story-/Engineantworten, **58 verbuchte Engine-Turns**; **3 abgeschlossene Gildenquests, 3/3 Kämpfe**, Ende **narrator_empty** (8.192 Tokens nur Reasoning); offizielle Phantom-Boardangebote, Testspieler-Langzeitgedächtnis und GO→GIVE/Extractor-Drift | [REVIEW.md](20261024-044642Z-current_test/REVIEW.md) | **Original-ZIP für GitHub-Upload noch offen**: `20261024-044642Z-current_test.zip`, 10.186.984 Bytes, SHA-256 `f1ad027ce2722b79e97e4c3978d9252c123abfd7ec47259b41482194a4903b07`; hier im Chat hochgeladen, **nicht als auf main vorhanden bestätigt** |

| [20261024-093931Z-current_test](20261024-093931Z-current_test/) | **.65**, Mage L1, GLM-5.3-Flash, ohne Fixture | **3/100** Spielerinputs; Planner/Narrator/Extractor lieferten gültige API-Antworten; Extractor-Response nach **12,7 s**, aber `extraction.status=pending` blieb **900 s** unverändert; Ende **`extractor_timeout`**; erster Storyzug ohne World-Commit. **P0 Host-/JS-Abschlusspfad vor weiterem Langlauf prüfen** | [REVIEW.md](20261024-093931Z-current_test/REVIEW.md) | **Original-ZIP im Chat hochgeladen, noch NICHT auf `main`**. SHA-256 `6c8536ee49d1484c15949a92a39b77c3eea58b1d22f4b802f87c5e8327064242`, 548.172 Bytes |
| [20261024-104654Z-current_test](20261024-104654Z-current_test/) | **.66**, Mage L1, echter GLM-5.3-Flash, ohne Fixture; lokaler Dev-SHA `01636f32c46e` | **35/100** echte Inputs, **regulärer Tod** gegen 3 Skeletons Lv4/3/2 in Old Crown; zuvor 4/4 Hounds, Guild-Payout 80 cp +30 Quest-XP, Rast; **32/32 `extract.applied`**, kein Host-/Provider-Abbruch | [REVIEW.md](20261024-104654Z-current_test/REVIEW.md) | **Original-ZIP nur im Chat, Git-Binärupload offen.** 5.424.566 Bytes; SHA-256 `14b6570481917b575c035e361b59ef533d44a8917737513e19365ea6a0917de0` |

**Run 4 – Archivstatus 24.10.2026:** Die unveränderte Original-ZIP wurde in diesem Chat byteweise geprüft (10.186.984 Bytes; SHA-256 `f1ad027ce2722b79e97e4c3978d9252c123abfd7ec47259b41482194a4903b07`, Git-Blob-SHA1 `c848c5fe1437590733e929a82f8908893b0def69`; ZIP-CRC-Test OK). Der ausführliche Review wurde auf `main` geschrieben. **Der Binärupload auf GitHub steht separat aus**; bis dahin keine ZIP-Dateiverknüpfung zum nicht vorhandenen GitHub-Pfad vortäuschen. Beim späteren Upload Dateigröße/Hash vergleichen. Der Test lief ausdrücklich auf `.57`, nicht auf 10B-1 `.58`.

**Archivstatus für Test 3 (GitHub am 24.10.2026 geprüft):** `REVIEW.md` und die 3.652.300 Bytes große ZIP liegen auf `main`; GitHub-Blob-SHA `42b8d4b114d15415257dfe587e874e7ab89941e4`. Der ursprüngliche Chat-Export wurde zuvor mit SHA-256 `09e8f7a172921442fd4939dbdf806fb15b326e78230959d439bd2ca7a099979b` erfasst. **Der SHA-256 der jetzt auf GitHub liegenden Binärdatei wurde hier nicht erneut unabhängig berechnet; die gleiche Dateigröße allein beweist keine Byteidentität.**

**Integritätsnachweis für Test 2:** 4.271.133 Bytes, SHA-256 `638d939bee989e32c1d4bbf92a648eaefc81af7fc463e550b377da92fbe85f90`, GitHub-Blob `e9f7bc7fd216c34b985eca4656e8d4a1fdd6a11e`; stimmt mit dem unveränderten ZIP-Original bytegenau überein (lokaler Git-Blob-SHA1 identisch; 24.10.2026).

**Integritätsnachweis für Test 1:** 4.393.062 Bytes, SHA-256 `10e86d8d77ea967918fb13cff8c1054ae1baccc6e77692bd1b83468da12b461c`. Der GitHub-Blob-SHA `e51a0ae040eedd7397ff13a64bc5fb1876b5abbb` stimmt mit dem Git-Blob der ursprünglichen hochgeladenen ZIP bytegenau überein (geprüft am 24.10.2026).
| [20261024-120700Z-current_test](20261024-120700Z-current_test/) | **.67**, Mage L1→2, GLM-5.3-Flash, offen, ohne Fixture | **100/100** Inputs regulär `done`; 95/95 `extract.applied`, 4 Wolf-Siege, 1 Guild-Cull-Abschluss, Delivery trotz realer Übergabe wegen Cargo-Matching nie gebucht; private Arbeitsangebote ziehen fälschlich Geld ab; Phantom-Listings | [REVIEW.md](20261024-120700Z-current_test/REVIEW.md) | **Original-ZIP noch nicht auf GitHub hochgeladen:** 15.725.734 Bytes, SHA-256 `2d2b0c47e4782e3b3e2002c03bbd78abc5aae46e6c8b6d09ce6922ae21bd7ef4` |
| [20261024-142854Z-current_test](20261024-142854Z-current_test/) | **.68**, Mage L1→3, freier GLM-5.3-Flash | **75/100** Inputs, `planner_failed` wegen `take→attempt` mit vorher nicht gehaltenem Tool; vorher 61/61 `extract.applied`, echte Lieferung/Belohnung, Dreiergegner-Sieg und Rare Passive. Phantom-Dungeon-Gegner erzeugt erfolglose Kampfversuche | [REVIEW.md](20261024-142854Z-current_test/REVIEW.md) | **Original-ZIP im Chat, Git-Binärarchivierung offen**: 10.499.227 Bytes, SHA-256 `d937b1e1cc867836781c3de96e468e30e415c073bb742c402f97e78e7d70f5bc` |
| [20261024-202508Z-current_test](20261024-202508Z-current_test/) | **.71**, Mage L1, GLM-5.3-Flash, frei/ohne Fixture | **30/100**, regulärer Tod gegen 3 Goblins Lv5/4/2 (SHORT); zuvor GO-/Floor-0-/Phantomgruppen-Blockade und 13 erfolglose Angriffsinputs trotz erzählter Goblins; 15/15 Story-Extraktionen, 0 Page-/Providererrors, 0 XP | [REVIEW.md](20261024-202508Z-current_test/REVIEW.md) | Original-ZIP **im Chat geprüft, Git-Binärupload offen**, 3.238.481 Bytes, SHA-256 `d55ef09d273f6b5e9949bf880a3134e245bcc1500081ce3608617a6c3d54a6cd` |

## Arbeitsweise für weitere Tests

1. **Test starten:** `current_test` offen spielen lassen; keine erzwungene Questabfolge und keine gezielten Engine-Reparaturen während des Laufs.
2. **Original sichern:** Vom Runner erzeugte ZIP unverändert aufbewahren. Git-Unterordner exakt nach der Run-ID benennen; ZIP dort unverändert hochladen.
3. **Prüfen:** Metadaten und Spielchat mit den tatsächlichen Engine-Events und dem Runner-Bericht abgleichen; keine Mechanik nur aus Narrator-Prosa ableiten.
4. **Review anlegen:** `REVIEW.md` im selben Testordner. Enthält Testbedingungen, Verlauf, positive Nachweise, Fehlerursachen, exakte Turn-/Event-Belege, priorisierte Verbesserungsvorschläge, Risiken der Alternativen sowie Regressionsempfehlungen.
5. **Index pflegen:** Diese zentrale README um eine Zeile je neuem Run ergänzen. Zwischen Läufen geänderte Engine-SHAs und sonstige Testbedingungen transparent festhalten.
6. **Erst danach entscheiden:** Wiederholte Probleme und Gegenbeispiele aus mehreren Runs vergleichen. P0/P1/P2 sind Analyseprioritäten, **keine automatische Freigabe zur Implementierung**.

## Grenzen und Sicherheit

Die Reviews unterscheiden zwischen **bestätigten mechanischen Fehlern**, **plausiblen Hypothesen**, **offenen Fragen** und **Design-/Balancingoptionen**. Ein Charaktertod beweist nicht automatisch eine schwache Klasse; Erzählabweichungen beweisen nicht automatisch fehlerhafte HP-/XP-Buchungen.

Es werden **keine Engine-, Balancing- oder Runneränderungen** allein durch die Archivierung vorgenommen. ZIP-Exporte können Logs und lokale Dateipfade enthalten. Das Repository ist öffentlich; echte Zugangsdaten, insbesondere API-Keys, dürfen nicht eingecheckt werden. Der Nutzer hat für diesen Export bestätigt, dass der API-Key nur lokal in PowerShell gesetzt wird und nicht im ZIP enthalten ist.
