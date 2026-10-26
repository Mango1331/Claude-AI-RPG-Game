# Avereth Engine – unabhängiger Review des natürlichen Laufs .93

**Original:** `20261026-031107Z-current_test.zip` (9.3-MB-Export), SHA-256 `96966a0e853e6ca618998834f78e315ecb504fc3e0ea6efa2213935aa5898203`; ZIP-CRC vollständig geprüft. **Die Original-ZIP wurde hier im Chat bereitgestellt; ihre Ablage auf `main` ist mit dieser Review-Erstellung noch nicht bestätigt.**  
**Produkt:** Build `4.3.0-c.6.6.93`, SHA `471d5e8c3509bf9d2d22239ebf3688f6e1c3c835`, V4-C, Ruleset 2. **Spieler:** GLM-5.3-Flash, Guide `current_test`, Persona pragmatic Guild adventurer.  
**Methode:** Original-`run.json`, `report.md`, `player.jsonl`, `chat.jsonl`, `avereth-events.json`, `evaluation.json`, `calls.json` und entscheidende Stellen des unveränderten .93-Produktcodes geprüft; **kein Node-/ST-Test oder unabhängiger technischer Replay ausgeführt, keine Produktcodeänderung**.

## 1. Ergebnis und fachliches Fazit

- **58/100 Spielerentscheidungen**, 35:31 Minuten, **Tod in Spielereingabe 58**. Fünf regulär gewonnene Kämpfe, der sechste endet tödlich; fünf zuvor besiegte Gegner (Snapjaw A, drei Stranglewillow-Saplings, Snapjaw B).
- Mage, Startwerte **7 in allen Basisstats**, Klassenbonus auf INT/WIL 8; Level **3**, 44 Rest-XP, nach Level-ups zweimal +5 Statpunkte regulär per `#assign` verteilt. Vor dem letzten Kampf: **100/110 HP**, **100/168 MP**, Starterwaffe/-rüstung.
- Zwei echte Novizenaufträge korrekt erledigt: 3 Stranglewillow-Saplings (60 cp, 120 Quest-XP) und ein Snapjaw-Lizard (25 cp, Quest abgeschlossen); die erste Snapjaw-Jagd war vor einer förmlichen Auftragsannahme eine freie Jagd, nicht rückwirkend ein weiterer Gildenabschluss.
- Kein Planner-/Extractor-Hard-Abbruch, keine Host-PageErrors oder Serverfehler; 168 Aufrufe durch Engine/Narrator, sechs Extractor-Reparaturen laut Bericht. Die ursprünglichen .93-Preis-/Kauf- und Trainingsfehler wurden in diesem natürlichen Lauf nicht gezielt erneut ausgelöst. Weder Testlaufdauer noch Fortschrittsrate beweisen schon Level-15-Balance.
- **P1:** unzulässig hochstufiges Skelett entsteht beim Betreten des Dungeon-Wurzelorts **vor** dem ersten Living-Dungeon-Encounter. **P2:** der Testspieler verwechselt erfundene Narrator-Details mit kanonischen Angeboten/Queststatus, obwohl die Engine korrekt zurückweist. **Runner-Effizienz:** 42 vermeidbare reine JSON-Formatwiederholungen bei 58 Entscheidungen.

## 2. P1 – tödlicher Level-28-Spawn in F-Rang-Erststock (T57/58)

### Belegkette

1. Das **initiale `campaign.started`** definiert `loc.old_crown_catacombs` als True Dungeon mit **Gesamtrang F–E**, ausdrücklich **Ebene 1: F**, **Ebene 2: E**.
2. Auf der *ursprünglichen kanonischen Gildenliste* erschien `Clear the Old Crown Catacombs, Level 1` als **Novice, Questlevel 4, dangerous, Auszahlung 180 cp**, mit Hinweis auf Gruppen/stärkere Gegner. Im späteren Narrator-Dialog wurde dagegen ein angeblich leichter **F-Rang-Direktauftrag für zwölf Silber = 120 cp** beschrieben; dieser wurde nie als eigenständiger formaler Auftrag gebucht (siehe §3).
3. T56: Die geschilderte Ankunft in der unterirdischen runden Kammer wird **nicht** vollständig übernommen. `world.js` verwirft `arrive`/`passage`, weil der berichtete Eingang eine Verbindung zu einem anderen Dungeonort überspringt. T57 verlegt den PC stattdessen nach **`loc.old_crown_catacombs` (Dungeon-Wurzelort)**, nicht in einen eindeutig zugeordneten Raum auf Ebene 1.
4. **In derselben T57-World-Antwort** wird `mon.crerisen_skeleton_1` als `creature.new` eingeführt, betreten und sofort mit `entity.updated.profile` fixiert: **Level 28, Rang E, 192 HP, ATK 69, DEF 18, MDEF 5, Initiative 19**. **Danach erst** entsteht `dungeon.established` mit konkretem **Ebene-1-Fenster: Minion-Level 1–5, Guard 4–8, Boss 5–9**, Ebene 1 Rang F. Kein `dungeon.slot`-Nachweis für das zuvor erzeugte Skelett.
5. T58: Alaric Level 3 trifft mit Flame Lance **58** (Skelett 192→134 HP). Das Skelett greift danach zweimal für **62** und **63** an (PC 100→38→0). **Tod regelgerecht anhand des vorhandenen Kampfprofils**, aber Profil/Begegnungszuordnung fachlich unzulässig für den zugesagten Erststock.

