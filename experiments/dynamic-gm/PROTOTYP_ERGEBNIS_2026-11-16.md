# Dynamischer GM – Werkzeugvertrag und Sicherheitsnachtrag

16.11.2026. Ausgangspunkt `c7622605419855233a305b9c1c5c2b039c28ddf8`, ausschließlich `experiment/dynamic-gm-model`. Produkt `.200`, `main`, `architecture201`, persönliche ST-Installation und historische Originalcorpora unverändert. Keine Provideraufrufe, neue Gameplaymechanik oder Produktintegration. Frühere Ergebnisse sind über den Ausgangscommit weiter einsehbar; dieser Bericht beschreibt den aktuellen Nachtrag.

## Entscheidung

**Der Vertrag ist technisch bereit für einen kleinen isolierten echten ST-Hostdurchstich mit geskripteten Antworten.** Die zwei konkreten Hostfehler sind korrigiert; vollständige Abschlüsse benötigen keine reine Bestätigungsanfrage. Echte kreative Fortsetzungen können neue Zusagen ergänzen, ohne bereits aufgelöste Mechanik erneut auszuführen. Der echte Host muss allerdings die hier eingeführte explizite Chat-Zielbindung tatsächlich implementieren und im Browser beweisen.

Das ist **keine Freigabe für natürliche Rollenspielqualität oder produktiven Spielbetrieb**. Freie Prosa kann nach wie vor wichtige Zusagen auslassen, gebuchten Orten widersprechen, PC-Zustimmung erfinden und fremdes Wissen verwenden. Stärkere deklarierte Strukturen begrenzen diese Risiken, erkennen aber nicht jede unmarkierte Behauptung. Diese Fehlerklassen bleiben Gegenfälle für den später separat freizugebenden natürlichen Vergleich.

## 1. Host- und Transaktionssicherheit

Die vier zentralen Rotfälle wurden zuerst auf c762260 ausgeführt: Wiederaufnahme eines pending/published Turns im falschen Chat sowie Stop/Chatwechsel nach `await before_commit`. **0/4 bestanden.** Beim Commit-Gegenfall war die Weltrevision bereits verändert, obwohl spätere Anzeige abgewiesen wurde.

Jetzt speichern Journal und Turn eine unveränderliche `originChatId`. Wiederaufnahme benötigt denselben Chat, aber kein historisches Generationstoken: Ein Reload darf die Epoch erneuern. Ein anderer Chat wird vor einem neuen Request und auch bei bereits committed/published Turns abgewiesen. `begin` kann ein bestehendes Journal nicht einem anderen Chat zuordnen; alte Journale ohne gebundene Identität werden nicht still migriert.

Nach `await hook('before_commit')` erfolgt erneut die aktuelle Token-/Chatprüfung, unmittelbar vor dem synchronen Weltcommit. Die Weltrevision bleibt bei Stop/Chatwechsel dort unverändert. Ein später erlaubter Reload im ursprünglichen Chat nutzt den gespeicherten Antwortbeleg statt einer neuen Anfrage.

Zusätzlich wurde die Save-Zielbindung konkret gemacht: `OriginHost.saveChatFor(originId, ...)` nimmt das unveränderliche Ziel ausdrücklich entgegen. Der `BoundPublication`-Adapter verwendet weiterhin den vorhandenen `HeldPublication`-Ablauf, aber mit zielgebundenem Save/Read-back. Ein Test wechselt den aktiven Chat **innerhalb eines verzögerten Saves**: nur der Ursprungs-Chat wird gespeichert, im Ersatzchat erscheint nichts; Reload des Ursprungs rekonstruiert das Ergebnis einmal. Damit wird nicht nur die Anzeige nach einem möglicherweise falschen Save abgewehrt.

Grenzen bleiben: lokales POSIX-Journal, ein Prozess/ein Journal pro Chat, Map-DOM statt Browser. Ein echter ST-Adapter ohne explizite zielgebundene Persistenz wird vom neuen Publikationsadapter abgewiesen. Der vorhandene Mock beweist noch keine tatsächliche ST-/Windows-Implementierung dieser Schnittstelle.

