# Avereth .200 – Spielfluss, Flexibilität und Spielerunterstützung

**Stand: 17.11.2026 · Bestätigtes Nutzerziel und offene Prüfideen, KEINE Implementierungsfreigabe.**
Dies ist das aktuelle Briefing für die laufende Astra-Ultra-Abschlussanalyse und den anschließenden unabhängigen GPT-Gegenreview. Es ersetzt die früheren Empfehlungen, einen dynamischen GM als neue Produktarchitektur aufzubauen. [Status](03_AKTUELLER_PROJEKTSTAND.md) · [Kanon](02_DESIGN_KANON.md) · [Experimentarchiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md).

**Ergänztes Nutzerziel nach dem Gegenreview:** Langfristig ist eine videospielartige, kontextabhängige **gemeinsame Aktionsoberfläche** über der vorhandenen `.200` bevorzugt, ergänzt um optional bearbeitbares NPC-Gedächtnis und bewusst tolerantere Narration. Diese Richtung ist bestätigt; konkrete Schnittstellen, Risikoschwellen und Umsetzung bleiben zu entscheiden. Vollständige fortgeschriebene Bewertung: [Abschlussanalyse §§1–10](recherche/ANALYSE_200_VEREINFACHUNG_UND_NARRATORFREIHEIT_2026-11-17.md). Keine Wiederaufnahme der archivierten Alpha.

## Was wir wirklich erreichen möchten

- **Produkt `.200` erhalten, nicht ersetzen.** Die Engine ist weit fortgeschritten. Charaktererstellung, Kampfsystem, Leveln/Stats, Loot, persistente NPCs und World-Memory und vorhandenes HUD waren aus persönlicher Spielersicht sehr gelungen. Die Spielmechanik soll nicht neu entwickelt werden.
- **Weniger strenge Eingriffe** bei Reisen, Ortswechseln, Handel, Preisen, Zahlungen und Narrator-Weltfolgen. Die Kombination aus exakten Nachweisen, immer neuen Sonderfall-Validatoren und mehreren Reparaturanfragen erzeugte häufig erst die Blockaden. Untersuchen, **welche Klassen von Regeln ganz entfallen oder weicher werden können**, nicht nur wie dieselben Regeln schneller erfüllt werden.
- **Mehr Narratorfreiheit und Vertrauen.** Eine klar gewählte Reise, deren Ankunft der Narrator plausibel erzählt, sollte die Engine gegebenenfalls auch ohne perfekt ausgefülltes formelles `arrive` übernehmen können. Das ist eine **zu testende Lockerung**, keine pauschale Erlaubnis für ungewollte Ortswechsel oder erfundene Spielerentscheidungen.
- **Weniger unnötige physische API-Aufrufe.** Im Gespräch meint „Narrator“ jedes Aufrufen desselben GLM-Modells: Planner, eigentlicher Erzähler und Extractor sind **separate Modellrequests**, plus eventuelle Reparaturen. Die drei regulären Phasen und die *zusätzlichen* Repairs getrennt betrachten.
- **Spieler aktiv unterstützen.** Wo die Engine einen nachvollziehbaren Vorschlag hat, aber bei einer formellen Voraussetzung unsicher ist: statt mehrerer LLM-Reparaturen **„So übernehmen“ / „Bearbeiten“ / optional „Verwerfen“** mit editierbarem Vorschlag anbieten. Der Spieler darf bewusst Restunsicherheiten akzeptieren und im Test Feedback geben.
- **Freies RPG bleibt frei.** Spieler darf weiterhin alles in eigenen Worten schreiben; HUD-Buttons, ein optionaler Planner und direkte Enginebefehle sind Hilfen und keine Pflichtmenüs. Astra soll weitere vereinfachende HUD-/Spielerhilfen vorschlagen.
- **Gemeinsame Grundlage statt Sonderpatches:** Typisierte Eingaben, Vorschläge, Korrekturen, Quellen-/Revisionsbezug und sichere Speicherung möglichst wiederverwenden. Fachliche Aktionsregeln bleiben in der vorhandenen Engine. Ein größerer gemeinsamer Ansatz bedeutet keinen vollständigen Allzweckeditor im ersten Patch.

