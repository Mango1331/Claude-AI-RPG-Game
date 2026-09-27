# Externes Review des Runtime-V4-Plans (ChatGPT)

> Externes Review von ChatGPT auf Revision 1 des Plans (Commit `52ed696`), vom Nutzer übergeben am 27.09.2026. Wörtlich übernommen; nur die erste Überschrift ist auf diese Zeile und den Titel angepasst.
> Umsetzung: [RUNTIME_V4_PLAN.md](RUNTIME_V4_PLAN.md), Revision 2 (Abschnitt R).

Ich habe nicht nur die Zusammenfassung geprüft, sondern den tatsächlichen Stand des Commits `52ed696`, insbesondere:

- `docs/RUNTIME_V4_PLAN.md`
- `docs/TESTRUN_V12.md`

Mein Gesamturteil ist positiv:

**Runtime V4 / Engine 4.0 ist nach dem 3.1.7-Lauf gerechtfertigt.**

Die vorgeschlagene Grundarchitektur ist deutlich stärker als weitere 3.1.x-Minifixes:

> LLM interprets and narrates. Engine validates and commits.

Insbesondere halte ich folgende Entscheidungen für richtig und möchte sie grundsätzlich beibehalten:

- Event Sourcing bleibt.
- Canonical State bleibt.
- HUD bleibt.
- Combat V3 bleibt möglichst unverändert.
- Character Creation und `#`-Commands bleiben deterministisch.
- Player Actions werden vor der Narration als typisierte Commands interpretiert.
- Player Agency kann nicht mehr durch Narrator-Deltas erzeugt werden.
- Command → Guard → Domain Event wird die mechanische Grenze.
- Entity existence und Presence werden getrennt.
- World Deltas werden geordnet statt als End-Snapshot verarbeitet.
- Locations bekommen eine Hierarchie.
- Quests werden echte Aggregate mit Objectives und Proof.
- Guild Boards werden persistent und engine-backed.
- physische Ressourcen/Objekte werden nicht mehr durch freie Facts ersetzt.
- Offers/Services/Transactions bekommen ein eigenes Modell.
- `taken_by`/`forced_by` als allgemeiner Authority-Bypass verschwindet.
- alte Events werden nicht umgeschrieben; Migration läuft additiv über Reducer/Upcaster.
- der 07:10-Lauf wird Golden-V4-Test.

Der Plan ist daher aus meiner Sicht eine sehr gute Grundlage.

Ich würde ihn aber **noch nicht unverändert zur Implementierung freigeben**.

Vor P0/P1 möchte ich einige Punkte im Plan ändern bzw. ausdrücklich entscheiden.

---

# 1. Wichtigste Änderung: D2 neu bewerten

Der aktuelle Plan empfiehlt:

> Narrator schreibt nur Prosa  
> danach läuft bei jedem Story-Turn ein separater Extraction-Call.

Das würde ich so **nicht als bevorzugte V4-Architektur festlegen**.

Einer der besten Ansätze der bisherigen Runtime ist gerade:

- HUD wird vollständig lokal aus dem Canonical State erzeugt;
- der normale Narrator-Turn braucht keinen zweiten LLM-Aufruf;
- ein zusätzlicher kleiner Extraction-/Recovery-Aufruf erfolgt nur, wenn der Report fehlt oder nicht verarbeitet werden kann.

Dieses Token-Sparprinzip möchte ich erhalten.

Der heutige Report selbst ist problematisch.

Das Prinzip „normalerweise Inline-Daten, Recovery nur bei Fehler“ ist dagegen gut.

## Bevorzugte V4-Variante

Der normale Story-Pfad soll sein:

```text
PLAYER TEXT
→ Semantic Interpreter
→ PlayerCommand[]
→ Engine Guards / Commands
→ PLAYER ACTIONS
→ Narrator
→ Prosa + kleiner geordneter V4-World-Delta-Block
→ lokaler Validator
→ Domain Events
→ fold()
→ Canonical State
→ HUD
```

