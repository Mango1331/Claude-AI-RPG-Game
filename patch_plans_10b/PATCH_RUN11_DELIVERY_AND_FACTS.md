# Run 11 – technischer Folgeplan und unabhängiger Gegenreview

Stand: 25.10.2026. Geprüfter Produkt-HEAD `96c75eb` (.76), main `639f4d8`. Engine-Fixes hier **nur geplant**, Runner-Guide separat angepasst.

## Befunde aus Originaldaten

Original `20261025-020335Z-current_test.zip`, 15.421.452 Bytes, SHA-256 `39d30816b1f3f677089d6f97ba2b6f593f6df65f6f9d4cb2ae8787b3af014471`, lokal entpackt. Chat, Events, Calls, Run-/Evaluation-Daten und Spielerentscheidungen mit aktuellem Code verglichen; keine ZIP-Veröffentlichung behauptet.

| Reviewbefund | Eigenständiges Urteil |
|---|---|
| 100 Inputs, acht Siege, Level 4, technisch stabil | Bestätigt: 95 Engine-Turns, 93 angewandte Extraktionen; kein PC-Tod. Endzustand mit `foldChat` rekonstruiert. Kein Dungeon-/großer Gruppenflucht-Nachweis. |
| Progression: 634 XP insgesamt | Bestätigt: 362 Kampf- und 272 Quest-XP. **34**, nicht 334 XP seit Level 4; 334 war der Zwischenstand unmittelbar vor dem letzten Aufstieg. Kein Anlass für eine weitere pauschale XP-Erhöhung. |
| Private Arbeit .76 funktioniert | Bestätigt: reine Annahme ohne Abschluss; spätere echte Arbeit/Reise, dann genau ein auftragsbezogener Vier-Kupfer-Lohn in E186. |
| Lieferung blockiert durch `Recipient` | Bestätigt: echte Transfers E83 und E165, null `quest.delivered`, 13 `quest_delivery`-Ablehnungen. Generator akzeptiert einen Platzhalter, Empfängerprüfung verlangt Namen/Rolle. Kein alter DELIVER/GIVE-Doppelziel-Fall. |
| Erste Übergabe scheitert berechtigt am falschen Ort | **Nicht als technische Ursache bestätigt.** Vor E83 kennt die Engine die Infirmary noch nicht separat. `destination()` löst den längeren Zieltext auf den bekannten Elternort Quarry camp auf. Sonde am Originalzustand: `deliveryTarget=false`; allein `Recipient→Healer` macht es dort bereits `true`. Vor E165 ist der Innenraum bekannt; auch dort macht dieser Rollenwechsel `false→true`. Die erste Szene beweist keinen tatsächlichen Eintritt in die Infirmary, aber die aktuelle Ortsprüfung erzwingt ihn ebenso wenig. |
| Phantom-NPC-Fakt | Bestätigt: E158 verwirft `person.named`, speichert dennoch Fact über `npc.mara_clerk`. Endzustand liefert genau diesen einen Fehler in `validateState`. `mapRef` lässt unauflösbare IDs durch; Fact-Gate prüft nur fehlende `mon.*`, nicht `npc.*`. |
| Nichts gekauft / Gear nicht getestet | Präzisieren: Wetzstein und Verpflegung/Unterkunft tatsächlich bezahlt; **keine neue Waffe/Rüstung, kein Equipment-Wechsel und kein Lootverkauf**. Endstand 189 cp, u.a. Boar Hide/Tusks, zehn Bog-Strider-Federn, sechs Talons sowie Vine-Material im Besitz. Dass ein bestimmtes Upgrade verfügbar und bezahlbar gewesen wäre, ist unbewiesen. |

## 1. P1 – Liefervertrag und ausführbare Übergabe gemeinsam korrigieren

**Dateien:** `src/v4/guild.js` (`boardProfileError`, Generatoranweisung/Validierung), `src/v4/delivery.js` (`destination`, `deliveryTarget`), `world.js` (bestehende Ablehnungs-/Korrekturausgabe). Keine neue Quest-/Quittungsengine.

1. Neue Boards verlangen eine konkrete Person oder erkennbare Empfängerrolle, z.B. `Healer at Quarry camp infirmary`; `Recipient`, `someone` und vergleichbare Platzhalter dürfen nicht als konkrete Rolle veröffentlicht werden. Bestehenden einmaligen Board-Repair nutzen; keine zusätzliche Modellrunde.
2. Bei kanonischem `Person/Role at Place` bzw. `deposit at Place` den **Zielortteil** auflösen. Ein unbekannter benannter Innenraum darf nicht allein wegen Namensüberschneidung als bekannter Elternort gelten. Unbekannt/mehrdeutig bleibt unbestätigt; normale GO-/Ortsentstehung kann den Innenraum später etablieren. Bekannte Kinder des vereinbarten Ziels bleiben über `under()` zulässig. Ältere freie Zielformate gesondert erhalten, ohne neue Teiltreffer-Schlupflöcher.
3. Bestehende institutionelle Platzhalter nur eng abfangen: nachgewiesenes zuständiges Personal am **aufgelösten Zielort**, für den Run-Fall Heilerpersonal einer Infirmary; vorhandenen Priory-Pfad weiterverwenden. Keine pauschale Regel „jeder NPC am richtigen Ort“. Für nicht sicher zuordenbare Institutionen keinen Empfänger erfinden. Eine kleine Erweiterung des vorhandenen Rollenchecks genügt; kein universelles Berufs-/Institutionensystem.
4. Fehlerkorrektur benennt ausschließlich bestehende fehlende Bedingung: Zielort nicht bestätigt oder Empfänger passt nicht. Keine neuen Unterschriften, Container-Rückgaben, Warenbeschaffung oder freien Ersatzlieferungen anweisen. `quest.detail` bleibt unverbindliche Erinnerung. Bei falscher Übergabe bleibt der reale Objekttransfer erhalten, ohne Liefercredit; nicht heimlich zurückgeben oder duplizieren.
5. Vorhandene passende Quittungen bleiben gültig. Keine pauschale Migration/Retro-Gutschrift für E83: die tatsächliche Infirmary-Ankunft ist dort nicht belegt. Historische Transfers nur dann nachanerkennen, wenn vorhandene Provenienz, Ort und zuständiger Empfänger bereits eindeutig genügen; andernfalls keine erfundene Leistung.

