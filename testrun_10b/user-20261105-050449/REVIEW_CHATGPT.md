# User-Testrun 02 – unabhängiger GPT-Gegenreview zu .157

**05.11.2026 · persönliche natürliche GLM-Spielprobe; nur Analyse, keine Implementierung.** Quellen: [Originalchat](originals/chat.jsonl), [Eventexport](originals/events.json), [chronologisches Spielerfeedback](originals/user_feedback.txt), [Sols während des angefangenen Reviews entstandene Notizen](originals/SOL_THINKING_NOTES.md) und die vom Spieler gelieferte, hier **nicht in Git** archivierte [Serverlog-Auswertung](HOST_LOG_AUDIT.md). Dies ist eine eigenständige GPT-Bewertung; Sols Notizen sind **Vorbefunde**, kein abgeschlossenes Sol-Review. Ausgangsbuild: **4.3.0-c.6.6.157 / b31123f**.

**Indexkonvention:** I bezeichnet `i` im Eventexport, beginnend mit der ersten sichtbaren Assistenznachricht bei I0; die vorangestellte JSONL-Metadatenzeile zählt nicht. T bezeichnet `turn.begun`, **nicht** die Zahl der User- oder Assistant-Nachrichten. Alle Aussagen über .157 beziehen sich auf diesen Lauf, nicht auf eine allgemeine Bestehensquote.

## 1. Quellen, Umfang und Nachweisgrenzen