Der neue Inline-Block darf ausdrücklich **nicht** der heutige große Fact Report sein.

Er soll:

- ausschließlich typisierte World Deltas enthalten;
- ihre Reihenfolge über `seq` erhalten;
- keine Player Agency erzeugen;
- aus derselben Schema-/Vokabularquelle entstehen wie Validator und Recovery;
- möglichst klein sein;
- nach Verarbeitung wieder aus der Prompt-History entfernt werden, wie der heutige `<avereth>`-Block.

Beispiel:

```json
{
  "expected": {
    "2": {
      "arrived": true
    }
  },
  "deltas": [
    {
      "seq": 1,
      "type": "person.new",
      "ref": "npc.ossler",
      "name": "Ossler",
      "role": "carter",
      "present": false
    },
    {
      "seq": 2,
      "type": "arrive",
      "at": "loc.redmarch.reedbeds"
    },
    {
      "seq": 3,
      "type": "time",
      "minutes": 60
    }
  ]
}
```

Damit bleiben die wesentlichen V4-Vorteile erhalten:

- kein End-Snapshot;
- Reihenfolge vorhanden;
- Existenz und Presence getrennt;
- typisierte Deltas;
- einheitliches Schema;
- lokale Validierung;
- `expected` kann Completeness prüfen.

## Recovery bleibt conditional

Nur wenn der Delta-Block:

- fehlt;
- syntaktisch ungültig ist;
- lokal das Schema verletzt;
- unbekannte Referenzen verwendet;
- oder ein von der Engine verlangtes `expected`-Feld nicht beantwortet,

soll ein separater Recovery-Extractor laufen:

```text
Narrator
→ Delta fehlt / invalid / incomplete
→ Recovery Extractor
→ typed ordered World Deltas
→ Validator
→ Engine
```

Damit werden die heutigen drei Sonderwege:

- REPORT REQUEST
- ATTACKERS REQUEST
- PLACE REQUEST

durch **einen universellen V4-Recovery-Extractor** ersetzt.

Das halte ich für eine sehr gute Weiterentwicklung der bisherigen Lösung.

## Warum ich Always-on Extraction nicht bevorzuge

Deine eigene Messung zeigt:

- heutiger Narrator: großer Call;
- Recovery nur bei einem Teil der Antworten;
- Always-on V4-Extraction würde dagegen jeden Story-Turn noch einmal mit ungefähr 2–3k Prompt-Tokens verarbeiten.

Dass die Extraction im Hintergrund läuft, hilft bei der gefühlten Latenz.

Es spart aber:

- keine Tokens;
- keine API-Kosten;
- keine Rate-Limits;
- und bei schneller Spielweise wartet der nächste Turn trotzdem auf den Abschluss.

Der Semantic Interpreter ist bereits ein neuer Pflicht-Call vor Story-Turns.

Ich möchte deshalb nicht gleichzeitig auch noch den bisherigen conditional Recovery-Pfad ohne empirischen Grund in einen zweiten Pflicht-Call verwandeln.

## S2 soll beide Varianten messen

Bitte S2 entsprechend ändern.

Vergleiche empirisch:

### Variante A
Narrator nur Prosa + Always-on Extraction.

### Variante B
Narrator Prosa + kleiner geordneter Delta-Block + Extraction nur bei:

- missing;
- invalid;
- incomplete.

Verglichen werden mindestens:

- Delta-Vollständigkeit;
- semantische Korrektheit;
- Schema-Gültigkeit;
- Retry-Quote;
- Tokenverbrauch;
- Latenz;
- Zahl notwendiger Recovery-Calls.

Meine aktuelle Präferenz ist klar **Variante B**.

Wenn S2 aber zeigt, dass der kleine Inline-Delta-Block mit dem realen Modell unzuverlässig ist, kann A weiterhin der Fallback sein.

Bitte D2 entsprechend nicht vorab auf „Always-on Extraction“ festschreiben.

---