## 2. Dynamischer Abschluss und echte Fortsetzung

`world` und `finish` dürfen einen vollständigen Kandidaten sofort validieren, gemeinsam persistieren und veröffentlichen. Es gibt keine obligatorische Bestätigungsphase mehr. Der GM fordert nur mit `world.continue:true` ausdrücklich ein Ergebnis vor weiterer Erzählung an.

Bei einer Fortsetzung gilt:

1. Der bereits aufgelöste Kandidat einschließlich Objekt-/Orts-/Mechanikereignissen wird dauerhaft im Turnjournal gehalten und als Ergebnis geliefert. Er ist noch kein veröffentlichter Gesamtzug.
2. Ein neuer GM-Request kann zusätzliche freie Prosa und wichtige Sprechakte/Threads erzeugen. Der bestätigte Text bleibt als Präfix unverändert; Ersetzung des Weltobjekts oder widersprechende strukturierte Ortsclaims werden abgewiesen.
3. Nur zusätzliche Versprechen, Schulden und Gerüchte laufen durch die bestehende Threadfunktion, einschließlich Identitäts-/Erledigungsregeln. Beteiligte müssen gültig sein; PC-Absprachen brauchen einen anwesenden NPC. Vorhandene Kampf-Todesprüfung wird wiederverwendet. Es wird weder `playerTurnV4` noch `applyWorld` noch ein Würfel erneut aufgerufen.
4. Der Eventrecord wird samt aktualisiertem Texthash fortgeführt. Der gesamte gefaltete Zustand außer `threads` muss identisch zum gespeicherten Kandidaten sein: insbesondere RNG, Uhr, PULSE, Inventar, Geld, XP, Szene und Outcome.
5. Retry nach Antwort/Tool/Save/Anzeige nutzt dieselben Belege und bucht keine zweite Zusage oder Gegenstandsübergabe.

Das ist eine echte neue Erzähl-/Memoryfortsetzung, nicht `use_result` unter anderem Namen: Der Test lässt Wat nach der Gabe auf die Schilfgrenze reagieren und eine neue Furt-Zusage machen. Der alte `use_result`-Pfad bleibt nur als explizite unveränderte Wiederverwendung möglich und darf keine versteckten Zusatzfelder einschleusen.

Bewusste Grenze: Nach diesem Worldtool ist **kein zweiter mechanischer Batch** erlaubt. Neue Personen, Orte, Checkketten oder beliebige Faktenänderungen nach diesem Punkt sind nicht implementiert; unterstützte zusätzliche Memorytypen sind eng benannt. Direkte freie Abschlüsse behalten dagegen die bisherigen World-/NPC-Fachpfade. Das ist ein kleiner dynamischer Durchstich, keine allgemeine offene Tool-Schleife.

## 3. Ausgelassene Spielerhandlungen

`contract.mjs` nutzt bestehendes `readTurn`, `deedsOf`, `declarative` und `authorization`. Erkannte mechanische, Reise-, Wirtschafts- und Aktivitätssignale verlangen einen passenden aufgelösten Batch. Hinzu kommt **ein enger Gegenstands-Erkenner** für ausdrücklich verwendete/getrunkene gehaltene Dinge. Er erfindet keine Aktion, sondern verhindert einen Abschluss ohne entsprechende Engineauflösung. Bei uneindeutigem Gegenstand wird angehalten.

Für den vorhandenen Heiltrank bestehen:

- Direkter fertiger GM-Text ohne Auflösung wird abgewiesen.
- Ein vorgeschalteter leerer `resolve`-Batch umgeht den Schutz nicht.
- Echte `use`-Auflösung über die vorhandene Engine verbraucht den Trank und bucht die vorhandene Heilwirkung einmal; der anschließende Weltabschluss benötigt insgesamt zwei Requests.
- Negierte oder fremd zitierte Nutzung erzeugt keinen automatischen Verbrauch. Konservative Blockierung ist in unklaren Fällen zulässig.

