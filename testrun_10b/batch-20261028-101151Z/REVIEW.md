# GPT-Review – Batch vom 28.10.2026, abgebrochener Warrior-Start (.110)

**Status:** Analyse des Originalexports und gezielte technische Prüfempfehlung. **Kein Patch, keine technische Implementierungsfreigabe, keine Produkt-/Runner-/Contentänderung.**

## 1. Originalquelle und Abbruch

- Upload: `batch-20261028-101151Z.zip`, **2.108.659 Bytes**, SHA-256 **`dfd58841e612e28e531acc0d05b649a155580cbf25c3f4517da9f738ae7f3997`**, 18 Einträge; vollständiger ZIP-CRC-Test **fehlerfrei**. Original-ZIP im Chat, **nicht auf `main` archiviert**.
- Gespielte Version laut `batch.json` und `run.json`: **`4.3.0-c.6.6.110`**, Produktcommit **`da933e9371d0`**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, `dirty: []`. Dies ist **kein .109-Livebatch**.
- Warrior: **15 Runner-Inputs einschließlich unterbrochenem letztem Input**, Level 1. Die ersten 14 Runner-Inputs einschließlich `#audit` wurden beantwortet; bei Input 15 wurde manuell mit **Ctrl+C** abgebrochen. `run.json.end={kind:harness, why:'interrupted (Ctrl+C) in turn 15'}`; der AbortError im Serverlog ist die Konsequenz dieses manuellen Stopps, **kein fataler Enginefehler**. Mage/Rogue nicht gestartet.
- `avereth-events.json`: **121 aufgezeichnete Events** (einschließlich Anfangszustand), darunter 21 `delta.rejected`, 14 `turn.begun`, 12 `cmd.resolved`, 11 `extract.applied`, 2 `overreach.noted`, 1 `guild.registered` **nicht vorhanden**. Nur eine `scene.moved`: zum Stadtort `loc.glassmere`.
- Ausgewertet: `run.json`, `batch.json`, `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `evaluation.json`, `player.jsonl`, `report.md`; Modellprompts und in den Events tatsächlich gebuchte Resultate gegengeprüft. **Kein eigener GLM-/ST-Nachtest**.

## 2. Kurzdiagnose

**Der Abbruch war sachgerecht.** Das Problem ist **nicht**, dass die Engine `Cleave` oder `Bull's Stamina` als Skills vergeben hätte. Die Charaktererstellung wurde in Turn 2 korrekt abgeschlossen. Ab Turn 4 klaffen jedoch **Karten-/Ortszustand, Planner-Kommandos und Narrator-Fiktion** auseinander; die falsche zweite Charaktererstellung verstärkt die Drift und gelangt als **scheinbarer Weltfakt** in den Zustand. Am Ende wird sogar eine auf die Gildenregistrierung bezogene **20-cp-Zahlung** mechanisch abgebucht, obwohl die Mitgliedschaft weiter abgelehnt wird.

