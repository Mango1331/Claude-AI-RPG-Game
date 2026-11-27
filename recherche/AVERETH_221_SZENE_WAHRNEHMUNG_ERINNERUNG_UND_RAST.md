# Avereth .221 – Vom Hang zum Türpfosten und zurück zur Gilde

**Technisches GO für den unabhängigen GPT-Diffreview.** Im verketteten Offline-Lauf kann Alaric am Eingang der Mossback Warrens von außen zuhören und hinsehen. Erst sein ausdrücklicher Eintritt öffnet den ersten Abschnitt. Bei seiner späteren Rückkehr in die Gilde enthält der zugestellte Narratorrequest Dammars ursprüngliches Anliegen und Alarics bedingte Fürsprache. Der persönliche Usertest 17 steht aus. [Produktdiff .220 → .221](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/cc327a1ae44b0aac3605f416078c693b2600ffff...a3a46cf8a53336958c4b1535204bccd3485251ea) · [Originale, beide Reviews und Entscheidungsvorlage](../testrun_10b/user-20261126-233937-220/README.md)

## Was die Engine jetzt entscheidet

| Paket | Umsetzung | Mechanische Grenze |
|---|---|---|
| A · Ort und Szene | Der bestehende GO kann als Ziel einen Fokus innerhalb der Szene tragen. Der Planner unterscheidet Standortwechsel innerhalb einer Szene von Reise und Grenzübertritt. World übernimmt einen im Erzähltext belegten, tatsächlich erreichten Standpunkt in `scene.focus`. Ein Ortswechsel verwirft ihn. P, N und X erhalten den Standpunkt beim nächsten Zug. | Die lokale Wahl eröffnet keine Route. Sie löst weder Reisezeit noch Reise-MP aus. Bei gewähltem Schleichen und anwesendem lebendem Beobachter verwendet World den bestehenden vergleichenden Stealth-/Detection-Check. Mechanisch wirksame Deckung und Angriff behalten ihre eigenen Voraussetzungen. |
| B · Search | Die zuvor widersprüchlichen Anweisungen in Planner und Befehlsvokabular unterscheiden gewöhnliches Wahrnehmen von einer unsicheren, folgenreichen Entdeckung. Eine Frage nach Gesellschaft kann als Dialog oder Umschau ohne mechanischen Befehl verarbeitet werden. | Das normale PULSE bleibt möglich. Die bestehende PER-Formel, gezielte Jagd, Erschöpfung einer abgesuchten Situation und freiwillige Partyentscheidung gelten weiter. |
| C · Erinnerung | Der bestehende Thread kann eine Anfrage als `request`, einen später relevanten bekannten Ort als `recall_at` und belegte Spielerworte als `player_words` speichern. Eine neue Zusage hat einen eigenen Gegenstand. Die Erledigung einer früheren Anfrage verwendet deren ID und bewahrt den Wortlaut. Questnotizen und Threadtexte behalten das frühere Ende jenseits von Zeichen 200. | Bei Angabe eigener Vertragsworte prüft World den wörtlichen Beleg und einen beteiligten Anwesenden. Es hält die vollständige Spielereingabe fest, damit auch eine Einschränkung außerhalb des Ausschnitts erhalten bleibt. Die Erinnerung bucht weder Erfüllung noch Wissen Dritter, Bezahlung oder eine Privatquest. |
| D · Rast | Der vorhandene Composer aktualisiert die Raststeuerung zusammen mit dem Speicherstatus sowie bei Eingabe, Aktionsauswahl und Daueränderung. Ein sichtbarer Status am Button erklärt eine aktuelle Sperre. | Der Klick benutzt den nativen Rastpfad. Kampf, ausstehende Verarbeitung, Eingabetext, ein vorbereiteter Zug und eine ungültige Dauer behalten ihre Wirkung. Ein geschlossenes PULSE erlaubt die lokale Buchung. |

