# 10B – XP-Balanceversuch .121 (30.10.2026)

Auf Nutzerauftrag steht `content/rules.json:xp.reward_multiplier` jetzt auf **5 statt2**: **2,5-mal die bisherigen Kampf-/Quest-XP**, nicht nochmals das Fünffache des .120-Werts. Ziel ist, natürliches Level15 in ungefähr200 sinnvollen Eingaben besser erreichbar zu machen; kein garantierter Abschluss oder erzwungener Fortschritt.

Die vorhandenen `defeatXp`/`questXp` wenden den gemeinsamen Faktor nach dem bisherigen Runden an. Beispiel: gewöhnlicher F-L1-Gegner **24→60XP**, Standard-L1-Quest **60→150XP**, Minor-L1-Quest **46→115XP**. Rangabstand, Gegnertyp und Stärke bleiben berücksichtigt; `awardXp` multipliziert nicht erneut. Levelschwellen bleiben `Level×100` (insgesamt10.500XP bis15), ebenso freie Punkte, PP/LP, Geld, Gegner-, Gear- und Skillwerte. Der Warrior-Einkaufsversuch aus7f96131 bleibt enthalten.

Neue Berechnungen nutzen5 in beiden Regelständen. Bereits gebuchte Events behalten ihre Beträge; gespeicherte Encounter-DefeatXP bleibt unverändert. Keine nachträgliche XP-Gutschrift, Save-Migration oder neue Progressionspolicy. Narrator-Vertrag/Extractor unverändert, kein Kartenupdate.

**Abnahme:** Die drei vorhandenen XP-Kalibrierungsfälle auf .120 alle rot, nach Änderung3/3 grün. Erster Gesamtlauf2325/2348: alte Zahlen-/Rest-XP-/Levelannahmen und ein durch schnelleres Leveln trivial gewordener Skill-Test. Erwartungen korrigiert; gemeinsame Testhilfe zählt Rest-XP plus bereits bezahlte Levelschwellen. Positive Qualifikationskämpfe im Skill-Test beziehen sich nun auf seinen aktuellen Level, die negative Trivialkampfkontrolle bleibt. Original-JSON-Fixtures unverändert. Abschließend **2348/2348**, Testparallelität4, keine übersprungenen Fälle.

Zusätzlich alle **3845 Originalevents aus Batch15** neu gefaltet: drei Endzustände unverändert, `validateState` mit Faktor5 ohne Befund. Kein neuer ST-Smoke bei reiner Zahlenkalibrierung, kein natürlicher .121-Lauf. Der nächste Batch muss tatsächliches Tempo, Überleben, Gear und Skillentwicklung zeigen; unterschiedliche Klassen-/Einkaufsprofile liefern keinen kontrollierten Klassenvergleich. Ein explizites altes150-Input-CLI-Limit begrenzt den Lauf weiterhin unabhängig vom Levelziel.

## Historisch: ursprüngliche XP-Verdopplung .67

`content/rules.json:xp.reward_multiplier = 2` is the single balance setting. `src/progression.js:defeatXp` and `questXp` apply it after the existing rounding, so 12 becomes 24 and 23 becomes 46. Combat against creatures/humans, Guild contracts and private quests share these functions. Rank, target-type and strength modifiers still apply normally. PP/LP, money, level thresholds and combat rules are unchanged.

`awardXp` does not multiply again. Existing event logs replay their stored amounts unchanged; already locked encounter DefeatXP remains locked. New calculated rewards use the multiplier in both rulesets. No save migration.

Three new regressions: 3/3 fail on .66, 3/3 pass after the change. They cover rank/type/strength modifiers, post-rounding quest rewards and Run 6's 78→156 XP (Level 2, 56 carryover). Existing test expectations were updated for the new rewards and level carryover; original recorded fixtures were preserved. Final `npm test`: **1429/1429**, no skips or failures. No new ST-smoke or natural live run; survival/balance improvement remains to be observed.
