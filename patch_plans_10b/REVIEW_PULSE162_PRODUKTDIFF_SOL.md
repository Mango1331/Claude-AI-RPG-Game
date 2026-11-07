# .162 PULSE Paket A — unabhängiger Produktdiff-Gegenreview

**07.11.2026.** Geprüft: Produkt `0b45c28fb064bde3ad7dd41401b932e7901f2142`, Basis `.161` / `bd19a30fb60c0c05ea9ecf077dc25b1cb4094088`; zentraler Dokumentationsstand `19fc9f4285c21306678b2005336a859764298238`. Der Implementiererbericht ist Ausgangspunkt, kein automatisch übernommener Nachweis. Maßgebliche Planung: [PULSE-Plan §§5/5.8/6 A und §§12–16](PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md); [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/docs/PULSE162_PACKAGE_A.md).

## Ergebnis

**Die Grundarchitektur ist passend und .161 vollständig enthalten. Zwei reproduzierte P2-Integrationslücken sollten vor dem natürlichen PULSE-Test eng korrigiert werden:** fehlende Suchausnahme im Erzählervertrag und zu breite Suchartenerkennung. Dafür braucht es weder neue Ereignismechanik noch Parameter-/Balanceänderungen. Produktcode wurde in diesem Gegenreview nicht geändert.

Die 23 neuen PULSE-Tests bestehen, erfassen diese beiden Gegenfälle aber nicht. Dass die vorhandene Suite grün ist, widerlegt die Befunde nicht. Keine Behauptung eines neuen technischen Totalabbruchs oder beschädigter Save-/Wirtschaftsdaten.

## 1. Bestätigter Umfang und Entscheidungen

- Fast-Forward und vier Commits sind bestätigt; `bd19a30` ist Vorfahr von `0b45c28`. Die .161-UI-/Intenttests bestehen weiterhin. Keine Rücknahme des QoL-Pakets festgestellt.
- Elf Produkt-/Contentdateien im Diff, 413 hinzugefügte/zwölf entfernte Zeilen, davon 285 im neuen `pulse.js`; zusätzliche Änderungen betreffen Tests, Replayakzeptanzen, Hostwerkzeug, Version und Patchnote. Keine Umsetzung von C/B/D.
- Die Entscheidung **nach** allen Handlern ist für Paket A sinnvoll: Erst dann stehen die tatsächlichen Expositionen und dynamischen Ausschlüsse fest. Ein einzelner `pulseFinish()` emittiert höchstens ein `pulse.rolled`; der Handler sammelt nur autorisierte Expositionen. Das ersetzt die früheren separaten ROAD-Würfe.
- Der Wurf verwendet Seed/Zugnummer/Tag; der Kampf-/Suchwürfelstrom wird nicht verwendet. Tageszeit, relative gedeckelte Fehlwurfserie, `held` ohne Wurf, Kampfpause und Pausenfolgeblock sind im Code vorhanden und gezielt geprüft. Vollständig gebuchte Pausen werden in A nicht nachträglich unterbrochen.
- Die Jagd-Habitat-Ausnahme ist als **zielgebundene Erhaltung vorhandener Jagdinteraktionen** vertretbar: aktiver eigener Vertrag, dessen Population und tatsächliche Ortsabstammung. Sie sperrt keinen PULSE-Wurf und erlaubt keine fremden Personen/Arten. Die zusätzliche Ausnahme muss allerdings auch im Narratorvertrag kenntlich sein (R1).
- Das engere GO-Matching entspricht §5.8: kein pauschales „jeder Ort unter einer Population ist Jagd“. Die Ankunftsprüfung steht vor der alten `auth.road==='quiet'`-Sperre. Ein registriertes Zielhabitat erlaubt die Zielpopulation nicht bereits unterwegs.
- `rules.pulse.force` ist im tatsächlichen Produkt **null**. Der enge Burrow-Testfilter im Smoke verändert das installierte Testexemplar; keine Produktkampagne wird dadurch auf Gefahr gestellt.
- Die dokumentierten Einschränkungen bei Siedlungs-`site`, unbekanntem GO, Tokenbudget und natürlicher Befolgungsquote sind nachvollziehbare Grenzen. Aus ihnen wird hier kein Architekturumbau abgeleitet.

## 2. R1 — Erzählervertrag widerspricht der erlaubten Such-/Jagdausnahme (P2)

