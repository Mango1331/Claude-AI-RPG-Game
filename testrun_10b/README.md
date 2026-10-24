# Avereth Engine – Testrun-Sammlung vor Patch 10B

Hier sammeln wir **unveränderte Originalexporte** der freien ST-Livetests und **unabhängige, ausführliche Reviews**, bevor wir aus Einzelbeobachtungen Balancing- oder Designänderungen ableiten.

## Ablageschema

    testrun_10b/
      README.md
      20261024-030002Z-current_test/
        REVIEW.md
        README.md
        20261024-030002Z-current_test.zip   ← Originalexport, unverändert

Für **jeden** neuen Test eine neue Untermappe mit seiner **tatsächlichen Run-ID** (nicht nach Patchnamen überschreiben). Innerhalb der Mappe: kompletter Originalexport als ZIP, detailliertes Review mit genauen Turn-/Event-Referenzen, Maßnahmen- und Evidenzmatrix. Gegebenenfalls separate ergänzende Analysen im selben Ordner. ZIP nicht entpackt zusätzlich in Git committen: das würde Daten verdoppeln.

**Keine Engine-Änderungen, keine unverbindlichen Zahlenanpassungen** in dieser Sammlung. Die Probleme zunächst als bestätigt / plausibel / offen / Entwurfsfrage einstufen. Prioritäten sind Vorschläge, keine bereits verabschiedeten Patchfreigaben. Bei jedem Lauf Build, Commit-SHA, Guide, Seed, Modell, Dauer, Abschlussgrund, Quests und bekannte Einschränkungen festhalten. Aufgetretene Unterschiede zwischen Buildständen ausdrücklich dokumentieren.

## Verzeichnis

| Run-ID | Ergebnis | Umfang | Review | Original-ZIP |
|---|---|---|---|---|
| [20261024-030002Z-current_test](20261024-030002Z-current_test/) | defeat: Mage Lv1 durch fünf Banditen, Engine-Integrität OK | 26/100 Züge | [REVIEW](20261024-030002Z-current_test/REVIEW.md) | **Entpackte, datensparsam bereinigte Testdaten auf GitHub** ([Dateiliste](20261024-030002Z-current_test/ARCHIVE_CONTENTS.md)); unveränderte Original-ZIP separat aufbewahrt |

## Ablauf für weitere Tests

1. Unveränderte vom Runner gelieferte ZIP inklusive Runmetadaten sichern; SHA-256 erfassen.
2. Originalevents und Chat gegen die automatisch erzeugte Evaluation prüfen; keine Mechanik nur aus Narrator-Prosa ableiten.
3. Review mit belegter Zeitleiste, positiven Nachweisen, Fehlerursachen, Prioritäten, Reproduktionsfällen und Grenzen erstellen.
4. Review und Original-ZIP in **derselben** neuen Untermappe auf main ablegen und obige Tabelle ergänzen.
5. Erst nach mehreren Runs über gemeinsame Ursachen, Designfreigaben und Patch 10B entscheiden.

**Hinweis zu Archiv-Datenschutz:** Runner-Exporte können absolute lokale Verzeichnispfade und technische Modellendpunkte enthalten. Geheimnis-Scan des Runners ersetzt keine allgemeine Prüfung, ob ein privates Profil oder reale personenbezogene Daten im öffentlich zugänglichen Repository liegen.
