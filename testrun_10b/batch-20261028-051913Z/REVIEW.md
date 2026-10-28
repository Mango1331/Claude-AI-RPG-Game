# Doppel-Langlauf vom 28.10.2026: unabhängiger GPT-Review

**Gegenstand:** Original-ZIP batch-20261028-051913Z.zip; 81.841.337 Bytes (78,05 MiB), SHA-256 **35a8cdc7b0e7ad3f3511e9397b2d527b7750a6992b84a9d6002ce14fd5d752aa**. CRC-Test erfolgreich, 48 ZIP-Einträge. Tatsächlich gelesen: batch.json und die Run-/Evaluation-/Call-/Event-/Report-Daten aller drei Kampagnen, gezielte Turn-/Event-Gegenproben. Originaldatei ist im Chat hochgeladen, **nicht in diesem Git-Verzeichnis archiviert**. Keine Änderungen an Code, Tests oder Runner.

**Kritischer Versionshinweis:** **ALLE drei Läufe liefen auf Build 4.3.0-c.6.6.106**, Commit **75a436636fa0**, nicht auf .109. Diese Ergebnisse dürfen weder als natürliche .107–.109-Regressionsabnahme noch als Main/Minor-Abnahme behandelt werden. Die aktuelle Codeversion steht weiterhin ausschließlich in [03](../../03_AKTUELLER_PROJEKTSTAND.md).

## 1. Laufstatus und Einordnung des manuellen Stopps

| Profil | Inputs | Engine-Turns | Level | Endgrund | Kämpfe / Kills / Guildabschlüsse |
|---|---:|---:|---:|---|---|
| Guild Warrior | 250 | 219 | 7 | Normales 250-Input-Limit | 16 / 16 / 4 |
| Guild Mage | 250 | 216 | 10 | Normales 250-Input-Limit | 23 / 31 / 11 |
| Guild Rogue | 0 | 0 | – | Absichtlich per Ctrl+C beendet | 0 / 0 / 0 |

**Bewusste Nutzerentscheidung:** Der dritte Run wurde direkt nach dem Start und vor dem ersten Spielerinput abgebrochen, weil die beiden Langläufe für den gegenwärtigen Prüfzweck genügen. batch.json führt die Gesamtserie deshalb als interrupted und den dritten Teil als process_error. Die spezifischere Rogue-Quelle run.json nennt **harness: interrupted (Ctrl+C)**. **Das ist kein technischer Rogue-Spielabsturz.**

**Insgesamt:** 500 natürliche Inputs, 435 tatsächlich begonnene Engine-Turns, **6.466 Engine-Events**, **1.422 Engine-/Narrator-Providercalls**, 39 abgeschlossene Encounters, 47 besiegte Gegner und 15 abgeschlossene Gildenaufträge. Beide vollständigen Läufe erreichten ihr Limit, **nicht** das ursprünglich höhere Testziel Level 15. Kein als fatal ausgewiesener Planner-/World-Abbruch, kein Tod, keine pageErrors oder serverErrors laut Run-Protokollen.

## 2. Technische Robustheit und wichtige Gegenfälle

| Befund | Warrior | Mage | Einordnung |
|---|---:|---:|---|
| Provider-Aufrufe | 714 | 708 | Original-Calls vorhanden |
| Reparaturen | Planner 7 / Extractor 23 / Board 2 | Planner 18 / Extractor 15 / Board 1 | **66 insgesamt**; deutliche Format-/Schema-Reibung |
| Extractor-Empty-Recovery | 3 | 1 | Status applied, **kein Beweis verlustfreier World-Übernahme** |
| Verworfene Deltas | 146 | 156 | **302 Validierungsablehnungen**, nicht 302 sichtbare Spielerblockaden |
| no_go-Rejections | 6 | 2 | Nur ein .106-Befund, keine .109-Aussage |
| Spielerpanels | CLARIFY 6, NOT TAKEN 2, REFUSED 0 | CLARIFY 11, NOT TAKEN 2, REFUSED 2 | Gesondert von Delta-Rejections zählen |
| overreach.noted | 3 | 5 | Teilweise ungebuchte Zahlungen, Konsum, Questannahme oder Schlaf behauptet |

**Gegenproben anhand der echten Events:**

