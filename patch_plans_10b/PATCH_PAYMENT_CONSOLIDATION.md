# Avereth Engine – Fachplan Finanzkonsolidierung

**Stand: 31.10.2026 · zur Implementierungsfreigabe, noch keine Umsetzung.**
Basis: **Build .141 / 3d8f062143956b4932398c4583f8962c9dfcffdd** auf dem Produktbranch
claude/c-planner-prototype-2026-10-02-gpt-c666; vor Implementierung erneut prüfen.
Nächste Buildnummer **.142 nur, falls dann noch frei**.

Grundlage ist der [gemeinsame Finanz-Audit](PAYMENT_SYSTEM_AUDIT.md), insbesondere Sol §§12–13,
sowie das Nutzerfeedback **Chatgpt Feedback(20261031-214616).md**.
Dieser Plan konkretisiert die dort empfohlene Variante C. Er ersetzt für die spätere Umsetzung
Claudes ursprüngliche Schritte F1–F9, ohne dessen Ursachenanalyse oder Originalbelege zu überschreiben.
Keine Änderung von Spielwerten oder sonstigen RPG-Systemen.

## 1. Übernommenes GPT-Feedback und Ziel

Das Feedback bestätigt die Analyse. Es enthält keine neue selbst reproduzierte Enginebeobachtung,
sondern vier besonders wichtige Implementierungsgrenzen:

1. **Freies pay:** Modelltyp und passende Zahl sind noch kein Nachweis ausgehender Münzen.
2. **Preisbasis:** Stückpreis, Positionspreis und ausdrücklicher Paketpreis müssen zugeordnet sein.
3. **Geschenk:** tatsächliche neue Übergabe und Beziehung zu konkreten Transaktionen prüfen;
   ein Handelspartner ist nicht grundsätzlich als Schenker gesperrt.
4. **Bindung:** Spielerzustimmung kann weder fehlende NPC-Zusage noch ausstehende Bedingungen ersetzen.

Diese Punkte werden unten zu konkreten Verträgen und Tests. Keine weitere allgemeine Auditphase.
Das im Feedback genannte Ziel „keine falsche Geldrichtung“ ist eine Sicherheitsanforderung, keine
Behauptung, dass JS beliebige englische Semantik mathematisch beweisen könne.

**Ergebnis des Patches:** Ein einziger zusammenhängender Finanzpatch ordnet Bedeutung, Beleg,
Verbindlichkeit, Zustimmung und Buchung. Unklare Daten behalten ihre Unsicherheit; sie werden
nicht durch allgemeinere Zahlen- oder Wortsuche verbindlich. Eindeutige Geschäfte bleiben direkt.

**Nicht einführen:** feste Bestätigungsschwelle nach Geldhöhe, Pflichtbestätigung jedes Geschäfts,
neue NPC-Geldbörsen, Bank/Kredit-/Schuldsystem, Privatjobs, allgemeine Regelengine, universeller
Prosa-Parser oder weitere obligatorische Modellanfrage. Keine Nebenarbeiten an Welt, Reisen,
Kampf, XP, PP, Gearpreisen, Runnerstrategie oder Boarddesign.

## 2. Zuständigkeiten und Sicherheitsinvarianten

| Instanz | Aufgabe | Darf nicht |
|---|---|---|
| Planner | Spielerhandlung, Parteien, Waren, Mengen, Zustimmung und zugehörige Belegteile modellieren; echte Unklarheit melden. | Forderung nach eigenem Geld in eine Zahlung umdeuten; Losgrenze auf Positionen verteilen, die nicht einzeln bepreist sind. |
| Extractor | NPC-Angebot/bedingten Vorschlag/tatsächliche Übergabe unterscheiden; Preisbasis und Quellen angeben. | Aus fehlendem Preis eine verbindliche Summe oder aus einem Versprechen eine aktuelle Übergabe machen. |
| Kleiner Belegkern | Fundstellen, Geldliterale, Vollständigkeit und ausdrücklich bezeichnete Rechnungen prüfen. | Richtung oder Verbindlichkeit aus einer beliebigen passenden Zahl erschließen. |
| Agency/Fachhandler | Spielerautorität, konkrete Zuordnung, Bedingungen, Präsenz, Eigentum und Zustimmung prüfen. | Bei unklarem Fachbeleg auf die ganze Nachricht/Antwort als lockerere Geldquelle ausweichen. |
| Buchungsfunktionen | Gesamte Auswahl frisch prüfen; genau diese Ware gegen genau diesen Preis einmal buchen. | Ein nicht ausführbares Angebot allein wegen status:open oder eines passenden Spielerlimits annehmen. |
| Host/Fold | Zusammengehörige Events im aktuellen Record speichern; Stale-/Swipe-/Replay-Schutz beibehalten. | Für eine reine Wiederholung des Folds neue Interpretation oder neue Auszahlung auslösen. |

Verbindliche Invarianten für den Patch:

- **I1:** Schwächerer, fehlender oder widersprüchlicher Beleg erhöht nie die Ausführbarkeit.
- **I2:** Geldbezug und Geldrichtung sind getrennt vom Rechenergebnis.
- **I3:** Kein unvollständiger Teilbetrag wird als endgültiger Gesamtbetrag gebucht.
- **I4:** Feste NPC-Zusage und Spielerzustimmung sind zwei getrennte Voraussetzungen.
- **I5:** Angebotspreis und Auswahl bleiben nach gültiger Speicherung stabil; Gegenangebot erzeugt
  einen nachvollziehbaren neuen Vertragsstand, keine stille Umwertung.
- **I6:** Ein wirtschaftlicher Vorgang wirkt einmal; ein wirklich unabhängiger zweiter Vorgang bleibt möglich.
- **I7:** Klare normale Käufe, Verkäufe, Zahlungen und Geschenke benötigen keinen neuen Pflichtzug.
- **I8:** Unabhängige gültige Aktionen gehen nicht verloren, nur weil ein Finanzschritt ungeklärt ist.
  Bereits vorhandene Abhängigkeitsregeln verhindern weiterhin Folgeaktionen ohne ihre Voraussetzung.