# 2. HUD und Event Log sind KEEP-Komponenten

Das möchte ich ausdrücklich als Architekturvorgabe ergänzen.

Das HUD ist eine der stärksten bisherigen Lösungen.

Es bleibt:

```text
Domain Events
→ fold()
→ Canonical State
→ HUD
```

Das HUD:

- ist lokal;
- erzeugt keine LLM-Kosten;
- ist nicht selbst State;
- muss nicht in voller Form zurück in den Prompt;
- kann jederzeit aus dem Canonical State neu erzeugt werden.

V4 darf daraus keinen LLM-basierten Character Sheet-/Tracker-Pfad machen.

Dasselbe gilt für:

- Event Export;
- Audit;
- Swipe-sichere Events.

Diese Prinzipien bitte ausdrücklich unter **KEEP** dokumentieren.

---

# 3. Guild Operations sollen echte Guild Locations verlangen

Der V4-Plan führt erstmals eine echte Location-Hierarchie ein.

Dann sollten wir die alte Vereinfachung:

> eine Stadt besitzt eine Guild Branch, also genügt Aufenthalt irgendwo in der Stadt

nicht weitertragen.

Das war in 3.1.5 nur notwendig, weil wir keine saubere Ortsstruktur hatten.

Mit V4 kennen wir beispielsweise:

```text
realm.veyrhold
└── loc.redmarch
    └── loc.redmarch.guild_hall
        └── ggf. front desk
```

Daher sollen folgende Guild Actions eine tatsächliche Guild-Hall-/Branch-Site voraussetzen:

- `guild.register`
- `guild.promote`
- `board.read`
- Annahme eines Board Contracts
- `quest.turn_in`

Nicht lediglich:

```text
current settlement has a Guild branch
```

sondern:

```text
current location is the Guild branch / Guild hall
```

Ein eigenes Front-Desk-Interior ist nicht zwingend nötig.

`guild_hall` als getaggte Site reicht zunächst.

## Beispiel

Player:

```text
I return to the Guild and turn in Herb Run.
```

Interpreter:

```json
[
  {
    "seq": 1,
    "type": "go",
    "to": "loc.redmarch.guild_hall"
  },
  {
    "seq": 2,
    "type": "quest.turn_in",
    "quest": "quest.herb_run"
  }
]
```

Die Engine erkennt:

```text
turn_in ist conditional auf die erfolgreiche Ankunft an der Guild Hall
```

Narrator erzählt die Rückkehr.

World Delta:

```text
arrive → loc.redmarch.guild_hall
```

Danach feuert der conditional Command:

```text
Proof prüfen
→ Quest completed
→ Guild payout
→ Quest XP
→ completion counter
```

Das ist wesentlich sauberer als „Redmarch = Front Desk“.

Bitte diese Änderung in §4, §6.1 und §6.3 einarbeiten.

---

# 4. D1 – Interpreter ohne Regex-Fallback

**Zustimmung.**

Kein Regex-Fallback für Player Agency.

Sonst hätten wir wieder zwei Bedeutungsquellen:

```text
Semantic Interpreter
+
Notfall-Regex
```

und damit genau RC1 erneut eingeführt.

Bei Interpreter-Fehler:

- ein Retry;
- danach sichtbarer Fehler;
- keine mechanische Player Action buchen;
- Regenerate darf erneut interpretieren.

Combat, Character Creation, `#`-Commands und andere bereits deterministische Spezialpfade bleiben davon unberührt.

---

# 5. D3 – Guild Board zuerst kanonisieren

**Zustimmung zu Variante A.**

Guild Listings sollen vor der Narration canonical sein.

Also:

```text
Engine erkennt:
Board benötigt Listings

→ Board Generator
→ structured Quest Aggregates
→ Engine validiert
→ committed
→ Narrator bekommt BOARD
→ Narrator beschreibt nur diese Listings
```

Das löst den schwerwiegenden V12-Fall:

```text
5 Quests in Prosa
0 Quests in State
```

