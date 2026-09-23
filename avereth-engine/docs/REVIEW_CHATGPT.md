# Externe Architektur-Review (ChatGPT): Bewertung und Umsetzung

Die Review wurde als externes Gutachten behandelt, nicht als Vorgabe. Jeder Punkt wurde vor der Entscheidung mit einer Probe gegen den Code reproduziert oder widerlegt, gegen die Anforderungen und Testrun-v1 geprüft und dann eingeordnet:
- **A:** Review übernommen.
- **B:** bestehende Lösung behalten.
- **C:** dritte Lösung, besser als beide.

Die Belege stehen als Tests in `tests/scenarios/review.test.js`, `tests/unit/intent.test.js` (authorization), `tests/scenarios/host.test.js` (Retcon) und `tests/testrun_v1/regression.test.js` (Replay ohne Report).

| Punkt der Review | Probe | Entscheidung | Umsetzung |
|---|---|---|---|
| P0: Report kanonisiert freiwillige PC-Entscheidungen (Reise, Zahlen, Abgeben, Quest annehmen) | bestätigt | **C**: statt „alle PC-Deltas nur mit Engine-Intent“ eine Autorisierungsschicht aus der Spielernachricht plus explizite Fremdeinwirkung | `authorization()` (Fragen zählen nicht, Rede schon); `taken_by` für Diebstahl, `forced_by` für Festnahme; Quest `active` nur mit Annahme; Zeitsprünge > 2 h nur mit Ruhe/Reise. Welt- und NPC-Handlungen bleiben frei. |
| P0: Zuschauer und gleiche Spezies ziehen automatisch in den Kampf | bestätigt | **A** | Kämpfer = Auslöser + festgelegte NPCs. `combat` darf eine Liste sein; `pending_combat` ist eine Liste. |
| P0: `learn` macht Unbekanntes zur Weltwahrheit | bestätigt | **C**: quellenbasiert statt pauschal | Nur `witnessed` durch einen Anwesenden legt einen Fakt an. Gehörtes wird ein Claim (`unknown`, bzw. `false` bei Widerspruch); die Figur glaubt oder vermutet ihn. |
| P0/P1: Zeugen = alle Anwesenden | bestätigt | **C**: explizite Zeugen statt Geometrie-Simulation | `who` + `witnesses` + `public` (nur wer nicht `unaware` ist). Erster Blick und Selbstvorstellung nur für NPCs, die Alaric bemerkt haben bzw. angesprochen werden. |
| Konflikt Tarnung vs. Aufmerksamkeit (aus der Umsetzung) | Testrun-Regression „boy“ | **C** | `concealed` bleibt reine Wahrnehmung (ohne Mechanikvorteil). Nur der Rückfall `aware` → `unaware` braucht erklärte Heimlichkeit. |
| P1: Edit einer Antwort behält alte Fakten | bestätigt | **C**: Edit bleibt Textkorrektur; Retcon ausdrücklich per neuem `<avereth>`-Block | `onEdited` validiert neu und ersetzt die Events; `{}` verwirft sie. |
| P1: AoE-Ziel 2+ ignoriert Barrier/Endure | bestätigt | **A** | ein geteilter Hit-/Crit-Wurf, pro Ziel die volle Schadenskette (DEF, Varianz, Endure, Barrier, HP) |
| P1: feindliche AoE trifft den PC nicht | bestätigt (Absturz) | **A** | `isOpponent`: Ziele sind Gegner der Seite des Wirkers. Ziele werden vor den Kosten bestimmt; ohne Ziel ist die Aktion illegal und kostenlos. |
| P1: NPC-Pfeile unendlich (`?? 99`) | bestätigt | **A** + Erweiterung | Munition aus dem Inventar. Kit-Köcher füllen NPC-Inventare. Verbrauch wird ins Sheet zurückgeschrieben; ohne Pfeile wählt die NPC-KI andere Angriffe. Neu: Die Klasse eines Abenteurers folgt der genannten Waffe (`archer` = Ranger), sonst gab es keine NPC-Bogenschützen. |
| P1: NPC↔NPC-Distanz nur approximiert | zutreffend | **B** | Für den PC-zentrierten Kampf ausreichend; als Grenze dokumentiert (ARCHITEKTUR §12) |
| P1: generische Deskriptoren verschmelzen Personen | bestätigt | **A** | Namen identifizieren global, Deskriptoren nur Anwesende bzw. Figuren am aktuellen Ort |
| P2: `because` zu mächtig | teilweise | **C** | Wiederbelebung per Report ist ausgeschlossen (Core #14). Allgemeine Kausalprüfung per LLM wäre unzuverlässig: `because` bleibt Pflicht und wird protokolliert. |
| Tests zu freundlich | zutreffend | **A** | adversariale Tests je Punkt; Testrun-v1-Replay ganz ohne Report (sichere Degradation) |
| Basic Attack nach Waffenfamilie = neue Regel | zutreffend | **A** (Dokumentation) | als PROPOSED gelistet (MIGRATION) |
| CHECK DIE vor der Check-Entscheidung sichtbar | bekannt | **B** | Latenz; Tool-Calling verschiebt die Entscheidung nur. Der nächste Schritt „Pending Check“ ist dokumentiert. |
| P2: Snapshots für lange Logs | gemessen | **B** | 1.000 Züge ≈ 5.200 Events, Fold ≈ 20 ms; erst bei viel längeren Kampagnen nötig |
| Installation: erst Testchat | zutreffend | **A** | README und MIGRATION empfehlen zuerst einen wegwerfbaren Testchat |
| (eigener Fund) zwei `attitude`-Änderungen in einem Report überschrieben sich | Probe | Fix | Änderungen summieren sich |

**Unabhängige Nachprüfung der Umsetzung** (Diff-Review, Proben, Replay). Alle Befunde sind behoben:

| Befund | Behebung |
|---|---|
| Claims mit Wahrheit `unknown` erschienen auf der NPC-Karte als „actually FALSE“ (betraf auch `believe`) | nur `false` wird markiert; Test |
| `taken_by`/`forced_by` kannte keine NPCs, die derselbe Report einführt (Taschendieb, Festnahme) | im selben Report eingeführte Figuren zählen; Test |
| Kämpfe aus älteren Chats ohne `current.ammo`: Alaric hätte nicht schießen können | einmalige Übernahme aus dem Sheet beim Laden; Test |
| Selbstvorstellung an eine ganze Gruppe erreichte niemanden | „everyone“/„the room“ … erreicht alle, die ihn bemerken; Test |
| Zustimmungserkennung verpasste „Here, thirty copper for the room“ und „take the caravan job“ | Muster erweitert; Unit-Test mit Positiv- und Negativfällen |
| Report-Beschreibung zu lang (+124 Token) | Zustimmungsregel einmal in der Anweisung; +70 Token |

**Kontext und Tokens:**
- Keine neue Kontextsektion, keine WI-Rückkehr.
- Neu im Report-Format ist genau ein Schlüssel (`forced_by`); dazu kommen optionale Felder in `memory`, `items`, `coin` und `combat`.
- Die Zustimmungsregel steht einmal in der Report-Anweisung.
- Der Engine-Block wächst dadurch um rund 70 Token pro Zug (`tools/testrun_compare.js`: 1.100–1.390 statt 1.030–1.320).
