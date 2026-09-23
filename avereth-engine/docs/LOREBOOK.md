# Welt-Lore als SillyTavern-Lorebook (v0.11)

**Ausgangspunkt:** ChatGPTs Architekturvorschlag v0.10b (66 World-Info-Einträge und ein Handoff mit 7 Architekturfragen). Er wurde als externe Review behandelt und gegen drei Quellen geprüft:
- den Engine-Code;
- den SillyTavern-Quellcode (Release-Branch, `world-info.js`, `script.js`, `openai.js`);
- die echten Testruns 2 und 3.

**Ergebnis:** Die vorgeschlagene Aufteilung ist besser als der bisherige Stand und ist umgesetzt. Das Lorebook selbst hatte messbare Trigger-Fehler; sie sind in **v0.11** behoben (`lorebook/Avereth_World_Lore_v0.11.json`).

## Autoritäts-Aufteilung

| Ebene | besitzt |
|---|---|
| **Engine** (`content/`, `src/`) | Mechanik, Zustand, Würfe, NPC-Wissen, Quests, Coin, XP. Dazu der **strukturelle Welt-Index** in `lore.json`: Orte und Realms mit ID, Name, Art und Realm-Zuordnung. Ihn braucht der Code: Startort, Reisen, Namensauflösung, Header, Validierung. |
| **Lorebook** (Character Lore der Erzähler-Karte) | beschreibende Welt: Grundlagen, Realms, Städte, Gesellschaft, Rang-Systeme der Gilde. Dazu Generierungsgerüste für Quests, Siedlungen, NPCs, Monster, Dungeons und Klassen-Evolutionen. Es ist **Erzählerwissen**, kein NPC-Wissen. |
| **Erzähler / Megumin** | konkrete Prosa und lokale Erfindung innerhalb dieser Grenzen |

Der Erzählervertrag und der Engine-Block gehen dem Lorebook vor. Eintrag „CORE — Canon“ sagt das in jedem Zug.

## Was die Engine dafür tut

**Keine doppelte Lore.** Ist an der Erzähler-Karte ein Lorebook verknüpft (SillyTavern speichert es in `data.extensions.world`), lässt die Engine ihre eigene LORE-Sektion weg. Einstellung „World lore“: `Auto` (Standard), `Card lorebook` oder `Engine`. Die Statuszeile zeigt die aktive Quelle. Die 19 Engine-Texte (Lore v0.8) bleiben als Rückfall für Setups ohne Lorebook erhalten.

**Lore-Bridge (0 Token).** Vor jeder Generierung setzt die Extension einen zweiten Extension-Prompt:
- Inhalt: nur der Name des aktuellen Realms und der aktuellen Stadt, etwa `Duskreach` und `Ashbridge`;
- Position `NONE` (−1): SillyTavern fügt ihn **nie** in den Prompt ein;
- `scan = true`: World Info durchsucht ihn trotzdem (`checkWorldInfo` → `buffer.addInject`).

Belege aus dem Quellcode: `getExtensionPromptByName` liefert den Text unabhängig von der Position, und `openai.js` fügt nur IN_CHAT, BEFORE_PROMPT und IN_PROMPT ein. Die Interceptors laufen vor dem World-Info-Scan; die Schlüssel sind also aktuell. Realm und Stadt sind damit in jedem Zug aktiv, auch wenn keine Tracker-Box den Ort nennt (in Testrun 3 fehlten die Boxen in 5 von 14 Antworten). Themen-Schlüssel kommen weiter aus Spielernachricht und Erzählung. Die Bridge schickt keinen Engine-Zustand, weil Wörter wie Rank, Quest oder Coin sonst dauernd Einträge auslösen würden.

**Quest-XP und Quest Rank** (der „kritische Konflikt“ des Handoffs): gewählt ist Option B mit Rang-Prüfung.
- Core #25 bleibt unverändert (Quest-XP = Recommended Level × 10 × Typ).
- Das Level ist die **versteckte XP-Basis** im Fakten-Report. Es erscheint nie in der Geschichte, auf Aushängen oder in NPC-Sätzen.
- Gilden-Aufträge tragen zusätzlich `rank` (Novice … Legend). Die Engine speichert und zeigt ihn (`QUEST OFFERED — … (Novice · Hesta)`, `#quests`).
- Die Engine prüft, dass das Level im Band des Rangs liegt: Novice = Power Rank F = Level 1–14 … Legend = S = 90+. Beispiel: „Novice“ mit Level 20 wird mit Korrektur abgelehnt.
- Ein aus dem Rang abgeleitetes Level (Option A) wäre zu grob: Ein Novice-Rattenjob und ein Novice-Banditenlager lägen gleich. Eine XP-Neuberechnung nach Rang (Option C) wäre eine Core-Änderung.