## 3. Kleiner gemeinsamer Belegkern

Vorgeschlagene neue reine Datei **src/v4/finance_evidence.js**, ohne State-Mutation, Provideraufruf
oder Zugriff auf versteckten Chatverlauf. Sie ersetzt die mehrfachen Betragslesarten, nicht die
Fachhandler. Bestehenden Tokenizer **economy.coinEvidence** wiederverwenden.

### 3.1 Ergebnis statt überladenem null/handled

Ein Ergebnis enthält:

    {
      state: "verified" | "missing" | "incomplete" | "contradicted",
      cp: integer | null,
      reported_cp: integer | null,
      reported_mismatch: boolean,
      reason: stable_code,
      source: { message, text_hash, ranges },
      calculation: { basis, quantities, amounts } | null
    }

- **verified:** Betrag ist vollständig und durch die zugeordnete Rechnung belegt.
- **missing:** Geldbetrag/Quelle fehlt oder keine eindeutige Fundstelle; nicht als null Euro verstehen.
- **incomplete:** Geldsumme oder ihre Zuordnung ist unvollständig/mehrdeutig; keine Teilbuchung.
- **contradicted:** konkret zugeordnete Quellen/Preisangaben widersprechen einander, sodass
  keine eindeutige belegte Summe übrig bleibt. Eine eindeutig berechenbare Geldgruppe mit
  falsch umgerechneter Modellzahl ist dagegen verified mit reported_mismatch:true und der
  richtigen abgeleiteten Summe; ihre Behandlung unterscheidet Spieler- und NPC-Berichte (§3.3).

Keiner der letzten drei Zustände erlaubt selbst eine Geldbewegung. Ein vorhandener bekannter
Enginepreis ist ein eigener autoritativer Preisweg, kein Prosa-Fallback. Im Ergebnis werden
Modellzahl und abgeleitete Zahl für Audit/Repair getrennt gehalten.

Belegzustand, NPC-Vertragsstatus und Spielerzustimmung werden **nicht** zu einem einzigen
„confidence“-Wert vermischt.

### 3.2 Quellen und Geldliterale

- Nur aktuelle Spielerquelle bzw. aktuelle Narratorantwort der betreffenden Handlung.
- Zitate normalisieren wie die bestehenden Belegprüfungen; gefundene Spannen deterministisch
  zuordnen. Gespeicherte ranges beziehen sich auf den originalen Quelltext; eine Normalisierung
  muss diese Zuordnung erhalten, nicht normalisierte und rohe Zeichenpositionen vermischen. Kein freies Fuzzy-Matching und keine Preisübernahme aus beliebigen anderen Sätzen.
- Mehrfach gleiche Fundstelle ohne eindeutige Zuordnung bleibt ungeklärt. Ein fehlendes Zitat
  wird nicht durch „der Betrag kommt irgendwo vor“ ersetzt.
- Ein Geldliteral umfasst die **vollständige zugehörige Geldgruppe**, nicht nur den bezifferten
  Teil vor „and the silver“. Vollständigkeit aus dem Tokenizer bis zum Aufrufer erhalten.
- Auslassungszeichen sind kein Weg, Bedingungen zu entfernen. Falls sie als Fundstellenanker
  unterstützt werden, bleiben die ausgelassenen Quellbereiche im Kontext erhalten; daraus
  entsteht kein stärkerer Beleg.
- Der volle aktuelle Text steht dem bestehenden Modell für die Bindungs-/Phasenentscheidung
  zur Verfügung. Eine wörtliche Fundstelle beweist nicht von selbst Vollständigkeit des
  wirtschaftlichen Kontexts. Keine zweite komplette JS-Semantikanalyse daraus bauen.
- Geldliteral, handelnde Partei und Kontext müssen zum selben Vorgang gehören. Aus einer
  Besitzangabe kann allenfalls eine eindeutig genannte **Währung**, niemals deren Zahl
  geerbt werden.

Kurzform **Bree**: „I have three silver—I'll give two to Bree“ verwendet als Geldliteral „two“,
als Währungsbeleg „silver“ im selben eindeutigen Satz. Ergebnis 20 cp. Zwei Platten haben
dagegen einen Sachgegenstand als Argument, keine reine Geldgruppe. Bei mehreren möglichen
Währungen keine freie Erbschaft.

### 3.3 Rechnen nur mit zugeordneten Rollen

Preisevidenz, als enges Schema und keine neue Preisengine:

    { basis: "total" | "unit", quote: string, currency_quote: string | null }

oder für ein positionsweise bepreistes Gebot:

    {
      basis: "positions",
      positions: [
        { line: integer, basis: "total" | "unit", quote: string,
          currency_quote: string | null }
      ]
    }

oder ausdrücklich:

    { basis: "unknown" }

**line** ist der eindeutige Index in den ursprünglichen Angebots-/Gebotszeilen. Vor dem
Zusammenführen von Stapeln an Objekt und Menge binden. Unbekannte/doppelte Indizes ablehnen;
keine beliebige Teilmengensuche über Zahlen.

| Basis | Rechnung |
|---|---|
| total | Vollständiges zugeordnetes Literal ist der Preis genau dieses Loses bzw. dieser Angebotszeile. |
| unit | Literal × tatsächlich angebotene Anzahl. Bei mehreren Stapeln gemeinsamer Satz nur bei bereits vorhandenem sameGoods/rateUnits-Nachweis. |
| positions | Jede Losposition genau einmal; pro Position ihr Einheitspreis × Menge oder ihr Positionsgesamtpreis; danach Summe. |
| unknown | Keine verbindliche Preisableitung. |

Für normale offer-Zeilen bezieht sich die Evidenz auf deren bestehendes qty/price_cp.
Bei bid bezieht sich total auf das ganze deklarierte Los; positions bildet seine Einzelzeilen ab.

Wichtig:

- 14 Platten ×4 cp ergeben 56; eine gemeldete Losgesamtzahl4 ist **nicht** durch das Vorkommen
  des Einheitspreises4 belegt.
