# GPT – unabhängiger Nachcheck NPC E2/E3 nach Claudes Fachplan-Korrektur (08.11.2026)

**Urteil:** Die **fünf ursprünglichen P2-Planlücken** aus [GPT-Fachplan-Gegenreview](REVIEW_NPC_E2_E3_FACHPLAN_GPT_20261108.md) sind im überarbeiteten Plan fachlich überzeugend adressiert. Beim Gegenlesen mit dem tatsächlich aktuellen Produktcode .168 traten **zwei weitere eng begrenzte Regeln-/Test-Unstimmigkeiten** auf; diese wurden **direkt und ausschließlich redaktionell im bestehenden Fachplan** geschlossen. **Der Plan ist damit als Grundlage für einen getrennt freizugebenden E2-A-Implementierungsauftrag ausreichend konkret.** Dies ist keine Freigabe der Implementierung und keine technische Abnahme von noch nicht gebauter E2/E3-Mechanik.

**Quellen:** Claudes Plan-Commit [`3a7e2ce`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3a7e2ce3996f5f81a211f7a66d2f0abf75c175c8) auf `main`, ergänzter [Fachplan](NPC_E2_E3_FACHPLAN.md), unveränderte [Ist-Analyse](../recherche/NPC_E2_E3_ISTANALYSE_20261108.md), [User04-Review](../testrun_10b/user-20261106-072640/REVIEW.md), Produkt `.168` [`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980). Der GPT-Nachcheck las Code von `commands.js`/GO, `world.js`/Ankunft/Personalgewinn, `narration_evidence.js`, `threads.js`, `delta.js`, `state.js`, `knowledge.js`, `context.js` und Claudes neue Regeln. **Keine Node-, ST-, Model- oder Replaytests selbst ausgeführt; keine Produktänderung.**

## 1. Abgleich der fünf ursprünglichen P2-Punkte

| Punkt | Gegencheck | Status |
|---|---|---|
| **A: `met`/Erzählbeleg** | `{who,evidence}` an den **autorisierten GO-Schritt und dessen tatsächlich erreichten Ort** gebunden, `known_at[seq]` als Spielerrecord-Quelle, `narratedEvent`, eindeutige Identität/Mehrdeutigkeitsabbruch, Negativfälle | Grundproblem adressiert; ergänzende Präsenzprüfung siehe §2 |
| **B: `handled_by`/bedingte Annahme/Abgabe** | `outcome.desk[seq]={quest,kind}`; auch `conditional`-Schritte via `cmd.completed(ok:true)` nach Ankunft; tatsächlicher Bearbeitungsbeleg, konkrete Gildenperson und Quest-Fakt. User04/I64 sowie I73/I74 in der Testmatrix | Fachlich ausreichend konkret. Pronomenregel bewusst konservativ und nicht schon als natürlich erfolgreich nachgewiesen |
| **C: `thread.who`-Persistenz** | `world.js → delta.js → threads.js::threadEvents() → thread.set → state.js` jetzt berücksichtigt; `who` über Update/Resolution erhalten, `matchThread` parteienbewusst; alte Threads ohne `who` gültig; `#npc` nur für `who ⊇ {pc,id}` | Planlücke geschlossen, ausführbare End-to-End-Tests noch Pflicht |
| **D: Kompaktkarte** | Absprache innerhalb der bestehenden `toward Alaric`-Zeile mit eigener Kürzungsgrenze; `last meaningful` und `knows` bleiben weitere Felder; Vierfachfall in B3 | Verdrängungsfehler fachlich geschlossen, Budgetregeln beibehalten |
| **E: Persönlichkeitsanker** | `scene.since[id]` als **aus Events abgeleitete** Anwesenheitsspanne; frühere gemeinsame Meeting-Erinnerung muss echt **vor** dieser Spanne liegen, Name allein nicht ausreichend; Stimmung gegen Gewohnheit getrennt | Planregel konsistent, tatsächlicher Fold-/Snapshot-/Erstkontaktpfad später in E3 zu testen |

**Positiv:** Die Architektur mit vorhandenen Identity/Knowledge/Memory/Thread/Fact-Stores, **kein zweites Gedächtnis**, keine ungefragten Beziehungszahlen, keine zusätzlichen Modellaufrufe, keine Migration alter Saves und die getrennten Pakete **E2-A → E2-B → E3** bleiben sinnvoll. Die Testmatrix besitzt echte Rot-/Grün-Gegenfälle und schützt bestehendes E0/E1, PULSE und Combat.

## 2. Zwei kleine technische Regeln im Fachplan selbst korrigiert

### 2.1 GO-Status: `authorized`, nicht `resolved` (E2-B R6)

Claudes überarbeiteter Plan verlangte in R6, `arrivalPeople()` und §7 „`resolved` GO-Schritt“. **Im unveränderten Produkt `.168` liefert `src/v4/commands.js::HANDLERS.go` bei gültiger Reise explizit `status:'authorized'`** (z. B. am Ende des Handlers Zeile ~683). `resolved` ist für andere, bereits mechanisch abgeschlossene Kommandos, u. a. Questannahme/-abgabe.

Wörtlich übernommen hätte diese Bedingung gerade **Brennas Ankunftskarte beim normalen Rückweg** ausgeschaltet. Der Fachplan verwendet deshalb nun an allen einschlägigen R6-/Auswahlstellen `authorized`; Regression B1 stellt diesen Status ausdrücklich fest. **Autorisierte Reise bedeutet nicht bestätigte Ankunft**, und eine Ankunftskarte bleibt ausdrücklich `NOT YET SHOWN` und erzeugt keine Präsenz.

### 2.2 Erzählte Erwähnung ≠ persönlich anwesend (E2-A R1)

`narratedEvent(prose,evidence)` prüft die **Ereignis-/Narrationsqualität** einer zitierten Stelle; `identifiesPerson()` im Plan prüft, **wen** eine Formulierung bezeichnet. Ihre Kombination allein sichert **nicht**, dass die Person selbst aktuell da ist. Beispielsweise kann „A painted sign depicted the clerk at work“ eine wörtliche nicht hypothetische Narratorstelle mit eindeutiger Rolle sein, die aber **nur ein Schild** zeigt.

R1/§8 wurden deshalb um ein **eigenständiges, vorsichtiges Präsenzkriterium** ergänzt: Person handelt/spricht oder wird selbst tatsächlich sichtbar anwesend beschrieben. Bild, Name auf einem Zettel, zurückgelassene Sachen, historische Beschreibung oder explizit leerer Platz genügen nicht; sonst `met_evidence` und keine Anwesenheitsbuchung. Regression **A1h** enthält diese negative und positive Kontrolle. Dies erfordert **keinen zusätzlichen LLM-Call**, stellt aber einen echten Implementierungs-/Testanspruch an den künftigen Code. Das ist keine Aussage, dass jede ungeskriptete Prosa damit fehlerfrei erkannt wird.

Die redaktionelle Fachplanpräzisierung liegt auf `main`; Produkt bleibt `.168`.

## 3. Bewusst verbleibende Grenzen – keine neue Pflichtplanungsrunde

- **Historische Sammelentitäten:** Test A1c erlaubt bei alten Saves weiterhin einen zusammengefassten Clerk als *eine* historische Entität, obwohl neue `person.new`-Gruppen verhindert werden. Das ist ein begrenzter **Altbestandskompromiss**, keine perfekte Nachtrennung zweier früher zusammengefasster Menschen. Es sollte im Implementierungsbericht benannt werden; keine automatische Migration.
- **Bestehendes `enter` ohne Beleg** für zuvor am Ort gelassene NPCs bleibt bewusst unverändert (D12). Die **neue** `met`-Strecke muss trotzdem ihre strengere Erzählprüfung voll durchsetzen. Ein späterer natürlicher Test kann vorhandene Fehlbuchungen quantifizieren, ohne diese historische Sicherheitsregel vor E2-A pauschal zu ändern.
- **Pronomen und Beweisgrenzen:** `he` ist in der neuen `handled_by`-Regel konservativ dem PC vorbehalten; dadurch können manche echten männlichen Clerk-Handlungen ohne erkannten Zeugen bleiben. Das ist **falsch-negativ**, nicht automatisch ein Rechteleck. Die Originalszenen I64/I74 sind analysiert, der künftige Beweismatcher noch nicht ausgeführt.
- **E3-Persönlichkeitsanker:** Der Szenenschwellen-/Mood-Matcher ist ein bewusst begrenzter heuristischer Erstentwurf; stabile Eigenheiten sind nicht durch eine Wortliste garantiert. Erst spätere natürliche Antworten erlauben die Bewertung der Treffer-/Fehlbuchungsquote.
- **PULSE/Combat/Quests:** Neue `met`-Anwesende können legitime Beobachter und ggf. Beteiligte werden. Das ist gewollt **nur bei wirklich belegt anwesenden** NPCs; die neuen `expected`-Schreibrechte müssen in A7 eng auf Anwesenheit/Wissen begrenzt sein. Alte Replayakzeptanzen dürfen nicht still geändert werden.

## 4. Nutzerentscheidungen und Implementierungsfreigabe

Die Designoptionen in **Fachplan §13** bleiben unverändert *vorläufig* und sind nicht durch das Review autorisiert:

- **Für E2-A relevant:** **D9** (Zuschauer, der tatsächlich anwesend und aufmerksam ist, bleibt wissender Zeuge einer Guild-Annahme). Empfehlung: **bisheriges `witnessEvents` beibehalten**; die neue Belegprüfung gibt nur dem wirklichen Bearbeiter *zusätzlich* korrektes Wissen. **D12**: alten permissiven `enter`-Pfad jetzt nicht eigenständig verschärfen, Entscheidung nach natürlichem Test.
- **Erst für E2-B:** D1 (`#npc`-Anzeige), D4 (erledigte Absprache), D6 (aufgeschobenes bedingtes Angebot).
- **Erst für E3:** D2 (aus gezeigtem Verhalten), D3 (spätere Szene), D13 (eine oder zwei spätere Beobachtungen).
- Die übrigen fachlich unveränderten Optionen werden nicht still implementiert.

**Empfehlung:** **Fachplanung für E2-A hinreichend konkret, getrennt freigabefähig**. Nach ausdrücklicher Nutzerfreigabe kann Claude zunächst ausschließlich **E2-A** implementieren: zuerst rote Tests gegen .168, dann enger Produktpatch, volle Node-/Replay-/ST-Abnahme inklusive Bedingungs-/Präsenzgegenfällen, danach unabhängiger Produktdiff-Gegenreview. **E2-B und E3 sind nicht freigegeben.**

**Abschluss:** Keine weiteren Architekturstudien oder zusätzlichen planbezogenen Claude-Patches ohne neuen konkreten Befund; die zwei jetzt identifizierten Regelabweichungen sind bereits im Fachplan berichtigt. Produkt und Tests unverändert.
