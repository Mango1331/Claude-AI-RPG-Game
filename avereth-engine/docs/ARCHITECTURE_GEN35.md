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

## 2. Zielarchitektur (umgesetzt)

```
Spielertext
  ↓
Intent IR (ein Parse je Nachricht; bekannte Namen als Links; Taten getrennt von Rede)
  ├─ mechanischer Fast Path (deterministischer Parser: Kampf, Schleichen, Befehle, Erschaffung)
  └─ Story-Pfad (Interpreter-LLM → dieselbe IR-Form im Record)
  ↓
Deterministische Engine + Decision Ownership (eine Domain je Zustandsart)
  ↓
World/Reaction Envelope (deterministisch, vor der Narration: frei / nur mit Anlass / nicht ohne Rolle / hart entschieden)
  ↓
Erzähler entscheidet innerhalb des Envelopes frei
  ↓
Extraktor (unverändert post hoc, extract-5.0)
  ↓
Firewall + Weltregeln prüfen gegen dieselbe Ownership-Tabelle und denselben Envelope
  ↓
Event-Stream → fold (Fakten eines Kampfes gelten nur, solange er läuft)
```

### 2.1 Unified Intent IR (`src/ir.js`)

Die Nachricht wird einmal gelesen (`readTurn`), und beide Pfade schreiben dieselbe Form in den Record der Spielernachricht (`extra.avereth.ir`):

```
{ v: 'ir-1', route: 'v3'|'v4', reason, links: [{kind, id, deed}], acts: [{act, …, source}] }
```

- **`links`** sind die Namen, die die Engine kennt: Gildenverträge, Orte, Personen und Kreaturen, Gegenstände (wie bisher nur mehrwortige Namen), jeweils mit ihrer ID.
  - `deed: true` heißt: Der Name steht an der Verbstelle einer eigenen Tat („I kill the rats“). Dann bleibt der Text für den Parser stehen.
  - Sonst ist der Name keine Tat und wird für den Parser maskiert. „Take the Cull the Gnaw-Hide Boars contract“ ist daher kein Schleichen, weil der Titel als Vertrag verknüpft ist. Eine Titelregel gibt es dafür nicht.
  - Der Mechanismus ist der von 4.1.5 (`maskNames`). Neu ist, dass er Daten liefert: `linkEntities` (src/intent.js) gibt Maskierung und Links in einem Durchgang zurück; `maskNames` ist nur noch eine Sicht darauf.
- **`acts`**, Fast Path: der Akt des Parsers (`command`, `creation.*`, `attack`, `engage`, `stealth`, `ambiguous_target`, `no_target`, `unknown_skill`) mit `source: 'parser'`. `playerTurn` bekommt den geparsten Intent übergeben und liest den Text nicht noch einmal.
- **`acts`**, Story-Pfad: die Interpreter-Befehle nach dem Agency Guard, `source: 'interpreter'`. Was der Guard entfernt hat, bleibt mit `dropped: <Regel>` sichtbar.
- **`route` und `reason`:** erzwungen (`campaign`, `creation`, `dead`, `fight`, `committed`) oder aus dem Akt. Ein mechanischer Akt geht in die V3-Engine, sonst läuft der Story-Pfad, genau wie der Router von 4.1.5.
- **Wiederverwendung:** Swipe und Regenerate nutzen den Record, wie bisher. Der Decision Trace zeigt für beide Pfade dieselbe Form.

### 2.2 Decision Ownership (`src/v4/ownership.js`)

Jede kanonische Zustandsart hat **genau eine** Owner-Domain. Die Tabelle ist Daten (`STATE_KINDS`, 22 Arten), kein Kommentar.

| Zustandsart | Owner | Engine-eigen |
|---|---|---|
| `pc.coin`, `trade` | economy | `pc.coin` ja |
| `pc.inventory` | inventory | ja |
| `pc.vitals`, `combat` | combat | ja |
| `pc.progress` | progression | ja |
| `quest.status`, `guild.standing`, `guild.board` | guild | ja |
| `pc.location` | movement | nein (sein `go` oder eine erzählte Ankunft) |
| `quests` (private Arbeit, Notizen, Fortschritt, Bereitschaft, Reisen) | quests | nein |
| `scene`, `entities`, `places`, `objects` | world | nein |
| `facts` (mit Kampf-Scope, §2.4) | facts | nein |
| `knowledge`, `relations`, `memory`, `threads`, `time` | je eigene Domain | nein |
| `audit` | audit | keine Spielzustände |

