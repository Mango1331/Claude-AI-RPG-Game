# Batch23 – unabhängiger Originalreview auf Build .149

**Stand: 02.11.2026 · Sol · ausschließlich Analyse.** Produkt: [b7b30d0](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b7b30d0b763a4142a821d335e250dfbc4c3c8b4a), Build 4.3.0-c.6.6.149. Alle drei Exporte nennen diesen Commit und einen sauberen Arbeitsbaum.

## Grundlage und Grenzen

Original: Chatupload `batch-20261101-232944Z.zip`, 111.343.899 Bytes, SHA-256 `7702cae7baa17c65bc3296aff3f6f98a5a63e8476134d1dd849884dfc785b9c2`; ZIP-CRC fehlerfrei. Die ZIP ist **mit diesem Review nicht nach Git hochgeladen**. Eine spätere unabhängige Prüfung benötigt den Originalupload oder eine gesonderte Archivierung. Auf main lag zum Prüfzeitpunkt noch kein GPT-Review dieses Batches; dies ist eine eigene Originalprüfung.

Ausgewertet: Chat, sämtliche persistierten Events, Zustände, Spielerinputs, Modellrequests/-antworten, Runner-Endgründe und Logs aller drei Profile. Ereignisexport und Chat stimmen an sämtlichen 1.118 exportierten Eventrecords überein. Alle Chats unabhängig mit dem .149-Produktcode gefaltet, zusätzlich Zustandsvalidierung nach jedem Eventrecord. Zwei entscheidende Originalübergänge mit unverändertem Code und tatsächlichem Vorzustand über `applyWorld()` erneut ausgeführt. Keine Produktänderungen, neuen Tests, vollständigen Testsuiten, ST-Smokes oder natürlichen Läufe.

**Notation:** T = tatsächlich gesendete Spielerinputnummer des jeweiligen Runners; I = nullbasierter Chatindex ohne Export-Metadatenzeile. I ist kein einzelner Eventindex. Pfade im Folgenden relativ zu `avereth-engine/`.

## 1. Ergebnis

| Profil | Spielerinputs / Enginezüge | Ende | Level 15 / E-Annahme | Geschlossene Kämpfe | Zustand nach Fold |
|---|---:|---|---|---:|---|
| Warrior | 375 / 333 | regulär abgeschlossen | T370 / T375, Bulwark Vanguard | 35: 34 Siege, eine PC-Flucht | keine Foldfehler; ein ungültiger Ortsfakt; zusätzlich falsche Dungeon-Ortsidentität |
| Mage | 40 / 36 | repeated_model_failure T40 | nein, L2 | ein Sieg | keine Fold-/Validierungsfehler |
| Rogue | 216 / 180 | regulär abgeschlossen | T213 / T216, Needle-Eyed Duelist | 14 Siege | keine Fold-/Validierungsfehler |

**631 Inputs, 549 Enginezüge, 8.691 Events, 50 geschlossene Kämpfe, kein Tod.** Zwei tatsächliche E-Klassenannahmen sind ein Fortschritt. Zwei abgeschlossene Profile sind aber nicht zwei integritätsfehlerfreie Profile: Der Warrior läuft trotz beschädigter räumlicher Bedeutung weiter.

Keine Browser-PageErrors in den drei Exporten. Der Mage-Endgrund ist weder ein manueller Stopp noch Tod. Eine neue Quote für 10B lässt sich aus diesem einzelnen Batch nicht belastbar festlegen.

## 2. Technische Befunde und Ursachen

### P1 – Warrior: bekannter Dungeon zerfällt in verschiedene Ortsidentitäten

**Originalkette:**

