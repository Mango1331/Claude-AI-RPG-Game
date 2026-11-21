# User07 .204 – GPT-Review Phase 2 nach Fortsetzung (21.11.2026)

**Status: persönlicher Run fortgeführt, nicht abgeschlossen.** Quellen: [Originale/SHA](SOURCE_MANIFEST_PHASE2.md), [spontanes Spielerfeedback](ORIGINAL_USER_FEEDBACK_PHASE2.txt), [dessen getrennte Bewertung](USER_FEEDBACK_PHASE2_REVIEW.md), [Phase-1-Codex-Gegenreview](CODEX_GEGENREVIEW.md), [Board-Designnachtrag](REVIEW_GPT_NACHTRAG_2026-11-21.md). Prüfung am **unveränderten Build `4.3.0-c.6.6.204` (`b51e850`)**; keine Neuimplementierung, kein Provider-A/B, keine eigene vollständige Replayausführung.

## 1. Quellen und Ablauf

Der zweite Upload ist derselbe ursprüngliche User07-Chat mit **25 neuen Spielereingaben** (inklusive `#assign`) und **22 zusätzlichen Erzählantworten**; insgesamt 31 Benutzereingaben, 26 Erzählantworten (+ ursprüngliche Greeting), 474 Ereignisse in 58 Eventgruppen. Die elf alten Gruppen und die alten Chattexte sind unverändert; diese Phase **nicht als User08** oder unabhängigen Vergleich behandeln. 26/26 X-Abschlüsse sind `applied`, drei davon erst nach zusätzlichem X-Reparaturrequest, 18 Einzel-Deltas im gesamten Lauf abgewiesen. `applied` bedeutet **nicht**, dass jedes Delta angenommen wurde. Die Endgruppe umfasst Alarics Ankunft in der alten Goblin-Lagerkammer von **Mossback Warrens, Level 1**; keine Questabgabe.

Spielstationen seit der ersten Tafel:
- `Annehmen: Clear Mossback Warrens Level 1`: Quest gebucht, Vertragsschein im Inventar, kein automatisches Entgelt. Der Clerk kennt die Annahme. Kleiner abgelehnter `desk_handler`-Nachweis („He wrote…“ statt eindeutiger Clerk-Bezeichnung) beeinträchtigt die Buchung nicht.
- Auf dem Weg entsteht nach einem PULSE-Trace ein Zwischenhalt; Alaric folgt Spuren, trifft einen eingeklemmten Fuhrmann, befreit ihn und verzichtet ausdrücklich auf seinen angebotenen Lohn. Das Versprechen wurde später als erledigt markiert, **ohne Geldgutschrift**. Stimmige Weltreaktion.
- Der neue Goblin mit grüner Laterne nähert sich. Alaric versteckt sich, besiegt ihn per Flame Lance mit Hinterhaltstreffer, steigt Level 2; anschließend entdeckt er auf eigene Suche ein weiteres Goblinlager, besiegt dort drei Goblins und erreicht Level 3. Die bereits von der Engine gebuchte Gegnerbeute ist nicht mit einer nachträglichen Lager-Suche gleichzusetzen.
- Später Eintritt in Mossback Warrens; zwei Goblin-Speerträger besiegt, Alaric steigt Level 4. Er bewegt sich weiter bis zur Enginekammer `loc.mossback_warrens.l1_s3`. **Dungeon-Quest weiterhin aktiv, nicht READY**. Der letzte Erzähltext zeigt zwei weitere Wege, die Engine bucht diese nicht als Dungeon-Verbindungen.

## 2. Laufzeit – die Wartezeit darf nicht mit der Narratorphase verwechselt werden

Vier ursprünglich dokumentierte Narratorzüge + **22 neue**. Alle aufgeführten API-Requests gepuffert (`stream:false`); alle Provider-Cache-Usage-Werte 0. Keine neue Boarderstellung in Phase 2. Laufzeitformel:

`ST gen_started→gen_finished` = Hostintervall bis Erzählende, einschließlich vorgezogener Planner-/Boardphase und der Narratorhostspanne. Danach läuft `extraction.ms`; `ST-Intervall + extraction.ms` ist eine **rechnerische Untergrenze** vor gesondertem Save-/UI-Overhead, nicht die tatsächlich gestoppte Freigabezeit.

