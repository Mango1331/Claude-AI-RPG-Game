# GPT – unabhängiger Produktdiff-Gegenreview Pilot-01-Korrekturen `.175`–`.177`

**Datum:** 10.11.2026. **Geprüfter Produkt-HEAD:** [`3658fbcf61356d798c0f975804e66e8e5263a169`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3658fbcf61356d798c0f975804e66e8e5263a169) auf `claude/c-planner-prototype-2026-10-02-gpt-c666`. **Basis:** `2a8b54e45a48ef525b69d62edb826fd3a2b77cbc` (Engine `.174`, neuer Runner). **Dokumentationsbranch:** `main`; [Originalrun samt unabhängiger Reviews](REVIEW.md), [Sols Ursachenanalyse](GEGENREVIEW_CLAUDE.md), [Fachplan](FACHPLAN_PILOT01_KORREKTUREN.md), [GPT-Auflagen](REVIEW_FACHPLAN_GPT.md).

## 1. Urteil

**K1, K3, K4, K6a, K7 und K8 sind im geprüften Produktdiff in ihrem vereinbarten Umfang fachlich schlüssig umgesetzt. K2/D5 und K5/D1 enthalten zwei konkrete, begrenzte Integritätslücken, die vor einer uneingeschränkten Freigabe der Schutzmechanismen gezielt korrigiert werden sollten (P2).** Die beiden Abweichungen sind keine Rechtfertigung für einen neuen Generalumbau oder eine Wiederholung aller Pakete. Ein kleiner, zusammengehöriger Korrekturauftrag mit roten Gegenfällen gegen `.177` genügt.

**Wesentlich:** Der echte natürliche Pilot lief auf `.174`. Es gibt **noch keinen natürlichen LLM-Lauf auf `.177`**. Die korrekte spätere Verwendung der verbesserten Extractorvorgaben und die E3-Ankerbildung sind damit offen. Die unten genannten Implementierertests bleiben valide als **andere Nachweisart**.

## 2. Methodik und Versionsintegrität

- Die GitHub-Remote-HEADs wurden geprüft: Produkt `3658fbc`, `main` vor diesem Bericht `0f7aba1`. Der Git-Vergleich [`2a8b54e...3658fbc`](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc...3658fbcf61356d798c0f975804e66e8e5263a169) zeigt **11 Commits voraus, 0 zurück**. Nur die vereinbarten Engine-/Kontext-/Vokabular- und Test-/Doku-Dateien wurden geändert; keine neue Funktion auf dem Runner-Branch, keine Änderung an PULSE-Zahlen oder Balance.
- Vollständige Patchnotes `PILOT01_175_DUNGEON_PURCHASE.md`, `PILOT01_176_CONTEXT_EVIDENCE.md` und `PILOT01_177_AGREEMENTS_SCENE.md` gelesen. Die vollständigen neuen relevanten Regressionen für K1/K2/K3/K4/K5/K6/K7/K8 sowie den ergänzten ST-Pilot-Smoke gelesen. Produktcode/Diff geprüft: `world.js` (Slot, Handel, Szenenkorrektur, Personenfakten), `trade.js`, `commands.js`, `context.js`, `settlement.js`, `narration_evidence.js`, `threads.js`, `deltas.json` und Replay-Wächter.
- **Eigene, isolierte JavaScript-Gegenproben an den exakt aus den geprüften Funktionen übernommenen Bedingungen**, nicht vollständige Hostdurchläufe: falsche `namedIn`-Rollenidentifikation, Ende des `wareOnSale`-Schutzes nach Angebotsabschluss, Doppelbindung von `displayedWare` im selben neuen Angebot sowie ein ID-Update mit abweichender Art. Code und Gegenbeispiele unten.
- **Unabhängiger Abgleich der beiden Git-Replay-Akzeptanzdateien** per maschinell geparsten JSON-Dateien: alte `accepted_e2b172_vs_126.json` = **1048** Einträge; neue `accepted_pilot177_vs_126.json` = **1057** Einträge, **genau 14** neue/geänderte Fingerprints (7× `pilot177 npc name subject`, 7× `pilot177 scene correction place`). Alle übrigen bestehenden Einträge unverändert; alle 14 tragen eine Begründung und die erforderliche vorherige Fingerprint-Referenz, 0 alte Einträge entfernt; `returned` unverändert. Die Zahl 1057 folgt aus 9 zusätzlichen gegenüber der alten Datei; 5 der 14 betroffenen Fälle waren bereits zuvor akzeptiert.
- **Nicht eigenständig ausgeführt:** vollständiges `npm test`, die 2235 Replay-Neuberechnungen, ST1.19-Smokes, aktuelle Kontext-Rekonstruktion aller 65 Züge oder ein freier Modelllauf. Deren Erfolg/Messwerte stammen ausdrücklich aus Sols Patchnotes.

