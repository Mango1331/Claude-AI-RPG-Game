# Avereth – finale Patchnotes und Umsetzungsspezifikation nach Architekturreview .126

**Historische finale Spezifikation vom 30.10.2026 auf Produktbasis [Build .126 / b8d2af4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b8d2af4b76cd0bc52ac178b8c500e5733878ecee).** Die folgenden Anforderungen dokumentieren den damaligen Umsetzungsauftrag, **nicht** den heutigen Aufgabenstand. **A/B1/C/D sind inzwischen bis [.136 / 8efb926](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926) implementiert** ([A .127](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/167e2e9), [B1 .130/.131](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc71256), [C .132](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8908850), [D .133–.136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926)); ST-Host-Smokes auf .136 bestanden. **Makro-Startfehler aus Batch 31.10. ist mit [.137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373) behoben und im echten ST-Makro-Starttest geprüft; offen bleiben der natürliche Batch F und nachrangig B2/E. Einzige laufende Priorisierung: [03](../03_AKTUELLER_PROJEKTSTAND.md).

Maßgeblich ist diese Fassung. Vorherige Entwurfsentscheidungen werden durch die folgenden Regeln ersetzt; die [Planfassung einschließlich GPT-Nachtrag](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c036f3c617f095dc876df4ff0589d6cbaff27f4c/patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md) bleibt historisch erreichbar.

## 1. Grundlagen und Grenzen

Quellen: [Claude-Audit](architekturaudit_126/01_CLAUDE_AUDIT.md), [Sol-Gegenfeedback](architekturaudit_126/02_SOL_GEGENFEEDBACK.md), [Claude-Gegenreview](architekturaudit_126/03_CLAUDE_GEGENREVIEW.md), [Sol-Präzisierungen](architekturaudit_126/04_SOL_ENTSCHEIDUNGEN.md), anschließend [Claude-Abschlussreview mit Sonden](architekturaudit_126/05_CLAUDE_ABSCHLUSSREVIEW.md). Das zusätzliche GPT-Feedback wurde im verlinkten Entwurf aufgenommen. Originaldateien aller 19 Batches: [Archivindex](../testrun_10b/ARCHIV_BATCHES.md).

- Aktuelles Produktziel: V4-C, Ruleset 2, drei Klassen und die aktuellen F-Regeln. Alte Kampagnen begrenzen die Weiterentwicklung nicht. Aktuelle Geld-, Inventar-, Orts-, Kampf-, Quest- und Replayintegrität bleiben verbindlich.
- Keine neuen Kampf-, Reise-, NPC-Bewegungs- oder Questmechaniken. Delivery/Escort ruhend erhalten, keine neuen automatischen Lieferangebote. Formale Privatquests bleiben abgeschafft; freie Hilfe, Arbeit und Geschenke bleiben.
- XP, PP, Startwerte, Preise als Zahlenwerte, Skills, Monster- und Main/Minor-Balance unverändert. Keine neuen Gearslots.
- Bedingte Käufe und kompakte Reisen bleiben möglich. Kein zusätzlicher Pflichtkaufzug, kein neues Shopsystem, kein WorldTxn, keine Kill-Credit-Verbrauchsverwaltung.
- Originalreviews und Archive unverändert; historische Sicherheitsfälle auf aktuelle Konfiguration übertragen. Keine nachträgliche Reparatur alter Kampagnen.
- Laufende Batches auf ihrem Build beenden. Produktcode auf Dev, zentrale Planung/Status auf main; nach Umsetzung technische Ergebnisse einmal in der Dev-Fachpatchnote festhalten.

**Geprüfte Nachweise unterscheiden:** Claudes Abschlussreview berichtet eigene Verarbeitungssonden auf .126 mit Original-Vorzuständen: Batch19 Antworten 268/273 eventgleich, Planner295/295, Board/Forge7/7, Steuerzüge24/24. Die fünf Antwortabweichungen entsprechen den .126-Artkorrekturen. Batch17/18 zeigen weitere erwartbare Buildunterschiede; das ist keine rote Regression des geplanten Patches. Sol hat die entscheidenden Codepfade statisch gegengeprüft, aber diese neue Replaymessung nicht nochmals ausgeführt. Durch diese Dokumentation keine neue Node-/ST-Abnahme.

