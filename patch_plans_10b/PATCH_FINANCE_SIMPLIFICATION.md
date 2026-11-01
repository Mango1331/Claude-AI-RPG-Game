# Avereth Engine – Finanzvereinfachung S1 + S2

**Stand: 01.11.2026 · abschließend konsolidierter technischer Fachplan; noch keine Implementierung.**
Produkt geprüft: **[.143 / d2a292a](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d2a292a1ba6ce1fc537238e9f51306a8bec2cce9)**.
Die .143-Gegenprüfung hat Q5 erneut als P1 reproduziert. Die Stoppregel des
[bisherigen Fachplans §7.4](PATCH_FINANCE_REVIEW142.md) ist damit für freie Zahlungen/Bestätigung ausgelöst.
Dieser Plan trennt funktionierende Abwicklung von bewusst vereinfachter Spracheingabe und legt
S1 + S2 als **einen zusammenhängenden Produktpatch** fest. §§6–9 sind die Umsetzungsvorgabe;
§§1–5 enthalten Einordnung und Belege. Die Planfertigstellung ist keine Implementierungsfreigabe.

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
- GPT-Gegenreview und Claude-Ergänzungen samt anschließender Sol-Bewertung sind hier konsolidiert.
  Die bisherigen vollständigen Reviews bleiben in der [Vorfassung §§9–10](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/94ab3c4d0a71137ee40aac46e600766d130a7896/patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md#9-bewertung-des-gpt-gegenreviews-01112026) erhalten; keine zusätzliche Reviewdatei.
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
noch kein neuer bindender Lospreis. Der Händler nennt die Endsumme; der Spieler muss sie nicht ausrechnen.

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

## 6. S1 – Freie Zahlungen: Vorschlag und native Bestätigung

### 6.1 Festlegungen und Umfang

| Punkt | Festlegung für diesen Fachpatch |
|---|---|
| Oberfläche | Exakte eigenständige Eingabe `#pay <decision-id>`; ein Button ist nicht Teil dieses Patchs. |
| Mehrere Personen | Eine offene freie Karte je Empfänger aus derselben Spielernachricht; separat bestätigen. |
| Unklare Käufe | Keine zusätzliche Kaufkarte. Vorhandene Angebotsauswahl/Registrierungs-/Servicewege bleiben; Karten dafür sind nur eine spätere Ausweichoption. |
| Gültigkeit | Bis zur nächsten normalen handelnden Spielernachricht oder einem Ortswechsel; kein Verfall allein durch Statuspanel oder Reload. |
| Vorabkauf | Nur eine ausdrücklich zugeordnete Gesamtgrenze autorisiert einen noch unbekannten Preis (§7.3). |
| Abnahme | Feste Sicherheits- und Komfortgrenzen nach §9. |

Die feste Stoppregel wurde vom Nutzer ausdrücklich gewählt. Die drei übrigen Auswahlfelder
blieben unbeantwortet; dieser fertige Plan verwendet die angekündigten Empfehlungen
(pro Empfänger, keine Kaufkarte, Gesamtlimit). Daraus keine zusätzliche Produktfreigabe ableiten.

### 6.2 Freitext erzeugt Karten, niemals freie Abbuchungen

- `pay` darf außerhalb bekannter Fachgeschäfte nur einen Vorschlag öffnen. Das gilt auch bei
  eindeutigem Zahlungsverb und vollständig verifiziertem Betrag. Kein freier Sofortabgang.
- Kartenvoraussetzungen: identifizierter anwesender Empfänger, vollständiger positiver
  Geldbetrag aus der zugeordneten Spielerquelle und keine Geldforderung an den NPC.
  Unsicherheit über die Übergabeform darf eine Karte ergeben; eine unbelegte Modellzahl,
  ein Teilbetrag, fehlendes Geldargument oder abwesender Empfänger wird dadurch nicht legitim.
- Wiederholte identische Meldungen derselben Handlung ergeben eine Karte. Verschiedene Beträge
  oder widersprüchliche Zwecke an dieselbe Person innerhalb eines Inputs: klären, keine
  Addition und kein „letzter Befehl gewinnt“. Unterschiedliche Empfänger verdrängen sich nicht.
- Eine spätere eigenständige Gabe bleibt zulässig. Keine globale Sperre nach NPC/Betrag.
- Karte zeigt Richtung PC → NPC, Name, Zweck, cp, Wallet aktuell/nach Zahlung, eindeutige ID,
  „NOT PAID“ und den vollständig kopierbaren Befehl. Bei unvollständigem Betrag kein
  ausführbarer Bestätigungsbefehl. Kein neues Kartensystem: vorhandene Entscheidungen/Panels nutzen.
- Registrierung, Einkauf und Services dürfen nicht als freie Gabe umgangen werden.
  Ein offenes Registrierungsangebot allein macht ein unabhängiges Trinkgeld nicht zur Gebühr.
  Unklare Kaufzuordnung zeigt das konkrete bestehende Angebot oder die fehlende Auswahl;
  sie wird weder frei bezahlt noch mit weiteren Zahlungswortlisten „repariert“.

### 6.3 Native Bestätigung, Gültigkeit und Einmaligkeit

1. Vor `splitCommands()` die **gesamte echte Spielereingabe** auf `#pay` plus genau eine ID
   prüfen. Kein Zitat, Prosa, angehängter Befehl, Mehrfachbefehl oder Narrator-/Extractor-Text
   darf auslösen. Ungültige Eingaben werden sichtbar abgewiesen, ohne Freitext-Zahlungsfallback.
2. Nur eine aktuell offene Entscheidung mit `kind:'payment'`, `route:'free'`,
   `state:'needs_confirmation'` und vollständigem Betrag ist bestätigbar.
   `needs_amount`, Eintrittsgebühren und andere Fachentscheidungen sind ausgeschlossen.
3. Da native Befehle vor `turn.begun` laufen, gilt im unveränderten Ablauf `d.turn === s.turn`.
   Zusätzlich Quelle, Standort, lebender/anwesender Empfänger, Betrag, Route und Guthaben prüfen.
   `#pay` erhöht weder den normalen Spielzug noch Zeit, Kampf, Gebühren oder Modellaufrufe.
4. Mit der nächsten normalen handelnden Nachricht verfallen alte Karten; Ortswechsel ebenfalls.
   Reine Panels und die Bestätigung einer anderen gültigen Karte verbrauchen dieses Fenster nicht.
   „Yes, I pay“ bestätigt nicht: alte Karte verfällt, ein vollständiger neuer Zahlungswunsch
   kann eine neue Karte erzeugen. Keine neue Karte allein aus einer nackten Zustimmung erfinden.
5. Vorhandenen Zahlungsbucher wiederverwenden: `coin.changed`, `transaction.completed` und
   `decision.closed` in einem gespeicherten Record. Zweiter Aufruf derselben ID zahlt nichts.
   Bei mehreren Karten Guthaben nach jeder tatsächlichen Zahlung neu prüfen; die Vorschau
   einer anderen Karte ist keine Reservierung von Geld.

### 6.4 Edit, Reload, Swipe und Erzählerkontinuität

`turn + seq` ist nach Bearbeitungen keine hinreichende Identität. Vorschlag an seine Quelle
binden: vorhandene Nachrichtenreferenz, Inputhash und Sequenz; daraus eine stabile ID ableiten
oder diese Quellenidentität gleichwertig prüfen. Kein zufälliger globaler Zähler.

Das native Zahlungsrecord speichert die bestätigte Quellenreferenz und den fachlichen
Schnappschuss (ID, Empfänger, cp, Ort, freie Route, Zweck). Beim erneuten Fold **vor seinen
Geldereignissen** prüfen: Quelle unverändert und genau dieser Vorschlag im aktuellen Zweig offen.
Fehlt er oder hat er sich geändert, den gesamten Zahlungsrecord als Foldfehler behandeln;
vorhandenes `foldBlock` verhindert die Weiterverarbeitung. `foldBlock` selbst stellt keine
inhaltliche Gleichheit her. Eine Prüfung erst nach dem Geldabgang ist unzureichend.
Keine allgemeine neue Eventmaschine und keine Nebenliste bezahlter IDs.

Reload eines gültigen offenen Vorschlags bleibt zulässig. Regeneration/Swipe der aktuellen
Erzählung verwendet das bereits aufgelöste Spielerrecord und erzeugt keine zweite Zahlung.
Frühere Edits, Löschungen und abweichende Zweige müssen ausdrücklich geprüft werden;
die Aussage „Swipe ist immer unkritisch“ ist dafür keine Ersatzgarantie.

Vor der nächsten normalen Erzählung die seit dem letzten erzählten Spielerzug gebuchten
nativen Zahlungen aus bestehenden Records in eine kurze bestätigte Faktzeile übernehmen:
„Before this input Alaric handed Tam 5 cp (confirmed). Do not pay it again.“
Auch `#pay` → `#bag` → normale Handlung und mehrere Karten müssen funktionieren.
Nicht nur die unmittelbar vorige Nachricht ansehen. Kein persistenter Bestätigungs-Queue,
kein Modellaufruf für `#pay`, keine erneute Geldbuchung durch diese Faktzeile.

### 6.5 Entfallender Code und Modell-/Runner-Vertrag

Für freie Zahlungen entfallen direkte Freitextabbuchung, `paymentConsent()`,
Geschwister-`pay`-Suche, `paymentSources` und der `for`-Vergleich als Zahlungsautorität.
Eindeutige Fachrouten und der gemeinsame Bucher bleiben.

`pay.confirmation` aus dem aktiven Planner-Schema und der Kataloganweisung entfernen.
Betroffene Protokollversion anheben; nicht nur das Feld ignorieren und weiter anfordern.
Der Planner erzeugt keine Bestätigung für den nativen Befehl.

`PLAYER_COMMANDS`/`PLAYER_MECHANICS` und Hilfe erklären knapp: Nur eine gewollte, sichtbare
Karte durch genau ihren Befehl bestätigen; Freitext-„Yes“ zahlt nicht. Der LLM-Spieler
entscheidet selbst. Driver/Batchrunner dürfen nichts automatisch bestätigen, umschreiben
oder aus Engineinternas auswählen. Ziele, Klassenstrategie und Fortschrittsregeln bleiben.

## 7. S2 – Neue Preise als klare Endofferten

### 7.1 Neuer Preisvertrag, erhaltene Arithmetik

- Für neue freie NPC-Offerten/Gebote genau eine vollständige ausdrückliche Endsumme je
  angebotenem Los oder eigenständig bepreister Position. Ware, IDs/Mengen, Gegenpartei und
  gegenwärtige Bindung müssen zum Angebot gehören. Vollständige Währung; kein nackter Betrag.
- Im aktiven neuen Preisvertrag `basis:'unit'` und `basis:'positions'` entfernen bzw. als
  nicht ausführbar ablehnen. Keine alternative Rückkehr zur Extractorzahl, zu allgemeinen
  Zahlenlesern, geerbter Währung oder impliziten Zuschlägen nach gescheitertem Endpreisbeleg.
  Gemeinsam genutzte Münz-/Geschenkleser nicht pauschal löschen.
- Quellenbindung und bestehende vollständige Geldbelege behalten. `phase`/Bedingung bleiben
  Teil des Modellvertrags; vorhandene Prüfung darf nur herabstufen. Die vorhandene
  `unit_price_as_total`-Sperre erhalten, nicht zum allgemeinen Sprachparser erweitern.
- Bedingungen wie Gutachter, Qualitätsprüfung oder spätere Lieferung bleiben Information.
  Erst eine neue feste Offerte kann angenommen werden; keine automatische Bedingungsausführung.
- Gespeicherte Enginepreise, `linePrice()`, `pickLines()` und Losregeln bleiben:
  3 × 6 = 18 cp, 260 + 160 = 420 cp; zwei Stück aus „3 für 10“ werden nicht still gerundet.
  Bestehende feste Angebote nicht umwerten, abgeschlossene Transaktionen nie neu bepreisen.
- Ein neuer Gesamtpreis eines mehrteiligen Loses darf nicht auf jede Position kopiert oder
  willkürlich verteilt werden. `bidSale()` schützt bereits unbepreiste Teillose.
  Teilmenge oder Einzelartikel daraus benötigen einen eigenen gespeicherten Preis/neue Offerte.
  Bei Einkaufslosen ohne passende vorhandene Repräsentation getrennte Endpreise verlangen,
  kein neues Bündel-/Rabattmodell entwickeln.
- Verkauf und Einkauf bleiben getrennte vollständige Transaktionen. Beide können im selben
  Input erfolgen, wenn jeweils autorisiert; keine stille Nettoverrechnung, Gutschrift oder Kredit.

### 7.2 Narrator und Extractor bedienen denselben Vertrag

Der tatsächlich gelieferte Narrator-Kontext muss erklären: Bei einer festen Händlerzusage
die vollständige Endsumme wiederholen, auch wenn der Spieler sie vorgeschlagen hat.
„Sixty copper for the lot?“ → „Done.“ reicht nicht; „Sixty copper it is, for all fourteen plates.“
liefert die nötige Preisquelle. Keine neue JS-Zustimmungserkennung.

Extractor-Schema, Beispiele, Repairhinweis und `world.offer/bid → dealTerms` konsistent anpassen.
Bei unklarem Preis konkret mitteilen, **welche Ware/Menge keine bestätigte Endsumme hat**
oder welche Bedingung noch offen ist. Keine bloße Meldung „Preis ungültig“.
Vorhandenen begrenzten Repair wiederverwenden, keine zusätzliche Modellrunde als Pflicht.
Klare neue Endofferten und normale gespeicherte Käufe benötigen keinen weiteren Pflichtdialog.

**Bewusster Verlust:** Neue bloße Stückpreisrede für ein größeres Los, nur errechnete
Positionssummen, implizite Währung und Zuschläge ergeben noch keinen bindenden Gesamtpreis.
Auch neue Zimmerangebote für mehrere Nächte benötigen eine Endsumme. Ein Preis für **eine**
Nacht kann hingegen als eine Einheit gespeichert werden; spätere Mengenrechnung eines bereits
gültig gespeicherten Einzelangebots bleibt erhalten. Keine widersprüchliche pauschale
Abschaffung aller „pro Nacht“-Preise.

### 7.3 Annahme und ausdrückliche Spielergrenzen

- Gespeicherte gültige Auswahl akzeptiert ihren gespeicherten Preis. In `acceptanceWhy()`
  die zweite Preisrekonstruktion über `positionPrices()`, `tradePrice()`, `coinMentions()`
  und Ganztext-`coinFromWords()` entfernen, soweit sie diesem Zweck dient.
- Geldbestand, Nebenbetrag oder Kommentar sind keine neue Preisvereinbarung.
  Partei, Positionen, Mengen, vollständige Mehrartikelauswahl und echte Ausschlüsse weiter prüfen.
- Zugeordnete ausdrückliche `agreed_cp`, `max_cp` und `min_cp` bleiben verbindlich und
  quellengestützt. Ein Rabattwunsch/Gegengebot nimmt nicht automatisch den alten Preis an.
  Keine stille Entfernung eines ausdrücklich genannten Limits, auch bei `any_price`.
- Für Vorabkäufe nur eine ausdrückliche **Gesamtgrenze** verwenden. „Drei Stück, höchstens
  vier Kupfer pro Stück“ ist ein Wunsch, keine Autorisierung des unbekannten Gesamtpreises.
  Das konkrete gespeicherte Angebot kann danach normal angenommen werden. Ein ausdrücklich
  genanntes Stücklimit darf dabei nicht still als Zustimmung zu einem höheren Preis behandelt
  werden; bei fehlender zuordenbarer Gesamtgrenze konkret nach Gesamtlimit/Annahme fragen.
  Keine neue Stückpreis-Prosa-Arithmetik in `provenNumber()`/`playerPrice()`.
  Ein gemeldeter Stücklimit- oder sonst ungültiger Limitbeleg führt über den vorhandenen
  Klärungsweg zum Buchungsstopp; ihn nicht zu `null` degradieren und dann grenzenlos kaufen.
  Falls `basis:'unit'` dafür noch als nicht ausführbare Eingabemarkierung gebraucht wird,
  bleibt nur diese Ablehnung erhalten, nicht die Multiplikation oder eine neue Preisautorität.
- Ein vorhandener 260-cp-Kauf funktioniert auch bei „I have 300 copper. I buy the sword.“
  Ein tatsächliches Gesamtlimit 250 cp oder ein abweichendes Gegengebot verhindert die Buchung.

Die Endpreisregel reduziert unsichere Preisrollen, beweist aber nicht beliebige Semantik.
Falsch klassifizierte Bindung bleibt ein Modellvertragsrisiko; keine Vollgarantie behaupten
und daraus keine neue Folge von Bedingungswortlisten ableiten.

## 8. Ein Fachpatch: Umsetzung und technische Abnahme

### 8.1 Reihenfolge und Verantwortlichkeiten

| Schritt | Betroffene Stellen unter `avereth-engine/` | Konkreter Abschluss |
|---|---|---|
| 1. Regressionen auf Basis .143 | Finanz-/Hosttests und Originalfixtures | Entscheidende Fehler rot zeigen; funktionierende Kontrollen unverändert. Originalarchive nicht editieren. |
| 2. S1-Kern | `src/v4/commands.js`, `src/commands.js`, `src/v4/domain.js` soweit nötig | Nur Vorschläge aus Freitext; native Aktion, mehrere Empfänger, Gültigkeit, einmaliger vorhandener Zahlungsbucher. |
| 3. S1-Host/Vertrag | `src/host.js`, `src/v4/runtime.js`, `src/v4/catalog.js`, Kommandoschema/-beschreibungen | Quellen-/Foldschutz vor Geldereignissen, Erzählerfakt, kein Planner-`confirmation`. Echten ST-Kurzpfad früh prüfen. |
| 4. S2 | `src/v4/finance_evidence.js`, `extract.js`, `world.js`, `trade.js`, `interpret.js`, `planner.js` | Endpreis auf allen aktiven Eingängen, keine schwächeren Fallbacks; gespeicherte Annahme ohne zweite Preislesart. |
| 5. Bedienung | `src/v4/context.js`/Narrator-Vertrag, Hilfe, `tools/st_live/live/players.mjs` | Endpreisregel und konkrete Rückfragen; sichtbare native Bestätigung, keine Driverautomatik. |
| 6. Abschluss | Versionen, eine Dev-Fachpatchnote, passende Hauptdokumente | Nächste freie Buildnummer; betroffene Protokollversionen anheben. Falls persönliche Karte geändert wird, Revision und Updatehinweis nennen. |

`bookPurchase()`, `bookSale()`, Gearpreise, `completeContract()`, Loot, Mengen-/Besitz- und
Präsenzregeln bleiben der bestehende Kern. Nur notwendige Aufruferanpassungen.
Die Grenze `#pay` gilt auf allen aktiven freien Zahlungseingängen; keinen erreichbaren
Altpfad als Ausweichweg stehen lassen. Keine Pflicht, alte Runtimeformate weiterzuentwickeln.

### 8.2 Regressionsmatrix

| Bereich | Pflichtfälle und erwartete Events |
|---|---|
| Positivmatrix A1–A14 | Waffe/Fokus/Rüstung, Manuals, Einzelkauf, Menge, Warenkorb, Dienst, feste Bid-Annahme, Split, Registrierung, Quest und Loot buchen über bisherige Fachwege; keine allgemeine Bestätigungspflicht. |
| Q5 / beide Reihenfolgen | Gleiches Geld mit verschiedenem `for`, direkte Zahlung plus alte `confirmation`: kein freier Abgang; eindeutiger Vorschlag, nach `#pay` genau eine Transaktion. |
| Mehrere Empfänger | Tam 5/Wim 2: zwei Karten; beide nacheinander bestätigbar, keine gegenseitige Verdrängung, ausreichendes Geld jeweils neu prüfen. Konflikt an Tam: keine Last-wins-Karte. |
| Native Eingabe | Nur vollständiges eigenständiges `#pay ID` löst aus. Zitat, angehängter Text/Befehl, mehrere IDs, Narratorausgabe und Plannerfeld zahlen nichts. |
| Andere Entscheidungen | `needs_amount`, Dungeon-Eintritt, unbekannte/geschlossene/abgelaufene IDs: keine Geldereignisse. Vorhandene kanonische Bezahlwege funktionieren. |
| Gültigkeit | Panels/Reload erhalten offene Karte; normale Handlung/Ortswechsel lassen sie verfallen. „Yes, I pay“ zahlt nicht; ein neuer vollständiger Wunsch kann neue Karte ergeben. |
| Edit/Replay/Swipe | Nach Zahlung alte Quelle ändern/löschen; auch gleicher Turn/Seq mit anderem Inhalt: Fold blockiert vor ihrem Geldrecord. Unveränderter Reload/Regenerate zahlt nicht doppelt; Zweigwechsel konsistent. |
| Erzählerfakt | Zahlung → normale Handlung; Zahlung → `#bag` → Handlung; zwei Zahlungen → Panel → Handlung: alle bestätigten Übergaben korrekt im nächsten Kontext, keine neue Auszahlung. |
| Neue Endpreise | T53/T55/T58, Platten/Drüsen, Stück-/Positions-/alte/neue Preise: ohne vollständige Endsumme keine bindende Offerte; neue klare Summe einmal richtig buchbar. |
| NPC-Zustimmung | „Done.“ allein bleibt ohne Gebot; konkrete Rückfrage. Wiederholte Endsumme für das Los ergibt feste Offerte ohne weiteren Pflichtzug. |
| Menge/Los/Dauer | Gespeichert 3×6=18,260+160=420; unverteilbarer Lospreis nicht teilbar. Neue Mehrnächte-Offerte nur mit Endsumme; gespeicherte gültige Einzelpreise weiterhin berechenbar. |
| Annahme/Limits | 300-cp-Besitz blockiert 260-cp-Schwert nicht. Limit250, Gegengebot, falsche Partei, ausgeschlossene/fehlende Ware und unvollständiger Paketwunsch bleiben geschützt. Stücklimit autorisiert keinen Vorabkauf. |
| Gemischte Vorgänge | Verkauf + Kauf + getrenntes Trinkgeld; Kauf nicht freie Zahlung, Verkauf nicht Geschenk. Betrag, Ware und Zustimmung je Geschäft; keine zweite Auszahlung. |
| Geschenke | Tatsächliche neue freiwillige NPC-Gabe mit vollständigem Betrag zählt; Versprechen, Nachzählung und schon gebuchter Erlös nicht. Keine neue Geschenkdeckelung, keine Privatquests. |
| Fachweg-Grenzen | Offene Registrierung + unabhängiges Trinkgeld; klare Zahlung für gültigen Kauf; unklare Kaufzuordnung ohne Karte/Geldverlust. Keine Erweiterung der Zahlungswortlisten. |
| Runner/Host | Sichtbarer Vorschlag → vom Testspieler gewählte Nachricht `#pay` → einmalige Buchung und Speicherung. Kein zusätzlicher Planner/Narrator/Extractor; keine automatisierte Bestätigung. |

Zieltests gegen unverändertes .143 und korrigierten Stand laufen lassen; Red/Green nur für
wirkliche Verhaltensänderungen fordern. Neue Fähigkeiten wie `#pay` zusätzlich durch vollständige
Hostketten prüfen, nicht nur durch Parser-Unit-Tests. Danach angrenzende und volle Node-Suite,
Fingerprint-Replay und echte ST-Standard-/Failsoft-Smokes. Blockierte Abnahme ehrlich offenlassen.

### 8.3 Replay ohne pauschale Akzeptanz

Einmaliges vollständiges Replay mit unveränderten historischen Requests/Antworten.
Erwartete Änderungen nach Ursachen gruppieren: freier Abgang → Karte, freier Preis ohne
Endsumme → unverbindlich, neuer Vertrag statt alter Felder, korrigierte Annahme/Meldung.
Gruppen mit repräsentativen Originalfällen begründen; **jeder akzeptierte Record bleibt exakt
fingerprintgebunden**. Unerwartete Geld-, Eigentums-, Parteien- oder Mengenänderungen einzeln
untersuchen; keine pauschalen Fingerprintupdates und keine Freigabe allein durch eine Kategorie.
Historische falsche Buchungen nicht als zu erhaltendes Soll behandeln.

Replay zeigt auch Korrekturen alter Fehlbuchungen, nicht nur Funktionsverluste.
Er kann den neuen Dialog und die Nutzung von `#pay` durch ein echtes Modell nicht messen.
Dafür neue Vertragsfixtures/Hostfälle und anschließend ein freigegebener natürlicher Batch;
Originalarchive niemals umschreiben, um den neuen Dialog vorzutäuschen.

## 9. Feste Stoppregel, Grenzen und Übergabe

### 9.1 Sicherheit und Komfort getrennt bewerten

| Messpunkt | Festlegung | Konsequenz bei Verfehlung |
|---|---|---|
| Freier Abgang ohne gültiges natives `#pay` | **0**. Kanonische Käufe/Gebühren sind keine freien Abgänge. | Technische Abnahme nicht bestanden; fehlenden Schutz gegen diesen Plan korrigieren, keine neue Zahlungswortliste. |
| Doppelbuchung derselben Übergabe | **0** | Wie oben; natürliche Batches erst nach gesicherter Einmaligkeit. |
| Zusätzliche Spielerinputs je einmaligem Finanzgeschäft | **Im Mittel höchstens 1**, einschließlich notwendigem `#pay`. | Ursachenprüfung und bewusste Vereinfachungsentscheidung; kein weiterer Preisparser. |
| Derselbe Konflikt bei einem Geschäft | **Ab der dritten Wiederholung Prüfgrenze erreicht.** | Spielerschleife von Engine-/Vertragsfehler trennen; über Ausweichweg entscheiden, keine neue Wortliste. |
| Erzählung widerspricht Buchung | Separat erfassen: erzählt/ungebucht bzw. gebucht/unerzählt. | Gelieferten Kontext, Faktzeile und Modellantwort prüfen; keine automatische Geldkorrektur aus Prosa. |

**Zählregel:** Ein Geschäft ist dieselbe Auswahl/Partei/Richtung, keine neue Einheit pro
Wiederholungsnachricht. Vom ersten konkreten Ausführungswunsch bis Buchung, endgültiger
Ablehnung oder bewusstem Abbruch verfolgen. Baseline: bei bekanntem Angebot eine Annahme;
bei noch unbekanntem Preis einmal Angebot einholen plus einmal annehmen; bei freier Zahlung
ein ursprünglicher Zahlungswunsch. Weitere zur Durchführung nötige Eingaben zählen zusätzlich,
auch `#pay`, Preispräzisierung und Fehlerwiederholung. Ein `#bag` zur Behebung eines Finanzkonflikts
zählt, freiwilliges Rollenspiel/Feilschen oder unabhängige Reise nicht.
Abgebrochene/ungeklärte Geschäfte und Stichprobengröße mitberichten; nicht nur erfolgreiche
Transaktionen betrachten. Native Bestätigungen und ungeplante Klärungen getrennt ausweisen.

Eine überschrittene Komfortgrenze autorisiert **keinen** automatischen Umbau.
Für Standardloot kann später ein Engine-Ankauf, für unklare Käufe eine native Kaufkarte
gesondert entschieden werden. Weder Preisquoten noch neue Bestätigungsrouten sind hier freigegeben.
Nicht jede ungeschickte LLM-Spielereingabe ist ein Enginefehler.

### 9.2 Nichtziele und Abschluss

Keine neue Finanzengine, kein allgemeiner Sprachparser, keine Bank/Kredit-/Tauschsimulation,
keine automatische Verrechnung, kein neuer allgemeiner Lootankauf und keine vorsorgliche
Einschränkung eingehender Geschenke. Keine Kampf-, XP-, PP-, Gearpreis-, Welt-, Reise-,
Quest-, Skill- oder Runnerstrategieänderungen. Historische Belege bleiben unverändert.

Ein zusammenhängender Produktpatch mit internen Schritten S1 → Host/Verträge → S2 → Abnahme,
keine Serie separat veröffentlichter Sprach-Mikrofixes. Patchnote nennt entfernte Leser/Guards,
verbliebene Grenzen, Prompt-/Protokolländerungen, echte Testzahlen und einzeln begründete
wirtschaftliche Replayabweichungen. Erwartet wird weniger doppelte Logik; keine künstliche
Zeilenzahlvorgabe, welche die notwendige native Validierung verhindert.
Status auf `main` knapp, technische Nachweise einmal in der Dev-Fachpatchnote.

**Danach unabhängiger Gegenreview und Stopp.** Natürlichen Batch erst nach Freigabe starten.
Neue strukturelle P1-Lücken führen zur vereinbarten Vereinfachungsentscheidung; ein isolierter
nachweisbarer Implementierungsfehler ist keine automatische Freigabe für einen Komplettumbau.

**Jetzt nur Planung abgeschlossen. Produkt bleibt .143 / d2a292a.**
Implementierung, neue Tests, Fingerprintänderungen und Produktbuild sind erst Gegenstand
eines gesonderten Umsetzungsauftrags.
