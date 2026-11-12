# Avereth – Tiefenaudit der gewachsenen 10B-Architektur

**12.11.2026 · Claude · unabhängige Analyse, keine Implementierung, keine Freigabe.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Build `4.3.0-c.6.6.179`, HEAD [`59f868e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd). Dokumentation auf `main` bei `cc9b90a`. Zeilenangaben beziehen sich auf `59f868e` in `avereth-engine/`.

**Abgrenzung:** Die Grundarchitektur ist im [Architekturaudit .126](../patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md) und im [Zahlungsaudit .141](../patch_plans_10b/PAYMENT_SYSTEM_AUDIT.md) untersucht. Dieses Dokument wiederholt sie nicht. Es fragt, was die 53 Builds seit `.126` strukturell bewirkt haben und wo dieselbe Ursache mehrfach als Einzelsymptom behandelt wurde.

**Quellen:** [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [02](../02_DESIGN_KANON.md), [03](../03_AKTUELLER_PROJEKTSTAND.md), [06](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), die Fachpläne und Reviews in `patch_plans_10b/`, die Produktpatchnotes in `avereth-engine/docs/`, der Produktcode und seine Git-Historie (725 Commits), sowie drei Originalarchive: [NPC/PULSE-Pilot 01](../testrun_10b/npc-20261109-160250Z/REVIEW.md) (`.174`), [Batch 28 Warrior](../testrun_10b/batch-20261103-171839Z/REVIEW.md) (`.154`) und [User04](../testrun_10b/user-20261106-072640/REVIEW.md) (`.159`).

**Nachweisgrade:**

| Kürzel | Bedeutung |
|---|---|
| **[C]** | am Code von `59f868e` gelesen (Datei, Funktion oder Zeile genannt) |
| **[H]** | aus der Git-Historie oder einer Patchnote belegt |
| **[D]** | aus gespeicherten Originaldaten gezählt (nur gelesen; Zahlen stammen vom jeweiligen Ursprungsbuild) |
| **[P]** | plausibler Schluss, nicht reproduziert |

**Nicht gemacht:** kein Test, kein Replay, kein Fold mit der Engine, kein Modellaufruf, keine Produktänderung. Die Zählungen sind einfache Auswertungen der archivierten JSON-Dateien. Sie umfassen drei Läufe und ersetzen keine Korpusmessung.

---

## 1. Kurzurteil

1. **10B ist nicht flächig überkonstruiert.** Die Buchungsfunktionen, der Fold-Schutz, die Autoritätstabelle der Firewall und der PULSE-Wurf sind tragfähig und seit `.126` kaum noch geändert worden. Die Komplexität wächst an wenigen, klar benennbaren Stellen.
2. **Die wiederkehrenden Fehler haben vier gemeinsame Ursachen, keine vierzig.** Die Engine entscheidet einiges erst, nachdem der Erzähler es dem Spieler schon gezeigt hat (Ankunft, Angriff, Anwesenheit). Dieselbe Tatsache erreicht die Engine über zwei Schreiber (Planner-Befehl und Extractor-Meldung). Die Engine liest Prosa mit eigenen Wortlisten erneut, obwohl das Modell die Bedeutung strukturiert liefert. Fehlende Zustandsbegriffe (Besitz, festes Angebot) werden aus Namen und Herkunft hergeleitet.
3. **Die Lehre des Zahlungsaudits wurde lokal umgesetzt und danach an anderer Stelle neu verletzt.** `.142`–`.144` haben die Wortlisten im Handel reduziert. `.169`–`.176` haben in `narration_evidence.js` einen neuen englischen Satzleser für Anwesenheit und Gildenbearbeiter aufgebaut. Im Pilot wurde damit 0 von 3 Bearbeitern erkannt.
4. **Die Reparaturform ist additiv.** Seit `.126` stehen 4428 eingefügten 556 gelöschte Zeilen gegenüber (8 : 1). `applyWorld` ist von 2542 auf 3092 Zeilen gewachsen. Neun der achtzehn Builds `.162`–`.179` sind Nachkorrekturen des unmittelbar vorangehenden Builds.
5. **Die Schutzschichten kosten messbar Spielbarkeit.** Rund jede fünfte Extractor-Meldung wird abgelehnt (18–21 % in allen drei Läufen). In Batch 28 wurden 30 % der Spielerbefehle nicht ausgeführt. Im Pilot waren 13 % aller Modellaufrufe Reparaturen, 11 von 16 Planner-Reparaturen allein wegen der Preisbeleg-Regel.
6. **Drei begrenzte Strukturkorrekturen würden mehrere Ketten gleichzeitig schließen:** engine-bestätigte Ankunft für bekannte lokale Ziele, eine positive Quelle für Angriffsautorität statt eines Vetos mit Ausnahmen, und ein gespeicherter Besitzer an Objekten. Keine davon ist ein Großumbau; die erste braucht eine Kanonentscheidung.

---

## 2. Messbild seit `.126`

### 2.1 Code [C][H]

| Größe | `.126` (30.10.) | `.179` (10.11.) | Anmerkung |
|---|---|---|---|
| Quellcode `src` + `index.js` | 1935 KB | 2234 KB | +15 % in 11 Tagen |
| Commits / davon mit Quell- oder Contentänderung | – | 94 / 77 | 53 Builds |
| Einfügungen / Löschungen (`src`, `content`, `index.js`) | – | +4428 / −556 | 8 : 1; das `.126`-Audit maß für die Vorperiode 3,6 : 1 |
| `applyWorld` (eine Funktion, `world.js:241`) | 2542 Zeilen | 3092 Zeilen | +22 %; `world.js` in 30 von 77 Commits geändert |
| `narration_evidence.js` | 13 KB, 7 Wortlisten | 39 KB, 31 Wortlisten | +198 % (NPC E2-A) |
| `trade.js` | 23 KB, 15 Wortlisten | 33 KB, 11 Wortlisten | Wortlisten gesunken (`.144`), Besitzlogik gewachsen (`.175`–`.179`) |
| `firewall.js` | 33 KB | 34 KB | 1 Commit: stabil |
| `content/deltas.json` (Extractor-Vertrag) | 56 KB | 63 KB | Start am 28.09.: 12 KB; 37 Meldungstypen, 47 Regeln |
| Testdateien | 202 | 265 | |

Weitere Kennzahlen am Stand `.179` [C]:
- **Ablehnungsstellen:** `world.js` enthält 124 `reject(...)`-Aufrufe mit 57 verschiedenen Regelnamen. `commands.js` enthält 112 Stellen mit `status: 'refused'`. `parsePlan` hat 40 Fehler- und Hinweisstellen.
- **Korrekturen an den Erzähler:** 60 Stellen in `world.js` und 27 in `firewall.js` erzeugen einen Korrekturtext für den nächsten Engineblock.
- **Konstante Verzweigungen:** `campaignSupport` (`runtime.js:127`) lässt nur noch Pfad C, Ruleset 2 und `private_quests: false` zu. Trotzdem prüfen `world.js` und `commands.js` an etwa 230 Stellen `cPath`, `envx.c`, `rulesetOf(s) >= 2` oder `privateQuestsOf`.

### 2.2 Natürliche Läufe [D]

| Kennzahl | Batch 28 Warrior (`.154`) | User04 (`.159`) | Pilot 01 (`.174`) |
|---|---|---|---|
| Erzählzüge mit Extraktion | 365 | 36 | 63 |
| Extractor-Meldungen / abgelehnt | 1386 / 297 (**21,4 %**) | 117 / 21 (**17,9 %**) | 263 / 51 (**19,4 %**) |
| Verschiedene Ablehnungsregeln | 31 | 7 | 19 |
| Häufigste Ablehnungsregel | `scene_context` 96 (32 %) | `world_rule` 8 | je 6: `pulse`, `offer`, `world_rule`, `engine_owned_fact` |
| Extraktionen mit Reparaturaufruf | 65 (17,8 %) | 2 | 12 (19 %) |
| Aufgelöste Spielerbefehle | 386 | 31 | 55 |
| davon `refused` / `pending` / `clarify` | 83 / 28 / 4 (**29,8 %**) | 0 / 1 / 0 | 6 / 5 / 0 (20 %) |
| Ablehnung „arrival pending“ | 25 | 0 | 2 |

Modellaufrufe im Pilot (70 Eingaben, `calls.json`) [D]:

| Rolle | Aufrufe | Ø Prompt-Tokens | Summe Zeit |
|---|---|---|---|
| Planner | 67 + **16 Reparaturen** | 12 505 | 606 s + 130 s |
| Erzähler | 63 | 11 732 | 1623 s |
| Extractor | 63 + **12 Reparaturen** | 14 302 | 1059 s + 110 s |
| Board | 1 + 1 Reparatur | 2 627 | 43 s |
| **Summe** | **223**, davon 29 Reparaturen (13 %) | 2,88 Mio. Prompt-Tokens, davon 398 000 in Reparaturen | 3573 s |

Ein Erzählzug kostet im Mittel 45 700 Prompt-Tokens und 57 Sekunden Modellzeit. Der Extractor hat den größten Prompt.

**Wodurch die Reparaturen ausgelöst wurden** (aus den Reparaturanfragen in `chat-completions.jsonl`) [D]:

| Planner (16) | Anzahl |
|---|---|
| leere oder abgeschnittene Antwort (`finish_reason=length`, kein JSON) | 5 |
| **Preis- und Geldbeleg** (`price_evidence`, `money`, `agreed_cp`, `max_cp`) | **11** |
| davon als `quote_not_found` gemeldet | 5 |
| davon: erster Plan fachlich richtig, `agreed_cp` gleich dem gespeicherten Angebotspreis | mindestens 4 (T40, T48, T54, T55) |
| davon: echter Planfehler oder Preiskonflikt gefunden | 2 (T52, T53) |

| Extractor (12) | Anzahl |
|---|---|
| Szenenchronologie („here/final scene does not establish chronology“) | 4 |
| `null` in einem Textfeld (`role`, `fact.o`, `species`/`anchor`) | 3 |
| Form der Ortsreferenz (`{"new": …}`) | 2 |
| NPC-Kontinuität, Anwesenheit des Handelspartners, Preisbedingung | je 1 |

---

## 3. Fünf Problemketten

### 3.1 Kette A – Reise, Ankunft und Szenenchronologie

**Befund:** Ein `go` wird autorisiert, nicht ausgeführt. Die Ergebniszeile lautet „GOES — to X (the story decides whether and where he arrives)“ (`commands.js:698`) [C]. Bewegt wird Alaric erst nach der Erzählung durch eine `arrive`-Meldung des Extractors. Das ist die geltende Kanonregel ([02 §2](../02_DESIGN_KANON.md): „Nur autorisierte, bestätigte und chronologisch gültige `arrive`-Deltas bewegen den PC“).

**Folgen im Code [C]:**
- **Folgebefehle derselben Nachricht können nicht aufgelöst werden.** `afterTravel` (`commands.js:1741`) weist `activity`, `attempt`, `take`, `use`, `buy`, `offer.accept`, `sell`, `pay`, `equip` und `unequip` nach einem `go` mit „arrival pending“ ab.
- **Für jede Ausnahme entstand ein eigener Aufschubweg.** Sieben Arten von Bedingungsbefehlen: `turn_in`, `accept`, `board`, `abandon` (alle `arrive_guild_hall`), `give`, `use`, `spring`. Dazu kommt die Kaufentscheidung am Ziel (`destinationBuy`, `decision.opened`). Jeder Weg hat seinen eigenen Abwicklungsteil in `applyWorld` (`settleCanonicalPurchases` `world.js:2863`, `deskHandlers`, `giveReceiver`, der erneute Aufruf von `resolveCommands` in `objectMove`).
- **Eine Antwort kann mehrere Orte umfassen.** Der Extractor muss deshalb jede Meldung mit ihrer Szene versehen und die Ankünfte chronologisch einordnen. `sceneIssues` (`extract.js:328`) prüft das vor der Übernahme und löst eine Reparatur aus; `applyWorld` prüft es erneut und lehnt mit `scene_context` ab (`world.js:1024`, `1032`).
- **Die Statusleiter in `resolveCommands`** (`commands.js:1759` ff.) hat inzwischen elf Sprossen: `cutShort`, `destinationBuy`, `afterTravel`, `waitingGive`, `room`, `unmet`, mehrdeutige Zahlung, `trade.bought`, `trade.refused`, `appraise`, dann erst der Handler.

**Historie [H]:** `.74` (Dungeonankunft), `.92` (Szenenchronologie Run 16), `.99` (chronologische Weltwirkungen), `.100` (mehrdeutiges „here“), `.101` (explizite Ankünfte), `.103` (NPC-Chronologie), `.107`–`.109` (erzwungene Ortswechsel mit Erzählbeleg), `.113` (Dungeon-Ebenenankunft), `.117` (Abgabe bis zur Ankunft aufschieben), `.120`, `.152` (Zahlkarten bei Ankunft), `.155` (Stealth am Ziel), `.169`–`.171` (`met` an den Ankunftsschritt gebunden), `.177` K6a (Korrekturtext mit dem Endort). Das sind 18 Builds an derselben Naht.

**Daten [D]:**
- `scene_context` ist in Batch 28 mit 96 von 297 Ablehnungen die mit Abstand häufigste Regel.
- 4 der 12 Extractor-Reparaturen im Pilot betreffen die Szenenchronologie.
- „arrival pending“ macht in Batch 28 25 der 83 verweigerten Befehle aus.
- Pilot T61/T62: Hof, Begrüßung und eine Stunde Fahrt in einer Antwort. Der Name des Fuhrmanns, die Mitfahrt und das `met` gehen verloren (`scene_context`, `met_without_arrival`); die Korrektur an den Erzähler widerspricht der Kopfzeile ([Gegenreview B6/B7](../testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md)).

**Entscheidende Beobachtung [D]:** Wie oft nutzt die Erzählung die Freiheit, über die Ankunft zu entscheiden?

| Lauf | `go` zu bekanntem Ziel | am Ziel angekommen | davon mit offenem PULSE-Fenster |
|---|---|---|---|
| Pilot 01 (`.174`, mit PULSE) | 16 | 11 | 5 offen: **0 von 5** angekommen · 11 geschlossen: **11 von 11** angekommen |
| Batch 28 Warrior (`.154`, vor PULSE) | 74 | 60 (81 %) | – |
| User04 (`.159`) | 6 | 6 | – |

Seit PULSE (`.162`) entscheidet die Engine vor der Erzählung, ob auf dem Weg etwas geschieht (`pulseBegin`, `pulse.js:115`). Im Pilot folgte die Ankunft dieser Entscheidung ohne Ausnahme. Die Stichprobe ist klein (16 Fälle, ein Lauf). Sie zeigt aber: Die Engine kennt das Ergebnis im Regelfall schon, bucht es aber erst nach Erzählung, Extraktion, Szenenprüfung und Chronologieprüfung.

**Einordnung:** Die Regel „keine Ankunft aus bloßer Prosa“ ist ein notwendiger Schutz; `.74` hat aus gutem Grund prosagetriebene Teleports entfernt. Problematisch ist nicht der Schutz, sondern der **Zeitpunkt**: Die Ankunft ist die einzige häufige Spielerentscheidung, deren Ergebnis die Engine dem Erzähler überlässt und danach zurückliest. Fast alle Aufschub- und Chronologiemechanismen folgen aus diesem einen Punkt.

**Grenze:** In Batch 28 gingen 45 von 119 `go`-Zügen zu einem neuen oder unbekannten Ort (`to: {new: …}`). Diese Orte entstehen erst in der Erzählung. Für sie bleibt der heutige Weg nötig.

### 3.2 Kette B – Handel: zwei Schreiber, kein Besitzer

**Befund 1 – dieselbe Tatsache über zwei Kanäle [C]:** Ein Kauf wird von der Engine gebucht (`bookPurchase`, `trade.js:331`). Unabhängig davon meldet der Extractor aus der Erzählung, dass der Händler die Ware übergibt (`object.new`, `object.move`). `applyWorld` muss beide Beschreibungen als denselben Vorgang erkennen. Das geschieht über Namensähnlichkeit, Verkäufer und Stückzahl (`purchaseOf`, `world.js:388`, mit `sameGoods` als Schlüsselwortvergleich), über eine Warteliste (`deferred`, `awaitsPurchase`, `settleDeferred`) und über eine Sperrliste (`boughtNames`).

Dasselbe Muster auf der Planner-Seite: `buy`, `offer.accept`, `pay` und `give` können denselben Handel beschreiben. `resolveCommands` gruppiert sie deshalb zu Beginn („Related commands are alternate descriptions of one trade“, `commands.js:1648` ff.) und entscheidet über Betrag, Empfänger und Zweck, ob eine Zahlung zu einem Kauf gehört.

**Befund 2 – Besitz wird hergeleitet, nicht gespeichert [C]:** Ein Objekt hat einen `holder` (Person oder Ort), aber keinen Besitzer. Ob ein Gegenstand im Laden dem Händler gehört, schließt `wareOnSale` (`trade.js:301`) aus offenen Angeboten gleichen Namens, aus der Verknüpfung `line.object`, aus dem Angebotsstatus und aus Herkunftsmerkmalen.

**Die Kette [H]:**

| Build | Korrektur | Folgebefund |
|---|---|---|
| `.48` | Gekaufter und überreichter Stein waren zwei Objekte; Abgleich über Namen eingeführt | – |
| `.153` | Rüstungsidentität bei Übergabe | Batch 28: Rückgabe verliert den Objektkontext |
| `.174` (Pilot) | – | **ein bezahlter Primer, zwei Exemplare** (Kauf erzeugt neues Objekt, Planner-`take` holt das Schaustück) |
| `.175` K2/D5 | Angebotszeile mit genau einem passenden Objekt verknüpfen (`displayedWare`); Ware im offenen Angebot nicht per `take` | bei zwei gleichen Objekten keine Verknüpfung; nach Angebotsende kein Schutz |
| `.178` R2/P3 | Ladenware bleibt nach Angebotsende die des Händlers; eigenes Abgelegtes ist seins (`had_pc`); eine Sache je Zeile | `had_pc` heißt „war jemals seins“: verkaufte, wieder ausgestellte Ware lässt sich kostenlos zurücknehmen |
| `.179` | neues Merkmal `laid_by_pc` („seine letzte Bewegung“), im Reducer abgeleitet | bekannte Grenzen: nie angebotene Ware bleibt frei; Dieb legt ab → gesperrt; verknüpfte Ware gilt an jedem Ort weiter als Ware |

Jede Patchnote dieser Reihe hält ausdrücklich fest: „kein Eigentums- oder Diebstahlsystem“. Genau deshalb muss jede Korrektur den Besitz neu aus Indizien rekonstruieren. Drei Builds in zwei Tagen haben drei Herleitungsregeln ergeben (`wareOnSale`, `had_pc`, `laid_by_pc`), jede mit dokumentierten Restfällen.

**Befund 3 – die Preisbeleg-Regel ist der größte Reparaturauslöser [D][C]:** `.142`–`.144` haben die Preisprüfung konsolidiert: Der gespeicherte Angebotspreis gilt, und was der Planner als `price_evidence` zitiert, muss wörtlich und genau einmal in der Spielernachricht stehen (`findQuote`, `finance_evidence.js:37`: einmal gefunden gilt, mehrfach gefunden gilt als mehrdeutig). Im Pilot lösten 11 der 16 Planner-Reparaturen diese Prüfung aus. Vier Fälle im Einzelnen:

| Zug | Spielernachricht | Erster Plan | Grund der Reparatur | Nach der Reparatur |
|---|---|---|---|---|
| T55 | „I'll take the bed for three copper, as you offered.“ I pay her the three copper … | `offer.accept`, `agreed_cp: 3`, Zitat „three copper“; Angebot: 3 cp | das Zitat steht **zweimal** in der Nachricht | `agreed_cp: null`, Beleg `null`; gebucht 3 cp |
| T54 | „three copper for the bed, and two more for the mutton supper …“ I pay her three copper for the bed and two copper … | `agreed_cp: 3`, Zitat „three copper for the bed“; dazu `pay` 2 cp | beide Zitate stehen zweimal in der Nachricht | in diesem Zug nichts gebucht; das Bett wird erst in T55 gekauft |
| T40 | I take the fourteen coppers off the counter … | `agreed_cp: 14`, Zitat „Fourteen coppers the pair“ (Wortlaut des Händlers); Gebot: 14 cp | nicht wörtlich in der Nachricht | Beleg `null`; gebucht 14 cp |
| T48 | … count out the four copper … | `agreed_cp: 4`, Zitat „Four copper, the pair“; Angebot: 4 cp | nicht wörtlich | Zitat „the four copper“; gebucht 4 cp |

In allen vier Fällen war der erste Plan fachlich richtig und der genannte Preis der gespeicherte Preis. In T40, T48 und T55 wurde nach der Reparatur genau dieser Betrag gebucht; die Reparatur hat nur das Belegfeld verändert und in T55 eine richtige Angabe entfernt. In T54 kam trotz richtigem Plan keine Buchung zustande. Das Bett für 3 cp brauchte drei Züge (T53–T55). Jeder dieser Aufrufe kostet im Mittel 13 300 Prompt-Tokens und 8 Sekunden. Der Verkauf an Harl (T38–T40) löste in drei aufeinanderfolgenden Zügen je eine Reparatur für dieselben 14 cp aus.

Zwei der elf Reparaturen fanden einen echten Fehler (T52: Betrag 2 statt „five copper“; T53: 5 cp gegen ein Angebot über 3 cp). Die Prüfung ist also nicht nutzlos. Sie prüft aber auch dort, wo ihr Ergebnis nach der Regel aus `.144` („the stored price is the price he accepts“) nichts entscheiden kann.

**Befund 4 – Verkäufe brauchen mehrere Züge [D]:** In Batch 28 wurden 21 `sell`-Befehle mit „nobody to sell to“ und 22 Kauf- oder Verkaufsbefehle mit `no_price` verweigert. Im Pilot brauchten ein Fellverkauf (T37–T40; der Händler sagte „Fourteen the pair“ ohne Währungswort) und ein Bettkauf für 3 cp (T52–T55) je vier Züge. Der Gegenreview ordnet das als „Folge der gewollten Regel“ ein. Das stimmt; die Regel ist aber teuer.

**Einordnung:**
- **Notwendig und tragfähig:** `bookPurchase`, `bookSale`, `acceptBid`, `pickLines`, `linePrice`, natives `#pay`, die Endsummenregel aus `.144`. Kein untersuchter Fehler entsteht in diesen Funktionen. Das Zahlungsaudit kam zum selben Ergebnis.
- **Problematisch:** der Namensabgleich zwischen Enginebuchung und Extractormeldung, die Herleitung von Besitz und die Reparaturpflicht für einen Beleg, den die Engine nicht braucht.

### 3.3 Kette C – Prosa als Autorisierungsbeleg

**Befund [C]:** Für einige Extractor-Meldungen verlangt die Engine ein wörtliches Zitat aus der Antwort und prüft dieses Zitat mit eigenen Wortlisten.

| Meldung | Prüfung | Wortlisten |
|---|---|---|
| `arrive.forced_by` (`.107`–`.109`) | `forcedRelocation` | `MOVES`, `SETS_OFF`, `DIRECTION`, `NEGATED`, `UNREAL`, `RECALLED`, `HEARSAY` |
| `enter` einer bekannten Person (`.107`, `.110`) | `narratedPresence` | wie oben |
| `hostile` / `intent` (`.71`, `.93`) | `attackCommitted` (`envelope.js:184`) | rund 50 Angriffsverben und Sonderphrasen, darunter „both of them committed“, „claws first … at“, „spews … toward“ |
| `expected.met` (`.169`–`.171`, `.176`) | `metEvidence`, `presentHere`, `leftBeforeHim` | `HERE_DOES` (rund 90 Verbformen), `SEES`, `LOCATIVE`, `LOOK_BACK`, `ELSEWHERE`, `SETTLEMENT`, `LINGER`, `DEPARTS_TO`, `LEFT_PLACE`, Pronomenauflösung |
| `expected.handled_by` (`.169`, `.176`) | `deskHandlingEvidence` | `HANDLES` (30 Verben), `HANDLES_WITH_OBJECT`, `DESK_OBJECT` |

**Die Kette `met` [H]:**
- `.169`: `met` eingeführt. GPT-Gegenprobe: „The clerk had left the Guild hall before Alaric arrived“ wird als Anwesenheit gelesen (P2).
- `.170`: `presentHere` ergänzt. GPT-Gegenprobe: erst anwesend, dann vor Alarics Ankunft gegangen, im selben Satz mit Konjunktion (P2).
- `.171`: `leftBeforeHim` ergänzt. Der Kontrollreview hält verbleibende „konservative False Negatives“ als P3 fest.
- Pilot auf `.174`: `met` scheitert an mit „...“ verbundenen Zitaten (T24, T33, T61); `handled_by` wird **0 von 3-mal** angenommen. Folgekette T24: Schreiberin nicht anwesend → `desk_handler` abgelehnt → Persönlichkeitsanker abgelehnt.
- `.176` K4: Teilzitate zulässig, vier weitere Schalterverben, aber nur mit Schalterding.

**Bewertung:**
- Das Zahlungsaudit hat diese Klasse am 31.10. als **W1** benannt: „Die Engine versteht Semantik selbst, statt Belege zu prüfen … Positive Wortlisten sind in einer offenen Sprache prinzipiell unvollständig. Deshalb findet jeder Review neue Sätze.“ Die Finanzkorrektur `.142`–`.144` hat daraus die richtige Konsequenz gezogen. E2-A hat acht Tage später dasselbe Muster für Anwesenheit neu aufgebaut.
- **Die Reviews haben die Heuristik gegen konstruierte Sätze gehärtet, nicht gegen natürliche Häufigkeit.** `.170` und `.171` schließen je einen Gegenfall, den ein Reviewer aus dem Code abgeleitet hat. Der natürliche Lauf zeigt danach das Gegenteil des Reviewrisikos: keine falsche Anwesenheit, aber kaum erkannte echte.
- **Zwei Kanäle für dieselbe Tatsache:** Eine bekannte Person kann über `met` oder über `enter` in die Szene kommen, mit zwei verschiedenen Belegprüfungen. Im Pilot scheiterte `met` bei Hessa (T17) und bei der Schreiberin (T33); beide Male buchte der `enter`-Weg die Person korrekt [D, Gegenreview B4/B8]. Der strengere Kanal hat also in diesen Fällen nichts geschützt, was der andere nicht durchließ.

**Abgrenzung:** Ein Beleg, dass etwas **in dieser Antwort steht**, ist ein notwendiger Schutz gegen erfundene Meldungen. Überkomplex ist erst der zweite Schritt, in dem die Engine aus dem gefundenen Text mit Verblisten selbst herausliest, **was** er bedeutet.

### 3.4 Kette D – Kampfautorisierung: Veto mit Ausnahmen

**Befund [C]:** Eine `hostile`-Meldung durchläuft in `envelopeAllows` (`world.js:552`–`610`) nacheinander:
1. die Firewall über alle Meldungen (`world.js:335`) und noch einmal je Schritt (`world.js:996`);
2. die PULSE-Sperre für in dieser Antwort neu eingeführte Wesen, mit vier Ausnahmen: laufender Kampf, aktiv gesuchter Kontakt (`soughtMatch`, `.163`), Slotgegner dieses Zugs (`aheadBorn`, `.175`), offenes Gefahrenfenster mit genau einer Gruppe;
3. die ältere Straßenregel `auth.road === 'quiet'` („older campaigns“);
4. `mayOpenFight` (Temperament und Rolle);
5. `attackCommitted` mit Aliasbildung aus Name, Art, Deskriptoren und Gruppenwörtern.

Jede Ablehnung schreibt eine Korrektur für den nächsten Engineblock: „X did not attack Alaric in the last reply … no fight started.“

**Der Pilotfall T65 [D][H]:** Die Engine bucht per DUNGEON AHEAD selbst drei Goblins und weist den Erzähler an, „exactly these“ zu bringen. Der Erzähler lässt sie angreifen. Die PULSE-Sperre verwirft das sechsmal. `.175` K1 nimmt die Slotgegner von der Sperre aus. Die Patchnote hält fest, dass der Originalfall danach **trotzdem keinen Kampf eröffnet**: Das Zitat „… and it came“ erfüllt `attack_commitment` nicht („bestehende Strenge außerhalb dieses Auftrags“). Ein Tor wurde geöffnet, das nächste hält denselben Fall weiter auf.

**Strukturelle Ursache:** PULSE ist als **Veto im Übernahmepfad** gebaut: Kein neu eingeführtes Wesen greift an, außer eine Ausnahme trifft zu. Jede Quelle legitimer Gegner, die es vorher schon gab (Jagdziele, Dungeon-Slots, bereits Anwesende, laufende Kämpfe), braucht deshalb eine Ausnahme. Die Ausnahme für gesuchte Kontakte musste in `.163` korrigiert werden, die für Slotgegner kam erst mit `.175` dazu. `.165`, `.166` und `.168` korrigierten weitere Schnittstellen desselben Fensters (Rastzeit, Lern- und Wiederholungsausschlüsse im Dungeon). Die Liste der PULSE-Ausschlüsse im Kanon ([02 §8](../02_DESIGN_KANON.md)) umfasst inzwischen elf Bedingungen.

**Der Autoritätskonflikt dahinter:** Der Spieler hat den Angriff gelesen. Die Engine verwirft ihn danach. Der nächste Erzählerprompt enthält eine Korrektur, die dem sichtbaren Text widerspricht. Das ist bei **nicht autorisierten** Angriffen der richtige Preis für Spielerhoheit. Bei Gegnern, die die Engine selbst für diesen Zug gestellt hat (Slot, offenes Gefahrenfenster), ist es ein Widerspruch der Engine gegen ihre eigene Vorentscheidung.

**Einordnung:**
- **Notwendig:** PULSE als ein deterministischer Wurf vor der Erzählung; `mayOpenFight`; die Regel, dass eine Drohung kein Angriff ist; Engine-Hoheit über Erstschlag und Schaden.
- **Redundant:** die Straßenregel für alte Kampagnen (Punkt 3, durch `campaignSupport` unerreichbar); die positive Verbprüfung bei Gegnern, deren Angriff die Engine vorab zugelassen hat.

### 3.5 Kette E – Identität aus Modellhand: Absprachen und Personen

**Befund [H][D]:** Der Extractor vergibt oder wählt die Identität (Thread-ID, Personenreferenz), die Engine bewacht sie nachträglich mit Text- und Rollenvergleichen.
- `.172`: Zuordnung ohne ID verschmilzt eigenständige Absprachen mit gemeinsamer NPC-Partei (P2) → `.173`: Art, Parteien, Eindeutigkeit.
- Pilot: bestehende ID mit einer **anderen Schuld** überschrieben (B3); Pseudo-Absprache aus einem Bericht (B4) → `.177` K5/D1: Text bleibt, fremde Partei und reine ID-Erledigung abgelehnt.
- `.178` R1: „the clerk“ bei zwei Schreibern erledigt keine fremde Zusage mehr; Rollenwort nur, wenn es einer Person allein gehört.
- Bekannte Grenze in [03](../03_AKTUELLER_PROJEKTSTAND.md): „Eine andere Sache derselben Parteien unter alter ID ist deterministisch nicht erkennbar.“
- Personen: zweiter Fuhrmann als Duplikat, weil `keptHere` nur bei `present !== false` greift (B6).

**Bewertung:** Diese Kette ist kürzer und anders gelagert als A–D. `.177` D1 („eine Absprache behält ihren Text“) ist bereits eine Strukturregel statt einer Heuristik. Die dokumentierte Restgrenze ist ehrlich und lässt sich deterministisch nicht schließen. **Hier ist kein weiterer Patch begründet**, solange die natürliche Wirkung von K5a nicht gemessen ist.

---

## 4. Gemeinsame Ursachen

| | Ursache | Ketten | Kern |
|---|---|---|---|
| **U1** | **Zeitpunkt der Autorität** | A, D, C | Die Engine entscheidet nach der Erzählung über etwas, das der Spieler schon gelesen hat. Wo sie vorher entscheidet (Würfel, PULSE-Fenster, DUNGEON AHEAD, `offer.accept`, `#pay`), ist das System stabil. |
| **U2** | **Zwei Schreiber für eine Tatsache** | B, C, A | Planner-Befehl mit Enginebuchung und Extractor-Meldung aus der Erzählung beschreiben denselben Vorgang. Der Abgleich läuft über Namen, Mengen und Reihenfolge: `purchaseOf`, die `trades`-Gruppierung, `met` neben `enter`, `expected.arrived` neben `arrive`. |
| **U3** | **Bedeutung wird doppelt gelesen** | C, D, B | Das Modell liefert eine typisierte Aussage; die Engine liest den Text mit positiven Wortlisten erneut. Im Handel seit `.144` abgebaut, in `narration_evidence.js` seit `.169` neu entstanden, in `attackCommitted` seit `.71` unverändert. |
| **U4** | **Hergeleitete statt gespeicherte Begriffe** | B, E | Besitz (`had_pc` → `laid_by_pc`), „Ware im Angebot“, festes gegen bedingtes Angebot (Pilot B10: das Abendessen wird nie buchbar). Jede Herleitung hat Restfälle, die als nächster Review-Befund zurückkommen. |
| **U5** | **Additive Reparaturform** | alle | Eine Korrektur ist fast immer eine weitere Bedingung oder Ausnahme in einer bestehenden Leiter. Nichts wird entfernt: 8 : 1 Einfügungen zu Löschungen, 230 konstante Pfadprüfungen, die Straßenregel für alte Kampagnen, `evidenced()` mit dem Kommentar „Legacy paths only“. |
| **U6** | **Prüfrhythmus** | C, B, D | Enger Patch, dann Code-Gegenprobe mit konstruiertem Gegenfall, dann Mikrobuild. Neun von achtzehn Builds `.162`–`.179` sind solche Nachkorrekturen. Zwischen User04 (`.159`) und Pilot 01 (`.174`) lagen fünfzehn Builds ohne natürlichen Lauf; `.175`–`.179` sind wieder ungeprüft. |

**U6 verdient eine eigene Erläuterung.** Der Ablauf „Rot/Grün am Originalfall, dann unabhängiger Diff-Review“ ist richtig und steht in [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md). Er hat aber eine Schlagseite: Ein Reviewer, der Code liest, findet zuverlässig Sätze, die eine Heuristik **fälschlich annimmt**. Er findet kaum die natürlichen Sätze, die sie **fälschlich ablehnt**; die zeigen sich nur im Lauf. Jede Runde macht die Heuristik deshalb strenger. Kette C ist der klare Fall: drei Builds gegen falsch-positive Anwesenheit, danach 0 von 3 erkannte Bearbeiter. Kette B zeigt dieselbe Dynamik bei D5: Jede Gegenprobe ist ein mehrstufiges konstruiertes Szenario (verkaufen, ausstellen, anbieten, zurücknehmen), keines davon ist in einem natürlichen Lauf aufgetreten.

---

## 5. Zuständigkeiten: wo die Autorität kollidiert

Der Kanon ([02 §2](../02_DESIGN_KANON.md)) verteilt die Rollen klar. Die Konflikte entstehen an vier Nahtstellen, an denen zwei Rollen dieselbe Tatsache schreiben oder eine Rolle die Arbeit einer anderen wiederholt.

| Nahtstelle | Wer schreibt | Konflikt | Beleg |
|---|---|---|---|
| **Ankunft** | Planner autorisiert, Erzähler entscheidet, Extractor meldet, Engine prüft Chronologie | vier Rollen für eine Ortsänderung; Informationsverlust bei jeder Stufe | Kette A; Pilot T61 |
| **Besitzwechsel** | Planner (`take`, `buy`), Engine (`bookPurchase`), Extractor (`object.move`) | drei Schreiber für ein Objekt | Pilot B5: Kauf, abgelehnte Extractorbewegung und Planner-`take` ergeben zwei Primer |
| **Anwesenheit** | Extractor über `person.new`, `enter`, `expected.met`, `present: false`; Engine über `KNOWN AT` und `keptHere` | vier Meldewege, zwei Belegprüfungen | Kette C; Pilot B6 |
| **Angriff** | Engine (PULSE, Slot) lässt zu, Erzähler erzählt, Extractor meldet, Engine prüft Verben | die Engine widerspricht ihrer Vorentscheidung | Kette D; Pilot T65 |

**Informationsverlust zwischen Engine und Erzähler [D]:** Wo die Ergebniszeile der Engine eine Lücke lässt, füllt der Erzähler sie frei, und die Engine lehnt die Folgen später ab.
- Pilot B9: „NOT BOUGHT — not enough coin“ ohne Börse und Fehlbetrag. Der Erzähler erfindet einen Wechselkurs; der Spieler verliert rund 15 Züge. `.176` K7 ergänzt den Text.
- Pilot B10: „NOT BOUGHT — no single valid canonical offer“. Der Erzähler lässt Alaric trotzdem zahlen.

Die 112 Ablehnungsstellen in `commands.js` formulieren ihre Zeile jeweils frei. Es gibt keinen gemeinsamen Vertrag, was eine Ablehnung dem Erzähler mindestens sagen muss (was nicht geschah, warum, was Alaric stattdessen tun kann). K7 hat eine Zeile verbessert; die Klasse besteht fort.

**Regelkonforme Komponenten, wiederkehrender Fehler:** In den Pilotfällen B5, B6 und T65 hat jede Komponente für sich nach ihrer Regel gehandelt. Der Fehler entsteht in der Summe. Das ist das Kennzeichen einer Zuständigkeitsfrage und der Grund, warum Einzelkorrekturen hier nicht konvergieren.

---

## 6. Zustandsintegrität und Wartbarkeit

### 6.1 Event-Sourcing: tragfähig

- **Fold-Schutz (`.127`):** kein Planneraufruf, keine Buchung und kein Record auf einem unvollständigen Fold (`runtime.js`, `foldBlock`). Das ist die wichtigste Integritätsgrenze und sollte unverändert bleiben [C].
- **Ergebnisse statt Eingaben:** Records speichern die gebuchten Events. Prosa wird beim Falten nie erneut gelesen. Swipe, Reload und Regenerate entscheiden nichts neu [C].
- **Abgeleitete Merkmale im Reducer:** `laid_by_pc` und `had_pc` entstehen beim Falten (`domain.js:120`–`143`). Das spart Migrationen. Es bedeutet aber auch: Dieselben Events ergeben auf einem neueren Build einen anderen Zustand. Bisher ist das unkritisch, weil die Merkmale nur Schutzentscheidungen steuern [C][P].

### 6.2 Mehrere Prüfzeitpunkte

Eine Spielerhandlung durchläuft bis zu elf Prüfungen: `parsePlan` → Agency-Guard → `mapPlan` → Handler in `resolveCommands` → Erzählung → `parseExtraction` (Schema, `sceneIssues`, semantische Hinweise) → Firewall gesamt → Firewall je Schritt → Handler in `applyWorld` → aufgeschobene Abwicklung → `validateState` [C].

**Bewertung:** Die meisten Doppelungen sind gewollt und sauber gelöst: Dieselbe Funktion prüft einmal vor der Übernahme, um eine Reparatur auszulösen, und einmal bei der Übernahme, um abzulehnen (`sceneIssues`, `acceptanceWhy`). Das ist kein Overengineering.

Zwei Punkte sind kritischer:
- **Firewall doppelt.** Der erste Durchlauf prüft alle Meldungen gegen den Zustand vor der Antwort (`world.js:335`), der zweite jede Meldung gegen den Zustand an ihrem Schritt (`world.js:996`, seit 28.09.). Der zweite ist der fachlich richtige. Der erste dient heute vor allem dazu, Vorausblicke zu berechnen (`explicitArrival`, `hostileRefs`, `refusedMoves`). Ein konkreter Fehler daraus ist nicht belegt [P].
- **Aufgeschobene Abwicklung.** `deferred`, `settlements`, `conditionals`, `pendingSteps`, `pendingRefs` und `implicitArrivals` sind sechs getrennte Wartelisten innerhalb einer Funktion, jede mit eigener Abarbeitungsstelle. Sie folgen fast alle aus U1 und U2.

### 6.3 Replay

Der Replay-Vergleich (2235 Fälle) ist ein wertvoller Änderungsdetektor und sollte bleiben. Zwei Schwächen [H]:
- **Die Basis ist `.126`.** 1057 der 2235 Fälle weichen ab und sind über 19 Akzeptanzdateien einzeln per Fingerprint freigegeben.
- **Der Korpus stammt aus Läufen bis `.126`.** Er enthält keine `met`-, `handled_by`-, PULSE- oder Thread-Parteien-Fälle. Die Patchnotes sagen es selbst: „keine Korpusfälle mit Dungeoneintritt vom Knoten oder ausgestellter Kaufware“. „Replay 0 geändert“ ist für die NPC- und PULSE-Patches deshalb fast immer wahr und belegt wenig.

### 6.4 Tote Pfade

`campaignSupport` sperrt V3, Pfad A, Ruleset 1, formale Privatquests und alte F-Konfigurationen. Im Code bleiben [C]:
- rund 230 Prüfungen auf `cPath`, `envx.c`, `rulesetOf(s) >= 2`, `privateQuestsOf`;
- `interpretMessage` und der Interpreterzweig in `prepareGenerationAsync` (Pfad A);
- `evidenced()` (`world.js:2840`, „Legacy paths only“);
- die Straßenregel `auth.road === 'quiet'` („older campaigns“);
- der V3-Regexparser, der bei jeder Nachricht für die Telemetrie `a0` läuft.

Das [Paket E](../patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md) des `.126`-Plans („nachrangig, größer“) wurde nicht begonnen. Seitdem trägt jede neue Bedingung das Präfix `cPath && rulesetOf(s) >= 2 &&` weiter. Das kostet keine Laufzeit, aber Lesbarkeit an genau den Stellen, die am häufigsten geändert werden.

### 6.5 `applyWorld`

Das `.126`-Audit hat die Funktion mit 2542 Zeilen als Hauptproblemzone benannt; entschieden wurde „kein vollständiges World-Modul-Refactoring“. Seitdem sind 550 Zeilen dazugekommen. Positiv: Die neuen Fachteile liegen überwiegend in eigenen, reinen Modulen (`pulse.js`, `narration_evidence.js`, `threads.js`, `finance_evidence.js`). Gewachsen ist `applyWorld` dort, wo diese Module an den gemeinsamen veränderlichen Zustand der Funktion angeschlossen werden (16 veränderliche Variablen und 36 Sets, Maps und Listen, die über alle Meldungen einer Antwort geteilt werden, darunter `bornHere`, `aheadBorn`, `metDone`, `metEntered`, `pulseHostile`, `sceneUnreached`).

---

## 7. Spielbarkeit

**Unnötige Ablehnungen und Zusatzzüge [D]:**
- **Zusammengesetzte Eingaben scheitern am zweiten Teil.** „Ich gehe zum Schmied und kaufe …“ ergibt „arrival pending“, sofern kein Preislimit genannt ist. 25 Fälle in Batch 28. Jeder kostet einen weiteren Zug mit drei Modellaufrufen.
- **Verkauf braucht Vorlauf.** 43 verweigerte Handelsbefehle in Batch 28 wegen fehlendem Käufer oder Preis. Ein Verkauf braucht mindestens: Ware zeigen, Gebot abwarten, annehmen.
- **Währungswort und Preisbeleg.** „Fourteen the pair“ bindet nicht. Im Pilot je vier Züge für einen Fellverkauf und für ein Bett zu 3 cp.
- **Kampfbeginn.** Nach T65 schlug Alarics erster Hieb ins Leere, weil kein Kampf lief; der Kampf begann zwei Züge später ohne Hinterhaltsregel.

**Zusätzliche Modellaufrufe [D]:** 29 Reparaturen auf 70 Eingaben. Mindestens 7 davon änderten am Ergebnis nichts, das die Engine nicht selbst hätte festlegen können: 3 Preisbelege bei identischem gespeichertem Preis (§3.2; ein vierter verhinderte zusätzlich die Buchung) und 3 `null`-Felder im Extractor.

**Handlungsschleifen [D]:** Im Pilot keine technische Blockade. Die Wechselkursschleife T27–T42 entstand aus einer zu knappen Ergebniszeile, nicht aus einem Guard.

**Kontext [D, D3-Analyse]:** Priorität 0 belegt im Mittel 1320 von 1400 Tokens. Der Abruf `relevant` erreicht den Erzähler in 2 von 65 Zügen. Ein Teil der Priorität-0-Last ist `resolved` (bis 706 Tokens) mit den Ergebnis- und Ablehnungszeilen der Engine; je mehr Sonderhinweise eine Zeile trägt, desto weniger bleibt für `present` und `relevant`. Korrekturen haben ein eigenes Kontingent und zählen nicht ins Budget (`context.js:854`), verlängern aber den Prompt. Die [D3-Analyse](../testrun_10b/npc-20261109-160250Z/D3_KONTEXTANALYSE_RELEVANT.md) hat das gemessen; ich übernehme ihre Empfehlung (Teillieferung, keine Budgeterhöhung).

**Spielerfreiheit:** Die Agency-Guard ist unauffällig (Pilot 1 verworfener Befehl, Batch 28 8). Sie schränkt nicht spürbar ein. Die Einschränkung entsteht nach der Erzählung, nicht davor.

---

## 8. Was erhalten bleiben sollte

| Lösung | Warum sie trägt |
|---|---|
| **Fold-Schutz `.127`**, Events als Ergebnisse, Swipe/Reload ohne Neuentscheidung | einzige harte Integritätsgrenze; seit Einführung kein Folgebefund |
| **Atomare Buchungsfunktionen** (`bookPurchase`, `bookSale`, `acceptBid`, `pickLines`) | kein untersuchter Fehler entsteht hier |
| **Autoritätstabelle der Firewall** | seit `.126` ein einziger Commit; entscheidet nach Eigentümer des Zustands, nicht nach Plausibilität |
| **Decision Ownership als Testzusicherung** (`ownership.js`, `DELTA_WRITES`, `grant`) | deklarativ, nur im Testmodus aktiv, keine Laufzeitkosten, fängt neue Schreibwege |
| **PULSE als ein deterministischer Wurf vor der Erzählung** | Musterfall für U1 richtig herum: Die Engine entscheidet zuerst, der Erzähler gestaltet |
| **DUNGEON AHEAD, Slotidentität** | dasselbe Prinzip; der Fehler T65 lag in der Sperre, nicht im Slot |
| **Finanzkonsolidierung `.142`–`.145`:** gespeicherter Preis gilt, Endsumme, natives `#pay` | hat Wortlisten real reduziert; der einzige Fall, in dem eine Kette strukturell geschlossen wurde |
| **`line.object` aus `.175`** | verbindet Angebot und Objekt über eine ID statt über Namen: genau die richtige Richtung |
| **D1 aus `.177`:** eine Absprache behält ihren Text | Strukturregel statt Heuristik |
| **Fail-soft und Recovery (10B-4)**, `isCurrent`-Schutz, `NOT EXECUTED` | hält Läufe fortsetzbar; im Pilot keine technische Blockade |
| **Reine Fachmodule** (`pulse.js`, `threads.js`, `finance_evidence.js`) | neue Logik außerhalb von `applyWorld`, testbar |
| **Rot/Grün am Originalfall, Replay als Änderungsdetektor, getrennte Nachweisarten** | richtige Methode; ergänzen, nicht ersetzen |
| **Agency-Guard** | geringe Eingriffsrate, klare Aufgabe |

---

## 9. Verbesserungsmöglichkeiten

Aufwand: **S** unter einem Tag, **M** ein zusammenhängender Fachpatch, **L** mehrere Tage mit Abnahme.

### V1 – Engine-bestätigte Ankunft für bekannte lokale Ziele

**Was:** Bei einem `go` zu einem **bekannten** Ort **innerhalb derselben Siedlung oder desselben bekannten Dungeonwegs**, mit **geschlossenem PULSE-Fenster**, ohne Stealth, ohne Hindernis oder verborgene Gefahr auf dem Weg, bucht die Engine die Ankunft selbst, bevor erzählt wird. Folgebefehle derselben Nachricht werden am Ziel normal aufgelöst. Die Ergebniszeile lautet „ARRIVES — at X“, die Antwort spielt in einer Szene. Reisen über Land, neue Orte, offene Fenster und Stealth behalten den heutigen Weg.

**Nutzen:** Schließt für diesen Fall „arrival pending“, die Guild-Hall-Bedingungsbefehle, die Kaufentscheidung am Ziel, `met_without_arrival` und die Szenenchronologie. Weniger `scene_context`-Ablehnungen und Chronologie-Reparaturen. Ein Zug statt zwei für „hingehen und handeln“.

**Risiken:**
- **Kanonänderung.** [02 §2](../02_DESIGN_KANON.md) bindet die Ortsänderung an `arrive`. Das braucht eine ausdrückliche Entscheidung.
- Der Erzähler kann trotzdem eine Unterbrechung erzählen. Dann steht Alaric im Zustand am Ziel, im Text nicht. Dieselbe Abweichung gibt es heute in umgekehrter Richtung; die Ergebniszeile muss die Ankunft als Tatsache nennen.
- Ankunftsfolgen, die heute in `applyWorld` hängen (`metArrivals`, `deskHandlers`, Zahlkartenablauf), müssen für diesen Weg zum Befehlszeitpunkt laufen.

**Aufwand:** L. **Vorstufe S ohne Verhaltensänderung:** im vorhandenen Korpus zählen, wie viele `go`-Schritte in diese enge Klasse fallen, wie viele davon ankommen und wie viele „arrival pending“- und `scene_context`-Fälle sie erklären. Die Pilotzahl (11 von 11) ist ein Hinweis, kein Beweis.

**Nicht empfohlen:** die Bedingungsbefehle verallgemeinern (alle Folgebefehle nach der Ankunft nachholen). Dann kennt der Erzähler das Ergebnis nicht, und Text und Zustand laufen häufiger auseinander.

### V2 – Angriffsautorität als positive Quelle

**Was:** `envelopeAllows` fragt nicht mehr „greift eine Sperre, außer …“, sondern „welche Quelle erlaubt diesen Angriff?“. Quellen: laufender Kampf; war vor dieser Antwort anwesend; von der Engine für diesen Zug gestellt (Slot); aktiv gesucht; offenes Gefahrenfenster (eine Gruppe). Keine Quelle: Ablehnung wie heute. **`attackCommitted` gilt nur noch für die Quelle „war anwesend“**, also dort, wo der Erzähler von sich aus eskaliert. Für Slotgegner und Fenstergegner genügt die `hostile`-Meldung mit einem Zitat, das in der Antwort steht.

**Nutzen:** Schließt den Restfall T65 und die Klasse „Engine widerspricht ihrer Vorentscheidung“. Neue Quellen sind künftig ein Eintrag, keine Ausnahme von einem Veto. Die tote Straßenregel entfällt.

**Risiken:** Ein vom Erzähler nur angedeuteter Angriff eines Slotgegners eröffnet den Kampf mit Erstschlag. Das ist im Dungeon gewollt („DUNGEON AHEAD bleibt Autorität“), sollte aber als Regel bestätigt werden. Logisch ist die Umstellung für alle übrigen Fälle gleichwertig; das lässt sich mit den vorhandenen PULSE- und K1-Regressionen prüfen.

**Aufwand:** S bis M (rund 60 Zeilen in einer Funktion, bestehende Tests als Netz).

### V3 – Besitzer als gespeichertes Feld

**Was:** Objekte erhalten `owner` (Person, `pc` oder leer). Gesetzt wird es durch Kauf, Verkauf, Geschenk und eigenes Ablegen; bei Ladenware durch die Verknüpfung aus `.175` oder eine Angabe des Extractors. `take` von einem Ort ist frei, wenn der Besitzer leer oder `pc` ist. `wareOnSale` prüft `owner` und `line.object` statt Namen und Herkunft; `laid_by_pc` entfällt, `had_pc` bleibt für Lieferung und Dungeonfunde.

**Nutzen:** Beendet die Kette `.175` → `.178` → `.179` und ihre dokumentierten Restfälle. Schafft nebenbei die Grundlage, falls ein Diebstahlsystem je gewünscht wird, ohne es einzuführen.

**Risiken:** Fehlende Besitzangabe bei erzählter Ladenware; als Rückfall bleibt die heutige Namensregel. Alte Spielstände ohne Feld verhalten sich wie heute.

**Aufwand:** M. **Empfehlung:** nicht jetzt als eigener Patch, sondern **anstelle** des nächsten D5-Herkunftsmerkmals, sobald ein weiterer Besitzbefund auftritt.

### V4 – Reparaturaufrufe nur dort, wo sie etwas entscheiden

**Was:**
- **Planner, gleicher Preis:** Nennt ein `offer.accept` (oder ein `sell` auf ein offenes Gebot) als `agreed_cp` genau den gespeicherten Preis, wird der Preisbeleg nicht geprüft. Nach `.144` gilt ohnehin der gespeicherte Preis; der Beleg kann das Ergebnis nicht ändern.
- **Planner, mehrfaches Zitat:** Steht das Zitat mehrfach in der Nachricht und nennt jede Fundstelle denselben Betrag, gilt es als gefunden.
- **Extractor:** Ein `null` in einem Textfeld wird lokal behandelt (Feld weglassen, bei Pflichtfeldern die Meldung über den vorhandenen semantischen Weg ablehnen), statt die ganze Antwort neu anzufordern. `.177` K8 hat denselben Fall als Text „null“ bereits lokal gelöst.
- Abweichender Preis, Preislimit, freie Zahlung und der Konfliktpfad aus `.144` bleiben unverändert geprüft.

**Nutzen:** Im Pilot 4, vermutlich 6 der 16 Planner-Reparaturen (T40, T48, T54, T55; T38 und T39 betreffen dasselbe 14-cp-Gebot) und 3 der 12 Extractor-Reparaturen. Das sind rund 100 000 bis 125 000 Prompt-Tokens und 60 bis 75 Sekunden auf 70 Eingaben, gehäuft in Handelszügen. Dazu ein gesparter Spielerzug wie T54. Keine Schutzregel wird gelockert.

**Risiken:** gering. Der Fall „gleicher Preis“ ist per Definition konfliktfrei. Beim mehrfachen Zitat muss jede Fundstelle denselben Betrag tragen, sonst bleibt es mehrdeutig.

**Aufwand:** S. Rot/Grün mit den vorhandenen Pilotanfragen.

**Daneben (kein Architekturthema):** fünf leere Planner-Antworten mit `finish_reason=length`. Das ist eine Frage von Ausgabebudget und Reasoning-Einstellung.

### V5 – Belegprüfung: Fundstelle statt Verständnis

**Was:** Für `met` und `handled_by` entfallen die positiven Verblisten (`HERE_DOES`, `HANDLES`, `SEES`, `LOCATIVE`). Es bleibt: Das Zitat steht in der Antwort, außerhalb wörtlicher Rede, und die vorhandenen negativen Filter (Verneinung, Möglichkeit, Erinnerung, Hörensagen, „left before“) greifen nicht. Dazu ein Meldeweg für die Rückkehr einer bekannten Person statt zwei (`met` und `enter` mit derselben Prüfung).

**Nutzen:** Wendet W1 des Zahlungsaudits auf die Anwesenheit an. Höhere Erkennungsrate bei Bearbeiter und Wiederbegegnung, deutlich weniger Satzleser, keine weiteren Verbnachträge.

**Risiken:** mehr falsch-positive Anwesenheit. Die Folgen sind begrenzt: eine Person in der Szene und ein Wissensfakt, kein Geld, kein Kampf. Die negativen Filter aus `.170`/`.171` bleiben erhalten.

**Aufwand:** M. **Voraussetzung:** erst den natürlichen Lauf auf `.179` abwarten. Bleibt die Erkennung nach K4 schwach, ist das der Auslöser; wird sie gut, ist V5 optional.

### V6 – Tote Pfade entfernen

**Was:** Die durch `campaignSupport` unerreichbaren Zweige konstant auflösen: `cPath`, `envx.c`, `rulesetOf >= 2`, `privateQuestsOf`, Interpreterpfad A, `evidenced()`, Straßenregel. Keine fachliche Änderung.

**Nutzen:** Kürzere Bedingungen an den meistgeänderten Stellen; weniger Gelegenheit, einen Fix nur in einem Zweig zu setzen.

**Risiken:** Tests, die bewusst alte Pfade fahren, müssen mit entfallen oder umgestellt werden. Abnahme über Replay mit Differenz 0 und Vollsuite, wie im `.126`-Plan für Paket E vorgesehen.

**Aufwand:** M, in Scheiben möglich (zuerst `world.js` und `commands.js`).

### V7 – Replay-Korpus und Basis erneuern

**Was:** Pilot 01 und jeden künftigen natürlichen Lauf in den Korpus aufnehmen. Die Basis einmalig auf den aktuellen Build setzen, damit die 1057 Einzelfreigaben entfallen.

**Nutzen:** „Replay 0 geändert“ sagt wieder etwas über NPC-, PULSE- und Handelsänderungen aus.

**Risiken:** gering; die alte Basis bleibt über Git erreichbar. **Aufwand:** S bis M.

### V8 – Ablehnungsvertrag und Guard-Bilanz

**Was:**
- **Ablehnungszeile mit Mindestinhalt:** was nicht geschah, der mechanische Grund mit den Zahlen der Engine, was Alaric tun kann. Eine gemeinsame Funktion statt 112 freier Formulierungen, schrittweise beim nächsten Anfassen.
- **Guard-Bilanz je natürlichem Lauf:** Der Review zählt je Ablehnungsregel, wie viele Fälle ein echter Schutz und wie viele eine Fehlablehnung waren (Stichprobe genügt). Eine Regel, die überwiegend Fehlablehnungen erzeugt, wird gelockert oder ersetzt, nicht ergänzt.

**Nutzen:** Macht U6 sichtbar: Die Kosten eines Guards stehen neben seinem Nutzen. Verhindert die Klasse B9.

**Aufwand:** S für die Bilanz (reine Reviewarbeit), M verteilt für die Zeilen.

**Erster konkreter Schritt:** 30 der 96 `scene_context`-Ablehnungen aus Batch 28 klassifizieren. Das beantwortet zugleich die Vorstufe von V1.

### V9 – Wachstumsgrenze für `applyWorld`

**Was:** Keine Neuaufteilung. Eine Arbeitsregel: Neue Fachlogik kommt als reine Funktion in ein Fachmodul; `applyWorld` erhält dafür einen Aufruf, keine neuen gemeinsamen Variablen. Der Handelsblock (`objectNew` bis `sale`, rund 600 Zeilen) wird beim nächsten größeren Handelsauftrag mit ausgelagert, nicht vorher.

**Nutzen:** stoppt das Wachstum, ohne das im `.126`-Plan abgelehnte Refactoring nachzuholen. **Aufwand:** keiner vorab.

---

## 10. Prioritäten

### Notwendig

| | Maßnahme | Begründung |
|---|---|---|
| 1 | **Natürlicher Lauf auf `.179` vor jedem weiteren Mikropatch** | `.175`–`.179` sind fünf Builds ohne natürlichen Nachweis; drei davon gehen auf konstruierte Gegenproben zurück (U6) |
| 2 | **V4 – Reparaturaufrufe nur dort, wo sie etwas entscheiden** | kleiner Eingriff mit direkt gemessenem Effekt auf Kosten und Wartezeit in Handelszügen; lockert keine Regel |
| 3 | **V8, Teil Guard-Bilanz** | ohne sie bleibt jede Guard-Verschärfung unbewertet; kostet nur Reviewzeit |

### Sinnvoll

| | Maßnahme | Begründung |
|---|---|---|
| 4 | **V2 – Angriffsautorität als positive Quelle** | schließt T65 vollständig und macht aus den Ausnahmen (`.163`, `.175`) benannte Quellen; klein |
| 5 | **V1 – engine-bestätigte lokale Ankunft**, zuerst die Messung | größter Hebel gegen Ablehnungen und Zusatzzüge; braucht Kanonentscheidung und sorgfältige Abnahme |
| 6 | **V7 – Replay-Korpus erneuern** | billig; stellt die Aussagekraft der Abnahme wieder her |
| 7 | **V6 – tote Pfade entfernen** | senkt das Risiko jeder künftigen Änderung in `world.js` und `commands.js` |
| 8 | **D3-Teillieferung** (bereits empfohlen) | unabhängig von diesem Audit; bestätigt |

### Optional

| | Maßnahme | Bedingung |
|---|---|---|
| 9 | **V3 – Besitzerfeld** | beim nächsten Besitz- oder D5-Befund anstelle eines weiteren Herkunftsmerkmals |
| 10 | **V5 – Fundstelle statt Verständnis für `met`/`handled_by`** | wenn der Lauf auf `.179` weiter schwache Erkennung zeigt |
| 11 | **V8, Teil Ablehnungsvertrag** | schrittweise beim Anfassen |
| 12 | **[Engine-Shop](../patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md)** | bleibt die grundsätzliche Antwort auf die Preisreibung; eigene Designentscheidung, hier nicht neu bewertet |

### Unverändert lassen

- Fold-Schutz, Eventmodell, Records, Swipe- und Reload-Verhalten.
- Buchungsfunktionen und die Finanzregeln aus `.142`–`.145` einschließlich Endsumme und `#pay`.
- Firewall-Autoritätstabelle und Decision-Ownership-Zusicherungen.
- PULSE-Wurf, Parameter und Fensterlogik; DUNGEON AHEAD.
- Absprachenidentität nach `.177`/`.178`: kein weiterer Patch, bevor K5a natürlich gemessen ist. Die Grenze „gleiche Parteien, andere Sache“ akzeptieren.
- D5 nach `.179`: kein weiterer Herkunftsfall ohne natürlichen Beleg.
- Agency-Guard, Fail-soft und Recovery.
- Keine Neuaufteilung von `applyWorld`, kein WorldTxn, kein allgemeines Transaktions- oder Identitätssystem.
- Keine Budget- oder Prioritätserhöhung im Kontext.

---

## 11. Langfristige Empfehlung

Die Frage des Auftrags lautet, ob wiederholt Symptome korrigiert werden, obwohl eine begrenzte Strukturverbesserung mehrere Ursachen beseitigen könnte. **Für die Ketten A bis D lautet die Antwort ja.** Für E und für den Kern der Engine lautet sie nein.

Damit 10B stabil bleibt, ohne neue Sonderfallketten aufzubauen, schlage ich sechs Arbeitsregeln vor. Sie ergänzen [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), ersetzen dort nichts und sind Vorschläge zur Entscheidung.

1. **Die Engine entscheidet vor der Erzählung, was sie vorher wissen kann.** Bei jedem neuen Befund zuerst fragen: Kannte die Engine das Ergebnis schon, bevor erzählt wurde? Wenn ja, gehört die Entscheidung in die Ergebniszeile, nicht in eine Prüfung der Erzählung. PULSE ist das Vorbild.
2. **Eine Tatsache, ein Schreiber.** Was die Engine gebucht hat, bekommt der Extractor als ID genannt und meldet es nicht neu. Ein neuer Meldeweg für etwas, das schon einen hat, braucht eine Begründung, warum der alte nicht genügt.
3. **Kein neues positives Vokabular.** Die Engine prüft, ob ein Zitat in der Antwort steht und ob es verneint oder hypothetisch ist. Sie entscheidet nicht anhand einer Verbliste, was es bedeutet. Braucht eine Regel ein neues Wort, ist das ein Zeichen, dass die Bedeutung als Feld in den Vertrag gehört.
4. **Der zweite Fix an derselben Stelle ist ein Strukturfall.** Findet ein Review einen Gegenfall in einer Heuristik, die im Build davor eingeführt oder erweitert wurde, wird nicht die dritte Bedingung ergänzt. Stattdessen wird geprüft, welcher Zustandsbegriff fehlt (U4) oder welcher Zeitpunkt falsch ist (U1). `.169` → `.171` und `.175` → `.179` wären nach dieser Regel je einmal angehalten worden.
5. **Jeder Guard hat eine Bilanz.** Konstruierte Gegenproben zeigen Fehlannahmen, natürliche Läufe zeigen Fehlablehnungen. Beides gehört in dieselbe Bewertung. Ein P2 aus einer Code-Gegenprobe ohne natürlichen Beleg rechtfertigt einen Patch nur, wenn er Geld, Kampf oder Questabschluss betrifft; sonst ist er ein Beobachtungspunkt für den nächsten Lauf.
6. **Jeder Patch nennt, was er entfernt.** Ein Fix, der eine Ausnahme ergänzt, sagt in der Patchnote, welche ältere Bedingung dadurch überflüssig wird, oder warum keine. Das Verhältnis von Einfügungen zu Löschungen ist kein Ziel, aber ein brauchbares Warnsignal.

**Empfohlene Reihenfolge:** natürlicher Lauf auf `.179` → Guard-Bilanz an diesem Lauf und an Batch 28 → V4 → V2 → Entscheidung über V1 anhand der Messung → V7 und V6 als begleitende Pflege. V3 und V5 nur bei ihrem Auslöser.

---

## 12. Grenzen dieses Audits

- **Keine Ausführung.** Alle Aussagen über Verhalten stammen aus Code, Patchnotes, Reviews und gespeicherten Events. Kein Befund ist auf `.179` reproduziert.
- **Datenbasis.** Drei Läufe, drei verschiedene Builds, ein Modell je Lauf. Die Ablehnungsquote (18–21 %) ist über alle drei stabil; die Ankunftszahl (11 von 11) stammt aus einem Lauf mit 16 Fällen.
- **Ablehnungen sind nicht bewertet.** Ich habe gezählt, nicht klassifiziert. Wie viele der 297 Ablehnungen in Batch 28 ein echter Schutz waren, ist offen; genau das soll die Guard-Bilanz klären. Für den Pilot liegt die Einordnung im [Gegenreview](../testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md) vor.
- **Zählmethoden.** Wortlisten sind als Vorkommen von `\b(?:` und `new Set([` gezählt, Ablehnungsstellen über die Aufrufmuster. Die Größenordnungen stimmen; einzelne Zahlen können um wenige Stellen abweichen.
- **Nicht untersucht:** Kampfengine (`combat.js`), Skill- und Passivwachstum, Gildenboard-Generator, UI, Runner. NPC E0–E3 und PULSE A–C nur an ihren Schnittstellen zu den Ketten C, D und E.
- **Aufwandsangaben** sind Schätzungen aus dem gelesenen Code, keine Planung.
- **Keine Freigabe.** Jede Maßnahme in §9 braucht einen eigenen Auftrag; V1 und V2 zusätzlich eine Designentscheidung.