### Codepfad und Arbeitshypothese

- `src/v4/world.js:newEntity` prüft bei `creature.new` die Dungeon-Slot-Zuordnung; die Blockade freier Dungeon-Gegner hat ausdrücklich die Bedingung `livingBefore.has(root)`. Beim erstmaligen Betreten ist der Living Dungeon noch nicht eingerichtet, sodass ein ungebundenes Skelett in diesem Sonderpfad durchrutschen kann.
- `src/engine.js:materialise` fixiert beim ersten Auftreten sofort das Profil. `rankAt(s, at)` liefert **am Dungeon-Wurzelort** ohne konkrete Ebenenzuordnung den **gesamten Bereich F–E**; ohne Living-`levelSpan` kann ein Wert aus diesem breiten Rangintervall entstehen. Das beobachtete **Level 28** passt zum E-Band (15–29), nicht zum anschließend eingerichteten F-Erststock.
- `living.js` richtet den Dungeon und seine sicheren, deterministischen Begegnungsslots erst später in der Verarbeitung ein. Die schon materialisierte freie Kreatur bleibt bestehen. **Das ist keine gewöhnliche gefährliche, aber zulässige Ebene-1-Begegnung.**

**Review-Priorität:** Sol soll den genauen Ereignispfad ab initialem Kampagnenstand mit Original-T56/57 reproduzieren. **Fixziel:** weder die Erstbegegnung am Dungeonroot aus einem ungebundenen Gesamtrang F–E materialisieren noch spontan einen Slot-/Ebenennachweis vortäuschen. Etablierungsreihenfolge, am Wurzelort zulässige Kreaturen und den Übergang zur tatsächlichen Ebene 1 gemeinsam absichern. Keine globale Gegnerskalierung auf die PC-Stufe, kein pauschales Verbot aller Kreaturen an gewöhnlichen Ruinen und keine Erweichung der bestehenden Präsenz-/Passage-Firewall.

**Tests:** frische Kampagne, Dungeon mit Gesamt-F–E und Floor-1-F, erstes Betreten von Root über einen Narrator-Raum mit zunächst abgelehnter Passage, `creature.new` im selben ersten Root-Turn: keine ungebundene E-Level-28-Kreatur als Floor-1-Gegner. Später explizit erlaubte Floor-2-E-Encounter bleiben stark; bereits etablierte Living-Dungeon-Slotprüfung, Root-Zugang, fremde/entfernte Szenen, Replay/Reload und mehrere Kreaturen absichern.

## 3. P2 – Narrator-Behauptungen statt Engine-Canon: konkreter Lernstoff für den Testspieler

### Falscher Auftrag und gefährlicher Abschluss

