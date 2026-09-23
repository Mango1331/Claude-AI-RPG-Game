# WorldInfo und Prompt-Bausteine: kritische Bewertung

Bewertet wurden alle 61 Einträge der WorldInfo v1.23 (Paket v1.24, Datei `Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json`), die Character Description v2.3 und der Megumin-NPC-Patch v1.3. Maßstab sind die Evidenz aus Testrun-v1 (siehe [TESTRUN_V1.md](TESTRUN_V1.md)) und die Frage, was ein Sprachmodell pro Zug wirklich lesen muss.

**Kategorien**

| Kürzel | Bedeutung |
|---|---|
| **P** | permanent nötig (jeder Zug) |
| **S** | situativ nötig (nur wenn der **Zustand** es verlangt) |
| **R** | per Retrieval abrufbar (nur wenn relevant) |
| **D** | ableitbar: Die Engine berechnet es; das LLM braucht das Ergebnis, nicht die Prozedur |
| **X** | redundant |
| **N** | ohne Nachweis eines Nutzens |

Entfernt wurde nur mit Beleg. Keine Regel ging verloren: Jede Core-, Content-, System- und Lore-Aussage liegt wörtlich in `content/` (siehe [MIGRATION.md](MIGRATION.md)).

## Ergebnis auf einen Blick

| Baustein | Vorher (Zeichen) | Kategorie | Neu |
|---|---|---|---|
| #0 Critical Mechanics Kernel (konstant) | 4.061 | D + P (Rest) | Formeln, Range, Munition, RNG und Monster/XP-Lock laufen als Engine-Code. Die permanenten Teile (Autorität, Agency, Setting-Baseline) stehen in Narrator Contract v3 und im Kopf des Engine-Blocks. |
| #1 START, #55 PENDING, #2 ACTIVE | 14.457 + 14.462 + 4.162 | D | `src/combat.js` führt Initiative, Zugschleife, Treffer, Crit, Schaden, Munition, Effekte, DefeatXP und Kampfende aus. Das LLM bekommt nur „RESOLVED THIS TURN“. |
| #3 Multi-Hit/AoE/Cover/Ambush | 1.146 | D | Engine (Multi-Hit stoppt beim Tod, AoE mit geteiltem Wurf, Deckung −20 pp, Ambush nur bei `unaware`). Testrun: Fehltreffer auf „[Offensive / Multi-Hit]“. |
| #4 Statuseffekte | 2.533 | D/S | Die definierten Effekte (Guard, Wards, Barrier …) rechnet die Engine. Der Regeltext Core #13 bleibt abrufbar. Testrun: Fehltreffer auf „Frozen“. |
| #5 Verletzung/Heilung | 2.472 | S | Engine: 0 HP = tot, keine Regeneration im Kampf. Die Erholung erzählt der Narrator (`recover`-Schlüssel mit Grenzen). Der Text Core #14 bleibt abrufbar. |
| #6–#9 Barriere, Elemente, Appraisal, Domain | 1.220 / 1.306 / 768 / 2.958 | D (Barriere) / R | Barriere als Engine-Effekt. Elemente, Appraisal und Domain sind derzeit ohne Inhalt, der sie auslöst (keine Element-Skills, Domain erst ab B-Rang). Die Texte bleiben in `rules_text.json`; #system findet sie per Retrieval. |
| #10/#11 Checks, Stealth | 1.482 / 1.329 | D/S | Stealth als Gegenwurf der Engine (AGI gegen PER). Andere Checks über den **CHECK DIE**: Das LLM entscheidet den Check-Gate, die Engine liefert den Wurf und prüft die Rechnung. Core #8 wird situativ beim Schleichen geladen. |
| #12 Level/XP, #25/#28 XP | 2.329 | D | `src/progression.js`: WHILE-Schleife, +5 Punkte, favorisierte Stats, kein Auffüllen; Quest-XP gesperrt bei Angebot. |
| #13 Loot | 3.278 | S | Beim Kampfende lädt die Engine Core #20 situativ. Die Kurzregel („nichts wird automatisch genommen“) steht immer im RESOLVED-Block. |
| #14 Ökonomie | 2.596 | D/S | Kupfer-Arithmetik in der Engine (Ablehnung bei negativem Saldo, nur ganze Kupfer). Core #22 wird bei Handelsabsicht situativ geladen. |
| #15/#16/#28 Klasse/Skill-Evolution | 854 / 1.602 / 1.333 | R | Derzeit ohne Auslöser (Evolution ab Level 15, Proficiency-Aufstieg noch nicht modelliert). Wörtlich abrufbar. |
| #17/#27 Gear-Werte und Referenzen | 883 / 979 | D | Die Engine rechnet ATK/DEF aus der Ausrüstung. Die F-Rang-Referenzen liegen als Daten in `gear.json`. |
| #18–#23 Basisklassen | 1.115 + 5 × ~2k | D | Als Daten in `classes.json`; Creation und Kampf lesen sie direkt. Skill-Details liefert `#skill` exakt. |
| #24 Skill-Erwerb/Affinität | 2.389 | R | Wörtlich in `rules_text.json` (content.6), abrufbar für #system. |
| #25/#26 Monster, Elite/Boss | 5.908 / 1.211 | D | Anker, Skalierung und Elite/Boss in `monsters.json` und `npcgen.js`. Das Profil wird **einmal** gesperrt. Testrun: 15 Anker geladen für einen Menschen-Kampf. |
| #29 Starter-Kits | 1.739 | D | Das Kit wird bei der Creation von der Engine vergeben. |
| #30–#44, #57–#60 Lore/Realms | 12.458 | R (Realm des Ortes situativ) | `lore.json`: Der Realm des aktuellen Ortes steht immer da. Die übrigen Einträge kommen nur, wenn ihre **kuratierten Schlüsselphrasen** in Eingabe oder Erzählprosa vorkommen, nicht über Einzelwörter. Die Setting-Baseline (Material Culture/World Foundations) ist als eine Zeile permanent. |
| #45–#53, #61 System-Befehle, Query-Guard | ~12k | D | `src/commands.js` beantwortet alle #-Befehle ohne LLM-Aufruf. Nur `#system` geht ans LLM, mit den passenden Regelabsätzen. |
| #54 Creation Controller | 10.201 | D | `src/creation.js` führt die zwei Schritte aus. Das LLM bekommt die exakten Werte zum Rendern. |
| **Character Description v2.3** | 15.254 | **P** (Verhalten) | Als **Narrator Contract v3** behalten. Die Verhaltensregeln (Agency, Thought Firewall, Entscheidungsgrenzen, Weltgleichgültigkeit, Wissensgrenzen, Kanon, Kampf-Fokus) sind im Testrun nachweislich im Reasoning angewandt. Die Mechanik-Sätze verweisen jetzt auf die Engine. Neu ist der Abschnitt ENGINE AUTHORITY. |
| Megumin-NPC-Patch v1.3 | ~4.400 | X (mit Engine) | Der Wissensteil ist durch die NPC-Karten der Engine ersetzt (nur eigenes Wissen, Identität, Quelle). Ohne Engine (Legacy-Modus) bleibt er gültig. |
| Megumin-Preset (Host) | ~9–10k | Host | Nicht Teil von Avereth. Die Engine funktioniert mit und ohne Megumin und schreibt keine Formatierung vor. |

