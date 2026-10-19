# Welt-Lore als SillyTavern-Lorebook (v0.14)

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

**Keine doppelte Lore.** Ist an der Erzähler-Karte ein Lorebook verknüpft (SillyTavern speichert es in `data.extensions.world`), lässt die Engine ihre eigene LORE-Sektion weg. Einstellung „World lore“: `Auto` (Standard), `Card lorebook` oder `Engine`. Die Statuszeile zeigt die aktive Quelle. Die 17 Engine-Texte (Lore v0.8, in v0.14 an die kleinere Welt angepasst) bleiben als Rückfall für Setups ohne Lorebook erhalten.

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

## Änderungen v0.11 → v0.12 (Gildenverträge, Live-Lauf 27.09.2026 04:11)

Nur drei Einträge ändern ihren Text, Schlüssel und Einstellungen bleiben gleich:

1. **„Adventurers' Guild and rank systems“ (uid 34)** bekommt den Abschnitt `GUILD CONTRACTS [CANON]`:
   - Ein Gildenvertrag wird an der Gilde ausgehängt, angenommen und abgeschlossen. Der Auftraggeber hinterlegt die Belohnung bei der Gilde und muss selbst nicht vorkommen.
   - Die Arbeit findet draußen statt. Auftraggeber, Zeugen und örtliche Obrigkeit geben Auskunft, gewähren Zugang, prüfen Trophäen und stellen Nachweise aus (Unterschrift, Siegel, Quittung).
   - Eine örtliche Bestätigung ist Beweis, kein Abschluss: Außerhalb der Gilde schließt niemand einen Gildenvertrag ab oder zahlt seine Belohnung.
   - Alaric gibt den Vertrag selbst ab, mit Beweis, am Schalter jeder Gildenstelle; jede menschliche Stadt und Hauptstadt hat eine. Der Schalter prüft den Beweis, schließt ab und zahlt die ausgeschriebene Belohnung; erst dann zählt der Auftrag für die Beförderung. Die Stadt zu erreichen oder die Arbeit zu beenden, gibt nichts ab.
   - Auszahlung: Ein Vertrag hat eine feste, sichere Gilden-Auszahlung („6 silver“). Was variabel ist, pro Stück oder nach Ermessen, ist ein eigener Bonus des Auftraggebers („Guild payout: 6 silver. Client bonus: +1 silver per intact pelt.“).
   - Registrierung und andere Verfahren der Gilde sind keine Verträge. Private Arbeit ohne Gilde wird direkt beglichen und bringt keine Gilden-Anrechnung.
2. **„Complete quest body“ (uid 29):** Für Gildenverträge nennen der Beweis den Schalter und die Quelle der Belohnung die hinterlegte feste Auszahlung; Anteile pro Stück sind ein eigener Bonus.
3. **„Quest rewards“ (uid 31):** Die ausgeschriebene Belohnung eines Gildenvertrags ist eine feste Gilden-Auszahlung. Die Gilde zahlt sie bei der Abgabe, nie der Auftraggeber draußen. Was variabel ist und was ein Auftraggeber zusätzlich gibt (eine Mahlzeit, ein Bonus), gehört ihm und nicht zum Vertrag.

Die Engine setzt dieselbe Regel mechanisch durch: `docs/TESTRUN_V11.md`, `content/rules.json` (`guild`).

## Änderungen v0.12 → v0.13 (Runtime V4, Engine 4.0)

Fünf Einträge bekommen je einen Satz; Schlüssel, Einstellungen und alles andere bleiben gleich. Jeder Satz gilt für V3- und V4-Kampagnen, denn beide lesen dasselbe Lorebook (`docs/RUNTIME_V4_PLAN.md` §15, Rev. 3):

