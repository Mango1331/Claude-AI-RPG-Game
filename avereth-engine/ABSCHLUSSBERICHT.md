# Abschlussbericht: Avereth RPG-AI-Architektur neu bewertet und umgesetzt

Stand: 23.09.2026. Ergebnis im Ordner `avereth-engine/` (SillyTavern-Extension). Das Paket v1.24 aus Phase 1 bleibt als Legacy-Modus unverändert.

## 1. Architekturentscheidung

**Die Architektur wird in ihrem technischen Kern neu gebaut. Inhalte und Erzählverhalten bleiben.**

Gewählt ist Variante B, ein Hybrid:
- Die **Avereth Engine** (SillyTavern-Extension, reines JavaScript, keine Abhängigkeiten) besitzt:
  - Regeln, echten Zufall und alle Kampfabläufe;
  - Charaktererstellung, XP und Level;
  - Coin, Munition und Kampagnenzustand;
  - das Wissen und die Erinnerungen jeder Figur.
- Das **Sprachmodell** erzählt, interpretiert die Welt und schlägt neue Erzählfakten in einem Report vor (`<avereth>{…}</avereth>`). Die Engine validiert den Report, bevor er Kanon wird.
- **WorldInfo als Laufzeitsystem entfällt.** Die Character Description lebt als *Narrator Contract v3* weiter, weil ihre Verhaltensregeln im Testrun nachweislich wirken.

## 2. Begründung und Vergleich

Fünf Varianten wurden mit echten Trade-offs verglichen (Details: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) §5):

| | A: WI-only | **B: Hybrid** | B-lite: MVU | C: Server | D: Tool-Calling |
|---|---|---|---|---|---|
| Konsistenz | niedrig | **hoch** | mittel | hoch | mittel |
| Langzeitgedächtnis | niedrig | **hoch** | mittel | hoch | mittel |
| Tokens/Zug | hoch | **niedrig** | mittel | mittel | mittel bis hoch |
| Robustheit (lange Kampagnen) | niedrig | **hoch** | mittel | hoch | niedrig bis mittel |
| Komplexität | niedrig | **mittel** | mittel | hoch | mittel |
| Modellunabhängigkeit | mittel | **hoch** | mittel | hoch | niedrig |
| LLM-Aufrufe/Zug | 1 | **1** | 1 | 2–3 | 2+ |

- **A scheidet aus**, weil die Fehler aus Testrun-v1 strukturell sind: kein Zufall, keine Persistenz, übersprungene Prozeduren.
- **C scheidet aus** wegen Betrieb, Latenz und Blindheit gegenüber Swipes und Edits.
- **D scheidet aus**, weil wieder das LLM entscheidet, ob Regeln angewandt werden.
- **B-lite scheidet aus**, weil das LLM dort den Zustand selbst schreibt.

Die Recherche mit Quellen steht in §3 von ARCHITEKTUR.md. Übernommen wurden u. a.:
- per-Agent-Gedächtnis und Recency/Importance/Relevance-Retrieval (Generative Agents);
- Fakten mit Gültigkeitsfenster statt Löschen (Graphiti/Zep);
- Wissen mit Quelle und falschen Überzeugungen (Talk of the Town);
- Event Sourcing;
- „kleinste hochrelevante Tokenmenge“ und Positionierung (Anthropic, Lost in the Middle);
- wörtliche Episoden neben Extraktion („Verbatim beats extraction“);
- Zustand pro Nachricht (SillyTavern `message.extra`, MVU).

## 3. Erkenntnisse aus Testrun-v1

Details: [docs/TESTRUN_V1.md](docs/TESTRUN_V1.md).

**Was funktionierte:**
- die Charaktererstellung;
- das Kampf-Gate;
- die Formeln, sofern das Modell sie im Kontext hatte;
- die Agency-Regeln der CD, die im Reasoning aktiv angewandt wurden.