Bei einer lokalen Annäherung entfallen Ortsneuanlage, Ankunftsprüfung für ein erfundenes Reiseziel und die nachgelagerte Suche nach einer zusätzlichen freiwilligen Route. Dieselbe Eingabe kann mehrere gewöhnliche Schritte erzählen. Gespeichert wird ihr letzter erreichter Standpunkt. Für Reisen, Hindernisse und geschützte Übergänge bleibt die bisherige Ortsprüfung zuständig. Unabhängige Hinweise nutzen die vorhandene Szenenangabe des einzelnen Deltas. Der X-Auftrag benennt dafür den Ort des Beobachters. Eine abgewiesene Ankunft kann so gleichzeitig mit einem gültigen Hinweis verarbeitet werden. Personen, Beute und Angriffe hinter der Grenze erben diese Berechtigung nicht. [GO und Auflösung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/src/v4/commands.js) · [World](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/src/v4/world.js) · [Extractorvokabular](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/content/deltas.json)

Die kontextbezogene Erinnerung wählt nach anstehendem oder erreichtem Ort und tatsächlich anwesenden Beteiligten. Für eine aktive Quest können die belegten Hinweise auf ihr Ziel und einen beschriebenen lokalen Teil des Weges passen. Beim Wiedersehen mit dem ursprünglichen Gesprächspartner erhält seine Vorgeschichte Vorrang. Am Ort der vereinbarten Fürsprache erhält die offene Zusage Vorrang. Die Auswahl passt höchstens drei vollständige Zeilen in den nach den Pflichtabschnitten verfügbaren Raum, begrenzt auf 16 Prozent des Budgets beziehungsweise 215 geschätzte Tokens einschließlich Überschrift. Die normale allgemeine Retrieval-Liste bleibt verfügbar. Im Rückkehrtest darf sie ganz entfallen, während der kleine private Abschnitt nachweislich ausgeliefert wird. [Auswahl und Budgetierung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/src/context.js) · [Threadereignisse](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/src/threads.js)

## Original und verkettete Gegenprobe

**Unveränderte .220-Referenz.** Auf allen 33 Originalpräfixen und bei vollständig verketteter Verarbeitung stimmen die 19 Eingaben und 14 Extractorabschlüsse mit den Originalrecords überein. Der Eventexport enthält 259 Events. T8 kostet 20 Minuten und scheitert am PER-Wurf. T15 und T16 verbleiben mit fünf beziehungsweise sieben abgewiesenen Meldungen an der Ostfalte. Beide Reviews beziehen sich auf diesen persönlichen Solorun. [Reproduktion der Referenz](../testrun_10b/user-20261126-233937-220/pruefung/replay.mjs)

**Unveränderte Modellantworten auf .221.** Die aufgezeichneten Plannerantworten wählen weiterhin Search beziehungsweise Reise, und die letzten beiden X-Antworten behaupten weiterhin einen Dungeoninnenraum. Die fünf und sieben Ablehnungen lassen sich damit weiterhin reproduzieren. Unterschiede gegenüber den .220-Produktrecords betreffen M14, M20 und M22. Der Produkttest mit den neuen fachlichen Klassifikationen ist davon getrennt. [Original-Gegenreview](../testrun_10b/user-20261126-233937-220/CODEX_GEGENREVIEW.md)

**Angepasste Modellantworten auf .221.** Alle Spielereingaben und Erzählungen bis M38 stammen aus dem Original. Angepasst sind P bei M15, M35 und M37 sowie X bei M20, M22, M36 und M38. Jeder Zug verwendet das neu entstandene Präfix. Die verbleibenden Originalablehnungen in M8, M14, M22 und M24 sind weiter sichtbar. [Ausführbarer Offline-Lauf einschließlich Fortsetzungen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/tools/replay/user16_scene.mjs)