**Was ein Delta schreiben darf.** `DELTA_WRITES` deklariert für jeden der 30 Delta-Typen seine Zustandsarten. Eine engine-eigene Art erreicht ein Delta nur über ein benanntes Tor:

| Delta | Tor (Art → Prüfung) |
|---|---|
| `hostile`, `creature.new` | `combat` → `envelope.fight` |
| `intent` | `combat` → `narrated_intent` |
| `coin.gift`, `object.move` | `pc.coin` / `pc.inventory` → `envelope.give` |
| `coerce` | `pc.coin`, `pc.inventory` → `envelope.take` |
| `offer` | `pc.coin`, `pc.inventory` → `player.buy` |
| `object.new` | `pc.inventory` → `player.take` |
| `recover` | `pc.vitals` → `player.rest` |
| `quest.close` | `quest.status` → `world.failed` |
| `listing.gone` | `guild.board`, `quest.status` → `world.taken` |
| `arrive` | Status, Coin, XP, Inventar, Rang → `conditional` (die Abgabe, die sein eigener Befehl an die Ankunft gebunden hat) |

`eventKind` ordnet jedes Event einer Art zu, auch datenabhängig (`coin.changed` von Alaric ist `pc.coin`, von anderen `entities`). Der World-Applier fragt bei eingeschaltetem Assert (`assertOwnership`, in der ganzen Testsuite an) bei **jedem** Event eines Deltas `ownershipViolation` und bricht mit „Decision Ownership: …“ ab.

**Regel für Freitext.** Freitextspeicher dürfen Engine-Zustand nicht als zweite Wahrheit enthalten: Status, Auszahlung, XP, Rang oder Mitgliedschaft eines Gildenvertrags. Eine einzige Klauselregel (`ownedClause`, `stripOwned`) gilt für alle Speicher:
- **Quest-Notiz** (`quest.detail`): wie 4.1.5, Klausel für Klausel gleich (Test über alle Notizen und Erinnerungen der Aufzeichnungen).
- **Erinnerung** (`memory`), neu: Klauseln mit Engine-Zustand fallen weg, der Moment bleibt. Besteht die Erinnerung nur aus Engine-Zustand, wird sie abgelehnt (`engine_owned_memory`). Eine Zahlung für Waren oder ein Zimmer bleibt; Geld mit Gildenbezug (Belohnung, Gebühr, Vertrag, Kopfgeld, Auszahlung) ist das der Engine.
- **Bereitschaftsnotiz** (`quest.ready`), neu: Für die Prüfung „ist das Ziel erreicht?“ zählt nur die Geschichte der Notiz, nicht ihr behaupteter Status oder Betrag.
- Ein falsch behaupteter Status führt wie bisher zu einer Korrektur.

Die Regel ersetzt die verteilten Kopien in guild.js, firewall.js und world.js (§4).

### 2.3 World/Reaction Envelope (`src/v4/envelope.js`, `src/policy.js`)

Der Envelope wird vor der Narration deterministisch aus dem Zustand berechnet: für jeden anwesenden lebenden Akteur außerhalb eines Kampfes, ob er sich gegen Alaric wenden und ob er ihm Coin oder Dinge nehmen darf. Seine Regeln sind die, die die Engine schon hatte; keine ist neu erfunden.

- **Gewalt eröffnen** (`mayOpenFight`):
  - Wen dieselbe Antwort neu einführt, der ist frei (ein Hinterhalt ist der Zug der Welt).
  - Wer schon kämpft oder sich in der letzten Antwort festgelegt hat, gehört der Engine.
  - Sonst entscheidet `opensViolence` (src/policy.js), dieselbe Funktion, die `npcDecide` im Kampf fragt:
    - Menschen: nur bei aggressivem Temperament, feindseliger Haltung (≤ −20) oder nachdem Alaric sie verletzt oder angegriffen hat (`provoked_only`).
    - Scheue Tiere: nur in die Enge getrieben, also auf ENGAGED und unverletzt (`cornered_only`).
    - Defensive Tiere: nur, was in Reichweite kommt (ENGAGED, `reach_only`).
    - Alle anderen Tiere: frei.
- **Nehmen** (`mayTake`): Strafe und Beschlagnahme nur durch eine Obrigkeit (Rolle); Raub nur durch einen feindseligen Räuber oder in einem festgelegten oder laufenden Kampf. Die Gegenseite eines Handels nimmt nie (vorher geprüft, unverändert).

