# Avereth Engine – unabhängiger Tiefen-Gegenreview Build .187

**14.11.2026 · GPT · Produktcode unverändert.**

**Referenzen:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Ausgangs-Produktstand `.186` `13824919a85042184d7ced2fc2ca783bf6cf7103` mit Test-Sandbox-Schutzstand `24d2aa955f400d598c234b4527c7a04993fa8309`; drei Etappen `568d905`, `a5d02c1` + `92593fd`, `c567e97`; Releasecommit `5b4d493fda26811bb267bbff9adf174b797b971d`; ST-Ergebnis **nur dokumentiert** in `bd52d2f9a002c62e321634ae1e8894fefd3918f6`. [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd52d2f/avereth-engine/docs/BATCH186_FIXES_187.md).

**Anlass:** [Opus-Gegenreview .186](../testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md), [GPT-Originalreview einschließlich §9](../testrun_10b/npc-20261114-094810Z/REVIEW.md), [Architektur-/Budget-Einordnung §12.4](../recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md), [Arbeitsweise](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md).

## 1. Prüfmethodik und Beweisgrenzen

**Tatsächlich unabhängig eingesehen:** GitHub-Compare `24d2aa9..5b4d493` (fünf Commits), die geänderten Produktionsdateien `content/deltas.json`, `src/v4/trade.js`, `commands.js`, `world.js`, `planner.js`, `runtime.js`, die drei neuen Tests `fix187_paid_work`, `fix187_way_back`, `fix187_planner_ran_out`, `replay.test.js`, die beiden echten JSON-Akzeptanzlisten und `tools/model_budget_report.mjs`. Weiterhin den **vollständigen tatsächlichen Nutzerupload** `npc-batch-20261114-094810Z.zip` (42.840.256 Bytes, SHA-256 `e5e0ed23cc5016f75bd7a4d27523f3eef76b9c9b88b2686cd380a3f8cc0e4485`) direkt geöffnet, Warrior-Chats #113–#123 und alle drei vollständigen `calls.json` unabhängig nachgerechnet. Eng isolierte Ausdrucksproben wurden aus den **exakten Regex-Ausdrücken der Produktdateien** ausgeführt; das ist **kein Hosttest**.

**Nicht selbst ausgeführt:** `npm test`, die Produkt-Hosttests, vollständiger 2235-Fall-Replay gegen den tatsächlichen Engine-Fold oder der ST-Smoke. Der vorhandene GitHub-Connector stellt Quelltexte bereit, hier aber keinen ausführbaren Repository-Checkout; die angegebene lokale Containerumgebung hat keinen Zugriff auf github.com. **Berichtete Testläufe** und **selbst verifizierte Codesemantik/JSON-Struktur** werden im Folgenden nicht gleichgesetzt.

## 2. Gesamturteil / Entscheidung

**Der beauftragte Kern ist umgesetzt und technisch nach Implementiererbelegen erfolgreich abgenommen.** Die anfängliche **−14-cp-Fehlbuchung durch als Kauf gemeldete Eigenarbeit** wird im konkret reproduzierten Fall sowohl am eintreffenden Angebot als auch an einem bereits vorhandenen Angebot gestoppt. Die spezielle Warrior-`move away`-Lücke wird entlang des bestehenden Rückwegs geschlossen, ohne die Event-Firewall für `arrive` aufzuweichen. Eine leere Planner-Antwort mit `finish=length` bekommt nun eine fachlich passende, begrenzte Reparaturanweisung bei unveränderten Token- und Aufrufgrenzen. Das sind sinnvolle und auf die Befunde beschränkte Änderungen.

**Zwei konkrete, bisher nicht getestete Negativfälle sind bei dieser Detailprüfung aufgefallen:**

