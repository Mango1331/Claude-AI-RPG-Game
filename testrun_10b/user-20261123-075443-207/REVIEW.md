# User10 – zweiter persönlicher Kurztest auf Avereth .207 · Questboard scheitert

**23.11.2026 · Erstreview durch GPT, ohne Patch.** Neuer Mage-Alaric in Ashbridge, 6 Spielereingaben (davon 2 zur Charaktererstellung), 4 erzählte Züge. Original-Enginebuild `4.3.0-c.6.6.207` auf `experiment/207-trade-hud` / [`609380b3`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/609380b308d89d14c289e9ca1c4e26ed29174789). Der Lauf wird bei der ersten Questboard-Lesung abgebrochen. Drei ursprüngliche Uploads (Chat, Engine-Events, PowerShell/UTF-16-Log) sind im [Quellenmanifest](SOURCE_MANIFEST.md) nach Größe und SHA-256 eindeutig bezeichnet; **diese Originalbytes sind noch nicht auf `main` archiviert**. Dies ist eine Auswertung der tatsächlichen Uploads und des Codepfads in `.207`, keine autonome Codex-Reproduktion. **Kein Patch oder Provideraufruf durch den Review.**

## 1. Fehlerablauf – zwei unterschiedliche Mängel in einer Quest

Eingabe Zug 6: `*i shake my head and walk over to the Questboard and look at it*`. Die Engine erkennt korrekt `board.read`. Der Gildenmarkt erzeugt seine fünf Skill-Primer als tatsächlich gespeichertes Angebot. Danach versucht die Engine, fünf offizielle Novice-Aufträge generieren zu lassen.

**Erste physische Boardantwort:** genau fünf Einträge, davon vier valide; „Cull the Millpond Snappers“ (Level 1, `qtype: minor`, `DEFEAT 2 snapping turtles`) hat `habitat.species:"snapping turtle"`, `habitat.anchor:"aquatic"`, **`min_level:4,max_level:7`**. Der Validierer lehnt zunächst die Levelspanne ab, weil die empfohlene Stufe 1 nicht in 4–7 liegt. Er fordert die Korrektur des *gesamten* Boards.

**Zweite physische Boardantwort (LLM-Repair):** unveränderte fünf Titel und vier übrige Aufträge; dasselbe Millpond-Angebot erhält **`min_level:1,max_level:3`**. Der fehlerhafte Körperbauanker **`aquatic` bleibt**; zur bekannten `snapping turtle` passt der Engine-Kataloganker `armored_beast`. Der zweite Validierer meldet nun `habitat.anchor contradicts the named species body plan`. Weitere Reparaturantworten sind nicht vorgesehen: `board.failed` mit `4 valid listings of the 5 asked for`, und null Questbuchungen.

**Ursache unabhängig im Code bestätigt:** In [`guild.js::habitatWhy`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/v4/guild.js) wird die Habitatlevelspanne *vor* dem Anker auf den ersten Fehler geprüft. Die in `.206` eingeführte eingeschränkte automatische Ankerkorrektur `parseInitialBoard` setzt exakt einen **bereits als Ankerkonflikt erkannten Fehler** voraus. [`runtime.js::generateBoard`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/v4/runtime.js) ruft `parseInitialBoard` nur bei `attempt === 0` auf, beim zweiten Versuch dagegen `parseBoard`. Der erste Ankerkonflikt war wegen des vorausgehenden Levelfehlers nicht sichtbar, auf der korrigierten zweiten Antwort durfte die lokale Hilfe nicht mehr eingreifen. Dadurch wurde ein theoretisch korrigierbarer *zweiter* Fehler der gleichen Quest zum Gesamtausfall. Kein Nachweis, dass `.207` diesen Mechanismus neu eingeführt hat; der Handels-Patch berührt diesen Boardpfad nicht.

**Wichtig:** Auch nach einer etwaigen Ankerkorrektur muss die **gesamte** Fünferliste vollständig und erneut validiert werden. Keinesfalls vier Einträge als offizielle Teiltafel buchen, fremde Population überschreiben oder die vom Modell erfundene falsche Körperbaukategorie übernehmen.

## 2. Spielzustand und Darstellung

`board.failed` erschien technisch korrekt in den Events. Es gibt **kein** `quest.created` und keine offiziellen Quests im HUD; Alaric bleibt registrierter Novice mit **30 cp**, **80/80 HP**, an der Ashbridge-Gildenhalle. Die fünf Primer sind Gildenwaren, keine Questangebote. Die letzte Narration lässt Alarics Blick über die Zettel verschwimmen, ohne dass er einen klaren Auftrag erkennt, und erwähnt einen anderen Abenteurer, der einen Zettel abzieht. Das ist **keine** bestätigte technische Questboard-Aktion oder offizielle Zurücknahme; die Engine speichert keine Abholung. Die Geschichte kaschiert den technischen Fehler etwas unglücklich als Wahrnehmungsproblem. Die Systeminformation `UNDERSTOOD ... board.read (generator_failed)` liegt zwar im internen Paneltext, war im überlieferten sichtbaren `display_text` aber **nicht als eigenständige deutliche Fehlermeldung** zu sehen. Für den Spieler bleibt daher ohne Log nicht offensichtlich, warum keine Angebote erscheinen.

