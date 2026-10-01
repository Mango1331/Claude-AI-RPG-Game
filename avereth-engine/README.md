# Avereth Engine (v4.2.1)

Deterministische Spiel-Engine für die Avereth-Kampagne als **SillyTavern-Extension**. Sie besitzt Regeln, Würfel, Kampagnenzustand und Figurenwissen. Das Sprachmodell erzählt.

- Keine Abhängigkeiten, kein Server, keine Datenbank.
- Läuft im Browser (SillyTavern) und in Node (Tests).

**Warum diese Architektur:** [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md). **Befunde aus Testrun-v1:** [docs/TESTRUN_V1.md](docs/TESTRUN_V1.md). **Gesamtbericht:** [ABSCHLUSSBERICHT.md](ABSCHLUSSBERICHT.md). **Externe Review und Antwort:** [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md). **Erster echter Lauf:** [docs/TESTRUN_V2.md](docs/TESTRUN_V2.md). **Zweiter Lauf:** [docs/TESTRUN_V3.md](docs/TESTRUN_V3.md). **Dritter Lauf:** [docs/TESTRUN_V4.md](docs/TESTRUN_V4.md). **Welt-Lore als Lorebook:** [docs/LOREBOOK.md](docs/LOREBOOK.md). **Deep Review Kampf + Runtime V3 (Vorschlag):** [docs/REVIEW_V3.md](docs/REVIEW_V3.md). **Runtime V3 (umgesetzt: einfacher Kampf, NPC-Record, HUD, Prompt-Projektion, Megumin-Checkliste):** [docs/RUNTIME_V3.md](docs/RUNTIME_V3.md). **Plan für Test 5:** [docs/TEST5_PLAN.md](docs/TEST5_PLAN.md). **Pre-Test-5-Diagnoselauf:** [docs/PRETEST5_DIAGNOSE.md](docs/PRETEST5_DIAGNOSE.md). **Test 5, Lauf 1:** [docs/TESTRUN_V5.md](docs/TESTRUN_V5.md). **Test 5, Lauf 2 (Report-Nachforderung):** [docs/TESTRUN_V5_2.md](docs/TESTRUN_V5_2.md). **Ohne Megumin? Analyse und Entwurf eines eigenen Erzähl-Layers:** [docs/MEGUMIN_ANALYSE.md](docs/MEGUMIN_ANALYSE.md). **Erzähl-Layer „Avereth Narrator“ (Preset) und A/B/C-Vergleich mit Megumin:** [docs/NARRATOR_AB.md](docs/NARRATOR_AB.md). **Erster Live-Lauf mit dem Avereth Narrator:** [docs/TESTRUN_V6.md](docs/TESTRUN_V6.md). **Live-Lauf 25.09. (Ratten ohne Zustand, Kampf-Labels, Zielfrage durch die Engine):** [docs/TESTRUN_V7.md](docs/TESTRUN_V7.md). **Live-Lauf 26.09. (lief den Stand von `main`; Züge vor Alarics erstem Zug, Phantom-Ratten, `alaric_red`, Build-Kennung):** [docs/TESTRUN_V8.md](docs/TESTRUN_V8.md). **Live-Lauf 27.09. (Ratten als Kulisse, die später angreifen):** [docs/TESTRUN_V9.md](docs/TESTRUN_V9.md). **Live-Lauf 27.09., 02:30 (Stadt ohne Ort und Orts-Nachfrage, Quest-Rang als Zahl, „the creature“, Fakt über eine abgelehnte Kreatur):** [docs/TESTRUN_V10.md](docs/TESTRUN_V10.md). **Live-Lauf 27.09., 04:11 (Gildenverträge: Abschluss und Belohnung nur über die Gilde; Quest-Identität, Registrierung, Orts-Nachfrage mit `present`, Phantom-Stadt):** [docs/TESTRUN_V11.md](docs/TESTRUN_V11.md). **Live-Lauf 27.09., 07:10 (Architektur-Stresstest auf 3.1.7):** [docs/TESTRUN_V12.md](docs/TESTRUN_V12.md). **Runtime V4 / Engine 4.0 (umgesetzt; Plan Rev. 3 mit den Entscheidungen nach P0):** [docs/RUNTIME_V4_PLAN.md](docs/RUNTIME_V4_PLAN.md); **externes Review dazu:** [docs/CHATGPT_REVIEW_RUNTIME_V4_PLAN.md](docs/CHATGPT_REVIEW_RUNTIME_V4_PLAN.md); **P0-Messungen:** [docs/P0_BERICHT.md](docs/P0_BERICHT.md); **Live-Test 4.0 (Einrichtung, Ablauf, was zurückschicken):** [docs/LIVETEST_V4.md](docs/LIVETEST_V4.md).

## Runtime V4 (Standard für neue Kampagnen seit 4.0)

*LLM interprets and narrates. Engine validates and commits.* Jede Kampagne behält die Runtime, mit der sie begann: Neue Chats laufen in V4 (Einstellung „Runtime for new campaigns“), laufende V3-Chats bleiben V3.

