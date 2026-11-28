# Avereth .263 · E-Rank in einer gemischten Rangwelt

**Entwicklungs- und Reviewkandidat 4.3.0-c.6.6.263.** Ab Level 15 kann eine Gruppe einen Proven-Jagdauftrag mit gebundener E-Population abschließen. In den aufgezeichneten Modellläufen kamen ein E-Stab, eine neue E-Ward-Technik, Ossens Anteil an der Jagdvergütung und die zweite Etage von Old Crown tatsächlich im gefalteten Spielstand an. Der Levelaufstieg bis 20 war für die E-Abnahme vorbereitet. [Fachentscheidungen](AVERETH_263_E_RANK_FACHENTSCHEIDUNGEN.md) · [Originale und Kostenledger](../testrun_10b/openrouter-20261128-e-rank-263/README.md)

## 1. Produktstände

Produktbasis war `c665c59a313746e165a00a5f147c1aaeff7c0452`, Arbeitsgrundlage auf main `3d422618ee28d6d804a142d5e8aab3d39b0dd154`. Die Zwischenstände tragen gemeinsam .263. Die Originalarchive weisen je Lauf den tatsächlich geladenen Produktcommit aus.

- E-Fenster, individuelle Rangherkunft und Proven-Content. [a899ce12](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a899ce129f787a5e4c7aa29cabe9e8d82e51a718)
- E-Waren, Quellen, Entwicklung und Klassenmerkmale. [dcce436a](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/dcce436af38c28c4395b7db2326e8ed0e1ba2a90)
- HUD für Gefahr, Ausrüstung, Skills und Ziele. [fc686cc0](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fc686cc0d131fe01f7dae43abba538e90998a9e8)
- Proven-Habitat im vollständigen Hostpfad und Preisbindung. [9cc039b6](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/9cc039b6599217cafab2e54851117757839ecd3e)
- Quellen- und Entwicklungsprüfungen, Replayvergleich. [753de51d](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/753de51dfa1875faa14f428abecaf1147e5b9141)
- Gebundene NPC-Signaturen und gemischte Individuen. [bc3777d5](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bc3777d54e88203cc330215c0d2cfb1fdd807d36)
- Zielklicks im Host, Qualitätsvergleich und E-Unterricht. [928172b9](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/928172b9bbaae3d133bad7097100dc2127334b8e)

## 2. Spielregeln und Verantwortlichkeit

Geografie, persönliche Stärke, technische Skillberechtigung, Gildenrang, Warenbestand und Gruppenzugehörigkeit haben getrennte Quellen. P und X können ein konkretes Ziel bzw. eine belegte Eigenschaft melden. Profil, Kosten, Gefahrenspanne, Erwerb, Kampfzuordnung und Auszahlung bestimmt die Engine im bestehenden Ereignispfad. Die wenigen zusätzlichen Angaben sind optional. P/N/X, Board und Forge verwenden ihre vorhandenen Aufrufanlässe. [Vollständige Fachentscheidungen](AVERETH_263_E_RANK_FACHENTSCHEIDUNGEN.md)

## 3. Rangquellen und NPC-Profile

Ein neu etablierter erfahrener NPC erhält das erweiterte Abenteurerprofil und ein aus Seed und Identität festes persönliches E-Level. Rolle und Beruf bleiben am Individuum. Der Materialisierungspfad definiert eine zulässige persönliche Signatur und speichert das Sheet. Nur die geprüfte Engine-Materialisierung erhält beim Delta `person.new` die Berechtigung zur Signaturdefinition. Die Gegenprobe prüft denselben pensionierten Handwerker bei PC-Level 1 und 25. Bereits bekannte Personen behalten ihr Sheet. Eine Unterrichtszusage allein qualifiziert keinen Lehrer. Für E muss er die passende gelernte Technik und den eigenen Rang besitzen. Bei konkreten E-Lektionen prüft auch der Dienstleistungspfad die Kompetenz. [Gegenproben zu Board und NPCs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9/avereth-engine/tests/v4/patch_f_progression.test.js)

## 4. Gemischte Welt