Nach dem Parser/Agency-Guard wird zusätzlich kontrolliert, ob die betreffenden Commands tatsächlich in der Auflösung vertreten sind. Eine regulär verweigerte Handlung darf als Verweigerung abgeschlossen werden; kein garantierter Erfolg wird daraus abgeleitet.

**Kein allgemeiner Vollständigkeitsbeweis:** Bestehende Erkenner und die enge Ergänzung decken nicht alle Paraphrasen, Sprachen, gemischten Bedingungen und indirekten Absichten ab. Falsch positive Blockierungen sind möglich. Eine unbekannte Aktion darf nicht mit einem erfundenen erfolgreichen Check beantwortet werden. Eine unabhängig semantisch geprüfte Abdeckung beliebiger Prosa ist weiterhin unbewiesen; hierfür wird kein neuer Vollplanner versteckt aufgerufen.

## 4. G1–G4 und unterstützte zusammengesetzte Handlung

| Fall | Tatsächlicher Befund |
|---|---|
| G1 Wat | Zusage ohne Extractor in einem Request; späterer Abruf ohne Originaldialog liefert Erinnerung/Stimme. Typisierter Sprechakt erzeugt Text und Zusage aus derselben Quelle |
| G2 Wald | Originaleingabe/-plan/-prosa von .200 mit ausdrücklich synthetischer erfolgreicher Weltantwort; tatsächliche Ankunft/Teilreise bleiben korrekt. Vollständiger Abschluss jetzt zwei statt drei Requests |
| G3 ursprüngliche Ablenkung/Schlüsselentnahme | Weiter ausdrücklich nicht unterstützt und abgewiesen. Kein Diebstahl-, Ablenkungs- oder allgemeiner Checkresolver hinzugefügt |
| G3 zusätzliche unterstützte Folge | Holzschlüssel vom Boden nehmen, danach `go` mit `needs:1`: zuerst `resolved`, dann `authorized`, tatsächliche Ankunft und Besitz geprüft. Behält ein NPC den Schlüssel, werden beide Schritte verweigert; kein Ortswechsel. Retry ändert nichts |
| G4 NPC-Gabe | Gewöhnlicher Holzmarker wird einmal erstellt/übertragen. Vollständige Szene in einem Request oder echte Fortsetzung mit neuer Zusage in zwei Requests. Unzulässiger Transfer, zweiter Spielerbatch und neuer Angriff bei geschlossenem PULSE werden abgewehrt |

Die zusätzliche Folge nutzt dieselben vorhandenen Command-/Agency-/Weltpfade. G3 wird dadurch nicht nachträglich als gelöst bezeichnet. Langfristig braucht freie Sprache eine fachlich definierte Zuordnung von **Absicht, betroffener Entität, Handlungsmöglichkeiten, Opposition, Erfolgskriterium und bedingten Folgen** zu vorhandenen Auflösungsregeln. Ein immer größerer Satz Spezialverben ist dafür allein unzureichend. Ebenso wäre ein frei vom GM erfundener DC samt selbst bestimmtem Transfer nur versteckte Gameplayautorität. Welche allgemeinen Prüfungen unterstützt werden sollen, ist eine spätere fachliche Entscheidung; hier wird nichts davon implementiert.

## 5. Semantische Gegenfälle und Figurenwissen

Stärkere gemeinsame Struktur:

- `speech` benennt Sprecher, Inhalt und gegebenenfalls Empfänger/Zusage. Derselbe Text wird angezeigt und als Zusage gespeichert; fehlende separate Delta-Abschrift kann diese **deklarierte** Zusage nicht verlieren.
- Ein PC-Sprechakt braucht identische tatsächlich zitierte Spielerworte; PC-Promises über diesen Kanal sind gesperrt. Das ist kein vollständiger Parser impliziter Zustimmung.
- `claims.at` muss der gebuchten Szene entsprechen. Eine falsche strukturierte Ankunft wird abgewiesen.
- `knowledgeRefs` müssen dem Sprecher gehören. Ein Test mit zwei anwesenden Figuren und getrennten Geheimnissen verweigert Wats expliziten Verweis auf das Geheimnis der anderen Person.