1. **R1/P2 – als Kauf angebotene NPC-Jagddienstleistung kann zu Unrecht blockiert werden.** `paidWorkLine` erkennt anhand des **Ziels** „für das Dorf“ vermeintlich Arbeit Alarics, auch wenn der Anbieter klar sagt, **er selbst** werde die Tiere für das Dorf töten und Alaric solle ihn dafür bezahlen. Das ist eine **deterministische Fehlklassifikation der neuen Regex-Regel**. Am Angebotsrand gibt es keinen Gegenbeleg zur Akteursrichtung. Noch **kein** natürlicher Hostschaden dieser Art dokumentiert.
2. **R2/P2 (Spielerhoheit)** – eine bloße kurze Rückwärtsbewegung auf einem Weg kann bei `LONG` und nichtleerer Ortschronik als **volle Rückreise** auf den zuvor besuchten Ort gemappt werden, selbst wenn der Spieler „nur einen Schritt“ oder „ich bleibe hier“ sagt. Die neue `BACK_WAY`-Regex ignoriert solche expliziten Begrenzungen. Diese Konstellation ist am Codepfad und in der isolierten Regex-Probe belegt; sie wurde **nicht** selbst durch den vollständigen Host gefaltet.

**Empfehlung:** Kein erneuter Großpatch und kein Generalumbau. Vor einem langen neuen natürlichen Batch genau R1 und R2 als kleine **negative Hostregressionen** gegen `.187` laufen lassen. Bei bestätigten Fehlbuchungen/-reisen nur den verursachenden Guard eng korrigieren. Der bereits erfolgreiche `.187`-Standard-/Failsoft-Smoke muss für eine rein begrenzte, hostneutral geprüfte Regelkorrektur nicht unnötig vollständig neu durchlaufen werden, falls tatsächlich keine Host-/Vertragsänderung erfolgt. Die Nutzerentscheidung kann ebenso lauten, die Grenzen bewusst zunächst zu beobachten; dann nicht pauschal „alle Arbeitsrichtung und jede Rückbewegung sicher“ behaupten.

**Abnahmestatus:** technische **bedingte Freigabe** von `.187` mit den zwei präzisen Gegenfallprüfungen und ohne natürlich bestätigte Modellwirkung. Keine Indizien für einen neuen flächigen Integritätsverlust im vorliegenden Replay.

## 3. Etappe 1 – Arbeit ist keine Kaufdienstleistung (`568d905`)

### 3.1 Der echte Ursprung

Die unabhängigen Originale zeigen:
- Rogue #116: Küfer nennt 14 Kupfer als **Belohnung** für Alarics Jagd; Extractor meldete `offer` (`seller=cooper`, `kind=service`, `service=other`, `what="kill the gander … for the village"`).
- Rogue #117: Planner nimmt dieses als Kauf formulierte Angebot per `offer.accept` an; alte Engine bucht `transaction.completed`, `coin.changed −14` (40 → 26 cp).
- Der Fehler ist **nicht** ein falsch implementierter Negativbetrag in `bookPurchase`, sondern eine falsche Transaktionsart und die bis `.186` zu enge, vorhandene Schutzprüfung. Die spätere `coin.gift`-Ablehnung `engine_booked` ist isoliert regelkonform.

### 3.2 Was tatsächlich geändert wurde

`trade.js` führt `paidWorkLine(line)` mit zwei Merkmalen ein: ein auf den Beginn des `what`-Texts gematchtes Gefahren-/Beseitigungsverb (`DEED`) sowie ein Indiz für Arbeit auf fremde Rechnung (`FOR_THEM`) in `what + said`. Ausgaben sind `work`, `unclear` oder `null`. Beide Marker gelten nur für `service:other`-Positionen (und vergleichbar fehlende Serviceunterart), nicht für Waren, Unterkunft, Training oder Heilung.

`world.js` `offerLines()` weist als `work` markierte neue Positionen mit `work_not_purchase` zurück, statt sie als käufliches `offer` zu speichern. `commands.js` `offer.accept` weist auch **ältere bereits gespeicherte** derartige Angebote zurück. Ein nur als `unclear` markiertes Tatangebot wird bei nicht ausdrücklich kaufender Annahme geklärt. Das schützt Altchats und vermeidet, aus einer Belohnungszusage automatisch **+14 cp** zu machen.

