# Avereth `.203` – LLM-Kontext, RPG-Qualität und Performance

**Stand:** 19.11.2026  
**Produktbasis:** `4.3.0-c.6.6.203`, Commit `5e5b8272412b51b91f75b6e37c5b94d95c9fae11`  
**Host:** SillyTavern 1.19.0  
**Status:** Forschungsentwurf zur Diskussion. Der Bericht ist noch nicht auf `main` committed. Die Avereth-Befunde stützen sich auf die vorliegenden Produktdiffs, persönlichen Spieltests und Abnahmeprotokolle. Der ausgefallene Cloud-Executor verhinderte eine erneute Einsicht in den Checkout, die geplante Präfixmessung und den aktuellen Onlineabgleich der externen Quellen. Die verlinkten Arbeiten und Dokumentationen sind entsprechend eingeordnet. User06 ist laufend und fließt nicht als abgeschlossener Test in die Bewertung ein.

## 1. Urteil

**Ich würde `.203` als Grundlage behalten und zuerst die Auswahl, Herkunft und Platzierung der Informationen verbessern, die der Narrator in einer konkreten Szene erhält.** Der erste Versuch sollte an Spielqualität gemessen werden: Erkennt Wat eine offene Zusage nach längerer Abwesenheit wieder? Nutzt er sie auf eine Weise, die zu seiner Persönlichkeit und zur aktuellen Lage passt? Kann er sich auch dafür entscheiden, sie vor einem Dritten gerade *nicht* anzusprechen?

User05 liefert zwei Gründe für diese Priorität. Bei der Glimmerdeep-Quest fehlte dem Narrator eine bereits bekannte Wegbeschreibung. Er erfand eine plausible, aber falsche Richtung. Im Bosskampf dagegen erfand er zusätzliche Käfer, obwohl Korrekturhinweise in späteren Requests tatsächlich ankamen. Das erste Problem lässt sich durch bessere Bereitstellung lösen. Das zweite verlangt einen Versuch zur erzählerischen Wirkung der Information und zu ihrem Verhältnis zur bisherigen Chatgeschichte.

**Der zweite Schwerpunkt ist die Wartezeit bis zur nächsten spielbaren Entscheidung.** In User05 Phase C dauerte der Extractorjob im Median länger als Narrator oder Planner. Der neue HUD-Pfad spart bei eindeutigen Aktionen bereits eine ganze Phase. Welche weitere Änderung der Spieler tatsächlich spüren würde, hängt davon ab, ob er gerade auf den ersten Text, auf das Ende einer langen Antwort oder auf den bestätigten Weltabschluss wartet.

Einen erneuten grundlegenden Architekturwechsel würde ich erst erwägen, wenn ein begrenzter Vergleich zeigt, dass eine Alternative diese beiden Ziele gemeinsam besser erfüllt. Die früheren GM-Experimente belegen, dass gemeinsame Narration und Memory technisch möglich sind. Der persönliche Alpha-Test belegt zugleich, wie leicht funktionierende Fachpfade bei einer solchen Umstellung verloren gehen.

Quellen: [User05-Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/866b2a9/recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) · [Technische Abnahme `.203`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md) · [Neubewertung nach GM Alpha 2](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/815461e/experiments/dynamic-gm/NEUBEWERTUNG_KURSKORREKTUR_NACH_ALPHA2_2026-11-16.md)

## 2. Welche Informationen bei welchem Modell ankommen

