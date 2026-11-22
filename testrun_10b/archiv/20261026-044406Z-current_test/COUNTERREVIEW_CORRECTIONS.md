# Run 19 (.94) – Gegenreview-Korrekturen und ergänzende technische Befunde

**Datum:** 26.10.2026. **Produktstand für den untersuchten Run:** `21f3822a468c6d78d0bfc9feed4840eb8b276fbd`, Build `.94`; aktuell geprüfter Produktbranch unverändert auf diesem SHA.  
**Quellen:** [Original-ZIP auf `main`](20261026-044406Z-current_test.zip), [ursprüngliche GPT-Review](REVIEW.md), Sols vom Nutzer übermittelte ergebnisoffene Gegenbewertung sowie eigenständige Nachprüfung des ZIP-Exports und der betroffenen Codepfade auf `.94`. ZIP **14.548.770 Bytes**, SHA-256 `b8f2881a06ba8f8e19c122c94266bed97febc5ca3eb9ab3c99cb5301c42b12b4`, CRC ohne Fehler, Git-Blob **`25d0af5279a6e285ff07baf18516ee8eab779a2b`** – lokale bytes identisch mit archiviertem Original.  
**Umfang:** Statischer Produktcode-Review, relevante Chat-/Player-/Engine-Records und T89-Planner-Rohantworten überprüft. Die von Sol berichtete isolierte T89-Sonde (nur Bettposition erfolgreich) wurde **nicht eigenständig** ausgeführt. **Keine Produktänderung oder neue Engine-Testausführung.**

## Urteil

**Zwei fachlich getrennte, auf die Originaldaten begrenzte Fixbereiche vor dem nächsten natürlichen Level-15-Langlauf:** (A) Preise, Positionen, zeitlich getrennte Zustimmung und sichere System-Klärung; (B) richtige Ortszielinterpretation und kanonische Guild-Identität. Keine Runner-Großrunde, kein Plain-Text-Fallback, keine Stat-/XP-Buffs.

## Korrekturen an der ursprünglichen Review

1. **Geldbestand:** Zuletzt **289 cp**, nicht die in `REVIEW.md` früher mehrfach genannten 292 cp. Die 292 cp waren ein **früherer Zwischenstand** nach einer Guild-Auszahlung; nach späteren Ausgaben sind sie kein Endbestand.
2. **JSON-Overhead:** **20** ungültige erste Player-Modellantworten (von 89 Entscheidungen) verursachten **87,529 s verworfene Erstversuche**; die **20 separaten Reparaturaufrufe** benötigten **77,662 s**. Beides ergibt zusammen 165,191 s zusätzliche Zeit gegenüber einem sofort gültigen Erstaufruf, aber die Angaben dürfen nicht als identische Größe bezeichnet werden. Die Verbesserung gegenüber 42/58 im älteren, noch nicht umgestellten Player-Guide ist beobachtet, jedoch nicht kontrolliert kausal bewiesen.
3. **T61 als positiver Gegenfall:** Echte `quest.status:completed` und `coin.changed:+60` werden korrekt gebucht. **Die Reisezielzuordnung kann damit nicht als uneingeschränkt korrekt gelten**, denn der falsche Stadtwechsel zum Asterhall-Gildenbereich erfolgte schon vorher (T59); narrativer Kontext und belegte Aktion nicht vermengen.
4. Das Original-ZIP liegt **inzwischen** tatsächlich auf `main`; frühere Angaben, es sei dort nicht vorhanden, waren überholt.

## A – Preise: T89 P1 und T82 zusätzliche Präzisierung

### T89: Bett jetzt – Frühstück erst morgen

Das anwesende `offer.t176.8` enthält mindestens zwei getrennte Leistungen: **Bett l1 = 2 cp**, Frühstück/Bier **l2 = 1 cp**. Der Spielersatz verlangt ausdrücklich die **sofortige Zahlung von 2 cp nur für l1**, während er erst am Morgen das Frühstück nehmen möchte. `planner.js` generiert zunächst `offer.accept` mit `lines:["l1","l2"]` und `agreed_cp:3`; `trade.js:acceptanceWhy` verweigert korrekt die Abweichung vom vom Spieler genannten Sofortbetrag von 2 cp. Die Reparatur behält **beide** Lines und setzt nur `agreed_cp:null`, was erneut zu **2 gegen 3 cp** führt. `planner_failed` endet vor Narration und Kauf-/Schlafbuchung. Kein defensiver Preis-Guard darf gelockert werden.

