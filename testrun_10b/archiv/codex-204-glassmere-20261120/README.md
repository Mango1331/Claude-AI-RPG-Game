# Glassmere und Glimmerdeep · natürlicher Codex-Spieltest auf .204

**Empfehlung für den nächsten persönlichen Spieltest nach unabhängigem Gegenreview: GO.** Alaric erreichte Stufe 5, gab einen Gildenauftrag regulär ab und verließ Glimmerdeep aus eigener Entscheidung mit einem offenen zweiten Auftrag. Alle 41 Eingaben bestanden die Prüfung nach Reload. Zwei für Spieler spürbare Widersprüche betrafen den Gildenbeitritt und ein Geschenk. Die Kampagne endete am Grotteneingang mit 61/115 HP und einem wiederherstellbaren Spielstand.

## Welcher Build wurde gespielt?

Build `4.3.0-c.6.6.204` stammt unmittelbar von Zyklus 3 (`25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18`). Der Integrationscommit aktualisiert manifest.json, package.json, src/util.js, die Versionszeile im V4-Narratorvertrag und die zugehörige Erwartung im User05-Smoke. Action-HUD, Einzelslotrepair, Extractor-Normalisierung, Ausrüstungskatalog, natives Streaming und bestätigter Save stammen aus dem geprüften Vorgänger. Der Entwicklungsbranch rückte per regulärem Fast-Forward von `5e5b8272412b51b91f75b6e37c5b94d95c9fae11` auf den Integrationscommit vor. Beide Entwicklungsbranches stehen auf `b51e850bfa233b32f10ba01c563002ab26061c85`. [Integrationsdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b51e850bfa233b32f10ba01c563002ab26061c85)

| Selbst ausgeführte technische Abnahme | Ergebnis |
|---|---|
| Vollständige Node-Suite | 3.412/3.412 |
| Historische Replayprüfung | 2.235 Vergleiche, 1.131 bekannte Abweichungen mit exakt akzeptiertem Fingerprint, null neue |
| ST-Standard / Failsoft / Streaming | 354/354 · 360/360 · 59/59, jeweils null PageErrors |

## Kampagne und unmittelbares Codex-Spielerfeedback

Ich habe Alaric als Warrior mit Charge und Cleave angelegt. Meine nächsten Entscheidungen beruhten auf Chat, Status, Questliste und anklickbarem HUD. Die Browsersteuerung führte die einzeln gewählten Eingaben aus. Die Modellroute übernahm ausschließlich die Engineaufgaben. Die folgenden Eindrücke stammen aus den während des Spiels geschriebenen Notizen. [Spielerfeedback mit Zeitstempeln](spielerfeedback.jsonl)

| Eingaben | Was ich versucht und erlebt habe |
|---|---|
| 1–9 | In Glassmere wollte ich Arbeit finden. Die Wache wies mir den Weg zu Serah. Ihre gesprochene Aufnahme in die Gilde klang endgültig. Erst der Blick auf die unveränderten fünf Silber und den Mitgliedsstatus machte klar, warum ich nochmals fragen musste. |
| 10–18 | Ich wählte „The Pie-Shop Bogy“, hielt Marta und ihre Hühner aus dem Kampf heraus, besiegte den Kater und brachte ihrer Schwester Bess die Nachricht. Diese selbst gewählte Zwischenstation gab dem kleinen Auftrag Gewicht. Am Gildentisch konnte ich den Auftrag mit 40 Kupfer abschließen. |
| 19–28 | Serah löste ihre Zusage ein und zeigte mir den Leinenverband. Bei Brannik verkaufte ich Fell und zwei Krallen für fünf Kupfer. Mit dem zweiten Auftrag und einem Heiltrank für acht Kupfer machte ich mich auf den Weg nach Glimmerdeep. |
| 29–41 | Zwei Glaskäfer und anschließend zwei Mineralschleime machten Abstand, Ausdauer und Zielwahl wichtig. Einen Trank einzusetzen kostete einen Kampfzug. Als beide Schleime gebunden waren, zeigte der Flächenhieb für zehn Ausdauer je 25 Schaden. Nach dem zweiten Kampf waren der Trank verbraucht und 61 von 115 HP übrig. Ich ließ den Boss leben und ging zum Eingang zurück. |

