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
| Reparaturen | Planner 7 / Extractor 23 / Board 2 | Planner 18 / Extractor 15 / Board 1 | **66 insgesamt**; deutliche Format-/Schema-Reibung; Reparaturen **nicht** mit terminalem Fail-soft-Fallback verwechseln |
| Extractor-Empty-Recovery | 3 | 1 | Vier leere Extractorantworten wurden **erfolgreich repariert** (applied); **kein** terminaler Continuation-Fallback und kein Beweis, dass sonstige World-Deltas vollständig sind |
| Verworfene Deltas | 146 | 156 | **302 Validierungsablehnungen**, nicht 302 sichtbare Spielerblockaden |
| no_go-Rejections | 6 | 2 | Nur ein .106-Befund, keine .109-Aussage |
| Spielerpanels | CLARIFY 6, NOT TAKEN 2, REFUSED 0 | CLARIFY 11, NOT TAKEN 2, REFUSED 2 | Gesondert von Delta-Rejections zählen |
| overreach.noted | 3 | 5 | Teilweise ungebuchte Zahlungen, Konsum, Questannahme oder Schlaf behauptet |

**Gegenproben anhand der echten Events:**

- **Warrior T4:** Boardgenerator scheitert an der geforderten F-Questverteilung (Einstieg, Mid-F 4–7 und Upper-F 8–14). Die Engine bucht board.failed, zeigt kein erfundenes Ersatzboard, und der Run läuft weiter. UX-Reibung, kein fataler Runstop.
- **Warrior T78/91/94/98/101:** fünf vom Narrator eingeführte Dungeonfeinde werden als nicht zu gültigen Slots gehörig zurückgewiesen. Keine Phantom-Kills oder Phantom-XP; gleichzeitig besteht eine sichtbare Narrator-/World-Diskrepanz.
- **Warrior T119/173/174:** die drei Empty-Recoveries folgen einem Extractor-Length-Ende. Heavy Slash wurde jeweils wegen unzureichender Reichweite abgelehnt. T173 enthält eine tatsächliche Positionsänderung; T174 plant dagegen nur den Skill, **kein** zusätzliches move. Tatsächliche Bewegung und illegale Attacke müssen getrennt werden.
- **Warrior T139:** Die genannte „Guild hall in Caelreth“ ist nicht eindeutig: Das Reich enthält mehrere Hallen (Glassmere/Asterhall). Eine **Ortsrückfrage ohne Eventbuchung ist sachlich korrekt**, kein technisch verlorener Turn-in. Die zuvor von GPT suggerierte Fehlerklassifikation wird zurückgenommen.
- **Warrior T213:** eine Statzuweisung nur in natürlicher Sprache wird korrekt verweigert; der Runner dokumentiert eine unnötige Systemkommando-Friktion.
- **Mage T74:** eine Statzuweisung mit im Satz eingebettetem #assign WIL 2 INT 2 VIT 1 führt zu Planner commands=[] und **keiner stat.assigned-Buchung**. Das beweist nicht, dass jede zulässige #assign-Form versagt, zeigt aber ein konkretes Nutzungsproblem.
- **Mage T206:** Der erste Plan wählt zwar das vorhandene Angebot, nennt aber die Gegenpartei unpassend „Merchant B“ statt des belegten Verkäuferhandles und rechnet 2 Silber falsch als 200 cp statt 20 cp. Der Planner verwirft die Gegenparteibezeichnung; die Repair endet leer/length, daher **keine Buchung bei T206**. Auch T207 bleibt offen. **T208 verbucht dieselben zwölf Gegenstände korrekt für 20 cp**: kein nachgewiesener dauerhafter Verkaufsverlust. Das engere Gegenparteimatching bleibt ein UX-/Robustheits-Prüfpunkt, nicht primär eine Stückpreisfehlberechnung.
- **Mage T219:** Leere Extractorantwort nach Length-Ende, anschließend **erfolgreiche Reparatur** und applied-Status; der autoritative Arcane-Bolt-Kill, 180 Kampf-XP, Encounter-Ende und Loot sind in den Events enthalten. **Dies beweist nicht** die Auslösung des gesonderten terminalen Fail-soft-Fallbacks. Spieleraktion und World-Extractorstatus bleiben getrennt.