| Stelle | Tatsächlich gespeichert |
|---|---|
| T20–22, I39–44 | CLEAR-Vertrag und regulärer Living Dungeon `loc.mossback_warrens`; Eingangsgalerie darunter, kanonische Slotgegner |
| T26, I51 | Flucht nach einem besiegten L5-Goblin; der Dungeon ist nicht vollständig geräumt |
| T37, I73 | Spieler verlässt das Gasthaus Richtung bekannter Mossback Warrens. Planner nennt zuerst die bereits besuchte Eingangsgalerie korrekt per ID. Schema lehnt diese ID ab; Repair ersetzt sie durch `{new:"the Mossback Warrens"}` |
| T37, I74 | Narrator schildert die Reise zum Steinbruch und in die Warrens. Extractor meldet die neue Eingangsgalerie mit `parent:null`. Engine hängt sie unter das bisherige Gasthaus, klassifiziert dessen Wurzel als Dungeon und erzeugt **Living Dungeon Painted Boar inn** |
| T58, I116; T69, I138 | Weiterer Ort `loc.duskreach.mossback_warrens_mouth` und neue Innenräume; dies ist wiederum nicht der ursprüngliche Quest-Dungeon |
| T83, I166; später I172/I478 | Erzählte Räumung/READY-Hinweise beziehen sich auf Goblinverhandlungen oder weitere Kämpfe. Für den eigentlichen Vertrags-Dungeon fehlt das autoritative Floor-Clear |
| T191, I381 | Gildenabgabe verweigert: tatsächlicher Mossback-Level nicht geräumt. Die 60 cp werden nicht unberechtigt ausgezahlt |

**Am Originalvorzustand I74 erneut reproduziert:** `place.created` unter dem Gasthaus, `place.updated` des Gasthauses mit `dungeon.real:true`, `scene.moved` in dessen neuen Unterraum und `dungeon.established` für das Gasthaus; **keine Ablehnung**.

**Ursachenkette, nicht nur falscher Extractorname:**

1. `v4/catalog.js:catalogPlaces()` filtert fremde Dungeonräume und bevorzugt nahe Dungeons. `v4/planner.js:plannerUser()` zeigt dagegen RECENT ROUTE mit der alten Eingangsgalerie und fordert deren Verwendung.
2. `v4/interpret.js:catalogIds()/interpreterSchema()` lässt nur HERE/PLACES als Orts-IDs zu. Die im selben Request beworbene Route-ID ist nicht zulässig. Der gespeicherte Repairhinweis lautet `.to: matches none of anyOf`. Die erste semantisch richtige Antwort wird dadurch verworfen.
3. Die vage neue GO-Referenz verliert die kanonische Dungeonbindung. `world.js:resolvePlace()` (ab Z140) setzt einen fehlenden Parent auf `s.scene.at`. Die neue Galerie wird deshalb ein Gasthaus-Unterraum.
4. `dungeonClass()` (ab Z2209) nimmt `trueDungeonOf || complexOf || place` als Wurzel. `dungeon.js:complexOf()` steigt durch Innenräume zum Gasthaus. Das wird ohne passenden Wurzelnachweis zum echten Dungeon; anschließende Living-Synchronisierung erzeugt eine separate Population.

Das ist **Klasse B**, räumliche und populationsbezogene Integritätsverletzung trotz fortsetzbarem Run. Ein strukturell gültiger Ortsbaum kann fachlich falsch sein; `validateState()` findet diesen Fall nicht. Die richtige Questabschlussprüfung verhindert eine Folgefehlzahlung, heilt aber den falschen Dungeon nicht.

**Empfohlene begrenzte Korrektur:** Beworbene bekannte Reiseziele und das tatsächlich zulässige Referenzschema konsistent machen; die bekannte Dungeonwurzel bei GO/Ankunft erhalten. Eine externe Dungeonankunft mit ungeklärtem Parent darf nicht ausgerechnet die bisherige Unterkunft umklassifizieren. Vorhandene Orts-/Dungeonidentität und GO-Autorität verwenden, keine Ortsnamen-Regexsammlung und kein neues Spawnsystem. Nicht sämtliche Räume weltweit unbesehen ins Schema aufnehmen: bestehende Sichtbarkeits-/Geheimnisregeln erhalten; Rückkehr nötigenfalls auf die bekannte Dungeonwurzel führen.

Abnahme: I73/I74 im Verbund; erneuter Besuch desselben Dungeons, keine neue Gasthaus-Population; dessen regulärer Slot-/Guardian-/CLEAR-Weg. Kontrast: wirkliche neue Höhle, wirkliche Räume eines Gasthauses, unautorisierte Reise und verborgener Raum.

### P1 – Mage: richtige verbindliche Endsumme wird als Stückpreis verworfen