**Was scheiterte:**
- **Zufall:** „Let's roll: say 44“.
- **Persistenz:** Der Kampf-Snapshot ging verloren, weil der Host-Tracker keinen Platz hatte.
- **Prozedurtreue:** DefeatXP und Zugreihenfolge fehlten.
- **Content-Lücke:** Das Trapper-Profil wurde improvisiert.
- **Interpretierter Zustand:** Ambush trotz Verdacht; ein erfundener zweiter Pfeil; widersprüchliche Positionen.
- **Wissensleck:** „boy“ für einen unsichtbaren Schützen.
- **Abgeleitete Werte:** Init 8 statt 9.
- **Fehltreffer bei lexikalischen WI-Schlüsseln** auf Host-Text („Multi-Hit“, „Frozen“).
- **Ladeumfang:** START lud 15 Monster und 30 Aktionen für einen Kampf gegen einen Menschen.

**Lehre:** Alles, was Zufall, dauerhaften Zustand oder exakte Prozeduren braucht, gehört in Code. Kontext sollte vom Zustand gesteuert werden, nicht von Wörtern.

## 4. WI-Bewertung und Optimierung

Alle 61 Einträge wurden einzeln bewertet (P/S/R/D/X/N; Details: [docs/WORLDINFO_BEWERTUNG.md](docs/WORLDINFO_BEWERTUNG.md)):

| Bereich | Neu |
|---|---|
| Mechanik-Engines (START/PENDING/ACTIVE, Creation, Kernel-Formeln, XP, Ökonomie, Checks) | **ableitbar**, als Engine-Code |
| System-Befehle | **ableitbar**, Engine antwortet ohne LLM |
| Lore | **abrufbar**, per Realm und kuratierter Schlüsselphrase |
| Seltene Regeltexte (Domain, Evolution, Elemente, Loot, Ökonomie) | **situativ oder abrufbar**, wörtlich erhalten |
| CD-Verhaltensregeln | **permanent** |
| Megumin-NPC-Patch | mit Engine **redundant** |

Keine Regel ging verloren: Tests prüfen, dass jede Zahlkonstante wörtlich im Core-Text steht und die Skill-Zahlen ihrem Quelltext entsprechen.

Messung auf Basis der echten Testrun-Züge (`node tools/testrun_compare.js`): Der Avereth-eigene Prompt-Anteil sinkt von 5,6–9,0k auf 5,0–5,3k Token pro Zug (−10 % bis −43 %; Kampfzug −43 %). Der Engine-Block selbst ist 1,0–1,3k Token groß. Der größere Gewinn liegt aber in der Richtigkeit, nicht in den Tokens.

## 5. Architekturüberblick und Datenfluss

```
Spielernachricht → Interceptor → fold(Events bis dahin) → playerTurn:
                     Intent → Creation | Kampf | Stealth | CHECK DIE | #Befehl
                  → Events auf der Spielernachricht (swipe-sicher, gleiche Würfel bei Regenerate)
                  → Context Builder:
                     Header · PC · NPC-Karten (nur eigenes Wissen) · Kampf · harte Fakten
                     · RELEVANT (Retrieval) · Lore · Regeln (situativ) · Korrekturen · RESOLVED · Report-Format
                  → LLM (Narrator Contract v3) → Antwort + <avereth>-Report
                  → processReply: Report validieren · Wahrnehmung (wer sah Alaric) · Episode · Tracker-Drift
                  → Events auf dieser Antwort (pro Swipe) · Report aus der Anzeige entfernt
```

**Trennung der Ebenen:**

| Ebene | Speicherort |
|---|---|
| Weltwahrheit | `facts` mit Gültigkeit; harte Fakten nur mit Ursache |
| Figurenwissen | `knowledge[who]` mit Quelle |
| Überzeugung | `claims` (können falsch sein) |
| Erinnerung | `memories` nur für Zeugen, je Betrachter formuliert |
| Erzählung | Chattext, nie direkt Wahrheit |

## 6. Finale Datei- und Datenstruktur

