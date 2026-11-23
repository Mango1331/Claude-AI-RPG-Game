# GPT-Gegenreview – User08: Handel, HUD und strukturierte Spielaktionen

**23.11.2026 · Fachurteil: richtige Richtung, mit zwei wesentlichen Erweiterungen der Designabwägung.** Der [Codex-Fachplan](USER08_HUD_HANDEL_UND_STRUKTURIERTE_SPIELERAKTIONEN.md) ist eine gute Grundlage: bestehende Angebote sichtbar machen, konkrete Mengen auswählen, gespeicherte Gebote bewusst annehmen und freie NPC-Gespräche nicht verdrängen. Eine Implementierungsfreigabe folgt daraus nicht. Geprüft wurden der vollständige Bericht, der bereits dokumentierte User08-Originalfall und gezielte Codepfade des `.206`-Kandidaten [`cecc2c37`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cecc2c3777542e5bf9c74096c810a1c04fbed36e). Der Dokumentations-HEAD zu Beginn war `main c13c06fb`.

## 1. Was am Codex-Plan überzeugt

**Gemeinsame aufklappbare Angebotsansicht: GO als Fachrichtung.** Das aktuelle `display.js` zeigt verfügbare Kaufangebote automatisch, schließt Ankaufsgebote jedoch aus; die Gildenprimer erscheinen auch beim Boardlesen. Eine kleine, einheitliche Ansicht für `Kaufen / Verkaufen / Offene Gebote` trifft das tatsächliche Nutzerfeedback, ohne eine neue Waren-Datenbank zu schaffen. Nur örtlich zulässige, wirklich gespeicherte Angebote zeigen; bei unbekanntem Sortiment eine Frage anbieten, keine Ware erfinden.

**Bindende Bestätigung statt erneutem Planner: GO als Fachrichtung.** Bei User08 M61/M62 kosteten die beiden Planneraufrufe zusammen 11,470 s und 26.274 gemeldete Eingabetokens; der Repair beseitigte eine vom Modell erfundene Parteibezeichnung. Ein HUD, das das unveränderte Gebot `offer.t60.3` über 352 cp mitsamt fünf Stapeln verbindlich auswählt, könnte den Planner für die *reine* Annahme entfallen lassen. Bestehende `bookSale`, `bidSale`, `offerAvailability` und der revisionsgebundene Action-Composer sind die geeigneten vorhandenen Grundlagen; sie dürfen nicht durch ein paralleles Handelssystem ersetzt werden. Narrator, Extractor und Save/Read-back bleiben nötig. Diese beobachteten 11,470 s sind keine Prognose für die tatsächliche künftige sichere Folgeeingabe.

**Freier Text bleibt vollwertig.** User08 kombinierte das Anbieten seiner fünf Materialstapel mit der Frage nach einem Skillstein-Händler. Das ist ein Fall mit echtem Rollenspielnutzen. Ein ausschließliches Kaufen-/Verkaufen-Menü wäre schlechter als der heutige Chat.

## 2. Zwei notwendige Präzisierungen

### A. Die Händler-Recheninkonsistenz verschwindet nicht allein durch ein HUD

Im ursprünglichen User08-Gebot standen 64–69 cp aus den genannten Einzelangaben, aber 352 cp als ausdrücklich angebotenes Gesamtlos. Das HUD kann die **gespeicherten 352 cp korrekt anzeigen und fehlerfrei buchen**; es kann nicht rückwirkend beweisen, dass der frei formulierende NPC diese Summe richtig ausgerechnet hat. Das muss im Fachplan ausdrücklich getrennt bleiben.

Für eine nachhaltige Vereinfachung zwei Angebotsarten prüfen:

1. **Normale bekannte Standardware:** Engine bestimmt Artikel, Preis je Los, erlaubte Mengen und Gesamtpreis in ganzen Kupfermünzen; UI und Narrator beziehen die Zahl aus demselben Angebot. Freies Gespräch über das Produkt bleibt möglich, eine LLM-Zahlenrechnung ist nicht nötig.
2. **Freie Gebote, Sonderware und Feilschen:** NPC/LLM darf einen echten Gesamtpreis formulieren. Die Engine bindet nach Validierung den *genannten Endpreis*, und die UI zeigt ihn vor Zustimmung. Ohne gespeicherte Einzelpreise ist ein solches Los **nicht rechnerisch teilbar**. Keine künstliche Korrektur auf Richtwerte, keine Pflicht-LLM-Reparatur.

