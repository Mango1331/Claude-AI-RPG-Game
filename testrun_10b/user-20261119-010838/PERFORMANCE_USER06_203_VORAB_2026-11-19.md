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


## 5. Ergänzender unabhängiger Originalabgleich

**Quellengleichheit:** Das separate Eventexport enthält **24 Nachrichtenindizes und 190 Events**. Alle **190/190** Events stimmen in Struktur und Inhalt exakt mit den `extra.avereth.events` derselben Nachrichten im vollständigen JSONL-Chat überein. Das beweist die Konsistenz dieser beiden exportierten Darstellungen, **nicht** eine erneute Engine-Replay-/Save-Read-back-Abnahme. Die vier unter `originals/` abgelegten Git-Blobs stimmen mit den originalen Git-Blob-SHA-1 und SHA-256/Dateigrößen überein.

**B1: noch ein starkes reales Einzelslot-Beispiel.** Im **ersten** Boardantwortarray von User06 stand im Novice-Einsteigerslot „Take the Pike That Took the Mill Pond“ (Level 1, Habitatanker `aquatic`). Die zweite Boardantwort ersetzte **ausschließlich Slot 1** durch „Slay the Marsh Adder of the Eel Weirs“ (`serpent`). **Slots 2 bis 5 sind als strukturierte JSON-Objekte byte-/wertgleich geblieben.** Der bestehende vollständige Repair benötigte **114,291 s** für beide Boardaufrufe zusammen; aus der Slotidentität allein ergibt sich **keine gemessene schnellere Providerantwort**. User06 ist damit ein dritter natürlicher Kandidat für die begrenzte B1-Gegenprobe, nicht für eine generelle Lockerung des Validierungsprofils.

**Unabhängiger Narrator-Qualitätsbefund:** Obwohl `.203` dem Narrator beim ersten Boardlesen ausdrücklich mitteilt, dass die **Systemkarten** die offiziellen Angebote bereits anzeigen und er sie **nicht erneut vollständig aufzählen** soll, führt die tatsächliche Erzählerantwort zu Spielzug 6 nochmals alle fünf Quests mit Titel und Preis als einzelne Auswahlzeilen auf. Der mit User05 bekannte Doppelungsbefund ist damit **natürlich auf `.203` wieder aufgetreten**. Dies ist ein eigener Narrations-/UI-Befund, kein Streamingdefekt; bei einer späteren QoL-Runde nur mit einem unveränderten Gegenfall und ohne Einschränkung freier Einzelquest-Nachfragen korrigieren.

**Kampfende präzisiert, nicht als Balanceurteil:** Bei Spielzug 10–12 trafen drei vom HUD gewählte `Arcane Wave`-Angriffe die beiden nachweislich aktiven Gegner, einen Level-4- und einen Level-5-Goblin-Lookout. In der letzten Engineauflösung starb Lookout A, Lookout B blieb mit **13 HP** am Leben und verursachte anschließend **16 Schaden** gegen Alarics verbliebene **13 HP**: `entity.status: pc dead`, `encounter.ended: pc_dead true`, Quest offen. Die vorliegenden Ereignisse zeigen **eine mechanisch gebuchte Niederlage**; ob Gegnerstärke, Gruppenkampf, Aufklärung oder Flucht-/Rückzugsmöglichkeiten für einen Level-1-Mage angemessen waren, erfordert einen getrennten Gameplay-/Balancevergleich und Spielerfeedback. Im Chat folgt **ein zusätzlicher Narratorbeitrag nach dem Tod ohne neue Usernachricht**; seine Ursache (z. B. manuelles Continue) ist aus den vier Uploads nicht belegt und wird nicht als normaler neuer Spielzug gezählt.

**UI-Präsenz gegenüber Zielauswahl:** Beim Eintritt in den `warren forecourt` wird `npc.npcwarren_gatekeeper` mit `scene.entered SHORT` in den Spielzustand übernommen. Die getrennte Arcane-Wave-Zielvorschau betrifft dagegen die tatsächlichen Kampfgegner. `SHORT` in der allgemeinen Szene und **nicht** als AoE-Gegner aufgelistet zu sein, ist daher **noch kein Beweis** zweier widersprüchlicher Entfernungsberechnungen. Offen bleibt, ob die Gatekeeperin gemäß Erzählung wirklich im gleichen Abschnitt bleiben sollte und ob das Combat-HUD unbeteiligte Personen deutlicher von aktiven Gegnern trennen muss.

**Konsequenz:** **S1** darf nun User06 als natürliche nichtstreamende `.203`-Baseline verwenden. **B1** erhält den neuen Einzelslot-Originalfall. **X1** sollte die zwei reparierten Extraktionsjobs und den 55,786-s-Erstversuch gesondert prüfen. Doppeltes Board-Narrating, unklare Anwesenheitsanzeige, schwach erkennbare Buttons und Rückzug/K1 gehören **in eine spätere separate UI-/Gameplayprüfung**, nicht ungefragt in den Streaming-Code. Die Dauer bis zum *wirklich frei sendbaren* nächsten Zug ist weiterhin aus keinem der vier Uploads vollständig rekonstruierbar.