```
avereth-engine/
  manifest.json · index.js · style.css      SillyTavern-Anbindung (Interceptor, Events, Panels, Einstellungen)
  src/        state rng content derived creation npcgen progression economy combat checks intent
              knowledge delta retrieval context commands validate engine host
  content/    rules.json · rules_text.json (Core/System wörtlich) · classes.json · monsters.json · gear.json
              lore.json · npc_templates.json (PROPOSED) · campaign_start.json · narrator.json · manifest.json
              narrator/Avereth_Narrator_Contract_v3.txt
  schemas/    11 JSON-Schemas (9 Content-Dateien, Events, Report)
  tests/      unit/ · scenarios/ · testrun_v1/ (fixture.json aus dem Testrun-Branch)
  tools/      migrate_content.py · testrun_compare.js · browser_smoke.mjs
  docs/       ARCHITEKTUR · DATENMODELL · MIGRATION · WORLDINFO_BEWERTUNG · TESTRUN_V1
```

Kampagnendaten stehen pro Nachricht in `message.extra.avereth`. Der Zustand ist `fold(events)` und wird nie gespeichert (siehe [docs/DATENMODELL.md](docs/DATENMODELL.md)).

## 7. Erstellte Dateien

| Bereich | Dateien |
|---|---|
| Engine | 20 Module in `src/` (etwa 4.000 Zeilen) |
| SillyTavern-Anbindung | `index.js`, `manifest.json`, `style.css` |
| Content | 10 JSON-Dateien und der Narrator Contract v3; 5 davon reproduzierbar per Migration erzeugt |
| Schemas | 11 JSON-Schemas |
| Tests | 13 Testdateien plus 2 Fixtures |
| Werkzeuge | 3 (Migration, Token-Vergleich, Browser-Smoke-Test) |
| Doku | 10 Dokumente: README, Abschlussbericht, 8 Fachdokumente (inkl. Review-Antwort und Auswertungen der Testruns 2 und 3) |

## 8. Migration

Details: [docs/MIGRATION.md](docs/MIGRATION.md).

- Core, System, Content und Lore wurden wörtlich übernommen: Texte byte-identisch, Zahlen per Parser und Rückvergleich.
- `tools/migrate_content.py` erzeugt die generierten Content-Dateien reproduzierbar; zweiter Lauf, byte-identisch geprüft.
- Die CD v2.3 wurde zum Narrator Contract v3; alle Verhaltensregeln sind unverändert.
- Neu und als **PROPOSED** markiert:
  - menschliche NPC-Vorlagen;
  - Aufmerksamkeitszustände;
  - Detection-Default für Kreaturen;
  - Schwierigkeitsskala;
  - NPC-Verhalten;
  - CHECK DIE;
  - `recover`-Schlüssel;
  - Quest-XP-Sperre;
  - Basic Attack nach Waffenfamilie und Klassenableitung für Abenteurer-NPCs;
  - Spieler-Hoheit im Report (`authorization`, `taken_by`, `forced_by`) und keine Wiederbelebung per Report.

  Diese Punkte bitte als Autor bestätigen.
- Laufende Kampagnen ohne Engine werden nicht automatisch konvertiert (neuer Chat nötig). Das v1.24-Paket bleibt als Legacy-Modus.

**Umstieg in vier Schritten:**
1. Den Ordner als Extension installieren.
2. Die Kartenbeschreibung durch den Contract v3 ersetzen.
3. Die WorldInfo v1.23 deaktivieren.
4. Einen neuen Chat starten.

## 9. Tests

`npm test`: **117 Tests, alle bestanden.** Dazu kommt `node tools/browser_smoke.mjs`: echtes Chromium mit gemocktem SillyTavern-Kontext, bestanden.

