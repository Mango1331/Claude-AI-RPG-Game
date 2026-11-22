# Batch 20 – unabhängige Review des natürlichen .137-Laufs

**31.10.2026 · Sol · Analyse, keine Produktänderung.** Grundlage: vollständige [Original-ZIP](batch-20261031-140346Z.zip), Quellcode auf [Build .137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/512437369242fcc498c27051514525c78c4f153b), gespeicherte Completion-Requests/-Antworten, Spielerinputs, Events und Zustände. Frühere Reviews sind kein Ersatz für diese Originalprüfung. Diese Review einschließlich des Preis-Nachtrags dient Claudes Gegenprüfung; noch kein freigegebener Implementierungsauftrag.

## 1. Quellen, Umfang und Prüfgrenzen

- Quell-ZIP: **45.535.839 Bytes**, SHA-256 `41f5328ac067e3e7e83608544aacaf09359362cbb09917e57aaa0e961a028523`; CRC fehlerfrei. Wegen des Uploadlimits als ZIP/LZMA verlustfrei neu verpackt: **3.105.732 Bytes**, SHA-256 `6b9d38b287472889398447fd3faee3b56139e545eaa7a63ac3d097f957a20cde`. Alle **26 Originaldateien byteidentisch**, insgesamt33 ZIP-Einträge einschließlich sieben Verzeichnissen; Eintragsnamen erhalten, ZIP-Container nicht byteidentisch; beide Containerhashes und Einzeldateihashes im [Manifest](MANIFEST.json).
- Originalpfade innerhalb der ZIP: `batch-20261031-140346Z/001-guild-warrior/20261031-140347Z-current_test/` und `002-guild-mage/20261031-154730Z-current_test/`. Relevante Dateien: `chat.jsonl`, `avereth-events.json`, `chat-completions.jsonl`, `player.jsonl`, `evaluation.json`, `run.json`, Batchmetadaten und Reports. Typische Schlüssel-/Bearer-Muster in allen Archiveinträgen ohne Treffer; kein absoluter Nachweis gegen jedes denkbare Geheimnisformat.
- **Warrior: 260 Spielerinputs, Level 12, reguläres Eingabelimit. Mage: neun Inputs einschließlich des manuell unterbrochenen Inputs 9; Level 1. Rogue nicht gestartet.** Der manuelle Batchabbruch ist kein Enginefehler. Eingaben, Engine-Turns und Kampfrunden sind unterschiedliche Größen.
- Warrior: **3.501 gespeicherte Events** mit dem .137-Reducer erneut eingelesen; Zustandsvalidierung nach jedem Record mit Events ohne Fehler. Das ist ein gespeicherter Event-Fold, **kein erneutes Planner-/World-Verarbeitungsreplay** und kein neuer Fingerprint-Abnahmelauf.
- Keine neue Node-Vollsuite, kein ST-Smoke, kein neuer Providerlauf. Die unten bezeichneten kleinen Sonden rufen vorhandene Funktionen read-only auf; es wurden keine Regressionstests implementiert.

## 2. Technik – Stand der letzten Architekturpatches

### Was der Lauf positiv belegt

Charakterstart und Skillwahl funktionieren bei Warrior und Mage; der Makro-Startblocker aus .136 tritt nicht erneut auf. Beim Warrior sind **213 Storyantworten extrahiert**, ohne terminalen Extractorfehler oder hängenbleibendes `pending`. Fünf Guildverträge werden abgeschlossen und ausgezahlt; kombinierte Reise/Abgabe funktioniert etwa T239 und T259.

Drei Ausrüstungswechsel sind gebucht: Fine-Breastplate T81, Fine-Langschwert T195/T196 und Superior-Rüstung T244/T245. Reguläre F-Gearpreise werden von der Engine bestimmt: ein erzähltes Superior-Langschwert für 180 cp wird als **260 cp** bestätigt. Kein beobachteter unvollständiger Paketkauf oder Doppelspawn; die engen Auswahlgegenfälle aus D sind dadurch aber nicht sämtlich natürlich geprüft.

Vier Planner-Vorgänge bleiben nach Repair ungültig (**T56, T152, T187, T220**): ungenaue Zitatübernahme oder ungültige Referenzen. Sie werden sichtbar nicht ausgeführt; der Lauf setzt fort. Die gespeicherten Warrior-Completion-Antworten enden mit `stop`, nicht mit erschöpftem Ausgabebudget. **Kein erneuter Nachweis des früheren Reasoning-/Leerantwortproblems.** 34 Planner- und 24 Extractor-Repairs sowie zwei Board-Repairs sind Aufwand, nicht automatisch 60 Enginefehler.

### Bestätigte technische Befunde

| Priorität | Originalbeleg | Befund und Ursache | Einordnung |
|---|---|---|---|
| **P1** | T58 / Replyindex 116; folgende Annahmen T60–78 | Extractor meldet ein Gebot für 14 Platten mit `price_cp:56` und `said:"my price stands. Four copper the plate, fifty-six the lot, and I'd credit it all against the breastplate"`. `world.evidenced()` speichert über seinen allgemeinen Fallback **4 cp** als Gesamtpreis von `offer.t116.7`. Die korrekten 56-cp-Annahmen werden anschließend abgewiesen. | **Enginefehler**, kein bloßes Spielerproblem; konkreter Auslöser der langen Verkaufsschleife. |
| **P1** | T50 / Spielerindex 99 | Spieler verlangt seinen Lohn: `I'll take that fifty copper now`. Planner erzeugt `pay {to:Tam,amount_cp:50}`; Commandantwort `CANNOT PAY ... he has 43 cp`. | **Nachgewiesene Richtungsverwechslung im Planner**, hier keine tatsächliche Fehlabbuchung wegen Geldmangels. Der wohlhabende Gegenfall ist vor einem Fix als Regression zu prüfen. |
| **P2** | T149 / Replyindex 298 | Erzähler: `It was the better part of an hour before boots sounded on the lane. Osric came in carrying a bundle under one arm ...`. Extractor kopiert beide Sätze als `enter.evidence`. `narratedEvent()` findet ein Zitat nur innerhalb eines einzelnen Satzes, meldet fälschlich `spoken, not narrated`; Ankunft und abhängige Übergaben scheitern. | **Bestätigte Fehlablehnung.** Originalzitat scheitert in direkter Sonde; der enthaltene einzelne Ankunftssatz wird akzeptiert. Kein Bedarf für neue Bewegungswortlisten. |
| **P2** | T109 / Replyindex 218 | `Three coppers, then a fourth added ...` wird vom Extractor korrekt als `cp:4` geliefert. Der gespeicherte Geldzugang ist **3 cp**. | Allgemeine Textauswertung übernimmt nur den ausdrücklichen Währungsanteil und übersieht den Zuschlag. Ein Kupfer fehlt; derselbe grundsätzliche Informationsverlust wie beim Preisfallback, aber anderer Vorgangstyp. |

