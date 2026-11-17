# Fachplan: erste gemeinsame Action-HUD-Umsetzung auf Avereth .200

**17.11.2026 · implementierungsreife Entscheidungsvorlage, noch keine Implementierungsfreigabe.** Nach diesem Plan folgen unabhängiger GPT-Gegenreview und ausdrücklicher Nutzerauftrag. Produkt, Spielregeln und Versionsnummer wurden nicht geändert.

## 1. Grundlage, Arbeitsstand und verbindlicher Schnitt

Remote-Abgleich dieser Planungsrunde:

| Referenz | Geprüfter HEAD / Verwendung |
|---|---|
| `main` vor Dokumentationsänderung | `1f9d15918bb5ec45dff213318485a78541caa980` |
| `claude/c-planner-prototype-2026-10-02-gpt-c666` | `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`, Build `4.3.0-c.6.6.200` |
| Archiv `experiment/dynamic-gm-model` | `d8baa91ffa595ecf6076266ceed9e04ef164778e`, unverändert |
| **Neu: `experiment/action-hud-200-v1`** | Vom geprüften Produkt-HEAD angelegt und als unveränderter Branchzeiger gepusht; **kein Implementierungscommit** |
| Separater Entwicklungscheckout | `/workspace/avereth-action-hud`; Engine darunter in `avereth-engine/`; sauber auf demselben Produkt-HEAD |

Der bisherige Produktcheckout und die archivierten Experimente bleiben erhalten. Keine Alpha-Dateien, Module, Prompts, Journale oder Modellarchitektur übernehmen. Die weitere Implementierung erfolgt ausschließlich auf dem neuen Entwicklungsbranch; dieser Fachplan und seine Indexeinträge liegen auf `main`.