Derselbe Envelope wird zweimal verwendet:
1. **Vor der Prosa.** Der Engine-Block zeigt nur die Grenzen (Abschnitt `WORLD ENVELOPE`, gruppiert, nichts in einem Kampf, bei der Erschaffung oder in V3). Innerhalb der Grenzen entscheidet der Erzähler frei, wer hilft, ablehnt, geht, blufft oder zögert. Die Vertragszeile (Revision 4.2.0) sagt das. Der Abschnitt hat ein **eigenes Kontingent** wie die Situationsregeln und die Ausgabezeile: Er verdrängt keine abgerufene Erinnerung und keine Lore (§6.2).
2. **Nach der Prosa.** Der World-Applier prüft `hostile`, `intent: attack` (außerhalb eines Kampfes) und `coerce` mit denselben Funktionen gegen den Zustand **dieses Schritts**. Eine Haltung, die die Antwort vorher senkt, ist ein Anlass. Eine Ablehnung (`envelope`) bringt eine Korrektur in den nächsten Engine-Block.

Kampf, Erzähler-Vorgabe und Prüfung können damit nicht auseinanderlaufen. Der Paritätstest prüft beide Richtungen: für Menschen über Temperament × Haltung × Verletzung, für Tiere über Temperament × Abstand × Treffer gegen die Verzweigungen von `npcDecide`.

### 2.4 Selective Persistence: der Kampf-Scope

Was die Geschichte **während eines Kampfes** über die Kämpfenden sagt (Wunden, wie einer sich bewegt, was er tut), beschreibt Zustand, der dem Kampf gehört. Ein solcher Fakt bekommt `scope: {fight: <Encounter-ID>}` und ist nur aktuell, solange dieser Kampf läuft:
- Gescoped wird ein nicht-funktionaler Fakt über einen Kampfteilnehmer und ein Fakt über die Art der noch stehenden Gegner („the wolves“, „the last wolf“), der keine Entität nennt.
- Nicht gescoped werden funktionale Eigenschaften eines Kampfteilnehmers (Aussehen, Name, Status) und alles, was außerhalb eines Kampfes gesagt wird.
- Die Gültigkeit wird beim Lesen ausgewertet (`factLive` in src/knowledge.js), es gibt kein Lösch-Event. Das Log behält jeden Fakt; wer einen solchen Fakt kannte, kennt nach dem Kampf etwas Veraltetes (`outdated`).
- Den Zustand eines Kampfteilnehmers selbst (`condition`) lehnt schon die V3-Regel ab, wie bisher.

**Abweichung vom Plan.** Geplant war ein optionales Extraktor-Feld `scope: scene | local | lasting` mit Aufstieg bei Wiederkehr. Es ist bewusst **nicht** gebaut:
1. **Daten:** In den drei aufgezeichneten Live-Läufen waren die Ortsfakten außerhalb von Kämpfen überwiegend dauerhaft („Millbrook has an alehouse“). Die flüchtigen Fakten häuften sich in Kämpfen, und dort folgt die Lebensdauer ohne Modellurteil aus der Ownership-Tabelle (`combat` ist engine-eigen).
2. **Messbarkeit:** Ein neues Feld ändert Prompt und Schema des Extraktors (extract-5.0, durch Tests und P0 festgehalten). Ob das Modell `scene` und `local` verlässlich setzt, lässt sich nur mit dem echten Modell messen. Ein nicht messbarer Baustein wird nicht erzwungen (§5).

Ergebnis in den Replays: 8 von 94 Fakten gescoped, alle während eines Kampfes, keiner außerhalb.

### 2.5 Was unverändert bleibt

- Records pro Nachricht und Swipe, Barriere, `input_hash`-Wiederverwendung, `text_hash` der Antworten, Bearbeiten ohne Retcon;
- Extraktor-Pfad (ein Aufruf, eine Reparatur, extract-5.0), Firewall-Regeln (P0-Rescore identisch), alle V3-Regeln;
- V3-Kampagnen: kein IR-Feld, kein Envelope, keine Scopes. Der V3-Differenzlauf ist bis auf die Versionsanzeige identisch.

## 3. Migrationsreihenfolge (ausgeführt)

Jeder Schritt hielt alle bestehenden Tests unverändert grün, brachte eigene Tests mit und ließ den V3-Differenzlauf identisch.

