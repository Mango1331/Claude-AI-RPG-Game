# Avereth – unabhängiger GPT-Gegenreview der Orts-/Reise-Architekturstudie

**14.11.2026 · keine Produktänderung, keine Designfreigabe.**

**Primärquelle:** [Claude-Grundanalyse](ORT_REISE_UMGEBUNG_ARCHITEKTUR_GRUNDANALYSE_2026-11-14.md), Commit `16682d1`, 530 Zeilen, Codebasis `.189` (`4438241`). **Weitere Quellen:** [Opus-Gegenreview des natürlichen .188-Batches](../testrun_10b/archiv/npc-20261114-161005Z/GEGENREVIEW_OPUS.md), [GPT .188-Review](../testrun_10b/archiv/npc-20261114-161005Z/REVIEW.md), [früherer Architektur-Gegenreview](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md), [O1/O2-Fachplan samt GPT-Nachtrag §9](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md) und [Design-Kanon](../02_DESIGN_KANON.md).

**Eigenständig im Repository überprüft:** `catalog.js` `catalogPlaces`/Route, `planner.js` `routePlaces`/Rückweg-Wortlisten, `extract.js` Orts-Enum/`expected`/`sceneIssues`, `place_refs.js` `placeIdentity`/`scopedPlaces`, `commands.js` `dungeonGo`/Living-/GO-Handler, `world.js` `arrivalPlace`/`wayRefused`/`passage`/Szenenprüfungen, `dungeon.js` `levelVia`/`floorRefusal`, `living.js` `DUNGEON AHEAD`. **Nicht eigenständig erneut ausgeführt:** die 2235er-Replays, die beiden vollständigen natürlichen Batches, ST-Smokes, die in der Claude-Studie genannten Git-Commit-Zählskripte. Ihre Kennzahlen sind **Studienmessungen**, kein neues GPT-Messergebnis.

## 1. Gesamturteil

**Grundsätzliches GO für eine strukturelle Neuordnung des Orts-/Reisebereichs, nicht für die unveränderte technische Ausführung sämtlicher Studienvorschläge.** Die Kernthese ist im Quellcode nachvollziehbar: `catalogPlaces` ist ein beschränkter, sichtbarer Ausschnitt, dient aber auch als Referenzschema; `dungeonGo` erlaubt das Suchen eines bekannten Raums ohne Weg, `world.js` prüft dessen Durchgang/Level noch einmal und kann ihn zurückweisen; der Narrator sieht seine eigene falsche Szene im Verlauf. Die Trennung verursacht wirklich unterschiedliche, oft verstärkende Fehler.

Die Formulierung **„niemand besitzt den Ort“ ist als Diagnose etwas ungenau**: Das gefaltete Eventlog ist bereits die autoritative Quelle des **tatsächlichen Aufenthaltsortes**. Was fehlt, ist **eine einzige, über Schnittstellen geteilte Definition der zulässigen Ortsreferenzen, der erlaubten Bewegungsversuche, ihrer möglichen Ergebnisse und der Plan-/Ankunfts-Prüfung**. Nicht sämtliche Zuständigkeiten auf eine Großfunktion legen; vielmehr einen **gemeinsamen überprüfbaren Vertrag** schaffen.

**Priorität aus diesem Review:** A1 (Ortsbuch) und A2 (Bewegungsplan) gezielt entwerfen, mit vorab messbarer Regression und **nachweislicher Löschung redundanter Pfade**. Dungeonräume sind ein besonders geeigneter struktureller Pilot, aber **nicht zwingend als vollständig vorab generiertes Netz**; bedarfsweise, deterministische Erzeugung ist gleichberechtigt zu prüfen. N2 (Klartext-Spielerpanel) kann unabhängig und klein umgesetzt werden. D2/D3 (Mitgehen/Teilbewegungen) vorerst **nicht pauschal** autorisieren; Spielerhoheit braucht engere Fachbedingungen.

## 2. Positive, substanzielle Befunde