| Runner-Turn | Echte Aktion / Engine-Ereignis | Narrator / Folge | Einordnung |
|---|---|---|---|
| **1** | `creation.class_selected`: `warrior` | System zeigt Warrior-Skillpool | Korrekt |
| **2** | `creation.completed`: **`warrior.heavy_slash` und `warrior.guard`**, Starter-Langschwert, schwere Rüstung | System meldet `CHARACTER CREATION COMPLETE` | **Korrekt; nicht erneut öffnen** |
| **3** | `go` nur nach `loc.glassmere`, `scene.moved` nur in die **Stadt** | Guild-Schild und offenen Eingang, Frontcounter als sichtbare Kulisse | Kein `scene.moved` in `loc.glassmere.guild_hall` |
| **4** | Der Planner deutet „approach the front counter and ask … how I can register“ als `guild.register`; **refused: not at a Guild hall** | Erzählt die reale Thekenszene im Inneren | **Erste Zustandsdrift**: physischer Innenraum nicht gebucht; bloße Frage als Anmeldung interpretiert |
| **5** | Wieder `guild.register refused: not at a Guild hall`; ohne Zahlung | Narrator erfindet blockierende **`CHARACTER CREATION — STEP 1/2`** | **Halluzinierte Systemmechanik** |
| **6** | „Warrior“ → `other`, keine `creation.class_selected` | Narrator erfindet zweite Skill-Auswahl `Cleave`, `Shield Bash`, `Bull's Stamina`, `War Cry` | Nicht der kanonische Warriorpool |
| **7** | `development.accept` für Cleave und Bull's Stamina, **beide refused: no offer** | Erfundene Auswahl wird als „noch nicht angenommen“ weitererzählt | **Schutz der Skill-Integrität funktioniert** |
| **8–10** | Keine neue Klasse oder Skills; keine `creation.completed` | Narrator beharrt auf dem erfundenen Menü, wiederholt Klassenfrage am Messstein | Erzähl- und Spielerschleife |
| **11** | `guild.register refused: not at a Guild hall`; **keine `coin.changed`** | Narrator erzählt Zahlung, erfolgreichen Mitgliedsausweis und Boardzugang | `overreach.noted`: **payment + register**; objekt-/Guild-Firewall verhindert Buchung, Erzählung bleibt irreführend |
| **12** | `board.read refused: no Guild board here` | Narrator erklärt nun plötzlich, dass Spieler **nicht** registriert sei | Weitere Fortschrittsblockade |
| **13** | Runner-Eingabe `#audit`, kein eigentlicher World-Turn | System zeigt letzte verworfene Fakten | Nicht zu einem zusätzlichen Spielzug umdeuten |
| **14** | `pay` **resolved**: **`coin.changed` 50→30 cp**, `transaction.completed` an Clerk; danach `guild.register refused: not at a Guild hall` | Narrator erzählt **erneut** erfolgreiche Mitgliedschaft, Guild-Slip und Board | **Finanzielle Buchung ohne die bezweckte Mitgliedschaft**, separater Defektkandidat |
| **15** | Runner-Eingabe „I take the registration slip…“ wird **während Generierung manuell unterbrochen**; `take` nur autorisiert, kein nachgewiesener Übergabe-Event | Kein abgeschlossener Antwortturn | Bewusster Stopp, kein Modellausfall |

### 2.1 Der wichtigste Folgeschaden: falsche Systembehauptung als Weltfakt

Auf Runner-Turn **5** nimmt der Extractor die vom Narrator frei erfundene blockierende Charaktererstellung als **`fact.asserted`** auf: Subjekt `npc.npcglassmere_clerk`, Prädikat `interface`, Inhalt sinngemäß **`CHARACTER CREATION STEP 1/2 blocks everything: Alaric must choose a Base Class ...`**. Dieser Fakt wird später durch die normalen Retrieval-/Relevant-Facts-Prompts erneut dem Narrator angezeigt. Es ist somit **nicht nur ein einmaliger Prosa-Fehler**, sondern ein persistierter falscher Weltfakt mit selbstverstärkender Rückkopplung.

Die Norm im ursprünglichen .110-Narratorprompt lautet ausdrücklich, **System-/Mechanikautorität** komme allein vom Engineblock. Schon Turn 3 enthielt im Engineblock klar: **`CHARACTER CREATION is complete (the System handled it; its menu at the start of the chat is closed)`**. Zugleich bleibt der ursprüngliche First-Message-Text `CHARACTER CREATION — STEP 1/2` als historischer Chatanfang sichtbar. Die korrekte Autorität wurde also **mindestens einmal ausdrücklich geliefert**, später dennoch durch die erfundene aktuelle Blockade unterlaufen. Eine bloße Prompt-Wortlauterweiterung darf nicht als alleiniger Sicherheitsfix gelten.

### 2.2 Kein erworbenes Cleave oder Bull's Stamina

Diese Skills existieren **nicht** im definierten Warrior-Starterpool (`content/classes.json`): **Heavy Slash, Guard, Power Strike, Quick Slash, Charge, Deflect**. An Turn 7 verweigert die Engine die beiden `development.accept`-Kommandos, und `evaluation.character.skills` enthält ausschließlich Heavy Slash und Guard. **Kein illegales Skill-Gain, keine doppelte Klassenvergabe.** Ein späterer organisch validierter Skill könnte einen freien Namen erhalten, doch dies ist hier ausdrücklich nicht passiert. Die Gildenangestellte kann keine zweite Startauswahl auslösen.

## 3. Engste wahrscheinliche Ursachen, getrennt vom Symptom

### 3.1 Orts-/Planner-Übergang statt neue NPC-Präsenzregel

