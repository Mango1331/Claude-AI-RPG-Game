# Avereth – konsolidierter Architektur-Fachplan nach vier Reviews

**Stand: 30.10.2026 · Basis: Build .126, Produktcommit [b8d2af4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b8d2af4b76cd0bc52ac178b8c500e5733878ecee).**  
**Status: zur letzten unabhängigen Gegenprüfung; noch nicht implementiert und keine Produktfreigabe.** Dieser Plan ersetzt die widersprechenden Fahrpläne der vier Reviewrunden. Produkt-/Abnahmestand bleibt in [03](../03_AKTUELLER_PROJEKTSTAND.md).

## 1. Quellen und Entscheidungsrang

| Quelle | Rolle |
|---|---|
| [1 – Claude: Architekturaudit](architekturaudit_126/01_CLAUDE_AUDIT.md) | Breite Bestandsaufnahme .126; eigener Testlauf 2429/2429 und lesende Sonden laut Bericht; neuere Batchzahlen dort teils nur aus Reviews. |
| [2 – Sol: Gegenfeedback](architekturaudit_126/02_SOL_GEGENFEEDBACK.md) | Codeprüfung und lesende Arten-/Gear-Sonden, keine neue Vollsuite; enthält spätere Nutzerklarstellung zu alten Kampagnen. |
| [3 – Claude: Gegenreview](architekturaudit_126/03_CLAUDE_GEGENREVIEW.md) | Präzisierte Nutzeranalyse; Verarbeitungs-Replay auf .98 laut Bericht 60/60 Antworten und 61/61 Spielerzüge, zwei Board-/Forge-Züge ausgenommen. |
| [4 – Sol: Entscheidungen/Präzisierungen](architekturaudit_126/04_SOL_ENTSCHEIDUNGEN.md) | Abschließende Chatbewertung, Designempfehlungen und drei technische Korrekturen; kein weiterer Testlauf. |
| [Batch-Originalkorpus](../testrun_10b/ARCHIV_BATCHES.md) | Vollständige verfügbare Batchdateien mit Prüfsummen; Originalreviews bleiben in den Runordnern. Archivierung ist kein neuer Replay- oder Abnahmenachweis. |

Frühere Empfehlungen sind keine automatisch gültigen Beschlüsse. Für diesen Plan gelten die folgenden Nutzerentscheidungen und übernommenen Planungsgrundlagen:

- **Keine Pflicht zur Weiterbespielbarkeit alter Kampagnen.** Historische Runs bleiben Fehlerbelege. Aktuelle Kampagnen müssen innerhalb des unterstützten Protokolls replay-/reload-/swipesicher bleiben.
- Aktuelles Produktziel: V4-C, Ruleset 2, drei Klassen und aktuelle F-Regeln. Nicht mehr benötigte Varianten abbauen, keine historische Policy-Engine neu bauen.
- Delivery/Escort ruhend erhalten; formale Privatquests bleiben abgeschafft. Freie Hilfe, Übergaben, Geschenke und Arbeit bleiben möglich.
- Bedingte Käufe erhalten; vorhandene reguläre Preise und Preislimits schützen. Kein neues Feilschen, keine Pflicht zu einem weiteren Einkaufszug.
- Reisen, Szenenfolge, NPC-Eigeninitiative und aktuelle Kampf-/Dungeonregeln bleiben unverändert. Einschränkungen dürfen später mit konkret belegtem Gewinn vorgeschlagen werden.
- Keine XP-, PP-, Startwert-, Preiswert-, Damage- oder Main/Minor-Balanceänderungen in diesem Vorhaben.
- Batchveröffentlichung ist autorisiert; keine Schlüssel archivieren. Nur tatsächlich vorhandene/verifizierte Quellen als hochgeladen bezeichnen.

## 2. Ziel und belegte Ursachen

**Ziel:** Mechanisch relevante Bedeutungen einmal ausdrücklich festlegen und vorhandene Enginebuchungen weiterverwenden. Unsichere Namensableitung und unnötige historische Varianten reduzieren, ohne neue allgemeine Frameworks einzuführen.

