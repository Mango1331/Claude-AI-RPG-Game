# Avereth Engine — Verbindlicher Design-Kanon und Leitplanken

**Dokumenttyp:** langfristige Spiel- und Architekturentscheidungen  
**Stand:** 21. Oktober 2026 · Fassung 1  
**Pflege:** nur bei neuen verbindlichen Designentscheidungen  
**Status-Legende:** **[VERBINDLICH]** = gewolltes Spiel-/Architekturverhalten; **[GEPLANT]** = verbindliches Ziel, aber nicht zwingend implementiert; **[OFFEN]** = noch nicht abschließend beschlossen. Die Implementierung ist gesondert in Datei 03 zu prüfen.

> Die Grundidee: **„LLM versteht wie ein GM; Engine rechnet wie ein Spiel.“** Avereth soll ein frei spielbares, stimmiges, mechanisch überprüfbares Progression-Fantasy-RPG sein – keine illustrierte Sammlung von Chat-Texten und keine Tabellen-/Bürokratiesimulation.

## 1. Spielerfahrung und Prioritätensystem

**[VERBINDLICH]** Die wichtigsten Ziele, grob in dieser Reihenfolge:

1. **Player Agency / bedeutungsvolle Entscheidungen:** Der Spieler entscheidet sämtliche freiwilligen Handlungen seines Charakters. Der Narrator darf weder dessen Worte, Gedanken und Motive noch neue Reiseziele, Käufe, Angriffshandlungen oder Questannahmen erfinden.
2. **Spaß und gutes Tempo vor Simulationsrealismus:** Ein echter Kampf, eine Entdeckung, eine interessante soziale Konfrontation oder eine Entscheidung hat Wert; fünf künstliche Wegmarken ohne Wahl nicht.
3. **Eine unabhängige lebendige Welt:** NPCs sind keine dienstbaren Quest-Pfeile; sie verfolgen eigene Interessen, kennen nur, was sie legitim erfahren haben, können helfen, ablehnen, täuschen, kämpfen, sterben oder Alaric ignorieren.
4. **Mechanische Konsequenz und Persistenz:** Werte, Welt, besiegte Gegner, Geld, Zeit, Kämpfe, Quests und Wissen folgen nachvollziehbaren Regeln. Nichts setzt sich grundlos zurück.
5. **Reiches High-Fantasy-Worldbuilding und Progression:** Große Welt mit vielen echten Handlungswegen, gefährlichen Monstern, Dungeons, Klassen und Entwicklung; keine starre Hauptquest-Pflicht.
6. **Technische Einfachheit:** Möglichst bestehende Mechaniken nutzen; nicht jede abstrakte Option braucht einen neuen Simulationskern.

**Nicht das Ziel:** maximal realistisches Micromanagement, dauernde Bestätigungen, künstlich schwerfällige Questbeweise, wahllose Extra-Mechaniken oder „mehr Code = besseres RPG“.

## 2. Zuständigkeiten von LLM und Engine

**[VERBINDLICH]**

- **LLM/Planner:** natürliche Spielerbefehle verstehen, Referenzen auf bekannte Figuren/Orte/Skills zuordnen, wirkliche Mehrdeutigkeiten erkennen. Wünsche, Fragen, Hypothesen und Aussagen anderer sind keine gebuchten Spielerhandlungen.
- **Deterministische Engine:** Würfel, Kampf, Initiative, Schaden, Ressourcen, Monsterlevel, XP, Inventar, Geld, Questannahme/-abschluss, Reisen, Zeit, Skills, Gegneridentität und relevante Persistenz. Ergebnis wird nicht vom Narrator neu entschieden.
- **Narrator/GM:** stilvolle Prosa, eigenständige Weltreaktionen, plausible Ereignisse, NPC-Stimmen, lokale Entdeckungen und leere Weltbereiche kreativ ausfüllen. Bindende Engine-Ergebnisse exakt respektieren.
- **Extractor + Validator/Firewall:** nach der Geschichte neu etablierte *Weltfakten* erkennen und typisiert als Events übernehmen, ohne Engine-Zustand oder freiwillige PC-Commitments zu überschreiben.
- **Knowledge Firewall:** Spielerziel im ungesprochenen Text ist nicht automatisch Wissen für NPCs. Jeder NPC hat eigene Perspektive und legitime Informationsquellen.
- **Replay:** Event-Log ist Wahrheit; `fold(events)` konstruiert deterministisch den Zustand. Swipe, Regenerate und Änderungen dürfen keine „zweite Realität“ oder doppelte Belohnung erzeugen.

