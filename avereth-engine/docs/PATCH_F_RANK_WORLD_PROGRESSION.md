# F-Rang: Weltgefahr, nutzbare Angebote und Proficiency (.96)

Basis: `.95` / `681c2b4`. Nutzerauftrag vom 26.10.2026: GPT-Feedback zum F/E-Entwurf prüfen, sinnvolle F-Teile für den nächsten natürlichen Run umsetzen. Produktbuild **4.3.0-c.6.6.96**. E-Inhalte und höhere Ränge bleiben außerhalb dieses Patches.

## Entscheidung aus dem Gegenvergleich

- **Welt und Gilde gemeinsam korrigieren:** Ein höheres Questetikett allein hilft nicht. Neue Jagden beziehen sich auf eine konkrete, vorher gebuchte Weltpopulation; ihre Stärke folgt dieser Quelle statt dem Spieler.
- **P2 muss etwas bewirken:** Die verlorene Kostenersparnis durch Rundung wird korrigiert. PP, Power-/Effektfaktoren, XP ×2 und Startstats 7 bleiben gleich.
- **Gear zuerst verständlich und erreichbar anbieten:** Keine pauschale Erhöhung auf ATK/MATK20–22 und keine Rüstungsbuffs. Bestehende Qualitätsstufen, Werte und Slots bleiben. Bestätigte Angebote zeigen ihre tatsächliche Wirkung und den Vergleich zur getragenen Ausrüstung.
- **Lernmöglichkeiten erreichbar machen:** Ein anwesender Gildenangestellter bietet fünf gewöhnliche, wiederverwendbare F-C1-Primer an. Kein sofortiger Gratis-Skill und kein neuer Lernpfad.
- E-Budgets, E-Quellen, zusätzliche Statusfamilien, Fern-AoE/Cleave, Dungeon-Levelspannen und die endgültige Preis-/Lootökonomie bleiben eigene spätere Entscheidungen.

## Weltgebundene F-Jagden

Neue Ruleset-2/V4-C-Kampagnen speichern `campaign.started.f_progression:true`; der Reducer übernimmt die Policy. Alte Start-Events werden nicht umgeschrieben. Expliziter A-Pfad und Ruleset1 erhalten die neue Policy nicht.

Die Boardfamilie bleibt **vier Jagden + eine geeignete bekannte Dungeon-Räumung**, sonst fünf Jagden. Ein frisches Novice-Board enthält neben der schwachen Level-1-Einzeljagd mindestens eine Jagd mit Empfehlung4–7 und eine mit Empfehlung8–14. Der Generator soll bei genügend Außenjagden sowohl8–11 als auch12–14 nutzen. Diese Bereiche sind keine neuen Charakterränge oder Spielervoraussetzungen. Gruppen werden nicht automatisch vergrößert; eine Empfehlung garantiert keine Solosicherheit. Der System-Boardtext zeigt das empfohlene Level.

Boardprotokoll **board-5.2** ergänzt pro Außenjagd:

```json
"habitat": {"species":"feral wolf","anchor":"wolf","min_level":4,"max_level":7}
```

Der Zielort steht **einmal** im vorhandenen `DEFEAT.where`. Zulässige Fenster sind1–1,1–3,4–7,8–11,12–14; die Questempfehlung muss darin liegen. Intro: ein gewöhnlicher Level-1-Gegner mit schwachem Anker (Basis-HP≤35, ATK≤10). Andere Listings verwenden `habitat:null`; alte Antworten ohne Feld bleiben lesbar. Dungeonjagden und Räumungen behalten ihre vorhandene Slotautorität.

Generator und einmaliger Repair verwenden dieselbe Prüfung. Art/Anker/Ziel müssen passen; benannte bekannte Arten dürfen keinem widersprechenden Anker zugeordnet werden. Ganze Städte/Regionen, Dungeons, mehrdeutige Ortsnamen und widersprüchliche Änderungen bestehender Populationen werden abgewiesen. Eine neue Population darf bereits profilierte Individuen an einem bekannten Ort nicht einfach neu etikettieren. Keine teilweise Veröffentlichung eines fehlgeschlagenen Boards.

