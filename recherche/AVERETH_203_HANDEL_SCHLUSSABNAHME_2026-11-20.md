# Avereth .203 · Schlussabnahme und Handelstest

**Technisches GO für den unveränderten Zyklus-3-Kandidaten. Die natürliche Handelsabnahme ist offen.** Für die dauerhafte Integration auf Grundlage dieses Tests lautet die Empfehlung **NO-GO vorerst**. Ein konkreter lokaler Gegenfall betrifft beide Versionen. Ein eigentlich verbindliches Schildangebot verliert seine Preisbindung, wenn im direkt folgenden Satz eine eigenständige Verabredung für morgen steht. Der Gegenfall betrifft die Spielqualität, seine Häufigkeit bei natürlich generierten Antworten ist unbekannt.

Geprüft am 19./20. November 2026 (Berlin). Die Laufzeitstände sind A/B3 `6d9770f9b31e78d37567719bf1c06d8a4942288c` und B/Zyklus 3 `25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18`. Der isolierte Host war SillyTavern 1.19.0, `7e8663cd9c184a550b37238218bdd32c6efc68e9`. [Zyklus-3-Fachbericht](AVERETH_203_PERFORMANCE_ZYKLUS3_2026-11-19.md) · [Unabhängiger Gegenreview](GEGENREVIEW_203_PERFORMANCE_ZYKLUS3_GPT_2026-11-19.md)

## Natürlicher Vergleich und tatsächlicher Verbrauch

