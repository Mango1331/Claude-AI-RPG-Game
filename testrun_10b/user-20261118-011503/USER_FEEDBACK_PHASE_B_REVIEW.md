# User05 – Phase B: spontanes Spielgefühl und fachliche Einordnung

**Primärquelle unverändert:** [originals/phase_b_user_feedback.txt](originals/phase_b_user_feedback.txt). Das sind Gedanken beim Spielen, keine nachträglich optimierte Fehlerliste. Detaillierte Belege: [GPT-Review Phase B](REVIEW_GPT_PHASE_B.md).

| ID | Vom Nutzer beobachtet | Bewertung im tatsächlichen Lauf |
|---|---|---|
| **B1** | Reise unterbrochen, vielleicht PULSE; altes PULSE-Spielgefühl noch nicht persönlich getestet | Turn 8: `pulse.rolled` mit `kind:strange`, p=50,75 %, roll=5,11; regelgerechter Weltstopp mit blauer Lichtquelle und anschließender Spielerentscheidung. |
| **B2** | Grotto direkt betreten, nicht vor zusätzlichem Enter-Prompt gestoppt; vielleicht angenehmer locker | I20 bucht `grotto mouth` als ersten Dungeonraum. Der Narrator beschreibt das Innere, ohne die genaue Schwelle ausdrücklich zu erzählen. Agency-Grenze noch offen, nicht als sofortigen Fix annehmen. |
| **B3** | Warum World-HUD nicht sofort anhand der Erzählung aktualisiert, ohne Extractor? | Erzählerische Details müssen geprüft und erst dann gespeichert werden; 7 Extraktionen in B jeweils 9,2–44,1 s. Sofortanzeige ist nicht gleich gespeicherte Welt. |
| **B4** | AoE sollte Range-Bänder statt einzelne Ziele anbieten | Technisch richtig: Arcane Wave trifft jeweils alle gegnerischen Käfer desselben ENGAGED-Bands. Vorhandene Kampfregeln weiterverwenden. |
| **B5** | Interne Monster-IDs in der Zielauswahl | Screenshot S4 vor Encounter; die vorhandene UI nutzt vor dem Kampf nicht `sceneHandle`, später Encounter-Labels. Enger Projektion-Fix denkbar. |
| **B6** | H/F-Modus verwirrend; optionaler freier Text und separater HUD-Senden-Button gewünscht | UX-Idee befürwortet als Prototyp, aber keine zweite ST-Sende-/Speicherkette schaffen. Freier Eingabemodus bleibt. |
| **B7** | AoE traf auch nicht ausgewählte Käfer; im späteren Dropdown schönere Namen | Positive Bestätigung der mechanischen Bandwirkung und später korrekter Encounter-Labels. |

**Beweislücke:** Die beiden tatsächlich gewählten HUD-Aktionen liefen im Modus **`hud_free` (F)** und verwendeten jeweils den Planner. Der plannerfreie **H-Modus** und RP-Zurufe wurden noch nicht natürlich abgenommen. Die Glimmerdeep-Quest ist noch nicht abgeschlossen. **Keine automatische Patchfreigabe.**