Das bestehende Orts- und Populationsbuch speichert die tatsächliche Herkunft. Im Test behalten zwei gewöhnliche Rudelmitglieder ihr F-Fenster von L4–7. Das ausdrücklich separat etablierte unabhängige erwachsene Tier erhält sein eigenes E-Level. Es gehört auch am selben Ort weiterhin nicht zur Jagdpopulation. Dungeon-Slots, Jungtiere, zuvor erzeugte Profile und Mengenberichte werden durch den Individualhinweis nicht aufgewertet. PULSE stellt das Ereignisfenster. Ein Händler braucht für eine konkrete E-Ware keinen eigenen E-Machtrang.

## 5. Gefahr und Proven

Das Contentpaket enthält die fünf festgelegten E-Fenster. Board, Habitatprüfung, Weltklassifikation, Body-Plan-Katalog und Modellkontext greifen auf die Rangkonfiguration zu. Novice behält seine F-Regeln. Proven verwendet die freigegebenen Lohnspannen und kann reine Außenjagden oder eine passende Dungeonfreigabe listen. Die Annahme prüft Ziel, Ort, Konkurrenz und Berechtigung. Die vier Lohnspannen und die Gebietsfenster stehen in den [Fachentscheidungen](AVERETH_263_E_RANK_FACHENTSCHEIDUNGEN.md).

Ein Zwischenstand erzeugte im natürlichen Lauf echte Proven-Questobjekte ohne Habitat. Die Hostfunktion `boardFor()` setzte `progression` nur für Novice. Seit `9cc039b6` verwendet sie die konfigurierten Outdoor-Boards. Der nachfolgende Lauf mit neuem Board hat ein E-Jagdgebiet angelegt, den Bären an diesem Ort gebunden und den Auftrag bei der Rückkehr regulär abgerechnet. Der misslungene Erstlauf bleibt im Archiv.

## 6. Waffen, Preis- und Skillwerte

Für neue E-Waffen gelten nach Qualität 8/14/20/25/31 ATK bzw. MATK. Der Richtwert folgt der F-Qualitätspreisbasis × 2,5, einschließlich der aus dem bisherigen F-Punktwert abgeleiteten unteren Qualitäten. Die Preisreihe ist 120/200/350/650/1.200 cp. Preisprüfung, neues Profil und Markthinweis verwenden denselben Richtwert. Der ausgehandelte Preis wird als Angebotszeile eingefroren. Exportierte Altobjekte, bereits fixierte Angebote und Beute behalten ihre Einzelwerte. Rüstungen und Schilde verwenden die etablierte Kurve. Manual und Stone haben eigene E-Orientierungen von 240 bzw. 800 cp.

| Complexity | E-Maximum Angriffsbasis | E-Maximum Koeffizientensumme | STA-Band | MP-Band |
|---|---:|---:|---|---|
| C1 | 18 | 2,0 | 5–10 | 8–14 |
| C2 | 24 | 2,5 | 8–16 | 12–22 |
| C3 | 27 | 2,7 | 12–22 | 16–30 |

Für eine reine Rank-Evolution wird die bisherige Angriffsbasis mit dem Verhältnis der E-/F-Basiskalibrierung multipliziert und abgerundet. Skalierungsattribute, Koeffizienten, Trefferzahl, Reichweite und Spezialwirkung bleiben am Profil. Bei Heilung und Barriere steigt die Basis um den Faktor 1,5 mit Abrundung. Bei temporärer DEF bzw. MDEF kommt ein Basispunkt innerhalb der Grenze 6 bzw. 4 hinzu. Weitere Effekte behalten ihre Familien und Grenzen. Komplexitäts-, Flächen- und Mehrfachangriffsprüfungen gelten auch für E. Der Composer erzeugt aus neuen Quellen zunächst C1. Jeder fertige Entwurf durchläuft die normale Definition und Lernprüfung.

## 7. Erwerb, Entwicklung und Revision

Das Lernziel führt den Maschinenrang der Quelle. Signatur und Duplikatprüfung berücksichtigen ihn. Eine neue E-Technik kann neben ihrer F-Ausführung stehen. Ein ungeeignetes Manual eröffnet kein ausdrücklich andersrangiges Ziel. E-Steine verbrauchen sich erst nach zulässiger Aktivierung. Bei Lehrern werden bekannte Technik, Zustimmung und Anwesenheit erneut geprüft. Derselbe bestätigte Lernstand lässt sich nach Tageswechsel oder Reload fortführen.

