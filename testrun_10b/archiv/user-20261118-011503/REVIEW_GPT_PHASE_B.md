# GPT-Gegenreview – User05 .202, Phase B (Fortsetzung; kein Gesamtabschluss)

**18.11.2026 · Unabhängige Quellen-/Codeprüfung.** Dieser Bericht ergänzt den unveränderten [Phase-A-Review](REVIEW_GPT.md). Getestet ist Build `4.3.0-c.6.6.202`, Entwicklungs-HEAD [`6a92dcc`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6a92dcc650809eb16934a984c30ce0cf7c5cfe98). Die Originale stehen im [Phase-B-Manifest](SOURCE_MANIFEST_PHASE_B.md). Kein neuer Node-/ST-Runner-Test, keine Provideranfragen durch GPT, keine Produktänderung.

## 1. Umfang und Prüfbarkeit

| Prüffrage | Ergebnis |
|---|---|
| Fortschreibung | Dieselbe Kampagne wie Phase A. Die 15 vorigen sichtbaren Nachrichten sind unverändert; die Export-Metadaten wurden fortgeschrieben. |
| Chat | **31 sichtbare Nachrichten (I0–I30), 15 Nutzerinputs:** 2 Creation, 12 reguläre Spielzüge, 1 natives Statkommando. |
| Events | **28 von 28** exportierten Gruppen stimmen exakt mit den eingebetteten Chat-Events überein; insgesamt **243 Events**, also 153 neue gegenüber Phase A (90). |
| Phasenaufrufe | **21 neue Modellrequests:** 7 Planner, 7 Narrator, 7 Extractor; alle 21 antworteten mit `finish_reason:stop`. Zusammen mit Phase A **38**: 12 Planner / 12 Narrator / 12 Extractor / 2 Boardgenerator. |
| Extractor | Phase B: **7/7 `extract.applied`**. Dauer 9.242–44.145 ms, Median 27.192 ms. Einzelne verworfene Deltas sind keine gescheiterten Extractorläufe. |
| HUD | **2 typisierte F-HUD-Auswahlen (`mode:hud_free`)** mit tatsächlichem Planner (I23 und I27), plus eine frei eingegebene Arcane Wave (I25). **Kein natürlicher `hud_roleplay`-Test (H).** |

Die Phase-B-Chat- und Eventdateien sind **verlängerte Gesamt-Exporte**, nicht separat zu summierende Teilstücke. Der Phase-B-Completion-Mitschnitt enthält dagegen nur die 21 neuen Calls. Alle Originalbytes wurden als Git-Blobs mit Prüfsummen kontrolliert. Diese Datensicherheit ist nicht mit einer vollständigen Gameplay-Regression gleichzusetzen.

## 2. Spielablauf und tatsächliche Kampfauflösung

**I15–I18: PULSE und spontane Welt.** Beim Aufbruch zu Glimmerdeep löste die Engine in Turn 8 einen *strange*-PULSE aus (`exposure:travel`, `p=50,75 %`, `roll=5,11`, `open:true`). Der Narrator ließ Alaric tatsächlich vor der Grotte an einem seltsamen blauweißen Licht anhalten, ohne eine Entscheidung für ihn zu treffen. Auf die Spieleraktion „I continue towards it“ hin entstand der eigenständige Ort *the pulsing hollow* mit einem pulsierenden Kristallgegenstand und fortgeschriebenen Sign-Threads. Der Extractor speicherte die beobachtete Welt. **Die Unterbrechung ist ein regelgerechter PULSE-Stopp, keine nachgewiesene Störung.**

**I19–I22: Dungeon-Eintritt und erste Gegner.** Nach der Entscheidung, das Licht zu ignorieren und zur Grotte zu gehen, buchte die Engine unmittelbar den Raum `loc.glimmerdeep_grotto.l1_s1` (*grotto mouth*, `dungeon.part`), ohne einen separaten manuellen Enter-Dialog. Der Text beschreibt das sichtbare Innere, aber nicht zweifelsfrei, dass Alaric die Schwelle überschreitet. Beim folgenden ausdrücklichen Hineingehen nach innen wurde Raum 2 (*quartz chamber*) gebucht und die erste Dungeon-Slotpopulation mit **vier Crystal Beetles, Level 2/1/4/3**, eingeführt. Die vier waren bereits vor dem Angriff sichtbar und als Ziele grundsätzlich verfügbar. Ein vom Extractor erzeugter unabhängiger Seitenpassage-Vorschlag wurde durch `dungeon_way` abgelehnt; **kein Verlust der eigentlichen Raum-/Gegnerbuchung**.

**I23 – Flame Lance über F-HUD.** Die Nachricht enthält ein vollständiges `extra.avereth_action_input` mit Auswahl `mage.flame_lance`, Monster-ID B und `mode:hud_free`. Der physische Planner lieferte dieselbe Fähigkeit/Zielbindung; die Engine erzielte **44 Magieschaden, Crystal Beetle B mit 24 HP tot**, First Strike ohne Ambush. Nach den gegnerischen Zügen: **HP 80→54, MP 72→56**. Kein doppelter Angriff oder zweite Belastung.

