# Avereth Engine – Fachpatch: Finanz-Buchungsgrenzen nach .142

**Stand: 01.11.2026 · ausschließlich Planung, noch keine Implementierungsfreigabe.**
Geprüfter Produkt-HEAD: **Build .142 / [f84e6e5](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f84e6e50563fef9995861b16b679f17486d6e3dc)**,
Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`.
Geprüftes `main` vor dieser Dokumentation: `881abf4`.
Ziel: **ein zusammenhängender Folgepatch**, voraussichtlich .143, sofern bei Umsetzung noch frei.

## 1. Entscheidung und Quellen

Die .142-Architektur bleibt: Das Modell interpretiert, `finance_evidence.js` prüft zugeordnete Belege,
bestehende Fachhandler entscheiden über Zulässigkeit, bestehende Bucher erzeugen Events.
Kein erneuter Finanz-Gesamtumbau und keine weitere Wortlisten-Patchserie.

Grundlagen:

- [Finanz-Audit](PAYMENT_SYSTEM_AUDIT.md) und [ursprünglicher Konsolidierungsplan](PATCH_PAYMENT_CONSOLIDATION.md), besonders §§3.2, 5 und 11.
- [Claudes .142-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f84e6e5/avereth-engine/docs/FIX142_FINANCE_CONSOLIDATION.md).
- Sols unabhängiger .142-Code-/Event-Gegenreview aus diesem Arbeitschat.
- Nutzeranlage **Chatgpt Feedback(20261101-070026).md**: bestätigt dieselben drei Grenzen;
  ergänzt den vergleichbaren Suchrückfall in `payArgument()`. Dafür enthielt das Feedback
  noch keine eigene Event-Reproduktion; diese ist für diesen Plan nachgeholt.

**Übernommen:** Quellenbindung in allen drei Belegpfaden; vollständiges Geldargument;
positive Bestätigung ohne Umgehung des Fachwegs.
**Präzisiert:** Gleiche Partei und gleicher Betrag sind keine Transaktionsidentität. Dieselbe
Quellhandlung darf in einer Ausführung nicht zweimal frei zahlen; echte getrennte Zahlungen bleiben erlaubt.
Dies ist eine Ergänzung innerhalb der Quellen-/Buchungsgrenze, kein neues Zahlungssystem.

## 2. Gesicherte Befunde und Gegenanalyse

Alle nachstehenden Fälle sind **technische Gegenproben auf unverändertem .142** mit
Testvorzuständen aus `batch20_finance138.json.gz` bzw. einer frischen Hostkampagne.
Die gezielt falschen Planner-/Extractor-Berichte sind Teil der Gegenprobe.
Es sind keine neu beobachteten natürlichen Runfehler.

| ID | Quelle / fehlerhafter Modellbericht | Tatsächliches .142-Ergebnis | Ursache |
|---|---|---|---|
| Q1 / P1 | Händler nennt 56 cp in seinem Geldbeutel, danach ausdrücklich noch keinen Warenpreis; `said` gehört zur zweiten Aussage, `pricing.quote` zum Geldbeutel. Gültige Verkaufszustimmung ab 50 cp liegt vor. | Festes Gebot, Warenverkauf und **+56 cp**. | Nach gescheiterter Bereichssuche übernimmt `priceEvidence()` die fremde Geldstelle aus der gesamten Antwort. |
| Q2 / P1 | Tam nennt 50 cp in seinem Geldbeutel und übergibt anschließend einen Beutel ohne genannten Inhalt; `coin.gift` ordnet die 50 cp dieser Übergabe zu. | **+50 cp**. | `giftFree()` ersetzt den fehlenden Übergabebetrag durch eine Ganztext-Fundstelle. |
| G1 / P1 | `I have five copper—I give Tam two plates.`; `pay.money.quote="two"`, Währung `copper`. | **−2 cp**. | Warenzahl erbt eine Münzart; die vollständige übergebene Sache wird nicht abgesichert. |
| G2 / P1 | `I hand Tam two silver plates.` bzw. `I hand Tam three copper nails.`; Beleg endet nach `two silver` bzw. `three copper`. | **−20 / −3 cp**. | Der Geldleser akzeptiert einen passenden Präfix innerhalb eines Warenarguments. |
| Z1 / P1 | Offener Vorschlag über 5 cp; Antwort `No, keep it.`, `Maybe later.` oder `I inspect the payment proposal.`; Planner sendet trotzdem seine Bestätigungs-ID. | Jeweils **−5 cp**. | ID und Zustandsvergleich ersetzen die positive aktuelle Zustimmung. |
| Z2 / P1 | Frische Kampagne in Odo's Sundries: Vorschlag „20 cp for Guild registration“, danach ausdrückliche Bestätigung. | **50 → 30 cp**, Mitgliedschaft bleibt `null`. | `confirmPayment()` bucht direkt und überspringt Registrierung/Angebot/Kauf/Service. |
| Q3 / P1, zusätzlich reproduziert | `I pay Tam five copper. Then I inspect my bag.`; zweites `pay` zitiert nur die Inspektion, nutzt aber die erste Geldstelle. | Betragsvalidierung und Agency lassen beide durch; **−5, −5 cp**. | Auch `payArgument()` wechselt bei fehlender lokaler Geldstelle zur ganzen Nachricht. |
| Q4 / P1, zusätzliche Gegenprobe | Eine einzige Aussage `I pay Tam five copper.`; Planner meldet denselben Vorgang zweimal mit verschiedenen `seq`. | Zwei Transaktionen, **−5, −5 cp**. | Für freie Zahlungen fehlt die Begrenzung auf einmalige Nutzung derselben Quellhandlung innerhalb des Aufrufs. |

**Kontrollen:** `I give Tam two copper.` zahlt direkt 2 cp. Zwei tatsächlich getrennte
Handlungen (`I pay Tam five copper. Then I pay Tam another five copper.`) zahlen berechtigt zweimal.

Die Fehler liegen vor beziehungsweise beim Einstieg in die Buchung, nicht in der
Währungsumrechnung oder einem fehlerhaften Event-Reducer. Genügend Geld, anwesende Gegenparteien
und beim Verkauf gültige Zustimmung waren vorhanden. Damit erklären weder Geldmangel noch
eine korrekte Sicherheitsablehnung die Ergebnisse.

### Exakte Codeübergänge auf .142

- `src/v4/finance_evidence.js:155–161`: `priceEvidence.literal()` versucht erst `within`, dann
  bei `missing` erneut die vollständige Quelle.
- `src/v4/world.js:1903–1911`: `giftFree()` verwendet denselben Rückfall.
- `src/v4/finance_evidence.js:248–288`: `payArgument()` verliert bei der erneuten Suche
  die Kommandospanne; der Präfixcheck bei 269–278 sichert das Argumentende nicht ab.
- `src/v4/commands.js:138–146, 968–977`: Bestätigung kehrt früh zurück und ruft
  `bookPayment()` auf. Die Fachprüfungen ab 978 und der Kauf-/Serviceweg ab 1015 werden nicht erreicht.
- `src/v4/agency.js:255–259, 328–361`: vorhandene Negations-/Frage-/Planprüfungen
  ersetzen keinen positiven Annahmebeleg; „No, keep it“ enthält kein negiertes Zahlungsverb.
- `commands.resolveCommands()` / `bookPayment()`: vorhandene aufruflokale Handelsgruppierung
  schützt Angebote, aber nicht zweimal gemeldete freie Zahlungen aus derselben Handlung.

## 3. Technischer Umsetzungsschnitt

### F1 – Quellenbindung und einmalige Verwendung der Zahlungsquelle

**Invariante:** Fehlender oder mehrdeutiger Handlungsbeleg wird nicht durch Suche in einer
größeren Quelle aufgewertet. Die Zahl gehört zu genau dem wirtschaftlichen Vorgang, der gebucht wird.

1. Einen gültigen Handlungsbereich zuerst auflösen:
   - `pay`: das tatsächliche `c.quote` im aktuellen Spielertext;
   - neues NPC-Gebot, Angebotszeile, Geschenk: dessen vorhandenes `said` im aktuellen Narratortext.
   Fehlendes, erfundenes oder hinsichtlich der Handlung nicht auflösbares `said` bedeutet
   für einen neuen nichtkanonischen Finanzvorgang unbelegt. Der Betrag allein ersetzt diesen Anker nicht.
   Die vorhandenen nullable Felder müssen deshalb nicht global zu Schemafehlern werden.
2. `pricing.quote` und `money.quote` innerhalb dieses Bereichs auflösen.
   In `priceEvidence()`, `giftFree()` und `payArgument()` den lokalen Fehlschlag erhalten;
   keine anschließende uneingeschränkte Suche. Auch ein anfangs ungültiger Elternanker
   darf nicht still als „kein Bereich angegeben“ weiterlaufen.
3. **Lesekontext ist keine neue positive Quelle:** Außerhalb der Geldspanne darf weiterhin auf
   abgeschnittene Fortsetzungen und offene Bedingungen geprüft werden; das kann nur herabstufen.
   Die bestehende ausdrücklich genannte `currency_quote` darf bei nackten Zahlen die eindeutig
   zugeordnete Münzart aus demselben Satz liefern (Bree: „I have three silver—I'll give two to Bree“).
   Daraus darf niemals ein anderer Betrag oder ein Warenargument übernommen werden.
4. Mehrpositionengebote dürfen ihr vollständiges Handels-`said` über mehrere Preissätze führen.
   Einzelpreise bleiben den vorhandenen Positionen zugeordnet. Wiederholte gleichwertige
   Preisangaben nicht pauschal verbieten; ein gleicher Zahlenwert löst aber keine unklare Handlungsidentität.
5. Für freie Zahlungen die bereits ermittelten Handlungs-/Geldspannen an den Handler durchreichen.
   In dem bestehenden aufruflokalen `ctx` erfolgreich verbrauchte Zahlungsquellen vermerken:
   dieselbe oder überlappend erneut zitierte Münzfundstelle für denselben Empfänger darf nicht
   erneut buchen. Die Identität hängt nicht vom Wortlaut oder Zuschnitt des Modellzitats ab.
   Nicht nach Partei/Betrag allein deduplizieren. Zwei eigenständige Handlungen mit verschiedenen
   Geldfundstellen bleiben zulässig. Erst erfolgreiche Buchung verbraucht die Quelle;
   kein neuer persistenter Ledger oder Eventtyp.
6. `extract.js` und Planner-/Interpreter-Hinweise an diese Bedeutung angleichen:
   vollständigen Handlungsanker ergänzen oder offen lassen; vorhandenen einmaligen Repair nutzen.
   Scheitert er, keine Zahlung und keine weitere Retry-Schleife. Unabhängige gültige Deltas erhalten.

**Ausnahmen:** Gespeicherte Angebote und Enginepreise werden nicht erneut aus heutiger Prosa
gelesen. Kanonische Registrierung, Gearpreise und Questauszahlungen behalten ihre vorhandenen
autoritativen Quellen. Ein Enginepreis ersetzt keinen fehlenden Verkäufer oder Verfügbarkeitsnachweis.

### F2 – Vollständiges Geldargument statt Zahlenpräfix

**Invariante:** Vor der direkten freien Zahlung müssen Geldart, vollständiger Betrag,
Empfänger und Handlung zusammenpassen. Ein verifizierter Zahlenwert allein reicht nicht.

- `payArgument()` prüft vor **und nach** der Geldspanne die Grenzen des unmittelbar übergebenen
  Arguments. Ein direkt folgender unerklärter Sachbestandteil darf nicht abgeschnitten werden.
- Eine kleine positive Grammatik für vollständige Geldargumente verwenden: Betrag mit
  Münzart, gegebenenfalls Münzbezeichnung, sicherer Argumentabschluss oder zugeordnetem
  Empfänger-/Zweckanschluss. Keine Liste verbotener Waren wie plates/nails/ingots.
- Vorhandene Literal-/Vollständigkeitsprüfung weiterverwenden. Bei nackten Zahlen kommt
  zuerst die Argumentprüfung, dann die zulässige Währungsübernahme; nicht umgekehrt.
- Unbekannte Argumentreste oder unsichere Zuordnung ergeben `unclear/missing`, keine
  direkte Abbuchung. Der bestehende konkrete Zahlungsvorschlag bleibt der Klärungsweg.
- Klare Forderungen, Waren-/Quittungsübergaben und eigene Geldaufbewahrung werden nicht
  als ausgehende Zahlung behandelt. Akteur-, Frage-, Vergangenheit- und Negationsschutz erhalten.
- Keine allgemeine englische Syntaxanalyse und keine neuen Pflichtformulierungen.
  Eindeutige Zahlungen bleiben ohne Zusatzrunde möglich.

### F3 – Positive Bestätigung durch denselben Fachweg

**Invariante:** Bestätigung ersetzt fehlende Zustimmung beziehungsweise einen zuvor ausdrücklich
vorgeschlagenen Betrag; sie ersetzt keine Orts-, Mitgliedschafts-, Angebots- oder Kaufprüfung.

1. `confirmPayment()` prüft weiterhin offene ID, Gültigkeit, Präsenz, Ort, unveränderte Partei,
   Betrag und Zweck. Die gültige Entscheidung liefert diese Daten, nicht ein veränderter Planner-Payload.
2. Zusätzlich einen **positiven aktuellen Annahmebeleg** verlangen. Die vorhandene
   `c.quote` und die Agency-Prüfungen nutzen; ID allein, Fragen, Inspektion, Ablehnung,
   Aufschub, Rückblick und Geldforderung bestätigen nichts. Eindeutiges kontextuelles
   „Yes“ bei genau diesem offenen Vorschlag sowie ausdrückliches „pay/confirm“ unterstützen.
   Ein neuer Modell-Boolean wäre kein Nachweis. Keine allgemeine Prosaheuristik außerhalb dieser Grenze.
3. Validierte Bestätigung als lokalen, an genau diese Entscheidung gebundenen Autorisierungswert
   weitergeben. Sie ist kein fingiertes Geldzitat. Ausdrücklich abweichende Beträge im aktuellen
   Text oder abweichende Kommandodaten dürfen nicht durch die alte ID überschrieben werden.
4. Frühen direkten `confirmPayment() → bookPayment()`-Bypass entfernen.
   Gemeinsamen vorhandenen Ablauf in `commands.pay` lokal ordnen, bei Bedarf mit kleinem Helfer:
   kanonische Verpflichtung erkennen → Fachroute/aktuellen Zustand prüfen →
   gültige Zustimmung anwenden → erst dann freie Zahlung oder Klärung.
   Bestätigte und direkte Zahlungen verwenden dieselben Fachregeln, ohne rekursive Handleraufrufe
   oder nochmals dieselbe fehlende Geldstelle zu verlangen.
5. Registrierungszweck bleibt Registrierung: außerhalb der Halle, bei bestehender Mitgliedschaft
   oder ungültiger Voraussetzung keine freie Gebühr. Kauf-/Servicezweck bleibt Kauf/Service.
   Bestehende `offer.accept`-, `buy`-, `bookPurchase`- und Registrierungswege verwenden.
   Bei verändertem Preis nichts teurer buchen; eine bestätigte Summe ist keine unbegrenzte Zustimmung.
6. Eine gültige Bestätigung der Zahlung von 5 cp muss auch dann 5 cp autorisieren können,
   wenn „Yes“ selbst keinen Betrag wiederholt. Der Betrag stammt aus der sichtbaren Entscheidung.
   Scheitert eine Fachprüfung, kein Geldabgang und keine als bezahlt geschlossene Entscheidung.
7. Erfolgreiche Transaktion und Entscheidungsschluss im selben Record; vorhandene Entscheidungs-ID
   in `transaction.completed` erhalten. Ablauf, Statuspanels, Reload, Replay und Swipe bleiben geschützt.
   Unabhängige Tipps/Geschenke neben einer Registrierung oder einem Kauf weiter zulassen.

**Nicht erforderlich:** neues Bestätigungskommando, neue Entscheidungsart, Zahlungsframework,
zusätzlicher Modellaufruf pro normalem Zug oder Umbau aller Kommandotypen.

## 4. Dateien und interne Reihenfolge

| Schritt | Hauptstellen | Abgrenzung |
|---|---|---|
| 1: Regressionen auf .142 | `tests/v4/fix142_finance.test.js`, `fix142_trade_host.test.js`, bestehende Fixtures | Originalarchive unverändert; neue Tests später gegen unverändertes f84e6e5 zuerst rot. |
| 2: F1/F2 | `src/v4/finance_evidence.js`, `world.js:dealTerms/giftFree`, `interpret.js:amountErrors/financeHints` | Ein Prüfer, kein Rückfall auf alte Leser; vorhandene Evidenzzustände weiterverwenden. |
| 3: F3 und Quellenverbrauch | `commands.js:pay/confirmPayment/paymentProposal/bookPayment/resolveCommands`, gezielt `agency.js` | Aufruflokale Zuordnung und fachliches Routing; keine Wirkung im Agency-Guard erzeugen. |
| 4: Vertragsabgleich | `extract.js`, nötigenfalls `planner.js`, vorhandene Vokabularbeschreibungen | Keine neuen Finanzfelder vorausgesetzt; geänderte Prompt-/Vertragsversionen nachvollziehbar nachziehen. |
| 5: Gesamtabnahme | bestehende Finanz-/Guild-/Trade-Regressionen, Replay und echte ST-Smokes | Kein automatisches Umwerten bestehender Angebote; keine pauschale Neufassung von Fingerprints. |

Alle drei Teile gehören in denselben fachlichen Produktpatch. F1/F2 liefern belastbare
Quellen für F3; intern F1 → F2 → F3, anschließend einmal die vollständige Abnahme.
Build erst bei Umsetzung vergeben. Keine Zwischen-Mikroreleases.

## 5. Regressionen und Abnahme

### Pflichtmatrix bis zu den tatsächlichen Events

| Gruppe | Negative Fälle | Positive Kontrollen |
|---|---|---|
| Quellen | Q1–Q3; Geldstelle außerhalb von `said/c.quote`; fehlender/erfundener/mehrdeutiger Anker; Preis aus fremdem Geldbestand; ein gekürztes Zitat verschweigt eine offene Bedingung | Zugeordnete feste Offerte; vollständiges Mehrpositionsgebot; äquivalente Umrechnung; bedingte Preise bleiben Information |
| Einmalige Zahlungsquelle | Q4; zwei seq verwenden dieselbe einmalige Übergabe; fremder zweiter Handlungsanker | Zwei getrennte Zahlungen gleicher Höhe an dieselbe Person; getrenntes Trinkgeld; spätere eigenständige Gabe |
| Argumentgrenze | G1/G2; nackte Warenzahl neben Münzbesitz; Materialbezeichnung im Warenargument; Preis hinter Ware | Klare Münzübergabe mit/ohne „coins“; Bree20 statt30; Rückzahlung, Spende, Trinkgeld; vollständiger Mischbetrag |
| Bestätigungswille | Z1; Frage, Aufschub, Rückblick, Forderung; falsche/fehlende/abgelaufene ID; widersprechender Betrag oder andere Partei | „Yes“ zum konkreten Vorschlag; ausdrückliche Bestätigung ohne erneute Zahl; gemischter Zug mit unabhängiger gültiger Handlung |
| Fachroute | Z2; Mitglied zahlt nochmals Registrierungsgebühr; Service-/Kaufvoraussetzung fehlt oder Preis hat sich geändert | Registrierung in der Halle: genau eine Gebühr + Mitgliedschaft + Platte; gültiger Sofortkauf; bestätigte Servicebuchung mit genau einer Leistung |
| Geschenke/Handel | Erlös als Geschenk, Nachzählung, Versprechen, unvollständiger Betrag; keine doppelte Annahme oder Auszahlung | Eigenständiger Dank neben einem Geschäft; echte zweite Gabe; einzelne Artikel, Pakete und Teilmengen unverändert |
| Persistenz | Bestätigung/Quelle erneut verarbeitet, neuer Swipe ohne gültigen alten Record, veralteter Vorschlag | Fold/Reload identisch; Rückkehr zum gültigen Swipe; Panels verbrauchen die Bestätigungsmöglichkeit nicht |

Für jeden neuen Fall Geld **und** Waren/Leistung/Mitgliedschaft sowie
`coin.changed`, `transaction.completed`, Angebots-/Entscheidungsschluss prüfen.
Ein Test „es wurde irgendeine Rückfrage angezeigt“ reicht nicht.
Klare positive Abläufe dürfen nicht vorsorglich einen zusätzlichen Spielerzug verlangen.

**Abnahmefolge bei späterer Implementierung:**

1. Neue Fälle auf unverändertem .142 rot beziehungsweise als positive Kontrolle grün nachweisen.
   Die ursprünglichen 21 Finanz- und vier Hosttests erhalten; neue Belegpflichten offen in Fixtures ausdrücken,
   keine automatische Testanreicherung, welche die ungültigen Quellen der Gegenfälle repariert.
2. Kurze Produkt-Hostintegration: Registrierung am falschen/richtigen Ort; falscher Verkaufsbeleg;
   normales Geschenk; freie Zahlung → Vorschlag → Annahme/Ablehnung → Reload.
3. Angrenzende Finanz-, Agency-, Guild-, Service- und Trade-Tests, danach vollständiges `npm test`.
4. Vollständiger Fingerprint-Replay mit offengelegtem historischen Vertragsadapter.
   Jede neue Abweichung einzeln fachlich prüfen. Adapter oder Akzeptanzliste dürfen verbotene
   Suchrückfälle nicht als „Kompatibilität“ wiederherstellen oder Fehlbuchungen legitimieren.
5. Echte ST-Standard- und Failsoft-Smokes; Aufrufzahlen, PageErrors und Speicherung berichten.
   Ein fehlgeschlagener Erstlauf bleibt sichtbar, auch wenn eine begründete Wiederholung besteht.
6. Ein Produktcommit, eine Fachpatchnote, unabhängiger Diff-Gegenreview. Erst danach
   gesondert freigegebener natürlicher Batch mit neuen Modellantworten.

## 6. Geplante Patchnotes, Nichtziele und Stoppregel

**Geplante Änderungen, ausdrücklich noch nicht umgesetzt:**

- Finanzbelege bleiben ihrer konkreten Handlung zugeordnet; fehlende Belege erzeugen kein festes Gebot und kein Geschenk.
- Warenmengen und Materialbezeichnungen zahlen keine Münzen.
- Eine freie Quellzahlung wird pro Ausführung einmal gebucht; echte eigenständige Zahlungen bleiben möglich.
- Bestätigung verlangt Zustimmung und verwendet denselben Registrierungs-/Kauf-/Serviceweg.
- Klare Zahlungen und gültige Sofortgeschäfte bleiben ohne zusätzliche Pflichtbestätigung möglich.

Unverändert: Währungen, Gearpreise, Gildenbelohnungen, XP/PP, Kampf, Reisen, NPC-Memory,
Runner, Main/Minor, B2/E sowie vorhandene sichere Waren-/Mengen-/Präsenz-/Angebotsbuchung.
Keine neue Bank, keine allgemeine Transaktionsengine und keine Behauptung vollständiger Sprachbeweisbarkeit.
Ein konsistent falsches semantisches Modellergebnis bleibt ein Restrisiko; dieser Patch
schließt nachgewiesene Bereichs-, Argument- und Routingfehler.

**Nachweise bisher:** Im vorangegangenen Sol-Gegenreview auf .142 unabhängig 25/25 Zieltests,
2.580/2.580 Node und 2.235 Replayfälle mit 394 exakt akzeptierten Abweichungen, 0 offen.
Claudes echte ST-Ergebnisse: Standard24/24, Failsoft29/29 im zweiten Lauf.
Diese Zahlen gelten für .142, nicht für den geplanten Folgepatch.
Für diesen Dokumentationsauftrag wurden ausschließlich Code-/Diffprüfungen und lesende
Gegenproben ausgeführt; keine neuen Tests angelegt und keine Suite oder ST-Abnahme wiederholt.

**Nächster Schritt:** gesonderte Implementierungsfreigabe dieses Fachpatches.
Produkt bleibt .142; keine Code-, Prompt-, Schema-, Test-, Fingerprint- oder Archivänderung
durch diese Planung. Kein natürlicher Batch vor Korrektur und unabhängiger Abnahme.