- #380 darf den ausdrücklich genannten Paketpreis150 verwenden, obwohl vorher 60+80 genannt
  werden. Er ist dann ein total-Beleg, nicht eine widersprüchliche positions-Rechnung.
- Äquivalente Schreibweisen sind Bestätigungen desselben Werts, keine zusätzliche Summe.
- Ein expliziter Rabatt/Paketpreis wird nicht durch eine frühere Zwischenrechnung ersetzt.
- Andere Artikel, Geldbestand und frühere Preise gehören nicht in die Rechnung.
- Fehlende Rollen nicht durch „irgendeine zulässige Rechnung passt“ erraten.
- Bestehende Ganzkupfer-/Teilmengenregeln von linePrice/pickLines unverändert verwenden.

**Korrekturen:** Eindeutige NPC-Währungsfehler können wie bisher mit amount.corrected berichtigt
werden. Bei Spielerbeträgen/-grenzen wird ein Widerspruch als konkreter Repairhinweis behandelt;
keine still veränderte Spielerentscheidung. Brees richtige erste Antwort darf nicht mehr in
einen schlechteren Repair gelenkt werden.

## 4. Konkrete Vertragsänderungen

Die folgenden Informationen sind nur an Finanzhandlungen nötig; nicht an jedem Delta.

### 4.1 Spielerkommandos

Vorhandene Felder und Bedeutung von pay/buy/sell/offer.accept bleiben. Ergänzungen:

- **pay.money:** null oder **{quote:string, currency_quote:string|null}** mit vollständigem
  Geldargument und, falls nötig, Währungsbeleg. Es beschreibt die tatsächlich übergebenen Münzen, keinen Warenpreis hinter
  einer Gegenstandsübergabe.
- **pay.recipient_quote:** nullable Quellbezeichnung des Empfängers; mit vorhandenem to und
  Katalog abgleichen. Pronomen nur bei eindeutigem Bezug verwenden.
- **pay.confirmation:** nullable ID einer konkreten offenen Zahlungsentscheidung (§5).
- **buy/sell/offer.accept.price_evidence:** nullable total/unit-Evidenz nach §3.3, bezogen
  auf max_cp/min_cp/agreed_cp. Bei ausdrücklich genannter Zahl erforderlich; Quelle und
  ausgewählte Menge müssen zum jeweiligen Kommando gehören. Keine Belege für ein schlichtes „I accept“
  erfinden: Ein gültiges vorhandenes Angebot liefert bereits den Preis.

Die Pflicht, ein Geldargument zu belegen, darf nicht aufgelöst werden, indem nur ein neues
„direction:out“ oder „approved:true“ ergänzt wird. Der Typ pay kodiert die Richtung bereits.

**Schemaschnitt:** Neue Belegformen ausdrücklich in interpret.interpreterSchema/argSchema
bzw. den entsprechenden lokalen Schemakonstanten unterstützen. Kein generischer neuer
Schema- oder Kommando-Frameworkbau. Null/fehlende Evidenz bedeutet ungeklärt, nicht erfüllt.

### 4.2 Neue NPC-Handelsangaben

An **bid** und an jede normale **offer-Zeile**:

    phase: "firm" | "conditional" | "unclear"
    condition: string | null
    pricing: PriceEvidence

- firm: Die Gegenpartei nennt jetzt ein gültiges Angebot; nur die Spielerzustimmung fehlt.
- conditional: Eine echte Voraussetzung ist noch offen; condition beschreibt sie.
- unclear: Status nicht zuverlässig bestimmbar.
- condition allein wird nicht zu einer Programmiersprache. Keine automatische Auswertung
  beliebiger Qualitätstests, Fristen oder Abhängigkeiten.
- Reine Wahl, das feste Angebot anzunehmen, ist keine offene Drittbedingung.
- firm mit einer berichteten offenen Bedingung ist ein Widerspruch → vorhandener Repair oder
  ungeklärter Vorschlag. Keine automatische Priorität des günstigeren Flags.

**Erkennbare Quellwidersprüche bleiben eine eigene Schranke:** Ein falsch gesetztes firm
mit condition:null darf die bereits nachgewiesenen offenen Gutachter-, Zeit- oder
Lieferbedingungen nicht einfach freigeben. Ein kleiner, auf den zugeordneten Finanzkontext
begrenzter Widerspruchscheck darf nur herabstufen/Repair verlangen, nie Verbindlichkeit
beweisen. Dazu vorhandene nachgewiesene Schutzfälle erhalten; keine globale Wortsuche über
die gesamte Story und keine Fortsetzung der YOU/SPEAKER-Ausnahmenliste.
Reine Annahme-/Cash-Wahl bleibt als positiver Vertragsfall zu prüfen. Wenn der Check diese
nicht sicher von einer offenen Voraussetzung unterscheidet, lokal innerhalb des vorhandenen
Repairwegs klären; nicht nach der zweiten gleichlautenden falschen Klassifikation buchen.
Ein danach ungeklärter NPC-Preis braucht eine klare neue Offerte des NPC, keine einseitige
Spielerbestätigung.

### 4.3 Eingehende Geldübergaben

An **coin.gift** zusätzlich zum bestehenden from/cp/said/repeat_of:

    phase: "transferred" | "promised" | "unclear"
    relation: "independent" | "trade_settlement" | "recount" | "unclear"
    money: { quote: string, currency_quote: string | null } | null

- transferred heißt tatsächlich neue Übergabe jetzt. Angebot, möglicher Dank, zukünftige
  Auszahlung und Versprechen sind keine Übergabe.
- trade_settlement verweist auf Kauf-/Verkaufserlös bzw. Wechselgeld: nicht über gift buchen;
  vorhandenen bid-/Transaktionsweg bzw. Repair verwenden.
- recount nutzt repeat_of; niemals noch einmal auszahlen.
- independent erlaubt echte Löhne, Dank, Belohnung, Rückzahlung und Geschenke ohne Privatquest.
- Die relation ist eine fallible Modellzuordnung, kein Freibrief. Quell-, Transaktions-,
  Präsenz- und Wiederholungsprüfungen bleiben nötig.