1. **Vor der Erzählung** übersetzt ein kleiner LLM-Aufruf (Interpreter, reines JSON, Temperatur 0,1) deine Nachricht einmal in typisierte Befehle: `go`, `activity`, `take`, `give`, `pay`, `buy`, `guild.register`, `quest.accept`, `quest.turn_in`, `board.read` und weitere (`content/commands.json`). Fragen, Rückblicke, Pläne und Absichten („I'm here to register“) sind keine Befehle; ein deterministischer Agency-Guard entfernt, was die Nachricht nicht trägt.
2. **Die Engine prüft und bucht** jeden Befehl: *resolved* (harte Mechanik/Commitments wie Gebühr, Questannahme, Kauf/Verkauf), *authorized* (Reise, Tätigkeit), *conditional*, *pending*, *refused*, *clarify*. Offizielle Gildenaushänge erzeugt ein Board-Generator (*canonical first*); Registrierung, feste Quest-Auszahlung, Quest-XP, Completed-Count und Promotion bleiben Engine-owned. Questziele, Hinweise und Verification dienen dagegen als gespeichertes Story-Gedächtnis.
3. **Der Erzähler** bekommt PLAYER ACTIONS und schreibt **nur Prosa**: keinen Block, keinen Report (Vertrag v4, Preset „Avereth Narrator V4“).
4. **Nach der Antwort** liest ein Extraktor (LLM, JSON) sie im Hintergrund als geordnete Weltänderungen; maximal ein Erstversuch plus ein Repair. Die **Autoritäts-Firewall** schützt harte Mechanik und Alarics eigene Commitments, nicht normale Weltkausalität: NPC-Hilfe, Beziehungen, Wissen, Witnesses, Questfortschritt und freiwillige NPC→PC-Übergaben werden primär gespeichert. Externe Ereignisse dürfen Alaric mit explizitem Grund auch unfreiwillig bewegen; Combat-/Coin-/Progressionsmechanik bleibt streng.
5. **Commit-Barriere:** Die Narration selbst bleibt sofort sichtbar; die nächste Nachricht wartet, bis die Welt der vorigen Antwort gebucht ist (höchstens 90 s; sonst eine sichtbare Lücke mit Korrektur).
6. **Kampf, Charaktererstellung, `#`-Befehle und Schleichen** laufen unverändert über die V3-Engine.

Einrichtung und Ablauf des Live-Tests: [docs/LIVETEST_V4.md](docs/LIVETEST_V4.md), mit dem kurzen Retest nach dem ersten Lauf (§5). Architektur, Entscheidungen und Grenzen: [docs/RUNTIME_V4_PLAN.md](docs/RUNTIME_V4_PLAN.md), Rev. 3; Befunde des ersten Live-Tests vom 28.09.2026: R3.9. **Build 4.1.4:** das geprüfte und eingebaute ChatGPT-Experiment 4.0.1–4.0.9, die Befunde des Live-Laufs vom 30.09.2026, die Nachprüfung von 4.1.0 (Geld, Handelsmengen, Reisebeginn, Jagdziele, Escort-Bereitschaft), der Live-Lauf 30.09. 14:56 (Rückweg zur Halle, zurückkehrende Tiere, Tötungszahl, Brettaufgaben, Jagdnachweis, Overreach), die Nachprüfungen von 4.1.2 und 4.1.3 (eine Bereitschaftsprüfung für jeden Abschlussweg und ihre Anzeige, Jagd nur gegen Tiere und Monster, Rede löst keinen Kampf aus). **Build 4.1.5** behandelt den Live-Lauf 30.09. 22:41:
- Ein Questtitel ist keine Tat.
- Eine Jagd braucht keinen Bestätigungsauftrag.
- Notizen speichern keinen Engine-Zustand.
- Ein stärkeres Tier hat stärkere Werte und gibt mehr XP.
- Die Statuszeile zeigt, ob die Karte den aktuellen Erzählervertrag trägt.

Dazu der echte Live-Test: [docs/INTEGRATION_4_1.md](docs/INTEGRATION_4_1.md) §12. **Vor dem Test die Kartenbeschreibung vollständig durch den Erzählervertrag v4 ersetzen.**

**Build 4.2.x (Gen 3.5)**, Branch `claude/gen35-world-envelope-2026-10-01`, schärft die Grenzen von Gen 3, ohne den Ablauf zu ändern ([docs/ARCHITECTURE_GEN35.md](docs/ARCHITECTURE_GEN35.md); 4.2.1 härtet sie nach dem Review, §8):
- **Decision Ownership** als Daten (`src/v4/ownership.js`): Jede Zustandsart gehört einer Domain, jedes Extraktor-Delta deklariert, was es schreiben darf, und ein Assert prüft das in der ganzen Testsuite. Freitext (Notizen, Erinnerungen, Bereitschaftsnotizen) speichert keinen Engine-Zustand.
- **World/Reaction Envelope** (`src/v4/envelope.js`): Vor der Prosa nennt der Engine-Block die kausalen Grenzen (wer nur mit Anlass gewalttätig wird, welche Tiere nur in die Enge getrieben kämpfen, wer Alaric etwas nehmen darf); nach der Prosa prüft der World-Applier dieselben Grenzen. Die Gewaltpolicy teilt er mit dem Kampf (`src/policy.js`).
- **Unified Intent IR** (`src/ir.js`): ein Parse je Nachricht, erkannte Namen als Links, eine Form für beide Zugpfade im Record.
- **Kampf-Scope für Fakten:** Was die Geschichte während eines Kampfes über die Kämpfenden sagt, gilt nur, solange er läuft.
- Der Erzählervertrag hat Revision 4.2.0: die Kartenbeschreibung ersetzen (4.2.1 ändert ihn nicht).

## Was die Engine pro Zug tut (Runtime V3)

1. **Vor der Generierung** (Prompt-Interceptor) liest sie deine Nachricht:
   - Angriff, Skill, Bewegung, Flucht, Schleichen, Charaktererstellung oder `#`-Befehl;
   - Fragen und wörtliche Rede („Drop it or I shoot!“) sind keine Angriffe.
2. **Sie löst Mechanik selbst:**
   - Initiative (⌊1,5 × AGI⌋), Schaden (Core #11), Munition, Kosten und NPC-Züge; jeder legale Angriff trifft, einen Crit (×1,5) gibt es nur in der Opening Action eines echten Hinterhalts;
   - Level-ups und DefeatXP;
   - Schleichen gegen Wahrnehmung;
   - die Charaktererstellung: Sie beantwortet die Engine als System-Panel, ohne LLM-Aufruf.
3. **Sie injiziert einen kompakten Engine-Block** (in den Testruns 1.100–1.500 Token):
   - Zustand;
   - NPC-Karten mit Rolle, Aussehen, Stimme, Haltung, letztem bedeutsamem Moment, Agenda und **nur deren Wissen**;
   - relevante Erinnerungen und Fakten;
   - Lore (nur ohne verknüpftes Lorebook);
   - zuletzt „RESOLVED THIS TURN“ mit allen Würfen.

   Dazu kommt die **Lore-Bridge**: Realm und Stadt als reiner Scan-Text für World Info (0 Token im Prompt), damit das Lorebook der Karte die passenden Einträge aktiviert. Vom Chatverlauf stehen im Prompt nur deine aktuelle Nachricht und die 3 Wechsel davor, ohne alte Tracker-Blöcke; der gespeicherte Chat bleibt unverändert.
4. **Das Modell erzählt** und schreibt direkt nach der Erzählung einen Fakten-Report mit den Neuerungen dieser Antwort: `<avereth>{…}</avereth>`. Tracker, Charakterbögen, World-State und NPC-Dossiers schreibt es nicht mehr; das übernimmt die Engine.
5. **Nach der Antwort** prüft die Engine den Report:
   - neue Figuren, Orte, Fakten, Wissen, Erinnerungen, Beziehungen, Quests, Items und Coin werden übernommen;
   - Ungültiges wird mit Grund abgelehnt;
   - freiwillige Änderungen an Alaric (reisen, bezahlen, abgeben, Quest annehmen) nur, wenn deine Nachricht sie gewählt hat; Diebstahl oder Festnahme muss einen anwesenden NPC nennen; eine Quest, die du beim Namen nimmst („I take the Vermin in the Malthouse Cellar quest“), darf auch ein späterer Report aktiv setzen, eine andere nicht;
   - der Report wird aus der Anzeige entfernt;
   - Zahlen in der Antwort, die der Engine widersprechen (z. B. „Init 8“), werden im nächsten Zug korrigiert;
   - fehlt der Report, bittet der nächste Engine-Block darum, und der nächste Report darf die Entscheidungen des Zuges ohne Report nachtragen;
   - meldet der Report einen Angriff auf Alaric, legt die Engine den Kampf sofort fest (Initiative, Reihenfolge) und spielt gleich alle Züge vor Alarics erstem Zug (im echten Hinterhalt zuerst die Opening Action). Das steht über dieser Antwort; Alarics Zug wartet auf deine Nachricht, und der Erzähler erzählt die Züge davor mit ihm. Sind die Angreifer noch unklar (Nachforderung läuft), wird der Kampf nur festgelegt;
   - während eines Kampfes legt ein Report keine neue Kreatur an, die er nicht im selben Report in `combat` angreifen lässt: Die Kämpfenden heißen mit ihrem Label (Cellar Rat A), ein Neuzugang kommt über `new` und seine Ref in `combat`, auch wenn er wie die Kämpfenden „Cellar Rat“ heißt (er wird Cellar Rat C);
   - gehst du vom Startplatz vor der Stadt in die Stadt und nennt der Report nur die Stadt (`location`), keinen Ort darin, fragt die Engine separat nach, wo die Antwort endet und wer von den Personen, die der Report eingeführt hat, dort bei Alaric ist (`place`, `present`; `PLACE NOT REPORTED YET`). Wen die Antwort nicht als anwesend nennt, etwa die Torwache, steht danach nicht mit in der Gilde; wer an der Theke steht, bleibt. Eine Antwort ohne `present` schickt niemanden weg. Bringt die Nachfrage nichts, ist sein Ort die Stadt, und alle aus der Antwort bleiben gelistet (`PLACE NOT REPORTED`). An jedem anderen Ort ändert eine nochmals genannte Stadt nichts (in der Gilde „*I walk to the quest board*“ bleibt die Gilde). Ist der Ort nur die Stadt, ist ein später gemeldeter Platz ohne Bewegung der, an dem Alaric schon ist; nach einer Bewegung ist er neu, und die anderen kommen nicht mit;
   - ein Quest-Rang als Zahl (`"rank":1`) ist der Rang, in dessen Level-Band die Quest liegt (Level 1: Novice); die Quest geht nicht verloren;
   - **Gildenverträge** (Quests mit Quest-Rang) nimmt Alaric an der Gilde an. Abgeschlossen werden sie nur, wenn deine Nachricht den Vertrag abgibt und Alaric in einer Stadt oder Hauptstadt ist, wo die Gilde eine Stelle hat. Mit Namen („I turn in the Wolf Problem quest“) gilt nur der genannte Vertrag; ohne Namen („turn the quest in“) gilt die Abgabe nur, wenn genau ein Vertrag aktiv ist. Sind mehrere aktiv, nennst du den, den du abgibst. Meldet ein Report den Vertrag vorher als erledigt, auch im Keller mitten in der Stadt, bleibt er aktiv (`QUEST STILL ACTIVE`); Beweise gehen in die Notiz oder Alarics Items. Bei der Abgabe zahlt die Engine die feste Gilden-Auszahlung (den ersten Betrag der Belohnung, „8 silver“ = 80 Copper; Variables ist ein Bonus des Auftraggebers) und die Quest-XP, einmal. Coin, den ein Report für einen Vertrag bucht (sein Name im `why`, oder im Report, der ihn abschließt), wird abgelehnt. Arbeit ohne Rang ist privat: direkt bezahlt, mit Quest-XP, ohne Gilden-Anrechnung. Die Gilden-Registrierung ist keine Quest (keine Quest-XP). Ein kürzerer Titel („Wolf Problem“) meint die eine offene Quest, deren Titel alle seine Wörter enthält;
   - ein neuer Ort braucht einen Namen: Eine Beschreibung ohne Eigennamen („town with guild hall“) legt keinen Ort an; eine Sammelbezeichnung („Millbrook villagers“) oder ein Ortsname wird nie zur Person;
   - eine Kreatur, die der Report nicht anlegen kann, benennt nichts: Ein Fakt über sie bleibt freier Text. Ein Fakt über eine Entity, die es nicht gibt, zählt als Integritätsproblem in der Statuszeile;
   - Alarics Name gehört dem Spieler: Ein Report ersetzt ihn nie. Sein voller Name („Alaric Red“) ändert nichts, ein anderer Name wird abgelehnt (ein Name, unter dem er auftritt, ist ein eigener Fakt, z. B. `alias`);
   - schreibt das Modell trotzdem `<World_State>`, `<Character_Sheet>`, `<New_NPC>` oder `<NPC_Update>`, werden die Blöcke entfernt und nie zu Zustand.
6. **Unter der Antwort zeigt das HUD** zwei einklappbare Panels, Charakter und Welt. Beide werden aus dem Engine-Zustand gerendert, gehen nie in den Prompt und zeigen nichts, was Alaric nicht wissen kann.

Der Zustand wird **pro Nachricht** gespeichert (`message.extra.avereth`):
- **Swipe:** Jede Alternative hat eigene Fakten.
- **Regenerieren:** gleiche Würfel; es wird nie neu gewürfelt.
- **Löschen:** nimmt die Fakten der gelöschten Nachrichten mit.
- **Bearbeiten:** Eine editierte Antwort behält ihre Fakten. **Retcon:** einen neuen `<avereth>{…}</avereth>`-Block in die **neueste** Antwort schreiben; sie wird neu geprüft (`{}` verwirft ihre Fakten). Bei älteren Antworten erst die späteren Nachrichten löschen.

## Installation

1. Den Ordner `avereth-engine/` nach `SillyTavern/data/<user>/extensions/avereth-engine/` kopieren. „Install extension“ mit der Repository-Adresse geht nicht: SillyTavern erwartet `manifest.json` im Wurzelverzeichnis des Repositorys, hier liegt sie im Unterordner.
   - **Welcher Stand?** Neue Änderungen liegen zuerst auf dem Branch `claude/happy-wright-1a4y19` und kommen erst mit dem Merge nach `main`; Build 4.1.0 (Integration des ChatGPT-Experiments) liegt auf `claude/v4-integration-2026-09-30`, Build 4.1.5 (Korrekturen nach den Nachprüfungen und nach den Live-Läufen 30.09. 14:56 und 22:41) auf `claude/v4-integration-fixes-2026-09-30`, Build 4.2.1 (Gen 3.5) auf `claude/gen35-world-envelope-2026-10-01`. Den Ordner aus dem Stand kopieren, den du testen willst.
   - **Nur eine Kopie:** Liegt zusätzlich ein gleichnamiger Ordner unter `public/scripts/extensions/third-party/`, liefert SillyTavern pro Datei die Kopie aus `data/<user>/extensions/`. Alte Kopien löschen.
2. SillyTavern neu laden. Unter Extensions erscheint **Avereth Engine**.
   - **Build prüfen:** „Manage extensions“ zeigt die Version aus `manifest.json` (jetzt **4.2.1**). Dieselbe Nummer steht in der Statuszeile des Engine-Panels, in der letzten Zeile von `#audit` und bei jeder Nachricht im Event-Export (`build`). Nachrichten ohne `build` stammen von einem Stand vor 3.1.0.
3. **Charakterkarte:**
   - **Runtime V4 (Standard):** Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v4.txt`; dazu das Preset `presets/Avereth Narrator V4.json` und die API-Quelle **Custom (OpenAI-compatible)**. Schritt für Schritt: [docs/LIVETEST_V4.md §2](docs/LIVETEST_V4.md#2-einrichtung-in-sillytavern). Am besten eine eigene Karte für V4, damit laufende V3-Chats ihre behalten.
   - **Runtime V3:** Beschreibung = Inhalt von `content/narrator/Avereth_Narrator_Contract_v3.txt` (Stand 3.3; nach jedem Update neu einfügen);
   - Begrüßung = First Message v0.4 (unverändert; die Zeile `Location: … outside <City>, <Realm>` legt den Startort fest).
4. **Die Avereth-WorldInfo v1.23 deaktivieren.** Die Engine ersetzt sie; beides zusammen doppelt Regeln.
   - **Megumin-Preset:** NPC-Dossier, NPC-Updates, NPC-Bank und die `<Blocks>`-Anweisung entfernen. Die genaue Checkliste mit allem, was bleibt, steht in [docs/RUNTIME_V3.md §9](docs/RUNTIME_V3.md#9-megumin-v10-shura-manuelle-änderungen).
   - Bis dahin entfernt die Engine die Blöcke aus Antworten und Prompt. Das Modell schreibt sie aber weiter und braucht dafür Zeit.
5. **Welt-Lore-Lorebook** (empfohlen, [docs/LOREBOOK.md](docs/LOREBOOK.md)):
   - World Info → Import → `lorebook/Avereth_World_Lore_v0.13.json`;
   - an der Erzähler-Karte (Globus-Symbol) als **Character Lore** verknüpfen, nicht global aktivieren;
   - World-Info-Einstellungen: Scan Depth 2, Budget Cap 1.800, Recursive Scan aus, Match whole words an;
   - die Engine lässt dann ihre eigene LORE-Sektion weg (Einstellung „World lore“ = Auto).
6. **Antwortlänge:** Ohne Megumin-Blöcke reichen meist 4.096 Token, mit Reasoning „high“ 6.000. Solange das Preset noch Blöcke anfordert, mindestens 8.192. In Testrun 3 schnitt GLM mit 4.096 Token zwei Antworten mitten in den NPC-Dossiers ab.
7. **Streaming** (empfohlen): in den API-Einstellungen anschalten.
   - **Nur Runtime V3:** unter Extensions → Regex die Skripte aus `regex/` importieren (V4-Antworten enthalten keinen Block):
     - `avereth_hide_fact_report.json` versteckt den Report schon während des Streamings;
     - `avereth_hide_tracker_blocks.json` braucht es nur, solange Megumin noch Blöcke anfordert.
   - Beide ändern nur die Anzeige, weder den gespeicherten Text noch den Prompt. Details: [docs/RUNTIME_V3.md §5](docs/RUNTIME_V3.md#5-streaming).
8. **Neuen Chat starten.** Die Kampagne entsteht an der Begrüßung. Ein Chat, der ohne Engine begonnen wurde, bleibt unberührt. **Zuerst einen wegwerfbaren Testchat spielen** (Report-Format, Streaming und Swipes mit deinem Modell prüfen), erst dann die Langzeitkampagne.

**Einstellungen** (Extensions → Avereth Engine):

| Einstellung | Standard | Wirkung |
|---|---|---|
| Engine active | an | Schaltet die Engine an oder aus |
| Runtime for new campaigns | V4 | V4: Interpreter vor und Extraktor nach der Erzählung, der Erzähler schreibt nur Prosa (Vertrag v4, Preset V4). V3: Fakten-Report in der Antwort. Gilt für neu gestartete Kampagnen; eine laufende behält ihre Runtime. |
| Context budget | 1.400 Token | für Szene, NPCs, Retrieval und Lore; RESOLVED und Header werden nie gekürzt |
| Rules allowance | 800 Token | situative Regeltexte (Schleichen, Loot, Handel, `#system`) |
| Recent turns not re-retrieved | 4 | was noch im Chatverlauf steht, wird nicht doppelt injiziert (höchstens das History window) |
| History window (exchanges) | 4 | so viele Spielernachrichten stehen mit ihren Antworten wörtlich im Prompt, die aktuelle mitgezählt (4 = aktuelle Nachricht plus 3 Wechsel); ältere erreichen den Erzähler über den Engine-Block. 0 = ganzer Verlauf. Der gespeicherte Chat bleibt unverändert. |
| Remove tracker blocks from new replies | an | entfernt `World_State`, `Character_Sheet`, `New_NPC` und `NPC_Update` aus neuen Antworten; alte Antworten verlieren sie nur in der Prompt-Kopie |
| Ask for a missing fact report separately (nur V3) | an | Hat eine Antwort keinen gültigen Fakten-Report, fragt die Engine dasselbe Modell in einer kurzen, eigenen Anfrage nur nach dem Report (≈ 1,5k Token Prompt), während du liest. Die Antwort zählt wie der Report des Erzählers. Die nächste Nachricht wartet darauf, höchstens 60 s. |
| HUD under replies | Folded | Charakter- und Welt-Panel unter jeder Antwort: eingeklappt mit Zusammenfassung, offen oder aus |
| Injection depth | 0 | 0 = direkt vor der Generierung |
| World lore | Auto | Auto: Lorebook der Karte, falls verknüpft, sonst die Lore der Engine. „Card lorebook“ oder „Engine“ erzwingen eine Quelle. Die Statuszeile zeigt die aktive. |
| Word replacements | leer (V3 only) | Wörter, die der Erzähler überstrapaziert, werden in seinen Antworten ersetzt: ganze Wörter, Plural und Großschreibung bleiben; Paare mit Komma trennen (`ledger=register, tapestry=weave`). Das Wort steht so auch nicht mehr im nächsten Prompt. Eine Bann-Liste im Preset nennt das Wort und macht es eher wahrscheinlicher. |
| Show last engine block | aus | zeigt den zuletzt injizierten Engine-Block (Debugging) |

Außerdem gibt es einen Button **Export event log**, der das komplette Event-Log als JSON herunterlädt.

## Spielen

- **Charaktererstellung:** Klasse eintippen (`Warrior`), dann zwei Skills (`Heavy Slash + Guard`).
  - Die Engine antwortet sofort mit einem System-Panel: dem echten Skill-Pool mit Werten, dem Grund, falls eine Wahl nicht gilt, und zum Schluss dem fertigen Bogen mit Starter-Gear.
  - Der Erzähler kommt erst mit der ersten Story-Nachricht dazu.
- Handlungen normal schreiben: `*I aim the bow and Power Shot at him*`, `I sneak along the hedge`, `"My name is Alaric."`.
- Kampf beginnt nur bei einem erklärten Angriff (Core #23). Zielen, Spurenlesen oder „Bogen bereit“ starten keinen Kampf.
- „the creature“, „the beast“, „the animal“ oder „the monster“ meint die Kreaturen unter den Zielen, nie die Menschen daneben: Steht eine da, ist sie das Ziel; bei mehreren wählst du. Vor und im Kampf gleich.
- **Ziele im Kampf:** Jeder Gegner hat für diesen Kampf ein festes Label, und die Zeile `COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT]` listet sie.
  - Ein bekannter Name ist das Label (`Brede`). Unbenannte Gegner heißen nach ihrem Aussehen mit Buchstaben. Einen Namen, den die Geschichte noch nicht gesagt hat, zeigt die Liste nicht.
  - Mit dem Label triffst du genau diesen Gegner: `*I use Quick Slash on Cellar Rat B*`. Stirbt A, bleibt B B; ein Nachzügler bekommt den nächsten Buchstaben.
  - Mehrere Gegner sind mehrere Kämpfer. Meldet der Erzähler sie nur als Gruppe („rat pack“, „rats“), fordert die Engine sie einzeln nach (`ATTACKERS NOT IDENTIFIED YET`); ein Rudel wird nie still eine einzelne Ratte. Das gilt auch für eine Gruppe, die vorher als Kulisse im Raum stand („cellar rats“): Greift sie an, kommen ihre Tiere einzeln herein, und die Gruppe verlässt die Szene. Greift Alaric eine solche Gruppe an, wird nichts gewürfelt, und die Geschichte zeigt ihre Tiere zuerst.
  - **Ein** gültiges Ziel wird automatisch gewählt. Bei mehreren antwortet im Kampf das System selbst mit der Zielliste, ohne Erzähler, Kosten oder Würfe. Umstehende sind keine Kandidaten; angreifen kannst du sie nur beim Namen.
  - Unterscheidest du Ziele („the second one“, „the other one“) und passt keines, wählt die Engine nicht für dich. „the nearest one“ nimmt den nächsten Gegner nach Entfernung; stehen zwei gleich nah, fragt das System.
- Warten im Kampf: `I wait` / `I hold my position`.
- Bewegung plus Angriff (Core #12/#24: ein Band plus eine Hauptaktion): `I step back and shoot`, `I kite backwards and Power Shot`. Alaric schießt und tritt danach ein Band zurück. Im Nahkampf geht es näher heran: `I creep up and Power Strike the rat` (von SHORT ein Band vor, dann der Schlag). Von MEDIUM reicht ein Band nicht; das kann nur Charge mit seinem Extra-Band.
- **Im Kampf redet niemand** (Kampfstille). Nur wer aufgibt oder verhandelt, darf einen kurzen Satz sagen. Hält sich die Erzählung nicht daran, korrigiert der nächste Engine-Block.
- **Kampf und Proben stehen als System-Zeilen oben in der Antwort**, direkt aus den Engine-Würfen:
  - Initiative und Zugreihenfolge, die Zielliste `COMBAT TARGETS` bei Kampfstart und wenn jemand dazukommt oder ausfällt;
  - jede Aktion mit Schaden; jeder legale Angriff trifft, im echten Hinterhalt steht `AMBUSH CRIT ×1.5`, Minderungen in Klammern (`cover -25%`, `Deflect -25%`);
  - `HP vorher - Schaden = HP nachher`;
  - HP aller Beteiligten, ihre Entfernung zu Alaric (`Range:`), Alarics MP/STA/Pfeile;
  - vor Alarics Zug seine Angriffe mit dem Schadensbereich gegen das nächste Ziel: `Alaric's attacks vs Cellar Vermin: Basic Attack 16–19 · Aimed Shot 24–29 · Power Shot 30–37 damage`;
  - Kampfende mit XP;
  - greift jemand Alaric an, steht der Kampf schon über dieser Antwort, bevor du deine Aktion schreibst: `COMBAT START`, Initiative, die Züge aller, die vor Alaric dran sind (`— Round 1 —`), Zielliste, HP, Entfernung, `Next: Alaric's Turn (Round 1)`. Das Panel deines nächsten Zuges zeigt nur, was danach geschieht;
  - Handel und Beute als eigene Zeilen: `COIN -2 Copper → 4 Silver 8 Copper`, `ITEM +3 Standard Arrow → 23 carried`, `QUEST ACCEPTED — …`, Quest-XP und Level-up, Erholung.

  Der Block ist nur Anzeige: GLM bekommt die Zahlen im Engine-Block und sieht den Block nicht im Chatverlauf.
- **HUD unter jeder Antwort** (Charakter und Welt, per Klick aufklappen):

  | Panel | Inhalt |
  |---|---|
  | Charakter | Level, Power Rank, Gildenrang, HP/MP/STA/XP, Stats, Kampfwerte, Skills, Ausrüstung, Inventar, Coin, Quests, Effekte |
  | Welt | Zeit, Ort, Wetter, Anwesende mit Entfernung, Kampf und Zugreihenfolge, aktive Quests, Fristen, offene Fäden, bekannte Fakten zum Ort |

  Das HUD zeigt immer den Engine-Stand, auch wenn die Erzählung sich verzählt. Haltungen, Agenden und Geheimnisse von NPCs zeigt es nie. Screenshot: [docs/img/hud_live_sillytavern.png](docs/img/hud_live_sillytavern.png).
- **Fehlender Fakten-Report:** Hat der Erzähler keinen gültigen Report geschrieben, fragt die Engine im Hintergrund nach. Über der Antwort steht dann:
  - erst `NO FACT REPORT: asking for it separately …`;
  - danach `REPORT RECOVERED … (s)`: Das HUD folgt der Geschichte;
  - oder `NO FACT REPORT, and the separate request brought none …` (bzw. `… came too late`, wenn die nächste Nachricht ihre Minute schon gewartet hat): Was diese Antwort erzählt (Ort, Personen, Quest), kennt die Engine dann nicht. Neu generieren (Swipe) oder weiterspielen; der nächste Report kann es nachholen.

**Befehle** (antwortet die Engine direkt, ohne LLM-Aufruf und ohne Spielzeit):

| Befehl | Zeigt |
|---|---|
| `#status` / `#stats` | kompletter Status mit abgeleiteten Werten |
| `#skills`, `#skill <Name>` | Skills; Details mit aktuellem Raw Power und Rechenweg |
| `#class`, `#domain` | Klasse, Wachstum, nächster Meilenstein |
| `#equipment`, `#bag` / `#inventory`, `#item <Name>` | Ausrüstung, Inventar, Items |
| `#quests`, `#quest <Name>` | Quests |
| `#effects`, `#effect <Name>` | aktive Effekte |
| `#combat` | kompletter Kampf-Snapshot (Audit) |
| `#npc <Name>` | was **Alaric** über jemanden weiß |
| `#log [n]` | Alarics Erinnerungen |
| `#audit` | Würfe, Rechenwege, abgelehnte Report-Teile des letzten Zuges |
| `#assign <STAT> <n>` | freie Stat-Punkte vergeben (einziger zustandsändernder Befehl) |
| `#system <Frage>` | geht ans LLM im System-Modus, mit den passenden Regelabsätzen |
| `#help` | Liste |

## Für Entwickler

```
npm test                               # 448 Tests: Unit, Szenarien, SillyTavern-Verhalten, Review-Fälle, Lorebook, Runtime V3, Pre-Test-5, Regression der Testruns 1–4, beider Test-5-Läufe und der Live-Läufe 6–11, Narrator-Vergleich, P0-Werkzeuge, Runtime V4 (tests/v4: Golden V12, Cluster, Laufzeit, Abdeckung, V4-Live-Läufe 28.09. und 30.09.)
node tools/testrun_compare.js          # Token-Vergleich mit Testrun-v1
node tools/browser_smoke.mjs           # optional: index.js in echtem Chromium mit gemocktem SillyTavern-Kontext, eine V3- und eine V4-Kampagne (braucht Playwright)
AVERETH_ST_DIR=/pfad/zu/SillyTavern npm run smoke:st   # optional: Live-Smoke (V3) in echtem SillyTavern mit streamendem Mock-Erzähler (docs/RUNTIME_V3.md §8); mit AVERETH_ST_PRESET="Avereth Narrator" für das eigene Preset (docs/NARRATOR_AB.md §2.4)
AVERETH_ST_DIR=/pfad/zu/SillyTavern npm run smoke:st:v4   # optional: Live-Smoke Runtime V4 in echtem SillyTavern, Mock-Provider hinter der Quelle Custom (docs/LIVETEST_V4.md §1); nur gegen ein Wegwerf-SillyTavern
node tools/run_report.mjs <Server-Log> [<Chat.jsonl>]   # Messung eines Laufs: Prompt je Kategorie, Output-Aufteilung, Dauer (docs/TEST5_PLAN.md §4)
node tools/narrator_ab.mjs --log <Server-Log> --chat <Chat.jsonl> [--log … --chat …] --dry-run   # Narrator-Vergleich A/B/C; ohne --dry-run mit AVERETH_AB_API_BASE/_KEY (docs/NARRATOR_AB.md §3)
node tools/lorebook_audit.mjs          # welche Lorebook-Einträge in den Testruns 2–4 feuern (World-Info-Nachbau, gegen Testrun 4 bestätigt)
node tools/p0/check.mjs --ping         # Runtime V4, P0: Spikes S0–S3 über das laufende SillyTavern (Key bleibt dort; docs/P0_SPIKES.md)
python3 tools/migrate_content.py       # Content aus dem Paket v1.24 neu erzeugen (aus dem Repo-Wurzelverzeichnis)
node tools/v3_combat.mjs               # danach: Combat V3 auf den Content anwenden (idempotent)
```

**Build-Kennung:** Bei jeder Engine-Änderung `ENGINE_VERSION` in `src/util.js` erhöhen, dazu `version` in `manifest.json` und `package.json`. Ein Test prüft, dass alle drei gleich sind.

| Ordner | Inhalt |
|---|---|
| `index.js`, `manifest.json`, `style.css` | SillyTavern-Anbindung |
| `src/` | Engine, siehe [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) |
| `content/` | Inhalte, siehe [docs/DATENMODELL.md](docs/DATENMODELL.md) |
| `lorebook/` | Welt-Lore als SillyTavern-Lorebook (Character Lore), siehe [docs/LOREBOOK.md](docs/LOREBOOK.md) |
| `regex/` | Regex-Skripte für SillyTavern (Runtime V3: Report und alte Tracker-Blöcke beim Streaming verstecken) |
| `presets/` | Chat-Completion-Presets „Avereth Narrator“ (V3) und „Avereth Narrator V4“ (nur Prosa), siehe [docs/NARRATOR_AB.md](docs/NARRATOR_AB.md) |
| `schemas/` | JSON-Schemas für Content, Events und Report |
| `tests/` | `unit/`, `scenarios/`, `testrun_v1/` bis `testrun_v4/`, `testrun_v12/` (Gold V4), `eval/` (Korpora S1/S2), `v4/` (Runtime V4) |
| `tools/` | Migration, Combat-V3-Migration, Testrun-Vergleich, Lorebook-Audit, Browser-Smoke, Live-Smoke (`st_live/`), Lauf-Messung (`run_report.mjs`), Narrator-Vergleich (`narrator_ab.mjs`), Runtime-V4-Spikes (`p0/`, [docs/P0_SPIKES.md](docs/P0_SPIKES.md)) |
| `docs/` | Architektur, Datenmodell, Migration, WI-Bewertung, Lorebook, Testrun-Analyse, Runtime V3, Test-5-Plan, Runtime-V4-Plan (Rev. 3), P0-Bericht, Live-Test V4 |

**Engine-API** (`src/engine.js`; Adapter für Chat-Arrays in `src/host.js`):

```js
const events = startCampaign(content, { seed, firstMessage });
const turn   = playerTurn(state, content, input, { msg });           // Events der Spielernachricht
const block  = turnContext(turn.state, content, { input, lastReply, corrections });
const reply  = narratorReply(turn.state, content, llmText, { msg });  // Events der Antwort, bereinigter Text, Korrekturen
```