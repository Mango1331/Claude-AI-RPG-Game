# .158 — User02 Technik und NPC E0/E1

Basis: `.157` / `b31123ffb4d3f5c404d6add85449ea869ed415ee`. Ein freigegebenes Produktrelease; Implementiererabnahme, kein unabhängiger Gegenreview und kein natürlicher Modellnachweis.

## Änderungen

- `dungeon.js` liefert eine gemeinsame lesende Floor-/Labelprüfung gegen die bereits etablierte kanonische Struktur. GO, Living-Siegel, neue Räume, Passagen und tatsächliche Ankünfte prüfen sie vor dem relevanten Event. Existenz bleibt von Versiegelung getrennt. Richtung zu bereits bekannten Räumen wird ebenfalls geprüft; ein gültiges bekanntes Rückziel wird nicht allein wegen eines historisch falschen Raumnamens umgeschrieben. `throughGoal()` kann ein ungültiges Endziel nicht durch einen gültigen Zwischenraum verstecken. Ankünfte prüfen auch eine erst später berichtete absteigende Passage vor der Raumanlage.
- `commands.js` unterscheidet im vorhandenen `what`-Fokus Raumsuche von Überrestsuche: „loot“ irgendwo im Spielerzitat beendet nicht mehr jede Suche. Keine Schemaerweiterung, kein neuer Loot und kein zusätzlicher Generator. Eindeutige bereits geplünderte Überreste, allgemeines Nachplündern und bestehender Search-Wiederholungsschutz behalten ihre Fachwege.
- Empty-Repair verlangt vollständige Bewegungsberichterstattung. Nur nach leerer Antwort, vorhandenem GO, Nichtankunft ohne Arrival, widersprüchlichem berichteten Szenenort und tatsächlicher nicht bloß geplanter Bewegung in der Narration darf der verbleibende dritte Aufruf die Bewegung nachprüfen. Kein höheres Aufruflimit. Eine weiterhin unbestätigte Ankunft bleibt ungebucht und erhält einen gespeicherten Hinweis. Keine Ankunft aus GO/Expected allein.
- Der Planner sieht bis zu vier relevante vorhandene öffentliche Führungs-/Absprachenfakten anwesender NPCs. Eindeutig angenommene aktuelle Führung ist normaler GO; Einladung, Getränkezusage, Warenpräsentation oder spätere Absicht sind keine Bewegung. Das bestehende `arrive.with` trägt den tatsächlich mitgehenden NPC. `no_go`, Szenenschutz und `companionOf()` bleiben bestehen; kein automatischer Kauf.
- E0: Der beim Host-Generierungsbeginn gesetzte Engine-Block erhält kompakte Abschnitts-/NPC-ID-/Budgetdiagnose. Chat, Eingabehash und Generierungsepoche begrenzen die Zuordnung. Stop/End/Chat-/Swipewechsel verwerfen offene Bezüge. Identische regenerierte Prosa aktualisiert allein die tatsächlich benutzte Diagnose, ohne Weltbuchungen zu wiederholen. Speicherung unter `narration.context` im Assistant-/Swipe-Record; Extraction und Save behalten sie. Keine Promptkopie, kein neuer Modellcall, kein zweiter Weltzustand. Die Messung betrifft den Engine-Block, nicht alle von ST oder weiteren Extensions gelieferten Promptteile.
- E1: Höchstens zwei lebende anwesende Gesprächspartner, ausgewählt nach Spieleransprache, tatsächlichen Handlungspartnern, jüngstem Gespräch und vorhandenen bedeutsamen Erinnerungen; stabil bei umgekehrter Anwesenheitsliste. Kompaktkarte mit maximal vier gekürzten Feldern, Zusatzwissen/Agenda/Geheimnisse weiterhin im optionalen Narrator-Detail. Keine geheimen Karten im Spielerpanel. Kampf behält seine eigenen Pflichtinformationen. Lokaler Dungeonkontext ist jetzt Pflichtinformation, damit NPC-Karten ihn nicht verdrängen. Historische Geldgeschenke/Gildenabschlüsse werden begrenzt und die Creation-Erinnerung wird kompakter. Budgeteinstellung unverändert; bestehende Pflichtüberlaufpolitik wird in E0 ausdrücklich gemessen.
- Beide Faktobjekt-Übergänge (`world.js`, `delta.js`) verwenden exakte Referenzauflösung ohne Rollenheuristik oder automatische Namenserweiterung. IDs, lokale Referenzen, vollständige Namen und exakt benannte gerade erzeugte Personen bleiben nutzbar; generelle Identitätsauflösung unverändert. Freie Prosa/berufliche Beschreibung bleibt Text. Bestehendes 200-Zeichen-Limit bleibt.
- Persönliches Gildenwissen: Ein bereits gebuchter, auf Ankunft wartender Abschluss wird vorübergehend mit Ort und Szenenepoche verbunden. Ein anschließend gültig eingeführter tatsächlicher Bearbeiter erhält den vorhandenen Fakt als `witnessed`, wenn die Narration eigene Vertrag-/Zahlungsbearbeitung belegt. Gildenfunktion sowie eigene Vertragsbearbeitung beziehungsweise der gebuchte Auszahlungsbetrag werden zusätzlich geprüft. Keine Neubuchung von Geld/XP und keine globale Wissensverteilung am Ende der Antwort. Ein späterer anderer Besuch erhält nichts rückwirkend. `enter` deklariert dafür den tatsächlich verwendeten Knowledge-Schreibbereich; keine globale Abschaltung der Ownership-Prüfung.

## Regressionen und Belege