1. **„Complete quest body“ (uid 29):** Die ENGINE NOTE sagte „The <avereth> fact report still carries the Quest's hidden level …“. In V4 schreibt der Erzähler nur Prosa; der Satz forderte dort einen Block, den die Engine wieder entfernen müsste. Neu: Die Engine führt Level und Typ; Aushänge, die die Engine zeigt, tragen sie schon; ein Report oder Tag nur, wenn der Engine-Block einen verlangt (V3: ja, V4: nein).
2. **„Adventurers' Guild and rank systems“ (uid 34):** Die Registrierung kostet an jeder Filiale die einmalige Standardgebühr von 2 Silber (Canon D7, `rules.guild.registration_fee_cp` = 20).
3. **„Contract boards“ (uid 66):** Zeigt der Engine-Block ein Brett, beschreibt der Erzähler genau dessen Aushänge und erfindet keinen weiteren offiziellen Vertrag (V4: *canonical first*, D3).
4. **„Causal generation rule“ (uid 25):** dasselbe am Absatz über die Mindestzahl je Rang, damit sie nicht als Auftrag zum Auffüllen gelesen wird.
5. **„Promotion and placement“ (uid 65):** Nennt der Engine-Block Eignung oder Beförderung, gilt das; die Geschichte befördert nie von sich aus.

## Änderungen v0.13 → v0.14 (kleinere Welt, Build 4.3.0-c.6.6.8)

**Ziel:**
- eine kompaktere Welt mit fünf Großmächten;
- Spiel über Land statt Seefahrt;
- Dungeons als persistente Orte der Welt;
- weniger Lore-Overhead.

Lorebook, `content/lore.json` und `content/campaign_start.json` ändern sich, keine Mechanik. Belegt durch den Replay-Vergleich unten.

### Welt

| | v0.13 | v0.14 |
|---|---|---|
| Großmächte | 6 menschliche Königreiche, 2 Monsterreiche | menschlich: **Valedorn Crown**, **Caelreth**, **Duskreach**; Monsterreiche: **Ashen Scale Dominion**, **Verdant Fang Court** |
| Startstädte (`start_locations`) | Alderwatch, Glassmere, Redmarch, Tidecross, Lumenford, Ashbridge | **Alderwatch** (Valedorn), **Glassmere** (Caelreth), **Ashbridge** (Duskreach) |
| Hauptstädte und Sitze | 6 Hauptstädte, 2 Sitze | Crownheart, Asterhall, Blackgate; Cinder Throne, Thornheart |
| Meer | Solmere als Seehandelsmacht, Häfen in Generatoren | keine Seemacht; Küsten nur am fernen Rand, Seereisen nur wo eine Küste etabliert ist |

**Entfernt:**
- Veyrhold mit Redmarch und Ironward;
- Solmere mit Tidecross und Goldharbor;
- Ilyrion mit Lumenford und Sanctum Vale.

Ihre Aufgaben sind verteilt:
- **Veyrhold** (Militärmacht, Festungen):
  - an Duskreach: Grenzland mit Garnisonen, Söldnerkompanien, Monsterjagd, Befestigungen und Gildenverträgen;
  - an Valedorn: „old military institutions“.
- **Solmere** (Handelshäuser, Söldnerverträge):
  - an Valedorn: Handel, Handelshäuser, Karawanen und Flusshandel;
  - an Duskreach: die Söldner;
  - der Seehandel entfällt.
- **Ilyrion** (Tempel, Heiler, Seelenrückkehr):
  - an Valedorn: Avereths bekannteste Tempel und Heilerorden, ohne Theokratie;
  - „Religion“ und „Death and resurrection“ verweisen jetzt auf Valedorns Tempel.

Weitere Festlegungen:
- **S-Ränge:** Die öffentlichen S-Ränge der entfernten Reiche gehen an keinen anderen Staat über (Valedorn 3, Caelreth 2, Duskreach keiner, Ashen Scale 3, Verdant Fang 2, wie bisher).
- **Kleinere Mächte:** Der konstante Kern sagt jetzt: *Minor lordships, free towns and independent high-rank actors exist between them.*
- **Nachbarschaft:**
  - Duskreach grenzt im Osten an die Ashen Scale Dominion; Zwischenfälle bleiben unterhalb eines Krieges.
  - Caelreth grenzt im Westen an den Verdant Fang Court.
  - Valedorn liegt zentral und ist Duskreachs wichtigster Verbündeter.
- **Entfernungen:** Nachbarorte liegen einen bis wenige Tage auseinander, ein Königreich zu durchqueren dauert Wochen, ein anderes Reich zu erreichen ist eine echte Reise.

Weniger See an fünf Stellen:
- „Geography and distance“: *a coast only where established*; Meere, Inseln und Länder jenseits von Avereth erst, wenn Alaric sie sucht.
- „Material culture“: Reisen über Land, mit Flussboot oder Fähre.
- „Settlement body“: Flussübergang statt Hafen.
- „Travel and route body“: *overland by default*, Furten und Fähren.
- Konstanter Kern: *coasts only at its far edges; play is overland*.

