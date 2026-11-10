# .176 — Pilot 01, Block B: Gerätekatalog, Teilsatz-Evidenz, Fehlbetrag (K3, K4 + D2, K7)

**Basis:** `.175` (`0f6af79`).

**Grundlage auf `main`:**
- [Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md) B2, B8, B9;
- [Fachplan](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/FACHPLAN_PILOT01_KORREKTUREN.md) §4, §5, §8;
- Auflage A aus dem [GPT-Kontrollreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/REVIEW_FACHPLAN_GPT.md);
- Entscheidungen D2 und D3 des Implementierungsauftrags.

**Abgrenzung:**
- keine Änderung an Extractor-, Planner- oder Erzählervorgaben;
- kein Tokenbudget und keine Reserve geändert (D3);
- keine Balance- oder PULSE-Parameter;
- kein Modellaufruf.

## 1. K3 – Gerätekatalog nur bei Gerätehandel

**Fehler `.175`:**
- `gear_market` (Priorität 0, im Mittel 515 Token) kam, sobald Spielereingabe **oder letzte Antwort** ein Wort wie „shield“, „armor“ oder „weapon“ enthielt.
- Im Pilot geschah das in 19 von 65 Spielerzügen, etwa auf dem Karrenweg (T19) oder am Dungeoneingang (T65).
- Andere Abschnitte fielen dadurch aus dem Budget, am Karrenweg auch `present` mit dem mitfahrenden Fuhrmann.

**Korrektur (`src/context.js`, `src/v4/settlement.js`):**
- Der Katalog kommt, wenn in **diesem Zug** Ausrüstung gehandelt wird:
  - ein anwesender Verkäufer hat ein offenes Ausrüstungsangebot (wie bisher), **oder**
  - die **Spielernachricht** (nicht mehr die letzte Antwort) spricht von Kauf, Verkauf oder Ausrüstung, und mindestens eines gilt:
    - eine anwesende Person hat ein offenes Angebot;
    - eine anwesende Person hat eine Rolle der Gerätegewerke (smith, leather, arcane, general) oder der `shop_words` aus `rules.settlements`;
    - der Ort, an dem er ist oder zu dem er geht, trägt einen solchen Namen;
    - er handelt in diesem Zug (`buy`, `sell`, `offer.accept`).
- **Auflage A:** Das erste Gespräch mit einem Schmied **vor** jedem Angebot erfüllt diese Bedingungen und behält den Katalog.

**Messung der drei Wege der Auflage A** (`turnBlock`, Budget 1400 / Regeln 800; synthetischer Schmied am Marktstand nach I58, Karrenweg nach T19):

| Weg | `.175` | `.176` |
|---|---|---|
| Schmied, Erstkontakt ohne Angebot („Have you a shield I could buy?“) | 1735 Token, Katalog ja | 1735 Token, Katalog ja (unverändert) |
| derselbe Schmied mit offenem Angebot | 1868 Token, Katalog ja | 1868 Token, Katalog ja (unverändert) |
| Reise, „sword“/„shield“ ohne Verkäufer oder Laden | 1953 Token, Katalog ja, Überlauf 362 | 1497 Token, Katalog nein, Überlauf 0 |

**Messung über alle Spielerzüge** (Erzählerblock jedes Zugs mit `outcome.recorded`, aus den Originalnachrichten neu gebildet):

| Lauf | `.175` | `.176` |
|---|---|---|
| Pilot 01, 65 Züge: `gear_market` geliefert | 19 | 4 (T35 Fell als Anzahlung, T36 Fellverkauf in Harls Laden, T41/T42 Buchladen: Handelszüge mit Verkäufer) |
| Pilot 01: Züge mit Überlauf | 27 | 18 |
| Pilot 01: `present` geliefert | 25 | 30 |
| Pilot 01: `relevant` geliefert | 2 | 2 |
| Pilot 01: Mittel Token | 1689 | 1590 |
| User02 I73 | 2214 (mit Katalog) | 1659 |
| User01 I61/I62/I69, User04 I71–I73 | unverändert | unverändert |

**Bewertung nach D3:**
- K3 beseitigt die Fehlauslösung, aber nicht den gesamten Überlauf.
- In den 18 verbleibenden Überlaufzügen (im Mittel 219 Token über Budget) liefern `quests` (Ø 437), `resolved` (Ø 263) und `guild_authority` (Ø 161) die größte Last.
- `relevant` fällt weiterhin in 60 von 65 Zügen aus.
- Eine Reserve oder Budgeterhöhung ist nach D3 nicht Teil dieses Builds. Ob Bedarf besteht, zeigt die nächste natürliche Messung.

## 2. K4 + D2 – Evidenz in Teilsätzen, Schalterhandlungen

**Fehler `.175`:**
- T24 (I48) und T33 (I66): Der Extractor zitiert für die Rückkehr der Schreiberin zwei Stellen, verbunden mit „...“. Eine solche Stelle steht nicht wörtlich in der Antwort, deshalb verwirft `met_evidence` die Meldung. Ihre Rückkehr und das Wissen um Alarics Abschluss fehlen.
- T26 (I52): „She listened, nodded once, and pulled a fresh slip across the desk“ ist keine Schalterhandlung, weil `pulled` nicht im Vokabular steht.

