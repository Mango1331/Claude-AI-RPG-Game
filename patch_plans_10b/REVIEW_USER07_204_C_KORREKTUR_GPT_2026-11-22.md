# Unabhängiger GPT-Diffreview – User07, C-Korrektur R1/R2

**22.11.2026 · Urteil: GO für die persönliche Fortsetzung von User07 auf dem gepinnten Experimentkandidaten `52d9c04aaf9f32ae92f03a72e9686d4b662749c6`.** Kein GO für einen Produktmerge. Es ist **eine** Fast-Forward-Änderung gegenüber dem zuvor gesperrten `4ff1500e4929c0604803a19d31fb6b52b348f209`. Die vorangehenden Patches A/B bleiben unverändert. Der Diff ändert drei Laufzeitdateien (`src/v4/camp.js`, `src/v4/world.js`, `src/v4/commands.js`) und drei Testdateien/-werkzeuge, sonst nichts. Die Manifest-/Packageversion bleibt `4.3.0-c.6.6.204`; für Reproduktionen **Commit-SHA statt bloßer Buildnummer** angeben.

**Quellen:** [Technischer Korrekturcommit](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/52d9c04aaf9f32ae92f03a72e9686d4b662749c6) · [Codex-Abnahmebericht](../recherche/USER07_204_C_KORREKTUR_ABNAHME.md) · [natürlicher OpenRouter-Test einschließlich archivierter Originalantworten](../testrun_10b/user07-camp-openrouter-20261122/README.md) · [früherer unabhängiger NO-GO-Befund](../testrun_10b/user07-camp-openrouter-20261122/REVIEW_GPT.md).

## R1 – Bestätigte Ortsregression gezielt korrigiert

Der frühere globale Zweig `if (camp && holder.loc)` verwarf auch unabhängige Bodenfunde am später autorisiert erreichten Ort. Der neue `world.js`-Pfad merkt nach **erfolgreich verarbeiteter**, freiwilliger `arrive` die `separateDestination` für einen tatsächlich autorisierten gesonderten GO-Schritt. `campGroundAllowed` unterscheidet:
- **Separat erreichte Destination:** Ein dort durch expliziten Holder oder passende Szenenreferenz belegtes Objekt gelangt wieder in den regulären Weltobjektpfad.
- **Aussichtspunkt:** Ein ausdrücklich beim beobachtenden Alaric verorteter Gegenstand darf dort entstehen; ein nur unten im Camp sichtbarer Gegenstand bleibt gesperrt. `atObserver` bindet den Beleg an die Objektpassage, nicht an eine unbestimmte Nennung des Geländes.
- **Camp selbst:** Nur bei bestätigtem Erreichen und erfüllten lokalen Sicht-/Zugangsbedingungen gelten die besonderen Campinventarregeln. Fehlgeschlagene/unklare Ankunft und eine nur gewünschte Reise öffnen keine Objektbuchung.

Das ist fachlich der richtige Geltungsbereich; keine allgemeine Bewegungs- oder Objektfreigabe. Nach Codex' ausführbarer Gegenprobe sind `mixed`, `actual-planner`, `lookout`, `remote` und `travel-control` grün. Abgelehnte Fernmitnahme und Revisionstrennung bleiben Negativfälle. **Vorher 4/6 rote Kernfälle, danach 9/9 Archiv-/Kontrollfälle grün** sind gemeldete ausgeführte Codex-Tests, nicht von GPT nochmals gerechnet.

## R2 – Natürliche Prosa führt zu echtem, wiederverwendbarem Bodenobjekt

`camp.js::itemMention` liest nun die zusammengehörigen Wörter eines Objektlabels in zulässiger anderer Reihenfolge: Die unveränderte Erzählung `A cooking pot of dented copper, worth little but real` ist mit dem Extractorlabel `dented copper cooking pot` kompatibel. `visibleSupply` lässt bei **örtlich bestätigtem verlassenem Lager** eine direkte Aufzählung/Platzierung gewöhnlicher Ausrüstung genügen; das Modell muss nicht wortgetreu `unclaimed` oder `abandoned` zum Gegenstand sagen.