## Tatsächlicher Ausgangspunkt: Build .200

Der V4-C-Pfad nutzt bei normalen freien Eingaben **Planner → deterministische Engine → Narrator → Extractor/Firewall**. Kampfrechnung, Würfel, Treffer/Tod, Ressourcen und XP stehen **vor dem Narratortext** fest. Zusätzliche Reparaturrequests können einzelne Phasen mehrfach ausführen. Reine `#`-Befehle und Charaktererstellung haben deterministische Pfade.

- **Planner:** nützlich für Tippfehler, flexible Sprache, komplexe Aktionen wie Dash + Angriff, Hypothesen, Reihenfolgen und mehrdeutige Ziele. Seine Aufgabe entfällt nicht, aber bei **klar gewähltem Skill und Ziel** könnte er unnötig sein.
- **Extractor:** speichert **nicht** bloß bekannte Kampfzahlen, sondern auch neue Weltpersonen, Wissen, Gespräche, Versprechen und Orte. Beim rein mechanischen Kampf ist ein Extractor-Request eventuell vermeidbar; dessen Memoryfunktionen bei lebendigen Szenen dürfen nicht still verschwinden.
- **Sichtbarer Text ist noch kein gespeicherter Zug:** Die bestehende Engine zeigt teilweise bereits Narratorprosa, während der Extractor noch läuft; die nächste Eingabe wartet auf den Weltabschluss. Persönlicher Fehler vom 16.11.: Waldankunft erzählt, Extractor nach rund 121 Sekunden gescheitert, Folge-429, keine gebuchte Ankunft ([Audit](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md)).
- **Provider:** Featherless Chat mit GLM-5.3-Flash, 32.768 Gesamt-Kontexttokens, insgesamt 4 gleichzeitigen Kapazitätseinheiten, 4 für einen laufenden Request im persönlichen Setup. Ein Timeout auf dem Rechner beweist keinen abgeschlossenen Remote-Request. Reale Seriallatenz und vollständige Promptbudgets zählen, nicht nur „API kostet X“.

## Konkret zu untersuchende Ideen – keine fertigen Entscheidungen

### 1. Kontextabhängiges Action-HUD mit gemischter Spielerhandlung

Das bestehende Combat-HUD kennt Skills/IDs, MP-Kosten, Reichweiten, Gegner/IDs und Kampfreihenfolge; viele Angaben sind bislang nur Anzeige. **Vorschlag:** Skill + Ziel anklickbar wählen, optional zulässige Bewegung. Die Auswahl als **typisierte Engineaktion mit IDs** übergeben, nicht als bloßes missverständliches Textfragment. Der freie Chattext bleibt erhalten.

Das langfristige Ziel umfasst auch Bewegung, Verteidigung, Heiltränke, Gegenstände und andere tatsächlich verfügbare Aktionen. Keine separaten Mini-Mechaniken pro Button: vorhandene Aktionsökonomie, Initiative, Besitz, Ressourcen und Wirkungen nutzen. Uneingeschränkte Freitexteingabe mit bedarfsgerechtem Planner bleibt erhalten. Eine erkennbare Trennung zwischen mechanischer Auswahl und freiem Begleittext ist zu prüfen; unbegrenztes Sprachverständnis ohne Modell darf nicht behauptet werden.

Beispiel: Auswahl **Flame Lance → Goblin A** und zusätzlich freier Text „I shout to my party members to take the left flank“. Nur die gewählte Aktion ist mechanisch autorisiert; der Zuruf wird erzählt, gewährt Begleitern weder kostenlose Aktionen noch automatische Zustimmung. Weitere explizite Spieleraktionen aus dem Freitext dürfen nicht übersehen werden. Für komplexen Freitext ohne HUD oder echte Unklarheit bleibt der Planner möglich.

**Aufrufhypothese:** eindeutige HUD-Kampfrunde lokal rechnen → 1 Narrator-Request → gegebenenfalls 1 Extractor-/Memory-Request. Der zweite Aufruf muss fachlich begründet sein; **zwei Requests sind keine garantierte Pflichtzahl**. Vorhandene Kampf-/XP-/Skillregeln bleiben unangetastet.

