# Build .152 — freie Zahlkarte verfällt bei tatsächlichem Ortswechsel

03.11.2026. Basis .151 / `d4f281d6d2d9015864f9e2171beb66bc8ece82f2`.
Freigegebener Umfang: [Batch25-Originalreview und GPT-Gegenreview §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/1bd8093c7c1ac4f1373c1bc4437cdef0d0568fee/testrun_10b/batch-20261102-154000Z/REVIEW.md).

## Ursache und Umsetzung

Warrior T55/I109 eröffnet für zwei Kupfer Frühstück eine freie S1-Zahlkarte an der ursprünglichen
Spielernachricht. Die Reise zum Schmied wird im Reply I110 bestätigt. `world.js:arrive()` behandelte
die gleichturnige Zahlung als mitreisende Entscheidung: Es erzeugte ein weiteres `decision.opened`
mit neuem Ort, aber alter Spielerquelle, im Assistantrecord. `host.js:paymentInputError()` sperrte
anschließend zu Recht den Fold. Der nächste Zug T56 wurde blockiert. Es gab keine falsche Abbuchung.

Im bestehenden Arrival-Loop erhalten ausschließlich Entscheidungen mit `kind:payment` und
`route:free` bei einem tatsächlichen Wechsel ihres gebundenen Ortes `decision.closed/expired`.
Sie werden nicht erneut eröffnet oder umgehängt — unabhängig davon, ob sie gerade erst entstanden
oder die Bewegung explizit autorisiert war. Der vorhandene Filter `dec.at !== arrival.id` verhindert
Verfall durch bloße Ortswiederholung. Eine nicht bestätigte Ankunft lässt die bestehende Karte stehen.

Keine Änderung an Fold-/Inputhash-/Quell-/Edit-Schutz, #pay-Buchung oder Recovery. Kauf-, Verkaufs-,
Registrierungs- und unvollständige Zahlungsentscheidungen behalten ihre bestehenden Regeln.
Insbesondere bleiben tatsächlich am Ziel beabsichtigte Unterkunftskäufe möglich. Keine neue
Finanzmechanik, Preis-/Prosaheuristik oder automatische Reparatur des archivierten kaputten Runs.

## Rot/Grün und tatsächlicher Hostpfad

`tests/v4/fix152_payment_arrival.test.js`: vier neue Tests, auf unverändertem .151 **zwei rot/zwei grüne
Kontrollen**, nach Korrektur **4/4 grün**:

1. Originalprefix bis I108; Originalspielertext/Plannerantwort I109 durch `prepareGenerationAsync()`;
   Originalprosa/Extractorantwort I110 durch `processReplyAny()` und `runExtraction()`. Danach den neu
   gespeicherten Assistantrecord mit `foldChat()` wieder lesen: gültige Ankunft, Karte expired, kein
   erneutes freies `decision.opened`, keine Zahlung, State gültig. JSON-Reload, echter nächster Spielertext
   und spätere Annahme der abgelaufenen ID werden ebenfalls geprüft.
2. Nicht bestätigte Ankunft und Statuspanel erhalten die Karte; danach zahlt #pay am ursprünglichen
   Ort korrekt genau zwei Kupfer.
3. Zwei Karten aus derselben kombinierten Zahlungs-/Reisehandlung verfallen beide; erneuter
   Extractor-Aufruf, Reload und Wechsel zwischen Antworttexten buchen keine Zahlung doppelt.
4. Gültiges #pay vor Abreise zahlt genau einmal; spätere Reise bleibt gültig; echte Bearbeitung der
   Quell- oder Bestätigungsnachricht blockiert weiterhin vor dem Debit.

Fixture `tests/v4/fixtures/batch25_payment_arrival.json`: originale Texte, Eventpayloads und relevante
Record-/Hashfelder des Prefixes; Anzeige-/Modelltelemetrie ausgelassen. Original-Plan und
Extractorantwort bleiben unverändert. Quelle ist die geprüfte Original-ZIP mit SHA-256
`f2b0a9c408bb05847d9362f1adaaf61087cb274262ff3631950de21e2856934b`.
Das ist eine Reproduktion des Fehlers auf neu ausgeführten Hostpfaden, kein nachträglich geänderter Originalrun.

## Abnahme

- Gezielte Finanz-/Persistenz-/Planner-Gegenregressionen: **37/37**.
- Vollständiges `npm test`: **2707/2707**. Einschließlich bestehender Ankunfts-/Unterkunftskäufe
  (`patch_batch101_trade`, GO→room within limit), S1/S2, Edit, Save/Reload und Replay.
- `npm run replay:check`: **2235 Fälle**, unverändert **479 exakt akzeptierte Baselineabweichungen**,
  **0 neue/offene/veraltete Einträge**. Keine Fingerprintliste geändert.
- Echte ST1.19/Chromium153-Smokes mit Mockprovider: **Standard42/42, Failsoft47/47**,
  in den Wiederholungsläufen jeweils keine PageErrors. **43/49 Provideraufrufe, 17/19 Extraktionen**;
  die erweiterten Testturns sind Bestandteil dieser Zahlen, keine zusätzlichen normalen Produkt-Retries.
- Jeweils der erste Standard- und Failsoft-Lauf scheiterte ausschließlich an `noPageErrors` wegen eines
  ST-internen `AbortError` aus `openai.js:4565`; alle Fachprüfungen bestanden bereits dort. Beide Läufe
  unverändert wiederholt, ohne Fehlerunterdrückung, Produktworkaround oder Änderung der ST-Installation.
  Diese Fehlläufe bleiben Teil des Abnahmebefunds; die Ursache des transienten ST-Abbruchs ist nicht bewiesen.

Der vorhandene echte Finance-Smoke wurde um eine kombinierte freie Zahlung/GO-Ankunft erweitert.
Er prüft den tatsächlich gespeicherten Quell- und Assistantrecord, Kartenverfall ohne Zahlung,
Ablehnung der alten #pay-ID und den nächsten normalen Zug. Die bisherigen #pay-, Source-/Confirmation-
Edits, Reload-, Swipe-, Regenerate-, Save-Recovery- und Fetch-Fortsetzungsprüfungen bleiben erhalten.

## Grenzen

Bestehende blockierte Archive werden nicht migriert. Der natürliche Batch25 bleibt als fehlgeschlagener
Originalnachweis erhalten. Neuer natürlicher Mehrklassenbatch erst durch den Nutzer; keine weiteren
vorsorglichen Finanzkorrekturen. XP, PP/LP, Kampf, Preise, Monster, Runnerstrategie und Erzählerkarte
unverändert. Keine Kartenaktualisierung notwendig.
