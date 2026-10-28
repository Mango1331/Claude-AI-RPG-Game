# Fail-soft Gegenreview und Teil 2 — Build .106

Basis `.105` / `f44bebc`. Umsetzung des GPT-Gegenreviews vom 28.10.2026 und Schritt 2 des [Fachplans auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md). Teil 1 bleibt bestehen; kein neuer Toleranzmodus und keine Balance-/Combatänderung.

## Teil-1-Gegenreview: beide Fehler bestätigt und behoben

**Planner-Speicherblock:** Der tatsächliche `index.js`-Pfad wurde mit einem fehlgeschlagenen Readback geprüft. Auf `.105` löste die zweite Spielernachricht zwei weitere Modellaufrufe aus (vier statt zwei), obwohl die erste Nichtausführung nicht bestätigt gespeichert war. Jetzt nutzen Planner und World denselben bestehenden flüchtigen Speicherblock. Sowohl ein werfender Save als auch ein fehlgeschlagener Readback blockieren vor jeder weiteren Planung; nach bestätigter Speicherung wird der Block freigegeben. Der Readback bleibt eine Prüfung vorhandener Records, ohne Nachbuchung oder neue Zustandsquelle.

**Unbekannte Fehlercodes:** `ERR_INVALID_ARG_TYPE` war in `.105` wegen des vorhandenen `code` nicht als unklassifiziert markiert. Jetzt erlauben ausschließlich bekannte Provider-/Timeout-/Cancel-Codes die entsprechende Klassifikation; sonst bleibt die Exception unklassifiziert. Bestehende begrenzte Retries bleiben unverändert, aber ein endgültig unklassifizierter Fehler autorisiert keine automatische Fortsetzung. Authentifizierungsfehler bleiben hart.

## Teil 2

### Gemeinsame Preisbasis

`amountErrors()` verwendet bei Buy/Sell dieselbe `tradePrice()`-Evidenz wie die Handelsausführung. Gesamtgrenzen bleiben Gesamtgrenzen: vier Pelze zu zwei Kupfer erfordern acht Kupfer `min_cp`; neun Fänge zu einem Kupfer neun. `apiece` wird wie `each/per` erkannt. Ohne explizites `qty` liefert bei Verkäufen der bekannte gehaltene Stack die bestehende Gesamtmenge. Unbekannte Mengen bei Stückpreisen bleiben unklar.

Mehrere unabhängige Warenpreise werden nicht summiert oder einer beliebigen Position zugeschlagen. Preisbereiche und nachgestellte Bedingungen eines Stückpreises bleiben ungeklärt. Pay benutzt weiterhin seine bisherige Währungsumrechnung; keine generelle neue Interpretation von Geldgeschenken. Buy/Sell-Grenzen, `agreed_cp`, Bid-/Offer-Zustimmung und tatsächliche Münz-/Objektbuchungen behalten ihre Bedeutung.

Die Planneranweisung nennt Gesamtbasis, Menge und die exakte jeweilige Preisklausel. Repair erhält den konkreten erwarteten Gesamtbetrag oder eine präzise Unklarheitsmeldung. Es gibt keine automatische Umschreibung von zwei auf acht Kupfer und keine 17-Kupfer-Auszahlung aus einer Spielerbehauptung.

Originalkontrollen T137/C403/C404: beide bleiben ungültig, mit korrekter Mengen-/Scope-Diagnose. Die ausdrücklich als Kontrolle markierte Antwort mit den originalen Klauseln `two copper a pelt` und `a copper apiece for the fangs` und Gesamtminima 8/9 besteht `parsePlan()`. Das ist kein natürlicher Verkaufsnachweis.

### Ortsreferenz-Repair

Bei ungültigen Place-Refs benennt der Parser den konkreten Feldpfad und die bereits unterstützte vollständige `new`-Form. Der Hinweis steht bei der ersten betroffenen Fehlermeldung, damit ihn die Acht-Fehler-Grenze nicht verdrängt. Repair soll bereits gültige Szenen und Expected-Felder erhalten und keine Ankunft erfinden. Kein neuer Ref-Typ, keine automatische Umordnung, keine synthetische Reise.

Die Originalantwort C130 hat weiterhin eine gültige globale Szene und ungültige `.at`-Felder. C131 bleibt ungültig. Beide Originalantworten sind als kleine Report-/Referenzfixtures archiviert; kein vollständiger Batch-ZIP wird dadurch als in Git vorhanden behauptet. Zulässige Ortsreferenzen bleiben unverändert; alle World-/Arrival-Schutzregeln gelten weiterhin.

### Angebotspositionen

Der Katalog trennt `line_id="guard"` von `item="Primer of Guard"`. Bei falscher Positions-ID nennt die bestehende Kaufablehnung die tatsächlich verfügbaren IDs und Namen. Keine unscharfe Ersatzwahl, kein Kauf aufgrund ähnlicher Bezeichnung. Der P0-Mock kann alte und aktuelle Katalogtexte zuordnen; seine Erfolgs-/Negativgates bleiben unverändert. Zwei bestehende reine Textformat-Erwartungen sind entsprechend aktualisiert.

## Tests und Abnahme

- **25 neue Regressionen** in `patch_failsoft_part2.test.js` und `patch_failsoft_host_block.test.js`.
- Vor Produktänderungen **13/13 gezielte Fälle auf .105 rot**: zwölf Preis-/Ref-/Katalog-/Fehlercode-Fälle und der tatsächliche Planner-Hostpfad mit unbestätigtem Save. Danach **25/25 grün**, einschließlich weiterer Schutzkontrollen.
- Kontrollen: werfender Save, fehlgeschlagener Readback und anschließende Freigabe erst bei gespeicherten Records; Original C403/C404 und korrigierte Kontrollantwort; Original C130/C131; Währungen, Stück-/Gesamtpreise, fehlende Menge, Preisbereich und Bedingung; falsche Angebotsposition ohne Zahlung, exakte Position einmalig gekauft, kein Zweitkauf, serialisiertes Event-Replay identisch.
- Angrenzende Prüfung einschließlich P0-Spikes, Gate-/Handels- und Fail-soft-Tests: **99/99 grün** auf dem damaligen Zwischenstand. Abschließend vollständiges **`npm test -- --test-concurrency=4`: 2103/2103 grün**.
- Echter ST 1.19 mit geskriptetem Provider: **27/27 grün** im erweiterten `smoke:st:c`, einschließlich normalem Kampf-/Swipepfad, sichtbarer Nichtausführung, erhaltenem Spielerinput, terminalem Extractorfehler und Erkennung eines absichtlich injizierten HTTP-500 trotz zurückgekehrtem ST-Save-Promise. Sieben Extractor-Aufrufe: fünf reguläre plus zwei des absichtlichen Fehler-/Repairfalls. Keine unerwarteten PageErrors; der erwartete Savefehler ist gesondert protokolliert.
- Kein natürlicher GLM-Langlauf gestartet. Narrator-Vertragsrevision unverändert; keine persönliche Kartenaktualisierung notwendig.

## Grenzen

Preis- und Ortsformulierungen können weiterhin unklar oder formal ungültig sein. Dann greifen die Nichtausführung/Einzelablehnung und sichere Fortsetzung aus Teil 1, sofern deren Voraussetzungen erfüllt sind. Keine Garantie für fehlerfreie Prosa und kein allgemeines Schema-Salvage. Der nächste natürliche Batch muss bestätigen, ob die Kombination weniger verlorene Handlungen und längere sinnvolle Kampagnen ermöglicht. Kampfökonomie, XP, Werte, Gildenregeln und Testspielerstrategie bleiben unverändert.