**Warum diese Felder:** Das derzeitige Fehlen eines ausdrücklichen Zustands wird nicht durch
mehr Prosa-Verbote repariert. Preisbasis, Übergabephase und Beziehung zur bestehenden Transaktion
sind verschiedene bisher verlorene Informationen. Zusätzliche redundante Richtung-/Sicherheitsflags
sind nicht vorgesehen.

### 4.4 Fehlende Felder und Repair

Frische Ausgaben ohne neue Information werden auf **unknown/unclear bzw. null** normalisiert
und als lokaler semantischer Finanzhinweis an den bestehenden begrenzten Repair gegeben.
Keine Normalisierung auf firm/transferred/independent.

Bleibt die Information danach offen oder widerspricht eine bekannte Quellbedingung weiterhin
  dem gemeldeten Status, wird der betroffene Finanzvorgang nicht ausgeführt.
Unabhängige gültige Weltinformationen dürfen weiter verarbeitet werden. Syntax-/Referenzfehler
behalten die bestehenden allgemeinen Schutzregeln. Keine neue unbegrenzte Reparaturschleife
und kein höheres Providerbudget im Rahmen dieses Patches.

## 5. Freies pay: Ausführungs- und Klärungsgrenze

### 5.1 Drei Wege im bestehenden Handler

1. **Bekannte Verpflichtung:** Eine tatsächlich autorisierte Zahlung passt zu einem gültigen
   vorhandenen Angebot, Registrierung oder Kauf-/Servicevorgang. Vorhandenes Routing verwenden; gespeicherten Preis,
   Präsenz und aktuelles eigenes Einverständnis prüfen. Der bekannte Preis ersetzt nur den
   Betragsbeleg, niemals den Zahlungs-/Annahmewillen. „Pay attention“, Geldforderung oder
   Quittungsübergabe zahlen auch neben einem passenden offenen Angebot nichts.
   Keine freie zweite Abbuchung.
2. **Eindeutige eigene freie Geldübergabe:** Geldargument, Empfänger und vollständiger Betrag
   sind derselben ausgehenden Handlung zugeordnet. Betrag belegt und Ressourcen ausreichend →
   wie bisher direkt buchen.
3. **Ungeklärt:** Keine Abbuchung. Entweder fehlenden Betrag durch tatsächliche gültige
   NPC-Offerte klären oder eine konkrete Zahlungsentscheidung anzeigen. Eine klare Forderung,
   Waren-/Belegübergabe oder Bewegung ins eigene Portemonnaie ist keine ausgehende Zahlung.

Eine bloß passende Zahl, ein unspezifisches Gebeverb, eine Mengenangabe oder ein Geldwort
irgendwo später im Satz kann Weg2 nicht freischalten.

### 5.2 Begrenzte Prüfung des Geldarguments

Die Prüfung soll keine beliebige englische Syntax vollständig verstehen.

- Vorhandene Akteur-/Negations-/Frage-/Vergangenheitsschutzregeln weiterverwenden.
- Geldargument und Empfängerfundstelle beziehen sich auf dieselbe konkrete Handlung,
  nicht auf beliebige andere Sätze des Inputs.
- Das Geldargument muss eine vollständige Münzgruppe oder eine eindeutig bekannte Verpflichtung
  sein. Ein Gegenstand mit einem Preisanhang ist kein Geldargument.
- **Enger Kern eindeutig ausgehender Geldhandlungen:** vorhandene direkte Zahl-/Rückzahlungs-
  und Münzübergabeformen mit unmittelbar zugeordnetem Geldargument prüfen. Nicht erneut
  „irgendein Verb + irgendwann Geld“ akzeptieren. Der Geldargument-Checker muss unbekannte
  Restbestandteile/Zuordnungen als ungeklärt liefern; kein neuer Katalog aus immer weiteren
  erlaubten Verben oder negativen Sonderformulierungen.
- Ein zur Quelle falsches Geldargument darf nicht dadurch belegt werden, dass der Planner nur
  den Preis hinter „plates for five copper“ als quote auswählt. Die Argumentzuordnung wird im
  vollständigen Akt geprüft. Gleiches gilt für abgeschnittene „and the silver“-Reste.
- Nicht sicher im begrenzten Kern prüfbare Formulierungen bekommen einen einmal konkret
  lösbaren Klärungsschritt; der Spieler muss keine vorgeschriebenen Schlüsselwörter lernen.

**Wichtige Grenze:** Ein konsistent falsch modellierter semantischer Rahmen kann nicht allein
durch Fundstellenvergleich ausgeschlossen werden. Die Implementierung darf diese Schwierigkeit
weder mit einem zusätzlichen Wahrheitsflag noch mit einem wieder wachsenden Sprachparser
verdecken. Zweifelhafte Zuordnung bleibt Weg3. Der Implementierungsreview muss hierfür sowohl
falsch typisierte alte pay-Kommandos als auch scheinbar vollständige neue Belege prüfen.

### 5.3 Konkrete Entscheidung statt Wiederholungsschleife

Den vorhandenen **decision kind:payment** erweitern, kein paralleles Zahlungssystem:

    {
      id, kind: "payment", seller, at, amount_cp, what,
      state: "needs_amount" | "needs_confirmation",
      source: { message, text_hash, seq },
      created_turn
    }

- needs_amount bleibt das bestehende unbepreiste Zahlungsinteresse; es ist kein Zahlungsauftrag
  über einen erfundenen Betrag.
- needs_confirmation ist ein sichtbarer Vorschlag:
  „NOT PAID — pay Tam 50 cp? Wallet 200 → 150. Nothing changed hands.“
- Annahme muss diese ID und unveränderte Partei/Betrag/Zweck betreffen. Ein wiederholt
  fehlinterpretiertes pay ohne ausdrücklichen Entscheidungsbezug ist keine Bestätigung.
- Eine ablehnende, fragende, rückblickende oder eigene Zahlung verlangende Antwort bestätigt
  nicht. Vorhandene Agency-Regeln gelten auch hier.
