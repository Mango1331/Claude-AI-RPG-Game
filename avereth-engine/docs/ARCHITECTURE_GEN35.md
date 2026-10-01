# Avereth Gen 3.5: Architektur und Migration

Stand: 01.10.2026. Build 4.2.0, Branch `claude/gen35-world-envelope-2026-10-01`.

| | |
|---|---|
| Ausgangsbranch | `claude/v4-integration-fixes-2026-09-30` |
| Ausgangscommit | `32b8f46` („Engine 4.1.5“), von ChatGPT zuletzt geprüft. Der Branch bleibt unverändert |
| Neuer Branch | `claude/gen35-world-envelope-2026-10-01` |
| Grundlage | eigene Code- und Architekturanalyse (Bericht A–I), Craft/LWE-Primärquellen, ChatGPT-Feedback und Gegenanalyse vom 01.10.2026 |

Gen 3.5 ist keine Neuschreibung von Gen 3. Sie baut auf dem vorhandenen System auf und schärft die Grenzen:
- **Beibehalten:** Event Sourcing mit `fold(events)`, deterministische Engine-Autorität, die Trennung hart/weich, die Extraktion nach der Prosa und SillyTaverns Nachrichten-, Swipe- und `extra`-Semantik.
- **Neu:** ein Intent-IR für beide Zugpfade, eine explizite Ownership-Tabelle, ein deterministischer World/Reaction Envelope und eine selektive Persistenz für Fakten.

**Nicht eingeführt:**
- keine allgemeine Frozen-Resolution-Schicht;
- kein zusätzlicher LLM-Resolver;
- keine NPC-Agenten;
- kein Ledger- oder Workflow-Unterbau.

## 1. Ist-Zustand am Code (4.1.5)

### 1.1 Turn-Flow

```
SillyTavern (index.js)
 └─ prepareGenerationAsync (src/v4/runtime.js)
     ├─ Barriere: die Extraktion der vorigen Antwort ist gebucht (sonst closeLatePending als Netz)
     ├─ Record der Spielernachricht vorhanden und input_hash gleich → wiederverwenden (Swipe/Regenerate)
     ├─ routeTurn (src/v4/turn.js) → parseIntent (src/intent.js): Regex,
     │    maskNames (Textumbau), deedsOf (Rede vs. Tat), declarative (Fragen/Zitate raus)
     │    ├─ 'v3': playerTurn (src/engine.js) parst denselben Text ein zweites Mal
     │    │        → Kampf (combat.js, npcDecide), Schleichen, Befehle, Erschaffung
     │    └─ 'v4': buildCatalog → interpretMessage (LLM) → guardCommands → Board-Generator
     │             → playerTurnV4 → resolveCommands (src/v4/commands.js)
     │               (resolved | authorized | conditional | pending | refused | clarify)
     │    Events und Outcome landen auf der Spielernachricht: hart, eingefroren, swipe-stabil
     └─ turnBlock → buildContext (src/context.js): Engine-Block
          (header, pc, present, facts, quests, relevant, lore, corrections, PLAYER ACTIONS)
Erzähler (nur Prosa)
 └─ processReplyAny: Prosa sofort sichtbar, Extraktion „pending“
     └─ runExtraction (Extraktor-LLM, eine Reparatur) → applyExtraction → replyTurnV4
         └─ applyWorld (src/v4/world.js):
              Firewall für die ganze Antwort (src/v4/firewall.js),
              dann je Delta in Story-Reihenfolge erneut Firewall + Weltregeln
              (+ V3-Regeln aus src/delta.js für Personen, Fakten, Erinnerungen, Kampf-Commitments)
            → Events auf dem Swipe der Antwort (text_hash); Korrekturen in den nächsten Engine-Block
```

### 1.2 Wer entscheidet was (Ist)

| Zustand | Entschieden von | Geschützt durch (Datei) |
|---|---|---|
| Alarics Coin, Inventar, XP, Stufe | Engine (Befehle, Kampf, Gilde) | firewall.js (`pc_inventory`, `engine_owned_fact`, `guild_payout`), world.js `coinRefusal` |
| Gildenstatus, Auszahlung, Rang, Mitgliedschaft | guild.js | firewall.js (viele Regex), world.js (`quest.detail`-Klauseln), guild.js `engineClause` |
| Ort Alarics | Befehl `go` + Erzählung (`arrive`) | firewall.js `no_go`, world.js `resolvePlace` |
| Kampf, NPC-Handlungen im Kampf | combat.js `npcDecide` | delta.js (Position, Abgang, Kampfteilnehmer) |
| NPC eröffnet Kampf außerhalb | Erzähler (`hostile`) | delta.js: nur Anwesenheit und Leben |
| Raub, Strafe, Beschlagnahme | Erzähler (`coerce`) | world.js `coerce` (Rollen-Regex) |
| Wissen, Glauben, Haltung, Erinnerung | Erzähler → V3-Regeln | delta.js; Erinnerungen ungeprüft |
| Weltfakten | Erzähler → V3-Regeln | delta.js (harte Fakten), firewall.js (Engine-Fakten) |

