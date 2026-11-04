# Fachplan – Stealth als Vorgehensweise außerhalb des Kampfes

**05.11.2026 · Planung, nicht implementiert oder als Gesamtumfang freigegeben.**
Codebasis: Produkt **.155 / `62672d875ad02204c06d9b9f76425f1127572ad7`**. Hohe Priorität für den verlorenen Reisezug; die unten abgegrenzten lokalen Erweiterungen können separat freigegeben werden. Keine Änderung der Aktionsökonomie, Stealthformel oder Kampfarchitektur.

## 1. Beleg und Ursache

Quellen: [Originalchat](../testrun_10b/user-20261104-162404/originals/chat.jsonl), [Events](../testrun_10b/user-20261104-162404/originals/events.json), [GPT-Review](../testrun_10b/user-20261104-162404/REVIEW.md), [Userfeedback](../testrun_10b/user-20261104-162404/USER_FEEDBACK_REVIEW.md). Sols Gegenprüfung im vorangehenden Gespräch bestätigte 67 identische Eventgruppen/635 Events, 75 formal gültige Fold-Zwischenstände und reproduzierte den letzten Zug über den Produkthost. Das sind damalige Read-only-Nachweise, keine im Rahmen dieses Plans neu ausgeführten Regressionen.

**I73/T33:** `ill go now *i say and make my way over. once i get close enough i crouch down to sneak up on the sleepy ghouls*`.
Gespeicherter Plan: `journey.continue` seq1, `stealth` seq2, verschiedene Handlungszitate, keine Bindung. Der kanonische Reiseintent `intent.3` nach Old Cairn Field ist aktiv. Trotzdem wählt `mapPlan()` V3-Stealth, verwirft die Reisefortsetzung und prüft Hesk/seine Hunde am Shepherd's Shelter: d100 2, Erfolg. I74 erzählt Ankunft; `arrive` wird korrekt durch `no_go`, vier weitere Deltas durch `scene_context` abgewiesen. Die Engine bleibt am Shelter. **Kein Extractorabbruch und kein unverständlicher Spielerinput.**

Die vorhandene `journey.continue` autorisiert ohne die konkurrierende Stealth-Aktion korrekt dasselbe Ziel. Ursache ist also nicht die gespeicherte Reise, sondern die fehlende Unterscheidung **Hauptvorhaben / Vorgehensweise / eigenständige Folgehandlung vor dem Routing**.

`.155` erkennt nur genau ein `stealth` plus genau ein `go`, gebunden über `go.needs` oder identische Zitate. Das behebt die natürlichen I27–I32-Raumwechsel, aber weder `journey.continue` noch lokale heimliche Handlungen allgemein. Einfach weitere Kommandonamen in diese Sonderabfrage einzutragen würde das Grundproblem fortsetzen.

## 2. Wiederverwendung und konkrete Eingriffspunkte

Alle folgenden Pfade beziehen sich auf `avereth-engine/` im [geprüften Produktcommit](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/62672d875ad02204c06d9b9f76425f1127572ad7).