Eine gemeisterte F-Technik, eigener E-Machtrang und zwei qualifizierende unterschiedliche Kämpfe können ein Angebot begründen. Vorhandene Entwicklungsmarken, Angebotsraum und Evidenzverbrauch bleiben maßgeblich. Auch eine bedeutsame qualifizierte Nutzung ohne spezielles taktisches Muster kann bei E/P5 belegen, dass die Technik eingesetzt wurde. Erst die Annahme ersetzt die alte ID. P5, 0 PP, History, Rang und Complexity wurden bei C1, C2 und C3 vor und nach Persistenz verglichen. Eine zweite Annahme verbucht nichts. Im Modellspiel brachte der aktivierte E-Skill-Stone **Rimed Aegis Ward** tatsächlich als neue E-Technik auf P1 ins Sheet. [Quellen- und Evolutionsprüfungen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9/avereth-engine/tests/v4/organic_rank263.test.js)

## 8. Klassen und Passive

O1 wirkt über das persönliche Klassenmerkmal. Bei einem neuen offensiven E-Merkmal gilt +8 bzw. +12 ATK/MATK. Die übrigen Normal-/Rare-Effektgrenzen bleiben +4/+6 für gewöhnliche Stats, +20/+35 für Pools und 8/15 für die bestehenden Kosten- bzw. Resistenzbudgets. Die Summierung berücksichtigt die höhere Autorität nur für das gebuchte offensive Merkmal. Alte Klassendefinitionen werden als gespeicherte Werte gelesen. Vier Passive-Slots, bestehende Qualitäten, Rare-Defense und Austauschregeln gelten weiter.

## 9. Kombinierte Balance

Der reproduzierbare Lauf erweitert die veröffentlichte .262-Simulationsbibliothek um vorbereitete, durch das Produkt validierte Skill-/Passive-Ausstattung vor Initiative. Er verwendet die reale E-Klasse und den regulären Kampfresolver. F5/F10/F14, E15 mit F-Gear und E20/E24/E29 mit E-Gear wurden je als Warrior, Rogue und Mage gerechnet. Entwickelte Figuren tragen eine tatsächlich definierte E-Technik, eine E-Evolution sowie das bisherige Passive Iron Hide. Die kontrollierte Spielerstrategie kann Reichweite, Flächenangriffe, Defensive, Verbrauchsgüter und eigenständige Begleiter nutzen. [Skript](avereth_263_abnahme/balance.mjs) · [Einzelmessungen](avereth_263_abnahme/balance.json)

In 315 Kämpfen gegen gleichstufigen Wolf, zwei Wölfe mit Begleiter oder einen Elite-Wolf gewannen die vorbereiteten Builds jeweils 5/5 Seeds. Diese Begegnungen trennen die Builds kaum. Aussagekräftiger war die Kette der echten E2-Slots mit Gruppengrößen in der Mitte der jeweiligen Spannen. Der entwickelte L24-Mage schaffte Mossback solo ohne Erholung 0/5, mit einer Stunde Erholung zwischen Abschnitten 5/5. Mit Warrior gelang die Kette in beiden Varianten 5/5. Old Crown gelang unter allen vier Bedingungen 5/5. Die fünf deterministischen Seeds pro Zelle sind eine Gegenprobe für die spielbare Kombination. Für eine allgemeine Erfolgsquote im freien Spiel ist diese Stichprobe zu klein.

Die zusätzlichen 360 einzelnen Angriffsausführungen vergleichen die bezahlten Ressourcen bei gleicher Figur und gleichem Ziel. Ein L20-Warrior konnte den geprüften E-Schlag auf P1 aus 100 STA 16-mal, auf P3/P5 jeweils 20-mal bezahlen. Schaden pro verbrauchtem STA lag bei 17,44/21,51/22,00. Der Rogue erreichte 12/14/14 Einsätze und 13,68/15,71/15,71 HP pro STA. Der Mage erreichte 30/32/34 Einsätze aus seinem tatsächlichen MP-Pool. Gemessen wurde der Verlust echter Ziel-HP einschließlich Fehlschlägen und Begrenzung durch die verbleibenden HP. Hoher Überschussschaden erhöht diese Kennzahl nicht. Das isolierte Setzen unterschiedlicher P-Stufen dient dem Vergleich. Eine tatsächliche angenommene Rank-Evolution startet auf P5.

