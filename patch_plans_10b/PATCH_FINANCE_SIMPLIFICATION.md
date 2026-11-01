# Avereth Engine – Finanzabläufe behalten oder vereinfachen

**Stand: 01.11.2026 · Fach- und Entscheidungsplan, nach GPT-Gegenreview präzisiert; keine Implementierung.**
Produkt geprüft: **[.143 / d2a292a](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d2a292a1ba6ce1fc537238e9f51306a8bec2cce9)**.
Die .143-Gegenprüfung hat Q5 erneut als P1 reproduziert. Die Stoppregel des
[bisherigen Fachplans §7.4](PATCH_FINANCE_REVIEW142.md) ist damit für freie Zahlungen/Bestätigung ausgelöst.
Dieser Plan ordnet zusätzlich das gesamte aktive Finanzspiel nach praktischen Vorgängen.
Er ersetzt keine Preis- oder Balancetabelle und gibt keinen Produktpatch frei.

## 1. Ergebnis

**Die Buchung eines eindeutig festgelegten Geschäfts trägt. Die wiederholte Bedeutungsgewinnung
aus freier Prosa ist der problematische Teil.** Deshalb nicht alle Finanzabläufe abschaffen,
nicht alle Käufe bestätigen lassen und nicht alle Preise zentral neu festlegen.

Behalten: normale Ausrüstungskäufe, gespeicherte Angebote/Gebote, deren Mengenrechnung,
atomare Waren-/Servicebuchung, Registrierung, Guildpayout, Engine-Loot und Eventintegrität.

Gezielt vereinfachen:

1. Freie ausgehende Zahlungen nur nach einer deterministischen Engine-Bestätigung.
2. Neue variable NPC-Preise auf eine einfache verbindliche Endofferte reduzieren;
   keine Positionssummen oder Stückpreisrollen aus mehrdeutiger Prosa rekonstruieren.
3. Eine bereits gespeicherte Offerte bei der Annahme nicht erneut aus dem ganzen Spielertext
   bepreisen. Ausdrückliche Grenzen bleiben Grenzen, ein Geldbestand ist kein Gegengebot.

**Wichtig:** Die Engine darf weiterhin **3 × 6 = 18** und **260 + 160 = 420** rechnen.
Wegfallen soll das Erraten, *welche* erzählte Zahl mit *welcher* Menge gerechnet werden muss.

## 2. Belegbasis und Aussagegrenzen

- [Finanz-Audit](PAYMENT_SYSTEM_AUDIT.md), besonders §§1.4, 12.3–12.6; frühere Entwürfe bleiben historische Quellen.
- [Batch20-Originalreview samt Claude/Sol-Gegenprüfung](../testrun_10b/batch-20261031-140346Z/REVIEW.md).
  Dort sind korrekte Käufe und Gildenbuchungen ebenso belegt wie die Platten-Verkaufsschleife.
- [.142-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f84e6e5/avereth-engine/docs/FIX142_FINANCE_CONSOLIDATION.md),
  [.143-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/d2a292a/avereth-engine/docs/FIX143_FINANCE_BOUNDARIES.md).
- Claude Feedback(7).md und eigene read-only Gegenproben auf .143:
  Q5 mit verschiedenem `for` in beiden Reihenfolgen **−5/−5**; zusätzliche Zahlungsentscheidung nach
  `Yes. I pay him.`; Fehlablehnungen normaler Ja-/Zahlungsformen; Registrierungsfehlleitung.
- Für diesen Plan zusätzlich Codepfade von Preisbildung bis Buchung gelesen und kleine
  Funktionssonden für Mengenrechnung und Angebotsannahme ausgeführt. Keine neue Suite,
  keine Originalarchive verändert und kein neuer natürlicher Lauf.

**„Jede zweite Finanznachricht scheitert“ ist nicht statistisch nachgewiesen.**
Eine einzige fehlerhafte Offerte kann zwanzig Wiederholungsnachrichten verursachen.
Die historische eigene Auswertung im Audit §12.5 umfasst 2719 gespeicherte Records und
13 pay / 29 buy / 106 sell / 81 offer.accept; 147 offer.created und 124 transaction.completed
sind keine Erfolgsquote. Ablehnung kann korrekt sein, und „resolved“ kann inhaltlich falsch sein.
Diese älteren Daten messen nicht die Zuverlässigkeit von .143.

Beispiel für funktionierendes Spiel: Batch20 bucht Fine-Brustpanzer, Fine-Langschwert und
Superior-Rüstung sowie fünf Guildabschlüsse. Beispiel für Häufung: T53/T55/T58 scheitern
bei der Bildung eines variablen Lootgebots; spätere Annahmeversuche wiederholen denselben Konflikt.

**Kennzeichnung:** A = Mechanik behalten, B = Eingabe/Autorität vereinfachen,
C = getrennt behandeln oder derzeit kein ausreichender Grund für einen Umbau.
A bedeutet keine Garantie, dass ein LLM jeden freien Satz richtig plant. Auch die natürliche
Annahme gespeicherter Angebote bleibt eine semantische Modelleingabe. Die vorgeschlagene
Vereinfachung reduziert solche Entscheidungen; sie beweist nicht jede künftige Interpretation.

## 3. Vollständige fachliche Einordnung

### A – Bewährte Abwicklung erhalten