Die **drei ursprünglichen freien Prosa-Gegenfälle bleiben offen**: Zusage ohne strukturierten Eintrag, gebuchte Ankunft trotz Verneinung, erfundene Zustimmung. Zusätzlich zeigt ein Fortsetzungsgegenfall: Der GM kann in freier angehängter Prosa eine zuvor bestätigte Gabe verneinen. Die Mechanik wird dabei nicht verändert, aber die Geschichte ist widersprüchlich. Ein unveränderliches Präfix allein verhindert diesen semantischen Widerspruch nicht.

Die getrennten Wissensantworten enthalten jeweils nur die eigene Wissenszuordnung. Der gemeinsame GM-Kontext enthält bei mehreren Personen trotzdem beide markierten Perspektiven. Korrekte Zuordnung im Text ist damit nicht deterministisch garantiert. Nicht deklarierte Verwendung fremden Wissens bleibt ein späterer natürlicher Gegenfall. Kein Modell pro NPC und keine breite neue Regex-Firewall wurden eingeführt.

Für den späteren Vergleich sind deshalb getrennt zu prüfen: vollständige wichtige Sprechakte, Prosa-/Mechanikdeckung, Spielerautorisierung und perspektivengerechte Dialoge. Ein zweiter unabhängiger semantischer Leser kann bei Bedarf helfen; weder seine Wirksamkeit noch eine natürliche Fehlerrate wurde hier gemessen.

## 6. Tatsächlicher Alt-/Neu-Vergleich

`measure.mjs` lädt den **echten alten Executor von c762260** per read-only `git show` in eine temporäre Datei, mit denselben unveränderten Engine-/architecture201-Abhängigkeiten. Identische geskriptete Kandidaten, Eingaben und Ausgangszustände laufen anschließend durch Alt und Neu. Keine neue Branchanlage oder alte Produktdatei wird benötigt. [comparison.json](comparison.json) enthält jede gesendete Phase mit vollständiger Inhaltslänge, JSON-UTF-8-Größe, Promptdigest, Status, Belegung und fachlichem Zustandshash.

| Probe | Requests alt → neu | Promptzeichen gesamt alt → neu | Fachlicher Zustand |
|---|---:|---:|---|
| G1 | 1 → 1 | 13.463 → 14.643 | identisch |
| G2 vollständiger Waldabschluss | 3 → 2 | 18.382 → 11.984 | identisch |
| G3 unsupported | 1 → 1 | 13.484 → 14.664 | identisch unverändert; kein Abschluss |
| G4 vollständige Gabe | 2 → 1 | 28.753 → 14.643 | identisch |
| Unterstütztes TAKE → GO erfolgreich | 3 → 2 | 18.098 → 12.114 | identisch |
| Unterstütztes TAKE → GO verweigert | 2 → 2 | 10.905 → 12.127 | identisch |

Aktuelle Phasengrößen: G2 5.365/6.619 Zeichen, erfolgreicher unterstützter G3-Fall 5.412/6.702, verweigerter Fall 5.575/6.552. Die übrigen Proben haben je einen Request. Der historische `measurements.json` bleibt separat unverändert.

Die neuen Kernregeln und der sichtbare Gegenstands-/Autorisierungskontext erhöhen einzelne Promptgrößen. Die eingesparte Bestätigungsphase senkt dagegen bei G2/G4 die Gesamtsumme. Keine Behauptung pauschaler Promptverkleinerung. Zeichen sind UTF-16-Inhalte sämtlicher tatsächlich übergebener Messages, keine Tokens. Keine Providerlatenz, Geldkosten oder natürliche Qualität gemessen. Vier Einheiten bleiben die maximale simulierte Belegung.