| Bestandteil | Aufgabe im untersuchten System | Konsequenz für die Forschung |
|---|---|---|
| Character Description | Enthält den dauerhaften Narratorvertrag, darunter Spielerhoheit, Erzählstil und Ausgabevorgaben. Im ST-Smoke wird der Vertrag als tatsächliche Kartenbeschreibung installiert. | Eine Änderung der Textdatei wirkt in einer bestehenden Installation erst mit der aktualisierten Karte. Der Wire-Request ist der Nachweis. |
| Chat-Completion-Preset | Trägt zum Aufbau des normalen Narratorprompts und zu seinen Generierungsparametern bei. | Bei Vergleichen effektive Einstellungen protokollieren. Presetdatei, Hosteinstellung und tatsächlich gesendeter Parameter können auseinanderfallen. |
| Lorebook / World Info | Die ST-Testkarte verknüpft das Avereth-Lorebook. Es kann Hintergrundwissen in den Narratorprompt einbringen. | Verknüpfung, tatsächliche Aktivierung und passende Verfügbarkeit eines Eintrags sind drei verschiedene Befunde. |
| Dynamischer Enginekontext | Liefert unter anderem gebuchte Spieleraktionen, Zustand, relevante Quests, Begegnungen und NPC-Informationen. `.203` ergänzt die bekannte Zielroute und den vorhandenen Dungeon-Kampfbestand. | Für Entscheidungen mit einer aktuellen Zustandswahrheit ist dies die präziseste Quelle. Ihre Position gegenüber älterer Prosa ist ebenfalls relevant. |
| Planner | Übersetzt freie oder gemischte Spielereingaben anhand eigener Nachrichten in prüfbare Befehle. Für Kampf und Geschichte existieren unterschiedliche Kontexte. | Eine Änderung im normalen ST-Prompt-Manager optimiert diesen Pfad nicht automatisch. Zustandsgebundene IDs und Bedingungen müssen erhalten bleiben. |
| Extractor | Liest die konkrete Erzählung zusammen mit Engineaktionen, erwarteten Ergebnissen und Weltkatalog. Seine Vorschläge durchlaufen die Weltvalidierung. | Sein Wert liegt besonders in Folgen, die vor der Narration niemand kennen konnte, etwa einer spontanen Zusage oder einem neu etablierten Ort. |

Die Quellen können sich gegenseitig widersprechen. Bei der Questtafel forderte der alte allgemeine Narratorvertrag eine ausgeführte Auswahlliste, während der situative Enginehinweis auf die bereits gerenderten Karten verwies. `.203` beseitigt diesen konkreten Konflikt. Der isolierte Browserlauf belegt, dass die neue Ausnahme den Narrator genau einmal erreichte. Ob ein natürliches Modell daraufhin die fünf Angebote seltener wiederholt, ist noch offen.

Daraus folgt ein praktischer Prüfmaßstab: Für jede relevante Aussage sollte sich am gesendeten Request beantworten lassen, **woher sie stammt, warum sie in dieser Szene vorhanden ist und ob eine andere Passage ihr widerspricht**. Das ist für die Spielqualität aussagekräftiger als die Anzahl der Regeln in der Quelldatei.

Quellen: [Narratorvertrag](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt) · [Enginekontext](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/context.js) · [Runtime und Extraktionspfad](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js) · [Tatsächlicher ST-Testaufbau](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/tools/st_live/run_c.mjs)

## 3. Was die bisherigen Messungen tragen

| Beobachtung | Belegt | Grenze |
|---|---|---|
| User05 auf `.202` | 64 natürliche Requests: 23 Planner, 19 Narrator, 20 Extractor und 2 Board. Insgesamt 772.826 Prompt- und 17.785 Ausgabetokens. | Die Stichprobe ist eine Kampagne mit wiederholten Fehlversuchen und unterschiedlichen Szenen. |
| User05 Phase C | Median 6,847 s Planner, 23,907 s Narrator und 38,613 s je Extractorjob. Beim konkreten Bossangriff I44/I45 ergeben die erfassten Phasen 67,127 s. | Der letzte bestätigte Hostsave fehlt in dieser historischen Zeitmessung. Die drei Mediane dürfen nicht zu einem angeblich gemessenen Medianzug addiert werden. |
| F-HUD-Fehler | Fünf manuelle Wiederholungen verbrauchten zusammen 33.110 Prompttokens und 43,207 s Plannerzeit, ohne die gewählte Aktion zu buchen. | Ein Durchschnitt „pro Request“ verdeckt dieses Spielerproblem. Der sinnvolle Nenner ist hier die erfolgreich ausgeführte Absicht. |
| User04 auf `.159` | 124 Requestpaare mit 1.520.007 Prompttokens und 825.898 gemeldeten Cachetokens. In User05 waren alle gemeldeten Cachewerte null. | Unterschiedliche Chats, Zeitpunkte, Ausgaben und unbekannte Backendbedingungen. Der Unterschied identifiziert keine Ursache. |
| `.203` mit isoliertem ST | Reine HUD-Aktion und eindeutige Questannahme jeweils Narrator + Extractor. Die sechs ursprünglichen F-Fälle jeweils Planner + Narrator + Extractor, ohne Bindungsrepair. | Das sind gemessene physische Pfade mit geskripteten Antworten. Ein Gewinn an natürlicher Erzählqualität oder Providerlatenz ist damit nicht gemessen. |
| Ortswechsel I34 | Die erste historische Extractorantwort schließt den Weltpfad unter `.203` lokal in einem Request ab. Im ursprünglichen Lauf war eine zweite Antwort erforderlich. | Dies trägt die enge Wiederverwendung einer bereits vollständig vorhandenen Ortsreferenz. Es begründet keine allgemeine Freigabe unvollständiger Ankünfte. |