| ID | Vorgang | Was bereits funktioniert / Voraussetzung | Konsequenz |
|---|---|---|---|
| A1 | Normale F-Waffe, Fokus, Rüstung oder Schild kaufen | Unterstütztes Profil, tatsächlicher Verkäufer/Ort, gültiges Angebot, ausreichendes Geld und Zustimmung. Reguläres F-Gear erhält Enginepreise. Batch20 belegt echte Käufe. | Keine allgemeine zusätzliche Klickpflicht und kein Umbau der Gearbuchung. |
| A2 | Kanonisches Gilden-Lernmaterial kaufen | `openGuildManuals()` erzeugt definierte Angebote/Preise; Kauf läuft durch vorhandene Bucher. | Behalten. Nicht behaupten, jeder beliebige erzählte Lehrer/Stone sei ebenfalls kanonisch bepreist. |
| A3 | Bereits gespeichertes NPC-Angebot mit eindeutigem Preis annehmen | Angebot/Positionen, Preis, Verkäufer und Standort stehen fest; `bookPurchase()` prüft sie erneut. | Kauf-/Servicebuchung behalten; problematische erneute Sprachprüfung unter B9 trennen. |
| A4 | Zimmer, Essen, Bad, Heilung oder Training aus gültiger Offerte kaufen | Geldabgang und `service.granted` gehören zusammen. Ein Geldabgang allein ist kein Zimmer. | Serviceweg behalten. Neue Prosa-Preise sind B3–B7, keine andere Buchungsmechanik. |
| A5 | Mehrere Einheiten einer bekannten Preisposition kaufen | `linePrice()` rechnet aus gespeichertem Preis und Losgröße. Sonde: drei Einheiten zu je6 ergeben18 cp. | Mengenrechnung behalten; dafür muss kein Extractor multiplizieren. |
| A6 | Mehrere ausgewählte bekannte Artikel gemeinsam kaufen | `pickLines()` summiert vorhandene Positionen; `bookPurchase()` bucht die gesamte Auswahl. Sonde:260+160=420 cp. | Warenkorb/Paketkauf behalten. Keine neue freie Paketpreisberechnung aus Prosa. |
| A7 | Feste Packungen und Teilmengen | Ganzzahlige Preisverhältnisse werden gerechnet; unteilbare Lose werden zurückgewiesen. Sonde: zwei Stück aus „3 für10“ werden nicht still gerundet. | Vorhandene Losregeln behalten; kein neues Rundungsmodell. |
| A8 | Bereits gespeichertes festes Gebot annehmen | `bookSale()` kontrolliert Käufer, Besitz, IDs, Mengen, aktuelle Offerte und Preis; danach Waren und Geld zusammen. | Behalten. Die Bildung dieses Gebots ist separat B3–B7. |
| A9 | Teil eines Stapels oder mehrere Stapel verkaufen | Vorhandenes Gebot umfasst genau diese Einheiten; Splits erhalten Identität/Eigenschaften. Ein unbepreister Teil eines Gesamtloses wird nicht geraten. | Besitz-/Split- und Losprüfungen behalten. |
| A10 | Tatsächlich unabhängige Käufe/Verkäufe später wiederholen | Neue gültige Offerte/neuer Vorgang; eine abgeschlossene Offerte wird nicht erneut ausgezahlt. | Nicht nach NPC und Betrag global deduplizieren. Eine zweite bezahlte Nacht kann eine echte zweite Buchung sein. |
| A11 | Gildenregistrierung und bestehende kanonische Gebühren | Enginepreis und Voraussetzungen; Gebühr, Mitgliedschaft und Platte im bestehenden Registrierungsweg. | Keine freie Gebühr und keine allgemeine Geschenkbestätigung davor. |
| A12 | Gildenquest abgeben und Belohnung erhalten | `completeContract()` prüft Auftrag/READY/Zähler und bucht gespeicherte Auszahlung/XP/Abschluss. | Behalten. Kein erneutes Lesen der erzählten Münzen und kein zusätzlicher Gift-Fallback. |
| A13 | Automatische Kampfbeute und deren Münzen | `lootEvents()` verwendet Tabellen, Gegnerzustand und vorhandene Einmaligkeit. Materialien behalten IDs, Mengen und Richtwerte. | Behalten. Der spätere Verkauf dieser Materialien ist ein eigenes Geschäft. |
| A14 | Kupferbilanz, Währungsumrechnung, Event-Fold/Reload/Swipe | Beträge intern als ganze cp; bekannte Beträge werden deterministisch verrechnet. | Geld-/Eventkern nicht neu bauen. „Drei Silber“ sind30 cp; ob jemand zahlt, entscheidet die Umrechnung nicht. |

### B – Problematische Bedeutungseingabe gezielt vereinfachen

