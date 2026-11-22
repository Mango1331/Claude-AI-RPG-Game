# GPT – unabhängiger Produktdiff-Nachreview Build `.178` (Pilot 01)

**10.11.2026 · nur unabhängige Prüfung, keine Produktänderung.** Produkt-HEAD: [`c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e) (`4.3.0-c.6.6.178`); Basis [`.177`/`3658fbc`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3658fbcf61356d798c0f975804e66e8e5263a169). **Bezugsdokument:** [unabhängiger GPT-Produktdiff-Review `.175`–`.177`](REVIEW_175_177_PRODUKTDIFF_GPT.md) mit P2-R1, P2-R2 und P3; [Sols Patchnote `.178`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e/avereth-engine/docs/PILOT01_178_REVIEW_FIXES.md). Ursprünglicher natürlicher Lauf: [Pilot-01-Review](REVIEW.md).

## 1. Urteil

**R1 (Rollenidentität), R2 (Restware nach Angebotsabschluss) und P3 (Doppelverknüpfung) sind in den ursprünglich beanstandeten Fällen behoben.** Die `.178`-Änderung ist fachlich eng, ohne neue NPC-, PULSE-, Balance- oder Runtime-Systeme; die vorhandenen Positiv- und Negativregressionen tragen den vereinbarten Umfang.

**Neu entdeckter, eng abgegrenzter D5-Gegenfall:** Der Schutz behandelt mit `had_pc` auch **bereits an einen Händler verkaufte und von ihm erneut ausgestellte Ware** als weiterhin Alarics Eigentum. Dies kann ein kostenloses `take` der vom Händler angebotenen Ware ermöglichen. Die isolierte JavaScript-Gegenprobe mit der tatsächlichen Reducer- und `wareOnSale`-Bedingung ist reproduziert (§3). **P2-Prüfbefund der Handel-/Eigentumsintegrität**, kein belegter natürlicher LLM-Fall und kein Fehler der NPC-/PULSE-Engine. Eine kurze gezielte Regression und Korrektur ist angemessen; kein Generalumbau.

Ein neuer natürlicher NPC-/PULSE-Test auf `.178` ist **fachlich möglich**, wenn die D5-Restgrenze bewusst getrennt betrachtet wird. Wer eine uneingeschränkte Freigabe der Handelsintegrität vor dem Modelllauf verlangt, sollte zuerst diesen einen Gegenfall schließen.

## 2. Eigenständig geprüfter Umfang und Quellen

- Remote-HEADs beim Einstieg: `main` `4c187bd20769254453ce21bb3533461ee0629f2f` (bereits von Sol gepflegter Projektstatus); Produkt `c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e`. Vergleich `3658fbc...c2ef94d`: **3 Commits voraus, 0 zurück**. Nur `src/threads.js`, `src/v4/trade.js`, `src/v4/commands.js`, `src/v4/world.js`, 12 neue Testfälle, ST-Smoke-Erweiterung, Patchnote und Buildmetadaten.
- Vollständige gepushte Fassungen von `src/threads.js`, `src/v4/trade.js`, `tests/v4/pilot01_review_p2.test.js` und die relevanten `commands.js`-/`world.js`-/`domain.js`-Abschnitte gelesen. [Produktpatch `fe7454a`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/fe7454a), [`d033c1d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d033c1d), Build `c2ef94d`.
- **Isolierte eigene JavaScript-Gegenproben** der aktuellen `namedIn()`- und `wareOnSale()`-Entscheidungen: (1) „other clerk Bess“ nicht Anna, (2) „the clerk“ bei zwei Schreibern nicht Anna, (3) expliziter Name Anna zulässig, (4) einzigartige Rolle zulässig, (5) offen angebotene Ware geschützt, (6) abgeschlossene Restware geschützt, (7) ehemals dem PC gehörende, dann vom Händler wieder ausgestellte Ware **nicht geschützt**. Die Reducerwirkung von `object.moved` (`had_pc`) wurde dafür am aktuellen `src/v4/domain.js` abgeglichen. **6/7 Prüfentscheidungen dem Ziel entsprechend, 1 reproduzierter Gegenfall.**
- **Nicht von GPT in diesem Durchgang selbst ausgeführt:** `npm test` (3045), Korpus-Replay (2235), echter ST1.19-Smoke (170/175 Prüfungen), vollständiger Hostfold der neuen Verkaufsfolge oder ein natürlicher LLM-Lauf. Diese Zahlen bleiben Sols Implementiererangaben; der eigene Code-/Logikreview ist kein Ersatz.

## 3. Technischer Befund

### 3.1 R1: Abwesende Parteien – im vereinbarten Umfang geschlossen

