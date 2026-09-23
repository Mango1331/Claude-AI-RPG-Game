# Testrun-v1: Auswertung als empirische Evidenz

Quelle: Branch `Testrun-v1` mit zwei Dateien:
- `CMD Silly Tavern Logger.md`: die Konsolen-Ausgabe des SillyTavern-Servers mit allen fünf Requests und Responses, inklusive Reasoning.
- `RPG Test - 2026-09-23@04h36m27s796ms.jsonl`: der Chat-Export.

Die Auswertung stammt aus dem vollständig geparsten Logger (Parser und Zwischenergebnisse liegen im Arbeitsverzeichnis). Die relevanten Nachrichten liegen wörtlich in `tests/testrun_v1/fixture.json`. Der Regressionstest `tests/testrun_v1/regression.test.js` spielt sie gegen die Engine ab.

## Setup des Laufs

| Punkt | Wert |
|---|---|
| Modell | `zai-org/GLM-5.3-Flash` (Chat Completion, temperature 0.9, top_p 0.95, max_tokens 4096, reasoning high, kein Streaming) |
| Avereth-Stand | Paket v1.24 aus Phase 1: WorldInfo v1.23 (61 Einträge), Character Description v2.3, Megumin-NPC-Patch v1.3 |
| Host | Megumin-Preset mit Tracker-Blöcken `<Blocks>` (World_State, Character_Sheet, New_NPC) |
| Tokenverhältnis GLM | etwa 4,24–4,47 Zeichen pro Token (für Schätzungen: 4,3) |

## Die fünf Züge

| Zug | Eingabe | Prompt-Tokens | Completion | Latenz | WorldInfo aktiv |
|---|---|---|---|---|---|
| 1 | `Ranger` | 17.016 | 862 | 53 s | Kernel #0, Creation #54 |
| 2 | `Aimed Shot + Power Shot` | 18.514 | 627 | 37 s | #0, #54, **#3 und #4 als Fehltreffer** |
| 3 | `*i look around and start walking to the forest…*` | 15.144 | 817 | 64 s | #0 |
| 4 | `*i get my bow ready and track the sound*` | 15.761 | 1.627 | 89 s | #0, #11 (track) |
| 5 | `*i aim the bow and i Power Shot at him*` | 20.262 | 2.560 | 165 s | #0, #1 START |

**Zusammensetzung des Kampf-Prompts (Zug 5, etwa 20,3k Token)**

| Anteil | Größe |
|---|---|
| Megumin-Stil-Preset | etwa 4,5k Token |
| Megumin-NPC-Dossier-Regeln | etwa 2,7k Token |
| Character Description v2.3 | etwa 3,6k Token |
| WorldInfo (Kernel + START) | etwa 4,4k Token |
| Denk-, Format- und Blocks-Vorlage inkl. NPC-Patch | etwa 2,4k Token |
| Verlauf | etwa 2k Token |

Der Avereth-eigene Anteil lag bei etwa 5,6k Token in Erkundungszügen und etwa 9k Token im Kampfzug.

## Was in der Praxis funktioniert hat