| Ursache | Beleg / betroffener Weg | Einordnung |
|---|---|---|
| Population aus wechselnden Namenswörtern | `domain.populationAt` → `engine.materialise` → `guild.defeatTally/cullKind`; Batch19 Records214/218/272, zusätzliche stag/hind/alpha/tusker-Sonden | Bestätigte Fehlerklasse; .126 behebt konkrete Fälle, nicht alle Bezeichnungen. |
| Gearprofil aus Angebotsname, Preisprosa vor Enginepreis | `world.offerLines` → `items.itemProfile`/`qualityOf` → `gearRetailPrice` → `trade.bookPurchase`; Batch18 Paket, Batch19 finer-Schwert | Bestätigte Struktur; neuer Preisreihenfolgefall vor Umsetzung noch als Regression reproduzieren. |
| Fehlerhafter Fold wird weiterverwendet | `host.foldChat` fängt Reducerfehler, Runtime nutzt `.state` | Bestätigter Codepfad; kein nachgewiesener Schaden der jüngsten Batches. |
| Testdefaults häufig historisch | `tests/helpers.js`, `tests/v4/harness.js`; aktuelle direkte Tests existieren ebenfalls | Verbesserungsbedarf, keine pauschale Entwertung der 2429 Tests. |
| Historische Varianten ohne aktuellen Produktbedarf | `f_*`, `starter_aoe`, private Quests, V3/V4-A/Ruleset1 | Durch Nutzerentscheidung entfallene Anforderung; gemeinsame aktuelle Funktionen bleiben. |

Keine Begründung für einen Umbau allein aus Regex-Anzahl, Dateigröße oder alten .98-Repairquoten. Keine Behauptung, geschlossene IDs würden semantische Modellfehler vollständig ausschließen.

## 3. Prioritäten und Abhängigkeiten

| Paket | Priorität / Umfang | Abhängigkeit | Abnahmeziel |
|---|---|---|---|
| **A – Integrität und aktuelle Testbasis** | Hoch; mittlerer Umfang | Keine Produktänderung davor nötig | Foldfehler verursachen keine Buchung; Verarbeitungskorpus und aktuelle Integrationskette belastbar. |
| **B – Kleiner Variantenabbau** | Hoch; mittlerer Umfang | A | Aktuelle Regeln ohne unnötige F-/Privatquest-Legacyzweige, gleiche aktuelle Mechanik. |
| **C – Kreaturen und Jagdidentität** | Hoch; mittlerer Umfang | A, vorzugsweise B | Originalfehlerklasse ohne Wortlistenserie; korrekte Art-, Alters-, Level- und Creditgrenzen. |
| **D – Strukturierte Angebotserzeugung** | Hoch; mittlerer Umfang | A, vorzugsweise B; unabhängig von C | Gearvorlagen, Pakete und Enginepreise korrekt; bestehender Kaufpfad bleibt. |
| **E – Größerer historischer Pfadabbau** | Danach; größerer Umfang | A; aktuelle Funktionen vorher eindeutig erfasst | V3/V4-A/Ruleset1-Spielpfade entfallen ohne Beschädigung des aktuellen C-Pfads. |
| **F – Natürliche Messung** | Nach C/D, E muss nicht blockieren | Technische Abnahme | Fehler/Repairs und tatsächliches Gameplay messen; keine vorsorgliche Mikrofixserie. |

Pakete sind fachliche Einheiten, keine Aufforderung zu einer großen Anzahl kleiner Releases. B/C/D können nach Freigabe innerhalb einer zusammenhängenden Umsetzung mit getrennt prüfbaren Commits erfolgen. Konkrete Buildnummer erst anhand des dann aktuellen HEAD vergeben. Kein laufender Batch wird aktualisiert.

## 4. Paket A – Zustandsintegrität und überprüfbare Verarbeitung

### A1 – Verarbeitungs-Replay

Aus vorhandenen Originalrecords einen begrenzten, reproduzierbaren Offline-Korpus erstellen. Keine Provideranfragen für diesen Testschritt.

- Antwortfall: aufgezeichneter Vorzustand, Narration und finale Extractorantwort erneut durch den tatsächlichen World-/Replypfad ausführen.
- Spielerfall: Originalinput und aufgezeichnete Modellantworten am LLM-Einstieg einspeisen, anschließend tatsächlichen Runtime-/Planner-/Commandpfad prüfen.
- Zwei Ebenen unterscheiden: gezielte Verarbeitung eines Originalvorzustands und eine zusammenhängende Zugkette. Erstere lokalisiert Fehler, letztere erkennt Folgeschäden.
- Raw-Board-/Forge-Antworten einbinden, soweit tatsächlich vorhanden. Fehlende Daten als übersprungen mit Grund ausweisen. Gespeicherte fertige Forge-Einträge ersetzen keine Prüfung des Forgeparsers.
- Baseline auf dem gewählten aktuellen Ausgangscommit festhalten, nicht den alten Originalbuild als zwingenden Sollwert für neue Regeln verwenden. Neuere verfügbare Batches liefen auf .125/.123/.122, nicht automatisch auf .126.
- Eventarten, Reihenfolge, IDs, Geld, Inventar, Ort, Quests, Kampfzustand und RNG vergleichen. Nur benannte volatile Diagnose-/Zeitfelder ausnehmen; keine pauschale Normalisierung, die fachliche Unterschiede verbirgt.

