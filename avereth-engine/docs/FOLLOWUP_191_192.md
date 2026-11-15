# Build 4.3.0-c.6.6.192 – Korrekturen nach dem natürlichen NPC-Batch `.191`

**Basis:** `.191` (`b8d3be5`) und die Runner-Lesepause (`4ed8bf2`). Patchnote davor: [FOLLOWUP_190_191.md](FOLLOWUP_190_191.md).

**Anlass** (auf `main`, `testrun_10b/npc-20261115-103140Z/`):
- `REVIEW_GPT.md`,
- `GEGENREVIEW_OPUS.md`,
- `GEGENBEWERTUNG_GPT_ZU_OPUS.md`.

**Originalfälle:** Beide spielbaren Läufe des Batches liegen als eigener kleiner Korpus in `tests/replay/corpus191`, gebaut mit `tools/replay/build_corpus.mjs` aus den aufgezeichneten Modellantworten.
- `tests/v4/batch191_lib.js` verarbeitet eine Originalnachricht auf ihrem Originalzustand erneut, mit den aufgezeichneten oder offengelegt veränderten Antworten.
- Die Funktion `chain191` verkettet mehrere Nachrichten.
- Es gibt keinen Modellaufruf.
- Dieser Korpus ist **nicht** Teil der historischen Baseline (2235 Fälle).

