# GPT – User05 / Action-HUD .202: unabhängiger Zwischenreview A

**18.11.2026 · Quellenprüfung des persönlichen Laufs; keine Implementierung und kein abschließendes Review.** Verbindliche Evidenz: die vier unveränderten Textoriginale in [originals](originals/), zwei Screenshots aus dem Nutzerupload, Produkttyp-/UI-Code des tatsächlich getesteten Entwicklungsstands [`.202 / 6a92dcc`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/6a92dcc650809eb16934a984c30ce0cf7c5cfe98/avereth-engine) und das [spontane Originalfeedback](originals/user_feedback.txt). Eigene Node-/ST-/Provider-Nachtests wurden **nicht** ausgeführt. Die früher gemeldeten Mockabnahmen für .202 sind gesonderte Implementierernachweise, keine Belege für natürliches Spielgefühl.

## 1. Ausgangszustand und Umfang

| Kategorie | Tatsächlich belegt |
|---|---|
| Run | User05, `.202`, GLM-5.3-Flash, persönlicher ST-1.19-Naturallauf; erster Export 18.11.2026 01:15:03 |
| Chat | 15 sichtbare Nachrichten (Greeting + 7 User + 7 Assistant; davon 2 Creation-Systempanels). JSONL mit zusätzlichem Metadatenheader |
| Mechanik | 7 Userzüge einschließlich 2 Creation, danach 5 reguläre Szenenzüge (I5–I14) |
| Events | 13 Exportgruppen mit **90 Events**; alle 13 Eventgruppen sind mit den entsprechenden `message.extra.avereth.events` im Chatexport exakt identisch (Index I0 beginnt *nach* der JSONL-Metadatenzeile) |
| Weltabschluss | Alle 5 regulären Extractorantworten `applied`; eine einzelne verworfene Learn-Delta in I8, nicht ein komplett fehlgeschlagener Extractor |
| Endstand | Level-1-Mage, Stats 5/5/5/6/5/6, MP 72/72, Guild-Rank Novice; 50 cp Start −20 cp Anmeldung = **30 cp** |
| Quest | „Clear the Outer Grottos of Glimmerdeep“ ausdrücklich angenommen, Guild Slip ausgestellt; Dungeon-/Questarbeit noch nicht durchgeführt |
| Kampf-HUD | **Nicht natürlich ausgeübt**. Die UI ist sichtbar, aber kein H-/F-HUD-Kampfzug wurde gebucht. Die Kernfunktion ist somit noch nicht beurteilt. |

**Ablauf:** Klasse Mage und Skills Flame Lance/Arcane Wave ausgewählt; von der Straße zur Guild hall gereist (Ankunft und Brennas erste Erscheinung gebucht); Gildenanmeldung eingeleitet und mit 2 Silber bezahlt; Novice-Board gelesen; Glimmerdeep-Auftrag angenommen. Alle anderen Angebote sind bis zur weiteren Quest nur Welt-/Questdaten.

## 2. Tatsächliche Modellphasen und Verzögerung

Der Completion-Mitschnitt enthält **17 Requests und 17 Antworten**, alle `finish_reason:stop`; kein belegter 429-/Timeout- oder leeres-Response-Fehler in dieser ersten Etappe.

| Phase | Aufrufe | Hinweis |
|---|---:|---|
| Planner | 5 | Ein Aufruf je gewöhnlicher freier Spieleraktion |
| Narrator | 5 | Erzählt die fünf regulären Szenen |
| Extractor | 5 | Alle fünf als `applied` im Chatexport |
| Boardgenerator | **2** | Initialer Boardaufbau; erster Kandidat nicht vollständig gültig |
| **Summe** | **17** | Creation-/Systempanels ohne separate reguläre N-/X-Phase |

Beim Boardzug I11 sind **111.031 ms** Boardgeneratorzeit im Spielerrecord dokumentiert (55.898 + 55.133 ms). Der erste Generator lieferte zwar fünf vorgeschlagene Listings, aber die Intro-Quest „Take the Snapper at Miller’s Weir“ verwendete einen ungeeigneten `aquatic`-Körperplan für den geforderten sehr schwachen Startergegner und wurde abgewiesen; der zweite Aufruf ersetzte sie durch „Kill the Stray Hound of Tanner’s Row“. **Zwei physische Modellaufrufe sind hier nachgewiesen; eine allgemeine Providerlangsamkeit oder eine Korrektur der Fachgrenzen folgt daraus nicht.** Erst nach dem zweiten Call stand das vollständige Board.

Die Engine hat die Questliste bereits als Systempanel ausgegeben. Der Narrator listete zusätzlich dieselben **fünf** Aufträge einzeln in seiner Prosa, obwohl sein Engineblock für das erste Lesen ausdrücklich eine knappe atmosphärische Beschreibung ohne Wiedergabe des Katalogs verlangt. Dies erzeugt doppelte Anzeige und längere Storytexte. Ob ältere Presetregel `SELECTION LISTS` hier gegen die aktuellere Engineanweisung arbeitet, ist eine plausible Code-/Promptspur, **keine bewiesene alleinige Modellursache**. Priorität: doppelte Katalogdarstellung vermeiden, ohne die kreativen Reaktionen des Narrators zu verbieten.