Ein historischer Event-Fold bleibt eine eigene Prüfung der Reducer. Er ersetzt A1 nicht. Bereits gespeicherte Fehler dürfen nicht allein durch identische Wiederholung zur richtigen Baseline erklärt werden.

### A2 – Fehlende Aufzeichnungen gezielt schließen

`runtime`-Records und Board-/Forge-Aufrufstellen prüfen. Vollständige entscheidungsrelevante Antworten statt abgeschnittener `plan.raw` speichern; Boardantworten samt Repairfolge erhalten. Bereits vorhandene Completion-Logs zuerst nutzen. Keine redundante zweite Vollkopie aller Requests im Chat nur für den Testzweck erzeugen. Schlüssel und Authheader werden nie gespeichert.

### A3 – Foldfehler begrenzt sperren

Betroffen: `src/host.js:foldChat`, V4-Runtime vor Planner/World-Buchung, `index.js` als Anzeige-/Abbruchgrenze.

- Foldfehler vor neuer autoritativer Verarbeitung auswerten. Kein Planneraufruf, keine Zahlung, kein Kampfzug und kein Eventcommit aus einem unvollständig aufgebauten Zustand.
- Sichtbare Meldung mit betroffener Nachricht/Eventart und Wiederherstellungsoption; keine erfundene Zustandsreparatur und kein stilles Überspringen.
- Erneutes Laden eines gültigen Standes beziehungsweise Regenerate nach echter Korrektur muss funktionieren. Lesbare Rohhistorie/Export erhalten; einen partiellen Zustand nicht als gültigen HUD-Stand ausgeben.
- Nicht mit fail-soft für ein unwichtiges verworfenes NPC-Delta verwechseln. Ein gültiger Zustand mit einer abgewiesenen Erzählangabe darf normal weiterlaufen.

### A4 – Aktuelle Testkonfiguration

Neue Harness-Defaults behalten aktuelle Produktflags und Produktcontent. Historische Testfälle sichten: Sicherheitsabsicht übertragen, ausschließlich veraltete Zahlen-/Pfaderwartung entfernen. Keine rote Assertion allein deshalb umschreiben, weil sie stört. Aktuelle vollständige Kette Erstellung → Gilde → Jagd → Kampf → Verkauf/Kauf → Fortschritt ergänzen.

**Abnahme:** gültige Kette inklusive Reload/Swipe; injizierter Foldfehler ohne jede neue Buchung/Provideranfrage; bestehende erlaubte sichere Fortsetzung bleibt. Gezielte Rot-/Grünfälle, angrenzende und volle Node-Suite. Echter ST-Smoke für Host-/Recordänderungen, einschließlich gespeicherter Records nach Reload. A1 weist Abdeckung und Auslassungen numerisch aus.

## 5. Paket B – Aktuelle Regeln ohne historische Schalter

Betroffen: `engine.startCampaign`, `domain`, `guild`, `items`, `skills/growth`, private Questzweige, Harness/Fixtures und zugehörige Anzeigen/Prompts. Exakte Nutzerliste im Implementierungsdiff festhalten.

- `f_progression`, `f_balance`, `starter_aoe` nicht länger als Trennung alter/neuer Kampagnen auswerten, soweit sie keine echte aktuelle Auswahl steuern. Aktuelle Werte bleiben identisch.
- `.126`-Jahrlingsoption zugunsten der aktuellen einheitlichen Regel entfernen.
- Verarbeitungs-/Anzeigewege formaler Privatquests entfernen, die nur für alte Kampagnen bestehen. Gemeinsame Guild-Funktionen, freie Arbeit, NPC-Geld-/Sachgeschenke, Fakten und Erinnerungen bewahren.
- Kein großer Ruleset1-/V3-Abbau innerhalb B. Keine Preis- oder XPkalibrierung nebenbei.

