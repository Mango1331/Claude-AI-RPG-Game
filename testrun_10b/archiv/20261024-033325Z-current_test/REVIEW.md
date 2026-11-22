# Avereth Engine – Ausführlicher Review 10B / Run 2

**Run-ID:** \`20261024-033325Z-current_test\`  
**Prüfstatus:** Eigenständige Auswertung der vom Benutzer gelieferten Original-ZIP; **Befundsammlung, keine Implementierungsfreigabe.**  
**Rohdatei:** \`20261024-033325Z-current_test.zip\` (**4.271.133 Bytes**, SHA-256 \`638d939bee989e32c1d4bbf92a648eaefc81af7fc463e550b377da92fbe85f90\`).  
**Arbeitsgrundlagen im Archiv:** \`run.json\`, \`evaluation.json\`, \`avereth-events.json\`, \`chat.jsonl\`, \`chat-completions.jsonl\`, \`calls.json\`, \`player.jsonl\`, \`report.md\`, \`import.json\`, Screenshots und Serverlogs. **Keine Engine-Änderung.**

**Indexkonvention:** Die unten angeführten **E#-Nummern** sind die \`i\`-Werte aus \`avereth-events.json\` (zugleich Nachrichtenindizes des Chatverlaufs). \`E34\` ist also kein vierunddreißigster Spielerzug. **T#** bezeichnet den tatsächlichen Spielerzug 1–25. Die Engine-Events sind maßgeblich für Geld, XP, Gegenstände, Questzustände, Bewegung und Zeit; Storyprosa ist lediglich die vom Spieler wahrgenommene Welt. Der automatisch erstellte \`report.md\` wurde anhand der Rohereignisse überprüft. Ein Einzelrun belegt **keine allgemeine Auftretenshäufigkeit**.

---

## 1. Ergebnis und Testbedingungen

| Feld | Verifizierter Wert |
|---|---|
| Runner-Ende | **\`narrator_empty\`**, T25 / Nachricht E50, **kein** Charaktertod |
| Fehlermeldung | Modell beendet Narrator-Aufruf mit \`finish_reason=length\`; 8.192/8.192 Completion-Tokens, **34.573 Zeichen Reasoning**, **0 Zeichen Text** |
| Ziel / Ist | **100** Spielerzüge gefordert, **25** tatsächlich ausgeführt; 1/2 Pflicht-Meilensteine erreicht |
| Dauer | **26:19 min** (1.578.912 ms) |
| Charakter | Mage Level 1; **Arcane Bolt + Focused Ward**, echte freie Erstellung |
| Ressourcen am Ende | **HP 80/80, MP 72/72, 91 cp, 23/100 XP** |
| Kampf | **0 Encounters**, weder Sieg noch Niederlage als Balancebeleg |
| Engine | **4.3.0-c.6.6.57**, Ruleset 2, \`integrity: OK\`, 329 Engine-Events |
| Source-HEAD im Export | **3181c8112ec6**, Branch \`claude/c-planner-prototype-2026-10-02-gpt-c666\`, Working Tree sauber |
| SillyTavern | **1.19.0**, isolierte Chrome-Instanz, keine \`pageErrors\` oder \`serverErrors\` laut Runner |
| Erzähler und Testspieler | \`zai-org/GLM-5.3-Flash\`, \`custom_url\` lokaler Provider, kein Stub |
| Narrator-Preset | „Avereth Narrator V4“ aus Profil, **abweichend** vom Build u. a. \`openai_max_tokens\`, \`show_thoughts\`; im Profil wird ein Vertragsstand **.49** vermerkt, während die laufende Engine **.57** ist |
| Lore | Avereth World Lore **v0.14** |
| Runner-Persona | pragmatischer Söldner, sinnvolle ertragreiche Aufträge, keine unnötig riskanten Kämpfe |
| Seed | Runner **876928971**; \`campaign.started\` enthält zusätzlich den tatsächlichen Startkampagnen-Seed **1034921401** – **nicht gleichsetzen** |
| Geheimnisse | Runner-Secrets-Scan meldet keine API-Schlüssel/Tokens; Benutzer übergibt API-Key aus lokaler PowerShell-Session |

**Kernurteil:** Der **offene Spielablauf funktioniert** auch im zweiten Versuch über Gilde, Lieferung, Privatjob und Rückkehr. Aber die 100-Züge-Messung wird erneut nicht erreicht. Diesmal blockiert **die Antwortgenerierung**, nicht das Kampfsystem. Dazu treten ein großer **Uhr-/Narrationsbruch**, **falsche offizielle Questangebote** und ein **nicht abgeschlossener Privatjob** auf. Zugleich beweisen die Events mehrere korrekt durchgesetzte Schutzregeln. Das ist ein **Integrations-/Content-/Providerbefund**, kein Grund für numerische Kampf-Balanceänderungen.

---

## 2. Detaillierter Spielverlauf und autoritative Ereignisse

| Spielerzüge | Verlauf | Autoritative Buchung / Bemerkung |
|---|---|---|
| **1–2** | Wählt Mage und danach Arcane Bolt + Focused Ward | \`creation.class_selected\` E1; \`creation.completed\` E3. Keine synthetische Vorgeschichte |
| **3–6** | Stadt Alderwatch, fragt Händler nach Gilde, erreicht Gildenhalle, will beitreten | Natürliche Gespräche, Szene-/NPC-Daten; E11 legt das offizielle Registrierungsangebot über **20 cp** an |
| **7** | Sagt „Alaric Red“, legt zwei Silber auf den Tresen | \`offer.accept\` E13 **refused: \`needs step 1\`**; kein Geldverlust |
| **8** | Wiederholt Namen und wirft zwei Silber in Gebührenbox | E15: \`transaction.completed\` **20 cp**, \`coin.changed\` **50→30**, \`guild.registered\` |
| **9** | Liest Novice-Board | E17: **fünf** \`quest.created\`, offizielles \`board.shown\` |
| **10** | Nimmt den Hollowbrook-Tinkturenauftrag an | E19: \`quest.status\` **listed→active**, 60 cp ausgeschriebene Belohnung |
| **11–12** | Apotheke von Vell, Abholung und Einweisung | E22/E24: reales Objekt „crate of fever tinctures“, Questdetails; Box nicht nur narrativ |
| **13** | Hebt die Kiste auf und reist nach Hollowbrook | E25 \`object.moved\` → PC, \`quest.journey\`; E26 Reisezeit **+420 min**, Ort korrekt in Hollowbrook |
| **14** | Heilerin prüft alle 14 versiegelten Tinkturen | E28 Objekt zur Heilerin bewegt, \`quest.ready\`, **noch keine** Vergütung |
| **15** | Fragt im Dorf nach bezahlter Zusatzarbeit | E30: generierter **Privatauftrag** \`quest.sickroom_work_at_the_fever_cottage\` |
| **16** | Nimmt die Nachtwache am fieberkranken Kind an | E31 \`quest.status\` **offered→active**; E32 erzählt Innenszene und +120 min (gekappte 420 min) |
| **17** | Holt wegen Krampfanfall die Heilerin | Narrator erzählt Handlungen, aber E34 **\`extract.failed\`: report is not valid JSON**; keine dauerhafte Erzähler-Delta-Buchung |
| **18–19** | Heilerin kümmert sich ums Kind, Spieler hält Feuer/Wasser bereit | E36 **+15 min**, E38 **+120 min** statt beantragter 660; viele narrative Nachtstunden nicht gebucht |
| **20** | Nach Morgengrauen Aufbruch zur Bezahlung und Suppe | E40 **+600 min** und \`coin.changed\` **30→31 cp**; Nachtzeit technisch erst hier nachgeholt |
| **21** | Fragt nach Straßensicherheit und kehrt nach Alderwatch zurück | E41 echter GO nach Alderwatch, E42 \`scene.moved\`, aber **nur +60 min** |
| **22** | Gibt Tinkturenauftrag bei Gilde ab | E44: \`proof.checked ok\`, \`coin.changed\` **31→91 cp**, \`xp.changed +23\`, \`quest.status\` **active→completed** |
| **23** | Fragt nach privatem Nachtauftrag und neuen Gildenjobs | E46 bestätigt den privaten Status korrekt, **aber** \`overreach.noted\` für **zwei erfundene offizielle Board-Listings** |
| **24** | Will die vom Erzähler angebotene Rattenquest und fragt nach Laterne | E47 \`quest.accept\` **refused: no such contract**; E48 Zusatz-Laternenverkaufsangebot verworfen, weil Verkäufer nicht anwesend |
| **25** | Versucht stattdessen den vom Erzähler angebotenen Feuerholzauftrag | E49 \`quest.accept\` **refused: no such contract**; E50 Narrator liefert nach 8.192 Tokens **keinen** Storytext. Runner beendet sauber mit \`narrator_empty\` |

**Geld- und XP-Abgleich:** 50 − 20 Registrierungsgebühr + 1 Kupfer Privatlohn + 60 Kupfer Gildenbelohnung = **91 cp**, 23/100 XP. Die Reise, die Tinkturenzustellung, das private Pflegenarrativ und das Turn-in sind keine erfundenen Engine-Erfolge. Der Sieg über „Ratten“ oder ein Holzauftrag wurde **nicht** gebucht.

### Konkrete Erfolge

- Frei gewählter Mage auf echtem Level 1, keine erzwungene Klasse/Skillfolge.
- Gildenbeitritt mit genau einer registrierten Zahlung, nach einem abgelehnten ersten Versuch **ohne** Doppelabbuchung.
- Fünf echte Anfängeraufträge, bewusste Wahl eines günstigen Transportvertrags statt Kampf.
- Physische Kiste: vom Apotheker zur Spielfigur und weiter zur Heilerin; der Auftrag war **READY**, bevor die Gilde ihn gegen 60 cp und 23 XP abschloss.
- Zusätzlicher **organisch erzeugter Privatjob** mit Anweisungen, Folgegeschehen und tatsächlich gebuchtem Geld.
- Korrekte Firewall beim Gilden-Turn-in: \`proof.checked\`, kein Doppel-Payout, keine vorgezogene Belohnung.
- \`no_go\`, \`time_cap\`, \`engine_owned_fact\`, \`pc_inventory\` und weitere Regeln lehnen teils problematische LLM-Deltas ab. Dass Ablehnungen existieren, ist **nicht** automatisch ein Bug.
- Kein erzwungener Kampf trotz angekündigter Hundegefahr auf dem Weg nach Hollowbrook.
- Runner erkennt das leere Modellresultat, statt einen Scheinerfolg oder eine leere Fortsetzung als gültige Story zu akzeptieren.

---

## 3. P0 für Teststabilität: Narrator vollständig leer nach internem Reasoning (T25 / API-Call 76)

**Beweiskette:** T25: Spieler möchte den Holzauftrag annehmen. E49: der Parser erzeugt ein \`quest.accept\` und die Engine verweigert korrekt \`no such contract\`. Danach sendet der Runner die Storygeneration an GLM-5.3-Flash. **Call 76** (\`calls.json\`, \`chat-completions.jsonl\`): \`role=narrator\`, \`max_tokens=8192\`, \`completion_tokens=8192\`, \`finish=length\`, **\`content_chars=0\`**, **\`reasoning_chars=34573\`**, Laufzeit **116.794 ms**, \`reasoning_effort=low\`. Das Modell füllt den gesamten Budgetraum mit Reasoning, ohne sichtbare Antwort. **E50 enthält kein Extractor-Delta**, im UI erscheint die Warnung, und \`run.json.end.kind=narrator_empty\`.

**Gesichert:** Kein Node-/Browserabsturz, keine unberechtigte Engine-Transaktion, keine Hinweise auf einen verlorenen API-Key. Das Problem entsteht **vor einer verwertbaren Narrator-Antwort** beim verwendeten Modell/Provider-/Preset-Setup. Die Ursache des exzessiven Reasonings (Modellverhalten, Provider, Promptkomplexität, Token-/Thinking-Konfiguration) lässt sich **aus einem einzigen Call nicht eindeutig isolieren**. Die unmittelbar vorhergehende Ablehnung eines **erfundenen** Boardvertrags ist ein möglicher Kontextfaktor, aber noch kein kausaler Nachweis.

**Einstufung:** **P0 für die Zuverlässigkeit eines 100-Züge-Tests**, nicht P0 als Engine-Rechenfehler. Anders als Tod/Flee ist dies ein ungewollter technischer Abbruch; als Beobachtungsfall behalten.

**Spätere Abhilfevarianten (noch nicht umsetzen):**
1. Zuerst die **Prompt-/Reasoning-/Tokenverteilung** des Call 76 gegen unauffällige Narrator-Calls desselben Runs untersuchen; auf \`show_thoughts\` und max-Tokens-Unterschied zum ausgelieferten Preset achten. Kein ungeprüftes Drehen sämtlicher Modellparameter.
2. Für eine **vollständig leere** Storyantwort eine streng begrenzte Wiederholungs-/Regenerationsstrategie erwägen, getrennt von normalen Spielzügen; **keinen zweiten Engine-Zug**, kein doppeltes Quest-/Geldereignis, gleiche Player-Eingabe/Snapshot.
3. Generierungslimits und das Budget für sichtbaren Text testen, soweit der Provider dies unterstützt. Nicht bloß den Ausgabetokenwert erhöhen, ohne die Ursachen zu prüfen.
4. Im Runner leere Antwort, volle Reasoning-Budget-Ausnutzung und technische Abbrüche als **separaten Metriktyp** erfassen.

**Abnahmekriterien:** Replay eines künstlich leeren \`finish=length\`-Calls ohne Spielzustandsverlust/Doppelaktion; nach maximal begrenztem Retry korrekt fortsetzen **oder** eindeutig als nicht verwertbar dokumentieren. Reguläre einzelne leere/API-Fehler dürfen nicht endlos retryen. Würde man automatisch regenerieren, muss die erste unvollständige Antwort garantiert keine bereits gebuchten Engine-Events erneut auslösen.

---

## 4. P1: Erzählte Zeit widerspricht der gebuchten Engine-Uhr

**Beweiskette aus \`time.advanced\` (tatsächliche Uhr, Kampagnenstart Day 1 09:00):**

| Ereignis | Echt gebuchte Uhr | Erzähleindruck | Mechanischer Grund |
|---|---:|---|---|
| E26, nach T13 | **Tag 1, 16:58** | Ankunft am Abend in Hollowbrook | +420 min Reise; plausibel |
| E28, T14 | **Tag 1, 17:03** | Übergabe Tinkturen | +5 min; plausibel |
| E32, T16 | **Tag 1, 19:03** | Nachtwache wird angelegt, Erzähler führt ins Haus | Extraktor wollte **+420**, \`time_cap\` nur **+120** |
| E34, T17 | **Tag 1, 19:03** | Fieberkrise/Bewegung durch die Nacht | \`extract.failed\`: **+0** |
| E36, T18 | **Tag 1, 19:18** | Heilerin behandelt das Kind | +15 min |
| E38, T19 | **Tag 1, 21:18** | Text beschreibt nächtliches Wachen bis zum Morgen | gewünschte **+660** gekappt auf **+120** |
| E40, T20 | **Tag 2, 07:18** | Morgen, Frühstück/Bezahlung | **+600**; technische Uhr fängt sich teilweise |
| E42, T21 | **Tag 2, 08:18** | Rückweg wird bis zu **Alderwatch am Abend** erzählt | nur **+60**, gleichwohl \`scene.moved\` nach Alderwatch |
| E44, T22 | **Tag 2, 08:33** | Erzähler und Gildenschreiberin: **Abend**, Lampen, späte Schließung | +15 min; Uhr bleibt morgens |
| E46, T23 | **Tag 2, 08:38** | Gespräch nach Abendankunft | +5 min, Drift bleibt |

**Diagnose:** Die Zeitschranken verhindern zu große und unbegründete \`time\`-Deltas. Das ist zunächst gewollt. **Aber die Narration schreitet trotz Ablehnung erheblich weiter**, später sogar bis zum endgültig erreichten Reiseziel, obwohl nur 60 Minuten gutgeschrieben wurden. Die zwei Wahrheitsebenen laufen auseinander. Der Fall ist wichtiger als einfache sprachliche Ausschmückung: Tageszeit beeinflusst offene Läden, Nachtgefahren, Ermüdung, Herbergen und Questfristen.

**Nicht einfach „time_cap abschalten“:** Diese Firewall verhindert übermäßige Zeitsprünge, die nicht durch Spieleraktion/Reise/Aktivität gedeckt sind. Stattdessen begrenzte, nachvollziehbare Reise- und Ruhezeit von langen autonomen Erzählerpassagen trennen: 
- Wenn eine ausdrücklich erlaubte Reise im selben Zug **tatsächlich** am Ziel ankommt, muss die zur Strecke passende mechanische Zeit wenigstens plausibel sein; andernfalls den Erzähler nicht einfach die Vollendung einer langen Reise behaupten lassen.
- Nachtwachen oder längere Arbeit können eine autorisierte Zeitdauer verdienen, aber nur mit konkretem gewolltem und erlebtem Tätigkeitskontext.
- Nach \`time_cap\`/Extraktorfehler nachfolgendes Narrating am bestätigten Uhr-/Ortssnapshot ausrichten; keine rückwirkend stillen Korrekturen.

**Regressionen:** (a) T21 „früh los, abends ankommen“ darf nicht gleichzeitig auf 08:18 enden; (b) limitierte Nachtwache hat keine ungebuchte Morgenankunft; (c) kurze lokale Tätigkeit bleibt schnell; (d) ein echter erlaubter Long-Travel darf nicht wegen einer pauschalen Zwei-Stunden-Kappe scheitern; (e) nach \`extract.failed\` kein Gedächtnis/Timing-Erfolg aus nicht gebuchten Ereignissen.

---

## 5. P1: Erzähler erfindet offizielle Gildenaufträge außerhalb des Engine-Boards

**Beweiskette:**
1. **E17/T9:** \`board.shown\` dokumentiert fünf echte, vom Boardgenerator erzeugte Gildenaufträge. Der Spieler wählt den Hollowbrook-Transportauftrag.
2. **T23/E46:** In einem Gespräch außerhalb eines Board-Refresh zeigt der Erzähler zusätzlich **„Firewood for the temple alms-house“ (4 cp)** und **„Rats in the grain cellars“** als vermeintlich offizielle Novice-Ausschreibungen. E46 enthält \`overreach.noted\` mit \`kind=guild_listing\`: die Engine erkennt ausdrücklich, dass **zwei offizielle Gildenanzeigen nicht existieren**.
3. **T24/E47:** Player entscheidet sich aufgrund der ihm gezeigten Auswahl für Ratten. \`quest.accept\` wird **refused: no such contract**.
4. **T24/E48:** Narrator kaschiert die Diskrepanz zunächst als „bereits von einer anderen Gruppe angenommen“ und hatte laut Chat das Angebot vorher fälschlich als aktuell dargestellt. Ein natives \`quest.status\` für diesen Rattenjob existiert nicht.
5. **T25/E49:** Player will als zweite angebotene Möglichkeit Feuerholz. Erneut \`quest.accept\` **refused: no such contract**. Nachfolgend Call 76 leer (sekundärer Abbruch).

**Bewertung:** **Bestätigte Narrator-/Engine-Kanonverletzung, vom Firewall erkannt**, aber die Spieleroberfläche hat bereits ungültige verbindliche Angebotsinformationen erhalten. Zwei reale Spielerentscheidungen werden dadurch zu Fehlversuchen. Ein \`overreach.noted\`-Event allein behebt diese Erfahrung nicht. Anders als ein frei entstehender **Privatauftrag eines Dorfbewohners** sind amtliche Gildenboard-Verträge regel- und zustandsgebunden.

**Mögliche minimalinvasive Wege:** 
- Vor offizieller Verfügbarkeit neuer Gildenjobs muss ein **Engine-\`board\`-/\`quest.created\`-Schritt** stattfinden. Freie Erzählung über Gerüchte/kommende Arbeit ist zulässig, aber nicht als **annehmbares offizielles aktuelles Listing**.
- Der Narrator darf auf dem Board ausschließlich die im Engine-Zustand verifizierten Verträge anbieten; andere Angebote müssen **explizit private, nicht offizielle Arbeit** oder bloße Nachfrage/Ankündigung bleiben.
- Falls ein LLM dennoch Phantomjobs nennt: klare, knappe UI-/Story-Korrektur **vor** der nächsten Entscheidung statt eines weiteren generierten Scheinjobs.
- **Keine** automatische Gildenquest-Erstellung bloß weil der Erzähler einen neuen Aushang erwähnt: das würde die Kanongrenze zu einfach umgehen.

**Regressionen:** (a) Boardzustand hat fünf Listings, Erzähler darf keinen sechsten annehmbaren offiziellen Vertrag ausgeben; (b) privater Dorfbewohner darf eine neue Arbeit anbieten, die nach gültiger Erstellung angenommen wird; (c) „morgen werden neue Anschläge aufgehängt“ ist unverbindlich; (d) aus \`overreach.noted\` folgt keine erfundene Zustandsänderung oder XP; (e) zwei nacheinander erfundene Jobs dürfen nicht zu einer Sackgasse führen.

---

## 6. P1/P2: Privater Nachtwachenauftrag bleibt trotz Arbeit und Lohn \`active\`

**Beweiskette:** E30 \`quest.created\` „Sickroom work at the fever cottage“ mit \`kind=private\`, **\`payout_cp=null\`**, drei Objectives (Feuer, Wasser, Wache), \`proof\` über Nachtarbeit. E31 \`quest.status\` **offered→active**. Erzähler begleitet Pflege über T16–20 und verspricht Kupfer/Suppe. E38 ergänzt \`quest.detailed\`: Nachtwache und Ende der Fieberkrise. E40 zahlt **+1 cp** durch Tam. E46 bestätigt: **kein Gildenauftrag**, kein Gilden-Turn-in.

**Aber:** Über den gesamten Export erscheint **kein** \`quest.ready\` oder \`quest.status ...→completed\` für diesen Privatjob. Am Ende steht er weiterhin auf **active**; die automatische Evaluation meldet das ebenfalls. Ein bereits ausgezahlter Privatjob bleibt mechanisch hängen.

**Noch offen:** Es ist nicht gesichert, dass alle drei mechanischen Objectives (insbesondere **Wasser aus dem Fluss holen**) erfüllt wurden; deswegen wäre eine automatische Abschlussbuchung auf Grundlage bloßer Erzählerformeln falsch. Die Erzählung nennt Feuer, Nachtwache und Versorgung, aber der Objektivstand muss konkret geprüft werden. Ebenso ist nicht allein durch das **ausgezahlte** Kupfer gesichert, ob eine separate \`quest.status\`-Buchung vorgesehen war. Daher **P1/P2-Kandidat**, kein definitiv bestätigter Quest-Rechenbug.

**Prüffrage:** Können private Quests ebenso wie Gildenquests ein wohldefiniertes \`ready/completed\`-Lebenszyklusereignis aus erhaltenem Beleg, ausdrücklicher Auftraggeberbestätigung oder nachprüfbarer Zielerreichung erhalten, **ohne** Gilden-Turn-in und ohne doppelte Auszahlung? Kann ein Auftraggeber zulässige Teilerfüllung bestätigen und Abschlussbedingungen präzisieren?

**Regressionen:** Vollständig erledigter und bestätigter Privatjob schließt ohne Gildenbuchung; unvollständiger Job bleibt offen, ggf. mit nachvollziehbarer Teilzahlung; Lohn verdoppelt sich beim späteren Dialog nicht; neue Aufgaben verdrängen bestehende nicht.

---

## 7. P2: Unterschied zwischen narrativ betretenem Raum und Engine-Präsenz; Hintergrundfiguren

**T16/E32:** Heilerin führt Alaric nach Erzählung **in** die Fieberhütte. Extractor versucht ein \`arrive\`-Delta, das als **\`no_go\`** abgelehnt wird, weil Alaric keinen eigenen eindeutigen Reise-/Raumbetretungsbefehl gegeben hat und keine erzwungene Bewegung belegt ist. Die Szene beschreibt bereits Mutter, Kind und Tam drinnen; deren NPCs werden angelegt. Später (T19/E38) lehnt die Engine eine \`learn\`-Angabe ab, weil die Heilerin im bestätigten Ort **nicht präsent** sei.

**Zweites Muster:** Der Spieler bemerkt in T3–9 wiederholt, dass die HUD-Anzeige „Present“ trotz dichter Straßen-/Gildenszenen keine oder zu wenige Personen auflistet. Bei T22/E44 verweigert die Firewall drei namenlose **Ambient-Personen** als ausdrücklich irrelevantes Hintergrundpersonal. **Das ist für sich eine richtige Sparmaßnahme**, nicht zwingend ein Fehler: Ein UI-Label darf nur nicht suggerieren, dass die Welt physisch leer ist, wenn lediglich die mechanisch relevanten NPCs gezählt werden.

**Empfehlung:** Keine massenhafte Persistenz aller Randfiguren. In der UI die Bedeutung „mechanisch erfasste/relevante Anwesende“ klarstellen. Bei von NPCs **ausdrücklich geführten** Raumwechseln zwischen nahen Orten vertraglich prüfen, ob die bestätigte Begleitung die Bewegung autorisiert oder ob erst die Spielerfolgeantwort benötigt wird. Spieler-Agentur nicht durch universelles \`no_go\`-Lockern opfern.

---

## 8. P2: Einzelne Parser-/Transaktions- und Extraktorauffälligkeiten

### 8.1 Registrierung – unnötiger Zweitversuch ohne Geldverlust

T7/E13: Der Spieler nennt seinen Namen und legt die Gebühr **auf den Tresen**. Der Planner erzeugt \`offer.accept\` mit \`needs:1\`; Engine antwortet **\`refused: needs step 1\`**. Erst T8/E15 wird die Zahlung in der Gebührenbox korrekt gebucht. In einer frei formulierten RPG-Interaktion wirkt das Tresen-Verhalten für dieselbe sichtbare Registrierung **unnötig spezifisch**; unklar, ob bereits eine echte zwingende Mehrschritt-Transaktion oder nur eine Planner-Abhängigkeit verletzt wurde.

**Verbesserungsoption:** Gleichwertige klar angebotene Zahlungsformen oder eine echte verständliche Klärungsfrage; semantische Bezahlung an den zuständigen Schalter zulassen, sofern die Transaktion bereits gültig ist. **Nicht** die Gebührenprüfung umgehen. Regression: ein eindeutiger Zahlungssatz → genau eine Abbuchung, auch bei Reformulierungen/Reparaturen.

### 8.2 Extraktor \`extract.failed\` in der Krisenszene

T17/E34: Nach dem dargestellten Weg zur Heilerin liefert der Extractor selbst nach Reparatur **kein valides JSON**; \`extract.failed\`, mit sichtbarem „WORLD NOT RECORDED“. Die nächste Spieleraktion geht weiter; spätere Events übernehmen einzelne Fakten, **aber die unbelegte Orts-/Zeitkontinuität bleibt problematisch**. Zusätzliche Reparaturen in T7, T14, T15, T19, T21. \`evaluation.json\` führt für den gesamten Run **13 Issues** plus eine zusätzliche Panel-/Not-Recorded-Angabe, nicht 14 unabhängige Spielmechanikfehler. Keine doppelte Buchung des Krisenereignisses gesehen.

**Regression:** Ungültiger Extraktoroutput darf keinen partiellen Zustand still übernehmen; spätere Ereignisse müssen sich auf den letzten **bestätigten** Ort/Zeitstand beziehen oder nur sauber gebuchte Lücken schließen.

### 8.3 Zustandsjunk trotz Firewall: \`x=x\`

T24/E48 enthält \`fact.asserted\` mit Subjekt \`npc.npchollowbrook_healer\`, Prädikat **\`x\`**, Objekt **\`x\`**. Das ist **kein** belastbarer Spielweltfakt, wurde aber als Fact gebucht. Stützt die Hypothese, dass der allgemeine Fact-Extractor semantisch leere Platzhalter nicht überall abweist. Ein konkreter Zustandseintrag, nicht bloße Erzählabweichung.

**Verbesserung:** Sehr enge minimale Plausibilitätsprüfung für offensichtliche Platzhalter (\`x\`, leere Strings, unbelegte generische Dummy-Prädikate); keine große Ontologie oder Inhaltszensur. Regression: \`x=x\` kein permanenter Fact; legitime kurze Eigennamen/Initialen/Fachbegriffe dürfen bestehen bleiben.

### 8.4 Fremder Verkäufer als unberechtigtes Angebot

T24/E48: Narrator erklärt Laternenpreise des **nicht anwesenden** Geschäfts „Hollis's general store“; extrahierter \`offer\`-Delta wird korrekt wegen \`seller ... is not present\` abgelehnt. Diese Firewall verhindert erfundene Einkäufe. Ein gesprochener Preis-Hinweis darf **kein** bindender Shop-Zustand sein. Bei echtem späterem Besuch darf ein regelkonformer Laden ein legales Angebot anlegen.

---

## 9. Performance und Output-Verträge

**Rund 26:19 Gesamtzeit für 25 Züge** – schneller Abschluss eines 100-Züge-Tests ist so nicht zu erwarten. Gemessene Anteile: **22:11 min Game-Turns**, **3:13 min Testspielerentscheidungen**; Setup ca. 0:30 min. Median Game-Turn 30,5 s, p90 128,8 s; teuerster Spielzug **T21 203,6 s**. Der Median der Providerphasen beträgt Planner **2,6 s**, Narrator **12,4 s**, Extractor **8,4 s**. Aufrufzahlen: **24 Planner, 23 Narrator, 28 Extractor, 1 Board = 76 Calls**. Der letzte Narrator-Call allein braucht **116,8 s** ohne sichtbaren Text.

- Der Testspieler brauchte **17 Format-Reparaturen** (unbrauchbare erste JSON-Ausgabe) verteilt auf 25 Entscheidungen. Die 25 Spielereingaben wurden trotzdem korrekt übergeben. **Keine** 17 Engine-Fehler daraus machen.
- \`finish_reason=length\` auf **5** Engine-/Narrator-Calls (4 Extractor, 1 Narrator). Nicht jedes \`length\` führte zu einem nicht abgewickelten Zug; am Ende aber vollständiger Textausfall.
- E34 enthält einen echten nicht wiederhergestellten Extractor-Ausfall. E50 den echten leeren Narrator. Andere Reparaturen funktionieren, verbrauchen aber Zeit.
- **Profil-Narratorvertrag .49 vs. Engine .57** ist im Runnerbericht als Profilmetadatum erkennbar; der Status meldet „narrator contract: current“. Das allein beweist **keine** Fehlkonfiguration und ist vor einem Parameter-/Promptwechsel in der Profilimportlogik zu prüfen.
- Die Ausgabezeiten messen den **Provider- und narrativen Prozess**, nicht die deterministische Engine-Rechenleistung. Hieraus keine Engine-Performance-Nerfs oder Kampfbalanceänderungen ableiten.

**Vorschlag zur späteren Messung:** Für jeden neuen Run \`narrator_empty\`, \`extract.failed\`, Anzahl JSON-Reparaturen, \`length\`-Calls, Game-/Player-Zeit und tatsächlichen Long-Run-Fortschritt separat auswerten. Mehrere Runs erst unter gleicher Modell-/Presetkonfiguration vergleichen.

---

## 10. Gegenüberstellung mit Run 1

| Dimension | Run 1 (\`030002Z\`) | Run 2 (\`033325Z\`) | Gemeinsame Folgerung |
|---|---|---|---|
| Abschluss | **defeat** bei T26 | **narrator_empty** bei T25 | **0/2** Runs erreichen die 100 Züge, jedoch unterschiedliche Abbruchursachen |
| Charakter | Mage; Arcane Bolt + Arcane Ward | Mage; Arcane Bolt + Focused Ward | Klassenvielfalt noch **nicht** geprüft |
| Kämpfe | 5 Banditen, ungewollter Kampfstart, Tod | **0 Kämpfe** | Der Kampfstartfehler aus Run 1 ist in Run 2 weder bestätigt noch widerlegt |
| Kern-Quest | echte Tallow-Lieferung, 40 cp / 23 XP | echte Tinkturenlieferung, 60 cp / 23 XP | Guild-Turn-in, Questbelege, Vergütung und XP **in beiden Läufen erfolgreich** |
| Wirtschaft | Endgeld 64 cp | Endgeld **91 cp** | Keine erkennbare Doppelauszahlung |
| Narration/Firewall | zusätzliche, nicht gespielte Arcane Bolts in Todesszene und Memory | zwei nicht existierende offizielle Gildenangebote, abgelehnte \`quest.accept\` | **Wiederkehrende Grenze:** Erzählerphantasie vs. autoritativer Engine-Zustand; **unterschiedliche** Symptome |
| Reisen/Zeit | „auf den Kutschbock“ als Phantom-Ort | gültiger Rück-GO, aber **massive Zeitabweichung** | Wiederkehrende **Reise-/Weltzustandskonsistenz** als Kategorie, nicht dieselbe Ursache |
| Extraktor | mehrere Reparaturen, aber Kampfrecord vorhanden | 4 Extractor-length, E34 \`extract.failed\`, E50 leerer Narrator | LLM-Ausgabezuverlässigkeit weiter beobachten |
| Privatauftrag | nicht gleichartig geprüft | 1 cp ausgezahlt, Auftrag bleibt \`active\` | **Neues Thema**, erst einmal beobachtet |
| Langzeitwachstum / Gear | nicht erreicht | nicht erreicht | **Weiter offen**, keine Schlussfolgerung |

**Kritische Einschränkung:** Beide Läufe verwenden **Mage und denselben .57-Engine-HEAD**. Sie sind zwar nützlich für Reproduzierbarkeit von Quest-/World-Verhalten, decken aber **weder Warrior noch Rogue noch irgendeinen höherstufigen Charakterverlauf** ab. Die unterschiedlichen Seeds, Fähigkeiten und LLM-Generierungen machen sie zu **zwei unabhängigen Beobachtungen**, nicht zu identischen statistischen Paarläufen.

---

## 11. Priorisierte Maßnahmenmatrix zur späteren Entscheidung

| Priorität | Befund | Enger nächster Prüfschritt | Risiko voreiliger Änderung |
|---|---|---|---|
| **P0 Teststabilität** | Narrator: volles Reasoning-Budget, **0 Text**, T25 | Provider-/Preset-Diagnose Call 76; eventuell **höchstens ein** sicherer Empty-Retry ohne Spielzug-Duplikat | Doppelte Transaktionen, Endlos-Retry, unnötiges Modell-Tuning |
| **P1** | Engine-Uhr widerspricht nach langen Tätigkeiten/Reisen der Narration | E32/E38-Timing und E42-Reise-Endzustand isoliert reproduzieren | Freie Zeit-Sprünge/Teleportation oder übermäßig kleinteilige Reise |
| **P1** | Phantom-Offiziell-Quests | E46 \`overreach.noted\`, E47/E49 \`no such contract\` testen | Auto-Kanonisierung beliebiger NPC-Geschichten |
| **P1/P2** | Private Quest nach Geldzahlung noch aktiv | Zielbelege/Private-Quest-Completion-Semantik prüfen | Falsche automatische Belohnung/Abschluss ohne Objectives |
| **P2** | \`no_go\` bei begleiteter Raumführung und NPC-Präsenz | Begleitungsbefehle und UI-Semantik prüfen | Aufweichung der Player-Agency-Firewall |
| **P2** | Zulässige Registrierungsgebühr erst nach zweiter Formulierung | Plan-\`needs\`, Angebotslogik und UI-Feedback prüfen | Geld-Duplikate durch großzügiges Fuzzy-Parsing |
| **P2** | \`extract.failed\` und generischer Dummy-Fact \`x=x\` | Validierung/Recovery eng testen | Weltwissen durch frei interpretierte Halluzinationen |
| **Beobachtung** | 17 Player-JSON-Reparaturen, Kosten pro Run | Formatvertrag messen, kein blinder Modellwechsel | Verschlechterung sinnvoller Spielerentscheidungen |
| **Weiter offen** | organisches Lernen, Leveling, Evolution, Equipment, Kampfbalancing | weitere unmanipulierte Langläufe, möglichst andere Klassen | Numerisches Balancing ohne natürliche Evidenz |

### Konkrete spätere Red/Green-Tests

1. **empty_narrator_reasoning_exhaustion:** Narrator 8192/8192, leere content → kein falsch bestätigter Turn, keine Doppelbuchung; ggf. begrenzte Regeneration.
2. **time_long_night_activity:** Die Narration darf nicht „bis zum Morgen“ behaupten, wenn eine harte Firewall nur 120 min bucht, sofern keine autorisierte Fortsetzung erfolgt.
3. **time_road_to_town:** Offiziell in Alderwatch **abends** angekommen → mechanische Uhr muss plausibel mitlaufen oder Ankunft wird noch nicht verbucht.
4. **board_official_listing_authority:** Narrator darf ohne Boardevent keine offiziell annehmbaren Gildenjobs erfinden.
5. **board_private_work_exception:** Ein Dorf-NPC kann unter separatem privaten Questvertrag legitime Zusatzarbeit anbieten.
6. **private_quest_paid_completion:** Nach vollständigem Beleg und Auftraggeberbestätigung Abschluss ohne Gilde; keine Doppelzahlung; teilweise Arbeit bleibt ggf. aktiv.
7. **no_go_escorted_local_arrival:** Mit NPC gemeinsam betretene Innenräume dürfen nicht zu stillen Phantomorten führen; Spieler verliert dennoch keine Agency.
8. **extraction_failed_atomicity:** Nach ungültigem JSON keine halbfertige Weltbuchung; nächster Turn benutzt bestätigten Snapshot.
9. **reject_nonsense_fact:** \`p:x, o:x\` nicht als Weltwissen persistieren.
10. **offer_accept_registration_semantics:** Einzahlung am passenden Counter/Box in derselben gültigen Transaktion genau einmal, klarer Status.
11. **ambient_npc_hud_semantics:** „keine gespeicherten relevanten NPCs“ ≠ „die ganze Gildenhalle ist leer“.

---

## 12. Fazit und Entscheidungsvorbehalt

**Positiv:** Das zweite offene RPG fühlt sich über weite Strecken **wie eine organische Geschichte** an: Der Spieler wählt einen machbaren Auftrag, erfüllt ihn mit einem realen Gegenstand, lässt sich auf örtliche Nebenarbeit ein, verdient tatsächlich Geld und findet zu den institutionellen Regeln der Gilde zurück. Das sind valide Nachweise für Teile der aktuellen Spielarchitektur.

**Nicht bestanden:** Die 100-Züge-Beobachtung. Nach nur 25 Zügen endet der Run wegen einer **Modellantwort ohne sichtbaren Text**. Die gefährlichsten weiteren Befunde sind die **massive Zeitdesynchronisierung** und die **offizielle Questboard-Halluzination**, die zwei unmittelbar folgende Spielerentscheidungen entwertet.

**Für Patch 10B jetzt nicht entscheiden:** Kein Damage-/HP-/Monster-/Class-Nerf und noch kein systemischer Umbau der Quest-, Spezies- oder Reise-Engine. Die gemessenen Mechanikfehler gehören in eine **separate spätere Behebungsrunde**, wenn wir weitere Runs gesammelt und gleiche Ursachen isoliert haben.

**Archivierung:** Original-ZIP nicht verändern, im Ordner neben \`REVIEW.md\` ablegen, SHA-256 verifizieren. Die Befunde dieses Reviews sind unabhängig vom Anwesenheitsstatus der ZIP auf GitHub aus der gelieferten Originaldatei ermittelt worden.
