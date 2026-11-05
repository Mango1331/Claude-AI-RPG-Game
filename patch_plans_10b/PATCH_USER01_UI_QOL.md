# Fachplan – UI und Gameplay-QoL nach User-Testrun 01

**05.11.2026 · Planung, keine Implementierungs-/Designfreigabe.**
Basis: Produkt **.155 / `62672d875ad02204c06d9b9f76425f1127572ad7`**. Mittlere Priorität, nach dem Bewegungs-Fachpaket des [Stealth-Plans](PATCH_STEALTH_ACTION_MANNER.md). Unabhängige UI-Teile benötigen keine neue Stealthmechanik.

## 1. Ausgangsbefunde und Abgrenzung

Quellen: [Review](../testrun_10b/user-20261104-162404/REVIEW.md), [Feedbackbewertungen](../testrun_10b/user-20261104-162404/USER_FEEDBACK_REVIEW.md), [Originalfeedback](../testrun_10b/user-20261104-162404/originals/Userfeedback%20Spielgef%C3%BChl.txt), [Chat](../testrun_10b/user-20261104-162404/originals/chat.jsonl), [Events](../testrun_10b/user-20261104-162404/originals/events.json). I bezeichnet den Chatindex ohne JSONL-Metadatenzeile.

| Bereich | Bestätigter Befund | Nicht daraus ableiten |
|---|---|---|
| Board I11/I67 | Fünf Einträge mit langen, wiederholten Ziel-/Risiko-/Belohnungstexten. Informationsmenge verständlich, Scannen umständlich. | Gefahren, Killtotal oder Auftraggeber seien überflüssig; Narrator dürfe offizielle Angebote ersetzen. |
| Dungeon-HUD I28/I32/I40 | Etage ist über Living-Dungeon-Daten bekannt und aufgeklappt sichtbar; kompakte Ortszeile zeigt bei Unterräumen häufig nur den Raumnamen. | Etage fehle im Zustand oder brauche einen zweiten Zähler. |
| Awareness | Enginezustand existiert; schnelle Zielanzeige zeigt ihn nicht bequem. | Concealed bedeute automatisch alle Gegner unaware oder garantierten nächsten Ambush. |
| Combat | Nutzer empfindet obere/untere Zielinformationen als doppelt. Gespeicherte aktive Kampfantworten enthalten jeweils **ein** Combat-HUD; vorhandener Filter entfernt bereits wiederholte COMBAT TARGETS-/Range-/HP-Snapshots. | Ein zweites Combat-HUD sei nachgewiesen oder der ganze obere Aktionsverlauf könne entfernt werden. |
| Raumfunde I26/I28 | Pick-head, Satchel, Wax jar, Trowel, Flask und Hinweisbrett sind als physische Objekte gespeichert. Eine bequeme Entscheidungsliste fehlt. | Fehlende Gegenstandspersistenz oder Bedarf eines neuen Lootgenerators. |
| Arcane Wave I19/I21 | Vier Beetles im einzigen belegten MEDIUM-Band; target=null wird ausdrücklich zurückgefragt, anschließend trifft der Angriff korrekt alle vier. | Kaputte Schadensberechnung oder pauschal überflüssige Clarify-Funktion. |
| Glimmerdeep-Neulistung | Day-2-Board bietet neuen Level-1-Clear-Vertrag vor Reset. Read-only-Gegenprobe: Annahme möglich, alter Clear erfüllt ihn nicht; Anzeige sagt irreführend „cleared by others“. | Auszahlungsexploit oder endgültig unerfüllbarer Vertrag: ein neuer Clear nach Annahme kann ihn erfüllen. |

Sols vorangehende Gegenprüfung bestätigte insgesamt 635 Events, 67 übereinstimmende Exportgruppen und 75 formal gültige Fold-Zwischenstände. Diese Vorbefunde sind von den **erst später auszuführenden** Abnahmetests dieses Plans zu unterscheiden.

## 2. Zielbild

Ein natürlich spielender Nutzer erkennt ohne wiederholte Panelabfragen:

- welches offizielle Angebot er vor sich hat, Ziel, Belohnung und wesentliche Gefahr;
- in welchem Dungeon und auf welcher tatsächlich gebuchten Etage er steht;
- welche sichtbaren Ziele in welchem Band stehen und welcher bekannte Awarenesszustand gilt;
- welche bereits etablierten freien Gegenstände hier liegen und warum manche nicht erreichbar sind;
- ob eine echte Auswahl nötig ist oder eine eindeutige AoE bereits ausgeführt werden kann.

Die UI ist eine **Projektion des vorhandenen Zustands**. Kein DOM-Text wird zur neuen mechanischen Wahrheit. Kein neues Menü wird Voraussetzung für natürliche Eingaben. Anzeigen/Klappen/Scrollen senden keine Modellanfrage und verändern keine Spielwerte.

## 3. Vorhandene Daten- und Renderpfade

Alle Pfade liegen unter `avereth-engine/` im [Produktcommit .155](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/62672d875ad02204c06d9b9f76425f1127572ad7).

| Pfad | Wiederverwendung |
|---|---|
| `src/v4/commands.js`: `boardCard`, `board.read`; `src/v4/guild.js`: `goalText`, Gefahren-/Vertragstexte | Die offizielle Boardkarte existiert bereits. Quest-ID, Status, Ziel, Auszahlung und Population bleiben die Quelle; kein zweiter Angebotsgenerator. |
| `src/v4/living.js`: `floorAt`, `hudRows`, `renewText`, `clearDone`; `src/v4/dungeon.js`: `trueDungeonOf` | Aktuelle Etage, bekannter Zyklus/Reset und Clear-Nachweis. Nicht aus Raumnamen oder Prosa raten. |
| `src/hud.js`: `worldRows`, `renderHud`, `combatHud` | World-Summary und aktive Kampfansicht sind getrennt: bei Combat ersetzt `combatHud` den normalen HUD. Etagenkennung deshalb **auch dort** berücksichtigen. |
| `src/display.js`: `worldPanel`, `targetQuestion`, `combatLines`; `src/host.js`: `displaySystemPanel`, `showPanel` | Obere Ereignisse, Zielnachfragen und gespeicherte HTML-/Textanzeige. Vorhandene Deduplikation und Plaintextfallback erhalten. |
| `src/v4/scene_handles.js`: `sceneHandle`, `tacticalHere`, `sideOf`, `attackTargetHere`, `skillAreaTarget` | Stabile Labels, lokale Sicht-/Zielauswahl und Gegner-/Neutralregeln. Relevanz allein macht niemanden feindlich. |
| `src/v4/domain.js`: `lyingAt`; `src/v4/catalog.js`: `buildCatalog`, `objectEntry`; `commands.js`: `take` | Ortsobjekte sind schon im Plannerkatalog. Dieser enthält **auch** eigene und NPC-gehaltene Dinge; für Bodenfunde nicht ungefiltert übernehmen. TAKE prüft Ort, Verwahrung, Behälter und Mengen. |
| `src/v4/planner.js`: `mapPlan`; `src/combat.js`: bestehende Band-/AoE-Auflösung | Die `target_band`-Abfrage gibt bei null heute unmittelbar `no_target` zurück. Eine eindeutige Bandauflösung gehört hierhin und benötigt mechanische Tests, nicht CSS. |

Kein UI-Framework, neues Zustandsmodell oder allgemeiner Refactor von `world.js`. Ein kleiner gemeinsamer Anzeige-/Verfügbarkeitshelfer ist sinnvoll, wenn er nachweislich doppelte oder auseinanderlaufende Auswertung vermeidet.

## 4. Paket U1 – Board, Ort und taktische Informationshierarchie

### A. Offizielles Board übersichtlich darstellen

**Empfehlung:** Fünf kompakte Engine-Karten mit Titel, Ziel und Belohnung als erster Ebene; Details aufklappbar. Kein neues Pflichtmenü.

| Immer sichtbar | In Details, weiterhin erreichbar |
|---|---|
| Titel und Questtyp; Rang; Belohnung; konkretes Ziel/Zielort | Auftraggeber; vollständige Bedingungen; längere Erläuterungen/Reports |
| Jagd: benötigte Kills insgesamt und **gemeldete** individuelle Levelspanne | Herleitung/weiterer Risikobericht, soweit bereits bekannt |
| Auffällige Warnung bei bekanntem gefährlichem Gruppenrisiko oder relativ hohem Level; keine Siegchance | Vollständige vorhandene Gefahrenhinweise, nicht gekürzt aus dem Prompt-/Questvertrag |
| Räumung: Dungeon und Etage; bekannter bereits geräumter Zyklus / neue Räumung nötig | Bekannter Reset und bisheriger Clear, ohne neue versteckte Population offenzulegen |

