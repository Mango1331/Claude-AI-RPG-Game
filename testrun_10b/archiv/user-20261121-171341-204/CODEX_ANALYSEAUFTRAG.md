# Codex – unabhängiger Analyseauftrag für User07 .204 (keine Implementierung)

## Ziel und harte Grenze

Im Repository `Mango1331/Claude-AI-RPG-Game` wurde der erste persönliche Nutzer-Run auf **`4.3.0-c.6.6.204`** unter `testrun_10b/user-20261121-171341-204/` vollständig archiviert.

**Zuerst SELBST analysieren, erst danach GPT-Kritik und Nutzerfeedback lesen.** Wir wollen wissen, was wir richtig erkannt, falsch interpretiert oder übersehen haben und ob unsere Ideen reale Verbesserung bringen. **Absolut keine Engine-/Preset-/Character-/Runtime-Codeänderungen, keine Patchimplementierung, keine PR, kein Deploy, kein Branch-Fast-Forward, keine neuen Providerrequests.** Produkt `.200` und beide `.204`-Entwicklungsbranches unangetastet lassen.

## Phase 1 – unabhängiger Blindreview der Quellen

Lies zunächst **nur**:
1. `ORIGINAL_CHAT.jsonl` (vollständiger SillyTavern-Chat),
2. `ORIGINAL_EVENTS.json` (tatsächliche Engineereignisse),
3. `ORIGINAL_CHAT_COMPLETION_LOG.txt` (alle Request-/Response-Rohprotokolle),
4. den tatsächlichen Build-Stand `b51e850bfa233b32f10ba01c563002ab26061c85`, insbesondere Planner, Guild-Board, Narrator-Schnittstelle, Extractor, World-/Ortsvalidierung, Character Description und V4-Preset.

**Vorläufig weder `USER_FEEDBACK.md` noch `GPT_DISKUSSIONSSTAND.md` lesen.** Eigenständig eine vorläufige Diagnose in klaren Punkten notieren, mit konkreten Stellen in Code und Originallogs. Diese Blindphase im Bericht als solche erkennbar halten.

Untersuchung:
- Rekonstruiere jede der sechs Nutzereingaben und vier Narratorzüge samt exaktem Status (gebucht, verweigert, gespeichert, Folgewirkung). Nicht mit der 41-Züge-Codex-Kampagne verwechseln.
- Präzise, disjunkte Zeitachse für die zwei langsamen Züge (Planner, etwaige Repairs, Boarderstellung, Narrator, Extractor, Save-/Read-back, UI). Unterscheide Erzählungsende, erste lesbare Prosa, Zeit bis sicherer Folgeeingabe; keine frei erfundenen Zahlen.
- Prüfe, wo genau Boardaufträge zweimal erzeugt wurden, warum die erste Boardantwort nicht genügte und ob der zweite Aufruf ein isolierter Repair oder Neubau war; welche Änderungen wären fachlich tatsächlich schneller und wie gut belegbar?
- Prüfe, warum eine routinehafte Messung im Gildenhaus zu `no_go` und `scene_context` führte, was daran Schutzfunktion versus Fehlklassifikation ist, und ob dabei Fakten/NPC-Information verloren gingen.
- Prüfe Plannerquote/Preisbindung und tatsächlichen Grund der zweiten Plannerantwort. Keine automatische Relaxierung sicherheitsrelevanter Buchungen.
- Prüfe das doppelte Questboard in Systemkarten und Narration, Token-/Zeitanteile und echte Regelpriorität. Notiere, falls dies kein wesentliches Problem ist.
- Prüfe alle tatsächlich mitgesendeten statischen/variablen Prompts: Contract, Preset, Lore, Enginekontext und Maschinenprompts. Was ist redundant, was schützt Qualität und was könnte *messbar* beschleunigt werden? Keine unbelegten Fantasieeinsparungen.
- Suche eigenständig auch nach anderen übersehenen auffälligen Vorkommnissen (z. B. Spielwert der Questaufträge, Fiktion/Präsenz, echte Save-Anomalien oder Requesttransport). Keine spekulative Jagd nach unwahrscheinlichen Sonderfällen.

## Phase 2 – expliziter Gegenreview unserer Einschätzungen

**Jetzt erst** `USER_FEEDBACK.md` und `GPT_DISKUSSIONSSTAND.md` lesen.

Erstelle eine **kritische Zuordnungstabelle**:
- Aussage/Idee,
- eigener Quellenbefund (Log, Code, Spieltext, Messdaten),
- Urteil: korrekt / teilweise / falsch / offen,
- Relevanz für Spielgefühl und reale Wartezeit,
- erwarteter Nutzen versus Aufwand und mögliches Qualitäts-/Integritätsrisiko.

Nimm sachlich Stellung zu *mindestens* diesen Entscheidungsfragen:
- Ist der kanonische Gildenhallenort für die Messraumroutine die richtige Abstraktion? Wie schützt man echte Entscheidungen und Präsenz-/Interaktionsgrenzen?
- Ist das technische Sonderproblem überhaupt die Ursache für spürbare Zeitverluste, oder nur Welt-Konsistenz? Was spart wirklich Zeit?
- Behebt eine automatische äußerliche `quote`-Vervollständigung einen echten, reproduzierbaren Fehler, oder verschiebt sie nur Risiken?
- Ist die Boardgenerierung zu stark formalisiert, oder ist der Repair korrekt und selten? Würde ein kürzerer/teilweiser Auftrag wirklich weniger Requests und ähnlich gute Quests liefern?
- Ist die Dopplung von Questboardkarten und Narration relevant oder dürfen wir sie zugunsten der Geschichte akzeptieren?
- Sollte die Character Description pauschal oder situationsbezogen gekürzt werden, wenn das Beispiel zur Registrierung absichtlich generisch ist? Was ist der tatsächliche Token-/Cache-/Latenzeffekt, mit welchem Risiko?
- Ist die Providerlatenz der dominierende Faktor und was kann Enginecode dagegen sinnvoll tun? Streaming nicht als Lösung für eine gesperrte nächste Eingabe darstellen.
- In welchen Punkten lagen die bisherigen GPT-Antworten nachweislich daneben? Hier sind insbesondere die widersprüchlichen Narratorzeit-Schätzungen und die zunächst falsche Gewichtung der Doppelanzeige zu kontrollieren.

## Phase 3 – unabhängiges Urteil ohne Implementierung

Fasse zusammen:
1. **Was wurde übersehen?** Nur konkrete, belegte Zusatzbefunde.
2. **Was wurde richtig eingeordnet?**
3. **Was wurde falsch oder zu stark eingeordnet?**
4. **Welche der diskutierten Änderungen sind wirksam, welche bloß kosmetisch, welche riskant?**
5. **Maximal 3 priorisierte Maßnahmen** mit Ursache, konkretem Ziel, überprüfbarer Erfolgsmetrik und offenem Risiko, oder begründetes `NO PATCH NEEDED`.
6. Welche Behauptungen lassen sich ohne neue Modellrequests belegen, welche nicht? Keine neue Pflicht-A/B-Runde vorschlagen, wenn dafür keine relevante Frage offen ist.

Ergebnis in **`testrun_10b/user-20261121-171341-204/CODEX_GEGENREVIEW.md` auf `main` dokumentieren**, nach Möglichkeit mit Rückverweisen auf konkrete Logstellen, GitHub-Code und ein kurzes, überprüfbares Ergebnisschema. **Nur diese Dokumentation auf `main` schreiben, keinen Produktcode anfassen.** Anschließend für gemeinsame Nutzer-/GPT-Entscheidung stoppen. Kein automatischer Fix im Anschluss.