**2.1 Fünf Ortsmengen/Topologie:** Die Produktdateien bestätigen das Problem:
- `catalog.js`: begrenzte Liste `catalogPlaces`; Jagdort nur bei aktivem Auftrag; Dungeonräume zusätzlich `fits/roomKnown`.
- `extract.js`: das generierte Orts-Enum basiert auf `catalog.places` statt auf dem kanonischen, bekanntheitsgeprüften Bestand.
- `planner.js`: eine tatsächlich besuchte Route wird noch einmal nach dem aktuell beworbenen Katalog gefiltert.
- `commands.js`: prüft Existenz der Ziel-ID gegen `s.places` und bestimmt im Dungeon ein teilweise geplantes `explore`.
- `world.js`: löst Eltern/Orte und prüft Verbindungen, Räume und Ebenen erneut.

**2.2 Dungeon-Widerspruch ist strukturell plausibel:** `dungeonGo` `w.none && isRoom && !linksAt` → `explore`, GO-Handler verwandelt dies in `{new:sought}`; `world.js wayRefused` verlangt für den anschließend als **bekannt** geltenden Raum eine bestehende Verbindung oder eine nachträgliche Ausnahmelogik, und `levelVia` wertet die Erzähldirektion `down` als +1 Ebene. Diese Mehrfachauslegung erklärt die beobachteten Mage-Fälle. Der fachliche Zielbegriff muss sein: **Ein von der Engine erlaubter konkreter Ankunftspfad wird nicht an einer anderen, abweichenden Topologie erneut kassiert**, während echte unbekannte Wege weiterhin unsicher und nicht als garantiert erreicht gelten.

**2.3 Identitätsproblem:** `placeIdentity` filtert als letzte Namensauflösung auf `reported` oder Dungeon-Gate, während besuchte Orte mit anderem vom Modell gemeldetem Elternort nicht immer wiedergefunden werden. Die Konsequenzen sind im Opus-Gegenreview .188 mit doppeltem Tannery-Rows-Ort/Ostrek konkret belegt. Ein kanonischer Identitätsvertrag ist fachlich sinnvoller als weitere Name-/Parent-Hotfixes.

**2.4 Kaskade und Player-Verständlichkeit:** Eine verweigerte Ankunft löst richtige Folgeablehnungen aus; diese zu lockern wäre kein Erfolg. Ein erklärender Standort-/Nicht-Ankunftshinweis für den Spieler kann hingegen verhindern, dass der nächste Zug auf falscher Narration aufbaut.

**2.5 Kein Generalumbau:** Die Studie verwirft zu Recht die pauschale Vorabbuchung aller Reisen (V1/D) und die allgemeine Abschaffung mechanischer Innenräume (E). Beide erschaffen neue Probleme, ohne die Mehrzahl der Fehlursprünge zu beheben.

## 3. Fünf wichtige Korrekturen der Zielarchitektur

### 3.1 A1: Ein Ortsbuch ist **keine ungefilterte Liste aller Weltorte**

Die Studie verlangt eine einzige „gültige Ortsmenge“ aus allen bekannten Orten plus aktueller Abstammung. Das ist ein sinnvoller **kanonischer Referenzbestand**, aber nicht gleichzusetzen mit:
- **physisch existierend** (auch verborgene Räume),
- **dem PC bekannt** (besucht/gesehen/berichtet),
- **im aktuellen Prompt sinnvoll zu zeigen** (Ranking/Platzbudget),
- **von hier aus zugänglich** (Gates/Wege/Blocker).

Diese unterschiedlichen Fragen müssen als **Sichten desselben Ortsbuchs**, nicht als vollständig identische Sets beantwortet werden. Insbesondere dürfen ein geheim gebuchter Dungeonraum oder ein nur dem Erzähler bekanntes Ziel nicht allein durch Schema-Freigabe für den Spieler erreichbar oder als bekannt beworben werden. Die **Schema-Referenzgültigkeit** sollte an belegte Bekanntheit und aktuelles Scoping gebunden sein, nicht an alle `state.places`; der **Weltprüfer** darf darüber hinaus auf real existierende Orte referenzieren, ohne dass alle dem PC offengelegt werden.

