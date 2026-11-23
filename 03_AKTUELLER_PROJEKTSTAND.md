# Avereth Engine – aktueller Projektstand

**23. November 2026. Beide persönlichen .207-Läufe einschließlich der User10-Fortsetzung sind gegengeprüft.** Der bestätigte Kandidat steht auf `609380b3`. Der Fachplan für .208 liegt zur gemeinsamen Entscheidung vor. [User09](testrun_10b/user-20261123-042623-207/CODEX_GEGENREVIEW.md) · [User10](testrun_10b/user-20261123-075443-207/CODEX_GEGENREVIEW.md) · [Fachplan .208](patch_plans_10b/FACHPLAN_208_TAGESBOARD_UND_KAMPFAKTIONEN.md) · [Abnahme .207](recherche/ABNAHME_207_HANDELS_HUD.md) · [Diffreview .207](patch_plans_10b/REVIEW_207_HANDELS_HUD_GPT_2026-11-23.md)

Für .206 gilt weiterhin das begrenzte GO des vorangegangenen Diffreviews. Über die persönliche Installation entscheidet der Nutzer. Der persönliche User08-Lauf mit 27 Erzählzügen fand auf `.205` statt. [Abnahme](recherche/USER08_206_DUNGEON_BOARD_ABNAHME.md) · [Unabhängiger GPT-Diffreview](patch_plans_10b/REVIEW_USER08_206_DUNGEON_BOARD_GPT_2026-11-23.md) · [Originale und Reviews](testrun_10b/user-20261122-161817-205/README.md) · [Zeitvergleich](testrun_10b/durchschnittsmessungen/README.md)

| Verwendung | Branch | Geprüfter Commit |
|---|---|---|
| .207-Handels-HUD, Diffreview GO zum persönlichen Test | `experiment/207-trade-hud` | [`609380b3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/609380b308d89d14c289e9ca1c4e26ed29174789) |
| .206-Kandidat, Diffreview GO für persönlichen Test | `experiment/206-user08-dungeon-board` | [`cecc2c37`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cecc2c3777542e5bf9c74096c810a1c04fbed36e) |
| Persönlicher User08-Spieltest | `experiment/205-user08-playtest-ready` | [`a69daee`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a69daeeed613850919f16eb810cc2c150c8aafd0) |
| Technisch abgenommene Basis mit A, B, C und R1/R2 | `experiment/204-user07-board-dungeon-camp` | [`52d9c04`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/52d9c04aaf9f32ae92f03a72e9686d4b662749c6) |
| Eingefrorenes Produkt `.200` | `claude/c-planner-prototype-2026-10-02-gpt-c666` | [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) |

Der Testbuild enthält die Änderungen an Questboard und HUD, Gildenroutine und Dungeon-Erzählführung sowie Campfunden und ihrer Ortsbindung. Die technische Abnahme mit 3.425 bestandenen Node-Tests, 2.235 Replayfällen ohne neue Abweichung und 32/32 isolierten Camp-Mockprüfungen gehört zu `52d9c04`. Der unabhängige Diffreview gab diesen Stand für den persönlichen Test frei. Für `.205` wurden darauf aufbauend die Buildkennung und die Testdokumentation aktualisiert. Die Narrator-Vertragsrevision bleibt `.204`. [Abnahme](recherche/USER07_204_C_KORREKTUR_ABNAHME.md) · [Diffreview](patch_plans_10b/REVIEW_USER07_204_C_KORREKTUR_GPT_2026-11-22.md)

## User10 · Tagesboard und Kampferöffnung

Die erste Lesung scheiterte nach zwei Boardrequests. Eine neue Eingabe erzeugte fünf Verträge. Beim späteren Angriff gelangte der verworfene Rücksprung in den nächsten Narratorrequest und die Prosa. Die Engine buchte nur die Arcane Wave und einen regelkonformen Kampftod. Der kumulative Log enthält 43 physische Aufrufe. [Originalnachspiele und Messung](testrun_10b/user-20261123-075443-207/CODEX_GEGENREVIEW.md)

## User09 – offene Befunde aus dem Kurztest

Im Test wurden zwei echte Hindernisschäden (14 und 8 HP) gebucht, ohne dass die unmittelbare Systemkarte einen HP-/Damagehinweis zeigte; das korrigierte Nutzerfeedback fordert eine sichtbare Engine-Schadenszeile wie im Combat. Der Narrator schilderte nach der misslungenen Brückenprobe tatsächlich eine improvisierte Überquerung am Seilgeländer und den Weg zum Dungeon. Der Nutzer akzeptiert diese *fail-forward*-Fortsetzung ausdrücklich. Nur die Engineformulierung `He does not get past it` ist dadurch semantisch zu streng (P2, kein zwingender Reiseblocker). Das neue Handels-HUD blieb im User09-Kurztest unbenutzt. [Erstreview](testrun_10b/user-20261123-042623-207/REVIEW.md). Chat und Events sind bytegleich archiviert. [Gegenreview und Messgrenzen](testrun_10b/user-20261123-042623-207/CODEX_GEGENREVIEW.md).

## User08 – Befunde und nächste Entscheidung

Im lokalen Nachspiel ließ sich der verweigerte Eintritt auf das fälschlich gesetzte Habitatfeld `within` zurückführen. Beim Board genügte die Änderung eines Körperbauankers, damit die ursprünglichen fünf Aufträge die vollständige Prüfung bestanden. Von 75 geloggten Modellantworten lassen sich 74 einem vollständig geloggten Request zuordnen. [Unabhängiger Codex-Gegenreview](testrun_10b/user-20261122-161817-205/CODEX_GEGENREVIEW.md)

Im persönlichen .205-Run wurden die Vorteile der HUD-Kontraste und echte PULSE-Würfe auf Reisen und während zweier Dungeon-Rasten bestätigt. Der verweigerte Dungeon-Eintritt und der zusätzliche Boardrequest wegen des falschen Schildkrötenankers sind im .206-Kandidaten am Original korrigiert. Das widersprüchliche Händlergesamtangebot bleibt eine separate Designfrage. Im .207-Experiment lassen sich örtliche Angebote und Gebote mit Stückzahlwahl bestätigen. Eine allgemeine Händlerwirtschaft bleibt eine gesonderte Designfrage. Eine große lineare Dungeon-Neuarchitektur folgt aus diesem Run gerade nicht. [Originale, Beispiele und Prioritäten](testrun_10b/user-20261122-161817-205/REVIEW.md).

**Messung:** 27 persönliche Erzählzüge auf der .205-Featherless-Linie mit Host+X-Untergrenze **56,68 s im Mittel / 52,65 s Median**, **keine** aufgezeichneten sicheren Host-Folgeeingaben. Als Vergleich die historischen Reihen nur mit ihren genauen Messpunkten lesen: [Durchschnittsmessungen](testrun_10b/durchschnittsmessungen/README.md). Der unabhängige GPT-Diffreview empfiehlt GO für den persönlichen Test, nicht für einen Produktmerge. Über die Installation entscheidet der Nutzer. [Ablage weiterer Runs](testrun_10b/README.md).

Die weitere Gameplay-Roadmap ist pausiert. Zurückgestellte Fachfragen und historische Bewertungen bleiben über ihre Quellen zugänglich. [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Archivierte Spieltests](testrun_10b/archiv/README.md) · [Frühere vollständige Statusfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/292a4372654f027fb579bf8e338ff9d25d981da7/03_AKTUELLER_PROJEKTSTAND.md) · [Projektchronik bis Oktober](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md)
