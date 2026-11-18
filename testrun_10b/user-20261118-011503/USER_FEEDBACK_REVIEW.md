# User05 – spontane Spielgefühlnotizen: Zuordnung und Bewertung

**Unveränderter Wortlaut:** [`originals/user_feedback.txt`](originals/user_feedback.txt). Der Text wurde beim Spielen ohne längere Reflexion erstellt und ist **nicht** eine abschließend priorisierte Entwicklungsanforderung. Für nachvollziehbare Kürzel hier fünf Themenblöcke (U1–U5); `REVIEW_GPT.md` enthält technische Belege und Schlussfolgerungen.

| Kürzel | Inhalt der Originalnotiz | Vorläufige Einordnung |
|---|---|---|
| **U1** | Action-HUD in Gilde unnötig; im Kampf bzw. schon bei sichtbaren Goblins vor Kampf wünschenswert. Clerk ist ebenfalls `SHORT`/anwesend, aber nicht feindlich. | Kontextsteuerung statt bloßes Anwesenheits-/Bandkriterium. Vor-Kampf-Angriffe möglich halten; neutraler NPC bleibt über Freitext ansprechbar/angreifbar. |
| **U2** | UI der Action-HUD noch nicht schön; lieber Skill-/Gegnerbuttons in bestehendem Combat-HUD statt Dropdown. | Konkrete UX-Richtung, nicht bewiesener technischer Fehler. Nach Kampftest verfeinern. |
| **U3** | Questboardantwort lang und mehrfach aufgerufen; mögliche Vereinfachung oder Board nur durch Engine anzeigen, Narrator nicht doppelt. Offen, wie sich das auf Kreativität auswirkt. | 2 echte Boardgeneratorcalls, 111.031 ms, System- und Narratorkatalog doppelt. Qualitätsschranken gezielt erhalten. |
| **U4** | Button „Ask to accept“ füllt nur den Composer; Nutzer wünscht direktes Senden. | Bereits vorhandener bewusst passiver Draftbutton. Künftige einmalige Sendaktion nur mit vollständigem ST-/Save-Schutz. |
| **U5** | Item-Dropdown in „Aktion auswählen“ nicht sauber. | Ungeeignete Dokument-/Behältereinträge und Duplikate in Screenshot 2; keine nachgewiesene doppelte Verwendung. |

Wichtig: Alle fünf Beobachtungen stammen aus derselben frühen Testphase **ohne natürlichen Kampfzug**. Die nächste Auswertung soll den aktiven Quest-/Kampfbogen berücksichtigen und diese Einordnung gegebenenfalls korrigieren. Kein historischer Feedbackpunkt wird still ersetzt.