## 3. Spontanes Spielerfeedback – jeweils belegt und bewertet

### U1 – Action-HUD in der Gilde statt kontextabhängiger Kampfeinstieg

**Originalsinn:** Die Aktionsleiste soll bei Combat beziehungsweise unmittelbar möglichem Kampf hilfreich sein, aber nicht dauerhaft beim Gespräch mit einer Guild clerk. Bereits sichtbare Goblins sollen *vor* dem ersten Kampfzug auswählbar sein.

**Beleg:** Screenshot 1, sowie `src/action_composer.js::refresh()` und `availableActions()` in `src/action_input.js`: die Leiste wird auch im bloßen Gildenkontext eingeblendet. `scene_handles.js::tacticalHere(state,{friendly:false})`, `state.encounter` und `state.pending_combat` bieten bereits Signale zur Unterscheidung von neutral-relevanten NPCs und potenziellen Feinden; die genaue Sichtbarkeitsregel wurde noch nicht entschieden.

**Review:** **UX-Priorität hoch**, kein nachgewiesener Mechanikfehler. Die bestehende Combat-HUD-Skill-/Gegneranzeige könnte als primärer Klickort dienen; im Composer genügt ein kompakter Auswahl-Chip mit H/F. Vor-Kampf-Sichtbarkeit bei erkennbaren Gegnern erhalten. Wichtig: ein neutraler NPC bleibt grundsätzlich über freien Text angreifbar; `SHORT`-Band allein ist kein Feindlichkeitskriterium. Die UI-Regel darf nicht aus `relevant` gleich `hostile` machen.

### U2 – Aktionsoberfläche wirkt noch unfertig

**Beleg:** Screenshot 1 zeigt einen großen Formularblock unter den HUDs mit Dropdowns, Annäherungscheckbox, Erklärung, permanentem Retryknopf und Weltabschlusszeile. Während eines aktiven Weltjobs steht dort „Weltabgleich läuft; Text bleibt als Entwurf erhalten“.

**Review:** Die Funktionalität ist ein brauchbarer erster technischer Durchstich, aber nicht das gewünschte integrierte Videospiel-HUD. Endgültiges Layout/Verhalten **nach dem natürlichen Kampfversuch** entscheiden. Weltstatus kompakt; „Abschluss prüfen/fortsetzen“ nur bei offenem Fehler/unklarem Abschluss hervorheben, nicht dauerhaft wie eine gleichrangige Aktion.

### U3 – Questboard zu lang, Reparatur, Doppeldarstellung

**Beleg:** Zwei `board`-Requests, 111.031 ms, 5 finale Listings, doppelte Wiedergabe im Systempanel und im Narratortext I12.

**Review:** Vorhandene Schutzregeln nicht pauschal streichen: der Startergegner des ersten Vorschlags war fachlich ungeeignet. Den Generatorkontrakt zu diesem Fehlfall gezielt verbessern, Kosten messen und die Doppelerzählung beseitigen. Denkbare langfristige Vereinfachung: offizieller Boardkatalog nur Engine-UI, Narrator nur Szene/NPCs. **Keine Zusage**, dass der komplette Boardgenerator ohne LLM oder Reparaturen auskommen muss.

### U4 – „Ask to accept“ sollte direkt senden

**Beleg:** Vorhandener `src/ui_actions.js::installDraftActions()` füllt nur das normale ST-Textfeld. Nutzer empfindet das zweite manuelle Senden beim bewussten Quest-Auswahlklick als unnötig.

**Review:** Spielerwunsch ist plausibel: eindeutiger aktiver Questkarten-Klick als **bewusster Sendebefehl**, der den normalen ST-/Save-/World-Barrierpfad einmalig nutzt, keine neue Questannahme an sich erfindet und nicht aus alten historischen HUDs bucht. Später als gemeinsame Action-Grundlage behandeln, **nicht** im laufenden Test umbauen.

### U5 – Item-Dropdown unsauber

**Beleg:** Screenshot 2 listet Basic Attack, Flame Lance, Arcane Wave sowie Guild plate, Contract Slip und Small Pouch; die letzten Einträge erscheinen teils doppelt. `availableActions()` kombiniert `state.objects` und `sheet.inventory` ohne vollständige kanonische Deduplizierung und mit breiter Anzeige getragener Dinge.

**Review:** **UI-/Projektionsthema**, keine belegte Doppelbuchung oder Gegenstandsverbrauch. Ein gemeinsames Item-Panel soll nur sinnvoll direkt nutzbare Gegenstände anzeigen, anhand stabiler Objekt-IDs deduplizieren und Story-/Dokumentgegenstände im Inventar belassen. Keine neue Itemmechanik zur bloßen Dropdownbereinigung.