- Vorschlag verfällt bei Orts-/Gegenparteiverlust, neuer konkurrierender Zahlungsentscheidung
  oder nach der unmittelbar folgenden handlungsrelevanten Spielerantwort, wenn diese ihn
  nicht annimmt. Reine Status-/Inventarpanels verbrauchen diese Antwortmöglichkeit nicht.
  Ein gemischter Antwortzug darf gültige unabhängige Handlungen ausführen.
- Erfolgreiche Bestätigung und Entscheidungsschluss werden im selben Record gebucht;
  transaction.completed führt die Entscheidungs-ID für den Audit mit.
- Klare anfängliche Zahlungen bleiben Weg2. **Keine 10-cp- oder Prozentgrenze.**

Die Agency erzeugt nicht selbst Zahlungen oder neue Kommandos. Klare Fehlinterpretationen
werden entfernt und sichtbar erklärt. Ungeklärte valide pay-Vorschläge erhalten im Fachhandler
eine nichtmonetäre Klärung; dazu das einheitliche Belegergebnis bis zum Handler durchreichen
oder dort mit derselben reinen Funktion erneut prüfen. Abhängige Folgehandlungen dürfen nicht
so behandelt werden, als wäre bezahlt.

## 6. NPC-Angebot, Vorschlag und tatsächlicher Handel

### 6.1 Persistierte Verbindlichkeit

Bestehendes **offer.status** (open/accepted/declined/expired/repriced) nicht umdeuten.
Zusätzlich wirtschaftliche Verbindlichkeit speichern:

    terms: "firm" | "conditional" | "unverified"
    condition: string | null
    evidence: { source_reference, basis, derived_cp, reason }

- Bei bid gilt terms für das ganze Los.
- Bei normalen offer gilt terms je Angebotszeile; keine zweite widersprechende Wahrheit
  am Angebotskopf. Die ausgewählte Menge/Zeilenkombination bestimmt die Ausführbarkeit.
- Firm wird nur aus einer festen Zusage **und** einem belegten Preis, oder aus einem
  tatsächlich kanonischen Engine-Angebot abgeleitet.
- Fehlende, unvollständige oder unklare Belege können als nicht verbindliche Information
  sichtbar bleiben. Sie erscheinen nicht als regulär kauf-/verkaufbare Position.
- Bei fehlender Preisableitung die Modellzahl höchstens als ausdrücklich berichteten
  Vorschlag anzeigen, nicht als gültigen Preis ausgeben.
- conditional ist nicht durch „I accept 56 cp“ freischaltbar. Die Gegenpartei muss später
  ein gültiges festes Angebot etablieren; bestehende Gegenangebots-/Ersetzungslogik nutzen.
- Keine Bedingungsautomaten. Wird die Voraussetzung später erfüllt, berichtet der Extractor
  die jetzt tatsächlich feste Offerte; nur diese kann neue Bindung erhalten.

### 6.2 Alle Ausführungswege prüfen denselben Status

Eine kleine gemeinsame Funktion in **trade.js**, z.B. **tradeTermsWhy(offer, selection, consent)**,
sichert die ausgewählten Positionen. Kein universeller Finanzmanager.

Sie ist aufzurufen bei:

- Planner-Validierung einer Annahme, Katalog/Anzeige und offerAvailability,
- commands.offer.accept, Weiterleitungen aus buy/sell/pay sowie acceptBid,
- world.offer/bid und settleCanonicalPurchases vor Sofortabwicklung,
- **bookPurchase und bookSale unmittelbar vor den wirtschaftlichen Emits**.

Bucher behalten ihre bestehende Auswahl-/Mengen-/Preis-/Besitzlogik. Die neue Gateprüfung ist
eine fachliche Erweiterung der letzten Grenze, kein Rewrite. Keine Buchung nur deshalb,
weil irgendein oberer Aufrufer den Status schon einmal geprüft hat.

Ein explizit ausgewählter fester Einzelartikel darf neben einer bedingten anderen Position
gekauft werden. Ein gemeinsames Paket muss vollständig ausführbar sein; keine stille Teilbuchung.

### 6.3 Zustimmung und Preise unverändert respektieren

- Vorabkauf mit gültigem max_cp und Vorabverkauf mit gültigem min_cp bleiben bei neuen festen
  belegten Angeboten im selben Zug möglich.
- Preisgrenze ist kein Nachweis der NPC-Zusage oder Lieferbarkeit.
- Gespeicherte Preise nicht bei Annahme aus NPC-Prosa neu berechnen.
- Normale Gegenangebote bleiben möglich und ersetzen passende alte Angebote wie bisher.
- Bestehende D-Regeln für Auswahl, Paketatomarität, any_price zusammen mit max_cp,
  ausdrücklich ausgewählte Einzelkäufe und Ausschlüsse bleiben.
- Engineberechnete F-Gearpreise und bereits gespeicherte gültige günstige Angebote nicht ändern.
  Bestehende Regeln zur Preiszustimmung bei korrigiertem Gearpreis bleiben.
- Neuer Narrator-Geartext braucht trotz Enginepreis eine gültige Angebots-/Verfügbarkeitsphase.
  Nur der Preis ist durch die Tabelle autorisiert, nicht eine beliebige sofortige Lieferung.
- Echte kanonische Engineangebote behalten ihren eigenen vertrauenswürdigen Erzeuger.
  Der Extractor darf sich nicht selbst als Enginequelle kennzeichnen.

### 6.4 Originalkette #380 → #381 → #382

- #380: ausdrückliche Gesamtpreis-Evidenz150 korrekt speichern.
- #381: Originalplan an den vorhandenen bid binden; vorhandene Gruppierung führt einmal
  zu 150 cp und überträgt 15 Platten plus vier Drüsen.
- #382: erzähltes Geld ist danach bereits gezahlter Erlös; kein zweites Geschenk.
- Kein neuer Paketmechanismus. Falls ein **neuer** Losverkauf ohne gespeichertes Gebot
  die gemeinsame Mindestgrenze weiterhin auf mehrere Positionen kopiert, diesen reproduzierten
  Zustimmungsfall innerhalb des Patches begrenzt klären; nicht künstlich Teilbudgets erfinden.