| Gruppe | Inhalt |
|---|---|
| Content | Schemas; Querverweise; jede Regelkonstante gegen den wörtlichen Core-Satz; Skill-Zahlen gegen den Quelltext; Report-Schlüssel = Validator-Schlüssel |
| Regeln | abgeleitete Werte aller 5 Klassen; **beide Rechenbeispiele aus Core #11** (15 und 17); Defense-Floor; Treffer, Deckung und Clamp; keine Crits für Kreaturen; illegale Reichweite ohne Kosten und Würfe; Munition; Ambush nur bei `unaware` (+25 pp Crit); Initiative-Gleichstände; Multi-Hit-Stopp; Effektdauer; NPC-Verhalten; DefeatXP; Level-Schleife |
| Intent | Kampf-Gate; Skills; Zielwahl; Creation; Schleichen; **40 Angriffs- und 34 Nicht-Angriffs-Formulierungen aus dem v1.24-Korpus**; Drohungen und Fragen |
| Report | tolerantes JSON; engine-owned Werte; Figuren; Geheimnisse; harte Fakten; Coin, Items, Quests; CHECK DIE; Quest-XP; NPC-Festlegung |
| **Langzeit-Szenarien** | **Wiedersehen nach 200 Zügen** (Mara erinnert Name, Versprechen, Haltung); **Geheimwissen A vs. B** (Brom weiß, Mara nicht, bis es ihr erzählt wird; Alaric nicht); **zerstörte Stadt** (harter Fakt, Ortsstatus, veraltetes NPC-Wissen markiert, Widerspruch abgelehnt); **Beziehungen** über Zeit mit Gründen; **Identität** (unsichtbar → gesehen → Name); **Progression** über 35 echte Kämpfe (XP, Level, Punkte, Replay = Live-Zustand); **große Historie** (12.000 Events; die eine relevante Erinnerung wird gefunden; Fold etwa 30–50 ms) |
| SillyTavern-Verhalten | Swipes mit eigenen Fakten; veraltete Swipe-Kopien ignoriert; Regenerate mit gleichen Würfeln; Edit und Delete; Befehle ohne LLM; `#system`; Legacy-Chats |
| **Review-Fälle** (externe Review) | unautorisierte Reise/Zahlung/Abgabe/Quest-Annahme abgelehnt, Diebstahl/Festnahme mit Täter erlaubt; nur festgelegte NPCs kämpfen, mehrere Festlegungen; Zeugen ≠ Anwesende, `public`; Hörensagen → Claim; keine Wiederbelebung; Aufmerksamkeit nur durch Heimlichkeit verloren; NPC-AoE trifft Alaric; AoE-Ziel 2 mit Barrier; NPC-Bogenschütze mit endlichen Pfeilen; Wache anderer Stadt ≠ alte Wache; Selbstvorstellung nur an Angesprochene; Retcon per Edit; Zustimmungserkennung |
| **Testrun-v1-Regression** | die echten Eingaben und Antworten: Init 9 plus Drift-Korrektur; keine Fehltreffer-Regeln; kein Kampf beim Spurenlesen; RNG-Würfel; Trapper L2/HP 90 aus Vorlage; DefeatXP 20 gesperrt; kein falscher Ambush; ein Pfeil pro Schuss; STA 88; Snapshot erhalten; „has never seen him“; Tokenbudget; **Replay ganz ohne Report** (Mechanik korrekt, nichts erfunden, Korrektur angefordert) |

**Nicht getestet:** ein Live-Lauf mit GLM in deinem SillyTavern. Dafür gab es aus dieser Umgebung keinen Zugang. Beim ersten echten Lauf bitte prüfen:
- Hängt GLM-5.3-Flash den Report zuverlässig an?
- Stimmen die Tokenzahlen?
- Wie verhält sich die Latenz?

## 10. Erweiterungsmöglichkeiten

