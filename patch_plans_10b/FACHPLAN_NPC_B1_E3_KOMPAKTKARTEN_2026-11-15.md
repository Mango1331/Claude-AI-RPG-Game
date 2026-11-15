# Fachplan B1 – E3-Merkmale in Kompaktkarten

Stand: 15.11.2026. Implementierungsreifer Vorschlag zur Freigabe; noch keine Implementierung oder Produktabnahme.

## 1. Grundlage und enger Auftrag

Grundlage ist die [verbindliche Tiefenanalyse](../recherche/PULSE_NPC_E2_E3_SPIELGEFUEHL_TIEFENANALYSE_2026-11-15.md), Commit `9511db97485f4801646f1ef5dacdcf3a66deb753` auf `main`. Für die Fachplanung erneut verifiziert: Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` bei `b1fd7860982fe16b53c1ded5d70fde3346220eb1`, Build `4.3.0-c.6.6.198`; `main` vor Ablage bei `9511db9`.

Ziel: Vorhandene `voice`, `manner` und `interest` in den bereits ausgewählten NPC-Kompaktkarten so liefern, dass vollständige, zum aktuellen Kontext passende Merkmale Vorrang vor abgeschnittenen Resten haben. Identität, gemeinsame Erinnerung, offene Absprache und `NOT YET SHOWN` behalten ihren Platz.

**Bewusste Umfangsentscheidung:** B1 verändert ausschließlich die Auswahl der E3-Felder innerhalb der bisherigen **Kopfzeile**. Kein zusätzlicher Kartenplatz, keine zusätzliche Zeile, keine Verdrängung der Erinnerungs-/Wissens-/Absprachezeilen. Es ist keine Garantie, dass drei beliebig lange Merkmale gleichzeitig passen. Diese Garantie wäre innerhalb des bestehenden Formats nicht haltbar.

Keine neue Persönlichkeit, keine Änderung gespeicherter Anker, keine E3-Berechtigungsänderung, keine automatische Beziehung oder Agenda. Keine breitere Auswahl wiederkehrender NPCs und kein Gesprächsschutz. [Plan A](FACHPLAN_PULSE_NPC_A_BEGEGNUNGSBUCHUNG_2026-11-15.md) behandelt Präsenz und Buchung getrennt.

## 2. Ist-Pfad und tatsächliche Eingriffspunkte

Alle Produktpfade sind relativ zu `avereth-engine/` am genannten Produktcommit.

| Funktion in `src/context.js` | Bestehende Aufgabe | B1 |
|---|---|---|
| `npcCues` | Liest aktuelle Fakten `voice/manner/interest` sowie Rolle/Erscheinung | Weiterverwenden, weder Fakten rekonstruieren noch aus Prosa ableiten. |
| `npcCard` | Erzeugt Detailkarte, E3 vor Erscheinung; gemeinsame Erinnerung, Wissensgrenzen und Absprachen | Detailausgabe unverändert. Kleine interne Wiederverwendung von Kopffeldern erlaubt, falls ohne Ausgabeänderung. |
| `compactNpcCard` | Kopf maximal 170 Zeichen; `toward` mit möglicher Absprache; bis zu zwei Zeilen aus `last meaningful → knows → also remembers` | Einziger fachlicher Eingriff: E3-Kopffelder vor dem Abschneiden auswählen. Restzeilen bytegleich lassen. |
| `buildContext` | Zwei gemeinsame Slots für Interlocutors/Arrival, Priorität 0; Zusatzkarten und Budgetpackung | Auswahl, Anzahl, Priorität und Zusatzkartenregeln unverändert. |
| `interlocutorScores`, `arrivalPeople`, `sharedMoments`, `agreementsWith` | Bestimmen Personen, echte Erinnerung und persönliche Absprache | Keine Änderung. |

`src/knowledge.js::truth`/`sharedBefore`, `src/v4/world.js::anchorRefusal` und die Eventbuchung bleiben unverändert. `src/util.js::tokenize` liefert bereits Normalisierung, Stopwortfilter und leichte Pluralvereinheitlichung; `estimateTokens` bleibt unverändert.

Der bestehende Transportpfad lautet: aktuelle Fakten → `npcCues` → Detail-/Kompaktkarte → `npc_compact` beziehungsweise `npc_arrival` → Narrator-Kontext. B1 verändert nur die Darstellung auf diesem Pfad, keinen Weltzustand.

## 3. Verbindliche Auswahl- und Budgetregeln

### 3.1 Geschützte Bestandteile

Unverändert bleiben:

- dieselbe NPC-ID, derselbe kanonische Handle und dieselbe Rolle/Art in der Identitätsdarstellung;
- das bei Arrival-Karten **vorab reservierte**, vollständig sichtbare Suffix `; NOT YET SHOWN`;
- die bisherige `toward Alaric`-Zeile einschließlich Identitätswissen und gegebenenfalls `between you`;
- die bisher ausgewählte tatsächliche `last meaningful`-Erinnerung mit Datum/Erledigungsmarkierung;
- die bisherige Auswahl von `knows`/`also remembers` und der Fallback für Absprachen im Detailteil;
- maximal vier Zeilen pro Kompaktkarte, maximal 170 Zeichen je Zeile, maximal zwei solche Karten im gemeinsamen Interlocutor-/Arrival-Pool.

B1 löst nicht nachträglich alle bestehenden Kürzungen langer Erinnerungen oder Absprachen. Für denselben Zustand und dieselben Optionen müssen die **Nicht-Kopfzeilen exakt dem Ausgangsformat entsprechen**. Neue E3-Auswahl darf ihre Länge, Auswahl oder Position nicht verkleinern oder verändern.

### 3.2 Algorithmus der Kopfzeile

1. Identitätsanteil mit denselben Daten wie bisher aufbauen: Handle, `[id]`, `person` und vorhandene Rolle. Das Arrival-Suffix reservieren, bevor das verbleibende Zeichenbudget berechnet wird. Identität/Rolle niemals kürzen, um zusätzliche E3-Felder hineinzudrücken.
2. Aktuelle, nicht leere E3-Felder aus `npcCues` lesen. Jedes Feld bleibt ein unveränderter Wert unter seinem echten Schlüssel: `; voice: …`, `; manner: …`, `; interest: …`. Keine Umbenennung, Vermischung oder sprachliche Zusammenfassung.
3. **Falls alle vorhandenen E3-Felder vollständig vor das Suffix passen:** bisherige Reihenfolge `voice → manner → interest` und bisheriges Verhalten für den anschließenden Erscheinungstext erhalten. Kein unnötiger Kontextdiff nur wegen anderer Relevanzreihenfolge.
4. **Nur bei Platzkonflikt** die Felder priorisieren: Für jeden Wert die Anzahl unterschiedlicher Treffer aus `tokenize(value)` in den bereits an `compactNpcCard` übergebenen `focusWords` ermitteln. Absteigend sortieren; Gleichstand stabil `voice → manner → interest`. `focusWords` stammt bereits aus aktueller Eingabe und begrenzter letzter Antwort. Kein neuer Keywordkatalog, kein zusätzlicher Modellaufruf, kein Lesen von Geheimnissen/Agenda zur Auswahl.
5. In dieser Reihenfolge jedes **vollständige** Feld übernehmen, wenn es einschließlich Trennzeichen in den Rest passt. Ein zu langes Feld überspringen und kürzere spätere Felder prüfen. Keine Teile eines Merkmals ausgeben, nur um den Platz zu füllen; insbesondere keine Negation oder Einschränkung abschneiden.
6. Erst nach dieser Auswahl den bisherigen Erscheinungstext in den übrigen Platz setzen, nach der bestehenden Kürzungsregel. Nicht ausgegebene E3-Felder werden nicht in zusätzliche Zeilen/Abschnitte kopiert und nicht zu einem späteren Pflichtauftritt vorgemerkt.
7. Suffix anhängen, Längenlimit prüfen. Kein Auffüllen mit neuen Eigenschaften. Wenn kein vollständiges E3-Feld passt, bleiben Identität, Kennzeichnung und gegebenenfalls Erscheinung; es wird kein Fragment als vollwertiger Anker ausgegeben.

Für Karten ohne E3-Felder und für bisher vollständig passende E3-Köpfe muss die Ausgabe unverändert bleiben. Bei Konflikt ist die neue Kopfzeile höchstens so lang wie die alte gedeckelte Kopfzeile. Damit wächst auch die einzelne Kompaktkarte nicht.

**Lange Identität:** Wenn schon der Identitätsanteil allein die bisherige Kopfgrenze erreicht, wird dessen bestehende Kürzung inklusive geschütztem Arrival-Suffix beibehalten, ohne E3 hineinzupressen. B1 darf bestehende Identitätsdarstellung nicht weiter kürzen oder neue Kurz-IDs erfinden. Eine allgemeine Sanierung beliebig langer historischer IDs ist nicht Gegenstand dieses Darstellungsfixes. Im normalen gültigen Kartenfall bleibt die vollständige kanonische ID sichtbar; Grenztests müssen gerade verhindern, dass E3 sie verdrängt.

### 3.3 Warum diese kleine Lösung

Die jetzige feste Aneinanderreihung kann etwa `voice` ganz, `manner` halb und `interest` überhaupt nicht liefern. B1 bevorzugt bei einer Frage nach Vögeln ein vorhandenes vollständiges Vogelinteresse; in einem anderen Kontext kann dieselbe Person ihre vollständige Sprechweise mitbringen. Das ist eine deterministische Kontextauswahl, keine wechselnde Persönlichkeit.

Die Auswahl bleibt lexikalisch und konservativ. Sie behauptet kein Sprachverständnis und erfindet keinen Bezug, wenn Wörter nicht passen. Ohne Treffer gilt die bestehende Reihenfolge. Alle drei Felder bleiben im Weltzustand erhalten. Eine Garantie, dass der Narrator das gelieferte Merkmal literarisch gut nutzt, ist damit nicht verbunden.

Es werden weder die zwei NPC-Slots noch die gemeinsamen Erinnerungen für zusätzliche Anker geopfert. Eine Verlagerung von E3 in eine neue fünfte Zeile wäre ein anderes Budgetprojekt und ist nicht freigegeben.

## 4. Originalfälle und kontrollierte Gegenproben

### 4.1 Belastbare Ausgangsfälle

- `tests/replay/corpus191/w191.json.gz`, Zustand nach Chat `#92`: Wats natürlich gebuchte Stimme „boastful pride in being right, settling matters with a spit“. Der unveränderte Originalzustand dient als Ein-Anker-Kontrolle; keine natürliche `manner`/`interest`-Belegung hinzudichten.
- Kontrollierte Kopie dieses Zustands wie in Analyse §5.3: zusätzlich `manner = always straightens his cuffs before answering and then folds his arms` und `interest = knows the local marsh birds and collects their feathers in a wooden box`. Beide unter 80 Zeichen. Bei Eingabe „I ask Wat about his birds.“ muss bei Platzkonflikt das vollständige Interesse ausgewählt werden; kein abgeschnittener `manner`-Rest. Dies bleibt ausdrücklich ein synthetischer Transporttest.
- `w191 #36/#80/#92`: natürliche Anker von Hedwin/Marren/Wat. Karten mit ausreichendem Platz sollen gleich bleiben; gemeinsame Geschichte darf nicht verschwinden.
- `tests/replay/corpus191/r191.json.gz`, Zustand nach `#42`: Clerk mit Stimme und persönlichem Beschwerdeversprechen. `between you` und Identitätswissen müssen unverändert bleiben.
- `tests/v4/npc_e3.test.js` C2: Brennas später erworbene Art im Original-Userlauf, vollständig vor Erscheinung in der Kopfzeile. `tests/v4/npc_e2b.test.js` B3: Haltung, Absprache, echte Erinnerung und Wissen passen bereits gemeinsam in vier Zeilen. Diese Errungenschaften bleiben bestehen.