Eine neue Ortsauflösung benötigt einen **eindeutigen Ergebniszustand**: `existing(id)`, `ambiguous(candidates)`, `new(scope)` oder `invalid`. Niemals `ambiguous` still in `new` verwandeln. Gleichnamige „guard room“, „cellar“, „east gate“ in verschiedenen Stätten nicht versehentlich zusammenziehen. Die frühere Namensheuristik ist problematisch; eine pauschale Neuauflösung gleichlautender Namen wäre aber eine andere, ebenfalls gefährliche Heuristik.

### 3.2 A2: **Autorisierung ist kein Ankunftsversprechen**

Die Studie sagt, die Weltprüfung solle eine Ankunft genau dann akzeptieren, „wenn sie dem Plan entspricht“. Das ist **zu knapp**. Ein GO-/Bewegungsplan muss unterscheiden:
- **autorisierte Absicht / versuchter Weg** (aus dem Spielerzug),
- **berechtigte nächste erreichbare Etappe** (Engine-Weg, Gate, Slot und PULSE),
- **erzähltes/berichtetes tatsächliches Ergebnis** (Ankunft, Zwischenhalt, Scheitern, Unterbrechung),
- **geprüftes und eventgebuchtes Ergebnis**.

Ein gemeldeter Zielort kann **im Plan vorkommen** und trotzdem **nicht erreicht** sein: fehlender Weg zum berichteten Raum, nicht geöffnete Tür, PULSE-Halt, Reiseunterbrechung, Erzählung endet auf halber Strecke, versagende Begleitung. Die bereits bestehende Regel `arrive` erst nach tatsächlicher bestätigter Ankunft bleibt. Ziel der Vereinheitlichung ist nicht die Abschaffung der Ergebnisprüfung, sondern, dass **dieselbe deterministische Pfad-/Ebenenentscheidung** als verbindliche Grundlage für Autorisierung, Erzähleranzeige und World gilt.

Für unbekannte, erst in der Narration konkret entstehende Orte muss der Plan auch **unaufgelöste Zielabsicht plus zulässigen Eltern-/Wegrahmen** tragen können, nicht vorab erfundene Orts-IDs oder beliebige „new“ Orte aus Plannerworten. So bleibt freie Weltgestaltung außerhalb von Dungeons möglich.

### 3.3 A3/O1: „Ortsneutral“ bedeutet **nicht** „kausal ortsunabhängig“

Die Studie nennt den Wegfall der Szenenpflicht für `fact`, `thread`, `person.named`, `quest.detail` als Technikabbau. Die frühere [O1/O2-GPT-Gegenprüfung §9.1–9.2](FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md) hat eine pauschale Freistellung aber **ausdrücklich verworfen**. Ein an einem nie erreichten Zielort erzähltes Gespräch mit einem dortigen NPC darf nicht bloß deshalb kanonisch werden, weil es als `thread` gespeichert wird.

**Freigabefähig nur:** Szenenzuordnung aus einer **wirklich schlüssigen und autorisierten** Plan-/Ankunfts-/`seq`-Kette; vor der Ankunft unabhängig belegte Beobachtungen behalten, spätere Inhalte eines unerreichten Orts weiterhin blockieren. `seq` ist selbst Modellbericht, kein unabhängiger Chronologiebeweis. Einem falschen `seq` nicht automatisch eine gültige Quelle unterstellen. Für Personen/Objekte/Angebote noch strengere Ortsbelege als für gewöhnliche Fakten.

Die künftige Komplexität soll sich gerade **verringern**: dieselbe, kleine reine Normalisierungslogik in Parser und World, danach nur die nötigen orts-/quellenabhängigen Guards; nicht die bisherige Prüfung und eine neue zweite Kontrolle nebeneinander lassen.

### 3.4 C: **Inkrementelles, engine-geführtes Dungeonraumnetz** als ernsthafte Alternative

Opus empfiehlt ein bereits beim Etablieren erzeugtes Netz „je Ebene“. Das löst einen Teil der Widersprüche, hat aber zusätzliche Kosten/Fragen: verdeckte Ausgänge, Raumanzahl, Boss-Platzierung, Reset, unerforschte Etagen, persistente Welt für andere Abenteurer, Migration bestehender Dungeons und die Gefahr eines starren Grundrisses.

