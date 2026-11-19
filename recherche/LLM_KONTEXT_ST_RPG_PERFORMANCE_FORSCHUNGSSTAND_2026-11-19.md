# Avereth – LLM-Kontext, SillyTavern, RPG-Qualität und Performance
**Unabhängig rekonstruierter Forschungsstand · 19.11.2026 · Analyse, keine Implementierung**

> **Herkunft:** Der ursprünglich beauftragte Codex-Lauf meldete ein vorläufiges Ergebnis, scheiterte aber beim Start des Cloud-Executors mit `managed environment readiness timed out`. Sein vollständiger Berichtsentwurf war **nicht im Repository verfügbar**. Dieses Dokument ist deshalb eine **neue, eigenständig überprüfte Analyse**, keine als Original ausgegebene Wiederherstellung. Die im Chat übermittelten Codex-Thesen (relevantere Szene/NPC-Fakten; getrennte Latenzuhren; Prefix- und Cacheprüfung) waren Ausgangspunkte, nicht vorausgesetzte Ergebnisse.

**Ziel:** Möglichst verlässliche, lebendige Sandbox-Narration mit langfristiger NPC-Kontinuität und echter Spielerhoheit – bei weniger unnötigem Modellkontext und kürzerer Wartezeit. **Nicht** das Ziel: maximale Kürzung unabhängig von Gameplayqualität.

**Forschungsgrenze:** Read-only-Analyse von `main` (`866b2a9`), der Entwicklungsfassung `.203` (`experiment/action-hud-200-v1 / 5e5b8272412b51b91f75b6e37c5b94d95c9fae11`), archivierten User04-/User05-Belegen und öffentlich dokumentierten Mechanismen. **Keine Änderung** an Character Card, Preset, Code, User06, lokalem SillyTavern, Provider oder Tests; **keine kostenpflichtigen Modellaufrufe**. Live-User06-Daten liegen nicht vor. Externe SillyTavern-Dokumentation kann neuer als **ST 1.19** sein; Funktionen vor Umsetzung an dieser Version prüfen.

## 1. Wichtigste Ergebnisse

1. **Der bislang konkreteste neue Ansatzpunkt ist die Promptreihenfolge beim Narrator.** Die tatsächlich geloggten fünf Narratorrequests aus User05 Phase A haben nur etwa **2.733 gemeinsame Anfangszeichen**, weil bereits das zweite Systemsegment – aktivierte World-Info/Lore – zwischen Zügen wechselt. Die **37.303 Zeichen lange Character Description** steht im verwendeten Preset **erst danach**. Das reduziert den *potenziell wiederverwendbaren Anfang* stark. Es **beweist keine Ursache** für die gemeldeten null Cachetokens, ist aber ein lohnender, kleiner kontrollierter Strukturversuch.
2. **Planner und Extractor sind andere Prompts.** Ihre statischen Anweisungsblöcke sind umfangreich und über die gemessenen frühen Züge weitgehend identisch. Eine kürzere Character Card ändert diese Requests nicht. Regelumfang und Aufrufhäufigkeit müssen pro Phase optimiert werden, ohne bestehende Schutzregeln zu verlieren.
3. **Die Zeit bis zum sichtbaren Text und bis zum sicher fortsetzbaren Spiel sind verschiedene Produkteigenschaften.** Der in `.203` geprüfte einfache HUD-Weg spart bereits den Planner, nicht den Narrator oder Extractor. Bei momentan nichtstreamender Narration kann ein separates, sicher getestetes Streaming-Experiment die subjektive Wartezeit möglicherweise stärker verbessern als reine Promptverkürzung.
4. **Die richtige Informationsauswahl ist wichtiger als ungezieltes Kürzen:** der Narrator muss die kanonische Wegbeschreibung, die *tatsächlich vorhandenen* Dungeonakteure und einschlägige NPC-Erinnerungen dort erhalten, wo sie für diesen Zug gebraucht werden. Reine RAG-Ähnlichkeit ersetzt weder autoritative Enginezustände noch die Wissensgrenzen einzelner NPCs.
5. **Keine Modell-/Provider- oder Architekturentscheidung ist durch diese Recherche abschließend getroffen.** Die bisherigen Fehlerszenen entstanden noch mit `.202`; `.203` hat Teile des relevanten Kontextes bereits korrigiert. Die neuen Annahmen sind an `.203` gegen denselben Spielzustand zu prüfen.

