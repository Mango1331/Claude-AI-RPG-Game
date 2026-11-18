# User05 `.202`: unabhängiger Gegenreview und begrenzte Fix-/QoL-Runde

**18.11.2026 · Analyse und Umsetzungsvorschlag, noch keine Implementierungsfreigabe.** User05 ist auf ausdrücklichen Nutzerwunsch **nach Phase C beendet**. Die Glimmerdeep-Quest bleibt offen; das ist kein fehlender Testauftrag. Nach Umsetzung und technischer Abnahme beginnt **User06 als neue Kampagne**, nicht als Fortsetzung dieses Bosskampfs.

## 1. Urteil und belastbare Grundlage

**Die `.202`-Mechanik trägt diesen Spielbogen überwiegend; die neue Bedienung ist noch nicht ausreichend praxistauglich.** Erstellung, Registrierung/Zahlung, Questannahme, PULSE-Unterbrechung, Reise, erster Käferkampf, AoE, Loot, Levelaufstieg, freie Statverteilung und Rast funktionieren im natürlichen Lauf. Der Bosskampf scheitert anschließend an einem reproduzierbaren Schnittstellenfehler, nicht an zu wenig Mana oder einer unklaren Spielerentscheidung. Zugleich erzeugt die Oberfläche unnötige Auswahl-/Sendeschritte und widersprüchliche Abschlussanzeigen. Eine kleine zusammenhängende Korrekturrunde ist sinnvoll; ein Architekturwechsel ist durch diese Daten nicht begründet.

Geprüfte Remote-HEADs vor der Dokumentation:

| Branch | HEAD / Bedeutung |
|---|---|
| `main` | `f074c1d3a52fbd901f004b16a542c1d2fdb5f32e`, Dokumentationsbasis einschließlich A–C |
| `experiment/action-hud-200-v1` | `6a92dcc650809eb16934a984c30ce0cf7c5cfe98`, Build `4.3.0-c.6.6.202` |
| `claude/c-planner-prototype-2026-10-02-gpt-c666` | `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`, eingefrorenes Produkt `.200` |