konstruktiv.

Der Narrator soll an einem Guild Board keine zusätzlichen offiziellen Guild Contracts erfinden, die nicht im BOARD-Block stehen.

Fallback B darf für Generator-Ausfall bestehen bleiben, sollte aber nicht der Normalweg sein.

---

# 6. D4 – unbekannter Preis

**Zustimmung.**

Ein Kauf mit unbekanntem Preis bleibt eine offene Entscheidung.

Beispiel:

Player:

```text
I look for an inn where I can sleep, bathe and wash my clothes.
```

NPC:

```text
Room 4 cp.
Bath 2 cp.
Laundry 1 cp.
```

Danach darf die Engine **noch nichts bezahlen**.

Der Narrator muss an der Entscheidung halten.

Erst:

```text
I'll take all three.
```

führt zu:

```text
offer.accept
→ Coin prüfen
→ -7 cp
→ Services granted
```

Ausnahmen nur, wenn der Player vorher selbst autorisiert:

```text
anything under 10 copper is fine
```

oder sinngemäß:

```text
I don't care what it costs
```

Das wird als `max_cp` bzw. explizite unbeschränkte Preisautorisierung interpretiert.

---

# 7. D5 – eigenes Connection Profile

**Zustimmung, aber optional.**

Standard darf zunächst das Hauptprofil sein:

- Reasoning aus;
- kleiner Prompt;
- kleine Outputs.

Wenn ein separates schnelles Modell/Profil für:

- Interpreter;
- Recovery Extractor;
- ggf. Board Generator

nachweislich schneller und ausreichend genau ist, soll es konfigurierbar sein.

Bitte keine Architektur bauen, die zwingend mehrere Provider/Profile voraussetzt.

---

# 8. D6 – Pending Check nicht zum 4.0-Blocker machen

Hier bin ich konservativer als der aktuelle Plan.

Ich halte Pending Check grundsätzlich für die bessere Architektur:

```text
Situation verlangt Check
→ Engine validiert Check Gate
→ Engine würfelt
→ Narrator sieht erst das Ergebnis
```

Das ist besser als der heutige vorab sichtbare CHECK DIE.

Aber:

Der aktuelle V4-Umbau enthält bereits gleichzeitig:

- Commands;
- World Deltas;
- Quest Domain;
- Guild Boards;
- Objects;
- Offers;
- Locations;
- Presence;
- Activities;
- Migration;
- neue Schemas;
- neue Runtime Records.

Der Check-Pfad ist im 07:10-Lauf kein V4-Blocker.

Ich würde deshalb:

### In 4.0
- State-/Event-Haken für Pending Check vorbereiten;
- Schema/Event-Namen reservieren;
- Architektur nicht dagegen verbauen.

### In 4.1
- CHECK DIE entfernen;
- `check.request`;
- world-initiated pending checks;
- vollständige Migration des Check-Flows.

Falls P5 während der Implementierung überraschend klein und risikoarm bleibt, kann es noch in 4.0 landen.

Aber **4.0 Release darf nicht davon abhängen**.

Bitte D6 entsprechend abschwächen.

---

# 9. D7 – Guild Registration Fee

Hier möchte ich eine konkrete Canon-Entscheidung treffen:

**Die reguläre Guild Registration Fee beträgt 2 Silver = 20 Copper.**

Sie ist ein standardisierter institutioneller Guild-Vorgang.

Dafür brauchen wir keinen jedes Mal neu erfundenen NPC-Preis.

Also:

```json
rules.guild.registration_fee_cp = 20
```

Die Engine kennt den Wert.

Beim Registrierungsprozess kann der Clerk ihn narrativ nennen.

Player muss weiterhin das Bezahlen autorisieren.

Dann:

```text
pay registration fee
→ -20 cp
→ guild.registered
```

Das verhindert unnötige Drift zwischen Filialen.

Sollten später Sonderregionen andere Gebühren brauchen, kann Content eine explizite Branch-Ausnahme definieren.

