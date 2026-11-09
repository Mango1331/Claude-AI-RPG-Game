# GPT – unabhängiger Kontrollreview NPC E2-A .170 (09.11.2026)

**Urteil:** Die konkrete .169-P2-Lücke „The clerk had left the Guild hall before Alaric arrived“ ist mit .170 **geschlossen**. Die positive `met`-Prüfung besitzt aber einen **weiteren reproduzierten P2-Gegenfall**: Sobald ein Satz erst die **frühere Anwesenheit** und danach die **bereits vor Alarics Ankunft erfolgte Abreise** schildert, akzeptiert `presentHere` den **vorangestellten** Präsenzteil und ignoriert den späteren Abreise-/Zeitteil. **Vor E2-B nur diesen engen Fehler mit ausführbarem Rot/Grün auf dem echten Worldpfad korrigieren.** R2–R5, PULSE, Dungeon, Guild und bestehendes `enter` nicht neu planen.

## 1. Basis, Scope, Nachweisgrenze

Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`: [`.169` / `93acd57`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/93acd574409bff44c39bd7bc203e526fc76da262) → [`.170` / `317ca09`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/317ca09eb079266be5d323d7a4fb9205b57ca907), Git-Compare **zwei Commits vorwärts, null zurück**. [`3bb36f0` Fix/Regressionen](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3bb36f07d0d627948777b4f7d2683d4e096705ab) und [`317ca09` Version/Host/Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/317ca09eb079266be5d323d7a4fb9205b57ca907).

Runtime-Diff eng: neue `presentHere()` in `src/v4/narration_evidence.js` sowie sechs neue Zeilen plus geänderter Aufruf in `world.js::metArrivals()`, der Zielort und bekannte andere Orte übergibt. Andere Spiellogik ist unverändert. Neue `tests/v4/npc_e2a170.test.js` (vier Testfälle) und zwei zusätzliche Host-Prüfungen in `npc169_smoke.mjs`.

**Selbständig geprüft:** Git-Diff, vollständige neue Funktionslogik, neue Node- und ST-Smokes, .170-Patchnote und beide Replayakzeptanzblobs. Zusätzlich wurde die **tatsächliche `.170`-`metEvidence`-Funktion** aus dem GitHub-Quelltext samt `personProfile`, `narratedEvent`, `presentHere` in einer isolierten JavaScript-V8-Ausführung auf genau den nachstehenden ASCII-Belegen ausgeführt (mit inhaltsgleicher `normText`-Normalisierung aus `src/util.js`; `coinFromWords` als für diese Funktionen unbenutzter Stub). **Kein eigener `playerTurnV4/replyTurnV4`-, vollständiger Node-/ST- oder Gesamtreplaylauf von GPT.** Der mögliche World-Eintritt folgt aus dem geprüften `metArrivals`-Aufrufpfad; er ist als neue End-to-End-Gegenprobe noch zu reproduzieren. Der Produktcode wurde nicht verändert.

## 2. Positive Befunde

- Das Ausgangsproblem aus [GPT-Review .169 §2](REVIEW_NPC_E2A169_PRODUKTDIFF_GPT.md) ist behoben: `The clerk had left the Guild hall before Alaric arrived` wird durch `presentHere` als Rückblick/Vorvergangenheit abgelehnt.
- Erneut erfasste echte Abreise- und Fremdortvarianten (`departed at dawn`, `went home before`, `was drinking at the Drowned Oar`) werden laut Claudes Rot/Grün-Tests korrekt abgelehnt. Gute Präsenzsätze wie `The clerk stood behind the counter and waved`, `both clerks at work`, `Crossbowman sat over fresh maps` bleiben gültig. Die getrennte Freigabe des neuen `met`-Pfads erhält die ältere `enter`-Regel, `handled_by`, Gildenzeugen, Gruppenidentität und PULSE.
- `world.js` reicht die derzeitige Zielort-Hierarchie und fremde bekannte Orte nur an den neuen `metEvidence`-Aufruf weiter; kein neues Eventschema oder Modellaufruf. Die User04-Fixture/geskriptete Hostprüfung schützt einen abgereisten Clerk bei gleichzeitig gesehenem Crossbowman.

## 3. **P2 – Frühere Präsenz plus spätere Abreise im selben Erzähltext**

**Ursache im aktuellen Code:**

[Quelltext `narration_evidence.js::presentHere`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/317ca09eb079266be5d323d7a4fb9205b57ca907/avereth-engine/src/v4/narration_evidence.js#L320-L380).

`metEvidence` validiert die **zitierten Worte** über `narratedEvent` und eindeutige Personenreferenz und ruft dann `presentHere(ev.quote, …)` auf. `presentHere` sucht eine Personenbezeichnung sowie ein gültiges Szenenverb (`stood`, `sat`, `waved`, `was sorting`, …). Bei der ersten lokalen Übereinstimmung berechnet es mit `clauseEnd()` einen Bereich **nur bis zum ersten Komma, `and` usw.**; `LOOK_BACK` und `elsewhereIn` werden **nur auf diesen Teil** angewandt. Danach folgt sofort `return {ok:true}`. Es findet **keine Prüfung statt**, ob dieselbe Person im verbleibenden Originalsatz **vor dem Eintreffen Alarics wieder gegangen** ist. Ebenso kann ein Extractor aus einem längeren, widersprechenden Satz ein scheinbar positives kürzeres Zitat liefern.

**Eigene Ausführung der .170-Funktion:**

| Vollständige Erzählung bzw. daraus gemeldeter `evidence`-Ausschnitt | `metEvidence` auf .170 | Fachliches Soll |
|---|---|---|
| `The clerk had left the Guild hall before Alaric arrived` | `ok:false` | Ablehnen – früherer Fix funktioniert |
| `The clerk stood behind the counter and waved` | `ok:true` | Zulassen |
| `The clerk stood behind the counter **and left before Alaric arrived**` (gesamter Satz zitiert) | **`ok:true`** | **Ablehnen** |
| `The clerk stood behind the counter, **then left before Alaric arrived**` (gesamter Satz zitiert) | **`ok:true`** | **Ablehnen** |
| Derselbe Satz, der Extractor zitiert nur `The clerk stood behind the counter` | **`ok:true`** | **Ablehnen** |
| `The clerk stood behind the counter, then went home` (gesamter Satz zitiert) | **`ok:true`** | **Ablehnen** |

Alle Fälle waren als echte Textargumente der aus dem .170-Produktquelltext geladenen `metEvidence`-Funktion geprüft. Die negativen Varianten betreffen **erzählte Abwesenheit bei der Ankunft**, nicht eine beliebige spätere freiwillige NPC-Aktion nach bestätigter Begegnung.

**Wirkung im Worldpfad:** `world.js::metArrivals` besitzt bereits einen zulässigen GO-/`known_at`-/Lebendigkeitscheck, verlässt sich beim letzten Schritt aber auf `metEvidence.ok`. Ein falsch-positives `met` kann somit `enterKnown(who,item)` und `scene.entered` buchen, obwohl die Person **vor Ankunft des PC bereits fort war**. Dies verletzt den Kern von E2-A/R1 und kann nachfolgende Witness-/Presence-/Stealthkontrollen beeinflussen.

**Erforderlicher enger Korrekturschnitt:**

1. Auf unverändertem `.170` eine **rote End-to-End-Regression** mit User04-I71-GO, tatsächlich gebuchter Ankunft, angebotener bekannter Clerk-ID, Erzählung `The clerk stood behind the counter and left before Alaric arrived` sowie `met:{who,evidence}` (einmal volles Zitat, einmal nur positive Teilphrase). **Soll:** `met_evidence`-Ablehnung, kein `scene.entered`, keine Ortsänderung des Clerks, kein neues Wissen. Diese bisher nicht geprüften Gegenfälle müssen auf .170 rot sein.
2. Positive `The clerk stood behind the counter and waved`, `both clerks at work`, Crossbowman in User04/I72; zugleich „einer ging vor Ankunft, der andere ist da“ → nur tatsächlich Anwesender hinein.
3. **Zeitliche Reihenfolge und Kontext bis zum Zeitpunkt der Ankunft** beachten. Ein positiver Präsenzverbtreffer ist nicht hinreichend, wenn nachfolgende verifizierte Prosa im selben Satz/Absatz oder späteren Text **die Abreise vor dem Eintreffen** erzählt. Die korrekte Entscheidung darf nicht durch ein bewusst kurzes Extractor-Zitat die späteren Worte übergehen. Keine neue unabhängige Eventquelle oder generelle semantische Storymaschine; konservative Unklarheitsablehnung genügt. Rückkehr nach echter Abreise mit späterem erneut positivem Anwesenheitsbeleg als Gegenkontrolle, damit die Korrektur nicht einfach jede Kombination aus `stood` und `left` blind verbietet.
4. Nicht `narratedEvent`, `enter`, `handled_by`, die allgemeine Gilden-/Questlogik oder PULSE umbauen. Kein Balance-/NPC-E2-B-/E3-Patch.
5. Full Node-, Gesamtreplay-, ST1.19-Standard-/Failsoft-Abnahme, knappe Patchnote und separater Korrekturbuild; anschließend ein einziger fokussierter Produktreview. Erst danach E2-B gesondert freigeben.

**Einstufung:** P2, weil die neuentstandene Autorität falsche Personenanwesenheit persistent erzeugen kann. **Kein allgemeines Redesign** des schon weitgehend korrekten E2-A.

## 4. Replay-/Testabnahme

**Unabhängig über beide GitHub-Dateiblobs verifiziert:** `accepted_e2a169_vs_126.json` ist auf .169 und .170 **byteidentisch** (Git-Blob `64d3b7ed642d657055e702c98eb8a963f8cf19f2`), umfasst weiterhin 1041 Akzeptanzen; die `returned`-Meta bleibt gleich. Kein stiller Eintragwechsel. Das ist kein eigener erneut durchgerechneter 2235-Fälle-Replaylauf.

**Claudes berichtete Abnahme für .170:** Neue `npc_e2a170.test.js` **4/4** (auf .169 drei Rot), gemeinsam E2-A **25/25**, vollständige Suite **2940/2940**, Replay **2235** Fälle/1041 exakt akzeptiert/0 offen, ST1.19 Standard und Failsoft jeweils **OK**, plus zwei neue Hostprüfungen `leftNotEntered`, `leftOtherMet`, ohne fehlgeschlagenen Check. Provider geskriptet. **Nicht von GPT erneut ausgeführt**; der oben gefundene neue Gegenfall fehlt bislang in den Tests.

## 5. Priorisierung und Anschluss

E2-A/R2–R5 nach tatsächlichem Diff weiter planentsprechend, die erste .169-P2-Lücke wurde korrekt geschlossen. Der neue P2-Fall ist derselbe enge `met`-Präsenzbereich, keine veränderte Architektur. **Nicht in mehrere neue Paketplanungen abgleiten.** Nach reproduzierbarem Rot/Grün und Abnahme **E2-A technisch abschließen**. Fehlende natürliche Modellzuverlässigkeit, konservative Falsch-Negative ungewöhnlicher Präsenzformulierungen und der ältere permissive `enter`-Pfad bleiben bekannte Beobachtungsgrenzen; sie sind keine zusätzliche Pflicht-Hotfix-Liste.

**Produkt-HEAD zur Prüfung:** `.170`/`317ca09`. Nur Dokumentation auf `main`; keine Produktdatei geändert.