**Versionsschutz:** Eine kleine Kampagnen-Kompatibilitätskennung verwenden; vorhandene Startmetadaten zuerst prüfen. Sie ist keine Policytabelle und nicht die Buildnummer. Nicht unterstützte/fehlende Kennung nach einer tatsächlich inkompatiblen Umstellung sperrt neue Züge mit klarer Meldung, kein stiller Upgradeversuch. Unterstützte aktuelle Saves bleiben nutzbar. Die Implementierung muss festlegen, bei welchem Paket die erste inkompatible Grenze entsteht.

**Abnahme:** aktuelle Ausgangskonfiguration vor/nach B fachlich gleich; freie Hilfe/Geschenke und Guild unverändert; keine Privatquestobjekte; Versionssperre ohne Geld-/Zeit-/Recordänderung. Aktuelle Replays und Vollsuite. Alte Saves müssen nicht weiterlaufen; Originalbelege werden nicht überschrieben.

## 6. Paket C – Ausdrückliche Population statt Namensrekonstruktion

Betroffen: `content/deltas.json`, `src/v4/extract.js`, `catalog.js`, `world.js:newEntity`, `domain.js:populationAt`, `engine.js:materialise`, `guild.js:defeatTally/cullKind` und Huntvertrag/-validator; Evaluator nur für Diagnose.

### Vertrag und Verarbeitung

1. Für neue frei erzeugte Outdoor-Kreaturen strukturierte Zugehörigkeit verlangen: gültige Populations-Orts-ID aus dem Ereignisort und seinen Vorfahren oder ausdrücklich `independent`. Bei entfernten Meldungen den bestätigten Ereignisort verwenden, nicht blind den PC-Ort. Eine Zuordnung erzeugt keine Anwesenheit.
2. Altersgruppe separat deklarieren. `adult`/`young` sind mechanische Kategorien für bisherige Regeln, keine neue Biologiesimulation.
3. Ein Mitglied erhält die kanonische Art und den Anker der referenzierten Population; freier Individuenname/Beschreibung bleibt möglich. Strukturell widersprüchliche Angaben, falsche Ortslinie oder unbekannte Population ablehnen.
4. **Ungültige Referenz niemals zu independent umdeuten.** Vorhandene Repair-/Fail-soft-Mechanismen verwenden, keinen zusätzlichen Retrykreis bauen. Bei endgültiger Ablehnung nur betroffene Kreatur und wirklich abhängige Wirkungen verwerfen; unabhängige gültige Deltas erhalten.
5. Kein Textfallback für das neue Protokoll. Legacy-Testkonvertierung gehört in Testwerkzeuge, nicht in den Produktpfad.
6. Echte Living-Dungeon-Slots bleiben Eigentümer ihrer Population/IDs/Level. Die Outdoorreferenz darf weder diese Vorgaben ersetzen noch Slotgegner doppelt erzeugen. Schema-/Promptumfang für Dungeonmeldungen ausdrücklich festlegen, keine sinnlosen Outdoorpflichten erzwingen.

### Identität, Alter, Stärke und Credit getrennt halten

- Population legt die mechanische Art fest. Erwachsene erhalten ihr bestehendes Level-Fenster nach den geltenden Prioritäten.
- Jungtiere erhalten **nicht automatisch** das Erwachsenenfenster. Aktuelle individuelle, Dungeon- und ausdrücklich juvenile Vorgaben erhalten; ansonsten die bisherige Jungtierbehandlung nutzen. Kein neuer Altersmultiplikator.
- Entscheiden und testen, wie mechanische Mitgliedschaft gespeichert wird, wenn das Jungtierlevel außerhalb des Erwachsenenfensters liegt: Artmitgliedschaft darf nicht versehentlich Erwachsenencredit bedeuten. Bereits vorhandene Felder bevorzugen, keine doppelte gleichbedeutende Populationsquelle.
- Populationsjagden prüfen gespeicherte Zugehörigkeit, erlaubte Altersgruppe und tatsächlichen Tod/erlaubte Flucht seit Annahme. Jungtierziele bei Vertragsveröffentlichung strukturiert festlegen; später keine erneute Prosaableitung.
- Der Name darf weder Level noch Questcredit nachträglich umschreiben. Dungeonrollen und Personenziele nicht still auf dieselbe Outdoorregel umstellen.
- Kein neuer Kill-Verbrauch/keine Credit-Events: derzeit keine überlappenden gezählten Jagden. Diese Erweiterung bleibt separat.

### Verbleibender Modellfehler