Beim regulären `bookBoard` entsteht ein berichteter kleiner Ort oder die passende Ergänzung eines noch unbelegten Orts: `place.population={species,anchor,levels}`. `quest.hunt.at` referenziert ihn. Es entstehen **keine Gegner und keine Spielerbewegung**. Bekannte Populationen werden bei späteren Boards wiederverwendet, nicht umgerechnet. Namen, Motive, Ökologie und konkrete Begegnungen gestaltet weiterhin das LLM.

Narrator-Kontext und Planner-/Extractor-Katalog erhalten dieselbe gebuchte Zielpopulation. Erst `materialise` fixiert passende Individuen in deren Levelspanne; ein bestehendes Profil bleibt bestehen. Andere Arten am Ort erben diese Spanne nicht. Die Herkunft wird als `entity.population_at` gespeichert: importierte schwache Wölfe oder gleiche Arten anderswo erfüllen den Vertrag nicht. `defeatTally` nutzt diesen Bezug; READY, Abgabe, Auszahlung und XP laufen unverändert über die bestehende Gildenabwicklung.

Außerhalb solcher Ziele liest die neue Policy bestehende Danger-Fakten vom konkreten Ort beziehungsweise dessen Eltern, statt nur `scene.location` zu betrachten. Gewöhnliche Wildnis fällt auf das vorhandene1–3-Band zurück, unbekannter Kontext weiter auf1. Individuen, Dungeonfenster und Weltkontext gehen vor; PC-Level, Ausrüstung und Siegesserien gehen nicht ein. Das ist keine vollständige Welt-Gefahrenkarte und kein neues Respawn-/Spawnsystem.

## Lernen, Markt und Kosten

Beim tatsächlichen Boardlesen am Gildenschalter kann ein **bereits anwesender** Clerk/Registrar die Primer Strike, Bolt, Guard, Ward und Mend anbieten: je **120cp**, F/C1, feste bestehende `skill_source`-Profile. Das benutzt `offer.created` → vorhandenen Kauf → Objektprofil → vorhandenes Eigenstudium/LP → Forge/atomaren Erwerb. Kauf allein lehrt nichts. Das Buch bleibt nach dem Studium erhalten. Kein NPC wird dafür erzeugt; kein Kauf über Entfernung oder einen abwesenden Verkäufer. Die erzählte Übergabe des gekauften Buchs erzeugt kein zweites Exemplar. Neue Verkäuferangebote sind am jeweiligen Schalter wieder möglich; doppelte Bücher geben keine doppelte Technik.

Die neue System-Shopkarte zeigt bestätigte offene lokale Waren: Verkäufer, Menge/Lotpreis, tatsächliches Profil, Gearvergleich und gegebenenfalls den ausdrücklich getrennten Preisrichtwert. Geschlossene, entfernte Angebote und Käufergebote werden nicht als kaufbare Ware gezeigt. Beim Öffnen/Ankommen erscheint die Karte zusätzlich zur Narration. Qualitäten und passende Upgrades werden dem Narrator aus dem Content erklärt; teurere Materialnamen verleihen keine Boni. Eine vollständige neue Shopgenerierung wird nicht eingeführt. Händlerpreise bleiben ausgehandelte Angebote, keine Zwangspreise.

Für Kampagnen mit neuer Policy kombiniert `skillCostAmount` die bisherigen Faktoren und rundet wie zuvor einmal. Würde Proficiency gegenüber denselben effektiven P1-Kosten **gar nichts** sparen und diese über1 liegen, spart sie mindestens einen Punkt. Bolt kostet damit P1–P5 **10/9/9/9/9MP**. Das ist keine Garantie eines eigenen zusätzlichen Rabatts bei jeder späteren Stufe. Kosten von1 bleiben bezahlt; Power, PP, Effekte und Lernschwellen sind unverändert. Dieselbe Berechnung gilt in Kampf, NPC-Auswahl, Weltanwendung, Vorschau, HUD und `#skill`. Historische Kampagnen behalten die bisherige Rundung.