## 7. Geldgeschenke, Löhne, Erlöse und Wiederholungen

### 7.1 Zulässige neue Übergabe

Für coin.gift gemeinsam erforderlich:

- phase:transferred, relation:independent,
- vollständiger zugeordneter Geldbetrag und gültige Fundstelle,
- vorhandener berechtigter Geber am tatsächlichen Ereignisort oder der bereits gültige
  TAKE-/Suchpfad für gefundenes Geld,
- kein Wiederholungsbezug und keine Doppelanrechnung desselben wirtschaftlichen Vorgangs.

Ein Währungsbeleg muss zum aktuellen Handover gehören; eine Münzart aus dem irgendwo
beschriebenen Geldbestand eines NPC legitimiert keine einheitenlose Geschenkzahl.
Keine Privatquest, Arbeitsbescheinigung oder formale Lohnannahme verlangen.
Die Zuständigkeit gilt gleichermaßen für Dank, Lohn, Geschenk, freiwillige Belohnung,
Vorschuss und echte eingehende Rückzahlung.

### 7.2 Konkreter Vorgang statt pauschaler Handelspartner

**counterparts** darf allein keine unabhängige Geldübergabe mehr verbieten.

Stattdessen vorhandene **credits, repeat_of, offer-/transaction-Bezüge** und den zugeordneten
Quellvorgang verwenden:

- Eine erzählte Kauf-/Verkaufsabwicklung, Wechselgeld oder das Einstecken dieser Münzen ist
  derselbe Vorgang. Über die bestehende Transaktion abgleichen, nie als neue Gift-Zahlung.
- Ein ausdrücklich neuer Dank in einer getrennten tatsächlichen Übergabe desselben NPC
  bleibt möglich, auch im selben Reply und auch bei gleichem Betrag.
- Gleicher NPC/Betrag oder ähnliche Prosa allein sind weder Wiederholungsbeweis noch Beweis
  eines neuen Geschenks.
- Innerhalb eines Replies dürfen doppelt gemeldete überlappende Belegspannen desselben
  Handovers nur einmal wirken. Andere Spannen sind noch kein ausreichender Beweis einer
  zweiten tatsächlichen Übergabe; Phase und Relation bleiben nötig.
- Ein nicht-null repeat_of zahlt weiterhin nichts; es darf nicht durch andere neue Flags
  neutralisiert werden. Widersprüchliche Angaben werden geklärt/abgewiesen.
- Vorhandene Gift-/Credit-IDs und Recordidentität weiterverwenden; keine globale neue
  Zahlungshistorie und kein deduplizierendes „gleicher Betrag heute verboten“.

**saleProceeds** bleibt als Hinweis an die bestehende Reparatur sinnvoll, aber wird auf
strukturelle Relation und tatsächliche Waren-/Transaktionsbezüge ausgerichtet. Eine freie
why-Wortgruppe darf nicht allein einen Erlös in ein eigenständiges Geschenk umetikettieren.

### 7.3 Rückmeldung

Abgewiesene oder bedingte bid erhalten wie offer eine konkrete Narrator-Korrektur:
welche Ware, welcher Preis, welche offene Voraussetzung bzw. welcher fehlende Beleg.
Geld und Ware unverändert benennen; keine behauptete Zahlung, die nicht stattfand.

Ein Geschenk neben Handel wird nicht bloß wegen der Person abgewiesen. Ein abgewiesener
Verkauf wird aber auch nicht durch eine Gift-Korrektur „nachbezahlt“.

## 8. Dateien und interne Umsetzungsreihenfolge

Ein Produktpatch und eine abschließende Produkt-Patchnote; keine Zwischenreleases.
Dateinamen ohne Präfix beziehen sich hier auf src/v4; economy.js, validate.js, display.js
und context.js liegen direkt in src. content/ ist der bestehende Inhaltsordner.

| Schritt | Dateien/Funktionen | Änderung und Abhängigkeit |
|---|---|---|
| F1 | neue finance_evidence.js, economy.js | Reine Fundstellen-/Literal-/Rechnungsprüfung mit expliziten Ergebnissen. Tokenizer und korrekte Umrechnungen erhalten. Erst danach Aufrufer umstellen. |
| F2 | content/commands.json, interpret.js, planner.js; content/deltas.json, extract.js | Eng begrenzte Quellen-/Basis-/Phasenfelder, Schema und semantische Hinweise. Frische fehlende Daten werden unknown; keine firm-Defaults. |
| F3 | agency.js, interpret.amountErrors, commands.pay, catalog.js, runtime.js | Gemeinsamer Zahlungsbeleg; sichere bekannte Verpflichtungen routen; offene Beträge/Bestätigung ordentlich führen. Keine neue Zahlungswirkung im Agency-Guard. |
| F4 | world.evidenced, world.offer/bid, trade.js | Handelsweg vom allgemeinen Prosa-Fallback trennen; mapped pricing rechnen und terms beim Erzeugen festlegen. Erst dann Sofortabwicklung. |
| F5 | trade.js Buchungs-/Annahmegrenzen, domain.js, validate.js, catalog/display/context | terms-/Entscheidungs-Gates bis zu jedem letzten Bucher, Persistenz und verständliche Anzeige. Aktuelle Preise nicht umwerten. |
| F6 | world.coin.gift/coinRefusal, extract.saleProceeds, vorhandene Credits | Tatsächliche Phase/Relation und konkrete Vorgänge prüfen, separate Geschenke zulassen, Recounts/Erlöse nicht erneut zahlen. |
| F7 | resolveCommands-Auswahlgruppen, acceptBid | Original-Paketkette vollständig prüfen; nur verbleibende belegte Zustimmungsfehler korrigieren. Keine neue Losverwaltung. |
| F8 | agency/trade/world alte Finanzleser | Ersetzte doppelte Lesarten entfernen. Kein dauerhafter alter Fallback hinter dem neuen Prüfer. Auswahl-/Eigentumsschutz erhalten. |
| F9 | gezielte Tests, Replayadapter/gegebenenfalls Annotationen, Patchnote | Originalketten und Invarianten rot/grün, Vollsuite, vollständiger Replayvergleich, echte ST-Smokes, Diff-Gegenprüfung. |