## 2. Prioritäten und Umsetzungsschnitt

| Paket | Priorität und Umfang | Voraussetzung | Ergebnis |
|---|---|---|---|
| A – Integrität und Testbasis | Hoch, mittel | Aktuellen HEAD festhalten | Keine Buchung aus beschädigtem Fold; belastbarer Verarbeitungskorpus |
| B1 – Aktuelle F-Regeln ohne historische Schalter | Hoch, mittel | A | Eine aktuelle Regelvariante als gemeinsame Grundlage für C/D |
| C – Population, Alter und Jagdidentität | Hoch, mittel | A + B1 | Zugehörigkeit unabhängig von Namen/Level; kein falscher Credit oder Duplikat |
| D – Strukturierte Gearangebote und Kaufzustimmung | Hoch, mittel | A + B1; unabhängig von C | Richtige Profile, einzeln erkennbare Waren, verbindliche Preise und sichere Paketkäufe |
| B2 – Formale Privatquest-Restpfade | Nachrangig, begrenzt | A | Unnötige historische Sonderprüfungen entfallen |
| E – Größerer historischer Pfadabbau | Nachrangig, größer | A + Nutzungskarte | Nicht benötigte V3/V4-A/Ruleset1-Spielpfade entfallen |
| F – Natürlicher Batch | Direkt nach C/D-Abnahme | Technische Abnahme des Kernpatches | Gameplay und tatsächliche Vereinfachung messen |

**Reihenfolge: A → B1 → C/D → F.** B2 kann unabhängig von C/D bearbeitet werden; E folgt nachgelagert. B2/E blockieren F nicht und sind keine Voraussetzung des nächsten Kernpatches. Keine parallelen Agenten oder separaten Mini-Releases erforderlich: fachlich prüfbare Commits innerhalb einer freigegebenen Umsetzung genügen.

B1 gehört vor C/D: `materialise/populationAt/areaLevels` hängen heute an `f_progression`, reguläre Gearpreise an `f_balance`. Diese Varianten erst vereinheitlichen, statt neue Strukturregeln doppelt zu implementieren.

## 3. Paket A – Foldintegrität und aktuelle Abnahmebasis

**Ursache:** `host.foldChat()` sammelt Reducerfehler, liefert aber einen partiellen Zustand. V4-Runtimepfade verwenden dessen `.state` weiter. Kein nachgewiesener jüngster Geldschaden; ein konkret unsicherer Commitpfad.

**Betroffen:** `src/host.js:foldChat`, `src/v4/runtime.js:prepareGenerationAsync/processReplyV4/extractionRequest/runExtraction/applyExtraction`, `src/v4/world_jobs.js`, Fehler-/Speicherpfade in `index.js`; aktuelle Testharnesses und ein begrenzter Offline-Korpus.

### A1 – Verarbeitungskorpus statt bloßem Event-Fold

- Batch17–19 verwenden, ergänzt um den Batch16-Verkaufsfall Record78 und vorhandene gezielte Sicherheitsregressionen. Originalvorzustand + Input/Narration + aufgezeichnete Modellantwort durch die tatsächlichen World-/Runtime-/Plannerpfade verarbeiten; keine Provideranfragen.
- Baseline aus dem gewählten Startcommit erzeugen und mit dessen SHA festhalten. Reiner Umbau: null fachliche Differenzen. Beabsichtigte Änderung: pro Record begründete Differenzliste, einschließlich abhängiger Quest-/Kauf-/Fortschrittswirkungen. Nicht gegen alte Originalbuilds blind Nullabweichung verlangen.
- Serialisierte Events samt Reihenfolge/IDs/RNG und Recordausgaben `corrections/system/rejected/continuation` vergleichen. Nur ausdrücklich benannte Diagnosefelder ausnehmen, anfangs `ms` und Versionsstrings in `extract.applied/cmd.interpreted`. Fachliche Felder niemals pauschal normalisieren.
- Event-Fold und `validateState` zusätzlich durchführen; vorhandene Zustandsinvarianten behalten. Gleiche Events gelten nicht als Freibrief für direkte, nicht gebuchte Zustandsänderungen.
- Versteckte `#`-/Steuerinputs im Harness so einspeisen, dass `lastPlayerIndex` sie tatsächlich verarbeitet. Board-/Forgeantworten aus Completion-Logs nutzen, über Requestzweck, Reihenfolge und zugehörigen Spielerzug zuordnen; wiederholter identischer Spielertext allein ist keine eindeutige Zuordnung.
- Abdeckung, bewusst übersprungene Fälle und Gründe numerisch ausweisen. Kein zweiter vollständiger Durchlauf alter LLM-Antworten auf bereits veränderten Folgezuständen als verpflichtender Nullvergleich. Eine kleine aktuelle Integrationskette Erstellung → Gilde → Jagd → Kampf → Verkauf/Kauf → Fortschritt bleibt als Übergangsprüfung.
- Aktuelle Harnessdefaults und Sicherheitsfälle erhalten. Historische Sollzahlen/Varianten nur entfernen, wenn sie keine aktuelle Anforderung mehr prüfen.