Damit reduziert ein strukturierter Standardshop die Entstehung von Preisfehlern; die reine UI zu freien Geboten verbessert vor allem Klarheit und vermeidet spätere Plannerfehler. Der ältere, ausdrücklich **nicht beschlossene** [Engine-Shop-Entwurf](../patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md) sollte als *alternative* Option für begrenzten Standardhandel vergleichend herangezogen, aber keinesfalls unbesehen als große Architektur reaktiviert werden. Wirtschaft, Händleridentität und Sortiment sind zusätzliche Entscheidungen.

### B. Gemischte Mengenwähler sind nicht bloß beliebige Zukunftsidee

Der Nutzer wünscht ausdrücklich unterschiedliche Mengen aus mehreren Artikeln (z. B. 2 Rationen × 3 cp plus 3 Bandagen × 5 cp = **21 cp**). Das ist nicht mit den vorhandenen API-Grenzen gleichzusetzen: `trade.js::pickLines` erlaubt eine abweichende Menge nur für **eine** Zeile; bei mehreren Zeilen und freier Menge fordert es Klärung. `bookPurchase` prüft diese Auswahl nochmals und schließt nach einer Buchung das ganze Angebot. Ein hübscher Warenkorb mit angezeigten 21 cp dürfte deshalb **nicht** schon die verbindliche Aktion „Für 21 cp kaufen“ anbieten, solange dieselbe Auswahl nicht atomar und identisch gebucht werden kann.

Empfehlung: gemischten Warenkorb als zweite, **klar definierte Stufe derselben Handel-Featurefamilie** planen, nicht unbefristet wegpriorisieren. Vorschau und Buchung müssen genau dieselben `(Angebots-ID, Zeilen-ID, Menge, Preis)` benutzen und vor der ersten Geld-/Objektbewegung gemeinsam prüfen. Gesondert festlegen, ob nach einem Teilkauf Restbestand als neues Angebot verfügbar wird; der jetzige Code schließt das Angebot vollständig. Bei real vorhandenen Einzelstücken nie aus zu knapper Ware eine zweite Kopie generieren. Der reine Warenkorb-Entwurf kann vorher bereitstehen, darf aber nicht als geprüfte Kaufzusage erscheinen.

## 3. Weitere Codegrenzen, die die Priorität beeinflussen

- **„Gebot erfragen“ ist keine Verkaufserlaubnis.** Der bestehende `commands.js::sell` kann bei passendem offenem Gebot unmittelbar zu `offer.accept` übergehen. Ein Klick „Preis erfragen“ darf deshalb nicht einfach als `sell` mit Warenliste abgesendet werden; der Pfad braucht eine eindeutige Absicht ohne Eigentums-/Geldbuchung. Nach der Erstanfrage ist die neue verbindliche Offerte erst durch *zweite ausdrückliche* Wahl anzunehmen.
- **Text mit Gesamtpreis ist nur Darstellung, keine Autorität.** Ein generierter/editierbarer Satz mit „21 cp“ schützt für sich nicht vor Planner-Missverständnissen oder manuell geänderten Mengen. Die Engineauswahl muss an aktuellen Chat-, Angebots- und Zustandsstand gebunden bleiben; jede Änderung mit anderer mechanischer Bedeutung verlangt neue Prüfung/Zustimmung.
- **Freies Beiwerk und Modellkosten unterscheiden.** Der bestehende Action-Composer trennt `hud_roleplay` (keine zusätzliche mechanische Absicht) von `hud_free` (Freitext zusammen planen). Bei einer reinen Gebotsannahme ist Plannerfreiheit plausibel. Ein zusätzliches „Danke“ kann nur ohne Planner verarbeitet werden, wenn es bewusst als bloßes Rollenspiel gekennzeichnet ist. Neue Handlungen in demselben Satz müssen frei planbar bleiben. Sonst wäre die Einsparung von zwei Planneraufrufen für *gemischte* Eingaben voreilig behauptet.
- **Aktuelle Enginepreise als Zahlungswahrheit.** `linePrice` rechnet je Los bereits deterministisch in Kupfer, `bookPurchase` prüft ausgewählte Zeilen erneut. Ein UI sollte diese Funktionen/Regeln wiederverwenden statt eine zweite JS-Preisformel zu erfinden. Normaler LLM-Erzähltext darf nicht allein einen neuen Preis setzen, wenn ein verbindlicher Enginepreis existiert.

