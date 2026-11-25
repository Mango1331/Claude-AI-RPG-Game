# Avereth .215 – Wer stimmt einer Kapitulation zu?

Der unabhängige GPT-Diffreview hat die Pakete A–G von .214 fachlich bestätigt und einen Autorisierungsfehler gemeldet. Auf dem Entwicklungsbranch korrigiert Build `4.3.0-c.6.6.215` die Bindung zwischen einer Entscheidung, ihrem Urheber und der offenen Gegenleistung. Der kurze unabhängige Kontrollreview und der persönliche Usertest stehen aus. [Produktdiff .214 → .215](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/c2aa5737625f2f0ac0d4db1f5ee794202fd741c2...9a9545523fe142aec7cced1c1176f4b7baca5222) · [Fachbericht .214](AVERETH_214_SURRENDER_COMBAT_NEGOTIATION.md)

## Gegenproben im Produktpfad

Ausgangspunkt war die unveränderte archivierte User13-Vorgeschichte. Der Test spielte Spielertext und gezielt widersprüchliche lokale Modellantworten durch Vorbereitung, Planbindung, Verarbeitung der Narratornachricht, Extraktion und anschließendes Falten des Chats. Auf .214 und .215 standen zu Beginn der vier NPC-Gegenproben drei angebotene Silber im Wert von 30 Kupfer im Spielerbesitz. [Originale und Gegenreview](../testrun_10b/user-20261125-212154-213/README.md) · [Reproduzierbarer Produkttest](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9a9545523fe142aec7cced1c1176f4b7baca5222/avereth-engine/tools/replay/user13_surrender.mjs)

| Narration oder Spielerentscheidung | Beobachtung auf .214 | Ergebnis auf .215 |
|---|---|---|
| Der bezeichnete Sprecher sagt „No deal.“. Der Extractor meldet Annahme. | 30 Kupfer wurden abgebucht. | Das Angebot bleibt offen. Die 30 Kupfer bleiben beim Spieler. |
| Ein Gegner stimmt zu, der zweite schüttelt den Kopf. Der Extractor meldet beide als Teilnehmer. | Die Engine verbuchte eine Einigung mit beiden und zog 30 Kupfer ab. | Die widersprüchliche Extraktion bewegt weder Geld noch Initiative. Eine korrekte Extraktion mit nur dem zustimmenden Gegner verbucht den Teilfrieden. |
| Der Sprecher betrachtet das Angebot nachdenklich. | Die gemeldete Annahme löste die Abbuchung aus. | Der Kampf bleibt am selben Initiativeplatz, das Angebot offen. |
| Der Sprecher lehnt ab. Der Extractor schreibt ihm das „I accept“ des Axtträgers zu. | Die Engine akzeptierte das fremde Zitat und buchte 30 Kupfer ab. | Die Sprecherbindung verhindert den Abschluss. |
| Der Sprecher lehnt eindeutig ab, der Extractor meldet `refuse` mit `members:[]`. | Die Engine verlangte einen zustimmenden Teilnehmer. | Der Beleg speichert die leere Liste. Die reguläre Kampfinitiative führt den nächsten Gegnerzug aus, das Geld bleibt beim Spieler. |
| Gefordert sind drei Silber und Stab. Der Spieler bietet ausdrücklich nur zwei Silber und Stab, der Planner meldet `accept:true`. | Die Engine vollzog die ursprüngliche Forderung. | Der gesamte Spielzustand bleibt auf der offenen Gegenforderung. Das gilt auch nach einem Münzwurf und bei widersprüchlicher freier HUD-Eingabe. |

## Technische Entscheidung

Die Prüfung verwendet die vorhandene Fundstellen- und Redepassagenlogik, den Beleg für tatsächlich erzählte Handlungen und die bestehenden Gegneridentitäten. Sie liest eine begrenzte Menge ausdrücklicher Entscheidungsformen im zugehörigen Satz oder Redebeitrag. Das erlaubt dem Extractor weder ein ausgeschnittenes „accept“ aus einer Verneinung noch die Übernahme einer fremden Zusage. Eine belegte gemeinsame Zustimmung kann die Gruppe binden. Eine im Text belegte Ablehnung eines beanspruchten Teilnehmers sperrt diese Buchung. Der Narrator erhält die knappe Anweisung, die Entscheidung einer erkennbaren Person zuzuordnen.

Bei einer Gegenforderung prüft die Engine die Spielereingabe als Ganzes. Eine ausdrücklich genannte Geldsumme muss zur Forderung passen, auch wenn bereits Münzen am Boden liegen. Die angegebene Herausgabe muss die noch geschuldeten Gegenstände decken. Die explizite Auswahl im HUD und der freie Spielertext nutzen dieselbe Prüfung für widersprüchliche Angaben. Die Buchung erfolgt über den bestehenden Übergabeweg. Neue persistente Zustände, Ereignistypen und reguläre Modellaufrufe waren dafür entbehrlich.

Die Prüfung ist bewusst eng. Ein literarisch angedeutetes oder mehrdeutig zugeordnetes Ja kann die vorhandene Extraktionsreparatur auslösen. Bleibt der Beleg unklar, bleibt auch die Entscheidung offen. Wie häufig das im natürlichen Spiel vorkommt, ist eine Frage für den persönlichen Usertest.

## Abnahme und Übergabe

- Auf dem Kandidaten bestanden elf gezielte NPC-Fälle und sechs widersprüchliche Planner-Antworten. Geprüft wurden auch ein verkürztes Belegzitat, ein ausdrücklicher Gruppenentscheid und ein individuelles Veto. Die negativen NPC-Fälle vergleichen den gesamten gefalteten Zustand bis auf den erwarteten Extraktionsfehler.
- Die bisherigen User13-Prüfungen für Angebot, Münzwurf, Stab, separaten Beutel, Teilfrieden, wirksame Kampfwerte, Wiedereinlesen, Edit und Swipe bestanden. Historische Spielertexte und das tatsächliche Ultimatum M20 stammen aus dem Archiv. Die simulierten positiven Dialoge benennen jetzt den Sprecher. Auch bei der simulierten reduzierten Forderung gehört der Betrag zu seinem eigenen Redebeitrag.
- 70 bestehende Node-Regressionen zur Finanzbelegprüfung und zum Revisionsverhalten bestanden. Der historische Vergleich umfasste 2.235 Fälle. Alle 1.193 Abweichungen vom alten Basisbuild entsprachen exakt den bereits akzeptierten Ausgaben. Es gab keine neue Abweichung. Fingerprints und Vergleichsliste blieben auf ihrem bisherigen Stand.
- Alle Modellantworten der Abnahme kamen aus lokalen Testdaten. Hostanbindung und HUD-Oberfläche hatten keinen Diff. Die isolierte Browserabnahme gehört zu .214. Für den persönlichen Test genügt die aktualisierte Engine-Extension vom Entwicklungsbranch.

Im Verzeichnis `avereth-engine` lässt sich die Gegenprobe mit dem Pfad zum entpackten Originalchat auf `main` wiederholen.

```sh
node tools/replay/user13_surrender.mjs "$USER13_CHAT"
node --test tests/v4/fix{138,142,143,144}_finance.test.js tests/v4/continuity211_revisions.test.js
npm run replay:check
```
