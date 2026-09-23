# Datenmodell

## Übersicht

| Ebene | Wo | Format | Änderbar durch |
|---|---|---|---|
| Content (statisch) | `content/*.json` | JSON, geprüft gegen `schemas/*.schema.json` | Autor (Migration: `tools/migrate_content.py`) |
| Kampagne (Events) | jede Chatnachricht: `message.extra.avereth` | Event-Liste | Engine (Spielerzug) und validierter Report (Erzählerzug) |
| Zustand | im Speicher: `fold(events)` | Objekt (siehe unten) | wird nie direkt geändert, nur durch Events |
| Prompt | `setExtensionPrompt('avereth_engine', …)` | Text | Context Builder |

## Speicherung pro Nachricht

```jsonc
// Spielernachricht
"extra": { "avereth": {
  "v": 2,
  "input_hash": "1f3a9c20",          // FNV-1a des Eingabetexts; gleicher Text -> gespeicherte Events wiederverwenden
  "events": [ /* turn.begun, Kampf-/Creation-/Stealth-Events, outcome.recorded */ ],
  "command": null                     // bei '#'-Befehlen: { panels: [...], llm: null | {kind:'system', question}, posted }
}}
// Erzählerantwort (pro Swipe eigenes extra)
"extra": { "avereth": {
  "v": 2,
  "text_hash": "9b0e11d4",            // Hash des sichtbaren Texts; stimmt er nicht (veraltete Swipe-Kopie), wird der Eintrag ignoriert
  "events": [ /* aus dem Report + Wahrnehmung + Episode */ ],
  "corrections": [ "Tracker drift: Initiative shown as 8, engine value is 9 ..." ],
  "accepted": [ "new npc the trapper (npc.trapper)" ],
  "rejected": [ { "item": {"hp": 5}, "reason": "\"hp\" is engine-owned ..." } ],
  "report_error": null
}}
// Begrüßung (Nachricht 0): { v, events: [campaign.started], text_hash }
```

## Zustand (`src/state.js`, `emptyState()`)