Codebelege: [`trade.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cecc2c3777542e5bf9c74096c810a1c04fbed36e/avereth-engine/src/v4/trade.js) · [`commands.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cecc2c3777542e5bf9c74096c810a1c04fbed36e/avereth-engine/src/v4/commands.js) · [`action_input.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cecc2c3777542e5bf9c74096c810a1c04fbed36e/avereth-engine/src/action_input.js) · [`action_composer.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cecc2c3777542e5bf9c74096c810a1c04fbed36e/avereth-engine/src/action_composer.js) · [`display.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/cecc2c3777542e5bf9c74096c810a1c04fbed36e/avereth-engine/src/display.js).

## 4. Eigene kleine Querschnittsanalyse

| Anwendungsort | Eignung | Warum / Abgrenzung |
|---|---|---|
| **Verbindliches Händlergebot annehmen** | Sofort hoher Nutzen | Eindeutige Gebots-ID, Summe, Empfänger und Los; dokumentierter unnötiger Plannerrepair. |
| **Fester Standardshop mit gemischter Mengenwahl** | Hoch, aber fachlich zweite Stufe | Vereinigt den Nutzerwunsch mit Engineberechnung und vermeidet LLM-Arithmetik. Dafür braucht es echte atomare Mengenbuchung und eine Restbestandsregel. |
| **Guild-Primer / Questabgabe am Schalter** | Gute Wiederverwendung | Bekannte Angebote und `READY`-Zustände sind Enginefakten. Eindeutige Annahme/Abgabe kann direkt sein; kombinierte Reise + Abgabe muss weiterhin in einem freien Zug möglich bleiben. |
| **Bodenfunde, Ausrüsten, benutzbare Gegenstände** | Gute spätere Übertragung | Bestehende IDs, Menge und Ort erleichtern die Auswahl. Eigentum, Zugriff, Slot und Absicht bleiben nachprüfbar. Keine automatische Mitnahme. |
| **Rastdauer** | Solider Kandidat | Der Spieler wählt eine konkrete Zeit; Planner könnte für reine Rast entfallen, aber PULSE, Zeitbuchung und mögliche Unterbrechung bleiben. |
| **Attributverteilung** | Niedrige Geschwindigkeit-, gute Komfortpriorität | `#assign` ist schon plannerfrei; Mengenwähler erleichtert ausschließlich das Ausfüllen. |
| **Freie Gespräche, Reisen, Erkundung** | Kein Pflichtmenü | Neue unbekannte Ereignisse, Kombinationen und NPC-Entscheidungen sind ein Vorteil des freien LLM-Dialogs. Nur nachgewiesene Fakten anzeigen, keine verborgen möglichen Aktionen spoilern. |

## 5. Priorisierte Gegenempfehlung

**Fachliches GO für den Ansatz, kein Implementierungs-GO.** Nicht mit einem universellen Aktions-HUD oder vollständiger neuer Shopverwaltung beginnen. Stattdessen die gemeinsame Eingabeschicht in zwei zusammengehörigen Stufen prüfen:

**Stufe 1 – Angebote sichtbar und sicher bestätigen.** Kleiner aufklappbarer lokaler Handelsbereich, bekannte Waren/Gebote und exakte Menge/Preis-/Richtungsanzeige; Bestandsauswahl als **Anfrage ohne Verkauf**; direkte, gebundene Annahme eines vollständig gespeicherten Angebots. Ohne Planner bei einer reinen Annahme; für echte gemischte Aktionen weiterhin Planner. M61 als Original-Rot/Grün, kein zweiter Rechnungsweg. Sofortiger Nutzen für Verkaufs-HUD und Gilde.

**Stufe 2 – gemischter Kaufkorb für feste Enginepreise.** Unterschiedliche Mengen je Position, Preisvorschau und atomare Buchung aus **einer** Angebotsquelle mit verbindlichen Enginepreisen. Restbestand, Begrenzung physischer Einzelstücke, gleicher Preis bei Reload und Doppelklickschutz vorher entscheiden. Danach gegebenenfalls begrenzte Engine-Standardshops ergebnisoffen vergleichen, statt jedem erzählten Shop automatisch Preise zu geben. Der UX-Wunsch „3 × A, 2 × B“ gehört zum Kernziel, nicht zu beliebigem späterem Luxus.

**Messung:** User08-M61-Vorzustand mit direkter Annahme, unveränderte Quote, exakt ein Verkauf und unveränderter Skillstein; dazu eine freie Zusatzfrage als Gegenprobe. Physische P/N/X-Aufrufe, Token, Null-Event-Interaktion beim bloßen Öffnen, Anzeige des bestätigten Preises und wirkliche sichere Sendefreigabe getrennt messen. Bei festen Shops zusätzlich 2 × A + 3 × B und bewusst falsche/überholte Preise gegenprüfen. Keine Garantie, dass 11,470 s Plannerzeit in allen Situationen oder der alten Summe entsprechen.

**Keine Tests, neuen Provideraufrufe oder Codeänderungen durch diesen Gegenreview.** Es wurden ausschließlich Bericht, bisherige Nutzerfälle und relevante Quellpfade verglichen. Eine eigene interaktive UI- oder ST-Abnahme liegt nicht vor. Die nächsten Entscheidungen liegen beim Nutzer.