**Aufzeichnungen:** Keine zusätzliche Vollkopie von `plan.raw`, Board-/Forgeantworten in Chatrecords. Laut Abschlussreview reichen die vorhandenen Completion-Logs, dort keine abgeschnittenen Plannerantworten. Nur eine konkret nachgewiesene Datenlücke gezielt schließen.

### A2 – Alle autoritativen Schreibgrenzen absichern

- Vor neuem Planner-/Extractorauftrag und vor jedem autoritativen Commit Foldfehler prüfen; ausdrücklich auch im laufenden Extraktor nach dessen Antwort. Den bisherigen Chat unverändert lassen: keine Geld-/Zeitbuchung, kein Kampfzug, kein `setRec` mit Ersatzevents.
- Begrenztes gemeinsames Ergebnis für „Fold ungültig“ verwenden, keine allgemeine Exception- oder Transaktionsarchitektur.
- **World-Job-Fehlerpfad:** Ein Foldabbruch darf nicht in `failed → applyExtraction(null, errorKind:'engine')` gelangen. Dieser Pfad würde `extract.failed` buchen. Ein Foldabbruch ist auch keine sichere `world_not_applied`-Fortsetzung.
- Vorhandener Pending-Record bleibt unverändert; Host zeigt die Blockade statt eines vermeintlich normal weiterlaufenden Extraktors. Keine automatischen Provider-Wiederholungen wegen desselben beschädigten Verlaufs.
- Meldung: erster fehlerhafter Nachrichtenindex/Eventart und Wiederherstellungsweg. Gültigen Stand laden oder betroffenen Verlauf nach bewusstem Nutzereingriff ab der Fehlerstelle verwerfen; kein automatisches Löschen/Heilen. Export/Rohhistorie erhalten, partiellen Zustand nicht als gültiges HUD ausgeben.
- Ein gültiger Zustand mit einem harmlos verworfenen NPC-Delta bleibt normal nutzbar. Bestehende Stale-, Chat-, Text-, Swipe- und Save-Sicherungen bleiben.

**Abnahme:** Foldfehler vor Spielerzug, vor Extraktoranfrage, während laufender Anfrage und im Job-Fehlerpfad: keine neue autoritative Buchung/Providerfortsetzung, kein Fehler-Ersatzrecord. Nach Laden eines gültigen Standes funktioniert der Ablauf wieder. Aktuelle Integrationskette, Replay/Reload/Swipe, volle Node-Suite und echter ST-Smoke einschließlich gespeicherter Records.

## 4. Paket B1/B2 – Variantenabbau und kleine Kompatibilitätsgrenze

**B1:** `f_progression`, `f_balance`, `starter_aoe` und die Jahrlingsoption nicht länger als alte/neue Kampagnenvarianten auswerten. Aktuelle Werte bleiben unverändert. Betroffen: Kampagnenstart, Domain, Guild, Items, Skills/Growth, Harness/Fixtures und ihre tatsächlichen Nutzer. Exakte entfernte Schalter im Diff ausweisen.

