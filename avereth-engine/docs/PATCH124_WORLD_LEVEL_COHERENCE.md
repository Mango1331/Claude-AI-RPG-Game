# Build .124 — feste Outdoor-Level und konsistente Populationen

Basis: `c300f3d` / Build .123. Anlass: Batch18, Rogue-Turtles am richtigen Jagdort bleiben Level1 und ungebunden, obwohl der Vertrag eine vorhandene L4–7-Population beschreibt. Freigegebenes Feedback: Weltgefahr, Population und Anzeige vereinheitlichen; kein Outdoor-Spawnsystem und kein PC-Scaling.

## Bestätigte Ursache

Bei den Originalantworten zu Chatindex42 und140 liefert der Extractor `aquatic`. Die Singular-Aliasauflösung überschreibt den gespeicherten Körperbau mit `armored_beast`; dadurch findet `populationAt` die vorhandene Population nicht. Die Kreatur fällt auf die alte niedrige Gebietsannahme zurück. Der Boardvalidator erkennt die entsprechende Pluralform dagegen nicht gleich. Die Questzählung verwirft diese fremden/zu schwachen Gegner korrekt; sie wird nicht gelockert.

## Umsetzung

- **Eine Artauflösung:** `content.js:speciesAnchor` interpretiert bekannte Art-Aliasse einschließlich einfacher Pluralformen für neue V4-Kreaturen und neue Progressionsboards gleich. Spezifischere bekannte Aliasse gehen vor; unbekannte generative Arten behalten einen gültigen gelieferten Körperbau. Neue widersprüchliche Populationen werden vor Veröffentlichung abgewiesen. Bestehende Populationen behalten ihre Werte, auch die historische `aquatic`-Turtlepopulation.
- **Population vor freiem Alias:** `populationAt` kann die vorhandene lokale Population anhand der bisherigen Artprüfung unabhängig vom gelieferten Anchor finden. `world.js` und `materialise` übernehmen deren Körperbau und Levelspanne. Das ist keine bloße Gleichsetzung aller Tiere desselben Körperbaus. Fremde Arten erhalten keinen `population_at`-Credit.
- **Feste Ortsdaten:** Das optionale `place.encounter_levels` wird mit gewöhnlichem `place.updated` gebucht. Die unterstützten F-Fenster stehen einmal in `monsters.json`: 1–1, 1–3, 4–7, 8–11, 12–14. `encounterArea` liest den nächsten expliziten Vorfahren; ein lokaler Unterort kann ein eigenes Fenster haben. Bereits festgelegte Fenster sind nicht überschreibbar. Keine automatische Umhängung alter Ortsbäume.
- **Kleine Extractor-Erweiterung:** `area` meldet Ort, Min/Max, Quelle und wörtlichen Beleg. Nur Ruleset2/F-Progression, tatsächlich gesehenes aktuelles Gebiet oder konkret benanntes Gildenwissen; Gerüchte, fremde Belege, Siedlungen/Innenräume und echte Dungeons werden als neue Outdoor-Klassifikation abgewiesen. Ein Ortslabel erzeugt keine Ankunft. Der normale World-/Ownership-/Commitpfad bleibt zuständig.
- **Priorität bei neuen Kreaturen:** Bereits vorhandenes Profil bleibt unangetastet. Explizites individuelles Level beziehungsweise Dungeonvorgaben, passende lokale Population, geerbtes Outdoorfenster, bisheriger Fallback. Keine Anpassung an PC-Level. Ausdrücklich harmlose Fauna (`threat:false`) übernimmt nicht pauschal das Gebietsfenster; Menschen nutzen weiterhin ihre eigenen NPC-Pfade. Ein entferntes Wesen verwendet seinen tatsächlichen Ort.
- **Gleiche sichtbare Daten:** Boardkarten zeigen bei gebundener Jagd die tatsächliche Gegnerlevelspanne statt einer missverständlichen einzelnen Empfehlung, daneben bestehende Menge/Ziel und einen Arten-/Gruppenrisikohinweis. Das interne Questlevel bleibt für XP/Bewertung bestehen. Narrator-Kontext, Extractor-Katalog und Systemanzeige erhalten dasselbe gespeicherte Gebietsfenster; Population und Gebiet bleiben getrennt sichtbar. Ohne bekannte Population wird keine exakte Gegnerzielspanne erfunden.