`content/deltas.json` verdeutlicht den Extractorvertrag bereits an einer übergeordneten Regel und zusätzlich am Angebotsfeld. **Gegenprobe:** `fix187_paid_work.test.js` hat sechs fokussierte Tests – Originalfall, gespeichertes Altangebot, reguläres `coin.gift +8`, Bad/Heiler/Führer/Unterkunft, mehrdeutiger Rattenfänger mit ausdrücklicher `I hire you`, sowie direkte Klassifikation. Opus berichtet **6/6** (auf `.186` rot) und **269/269** angrenzende Tests. Im vorliegenden Code ist die Buchungsautorität unverändert: ein `offer.accept` kann erst nach den neuen Guards abbuchen.

### 3.3 R1 – semantische Gegenprobe: **wer** arbeitet?

**Originaler Codepfad:**
- `paidWorkLine` testet `DEED` im Zeilenanfang und `FOR_THEM` irgendwo in `what` oder `said`.
- `FOR_THEM` wertet „for the village“, „for us“, „reward“ usw. als Indikator für eine **Arbeit Alarics**.
- `world.js offerLines` lehnt `paidWorkLine(l)==='work'` unabhängig davon ab, **wer laut Narrator der tatsächliche Leistungserbringer ist**.
- `commands.js offer.accept` lehnt `work` ebenso unabhängig von einem ausdrücklichen Kaufbefehl ab.

**Konkreter nicht in Tests enthaltener Gegenfall (isolierter Produktausdruckstest):**

> Händler/Jäger: „I am the town pest controller. I'll kill the rats for the village. Pay me five copper and I'll do it.“  
> Extractor-Zeile: `service:other, what:"kill the rats for the village", said:"Pay me five copper and I'll do it"`.

Die **unveränderten Produkt-RegEx** liefern `paidWorkLine(...) === "work"`; der Anbieter will aber **von Alaric bezahlt werden und selbst arbeiten**. Bereits beim `offer`-Eingang wird dieser eigentlich käufliche Service verworfen. Auch ein späteres „I hire you …“ kann den gar nicht mehr gespeicherten Kauf nicht reparieren. Die bestehende positive Regression `clear the rats from your cellar` testet nur den **anderen** Fall ohne `FOR_THEM`-Signal.

**Nachweisgrad:** Regex-Klassifikation mit tatsächlichen Quellen kompiliert und ausgeführt, danach die beiden konkreten Guard-Pfade aus Code gelesen. **Kein vollständiger ST-/Host-Run** für den künstlichen Gegenfall. Die Blockade ist eine plausible **falsche Verweigerung**, kein neuer unautorisierter Geldabzug.

**Enger Test-/Fixbedarf:** einen NPC, der ausdrücklich selbst gegen Bezahlung Jagd-/Räumungsarbeit anbietet, plus das ursprüngliche Eigenarbeits-/Belohnungsbeispiel gegeneinander testen. Die Richtung kann nicht aus dem Begünstigtenwort („for the village“) allein folgen; bei Konflikt von Akteur, Auftraggeber und Zahler lieber **clarify** statt automatisch bezahlen oder pauschal `work_not_purchase`. Keine allgemeine Neuerfindung privater Quests und kein Aufweichen der ursprünglichen 14-cp-Sperre.

### 3.4 Begrenzte, ehrliche Deckung

Nicht erfasst sind etwa `"I will kill the gander for the village"` wegen `DEED` nur **am Zeilenanfang** sowie ungefährliche Tätigkeiten `"carry the sacks to the mill for us"` ohne das ausgewählte Gefahrenverb. Das ist eine offen deklarierte **enge zweite Schutzlinie**, nicht von sich aus ein Grund für riesige Wörterbücher. Der Extractorvertrag bleibt die erste Linie. Für einen neuen realen Fehlerfall wäre die konkrete Quelle nötig.

## 4. Etappe 2 – Warrior-Ortsdrift (`a5d02c1`, `92593fd`)

### 4.1 Originale und Unterscheidung von „nichts tun“