**[VERBINDLICH]** SillyTavern ist die aktuelle Host-Umgebung; spätere Portierung z. B. nach CraftRPG ist denkbar. Keine Abhängigkeit von einzelnen proprietären Sprachmodellfähigkeiten erzwingen. Das in den letzten Tests benutzte GLM-Modell ist **austauschbare Laufzeitkomponente**, kein Weltkanon.

## 3. Figurenhoheit, Erzählstil und autonomes Worldbuilding

**[VERBINDLICH]**

- Player Character gehört ausschließlich dem Spieler: freiwillige Bewegung, Sprechen, Zustimmung, Absichten, Angriffsziel, Skills, Questwahl, Flucht, Beziehungen.
- Der Erzähler darf gewöhnliche notwendige Teilschritte *einer ausdrücklich gewählten* Handlung ausführen, aber keine neue Entscheidung anhängen. Externe Kräfte können den Charakter aus nachvollziehbarer Ursache physisch beeinflussen.
- Narrative Perspektive im aktuellen Narrator-Preset: **Englisch, dritte Person, Vergangenheit**, konkrete Sinneseindrücke, glaubwürdiger Dialog, wenig abgenutzte Floskeln; keine Systemtracker als Erzähltext.
- Keine künstlichen Protagonistenprivilegien, kein erfundenes Wissen für Fremde, keine bequemen Questlösungs-Hinweise als Reaktion auf unausgesprochene Wünsche.
- Improvisation nur dort, wo Weltkanon und bisherige Ereignisse tatsächlich Raum lassen; einmal etablierte Namen, Orte und Ereignisse bleiben bestehen.
- Kämpfe und gefährliche Situationen können scheitern oder tödlich sein. Kein automatischer Plot-Armor.

**Testfigur vs. Weltkanon:** „Alaric Red“, 18-jähriger Mage mit blondem Haar und roten Augen, ist der häufige **Livetest-PC**. Seine Klasse, Level, Skillwahl, Ausrüstung und sein Schicksal sind keine zwingenden globalen Vorgaben für neue Kampagnen.

## 4. Allgemeines Pacing und Quality of Life

**[VERBINDLICH]** Das Problem unnötiger Zwischenmeldungen betrifft **alle** Abenteuerformen: Dungeon-Erkundung, Escort, Delivery, Culling, Suche und gewöhnliche Reisen.

