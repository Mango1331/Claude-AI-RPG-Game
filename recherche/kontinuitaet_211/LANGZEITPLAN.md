# Entwurf für einen späteren natürlichen OpenRouter-Langzeittest

Dieser Entwurf gehört zu einem eigenen Folgeauftrag. Die Offline-Runde hat dafür null Modellanfragen gestellt. Der Vergleich ist auf .210 bei `82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc` und den .211-Kandidaten `c2ddc780d4c57b219f9cd7a1d134efceca7e459d` (Laufzeitcode identisch mit `10de728d4260e07ebf791cd2585ed93dc944bc7a`) zugeschnitten. Der spätere Auftrag legt Modell-ID, Provider-Routing, ein gegenüber der Entwicklungsrunde anderes Denkintensitätssetting, Preisstand, Obergrenze für Kosten und Requests sowie das verfügbare Zeitfenster fest. Die frühere Rechnung von 0,0873 USD für 194 Antworten mit Usage lässt sich wegen anderer Promptlängen, Denkintensität und Antwortlängen nur zur Orientierung heranziehen. [Bisherige technische Abnahme](../kontinuitaet_210/TECHNISCHE_ABNAHME.md) · [Erste Qualitätsstudie](../kontinuitaet_210/QUALITAET.md) · [Neuer Maßstab](../AVERETH_210_GPT_GEGENREVIEW_SPIELFLUSS_KONTINUITAET_2026-11-24.md)

## Zwei überprüfte Startpräfixe

Beide Präfixe stammen aus dem Dokumentationscommit `28f0af45f937d5b7622e7d94f17f96bbb50aa1e0`. Sie enden nach einer abgeschlossenen Erzählerantwort. Die Nachrichtennummern beginnen bei M0 nach der einzelnen JSONL-Kopfzeile. Die Schreibweise „erste 20 Zeilen“ schließt den Kopf und die abschließenden Originalzeilenumbrüche ein. Eine lokale Kontrollfaltung mit beiden gepinnten Engines ergab jeweils null Fehler und den unten angegebenen identischen Weltzustand.

| Einstieg | Letzte aktive Nachricht und sichtbare Gelegenheit | SHA-256 der zu importierenden JSONL-Datei | SHA-256 der kanonisch gefalteten Startwelt |
|---|---|---|---|
| Halloran-Hof | Trust-C nach C7 bzw. M18, Kopf + 19 Nachrichten. Im Regen lädt Dann den Magier ins Haus ein, damit seine Mutter selbst sagen kann, was sie für Tam braucht. Ort `loc.halloran_steading`, anwesend Maren, Dann und Pell. Gelegenheit für Einwilligung, Reise und späteres Wiedersehen. | `81111f6f1d3ebc38e8a710b384dd57bb3d230ac7e1586a2255249b8864901ce1` | `64fb413984e0f0eeca9e3b4b1d5f9e50f5b35679cbef833238f5e67a8cb887e5` |
| Gilde von Alderwatch | User11 nach M10 und vor der ersten Eingabe zum Questboard. Kopf + 11 Nachrichten. Die Schreiberin hat Alaric registriert und den Aushang erwähnt. Ort `loc.alderwatch.guild_hall`, anwesend die bereits gespeicherte Schreiberin. Gelegenheit für Angebot, Annahme und Rückkehr. | `33c35de7372522761c0911b7625688e0aa38a6cba8c0bef15a3f64c3c95d7e17` | `3d19dec71ee56e8398cfd483f418a4bc156d17b69c554843e027aebe20750a6c` |