| ID | Vorgang / Beispiel | Belegtes Problem oder verbleibende Abhängigkeit | Empfohlenes einfacheres Verhalten |
|---|---|---|---|
| B1 | Freies Trinkgeld, Spende, Rückzahlung, Vorschuss, freiwillige Entschädigung | .143-Q5: Bestätigung und direkte Zahlung derselben Übergabe buchen bei verschiedenem `for` doppelt. | Freitext erzeugt nur einen Vorschlag; nur eine direkte Engine-Aktion bestätigt. |
| B2 | Mehrere freie Zahlungen an denselben NPC in einer Nachricht | Sprachliche Abgrenzung von Wiederholung und zweiter Gabe bleibt unsicher; zusätzlicher Vorschlag nach erfolgter Bestätigung reproduziert. | Höchstens ein freier Vorschlag pro Empfänger/Nachricht; Konflikt klären, nicht Summen erfinden. Spätere eigenständige Zahlungen bleiben möglich. |
| B3 | Neuer variabler Stückpreis aus Prosa, etwa „four copper each“ | T53/T55/T58: Preisbasis, Menge und abschließende Summe wurden unterschiedlich gelesen; .143 kann den klar zugeordneten Fall, aber die Quelle bleibt modellabhängig. | Für neue freie NPC-Preise genau eine ausdrückliche Endsumme für den beschriebenen Kauf/Verkauf verlangen. Gespeicherte Engine-Einzelpreise bleiben A5. |
| B4 | Mehrere Waren mit verschiedenen genannten Einzelpreisen | Zahlen können auf falsche Positionen/Mengen gelangen; ursprüngliche Kristall-/Plattenfälle. | NPC nennt eine endgültige Gesamtsumme für das ausdrücklich benannte Los. Keine Positionsarithmetik aus Prosa; bekannte Katalogzeilen weiterhin A6. |
| B5 | Alte/neue Preise, Rabatt, Zuschlag, Stück- und Gesamtpreis zugleich | T58; spätere Bedingungen und Zuschläge; ein korrektes Literal kann die falsche Rolle besitzen. | Verhandeln bleibt freies Gespräch. Nur eine abschließende Endofferte ersetzt die alte. Mehrdeutige Zahlenfolge bleibt unverbindlich. |
| B6 | Nackte Zahlen, geerbte Währung, implizite Ergänzung | „stew's two“, „then a fourth added“, „six more“: Bezug/Vollständigkeit ist Interpretation, keine bloße Rechnung. | Für neue freie Endofferten vollständige Münzgruppe verlangen, z.B. „56 copper for these fourteen plates“. Ergänzungen nicht automatisch fortrechnen. |
| B7 | Prüfung, Qualitätsvorbehalt, spätere Lieferung, Arbeitszusage | „if the appraiser approves“ ist keine feste Zusage, selbst mit passender Zahl. | Bis zur tatsächlichen Freigabe Information. Danach neue klare Offerte; kein automatisches Abarbeiten einer Bedingungslogik. |
| B8 | Loot verkaufen und gleichzeitig Gear kaufen, Verrechnung/Gutschrift | Richtungswechsel, loser Gesamtbetrag und mehrfach verteilte Limits; Batch20#381 schreibt150 an beide Verkaufspositionen. | Zwei getrennte gespeicherte Geschäfte mit eigener Summe; kein stiller Nettopreis, Kredit oder Tausch. Beide dürfen im selben Input erfolgen, wenn unabhängig eindeutig autorisiert. |
| B9 | Annahme mit Geldbestand, Nebenpreis oder Kommentar im Spielertext | Neue Funktionssonde: „I have300 copper. I buy the superior longsword.“ wird bei festem260-cp-Angebot als Preiszustimmung300 abgewiesen. | Gespeicherte Auswahl und ausdrücklich zugeordnete Preisgrenze prüfen; keinen neuen Preis aus der gesamten Annahmenachricht rekonstruieren. |
| B10 | Mehrartikelwunsch versus ausgewählte Angebotszeilen | Frühere D-Reviews: fehlende Rüstung, bloß erwähnter anderer Artikel oder „Please add…“. Aktuelle Schutzregeln tragen geprüfte Fälle, bleiben sprachabhängig. | Auswahl/Atomarität behalten. Bei unklarer Zuordnung eine konkrete Auswahl der bestehenden Zeilen zeigen statt weitere Satzmuster anzubauen. Keine ungewollte Teilbuchung. |
| B11 | Ausgehende Zahlung versus Lohnforderung/Warenübergabe | T50, Bree, G1/G2: Modelltyp und passende Zahl reichen nicht. | Freie Vorschläge zeigen Richtung, Partei, cp und Walletänderung; kein unbestätigter freier Abgang. Bezahlte Arbeit bleibt normale Weltinteraktion. |
| B12 | Eingehender Lohn, Dank, Geschenk, Rückzahlung | Tatsächliche neue Übergabe versus Versprechen, Erzählernachzählung oder Erlös. Keine neue .143-P1-Lücke für echte Geschenke nachgewiesen. | Aktuellen Giftweg behalten, klarer vollständiger Übergabebetrag. Keine pauschale Obergrenze oder Pflichtannahme ohne weiteren Beleg/Freigabe. |
| B13 | Verkaufserlös als `coin.gift`/`expected.sold` statt Gebot | Batch20-Kristall/T58: vielfach falscher Extractor-Typ, keine gültige Verkaufsbuchung; Ware bleibt beim PC. | Nur das gespeicherte Handelsgeschäft zahlt. Nicht zum Geschenk umdeuten. Bei neuem komplexem Verkauf klaren Gesamtpreis anfragen; vorhandenen begrenzten Repair nutzen. |
| B14 | Geldbestand, Münznachzählung, Wechselgeld und doppelte Erwähnung | Nicht jede Geldnennung ist eine Transaktion; gleiche Person/Summe ist umgekehrt kein allgemeiner Duplikatbeweis. | Vorhandene Transaktion/Credits referenzieren. Echte zusätzliche Übergabe bleibt separat möglich; keine zweite Auszahlung bloß wegen Narration. |
| B15 | Registrierung offen, zugleich unklar formuliertes Trinkgeld | Auf .143 reproduziert: statt freiem Vorschlag „NOT REGISTERED“. | Fachroute nur bei zugeordneter Verpflichtung wählen; offenes Registrierungsangebot allein macht nicht jede Zahlung zur Gebühr. In derselben vereinfachten Zahlungsführung abnehmen. |