**Versionsschutz ohne neues Feld:** Vorhandenes `campaign.started` samt `engine_version` nutzen. Aktuelle Startmetadaten werden im Reducer nicht vollständig in `state.meta` übernommen; vorhandenen Startrecord auswerten, keine fehlende Metadatenpersistenz unterstellen.

- B1 unterstützt die bisherige .126-Konfiguration V4/C, Ruleset2, aktuelle F-Flags und `private_quests:false`. Abweichende historische Konfigurationen vor neuer Verarbeitung mit verständlicher Meldung sperren.
- Neu erzeugte Kampagnen nach Entfernen der Flags über ihre unterstützte Startversion erkennen; nicht für immer das Vorhandensein der gerade abgeschafften Flags verlangen. Keine neue Policytabelle.
- C führt die tatsächliche inkompatible Grenze ein: neue Populations-/Altersverträge. Einen Mindest-Startbuild anhand der dann vergebenen Produktversion festlegen; frühere Kampagnen nicht still umdeuten. Falls C/D gemeinsam erscheinen, dieselbe Grenze nutzen.
- Versionen numerisch parsen, nicht lexikografisch vergleichen. Fehlende, nicht unterstützte oder unlesbare Startmetadaten ablehnen; keine Warnung mit anschließendem Weiterspielen. Keine Migration und kein neues Kennungsfeld. Aktuelle unterstützte Saves bleiben reload-/swipesicher.

**B2:** ausschließlich historische Erzeugungs-/Ausführungs-/Anzeigewege formaler Privatquests entfernen. Gemeinsame Guild-Funktionen, Delivery/Escort, freie Arbeit, NPC-Hilfe, Geld-/Sachgeschenke, Fakten und Erinnerungen erhalten. Kein größerer V3-/Ruleset1-Abbau innerhalb B1/B2.

**Abnahme:** B1 und reine B2-Bereinigung auf der aktuellen Replaybaseline ohne fachliche Abweichung. Aktuelle Hilfe/Geschenke und Gilde funktionieren; keine formalen Privatquests. Nicht unterstützte Kampagne ohne Geld-, Zeit-, Record- oder Provideränderung gesperrt; korrekt neu erzeugte Kampagne wird angenommen. Sicherheitsfälle übertragen, alte Zahlenpolicies nicht nachbauen.

## 5. Paket C – Ausdrückliche Population, Alter und individuelle Identität

**Ursache:** Arten-/Namensrekonstruktion beeinflusst Anker, Level und Jagdzählung unterschiedlich. In `materialise()` hängt `population_at` zudem vom Levelbereich ab. Batch19 Records214/218/232/272/376 sowie Batch18-Kröten belegen die wechselnde Fehlerklasse.

**Betroffen:** `content/deltas.json`, Extractorprompt/-parser/Katalog, `world.newEntity`, `domain.populationAt`, `engine.materialise`, `guild.areaOf/defeatTally/cullKind` und neue Huntvertragsvalidierung; Entity-Validator/Reducer nur soweit für die vorhandenen Strukturen erforderlich.

### C1 – Zugehörigkeit und Fehlerbehandlung

- Neue Outdoor-`creature.new` melden `population` als gültige Populations-Orts-ID oder ausdrücklich `independent`, dazu `life_stage: adult|young`. Die Engine validiert am bestätigten Ereignisort und dessen Vorfahren; bei entfernter Sichtung nicht blind am PC-Ort. Mitgliedschaft erzeugt keine Anwesenheit.
- Diese Angaben sind fachlich erforderlich, aber nicht als fehlendes Schema-Pflichtfeld oder dynamisches ID-Enum zu behandeln: optionale Stringfelder im Transport, fehlende/unbekannte/ortsfremde Werte über den vorhandenen semantischen `issues`-Pfad reparieren. Auch unklare Altersangaben lokal behandeln. Echte JSON-/Typfehler bleiben Schemafehler.
- Vorhandenes Repair-/Fail-soft-Verfahren wiederverwenden, keinen neuen Retrykreis. Nach erfolglosem Repair betroffene Kreatur und wirklich abhängige Wirkungen ablehnen; unabhängige gültige Geld-, Ankunfts- und Faktendeltas erhalten.
- Ungültige Population niemals zu `independent` umdeuten. Im neuen Protokoll keine Namensfallback-Zuordnung zur Population.
- **Echte Dungeons:** keine Outdoor-Mitgliedschaft verlangen. Fehlende Angabe oder `independent` bedeutet dort nur „keine Außenpopulation“; eine Außenpopulations-ID ist ein semantisches Issue. Living-Slots behalten Identität, Anker und Level. Kein Slotgegner-Doppelspawn und keine Außenbindung über die Dungeon-Vorfahren.