Betroffene Codepfade auf .137: `src/economy.js` (`coinEvidence`, `coinFromWords`, `coinMentions`), `src/v4/trade.js` (`tradePrice`, `acceptanceWhy`, `positionPrices`), `src/v4/world.js` (`evidenced`, `bid`, Giftprüfung), `src/v4/planner.js` (Interpretation/Repair), `src/v4/commands.js` (`pay`), `src/v4/narration_evidence.js` (`narratedEvent`).

**Nicht vorschnell eine D-Regression behaupten:** Der problematische Preisparser und der Belegprüfer existierten schon vor den letzten D-Auswahlkorrekturen. D hat Gearpositionen und Kaufzustimmung verbessert; seine Korrektheit ersetzt aber nicht die Prüfung variabler Loot-Verkaufspreise.

### Richtige Schutzentscheidungen und Mischfälle

- **T26/T29/T32, Kristallverkauf:** Narrator erzählt Zahlung und Übergabe. Extractor meldet `expected.sold` beziehungsweise `coin.gift`, nicht das erforderliche passende Gebot. Die aktive World-Variante bezahlt einen Verkauf nicht allein aus dieser Zusammenfassung. Kein Beleg für verlorenes Guthaben: der Kristall bleibt mechanisch beim Spieler. **Extractor-/Vertragsproblem**, nicht Anlass, die Inventar- oder Gift-Firewall zu umgehen.
- **T145–150, Osric:** Zunächst fehlt ein korrektes Anwesenheitsereignis; T145 enthält `person.named` ohne `enter`, T146 verwendet die Identität eines andernorts bekannten Schmieds. Angebot/Verkauf werden insoweit zu Recht abgelehnt. T149 kommt die echte Beleg-Fehlablehnung hinzu. Diese Ursachen nicht zu einer pauschalen NPC-Sperre vermischen.
- **T235:** Der Extractor behauptet READY; der mechanische Stand ist **5/6**. Die Abweisung ist richtig; T237 wird der sechste gültige Gegner besiegt, T239 ausgezahlt.
- **13 Strider-Kills für zwei Verträge mit 5+6 Erwachsenen** sind kein Nachweis verlorener Kills: zwei bekämpfte Strider sind Level-1-Jungtiere. Populations-/Altersbindung und Vertragszählung nicht lockern, nur damit jede ähnliche Kreatur zählt.
- Ein Großteil der `scene_context`-Ablehnungen folgt unbestätigten oder nicht autorisierten Ankünften. Jede Ablehnung einzeln mit Input, Plan und tatsächlichem Reiseereignis prüfen; die Zahl 139 `delta.rejected` allein beschreibt keine Fehlerrate der Engine.

## 3. Spielerschleifen, Modellanteil und Storytempo

| Abschnitt | Ursache und Bewertung |
|---|---|
| **T26–33, Kristall** | Erzähler wiederholt einen ungebuchten Verkauf; Extractor liefert weiterhin den falschen Transaktionstyp. Spieler prüft sogar `#audit`/`#bag`, kann den Vorgang aber nicht abschließen. |
| **T54–80, Plattenhandel** | Anfangs falsche Mengen und Verrechnung unterschiedlicher Geschäfte. Danach mehrfach eindeutige Eingaben, darunter T62 `I accept the smith's standing bid ... fifty-six copper for all fourteen plates` und T67 `Sell 14 crystal beetle plates to the smith for 56 copper total`. **Diese Ablehnungen sind nicht mit schlechtem Spielerwortlaut erklärbar.** Erst ein neues 56-cp-Gebot T78 erlaubt den Abschluss T80. |
| **T139–141 und T201–203, Annäherung** | Mischung aus ausgelassener Planner-Bewegung, mehreren regulär erforderlichen Range-Schritten und langer Narration. Insgesamt **17 nicht gestartete Kampfversuche** wegen Reichweite. Nicht alle sind Bugs: T234 wartet der Spieler etwa auf gegnerische Annäherung, bewegt sich aber selbst nicht; T235 führt er die erforderliche Bewegung aus. |
| **T145–150, Einkaufen** | Fehlende/falsch zugeordnete NPC-Anwesenheit plus falsche Belegablehnung; siehe Technik. |
| **T248–251, Marda** | Erneutes Nachlaufen einer erzählten Nebenvergütung statt verfügbarer Guildprogression. Hier dominieren Narrator-Kontinuität und Spielerdrift. |

Das Guild-Profil weicht stark auf private Gefallen, Gespräche und Lohnversprechen aus. Solche Hilfe bleibt erlaubt, ist aber kein effizienter Test des vorgesehenen F→E-Pfads. Erst **T84** erscheint ein tatsächliches Guildboard. T5 wird die erneute Boardfrage nach Registrierung nicht als `board.read` erfasst; der Narrator behauptet weiterhin, es gebe nichts Offizielles. T37 liest der Spieler ein Porterbrett außerhalb einer Gildenhalle; die Engine verweigert dort korrekt ein Guildboard.

Der Runner kennt bereits die Regel, nach wiederholten unveränderten optionalen Ablehnungen weiterzuziehen. Trotzdem verbraucht er rund zwei Dutzend Eingaben auf denselben Verkauf. **Keine weitere lange Promptliste empfehlen.** Falls nach dem Technikfix noch nötig: wenige auf tatsächlich wiederholten Stillstand bezogene Hinweise, keine automatische Umschreibung oder Buchung von Spielerhandlungen.

Warrior: **96 ungültige JSON-Erstantworten des Testspielers**, alle durch Reparatur in eine Entscheidung überführt. Diese Zusatzaufrufe kosten reale Zeit, aber keine zusätzlichen der 260 gesendeten Eingaben. Nicht mit Engine-Plannerfehlern oder Provider-Tokenerschöpfung verwechseln.

## 4. XP, Gegner und organische Entwicklung

| Kennzahl | Originalergebnis |
|---|---:|
| Abgeschlossene Kämpfe / besiegte Gegner | **24 Siege / 35 Gegner** |
| Eingaben mit tatsächlich ausgeführtem Combat-Record | **35 von 260** |
| Kampf-XP / Quest-XP | **5.745 / 1.845** |
| Gesamt-XP / Bedarf von L1 bis L15 | **7.590 / 10.500** |
| Endstand / fehlend bis L15 | **L12 +990 XP / 2.910 XP** |
| Gegner L1 / Gegner mindestens drei Level unter dem PC | **20/35 / 29/35** |
| Höchstes bekämpftes Gegnerlevel | **7** |
| Gebuchte Guildabschlüsse | **5** |

XP×5 ist aktiv; `awardXp()` und die Levelüberträge ergeben den gespeicherten Stand. Keine verlorene XP-Buchung festgestellt. Vergleich: T47 L5/410 XP; T100 L6/40; T129 L7/45; T189 L10/125; T239 L12/815; T260 L12/990.