Der Default-Canon bleibt 20 cp.

---

# 10. D8 – Ressourcen in Quest-Einheiten

**Zustimmung.**

Wenn ein Quest verlangt:

```text
1 full basket marshmint
```

dann darf Runtime zunächst genau diese Einheit tracken:

```text
qty: 1
unit: basket
```

Keine automatische Umrechnung:

```text
stems
grams
bundles
basket volume
```

Kein Gewichtssystem.

Kein Container-Simulator.

Wenn spätere Content-Mechanik konkrete Einheiten braucht, kann sie ergänzt werden.

---

# 11. D9 – andere Adventurers nehmen Listings

Das Grundsystem möchte ich.

Andere Adventurer sollen Board Contracts tatsächlich nehmen können.

Aber:

**20 % pro Listing und Tag soll nicht ohne weitere Entscheidung als harte Canon-Konstante festgeschrieben werden.**

Bitte trennen:

### Engine-System
```text
Listings können off-screen durch andere Adventurer verschwinden.
```

Das ist Canon/Mechanik.

### konkrete Wahrscheinlichkeit
```text
20 %
```

bleibt:

```text
PROPOSED
```

und datengetrieben in `rules.json`.

Sie soll später leicht getuned werden können.

Keine Lorebook-Aussage sollte exakt „20 %“ canonisieren.

---

# 12. D10 – Rank Caps je Guild Branch

Auch hier:

Mechanismus ja.

Harte universelle Regel noch nicht.

Eine Branch soll deklarieren können:

```text
supported_ranks:
Novice
Proven
Veteran
...
```

Für automatisch erzeugte Standard-Filialen dürfen Defaults gelten, beispielsweise:

```text
city → Novice–Veteran
capital → Novice–Elite
```

Aber bitte als:

- Runtime Default;
- PROPOSED;
- overridable Content.

Nicht als unveränderliches Weltgesetz.

Eine besondere Stadt oder Institution kann später problemlos höhere Verträge anbieten.

---

# 13. D11 – Payout-Bänder

Hier würde ich **keine harte Engine-Ablehnung** anhand eines vorgeschlagenen Bandes wie:

```text
Novice 10–200 cp
```

bauen.

Uns fehlt derzeit ein vollständiges Wirtschaftsmodell.

Ein Novice Contract kann je nach:

- Auftraggeber;
- Entfernung;
- Gefahr;
- politischer Dringlichkeit;
- benötigtem Material;
- Region;
- Zusatzbedingungen

sehr unterschiedlich bezahlt werden.

Payout-Bänder dürfen als:

- Generator Guidance;
- Soft Plausibility Check;
- Warning;
- Testheuristik

verwendet werden.

Aber ein Quest außerhalb des Bands sollte nicht allein deshalb invalid sein.

Also:

```text
hard schema:
cp is integer >= 0
```

plus:

```text
soft generation guidance:
Novice contracts are normally in plausible low-rank ranges.
```

Die Engine besitzt den einmal festgelegten konkreten Payout danach unveränderlich.

---

# 14. D12 – Gathering Yield

**Zustimmung.**

Wir brauchen kein Engine-Ertragsmodell für jede Pflanze.

Player autorisiert:

```text
activity:
gather marshmint
until evening
```

Narrator entscheidet innerhalb der plausiblen Welt:

```text
wie erfolgreich war die Tätigkeit?
```

World Delta erzeugt beispielsweise:

```text
object.new:
marshmint
qty: 1
unit: basket
holder: pc
```

Engine prüft:

- Activity war autorisiert;
- Ressourcentyp passt;
- Zeit liegt im erlaubten Deckel;
- Objekt wird persistent.

Genau hier soll narrative Freiheit bleiben.

---

# 15. Physical Object / Resource Model ausdrücklich beibehalten

Diesen Teil des Plans halte ich für besonders wichtig.

Facts dürfen nicht mehr als Ersatz für physisch relevante Dinge benutzt werden.

