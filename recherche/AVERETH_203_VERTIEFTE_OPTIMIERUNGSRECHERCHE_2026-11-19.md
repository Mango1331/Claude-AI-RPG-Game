# Avereth `.203` – Vertiefte unabhängige Optimierungsrecherche

**Stand:** 19. November 2026  
**Untersuchungsbasis:** Avereth `4.3.0-c.6.6.203`, Commit `5e5b8272412b51b91f75b6e37c5b94d95c9fae11`, SillyTavern 1.19.0, dokumentierter Featherless-/GLM-5.3-Flash-Pfad  
**Vorgesehener Dateiname:** `recherche/AVERETH_203_VERTIEFTE_OPTIMIERUNGSRECHERCHE_2026-11-19.md`

## 1. Ergebnis und Beleglage

Avereth hat drei verschiedene Optimierungsprobleme, die sich für den Spieler ähnlich anfühlen können. Erstens kann dem Modell ein entscheidender Fakt fehlen. Zweitens kann es einen vorhandenen Fakt zugunsten der bisherigen Geschichte übergehen. Drittens kann eine fachlich gute Antwort so spät spielbar werden, dass der Erzählfluss abreißt. Die drei Probleme erfordern unterschiedliche Eingriffe.

**Ich empfehle, die gegenwärtige Aufgabenverteilung für den nächsten Vergleich beizubehalten.** Die Engine bucht bereits gewählte Mechanik und speichert dauerhafte Folgen. Der Narrator entscheidet weiterhin über gewöhnliche NPC-Handlungen und neue erzählerische Entwicklungen. SillyTavern übernimmt Präsentation, Verlauf und Transport. Die aussichtsreichste Verbesserung liegt momentan an den Übergängen: Was bestätigt die Engine dem Erzähler für *diese* Szene? Welche ältere Erzählung konkurriert damit? Wann erlebt der Spieler die nächste Entscheidung als sinnvoll erreichbar?

Dafür sprechen zwei konkrete Gegenfälle. Bei Glimmerdeep fehlte dem `.202`-Narrator die gespeicherte Richtungsbeschreibung. Am Boss dagegen waren Hinweise gegen zusätzliche Dungeonkäfer bereits im Prompt angekommen, und die erfundenen Käfer handelten trotzdem weiter. Mehr Fakten im ersten Fall und mehr Warntext im zweiten sind keine gleichwertigen Lösungen.

**Die beiden Ausgangsberichte wurden im vollständigen Chatwortlaut verglichen.** Für die Codeprüfung standen die im Entwicklungsverlauf vorliegenden `.203`-Diffs, Funktionsauszüge und Browserergebnisse zur Verfügung. Die Rechnungen in den Abschnitten 3 und 4 sind für diesen Bericht aus den angegebenen historischen Zahlen abgeleitet. Der erste Bericht enthält außerdem eine eigene Auswertung von 17 Originalrequests. Diese übernehme ich als zugeordneten Befund seines Autors. Eine erneute Ausführung auf den Originaldateien war nicht möglich.

**Grenze der externen Recherche:** Der Executor blieb offline. Ein unabhängiger aktueller Webabruf, ein Vergleich der Chatfassungen mit dem heutigen `main` und eine neue Prüfung der Kontoeinstellungen waren nicht möglich. Der erste Bericht dokumentiert eigene Quellenabrufe am 19.11.2026. Die weiterführenden externen Referenzen dieses Berichts sind direkt verlinkte Primärdokumentation, Forschung oder Entwicklerpraxis. Ihre heutige Erreichbarkeit und ihr aktueller Versionsstand wurden hier nicht erneut bestätigt. User06 und die persönliche ST-Installation wurden nicht verwendet.

Grundlagen: [Forschungsstand A](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/LLM_KONTEXT_ST_RPG_PERFORMANCE_FORSCHUNGSSTAND_2026-11-19.md) · [Forschungsbericht B](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/FORSCHUNGSBERICHT_AVERETH_203_LLM_KONTEXT_SPIELQUALITAET_PERFORMANCE_2026-11-19.md) · [User05-Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/866b2a9/recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) · [Technische `.203`-Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md)

## 2. Wo die beiden Berichte überzeugen und wo ich widerspreche