### C2 – Datenbedeutung, Stärke und Questcredit

- `entity.population_at` = validierte Zugehörigkeit, unabhängig vom individuellen Level. `entity.life_stage` speichert die Alterskategorie. Kanonische Populationsart/-anker aus `places[population_at].population` beziehen, keine zweite kanonische Artkopie.
- **`entity.species` bleibt die individuelle Bezeichnung.** Nicht alle Tiere auf dieselbe Artzeichenfolge umbenennen. Populationsart dient der mechanischen Zuordnung; freier Name/Bezeichnung bleiben sichtbar.
- Anker muss mit der Population vereinbar sein. Erwachsene erhalten das geltende Level-Fenster; explizite Individuen-/Dungeonvorgaben behalten ihre Priorität. Jungtiere übernehmen kein pauschales Erwachsenenfenster. Bestehende ausdrücklich juvenile und individuelle Vorgaben nutzen, keinen neuen Altersmultiplikator einführen.
- Neue Populationsjagden speichern die erlaubte Altersgruppe bei Veröffentlichung, standardmäßig `adult`; ein ausdrücklich zulässiger Jungtierauftrag legt `young` fest. Generator, Inhaltsprüfung und Ausführung teilen diese Bedeutung.
- Im Populationsauftrag entscheiden Zugehörigkeit, Vertragsalter, die geltende Populations-Levelspanne und tatsächlicher Tod/erlaubte Flucht seit Annahme. Die bislang durch `population_at` indirekt erzwungene Levelgrenze separat erhalten: Ein ausdrücklich schwaches erwachsenes Mitglied außerhalb der Zielspanne bleibt zugehörig, gibt aber keinen unberechtigten Questcredit. `guild.defeatTally()` darf anschließend nicht erneut am individuellen `species`-Text scheitern. Sonstige bestehende Vertragsbedingungen erhalten. Dungeon-/Personenziele nicht pauschal auf Outdoorregeln umstellen.
- Kein Kill-Verbrauch/zusätzliche Credit-Events: überlappende gezählte Jagden bleiben nach bestehender Regel gesperrt.

### C3 – Individuen, Gruppen und abhängige Behauptungen

- Eindeutige vorhandene Entity-/Storyreferenzen und Scene-Handles zuerst verwenden. Population bezeichnet niemals ein Individuum. Zwei Sauen derselben Population bleiben getrennt; eine verletzte Sau behält bei eindeutiger Wiedererkennung ID und HP trotz veränderter Beschreibung.
- Rückkehr-, `here`-, `back`- und Gruppenpfade in `newEntity()` zusammen prüfen. Bestehende Gruppenreferenzen und `more` erhalten. Gleiche Art allein beweist keine Identität; unterschiedliche Prosa allein beweist kein neues Tier. Vorhandene begrenzte Klärung verwenden, keine neue Identitätsengine.
- Abgelehnte Kreaturenreferenzen einschließlich Gruppenmitglieder in die vorhandene lokale Referenzsperre einbeziehen. Spätere `hostile/position/aware` oder Fakten dürfen nicht per Resolver auf eine andere bestehende Kreatur ausweichen.
- Referenzfelder der tatsächlich betroffenen Deltas berücksichtigen, nicht nur die bisherigen Personenfelder. Keine globale Sperre unabhängiger gültiger Tiere; explizit an ein abgewiesenes Delta gebundene Wirkungen bleiben abgewiesen.

