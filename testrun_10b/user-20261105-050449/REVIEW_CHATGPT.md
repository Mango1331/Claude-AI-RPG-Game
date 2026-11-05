# User-Testrun 02 – unabhängiger GPT-Gegenreview zu .157

**05.11.2026 · persönliche natürliche GLM-Spielprobe; nur Analyse, keine Implementierung.** Quellen: [Originalchat](originals/chat.jsonl), [Eventexport](originals/events.json), [chronologisches Spielerfeedback](originals/user_feedback.txt), [Sols während des angefangenen Reviews entstandene Notizen](originals/SOL_THINKING_NOTES.md) und die vom Spieler gelieferte, hier **nicht in Git** archivierte [Serverlog-Auswertung](HOST_LOG_AUDIT.md). Dies ist eine eigenständige GPT-Bewertung; Sols Notizen sind **Vorbefunde**, kein abgeschlossenes Sol-Review. Ausgangsbuild: **4.3.0-c.6.6.157 / b31123f**.

**Indexkonvention:** I bezeichnet `i` im Eventexport, beginnend mit der ersten sichtbaren Assistenznachricht bei I0; die vorangestellte JSONL-Metadatenzeile zählt nicht. T bezeichnet `turn.begun`, **nicht** die Zahl der User- oder Assistant-Nachrichten. Alle Aussagen über .157 beziehen sich auf diesen Lauf, nicht auf eine allgemeine Bestehensquote.