**Gleichwertige Zielvariante prüfen:** Ein Engine-owned Graph, bei dem nur der **nächste rechtlich mögliche Anschlussraum** bei Erkundung deterministisch und einmalig erzeugt wird. Die Engine legt vor der Narration stabile IDs, Ebene, Verbindung, Sichtbarkeit und Slot fest; der Narrator wählt nur glaubwürdige Beschreibung und Namen. Sobald erzeugt, bleibt das Element im Eventlog und gilt für andere Besucher. Geheime Ausgänge und Ungewissheit können aus Engine-Entscheidungen entstehen. Dies erhält mehr organische Entdeckung bei weniger vorab materialisierten Orten.

Die Wahl ist deshalb **nicht nur „Raumnetz ja/nein“, sondern „vollständig vorab oder inkrementell enginegeführt?“**; beides gegen die beiden Mage-Originalfälle und mindestens echte Mehr-Ebenen-Dungeons testen. Die Studie belegt die Notwendigkeit **einer einzigen Dungeon-Topologieautorität** stärker als die Notwendigkeit einer **vollständig vorab generierten Karte**.

### 3.5 B/D2/D3: Keine heimlichen freiwilligen Reisen aus Fragen und Kaufabsichten

Die vorgeschlagene bedingte NPC-Reise bei „Shall we go now?“ verletzt den bisherigen Kanon nicht nur formal. Der Spieler kann damit die **Frage** „Sind wir bereit zu gehen?“ meinen und gerade **noch nicht** seinen eigenen Aufbruch autorisieren. NPC-Zustimmung ersetzt keine Zustimmung Alarics.

**Sicherer Vorschlag:** Eindeutig gewollte bedingte Handlungen zulassen, etwa „I will follow you to Werrin as soon as you are ready“; eine reine Frage oder hypothetische Einladung bleibt Dialog und sollte eine erkennbare Antwort/Bestätigung benötigen. Ein solches Signal kann ein neuer Planner-Typ sein, muss aber quellengebunden aus dem Spielerwort erkennbar sein. Er darf nicht durch den Narrator als Spielerentscheidung erfunden werden.

**Teilbewegung:** Eine Aktion wie „I sell her the plates“ belegt einen Verkauf, nicht immer einen freiwilligen Weg quer durch die Siedlung zu ihrem Laden. **Dieselbe Siedlung ist eine notwendige, aber keine ausreichende Autorisierung.** Erforderlich sind ein direktes, übliches Teilziel innerhalb der gewählten Handlung, ein plausibler freier Weg, eine erreichbare Person/Sache und keine neuen Gefahren-/Zutritts-/Dungeonentscheidungen. Sonst `WANTS`/Nachfrage statt Teleport.

**Konsequenz:** D2 **nicht pauschal mit Ja** beantworten. D3 **eng prüfen**, nicht als allgemeine Berechtigung „jede genannte Person in derselben Siedlung“ verstehen. Die Rollen von `move`, `go`, zurück, mitgehen und handlungsgebundener Teilbewegung sollen die bisherigen Rückweg-Wortlisten ersetzen, **nicht** eine neue zusätzliche Autorisierungsschicht schaffen.

## 4. Messzahlen und Prognosen richtig lesen

### 4.1 Was die Daten belegen

Die Studie zählt in .186 und .188 zusammen 26 abgelehnte Ankünfte; 10 als „Engine widerspricht sich selbst“ und 16 andere Klassen. **Die Topologie-/Ebenenwidersprüche sind mehrfach konkret belegt.** Aber die 10er-Klasse ist **nicht vollständig homogen**:
- `.186` Warrior #122: ein vom **Extractor falsch unter das offene Reich** gehängtes `interior` wird von World **zu Recht** abgelehnt. Das ist ein Schnittstellen-/Konsistenzproblem, aber keine belastbare Begründung, die Hierarchieprüfung als redundant zu streichen.
- `.188` Mage #92/#100: autorisiertes **Suchen** nach dem Weg zu einem berichteten Raum ist nicht gleichbedeutend mit einem garantierten erfolgreichen Weg. Eine abgelehnte Ankunft **ohne belegten Weg** ist für sich genommen nicht zwangsläufig ein Engine-Selbstwiderspruch.
- Die echte Level-Regel `down → 2` trotz Engine-Ankündigung einer Begegnung auf Ebene 1 ist dagegen ein enger, gut belegter Widerspruch.