Der Engine-Block sagt jetzt „Power Rank F“ statt „Rank F“. Das ist dasselbe Vokabular wie im Lorebook.

## Die 7 Architekturfragen

| Frage | Antwort |
|---|---|
| 1. Welche `lore.json`-Felder braucht die Laufzeit? | `locations` (id, name, kind, realm) und `factions` (id, name, kind). Die beschreibenden `entries` nutzt nur `pickLore()`. |
| 2. Welche Prosa kann ins Lorebook? | Alle beschreibende Lore. Die Setting-Zeile im Engine-Header bleibt; sie ist eine Zeile und die Basis ohne Lorebook. |
| 3. `pickLore()` reduzieren? | Ja: automatisch aus, sobald ein Lorebook verknüpft ist. |
| 4. Braucht es die Bridge? | Ja, Realm und Stadt, nichts weiter (siehe oben). |
| 5. Welches Budget passt? | Budget Cap **1.800 Token**, Scan Depth **2**. Gemessen: 616–1.710 Token, im Schnitt 861 (siehe unten). Bei Prompts von 15–23k Token sind das etwa 4–9 %. Die Engine spart dabei ihre LORE-Sektion (115–245 Token). |
| 6. Feuern Schlüssel auf Tracker-Text? | Ja, im Vorschlag massiv (siehe unten). In v0.11 behoben. |
| 7. Beansprucht ein Eintrag veränderlichen Engine-Zustand? | Nein. Der alte Architekturhinweis zur Quest-XP ist durch die Lösung oben ersetzt. |

## Trigger-Audit: v0.10b gegen v0.11

`tools/lorebook_audit.mjs` spielt die Fixtures der Testruns 2 und 3 durch die Engine. Der Chat enthält dann genau das, was SillyTavern scannt: Nachrichten und Antworten samt Megumin-Boxen, ohne Reports. Vor jeder Generierung läuft SillyTavern-Aktivierung (`tools/wi_sim.mjs`, nachgebaut aus dem Quellcode):
- Wortgrenzen bei Ein-Wort-Schlüsseln, Teilstring bei Mehrwort-Schlüsseln;
- Sortierung nach Order;
- Rekursions-Flags;
- hartes Budget: der erste Überlauf beendet die Liste.

| | v0.10b wie vorgeschlagen (Tiefe 4, Rekursion an, ohne Bridge) | v0.11 (Tiefe 2, ohne Rekursion, Bridge) |
|---|---|---|
| Token pro Generierung | 668–1.729, Ø 1.289 | 616–1.710, Ø 861 |
| 1.000-Token-Gildeneintrag | feuerte im **Wald** (Testrun 2: „until **proven** otherwise“) und im Rattenkampf („**Master** tanner“ in einem Megumin-Dossier) | ersetzt durch drei kurze Einträge, nur auf Gilden-Phrasen |
| Quest-Gerüste am Aushang (Testrun 3, Zug 8) | vom Budget **abgeschnitten**, weil der Gildeneintrag es verbrauchte | beide aktiv (Complete quest body, Causal rule) |
| Währung / Rang | feuerten in 16 von 25 Zügen, meist per Rekursion aus den Stadt-Einträgen („trade“, „S-rank“ im Text) | 2 Züge |

## Bestätigung im echten Lauf (Testrun 4)

Der erste Lauf mit dem Lorebook ([TESTRUN_V4.md](TESTRUN_V4.md)):
- **Nachbau stimmt:** In 14 von 15 Zügen standen genau die Einträge im Prompt, die `tools/wi_sim.mjs` aus dem Chat berechnet. Einmal passte beim echten Tokenizer ein Eintrag mehr ins Budget.
- **Bridge:** Realm Ilyrion und Lumenford waren in jedem Zug aktiv, auch in den kurzen Kampfantworten ohne Tracker-Box.
- **Gilde:** Die Gildeneinträge waren nur in der Gilde aktiv. Am Aushang kamen Quest-Gerüste und Aushang-Eintrag dazu. GLM beschrieb fünf Aufträge des eigenen Rangs, ohne Level; die Engine prüfte die Rang-Bänder.
- **Realm-Flair:** Tempel, Pilger und Wächter passen zu Ilyrion.
- **Ein Leck, nicht aus dem Lorebook:** Das Vertragsbeispiel „I walk toward Ashbridge“ brachte GLM dazu, eine Stadt aus Duskreach zum Nachbarort zu machen. Das zog Realm Duskreach und Ashbridge in 9 von 16 Prompts (≈ 400 Token). Vertrag 3.2 nennt keine Stadt mehr.
- **Last:** im Schnitt etwa 960 Token World Info über alle drei Testruns (`node tools/lorebook_audit.mjs`), Höchstwert 1.714.