## Technische Prüfung nach dem Spiel

**41 Spielerinputs, 36 vollständig erzählte und extrahierte Abschnitte.** Klassenwahl, Skillwahl, Journal und Attributverteilung erfolgten ohne Narration. Bei Eingabe 6 scheiterten Planner und Repair. Die Eingabe blieb sichtbar archiviert und erzeugte keine Spielerbuchung. Alle 36 verarbeiteten Antworten erreichten `applied` mit bestätigtem Speichern. Der separate Reload nach jeder Eingabe und die erneute Faltung aller 41 Chatpräfixe ergaben dieselben Zustände und Ereignishashes. Der vollständige Ereignisstrom enthält 599 Ereignisse, null Faltungsfehler und null Zustandsverletzungen.

| Geprüfter Spielpfad | Ergebnis und Grenze |
|---|---|
| Action-HUD, Bewegung und Zielbindung | 13 HUD-Eingaben einschließlich direkter Questannahmen. Zwölf kamen ohne Planner aus. Der freie Zusatztext im F-Modus bei T31 löste den Planner aus. H-Rollenspieltext ließ die gewählte Aktion gebunden. Charge, Cleave, normaler Angriff und Verbrauch des Tranks wirkten auf die gespeicherten Werte. |
| Quests und Board | T9 zwei Boardrequests einschließlich eines Einzelslotrepairs. Erste Quest angenommen und bei Serah abgeschlossen. Spätere Boardlektüre und zweite Direktannahme T26 arbeiteten mit den bestehenden Angeboten. Nach Rückzug blieb der Räumungsauftrag aktiv. |
| Geld und Inventar | 50 cp Start, −20 Mitgliedschaft, +40 Quest, +5 Verkauf, −8 Heiltrank = 67 cp. Erzählter und gespeicherter Handelspreis bei Verkauf und Trank stimmten überein. Die Auszahlung wurde einmal verbucht. Fell, Krallen und verbrauchter Trank waren am Ende aus dem Inventar verschwunden. Verband sowie Chitin, Gel und Kern blieben. Kauf einer F-Ausrüstung und der bekannte „tomorrow“-Preisfall kamen hier nicht vor. |
| NPC-Kontinuität | T20 wurde Serahs Verband tatsächlich übertragen. Ihr Rat kam T36 in der Grotte wieder vor. Die Nachricht an Bess und die Rückkehr zu Serah erhielten unterschiedliche Personen und Zwecke. Bei Marta bestand die unten dokumentierte Präsenzlücke. |
| Kampf und Rückzug | Insgesamt fünf besiegte Gegner. Endstand Stufe 5, 135 XP auf dieser Stufe, 61 HP, 60 MP, 34 Ausdauer. Gespeicherter Ort nach T41 war Glimmerdeep Grotto, Alaric allein, kein aktiver Kampf. Die Räumungsbelohnung blieb aus. |

## Fehler und Grenzen

| Schwere und Reproduktion | Beobachtung und Wirkung |
|---|---|
| Mittel · T5/T6/T8, Gildenbeitritt | Die Prosa bestätigte den Beitritt vor der Buchung. Der Extractor durfte die Mitgliedschaft nicht als freie Tatsache anlegen. Auch die nächste ausdrückliche Bitte scheiterte nach einem Plannerrepair. Erst T8 buchte Mitgliedschaft und Gebühr genau einmal. Das erzeugte drei weitere Eingaben bis zum verlässlichen Status. |
| Mittel · T15/T16, Martas Geschenk | Die Geschichte beschrieb das Johannisbeerbrötchen. Martas Eintritt war im vorigen Schritt abgewiesen worden. Der Extractor konnte ihre Übergabe deshalb nicht buchen. Aus Spielersicht fehlte das versprochene Stück im Inventar. Die Ablehnung ist mit den Originalantworten reproduzierbar. |
| Gering · T38, Zustand des Gegners | Die Prosa bezeichnete einen bereits getroffenen Schleim als „whole“. Die mechanischen Schadensbuchungen für beide Ziele und der folgende Kampfzug blieben konsistent. |
| Teststeuerung · T10, erste Direktannahme | Der UI-Klick löste die Generierung vor Öffnung der lokalen Testsperre aus. Der Proxy wies lokal mit 409 ab, vor jedem Upstreamversand. Die ursprüngliche Revision ist archiviert. Regenerate setzte dieselbe bereits gebuchte Eingabe fort. Ereignisse und Revisionsdaten der ursprünglichen Eingabe blieben identisch. Der zweite Direktklick T26 lief regulär. Die gesamte persönliche Wartezeit von T10 lässt sich aus der Wiederaufnahmemessung nicht bestimmen. |