### Dungeons

„WORLD — Dungeons“ (bisher „Natural Dungeons“) ist neuer Kanon; `lore.dungeons` in `lore.json` sagt dasselbe:

> Dungeons are physical, persistent places in Avereth, arising from concentrated mana, natural phenomena, ancient civilizations or other traceable causes. They can hold unusual environments, rare materials, Skill Stones and exceptional Monsters, and can be known, owned, disputed, exploited, sealed or partly mapped.
>
> Some have a recognizable, magically structured progression: successive levels with their own Monster populations, level guardians and bosses, danger rising with depth, valuable materials and special loot. There, Monsters and resources can return over time, access can be restricted or limited in numbers, other adventurers enter on their own, and rare return stones can carry a bearer back out. Such Dungeons are shared world places, never private instances for Alaric.
>
> Ordinary caves, catacombs, ruins and tunnels stay explorable places without levels, bosses or regeneration unless play establishes a real Dungeon there. Exact rules, timings, capacities and rewards stay open; the Engine owns them once it tracks a Dungeon, so invent no fixed timers, capacities or System notices.

**„GENERATOR — Dungeon body“** hat diese Schichten:
- ORIGIN;
- ECOLOGY;
- STRUCTURE: Ein strukturierter Dungeon hat aufeinanderfolgende Level; den Weg nach unten (Treppe, Schacht, Tor) findet man, indem man ihn erreicht, nicht durch ein Labyrinth.
- VALUE;
- CLAIMS: wer kartiert, erntet, bewacht, besitzt, lizenziert, begrenzt oder bestreitet, und wer sonst drin ist;
- CHANGE: geräumte Level füllen sich wieder, Spuren einer anderen Gruppe, verschobene Population, geschlossener oder überfüllter Eingang.

Die Schwierigkeit hängt an der Tiefe, nicht an Alarics Level. Eine gewöhnliche Höhle bleibt eine Höhle. Es gibt keine Engine-Mechanik dafür; Timer, Kapazitäten und Systemmeldungen erfindet der Erzähler nicht.

### Konsolidierung: 67 → 50 Einträge

| v0.14 | aus v0.13 (uid) |
|---|---|
| CORE — Avereth world identity (konstant) | 0 + 50 Great-power map (die Karte steht jetzt in drei Sätzen im Kern; ihre Schlüssel entfallen) |
| WORLD — Geography and distance | 2 Geography generation scaffold + 3 Beyond the known continent |
| POWER — Lifespan, social weight, high-rank deterrence | 13 + 24 |
| POWER — Skills, learning, access | 21 + 22 |
| QUEST — Generation: cause, body, friction | 25 Causal generation rule + 29 Complete quest body |
| QUEST — Motive, strategy, steps | 26 Motivation + 27 Strategy + 28 Action grammar |
| QUEST — Complications, branches, consequences | 32 + 33 |
| QUEST — Private work and rewards | 35 Non-Guild work + 31 Rewards |
| GUILD — Contract boards and Quest Ranks | 66 Contract boards + 30 Guild Quest Rank calibration |
| GENERATOR — Rumors, knowledge, provenance | 45 + 49 |
| entfernt | 53–55 (Realms Veyrhold, Solmere, Ilyrion), 61–63 (Seeds Redmarch, Tidecross, Lumenford) |

Gekürzt:
- „Adventurers' Guild and rank systems“ von 2.687 auf 2.178 Zeichen; alle Regeln (Verträge, Abgabe, Auszahlung, Gebühr, Ränge) bleiben.
- Die zusammengelegten Quest-Einträge verlieren Doppelungen, nicht Regeln: Mindestzahl je Rang, versteckte Level, *canonical first*, QUEST FRICTION, Gilden-Auszahlung.

Neu geschrieben:
- Valedorn, Caelreth, Duskreach;
- Ashen Scale (Nachbarschaft);
- Religion, Death, Material culture, Settlement, Travel;
- beide Dungeon-Einträge.

Im Ranger-Eintrag stand „Alaric's future Ranger Evolutions“. Jetzt heißt es allgemein „A Ranger's Evolutions derive from that character's real Skills …“.