**Darum:** `10/26` als breite Kategorie „Widerspruch am Bewegungs-/Ankunftsvertrag“, nicht als exakt 10 nachweislich fehlerhafte einzelne Validierungsentscheidungen. Eine neue Plan-Architektur kann diese Fälle **verständlicher und kohärenter** machen, muss nicht notwendigerweise alle zehn in erlaubte Ankünfte verwandeln. Die Folgerung `A beseitigt K1 vollständig` ist **zu sicher** formuliert.

Die Studie nennt **144** GO-/Fortsetzungs-Züge, davon 122 erreicht, 10 ohne Ankunft, 10 bei Ankunft abgelehnt, 2 Extractor-Fehler. Das ist eine wichtige, plausible Bilanz aus den Datenauswertungen. Die Unterspalte „GO zu bekannter ID / zu `{new}`“ summiert sich jedoch nur auf **135** (76 + 59), nicht 144. Die **neun fehlenden Fälle** (1 aus .186, 8 aus .188) sind vermutlich andersartige Fortsetzungen, müssen für die angegebene 44%-Quote eindeutig abgegrenzt werden. **Keine zusätzliche Datenevidenz erfinden;** die 44 % gelten nur für die 135 klassifizierten Zieltypen.

Die 40–48 % Ortsanteil bei Ablehnungen sind durch die **50 bzw. 79 Folgeablehnungen** stark dominiert, nicht durch 40–48 % unabhängige primäre Ortsfehler. Das erklärt die gravierende Spielerwirkung, nicht eine entsprechend hohe Anzahl voneinander unabhängiger Architekturdefekte. Die 18 % Commit-Titel mit Ortsbezug sind ein grober Arbeitsaufwandsindikator, kein belastbarer Beweis für auf 18 % konzentrierte Produktkomplexität.

### 4.2 Performance und Spielgefühl

Weniger Nachprüfungen und kürzere Extractor-Verträge **können** Tokens und Zeit einsparen, sind aber in der Studie noch **Schätzungen**. Ein weiteres Planobjekt kann zunächst sogar mehr Tokens, Code und Kontext kosten. Eine automatische Ersparnis ist nicht bewiesen. Die Modelllast hängt stark vom Provider und Spielverlauf ab.

Deshalb gegen dieselben historischen Requests/States messen:
- Prompt- und Completion-Tokens pro **erfolgreichem Spielzug**, nicht nur pro Aufruf;
- Reparaturaufrufe und echte terminale Extraktionen;
- p50/p95-Latenz pro Spielzug und zusätzliche Zeit durch Schutz/Neugenerierung;
- **ursprüngliche Ursachenepisoden** sowie Dauer der falschen Szene, nicht bloß `scene_context`-Zähler;
- Verlust falscher zulässiger Meldungen versus unbeabsichtigte **neue** zugelassene Meldungen;
- Anzahl gespeicherter Orts-/NPC-Duplikate;
- Netto-Code-/Vertragsreduktion und entfernte *ausgeführte* Pfade.

Weniger `delta.rejected` allein ist **kein** Qualitätsziel: Die Zahl könnte auch sinken, indem unberechtigte Weltfolgen ungeprüft gespeichert werden.

## 5. Die Erzählermaßnahmen N1/N2/N3

**N1 – Szenenkopf: eingeschränktes GO als Experiment.** Der vorgesehene Text „This reply begins and ends here unless PLAYER ACTIONS say GOES“ ist sachlich **zu absolut**: von PULSE erzwungene Reisehalte, echte äußere Kräfte, erzählte Zwischenstopps und legitim bedingte Bewegungen können die Schlussszene ändern. Erforderlich ist ein knapper, **aus dem tatsächlichen Plan/Outcome abgeleiteter** Kopf: `CURRENT LOCATION`, `AUTHORIZED TRAVEL/STOP`, `UNREACHED LOCATION`, `PEOPLE NOT HERE`. Dessen Sprache muss verbieten, neue freiwillige Ziele zu erfinden, ohne rechtmäßige PULSE-/Zwangsbewegung zu leugnen. Ein besser platzierter Satz ist eine Hypothese, keine Garantie gegen Narrative-Drift.