Grundlagen: [Arbeitsweise/Evidenzklassen](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [Kanon](../02_DESIGN_KANON.md), [Zielbild 08](../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md), [Action-HUD-Fachplan](../patch_plans_10b/FACHPLAN_ACTION_HUD_200_V1_2026-11-17.md), [vorige Abschlussanalyse](ANALYSE_200_VEREINFACHUNG_UND_NARRATORFREIHEIT_2026-11-17.md). Die später ausdrücklich freigegebenen Entscheidungen zu sichtbarem Begleittextmodus, begrenzter Routineautonomie und fehlenden automatischen Retries bei unbekanntem Remoteabschluss gelten weiter.

**Primärbelege:** alle zwölf Textoriginale, vier Screenshots, drei Manifeste, Spielerfeedbacks und GPT-Auswertungen im [Runordner](../testrun_10b/user-20261118-011503/README.md). Alle **16 Original-/Bildhashes** stimmen mit den Manifesten überein. Die späteren Chats enthalten die früheren Nachrichten unverändert; Eventexport und Chatrecords stimmen überein. A/B/C sind ein fortlaufender Test. Die Completiondateien enthalten jeweils zusätzliche Requests und dürfen addiert werden, die kumulativen Chats/Events nicht.

**Selbst ausgeführte Gegenproben:** Originalantworten durch den unveränderten `.202`-Parser und HUD-Validator; Originalzustände mit `foldChat` rekonstruiert; Aktionsprojektion auf diesen Zuständen; kontrollierte Statusübergänge mit den tatsächlichen Funktionen aus `index.js`; unabhängige Auszählung der Requestlogs und historischer User04-Daten. Details einschließlich aller sechs Antworten: [abgeleiteter Prüfbeleg](../testrun_10b/user-20261118-011503/GEGENREVIEW_ASTRA_PROBEN_2026-11-18.json). Das sind **lokale Read-only-Proben**, keine neue natürliche oder echte Browserabnahme. Keine Provideraufrufe, Vollsuites, Builds oder Produktänderungen.

## 2. P1: F-HUD scheitert am Bindungsvertrag

### Unabhängig reproduzierter Fehler

Alle sechs Eingaben wählen denselben Skill und denselben lebenden Boss mit jeweils eigener Auswahl-ID. Sie enthalten den automatisch eingesetzten Text `Flame Lance → Glimmer Queen`, keine versteckte zusätzliche Handlung. Der aktive Kampf nutzt den kürzeren Fight-Planner. Vorherige F-HUD-Eröffnungen außerhalb eines laufenden Kampfes gelangen über den Story-Planner; auch dort liegt derselbe unpräzise Zusatzvertrag vor. Dass fünf Fight-Antworten scheitern, beweist keine generelle Unfähigkeit des Modells oder jedes Kampfplanners.

| Chatindex | Position von `hud_binding` im Original | `.202`-Gegenprobe | Gebuchte Events | Plannerzeit |
|---|---|---|---:|---:|
| I42 | innerhalb `commands[0]` | verweigert | 0 | 7,002 s |
| I44 | neben `commands` an der Wurzel | akzeptiert | 4 | 6,282 s |
| I46 | innerhalb `commands[0]` | verweigert | 0 | 17,586 s |
| I48 | innerhalb `commands[0]` | verweigert | 0 | 6,091 s |
| I50 | innerhalb `commands[0]` | verweigert | 0 | 5,681 s |
| I52 | innerhalb `commands[0]` | verweigert | 0 | 6,847 s |

Code: [`plannerRequest`/`parsePlan`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/planner.js#L374), [`reconcileHudPlan`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/action_input.js#L129), [`plannedRecord`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/runtime.js#L343).

Der Hauptprompt zeigt nur `{"commands":[...]}`. Der nachgeschobene HUD-Text verlangt „Add hud_binding … to your object“, ohne das vollständige äußere Antwortobjekt abzubilden. `parsePlan` liest ausschließlich `value.hud_binding`; die fünf verschachtelten Angaben erscheinen daher als fehlende Bindung. Der Pfad liefert `hud_conflict`, ohne gewöhnlichen Format-Repair, und die Laufzeit verweigert vor der Buchung. **Die Ablehnung schützt die Mechanik, die missverständliche Formvorgabe verursacht vermeidbare Bedienungsabbrüche.** Das erklärt die beobachteten Antworten; warum das natürliche Modell gerade diese Form wählte, bleibt eine plausible Promptursache, kein experimenteller Kausalbeweis.

Die fünf Fehlversuche verbrauchten zusammen **33.110 Prompttokens und 43,207 s gemessene Plannerzeit**, ohne N/X oder mechanische Aktion. Dies sind fünf vom Spieler ausgelöste Versuche, keine nachgewiesene automatische Retrykette.

### Empfohlene Korrektur

1. Einen identischen vollständigen Antwortvertrag für Fight- und Story-Planner verwenden: `commands` und `hud_binding` ausdrücklich als Geschwister; vollständiges Beispiel mit echten Auswahl-IDs. Kein zweites konkurrierendes Format am Promptende.
2. Eine **enge Formnormalisierung vor der bestehenden Bindungsprüfung** zulassen: eindeutig zuordenbare verschachtelte Bindung aus dem Originalformat auslesen und entfernen, ohne neue Entscheidung, IDs oder Reihenfolge zu erfinden. Widersprüchliche Wurzel-/Kommandobindungen, mehrere unvereinbare Bindungen, falsche IDs, `conflict`, zusätzliche/fehlende Aktionen und ungültige `needs` bleiben Ablehnungen. Keine breite Suche nach einem irgendwie passenden Angriff, kein stiller Wechsel zu H.
3. Originalantwort und Normalisierung getrennt diagnostizieren. Reload/Wiederaufnahme ungebuchter F-Eingaben muss dieselbe geprüfte Bindung erhalten; eine bloße Wiederverwendung von `commands` reicht dafür nicht.
4. Den häufigsten Fall ohne zusätzlichen Freitext direkt typisiert ausführen (§4). F bleibt vollständig unterstützt und wird unabhängig davon korrigiert.

**Read-only-Gegenprobe:** Wird ausschließlich die jeweils vorhandene verschachtelte Bindung an die Wurzel versetzt, akzeptiert der unveränderte Bindungsvalidator alle sechs Kopien. Ein absichtlich abweichendes Ziel wird weiterhin in allen sechs Fällen verweigert. Das belegt die kleine Formkorrektur für diese Originale, noch keine abgeschlossene Implementierung mit allen Gegenfällen.

## 3. P1: Speicherstatus ist kein verlässlicher Zugstatus

Das Spielerfeedback ist ernst zu nehmen. Die Quellen enthalten jedoch keine DOM-/Save-Zeitachse aus Phase C. **Ein verlorener Save oder eine minutenlang falsche Erfolgsmeldung während genau dieses Extractorrequests ist damit nicht bewiesen.** Die gespeicherten regulären Extraktionen stehen am Ende sämtlich auf `applied`; die fünf letzten Fehlversuche sind HUD-Verweigerungen, keine fünf hängenden Extractoren.

Der Code zeigt dennoch einen konkreten Fehlerverbund:

- [`index.js:98–130,494–500`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/index.js#L98): `setActionStatus` und Save-Callbacks schreiben Text direkt. Der Composer schreibt bei `refresh()` dagegen `actionBlocked() || status()`. Es gibt mehrere konkurrierende Anzeigen derselben Zustände.
- Der Save-Callback prüft bei Erfolg `worldOpen()`, also den Extraktionsrecord der letzten normalen Antwort. Er prüft nicht zusammenhängend laufenden Worldjob, Savequeue und Abschlussphase. Bei `applied` kann er schon „Gespeichert“ anzeigen, obwohl die Jobabwicklung noch läuft. Das ist kein Beweis, dass der gerade bestätigte Snapshot ungespeichert wäre; es ist ein irreführendes Signal für die Bereitschaft des nächsten Zugs.
- [`worldJobs.applied`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/index.js#L301) ruft `renderDebug()` auf, während der Worldjob noch aktiv ist. Der Composer zeigt dann wieder „Weltabgleich läuft“. [`world_jobs.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/world_jobs.js#L82) entfernt den Job im `finally`, ohne anschließende Statusaktualisierung. Eine spätere Interaktion kann erst die korrekte Anzeige herstellen.

**Lokale Gegenprobe mit Originalfunktionen:** `pending → Weltabgleich läuft`; Savebeginn überschreibt dies mit `Speichern`; Saveerfolg bei noch `pending` zeigt `Weltabgleich offen`; bei `applied` und noch aktiven Jobs zeigt er `Gespeichert`; Refresh innerhalb `applied` zeigt wieder `Weltabgleich läuft`; nach Jobende bleibt dieser Text stehen, bis erneut gerendert wird. Die genaue natürliche Ereignisfolge ist offen, die konkurrierende Zustandsdarstellung und das fehlende Abschlussrendern sind reproduziert.

**Vorschlag:** Eine gemeinsame Statusableitung aus vorhandenen Zuständen, keine neue Persistenzarchitektur. Fehler/Remoteabschluss unbekannt haben Vorrang; danach aktive Modell-/World-/Savephase; „Welt bestätigt und gespeichert – bereit“ erst nach Abschluss der maßgeblichen Revision und Read-back, ohne offenen Worldjob. Ein erfolgreicher Zwischensave darf nicht den gesamten Zug freigeben. Status nach Jobende, Fehler, Reload und Chatwechsel automatisch aktualisieren. Eingabe bleibt währenddessen beschreibbar, Senden wartet. Der Recoveryknopf erscheint nur bei tatsächlichem offenen/fehlgeschlagenen Abschluss, nicht als permanente Handlungsaufforderung während normaler Wartezeit.

**Pflicht der späteren Browserabnahme:** langsamer Extractor plus nativer Zwischensave, Save/Read-back-Verzögerung und -Fehler, Ende ohne weiteren Klick, Stop/Reload/Chatwechsel, gescheiterter F-Input. `.202`-Schutz vor veralteten nativen Saves und stillen HTTP-Erfolgen bleibt erhalten.

## 4. Gemeinsame HUD-Vereinfachung statt weiterer Bedienungsinseln

### Ein Ablauf mit wenigen bewussten Schritten

**Empfohlen:** Im vorhandenen aktuellen Combat-HUD Skill/Aktion und nötiges Ziel bzw. Band auswählen; die Auswahl dort sichtbar markieren. Danach **„Aktion senden“**, optional mit Text aus dem normalen ST-Feld. Kein vorgeschaltetes Aufklappen einer zweiten Aktionsliste, kein zusätzlicher „Auswählen“-Schritt, kein Pflichtwechsel zwischen zwei Oberflächen. Ein Zielklick allein wählt weiterhin keinen Angriff. Verteidigung/Items brauchen nur dann ein Ziel, wenn ihre bestehende Mechanik es verlangt.

Die Oberfläche nutzt denselben typisierten Entwurf und dieselbe origin-/revisionsgebundene Übergabe. Der Sendeknopf delegiert in den vorhandenen ST-Sendepfad einschließlich Reservierung, `MESSAGE_SENT`, Requeststeuerung und bestätigtem Save; **kein direkter Engineaufruf aus dem DOM und kein zweiter Savepfad**. Der normale ST-Sendeknopf und Enter bleiben nutzbar. Text, Auswahl und Zustandsrevision werden beim tatsächlichen Senden nochmals gemeinsam geprüft. Alte Chat-HUDs dürfen nicht als unabhängige aktive Steuerungen alte Kämpfe ausführen.

| Eingabe | Empfohlener Weg |
|---|---|
| Nur eindeutig gewählte HUD-Aktion, Textfeld tatsächlich leer | Ohne Planner. Ein automatisch erzeugtes Anzeigenlabel ist kein zusätzlicher Freitext und darf nicht den F-Planner erzwingen. Auswahl/Senden selbst autorisieren die Mechanik. |
| HUD plus bewusst aktivierter **„Text ist nur Rollenspiel“** | Bestehender H-Weg; sichtbar gemerkt, keine versteckte Umdeutung. Optionaler Text wird mitgesendet. |
| HUD plus **„Auch Handlungen im Text berücksichtigen“** | Korrigierter F-Planner, einschließlich Bedingungen/Widersprüchen. Kein automatisches Weglassen zusätzlicher Handlungen. |
| Freitext ohne HUD | Bisheriger vollständiger Plannerweg. |

Die Buchstaben F/H müssen dem Spieler nicht als technische Moduslehre präsentiert werden. Die Bedeutungen bleiben unterscheidbar; die freigegebene bewusste Aktivierung des Begleittextmodus wird nicht abgeschafft. Komplexe Bewegung plus Angriff bleibt auf die bestehenden Aktionen und Aktionsökonomie begrenzt. Eine fremde Textvorlage oder ein älterer Entwurf wird nicht als „leeres Feld“ behandelt.

### Kontext, Ziele, AoE und Items

| Problem und Beleg | Kleinste gemeinsame Lösung | Grenze/Risiko |
|---|---|---|
| Der Composer erscheint in der Gilde, Brenna steht als Angriffsziel zur Wahl; Screenshot A und Originalzustand nach I14 reproduzieren es. `availableActions()` nutzt `tacticalHere()` mit freundlichen/relevanten Personen. | Taktikbereich bei laufendem/gebundenem Kampf oder sichtbaren relevanten Bedrohungen; vorhandene Combat-HUD-Komponenten auch für eine Vorschau vor Kampfbeginn verwenden. Alltags-/Inventaraktionen nur bei Bedarf aufklappen. | UI-Sichtbarkeit erzeugt weder Feindschaft noch Initiative. Kein globales Verbot, neutrale NPCs absichtlich per Freitext anzugreifen; eine erweiterte bewusste Zielwahl darf dafür verfügbar bleiben. |
| Vor I23 vier `mon.…`-IDs, vor I35 eine weitere ID. | Bestehendes `sceneHandle(state,content,id)` verwenden, im Kampf dessen bestehende Labels. Die lokale Gegenprobe liefert bereits **Crystal Beetle A–D** und **Quartz Ooze A** ohne LLM und ohne neue Entität. | Keine Identitätsänderung, kein Verraten unbekannter Eigennamen, intern unverändert dieselbe ID. |
| Arcane Wave wird über einen Einzelgegner ausgewählt, obwohl ein Band getroffen wird. I25/I27 zeigen funktionierendes Band-AoE. | Sichtbare erreichbare **Entfernungsbänder mit betroffenen Gegnernamen** anbieten; aus der bewussten Bandwahl einen stabilen gültigen Zielanker für die bestehende Auflösung ableiten. Vor Sendung Band, Reichweite und Betroffene nochmals prüfen. `areaBand`, `areaCaught`, `skillAreaTarget`/`uniqueAreaAim` wiederverwenden. | Nicht einfach den erstbesten Gegner aus allen Bändern auswählen. Bei vorheriger Bewegung das tatsächlich resultierende Band anzeigen; bei überholter Auswahl nicht still umdeuten. Freund-/Neutralregeln und explizite Angriffe unverändert. |
| Guild plate/Questslip doppelt, Small Pouch und später Chitin im Use-Menü. Screenshot und Zustandsprobe bestätigen es. | Objekt- und Inventarverweise über `tradeObject(...).id` zusammenführen, nach **konkreter vorhandener Aktion** gruppieren. Trank/Angriffsitem/Lernquelle etc. mit Voraussetzungen; ungeeignete Kampfitems nicht im Kampfmenü. | Nur `validateActionSelection().ok` zu filtern genügt nicht: Platte, Slip, Pouch und Chitin werden außerhalb des Kampfes als generisches `use` akzeptiert. „Ansehen/zeigen/beschreiben“ bleibt freier Text; keine erfundene Standardwirkung. Nicht nach Namen deduplizieren, sonst verschwinden echte gleichnamige Stapel. |
| Hilfe-/Recovery-/Annäherungsoptionen ständig sichtbar, technische F/H-Erklärungen dominieren. | Nur zum gewählten Aktionstyp passende Kontrollen; Kosten/Reichweite/Ablehnungsgrund unmittelbar bei der Aktion. Status separat kurz und automatisch. | Keine neue Pflichtbestätigung für bereits eindeutige Aktionen. Nach Weltänderung erkennbare neue Auswahl statt stiller Ausführung eines alten Entwurfs. |

Codebasis: [`action_composer.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/action_composer.js), [`action_input.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/action_input.js), [`hud.js:235ff`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/hud.js#L235), [`scene_handles.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/scene_handles.js). Dies ist eine andere Darstellung vorhandener Fachaktionen, kein neues Kampfsystem.

## 5. Questboard und weitere zusammenhängende Korrekturen

### Board einmal darstellen, eindeutig annehmen

I11 benötigt **zwei Boardrequests** mit zusammen **111,031 s**: 55,898 s Erstgenerierung und 55,133 s Repair. Das erste Board enthält einen unpassenden Snapper-Bodyplan; der Repair fordert außerdem das geeignete schwache Starterziel. Das ist **keine doppelte Narratorgenerierung derselben Liste**. Anschließend wiederholt I12 jedoch tatsächlich alle fünf schon als Enginekarten dargestellten Listings.

[`commands.js:1564`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/commands.js#L1564) verlangt bereits eine kurze Leseszene ohne Katalogwiederholung. Im tatsächlich gesendeten Narratorprompt steht gleichzeitig **SELECTION LISTS**, mit dem Auftrag, Optionen zeilenweise einschließlich Titel/Preis/Questdaten aufzulisten. Das ist eine belegte konkurrierende Vorgabe; ihr genauer Anteil am Modellfehler ist nicht gemessen. Die alten Boardanweisungen pauschal erneut zu verschärfen wäre kein ausreichender Fix.

**Vorschlag:** Enginekarten bilden die offizielle Liste einmal ab. Die tatsächlich verwendete Character Description/Vertragsfassung ([Quelldatei](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt#L329)) nimmt enginegerenderte Kataloge ausdrücklich von SELECTION LISTS aus; freie Händlerangebote und gezielte NPC-Auskünfte bleiben erlaubt. Quellenfassung, Import-/Aktualisierungshinweis und realer Mockrequest müssen übereinstimmen. Die lange Boardgenerierung lässt sich dadurch nicht rückwirkend „einsparen“; eine deterministische Boardneuerfindung gehört nicht in diese Runde. Den vorhandenen Starter-Spezies-/Bodyplanvertrag konsistent am Generator anbieten, ohne Gegnerwerte/Slots abzusenken.

Der heutige Button [`Ask to accept…`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/hud.js#L52) füllt über [`ui_actions.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/ui_actions.js) nur Text ein. **„Annehmen“** sollte bei aktueller, eindeutiger, zulässiger Quest die ID als bewusste Spieleraktion über denselben Sendepfad weitergeben, ohne Pflicht-Nachklick ins Textfeld oder Planner-Neuinterpretation des Titels. Es gibt aktuell **keinen fertigen `quest.accept`-Typ im HUD-Vertrag und keinen hier nutzbaren `#accept`-Fastpath**; diese kleine Eingangserweiterung muss den vorhandenen [`quest.accept`-Handler](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/commands.js#L1419)/`acceptContract` verwenden. Gildenort, Rang, Listingstatus, alte Boardkarten und Doppelannahme bleiben geprüft. Kein direkter Klick schreibt Questevents.

Bei vorhandenem Freitext/anderer Aktion nichts überschreiben oder unbemerkt mit absenden: die Questwahl sichtbar zum Entwurf machen und den gemeinsamen Versand verwenden. Optionales NPC-Gespräch bleibt möglich; Annahme darf nicht automatisch auf Auszahlung/Abschluss ausgeweitet werden. Ein Klick ist die Annahme, keine automatische Folgequest.

### Enger Extractor-Formfall statt zusätzlicher Reparaturrunde

I34: erste Antwort hat `scene:{"new":"the low hollow"}`; in `expected[1].at` **und** im `arrive.at` steht bereits dieselbe vollständige Referenz mit Name, Kind und Parent. Der zweite Request korrigiert vor allem das oberste Format; beide zusammen dauern **41,234 s**, davon **19,931 s Repair**. Es ist keine Trunkierung: beide Antworten enden mit `stop`.

**Empfohlen in dieser Runde:** Nur für eine einzige eindeutig identische, schon vollständig angegebene und gültige neue Ortsreferenz die verkürzte Wiederholung lokal auflösen, vor der üblichen Schema-/Chronologie-/Weltprüfung. **Kein Parent aus der Umgebung raten, keine Ankunft erfinden, keine globale Freigabe von `{"new":"name"}`.** Gleichnamige Orte, mehrere Ankünfte, widersprüchliche Parents oder unvollständige Angaben müssen weiterhin die Unsicherheit bewahren. Eingriffspunkt [`parseExtraction`/Normalisierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc/avereth-engine/src/v4/extract.js#L480). Das ist ein eng begründeter Vorschlag mit erforderlichen Gegenregressionen, noch kein ausgeführter Fix und keine pauschale Repairabschaffung.

### Erzählte Welt von schon vorhandenem Kanon unterscheiden

- **Glimmerdeep-Richtung:** `content/lore.json` nennt einen Vormittagsweg **nördlich** von Glassmere. I14 erzählt einen halben Tag **westlich**, die Information wird im Questgedächtnis fortgeführt. Der Boardgenerator hatte den korrekten Ortstext; der anschließende Annahme-Narratorrequest enthält zwar Glimmerdeep-Ziel/Queststatus, aber nicht dessen konkrete kanonische Wegbeschreibung. „north“ irgendwo im Gesamtprompt ist kein Beweis für diese gelieferte Route. Die relevante bestehende Zielbeschreibung bei Annahme/Reise gezielt ausliefern; kein vollständiges Lorebook zusätzlich injizieren, keine festen Reisezeiten neu erfinden.
- **Zusätzliche Bosskäfer:** I38 erfindet ein Dutzend große lebende Käfer, die I40/I41/I45 weiter handeln. Die Engine weist neue Dungeonfoes korrekt ab. Die entsprechenden Korrekturhinweise wurden I40 und I41 tatsächlich mitgesendet, das Modell ignoriert sie trotzdem. **Ein bereits vorhandener Korrekturtext allein löst dies folglich nicht zuverlässig.** Die Szene ist narrativ falsch, obwohl Slots/HP geschützt bleiben. Für User06 den bestehenden gültigen Begegnungsbestand knapp vorrangig ausgeben und einen erkennbaren, optionalen Swipe/Korrekturweg bei solcher Abweichung erhalten; keine automatischen Narrator-Reparaturketten. Keine garantierte semantische Heilung durch Promptkosmetik behaupten. Tiere/Personen außerhalb der Dungeon-Kampfslots und gewöhnliche freie Weltreaktionen werden dadurch nicht generell verboten.
- **AoE-Erklärung:** Bereits die Erstellungsanzeige I2 kombiniert die aktuelle opponents-only-Kurzbeschreibung mit älterem Effekttext „friend or foe“. Bei der neuen Bandanzeige die Beschreibung mit der tatsächlich verwendeten Mechanik abgleichen. Das ist Text-/Vertragskonsistenz, keine Änderung des Trefferkreises.

Diese Punkte gehören als knappe Kontext-/Vertragskorrekturen und natürliche Beobachtungskriterien zur Runde. Ein umfassender semantischer Wächter oder eine neue Narrative-Reparaturphase wäre nicht gerechtfertigt.

## 6. Reale Performance: Messung, Grenzen, sinnvolle Hebel

### Vollständiger User05-Aufrufbestand

Alle **64** Request-/Responsepaare: `zai-org/GLM-5.3-Flash`, `finish_reason: stop`, **772.826 Prompttokens + 17.785 Completiontokens = 790.611 Tokens**, jeweils gemeldete `cached_tokens: 0`. Keine im gelieferten Corpus nachgewiesenen 429/Timeouts/Trunkierungen. Der Completiondump ersetzt keinen vollständigen Netzwerk-/ST-Ereignislog.

| Phase | Physische P / N / X / Board | Prompttokens gesamt | Planner-Median | Narrator-Median | Welt-Extraktionsmedian |
|---|---:|---:|---:|---:|---:|
| A | 5 / 5 / 5 / 2 | 199.100 | 5,303 s | 23,745 s | 14,339 s |
| B, nur neue Aufrufe | 7 / 7 / 7 / 0 | 264.992 | 6,221 s | 23,633 s | 27,192 s |
| C, nur neue Aufrufe | 11 / 7 / 8 / 0 | 308.734 | 6,847 s | 23,907 s | 38,613 s |
| Summe | **23 / 19 / 20 / 2** | **772.826** | keine Mischphasen-Prognose | | |

P-Zeiten stammen aus gespeicherten Plannerrecords, N-Zeiten aus Engine-Narratortelemetrie, X-Zeiten aus den 19 angewandten Extraktionen. C enthält einen Extraktionsjob mit zwei physischen Requests. **Diese Zeiten messen nicht die anschließende bestätigte ST-Save-/Read-back-Dauer.** Für den gesamten Weltabschluss fehlt eine eigene vollständige Zeitachse.

| Physische Phase | Prompttokens: Summe; Median je Request; Bereich | Completiontokens: Summe |
|---|---|---:|
| P | 248.520; 12.369; 6.489–13.688 | 1.528 |
| N | 228.039; 12.144; 10.431–12.732 | 7.687 |
| X inkl. Repair | 289.906; 14.527; 13.203–15.638 | 6.685 |
| Board inkl. Repair | 6.361; 3.180,5; 2.602–3.759 | 1.885 |

Die tatsächlich gesendeten Einstellungen sind P/X Temperature 0,1 mit 2.000/4.000 Antwortlimit, N 0,9/Top P 0,95 mit 4.096, Board 0,6 mit 3.000; jeweils nichtstreamend und `reasoning_effort: low`. Provider-Prompttokens sind der vollständige Request, nicht der etwa 1.400-Token-Kontextbudgetwert der Engine.

**Konkrete Wartebeispiele:** I31/I32 Rast: 6,042 s P + 23,907 s N + 46,591 s X = **76,540 s erfasste serielle Phasen**, ohne weitere Hostzeiten. I33/I34 Ortswechsel: 3,742 + 26,596 + 41,234 = **71,572 s**, darin 19,931 s Repair. I44/I45 Bossangriff: 6,282 + 22,232 + 38,613 = **67,127 s**. Das bestätigt das Spielerproblem; es wäre falsch, nur die etwa sechs Sekunden Planner als gesamte Latenzursache zu behandeln.

C ist nicht deshalb langsam, weil seine Extractorprompts proportional zur Latenz anwachsen: deren Median liegt bei 14.583 gegenüber 13.510 in A; Ausgabelänge, Inhalt, Providerlast und weitere Backendfaktoren variieren. N bleibt ähnlich, während X stärker schwankt. Ohne Providertelemetrie lässt sich daraus kein eindeutiger Infrastrukturgrund ableiten.

### Historischer Vergleich, unabhängig nachgezählt

[User04 `.159`, 06.11.](../testrun_10b/user-20261106-072640/REVIEW.md): komprimiertes Originalserverlog als UTF-16LE gelesen, **124 Paare**, gleiches Modelllabel, **1.520.007 Prompttokens, davon 825.898 gemeldete Cachetokens**. Im finalen Chat: Planner 37 Records, Median **3,866 s**; Narrator 36, **14,295 s**; angewandte Extraktionen 36, **8,498 s** (Bereich 2,500–59,188 s). Log und finaler Chat haben unterschiedliche Mengen, unter anderem wegen nicht behaltenen Narratorvarianten; die Stichproben werden nicht gleichgesetzt.

Damit ist „früher fühlte es sich schneller an“ messbar gestützt. **Nicht bewiesen:** dass die Action-HUD-Änderung den Provider verlangsamte oder dass Cache allein die Differenz erklärt. Gleiches Modelllabel und ST-Quelle `custom` sind keine identische Providerlast, Tarif-/Backendkonfiguration oder Testsituation. Die Cachewerte sind gemeldete Usage, kein Nachweis einer konkret aktivierbaren Cacheoption oder verbrauchter Credits.

Die [historische `.191`-Tabelle](ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) enthält zusätzlich einzelne schnellere X-Fälle und lange Repairketten; der `.200`-Waldausfall dort belegt einen anderen Concurrency-/Timeoutfall. Diese früheren Belege dürfen nicht als aktueller User05-Providerfehler umetikettiert werden.

### Erwartete Wirkung der Runde — keine gemessenen Einsparungen

- **Nur Auswahl / expliziter Begleittextmodus:** Der bestehende H-Pfad kann einen Plannerrequest ersetzen. Für die realen User05-Eingaben wurde H jedoch nicht verwendet. Eine spätere UI macht diesen Weg zugänglich; dessen natürliche Geschwindigkeit und Verständlichkeit sind noch zu prüfen. Die fünf F-Fehlversuche werden durch einen korrekten Vertrag unnötig, aber dieselben Sekunden sind keine garantierte zukünftige Laufzeitersparnis.
- **Direkte Questannahme:** kann einen Plannerrequest und einen zusätzlichen Bedienungsschritt vermeiden; die NPC-Reaktion und ihre relevante Welt-/Memorybuchung bleiben erhalten.
- **Board nur einmal:** weniger redundante Ausgabe und Lesen, nicht automatisch weniger Boardgeneratorrequests. Länge/Latenz eines künftig kürzeren Narrators sind noch ungemessen.
- **I34-Formnormalisierung:** könnte den dokumentierten zusätzlichen X-Request vermeiden; ohne Gegenregressionen keine allgemeine Freigabe für Ortsinferenzen.
- **Statusfix:** spart keine Modellphase, verhindert aber falsches Warten, unnötiges Nachklicken und riskantes Wiederholen. Eigene Phasenmessung bis bestätigtem Save ergänzen, vorhandene Requesttelemetrie weiterverwenden.
- **Extractor:** bleibt in dieser Runde grundsätzlich aktiv. Die Originale speichern Ankunft, Ortsidentität, PULSE-Faden und weitere Weltfolgen; „Kampf“ ist kein ausreichender Grund, alles zu überspringen. Auch eine in diesem Einzeltext redundant wirkende Extraktion beweist keinen sicheren künftigen Skipfilter. Relevante Kontextmodule und engere Schemas sind spätere Optimierungsoptionen, kein pauschales Kürzen von NPC-Memory/Narratorfreiheit.
- **Cache/Concurrency:** später tatsächliche Requests/Usage und Abschlusszeiten vergleichen. Kein künstlicher Cachegewinn, keine parallelen P/N/X-Aufrufe als Abkürzung und keine automatische Wiederholung bei unbekanntem Remoteende. Fehlende Cachetokens rechtfertigen weder einen Tarifwechsel noch kostenpflichtige Diagnoseläufe ohne Auftrag.

## 7. Gegenbewertung der bisherigen Reviews und getrennte Designfragen

| Punkt | Unabhängiges Urteil |
|---|---|
| F-HUD P1 | Voll bestätigt, mit sechs Originalen reproduziert. Keine echten Textkonflikte in diesen fünf Ablehnungen. |
| Speicheranzeige P1 | Korrekturbedarf bestätigt; genaue natürliche „Gespeichert während X“-Zeitachse und Saveverlust nicht belegt. Lokaler Statusfehler wird nicht als Browserbeweis ausgegeben. |
| Questboard/IDs/Items/Bedienungsaufwand | Voll bestätigt durch Originale, Screenshots und vorhandene Projektion; gemeinsame UI-Korrektur sinnvoll. |
| Dungeon-Eintritt I19/I20 | Kein belastbarer Beleg eines ungewählten tiefen Eindringens. Gebucht wird `l1_s1`, **grotto mouth**; der Text beschreibt Licht am Eingang und das wartende Innere. Der nächste ausdrückliche Tieferschritt kommt I21. Technische Dungeonzugehörigkeit ist nicht automatisch eine neue freiwillige Entscheidung. Die Grenze bleibt bei künftigen echten Gegenfällen zu prüfen. |
| „He asked directions once“ I6 | Eine neu erfundene Sprechhandlung, die über die aktuell enge Routinefreigabe hinausgeht; geringer mechanischer Schaden, kein Anlass für neue globale Verbote. Künftige Erweiterung der Routineautonomie wäre eine bewusste Entscheidung. Nicht pauschal jede Wegbeschreibung als Agencyverletzung werten. |
| „He ate what he carried and drank“ I32 | Im Inventar sind keine entsprechenden Vorräte belegt; problematische Erzählannahme, aber **kein gebuchter Verbrauch oder zusätzliche Heilung**. Sitzhaltung/Rastgesten sind etwas anderes. Die Rastregeln funktionieren. |
| Mehr Käfer am Boss | Belegter narrativer Kontinuitätsfehler trotz wirksamer mechanischer Ablehnung. Engine-GO ersetzt keine Erzählqualitätsabnahme. |
| Zusätzliche Antwort I41 | Eine reale N+X-Antwort ohne neuen Spielerinput; keine neue Kampf-/Zeitbuchung, nur abgewiesene Position und Extraktionsdiagnose. Der Auslöser — etwa bewusste ST-Fortsetzung — ist aus diesen Dateien nicht sicher bestimmbar. Nicht als automatische Requestschleife oder Doppelangriff behaupten. Später den ST-Generationstyp mitloggen. |

**Ortsgranularität:** Die Gilde ist im Run bereits ein gemeinsamer Engineort; Tresen und Board brauchen keine neuen Ortsobjekte. Bei Dungeonabschnitten tragen `l1_s1…s4` dagegen Wege, Anwesenheit, Begegnungsslots, Reihenfolge und Rückweg. Eine grobe Anzeige wie „Glimmerdeep · Ebene 1“ mit optionalem Abschnitt ist eine reversible Darstellungsoption. Alle Abschnitte zu einem Zustand zusammenzulegen wäre ein eigener Eingriff mit Verlust-/Regressionsrisiko und spart nicht automatisch X: die konkrete Ankunft und das neue Weltgeschehen müssen weiterhin gebucht werden. **Kein Orts-/Dungeonumbau in dieser Runde.**

**Schnellerer Nahkampf / Balance:** Der erste Käferkampf zeigt tatsächlichen Nahkampfdruck (HP 80 → 28), AoE und anschließend Level 1 → 4. Die Queen wurde aus LONG angegriffen und rückte regelgerecht MEDIUM → SHORT vor, blieb mit 21 HP am Leben. Ihr Ausgang fehlt absichtlich. Das reicht weder für „alle Nahkämpfer zu langsam“ noch für eine belastbare globale Mage-/Bossbalance. Zwei Bandschritte/Sprint würden Aktionsökonomie und Reichweiten ändern. **Getrennte Designentscheidung**, vor weiteren Werten zunächst vergleichbare Kampfdaten nach störungsfreier Bedienung sammeln. Kein heimlicher Buff als QoL-Fix.

## 8. Priorisierter Umsetzungsvorschlag zur Freigabe

Ein Entwicklungszweig, eine zusammenhängende Runde über vorhandene Fachpfade; intern in prüfbaren Schritten. Keine neue Engine, kein allgemeines HUD-Framework für alle zukünftigen Features.

| Reihenfolge | Umfang | Aufwand/Risiko relativ | Späterer entscheidender Nachweis |
|---|---|---|---|
| **1 · P1** | Einheitlicher HUD-Bindungsvertrag, enge Normalisierung, Erhalt bei Wiederaufnahme | klein bis mittel; Sicherheitsgrenzen sind entscheidend | sechs echte Antworten; falsche IDs/Targets, doppelte/konkurrierende Bindungen, `needs`, Negation, gemischter F-Text; null Buchung bei Ablehnung |
| **2 · P1** | Abgeleiteter Zugstatus und automatisches Ende nach Worldjob/Read-back | mittel; reale ST-Reihenfolge | echte isolierte ST-Gegenfälle aus §3, kein Klicken nötig, keine falsche Sendefreigabe |
| **3 · wesentliche QoL** | Eine aktuelle Combat-HUD-Eingabe mit direktem gemeinsamem Versand; Kontext, lesbare Ziele, Band-AoE, konkrete deduplizierte Items | mittel; größte Host-/UI-Fläche | originale Käfer-/Queenzustände, Gilde ohne taktische Daueranzeige, Zielklick ohne Skill, Trank/Defense/Move, freie und gemischte Eingaben, veraltete Auswahl, Reload/Swipe/Regenerate |
| **4 · wesentliche QoL** | Board einmal, typisierte eindeutige Annahme über vorhandenen Handler | klein bis mittel; kein DOM-Buchungspfad | I11–I14, doppelte Titel/alte Karte/falscher Ort/zweiter Klick/Textentwurf; kein verlorener Text, keine doppelte Annahme |
| **5 · eng ergänzend** | I34-Formrepair vermeiden; kanonische Zielinformation/übereinstimmende Board-/AoE-Texte; knappe gültige Dungeonbesetzung | klein bis mittel; Semantik offenhalten | Original-I34 plus Mehrdeutigkeiten/Ankunftsverneinung, tatsächliche gesendete Promptteile, keine neuen Slots/Balancewerte; Phantomkäfer als natürliche Restunsicherheit |
| **6 · Abnahme** | Vollständige Node-/Replay-Abnahme, geänderte Fingerprints einzeln begründen, isolierte echte ST-Standard-/Failsoft- und neue UI-/Statusfälle | verpflichtend nach Freigabe, hier nicht ausgeführt | unveränderte Mechanik/Memory, gemeinsame Send-/Savekette; danach unabhängiger Diffreview und User06-Freigabe |

**Echte offene Entscheidungen:** Für diese Korrektur-/QoL-Runde ist keine neue Grundsatzentscheidung nötig. Die konkrete Implementierungsfreigabe steht aus. Gröbere autoritative Orte/Dungeonabschnitte, Gegnerbewegung/Balance und eine weitere Ausweitung freiwilliger Routinehandlungen bleiben eigene spätere Entscheidungen; sie blockieren diese Runde nicht. Ob ein vertrauter, bewusst gewählter Begleittextmodus existieren darf, ist bereits entschieden und wird nicht erneut zur Freigabefrage gemacht.

**Technische Grenzen vor User06:** Beide P1-Befunde müssen geschlossen und im echten isolierten ST bestätigt sein. Die Integration des einen Sendepfads für direkte Aktionen/Questannahme ist noch umzusetzen und abzunehmen, aber kein nachgewiesener Hostblocker. Erfundene Nebenfiguren/Kampfdetails und übergangene Promptregeln bleiben natürliche Modellrisiken; Mocktests können deren Lösung nicht belegen. User06 sollte gerade die neue kurze Bedienung, frei ergänzten Text, NPC-Interaktion und automatische Weltabschlussanzeige prüfen. Keine Pflicht, einen Dungeon durchzuspielen oder eine frühere Geschichte zu reparieren.

**Empfehlung:** diese begrenzte Fix-/QoL-Runde freigeben, anschließend technisch abnehmen und User06 frisch beginnen. User05 bleibt vollständig und unverändert als beendeter natürlicher Beleg erhalten. Weder dieser Review noch grüne spätere Mocks allein sind ein Merge- oder persönliches Spieltest-GO.