Dateien außerhalb dieser Schnittstellen nur bei konkret nachgewiesener direkter Abhängigkeit;
keine allgemeine Aufräum- oder Formatierungsrunde. Betroffene Funktionen lesbar formatieren.

## 9. Rückbau, Protokoll und Persistenz

### 9.1 Entfernen oder begrenzen

| Bestehende Logik | Ziel |
|---|---|
| paysAct-Akzeptor aus beliebigem Verb + Zahl/Geldwort, breite Satzsuche in payEvidence | Entfernen; zugeordnetes Geldargument und klare Ergebniszustände statt positiver Fundwortkombinationen. |
| actAmount/paidAmounts/amountErrors mit unabhängigen Betragsdeutungen | Ein gemeinsamer Belegkern; kein Besitzbetrag als Reparaturziel, kein null als stille Freigabe. |
| openCondition, YOU/SPEAKER/PENDING/FURTHER-Ausnahmen | Als positiven Bindungsentscheider entfernen. Begrenzter zugeordneter Widerspruchscheck nach §4.2 darf nur herabstufen; kein Ersatz durch eine immer längere globale Bedingungswortliste. |
| tradePrice als NPC-Prosa-Interpretation einschließlich beliebiger Raten-/Losmarker | Neue pricing-Evidenz verwenden. Etwaige schmale Kompatibilitätswrapper dürfen den alten semantischen Fallback nicht weiter ausführen. |
| evidenced-Ganztextfallback, numbersIn als Geldbeweis, Übernahme der Modellzahl mangels Preis | Für neue Finanzclaims entfernen; andere benötigte nichtfinanzielle Aufrufer nicht nebenbei umgestalten. |
| blanket counterparts-Sperre für Geschenk | Durch Bezug auf den konkreten Vorgang ersetzen. |
| coinEvidence Zahlen/Währungen, selectionWhy, pickLines, Zustimmung/Präsenz/Eigentum | Erhalten, soweit Aufgabe weiter gültig. Keine pauschale Entfernung aller Regex. |
| Claim-/Rollenhinweise | Höchstens begrenzt herabstufend; nie Ersatz für einen verifizierten Vertrag und kein neues Wortlistenprojekt. |

### 9.2 Versionen

Nach fertiger Implementierung und Abnahme:

- cmd-1.7 → **cmd-1.8** für Finanz-Beleg-/Bestätigungsfelder.
- delta-1.12 → **delta-1.13**, Extractor extract-5.22 → **extract-5.23**.
- PLANNER_VERSION nicht als beiläufige Runneränderung erhöhen; neue Felder werden durch
  Vokabular und Requestschema geführt.
- Buildnummer in util.js, manifest.json, package.json gemeinsam.
- Narrator-Vertragsrevision muss für diesen Plan nicht automatisch steigen: Keine Pflicht
  zu neuer Handelsprosa oder einer persönlichen Kartenaktualisierung einführen.
- Tatsächliche Änderungen an der Narrator-Schnittstelle gesondert ausweisen, falls unvermeidbar;
  keine verdeckte zusätzliche Designregel.

### 9.3 Alte Events und neue Ausgaben unterscheiden

- Bereits persistierte historische Events und gültige offene Offerten nicht nachträglich
  anhand neuer Prosaheuristiken umwerten. Fehlende terms in einem alten gespeicherten Angebot
  bedeuten dessen bisherige historische Vertragsbedeutung.
- **Jeder frische Erzeuger** setzt terms ausdrücklich; fehlende neue Modellfelder erzeugen
  keine firm- oder transferred-Events. Das gilt auch für Angebote an chronologischen Zwischenhalten.
- Event-Reducer müssen neue Evidenz-/terms-Daten erhalten; validateState prüft gültige Werte.
- Evidenzspeicherung kompakt: Quellrecord, Hash, konkrete Spannen, Basis und Ergebnis.
  Keine komplette Narratorantwort in jeder Warenzeile duplizieren. Für den Fold keine erneute
  Sprachinterpretation verlangen.
- Archivierte Original-ZIPs und Korpusantworten unverändert lassen.
- Ein Offline-Replayadapter darf alte Antworten syntaktisch auf das neue Protokoll abbilden,
  aber fehlende Bindungs-/Rollendaten nicht als nachgewiesene Semantik ausgeben.
- Wo zusätzliche Information nicht deterministisch rekonstruierbar ist, eng begrenzte
  **quellgebundene Finanzannotationen außerhalb des Originalkorpus** verwenden oder den
  Vertragsfall ausdrücklich als nicht abgedeckt melden. Keine Targetausgaben abschreiben.
  Gegenfälle mit frischen falschen/unvollständigen Antworten separat zwingend testen.
- Historische Eventkompatibilität ist keine automatische Freigabe neuer unvollständiger
  Antworten. „Alter Record lädt“ und „neuer Extractor klassifiziert richtig“ getrennt berichten.

## 10. Rot-/Grün- und Abnahmematrix

Tests auf unveränderter .141 zunächst rot nachweisen. Positive Kontrollen nicht künstlich
rot machen. Neue Datenfelder bei Sonden mit fehlender Protokollunterstützung können allein
einen Schemafehler verursachen; das ist noch kein sinnvoller Nachweis des Finanzdefekts.
Deshalb auch die vorhandenen Originalwege mit ihren tatsächlich falschen Events zeigen.