Die große ZIP `npc-batch-20261114-094810Z.zip` unabhängig geöffnet:
- #113: taktisches `move away` verschiebt Distanz – kein vollständiger Ortswechsel.
- #115: `drop` und `flee` – der geplante Rückzug wird noch nicht als vollständiger Weg gebucht.
- **#117:** `plan.raw` meldet **`move away` von Goblin A**, nicht leere Befehle. Position bereits `LONG`; der Mapper macht daraus `commands:[]`, A0 kennt zudem eine nur bedingt erwähnte Heavy-Slash-Aktion. Narrator lässt ihn dennoch bei der Palisade ankommen; Engine `no_go`.
- **#119:** Planner wirklich `commands:[]`; Spieler spricht den Torwächter an, die Erzählung hält am unerreichten Tor fest, obwohl ihr schon ein Stay-Hinweis vorlag.
- **#121:** erst jetzt ausdrücklich autorisierte Reise zum Wachhaus; der unzulässige Parent einer `interior`-Meldung im freien Reich wird weiterhin verweigert.

### 4.2 Implementierung und Schutz

`planner.js` erweitert `BACK_WAY` um „backing up the track“/„back slowly up the road“. Wenn **außerhalb Kampf**, kein bestehender `go`, und **kein** `move` in der aktuellen Szene den Abstand tatsächlich ändern würde, kann `retreatGo(state,c)` aus der jüngsten echten Szenenchronik eine Rückreise ableiten. Ein erfolgreicher Distanzschritt bleibt Distanzschritt; `retreatGo` ist keine Ausnahme von GO/Arrival-Authorization, sondern erzeugt reguläres `go`.

`world.js` ergänzt die `no_go`-Korrektur um gespeicherten Ist-Ort und abgelehnten Zielort. Ein Ziel, das nur ein bekannter übergeordneter Ort ist, wird nicht fälschlich als „nie erreicht“ bezeichnet. `scene_context` und die Topologieprüfung bleiben unverändert.

`fix187_way_back.test.js` verwendet die frühere Warrior-Chatscheibe: fünf Tests, davon vier auf `.186` rot laut Opus. Die Tests decken Original-#117, tatsächliche Host-GO-Buchung/Reload, original `no_go/scene_context`, Topologie sowie positive Abgrenzung eines tatsächlichen Distanzschritts, Kampf und explizites GO ab. Implementierer: **5/5** neue und **495/495** angrenzende.

### 4.3 R2 – echter Wille zu einem *kleinen* Schritt versus Route zum vorherigen Ort

`BACK_WAY` testet unter anderem „back up the road“ oder „back slowly up the road“. **Es fordert weder ein ausdrücklich genanntes Ziel noch eine Aussage, dass Alaric die Szene verlassen will.** `retreatGo` wählt andernfalls den **letzten anderen Ort** aus `scene.history`; das ist mehr als ein Distanzschritt.

**Gezielte isolierte RegEx-Gegenproben** gegen das Original-`BACK_WAY`:
- `I keep backing up the dark track toward the gate palisade` → **true** (gewollter Originalfall).
- `I back up the road a single step and hold my position` → **true**.
- `I back slowly up the road three paces without leaving the clearing` → **true**.
- `I back up the path while staying at this ambush spot` → **true**.
- `I back away a single step` → **false**.

Wenn der Plannerausgang auch bei einer dieser **ausdrücklich ortsfesten** Aussagen `move away` lautet, der Zielgegner bereits `LONG` und `scene.history` nichtleer ist, dann sind `steps.length===0` und `retreatGo` ergibt ein `go` zur letzten anderen Szene, **obwohl der Spieler „ich bleibe hier“ gesagt hat**. Das ist eine reproduzierbare **Codepfad-Konstellation für unerwünschte Reiseautorisierung**, jedoch noch kein unabhängig gefalteter Hosttest oder natürlich eingetretener Schaden. Die bestehenden Gegenfälle testen nur `I keep backing up` ohne Wegwörter und den Fall einer tatsächlich verkürzten Distanz.