In den beiden Runs gibt es acht overreach.noted-Einträge, unter anderem erdachte Gatekeeper-Zahlungen, eine unberechtigt vorweggenommene Guild-Questannahme und nur bedingt gebuchte Gasthaus-Handlungen. **Integritätsschutz ist nicht gleich perfekte Spielerprosa**. Einzelne Fälle können später per Chat/Delta-Audit geprüft werden; nicht alle automatisch als gleicher Defekt.

**Recovery-Schluss nach Sols Originalprüfung:** Die zwei Langläufe zeigen hohe Robustheit und erfolgreiche normale Extractor-Reparatur, aber **kein** Event mit terminalem `continuation`-Marker und weder `plan.failed` noch `extraction.status:failed/late`. Der spezifische terminale Fail-soft-Zweig wurde **nicht benutzt** und kann daher aus diesem Batch nicht als natürlich bewährt gelten. Die Reparatur-/Retrymechanik begann bereits vor .105. Der Rogue-Stopp zählt nicht als Fehler. Der neuere `.109`-NPC-Anwesenheitscheck ist separat regressionsverdächtig (§6).

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
| Neue aktive Skills | **keine** | **keine** |
| Neue Passives | **keine nachgewiesen** | **1 Rare: Boar-Tempered Grit** |
| Letzter verbuchter Geldstand | 132 cp | 1.044 cp |

**Warrior:** Alle 16 Encounter bestehen aus einem einzelnen Gegner; hier **kein Gruppenkampf-Nachweis**. Zwei Bog-Cat- und zwei Tusked-Boar-Questabschlüsse, während ein erheblicher Teil der Eingaben auf Erkundung, NPCs und Reise entfällt. Der Spieler wechselt zur Hand-Axt (ATK6) und später zurück zum Starter-Langschwert; kein nachgewiesener langfristiger Gear-Upgradepfad. Heavy Slash erreicht P4, Basic Attack P2; Guard entwickelt sich nicht durch qualifizierte Anwendung. Der langsame Levelverlauf darf nicht ohne Spielstil-/Angebotsvergleich als XP-Missbalance erklärt werden.

**Mage:** Mehrkämpfe gegen echte Gruppen (bis vier Gegner), elf Guildabschlüsse. **Davon fünf Adder-Jagden, fünf Boar-Jagden und ein Dungeon-Clear.** Wiederholte Standardjagden dominieren viele der 250 Inputs. Trotz 1.044 cp zeigt der Runner **keinen Ausrüstungswechsel**; nach Sols Eingabenprüfung wurde aber **kein expliziter Gear-Upgrade- oder Manual-/Trainingskauf versucht**. Arcane Bolt steigt P1→P3, neue **aktive** Skills fehlen. **Positiv und ursprünglich von GPT übersehen:** Der Mage akzeptiert und erwirbt **Boar-Tempered Grit (Rare, `dyn.passive_unbroken_stance`)** durch seinen tatsächlich bestandenen Kampf gegen einen fünf Level stärkeren Boar bei bis auf 15 % HP gesunkenem Lebensstand. `passive.defined`, `passive.gained` und `decision.closed accepted` sind verbucht; der Folgekampfsnapshot trägt den Effekt **bei ≤50 % HP: +4 DEF und 10 % physische Resistenz**. Das ist ein realer organischer Entwicklungserfolg. Gear- und aktive-Skill-Anreize bleiben separat zu untersuchen, kein Beweis einer nicht funktionierenden Growth-Engine.

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

**Mit zwei Langläufen ausreichend belegt:** 500 Inputs auf .106 ohne fatalen Abbruch, reale Combat-/Questfortschritte, **vier erfolgreiche Extractor-Reparaturen ohne terminalen Fail-soft**, wiederkehrende kleinere Modellfehler und Jagdwiederholung, **ein tatsächlich erworbenes Rare-Passive**; fehlende neue aktive Skills und ausbleibende Gearwechsel wurden **nicht durch entsprechende gezielte Spieler-/Kaufversuche abgesichert**.

**Nicht belegt:** .109-Liveabnahme, Level 15/F→E, Rogue-Spielbarkeit, Main/Minor, faire PC-/NPC-Kampfbalance, vollständige Narrator-Persönlichkeitsqualität oder vollständige Übernahme aller World-Ereignisse. Eine bloße Anzahl abgelehnter Deltas ist **keine** Kennzahl „unsichtbare Wände“. Für eine echte Wirkungsmessung bräuchte es die im Spielerbild sichtbaren Blockaden und die anhand von Events validierten Ausführungen.

