# Architekturpatch Etappe C (.132) – ausdrückliche Population, Alter und Jagdidentität

Build **`4.3.0-c.6.6.132`** auf dem Produktbranch, Grundlage `cc71256` (.131). Verbindlicher Plan:
`patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md` (main), §5 C1–C3 und §8. D ist nicht begonnen.
Vertragsversionen: Delta **`delta-1.10`**, Extraktor **`extract-5.21`**; Narratorkarte unverändert.

## C1 – Zugehörigkeit und Fehlerbehandlung

- `creature.new` hat zwei neue optionale Stringfelder (`content/deltas.json`): `population` (Orts-ID einer bestehenden
  Population oder `"independent"`) und `life_stage` (`"adult"`/`"young"`). Im Transport optional (fehlend = `null`),
  kein ID-Enum; fachlich geprüft von **einer** Regel, `creatureContract` (`src/v4/population.js`):
  - außerhalb echter Dungeons sind beide Angaben erforderlich; `population` muss am bestätigten Ereignisort oder einem
    Vorfahren liegen und denselben Körperplan haben (der Populationsanker ist kanonisch: GiantBoar ≠ Turtle);
  - entfernte Sichtung (`present:false`): geprüft an dem Ort, den ihre `scene` nennt; ohne bekannten Ort nur
    `"independent"` – nie der Ort des PC;
  - neu angelegter Ort im selben Bericht: geprüft an seinem bekannten Elternort;
  - echter Dungeon: keine Außenpopulation (auch nicht über äußere Vorfahren); fehlend/`independent` = keine;
    Living-Slots unverändert.
- **Parser** (`parseExtraction`): Verstöße sind semantische `issues` → die vorhandene eine Reparatur (kein neuer
  Retrykreis). Echte JSON-/Typfehler bleiben Schemafehler.
- **World** (`newEntity`): nach erfolgloser Reparatur wird die Kreatur abgelehnt (`population`), mit Korrektur an den
  Narrator; unabhängige gültige Deltas (Ankunft, Fakten, Geld) bleiben. Eine ungültige Population wird nie zu
  `independent` umgedeutet; im neuen Protokoll keine Namenszuordnung mehr.
- Extraktorkatalog: `PLACE ANCESTRY` nennt Populationen mit ID, Art, Körperplan und Fenster (bestand bereits);
  Prompt-Regel und Feldbeschreibung neu.

## C2 – Datenbedeutung, Stärke und Questcredit

- Bei Erzeugung bucht World `entity.updated {life_stage, population_at}`: **Zugehörigkeit unabhängig vom Level**
  (vorher setzte `materialise` `population_at` nur innerhalb des Fensters). `species` bleibt die individuelle
  Bezeichnung; Art/Anker der Population kommen aus `places[population_at].population`.
- `materialise`: Erwachsene erhalten das Populationsfenster; Junge nie das Erwachsenenfenster (bestehende Ausnahme:
  eine Population, die selbst aus Jungtieren besteht). Explizite Individuen-/Dungeonvorgaben behalten Vorrang.
  Records ohne `life_stage` (vor .132) behalten die alte Lesart.
- Jagdvertrag: Der Generator nennt `habitat.life_stage` (fehlend = adult); `habitatWhy` prüft es gegen das
  Kopfnomen des DEFEAT-Ziels („wolf pups“ → young; „the lamb-rending wolf“ → adult). Gebucht als `quest.hunt.age`.
- `defeatTally` für Populationsjagden: Zugehörigkeit + Vertragsalter + Fenster (für Erwachsene) + Tod/Flucht seit
  Annahme; **kein Artnamen-Abgleich mehr**. Ein ausdrücklich schwächeres erwachsenes Mitglied bleibt Mitglied, gibt
  aber keinen Credit. Ältere Verträge ohne `age`: Erwachsene, Junge nur wenn das Ziel sie nennt (alte Lesart).
  Keine Kill-Verbrauchsereignisse; Dungeon-/Personenziele unverändert.