- **Fehlender Report:** optionaler Extraktionspass (`generateRaw` mit `jsonSchema`), nur wenn der Report fehlt oder ungültig ist.
- **Semantisches Retrieval:** `rank(…, {semantic})` ist vorbereitet, etwa für die Embeddings der SillyTavern-Vektorspeicherung.
- **Gedächtniskonsolidierung:** alte Episoden zu Reflexionen mit Belegen verdichten (Generative Agents); Ranking auf die neuesten N plus wichtige Einträge begrenzen, für sehr lange Kampagnen.
- **Noch nicht modellierte Mechanik** (Regeltexte liegen bereit):
  - Proficiency-Fortschritt (PP) und Skill-Lernen;
  - Klassen-Evolution ab Level 15;
  - Domains;
  - Elemente und Resistenzen;
  - Statuseffekte mit Mehr-Zug-Dauer;
  - Loot-Instanzen und Läden.
- **Welt:** Fraktionsruf als Relationen, NPC-Tagesabläufe, Fristen und Threads mit Weltuhr.
- **Komfort:** UI-Panel (Charakterbogen, Journal), Kampagnen-Export und -Import. (Retcon geht bereits per Edit mit neuem Report-Block.)
- **Aus der externen Review, bewusst später:** NPC↔NPC-Geometrie für Verbündete und Beschwörungen; „Pending Check“ statt sichtbarem CHECK DIE; Snapshots für sehr lange Logs.

## Unabhängiger finaler Review

Die Prüfung erfolgte gegen die im Auftrag genannten Kriterien. Die Befunde stammen aus Tests, Edge-Case-Proben und einer gezielten Code-Durchsicht. **Alle gefundenen Probleme sind behoben.**