### 1.3 Strukturelle Schwächen

1. **Zwei Parser-Wege, keine gemeinsame Repräsentation.**
   - Die V3-Regex und der V4-Interpreter liefern verschiedene Formen (`intent.kind` gegen `commands[]`).
   - `playerTurn` parst den Text nach dem Router noch einmal.
   - Namen werden für die Regex aus dem Text gelöscht (`maskNames`). Den Text sieht nur die Regex; niemand sonst erfährt, welche Namen erkannt wurden.
2. **Ownership ist nur implizit.**
   - Die Autoritätstabelle steht als Kommentar in firewall.js.
   - Die Regeln dazu sind über firewall.js, guild.js und world.js verteilt.
   - Für Erinnerungen fehlt die Regel ganz: Eine Erinnerung „der Vertrag ist erledigt, 60 cp ausgezahlt“ bleibt neben dem echten Status stehen.
3. **NPC-Reaktionen haben keine kausale Grenze.**
   - Ein `hostile` des freundlichen Wirts wird angenommen, solange er anwesend ist und lebt.
   - Die Kampf-Policy (`npcDecide`: „ein nicht feindseliger, unverletzter, nicht aggressiver NPC eröffnet keine Gewalt“) gilt nur innerhalb eines Kampfes.
   - Raub- und Strafregeln stecken in world.js; der Erzähler sieht sie nicht.
4. **Jeder Fakt ist dauerhaft.** 36,5 % aller Deltas (Messung 30.09.) sind `fact`, viele davon Szenendetails ohne spätere Bedeutung.

## 2. Zielarchitektur

```
Spielertext
  ↓
Intent IR (ein Parse je Nachricht; Entitäten als Spans; Taten getrennt von Rede)
  ├─ mechanischer Fast Path (deterministischer Parser: Kampf, Schleichen, Befehle, Erschaffung)
  └─ Story-Pfad (Interpreter-LLM → dieselbe IR-Form)
  ↓
Deterministische Engine + Decision Ownership (eine Domain je Zustandsart)
  ↓
World/Reaction Envelope (deterministisch, vor der Narration: erlaubt / nur mit Anlass / unmöglich / hart entschieden)
  ↓
Erzähler entscheidet innerhalb des Envelopes frei
  ↓
Extraktor (unverändert post hoc)
  ↓
Firewall + Weltregeln prüfen gegen dieselbe Ownership-Tabelle und denselben Envelope
  ↓
Event-Stream → fold
```

### 2.1 Unified Intent IR (`src/ir.js`)

Die Nachricht wird einmal gelesen, und beide Pfade schreiben dieselbe Form:

```
{ v: 'ir-1', route: 'v3'|'v4', reason, spans: [{from, to, kind, id}], acts: [{act, …, quote, source}] }
```

- **`spans`** sind die Entitäten, die die Engine kennt: Gildenverträge, Orte, Personen, Gegenstände, jeweils mit ihrer ID.
  - Ein Verb innerhalb eines Namens ist keine Tat. Das gilt für „Gnaw-Hide“, weil der Titel als Entität verknüpft ist, nicht weil der Titel eine Sonderregel hat.
  - Ein Name an der Verbstelle ist die Tat des Spielers („I kill the rats“).
  - `maskNames` bleibt als Sicht auf die Spans erhalten, nicht mehr als eigener Textumbau.
- **`acts`**, Fast Path: Der deterministische Parser schreibt die mechanischen Akte (`attack`, `skill`, `move`, `flee`, `stealth`, `engage`, `command`, `creation`) mit `source: 'parser'`. `playerTurn` bekommt den Akt übergeben und parst nicht mehr selbst.
- **`acts`**, Story-Pfad: Die geprüften Interpreter-Befehle werden dieselben Akte mit `source: 'interpreter'`. Vom Guard entfernte Befehle bleiben als `dropped` sichtbar.
- **`route`** folgt aus den Akten. Ein mechanischer Akt geht in die V3-Engine, sonst läuft der Story-Pfad.
- **Speicherort:** Das IR steht im Record der Spielernachricht (`extra.avereth.ir`). Swipe und Regenerate verwenden es wieder, und der Decision Trace zeigt für beide Pfade dieselbe Form.

### 2.2 Decision Ownership (`src/v4/ownership.js`)