**T36/I72** ist weder eine unklare Spielerformulierung noch ein nur angekündigter Preis:

> “Six silver, then — six silver the pair, the fang and the sac both, paid now.”

Extractor: fester BID über **60 cp**, Fang×1 und Venomsac×1, `pricing.basis:"total"`, `quote:"six silver the pair"`, keine offene Bedingung. Trotzdem keine Offerte: `unit_price_as_total`.

**Mit dem tatsächlichen Vorzustand und unverändertem .149 über applyWorld reproduziert.** Direkte Belegprüfung ergibt `state:"contradicted", rate:", the fang"`. Derselbe Geldbeleg ohne Warenwortliste ergibt verifiziert 60 cp; das dient nur zur Lokalisierung, **nicht** als Lösung durch Abschalten der Sicherung.

`finance_evidence.js:moneyLiteral()/moneyRanges()/rateAfter()/priceEvidence()` (insbesondere Z146–188): Der Literalpfad liefert als Geldspanne hier das gesamte Preiszitat. Die Stückpreisprüfung beginnt hinter dessen Ende, also hinter „pair“. Das folgende **„, the fang“** passt auf das Muster `the <goods noun>` und wird zum Stückpreisbeleg. Eine Aufzählung dessen, was zum Gesamtlos gehört, wird damit als Rate missverstanden.

**Vorher/nachher getrennt beurteilen:**

- T35/I70: Teilepreise und bedingte sechs Silber, kein vollständiger bindender Gesamtbeleg; Nichtbuchung vertretbar.
- **T36/I72: vollständiger fester Gesamtpreis; Nichtbuchung ist falsch.**
- T37/I74: andere Teilpreise, nicht wörtlich belegte Gesamtquote; erneute Sicherheitsablehnung vertretbar.
- T38/39: danach tatsächlich ungültige Plannerantworten.
- T40: Extractor-Transport/Providerfehler; danach technische Runner-Stoppregel.

Keine Doppelzahlung und kein Verlust der beiden Gegenstände gefunden. Das ist ein **reproduzierbarer Integrationsblocker**, der eine normale, nach S2 ausdrücklich zulässige Transaktion verhindert. Er trägt zur Schleife bei; dass allein sein Fix jede spätere Modellstörung verhindert hätte, ist nicht beweisbar.

**Empfehlung:** Geldspanne und Preiszitatspanne sauber trennen und den Stückpreisnachweis an die tatsächliche Geldangabe binden. Eine anschließende Warenaufzählung ist nicht automatisch eine Einheit. Den vorhandenen S2-Endpreisvertrag und die echte Stückpreissperre erhalten. Keine neue Finanzarchitektur, zusätzliche allgemeine Spracherkennung oder Sonderliste für dieses konkrete Fang/Sac-Paar.

Abnahme: genau I72 über World bis BID/Annahme/60-cp- und Eigentumsbuchung, unterschiedliche korrekte Zitatlängen, echter Stückpreis ohne Endsumme, bedingtes Gebot und doppelte Annahme.

### Mage-Stopp: zusätzlich echte Modell-/Providerfehler, keine bewiesene Reasoning-Erschöpfung

T38/I75 und T39/I77: Planner scheitert einschließlich Repair; einmal u. a. falscher Kommandoschlüssel `command` statt `type`. T39-Repair Call111 ist ohne Antwort archiviert.

T40: Extractor Call115 ohne archivierte Antwort; Recovery Call116 nach 118.169 ms mit HTTP200-Fehlerobjekt `code:"no_output"`. Gesamter Extractorweg rund 238 Sekunden. Der Runner beendet nach dem dritten Modellfehler ohne mechanischen Fortschritt.

**Kein `finish_reason:length` im gesamten Batch.** Alle archivierten regulären Antworten enden mit `stop`. Darum keine Diagnose „Reasoningbudget ausgeschöpft“. Null-Antworten belegen auch nicht automatisch deren konkrete Infrastrukturursache.