| Datei/Funktion | Heutige Aufgabe und Folgerung |
|---|---|
| `src/v4/planner.js`: `MECH_COMMANDS`, `parsePlan`, `mapPlan` | Versteht/validiert mehrere Schritte, routet mechanische Hauptaktionen gegen Story-Kommandos. Hier muss der gemeinsame Handlungszusatz erkannt werden, **vor** der Wahl V3/V4; eigenständiges Hide bleibt erhalten. |
| `content/commands.json`, `src/v4/interpret.js`: Schema/Vokabular | Story-Kommandos sind strikt validiert. Ein neuer optionaler Zusatz muss bewusst erlaubt, beschrieben und versioniert werden; nicht still durch unbekannte Felder schlüpfen. |
| `src/v4/commands.js`: `go`, `journey.continue`, `moveStep`, `resolveCommands` | GO prüft Wege/Gates; Continue löst mit `continueOptions` einen bestehenden Intent oder eine bestehende Journey auf. Beide schreiben bereits `ctx.auth.gos`. `moveStep` bewegt lokal um ein Band, ohne einen Raumwechsel zu behaupten. Diese Pfade bleiben zuständig. |
| `src/v4/turn.js`: `serializableAuth`, `playerTurnV4` | Autorisierung muss vollständig bis zum gespeicherten Outcome und World-Schritt gelangen. Ein neuer Zusatz darf hier nicht verloren gehen. |
| `src/v4/world.js`: `arriveThrough`, `seeing`, Living-Nachholung, Abschluss vor `openCommitted` | Tatsächliche Ankunft/Belegung sind hier bekannt. `.155` führt die Ankunftsprobe nach der Population aus; diese Reihenfolge bewahren, aber den Geltungsbereich an die autorisierte Handlung binden. |
| `src/checks.js`: `stealthEvents`, `resolveCheck`, `detectionScore` | Bestehende AGI-vs.-beste-PER-Probe wiederverwenden. Erfolg: PC concealed, zuvor aware → suspicious, sonst unaware. Fehlschlag: bester Beobachter aware, übrige suspicious. Leer: automatisch, kein Detection-Wurf. |
| `src/v4/features.js`: `attemptEvents`, Search-Helfer; `commands.js`: `activity` | Hindernis-, Such- und Wiederholungsprüfungen sind eigenständig. Stealth ersetzt sie nicht. Search hat bereits eigene PER-Probe und `searchChecks`. |
| `src/state.js`, `src/combat.js`, `src/engine.js` | `scene.moved/reset_present` setzt Concealment richtig zurück. Awareness entscheidet Ambush. Pending/aktiver Combat sperrt heimliche Reiseabkürzungen. Keine zweite Wahrnehmungs- oder Kampfmechanik. |
| `src/v4/runtime.js`, `src/host.js`, `src/display.js` | Bestehende Repair-/Clarify-, Commit-, Anzeige-, Edit-/Swipe-/Reload-Pfade verwenden. Keine zusätzliche obligatorische Modellanfrage. |

**Wichtige Namenskollision:** `attempt.approach` ist bereits Freitext für die Hindernismethode. Dieses Feld nicht global zu einem neuen Stealth-Objekt umdefinieren.

## 3. Aktionsübersicht: was der gemeinsame Ansatz leisten soll

Die Matrix erfasst die aktuellen Story-Kommandos und die außerhalb Combat relevanten Planneraktionen. Sie ist eine fachliche Unterstützungsgrenze, kein neues universelles Regelsystem.

