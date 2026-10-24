# Patch 10B-1 — Faktenidentität und Registrierungsabhängigkeit

Build 4.3.0-c.6.6.58; Basis fd20d0dce0b0fc508b17810872b7933a5f00e994. Implementiert durch Codex am 24.10.2026. Unabhängiges Review und echter Livetest offen.

## Änderung

`knowledge.js:setFactEvents` erzeugt automatische IDs aus lesbarem Präfix, Hash des vollständigen Subjekts/Prädikats und Turn. Ein deterministischer Belegungscheck mit Suffix schützt auch bei Hashkollisionen und bei A→B→A im selben Turn. Aktuelle identische Aussagen werden weiterhin dedupliziert; Functional-Fakten enden wie bisher. Explizite IDs und alte Eventlogs werden nicht geändert. Dies korrigiert die vier überschriebenen Bogenfakten aus Run 1 ohne NPC-Generatoränderung. Der gemeinsame Knowledge-Helfer erzeugt auch in Legacy/V4-A neue IDs nach dieser Regel; historische Events falten unverändert.

`v4/commands.js:resolveCommands` lässt eine nach dem Guard verbleibende `offer.accept`-Abhängigkeit auf eine redundant entfernte Registrierung nur für das offene kanonische Registrierungsangebot passieren. Der Gebührenhandler prüft weiterhin Auswahl, Ort, Geld und Mitgliedschaft. Andere Zahlungen oder Schutzablehnungen erhalten keine Freigabe. Bereits registrierte Figuren dürfen nur wirklich redundante Registrierungsvorgänger verwenden; zuvor reichte hier die bloße Existenz eines entfernten Registrierungsbefehls auch bei echter Guard-Ablehnung.

## Nachweise

11 neue Tests in `tests/v4/patch10b1.test.js`. Finaler Rotlauf auf unveränderten .57-Produktmodulen: 5/11 grün, 6 gezielt rot (vier Bogenschützen, mehrere Werte/Prädikate, funktionale Historie, Originalregistrierung, echte Guard-Ablehnung bei Mitgliedschaft, belegte ID). Nach Fix: 11/11 grün. Angrenzende Agency-/c66-Suiten einschließlich neuer Tests: 125/125. Vollsuite: 1286/1286 grün, ein Abschlusslauf. Serialisierter Event-Replay für Fakten, Materialisierung und Wissensreferenzen; Registrierung über den V4-C-Planner-/Guard-/Handlerpfad. Keine neuen Tests oder Zahlen aus einem Livetest behauptet.

## Grenzen

Kein neuer Eventtyp, keine Eventmigration, keine Änderungen am Agency-Guard, Narrator-Vertrag (.55), Planner-/Extractor-Vokabular oder Runner. 10B-2/3/4, Balance und Guide unverändert. Gegen echte Hashkollisionen wird über belegte IDs geprüft, nicht durch Kollisionsfreiheit des Hashs argumentiert. Bereits verlorene historische Fakten werden nicht rekonstruiert. Explizite IDs behalten ihre bisherige Caller-Verantwortung.