Die `.188`-Reviews enthalten zusätzliche Hinweise auf gekürzte/ersetzte Anker, aber die betreffenden vollständigen Originalabschnitte fehlen im verfügbaren Workspace. Keine neuen Fixtures aus Reviewprosa als angebliche Naturoriginale erzeugen.

### 4.2 Verbindliche Regressionen

| ID | Fall | Erwartung |
|---|---|---|
| B01 | Wat-Kopie mit drei Ankern, Fokus `birds`, Kopfkonflikt | Ganzes passendes `interest` vor nicht passenden Feldern; gleiche ID und unveränderte Körperzeilen. Auf `.198` gezielt rot. |
| B02 | Dieselbe Kopie, Fokus `cuffs`; danach Fokus ohne Treffer | Vollständiges `manner`, sofern passend; ohne Treffer stabile bisherige Priorität. Kein Wechsel gespeicherter Fakten. |
| B03 | Mehrere gleich viele Treffer, leere Fokusmenge, wiederholter Aufruf | Deterministische Reihenfolge und identische Ausgabe, kein Zufall/Turn-Rotation. |
| B04 | Alle drei kurzen Anker passen vollständig | Alle vollständig, bisherige Reihenfolge und Erscheinungskürzung, kein unnötiger Formatwechsel. |
| B05 | Hoch priorisiertes Feld passt nicht; ein kürzeres späteres passt | Späteres vollständiges Feld wird genutzt; kein unvollständiges erstes Feld blockiert den Platz. |
| B06 | Kein Feld passt; langer Identitätsanteil; längere gültige ID/Handle | E3 verdrängt keine Identität und kein Suffix. Keine erfundene Kurz-ID, keine zusätzliche Zeile. |
| B07 | Werte mit `never`, `not`, Einschränkung am Ende, Satzzeichen | Wert vollständig und unverändert oder gar nicht, keine irreführende Teilbehauptung. |
| B08 | Keine Anker; nur ein bisher passender Anker; Wert `none`/fehlend | Bisherige Ausgabe bleibt; keine neuen Eigenschaften. |
| B09 | Neuer funktionaler Ankerwert ersetzt alten historischen Wert | Nur aktueller Wert aus `truth`/`npcCues`; B1 schreibt und reaktiviert keinen Fakt. |
| B10 | Arrival-Karte mit langer Rolle und mehreren Ankern | `NOT YET SHOWN` vollständig; kein Eintritt durch Darstellung. Identität, tatsächliche Erinnerung und Absprache unverändert. |
| B11 | Angesprochener aktueller NPC plus Arrival-NPC; zwei aktuelle Gesprächspartner | Bisherige Slotbelegung/Priorität unverändert, höchstens zwei Karten; keine neue bekannte Person wird ausgewählt. |
| B12 | Brenna B3 sowie Clerk `r191 #42`: offene Absprache + Erinnerung + Wissen | Alle Nicht-Kopfzeilen bytegleich zur Basis; Absprache-Fallback im Detailteil unverändert. |
| B13 | Nur Routine-/Erstsichtungs-Erinnerung unter Bedeutungsschwelle | Keine künstliche „last meaningful“-Erinnerung, keine durch B1 gefüllte Lücke. |
| B14 | Geheimnis, fremdes Wissen, unpassender/abwesender NPC | Kein neuer Wissenszugriff und keine Anwesenheitsbehauptung; vorhandene Absenzkarten-/Retrievalregeln bleiben. |
| B15 | Kampfszene, V3/Legacy, `#system`, ausführliche NPC-Karte | Nur bisher tatsächlich aufgerufene V4-Kompaktköpfe betroffen; Detail-/Kampf-/Legacyausgabe unverändert. |
| B16 | Enges Gesamtbudget, lange volle Karten, zwei Karten | Vier Zeilen à höchstens 170 Zeichen, kein neuer Priorität-0-Block, einzelne Karte nicht länger; übrige Budgetpackung kontrollieren. |
| B17 | Gleicher Zustand vor/nach `buildContext`, Host-Reload/Swipe/Regenerate | Zustand/Events/RNG unverändert; gleiche Eingaben liefern dieselbe Auswahl. Kein neuer Provideraufruf. |

