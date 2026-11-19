# B1 · Einzelslotreparatur für das Gildenboard in Avereth .203

**Entscheidung vom 19.11.2026 — bedingtes GO für einen gesonderten Implementierungsversuch.** In drei persönlichen Läufen ließ sich der abgewiesene Einstiegsslot bereits aus der ersten Antwort bestimmen. Der Ersatz aus der jeweiligen zweiten Vollantwort ergab mit den vier ursprünglichen Angeboten exakt die veröffentlichte Tafel. Die drei Rekonstruktionen belegen die Buchbarkeit und den geringeren Antwortumfang. Ob das Modell einen einzelnen Ersatz zuverlässig in dieser Qualität liefert und wann die Questwahl am Bildschirm erscheint, bleibt offen. [Prüfcode][probe] · [Tokenmessung][tokens]

## Originalfälle und Buchungen

Für jede Zeile wurde der Originalchat bis unmittelbar vor Nachricht I11 gefaltet. Alle drei Faltungen waren fehlerfrei. Der archivierte Plannerbefehl führte über `boardFor` im C-Profil zu einer neuen Novice-Tafel für Tag 1 mit fünf freien Plätzen. Geprüft wurde in einem separaten Checkout des unveränderten Entwicklungsstands `5e5b827`. Für die Vollreparatur erhielt das echte `generateBoard` nacheinander die beiden archivierten Antworten. Für den zweiten Vergleich wurden ausschließlich die vier rohen JSON-Objekte aus dem Erstentwurf und das Ersatzobjekt aus der gültigen Vollantwort verwendet. [Runtime][runtime] · [Validator und Buchung][guild]

| Original und physische Boardrequests | Erster Entwurf, Urteil von .203 | Ersatz aus zweiter Vollantwort | Vollrepair / zusammengesetzte Tafel |
|---|---|---|---|
| User04 · .159 · Alderwatch · Nr. 12/13 | 4/5. Slot 1 „Boar Problem at the Millrace Fields“. Der Anker `boar` überschreitet die Stärkegrenze des Einstiegsgegners. | „The Millrace Viper“, `serpent` | 5/5 in beiden Armen, identische zehn Events |
| User05 A · .202 · Glassmere · Nr. 11/12 | 4/5. Slot 4 „Take the Snapper at Miller's Weir“. `aquatic` widerspricht dem Körperbau des „snapping eel hound“. | „Kill the Stray Hound of Tanner's Row“, `wolf` | 5/5 in beiden Armen, identische zehn Events |
| User06 · .203 · Ashbridge · Nr. 11/12 | 4/5. Slot 1 „Take the Pike That Took the Mill Pond“. Der Anker `aquatic` erfüllt die Schwelle von höchstens 35 HP und 10 ATK für den Einstieg nicht. | „Slay the Marsh Adder of the Eel Weirs“, `serpent` | 5/5 in beiden Armen, identische zehn Events |

Jede zweite Originalantwort änderte als strukturiertes JSON genau den bezeichneten Slot. Für die Buchung wurden auch die archivierten Ereignisse unmittelbar vor der Veröffentlichung angewandt, einschließlich `turn.begun`. Pro Tafel stimmten vier `place.created`, fünf `quest.created` und ein `board.refreshed` in Inhalt und Reihenfolge mit dem Originalchat überein. Beide .203-Arme ergaben tiefengleiche Folgezustände. Damit stimmen auch Quest-IDs, Aushangreihenfolge, Auftraggeber, Vergütung, Vertragstexte, Ziele und Populationen. Alle Tafeln haben vier Jagden, keine Lieferung und eine Clearance. Die Questlevel in Aushangreihenfolge waren **1/5/10/13/3**, **4/9/13/1/1** und **1/5/9/13/3**. [User04][u4] · [User05][u5] · [User06][u6]

## Wann lässt sich ein Slot lokalisieren?

`parseBoard` meldet bei einer fachlichen Ablehnung Titel und Grund. Der Offlineversuch verlangt exakt fünf ursprüngliche Positionen, vier akzeptierte Listings, genau eine Ablehnung, einen eindeutigen Titel und keinen Schemafehler. Er prüft den Kandidaten nochmals allein mit demselben Parser, Spielstand und Boardbedarf. Nur wenn dieselbe Ablehnung bestehen bleibt, gilt ihre Ursache als lokal. Die vollständigen Quoten prüft der Validator erst bei voller Besetzung. Die Einzelprüfung genügt daher ausschließlich zur Wahl des Reparaturversuchs. [Prüfcode][probe] · [Validator][guild]