Unverändert:
- Klassenrahmen und Evolution sowie die fünf Klassen-Körper;
- NPC, Monster-Ökologie, Arten, Monster-Gesellschaften, Organisation, Loot, Ereignisse, Konflikt;
- Rang, Domänen, Geschichte, Kultur, Recht, Währung, Mana;
- Beförderung, Verdant Fang Court und die drei Seeds.

**Order:**
- „Contract boards and Quest Ranks“ hat 286 und liegt damit vor „Generation“ (284). Bei vollem Budget am Brett bleiben Gilde und Brett-Regeln, und das Quest-Gerüst fällt (v0.13 schnitt umgekehrt das Brett).
- Die Gilde hat unverändert 290.

**Schlüssel:** 299 → 285.
- Neu sind zwei spezifische: `Dungeon level`, `return stone`.
- Entfernt:
  - die Namen der entfernten Reiche und Städte;
  - die Kartenschlüssel (`geopolitics`, `great powers`, `human kingdoms`, `monster realms`, `continental politics`, `full-divine politics`), da die Karte im konstanten Kern steht;
  - `high-rank deterrence`, weil `high-rank` es abdeckt.
- Schlüssel in mehreren Einträgen: 10 → 5. Gewollt sind die Stadtnamen in Realm und Seed sowie `quest board` und `job board` in Brett und Quest-Gerüst.

### Größe und Last

| | v0.13 | v0.14 |
|---|---|---|
| Einträge | 67 | 50 |
| Text | 51.747 Zeichen (≈ 12.000 Token) | 45.056 Zeichen (≈ 10.500 Token), −13 % |
| Datei | 135,8 kB | 109,5 kB |
| konstant, jeder Zug | 1.625 Zeichen (≈ 378 Token) | 1.554 Zeichen (≈ 361 Token) |
| `lore.json`-Rückfalltexte | 20 Texte, 13.742 Zeichen | 17 Texte, 13.485 Zeichen |

Aktivierte World-Info-Token je Generierung, nachgerechnet mit `tools/wi_sim.mjs` (Tiefe 2, Budget 1.800, Bridge an) über die echten Chats:

| Quelle | Züge | v0.13 | v0.14 | Budget-Schnitte |
|---|---|---|---|---|
| Live 18.10. Branch #3 (Ashbridge, Gilde, Kampf) | 54 | 536–1.689, Ø 946 | 543–1.709, Ø 915 | 15 → 9 |
| Live 16.10. (Ashbridge, Handel) | 41 | 536–1.689, Ø 1.000 | 543–1.709, Ø 967 | 12 → 7 |
| Lauf 18.10. 23:37 (Ashbridge → Wildnis → Dungeon) | 34 | 536–944, Ø 675 | 543–1.082, Ø 717 | 0 → 0 |
| Testruns 2–4 (V3-Fixtures) | 34 | 604–1.794, Ø 846 | 363–1.712, Ø 686 | 2 → 0 |
| **alle** | 163 | 536–1.794, Ø 882 | 363–1.712, Ø 839 | 29 → 16 |

Nach Szene:

| Szene | v0.13 | v0.14 | Einordnung |
|---|---|---|---|
| Gilde und Brett | Ø 1.282 | Ø 1.216 | leichter; Schnitte 27 → 16 |
| Kampf | Ø 648 | Ø 655 | etwa gleich |
| Stadt | Ø 602 | Ø 609 | etwa gleich |
| Wildnis | Ø 708 | Ø 718 | etwa gleich |
| Dungeon | Ø 675 | Ø 747 | schwerer: der neue Kanon (≈ +140 Token, wenn er feuert); Höchstwert 1.082, kein Schnitt |

Die Grundlast ist +7 Token: Der Kern ist kleiner, Duskreach etwas länger. In den Fixtures von Testrun 2 und 4 sinkt die Last nur, weil Solmere/Tidecross und Ilyrion/Lumenford keine Einträge mehr haben. Für Spiel in Ashbridge ist das keine Ersparnis.

**Replay-Vergleich** gegen c.6.6.7, mit `tools/c_flag_off_diff.mjs` und einer Nachprüfung je Schritt. In allen 122 Schritten der Live-Replays (`tests/v4/live_0930*.json`):
- Zustand und Record sind identisch, wenn man die Orte der alten Welt beiseitelässt (in den Tests stehen sie jetzt am Ende der Ortsliste).
- Die Engine-Blöcke unterscheiden sich nur in Zeilen der Rückfall-Lore.
- Kampf, Würfe, XP, Quests und Gilde sind unverändert.

