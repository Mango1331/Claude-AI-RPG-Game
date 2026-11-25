# User12 — Bewertung aller 18 Feedbackpunkte

Dies sind spontane Eindrücke während des Spielens, keine abschließend priorisierte Anforderungsliste. Wortlaut [FEEDBACK_SPIELGEFUEHL.md](FEEDBACK_SPIELGEFUEHL.md), zugbezogener technischer [Gegenreview](REVIEW.md). M und T wie dort.

| Nr. / Feedback | Beleg / Gegenbewertung | Konsequenz |
|---|---|---|
| 1 #assign HUD, nicht schlimm | M33/34 10 Punkte verteilt, System 0, kein neuer HUD-Datensatz; sichtbarer alter HUD laut Nutzer | Kleiner UI-Fix, nicht Statmechanik; nur wenn isoliert |
| 2 Chief Kombi | T23 erfolgreich stealth, T24 true Ambush; action_input.js L59 verweigert Kombination ausdrücklich, T13 offene Kombination funktioniert | Regel korrekt, bessere Erklärung „Ambush: nur Opening Action“ |
| 3 Banditen cool, Risiko vorher erkennbar | M72 keine Level im HUD, T34 L2/F, PC L5; beide Aggressive; zweiter Auftrag | Positiv erhalten; vor Entscheidung Gefahr plausibel anzeigen, weltgebundene Stärke variieren |
| 4 Bandit, then / paraphrasiert | T34 irritierende Prosa; T35 „Last chance“ statt wörtlicher Warnung | Nutzer noch unentschieden, beobachten; keine neue strikte Promptpflicht |
| 5 Banditen nur Ausweichen | T34/35 je zwei sidesteps; combat.js cover-Guard vs temporärer Sidestep | P1 lokaler Repro; keine NPC-Generierung als alleinige Ursache |
| 6 gesagtes rest | T40 220 Minuten und volle Recovery statt nur Gespräch; kein Geldverlust; Essen overreach | Optional #rest/HUD, klare Intentgrenzen, bei offenem PULSE nicht ohne N/X |
| 7 Inn-Unterorte, Kontext | T42 service.granted, no_go Loft; T43 sleep 645 min gebucht; T45 smith search/no_go; tatsächliche History 4+3 | P1 gewöhnliche Szenenbewegung, nur relevante persistente Suborte |
| 8 PULSE Spuren | 8/40 open, trace3 strange1 obstacle2 danger1 life1; zwei überflutete Wege | Vielfalt/Vermeidung monotoner Unterbrechungen, kein pauschales Wahrscheinlichkeitsurteil |
| 9 gebündelter Verkauf gut | T47 6er bid firm, T49 +300 cp | Bestehende Handels-HUD-Pipeline schützen |
| 10 value guide | items.js L150; F gear retail teilweise identisch value | Klare UI: tatsächliches Angebot, nur separater Richtwert wo nützlich |
| 11 doppelte Nachrichten aus Sorge | T48 Preisbestätigung trotz gültigem Gebot, M107 clarify, T53–55, T63–65 | Wichtigste subjektive Handelsreibe: gültige Erstgebote und Mehrfachabsichten zuverlässig |
| 12 Marta Starterrobe | T53 „I'll give you four copper“; terms conditional wegen Wiederverkaufsbegründung, T54 refused, T55 +4 | Erklärung nicht Bedingung; Reparatur gezielt |
| 13 Staff-Preise/Budget | T60 vier erzählte Preise 100/280/220/340, Engine 80/140/260/480; Budget358. Absicht nicht beweisbar | Preise vor Erzählen kanonisch bereitstellen; nicht einfach alle Preise am Budget ausrichten |
| 14 Stones | Kanonische Guild-Primer fünf ×80, Stone value 400, separates teaches. NPC behauptet Annex; kein kanonischer Nachweis. | Rarität und Verfügbarkeit mit Kanon getrennt prüfen |
| 15 NPC Metawissen | T60 behauptetes Registrierungsgerücht, T53 freie Starterware; keine eindeutig nachgewiesene Wissensbuchung | Beobachten, spätere Beta-Qualität; T67 Wiedererkennung gelungen |
| 16 equip/unequip+Bid gelöscht | Nutzerbericht; T52 erfolgreicher Tausch, T62 alter Stab automatisch Bag, zweites unequip refused; T61 ungebuchtes Trade-in korrekt verhindert | Direktes Equipment-HUD/#equip prüfen; exakten gelöschten Zug lokal reproduzieren |
| 17 Kaufen besser, erstes Bid price open | T53 Terms, T63 literal/evidence, T49/55/65 erfolgreiche Zahlungen | Fix echte Reibung, feste HUDs beibehalten, keine globale Lockerung |
| 18 Tempo tolerierbar, Mittel wichtiger | 203 physische Aufrufe, 2.62 Mio Inputtokens, Komponentenmittel P14.88/N25.70/X30.91, Boardausreißer | Mittel/Median unter gleichen Bedingungen, systematische Messung statt Einzelausreißer |

Zusatz aus Chat: T27 A Edit und Swipe ließen Engine aussetzen, Löschen beider Nachrichten und erneutes Senden brachte Wiederanlauf. Diese Beobachtung ist vom Nutzer ausdrücklich bestätigt, technische Ursache noch offen und unabhängig von den 18 Rückmeldungen.
