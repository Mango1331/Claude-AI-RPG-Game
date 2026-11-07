# GPT – Unabhängiger Produkt-Diff-Gegenreview Build .161 (07.11.2026)

**Prüfumfang:** Produktcommit [`bd19a30`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bd19a30fb60c0c05ea9ecf077dc25b1cb4094088), Vergleich gegen .160 [`16e7358`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/16e73581d470581982e2bc0bd6ff3d4379099be1). Grundlage: Originalfeedback User01/02/04, der ausdrücklich beauftragte gebündelte QoL-Umfang, [Sols ausführliche Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd19a30fb60c0c05ea9ecf077dc25b1cb4094088/avereth-engine/docs/FIX161_USER_QOL.md), der tatsächliche GitHub-Diff und die relevanten Test-/ST-Smokepfade.

**Urteil: KEIN KRITISCHER PRODUKT-DIFF-STOPPER.** Der geplante begrenzte QoL-Umfang ist auf Codeebene eingehalten. Die neuen UI-Schaltflächen senden/buchen nichts; die drei engen Gameplaykorrekturen sind zielgerichtet und enthalten Schutzfälle. **Empfehlung:** ohne ungefragten Hotfix zum natürlichen User-Test übergehen. Drei transparente Funktionsgrenzen und zwei niedrige Beobachtungspunkte unten.

**Prüfmethode:** Der GPT-Review liest und vergleicht den öffentlichen Produktdiff, relevante Quellfunktionen, Regressionen und ST-Smoke-Assertions sowie das unveränderte Replayakzeptanz-JSON. **Keine Node-Tests, ST-Smokeläufe oder freien Narrator-/Planneraufrufe wurden von GPT selbst erneut ausgeführt.** Das lokale Arbeitsumfeld kann das GitHub-Repository nicht per Netzwerk klonen. Die dokumentierten Laufzahlen stammen aus Sols tatsächlich berichteter Abnahme, nicht aus diesem Review.

## 1. Scope und Replaybasis

Geprüfte funktionale Änderungspfade: `src/hud.js`, neu `src/ui_actions.js`, `index.js` (einmalige Installation), `style.css`, `src/v4/planner.js`, `src/v4/commands.js`. Versionsdateien und gezielter Test-/Smokecode sind erwartete Begleitänderungen. Der Diff ändert **keine** Kampf-Rundenlogik, Recoveryformeln, Dungeon-Weltereignisse, PULSE-Regeln, Eventreducer oder vorhandene Save-Schemas.

**Unabhängige Akzeptanzprüfung:** `tests/replay/accepted_fix160_vs_126.json` hat bei den beiden Produktcommits denselben Git-Blob SHA `a732ec36c4cf8875fd6ad28b6b37d45891d59a89`, denselben JSON-Inhalt und **517 akzeptierte Fall-IDs**. Keine Akzeptanzeinträge ergänzt, entfernt oder geändert. `tests/v4/fix160_user04_qol.test.js` wurde an genau einer Boardassertion von `html.includes(q.id)` auf `html.includes(q.task)` angepasst, weil technische IDs jetzt nur bei tatsächlich gleichem Titel sichtbar sind. Dies ist **bewusstes geändertes UI-Verhalten**, keine stillschweigende Senkung eines Mechanikchecks; der neue .161-Test prüft den Erhalt individueller Quests sowie IDs bei Duplikattiteln.

Sols dokumentierte Abnahme: 13/13 neue, 47/47 angrenzende, 2835/2835 volle Node-Tests; 2235 Replayfälle, davon 517 exakt akzeptiert, 0 offen/veraltet; echter ST1.19-Host Standard 63/63 und Failsoft 68/68, beide 0 PageErrors. `tools/st_live/ui161_smoke.mjs` verwendet echte ST-DOM- und Hostabläufe mit **geskripteten Providerantworten**, prüft u. a. Composer-Doppelklick/Re-Render, Escape/XSS, schmale Chatpanels, Startfälle, Suchcheck, Save/Reload. Das belegt nicht die natürliche Befolgung des Plannerprompts.

## 2. UI-1/UI-2 – Questboard und editierbare Annahmeentwürfe

**Sauber begrenzt.** `renderBoardCards()` lässt Titel, Rank/Level, Geld, Ziel-/Gefahrenbeschreibung und bekannten Resetvorbehalt stehen; `Contract details` enthält nur noch eigenständigen Auftragstext, gegebenenfalls Client und bei dupliziertem Titel die technische Referenz. Kein Board-/Quest-/Zahlungsereignis wird von der Darstellung gebucht. Fünf Kanonkarten bleiben fünf Kanonkarten.