Maßgeblich sind der aktuelle Nutzerauftrag, [08](../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md), die [vollständige Abschlussanalyse](../recherche/ANALYSE_200_VEREINFACHUNG_UND_NARRATORFREIHEIT_2026-11-17.md), [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [02](../02_DESIGN_KANON.md), [03](../03_AKTUELLER_PROJEKTSTAND.md) und die gezielt über [06](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) gelesenen Quellen. **Der neue Auftrag verengt die ältere Analyse:** kein Memoryeditor, kein Extractor-Skip und keine neuen rückwirkenden Welt-/Zahlungsrechte im ersten Patch. Die weitergehenden Empfehlungen der Analyse werden damit nicht vorweg umgesetzt.

**Liefergegenstand nach späterer Freigabe:** eine gemeinsame typisierte Eingabe für Angriff, vorhandene Verteidigungsfähigkeiten, einfache taktische Bewegung und vorhandene Gegenstandsnutzung; zwei verständliche Textmodi im normalen ST-Composer; vorhandene deterministische Auflösung; konsistente Agency; technische Request-/Speicherabsicherung und kompakter Weltabschlussstatus. Der Extractor bleibt für reguläre Narratorantworten aktiv. Freie Eingaben ohne HUD behalten den bisherigen Weg.

**Nicht enthalten:** Main/Minor, neue Konter-/Laueraktionen, neue Skills oder Checks, Balance, Shops, freie Zahlungsbuchung, Reise-/Ortslockerungen, vollständiger NPC-Editor, neue alternative Swipe-Semantik, ein allgemeiner Sequenzeditor oder eine neue GM-Architektur. TAKE-/Questboard-Entwurfsbuttons bleiben funktionsfähig; sie werden hier nicht sämtlich umgestellt.

## 2. Evidenz und tatsächliche Eingriffspunkte

**In dieser Runde selbst geprüft:** aktuelle Git-HEADs, Produktcode am genannten Commit, ST-1.19-Quellcode im vorhandenen isolierten Sandbox-Checkout. ST-Commit dort: `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Paketversion `1.19.0`. Keine persönliche ST-Konfiguration gelesen. Keine neuen Browser-, Gameplay- oder Modelltests ausgeführt. Alle nachstehenden Testfälle sind **Abnahmeaufträge**, keine bestandenen Ergebnisse.

Historische Spielerbefunde und Testzahlen werden als übernommene Quellen verwendet. Der unabhängige Gegenreview und das präzisierte Nutzerziel sind Grundlage des Auftrags; frühere Vorschläge ersetzen keine Prüfung des tatsächlichen Codes.

Alle Produktpfade der folgenden Tabelle liegen unter [`avereth-engine/` am Produktcommit](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine).

| Bestand | Nachgewiesener Anschluss / Konsequenz |
|---|---|
| `index.js::mountSettings()` (ab Z. 591) | Baut bereits `inline-drawer` in `#extensions_settings2`. Technische Einstellungen bleiben dort; kein neues Chat-Einstellungsfenster. |
| `src/hud.js::combatHud()` | Gegner-/Teilnehmer-IDs, Bänder, Deckung, Awareness, Initiative und `pc.fixed.actions` vorhanden. Skills bisher nur `span`-Anzeige. Aktionsauswahl ergänzt diese Daten, ersetzt weder Kampfprotokoll noch HUD. |
| `src/ui_actions.js::installDraftActions()` | Vorhandene `data-avereth-draft`-Buttons schreiben Sätze in `#send_textarea`, ohne Senden/Buchung. Dieser Weg wird erhalten, aber ist **kein** typisierter mechanischer Vertrag. |
| `src/v4/runtime.js::prepareGenerationAsync()` | V4-C plant regulären Freitext; Creation, Tod und `#`-Befehle sind Sonderwege. Wiederverwendung bisher wesentlich über `hash32(msg.mes)`. HUD-Daten müssen zusätzlich in die Eingabeidentität eingehen. |
| `runtime.js::plannedTurn()` | `planMessage` → `guardCommands` → `mapPlan` → `playerTurn` oder `playerTurnV4` → `withGrowth`. Nicht nur eine Combatfunktion aufrufen: Abschluss, Skillentwicklung, Dungeon-/Lootfolgen müssen erhalten bleiben. |
| `src/v4/planner.js::mapPlan()` | Liefert bestehende Intents `attack`, `skill`, `move`, `item` bzw. V4-Kommandos. Enthält **auch Sprachheuristiken**, etwa `skillHint`, Bewegungszitate und `itemAttack`; ungeprüftes Füttern mit erfundenen Quotes wäre kein sauberer HUD-Pfad. |
| `src/engine.js::playerTurn()`, `src/combat.js` | Vorhandene Auflösung einschließlich Initiative, Ressourcen, RNG und Kampfabschluss. `attackAction`, `skillAction`, `moveAction`, `itemAction` bleiben fachlich maßgeblich. |
| `src/v4/items.js`, `src/v4/commands.js::use`, Growthpfad | Besitz, Profile, `restoreOf`, `restoreEffect`, `useOf`, Rangsperren, Return-/Skill-Stones bereits vorhanden. Nicht jeder Gegenstand ist ein Heiltrank und nicht jede Nutzung eine Kampfaktion. |
| `src/host.js::rec/setRec/syncSwipe/messageEvents`, Runtime `historyKey/onEditedV4` | Autoritative Events bleiben im Chat-/Swipe-Record; keine zweite Weltzustandsbank. Eingabehash, Revisionsbindung und Saveprüfung müssen dieselbe HUD-Metadatenfassung sehen. |
| `index.js::v4Llm/averethInterceptor`, `src/v4/world_jobs.js`, `narrator_recovery.js` | Bestehende Sperren und begrenzte Recoveries, aber keine vollständige Kapazitätskoordination aller physischen Requests. Der native Narrator läuft separat; sein vorhandener Fetchbeobachter erfasst nur einen engen nichtstreamenden Recoveryfall. |
| `src/v4/continuation.js::verifySavedChat/savedPrefixMatches` | Tatsächliches `/api/chats/get` existiert, wird bislang nur in ausgewählten Fehlerpfaden genutzt. Seine Signatur umfasst noch keine neue HUD-Eingabe und prüft nicht vollständig alle Swipevarianten. |
| `src/context.js::playerActionsBlock`, Narratorvertrag, V4-Preset | Mehrere Agency-Anweisungen müssen dieselbe Bedeutung bekommen. Eine neue Description allein beseitigt den Widerspruch zu „he decides nothing else“ nicht. |

**Zwei konkrete Hostbefunde, die den Implementierungsweg bestimmen:**

1. ST `Generate()` emittiert `GENERATION_AFTER_COMMANDS`, liest/leert danach das Textfeld und ruft `sendMessageAsUser()` auf. Diese Funktion speichert **vor** `MESSAGE_SENT`. Erst später ruft ST `runGenerationInterceptors()` auf. Nur im Interceptor auf die aktuell gewählte HUD-Aktion zu schauen wäre zu spät und nach Chat-/Draftwechsel gefährlich.
2. `getContext().saveChat` ist `saveChatConditional`, kein zielgebundenes `saveChatFor`. Es wartet auf andere Saves und liest anschließend aktive ST-Globals. `saveChat()` fängt zudem Fehler intern. Ein aufgelöstes Promise beweist daher weder korrekten Zielchat noch Persistenz. ST `/api/chats/save` und `/api/chats/get` nehmen dagegen explizite `avatar_url`-/`file_name`-Identität. Der Integrity-Slug ist **keine** Versions-CAS gegen parallele Autoren.

ST-Quellen: [Generate/Send/Save](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js), [Extensions/Interceptor](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/extensions.js), [Context-API](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/st-context.js), [Chat-Completion-Transport](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/scripts/openai.js), [Chatendpunkte](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/src/endpoints/chats.js). Das ist ein **Code-Machbarkeitsbeleg**, noch kein Browsernachweis des neuen Adapters.

## 3. Bedienung: bestehende Extension, eine kompakte Auswahl

### 3.1 Vier getrennte UI-Aufgaben

| Oberfläche | Geplanter Inhalt |
|---|---|
| **Erweiterungen → Avereth Engine** | Bestehendes aufklappbares Settingspanel einschließlich Debug/Export. Allenfalls wenige neue technische Optionen; keine dauerhaft eingeblendeten Settings im Chat. |
| **Gameplay-HUD** | Vorhandene Character-/World-/Combat-/Dungeon-/Quest-/Lootinformationen, Zielzustände und Ereignisverlauf erhalten. Weder Hilfsbuttons noch Statusmeldungen entfernen notwendige Informationen. |
| **Normaler Composer** | Kleine aufklappbare Aktionsauswahl und ein entfernbarer Auswahlbaustein, z. B. „Flame Lance → Goblin A“. `#send_textarea` bleibt das einzige freie Texteingabefeld. |
| **Abschlussstatus** | Eine kurze Zeile am Composer: „Aktion wird aufgelöst“, „Erzählung läuft“, „Weltabgleich läuft“, „Speichern“, „Gespeichert“ oder konkreter Fehler. Technische Details nur auf Anforderung. |

`mountSettings()` wird nicht neu gestaltet. Die tatsächliche ST-Seite enthält den erwarteten Erweiterungscontainer. Erweiterung deaktiviert oder keine unterstützte Kampagne: keine störende Aktionsleiste. Historische Antwort-HUDs dürfen Auswahlentwürfe anstoßen, aber **nie ihren alten Zustand ausführen**; Auswahl immer gegen den aktuellen Fold prüfen und veraltete Ziele benennen.

Ein Klick wählt nur. Erst **einmal Senden** verbindet Auswahl und Text. Keine Pflichtbestätigung für einen gültigen eindeutigen Angriff. Auswahl, Modus und Begleittext bleiben sichtbar korrigierbar, solange noch nicht ausgeführt. Auch bei zu wenig MP darf die Fähigkeit als nicht verfügbar mit Grund sichtbar bleiben; der Auswahlweg erfindet keine Ersatzfähigkeit.

### 3.2 Zwei Eingabewege, keine automatische Bedeutungsbehauptung

**Weg H – „HUD + Begleittext“:** Der Nutzer wählt diesen Modus ausdrücklich; die Wahl bleibt am Baustein sichtbar und muss nicht jede Runde erneut bestätigt werden. Die Auswahl bestimmt die vollständige eigene mechanische Aktion. Freitext beschreibt gesprochene Worte, Auftreten und rollenspielerischen Kontext. **Kein Planner.** „I shout to my party members to take the left flank!“ darf gesprochen werden. Es ist weder eine zweite PC-Aktion noch ein Enginebefehl für zusätzliche Verbündetenzüge. NPCs dürfen darauf plausibel reagieren, ihre Mechanik bleibt gebunden.

**Weg F – „Freitext mit Aktionen“:** Standard ohne HUD und sicherer Anfangsmodus bei bislang nicht erklärter HUD-Nutzung. Freie zusätzliche Handlungen, Reihenfolgen, Bedingungen oder Änderungen einer Auswahl gehen mit dem HUD-Anker **gemeinsam vor jeder Buchung** durch den vorhandenen Planner. Es wird nicht erst der HUD-Angriff gebucht und danach der Text geplant.

Erste Auswahl erklärt beide Wege knapp am Composer, ohne Modalassistent. Empfehlung: H erst nach bewusstem Umschalten merken, nicht aus dem Text oder einem Skillklick still ableiten. Ohne HUD gibt es keinen neuen „garantiert rein sozial“-Router: normaler Freitext bleibt V4-C. Entfernen der Auswahl stellt den freien Weg wieder her.

**Ehrliche Grenze:** Beliebiger Begleittext lässt sich ohne Sprachinterpretation nicht sicher auf jede zusätzliche Mechanik prüfen. Bestehende klare Intent-/Negationshinweise können warnen („Weitere Aktion erkannt – Freitextweg verwenden?“), dürfen aber keine neue breite Regex-Firewall werden. Der schnelle Weg darf vor allem **keine** zusätzlichen Mechaniken aus Begleittext buchen. Ungewählt erzählte Erfolge bleiben Modellfehler. Missversteht der Nutzer H im natürlichen Test wiederholt, ist H mit Begleittext nicht abgenommen; eindeutige HUD-Auswahl ohne Text und der freie Plannerweg bleiben nutzbar.

### 3.3 Fehler und Korrektur vor Ausführung

Ungültiges Ziel, fehlender Gegenstand, veraltete Auswahl oder unaufgelöster Widerspruch: kurze lokale Erklärung mit vorhandenen Alternativen; Auswahl und Text bleiben erhalten. „Auswahl ändern“, „Auswahl entfernen / Text planen“ oder Wahl eines bereits vollständig typisierten gültigen Kandidaten benötigt keinen weiteren LLM-Aufruf. Eine **neu formulierte** freie Handlung kann erneut Planung benötigen.

Keine automatische Annäherung an ein zu weites Ziel, kein stiller Angriff auf Goblin B statt A, kein Verbrauch als Preis einer abgelehnten Auswahl. Der Benutzer muss nicht JSON bearbeiten. Ein fehlgeschlagener, aber gültiger Wurf ist dagegen ein ausgeführter Zug und kein Grund für erneute lokale Auswahl desselben Wurfs.

## 4. Kleine gemeinsame Aktionsgrundlage

### 4.1 Funktionen und Zuständigkeiten

Neue Namen sind **geplante Schnittstellen**, keine schon vorhandenen Exporte:

| Baustein | Vertrag |
|---|---|
| `src/action_input.js::availableActions(state, content)` | Reine Projektion vorhandener Skills, sichtbarer Ziele und eigener Gegenstände: Label, Argumentarten, bekannte Kosten, Verfügbarkeit/Ablehnungsgrund. Keine RNG-, Zeit-, PULSE- oder Eventoperation. |
| `validateActionSelection(selection, state, content)` | Schema/IDs/Besitz/Modus prüfen; vorhandene reine Fachprüfungen verwenden. Ergibt zulässigen Kandidaten oder konkrete Ablehnung, nicht Würfelergebnis. |
| `lowerActionSelection(...)` | Typisierte Wahl in vorhandenen `intent` bzw. V4-Kommandos abbilden. Keine Sprachdeutung, keine Regelberechnung duplizieren. |
| `reconcileHudPlan(...)` | Nur für Weg F: unveränderlichen HUD-Anker mit vollständigem Plannergebnis verbinden, Konflikte und doppelte Ausführung verhindern. |
| `src/action_composer.js` | Auswahl-/Textmodus, Draftbindung, Capture-/Sendanschluss, Darstellung. Nutzt die gemeinsame Projektion; keine Spielregeln im DOM. |
| Runtime `executeMappedTurn(...)` | Eng aus `plannedTurn` herausgezogener gemeinsamer Ausführungsteil. Sowohl normal gemappter Plan als auch typisierte Wahl benutzen dieselben Engine-/Growth-/Abschlusswege. |

Kein universelles `setState`, keine neue Action-Skriptsprache und kein eigener Workflowgraph. Die Typen sind Eingaben, keine neue Inventar- oder Kampfautorität. Spätere TAKE-/Quest-/Shopaktionen können dieselben Felder für Quelle, Revision, IDs und Ergebnisstatus nutzen; ihre Fachhandler werden nicht jetzt vorgebaut.

### 4.2 Erster Aktionskatalog

| Auswahl | Vorhandener Fachweg | Enge Grenze |
|---|---|---|
| **Angriff**: eigene Skill-/Waffenaktions-ID + tatsächliches Ziel | `playerTurn(..., {intent:{kind:'attack', …}, c:true})` → bestehende Combatauflösung | Sichtbare vorhandene Entitäten; keine NPC-Erzeugung aus einem Label. Besitz/Waffe/Ammo/Rank/MP/Range/Deckung und aktuelle Zulässigkeit bleiben Engineprüfungen. |
| **Verteidigung**: bekannte defensive Skill-ID | Bestehender `kind:'skill'` → `skillAction` | Kein generischer neuer „Defend“-Bonus. Guard/Barrier usw. nur, wenn vorhanden. Ziel-/Repositionparameter ausschließlich, soweit die Fähigkeit sie schon besitzt. |
| **Bewegung**: näher/weiter + bestehende Bezugs-ID | Bestehender `kind:'move'` bzw. normaler vorhandener taktischer Pfad | Ein erlaubter Bandschritt, keine freie Meter-/Koordinateneingabe, kein Reise-GO, Teleport oder neuer Fluchtknopf. Keine Wirkung relativ zu einem gar nicht anwesenden Ziel. |
| **Trank**: konkrete eigene Objekt-ID, eine Nutzung | Im Kampf `kind:'item'` → `itemAction`; außerhalb V4 `use` | Eigene HP-/MP-/STA-Werte nach bestehendem Profil und Cap, Rangsperre und tatsächlicher Verbrauch. Kein neuer Gratistrank neben Angriff. |
| **Andere vorhandene nutzbare Gegenstände** | Bestehendes `use` bzw. bei Angriffseffekt bestehender Item-Angriffsintent | Objektprofil bestimmt Fachweg. Werkzeug wird nicht automatisch verbraucht, Nahrung nicht zur Heilung erfunden, Return-/Skill-Stone behält seine vorhandenen Grenzen und gegebenenfalls Growtharbeit. |

Die UI braucht keine getrennte Trankengine. Normalisierte Referenzen aus dem vorhandenen Inventar-/Objektkatalog verwenden; für virtuelle Templateobjekte den bestehenden Resolver, keine neuen Namens-IDs. Eine einfache Nutzung verbraucht zunächst eine Einheit; freie Mengen-/Bedingungsketten bleiben im Planner. Für einen Gegenstand, dessen beabsichtigte Anwendung weitere unbekannte Bedeutung benötigt, bietet die Leiste den vorhandenen freien Weg statt einer erfundenen Standardwirkung. Bereits eindeutige bestehende Nutzungen bleiben direkt wählbar.

**Besonders zu beachten:** `planner.js::itemAttack()` baut heute aus `use` einen Angriff mit zunächst `target:null`; die Zielwahl kommt aus dem Sprachpfad. Ein HUD-Gegenstand darf dort seine bereits gewählte Ziel-ID nicht verlieren. Die typisierte Abbildung übernimmt die ID in den bestehenden Item-Angriffsintent; der Freitextpfad bleibt unverändert. Restorative im Kampf bleiben eine reguläre Aktion; Return Stones oder Lernquellen werden nicht ungeprüft durch `itemAction` geschoben.

### 4.3 Bewegung + Angriff und AoE

Als einzige zusammengesetzte HUD-Auswahl ist eine **ausdrücklich gewählte, bereits unterstützte Annäherung innerhalb derselben Angriffsaktion** zulässig, sofern sie sich ohne neuen Sequenzeditor kompakt darstellen lässt. Sonst dieselbe Kombination über Weg F. Kein automatisches Aktivieren und kein beliebiger zweiter Aktionsslot.

`.200` prüft die Annäherung zusammen mit dem Angriff; bei weiterhin unzureichender Reichweite wird nicht heimlich nur die Bewegung gebucht. LONG → MEDIUM reicht für einen ENGAGED-Angriff weiterhin nicht. Die historischen Konter-/Lauerfälle werden nicht durch Annäherung „repariert“. Eine separat gewählte reine Bewegung ist ein anderer regulärer Zug mit bestehenden Gegnerreaktionen.

AoE wählt einen vorhandenen Zielanker bzw. eindeutig bestimmtes bestehendes Band. Die Vorschau zeigt die **sichtbaren** voraussichtlich betroffenen Ziele nach den bestehenden Regeln, keine Treffer-/Schadensvorhersage und keine verborgenen Gegner. Neutrale/Verbündete nicht durch pauschales `targets = alle Sichtbaren` in eine autorisierte Angriffsgruppe verwandeln. Explizite Angriffe auf bekannte neutrale Ziele bleiben über die vorhandenen Regeln möglich, aber werden nicht als Standardgegner vorausgewählt. Skill-AoE und physische Explosivgegenstände behalten ihre unterschiedlichen Fachregeln.

Keine Vorschau durch probeweises vollständiges `playerTurn` mit anschließendem Wegwerfen: das wäre eine zweite Ausführung samt möglicher Growth-/RNG-/PULSE-Arbeit. Falls vorhandene Legalityprüfungen nicht rein aufrufbar sind, eng aus dem betreffenden Handler herauslösen und sowohl dort als auch für die Vorschau nutzen. Bestehende Grenzfälle vorher als Gleichwertigkeitsregression sichern; keine neue vollständige Combat-Abstraktion.

## 5. Datenvertrag, Autorisierung und Plannerzusammenführung

### 5.1 Gespeicherte Eingabe

Eine Eingabe erhält hostseitig eine stabile ID. Beispielstruktur, in den bestehenden Userrecord integrieren; Namen können bei Umsetzung konsistent angepasst werden:

```json
{
  "action_input": {
    "v": 1,
    "id": "host-generated-input-id",
    "revision": 1,
    "origin": {"chat_key": "avatar+chat-file", "campaign": "campaign-source"},
    "base_revision": "digest-of-authoritative-prefix",
    "encounter": "actual-encounter-id-or-null",
    "mode": "hud_roleplay",
    "selection": {
      "id": "selection-id",
      "kind": "attack",
      "skill": "mage.flame_lance",
      "target": "actual-entity-id"
    },
    "text": "I shout to my party members to take the left flank!"
  }
}
```

`kind` hat für den ersten Umfang wenige feste Varianten: `attack`, `skill`, `move`, `use`. `approach`, Bewegungsrichtung, Objekt- oder passende Zielfelder sind nur in der jeweiligen Variante erlaubt. Keine frei eingebbaren Eventlisten, Wirkungen, Preise oder Ressourcenwerte. `mode` alternativ `hud_free`; reine Alt-Freitexte brauchen keinen nachträglich erfundenen HUD-Ursprung.

Die `source:HUD`-Berechtigung entsteht ausschließlich aus der echten Hostauswahl und wird intern an genau diese Felder gebunden. Ein Planner-/Extractor-JSON oder Narratortext darf sich diese Autorität nicht selbst geben. Normale Fachprüfungen bleiben auch für HUD verbindlich; entbehrlich ist nur der sprachliche Nachweis einer bereits explizit ausgewählten Handlung.

`base_revision` beschreibt den gefalteten autoritativen Vorgängerzustand und gewählte Swipe-/Recordbezüge, nicht nur Turnzahl oder Uhrzeit. Die Chatidentität enthält auch die Charakter-/Dateiidentität; gleiche Chatnamen zweier Karten sind verschieden. Eine erneuerbare Generationsepoch dient daneben zum Verwerfen veralteter async-Arbeit, ist aber nicht die dauerhafte Eingabeidentität.

Der bisherige Texthash bleibt für bestehende Records/Paymentprüfungen erhalten. Ergänzend ein stabiler `action_input_hash` über kanonisch serialisierte Auswahl, Modus, Text und Revision; gemeinsame Vergleichsfunktion in Runtime, Historienschlüssel, Host-/Saveprüfung und Telemetrie verwenden. Nicht bloß eine einzelne Cachebedingung erweitern. Records ohne neue Felder behalten ihre bisherige Behandlung; keine Migration oder Replayoriginaländerung.

### 5.2 Typisierter Weg H

1. Aktuellen Fold und gebundene Vorgängerrevision prüfen.
2. Typisierte Auswahl lokal validieren/abbilden; keine künstliche Quote erzeugen, um `guardCommands` zu überlisten.
3. Gemeinsamen Ausführungsteil aufrufen. Story-`use` bekommt nur die eng gebundene HUD-Autorisierung; normale Gegenstands-/Zustandsregeln bleiben wirksam.
4. Ergebnis und vorhandene Growth-/Kampf-/Loot-/Questfolgen einmal im Userrecord speichern. Bei ungültiger Auswahl keine mechanische Ausführung starten. Bestehende Freitext-Fehlersemantik nicht nebenbei umschreiben.
5. Narrator erhält **gebuchte Mechanik**, begleitenden freien Text und dessen sichtbare Modusbedeutung. Extractor liest anschließend wie bisher die zusätzlichen Welt-/NPC-Folgen.

Die freie Begleitprosa darf nicht über einen seitlichen `parseIntent`-/`crowdIntent`-Aufruf wieder zur zweiten mechanischen Autorität werden. Die vorhandenen Fachwege erhalten den expliziten Intent; Text bleibt für Erzählung und Provenienz verfügbar. Außerhalb des HUD-Pfads bleibt freie Personen-/Weltreferenzauflösung unverändert.

### 5.3 Weg F: Auswahl als einmaliger Anker im vorhandenen Plan

Dem normalen Planner wird nur bei vorhandener Auswahl ein kurzer zusätzlicher Kontextblock gegeben: Auswahl-ID, kanonische Parameter, Begleit-/Freitextmodus und Bedeutung. Kein zweiter globaler Aktionskatalog. Der Planner versteht die **ganze** Nachricht einschließlich Bedingungen; es gibt vorher keine Enginebuchung.

Kleine bedingte Schemaerweiterung des bestehenden Planformats, beispielsweise:

```json
{"hud_binding":{"id":"selection-id","decision":"use","seqs":[1]},"commands":["existing command objects"]}
```

Das Beispiel kürzt `commands` nur zur Darstellung ab; die Implementierung verwendet die bestehenden vollständigen Commandobjekte. `decision` ist `use` oder `conflict`. `seqs` bindet genau die Kommandos, die die Auswahl ausdrücken, bei vorhandener gekoppelter Annäherung gegebenenfalls zwei. Die Engine prüft deren kanonische Skill-/Ziel-/Objektparameter gegen die echte Auswahl. Nur exakt gebundene Auswahlfelder bekommen interne HUD-Herkunft; zusätzliche Textkommandos laufen durch die normalen Agency-/Quote-/`needs`-Prüfungen.

Fehlender Anker, geändertes Ziel/Skill, derselbe ausgewählte Angriff nochmals ohne Bindung oder ein Konflikt zwischen Negation und Auswahl: **nicht ausführen**. Keine stille Priorität „Text gewinnt“ oder „HUD gewinnt“. Ein bereits verständlicher Widerspruch wird lokal angezeigt; keine Pflicht-Reparaturanfrage nur zur Entscheidung zwischen zwei bekannten Wahlen. Unlesbares Planner-JSON bleibt ein technischer Fehler mit dem begrenzten vorhandenen Reparaturweg.

`mapPlan` und der gemeinsame Ausführungsteil bleiben für Aktionsökonomie und `needs` maßgeblich. Keine unabhängigen Teilpläne nacheinander buchen. Insbesondere vor Ausführung prüfen, ob die gewählte HUD-Aktion in der gemappten Gesamthandlung überhaupt erhalten blieb; ein `not taken` für diesen Anker verlangt eine lokale Klärung. Andere vom bestehenden Planner ausgeschlossene Zusatzhandlungen bleiben sichtbar als nicht ausgeführt. Ein erkannter Widerspruch friert den gesamten noch ungebuchten Vorschlag ein, kein heimliches Ausführen des konfliktfreien Restes.

Wenn der Spieler einen schon typisierten, gültigen Kandidaten lokal auswählt, entsteht eine neue **Eingaberevision vor Ausführung**. Keine erneute Planung derselben eindeutigen Wahl. Eine neue freie Bedingung ist dagegen keine kostenlose typisierte Auswahl. Semantisch falsch verstandene Negation bleibt auch mit Planner möglich; der Vertrag ist kein Beweis vollständigen Sprachverständnisses.

## 6. ST-Sendeweg, Speicherung und bestehende Swipes

### 6.1 Auswahl an die wirkliche Usernachricht binden

`action_composer` hält pro Chat nur einen Entwurf. Click, Enter und ST-Sendbutton nutzen denselben Captureweg. IME-Komposition und Shift+Enter dürfen nicht versehentlich senden. Die früheste Schranke prüft Weltabschluss, aktuelle Auswahl, aktiven Chat und eine gegebenenfalls ungeklärte Providerbelegung, bevor der normale ST-Sendablauf freigegeben wird. Bei einer solchen Sperre auch nicht schon lokal die nächste mechanische Handlung buchen. Die Runtime bleibt die zweite Schranke für direkte `generate()`-/Automationsaufrufe.

Am Übergang zu `GENERATION_AFTER_COMMANDS` wird ein unveränderlicher Snapshot mit Chat, Eingabe-ID, Modus, Auswahl, Text und erwarteter Nachrichtenposition reserviert. Dry-run, Quiet, Impersonate, Swipe, Regenerate und Continue dürfen keinen neuen Auswahlentwurf übernehmen. `#`-/Slash-Systembefehle werden nicht mit einer versteckten Kampfaktion kombiniert; vorab sichtbar Auswahl entfernen oder Befehl separat senden.

**Crashfenster vor `MESSAGE_SENT`:** Eine bloß flüchtige Variable genügt nicht. Einen eng begrenzten `pending_action_input`-Reservierungsdatensatz in den bestehenden Chatmetadaten mitführen, damit die erste native ST-Speicherung ihn zusammen mit der Usernachricht enthalten kann. Er umfasst erwartete Position, Vorgängerbezug und Eingabe, ist aber **keine gebuchte Spielaktion**. `MESSAGE_SENT` übernimmt die Reservierung nur bei exakt passender Ursprungsidentität und Nachricht in deren Userrecord. Danach Metadatenreservierung entfernen und den gebundenen Stand vor Ausführung bestätigt speichern.

Nach Reload: eine eindeutig gespeicherte Reservierung an der erwarteten Nachricht darf lokal vervollständigt werden; bei Mehrdeutigkeit bleibt sie nicht ausgeführt und wird als Entwurf zur erneuten Auswahl angeboten. Nie den zuletzt aktiven HUD-Entwurf auf die letzte beliebige Usernachricht legen. Falls nur eine ungebundene HUD-Beschriftung gespeichert wurde, nicht still als normalen Freitext neu planen. Der Reservierungs-/Bindungsnachweis gehört deshalb in den frühen Browsertest, einschließlich Crash zwischen erster ST-Speicherung und Eventhandler.

HUD ohne Freitext benötigt für ST eine nichtleere Usernachricht. Der Host setzt erst beim Senden eine kurze lesbare Aktionsbeschriftung ein und kennzeichnet sie im Eingabesnapshot als erzeugte Anzeige. Sie ist **nicht** die mechanische Quelle und keine erfundene Sprachquote. Bei Text bleibt dessen Inhalt erhalten; Auswahl wird zusätzlich als lesbare Nachrichtenergänzung angezeigt. ST-Makros/Regex können den gesendeten Text verändern: tatsächlichen ST-Text und ursprünglichen Snapshot getrennt erfassen, unerwartete bedeutungsrelevante Veränderung vor Buchung klären. Keine Namensrückauflösung der IDs.

Die ST-Events liefern nicht alle einen Abbruchvertrag; `EventEmitter` fängt Listenerfehler. Deshalb **nicht** auf `throw`/`return false` in `GENERATION_AFTER_COMMANDS` als zuverlässigen Stop bauen. UI-Capture verhindert reguläres Absenden; `averethInterceptor` mit seinem echten `abort(true)` verhindert im Fallback jede Mechanik und Narratoranfrage. Falls ST dann schon eine unaufgelöste Usernachricht angelegt hat, sichtbar nicht ausgeführt lassen bzw. kontrolliert zur Bearbeitung anbieten; kein automatisches Nachsenden, kein stiller Quellenverlust. Der Ursprungsbezug der begonnenen Generierung bleibt dabei auch nach Invalidierung erkennbar: eine gescheiterte HUD-Bindung darf nicht durch den Default „keine Auswahl, also freier Planner“ fallen. Ein Chatwechsel während ST-eigener async-Vorarbeit darf niemals eine Reservierung oder Engineevents in den neuen Chat übernehmen.

### 6.2 Speicherung: eine Autorität, feste Zielidentität

Die Engineevents bleiben ausschließlich in `extra.avereth` und den vorhandenen Swipekopien. Ergänzt werden Eingabe-/Versuchs-/Speicherbezüge; kein zusätzlich geführter Weltzustand.

Kritische Saves werden in einem kleinen Adapter in/bei `continuation.js` gebündelt, statt weitere ungezielte `ctx().saveChat()`-Aufrufe hinzuzufügen:

- Vor Ausführung und vor jeder nachfolgenden Persistenz die Ursprungsidentität, Epoche, User-/Antwortrecord und gewählte Revision prüfen.
- Ziel (`avatar_url`, `file_name`, `ch_name`), vollständigen Chatheader einschließlich vorhandener ST-Metadaten/Integrity und Nachrichtensnapshot **vor** dem ersten `await` festhalten. Keine Secrets, keine globale Zustandskopie eines inzwischen anderen Chats.
- Über die vorhandenen ST-Chatendpunkte speichern, ohne `force` und ohne ST-Coreänderung. Eigene Schreibvorgänge serialisieren und mit laufenden nativen Saves für denselben Chat koordinieren; ältere Snapshots dürfen einen jüngeren bestätigten Record nicht nachträglich überschreiben. Das ist im Browser zu beweisen, nicht durch `await saveChat()` zu behaupten.
- Read-back gegen **dieselbe** Zielidentität: Userinput samt HUD-Hash, Events, Extraktionsstatus, aktive Swipe-ID und zugehörige `swipe_info.extra` prüfen. Vorhandene `savedPrefixMatches`-Logik entsprechend ergänzen. Header oder andere Extensiondaten nicht beim Speichern abschneiden.
- Chatwechsel/Stop vor neuer Buchung: keine Buchung. Bereits gültig gestarteter Save darf nur sein eingefrorenes Ursprungsziel treffen; ein später Callback verändert weder neuen Chat noch dessen Anzeige. Wiederaufnahme nur am passenden gespeicherten Ursprung.
- Savefehler oder unklarer Ausgang: zuerst lesen, dann bei sicher unveränderter Grundlage denselben Snapshot erneut speichern. **Nicht** den Angriff/Trank/Extractor zum Reparieren eines Saves wiederholen. Abweichender fremder Stand führt zur sichtbaren Sperre, nicht zu Force-Overwrite.

Für native Schreibzugriffe kann derselbe schmale Hosttransportadapter Reihenfolge/ausstehende Saves beobachten; keine allgemeine Manipulation anderer ST-Daten. ST bietet keine atomare Versions-CAS. Der abgenommene erste Betriebsumfang ist daher **ein schreibender Avereth-Client je Chat**, mit gleichursprünglicher Tab-Sperre; parallele andere Browser/Serverclients bleiben eine ausdrücklich nicht zugesicherte Mehrbenutzersituation. Eine erneute Prüfung kann einen solchen Konflikt erkennen, ersetzt aber keine serverseitige Transaktion. Das begrenzt den Umfang, ohne einen neuen Host zu bauen.

Geplanter enger Adaptervertrag: `saveAtOrigin({origin, snapshot, expectedPrefix, saveRevision})` und `verifyAtOrigin(...)`. Eine monotone **technische Speicherrevision** in den vorhandenen Chatmetadaten bindet native und engineveranlasste Snapshots; sie ist weder ein Spielzug noch ein neues Swipe-Recht. Pro Zielchat werden Schreibzugriffe seriell abgearbeitet, bekannte ältere Snapshots vor Dispatch zurückgewiesen und erfolgreiche Writes zurückgelesen. Native ST-Payloads einschließlich der tatsächlich verwendeten Komprimierung müssen dabei lesbar zugeordnet werden können. Ist das nicht zuverlässig möglich, ist die Save-Konkurrenz ein offener Hostblocker, keine erledigte Abnahme. Eine legitime aktuelle Swipe-/Editoperation bekommt einen neuen technischen Speicherbezug; sie wird nicht allein wegen kürzerer Historie als alter Snapshot verworfen. Andere Metadaten bleiben erhalten. Grün ist erst nach geleerter vorheriger Schreibarbeit und passendem Read-back zulässig; neu eintretende Schreibarbeit aktualisiert den Status wieder.

### 6.3 Wiederaufnahme und Swipe bleiben vorhandene Operationen

| Situation | Verhalten |
|---|---|
| Auswahl ändern vor Senden | Nur Draftrevision; keine Events, kein Request. |
| Gesendete, noch nicht ausgeführte Auswahl korrigieren | Eingaberevision wechseln; alte Planner-/Providerergebnisse verwerfen, neue Auswahl erneut fachlich prüfen. |
| Gleicher Sendversuch/Regenerate/Reload nach mechanischem Abschluss | Gespeicherten Userrecord wiederverwenden; kein erneuter Angriff, Trankverbrauch, RNG, PULSE, Loot oder Growthabschluss. |
| Gleicher Text im nächsten echten Spielerzug | Neue Eingabe-ID; normale erneute Handlung zulässig. Nicht global nach Text/Skill deduplizieren. |
| Swipe/Regenerate der Antwort | Bestehenden `.200`-Welt-/Swipepfad nutzen; bereits gebuchte Spielermechanik bleibt fest. Neue Antwort bekommt ihren eigenen vorhandenen Extraktionsbezug. |
| Aktionsparameter nach Buchung editieren | Kein automatisches Neuplanen/Neuwürfeln. Sichtbar ablehnen bzw. vorhandenen ausdrücklich gewählten Verlaufskorrekturweg nutzen; keinen neuen Refund-/Retconmechanismus einführen. |
| Neue Auswahl im Composer, dann alter Welt-Swipe | Auswahl bleibt Entwurf, muss aber gegen die neue Weltrevision revalidiert werden; kein automatisches Ausführen nach dem Swipe. |
| Reine Textkorrektur einer Assistantantwort | Bestehendes `onEditedV4` erhält gebuchte Fakten. Der Patch behauptet nicht, dass Prosaedit allein Weltfolgen zurücknimmt. |

**Keine neuen rückwirkenden Zahlungs-/Swipe-Regeln.** Insbesondere vorhandene Payment-Inputschutzprüfungen nicht auf einen anderen Hash umstellen und dabei unbeabsichtigt freigeben. Neue HUD-Daten müssen in den bestehenden Revisionen vollständig mitgespeichert/exportiert werden, nicht die Regeln ihrer Vergangenheit verändern.

## 7. Timeout, tatsächliche Providerkapazität und Weltabschluss

### 7.1 Nachgewiesenes Problem, begrenztes Ziel

Der [persönliche `.200`-Waldlauf](../recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md#4-persönlicher-200-fehler-ursache-folgen-und-offene-fragen) zeigte 120,967 s primären Extractor-Timeout, danach schnelle Recovery-/Plannerablehnungen. Die drei detaillierten Providerfehler nennen `concurrency_limit_exceeded`: vier belegte plus vier angefragte Einheiten bei Limit vier. Nicht belegt sind Creditverbrauch, die genaue Identität des verbleibenden Remotejobs oder ausschließlich engineinterne Überlappung. ST verliert im Custom-Pfad teils ursprünglichen HTTP-Status/Fehlercode; die Engine sieht dann etwa HTTP 200 mit Fehlerbody.

Ziel dieses Patches ist **keine Garantie eines schnellen Providers**, sondern keine unkontrollierte Anfragefolge nach unbekanntem Abschluss und kein fälschlich als gespeichert/fertig deklarierter Zug. Token-/Kontextlimit, Trunkierung, Transportfehler, Concurrency und Speicherfehler bleiben verschiedene Diagnosen.

### 7.2 Eine kleine gemeinsame Requestkontrolle über dem vorhandenen Ablauf

`src/v4/request_control.js` ergänzt die existierenden `v4Llm`-, Worldjob- und Narrator-Recoverypfade. Kein Alpha-Schedulerimport und kein neues Spielzugjournal. Mindestvertrag einer Anfrage:

`{request_id, origin_chat, input_id, revision, phase, attempt, capacity_key, weight, status}`.

Phasen unterscheiden Planner, Narrator, Extractor, Board/Growth und Repair/Recovery. Vier verfügbare Einheiten / vier je GLM-Request sind die Zielkonfiguration. Erwerb der Kapazität **vor dem tatsächlichen HTTP-Dispatch**, Freigabe erst nach bestätigtem Abschluss. Das Prinzip bleibt gewichtet; keine Behauptung, ein beliebiger Modellwechsel brauche dieselben Einheiten.

**Physischer ST-Narrator ist Pflicht:** ST `sendOpenAIRequest()` emittiert `CHAT_COMPLETION_SETTINGS_READY` und sendet anschließend an `/api/backends/chat-completions/generate`. Den vorhandenen eng begrenzten Fetchanschluss in `index.js` zu **einem** koordinierten Adapter ausbauen, nicht einen zweiten Wrapper darüber stapeln. Er übernimmt Native-Narrator **mit und ohne Streaming**, die eigenen `v4Llm`-Requests und deren Wiederholungen. `generateRaw`-Fallback darf nicht doppelt zählen oder eine verschachtelte zweite Kapazitätsreservierung verlangen. Der Test zählt Aufrufe am Mockbackend, nicht bloß Funktionsaufrufe.

Erfassung nicht vom Recovery-Schalter, nichtleeren Engineevents oder einem nichtstreamenden Request abhängig machen. Anfrageidentität/Metadaten am vorbereiteten Request binden; nicht denselben JSON-Body verschiedener Versuche als dieselbe physische Anfrage ansehen. Andere native Chat-Completion-Requests desselben geschützten Browser-/Providerbereichs dürfen die Sperre nicht unbemerkt umgehen; als `host_other` kenntlich machen, ohne ihnen Spielautorität zu geben. Ungestützte Transportpfade nicht mit einer vermeintlichen Schutzgarantie versehen. Erster Abnahmeprovider ist der tatsächlich verwendete ST-Chat-Completion-/Custom-Pfad.

Bei Streaming Headerempfang, `GENERATION_ENDED` und bloßes EOF **nicht** mit abgeschlossenem Modelljob gleichsetzen. Abschlussmarkierung/valide Endantwort beobachten, ohne frühe Textanzeige zu puffern oder Daten zu verändern. Abgeschnittenes SSE, Browserabort und Verbindungsabbruch bleiben unklar. Vollständig empfangene Antwort mit `finish_reason:length` ist dagegen transportseitig abgeschlossen, aber fachlich möglicherweise unbrauchbar.

| Ereignis | Kapazität / Wiederaufnahme |
|---|---|
| Noch nicht gesendet, dann Stop/Chatwechsel | Wartenden Request entfernen; keine Remoteeinheiten verbraucht. |
| Vollständige terminale Providerantwort | Lease freigeben; bei ungültigem JSON nur der begrenzte fachliche Repairweg. |
| Lokale Wartefrist erreicht | Sichtbarer Status, **kein automatischer neuer Request**. Solange Transport noch läuft, weiter beobachten; kein Zwangsabort allein zur Freigabe. |
| Stop/Abbruch/Netzverlust nach Dispatch, Remoteabschluss unbekannt | Lease als `unknown` erhalten; auch nach Reload/Chatwechsel keine automatische Freigabe. Verspäteten Text nicht in eine veraltete Revision buchen. |
| Explizite Concurrency-Ablehnung | Aktueller Versuch abgelehnt; keine sofortige Retrykette. Fremde/alte Belegung bleibt offen. `Retry-After` beachten, falls vorhanden; eine Wartezeit beweist keine Freigabe. |
| Generischer ST-Fehlerbody ohne ursprünglichen Code | Unsicherheit erhalten, nicht „Credits leer“ oder sicherer Concurrencybeweis behaupten. |
| Savefehler nach Antwort | Antwort/Events wiederverwenden, nur Save klären; keine neue Modellanfrage. |

Eine kleine dauerhafte Lease-Metadatenablage ist Transportzustand, **keine zweite Spielwelt**. Providerbereich über nichtgeheime Verbindungsidentität binden; keine API-Schlüssel lesen, hashen oder protokollieren. Gleichursprüngliche Tabs per Web Lock/vergleichbarer atomarer Besitznahme koordinieren; ein abgelaufener lokaler Lock ersetzt keinen bestätigten Remoteabschluss. Externe Sessions kann die Extension nicht kontrollieren.

Ohne Provider-Statusschnittstelle ist automatische sichere Freigabe nach echtem Verbindungsverlust nicht beweisbar. Deshalb kein erfundener TTL-Erfolg: Status erklärt den unbekannten Remoteabschluss. Eine **bewusst angeforderte einzelne Wiederaufnahme** kann nach Nutzerprüfung der Providerbelegung zugelassen werden; sie ist eine dokumentierte Risikoentscheidung, keine bestätigte Freigabe. Erneute Ablehnung beendet diesen Versuch. Keine Hintergrundprobes oder unbeschränkten Klick-/Reload-Retryketten. Diese Bedienentscheidung ist vor Umsetzung in §12 zu bestätigen.

`ask()`/`runExtraction()` und `narratorProviderResponse()` müssen den Sperrgrund durchreichen: eine gehaltene Kapazität ist nicht einfach ein retryfähiger Parserfehler. Bestehende fachliche Repairlimits nicht erhöhen. Jeder tatsächlich gesendete Retry zählt und braucht erneut Kapazität. Empfangene gültige Ergebnisse, bereits gebuchte Mechanik und erfolgreiche Saves werden wiederverwendet.

### 7.3 Weltabschluss und Schreiben während des Abgleichs

Früh sichtbare Narration und natives Streaming bleiben erhalten. „Erzählung sichtbar“ bedeutet noch nicht „Welt gespeichert“. Der erste Patch baut keine Alpha-Veröffentlichungstransaktion und verlangt keinen neuen Narrator-JSON-Vertrag.

Der nächste Text darf während X/Save geschrieben werden. Bis zum bestätigten Abschluss bleibt er ein Entwurf; kein automatisches spätes Absenden. Sendbutton, Enter und Runtimebarriere müssen dasselbe beachten. Statusänderungen dürfen Text, geöffnete HUDs und Scrollposition nicht fortlaufend zurücksetzen.

„Gespeichert“ folgt nur dem erfolgreichen passenden Read-back. Ein gespeicherter Fehlerrecord ist **„Fehler gespeichert – Weltabgleich offen“**, kein grüner Weltabschluss. Bei terminalem X-Fehler bleibt klar, welche Weltfolgen fehlen; kein unbeobachtetes `closeLatePending` als stiller Erfolg eines bereits abgeschlossenen HUD-Zugs. Wiederaufnahme liest nur dieselbe noch aktuelle Antwort erneut, sofern die Kapazität es erlaubt, und ersetzt ihren technischen Fehlversuch im bestehenden Recordpfad. Bereits angenommene Teilereignisse nicht doppelt anhängen. Hat schon ein abhängiger Zug stattgefunden, keine rückwirkende automatische Reparatur.

Ein bestehender ausdrücklich gewählter Failsoft-Fortgang darf nicht heimlich zum Standard werden oder als vollständiges Memory verbucht werden. Im ersten Abnahmebogen wird bei verlorener wichtiger Welt-/NPC-Information angehalten und der aktuelle Abschluss wiederhergestellt. Es gibt keinen neuen Memoryeditor als Ersatz für einen defekten Extractor.

## 8. Agency und NPC-Memory: Freiheit ohne neue Nebenmechanik

### 8.1 Konsistenter kurzer Agency-Kern

Im ausgelieferten `content/narrator/Avereth_Narrator_Contract_v4.txt` die widersprechenden Abschnitte `PLAYER OWNERSHIP`, Fortsetzung und `PC STATE LOCK` gezielt abstimmen. Vorhandene Stil-/Wissens-/Mechanikregeln nicht pauschal löschen. Empfohlener Kern:

> The player chooses Alaric's meaningful voluntary actions, spoken words, thoughts, consent and commitments. In HUD roleplay mode, the selected action is his complete mechanical choice; the accompanying text supplies roleplay, not additional mechanical actions. In free-action mode, follow the engine's resolved interpretation. Narrate booked results faithfully. You may supply ordinary, low-consequence gestures and routine details that complete the chosen activity within the current scene. Do not choose a new tactical action, goal, purchase, restricted destination or relationship commitment for him. Respect explicit refusals and limits. NPCs may speak and act on their own motives; their ordinary reactions need no extra permission. Their mechanical effects still use the engine's rules. When a meaningful player decision is needed, leave the situation open for him.

Diese Routinefreiheit betrifft im ersten Patch Haltung, Gesten, natürliche Ausführung und soziale Kontinuität **innerhalb der bestehenden Szene**, keine neuen Engineorte oder taktischen Bandschritte. Das allgemeine Mitgehen in Nebenräume und neue Zahlungsfreigaben sind bewusst vertagt. Kein Prompt soll erlaubte Ortswechsel versprechen, die der unveränderte Weltapplier danach ablehnt.

`presets/Avereth Narrator V4.json` und `context.js::playerActionsBlock` entsprechend harmonisieren: „keine zusätzliche bedeutsame Entscheidung/Mechanik“ statt Verbot jeder nicht wörtlich aufgeführten Geste. Der aktuelle Modus, aufgelöste Aktion, nicht ausgeführte Zusatzwünsche und Begleittext werden knapp auseinandergehalten. Bestehende `STATE NOW`-/Kampfchronik und Kosten-/Lootautorität bleiben. Kein neuer universeller Werkzeugkatalog.

Die **tatsächlich aktive** Character Description muss diese Fassung enthalten. Revisionsmarker/`contractState()` aktualisieren und Installationshinweis geben; Presetimport ersetzt keine vorhandene Karte. Im isolierten ST-Test aktive Beschreibung **und vollständigen Narratorrequest** prüfen. Keine persönliche Karte ungefragt überschreiben. Fehlende/veraltete Description vor dem natürlichen Test sichtbar korrigieren lassen; ein Marker allein beweist weder vollständigen Prompt noch natürliche Regelbefolgung.

### 8.2 Extractor bleibt, Erinnerung wird nicht für Aufrufzahlen geopfert

Der normale freie Narrator darf weiterhin neue NPC-Reaktionen, Zusagen, Konflikte und Weltinformationen erzeugen. Bestehende E2/E3-Karten, Wissensträger, Absprachen, Memory und PULSE-Regeln bleiben. Ein Flankenzuruf verpflichtet einen NPC weder zum Gehorsam noch macht er ihm ungesprochene Ziele bekannt.

X wird nach einer normalen HUD-Narration ebenso ausgeführt wie nach einer freien Antwort. Bestehende echte Ausnahmen wie reine Systempanels bleiben; **keine neue Combat-, Keyword- oder Modell-Selbstauskunft zum Skip**. Zukunftsfähigkeit heißt hier nur eine klar benannte Extraktionsentscheidung im Ablauf, aktuell `required` nach regulärer Narration. Kein neues Featureflag oder totes optionales Skipframework nötig.

Für die spätere NPC-Reaktion verwendet die Abnahme die vorhandene `#npc`-Ansicht, Export und Enginekontext. Gespeicherter Eintrag, tatsächliche Kontextauslieferung und natürliche Nutzung durch den Narrator werden getrennt geprüft. Ein korrekt abgeschlossener Extractor kann semantisch trotzdem eine Zusage übersehen; dieser Fehler darf nicht hinter grünem Speicherstatus verschwinden.

## 9. Konkrete Änderungsflächen und Implementierungsfolge

Diese Liste beschreibt den **späteren** Codeauftrag. In dieser Planungsrunde wurden nur Dokumentation und Branchzeiger angelegt.

| Datei/Gruppe | Notwendige Arbeit |
|---|---|
| neu `src/action_input.js`, `src/action_composer.js` | Gemeinsame Typen/Projektion/Abbildung sowie Composerbindung; wenige Aktionsfamilien, keine neue Regelengine. |
| `src/hud.js`, `src/ui_actions.js`, `style.css` | Optionale Auswahlanschlüsse, kompakte Leiste, unveränderte bestehende Draftbuttons; keine technischen Settings in den Chat verschieben. |
| `index.js`, `src/v4/runtime.js` | ST-Eingabebindung, typisierter Einstieg, gemeinsamer Ausführungsteil, Moduskontext, durchgängige Revisions-/Fehlerbehandlung und Status. |
| `src/v4/planner.js`, bedingt `src/v4/agency.js` | Enger HUD-Anker nur im gemischten Plan; normale Sprachguards erhalten, ausgewählte Felder über echte Hostautorisierung statt Fakequote. Tatsächlichen Modul-/Exportnamen bei Umsetzung beibehalten. |
| `src/host.js`, `src/v4/continuation.js`, `src/v4/world_jobs.js` | Neue Inputsignatur/Swipemetadaten, zielgebundener Save/Read-back und Wiederaufnahme; keine neue Weltbank oder Retconregel. |
| neu `src/v4/request_control.js`, bestehende Narrator-Recovery-/Transportpfade | Physische Anfragen gemeinsam begrenzen, Unknown-Abschluss/Stop/Reload schützen, Retries zählen. |
| `src/combat.js` / bestehende Itemhelpers **nur falls erforderlich** | Reine vorhandene Vorprüfungen wiederverwendbar herauslösen; Regeln, Formeln, Reihenfolge und Zahlen unverändert. |
| Narratorvertrag, V4-Preset, `src/context.js`, Vertragsrevision/Installationshinweise | Konsistente begrenzte Routineautonomie und korrekte Eingabequellen; kein allgemeiner Promptumbau. |
| `tests/v4/…`, `tests/unit/…`, `tools/st_live/run_c.mjs` bzw. dazugehöriges neues Smoke-Modul | Gezielte Action-/Host-/Requestregressionen im vorhandenen Testsystem. |
| Technische Produktpatchnote bei Implementierung | Scope, Quellen, echte Tests, verbleibende Risiken; Versionsfortschreibung erst im ausdrücklich beauftragten Implementierungsstand. |

**Zusammenhängende Umsetzung, keine unabhängige Mikropatchserie:**

1. Engen ST-Durchstich **zuerst**: Eingabe-ID bis Userrecord, native Narratorerfassung, Save-/Read-back, Stop/Reload/Chatwechsel. Mit einer vorhandenen Testaktion und Mockprovider nachweisen. Keine komplette Leiste bauen, bevor diese Grenzen funktionieren.
2. Gemeinsamen Runtimeausführungsteil sichern; Angriff, Defense, Bewegung und `use` als vier Ausprägungen desselben Vertrags anschließen. Ursprüngliche Freitextfälle als Referenz benutzen.
3. Composer-/HUDdarstellung, Weg H/F einschließlich Konflikten, Agency und Status zusammenführen. Normale NPC-/Extractorfolgen unverändert durchlaufen lassen.
4. Gezielte Regressionen, Gesamtsuite/Replay und isolierte ST-Abnahme; danach unabhängiger Produktdiff-Review und nutzergesteuerter kurzer natürlicher Bogen. Keine breite Komfort-/Shopausweitung dazwischen.

**Umfangsbewertung:** Das ist ein mittelgroßer Eingabe-/Hostpatch, kein kleiner HTML-Buttonfix. Vier Familien sind vertretbar, weil sie bestehende Intents teilen. Den Umfang treiben gemischter Text und zuverlässiger Hostabschluss. Der sinnvolle Schnitt ist **einzelne vorhandene Aktionen plus höchstens vorhandene gekoppelte Annäherung**, keine beliebigen Actionketten, keine allgemeine Korrekturoberfläche. Request-/Saveabsicherung darf nicht als spätere Nebenaufgabe abgeschnitten werden. Scheitert der erste Hostdurchstich an einem echten ST-Blocker, diesen konkret berichten und Umfang neu abstimmen; weder ST heimlich forken noch wieder auf Alpha wechseln.

## 10. Regressionen und isolierte Abnahme

### 10.1 Referenzen und Vergleichsmethode

Gleichen kopierten Ausgangszustand/Seed einmal mit gespeichertem gültigem `.200`-Plannergebnis und einmal über die entsprechende typisierte Wahl ausführen. Fachzustand, RNG-Fortschaltung, Ressourcen, Initiative, Zeit, PULSE, Wachstum und Loot vergleichen. Eingabeprovenienz, lesbare Beschriftung und Requesttelemetrie dürfen verschieden sein; diese Unterschiede einzeln benennen, nicht alle Events pauschal aus dem Vergleich entfernen.

Historische Originaldateien bleiben unverändert. Aus ihnen abgeleitete neue Testfixtures werden als solche markiert. Relevant:

- [Kampffachplan `.192`](FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md): W #29/T15 als gültiges SHORT→ENGAGED + Angriff; W #127/#129/T64–65 zu weit; W #61/#69/T31/T35 und R #31/T16 ohne gewählte Annäherung bzw. Konter. Die dortigen Varianten B–D sind **keine** Freigabe für diesen Patch.
- [User01-UI-Quelle](PATCH_USER01_UI_QOL.md): I19/I21 Arcane Wave mit vier Beetles im MEDIUM-Band; Ziel-/Dungeon-/Lootanzeigen erhalten. Vorhandene `.157/.161`-Tests liefern bereits UI-Gegenfälle.
- Persönlicher `.200`-Waldlauf als Transport-/Recoveryablauf: lange Extraktion, lokale Abbruchmeldung, Folge-429, sichtbar noch nicht gebuchte Ankunft. Nur Fehlerzeitfolge offline simulieren, keine neue Reise-/Ortsregel daraus machen.
- Vorhandene Tests `planner_c*.test.js`, `patch72_items.test.js`, `fix157_ui_qol.test.js`, `fix161_user_qol.test.js`, `patch_failsoft_host_block.test.js`, `fix151_fetch_continuation.test.js`, NPC-/E3- und Combat-Tests gezielt als Anschluss, keine neuen Testzahlen erfinden.

### 10.2 Verbindliche Fallmatrix

| ID | Fall | Nachzuweisendes Ergebnis |
|---|---|---|
| A01 | Flame Lance, gültige eigene Skill-ID, Goblin A | Weg H: 0 P, genau bestehende Mechanik; N und X normal. |
| A02 | Identische Namen, verschiedene IDs; Ziel stirbt/flieht/verschwindet vor Send | Kein Namensraten oder Ersatzziel; veraltete Wahl lokal abgelehnt. |
| A03 | Skill fehlt, falsche Waffe, keine Ammo/MP, Range/Deckung ungültig | Kein falscher Angriff/Verbrauch; fachlich richtiger Grund, keine automatische Reparaturanfrage. |
| A04 | Vorhandener Guard/defensiver Skill | Bestehende Dauer/Kosten/Wirkung und Proficiency; keine zweite Hauptaktion oder erfundene Verteidigung. |
| A05 | Reine Bewegung näher/weiter mit realem Bezug | Bestehender Bandschritt, Gegner-/Zeitfolgen genau einmal; kein GO/Fluchtbonus. |
| A06 | W #29 gültige Annäherung + Angriff | Gleicher mechanischer Ausgang wie `.200`; kein zusätzlicher Zug/PULSE. |
| A07 | W #127/#129 zu weit; Konter-/Negationsfälle | Keine Teilbewegung oder kostenloser Konter. Alternativen anzeigen, neue Wahl nötig. |
| A08 | Heiltrank im Kampf, außerhalb und bei voller Ressource/falschem Rang | Bestehende Mainaction/Restore-/Cap-/Verbrauchsregeln; wirkungslose/unzulässige Nutzung verbraucht nicht heimlich. |
| A09 | Angriffsitem mit Ziel, Werkzeug, Nahrung; nicht gehaltenes Objekt | Richtiger Fachweg/Verbrauch; kein Zielverlust, kein erfundener Effekt oder fremder Besitz. Return-/Skill-Stone-Grenzen als angrenzende Regression. |
| A10 | AoE, ein/mehre Bänder, Neutrale, Verbündete, volle Deckung | Vorschau und Auflösung entsprechen vorhandenen Regeln; keine neue Gruppenautorisierung. |
| A11 | HUD + ausdrücklich gewählter Flankenzuruf | Kein Planner; freie soziale Reaktion, keine Zusatzaktionen/Bonuswürfe für NPCs. X übernimmt wichtige neue Information. |
| A12 | HUD + „and drink my potion“, „instead…“, „do not attack…“ in Weg F | Ein vollständiger Plan; keine Doppelung. Konflikt/zu viele Aktionen sichtbar, kein stiller Ankerverlust. |
| A13 | Derselbe Zusatzsatz irrtümlich in Weg H | Keine zusätzliche mechanische Buchung; Warn-/Promptwirkung getrennt prüfen. Nicht als bewiesene allgemeine semantische Erkennung deklarieren. |
| A14 | `needs`, bedingte Bewegung/Angriff; Voraussetzung nicht erfüllt | Bestehende Abhängigkeiten/Not-taken-Anzeigen; keine unabhängige Teilbuchung des HUD-Ankers. |
| A15 | Freitext ohne HUD, Creation, Tod, `#npc`, `#pay`, Board-/TAKE-Draft | Bisherige Fachwege/Funktionen erhalten; kein neuer Pflichtmodus oder versteckte Auswahl. |
| A16 | HUD-only, leerer Composer; Sendbutton/Enter/IME/Doppelklick | Eine wirkliche Usernachricht und Eingabeidentität; Auswahlklick allein 0 Events/0 Requests. |
| A17 | Gleiche Prosa, anderes Ziel/Skill/Modus; Spam identischer Requests | Verschiedene echte Eingaberevisionen erkannt, derselbe Versuch nur einmal ausgeführt. |
| A18 | Regenerate/Swipe/Reload nach Angriff/Trank/Sieg | Spielerrecord, RNG, Kosten, Loot/Growth unverändert; korrekte aktive Welt-/Swipeevents. |
| A19 | Editierte bereits gebuchte Auswahl; alte Antwort editiert | Kein versteckter Reroll oder neuer Retcon; bestehende Payment-/Texteditregeln erhalten. |
| A20 | Stop/Chatwechsel an jedem await, verspätete Antwort | Keine fremde Bindung/Buchung/Anzeige; bereits gebuchter eigener Record bleibt nachvollziehbar. |
| A21 | Crash vor/nach erster ST-Speicherung und `MESSAGE_SENT` | Reservierung eindeutig rekonstruierbar oder sichtbar ungeführt; niemals freie Neuinterpretation verlorener HUD-IDs. |
| A22 | Save abgewiesen, HTTP-Erfolg ohne Persistenz, alte native Schreibantwort | Kein grüner Status/Folgezug; Read-back entdeckt Fehler; nur passenden Snapshot erneut speichern. |
| A23 | Native N streamend/nichtstreamend, X/Repair/Raw-Fallback, 4/4 Kapazität | Backendzählung und maximal aktive Einheiten stimmen; keine doppelte Reservierung oder ungeschützter N. |
| A24 | Timeout/Abort, Reload, späte terminale Antwort, Concurrency-Fehler | Unknown bleibt gesperrt; keine automatische Kette; explizite einmalige Wiederaufnahme zählt separat. |
| A25 | Abgeschnittene X-Antwort/`length`, generischer ST-Fehler, Teilpersistenz | Fehlerarten unterscheiden, wichtige Memory nicht still „fertig“, keine pauschale Tokenlimit-/Creditbehauptung. |
| A26 | NPC-Zusage nach Kampf; später außerhalb aktivem Dialogverlauf | Thread/Memory gespeichert, korrekte Figur/Perspektive im Kontext; natürliche Einlösung separat bewerten. |
| A27 | Tatsächliche Description, Preset, Engineblock | Konsistente Agency im Wire-Prompt; Routinegesten erlaubt, PC-Kauf/Skill/Zustimmung nicht erfunden. |
| A28 | Offene HUD-Klappen, Dungeonetage, Loot, Queststatus, Composer während X | Anzeigen/Entwurf bleiben erhalten; Settings ausschließlich im Erweiterungsdrawer, kein automatisches Absenden. |

A01, A11, A16/A21 und A23/A24 zuerst als zentrale Rotfälle gegen `.200` bzw. neue Vertragsanforderung zeigen. Fehlende neue HUD-Funktion nicht als alter Combatfehler ausgeben. Alle anderen bestehenden fachlichen Vergleichsfälle müssen schon auf der Basis korrekt eingeordnet sein. Ein Test, der eine bekannte semantische Lücke dokumentiert, zählt nicht als gelöste Anforderung.

### 10.3 Testfolge nach Implementierungsfreigabe

1. Gezielte Node-Tests für neuen Eingabevertrag, gemeinsame Ausführung, Hostbindungen und Transportzustände; historische Originaleingaben und gespeicherte Antworten plus klar markierte synthetische Gegenfälle.
2. Echter früher ST-1.19-Browserdurchstich mit Mockprovider; erst nach funktionierender Bindung/Save-/Requestkontrolle den ganzen UI-Bogen fertigstellen.
3. Vollständiges `npm test` und `npm run replay:check`. Keine Replayoriginale ändern. Jede neue Fingerprintabweichung einzeln nach Fachzustand, Anzeige/Prompt, Diagnostik oder Provenienz begründen. Für normale alte Freitextmechanik keine pauschale Änderungsfreigabe; unerwartete Mechanikabweichung ist ein Stopkriterium.
4. `npm run smoke:st:check`, danach `npm run smoke:st:isolated` aus dem **neuen Checkout**. Bestehende markierte Sandbox/eigene Datenwurzel verwenden; Standard und Failsoft um den Action-HUD-Bogen ergänzen. Keine persönliche Installation, kein Lesen ihrer Chats/Settings/Secrets, keine vorsorgliche Neuinstallation oder Löschung. Vorgehen aus der [Produktanleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/ST_SMOKE_ISOLATED.md).
5. Wirkliche Browserereignisse, Mockbackendrequests, gespeichertes Chat-JSONL/Read-back, Screenshots bei UI-Abweichungen und PageErrors sichern. **0 PageErrors**, Standard/Failsoft ohne verdeckte Ausnahmen. Keine bloße Nachbildung des ST-Hosts als Ersatznachweis.

Die nativen ST-Grenzen werden mit Stop, Chatwechsel, Reload, Swipe, Regenerate, Enter und Sendbutton getestet. Insbesondere native Saveüberlappung, Eventreihenfolge, Streamingende und ersten Save vor `MESSAGE_SENT` im Browser erzwingen. Ein Mockprovider beweist dabei Transport/Host/Fachfunktion, nicht die kreative Qualität des wirklichen GLM.

## 11. Früher persönlicher Spielbogen und ehrliche Messung

Nach technischer Abnahme und unabhängiger Diffprüfung **auf ausdrücklichen Nutzerauftrag**, vom Nutzer selbst gesteuert. Kein automatischer natürlicher Batch, keine Providerrequests in dieser Planungsrunde. Die Sandboxkonfiguration und die neue passende Karte/Presetversion werden vorbereitet, nicht ungefragt in persönliche Daten installiert.

Kurzer zusammenhängender Bogen mit vorhandener Kampfsituation und tatsächlich bekannten Fähigkeiten/Gegenständen:

1. Eindeutige HUD-Aktion wählen, Begleittextmodus bewusst wählen und freien Flankenzuruf schreiben. Nur eine gemeinsame Eingabe senden; Narrator darf die NPC-Reaktion frei gestalten.
2. In passenden Folgezuständen Defense, Bewegung und Trank verwenden. Kein künstlicher neuer Quest-/Gegner-/Lootinhalt für den Test. Ein zu weites Ziel und ein Textwiderspruch prüfen die Verständlichkeit der lokalen Hilfe.
3. Einmal in freien mechanischen Text wechseln; uneingeschränkte Sprache und vorhandenen Planner verwenden. Nicht jeden Zug zur Buttonpflicht machen.
4. Nach dem Kampf freies NPC-Gespräch; eine tatsächlich entstandene wichtige Zusage/Information speichern und später erneut ansprechen. Originaldialog außerhalb der aktiven jüngeren Historie; `#npc`, Export und gelieferte NPC-Karte prüfen. Keine Zusage nachträglich erfinden, um den Test grün zu bekommen.
5. Eine Antwort neu erzählen/Swipen, anschließend Reload. Mechanischer Erfolg/Verbrauch bleibt derselbe. Während X Text schreiben und prüfen, ob das Warten verständlich ist und der Entwurf erhalten bleibt.

| Weg / Situation | Analytische Erwartung physischer Requests, **keine Messung** |
|---|---|
| Gültige HUD-Aktion, H ohne/mit Begleittext | Normalfall **N + X = 2**, kein P. |
| HUD plus mechanischer Freitext in F | Normalfall **P + N + X = 3**; eindeutige IDs verbessern Referenzen, sparen hier nicht automatisch eine Phase. |
| Freitext ohne HUD | Bestehender Normalfall **P + N + X = 3**. |
| Lokale Auswahl/Validierungsablehnung | **0**; wenn P einen Konflikt erst ermittelt hat, zählt dessen schon erfolgter Request. |
| Reine bestehende Systemabfrage | Vorhandener lokaler Weg, gewöhnlich **0**. |
| Regenerate nach gebuchter Mechanik | Vorhandenen Record nutzen; neue N/X zählen, kein erneuter P für identische erfolgreiche Eingabe. |
| Growth/Forge, Board, Repair, Recovery | Jeden zusätzlichen physischen Request separat zählen; niemals hinter „ein Turn“ oder „ein Toolcall“ verstecken. |

Messprotokoll pro Eingabe: Modus/IDs, P/N/X/Spezial-/Repairzahl, tatsächlich gesendete vollständige Prompt-/Antwortgröße (echte Usage bevorzugen, lokale Schätzung markieren), Queuezeit, Send→erste lesbare Prosa, Send→bestätigter Weltabschluss, Trunkierung/Fehler, lokale Rückfragen, zusätzliche Spielerzüge, Klick-/Korrekturaufwand und Speicher-/Memoryergebnis. Voller Providerprompt ist nicht das interne Enginebudget. Die 32.768-Grenze umfasst Input plus erforderliche Ausgabereserve; keine pauschale Erhöhung von X-Output oder Löschung wichtiger NPC-Karten als Nebenfix.

Es ist **keine** neue Kürzung aller Narrator-/Plannerkataloge vorgesehen. Der klare Gewinn des ersten Versuchs ist der entfallende P bei vollständiger Wahl, nicht ein behaupteter Faktor bei Gesamtlatenz. Ein langsam gebliebener Extractor oder häufig missverstandener Modusschalter kann den subjektiven Gewinn aufzehren. Der Nutzer bewertet ausdrücklich Freiheit, Wartegefühl, Natürlichkeit und Bedienlast.

Stopkriterien: doppelte oder ungewählte Mechanik, falscher Chat, verlorene wichtige NPC-Zusage, nicht erkannter Speicherfehler, automatische Requestkette nach unbekanntem Abschluss oder wiederholter unbemerkter Aktionsverlust durch H. Eine klare lokale Ablehnung eines unmöglichen Angriffs ist dagegen kein verlorenes Gameplayfeature.

## 12. Offene Nutzerentscheidungen und Freigabegrenzen

**Bereits festgelegt, nicht erneut zur Grundsatzwahl gestellt:** `.200` weiterverwenden; vier Aktionsfamilien; freier Text bleibt; keine neuen Kampfregeln; Extractor zunächst behalten; Settings im Erweiterungsbereich; keine Alphaarchitektur.

Für Gegenreview und anschließenden Implementierungsauftrag genügen diese konkreten Entscheidungen:

1. **Begleittextmodus:** Empfehlung: einmal bewusst H wählen, danach sichtbar merken; F als anfänglicher/sicherer Textmodus. Damit wird das Restrisiko akzeptiert, dass ein irrtümlich als Begleittext geschriebener neuer mechanischer Wunsch nicht vollständig erkannt wird. Keine Garantie durch Keywordfilter und keine weitere Pflichtcheckbox pro Runde.
2. **Routineautonomie im ersten Patch:** Empfehlung: Gesten, Haltung, normale Ausführung und soziale Kontinuität innerhalb der aktuellen Szene freigeben; keine neuen taktischen Schritte, Zielorte, Kosten oder Verpflichtungen. Weitergehende Raum-/Paymentlockerungen bleiben späteren Entscheidungen vorbehalten.
3. **Unknown-Remote-Recovery:** Empfehlung: keine automatische Freigabe durch Zeitablauf. Wenn keine Bestätigung erhältlich ist, nur nach sichtbarer Nutzerentscheidung einen einzelnen neuen Versuch erlauben; dessen mögliche erneute Concurrency-Ablehnung offen ausweisen. Alternativ bleibt die Verbindung bis bestätigter Freigabe gesperrt. Das ist eine reale Verfügbarkeits-/Risikoabwägung, keine spielmechanische Regel.

Technische Details wie Dateinamen, Layoutabstände oder die Verwendung vorhandener IDs brauchen keine erneute Grundsatzplanung. Der Review soll besonders Reservierung vor `MESSAGE_SENT`, Savekonkurrenz, native Streamingkapazität, gemischte Planbindung und Unverändertheit der Mechanik prüfen. Bestehen diese Grenzen, ist der erste Umfang fachlich zusammenhängend und ausreichend klein für einen frühen echten Spielnachweis. **Dieser Fachplan selbst ist weder Codeauftrag noch GO für einen persönlichen Spieltest.**

## 13. Quellen und Lieferstatus

- Verbindliche Dokumentationsbasis: main `1f9d159`, [08](../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md), [Analyse §§1–10](../recherche/ANALYSE_200_VEREINFACHUNG_UND_NARRATORFREIHEIT_2026-11-17.md), Arbeitsweise/Kanon/Status und Quellenindex.
- Produktbelege ausschließlich `.200 / 0cd1480`: [Runtime](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/src/v4/runtime.js), [Planner](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/src/v4/planner.js), [Hostadapter/Settings](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/index.js), [HUD](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/src/hud.js), [Persistenzprüfung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/src/v4/continuation.js).
- Historische Quellen nur gezielt: Kampffachplan `.192`, User01-UI/QoL und persönlicher Waldfehler, oben verlinkt. Keine archivierte Alpha als aktiver Entwicklungspfad.
- **Tatsächlich durchgeführt:** Read-only-Code-/Dokumentenprüfung, Remoteabgleich, neuer leerer Entwicklungsbranch am Produktcommit und separater Checkout. Dokumentationsprüfung/Commit auf main separat im Abschluss gemeldet.
- **Nicht durchgeführt:** Produktimplementierung, Builds, Node-/Replay-/ST-Läufe oder natürliche Provideraufrufe. Keine alten Testzahlen als neue Abnahme ausgegeben.