## 3. Technischer Kontrollbefund je Korrektur

| Umfang | Unabhängige Bewertung | Weiterer Schritt |
|---|---|---|
| **K1 .175: DUNGEON AHEAD/PULSE** | `aheadBorn` wird nur bei neu erzeugter Kreatur und einer **diese Runde** reservierten gültigen Slotbindung gesetzt. Ausschließlich diese IDs umgehen PULSE; danach `mayOpenFight` mit bisherigen Regeln. Tests: Originaleingang, wirklicher Angriff, nicht geslotteter Neuling, früherer Zug, Road. **Im vereinbarten Umfang stimmig.** | Keine neue K1-Änderung ohne natürlichen Gegenbefund. |
| **K2 .175: Kaufobjekt** | `displayedWare` berücksichtigt Name, Menge, eindeutiges Objekt, Profil und andere offene Angebote. `bookPurchase` bewegt passende Ware bzw. splittet eine bezahlte Teilmenge, ohne zweiten Gegenstand. Das behebt den Originalprimer. **Sonderfall: Bindung innerhalb desselben neuen Angebots wird nicht dedupliziert** (§5). | P3-Gegenfall zusammen mit D5 testen. |
| **D5 .175: Ware nicht per TAKE nehmen** | Solange das Angebot **offen** ist, weisen Planner-TAKE und Extractor-Transfer die Ware nachvollziehbar ab. **Nach Abschluss eines nicht verknüpften Angebots werden weiter ausgestellte Exemplare nicht mehr geschützt** (§4). | **P2-R2**, eng korrigieren. |
| **K3 .176: `gear_market`** | Auslösung über `input` und vorhandene Händler-/Shopmerkmale statt `lastReply`. Ein **erster** Schmiedkontakt ohne `offer` ist im Test gesichert. Unbeteiligte Road-/Dungeonwörter laden keinen Katalog. | Ergebnis verbessert, aber D3-Diagnose weiterhin offen (§7). |
| **K4/D2 .176: Evidenz** | `partwise` prüft zunächst die alte vollständige Evidenz, danach jedes wörtliche Teilstück mit **derselben** bisherigen R1/R2-Prüfung. Die neuen Bearbeitungsverben brauchen ein Schalterobjekt im Satzglied; Dialog, Hörensagen, Erinnerungen und unklare Subjekte wurden als Gegenfälle geprüft. | Kein Pflichtpatch aus dem untersuchten Diff. Im natürlichen nächsten Lauf Fehl-/Fehlpositivraten beobachten. |
| **K7 .176: Fehlbetrag** | `shortfallText` nennt Preis, vorhandene Börse, Differenz und die **aus dem Content** gelesenen Münzrelationen in den drei Kaufpfaden. Buchungs- und Preisentscheidung unverändert. | Natürliche Wirkung des Erzählerhinweises offen. |
| **K5/D1 .177: Absprachen** | Der vereinbarte Ursprungstext bleibt bei ID-Update erhalten. Fremde gespeicherte NPC-Parteien werden abgelehnt; Erledigung verlangt anwesenden oder im Text genannten gespeicherten Partner. **Die Identifikationsprüfung behandelt aber eine generische Rollenbezeichnung als Beleg gerade für den gespeicherten NPC** (§3.1). Die dokumentierte Restgrenze „anderes Thema, dieselben Parteien“ besteht zusätzlich. | **P2-R1**, vorhandenen Identitätsguard präzisieren. |
| **K6 .177: Ort/Person** | Korrektur nennt nach späterer Ankunft den **Endort**, nicht den überholten Ort beim verworfenen Delta. K6b/D4 ist bewusst **nur Extractor-Anweisung**, keine automatische NPC-Verschmelzung. | Als vereinbart abgeschlossen; Wirkung erst im Modelllauf messbar. |
| **K8 .177: Daten** | Namenssubjekt (`name = Alaric Red` bei anderem NPC) wird begrenzt abgewiesen; Rolle `"null"` nicht als Beruf/Deskriptor übernommen. Die 14 Replayabweichungen enthalten ausschließlich K8-1 bzw. K6a. | Bestehenden Testmodus-Ownership-Befund I32 getrennt lassen (vorbestehend, laut Sol auch auf `.174`). |