**Rot/Grün:** Originalzustände vor E83/E165 verwenden. E165 mit vorhandenem Heiler am Ziel muss nach Fix genau eine Quittung erzeugen; E83 bleibt ohne bestätigten Innenraum unberechtigt. Zusätzlich unbekannter Innenraum vs. Elternort, falscher Ort, Besucher statt Personal, namentlich anderer Empfänger, legitimer Priory-/Deposit-Pfad, Teilmenge, ungebundener gleichnamiger Ersatz, zurückgegebene gleiche Einheit, zweite echte Einheit, doppelte READY/Turn-in/Bezahlung. Originalbewegung und Gegenstandstransfer unverändert prüfen. JSON-Replay/Reload/Swipe und Ruleset 1 erhalten.

**Risiko/Aufwand:** mittel; zentrale Matching-Funktionen mit bestehenden Saves. Neue Generierung und bestehende institutionelle Verträge zusammen prüfen. Keine Questtexte oder Waren anhand bloßer Erzählung nachträglich umschreiben. Diesen Fachfix zuerst umsetzen.

## 2. P1 – auflösbare Faktenreferenzen statt Ghost-NPCs

**Dateien:** `world.js` bei `fact`/`learn`, darunterliegende Referenzauflösung in `world.js`/`src/world.js`, vorhandene Integritätsprüfung `validate.js` als Gegenkontrolle.

Das vorhandene Gate für fehlende Monster-IDs auf reservierte Entity-Referenzen erweitern, nicht alle freien Fakt-Subjekte verbieten. Nach normalem `mapRef` dürfen konkrete `npc.*`/`mon.*`-Referenzen nur existierende Entities benennen; bekannte Places/Content-Orte bleiben gültig. Bei `learn` Empfänger und referenzielle Subjekte prüfen; `o` bleibt dort ausdrücklich literaler Propositionstext. Fact-Objektwerte nur dann auflösen/prüfen, wenn sie als tatsächliche reservierte Referenz auftreten; gewöhnliche Aussagen bleiben Text. Keine separate Liste „abgelehnte Namen“, kein NPC-Autospawn und keine Aufweichung der Inventar-Firewall.

**Rot/Grün:** Originalfolge E158 (`person.named` unbekannt, dann Fact) darf keinen ungültigen Fact erzeugen. Gegenfälle: bestehender NPC, `person.new` plus anschließender Fact im selben Reply, bekannter Ort, freie Welt-/Lore-Aussage, unbekannte reservierte Referenz in `learn`, literaler Wissensinhalt. `validateState` nach Anwendung und JSON-Replay muss leer sein. Bereits gespeicherte Altfehler nicht beim Laden still löschen; eine Reparatur dieses konkreten alten Saves wäre ein eigener ausdrücklicher Auftrag.

**Risiko/Aufwand:** klein, separat verständlich; keine Abhängigkeit vom Lieferfix. Beide Bereiche können in einem getesteten Folgecommit bleiben, benötigen keine Mini-Hotfix-Serie.

## Runner jetzt angepasst; Abnahme des Folgepatches

`current_test` motiviert aktiv die Schleife **Kampfbeute → geeigneter Käufer in der Stadt → realer Verkauf → nützliches bezahlbares Gear → tatsächlich anlegen → später frei gewählte Abenteuer**. Keine automatische Transaktion, Geldinjektion, feste Questfolge, verpflichtende Klasse oder neue Erfolgsmilestones. Questfracht, wichtige Belege und benötigte Vorräte behalten; bei fehlendem Käufer/Upgrade sinnvoll ausweichen. Keine Änderungen am Player-Algorithmus, nur Briefing/Fokus.

Guide-Änderung: vorhandene Open-Run-Tests 4/4, vollständige Suite 1550/1550; Engine bleibt .76. Für diese reine Instruktionsänderung kein neuer ST-Smoke ausgeführt. Natürliche Kauf-/Verkaufsabnahme steht aus. Für die späteren Engine-Fixes: gezielte rote Regressionen auf .76, angrenzende Delivery/Authority/Ownership-/Legacy-Suiten, vollständiges `npm test` und echter ST-Smoke; anschließend natürlicher 100-Input-Lauf auf nachweislich neuem Build. Verkauf, Kauf und `equip` anhand echter Events auswerten, nicht als Pflicht-Erfolg erzwingen.

**Bewusst offen:** Kampf-/Fluchtbalance, Monsteranatomie beim Vine-Loot, höhere Evolutionen und neue Gear-Mechaniken. Acht Siege gegen kleine Begegnungen rechtfertigen weder globale Nerfs noch eine Balancefreigabe. Zuerst die Liefer-Wiederholungsschleife beseitigen und reale Ausrüstung beobachten.