## C3 – Individuen, Gruppen, abhängige Behauptungen

- Bestehende Identitätspfade (Handles, Gruppenref, `more`, Rückkehr) unverändert; Population bezeichnet nie ein
  Individuum (Regressionen: zwei Sauen getrennt, verwundete Sau kehrt mit ID und HP zurück, Gruppe wächst).
- Lokale Referenzsperre für Kreaturen (`blockedCreatures`): Ref (und nummerierte Gruppenmitglieder) jeder in diesem
  Bericht abgelehnten `creature.new` (Population, `group_unclear`, `dungeon_foe`, `dungeon_slot`, Firewall); spätere
  Deltas mit dieser Ref in `by/who/s/from/holder` (hostile, position, aware, intent, Fakten …) → `creature_continuity`,
  nie per Resolver auf eine andere Kreatur.

## Versionsgrenze (Plan §4)

`CONTRACT_SINCE = 4.3.0-c.6.6.132` ist der neue Mindest-Startbuild (`campaignSupport`). Abgelehnt: die
.126-Konfiguration (Schalter) und schalterlose Kampagnen von .130/.131 („started before the population and age
contract“). Keine Migration, kein neues Feld.

## Abnahme

- **Verarbeitungskorpus** (`npm run replay:check`, .126-Baseline `b8d2af4` + begründete Liste
  `tests/replay/accepted_c132_vs_126.json`): **2.235 Fälle, 142 abweichend, alle 142 akzeptiert, 0 nicht akzeptiert,
  0 akzeptiert-aber-gleich**; 0 Replay-, Fold- und Validierungsfehler. Alte Antworten werden transparent umgerechnet
  (`tools/replay/contract_c.mjs`: `life_stage` nach .126-Jungtierwörtern, `population` nach der .126-Namenszuordnung
  am Ereignisort, sonst `independent`; Archive unverändert). Aufschlüsselung:
  - **140 Darstellung ohne mechanische Folge:** Mitgliedschaft/Alter beim Erzeugen gebucht, `quest.hunt.age`,
    umgerechnete Felder in einem schon in .126 abgelehnten `creature.new`.
  - **1 Ablehnungsgrund** (b18-warrior#202): ein schon in .126 abgelehntes `aware` fällt jetzt unter die Sperre.
  - **1 mechanisch, beabsichtigt (C3)** (b17-rogue#200): die abgelehnten Glaskäfer (`dungeon_foe`) übertragen ihr
    `aware` (scope all) nicht mehr auf einen vorhandenen Begegnungskäfer.
  - Keine Abweichung bei Level, Anker, Credit, Geld, Zeit, Quests.
- **Neue Regressionen** `tests/v4/c132_population.test.js` (14): stag/hind/alpha/tusker ohne Wortlisten (alte
  Namenslesart hätte sie verfehlt); fremde/unbekannte/fehlende/unklare Angaben; `independent`; Fernsichtung;
  GiantBoar≠Turtle; echter Dungeon samt äußerer Vorfahren; adult/young mit eigenem Level und getrenntem Credit;
  Tod vor Annahme; schwaches erwachsenes Mitglied; Jagdalter bei Veröffentlichung; zwei Sauen und verwundete
  Rückkehr; Gruppenvergrößerung; abgelehnter Tusker + `hostile`/`aware` bei anwesendem Boar; Ablehnung neben
  gültiger Ankunft/Fakt; Parser-Issues statt Schemafehler; Runtime-Reparatur, Reload, erneute Anfrage, Swipe.
  **Rot auf `cc71256` (.131): 12 von 14; grün: die zwei Kontrollen bestehender Identitätspfade.**
- **Originalfälle** als C-Regressionen umgeschrieben: Batch19 214/218/272 (`patch126_species_variants`), Batch18
  Schildkröten 42/140 und GiantBoar (`patch124_territories`).
- **Volle Suite** **2481/2481**. **Chromium-Mock-Smoke** OK. **Echter SillyTavern 1.19.0** `smoke:st:c` OK und
  Failsoft OK (Build .132; gespeicherte Chats enthalten die `life_stage`/`population_at`-Records).

### Testanpassungen (je begründet)

- Harness (`Chat4.wireAnswer`) und direkte `applyWorld`-Tests mit **Originalantworten** (Run12/16/17/18/21, 99,
  Batch10): dieselbe dokumentierte Umrechnung (`contractValue`); ausdrücklich angegebene Felder bleiben.
- Tests der alten Namensbindung als C-Regressionen mit ausdrücklicher Mitgliedschaft umgeschrieben (s. oben);
  F-Progression-Tests geben Population/Alter an; Batch10 prüft `population_at` am Entity statt am Profilereignis.
- Versionspins: `extract-5.21`; B1-Wächtertests für die neue Grenze; Replaytests gegen .126 + akzeptierte Liste;
  Fold-Test A2 vergleicht mit dem ungestörten Lauf desselben Builds; ST-Smoke-Mockantwort im aktuellen Vertrag.

## Vereinfachung (Plan §8.8)

Ersetzt im aktuellen Protokoll: Namensrekonstruktion der Population in `newEntity`/`materialise`, levelabhängige
`population_at`, Artnamen-Abgleich (`cullKind`) für Populationsjagden, Altersableitung aus Wörtern des Ziels.
Verbleibende Ausnahmen: Records ohne `life_stage` und Verträge ohne `age` (vor .132; Kampagnen ohnehin abgelehnt)
behalten die alte Lesart; `populationAt` dient nur noch dieser und der Offline-Umrechnung.

## Grenzen

Eine formal gültige, aber fachlich falsche Populationswahl bleibt als Modellfehler möglich (kein Prosa-Veto);
im natürlichen Batch (F) beobachten.

## Reviewkorrektur – Freigabe nur für die exakt geprüften Ergebnisse

Befund des Gegenreviews bestätigt: `--accepted` filterte Abweichungen bisher nur nach Record-ID; jede weitere
Änderung innerhalb eines der 142 freigegebenen Records (Geld, Quest, Events) wäre unbemerkt durchgegangen.

- `tests/replay/accepted_c132_vs_126.json` (Format `avereth-replay-accepted-2`) trägt je Record zusätzlich einen
  **Fingerprint**: SHA-256 des vollständigen normalisierten Recordoutputs von Build .132 (alle Events wie im Vergleich
  normalisiert, `corrections`, `system`, `rejected`, `continuation`, Extraktionsstatus, Aktion, Fehler; kanonisches
  JSON mit sortierten Schlüsseln). Kategorien und Begründungen sowie die .126-Baseline bleiben unverändert.
- `tools/replay/replay.mjs`: `recordFingerprint`, `acceptedDiffs`. Ein gelisteter Record ist nur mit genau diesem
  Output freigegeben; jeder andere Output ist eine offene Abweichung (`accepted_record_changed` mit erwartetem und
  aktuellem Fingerprint), ein Record ohne Fingerprint gibt nichts frei, ein gelisteter Record ohne Abweichung bleibt ein
  Fehler (`accepted_but_equal`). `--write-fingerprints` schreibt sie nach einer geprüften, beabsichtigten Änderung neu.
- Nachweise:
  - Fingerprints aus einem vollen Replay geschrieben und von einem zweiten, unabhängigen vollen Replay exakt bestätigt:
    `npm run replay:check` → **2.235 Fälle, 142 abweichend, 142 mit exaktem Output freigegeben, 0 offen, 0 gleich**.
  - Neuer Test `tests/replay/replay.test.js` („C review: …“): in bereits freigegebenen Records zusätzliches
    `coin.changed`, geänderte Questbelohnung, geändertes Jagdalter, entferntes und umgeordnetes Event, zusätzliche
    Korrektur → jeweils offene Abweichung; gleicher Output in anderer Schlüsselreihenfolge bleibt freigegeben.
    **Rot mit der Freigaberegel von `8908850` (nur Record-ID), grün mit Fingerprints.**
  - Volle Suite **2482/2482**.
