# GPT – unabhängiger Produktdiff-Gegenreview .167 (PULSE Paket B, 08.11.2026)

**Urteil: Paket B ist im Kern architekturtreu implementiert. EIN enger P2-Ausschlussfehler bleibt vor dem natürlichen Test zu korrigieren:** `pulseBegin()` überspringt nach dem neuen Living-Dungeon-Zweig die vorher bereits beschlossenen statischen Ausschlüsse **`learning` und `repeat`**. Der Fix ist lokal, keine neue Dungeon-, Slot-, Rast- oder PULSE-Architektur erforderlich. **Keine weitere allgemeine Audit- oder Vorplanungsrunde.**

**Prüfgrundlage:** Nutzerbericht zum Paket B, Produkt-`HEAD` [`.167 / 58c29fa`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8), Basis [`.166 / 8ded6bf`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8ded6bfc4c47c4c465d0b0645f158bdf115f20a1), vollständige Commit-/Dateistatistik, Code-`pulse.js`/`commands.js`/`living.js`/`world.js`, B-Regressionen und ST-Smoke, Produktpatchnote `docs/PULSE167_PACKAGE_B.md`, Replayakzeptanzen beider Builds. Die technische Planung [§6 B einschließlich §§12.5 und 14.2](PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) bleibt maßgeblich.

**Nachweisgrenze:** Der Review liest den tatsächlichen GitHub-Diff/Quelltext und vergleicht die beiden vollständigen Replayakzeptanz-JSONs strukturell. **Keine Node-/Replay-/ST-Läufe von GPT selbst erneut ausgeführt.** Ein lokaler Git-Clone per Netzwerk war in der verfügbaren Laufzeit nicht möglich. Die 2911er-/Hostzahlen stammen aus Claudes Implementiererabnahme. Der P2-Befund ist ein direkt im Quelltext nachweisbarer Kontrollflussfehler, der über eine gezielte ausführbare Regression bestätigt werden soll.

## 1. Git-Folge und Umfang