Ein Modell kann bei gleichem Körperbau eine falsche, aber formal gültige Population wählen. Zunächst Diagnose im Evaluator statt neuem Produkt-Textveto. Fehlende gemeinsame Namenswörter sind nur ein Hinweis; die Diagnose steuert niemals Credit oder Level. Diese Grenze ausdrücklich im natürlichen Review beobachten.

**Regressionen:** Batch19 Records214/218/272 und unabhängige3/4-Kontrolle126; stag/hind/alpha/tusker ohne neue Wortlisten; Giant Boar≠Turtle; gleiche Anker/falsche Population; ausdrückliche unabhängige Kreatur; ungültige ID nicht downgraded; falscher/entfernter Ort; adult/young inklusive eigenem Juvenilenfenster; festgelegtes Individuum; entfernte Sichtung ohne Spawn; Dungeon-Slotidentität; Tod/Flucht vor/nach Annahme; Replay/Reload/Swipe.

**Abnahme:** strukturelle und fachliche Fehler mit getrenntem Rot-/Grünnachweis, Vollsuite und echter ST-Smoke wegen Extractorschema/-prompt. Protokollversionen und gegebenenfalls Kampagnenkennung nachvollziehbar erhöhen; eine Kartenänderung nur, falls der Narratorvertrag wirklich betroffen ist.

## 7. Paket D – Verbindliche Gearvorlagen am vorhandenen Angebot

Betroffen: Offer-Delta/Extractor, `world.js:offerLines`, `items.js:itemProfile/gearRetailPrice/gearOfferWhy`, `trade.js:bookPurchase/pickLines`, vorhandener Händlerkatalog und Anzeigen; Contentvorlagen, nicht neue Slots.

1. Mechanisch wirksame Gearzeile erhält unterstützte Basisvorlage und Qualitätsstufe. Profil/Slot/Rang/Werte aus Enginecontent, freier Verkaufsname getrennt. Unbekannte Vorlage ablehnen, nicht still Common oder Dekoration daraus machen.
2. Namen dürfen Common/Fine/Superior nicht mehr indirekt überschreiben. Eine unbekannte exotische Bezeichnung kann eine unterstützte Vorlage beschreiben; keine automatische Einführung neuer Mechanik, Völker oder Ausrüstungsslots.
3. **Regulärer Enginepreis vor Prosa-Preisprüfung:** erst Ware klassifizieren, dann ihre geltende Preisquelle wählen. Für reguläre F-Gearpreise keinen wörtlichen Narratorbetrag als Voraussetzung verlangen. Flexible Waren, Verkaufserlöse, Dienstleistungen und Geschenke behalten ihre eigenen Belegregeln.
4. Jede Zeile entspricht einer tatsächlichen Vorlage/Quantität. Schwert+Rüstung ist ein Angebot mit zwei Zeilen, nicht ein Objekt mit verschmolzenem Profil. Ein Einkauf darf weiterhin mehrere Zeilen atomar kaufen.
5. Vorhandene `offer.created`, Zeilen-IDs, Profil-Snapshot, `bookPurchase`, Verkäufer-/Orts-/Geld-/Mengenprüfung, Zustimmung und einmalige Buchung wiederverwenden. Keine zweite Shopengine.
6. Gleicher-Zug-Kauf nur bei bereits ausreichend bestimmter Zustimmung zu diesen Waren/Quantitäten und gültigem Preislimit. Eine Preisänderung nach abweichend erzähltem Preis darf nicht über eine unzureichende frühere Zustimmung abbuchen. **Erhalt der Sicherheitsanforderung**, nicht zwingend bytegleiches Belassen jeder bisherigen Bedingung.
7. Enginewerte und verbindliche Preise sichtbar machen. Bestehende Anzeigen ergänzen, kein zweites Angebots-UI. Kanonische Fachhändlerangebote und Narratorangebote dürfen die Preis-/Profilregel nicht gegenseitig umgehen.
8. Standardsortiment und Quelldefinitionen wiederverwenden. Skillmaterial, Lootverkauf, freie Sachgeschenke und Unterkunft nicht ungefragt neu modellieren. Falls derselbe Gear-Gegenstand später aus einem Angebot übernommen wird, dessen gespeichertes Profil nutzen, keine zweite Namensauswertung.

**Regressionen:** Original Batch18 Paket; finer/better/improved mit expliziter Vorlage/Qualität; unbekannte Basis; mehrere Zeilen mit Gesamtlimit; fehlender/abweichender Preisbeleg bei regulärem Gear; flexibler Verkauf/Geschenk weiterhin belegpflichtig; Geld knapp/kein anwesender Verkäufer; vorab begrenzter Kauf; Preiskorrektur ohne unberechtigte Abbuchung; identische Wiedernennung; kanonische/narrative Angebotspfade; Buy→Equip-Profilgleichheit; Replay/Reload/Swipe.

