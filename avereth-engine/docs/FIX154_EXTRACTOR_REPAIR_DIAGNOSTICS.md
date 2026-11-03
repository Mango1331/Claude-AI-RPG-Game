# .154 – konkrete Extractor-Reparaturdiagnosen

Basis `.153` / `7da43d6`; [Batch27 samt GPT-Gegenreview §§6–7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261103-103117Z/REVIEW.md). Umsetzungsfreigabe des Nutzers am03.11.2026 nach Gegenprüfung.

## Ursache und Umfang

Rogue T86–88: Der Extractor wiederholt `obj.loot.wolf.fang.f`, obwohl sein Katalog `obj.loot.wolf.fang.f.enc_t51` enthält. Mage T36: Der ausdrücklich unbekannte Preis enthält verbotene Quote-Felder. Das geschlossene Schema lehnt beide Fehler korrekt ab; der bestehende Repair sieht aber nur `matches none of anyOf`. Die äußere Delta-Typdiagnose erklärt die verschachtelten Referenz-/Pricingfehler nicht.

Der Gegenreview präzisiert den Umfang sinnvoll: **kein Umbau des globalen Validators und kein Auflisten aller gescheiterten Unionzweige**. Umgesetzt ist ausschließlich eine private Diagnosehilfe in `src/v4/extract.js`, aufgerufen bei bereits vorhandenen Fehlern in `parseExtraction()`:

- Ungültige Stringreferenzen in Bid-Linien und den bereits als Objektverweis definierten Deltafeldern: vollständiger Feldpfad, tatsächlich zurückgegebener Wert (Anzeige auf200 Zeichen begrenzt), gültige vollständige Katalog-IDs als Hilfestellung.
- Höchstens12 Kandidaten und1600 Zeichen für die Kandidatenliste. Kandidaten-IDs werden niemals abgeschnitten. Präfixähnlichkeit ordnet ausschließlich Hinweise; mehrere Identitäten werden als mehrdeutig markiert. **Keine automatische Zuordnung, Suffixergänzung, neue Aliasart oder Schemafreigabe.**
- Bei `pricing.basis: unknown` nennt die Diagnose die unzulässigen Eigenschaften und die unverbindliche korrekte Form `{basis:"unknown"}`. Kein Wechsel zu `total` und keine Preisberechnung aus Prosa.

Die vorhandene Repairrunde erhält diese Hinweise über den bestehenden Fehlerkanal. Schema, Reportdaten und Buchung bleiben unverändert. Keine Unknown-Normalisierung, keine Teilbuchung ungültiger Reports, kein weiterer Provideraufruf oder höheres Budget. Systemprompt/Protokoll/Erzählerkarte unverändert. Katalogzugehörigkeit ist weiterhin nur eine Referenzprüfung; tatsächlicher Holder, Mengen, Präsenz, Preis und Zustimmung werden separat durch World/Trade geprüft.

## Rot/Grün und Gegenfälle

`tests/v4/fix154_repair_diagnostics.test.js`: neun Tests. Auf unverändertem `.153` in separatem Worktree **fünf rot, vier positive Kontrollen grün**; auf `.154` **9/9 grün**.

Die komprimierte Fixture `tests/v4/fixtures/batch27_repair.json.gz` enthält die benötigten originalen Rogue-/Mage-Chatprefixe mit Texten, Events und Quellhashes sowie Antworten251/252,256/257,260/261,98/99. Quell-ZIP-SHA-256: `8d053a7dcd1a57523d4883dea0753e242ab9429c91c9d88fb4aaff737f8eadf3`. Originale liegen zusätzlich im Batch27-Teilarchiv; Anzeige-/Modelltelemetrie im Testprefix weggelassen.

Geprüft sind tatsächliche `processReplyAny`→`runExtraction`-Repairprompts und persistierte Hostrecords, nicht nur ein Helper: alle drei Rogue-Antworten, richtige IDs, anschließende ausdrückliche Gebotsannahme mit einmaliger Zahlung und JSON-Reload; Mage-Repair mit unabhängigen10/20-cp-Angeboten ohne Debit. Negative Fälle: unverändert falscher zweiter Report endet nach zwei Calls ohne Buchung; mehrere Encounter-IDs bleiben getrennt; Kandidatenliste begrenzt; fremdes katalogisiertes Objekt wird nicht als PC-Ware verkauft. Fehlender optionaler Katalog liefert weiterhin eine ungültige Antwort statt Exception. Gültige `total`-/`unknown`-Formen unverändert.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue und angrenzende Run14-/Gearregressionen | 32/32 |
| Vollständiges `npm test` | 2723/2723 |
| `npm run replay:check` | 2235 Fälle; unverändert479 exakt akzeptierte Baselineabweichungen, keine neuen/offenen/veralteten Einträge; keine Fingerprintänderung |
| Echter ST1.19-Standard-Smoke | 42/42, keine PageErrors; 43 Provideraufrufe/17 Extraktionen |
| Echter ST1.19-Failsoft-Smoke | 47/47, keine PageErrors; 49 Provideraufrufe/19 Extraktionen |

Die Originalfehlerpfade werden in den Node-Produkthosttests mit aufgezeichneten Modellantworten und kontrolliert korrigiertem Repair ausgeführt. Die echten ST-Smokes prüfen mit Mockprovider die bestehende Host-/Finanz-/Save-/Fetch-/Edit-/Reload-/Swipe-/Regenerateintegration; sie sind kein natürlicher GLM-Reparaturnachweis.

## Grenzen und bewusst unverändert

Ein besserer Repairprompt garantiert nicht, dass GLM die korrekte ID kopiert. Der folgende natürliche Nutzerbatch muss die tatsächliche Wirkung zeigen. Der dreifache Runner-Stallschutz bleibt bestehen. Keine unbekannten NPCs über `enter` freigeben, keine Gorran-/Badekübel-/Nahkampf-Sonderkorrektur. XP, PP/LP, Preise, Finanzmechanik, Welt- und Kampfregeln, Runnerstrategie und 10B-Abschlussmaßstab bleiben unverändert. Kein natürlicher Batch eigenständig gestartet.