Die erste Ortsbewegung endete **kanonisch in der Stadt**. Das Guild-Schild ist eine sichtbare Wegmarke, die Gebäudeschwelle wird von der Engine nicht überschritten. Der nächste Spielerinput „approach the front counter and ask …“ enthält den körperlichen Weg zum Schalter, aber der Planner gibt **nur `guild.register`** aus. Nach aktuellem `commands.js` muss Registrierung am tatsächlichen Guild-Hall-Ort oder bei autorisierter, belegter früherer GO-in-diesem-Turn konditional erfolgen. Die Engine verweigert deshalb technisch folgerichtig. **Falsch** ist der vollständige, nicht autorisierte Wechsel in den erlebten Innenraum und die Umdeutung einer Frage zur Registrierungsentscheidung. Präzise spätere Lösung prüfen: körperliche Annäherung an den bekannten Halleneingang **als GO zur Guildhall korrekt erfassen**, ggf. kombinierte Anfrage **nur** als Frage behandeln; andernfalls den Narrator eindeutig am Eingang halten. **Keine generelle Innenraum-Teleportation aus jeder Erwähnung eines Counters.**

### 3.2 Narrator-/World-Sync und Authority-Provenance

Die Engine gibt `CANNOT REGISTER — only at a Guild hall` aus, die Fiktion etabliert aber kontinuierlich eine andere Wahrheit. Der Worldfilter verwirft teils `person.new` und `fact` mit **`scene_context`** und die behauptete Mitgliedschaft mit **`engine_owned_fact`** (das schützt die Engine). Andere allgemeine freie Fakten, darunter das **erfundene Systemmenü**, werden gebucht und anschließend abgerufen. Zu prüfen ist ein **gezielter Autoritätscheck für Fakten über Enginezustand/Charaktererstellung** im vorhandenen Firewall-/World-Pfad. Nicht pauschal jede Erwähnung eines magischen Interfaces oder jeder NPC-Meinung verbieten; der eigentliche falsche Claim lautet **gegenwärtig offene Charaktererstellung** trotz `creation.completed`.

### 3.3 Registrierungskosten und Atomizität

Turn 14 (Engine-Turn 13) meldet **zwei Befehle**: `pay` 20 cp an die vorhandene Clerk und `guild.register`. Der erste wird unabhängig gebucht, der zweite mangels Guild-Hall-Ort abgelehnt. Die Nutzerformulierung **`hand the clerk two silver to finish my registration`** bindet die Zahlung eindeutig an den Registrierungszweck. Für eine **Registration Fee** ist eine atomare Ausgabe/Gegenleistung oder mindestens eine klare bedingte Zahlung zu bevorzugen: **keine 20-cp-Gebühr ohne gültige Hallenregistrierung**, es sei denn der Spieler übergibt sie **ausdrücklich als unabhängiges Geschenk/Tipp**. Bereits vorhandene `openRegistration`, `REGISTRATION_OFFER`, `registerEvents` und `offer.accept` zuerst auf Anwendbarkeit prüfen; keinen neuen Geld-/Marktplatzpfad bauen. Test muss 50 cp + keine Mitgliedschaft bei abgelehnter Registrierung erhalten, nicht 30 cp.

### 3.4 Weitere, separat zu prüfen

- Das statische First Message zeigt noch **Baseline 5**, der autoritative `campaign.started`-State verwendet bereits **Baseline 7** (Warrior danach STR/VIT 8). Kein aktueller Statbetrug, aber ein vermeidbarer veralteter Prompt-/UI-Reiz im selben Einstieg.
- Die erdachte Guildplate und erdachtes Gildenboard werden teilweise korrekt blockiert (`pc_inventory`, `engine_owned_fact`, `board.read`). Die **falsche Erzählung** kann dennoch weitere Modellaktionen auslösen. Schutz und Spielbarkeit getrennt messen.
- Der Clerk wird im `scene` des **Stadtortes** neu erzeugt, nachdem seine an der Hallenlocation angelegte erste Variante mit `scene_context` verworfen worden war. Auch hier nicht nachträglich den NPC mit einer anderen gleichnamigen Person verschmelzen.
- `#audit` zeigt lokale Ablehnungen, aber keinen vollständigen, handlungsorientierten Vorschlag zur Korrektur der fehlenden Hallenankunft. Keine automatische UI- oder HUD-Erweiterung aus einem einzelnen Fall ableiten.