[`src/threads.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e/avereth-engine/src/threads.js) prüft `name` und `known_name` als belegten Namensbezug. Ein generisches erstes Rollen-/Deskriptorwort zählt nur, wenn **keine andere lebende NPC-Person** dasselbe Rollenwort trägt oder im Bericht selbst namentlich erwähnt wird.

Die isolierte Gegenprobe bestätigt die zuvor beanstandeten Negativfälle:
- Anna (abwesend, `clerk`), Bess (andere Schreiberin, `clerk`), Bericht „The other clerk Bess settled a different debt“ → **Anna nicht erkannt**, kein gültiger Erledigungsbeleg.
- Bericht nur „The clerk settled it“ bei beiden → **mehrdeutig**.
- Explizit „Anna settled it“ oder eine einzige bekannte `clerk` → zulässiger positiver Bezug.

Die bestehende Grenze bleibt: Ein Bericht kann eine **andere Angelegenheit derselben Parteien** unter der alten ID melden, ohne dass die Engine den Unterschied semantisch sicher erkennt. Ebenso sind nur als Fakt gespeicherte Berufe nicht als Rolle berücksichtigt. Diese Grenzen sind in der Patchnote ehrlich benannt; aus dem geprüften Diff kein neuer Pflichtpatch für die allgemeine Threadsemantik.

### 3.2 R2: Angezeigte Restware – Originalfall geschlossen

[`src/v4/trade.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e/avereth-engine/src/v4/trade.js) `wareOnSale()` schützt nun bei `holder.loc === offer.at` auch nicht eindeutig zugeordnete **Reststücke nach Abschluss des Angebots**. Ein offenes Angebot bleibt vorrangig; bei geschlossenem Angebot wird ein neues benötigt. `commands.take` und `world.objectMove` nutzen denselben Schutz.

Die neue Testdatei prüft tatsächlich: zwei gleichnamige Quills, einer gekauft, andere weiter ausgestellt; Rest eines gekauften Stapels; nach Abschluss frei vom Händler aus der Hand gegebenes Geschenk; eigene früher abgelegte Ware; nie angebotener Gegenstand. Das ursprünglich beanstandete `take`-Loch ist dadurch geschlossen. Die vom Händler gehaltene Ware bleibt weiter vor einem normalen TAKE geschützt. Test/Smoke verwenden reguläre Host-/Spielpfade und Save/Reload für die Ladenkette, allerdings mit kontrollierten Antworten, nicht freiem Modell.

### 3.3 P3: Dieselbe Objekt-ID in zwei neuen Angebotszeilen – geschlossen

`displayedWare(...,{taken})` berücksichtigt nun die Objekte, die bereits einer **früheren Zeile derselben neu entstehenden Angebotsliste** zugewiesen wurden. Für ein ausgestelltes Exemplar und zwei Angebotszeilen entsteht die Zuordnung `[Objekt-ID, null]`, nicht `[ID, ID]`. Der negative/positive Test ist vorhanden; keine neue Mengenarchitektur.

### 3.4 Neuer P2-D5-Gegenfall: Historische PC-Provenienz ist keine aktuelle Eigentumsberechtigung

**Reproduktionsfolge, aus den aktuellen Produktbedingungen abgeleitet:**

1. Alaric besitzt ein physisches Objekt (etwa ein `Iron Sword`).
2. Er **verkauft** es regulär an den Schmied. `bookSale()` emittiert `object.moved` vom PC zum Käufer. Der Reducer in [`src/v4/domain.js`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c2ef94df9a0e95a8c5ee67ccf6167dfcfe591d3e/avereth-engine/src/v4/domain.js) setzt `had_pc=true`, sobald das Objekt aus Alarics Besitz bewegt wird. Das Flag bleibt eine historische Herkunftsmarkierung.
3. Der Händler legt die nun **ihm gehörende** Ware erzählerisch auf sein Regal (`object.moved` zu `{loc:'loc.smithy'}`). `world.objectMove` erlaubt Ortsablagen von NPC-Gegenständen; der Reducer lässt `had_pc` stehen.
4. Ein offenes Kaufangebot dieses Schmieds nennt genau dieses Objekt; `offer.lines[0].object` kann es rechtmäßig referenzieren.
5. `wareOnSale()` beginnt jedoch mit
   `if (!o || o.holder?.entity === 'pc' || (o.had_pc && o.holder?.loc)) return null;`.
   Damit gilt **vor** jeder Prüfung des offenen aktuellen Angebots `had_pc && holder.loc` als pauschale Ausnahme. Nach diesem Zweitverkauf-/Wieder-Ausstellungsablauf ist der Ladenschutz **null**. Ein `take` kann das schon verkaufte Schwert aus dem Regal wieder zum PC bewegen, ohne neuerlichen Kauf.

**Eigene isolierte Probe:** `pc → npc.smith` setzt `had_pc=true`; `npc.smith → loc.smithy` behält es; bei offenem, exakt objektgebundenem Angebot liefert `wareOnSale` **null**, der Sale-Guard von `commands.take` greift nicht. Dieser Nachweis benutzt die aus Code gelesenen Bedingungen, **keine vollständige Original-Host-Replaykette**. Die normale Ort-Zugänglichkeit muss dabei zusätzlich erfüllt sein.