- **Charaktererstellung:** Beide Schritte liefen korrekt ab. Die Zeit war eingefroren, und Schritt 2 enthielt keine Weltprosa. Favored +1/+1, MaxHP 80, MP 60, STA 100, DEF 3/MDEF 4, ATK 6 und das Kit (20 Pfeile) stimmten. Die Skill-Liste in Schritt 1 entsprach dem Content, inklusive Munition.
- **Kampf-Gate (Core #23):** Gehen, Spurenlesen und „Bogen bereit“ starteten keinen Kampf. „Power Shot at him“ wurde korrekt als Kampfstart geroutet.
- **Charakterbeschreibung (Agency-Regeln):** Die Regeln wurden im Reasoning aktiv angewandt, z. B. „No new voluntary choices for Alaric beyond walking … licensed“. Das ist der Nachweis, dass die Verhaltensregeln der CD wirken.
- **Formeln:** Mit den Formeln im Kontext rechnete das Modell richtig. Base Hit 73, Power Shot 63 %, Crit 5,6 (+25 pp), Raw 33,25, DEF vor Varianz, STA 88 und 19 Pfeile passten.

## Was vergessen, falsch interpretiert oder improvisiert wurde

| Befund | Beleg (Reasoning/Chat) | Ursache |
|---|---|---|
| Initiative falsch: 8 statt 9 (AGI 6 + floor(PER 6/2)); der Fehler wurde bis in den Kampf weitergetragen | Creation-Antwort „Init: 8“, Kampf-Reasoning „Init 8“ | abgeleiteter Wert vom LLM gerechnet, danach aus dem Tracker kopiert |
| **Keine echten Würfel** | „Roll d100: I need to generate. Let's roll: say 44“, Crit „say 71“, Varianz „say 0.97“ (dieselbe 0.97 wie im v1.23-Lauf) | ein LLM kann keinen Zufall erzeugen |
| Menschlicher NPC ohne Regeln improvisiert | „Level 2, HP maybe ~60 … Let's just make him Level 2, HP 70, ATK 8, DEF 1, Hit 72, Init 6“ | Content-Lücke: keine Regel für menschliche NPC-Kämpfer; Formel ignoriert |
| DefeatXP nie berechnet oder gesperrt, keine Zugreihenfolge sichtbar | START-Schritt 6 übersprungen | lange Prozedur im Prompt wird nicht Schritt für Schritt ausgeführt |
| **Kampf-Snapshot verloren** | „The Blocks section only lists World_State, Character_Sheet, New_NPC. I'll embed combat results in prose“ | Host-Tracker hat keinen Platz; Zustand existiert nur als Text im letzten Block |
| Zweiter Pfeil erfunden, aber nur einer abgezogen | Prosa „takes a second arrow“, Tracker 19 Pfeile | Erzählung und Mechanik nicht gekoppelt |
| Widersprüchliche Position im selben Block | PC „SHORT band“, NPC „MEDIUM band“ | Positionen sind nur Freitext |
| Hinterhalt vom LLM beurteilt, obwohl der Trapper etwas gehört hatte | „Whoever you are … you walk like a dropped sack of turnips“, trotzdem +25 pp Crit | Aufmerksamkeit ist Interpretation, kein Zustand |
| Neue Figur mitten im Kampf ohne Mechanik („Brindle“) | Reasoning „Don't invent convenient hooks“, Prosa tat es doch | „open loop“-Vorgaben des Presets |
| Wissensleck: Der Trapper nennt den unsichtbaren Schützen „boy“ | Antwort Zug 5 | NPC-Wissen nicht getrennt vom Erzählerwissen |
| Kleiner Agency-Rutscher „He holds.“ | Zug 4 | Verhalten; die CD-Regel bleibt nötig |
| Tracker-Drift: Coin-Feld fehlt, PER/AGI-Formatierung schwankt | Character_Sheet-Blöcke | Zustand nur im jeweils letzten Block; ein Fehler dort ist sofort Kanon |
| Reasoning-Budget geht an Stil und Präsentation | Openers, Banlist, Dossier-Prüfung im Reasoning | Präsentationsregeln konkurrieren mit Mechanik |

## WorldInfo- und Memory-Leistung, Kontextnutzung

- **Routing:** Das Routing per WorldInfo-Schlüssel funktionierte grundsätzlich (START korrekt). Lexikalische Schlüssel feuern aber auf **Host-Text**:
  - #3 (Multi-Hit) auf das Skill-Tag „[Offensive / Multi-Hit]“ in der Creation-Liste;
  - #4 (Status) auf „Frozen“ in Megumins Zeitzeile „Frozen — Character Creation“.
  
  Zusammen etwa 0,9k verschwendete Token in Zug 2.
- **START ist zu groß für den Zweck:** Für einen Kampf gegen **einen** menschlichen NPC mit drei relevanten PC-Aktionen lud START alle 15 Monster-Anker und 30 Aktionen aller fünf Klassen (14,5k Zeichen).
- **Gedächtnis:** Es gab kein Gedächtnis jenseits des Chatverlaufs und des letzten Tracker-Blocks. Megumin entfernt `<Blocks>` aus älteren Antworten. Dadurch ist der Zustand ein **Single Point of Failure**.
- **Genutzter Kontext:** Formeln, Agency-Regeln, der START-Ablauf teilweise und die Creation-Werte wurden genutzt.
- **Verschwendeter Kontext:**
  - irrelevante Monster und Klassen in START;
  - Fehltreffer-Regeln;
  - Präsentationsregeln, die mit der Mechanik um das Reasoning konkurrieren.

## Was nur in der Theorie funktionierte

Folgende Punkte stehen in Core/WI klar als Regel, liefen im Test aber nicht wie beschrieben:
- Locked Profile Copy-Forward
- DefeatXP-Lock
- Snapshot-Persistenz
- Roll Integrity (Core #9)
- Hinterhalt nur bei echter Ahnungslosigkeit
- Menschliche NPC-Profile

Allen gemeinsam: Sie verlangen entweder **Zufall**, **dauerhaften strukturierten Zustand** oder **das exakte Abarbeiten langer Prozeduren**. Keins davon leistet ein Sprachmodell zuverlässig.

## Konsequenzen für die Architektur

1. **Regeln, Zufall und Zustand gehören in deterministischen Code**, nicht in Prompt-Text. Das LLM bekommt Ergebnisse, keine Prozeduren. Es konnte rechnen, aber nicht würfeln, persistieren oder Schritte zuverlässig ausführen.
2. **Zustand muss außerhalb der Erzählung liegen** und pro Nachricht gespeichert werden, damit er swipe- und löschsicher ist. Er darf nicht nur im letzten Tracker-Block stehen.
3. **Kontext nach Zustand auswählen, nicht nach Wörtern im Text.** Das verhindert lexikalische Fehltreffer auf Host-Text.
4. **Content-Lücken schließen** statt improvisieren lassen: menschliche NPC-Profile und Aufmerksamkeit als Zustand.
5. **NPC-Wissen explizit trennen:** Wer hat Alaric gesehen, wer kennt seinen Namen, wer weiß was aus welcher Quelle.
6. **Die Verhaltensregeln der CD behalten.** Sie wirken nachweislich.

## Regressionsabdeckung

`tests/testrun_v1/regression.test.js` spielt die fünf echten Eingaben und Antworten gegen die Engine ab. Er prüft unter anderem:
- Init 9 statt 8, und die „Init: 8“-Drift wird als Korrektur erkannt;
- keine Regeltexte durch Host-Wörter;
- kein Kampf beim Spurenlesen;
- Würfel aus dem RNG;
- Trapper-Profil aus der Hunter-Vorlage (L2, HP 90) mit gesperrter DefeatXP 20;
- kein falscher Hinterhalt („suspicious“);
- genau ein Pfeil pro Schuss, STA 88;
- Snapshot im nächsten Zug erhalten;
- der Trapper „has never seen him“ und Alaric ist „UNSEEN“;
- der Engine-Block ist kleiner als ein Viertel des alten Avereth-Anteils im Kampfzug.

Die Tokenzahlen reproduziert `node tools/testrun_compare.js`.