Außerhalb des Boardfehlschlags blieb die Registrierung mit Gebühr (50→30 cp) konsistent; der erste Spielzug erforderte eine Extractor-Reparatur der Szenenchronologie, der zweite eine weitere Extractor-Reparatur. Die am Anfang der Serverkonsole stehende `File not found`-Meldung verweist auf die beim Neuanlegen des Chats noch nicht existierende JSONL und hat keine belegte Wirkung auf den Boardfehler. In diesem Test wurden **weder Shopkauf/Verkauf noch PULSE-Hindernisschaden oder Kampf** natürlich getestet.

## 3. Modellaufrufe und Zeiten

**Physischen Calls:** 16 Requests und 16 Responses, alle `stream:false`, gemeldete Cachetokens null. Aufteilung: 4 Planner, 2 Board, 4 Narrator, 6 Extractor einschließlich zwei Extractor-Reparaturen. **175.930 Inputtokens + 4.663 Outputtokens = 180.593 Token gesamt.** Die beiden Boardaufrufe verbrauchen zusammen 6.018 Input- und 1.791 Outputtokens; die Rekursion ist kein stilles internes „kostenloses“ Prüfen.

Boardgeneration: **54,836 s Erstentwurf + 50,782 s Repair = 105,618 s**, beide über die tatsächlich aufgezeichneten `extra.avereth.board.llm`-Messungen. Der gesamte fehlgeschlagene Boardzug (Zug 6) dauerte **123,159 s Host bis Erzählende**, mit **5,316 s Extractor** also mindestens **128,475 s** bis zur sicheren nächsten Eingabe. Die tatsächliche Save-/Read-back-Freigabe wurde nicht separat aufgezeichnet.

| Erzählzug | Host bis Prosa (s) | Extractor inkl. Repair (s) | Host + X, Untergrenze (s) | Hinweis |
|---|---:|---:|---:|---|
| T3 | 27,465 | 30,715 | 58,180 | 1 X-Repair |
| T4 | 22,834 | 34,323 | 57,157 | 1 X-Repair |
| T5 | 41,537 | 44,885 | 86,422 | Registrierung |
| T6 | **123,159** | 5,316 | **128,475** | 2 Board-LLM-Calls, 0 Quests |
| **Mittel, n=4** | **53,749** | **28,810** | **82,559** | Diagnostischer Abbruchlauf, nicht mit vollständigen Kampagnen vermischen |
| **Median, n=4** | **34,501** | **32,519** | **72,301** |  |

[Maschinenlesbare Messwerte](MESSWERTE_USER10_207.json). Kein Beleg für die Zeit bis zur ersten Prosa, tatsächliche sichere Folgeeingabe oder für einen kausalen Vergleich mit User08/09. Aus diesem Fehlerlauf keine allgemeine Performanceprognose für `.207` ableiten.

## 4. Ergebnis / Empfehlung

**Befund P1 funktional/Spielkomfort, keine Datenkorruption:** Die Boardgenerierung kann auf einem Modelloutput mit nacheinander aufgedeckten unabhängigen Validierungsfehlern nach zwei teuren Calls vollständig scheitern. **Kein pauschales GO für das Board als robust**, aber der geschützte Ganz-oder-gar-nicht-Status ist richtig.

**Nutzer kann denselben Run fortsetzen:** Eine **neue** Nachricht wie `*I look at the questboard again and read the posted contracts.*` triggert eine neue Boardanforderung ohne Wartezeit im Spiel. *Nicht nur die letzte Narratorantwort regenerieren:* Der bereits gebuchte fehlgeschlagene Engineeingabezug kann dabei wiederverwendet werden. Gelingt ein neuer Versuch, den Spieltest natürlich fortführen und das Ergebnis dokumentieren. Wenn es erneut scheitert, nicht beliebig viele kostenpflichtige LLM-Retries ausführen.

**Späterer Patchauftrag, nicht implementiert:** Für den spezifischen Originalfall einen fokussierten Rot-/Grün-Test aus beiden kompletten unveränderten Boardantworten erstellen. Als minimalen Kandidaten die bestehende eng abgesicherte **lokale Ankerkorrektur auch nach der einzigen LLM-Reparatur** prüfen, gefolgt von derselben vollständigen Boardvalidierung. Alternativ eine gebündelte Rückmeldung aller unabhängig erkennbaren Verstöße eines Slots prüfen, damit ein einziger LLM-Repair beide korrigieren kann. Keine willkürliche Erhöhung der Provideraufrufe, keine generellen Anchor-Autokorrekturen bei mehrdeutigen Tieren und keine neue Questboard-Architektur. Die aus User09 bekannte separate UX-Frage einer sichtbaren Engine-Schadensmeldung bleibt offen.
