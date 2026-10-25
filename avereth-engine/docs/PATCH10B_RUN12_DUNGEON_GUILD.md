# Run 12 – Slotidentität und Lieferverträge (.79)

Basis aa788dd (.78). Dungeon und Guild umgesetzt; World-State/Reisen ausdrücklich nicht umgesetzt. Fachplan auf main: patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md.

## Dungeon

E146: present:false übersprang Slotprüfung, V3 erzeugte drei lokale Entities, Nachholung drei weitere. Exakte Slotreferenzen werden jetzt unabhängig von Präsenz aufgelöst; kanonische Referenz und story_ref verwenden bestehende IDs. Entfernte Slotgegner werden einmal gebunden, ohne scene.entered, Raum oder met_turn. Erst spätere Präsenz verortet sie und materialisiert ihre Profile. Bekannte andere Räume bleiben geschützt. Der Adapter erhält present:false; alte V3-Aufrufe behalten ihre bisherige Semantik. Keine freien Zusatzgegner innerhalb der Dungeonpopulation und keine automatische Altsave-Bereinigung.

## Guild

Board-Version board-5.0: neue Lieferobjectives tragen delivery:{v:1,mode,recipient_kind,recipient,place}. Name und Rolle sind explizit, Ablage verlangt null-Empfänger. Ware/Menge bleiben im Objective. task/desired_end_state/where werden daraus erzeugt; quest.created speichert denselben Deskriptor. Ausführung prüft den genauen etablierten Ort, anwesenden Empfänger und die Übergabeart. Namen fallen nicht auf beliebige Berufsvertreter zurück. Unbekannte Orte/Personen werden durch den Vertrag nicht erzeugt.

Alte gespeicherte Quests behalten .78-Freitextsemantik. Ältere Generatorantworten mit eindeutigem at-Format werden beim Veröffentlichen einmal konvertiert; komplexe Empfänger verlangen den expliziten Deskriptor. Kommaadressen erhalten einen feldbezogenen Formatfehler, keine automatische Freigabe. Anzahl der Repair-Versuche unverändert. Alte nicht betroffene Objectives erhalten kein zusätzliches null-Feld.

## Nachweise

8 neue Tests: gegen unverändertes .78 alle 8 rot, danach alle 8 grün. Enthalten: Original-E146-Extractor mit aus Originalevents gefaltetem Vorzustand; beide originalen Boardantworten und korrigierte typisierte Veröffentlichung bis physischem Lieferreceipt; entfernte Weltkreatur; wiederholte Slotreferenz, Erstpräsenz, anderer Raum und Event-Replay; Name/Rolle, genauer Ort und Ablage.

Originalfixtures stammen aus der ZIP 20261025-044431Z-current_test auf main, SHA256 723d2660837dcf849a8b416ccea87346589e8153f97fbf1864f9dcc9e8ac7e0d. Keine Credentials/Requests gespeichert. Die E146-Prosa im Test ist kurz; die Original-Extractorantwort und der Vorzustand sind unverändert.

Gezielt 54/54 (vor den vier zusätzlichen Original-/Gegenfällen). Vollsuite final 1571/1571. Ein bestehender Board-Versionstest wurde auf board-5.0 aktualisiert; historische Lieferprüfungen bleiben unverändert. Erster echter ST-1.19-Smoke: 20/21, fünf Extractor-Aufrufe, extractPerReply/fightOpened erfolgreich; zwei AbortReason-PageErrors aus openai.js:4565. Unveränderte Wiederholung: 21/21 bestanden, fünf Extractor-Aufrufe, keine PageErrors. Kein natürlicher Providerlauf.

## Grenzen

Kein natürlicher GLM-Langlauf. Vorhandene beschädigte Run-12-Entities werden nicht gelöscht. World E197–E200 bleibt offen; weder Reisezeitgrenzen noch Arrival-/READY-Regeln geändert. Keine XP-, Monster-, Kampfwert- oder Testspieleränderungen. Ein LLM kann weiterhin falsche Angaben liefern; neue Lieferfelder benötigen natürlichen Provider-Nachweis.

## Bedingter Gegenreview und Folgefix .80 (25.10.2026)

Basis 0f1195d (.79). Beide Reviewhypothesen anhand des Codes und neuer Regressionen geprüft; World bleibt unverändert und offen.

### P1 – Reservierung ist keine tatsächliche Begegnung: bestätigt, Auswirkung präzisiert