## 2. Der tatsächliche Promptaufbau in Avereth `.203`

| Rolle / Schicht | Tatsächlich geprüft | Konsequenz |
|---|---|---|
| **ST-Narrator** | Preset `avereth-engine/presets/Avereth Narrator V4.json`: Stil-Prompt **2.209 Zeichen**, World Info **before**, Character Description, weitere Charakter-/Szenenfelder, World Info **after**, Chat History, Post-History-Anweisung **599 Zeichen**. Preset: `stream_openai:false`, Temperatur 0,9, `openai_max_context:131072`. | Permanente und wechselnde Bestandteile liegen gemischt; *physische Reihenfolge* prüfen, nicht nur Prompttexte isoliert lesen. Das eingetragene ST-Kontextlimit ist **keine Bestätigung** des effektiven Provider-/Tariflimits. |
| **Character Description** | `content/narrator/Avereth_Narrator_Contract_v4.txt` der `.203`: **37.303 Zeichen**, 358 Zeilen. Große Blöcke zu Engineautorität, Spieleragency, physischer Kontinuität, NPC-Wissen, Weltindifferenz und Questfriktion. | Laut [ST-Character-Design-Dokumentation](https://docs.sillytavern.app/usage/core-concepts/characterdesign/) permanente Promptinformation. Weniger Regeln können Qualität *verschlechtern*, wenn eine frühere reale Fehlerklasse wieder frei wird. |
| **Dynamischer Narrator-Enginekontext** | `src/context.js` projiziert Spielzustand, konkrete Entscheidungen, anwesende Akteure, NPC-Recall, Dungeon und bindende Ergebnisse. Default-Paketbudget **1.400**, zusätzlich Regelbudget **800** (keine vollständigen Providerpromptlimits; priorisierte Teile dürfen darüber liegen). | Kontext selektiv und beweisbar relevant halten. Verlässliche Weltfakten haben Vorrang vor dekorativen Informationen. |
| **Planner (P)** | Eigenständiger Anweisungs-/Katalogrequest aus `src/v4/planner.js`, mit Befehlsschemata, Vertrag, Sicherheits- und Domänenbeispielen. Einfache reine HUD-Aktion in `.203`: kein P. Freier gemischter Text: P bleibt. | Nicht durch alleinige Card-Änderung zu beschleunigen. Für Domänenmodule vorsichtig routen; komplexe Mehrschrittaktionen bleiben möglich. |
| **Extractor (X)** | Separater Request aus `src/v4/extract.js`: Welt-/NPC-Deltas mit Typen, Beleg-/Schemapflichten, aktueller Szene und Narratorantwort. | Erhält die persistente Welt. Pauschales Abschalten ist keine begründete Optimierung. Eindeutige redundante Form-Repairs können gezielt vermieden werden. |

Die ältere [Architekturanalyse von 16.11., §5](ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) belegte schon lange, teilweise domänenübergreifende P-/X-Anweisungen und einen konkreten Fall, in dem irrelevanter Gear-Market-Text eine Waldbewegung begleitete. Das ist ein Anlass für ein erneutes Audit **auf `.203`**, kein Beweis, dass jede damalige Unstimmigkeit noch unverändert besteht.

Offizielle ST-Grundlagen: [Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/), [Prompt Building](https://docs.sillytavern.app/usage/prompts/), [World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/). Diese erlauben unterschiedliche Positionen und bedingte Aktivierung, garantieren jedoch weder Cachehits noch Erzählqualität.

## 3. Neuer Offlinebefund: wiederverwendbare Promptanfänge

**Methode:** Die **17 vollständigen Requestblöcke von User05 Phase A** in `main/testrun_10b/user-20261118-011503/originals/completions.txt` wurden in die aufeinanderfolgenden physischen P/N/X/Board-Requests aufgeteilt. Verglichen wurde der *längste exakt übereinstimmende Zeichenanfang* (Longest Common Prefix) innerhalb derselben Phase. **Das sind Zeichen der formatierten Original-Logdarstellung, keine Provider-Token, keine HTTP-Bytes, kein simuliertes KV-Cache-Ergebnis.** Ermittelt wurden der gemeinsame Anfang aller Requests desselben Typs und seine erste Abweichung.

| Phase | Requests in A | Mittlere Länge des geloggten Requestblocks | Gemeinsamer Anfang aller |
|---|---:|---:|---:|
| Planner | 5 | ~53.421 Zeichen | **49.047** |
| Narrator | 5 | ~64.729 Zeichen | **2.733** |
| Extractor | 5 | ~62.810 Zeichen | **53.727** |
| Boardgenerator | 2 | ~14.773 Zeichen | **12.079** |

**Konkrete erste Abweichung im Narrator:** Nach dem identischen Stil-Systemprompt beginnt im einen Zug die World Info `CLASS FRAMEWORK`, im nächsten `LAW AND AUTHORITY`, später `RANK / LEVEL / EVOLUTION` bzw. Gildenkanon. Erst **danach** würde die große, unveränderte Character Description folgen. Der exakte, bereits am Anfang wechselnde Lorebereich trennt daher die fünf Promptanfänge. Beim Planner und Extractor liegt die erste Abweichung erst im jeweils dynamischen Katalog/HERE-Abschnitt.

**Interpretation und Grenzen:**
- Ein stabiles Promptprefix ist bei vielen Caching-Systemen eine wichtige Voraussetzung; die [Claude-Cache-Dokumentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) beschreibt Prefixmatching ausdrücklich. Das Prinzip ist eine nützliche **Architekturhypothese**, kein Nachweis identischer Implementierung auf Featherless.
- Beim Narrator wäre eine Versuchsfassung mit **unveränderter globaler Stil-/Agency-/Charakterkerninformation vor dynamischer World Info** ein plausibler A/B-Kandidat. Nicht die Weltinformationen entfernen und nicht deren wichtige Nähe zur Handlung opfern: nur Position und Abrufstrategie gezielt vergleichen.
- Dass P/X bereits lange konstante Anfänge haben und User05 dennoch **0 gemeldete Cachetokens** zeigte, widerspricht einer rein durch die Narrator-Reihenfolge erklärten Gesamtursache. Provider-/Planbedingungen, Cacheeintritt, Infrastruktur, Lebensdauer und Usage-Semantik müssen getrennt geprüft werden.
- Das Ergebnis stammt zunächst aus **Phase A**, nicht aus einem behaupteten vollständigen Prefixaudit aller 64 Requests. Vor einer Umstellung auf repräsentative Boss-/NPC-/Langzeit-Züge aus B/C ausdehnen und wirklich gerenderte Rollen-/Nachrichtengrenzen prüfen.

## 4. Featherless-Cache und realer Zeitbedarf

[Featherless dokumentiert](https://featherless.ai/docs/completions) in der Chat-Completion-Usage die Felder `cached_tokens` sowie `prompt_tokens_details.cached_tokens` und definiert sie als zum Cached-Input-Tarif abgerechnete Eingabetokens. [Modell-/Tarifinformationen](https://featherless.ai/docs/request-pricing-and-credits) nennen eigene Cachepreise; die [Plan-API-Dokumentation](https://featherless.ai/docs/api-reference-plan) erklärt den Unterschied zwischen Modellkontext und effektivem Tariflimit. **Nicht geprüft** sind der konkrete Nutzerplan, ein aktueller providerseitiger Cache-Hit auf seinem Konto und dessen Bedingungen. Insbesondere im Pauschalplan darf eine Kostenfeldsemantik nicht ohne Gegenprobe als Beweis fehlender GPU-seitiger Prefix-Wiederverwendung ausgelegt werden.

**Historische Messwerte (unterschiedliche Läufe/Bedingungen, kein kontrolliertes A/B):**

| Fall | Planner-Median | Narrator-Median | Extractor-Median |
|---|---:|---:|---:|
| User05 A, `.202` | 5,303 s | 23,745 s | 14,339 s |
| User05 B, `.202` | 6,221 s | 23,633 s | 27,192 s |
| User05 C, `.202` | 6,847 s | 23,907 s | 38,613 s |
| User04, `.159` | 3,866 s | 14,295 s | 8,498 s |

User05 A–C: **64 physische Requests**, **772.826 Prompttokens + 17.785 Completiontokens**, jedes mit **gemeldeten 0 Cachetokens**. User04: im umfassenderen Serverlog **124 Requests**, **1.520.007 Prompttokens**, **825.898 gemeldete Cachetokens**; die historische Zeitmediane stammen aus den finalen Chatrecords und sind **nicht** als gleiche Stichprobe wie das Serverlog zu behandeln. Quellen: [User05-Gegenreview](GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md), [User04-Review](../testrun_10b/user-20261106-072640/REVIEW.md), [`.203`-Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md).

**Zwei Uhren statt einer „Antwortzeit“:**
1. `t_first_prose`: ab tatsächlichem Senden bis zur ersten für den Spieler sichtbaren Narration (nicht bloß bis zum HTTP-Header).
2. `t_safe_next_turn`: bis Extractor, Worldcommit, bestätigter Save/Read-back und etwaige Abschlussbarrieren fertig sind und die **nächste Aktion sicher sendbar** ist.

Zusätzlich erfassen: P/N/X-Dauer je physischem Versuch, Repairs, sichtbaren Textumfang, Prompt-/Ausgabetokens und echte `cached_tokens`, aktiven Providerpfad, Server-/ST-Version, Generierungstyp (normal, Continue, Swipe), Zeit bis zum narrativen Endtext und Save-/Read-back-Dauer. Die `.203`-Hosttelemetrie für Worldjobs ist dafür ein Startpunkt, kein vollständiger Trace.

**Besonders prüfenswert, bisher übersehen:** Das geprüfte `.203`-Narratorpreset setzt `stream_openai:false`. In diesem regulären nichtstreamenden Pfad kommt die Prosa typischerweise erst nach der vollständigen Narratorantwort an; das beeinflusst das **gefühlte Tempo**. Ein getrenntes, isoliertes **Streaming-/provisorische-Anzeige-Experiment** könnte `t_first_prose` reduzieren, ohne P/X-Aufgaben umzubauen – allerdings nur mit unveränderten Buchungs-/Snapshot-/Abbruchgarantien. Ein Streamingvorteil ist **nicht** natürlich gemessen, und eine früh sichtbare Geschichte darf nicht als bereits gespeicherte Welt ausgegeben werden.

## 5. Welcher Inhalt gehört wohin?

**Arbeitshypothese, nicht bereits freigegebene neue Promptarchitektur:**

| Schicht | Sinnvoller Inhalt | Nicht unbemerkt daraus entfernen |
|---|---|---|
| Stabiler Narratorkern | Rolle und Spielerhoheit; Weltautonomie; Engineautorität; Trennung von IC-Beobachtung und PC-Gedanken; grundlegende Physik/Kontinuität; knapper Stil und Ausgabeform | Agency-Grenzen, kein erfundenes PC-Sprechen, keine erfundenen Kampf-/Wirtschaftsergebnisse |
| Situative Enginefakten | Aktueller Ort inklusive kanonischer Route; relevante Personen und **ihr eigenes** Wissen; gültige Begegnungs-/Dungeonbesetzung; tatsächlich gebuchte Handlungen/Schäden; heutige Questinformationen | Herkunft/Autorität, exakte IDs, Distanz, Foe-Slots, Bedingtheit, Wissen unbekannter NPCs |
| Konditionale Fachregeln | Kampf/AoE, Dungeon, Handel, Guild Board, Reise, Stealth, Skills, Loot, Questproof – jeweils nur wo nötig, aber bei gemischten Eingaben vollständig | Fehlende Regeln nicht stillschweigend durch Modellintuition ersetzen |
| Welt-Lore | Breite Kultur/Regionen, Behörden, Magie, allgemeine Lebenswelt, nur relevant aktiviert | Stabile Ortsidentitäten und relevantes Kanonwissen, auch wenn ein Keyword fehlt |
| Dynamischer Recall | Persistente NPC-Ereignisse, konkrete Absprachen, Beziehungen, offene Fäden mit Relevanz und Herkunft | Nicht aus einer summarischen „Beziehung“ versehentlich Wissen über private Ereignisse oder Anwesenheit folgern |

Hierzu passen [Anthropics Kontext-Engineering-Ansatz](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) (hoher Informationswert statt möglichst viel Text) und die Forschungsarbeit [„Lost in the Middle“](https://aclanthology.org/2024.tacl-1.9/) (die Position von Informationen kann die Nutzung langer Kontexte beeinflussen). **Weder Quelle ist ein GLM-5.3-Flash-Benchmark.** Die ideale Struktur muss mit Avereth-Szenen gemessen werden.

**ST-Optionen jenseits der Character Card:** World Info kann über Einfügeposition, Schlüssel, Budget, Prioritäten, Rekursion, „@ Depth“ und [Outlets](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) gesteuert werden. Die [Data Bank/Vector Storage](https://docs.sillytavern.app/usage/core-concepts/data-bank/) ermöglicht semantisch ausgewählte Textausschnitte. Der mögliche Nutzen liegt bei größeren Wissensbeständen; unpassende Retrievaltreffer, lokale Embeddingzeit, neu eingeschobene dynamische Promptteile und nicht deterministische Auswahl sind Gegenrisiken. **RAG darf nicht die autoritative Engine-Datenbank ersetzen.**

Für autonome glaubwürdige NPCs ist [„Generative Agents“](https://arxiv.org/abs/2304.03442) eine nützliche Forschungsrichtung für Beobachtung, Erinnerung, Reflexion und eigenes Handeln. Das belegt **nicht**, dass Avereth pro NPC einen weiteren LLM-Aufruf oder eine separate Simulationsinstanz braucht. Zuerst schauen, ob die bereits vorhandenen Agenda-/Recall-Fakten tatsächlich zur richtigen Zeit ankommen und ob der Narrator daraus unabhängige, kausale Reaktionen erzeugt.

## 6. Bewertete Optionen – nach erwartbarem Nutzen, nicht nach Tokenhunger

| Option | Potenzieller Gewinn | Risiko und Nachweis |
|---|---|---|
| **A. Narrator-Prefix gezielt stabilisieren** | Bei Cache-fähigem Provider längerer identischer Anfang; außerdem klarere Instruktionshierarchie | Layout kann Lore-Gewichtung/Erzählung verändern; tatsächliche Cache- und Qualitätsgegenprobe nötig |
| **B. Aktuelle Szene/NPC-Fakten präziser auswählen** | Weniger Weg-/Anwesenheitsfehler; bessere kausale NPC-Handlungen | Relevanzfilter darf verborgenes Wissen nicht verlieren oder Spoiler ausgeben. `.203`-Fixes als Ausgangsstand verwenden |
| **C. Text nur an notwendigen Stellen kürzen** | Weniger Tokens, potenziell weniger Ablenkung | Regelablation pro realer Fehlklasse; keine pauschale Entfernung von Negativbeispielen/Agencyguard |
| **D. Domänenmodule für P/X** | Weniger irrelevante Handel-/Gear-/Training-Regeln bei reiner Bewegung, weniger Kontextlast | Gemischte Befehle/Mehrschrittbedingungen, fehlerhafte Klassifikation, Zusatzreparaturen; zuerst nur offline prüfen |
| **E. Streaming/provisorische Narration** | Möglicherweise früher sichtbarer Text ohne Entfall der Weltprüfung | Mehr Host-/Save-/Swipe-/Stop-Komplexität. Weltstatus und finaler Text müssen eindeutig sein |
| **F. Selective X / strukturierte Narrator-Weltausgabe** | Langfristig weniger Requests oder Rework | Große Änderung der Autorität und NPC-/Weltbuchung; derzeit **keine** Empfehlung zur direkten Umsetzung |
| **G. Semantisches Langzeit-Retrieval** | Bei sehr langen Kampagnen möglicherweise bessere episodische Erinnerung | Retrievalqualität, Datenschutz/Spuren, falsches NPC-Wissen, instabile Promptprefixe; nur über bestehende Memorystruktur validieren |

Die bereits implementierten `.203`-Fastpaths (**reines HUD und eindeutige Questannahme: N+X; F-Mischtext: P+N+X**) sind eine reale Architekturverbesserung. Sie nicht mit zusätzlichen Modellen oder vermeintlich „schnellen“ separaten Klassifikatoren wieder aufzehren.

## 7. Falsifizierbare Prüfstrategie, ohne User06 zu stören

**Stufe I – kostenfrei, read-only:** Tatsächlich gerenderte Nachrichten aus User05 A/B/C nach P/N/X/Board gruppieren. Unterschiede pro Promptabschnitt, Länge, Reihenfolge, Konstantheit und Einspeisequelle ermitteln. Noch **keine** Rechnung mit erfundenen Token- oder Cachezahlen. Präzises Manifest: Build, Preset, Charaktervertrag, WI-Aktivierungen, Promptpostprocessing, Provider und Antwort-Usage. Nicht nur Textduplikate suchen; auch **semantische** Widersprüche (z. B. private NPC-Kenntnis vs. Weltwissen; Narratorfreiheit vs. Enginebefehle).

**Stufe II – isolierter, deterministischer Qualitätsvergleich:** Aus **identischen** eingefrorenen Zuständen und **identischer** Spieleraktion mehrere Promptvarianten zusammenstellen:
- unverändertes `.203` als Baseline;
- gleiche Fakten/Regeln, aber stabilerer **statischer Anfang vor variabler Lore**;
- kleine Kern-/Situationsmodule nur als getrennte Forschungsvariante;
- optional komprimierte Regelwiederholungen, **nicht** gleichzeitig mit beiden anderen Varianten.

Mit vorhandenen Original-Prompts lässt sich bereits **ohne Provider** prüfen, ob die richtigen Fakten und Regelgrenzen enthalten sind, wie früh sie stehen, ob Cacheprefixe länger würden und ob bisherige Tests/Schemas unberührt bleiben. Die tatsächliche Erzählqualität braucht später einen bewusst freigegebenen, begrenzten Modellvergleich: gleiche Modellversion/Sampling soweit möglich, mehrere Wiederholungen, Blindbewertung, Zufallsvariation offen ausweisen. Ein einmaliges gutes Beispiel ist kein Qualitätsbeweis.

**Pflichtfälle der Qualität:** Glimmerdeep **nördlich**, nicht westlich; keine erfundenen Bossgegner; kein erfundenes PC-Sprechen/Essen; NPCs wissen nur, was sie beobachten oder erfahren haben; NPCs handeln mit plausiblen eigenen Interessen; Board einmal; korrekte AoE-/Combat-Ausgabe; Reise/PULSE ohne erzwungenes „weiter“; verständliche offene Entscheidungen; NPC-Wiederbegegnung mit echter Erinnerung; gemischte F-Aktionen ohne stille Umdeutung. Die neue `.203`-Instruktion zu Richtung und Dungeonakteuren in der Baseline belassen, um den Test nicht unfair gegen den neuen Code zu formulieren.

**Stufe III – nur nach Freigabe Providervergleich:** Falls Cache/Latenz untersucht werden sollen, identische reale Requests mehrfach im selben Provider-/Modell-/Tarifkontext unter bekannten Wiederholungsabständen senden und echte `cached_tokens`, TTFT, Fertigstellung, Fehler, Kosten-/Usage-Semantik getrennt aufzeichnen. Effekt von Promptreihenfolge von Serverlast, Lebensdauer, Tarif und Kontextwachstum isolieren. **Kein** unaufgeforderter Echtgeldtest oder Tarifwechsel.

## 8. Empfohlene Reihenfolge und Entscheidungsgrenzen

1. **Jetzt:** Diesen Forschungsstand dokumentieren; User06 unverändert spielen. Aus der User05-A-Prefixmessung einen reproduzierbaren Offline-Audit für weitere Szenen machen. Höchste Priorität: **Narrator-Positionierung von World Info vs. stabilem Vertrag** plus gezielte Faktenprojektion.
2. **Danach:** Zwei saubere, isolierte Narrator-Promptalternativen samt Negativfällen für Agency/NPC-Kontinuität/Bossbesetzung vorbereiten und gegen die `.203`-Baseline vergleichen. Erst bei Qualitätsgleichstand oder besserer Qualität Token-/Cachevorteile bewerten.
3. **Parallel messbar:** `t_first_prose` und `t_safe_next_turn` im ST-Host verlässlich auseinanderhalten; aufbauend auf `.203`-Status-/Worldjobdaten. Ein Streaming-Experiment separat absichern.
4. **Später:** P-/X-Domänenmodule und ggf. semantisches Langzeitretrieval prüfen. Kein voreiliger P/X-Zusammenschluss, kein automatischer X-Skip, keine Verlustmigration des NPC-Gedächtnisses.
5. **Offen:** Featherless-Cacheverhalten auf dem konkreten Account/Plan; Modellvarianz; Qualität bei langen Kampagnen; genaue Performance einer dynamischen Extraktor-Subschemawahl. Ohne kontrollierten Test **keine** Prozentersparnis behaupten.

### Quellen / prüfbare Anker

**Avereth intern:**
- [User05-Gegenreview A–C](GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md)
- [Historisches Prompt-/Architekturaudit](ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md)
- [Bisherige AI-RPG-Recherche](AI_RPG_RECHERCHE_20261028.md)
- [User05-Originalrequest Phase A](../testrun_10b/user-20261118-011503/originals/completions.txt)
- [`.203`-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md)
- [`.203`-Narratorvertrag](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt)
- [`.203`-Preset](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/presets/Avereth%20Narrator%20V4.json)

**Externe Primärdokumentation und Forschung (Abruf 19.11.2026):**
- [SillyTavern: Character Design](https://docs.sillytavern.app/usage/core-concepts/characterdesign/) · [Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/) · [World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) · [Data Bank/RAG](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [Featherless: Completions](https://featherless.ai/docs/completions) · [Tarife und Cachepreise](https://featherless.ai/docs/request-pricing-and-credits) · [Plan-/Kontextgrenzen](https://featherless.ai/docs/api-reference-plan)
- [Anthropic: Effective Context Engineering (2025)](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) · [Prompt Caching – anderer Anbieter, nur Vergleich](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Liu et al., „Lost in the Middle“, TACL 2024](https://aclanthology.org/2024.tacl-1.9/) · [Park et al., „Generative Agents“, 2023](https://arxiv.org/abs/2304.03442)

**Schluss:** Das naheliegendste erste Experiment ist nicht „Character Description radikal verkleinern“, sondern **gleiche Autorität und denselben Weltinhalt in eine stabilere, relevanzorientierte Promptreihenfolge bringen**. Erst wenn unabhängige Szenentests die Erzählqualität bestätigen, soll daraus ein Produktpatch werden.