**Regressionen:** Originalfälle oben; stag/hind/alpha/tusker ohne weitere Wortlisten; GiantBoar≠Turtle; falsche Populations-ID/Ort, unabhängige Kreatur, Fernsichtung; adult/young mit eigenem Level und getrenntem Credit; explizit schwaches Erwachsenenindividuum außerhalb des Zielbandes; zwei Sauen und verletzte Rückkehr; Gruppenvergrößerung; abgelehnter Tusker + `hostile by` bei anderem anwesendem Boar; echte Dungeons samt äußeren Vorfahren; Tod/Flucht vor/nach Annahme; Ablehnung einer Kreatur bei gültigem Geschenk/Ankunft im selben Report; Replay/Reload/Swipe.

**Grenze:** Eine formal gültige, aber semantisch falsche Populationswahl bleibt als Modellfehler möglich. Im Evaluator beobachten, kein neues Prosa-Veto. Optional beide Richtungen diagnostizieren: auffällige Bindung und auffälliges `independent`; Diagnosen steuern niemals Credit/Level.

## 6. Paket D – Strukturierte Gearangebote auf bestehendem Handelspfad

**Ursache:** Namen werden als Gearprofile interpretiert; Wortpreisprüfung läuft vor Enginepreis. Batch18 Records172/173 zeigen ein bezahltes Schwert-/Rüstungspaket als einziges Armorobjekt. Abschlussreview berichtet mindestens fünf natürlich abgewiesene reguläre Gearzeilen wegen Preisbelegen und49 Preiskorrekturen in Batch18/19.

**Betroffen:** Offer-Delta/Extractor, `world.offerLines`, `items.itemProfile/gearRetailPrice/gearOfferWhy`, vorhandene Gearvorlagen/-kataloge und Anzeigen; `trade.pickLines/bookPurchase` bleibt Buchungspfad.

### D1 – Genau eine unterstützte Ware je Zeile

- Reguläre Gearzeile erhält genau eine `base`-ID aus Enginecontent und eine unterstützte `quality`. Aus ihnen Profil, Slot, Rang und Werte bestimmen; unbekannte Vorlage ablehnen, kein stiller Common-/Dekorationsfallback. Keine neue Ausrüstungsebene.
- Angebotszeile, Systempreis, Kaufbestätigung und erzeugter Objektname nennen eindeutig den Engine-Vorlagentitel samt Qualität; Werte bleiben in der bestehenden Anzeige sichtbar. Narratorname nur als Beschreibung speichern/anzeigen, nicht als Kauf-/Equipidentität.
- Schwert+Rüstung = zwei Zeilen mit zwei Profilen, Preisen und Mengen. Eine Zeile mit einer Basis kann mechanisch nur diesen Gegenstand liefern. Eine Paketbezeichnung darf weder Gesamtpaketzustimmung noch das Erzeugen zweier Objekte vortäuschen.
- Automatische Auswahl für einen vorab erklärten Paketkauf nur, wenn alle verlangten Komponenten eindeutig durch Zeilen abgedeckt sind. Bei fehlender Komponente nichts als vollständiges Paket kaufen; keine frei erfundenen Zeilen ergänzen. Ein später ausdrücklich akzeptierter einzelner Enginegegenstand darf normal gekauft werden.
- Vorhandene Zeilen-IDs, Profile, `offer.created`, Mengen-/Geld-/Verkäufer-/Ortsprüfung und atomare Mehrzeilenbuchung nutzen. Buy→Equip verwendet dasselbe Profil, keine neue Namensanalyse.
- Kanonische Fachhändlerangebote und Narratorangebote müssen denselben Vorlagen-/Preisvertrag einhalten. Lootverkauf, Skillmaterial, Dienstleistungen und Geschenke nicht nebenbei umbauen.

### D2 – Preis und Zustimmung getrennt