Also:

```text
fact:
Alaric gathered a pile of marshmint
```

darf narrative Information sein.

Aber sobald dieser Marshmint:

- transportiert;
- abgegeben;
- verkauft;
- als Quest Proof verwendet;
- verloren;
- gestohlen

werden kann, braucht er Physical State.

Die Trennung:

```text
Stackable Resource
vs.
Unique Instance
```

ist richtig.

Bitte daran festhalten.

---

# 16. Entity existence != Presence unbedingt beibehalten

Auch das ist ein zentraler V4-Gewinn.

```text
Ossler exists
```

darf niemals automatisch bedeuten:

```text
Ossler is present
```

und erst recht nicht:

```text
Ossler saw Alaric
```

Das neue Modell mit:

- existence;
- `at`;
- `scene.present`;
- tatsächlicher Wahrnehmung;

ist richtig.

Auch die Trennung:

```text
name
vs.
role
```

ist wichtig.

`Guild Clerk` ist eine Rolle, kein Eigenname.

---

# 17. Ordered World Deltas unbedingt behalten

Der neue Ablauf soll nicht wieder auf einen finalen Snapshot zurückfallen.

Beispiel:

```text
1. Clerk accepts contract.
2. Clerk witnesses registration.
3. Alaric leaves Guild.
4. Alaric arrives at reedbeds.
```

muss in genau dieser Reihenfolge angewandt werden.

Das ist entscheidend für:

- Presence;
- Knowledge;
- Witnesses;
- Transfers;
- Locations;
- Offers;
- Quest progression.

Daran bitte nichts vereinfachen.

---

# 18. Schema Single Source of Truth ist ein Pflichtziel

Der `"Novice 1-14"`-Fehler war von Avereth selbst mitverursacht:

Prompt sagte:

```text
Novice 1-14
```

Validator erwartete:

```text
Novice
```

Das darf V4 konstruktiv nicht mehr ermöglichen.

Daher Zustimmung zu:

```text
content/commands.json
content/deltas.json
structured rules data
```

aus denen erzeugt werden:

- Prompt vocabulary;
- JSON schema;
- local validator;
- tests;
- gegebenenfalls Doku-Fragmente.

Keine dreifach handgeschriebenen Protokolle mehr.

---

# 19. Inline Delta und Structured Output

Ein technischer Hinweis zu meiner D2-Präferenz:

Der normale Narrator-Call enthält:

```text
Prosa
+
maschinenlesbaren Delta-Block
```

Daher kann der gesamte Narrator-Response nicht einfach über ein Provider-`response_format: json_schema` laufen.

Das ist in Ordnung.

Für den normalen Narrator-Pfad:

- Blockformat aus Schema generieren;
- lokal parsen;
- lokal validieren.

Der **Recovery Extractor** kann dagegen reines JSON liefern und deshalb, sofern S0 erfolgreich ist, echtes `json_schema` verwenden.

Ebenso:

- Semantic Interpreter;
- Board Generator.

Damit können wir Structured Output dort nutzen, wo es technisch gut passt, ohne die Narration in JSON zu pressen.

---

# 20. `expected` ist weiterhin ein sehr guter V4-Mechanismus

Den Planpunkt §5.3 möchte ich ausdrücklich behalten.

Er löst eine wichtige Klasse von Problemen:

```text
Report vorhanden
aber relevante Folge der Player Action fehlt
```

Beispiel:

```text
PlayerCommand:
go to reedbeds

expected:
arrived true/false
```

Der Narrator kann nicht einfach eine Geschichte erzählen und das Ergebnis im Delta vergessen.

Wenn `expected` fehlt:

1. local incomplete;
2. Recovery Extraction;
3. falls weiterhin nicht bestimmbar:
   Handlung nicht mechanisch vollzogen / sichtbare Korrektur.

Das ist wesentlich besser als heute.

---

# 21. Overreach beibehalten

Auch das halte ich für richtig.