Die Präfixdateien lassen sich an der Wurzel des Dokumentationscheckouts in einem leeren Arbeitsverzeichnis erzeugen. Beide Arme erhalten dieselbe Datei ihres Paars. Beim Import in den lokalen ST-Chat werden die Nachrichten nach dem JSONL-Kopf mit ihren aktiven `extra.avereth`-Records übernommen. Zum Read-back nach dem Laden erneut die Nachrichten ohne Kopf per `host.foldChat(history)` falten und über den Rückgabewert `state` den SHA-256 von `canonicalJson(state)` aus `avereth-engine/tools/replay/replay.mjs` bilden. Die erste noch ungespielte Handlung wird erst aus der sichtbaren Endszene gewählt. [Halloran-Original](../../testrun_10b/openrouter-20261124-trust-c-208/) · [User11-Original](../../testrun_10b/user-20261124-014928-208/)

```bash
quellenstand=28f0af45f937d5b7622e7d94f17f96bbb50aa1e0
startordner="$(mktemp -d)"
git show "$quellenstand:testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz" | gzip -dc | sed -n '1,20p' > "$startordner/halloran.jsonl"
git show "$quellenstand:testrun_10b/user-20261124-014928-208/originals/chat.jsonl" | sed -n '1,12p' > "$startordner/alderwatch.jsonl"
(cd "$startordner" && sha256sum -c - <<'HASHES'
81111f6f1d3ebc38e8a710b384dd57bb3d230ac7e1586a2255249b8864901ce1  halloran.jsonl
33c35de7372522761c0911b7625688e0aa38a6cba8c0bef15a3f64c3c95d7e17  alderwatch.jsonl
HASHES
)
```

### SillyTavern-Profil je Build

