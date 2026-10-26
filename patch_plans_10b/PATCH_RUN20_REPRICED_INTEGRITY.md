# Run 20 – `repriced`: einheitlicher Angebotsstatus und State-Integrität

**Status:** Kleiner eigenständiger technischer Fachpatchplan, NICHT implementiert. **Basis:** `.95` (`681c2b4`), Run `20261026-063907Z-current_test`, T236/E472; [Originalreview](../testrun_10b/20261026-063907Z-current_test/REVIEW.md) und [Sols Gegenprüfung](../testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md). Keine Preis-/Balancemaßnahme.

## Belegter Widerspruch

- `src/v4/world.js` schließt bei einer neuen, tatsächlich abweichenden Preisofferte frühere offene Händlerangebote derselben Ware/Gegenpartei mit `offer.closed` und `status:'repriced'` (ca. Zeile 2281 in `.95`). Das schützt davor, zwei konkurrierende aktuelle Preise als akzeptierbare Offerten zu führen.
- `src/validate.js:validateState()` prüft in V4 `state.offers` aber nur auf die Status `open`, `accepted`, `declined`, `expired` (ca. Zeile 162). Seit T236/E472 meldet die Engine daher **`integrity: 1 problem(s)`**, obwohl der neue Angebotspreis regulär fortgeschrieben wurde.
- Sols State-Fold findet dadurch **keinen** Verlust von XP, Inventar oder Questdaten. Der Bug ist ein **Statusmodell-/Validator-Widerspruch**, kein belegtes Zahlungs- oder Persistenzproblem.

## Gewünschte Änderung

1. `repriced` als explizit zulässigen **terminalen** Angebotsstatus dort anerkennen, wo die V4-State-Integrität vollständige Angebotslebensläufe prüft. `openOffers()` und Käufer-/Verkäuferhandlungen dürfen ausschließlich offene Angebote berücksichtigen; eine ersetzte Offerte darf nicht erneut bezahlt, angenommen oder angezeigt werden, als sei sie gültig.
2. Den Zustand nicht auf `expired` umetikettieren, solange `repriced` im World-Eventpfad bewusst unterscheidbar erzeugt wird. Falls ein zentraler Angebotsstatus-Satz existiert, denselben Satz zwischen World/Reducer/Validator verwenden, ohne einen größeren Status-Refactor anzufangen.
3. Unbekannte oder tatsächlich ungültige Status weiterhin als Integritätsfehler melden. Nicht die Angebotsprüfung pauschal entfernen; kein "integrity OK" durch Unterdrücken sämtlicher Warnungen.
4. Bestehende `offer.closed`-Events, IDs, Event-Replay und gespeicherte alte `repriced`-Offerten unverändert interpretieren. **Alte Runs/Saves müssen ohne rückwirkendes Umschreiben ihrer Event-Historie validierbar sein.**
5. Keine Änderung an Handelszustimmung, Händleridentität, Warenprofilen, Preisberechnung, Stück-/Lospreis oder Buy/Sell-Transaktionen.

## Regressionen

- **Rot gegen `.95`:** Ausgangs-`offer.created(open)`; derselbe Händler bietet dieselbe Ware später zu anderem Preis an; `offer.closed(repriced)` für das alte und `offer.created(open)` für das neue. `validateState()` muss nach Korrektur **0 Probleme** melden; in `.95` entsteht die reproduzierbare `offer ... status repriced`-Warnung.
- Altes `repriced`-Angebot bei `offer.accept` → verweigert, neue offene Offerte bei korrekter ausdrücklicher Zustimmung → genau eine Transaktion, richtige Menge/Preis/Gegenpartei, keine Doppelzahlung.
- **Unverändertes** gleiches Angebot → bestehender Duplikatschutz; kein unnötiges neues `offer.created`/`offer.closed`.
- Normale Endzustände `accepted`, `declined`, `expired` bleiben zulässig; Fantasiestatus wie `repriced_again` oder `unknown` erzeugen weiterhin einen Integritätsfehler.
- Bereits gespeicherte Historie mit einem `repriced`-Event wird beim Fold, Reload, Swipe/Replay identisch reproduziert; keine nachträgliche Mutation alter Eventdaten. T236/E472 als realer Vergleichspunkt.
- Bieter-/Ankaufsangebote und besondere kanonische Offerten bleiben wie vorher; keine pauschale Ausweitung des `repriced`-Pfads.

## Umsetzung und Abnahme

Primär `avereth-engine/src/validate.js`; `src/v4/world.js`, Domain/Reducer nur ändern, wenn die Regression dort eine tatsächlich abweichende Statussemantik belegt. **Klein und isoliert** umsetzen, unabhängig von T203 und T252. Gezielte Tests zuerst Rot/Grün, anschließend `npm test` und `npm run smoke:st:c`; Ergebnistabelle und Produktcommit in eigener technischer Dev-Patchnote. Keine Versions- oder Testerfolgsbehauptung für diesen reinen Plan.