Beim `.203`-Smoke umfasste die direkte Questannahme 59.355 Einheiten Narrator- und 62.427 Einheiten Extractor-Nachrichten. Die sechs F-Fälle hatten jeweils 26.563 beim Planner, 57.977 beim Narrator und 60.248 beim Extractor. Gemessen wurde `JSON.stringify(messages).length`, also **UTF-16-Einheiten**. Das sind weder Providertokens noch das vollständige gerenderte Modelltemplate.

Auch die Ausgabebedingungen unterscheiden sich. User05 verwendete für den Narrator nichtstreamende Generierung mit einem Antwortlimit von 4.096. Im `.203`-Smoke lief der Narrator streamend mit Testlimit 1.200. Ein direkter Geschwindigkeitsvergleich dieser Läufe wäre irreführend.

Quellen: [Historische Auszählung und Originalfälle](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/866b2a9/recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) · [Maschinenlesbare `.203`-Messungen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/USER05_203_TECHNICAL_RESULTS.json)

## 4. Priorität 1 – Relevanten Weltzustand erzählerisch nutzbar machen

**Hypothese:** Eine kleine, für die Szene ausgewählte Gruppe vorhandener Fakten verbessert Erzählkontinuität stärker als zusätzliche allgemeine Verbote. Den größten Nutzen erwarte ich dort, wo der Erzähler die kreative Ausgestaltung frei wählen darf, aber wenige Tatsachen kennen muss.

Für Wats Wiederbegegnung könnte der relevante Kontext beispielsweise seine etablierte Stimme, die letzte bedeutsame gemeinsame Begegnung, den aktuellen Status einer Zusage und die anwesenden Personen enthalten. Die Engine liefert, was Wat wissen kann. Ob er darauf beharrt, das Thema meidet oder Alaric diskret zur Seite nimmt, bleibt seine erzählerische Entscheidung. Das Modell sollte keine Pflicht erhalten, jeden abgerufenen Fakt im nächsten Absatz unterzubringen. Sonst wird zuverlässiges Gedächtnis zum wiederkehrenden Expositionsmonolog.

Drei Eingriffe verdienen einen getrennten Vergleich:

1. **Auswahl verbessern.** Einen irrelevanten bestehenden Abschnitt gegen einen passenden Fakt tauschen. Gesamtbudget und übriger Prompt bleiben möglichst gleich. Das prüft den Wert des Inhalts.
2. **Position prüfen.** Dieselben Informationen unverändert näher am aktuellen Szenenauftrag platzieren. Das prüft, ob eine vorhandene Information zwischen längeren Vertrags-, Lore- und Chatpassagen untergeht.
3. **Herkunft klären.** Bei widersprüchlicher früherer Prosa knapp kennzeichnen, welche Tatsache inzwischen durch die Engine bestätigt wurde. Im Bossfall etwa die tatsächlich anwesenden Kampfteilnehmer benennen. Dem Narrator bleibt überlassen, wie das Gefecht klingt, wie die Queen reagiert und welche Spuren die Umgebung zeigt.

Ein übersehener Risikofaktor ist **die eigene frühere Erzählung als fortlaufender Gegenbeleg**. Wenn erfundene Käfer in mehreren Chatantworten handeln, muss das Modell zwischen einer lebendigen, wiederholten Geschichte und einer kurzen Korrektur entscheiden. Ob das den User05-Fehler erklärt, ist unbewiesen. Es ist aber unmittelbar prüfbar: Dieselbe Fortsetzung einmal mit dem unveränderten Verlauf und einmal mit einer klar zugeordneten letzten Weltbestätigung erzeugen. Dabei weder ältere Chatnachrichten löschen noch ungefragt den Spielstand umschreiben.

