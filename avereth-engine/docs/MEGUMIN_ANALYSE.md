# Ohne Megumin? Analyse und Empfehlung (24.09.2026)

**Frage:** Wir nutzen von Megumin nur noch den Erzähler. Können wir ein eigenes, schlankes Preset schreiben und Megumin ganz weglassen, oder übersehen wir eine technische Funktion?

**Kurzantwort:**
- **Technisch geht der Plan auf.** In unserem Setup schickt Megumin dem Modell ausschließlich statischen Text und statische Sampler-Werte. Das ist belegt: In beiden Test-5-Läufen war der Megumin-Anteil über alle 16 Anfragen byte-identisch. Keine versteckte Laufzeitlogik beeinflusst die Generierung.
- **Die tieferen Funktionen von Megumin gibt es wirklich:** Memory mit LLM-Zusammenfassungen, NPC-Bank, Story-Director, Bann-Listen-Generator, Bildgenerierung, Würfel, Regelgenerierung und Prompt-Regex. Sie sind bei uns aber aus, durch die Engine ersetzt oder ohne Wirkung.
- **Ein 1:1-Klon ist nicht das Ziel.** Rund die Hälfte des Megumin-Texts doppelt den Avereth-Vertrag. Ein Teil widerspricht dem Engine-Design. Und das Repo ist öffentlich, deshalb gehört kein bearbeiteter Megumin-Text hinein (Lizenz, Abschnitt 7).
- **Empfehlung:** Einen eigenen, schlanken Erzähl-Layer in eigenen Worten schreiben und ihn im A/B-Vergleich gegen Megumin messen, bevor Megumin wegfällt.

---

## 0. Die Datei „Chatgpt_Feedback.md“

Die Datei enthält wortgleich die Aufgabenstellung, keine Antwort von ChatGPT. Es gibt daraus kein Wissen zu bewerten. Soll eine ChatGPT-Auswertung geprüft werden, muss deren Text nachgereicht werden.

## 1. Was Megumin technisch ist