B3–B7 bedeuten nicht, dass jeder entsprechende .143-Satz falsch bucht. Einige Varianten sind
heute korrekt und getestet. Es sind die wiederholt störanfälligen Freiheitsgrade bei der
Übernahme eines neuen Prosa-Preises. Die Vereinfachung würde diese Fähigkeiten bewusst begrenzen.

### C – Nicht vorsorglich in denselben Umbau ziehen

| Vorgang | Einordnung |
|---|---|
| Generierte besondere Einzelstücke, E+-Gear | Nicht automatisch unter der regulären F-Preistabelle. Ein spezielles Stück braucht weiterhin einen gültigen Preis/Profil; zunächst einfache Endofferte, keine neue E-Balance. |
| Neue NPC-Dienste und Waren ohne Contentpreis | Nicht alle Preise sind heute kanonisch. Narrative Erfindung ist zulässig; ein Preisrichtwert ist noch keine verbindliche Preisliste. |
| Fundmünzen durch TAKE, Schatz oder Behälter | Autorisierte Aufnahme und nachvollziehbarer Betrag nötig; nicht mit automatisch berechneter Kampfbeute gleichsetzen. Kein Nachweis einer neuen generellen P1-Klasse aus diesem Auftrag. |
| Raub, Beschlagnahme, Strafe, erzwungener Zoll | Eigener `coerce → mayTake`-Pfad mit Präsenz/Autorität/Feindseligkeit. Nicht als freiwillige Zahlung behandeln und keine Bestätigung als Schutz vor jeder Weltkonsequenz verlangen. |
| Freie Sachgeschenke/Übergaben ohne Geld | Bestehende Inventar-/Präsenzmechanik bleibt. Nicht zur Finanzquest oder zum Kauf umformen. |
| Private Arbeit/Hilfe | Keine formalen Privatquests wieder einführen. Versprochener Lohn ist Weltwissen; tatsächlich übergebenes Geld ist B12. |
| Kredit, Bankkonto, Schuldsimulation, allgemeiner Tauschhandel | Kein neues System. „Credit“ in Prosa erzeugt kein Guthaben. Weder Parserkomplexität noch Bankarchitektur dafür weiter ausbauen. |
| NPC-Geldbörsen, endlicher Warenbestand, Marktsimulation | Nicht als bestehende Finanzgarantie behaupten. Keine Liquiditäts-/Ökologiesimulation als Reparatur der Buchungsgrenzen. |
| Abwesender Käufer, falscher Ort, nicht vorhandene Ware oder falsche Menge | Häufig korrekte Schutzablehnung. Preisvereinfachung darf Präsenz, Eigentum, Menge oder Reiseautorität nicht aushebeln. |

## 4. Zusätzliche Code-Gegenanalyse für diesen Plan

### 4.1 Rechnen und Preisverstehen sind verschiedene Aufgaben

`trade.linePrice()` und `pickLines()` arbeiten mit gespeicherten Zahlen, Losgrößen und IDs.
Die read-only Sonden ergeben18 cp,420 cp und die richtige Ablehnung eines unteilbaren Loses.
`bookPurchase()` und `bookSale()` prüfen den aktuellen State vor ihren zusammengehörigen Events.
Diese Funktionen bleiben die Buchungsstellen; keine neue allgemeine Transaktionsengine.

`world.offer/bid → dealTerms → priceEvidence` erfasst dagegen die neue NPC-Aussage.
Hier liegen Einheitenrolle, Preisquelle, Bindung und Parteizuordnung. Sichere Zahlenrechnung
kann eine falsche Deutung an dieser Stelle nicht heilen. Ein bereits gespeichertes festes
Gebot muss später nicht nochmals „four each“ aus seiner Geschichte verstehen.

### 4.2 Aktiver Restpfad bei der Annahme

Auf .143 ruft `acceptanceWhy()` weiterhin `positionPrices()`, `tradePrice()`,
`coinMentions()` und gegebenenfalls `coinFromWords()` auf dem Spielerzitat auf
(`src/v4/trade.js:81–114`). Es wird sowohl im Planner als auch im Commandpfad verwendet.
Das ist **kein vollständig entfernter alter NPC-Preisleser**, sondern noch aktive
Preisrekonstruktion bei der Spielerzustimmung.

Eigene Funktionssonde mit festem260-cp-Angebot und `agreed_cp:null`:

| Spielertext | .143-Prüfergebnis |
|---|---|
| `I buy the superior longsword.` | akzeptabel |
| `I have 300 copper. I buy the superior longsword.` | `agreed price 300 cp differs from this offer's 260 cp` |
| `I buy the superior longsword for 260 copper.` | akzeptabel |

Keine Fehlbuchung und kein neu behaupteter Livefall. Es ist eine konkrete Fehlablehnung,
die den gewünschten normalen Kauf bei zusätzlichem Rollenspieltext behindern kann.
Ein weiterer Negativwortfilter für Besitzangaben wäre nicht die Empfehlung.

Ziel: Eine Auswahl akzeptiert den angezeigten gespeicherten Preis, sofern kein tatsächlich
zugeordnetes Limit/Gegengebot widerspricht. Die ausdrücklichen Grenzen sowie Gegenpartei-,
Mengen- und Auswahlprüfungen bleiben; die allgemeine Zweitlesung aller Geldzahlen entfällt.
Ein Rabattwunsch wird keine Annahme der alten Offerte. Ist die Deutung der Auswahl offen,
zeigt die Engine die konkrete Auswahlfrage statt zu buchen.