Jede kanonische Zustandsart hat **genau eine** Owner-Domain. Die Tabelle ist Daten, kein Kommentar.

| Zustandsart | Owner | darf schreiben |
|---|---|---|
| `pc.coin`, `pc.inventory` | economy / inventory | Befehle, Engine; aus der Welt nur über die Envelope-Tore „geben“, „Raub/Strafe“ |
| `pc.vitals`, `pc.progress` | combat / progression | nur die Engine |
| `quest.status` (Gildenvertrag) | guild | nur die Engine (Annahme, Abgabe); die Welt höchstens `failed` |
| `quest.payout`, `guild.standing`, `guild.board` | guild | nur die Engine bzw. der Board-Generator |
| `combat` | combat | Engine (`npcDecide`); die Welt nur ein Commitment innerhalb des Envelopes |
| `npc.hostility` | envelope | Erzähler innerhalb des Envelopes |
| `npc.knowledge`, `npc.belief`, `npc.attitude`, `memory` | knowledge / claims / relations / memory | Erzähler (Freitext ohne Engine-Zustand) |
| `world.fact` | facts (mit `scope`) | Erzähler |
| `scene.presence`, `world.places`, `world.objects`, `time`, `threads` | world | Erzähler (Weltregeln) |

**Regel für Freitext.** Freitextspeicher (Quest-Notizen, Erinnerungen, Fakten) dürfen Engine-Zustand nicht als zweite Wahrheit enthalten: Status, Auszahlung, XP, Rang oder Mitgliedschaft eines Gildenvertrags. Eine einzige Klauselregel gilt für alle Speicher:
- Klauseln mit Engine-Zustand fallen weg, die Geschichte bleibt.
- Bleibt nichts übrig, wird das Delta abgelehnt.
- Behauptet die Klausel einen falschen Status, folgt eine Korrektur.

Die Regel steht in `ownership.js` und ersetzt die verteilten Kopien in guild.js, firewall.js und world.js (siehe §4).

**Invariante (getestet).**
- Jedes Event gehört genau einer Zustandsart an.
- Jeder Delta-Typ deklariert, welche Arten er schreiben darf.
- Schreibt ein Erzähler-Delta eine Engine-Art, braucht es ein deklariertes Tor.
- Die Replays aller aufgezeichneten Live-Läufe halten das ein.

### 2.3 World/Reaction Envelope (`src/v4/envelope.js`)

Der Envelope wird vor der Narration deterministisch aus dem Zustand berechnet. Er gibt für jeden anwesenden Akteur außerhalb eines Kampfes an, welche kausal relevanten Reaktionen
- **frei** sind,
- **nur mit Anlass** gehen,
- **unmöglich** sind oder
- **schon hart entschieden** sind.

Seine Regeln stammen aus den Regeln, die die Engine schon hat. Nichts davon ist neu erfunden.
- **Kampf eröffnen:**
  - Für sapiente NPCs gilt dieselbe Policy wie in `npcDecide`: Gewalt nur bei aggressivem Temperament, feindseliger Haltung (≤ −20) oder nachdem Alaric sie verletzt oder angegriffen hat.
  - Scheue Tiere greifen nur in die Enge getrieben an (ENGAGED) oder wenn sie verletzt sind.
  - Wen die Antwort selbst neu einführt (Hinterhalt), der ist frei.
- **Raub, Strafe, Beschlagnahme:**
  - Strafe und Beschlagnahme nur durch eine Obrigkeit.
  - Raub nur durch einen feindseligen Räuber oder in einem Kampf.
  - Die Gegenseite eines Handels darf nie etwas nehmen.
- **Hart entschieden:**
  - Ein laufender Kampf gehört der Engine (`npcDecide`, Positionen, Abgang).
  - Ein Kampf-Commitment aus der letzten Antwort ist bindend.

Derselbe Envelope wird zweimal verwendet:
1. Der Engine-Block zeigt dem Erzähler nur die einschränkenden Zeilen (Abschnitt `WORLD ENVELOPE`). Innerhalb des Envelopes ist die Geschichte frei.
2. Der World-Applier prüft die extrahierten `hostile`- und `coerce`-Deltas Schritt für Schritt mit derselben Funktion gegen den Zustand dieses Schritts. Eine Haltung, die die Antwort vorher senkt, ist ein Anlass. Bei einer Ablehnung gibt es eine Korrektur für den nächsten Zug.

`npcDecide` nutzt dieselbe Policy-Funktion (`opensViolence`). Kampf, Erzähler-Vorgabe und Prüfung können damit nicht auseinanderlaufen.

### 2.4 Selective Persistence (Fakten mit `scope`)

