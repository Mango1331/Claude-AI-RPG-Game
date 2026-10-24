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
| [20261024-041150Z-current_test](20261024-041150Z-current_test/) | .57, Mage Level 1, GLM-5.3-Flash, ohne Fixture | **21/100** Spielerinputs (20 abgewickelte Züge), **Planner-Ausfall** nach zwei leeren Length-Antworten; Delivery-Quest-Übergabeschleife; 40 cp/23 XP einmalig gebucht | [REVIEW.md](20261024-041150Z-current_test/REVIEW.md) | **Original-ZIP noch nicht auf main:** `20261024-041150Z-current_test.zip` bitte unverändert hochladen (3.652.300 Bytes; SHA-256 `09e8f7a172921442fd4939dbdf806fb15b326e78230959d439bd2ca7a099979b`) |

**Integritätsnachweis für Test 3 (Originalexport im Chat):** 3.652.300 Bytes, SHA-256 `09e8f7a172921442fd4939dbdf806fb15b326e78230959d439bd2ca7a099979b`. `REVIEW.md` liegt auf main, die Binärdatei selbst wird wie bei den vorherigen Runs separat vom Nutzer via GitHub in den Testordner hochgeladen. **Keinen vollständigen ZIP-Archivstatus behaupten, bevor die Datei dort wirklich existiert.**

**Integritätsnachweis für Test 2:** 4.271.133 Bytes, SHA-256 `638d939bee989e32c1d4bbf92a648eaefc81af7fc463e550b377da92fbe85f90`, GitHub-Blob `e9f7bc7fd216c34b985eca4656e8d4a1fdd6a11e`; stimmt mit dem unveränderten ZIP-Original bytegenau überein (lokaler Git-Blob-SHA1 identisch; 24.10.2026).

**Integritätsnachweis für Test 1:** 4.393.062 Bytes, SHA-256 `10e86d8d77ea967918fb13cff8c1054ae1baccc6e77692bd1b83468da12b461c`. Der GitHub-Blob-SHA `e51a0ae040eedd7397ff13a64bc5fb1876b5abbb` stimmt mit dem Git-Blob der ursprünglichen hochgeladenen ZIP bytegenau überein (geprüft am 24.10.2026).

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