| Vorhaben / bestehende Kommandos | Einordnung | Wahrnehmungszeitpunkt und Grenze |
|---|---|---|
| Raum betreten, Ort wechseln, leise durch ein Gebiet: `go` | **Gemeinsam unterstützen, S1** | Bestätigte Ankunft bzw. tatsächlich erreichter Unterbrechungsort, danach dessen vollständige Population. Keine Garantie für unsimulierte gesamte Wegstrecken. |
| Vorbereitete Reise fortsetzen: `journey.continue` | **Gemeinsam unterstützen, S1** | Derselbe autorisierte GO-Umschlag nach eindeutiger Zielauflösung. Nur am Ziel anschleichen ist von einer insgesamt heimlichen Etappe zu unterscheiden. |
| Einer Person/Gruppe unbemerkt näherkommen: `move` | **Gemeinsam unterstützen, S1** | Bestehender lokaler Ein-Band-Schritt, danach Probe gegen die anwesenden Beobachter. Keine zusätzliche Bewegung, kein Angriff, kein Wechsel des Orts. |
| Wache umgehen | **S1, soweit Bewegung genügt** | GO/Move nur auf einem gültigen Weg. Ein gebuchtes Hindernis verlangt weiterhin `attempt`; verschlossenes Tor, Gebühr oder Zugangsrecht werden nicht durch Stealth aufgehoben. |
| Lokal vorsichtig/unauffällig untersuchen: `activity(search)` | **S2 auf derselben Grundlage** | Sucherfolg und Unbemerktheit getrennt. Aktuelle lokale Beobachter; unveränderte Such-/Wiederholungssperre. Keine heimliche Suche am noch nicht erreichten Ziel. |
| Bekanntes freies Objekt aufnehmen: `take` | **S2, eng abgrenzbar** | Nur nach regulärer Orts-/Besitz-/Behälterprüfung, am aktuellen Ort. Fehler der Heimlichkeit kann eine vollzogene erlaubte Aufnahme bemerkbar machen. Kein neues Diebstahlrecht. |
| Unbekanntes Objekt finden/nehmen, `take {new:…}`, NPC-verwahrte Questware | **Besondere Grenze, vorerst nicht pauschal S2** | Physische Ausführung hängt erst von der World-Antwort ab. Kein Quellraum-Erfolg als Blankoscheck für spätere Geber/Objekte. Eine Erweiterung benötigt einen bestätigten Ausführungszeitpunkt. |
| Hindernis leise öffnen/passieren: `attempt` | **Eigene Grenze** | Vorhandene Feature-/Werkzeug-/Schwierigkeitsprobe bleibt maßgeblich. Ihre Beschreibung kann bereits eine leise Methode enthalten. Zweite Detection-Probe erst unterstützen, wenn Durchführung und mögliche auffällige Wirkung eindeutig abgegrenzt sind; kein Stealth-Erfolg öffnet eine Tür. |
| Dinge ablegen/übergeben/benutzen: `drop`, `give`, `use`, `equip`, `unequip` | **Später einzeln nach Wirkung prüfen** | Normale Eigentums-/Präsenz-/Effektregeln. Ein heimliches Signal/Verstecken eines Gegenstands ist nicht dasselbe wie PC-Concealment; Feuer, Explosion und offensichtliche Wirkung nicht durch ein Flag unsichtbar machen. |
| Sammeln/Arbeiten/Handwerk/Botengang: `activity(gather/work/craft/errand)` | **Nicht pauschal unterstützen** | Zeit, Ertrag, Bewegung und Geräuschwirkung können verschieden sein. Falls eigentlich Wegschleichen gemeint ist: Bewegung qualifizieren, keinen zusätzlichen Ertrag/Lohn zusagen. |
| Warten/Rasten/Schlafen: `activity(wait/rest/sleep)` | **Hide und Zeitabschnitt unterscheiden** | „Verstecken und warten“ darf als eigenständiges Hide mit anschließender Zeitspanne gemeint sein. Eine kurze erfolgreiche Probe garantiert keine unbeobachtete ganze Nacht. Keine neue Dauerstealth-/Rastmechanik. |
| Lernen/Training: `activity(train/study)` | **Nicht Bestandteil** | LP/PP, Lehrer, Material und Zeit unverändert; Stealth ist kein Lernbonus. |
| Weltfähigkeiten, Angriff, Flucht: `ability_world`, `use_skill`, `flee` | **Keine kostenlose Verknüpfung** | Bestehende Wirkung bzw. Kampf-/Ambushregeln. Ein heimlicher Angriff darf nicht erst kostenlos verstecken und dann angreifen. Außerhalb Combat ist ausdrücklich benannte Rückkehr weiterhin GO; echte Flucht folgt ihrer Mechanik. |
| Handel/Geld: `pay/buy/sell/offer.accept/offer.decline` | **Keine Finanzänderung** | Heimlicher Handel ist zunächst Rollenspiel; keine andere Zustimmung, Buchung, Tarnung von Eigentum oder heimliche Doppelzahlung. |
| Guild/Quest: `guild.register/promote`, `board.read`, `quest.accept/turn_in/abandon` | **Keine zusätzliche mechanische Heimlichkeit** | Offizielle Vorgänge und Präsenz bleiben unverändert. „Unauffällig ans Board gehen“ qualifiziert gegebenenfalls den Weg, nicht die Mitgliedschaft oder Auszahlung. |
| Ziele/Entwicklung: `intent.set/drop`, `passive.*`, `development.*` | **Nicht wahrnehmungsbezogen** | Keine physische Zusatzhandlung und keine Detection-Probe. |
| `other`, `clarify`; reine Gespräche | **Keine freie mechanische Generalisierung** | Fiktion darf leise sein. Unaufgelöste Wirkungen nicht als Engine-Erfolg persistieren; echte Mehrdeutigkeit vor Ausführung klären. |