Kernprüfungen über die öffentliche `buildContext`-Ausgabe, damit Auswahl, Priorität und reale Lieferung getestet werden. Kein nur den Sortieralgorithmus nachbildender Test. Vorhandene passende Tests in `tests/v4/npc_e3.test.js`, `npc_e2b.test.js`, `npc_e2b_host.test.js` und `fix183_e3_v1.test.js` ergänzen; gegebenenfalls eine kleine Datei `npc_e3_compact.test.js` für die Transportfälle.

## 5. Kontexttokens, Replay und ST-Host

### 5.1 Budgetwirkung

Die derzeitige Grenze ist zeichenbasiert, kein präzises Modelltokenlimit. `src/util.js::estimateTokens` verwendet `ceil(chars / 4.3)`.

| Größe | Unveränderte Obergrenze / Konsequenz |
|---|---|
| Eine Kopfzeile | 170 Zeichen, ungefähr 40 geschätzte Tokens |
| Vierzeilige Karte | 680 Zeichen plus drei Zeilenumbrüche, ungefähr 159 geschätzte Tokens |
| Zwei Karten | 1367 Zeichen einschließlich Zwischenumbruch, ungefähr 318 geschätzte Tokens; Abschnittsüberschriften kommen wie bisher hinzu |
| Dauerhafter Promptzusatz | Keiner; keine zusätzlichen Karten oder Sektionen |
| Modellaufrufe | Keine zusätzlichen |