`draftButton()` schreibt einen Text in ein HTML-Datenattribut mit Escaping von `&<>"'`; sichtbare Inhalte sind ebenfalls escaped, Buttons sind `type=button` statt Inline-Eventhandler. `installDraftActions()` verwendet einen delegierten Dokument-Clicklistener, einen Symbol-Marker gegen doppelte Installation und prüft existierendes/bedienbares `#send_textarea`. Er hängt Text einmal an, feuert ein lokales `input`-Event und setzt den Fokus. **Kein Send-/Generate-/Planner-/Engineaufruf.** Vorbereitete Sätze bleiben redaktionell und müssen vom Spieler ausdrücklich gesendet werden, bevor die alte Quest-Autorisierung greifen darf.

Das neue UI verweist bei identischen Titeln auf eine tatsächliche Quest-ID statt die Zuordnung zu verlieren. **Beobachtungsgrenze N1:** Ein Entwurfsbutton in einer **historischen** Nachricht kann einen nicht mehr aktuellen Auftrag vorschlagen. Das ist erlaubt und nicht gleichbedeutend mit einer Buchung; die reale Annahme hat weiterhin die aktuellen Validierungen zu bestehen. Ggf. im natürlichen Lauf beobachten, ob Spieler das als veralteten Vorschlag verstehen.

## 3. UI-3/UI-4/UI-5/UI-6/UI-7 – Ground, Kampf, Dungeon, Styles

**Ground:** Die Menge erreichbarer Objekte kommt weiterhin ausschließlich aus `groundAccess().ok`; auf dem Worldpanel erscheint statt der früheren Sammelzeile eine übersichtliche Einzelliste mit Mengen, Einheiten und nur bei gleichen Namen zusätzlichen IDs. Die zugrunde liegende `worldRows()`-Projektion bleibt für andere Verbraucher erhalten. Ein `Take…`-Button erzeugt nur Text; keine Aufnahme oder fremder Besitzwechsel.

**Combat:** Die bereits seit .157 führende Combatansicht wird beibehalten, keine zweite Zielautorität geschaffen. Die `First Strike explained`-Hilfe ist auf `enc.first_strike`, tatsächlichen PC-Runde-0-Angriffsrecord und gerade gestarteten Kampf eingeschränkt; echte Ambushes und spätere Züge bekommen sie nicht. Die Hilfe erläutert das verbrauchte Runde-1-Aktionsbudget und mögliche doppelte Gegneraktionen über die Rundengrenze, ohne Combatregeln zu verändern.

**World/Dungeon:** `Dungeon level` und `Dungeon cycle` wurden in `worldRows()` nach oben vor längere Beschreibung/Exits gestellt; `livingRows()` bleibt derselbe Welt-/Zyklusanbieter. Keine zusätzlichen unbekannten Etagen/Resetzeiten oder zusätzliche Gate-Systemkarte.

**CSS:** Neue Selektoren sind auf Avereth-Nachrichten/-Elemente begrenzt; schmale Combatkarten erhalten ein benanntes `@container`-Layout, Board- und Ground-Elemente begrenzte Breite, flexiblen Umbruch und Themefarben. Der ST-Smoke prüft u. a. 320-px-Karte innerhalb 1280-px-Fenster und 390-px-Mobile-Viewport einschließlich Screenshots. Keine Änderung globaler SillyTavern-Styles.

## 4. Q-1/Q-3/Q-5 – kleine Gameplay- und Parserkorrekturen

**Frühstück:** `parsePlan()` normalisiert nur ausdrücklich zitierte Mahlzeit-Äußerungen, für die der Planner `activity(kind=activity/rest)` ausgegeben hat, in `other`; echte Absicht zu Rasten, Schlafen, Warten oder Lernen wird durch eigene Ausschlusswörter geschützt. Das alte `rest`-Clarify bleibt für echte, nicht spezifizierte Rast erhalten. Die zwei Originalantwortvarianten werden geprüft; die Engine erfindet weder Dauer noch Erholung.