## 4. Konkrete Regressionen vor einem künftigen Fix

1. **Positiv:** Nach `creation.completed` bleiben Klasse, exakt zwei Starter-Skills und Startausrüstung fixiert; weder Guild-Mitarbeiter noch Narrator-Systemtext öffnen eine zweite Charaktererstellung.
2. **Positiv – Eintritt:** Player GO erreicht zuerst nur Glassmere und sieht Guildschild. Nächster Spielerzug „I approach the counter inside the guild and ask about registration“ wird plausibel an die Hallenschwelle beziehungsweise den Innenraum gebunden, **ohne automatisch eine Gebühr zu zahlen oder Mitgliedschaft zu vergeben**. Nach bestätigtem Hallenaufenthalt läuft normale Registration genau einmal durch.
3. **Negativ – keine Teleportation:** Nur `I see the Guild sign` oder `I ask where the Guild is` schafft noch keinen Halleneintritt. Eine Erzählung vom Counter ohne `arrive`/GO bucht keine Phantom-Gildenmitgliedschaft.
4. **Positiv – Guildgeschäft:** Formulierung „I pay two silver to register“ in echter Hall, ein bestätigtes Registration-Offer oder der bestehende Register-Pfad bucht **genau einmal** 20 cp und `guild.registered` samt offizieller Plate, nicht zusätzlich freie NPC-Zahlungen.
5. **Negativ – Zahlt trotz Ablehnung nicht:** Explizit zur Registrierung zweckgebundene Gebühr bei falscher Hallenlocation/abgelehnter Anmeldung **ändert kein Geld**. Eine **ausdrücklich selbstständige Schenkung** an eine tatsächlich anwesende Clerk darf eine andere rechtmäßige Aktion bleiben.
6. **Negativ – Halluzinations-Fact:** Erfundene Tatsachen wie `CHARACTER CREATION STEP 1/2 blocks everything` nach `creation.completed` **dürfen nicht** als kanonische Welt-/NPC-Fakten über den derzeitigen Systemzustand persistiert werden. Historischer Chatanfang und allgemeine Erinnerungen sind keine autoritative Wiederöffnung.
7. **Positiv – freier Skill später:** `development.accept` ohne mechanisches Angebot bleibt `no offer`; zulässiges späteres Training/ein echter organischer Skill wird unverändert auf dem bereits bestehenden Entwicklungsweg verarbeitet. Nicht pauschal alle Worte `Cleave`/`Stamina` verbieten.
8. **Regressionsschutz:** Vorhandene GO-/Ankunfts-, Zahlungs-/Offer-, NPC-Präsenz- und Guildhall-/Board-Tests bleiben grün; keine Abschwächung der Autoritätsfirewall. Ganze **Turn-3-bis-14-Storyfolge** zusätzlich gegen Originalevents prüfen, nicht nur ein isoliertes CLI-Kommando.

## 5. Priorität, Abhängigkeiten und Fazit

**P1-Kandidat als enges Bündel von drei Ursachen:** (1) glaubwürdiger Guildhall-Übergang/Planner-Interpretation, (2) Schutz gegen die Persistenz **aktiver, bereits falscher Engine-Menüs**, (3) Kopplung registrierungsgebundener Zahlung an ihre Gegenleistung. **Nicht** als globales World-Architektur-Redesign, Guild-Feature-Ausbau oder Skillbalancing-Patch beginnen. Der neue Befund besteht **auf .110** (Commit `da933e9`), ist somit nicht durch die früheren .107–.109 NPC-Anwesenheits-Gegenreviews erklärt. Ob er neue Regression oder älterer, bisher nicht ausgelöster Ablauf ist, benötigt zusätzliche Vergleichstests.

**Schluss:** Die Engine schützt Skills, Klasse, amtliche Guildmitgliedschaft und viele Weltfakten; der Narrator und einige Persistenz-/Zahlungsgrenzen lassen aber einen festgefahrenen Einstieg zu. Der Spielerabbruch vermeidet einen langen, nicht repräsentativen Guild-/Progressionstest. Die unterbrochene Eingabe ist **manuell** und kein Provider-/Planner-Absturz. **Keine Fixfreigabe**, erst technische Ursachenprüfung und rot→grün-Gegenproben.