### 4.3 Ein Richtwert ist noch kein vorhandener Ankaufskatalog

`items.valueOf()` liefert Profilrichtwerte; `gearRetailPrice()` ist nur für reguläres F-Gear
ein verbindlicher Verkaufspreis des Händlers. Loot trägt `value_cp` aus `lootEvents()`.
Daraus folgt **noch kein** implementierter allgemeiner Engine-Ankaufspreis für alle Materialien.

Ein zukünftiger Standardankauf könnte diese Daten nutzen und die Prosa-Preisbildung ganz
umgehen. Das wäre eine zusätzliche Wirtschaftsentscheidung (Welche Ware? Welcher Ankaufspreis?
Wer kauft?), kein bloßes Refactoring. Nicht heimlich `value_cp` mit0,5 oder1 multiplizieren.

### 4.4 Deterministische Bestätigung braucht eine wirkliche Engine-Eingabe

Die vorhandenen `#`-Befehle laufen über `src/commands.js:runCommands()` ohne Planner;
mit `#assign` existiert bereits eine zustandsändernde Event-/Hostintegration.
Ein Zahlungsbefehl existiert heute noch nicht.

Die neue Aktion muss direkt vom Nutzer/Runner kommen, nicht aus einem vom Planner gesetzten
`confirmation`-Feld. Nur eine vollständig als solche eingegebene Bestätigungsaktion darf zahlen;
zitierte Befehle in Prosa oder eine Narratornachricht dürfen nichts auslösen.
Die jetzige allgemeine `splitCommands()`-Hashtagsuche allein genügt dafür nicht.
Ein Button wäre eine alternative Oberfläche desselben Enginewegs, kein zweiter Bucher.
Native Enginebefehle werden vor `turn.begun` behandelt (`engine.js:107–118`). Deshalb die
alte Freitext-Bestätigungsprüfung auf `s.turn - 1` nicht unverändert übernehmen: Gültigkeit
muss zur offenen Entscheidung und ihrer Quelle passen, auch nach reinen Statuspanels.
Reload allein macht einen noch gültigen Vorschlag nicht ungültig. Die Bestätigung muss aber
im aktuellen Chat-/Eventzweig auf einen offenen Vorschlag zeigen; ein verlassener oder
verworfener Swipe ist keine Autorisierung. Keine globale Nebenliste für bezahlte IDs einführen.

## 5. Konkrete Zielabläufe

**Waffe ohne Feilschen:** Händler ist da; unterstützte Superior-F-Waffe kostet laut Engine260 cp.
Spieler akzeptiert das vorhandene Angebot oder hat einen gültigen passenden Kaufauftrag erteilt.
Engine bucht260 cp und genau das Profil. Keine freie Geldbestätigung und keine neue Preisverhandlung.
Ändert die Engine den nur erzählten Preis, gilt die bestehende Preiszustimmung weiter:
kein überraschender höherer Abgang ohne ausreichendes Limit oder ausdrückliche Annahme.

**Drei gleiche Tränke:** Ist je Einheit6 cp verbindlich gespeichert, rechnet die Engine18.
Ein Extractor soll nicht18 aus „six each, or twenty for…“ erraten.
Gibt es nur eine neue freie Händlerrede, nennt der Händler für diese Auswahl einen Endpreis.

**14 Platten verkaufen:** IDs und Menge bleiben14. Eine freie Offerte sagt eindeutig
„56 copper for these fourteen plates“. Ein fester gespeicherter56-cp-Bid wird einmal angenommen
und einmal gebucht. Aus allein „four each“ wird unter der vorgeschlagenen Vereinfachung
noch kein neuer bindender Lospreis. Der Händler kann die Summe nennen; der Spieler muss sie nicht ausrechnen.

**Platten und Drüsen:** Ein Los mit festgehaltenen Objekt-IDs und Mengen, eine Endsumme.
Oder mehrere bereits separat bepreiste Engine-Positionen. Kein Stückpreis der Platten für die
Gesamtzahl aller Gegenstände und kein150-cp-Limit an jeder Position eines150-cp-Pakets.

**Loot gegen Rüstung:** Verkauf und Kauf werden getrennt angezeigt und gebucht.
Bestehende Rüstung wird nicht durch „I'd credit it against…“ auf einen Nettopreis umgestellt.
Ein sinnvoller kombinierter Input bleibt möglich, sofern beide Zustimmungen eindeutig sind.

**Trinkgeld:** „Ich gebe Tam5 Kupfer“ erzeugt einen Vorschlag mit Empfänger, Zweck,5 cp,
Wallet vorher/nachher und eindeutiger ID. Die tatsächliche Engine-Bestätigung bucht einmal.
Ein gleichzeitig gemeldetes `pay` oder ein späteres „Yes“ darf kein zweiter Buchungsweg sein.

**Dankeszahlung:** Eine Mutter überreicht tatsächlich3 Silber für Hilfe: bestehender Giftweg,
30 cp, keine Privatquest und keine Spendenbestätigung. Eine spätere eigenständige Gabe bleibt erlaubt.
Versprechen oder erneutes Erzählen derselben Übergabe zahlen nicht.

## 6. Empfohlener nächster Fachpatch – noch freizugeben

### S1 – Freie Zahlungen vereinfachen (ausgelöste Stoppregel)