| Gegenprobe an allen drei Originalzuständen | Beobachtung und Konsequenz |
|---|---|
| Unlesbares Gesamt-JSON, fehlendes Pflichtfeld, vier Listings, zwei fachlich ungültige Listings oder mehrdeutiger Titel | Kein eindeutiger Slot. Bei zwei fachlichen Fehlern blieben drei gültige Angebote. Als zweiter Versuch ist ein Vollrepair begründet. |
| Anderer Titel für dasselbe Jagdziel oder zwei Dungeon-Clearances | Der geordnete Validator weist das später geprüfte Angebot zurück. Beide Angebote für sich bestehen diese Prüfung. Die Reihenfolge bestimmt keinen fachlichen Verursacher. |
| Einstiegsquest mit Habitatfenster 4–7 | Die einzelne Ablehnung bleibt reproduzierbar. Ein Ersatz mit unpassendem Fenster scheitert an der Gesamtprüfung. |
| Fünf einzeln plausible Angebote, aber kein Einstieg, kein mittlerer/oberer F-Bereich oder keine Clearance | Der vollständige Validator lehnt die Tafel ab. In einer weiteren Gegenprobe verdeckte ein lokaler Fehler in der Erstfassung die fehlende Mitte bzw. Oberstufe. Selbst der archivierte gültige Ersatz konnte diese Tafel nicht retten. |
| Falsche Slotnummer, vollständiges Board als Ersatz, dupliziertes Jagdziel oder entfallender Einstieg im Ersatz | Der Versuch liefert keine freigegebenen Listings. Im gezählten Offlinepfad endet ein fehlerhafter Ersatz nach der zweiten Antwort. |
| Gültiger Erstentwurf, zweimal fehlerhafter Vollentwurf, erneutes Lesen am selben Tag | Der unveränderte Generator nahm die gültige Kontrollantwort beim ersten Aufruf an und beendete zwei Fehler mit leerer Ergebnisliste. Für eine bereits veröffentlichte Tagestafel lieferte `boardFor` keinen Bedarf. Der gezählte Wiederlesepfad verbrauchte null Antworten. |

## Umfang des zweiten Requests

Die Originalspalten enthalten die Usage und die gemessene Zeit der **zweiten** physischen Anfrage. Für den Slotentwurf wurden der .203-Regel- und Ortskontext beibehalten, die vier fixierten Ziele mit Position, Titel, Level und DEFEAT-Objektiv angegeben und genau ein vollständiges Listing angefordert. Das Offlineformat lautet `{"slot":n,"listing":{…}}`. Es enthält weiterhin Auftraggeber, Preis, Text und sämtliche Vertragsfelder. Die alternative Antwort stammt aus dem Archiv. Für den Umfang wurden beide Ausgabeformen gleich kompakt serialisiert. [Promptbeispiel im Prüfcode][probe] · [Tokenizer und Chattemplate][hf]

| Fall | Originaler Zweitaufruf, Input / Completion / Dauer | Input im Slotentwurf | Kompakte Inhaltstokens voll → Slot | UTF-8-Bytes voll → Slot |
|---|---:|---:|---:|---:|
| User04 | 3.949 / 1.188 / 8,492 s | 2.976 (−973) | 941 → 172 (−769) | 3.515 → 618 |
| User05 | 3.759 / 926 / 55,133 s | 2.969 (−790) | 922 → 176 (−746) | 3.380 → 649 |
| User06 | 3.905 / 1.082 / 58,600 s | 2.986 (−919) | 878 → 192 (−686) | 3.299 → 682 |

Der gepinnte GLM-Tokenizer mit Chattemplate reproduzierte alle drei natürlichen Inputzahlen exakt. Die sichtbaren Original-Antworttexte einschließlich ihrer Formatierung zählten 1.128, 924 und 1.057 Tokens. Die Completion-Usage des Providers ist eine eigene Messgröße. Für die drei neuen Promptentwürfe liegen nur lokale Tokengrößen vor. User06 wartete **55,691 + 58,600 = 114,291 Sekunden** auf die beiden ursprünglichen Boardrequests. Der Erstaufruf bleibt erforderlich. Für den Slotaufruf fehlen Messungen zu Erfolg, Cache und Latenz. User04 hatte im Vollrepair 2.821 gecachte Inputtokens, User05 und User06 jeweils null. Aus 686–769 weniger Inhaltstokens ergibt sich daher keine belastbare Sekundenprognose. [Natürlicher .203-Lauf][u6perf] · [Tokenmessung][tokens]