- Erst Ware/Profil klassifizieren, dann Preisquelle wählen. Regulärer F-Enginepreis vor der bisherigen Wortpreisprüfung: fehlende oder andere erzählte Summe verhindert nicht allein das gültige Angebot.
- Flexible Waren, Verkaufserlöse, Geschenke, Dienste und besondere/E+-Gegenstände behalten ihre bisherigen Beleg-/Preisregeln. Reguläre Preiswerte selbst unverändert.
- **Angebot ist keine Kaufzustimmung.** Bestehende ausdrücklich akzeptierte Angebote bleiben verbindlich, kein stilles nachträgliches Umwerten.
- Bei einem abweichenden oder zuvor nicht belegten Enginepreis darf im selben Zug nur bei konkreter Zustimmung zu Waren und Mengen sowie ausdrücklichem `max_cp` gekauft werden, wenn der Engine-Gesamtpreis aller gewählten Zeilen das Limit einhält. Auch bei vorhandener `any_price`-Markierung darf ein ausdrücklich gesetztes Limit nicht übergangen werden.
- Die bisherige pauschale Sperre jeder Preiskorrektur für diese ausreichend begrenzten Käufe ersetzen. Kein erneuter Bestätigungszug bei bereits passender Zustimmung und Limit.
- `any_price` allein erlaubt keinen automatisch abweichenden oder zuvor unbekannten Enginepreis. Angebot offen lassen, ohne Abbuchung; explizite Annahme des sichtbaren Angebots bleibt möglich. Unveränderter belegter Preis im bisherigen eindeutig autorisierten Vorgang bleibt zulässig.
- Fehlende Mittel, ungeklärte Auswahl, nicht anwesender Verkäufer oder noch nicht bestätigte Ankunft verhindern weiterhin die Buchung. Keine automatische Spielerreise.

**Regressionen:** Originalpaket, später korrektes Zweizeilenangebot und Buy→Equip; feinere/bessere freie Bezeichnung ohne Profiländerung; unbekannte Basis; fehlender/anderer Prosa-Gearpreis; Paket mit fehlender Komponente; richtige Auswahl mit Gesamtlimit, darunter/gleich/darüber; `max_cp` trotz `any_price`; Repricing mit/ohne ausreichende Zustimmung; `any_price` bei unbekanntem/neuem Preis; unverändertes gespeichertes Angebot; kanonischer Händler; gewöhnlicher Verkauf/Geschenk weiterhin belegpflichtig; kein Geld/kein Verkäufer; wiederholte Erwähnung; Replay/Reload/Swipe.

**Bewusste Grenze:** Eine falsche, aber gültige Basiswahl kann weiter vorkommen. Der Spieler sieht vor Kauf den verbindlichen Einzelgegenstand. Keine zusätzliche allgemeine Paket-Prosaerkennung vorab; nur bei nachgewiesenem verbleibendem Fehler gezielt prüfen.

## 7. Paket E – Historische Spielpfade später entfernen

Vor Entfernung Nutzungskarte erstellen. V3-Runtime, V4-A und nur historische Ruleset1-Zweige dürfen entfallen; aktuell gemeinsam genutzte Funktionen bleiben.

Insbesondere `delta.reportToEvents`, Teile von `interpret.js` (Plannerhilfen/`amountErrors`), `intent.js` (Erstellung/Befehle/`mentionedSkills`), `engine.playerTurn` und `combat.js` nicht allein wegen alter Herkunft löschen. Gemeinsame Helfer nur bei konkretem Nutzen klein herauslösen. Kein vollständiges World-Modul-Refactoring.

**Abnahme:** aktuelle Verarbeitung fachlich identisch, Replaydifferenz0 auf freigegebener aktueller Baseline; Vollsuite und betroffene ST-Abnahme. Erhaltene Sicherheitsregeln und bewusst entfernte historische Szenarien ausweisen. Keine Verpflichtung, alle alten Klassen-/Zahlenfixtures weiterzuführen. B2/E separat fertigstellen, ohne F hinauszuschieben.

## 8. Gemeinsame technische Abnahme und natürlicher Nachweis

