# Run 16 – Zielautorität, Ortskonsistenz und Agency (.92)

Basis: `.91` / `b55a897af686cb165f5812e4f0dd4287288565ff`. Produkt **4.3.0-c.6.6.92**, Extractor **extract-5.10**. Original und Gegenreview: [20261025-232041Z-current_test auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/main/testrun_10b/20261025-232041Z-current_test). Kein neuer natürlicher GLM-Lauf.

## Ursachen und Korrekturen

**T52 – falsches Kampfziel.** `namedPeer` las „Glasswing Moth C“ als Präfix von „glasswing moth circling“ und ersetzte den korrekt geplanten H durch den abwesenden C. Vollständige Handles benötigen jetzt Wortgrenzen; die bisherige ausdrückliche Buchstabenansprache bleibt erhalten. Eine gemeinsame Prüfung in `scene_handles.js` sichert sowohl die Planner-Zielersetzung als auch die Übergabe an den C-Kampfpfad: ein lebender lokaler NPC/eine Kreatur oder ein weiterhin aktiver Combatant. Tote, geflohene, besiegte oder abwesende Ziele werden nicht durch andere ersetzt. Die Ablehnung geschieht vor Ressourcen, Kampfstart und XP. Bestehende Angriffsregeln und die Behandlung aufgebender Gegner bleiben erhalten.

**T35 – Ortsnormalisierung und Szenenvergleich widersprachen sich.** Die Ankunft hob eine Wildnis unter einer Stadt zum erlaubten Realm-Elternort an; die Prüfung der folgenden Deltas verlangte weiterhin die Stadt als direkten Elternort. Beide Wege verwenden jetzt dieselbe Elternnormalisierung. Der Szenenvergleich liest ausschließlich vorhandene Orte, legt nichts an und erteilt keine Reiseberechtigung. Mehrdeutige Eltern und gleichnamige Orte unter anderen gültigen Eltern bleiben ausgeschlossen. Die vorhandene Begrenzung einer erzählten Gruppe auf zwölf Wesen ist unverändert.

**T58 – fehlende Szenenannotation und falsche Reihenfolge.** Ein ergänztes `quest.detail.scene` allein hätte die lokale Einführung dreier Wyrlings vor der Ankunft nicht legitimiert. Der Extractor-Vertrag benennt jetzt ausdrücklich Ankunft vor anschließender lokaler Begegnung. Der Parser meldet lokale Einführungen mit derselben expliziten Zielreferenz vor einer erst später gemeldeten Ankunft an den bestehenden Repair. Fehlende Szenenfelder bleiben ebenfalls Fehler. Es gibt keine automatische Umsortierung, keine Ankunft aus Prosa und keinen zusätzlichen Modellversuch. Die endgültige Bewegungs- und Präsenzprüfung bleibt in `applyWorld`. Tatsächliche entfernte Sichtungen mit `present:false` und mehrere Ankünfte bleiben möglich.

**T29 – Handlung plus Preisfrage.** Der Agency-Guard trennte „I … head to the Wren … — what's the price …?“ nicht und verwarf die Reise wegen des abschließenden Fragezeichens. Eine eigenständige Ich-/Wir-Handlung vor einer durch Gedankenstrich abgesetzten Frage wird nun getrennt geprüft. Fragen, Bedingungen, Verneinungen sowie Preisfragen ohne Kaufzustimmung bleiben geschützt. Dadurch entsteht weder eine Zahlung noch eine Zimmerbuchung.

## Regressionen und Abnahme

`tests/v4/patch_run16.test.js`: **17 neue Tests**, mit Original-Eventpräfix und den Extractor-Antworten 160/161 in `fixtures/run16.json`. Die Fixture enthält keine Modell-Reasoning-Texte. Gegen unveränderten Produktcode `.91`: **7 rot, 10 grüne Kontrollen**; anschließend **17/17 grün**.

- T52 einschließlich tatsächlichem Encounter-Ziel, unverändertem abwesendem C, explizitem gültigem Peer und Ablehnung ohne MP/Questfortschritt. Zusätzlich direkter Angriff am Engine-Eingang, der den Planner umgeht. Historischer Schutz für tote Buchstabenziele weiterhin grün.
- T35 einschließlich Originalankunft, einer Ortsidentität und zwölf regulär begrenzten Kreaturen; falscher Elternort, nicht autorisierte Reise und fehlende Ortsanlage als Gegenfälle.
- T58 einschließlich annotiertem, aber falsch sortiertem Bericht, bestehendem Repair, drei einmalig gebuchten Kreaturen nach Ankunft, gescheiterter Ankunft, entfernten Sichtungen, wiederholtem Besuch und fehlerhaften Deltas. Event-Replay/JSON-Reload und alternative Antwort aus demselben Vorzustand ergeben identischen Zustand; eine bereits angewendete Antwort ruft keinen Provider erneut auf.
- T29 Originaltext plus echte Frage, bedingte Reise und verneinte Handlung.

Angrenzende Planner-/Kampf-/World-Fälle **87/87**, Agency-Suite **15/15**; zusätzlich gemeinsam fokussiert **32/32**. Vollständiges **`npm test`: 1789/1789**, keine ausgelassenen Tests. Die bestehende Versionsassertion wurde auf `extract-5.10` aktualisiert.

Echter **SillyTavern 1.19 / Chromium / Mockprovider**, `npm run smoke:st:c`: abschließend **21/21**, **fünf Extractor-Aufrufe**, keine PageErrors. Vier aktuell gespeicherte Story-Replies jeweils `applied` und genau ein `extract.applied`; Kampfstart und Swipe-Wiederverwendung bestanden. Der erste Lauf war **20/21**: `noPageErrors` scheiterte mit `Unexpected token 'I', "Internal S"... is not valid JSON` und `AbortReason @ openai.js:4565`; alle übrigen Prüfungen waren grün. Ohne Änderung wiederholt vollständig grün. Die genaue Ursache des ersten Hostfehlers ist nicht belegt; er wurde nicht als bestanden gewertet.

## Kompatibilität und Grenzen

Keine neuen Eventtypen, Zustandsfelder, Save-Migrationen oder Wire-Felder. Historische gespeicherte Events werden unverändert gefaltet; der neue Chronologiecheck gilt nur im bestehenden strikten C-/Ruleset-2-Extraktionsmodus. Legacy-Parser und V3-Kampfpfad behalten ihre bisherige Semantik. Narrator-Karte bleibt Revision `.85`; weder XP, Werte, Gearslots, Board noch Testspieler wurden geändert. Der fehlende kanonische Handelspartner aus T23–33 bleibt Bestandteil des geplanten Handelsfachpakets.

Der Chronologiecheck erkennt ausdrücklich gleiche Ortsreferenzen, keine beliebigen sprachlichen Ortsaliasse oder die Bedeutung jeder Prosa. Die World-Firewall bleibt deshalb maßgeblich. Ein weiterhin falscher oder unvollständiger Modell-Repair kann sicher scheitern; der Mock-Smoke beweist keine natürliche GLM-Extraktionsqualität. Weitere Balanceänderungen sind aus diesem Lauf nicht abgeleitet.