- Bereits gewählte, ununterbrochene Handlung **innerhalb derselben Nachricht** über bedeutungslose Abschnitte fortsetzen, bis Ziel, relevanter Vorfall oder notwendige neue Spielerentscheidung erreicht ist.
- Ein Rascheln, unbestimmte Schritte, Spannung, verschwindendes Geräusch oder eine weitere leere Wegkurve sind **kein eigener Pflicht-Stopp**.
- Atmosphäre ist willkommen, aber sie soll beim Weitererzählen mitlaufen, nicht mehrere „I continue“-Nachrichten erzwingen.
- Ein Stopp ist richtig bei Gegnerkontakt, echter Gefahr, bedeutsamer Entdeckung, Weggabelung, offenem Angebot oder notwendiger Wahl.
- **Grenze:** „I enter the forest“ autorisiert kein eigenmächtiges Weiterlaufen zu einer Höhle; „I travel to the wolf den“ autorisiert ereignislose Zwischenabschnitte auf diesem gewählten Weg.
- Erfolg bei Suche muss eine konkrete Entdeckung oder einen brauchbaren Fortschritt liefern; wiederholte bedeutungslose Andeutungen sind keine gelöste Suche.
- **Automatisches Loot** nach den tatsächlichen besiegten Gegnern; keine wiederholte Eingabe zum Leichenplündern. Gewöhnliche Monster-Trophäen gehören dem Spieler als Loot und dienen nicht künstlich als Jagdbeweis.
- **Keine Traglastmechanik:** magischer Pouch / Inventory-QoL; kein Packgewicht, störende Last oder nötige Säckchen für automatische Beute. Bewusst getragene/equipte Gegenstände bleiben physisch.
- Keine unnötigen Beweis-, Unterschrift- oder Rückmeldepflichten für gewöhnliche Culling-/Hunt-Quests. Physische Lieferung/Reparatur kann selbstverständlich passende reale Übergabe-/Abnahmehandlungen haben.
- Keine unnötigen Mini-Dialoge zur Suche, Reise oder Verfolgung, wenn nichts zu entscheiden ist.

## 5. Kampf und Progression

**[VERBINDLICH]**

- Mechanik ist JS-owned: Reichweiten- und Deckungsbänder, HP/MP/STA, Initiative, Zugordnung, Schadensberechnung und tatsächliche Todes-/Fluchtzustände.
- Kein stilles Retargeting, wenn der Spieler ausdrücklich einen bereits toten Gegner benennt. Fehlgeschlagene/unerlaubte Aktionen dürfen keinen heimlichen Aufwand oder Ersatzangriff buchen.
- **V4-C: Kein festes mechanisches Temperament als Verhaltensskript.** Insbesondere kein unendliches automatisches Retreat-/Chase-Loop. Echte Flucht, Kapitulation und NPC-Intentionen folgen kausalem Verhalten/der Erzählung und der Engine-Policy. Keine automatische Feindseligkeit allein aufgrund von NPC-Rollenlabels.
- **[VERBINDLICH / in Patch 8.1 (.26) implementiert, echter GLM-Nachtest offen] Zusammengehörige Gegnergruppen kämpfen als Gruppe.** Greift der Spieler einen sichtbaren anwesenden feindlichen Monstergruppen-Gefährten an (z. B. zwei gemeinsam auftretende Glas-Käfer), treten die anderen Mitglieder derselben erkennbaren Gruppe ebenfalls in denselben Combat-Encounter und die Initiative ein. Nicht automatisch getroffen: Jeder bleibt eigenes Ziel mit eigenem Zug und eigenen Handlungen. Das gilt weltweit, nicht nur in System-Dungeons. Nicht per Gruppenzugehörigkeit allein beliebige Umstehende, neutrale Personen, räumlich getrennte oder nachweislich unbeteiligte Wesen zum Angreifer machen. Feindseligkeit und Kenntnis des Kampfes bleiben kausal; vorhandene Gruppen-IDs und Szenezugehörigkeit nutzen, ohne eigene neue Gruppen-KI.
- **Kapitulation ist kein getöteter Gegner und gibt keine Defeat-XP.** Ein späterer tatsächlicher Kill kann die dafür vorgesehene XP genau einmal geben; keine doppelten Auszahlungen.
- Monster behalten ihre tatsächlich erzeugte Stärke und Identität. Die Gefahr soll von Gebiet, Rang und Monsterprofil ausgehen, **nicht** automatisch Alarics Level folgen.
- Spieler mag **spürbare, eher zügige frühe Level-Fortschritte**. Bestehende XP-Skalierung nicht vorschnell abschwächen, insbesondere nicht als Nebeneffekt eines Dungeon-Patches.
- **Balancing/Scaling ist bewusst später dran.** Erst funktionierende Mechaniken und glaubwürdiges Spiel, danach breitere Zahlenanpassung. Keine pauschalen XP-Nerfs oder Anti-Farm-Diminishing-Returns ohne neue Designentscheidung.
- Defensive/Utility-Skills müssen langfristig mechanisch sinnvoll und für den Spieler verständlich einsetzbar sein; ein bekanntes Problem ist die Kombination normale Bewegung + Focused Ward sowie das Fehlen dieser Skills im Combat-HUD. **Nicht automatisch Teil von Patch 8**, siehe Projektstand.

