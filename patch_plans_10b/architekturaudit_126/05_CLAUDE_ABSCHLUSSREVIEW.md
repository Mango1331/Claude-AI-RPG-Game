# Abschlussreview: konsolidierter Architektur-Fachplan .126

**Stand:** 30.10.2026 · Plan auf `main` `c036f3c` (einschließlich Abschnitt 11) · Produktcode `b8d2af4` (.126, unverändert) · reine Prüfung, keine Produktänderung, keine Commits

## Urteil: mit folgenden Korrekturen umsetzungsreif

Der Plan ist fachlich tragfähig, die Reihenfolge stimmt im Kern. Einen Blocker, der eine Neuplanung erzwingt, gibt es nicht. Neun Präzisierungen sind aber **vor** der Umsetzung nötig:

- Vier davon betreffen Paket C. Eine Formulierung im Plan widerspricht dort Abschnitt 11.
- Zwei betreffen Paket D. Eine davon würde bedingte Käufe sonst faktisch abschalten.
- Zwei betreffen die Abnahme- und Sicherungsbasis (A).
- Eine betrifft den Versionsschutz.

Mehrere frühere Empfehlungen, auch eigene, lassen sich streichen (Abschnitt 3).

---

## 1. Prüfbasis

**Statisch gelesen:** `01`, `03`, der konsolidierte Plan mit Abschnitt 11, der Auftrag und Sols vierte Runde. Die Planaussagen habe ich gezielt am Code von `b8d2af4` geprüft.

**Selbst ausgeführte Sonden** (nur lesend, Skripte im Scratchpad):

- Archive von Batch 16–19 mit `verify_batch_archive.py` geprüft und entpackt; alle Prüfsummen OK.
- **Verarbeitungs-Replay auf .126:**
  - Antwortseite: `replyTurnV4` mit gespeicherter Extraktorantwort auf dem Original-Vorzustand, verglichen mit den gespeicherten Events.
  - Spielerseite: `prepareGenerationAsync` mit gespeicherten Planner-Antworten.
  - Board- und Forge-Antworten aus den `chat-completions.jsonl` des Runners.
  - Steuerzüge (Erstellung, `#`-Befehle) ohne LLM.
- Fold, Validierung und Größen aller 9 Runs aus Batch 17–19; Statistik zu Handel, Repairs und Populationsbindung aus den Originalrecords.

### Ergebnisse des Verarbeitungs-Replays auf .126

Gegenüber Abschnitt 3.5 meines früheren Reviews ist das neu: Damals hatte ich nur den .98-Lauf geprüft, jetzt die neun Runs aus Batch 17–19 und Batch 16.

| Batch (Originalbuild) | Antworten identisch | Spielerzüge (Planner) identisch | Board/Forge aus Logs | Steuerzüge |
|---|---|---|---|---|
| 19 (.125) | **268/273** | **295/295** | 7/7 | 24/24 |
| 18 (.123) | 336/369 | 380/382 | 4/6 | 30/30 |
| 17 (.122) | 306/353 | 282/356 | 6/14 | 41/41 |

- **Batch 19:** Die 5 abweichenden Antworten sind **genau** die Records 214, 218, 232, 272 und 376, also die beabsichtigte .126-Korrektur der Artvarianten. Korrekturzeilen, Systemzeilen und Ablehnungen reproduzieren 273/273.
- **Batch 18 und 17:** Die Abweichungen sind fast nur `entity.updated` (das in .124 hinzugekommene `anchor`-Feld), die Kröten als `entity.created` (.124) und `offer.created` (.123).
- **Batch 16, Record 78:** Auf .126 entsteht jetzt das 17-cp-Gebot (4 Felle + 9 Zähne). Das ist die .122-Geldkorrektur, punktgenau sichtbar.
- **Weitere Messwerte:**
  - `plan.raw` war in den 9 Runs **nie** abgeschnitten.
  - 0 Fold-Fehler; ein vollständiger Fold dauert bei 200 Eingaben höchstens 16 ms.
  - Gespeicherter Chat: 24–26 KB pro Eingabe.

