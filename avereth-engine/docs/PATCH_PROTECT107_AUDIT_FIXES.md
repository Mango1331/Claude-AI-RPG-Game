# Schutzpatch nach dem technischen Audit — Build .107

Basis `.106` / `75a4366`. Grundlage: unabhängiger Code-Audit von `.100`–`.106`, GPT-Gegenbewertung und die daraus abgestimmte Freigabe vom 28.10.2026. Ein zusammenhängender kleiner Patch; keine Architekturänderung, keine Combat- oder Balanceanpassung, kein natürlicher GLM-Lauf.

Ziel: nachweislich falsche mechanische Änderungen verhindern, ohne die Erzählung mit vorsorglichen Ablehnungen einzuschränken. Jede neue Prüfung fällt im Zweifel auf den bestehenden sicheren Zustand zurück: Alaric bleibt, wo er war; eine Figur gilt als nicht anwesend; die Erzählung läuft weiter.

## Änderungen

### 1. Unfreiwillige Ortswechsel (`arrive.forced_by`)

**Vorher:** Jeder nichtleere `forced_by`-Text erlaubte auf dem C-Pfad einen Ortswechsel ohne GO, auch ohne jeden Bezug zur Erzählung (Audit-Sonde: Blackwater Landing → beliebiger Katalogort außerhalb von Dungeons).

**Jetzt:** `forced_by` muss ein **wörtlicher Satzteil der Erzählung** des Replies sein, der eine tatsächlich stattfindende Verlagerung Alarics zeigt (`src/v4/narration_evidence.js`, `forcedRelocation`). Abgelehnt werden:
- gesprochene Worte (Drohungen, Pläne und Angebote stehen in Anführungszeichen),
- verneinte, geplante oder hypothetische Bewegungen (*not, never, nearly; would, could, if, threatened, tried to …*),
- Erinnerungen und Vorstellungen (*remembered, thought, imagined, years ago …*),
- Hörensagen (*heard, rumour, letter, said that …*),
- Sätze ohne Verlagerungswort.

Geprüft wird das Zitat zusammen mit dem, was in seinem eigenen Teilsatz davorsteht („He remembered how …“). Ein vorangestellter eigener Teilsatz („Before he could react, two men seized him …“) bleibt unschädlich.

Ein unbelegtes `forced_by` gilt als nicht vorhanden. Die bestehende GO-Regel der Firewall (`no_go`) greift mit ihrer Korrektur, das gemeldete Delta bleibt im Audit unverändert. Dungeon-, Tor- und Siegelregeln (`wayRefused`) sind unverändert und gelten bei belegter Verlagerung wie bisher.

**Bewusste Grenze:** Eine Paraphrase statt eines Zitats wird abgelehnt. Für Alarics Aufenthaltsort gibt es keinen Rückfall auf einen Satzscan, weil ein beliebiges „pulled/carried“ im Text zu schwach wäre. Der Extractor-Prompt verlangt das Zitat ausdrücklich. Gilt auf dem C-Pfad beider Regelstände (ausdrückliche Legacy-Wirkung für C-Kampagnen mit Regelstand 1); V3 und V4-A unverändert.

### 2. Ankunft und Anwesenheit bekannter Personen

**Vorher:** `enter`, `position` und `aware` holten jede bekannte lebende Person in die Szene, auch eine zuletzt in einer anderen Stadt gesehene. Nur `person.new` hatte die Kontinuitätsprüfung.

**Jetzt** (Regelstand 2, C-Pfad):
- `position` und `aware` beschreiben nur Anwesende. Eine bekannte, abwesende Person wird damit nicht hereingeholt (`npc_presence`); Anwesende derselben Angabe werden normal verarbeitet.
- `enter` einer bekannten Person, die weder anwesend noch an diesem Ort verzeichnet ist, braucht eine erzählte Ankunft oder Anwesenheit (`presenceInReply`):
  - das neue optionale Feld `enter.evidence` (wörtlich), **oder ersatzweise** ein Erzählsatz des Replies, der die Person nennt;
  - jeweils mit denselben Ausschlüssen wie oben, und mit mehr als nur dem Namen.
  - Handeln oder Sprechen am Ort genügt ohne das Wort „betreten“ („said the gate guard, leaning on the rail“).
- Der Ersatz über die Erzählsätze verhindert, dass ein vergessenes Feld legitime Rückkehrer kostet. Alle bestehenden Originalfälle (Batch 2 `004_24`/`005_26`, Run 13, Run 14) bestehen damit **ohne Testanpassung**.
- Es gibt keine Entfernungs- oder Siedlungsregel, NPCs reisen selbständig. Eine an diesem Ort verzeichnete Person kommt wie bisher ohne Beleg zurück (wie bei `person.new`).
- **Kreaturen**, Gruppenauftritte und Verstärkungen von Monstern, Regelstand 1 und V3 bleiben unverändert.
- Ein abgelehntes `enter` sperrt die abhängigen Angaben dieses Replies zu dieser Person, sonst würde sie über diese Angaben doch als anwesend behandelt. Ein belegtes `enter` hebt wie bisher eine vorherige Sperre aus einer abgelehnten Wiedereinführung auf.

### 3. Identität: abgelehnte Namenserweiterung

**Vorher:** Ein abgelehntes `person.new` (z. B. „Corr Hallam“ für den anwesenden Corr) sperrte auch die echte ID. Gültige `attitude`-/`memory`-Angaben zum anwesenden Corr gingen verloren.