- **Warrior T4:** Boardgenerator scheitert an der geforderten F-Questverteilung (Einstieg, Mid-F 4–7 und Upper-F 8–14). Die Engine bucht board.failed, zeigt kein erfundenes Ersatzboard, und der Run läuft weiter. UX-Reibung, kein fataler Runstop.
- **Warrior T78/91/94/98/101:** fünf vom Narrator eingeführte Dungeonfeinde werden als nicht zu gültigen Slots gehörig zurückgewiesen. Keine Phantom-Kills oder Phantom-XP; gleichzeitig besteht eine sichtbare Narrator-/World-Diskrepanz.
- **Warrior T119/173/174:** die drei Empty-Recoveries folgen einem Extractor-Length-Ende. Heavy Slash wurde jeweils wegen unzureichender Reichweite abgelehnt. T173 und T174 enthalten zugleich scene.position-Events: tatsächliche Bewegung und illegale Attacke müssen später handlungsgenau getrennt werden.
- **Warrior T139:** kombiniertes Reise-/Guild-Turn-in-/Heilungsbegehren endet nach Planner-Length/Repair in einer Systemantwort mit **keinen Events**. Diese Eingabe ist keine bestätigte Durchführung.
- **Warrior T213:** eine Statzuweisung nur in natürlicher Sprache wird korrekt verweigert; der Runner dokumentiert eine unnötige Systemkommando-Friktion.
- **Mage T74:** eine Statzuweisung mit im Satz eingebettetem #assign WIL 2 INT 2 VIT 1 führt zu Planner commands=[] und **keiner stat.assigned-Buchung**. Das beweist nicht, dass jede zulässige #assign-Form versagt, zeigt aber ein konkretes Nutzungsproblem.
- **Mage T206:** Preisgenaue Sammelverkaufsanweisung; Planner-Repair endet mit finish_reason length. **Keine Events** und damit kein dokumentierter Verkauf bei dieser Eingabe. Spätere Verkäufe sind separat gebucht.
- **Mage T219:** Extractor-Recovery mit Length-Ende; trotzdem sind Arcane-Bolt-Kill, 180 Kampf-XP, Encounter-Ende und Loot **autoritativer Enginezustand**. Gutes Beispiel: sicher fortgesetzter Zug und wirklich gebuchte Handlung müssen getrennt betrachtet werden.

In den beiden Runs gibt es acht overreach.noted-Einträge, unter anderem erdachte Gatekeeper-Zahlungen, eine unberechtigt vorweggenommene Guild-Questannahme und nur bedingt gebuchte Gasthaus-Handlungen. **Integritätsschutz ist nicht gleich perfekte Spielerprosa**. Einzelne Fälle können später per Chat/Delta-Audit geprüft werden; nicht alle automatisch als gleicher Defekt.

**Recovery-Schluss:** Die .105/.106-Richtung zeigt einen deutlichen technischen Langlaufgewinn. Aber Runnerstatus ok / Limit erreicht bedeutet weder hundertprozentige Ausführung aller Eingaben noch komplette Extraktion. Der Rogue-Stopp ist hierfür nicht mitzurechnen. Die konkret geänderten .107–.109-Guards müssen anhand neuerer Quellen getrennt bewertet werden.

## 3. Progression, Welt und Gameplay

| Beobachtung | Warrior | Mage |
|---|---:|---:|
| Level nach 100 Inputs | 2 | 6 |
| Level nach 250 Inputs | 7 | 10 |
| Kampf-XP laut Encounter-Auswertung | 1.892 | 3.580 |
| Quest-XP abgeschlossener Verträge | 692 | 1.790 |
| Abgeschlossene Gildenquests | 4 | 11 |
| Besuchte Orts-IDs | 38 | 37 |
| Verkäufe / Erlös | 1 / 4 cp | 4 / 357 cp |
| Ausrüstungswechsel | 2 | **0** |
| Fortschritte bei Skills | 4 Proficiency-Stufenereignisse | 2 Proficiency-Stufenereignisse |
| Neue aktive Skills / Passives | **keine** | **keine** |
| Letzter verbuchter Geldstand | 132 cp | 1.044 cp |

**Warrior:** Alle 16 Encounter bestehen aus einem einzelnen Gegner; hier **kein Gruppenkampf-Nachweis**. Zwei Bog-Cat- und zwei Tusked-Boar-Questabschlüsse, während ein erheblicher Teil der Eingaben auf Erkundung, NPCs und Reise entfällt. Der Spieler wechselt zur Hand-Axt (ATK6) und später zurück zum Starter-Langschwert; kein nachgewiesener langfristiger Gear-Upgradepfad. Heavy Slash erreicht P4, Basic Attack P2; Guard entwickelt sich nicht durch qualifizierte Anwendung. Der langsame Levelverlauf darf nicht ohne Spielstil-/Angebotsvergleich als XP-Missbalance erklärt werden.