nextWaiting verwendete entities.length als Begegnungsnachweis. Dadurch wurde eine entfernte Warband übersprungen; aheadEvents konnte trotz lebender Gegner einen ruhigen Rest der Ebene ankündigen. Die vorhandene Minion-Schranke verhindert jedoch weiterhin, dass ein Guardian vor ungelösten Minions angeboten wird. Eine generelle vorzeitige Boss-/Seal-Freigabe ist dadurch nicht belegt. floorText beschrieb reservierte Gegner als lebende, bereits angetroffene Population; der Extractor verlor die ENGINE-ENCOUNTER-Zeile.

slotMet wertet jetzt die bestehenden Felder at/met_turn aus. nextWaiting und der Extractor-Katalog behalten einen reservierten, ungelösten Encounter als ausstehend. floorText zeigt ihn als "known, not met": die bereits gewonnene Kenntnis bleibt sichtbar, ohne eine Begegnung zu behaupten. Bei verbleibenden bekannten Gegnern behauptet aheadEvents nicht mehr, dass nichts entgegensteht. Guardian-/Boss-Schranken, Pace und Clear-/Credit-Regeln bleiben unverändert.

Die Nachholung nach tatsächlicher Ankunft verwendet die reservierten IDs über den vorhandenen Wiedererkennungspfad. Eine erneute present:false-Meldung derselben Antwort verhindert weiterhin eine erzwungene lokale Einbuchung; dies nutzt das vorhandene antwortlokale namedHere. Kein neues Event, keine zusätzliche Encounter-Verwaltung, keine Save-Migration. E146 erzeugt weiterhin genau drei entfernte Slotgegner.

### P2 – Historische Rollenbeschreibung als Empfangsberechtigung: bestätigt

contains ließ "former granary keeper" und indirekte Rollenverweise genügen. Außerdem konnte ein alter Deskriptor eine abweichende aktuelle occupation überstimmen. Das Faktenmodell besitzt bereits einen funktionalen occupation-Wert, dessen Vorgänger beim Rollenwechsel beendet werden.

Für neue typisierte Rollenverträge gilt jetzt die aktuelle occupation vorrangig; nur ohne sie dient der führende Rollendeskriptor als Fallback. Eine eindeutige Rollenbezeichnung wird verglichen (normalisierte Schreibweise, optionale Artikel); freie beschreibende Sätze und spätere Deskriptoren genügen nicht. Neu eingeführte NPCs funktionieren sowohl über den Rollendeskriptor als auch über das von person.new erzeugte occupation-Faktum. Namen bleiben exklusiv. Ungetypte historische Lieferverträge behalten ihren bisherigen Prüfpfad; Cargo, Mengen, Provenienz, Receipt und Auszahlung wurden nicht verändert.

### Tatsächliche Prüfung

15 neue Tests in tests/v4/patch_run12_review.test.js: auf unverändertem .79 zwölf rot, drei grüne Kontrollfälle; nach Fix 15/15 grün. Geprüft: E146-Reservierung; nächste Begegnung mit und ohne Creature-Delta; wiederholte entfernte Sichtung; erneutes Betreten mit denselben IDs; ungelöste Minions und Seal; reservierter Guardian/Boss; HUD-/Extractor-Text; Auflösung und Fortschritt; JSON-Reload und Event-Replay; ehemalige/verneinte/indirekte Rolle; faktischer Berufswechsel; neuer NPC; Legacy-/Namensempfänger und physischer Lieferreceipt mit Replay.

Angrenzend 168/168, vollständiges npm test 1586/1586. Kritischer Diff und diff --check ohne Befund. Keine Host-, Provider-, Planner- oder Extractor-Schemaänderung; daher für .80 kein erneuter ST-Smoke. Der oben dokumentierte .79-Smoke ist kein neuer .80- oder natürlicher Provider-Nachweis.

### Verbleibende Grenzen

Rollenbezeichnungen müssen eindeutig sein: beliebige Adjektive, Synonyme oder mehrere Berufe in einem freien Satz werden für typisierte Verträge nicht semantisch erraten. Ein irrtümliches aktuelles Rollenfaktum bleibt ein möglicher LLM-Fehler. Historische freie Lieferverträge werden bewusst nicht verschärft. Keine automatische Bereinigung früherer beschädigter Dungeon-Saves. Natürlicher .80-Langlauf und World-Fix stehen weiter aus.