- `pay`-Freitext erzeugt ausschließlich Vorschläge. Richtung/Partei/Betrag werden sichtbar;
  unvollständige Beträge sind nicht bestätigbar, nicht still Teilbeträge.
- Zunächst ein minimaler direkter Enginebefehl, beispielsweise `#pay <decision-id>`;
  optional später ein Button. Die vollständige Eingabe muss allein aus Befehl und genau einer
  Vorschlags-ID bestehen. Kein Aufruf aus Zitaten, Prosa, angehängten `#`-Fragmenten,
  mehreren Systembefehlen oder Narratorausgaben; vor der allgemeinen Hashtag-Zerlegung prüfen.
- Höchstens ein freier Vorschlag pro Empfänger und Nachricht. Bei widersprüchlichen Summen
  keine automatische Zusammenrechnung; eine eindeutige Entscheidung verlangen.
- Native Bestätigung verwendet gespeicherte Partei, cp, Zweck und Route, prüft aktuellen Ort,
  Präsenz, Gültigkeit und Guthaben und bucht Transaktion/Entscheidungsschluss zusammen.
- Beide bisherigen freien Abbuchungswege entfallen: direkte Freitextzahlung auch bei verifiziertem
  Beleg sowie vom Planner gemeldete Freitext-`confirmation`. `paymentConsent()` und gleiches `for`
  sind keine Zahlungsautorität mehr. Kein alter Ausweichpfad bei ungültigem `#pay`.
  Bekannte Fachzahlungen sind davon getrennt; den vorhandenen Bucher für die native Aktion wiederverwenden.
- Bekannte Käufe, Registrierung und Dienste bleiben ihre Fachwege. Offenes Registrierungsangebot
  allein macht ein unabhängiges Trinkgeld nicht zur Gebühr.
- Jeder bestätigbare Vorschlag zeigt Partei, Zweck, Betrag, Wallet vorher/nachher und die exakte
  Eingabe `#pay <seine-ID>` sowie „noch nicht bezahlt“. Unvollständige Vorschläge zeigen keinen
  ausführbaren Zahlungsbefehl. Bestätigung oder Ablehnung liefert ein eindeutiges Engine-Ergebnis.
- Runner-Anleitung (`PLAYER_COMMANDS`/`PLAYER_MECHANICS`) knapp ergänzen: nur gewollte Vorschläge
  mit der angezeigten eigenständigen Eingabe bestätigen; „Yes, I pay“ zahlt nicht. Der Driver
  erzeugt, ersetzt oder bestätigt keine Entscheidung. Keine neue Strategie und kein Modellaufruf
  für die native Buchung.
- Kein neuer bezahlter Reise-/Kampf-/Wartezug allein für diese Bestätigung. Der zusätzliche
  Bedienvorgang und seine Auswirkung auf die Runner-Inputzahl werden transparent berichtet.

### S2 – Variable NPC-Preise und Annahme vereinfachen (zusätzliche Empfehlung)

- Für **neue freie** Offerten/Gebote nur ein vollständiger ausdrücklicher Endpreis je
  ausgewähltem Los/Angebotsposition. Ein Endpreis benennt seine Währung und gilt jetzt.
- Aus freier Prosa keine neue `pricing.positions`-Summe, nackte Währungsübernahme,
  Ordinal-Zuschläge oder Stückpreis×Menge ableiten. Im neuen strikten Weg steht die
  neue einfache Endpreisangabe statt dieser Berechnungsarten; nicht mehrere alte Wege dahinter behalten.
- Mehrere gespeicherte Enginepositionen und deren Mengenrechnung bleiben zulässig.
  Regel „neuer freier Endpreis“ ist kein Verbot der Enginearithmetik.
- Ein gemeinsamer Lospreis bindet genau die vollständigen gespeicherten Artikel/IDs und Mengen.
  Daraus keine Einzelpreise ableiten, die Summe nicht an jede Position kopieren und keine Teilmenge
  still buchen. Für Teilverkäufe nur vorhandene eigenständig bepreiste Positionen nutzen oder
  eine neue Endofferte einholen; `bidSale()`/Buchungsprüfungen erhalten. Fehlt für einen neuen
  Einkaufslospreis die vorhandene eindeutige Repräsentation, nach ausdrücklichen Endpreisen je
  Artikel fragen, statt künstlich Einzelpreise zu verteilen oder ein neues Paketmodell einzuführen.
- Bedingungen bleiben unverbindlich, bis eine neue feste Offerte existiert. Der Erzähler darf
  weiter handeln, prüfen, Preise begründen und ablehnen; nicht jede Gesprächszahl wird ein Angebot.
- Den Endpreisvertrag im tatsächlichen Narrator-Kontext und im Extractor-Vertrag erklären:
  Für eine feste Offerte das benannte Los und eine vollständige gegenwärtige Endsumme nennen.
  Fehlt diese, zeigt die Engine konkret Ware/Menge und fehlende Gesamtsumme oder offene Bedingung;
  der Narrator darf darauf natürlich antworten. Kein allgemeines „Preis ungültig“, kein automatischer
  Zuschlag und kein neuer Pflichtdialog vor bereits eindeutigen Geschäften.
- Annahme verwendet gespeicherte Positionen/Preise und explizite Preisgrenzen.
  `acceptanceWhy()` darf den Geldbestand/Nebenpreis nicht mehr zu einer zweiten Preisvereinbarung machen.
  Dafür bestehenden doppelten Preisleser entfernen; Auswahl-/Rabatt-/Partei-/Mengenprüfungen erhalten.