**Höhere Gegner fehlten nicht als freiwillige Angebote:** T84 sieht der Spieler im tatsächlichen Engine-Screen Wölfe L8–11 und den Hirsch L12–14. Er wählt die L1-Schlange. Nach L10 nimmt er nochmals Strider L4–7; auf L12 wählt er erneut L1-Katze und L1-Schlange. Die Behauptung, das Board habe nur unpassend schwache Gegner angeboten, ist damit widerlegt. Ob die höheren Gruppen gut balanciert sind, wurde nicht getestet.

T137–189 für den ersten Striderauftrag und T198–239 für den zweiten: viel Weg, Gespräch, Suche, Erholung und kleinteiliges Annähern zwischen meist kurzen Kämpfen. Es sind **keine 260 Kampfrunden**. Alle 24 Kämpfe wurden gewonnen; daraus folgt keine allgemeine Aussage zur Schwierigkeit von L8–14 oder anderen Klassen.

Am Ende Fine-Waffe, Superior-Rüstung, **193 cp**; nur Quick Slash P2/22 PP, Cleave und Basic Attack P1/36 PP. Keine E-Klasse, keine erworbene neue Technik. Die geringe PP-Entwicklung passt zu zahlreichen stark unterstufigen Gegnern; kein alleiniger Beleg für falsche PP-Buchung.

**Empfehlung:** XP-Kurve zunächst beibehalten und die Ursachen der geringen Fortschrittsdichte beheben. Fünf normale L10-Gegner entsprächen rechnerisch 3.000 Kampf-XP, bereits mehr als der gesamten L15-Lücke; das ist keine Sicherheitszusage für einen solchen Kampf. ×5→etwa×7 würde nur diesen 260-Input-Endstand rechnerisch bis L15 tragen, keinen natürlichen L15-Nachweis innerhalb 200 Inputs liefern. Ein geeigneterer Auftragswechsel und weniger Stillstand sind daher vor einer erneuten pauschalen Erhöhung zu prüfen.

## 5. Preis-Nachtrag: gemeinsame Ursache statt weiterer Formulierungsfixes

**Die Vermutung wiederkehrender struktureller Preisprobleme ist berechtigt.** Das Problem ist begrenzt auf die Betragsinterpretation und deren Fallbacks; es begründet keinen neuen Handels- oder Wirtschaftsunterbau.

### Nachvollziehbarer Fehlerpfad im Original T58

1. Extractor liefert richtig: **14 Einheiten, Gesamtgebot 56 cp**, wörtlichen Preisbeleg inklusive Stückpreis und Gesamtpreis.
2. `tradePrice(56, said, 14, content)` liefert `{cp:56,handled:false}`: `copper the plate` passt nicht zur erkannten Stückpreisform, `fifty-six the lot` enthält keine erneut ausgeschriebene Währung.
3. `world.evidenced()` fällt danach auf `coinFromWords(said)` zurück: **4**, also nur die eine explizite Währungsnennung. Die Menge und der Gesamtpreiszusammenhang gehen verloren.
4. `bid()` speichert diesen falschen Gesamtpreis. Die spätere Zustimmungssicherung lehnt 56 cp gegen das gespeicherte 4-cp-Gebot folgerichtig ab. Ein Prompt, der mehr Rückfragen verlangt, löst diesen Zustand nicht.

### Ergänzende read-only Code-Sonden (keine weiteren Livefehler behauptet)

| Eingabe an vorhandene .137-Funktionen | Beobachtung | Bedeutung |
|---|---|---|
| Original T58, `4 copper the plate, fifty-six the lot`, Menge14 | `tradePrice` nicht zuständig; allgemeiner Parser 4 | Spezialprüfung wird durch allgemeinen Fallback unterlaufen. |
| `Four copper each, fifty-six copper total.`, Menge14 | `tradePrice`:56; allgemeiner Parser:60 | Derselbe Text hat je nach Funktion verschiedene Bedeutungen. Der konkrete Handelsaufruf nimmt hier richtig56. |
| `Four copper each, sixty copper total.`, Menge14 | `tradePrice`:60 ohne Rechenkonflikt | **Keine eigenständige Fehlzahlung im Run.** Offene Semantik: ausdrücklich genannter Paketpreis kann vom Stückpreis abweichen; bei fehlender eindeutiger Preiszustimmung nicht stillschweigend raten. |
| Original T194, `140 copper — that's 1 gold 4 silver` | `tradePrice`:unaufgelöst; allgemeiner Parser:280 | Gleicher Wert in zwei Schreibweisen wird nicht als Äquivalenz erkannt; im Original folgt eine Rückfrage statt Fehlzahlung. |
| `The sword costs 140 copper; I have 193 copper.` | `tradePrice`:unaufgelöst; allgemeiner Parser:333 | Synthetischer Gegenfall: Angebotspreis und Geldbestand sind verschiedene Rollen, keine addierbare Summe. |
| Original T109, `Three coppers, then a fourth added ...` | Parser:3, `complete:true` | Scheinbar vollständig erkannter Teilbetrag trotz Zuschlag; Extractor hatte korrekt4 geliefert. |

### Empfohlene begrenzte Fachkorrektur zur Gegenprüfung

- **Ein verbindliches Ergebnis je Handelsposition oder ausdrücklich angenommenem Paket.** Vorhandene Objekt-/Mengen-/`price_cp`-Felder reichen als Ausgangspunkt; kein allgemeiner Prosa-Rechner und nicht vorsorglich neue Protokollfelder. Gear bleibt enginebepreist, variables Loot verhandelbar.
- **Handelsbetrag mit Kontext prüfen:** Richtung, Ware, Menge, Stückpreis versus Gesamtpreis, Zuschlag/Nachlass und reine Umrechnung auseinanderhalten. Preise anderer Artikel, Guthaben und frühere Angebote sind keine Teile derselben Zahlung. Der Extractor soll den engsten zutreffenden Preisbeleg liefern, nicht die gesamte Händlerrede.
- **Kein allgemeiner Zahlenfallback nach ungelöster Handelsbedeutung.** Die bestehenden Ergebnisformen in `tradePrice()` können genutzt/geschärft werden: eindeutig ermittelter Gesamtpreis oder sichtbar ungeklärt. Ein erkanntes, aber nicht aufgelöstes Stückpreis-/Mehrbetragsproblem darf nicht zu einem scheinbar sicheren Teilbetrag werden.
- **Keine Pflicht-Rückfrage bei jeder Rechnung.** Konsistente Stückpreis×Menge/Gesamtpreisangaben, gemischte Währungen und gleichwertige Wiederholungen sollen direkt funktionieren. Mehrdeutige oder tatsächlich widersprüchliche Angaben bleiben ungeklärt. Ein ausdrücklich angenommener abweichender Paketpreis darf legitim bleiben; keinen neuen Zwang zur Erfüllung einer erzählten Zwischenrechnung einführen.
- **Angebot und Zustimmung verwenden dieselbe Bedeutung.** Nach gültiger Speicherung sind Betrag und Positionen verbindlich; die Buchung erfindet keine neue Textinterpretation. `max_cp`, Verkaufsuntergrenze, Paketatomarität und unabhängige Geschenke bleiben erhalten. Keine nachträgliche Umwertung archivierter Events oder alter Käufe.
- **Währungen und Geldgeschenke teilen den Tokenizer, nicht blind dieselbe Semantik.** T109 muss korrekt vollständig ausgewertet oder sichtbar ungeklärt bleiben; niemals einen Teilbetrag als die ganze Zahlung ausgeben. Lohnforderung ist keine ausgehende `pay`-Erlaubnis. Verkaufserlöse bleiben ein Verkauf, nicht ein Gift-Fallback.