- T49/T50: Der Narrator nennt eine **Granary Pest Cull**, die **nicht auf dem echten Board** existiert. T50 versucht der Spieler sie anzunehmen; `quest.accept` verweigert **`no such contract`**. Das ist eine **korrekte Engine-Ablehnung**, kein Grund für eine weitere Synonym-/Wording-Regel.
- T51–T55: NPCs behaupten einen **Katakomben-F-Rang-Direktauftrag für 12 Silber**, obwohl der vorhandene **kanonische** Level-1-Gildenvertrag **Level 4 dangerous / 180 cp** ausweist. Der Spieler lässt sich einen Zettel und eine Lampe geben und setzt den Besuch fort; `#quests`/Quest-HUD zeigen **keinen aktivierten formalen Katakombenauftrag**. Die informelle Erzählung ist kein formaler Engine-Vertrag, kein gebuchter Auszahlungsanspruch und kein bestätigter Gefahrengrad. Das ist primär eine Narrator-/kanonische Darstellungslücke und ein Testspieler-Interpretationsproblem; den tatsächlichen Level-28-Spawn **separat** als Engine-P1 beheben.
- T49: Verkauf von zwei Schuppenplatten und zwei Klauen an **den Gildenschreiber** statt einen belegten Käufer. Beide `sell`-Aktionen werden wegen `nobody to sell to` korrekt verweigert. Danach erzählt der Narrator, sein Beutel enthalte diese Ware nicht, während der HUD sie weiter aufführt. Der Spieler bemerkt den Widerspruch, verlässt ihn aber ohne echte Transaktion. **Kein Inventarverlust gebucht**; das Problem ist Autoritätsverwechslung und Händlerpräsenz, nicht eine verlorene Engine-Transaktion.
- Beim Snapjaw-Auftrag behauptet der Narrator **acht Silber = 80 cp**; die echte kanonische Quest sieht **25 cp** vor. Die Gildenpreis-Schutzregel weist die unerlaubte Änderung zurück; die tatsächliche Auszahlung erfolgt zum kanonischen Betrag. Der Testspieler beobachtet die Diskrepanz, hält sie jedoch längere Zeit für potenziell gültig.
- T21/22: Ein geschilderter Sapling in der Vat-Brickwork ist kein kanonisch angreifbares Ziel; die Engine verlangt ein tatsächlich vorhandenes Ziel. Der Spieler fragt nach und bewegt sich zur **Third piling plank** und später zur **Bark-pile ramp**. Zum Teil echte Narrator/World-Konsistenzlücke, aber **nicht** bloß die falsche Wahl von Angriffsverben. Keinen weiteren allgemeinen Wortfilter allein aus diesem Symptom ableiten.
- Bettsuche/Übernachtung T40–42: Erst fehlen konkreter Preis und Zimmerbuchung (`buy pending no_price`, `sleep refused room not booked`). T42 zahlt der Spieler konkret für Zimmer/Essen und schläft; **HP und MP werden tatsächlich regeneriert**. Das illustriert genau die sinnvoll trainierbare Abfolge, ohne die Engine zu ändern.

### Empfohlene kompakte Bedienkompetenz im Player-Systemprompt

**Entscheidungsfreiheit erhalten**, aber der Testspieler soll die bereits bestehenden Spielbedingungen kennen:

1. **Handlung = konkret vollzogenes Verb + tatsächlicher Ort + identifizierbarer Gegenstand/Empfänger/Ziel.** Eine Stadt ist nicht das Gildenhaus; Gildenabgabe verlangt den tatsächlichen Schalter. Aktiv auf der echten Liste nachgefragte Verträge annehmen, READY bei `#quests` prüfen und dann abgeben.
2. **Narrator ≠ Buchungsautorität.** NPC-Preis, Währung, Ware, Quest, abgeschlossene Handlung oder Erfolg aus der Erzählung sind *Behauptungen*, bis Engine-Systemausgabe/HUD oder passende `#quests`, `#quest`, `#bag`, `#equipment`, `#audit` dies bestätigen. Bei Widerspruch **nicht** mit der erzählten Variante weiterplanen.
3. Vor einem Kauf **gültigen Verkäufer und konkretes Angebot** finden; dann ausdrücklich Preis/Artikel annehmen, danach Besitz prüfen, erst anschließend benutzen bzw. ausrüsten. Ein bloßer NPC-Preisvorschlag ist noch kein gültiges Engine-Angebot. Einen Gildenschreiber nicht ohne tatsächliche Händlerrolle zu einem Käufer erklären.
4. Einen Raum konkret buchen und **bewusst schlafen**; nicht aus „I wake up“ oder „I need a bed“ eine bereits vergangene Nacht ableiten.
5. Wenn die Engine einen Befehl ablehnt, **die benannte fehlende Voraussetzung korrigieren**, nicht dieselbe Absicht dreimal mit neuen Synonymen wiederholen. Echte Mechanikfehler trotzdem weiterhin aufzeichnen, nicht wegpromp­ten.
6. Kurze natürliche Sätze und klare Ziele, **keine Wort-für-Wort-Vorlagen** oder festgelegten Questpfade. Entscheidungen über Klasse, Quest, Taktik, Ausrüstung und Risiko bleiben beim GLM-Spieler.

Den alten `current_test` unverändert lassen, falls ein vergleichbarer freier Baseline-Test gewünscht ist; optional separaten Bedienkompetenz-/Level-15-Guide daraus ableiten. **Nicht** für diese Änderung Engine-Narrator-Wortlaut oder hunderte Parser-Sonderfälle hinzuerfinden.

## 4. Runner-Befund – 42 unnötige JSON-Wiederholungen

`player.jsonl`: **100 Testspieler-Modellaufrufe für 58 tatsächlich akzeptierte Entscheidungen**. Exakt **42 erste Antworten mit `cause:invalid_json`**, jeweils Fehler `no JSON object in the answer`, anschließend ein gültiger `repair`-Antwortversuch. Diese 42 Antworten waren häufig **bereits sinnvolle schlichte Ich-Spielhandlungen**, z. B. `I choose Mage.`, `I cast Flame Lance at the lizard …`, wurden nur wegen des fehlenden JSON-Umschlags nicht verwendet. Alle 100 Antworten hatten `finish_reason:stop`; dies ist **keine** Reasoning-Erschöpfung, kein HTTP-Fehler und **keine** reale zweite Engine-Spieleraktion.

