# Testrun-2: Auswertung

**Quelle:** der erste echte Lauf mit der Engine (Stand `12d07ec`), abgebrochen im Kampf. Vier Artefakte:
- Chat-Export (JSONL, 23 Nachrichten mit `extra.avereth`);
- Event-Log-Export der Extension;
- SillyTavern-Konsolen-Logger mit 11 Requests und Responses inklusive Reasoning;
- Browser-Konsole mit 12 Fehlermeldungen.

Die echten Eingaben, der Seed und die rohen GLM-Antworten mit ihren `<avereth>`-Reports liegen in `tests/testrun_v2/fixture.json`.

**Determinismus-Beleg:** Der Replay mit dem damaligen Code reproduziert den exportierten Event-Log **exakt**: alle 22 Nachrichten-Records, Würfel für Würfel.

## Setup

| Punkt | Wert |
|---|---|
| Modell | `zai-org/GLM-5.3-Flash`, reasoning high, kein Streaming, temperature 0.9 |
| Host | Megumin-Preset mit `<Blocks>`-Trackern (World_State, Character_Sheet, New_NPC/NPC_Update) und NPC-Dossierbank |
| Avereth | Engine-Extension, Narrator Contract v3 als Kartenbeschreibung, WorldInfo deaktiviert (kein WI-Eintrag im Prompt) |

**Prompt pro Zug** (GLM etwa 4,3 Zeichen pro Token):

| Anteil | Größe |
|---|---|
| gesamt | 14,6k–21,6k Token |
| Preset, Karte und Vertrag | etwa 11,6k–13k Token; der Vertrag wächst von 4,0k auf 5,0k, weil die Dossierbank Brams Dossier einfügt |
| Verlauf | 0,4k → 5,2k Token |
| **Engine-Block** | **1,1k–2,2k Token (etwa 7–10 %)** |

## Verlauf

| Zug | Eingabe (gekürzt) | Engine | Befund |
|---|---|---|---|
| 1–2 | Ranger; Aimed Shot + Power Shot | Erstellung korrekt (Init 9, STA 100, 20 Pfeile) | GLM meldet im Abschlusszug das Starter-Kit zusätzlich als `items` → Kit doppelt im Inventar plus Phantom-Item `standard_arrows` ×20 (**Fehler 1**) |
| 3 | geht in den Wald | Erzählung | sauber |
| 4 | geht offen auf die Stimme zu | Bram Fenn per `new` | `enter` für die im selben Report eingeführte Figur wird abgelehnt → irreführende Korrektur (**Fehler 5**) |
| 5 | „Lost“, senkt den Bogen, geht weiter | Erzählung | GLM setzt Bram auf `position: LONG`, statt ihn per `leave` aus der Szene zu nehmen |
| 6 | folgt Wildwechseln zum Bach | `place` wechselt | Bram bleibt für die Engine anwesend (**Fehler 3**) |
| 7 | schleicht zum Rauch | Schleichen gegen Bram (LONG, in der Fiktion eine Viertelmeile entfernt) → misslungen | GLMs Reasoning bemerkt den Widerspruch, befolgt aber die bindende Engine; Bram taucht „lautlos“ auf |
| 8 | wirft eine Silbermünze | Erzählung | sauber (Münze zurückgeworfen, Coin unverändert) |
| 9 | „My name is–“, Power Shot | Kampf, Fehlschuss; **Bram „holds (not hostile, not yet harmed)“** (**Fehler 2**) | GLM spiegelt das als `intent: hold` |
| 10 | Power Shot | Treffer 34; **Bram „holds (narrated intent)“** | die Engine übernimmt das gespiegelte `hold` als NPC-Entscheidung; GLM erfindet ersatzweise, dass Bram in Deckung geht |
| 11 | Basic Attack | Treffer 15; **Bram hält erneut** | Abbruch: „hat nicht mehr geklappt“ |

Parallel dazu erschien **bei jeder Antwort** eine Fehlermeldung (**Fehler 4**).

## Was funktioniert hat

- **Report:** 11 von 11 Antworten mit gültigem `<avereth>`-Report; alle Reports aus der Anzeige entfernt.
- **Mechanik:** Kampfwerte stimmen mit Core #11 überein:
  - Power Shot Raw 33,25, Treffer 63 %, Schaden 34 aus DEF 2 und Varianz 1,09;
  - Basic Attack 17,5 und 1 Pfeil;
  - STA 100 → 88 → 76 → 71.
