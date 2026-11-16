# Kurze natürliche Probe: vorbereiteter Kandidat, noch nicht gestartet

Dieser Leitfaden ist keine Freigabe oder automatisierte Modellserie. Der Nutzer entscheidet über den Start und steuert jede Spielerhandlung. Technischer Stand: [Kurskorrektur-Abnahme](KURSKORREKTUR_SPIELBOGEN_2026-11-16.md), Branch `experiment/dynamic-gm-model`, Kern `.200`, Alpha-Saveversion weiterhin `4.3.0-gm.alpha.2`.

## Vorbereiteter Stand

- Den **aktualisierten Repositoryordner `avereth-gm-alpha/`** aus dem Kurskorrekturcommit verwenden. Das vorhandene `releases/Avereth-GM-Alpha-2.zip` enthält diesen Nachtrag nicht und wurde bewusst nicht als neue breite Alpha-Auslieferung ersetzt.
- Nach Sicherung/ST-Schließen ausschließlich die Alpha-Extension im eigenen Testprofil aktualisieren; danach ST und Browser neu laden. Neuer Alpha-Testchat mit der GM-Karte. Keine bestehende `.200`- oder offene Alpha-Kampagne übernehmen. Der Kandidat verändert keine persönlichen Dateien automatisch.
- Bestehende [Installationsanleitung](../../avereth-gm-alpha/INSTALLATION_DE.md) und dort geprüfter Chat-Completion/Custom-Pfad zu Featherless `/v1`; Modell `zai-org/GLM-5.3-Flash`. Preset unverändert: Temperature 0,8, Top P 0,95, Kontext 32768, Ausgabe 4096, kein Streaming. `chat_template_kwargs: {reasoning_effort: low, clear_thinking: true}` gemäß Anleitung; keine weiteren Prompt-/Lorebookinjektionen. Keine neuen Keys notwendig oder in Berichte kopieren.
- Nur eine aktive Provideranfrage; parallele externe Sessions vorher beenden. Die Alpha kann ausschließlich ihre eigenen Requests serialisieren. Vier belegte Einheiten sind kein Beleg für verbrauchte Credits.

## Kleiner Spielbogen mit echten Anschlussentscheidungen

1. Klasse und Skills regulär wählen; `#status` und `#inventory` prüfen. Diese Kontrollen brauchen kein Modell.
2. Den tatsächlich gescheiterten Einstieg verwenden: `*i walk into the city ahead of me and make my way over to the adventurers guild*`. Entscheidend sind plausibles Geschehen, gebuchte Ankunft und ein danach passender Standort — kein vorgeschriebener NPC oder Wortlaut.
3. Mit einem tatsächlich anwesenden NPC frei sprechen. Eine Zusage **nicht erzwingen**, um den Test grün zu machen. Entsteht ein wichtiges Versprechen, neuer Name, Wissen oder eine nachhaltige Absprache, diese Aussage unabhängig vom vom GM gemeldeten Memory notieren.
4. Einen tatsächlich verfügbaren Gegenstand regelgerecht nutzen oder übergeben, passend zur Geschichte. Kein automatisch bereitgestellter Testtrank. Eine begründete Ablehnung ist ein gültiges Spielergebnis; dann ist der Positivfall noch nicht geprüft. Keine neue Kampf-/Questserie nur für diesen ersten Nachweis beginnen.
5. Einen plausiblen Folgezug spielen, die Gilde verlassen und wiederkehren. Nach einigen echten Anschlusszügen den NPC auf die früher wichtige Information ansprechen. Der alte Dialog soll aus dem kurzen aktiven Gesprächsfenster gefallen sein; **keine Chatnachricht löschen oder bearbeiten**, um dies zu erzwingen. Erinnerung, Identität, Persönlichkeit und offene/erledigte Absprache prüfen.
6. Ein privates `#system` zur vorhandenen Mechanik stellen. Es soll eine verständliche Antwort geben, keinen internen Kontextdump und keine NPC-Reaktion.

Ungefähr sechs bis zehn selbst gewählte Spielzüge genügen zunächst. Wenn keine wichtige neue Information entsteht, ist Memory **ungeprüft**, nicht bestanden. Überraschende glaubwürdige Eigeninitiative ist erwünscht; es gibt keine Sollgeschichte und keine garantierte Zusage/Geschenkbelohnung.

## Was für die Auswertung gebraucht wird

- Wörtliche Spielereingaben, bestätigte Antworten, Stellen mit ausgelassenen Handlungen/unerklärlichen Einschränkungen und subjektiver Spielfluss. Eine plausible negative Spielreaktion von einem technischen Blocker unterscheiden.
- Tatsächlicher Standort/Inventar/HP vor und nach relevanten Handlungen; gebuchte NPC-Identität und Threads gegen die unabhängig notierten Aussagen prüfen. Bloß „schema valid“ reicht nicht.
- Requestdiagnose aus dem Alpha-Panel: physische Requests, lokale Inputzählung, vom Anbieter tatsächlich gemeldete Usage, Abschlussgrund und Dauer. Die Anzeige ist profilweit; Requests/Phasen anhand ihrer IDs zuordnen. Fehlende Usage bleibt unbekannt. Natürliche Latenz erst aus dieser Probe bewerten.
- Bei einem Problem Chat und zugehöriges Alpha-Journal gemeinsam sichern; gegebenenfalls den betroffenen ST-Logauszug. Diese Dateien enthalten private Spieltexte. Keine API-Keys/Authorization-Header weitergeben. Die zuständige Journaldatei ist in den Chatmetadata referenziert; Ablage unter `user/files/avereth-gm-alpha-*.json` im eigenen ST-Datenprofil.
- Offene Requests behalten ihre vollständigen Promptbelege; nach bestätigter Veröffentlichung werden diese im Kapazitätsjournal auf Diagnosen reduziert. Für spätere Detailvergleiche Chat, Journal und Codeversion zusammen sichern; gegebenenfalls einen gezielten Requestmitschnitt ohne Header vereinbaren. Originaldialog, gespeichertes Memory und nachfolgender Prompt sind getrennt zu bewerten; eine gespeicherte Rohantwort allein beweist keine Wiederverwendung durch das Modell.

## Bei einem Fehler

Eine gezielte fachliche Korrektur kann automatisch einen zusätzlichen Request benötigen. Wird auch dieser abgewiesen, nicht wiederholt auf „Wiederaufnehmen“ drücken: Fehler sichern; einen noch nicht committeten Zug bei nachgewiesen freier Kapazität über „Offenen Zug verwerfen“ zurücknehmen und die Eingabe bewusst überprüfen. Ein bereits committeter Abschluss wird dagegen wiederaufgenommen, nicht neu erzeugt.

Timeout oder 429 mit unbekanntem Remoteende: keine Retryserie und keine bloße Wartezeit als Freigabebeleg. Bei dauerhaftem Widerspruch zwischen Erzählung und Zustand, falscher Figur/Geheimnis, verlorener wichtiger Zusage oder wiederholtem Blockieren einfacher Handlungen den kurzen Test beenden und den konkreten Fall auswerten. Erst daraus folgt die Entscheidung über zusätzliche spezialisierte Deutung/Memoryprüfung oder weitere Optimierung.

**Noch offen:** Nutzerfreigabe und natürliche Durchführung. Kein natürlicher Request wurde für diesen Nachtrag gestartet. Die Mockabnahme ist ausschließlich die technische Voraussetzung.