### Natürliche Daten zu C und D

- **Paketfall Batch 18, Records 172/173:**
  - Das Panel zeigte „PRICE CONFIRMED — fine longsword and fine plate armor, the pair: 72 cp for 1“, hinterlegt war nur ein Rüstungsprofil.
  - Der Spieler stimmte „the pair“ zu und zahlte 72 cp. Das Objekt hieß „…, the pair“ mit Rüstungsprofil; „equip both“ wurde verweigert.
- **Preisprüfung vor Enginepreis:** In Batch 17–19 wurden 9 Angebotszeilen wegen eines nicht belegten Preises verworfen. **Mindestens 5 davon sind reguläre Ausrüstung** (Batch 18, Record 38: superior longsword und fine heavy plate; Records 232 und 316: Schilde; Batch 17, Record 300). Der neue Befund aus meinem Gegenreview tritt also natürlich auf.
- **Häufigkeit der Preiskorrektur:** `PRICE CONFIRMED` kam in Batch 18–19 **49-mal** vor; ein vom erzählten Preis abweichender Enginepreis ist also der Normalfall.
- **Populationsbindung:** In Batch 18 blieben beim Rogue 6 Kröten am Populationsort ungebunden, in Batch 19 beim Warrior 2 Wildschwein-Varianten. Die Fehlerklasse tritt also in zwei aufeinanderfolgenden Batches mit wechselnden Bezeichnungen auf.

---

## 2. Notwendige Korrekturen (priorisiert)

### K1 – A1: Vergleichsdefinition und Korpusaufbau konkretisieren

**Befund (Sonde):** Ein vollständiger Vergleich der serialisierten Events, ergänzt um `corrections`, `system`, `rejected` und `continuation` des Records, ist ausreichend und präzise. Ausgenommen werden müssen nur benannte Felder: `ms` und die Versionsstrings in `extract.applied` bzw. `cmd.interpreted`. Fachliche Einzelvergleiche nach Geld, Ort usw. sind nicht nötig, weil Events jede Zustandsänderung tragen.

**Harness-Fallen aus der Sonde:**

- Ausgeblendete Befehlszeilen (`is_system: true`) müssen beim Replay als sichtbare Spielernachricht eingesetzt werden. Sonst liefert `lastPlayerIndex` nichts, und alle Steuerzüge erscheinen fälschlich als „abweichend“.
- Board- und Forge-Antworten sind den Spielerzügen über die zitierte PLAYER MESSAGE im `plan`-Aufruf eindeutig zuzuordnen.

**Kleinster Weg:** Baseline = Ausgabe des Startcommits auf den Original-Vorzuständen von Batch 17–19 (+16), als Datei festgehalten. Ein reiner Umbau muss Abweichung 0 zeigen, eine beabsichtigte Änderung eine begründete Diffliste je Record.

### K2 – A3: Fold-Schutz auch im Fehlerpfad des World-Jobs

**Befund (statisch):** Wirft `runExtraction`, ruft der `failed`-Handler in `index.js` `applyExtraction(..., errorKind:'engine')` auf. Das schreibt `extract.failed`-Events und eine Fortsetzung in den Record – also eine Buchung. Ein Abbruch wegen eines Fold-Fehlers darf diesen Weg nicht nehmen.

Der Plan nennt seit `c036f3c` `prepareGenerationAsync`, `extractionRequest` und `applyExtraction`, aber nicht diesen Fehlerpfad.

**Kleinster Weg:**

- Der Fold-Fehler wird als eigener Ergebnistyp zurückgegeben, nicht als Exception. Der Record bleibt `pending`.
- Die Meldung nennt den ersten fehlerhaften Nachrichtenindex und die Eventart.
- Wiederherstellung: Nachrichten ab dieser Stelle löschen oder einen gültigen Stand neu laden.

### K3 – C: `entity.species` nicht überschreiben (Widerspruch zu Abschnitt 11)