Bei der Umsetzung pro Original-/Grenzfall vorher/nachher messen: Kopf-/Kartenlänge, `estimateTokens`, voll gelieferte Feldnamen, Anzahl/Identität der Karten, Gesamtkontext und gehaltene/verworfene Abschnitte. Einzelne Karte darf nicht wachsen. Ein kürzerer Kopf kann einem schon bestehenden niedrig priorisierten Abschnitt wieder Platz geben; deshalb nicht fälschlich behaupten, der vollständige Kontext müsse in jedem Fall kürzer werden. Das globale Budgetverfahren und seine bisherige Priorität-0-Ausnahme bleiben unverändert.

Keine kostenpflichtige Tokenmessung oder neue Simulationsmatrix. Die kleine Original-/Grenzfallliste reicht. Eine bessere literarische Nutzung lässt sich erst natürlich beobachten, nicht aus gespeicherten Zeichenlängen ableiten.

### 5.2 Replay

`tools/replay/replay.mjs::recordOutput` vergleicht gespeicherte Events und Recordausgaben, nicht den vollständigen neu gebauten Narrator-Kontext. B1 verändert weder Ereignisautorität noch den Zustand; mit aufgezeichneten unveränderten Modellantworten werden **keine zusätzlichen Gameplay-Fingerprintänderungen gegenüber dem unmittelbar davor bestätigten Produktstand erwartet**.