| Feld | Inhalt |
|---|---|
| `meta` | `{started, campaign, content_version}` |
| `rng` | `{seed, n}`: zählerbasierter Zufall; `n` steigt mit jedem Wurf (Events tragen `rng_to`) |
| `clock.minute` | Spielzeit in Minuten ab Tag 1, 00:00 |
| `turn`, `seq`, `mode` | Zugzähler; Modus `setup` \| `creation` \| `story` \| `combat` |
| `creation` | `{step, class, skills}` |
| `entities` | PC, NPCs, Kreaturen, neue Orte: `{id, kind, name, descriptors, traits, status, location, template/anchor, sheet \| profile}` |
| `scene` | `{location, place, present[], positions{id:{band, cover}}, awareness{id: unaware\|suspicious\|aware}, concealed[]}` |
| `encounter` | Kampf-Snapshot: `combatants{id:{fixed, current}}`, `order`, `round`, `current`, `pending_xp`, `defeated`, `escaped`, `intents`, `log` (letzte 20) |
| `facts` | Weltwahrheit `{id, s, p, o, since, until, visibility, importance, hard, source}` |
| `claims` | Behauptungen `{id, s, p, o, truth: true\|false\|unknown}` |
| `knowledge` | `knowledge[who][factOrClaimId] = {stance: knows\|suspects\|believes, source, turn, minute, previous}` |
| `memories` | `{id, turn, minute, text (mit {pc}), who[], about[], witnesses[], seen[], location, place, importance 1–10, kind}` |
| `relations` | `rel.<a>.attitude.<b> = {value −100..100, history[{turn, minute, delta, why}]}` |
| `quests`, `threads` | `{id, title, status, giver, rec_level, qtype, notes, history}` bzw. `{id, text, kind, status}` |
| `pending_combat`, `pending_intents` | Liste der NPC-Angriffsfestlegungen `[{by, target, turn, minute}]` (Core #23 PENDING) und angekündigte NPC-Aktionen |
| `last` | Audit des letzten Zuges: `{outcome, situations, rejected, check, input}` |

**Charakterbogen** (`entities[id].sheet`, PC und menschliche NPCs):

```
{level, class, stats{STR..WIL}, skills{id:{prof, pp}}, equipment{slot: itemId|inline}, inventory{itemId: qty}, coin_cp, xp, free_points, hp, mp, sta}
```

Abgeleitete Werte (MaxHP, Init, DEF …) werden **nie gespeichert**, sondern mit `deriveCharacter()` berechnet.

**Kreaturprofil** (`entities[id].profile`):

```
{model:'creature', anchor, level, rank, type, max_hp, hp?, atk, def, mdef, hit, init, attack{name, damage_type, range}, crit:'none', temperament}
```

## Event-Katalog (42 Typen; `schemas/event.schema.json`)

| Gruppe | Events | Erzeugt von |
|---|---|---|
| Kampagne/Creation | `campaign.started`, `creation.class_selected`, `creation.completed` | Engine |
| Entitäten | `entity.created`, `entity.updated`, `entity.sheet_set`, `entity.status` | Report (neu) / Engine (Profile, Tod) |
| Szene/Zeit | `scene.moved`, `scene.entered`, `scene.left`, `scene.position`, `scene.awareness`, `scene.concealed`, `time.advanced`, `turn.begun` | Report / Engine (Stealth, Kampf) |
| Charakterbogen | `resource.changed`, `item.changed`, `item.equipped`, `coin.changed`, `stat.assigned`, `xp.changed`, `level.up`, `skill.learned` | Engine (Kampf, XP, #assign) / Report (Items, Coin, recover) |
| Kampf | `encounter.started`, `encounter.updated`, `encounter.ended`, `combat.pending`, `combat.pending_cleared`, `combat.intent` | Engine / Report (Festlegung, Absicht) |
| Epistemik | `fact.asserted`, `fact.ended`, `claim.created`, `knowledge.gained`, `memory.recorded`, `relation.set`, `relation.changed` | Report / Engine (Wahrnehmung, Tod, Kampf-Erinnerung) |
| Quests | `quest.set`, `thread.set` | Report |
| Audit | `outcome.recorded`, `delta.rejected`, `check.recorded`, `note` | Engine |

## IDs

| Objekt | ID-Schema |
|---|---|
| Content | `ranger.power_shot`, `loc.tidecross`, `realm.solmere`, `core.11` |
| NPCs, Kreaturen | `npc.<name>`, `mon.<art>` (eindeutig, Suffix `_2` …) |
| Neue Orte | `loc.<name>` |
| Fakten | `f.<s>.<p>.t<Zug>` bzw. `f.t<Zug>.m<Nachricht>.<n>` |
| Erinnerungen | `m.…` |
| Relationen | `rel.<a>.attitude.<b>` |
| Quests | `quest.<titel>` |
| Encounter | `enc.t<Zug>` |
| Identitätsfakten | `f.pc.name`, `f.pc.appearance`: Wer sie kennt, kennt Alarics Namen bzw. hat ihn gesehen |

## Fakten-Report (`<avereth>{…}</avereth>`)

**Einzige Quelle für das Format:** `content/narrator.json → report.keys`. Das Format steht in jedem Engine-Block, und `REPORT_KEYS` in `src/delta.js` muss dieselben Schlüssel haben (Test). Das Schema zur Doku ist `schemas/report.schema.json`.

Beispiel (Trapper-Szene aus Testrun-v1):

```json
{"time":25,"place":"pine clearing on the forested slope",
 "new":[{"ref":"trapper","kind":"npc","desc":["trapper","old man"],"traits":"thin, grey stubble, leather apron","band":"MEDIUM"}],
 "aware":[{"who":"trapper","level":"suspicious"}],"concealed":["pc"]}
```

| Schlüssel | Validierung (Auszug) |
|---|---|
| `time` | 0–10.080 Minuten; nicht während der Charaktererstellung |
| `location` / `place` / `forced_by` | bekannter Ort oder neuer Orts-Eintrag; `location` nicht im Kampf; Szenenwechsel leert die Anwesenden; Alaric bewegt sich nur mit Reise-/Bewegungsabsicht in der Nachricht oder `forced_by` (anwesender NPC) |
| `new` | `npc` erhält eine Vorlage (Deskriptoren → `npc_templates.json`); `creature` braucht einen Körperbau-Anker; bekannte Figuren werden nicht verdoppelt (Name global, Deskriptor nur am aktuellen Ort) |
| `enter` / `leave` / `position` / `aware` / `concealed` | nur Anwesende; Tote kommen nicht zurück; Kämpfer-Positionen gehören der Engine; ein NPC, der Alaric bemerkt hat, wird nur durch erklärte Heimlichkeit wieder `unaware` |
| `facts` | funktionale Prädikate ersetzen den alten Wert (Historie bleibt); harte Fakten nur mit `because`; keine Wiederbelebung; Geheimnisse kennt das Subjekt selbst |
| `learn` / `believe` | Lernen widerspricht der Wahrheit nie; neuer Fakt nur durch `witnessed` eines Anwesenden; Gehörtes ohne Fakt wird ein Claim (Wahrheit `unknown`/`false`); Geheimnisse nur durch `told`/`witnessed`; falsche Ideen als `believe` |
| `attitude` | ±50 pro Änderung, gesamt −100..100, mit Grund; mehrere Änderungen in einem Report addieren sich |
| `memory` | Zeugen = Beteiligte (`who`) + genannte `witnesses` + bei `public` alle Anwesenden, die nicht `unaware` sind; wer Alaric dabei sah, hängt von der Tarnung ab; sein Name wird zu `{pc}` |
| `items` / `coin` / `recover` | Besitz geprüft; Abgabe durch Alaric nur mit Geben-/Zahlabsicht oder `taken_by` (anwesender NPC); Kupfer ganzzahlig und nie negativ; Erholung nie im Kampf, nie über Maximum |
| `quests` / `threads` | Statusübergänge; `active` nur mit Annahme durch den Spieler; Quest-XP bei Angebot gesperrt, einmalig beim Abschluss |
| `combat` / `intent` | `combat` als Objekt oder Liste: jede NPC-Festlegung wird PENDING und im nächsten Zug aufgelöst; nur Festgelegte kämpfen (keine automatische Teilnahme per Haltung/Spezies) |
| `check` | nur mit dem CHECK DIE des Zuges; die Engine rechnet nach und behält ihr Ergebnis |
| engine-owned | `hp`, `mp`, `sta`, `xp`, `level`, `stats`, `skills`, `damage`, `roll(s)`, `init`, `atk`, `def`, `mdef`, `rank`, `defeat_xp`: immer abgelehnt |

## Content-Dateien

| Datei | Inhalt | Quelle |
|---|---|---|
| `rules.json` | Zahlkonstanten der Regeln mit `src` | Core v1.21 (Test: jede Konstante steht wörtlich im Core-Satz) |
| `rules_text.json` | Core #0–#29, System #0–#14, Content #6/#10 **wörtlich** | Paket v1.24 |
| `classes.json` | 5 Basisklassen, 35 Skills (strukturiert plus `source_text` wörtlich), Affinität | Content v1.13 #0–#5 |
| `monsters.json` | 15 F1-Anker, Skalierung, Stufenwahl, Elite/Boss | Content #7/#8 |
| `gear.json` | Items, Starter-Kits, Referenzbereiche, Startbesitz | Content #9/#11, First Message |
| `lore.json` | 19 Lore-Texte wörtlich, 14 Orte, 9 Fraktionen/Realms | Lore v0.8, First Message |
| `npc_templates.json` | **PROPOSED**: menschliche NPC-Vorlagen | neu (Testrun-Lücke) |
| `narrator.json` + `narrator/Avereth_Narrator_Contract_v3.txt` | Erzählervertrag und Report-Format | CD v2.3 + ENGINE AUTHORITY |
| `campaign_start.json` | PC-Start, Startorte, Creation-Labels, Anfangsfakten | First Message v0.4, System #12 |