## Kleinstmöglicher späterer Eingriff

1. Den bestehenden zweiten Versuch in `generateBoard` verwenden. Zunächst auf neue Fünfer-Novice-Tafeln im Profil `count_hunt_clear` und den nachgewiesenen lokalen Einstiegshunt begrenzen. Position als Prüfdaten der bestehenden Iteration mitführen. Eindeutige Zuordnung und unabhängige Einzelablehnung verlangen. Bei struktureller oder übergreifender Ursache den bestehenden Vollrepair wählen. Ein zusätzlicher Modellklassifikator ist entbehrlich.
2. Im Slotrequest die Fehlermeldung, die fehlende Rolle und die vier belegten Positionen mit Ziel und Ort nennen. Die fachlichen Regeln und den lokalen Gildenkontext aus dem Erstrequest übernehmen. Die Kreativität für den Ersatz bleibt bei Titel, Auftraggeber, Art, Ort und Belohnung erhalten.
3. Die vier Originalobjekte und ihre Reihenfolge an denselben Boardbedarf und Spielstand binden. Eine Antwort für eine andere Position, einen überholten Stand oder ein anderes Format verwerfen. Erst bei vollständiger Prüfung aller fünf Listings buchen. Scheitert Versuch zwei, greift der bestehende Fehlerpfad. Ein bisheriges Board bleibt erhalten, und aus der Teiltafel entstehen keine Quests.
4. Vor einer späteren Aktivierung neue, unabhängig erzeugte Slotantworten gegen Vollrepairs vergleichen. Maßgeblich sind valide Gesamtboards innerhalb zweier Requests, mechanisch verschiedene Ziele, stimmige Auftraggeber und Habitate sowie die Zeit bis zur vollständigen Questwahl. Bei mehreren vertretbaren Austauschpositionen oder verletzter Gesamtquote kann eine neue, als Ganzes abgestimmte Tafel bessere Vielfalt und Konsistenz bieten. Die drei selektierten Einstiegsjagden erlauben keine Aussage zur Erfolgsquote anderer Ränge, Profile oder Refills.

## Reproduktion

Testbranch `experiment/203-board-slot-offline-b1` bei `71b1a4461680b89a68ebf61181ee726e15dfd833`, direkt auf `5e5b8272412b51b91f75b6e37c5b94d95c9fae11`. Die Datenquelle war `main` bei `9351e740abd7cae73ee717a155d165788dde621e`. Im Testcheckout wurden die drei Originalreproduktionen, die Gegenproben und **139/139** bestehende Board-/Gildentests ausgeführt. Der Testcode liest die Originalarchive und ruft alle Enginefunktionen offline auf. Der bestehende Produktionspfad war identisch zur Vergleichsbasis. [Testcommit][commit] · [Originale und Forschungsgrundlage][research]

```sh
cd avereth-engine
node tools/board_slot_offline.mjs "$MAIN_CHECKOUT"
node --test tests/v4/*board*.test.js tests/v4/*guild*.test.js
node tools/board_slot_offline.mjs "$MAIN_CHECKOUT" --token-samples |
  python3 tools/board_slot_tokens.py "$TOKENIZER_JSON" "$CHAT_TEMPLATE"
```

Für die optionale Tokenzählung wurden `tokenizers==0.22.2`, `Jinja2==3.1.6` sowie die nach SHA-256 geprüften öffentlichen Tokenizer- und Template-Dateien verwendet. Es wurde kein Modell aufgerufen. [Gepinnte Dateien][hf]

[probe]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/71b1a4461680b89a68ebf61181ee726e15dfd833/avereth-engine/tools/board_slot_offline.mjs
[tokens]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/71b1a4461680b89a68ebf61181ee726e15dfd833/avereth-engine/tools/board_slot_tokens.py
[commit]: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/71b1a4461680b89a68ebf61181ee726e15dfd833
[runtime]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/runtime.js#L587
[guild]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/src/v4/guild.js#L917
[hf]: https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c
[u4]: ../testrun_10b/user-20261106-072640/README.md
[u5]: ../testrun_10b/user-20261118-011503/README.md
[u6]: ../testrun_10b/user-20261119-010838/README.md
[u6perf]: ../testrun_10b/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md
[research]: AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md