**I25 – Arcane Wave über frei formulierte Eingabe.** Der Planner erkennt den Angriff auf das **ENGAGED**-Band; die Engine findet bei genau einem passenden gegnerischen Band selbst einen Referenzgegner. **A/C/D erhalten 27/22/26 Schaden**, danach weitere Käferangriffe. **HP 54→28, MP 56→42**. Keine Regeländerung durch die UI.

**I27 – Arcane Wave über F-HUD.** Die Auswahl zielt intern auf Beetle A; die Engine verwendet dessen Entfernung als Band und trifft **A/C/D mit 27/24/23 Schaden**. Alle drei sterben, Begegnung endet. **600 XP** (B 60 / A 120 / C 240 / D 180), acht F-Rank-Chitinplatten als automatisches Loot. MP **42→28**. Der Spieler steigt **Level 1→4** (drei Level-Ups mit je 5 freien Punkten, keine neuen Favored-Boni). Direkt nach Kampf **28/95 HP und 28/72 MP** (kein automatischer Heal). I29/I30: natives `#assign int 5 wil 5 vit 2 agi 3` vergibt alle 15 Punkte an INT11/WIL11/VIT7/AGI8; hierfür keine weitere Modellanfrage.

**Kampfbewertung:** Die beiden gewählten HUD-Aktionen funktionieren im F-Modus und benutzen die vorhandene Mechanik korrekt. Beide AoE-Wellen treffen die vollständige relevante Zielgruppe, nicht bloß den angeklickten Gegner. Keine belegte Doppelbuchung, unplausible XP-Gutschrift oder falsche Ressourcenausgabe. **Das ist ein positiver natürlicher Mechaniknachweis – nicht der Nachweis des plannerfreien H-Modus.**

## 3. Chronologisches spontanes Nutzerfeedback B1–B7

Die Formulierungen im Original bleiben [hier](originals/phase_b_user_feedback.txt) unverändert. [Einordnungstabelle](USER_FEEDBACK_PHASE_B_REVIEW.md).

**B1 – Reiseunterbrechung:** Der Stopp war der bewusste *strange*-PULSE. Der Nutzer hatte den PULSE-Einfluss der alten Engine noch nicht persönlich getestet. Keine Beseitigung der PULSE-Begegnungen empfehlen; genau solche autonomen Weltimpulse beleben das freie RPG, sofern sie dem Spieler eine echte Entscheidung lassen.

**B2 – Unmittelbares Grotto-Enter:** Der separate Einstiegsprompt entfiel faktisch, und der Dungeonraum wurde tatsächlich gebucht. Der Nutzer sieht darin einen möglichen Gewinn durch geringere Formalität. Wegen der mehrdeutigen Grenzübertrittserzählung ist die **Agency-Grenze noch offen**: Soll „ich gehe zur Grotte“ gewöhnlich „ich trete ein“ umfassen oder lediglich „ich erreiche den Eingang“? Kein neuer strenger Guard aus dem Einzelbeleg; zunächst natürliches Verhalten beobachten und später bewusst festlegen. Der Lauf ist **kein Beleg für einen bereits implementierten allgemeinen Ortsumbau** in .202.

**B3 – Welt-HUD erst nach Extractor:** Combatzahlen sind von der Engine schon beim Turn festgelegt; frei erzählte Personen, Gegenstände, Orte und Threads existieren dagegen zunächst nur im Narratortext. Das bestehende System benötigt Extractor-Interpretation, Prüfung und Speicherung, bevor der World-HUD sie als kanonisch gesichert ausweisen darf. **9,2–44,1 s Extractorzeit** erklären hier die gefühlte Verzögerung. Schnelle **vorläufige** Anzeige oder weniger aufwendige Extraktion sind prüfbar; ein sofortiges ungeprüftes Commit wäre eine weitergehende Risikoentscheidung und keine einfache UI-Maßnahme.

**B4 – AoE-Bänder statt einzelne Ziele:** Arcane Wave ist ein *target_band*-Skill; die gewählte Monster-ID ist nur der technische Anker für ENGAGED/SHORT/MEDIUM. Daher sind **Bandauswahl mit nur gültigen Entfernungen und realistischer Treffervorschau** die sinnvollere UI. Bestehende Reichweiten-, Friendly-/Neutral-, Positions- und Bewegungsregeln müssen gelten; keine neue Schadensmechanik.