## Einzelbelege aus Testrun-v1

- **Lexikalische Aktivierung ist fehleranfällig, sobald Host-Text im Scan-Fenster liegt**: #3 und #4 feuerten auf Megumin-Text. Neu: Regeltexte werden nur **zustandsgesteuert** geladen (Schleichen → Core #8, Kampfende → Core #20, Handel → Core #22). Lore wird nur über kuratierte Eigennamen-Phrasen und den aktuellen Realm geladen, und die Suche ignoriert Tracker-Blöcke (`<Blocks>…</Blocks>`) und Code-Spans.
- **Prozeduren im Prompt werden nicht ausgeführt**: START war geladen, trotzdem fehlten DefeatXP, Snapshot, Zugreihenfolge und echte Würfel. Neu: Die Prozedur ist Code. Das LLM sieht nur das Ergebnis, Zeile für Zeile mit Würfen.
- **Verhaltensregeln wirken**: Das Reasoning zitiert die Agency-Regeln sinngemäß. Deshalb bleiben sie permanent, auch wenn sie rund 4k Token kosten.

## Gegenprobe: Was wäre verloren, wenn man den Baustein streicht?

| Gestrichen | Verlust? | Warum nicht |
|---|---|---|
| START/ACTIVE/PENDING | nein | Die Engine führt sie aus. Die Regeltexte bleiben wörtlich erhalten; `tests/unit/content.test.js` prüft jede Zahlkonstante gegen ihren Core-Satz. |
| Creation #54 | nein | Die Engine liefert alle Werte. Die Labels („CHARACTER CREATION — STEP 2/2“ …) stehen in `campaign_start.json` und im RESOLVED-Block. |
| System-Befehle | nein | Die Engine antwortet exakt aus dem Zustand. Die Privatsphäre-Regeln (keine versteckten NPC-Werte) sind in `commands.js` umgesetzt (`#npc` zeigt nur Alarics Wissen). |
| Lore-Einträge | nein | Dieselben Texte, per Retrieval. Der aktuelle Realm steht immer da. |
| NPC-Patch-Wissensregeln | nein | Die NPC-Karten der Engine sind strenger (nur eigenes Wissen, mit Quelle und Identitätsstufe). |

## Neu gewonnene Leistungsfähigkeit durch die Umstellung

- Echte, auditierbare Würfel. `#audit` zeigt jeden Wurf mit Rechenweg.
- Ein Zustand, der Swipes, Regenerieren, Löschen und Editieren übersteht.
- NPC-Wissen mit Quelle, Überzeugungen, die falsch sein können, und Erinnerungen nur für Zeugen.
- Harte Fakten (z. B. zerstörte Stadt), die nur mit Begründung kippen.
- Kontext unter Budget statt Einträgen, die sich summieren.
