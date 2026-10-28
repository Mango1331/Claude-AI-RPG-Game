# Sichere Fortsetzung nach Modellfehlern — Teil 1 / Build .105

Basis `.104` / `b9ffa2c`. Umsetzung von Schritt 1 des [Fachplans auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md), einschließlich GPT-Gegenreview vom 28.10.2026. Teil 2 und Combat Main/Minor bleiben offen.

## Ergebnis

- `parseExtraction` behandelt bekannte NPC-Kontinuitäts- und Verkaufsrichtungsprobleme als lokale Reparaturhinweise. Die begrenzte Reparatur bleibt erhalten; ein bereits schema-valider Kandidat geht bei misslungenem Repair nicht verloren. World prüft weiterhin jeden Eintrag gegen Autorität, Anwesenheit, Szene und Abhängigkeiten. Schemafehler werden nicht allgemein herausgefiltert oder erraten.
- Fehlgeschlagene Plannerinputs erhalten eine sichtbare **NOT EXECUTED**-Engineantwort, ohne Spielerevents, Zeit, RNG oder Kampfrunde. Die Spielernachricht wird nicht zu `is_system`. Regenerate kann neu planen. Der nächste Narrator bekommt ausdrücklich die vorherige Nichtausführung zurückgemeldet.
- Fehlgeschlagene Modell-Extraktionen enden `failed` mit einem Record-Marker für mögliche Fortsetzung. Bereits auf der Spielernachricht gebuchte Käufe, Kämpfe, XP und Zahlungen bleiben bestehen. Engine-/Ownershipfehler erhalten keinen solchen Marker.
- `world_jobs` schließt unerwartete Fehler vor Commit über den bestehenden Fehlerpfad ab; Fehler beim anschließenden Speichern erhalten das tatsächlich bereits geschriebene Ergebnis. Kein Zurücksetzen auf `pending` und keine erneute Extraktion nach Commit. Rerenderfehler verhindern das Speichern nicht.
- Kritische Korrekturen bleiben bei kleinem Kontextbudget erhalten: bis vier Hinweise mit je maximal 400 Zeichen, eigenes geschütztes Budget. Der zeitliche Bezug bleibt „voriger Reply“; aktuelle autorisierte Handlungen werden dadurch nicht verboten.
- Bei seltenen Modellfehlerfortsetzungen wird nach normalem ST-Save der gespeicherte Chat über den bestehenden Leseendpunkt zurückgelesen. Es werden nur Text, Rollen, Events und Abschlussmetadaten verglichen; keine Ereignisse rekonstruiert. Chatwechsel, Edit und echte Swipewechsel invalidieren die Bestätigung. Der Record-Marker ist keine Speicherquittung. Normale erfolgreiche Züge erhalten keinen zusätzlichen Readback.
- Runner: Save-HTTP-/Netzwerkfehler sind harte Stopps. Sichere Modellfehler können nach konsistentem Fold, Stateprüfung und eigenem Readback fortgesetzt werden. Originalfehler bleiben erhalten. `run.json` zählt tatsächliche sichere Fortsetzungen und nennt ungeklärte Expected-Aktionen; unverständliche Plannerinputs haben unbekannte Aktionsanzahl. Drei aufeinanderfolgende technische Nichtausführungen ohne mechanischen Fortschritt stoppen den Run. Panels zählen nicht als Fortschritt. Tod, Engine-/Persistenzfehler und unbestätigte Zustände bleiben Stopps.

## Technische Grenzen und Entscheidungen

Keine zusätzliche NPC-Klassifizierung, kein Schema-Salvage, kein Transaktionsframework, keine höhere Token- oder Retrygrenze. Die bestehenden Provider-Retries bleiben kompatibel. Unklassifizierte Exceptions dürfen nach ausgeschöpfter Recovery keine sichere Fortsetzung freigeben; Authentifizierungs-/Konfigurationsfehler bleiben hart.

`ctx.saveChat()` in ST 1.19 kann einen HTTP-500 intern abfangen und dennoch zurückkehren. Deshalb reicht sein Promise nicht als Quittung. Die neue Prüfung greift nur bei der Fehlerfortsetzung. Sie erzeugt keine zweite persistente Zustandsquelle und keine Schreib-/Bestätigungsschleife. Bekannte Speicherfehler werden nicht durch erneute Engineausführung repariert.

Bei formal kaputtem Extractorbericht können weiterhin unabhängige World-Informationen fehlen. Der Unterschied ist eine erkennbare Nichtübernahme mit neuer Spielerentscheidung statt endgültigem Kampagnenabbruch. Sichere Fortsetzung ist kein erfolgreicher Handlungsvollzug. Eine Garantie für widerspruchsfreie spätere LLM-Prosa entsteht nicht.

## Abnahme

- **13 neue Regressionen** in `tests/v4/patch_failsoft.test.js`. Die ersten **6** wurden vor Produktänderung gegen `.104` ausgeführt: **6/6 rot** (globale Semantikblockade, verdrängte Korrekturen, Hostabschluss vor/nach Commit). Danach **13/13 grün**; weitere Kontrollen prüfen Nichtausführung/Regenerate, ursprünglichen Input und RNG, erhaltene Buchung, Replay, keine erneute Extraktion, Authentifizierungs-/Enginefehler und Readback mit falschen Daten/Edit/Swipe.
- Bestehende Tests auf die bewusst geänderte Rückgabe `not_executed` beziehungsweise lokale `issues` angepasst. Bestehende Prüfungen auf fehlende unerlaubte Geld-/Objekt-/NPC-Buchungen bleiben erhalten.
- Vollständige Node-Suite: **2078/2078 grün**, `npm test -- --test-concurrency=4`. Die begrenzte Testparallelität ist nur ein Aufrufparameter, keine geänderte Produktkonfiguration.
- Echter ST-1.19-Browser-Smoke mit geskriptetem Provider: Standard **22/22 grün**, fünf reguläre Extractor-Aufrufe. Erweiterter Fehler-Smoke **27/27 grün**: sichtbare Nichtausführung mit erhaltenem Spielerinput; gespeicherter Fehlerrecord; terminaler Extractorfehler; keine doppelte Kampfbuchung; absichtlicher Save-HTTP-500 wird trotz erfülltem ST-Promise durch Readback erkannt. Der erwartete ST-Savefehler wird separat als injizierter Fehler protokolliert, nicht als normaler fehlerfreier Save ausgegeben.
- Kein natürlicher GLM-Langlauf gestartet. Preise, Place-Ref-Repair und Angebotszeilen aus Teil 2, Kampfökonomie, Balance, Testspielerstrategie und Narrator-Vertragsrevision unverändert. Keine Aktualisierung der persönlichen Karte erforderlich.