## 10. Kaufkraft

Beim Dock-Bear-Auftrag (empfohlen L20) zahlte die Gilde einmal 330 cp. Alaric erhielt 165 cp, Ossen 165 cp. Ein feiner Stab zum Richtpreis 350 cp kostet damit etwas mehr als einen solchen Soloauftrag oder etwas mehr als zwei persönliche Halbanteile. Ein Manual für 240 cp entspricht 0,73 Soloaufträgen oder 1,45 Halbanteilen. Ein Stone für 800 cp entspricht 2,42 bzw. 4,85. Das sind Bruttoverhältnisse vor Reiseverbrauch und unabhängig von der Zahl zukünftiger Angebote. Der vorbereitete Geldbestand diente zur Testbarkeit. Tatsächlich bezahlte Alaric im anderen Zweig 350 cp für den Stab und 220 cp für den individuell ausgehandelten Stein. Die konkrete Preisstreuung ist eine Beobachtung für den Usertest. [Markt-, Handels- und Jagdzüge](../testrun_10b/openrouter-20261128-e-rank-263/README.md)

## 11. HUD

Bekannte Gebietsspanne, Gildeninformation über die Population und anwesende lebende Populationsmitglieder erscheinen in der Weltübersicht. Der Charakterbogen öffnet pro Skill die lokalen Details einschließlich Kosten. Angebote, Itemdetails und Ausrüsten zeigen die betroffenen tatsächlich getragenen Werte. Die Partyübersicht unterscheidet aktuelle und zuletzt beobachtete Begleiterdaten. Ein Evolutionsangebot zeigt Vorgänger und Nachfolger mit P-Stufe und PP-Folge. Am Rangübergang weist das HUD auf den möglichen Gildenschritt hin. Bei mehrdeutigen Angriffszielen bereiten anklickbare gültige Kandidaten die eigene Eingabe vor. Der Spieler löst den Angriff aus. Im isolierten Browser wurden die Skillzeile und die Zielauswahl auf fehlende Spielzeit- und Providerwirkung geprüft.


## 12. Abnahme und natürliche Fortsetzung

| Prüfung | Beleg |
|---|---|
| Vollständige Node-Suite | 3.662 bestanden, 0 fehlgeschlagen, übersprungen oder abgebrochen |
| Historischer Vergleich | 2.235 Fälle. Die 1.392 Abweichungen gegenüber der ursprünglichen .126-Referenz entsprechen exakt dem fortgeschriebenen Manifest. Keine offene oder veraltete Ausnahme |
| Historische Änderungen gegenüber .262 | Elf Equip-Quittungen enthalten den Vergleich mit dem zuvor getragenen Gegenstand. Für jede wurden alle Ausgabefelder gegen .262 verglichen. Frühere Fingerprints bleiben im geerbten Manifest nachprüfbar |
| Moderner Vergleich | 298 Fälle, mechanische Invarianten und JSON-Reload. 255 Fälle mit einzeln gebundener Protokoll- oder Quittungsänderung. 254 Fälle haben andere Prompts. Nur `oriole-251#81` ändert den gespeicherten Output samt Welt-Hash durch den bestehenden Equip-Vorgang mit erweitertem Quittungstext |
| Moderne physische Abdeckung | Dieselben fünf unvollständigen Originalpfade und 30 unbenutzten Archiv-Folgeantworten wie auf der Basis. Identische physische Rollenfolge. Abweichungen bekannter Fehler müssen den Vergleich weiterhin bestehen |
| Rot/Grün | Acht ausgewählte Gegenproben zu Proven, gemischten Individuen, Quellenrang, Lehrern und C1/C2/C3 scheitern auf .262. Bei den alten Simulatorfixtures lag der E-Lernende für diesen Vergleich auf L15. Der Kandidat besteht die zugehörigen Produktprüfungen |
| Isoliertes SillyTavern 1.19.0 | `trade_hud` 44/44 einschließlich lokalem Klick auf Skill und Ziel. `board_slot` 57/57. Andere ST-Smoke-Modi wurden für diesen Abschluss nicht nochmals vollständig ausgeführt |
| Save und Revision | Gefaltete Zustände und RNG im Replay, Revisionen im bestehenden Node-Netz, persistente Gesprächsgrenzen der Modellläufe. Nach dem Dungeon lagen das Evolutionsangebot, seine Annahme und der einmalige Ersatz im wieder geladenen Verlauf vor |

