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