| Schritt | Commit | Inhalt |
|---|---|---|
| 1 Ownership | `075280d` | `ownership.js` (Tabelle, Tore, Klauselregel); guild.js, firewall.js und world.js nutzen sie; Erinnerungen und Bereitschaftsnotizen ohne Engine-Zustand; Assert in der ganzen Suite |
| 2 Envelope | `8cd0920` | `policy.js` (`opensViolence`, gemeinsam mit `npcDecide`), `envelope.js`; Rollenregeln aus world.js in den Envelope; Prüfung von `hostile` und `intent: attack`; Abschnitt im Engine-Block; Vertragszeile, Revision 4.2.0 |
| 3 Intent IR | `94748ab` | `ir.js` (`readTurn`, Links, Akte); `routeTurn` und `maskNames` als Sichten; IR im Record; `playerTurn` ohne zweiten Parse |
| 4 Scope | `2b7637e` | Kampf-Scope für Fakten, Gültigkeit beim Lesen (statt Extraktor-Feld, §2.4) |
| 5 Prüfung | `a360616`, `3186deb`, `1128a79` | Mutationsprobe und V4-Differenzlauf; daraus: Envelope mit eigenem Kontingent, zweiseitige Parität, Test der Assert-Verdrahtung; `tools/v4_diff.mjs`; Build 4.2.0 |

## 4. Ersetzte Logik, Nicht-Ziele und bewusst nicht Umgebautes

**Ersetzt** (jeweils mit Test, dass das alte Verhalten gleich bleibt):

| Alt (4.1.5) | Neu |
|---|---|
| `maskNames` als Textumbau | `linkEntities`: Maskierung und Links in einem Durchgang; byte-gleiche Maskierung über mehr als 5000 Zustand×Nachricht-Paare |
| `V3_KINDS` im Router | `readTurn`/`MECHANICAL`; dieselbe Route für alle Zustände und Nachrichten der Aufzeichnungen und Korpora |
| zweiter Parse in `playerTurn` | der geparste Intent wird übergeben |
| Klauselregel in guild.js, Hilfsfunktionen in firewall.js, Inline-Zerlegung in world.js | eine Regel `ownedClause`/`stripOwned` |
| Rollen-Regex für Raub und Strafe in world.js | `mayTake` im Envelope, Urteile unverändert |
| Inline-Bedingung in `npcDecide` | `opensViolence`, V3-Differenzlauf identisch |

**Keine Heuristik gelöscht ohne Nachfolger.** Die Firewall-Regeln für Engine-Fakten, Auszahlungen und Inventar bleiben, wie sie sind. Ob der Envelope oder die Ownership-Tabelle einzelne von ihnen vollständig übernimmt, zeigen die vorhandenen Daten nicht; der P0-Rescore ist identisch, also hat sich an ihren Urteilen nichts geändert.

**Nicht-Ziele:**
- **Interpreter für Angriff und Schleichen:** Er wäre der nächste IR-Schritt (Regex nur noch für eindeutige Syntax). Dafür muss sich der Interpreter-Prompt ändern, und das lässt sich nur mit dem echten Modell messen (P0/S1-Korpus). Bewusst nicht Teil dieses Branches.
- **LLM-Resolver vor der Prosa (Spike-Arm G4):** bleibt ein Vergleichsexperiment gegen den Envelope (G3.5), keine Architektur.
- **Due-Queue und Lazy Simulation:** Die Ownership-Tabelle und der Envelope schaffen die Grundlage. Die Queue folgt erst, wenn ein Live-Lauf einen Bedarf zeigt.
- **NPC-Tiefe T2/T3 (Inner World):** gibt es nicht. Auch LWE nutzt sie im untersuchten Projekt null Mal.
- **Extraktor-Scope `scene`/`local`/`lasting`:** siehe §2.4.
- **Die zwei offenen 4.1.6-Befunde** aus der ChatGPT-Prüfung gehören nicht in diesen Architekturbranch.

## 5. Messung und Abbruch

- **Tokens:** Der Envelope erscheint nur, wenn er etwas einschränkt. Ziel: im Median höchstens +60 Tokens pro Engine-Block.
- **Latenz:** Es gibt keinen zusätzlichen LLM-Aufruf. Die deterministische Rechenzeit wird gemessen.
- **Abbruch je Baustein:** Wenn ein Baustein einen bestehenden Test, ein Replay oder den V3-Differenzlauf verschlechtert und das nicht ohne Sonderregel lösbar ist, wird er zurückgenommen und der Befund hier festgehalten. Ein Baustein, dessen Nutzen sich hier nicht messen lässt, wird nicht erzwungen.

## 6. Ergebnisse

### 6.1 Tests