Wenn PLAYER ACTIONS sagen:

```text
LOOKS FOR AN INN
```

und der Narrator schreibt:

```text
Alaric pays 7 copper and rents the room.
```

soll der Extractor/Inline-Block das als:

```text
overreach: payment
```

kennzeichnen.

Keine Coin-Änderung.

System-Hinweis.

Swipe möglich.

Das ist die richtige Grenze.

---

# 22. V4 soll kein Mechanik-Monster werden

Ich unterstütze ausdrücklich den Planpunkt:

Nicht für jede Handlung eine eigene Funktion.

Nicht:

```text
gatherMarshmint()
washClothes()
repairWidowFence()
escortMillerCart()
findMissingDog()
```

sondern generische Primitiven:

```text
activity
object
offer
transaction
quest objective
proof
go
repair
escort
search
combat
```

Die Engine soll Konsequenzen besitzen, nicht die gesamte Welt simulieren.

---

# 23. Skill Progression, Status, Domain usw.

Die Support-Matrix ist sehr wertvoll.

Ich stimme zu, dass V4 die State-/Event-Architektur für spätere Mechaniken vorbereiten sollte.

Aber 4.0 soll nicht gleichzeitig vollständig implementieren:

- Skill Learning Progress;
- PP;
- Skill Evolution;
- Class Evolution;
- persistente Status Effects;
- Injuries;
- Elements;
- Resistances;
- Detection/Appraisal;
- Domains.

Scaffolding ja.

Emitter/volle Mechanik später.

Das verhindert einen zweiten grundlegenden State-Umbau, ohne V4 unnötig aufzublähen.

---

# 24. Combat bleibt geschützt

Sehr wichtig:

Der aktuelle Combat-Kern hat sich in den letzten Runs stark stabilisiert.

V4 soll ihn nur dort berühren, wo die neue Infrastruktur zwingend einen Adapter braucht.

Freigabe-Gate bleibt:

```text
bestehende Combat-Replays
→ byte-identische Combat Events
```

Player Combat Actions müssen nicht durch den allgemeinen Story Interpreter laufen.

---

# 25. Migration / Upcaster

Dem vorgeschlagenen additiven Modell stimme ich zu.

Keine alten Events verändern.

Keine gespeicherten Chats rewrite-en.

Legacy Events weiter folden.

Neue Events versionieren.

Besonders wichtig:

```text
3.x chat
→ V4 reducer/upcaster
→ next turn V4-native
```

soll funktionieren.

Ein Downgrade muss ausdrücklich als nicht unterstützt dokumentiert werden.

---

# 26. Entscheidungstabelle – final für die Planrevision

Bitte den Plan mit folgenden Entscheidungen überarbeiten:

| Entscheidung | Festlegung |
|---|---|
| D1 | Ja: Semantic Interpreter, kein Regex-Fallback für Story-Agency |
| D2 | **Bevorzugt: kleiner ordered Inline-Delta-Block; separate Extraction nur als Recovery. S2 vergleicht empirisch mit Always-on Extraction.** |
| D3 | Ja: Guild Boards zuerst canonical erzeugen |
| D4 | Ja: unbekannter Preis bleibt pending, außer Player setzt Preislimit oder autorisiert jeden Preis |
| D5 | Optionales eigenes Connection Profile ja |
| D6 | Pending Check vorbereiten, aber 4.0-Release nicht davon abhängig machen; ggf. 4.1 |
| D7 | **Canon: reguläre Guild Registration Fee = 20 cp / 2 Silver** |
| D8 | Ja: Ressourcen zunächst in Quest-Einheit |
| D9 | Mechanismus ja; 20-%-Chance bleibt PROPOSED und datengetrieben |
| D10 | Branch Rank Support konfigurierbar; city/capital nur Defaults, nicht harter Canon |
| D11 | Payout-Bänder nur Soft Guidance/Warning, kein harter Validator |
| D12 | Ja: Gathering Yield durch Narrator/World Delta innerhalb der autorisierten Activity |

