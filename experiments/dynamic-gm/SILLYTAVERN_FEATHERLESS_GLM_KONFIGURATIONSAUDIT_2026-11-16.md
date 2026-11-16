# GM Alpha: SillyTavern, Featherless und GLM-Konfigurationsaudit

Stand: **16.11.2026**. Untersucht: `experiment/dynamic-gm-model`, `2ec895051da34fabff6ea992b968a2f905a7478b`, **4.3.0-gm.alpha.1**. Produktvergleich: `.200`, `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`. ST-Quellstand: **1.19**, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Die Aussagen über ST gelten für diesen tatsächlich geprüften Stand; die Webdokumentation kann neuere Entwicklungen enthalten.

**Ergebnis:** Für diese Alpha ist **Chat Completion → Custom/OpenAI-compatible → Featherless** die bevorzugte Verbindung. Die neue GM-Architektur benötigt weder den alten Narratorvertrag noch dessen Prompt-Manager-Aufbau. Allerdings fehlen eine verlässliche Kontextgrenze für den eigenen Raw-Pfad und eine eindeutige GLM-Parameterkonfiguration. Der im Preset enthaltene neue Stilprompt erreicht diesen Pfad überhaupt nicht. Das sind konkrete Integrationslücken, kein Beleg, dass die GM-Architektur grundsätzlich ungeeignet wäre.

Vor einem längeren manuellen Spieltest empfehle ich einen kleinen Konfigurations-/Transportpatch: wirksame GLM-Templateparameter, Schutz vor widersprüchlichen Zusatzparametern, vollständiges Kontext-/Ausgabebudget und minimale Antworttelemetrie; dazu ein kurzer Stilabschnitt **im tatsächlich gesendeten GM-Vertrag**. Temperatur zunächst **0,8**, Top P **0,95**, Ausgabe **4.096**, Kontext **32.768 insgesamt** als nachvollziehbare Ausgangskonfiguration beibehalten. Diese Samplingwerte sind eine Testbasis, kein nachgewiesenes literarisches Optimum.

## 1. Methode und Beweisgrenzen

- Aktuelle Alphaquellen, zugehörige Buildquellen, Installationsanleitung, Einschränkungen, früherer Hostbericht und Alpha-Abnahme gelesen. `.200`-Preset, Narratorvertrag und gezielte historische Modell-/Runnerbelege verglichen.
- Offizielle Webseiten und Modellartefakte frisch abgerufen. **Keine Featherless-Inferenz-, Debug-, Tokenize-, Account- oder sonstigen authentifizierten Provider-API-Aufrufe**, keine Schlüssel gelesen oder gesetzt. Öffentliche Dokumente und Hugging-Face-Modellartefakte sind Recherchequellen.
- Neue ausschließlich eigene ST-Datenwurzel: `/workspace/avereth-setup/config-audit-20261116/data`, ST-Port `8144`, lokaler geskripteter HTTP-Provider `5144`, Chromium `156.0.8078.79`. Alpha-Installationsordner unverändert dorthin kopiert. Kein persönliches Profil übernommen. Browserzugriffe außerhalb Loopback gesperrt.
- Originale Alpha-Transportfunktion, tatsächliche ST-Frontendmodule **und tatsächlicher ST-Backendcode** ausgeführt. Auf dem nativen Featherless-Textpfad wurde ausschließlich `api_server` vor dem ST-Backend auf Loopback umgebogen; dessen echte Parameterfilter blieben aktiv. Das ist stärker als die frühere Alpha-Prüfung, die diesen Backendrequest vollständig abfing. Es bleibt ein Mocknachweis, keine Featherless-Serverabnahme.
- **18 gezielte Prüfungen bestanden, 0 PageErrors; 17 lokale HTTP-Generierungsrequests.** Mehrere Prüfungen bestätigen ausdrücklich einen Fehler oder eine Grenze. Sie zählen nicht als bestandene Konfigurationsanforderungen. Vier zusätzliche abschließende Promptmessungen: vier lokale Requests, 0 PageErrors. Insgesamt **21 geskriptete HTTP-Requests**, davon 20 Chat und einer Text, **null natürliche Modellrequests**.
- Sieben lokale Templateprüfungen bestanden: sechs Reasoning-Eingaben und Entfernen früherer Denktexte. Vollständige Prompts zusätzlich mit dem offiziellen GLM-Tokenizer und Chattemplate gezählt. Das sind **Offline-Tokenzahlen**, keine gemeldete Featherless-Usage.

Es wurden keine Presets, Runtime-, Produkt-, Gameplay-, Originaltest- oder Replaydateien verändert. Keine Vollsuite und kein Modellvergleich ausgeführt. Frühere natürliche Messungen werden als historische Belege ausgewiesen; sie sind keine neuen Alpha-Ergebnisse.

## 2. Warum die alten und neuen Einstellungen existieren

| Einstellung | `.200` / frühere Herkunft | Alpha 1 | Bewertung |
|---|---|---|---|
| Temperature | `0,9`; aus dem damaligen Test-5-Profil übernommen | `0,8` | Im Alpha-Build gesetzt, **kein dokumentierter natürlicher A/B-Nachweis** für die Absenkung. Als vorsichtige Ausgangsbasis brauchbar, nicht als bewiesene Verbesserung. |
| Top P | `0,95`, gleicher historischer Profilwert | `0,95` | Auch aktueller offizieller GLM-Default. Weiterverwenden, solange kein konkreter Qualitätsbefund dagegen spricht. |
| Reasoning | Preset `low`; wirksames `low` kam bei GLM/Custom aus Include Body | Nicht im Preset definiert | Kein bewusster, belegter Wechsel auf einen besseren GM-Modus. Fehlendes Feld bedeutet zudem **Vererbung des vorherigen ST-Werts**, nicht zuverlässig `auto`. |
| Gedanken anzeigen | `show_thoughts:true` | `false` | Anzeige-/Quelloption, kein Abschalten der Modellberechnung. Alpha übernimmt die Antwort ohnehin selbst. |
| Antwortlimit | `4096`; frühere Tests teilweise `8192`, Reasoning high | `4096` | Begrenzung, keine zugesicherte Prosalänge. Historischer Fall mit 4096 reinen Reasoning-Tokens und leerem Text belegt das Risiko. |
| Kontext | `131072`, unlocked | `32768`, locked | Korrekte Richtung für den Chat-Tarif. **Im Alpha-Raw-Pfad setzt dieser Presetwert aber noch keine wirksame Requestgrenze.** |
| Stil | Eigener Main-Prompt plus V4-Ausgabevertrag, Karte, Lore und Engineblock | Kurzer Preset-Main-Prompt, separater GM-CORE | Preset-Main wird nicht zusammengestellt. Nur CORE und explizite dynamische Daten erreichen den GM. |
| Streaming / n / externe Tools | Aus / 1 / aus | Aus / 1 / aus | Für zurückgehaltene strukturierte Alpha-Antworten sinnvoll; derzeit durch Custom-Include-Body nachträglich überschreibbar. |

Die Begründung ist in [NARRATOR_AB.md §§1–2](../../avereth-engine/docs/NARRATOR_AB.md) ungewöhnlich klar: Sampling und Limits wurden aus einem vorhandenen Testprofil übernommen, während vor allem der umfangreiche Megumin-Stilaufbau ersetzt wurde. Die dortigen A/B/C-Promptgrößen sind Rekonstruktionen; der Bericht kündigt natürliche GLM-Vergleichsergebnisse noch als ausstehend an. Er beweist kein Optimum von 0,9 gegenüber 0,8 oder 1,0.