| Prüfung | Ergebnis |
|---|---|
| Testsuite (`npm test`) | 542/542 (515 bestehende + 27 neue in `tests/v4/gen35_*.test.js`); keine bestehende Testdatei geändert, `tests/helpers.js` schaltet nur den Ownership-Assert für alle ein |
| V3-Differenzlauf (Testruns v8–v12, `xp10`) | identisch bis auf die Versionsanzeige im `#audit`-Panel |
| V4-Differenzlauf (`tools/v4_diff.mjs`, drei Live-Läufe, 122 Schritte) | 55 Schritte identisch; jeder Unterschied in einer erwarteten Kategorie (IR-Feld 62, Envelope-Abschnitt 33, Kampf-Scope 8, Retrieval nach abgelaufenen Kampf-Fakten 5); keiner „other“; Endzustände gleich bis auf Scopes und Versionsstempel; keine Envelope-Ablehnung |
| P0-Rescore (S1-Guard, S2-Firewall) | identisch mit der Basis |
| Mutationsprobe (36 Mutanten über Ownership, Envelope, Policy, IR und Scope) | jeder Mutant lässt mindestens einen Test scheitern (Lauf auf dem Endstand) |
| Browser-Smoke | V3- und V4-Seite OK |
| SillyTavern-Smoke V4 (echtes ST, Mock-Provider) | OK; Status „Avereth Engine 4.2.0 … narrator contract: current“; `WORLD ENVELOPE` steht im Prompt an den Erzähler; kein Schlüssel im Browser, `secrets.json` leer |
| SillyTavern-Smoke V3 | OK, alle 21 Prüfpunkte |

### 6.2 Befunde der Prüfung (und was daraus wurde)

1. **Der Envelope verdrängte Kontext.** Der V4-Differenzlauf zeigte: Mit Priorität 0 zählte der Abschnitt gegen das Budget des Engine-Blocks und schob in 5 von 28 Story-Zügen des Laufs vom 30.09. RELEVANT oder LORE hinaus. Jetzt hat er ein eigenes Kontingent; ein Test belegt über alle Story-Züge der drei Läufe, dass der Block genau der alte plus der Envelope ist.
2. **Die Policy-Parität war nur einseitig geprüft.** Ein `npcDecide`, das strenger wird als die Policy, fiel keinem Test auf (Mutant E9). Der Paritätstest ist jetzt zweiseitig, für Menschen und Tiere.
3. **Die Assert-Verdrahtung war ungetestet.** Abschalten des Asserts im World-Applier ließ keinen Test scheitern (Mutant O1). Ein Test entzieht jetzt einem Delta seine Deklaration und erwartet den Abbruch.

### 6.3 Tokens und Rechenzeit

| | Wert |
|---|---|
| Story-Züge mit Envelope | 33 von 60 (55 %) |
| Envelope-Abschnitt, wenn vorhanden | Median 47, höchstens 78 Tokens |
| Engine-Block je Story-Zug | im Mittel +28 Tokens (Median +41, höchstens +79); Median 1274 → 1292 |
| Rechenzeit der Engine (alle Nachrichten, Median aus 5 Läufen) | 596 → 589 ms (56 Nachrichten), 231 → 231 ms (36), 166 → 163 ms (30): unverändert |
| zusätzliche LLM-Aufrufe | keine |

## 7. Bewertung

Gen 3.5 ist **keine neue Architekturgeneration**, sondern eine wesentlich sauberere Generation 3:
- Der Turn-Ablauf, die Autorität, die Speicherung und die Modellaufrufe sind dieselben wie in 4.1.5; der V3-Pfad und die Firewall-Urteile sind nachweislich unverändert.
- Neu sind Grenzen als Daten: wem welche Zustandsart gehört, welche Reaktion vor der Prosa frei ist, was eine Nachricht bedeutet, wie lange ein Fakt gilt. Vorher steckten diese Grenzen verteilt in Regex und Kommentaren.
- Echte neue Fähigkeiten sind wenige und klein: Der Erzähler sieht die kausalen Grenzen vor dem Schreiben; Erinnerungen tragen keinen Engine-Zustand mehr; Kampfnarration veraltet mit dem Kampf; jede Spielernachricht hat einen lesbaren IR-Eintrag.
- Komplexität: Der Quelltext ist gewachsen (etwa +500 Zeilen, davon gut die Hälfte die Ownership-Tabelle als Daten). Sie ist aber an einer Stelle gebündelt (eine Klauselregel statt drei, eine Gewaltpolicy statt zwei, ein Parse statt zwei), und der Ownership-Assert prüft sie in jedem Test.
- Ob der Envelope die Prosa im echten Spiel verbessert, also weniger Korrekturen bei gleicher Freiheit, zeigt erst ein Live-Lauf. Die Replays belegen nur, dass er nichts verschlechtert, was sie messen können.