Visuelles Textbeispiel, **keine neuen Balance-/Questdaten**:

```text
Put Down the Cairn Field Ghouls                 320 cp
Novice · Jagd · 3 Kills insgesamt · gemeldet L8–11
Old Cairn Field · Gruppen können gefährlich sein
[Details]
```

Umsetzung:

1. Bestehende Questdaten einmal in der Anzeige gliedern. Die Relation „Killtotal ist keine gleichzeitige Gruppengröße“ bleibt sichtbar verständlich; eine gemeinsame Boardlegende spart identische Sätze pro Eintrag. Auftragspezifische Warnungen nicht darin verstecken.
2. Strukturierte Daten bis zur vorhandenen Rendergrenze verwenden; keine Questdaten aus Narratorprosa, fertigem HTML oder regexzerlegten langen Boardzeilen zurückgewinnen. `boardCard` behält einen sauberen Plaintextfallback. Für HTML die bestehende Render-/CSS-Struktur erweitern; die einmal gezeigten Quest-IDs bleiben dieselben.
3. Titel zuerst, dann Ziel/Preis/Risiko. Keine neue Sortierung nach vermeintlich garantierter Gewinnchance, keine automatische Questwahl. Farbkennzeichnung zusätzlich mit Text; lange Namen umbrechen, keine nur per Hover lesbaren Pflichten.
4. Einklappen/Details dürfen keine Board-Neugenerierung, kein Reroll und keine Annahme auslösen. Historische Nachrichten bleiben ihre gespeicherte Darstellung; nicht beim späteren Öffnen ungeprüft mit heutigen Angeboten ersetzen.

**Erneute Clear-Angebote:** `clearDone().ok` und die Prüfung „Clear seit Annahme“ unverändert lassen. Anzeigezweig für einen älteren eigenen Clear von „cleared by others“ trennen: „In diesem Zyklus bereits von dir geräumt; dieser neue Vertrag braucht eine weitere Räumung nach Annahme.“ `renewText` nur verwenden, wenn Zyklusdaten bekannt sind; überfällige/verschobene Erneuerung als pending, nicht als garantierten Reset anzeigen. Im Originalboardzeitpunkt wären rund 52 Ingame-Stunden bis zur normalen Erneuerung übrig. Keine Listung verbieten, zurückziehen oder automatisch erfüllen. Wenn dafür der Rückgabetext von `clearDone` geändert wird, `.ok`, Credits und Auszahlung nachweislich identisch halten.

### B. Etage dauerhaft erkennbar

- Einen kleinen reinen Anzeigehelfer aus `trueDungeonOf(state, state.scene.at)` und `floorAt` ableiten: `Glimmerdeep Grotto · Etage 1 · pillar-field chamber`.
- In eingeklappter World-Summary, geöffnetem World-HUD und **aktiver Combatüberschrift** nutzbar. Die Raumbezeichnung bleibt sichtbar; keine zweite Liste aller Floors in jeder Zusammenfassung.
- Am Gate entsprechend „Eingang“, nicht Etage 1 behaupten. **Codepräzisierung:** `floorAt` liefert dort 0, sonst die positive `place.level` oder den bestehenden Enginefallback 1. Auch diesen Fallback konsistent spiegeln, keine neue Ermittlung/Änderung der Etagenregeln im UI-Patch. Ohne gültige Dungeonzuordnung kein geratenes Etagenbadge; „up/down“ in Prosa ist keine Etagenbuchung. Nur `scene.moved`/Fold können die Anzeige umstellen, kein `arrived:false` und kein Prosa-Szenenlabel.
- Bestehende Kapazitäts-/Reset-/Zugangsinfos behalten; dauerhaft kleine Etagenkennung ersetzt nicht die ausführliche Eingangskarte.

### C. Awareness in der Zielansicht