**Vorläufige Prüfschwerpunkte für später, nicht freigegeben:** **P1-Kandidat falsche NPC-Abwesenheit durch den neuen .109-Evidenzfilter** (§6), dann Handels-Gegenparteihandles (T206), vorsichtiger Dungeon-Slot-/Erzählabgleich, Board-T4, Stat-Punkte-UX T74/T213 und Narrator-Übergriffe. T139 als korrekte Mehrdeutigkeitsklärung führen. Die vier Extractor-Reparaturen sind kein terminaler Fail-soft-Test. Gear-/Skillabdeckung später mit echten Kauf- und Trainingsversuchen prüfen. Keine automatische Wiederholung des dritten Runs und **keine Änderung des Produktbranches**.

**Bewertung:** Für die .106-Langlauf-Stabilität und den Nachweis erfolgreicher gewöhnlicher Extractor-Reparatur sind zwei vollständige 250-Input-Runs sehr brauchbar. Der **terminale Fail-soft-Fallback** wurde hier dagegen **nicht natürlich beansprucht**. Der bewusst abgebrochene dritte Run bleibt korrekt klassifiziert; offene Designfragen werden nicht entschieden.

---

## 6. Errata nach Sols unabhängigem Gegenreview (.106 → .109)

**Quelle:** [Sols vollständige Gegenprüfung](SOL_COUNTERREVIEW.md), Commit `7c84a3e`. GPTs fehlerhafte ursprüngliche Behauptung „keine Passives“ ist im obigen Review **sachlich korrigiert**, ebenso die Auslegung der Reparaturen und der einzelnen Händler-/Ortsrückfragen. **Keine rückwirkende Änderung des Original-ZIP und keine Implementierungsfreigabe.** Sol faltete beide Zustände erfolgreich und validierte sie mit dem aktuellen Produktcontent. Diese Konsistenzprüfung beweist noch keine perfekte Erzählung.

### 6.1 Enger Vergleich gespeicherter .106-Extractors mit .109-World-Logik

Sol führte **431 ursprünglich angewendete Extractorberichte** (217 Warrior, 214 Mage) mit dem aktuellen .109-`applyWorld()` jeweils auf dem **originalen .106-Vorstand** des betreffenden Zuges aus. Unterschiede wurden nicht in die Vorstände späterer Züge fortgeschrieben; neuere Prompts hätten außerdem andere LLM-Texte erzeugen können. **Dies ist eine aussagekräftige, aber keine vollständige alternative .109-Kampagne.**

- **`forced_by`:** Kein einziger der gespeicherten Ankunftsberichte enthält ein nichtleeres `forced_by`. Die .107–.109-Spezialguards dagegen haben hier keinen belegten Anwendungsfall. Alte `no_go`-Ablehnungen dürfen nicht nachträglich als neue Erfolge der Guards ausgegeben werden.
- **NPC-Präsenz:** In **fünf Antworten** verhindert der neuere `presenceInReply()`-Belegcheck zuvor auf .106 akzeptierte Rückkehr-/Anwesenheitsereignisse und nachgelagerte World-Deltas: Warrior T51 und Mage T79, T132, T144, T247. Nicht alle Fälle sind gleich eindeutig; siehe nachfolgende Einordnung.

| Fall | Befund aus Sols .109-Gegenprobe | Bewertung / Guardrail |
|---|---|---|
| **Warrior T51 – Marta** | „Marta was behind the bar … with a rhythm that **never paused**.“ Die Negation des Rhythmus wird fälschlich auf die Anwesenheit angewendet; `enter`, Fakten/Angebot verworfen. | **Klarer False Negative**. `narratedEvent()` betrachtet aktuell Negationswörter im gesamten zitierten Klauselbereich, auch wenn diese **nicht den Orts-/Präsenzsatz** negieren. |
| **Mage T79 – Osser** | Osser kommt heim, klopft und spricht; Bezug „**Osser’s voice**“. | Plausible Anwesenheits-/Rückkehrindizien; Genitiv und mögliche Türschwelle sauber unterscheiden, keine automatische Teleportation ins Haus. |
| **Mage T132 – laborer** | Der beobachtende **laborer** soll Osser sein, dessen belegte Rolle/Deskriptoren nicht passend eng gebunden werden. | Möglicher Aliasfehler, aber **nicht** beliebige Arbeiter im Ort zu Osser verschmelzen. Identitätsbeleg prüfen. |
| **Mage T144 – Osser** | „OSSER“ wird gerufen; die folgende ankommende Figur mit Billhook wird in späterem Satz geschildert. | Starker satzübergreifender Rückkehrbeleg; keine globale freie Pronomenauflösung als Fix. Auch Übergaben/Erinnerung werden infolge der Präsenzablehnung verworfen. |
| **Mage T247 – billhook man** | Bekannter Mann wird nur als „the man with the billhook“ bezeichnet und spricht/beobachtet. | Schwächerer Fall; Zuordnung nur bei hinreichender lokaler Eindeutigkeit und etabliertem Descriptor. |