**Sols isolierte Sonde:** Nur l1 wird vom bestehenden Code akzeptiert und als **2 cp** gebucht. Das spricht gegen einen fundamentalen Kauf-/Preisdefekt, bestätigt aber einen **Scope-/Temporalitätsfehler des Planners und seiner Reparatur**. Diese Sonde ist als Sols berichteter Test gekennzeichnet und nicht als eigene Ausführung des Gegenreviews.

### T82: zwei verständliche Einzelpreise

`"Two copper for the bed and a copper for the soup, please. I'll take the room."` nennt konkret **2 cp für Bett** und **1 cp für Suppe**. `tradePrice()` erkennt mehrere Geldbelege und behandelt sie ohne explizites Compound-Muster als mehrdeutig. `acceptanceWhy()` stößt die unnötige `SYSTEM // CLARIFY`-Nachfrage an. Dass T83 danach erfolgreich beide Positionen akzeptiert, widerlegt die Fähigkeit des Systems nicht, zeigt aber einen **vermeidbaren Extrazug**. Die richtige Abnahme soll **Angebotspositionen, Produktreferenzen, Mengen und jeweils zugeordnete Preise** getrennt prüfen, statt sämtliche Beträge eines Satzes blind als zusammengesetzten Gesamtpreis zu interpretieren.

**Designgrenze für Paket A:** Nicht jedes Erwähnen zweier Preise ist ein derzeitiger Kauf beider Positionen. T82 ist eine aktuelle Zustimmung zu klar bepreisten Leistungen; T89 eine **zeitlich getrennte** Zustimmung. Tests sollen beide positiv/negativ unterscheiden, auch wenn die Formulierung abweicht. Echte Rabatte, konkurrierende Angebote, unklare Menge und tatsächlich abweichender Preis müssen unverändert blockiert bzw. systemseitig geklärt werden.

**System-Klärung:** Wenn Planner plus Repair eine sachliche Preis-/Scope-Mehrdeutigkeit **nicht** auflösen, wäre eine vom System erzeugte `CLARIFY`-Antwort **ohne Kauf, Münzänderung, Schlaf, Weiterreise oder Erzähler-Story** der sichere Weg, um denselben Langlauf beim nächsten Userturn fortzusetzen. Dieser Fallback darf nie einen strukturellen Planner-Ausfall oder einen bereits teilweise gebuchten World-Turn verdecken. Keine Wiederholung, Löschung oder Umeditierung des schon in SillyTavern gespeicherten Usertexts.

## B – Orte: T59 zusätzliches P1 und Asterhall-P2

### T59 – neues P1: ein Gasthaus **nahe** der Gilde wird zur Gildenhalle

Spielertext: `I find an affordable inn near the Guild hall, get a room, and sleep until dawn.`  
Der Planner liefert fachlich richtig `go.to: {new:"an inn near the Guild hall"}`. In `src/v4/commands.js:HANDLERS.go` steht jedoch der zu breite Guard

```js
if (c.to && typeof c.to === 'object' && /\bguild\b/i.test(String(c.to.new || ''))) {
    const hall = guildHallMeant(s);
    if (hall) c = { ...c, to: hall };
}
```

Der Test auf `Guild` im Zieltext genügt, obwohl `near` **eindeutig eine Relation und gerade keine Identität** der Gaststätte mit der Halle bezeichnet. `guildHallMeant(s)` sucht eine aktuelle Guild Hall, ansonsten die eindeutige aktive Vertragsfiliale bzw. registrierte Branch – hier landet die Reise bei **Asterhall** statt dem beabsichtigten Ort in **Thornbury**. Später beschreibt/legt der Extractor das Gasthaus im falschen Stadtumfeld an. Das ist **nachvollziehbar ein Engine-Berechtigungs-/Ortsumdeutungsfehler**, nicht nur Narrator-Halluzination. Der Fall kann weitere offiziell gebuchte Aktionen (auch Guild-Transaktionen) auf dem falschen Ortsanker nach sich ziehen; Folgeaktionen nicht als unabhängigen Beleg für korrekte Reisen verwenden.