- Vorhandene stabile Handles und gültige aktuelle Position verwenden, pro sichtbarem Ziel ein kurzer Zusatz: `unaware`, `suspicious`, `aware`; nicht gesetzter Zustand: `nicht festgestellt`.
- Nur bereits sichtbare/zulässigerweise bekannte Ziele. Keine versteckten Gegner, Detectionwerte, geheimen Absichten oder unbekannten Verstärkungen neu anzeigen.
- PC-Concealment ist kein Ersatz für die Awareness jedes Beobachters. Beispiel: erfolgreicher Check gegen einen zuvor aware Gegner kann nur suspicious ergeben; UI darf kein „Ambush sicher“ daraus machen.
- Aktive Kampfposition/HP stammen aus `encounter.combatants[*].current`, nicht aus möglicherweise älteren `scene.positions`. Vor Kampf gilt Scenezustand. Keine automatische Feindlichkeit durch eine Farbe oder „Target“-Zeile.
- Wiederverwendete Formatter für normale Targetanzeige, Rückfrage und Kampfansicht verhindern unterschiedliche Namen/Zustände; keinen neuen Wahrnehmungszustand persistieren.

### D. Combat-Redundanz zuerst visuell prüfen

Als erster Umsetzungsschritt die **gespeicherten `extra.display_text`** von I34/I42/I44 im realen ST-Renderer ansehen. `record.panel` enthält absichtlich die vollständige Plaintextversion; es allein beweist keine sichtbare Dopplung. `showPanel` erkennt bereits `avereth-combat-hud`, `displaySystemPanel` filtert die doppelten Momentaufnahmen.

Empfohlene Zuständigkeit: **oben Ereignisverlauf**, **unten eine aktuelle taktische Momentaufnahme**. Schadens-/Kostenzeilen, Warnungen, Nichtausführung und Gegnerbewegungen oben behalten, auch wenn dabei ein Zielname/HP vorkommt. Sie erklären den Zustand. Doppelte identische Snapshotzeilen nur dort entfernen, wo sie im tatsächlich gerenderten Ergebnis noch auftreten. Außerhalb Combat die erste sichtbare Ziel-/Rangeanzeige bewahren; nach Kampfende normalen HUD wiederherstellen. Wird keine neue Dopplung reproduziert, nur klar begründete Abstands-/Gewichtungsänderungen, keine neue Filterserie.

## 5. Paket U2 – bereits vorhandene Umgebungsgegenstände

### Varianten und Empfehlung

| Variante | Vorteil | Kosten / Grenze |
|---|---|---|
| **Kompakte Liste „Hier aufnehmbar“**, normale Texteingabe | Kleinster Eingriff; natürliche Entscheidung, keine neuen Systembefehle | Spieler muss den Gegenstand selbst benennen. **Empfohlener erster Umfang.** |
| Aufklappbare Liste mit optionalem „Nehmen“-Textvorschlag im Eingabefeld | Komfort, weniger Verwechslungen; Spieler kann Menge/Handlung noch ändern | Click-/ST-Composerintegration und Barrierefreiheit zusätzlich testen. Erst nach UI-Entscheidung. |
| Sofortkaufähnlicher direkter „Nehmen“-Button | Ein Klick | Neuer Ausführungseinstieg mit Edit-/Swipe-/Saveschutz und Mengenwahl. Für diesen ersten UI-Schritt nicht empfohlen. |

Keine Variante nimmt automatisch Gegenstände auf. „Liegen lassen“ bedeutet zunächst **nichts verändern**, nicht Objekt löschen oder aus der Welt entfernen.

### Technische Umsetzung

