# Avereth Engine – aktueller Projektstand

**23. November 2026. Der unabhängige GPT-Diffreview empfiehlt GO für einen begrenzten persönlichen Spieltest auf `.207` bei `609380b3`; über die Installation entscheidet der Nutzer.** [Technische Abnahme](recherche/ABNAHME_207_HANDELS_HUD.md) · [GPT-Diffreview](patch_plans_10b/REVIEW_207_HANDELS_HUD_GPT_2026-11-23.md)

Für .206 gilt weiterhin das begrenzte GO des vorangegangenen Diffreviews. Über die persönliche Installation entscheidet der Nutzer. Der persönliche User08-Lauf mit 27 Erzählzügen fand auf `.205` statt. [Abnahme](recherche/USER08_206_DUNGEON_BOARD_ABNAHME.md) · [Unabhängiger GPT-Diffreview](patch_plans_10b/REVIEW_USER08_206_DUNGEON_BOARD_GPT_2026-11-23.md) · [Originale und Reviews](testrun_10b/user-20261122-161817-205/README.md) · [Zeitvergleich](testrun_10b/durchschnittsmessungen/README.md)

| Verwendung | Branch | Geprüfter Commit |
|---|---|---|
| .207-Handels-HUD, Diffreview GO zum persönlichen Test | `experiment/207-trade-hud` | [`609380b3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/609380b308d89d14c289e9ca1c4e26ed29174789) |
| .206-Kandidat, Diffreview GO für persönlichen Test | `experiment/206-user08-dungeon-board` | [`cecc2c37`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cecc2c3777542e5bf9c74096c810a1c04fbed36e) |
| Persönlicher User08-Spieltest | `experiment/205-user08-playtest-ready` | [`a69daee`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a69daeeed613850919f16eb810cc2c150c8aafd0) |
| Technisch abgenommene Basis mit A, B, C und R1/R2 | `experiment/204-user07-board-dungeon-camp` | [`52d9c04`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/52d9c04aaf9f32ae92f03a72e9686d4b662749c6) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` | [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

Der Testbuild enthält die Änderungen an Questboard und HUD, Gildenroutine und Dungeon-Erzählführung sowie Campfunden und ihrer Ortsbindung. Die technische Abnahme mit 3.425 bestandenen Node-Tests, 2.235 Replayfällen ohne neue Abweichung und 32/32 isolierten Camp-Mockprüfungen gehört zu `52d9c04`. Der unabhängige Diffreview gab diesen Stand für den persönlichen Test frei. Für `.205` wurden darauf aufbauend die Buildkennung und die Testdokumentation aktualisiert. Die Narrator-Vertragsrevision bleibt `.204`. [Abnahme](recherche/USER07_204_C_KORREKTUR_ABNAHME.md) · [Diffreview](patch_plans_10b/REVIEW_USER07_204_C_KORREKTUR_GPT_2026-11-22.md)

## User08 – Befunde und nächste Entscheidung

Im lokalen Nachspiel ließ sich der verweigerte Eintritt auf das fälschlich gesetzte Habitatfeld `within` zurückführen. Beim Board genügte die Änderung eines Körperbauankers, damit die ursprünglichen fünf Aufträge die vollständige Prüfung bestanden. Von 75 geloggten Modellantworten lassen sich 74 einem vollständig geloggten Request zuordnen. [Unabhängiger Codex-Gegenreview](testrun_10b/user-20261122-161817-205/CODEX_GEGENREVIEW.md)

Im persönlichen .205-Run wurden die Vorteile der HUD-Kontraste und echte PULSE-Würfe auf Reisen und während zweier Dungeon-Rasten bestätigt. Der verweigerte Dungeon-Eintritt und der zusätzliche Boardrequest wegen des falschen Schildkrötenankers sind im .206-Kandidaten am Original korrigiert. Das widersprüchliche Händlergesamtangebot bleibt eine separate Designfrage. Im .207-Experiment lassen sich örtliche Angebote und Gebote mit Stückzahlwahl bestätigen. Eine allgemeine Händlerwirtschaft bleibt eine gesonderte Designfrage. Eine große lineare Dungeon-Neuarchitektur folgt aus diesem Run gerade nicht. [Originale, Beispiele und Prioritäten](testrun_10b/user-20261122-161817-205/REVIEW.md).

**Messung:** 27 persönliche Erzählzüge auf der .205-Featherless-Linie mit Host+X-Untergrenze **56,68 s im Mittel / 52,65 s Median**, **keine** aufgezeichneten sicheren Host-Folgeeingaben. Als Vergleich die historischen Reihen nur mit ihren genauen Messpunkten lesen: [Durchschnittsmessungen](testrun_10b/durchschnittsmessungen/README.md). Der unabhängige GPT-Diffreview empfiehlt GO für den persönlichen Test, nicht für einen Produktmerge. Über die Installation entscheidet der Nutzer. [Ablage weiterer Runs](testrun_10b/README.md).

Die weitere Gameplay-Roadmap ist pausiert. Zurückgestellte Fachfragen und historische Bewertungen bleiben über ihre Quellen zugänglich. [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Archivierte Spieltests](testrun_10b/archiv/README.md) · [Frühere vollständige Statusfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/292a4372654f027fb579bf8e338ff9d25d981da7/03_AKTUELLER_PROJEKTSTAND.md) · [Projektchronik bis Oktober](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md)