**Korrektur (`src/v4/narration_evidence.js`):**
- **`evidenceParts`:** Ein Zitat zerfällt an „...“/„…“ und an Satzenden in seine wörtlichen Teile. Anführungszeichen an den Enden fallen weg; Teile mit weniger als drei Wörtern zählen nicht.
- **`partwise`:** `metEvidence` und `deskHandlingEvidence` prüfen erst das ganze Zitat. Scheitert es, wird jeder Teil **allein** geprüft, gegen die Originalprosa und mit allen R1/R2-Regeln:
  - Rahmung (verneint, irreal, erinnert, Hörensagen);
  - Identität, Anwesenheit, Handelnde.
- Trägt kein Teil allein, lautet der Grund: „the quote joins several places of the reply and none is evidence on its own“.
- **D2:** `checked`, `pressed`, `sealed`, `pulled` (und Präsensformen) gelten als Schalterhandlung nur mit einem Schalterding (`DESK_OBJECT`) in den nächsten sechs Wörtern desselben Satzglieds. Ein bloßes „tray“ zählt nicht. R1/R2 bleiben.
- **Pronomenregel:** Bei „she/her“ überspringt die §8-Suche Alarics Namen, denn „she“ ist nie Alaric. T26: „She“ zeigte vorher auf „Alaric“ als nächsten Vorgänger.

## 3. K7 – Börse und Fehlbetrag im Ergebnistext

**Fehler `.175`:**
- T27 (I53): Für den Primer of Guard (80 cp) bei 70 cp meldete die Engine nur „NOT BOUGHT — not enough coin“.
- Der Erzähler erfand daraufhin „I don't break silver down here“ und einen Wechselkurs von 97 Kupfer zum Silber.

**Korrektur (`src/v4/trade.js` `shortfallText`, `commands.js`, `world.js`):**
- **Ausgabe:** „NOT BOUGHT — Primer of Guard: 80 cp (8 Silver) needed; he has 70 cp (7 Silver), 10 cp (1 Silver) short. Silver and copper are one purse (1 silver = 10 copper, 1 gold = 100 copper): no coin needs changing, and changing coin makes up nothing.“
- Die Kurse stammen aus `rules.currency`.
- Dieselbe Form gilt in allen drei Wegen:
  - `offer.accept`/`buy`;
  - bedingter Kauf;
  - `settleCanonicalPurchases`.
- Kein neuer Kontextabschnitt, kein Erzählervertrag.

## 4. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen `.175` | **K3:** `pilot01_k3_gear_context.test.js` **2 von 5 rot** (Original T19/T65, Ausrüstungswörter ohne Verkäufer) · **K4:** `pilot01_k4_evidence.test.js` **6 von 7 rot** (Original T24, T33, T26; positive Fälle der Guard-Tests; `evidenceParts`) · **K7:** `pilot01_k7_shortfall.test.js` **1 von 2 rot** (Original T27) |
| Grün | **5/5**, **7/7**, **2/2** |
| Gegenfälle | **K3:** Bucheinkauf T41/T42 behält den Katalog; Schmied vor und mit Angebot behält ihn · **K4:** T7 „She dipped the quill …“ vor jeder Namensnennung bleibt abgelehnt (§8). Ein Teil aus Dialog, Verneinung, Erinnerung oder Hörensagen ist keine Evidenz · **D2:** „pulled the tray closer and checked the window“ bleibt ohne Handlung; „Alaric checked the slip“ bleibt „Alaric does it“; „she“ ohne andere Person ist nie Alaric · **K7:** Kauf mit ausreichender Börse (T42) unverändert |
| T24 nach K4 | Rückkehr der Schreiberin gebucht; `knowledge.gained` `f.pc.completed.quest.cull_the_millpond_gnasher`. Ihre Art (100 Zeichen) wird jetzt als Anker einer Anwesenden geprüft und dort nach `anchor_value` abgelehnt, nicht mehr als abwesend |
| `npm test` | **3015/3015** |
| Replay | Korpus **2235 Fälle, 0 geändert** gegenüber `.175` |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **162** wahr, 0 falsch (`.175`: 158) |
| ST1.19 Failsoft | `OK`, **167** wahr, 0 falsch (`.175`: 163) |
| Neue Smokeprüfungen | `pilot01_k3NoCatalogOnRoad` (T19 ohne `gear_market`), `pilot01_k4ClerkReturns` (T24 Rückkehr), `pilot01_k4HandlerKnows` (Wissen um den Abschluss), `pilot01_k7ShortfallToNarrator` (T27: Fehlbetrag und Kanonsatz im Erzählerblock) |
| Kontext | siehe §1 |

## 5. Grenzen

- **K3:** Ein Laden, dessen Name ein `shop_word` trägt, bekommt den Gerätekatalog bei Kaufwörtern auch dann, wenn er keine Ausrüstung führt (Buchladen T41/T42). So wie vor `.176`, nur ohne die Prosa-Auslösung.
- **K3:** Der verbleibende Überlauf (§1) bleibt offen. Nach D3 wurde nichts am Budget geändert.
- **K4:** Ein Teil muss für sich allein alle Regeln erfüllen. Mehrere Teile, die jeweils allein zu schwach sind, ergeben zusammen keine Evidenz.
- **K7:** Ob der Erzähler danach den Münzwechsel nicht mehr erfindet, zeigt erst ein natürlicher Lauf.