**Enger Test-/Fixbedarf:** mit Original-Warrior-Zustand nahe #117 und nur geändertem Player-Quote die Aussagen „one step / stay here / without leaving“ in `mapPlan` und im echten Hostpfad durchspielen. Beibehalten: legitimes `backing up … toward the gate`, kurze Distanzschritte, normales `flee` und ausdrücklich geplantes GO. Unter explizitem Nicht-Verlassen darf aus einem wirkungslosen Move **kein Orts-GO** werden. Kein allgemeiner Siedlungs-/Teilreise-Freibrief.

### 4.4 Nicht als nachgewiesen verkaufen

Der neue Korrekturtext entsteht deterministisch im **Engine-Record**, aber der eigentliche Langzeitfehler war, dass das Narrator-Modell einen schon vorhandenen Stay-Hinweis ignorierte. Die Regression prüft die gespeicherte Korrektur und einen künstlich gesetzten `arrive`, **nicht** eine natürliche Modellbefolgung über fünf Züge. Die Host-Brücke `turnBlock` liefert frühere Korrekturen grundsätzlich aus; `context.js` zeigt höchstens die ersten **vier** und pro Zeile höchstens **400 Zeichen**. Das ist kein belegter neuer Fehler im Originalfall, sollte aber vor Behauptungen über sicher zugestellte Korrekturen als tatsächlicher nächster Modellrequest mit geprüft werden.

**„P2 gelöst“ gilt für den deterministischen Mapper-/Korrekturpfad, nicht für die natürliche Narrator-Kontinuität.**

## 5. Etappe 3 – Reasoning-Längenabbrüche (`c567e97`)

### 5.1 Die konkrete Änderung ist korrekt eng

`runtime.js` prüft bei Planner-Erstantwort `!first.content.trim() && first.call?.finish === "length"`. Dann verwendet die **eine vorhandene Reparatur** statt des irreführenden „not valid JSON“ die kurze Anweisung `PLAN_RAN_OUT`, ohne eine leere Assistant-Antwort zurückzugeben. **Unverändert:** erster Plan 2000 Tokens, Repair 2000, besondere Recovery 4000 nach zweimal leer, höchstens drei Aufrufe, keine ausgeführten Befehle ohne Schema/Agency-Autorisierung, isCurrent-Schutz. Der Extractor hatte eine ähnliche Behandlung schon vorher; er wurde nicht neu umgebaut. Ein abgeschnittenes, aber **nicht leeres** JSON bleibt auf dem alten Schema-Repairweg.

`fix187_planner_ran_out.test.js`: sieben Tests für leer + length, abgeschnitten/nicht-length, gültige Mehrfachaktion, 2×leer/3×leer, Stale-Request, echten PrepareGeneration-Hostpfad ohne Doppelbuchung bei Regenerate und das Diagnosewerkzeug. Opus berichtet **7/7**, **282/282** angrenzend. Kein künstliches Ändern der Geld-, Reise- oder Kampfautorität.

### 5.2 Unabhängige Nachmessung der **vollständigen Original-`calls.json`**

Aus dem **Originalupload**, nicht aus der Opus-Patchnote, alle 644 Request-Records der drei Personas unmittelbar gelesen (Warrior 207, Rogue 219, Mage 218). Stufen nach `role`, `repair` und tatsächlich angefordertem `max_tokens` unterschieden:

| Aufrufgruppe | Anzahl | `finish=length` leer / mit Inhalt |
|---|---:|---:|
| Planner mit Erstlimit **2000** | **192** | **16 / 0** |
| Extractor mit Erstlimit **4000** | **213** | **43 / 2** |
| Planner, zusätzlich nicht als Repair markierte 4000er-Recovery | 2 | 0 / 0 |
| Extractor, zusätzlich nicht als Repair markierte 6000er-Recovery | 3 | 1 / 0 |