**Abgeschlossener Sol-Gegenreview:** Die ursprünglichen §§1–7 bleiben als GPT-Vorbewertung erhalten. Der [unabhängige Nachtrag §8](#8-abgeschlossener-sol-gegenreview--originalfold-requests-und-ursachenprüfung) liefert die zuvor offenen Fold-/Requestnachweise und korrigiert insbesondere den frühesten Floorfehler sowie die U3-Testeinordnung.

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

## 8. Abgeschlossener Sol-Gegenreview – Originalfold, Requests und Ursachenprüfung

**05.11.2026 · unabhängig am Produktcode `.157 / b31123ffb4d3f5c404d6add85449ea869ed415ee` geprüft.** Dokumentationsbasis: `main / 80ffe2833d425e38808d56e834ba5a5d9771b350`. Die vorstehenden §§1–7 bleiben als ursprüngliche GPT-Bewertung erhalten. Dieser Nachtrag ersetzt deren offene Sol-Nachweisgrenzen und präzisiert einzelne Befunde; die unfertigen Thinking-Notizen sind nicht seine Beweisgrundlage. Leitfäden waren [User01](../user-20261104-162404/REVIEW.md) und der tatsächlich jüngste [Batch28](../batch-20261103-171839Z/REVIEW.md). Ausführliche Mess- und Gegenprobenergebnisse: [SOL_PROBE_RESULTS.json](SOL_PROBE_RESULTS.json).

### 8.1 Tatsächlich neu geprüfte Nachweise

| Prüfung | Eigenes Ergebnis und Grenze |
|---|---|
| Vier erneut gelieferte Originale | Alle Bytes/Hashes entsprechen dem Quellenmanifest. Die Uploadsuffixe `(2)`/`(3)` kennzeichnen hier keine inhaltlich neue Runfassung. Kein zweites Archiv derselben Originale angelegt. |
| Chat gegen Eventexport | **69/69 Gruppen und 609 Events strukturell identisch**. |
| Vollständiger Produkt-Fold | **Alle 75 Chatprefixe**, darunter **69 eventtragende Prefixe**, mit `src/host.js:foldChat()` und anschließend `validateState()` geprüft: **0 Foldfehler, 0 Failures, 0 Validatorbefunde**. |
| Persistenzvergleich | JSON-serialisierter Chat neu gefaltet sowie alle Exportevents direkt mit `applyEvent()` gefaltet: gleicher Endzustand. Dies ist ein lokaler Persistenznachweis, kein neuer Windows-/ST-Speichertest. |
| Erneute World-Ausführung | **32/32 originale angewandte Extractor-Antworten** auf ihrem jeweiligen Originalvorzustand mit `replyTurnV4()` erneut ausgeführt: gleiche persistierbaren Eventarrays und Folgezustände, jeweils gültig. Verglichen wurde nach JSON-Serialisierung, also ohne nicht speicherbare `undefined`-Eigenschaften; keine fachlichen Felder ausgeblendet. |
| Tatsächliche Narrator-Requests | Alle **116 Requests und 116 Responses** aus dem vollständigen UTF-16-Serverlog als Daten rekonstruiert, ohne Logcode auszuführen. Alle **32 Narrator-Antworten** stimmen nach Rücknahme der Windows-Zeichenkodierungsverfälschung vollständig mit ihrem Chattext überein. |
| Kontextrekonstruktion | Auf dem Originalprefix für jeden dieser 32 Züge `turnBlock()` mit Budget 1400, Rules-Budget 800 und deaktivierter zusätzlicher Engine-Lore erzeugt: **32/32 Engineblöcke exakt identisch** zum tatsächlich gesendeten Request. Die nachfolgenden Abschnitts-/Budgetbefunde sind damit keine bloße Rekonstruktionshypothese. |
| Endzustand / Wallet | T34, Mage L7, **280 cp**; Registrierung −20, Quest +90, Getränke −4, Zimmer −5, Verkauf +169 bei Start 50 cp. Drei Siege über sieben Gegner, Level-1-Clear und einmalige Abgabe; kein technischer Terminalabbruch. |

**Formal gültig bedeutet weiterhin nicht semantisch vollständig richtig.** Insbesondere passieren unzulässige Dungeonetagen und verlorene Such-/Bewegungsabsichten den allgemeinen Validator. Der Lauf endet fortsetzbar nach dem Board, enthält aber belegte Integrationsfehler; er ist weder ein fehlerfreier Langlauf noch ein technischer Totalausfall.

### 8.2 P1 präzisiert: zwei verschiedene Floorfehler, erster Beleg bereits I28

Die Hauptbewertung aus §3A trägt. Der technische Fehler beginnt jedoch **vor I45/I46**:

1. **I28:** Ein `passage`-Delta mit `dir:"down"` erzeugt `...level_1_sloping_left_passage` bereits mit **mechanischem `level:2`**, obwohl die Living-Struktur ausschließlich `floors[1]` besitzt. Der Raumname behauptet weiterhin Level 1. Dieser Weg wird im tatsächlichen Run nicht genommen; der falsche Raum-/Etagenzustand ist dennoch schon gespeichert.
2. **I45/I46:** Die natürliche Bitte um Level 2 wird nach leerem ersten Planneroutput auf das bekannte **Level-1-Ziel `...level_1_way_on_down`** abgebildet. Der Narrator geht darüber hinaus bis zur neuen „level 2 — long gallery“. Die Extraktion enthält Ankünfte, aber keinen passenden gerichteten Abstieg in diese Galerie. Der bestehende World-Pfad erreicht den neuen Raum über das autorisierte bekannte Zwischenziel; seine ungerichtete Verbindung ergibt über `levelVia()` **Level 1**. Der Name ist keine verbindliche Etagenklassifikation. Hier entsteht also der umgekehrte Fehler: Name 2, Mechanik 1.
3. **I48:** Die Poolkammer wird ebenfalls als Level 1 gebucht. Die drei kleinen und der größere erzählte Käfer werden über **zwei Gruppen-Deltas** als `dungeon_foe` abgelehnt; die abhängige Awareness folgt als `creature_continuity`. Es fehlen vier erzählte Tiere in der Targetliste, nicht zwei einzelne Enginegegner. Zugleich legt die nächste `passage(dir:"down")` wieder einen weiteren Raum mit `level:2` an.

**Ursache im aktuellen Code:** `world.js:passage()` übergibt bei einem neuen gerichteten Raum `levelVia()` an die Ortsanlage; `levelVia()` erhöht bei `down` den Index ohne Abgleich mit den kanonischen Living-Floors. `living.js:sealRefusal()` schützt eine vorhandene Vorgängeretagen-Sperre, prüft aber nicht generell die Existenz der Ziel-Etage. Auch der allgemeine Zustandsvalidator meldet die Abweichung nicht. Fehlende Passage-Richtung führt umgekehrt im Ankunftspfad zur Übernahme der bisherigen Etage. Ein HUD- oder reiner Namensfix würde diese beiden Fälle nicht lösen.

**Kontrollierte Gegenprobe auf unverändertem Originalzustand nach I48:** Den schon bei I28 gespeicherten, offenen linken Level-2-Weg ausdrücklich als GO-Ziel gewählt und seine Ankunft strukturiert bestätigt. Der Produktcode autorisiert die Bewegung und erreicht den Raum mit **Floor 2**, **ohne Ablehnung**, bei weiterhin ausschließlich **einem** kanonischen/runseitigen Floor. `validateState()` bleibt grün. Das ist keine natürlich gespielte alternative Reise, belegt aber die fehlende fachliche Schranke auch unabhängig von einem bloß irreführenden Raumnamen. Ein zunächst betrachteter anderer Weg trägt eine echte Türbarriere; diese wurde für den Nachweis nicht entfernt oder umgangen.

**Kontext als zusätzlicher Beitrag:** Der vollständige `dungeon`-Abschnitt fehlt in den tatsächlich gesendeten Requests vor I28, I46 und I48. Vor I48 wird allerdings im verbindlichen Aktionsblock ausdrücklich geliefert: Level 1 ist cleared und es sind keine neuen Gegner zu erfinden. Der Narrator ignoriert diese vorhandene Grenze trotzdem. Somit bestehen **Budget-/Informationslücke, Modellwiderspruch und unvollständige World-Validierung nebeneinander**. Mehr Tokens allein ersetzen die Etagenprüfung nicht.

**Empfehlung:** Vor dem NPC-Produktpatch den fachlichen Dungeon-/Navigationsschnitt eingrenzen: kanonische Floor-Existenz, gerichtete Passage, GO-Ziel und tatsächliche Ankunft müssen zusammenpassen. Reale mehrstöckige Dungeons, gewöhnliche Gefällestrecken innerhalb einer Etage und freies Raum-Worldbuilding schützen. Keine neuen Etagen oder Gegner erzeugen, nur weil der Spieler danach fragt; den nicht erfüllbaren Wunsch plausibel behandeln. Keine Implementierung durch diesen Review freigegeben.

### 8.3 Exit und Raumsuche: unterschiedliche Ursachen unabhängig reproduziert

**Exit I49/I50 – Extraktionsverlust nach Recovery, keine belegte blockierte Passage.** Das GO zur Dungeonwurzel ist gültig autorisiert; der Narrator erzählt den Austritt und sogar die nicht eigens gewählte Rückreise bis zur Gilde. Im Serverlog ist Request **#73** leer und endet mit `length` nach 4000 Completion-Tokens. Repair **#74** liefert dann `expected.1.arrived:false` und lediglich 90 Minuten Zeit. Im endgültigen Report fehlt jede Ankunft; World hat hier keine vorhandene richtige Ankunft abgewiesen. Es folgen weder `scene.moved` noch ein entsprechendes `delta.rejected`.

**Gegenprobe:** Auf demselben Originalvorzustand die tatsächliche Austrittsankunft an der autorisierten Dungeonwurzel gemeldet; 90 Minuten bleiben erhalten. Ankunft gelingt ohne Ablehnung, State gültig. Das ist kein Nachweis, dass GLM mit unverändertem Prompt zuverlässig anders antwortet. Es grenzt den ursprünglichen Fehler aber vom Navigations- und Dungeonfloor-Defekt ab. Eine spätere Korrektur darf weder Ankünfte allein aus `expected` erzwingen noch die unerbetene Weiterreise zur Gilde nachträglich autorisieren. Auch eine formal erfolgreiche Kurz-Recovery kann eine zentrale Handlung verlieren.

**Search I43 – deterministischer Fokusfehler bestätigt.** Auf dem unveränderten Prefix beendet das originale strukturierte `activity.search` die Kammeruntersuchung als `looted already`. **Nur das Wort „loot“** aus `what` und Handlungszitat entfernt, denselben Kammer-/Geheimnisfokus beibehalten: Der bestehende Suchpfad führt eine PER-Probe aus, im Gegenfall d100 **72 / 53,85 %, Fehlschlag**. Eine echte Untersuchung der Queen-Überreste bleibt als Kontrolle korrekt `looted already` ohne Probe. Der Fehler liegt in `commands.js:activity()` beim breiten `LOOT_WORDS`-Vorabfilter, nicht in einem fehlenden Search-Angebot des Planners.

Das Original erhält später 15 Minuten Narrationszeit; das ersetzt keinen zugehörigen Engine-Suchcheck. Ein enger Fix soll den gewählten Suchgegenstand erhalten und automatische Leichenbeute sowie Suchwiederholungsschutz bewahren. Er garantiert keinen Fund und benötigt keinen neuen Lootgenerator.

### 8.4 NPC-Kontinuität: tatsächliche Lieferausfälle belegt, Tam bleibt Positivkontrolle

Die bisher vorläufige Tam-Requestdiagnose ist jetzt einzeln nachgewiesen. Nummern zählen die Requests im vorliegenden Originalserverlog, einschließlich Repairs; Zeilen beziehen sich auf dessen UTF-16-dekodierten Text.

| Narratorantwort | Request / Logzeile | Tatsächlich gelieferter Kontext / Bedeutung |
|---|---|---|
| I12 – Zusage entsteht | #16 / 4758 | Anwesender Clerk-Block und `RELEVANT` verworfen. Die Zusage steht aber im aktuellen Spielertext; dafür ist keine alte Erinnerung erforderlich. |
| I14 – Questannahme | #19 / 5912 | Tam-Karte mit bedeutender Getränkeerinnerung geliefert. |
| I54 – Abgabe und Drink-Recall | #79 / 26789 | Tam-Karte **und** `RELEVANT` mit ursprünglicher Zusage geliefert; Tam greift sie plausibel auf. |
| I56 – Veteranentipps | #82 / 27877 | Karte und Recall geliefert. Die nachfolgende wertvolle Gesprächserinnerung wird trotzdem wegen des unautorisierten Nebenraumwechsels verworfen. |
| I58 – Getränke/Brokerzusage | #86 / 29268 | Tam-Karte und Recall verworfen; der direkte bisherige Gesprächsverlauf steht weiterhin im Chatfenster. |
| I60 – Ende des Gesprächs/Inn | #89 / 30361 | Der gemeinsame Block für Tam/Bess und der Recall fehlen erneut. |
| I64 – Rückkehr zur Gilde | #97 / 33108 | Kein Budgetverlust des aktuellen NPC-Blocks: Alaric steht beim Request noch bei der Wirtin. Tam kommt nur über `KNOWN AT` mit Name/Rolle/Beschreibung vor, ohne volle Karte. Nicht mit den anderen Lieferausfällen vermischen. |
| I68 – Brokervermittlung | #101 / 34448 | Tam-Karte und `RELEVANT` geliefert, einschließlich der gespeicherten Zusage, ihn kostenlos zum Broker zu führen. Tam greift sie auf. |
| I70 / I72 – Preis und Verkauf | #105 / 35908; #109 / 37229 | Anwesendenblock und Recall verworfen. |
| I74 – Board | #115 / 38770 | Tam/Marda-Block und Recall verworfen; der gesamte Engineblock hat geschätzt 2075 Tokens trotz nominell 1400. Priorität 0 und eigene Budgets erklären dies. |

**Laufbezogene Messung:** `present` wird in **11 von 32** Narratorzügen verworfen; darunter **6 von 15** Zügen, bei denen vor Narration mindestens ein NPC anwesend ist. `RELEVANT` fällt in **24/32**, der jeweilige `dungeon`-Abschnitt in **21/32** weg. Diese Werte betreffen ausschließlich User02 und sind keine populationsweite Modell- oder Engineausfallquote. Gerade der verworfene Dungeonabschnitt erweitert den E0-Blick über NPC-Karten hinaus.

**Bewertung gegenüber Brenna:** Tam widerlegt weder deren belegten Fehler noch die Budgetursache. Sein erfolgreicher Recall erfolgt bei I54 mit tatsächlich gelieferter Erinnerung; andere Gesprächsstellen verlieren dieselben strukturierten Hilfen. Zugleich fehlte bei Brenna auch mit sichtbarem kurzem Chatverlauf die angemessene Modellverwendung. Karte liefern, Inhalt speichern und ihn glaubwürdig verwenden bleiben getrennte Nachweise.

Bei Tam gibt es eine hilfreiche positive Wissenskontrolle: Die Abgabe findet nach bestätigter Rückkehr bei bereits anwesendem Clerk statt. I53 bucht für ihn `knowledge.gained` zum `completed_contract` als `witnessed`. Dies trifft die ungünstige Ankunft-/Abgabe-Reihenfolge aus User01 gerade nicht und entkräftet sie deshalb nicht.

**E0/E1 bleibt sinnvoll:** kompakte Metadaten des wirklich verwendeten Kontexts, relevante Karten unter begrenztem Budget, Kürzung wiederholter Pflichttexte sowie die nachgewiesenen Fakt-/Wissensübergänge. Die beim ersten Tipsgespräch wegen `no_go` verlorene bedeutsame Erinnerung kann ein besserer Abruf später nicht wiederherstellen. Keine automatische Sympathie, keine neue Memorybank; erzählte gemeinsame Erfahrungen dürfen durch die technische Ablehnung nicht nachträglich als nie geschehen behandelt werden. Die betroffene Persistenz-/Autorisierungslücke ist zu beheben.

### 8.5 Korrekturen und zusätzliche Abgrenzungen gegenüber der GPT-Vorbewertung

**U3 ist im natürlichen Lauf bereits teilweise positiv getroffen.** Bei **I21**, der zweiten Wave gegen B/C/D, liefert der natürliche Planner tatsächlich `target:null` ohne `targets`. Der gespeicherte Mapper nennt **`target_how:"unique area band"`** und wählt Beetle B als Anker. Auf dem Originalvorzustand erneut gemappt und ausgeführt: identisches vollständiges Kampfergebnis und einmalige **14 MP** Kosten. Die pauschale Lesart „U3 gar nicht natürlich geprüft“ aus §§5/7 ist deshalb zu korrigieren. Offen bleibt eine sprachlich völlig ziel-/bandlose Eingabe: Der Spieler hatte B/C/D im Text genannt. Ebenfalls weiter offen bleibt die vollständige natürliche Bodenfund→TAKE-Kette.

**Frühstück ist kein belegter `BREAKfast`-Teilstringparserfehler.** Request **#95** liefert zunächst `activity(kind:"activity", what:"breakfast")`. Das Schema lehnt den unbekannten Aktivitätstyp ab; Repair **#96** macht daraus `kind:"rest"`. Erst darauf fragt die korrekte Rest-Validierung nach einer Dauer. Die zusätzliche GO-Aktion bleibt wirksam. Das ist ein semantischer Planner-/Repairfehler an einer gewöhnlichen Alltagshandlung; eine neue Wortliste oder ein Frühstückssystem ist daraus nicht begründet.

**Begleitung: vorhandene Bewegung funktioniert, Autorisierung fehlt im Original.** I55 und I67 enthalten jeweils keine GO-Kommandos. Der `no_go`-Schutz und die Ablehnung der danach abhängigen Fakten sind folgerichtig. Eine kontrollierte explizite Follow-GO-Autorisierung verarbeitet mit der sonst unveränderten I56-Extraktion den Nebenraumwechsel und Tam korrekt. Die dort zusätzlich behauptete bereits gekaufte Runde bleibt mangels Kaufentscheidung als Erinnerung abgewiesen. Die Gegenprobe zeigt den bestehenden zulässigen Pfad, keine Lizenz für frei erfundene PC-Folgeaktionen. Ziel einer späteren Verbesserung wäre natürliche kohärente Gesprächs-/Bewegungssemantik, nicht zusätzliche Pflicht-Mikroschritte bei jedem Dialog.

**Finanzen sind besser geschützt als allein durch den zufälligen `no_go`-Abbruch.** Beim tatsächlichen I68 bleiben 400/800 cp ungebucht. In einer isolierten Gegenprobe nur den unzulässigen Ortswechsel entfernt und die Person lokal eingeführt, Originalpreisworte und falsche cp-Zahlen aber beibehalten: Der bestehende `dealTerms()`-/Bid-Pfad erzeugt Angebote zu **40/80 cp**, protokolliert die gemeldeten 400/800 als korrigierte Werte und bucht ohne Annahme kein Geld. Die tatsächlichen **169 cp** aus I70/I71 bleiben die korrekt angenommene Endsumme trotz falscher erzählerischer Positionsrechnung. Kein neuer Finanzfix empfohlen.

**Kampf/Spielgefühl getrennt:** Queen-Initiative **14** gegen PC **13**; nach First Strike handeln ihre Runde 1 (MEDIUM→SHORT) und Runde 2 (Schließen auf ENGAGED plus 23 Schaden) vor Alarics nächster Aktion. Das ist regelkonform. Wahrnehmung allein verpflichtet ein Wesen nicht zur Aggression; zu passive Feinde und wiederholte Spielereröffnungen bleiben eine sinnvolle gesonderte Gameplayfrage. Zwei ungestörte Dungeonrasten, schwacher Explorationsanreiz und die gewünschte Trankrelevanz sind ebenfalls belastbare Spielerbeobachtungen, aber noch keine Freigabe für neue Kampf-, Drop- oder Rastregeln.

### 8.6 Kosten, Recovery, Grenzen und fachliche Konsequenz

Die **116** protokollierten Modellcalls verteilen sich auf **38 Planner-/Interpreter-, 32 Narrator-, 43 Extractor- und 3 Boardcalls**, jeweils einschließlich Repairs. Sämtliche 32 Narratorantworten enden regulär mit `stop`; **10 andere Antworten sind leer bei `length`** (3 Planner, 6 Extractor, 1 Board) und werden im Ablauf aufgefangen. **10 von 32** angewandten Extraktionen tragen `repaired:true`; diese bedeuten **11 zusätzliche Extractor-Aufrufe**, weil ein Fall zwei Nachversuche hat. Das ist erfolgreicher technischer Weiterbetrieb, keine Quote semantisch verlustfreier Reparatur. I50 liefert den konkreten Gegenbeleg.

Die selbst erneut summierten Providerwerte stimmen mit dem Hostlog-Audit überein: **1.445.034 Prompt- + 77.846 Completion-Tokens = 1.522.880 Tokens**, ausgewiesene Kosten **0,1397551 US-Dollar**. Keine neue Preisrecherche oder Abrechnungsprüfung. Für Kontextoptimierungen Inhalt/Promptumfang und Rollen getrennt messen; aus diesem Einzelrun weder pauschal Tokens erhöhen noch zusätzliche Modellprüfer ableiten.

**Gesonderte Diagnosegrenze:** Der Testhelper aktiviert einen strengeren, im Produkt standardmäßig ausgeschalteten Ownership-Assert. Ein zusätzlicher Original-Replayversuch in diesem Modus stoppt bei **I8** mit `learn wrote entities (entity.updated), which it does not own and has no gate for`. Der normale Produktpfad und die oben genannten 32 JSON-/State-Vergleiche sind davon getrennt. Keine bestandene strenge Ownership-Abnahme behauptet; den Diagnosefall separat festgehalten, ohne Produktcode oder Schutzregeln für den Review zu ändern. Er ist kein beobachteter Laufabbruch und keine nachgewiesene Zustandskorruption.

**Empfohlene nächste Reihenfolge:**

1. **P1 Dungeon-/Navigationsintegrität konkretisieren:** Floorgrenze und Passage-/Ankunftszuordnung mit I28→I48 als Originalkette; keine bloße Anzeigeänderung und kein Ersatz der festen Population durch frei erzählte Targets.
2. **P2 eng behandeln:** Kammer-/Leichen-Suchfokus und Exit-Extraktionsverlust reproduzierbar getrennt halten. Begleitete Szenen und deren abhängige Erinnerungen mit Autorisierung prüfen. Kein neuer allgemeiner Handels-/Weltumbau.
3. **NPC E0/E1 anschließend als vorgesehenes Fachpaket:** Tam als Positivkontrolle, Brenna als Negativfall; zusätzlich verworfene Dungeon-/Szenenabschnitte und bereits vor dem Recall verlorene Episoden erfassen. Die Reihenfolge ändert sich wegen belegter Technikprobleme, nicht wegen einer widerlegten NPC-Richtung.
4. **Spielerwünsche bewahren:** Board positiv; weniger doppelte Details, vorbereitende UI-Texte, aggressivere passende Gegner, Rastgefahr und interessanter Loot bleiben getrennte spätere Entscheidungen. Keine pauschale XP- oder First-Strike-Änderung.

**Prüfumfang:** Originalfolds, vollständiger Request-/Antwortabgleich, Original-World-Reproduktionen, Codeprüfung und ausdrücklich kontrollierte Gegenproben. **Keine** neu geschriebene Regression, keine erneut ausgeführte Node-Vollsuite, kein 2235er-Baselinereplay, kein neuer ST-/Browser-Smoke und kein eigener natürlicher Modelllauf. Diese sind für den reinen Review nicht als durchgeführt auszugeben. Produktbranch unverändert auf `.157`; weder Implementierung noch zusätzliche Mechanik freigegeben.