Die Ausführungsprotokolle enthalten die Summen der Node-Suite, den fallweisen Replayvergleich und die beiden ST-Abschlüsse. [Node](avereth_263_abnahme/node.txt) · [Historisch](avereth_263_abnahme/historisch.txt) · [Modern](avereth_263_abnahme/modern.txt) · [ST Handel und Zielauswahl](avereth_263_abnahme/st-handel.txt) · [ST Board](avereth_263_abnahme/st-board.txt)

Der moderne Vergleich behält die ursprüngliche .261-Referenz. Das Zusatzmanifest bindet die geänderten Rollenprompts einzeln an ihre Fälle. Betroffen sind 126 Planner-, 19 Narrator-, 128 Extractor-, 9 Extractor-Repair- und 10 Planner-Repair-Prompts. Die Modellverträge vermitteln individuelle Rangherkunft, gemischte Gefahr und optionalen Lehrzielrang. Aus den Replay-Prompts allein folgt keine Aussage zur natürlichen Modellqualität. [Modernes Manifest](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9/avereth-engine/tests/replay/modern/rank263.json) · [Historische Ausnahmen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9/avereth-engine/tests/replay/accepted_rank263.json)

Die natürliche Serie nutzt echte sequenzielle GLM-5.3-Flash-Anfragen über OpenRouter/Wafer und isolierte ST-Chats. Der F-Lauf umfasst die Partyaufnahme, einen Rationskauf und die Rückkehr zur Gilde. Aus genau diesem Verlauf entstand ein **als Fixture vorbereiteter** Proven-Mage auf L20 mit 1.228 cp und Flame Lance auf P5 sowie Ossen auf L16. Zwei Folgepfade untersuchen Jagd und Erwerb. Die Auswertungen zählen nur neue physische Anfragen der jeweiligen Fortsetzung.

Im Dungeon gelang Alaric der Übergang von F1 auf E2 nach einem ausdrücklich gewählten Abstieg. Eine mehrdeutige Anweisung am Ende der ersten Etage führte zunächst zur lokalen Rückfrage. Ossen fiel im Bosskampf. Die zweite Etage wurde regulär mit PC-Credit abgeschlossen. Zwei gebuchte Encounters lieferten die Evidenz `enc.t33+enc.t36`. Aus der ausdrücklichen Annahme im anschließenden Lauf wurde `dyn.ascendant_flame_lance` als E/C2 mit P5 und 0 PP gespeichert. Der alte Skill steht in der History. Danach nahm Alaric **Spellweaver's Insight** mit tatsächlich gebuchten +8 MATK und 8 % Arcane-MP-Kostenreduktion an. Er verließ den Dungeon auf L22. Der vorbereitete Start enthält weder diese Evidenz noch eine E-Technik, diese Klasse oder fertige Dungeonabschnitte.

Die Serie umfasst **55 neue Eingaben und 170 vollständig abgerechnete Modellaufrufe** in neun verbundenen Aufzeichnungen. Die tatsächlichen Kosten betragen **0,108486740 USD** von freigegebenen 1,00 USD. Die Prüfung ordnet jedem Start genau einen Abschluss mit Generation-ID und ausgewiesenem Preis zu. Alle Fortsetzungen, eingesetzten Commits, Einzelkosten, Token- und Zeitmessungen sind im Archiv belegt. [Runübersicht und Manifeste](../testrun_10b/openrouter-20261128-e-rank-263/README.md)