Eine **echte** G4-Fortsetzung kostet zwei Requests; Timeout nach dem Tool kostet einen weiteren Versuch. Die bisherigen expliziten Fortsetzungs-/Wiederaufnahmeproben laufen weiterhin, ohne sie als Ein-Request-Züge umzubenennen. Gleichheit gilt bei identischen Skriptentscheidungen; freie natürliche GM-Entscheidungen dürften legitim andere Weltfolgen haben.

## 7. Prüfungen

- Rotprüfung der vier Hostfälle vor Korrektur: **0/4 bestanden**.
- `node --test experiments/dynamic-gm/test.mjs experiments/dynamic-gm/safety.test.mjs`: **49/49 Testassertionen bestanden**, 0 fehlgeschlagen/übersprungen, ca. 16,52 s.
- Darin sind **drei ausdrücklich benannte COUNTEREXAMPLE-Tests**, welche vier semantische Fehlbefunde bestätigen. Sie sind keine bestanden geprüften Sprachschutzanforderungen. Die übrigen technischen Fälle prüfen erwarteten Schutz, regelgerechte Erfolge oder explizite Ablehnungen.
- Bestehende Fachregressionen: `node --test tests/v4/pulse_npc_arrival.test.js tests/v4/npc_e2b.test.js tests/v4/c663.test.js` im Engineverzeichnis: **42/42 bestanden**, ca. 1,66 s.
- `node experiments/dynamic-gm/measure.mjs`: sechs Alt-/Neu-Paare ausgeführt; alle jeweiligen fachlichen Zustandshashes gleich. Laufzeittelemetrie `ms/perf/llm` ist vom Fachvergleich ausgenommen.

Zwischenstände deckten außerdem auf, dass angehängte Prosa den Event-Texthash aktualisieren muss und `object.consumed` ein Objekt über `holder.consumed` markiert statt zwingend dessen historische Menge zu nullen. Beide Fälle sind in der finalen Prüfung berücksichtigt; kein Produktvalidator wurde gelockert.

Geprüfte Fehlerpunkte umfassen Antwort, Toolcheckpoint, Weltcommit, verlorene Savebestätigung, Hostsave, Anzeige, falschen Chat und erneuerten Reloadtoken. Gleichbleibende Mechanik wird bei Fortsetzung über den gesamten Fold außer den ausdrücklich neuen Threads verglichen. Die ursprünglichen B/C1-Dateien wurden nicht geändert. Keine Vollsuite, Replayfreigabe, ST-Smokes oder natürlichen Läufe.

## 8. Nächste Entwicklungsphase und offene Grenzen

**Empfohlen ist jetzt der isolierte reale ST1.19-Hostdurchstich mit Mockprovider**, eng auf explizite Save-Zielbindung, Save-Read-back, Stop/Chatwechsel, Reload, gepufferte Anzeige und diese zwei Abschlusswege begrenzt. Der Mock verlangt eine zielgebundene Save-Schnittstelle; ob der echte ST-Adapter sie zuverlässig einschließlich Windows/Browser/Extensions umsetzt, ist genau die nächste zu prüfende Frage.

Keine Behauptung, sämtliche bisherigen Abnahmeprobleme seien damit gelöst. Blocker für einen natürlichen/prod­uktiven GO bleiben: freie semantische Widersprüche und Memoryauslassungen, unvollständige Erkennung beliebiger Spielerhandlungen, Wissensvermischung eines gemeinsamen GM, echte alternative Swipe-Welten, nicht unterstützte neue mechanische Ketten nach dem Worldtool und unbekannte Remote-Kapazitätsfreigabe. G3-Ablenkung ist bewusst unsupported; dieser bekannte fachliche Umfangsrand verhindert keinen geskripteten Hosttest.

Es wird keine weitere fixe Modellphase eingeführt. Vollständige Kandidaten enden sofort; echte Abhängigkeiten erzeugen gezählte Fortsetzungen. Ob wichtige Szenen später einen unabhängigen semantischen Prüfer benötigen, bleibt eine empirische Qualitätsentscheidung.
