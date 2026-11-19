# User06 .203 – vorläufige Performance- und UI-Auswertung

**Datum:** 19.11.2026 · **Stand:** Avereth 4.3.0-c.6.6.203 / `5e5b827` · **Quellen:** vier im [Manifest](README.md) archivierte Originaldateien. **Keine** vollständige Gameplay-/Balancereview, keine eigenständigen Provideraufrufe und **keine** gemessene Zeit bis zur bestätigten nächsten Sendefreigabe.

## 1. Reale Modellrequests

| Rolle | Requestanfänge | Antwort + Usage | Eingabetokens der Antworten | Ausgabetokens |
|---|---:|---:|---:|---:|
| Planner | 7 | 6 | 75.691 | 349 |
| Narrator | 11 | 10 | 121.796 | 4.160 |
| Extractor inkl. zwei Reparaturen | 12 | 12 | 172.291 | 3.702 |
| Board inkl. vollständiger Reparatur | 2 | 2 | 6.548 | 2.183 |
| **Summe** | **32** | **30** | **376.326** | **10.394** |

**Alle 32 Requests hatten `stream:false`.** Alle **30** beantworteten Requests meldeten **0 Cachetokens**. Ein begonnener Plannerrequest hat im Logger keinen Abschluss, unmittelbar danach wird ein inhaltlich identischer Plannerrequest beantwortet; am Ende ist auch ein Narratorrequest ohne geloggten Antwortblock. Diese zwei Protokolllücken sind keine bestätigten Providerfehler. Im ST-Chat ist die letzte zusätzliche Narration nach dem letzten Spielerinput vorhanden. Die zehn eigentlichen Spielereingaben folgen auf zwei Charaktererstellungseingaben; elf Narratorbeiträge sind im Chat gespeichert.

Die direkte Questannahme und drei HUD-Kampfangriffe sind ohne Planner-Modellaufruf gebucht (N+X). Der übrige Freitext nutzt den Planner. Das bestätigt die physischen `.203`-Schnellwege auch im natürlichen Lauf.

## 2. Zeitprofile

| Betrachtung | Reale Beobachtung | Geltungsbereich |
|---|---|---|
| SillyTavern `gen_started` → `gen_finished` | **11** Narratorbeiträge; Median **26,864 s**, Spanne **19,072–143,266 s** | Umfasst teilweise Planner/Board, aber keinen nachgelagerten Extractor oder bestätigten Save. |
| Engine-Narratorzeit | **11** Beiträge; Median **22,890 s**, Spanne **19,044–62,434 s** | Separates `extra.avereth.narration.ms`, nicht automatisch die Zeit zum ersten sichtbaren Satz. |
| Extractorjob | **11** Jobs; Median **20,611 s**, Spanne **4,146–127,421 s** | Einschließlich nötiger Repairs. |
| Paarweise ST-Gen-Zeit + jeweiliger X-Job | **11** Paare; Median **60,754 s**, Spanne **25,529–163,711 s** | Nur technische Orientierung, **keine** Messung von gespeichertem/frei sendbarem Folgeturn. |

**Questboard (Spielzug 6):** Planner **3,568 s**, zwei Boardanfragen **55,691 + 58,600 = 114,291 s**, Narrator **25,191 s**. Die ST-Generierungsuhr zeigt **143,266 s**, danach Extractor **4,976 s**. Das ist ein neuer natürlicher `.203`-Fall für die isolierte Boardslot-Reparatur (B1). **Keine** behauptete Einsparung durch die bisher nur offline untersuchte Ersatzslot-Variante.

**Dungeonbetreten (Spielzug 9):** Planner **4,397 s**, Narrator **31,689 s**, Extractorjob **127,421 s**, darunter zwei X-Anfragen von **85,961** und **41,460 s**. Zwei vorgeschlagene Deltas wurden wegen `scene_context` abgewiesen; die Engine erstellte die beiden Goblin-Lookouts über ihren vorgesehenen Dungeon-Slot. Ursache der Reparaturanfrage separat prüfen; die zurückgewiesenen Deltas nicht automatisch als eigentliche Ursache ausgeben.