1. Alaric sieht sich in der Gilde um. Die bestehenden Gruppen sind beschäftigt. Er gewinnt weder einen Begleiter noch verliert er 20 Minuten an einen Suchwurf. Zwei anders formulierte Kontaktversuche ergeben mit der entsprechenden Plannerklassifikation ebenfalls einen gewöhnlichen Szenenzug. Das von der Engine gewürfelte Reise-PULSE im Offline-Lauf ermöglicht anschließend Dammars Begegnung.
2. Der Bericht über den Jungen, das Zeichen an der Straße und weitere Rätsel bleiben eigenständig. Dammars ursprüngliche Forderung nach den Sammelrechten bleibt mit seinem Streit mit Wenna erhalten. Die einzige offene persönliche Zusage gilt einem guten Wort, sofern seine Auskunft stimmt. Bei einem nachfolgenden tatsächlichen Bericht an den Clerk erhält dieser die mitgeteilte Information über den Ausguck. Die weiteren Auskünfte und der Hinweis auf den Jungen bleiben offen.
3. T13 erreicht den Zwischenhalt am Hügel. Der äußere Ausguck ist eine tatsächlich anwesende Figur. Der ursprüngliche Flame-Lance-Zug wird auf diesem Zustand verarbeitet. T15 erreicht den Hang beim Eingang und speichert das grüne Leuchten. T16 erreicht den Türpfosten. Die zwei sichtbaren Goblins mit Messer und Steinhammer sowie das Gehörte über Tolmag und die Kette bleiben unterscheidbar. Aus der Erzählung der Goblins entsteht kein bestätigtes Wissen über einen gesehenen Gefangenen.
4. Vom Türpfosten aus halten weiteres Zuhören und Zurückweichen den Außenort. Ein Angriffsversuch gegen die beobachtete Figur ohne erreichbares Kampfziel eröffnet keinen Kampf. Die Gegenprobe mit dem tatsächlich anwesenden Ausguck löst die gewählte schleichende Annäherung über einen echten Check auf. Der ausdrückliche Eintritt erreicht L1/S1. Der weitere Gang um die Biegung erreicht L1/S2 und materialisiert den vorgesehenen Scout-Slot genau einmal mit zwei individuellen Gegnern auf L3 und L4. Die Beobachtung von außen hatte keinen zweiten Satz Kampfgegner angelegt.
5. Nach sechs Zwischenzügen kehrt Alaric zur Gilde zurück. In T24 begrüßt er den bekannten Clerk und fragt nach Neuigkeiten. Seine Spielerworte enthalten keinen Namen Dammars. Die Zusage und Wenna erscheinen im tatsächlichen ST-Prompt. Erst die ausdrücklich erzählte Mitteilung ändert den Wissensstand des Clerks. Beim späteren Wiedersehen mit Dammar sind Wenna und der gemeinsam erlebte Striderkampf abrufbar. An der Stadtgrenze löst das Richten des Kragens keinen privaten Erinnerungsblock aus.
6. Der gemischte Negativfall kombiniert einen falsch gemeldeten Innenraum mit einem belegten Hinweis am Außenort. Nur der Hinweis wird gebucht. Der Save-Roundtrip erhält die Szene. Das Bearbeiten der letzten Erzählung verwirft ihren Standpunkt und Tolmag-Hinweis. Das Wiederherstellen des Originaltexts stellt beide genau einmal wieder her.

## Technische Abnahme und Aufwand

| Prüfung | Ergebnis |
|---|---|
| Vollständige Node-Suite | 3.607 von 3.607 bestanden, keine übersprungen. Darunter frühere Händler-, Unterkunfts-, Begleitungs-, Dungeonrückweg-, PULSE-, Party- und Reise-MP-Fälle sowie Edit, Swipe und Recovery. |
| Historischer Corpus | 2.235 Verarbeitungen. Gegen die historische .126-Referenz sind 1.386 Unterschiede über ihren exakten Fingerprint erklärt. Keine offene Differenz. Gegen den verifizierten .220-Stand ändern sich 82 Records. Bei 50 Questnotizen und 32 Threads ändert sich jeweils genau ein String. Der alte String ist in allen 82 Fällen das identische 200-Zeichen-Präfix. Der Anhang jedes einzelnen Textes ist im Vergleichsfile dokumentiert. [Einzelnachweise](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/tests/replay/accepted_scene221.json) |
| User15 | 108 Originalverarbeitungen. Gegen .220 ändern sich vier Events. M14, M82 und M84 behalten die vollständige Questnotiz mit 217, 284 und 299 Zeichen. M104 behält den vollständigen Thread. Die übrigen 104 Eventfolgen sind gleich. Die bereits auf .220 entfallende aufgezeichnete Reparatur bei M90 bleibt entbehrlich. |
| Isoliertes ST 1.19 | `scene221` 33/33 einschließlich tatsächlicher Übergabe von P/N/X am Eingang, Gildenrückkehr und lokalem Rasten. Separater Speicher-/Revisionslauf `action_saves` 60/60. Zusätzlich wurde M37–38 mit den alten Modellantworten am Originalpräfix wiederholt. Nach erfolgreichem X und Save ist Rasten ohne Reload möglich. Vorbereitete HUD-Auswahl, vorhandener Text und Dauer 0 sperren den Klick. Ein gültiger 30-Minuten-Klick bei geschlossenem PULSE bucht genau einmal und erzeugt null Requests. [Browserprobe](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine/tools/st_live/user16_scene_smoke.mjs) |