Der Extraktor darf zu einem Fakt optional `scope` angeben:
- `scene`: gilt nur hier und jetzt, etwa ein Geruch oder ein Licht;
- `local`: ein Zustand dieses Ortes für Stunden oder Tage;
- `lasting`: dauerhaft. Das ist der Vorgabewert, also das bisherige Verhalten.

Die Engine wertet die Gültigkeit deterministisch beim Lesen aus und braucht keine Lösch-Events:
- Ein `scene`-Fakt ist nur an seinem Ort und für ein Szenenfenster aktuell.
- Ein `local`-Fakt läuft nach einer Frist ab.
- Wiederholt eine spätere Antwort den Fakt, steigt er eine Stufe auf (Wiederkehr = Bedeutung, wie LWE es beschreibt).
- Funktionale und harte Fakten (Status, Ort, Beruf …) sind nie gescoped.

Event Sourcing bleibt vollständig: Abgelaufene Fakten stehen weiter im Log, sie sind nur nicht mehr aktuell.

### 2.5 Was unverändert bleibt

- Records pro Nachricht und Swipe, Barriere, `input_hash`-Wiederverwendung, `text_hash` der Antworten, Bearbeiten ohne Retcon;
- Extraktor-Pfad (ein Aufruf, eine Reparatur), Firewall-Regeln (P0-Rescore identisch), alle V3-Regeln;
- V3-Kampagnen: kein IR-Feld, kein Envelope, keine Scopes. Der V3-Differenzlauf muss bis auf den Build-Stempel identisch sein.

## 3. Migrationsreihenfolge

Jeder Schritt hält alle bestehenden Tests unverändert grün, bringt eigene Tests mit und lässt den V3-Differenzlauf identisch.

1. **Ownership:**
   - Tabelle und Klauselregel in `ownership.js`;
   - guild.js, firewall.js und world.js nutzen sie (reine Umlagerung, gleiche Ergebnisse);
   - neu: Erinnerungen ohne Engine-Zustand;
   - Invariantentest über alle Replays.
2. **Envelope:**
   - `envelope.js`, `opensViolence` gemeinsam mit `npcDecide` (Verhalten identisch);
   - die Raub- und Strafregeln aus world.js wandern in den Envelope;
   - neu: Prüfung von `hostile`, Abschnitt im Engine-Block, Vertragszeile, Revision 4.2.0.
3. **Intent IR:**
   - `ir.js` mit Spans, `readTurn` und `acts`;
   - `routeTurn` und `maskNames` als Sichten darauf;
   - IR im Record, `playerTurn` ohne zweiten Parse.
4. **Scope:** Extraktor-Feld (optional, Vorgabe = bisheriges Verhalten), Gültigkeit beim Lesen, Aufstieg bei Wiederkehr.
5. **Prüfung:**
   - Regression, Replays, Mutationsprobe;
   - V3-Differenzlauf und V4-Differenzlauf gegen `32b8f46`;
   - P0-Rescore, Browser- und SillyTavern-Smokes, Token-Messung;
   - Dokumentation.

## 4. Nicht-Ziele und bewusst nicht Umgebautes

- **Interpreter für Angriff und Schleichen:** Er wäre der nächste IR-Schritt (Regex nur noch für eindeutige Syntax). Dafür muss sich der Interpreter-Prompt ändern, und das lässt sich nur mit dem echten Modell messen (P0/S1-Korpus). Es ist deshalb bewusst nicht Teil dieses Branches.
- **LLM-Resolver vor der Prosa (Spike-Arm G4):** Er bleibt ein Vergleichsexperiment gegen den Envelope (G3.5), keine Architektur.
- **Due-Queue und Lazy Simulation:** Die Ownership-Tabelle und der Envelope schaffen die Grundlage. Die Queue selbst folgt erst, wenn ein Live-Lauf einen Bedarf zeigt.
- **NPC-Tiefe T2/T3 (Inner World):** gibt es nicht. Auch LWE nutzt sie im untersuchten Projekt null Mal.

## 5. Messung und Abbruch

- **Tokens:** Der Envelope erscheint nur, wenn er etwas einschränkt. Seine Größe wird über alle Replays gemessen (§6). Ziel: im Median höchstens +60 Tokens pro Engine-Block.
- **Latenz:** Es gibt keinen zusätzlichen LLM-Aufruf. Die deterministische Rechenzeit wird gemessen.
- **Abbruch je Baustein:** Wenn ein Baustein einen bestehenden Test, ein Replay oder den V3-Differenzlauf verschlechtert und das nicht ohne Sonderregel lösbar ist, wird er zurückgenommen und der Befund hier festgehalten.

## 6. Ergebnisse

Werden nach der Umsetzung ergänzt.