**Befund (statisch):**

- Plan C3 sagt: „Ein Mitglied erhält die kanonische Art“.
- Die Rückkehr-Erkennung in `world.js:newEntity` (≈ Zeile 594) vergleicht exakt `normText(e.species) === normText(d.species)`.
- `species` hat rund 67 Leser (u. a. `world`, `guild`, `living`, `catalog`, `combat_truth`).

Würde die Art kanonisiert, wären zwei verschiedene Sauen derselben Population für diese Erkennung nicht mehr unterscheidbar. Das ist genau die Verschmelzung, die Abschnitt 11 verbietet. Zusätzlich ginge die Individualbezeichnung im Katalog für den Narrator verloren.

**Kleinster Weg:**

- Mitgliedschaft = `population_at` + Anker.
- Die kanonische Art wird bei Bedarf aus `places[population_at].population.species` abgeleitet; `entity.species` bleibt individuell.
- Gegenfälle: zwei Sauen mit getrennten Handles, eine kehrt verletzt zurück; dieselbe Sau als `wild boar` und `wild boar sow`.

### K4 – C: Populationsprüfung als semantisches Issue, nicht als Schemafehler

**Befund (statisch):** `parseExtraction` setzt `valid: errors.length === 0` (`extract.js` ≈ 336). Nach zwei schemaungültigen Antworten läuft `applyExtraction(null)`, und **die gesamte Welt der Antwort geht verloren** – auch Geld, Ankunft und Fakten.

**Kleinster Weg:**

- Unbekannte, fehlende oder ortsfremde Populationen laufen über den vorhandenen `issues`-Pfad (wie `sceneIssues`/`semanticIssues`).
- Dort gibt es einen Repair, danach eine Ablehnung nur dieses einen Deltas.
- Das Schemafeld bleibt ein String, kein ID-Enum.

### K5 – C: Abhängige Deltas einer abgelehnten Kreatur sperren

**Befund (statisch):** Die Sperre abhängiger Behauptungen gibt es nur für Personen (`blockedPeople`, `world.js` ≈ 291/826; Felder `s`/`who`/`from`/`by`/`holder`). Bei einer abgelehnten Kreatur fällt `idOf()` auf `makeResolver` zurück. Ein späteres `hostile`/`position`/`aware` mit derselben Referenz kann dann eine **andere vorhandene** Kreatur treffen.

**Kleinster Weg:** Abgelehnte Kreaturen-Referenzen, einschließlich Gruppenmitglieder, in dieselbe Sperrmenge aufnehmen.

**Gegenfall:** abgelehnter „wild boar tusker“ mit `hostile by` derselben Referenz, während ein anderer „wild boar“ anwesend ist.

### K6 – C: Echte Dungeons ausdrücklich ausnehmen

**Befund (statisch):** `lineage()` enthält auch Vorfahren außerhalb des Dungeons; `materialise` überspringt Populationen in echten Dungeons. Ohne Regel kann der Extraktor eine Dungeon-Kreatur an eine äußere Population binden.

**Kleinster Weg:** In `trueDungeonOf(...)` ist nur `independent` gültig; alles andere wird als Issue behandelt (siehe K4). Slot-Identität und Slot-Level bleiben unberührt.

### K7 – D: Angebotszeilen nennen die Engine-Vorlage

**Befund (Originaldaten Batch 18, Records 172/173):**

- Allein die Vorlagen-ID am Delta (D1) verhindert den Paketfall nicht. Die Zeile behielt den Paketnamen, Anzeige und Objekt ebenso; Zustimmung und Equip liefen über diesen Namen.
- Ohne weitere Regel könnte der Extraktor einen Paket-Text wieder einer einzigen `base` zuordnen.

**Kleinster Weg:**

- Genau eine `base` pro Zeile (Schema).
- Panel, `PRICE CONFIRMED`-Zeile und Objektname zeigen den Vorlagentitel und die Werte; der Narratorname bleibt nur Beschreibung.
- Damit sieht der Spieler vor der Zustimmung, dass nur eine Rüstung angeboten wird.