**N2 – Spielerpanel: unmittelbares GO.** Klartext nach `no_go` statt bloß „ENGINE REFUSED N … see #audit“ hat hohen Spiel-/Diagnosenutzen und verändert keine Ortsautorität. Nachzuweisen ist, dass er an der **sichtbaren Spieleroberfläche** und beim LLM-Spieler zuverlässig ankommt.

**N3 – einmalige automatische Ersatzantwort: erst Architektur-/Hostprobe, keine Produktionsfreigabe.** Ein echter ST-Swipe verändert Chatgeschichte, Requests, Extraktionen, Eventpersistenz und kann Nebenaktionen/Beziehungen aus einer Antwort verwischen. Vorher nachweisen, dass eine beanstandete Antwort **nicht bereits kanonisch teilweise übernommen** wurde, oder dass ihre abhängigen Buchungen vor Ersetzen sauber zurückgerollt werden; keine doppelten Modelcalls, Zeit-/Quest-/Geldereignisse; keine sichtbare veraltete Geschichte, kein fehlgeschlagener zweiter Versuch, keine endlose Retry-Kette. Ein `no_go` in einer Antwort reicht als automatischer Ersatztrigger nicht immer: der Fehler kann eine harmlose Nebenmeldung neben vielen richtigen Folgen sein. Kosten- und Erfolgszahlen vor einer Entscheidung real messen.

## 6. Vorläufige Nutzerentscheidungen D1–D6

| Entscheidung der Studie | GPT-Gegenreview | Warum |
|---|---|---|
| **D1 Raumnetz für Living Dungeons** | **Ja zur alleinigen Engineautorität über Raum-ID/Ebene/Verbindung; Entstehungszeitpunkt offen** | Ein inkrementell erzeugtes Engine-Netz könnte die Probleme mit weniger festen Vorabregeln lösen als ein vollständig vorab erzeugter Graph; beide als Fachalternativen prüfen |
| **D2 Vorschlag „Shall we go now?“ als bedingte Reise** | **Noch kein pauschales Ja** | Eine Frage ist keine freiwillige Reiseentscheidung; nur explizites „I will follow you if/when …“ sollte für eine bedingte Zusage infrage kommen, NPC-Zustimmung ist dann getrennt |
| **D3 Teilbewegung im selben Ort** | **Eingeschränkt Ja zur fachlichen Erkundung** | Bloße gleiche Siedlung plus genannte Person genügt nicht; unmittelbarer Handlungsbezug, Zugang und Spielerzustimmung gehören dazu |
| **D4 automatische Regeneration** | **Ja nur zur isolierten Messung; kein Produkt-GO** | Unklare Teilbuchungen/Host-Semantik, potenziell hoher Schaden |
| **D5 Innenräume nur erzählerisch** | **Nein derzeit** | Verlust von Anwesenheits-/Objekt-/NPC-Raumgenauigkeit bei schwacher nachgewiesener Einsparung |
| **D6 pauschale Ankunft vor Narration** | **Nein** | Fehlende Reisezeit/Unterbrechungen/unbekannte Orte und neue Inkonsistenz in Gegenrichtung |

Für **A Ortsbuch/Bewegungsplan** ist nach dem Kanon keine neue Spielerdesignentscheidung erforderlich, wohl aber eine **präzise technische Autoritäts-/Sichtbarkeitsregel**. Für D1–D3 keine stillschweigende Kanonänderung vor dem eigenständigen Designentscheid.

## 7. Empfohlene, abgesicherte Reihenfolge

**Phase S0 – Messung und zulässige Zustände definieren:** Ursprungsklassen, Folgeablehnungen und natürliche Drift-Episoden trennen; die genannten 9 GO-Zieltypenlücken erklären; die Original-Gegenfälle `.186` Mage, `.188` Mage/Rogue, bekannte/verborgene Dungeonräume, eindeutige/doppelte Ortsnamen, unautorisiertes GO, Mehrfachetappen, PULSE-Halt, Escort/Handel erfassen. Noch kein Umbau.