Für beide Arme ist ST 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9` vorgesehen. Ein frisches Profil je Arm verwendet Alaric als Spieler und den vollständigen Narratorvertrag **des jeweiligen Builds** als Description der aktiven Charakterkarte. Der .210-Vertrag trägt tatsächlich die interne Revision .204. Bei .211 lautet sie .211. Die Tabelle nennt SHA-256 über die **unveränderten Dateibytes einschließlich Schlusszeilenumbruch**. Beide Builds liefern bytegleiches Preset und Lorebook. Im geladenen Profil `Avereth Narrator V4` wählen, die Welt `Avereth World Lore v0.14` an die aktive Karte binden und beim Read-back die geladenen Werte mit diesen Quelldateien vergleichen. Die alte Beschreibung einer zuvor importierten Karte würde gerade die getestete Spielregel verfälschen.

| Bestandteil relativ zu `avereth-engine/` | Verwendung | SHA-256 der Quelldatei |
|---|---|---|
| `content/narrator/Avereth_Narrator_Contract_v4.txt` | Nur .210-Referenz, Kartentext .204 | `d82a7cc1d71716a459817eb3568eb1caf348c66944b24e6b5671574492b9fd90` |
| `content/narrator/Avereth_Narrator_Contract_v4.txt` | Nur .211-Kandidat, Kartentext .211 | `afe448ff6e04e8315854e8b698d7620ff87906efd048d094550306ceb298e6a6` |
| `presets/Avereth Narrator V4.json` | Beide Arme, aktives Chat-Completion-Preset | `50aac6f63f44215d58bc9ec502aced7c57e5e236e88e044c73f2fdce32cfd1b7` |
| `lorebook/Avereth_World_Lore_v0.14.json` | Beide Arme, kartengebundenes Weltbuch | `549be5fbc2a70f33f9ac1467d1b0b65bfc076daf5e9430b86afbc0ac769cded4` |

## Zwei Geschichten und ein Wiedersehen

Pro Stand sind zwei unabhängige Geschichten mit jeweils etwa 30–40 erzählten Zügen über mindestens zwei Spieltage vorgesehen. Beide Stände beginnen für jedes Paar mit demselben gespeicherten Präfix, denselben Weltereignissen und derselben ersten Eingabe. Die erste Geschichte beginnt bei Dann auf dem Halloran-Hof. Die zweite beginnt in Alderwatch bei der Schreiberin, bevor Alaric den Aushang zum ersten Mal liest. Es gibt jeweils ein Spielerziel, etwa Hilfe anbieten und später wieder nach dem Ergebnis sehen. Ziele, Wege, Namen, Zeitpunkt der Einwilligung, Gegengaben und das Ende ergeben sich aus dem konkreten Dialog. Eine tote Figur, ein endgültiger Abschied oder ein gelöster Auftrag darf die Geschichte früher beenden. Die Auswertung nennt die fehlenden Beobachtungsgelegenheiten. Nach Möglichkeit beginnt das zweite Paar mit vertauschter Reihenfolge der Builds. Freie Verläufe haben nach der ersten unterschiedlichen Antwort unterschiedliche Grundgesamtheiten.

Vor jedem Zug sieht der Spieler nur aktive Prosa und HUD. Er notiert einen Satz zu Ziel und Grenze, bevor er genau eine Eingabe sendet. Bei mehrdeutiger Begleitung kann er den Vorschlag machen und die Reaktion des Gegenübers abwarten. Wenn dessen Zusage und die erfüllte Zeitbedingung im Text stehen, darf die Geschichte in diesem Zug fortgehen. Ein ausdrücklich aufgeschobener Ausflug, ein verweigerter Gegenstand und ein gefährliches Hindernis haben reale Folgen. Der Beobachter liest Plan, Bericht und Save erst nach Abschluss. Spieler und Beobachter tragen ihre Urteile getrennt ein. Eine Reise zählt als Erfolg erst mit richtigem Ziel, plausibler Gruppe und überlebenden Folgeinformationen. [Früheres serielles Verfahren](../kontinuitaet_209_naturtest/VERSUCHSPROTOKOLL.md)

| Gelegenheit im freien Spiel | Vorher festhalten | Am Zugende und später prüfen |
|---|---|---|
| Gespräch, Hilfe, Weg | Nur Wegauskunft, bedingte Bereitschaft, tatsächliche Zusage, verschobener Aufbruch, begrenzte Etappe oder gemeinsamer Aufbruch. | War die Bedingung erfüllt? Stimmen Stadtteil und Zwischenhalt? Wer begleitete Alaric, wer ging heim? Stimmen die aktiven Personen und Orte nach der nächsten Ortsgrenze und Rückkehr? |
| Bekanntes Gesicht und Wissen | Wer hörte die Vorstellung oder wurde nur erwähnt? Wer sah die Abgabe, welche Namen waren unbekannt? | Nach Abwesenheit von wenigstens fünf Zügen, wenn die Geschichte es erlaubt, dieselbe Person wiedersehen. Persönliches Wissen, gleichnamige andere Person, Versprechen, erfüllte Hilfe, fehlende Zeugen und geheime Informationen getrennt bewerten. |
| Gegenstand | Halter und Menge vor Angebot. Ein zurückgezogener Vorschlag kann ebenso natürlich sein wie eine Leihe. | Im Fall einer tatsächlichen Übergabe dieselbe ID über Annahme, Tragen und Rückgabe verfolgen. Bei geteiltem Proviant Teilmengen und tatsächlichen Verbrauch beider Personen prüfen. Werkmaterial, zwei gleichnamige Werkzeuge und eine ungeöffnete Truhe nur dann werten, wenn sie vorkommen. |
| Gilde, Handel, Risiko | Konkretes sichtbares Angebot, Preis, Geld, Queststatus und Bindungswille. Vor dem Wurf klären, welche Handlung und welches Ziel versucht wurden. | Aushang und Gedächtnis, Zahlung, Warenbestand, HP, MP, Zeit und Queststatus gegen die aktiven Buchungen halten. Ein gescheiterter Wegversuch kann bei erzählter, erlaubter Alternative dennoch zu einer Ankunft führen. |
| Swipe, Edit, Regenerate | Auf einem separaten Klon eines gesicherten Zwischenstands die aktive Revision und ihre Folgewelt sichern. Einen Ort mit Wissens- oder Besitzfolge wählen. | Eine Antwort regenerieren, zum Original zurückswipen, erneut zum Alternativzweig wechseln und späteren Spielertext editieren. Jede Fassung nach Read-back und Reload prüfen. Am Folgeturn nach altem Begleiter, falscher Geldbewegung, doppeltem Objekt und nur im verworfenen Text gelerntem Namen sehen. Jede Neugenerierung zählt ins Folgeauftragsbudget. |

## Vergleichbare Entscheidungen gezielt nachprüfen

Aus tatsächlich aufgetretenen Unterschieden bis zu vier kurze gepaarte Fortsetzungen ab dem letzten gemeinsamen Spielstand bilden. Beide Checkouts bekommen denselben vollständigen Chatpräfix, dieselbe Enginestartwelt und dieselbe vorab protokollierte Eingabe. Narrator, Planner und Extractor dürfen eigene Antworten erzeugen. Folgeeingaben bleiben nur dann wortgleich, wenn sie zu beiden sichtbaren Szenen passen. Andernfalls endet das Paar an der Divergenz. Veränderte Antworten zu demselben Präfix und unveränderte aufgezeichnete Antworten, die offline durch beide Engines laufen, sind zwei getrennte Belege. Neben einem beobachteten Fehler auch einen geeigneten bereits gelungenen Fall wiederholen. Selektierte Kurzpaare belegen keine allgemeine Erfolgsquote.

## Betrieb und Abschlusskriterien

- Frische getrennte ST-1.19-Datenverzeichnisse, feste Engine-, ST- und Modellversionen, gleiche Einstellungen und freigegebenes Denkbudget. Vor dem ersten Modellzug den importierten Start nach Save und Reload per kanonischer Welt und aktiver Chatversion vergleichen. Keine persönlichen ST-Daten verwenden.
- Sämtliche physischen Generationen seriell über denselben Kostenwächter führen, einschließlich Repair, Wiederholung und Swipe. Jeder Request erhält vor dem Versand eine belegbare Budgetreservierung für den maximalen Preis. Bei unklarem Remoteabschluss oder unbestätigtem Save neue Sendungen anhalten. Fehlende Usage gesondert beziffern. Eine verbindliche Obergrenze setzt der spätere Auftrag.
- Vorabsicht, Eingabetext, sichtbare Antwort, Rohantworten, ID und Modellrolle, Provider-Usage, Latenzen, Vor- und Nachsave, Eventreihenfolge, Ablehnungen, HUD und Reloadwelt je Zug archivieren. Schlüssel und Sitzungsgeheimnisse aus den Exporten ausschließen. Kosten pro bestätigter Eingabe, pro erzähltem Zug und pro physischem Request ausweisen. Ein Systemdialog ohne Erzählung bleibt im Eingabenenner.
- Zwei Beobachter beurteilen zunächst ohne Buildkennzeichnung den Spielerwillen und die Plausibilität der Fortsetzung, dann getrennt Welt, HUD und Folgeszene. Streitfälle mit Alternativdeutung erhalten einen eigenen Status. Derselbe Defekt, der fünf Züge mitgeschleppt wird, ist ein Ursprungsfehler mit vier Folgebeobachtungen. Sichtbare Antwort, verlorene Extraktion, falsche Bindung und Missachtung einer harten Grenze separat ausweisen.
- Pro Themenfeld Gelegenheiten, Erfolge, neue Fehler, bereits bekannte Fehler und fehlende Daten berichten. Tabellen mit den vollständigen Paaren ergänzen die Langgeschichten. Ein unautorisierter dauerhafter Geld-/Quest-/Kampf-/Besitzeffekt oder eine nach Reload aktive verworfene Revision sperrt ein positives Freigabeurteil. Geglückte Beispiele für Ankunft, Leihe und Wiedererkennung brauchen eine spätere Bestätigung. Bleibt ein Fall ungesehen, bleibt seine natürliche Wirkung offen.