## 6. Quests und Gilde

**[VERBINDLICH]**

- Gildenquests sind freiwillige, konkrete Weltaufträge; **keine verpflichtende Hauptquest** und kein passiver Questzwang.
- Gerade **Novice-Quests** müssen häufig tatsächlich testbare Spielaktionen anbieten: Monster-Culling, Monster-Clearance, Escort außerhalb der Stadt, Delivery mit Außenreise. Nicht überwiegend abstrakte Papierjobs oder endlose Mystery-Schleifen.
- Das bestehende Board-Schema besitzt ein **Tagesangebot** für den Spieler. Alarics sichtbares aktuelles Angebot soll nicht durch nachträglich erfundene andere Abenteurer verschwinden. Hintergrundaufträge und spätere Boardtage können sich entwickeln.
- **Gildenvertrag/-Slip**: Annahme, Auszahlung, Quest-XP/Promotion und Turn-in unter Engine Authority; Slips spiegeln den verbuchten Status. Ein ausgehandelter oder behaupteter Erfolg ist nicht automatisch Zahlung.
- **Culling-Zahl [IMPLEMENTIERT Patch 8/8.1; im Livetest weiter zu prüfen]:** Der Auftrag soll bereits am Board eine konkrete Monsteranzahl zeigen, etwa `Cull Wolves (4)`; nach Annahme den Engine-Zähler etwa `2/4`. Der Zähler muss mechanisch sein und auf passende Quest/Ort/Monster referenzieren, nicht nur Erzähltext.
- **Dungeon-Clear [IMPLEMENTIERT Patch 8; vollständiger GLM-Livetest offen]:** Etwa `Clear Old Crown Catacombs — Level 1`. Keine willkürliche Killzahl, wenn entscheidend ist, dass die Ebene tatsächlich cleared ist.
- **Keine Trophäenbeweise für Monsterjagden.** Andersartige Quests dürfen andere natürliche Formen der Bestätigung benötigen.
- Escort und Delivery haben tatsächliche Reise und potentiell kausal glaubwürdige Hindernisse, nicht automatisch Wetter-/Hochwasser-Standardszenarien oder erzwungene Kämpfe.
- NPC-Zeit, NPC-Interessen und Konkurrenz dürfen Weltzustände verändern, aber keine zuvor autorisierten und noch gültigen Spielerentscheidungen ausradieren.

## 7. Dungeon-Design: langfristig verbindliche Videospielstruktur

**[IMPLEMENTIERT Patch 8 (.25), Integration in Patch 8.1 (.26); kompletter echter Dungeon-Livetest noch ausstehend.]** Die folgende Richtung bleibt als verbindlicher Design-Kanon bestehen. Sie beschreibt die gewünschten Spielregeln, nicht die Behauptung, dass jede einzelne Mechanik bereits in einem echten GLM-Vollrun erfolgreich geprüft wurde.

**Gemeinsame Grundstruktur – individuelle Dungeons:**