**Quelle:** [`envelope.js` Z.139–142](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/src/v4/envelope.js#L139), gegenüber [`world.js` Z.488ff.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/src/v4/world.js#L488) und `pulse.js::soughtMatch()`.

Bei `pulse.governs` ohne offenes `danger` liefert der tatsächliche `buildContext()` immer die Regel: **„Nobody new in this reply attacks Alaric …“**. Bei Gefahr wird ausschließlich die eine PULSE-Gruppe erlaubt. Beide Varianten berücksichtigen weder `pulse.sought` noch `pulse.hunts`.

**Kontrollierte Gegenprobe auf dem echten Resolver-/Kontext-/Worldpfad:** erfolgreiche Suche `boar tracks`, tatsächliches Boar-Habitat, kein PULSE-Wurf (`reason:'sought'`). Der ausgegebene Narratorblock verbietet neue Angreifer pauschal. Dieselbe autorisierte Wildschweineinführung mit anschließendem `hostile` wird von `applyWorld()` korrekt akzeptiert; der Kampf startet. Eine zweite Probe mit aktivem eigenen Jagdauftrag und geschlossenem regulärem Fenster zeigt denselben Widerspruch. Damit ist die **Instruktionsabweichung** bewiesen; eine konkrete natürliche Modell-Verweigerungsquote wurde nicht gemessen.

**Auswirkung:** Ein regelbefolgender Narrator soll genau die Reaktion vermeiden, die Engine und freigegebener Suchvertrag erlauben. Der bisherige geskriptete Smoke belegt das Persistieren fertiger Antworten, nicht diese natürliche Umsetzung. Das kann gerade legitimes Locken/Warten/Suchen künstlich passiv machen.

**Kleinste Korrektur:** Aus dem bereits gespeicherten `auth.pulse.sought/hunts` eine kurze konkrete Ausnahme in demselben Envelope ableiten. Nur die autorisierte Zielpopulation/Vertragsart, nur am tatsächlich erreichten passenden Ort; Reiseabschnitt und Ankunft deutlich unterscheiden. Pauschales Verbot bleibt für sonstige Neuankömmlinge erhalten; Wegnahme bleibt auch für gesuchte Kreaturen verboten. Keine zusätzliche Zustandswahrheit, kein neuer Call und kein global gelockerter Envelope. Bei offenem `danger` muss die separate legitime Suchreaktion ebenfalls verständlich bleiben.

**Erforderliche Gegenfälle:** Sucherfolg am Habitat, aktiver Jagdauftrag/Locken bei geschlossenem Fenster, GO vor/nach bestätigter Ankunft, fremde Art/Person und offenes Gefahrenfenster. Mindestens eine echte ausgehende ST-Narratorrequestprüfung mit registrierter Suchausnahme; der bestehende Smoke prüft nur die allgemeine Verbotszeile.

## 3. R2 — Teilstring/Adjektiv wird zur autoritativen Suchberechtigung (P2)

**Quelle:** [`pulse.js::searchSought`, Z.118/122](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0b45c28fb064bde3ad7dd41401b932e7901f2142/avereth-engine/src/v4/pulse.js#L118).

Der Populationspfad ergänzt das bestehende `namesKind()` durch einen ungebundenen Teilstringvergleich auf das letzte Artenwort. Der Vertragszweig akzeptiert bereits ein beliebiges mindestens vierstelliges Wort des Ziels. Diese Erkennung entscheidet über eine **Firewall-Ausnahme**, nicht nur Retrieval oder kosmetische Ähnlichkeit.

| Kontrollierter Fokus | Tatsächliches Ergebnis .162 | Erwartete fachliche Zuordnung |
|---|---|---|
| `boar tracks` im Habitat `wild boar` | erfolgreiche Suche → `sought:[{population:'loc.wood'}]`, kein PULSE-Wurf, passender Angriff erlaubt | richtig |
| `broken boards` am selben Ort, ohne aktiven Jagdauftrag | **identische Suchberechtigung**, weil `boards` den Teilstring `boar` enthält; derselbe neue Wildschweinangriff startet ohne PULSE-Freigabe | falsch, Objektsuche ist keine Wildschweinsuche |
| `wild herbs` bei aktivem eigenem DEFEAT-Ziel `wild boar` ohne `q.hunt` | `searchSought()` registriert den Vertrag allein wegen `wild` | falsch, geteiltes Adjektiv benennt keine gesuchte Kreatur |
| `boar tracks` für denselben Vertrag | Vertrag registriert | richtige Positivkontrolle |

Die `broken boards`-Probe läuft durch tatsächlichen Suchhandler, `buildContext()` und `applyWorld()`: Sucherfolg, `reason:'sought'`, neuer Kampf, keine `pulse`-/`road`-Ablehnung. Der Vertrags-Adjektivfall ist zusätzlich direkt am Matcher geprüft; für ihn wird kein eigener vollständiger Worldnachweis behauptet. Der Suchwurf wird in diesen kleinen Gegenproben nur prozesslokal auf sicheren Erfolg gestellt; Produktwerte bleiben unverändert.

**Kleinste Korrektur:** Für die Suchberechtigung die vorhandene wort-/artenbezogene Normalisierung `namesKind()`/`kindOf()` wiederverwenden. Den rohen Teilstring-Fallback entfernen bzw. auf echte normalisierte Artenwörter begrenzen. Im Vertragszweig die benannte Kreaturart statt irgendeines Zielworts verlangen. Keine neue Terrain-/Synonymliste und kein allgemeiner NLP-Parser. Positivfälle `boar tracks`/Plural/etablierte Artenaliasse erhalten; `boards`, `wild herbs` und fehlgeschlagene Suche bleiben ohne Ausnahme. Bei solchen Fremdsuchen darf der reguläre PULSE-Pfad entscheiden, nicht die versehentliche Suchausnahme.

## 4. Tatsächlich unabhängig ausgeführte Prüfungen

| Prüfung | Ergebnis / Grenze |
|---|---|
| Produkt- und main-Remote-HEAD, Commitfolge, Vorfahrprüfung, Produktdiff | bestätigt, Produkt `0b45c28`, main `19fc9f4`; Arbeitskopie unverändert |
| PULSE + Patch5/6/7 + Fix160/161 | **131/131**, 0 fehlgeschlagen/übersprungen; Node v24.22.1 |
| Kleine Read-only-Gegenproben | fünf gezielte Fälle: zwei vollständige Such-/Worldpfade, zwei Vertrags-Matcherfoki und eine Jagd-Kontextprobe; beide Befunde reproduziert, positive Kontrollsuche bleibt erlaubt |
| Struktur der Replayakzeptanzen | **351** vollständig identische alte Einträge; **166** Ersetzungen mit exakt erhaltenem `previous_acceptance_160`; **523** zusätzliche Einträge; insgesamt **1040**; Fingerprintform und Produkt-Testschalter geprüft |
| Nicht erneut ausgeführt | vollständige 2859er-Suite, voller 2235er-Replay, echte ST-Smokes und 1032er-/1159er-Korpusmessungen. Deren Zahlen bleiben ausdrücklich **Implementiererabnahme** gemäß Produktpatchnote. Die Strukturprüfung allein beweist nicht erneut sämtliche 689 normalisierten Replayunterschiede |

Ausgeführter gezielter Testbefehl, Arbeitsverzeichnis `avereth-engine`:

```sh
node --test --test-reporter=tap tests/v4/pulse_a.test.js tests/v4/patch5.test.js tests/v4/patch6.test.js tests/v4/patch7.test.js tests/v4/fix160_user04_qol.test.js tests/v4/fix161_user_qol.test.js
```

### Reproduktionscode für R1/R2

Vom Repositoryroot einmal `cd avereth-engine`; dann den folgenden Block ausführen. Er nutzt bestehende Testhelfer und ausschließlich kopierte Zustände. Die Assertions halten bewusst den **gefundenen .162-Fehlerstand** fest; bei der Implementierung werden daraus gezielte negative Regressionserwartungen.

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { loadProductContent } from './tests/helpers.js';
import { campaign } from './tests/v4/patch8_lib.js';
import { applyEvent, emptyState } from './src/state.js';
import { startCampaign } from './src/engine.js';
import { resolveCommands } from './src/v4/commands.js';
import { searchSought } from './src/v4/pulse.js';
import { buildContext } from './src/context.js';
import { applyWorld } from './src/v4/world.js';
import { Dice } from './src/rng.js';
const content = await loadProductContent(), realm = 'realm.valedorn_crown';
function places(s) {
    s.places['loc.wood'] = { id: 'loc.wood', name: 'Hartwood', kind: 'wilderness', parent: realm, realm, tags: [], population: { species: 'wild boar', anchor: 'boar', levels: [4, 7] } };
    s.places['loc.wood.glade'] = { id: 'loc.wood.glade', name: 'Oak glade', kind: 'site', parent: 'loc.wood', realm, tags: [] };
    s.scene.at = 'loc.wood.glade'; s.scene.present = ['pc']; return s;
}
function turn(s, command, input) {
    s = structuredClone(s); const events = [], emit = e => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: 'review162', input } });
    const ctx = resolveCommands(s, content, command ? [{ seq: 1, ...command }] : [], emit, { c: true, msg: 1, dice: Dice.from(s) });
    const outcome = { c: true, kind: 'v4', actions: [], extra: ctx.extra, resolutions: ctx.resolutions, auth: ctx.auth, expected_keys: {} };
    s.last.outcome = outcome;
    return { s, ctx, events, context: buildContext(s, content, { outcome }).text };
}
const boar = { seq: 1, type: 'creature.new', ref: 'boar', species: 'wild boar', anchor: 'boar', desc: [], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: true, population: 'loc.wood', life_stage: 'adult' };
function attack(s) { return applyWorld(s, content, { scene: 'here', expected: {}, deltas: [boar, { seq: 2, type: 'hostile', by: ['boar'] }] }, { msg: 50, prose: 'A wild boar bursts out and charges him.' }); }
const base = places(structuredClone((await campaign(content)).state()));
const old = content.rules.checks.difficulty_scores.moderate; content.rules.checks.difficulty_scores.moderate = 0.0001;
const results = {};
try {
    for (const focus of ['boar tracks', 'broken boards']) {
        const t = turn(base, { type: 'activity', kind: 'search', what: focus, minutes: 30, until: null, quote: `I search for ${focus}.` }, `I search for ${focus}.`);
        const r = attack(t.s);
        results[focus] = { success: t.ctx.searchChecks[0]?.success, pulse: t.ctx.auth.pulse, envelope: t.context.split('\n').filter(x => /Nobody new|Someone new/.test(x)), fight: !!r.state.encounter || !!r.state.pending_combat?.length, pulseRejections: r.rejected.filter(x => ['pulse', 'road'].includes(x.rule)) };
    }
} finally { content.rules.checks.difficulty_scores.moderate = old; }
const contract = structuredClone(base); delete contract.places['loc.wood'].population;
contract.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', title: 'Defeat wild boar', objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 1 }] };
results.contractSearch = { wildHerbs: searchSought(contract, content, 'wild herbs'), actualBoar: searchSought(contract, content, 'boar tracks') };
const hunt = structuredClone(base); hunt.quests['quest.boar'] = { id: 'quest.boar', status: 'active', taker: 'pc', hunt: { at: 'loc.wood' }, objectives: [{ verb: 'DEFEAT', what: 'wild boar', qty: 1 }] };
const force = content.rules.pulse.force; content.rules.pulse.force = { open: false };
try { const t=turn(hunt,null,'I lure the boar by tapping the tree.'); results.huntContext={ pulse:t.ctx.auth.pulse, envelope:t.context.split('\n').filter(x=>/Nobody new|Someone new/.test(x)), fight:!!attack(t.s).state.encounter }; } finally { content.rules.pulse.force=force; }
assert.equal(results['boar tracks'].fight, true);
assert.equal(results['broken boards'].fight, true);
assert.equal(results['broken boards'].pulse.reason, 'sought');
assert.ok(results.contractSearch.wildHerbs.length);
assert.ok(results.huntContext.envelope.length);
console.log(JSON.stringify(results, null, 2));
JS
```

## 5. Empfohlener Anschluss

Ein gemeinsamer kleiner technischer Korrekturschnitt für R1/R2, ohne PULSE-Parameter, C/B/D, Balance oder NPC-Kontinuität anzufassen. Danach die neuen Gegenfälle und die reguläre Patchabnahme gemäß 01; keine vorgeschaltete neue Vollanalyse. Vor natürlicher Ereignisdichte-/Budgetbewertung sollte der Narrator denselben Suchvertrag sehen, den die Firewall tatsächlich durchsetzt.

Keine neue Designentscheidung nötig, um diese beiden Abweichungen vom vorhandenen Vertrag zu beseitigen. Die historische Jagd-Habitat-Ausnahme selbst wird hier nicht zurückgenommen. Der Nutzer entscheidet über die Implementierungsfreigabe; dieser Commit enthält nur Review/Status.