Produkt `.166 → .167`: **3 Commits vorwärts, 0 zurück**, Merge-Base `8ded6bf`. [`f8a1bf1`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f8a1bf1e81c0554a0f86f581c6bfd0e440c2c3ff) PULSE-B-Code, [`348f87c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/348f87c76f73af7404da58e7d65af9d90f413344) Tests/Replay, [`58c29fa`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8) ST-Smoke/Build/Patchnote.

Produktänderungen: `content/rules.json` sowie `src/v4/{commands,living,pulse,world}.js`, Versionsmetadaten, neue B-Tests/Fixture-Smoke, Replayakzeptanzen, Patchnote. Keine zusätzlichen Runtime-Abhängigkeiten, kein neuer Dungeon-Spawner, keine neue XP-/Kampfformel, kein PULSE D.

## 2. Positive Befunde

- **Dungeon-Rahmen/Basiswahrscheinlichkeit:** `pulse.js` erkennt echte Living-Dungeon-Innenräume, `rules.json` fügt die im Plan genannten 15 % Basis und `meeting/trace/strange/danger`-Gewichte hinzu. `governs:false` lässt die vorhandene Dungeon-Firewall gegen ungebuchte Gegner maßgeblich; `world.js` erfasst die Ergebnisdiagnose nun auch für Dungeonwürfe.
- **Wanderer aus Slots:** `living.js::wanderSlot` wählt den ersten freien, nicht getroffenen/nicht aufgelösten Minion der aktuellen Ebene und des aktuellen Zyklus; keine belegten/taken Slots, Guards oder Bosse. `emitDecision` bindet über das vorhandene `dungeon.ahead`, `slotForNew`/`dungeon.slot` treffen ihn erst bei gültiger Kreaturextraktion. Eine nicht erzählte Begegnung verbraucht nicht unsichtbar einen Slot.
- **DUNGEON AHEAD:** `livingGo` markiert das autorisierte `aheadEvents` als `dungeonAhead` und vermeidet den zweiten PULSE-Wurf; `aheadReserved` verhindert die zweite Begegnungsreferenz in einem schon reservierten Zug.
- **Dungeon-Rast mit C:** Früher Claim vor Zeit/Erholung, `danger` nur mit Slot, Unterbrechung stoppt weitere Befehle, konkrete Slot-Ursache in Erzähler-/Folgefaktzeile; Zeitschutz aus .165/.166 bleibt unverändert. Die B-Tests decken die vier Befehlsfolgen und den widersprüchlichen vollen Extractor-Zeitbericht ab.
- **Dungeon-Pacing/Abnahme:** B-Test vergleicht mit/ohne Wanderung tatsächlich Minionslots, Slotstufen, XP, `run.parts` und den Clear; Reset, Save/Reload, Swipe/Regenerate/Edit sind in gezielten Testpfaden vorhanden. ST-Smoke prüft eine echte Host-Reservierung/Kreatur/Kampf und Dungeon-Rast+GO, mit kontrollierten Providerantworten.

## 3. **P2 – bestehende PULSE-Ausschlüsse innerhalb von Living Dungeons werden übersprungen**

**Quellen:** [`pulse.js:pulseBegin`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/src/v4/pulse.js#L114-L133), `pulse.js::dynamicReason`; [`pulse_a.test.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/tests/v4/pulse_a.test.js) (Learning und identische Folgeneingabe explizit ausgeschlossen), [`pulse_b.test.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/tests/v4/pulse_b.test.js) (keine solchen Dungeon-Gegenfälle).

`pulseBegin` hat in .167 folgende Reihenfolge:

```js
if (s.encounter || (s.pending_combat || []).length) P.reason = 'combat';
else if (insideDungeon(s)) {
    P.governs = false;
    if (livingOf(s, trueDungeonOf(s, s.scene.at))) P.dungeon = trueDungeonOf(s, s.scene.at);
    else P.reason = 'dungeon';
}
else if (ordered.some((c) => c.type === 'activity' && LEARNING.has(c.kind))) P.reason = 'learning';
else if (prev && now && prev.turn === now.turn - 1 && normText(prev.input) && normText(prev.input) === normText(now.input)) P.reason = 'repeat';
```

Innerhalb eines **Living Dungeons** trifft immer der zweite Zweig zu, setzt `P.dungeon`, lässt `P.reason === null` und überspringt beide folgenden `else if`-Zweige. `dynamicReason` holt diese statischen Prüfungen **nicht** nach. Normale `other`-Handlungen werden in `commands.js::otherStep` als `resolved` gebucht, sodass bei zweimal identischem `I look around the gallery` an zwei unmittelbar folgenden Turns die zweite Eingabe erneut einen `pulse.rolled`-Wurf auslösen kann. `train`/`study` verlieren analog den generellen `learning`-Ausschluss, wenn sie gültig verarbeitet werden.

**Warum relevant:** Dies widerspricht dem übernommenen Paket-A-Vertrag „technische Wiederholung: kein Wurf“ und „Lernen ausgeschlossen“, der laut Paket-B-Patchnote weiterhin im Dungeon gelten soll. Besonders die unmittelbar identische Erkundung kann unnötige Fenster/Fehlwurfserie und gelegentlich eine zusätzliche Slot-Gefahr auslösen. Der Fehler kommt aus der neuen Verzweigung von B; die A-Tests prüfen nur außerhalb von Living Dungeons.

**Kleinstmögliche Korrektur:** Kampfpause, Lern-/Trainingsausschluss und unmittelbar identische Eingabe als **gemeinsame statische Ausschlüsse** für sämtliche Rahmen auswerten, auch wenn `insideDungeon(s)` danach `P.governs=false` und `P.dungeon=root` setzt. Für Dungeon **ohne** Living-Datensatz bleibt `reason:'dungeon'`. Keine Lockerung von `dungeon_foe`, keine zusätzlichen Würfe/Veränderungen an Chance, Slot- und Dungeonreservierung.

**Pflicht-Rot/Grün** (echte Ruleset-2-Kampagne in einem Living-Dungeon-Raum ohne aktuell anwesende Bedrohung):
1. Zwei unmittelbar aufeinanderfolgende identische **gültige** `other`-Erkundungsnachrichten: erste darf würfeln, zweite **`reason:'repeat'`, kein `pulse.rolled`, `state.pulse.misses/recent` unverändert, keine Wanderreservierung; kontrollierter Zähler/Seed oder `rules.pulse.force` zur Beobachtung.
2. Gültiges `activity(kind:'study'|'train')` im selben Raum: **`reason:'learning'`, kein PULSE-Wurf**, Lernmechanik sonst unverändert.
3. Positivkontrollen: zwei **verschiedene** Dungeon-Inputs mit erlaubter Szene dürfen weiterhin würfeln; Kampf, `pending_combat`, `held`, DUNGEON AHEAD und Dungeon-Rast+GO unverändert.
4. Save/Reload, wiederholter Input nach Reload und Replayzustand reproduzierbar.

**Einstufung:** P2, enger Korrekturbuild vor dem natürlichen PULSE-Test. Keine neue technische Vorplanungsrunde oder Komplettbewertung von Dungeon-Slots erforderlich.

## 4. Replay- und Testabgleich

Die beiden **vollständigen** JSON-Akzeptanzdateien `accepted_pulse164_vs_126.json` auf .166 und `accepted_pulse167_vs_126.json` auf .167 wurden strukturell verglichen: **1040 gleiche IDs**, **1035** exakt identische Einträge, **5** geändert (`b17-rogue#191`, `#193`, `#195`, `#199`, `#217`); alle fünf enthalten exakt das alte Objekt unter `previous_acceptance_166`, keine Einträge verloren oder still ersetzt. `#193` bekommt das neue offene Dungeon-`danger`-Fenster mit zwei reservierten Mineralschleimen; die historische Antwort bringt sie nicht, der Slot bleibt frei. Die übrigen vier ändern nur den diagnostischen Ausschlussgrund `dungeon_ahead` bzw. `dungeon_leg`. **Keine neue unabhängige 2235er-Replayausführung durch GPT.**

Implementiererabnahme laut [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/58c29fa68ca0cdc76e2984eaa7f17914cc62a1f8/avereth-engine/docs/PULSE167_PACKAGE_B.md): neue B-Tests **14/14**, Living-Dungeons **107/107**, PULSE **72/72**, vollständige Node **2911/2911**, Replay 2235 Fälle / 1040 exakt akzeptiert / 0 offen; ST1.19 Standard **116/116**, Failsoft **121/121**, jeweils **0 PageErrors**. Der Host benutzt einen geskripteten Provider, keine natürliche Modellbefolgung belegt.

## 5. Anschluss

**Nur P2 schließen:** gezielte Regression gegen .167 rot, kleiner Fix in `pulseBegin`, PULSE-/Living-Dungeon-Nachtests, gesamte Node-Suite, Replay und ST-Standard-/Failsoft-Smoke, Produktpatchnote/Commit. Danach **ein einziger gezielter Nachreview** und der ohnehin geplante natürliche User-Test, kein PULSE D vor dem Test.

Die schon diskutierten übrigen P3-Grenzen (Modellbefolgung, Kontextbudget, Gebäudesicherheitsheuristik, generische gemischte Vertragszielbeschreibung) bleiben getrennt. Der Produktcode wurde durch diesen Review nicht verändert.