**Nicht gleichsetzen:** heimlich ausführen / gar nicht ausführen, falls entdeckt. Ein solcher ausdrücklicher Vorbehalt ist eine echte Bedingung und darf nicht still in eine bereits abgeschlossene Aufnahme/Bewegung übersetzt werden. Neue Reaktions-/Abbruchbedingungen gehören nicht als versteckte Nebenfunktion in S1/S2.

## 4. Lösungsvarianten und Empfehlung

| Ansatz | Nutzen | Nachteil / Urteil |
|---|---|---|
| `.155`-If auf Continue und weitere Namen ausdehnen | Sehr kleiner erster Diff | Bindung und Timing bleiben implizit; Search/Take verdrängen später wieder ihr Hauptvorhaben. Als Gesamtplan nicht empfohlen. |
| Bestehende Stealth-Kommandos ausschließlich über `needs` verknüpfen | Kein neues Modellfeld | `needs` bezeichnet heute eine frühere erfüllte Voraussetzung, nicht eine Vorgehensweise; keine saubere Unterscheidung Reisebeginn/Zielannäherung. Nur als Übergang für eindeutig gebundene `.155`-Pläne sinnvoll. |
| **Ein optionaler strukturierter Handlungszusatz im bestehenden Plannervertrag** | Absicht, Hauptaktion und zeitlicher Umfang bleiben zusammen; dieselbe Prüfung/Resolution kann mehrere Kategorien bedienen | Kleine Protokoll-/Promptanpassung und neue Validierung nötig. **Empfehlung.** Keine zusätzliche Klassifikationsanfrage. |

Empfohlene technische Form; die genaue Feldbenennung ist eine Implementierungsentscheidung, keine zusätzliche Designfrage an den Spieler:

```json
{"seq":1,"type":"journey.continue","quote":"ill go now … once i get close enough …",
 "manner":{"kind":"stealth","scope":"destination"}}
```

- `manner` ist **optional**, nur `kind: stealth`; kein neues allgemeines Fähigkeiten-/Methodenframework.
- `scope: action`: leise Ausführung dieser einen Handlung. Bei Reise Probe am tatsächlich erreichten relevanten Halt; bei lokaler Handlung am aktuellen Ort.
- `scope: destination`: normale Reise, Stealth erst bei der Annäherung am tatsächlich bestätigten Ziel. Nur für Reisehandlungen; nicht im Quellraum und nicht an einem früheren Zwischenhalt aktivieren.
- Der Planner interpretiert diese Bedeutung aus der gesamten Spielerhandlung. Keine Liste vorgeschriebener englischer Wörter. `quote` bleibt quellengebunden; das Modell entscheidet keinen Erfolg.
- Eigenständiges `stealth {}` bleibt für normales Verstecken erhalten. „Ich gehe hin, danach verstecke ich mich unter dem Bett“ wird nicht allein wegen gemeinsamer Nachricht zum heimlichen Weg.
- Klar gebundene `.155`-Paare weiterhin intern auf dieselbe Form normalisieren. Mehrdeutige alte Paarungen nicht blind zusammenziehen; der bestehende einzelne Repair kann die Bindung/Scope präzisieren, andernfalls eine gezielte Clarify **vor** jeder Buchung. Den Original-I73-Plan nicht nachträglich als bereits mit `manner` ausgestattet ausgeben.
- Ein Zusatz ist keine Berechtigung: ungültiges Ziel, Combat, fehlender Gegenstand oder gesperrter Weg bleiben ungültig. Bei nicht unterstützten Kombinationen nicht still stattdessen verstecken oder eine bedingt gemeinte Hauptaktion offen ausführen.
- Bereits zulässige unmodifizierte V4-Mehrschrittpläne bleiben zulässig. Kein globales „eine Storyaktion pro Nachricht“ einführen. Bei mehreren Reiseetappen muss der Zusatz am betreffenden `seq` bleiben; das heutige erste `auth.gos.find(g => g.sneak)` darf nicht zum Erfolg für beliebige weitere Ankünfte werden. Zunächst nur eindeutig zuordenbare qualifizierte Etappen ausführen; unklare mehrfache Bindungen vorab klären, nicht die übrigen Schritte still verwerfen.