Der vollständige spätere `npm run replay:check` bleibt Pflicht, reicht aber für B1 allein nicht: Die neuen Kontext- und Hostregressionen müssen die reale Kartenausgabe prüfen. Ein unerwarteter Eventdiff darf nicht mit „nur Promptänderung“ freigegeben werden. Zuerst Ursache klären; keine neue pauschale Annahmeliste und keine Änderung von Originalcorpora.

Falls A vorher umgesetzt wurde, gehören dessen einzeln bestätigte Unterschiede bereits zur Ausgangsbasis. Sie werden im B1-Bericht nicht nochmals als neue B1-Abweichungen aufgeführt. Eine neue natürliche Narration könnte wegen geänderter Auswahl später anders ausfallen; das wird hier weder gemessen noch als garantierter Vorteil behauptet.

### 5.3 ST-Host

Keine Hostschnittstellen- oder Speicheränderung. `buildContext` liefert weiterhin dieselben Abschnittstypen und Kartenkennzeichnungen. Offline-Hosttests sichern, dass tatsächliche Generation/Arrival-Kontexte die neue Auswahl enthalten, `NOT YET SHOWN` erhalten bleibt und kein Zusatzlauf des Extractors entsteht.

Nach A und B1 gemeinsame isolierte ST1.19-Abnahme mit Mockprovider: `npm run smoke:st:check`, dann `npm run smoke:st:isolated`, Abschlussberichte für Standard, Failsoft und PageErrors einzeln lesen. Persönliches ST bleibt unberührt. Weder diese Smokes noch natürliche Modellläufe gehören zur Fachplanung.