- **System-Dungeons** sind echte, physische und **gemeinsame** Weltorte; keine für Alaric erzeugten privaten MMO-Instanzen.
- Ein **Gate/Zugang**, ggf. Teleport zum Inneren; maximal gleichzeitig zugelassene Teilnehmer; der Wert kann je Dungeon stark variieren.
- Mehrere beziehungsweise individuell viele Ebenen mit verbindlicher Raum-/Etagenstruktur; pro Ebene Gegner, Gefahren, Ressourcen, optionale Wege und erkennbare Fortschrittsbedingungen.
- **Minibosse/Wächter** und ein **Endboss**; keine willkürlich langen leeren Gänge zwischen wenigen Kämpfen.
- **Individuelle Resetzyklen** für Monster, Bosse und regenerierbare Ressourcen (z. B. täglich oder wöchentlich als Beispiele, keine globale Rang-Tabelle). Die Engine nutzt **Spielzeit** und verhindert widersprüchliche Resets bei aktiven Kämpfen/Anwesenden.
- **Gemeinsame Population:** andere Abenteurer besuchen denselben Dungeon, belegen Slots, räumen Monster oder Bosse und verändern Ressourcen – ohne eigene vollständige NPC-Simulationsmaschine.
- **Keine Levelanpassung** auf den Spieler. Rang-/Ebenenstärke ist unabhängig von Alarics Level/Gildenrang; gefährlichere Ebenen können tödlich sein.
- **Unterschiedliche Größe und Identität**: Dungeon-Theme, Levelzahl, Gateform, Kapazität, Resetintervall, Gruppen/Monstertypen, Boss und Ressourcen individuell. Kein universelles generiertes Zimmer-Template und keine fixe „drei Kämpfe pro Etage“-Regel.
- Die **Engine persistiert** Zugang, Etagen, wesentliche Gefahren, Bosszustände, Clears, Reset-Epochen, Loot und Belegung. Der **Narrator** gestaltet diese Welt frei innerhalb festgeschriebener Fakten.
- **Floor-Clear:** Eine Ebene gilt als abgeschlossen, wenn ihre **wesentlichen, vorher definierten Bedingungen** erfüllt sind, nicht erst wenn jedes zufällige Lebewesen getötet ist. Alternative glaubwürdige Lösungen bleiben möglich, wo das Ziel sie zulässt.
- Bereits von anderen erledigte Bosse stehen nicht auf magische Weise erneut für Alaric bereit. Kein XP-/Loot-Kredit für fremde Erfolge.
- Bekannte sichere Rückwege sollen zusammenfassbar sein; seltene Rückkehrsteine können nach etablierter Regel einen Rückweg ermöglichen, sind **kein** kostenloser Standardgegenstand.

**[VERBINDLICH] Abgrenzung zur Welt:** Natürliche Höhlen, Ruinen, Katakomben oder unterirdische Komplexe können frei erforschbar sein, ohne automatisch System-Gates, Kapazitätslimits und Resetzyklen zu bekommen. Die Lore unterscheidet **echte Dungeons** mit eigener Ökologie und davon solche **mit strukturierter magischer Progression**; Patch 8 soll diese Unterschiedlichkeit konsistent modellieren.

**[VERBINDLICH] Dungeon-Worldbuilding:** Dungeons sind über Avereth relativ verbreitet, regional unterschiedlich; niedrige Ranks häufiger, hohe seltener. Adel, Krone, Gilde, Tempel, Akademien, Händler usw. können Zugangs- oder Materialrechte besitzen. Gebühren nur mit Zustimmung. Die Gilde besitzt nicht jeden Dungeon. Themen, Gegner und Ränge sind weltkausal – keine unmotivierten Zufallsbegegnungen.

## 8. Welt, Lore und Klassen

**[VERBINDLICH]**