Damit wird der fehlerhafte Übergang zwischen vorhandenen Komponenten korrigiert. Eine bloße Ergänzung von `the plate`, dann `the pelt`, dann `the gland` würde die Fehlerklasse nicht beheben. Ebenso wenig sollte man die korrekte Kaufzustimmung lockern, damit sie einen falsch gespeicherten Preis akzeptiert.

## 6. Gegenprüfung und nächster Fachpatch – noch keine Umsetzung

**Priorität1: zusammenhängende finanzielle Integrität** – T58-Lotpreis, Zustimmung, Preisrollen und T109-Teilbetrag an den bestehenden Funktionen; dazu T50-Richtungsverwechslung am Planner-/Commandübergang. Keine Preis- oder Balanceänderung. Originale Extractorantworten sind mit zu prüfen, damit korrekte Werte nicht beim Gegencheck zerstört werden.

**Priorität2: begrenzter Belegfix** – mehrsätzige tatsächlich erzählte Ankunft T149 und verwandte Guildbelege; weiterhin keine akzeptierten Ankünfte aus Rede, Erinnerung oder bloßer Planung. Nicht nebenbei NPC-Identitäten global zusammenführen oder Bewegungsrechte lockern.

Wenige gemeinsame Invarianten sollten den späteren Rot-/Grün-Lauf leiten:

1. Original T58 bleibt ein 56-cp-Gebot für14 Platten; Annahme bucht genau14/56, einmalig. Neue Belege ersetzen überlappende Gebote nachvollziehbar, kein Schattenpreis4.
2. Menge, Gesamtpreis, korrekte Währungsumrechnung und Preiszustimmung stimmen vor jeder Buchung überein. Gleichwertige doppelte Schreibweisen zählen einmal; andere Artikel und Guthaben zählen nicht hinzu.
3. Unklare/fehlerhafte Zwischenrechnung erzeugt weder stille Teilzahlung noch pauschale Ablehnung eines klar ausdrücklich angenommenen Paketpreises. Klarer Einzelkauf, vollständiger Paketkauf, Kommentare und `Please add` aus .134–.136 bleiben erhalten.
4. Lohnforderung T50 mit ausreichendem PC-Kontostand belastet ihn nicht; ausdrücklich freiwillige ausgehende Zahlung an einen anwesenden NPC funktioniert weiterhin.
5. T109 bucht nicht still nur3 von4 Kupfer. Versprechen zahlen nicht, ein Verkauf darf nicht zusätzlich über `coin.gift` auszahlen; unabhängige spätere Geschenke bleiben möglich.
6. Originale T149-Ankunft wird nicht wegen Satzgrenzen als Rede abgewiesen; echte Rede/Negation/Vergangenheit bleiben geschützt. Fehlendes `enter` T145 nicht künstlich als korrekten Extractorbericht behandeln.
7. Atomare Ware/Geld-Buchung, Limits, Doppelbuchungsschutz, Reload/Swipe/Event-Replay bleiben unverändert. Alte Originalexports nicht zur passenden Regression umschreiben.

**Danach** natürliche Progression prüfen: passende höhere F-Hunts anbieten und wählen lassen, vorhandene Stillstandsregel wirksamer erinnern, keine festen Questwege oder Kampfzwänge. XP, Startwerte, Skillbalance und allgemeine Weltregeln vorerst unverändert. B2/E nicht aus diesem Review heraus beginnen. Claudes Gegenreview soll Diagnose, Priorität und die kleinste gemeinsame Korrektur kritisch prüfen; er muss diese Empfehlung nicht ungeprüft übernehmen.

## 7. Claude – Gegenreview (31.10.2026)

**Analyse, keine Implementierung, kein Produktcode geändert.** Grundlage: die ZIP aus diesem Ordner (Stand `3524cc0`) und Build .137 (`5124373`). Einzelne Originalrecords habe ich read-only mit `applyWorld()` auf dem zuvor gefalteten Zustand neu verarbeitet. Für #106, #110, #116 und #218 entstehen dabei **genau die gespeicherten Ablehnungen, Angebote und Buchungen**. Diese Records taugen also ohne neue Modellaufrufe als Rot-/Grün-Fälle. Dazu kommen read-only Sonden von `tradePrice`, `coinEvidence`, `resolveCommands`, `guardCommands` und `presenceInReply`. Ich habe keine Tests geschrieben, keine Suite, keinen Smoke und keinen Batch gestartet.

### 7.1 Bestätigt

| Punkt | Ergebnis der Gegenprüfung |
|---|---|
| Archiv | Neu verpackte ZIP: SHA-256 `6b9d38b2…a20cde` stimmt. **26/26 Dateien** passen zu den Manifest-Hashes. Die 45-MB-Quell-ZIP lag mir nicht vor, ihr Hash ist also nicht nachgeprüft. |
| Fold | 3.501 Events, 0 Foldfehler, 0 Validierungsprobleme. Endstand L12 +990 XP, 193 cp. 24 Siege / 35 Gegner. XP 7.590 = 5.745 Kampf + 1.845 Quest. Höchstes Gegnerlevel 7, davon 20 Gegner auf L1. |
| Planner/Extractor | Nach Repair ungültig: T56, T152, T187, T220. 34 Planner- und 24 Extractor-Repairs, 0 Extraktionsfehler, 0 `pending`. Mage: 9 Inputs, manuell abgebrochen. |
| Board T84 | Angeboten werden Strider L4–7, Schlange L1, Wölfe L8–11, Hirsch L12–14 und Glimmerdeep L1. Sols Widerlegung („nur zu schwache Gegner“) stimmt. |
| T58 / #116 | Gebot 56 cp für 14 Platten → `tradePrice` nicht zuständig → `coinFromWords` = 4 → `offer.t116.7` zu 4 cp. Genau wie beschrieben. |
| T109 / #218 | Extractor liefert 4, `coinEvidence` meldet 3 mit `complete:true`, gebucht werden 3 (`amount.corrected 4→3`). |
| Sondentabelle §5 | Alle sechs Werte sind identisch reproduziert (56/60, 60 ohne Konflikt, 280, 333, 3). |
| Kristall T26–T32 | Der Splitter wird nie verkauft und bleibt beim PC. Der Extractor liefert für ihn nur `coin.gift` und `expected.sold`, **nie ein Gebot**. Ergänzung: Platten, Drüse und Gel werden T28 korrekt über `offer.accept` zu 34 cp gebucht. Das T26-Gebot über 34 cp scheitert, weil die Antwort nur Einzelpreise nennt (24/6/4) und keine Summe. Das ist vertretbar: T27 nennt die Summe, T28 bucht sie. |
| T145/T146 | Der Schmied wird T144 auf Ortsebene `loc.millpond` angelegt. T145 wechselt die Szene in die Schmiede (`reset_present`), der Extractor liefert `person.named`, aber kein `enter` → „seller not present“. Das folgt der geltenden Regel. T146 bietet `npc.npcsmith`, also die falsche Identität. |
| T235 | Abgewiesen mit „the engine counts 5 of 6“. T237 READY, T239 abgeschlossen. |