### 2. Erzählt → vorgeschlagen → übernommen oder bearbeitet

Für glaubwürdige Ankunft, kleine Transaktion oder wichtige NPC-Abrede könnte die Engine eine **konkrete geplante Buchung** mit Quelle/Begründung zeigen. Aktionen **„So übernehmen“**, **„Bearbeiten“** (Text/Felder) und falls nötig **„Nicht übernehmen“**. Der Nutzer kann eine unvollständige Formangabe reparieren, ohne erneuten Modellaufruf.

Nur bei wirklicher Unsicherheit anbieten. Eine eindeutige typisierte Spielerentscheidung braucht keine zweite routinemäßige Bestätigung. Vor der Narration gebuchte Spieleraktionen und erst nach der Narration übernommene Weltfolgen haben unterschiedliche Revisionsrechte: Regenerate bucht keine Spieleraktion neu; eine letzte unabhängige Weltrevision kann gezielt ersetzt werden. Eine spätere abhängige Buchung begrenzt diese Freiheit.

Unterscheide **niedrig riskante, klar durch Spielerhandlung gedeckte Ereignisse** von hohen Risiken: keine erfundene PC-Zustimmung, beliebige Ortswechsel, gratis Kampfsiege, große Zahlungen oder NPC-Metawissen. Die genaue Schwelle wird bewusst im Test entwickelt. Bestätigte Effekte **nur einmal** buchen; bei Reswipe, Regenerate, Edit und Reload müssen frühere Erzählzweige getrennt bleiben.

### 3. Videospielartige Shops und kleine Zahlungen

Für normale Wirte/Grundgeschäfte wiederverwendbare Preise und Angebotslisten ähnlich dem bestehenden Questboard erwägen. Ein Bier, eine Mahlzeit oder Bettkosten sollten nicht stets neue freie Preisbeweis-/Reparaturketten auslösen. Nach klarer Handlung darf auch eine **kleine automatische Abbuchung** geprüft werden, selbst wenn der Text nicht jeden technischen Preisbeleg liefert.

**Präzisiertes Ziel:** Eindeutige kleine Käufe und Zahlungen möglichst ohne zusätzliche Pflichtbestätigung. Gewisse erzählerische Unsicherheiten dürfen bewusst akzeptiert werden, sofern Mengen/Geld/Autorität, einmalige Buchung und Korrigierbarkeit der letzten unabhängigen Weltfolgen erhalten bleiben. Kleine Beträge allein begründen keinen Kaufwillen; die Grenze für bislang unbekannte Preise und implizite Bestellungen bleibt offen.

**Nicht vorentschieden:** Ob nur der ausdrücklich bestellte Drink oder schon weitere implizite Kontexte einen Kauf begründen, muss der persönliche Test zeigen. Spieler kann ggf. bestätigen/bearbeiten/reswipen. Limits gegen doppelte Käufe, ungefragte hohe Abbuchungen und ausdrückliche Preisgrenzen bleiben wichtig. `#pay` existiert bereits in `.200` mit ID/Kartenlogik: **zuerst vorhandene Nutzung prüfen**, dann ggf. nutzerfreundlich erweitern. Auch `#buy` und ähnliche direkte Befehle sind mögliche, nicht beschlossene Erleichterungen.

### 4. Automatische Anzeige: Weltabgleich abgeschlossen?

Statt manueller Checkbox eine **automatische Statusanzeige** auf Basis der tatsächlichen Persistenz-/Requestphase:
1. **„Erzählung sichtbar – Weltabgleich läuft“**.
2. **„✓ Welt bestätigt und gespeichert – bereit für nächsten Zug“**.
3. **„⚠ Weltabgleich gescheitert – prüfen / bearbeiten / wiederaufnehmen“**.