| Frage | Bewertung |
|---|---|
| Welcher Bericht liefert den stärkeren Cachebefund? | **A.** Die frühe erste Abweichung im tatsächlich protokollierten Narratorrequest ist ein konkreter Befund. B behandelt die Präfixmessung noch als ausstehend. Tatsächlich fehlt die Erweiterung auf B/C, Nachrichtengrenzen und Tokenisierung. Die Phase-A-Untersuchung liegt bereits vor. |
| Sollte die Promptreihenfolge zuerst geändert werden? | **Als Offlineversuch ja, als vorweggenommener Produktpatch nein.** Die Reihenfolge lässt sich billig untersuchen. Für Spielerqualität ist aber noch offen, ob die spätere Position der Lore hilft, schadet oder keinen erkennbaren Unterschied macht. |
| Welcher Bericht behandelt NPC-Gedächtnis überzeugender? | **B.** Ein im Prompt vorhandenes Versprechen, seine glaubwürdige Verwendung und sein späterer Erhalt sind unterschiedliche Leistungen. Ich ergänze eine vierte Frage: Hat gerade der sprechende NPC Zugang zu diesem Wissen? Ein Modell kann sich perfekt an ein Geheimnis erinnern und dadurch im Spiel falsch handeln. |
| Reicht es, die Szene mit besserem Kontext erneut zu erzählen? | **Nein.** Beide Berichte unterschätzen, wie stark frühere Prosa als konkurrierende Quelle wirken kann. Ein Bossgegner, der über mehrere Nachrichten agiert hat, ist für ein Sprachmodell erzählerisch gut etabliert, auch wenn kein Engineslot existiert. Diese Ursache lässt sich unabhängig von fehlender Lore untersuchen. |
| Ist Streaming der nächste Geschwindigkeitsgewinn? | **Für bestimmte Wartezeiten plausibel.** Frühe sichtbare Prosa kann eine nichtstreamende Pause verkürzen. Die gebuchte nächste Aktion wartet weiterhin auf Weltabschluss und Speicherung. Ob der Spieler überhaupt früher eine sinnvolle Entscheidung treffen kann, hängt auch davon ab, *wann im Absatz* die entscheidende Information steht. |
| Sind die langen P-/X-Prompts das Hauptproblem? | **Für die gesamte Runde unbelegt.** Lange, weitgehend konstante Eingaben, aufwendige Ausgaben, zusätzliche Repairs und Providerwartezeit haben unterschiedliche Kosten. Gerade der langsame Boardfall zeigt, wie wenig eine Sortierung allein nach Prompttokens über den Spielrhythmus aussagt. |
| Führt mehr NPC-Eigeninitiative zu einem besseren Spiel? | **Nur wenn sie situativ begründet ist.** Ein NPC, der eine Zusage vor Zeugen bewusst verschweigt, kann glaubwürdiger und eigenständiger wirken als einer, der bei jeder Begegnung seinen offenen Faden vorträgt. Eine Initiativequote wäre ein schlechter Optimierungsmaßstab. |

Meine wichtigste Korrektur an **A** betrifft die Priorisierung: Der längere statische Narratoranfang ist ein gutes *Cacheexperiment*. Er ist noch keine nachgewiesene Verbesserung für Spieler. Meine wichtigste Korrektur an **B** betrifft das Versuchsdesign: Eine bessere Szenenkarte allein trennt nicht zwischen fehlendem Wissen, ungünstiger Position und widersprüchlichem Verlauf. Diese drei Ursachen sollten im Vergleich getrennt bleiben.

## 3. Was die Zahlen tatsächlich über Wartezeit und Ressourcen sagen

### Drei vollständige Spielerhandlungen statt globaler Durchschnittswerte

| User05-Fall | Planner | Narrator | Extractorjob | Summe der erfassten Phasen | X-Anteil |
|---|---:|---:|---:|---:|---:|
| I31/I32 – Rast | 6,042 s | 23,907 s | 46,591 s | 76,540 s | 60,9 % |
| I33/I34 – Ortswechsel | 3,742 s | 26,596 s | 41,234 s | 71,572 s | 57,6 % |
| I44/I45 – Bossangriff | 6,282 s | 22,232 s | 38,613 s | 67,127 s | 57,5 % |

Bei diesen drei ausgewählten Fällen war der Extractorjob der größte gemessene Anteil. Das ist kein kampagnenweiter Prozentsatz. Die Zeiten enthalten beim Ortswechsel einen Repair. Der spätere bestätigte ST-Save ist in den historischen Summen nicht enthalten.

Beim Bossangriff hätte selbst ein hypothetisch sofortiger Planner bei identischem Restablauf **60,845 Sekunden** der erfassten Zeit übrig gelassen. Beim Ortswechsel kostete ein einzelner Formrepair dagegen **19,931 Sekunden**, rund 27,8 % der erfassten Phasenzeit. `.203` kann diesen konkreten Fall mit der ersten Originalantwort schließen. Ein kleiner, präziser Eingriff war hier wirksamer als jede mögliche Beschleunigung seines Planners.

Für die Bedienung ergibt sich ein anderes Bild. Die fünf manuellen F-Wiederholungen verbrauchten 33.110 Prompttokens, rund 4,3 % der gesamten User05-Eingabemenge. Der größere Schaden war, dass der Spieler eine schon eindeutig gewählte Aktion wiederholt eingeben musste. Das erklärt, warum der `.203`-Bindungsfix eine hohe Priorität hatte, obwohl er nicht den größten Tokenblock betrifft.

### Eine seltene, lange Unterbrechung kann wichtiger sein als viele kurze

Die zwei Boardrequests beanspruchten zusammen **6.361 von 772.826 Prompttokens**, also **0,82 %**, aber **111,031 Sekunden** für Erstgenerierung und Repair. Sie lieferten zusammen 1.885 Ausgabetokens. Das beweist weder einen langsamen Decoder noch eine bestimmte Providerursache. Es beweist, dass das Board für eine tokensortierte Optimierung fast unsichtbar wäre, für den wartenden Spieler aber nicht.

Mein Vorschlag für die Auswertung lautet daher:

- **Pro physischem Request** erfassen, wo Tokens und Zeit anfallen.
- **Pro abgeschlossener Spielerabsicht** erfassen, wie viele Requests, Fehlversuche und zusätzliche Eingaben nötig waren.
- **Pro Sitzung** die längsten konkreten Unterbrechungen samt Ursache zeigen. Bei wenigen Fällen ist „111 Sekunden bis zur Questtafel wegen eines verworfenen Boards“ nützlicher als ein globales Perzentil.