**Insgesamt** `finish=length` **69 Aufrufe** mit **258.768 Completion-Tokens** und **3.386,29 Sekunden** kumulierter Aufrufdauer. Diese drei Summen **bestätigen** Opus. Die dokumentierte Erst-Extractor-Zeile `44 leer / 1 cut` ist gegenüber den tatsächlichen 4000er-Erstaufrufen um **eine Antwort in der Aufteilung verschoben**: richtig sind **43 leer / 2 cut**. Die beiden angeschnittenen Fälle stammen vom Rogue (Calls **n148 und n158**). Zählt man die 6000er-Recovery mit, sind es **44 leer / 2 cut** bei 216 `repair:false`-Extractoraufrufen insgesamt. Das ist ein **kleiner Berichtskorrekturpunkt**, kein Beleg einer defekten Budgetbehandlung.

Die fehlende klare Trennung von `repair` und **Recovery mit `repair:false`** im neuen Diagnosetool kann bei flüchtiger Betrachtung die Zählung „Erstaufruf“ verwischen. Der richtige Bezugswert ergibt sich aus dem angeforderten Cap und dem echten Zweck, nicht allein aus `repair:false`.

### 5.3 Ursache und Wirkung trennen

Die starke Häufung leerer Antworten mit hoher `reasoning_chars`-Zahl ist mit **Reasoning-Verbrauch am Ausgabelimit vereinbar**. Das Providerfeld `reasoning_tokens` ist jedoch in den Originalrecords **null**; die Zeichen des Reasoning sind kein identisches Maß zu Tokenverbrauch. Die Ursache „Reasoning läuft bis zur Grenze“ ist ein gut begründeter Befund, die Wirkung der neuen Formulierung auf ein echtes LLM dagegen **noch ungemessen**. Die technischen Tests liefern bewusst nur eine geskriptete zweite Antwort.

Gut entschieden: keine pauschale 2000→4000-/4000→6000-Erhöhung ohne Kostenbeleg, keine vierte Recovery und kein Umgehen der Autoritätsprüfung. Das Fixpaket ist präzise eine **Verbesserung der ersten Repair-Anweisung**, **keine nachgewiesene Reduktion der 69 Budgetabbrüche**. Erst ein natürlicher Vergleich mit gleicher LLM-Konfiguration kann Ausfallquote, Zusatzaufrufe und Tokenkosten gegeneinander bewerten.

## 6. Replay-/Vollsuite-/ST-Abnahme

### 6.1 Unabhängig ausgeführter **Akzeptanzlistenvergleich**

Die vollständigen, auf GitHub veröffentlichten JSON-Akzeptanzdateien
`tests/replay/accepted_monster186_vs_126.json` (1077 Einträge) und
`accepted_travel187_vs_126.json` (1088 Einträge) strukturell verglichen:

- **1069** akzeptierte alte Einträge unverändert.
- **8** bereits akzeptierte Einträge ersetzt; die neue `previous_acceptance_186`-Referenz trägt jeweils den korrekten alten Kategorie- und Fingerprintwert.
- **11** vollständig neue Einträge, keine verlorenen Akzeptanzen.
- Alle **19** der Kategorie `travel187 stay correction places` zugeordnet. Die Liste `returned` ist unverändert; keine veraltete Vorgängerreferenz.
- Der Schutztest in `replay.test.js` prüft **die genaue 19er-ID-Liste**, Kategorien, alte Fingerprints und Grundform. Das ist deutlich stärker als eine bloße pauschale Replay-Freigabe.

**Beweisgrenze:** Die wirklichen 2235 neuen Engine-Ausgaben wurden von Opus gegen die 186-Baseline feldweise verglichen und **so berichtet**. Ich habe Akzeptanzlistenstruktur und Testcode eigenständig verifiziert, aber den vollständigen Replay-Fold hier nicht selbst ausgeführt. Aus gespeicherten Fingerprints allein lässt sich die Behauptung „wirklich nur Korrekturtext“ nicht vollständig unabhängig beweisen.

### 6.2 Implementiererabnahme und exakter Smoke-Stand