Sechs lokale Nachspiele mit archivierten GLM-Antworten reproduzierten die Ereignisse von T5 (Spieler und Antwort), T6, T16, T20 und T23 exakt. Das prüft den Engineentscheid bei gegebenem Modelltext. Wie oft ein frisches Modell dieselben Fehler erzeugt, bleibt offen. Eine einzelne Warrior-Kampagne deckt weder andere Klassen noch Bosskampf, Tod oder langfristige Balance ab. [Fallreplays](fallreplay.json)

## Provider und Zeitmessung

SillyTavern 1.19.0 lief am Commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` in der isolierten Umgebung. OpenRouter verwendete `z-ai/glm-5.3-flash` über `wafer/us`, ohne Fallback. Originales V4-Preset und Lore v0.14, .204-Character-Description, natives Streaming ein, Smooth und X2 aus. Die Diagnose begleitet ein freies Spiel mit einer Version. Sie liefert keinen A/B-Geschwindigkeitsvergleich.

| Messgröße | Ergebnis |
|---|---|
| Physische Requests | 106 von 200, davon 28 Planner, 2 Board, 36 Narrator, 40 Extractor |
| Repairs | 3 Planner, 1 Board, 4 Extractor |
| Providerabschluss | 106 reguläre Enden, höchstens 1 aktive Generierung, keine 429 |
| Provider-Usage | 1.388.262 Inputtokens einschließlich 811.776 Cachetokens. 37.789 Outputtokens einschließlich 11.159 Reasoningtokens |
| Verbrauch | 0,064448404 USD von 0,50 USD. Summe aller Einzelkosten identisch mit dem Anstieg der Key-Usage von 0,027561108 auf 0,092009512 USD |
| 35 reguläre erzählte Spielzüge, Median ab Senden | 3,962 s bis zum ersten lesbaren Prosasatz, 11,263 s bis zur sicheren nächsten Eingabe. T10 separat ab Regenerate erfasst, fünf Eingaben ohne Narration. Alle Einzelwerte sind archiviert. |

## Belege für den unabhängigen Review

- [Originalchat](originalchat.jsonl.gz) · SHA-256 der **entpackten** unveränderten ST-JSONL: `414399904673fa54246322bcbc24537518a11aa3accbbce1cdd9c802d22b2a54`.
- [Technisches Archiv](laufdaten.tar.gz) · SHA-256: `17b6dffaff71fffd1f268005ef0d6866f454eca6e09b7e4a1856add022794825`. Enthält bereinigte ST-Logs, physischen Requestledger, World-Snapshots 1–41, Browserquittungen, Vorzustand der T10-Unterbrechung, Route, Kostenzähler, Integrationsprotokolle und lokale Prüfskripte. Die technische Fassung lässt private Reasoningtexte und Authentifizierungsangaben aus.
- [Kennzahlen mit Eingaben und Requestnummern](kennzahlen.json) · [Unmittelbares Codex-Spielerfeedback](spielerfeedback.jsonl) · [Fallreplay](fallreplay.json) · [Windows-Update](WINDOWS.md).

Die zwei Archivprüfungen lassen sich ohne Providerverbindung wiederholen. Den .204-Checkout für die Modulimporte unter `/workspace/avereth-204` bereitstellen und das technische Archiv in einen leeren Ordner entpacken. Aus `/workspace/avereth-204/avereth-engine` die Skripte `node <Archivordner>/werkzeug/validate.mjs <Archivordner>` und `node <Archivordner>/werkzeug/cases.mjs <Archivordner>` ausführen. Das zweite Ergebnis entspricht fallreplay.json. Beide Prüfungen wurden auch gegen das fertig gepackte und erneut entpackte Archiv ausgeführt.