### K8 – D: Bedingung für Käufe im selben Zug neu festlegen

**Befund (statisch + Daten):**

- Heute bricht `offerLines` einen vorab begrenzten Kauf ab, sobald der Gearpreis korrigiert wurde („NOT BOUGHT — the gear price was corrected“, `world.js` ≈ 2567).
- Mit „Enginepreis zuerst“ ist praktisch jede erzählte Gearsumme eine Korrektur (49-mal in Batch 18–19).
- Bliebe die Regel, würden bedingte Käufe faktisch nie ausgeführt – im Widerspruch zur Entscheidung, sie zu erhalten.
- Entfiele sie einfach, würde `any_price` einen unerwarteten Enginepreis abbuchen.

**Kleinster Weg:**

- Im selben Zug wird nur gebucht, wenn ein ausdrückliches `max_cp` mindestens dem Engine-Gesamtpreis aller gewählten Zeilen entspricht.
- `any_price` bucht bei Abweichung vom erzählten Preis nicht automatisch; das Angebot bleibt offen (bisheriges Verhalten).
- In Batch 17–19 trat der Konflikt nie auf (0 Fälle), also genügt eine Regression.

### K9 – B/C: Versionsschutz ohne neues Feld

**Befund (Daten):** Alle 9 aktuellen Runs tragen identische Startmetadaten:

- V4, Pfad C, Ruleset 2
- alle F-Flags gesetzt, keine Privatquests
- dazu `engine_version`

**Kleinster Weg:**

- **B** sperrt Kampagnen, deren `campaign.started` diesen Satz nicht trägt. Das ist die erste echte Grenze, weil B die Flags zur Produktregel macht.
- Sollen laufende .126-Kampagnen ab C ausgeschlossen werden (Jagdverträge auf Jungtiere ohne strukturiertes Feld, geänderte `population_at`-Bedeutung), genügt ein Vergleich mit einem bewusst gesetzten Mindest-Startbuild über das vorhandene `engine_version`.
- Keine neue Kennung, keine Migration. Damit ist die offene Planfrage „bei welchem Paket entsteht die erste Grenze“ beantwortet.

---

## 3. Streichbar oder vereinfachbar (auch eigene frühere Empfehlungen)

| Vorschlag | Bewertung |
|---|---|
| **A2** – vollständige `plan.raw` und Board-Antworten zusätzlich in den Records speichern | **Streichen.** Die Runner-Logs reichen: 0 abgeschnittene Antworten, Board/Forge zuordenbar. Records wachsen nicht. Nur nachrüsten, falls ein konkreter Korpusfall keine Logdeckung hat. Meine eigene frühere Empfehlung ziehe ich zurück. |
| **A1** – zweite Ebene „zusammenhängende Zugkette“ | **Streichen.** Bei reinen Umbauten folgt sie aus „lokales Replay jedes Schritts identisch + Fold + `validateState`“. Bei beabsichtigten Änderungen ist sie ungültig, weil die aufgezeichneten Antworten auf alte Zustände verweisen (Batch 16, Record 78 ändert alle Folgezustände). |
| Neue Kompatibilitätskennung | Ersetzt durch K9. |
| Pflichtfeld als Schemafehler und „Mitglied erhält kanonische Art“ (meine frühere Formulierung) | Zurückgezogen, siehe K4 und K3. |
| Kill-Credit-Events | Bleiben gestrichen. `population_at` hat genau einen Leser (`guild.areaOf`); die Neudefinition ist lokal. In 16 Testdateien muss das Feld bei C gesichtet werden. |
| Fold-Cache, Save-Verschlankung, Prompt-/Modellumbau, Reise-/Szenenumbau | Bleiben zurückgestellt; die Daten bestätigen das (≤ 16 ms pro Fold, 24–26 KB pro Eingabe, Extraktor-Repairs ≈ 7 %). |

---

## 4. Prüffragen des Auftrags – Kurzantworten