Betroffene Produktpfade: `content.js`, `engine.js`, `v4/domain.js`, `v4/world.js`, `v4/guild.js`, `v4/extract.js`, `v4/ownership.js`, `v4/catalog.js`, `v4/commands.js`, `context.js`, `display.js`, `validate.js`, Monster-/Delta-Content und Monsterschema. Kein neuer Eventtyp, keine Migration, keine zweite Population oder Spawnverwaltung.

Protokolle: **Extractor5.20 / Delta1.9**, Board5.5 unverändert. Buildnummer in `util.js`, Manifest und Paket auf **4.3.0-c.6.6.124**. Narrator-Vertrag bleibt **.85**, kein Kartenupdate. Historische Kampagnen ohne F-Progression erhalten die neue `area`-Vokabel nicht.

## Abnahme

- **18 neue Regressionen**, gegen unveränderte .123-Produktdateien **17 rot /1 grüne Kontrolle**, danach **18/18**. Das umfasst Original-Ereignisprefixe und Originalantworten von Batch18/42 und140, Art-/Anchor-Widerspruch Singular/Plural, echte Boardkarten, Vererbung/Unterort, fremde Art, historische Population/Individuen, Remote-Ort, Dungeonpriorität, harmlose Fauna, unveränderliches Gebiet, unzulässige Klassifikationen und Event-Replay. Die roten Fälle umfassen auch die neu eingeführte Funktion, nicht17 unabhängige alte Defekte.
- Vollständiges **`npm test -- --test-concurrency=4`: 2417/2417**. Zwei vorhandene Tests an Extractor-Version beziehungsweise gefilterte Legacy-Vokabel angepasst, keine Originalfixture umgeschrieben. Ein erster Gesamtlauf war durch zunächst unvollständigen Sparse-Checkout blockiert; die Abnahme stammt aus dem anschließend vollständigen Checkout.
- Alle **4790 historischen Batch18-Events** erneut gefaltet und nach jedem Record validiert: drei volle Endzustände mit dem ursprünglichen .123-Replay identisch. Alte gespeicherte Level und Populationen werden nicht nachträglich verändert.
- Echter **ST1.19-/Chromium-Smoke `npm run smoke:st:c`: 24/24**, **6 Extractor-Aufrufe**, keine PageErrors, Build.124 und IntegritätOK. Der Smoke prüft zusätzlich gespeichertes Gebiet1–3 und dessen tatsächliche Systemanzeige. Ein erster Lauf war23/24 wegen ST-Seitenfehlern bei sonst erfolgreicher Gebietsprüfung; der unveränderte Wiederholungslauf ist vollständig grün. Isoliertes ST-Profil und Mock-Provider, kein natürlicher GLM-Nachweis.
- `git diff --check` ohne Befund. Bestehende Dungeon-, Guild-, Handels-, Replay- und Legacy-Regressionsfälle in der Vollsuite grün.

## Grenzen und nächster Schritt

Ein Gebiet erhält sein Fenster erst bei gültiger Klassifikation; unbekannte Gebiete behalten den alten Fallback. „Nah“, „fern“ und ökologische Gefahr bleiben generative Weltgestaltung, keine vermessene Entfernung. Die Artzuordnung verwendet den vorhandenen Artvergleich, keinen vollständigen Spezieskatalog. Künftig falsche oder ausgelassene LLM-Berichte bleiben möglich. Keine garantierte Begegnungszahl, Respawns oder PC-gerechte Gegner.

XP×5, Startwerte, Kampf/Schaden, PP, Preise, Klassenevolution und Runneranweisungen unverändert. Das Schwert-/Rüstungs-Paket aus Batch18 bleibt ein eigener offener Handelsbefund. Nächster Nachweis ist der natürliche Batch mit unverändertem Guide; in dieser Sitzung nicht gestartet. Original-ZIP und Reviews unverändert, ZIP weiterhin nur als Chatupload geprüft.