| Messgröße | 22 neue Züge – Median | Mittelwert | P90 | Höchstwert |
|---|---:|---:|---:|---:|
| Plannerphase | 4,93 s | 8,95 s | 23,61 s | 36,52 s |
| Narratorphase | 27,97 s | 30,86 s | 46,32 s | 63,87 s |
| Hostspanne bis Erzählende | **33,46 s** | 40,12 s | 59,16 s | 83,16 s |
| Extractorphase inklusive Repairs | **24,18 s** | 33,81 s | 44,21 s | 112,93 s |
| **Hostspanne + Extractor (untere Grenze)** | **62,61 s** | **73,92 s** | **103,37 s** | **191,81 s** |

**15/22** neue Antwortzüge überschreiten schon diese Untergrenze von 60 s, **5/22** die 90 s. Das erklärt, warum ein narrativ „normal langer“ Zug noch nicht schnell wieder spielbar ist. Die Engine-/Modellwartezeit darf nicht als reine Erzählgeschwindigkeit ausgegeben werden.

### Drei auffällige X-Reparaturen

| Spielereingabe | X gesamt | Wirkung/Quelle |
|---|---:|---|
| `i look around… more [goblins]… or even a camp` | **80,365 s** | Eigenständige Suche erfolgreich; ein Camp und Goblins werden entdeckt; Extractor brauchte Repair, obwohl Spiel fortsetzbar |
| `i enter the dungeon` | **112,928 s** | Der Narrator überspannt den kanonischen Eintritt und beschreibt bereits Räume/Gabelung; nach X-Reparatur bleiben zwei lokale Claims abgewiesen; Folgekorrektur verweist auf **Warrens gate passage** |
| `i continue ahead inot the darker run` | **108,649 s** | Engine bucht Raum `l1_s3`, verwirft aber beide vom Erzähler erfundenen Seitenpassagen als `dungeon_way` |

Wichtig: Keine zusätzliche Boardkosten in Phase 2. Die neue Häufung langer Extraktoraufrufe ist eine **unabhängige Optimierungs-/Qualitätsfrage**, auch wenn die 206-s-Narratorphase des Registrierungszugs weiterhin ein früher Ausreißer bleibt. `N` enthält Host/Transport; Providerinterne Warte-/Prefill-/Decodinganteile lassen sich nicht direkt isolieren. Der frühere Codex-OpenRouter-Lauf ist **kein kontrolliertes Paar** für diesen Featherless-Test.

### Bewertung der Zielzeiten des Nutzers

Angestrebte, **nicht verbindliche UX-Ziele** (vollständige sichere Interaktion, nicht nur erster sichtbarer Text): einfacher Dialog ~20 s, Dialog+Reise ~30 s, Kampf/Payment ~40 s, aufwendiger Zug im Schnitt unter 60 s. Diese Ziele sind vernünftig als **langfristiges Erlebnisziel**, aber beim aktuellen Featherless-Requestpfad technisch noch nicht erreicht. Zwischenziel zur Diskussion: Median bis Erzählende **unter 30–35 s**, Median bis sichere Folgeeingabe **unter 50 s**, P90 für normale Züge **unter 90 s**; anschließend die 20/30/40/60-s-Wunschwerte anstreben, ohne Spielqualität zu opfern. Diese Zwischenwerte sind **Designvorschlag, keine Messung oder beschlossene SLA**. Bei Tests nach Kategorien nicht Äpfel und Birnen mischen (HUD, Narrator, Dungeon, Board, Repairs).

## 3. Spielmechanik und Kontinuität – wesentliche Befunde

### A. Stealth und Hinterhalt: aktueller Check ist korrekt, Design offen

Spielereingabe: `*i crouch down and hide as i wait for it to come nearer*`. `checks.js::stealthEvents` sah **keinen gegenwärtigen Beobachter**, also `automatic:true, success:true, nobody present to notice (automatic, no roll)`. Nach dem Verstecken führte die Erzählung den Goblin erst ein und zeigte, wie sein Blick über das Versteck hinweggeht. Extractor: `aware=unaware`. Der erste Flame Lance war damit ein **legitimer Ambush-Opening-Angriff ×1,5**, 64 Schaden gegen 54 HP; keine falsche Zufallszahl. **Aber:** Ein künftig eintretender aufmerksam suchender Gegner könnte eine sinnvolle eigene Entdeckungssituation begründen. Vor einer Änderung konkret entscheiden, ob ein einmaliger neuer Beobachter-Check notwendig ist und unter welchen Umständen; nicht Heimlichkeit in wiederholte Würfelorgien verwandeln. Prüfen, ob der aktuelle Rückgriff auf Narrator-„unaware“ die Stärke von Ambush zu sehr von Textformulierungen abhängig macht. Kein Beleg für einen Defekt an diesem konkreten Wurf.