**Abnahme:** Eine Verbesserung liegt erst vor, wenn der Folgeturn die richtige Welt fortführt und dabei als Rollenspiel überzeugt. Prüfen, ob der NPC eine erkennbare eigene Absicht hat, sein Gegenüber sinnvoll beantwortet, fremdes Wissen für sich behält und Alaric eine echte Wahl lässt. Zusätzlich einen ruhigen Gegenfall einbeziehen, in dem der passende NPC seine Zusage vernünftigerweise *nicht* anspricht.

## 5. Priorität 2 – Wartezeit dort messen, wo der Spieler sie erlebt

Für einen Spielerzug sollten vier Zeitpunkte zusammengeführt werden:

1. Spieler sendet seine Absicht.
2. Der erste sinnvolle Erzähltext ist sichtbar.
3. Der letzte Erzähltext ist sichtbar.
4. Der Weltzustand ist bestätigt gespeichert und die nächste Eingabe kann gesendet werden.

Die Differenz zwischen 1 und 2 beschreibt die gefühlte Reaktionszeit. Die Differenz zwischen 3 und 4 erfasst das Warten auf den nächsten Zug, obwohl der Spieler bereits weiß, was er tun möchte. Ein schnellerer Planner verbessert häufig die erste Strecke. Ein zuverlässigerer oder schnellerer Extractor kann vor allem die letzte verbessern. Ein lokal beschleunigtes Read-back löst wiederum keine langsame Textgenerierung.

Zu jedem Zug gehören der tatsächliche Modus, die physischen Requests einschließlich Repairs, manuelle Wiederholungen, Ausgabemenge und der Grund einer eventuellen Sperre. Für den technischen Vergleich pro Eingabepfad auswerten. Für die Spielbewertung zusätzlich pro **abgeschlossener Spielerabsicht** auswerten. Ein Spieler, der denselben Angriff sechsmal eingeben muss, erlebt einen einzigen schlechten Angriffsvorgang.

`.203` verfügt bereits über Request- und Worldjobdaten sowie eine interne Aufteilung in Extraktion/Validierung/Wartezeit und Save/Read-back. Für User05 lassen sich fehlende Zeitpunkte im Nachhinein nicht zuverlässig rekonstruieren. Zuerst vorhandene Daten offline nutzen. Eine ergänzende Erfassung gehört in eine spätere, separat abgestimmte Untersuchung.

**Bewertung:** Geringer Aufwand für die Offlineauswertung, mittlerer Aufwand für vollständige Hostzeitpunkte. Hoher Erkenntnisgewinn. Bei kleinen Fallzahlen konkrete Szenen, Spannweiten und Fehler zeigen. Ein scheinpräzises globales 95. Perzentil über Gespräch, Boardgenerierung und Bosskampf wäre für die Entscheidung wenig hilfreich.

## 6. Priorität 3 – Cachefähigkeit prüfen, bevor der Prompt umgebaut wird

**Nachgewiesen** sind unterschiedlich gemeldete Cachewerte in User04 und User05. **Offen** ist, ob das aktuelle Featherless-Backend für diese Verbindung wiederverwendbare Präfixe hält, wie lange sie verfügbar bleiben und wie Requests auf Replikate verteilt werden. Eine Modellkarte oder die Aussage „OpenAI-kompatibel“ beantwortet das nicht.

Die erste Prüfung ist ohne Provideraufruf möglich:

- Die historischen Nachrichtenarrays in tatsächlicher zeitlicher Reihenfolge vergleichen. Einmal den unmittelbar vorhergehenden physischen Request verwenden, einmal den letzten Request derselben Phase.
- Den ersten Unterschied nach Rolle, Nachrichtenposition und Inhalt bestimmen. Ein wiederholter statischer Abschnitt *hinter* einem frühen dynamischen Unterschied ist für gewöhnliches exaktes Präfix-Caching nicht gleichwertig mit einem stabilen Anfang.
- Soweit das verwendete Chattemplate und der richtige Tokenizer verfügbar sind, die gerenderten Tokenpräfixe vergleichen. Andernfalls die Zeichen- oder Byteberechnung ausdrücklich als Näherung führen.
- Fehlende Usage, gemeldete Null und positive Treffer getrennt ausweisen. Anteil der Requests mit verwertbarer Usage und Anteil gemeldeter Cachetokens an allen Prompttokens getrennt berichten.