**Abnahme:** Originaldefekte vor Änderung rot, positive Kontrollen dokumentiert; Vollsuite, ST-Smoke wegen Protokolländerung; reguläre Preiswerte selbst unverändert. Keine natürliche Erfolgsbehauptung vor dem nächsten Batch.

## 8. Paket E – Historische Ausführungspfade begrenzt entfernen

Erst nach Nutzungskarte der Funktionen: V3-Runtime, V4-A und ausschließlich historische Ruleset1-Zweige entfernen. `interpret.js` wird teilweise vom Planner genutzt; `intent.js` trägt Erstellung, Steuerbefehle und Hilfsfunktionen; `delta.reportToEvents` verarbeitet weiterhin aktuelle World-Deltas. Diese nicht pauschal löschen.

Aktuelle Combat-Zielauflösung darf nicht allein wegen V3-Dateiname entfallen. Benötigte gemeinsame Funktionen können klein herausgelöst werden. Kein allgemeines WorldTxn und keine vollständige Neuorganisation von `world.js` als Vorbedingung.

Reine Strukturcommits müssen gegenüber einer freigegebenen aktuellen Baseline dieselben fachlichen Events und Zustände erzeugen. Diagnose-/Metadatenänderungen separat ausweisen. Sicherheitstests übertragen, rein historische Zahlen-/Klassenfixtures nicht weiter als Produktanforderung behandeln. Delivery/Escort unverändert ruhend lassen.

## 9. Gemeinsame Abnahme und natürliche Beobachtung

- Vor jeder Umsetzung HEAD und zwischenzeitliche Änderungen prüfen; Rotnachweis nur für tatsächlich bestätigte Fehler behaupten.
- Gezielte Tests, angrenzende Regressionen, abschließend vollständige `npm test` pro freigegebener Fachabnahme. Bei Host-/Modellschnittstellen echten ST-Smoke ausführen und gespeicherte Records nach Reload prüfen. Zahlen tatsächlich berichten.
- Identitäts-, Orts-, Geld-, Kampf-, Quest- und RNG-Invarianten gemeinsam prüfen. Aktuelle Swipes/Reloads buchen nichts doppelt.
- Produktcode/technische Abnahme auf Dev, Status/Kanon auf main. Originalreviews und Exporte unverändert lassen; keine lange Ergebnisduplizierung.
- Nach C/D natürlicher unveränderter Guildbatch aller drei Klassen, idealerweise bis angenommener E-Klasse. Keine künstlichen Erfolge, keine Fixtures und kein gleichzeitiges Balancing.
- Messen: erfolgreiche mechanische Aktionen, verwendete Eingaben/Zeit, Repairursachen, sichere Fortsetzungen, verlorene World-Vorgänge, tatsächliche Integritätsfehler. Artzuordnungen, Gearwerte, Pakete und Equip besonders prüfen. Regelgebuchter Tod/Spielerfehler nicht als Enginebug umetikettieren.

**Zurückgestellt:** Reisegefahrenwurf, Ein-Szenen-Regel, strikt zweizügiger Einkauf, neue Kill-Credit-Verwaltung, Foldcache, große Savesanierung, weiterer Prompt-/Modellumbau ohne Vergleichsdaten. Main/Minor bleibt eigener bestehender Plan.

## 10. Letzte Reviewfragen vor Freigabe

1. Entfernt B wirklich nur historische Unterschiede, ohne unbemerkt aktuelle konfigurierte Regeln zu verändern?
2. Kann C Artidentität, Jungtiergrenze und Levelprioritäten ohne doppelte Zustandsquelle abbilden? Ist eine ungültige Referenz überall sichtbar und lokal begrenzt?
3. Prüft D Zustimmung und Gesamtpreis auch bei automatisch erzeugten Angeboten und Paketen korrekt?
4. Erfasst A den tatsächlichen World-/Commandpfad und macht fehlende Board-/Forge-Aufzeichnungen sichtbar?
5. Welche konkrete Codeabhängigkeit fehlt noch? Welche vorgeschlagene Änderung lässt sich streichen, ohne das Ziel zu verlieren?

Nach dieser Prüfung fachlich freigeben oder konkrete Blocker benennen. Keine weitere vorsorgliche Reviewkette und keine Umsetzung allein aufgrund dieses Plans.