- Originalchat: **75 sichtbare Nachrichten**, davon **37 Spielereingaben** (einschließlich Mage-Erstellung, #assign und sonstiger Systeminteraktionen) und **38 Assistentenantworten**. **34** `turn.begun`, **32 angewandte Extraktionen** (davon **10 `repaired:true`**), **26 interpretierte Kommandogruppen** (davon **5 `json_repaired`**). Der Lauf endet manuell nach neuem Gildenboard, nicht an einem tödlichen oder technischen Abbruch.
- Eventexport: **69 Recordgruppen, 609 Einzelereignisse**, sämtlich Build .157. Der direkte Strukturvergleich mit den Eventarrays des Originalchats ergibt **69/69 identisch**. Das beweist Exportkonsistenz, aber **keine** unabhängige Ausführung von `foldChat()` und `validateState()` gegen den Produktcode; diese zusätzliche Prüfung bleibt für Sol offen. Die 28 `delta.rejected` sind unterschiedlich begründete Sicherheits-/Kontinuitätsablehnungen, nicht 28 gleichartige technische Fehlschläge.
- Natürliche Abfolge: Mage L1→L7, Guild-Registrierung für 20 cp, Glimmerdeep-Ebene 1 mit Beetles, Slimes und Queen geräumt, Abschlussabgabe mit **90 cp**, zweimalige Dungeonrast, Verkauf mehrerer Beutegruppen und zweiter Boardbesuch. Die echten Bewegungs-, Quest- und Handelsbuchungen stehen im Eventexport; narrative Beschreibungen sind davon zu unterscheiden.
- Originaler Windows-/PowerShell-Serverlog: **14.118.044 Bytes, UTF-16LE**. Er wurde für diese Bewertung als zusätzliche Originalquelle herangezogen, aber wegen Umfangs nicht in den Git-Baum aufgenommen. Sols Notizen berichten die erfolgreiche Rekonstruktion aller Recordzustände, die gesamte Abdeckung der 32 Assistant-Extractor-Züge und fehlende NPC-Karten in einzelnen tatsächlichen Requests. **Diese spezifischen Sol-Code-/Requestrekonstruktionen sind noch kein unabhängig wiederholter GPT-Foldbeweis.**
- **Geld:** Start 50 cp → Registrierung -20 → Quest +90 → Getränke -4 → Nacht -5 → Verkauf +169 = **280 cp**. Jede dieser fünf `coin.changed`-Buchungen ist im Original vorhanden und der Zwischenstand konsistent. Der unten beschriebene Angebotsrechenfehler ist **kein** belegter doppelter Geldabfluss.
- Einzelheiten zur Beweisbasis und SHA-256 in [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md); sämtliche Originalformulierungen des Spielerfeedbacks bleiben unverändert in `originals/user_feedback.txt`. Die Zuordnung aller 16 Feedbackpunkte steht getrennt in [USER_FEEDBACK_REVIEW.md](USER_FEEDBACK_REVIEW.md).

## 2. Chronologische Schlüsselszenen

| Eventindizes | Natürliche Spielerabsicht | Engine und Erzählung |
|---|---|---|
| **I5–I14** | Gilde betreten, Tam Ostler kennenlernen, registrieren, Getränkezusage machen, Grotto-Auftrag nehmen | Registrierung, 20-cp-Gebühr, Gildenplatte und Questannahme korrekt; die Getränkezusage wird als Erinnerung **Wichtigkeit 6** gespeichert. |
| **I17–I34** | Ebene 1 erkunden, Beetles/Slimes bekämpfen, zweimal bewusst schleichen | GO mit `manner: stealth` bei I27/I29, tatsächliche Enginebewegung, relevante Awareness; Kampf-/Lootbuchungen bleiben vorhanden. System zeigt nicht bei jeder Etappe alle möglichen Beweisfälle für UI/U3. |
| **I35–I40** | Zwei Stunden rasten, Queen angreifen, danach zurückweichen und erneut Flame Lance | Rast und erste Angriffsaktion gebucht, Queen regelkonform besiegt, L7 und Level-1-Clear. First Strike verbraucht Alarics erste Rundenaktion (siehe §4). |
| **I43–I48** | Queen-Kammer untersuchen, dann bewusst nach Ebene 2 schleichend weiter | Raumsuche wird vorzeitig mit `looted already` beendet; anschließend wird eine im Kanon nicht existierende Ebene 2 **erzählt**. Neue Räume erhalten mechanisch Ebene 1, Gegner der Phantom-Etage werden abgelehnt. |
| **I49–I54** | Dungeon verlassen, Gilde erreichen und Quest abgeben | Erster Rückweg wird nur erzählt; kein `scene.moved`. Zweiter ausdrücklicher GO bewirkt Ankunft; Gildenabschluss +90 cp funktioniert. Tam erinnert eigenständig an Getränkezusage. |
| **I55–I64** | Tam folgen, Getränke, Gespräch, Gasthaus, Übernachtung, Frühstück | NPC-geführter Ortswechsel zuerst verweigert, Bess nennt 4 cp, erzählt Zahlung vor Enginezahlung; tatsächliche Zahlung im nächsten Zug; nur 5-cp-Zimmerangebot gespeichert; Frühstück fälschlich als `rest` interpretiert, Gildenreise trotzdem autorisiert. |
| **I65–I74** | Tams Vermittlung an Broker nutzen, Beute schätzen und verkaufen, Board ansehen | Frühzeitige Sell-Rückfrage; Tam hält sein persönliches Versprechen in der Erzählung ein, aber erster Hinterzimmerwechsel und erster Broker-Preisvorschlag werden abgelehnt. Zweites bestätigtes Gesamtangebot 169 cp wird korrekt gebucht, obwohl seine Einzelpreise 199 cp ergeben. |

## 3. Bestätigte technische und narrative Befunde

### A. P1 – Nicht existente zweite Dungeonetage wird als erreichbare Welt etabliert (I45–I48)

**[B] Der Ausgangsinhalt von Glimmerdeep definiert nur Ebene 1.** Das steht bereits in `campaign.started` bei den kanonischen Dungeon-Leveln. Der Spieler fragt explizit nach dem Weg zu Level 2. Statt eine nicht etablierte Ebene zu klären/abzulehnen, erzählt der Narrator einen Weg nach unten. Bei I46 erzeugt die Engine `...level_2_long_gallery`, versetzt den Spieler in diesen Raum und aktualisiert dessen `level` anschließend auf **1**. Bei I48 entsteht ein weiterer Raum `pool_chamber_past_the_crystal_fall`, ebenfalls Level 1; zwei neu erzählte „mineral-crusted beetles“ werden als `dungeon_foe` verworfen, weil sie zu keinem Engine-Slot des bestehenden Levels gehören. Ein benannter weiterer Weg kann dennoch **Level 2** als Eigenschaft tragen. Das World-HUD zeigt die mechanisch gespeicherte Ebene 1, die Erzählung spricht von Ebene 2, die Targetliste zeigt die unautorisierten Tiere nicht.

**[B] Das Problem ist nicht als HUD-CSS-Fehler zu behandeln.** Der Spieler hat keine falsche Bedienung vorgenommen; sein natürliches Verlangen nach dem nächsten Dungeonlevel war nachvollziehbar. In der Engine fehlt an der Systemgrenze eine konsistente Entscheidung über den weiteren Weg: Was ist an genau diesem Dungeon tatsächlich erreichbar, darf der Erzähler einen neuen Floor etablieren, und wie bleiben Raum-/Link-/Encounter-Autorität kohärent? **Sols unvollendete Notiz stimmt mit den Originalevents überein.** [H] Die genaue früheste fehlende Schranke (Planner-Kontext, Narratorvertrag, Passage-Klassifikation oder Gate) sollte Sol anhand aktueller .157-Codepfade entscheiden; nicht vorschnell allein `levelVia` ändern.

**Priorität P1 – Integritäts- und Spielerlebnisproblem.** Kein sofortiges neues mehrstöckiges Dungeonfeature aus diesem Befund ableiten.

### B. P2 – Erster vollständiger Dungeonexit nur erzählt, nicht gebucht (I49–I52)

**[B]** I49 enthält autorisiertes GO zur Dungeonwurzel; I50 erzählt bereits den ganzen Weg bis vor die Gildenhalle und bucht sogar erzählte Reisezeit, aber **kein `scene.moved`**. Erst I51–I52 („exit the dungeon and go back to the guild hall“) erzeugt die tatsächliche Szene an der Gilde. Mechanische und erzählte Position waren zwischenzeitlich widersprüchlich. Der zweite Befehl ist eine sichere Fortsetzung, kein formaler State-Crash. **Testen:** GO zur Dungeonwurzel, bereits bekannter Rückweg, Erzählerreichweite/Teilziel, Passagevalidierung und eine eindeutige Korrekturmeldung für nicht gebuchte Ankunft; die .156-S1-Sneak-Erweiterung muss geschützt bleiben.

### C. P2 – Kammer durchsuchen wird mit Leichenloot gleichgesetzt (I43–I44)

**[B]** Der Planner versteht die Eingabe ausdrücklich als `activity.search` mit Ziel **„the chamber for loot, hidden things or other stuff“**. `cmd.resolved` trägt trotzdem `reason: looted already`; **keine Suchprobe, keine Suchzeit**. In `src/v4/commands.js` kann ein breites LOOT-Wortmuster eine Suche vorzeitig beenden, sobald besiegte Gegner bereits automatisch geplündert wurden. Hier wollte Alaric den **Raum** untersuchen, nicht dieselbe Queen erneut looten. **Enger Fixkandidat:** Suchgegenstand/Kontext differenzieren, bestehende Auto-Corpse-Loot- und Repeat-Search-Guards bewahren. **Nicht** mit neuer Treasure-Generierung verwechseln.

### D. P2 – NPC-geführte Nebenraumwechsel: prose-only und blockierte Folgefakten (I55–I56, I67–I70)

**[B]** Tam führt den PC erzählerisch ohne eigenständiges GO des Spielers in den Schankraum (I56); World lehnt `arrive` als `no_go` und anschließend abhängige Fakten als `scene_context` ab. Später (I68) beschreibt Tam seine versprochene Begleitung in den Broker-Hinterraum; auch dieser `arrive` und acht Folgedeltas werden verworfen. Bei I70 kann Marda dann im **weiterhin aktuellen Gildenhallenkontext** als Person/Bieterin erscheinen. Die Engine erfindet also keine verbuchte Teleportation, während die Erzählung bereits weitere Räume voraussetzt. Der Schutz der Spielerbewegungsautorität ist sinnvoll; die Interaktion braucht aber entweder eine saubere zulässige Begleitung/GO-Semantik oder eine Erzählung ohne vorgetäuschten Ortswechsel.

**Zusatz:** I68 enthält als Folge eines ohnehin verworfenen Angebots für „four silver“ **400 cp** und „eight silver“ **800 cp** als Extractorwerte. Diese wurden **nicht** bezahlt oder persistiert; die Ursache der fehlerhaften Währungsableitung ist höchstens ein separater Regressionstest. Keine Buchungspanik und kein Anlass für einen allgemeinen Shop-Umbau.

### E. P2/P3 – Natürliche Geschäfts- und Tagesaktionen werden nicht immer richtig aufgefasst

- **I57–I59 Getränke:** Bess nennt **4 cp für zwei Getränke**; das Angebot wird angelegt, dann in I59 ausdrücklich angenommen und **einmalig -4 cp** gebucht. Der Narrator hatte die Bezahlung bei I58 bereits erzählt; der persönliche Drink-Thread wird ebenfalls in I58 als erfüllt markiert, obwohl die Enginezahlungsbuchung noch ausstand. Story/Trade/Thread sollten zeitlich sauberer zusammenpassen; **kein** belegter vergessener Preis oder Doppelgeld.
- **I60–I63 Unterkunft:** Die Wirtin bietet „5 cp Zimmer“, „7 cp mit warmem Abendessen“ und „2 cp zusätzlich Bad“ als alternative/zusätzliche Preise an. Die Engine hat nur die Zimmerposition zu 5 cp (Frühstück eingeschlossen) als bindendes Angebot übernommen; kein Beleg, dass alle drei Optionen gleichzeitig gebucht wurden. Das Spielerfeedback ist Bedienungsfrust, nicht automatisch ein Anspruch auf eine gebündelte Transaktion ohne Zustimmung.
- **I63 Frühstück:** Planner erzeugt `activity.rest` und fragt nach Dauer, während der Spieler „eat breakfast and then go to the guild hall“ meint. Die echte GO-Reise wird trotzdem korrekt autorisiert und danach gebucht. Ein kleiner falscher Verb-/Kontextklassifikationsfall; kein vollständiger Turnstopper.
- **I65–I68 Vermittlung:** „take you up on that offer of selling to the guild“ wird zur Frage nach den zu verkaufenden Objekten, obwohl Tam zuvor angeboten hatte, den Spieler persönlich zum Broker zu führen. Die Clarify ist wirtschaftlich sicher, ignoriert aber die kommunikative Zielhandlung. Nach der Antwort erinnert Tam sich an sein Versprechen und erfüllt es erzählerisch. Dies zeigt sowohl **funktionierendes Recall** als auch ungeschicktes Planner-/Conversation-Mapping.

### F. Narrative Recheninkonsistenz, **kein belegter Finanz-Enginefehler** (I68, I70–I72)

**[B]** Mardas bei I70 einzeln genannte Preise ergeben **6 × 6 + 2 × 20 + 3 × 1 + 40 + 80 = 199 cp**. Der Erzähler nennt dennoch **1 Gold 6 Silber 9 Kupfer = 169 cp**. Der Extractor erstellt ein **bindendes Gesamtgebot über 169 cp**, dessen fünf Zeilen keine gesondert verbindlichen Positionspreise besitzen. Alaric nimmt ausdrücklich das gesamte Gebot an; die Engine transferiert die fünf Positionen einmal und bucht **+169 cp**, Endstand 280. Das ist nach der beschlossenen S2-Endpreisregel **mechanisch korrekt**. **Sols Notiz korrigiert die frühere Überpriorisierung zu Recht:** Kein neues Finanzparserprojekt aus dieser Szene; allenfalls gezielte Prüfung der Erzähler-Summierung/Promptklarheit als P3-QoL, ohne automatisch den verbindlichen Preis zu überschreiben.

### G. Kampf: First Strike vs. Initiative nicht verwechseln (I37–I40)

**[B]** Die Queen war `aware`. Alaric eröffnete den Kampf mit Flame Lance und erhielt **First Strike ohne Ambushbonus**. Laut Kampflog und dem .157-Kampfvertrag ist das seine Aktion von Runde 1. Die Queen (höhere Initiative) kommt danach in Runde 1 und wieder zu Beginn von Runde 2 **vor** Alarics zweiter Aktion dran. Ihre Positionsänderungen begleiten regelgerechte Annäherung/Angriff, nicht zwei Extra-Moves in demselben Zug. **Kein bestätigter Mechanikfehler.** Möglicher UI-/Narratorhinweis zur Rundenreihenfolge.

**Davon getrennte Designfrage:** AWARE-Gegner, auch mindless Gruppen, greifen im Spiel zu selten initiativ an; wer selbst die erste offensichtliche Attacke ausführt, erhält wiederholt First Strike. Das ist nicht durch eine falsche Round-Order bewiesen und nicht allein durch Entfernen von First Strike gelöst. Aggression/Verhalten/Encounter-Startmechanik **erst fachlich planen**; Wahrnehmung ist nicht dasselbe wie Angriffswille.

## 4. NPC-Befunde: Tam als Positiv- und Negativkontrolle für Brenna

**[B] Positive Kontinuität:** Bei I11–I12 wird die Getränkezusage mit Wichtigkeit 6 gespeichert. Beim Turn-in I53–I54 erinnert Tam sich **ohne Spielererinnerung** an den Drink und macht ihn zum Gegenstand der Szene. Bei I57–I58 folgt der Rat, später über ihn den Gildenbroker aufzusuchen; bei I63–I64 erinnert er beim nächsten Morgen wieder an Gildenboard und Glands. I67–I68 greift Tam das Broker-Versprechen auf. Die Figur bleibt als `npc.npcguild_clerk` gleich; es gibt keinen nachgewiesenen Identitätsreset.

**[B] Grenzen:** I56 und I68 verlieren aufgrund nicht gebuchter NPC-geführter Ortswechsel ihre abhängigen Fakten; Gesprächsfortsetzungen können dadurch formal nur unvollständig gespeichert werden. **[Vorläufiger Logbefund Sol]** Einzelne Tam-NPC-Karten und Erinnerungsabschnitte wurden trotz existierender Daten nicht jedem Narrator-Request mitgegeben. Das passt zu Claudes Brenna-Kontextdiagnose, wird aber als neue **testbezogene Hypothese/Reviewnotiz** gekennzeichnet, solange die Requests dafür nicht erneut einzeln belegt sind. Tams später korrektes Erinnern beweist **nicht**, dass alle benötigten Persönlichkeits- und Gesprächsinformationen jederzeit geliefert oder beachtet werden.

**E0/E1-Konsequenz:** Für jeden relevanten NPC-Moment unterscheiden: (a) wahrgenommen/erzählt, (b) **überhaupt akzeptiert/persistiert**, (c) als NPC-Karte/Recall dem Narrator **tatsächlich geliefert**, (d) in seiner Antwort **plausibel verwendet**. Dies erweitert die Brenna-Diagnose sinnvoll, **ohne** ein zweites Gedächtnissystem als Erstmaßnahme zu fordern. Persönlichkeit, Temperament, Beziehungswerte und ein mögliches `#npc pin` bleiben gesonderte Designfragen, nicht Teil der bloßen Fehlerdiagnose.

## 5. Spielerlebnis und zukünftige Designkandidaten

- **UI-Verbesserung erreicht:** Spieler bewertet neues Questboard-CSS positiv; der ausgeklappte „Contract Details“-Text wiederholt für ihn zu viel Narrator-/Questinformation. **Nur bei tatsächlicher UX-Iteration** prüfen, was standardmäßig offen ist; wichtiges Gefahren-/Levelwissen oben lassen.
- **Optionale Buttons später:** Questtitel/Shopangebote sollen ggf. einen **editierbaren natürlichen Formulierungsvorschlag** („i take … and register …“) bereitstellen, **keine** direkte stille Enginebuchung und keine neue Zwangsmenüführung. Spieler stellt dies ausdrücklich als spätere Idee dar.
- **Rasten gefährlicher machen:** Zwei lange Dungeonrasten waren unbehelligt; Heil-/Manatränke verlieren dadurch einen Teil des Nutzens. **PULSE ist noch nicht implementiert und löst Rastgefahr nicht automatisch**: sichere/unsichere Rest-/Sleep-Unterbrechung bleibt eigenständige spätere W7-/Designentscheidung. Nicht mitten in NPC E1 improvisieren.
- **Exploration und Loot:** Wunsch nach glaubwürdigen Funden, seltener Eliten-/Minibossbeute, vielleicht Skillstones/höherem Rang. **Noch keine Drop-Quote, Rangsprungchance, Lootbox oder Zufallstabellen freigegeben.** Zuerst Suchfehler (§3C) trennen; erkundete Chamber-Objekte und UI-Ground-List sind andere Mechaniken.
- **Tam weiß zu viel?** Die genaue Menge der Glands in seiner Beratung ist im Erzählkontext plausibel ableitbar, aber nicht zweifelsfrei von ihm beobachtet. Spieler wünscht zurückhaltendere NPC-Aussagen zu seinem gesamten Tascheninhalt. Wissensgrenzen prüfen, keine voreilige „Geheimnis-Leak“-Klassifikation.
- **World-HUD und Targetliste:** Die Darstellung reagiert auf Engine-Level 1; dadurch wurde die falsche Etage besonders sichtbar. Dieser Fall ist primär **World-/Dungeon-Konsistenz**, nicht eine Rücknahme des .157-UI-Pakets.
- **Noch nicht natürlich abgenommen:** Die automatische Band-AoE-Auswahl **ohne** explizites Band/Ziel und der tatsächliche TAKE von neu als Bodenfund präsentierten Objekten wurden in diesem Run nicht gezielt geprüft; Teststatus dafür offen lassen.

## 6. Sols unvollendete Denk-/Arbeitsnotizen – Einordnung

Das Original ist [hier unverändert archiviert](originals/SOL_THINKING_NOTES.md). **Kein fertiger Gegenreview; nicht als unabhängige Vollabnahme zitieren.**

| Notiz | Bewertung anhand dieses Originalruns |
|---|---|
| Glimmerdeep hat nur eine kanonische Ebene; zweite erzählt, Räume Level 1, Gegner abgelehnt | **Bestätigt** durch Kampagnenstart und I46/I48. Der Hauptrisikobefund dieses Runs. |
| First Strike ist Alarics Aktion Runde 1; Queen beginnt Runde 2 vor ihm | **Bestätigt** durch Kampflog/Regelpfad; kein zusätzlicher Monsterzug. |
| Verkäufer nennt 169 cp trotz 199-cp-Einzelpreisen; nach S2-Endpreisregel Enginebuchung korrekt | **Bestätigt**; narrativer Rechenfehler, kein neuer Parserzwang. |
| 32/32 Erzählerantworten mit `extract.applied`, teils Recovery | **Bestätigt** durch 32 Extractions und 10 Repairs. Vollständiger Zustandsvalidator wurde **von GPT nicht erneut ausgeführt**. |
| Kein Fold-/Validatorproblem bei Sols vorläufiger Rekonstruktion | **Nur Sols vorläufiger Bericht**; ohne dokumentierte vollständige Prüfartefakte nicht als hier unabhängig reproduzierter Code-Test formulieren. |
| Tam erinnert Drink, aber NPC-Karte fehlt teils in Requests | Erinnern **belegt**; einzelner Lieferausfall **vorläufige Logdiagnose**, spezifische Requestzuordnung für den nächsten Sol-Review sichern. |
| Frühstück/Ortswechsel sind fortsetzbar | **Bestätigt**; I63/I64 und I49–I52/ I55–I56/I67–I68; trotz Fortsetzbarkeit nicht bagatellisieren. |

## 7. Empfohlene Prioritäten und Abnahme

1. **Dungeon-Gate/Floor/World-Autorität (P1) getrennt analysieren**: Versuch zu nicht existierendem Level; keine widersprüchliche Erzählung, keine halb akzeptierten Räume und keine phantomhaften Gegner. Bestehende reale mehrstöckige Dungeons schützen; nicht als bloßen HUD-Fix behandeln.
2. **Rückweg und fokussierte Raumsuche (P2)** gezielt gegen echte Originaleingaben prüfen; zugelassene Handlungen müssen mechanisch entstehen, auch bei natürlicher Sprache und nach automatischem Corpse-Loot.
3. **Begleitete lokale Ortswechsel und NPC-Dialog-Buchung (P2)** untersuchen; kein freies Teleportieren, aber auch keine wiederholte Trennung von erzählter und mechanischer Interaktion.
4. **NPC E0/E1 fachlich planen**, sobald technische Integritätsprobleme hinreichend eingegrenzt sind; Tam als Positivkontrolle, Brenna als Negativfall, neue vierstufige Prüfung von Episode→Persistenz→Kontext→Verwendung. Keine automatische Beziehungspunktvergabe.
5. **UX-/Gameplay-Kandidaten separat und niedrig priorisiert:** First-Strike-Anstoß/Monstermotivation, Dungeonrasten, zusätzlichen Loot, Contract Details, alternative Shop-/Questbuttons, Angebote. Kein großer Technik- oder Balanceumbau aus einem Einzeltest.

**Offene Testgrenzen:** Kein neuer natürlicher .157-Langlauf durch dieses Review, kein reproduzierter kompletter foldChat-Validator, keine Browser-Screenshots, keine unabhängige vollständige Logkosten-Neuberechnung. Für einen nächsten Sol-Review die vier Ursprungsdateien plus die vorläufigen Notizen verwenden, bei Ursachenbehauptungen Code und tatsächlichen Host-Request prüfen. Sol darf Bewertungen berichtigen; weder diese GPT-Review noch sein unvollendetes Thinking gilt als automatisch richtig.

**Keine Produktänderung, keine Buildnummer, keine Patchfreigabe.**