Erst danach lohnt die Frage, ob stabile phasenspezifische Instruktionen nach vorn und dynamische IDs, Zustandswerte oder Zeitangaben nach hinten gehören. Eine solche Umordnung muss auch den Positionstest aus Abschnitt 4 bestehen. Ein höherer Cacheanteil wäre ein schlechter Tausch, wenn der Narrator häufiger falsche Ortsangaben übernimmt.

Prefix-Caching kann die Verarbeitung wiederholter Eingaben beschleunigen. Es verkürzt die eigentliche Generierung einer langen Antwort nicht im selben Maß und beseitigt keine zweite Modellphase. Unter der dokumentierten 4-von-4-Kapazitätskonstellation würde ich weder Warmup-Requests noch überlappende P/N/X-Generierungen einführen. Ein lokal abgebrochener Request kann beim Provider noch Kapazität belegen.

Technische Referenzen: [vLLM Automatic Prefix Caching](https://docs.vllm.ai/en/stable/features/automatic_prefix_caching.html) · [OpenAI Prompt Caching als Beispiel einer anbieterspezifischen Implementierung](https://platform.openai.com/docs/guides/prompt-caching) · [Featherless-Dokumentation](https://featherless.ai/docs/) · [GLM-Modellkarte](https://huggingface.co/zai-org/GLM-5.3-Flash)

## 7. Welche SillyTavern-Hebel sich lohnen

| Ansatz | Erwarteter Nutzen | Aufwand und wichtigstes Risiko | Kleinste aussagekräftige Prüfung |
|---|---|---|---|
| Prompt Manager und Einspeiseposition | Die gerade maßgebliche Szeneninformation erreicht den Narrator an einer wirksamen Stelle. | Gering bis mittel. Eine Verschiebung kann zugleich andere Inhalte aus dem Kontextfenster drängen. | Zwei komplette Narratorrequests derselben Szene vergleichen, einschließlich letzter erhaltener Chatnachricht und tatsächlich enthaltenem NPC-Fakt. |
| World-Info-Aktivierung überprüfen | Passende Weltlore erscheint bei Bedarf. Veraltete oder doppelte Aussagen lassen sich erkennen. | Gering für Analyse. Breitere Schlüssel können viele irrelevante Einträge aktivieren. | Je ein echter Treffer, ein Namensgleichheitsfall und eine bloße Erwähnung eines abwesenden Ortes. Aktivierte Einträge im gesendeten Request verifizieren. |
| Character Description verkürzen | Weniger konkurrierende Anweisungen, klarere literarische Aufgabe. | Mittel. Entfernte Regeln können alte Agency-, Listen- oder Metawissensfehler zurückbringen. | Jeweils eine belegte Dopplung entfernen und dieselben positiven und negativen Szenen vergleichen. |
| Streaming bewusst bewerten | Frühere sichtbare Prosa kann lange Generierung erträglicher machen. | Mittel. Der erste Token sagt wenig über die Zeit bis zur nächsten spielbaren Aktion. Frühe Prosa kann späteren Weltfolgen widersprechen. | Zeit bis lesbare Szene, bis Prosaende und bis bestätigter Sendefreigabe getrennt bewerten. Stop und Reload einbeziehen. |
| Zusätzliche Zusammenfassung oder Vektorsuche | Könnte bei sehr langen Kampagnen vergessene Ereignisse wiederauffindbar machen. | Mittel bis hoch. Eine zweite Wissensdarstellung kann erledigte Zusagen oder fremde Geheimnisse zurückbringen. | Erst zeigen, welche wichtigen Fakten das vorhandene identitäts- und zustandsgebundene Memory tatsächlich verfehlt. Dann Abruf auf dieselben Fälle testen. |

Für die normale Narration sind die ST-Funktionen direkt relevant. Bei Planner und Extractor entscheidet der konkrete Aufrufpfad darüber, ob eine ST-Einstellung überhaupt wirkt. Die Dokumentation der aktuellen ST-Version kann außerdem vom eingesetzten Tag 1.19 abweichen. Für eine Umsetzung sind deshalb der gepinnte Quellstand und die tatsächlich übermittelten Nachrichten maßgeblich.

Referenzen: [SillyTavern 1.19.0](https://github.com/SillyTavern/SillyTavern/tree/1.19.0) · [Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/) · [World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)

## 8. Was Forschung und Entwicklerpraxis für Avereth beitragen

| Quelle | Übertragbare Idee | Grenze |
|---|---|---|
| [LIGHT – Learning to Speak and Act in a Fantasy Text Adventure Game](https://arxiv.org/abs/1903.03094) | Dialogqualität anhand der konkreten Umgebung, Figur und möglichen Handlungen beurteilen. Ein stilistisch schöner Satz kann im aktuellen Spielzustand trotzdem falsch sein. | Der untersuchte Fantasykontext belegt keine langfristige Kampagnenkontinuität. |
| [Generative Agents](https://arxiv.org/abs/2304.03442) | Beim Abruf können Relevanz, Aktualität und Bedeutung unterschiedliche Beiträge leisten. Für Wat kann eine alte offene Zusage wichtiger sein als das letzte beiläufige Gespräch. | Die Simulation begründet weder eine zusätzliche Reflexionsphase pro Zug noch eine zweite autoritative Gedächtnisbank. |
| [LongMemEval](https://arxiv.org/abs/2410.10813) | Wissensupdates, Zeitbezug und begründetes Nichtwissen eignen sich als eigene Testklassen. Ein erledigtes Versprechen und ein Geheimnis eines Dritten sind stärkere Gegenfälle als bloße Namensabfrage. | Ein QA-Benchmark bewertet keine glaubwürdige NPC-Stimme und keinen Spielspaß. |
| [Lost in the Middle](https://arxiv.org/abs/2307.03172) | Die Position einer Information kann ihre Nutzung beeinflussen. Das rechtfertigt einen kontrollierten Positionstest mit identischem Wortlaut. | Die Ergebnisse aus Abruf- und QA-Aufgaben erlauben keine pauschale Platzierungsregel für GLM-Rollenspiel. |
| [Emily Short – Storylets: You Want Them](https://emshort.blog/2019/11/29/storylets-you-want-them/) | Erzählerische Gelegenheiten können an passende Voraussetzungen gebunden sein. Für Avereth könnte eine vorhandene offene Absprache als freiwilliger Gesprächsanlass dienen. | Ein ständig ausgespielter Anlass macht die Welt vorhersehbar. Stille Szenen und bewusst beiläufige Begegnungen sind notwendige Gegenfälle. |

Daraus ergibt sich eine weitere Produktidee mit begrenztem Umfang: **Die Engine kann die Gelegenheit zu einer interessanten Reaktion auffindbar machen, ohne die Reaktion festzulegen.** Sie kennt etwa Wats Zusage, den Ort und die Anwesenden. Der Narrator entscheidet, ob Wat Alaric beiseitenimmt, das Thema vor anderen meidet oder zunächst etwas Alltägliches tut. Das nutzt die Stärke des bestehenden persistenten Kerns, ohne neue PULSE-Würfe, NPC-Agenden oder eine zusätzliche Modellphase zu verlangen.

## 9. Größere Alternativen und ihr sinnvoller Einsatzpunkt

| Option | Vorteil | Risiko | Urteil |
|---|---|---|---|
| Situationsabhängiger Extractorkatalog | Weniger irrelevante Spezialregeln und möglicherweise weniger Formfehler. | Ein zu enger Katalog verliert unabhängige neue Weltfolgen. Gerade ein Kampf kann zugleich eine NPC-Zusage enthalten. | Als zweiten begrenzten Versuch sinnvoll. Einen erreichbaren Pfad für neue Personen, Orte, Wissen und Absprachen erhalten. |
| Kleineres oder schnelleres Modell für P oder X | Kann die Zeit vor der Erzählung oder nach ihrem Ende senken. | Mehr Fehlinterpretationen bei Negationen, Bedingungen oder Wissensperspektiven können die Ersparnis durch Repairs aufzehren. | Erst mit identischem Corpus und nach geklärtem Tarif-/Modellzugang vergleichen. |
| Narration und strukturierte Weltfolgen gemeinsam erzeugen | Könnte die doppelte Sprachinterpretation und einen regulären Request vermeiden. | Ein gültiger strukturierter Bericht kann eine erzählte Zusage auslassen. Der Fehler fällt möglicherweise erst viele Züge später auf. | Interessante größere Option, falls X nach den kleineren Verbesserungen weiter den Spielablauf dominiert. Gegen `.203` einschließlich Folgeturn und persönlicher Qualität prüfen. |
| Extractor generell bei Kampf oder kurzer Antwort überspringen | Spart im Erfolgsfall einen ganzen Request. | Textlänge und Szenentyp sagen zu wenig darüber aus, ob neue dauerhafte Weltinformationen entstanden sind. | Durch die vorhandenen Belege nicht gerechtfertigt. |
| Spielerbestätigung für jede unsichere Weltfolge | Kann eine falsche Buchung unmittelbar sichtbar machen. | Häufige Dialoge verlagern die Interpretationsarbeit auf den Spieler und unterbrechen den Erzählfluss. | Für gezielte Korrektur einer tatsächlich strittigen Folge untersuchen. Als regulären Zugabschluss verwerfen. |

Der stärkste Gegenfall für eine neue Ein-Aufruf-Architektur ist ein flüssig erzähltes, einwandfrei formatiertes Gespräch, dessen bedeutendste Zusage im strukturierten Teil fehlt. Eine erfolgreiche JSON-Validierung entdeckt das nicht. Der faire Vergleich endet deshalb erst beim späteren Wiedersehen, nachdem der Originaldialog aus dem aktiven Kontext entfernt wurde.

## 10. Empfohlene Reihenfolge und Entscheidungskriterien

**Erster Schritt – Offlineauswertung mit vorhandenen Originalen.** Für I14, I34, I38–I45 und mindestens eine belegte NPC-Wiederbegegnung die tatsächlich gesendeten Nachrichten nach Herkunft und Reihenfolge aufschlüsseln. Für jeden Fall vorher benennen, welche Tatsache der Narrator kennen musste, welches Wissen einer Figur fehlte und welche freie Erfindung zulässig war. Gleichzeitig die beschriebenen Präfixvergleiche durchführen. Das erfordert keine neue Kampagne und keinen Provideraufruf.

**Zweiter Schritt – Ein kleiner Vergleich zur Szenen- und NPC-Information.** Dieselben Eingaben, denselben Vorzustand und dieselben mechanischen Ergebnisse verwenden. Als Fälle eignen sich Gespräch mit offener Zusage, Wiedersehen nach Erledigung, zwei NPCs mit verschiedenem Wissen, stille Reise, Questannahme mit Richtungsfrage und Kampf mit freiem Seitenruf. Zuerst die Übergabe und Persistenz offline prüfen. Einen natürlichen Vergleich erst nach gesonderter Freigabe durchführen, unabhängig vom laufenden User06.

**Dritter Schritt – Qualität blind beurteilen.** Die Reihenfolge der Varianten wechseln, Gleichstände zulassen und Urteile mit konkreten Textstellen begründen. Getrennt erfassen: erkennbare NPC-Stimme, glaubwürdige Eigeninitiative, ungewählte PC-Handlung, Nutzung fremden Wissens, Widerspruch zur Mechanik und Erhalt einer bedeutenden neuen Tatsache im Folgeturn. Ein technischer Integritätsfehler wie Doppelbuchung oder Speicherung im falschen Chat beendet die betreffende Variante. Über Stil und Spielgefühl entscheidet der Spieler.

**Vierter Schritt – Den nächsten technischen Hebel nach Ergebnis wählen.** Verbessert die Szenenauswahl die Erzählung, wird sie auf weitere Szenen übertragen. Dominiert anschließend die Wartezeit nach Prosaende, folgt der begrenzte Extractorversuch. Ein Präfixumbau ist erst dann attraktiv, wenn die Offlineauswertung ausreichend gemeinsame Anfänge zeigt und ein später autorisierter Vergleich einen realen Vorteil bestätigt. Sampling, Modellwechsel und Architekturwechsel sollten jeweils eigene Versuche bleiben, damit ein Gewinn einer Ursache zugeordnet werden kann.

**Entscheidung:** Der sinnvollste nächste Forschungsversuch ist eine bessere Übergabe bereits vorhandenen Welt- und NPC-Wissens an den kreativen Narrator, kombiniert mit einer ehrlichen Messung bis zur nächsten spielbaren Entscheidung. Er nutzt die bewährte Mechanik von `.203`, greift zwei konkret beobachtete Spielerprobleme auf und liefert selbst bei negativem Ergebnis eine brauchbare Entscheidung für oder gegen einen größeren Umbau.