**Jetzt:** Gesperrt werden nur die abgelehnte neue Referenz und der neue Name; eine bekannte Person nur, solange sie abwesend ist. Die Textprüfung für `memory`/`thread` gilt ebenfalls nur für nicht anwesende gesperrte Personen. Angaben über den abgelehnten Namen bleiben gesperrt, Folgeangaben zu einer abwesenden Person bei abgelehnter Wiedereinführung ebenso.

### 4. Persistenzsperre chat-gebunden (`index.js`)

SillyTavern 1.19 benutzt für alle Chats dasselbe Array und füllt es beim Wechsel neu. Die Sperre speichert jetzt **Chat-ID, Index und Nachrichtenobjekt**; der Array-Vergleich bleibt als zusätzliche Sicherung.
- Ein fremder Chat wird weder blockiert noch gibt er die Sperre frei.
- Im ursprünglichen Chat werden bei unveränderten Records genau diese geprüft.
- Nach einem erneuten Öffnen (Records frisch von der Platte gelesen, die ungespeicherten sind auch aus dem Speicher verschwunden) werden die Records bis dahin so geprüft, wie sie jetzt sind.

### 5. Preise und Mengen

Nur die drei nachgewiesenen Fehlklassifikationen:
- „five silver and not a copper less“: „not a copper“ nennt keinen eigenen Betrag (`economy.js`).
- „one silver five a night“: Kurzform vor einer Rate.
- „two silver a fair deal“: eine Bewertung, kein Stückpreis (`trade.js`).

Der Repair-Hinweis bei einem Stückpreis ohne `qty` nennt den Betrag für eine Einheit **zum genannten Satz** und bittet um die Menge. Er behauptet nicht mehr „qty 1“. Keine neue Ablehnung: ein normaler Kauf einer Einheit bleibt ohne `qty` gültig.

### 6. Verständliche Nichtausführung

`NOT EXECUTED — planner failed (…)` nennt einen Grund nur, wenn die Planner-Validierung ihn tatsächlich festgestellt hat:
- „price or quantity unclear“,
- „the action could not be matched to the exact words“,
- „the target is unclear“,
- „the planner received no answer“ (alle Aufrufe gescheitert; ohne Providerdetails).

Sonst bleibt die Meldung allgemein (`notExecutedCause`).

### Extractor-Anweisung und Versionen

- `content/deltas.json`: `enter.evidence` (optional), präzisierte Regeln zu `forced_by` und Personenkontinuität; Vokabular `delta-1.7`, `EXTRACTOR_VERSION` `extract-5.16`.
- Build `4.3.0-c.6.6.107`. Narrator-Kartenvertrag unverändert (`.85`), keine Kartenaktualisierung nötig.
- `tools/p0/s2_deltas.mjs`: Die Ergänzung des Felds `equipment` im P0-Mock gilt für Produktvokabulare ab `delta-1.6` statt nur genau dieser Versionsnummer.

## Tests und Abnahme

- **25 neue Regressionen** in `tests/v4/patch_protect107.test.js`. Gegen unverändertes `.106`: **17 rot, 8 grüne Kontrollen**:
  - legitime Flut und Verschleppung;
  - legitime Ankunft und Ankunft durch Sprechen;
  - Rückfall ohne Zitat;
  - zurückkehrende Kreatur;
  - abwesende Wiedereinführung;
  - Preiskontrollen.
- Negativfälle:
  - Name nur erwähnt, Ankunft verneint, Hörensagen;
  - Drohung in Rede, geplante Bewegung, Erinnerung, Paraphrase statt Zitat;
  - ungültige neue NPC-Referenz;
  - unbelegte Umgehung nach abgelehnter Wiedereinführung;
  - Chat A → B → A mit fehlgeschlagenem Save und Wiederherstellung;
  - ein Grund wird nur genannt, wenn er gefunden wurde.
- Nach dem Patch **25/25**. Zwei bestehende Tests angepasst:
  - Run 12 verlangte, dass ein in der Prosa nicht vorkommendes `forced_by` Alaric bewegt. Das ist genau die geschlossene Lücke. Der Test prüft jetzt beides: unerzählt bleibt Alaric, erzählt wird er verlagert.
  - `fixes_4_1_5` erwartet die neue Extractor-Version.
- Vollständiges **`npm test -- --test-concurrency=4`: 2128/2128 grün**.
- **Echter ST-1.19-Smoke** mit geskriptetem Provider auf `.107`:
  - Standard **22/22**, fünf Extraktionen.
  - Erweitert (`AVERETH_SMOKE_FAILSOFT=1`) **27/27**, sieben Extraktionsaufrufe einschließlich absichtlichem Fehler/Repair: sichtbare Nichtausführung, gespeicherter Fehlerrecord, terminaler Extractorfehler, keine doppelte Kampfbuchung, erkannter Save-HTTP-500.
  - Keine unerwarteten PageErrors.
- Kein natürlicher GLM-Lauf; ein Mock-Smoke ist kein natürlicher Nachweis.

## Grenzen

- Die Belegprüfung ist eine enge wörtliche Prüfung mit kurzen Wortlisten, kein Textverständnis.
- Ein Erzählsatz ohne Ausschlusswort, der eine abwesende Person nur beschreibt („Brast lived in Ashbridge“), kann über den Satz-Rückfall noch als Anwesenheit gelten. Das ist bewusst in Kauf genommen, damit legitime Rückkehrer nicht verschwinden.
- Umgekehrt kann eine ungewöhnlich formulierte echte Verlagerung abgelehnt werden. Alaric bleibt dann am Ort, die nächste Korrektur sagt es.
- Der natürliche Batch zeigt, wie oft `npc_presence` und `no_go` mit unerzähltem `forced_by` vorkommen und ob dadurch legitime Szenen fehlen.