**Direkter Codebefund .109 (`src/v4/narration_evidence.js`):** `narratedPresence()` sucht ein vorhandenes Namens-/Kurzrollentoken im **zitierten Satz** und verlangt zusätzliche Wörter; `narratedEvent()` prüft unter anderem eine pauschale Negationsliste. Dass `never paused` im Satz steht, kann die legitime Aussage „Marta was behind the bar“ fälschlich blockieren. `presenceInReply()` versucht Ersatzsätze, besitzt aber keine sichere allgemeine satzübergreifende Referenzbindung. **Es handelt sich um einen neueren möglichen Regressionspfad gegenüber .106**, nicht um einen Nachweis, dass die .107-Guardidee an sich falsch wäre.

### 6.2 Technische Priorität und enges Fixziel

**P1-Kandidat für eine gezielte technische Regression, nach Freigabe:** (a) Negations-/Unrealitätsprüfung **nur auf die tatsächlich behauptete Anwesenheit** beziehen; (b) sichere Name-/Genitiv- und bereits etablierte lokale Aliase nicht durch bloße Satzgrenzen verlieren; (c) satzübergreifenden Bezug nur bei enger, nachvollziehbarer Entitätsbindung zulassen. Die bestehende Schutzregel gegen **unbelegte** NPC-Rückkehr aus anderen Orten bleibt erhalten. Insbesondere echte Negation („Marta was not here“), Drohung, Plan, Hörensagen, gleichnamige andere Figur und unsicherer Türschwellen-/Innenraumbezug müssen **weiter abgelehnt** werden.

**Negativkontrollen und Folgewirkung:** Die fünf Originalantworten jeweils mit originalem vorherigem `state` auf .106 und .109 testen, die bislang funktionierenden .107–.109-Negativregressionen unverändert grün halten; **kein** Austausch der Guard gegen bloß wachsende Bewegungs-/Wortlisten und kein generell ungeprüftes `scene.entered`. Bei akzeptierter Anwesenheit müssen abhängige Fakten/Gaben/Angebote korrekt zugeordnet werden; bei verweigerter Anwesenheit dürfen keine unberechtigten Folgeereignisse gebucht werden. Vor Implementierung Mindestkontext, exakten Quote-Umfang und Priorität mit Sols Vollreview abgleichen.

### 6.3 Weitere Abgrenzungen

- **Dungeon**: Die fünf `dungeon_foe`-Ablehnungen bleiben in Sols Sonde bestehen, sind aber nicht alle dieselbe Narrator-Erfindung: etwa Warrior T78 mit bekanntem Engine-Ref und T91 mit parallelem gültigen Queen-Slot. **Keine pauschale Öffnung für neue Dungeonfeinde**; Slotbezug, Etage, Materialisierung, Doppelbezeichnung erst ursächlich auseinanderhalten.
- **Handel T206–208**: Partei-/Handlefehler und falsche Silberumrechnung im ersten Plan; spätere korrekte Transaktion für 20 cp. Kein ewiger Verkaufsblock, aber weiterhin UX-/Repairproblem.
- **Growth/Gear**: Seltenheit ist nicht Funktionsausfall. Ein echtes Rare-Passive belegt eine organische Growthstrecke; fehlende Käufe bzw. Manualversuche erlauben kein Urteil über generelle Gear-/Skilllern-Defekte. Questvariation weiter beobachten, ohne pauschale XP-Erhöhung.

**Abschluss:** Diese Errata korrigieren den bisherigen GPT-Review und ergänzen Sols Regressionsbefunde. Keine Patchnote, keine neue Designfreigabe, keine Engine-/Runner-Änderung. Es gelten weiterhin die aktuelle Statusdatei [03](../../03_AKTUELLER_PROJEKTSTAND.md) und Sols Original-Gegenreview.