Die authentifizierte Planabfrage am 19. November ergab HTTP 200 und **Chat**. Die öffentlich abgerufenen Featherless-Tarifbedingungen beschränken Chat auf „interactive, human-driven use by the purchaser“ und schließen „background automation, or benchmarking“ ausdrücklich aus. Pausen und globale Serialisierung ändern die Einordnung der automatisierten Prüfung nicht. Die öffentliche Tarifseite war mit HTTP 200 abrufbar. Personenbezogene Konto- und Zugangsdaten wurden nicht übernommen. [Tarifbedingungen](https://featherless.ai/pricing) · [Plan-Endpunkt](https://featherless.ai/docs/api-reference-plan)

**Alle drei natürlichen P-/X-Paare: NOT RUN.** Eine nichtgenerierende Kontoabfrage, null physische Modellrequests, null zusätzliche Inferenzkosten. Es liegen keine Provider-Usage für Input, Output oder Cache, keine natürlich beobachteten Repairs, Provider- oder Savezeiten und kein Median paarweiser Zeitdifferenzen vor. Der frühere Offlinebefund von 121 weniger Inputtokens pro betroffenem Request bleibt eine Messung mit dem gepinnten Tokenizer. Er wurde bei diesem Test mit keiner neuen Modellantwort validiert.

## Technische Schlussprüfung

Die folgenden Ergebnisse wurden auf dem gepinnten Kandidaten neu erhoben.

| Prüfung | Ergebnis |
|---|---|
| Node-Suite | 3.412/3.412 bestanden |
| Replay-Fingerprints | Alle 2.235 wie erwartet, davon 1.131 bekannte Abweichungen mit exakt akzeptiertem Fingerprint, null neue |
| Gezielte Katalog-, Ausrüstungs- und X-Tests | 35/35, einschließlich Rekonstruktion aller 59 ID-/Namenspaare und B3-Normalisierung |
| Finanz- und Angebotsregressionen | Je 111/111 auf A und B, einschließlich abgewiesener Käufe und einmaliger Zahlungen |
| B1-Originalfälle | User04/05/06 alle mit historischen Boardereignissen identisch |
| Isolierte ST-1.19-Browserläufe | standard 354/354, board_slot 49/49, failsoft 360/360, narrator_streaming 59/59. Die hier als bestanden ausgewiesenen Läufe hatten null unerwartete Browserfehler |

Der erste kombinierte Failsoft-Lauf erreichte 359/360. Einzig die Sammelprüfung `noPageErrors` schlug fehl. SillyTaverns verzögerter nativer Save lief über `saveChatConditional` in die vor dem Schreiben liegende Schutzprüfung `Stale origin or records before write`. Der Adapter verweigert dort einen veralteten Ursprung oder geänderte Records. Der Stack belegt den Schutzpfad. Welcher Testschritt den Schnappschuss überholte, ist nicht eindeutig aufgezeichnet. Die Speicher- und User05-Regressionen bestanden auf A und B mit je 27/27. Die eng verwandte Auffälligkeit wurde bereits in Zyklus 2 protokolliert. Die separate Wiederholung auf demselben Commit erreichte 360/360.

Die vollständigen Standard- und Failsoft-Sammlungen prüfen den Engine-/Hostabschluss einschließlich bestätigtem Save und Read-back. Auch der erste separate Streaminglauf brach ab. Vier reguläre Paare sowie die Fehlerfälle bis einschließlich malformed waren in den Teilresultaten grün. Beim sauberen EOF ohne DONE las die Probe nach der ersten Prosa bereits die Belegung `unknown`, während sie noch `active` erwartete. `unknown` hält weitere physische Anfragen gesperrt. Der Abbruch lag vor den nachfolgenden Reload- und Buchungsprüfungen für diese Revision; daher gibt es aus diesem Erstlauf keine vollständige EOF-Abnahme. Er wird als abgebrochener Test geführt. Ein zeitliches Überlappen von EOF und Browserinspektion ist plausibel. Der vollständige unveränderte Wiederholungslauf bestand mit 59/59.

Separate Board- und Streaming-Smokes prüfen unter anderem Einzelrepair, Teilprosa, Fehler, Stop und Antwortrevisionen. Diese Läufe verwenden ausschließlich lokale Antworten. [Maschinenlesbare Ergebnisse](performance_cycle3_203/handel_schlussabnahme.json)

## Drei gepaarte lokale Extractorprüfungen

Sechs getrennte ST-Datenwurzeln und echte Browser. Reihenfolge A–B, B–A, A–B. Die beiden Gildenszenen erweitern den archivierten B-Zug 4. Die Kampfszene erweitert User06 I20. Für jede Szene wurden aus demselben gespeicherten Zustand mit derselben aktiven Antwortrevision ein fester Prosazusatz und ein vollständiger X-Report eingespeist. In Szene 3 liefert der Mock beim einmaligen Repair denselben fachlich beabsichtigten Report erneut. Der Treiber vergleicht die tatsächlichen Requestbodies beider Versionen nach Herausnahme der einzigen unterschiedlichen Marktzeile. Vollständiger Anfangszustand, gefalteter Endzustand und geordnete Ereignisse beider Arme ergeben je Paar identische Hashes nach nativer Speicherung, Read-back und Reload. Die bestehende Vergleichsfunktion entfernt die lokale X-Laufzeit aus dem Ereignisvergleich. Ein weiterer Lauf reproduzierte die Ergebnisse. Der Browser-Gegenversuch betrifft den Extractor. Er erhebt keine neue Planner- oder Narratorqualität.

| Szene | Gemessen in beiden Armen | Lokale X-Requests je Arm | Fachurteil |
|---|---|---:|---|
| Feines Kettenhemd | `chainmail`, Anzeige fine F-Rank chainmail, Rüstung, DEF 7/MDEF 2. Die Prosa nennt 80 Kupfer, der gebuchte feste F-Preis beträgt 72. Kein Geldtransfer beim Angebot. | 1 | ID, Werte und Preisregel korrekt. Die Prosa widerspricht dem Engine-Preis. |
| Bedingte Handaxt | `hand_axe=hand-axe`, fine, Waffe, ATK 14. In der Prosa 12 Kupfer, Enginepreis 140. Die Genehmigung der Gilde bleibt als offene Bedingung erhalten. Ein expliziter Kaufversuch auf einer Kopie des zurückgelesenen Zustands wird wegen der Bedingung abgewiesen. Keine Zahlung und kein Gegenstandserwerb. | 1 | Bedingung und Spielerhoheit gewahrt, ebenfalls Preisabweichung zwischen Text und Welt. |
| Kampf, Geschenk und Zusage | Nessa ist anwesend, der blaue Schal geht an den PC, die Verabredung an der alten Furt bleibt mit den richtigen Beteiligten gespeichert. Feiner Buckler, `buckler`, Schildhand, DEF 5/MDEF 3, 64 Kupfer. | 2 | **Preisbindung verfehlt.** Trotz des eigenständigen verbindlichen Angebots wird die Zeile als `unverified` gespeichert. |

**Ursachenprüfung.** Im ersten Kettenhemdlauf scheiterte die ursprüngliche Testannahme „80 gespeichert“. Der unveränderte F-Ausrüstungspfad berechnet den Einzelhandelspreis aus Basis und Qualität. Der endgültige Test behält die ursprüngliche Prosa bei und prüft beide Preise separat. In der ersten Ein-Request-Probe des Kampffalls verlangte B3 einen Repair. Der auf eine Antwort beschränkte Testmock wies ihn ab, und der Treiber erreichte den erwarteten Save-Status nicht rechtzeitig. Die endgültige Probe bedient auch den von der Engine tatsächlich angeforderten Repair in beiden Armen.

Im Kampfsatz steht „Sixty-four copper for this fine buckler.“ Direkt danach kommen Geschenk und das Versprechen „to meet him at the old ford tomorrow“. `openConditionNear` prüft auch den Folgesatz ohne eigene Geldangabe. Das Wort `tomorrow` löst den Reparaturhinweis für den Preis aus. Nach der wiederholten Antwort sichert die World-Logik das Angebot als unbestätigt. Der Parser und die Buchung sind in A und B identisch. In der separat ausgeführten früheren User06-Mischprobe mit anderer Satzstellung bleibt der Preis verbindlich. Das belegt die Empfindlichkeit gegenüber Satzstellung. Die Fachabweichung darf weder dem neuen Marktkatalog noch einem zufälligen GLM-Output zugerechnet werden.

**Entscheidung.** Kandidat zum unabhängigen Schlussreview erhalten. Neben der allgemeinen Modellfrage soll der Review über den Umgang mit der satzübergreifenden Preisbindung und den Unterschied zwischen erzähltem und festem F-Preis entscheiden. Für eine spätere natürliche Abnahme sind ein benchmarkberechtigter Zugang und bestätigte Verbrauchsgrenzen erforderlich. Die drei Proben sollten dann dieselben Ausrüstungseigenschaften, Zahlungsschranken und unabhängigen NPC-Zusagen prüfen.

**Reproduktion.** Das zusätzliche lokale Testwerkzeug liegt auf `experiment/203-cycle3-trade-acceptance`, Commit `1c581b83fbf590f05ab5bbbb78302064940ec0dd`. Es startet nur Loopback-Mocks. Bei entpacktem Originalarchiv, installierten ST-Runner-Abhängigkeiten und Chromium im technischen Checkout ausführen:

```sh
env -u FEATHERLESS_API_KEY node avereth-engine/tools/st_live/trade_pair_mock.mjs "$A" "$B" "$RAW" "$MAIN" "$ST" "$OUT"
```

Die vollständigen Browser-Smokes laufen im jeweiligen `avereth-engine`-Verzeichnis mit `npm run smoke:st:isolated -- --mode both`, anschließend mit `--mode board_slot` und `--mode narrator_streaming`. Die ursprünglichen Spielaufzeichnungen liegen unverändert im [Archiv](performance_natural_ab_203/laufdaten.tar.gz).
