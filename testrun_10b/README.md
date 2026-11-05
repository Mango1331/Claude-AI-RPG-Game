# Avereth – Originalruns und Reviews

**Stand: 05.11.2026 · Quellenindex, keine zweite Produkt-/Teststatusliste.** [Aktueller Stand 03](../03_AKTUELLER_PROJEKTSTAND.md) · [Fachquellen 06](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Arbeitsweise 01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md).

10B ist auf .154 als technischer Zwischenstand für persönliche Spieltests teilabgenommen. Aktuell stehen freie persönliche Runs im Vordergrund; weitere Batches nur bei konkretem Erkenntnisbedarf. Ein Runner-`completed` ist nur ein Ende, weder Levelziel noch Integritätsnachweis. Keine gemeinsame Erfolgsquote aus unterschiedlichen Builds, kurzen Toden und langen fortgesetzten Läufen bilden.

## Persönliche User-Spieltests (keine Runner-Batches)

| Run | Umfang / Ende | Maßgebliche Quellen |
|---|---|---|
| **User02 · 05.11.2026 · .157** | 37 Inputs, 34 Enginezüge, 609 Events; Mage L1→L7, Dungeon-Clear/Abgabe/Verkauf, manuell beendet. Unabhängiger Sol-Gegenreview abgeschlossen. | [GPT-Review mit Sol-Nachtrag §8](user-20261105-050449/REVIEW_CHATGPT.md), [16 Feedbackpunkte](user-20261105-050449/USER_FEEDBACK_REVIEW.md), [Mess-/Gegenproben](user-20261105-050449/SOL_PROBE_RESULTS.json), [Originalmanifest](user-20261105-050449/SOURCE_MANIFEST.md). |
| **User01 · 04.11.2026 · .155** | 37 Beiträge, 33 Enginezüge, 635 Events; Mage L1→L7. Offener/manueller Abschluss nach Reise-/Stealthproblem; Ursprung von UI- und Brenna-Befunden. | [Review](user-20261104-162404/REVIEW.md), [Feedback](user-20261104-162404/USER_FEEDBACK_REVIEW.md), [Originalmanifest](user-20261104-162404/SOURCE_MANIFEST.md), [vertiefte NPC-Analyse](../recherche/NPC_KONTINUITAET_ANALYSE_20261104.md). |

Originalchat, Events und Spielerfeedback beider User-Runs sind auf `main` archiviert. Vollständige große Serverlogs liegen im Nutzerupload/separaten User-ZIP, **nicht im Git-Baum**; Hash und Verfügbarkeit beim jeweiligen Manifest prüfen. Unfertige Sol-Notizen in User02 sind als Original erhalten, das abgeschlossene Gegenreview steht in §8. Dessen technische Einzelbefunde und nächste Arbeit nicht hier duplizieren.

## Natürliche Batchläufe

W/M/R = Warrior/Mage/Rogue. L15 und ausdrückliche E-Klassenannahme sind Abdeckungsmeilensteine; regelgerechter Tod ist kein technischer Stopp. Ausführliche Bewertung beim Run, Originalverfügbarkeit im [Archivindex](ARCHIV_BATCHES.md) und im jeweiligen Manifest.

| Batch / Review | Build | Dokumentierter Ausgang W / M / R |
|---|---|---|
| [28 · 20261103-171839Z](batch-20261103-171839Z/REVIEW.md) | .154 | W421/L15/E; M25/L2 Tod; R37/L2 Tod. Neuester Batchgegenreview, langer Warrior mit sicheren Fortsetzungen; lokaler Hessa-/Hemdidentitätsfehler. |
| [27 · 20261103-103117Z](batch-20261103-103117Z/REVIEW.md) | .153 | W356/L18/E; M176/L16/E; R88/L5 Modellstopp. |
| [26 · 20261103-015806Z](batch-20261103-015806Z/REVIEW.md) | .152 | W338/L15/E; M183/L15/E; R131/L10 Tod. |
| [25 · 20261102-154000Z](batch-20261102-154000Z/REVIEW.md) | .151 | W56/L6 Technikstopp; M169/L16 Tod; R309/L15/E. |
| [24 · 20261102-054921Z](batch-20261102-054921Z/REVIEW.md) | .150 | W282/L18/E; M120/L6 Tod; R314/L17 Fetch-/Plannerstopp. |
| [23 · 20261101-232944Z](batch-20261101-232944Z/REVIEW.md) | .149 | W375/L15/E; M40/L2 Modellstopp; R216/L15/E. |
| [22 · 20261101-174704Z](batch-20261101-174704Z/REVIEW.md) | .146 | W32/L2 Tod; M20/L2 Tod; R282/L15/E, danach Windows-Savefehler. [Originalarchiv in acht Teilen](batch-20261101-174704Z/ARCHIVE.md). |

**Batches 1–21:** [vollständige historische Zuordnung mit Datumsordnern, Builds, Endgründen und Folgereviews](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/testrun_10b/README.md#natürliche-batchläufe). Die Reviews und Originalarchive bleiben an ihren bisherigen Orten; keine Löschung oder Neuinterpretation durch diese Indexkürzung.

**Archivgrenzen:** Batches 1–19 sind als verlustfrei neu verpackte Originale archiviert, Batch20 als verlustfrei neu verpackte ZIP, Batch21 als unveränderte ZIP, Batch22 in acht bytegenau zusammensetzbaren Teilen. Für 23–26 war die vollständige ZIP nur als Chatupload geprüft; bei 27/28 sind Originalchats und ausgewählte Completions komprimiert auf Git archiviert, die vollständige ZIP nicht. Exakte Pfade, Hashes und Ergänzungen ausschließlich im [Archivindex](ARCHIV_BATCHES.md) bzw. beim Run. Alte „nicht archiviert“-Sätze können den früheren Prüfzeitpunkt beschreiben; tatsächlichen Dateibaum prüfen.

## Einzelruns

Die ausführliche Tabelle der Einzelruns vom 24.–26.10.2026 wird als [fixierter historischer Index](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/testrun_10b/README.md#einzelruns) erhalten. Dort sind jeder Datumsordner, Build, Abschluss und damals vorhandene ZIP direkt verlinkt. Für aktuelle Aufgaben nur bei einem konkreten Originalfall einlesen; alte .95-/100-Input-Zwischenstände sind keine heutige Testphase.

## Balance und spätere Designs

[Frühe Balancebeobachtungen](BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md) · [Sol-F-/E-Entwurf](ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md) · [GPT-Scalingentwurf](scaling_gpt.md). Historische Zahlen nicht als aktuelle Produktwerte übernehmen; verbindliche Entscheidungen in 02, Implementierung und offene Balancefragen in 03.

## Umgang mit neuen Runs

Originale unverändert bewahren und Verfügbarkeit/Hashes ehrlich angeben. Ein neuer Run erhält seine eigene Review und hier eine kurze Zeile. Je tatsächlich gestartetem Profil Endgrund, technische Stopps, erhebliche fortgesetzte Aussetzer, regulären Tod/Meilenstein und freien manuellen Stopp unterscheiden; Provider-/Windowsursachen separat. Fortsetzbarkeit und Integrität sind getrennte Merkmale.

Narration, Engineevents und tatsächliche Modellrequests gemeinsam prüfen; keine eigene Originalprüfung allein aus fremdem Review behaupten. Node-, Originalfold-, Replay-, Mock-Host- und natürliche Modellnachweise getrennt benennen. Große Logs nicht als Promptkopien in jedem Record ablegen; keine Schlüssel archivieren. Aktuellen Produktstatus ausschließlich in 03 pflegen.