Die Engine versiegelt den gescheiterten Schritt; keine doppelte Engineaktion. Die Stoppregel in `tools/st_live/live/run_live.mjs` (Z387–414) greift wie programmiert. Sie einfach abzuschalten oder die Versuchszahl zu erhöhen würde den ursprünglichen Verkaufsblock nicht beheben. **Klasse C** am Ende; beitragende Engine-Fehlablehnung und spätere Modell-/Providerfehler getrennt zählen.

Warrior T153 und Rogue T205 haben ebenfalls einzelne fehlende Extractorantworten, laufen nach Recovery jedoch weiter. Beim Rogue wird eine gültige leere Extraktion übernommen. Das sind tatsächlich fortgesetzte Recoveries, kein neuer kompletter Runabbruch.

### P2 – Warrior: Ortsfakt über eine nicht existierende ID

Ab **T316/I632** dauerhaft ein Validierungsproblem:

- tatsächlich existiert `loc.otterhound_holt_under_the_leaning_alder`;
- Fact verwendet `loc.otterhound_holt_under_the_leading_alder`;
- Predicate `quiet`, Inhalt eine atmosphärische Beschreibung der ruhigen Höhle.

`world.js:missingEntityRef()` Z404 prüft `npc./mon.`, jedoch keine Orts-IDs. `case fact` lässt die falsche konkrete Ortsreferenz passieren. `validate.js` Z139 verlangt dagegen, dass solche `loc.`-Subjekte existieren.

Keine direkte Geld-, Kampf-, Bewegungs- oder Questverfälschung durch diesen einzelnen Fakt nachgewiesen. **Lokaler Persistenzfehler mit formal ungültigem Zustand**, erheblich kleiner als die Dungeonverwechslung. Kein Anlass, den gesamten Run wirtschaftlich für unbrauchbar zu erklären. Bestehende konkrete Referenzprüfung sollte konsistent sein; weder neue Orte aus Tippfehlern anlegen noch freie narrative Fakttexte verbieten.

Der Runner validiert den vollständigen Zustand derzeit bei Start bzw. vor Fortsetzung versiegelter Modellfehler; gewöhnliche erfolgreiche Züge nicht durchgehend. Deshalb endet dieses Profil als `done`. `done` darf im Review nicht als Integritätsbeweis verwendet werden. Eine künftige GM-Korrektur wäre separat freizugeben und kein bereits vorhandener Reparaturnachweis.

## 3. Narrations-/Spielerschleifen und korrekt schützende Ablehnungen

**Rogue T68–74:** Narrator etabliert einen „mineral slime“, den die Dungeon-Slots nicht enthalten. World weist die zusätzliche Population mit `dungeon_foe` zurück. Vier Angriffsversuche über Piercing Thrust/Basic Attack finden folgerichtig keinen gebuchten Gegner; Ressourcen werden nicht verbraucht. Zwischenzeitliche Beobachtung/Berührung lässt die Erzählung die Kreatur weiter behandeln. T75 verlässt der Spieler den Bereich; im nächsten regulären Raum erscheinen vier Slotkäfer.

Das ist eine **Klasse-A-Schleife mit spürbarer Reibung**, keine falsche Schadensberechnung und kein Grund, Dungeon-Firewalls zu lockern. Narrator ignoriert die Zurückweisung; Testspieler reagiert mehrfach auf Prosa statt auf den sehr deutlichen Systemhinweis „no targetable actor“. Ein menschlicher Spieler könnte früher weiterziehen. Der Runner besitzt bereits Regeln dazu; aus diesem einen Verlauf folgt kein Bedarf für ein weiteres langes Bedienhandbuch.

Auch falsch gewählte Reichweiten führen korrekt zu Ablehnungen: Rogue T76 versucht Fan of Blades über dessen Reichweite, korrigiert danach die Distanz. Kein Bug.

Warriors langes Festhalten am CLEAR-Auftrag ist **nicht** ausschließlich schlechte Testerbedienung. Der sichtbare Dungeon wurde tatsächlich unter anderen Ortswurzeln verbucht; spätere korrekte Abschlussverweigerungen wirken dadurch rätselhaft. Gleichzeitig verstärken erneute Einzelraumkämpfe, Versorgung und lange Gespräche den Zeitbedarf. Nicht jeden seiner 375 Inputs der Engine zurechnen.