**Weitere X-Ausreißer:** Nach dem ersten Arcane-Wave-Angriff **55,786 s**, ohne Repair; nach der Guild-Registrierung **39,752 s**, ohne Repair. Die direkte Questannahme benötigte **25,306 s** Extractorjob mit Repair. Der Extractor ist damit auch jenseits des Dungeon-Ausreißers ein relevanter Performancekandidat.

**Vergleichbarkeit:** User05 wurde auf `.202`, User06 auf `.203`, mit verschiedenen Szenen und Providerbedingungen gespielt. Unterschiedliche Mediane sind **kein kontrollierter Buildgewinn**. Beide Läufe melden 0 Cachetokens; ein Account-/Backendgrund lässt sich daraus nicht ableiten. Der Nutzzeitpunkt eines blockierten Sendeklicks und der abschließende Host-Save-/Read-back-Zeitpunkt sind aus den Daten nicht vollständig verfügbar.

## 3. Unmittelbares Nutzerfeedback (noch keine abschließende Gameplayreview)

1. Buttonbeschriftungen wirken teilweise technisch/unschön, etwa „Annehmen: …“ bei der Quest.
2. Der Questboard-Button „Annehmen“ ist durch weißen Hintergrund mit schlecht lesbarer Schrift schwer erkennbar.
3. Die Wiederaufnahme-/Prüfbuttons bei der Enginenachricht nach unbekanntem Remoteabschluss waren kaum als anklickbar zu erkennen. Der Knopf **funktionierte** bei Nutzer06 nach dem erneuten Start.
4. Der Gatekeeper wurde im Combat-HUD weiterhin auf `SHORT` angezeigt, während die Arcane-Wave-Vorschau ihn nicht als betroffenes Ziel aufführte. Das Originalprotokoll enthält bei Betreten des ersten Dungeonabschnitts tatsächlich `scene.entered` für `npc.npcwarren_gatekeeper` auf `SHORT`. Ob dies falsche Anwesenheit, irreführende Anzeige oder beabsichtigte Abgrenzung von neutralen Zielen ist, braucht einen **gesonderten Code-/Zustandsvergleich**.
5. Im Combat-HUD fiel eine Vorwärtsbewegung auf; eine gleichwertige Rückzugsoption wurde vermisst. Main-/Minor-Actions sind nach der bisherigen Roadmap nicht implementiert; die genauen freien Bewegungsmöglichkeiten sind separat zu prüfen.

**Kampfausgang:** Alaric erreicht in Spielzug 12 HP 0 im Kampf gegen zwei Level-4/5-Goblin-Lookouts. Dass der Charakter starb, ist als Ereignis belegt; Fairness, Schwierigkeit und technische Korrektheit wurden hier **nicht** unabhängig bewertet.

## 4. Verwendung für Performanceversuche

- **S1 (Streaming):** Diese elf nichtstreamenden ST-Generierungen bilden eine natürliche `.203`-Baseline. Für den Nutzen von Streaming müssen künftig Zeit bis zum **ersten gerenderten Prosasatz**, Prosaende, Worldjob/Saveende und tatsächlich sichere Sendefreigabe getrennt gemessen werden. Die vorhandene Baseline kann diese fehlenden Zeitpunkte nicht rückwirkend liefern.
- **B1 (Board):** User06 ergänzt User04/05 um einen weiteren echten Zweitaufruf (114,291 s). Unverändertes Board und Slotrepair am selben eingefrorenen Zustand gegentesten.
- **X1/X2 (Extractor):** Die beiden Repairs und der 55,786-s-Erstgültigkeitsfall eignen sich für den korrigierten Benchmark mit vollständiger HUD-/Revisionskopie, semantischer Weltprüfung und Gesamtlatenz.
- **UI/Kampf:** Gesonderte spätere Nutzerreview; keine UI- oder Balanceänderung als Nebeneffekt des Streamingexperiments.

[Alle Originale und SHA-256](README.md) · [maßgebliche Performanceforschung](../../recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md)