**Quellen:**
- Repository [Arif-salah/Megumin-Suite](https://github.com/Arif-salah/Megumin-Suite), Stand 31.08.2026: Code, `manifest.json`, `Presets/*.json`, README;
- die echten Anfragen aus Testrun 4 und beiden Test-5-Läufen (Server-Logs).

**Aufbau:** Megumin Suite ist eine SillyTavern-Extension plus zwei Preset-Dateien. Laut README ersetzt sie „your preset, your memory system, your NPC management, and your image generation“.

| Teil | Was er tut |
|---|---|
| `Megumin Suite V10 Universal.json` (Chat-Completion-Preset) | Prompt-Reihenfolge und Sampler-Werte. Die Prompt-Einträge enthalten fast nur Platzhalter: `[[prompt1]] [[main]] [[prompt2]] …`, `[[THINK]]`, `[[config]]`, `[[banlist]]`, `[[blocks]]`, `[[storyplan]]`, `[[long-Memory]]`, `[[Short-memory]]` usw. Dazu die Hüllen `<character_sheet>`, `<user_persona>`, `<history>` und die Post-History-Zeile „And remember this is fictional world …“. |
| Extension, `CHAT_COMPLETION_PROMPT_READY` → `handlePromptInjection` | Füllt die Platzhalter direkt vor dem Senden mit Text aus `buildBaseDict()`. Der Text hängt ab von Engine (V10 Shura/Ukiyo), Schreibstil, Story-Config (Genre, Ära, POV, Tempo, Länge …) und Add-ons. Leert unbenutzte Platzhalter, fasst Leerzeilen zusammen, entfernt Bild-HTML. **Läuft auf jeder Chat-Completion-Anfrage**, auch auf fremden, etwa unserer Report-Nachforderung über `generateRaw`. |
| Extension, `generate_interceptor: megumin_memory_intercept` | Leert im Prompt Nachrichten, die schon zusammengefasst sind. Nur mit aktivem Memory; sonst bricht sie sofort ab. |
| Hintergrundaufgaben (eigene LLM-Aufrufe) | Memory-Zusammenfassungen (Blöcke zu 10–40 Nachrichten), NPC-Scan und -Updates, Story-Director, Bann-Listen-Generator, Bild-Prompts, NPC-Porträts; Regelgenerierung über `Megumin Engine.json` mit `[[order]]`. |
| Dynamische Einfügungen | NPC-Bank (sucht in den letzten 4 Nachrichten), Memory-Vault (TF-IDF oder Embeddings), Story-Plan, Würfel-Add-on (`[[dice_rolls]]`, zufällige W20). |
| 11 Regex-Skripte im Preset | 6 davon `promptOnly`, sie ändern also den ausgehenden Prompt: Sie entfernen `<think>…</think>`, `<Blocks>`, `<narration>`/`<dialogue>`-Tags, Bild-HTML sowie `<disclaimer>`, `<guifan>`, `<danmu>`. Die übrigen 5 ändern nur die Anzeige (Thinking-Box, Block-Karte). |
| Sampler (Preset) | temperature 0,9, top_p 0,95, Penalties 0, `squash_system_messages: true`, `new_chat_prompt: "[Start a new Chat]"`, `names_behavior: 0`, Continue-Prefill aus. |

**Was davon bei uns wirkt, belegt aus den Server-Logs:**

| Prüfung | Testrun 4 | Test 5, Lauf 1 | Test 5, Lauf 2 |
|---|---|---|---|
| verschiedene Fassungen des Megumin-Hauptprompts | 4 (NPC-Bank/Dossier-Liste, damals an) | **1** | **1** |
| verschiedene Fassungen des Thinking-Prompts | 2 | **1** | **1** |
| verschiedene Post-History-Zeilen | 1 | 1 | 1 |
| verschiedene Request-Parameter | 1 | 1 | 1 |
| Hintergrund-Anfragen im Log | keine | keine | keine |
| Artefakte in den Antworten (`<think>`, `<disclaimer>`, `<guifan>`, `<danmu>`, Tag-Echo) | 0 von 15 | 0 von 9 | 0 von 6 |

- Seit der Checkliste ist Megumins Beitrag reiner, gleichbleibender Text.
- Memory, NPC-Bank, Story-Director, Würfel und Bildgenerierung sind aus.
- Die Prompt-Regex hatten nichts zu tun, weil GLM das Reasoning im eigenen API-Feld liefert.
- `clear_thinking: true` in den Anfragen stammt weder aus Megumin noch aus SillyTavern 1.19. Er kommt vermutlich aus den zusätzlichen Parametern der API-Verbindung und ist vom Preset unabhängig.

## 2. Der Megumin-Text, den das Modell bekommt (Lauf 2, pro Anfrage)

| Abschnitt | Token | Inhalt | Verhältnis zum Avereth-Vertrag und zur Engine |
|---|---:|---|---|
| Einleitung | ≈ 100 | Erzählerrolle, Alaric gehört dem Spieler | **doppelt** (ROLE & PURPOSE, Player Agency, Thought Firewall) |
| `<Characters>` | ≈ 690 | jede Figur Protagonist ihrer Geschichte, moralische Gleichwertigkeit, Agenda, Druck, Kontinuität | Stil, wertvoll; „canon“ ist doppelt |
| `<ANTI-OMNISCIENCE>` | ≈ 230 | Wahrnehmung, Geheimnisse, Schlussfolgerung ist kein Wissen | **doppelt** (NPC Knowledge & Information Boundaries, Engine-Karten) |
| `<dialogue>` | ≈ 1.360 | Idiolekt, Register, Fluss, Emotion bricht Syntax, Subtext, Verbote (Pointen, Dreierlisten …) | Stil, der wertvollste Teil |
| `<narration>` | ≈ 545 | Erzählstimme, Konkretion, Sinne, Satzbau, Einstieg | Stil, wertvoll |
| `<story>` | ≈ 850 | Eigendynamik, Kausalität, ≥ 50 % der Szene anderen gehörend, Offscreen-Welt, **jede Antwort endet mit einem offenen Haken**, **Erzähler entscheidet Erfolg/Teilerfolg/Fehlschlag nach Plausibilität**, Saat vor Ereignis, **ruhende Fäden müssen nach 10 Zügen wiederkehren** | größtenteils **Konflikt** (siehe unten), Rest doppelt |
| `<world>` | ≈ 430 | Kanon, Ära, Physik, Persistenz, Hintergrundleben, **„anyone who speaks or acts MUST be named“** | größtenteils doppelt, ein Punkt Konflikt |
| `<content>` | ≈ 300 | Einstufung M, kein Moralisieren, Einwilligung in der Fiktion, nur Erwachsene | **fehlt im Vertrag**, muss ersetzt werden |
| `<banlist>` | ≈ 400 | verbotene Konstruktionen und Wörter, Echo-Regeln | Stil, wertvoll |
| Thinking-Prompt (Tiefe 1) | ≈ 860 | 7 „last breath“-Punkte, Rotation des Einstiegs, `<config>` (Genre, Kultur, Ära, POV, Tempo, Länge ≤ 700 Wörter), Report-Nachtrag, final reminder, Sprache | Stil und Config; `<config>` erklärt sich zum Sieger über alles davor |
| Hüllen, „[Start a new Chat]“, Post-History | ≈ 60 | `<character_sheet>`, `<user_persona>`, `<history>` … `</history>` | Struktur (Engine-Block steht **innerhalb** von `<history>`) |
| **Summe** | **≈ 5,8k** | ≈ 45 % des Prompts (12,7k) | |

**Die Widersprüche zum Engine-Design.** Sie stehen nicht in REVIEW_V3 §4.3; dort sind nur Doppelungen erfasst.
1. **Wer entscheidet über Erfolg und Misserfolg?**
   - Megumin: „Adjudicate by opposition, plausibility … render success, partial success (success at a cost), or failure“.
   - Vertrag: „Never roll, invent or change a mechanical value“. Unsichere Aktionen laufen über den CHECK DIE der Engine.
   - Megumin gibt dem Erzähler genau die Autorität, die die Engine hat.
2. **Plot-Motor gegen Sandbox.**
   - Megumin verlangt:
     - einen offenen Haken am Ende jeder Antwort;
     - geplante Saaten;
     - Pflicht-Wiederkehr ruhender Fäden;
     - „inaction MUST generate consequence equal to action“.
   - Der Vertrag verlangt:
     - „Do not manufacture a person, rumor, accident, clue …“;
     - „Unresolved threads are not player intent“;
     - „Do not bring them back merely because they are on record“;
     - FINAL SANDBOX CHECK #7.
3. **Jeder Sprecher bekommt einen Namen.**
   - Megumin fordert Namen für jede sprechende Figur.
   - Der Vertrag sagt: „Blank space stays blank until play establishes it“.
   - Im Lauf 2 entstanden so beiläufig „Marda“, „Renn“, „Dorn“, „Harl“ und „Bristle“.
4. **Vorrang-Anspruch.** `<config>` behauptet „Where a setting here contradicts anything above, this block wins“, und davor steht auch der Vertrag.
5. **Struktur.** Der Engine-Block steht vor `</history>`, also formal im Verlauf. Im ersten Test-5-Lauf erklärte der Erzähler den Engine-Block einmal für „stale“. Die Hauptursache war dort der veraltete Zustand, die Hülle ist nur eine mögliche Mitursache.

**Einordnung:** Messbar geschadet haben diese Widersprüche in den Läufen bisher nicht. Die Fehler dort waren fehlende Reports und Auflösungsfehler. Die Widersprüche sind Textbefunde und damit Hypothesen für den A/B-Test.

## 3. Machbarkeit: reicht Text?

**Ja.** Das Modell sieht nur die Anfrage, also Nachrichten und Parameter. Dazu kommen Nebenwirkungen auf Antworten und Anzeige. Jeder Megumin-Beitrag lässt sich einer dieser Kategorien zuordnen:

| Megumin-Beitrag | Ersatz ohne Megumin |
|---|---|
| Platzhalter-Text (Hauptprompt, Thinking, Config, Bann-Liste) | Text direkt im eigenen Preset. Bei festen Einstellungen ist das Ergebnis identisch. |
| Sampler und ST-Preset-Einstellungen | dieselben Werte im eigenen Preset (Abschnitt 6) |
| NPC-Bank, Memory, Story-Plan | schon ersetzt: Engine-Karten, RELEVANT, Verlaufsfenster, Fakten |
| Trackers (`<Blocks>`) | schon ersetzt: Engine-HUD |
| Würfel-Add-on | schon ersetzt: Engine-Würfel (CHECK DIE, Kampf) |
| Prompt-Regex (`<think>`, Artefakte) | SillyTavern-eigenes Reasoning-Parsing (Auto-Parse) für Modelle mit Inline-`<think>`; die zwei Avereth-Regex-Skripte bleiben. In unseren Logs kam kein Artefakt vor. |
| Bildgenerierung (ComfyUI), Regelgenerator, UI für Story-Config | ungenutzt; Config wird Text |
| Updates des Megumin-Autors | entfallen. Sie mussten ohnehin nach jeder Version per Checkliste nachgearbeitet werden. |

**Was sich nicht in Text gießen lässt:** nichts, was wir heute nutzen. Die einzige echte Laufzeitlogik mit Wirkung auf den Prompt wären Memory, NPC-Bank, Story-Plan und Würfel, und die sind aus. Der Rest ist Komfort oder Absicherung.

**Nebenwirkung, wenn die Extension installiert bleibt:** Ihr `PROMPT_READY`-Handler läuft weiter über jede Anfrage, auch über unsere Report-Nachforderung. Das ist heute harmlos, weil darin keine `[[…]]`-Platzhalter vorkommen. Sauberer ist es, die Extension für das Avereth-Profil auszuschalten.

## 4. Direkter Vergleich

| | Megumin (heute, nach Checkliste) | Eigenes, schlankes Preset |
|---|---|---|
| Prompt-Anteil | ≈ 5,8k Token pro Anfrage | ≈ 0,8–1,5k Token (Entwurf unten ≈ 0,8k) |
| Input-Kosten | Basis | ≈ 5k Token weniger, ≈ −39 % pro Anfrage |
| Geschwindigkeit | Basis | kaum schneller: Der feste Anteil liegt bei ≈ 2,4 s für den ganzen Prompt, 4–5k Token weniger sparen < 1 s. Der Hebel ist die Ausgabelänge (Megumin: „up to 700 words“), und die lässt sich in beiden Varianten einstellen. |
| Widersprüche zur Engine | Erfolgsentscheidung, Pflicht-Haken, Faden-Wiederkehr, Namenspflicht, Vorrang der Config | keine, weil für die Engine geschrieben |
| Doppelungen mit dem Vertrag | ≈ 45 % des Megumin-Texts | keine |
| Prosaqualität | erprobt: viele Versionen, Community | unbewiesen. Das ist das Hauptrisiko und der Grund für den A/B-Test. |
| Report-Treue | 5 von 15 im ersten Anlauf (Reasoning low) | Hypothese: besser, wenn die Report-Pflicht Teil des Schreibplans ist und der Pflicht-Haken am Ende wegfällt. Unbewiesen; die Nachforderung fängt es ohnehin auf. |
| Wartung | Checkliste nach jedem Megumin-Update, Zustand hängt an der UI | versioniert im Repo, im Live-Smoke testbar |
| Abhängigkeiten | Extension, Regex, Platzhalter-Mechanik, Handler auf allen Anfragen | keine |
| Rückweg | — | Preset wechseln, sofort |

## 5. Empfehlung und nächste Schritte

**Empfehlung:** Den Versuch machen, aber nicht als Kopie von Megumin, sondern als eigener Erzähl-Layer für Avereth, und erst nach einer Messung umstellen.

1. **Preset bauen.**
   - Ein ST-Chat-Completion-Preset `Avereth Narrator` mit dem Entwurf aus Abschnitt 6, in eigenen Worten.
   - Dieselben Sampler-Werte wie heute, damit nur der Text sich ändert.
   - Die Megumin-Extension im Testprofil aus.
2. **Offline-A/B, die sauberste Messung.**
   - Ein kleines Werkzeug nimmt die geloggten Anfragen eines Laufs, zum Beispiel die 15 aus Test 5. Es ersetzt nur den Megumin-Anteil durch den neuen Layer; Engine-Block, Verlauf und Eingabe bleiben gleich.
   - Beide Varianten gehen je zweimal an dieselbe API.
   - Verglichen wird:
     - Report im ersten Anlauf;
     - Output-Token und Dauer;
     - Verstöße: erfundene Ausgänge, fremde Handlungen für Alaric, Wissenslecks, erfundene Haken;
     - blinde Paarbewertung der Prosa (welche Antwort ist besser).
   - Nötig sind dafür der API-Zugang des Spielers und ein lokaler Lauf.
3. **Live-Lauf** mit dem Gewinner, im frischen Chat nach dem Test-5-Plan. Auswertung mit `run_report.mjs`.

**Umstellen, wenn:**
- die Report-Treue nicht schlechter ist;
- nicht mehr Verstöße gegen die Engine vorkommen;
- die Prosa in der Blindbewertung mindestens gleichauf liegt;
- die Output-Länge nicht steigt.

Sonst bleibt Megumin, und nur die Widersprüche aus Abschnitt 2 werden per Checkliste entschärft.

## 6. Entwurf: eigener Erzähl-Layer (v0, ungetestet)

> **Überholt.** Der fertige Layer, das Preset und der A/B/C-Vergleich stehen in [NARRATOR_AB.md](NARRATOR_AB.md). Was sich gegenüber diesem Entwurf geändert hat und warum, steht dort in §1.3. Unter anderem bleibt `squash_system_messages` aus, und der Denkschritt „BEFORE YOU WRITE“ entfällt.

**Prompt-Reihenfolge** (ST Prompt Manager):

| # | Eintrag | Rolle | Inhalt |
|---|---|---|---|
| 1 | Main Prompt | system | `AVERETH NARRATOR — CRAFT` (unten), ≈ 0,8k Token |
| 2 | World Info (before), Char Description, World Info (after) | system | Lorebook und Vertrag 3.3, unverändert |
| 3 | Persona Description | system | Alaric |
| 4 | Chat History | — | Verlaufsfenster der Engine; **ohne** `<history>`-Hülle |
| 5 | (Engine-Injektion, Tiefe 0) | system | Engine-Block, wie heute |
| 6 | Post-History Instructions | system | `BEFORE YOU WRITE / AFTER THE STORY TEXT` (unten), ≈ 80 Token |

**Einstellungen:**
- Sampler wie bisher: temperature 0,9, top_p 0,95, Penalties 0, Max Response 4.096, Reasoning low;
- `squash_system_messages` an, Namen „None“, Continue-Prefill aus;
- `new_chat_prompt` leer oder „[Start a new Chat]“;
- Regex: die zwei Avereth-Skripte;
- ST-Reasoning-Parsing (Auto-Parse) nur für Modelle, die `<think>` in den Text schreiben.

**Überschriften statt XML-Tags:** Der Entwurf benutzt einfache Überschriften. Tags wie `<dialogue>` können Modelle in die Antwort übernehmen; Megumin braucht dafür ein eigenes Regex.

**Main Prompt:**

```
AVERETH NARRATOR — CRAFT
You write the world of Avereth for one player, whose character is Alaric. The Narrator Contract below governs agency, knowledge and continuity. The [AVERETH ENGINE] block at the end of the conversation is binding for every number, position, outcome and for what each person knows. This section only sets how you write.

PROSE
- Third person, past tense. The narration may lean into the viewpoint of whoever the scene follows, never into Alaric's mind.
- Give the narration a temperature that fits the moment and let it shift with the moment. Show, and let the reader draw the conclusion.
- Show inner states through action, sensation and detail; name a feeling only when nothing else works.
- Prefer the particular to the generic: this knife, that smell of tar. One precise detail instead of three adjectives. Every scene carries at least one sense besides sight.
- Vary sentence length and how sentences begin.
- Background enters through the scene (a remark, an object, a habit), never as a summary or a lecture.
- Begin with how the world answers Alaric's action; do not retell his action. Vary the first beat from reply to reply: a voice, a movement, a sound, a line of place.
- Match the length to the moment: a quick exchange stays short (about 80–150 words); arrivals, discoveries and turning points may run to about 350.
- Stop where the moment rests or where something is still open. Never ask the player what Alaric does and never list options.

PEOPLE
- Everyone lives their own day: they want things, have their reasons and believe they are in the right. Nobody exists to serve Alaric's story or defers to him because he is the player.
- People differ in how they talk and act; age, trade, origin and temper shape their words. Once a person's manner is shown, keep it.
- Feelings change slowly. Old slights, debts and grief stay in the room.
- People seldom explain their motives. Asked directly, they dodge, shorten or refuse.
- Passers-by may stay nameless ("the gate guard"). Give a name when someone matters or introduces themselves.

DIALOGUE
- Speech sounds spoken: uneven lines, breaks, corrections, interruptions, the words that person would really use.
- No speeches, maxims, punchlines or polished one-liners, unless that person is known for them. Imagery and wit belong to the narration; characters speak plainly, each in their own way.
- Strong feeling breaks the syntax; calm competence speaks cleanly.
- Put a small physical beat into any longer speech.

AVOID
- "not X, but Y" constructions; feeling-verbs (felt, realized, knew, sensed) as a shortcut; worn phrases such as "a breath he didn't know he was holding", "silence stretched", "the air was heavy", "something inside him broke", "as if afraid that".
- Echoing the player's words; reusing a gesture or descriptor from the previous two replies.

CONTENT
- Mature fantasy: violence, wounds and death are shown plainly, without disclaimers or moralizing. Intimacy only between adults and only where the story leads there; nothing gratuitous.
- Failed or impossible attempts are answered inside the fiction, exactly as the engine resolved them.

SETTING
High fantasy, European medieval material culture with mana and high magic. Third person, past tense. English.
```

**Post-History Instructions:**

```
BEFORE YOU WRITE: What did the engine resolve? (narrate exactly that) Who is present, and what may each of them know? Which new facts will this reply establish?
AFTER THE STORY TEXT: the <avereth>{…}</avereth> fact report with those facts, {} if none. Nothing after it.
```

**Absichtlich nicht übernommen:**
- dass der Erzähler über Erfolg entscheidet;
- der Pflicht-Haken am Ende;
- die Pflicht-Wiederkehr ruhender Fäden;
- die 50-%-Quote für fremde Handlungsanteile;
- die Namenspflicht für jede Figur;
- der Vorrang-Anspruch der Config;
- alles, was der Vertrag schon regelt (Agency, Wissen, Kanon, Persistenz).

**Bewusst offen:**
- Die Wortliste der Bann-Liste übernimmt besser die Einstellung „Word replacements“ der Engine. Ein Bann im Prompt nennt das Wort und macht es eher wahrscheinlicher (README).
- Die Längenwerte sind Startwerte für den A/B-Test.

## 7. Lizenz

- Das README von Megumin Suite nennt **CC BY-NC-ND 4.0** (keine Bearbeitungen weitergeben). Die Datei `License` im Repo nennt dagegen **CC BY-NC 4.0** (Bearbeiten erlaubt, mit Namensnennung, nicht kommerziell). Die Angaben widersprechen sich.
- **Unser Repo ist öffentlich.** Bearbeiteter Megumin-Text im Repo wäre eine weitergegebene Bearbeitung. Nach der strengeren Lesart (ND) ist das nicht erlaubt.
- Deshalb gilt:
  - Der eigene Layer entsteht in eigenen Worten, wie der Entwurf oben. Übernommen werden Handwerksprinzipien, nicht Formulierungen.
  - Lokale, private Anpassungen am eigenen Megumin-Preset, etwa die Checkliste in RUNTIME_V3 §9, sind nach beiden Lesarten in Ordnung.