- Änderungen bestehender Angebote erzeugen nachvollziehbar eine neue gültige Offerte.
  Bereits abgeschlossene Transaktionen nicht neu bepreisen.

**Bewusster Verlust:** Eine neue bloße Stückpreisrede reicht nicht mehr, ebenso wenig
eine nur aus mehreren frei erzählten Teilbeträgen erschlossene Summe. Das kann eine Rückfrage
zum endgültigen Preis kosten. Normale Katalogkäufe und vorhandene feste Angebote kosten
keinen zusätzlichen Bestätigungsklick.

**S1+S2 als ein freizugebender Fachpatch** mit getrennten internen Schritten und einem
unabhängigen Gegenreview. Keine neue Serie aus „now“, „too“, „one more“, „the plate“ usw.
Die Endpreisregel entfernt mehrdeutige Rechenrollen, beweist aber nicht die Bedeutung jeder
freien Offerte: Quelle, Gegenpartei und Bindung bleiben Teil des Modellvertrags und seiner
bestehenden Prüfung. Keine Vollgarantie und keine neue Sprachheuristik daraus ableiten.

### Nicht in diesem Patch: allgemeiner Engine-Ankauf

Als spätere Alternative zu S2 könnte die Engine Standardloot selbst bepreisen. Das würde
mehr Prosa-Preisinterpretation entfernen, benötigt aber eine bewusste Preis-/Händlerentscheidung
und könnte die Testökonomie verändern. Dafür ist kein großes Marktmodell nötig.
Für den jetzigen Plan empfehle ich erst den klaren Endpreisweg; keine automatische neue Ankaufstabelle.

## 7. Technische Umsetzung und Abnahmegrenzen

| Bereich | Bestehende Stellen | Was später konkret zu ändern wäre |
|---|---|---|
| Freier Vorschlag/Bestätigung | `v4/commands.js:pay/paymentProposal/confirmPayment/freePayment`; `commands.js:runCommands` | Nur native bestätigte Entscheidungen buchen freie Abgänge. Den alten Freitext-Bucher wirklich entfernen, nicht nur verstecken. |
| Host/Persistenz | `v4/runtime.js`, `host.js`, vorhandene Enginebefehl-Routen | Native Aktion als Eventrecord speichern; nur UI-Panel und Zustandsänderung, kein unnötiger Modellaufruf. Wiederholung/Reload/Swipe konsistent. |
| Neue Preisquelle | `v4/extract.js`, `v4/context.js`/tatsächlich gelieferter Narrator-Vertrag, Vokabularbeschreibungen, `finance_evidence.js`, `world.offer/bid/dealTerms` | Expliziter Gesamtpreisvertrag, konkrete Klärungsmeldung und unteilbares Los; keine alten Preisinterpretationen als Ausweichweg. Falls der Kartenvertrag betroffen ist, Revision und Updatehinweis anpassen. |
| Zustimmung | `trade.acceptanceWhy/positionPrices/tradePrice`, `interpret.amountErrors`, `planner`, `commands.offer.accept` | Eine zugeordnete Preiszustimmung statt mehrerer Ganztextleser; vorhandene Limits und Auswahl weiter prüfen. |
| Unveränderter Buchungskern | `trade.linePrice/pickLines/bookPurchase/bookSale`, `guild.completeContract`, `lootEvents` | Nur soweit ein neuer klarer Aufrufer nötig ist anfassen; keine neue Arithmetik, Preisbalance oder Eigentumslogik. |
| Runner | `tools/st_live/live/players.mjs` (`PLAYER_COMMANDS`/`PLAYER_MECHANICS`) und Engine-Ergebnisdarstellung | Exakte Bedienaktion samt Vorschlags-ID erklären; keine automatischen Zahlungen/Bestätigungen durch den Driver und keine neue Spielstrategie. |
| Dokumentation/Kanon | 02 nach Designfreigabe; 03 aktueller Stand; eine Dev-Patchnote | Dieser Plan ist Vorschlag. Alte Analysen nicht umschreiben und nicht überall dieselbe Begründung kopieren. |

**Pflichtfälle bei Umsetzung:**

1. A1–A14 als Positivmatrix: Waffe/Fokus/Rüstung, Manuals, Einzelartikel, bekannte Mengen,
   Warenkorb, Dienst, Bid-Annahme, Teilmenge, Registrierung, Quest, Loot und erneuter unabhängiger Vorgang.
2. Q5 mit verschiedenem `for`, beiden Reihenfolgen und Folgefrage: vor nativer Bestätigung
   kein freier Abgang, genau eine Entscheidung, danach genau eine Transaktion.
3. Normale Rollenspiel-Zahlungsformen erzeugen denselben Vorschlag; kein wachsender Wortkatalog.
   Nur eine eigenständige Engine-Eingabe bestätigt: Zitat, Narrator, angehängter Befehl,
   Mehrfachbefehl, Freitext-`confirmation` und direkte Freitextzahlung dürfen nicht buchen.
   Geschlossene/unbekannte/verworfene IDs zahlen nichts; eine gültige offene ID bleibt nach
   Statuspanel/Reload nutzbar. Wiederholung zahlt kein zweites Mal, Swipe folgt dem aktuellen Eventzweig.
   Host/Runner-Kette mit sichtbarem Vorschlag → vom Testspieler selbst gewähltem `#pay` → genau einer
   Buchung prüfen; kein verstecktes Bestätigen und kein zusätzlicher Planner/Narrator/Extractor-Aufruf.