## Änderungen v0.10b → v0.11 (nur kritische)

1. **Gildeneintrag geteilt:**
   - „Adventurers' Guild and rank systems“: Institution, Power Rank ≠ Guild Rank, Entsprechung, Quest Rank; etwa 260 Token;
   - „Promotion and placement“: Beförderung, Einstufungsprüfung;
   - „Contract boards“: Aushänge.

   Die nackten Schlüssel Novice/Proven/Veteran/Elite/Master/Grandmaster/Legend sind entfernt. Die doppelte Kurzreferenz (uid 65) ist jetzt der Beförderungseintrag.
2. **Aushänge:** Die Mindestzahl von 5 Aufträgen pro Rang bleibt. Neu: Beim Lesen werden nur die Aufträge des eigenen Gilden-Rangs beschrieben, und gesehene Aushänge bleiben bis zu einem Grund stabil. Sonst listet GLM bis zu 35 Aufträge und läuft ins Antwortlimit.
3. **Schlüssel ohne Allerweltswörter:** `trade` und `market` (Währung), `death` (Tod/Auferstehung) und `order` (Organisation) sind entfernt; neu sind `haggle`, `haggling` und `raise the dead`.
4. **Keine Rekursion:** Alle Einträge haben „Prevent further recursion“. Die Stadt-Einträge zogen sonst Währung und Rang nach; Realm und Stadt kommen über die Bridge.
5. **Konstanter Kanon-Eintrag gekürzt** von 1.121 auf 551 Zeichen, weil er in jedem Zug gesendet wird. Weggefallen ist nur, was der Erzählervertrag schon sagt (CANON & INVENTION, WORLD INDIFFERENCE).
6. **Quest-Einträge:** Der Architekturhinweis ist durch die versteckte-Level-Regel ersetzt. Die „Causal generation rule“ hat Order 284 statt 270, damit sie am Aushang vor allgemeinen Einträgen ins Budget kommt.

Alles andere ist unverändert übernommen: Inhalte, Realms, Stadt-Seeds, Generatoren, Klassen-Körper. Die Kanon-Zahlen sind gegen Core und Content geprüft und stimmen: Rang-Bänder, favorisierte Stats, Währung, Lebensspannen, S-Ränge je Realm.

## Einrichtung in SillyTavern

1. World Info → Import → `lorebook/Avereth_World_Lore_v0.11.json`.
2. Charakterkarte → Globus-Symbol → das Lorebook als **Character Lore** verknüpfen, also nicht global aktivieren.
3. World-Info-Einstellungen:

   | Einstellung | Wert |
   |---|---|
   | Scan Depth | 2 |
   | Budget Cap | 1.800 Token |
   | Context % | unkritisch, weil der Cap greift |
   | Recursive Scan | aus |
   | Match whole words | an |
   | Case-sensitive | aus |
   | Alert on overflow | im Test an |
   | Vektor-Suche | aus |

4. Avereth-Einstellung „World lore“ auf `Auto` lassen. Die Statuszeile zeigt dann `lore: World Info (Avereth World Lore v0.11)`.

## Nach Änderungen am Lorebook

`node tools/lorebook_audit.mjs [budget] [depth]` zeigt je Zug, welche Einträge feuern (mit auslösendem Schlüssel) und was das Budget abschneidet. `tests/unit/lorebook.test.js` prüft vier Dinge:
- keine Rekursion;
- Namen passend zur Bridge;
- keine Allerweltsschlüssel;
- Realm und Stadt in jedem echten Zug, keine Gildenregeln im Wald, Quest-Gerüste am Aushang.

## Bewusst offen

- **Aushang als Engine-Zustand** (Zweig + Tag + Aufträge): Erst bauen, wenn der Test zeigt, dass GLM gesehene Aushänge neu würfelt. Bis dahin hält der Chatverlauf die Konsistenz, und der Eintrag verlangt sie ausdrücklich.
- **Gilden-Rang als Zustand und Beförderungsprüfung:** Novice → Proven braucht E-Rang (Level 15). Das ist für die nächsten Tests irrelevant; eine Prüfung (Power-Rang-Minimum) wäre dann klein.
- **Themen-Schlüssel in der Bridge:** erst, wenn Einträge nachweislich fehlen.