1. `lyingAt(state, state.scene.at)` als Startmenge, nicht alle Katalogobjekte. Nur vorhandene positive Mengen am kanonischen aktuellen Ort und dem Spieler bereits etablierte Gegenstände. Nicht PC-Inventar, Händler-/NPC-Verwahrung, anderer Raum oder verborgener Behälterinhalt.
2. Orts-/Verwahrungs-/Behälterprüfung von `commands.take` möglichst als kleinen **reinen** Verfügbarkeitshelfer herausziehen und für Anzeige **und** TAKE verwenden. Die tatsächliche Übergabe bleibt im bestehenden Handler; Anzeige prüft weder durch Probebuchung noch durch Ausführen des Handlers. Questware nicht pauschal verbieten: freie erreichbare Ware darf angezeigt werden, vorhandene Bindungen bleiben bestehen.
3. Bekannter Inhalt eines noch geschlossenen Behälters ist nicht „aufnehmbar“. Optional getrennt mit „Behälter zuerst öffnen“, ohne versteckte Inhalte zu verraten; für den kleinsten Umfang aus der aufnehmbaren Liste auslassen. Eine Katalogreferenz allein ist keine Zugriffsberechtigung.
4. Kompakte, nach neuen Suchfunden gut sichtbare Ortsliste mit Name, Menge und gegebenenfalls bekanntem Behälter. Längere Listen aufklappen; keine dauernd offene Wand aller Weltdinge. Bei TAKE/DROP/Ankunft aus demselben State neu ableiten; keine zweite Funddatenbank und kein Wiedereinfügen bereits genommener Gegenstände.
5. Falls Textvorschläge gewählt werden: nur Eingabefeld befüllen, nicht heimlich senden oder einen neuen `#take`-Buchungspfad erfinden. Stabile Identität intern behalten, natürlich lesbaren Namen verwenden; bei Namensgleichheit die vorhandene Auflösung/Clarify schützen. Im Zweifel keine automatische Objektwahl.

Normales `take`, Teilmengen, geschlossene Behälter, Inventar, Replay und Eigentum gelten unverändert. Automatisches Combat-Loot wird nicht als weiterer freier Bodenfund angeboten. Keine neue Lootchance, Objektwertberechnung oder garantierte Beute.

## 6. Paket U3 – eindeutiges Band-AoE ohne unnötige Zielnachfrage

**Kleine mechanische Ergänzung**, unabhängig von CSS/U2. Kein allgemeines Umschreiben der Kampfauswahl.

1. In `mapPlan` den heutigen frühen `no_target`-Zweig für `target_band` nur für den wirklich eindeutigen Fall ergänzen. Bereits ausdrücklich genannte IDs/Ziellisten haben Vorrang; ein ungültiges oder abwesendes benanntes Ziel darf niemals durch einen anderen Gegner ersetzt werden.
2. Kandidaten mit vorhandenen Ziel-, Reichweiten-, Sicht-/Deckungs- und Gegnerregeln ermitteln: außerhalb Combat Scene-/Side-Daten, im Kampf Encounter-/Side-Daten. `skillAreaTarget` und die bestehenden Vor-Kampf-/AoE-Prüfungen bleiben maßgeblich. Keine NPCs nur wegen Relevanz automatisch feindlich machen.
3. **Nach der bereits erlaubten und eindeutig bestimmten Bewegung** muss genau ein gültiges erreichbares Gegnerband übrig bleiben. Ein stabil gewählter vorhandener Gegner daraus ist lediglich Anker desselben Bandangriffs; der Schlag trifft danach weiterhin die Engine-Zielmenge. Keine zusätzliche Bewegung zum „Passendmachen“, kein mehrmaliger Angriff.
4. Die Bewegungs-/Bandprüfung zunächst ohne Mutation ausführen bzw. die vorhandene Vorschau wiederverwenden. Eine Rückfrage verbraucht keine Bewegung, Ressourcen, Würfe oder Gegneraktion außerhalb der ohnehin geltenden Combat-Verarbeitung. Die Ergänzung darf bestehende Initiative-/Gegnerturnregeln nicht neu gestalten.
5. Null gültige Ziele: bisherige sichere No-target-Meldung. Mehrere erreichbare Gegnerbänder oder unbestimmte Bewegung: bestehende gezielte Clarify erhalten. Freundliche/neutrale Personen bleiben ausgespart, außer der Spieler autorisiert deren Angriff ausdrücklich. Keine Übertragung auf physische Explosivgegenstände, Fallen oder Umweltwirkungen.
6. Planneranweisung abstimmen: Sie sagt heute „area skill needs no target (null)“, während die Auflösung für `target_band` zwingend ein Ziel fordert. Erlaubten eindeutigen Nullfall beschreiben, ohne Pronomen mit einer neuen Regexliste zu interpretieren. Der Planner versteht „them“, die JS-Engine prüft die mechanische Eindeutigkeit.