User04 und User05 stützen das Spielerfeedback, dass sich frühere Durchläufe teilweise schneller anfühlten. User04 meldete 825.898 Cachetokens bei 1.520.007 Prompttokens, rund 54,3 %. User05 meldete null bei 772.826. Builds, Szenen, Backendzustand und Antwortmengen unterscheiden sich. Die Ursache des Zeitunterschieds bleibt offen.

Quelle: [Historische Auszählung einschließlich Phasen, Repairs und Messgrenzen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/866b2a9/recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md)

## 4. Der Weg einer Spielerhandlung durch Avereth

| Übergang | Tatsächliche Funktion | Übersehene Frage |
|---|---|---|
| Spieler → ST-Eingabe | Freitext, typisierte HUD-Wahl oder beides. Eine eindeutige Questannahme verwendet ebenfalls den gemeinsamen Versand. | Zeit vom Klick bis zur sichtbaren Auswahl messen. Ein träge reagierendes HUD fühlt sich schon *vor* jedem Modellrequest langsam an. |
| Eingabe → Planner/Engine | Reine Auswahl kann ohne Planner ausgeführt werden. Bei gemischtem F-Text prüft der Planner Auswahl, IDs, Bedingungen und weitere Handlungen. | Nicht allein die Zahl der gesparten Planner messen. Ebenso prüfen, ob eine negierte, bedingte oder zweite Spielerhandlung verloren geht. |
| Engine → Narrator | Mechanische Ergebnisse und relevanter Weltzustand treffen auf ST-Preset, Charakterbeschreibung, aktivierte Lore und Chatverlauf. | Welche Quelle ist für einen Fakt zuständig? Was passiert, wenn eine frühere Erzählung ihm widerspricht? |
| Narrator → sichtbarer Text | Das `.203`-Preset ist laut A nichtstreamend. Der isolierte `.203`-Hostnachweis testete auch Streaming. | Zeit bis zum ersten sinnvollen Satz und bis zur ersten *spielbaren Entscheidung* unterscheiden. |
| Erzählung → Extractor | X liest den konkreten Text, den Engineauftrag, mögliche Deltas und den Weltkatalog. Auch während eines Kampfes kann eine neue Zusage entstehen. | Die richtige Messgröße ist die Erhaltung bedeutender, tatsächlich erzählter Folgen. Eine gültige JSON-Antwort kann die wichtigste Folge auslassen. |
| Weltcommit → ST-Save | `.203` koordiniert den Weltcommit mit laufenden nativen Saves, prüft den Ursprung und liest den gespeicherten Stand zurück. | Hostzeit und Modellzeit getrennt messen. Lange Chatobjekte, Swipes und zusätzliche ST-Felder können die lokalen Kosten verändern. |
| Reload/Swipe → späterer Recall | Die ausgewählte Revision und ihre gespeicherten Ereignisse bestimmen den weiteren Spielstand. | Eine künftige Zusammenfassung oder Suchablage muss die verworfene Zusage vergessen und die gewählte Zusage wiederfinden können. |

Der isolierte `.203`-Nachweis ergibt **zwei physische Modellrequests** für reine HUD-Aktionen und eindeutige Questannahmen und **drei** für die sechs gemischten F-Fälle. Bei direkter Questannahme umfassten die gesendeten Nachrichten 59.355 UTF-16-Einheiten für N und 62.427 für X. In den sechs F-Fällen waren es 26.563 für P, 57.977 für N und 60.248 für X. Gemessen wurde das serialisierte Nachrichtenarray. Daraus lassen sich weder Providertokens noch natürliche Sekunden umrechnen.

Quellen: [Laufzeitcode](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js) · [Planner](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/planner.js) · [Extraktionsvertrag](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/extract.js) · [Maschinenlesbare `.203`-Ergebnisse](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/USER05_203_TECHNICAL_RESULTS.json)

## 5. Kontext und Cache – ein konkreter Versuch mit klaren Grenzen

Bericht A hat fünf Planner-, fünf Narrator-, fünf Extractor- und zwei Boardrequests aus User05-A verglichen. Der gemeinsame Anfang der **formatierten Logblöcke** beträgt laut diesem Bericht 49.047 Zeichen bei P, 2.733 bei N, 53.727 bei X und 12.079 beim Board. Bezogen auf die jeweils mittlere Blocklänge entspricht das ungefähr 91,8 %, 4,2 %, 85,5 % und 81,8 %. **Keiner dieser Werte ist eine Cachequote.**

Der Befund beim Narrator ist technisch schlüssig. Im untersuchten Preset erscheint variable World Info vor der langen Character Description. Dadurch kann sich früh unterscheiden, ob die Klasse, die Gilde oder rechtliche Autorität in den Prompt gelangt. Eine dahinter identische Beschreibung verlängert den *gemeinsamen Anfang* nicht. Die erwähnten 37.303 Zeichen sind die Größe der untersuchten `.203`-Vertragsdatei. Die historischen Requests stammen aus `.202`. Die aktuelle Dateigröße darf daher nicht als bereits gemessener Zuwachs des historischen Cachepräfixes ausgegeben werden.

**Eine wichtige methodische Ergänzung:** Der längste gemeinsame Anfang *aller fünf* Requests beantwortet eine andere Frage als die Wiederverwendbarkeit zweier konkreter aufeinanderfolgender Requests. Ein einziger früher Unterschied verkürzt das gemeinsame Präfix der gesamten Gruppe. Umgekehrt können zwei sehr ähnliche Narratorrequests viele andere physische Requests auseinanderliegen. Beide Effekte verschwinden in einer einzigen Längenangabe.