## 4. Finanz-, Gear- und Questnachweise

**49 gespeicherte Transaktionen:** 30 Käufe inklusive drei Registrierungen, acht Loot-/Altgearverkäufe, elf Gildenabgaben. Keine identische Angebots-/Positions- oder Questtransaktion doppelt gefunden. Start jeweils 50 cp; gebuchte Deltas ergeben exakt die Endguthaben Warrior340, Mage39, Rogue374 cp. Das ist ein Konsistenznachweis der Aufzeichnungen, kein Beweis für die Semantik jedes einzelnen optionalen Geschäfts.

- **Mage:** Registrierung20, erfolgreiche frühere Lootveräußerung30, Quest35, Fine-Lederrüstung56 cp. Kaufen und Verkaufen sind also auch in diesem Profil nicht grundsätzlich kaputt.
- **Warrior:** u. a. Fine-Mail72, später Fine-Schild56 (T293), Fine-Langschwert140 (T349), Superior-Mail88 (T351). Waffenupgrade sehr spät; sinnvoll für Pacingbeobachtung, nicht allein ein Preis-/Guidefehler.
- **Rogue:** Common-Lederrüstung48 (T100), vollständiger Zweiartikelkauf Fine-Dolch + Superior-Light-Armor **212 cp** (T153), Superior-Dolch260 (T202); Lootlose22 und102 cp erfolgreich.
- Gildenabgabe außerhalb der Ursprungsstadt funktioniert: Rogue Grotto-CLEAR in Thornmill, Wolfauftrag in Alder Mill.
- Die zwei frühen Fisher-Cat-Verträge werden nach **verschiedenen** Tötungen abgeschlossen. Der zweite wird erst nach dem ersten Abschluss veröffentlicht/angenommen. Hier kein Beleg für doppelte Auszahlung desselben Kills.
- Tatsächlicher Rogue-Dungeonabschluss: `dungeon.floor_cleared` I231, spätere Abgabe I256. Beim Warrior-CLEAR fehlt dieses Ereignis für die richtige Wurzel; keine Auszahlung ist folgerichtig.

Kein neuer `#pay`-Edit-/Swipefehler oder Windows-EPERM aus diesem Batch nachgewiesen. Keine entsprechende Behauptung eines neuen realen Windows-Recoveryerfolgs.

## 5. .148/.149: AoE, Gefahr und Skillentwicklung

### AoE und Gefahr

23 aufgezeichnete Spieler-AoE-Angriffe: Warrior16, Mage1, Rogue6. Kein NPC als getroffener Gegner in diesen Records. **Dabei stand bei diesen Angriffen kein NPC in der gespeicherten aktuellen Szene.** Der Batch zeigt reguläre Mehrgegner-AoE, ersetzt aber keine natürliche Brenna-/Begleiter-Gegenprobe und belegt keine NPC-AoE-Parität. Bestehende gezielte Tests bleiben dafür der Nachweis.

Der Mage erkennt den Wolfsauftrag mit gemeldeten **L4–7** und die sichtbare Dreiergruppe als zu gefährlich, weicht zurück und gibt den Auftrag T28 auf. Das ist ein positiver natürlicher Beleg für verständliche Gefahr und eigenständigen Rückzug. Nicht alle F-Aufträge müssen für einen L2-Mage geeignet sein. Kein Grund, diese Population herunterzuskalieren.

Keine Tode in diesem Batch, aber nur ein Magekampf: daraus keine generelle Aussage über Klassenüberleben oder eine „gelöste Balance“ ableiten.

### PP und Evolution

| Figur | Tatsächliches Endergebnis |
|---|---|
| Warrior | Basic Attack P2/22 PP, Heavy Slash P3/26, Cleave P1/54 |
| Mage | Arcane Wave P1/18; übrige Skills P1/0 |
| Rogue | Piercing Thrust **P4/30**, Fan of Blades **P1/72**, Basic Attack P1/18 |

**Keine Skill-Evolution, kein neues Lernziel.** Klassen-Evolution und Skill-Evolution sind verschiedene Systeme; die zwei angenommenen E-Klassen sind korrekt.