[TESTRUN_V6.md](../../avereth-engine/docs/TESTRUN_V6.md) dokumentiert dagegen einen echten historischen Lauf: elf Story-Anfragen im gewünschten Aufbau, durchschnittlich etwa 7,8k Prompttokens, 511 Ausgabetokens einschließlich Reasoning/Report und Median 29 s. Das stützt die damalige grundsätzliche Nutzbarkeit, nicht die Überlegenheit einzelner Sampler. Selbst die gewünschte Vergangenheit wurde dort wegen der anders formulierten Begrüßung nicht zuverlässig eingehalten.

[PATCH8_2_LLM_PERFORMANCE.md §§1/4](../../avereth-engine/docs/PATCH8_2_LLM_PERFORMANCE.md) dokumentiert später stark schwankenden Reasoning-Verbrauch und eine leere Antwort nach 4096 Tokens. Ob der Provider `low` tatsächlich befolgte, wurde ausdrücklich offengelassen. Der [Live-Runner](../../avereth-engine/docs/LIVE_RUNNER.md) kopiert Reasoning-/Include-Body-Felder teilweise auch in eigene direkte Requests; dessen Verhalten darf deshalb nicht automatisch auf den normalen ST-Backendpfad übertragen werden.

Die neuen Alpha-Werte stehen unmittelbar in [alpha/build.mjs:18–24](alpha/build.mjs). Die [Alpha-Abnahme](alpha/ABNAHME_2026-11-16.md) prüfte Installation, Import, Host und geskriptete Fachabläufe. Sie enthält **keine natürliche Sampling-, Reasoning- oder Stilabnahme**. Die Aussage „neue Architektur, daher 0,8 optimal“ wäre unbelegt.

## 3. Aktuelle offizielle Quellen: Modell, Tarif und Backend unterscheiden

### 3.1 Featherless Chat

