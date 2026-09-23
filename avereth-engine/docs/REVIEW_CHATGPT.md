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

## Zweite Review (vor Testrun 2)

**Schwelle:** Geändert wurde nur, was den nächsten Test verfälschen, State oder Wissen beschädigen oder zentrale RPG-Logik brechen kann. Jeder Punkt wurde per Probe am Code geprüft.
- **A:** jetzt beheben.
- **B:** verschieben.
- **C:** nicht übernehmen.
- **D:** dritte Lösung.

| Punkt | Probe | Kat. | Entscheidung |
|---|---|---|---|
| Kampftod und Kampferinnerung erreichen auch `unaware`-Zuschauer (`perceivers`) | bestätigt | **A** | Die Engine selbst leckt Wissen (Fehlerklasse „boy“ aus Testrun-v1); das bricht Schleich- und Fernkampf-Spiel und würde GLM zugeschrieben. Fix: Filter `awareness !== 'unaware'` an den zwei Stellen; Test. |
| Retcon einer älteren Antwort lässt spätere Mechanik stehen (XP für einen Wolf, den es nie gab; Fold-Fehler) | bestätigt | **A** | Beworbenes Feature beschädigt State still. Fix: Retcon nur für die neueste Antwort, sonst bleiben die Fakten und ein Hinweis erscheint; Test. |
| `combat` mit Ziel ≠ Alaric wird zum Angriff auf Alaric (Mara greift den Banditen an → Mara wird Alarics Gegnerin) | bestätigt | **A** | Grob falsche Kampfauflösung bei häufiger Fiktion (Schlägerei, Wache gegen Dieb). Fix: ablehnen; Report-Text „attack Alaric“ (tokenneutral); Test. |
| Zustimmung nur pro Kategorie (Brot kaufen → falsche Zahlung erlaubt; „I should pay you?“ zählt als Zahlung) | bestätigt | **B** | Zweite Verteidigungslinie. Das Risiko entsteht nur, wenn der Erzähler innerhalb einer vom Spieler geöffneten Kategorie überzieht. Typisierte Extraktion (Betrag, Item, Empfänger, Quest, Ziel) aus Freitext ist spröde; Fehlablehnungen würden den Test ebenso verfälschen. Erst messen. |
| `recover` ohne Ruhe; Items/Coin **an** Alaric ohne Annahme | bestätigt | **B** | Gleiche Abwägung. Das Ruhe-Vokabular („catch my breath“, „nap“) und die Regeln für Heilung/Beute/Belohnung durch NPCs brauchen reale Daten. |
| `learn` mit `witnessed` legt Weltwahrheit an | bestätigt, aber nicht spezifisch | **C** | Der `facts`-Schlüssel legt dieselbe Wahrheit ebenso an (Probe: sogar als harter Fakt). `learn` verlangt zusätzlich Anwesenheit und lehnt Widersprüche ab. Die Trennung brächte keinen Schutz, kostete Report-Token und verlöre Fakten, wenn der Erzähler nur `learn` meldet. |

**Dritte Lösung (Backlog, falls der Test Überziehen zeigt):** Statt voll typisierter Autorisierung zuerst eine Nennprüfung. Abgegebene Items und neue Ziele (`location`) müssten dann in der Spielernachricht vorkommen, und `recover` für Alaric bräuchte `rest`. Das ist klein und lokal, braucht aber ein Vokabular, das die echten Eingaben abdeckt.

**Im Testrun beobachten** (Button „Export event log“: Events je Nachricht; die Spielereingabe steht in `turn.begun`, Coin-, Item- und Ressourcen-Events tragen `why`):
- `coin.changed` / `item.changed` / `quest.set active` / `scene.moved` mit Ortswechsel: Passt der konkrete Gegenstand zur Spielernachricht?
- `resource.changed` aus `recover`: Hat der Spieler geruht, gegessen oder getrunken?
- Items/Coin an Alaric: angenommen oder nur angeboten?
- `delta.rejected` mit „PLAYER OWNERSHIP“: Fehlablehnungen (Spieler hatte zugestimmt, anders formuliert)?

## Dritte Review (nach Testrun 3, Stand `39a5c50`)

Die Review bestätigte die Testrun-3-Fixes (Kampf-Vorschau, Anwesenheit, `nearest`, Report vor den Tracker-Blöcken, Handelszeilen) und nannte einen offenen Punkt und eine Beobachtung.

| Punkt | Probe | Kat. | Entscheidung |
|---|---|---|---|
| Eine neue Quest ohne `level`/`type` wird angelegt und bringt beim Abschluss 0 Quest-XP | bestätigt, im echten Lauf: Die Rattenquest aus Zug 8 hatte kein Level | **A** | Eine neue Quest braucht ein positives `level` und einen gültigen `type`. Fehlt eines, wird sie nicht angelegt, und die Korrektur nennt, was fehlt, und fordert den vollständigen Eintrag an. Bekannte Quests behalten ihre gesperrten Werte. Report-Text `quests` sagt das. Regression: Zug 8 von Testrun 3. |
| Der Nachtrag nach fehlendem Report ist großzügig (bis zu 3 Spielernachrichten) | bestätigt | **B** | Für Zahlung, Übergabe und Quest-Annahme gewollt. Beobachten, ob `report.missing` mit Vertrag 3.1, Report vor den Blöcken und 8.192 Token überhaupt noch vorkommt. |
| Ein nachgetragenes `new` würde eine Person aus der vorigen Szene in die aktuelle setzen | bestätigt, aber durch unseren eigenen Korrekturtext begünstigt | **D** | Kein Patch an der Logik; der Korrekturtext bittet nur noch um die **Entscheidungen** des Zuges ohne Report (Übergaben, Coin, Quests), nicht mehr um „new people“. Wer noch in der Szene ist, führt der Erzähler ohnehin mit `new` ein, sobald er vorkommt. |

**Nächster Test:** Extension aktualisieren, Kartenbeschreibung vollständig durch Vertrag 3.1 ersetzen, „Max Response Length“ 8.192, Reasoning „high“ lassen, neuer Chat. Beobachten (Button „Export event log“):
- Hat jede normale Antwort einen `<avereth>`-Report (kein `report.missing`)?
- Kommen neue Quests mit `level` und `type`?
- Falls doch ein Report fehlt: Was trägt der nächste Report nach?