Zusätzlich:

**Guild Actions benötigen tatsächliche Guild-Hall-/Branch-Location, nicht nur dieselbe Settlement.**

---

# 27. P0 entsprechend ändern

Bitte P0 noch einmal überarbeiten.

Ich würde dort vier Spikes unterscheiden:

## S0 – Structured Output

Wie geplant:

- echter Provider;
- `generateRaw`;
- ggf. Connection Profile;
- Reasoning aus;
- Schema Compliance;
- Latenz.

## S1 – Semantic Interpreter

Wie geplant:

- ≥150 positive/negative Fälle;
- hohe Präzision insbesondere gegen falsche Agency;
- Multi-Action-Reihenfolge;
- Referenzauflösung.

## S2 – World Delta Strategy

Hier ausdrücklich **beide Architekturen** vergleichen:

### S2-A
Always-on post-narration Extraction.

### S2-B
Narrator liefert kleinen ordered Delta-Block;
Recovery Extraction nur bei missing/invalid/incomplete.

Messen:

- validity;
- semantic accuracy;
- completeness;
- expected-field completion;
- recovery frequency;
- total input/output tokens;
- blocking latency;
- background latency.

Erst danach D2 endgültig festlegen.

## S3 – Guild/Quest/Location Golden Prototype

Noch ohne vollständige Runtime:

den kritischen V12-Pfad einmal mit den geplanten Domain Types modellieren:

```text
Guild Hall
→ Board
→ Miller
→ Herb Run
→ accept
→ leave
→ reedbeds
→ gather resource
→ return to actual Guild Hall
→ proof
→ turn-in
→ payout
→ inn offer
→ no automatic purchase
```

Damit erkennen wir vor P1, ob die Domain-Grenzen zusammenpassen.

---

# 28. Was ich jetzt von dir möchte

Bitte **noch keinen Produktcode für V4 implementieren**.

Zuerst nur:

1. `RUNTIME_V4_PLAN.md` anhand dieses Reviews überarbeiten.
2. Die Entscheidungstabelle anpassen.
3. D2/P0/S2 auf den A/B-Vergleich ändern.
4. Guild-Hall-Anforderung einbauen.
5. Pending Check aus dem harten 4.0-Release-Gate nehmen.
6. D7 als 20-cp-Canon setzen.
7. D9–D11 entsprechend als soft/configurable kennzeichnen.
8. HUD/Event Log/conditional Recovery ausdrücklich als KEEP-Prinzipien dokumentieren.
9. Latenz-/Token-Kalkulation für beide D2-Varianten ergänzen.
10. Danach die revidierte Architektur erneut zur Review vorlegen.

Bitte in dieser Runde weiterhin **keine Runtime-Implementierung** beginnen.

Der aktuelle Plan ist stark genug, dass ich keine komplette Neuplanung möchte.

Es geht um eine gezielte Revision vor dem Start.

---

# Gesamturteil

Der Kern von Runtime V4 ist richtig:

> **Player intent wird einmal semantisch verstanden.  
> Die Engine besitzt die Konsequenzen.  
> Der Narrator besitzt die Welt und die Prosa.**

Dabei sollten wir aber die beiden besten Effizienzprinzipien der bisherigen Runtime nicht verlieren:

> **HUD lokal aus Canonical State.**

und:

> **Zusätzliche Extraction nur dann, wenn der normale maschinenlesbare Output fehlt oder unbrauchbar ist.**

Eine stärkere Engine soll nicht automatisch bedeuten, dass wir jeden Turn mit mehreren Pflicht-LLM-Aufrufen bezahlen.

Das Ziel sollte sein:

> **So viel Determinismus wie sinnvoll, so wenig LLM-Aufrufe wie möglich, und LLMs nur dort, wo echtes Sprachverständnis oder kreative Welterzeugung gebraucht wird.**

Mit dieser Planrevision halte ich Runtime V4 für die richtige nächste Entwicklungsstufe.