4. Drei Einheiten eines gespeicherten6-cp-Preises kosten18; bekannte260/160 ergeben420.
   Unteilbare Lose bleiben abgewiesen. Geänderte/fehlende Ware oder abwesende Partei buchen nicht.
5. Neue freie Rede „four each“/mehrere Teilpreise ohne Endsumme wird nicht als Gesamtlospreis
   gebucht; klare Endofferte wird gespeichert und korrekt angenommen. Alte/alternative Preise
   und echte Bedingungen werden nicht als neue Zustimmung behandelt. Gemeinsamer Lospreis:
   vollständige Auswahl bucht einmal; einzelne Position oder Mengenänderung ohne eigenen Preis
   bucht nichts. Narrator/Extractor erhalten denselben Endpreisvertrag, fehlende Summe erzeugt
   die konkrete Rückfrage; klare Endofferte benötigt keinen weiteren Pflichtzug.
6. Neues Annahmebeispiel mit300-cp-Geldbestand und festem260-cp-Angebot funktioniert,
   aber ein tatsächliches Limit250, ein Gegengebot oder eine unvollständige Artikelauswahl bucht nichts.
7. Verkäufe und Käufe/Trinkgeld in einem Input werden nicht gegenseitig zur zweiten Buchung.
   Geschenk/Nachzählung/Versprechen bleiben getrennt; echte freiwillige NPC-Gabe funktioniert.
8. Bestehende aktuelle Zustände, originale Archive, Tests und Fingerprints nachvollziehbar behandeln.
   Kein automatisches Umwerten alter Angebote, kein Verfälschen historischer Modellantworten;
   alte Kampagnen brauchen dafür keinen allgemeinen Migrationsapparat.
9. Zielregressionen zuerst rot, dann grün; vollständige Node-Suite, einzeln begründeter
   Replay und echte ST-Hostintegration der neuen nativen Aktion. Danach unabhängiger Review,
   erst anschließend natürlicher Batch.

Im natürlichen Vergleich künftig **pro einmaligem Geschäft** erfassen:
Angebot entsteht, wird gewählt, korrekt gebucht oder korrekt/fehlerhaft abgewiesen;
Anzahl zusätzlicher Spielerinputs, Repairs und Erzählwidersprüche getrennt.
So unterscheiden wir eine mehrfach wiederholte Verkaufsschleife von vielen verschiedenen Fehlern.

## 8. Vor Umsetzung zu entscheiden

| Entscheidung | Empfehlung |
|---|---|
| S1: freie Zahlungen nur direkt bestätigt? | **Ja.** Die vereinbarte Grenze ist auf .143 nachweislich gescheitert. |
| Oberfläche für S1? | Zunächst exakter Enginebefehl mit ID und sichtbarer Vorschlagskarte; optional später Button. |
| S2: neue freie NPC-Preise nur als ausdrückliche Endofferte? | **Ja**, samt Entfernung der zweiten Preisrekonstruktion bei Annahme. Engine-Mengen und Katalogkörbe behalten. |
| Alle eingehenden Geschenke bestätigen oder deckeln? | **Nein**, derzeit kein neuer struktureller P1-Nachweis; bestehende Grenzen und klare Übergabe erhalten. |
| Alle Händler auf feste Enginepreise umstellen? | **Nein.** Reguläres F-Gear/Manuals sind bereits so; Standardloot-Ankauf wäre ein eigener wirtschaftlicher Schritt. |
| Alle Käufe auf Klick/Slash umstellen? | **Nein.** Klare gewöhnliche Käufe und gespeicherte Offerten weiter natürlich annehmbar. |
| Preise/Balancing zugleich ändern? | **Nein**, dieser Eingriff ordnet Autorität und Bedienung. Keine stillen Ankaufquoten. |

**Noch keine Umsetzung.** Produkt bleibt .143. Die notwendigen konkreten Verluste an Komfort
und die bewusst erhaltenen Fähigkeiten stehen hier zur Entscheidung; nicht als bereits beschlossener
Designkanon behandeln. Nach Freigabe ein begrenzter Fachpatch, keine erneute allgemeine Finanz-Auditserie.

## 9. Bewertung des GPT-Gegenreviews (01.11.2026)

Grundlage: `Chatgpt Feedback(20261101-092246).md`, geprüft gegen den unveränderten Produktstand .143.
Den vier Ergänzungen stimme ich zu: exakte native Eingabe, bedienbarer sichtbarer Vorschlag,
Narrator-/Extractor-Endpreisvertrag mit Losschutz und Entfernung der zweiten Preisrekonstruktion.
Sie präzisieren §§4.4, 6 und 7; keine zusätzliche Architekturmaßnahme oder neue Auditphase nötig.
`runCommands()`/`splitCommands()` und der Runner bestätigen die genannten Ansatzpunkte;
`bidSale()` schützt bereits unbepreiste Teillose und soll dafür weiter genutzt werden.

Zwei Grenzen bleiben ausdrücklich: Reload ist nicht selbst ein Ungültigkeitsgrund, und „alte
Zahlungswege entfernen“ betrifft die beiden **freien** Abbuchungswege, nicht Kauf, Registrierung
oder Dienste. S1 folgt aus Q5/Stoppregel; S2 bleibt eine zusätzliche bewusste Vereinfachung.
Die Freigabeempfehlung des Reviews ist keine Nutzerfreigabe zur Implementierung. Produkt und
Designkanon bleiben unverändert; als Nächstes ist nur die gemeinsame Entscheidung über S1+S2 nötig.