**Enger Fix:** Nur eine **tatsächlich als Ziel benannte** Guild Hall/Guild branch/Guild desk (ohne `near`, `next to`, `behind`, `across from` oder eine eigenständige Einrichtung als Hauptsubstantiv) darf auf einen **existierenden** kanonischen Hall-Knoten gemappt werden. Das ausdrücklich genannte Settlement muss beachtet werden; ohne Hall dort darf kein stiller Ersatz in einer anderen Stadt entstehen. Die normale Orts-Suche `inn near the Guild hall` muss als Suche nach einem **Gasthaus** bestehen bleiben. Keine pauschale Zwangsverweigerung von Orten, deren Beschreibung Guild nur als Landmarke erwähnt.

### Asterhall – kanonische Filiale statt paralleler Ort

`src/v4/domain.js:hallOf(state,id)` akzeptiert bereits alle **echten Nachfahren** eines `guild_hall`-Knotens. Die unabhängige Ortsanlage `loc.asterhall.asterhall_guild_branch` ohne Hall-Tag ist der Fehler. `world.js:resolvePlace()` kann `Guild hall/house/office/lodge/building` bereits kanonisieren, **„Guild branch“** aber noch nicht. Binde eindeutig gemeinte Synonyme und Unterräume an die **existierende** `loc.asterhall.guild_hall`-Identität, statt neue hallenartige Parallelgebäude zu gründen.

**Gegenproben:** In Thornbury/Marrowbridge existieren nachweislich **keine** Engine-Guild-Halls. Dort dürfen nur erzählte Räume keinesfalls eine offizielle Abgabe oder Auszahlung eröffnen. Ursprünglicher positiver Asterhall-Turn-in bleibt korrekt. Die gefälschte, noch „ausstehende“ bürokratische **Thread-/Memory-Notiz** kann trotz echter Auszahlung im HUD fortwirken; als eigenes Narrator-/Fakten-Konsistenzthema prüfen, **nicht** durch erfundene Guild-Statusänderungen oder beliebiges Löschen aller Threads beheben.

### Regressionsschema B

- `go({new:"an inn near the Guild hall"})` sucht Gasthaus vor Ort, **nicht** Guild Hall, **kein Wechsel** in Stadt des aktiven Vertrags.
- Gleiches für `next to the Guild hall`, `opposite the Guild office`, und für ein als Landmarke genanntes fremdes Settlement.
- `go({new:"the Guild hall"})` darf bei gültigem eindeutig gemeintem Hall-Standort weiterhin kanonisch auf die Hall zeigen.
- `go({new:"Guild branch in Asterhall"})` + `resolvePlace` referenzieren **denselben** vorhandenen Hall-Knoten; echtes Hall-Innenzimmer funktioniert für `quest.turn_in`.
- Explizites `Guild hall in Thornbury` ohne kanonische Branch → **keine** stillschweigende Asterhall-Umleitung; keine formale Auszahlung.
- Positive T61-Abgabe, negative T75-Phantomauszahlung, T59-Ortsverlagerung, Reload/Replay/Swipe.

## Was jetzt ausdrücklich **nicht** folgen soll

- Kein generischer Runner-„Edit/Regenerate“ und kein automatisches Wiederholen eines schon abgeschickten Chattexts.
- Keine Zusatzhinweise für Shopping, Queststrategie oder neue JSON-Formatklassen allein aus Run 19.
- Keine Startwert-, Gegnerlevel- oder XP-Erhöhung: Level 5 nach 89 administrativ stark belasteten Zügen beweist keine Unterprogression. Dungeon-Erstkontaktfix `.94` wurde in diesem Run **nicht natürlich** durch denselben Trigger getestet.
- Gearkauf→Equip und organischer Skill-Erwerb bleiben **noch offen für natürliche Abnahme**, nicht per künstlichen Runner-Pflichten erzwingen.

**Fazit:** Zwei **fachliche** Korrekturen (Handelszustimmung/Temporalität und Orte/Guild) genügen als nächste Entwicklungsstufe. Produktstand bleibt .94, keine Implementierung durch dieses Gegenreview.