**LONG-Rückzug:** `mapPlan()` korrigiert die Richtung nur bei explizit zitierter Zielbandangabe und bekanntem Zielband. Im Original wird aus `closer` nun `away`, der normale Kampfmechanismus führt den Schritt aber weiterhin als `after_move` **nach dem Angriff** aus. Kein Distanzteleport, keine neue Bewegungsaktion und keine nicht autorisierte Range. **Funktionsgrenze N2:** Der Spielertext „erst weggehen, dann zaubern“ ist dadurch **nicht** in seiner Reihenfolge umgesetzt; Sol dokumentiert das korrekt als außerhalb des lokalen Patches liegende Combatreihenfolge. Nur bei erneuter tatsächlicher Reibung im natürlichen Run als eigenes Design-/Mechanikthema behandeln.

**Gemischte Suche:** Wenn schon auto-geplünderte Leichen anwesend sind, trennt `activity(search)` per ausdrücklich aufgezählten Fokusanteilen den bereits erledigten Leichenanteil von zusätzlich gefragter Umgebung. Der Shortcut `looted already` blockiert dann nur die Leiche, während die Umgebung durch den **bestehenden** Check-/Zeit-/Wiederholungspfad läuft. Kein zweiter Corpse-Loot, kein automatisch erzeugter Schatz, keine zweite Suchaktion aus jedem konjunktiven Text. Der reale User04-Originalzustand und reine Leichensuchen sind in der neuen Suite enthalten. Enger, begründeter Parser statt einer neuen allgemeinen Grammatik.

## 5. Grenzen und niedrige Nachbeobachtung

- **G1 – Verkaufshilfe ist nur Promptkorrektur.** Die Regeln unterscheiden Tams Vermittlungsangebot und zukünftigen Brokerbesuch von einem schon jetzt autorisierten Verkauf. Kein lokaler `sell`-Handler hätte die ursprüngliche vom Modell erzeugte `clarify`-Ausgabe zuverlässig korrigiert. Die neue Testsuite beweist **Auslieferung der Plannerinstruktion und Erhalt legitimer Clarify**, nicht eine verbesserte **natürliche Modellbefolgungsquote**. Im nächsten natürlichen Gespräch mit Tam/Broker gezielt darauf achten.
- **G2 – Knochenverbrauch nicht implementiert.** Die tatsächliche ursprüngliche Extraktion enthielt keine autorisierte Verbrauchsbuchung; eine automatische Löschung aus Prosa wäre ein riskanter Eigentums-/Inventareingriff. Das Zurückstellen ist begründet, der ursprüngliche physische Kontinuitätsbefund bleibt real und offen.
- **N3 – Semantische Engführung beim Mahlzeit-Parser:** Die Normalisierung wird bewusst nicht bei ausdrücklich gleichzeitiger Rast-/Schlafabsicht aktiv. Die Unterscheidung der zusammengesetzten Spieleräußerung bleibt im konkreten Einzelfall dem Planner; keine allgemeine natürliche Sprachabdeckung zugesagt. Beim User-Run nur nach wiederholtem tatsächlichem Fehlschlag vergrößern.
- **N4 – Enger gemischter Suchsplit:** Durch Komma/`and` explizit getrennte Abschnitte funktionieren, aber beliebige paraphrasierte oder ineinander verschachtelte Suchabsichten werden nicht neu zerlegt. Das verhindert auch unbeabsichtigte Auto-Loot-Freigaben und ist aktuell angemessen.

## 6. Empfehlung / nächster Schritt

**.161 für den natürlichen User-Test akzeptieren; kein zusätzlicher Fix vor dem Run.** Bei diesem Run das spontane Spielgefühl und konkrete Handlungssituationen notieren, nicht eine künstliche Checkliste erzwingen. Besonders hilfreich: Wie wirken die Boardkarten/Entwurfbuttons? Hat der Spieler das Gefühl, dass `Take…` erst nach Senden gilt? Kommt die Frühstücks-/Handelsklärungs-Reibung zurück? Bleibt die gemischte Umgebungs-/Leichensuche intuitiv?

Den **parallelen PULSE-Arbeitsstand nicht zurücksetzen**. Der PULSE-Plan auf `main` ist davon getrennt; Claude soll paketweise auf aktuellem Produkt-`HEAD` einschließlich .161 aufsetzen. Ein neuer PULSE-Commit ist **nicht** automatisch Teil dieses QoL-Reviews.

**Prüfgrenze:** Produktcode in diesem Review nicht verändert; nachfolgender natürlicher Test ist die noch ausstehende Verhaltensvalidierung mit freiem Modell.