## 4. Zusätzliche Befunde aus Originalchat und Events (nicht vom Nutzer als eigener Punkt gemeldet)

**N1 – Narrator-Agency, kleine Grenzüberschreitung:** Auf dem Weg zur Guild hall erzählt der Narrator „He asked directions once, of a woman scrubbing a doorstep“ (I6). Der Spieler hatte nur den Gang zur Gilde erklärt, keine Frage gesprochen. Character Description verbietet neue PC-Worte ausdrücklich. **Narrative Verletzung belegt**, kein Engine-Mechanikschaden. Bestehende Agency-Regeln beim späteren Gesamtreview auf tatsächliche Wirksamkeit prüfen; kein großflächiger Prompt-Patch auf diesen Einzelfall.

**N2 – Glimmerdeep-Richtung widerspricht Canon und wurde als Questdetail gespeichert:** Der kanonische Content setzt Glimmerdeep nördlich von Glassmere („a morning’s walk north ...“). Brenna erzählt I14 dagegen „a half-day west ... past the quarry road“ und verweist auf das westliche Stadttor. `quest.detailed` übernimmt die West-Angabe. **Spielrelevanter Kontinuitätsfehler**, vor allem für den nächsten Reiseabschnitt; der eigentliche kanonische Ort wurde dadurch nicht umbenannt. Beim Fortsetzungslauf prüfen, ob die Engine trotz falscher Anreiseempfehlung bei der echten Ziel-ID bleibt oder der Narrator die Route weiter widersprüchlich erzählt. Nicht rückwirkend in die Originale eingreifen.

**N3 – Ein einzelnes verworfenes Delta:** I8: `learn` mit falschem Identitätssubjekt `npc.npcglassmere_clerk` statt `pc` wurde als `identity_subject` abgelehnt. Gleichzeitig ist `knowledge.gained` für Brenna über `f.pc.name` mit Quelle `told:pc` gebucht. Das ist **kein fehlgeschlagener Weltabschluss**, aber ein prüfbarer Extraktionsqualitätsindikator.

**N4 – Vollendete Buchungen statt bloßer Erzählung:** Gildengebühr genau einmal als −20 cp, Rang Novice, Guild Plate; fünf Questlistings im Board; Annahme Glimmerdeep samt Contract Slip. Keine nachgewiesene Doppelzahlung oder Verlust des angenommenen Auftrags im Export. 90/90 Events konsistent zwischen den beiden Dateien.

**N5 – Testgrenze:** Kein natürlicher Kampf, kein H/F-Umschalten, kein Save-/Swipe-/Reload-Stresstest des neuen Action-HUD. Die frühen Szenen prüfen vor allem alte .200-Story-/Guildsysteme plus sichtbare neue UI.

## 5. Vorläufige Priorisierung und Fortsetzung

| Priorität für später | Thema | Entscheidung jetzt |
|---|---|---|
| Hoch (Spielkomfort) | Kontextabhängiges, ins Combat-HUD integriertes Action-UI inkl. Vor-Kampf-Gegner | Designrichtung befürwortet, **erst nach echtem Kampf** konkret entscheiden |
| Hoch (Spieltempo) | Doppeltes Questboard und wiederholter Generatorcall | Gezielte Untersuchung; sichere Starterquest-Regeln behalten |
| Hoch (Kontinuität) | Nördlicher kanonischer Glimmerdeep-Ort vs. westliche Narratorauskunft/gespeichertes Questdetail | Beim Questfortgang beobachten, nicht Originalrun umschreiben |
| Mittel | Item-Filter/Duplikate | Enger UX-Fix nach Gesamttest |
| Mittel | Direkter Quest-Button mit einmaligem Send | Als spätere UI-Anwendung der gemeinsamen Action-Grundlage |
| Mittel | Kleiner Agency-Fehler bei erfundener Wegfrage | In natürlichen Verlauf einordnen, keine voreilige Validatorausweitung |
| Später | Permanent sichtbarer Retryknopf | Statusabhängig verstecken und Fehler sichtbar lassen |

**Vorläufiges Ergebnis:** Die reguläre Enginewelt wurde in diesem kleinen Abschnitt zuverlässig gebucht, und die neuen UI-Elemente sind technisch vorhanden. Der erwartete Hauptnutzen – **klickbare taktische Aktionen bei freier Narratorwelt und weniger Planner-Aufrufen** – wurde aber noch nicht natürlich getestet. Die ersten Screenshots legen klar einen UX-Nachbesserungsbedarf nahe. Nutzer spielt weiter; anschließend Phase B hier ergänzen, Gesamt-GPT-Review abschließen und **erst dann** Astra-Gegenreview beauftragen. Kein Patch-/Merge-GO allein aus A.