[Preisübersicht](https://featherless.ai/pricing), [Pläne](https://featherless.ai/docs/plans) und [Concurrent Unit Limits](https://featherless.ai/docs/concurrency-limits) bestätigen: **25 USD/Monat, unbegrenztes Tokenvolumen im interaktiven Chat-Tarif, bis 32K Kontext, vier gleichzeitige Einheiten**. Das sind keine vier gleichzeitigen GLM-Anfragen. Die aktuelle [GLM-Modellseite](https://featherless.ai/models/zai-org/GLM-5.3-Flash) weist **vier Einheiten pro Anfrage** aus. Der Alpha-Scheduler mit einer belegten 4/4-Anfrage passt dazu; fremde Clients und andere Geräte werden dadurch nicht kontrolliert.

Die Tarifdokumentation unterscheidet persönliche, vom Menschen geführte Nutzung einschließlich Rollenspiel von automatisierten Workloads/Benchmarks. Die angebotenen Developer-Credits und die auf der Modellseite angezeigten Tokenpreise sind **nicht automatisch die Abrechnung dieses Chat-Tarifs**. Aus einem `429 concurrency_limit_exceeded` folgt kein Creditverbrauch.

Quellen unterscheiden außerdem:

- **Modellfähigkeit:** HF-Tokenizerkonfiguration 1.048.576 Kontext; Z.ai-Hosted-Modellseite 1M Kontext/128K Ausgabe.
- **Featherless-Serving:** Modellseite/Kompatibilitätstabelle 256K für dieses Originalmodell, insbesondere im Developer-Kontext. Die Modellseiten-Kurzbeschreibung nennt daneben noch 32768; der Tarif und die konkrete Requestgrenze sind maßgeblich, nicht dieser widersprüchliche Beschreibungssatz.
- **Chat-Tarif:** weiterhin maximal 32K Gesamtfenster, selbst wenn das Modell größere Fenster besitzt.
- **Ausgabe:** eigenes Limit. [Completions](https://featherless.ai/docs/completions) beschreibt `max_tokens`, modellabhängiges `max_completion_tokens`, Priorität des neueren Felds und automatisches Verkleinern des Ausgaberaums, wenn Prompt plus Ausgabe nicht passen. [Error codes](https://featherless.ai/docs/api-reference-error-codes) nennt zusätzlich 400-Fehler bei unzulässigen Limits und maximal 32768 angeforderte Ausgabetokens. Die Alpha darf sich weder auf stilles Verkleinern noch auf eine immer identische Fehlervariante verlassen.

**32K ist nicht 32K Eingabe plus 4096 Ausgabe.** Reasoning beansprucht Ausgaberaum vor dem sichtbaren JSON. Ein volles Kontextfenster kann dadurch ein syntaktisch abgeschnittenes Weltpaket erzeugen.

Die aktuellen [Completions-Dokumente](https://featherless.ai/docs/completions) sagen ausdrücklich: `/v1/completions` bleibt verfügbar, **offizieller technischer Support für Text Completion ist beendet**; unterstützte Integrationen sollen `/v1/chat/completions` verwenden. Das begründet die Präferenz für Chat Completion erheblich stärker als eine allgemeine Vorliebe für Chatmodelle.

### 3.2 GLM-5.3-Flash: konkrete statt familienweiter Regeln

Die offizielle [Modellkarte](https://huggingface.co/zai-org/GLM-5.3-Flash), das [Chattemplate](https://huggingface.co/zai-org/GLM-5.3-Flash/blob/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/chat_template.jinja) und die [Generation-Konfiguration](https://huggingface.co/zai-org/GLM-5.3-Flash/blob/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/generation_config.json) wurden auf Revision `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` geprüft:

- `reasoning_effort`: **low, high, max**. Fehlend oder ein anderer Wert wird im veröffentlichten Template **max**. Lokal bestätigt für fehlend, `none` und `medium`. Das frühere Experimentieren mit `none` ist deshalb keine belastbare Strategie zum Abschalten dieses Modells.
- Das Template fügt `Reasoning Effort: Low|High|Max` ein und beginnt die Generierung weiterhin mit `<think>`. **Low ist nicht „kein Reasoning“.**
- `clear_thinking` ist im konkreten Template standardmäßig **false**; die HF-Modellkarte empfiehlt **true für Chat**. Es entfernt zurückliegende Denktexte aus dem Eingabeverlauf, nicht die aktuelle Denkphase und nicht das Enginegedächtnis.
- Die offizielle Generation-Konfiguration nennt **temperature 1,0 / top_p 0,95**. Die Modellkarte nennt diese bzw. andere Werte für konkrete Benchmarks. Das ist ein sinnvoller späterer Vergleichswert, kein bewiesenes Optimum für Avereth-Rollenspiel mit gemeinsamem Memory-JSON.

Die [Z.ai-Hosted-Dokumentation](https://docs.z.ai/guides/vlm/glm-5.3-flash) empfiehlt für ihren Pfad 1,0 / 0,95 / max und `thinking.clear_thinking:false`. Die [Thinking-Dokumentation](https://docs.z.ai/guides/capabilities/thinking-mode) beschreibt verpflichtendes Thinking für 5.3/5.3-Flash und das unveränderte Weiterreichen von `reasoning_content` bei mehrstufigen nativen Toolabläufen. Das widerspricht der HF-Chatempfehlung nicht zwingend: anderer Einsatzfall, API und Erhalt von Agenten-Denkhistorie. Es ist **keine Anweisung, Z.ai-spezifische verschachtelte `thinking`-Objekte ungeprüft an Featherless zu senden**.

Featherless dokumentiert [chat_template_kwargs](https://featherless.ai/docs/chat-template-kwargs) als echten Chat-Requestparameter: Benutzerwerte überschreiben Template-Defaults, unbekannte Schlüssel können akzeptiert werden, ohne Wirkung zu haben. Die dortige ältere GLM-Familientabelle nennt 4.7/5/5.1. Ihre On/Off-Aussagen dürfen nicht über die konkreten 5.3-Flash-Belege gestellt werden. `enable_thinking:false` oder ein beliebiges `thinking_budget` sind für diesen Alpha-/Modellpfad deshalb keine empfohlene Abkürzung.

**Verbleibende Grenze:** Transport eines Feldes, Anwendung im veröffentlichten HF-Template und tatsächliche Anwendung in Featherless' laufender Modellbereitstellung sind drei verschiedene Nachweise. Die ersten beiden wurden hier geprüft; der dritte ist ohne Provideraufruf nicht abschließend bewiesen.

### 3.3 JSON und Tools

Die aktuelle Featherless-Modellseite kennzeichnet GLM-5.3-Flash als **Tool Calling Supported**. Der allgemeine [Tool-Guide](https://featherless.ai/docs/tool-calling) stammt noch vom 07.08.2025 und listet nur Kimi/Qwen ausdrücklich auf. Diese alte Liste beweist keine heutige GLM-Nichtunterstützung. Derselbe Guide beschreibt JSON-Modus über `response_format:{type:"json_object"}` als Alternative.

[Z.ai Structured Output](https://docs.z.ai/guides/capabilities/struct-output) zeigt JSON-Modus und nachgelagerte Schema-Prüfung. Auch das beweist keine durchgängig unterstützte strikte JSON-Schema-Grammatik für Featherless' konkrete Bereitstellung. **JSON-Modus, striktes Schema, korrektes Weltpaket und wahrheitsgetreue Prosa sind getrennte Eigenschaften.**

Die Alpha verwendet heute **eigene JSON-Operationen im Content**, keine nativen `tool_calls`. `resolve`, `describe`, `recall` und `world.continue` veranlassen weitere physische Requests. Native Function Calling jetzt einzuschalten wäre ein Protokollwechsel, keine harmlose Presetoptimierung; `finish_reason:tool_calls` wird aktuell sogar abgelehnt.

## 4. Tatsächlicher Requestpfad

### 4.1 Alpha und ST-Frontend

[gm/runtime.js:39–54](../../avereth-gm-alpha/gm/runtime.js) baut genau zwei Nachrichten: einen System-CORE und einen User-JSON-Block. Darin stehen Spielereingabe, Verpflichtungen, Szene, Katalog, Mechanikdaten, getrennte NPC-Perspektiven, ausgewählte Engine-Lore, sechs jüngste Nicht-System-Nachrichten, Befehlstypen/-schemas, Weltvertrag und bisherige Werkzeugergebnisse.

[gm/transport.js:7–15](../../avereth-gm-alpha/gm/transport.js) kopiert aktive Chat-Completion-Einstellungen, ruft STs `getChatCompletionModel()` und `createGenerationParameters(...,'quiet',messages)` auf und sendet selbst an `/api/backends/chat-completions/generate`.

**Dieser Pfad ist nicht der normale Prompt Manager und auch nicht einfach STs vollständiges `generateRaw()`**. Insbesondere wird nicht die übliche `sendOpenAIRequest()`-Kette mitsamt `CHAT_COMPLETION_SETTINGS_READY` benutzt. Die Alpha ergänzt keine Karte, kein Persona-Prompt, kein World-Info/Lorebook, keine Beispielgespräche, keinen Preset-Main und keine Post-History-Anweisung. Die Engine-Lore im User-JSON ist eine eigene Quelle. Kartenbegrüßungen oder tatsächlich vorhandene Dialogtexte können über `recentDialogue` dennoch in den Prompt gelangen.

Im Textpfad benutzt die Alpha `createRawPrompt(messages, ..., false, false, '', '')`, anschließend `getTextGenGenerationData()`. Aktives Instruct-Formatting und Stopsequenzen wirken dort; der vollständige normale Context-/Story-String-Aufbau mit Karte/Lore wird dadurch nicht automatisch hergestellt. Anders als im Chatpfad wird `TEXT_COMPLETION_SETTINGS_READY` emittiert. Andere Extensions können deshalb auf diesem Pfad nochmals eingreifen. Das mitgelieferte alte GLM-4-Instructpreset ist kein nachgewiesen gleichwertiger Ersatz für das aktuelle GLM-5.3-Flash-Template.

ST-Primärbelege: [openai.js](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js) (`getReasoningEffort`, `createGenerationParameters`, `onSettingsPresetChange`), [script.js](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js) (`createRawPrompt`, `generateRawData`), [Textgen](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/textgen-settings.js). Allgemeine Einordnung: [Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/), [Instruct Mode](https://docs.sillytavern.app/usage/prompts/instructmode/), [Custom Chat Completion](https://docs.sillytavern.app/usage/api-connections/openai/).

### 4.2 Was tatsächlich wirkt

| Feld/Quelle | Chat-Alpha über ST Custom | Ergebnis am lokalen Backend / Konsequenz |
|---|---|---|
| `temperature`, `top_p`, Frequency/Presence Penalty | Presetimport setzt ST-Felder `temp_openai`, `top_p_openai` usw. | **0,8 / 0,95 / 0 / 0** kommen an. |
| `openai_max_tokens` | Wird `max_tokens` | **4096** kommen an. Zusatzparameter können es überschreiben. |
| `openai_max_context`, locked/unlocked | Keine Budgetprüfung in diesem Raw-Pfad | Kein Kontextlimit im Request; ein gezielt auf 64 gesetztes UI-Limit verhinderte **320.000 Zeichen Eingabe** nicht. |
| `reasoning_effort` im Preset/UI | Frontend erzeugt bei Low/High entsprechende Werte; Custom-Max wird **high** | ST-Backend entfernt das normale Feld bei diesem GLM-Modell. Auto: fehlt bereits vorn. Low/High/Max: **am Mock kein Feld**. |
| `show_thoughts:false` | Frontend `include_reasoning:false` | Auf Custom/GLM nicht ins Providerbody übernommen; keine Kontrolle über Thinking-Aufwand. |
| `custom_include_body` | YAML wird vom ST-Backend gemergt | Explizites top-level `reasoning_effort` sowie verschachtelte `chat_template_kwargs` und `response_format` werden unverändert übertragen. Cloudwirkung separat offen. |
| `custom_exclude_body` | Wird nach Zusammenstellung angewandt | Kann Felder wieder entfernen. Kein Preset garantiert ohne Prüfung des Verbindungszustands einen identischen Request. |
| Preset `prompts`, `prompt_order`, alte Post-History | Keine Prompt-Manager-Zusammenstellung | **Nicht gesendet**. Der aktuelle Alpha-Stilprompt ist auf diesem Weg wirkungslos. |
| Karte / Persona / ST-Lorebook | Nicht automatisch integriert | Änderungen dort sind keine verlässliche Methode, den GM-Stil oder Weltkontext zu steuern. |
| ST Prompt Post-Processing | Custom-Backend verarbeitet den aktiven Verbindungswert | `None` erhält die zwei Nachrichten; restriktivere Varianten können Rollen/Struktur verändern. |
| `stream`, `n`, externe `tools` | Alpha setzt false/1 und entfernt Tools | Nur vor dem Backendmerge: Include Body kann **stream:true, n:2 und tools** wieder einfügen. Lokal nachgewiesen. |
| `seed` | Im Alpha-Chatpreset nicht gesetzt | Import ließ einen vorbereiteten Wert **77** bestehen. Kein reproduzierbares Modellseed-Versprechen; Featherless warnt selbst vor verteilter Serverausführung. |
| Custom Stopstrings | ST liest globale/temporäre Stopstrings, Chat maximal vier | Können JSON mitten im Inhalt beenden. Keine neuen Satz-/Namen-/Klammer-Stops empfehlen. |
| `top_k`, `min_p`, Repetition Penalty | Nicht vom Chat-Alpha-Preset als wirksame GLM-Extras gesetzt | Nicht automatisch die Textpresetwerte; Servingdefaults bleiben ohne explizite Angabe offen. |

Die Ursache des Reasoning-Verlusts steht im [Chat-Backend](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backends/chat-completions.js): Custom-Include wird um Zeile 2409 gemergt; das normale Reasoningfeld wird um 2600 nur für gelistete OpenAI-Reasoningmodelle bzw. KoboldCpp ergänzt. GLM gehört nicht dazu. `max` wird zuvor im Frontend-Custompfad auf `high` reduziert. Ein sichtbares „Low“ im ST-UI beweist somit nichts über Featherless.

Der [Text-Backendfilter](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/backends/text-completions.js#L346) verwendet [`FEATHERLESS_KEYS`](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/constants.js#L263). Darin fehlen `reasoning_effort` und `chat_template_kwargs`. Im Test vorn absichtlich hinzugefügt, am Mock beide entfernt. Der native Textrequest enthielt dagegen 0,8 / 0,95 / top_k 40 / repetition_penalty 1,05 und **max_tokens 350**, weil das Textpreset die globale ST-Ausgabelänge nicht setzt. Die Anleitung verlangt 4096 manuell; der Import allein genügt nicht. Das testfrische Profil hatte kein GLM-Instruct aktiviert: geliefert wurde eine einfache Rollen-/Namensverkettung, kein automatisch korrektes GLM-Template. Das beweist eine Konfigurationsabhängigkeit, nicht einen Defekt jedes eingerichteten Textprofils.

**Promptdopplungen:** In den geprüften Chatrequests keine heimliche Addition alter Preset-, Karten- oder Lorebookprompts. Ein altes Preset kann dennoch Sampler/Connection-Extras vererben. Include-Body kann sogar `messages` überschreiben; unbekannte Dritt-Extensions oder das persönliche Profil wurden nicht untersucht. Deshalb nicht behaupten, jeder bestehende Benutzeraufbau sei identisch oder automatisch sauber.

### 4.3 Antwort und Fehler

| Geskripteter Fall | Tatsächliches Alpha-Verhalten | Einordnung |
|---|---|---|
| `finish_reason:stop`, getrenntes `reasoning_content`, Content-JSON | Nur Content zurückgegeben | Passender aktueller Vertrag; Usage und Reasoning-Metadaten werden verworfen. |
| `finish_reason:length` | `Incomplete answer: length`, Remoteabschluss bestätigt | Kein abgeschnittenes Paket veröffentlichen; sinnvoll. |
| Leerer Content trotz Reasoning | `Provider returned no narration JSON` | Sicherer Halt, aber Ursache/Ausgabeverbrauch nicht sichtbar. |
| Fehlendes `finish_reason` | Nichtleerer Content akzeptiert | Abschlusssignal nicht verpflichtend. Bei diesem bekannten Chatprovider sollte die erwartete Hülle geprüft werden. |
| `<think>…</think>` im Content | Unverändert an Runtime gegeben | Dort kein JSON; Parsefehler. STs normale Reasoning-Parser/Regex-Anzeige reparieren diesen eigenen Transportweg nicht. |
| Provider HTTP 429 | ST antwortet HTTP 200 mit vereinfachtem `error` | Alpha: Remoteabschluss unbekannt, Kapazität bleibt konservativ gebunden. Konkreter Providerfehlercode/Status gehen in ST verloren. |

Die Alpha erzwingt nichtstreamende Generierung und puffert bis zur Weltvalidierung/Persistenz. Im Mock wurde die nachträgliche Überschreibbarkeit von `stream` nachgewiesen; die simulierte Antwort blieb JSON. Ein echter SSE-Stream würde von `response.json()` nicht korrekt verarbeitet. Deshalb ist ein ungeprüftes `stream:true` in Zusatzparametern kein Alpha-Streamingmodus.

Die [ST-Reasoning-Dokumentation](https://docs.sillytavern.app/usage/prompts/reasoning/) beschreibt Anzeige, Parsing und Wiedereinfügen für normale ST-Generierungen. Diese Funktionen sind keine automatische Zusage für den direkten Alpha-Fetch. „Show thoughts aus“ verhindert weder Tokenverbrauch noch garantiert es JSON-only-Content.

## 5. Kontext: gemessener Umfang und sichere Einsparmöglichkeiten

Die abschließende Messreihe verwendete die unveränderte Alpha-`prompt()`-Funktion. Für den zweiten Waldrequest wurde `prepare()` mit dem aufgezeichneten Plan auf einer Kopie ausgeführt und **das tatsächliche Resolve-Ergebnis einschließlich `results`** wie in `run()` aufgenommen. Jeder vollständige Nachrichteninhalt kam byteinhaltlich unverändert durch ST am Mock an. Keine natürliche GM-Entscheidung wurde simuliert und anschließend als Modellleistung ausgegeben.

| Fall/Phase | Herkunft | Nachrichteninhalt, Zeichen | Vollständiger Provider-JSON-Body, UTF-8-Bytes | Offline-GLM-Inputtokens mit Template |
|---|---|---:|---:|---:|
| Wald, erster GM-Request | Persönlicher `.200`-Vorstand und Eingabe vom 16.11. | 24.578 | 28.083 | 5.814 |
| Wald, nach Resolve | Derselbe Vorstand, originaler Plan durch Engine; echter Ergebnisblock | 63.018 | 70.989 | 16.906 |
| Bekannter Weg, erster Request | Synthetisches `I go to Alderwatch.` auf demselben Vorstand | 24.517 | 28.022 | 5.803 |
| Wat-Gespräch, erster Request | Originalzustand `w191` nach #92; synthetische Nachfrage/Zusage | 40.270 | 45.085 | 10.215 |

Bodybytes umfassen JSON-Escaping und Parameter, keine HTTP-Header. Tokenmessung: HF-Tokenizer und obiges Template auf gepinnter Revision, `reasoning_effort=low`, `clear_thinking=true`, `add_generation_prompt=true`, keine nativen Tools. Der Test belegt **nicht**, dass Featherless dieselbe Template-/Tokenizerrevision und keine zusätzlichen Servingpräfixe verwendet. Die Mock-Usagewerte waren absichtlich synthetisch und wurden für diese Tabelle **nicht** benutzt. Keine Tokenwerte aus pauschalem Zeichen/4 geschätzt.

Die untersuchten Prompts passen unter dieser Offlineannahme mit 4096 reservierten Ausgabetokens in 32K. Damit ist **kein aktueller Kontextüberlauf dieser vier Fälle nachgewiesen**. Das Problem ist die fehlende Grenze für wachsende Kampagnen, nicht ein erfundener gegenwärtiger Überlauf.

Konkrete Größenursachen:

- Der GM-CORE hat **2.366 Zeichen**. Seine Kürzung wäre nicht der größte Gewinn.
- Das Welt-Schema hat vor der Waldauflösung **12.709**, danach **48.794 Zeichen**. Nun werden kanonische Orte/Referenzen und neue Ortsstrukturen wiederholt in verschachtelten Unions eingebettet. Der gesamte `worldContract` wächst auf **50.354 Zeichen**.
- Das Resolve-Outcome steht anschließend sowohl in `worldContract.outcome` als auch in `results`. Die Wiederholung ist ein belegbarer, kleinerer Ansatzpunkt.
- Beim Wat-Fall haben die NPC-Perspektiven **7.081 Zeichen**, die jüngsten Dialoge 4.761. `recall()` holt alle zugeordneten Wissens-/Memoryeinträge sowie Threads, nicht nur einen global begrenzten relevanten Ausschnitt. Sechs Chatnachrichten begrenzen daher nicht die Gesamteingabe.
- Vier Grundschemas (`go/take/use/give`) und sämtliche Befehlstypnamen sind auch im Gespräch vorhanden. `describe` ermöglicht bedarfsgerechtes Nachladen, kostet aber eine physische Modellfortsetzung. Nicht jeden kleinen Vertrag ersatzlos auslagern und den gewonnenen Promptplatz durch einen zusätzlichen Request bezahlen.

**Empfohlene Reihenfolge:** zuerst Schemawiederholung/IDs und doppelte Ergebnisse kompakt darstellen; Validierung vollständig in der Engine behalten. Danach kontextbezogene Auswahl mit fest reservierten Plätzen für Identität, Wissensträger, Persönlichkeit, aktuelle Zusagen, relevante gemeinsame Erinnerung und situative Fairnessgrenzen. Ältere weitere Einträge bleiben vollständig gespeichert und über `recall` auffindbar. Keine Kürzung der persistenten Wahrheit, keine Entfernung offener Zusagen nur wegen ihres Alters, keine Vermischung der Geheimnisse anwesender NPCs.

Ein globales vollständiges Budget muss **nach** Zusammenstellung einschließlich Schema, Werkzeugergebnissen, Rollen-/Templateoverhead und reservierter Ausgabe gelten. Vorschlag für eine konservative erste Grenze: `Input + 4096 + 512 Reserve <= 32768`, also höchstens **28.160 Inputtokens**. Die 512 sind eine vorgeschlagene technische Reserve, keine dokumentierte Featherless-Vorgabe; sie ersetzt keinen passenden Tokenizer. Wenn der tatsächliche Backend-Overhead unbekannt ist, darf die Anzeige keine exakte Providerzählung vortäuschen. Bei Überlauf gezielt verdichten oder vor Dispatch verständlich anhalten, nicht abschneiden und hoffen, dass die Ausgabe noch passt.

## 6. Kreativer GM-Vertrag und sinnvolle Rückübernahmen

Die frühere Stilkonfiguration enthielt nützliche Entscheidungen, die nicht an Planner/Narrator/Extractor gebunden waren: konkrete Handlung und Sinneseindrücke, individuelle Stimmen, interessengeleitete NPC-Reaktionen, variable Länge, weniger Wiederholung, keine unnötigen Menüs. Ihr Nutzen für die Alpha ist **plausibel, aber natürlich noch nicht gemessen**. Gerade diese Hinweise fehlen im wirksamen CORE weitgehend; der unwirksame Preset-Main kompensiert das nicht.

Übernehmen würde ich einen kurzen positiven Stilabschnitt, etwa diesen **Entwurf, noch nicht eingebaut**:

> In narration and speech, write in the player's language, in third person and past tense. Begin with the world's response rather than repeating the input. Use concrete actions and a few relevant sensory details; let length and pace follow the moment. Give NPCs distinct voices shaped by their established personality, interests and own knowledge, without reciting their dossiers. Let them initiate plausible ordinary reactions and conversations. Avoid repeating recent gestures or images, stock dramatic phrasing and unsolicited menus or meta-commentary. These style rules apply inside the narrative fields; preserve the required JSON operation and report consequential new world facts and promises.

Spielerhoheit, mechanische Autorität, Wissensgrenzen und das Verbot erfundener Erfolge bleiben im vorhandenen CORE; sie werden nicht nochmals als langer Negativkatalog dupliziert. Englisch nicht global erzwingen. Keine Sinnesquote, starre Wortzahl, obligatorischer Cliffhanger oder pauschale Verbotsliste gewöhnlicher Wörter. Dritte Person/Vergangenheit sind bewusste Stilentscheidungen aus der bisherigen Vision, keine Modellanforderung; sie sollten auch zu künftig vorgesehenen Einstiegsbeispielen passen.

Den alten V4-Post-History-Vertrag **nicht** übernehmen: „only story text, no fact report“ widerspräche der gemeinsamen GM-JSON-Ausgabe. Auch keine Rückkehr zum 35-kB-Narratorvertrag oder mechanischen Regeltexten im Kartenfeld.

| Information | Empfohlener eindeutiger Ort |
|---|---|
| Kreative Rolle, Spielerhoheit, Engineautorität, Wissensgrenzen | Kurzer stabiler GM-Systemkern |
| Erzählerstil | Ein kurzer Abschnitt im tatsächlich gesendeten Systemkern; später optional eigenes Stilmodul |
| Charakterkarte | Auswahl/Identität/Startoberfläche; kein heimlicher zweiter Regelvertrag |
| Kanonische Weltlore | Relevante Engine-Lore; Karte nicht als alleinige Quelle einer wichtigen Tatsache behandeln |
| NPC-Erinnerung, Wissen, Persönlichkeit, Zusagen | Strukturierte, nach Person bezeichnete Engineperspektiven; bei Bedarf Abruf |
| Aktuelle Mechanikergebnisse/PULSE | Ein autoritativer situativer Ergebnisblock |
| JSON-/Operationsform | Kleiner stabiler Protokollkern plus passende Feldschemas; keine Prosa-Stilregeln in technischen Feldern |

`clear_thinking:true` löscht **keines** dieser Gedächtnisfelder. Aktuell sendet die Alpha ohnehin keine historischen Assistant-`reasoning_content`-Nachrichten zurück, sondern rekonstruiert System + Userdaten für jeden Schritt neu. Daher ist ein unmittelbarer Geschwindigkeitsgewinn durch Clear Thinking hier **nicht nachgewiesen**. Für einen späteren nativen Toolpfad müsste das unveränderte Erhalten des Reasonings innerhalb einer Werkzeugkette gesondert bewertet werden; es ist nicht durch bloßes Umschalten eines Presets erledigt.

## 7. Priorisierte Empfehlungen mit Abnahmegrenzen

### P0.1 — Einen unterstützten Pfad und wirksame GLM-Parameter festlegen

- **Ist/Beleg:** Chat und Text werden gleichberechtigt angeboten; offizieller Textsupport beendet; normales Custom-Reasoning verschwindet; nicht gesetzte Presetwerte werden geerbt. Code und Mocknachweis oben.
- **Änderung:** Chat/Custom als empfohlenen Featherless-Pfad dokumentieren. GLM-Templateparameter gezielt über Include Body übertragen, explizit `low` setzen; UI-Preset ebenfalls `low` für Verständlichkeit, jedoch nicht als Wirkungsbeleg. Seed bewusst auf „nicht festgelegt“ (`-1` in ST) setzen. Post-Processing `None`, keine zusätzlichen Stopstrings.
- **Nutzen:** Reproduzierbare Parameterabsicht, kein unbemerktes Max-/High- oder Vorprofilverhalten.
- **Nachteil:** Low kann komplexe Planung/Memoryauswahl verschlechtern. Text bleibt technisch möglich, verliert aber den Status einer gleichwertig abgenommenen Empfehlung.
- **Status:** ST-Transportproblem bestätigt; qualitative Überlegenheit von Low und konkrete Cloudanwendung offen.
- **Kleinste spätere Abnahme:** Echten finalen Request ohne Keys vergleichen; vorgesehenes GLM-Template mit Low rendern; später ein ausdrücklich gestarteter kurzer manueller Chat und eine mechanische Fortsetzung mit echten Usage-/Finishdaten. Kein automatischer Batch.

### P0.2 — Technische Alpha-Grenzen auch nach Custom-Extras erhalten

- **Ist/Beleg:** Include Body kann die vorn erzwungenen Werte `stream:false`, `n:1`, Toolfreiheit und sogar Nachrichten/Limits überschreiben; im Mock für Stream/n/Tools nachgewiesen.
- **Änderung:** Effektive Zusatzparameter vor Dispatch prüfen/gezielt erlauben; Konflikte mit Nachrichten, Streaming, n, nativen Tools und Budget verständlich ablehnen. Nicht einfach alle Extras entfernen, sonst gingen gerade GLM-Templateparameter verloren. Exclude Body entsprechend berücksichtigen.
- **Nutzen:** Ein Request bleibt eine kontrollierte Antwort; keine unerwarteten Swipes, SSE-Daten oder zweite Toolsteuerung.
- **Nachteil:** Bestehende exotische Verbindungsprofile benötigen eine konkrete Konfliktmeldung statt stiller Übernahme.
- **Status:** Technischer Befund bestätigt; kein natürlicher Vergleich nötig.
- **Kleinste spätere Abnahme:** Dieselben drei gegensätzlichen Include-Body-Felder, zusätzlich `messages` und `max_completion_tokens`; vor Mockdispatch abweisen oder belegbar auf zulässige Werte begrenzen. Erlaubte verschachtelte GLM-Werte unverändert lassen.

### P0.3 — Vollständiges Budget und Antwortabschluss prüfen

- **Ist/Beleg:** 32K-Preset ohne Raw-Budgetwirkung; alle NPC-Memories/Schemas können wachsen. `length` und leere Inhalte werden abgefangen; fehlendes Finish-Signal nicht. Usage geht verloren. Historisch wurde das gesamte Ausgabelimit für Reasoning verbraucht.
- **Änderung:** Gesamtbudget vor Dispatch; Ausgabe als gemeinsames Reasoning-/JSON-Budget behandeln. Minimal erfassen: Phase, physischer Requestzähler, Prompt-/Completion-/Reasoningtokenzahl soweit geliefert, Finishgrund, Dauer, Modell und wirksame nicht geheime Parameter. Für diesen Chatpfad Abschlusshülle prüfen. Vermischtes Reasoning im Content klar diagnostizieren; keine willkürliche Freitextreparatur als Sicherheitsgarantie.
- **Nutzen:** Überläufe/Abschneiden werden vor Weltverlust sichtbar; ein späterer Outputlimitvergleich hat eine Messgrundlage.
- **Nachteil:** Tokenizer/Serving-Overhead müssen sauber gehalten werden; strengere Hüllenprüfung kann bislang tolerierte kompatible Backends ablehnen.
- **Status:** Fehlende Absicherung bestätigt; konkrete Langkampagnen-Overflowrate unbekannt.
- **Kleinste spätere Abnahme:** Grenzfälle unter/über dem Gesamtbudget, lange Memory und Toolresults, `length`, leer, fehlendes Finish, getrennter Reasoningkanal, vollständig empfangenes JSON. Keine Veröffentlichung und kein Weltcommit bei fehlerhafter Antwort.

### P0.4 — Fehlerarten verständlich auseinanderhalten

- **Ist/Beleg:** ST reduziert die konkrete 429-Antwort; Alpha erhält ein unspezifisches HTTP-200-Fehlerobjekt. Der bestehende Scheduler hält die Kapazität richtigerweise offen.
- **Änderung:** In Anleitung/Diagnose klar zwischen unbekanntem Remoteabschluss, bestätigter Ablehnung, Kontextfehler, Trunkierung und lokaler Zeitüberschreitung unterscheiden. Falls ST die Belege entfernt, genau diese Unsicherheit ausweisen. Kein „Credits leer“, keine Freigabe allein durch Stop/Timer. Eine Statusverbesserung jenseits der verlorenen Daten braucht eine gesonderte Backendlösung, kein erfundenes Parsing im Preset.
- **Nutzen:** Keine schädliche Retrykette und keine falsche Kosten-/Kapazitätsdiagnose.
- **Nachteil:** Einige Fehler bleiben ohne aussagekräftigen ST-/Providerbeleg nur manuell klärbar.
- **Status:** Maskierung bestätigt. Ursache jeder externen Belegung weiterhin offen.
- **Kleinste spätere Abnahme:** Ein lokaler 429, ein Timeout mit später Antwort und ein Kontextfehler; gezählte Requests, korrekte Sperre und kein doppelter Effekt. Bestehende Schedulerregeln erhalten.

### P1.1 — Stil an die wirksame Stelle setzen

- **Ist/Beleg:** Kurzer Stil steht im nicht gesendeten Preset-Main; CORE enthält nur grobe Prosaorientierung. Alte V4-Stilentscheidungen waren gezielter, aber nicht vollständig befolgt.
- **Änderung:** Den kurzen obigen Stilabschnitt einmalig in den GM-Vertrag aufnehmen; Presetbeschreibung entsprechend ehrlich machen. Alte Output-/Agency-Duplikate nicht importieren.
- **Nutzen:** NPC-Stimme, Tempo und konkrete Szenen bekommen tatsächlich Modellkontext, ohne die alte Architektur wieder einzuführen.
- **Nachteil:** Zusätzliche Instruktion kann überformalisieren; literarischer Gewinn bleibt subjektiv und modellabhängig.
- **Status:** Promptzustellung technisch belegt; Qualitätsgewinn Hypothese.
- **Kleinste spätere Abnahme:** Wireprüfung „Stil genau einmal, nur narrative Felder betroffen“; später kurze Unterhaltung und Ortswechsel manuell nach Wiederholung, Eigeninitiative, Stimme und Agency bewerten.

### P1.2 — Persönlichkeit und bedeutsame Erinnerung gezielt verwenden

- **Ist/Beleg:** Engineperspektiven enthalten echte Wissens-/Memorydaten und `voice/manner/interest`; alle relevanten Datensorten sind vorhanden, aber teils umfangreich und mehrfach im Katalog/Dialog eingebettet. Das gemeinsame Modell kann Wissen weiterhin in falsche Dialoge übertragen.
- **Änderung:** Identität, etablierte Stimme, offene Zusage und zur Szene passende gemeinsame Erinnerung sichtbar priorisieren; Quellen/Wissensträger behalten. Weiteren Bestand bedarfsabhängig abrufbar lassen. Nicht die Enginepersistenz oder Persönlichkeitsmechanik ändern.
- **Nutzen:** Natürlicheres Wiedererkennen bei weniger Suchaufwand im Prompt.
- **Nachteil:** Eine falsche Relevanzauswahl kann wichtige ältere Information verdrängen; Abruf kann einen zusätzlichen Request kosten.
- **Status:** Vorhandensein/Umfang bestätigt; bessere Auswahl und natürliche Wirkung unbewiesen.
- **Kleinste spätere Abnahme:** Wat ohne Originaldialog, alte offene Zusage und zwei NPCs mit unterschiedlichen Geheimnissen. Datenvollständigkeit separat von erzählerischer Nutzung bewerten.

### P2.1 — Zuerst redundante Schemas verkleinern

- **Ist/Beleg:** Welt-Schema 48.794 Zeichen nach Wald-Resolve, doppeltes Outcome; größerer Hebel als der kurze CORE.
- **Änderung:** Wiederholte Referenz-/Ortsdefinitionen einmal führen, Schema-/ID-Ansicht für das Modell verdichten, Bindungsergebnis einmal übergeben. Enginevalidator unverändert vollständig. Grundlegende häufige Operationsformen behalten; seltene Details über `describe`.
- **Nutzen:** Weniger Eingabe-/Kontextlast je Fortsetzung ohne Gedächtnisverlust.
- **Nachteil:** Zu aggressive Verdichtung kann mehr ungültige Operationen oder zusätzliche Beschreibungsrequests erzeugen. `$ref`-/JSON-Schema-Unterstützung des Providers nicht einfach unterstellen; Promptdarstellung und Backendgrammar unterscheiden.
- **Status:** Redundanz messbar; Latenz-/Qualitätsvorteil noch ungemessen.
- **Kleinste spätere Abnahme:** Die vier gemessenen Prompts vor/nach vergleichen, Referenzen und fachliche Weltresultate identisch halten; Requests einschließlich `describe` zählen.

### P2.2 — Sampling, Ausgabe und JSON-Modus gezielt vergleichen

- **Ist/Beleg:** 0,8 nicht natürlich optimiert; offizielles GLM 1,0 / 0,95, historische Avereth-Runs 0,9. Kein `response_format`; eigene JSON-Anweisung plus Engineprüfung. 4096 können durch Reasoning knapp werden.
- **Änderung:** Erst nach technischen Korrekturen und kurzem Feedback eine Variable verändern: 0,8 gegen 0,9, gegebenenfalls 1,0; Low gegen High nur bei konkreten Entscheidungsfehlern; 4096 gegen 8192 nur bei belegter Trunkierung mit ausreichend Kontext. JSON-Objektmodus separat ausprobieren, bevor er Standard wird. Keine automatischen Reparaturbatches und kein pauschales Erhöhen aller Limits.
- **Nutzen:** Verbesserungen lassen sich einer Ursache zuordnen.
- **Nachteil:** Mehr Output/Reasoning kann Latenz und Belegungsdauer erhöhen; JSON-Modus erzwingt keine vollständig gespeicherte Zusage oder richtige Prosa. Ein striktes Gesamtschema kann die vielfältigen GM-Operationen zusätzlich einschränken.
- **Status:** Übertragung von `response_format` im Mock bestätigt, konkrete Featherless-/GLM-Generierungswirkung und Qualitätsgewinn offen.
- **Kleinste spätere Abnahme:** Kurzes normales Gespräch, Erinnerung nach Kontextverlust, Reise, eine Werkzeugfortsetzung; vollständiges JSON, natürliche Qualität, Memory, echte Request-/Tokenzahlen gemeinsam bewerten. Nicht bloß „Antwort kam“ als Erfolg zählen.

## 8. Konkrete empfohlene Ausgangskonfiguration

**Verbindung:** ST Chat Completion, Quelle Custom/OpenAI-compatible, bestehender Featherless-Endpunkt `https://api.featherless.ai/v1`, Modell exakt `zai-org/GLM-5.3-Flash`. Vorhandene Schlüsselverwaltung unverändert. Kein eigener Alpha-Key und kein automatischer Testrequest beim Import.

| Einstellung | Empfehlung vor längerem Test |
|---|---|
| Temperature / Top P | **0,8 / 0,95** als kontrollierte Ausgangsbasis; nicht als Optimum etikettieren |
| Presence / Frequency Penalty | **0 / 0** |
| Kontext | **32768 insgesamt**, unlocked aus; zusätzliche echte Raw-Budgetprüfung erforderlich |
| Max Response | **4096**, einschließlich möglichem Reasoning; keine Wortzahlgarantie |
| Reasoning im ST-Preset | **low**, aber Wirkung über nachfolgende Templateparameter sichern |
| Show thoughts | **false** für die Darstellung; ausdrücklich keine Thinking-Abschaltung |
| Stream / n / Function Calling | **false / 1 / false**, auch gegen widersprüchliche Extras sichern |
| Websuche / Bilder | **aus** |
| Seed | **-1** in ST, damit kein geerbter fester Seed; Engine-RNG bleibt unabhängig |
| Prompt Post-Processing | **None** |
| Benutzerdefinierte Stopstrings | **keine** für GM-JSON |
| Karten-/Lorebook-Zusatzvertrag | **keiner**; Lore und Regeln kommen über die Extension |
| `response_format` | zunächst unverändert; **JSON-Objektmodus als eng begrenzter nächster Kompatibilitätstest**, nicht ungeprüft striktes Gesamtschema |
| Top K / Min P / Repetition Penalty | keine ungeprüfte Übernahme von Textpreset 40 / 0 / 1,05; tatsächliche Servingdefaults als offen dokumentieren |

Für diesen Modellpfad ist dies der konkret empfohlene **Include-Body-Entwurf**:

```yaml
chat_template_kwargs:
  reasoning_effort: low
  clear_thinking: true
```

Das verwendet den dokumentierten Featherless-Templatekanal und die Namen des konkreten GLM-Templates. Nicht zusätzlich widersprüchliche `thinking`, `enable_thinking`, `reasoning_effort:high` oder fremde Samplerblöcke stehenlassen. Die früher verwendete top-level-Kombination `reasoning_effort:low`/`clear_thinking:true` wurde zwar an den Provider übertragen, ihre Umsetzung im heutigen Featherless-Template ist damit nicht bewiesen. Der verschachtelte Entwurf hat den stärkeren aktuellen Dokumentationsbeleg. **Er wurde hier bis zum lokalen Backend und im offiziellen lokalen Template geprüft, nicht in einer natürlichen Featherless-Antwort.**

Clear Thinking ist in dieser stateless aufgebauten Alpha überwiegend eine explizite Chatabsicht, kein gemessener Effizienzhebel. Low dient als begrenzter Startwert; bei schlechten komplexen Werkzeugentscheidungen ist High ein sinnvoller einzelner Vergleich. Max nicht als Default einschleichen lassen und nicht mit dem ST-Custom-UI-Max verwechseln.

## 9. Benötigte spätere Dateien und kleine Abnahme

**Dieser Commit ändert nur diesen Bericht.** Bei Freigabe wären gezielt betroffen:

| Datei | Vorgeschlagene Aufgabe |
|---|---|
| `experiments/dynamic-gm/alpha/transport.js` → generiert `avereth-gm-alpha/gm/transport.js` | Konflikte mit Include-/Exclude-Body, wirksame Parameter, Antwortabschluss/Telemetrie und vollständiger Dispatch-Budgetbezug |
| `experiments/dynamic-gm/alpha/runtime.js` → `avereth-gm-alpha/gm/runtime.js` | Kurzer wirksamer Stil, Budget-/Relevanzaufbau; Ergebnisse ohne unnötige Dopplung |
| `experiments/dynamic-gm/alpha/engine.js` → `avereth-gm-alpha/gm/engine.js` | Nur bei der späteren Schemaverdichtung: kompakte Modellansicht, unveränderte fachliche Validierung |
| `experiments/dynamic-gm/alpha/build.mjs` → Alpha-Presetdateien | Explizite Reasoning-/Seed-Absicht, ehrliche Beschreibung der wirksamen Felder; Textpreset nicht als gleichwertige GLM-Empfehlung ausgeben |
| `experiments/dynamic-gm/alpha/INSTALLATION_DE.md`, `LIMITATIONS.md` → Installationspaket | Chatpfad, Zusatzparameter, Grenzen und Messstatus; keine Änderung persönlicher Einstellungen durch Build |
| Gezielte Alpha-Tests/Abnahme | Parameterroute, Budget, Responsehülle, Memory-/Stilzustellung; keine historische Replayfreigabe nötig für reine Transporttests |

Buildquellen zuerst ändern und Installationskopien reproduzierbar erzeugen; nicht nur den generierten Ordner editieren. Keine Änderungen am `.200`-Mechanikkern und kein Umbau des B/C1-Experiments für diese Konfiguration.

Empfohlene kleine Abnahmefolge:

1. **Offline + lokales ST:** Normaler und geerbter Altprofilzustand; Low/High/Max, erlaubte/konfliktträchtige Extras, Presetimport, Kontextgrenzen, Finish/Length/Empty/Reasoningkanal. Endgültigen Body prüfen, nicht nur UI-Werte. Drei Inhalte: Wat, Wald, Werkzeugfortsetzung. Gedächtnis und Spielerhoheit dürfen durch Promptänderung nicht verschwinden.
2. **Danach ausdrücklich gestarteter kurzer manueller Featherless-Test:** Ein Gespräch mit Zusage, Wiedersehen ohne ursprünglichen Dialog, Reise mit tatsächlicher Ankunft, eine Engineauflösung mit Fortsetzung. Wirkliche Phase-/Usage-/Finishwerte protokollieren; keine automatische Vergleichsserie. Bei falschem JSON, fehlender Zusage oder langen Reasoningphasen erst Ursache bestimmen, nicht gleichzeitig Temperatur, Kontext und Output hochsetzen.
3. **Erst nach diesem Feedback längere neue Testkampagne und einzelne Optimierungsversuche.** Bekannte semantische Fehlerklassen bleiben Abnahmekriterien: fehlende Zusage, falsche Ankunft, erfundene Zustimmung, Metawissen, widersprüchliche Fortsetzung. Ein korrekter HTTP-/JSON-Ablauf ist keine natürliche RPG-Qualitätsfreigabe.

## 10. Antworten auf die acht Abschlussfragen

1. **Chat oder Text?** Chat Completion/Custom. Aktuell offiziell unterstützter Featherless-Pfad, serverseitiges Modelltemplate, kontrollierbare Templateparameter; Text bleibt verfügbar, hat aber Support-, Template- und ST-Filter-Nachteile.
2. **Welche Presetparameter wirken?** Sampling und Ausgabelimit wie oben; teilweise geerbte Verbindungseinstellungen. Main-/Post-History-Prompts, Karte und normales Lorebook werden im eigenen GM-Pfad nicht automatisch verwendet. Der Kontextslider begrenzt ihn nicht.
3. **Welche GLM-Einstellungen?** Zunächst 0,8 / 0,95, Low über `chat_template_kwargs`, Clear Thinking true als Chatabsicht, 4096 Ausgabe innerhalb echter 32K-Gesamtgrenze. Kein unbelegtes No-Thinking. Offizielles 1,0 und High später gezielt vergleichen.
4. **Kommt Reasoning wirklich an?** Über das normale ST-Feld für GLM **nein**. Explizite Custom-Extras kommen am Backend an; das offizielle Template setzt die verschachtelte Absicht um. Featherless' reale laufende Modellanwendung ist ohne Providerprobe offen.
5. **Fehlt Stil?** Ja: mehrere nützliche frühere Stilziele fehlen im tatsächlich gesendeten Kontext. Kurz dort ergänzen, nicht den alten Narratorvertrag reaktivieren.
6. **Effizienter ohne Memoryverlust?** Ja, konkrete Redundanzen in Schemas und Ergebnissen bieten Ansatzpunkte. Natürlicher Geschwindigkeitsgewinn noch nicht gemessen. Gedächtnis behalten, Relevanzansicht und Abruf verbessern.
7. **Vor längerem Spieltest?** P0-Parameter-/Budget-/Responsekorrektheit und wirksamen kurzen Stil klären, anschließend kurze echte manuelle Abnahme. Die technische Alpha-Installation allein reicht hierfür nicht.
8. **Erst nach Feedback?** Temperatur 0,9/1,0, High/Max, größere Ausgabe, native Function Calls oder Preserved Thinking, weitergehende Memoryselektion und strikte Provider-JSON-Schemas. Nicht alles gleichzeitig ändern.

**Entscheidung:** GM-Architektur beibehalten; zuerst einen überschaubaren Konfigurations-/Transportpatch und kurzen manuellen Nachweis durchführen. Der größte derzeit belegte Gewinn liegt in korrekten Requests, kleinerem Schemaaufwand und tatsächlich zugestelltem Stil. Ein weiteres globales Regelprompt oder zusätzliche obligatorische Modellphasen sind dafür nicht erforderlich.

## 11. Nachweise und Reproduktion dieses Audits

Die Recherche- und Mockartefakte liegen ausschließlich in der genannten separaten Auditwurzel, nicht im Installationspaket. Wesentliche Dateien: `sources-initial.json`, `sources-round2.json` bis `sources-round4.json`, heruntergeladene öffentliche Quellen, `request-audit.mjs/.json/.log`, `wire.json`, `prompt-measure.mjs`, `full-gm-prompts.json`, `prompt-measurements.json`, `count-tokens.py`, `offline-token-counts.json`, `st.log`. Keine Authentifizierungsheader wurden vom Mock aufgezeichnet. Die umfangreichen Bodies enthalten Fixturetexte; keine persönlichen ST-Daten wurden gelesen.

Reproduktionsprinzip: gepinntes ST mit neuer Datenwurzel starten; unveränderte Alpha kopieren; Browserzugriffe auf Loopback begrenzen; realen Presetimport durchführen; ursprünglichen `createTransport()` gegen lokalen Provider ausführen; sowohl Browser→ST-Body als auch ST→Mock-Body vergleichen. Für Text ausschließlich Zieladresse umbiegen, nicht die Backendantwort vorwegnehmen. Anschließend `DynamicGM.prompt()` auf den genannten Fixtures einschließlich echtem Resolve-Ergebnis messen. Der Mock liefert nur geskriptete Hüllen, keine natürlichen Geschichten. Die lokale Tokenzählung verwendet das veröffentlichte HF-Template mit Jinja-Loopcontrols und den gepinnten Tokenizer ohne zusätzliche Special Tokens.

Integritätsbelege (SHA-256):

```text
request-audit.mjs       da0a86d4d35b4a1b2c0c6bc035b1f667cc60376d68d3c2ecc4c6c16bfd60a568
request-audit.json      69fcd194c59921f9191fe0514481b8333d9cda0df548b581a6ac6916f44e87ac
prompt-measurements.json 49cdb18854d37f265c0338c2fce6b87552bb364ca7843a33d7b0e160994bf03c
offline-token-counts.json 34a0cc5eb8c36f8c14e62d5a590c99e69196643da5f43cc754f28fa2c9095582
```

Zusätzliche historische Einordnung: Der Bericht auf `main`, `recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md` (ursprünglich `e0557a0`, hier aus unverändertem Main-HEAD `27380a6` gelesen), belegt für `.200` 12.244/58 Planner-Tokens, 10.282/338 Narrator-Tokens, rund 121 s erfolglose Extraktion und anschließende **4+4>4-Concurrencyablehnungen**. Die beobachteten Phasen waren nicht einfach vier erlaubte parallele Requests. Ob die noch belegte Remoteanfrage oder eine andere Session die Ablehnung auslöste, ist weiterhin nicht vollständig bewiesen. Diese Daten begründen Serialisierung und Wiederaufnahme, **keine behauptete Crediterschöpfung, keinen bewiesenen Kontextüberlauf und keine gemessene natürliche Beschleunigung der Alpha**.