## Prüfung und Abnahme

- **25 neue Regressionen:** auf unverändertem `.95` **24 rot / eine grüne Legacy-Kontrolle**, danach25/25. Die roten Fälle weisen fehlendes neues Verhalten nach, nicht24 voneinander unabhängige Altbugs.
- Erfasst: Board/Repair/Verteilung, Typ-/Ort-/Levelkonsistenz, Population ohne Spawn, tatsächliche/fehlende Ankunft, gleiche Identitäten mit kanonischen Referenzen, bestehende Dungeonautorität, fremde/zu schwache Kills, JSON-Replay, historisches Board, READY/Abgabe/einmalige Zahlung, reale Buchbeschaffung und Studium, Übergabededuplizierung, abwesender Verkäufer, sichtbare Werte sowie echte P2-Ausführung bei exakt9MP.
- Nachbartests: zuerst72/72 (Gilde, Quellen, Training, Run19), danach52/52 (inklusive Meisterschaft/Passives) und50/50 (Boardkarte). Abschluss-**`npm test`: 1871/1871 grün**.
- Echter **ST1.19-Mock-Smoke:** final **21/21**, fünf Extractor-Aufrufe, keine PageErrors. Vier gespeicherte aktuelle Story-Records jeweils `applied` und genau ein `extract.applied`. Der erste Versuch war20/21 wegen `AbortError: The user aborted a request. @ openai.js:4565`; Wiederholung ohne Produktänderung grün. Kein Nachweis, dass der intermittierende ST-Abort generell behoben wäre.
- **Kein natürlicher GLM-Langlauf** durch diesen Patch. Narrator-Vertrag bleibt Revision`.85`; Planner-/Extractor-Budgets, Testspieler und XP sind unverändert.

## Kleiner Gearvergleich und Grenzen

Mit dem bestehenden Simulator wurden270 synthetische Kämpfe betrachtet: drei Klassen, Level1/10/14, drei exemplarische Situationen (drei L1-Goblins, drei gleichstufige L10-Wölfe, ein L14-Elite-Oger), Waffenwerte10/12/16/20 oder zusätzlich4DEF, jeweils sechs Seeds. P1, erste zwei Starter des Pools, normale Statverteilung und vorhandene Skill-Taktik; **keine optimierten Builds und keine natürliche Testserie**. Die höheren Waffenwerte waren nur lokale Vergleichsdaten und wurden nicht in den Produktcontent übernommen.

Es gab keine illegalen Simulatoraktionen. Gegen die L10-Wölfe änderten höhere Waffenwerte hier die nötige Aktionszahl nicht;4DEF verbesserten etwa beim Mage die mittleren Rest-HP von62,3 auf74,2. Gegen den Elite-Oger veränderte Waffe10→20 die Warrior-Siege von0/6 auf5/6, Mage/Rogue verloren mit diesen Builds weiterhin alle sechs. Das belegt Schwellen-/Klassenabhängigkeit und die Gefahr pauschaler Buffs, **keine endgültige Klassenbalance**. Ein Elite-Oger ist kein gewöhnlicher gleichstufiger Wolf. Aus diesen kleinen Stichproben werden weder Siegquotenvorgaben noch ein verpflichtender Gearpfad abgeleitet.

Für den nächsten Langlauf eine **neue Kampagne** verwenden. Stärkere Jagden sind freiwillige Möglichkeiten; Ausrüstungskauf, Lernen, Training und Entwicklung bleiben freie Entscheidungen. C2/C3 und Passives werden weiterhin nur nach ihren bestehenden Bedingungen angeboten. Spätes F ist nun außerhalb Dungeons erreichbar; reine F-Dungeonrollenfenster werden hier nicht verbreitert. Preise, größere Waffenbandbreite und Status-/E-Erweiterungen bleiben offen. Die getrennten Run20-Technikpläne zu `repriced`, Guild-Stadtbezug und Extractor-Repair sind durch diesen Fachpatch nicht erledigt.
