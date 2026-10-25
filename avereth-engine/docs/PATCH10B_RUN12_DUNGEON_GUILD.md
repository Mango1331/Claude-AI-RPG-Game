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
