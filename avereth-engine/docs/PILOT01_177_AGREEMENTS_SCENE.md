# .177 — Pilot 01, Block C: Absprachen, Szenenkorrektur, Personen- und Rudelvorgaben, Kleinpaket (K5, K6, K8; D1, D4, D6)

**Basis:** `.176` (`596da8a`).

**Grundlage auf `main`:**
- [Gegenreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/GEGENREVIEW_CLAUDE.md) B3, B4, B6, B7, B11, B12;
- [Fachplan](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/FACHPLAN_PILOT01_KORREKTUREN.md) §6, §7, §9;
- Auflage B aus dem [GPT-Kontrollreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/REVIEW_FACHPLAN_GPT.md);
- Entscheidungen D1, D4, D6 des Implementierungsauftrags.

**Abgrenzung:**
- kein neues System und keine allgemeine Textähnlichkeitsprüfung;
- keine automatische Zusammenführung von NPC-IDs;
- keine neue Gruppierungslogik;
- keine Balance- oder PULSE-Parameter;
- kein zusätzlicher Modellaufruf;
- `EXTRACTOR_VERSION` bleibt `extract-5.25`, wie bei den Vorgabenänderungen von E2-A, E2-B und E3.

## 1. K5 + D1 – Absprachen behalten ihren Inhalt

**Fehler `.176`:**
- **T58 (I116):** Der Extractor meldet Mullers 40-Silber-Schuld an Garvin Hesse unter `thread.t34.1`, der ID von Mullers Kupferzusage (T36). `threadEvents` ersetzt den Text vollständig.
- **T46 (I88):** Eine Umformulierung derselben Zusage ersetzt ihn ebenfalls.
- **T17 (I34):** Die Szene an Hessas Tür ersetzt den T11-Bericht.
- **T21 (I42):** Dodds Mitfahrangebot wird zu „drives Alaric on“.
- **T61 (I122):** Der Woolpack-Fuhrmann ist als zweite Person `npc.carter` gemeldet. Dessen Erledigungsbericht erledigt `thread.t47.1` und fügt `npc.carter` als dritte Partei hinzu.

**K5a – Extractorvorgabe (`content/deltas.json`, Delta `thread`):**
- Bei promise/debt ist dieselbe Sache: dieselben Parteien und dasselbe Versprochene oder Geschuldete. Eine andere Zusage oder Schuld, auch derselben Person (etwa ihre Schuld bei jemand anderem), ist ein neuer Thread mit `id: null`.
- `resolved` gilt auch für die gehaltene Zusage und die bezahlte Schuld, auch wenn sie in einem Handel bezahlt wird.
- Kein promise/debt ist ein Bericht über jemanden („they sent for help, they are ill, they owe someone else“). Das ist ein Fakt oder ein Gerücht.
- `pc` ist Partei nur, wenn Alaric selbst etwas versprochen hat oder ihm etwas geschuldet wird.

**D1 – konservativer Engineschutz (`src/threads.js` `threadEvents`):**
1. **Inhalt bleibt.** Ein Update per ID übernimmt bei promise/debt den neuen Wortlaut nicht. Der gespeicherte Text bleibt die Absprache, wie sie geschlossen wurde. Es gibt **kein** `latest`-Feld. Erledigung und Parteien laufen sonst wie bisher.
2. **Keine fremde Partei.** Nennt ein Bericht unter der ID eine NPC-Partei, die nicht zu den gespeicherten Parteien gehört, wird er abgelehnt: „thread identity: … is the agreement of …; a report naming … is another matter (a new thread, id null)“. Text, Parteien und Status bleiben.
3. **Keine Erledigung allein per ID.** Ein `resolved` per ID gilt nur, wenn mindestens eine gespeicherte NPC-Partei anwesend ist oder im Bericht genannt wird (Name, bekannter Name oder Rollenwort). Eine kopierte Parteiliste ist kein Beleg.

Unverändert bleiben:
- R7 (`pc` nur von Angesicht zu Angesicht);
- die `.173`-Zuordnung ohne ID;
- die Übernahme besserer Formulierungen bei Threads, die keine Absprachen sind (Gerücht, Zeichen, Gefahr, Rätsel).