### B. Campsuche: Sichtbares von Verborgenem unterscheiden

`*i look around the camp for any loot*` führte zu `check.recorded`: **PER 5 gegen 6, Chance 45,45 %, Wurf 77 – FAILURE**; der Narrator stellte das untersuchte Lager als wertlos dar. Zuvor waren die Beutestücke der besiegten Goblins **automatisch gebucht** (einschließlich Waffen und Geld; nicht doppelt auszahlen). Der Nutzer möchte normalen, sichtbar vorhandenen Campinhalt nicht von einem Alles-oder-nichts-PER-Erfolg abhängig machen. Zustimmung als **Designprüfung**: offen sichtbare, zugängliche und plausibel bereits vorhandene Objekte müssen gefunden/mitgenommen werden können; zusätzliche verborgene Beute darf geprüft und variabel sein. Ein fehlgeschlagener Search Check darf nicht rückwirkend bereits sichtbare Güter unsichtbar machen. **Keine Garantie für Silber/Schwerter in jedem Camp**, keine erfundene feste Loot-Tabelle aus Nutzerbeispielen, keine Duplikation der automatischen Kampfbeute.

### C. Dungeon-Orts-/Wegkonsistenz: neuer mittlerer Spielflussbefund

Das konkrete Muster ähnelt dem Messraumproblem, benötigt aber **eine andere Lösung**:

1. Bei `i enter the dungeon` beschreibt der Narrator den Eingang, den Guild-Keeper, dann eine weitere Kammer mit angeblich früher getöteten Goblins und eine Weggabelung. Die Engine bucht nur die zulässige **Warrens gate passage**; zwei lokale X-Fakten/Threads werden aufgrund `scene_context` verworfen und ein Folgeprompt korrigiert den erzählten Weiterweg. Auch das „Name?“ des Keepers wird erzählerisch beantwortet, obwohl Alaric keine Antwort ausdrücklich gegeben hat – möglicher **Spielerhoheitsbruch** in der Formulierung „He took the answer down“, sofern nicht klar als Ablesen der Gildenplatte erkennbar.
2. Auf `i walk deeper as i look for enemies to clear` erzählt der Narrator zunächst ein freiwilliges „rechts hinein, zurück, links weiter“. Diese konkrete Wegwahl wurde vom Nutzer nicht ausdrücklich getroffen; die Engine bucht tatsächlich die nächste Dungeonkammer `l1_s2`. Zwei `attack_commitment`-Ablehnungen verhindern, dass drohende Goblins vorschnell als bereits angreifend gelten. Diese Ablehnungen haben eine legitime Schutzfunktion.
3. Im letzten Zug `i continue ahead inot the darker run` wird `l1_s3` gebucht. Der Narrator schildert danach **einen linken und einen rechten Gang** als zukünftige echte Wahl. Beide Extractor-`passage`-Deltas werden als **`dungeon_way`** abgelehnt: Im Living Dungeon verwaltet die Engine die Wege. Das **angebotene Optionspaar ist daher kein bestätigter kanonischer Ausweg**. Der Spieler könnte nun eine nicht existierende Auswahl erwarten. Nicht einfach `dungeon_way` aufweichen: zunächst Narrator-/Engine-Kontext klären, welche Wege an dieser Stelle wirklich angeboten werden dürfen; keine ungeprüften neuen Raumgraphen aus Prosa buchen.

**Unterscheidung zum Gildenmessraum:** Bei einer bereits gebuchten Anmeldung ist die Zwischenbewegung Teil der Routine und muss nicht zum eigenen Ziel werden. Ein verzweigender Dungeonraum mit Gefahren und Entscheidungen ist hingegen **echtes Gameplay**; freie Raum-/Wegwahl darf nicht durch das Narrator-Modell stillschweigend vorweggenommen werden.

### D. HUD-Buttonfarben und Kontrast

`src/hud.js` zeichnet Questannahme als `button[data-avereth-quest]`. `style.css` definiert aktuell die allgemeinen `.avereth-draft`-Schaltflächen und Action-HUD-Buttons, aber keine gezielte kontrastfeste Board-Annahmebuttonregel. Damit greift das ST-Theme und produziert bei diesem User ein weißes schwer lesbares Erscheinungsbild. Der Wunsch **schwarz/weiß/weißer Rand** ist ein kleiner scoped CSS-Kandidat mit gutem QoL-Nutzen, ohne mechanische Auswirkungen. UI-Fokus, Hover, Disabled und Mobilansicht bei späterem CSS-Fix mitprüfen.