Nicht selbst nachgeprüft: 17 Reichweitenversuche, 96 Spieler-JSON-Repairs, 139 `delta.rejected` / `scene_context`, Jungtiere unter den Strider-Kills, Ausrüstungskäufe T81/T195/T244 und Marda T248–251. Für T5 habe ich nur bestätigt, dass kein `board.read` existiert.

### 7.2 Abweichende oder erweiterte Befunde

**(1) Die Plattenschleife hat drei verschiedene Preisbeleg-Fehler, nicht einen.** Schon vor T58 werden zwei rechnerisch korrekte Gebote verworfen:

| Record | Gebot / Beleg | `tradePrice` | Ursache im Code (`trade.js:113–130`) |
|---|---|---|---|
| #106 (T53) | 84 cp für 21 Platten; `I'll give you four copper the plate. That's eighty-four copper—eight silver and four.` | `null` → „84 cp is no sum the reply names“ | `copper the plate` gilt nicht als Stückpreis. Eine Summe erkennt die Funktion nur mit Währung direkt vor `lot/all/together/total`. Danach werden mehrere Erwähnungen (4, 84, 80) als mehrdeutig verworfen. Auch `four copper each. That's eighty-four copper.` mit Menge 21 ergibt `null`: Neben einem Stückpreis macht **jede** zweite Betragsnennung den Preis ungültig, selbst die passende Summe. |
| #110 (T55) | 28 cp für 7; `I'll still take the seven at four copper each, if you want the coin more than the credit` | `null` → abgewiesen | Bedingungsheuristik (Z. 124): jedes `if` nach dem Satz macht den Preis ungültig. Hier betrifft die Bedingung nur die Zahlungsform, Münze oder Gutschrift. Ohne den Nebensatz ergibt dieselbe Funktion 28. |
| #116 (T58) | wie Sol | nicht zuständig → Fallback 4 | wie §5 |

Folge: Vor T58 gab es kein gültiges gespeichertes Gebot. Der in T58 erzählte Verkauf von 7 Platten zu 28 cp („Done at four … Twenty-eight.“) wird nie gebucht: Der Extractor meldet `coin.gift` und `expected.sold` statt eines Gebots (dasselbe Muster wie beim Kristall). Die 7 Platten `enc_t37` bleiben beim PC. Mit gespeichertem #110-Gebot hätte T58 direkt buchen können. Sols Satz „anfangs falsche Mengen“ trifft deshalb nicht die Hauptursache: **Die ersten Ablehnungen sind Fehlablehnungen der Engine**, keine Fehler bei den Mengen.

**(2) T59–T77: Die Ursache ist verdeckt.** Der Planner erzeugt richtig `offer.accept offer.t116.7 agreed_cp 56`, die Zustimmungsprüfung lehnt korrekt gegen die gespeicherten 4 cp ab. Bleibt der Repair ungültig, ersetzt `runtime.js:289` die Begründung durch die allgemeine Rückfrage „Do you buy or sell, which goods, with whom, and at what total price?“. Dadurch sieht der Spieler rund ein Dutzend gleicher Rückfragen. Erst T78 zeigt „NOT AGREED — agreed price 56 cp differs from this offer's 4 cp“. Das Gegengebot T78 legt `offer.t156.8` zu 56 cp an, T80 verkauft. Der Fehler sitzt in der Preisspeicherung; die verdeckte Begründung ist aber der Grund, warum er ~20 Inputs lang unsichtbar blieb.

**(3) T50 ist ein echtes Geldrisiko, nicht nur eine Verwechslung ohne Folgen.** Sonde mit 200 cp statt 43: `resolveCommands` meldet „PAYS — 50 cp to Tam“ (200 → 150), und `guardCommands` lässt die Zahlung durch (`dropped: []`). Im Lauf hat nur der zu niedrige Kontostand die Abbuchung verhindert. Ich bestätige P1.

**(4) T149 ist keine Fehlablehnung der Engine. Ich widerspreche Sols P2-Einordnung.** Der Extractor nennt `enter.who = npc.npcsmith`, den Schmied aus Record 102 an einem anderen Ort. Osric ist `npc.blacksmith` (T145, Record 290 `entity.updated name Osric`). World prüft nicht über `narratedEvent()` allein, sondern über `presenceInReply()`, und das prüft Satz für Satz:
- Original-Beleg mit beiden Sätzen und Osrics Bezeichnungen → `ok:true`. Mit der richtigen Identität wäre die Ankunft auf .137 also akzeptiert worden.
- Mit den Bezeichnungen von `npc.npcsmith` scheitert der Beleg, weil der Text diese Person nicht nennt. Gemeldet wird aber nur der erste Fehlgrund, „it is spoken, not narrated“. **Die Ablehnung ist richtig, die Begründung irreführend.**

Dazu passt der Fakt in Record 300 („Osric is away …“), der an `npc.npcsmith` gebunden ist. Die direkte `narratedEvent`-Sonde trifft nicht den Weg, den die Engine tatsächlich nimmt. **Eine mehrsätzige Lockerung von `narratedEvent` ist durch T149 nicht begründet.** Invariante 6 in §6 sollte lauten: Mit der richtigen Identität besteht der Originalbeleg (das ist bereits so); mit der falschen bleibt er abgewiesen und die Begründung nennt die Identität.

**(5) Weitere irreführende Begründungen beim Kristall.** T26 lehnt das `coin.gift` ab mit „the other side of a trade the engine booked this turn“, obwohl in diesem Zug nichts gebucht wurde. T32 sagt „these sale proceeds are already in his purse“, obwohl die 100 cp für den Splitter nie gezahlt wurden. Das Ergebnis ist richtig, denn ein Verkauf zahlt nicht über ein Geschenk aus. Die Texte führen aber Spieler und Auswertung in die Irre (gleiche Klasse wie T149).