| Test | Gespeicherter/berichteter Stand |
|---|---|
| Neue Regressionen | 6 P1 + 5 Rückweg + 7 P1f = **18/18** |
| Angrenzende Suiten | P1 **269/269**, P2 **495/495**, P1f **282/282** |
| `npm test` | **3188/3188** laut Opus |
| Replay | **2235**, davon **19** geändert, implementiererseitig feldweise kontrolliert |
| Korpus-Fingerprint | **1088/1088** laut Opus, 19 Akzeptanzlistenänderungen unabhängig kontrolliert |
| ST1.19 Standard | **224/224**, 0 PageErrors |
| ST1.19 Failsoft | **229/229**, 0 PageErrors |

**ST-Quelle:** [Patchnote am Commit `bd52d2f`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd52d2f/avereth-engine/docs/BATCH186_FIXES_187.md). Dort dokumentiert: isoliertes ST 1.19.0 `7e8663c`, Node 22.23.4, Chromium 153; Smoke-Checkout `92593fd` mit den **gleichen, aber damals uncommitteten** Release-Dateien; **Standard 485 s, Failsoft 486 s**, beide 0 PageErrors. Die spätere Commitfolge ändert laut Compare nach `5b4d493` nur die Patchnote, nicht den getesteten Enginecode. **Der Smoke ist echt ausgeführt worden, aber nicht von GPT eigenständig wiederholt.**

Der Test schützt die tatsächliche ST-Integration und begrenzte Failsoft-Fälle. Er prüft mit einem Mockprovider weder die freie Jagddienstleistungs-Negativprobe R1 noch eine im Rollenspiel über fünf Züge wiederholte falsche Ankunft R2.

## 7. Priorisierte, kleine Nachprüfung statt neuer Großrunde

| Priorität | Aufgabe | Warum / erwarteter Nachweis |
|---|---|---|
| **A – gezielt vor nächstem langen Batch** | R2: `move away` mit „back up road/path, **only one step/stay here**“ bei `LONG` und vorhandener Historie im originalen Warrior-Zustand; erwartetes Ergebnis **kein `go`** | Sonst potenziell Spielerhoheitsverletzung durch autorisierte Reise, obwohl kein Szenenwechsel gewählt wurde |
| **B – gezielt zusammen mit A** | R1: NPC verkauft **seine eigene** Jagd-/Rattenfängerarbeit ausdrücklich gegen Zahlung, Text enthält „for the village“; erwartetes Ergebnis echter Kauf oder bei widersprüchlicher Rollenangabe **Klärung**, nicht falsche Zuordnung als Alarics Arbeit. Originaler 14-cp-Fall muss weiter gesperrt bleiben | Verhindert neu eingeführte falsche Dienstleistungsverweigerung |
| **C – Bericht/Kalibrierung** | `model_budget_report` die Rollen `initial / repair / recovery` (und die gezählten 4000-/6000-Caps) eindeutig kennzeichnen, 43/2 statt 44/1 in der Patchnote richtigstellen | Saubere Messbasis, kein Produktfehler |
| **D – erst natürlicher Nachtest** | Prüfen, ob wirkliche LLMs die neue Ortskorrektur, Extractor-Arbeitsrichtung und `PLAN_RAN_OUT` befolgen; Laufzeit/Kosten/Fehlersenkung messen | Geskriptete Tests und ST-Smoke beweisen keine freie Modellleistung |

**Nicht empfohlen:** neue Handelsarchitektur; `work_not_purchase` für alle Gefahren-/Dienstverben pauschal machen; alle `move away`-Befehle in Reisen umdeuten; allgemeine Orts-Whitelist/O2; vierte LLM-Recovery; ungemessene Erhöhung aller Tokenlimits; Umbau von A2, NPC E3, PULSE oder Mage-Unterkunft als Nebenprojekt.

**Klares Ergebnis:** `.187` ist ein deutlich besser abgegrenztes technisches Reparaturpaket als ein weiterer Architektur-/Payment-Generalpatch. Die drei ursprünglichen Fehlerklassen sind für die konkreten geskripteten Szenarien behandelt, aber **zwei gezielte Ausnahmesituationen verlangen negative Regressionen**, bevor von einer allgemeinen Schutzgarantie gesprochen wird. **Kein Produktcode durch diesen Review verändert.**