Die Bearbeitung der beiden ursprünglichen Annäherungen braucht weiterhin zwei Spielereingaben und je ein P/N/X. Ihr Ergebnis trägt jetzt die anschließende Entscheidung. Im vollständigen Präfix bis M38 bleibt es bei 19 verarbeiteten Eingaben und 42 Modellschritten, davon 11 P, 14 N, 14 reguläre X, ein X-Repair bei M28 und zwei Board-Aufrufe. Ein messbarer Gewinn liegt im erreichten Spielzustand. Eine Einsparung künftiger natürlicher Wiederholungszüge lässt sich aus einem Mock nicht beziffern.

| Zeichen über das gesamte User16-Präfix | .220 Originalantworten | .221 Originalantworten | .221 angepasste Antworten |
|---|---:|---:|---:|
| Planner, Nachrichteninhalt | 580.242 | 582.541 | 582.658 |
| Narrator, nur erzeugter Engine-Kontext | 91.862 | 92.209 | 91.383 |
| Regulärer Extractor, Nachrichteninhalt | 874.621 | 883.760 | 880.558 |
| X-Repair | 66.827 | 67.411 | 67.411 |
| Board | 26.109 | 26.109 | 26.109 |

Gezählt wurden Unicode-Zeichen ohne Transporthülle. Die reale .220-Providersitzung meldet 528.096 Input- und 15.846 Outputtokens. Für .221 liegen Offline-Messungen vor. Die zusätzlichen Angaben im X-Vokabular haben einen messbaren Promptpreis. Es gab keine Erhöhung des allgemeinen Kontextbudgets und keinen zusätzlichen regulären Aufruf. Die Auslieferung wurde im isolierten ST über den lokalen Modellendpunkt geprüft. Die Zahlen für N in der Tabelle sind nur der Engine-Anteil. Providerlatenz und natürliche Antwortqualität der .221 sind offen. [Historische Providerzählung](../testrun_10b/user-20261126-233937-220/REVIEW.md)

Am simulierten ST-Endpunkt umfasste der letzte Annäherungszug 53.326 Zeichen für P, 50.816 für den vollständigen N-Request und 63.141 für X. Für T24 waren es 55.383, 52.338 und 63.242. Der frühere .220-Hosttest derselben Gildenfrage lieferte 52.295 Zeichen an N und ließ Dammars Angelegenheit aus. Die Präfixe spiegeln jeweils den tatsächlich gefalteten Spielverlauf ihrer Variante. Der Browserlauf schreibt die Rollensummen in `user16_scene_wire_sizes.json` der isolierten Testausgabe.

## Produktstand, Reproduktion und Installation

Der bestehende Entwicklungsbranch wurde nach jeder Etappe regulär gepusht und der Remote-HEAD geprüft. Dokumentationsbasis vor Veröffentlichung war `fb008375421d7fc67675a4ebbb4cf3e6f081ec16` auf main. Der abschließende Produkt-HEAD ist `a3a46cf8a53336958c4b1535204bccd3485251ea`. [Gesamter Produktdiff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/cc327a1ae44b0aac3605f416078c693b2600ffff...a3a46cf8a53336958c4b1535204bccd3485251ea)