## 2. K6 – Szenenkorrektur und Wiedererkennung

**K6a (`src/v4/world.js`):**
- Die Korrektur nach einer `scene_context`-Ablehnung entsteht erst am Ende der Antwort, mit Alarics endgültigem Ort.
- Hat eine spätere angenommene Ankunft derselben Antwort ihn bewegt, lautet sie: „Part of the last reply took place in a scene the engine did not book: its people, objects and quest outcomes there were not recorded. Alaric is at {Ort}; continue from there.“
- Ohne spätere Ankunft bleibt der alte Text „Alaric remains at …“, an derselben Stelle der Korrekturliste.

**K6b + D4 (nur Vorgabe, `PERSON CONTINUITY`):** Neu ist der Satz: „A known person the reply calls by their role ("the carter" who offered Alaric a ride, "the clerk") is that person: use their id (KNOWN PEOPLE, PRESENT, THREADS), never a person.new; person.new only for someone the story shows as new.“ Die Engine führt **keine** IDs automatisch zusammen.

## 3. D6 – Rudel als eine Gruppe (nur Vorgabe)

- `creature.new`-Summary: „a pack or band the reply shows acting together is ONE creature.new with its count (its leader among them), a separate one only for a creature the reply sets apart as another kind or acting on its own“.
- Die PULSE-Regel „eine Gruppe“ und die Gruppenbildung der Engine bleiben unverändert.

## 4. K8 – Kleinpaket

- **K8-1 (`world.js`):**
  - Ein `learn` oder `fact` mit einer NPC-Person als Subjekt, Prädikat `name` (oder `known name`, `true name`, `full name`) und Alarics Namen als Wert wird abgelehnt: `identity_subject`, „"Alaric Red" is Alaric's name, not …'s“.
  - Ob ein NPC Alarics Namen kennt, hängt in der Engine allein an `f.pc.name`. Das bleibt unberührt (T16: „told:pc“ aus der Spielernachricht).
- **K8-2 (`world.js`):** Ein `person.new` mit `role` „null“, „none“, „undefined“, „n/a“ oder leer gilt als ohne Rolle: kein Beruf „null“, kein Deskriptor „null“ (T11, Widow Hessa).

## 5. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen `.176` | `pilot01_k5_agreements.test.js` **8 von 10 rot**: T58, T46, T17, fremde Partei, T61, Erledigung per ID, Dodd T16→T23, Vorgabentext. `pilot01_k6_k8_scene_identity.test.js` **5 von 7 rot**: K6a T61, Vorgaben D4/D6, K8-1 T16 und als `fact`, K8-2 T11 |
| Grün | **10/10**, **7/7** |
| Gegenfälle (auf beiden Ständen grün) | **K5:** Hesse-Schuld mit `id: null` (wie K5a sie verlangt) wird eigener Thread `t53.1` mit `[muller]`, `t34.1` unverändert; ein Gerücht per ID übernimmt die neue Formulierung · **K6a:** abgelehnte Szene ohne spätere Ankunft behält „Alaric remains at the Woolpack …“ · **K8-2:** eine echte Rolle („miller“) wird Beruf und erster Deskriptor |
| Gegenfälle innerhalb der neuen Tests (grün auf `.177`) | **K5:** Dodds Fahrt T16→T21→T23 behält „offers a free ride“, wird mit ihm erledigt, Parteien `[npccarter_hazel, pc]`; eine Erledigung, die Muller nennt, erledigt `t34.1` und behält den Wortlaut · **K8-1:** `learn` über `pc` bleibt; ein anderer Fakt der Person bleibt; das Wissen um `f.pc.name` aus der Spielernachricht bleibt |
| Threadsuites | `npc_e2b`, `npc_e2b173`, `npc_e2b_host`: **25/25** |
| `npm test` | **3033/3033** |
| Replay | **14 von 2235 Fällen** geändert gegenüber `.176`, maschinell geprüft und einzeln akzeptiert (`tests/replay/accepted_pilot177_vs_126.json`, 1057 Einträge, Wächtertest `.177`) |
| Replay K8-1 (7) | `b17-rogue#10`, `b17-warrior#10`, `b17-warrior#18` (Claim), `b18-rogue#10`, `b18-rogue#380` (erneutes Lernen), `b18-warrior#8`, `b19-mage#12`: Ein Schreiber oder Händler „lernt“ als eigenen Namen „Alaric (Red)“, jetzt `identity_subject`. Fakt/Claim und Wissen darüber entfallen; spätere Fakt-IDs desselben Records rücken um eins auf; sonst identisch |
| Replay K6a (7) | `b17-warrior#30`, `#64`, `#270`, `b18-warrior#158`, `b19-mage#18`, `#98`, `b19-warrior#252`: Die Korrektur nennt den Endort der Antwort statt „remains at“; gleiche Stelle, sonst identisch |
| Voller Korpuscheck | `npm run replay:check`: 2235 verglichen, 1057 abweichend, **alle** mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **168** wahr, 0 falsch (`.176`: 162) |
| ST1.19 Failsoft | `OK`, **173** wahr, 0 falsch (`.176`: 167) |
| Neue Smokeprüfungen | `pilot01_k5CopperKeepsWords` (T58), `pilot01_k5NoSettlementBySecondId` (T61), `pilot01_k6aCorrectionAtCairn` (T61), `pilot01_k6aNarratorToldCairn` (T62-Erzählerblock), `pilot01_k8NoPcNameOnCarter` (T16), `pilot01_k8NoNullRole` (T11) |
| Extractorprompt | Systemteil (über `runExtraction`) **11 037 → 11 237** geschätzte Token (+200; +857 Zeichen). Nutzerteil unverändert (I48 3251, I116 2954, I122 3350, I130 3375) |
| Erzählerkontext | unverändert (kein Kontextcode berührt) |