| Gruppe | Nachweise |
|---|---|
| Pay-Richtung | Acht .141-Gegenfälle mit genügend Guthaben; 5-cp-Warenpreis; Quittung, Besitz, eigenes Portemonnaie, erhaltenes Geld zählen; Forderung plus getrenntes Trinkgeld. Keine Münzabbuchung allein aus vorhandener Zahl. |
| Betragsvollständigkeit | „three copper and the silver“, „four copper and the silver for the lot“, unklarer Zuschlag, T109 vierte Münze; nie Teilbetrag buchen. |
| Eindeutiges Bezahlen | Normales Trinkgeld, Spende, Rückzahlung; Bree20 ohne Umlenkung auf30; bekannte Registrierungs-/Servicezahlung; falsches pay neben betragsgleichem offenem Angebot bleibt gesperrt. Keine allgemeine Bestätigungspflicht. |
| Bestätigung | Genau eine konkrete Entscheidung bestätigen; doppelte Bestätigung, andere Partei/Betrag, Verfall, Ortswechsel, Frage, Negation, Forderung oder bloßes Wiederholen → kein falscher Abgang. |
| Preisbasis | 14×4=56, Stapel7+14→84, verschiedene Qualität/Einheit, Positionssumme24+6+4, nackte Zahl mit eindeutigem Währungsbeleg, gemischte/äquivalente Währungen. 4 darf kein Lospreis für14 werden. |
| Explizites Los | #380 150 trotz Zwischenrechnung140; #381 einmaliger Verkauf beider Warenpositionen; #382 kein zweiter Erlös. |
| Bindung | Echte Bedingungen vor/nach dem Preis, im Folgesatz, außerhalb von said; auch bei absichtlich falschem phase:firm und condition:null; Übergabe nur versprochen; feste Offerte und reine Cash-Wahl als positive Kontrollen. Fehlender neuer Status → keine Sofortbuchung. |
| Quellen | Kein/unpassendes/mehrdeutiges said, abgeschnittene Geldgruppe, Betrag in anderem Satz, Nägelzahl statt Münzpreis. Kein Ganztext-Fallback. |
| Geschenke | Neuer tatsächlicher Dank allein und neben Handel desselben NPC; späterer gleich hoher Dank; Erlös/Recount/versprochene Zahlung; falscher oder abwesender Geber; doppelt gemeldeter Handover. |
| Paket-/Einzelkäufe | Bestehende D-Auswahlfälle .133–.136; getrennte Kommentare, „add the armor“, Ausschlüsse, Teilmengen; any_price plus max_cp; gemischte feste/bedingte Positionen. |
| Vorabzustimmung | Eindeutiger Kauf/Verkauf im selben Zug; zu teures/zu niedriges oder bedingtes Angebot, mehrere passende Händler und fehlende Menge als Gegenfälle. |
| Kanonische Quellen | Gear/Manuals/Registrierung/Questauszahlung/Loot unverändert; fester Enginepreis macht einen nicht verfügbaren Narratorartikel nicht lieferbar. |
| Vollständige Ketten | Original T50, Bree mit beiden Completions, Kristall T26–T32, T53–T62, #380–#382 und #438; nicht nur Parserwerte oder „keine Fehlzahlung“, sondern auch erfolgreiche richtige Geschäfte. |
| Persistenz/Host | Reload, Fold, Swipe, Regenerate, verworfene/überholte Extraktion, Provider-Repair, gleicher Annahmeinput zweimal, Teilstapel. Ware/Geld/Angebot und offene Entscheidungen konsistent. |

**Ausführung beim späteren Produktpatch:**

1. Gezielte Rot-/Grün- und angrenzende Finanz-/D-/Agency-/Guild-/World-Regressionen.
2. Vollständiges npm test mit echten Summen.
3. Vollständiger bestehender Replay-/Fingerprintvergleich; jede beabsichtigte Änderung einzeln
   begründen. Keine automatische Übernahme neuer Fingerprints. Neue Vertragsevidenz und
   Replayannotationen unabhängig von Targetevents prüfen.
4. Echter ST-Standard- und Failsoft-Smoke; zusätzliche kurze Handelsintegration bis zum
   gespeicherten Record: klare Transaktion, falscher pay-Bericht, bedingtes Angebot,
   Geschenk neben Verkauf und doppelte Annahme.
5. Prompt-/Schemaumfang und aufgetretene Repairaufrufe messen; keine ungemessene Behauptung,
   die Änderungen würden garantiert Tokens oder Modellanfragen sparen.
6. Kritischer vollständiger Diff-Review und anschließend unabhängiger Gegenreview.
7. Natürlicher Batch erst nach technischer Abnahme/Freigabe. Er prüft neue Protokollausgaben
   und Spieltempo; alte aufgezeichnete Antworten können das nicht beweisen.

## 11. Lieferumfang und Stoppregel

Nach gesonderter Implementierungsfreigabe liefern:

- einen getesteten Produktcommit/-patch auf dem Entwicklungsbranch,
- eine einzige Fachpatchnote mit Ursachen, tatsächlich ersetzten Lesern, Rot-/Grün-Nachweisen,
  realen Testsummen, Replayabweichungen und ST-Ergebnissen,
- knappen Status auf main und klare bekannte Grenzen,
- kein gleichzeitiges Balancing, keine neue Runnerstrategie und keinen automatisch
  gestarteten natürlichen Langlauf.

**Vier gezielte Reviewgates statt weiterer allgemeiner Audits:**

1. Kann ein falsches pay mit vorhandenem Geldpreis, aber ohne Geldübergabe noch buchen?
2. Kann ein Einzelpreis oder eine fremde Summe zum falschen Gesamtpreis werden?
3. Kann ein Versprechen zahlen oder ein wirklich separates Geschenk blockiert werden?
4. Kann ein offener NPC-Vertrag durch Spielerlimit, Spielerbestätigung oder fehlende Felder
   verbindlich werden?

Werden diese gemeinsamen Grenzen verletzt, ist die Klasse nicht geschlossen. Ein ungewöhnlicher
Satz, der ohne Geld-/Warenverlust verständlich geklärt wird, ist dagegen kein Anlass für die
nächste Wortlisten-Mikroversion.

**Status dieses Dokuments:** Fachplanung abgeschlossen, Produkt weiterhin .141.
Keine Implementierung, neue Tests, Fingerprintänderungen oder zusätzlichen Modellläufe durch
diesen Dokumentationsauftrag.