| Sicherung | Commit |
|---|---|
| D · Raststeuerung | [2d631f4f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2d631f4f6c9cb5676e7fe9147e181d3d8c130f92) |
| B · Wahrnehmung | [6cb437c3](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6cb437c399db803f52e462f0f244797d134abd91) |
| A · Ort, Standpunkt und Beobachtung | [58fbd356](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/58fbd356a0f7455e773c029fc8dfe23decfaff4d) |
| C · Quelle, Zusage und Erinnerung | [b2b6ef4c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b2b6ef4cc7b91427f9cded0431dcab99e92e6f10) |
| Buildmarke .221 | [6275cefd](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6275cefdfab64d660ecaf7c6a617ba472ffc831f) |
| Historischer Einzelvergleich | [1fe2f6cb](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1fe2f6cbd1f55300c22c16d2e96c8b3db4cfd75a) |
| Begrenzter Kontext, vollständiges Spielerzitat und ST-Pfad | [d21c8ab4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d21c8ab40b10638ce403d0db9089644215e4b5bf) |
| Fortsetzung bis zum ersten gebuchten Scout-Slot | [a3a46cf8](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a3a46cf8a53336958c4b1535204bccd3485251ea) |

Zur Wiederholung aus `avereth-engine/` den User16-Runordner des main-Checkouts als erstes Argument übergeben. Der Lauf liest die Originale und schreibt seine beiden synthetischen Präfixe ausschließlich an die angegebenen Ausgabepfade. Im Browser die markierte isolierte ST-Installation verwenden.

```sh
node tools/replay/user16_scene.mjs "$USER16_RUN" /tmp/avereth221-scene.json /tmp/avereth221-guild.json
AVERETH_USER16_CHAIN=/tmp/avereth221-scene.json AVERETH_USER16_RETURN=/tmp/avereth221-guild.json npm run smoke:st:isolated -- --mode scene221
npm test
npm run replay:check
```

**Für die persönliche Installation von .220 auf .221** die laufende Generierung und Speicherung abschließen. Den Inhalt des Produktordners `avereth-engine/` aus dem verlinkten Commit in die aktive Extension kopieren. In einer Benutzerinstallation ist das `SillyTavern/data/<user>/extensions/avereth-engine/`. Bei einer bestehenden globalen Installation die tatsächlich geladene Kopie unter `public/scripts/extensions/third-party/` aktualisieren. [Produktdateien](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/a3a46cf8a53336958c4b1535204bccd3485251ea/avereth-engine) Wer einzeln kopiert, benötigt diese 18 Dateien am jeweils gleichen relativen Pfad:

| Ordner | Dateien |
|---|---|
| Extensionwurzel | `manifest.json`, `package.json` |
| `content/` | `commands.json`, `deltas.json` |
| `src/` | `action_composer.js`, `context.js`, `state.js`, `threads.js`, `util.js` |
| `src/v4/` | `catalog.js`, `commands.js`, `extract.js`, `interpret.js`, `ownership.js`, `planner.js`, `travel_continuation.js`, `turn.js`, `world.js` |

Anschließend SillyTavern neu laden und in der Extensionverwaltung `4.3.0-c.6.6.221` prüfen. Für Character Card, Preset, Lorebook, Narrator Contract und Regex gibt es keine zusätzlichen Installationsdateien. Das persönliche ST-Profil wurde für die Abnahme nicht verwendet.

**Empfehlung für Usertest 17.** Technisches GO nach einem unauffälligen unabhängigen GPT-Diffreview und der Entscheidung des Nutzers.

**Grenzen der Abnahme.** Die semantische Zuordnung einer mehrdeutigen Absicht, die Vollständigkeit eines gehörten Berichts und die Bindung des Beobachterorts hängen weiterhin von P und X ab. Ein Hinweis auf zwei sichtbare Gegner ersetzt kein erreichbares Kampfziel. Früher abgeschnittene Textenden werden beim Laden eines alten Spielstands nicht rekonstruiert. Im persönlichen Test ist besonders auf die erste natürliche Annäherung, die Unterscheidung von Hören und Sehen sowie die spätere selbstbestimmte Erinnerung zu achten. Die Freigabe für diesen Test folgt auf den unabhängigen GPT-Diffreview.