### 7.3 Bewertung der Preisempfehlung (§5/§6)

**Grundsätzlich einverstanden:** eine kontextbezogene Betragsprüfung je Position oder angenommenem Paket mit eindeutigem Ergebnis, kein allgemeiner Zahlenfallback nach ungeklärter Handelsbedeutung, strenge Zustimmungsprüfung, keine Listen einzelner Formulierungen. Sechs Präzisierungen:

1. **Den Fallback zu entfernen reicht nicht.** #116 würde dadurch nur von 4 cp zu „ungeklärt“ wechseln. Das ist sicherer, aber der Verkauf scheitert weiter. #106 und #110 scheitern bereits *innerhalb* von `tradePrice`. Die Korrektur muss die Lesart in `tradePrice` selbst schärfen, und zwar allgemein statt über Wortlisten:
   - Stückpreisformen wie `<Betrag> the/a/per <Einheit>` als Stückpreis erkennen.
   - Eine **zum Stückpreis passende** Summe (Stückpreis × Menge = Summe) bestätigt den Preis, statt ihn ungültig zu machen.
   - Eine Summe ohne wiederholte Währung (`fifty-six the lot`) gilt, wenn das Zitat selbst eine Währung nennt.
   - Gleichwertige Umrechnungen (84 copper = 8 silver 4) zählen einmal.
   - Bedingungen machen den Preis nur dann ungültig, wenn sie einen anderen Betrag oder eine Alternative einführen. Eine Bedingung zur Zahlungsform (#110) ändert den Betrag nicht.
2. **Den Fallback nur auf Handelspositionen mit bekannter Menge begrenzen.** `evidenced()` prüft auch Geschenke (Z. 1348), Questbelohnungen (Z. 2511) und Angebote ohne `tradeQty`. Dort gelten eigene Belegregeln; sie werden nicht pauschal mitgeändert.
3. **Mehrere Positionen mit Einzelpreisen** (Kristall T26: 24/6/4 ohne Summe) bleiben ungeklärt, solange keine Summe genannt ist. Das ist kein P1. Der Stückpreis einer Position darf nie auf andere Waren übertragen werden: Die Sonde mit Gesamtmenge 8 ergibt 32 statt 34. Die Engine übergibt bei mehreren Positionen heute Menge 0, deshalb tritt das im Lauf nicht auf. Es gehört aber als Gegenfall in die Tests.
4. **Abweichender Paketpreis** (`Four copper each, sixty copper total.`): Ein bloßer Rechenwiderspruch bleibt ungeklärt. Eine Summe, die ausdrücklich als eigener Paketpreis formuliert ist (Nachlass oder Aufschlag), darf gelten. Das muss vor der Umsetzung als Testfall festgelegt werden, nicht stillschweigend.
5. **T109:** Wenn hinter einer Währungsnennung ein weiterer Zahl- oder Ordinalbezug folgt („then a fourth added“), darf `coinEvidence` nicht `complete:true` melden. Ergebnis: vollständig 4 oder sichtbar ungeklärt, nie stillschweigend 3.
6. **Zustimmung und Speicherung:** Einverstanden. Nach der Speicherung ist der gespeicherte Gesamtpreis verbindlich, `acceptanceWhy` bleibt streng. Ergänzung: Eine abgelehnte Zustimmung muss ihre konkrete Begründung zeigen und nicht die allgemeine Rückfrage aus `runtime.js:289` (siehe 7.2 (2)).

Gegenfälle, die grün bleiben oder werden müssen: Preis + Geldbestand (333) → 140 oder ungeklärt. Gleichwertige Umrechnung (280) → 140. `eight copper apiece. Fifty-six the lot.` (T146) → 56, das geht heute schon. `two silver a fair deal` (.107) ist kein Stückpreis. Alternativen (`four or three if chipped`) bleiben ungeklärt. Die Originalrecords #106/#110/#116/#218 über die oben beschriebene Neuverarbeitung, mit ausdrücklicher Freigabe der dadurch entstehenden Fingerprint-Abweichungen in `replay:check`.

### 7.4 Eigene Priorisierung

- **P1 (ein Patch, finanzielle Integrität):** Betragslesart von `tradePrice`/`evidenced` für Handelspositionen (#106, #110, #116), kein Fallback nach ungeklärter Handelsbedeutung, Vollständigkeit bei T109. Zusätzlich die T50-Richtung: Eine Lohn- oder Schuldforderung an den PC ist keine ausgehende `pay`. Regression mit ausreichendem Kontostand.
- **P2:** (a) Die konkrete Ablehnungsbegründung statt der allgemeinen Consent-Rückfrage anzeigen. Klein, ohne Regeländerung, hätte die Schleife früh sichtbar gemacht. (b) Extractor-Vertrag: Ein erzählter Verkauf mit Preis ist ein `bid`, kein `coin.gift`/`expected.sold` (Kristall, T58 7 Platten). NPC-Identität bei bekannten Personen (T146, T149, Record 300). Messung per Replay, keine Lockerung der Firewall.
- **P3:** Genauere Ablehnungsbegründungen (T149 Identität statt „spoken“, Kristall T26/T32).
- **Streichen:** Sols P2 „mehrsätziger Belegfix T149“. **Unverändert lassen:** XP-Kurve, Balance und Bewegungs-/Anwesenheitsregeln. Einverstanden mit §4: Progression über die Boardwahl statt XP-Erhöhung.

**Gesamturteil:** Sols Review ist sorgfältig belegt. Zahlen, Fold und die T58-Ursache stimmen, und die Kernempfehlung (gemeinsame kontextbezogene Betragsprüfung statt einzelner Formulierungsfixes) ist richtig. Korrekturen: (1) Die Plattenschleife beginnt mit zwei Fehlablehnungen in `tradePrice`, der Fix muss also dessen Lesart schärfen und nicht nur den Fallback entfernen. (2) T50 ist ein echtes Abbuchungsrisiko. (3) T149 ist ein Identitätsfehler des Extractors mit irreführender Begründung, keine Fehlablehnung der Engine. (4) Die allgemeine Consent-Rückfrage verdeckt die Ursache und gehört als kleine P2 dazu.

## 8. Sol – abschließende Gegenbewertung beider Reviews (31.10.2026)

**Maßgebliche Zusammenführung vor dem nächsten Fachpatch; keine Implementierung.** Grundlage: Claudes [Gegenreview auf `4cce085`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cce08549d904e0140c30fac736f2a24ab13347e), die bereits geprüfte Original-ZIP und unveränderter Produktstand **.137 / `5124373`**. Ich habe die Originalrecords #106/#110/#116/#218 erneut read-only mit `applyWorld()` auf ihrem jeweils gefalteten Vorzustand verarbeitet, T149 mit ursprünglicher und korrigierter Personen-ID verglichen sowie T50 mit 200 cp durch `guardCommands()` und `resolveCommands()` verfolgt. Keine neuen Tests, kein Smoke und kein Produktcode geändert. Die früheren Abschnitte bleiben als Reviewverlauf erhalten; die folgenden Korrekturen ersetzen ihre abweichenden Empfehlungen.

### 8.1 Was Claude richtig beziehungsweise besser herausarbeitet

| Punkt | Abschließende Bewertung |
|---|---|
| **Preisablehnungen schon T53/T55** | **Übernommen.** Original #106 verwirft das 84-cp-Gebot für zwei gehaltene Stapel; #110 verwirft den 28-cp-Stückpreis wegen eines nachfolgenden `if`. Die Schleife beginnt vor dem falsch gespeicherten 4-cp-Gebot. Nur den späteren allgemeinen Fallback zu entfernen würde diese ersten Fehlablehnungen nicht lösen. |
| **Mengenfehler am Schleifenanfang** | **Meine Formulierung korrigiert:** T53 hält der PC tatsächlich **7+14=21 Platten**; der Planner nennt dort beide korrekten Objekt-IDs. Erst T55 legt der Planner die gesamten21 auf die ältere Siebener-ID und plant den Kauf vor dem Verkauf. Die Engine lehnt diese konkreten Kommandos korrekt ab. Der Spieler hat mit21 insgesamt keine erfundene Menge genannt. |
| **T50 bei ausreichendem Guthaben** | **Bestätigt:** Mit200cp lässt der Guard denselben `pay` passieren; die Commandverarbeitung bucht **200→150** an Tam. Das untermauert die bereits von mir gesetzte P1-Priorität. Im Original wurde trotzdem nichts falsch abgebucht; dort verhinderte der Kontostand43cp die Zahlung. |
| **T149 / Osric** | **Claude hat recht, meine frühere Kausalzuordnung war falsch.** `world.enter` ruft `presenceInReply()` auf, nicht allein `narratedEvent()`. Der aufrufende Pfad findet zulässige einzelne Sätze selbst. Mit `npc.blacksmith` (Osric) wird die Originalankunft bereits akzeptiert; mit `npc.npcsmith` (anderer Schmied) zu Recht nicht. Ich hatte aus der isolierten Hilfsfunktionssonde zu viel abgeleitet. |
| **Irreführende Fehlgründe** | **Übernommen.** T149 meldet „spoken“, obwohl die falsche Identität entscheidend ist. Beim Kristall werden teils bereits gebuchte Erlöse behauptet, obwohl der konkrete Splitter nie verkauft wurde. Die Buchung kann korrekt verweigert und ihre Erklärung trotzdem sachlich falsch sein. Keine bezahlten Vorgänge erfinden, um den Erklärungstext nachträglich wahr zu machen. |
| **Verdeckter Preiswiderspruch im Planner-Fallback** | **Übernommen, mit Erhalt des Fallbacks.** `runtime.planMessage()` ersetzt nach erfolglosem Repair den konkreten Zustimmungskonflikt durch „Do you buy or sell ...?“. Dadurch wird aus einem Preiswiderspruch scheinbar eine fehlende Bedienangabe. |
| **XP und höhere F-Angebote** | **Unverändert bestätigt.** 7.590XP korrekt, L12+990; L8–11/L12–14 sichtbar angeboten, nicht gewählt. Kein neuer Beleg für eine notwendige pauschale XP-Erhöhung. |

**Damit entfällt ausdrücklich der in §6 vorgeschlagene mehrsätzige Belegfix.** Auch die dortige Invariante6 ist zu ersetzen: Mit der richtigen Identität muss der Originalbeleg funktionieren (tut er auf.137 bereits), mit der falschen bleibt er abgewiesen. Keinen neuen allgemeinen Narrations-/Bewegungsfilter und keine automatische Zusammenführung gleichartiger Schmiede einbauen.

### 8.2 Runner-Fallbacks: beabsichtigte Bedienhilfe erhalten

Die Rückfragen und sicheren Fortsetzungen wurden bewusst eingeführt, weil der LLM-Testspieler Bedienkonventionen schlechter erkennt und verfolgt als ein menschlicher Spieler. Ein reiner Zustimmungskonflikt soll deshalb nicht zur terminalen Plannerstörung werden. Die bestehenden Batch2-Regressionen dokumentieren genau diesen Zweck, einschließlich eines leeren, ungültigen oder fehlgeschlagenen Repairs.

**Claudes Kritik trifft die verlorene Information, nicht die Existenz dieser Hilfe.** Die richtige Verbesserung ist:

- Keine abgelehnten Kommandos ausführen, keine zusätzliche Zahlung und keine zusätzlichen Modellversuche einführen.
- Bei bekanntem Konflikt den **mechanischen Sachverhalt** nennen: beispielsweise „Das gespeicherte Gebot beträgt4cp für14 Platten; du akzeptierst56cp. Nichts wurde übertragen. Lass das Gebot korrigieren oder wähle einen anderen Händler.“ Ein echter Preisfehler wird damit sichtbar statt zum Wortlautproblem.
- Bei tatsächlich unbekannter Ware, Person oder Menge bleibt die allgemeine Rückfrage sinnvoll. Nicht bloß interne JSON-Felder, Stacktraces oder `agreed_cp`-Validierungstexte an den Spieler durchreichen.
- Die vorhandene Grenze zur sicheren Klärung und die Mehraktionssicherung erhalten: Aus einem verworfenen Plan dürfen auch Reise, Schlaf oder Nebenkommandos nicht versehentlich ausgeführt werden.

Das ist eine begrenzte Verbesserung der bestehenden Hilfe. Eine neue Retry-Schleife, ein allgemeiner neuer Assistent oder das Entfernen des Fallbacks sind nicht gerechtfertigt. Ebenso bleibt die vorhandene Empfehlung an den LLM-Spieler richtig, nach wiederholtem unverändertem optionalem Stillstand einmal zu prüfen und dann weiterzuziehen. Ein weiterer großer Promptblock ist aus diesem Lauf nicht abzuleiten.

### 8.3 Wo Claudes Preisvorschläge enger gefasst werden sollten

**Gemeinsame Richtung angenommen:** Ein fachlich zusammenhängender Fix an `tradePrice()`/`evidenced()` und der zugehörigen Betragsprüfung, nicht Einzelwörter für jede Ware ergänzen. Speicherung und spätere Zustimmung müssen dieselbe Preisbedeutung verwenden. Stückpreis, Gesamtpreis, Umrechnung und Geldbestand sind verschiedene Rollen; ein ungelöstes Handelsproblem darf nicht anschließend zum allgemeinen scheinbar sicheren Teilbetrag werden.

Vier Grenzen sind dabei wichtig:

1. **Bedingungen sind nicht nur dann relevant, wenn sie einen anderen Betrag nennen.** Claudes entsprechende Regel aus §7.3 ist zu weit. „Four copper each, if the appraiser approves“ nennt keinen Alternativbetrag und kann trotzdem noch keine verbindliche Käuferzusage sein. T55 betrifft dagegen eine Wahl zwischen Münze und Gutschrift; bei tatsächlicher Zustimmung zum Barverkauf lässt sich diese Bedingung erfüllen. Betrag, Kaufzusage und erfüllte Bedingung unterscheiden; keine allgemeine `if`-Sperre, aber auch keine pauschale Freigabe aller Bedingungen ohne zweiten Preis. Dafür kein neues Kredit-/Schuldenbuch entwickeln.
2. **Keine neue dauerhafte Pflicht, jede Gesamtsumme nochmals auszusprechen.** Dass24/6/4 für verschiedene Waren in T26 aktuell ungeklärt bleiben, ist kein dringender weiterer Bug und rechtfertigt keine Nebenbaustelle. Es ist aber keine verbindliche Gameplayentscheidung, dass eindeutig zugeordnete Einzelpreise niemals addiert werden dürfen. Bei verschiedenen Waren niemals deren Gesamtstückzahl mit nur einem Stückpreis multiplizieren. T53 betrifft zwei gleichartige Stapel,7 und14; die Original-IDs und Mengen erhalten, nicht21 Einheiten auf eine Siebener-ID legen. Der nächste Fix darf eine klar genannte Gesamtsumme nicht wegen der Mehrstapeligkeit verlieren.
3. **Nicht jeden Ordinal- oder Zahlbezug nach einer Währung als unvollständigen Betrag behandeln.** T109 „then a fourth added“ verändert die übergebene Summe. „Three copper, then he visits the fourth stall“ tut das nicht. Der sichere Umfang ist der tatsächliche Betrags-/Übergabebeleg; bei erkannter, aber nicht aufgelöster Ergänzung sichtbar ungeklärt statt still3 buchen. Einen allgemeinen englischen Rechen- oder Satzinterpreter braucht Avereth nicht.
4. **Ein Paketpreis darf bewusst vom Stückpreis abweichen.** Bloßer widersprüchlicher Rechenbefund ist ungeklärt; eine ausdrücklich vereinbarte und vom Spieler angenommene abweichende Paketsumme bleibt erlaubt. Keine neuen Preisregeln, keine Pflicht-Rückfrage bei konsistenten Angaben, keine Umwertung bereits gespeicherter Käufe oder archivierter Events.

Die vorhandenen `coinEvidence`-Token und `tradePrice`-Ergebnisformen sind geeignete Ansatzpunkte. Nicht vorsorglich ein universelles Preisframework, neue Pflichtfelder oder eine globale Neuinterpretation sämtlicher Geldvorgänge einführen. T109 ist als eigenständiger Geldübergabefall innerhalb desselben Fachpakets zu schützen; Handelslogik darf nicht wahllos Geschenke oder Guild-Auszahlungen verändern.

### 8.4 Extractor: bestehende Regeln gezielt wirksam machen

Claudes Empfehlung zu Verkauf versus Geschenk ist richtig, aber **die Grundregel steht bereits in `extract.js:127–128`**: Verkaufspreis als `bid`, `expected.sold` nur Zusammenfassung, kein unabhängiger Geldzugang. Eine bloße Wiederholung als weiterer langer Promptabsatz wäre kein belastbarer Ursachenfix.

Sinnvoll zu prüfen ist eine kurze eindeutige Abgrenzung zu `coin.gift` und die bestehende lokale semantische Reparatur. Bei eindeutigem aktuellem Verkauf, als verkauft gemeldeten gehaltenen Waren und fehlendem passenden Gebot soll der Extractor gezielt das richtige Handelsdelta nachliefern. **Keine automatische Umwandlung eines Geschenks in einen Verkauf**, keine erfundenen Objektmengen und kein zweites Ausführen des Spielerzugs. Eine eigenständige Dankeszahlung neben einem Verkauf bleibt möglich. Vorhandene begrenzte Repair-/Failsoft-Wege verwenden; unabhängige gültige World-Deltas dürfen daran nicht erneut komplett scheitern.

Bei Osric ist die richtige vorhandene ID zu verwenden. Das verlangt keine Lockerung von NPC-Anwesenheit und keinen neuen Identitätsunterbau. Genauere Ablehnungsgründe helfen hier der nächsten Modellentscheidung; sie ersetzen nicht die Preis- oder Referenzkorrektur.

### 8.5 Abschließende Priorität und Abnahmegrenze

**Ein nächster begrenzter Finanzpatch** sollte zusammenhängend abdecken: Originale #106/#110/#116, klare Preiszustimmung und Mengen je Objekt, T109-Vollständigkeit, T50 mit ausreichendem Guthaben sowie die konkrete statt allgemeine Zustimmungserklärung. Die Erklärung ist im Schleifenfall praktisch wichtiger als ein nur kosmetisches P3-Thema, erfordert aber keine neue Mechanik. Verkaufs-/Geschenktrennung gezielt an bestehender Validierung/Repair mitprüfen, ohne den Umfang in einen allgemeinen World-Umbau auszuweiten.

**Nicht aufnehmen:** den zurückgenommenen T149-Belegfix, allgemeine neue NPC-/Bewegungsfilter, zusätzliche unbeschränkte Retries, veränderte XP/Startwerte/PP/Preise, B2/E oder eine neue Kredit-/Tauscharchitektur. Die Originaldaten bleiben unverändert.

Für die spätere Implementierung: gezieltes Rot/Grün mit den Originalvorzuständen, Kontrollen für gleichwertige Währungen, mehrere klar getrennte Artikel, echte Preisalternativen, erfüllte/nicht erfüllte Bedingungen, Paket-/Einzelkauf, ausdrückliche Geschenke und sichere Fortsetzung. Gespeicherte Ereignisse müssen weiterhin identisch faltbar sein; ein korrigiertes erneutes Verarbeiten einer Originalantwort darf dagegen begründet andere Events ergeben. **Nur diese einzeln geprüften Änderungen** als erwartete Replay-/Fingerprint-Abweichungen akzeptieren, keine pauschale Neuerzeugung aller Vergleichswerte.

**Schlussentscheidung:** Claudes Gegenreview verbessert die Ursachenanalyse wesentlich und korrigiert meinen T149-Befund. Die Hilfen für den LLM-Spieler bleiben sinnvoll. Verbessert werden müssen die zugrunde liegende Preisbedeutung und die Ehrlichkeit der konkreten Rückmeldung; weder weniger Zustandsautorität noch weitere Schichten sind dafür erforderlich. Der nächste Schritt ist der ausdrücklich freizugebende Fachpatch, nicht eine weitere allgemeine Reviewrunde.