### Keine Altwelt-Sonderfälle

Nach jedem Patch beginnt ein neuer Lauf. Deshalb gibt es keine Kompatibilität für Kampagnen aus der Welt vor v0.14:
- **`lore.json`:** Veyrhold, Solmere, Ilyrion und ihre sechs Städte sind ganz entfernt, ebenso ihre Rückfall-Lore.
- **Ortsbaum:** Eine neue V4-Kampagne bekommt die fünf Großmächte: 20 Orte, darunter 6 Gildenhallen (`seedPlaces` unverändert).
- **First Message der Karte:** Die Begrüßung v0.4 würfelt den Startort mit `{{pick::…}}` aus sechs Städten. Drei davon gibt es nicht mehr.
  - Nennt die Begrüßung eine entfernte Stadt, kennt die Engine sie nicht und startet in Alderwatch, Glassmere oder Ashbridge (nach Seed). Die Begrüßung spräche dann von einer anderen Stadt als der Spielstand.
  - Deshalb die Ortszeile ersetzen (Einrichtung, Schritt 5).
- **Tests:** Die Regressionstests spielen aufgezeichnete Läufe ab, die in Tidecross, Redmarch und Lumenford stattfanden. Diese Städte liegen deshalb als reine Testdaten in `tests/legacy_world.json`:
  - `tests/helpers.js` (`loadContent`) und `tools/lorebook_audit.mjs` laden sie zusätzlich;
  - die Extension kennt sie nicht;
  - `loadProductContent` liefert die Inhalte genau wie die Extension; der Lorebook-Test prüft damit die Welt von v0.14.

### Bekannt, nicht geändert: Prompt-Cache

Die Einträge stehen auf Position „Before Char Defs“ (0), also vor der Kartenbeschreibung mit dem Erzählervertrag, und wechseln von Zug zu Zug. Der Prompt-Cache eines Anbieters bricht deshalb schon an dieser Stelle ab. v0.14 senkt nur die Last. Die Einträge hinter den Vertrag zu legen, wäre ein eigener Umbau mit Messung.

## Einrichtung in SillyTavern

1. World Info → Import → `lorebook/Avereth_World_Lore_v0.14.json` (eine ältere Version vorher löschen).
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

4. Avereth-Einstellung „World lore“ auf `Auto` lassen. Die Statuszeile zeigt dann `lore: World Info (Avereth World Lore v0.14)`.
5. Ab v0.14 in der Begrüßung (First Message v0.4) die Ortszeile auf die drei Startstädte kürzen:

   ```
   `Location: Public roadside verge outside {{pick::Alderwatch, Valedorn Crown::Glassmere, Caelreth::Ashbridge, Duskreach}}`
   ```

   Die Änderung gilt für neue Chats.

## Nach Änderungen am Lorebook

`node tools/lorebook_audit.mjs [budget] [depth]` zeigt je Zug, welche Einträge feuern (mit auslösendem Schlüssel) und was das Budget abschneidet. `tests/unit/lorebook.test.js` prüft fünf Dinge:
- keine Rekursion;
- Namen passend zur Bridge;
- die Welt von v0.14 (Produktinhalte): fünf Großmächte, drei Startstädte, Ortsbaum einer neuen Kampagne, Dungeon-Kanon, höchstens 55 Einträge;
- keine Allerweltsschlüssel;
- Realm und Stadt in jedem echten Zug in Ashbridge, keine Gildenregeln im Wald, Quest-Gerüste am Aushang (Testruns 2–4, mit `tests/legacy_world.json`).

## Bewusst offen

- ~~**Aushang als Engine-Zustand**~~: in Runtime V4 (4.0) gebaut: Aushänge sind kanonische Quests der Engine, vom Board-Generator erzeugt, bevor sie gezeigt werden (`src/v4/guild.js`).
- ~~**Gilden-Rang als Zustand und Beförderungsprüfung**~~: in Runtime V4 gebaut: Mitgliedschaft, Rang und abgeleitete Eignung (fünf Verträge des Rangs, Power-Rang-Minimum) in `src/v4/guild.js`.
- **Themen-Schlüssel in der Bridge:** erst, wenn Einträge nachweislich fehlen.