`tests/v4/fixtures/user02_157.jsonl.gz` ist eine verlustfreie komprimierte Kopie des originalen User02-Chatexports; Originalevents werden für die Prefix-Folds unverändert benutzt.

Erste sieben Original-/Kontrollregressionen auf sauberer `.157`: **6 rot, 1 grün** (Phantom-Floor, altes ungültiges Ziel, I46, I43, Freitext, fehlende E0/E1-Auslieferung; `no_go` bereits korrekt). Danach **23/23** gezielte Tests grün. Enthalten sind I28/I43/I46/I48/I50/I56/I68, freier Fakt mit einteiligem Namen, reale zweite Etage/Siegel/Gate, Recovery-Negativfälle, Same-scene-Gildenwissen, später eintreffender Clerk, begrenzter Kontext, unveränderte unautorisierte Szenen, Begleitung ohne Kauf sowie E0 nach Extraction/JSON-Reload. Angrenzende historische Floor-, Gate-, Auto-Loot- und Ownership-Suites bleiben in der Vollsuite.

## Replay

Unveränderte `.126`-Baseline, **2235 Fälle**. Gegen einen zusätzlich vollständig berechneten sauberen `.157`-Replay ändern sich **41 Datensätze**. Einziger Unterschied außerhalb der Fakten ist ein belegter persönlicher Gildenzeuge. In den 41 Datensätzen wurden alle übrigen Events, ihre Reihenfolge, Corrections und Rejections gegen `.157` exakt verglichen: kein Geld-, Gegenstands-, Kampf-, XP- oder Questabschluss-Event ändert sich.

Die neue Liste `accepted_fix158_vs_126.json` hält jede Änderung mit konkretem Subjekt/Prädikat, altem/neuem Wert beziehungsweise dem tatsächlichen Zeugen, neuem vollständigem Fingerprint und vorherigem `.157`-Fingerprint fest. Alte Listen/Baseline bleiben unverändert; 474 bisherige Einträge sind exakt unverändert, 34 kommen hinzu, sieben frühere Fingerprints werden mit Begründung ersetzt. Ergebnis: **515 exakt akzeptiert, 0 offen, 0 veraltet**. Das umfasst frühere Fixes; 515 ist nicht die Zahl neuer Änderungen.

## Abnahme

- Vollständiges `npm test`: **2793/2793**.
- Gezielte Suite: **23/23**.
- `npm run replay:check`: **2235 Fälle, 515 exakt akzeptierte Abweichungen, 0 offen/veraltet**, keine Fold-/Validierungsfehler.
- Echter ST **1.19.0** auf separatem Host mit geskriptetem Modellprovider. Zusatz `continuity_smoke.mjs`: Originalprefix → angenommene Führung, dreistufige Exit-Recovery, einmalige Buchung, tatsächliche E0-Zuordnung und Save/Reload. **Standard 70/70, Failsoft 76/76, jeweils 0 PageErrors.** Beide Endläufe enthalten Finanz-, Save-Recovery-, Fetch-, S1-, UI- und Kontinuitätsprüfungen; Failsoft zusätzlich Planner-/World-/Savefehler und vorübergehenden Narrator-Providerfehler. Ausgeführt mit Playwright 1.51.1 / Chromium 134 auf Linux; keine Windows-Langzeitabnahme. E0 wird auch nach tatsächlicher Swipe-Generierung und Reload geprüft.
- Eigener Diff-Review durchgeführt; insbesondere Zustand vor Raumanlage, beide Faktadapter, beschränkte Gildenzeugen und Pflichtkontext gegenüber optionaler NPC-Auslieferung.

Prüfhistorie: Der erste frische ST-Lauf bestand die Fachchecks, meldete jedoch ST-HTTP-/JSON-Fehler. Ein weiterer Lauf hatte zwei falsche Testannahmen (`Tam` im technischen ID-String statt tatsächlicher stabiler ID). Korrigiert wurde ausschließlich die Identifikation im Hosttest; nachfolgende Läufe ohne PageErrors. Die frühe Node-Ausführung entdeckte außerdem eine Verwendung von `scan` vor Initialisierung und unnötig verdrängten Gatekontext; beide Ursachen korrigiert. Keine dieser Zwischenprüfungen ist die Endabnahme.

## Grenzen

- Engine-Kontextauslieferung ist keine Garantie für konsistente natürliche Modellverwendung. Annahme einer Führung ist weiterhin semantische Plannerarbeit; Hosttests injizieren dafür Pläne.
- Literalprüfungen für Recovery/Zeugen sind bewusst konservativ; ungewöhnliche Formulierungen können unbestätigt bleiben. Kein Zwangsbuchen als Ersatz.
- Alte fehlerhafte Events bleiben faltbar; kein Retcon, keine automatische Etagen-/Raumreparatur und keine Rekonstruktion verworfener Erinnerungen.
- Pflichtblöcke dürfen nach bestehender Packerpolitik das normale Budget überschreiten. E0 macht das sichtbar; keine pauschale Einstellungserhöhung. Ein Kompaktfeld wird bei 170 Zeichen abgeschnitten, vollständige passende NPC-Details bleiben optional.
- Der historisch gesondert dokumentierte strenge Ownership-Konflikt beim ursprünglichen I8 ist kein hier behaupteter Fix. Keine vollständige strenge Original-Replay-Abnahme behauptet.
- Keine Änderungen an Haltungspunkten/Kampfseiten, Stealth S2, E2+, PULSE, Beziehungssimulation, Dungeonpopulation oder Finanzregeln.

Nächster Schritt nach unabhängigem GPT-Diff-Gegenreview: persönlicher freier User-Run mit NPC-Gesprächen, Such-/Dungeonübergängen und danach längerer Progression. Keine neue Pflicht-Batchserie.