**Kostenfreier Präfixtest:**

1. Pro Request das geordnete Nachrichtenarray und separat die äußerlich protokollierten Parameter erfassen. Eine Änderung im formatierten Logkopf muss keine Änderung des Modellinputs sein.
2. Mit dem unmittelbar vorherigen physischen Request, dem vorherigen Request derselben Phase und einem früheren inhaltlich ähnlichen Request vergleichen. Zeitabstand angeben.
3. Die erste Abweichung als Rolle, Nachricht und Inhalt bestimmen. Nur bei bekanntem Backendtemplate und passendem Tokenizer ein Tokenpräfix ausweisen.
4. Eine Variante mit demselben Vertragsinhalt vor der variablen Lore erzeugen. Prüfen, ob beim Ausschöpfen des Kontextbudgets dieselben relevanten Chatnachrichten, Enginefakten und Loreeinträge erhalten bleiben.
5. Erst ein später freigegebener Providervergleich kann zeigen, ob sich gemeldete Cachetokens, Zeit bis Textbeginn oder Gesamtlatenz tatsächlich verbessern.

Dass in User05 auch P/X trotz langer stabiler Loganfänge null Cachetokens meldeten, schließt die einfache Erklärung „World Info verhindert unseren gesamten Cache“ aus. Es bleiben unter anderem Template, Routing, Wiederverwendungsfenster und die Bedeutung des Usagefeldes im konkreten Tarif. Ein identischer Request in einer kurzen Wiederholung misst außerdem einen anderen Betriebsfall als wechselnde Spielzüge über eine lange Sitzung.

**Einordnung der externen Technik:** vLLM beschreibt die Wiederverwendung bereits verarbeiteter Präfixe. SGLang untersucht ebenfalls effiziente Ausführung strukturierter Modellprogramme. Beides macht den Versuch plausibel. Ob Featherless für diesen Account, dieses Modell und diese Sitzung eines dieser Verfahren einsetzt oder einen Treffer ausweist, ist damit nicht festgestellt. Die gemeldeten vier Kapazitätseinheiten und vier Einheiten je GLM-Request sprechen gegen zusätzliche parallele Generierung als vermeintlich kostenlose Abkürzung.