1. Vor Codebeginn HEAD und relevante Änderungen prüfen; Build-/Protokollgrenzen verbindlich notieren. Noch keine konkrete künftige Buildnummer in dieser Planung.
2. Bestätigte Originaldefekte und Gegenfälle gegen unveränderte Basis rot/grün nachweisen. Schemaänderungen mit transparent umgerechneten Offline-Testdaten prüfen; keine nachträgliche Änderung der Originalarchive. Unveränderte alte Rohantworten sind ab C/D nicht automatisch gültiger neuer Input.
3. Für reine Umbauten Replaydifferenz0; für C/D begründete Liste aller betroffenen Records und fachlichen Folgewirkungen. Keine pauschale Freigabe „alle Creature-/Offer-Records dürfen abweichen“. Originalzustandsproben ersetzen keine aktuellen Übergangstests.
4. Gezielte und angrenzende Regressionen, abschließend volle `npm test` für den freigegebenen Kernpatch. Echten ST-Smoke für Host-/Extractor-/Angebotsprotokolländerungen ausführen: Recordcommit + Save, Reload, Swipe, nicht nur sichtbare Prosa. Ergebnisse/Blockaden tatsächlich berichten.
5. Extractor-/Delta-/gegebenenfalls Angebotsversionen bei geänderten Verträgen erhöhen, Prompts/Katalog/Schema gemeinsam anpassen. Narratorkartenrevision nur bei tatsächlicher Änderung ihres Vertrags, nicht automatisch bei jedem Produktbuild.
6. Nach A/B1/C/D technisch abgenommenem Stand genau den bestehenden natürlichen Guildbatch für Warrior/Mage/Rogue ausführen; unveränderte Ziele und Balance, bis ausdrücklich angenommener E-Klasse oder regulärem Ende. Kein künstlicher Fortschritt und keine laufenden Batches umstellen.
7. Messen: mechanisch erfolgreiche Handlungen, Inputs/Zeit, sichere Fortsetzungen, verlorene Weltinformationen, Integritätsfehler und semantische Repairs; besonders Population/Alter/Credit sowie Gearprofile/Pakete/Käufe. Modellfehler, Bedienfehler und regelgerechte Tode getrennt ausweisen.
8. Vereinfachungsgewinn knapp aus Diff/Testbericht: entfernte aktive historische Schalter, tatsächlich ersetzte Namensheuristiken/zusammengeführte Prüfungen, verbleibende Ausnahmen und Korpusabdeckung. Kein neues Metriksystem; weniger Zeilen/Regex allein sind kein Erfolg.
9. Danach unabhängiger Diff-Gegenreview gemäß Arbeitsweise. Keine weitere vorsorgliche Architektur-Reviewphase oder Mikrofixserie ohne konkreten neuen Befund.

## 9. Abschlussentscheidungen aus dem letzten Review

K1/K2 (Replay und World-Job-Foldschutz), K3–K6 (individuelle Bezeichnung, semantische Populationissues, abhängige Kreaturenreferenzen, Dungeonabgrenzung), K7/K8 (sichtbare Einzelvorlagen und preisbegrenzte Kaufzustimmung) sowie K9 (vorhandene Startmetadaten) sind übernommen und oben konkretisiert.

**Bewusste Präzisierungen gegenüber dem Review:** Ein echter Dungeon muss kein nutzloses Outdoor-Pflichtfeld liefern. Gleichartige Tiere werden nicht allein durch Populationsbindung identisch. Reine Eventgleichheit behält Fold-/Zustandsvalidierung als Gegenprobe. Bei beabsichtigten Änderungen sind auch Folgewirkungen prüfpflichtig. Fehlende Paketkomponenten erlauben keinen vorab zugesagten vollständigen Paketkauf. Die Meldung eines Foldabbruchs muss den Host erreichen, ohne dessen allgemeinen Fehlerbuchungspfad auszulösen.

**Gestrichen:** zusätzliche Vollantwortkopien in Chatrecords, verpflichtende zusammenhängende Wiedergabe alter Modellantworten nach geändertem Zustand, neues Kompatibilitätsfeld, Populations-ID-Enum als globaler Schemafehler, Überschreiben individueller Artenbezeichnungen, Kill-Credit-Events.

**Zurückgestellt:** Foldcache, Save-Verschlankung, Prompt-/Modellwechsel, neue Reise-/Szenenregeln, pauschaler Zweizugkauf, universelles Transaktionssystem, umfassende NPC-Identitätsengine und weitere Balanceänderungen.

**Archivgrenze:** Die geplanten Schritte, Regressionen und frühere Implementierungsanweisungen oben bleiben als Originalanforderungen dokumentiert, sind **kein neuer Umsetzungsauftrag**. Abgeschlossene Produktdetails stehen beim [Commitabschluss .136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926) und der [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). Offene Schritte ausschließlich in [03](../03_AKTUELLER_PROJEKTSTAND.md).