- **Treue zum RESOLVED-Block:** GLM erzählt Treffer und Fehlschüsse genau so und spiegelt die Engine-Werte in den eigenen Tracker (STA, Pfeile).
- **Wissen und Wahrnehmung:**
  - Bram kannte Alarics Namen nie („lad“; „My name is–“ ohne Namen ist keine Vorstellung);
  - „lost“ steht als Behauptung auf seiner Karte, nicht als Wahrheit;
  - erster Blick, Erinnerungen und Haltung (+10, −10, −15, −50) sind konsistent.
- **Agency:** Kein Zug hat für Alaric entschieden. Die Münze warf der Spieler, und die Engine änderte den Coin korrekt nicht.
- **Keine WorldInfo, keine Regel-Fehltreffer:** Situative Regeln (Schleichen, Coin) wurden nur bei Bedarf geladen.

## Fehler, Ursachen, Behebung

| # | Fehler | Ursache | Behebung |
|---|---|---|---|
| 1 | Starter-Kit doppelt, Phantom-Item `standard_arrows` | Engine übernahm Items aus der Antwort auf den Erstellungszug; Pluralname nicht aufgelöst | In Erstellungsantworten werden `time`, `location`, `place`, `items`, `coin`, `recover` und `quests` abgelehnt (System-only); Pluralnamen lösen auf die Content-ID auf |
| 2 | Bram wehrt sich nie | (a) Nur ein *Treffer* galt als Provokation, ein Fehlschuss nicht. (b) Ein erzählter passiver Intent sperrte die NPC, auch wenn der Erzähler nur das „holds“ der Engine spiegelte. | Core #27, die NPC entscheidet nach eigenem Zustand: (a) Angegriffen werden zählt als Provokation. (b) Ein Angriff seit ihrem letzten Zug hebt `hold`/`parley`/`take_cover` auf. Replay: Bram schlägt in Runde 1 zurück und zieht sich unter 35 % HP zurück. |
| 3 | Schleichwurf gegen eine abwesende Figur | Ein Ortswechsel innerhalb eines Orts ließ alle NPCs anwesend | Nach einem `place`-Wechsel verlassen NPCs auf MEDIUM/LONG die Szene, außer der Report platziert sie neu (`enter`/`position`/`aware`); ENGAGED/SHORT gelten als mitgehend. Report-Text `leave`: „…or stayed behind as Alaric moved on“ (+8 Token). |
| 4 | Fehlermeldung bei jeder Antwort (`reasoning.js … getAttribute`) | Ohne Streaming feuert SillyTavern `MESSAGE_RECEIVED` **vor** dem Rendern (`saveReply`: emit → `addOneMessage`). `updateMessageBlock` auf das fehlende Element wirft in der Reasoning-UI; unser Handler brach vor `saveChat` ab und zeigte ein Fehler-Popup. Daten gingen nicht verloren, weil SillyTavern später selbst speichert. | Nur schon gerenderte Nachrichten neu zeichnen; ein Anzeigefehler bricht das Speichern nie ab. Der Browser-Smoke bildet jetzt die echte Reihenfolge nach und schlägt mit dem alten Code fehl. |
| 5 | Irreführende Korrekturen im nächsten Prompt | `enter` nach `new` im selben Report abgelehnt; leeres `combat: {}` / `{by: []}` abgelehnt | beides stillschweigend akzeptiert (keine Information, kein Fehler) |

**Belege:** `tests/testrun_v2/regression.test.js` spielt den echten Lauf ab. Mit dem alten Code schlagen 6 von 8 Tests fehl, mit dem neuen bestehen alle.

## Beobachtet, bewusst nicht geändert

- **Band-Angaben:** GLM setzte Bram bei „acht Schritten“ auf `ENGAGED` (Core #12: Nahkampfreichweite). Die Auswirkung ist gering, weil eine Nahkampf-NPC auf SHORT im selben Zug heranrücken und angreifen darf (Core #24).
- **Vorlagenwahl:** „trapper, woodcutter“ ergab die Vorlage `laborer` (Warrior, 105 HP) statt `hunter`. Das ist eine Content-Wahl.
- **Ungültige Report-Einträge:** GLM schrieb einmal ein `learn` mit ganzem Satz in `p` und ohne `o`; die Korrektur ist berechtigt.
- **Preset-Tracker:** GLM ließ die `<Blocks>` im letzten Zug weg. Das betrifft das Host-Preset, nicht die Engine.
- **Agency-Backlog aus der zweiten Review:** Außer dem Kit in Zug 2 (Fehler 1) gab es keinen Fall. Keine Zahlung, Abgabe, Quest-Annahme oder `recover` ohne Zustimmung. Es gibt noch keine Daten für eine Verschärfung.