**Mage:** Mehrkämpfe gegen echte Gruppen (bis vier Gegner), elf Guildabschlüsse. **Davon fünf Adder-Jagden, fünf Boar-Jagden und ein Dungeon-Clear.** Das ist ein konkreter Monotoniehinweis: wiederholte rentable Standardjagden dominieren die 250 Inputs. Trotz 1.044 cp verfügt der Runner über **keinen Ausrüstungswechsel**. Arcane Bolt steigt P1→P3; keine weiteren neuen Skills oder Passives. Das bestätigt ein **Spielgefühlrisiko ohne notwendigerweise fehlerhafte Growth-Validierung**.

**Kein Klassen-A/B:** Die Runs benutzen verschiedene Seeds, Erzählweisen, Gegner, Quests und Spielerentscheidungen. Warrior L7 versus Mage L10 beweist deshalb keine grundsätzlich stärkere Mage-Klasse, kein generelles XP-Problem und keine Rogue-Aussage. Weder L15 noch F→E wurde natürlich erreicht; die F→E-Entwürfe bleiben vorläufig.

**Externe Monsterdesign-Überlegung:** Der Batch belegt weder neue Speziesprofile noch bessere Waffen- oder Körperloot-Regeln. Die separat abgelegte [Monsterdesign-Fachanalyse](../../recherche/MONSTERDESIGN_ANALYSE_20261028.md) bleibt Bewertungsgrundlage ohne Implementierungsfreigabe.

## 4. Performance

| Original-Kennzahl | Warrior | Mage |
|---|---:|---:|
| Gesamtdauer mit Setup und Overhead | 110:06 min | 141:55 min |
| Median Spielinput (bis HUD) | 20,3 s | 25,7 s |
| p90 Spielinput | 36,5 s | 47,3 s |
| Durchschnitt Spiel + Testspielerentscheidung | 24,9 s | 32,2 s |
| Narrator / Extractor / Planner-Median | 8,4 / 5,7 / 2,5 s | 11,0 / 7,3 / 3,1 s |
| Anteil gecachter Prompt-Tokens über alle Calls | 75,1 % | 71,1 % |

**Zusammen 252:01 Minuten**, also über vier Stunden für 500 Inputs (beide vollständigen Läufe). Providerzeiten stecken bereits in den Spielzeiten; nicht doppelt summieren. Das Caching ist wirksam. Kürzere Extractor-Ausgaben oder weniger Aufrufe können später A/B-gemessen werden, aber nicht zulasten gültiger World-Deltas oder ohne Kenntnis der bereits zulässigen Feld-Auslassungen.

## 5. Grenzen und nächste Überprüfung

**Mit zwei Langläufen ausreichend belegt:** Fehlerbehandlung über 500 Inputs auf .106 ohne fatalen Abbruch, reale Combat-/Questfortschritte, vier Extractor-Empty-Recoveries, wiederkehrende kleinere Modellfehler, sichtbare Nachteile der wiederholten Jagdschleife sowie ausbleibender kreativer Skill-/Ausrüstungsfortschritt.

**Nicht belegt:** .109-Liveabnahme, Level 15/F→E, Rogue-Spielbarkeit, Main/Minor, faire PC-/NPC-Kampfbalance, vollständige Narrator-Persönlichkeitsqualität oder vollständige Übernahme aller World-Ereignisse. Eine bloße Anzahl abgelehnter Deltas ist **keine** Kennzahl „unsichtbare Wände“. Für eine echte Wirkungsmessung bräuchte es die im Spielerbild sichtbaren Blockaden und die anhand von Events validierten Ausführungen.

**Vorläufige Prüfschwerpunkte für später, nicht freigegeben:** Board-T4 und Dungeon-Phantome, die vier Extractor-Recoveries, T139/T206 mit ungebuchten Eingaben, Stat-Punkte-UX T74/T213, Narrator-Übergriffe auf Zahlungsmittel/Questannahmen; separat Progressions-/Quest-/Ausrüstungsvariation. Keine automatische Wiederholung des dritten Tests und **keine Änderung des laufenden Produktbranches**.

**Bewertung:** Für die aktuell gesuchte .106-Langlauf- und Fail-soft-Evidenz sind zwei vollständige 250-Input-Runs sehr brauchbar. Der bewusst abgebrochene dritte Run ist als solcher zu archivieren; die offenen Designfragen werden durch die Laufgrenze nicht entschieden.