Originalabnahme: genau die vier bereits anwesenden MEDIUM-Beetles, bestehende Arcane Wave, eine echte Ausführung mit denselben Kosten/Zielregeln; keine neue Wahl eines abwesenden Gegners. Bei mehreren Bändern ist Rückfrage ausdrücklich korrekt.

## 7. Reihenfolge, Abhängigkeiten und Risiko

| Fachpaket | Umfang | Abhängigkeiten / Risiko |
|---|---|---|
| **U1** | Board-Hierarchie, Etagenkennung, Awareness und tatsächlich belegte Combat-Redundanz gemeinsam betrachten | Niedrig bis mittel: reine Anzeige plus begrenzte Korrektur falscher Clear-Erklärung. Keine Änderung von Quest-/Reset-/Kampfentscheidungen. |
| **U2** | Ortsobjekte sichtbar machen, bei Bedarf kleine gemeinsam genutzte TAKE-Verfügbarkeit | Niedrig bei Liste, mittel bei Eingabeknöpfen. Eigentums-/Container-/Namensgrenzen sind zentral. Kein Bedarf, dafür neue Stealth- oder Lootmechanik abzuwarten. |
| **U3** | Deterministische Auswahl des einzigen gültigen AoE-Bands | Mittel: berührt Zielautorität, Bewegungsvorschau und Kampfeintritt. Eigene mechanische Regressionen; unabhängig von Board-/Lootlayout. |

Empfehlung: nach Stealth-S1 **U1**, danach U2 und separat abgenommenes U3; U2/U3 können je nach gewünschtem Nutzen auch in umgekehrter Reihenfolge umgesetzt werden. Keine Mini-Builds pro CSS-Korrektur oder pro HUD-Zeile. Nicht alle QoL-Teile an eine einzige große gemeinsame Freigabe koppeln.

## 8. Regressionen und konkrete Abnahme

Bei späterer Umsetzung gezielte Rot-/Grün-Fälle auf der dann aktuellen Basis. Funktionierende Gegenfälle als Kontrollen erhalten. Keine heute schon bestandenen neuen Tests behaupten.

| Paket | Prüfungen |
|---|---|
| U1 Board | Originale Day-1/Day-2-Boards: identische Quest-IDs, Ziele, Rang, Auszahlung und Warnungen. Killtotal vs. sichtbare Gruppengröße getrennt; lange Namen, fehlender Bericht, hohes bekanntes Level, aktive Konflikte und Plaintextfallback. Aufklappen ohne Event/Modellcall. |
| U1 Clear | Neuer Glimmerdeep-Vertrag vor Reset: alter eigener Clear erfüllt ihn nicht, verständliche Erklärung; fremder Clear weiterhin fremd; neuer qualifizierender Clear seit Annahme erfüllt ihn wie zuvor. `.ok`, Geld, XP und Events bleiben gleich; unbekannter oder aufgeschobener Reset wird nicht als genaue Zusage angezeigt. |
| U1 Ort | Eingang, Unterraum ohne Etage im Namen, bestehender `floorAt`-Fallback bei fehlendem `place.level`, echter Etagenwechsel, Rückkehr, aktiver Combat, `arrived:false` und verworfener Ortswechsel. Ohne Dungeon keine geratenen Angaben; kein Spoiler höherer Etagen. |
| U1 Awareness | unaware/suspicious/aware/unbekannt; mixed observers und `.155`-Erfolg/Fehlschlag; versteckte Ziele, neutrale NPCs, abwesende/dead/escaped Gegner. Vor und während Combat korrekte Quelle, kein Ambush-Versprechen. |
| U1 Combat | Reale gespeicherte HTML-Ansichten I34/I42/I44 sowie echter Renderer: eine führende taktische Momentaufnahme, vollständiger Aktionsverlauf/Refusals erhalten, normales World-/Target-HUD außerhalb Combat unverändert. Nicht nur `panel`-Rohtext prüfen. |
| U2 Objekte | Originale Höhlenfunde sichtbar, tatsächlich frei erreichbare Dinge auswählbar; NPC-/PC-gehalten, anderes Zimmer, geschlossener/versteckter Behälter und bereits genommenes Loot nicht als frei anbieten. Teilmengen, gleiche Namen, Questbindung, Ankunft und DROP. Liste erzeugt keine Items/Events; bestehender TAKE bucht genau einmal. |
| U2 Bedienung | Kein Autosenden/Autoloot, Klappzustand ohne Storyturn. Bei Textvorschlag: Menge/Name editierbar, sichere HTML-Escapes, keine Handler aus Objekttext erzeugen. |
| U3 AoE | Original-Beetles bei MEDIUM ohne Nachfrage; mehrere Bänder → Clarify; ein Band außerhalb Reichweite; voller Sichtschutz; gemischte Seiten; gezielter NPC-Angriff; ausdrücklich falsches/abwesendes Ziel; normale Cleave-/Bandgrenzen, begrenzte Bewegung und aktive Initiative. Einmal Kosten/Schaden, physische Bursts unverändert. |
| Gemeinsam | Reload/Swipe/Edit/Regenerate: keine Doppelitems/-angriffe, keine neuen Quests oder Zustände nur durch Rendering. Gleicher Event-/State-Fold, ausschließlich begründete Anzeigeabweichungen bzw. gezielte U3-Ausführungsänderungen. |