| Paket | Originalfall | Befund auf `.191` | Korrektur |
|---|---|---|---|
| **P1** Dungeon-Slotautorität | Warrior T70 (#140) | Die Dungeon-Karte bot jeden freien Slot der Ebene „even before an earlier encounter is resolved“ an, auch im Kampf. Die Engine lehnte die erzählten Speerträger dann ab (`dungeon_foe`). Ein bestehender `sign`-Thread speicherte sie trotzdem („… as the two spear-goblins advanced“). | **Karte** (`living.js contextLines`): Einen kreativen Auftritt hat nur die Begegnung, die die Engine für diese Antwort gesetzt hat (seine DUNGEON-AHEAD- bzw. PULSE-Zeile, je nachdem, welche dieser Zug gesetzt hat), und nie im Kampf; dort steht „no newcomer joins the fight“. Die übrigen Begegnungen warten in ihren eigenen Abschnitten. **Firewall** (`living.js slotForNew`): In einem B5-Abschnitt füllt ein kreativer Auftritt nur den Slot dieses Abschnitts. **Thread** (`world.js`, `run9_evidence.js refusedCreatureInThread`): Jede Thread-Meldung, die eine in dieser Antwort abgelehnte Kreatur als hier oder handelnd behauptet, wird abgelehnt (`creature_continuity`); die frühere Fassung bleibt. Erkannt wird über die volle Art oder Anzahl plus Körperplan. Teilen gebuchte Kreaturen der Szene Art oder Körperplan, zählen nur Neuankömmlinge. Spuren, Berichte, Gerüchte und Geräusche bleiben. |
| **P2** Gilden-Jagdorte | Rogue T7 (#13), Folgen T9–T20 | Das Brett hängte jeden neuen Jagdort unter das Reich, auch „Millrace Row culvert, Ashbridge“. Stadtwege wurden so zu Reichsreisen: Straßen-PULSE, Reichshalt, 45/50 Minuten. | `guild.js bookBoard`/`townSite`: Nur die Adressform „<Ort>, <Gildenstadt>“ ohne Wort für außerhalb, Richtung, Straße, Weg, Feld, Wald oder Wildnis legt den Ort in die Gildenstadt (`loc.ashbridge.millrace_row_culvert`). Alle anderen Jagdorte bleiben unter dem Reich. Ein schon gespeicherter Ort gleichen Namens wird weiterverwendet; nichts wird verschoben oder umgeschrieben. |
| **P3** NPC-Wiederbegegnung | Rogue T13 (#26) | `metArrivals` verlangte `g.to`. Bei einem GO mit Wortziel war `met` daher immer `met_without_arrival`. | `met` wird am tatsächlich erreichten Ort des Schritts geprüft. Bei einem Wortziel kommen die dort bekannten Personen in Frage, dazu die eine Person, die die Worte des Schritts eindeutig nennen („Widow Hesse at the blue door“), wenn der erreichte Ort in ihrer Stadt liegt. Wer mitkam (`arrive.with`), ist schon da. Ankunfts-, Bekanntheits-, Lebend- und Belegprüfung bleiben unverändert. |
| **P4** Reisegrenze | Warrior T47 (#93) | `TRAVEL THIS TURN — none chosen: … unless something in the world moves him` ließ Hedwins Führung als äußere Ursache gelten. | Neuer Text: „An invitation he accepts, someone leading the way or going ahead, or his own agreement moves him nowhere; only a force he cannot refuse, told as it happens (carried, dragged, swept away), moves him without his own going.“ Keine neue Reisemechanik. |

**P5, geprüft und bewusst nicht umgesetzt:**
- **Elternszene (W T12):** Eine Szenenangabe, die die Siedlung oder den Lebensraum nennt, lässt sich nicht vom konkreten Unterort unterscheiden. Der Gegenbeleg aus dem eigenen Korpus: Im verketteten Rogue-Nachlauf auf korrigierter Hierarchie meldet T18 `loc.ashbridge`, während Alaric am Durchlass steht, die Räuber aber in einer anderen Gasse der Stadt stehen. Eine Lockerung hätte sie am Durchlass gebucht. Der Schutz bleibt; der Test hält W T12 als abgelehnt fest.
- **Angriff plus Bewegung:** Die angesagte Annäherung ist in `combat.js` Teil derselben Angriffsaktion (höchstens ein Band) und wird nur mit einem zulässigen Angriff gebucht. Fünf der sieben Fälle enthalten gar keine eigene Bewegung, sondern Konter oder Lauerangriffe. Die Bewegung allein zu buchen, berührt Aktionsökonomie (Main/Minor ist nur geplant) und bedingte Absicht („before they notice me“). Dafür gibt es einen eigenen Kampffachplan auf `main`.

**Tests:**
- `tests/v4/batch191_fixes.test.js` mit 14 Tests: je Paket der Originalfall und positive wie negative Gegenfälle, ein verketteter Rogue-Nachlauf T7–T22 und die P5-Entscheidung.
- Auf dem unveränderten `.191` scheitern 11 davon. Grün sind dort die P1-Positivkontrolle, der Bestandsfall P2 (alter Spielstand) und der P5-Erhaltungstest.
- Angepasst:
  - der Stufe-4-Test der TRAVEL-Zeile;
  - der 3A-Test „Run 8 shape“: Der Wächter bindet jetzt nur noch in seinem eigenen B5-Abschnitt; im ersten Abschnitt bindet er nicht, wie verlangt.

**Replay (2235 Fälle):**
- Genau ein Datensatz ändert sich: `b16-rogue-sale#5`. Das Brett listet „the tanner's outflow ditch below Tanners' Row, Glassmere“, jetzt ein Ort von Glassmere. Seine drei anderen Jagdorte bleiben im Reich.
- Er ist begründet und gefingerprintet (`batch191 town hunt site`).

**Originalnachlauf `.191`:**
- Warrior 137 und Rogue 42 Datensätze gegen ihre `.191`-Ausgaben.
- 5 beabsichtigte Abweichungen: R #13 (Durchlass in Ashbridge), R #26 (Hesse am erreichten Haus geprüft), W #24 (kein `met`-Fehler für den mitgekommenen Hedwin), W #90 (Wat per `met` am Tor), W #140 (Thread abgelehnt).

**Abnahme `.192`:**
- `npm test` **3250/3250**, darin die Runner-Lesepausentests (`tests/live_runner/read_pause.test.js`, 4/4) unverändert grün.
- Voller Replay: 2235 Fälle, 1092 Abweichungen gegen `.126`, alle gefingerprintet, 0 offen.
- `.191`-Korpus: 179 Datensätze, 5 beabsichtigte Abweichungen (oben).
- Isolierter ST1.19-Smoke: Standard **225/225**, Failsoft **230/230**, je 0 PageErrors.
  - Ein erster Lauf scheiterte an zwei PULSE-167-Prüfungen: Die Kartenzeile nannte bei einer PULSE-Wanderbegegnung „DUNGEON AHEAD“.
  - Sie nennt jetzt nur die tatsächliche Reservierung des Zugs.
- Kein natürlicher Lauf.
