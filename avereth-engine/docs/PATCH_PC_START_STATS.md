# Spieler-Startwerte 7 – Build .91

Basis: `.90`, `b47d85743d6fdb3644e975f826843efe73ab77ae`. Auf ausdrücklichen Nutzerauftrag beginnen **neue Spielerfiguren mit STR/VIT/AGI/INT/PER/WIL jeweils 7 statt 5**.

Die einzige fachliche Produktänderung ist `content/campaign_start.json:pc.stats`. Der bestehende Klassenbonus von +1 auf die beiden Favored Stats bleibt: nach Klassenwahl **8/8 bevorzugt, 7 in den übrigen Werten**. HP/MP und andere abgeleitete Werte entstehen automatisch aus diesen Stats. Level-ups, fünf freie Punkte pro Level, Favored-Wachstum, XP-Schwellen, Ressourcenregeln, NPC-Basiswerte und Monsterwerte bleiben unverändert.

Alte Kampagnen behalten die im `campaign.started`-Event gespeicherten Werte, einschließlich laufender Charaktererstellung. Keine Migration oder nachträgliche Stat-Gutschrift. Für den höheren Start eine neue Kampagne beginnen. Keine neue Erzählerkarten-/Protokollrevision.

## Prüfung

- Vier neue Regressionen: auf .90 **eine rot / drei grüne Kontrollen**, danach **4/4**. Prüfen neue Erstellung aller drei Klassen, beide Runtimes/Regelstände, Ressourcen, normale Level-ups und Punktzuweisung, historische Event-Replays und unveränderte NPC-Basis.
- Historische Replay-Testdaten behalten ausdrücklich ihre damaligen Fünfer-Startwerte. Die festen 9B-Rechenbeispiele verwenden weiterhin dieselben Testfiguren. Aktuelle Erstellungserwartungen wurden auf 7/8 angepasst; Rare-Belege setzen ihre Ausgangs-HP relativ zum tatsächlichen Maximum statt auf alte feste HP. Passive-Ressourcenanzeigen werden gegen die jeweiligen Maxima geprüft. Keine Skill-/Kampf-/Passive-Formel verändert.
- **Angrenzend 70/70**, vollständiges `npm test` **1772/1772 grün**.
- Echter **ST-1.19-Mock-Smoke 21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte Storyantworten jeweils `applied` und genau ein `extract.applied`. Der erste Versuch bestand 20/21: ausschließlich die alte Smoke-Erwartung `72 - 16 MP` scheiterte am neuen höheren MP-Maximum. Die Prüfung verwendet jetzt den tatsächlich vor dem Zauber gespeicherten MP-Stand minus unverändert 16 MP; erneuter Smoke auf finalem Stand grün. Kein Produktfehler oder abgeschwächter Kostentest.

Der höhere Start ist eine Spielbarkeitsentscheidung, kein Nachweis, dass jede frühe Dungeonquest allein überlebbar ist. Kein natürlicher Lauf gestartet; Board-/Handels-Fachplan nicht implementiert, Testspieler unverändert.