| # | Befund | Kategorie | Behebung |
|---|---|---|---|
| 1 | Im selben Report eingeführte Figuren waren für andere Schlüssel unsichtbar (`{new: wolf, combat: {by: wolf}}` abgelehnt) | fehlende Validierungslogik | Die Report-Verarbeitung kennt die im selben Report angelegten Figuren |
| 2 | „what does Power Shot do?“ wurde als Angriff erkannt; Drohungen in wörtlicher Rede ebenso | Inkonsistenz mit Core #23 | Fragen und Zitate zählen nicht als Festlegung |
| 3 | „creep past the guard“ → unbekannter Skill *Guard* | unzuverlässiger Intent | Unbekannte Skills nur bei eindeutigem Namen oder „use/cast X“ |
| 4 | Lore-Fehltreffer („forest“ → Waldreich am anderen Ende, „power“ → Lebensspannen) | unnötiger Kontext | kuratierte Schlüsselphrasen und Realm; Tracker-Blöcke ignoriert |
| 5 | Wörtliche Spielereingaben wurden als NPC-Erinnerung gespeichert (Leck privater Absicht) | State-Trennung | Episoden nur für Alaric; NPCs erinnern „first saw“ durch Wahrnehmung |
| 6 | Keine Erholung außerhalb des Kampfs möglich (HP gehört der Engine) | Memory/State | `recover` mit Grenzen (nie im Kampf, nie über Maximum) |
| 7 | SillyTavern kopiert `extra` in neue Swipes (veraltete Fakten) | Swipe-Konsistenz | `text_hash` pro Antwort; veraltete Kopien werden ignoriert |
| 8 | Deckung blieb nach Bewegung erhalten | Regelinkonsistenz | Bewegung hebt die Deckung auf |
| 9 | Selbstvorstellung ging bei gerade eingeführten NPCs verloren | Timing | Auswertung nach dem Report |
| 10 | `#system` fand die Hilfetexte statt der Formel | unzuverlässiges Retrieval | Absatz-BM25 über Core/Content |
| 11 | Initiative-Gleichstand verbrauchte einen überflüssigen Wurf | Regeltreue (Core #24 „einmal“) | ein Wurf pro Gleichstand |
| 12 | Quest-XP (Core #25) wurde nie vergeben | fehlende Mechanik | Stufe und Typ bei Angebot gesperrt, einmalig vergeben |
| 13 | „the grey wolf“ bei zwei Wölfen → Rückfrage | Zielwahl | der spezifischste Name gewinnt |
| 14 | „Regenerate“ nach `#status` ließ das LLM den Befehl beantworten; der Befehl blieb im Verlauf | unnötige LLM-Abhängigkeit, Kontext | Generierung wird abgebrochen; die Befehlszeile ist aus dem Prompt ausgeblendet |
| 15 | Lexikalische Normalisierung auf das Maximum blähte schwache Treffer auf | Retrieval | absolute BM25-Skala |
| 16 | Tote NPCs mit voller Wissenskarte | Kontext | eine Zeile |
| 17 | Interne IDs in Engine-Texten („mon.boar attacks“) | Qualität | lesbare Namen |
| 18 | Überflüssiger Code (`classOptions`, `isCurrent`, `fmt`, `_regexes`, ein ungenutzter Import), veraltete Manifest-Felder | Overengineering | entfernt |

**Bewertung nach Kriterien:**
- **Overengineering:** keine Abhängigkeiten, kein Server, keine Datenbank. Embeddings, SQLite, ein zweiter LLM-Pass und Tool-Calling wurden bewusst nicht eingebaut.
- **Kontext:** Der Engine-Block ist etwa 1,0–1,3k Token groß; RESOLVED steht am Ende; Regeltexte kommen nur situativ.
- **Redundante WI:** Im Engine-Modus gibt es keine; die WI v1.23 wird deaktiviert.
- **State-Trennung:** Einziger Schreiber ist der Reducer; Wahrheit, Wissen, Überzeugung, Erinnerung und Erzählung sind getrennt.
- **Memory:** Langzeit- und Zeugen-Tests bestehen.
- **Retrieval:** Strukturierte Signale dominieren und werden getestet.
- **LLM-Abhängigkeit:** Die Mechanik läuft vollständig ohne LLM.
- **Inkonsistenzen:** Report-Format aus einer Quelle; Konstanten gegen Core getestet.
- **Validierung:** alle geforderten Fehlerklassen abgedeckt (ARCHITEKTUR.md §11).

**Verbleibende, bewusst akzeptierte Grenzen:**
- Der CHECK DIE ist vor der Check-Entscheidung sichtbar.
- Die Report-Qualität hängt vom Modell ab; fehlt der Report, gehen nur neue Erzählfakten verloren.
- Absichtserkennung per Regeln: Ungewöhnliche Formulierungen werden als Erzählung behandelt, nie als falscher Kampf.
- Beim Streaming ist der Report kurz sichtbar, bis er entfernt wird.

## Nachtrag: externe Architektur-Review

Die ChatGPT-Review wurde Punkt für Punkt per Probe gegen den Code geprüft und entschieden (A übernommen / B beibehalten / C dritte Lösung). Details, Belege und die unabhängige Nachprüfung: [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md).

- **Übernommen (A):** nur festgelegte NPCs kämpfen; AoE mit voller Schadenskette pro Ziel; feindliche AoE trifft Alaric; endliche NPC-Munition; Deskriptoren nur lokal; adversariale Tests; Testchat vor der Langzeitkampagne.
- **Dritte Lösung (C):**
  - Spieler-Hoheit per `authorization` plus `taken_by`/`forced_by`;
  - quellenbasiertes `learn` (Gehörtes wird Claim);
  - explizite Zeugen (`witnesses`/`public`);
  - Retcon per Edit mit neuem Report-Block (nur neueste Antwort);
  - Aufmerksamkeit fällt nur durch Heimlichkeit zurück;
  - keine Wiederbelebung per Report.
- **Beibehalten (B):** NPC↔NPC-Distanz (als Grenze dokumentiert), CHECK DIE (nächste Stufe „Pending Check“ dokumentiert), keine Snapshots (gemessen: 1.000 Züge ≈ 20 ms Fold).
- **Kosten:** ein neuer Report-Schlüssel (`forced_by`), etwa +70 Token pro Zug, keine neue Kontextsektion.

**Zweite Review (vor Testrun 2):** Die Schwelle war „nur, was den Test verfälschen oder State beschädigen kann“. Umgesetzt wurden drei kleine Engine-Fixes: Unbemerkte Zuschauer erfahren keinen Kampftod, Retcon gilt nur für die neueste Antwort, und NPC-gegen-NPC wird nicht mehr zu einem Angriff auf Alaric. Alles Weitere steht im Backlog mit Messpunkten für den Testrun: [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md).

**Testrun 2 (erster echter Lauf, GLM-5.3-Flash):**
- **Was lief:** Report 11/11 vorhanden, Mechanik exakt nach Core, Wissen und Agency sauber. Der Lauf ist per Replay exakt reproduzierbar.
- **Fünf Engine- und Host-Fehler behoben:**
  - Fehlermeldung bei jeder Antwort durch zu frühes Neuzeichnen;
  - Starter-Kit doppelt;
  - Anwesenheit nach Ortswechsel (Schleichwurf gegen eine abwesende Figur);
  - NPC wehrte sich im Kampf nie (gespiegeltes „hold“);
  - irreführende Korrekturen.
- **Belege:** Regressionstest mit den echten Antworten, siehe [docs/TESTRUN_V2.md](docs/TESTRUN_V2.md).

**Kampfanzeige (Wunsch nach Testrun 2):** Die Engine zeigt jeden Kampf- und Probenzug als System-Zeilen oben in der Antwort. Der Block enthält Initiative, Zugreihenfolge, Würfe, `HP - Schaden = HP` und die HP aller Beteiligten und kommt direkt aus den Engine-Records. Er ist nur Anzeige (`extra.display_text`); der Prompt bleibt unverändert.

**Testrun 3 (zweiter Lauf, 14 Züge bis zum Rattenkeller):**
- **Was lief:** Mechanik exakt nach Core (Initiative, Bisse, Power Shot 37, Basic Attack 17, +20 XP), Kampfanzeige vom Spieler gelobt, kein doppeltes Starter-Kit mehr. Der Lauf ist per Replay exakt reproduzierbar (29 von 29 Records).
- **Behoben:**
  - Anwesenheit nach Ortswechsel: nur wer am neuen Ort platziert wird, ist dort (Fuhrmann und Registrarin hatten den Kampf „bezeugt“);
  - Alarics Aktion ging beim Kampfstart verloren; „the nearest one“ löst nach Entfernung auf;
  - Kampf-Vorschau: Initiative, Reihenfolge, HP und Entfernung stehen fest und sichtbar, sobald jemand angreift;
  - Report direkt nach der Erzählung (zwei Antworten wurden am Token-Limit im Dossier abgeschnitten), fehlende Reports dürfen im nächsten Zug nachgetragen werden;
  - Namen aus Refs und Vollnamen, Zahlung auf NPC-Seite, „Im Alaric“, Band-Legende, Zuschauer im Kampf, Handelszeilen (Coin, Items, Quests, XP);
  - ein Absturz, wenn eine NPC aus dem Verborgenen angreift, ohne Alaric erreichen zu können (beim Prüfen gefunden, schon im alten Code).
- **Setup:** Max Response Length ≥ 8.192; Kartenbeschreibung auf Vertrag 3.1 aktualisieren.
- **Belege:** Regressionstest mit den echten Antworten, siehe [docs/TESTRUN_V3.md](docs/TESTRUN_V3.md).

**Dritte Review (nach Testrun 3):** Neue Quests brauchen jetzt `level` und `type`, sonst werden sie nicht angelegt und die Korrektur fordert den vollständigen Eintrag an (die Rattenquest aus Testrun 3 hätte sonst 0 Quest-XP gebracht). Der Nachtrag nach fehlendem Report bleibt, wird aber im nächsten Test beobachtet; sein Korrekturtext bittet nur noch um die Entscheidungen des Zuges, nicht um neue Personen. Siehe [docs/REVIEW_CHATGPT.md](docs/REVIEW_CHATGPT.md).
