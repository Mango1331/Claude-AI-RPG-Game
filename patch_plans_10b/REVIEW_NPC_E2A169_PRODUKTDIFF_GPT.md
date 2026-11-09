# GPT – unabhängiger Produktdiff-Gegenreview NPC E2-A, Build .169 (09.11.2026)

**Urteil: NPC E2-A ist im Kern planentsprechend umgesetzt, aber ein eng belegbarer P2-Fehler in der neuen `met`-Anwesenheitsprüfung ist vor dem getrennten Paket E2-B zu schließen.** Die übrigen R2–R5-Pfade und die technische Abnahme wirken im geprüften Diff schlüssig. **Kein erneuter Architektur-/Fachplanaudit, keine E2-B-/E3-Implementierung.**

**Git-Basis:** Produkt `.168` [`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980) → `.169` [`93acd57`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/93acd574409bff44c39bd7bc203e526fc76da262), **genau drei Commits vorwärts und null zurück**. [`4d8d2a0` Code](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4d8d2a0e8112ccc20cf4cb44d911d3a2bd8f4f7d), [`3037627` Tests/Replay](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3037627), [`93acd57` Build/Host/Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/93acd574409bff44c39bd7bc203e526fc76da262). `main` führt den geprüften [E2/E3-Fachplan](NPC_E2_E3_FACHPLAN.md) und [GPT-Plan-Nachcheck](REVIEW_NPC_E2_E3_FACHPLAN_NACHCHECK_GPT_20261108.md).

**Prüfmethode:** GitHub-Commitdiff, entscheidende `.169`-Quelltextabschnitte in `commands.js`, `extract.js`, `narration_evidence.js`, `world.js`, `domain.js`, `context.js`, `turn.js`, beide neuen Node-Testdateien, ST-Smoke, Patchnote und beide vollständigen Replayakzeptanz-JSONs unabhängig eingesehen. **GPT hat keine vollständigen Node-/ST-/Runtime-Replays selbst ausgeführt** und den unten beschriebenen Gegenfall noch **nicht** als ausführbaren Runtime-Test gestartet. Seine erwartete Fehlentscheidung folgt unmittelbar aus dem Code: String-/Tokenprüfung plus konkrete Wortlisten. Der Gegenfall muss im nächsten kleinen Korrekturauftrag ausführbar rot/grün nachgestellt werden. Der Produktcode wurde nicht verändert.

## 1. Positive Befunde

- **R1/Schrittbindung:** `outcome.known_at[seq]` entsteht beim autorisierten GO nur für tatsächlich angebotene `KNOWN AT`-IDs. `world.js::metArrivals(k)` wird unmittelbar nach einem explizit gebuchten `arrive` des konkreten Schritts geprüft: `expected[k].arrived`, Zielort `auth.gos[k].to`, angebotene lebende Person und nicht bereits anwesend. Kein neuer Eventtyp; über `enterKnown` laufen `scene.entered` und ggf. `entity.updated(at)` sowie bestehender Guild-Zeugenpfad. Ein späteres `enter` derselben Person verdoppelt den Eintritt nicht. Die Einzel-/Mehr-GO-Regressionen und die unveränderte Alt-`enter`-Regel entsprechen dem Plan. **Aber die zusätzliche semantische Präsenzbehauptung durch `metEvidence` ist nicht ausreichend geschützt (§2).**
- **R2/Gildenbearbeiter:** `outcome.desk[seq]={quest,kind}` plus neues `expected[seq].handled_by={who,evidence}`; direkter erfolgreich `resolved`-Schritt oder wirklich per `cmd.completed(ok:true)` ausgeführter `conditional`-Schritt wird auf eine existierende Gildenfakt-ID, lebenden anwesenden Gilden-NPC und wörtlichen Bearbeitungsbeleg geprüft. Ausführung nach Personendeltas/bedingter Questbuchung. `knowledge.gained` nur, wenn diese Person den Fakt noch nicht kennt; keine Geld-/XP-/Statusdoppelbuchung. User04 I64/I74 samt konservativer Pronomenregel als Regression abgebildet. `witnessEvents` und .158-Rückfall nicht gelockert.
- **R3/R4:** `collectivePerson` verweigert bestimmte quantifizierte Personengruppen als eine `person.new`; ein einzelnes handelndes Mitglied kann separat eingeführt werden. `keptHere` überspringt `distinct_from`-ausgeschlossene Kandidaten und alte erkennbare Sammelentitäten; alte Saves werden nicht migriert. Monster-/Dungeongruppenregeln nicht angefasst.
- **R5:** Sprechergebundene Kennzeichnung nur für einen begrenzten Satz von Sprechprädikaten im Narrator-`RELEVANT`-Abruf; Quest-/Board-Kanon bleibt autoritativ. Kein generelles Verwerfen anderer Fakten.
- **Extractor/Kompatibilität:** Neue `go.met`- und `desk.handled_by`-Shapes sind strict/nullable; `parseExtraction` normalisiert fehlende oder ungültige Einträge auf `null`, statt eine Repair-Schleife zu erzwingen. Alte Records ohne die neuen Outcome-Schlüssel bleiben unverändert lesbar. Keine E2-B-Ankunftskarten, kein `thread.who`, kein `scene.since`, keine sozialen `attitude`-Änderungen und keine zusätzlichen Modellaufrufe.

## 2. P2 – Ein tatsächlich abgereister NPC kann durch `met` fälschlich als anwesend gebucht werden

**Quellpfad:** [`narration_evidence.js` Zeilen 218–220 / 294 ff.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/93acd574409bff44c39bd7bc203e526fc76da262/avereth-engine/src/v4/narration_evidence.js#L218-L310) → [`world.js::metArrivals` Zeilen ~1991–2010](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/93acd574409bff44c39bd7bc203e526fc76da262/avereth-engine/src/v4/world.js#L1991-L2010).

`metEvidence(prose,evidence,id,people)` prüft:
1. `narratedEvent`: ein wörtlicher, nicht hypothetischer/nicht negierter/nicht erinnerter Erzähltext;
2. `DEPICTED`-Wortliste gegen Bilder;
3. `AWAY`-Wortliste: `empty|vacant|absent|away|gone|missing|nowhere|abandoned|unattended|deserted`;
4. `namedPeople`: eindeutiger Name, Singularrolle mit bestimmtem Artikel, Pluralrolle mit Menge oder zwei passende Beschreibungswörter;
5. `TRACE` auf einige Schrift-/Spurwörter.

**Eine positive Feststellung, dass der bezeichnete Mensch **gegenwärtig** anwesend ist, gibt es danach nicht.** Der Fachplan §8 verlangt diese positiv, weil Erzähl- und Identitätsbeleg allein nicht genügen.

**Enger Gegenfall mit eindeutiger Rollenidentität:** Ankunft im bekannten Gildenhaus, `known_at[1]` bietet den einen bekannten Clerk. Der Erzähler schreibt:

> The clerk had left the Guild hall before Alaric arrived.

Der Extractor meldet irrtümlich

```json
{"met":[{"who":"npc.npcguild_clerks","evidence":"The clerk had left the Guild hall before Alaric arrived"}]}
```

`narratedEvent` kann diese tatsächliche, nicht verneinte Erzählung akzeptieren. `namedPeople` findet den eindeutigen `the clerk`. Weder `DEPICTED`, `AWAY` (kein `left`/`departed`/`went home`) noch `TRACE` greifen. Somit erreicht der Fall nach dem aktuellen Quellpfad `enterKnown` und kann `scene.entered` für **eine ausdrücklich abwesende Person** buchen – das Gegenteil von R1. Das ist ein **aus dem Code direkt ableitbarer Gegenfall**, noch kein von GPT ausgeführter roter Node-Test. Dass der Extractor falsch-positiv berichtet, ist gerade das Szenario, vor dem die verbindliche Engine-Validierung schützen soll.

Weitere gleichartige Formulierungen: `The clerk departed at dawn`, `The clerk went home an hour before Alaric came`. Der bisherige A1h-Test prüft Porträt, Schild, hinterlassenes Ledger und leeren Schalter, **nicht** erzählte, vollendete Abreise oder explizite Tätigkeit anderswo.

**Warum P2:** Die betroffene neue E2-A-Autorität schreibt Anwesenheit (und daraus mögliche Beobachter-/Zeugen-/Handlungsfolgen) in den persistenten Zustand. Ein falsches positives `met` erzeugt daher mehr als eine unschöne Erzählung; es kann Folgezustand verfälschen. Vor E2-B ist dies relevant, weil dort Ankunftskarten und Wiederbegegnung häufiger auf diese Verarbeitung treffen werden.

**Enge Fix- und Rot/Grün-Vorgabe:**

1. Auf unverändertem `.169` eine Regression mit tatsächlichem `playerTurnV4 → replyTurnV4` und einem bekannten Clerk im `known_at`, gebuchter GO-Ankunft und **exakt** dem oben zitierten Abwesenheitssatz. Der Extractorreport enthält `met:[{who,evidence}]`. Erwartet: **kein** `scene.entered`, stattdessen `delta.rejected(met_evidence)`, kein `entity.updated(at)` und kein zusätzliches persönliches Wissen.
2. Zusätzliche Negativvarianten `had left`, `departed`, `went home` (einschließlich Zeitbezug auf **vor** Alarics Ankunft); `The clerk was working in the other town` (anderen Ort nennen).
3. Positive Kontrollen: `The clerk stood behind the counter and waved`; `both clerks at work this time` in der historischen Gruppe; Crossbowman `sat over fresh maps again`; keine Änderung am bestehenden `enter`-Pfad.
4. Nicht pauschal das gemeinsame `narratedEvent` verschärfen oder neue globale NPC-Presence-/Ownershipmechanik schaffen. Nur die **neue `met`-Präsenzsemantik** korrekt eingrenzen: eine tatsächliche positive aktuelle Präsenz oder eine gleichwertige eindeutige Konstellation, nicht nur eine wachsende Abwesenheitswortliste. Konservative False-Negatives sind bei unklarer Prosa besser als frei erfundene Anwesenheit.
5. Full Node-/Replay-/ST-Standard-/Failsoft-Abnahme; identische bestehende positiven E2-A-, E0/E1- und PULSE-Gegenfälle, knappe Patchnote, separater Korrekturcommit. Danach einmal gezielter Kontrollreview, E2-B weiter getrennt.

## 3. Replay – unabhängiger vollständiger Metadatenabgleich

Die beiden **vollständigen** Dateien `tests/replay/accepted_pulse167_vs_126.json` (.168) und `accepted_e2a169_vs_126.json` (.169) wurden durch GPT **strukturell vollständig verglichen**:

- Frühere Akzeptanzen: **1040**; neue: **1041**.
- **916** der bisherigen Einträge sind exakt identisch.
- **124** alte Einträge geändert: **123** Kategorie `e2a169 outcome fields`, **1** Kategorie `e2a169 group person` (`b17-rogue#14`).
- Für **alle 124** ist das Feld `previous_acceptance_167` als **vollständiges Objekt exakt gleich** dem alten Eintrag. Keine ID verloren, keine fehlende oder falsche Vorgängerversion.
- **Ein** bisher nicht akzeptierter Eintrag: `b17-warrior#10`, Kategorie `e2a169 group person`. Dieser Gruppenversuch wurde nach Claudes Bericht schon vorher als `ambient` verworfen und jetzt als `collective_person`; er hat keine alte Akzeptanz zu erhalten.
- `returned`-Metadata der Akzeptanzdatei unverändert.

**Wichtig:** Die vollständige Struktur- und Vorgängerprüfung belegt die Nachvollziehbarkeit der **Akzeptanzmetadaten**; dass alle 123 neuen Fingerprints wirklich nur `known_at/desk` und die zwei Ablehnungscodes geändert haben, folgt aus Claudes Regression/Replaydiff, **nicht** aus einer von GPT erneut ausgeführten 2235er-Replayberechnung.

## 4. Test- und Hostabnahme des Implementierers

Nach Claudes [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/93acd574409bff44c39bd7bc203e526fc76da262/avereth-engine/docs/NPC_E2A_INTEGRITY.md):
- **21** neue E2-A-Regressionen, auf .168 **19 rot** und **2 bisherige Kontrollfälle grün**, auf .169 **21/21 grün**. Enthalten sind A1–A7 inkl. A1h, zwei GO in einem Turn, direkte/bedingte Gildenbearbeitung, historische Gruppen, `keptHere`, Sprecherlabel, enger Event-Schreibumfang und Persistenz.
- Angrenzende E0/E1-/Identity-/World-/Guild-/P0-/Replay-Suites grün.
- Vollständiges `npm test` **2936/2936**, Replay **2235** Fälle, **1041/1041** akzeptiert und **0 offen**.
- Echter ST1.19-Standard- und Failsoft-Smoke jeweils **OK** (der Nutzerbericht nennt keine allgemeine Gesamt-Checkzahl), darunter **14 neue NPC169-Checks**, keine fehlgeschlagenen Prüfungen. User04-Originalprosa mit **geskripteten** Extractorfeldern und genau einem Extractoraufruf je Antwort; Save/Reload/Swipe/Regenerate/Edit ebenfalls erfasst.
- **Engine-Schätzwerte:** Extractor-Systemprompt **+63 Tokens** pro Zug, `expected`-Zeile GO **+103**, Schalter **+95**, GO+bedingte Abgabe **+202**. Antwort-Zusatz für `evidence` im natürlichen Betrieb nicht gemessen. Narrator-Hauptblock und Budget unverändert; null zusätzliche LLM-Aufrufe.

Das belegt aus Implementierersicht einen stabilen technischen Hauptpfad. **Keine freie Modellbefolgungs- oder echte natürliche Actor-Erkennungsquote belegt.** Die Tatsache, dass die Tests gerade den neuen Gegenfall noch nicht enthalten, macht die übrigen Tests nicht ungültig.

## 5. Beobachtungsgrenzen (keine weiteren Pflichtkorrekturen)

- `deskHandlingEvidence` schließt derzeit `he` als möglichen männlichen NPC-Bearbeiter aus (PC-Pronomen), was bei echten Schreiberhandlungen eher **falsch-negativ** ist. Die Fallgrenze ist dokumentiert; kein eigener sofortiger Ausbau ohne Nachweis.
- `AWAY` kann die **zulässige** Verwendung „put the ledger away“ fälschlich als Abwesenheit einstufen; ebenso können nicht berücksichtigte Rollenbezeichnungen zu konservativer Ablehnung führen. Diese False-Negatives sind zu beobachten, nicht als gleichwertige Stopper zum False-Positive aus §2 zu behandeln.
- `expected.desk` bindet die Quest formal an `seq`. Die natürliche Belegzuordnung bei mehreren im selben Antworttext bearbeiteten Scheinen kann mehrdeutig sein; bei späterem realem Fall gezielt nachtesten, **nicht** ohne weiteren Befund einen zusätzlichen Beziehungs- oder Questvalidator planen.
- Historische Sammelidentitäten und der ältere, teilweise belegfreie `enter`-Pfad sind bewusst beibehalten (D5/D12); nicht als neue .169-Regression einstufen.

## 6. Abschlussentscheidung

**.169 technisch weitgehend abgenommen, aber noch kein endgültiger GPT-Diff-Abschluss für E2-A.** Zunächst nur den **engen P2-False-Presence-Fix in `metEvidence`** auf aktueller Produktbasis mit ausführbarem Rot/Grün-Nachweis und vollständigen Regressionen umsetzen. Anschließend gezielter Kontrollreview. **E2-B und E3 nicht automatisch beginnen**, ebenso weder PULSE D noch andere Gameplayänderungen.

Produktcode unverändert durch diesen GPT-Review. Die nächste eigenständige Nutzerfreigabe betrifft später E2-B; bestehende vorläufige soziale Regeln aus Fachplan §13 sind nicht durch diesen Review entschieden.