Piercing Thrust hat **180 PP insgesamt** erhalten; C1 benötigt für vier Aufstiege von P1 nach P5 insgesamt200. Bei unveränderten18 PP pro qualifizierendem Encounter fehlen20 PP, also zwei weitere solche Einsätze. Fan of Blades fehlen3 PP zum ersten75-PP-Aufstieg. Dass noch keine P5-Evolution angeboten wird, ist daher korrekt. Bereits vor P5 gespeicherte Mustermarken sind vorhanden; der Batch erreicht nur die anschließende P5-Abnahme noch nicht.

Beim Warrior enden **25 der 35 Kämpfe ausschließlich mit besiegten L1-Gegnern, während er bereits L6–10 ist**. Sie liegen selbst außerhalb des erweiterten PC−4-Fensters. Heavy Slash erhält126 PP, Basic72, Cleave54. Das ist kein Nachweis, dass .149 PP verliert; er kämpft lange gegen technisch bzw. inhaltlich falsch eingeordnete und zu schwache Goblins statt gegen passenden Fortschrittscontent.

Keine zusätzlichen LP/PP-Geschenke oder automatische Skillentwicklung empfehlen. Erst die Orts-/Populationstreue herstellen, dann geeignete natürliche Einsätze bis P5 und Annahme beobachten.

## 6. Pacing und nächste Entscheidungen

Rogue erreicht L15 bei **213 Inputs**, Warrior erst bei **370**. Rogue hat14 Kämpfe, Warrior35. XP aus geschlossenen Kämpfen: Rogue6.450, Warrior8.575; zusätzlich vorhandene Quest-XP. Die Zahl der Eingaben allein ist weder Kampfaufwand noch XP-Leistung.

Der Unterschied ist hier wesentlich durch passende Gegner/Quests versus lange L1-Goblinfolgen, Ortsverwechslung und Wiederholungen erklärbar. **XP×5 oder Levelkurve jetzt nicht erneut ändern.** Ebenso wenig F-Monster global auf PC-Level ziehen. Der Rogue zeigt bereits eine brauchbare natürliche F→E-Strecke nahe dem diskutierten200-Input-Ziel, trotz der Slime-Schleife.

**Priorisierte Folgearbeit, noch nicht freigegeben/implementiert:**

1. **P1 Ortsidentität / Rückkehrvertrag:** I73→I74 einschließlich Katalog-/Schemawiderspruch, Parentbindung, Dungeonwurzel und späterem CLEAR. Ein begrenztes fachliches Paket statt einzelner Raum-/Namensfilter.
2. **P1 falscher Endpreisbeleg:** I72 auf der bestehenden S2-Schnittstelle berichtigen und echten BID→Annahme-Weg absichern. Kein erneuter Finanzarchitektur-Audit und keine Wortliste für „pair“.
3. **P2 konkrete Ortsfakten:** bestehende Entity-/Place-Referenzprüfung konsistent machen; kleiner gemeinsamer World-Korrekturpunkt. Kein neuer allgemeiner Validator- oder GM-Frameworkauftrag.
4. Slime-Prosa, gelegentliche Korrektureingaben, nicht qualifizierende schwache Kämpfe und fehlendes P5 vorerst dokumentieren. Keinen weiteren vorsorglichen Runner-/Balanceumbau daraus ableiten.

Vergleich .147→.149: `world.js`, `dungeon.js`, `place_refs.js`, `interpret.js` und `finance_evidence.js` unverändert; Änderungen an catalog/commands/planner betreffen hier Gefahrenausgabe und AoE. Die nachgewiesenen Fehlerpfade sind **keine durch den letzten AoE-/PP-Patch neu eingeführten Implementierungen**. Das ist kein Beweis, dass jede ältere Modellantwort sie ausgelöst hätte.

**Gesamturteil:** Fortschritt bei echter Langlaufabdeckung, Gearkäufen und zwei F→E-Abschlüssen. Noch kein technisch störungsarmer .149-Batch: ein technischer Stopp, eine relevante räumliche Integritätsverletzung und ein kleiner formaler World-State-Fehler. Die zwei P1-Ursachen gezielt korrigieren; keine neue Balance- oder Finanz-Perfektionsrunde und keine automatische Umsetzung dieses Reviews.