### 3.1 P2-R1 – Falsche Erledigung einer Absprache durch generische Rollenreferenz

**Code:** [`src/threads.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3658fbcf61356d798c0f975804e66e8e5263a169/avereth-engine/src/threads.js#L114-L166), `namedIn()` und `threadEvents()`.

Die neue Guardfunktion `namedIn(state,id,text)` akzeptiert neben echtem Namen und bekanntem Namen **`entities[id].descriptors[0]`** als Nachweis. Bei vielen NPCs ist das schlicht `clerk`, `carter` oder ein anderer generischer Rollenkopf. Der `resolved`-Guard benötigt im von der Partei abwesenden Fall nur irgendeinen Treffer dieses Worts in `th.text + th.resolution`, **ohne Mehrdeutigkeitsprüfung oder Subjektbindung**.

**Unabhängige isolierte Gegenprobe mit genau den Prädikaten des Produktcodes:**
- `npc.clerk_anna`: gespeicherte Partei einer offenen Zusage, **nicht anwesend**, Deskriptor `clerk`;
- `npc.bess`: andere Schreiberin, **anwesend**, ebenfalls `clerk`;
- Der Extractor meldet eine **andere** Schuld mit alter ID als erledigt: „The other clerk Bess settled a different debt at the guild desk“.
- Ergebnis: `namedIn(state,'npc.clerk_anna',text) === true`, nur weil `clerk` im Satz steht; die Abschlussbedingung ist damit erfüllt. `threadEvents` kann die *Zusage Annas* mit dem Bericht über Bess erledigen. Er behält dabei den schönen alten Text; gerade das macht den Fehler schwer sichtbar.

**Bewertung:** P2 der personenbezogenen Threadidentität. Keine neue fuzzy-Matching-Engine nötig. **Auflage:** Ein generisches Rollenwort allein darf eine **abwesende** konkrete gespeicherte Partei **nicht** als belegt identifizieren, wenn es mehrere Rollenträger gibt oder der Text einen anderen eindeutig bezeichnet. Der echte Name/known_name und eindeutig identifizierender Rollenbezug dürfen unter Beibehaltung des ausdrücklich erlaubten Nachtrags aus der Ferne funktionieren. Vorher rot gegen `.177`: zwei gleichartige Schreiber, nur der andere genannt. Positive Kontrolle: Anna selbst eindeutig genannt oder anwesend; negative: nur ID/Parteiliste und andere Person. **Keine** generelle Sperre legitimer Erledigungen außerhalb von Alarics Sicht.

**Benachbarte, noch offene D1-Grenze:** Bei einer alten `promise` kann der Extractor unter derselben ID `kind:'debt'` und `status:'resolved'` liefern; `threadEvents` prüft die berichtete Art bei vorhandener ID nicht, behält `cur.kind` und kann mit anwesender alter Partei die ursprüngliche Zusage erledigen. Der isolierte Guard lässt diese Artverschiebung durch. Nicht jede Umformulierung von Versprechen zu Schuld ist automatisch eine andere Sache; deshalb erst einen **gezielten Gegenfall für eindeutig andere Verpflichtung** als Sicherheitstest ergänzen, nicht pauschal gültige Aktualisierungen wegfiltern. Die in der Patchnote bereits benannte Restgrenze „gleiche Parteien, andere Sache“ bleibt **offen und nicht als gelöst ausgeben**.

### 3.2 P2-R2 – D5-Ladenschutz endet nach mehrdeutigem Kauf

**Code:** [`src/v4/trade.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3658fbcf61356d798c0f975804e66e8e5263a169/avereth-engine/src/v4/trade.js#L265-L358) mit `displayedWare()`/`wareOnSale()`/`bookPurchase()`; [`commands.js` TAKE](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3658fbcf61356d798c0f975804e66e8e5263a169/avereth-engine/src/v4/commands.js#L876-L911).

**Gegenbeispiel als reine Zustands-/Guardprobe:**
1. Zwei physische `quill`-Exemplare `a` und `b` liegen im selben Buchladen. Ein Verkäufer bietet „a quill, 2 cp“ an.
2. `displayedWare` findet zwei Kandidaten und verknüpft die Warenzeile **bewusst nicht**. Das ist im neuen Test `pilot01_k2_purchase_object.test.js` sogar als korrekt abgesichert.
3. Alaric kauft für 2 cp. `bookPurchase` erzeugt mangels Verknüpfung ein **drittes** Objekt und schließt das Angebot; `a` und `b` bleiben am Verkaufsort.
4. `wareOnSale` betrachtet ausschließlich Angebote mit `status:'open'`. Vor dem Kauf sind `a` und `b` geschützt; **danach ist beides `null`**, obwohl die beiden Quills im Laden liegen. `HANDLERS.take` hat für einen frei am Ort liegenden Gegenstand anschließend keinen Verkaufsschutz und kann ihn dem PC geben.

**Bewertung:** Der konkrete Primerkauf ist repariert. **D5 ist aber bei explizit erlaubtem Mehrdeutigkeitsfallback nicht vollständig geschützt:** Nach einem bezahlten Exemplar können weitere ausgestellte Exemplare kostenlos genommen werden. Ein abgeschlossener Kauf überträgt keine zusätzlichen gleichartigen Ladenstücke. Erforderlich ist nur ein **enger Schutz des verbleibenden Ausstellungsbestands**, auch wenn ein Angebot nicht eindeutig einem Stück zugeordnet werden konnte; keine neue Diebstahlmechanik und kein allgemeines Eigentums-/Inventarsystem aus diesem Fall ableiten. Regression rot gegen `.177`: zwei gleichnamige Ausstellungsstücke, nur ein Angebot, echter Kauf einmal, anschließend TAKE des verbleibenden Stücks; Echtgeld-/Coin-/Objektzahl und Save/Reload prüfen. Positiv: gekauftes Exemplar und ein fremdes, eindeutig **frei** liegendes Nicht-Verkaufsobjekt bleiben korrekt behandelbar.

**Weiterer P3-Randfall:** Beim Anlegen **mehrerer Zeilen desselben neuen Angebots** wird `displayedWare` für jede Zeile aufgerufen, bevor das Angebot gespeichert wird. Die bereits dieser neuen Zeilenliste zugewiesenen `line.object`-IDs stehen noch nicht in `s.offers`. Eine isolierte Probe mit **einem** ausgestellten Quill und **zwei** passenden Angebotszeilen ergab `[object:'q', object:'q']`. Die Regel „ein physisches Stück nicht mehrfach auf Angebotszeilen buchen“ wird damit nicht innerhalb derselben neuen Antwort geprüft. Ein zusätzlicher knapper Gegenfall kann mit R2 behandelt werden; keine separate Patchserie.

## 4. Weitere Befunde, nicht als Stopper auszugeben

### K3/D3: echtes Fortschrittssignal, aber NPC-Abruf weiter abgeschnitten

Sols dokumentierte Rekonstruktion des Pilotkontexts ergibt `gear_market` **19 → 4**, Budgetüberläufe **27 → 18**, `present` geliefert **25 → 30**, durchschnittlich **1689 → 1590** Tokens. Das behebt den belegten Fehlauslöser. `relevant` bleibt jedoch bei **2/65** gelieferten Abschnitten. In den verbleibenden überfüllten Zügen sind nach Sol `quests`, `resolved` und `guild_authority` wesentliche Last.

**Konsequenz für D3:** Die vereinbarte Vorher-/Nachhermessung ist jetzt erfolgt. `relevant`-Auslieferung bleibt eine **konkrete offene Design-/Effektivitätsfrage**. Sie ist nicht durch weitere Einsparungen am Gerätekatalog lösbar. Vor einer neuen Budgetregel sollten ein paar stark betroffene echte NPC-Gespräche gegen Compact-/`present`-/`relevant`-Abschnitte geprüft und die Kosten eines Prioritätswechsels gegenüber bindenden `quests`-/`resolved`-Angaben gemessen werden. **Kein** Budget pauschal erhöhen, keine E3-Verbesserung aus den jetzigen Zahlen erfinden.

### K4, K5a, K6b, D6: Technik ja, freie Modellbefolgung offen

Die Belege der geskripteten ST-Prüfung sind korrekt als Hostintegration gekennzeichnet. Ein tatsächlich freies Modell kann weiterhin:
- zu selten E3-Anker bilden oder das 80-Zeichen-Limit überschreiten;
- trotz geänderter `thread`-Summary eine neue Sache mit alter ID oder eine alte erledigte Sache offen lassen;
- einen bekannten Fuhrmann unter zweiter ID melden;
- eine Rudelgruppe ungünstig aufteilen.

Diese Fälle brauchen **einen neuen natürlichen Test nach gezielten P2-Korrekturen**, keine weiteren Generatoren/Funktionen vorweg.

### Replay-Akzeptanzen

Der neue Korpus-Index ist **nicht** pauschal aufgeweicht: 14 Fingerprints ändern sich in genau den behaupteten zwei Kategorien, alle vorherigen 1048 Einträge bleiben vorhanden, `returned` ist identisch. Eine eigene erneute Ausführung aller 2235 Replayfälle fand hier nicht statt; die Behauptung „2235 geprüft, 0 offen/alt“ bleibt Sols Implementiererabnahme.

## 5. Abnahmezuordnung und Empfehlung

| Nachweis | Status |
|---|---|
| 11 Produktcommits `.174` → `.177`, Build/Branch | **unabhängig per Remote-Git bestätigt** |
| K1–K8 Source/Diff, neue Regressionen, ST-Smokepfade | **unabhängig gelesen und fachlich geprüft** |
| Replay-Akzeptanzliste `.172` vs. `.177` | **unabhängig maschinell verglichen; exakt 14 kontrollierte Fingerprintänderungen** |
| Isolierte JS-Gegenproben R1/R2/Mehrfachzeile/Artwechsel | **durch GPT ausgeführt**, ohne vollständigen Hostfold |
| Sols Rot/Grün, 3033/3033 `npm test`, 2235 Live-Replayprüfungen, ST 168/0 und 173/0 | **Implementiererangaben, nicht von GPT erneut ausgeführt** |
| Neuer natürlicher Modelltest auf `.177` | **nicht vorhanden** |

**Empfehlung:** Die fachlich abgeschlossenen Teile K1, K3, K4, K6a, K7 und K8 nicht wieder öffnen. Ein **einziger enger Runner-/Engine-Korrekturauftrag für P2-R1 (rollenmehrdeutige Thread-Erledigung) und P2-R2 (D5-Besitzschutz nach mehrdeutigem Kauf)** mit den oben genannten Rot-/Grün- und Gegenfällen reicht. Den P3-Doppelbindungsfall dabei mitprüfen. Danach unabhängigen kurzen Diff-Nachreview und **erst dann** weiteren natürlichen NPC-/PULSE-Test auf dem korrigierten Stand. **Nicht** aus dieser Revision PULSE D, E4/E5, neuen Coin-/Diebstahlregeln, automatische NPC-Verschmelzung oder eine Erhöhung des Kontextbudgets freigeben.

**Kein Patch und keine Nutzerdesignentscheidung auf dem Produktbranch aus diesem Review.**