**Phase S1 – kanonisches Ortsbuch als Schnittstellenersatz:** Eine Funktion für Identität und Sichtbarkeits-/Referenz-Sichten, deren einziges Datenfundament `state.places` bleibt. Werbe-/Promptlimit nicht mehr als Referenz-Enum missbrauchen. Hostproben für `.188` Rogue #80/#82 und Mehrdeutigkeit. Keine automatische Zusammenlegung vermeintlich gleicher Orte bei unbekanntem Elternkontext.

**Phase S2 – verbindlichen Bewegungsplan im Schattenmodus prüfen:** Eine Enginefunktion entscheidet Zielbereich/legale Etappe/Dungeon-Ebene/Unterbrechungsrahmen; Erzähler, Extractor und World lesen denselben Plan, aber unterscheiden weiterhin **Autorisation und bestätigtes Ergebnis**. Erst bei dokumentierter Gleichheit für zulässige alte Fälle und Erklärung abgelehnter Fälle produktiv umstellen; **danach** die ersetzten Prüfpfade entfernen. Keine zweite dauerhafte Plan-Engine neben World.

**Phase S3 – kurze menschlich verständliche Standortmeldung plus Modell-Kopf:** N2 früh; N1 mit realen Gegenfällen und Messung. Keine unbedingten „endet immer hier“-Sätze.

**Phase S4 – Dungeonmodell pilotieren:** Zuerst entscheiden, ob nur der nächste Teil als **stabiles persistentes Engineereignis** erzeugt oder alle Räume/Ebenen im Voraus erzeugt werden. Mindestens den `.186`-Mage (vollständig unkanonische Expedition) und `.188`-Mage (unerreichbare Queen) plus echte Mehr-Ebenenwechsel, Blocker, alternative Wege und Reset abnehmen. Der verbesserte Dungeon muss NPC-/Loot-/Quest-/PULSE-Schnittstellen erhalten.

**Phase S5 – neue Bewegungsarten nach expliziter Designentscheidung:** Klare Zustimmung, reale NPC-Zusage, echte kleine Teilhandlung, fehlendes GO, Gefahr, Dungeon, mehrdeutige Person, Spielerfrage als Gegenfälle. `BACK_WAY`/`STAYS` nur dann löschen, wenn die neue Umsetzung deren tatsächliche Fälle vollständig ersetzt.

**Phase S6 – N3 allenfalls nach messbarer Hostprobe:** keine automatischen Antwortswipes allein wegen `no_go` ohne atomare Rücknahme oder nachweislich vollständig folgenloser Antwort.

**Jede Phase:** erst unabhängige rote Originalfälle, dann kleine Host-/Node-Regressionen, Replay mit einzeln begründeten Abweichungen, echte isolierte ST-Smokes bei Host-/Vertragsänderung, kurzer natürlicher Vergleich; **keine riesige Gesamtimplementierung**. Fortschritt darf nicht nur „weniger Code“ bedeuten: auch Spielerhoheit, kein Datenleck, kein falsches NPC-Wissen, kein doppelter Ort und keine verlorene rechtmäßige Reise sind Abnahmekriterien.

## 8. Entscheidung

**Die Studie ist substanziell und wechselt zu Recht von Symptompflastern zu gemeinsamer Zuständigkeit.** A1/A2 verdienen einen verbindlichen detaillierten Fachplan und einen begrenzten Schattenprototyp. **Keine Freigabe, sämtliche vorgeschlagenen Prüfungen sofort zu löschen oder D2/D3 wortgetreu umzusetzen.** Der höchste zusätzliche Architekturgewinn könnte in **einem einheitlichen, inkrementellen Dungeon-Wegevertrag** liegen, nicht zwingend in einer vollständigen vorab erzeugten Karte.

**Wertvoller Kern:** Weniger widersprüchliche Komponentenentscheidungen, ein einziges Ereignislog, weiterhin freie Narration dort, wo der Spieler wirklich etwas erleben darf. **Wertvoller Verzicht:** Nicht jedes Stück freie Prosa muss einen neuen mechanischen Ort, Dungeonraum oder eine vollständige neue Reiseart erzeugen. **Nicht verzichten:** Spielerentscheidung, echte Kausalität und geschützte Szenen-/NPC-Identität.

**Keine Produkt-, Kanon- oder Runneränderung aus diesem Gegenreview.**