**Bewertung:** Die neue `had_pc`-Ausnahme ist für den legitimen Fall „Alaric legt **seinen gegenwärtig eigenen** Quill neben einem offenen Angebot ab“ richtig. Das Flag bedeutet aber **„jemals beim PC gewesen“**, nicht **„nach dem letzten Besitzerwechsel von ihm selbst dort abgelegt“**. Die beiden Fälle dürfen nicht gleichgesetzt werden. Das ist eine eigenständige, begrenzte P2-Eigentumslücke im D5-Schutz; keine Aussage, dass jeder alte Ladenobjektfall betroffen sei.

**Enger Reparaturmaßstab:** Der Ladenschutz soll bei tatsächlich **an den Händler verkauften und erneut angebotenen** Stücken gelten, selbst wenn `had_pc` aus der früheren PC-Historie stammt. Gleichzeitig muss der Fall „PC kauft das eigene Quill, legt es selbst hin und hebt es wieder auf“ frei bleiben. Die Abgrenzung braucht die **letzte relevante Besitzer-/Ablagebewegung** bzw. vorhandene Herkunftsevidenz, nicht bloß das Sticky-Flag. Vor jeder Umsetzung einen minimalen roten Fall gegen `.178` mit `sale → Händler legt Ware aus → neues Angebot → PC-TAKE` und die positive Kontrolle `PC-drop → PC-TAKE` einschließlich Buchung/Reload ausführen. Kein neues Eigentumssystem, keine automatische Diebstahlmechanik, keinen Händlerblock auf Geschenke ausweiten.

**Nur als weiterer P3-Messpunkt:** Eine in einem früheren Angebot **objektgebundene**, aber an einen völlig anderen Ort gewanderte Ware könnte bei einem geschlossenen Angebot immer noch über `line.object === o.id && !!o.holder.loc` als „for sale“ gelten; die Angebotsortsbindung wird in diesem Zweig nicht geprüft. Nur wenn ein tatsächlicher End-to-End-Gegenfall entsteht, separat korrigieren. Nicht beide Fälle zu einem größeren Handelsumbau aufblasen.

## 4. Implementiererabnahme und Grenzen

| Sol-Bericht | Gemeldetes Ergebnis | Eigener GPT-Nachweis |
|---|---|---|
| Neue Regressionen | 7/12 auf `.177` rot, danach 12/12 grün | Testcode/Abgrenzungen gelesen; nicht erneut Node ausgeführt |
| Betroffene Suites | 185/185 | implementiert und dokumentiert; nicht eigenständig ausgeführt |
| Vollsuite | 3045/3045 | Implementiererangabe |
| Replay | 2235 Fälle, **0 Änderungen gegenüber `.177`**, 1057 akzeptierte Fälle, 0 offen/veraltet | Git-Diff enthält keine Replay-Akzeptanzänderung; keine neue Korpus-Neuberechnung |
| ST1.19 | Standard 170/0, Failsoft 175/0; neue D5-Ladenprüfungen mit Save/Reload | geskriptete Hostnachweise laut Sol, kein freier Modelltest |
| Produktumfang | drei Commits `fe7454a`, `d033c1d`, `c2ef94d` | Remotevergleich bestätigt genau 3 Commits |

**Unberührt:** K1/K3/K4/K6/K7/K8 von `.175`–`.177`; kein neues E3- oder PULSE-Liveergebnis, keine Änderung des NPC-Runners. B10 Abendessen gehört weiter in eine eigene Finanzprüfung.

### D3: `relevant`-Abruf bleibt gesondert offen

Die frühere Rekonstruktion für Pilot 01 zeigte nach K3 weiterhin **nur 2 von 65** ausgelieferte `relevant`-Abschnitte und 18 Züge mit Budgetüberlauf. `.178` verändert den Kontextcode nicht. Eine gezielte D3-Messung sollte an einigen realen sozialen Zugpaaren **`npc_compact`, `present`, `npc_continuity`, `relevant`, `resolved` und `quests`** gemeinsam vergleichen und den genauen Zielkonflikt belegen. Kein pauschaler Tokenbudgetanstieg und keine Prioritätsänderung aus dieser Review allein.

## 5. Entscheidungsvorschlag

**R1/R2/P3 für die bislang ausdrücklich nachgestellten Fälle: geschlossen.** `had_pc`-Wiederverkaufsfall: **ein kleiner, gesonderter P2-D5-Restfix** mit positiver PC-Drop-/Geschenk-Kontrolle; keine weitere Großreviewkette. Ein freier NPC-/PULSE-Modelllauf auf `.178` kann parallel als sozialer Test stattfinden, wenn dieser D5-Grenzfall als bekannter separater Handelsbefund festgehalten wird. Für eine **uneingeschränkte** D5-Freigabe sollte der letzte Besitzwechsel vorher abgesichert werden.

Der aktuelle Produktstand `.178` wurde nicht geändert. Dokumentation/Reviews nur auf `main`.