## 6. Grenzen

- **Semantische Identität:** Eine andere Sache **derselben Parteien** unter der alten ID ist deterministisch nicht erkennbar. Text und Parteien bleiben dann zwar stehen, aber eine solche Meldung kann die Absprache erledigen, wenn eine Partei anwesend ist oder genannt wird. Hier hilft nur K5a. Dass K5a im natürlichen Lauf wirkt, ist noch nicht gezeigt.
- **T61-Typ:** Wird die erfüllte Mitfahrt unter einer zweiten Personen-ID gemeldet, bleibt `thread.t47.1` offen, obwohl die Fahrt stattfand. Eine automatische Zusammenführung ist nach D4 ausgeschlossen. Gegen die doppelte Person hilft die K6b-Vorgabe.
- **T17/Hessa:** Der T11-Bericht bleibt eine falsch eingestufte `promise`. Sie behält jetzt ihren Wortlaut. Alaric ist nach R7 Partei, weil Hessa anwesend war.
- **Threads ohne gespeicherte Parteien:**
  - Sie erhalten nach der bestehenden `.173`-Regel Parteien über ihre ID.
  - T58: `t34.1` bekommt `[muller, pc]` aus dem Hesse-Bericht. Für die Kupferzusage stimmt das, aber nur zufällig.
  - Prüfen lässt sich das nicht.
- **Erledigung woanders:** Eine Absprache, die ohne die Partei eingelöst wird, ohne dass der Bericht sie nennt, bleibt offen. Diese Strenge ist gewollt.
- **K8-1:** Erfasst sind nur Namensprädikate mit Alarics Namen als Wert. Andere vertauschte Subjekte bleiben unerkannt.
- **Vorbestehend (seit spätestens `.174`, nicht geändert):**
  - Wird die Originalantwort I32 vollständig (`person.named` und ein `learn` derselben Person) unter der Testmodus-Eigentumsprüfung (`assertOwnership`) nachgespielt, bricht sie ab: Der V3-Namensabgleich schreibt `entity.updated {known_name: null}` im Schritt des `learn`.
  - Im Produkt ist die Prüfung aus; der Pilotrecord zeigt das Ereignis.
  - Die K8-Tests verwenden deshalb das `learn`-Delta allein. Der ST-Smoke spielt die ganze Antwort.
- **Natürliche Wirkung** von K5a, K6b und D6: erst im nächsten Lauf messbar (Fachplan §12).