`players.mjs:parseDecision()` verlangt gegenwärtig JSON mit `message`, `milestone`, `intent`, `stop` usw. und macht bei einem normalen Satz eine weitere Modellabfrage. **Option zur Effizienzverbesserung, unabhängig von der Spielbalance:** einen kontrollierten **Fallback für eindeutig spielbare plain-text-Erstantworten** prüfen; nur echte konkrete Spielereingaben übernehmen, nie leere Antworten, OOC-Prompts, Schema-Fragmente, Modellreflexionen oder mehrdeutige Sätze. Felder `milestone/intent/observations` können dann null/leer bleiben; Telemetrie markiert `plain_decision` und die Entscheidung geht unverändert an SillyTavern. Zusätzlich einen JSON-Only-Promptversuch vergleichen. Dies verändert **weder Spielerentscheidungen noch Engine-Parser**, ist aber ein echter Laufzeit-/Tokenhebel. Keine automatische Umschreibung oder Inhalte aus nicht sichtbaren Engine-Events.

## 5. Balancebewertung und Level-15-Ziel

Die ersten fünf Gegner hatten tatsächlich **Level 1, Rang F**: Snapjaw A (20 HP, 8 ATK), drei Saplings (je 70 HP, 12 ATK), Snapjaw B (84 HP, 14 ATK). Der Level-3-Charakter mit stärkeren Startwerten gewann diese Kämpfe. Level-ups in Spielerzug 32 (Level 2) und 47 (Level 3). Der Weg benötigte Zeit für echte Navigation, Heilung, Unterricht/Verkaufssuche und Dialoge, nicht bloß XP-Farming. Noch **kein natürlich gebuchter Kauf→Equip-Upgrade**.

Aus dem tödlichen E-Skelett darf **keine allgemeine Unterlegenheit von Magiern, keine Forderung nach weiteren Startstats und keine normale Floor-1-Balance** abgeleitet werden. Für Level-15-Runs künftig separate tatsächlich gebuchte Daten über XP/Zug, Level/Gegnerstufe, Schadensprofil, HP/MP, Questabschluss, Ausrüstungsstufen und verlorene Interaktionen auswerten; die schon vorhandenen Spielerevents reichen dafür grundsätzlich aus.

Der aktuelle `current_test` zählt **100 Spielerzüge**; `evaluator.mjs` verfügt **noch nicht** über einen allgemeinen Endcheck `pc.level >= 15`. Level 15 wäre ein eigener bewusst freizugebender Runner-/Guide-Auftrag mit großzügiger Obergrenze und realen Tod-/Host-Abbruchregeln. Die **100-Züge-Vorgabe jetzt nicht still auf 50 verkürzen** – diese frühere Idee passt nicht zum Nutzerziel.

## 6. Vorschlag für Sols ergebnisoffene Prüfung

**Noch keine Implementierungsfreigabe.** Zwei strikt getrennte Prüffragen:

- **P1 Engine:** Original `campaign.started`, T56 abgewiesene Treppe, T57 Root-Eintritt und Spawnreihenfolge, `world.js:newEntity`/`livingBefore`, `engine.js:materialise`/`rankAt`/`levelSpan` unabhängig reproduzieren. Patch begrenzen auf den Fall *erster Root-/Floor-Eintritt ohne etablierten Living-Slot*, nicht allgemeines Balancing oder freie Welten. Gegenfälle F-Wurzel, tatsächlich E-Ebene, normale Ruine, remote sighting, bereits etablierter Dungeon, Replay/Reload/Swipe.
- **Bedienkompetenz und Runner (Design, separat):** Systemprompt-Beispiele für die bereits vorhandenen mechanischen Voraussetzungen, echte Engine-Autorität vor Narrator-Behauptungen. Nachweisen, ob 42 JSON-Erstantworten in der Tat sichere schlichte Spieleraktionen waren; minimalen Fallback bzw. Promptänderung und Telemetrie spezifizieren, ohne Spielentscheidungen umzuschreiben. Level-15-Ziel separat als Konfiguration/Check, nicht als Balancefiktion.
- **P2 Board/Handel:** Narrator-Phantomaufträge und ungebundene NPC-Handelszusagen als Belege für den bekannten strukturierten Board-/Handelsfachplan. Nicht als sofort neue Sonderparser implementieren.

**Weder Produktcode noch Runner, Guide, Charakterwerte oder bestehende Spielstände geändert.**