Beim ersten Verkaufsversuch war die Käuferreferenz ungültig, Alaric behielt sein Fell. Bei der anschließenden persönlichen Rückkehr zum bereits etablierten Händler erhielt er ein verbindliches Gebot. Der bestätigte Verkauf entfernte genau ein E-Bärenfell, ließ die vier Klauen im Inventar und erhöhte den Geldbestand einmalig von 1.393 auf 1.833 cp. **440 cp Verkaufspreis bei 45 cp Materialrichtwert** zeigen eine erhebliche Streuung. Der Einzelverkauf belegt die funktionierende Transaktion. Für eine dauerhafte wirtschaftliche Kalibrierung braucht es weitere persönliche Spielbeobachtungen.

## 13. Zurückgestellte Entscheidungen

D–S, göttliche Fortschrittsbedingungen ab B, höhere Passive-Budgets, neue Formate für Liefer-/Eskortaufträge und eine Neuabstimmung von Monsterwerten oder XP liegen außerhalb dieses Pakets. Generative Anbieter, Käufer und Lehrer brauchen weiterhin eine konkrete Gelegenheit in der Welt. Ein festes E-Sortiment für jede Siedlung ist keine Produktregel.

## 14. Offene Beobachtungsfragen

Die größte Unsicherheit betrifft die natürliche Häufigkeit geeigneter E-Quellen und die wirtschaftliche Streuung zwischen verschiedenen Verkäufern. Bei der ersten Manual-Anfrage entstand keine verwendbare E-Technik. Der spätere, konkret angebotene Stone funktionierte vollständig. Das Verhältnis zwischen Lehrzeit, tatsächlichem Marktpreis und einmaliger Aktivierung braucht persönliche Kampagnenerfahrung. Die simulierten Wolfskämpfe mit entwickelten Builds liefern kaum Trennschärfe. Für D und darüber hinaus sollten Gruppenrisiko, Reichweite, Rogue-Eröffnung aus Stealth, Vorbereitungsaufwand und längere Ressourcenketten separat beobachtet werden. Die Simulation beginnt bei festgelegter Sicht und Distanz.

Für den nächsten persönlichen Test sind eine freiwillig ausgewählte Proven-Unternehmung, unterschiedliche Händler, eine Unterrichts- oder Manualfolge und ein Dungeon mit eigenen Rückzugsentscheidungen besonders aussagekräftig. Der technische Kandidat ist für den unabhängigen Diffreview geeignet. Die Entscheidung über den persönlichen Usertest bleibt anschließend beim Nutzer.

## 15. Installation seit .262

Nach Freigabe in SillyTavern **den vollständigen Ordner `avereth-engine`** aus dem Endcommit aktualisieren. Der übliche Installationsort ist `public/scripts/extensions/third-party/avereth-engine`. Bei einer profilgebundenen Installation denselben vorhandenen Extensionpfad verwenden. `manifest.json`, `src/`, `content/` und die zugehörigen Dateien gehören zum selben Stand. Nach dem Neuladen muss die Erweiterungsverwaltung **4.3.0-c.6.6.263** anzeigen. Die Änderungen an Planner und Extractor stecken in der Extension. Zusätzlich auszutauschende Card-, Preset-, Lorebook-, Regex- oder Narrator-Contract-Dateien gibt es gegenüber .262 keine. Bestehende Chats lassen sich weiterverwenden. Bereits etablierte F-Personen und Angebote behalten ihren Zustand.

## 16. Übergabe und Referenzen

Entwicklungsbranch `experiment/211-openrouter-helper-single-runner` ist auf `928172b9bbaae3d133bad7097100dc2127334b8e` geprüft. Die Dokumentation basiert auf main `3d422618ee28d6d804a142d5e8aab3d39b0dd154`. Der veröffentlichte Dokumentationscommit ist über die Historie dieses Berichts identifizierbar. Die Überprüfung des endgültigen main-HEADs erfolgt nach der Veröffentlichung. [Gesamtdiff .262 → .263](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/c665c59a313746e165a00a5f147c1aaeff7c0452...928172b9bbaae3d133bad7097100dc2127334b8e)