`vacantSite` verlangt den belegten lokalen Orts-/Szenenzustand, nicht nur eine allgemeine Nutzerbehauptung. `UNSUITABLE`, `itemProfile` und die bisherigen Holder-/Fernsicht-/Wert-/Sperrregeln schützen negiertes, fremdes, verschlossenes, verborgenes, hochwertiges oder nur erinnert/abgebildet dargestelltes Material. Die Aufnahme erzeugt **keinen** automatischen Eigentumswechsel. `ctx.booked.campTakes` unterdrückt die zweite `object.new`-Meldung, wenn der Spieler das bereits identifizierte Campobjekt im selben Zug genommen hat.

Im Bericht zum Original-Nachspiel erhält der Topf beim ersten Blick die ID `obj.t44.dented_copper_cooking_pot` am Boden. Das spätere TAKE über das kürzere Label behält **genau diese ID**; Wiederbesichtigung/Reload erzeugen keine Kopie. Speer und verschnürtes Bündel bleiben aus guten Gründen nicht als freie Campausstattung erhalten. Die neue Regression enthält mehrere fachlich wesentliche Gegenfälle zu Eigentum, Wert, Negation, Fernsicht, auseinandergerissenen Labelwörtern und erneuter Erzeugung.

## Qualitätssicherung und Grenzen

**Berichtete Abnahmen:** 3.425/3.425 Node, 2.235 Replayfälle mit 0 **neuen** Abweichungen, 32/32 isolierte ST-1.19-Camp-Mockprüfungen einschließlich Save/Read-back/Reload. Original-Extractor-Erst- und Reparaturantworten wurden offline verwendet. Die vollständigen Suiten wurden **nicht von GPT erneut ausgeführt**; dieser Review ist eine unabhängige Prüfung des konkreten Git-Diffs, Codepfads, Regressionstests und der Dokumentation.

**Bewusst erhaltene Grenze:** Der aktive lokale Hazard `gathering storm` setzt im gespeicherten Wiederbesuch `camp.free=false`. Bei Gefahr darf neue frei verfügbare Campausstattung aus einer Inspektion weiter zurückgehalten werden. Bereits erfasste Gegenstände bleiben nutzbar. Das ist vorerst **kein** neuer Pflichtfix, aber ein real zu beobachtender Spielflussfall: sichtbare Dinge dürfen langfristig nicht ohne guten Grund unsichtbar oder unerreichbar wirken.

**Offen für den natürlichen Spieltest:** allgemeine Trefferquote bei anderen freien N-/X-Beschreibungen, reale Extractor-Reparaturrate, echte Folgeeingabezeiten auf der persönlichen Featherless-Route sowie die spätere zuverlässige Narrator-Erinnerung an Dungeonraumspuren (T3, nicht Bestandteil dieses Fixes). Die im OpenRouter-Test gemessenen **9,17–18,96 s** betreffen dessen andere Providerroute, **nicht** eine neue End-to-End-Messung auf `52d9c04`. Es gab keine neuen Provideraufrufe durch die Korrekturprüfung.

## Abschließende Entscheidung

**GO für den nächsten begrenzten persönlichen User07-Spieltest auf genau `52d9c04aaf9f32ae92f03a72e9686d4b662749c6`.** Die beiden zuvor blockierenden C-Fehler sind im Code gezielt geschlossen und technisch regressionsgeprüft. Kein weiterer allgemeiner Reparatur-/Optimierungszyklus vor dem Spielen. `L2` und `T7` bleiben zurückgestellt. Kein automatischer Fast-Forward der alten `.204`-Branches, keine Produkt-`.200`-Freigabe. Im User-Test die tatsächlich verwendete Git-SHA, spontane Spielerreaktionen, N/X-Ereignisse und soweit möglich die sichere Folgeeingabezeit archivieren.