## 5. Umsetzung S1 – gemeinsame Grundlage und Bewegung

Ein zusammenhängendes Fachpaket, keine getrennten Builds pro Kommandoname:

1. **Vertrag und Normalisierung:** Optionales `manner` in C-Planner-Schema/Validierung und den betreffenden Vokabularstellen erlauben. Gemeinsame optionale Metadatenprüfung wie bei den bereits gesondert behandelten `needs`-/`job`-Feldern: strikt prüfen und erhalten, nicht ungeprüft wegstrippen oder in jeder Kommandoliste als obligatorisches Nullfeld vervielfachen. `attempt.approach` unverändert. Bindung zu genau einem `seq`, passender Scope, Quellenzitat und unterstützter Ausführungskategorie prüfen. Vor `mapPlan`-Aktionspriorität normalisieren; die mechanische Stealth-Hauptaktion verdrängt dann nicht mehr die qualifizierte Handlung. Keine pauschale Freigabe zusätzlicher Mains oder mehrerer Reiseziele.
2. **Autorisation:** `go` und `journey.continue` behalten ihre bestehenden Prüfungen; Continue **nicht** direkt durch ein erfundenes Ziel ersetzen. Erst `continueOptions`/Intent/Journey auflösen; mehrere Optionen weiterhin Clarify. Zusatz auf der tatsächlich autorisierten `auth.gos`-Position mit `seq`, Startort, Scope und vorhandenem Ziel/Intent transportieren. Der Serializer in `turn.js` und der Hostrecord müssen diese Angaben erhalten. Im Pending-/Refused-Fall kein lokaler Stealth-Wurf.
3. **Lokaler Schritt:** `moveStep` genau einmal ausführen, maximal das bisherige Band. Wenn der Schritt wirklich stattfindet und kein Kampf/Pending vorliegt, bestehende Stealth-Probe gegen die lokalen Beobachter; kein Wegwechsel und kein Erreichen eines neuen Ziels daraus ableiten. `move` darf durch die Normalisierung nicht als ungenutzte Nebenaktion verschwinden.
4. **Reiseabschluss:** `.155`-Ankunftspunkt im World-Abschluss weiterverwenden: gültige Ankunft → akzeptierte lokale Belegung/Living-Slotnachholung → Stealth → abschließende automatische Wahrnehmung/Combatöffnung. Kein Übertragen des Quellraum-Concealments und keine vorzeitige Probe gegen später erst materialisierte Gegner. Existierende Fallen-/Zugangs-/Raumverbindungsprüfungen beibehalten.
5. **Scope und Unterbrechung:** Bei `action` gilt nur die wirklich erreichte Etappe, nicht die gesamte behauptete Wegstrecke. Bei `destination` aktiviert ein Zwischenhalt den Zusatz noch nicht: kein Check gegen Hesk, keine verbrauchte Zielprobe, keine falsche Erfolgsmeldung. Zielbestätigung an den bestehenden aufgelösten GO-/Intent-Ankunftspfad binden, nicht an beliebiges `arrive` oder ein Prosa-Ortslabel. Bei unbekanntem Suchziel erst dessen reguläre Erfüllung verwenden; ist sie nicht bestimmbar, keine Zielprobe vortäuschen. Eine spätere Nachricht übernimmt keine pauschale Stealth-Erlaubnis automatisch.
6. **Ergebnis und Darstellung:** Bestehende `check.recorded`-/Awareness-/Concealment-Events, RNG-Cursor und `seq`/Ort nutzen. Das System sagt entweder „Reise nicht erfolgt“, „Zwischenhalt; Zielannäherung noch nicht geprüft“ oder zeigt das tatsächliche Ergebnis. Der Narrator erhält vorab autorisierte Bewegung/Scope und „Detection pending“; Korrekturen nachher führen tatsächlichen Ort/Ergebnis weiter. Eine perfekte erste Prosa ist nicht garantierbar: keine verbotene Ankunft aus Prosa erzwingen, keine automatische Narrator-Neugenerierung oder neuer Pflichtcall.