## 6. Umsetzung, Risiken und Lieferung

Erwartete Produktdateien bei Umsetzung:

- `src/context.js`: kleiner interner Aufbau/Auswahlhelfer für den Kompaktkopf und dessen Nutzung in `compactNpcCard`; `npcCard` höchstens zur unveränderten Wiederverwendung strukturierter Felder anfassen. Kopfbestandteile nicht aus frei formulierten Eigenschaftswerten durch fragiles Semikolon-Splitting zurückparsen.
- Zugehörige Kontext-/Hostregressionen.
- Technische Patchnote und normale Versionsstellen. Kein neues Contentformat, kein `rules.json`-Eintrag, keine Änderung der Ankerbuchung.

Empfohlener Ablauf:

1. A zuerst unabhängig prüfen/übernehmen. B1 auf separatem Arbeitsbranch vom dann bestätigten aktuellen Produkt-HEAD beginnen. Keine verdeckte Mitnahme von A als Teil des B1-Diffs.
2. Wat-Transportfall und geschützte Brenna-/Clerk-Zeilen als rote beziehungsweise unverändert grüne Gegenproben festlegen.
3. Nur Kompaktkopf ändern; vollständige Felder und Fokusreihenfolge unter dem bisherigen Budget wählen. Bestehende Ein-Anker-/Alles-passt-Fälle möglichst bytegleich halten.
4. Gezielte Tests, vollständiges `npm test` und `npm run replay:check` ausführen. Kleine Vorher-/Nachher-Kontextmessung beilegen; keine Modellläufe.
5. B1 separat committen, technische Patchnote mit tatsächlich betroffenen Dateien/Tests liefern und unabhängigen Diff-Review durchführen. Danach gesammelte isolierte ST-Abnahme von A+B1; noch kein GO allein aus der Implementierung ableiten.

Hauptrisiken: versehentliche Änderung der Identitätsdarstellung; Bevorzugung scheinbar passender Wörter durch lexikalischen Zufall; falsch abgeschnittene Negation; Verdrängung einer Absprache/Erinnerung; zusätzliche Tokens durch unbeabsichtigte Detailduplikation. Geschützte Körperzeilen, unveränderte Slotwahl, vollständige Felder, stabile Gleichstände und die festgelegten Messungen begrenzen diese Risiken.

**Freigabeinhalt:** Die vorgeschlagene Priorisierung ist vollständig festgelegt; keine neue Nutzer-Grundsatzentscheidung ist für B1 nötig. Die spätere allgemeine Auswahl wiederkehrender NPCs und persönlicher Gesprächsschutz bleiben ausdrücklich außerhalb beider Pläne.

**Erstellung dieses Plans:** gezielte Lektüre der Karten-, Budget- und Replaypfade. Keine Produktänderung, kein Testlauf, keine neue Naturbeobachtung. Alle aufgeführten Regressionen und Messungen sind verpflichtende spätere Prüfungen, keine bereits bestandene Produktabnahme.