- High Fantasy mit Kontrasten aus sicheren Siedlungen, Handel, Familienleben, Politik, Wildnis, Monstern, Dungeons und mächtigen Ausnahmewesen. Kontinent **Avereth**, klassisches westlich-mittelalterliches Materialbild mit Mana/Magie, keine moderne Technik.
- Großmächte: menschliche Königreiche **Valedorn Crown, Caelreth, Duskreach**; Monsterreiche **Ashen Scale Dominion, Verdant Fang Court**. Kein monolithischer Mensch-gegen-Monster-Krieg; Bündnisse und Konflikte kreuzen Arten und Reiche.
- Neutrale, transnationale **Adventurers' Guild** als wichtige, nicht überall herrschende Institution. S-Ranks seltene, strategisch relevante Akteure; nicht für jedes kleine Problem ausrückende Plotretter.
- **Monster** ist eine mechanisch/ökologische Kategorie, **nicht** automatisch „feindlich“. Auch normale Wildtiere oder Nutztiere haben Level/Rank. Sapienz und Macht sind getrennte Dimensionen. Monsterpopulationen gehören zur Ökologie.
- Standard-Basisklassen: **Warrior, Mage, Guardian, Duelist, Ranger**. Fähigkeiten sollen aus Quellen auch klassenübergreifend lernbar sein; Class Affinity beeinflusst Lern-/Proficiencygeschwindigkeit und ist nicht bloß ein direkter Schadensmultiplikator.
- **[GEPLANT / Patch 9] Organic Classes:** spätere Evolutions-/Klassenpfade ergeben sich organisch aus tatsächlicher Entwicklung; **kein starrer vorausgeschriebener Evolutionsbaum**. Kreative Skillkombinationen und Charakterentwicklung unterstützen.
- Neue Figuren, Orte, Faktionen und Quests nur nach Bedarf entwickeln und anschließend konsequent als persistenten Kanon behandeln. Nicht die Welt vorschnell vollständig festschreiben.

## 9. UI und technische Komfortprinzipien

**[VERBINDLICH]**

- System-/Combat-Hinweise sollten lesbar und kompakt sein; die neuere CSS-Überarbeitung wurde beim Livetest positiv bewertet und darf nicht ohne Grund rückgängig gemacht werden.
- Während eines Kampfes kann das normale Character-/World-HUD durch ein **Combat-HUD** ersetzt sein. Dieses soll dem Spieler seine tatsächlich nutzbaren Skills und erforderliche Informationen sichtbar machen.
- **[GEPLANT / eigener Combat-/UI-Fix oder Patch 10B]** Nichtoffensive Fähigkeiten (Defense/Utility) samt Name, Kosten und kurzer Wirkung auch in der Kampfanzeige; das aktuelle HUD zeigt überwiegend Angriffsreichweiten.
- Zahlen und Ressourcen nur aus der Engine, nicht als improvisierte Trackertabelle des Narrators.
- Ein UI-Fix muss nicht zu einem großen Redesign führen; kleine nützliche Änderungen sind vorzuziehen.

## 10. Explizit unerwünschte Auswüchse

**[VERBINDLICH]** Keine Aufgaben oder Lösungen vorschlagen, die ohne klare Notwendigkeit folgendes einführen:

- permanentes „continue?“ für leere Reise-/Dungeonabschnitte;
- bloß für eine Quest zu sammelnde Beweistrophäen;
- Traglast, Inventarpacken oder unnötige Routineinteraktionen;
- automatische Kampf-Fluchtloops aus festem Temperament;
- Monster- und Dungeon-Skalierung auf den PC als versteckter Schwierigkeitsausgleich;
- anti-farming XP-Reduktion ohne neue Nutzerentscheidung;
- vollständige NPC-Welten-/Agentensimulation, globale Pathfinding-/Hexmap-Engine oder zweite State-Quelle;
- starre Dungeon-Templates, obligatorische Kämpfe nach festem Zähler;
- unnötige neue LLM-Calls nur zur Einhaltung künstlicher Spielschritte;
- allgemeines Balancing oder komplette Architektur-Rewrites als Nebeneffekt kleiner Bugs;
- autonome freiwillige Handlungen des Spielercharakters.

## 11. Lesen und Aktualisieren

Dieses Dokument beschreibt das **gewollte Produkt**, nicht automatisch den Stand von Git. Abweichungen zwischen diesem Kanon und `content/lore.json`, Narrator Contract oder aktueller Engine offen markieren und als geplante Arbeit einordnen. Besonders Patch 8, Patch 9 und große UI-Arbeiten sind zum Stand dieser Datei Zukunftsziele. Der bestätigte technische Iststand steht in Datei 03.