Referenzen: [Featherless Chat Completions](https://featherless.ai/docs/completions) · [Featherless Plan API](https://featherless.ai/docs/api-reference-plan) · [vLLM Automatic Prefix Caching](https://docs.vllm.ai/en/stable/features/automatic_prefix_caching.html) · [SGLang](https://arxiv.org/abs/2312.07104) · [GLM-Modellkarte](https://huggingface.co/zai-org/GLM-5.3-Flash)

## 6. Narratorqualität – drei Fehlerursachen getrennt prüfen

### Fehlende Information

Die ursprüngliche Questannahme lieferte den Namen Glimmerdeep, aber nicht zuverlässig die gespeicherte Richtung. `.203` gibt die vorhandene Wegbeschreibung bei relevanter Annahme oder Reise gezielt aus. Der Browsernachweis bestätigt ihre Ankunft im Modellrequest. Für diesen konkreten Defekt ist ein zusätzliches Retrievalsystem derzeit schlecht begründet. Der nächste Nachweis ist die richtige Verwendung durch den natürlichen Erzähler.

### Konkurrierende frühere Geschichte

Bei den Phantomkäfern würde ich einen kleinen gekreuzten Versuch vorziehen:

| Historische Phantomprosa in der Forschungskopie | Aktueller bestätigter Kampfbestand | Erkenntnis |
|---|---|---|
| vorhanden | bisherige Position | `.203`-Vergleichsbasis |
| vorhanden | gleicher Wortlaut nahe am Szenenauftrag | Wirkung der Position bei konkurrierender Geschichte |
| ausgelassen | bisherige Position | Wirkung der früheren Phantomprosa |
| ausgelassen | nahe am Szenenauftrag | mögliches Zusammenwirken beider Faktoren |

Mechanischer Zustand, Spielerhandlung, Modellparameter und sonstige Szenenfakten bleiben für die Varianten gleich. Abweichende Promptlängen werden dokumentiert. Bewertet wird, ob zusätzliche *aktive Kampfgegner* entstehen. Eine leere Hülle, alte Fraßspuren oder Geräusche hinter einer Wand können legitime Erzählung sein. Als Gegenkontrolle gehört eine Szene außerhalb des Dungeonkampfs dazu, in der eine neue Person oder Kreatur ausdrücklich entstehen darf. Eine Lösung, die beide Arten von Erfindung unterdrückt, wäre für Avereth schlechter.

Das Auslassen früherer Prosa betrifft ausschließlich experimentelle Promptkopien. Spielstände und bestätigte Ereignisse werden dadurch nicht berichtigt oder rückwirkend umgeschrieben.

### Der Narrator erzählt über den nächsten Entscheidungspunkt hinaus

Dies ist eine zusätzliche Hypothese. Ein langes Antwortlimit und ein langer Absatz sind verschiedene Dinge. Ein Limit kann eine gute Antwort mitten im Satz abschneiden. Ein passender erzählerischer Endpunkt lässt hingegen Atmosphäre zu und gibt Alaric die Entscheidung dort zurück, wo sich für ihn eine echte Alternative öffnet.

Beispiel: Wat lässt seinen Blick über die anderen Gäste wandern und legt einen versiegelten Brief auf den Tisch. Hier kann der Spieler den Brief öffnen, Wat befragen, warten oder die Szene verlassen. Wenn der Narrator schon erzählt, dass Alaric das Siegel bricht und den Auftrag annimmt, entstehen zugleich Agencyfehler, mehr Ausgabetext und zusätzlicher Extraktionsaufwand.

Ich würde einen knappen situativen Hinweis auf solche Entscheidungsgrenzen gegen den bisherigen Stil testen. Eine ruhige Reise und ein längeres freiwilliges Gespräch gehören als Gegenfälle dazu. Wenn jede Antwort mit einem standardisierten „Was tust du?“ endet oder NPCs kaum noch handeln, fällt die Variante durch. Mögliche Vorteile für Ausgabetokens und X-Dauer sind ungemessen.

Quellen: [Enginekontext `.203`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/context.js) · [Tatsächlich verwendeter Narratorvertrag](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt) · [Lost in the Middle, TACL](https://aclanthology.org/2024.tacl-1.9/)

## 7. NPC-Gedächtnis und eine Welt mit eigener Initiative

Ein guter Wat-Test hat zwei mögliche Weltzustände, die sich in genau einem für Wat bedeutsamen Fakt unterscheiden:

- Wat hat selbst versprochen, Alaric am alten Übergang zu treffen. Im Gegenfall hat ein Dritter nur behauptet, Wat werde dort sein.
- Die Zusage ist offen. Im Gegenfall wurde sie gestern erfüllt.
- Wat und Alaric sind allein. Im Gegenfall hört jemand mit, vor dem Wat die Angelegenheit geheim halten möchte.
- Alaric hat seine Absicht laut ausgesprochen. Im Gegenfall war sie lediglich sein innerer Gedanke.
- Die Zusage stammt aus der aktiven Antwortrevision. Im Gegenfall existierte sie ausschließlich in einem verworfenen Swipe.

Die entscheidende Qualitätsfrage lautet: **Ändert Wat sein Verhalten aus dem richtigen Grund?** Er kann diskret einen anderen Treffpunkt vorschlagen, Alaric öffentlich abweisen oder das Thema mit einer unauffälligen Geste vertagen. Eine natürlich handelnde Figur muss den Weltfakt nicht aufsagen. Zugleich darf eine Erinnerung aus einer verworfenen Revision beim nächsten Treffen nicht in anderer Form zurückkehren.

Vier Nachweise sollten getrennt geführt werden:

1. Die Engine hat Person, Wissensquelle und Status richtig gespeichert.
2. Der tatsächlich gesendete Prompt gibt der relevanten Figur die passende Information.
3. Ihr Verhalten im Text ist angesichts ihrer Interessen, Zuhörer und Kenntnisse plausibel.
4. Eine neu entstandene bedeutsame Folge bleibt beim nächsten Treffen erhalten, auch wenn der Originaldialog aus dem aktiven Chatfenster fehlt.

**Eine lebendige Welt erfordert keine allgemeine Agenda-Simulation.** Als kleinerer Versuch könnte ein bereits bestehender Faden bei passender Person, Zeit und Situation als mögliche Gelegenheit in den Kontext gelangen. Der Narrator entscheidet, ob und wie Wat handelt. Eine ruhige Rast, eine erledigte Absprache oder ein unpassender Zeitpunkt müssen ebenso zuverlässig *ohne* neue Nebenhandlung funktionieren. Erst wenn solche vorhandenen Gelegenheiten trotz guter Projektion regelmäßig verloren gehen, ist eine breitere Offscreen-Simulation fachlich begründet.

Die Forschung liefert hierfür unterschiedliche Prüfmethoden. *Generative Agents* motiviert die Auswahl nach Relevanz, Aktualität und Bedeutung. *LongMemEval* liefert Gegenfälle für Wissensupdates, Zeitbezug und begründetes Nichtwissen. *SOTOPIA* macht soziale Ziele verschiedener Rollen zum Gegenstand der Bewertung. *TextWorld* demonstriert den Wert kontrolliert veränderter, ausführbarer Weltzustände. Entwicklerpraktiken aus *ink* und Emily Shorts Storylets zeigen, wie frühere Entscheidungen spätere erzählerische Gelegenheiten öffnen können. Keine dieser Arbeiten misst den Spielspaß einer Avereth-Kampagne mit GLM. Ihre Stärke liegt hier in der Gestaltung besserer Gegenproben.

Referenzen: [Generative Agents](https://arxiv.org/abs/2304.03442) · [LongMemEval](https://arxiv.org/abs/2410.10813) · [SOTOPIA](https://arxiv.org/abs/2310.11667) · [TextWorld](https://arxiv.org/abs/1806.11532) · [LIGHT – situierte Fantasydialoge und Handlungen](https://arxiv.org/abs/1903.03094) · [inkle, Writing with ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) · [Emily Short über Storylets](https://emshort.blog/2019/11/29/storylets-you-want-them/)

## 8. Zwei übersehene Leistungsfragen außerhalb des Modellprompts

### Was kostet eine HUD-Auswahl in einer langen Kampagne?

Im `.203`-Host erhält der Composer seinen Zustand über `foldChat(ctx().chat).state`. Bei einer Auswahl können die Zustandsprojektion, die Validierung, die Bandvorschau und die Beschriftung mehrerer betroffener Ziele erneut Zustand anfordern. Der Refresh durchsucht die vorhandenen Kampfpanels, damit nur die aktuelle Oberfläche aktiv bleibt.

Das ist eine **am Code begründete, ungemessene Hypothese**. Sie rechtfertigt keinen vorsorglichen Umbau. Ein isolierter Browservergleich kann sie günstig widerlegen: kurze gegen lange Chatpräfixe und ein Einzelziel gegen ein Band mit mehreren Zielen. Messen, wie oft der Chat pro Klick gefaltet wird und wann die Auswahl tatsächlich sichtbar ist. Nur wenn der Unterschied für die Bedienung relevant ist, einen bereits ermittelten Zustand innerhalb *desselben synchronen Auswahlvorgangs* wiederverwenden. Ein dauerhafter paralleler Zustandsbestand wäre dafür unnötig.

Quellen: [Hostbindung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/index.js) · [Composer](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/action_composer.js) · [Auswahl und Bandvorschau](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/action_input.js)

### Wie wächst die Zeit für sichere Saves?

Der `.203`-Speicherpfad friert vollständige Chatobjekte ein, vergleicht Nachrichten und Metadaten, liest die vorherige Revision, schreibt den Snapshot und liest ihn zur Bestätigung wieder zurück. Das ist eine sinnvolle Reaktion auf reale Fehler, bei denen ein veralteter nativer ST-Save sonst neuere Nachrichtenfelder überschreiben könnte.

Mit wachsendem Chat und vielen Swipes können Kopieren, kanonische Vergleiche und übertragenes Volumen zunehmen. Die User05-Daten belegen dafür keine dominante Laufzeit. Die `.203`-Mockmessungen von 175 bis 240 ms für Save/Read-back in sechs F-Fällen sind ein lokaler Referenzpunkt, keine Hochrechnung auf eine lange persönliche Kampagne.

Mein Versuch wäre eine isolierte Messung mit unterschiedlichen historischen Chatlängen, jeweils einschließlich und ohne größere Swipe-Historie. Erfasst werden Anzahl tatsächlicher Saves pro Spielerhandlung, Payloadgröße, Zeit im Browser, vorheriges GET, POST, bestätigendes GET und die Bedienbarkeit des Textfelds. Wenn wiederholte Berechnung einer **unveränderlichen eingefrorenen** Signatur ins Gewicht fällt, ist deren einmalige Berechnung ein enger Kandidat. Der aktive Chat muss nach asynchronen Grenzen erneut überprüft werden. Falsches Read-back, neu hinzugekommene ST-Felder und Chatwechsel bleiben harte Gegenfälle.

Quelle: [Vollständiger Persistenzpfad `.203`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/action_persistence.js)

## 9. SillyTavern, Provider und Streaming

**Kontextlimit.** Der in Bericht A genannte Presetwert `openai_max_context: 131072` und das dokumentierte Tariflimit von 32K beschreiben verschiedene Grenzen. Das wirksame Budget hängt außerdem von Nachrichtenformat, Ausgabelimit und Backend ab. In User05 wurde für die 64 dokumentierten Requests `finish_reason: stop` berichtet. Eine tatsächlich eingetretene Trunkierung lässt sich für diesen Run deshalb nicht als Erklärung einsetzen. Für längere Kampagnen bleibt die Abweichung prüfenswert. Ein Test sollte ermitteln, *welche konkrete Nachricht oder NPC-Information zuerst herausfällt*, statt lediglich eine maximale Tokenzahl anzuzeigen.

**World Info.** Schlüssel, Positionen, Rekursion, Prioritäten und Budgets können Weltwissen günstig bereitstellen. Für eine bindende Questdestination hat die Engine bereits eine bessere Quelle als zufällige Schlüsselaktivierung. Für Kultur, gewöhnliche Lebenswelt und flexible Ortsfarbe kann World Info dagegen besser passen als eine ständige Liste im Engineblock. Testfälle brauchen einen echten Treffer, einen namensgleichen irrelevanten Treffer und eine Erwähnung eines abwesenden Ortes. Eine aktivierte Lorezeile darf keine tatsächliche Anwesenheit suggerieren.

**Modellparameter.** User05 nutzte für N unter anderem Temperatur 0,9, Top P 0,95 und 4.096 Ausgabetokens. P/X verwendeten 0,1 und Limits von 2.000/4.000. Der `.203`-Browsersmoke verwendete für N ein Testlimit von 1.200 mit Streaming. Temperatur, Reasoning, Ausgabelimit, Promptreihenfolge und Streaming gleichzeitig zu ändern würde einen brauchbaren Vergleich verhindern. Zuerst das Spielproblem auswählen. Bei unnötig langer Prosa ist der Versuch zum Entscheidungspunkt aussagekräftiger als ein willkürlich halbiertes Ausgabelimit. Bei häufigem `length` wäre dagegen die Beziehung von tatsächlicher Ausgabe, Reasoning und Limit konkret zu untersuchen.

**Streaming.** Die vorhandene Requeststeuerung klont die Response und verfolgt den Streamabschluss. Ein empfangener HTTP-Header, das erste SSE-Paket, der erste sichtbare Prosasatz und die bestätigte Freigabe der Providerkapazität sind verschiedene Zeitpunkte. Ein Paket kann Rollen- oder sonstige Metadaten statt Spielertext enthalten. Eine lokale Abbruchmeldung beweist weiterhin kein freies Remote-Kontingent.

Für einen aussagekräftigen Vergleich reichen sechs Spielermarken: Senden, erster sichtbarer Prosasatz, Auftreten der entscheidungsrelevanten Information, Textende, bestätigter Weltabschluss und tatsächlich wieder mögliche Sendung. Netzwerk- und Lease-Marken helfen bei der Diagnose. Aus der Zeit bis zum ersten Paket allein lassen sich Backendqueue, Prefill und Transportanteil nicht einzeln ableiten.

Referenzen: [ST 1.19.0](https://github.com/SillyTavern/SillyTavern/tree/1.19.0) · [ST Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/) · [ST World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) · [ST Data Bank](https://docs.sillytavern.app/usage/core-concepts/data-bank/) · [Avereth Requeststeuerung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/request_control.js) · [Fetch-Standard zur Response-Kopie](https://fetch.spec.whatwg.org/#dom-response-clone)

## 10. Alternativen für Planner, Extractor und langfristige Architektur

| Variante | Erwarteter Nutzen | Risiko und Aufwand | Urteil |
|---|---|---|---|
| Vorhandene typisierte Eingaben weiterverwenden | Eindeutige Handlungen brauchen keine erneute Sprachinterpretation. | Gering für bestehende Aktionen. Bei zusätzlichem Freitext können Bedingungen verloren gehen, wenn eine Eingabe zu früh als eindeutig gilt. | Bewährte Ausgangsbasis. Keine zusätzlichen Buttons allein zum Sparen eines Requests. |
| P-/X-Prompts nach Situation zusammensetzen | Unnötige Regeln und Kataloge können entfallen. | Mittel. Ein „Kampfzug“ kann zugleich ein Gespräch, eine Übergabe oder eine bedingte Folge enthalten. Ein zweiter Klassifikator kann den erhofften Gewinn aufzehren. | Erst bestehende Originalfälle auf ausgelassene unabhängige Folgen prüfen. |
| Stabile Ausgabestruktur plus kompakte aktuelle Kandidaten | Ein gleichbleibender Vertrag kann einfacher zu lernen und potenziell besser wiederverwendbar sein. Kandidaten bleiben zustandsbezogen. | Mittel. Ein dynamisches Schema mit allen aktuellen IDs als Enums kann pro Zug wechseln und neue Personen oder Orte unbeabsichtigt ausschließen. | Vor stark wechselnden Unterschemata testen. Die Engine behält die letzte Validierung. |
| Grammatik- oder schemabeschränkte Ausgabe | Kann bestimmte Syntax- und Formfehler vermeiden. | Mittel bis hoch je nach tatsächlichem ST-/Featherless-Pfad. Gültiges JSON kann eine Zusage auslassen, eine Ankunft falsch bejahen oder am Ausgabelimit unvollständig enden. | Nur auf identifizierte Formfehler anwenden. Welche Parameter ST weiterleitet und was der Provider tatsächlich ausführt, getrennt belegen. |
| Semantischer Langzeitabruf | Könnte alte, indirekt erwähnte Episoden finden, die aktuelle Identitäts- oder Ortsanker verfehlen. | Mittel bis hoch. Falscher NPC, verworfener Swipe, erledigte Zusage und semantisch ähnliches Geheimnis sind konkrete Fehlermodi. | Erst einen bestehenden Recall-Ausfall nachweisen. Treffer nach Identität, Revision und Wissenszugang begrenzen. |
| Kleineres Spezialmodell für P oder X | Geringere Latenz pro Versuch ist möglich. | Anbieterabhängig. Fehlinterpretationen und zusätzliche Repairs können den Vorteil aufheben. | Gegen dieselben negierten, bedingten und gemischten Originaleingaben messen. |
| Gemeinsame Narration und strukturierte Weltfolgen | Ein zweiter vollständiger Interpretationsdurchgang könnte bei geeigneten Zügen entfallen. | Hoch. Eine flüssig erzählte und strukturell gültige Antwort kann ihre wichtigste neue Tatsache verschweigen. Die früheren Alpha-Tests zeigen außerdem Funktionsverlustrisiken. | Als ernsthafte längerfristige Alternative beibehalten. Zuerst an einer eng begrenzten Szenenklasse einschließlich Folgeturn vergleichen. |
| Eigene laufende NPC- oder Weltsimulation | Könnte tatsächlich unabhängige Offscreen-Entwicklungen erzeugen. | Hoch. Hinzu kommen Ereignisdichte, gleiche Wissensgrenzen, Kosten und die Gefahr, den Spieler ständig zu überholen. | Erst dann plausibel, wenn Tests zeigen, dass die Welt trotz gut gelieferter Interessen und offener Fäden regelmäßig passiv bleibt. |

Eine wichtige methodische Grenze gilt für jede Extractoroptimierung: **Die bereits gebuchten Deltas sind kein vollständiger Goldstandard.** Wenn der alte Extractor eine echte Zusage ausgelassen hat, würde ein Vergleich ausschließlich gegen die alten Deltas denselben Fehler belohnen. Für wenige zentrale Tests lohnt daher eine unabhängige Annotation der Originalprosa: Was wurde tatsächlich zugesagt, von wem, gegenüber wem und mit welcher Verbindlichkeit? Was war nur ein Gerücht, eine Absicht oder eine Atmosphäre?

Referenzen: [Frühere Architekturentscheidung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/e0557a0/recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) · [B/C1-Prototyp](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/80d5fcb/recherche/ARCHITEKTUR_PROTOTYP_B_C1_VERGLEICH_2026-11-16.md) · [Gegenbefunde aus Alpha 2](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/815461e/experiments/dynamic-gm/NEUBEWERTUNG_KURSKORREKTUR_NACH_ALPHA2_2026-11-16.md) · [XGrammar](https://github.com/mlc-ai/xgrammar) · [JSONSchemaBench](https://github.com/guidance-ai/jsonschemabench) · [vLLM Structured Outputs](https://docs.vllm.ai/en/stable/features/structured_outputs.html)

## 11. Priorisierte Versuchsrunde

| Priorität | Versuch | Vergleich und Entscheidungskriterium |
|---|---|---|
| **1A – offline** | **Prefix- und Herkunftsanalyse für User05 A–C** | Phase A nachvollziehen und um NPC-, Dungeon-, Kampf- und längere Chatfälle ergänzen. Tatsächliche Nachrichtenreihenfolge, erste Abweichung, Zeitabstand und verdrängte Inhalte festhalten. Ein längeres Präfix allein rechtfertigt keinen Produktwechsel. |
| **1B – offline vorbereiten** | **Ein kleiner Korpus mit kausalen Gegenfällen** | Wat mit offenem/erfülltem Versprechen und privatem Wissen, I14 mit kanonischer Route, I38–I45 mit konkurrierender Prosa, echte freie Kreaturerfindung außerhalb des Dungeons, stiller Reisezug und gemischter Kampfseitenruf. Für jeden Fall erwartete Fakten, erlaubte kreative Entwicklungen und verbotene mechanische Folgen festlegen. |
| **2 – isolierter ST-Host** | **Lokale Wartezeit und Langzeitkampagne** | Kurze und lange Chats, Einzelziel und AoE sowie normale und umfangreiche Swipe-Historie vergleichen. Erst bei relevantem lokalem Anteil Fold, Render oder Snapshotberechnung gezielt optimieren. Ursprungsbindung und vollständiges Read-back bleiben Abnahmekriterien. |
| **3 – später, separat freigegeben** | **Kleiner natürlicher Spielqualitätsvergleich** | Zuerst dieselbe Information an anderer Position oder einen einzelnen besser ausgewählten Szenenfakt vergleichen. Varianten blind und in wechselnder Reihenfolge bewerten. Stimme, Eigeninitiative, Spielerwahl, Tatsachentreue und spätere Erinnerung getrennt beurteilen. Gleichstand zulassen. |
| **4 – abhängig vom Ergebnis** | **Streaming, Extractorumfang oder Boardgenerator** | Wenn vor allem der leere Bildschirm stört, Streaming und den ersten sinnvollen Satz prüfen. Wenn die fertige Szene lange auf den nächsten Zug wartet, X und Read-back untersuchen. Wenn seltene Boardrepairs Sitzungen unterbrechen, diesen Generator separat beurteilen. |
| **5 – nur bei verbleibendem Nachteil** | **Größere Modell- oder Architekturvariante** | Gleicher Enginezustand und dieselben Spielerabsichten. Eine Variante muss beim Wiedersehen nach Kontextentzug ebenso funktionieren wie im ersten hübschen Absatz. Aufwand und Fehlerkosten aller physischen Folge- und Repairrequests mitzählen. |

Für alle Qualitätsvergleiche gilt: Mehrere Swipes derselben Szene sind keine unabhängigen Kampagnen. Kleine Fallzahlen mit konkreten Fehltexten und Präferenzurteilen berichten. Ein unbeabsichtigter zweiter mechanischer Erfolg, eine Buchung in den falschen Chat oder ein nach Reload zurückgekehrtes verworfenes Versprechen ist ein Integritätsfehler. Ob Wat schweigt, witzelt oder einen ernsteren Ton wählt, bleibt dagegen eine begründbare Spielerpräferenz.

## 12. Entscheidung

**Der erste Entwicklungsschritt sollte ein vorhandenes Weltgeschehen besser spielbar machen, nicht mehr Weltgeschehen erzeugen.** Dafür würde ich den NPC-/Szenenvergleich und die kostengünstige Präfixanalyse jetzt als zwei getrennte Forschungsaufgaben auswählen. Für die Szene ist der schärfste Test, ob Wat in zwei fast identischen Situationen aus nachvollziehbar unterschiedlichen Gründen anders handelt. Für die Infrastruktur ist der schärfste Test, ob derselbe Inhalt in anderer Reihenfolge auf dem tatsächlichen Backend einen Vorteil bringt und dieselben spielwichtigen Fakten erhält.

Die nächste Architekturentscheidung hängt dann an einer konkreten Beobachtung. Bleibt die Welt bei korrekter Informationsauswahl passiv, lohnt der Versuch mit zustandsgebundenen erzählerischen Gelegenheiten. Bleibt vor allem die Zeit nach der fertigen Prosa unvertretbar, rücken Extractor und Speicherung nach vorn. Bleibt die Prosa trotz korrekter Fakten widersprüchlich, sollte der Konkurrenz zwischen Chatgeschichte und Weltzustand nachgegangen werden. Diese Unterscheidung schützt Avereth sowohl vor einem vorschnellen Neubau als auch vor einer endlosen Reihe kleiner Promptzusätze.