Der Spieler darf **seinen nächsten Text bereits schreiben**, die nächste **mechanische Ausführung** aber erst beginnen, wenn der vorherige Zustand bestätigt gespeichert ist. Die Anzeige darf den Narratortext/das HUD nicht ständig irritierend neu darstellen. Transparente Recovery/Providerkapazität und freie Swipe-/Regenerate-Bedienung gehören zum Qualitätsmaßstab.

### 5. Weitere kreative Vereinfachungen ausdrücklich erwünscht

Astra darf aus bestehender Engine, HUD-Daten, Statuspanels und früheren Spielerfeedbacks **eigene Lösungen vorschlagen** – auch solche, die keine neuen API-Aufrufe benötigen. Bevorzugt **ganze Fehlerklassen** beseitigen statt Sonderfall-Regex oder zusätzliche Validatoren zu stapeln.

### 6. NPC-Gedächtnis als optionale Spielerhilfe

`#npc` zu einer umfassenderen, optional bearbeitbaren Einsicht in Fakten, persönliche Wissens-/Glaubenseinträge, Erinnerungen und Absprachen prüfen. Quelle, Perspektive und Änderungen sichtbar machen. Keine zweite Weltzustandsbank, keine heimlichen Retcons, keine automatische Verteilung privaten Wissens an andere NPCs. Ein Memoryfehler darf gezielt korrigiert werden, ohne weitere verpflichtende Modellreparatur. Mechanische Folgen wie Geld, XP, Inventar und Questabschluss werden nicht durch Bearbeiten eines Erinnerungstexts neu gebucht. Umfang älterer Korrekturen und technische Einsicht in Geheimnisse noch entscheiden.

### 7. Agency in der wirksamen Character Description

Die Narrator-Agency-Regel soll ausdrücklich und verständlich in der tatsächlich verwendeten Character Description stehen: freiwillige bedeutsame PC-Entscheidungen bleiben beim Spieler, die gewünschte Routineautonomie ist erlaubt. Kartenbeschreibung, Preset und dynamischer Enginekontext müssen dieselbe Grenze ausdrücken. Die `.200`-Quelldatei enthält bereits umfangreiche Agency-Regeln; ihr Vorhandensein beweist nicht die richtige Fassung im tatsächlichen persönlichen Modellrequest. Gelegentliche natürliche Fehler dürfen über Swipe oder gezielte Korrekturen behoben werden. Nicht erneut maximale Strenge oder weitere Pflichtprüfung als Standard einführen.

## Dokumentation und Gegenreviews

**Ausdrücklich freigegeben:** Vollständige neue oder überarbeitete Fachberichte auf `main`, im passenden Bereich insbesondere `recherche/`, ablegen, committen und pushen. Vorher Remote-HEAD prüfen, neuere Änderungen erhalten, historische Quellen bewahren. Dateipfade, Commit-SHA und GitHub-Links melden. Das ist ausschließlich Dokumentationsfreigabe; kein Auftrag für Produktcode, Builds, Provideraufrufe oder Änderungen an persönlichen ST-Daten.

## Abnahme und Entscheidungsweg

1. **Astra Ultra analysiert** die echte `.200` und frühere Änderungen/Fehler; die beiden großen Analysen und die beiden gescheiterten Architekturversuche sind **Beweismaterial, keine Richtungsentscheidungen**.
2. **GPT-Gegenreview** prüft unabhängig auf tatsächliche Spielfreiheit, Umfang, verbliebene Risiken, Einfachheit, HUD-Nutzung und unerwünschte neue Reparaturschleifen.
3. **Nutzerentscheidung vor Umsetzung**, besonders für bewusst gelockerte Reise-, Shop- und Weltfolgen. Kein Automatismus nach Testzahlen und kein neues Produkt ohne Auftrag.
4. Erst dann **kleiner vergleichbarer `.200`-basierter Prototyp** und **früher natürlicher Spieltest** mit echten zuvor gescheiterten Eingaben und freiem Folgegeschehen. Bewährte Mechanik und UI müssen erhalten bleiben.

**Leitmotiv:** Mehr Spiel, weniger Bürokratie. Nicht eine neue Engine, nicht dieselben strengen Regeln mit lediglich anderer Verteilung auf API-Aufrufe.