### E. Sonstige nachvollziehbare, aber keine Patchpriorität

- Der akzeptierte Auftrag, Guild-Platte, 20-cp-Gebühr und automatische Gegnerbeute bleiben verbucht. Alaric wird Level 4, hat nach Ausgaben/Beute **46 cp** und die Dungeonquest ist weiterhin aktiv. Keine eigenmächtige Auszahlung.
- Ein `desk_handler` beim Vertragseintrag wurde wegen eines mehrdeutigen `He wrote...`-Evidenzzitats abgewiesen. Das ändert nicht die gebuchte Questannahme; nur dann priorisieren, wenn wiederholtes NPC-Zeugenwissen fehlerhaft wird.
- `world_rule`-Ablehnungen einzelner Kampfpositionen (vier) verhindern, dass die Prosa im aktiven Kampf engineeigene Range Bands überschreibt. Nicht als nutzlose Validatorstrenge entfernen.
- `engine_recovery`-Ablehnung einer zusätzlichen Heilung verhindert eine Doppelbuchung. Korrekt.
- Drei X-Reparaturen sind alle letztlich `applied`; kein belegter vollständiger Extractorverlust in diesem Snapshot. Ein tatsächlich manuell durchgeführter Browser-Reload wurde nicht protokolliert.

## 4. Ergebnis und spätere Patchplanung – keine vorzeitige Implementierung

| Kandidat | Nutzen | Empfehlung |
|---|---|---|
| **X-Reparaturhäufung / unklare Dungeon-Chronologie** | Hoher möglicher Zeitgewinn + korrigierbare Welt-/Wegwidersprüche | **Prioritär** am tatsächlichen Originalausgang prüfen; Validator nicht blind lockern |
| **Gildenmessroutine + ungewollte Dungeon-Vorabbewegung** | Spielerfreiheit und saubere kanonische Orte; Welt soll nicht künstlich widersprechen | Mit Phase-1-Befund koordinieren, aber getrennte Ursachen |
| **Camp-Loot: sichtbar versus verborgen** | Sichtbarer Spielspaß, keine unnötigen Erfolgsloswürfe | Designvorgabe verifizieren und konkretes Daten-/Lootverfahren entwerfen; kein automatischer Wertgewinn |
| **Stealth: erst keine, dann neue Beobachter** | Fairness/Hinterhaltwirkung | Begrenzte Designentscheidung, konkreten Fall nicht als falsch gewürfelt bezeichnen |
| **Quest-/HUD-Buttonkontrast** | Sofort sichtbarer UX-Gewinn | Kleiner reiner CSS-Fix-Kandidat |
| **Board-Verteilungsquoten aus Phase 1** | Vermeiden unnötiger Ganzboard-Repairs und stärkere Sandbox | Bereits separat als bevorzugte Richtung dokumentiert; Phase 2 liefert hierzu keinen neuen Board-Erstfall |

**Nicht empfohlen:** vollständiges Quest- oder NPC-Datenformat abschaffen, Engine-sichere Kampfrange- oder Dungeonwegprüfungen aufweichen, automatische Preis-Quote-Ergänzung, pauschale Card-Kürzung oder Streaming als Zeit bis spielbereiter Eingabe ausgeben. Kein neuer kostenpflichtiger A/B-Test als Voraussetzung; zuerst bestehende Rohdaten und offline Gegenfälle nutzen.

**Nächste Entscheidung vor einem Patch:** User und Codex sollen die Trennung *„Engine muss sichere Mechanik gewährleisten“* versus *„Konvention/Welt-Prosa wird unnötig technisch blockiert“* an den drei realen Quellenfällen (registrierte Messung, Dungeon-Wegführung, normale Campsuche) diskutieren. Das Spiel bleibt auf `.204` testbar, jedoch sollten **nicht kanonische Wegangebote im Dungeon** nicht durch weiteres Spiel als offiziell bestätigt vorausgesetzt werden.

**Status:** Originale und dieser Review nur in der Dokumentation auf `main`; **keine Engine-, Character-, Lore- oder Preset-Dateien geändert**, keine Implementierung freigegeben.