1. **A/B:**
   - Die Testbasis reicht mit K1: Abdeckung in Batch 19 nahezu vollständig, einschließlich Board, Forge und Steuerzügen.
   - Die Fold-Erkennung braucht zusätzlich K2.
   - Der Versionsschutz ist ohne neues Feld ausreichend (K9).
   - Sicherheitsregressionen bleiben erhalten, wenn B auf dem Korpus Abweichung 0 zeigt. Alle Korpusruns tragen die aktuellen Flags, B darf dort also gar nichts ändern.
2. **C:** Die Trennung von Population, Alter, Level und Credit gelingt mit `population_at` als reiner Mitgliedschaft (Abschnitt 11) – aber nur mit K3–K6. Ungültige Referenzen werden nicht unabhängig, Jungtiere bekommen keine Erwachsenenstärke, Fernsichtungen nutzen den Ereignisort. Echte Dungeons brauchen K6.
3. **D:** Vorlage, Qualität und Preis laufen über das vorhandene `offer.created` und `bookPurchase`. Paketfall und Namensprofil werden erst mit K7 sicher verhindert; Zustimmung im selben Zug ist erst mit K8 sauber definiert.
4. **E/Abnahme:**
   - Der C-Pfad nutzt weiterhin aktiv `delta.reportToEvents`; das zeigen 21–37 `world_rule`-Ablehnungen pro Batch.
   - Ebenso genutzt werden Teile von `interpret.js` (Planner-Prompt, `amountErrors`), `intent.js` (Erstellung, Befehle, `mentionedSkills`) und `engine.playerTurn` bzw. `combat.js`.
   - Für Board und Forge fehlen keine Daten, sie stecken in den Runner-Logs.
   - Die Abnahme unterscheidet reine Umbauten und Verhaltensänderungen korrekt, wenn die Baseline auf dem Startcommit liegt (K1). Gegen alte Builds überdeckt das harmlose `anchor`-Feld jede echte Differenz.

---

## 5. Bestätigte bzw. korrigierte Reihenfolge

**A → B1 → C ∥ D → F;** B2 läuft parallel; E folgt nachgelagert und blockiert F nicht.

- **B1** = F-Flags und Jahrlingsoption. Abschnitt 11 erlaubt C/D unabhängig von einem vollständigen B; für **B1** halte ich das nicht für richtig. Genau die Stellen, die C und D ändern, hängen an diesen Flags:
  - `materialise`/`populationAt`/`areaLevels` an `s.meta.f_progression`
  - der Retail-Preis in `offerLines` an `cPath && s.meta.f_balance`

  Ohne B1 müsste dieselbe Logik doppelt geschrieben werden.
- **B2** = Privatquest-Zweige, unabhängig von C/D.
- **Abnahme je Paket über das Replay aus K1:**

  | Paket | Erwartete Abweichung auf dem Korpus |
  |---|---|
  | B | 0 |
  | C | nur `creature.new`- und Materialisierungs-Records, jeweils begründet |
  | D | nur Angebots- und Kauf-Records, jeweils begründet |

  Den Vereinfachungsgewinn nach Abschnitt 11 aus dem Diff und dieser Liste berichten.

---

## 6. Optional (keine Voraussetzung)

- **Evaluator-Diagnose in beiden Richtungen:** zusätzlich „unabhängig, aber gleiches Namenswort wie die lokale Population“. Das fängt das alte Symptom (ungebundenes Wildschwein) auch nach C auf.
- **Pakete zusätzlich absichern:** über das vorhandene `gearKindOf` eine Zeile mit zwei Ausrüstungsarten erkennen – nur falls K7 im natürlichen Batch nicht reicht.
- **In F beobachten statt jetzt ändern:**
  - Szene/Ankunft bleibt die häufigste Extraktor-Repair-Ursache, bei niedriger Quote.
  - In Batch 19 betraf etwa die Hälfte der Planner-Repair-Meldungen die Handelszustimmung (`offer.accept`).