**Combat-/Wirkungsgrenze:** Erfolg heißt nicht universelle Unsichtbarkeit. `.155`-Behandlung narrativ vorweggenommener Entdeckung erhalten, aber nicht pauschal auf alle späteren Handlungen ausweiten. Kein bereits bestehendes unabhängiges Kampfcommitment, tatsächlicher Angriff, Falle oder mechanisch auffälliger Effekt wird durch ein allgemeines Stealth-Flag annulliert. Der ursprüngliche Kampf-/Envelopepfad bleibt maßgeblich. Geräusche sind derzeit kein vollständiges eigenes Simulationsmodell; keine heimliche Zusage, Explosionen, Gewalt oder beliebige spätere Wirkungen würden unbemerkt bleiben. Fälle ohne abgrenzbaren Zeitpunkt/Wirkungsbeleg bleiben außerhalb der automatischen Unterstützung.

## 6. Umsetzung S2 – sichere lokale Vorhaben auf derselben Grundlage

Fachlich separat freigebbar, kein Anlass, den Modifiervertrag neu zu erfinden:

- Zunächst **lokaler Search und TAKE eines bekannten freien Objekts**. Keine fremde NPC-Verwahrung, unbekannte Zukunftsware oder Zielort-TAKE vor Ankunft.
- Bestehenden Handler genau einmal durchlaufen. Verweigert/Clarify/„bereits gehalten/gesucht“: keine neue Detection-Probe, kein neues Concealment und kein erneutes Fund-/Mengenereignis. Keine Simulation durch zweimaliges Handler-Ausführen.
- Bei zulässiger lokaler Ausführung gegen die dort bereits kanonischen Beobachter prüfen; Ergebnis noch vor Narrator liefern. Für Search PER-Suchergebnis und Stealth-AGI-Ergebnis getrennt persistieren. Search liefert `authorized` plus ausgeführte `searchChecks`, nicht notwendigerweise `resolved`: Ausführung an diesem tatsächlichen Suchrecord erkennen, nicht allein am Statuswort. Ein fehlgeschlagener Suchwurf kann trotzdem unbemerkt bleiben, ein Fund kann bemerkt werden.
- Bei TAKE bleibt die erlaubte Aufnahme eine Aufnahme, auch wenn sie entdeckt wird; Fehlschlag bedeutet hier zunächst „bemerkt“, nicht automatisch Objekt zurückbuchen, Schaden oder Angriff. Für „nur nehmen, wenn unbemerkt möglich“ zunächst Clarify bzw. gesonderte Freigabe statt einer versteckten Diebstahl-/Rollbackmechanik.
- Kein nachträglicher Erfolg gegen neu erfundene Beobachter: ein Check über aktuelle Anwesende ist kein Beweis gegen später hinzukommende Personen. Deren echte spätere Wahrnehmung/Reaktion bleibt zulässig. Wer bereits als wirksamer Beobachter derselben lokalen Handlung gelten soll, muss zum Ausführungszeitpunkt kanonisch etabliert sein. Die Vorbuchung sämtlicher Gegenstands-/Suchaktionen bis nach der Erzählung zu verschieben wäre ein größerer Architekturumbau und ist **nicht** empfohlen.
- Kein allgemeines `manner` auf `other`, Craft, Fähigkeiten oder Feature-Attempts freischalten. Neue fachliche Unterstützung später nur an demselben Normalisierungs-/Prüfpunkt einhängen, wenn Durchführung, Beobachter und Wirkung bestimmt sind; keine neuen Satzfilter.