Angrenzende Dateien: bestehende HUD-/Display-/10A-Tests, `patch_aoe116`, Combat-QoL `.148`, Guild-/Dungeon-, TAKE/Feature- und aktuelle Planner-/Hostregressionen. Danach bei Produktumsetzung Vollsuite, vollständiger Fingerprint-Replay mit einzeln erklärten Abweichungen und relevante echte ST-Standard-/Failsoft-Smokes. **Zusätzlich visuell** in isoliertem ST 1.19: eingeklappt/aufgeklappt, laufender Kampf, längere Namen, schmaler Chat und Tastaturbedienung. DOM-Stringtests allein belegen keine gute Darstellung.

Für reine U1-/U2-Ansicht muss ein semantischer State-/Geld-/Quest-/RNG-Vergleich gleich bleiben. Text-/HTML-Fingerprints nicht pauschal erneuern; Änderungen ihrem jeweiligen Renderer zuordnen. U3 darf genau die beabsichtigte reale Ausführung gegenüber einer früheren Zielrückfrage ändern, nicht andere Kampfziele still ersetzen. Ein Mock-Host-Smoke ersetzt keinen persönlichen Spielbarkeitseindruck.

## 9. Übernommene Entscheidungen

1. **Board:** Kompakte Karten mit nativen aufklappbaren Details und Plaintextfallback. Gefahrenkern bleibt sichtbar.
2. **Bodenfunde:** Kompakte Liste vorhandener erreichbarer Dinge, natürliche TAKE-Eingabe; keine Sofortbuchungsbuttons oder neue Lootgenerierung.
3. **U3:** Genau ein mechanisch gültiges Gegnerband darf ohne ausdrückliche Zielwahl automatisch gewählt werden. Mehrdeutige oder ausdrücklich ungültige Ziele bleiben geschützt.

Diese Entscheidungen sind mit dem Gegenfeedback angenommen und in U1–U3 umgesetzt; technische Produkt-/Abnahmelinks unten. Etage und Awareness verwenden vorhandene Daten, „nicht festgestellt“ bleibt eine sichere Anzeigegrenze.

Keine Änderung an NPC-Memory/Beziehungen, Gasthaus-Finanzparsern, XP/Startwerten/PP, LONG-Raumgeometrie, Lootgenerierung, Dungeonreset/Questpublication oder allgemeiner Kampfarchitektur. Engine-Shops bleiben im [eigenen offenen Fachplan](FACHPLAN_ENGINE_SHOPS.md). Der vorliegende Plan ist kein Auftrag, diese Nebenbereiche gleichzeitig zu bearbeiten.


## Umsetzung nach Gegenfeedback (05.11.2026)

Das angenommene Gegenfeedback vom 04.11.2026 übernimmt Karten mit Details, eine reine Bodenfund-Liste und automatische Auswahl ausschließlich eines eindeutigen gültigen Gegnerbands. U1–U3 sind zusammen in .157 umgesetzt; Combat-Log und bestehender Snapshot-Filter erhalten. Keine Sofortbuchungsbuttons, neue Funde, NPC-/Finanzmechaniken oder Dungeonreset-Regeln. Produkt- und Abnahmelinks in [03](../03_AKTUELLER_PROJEKTSTAND.md).