**B5 – Rohe Monster-IDs:** [Screenshot der Precombat-Zielliste](screenshots/precombat_target_ids.png) zeigt `mon.glimmerdeep_grotto_c1_l1_e1_*`. In [`availableActions()`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6a92dcc650809eb16934a984c30ce0cf7c5cfe98/avereth-engine/src/action_input.js#L104-L115) gilt derzeit `encounter.label || entity.name || id`. Namenlose Kreaturen haben vor Kampfbeginn noch kein Encounter-Label, obwohl `sceneHandle()` bereits stabile Spielerbezeichnungen **Crystal Beetle A/B/C/D** liefert. Während des Kampfes sind Encounter-Labels vorhanden, daher werden später schöne Namen angezeigt. **Eng begrenztes Projektion-/UX-Problem, keine notwendige neue ID-Architektur.**

**B6 – H/F-Dropdown und Spielersteuerung:** [Screenshot der Moduswahl](screenshots/action_mode_FH.png) und das Feedback zeigen verständliche Verwirrung. Der Nutzer schlägt ein optional leeres RP-Eingabefeld und einen separaten taktischen „Senden“-Button vor. Das ist als UI-Prototyp sinnvoll. Technisch darf daraus **keine zweite unabhängige ST-Sende-/Save-Pipeline** entstehen: HUD und normale Texteingabe müssen weiterhin genau eine Spielerhandlung und dieselbe Spielhistorie erzeugen. Freies Rollenspiel darf bleiben. H sollte bewusst gewählt, aber nicht mit weiteren Pflichtmenüs überfrachtet werden.

**B7 – AoE-Auflösung gelungen, Labels später korrekt:** Die Engine traf wie gewünscht auch nicht angeklickte Käfer desselben Bandes. Die späteren Anzeigen benannten A/B/C/D korrekt. Diese positive Beobachtung nicht durch unnötige AoE-Kampfänderungen gefährden.

## 4. Zusätzliche, quellenbelegte Befunde

**Nord-/West-Widerspruch bleibt real:** Glimmerdeep liegt laut `content` **nördlich** von Glassmere. Die Guild-Clerk-Auskunft in Phase A bezeichnete es **westlich**, und der Narrator erzählt I16 erneut den westlichen Quarry Road. Die falsche Wegbeschreibung wurde bereits in `quest.detailed` vermerkt. Korrekte Ziel-ID und später erreichte Grotte **beheben nicht automatisch** die narrativ persistierte Richtungsinkonsistenz. Dies bleibt ein Gameplay-/Kontinuitätsbefund, den wir ohne pauschale Ortsguards später fokussiert betrachten sollten.

**Einzeldelta-Ablehnungen sind nicht vollständige Extractorfehler:** In I20 wird eine freie Dungeonpassage mit `dungeon_way` abgelehnt, in I24 drei Kampfbands-/Position-Deltas mit `world_rule` (Positionen während ACTIVE Combat engine-eigen). Der alte I8-Identitätsschutz lehnte eine falsch adressierte `learn`-Delta ab. **Insgesamt fünf verworfene Einzeldeltas**, aber alle zwölf regulären Weltabschlüsse im Gesamtexport `extract.applied`. Kein belegter Provider-429/Timeout im aktuellen 38-Request-Korpus.

**Quest- und Balancestand:** Das Töten des ersten Beetle-Slots ist **kein Floor-Clear**. Der Auftrag bleibt „active / not ready“ und es wurde keine 90-cp-Gildenbelohnung gebucht. Der Levelaufstieg ist regelkonform (pro Level +5 freie Punkte). Die spätere Statverteilung ist nicht mit einer Heilung zu verwechseln.

## 5. Vorläufige Prioritäten und Testgrenzen

| Empfehlung | Begründung | Status |
|---|---|---|
| Combat-Aktionsauswahl nur im sinnvollen taktischen Kontext, idealerweise im vorhandenen Combat-HUD | Nutzerfeedback U1/U2 + B4–B7, schon vorhandene Buttons/Labels | **Designrichtung positiv**, noch keine UI-Freigabe |
| AoE-Ziele als gültige Range-Bands, Gegner mit Namen auch vor Kampfbeginn | Technisch konkreter, lokaler UX-Kandidat | **Nach Gesamtlauf gezielt planen** |
| Einfacher, optionaler RP-Text und deutliches HUD-Senden | Benutzerführung, aber ein einziger ST-Send-/Savevertrag | **Prototypenvergleich**, nicht zwei Speicherwege |
| World-HUD-Latenz ehrlich anzeigen und ggf. reduzieren | Extractor benötigt Zeit für kanonische World-Daten | **Keine unbestätigte Weltbuchung** |
| Richtungs-/Agency-Grenze, Board-Doppeldarstellung aus A | Spielerlebnis-/Kontinuitätsthemen über Combat hinaus | **Mit Phase C/Gesamtreview entscheiden** |

**Noch ausstehend:** Natürlicher H-Modus *ohne Planner* mit optionaler NPC-/Party-Reaktion, Defense/Movement/Heilitem, vollständige Glimmerdeep-Quest, Swipe/Reload und weitere gefühlte Spielflussbewertung. Der Nutzer spielt weiter. Bis dahin **keine Produktänderung, kein Merge, kein Astra-Gegenreview über einen vermeintlich abgeschlossenen Run**. Astra soll erst nach dem vollständigen Nutzerlauf unabhängig die gesamte Review/Originalbasis prüfen.