## 7. Risiken und Grenzen

| Risiko | Begrenzung |
|---|---|
| Modifier geht im Schema/Routing/Serializer verloren | Vollständige Planner → Commands → Outcome → World → Fold-Kette prüfen, nicht nur `mapPlan`. |
| Fahrt bis zum Ziel wird fälschlich als Hide am Zwischenhalt aufgelöst | Scope und eindeutige vorhandene Zielbindung; Original Hesk-Kette als Pflichtfall. |
| Jede Handlung bekommt kostenloses Hide | Unterstützungsgrenzen, tatsächliche Ausführung und eigenständiges Hide unterscheiden; Combat/Pending vor Modifier prüfen. |
| Neue Probe überdeckt Search-/Feature-Ergebnis oder wiederholt RNG | Eigene `what`/`seq`-Zuordnung, bestehende `searchChecks` erhalten, Events falten statt nach Reload würfeln. |
| Vermeintlich lautlose Handlung annulliert echte Wirkungen | Keine universelle Geräuschimmunität, kein pauschales Pending-Clearing für lokale Aktionen; begrenzter S2-Umfang. |
| Modell schreibt erneut falsche Reihenfolge | Ein vorhandener Repair; sonst sichere gezielte Clarify, kein verlorenes Hauptvorhaben durch Rückfall auf Quellraum-Hide. |

S1: mittlerer Aufwand/mittleres Integrationsrisiko, vor allem Timing und Vertragsdurchreichung. S2: zusätzliches mittleres Risiko durch unabhängige Such-/Transferereignisse. Keine neue Stealth-Ressource, Schleichen-Geschwindigkeit, Geräuschtabelle, Observer-KI oder permanente Stealthhaltung.

## 8. Regressionen und Abnahme

Zuerst auf unverändertem `.155` Rot nachweisen, soweit ein echter Defekt/noch fehlender Vertrag vorliegt; bestehende funktionierende Kontrollen nicht künstlich ändern. Neue Tests bei späterer Umsetzung, **jetzt keine Tests angelegt/ausgeführt**.

| Gruppe | Verbindliche Fälle / erwartetes Ergebnis |
|---|---|
| Original / Routing | I73/I74 mit Originalvorzustand und gespeicherten Antworten: ursprünglichen Quellraum-Wurf belegen. Neue Vertragsantwort für **denselben Originaltext** separat kennzeichnen: Continue am richtigen Intent, keine Hesk-Probe, tatsächliche Zielankunft und Zielbeobachter. Alter ungebundener Plan darf sicher nachgebessert/geklärt werden, nie still am Quellort verstecken. |
| `.155` erhalten | `fix155_sneak_movement.test.js`: gebundenes GO, Reihenfolgevarianten, leere/volle Zielräume, dynamische Slotpopulation, mixed awareness, Ambush, Türen/Gates, Edit/Swipe/Reload unverändert. |
| Reisegrenzen | Fehlender/mehrdeutiger Intent; unbekanntes Ziel; keine Ankunft; blockierter Weg; `arrived:false`; erzwungene Verlagerung; realer Zwischenhalt. `destination` dort noch ohne Check/Concealment; spätere unabhängige Nachricht ohne eigenen Zusatz nicht automatisch heimlich. |
| Wahrnehmung | Erfolg/Fehlschlag, mehrere Beobachter, aware→suspicious statt unverdientem Ambush; keine Beobachter → kein Detection-Wurf; Slotgegner vor Check; tatsächliche Unterbrechung/Angriff wird nicht als globale Stealthimmunität entfernt. |
| Lokale Bewegung | Eine Person/Gruppe, ein Band; keine zusätzliche Bewegung; kein Ortswechsel; keine zweite Hauptaktion. Normales Move/Hide/GO und aktive/Pending-Combat-Gegenfälle. |
| Trennung | „Heimlich betreten“ vs. „gehen, danach unter Bett verstecken“; „verstecken und warten“; Angriff plus Hide; echte unabhängige Schritte bleiben unabhängig. Bestehender Mehr-GO-Plan ohne Zusatz unverändert; eindeutig qualifizierte Etappe nicht auf andere Ankünfte übertragen, unklare Bindung sicher klären. Kein automatisches zukünftiges Handeln. |
| S2 / Search | Vier Kombinationen Sucherfolg/-fehlschlag × Stealtherfolg/-fehlschlag; Suche bereits erledigt; unveränderte Fund-/Zeit-/Wiederholungsregeln; die Stealthprobe darf Suchergebnis/Extractorgrenzen nicht ersetzen. |
| S2 / TAKE | Erreichbares Objekt/Teilmenge einmal; abwesendes Objekt, fremder Halter, geschlossener Behälter, bereits gehalten, unbekannte Referenz, nach GO noch ausstehende Ankunft: keine unberechtigte Aufnahme oder freie Probe. |
| Persistenz / Host | Deterministischer Event-Fold und Replay; Reload, UI-Swipe, Regenerate, Reply-/Input-Edit ohne doppelte Bewegung/Items/Checks; kein hängenbleibendes Pending. |

Angrenzend: Planner-/Agency-/Checks-, Feature/Search-, `patch7`/`patch8`-/Dungeon-, World-/Combat-/Hostregressionen. Danach Vollsuite, vollständiger Fingerprint-Replay mit einzeln erklärten Änderungen, echter isolierter ST-Standard-/Failsoft-Smoke mit Originaltext, Reiseunterbrechung und nächstem normalen Turn. Vorhandenen Stealth-Smoke erweitern, keine neue Runnerstrategie. Mockantworten beweisen den Hostvertrag, nicht natürliches GLM-Verständnis; letzteres anschließend im persönlichen Spiel prüfen, keine Pflicht-Vollbatchserie.

**Abgenommen ist das Fachpaket erst, wenn** kein gültiges Hauptvorhaben durch seinen Stealth-Zusatz verschwindet, nur passende reale Beobachter geprüft werden, alle Zugangs-/Combat-/Eigentumsgrenzen erhalten sind und die persistierten Ergebnisse bei Reload/Swipe gleich bleiben. Exotische Prosa ist kein Anlass für eine anschließende Wortlistenserie.

## 9. Vor Implementierung zu entscheiden

1. **Erster Umfang:** S1 allein oder S1+S2? **Empfehlung: S1 zuerst als vollständiges Bewegungs-Fachpaket**, S2 danach auf demselben Vertrag. Das schließt die reale Blockade, ohne zur Vorbedingung neue Diebstahl-/Geräuschregeln zu machen. Kein weiterer GO-vs.-Continue-Mikrofix.
2. **Lokale Stealth-Niederlage in S2:** Darf eine zulässige Aufnahme/Suche erfolgt sein, aber bemerkt werden? **Empfehlung: ja.** Keine automatische Rücknahme/Angriffsfolge; ausdrückliche „nur unbemerkt“-Vorbehalte sicher klären.

Der gemeinsame Modifier und die nötige nachvollziehbare Protokollrevision sind technische Empfehlungen dieses Plans; dafür muss der Nutzer keine JSON-Syntax auswählen. Reise nur am Ziel heimlich versus insgesamt heimliche Etappe richtet sich nach seiner konkreten Handlung, nicht nach einer globalen Einstellung.

Formeln, PP/LP, XP, Skillwerte, Wege-/Dungeonregeln und allgemeine Aktionsökonomie stehen nicht zur Änderung. Der [separate UI-/QoL-Plan](PATCH_USER01_UI_QOL.md) kann den bekannten Awarenesszustand darstellen, darf diese Mechanik aber nicht vorwegnehmen.
