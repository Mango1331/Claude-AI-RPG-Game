# NPC/PULSE-Pilot 01 – unabhängiger Review des natürlichen .174-Laufs

**Run:** 09.11.2026, 16:02:50 UTC; `20261109-160250Z-npc_pulse_test`. **Review:** GPT, 09.11.2026. **Engine:** `4.3.0-c.6.6.174`; **Runner-/Produktcommit:** [`2a8b54e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc); **Profil:** `npc-sociable`, Warrior, Seed `158018991`, echter Provider, kein Stub. Die 14 unbearbeiteten Originaldateien (einschließlich Chat, sämtlicher 223 ST-Requests und beider Serverlogs) sind verlustfrei unter [originals/originals.tar.xz](originals/originals.tar.xz) archiviert. Detailnachweise: [Quellenmanifest](SOURCE_MANIFEST.md) und [unabhängige Messdaten](PROBE_RESULTS.json).

**Zählregel:** T1–T70 bezeichnet die tatsächlich gesendeten 70 Spielereingaben, I0–I140 die nullbasierten Chatnachrichten (JSONL-Metazeile nicht mitzählen). I0 ist die Begrüßung; deshalb kann der Nutzer den Lauf informell als „71 Turns“ zählen. Berichte des Runners (`originals/report.md`, `originals/npc-pulse.md`) sind Originalquellen, nicht der unabhängige Review. LLM-Spielerreaktionen aus `player.jsonl` sind kein persönliches Spielgefühl-Feedback des Nutzers.

## 1. Urteil und Prioritäten

**Der erste natürliche NPC-/PULSE-Lauf ist technisch erfolgreich und für PULSE A sowie NPC E2-B aussagekräftig. Er belegt aber mehrere echte semantische Zustandsfehler. NPC E3 wird in diesem Lauf nicht natürlich abgenommen.**

Positiv: Der Warrior nimmt Gildenaufträge an, erledigt eine Jagd samt Auszahlung, findet die nächste Dungeonquest, reist in Begleitung von NPCs und erlebt auf dem Weg geöffnete PULSE-Hindernisse, Begegnungen und Gefahr. Die Engine begrenzt zusätzliche feindliche Gruppen und setzt zwei fehlgeschlagene Plannerzüge fort. Das ist ein tatsächlich freies Modellspiel, kein geskripteter ST-Smoke.

Negativ und unabhängig aus Chat, Events und Roh-Extraktion belegt: **(P2)** Eine alte Schuld-/Absprachen-ID wird bei einem anderen Schuldverhältnis wiederverwendet; **(P2)** für einen bezahlten Primer entstehen zwei physische PC-Gegenstände; **(P2-Kandidat)** ein Fuhrmann wird als zwei IDs geführt, die später gemeinsam als Parteien derselben Reisevereinbarung auftauchen. Die drei Gildenbearbeiter-Belege werden vollständig verworfen. Trotz zahlreicher Gespräche entstehen **0** E3-Persönlichkeitsanker.

**Bewertung:** Der Run ist kein PULSE-/NPC-Gesamtabschluss. Als nächstes die eng belegten E2-/Objektfehler prüfen, danach die natürliche E3-Abdeckung gezielt verbessern. Keine automatische Freigabe für E4/E5, PULSE-D-Parameter, neue Balance oder einen großen Generalpatch.

## 2. Umfang und überprüfte Integrität

| Merkmal | Originalbefund und unabhängige Einordnung |
|---|---|
| Chat | **141 Chatnachrichten**, 70 Userinputs und 12 Systemnachrichten; L1-Warrior (Heavy Slash, Guard) |
| Eventoriginale | **1.076 Engineevents in 130 exportierten Gruppen**. Unabhängiger Strukturvergleich: **130/130** identisch mit den in `chat.jsonl` eingebetteten Events |
| Abschluss | `run.json.end.kind=done`, Dauermeilenstein `open_run_duration` T70 erreicht. Der PC ist dabei **mitten in einem Goblin-Dreierkampf**, nicht tot und nicht mit der Dungeonquest fertig |
| Stateintegrität | Archivierte `evaluation.json`: **0 Foldfehler, 0 Validatorprobleme, `integrity.ok=true`**; keine PageErrors, `protection.unchanged=true`, `secretHits=0`. Kein neuer eigener vollständiger Node-Fold/Validator-Lauf durch GPT |
| Progression | Warrior **L2**, Schluss **63/105 HP**, 64/64 MP. Siege: Gnasher T14 und Lead Feral Dog T20–21; Kampf gegen drei Goblin Scouts seit T67 offen |
| Verträge | `Cull the Millpond Gnasher` T7 aktiv, T14 READY, T24 abgeschlossen (+40 cp, +115 XP); `Clear Mossback Warrens Level 1` T26 aktiv, Etage 1 T65 betreten, noch offen |
| Modellrequests | **223** tatsächliche ST-Aufrufe: 83 Planner, 75 Extractor, 63 Narrator, 2 Board. Dazu **81 LLM-Spieleraufrufe für 70 Eingaben**, darunter 11 JSON-Reparaturversuche; insgesamt 304 dokumentierte Spiel-/Spieleraufrufe ohne gesonderte Verbindungsprobe |
| Recovery | Runner: **2 sichere Planner-Fehlversuche mit Fortsetzung** T38 und T54, 17 Planner-Reparaturhinweise, 12 Extractor-Reparaturen, vier `finish_reason=length`-Meldungen, ein Planner-Transport-Recovery. Kein terminaler Modellausfall |
| Zeit | 4.527.837 ms **75,46 Minuten** Runnerlauf; modellierte Weltzeit 2.085 Minuten (34 h 45 min) |
| Abdeckungsbericht | 28 automatische Beobachtungsziele: **17 berührt / 11 nicht abgedeckt**; automatische Regelverletzungen 0. **Beobachtung ist nicht gleich Bestehen der semantischen Regel** |

**Evidenzgrenzen:** Die technische Validierung wurde im archivierten echten Run aufgezeichnet, aber von GPT nicht erneut mit einem vollständigen Repo-Checkout ausgeführt. Dagegen sind ZIP-CRC, Datei-Hashes, 130/130-Gruppenabgleich, Geldledger und die unten genannten einzelnen Thread-/NPC-/Objektereignisse unabhängig aus dem Original geprüft. Die frühere `.174`-Abnahmezahl wird nicht als neue Prüfung wiederholt.

## 3. Natürlicher Verlauf im zeitlichen Zusammenhang

**T1–7 – Eintritt in die Gilde.** Normale Charaktererstellung. In Ashbridge T3 erstmalige Einführung der namenlosen, aber persistenten Schreiberin `npc.npcashbridge_clerk`; T5 Registrierung für 20 cp, T7 Jagdauftrag Millpond Gnasher angenommen.

**T8–14 – erste natürliche PULSE-Wirkung.** T8 eröffnet ein Reisefenster mit `obstacle`: überfluteter Mühlkanalweg. Der Spieler sucht den Weg um das Wasser, bittet den Bauern um Weideerlaubnis und tötet T14 den Gnasher. `quest.ready` ist tatsächlich gebucht.

**T15–24 – Kontakte, Mitfahrt und Hundekampf.** Ein Fuhrmann mit Karren erscheint T15 durch ein `meeting`. T16 verspricht Wat Dodd eine kostenlose Rückfahrt (`thread.t16.1`). T17 besucht Alaric Widow Hessa, T18 erhält er Brot und Butter; T19 löst PULSE `danger` mit wilden Hunden aus. Nur die berechtigte Feindgruppe kann angreifen; Flanker werden begrenzt. T21 Sieg über den Leithund, T23 Fahrt/Absprache abgeschlossen, T24 Gildenabgabe mit richtiger Belohnung.

**T25–43 – neue Dungeonquest, Geld und Ware.** T26 nimmt der Warrior die Warrens-Clearance an. Er verfolgt danach einen Primer, besucht Geldwechsler und Tannerei, verkauft T40 zwei Felle für 14 cp und kauft T42 einen Primer für 30 cp. Der angebliche Geldwechsel T30 wird nur erzählt, nicht gebucht. T43 wandert zusätzlich das bereits vorhandene Vitrinen-Objekt zum PC: doppelte Primer-ID, siehe §6.

**T44–61 – Muller und zweiter Fuhrmann.** Der Gildenclerk nennt einen möglichen privaten Zusatzlohn für den Gnasher. Im Woolpack findet der Spieler Muller, verkauft T48 zwei Fänge gegen 4 cp und spricht mit ihm über das Millrace-/Goblinsproblem. T58 wird Mullers **neue persönliche 40-Silber-Schuld an Garvin Hesse** fälschlich unter der alten ID des privaten Gnasherlohns fortgeschrieben (§4.2). Ein weiterer Carter bietet eine Fahrt zum Cairn für den Morgen an; im Verlauf erscheinen zwei NPC-IDs desselben Fuhrmanns (§4.3). T55 bezahlt Alaric sein Gasthausbett, T61 fährt er mit.

**T62–70 – Warrens.** Über den Müllerhof und das Wegstück am Cairn zum Dungeoneingang; T65 betritt er Floor 1. Der Narrator beschreibt drei Goblins und deren unmittelbaren Angriff, der Extractor versucht die Gruppenantwort zu buchen; die Firewall weist die Hostile-/Intent-Meldungen aufgrund des aktuellen Angriffsrechts zurück. T66 ist der schwere Erstschlag aus zu großer Entfernung nicht ausführbar, T67 beginnt ein tatsächlicher Kampf. **T70 ist das Dauerziel erreicht, aber der Kampf noch offen.**

## 4. NPC E2 – positiver Nachweis, aber ernsthafte Identitätsfehler

### 4.1 Belegte funktionierende E2-Ketten

- Dieselbe Schreiberin wird bei späteren Ashbridge-Gildenbesuchen wiedergeführt: drei gespeicherte Rückkehrspannen T26, T33, T43, darunter eine erfolgreiche `met`-Meldung. T43 erkennt sie Alaric als „Red“, weiß um den erledigten Gnasher und die offene Warrensquest. **Natürliche narrative Wiedererkennung** positiv; nicht verwechseln mit der gesonderten `handled_by`-Wissensbuchung.
- Der persönliche Thread über Dodds Mitfahrt T16 wird T21 aktualisiert und **T23 erledigt**. Diese Abrede ist mit einer tatsächlich erzählten Handlung und einem formellen Threadabschluss unterlegt.
- Der T50 angelegte zweite Reisethread wird T61 als erledigt gespeichert, allerdings mit zusätzlicher, zweifelhafter NPC-Partei (§4.3).
- 17 Antworten mit mindestens zwei anwesenden NPCs, sechs Ankunftskarten, drei begleitete Ortswechsel. Die Engine verweigert verschiedene unbelegte Präsenz-/Namensmeldungen erfolgreich, besonders T63/64 die Verwechslung „miller“ mit dem weiter entfernt bekannten `npc.muller`.

### 4.2 P2: Falsche Absprachenidentität – derselbe Thread für fremde Schuld

**Originale: T36/I72, T44/I88, T58/I116; `thread.t34.1`.** An T36 erzählt eine Anwohnerin, Muller habe **Kupfer für denjenigen versprochen, der den Millpond Gnasher erledigt**. Daraus entsteht ein `debt`-Thread; die angebliche Gegenleistung war bei Muller selbst noch nicht bestätigt. Der Clerk verweist T44 auf das mögliche private Angebot.

T58 spricht Muller erstmals über **einen anderen Sachverhalt**: Er hat von **Garvin Hesse 40 Silber geliehen**, um den Damm zu reparieren; wegen Goblins fehlen ihm Einnahmen und die Mühle droht verpfändet zu werden. Der Extractor liefert dennoch erneut **`id:"thread.t34.1"`** und ersetzt den Text über den möglichen Gnasher-Zusatzlohn durch die Schuld an Hesse. Zusätzlich wird **`who:["npc.muller","pc"]`** gesetzt, obwohl Alaric kein Gläubiger der 40-Silber-Schuld ist.

Die zwei Absprachen sind nicht identisch – anderer Schuldgrund, andere Gegenpartei und anderer Betrag. **Eine echte semantische Threadkontamination im formal gültigen State.** Einstufung **P2** für gezielte Untersuchung des `.173`-E2-B-R7-ID-/Parteien-/Eindeutigkeitsschutzes; hier hat das Modell eine bereits bestehende ID ausdrücklich wiederverwendet. Keine pauschale neue Matchingheuristik beschließen, bevor die genaue Zulässigkeitsprüfung des ID-Updatepfads geprüft ist.

### 4.3 P2-Prüfkandidat: Doppelter Fuhrmann und Parteienvermischung

T49/I98 wird der Peat-Carter in der Woolpack-Schenke als **`npc.npccarter_woolpack`** angelegt. T50 nimmt der Spieler dessen Angebot für den nächsten Morgen als persönlichen `thread.t47.1` auf. T60/I120 legt der Extractor den am selben Wagen arbeitenden Fuhrmann nochmals als **`npc.carter`** an. T61/I122 verwirft die Engine dessen Benennung „Torv“ wegen `scene_context`, und die Thread-Erledigung enthält anschließend **drei** Parteien: `npc.npccarter_woolpack`, `pc`, `npc.carter`.

Die unmittelbare zusammenhängende Erzählung spricht für dieselbe Person. Das ist ein **konkreter P2-Ursachenkandidat** zur NPC-Objektidentität/Ankunft und zum `who`-Update. Eine zusätzliche Carter-ID als Originalevent ist gesichert, ein allgemeiner Duplikationsfehler für alle Fuhrleute daraus nicht.

### 4.4 Gildenbearbeiter: 0/3 angenommene `handled_by`-Belege

Der Runner zählt **drei `desk_handler`-Ablehnungen**, keinen akzeptierten Gildenbearbeiter. Die echten Questannahmen und Auszahlungen sind trotzdem korrekt.

- **T7/I14:** Der Extraktor beginnt die Bearbeiterevidenz mit „She dipped the quill ...“; ohne vorgängigen Namensbeleg zu unspezifisch.
- **T24/I48:** Die Schreiberin erscheint der Firewall nicht als tatsächlich anwesende berechtigte Gildenperson am Desk. Gleichzeitig wird ein angebotener `manner`-Anker als `anchor_absent` zurückgewiesen.
- **T26/I52:** Der Extraktor verwendet eine nicht passende Clerk-Referenz und nennt überwiegend gesprochene statt erzählte Handlungsevidenz.

**E2-A-Ziel personengebundenes Bearbeiterwissen in diesem natürlichen Lauf nicht erreicht.** P2/P3-geführte Prüfung der Prompt-/Evidenz-/Präsenzkette; Firewall nicht vorschnell lockern. Die Ablehnung des falsch wiedererkannten „millers“ T63/T64 zeigt, warum konservative Präsenzregeln wichtig bleiben.

### 4.5 Hearsay, Personen und Threads nicht blind gleichsetzen

T11/I22 führt der Extractor **Widow Hessa bereits während eines Bauernberichts über sie** als eigene NPC-Entität an den Reed Banks ein und eröffnet einen `promise`-Thread über ihren Hilferuf und ihre Sehbehinderung. Ein berichteter Zustand ist aber keine getroffene Zusage. Beim späteren erzählten Treffen T17 wird `met` mangels belegter korrekter Anwesenheit verworfen. Die spätere Bindung des alten Threads an `pc` macht daraus noch keine klar belegte persönliche Vereinbarung. **Weiterer begrenzter semantischer Kandidat für Hearsay → NPC/Thread**, nicht automatisch ein allgemeiner Fehler der Ortsverwaltung.

Andere `met`-, `npc_presence`-, `npc_continuity`- und `scene_context`-Ablehnungen sind als Beweise für die Schutzregeln einzeln zu lesen, nicht als pauschale Misserfolgszahl. Die 14 `npc_first_meetings` des automatischen Berichts umfassen namenlose Rollen sowie die möglicherweise doppelte Carter-ID; die Anzahl ist keine Qualitätsmetrik für 14 verschiedene wiedererkennbare Charaktere.

## 5. NPC E3: nicht abgedeckt, nicht als defekt bewiesen

**Null** gespeicherte `voice`-, `manner`-, `interest`-Anker, **null** Änderungen und **null** spätere Ankerkarten. Die fünf E3-Messziele im `npc-pulse.json` sind deshalb `not covered`. Ein `manner`-Versuch am Desk T24/I48 ist **`anchor_absent`**, nicht `anchor_first_contact` und nicht `anchor_mood`. Das Modell hat kein regelgerecht angenommenes Merkmal produziert.

Der LLM-Spieler spricht viel mit Personen, trifft aber die meisten sozialen Kontakte nur einmal und verbringt lange Zeit mit Handel. Rückkehrer sind vor allem die namenlose Guild-Clerk-Figur, gerade dort bleibt die Anwesenheits-/Evidenzkette problematisch. So entstehen wenige saubere E3-D2/D3-Ketten aus eigener bleibender Eigenschaft und **späterer belegter Wiederbegegnung**.

**Folgerung:** Der neue natürliche Modelltest beweist weder E3-Befolgung noch E3-Versagen. Der mögliche 170-Zeichen-Kartenverlust aus dem [früheren E3-Gegenreview](../../patch_plans_10b/REVIEW_NPC_E3_174_PRODUKTDIFF_GPT.md) wird ohne gespeicherte Anker ebenfalls nicht gemessen. Nächster sozialer Lauf: freie, aber bewusst wiederkehrende Begegnungen mit bereits bekannten Personen begünstigen; keine vorgeschriebenen NPC-Reaktionen oder gespeicherten Anker erzwingen.

## 6. PULSE A/C/B: tatsächliche natürliche Modellwirkung

| Messpunkt | Natürlicher Befund |
|---|---|
| Echte `pulse.rolled` | **44**: 26 scene/inside, 9 travel/travel, 7 scene/wild, 1 scene/street, 1 pause/inside |
| Offene Fenster | **8/44 = 18,2 %**, davon **7 `narrated:likely`**, **1 `narrated:none`** nach Engineheuristik (nicht unabhängiger semantischer Vollbeweis). 1,14 offen je zehn Eingaben |
| PULSE-Reiseereignisse | T8 Überschwemmung (`obstacle`), T15 Fuhrmann (`meeting`), T19 wilde Hunde (`danger`), T36 Frau und Kind auf Tannery Row (`meeting`) |
| Zusätzliche offene Fenster | T46 `life` nicht erkennbar umgesetzt; T49 `meeting`, T61 `life`, T62 `meeting` |
| Sicherungsbeispiele | T19 `road`: zwei flankierende Hunde dürfen nicht unautorisiert als zweite Gruppe angreifen; T65 `pulse`: drei Dungeon-Scouts dürfen aufgrund eines nicht geöffneten Fensters nicht in derselben Antwort einen sofortigen feindlichen Zug buchen |
| Nicht getestet | PULSE-Wurf **innerhalb** des Dungeons = 0, Rastunterbrechung = 0, Dungeonwanderung = 0. Auf Dungeonankunft T65 folgen nur Kampfzüge |

Das Hochwasser um die alte Straße ist ein besonders gutes neues Beispiel für **weltweite Handlungskonsequenz ohne reinen Kampf**: der Spieler sucht einen Umweg, spricht mit dem Bauern und erhält eine neue Handlungskette. Ebenso erzeugt die Karrenbegegnung ein organisches Transportangebot.

**T19** belegt echte Gefahrensteuerung: die engineberechtigte Hundeszene liefert eine kämpferische Situation, aber nicht beliebig viele zusätzliche Angreifer. **T46** zeigt dagegen ein geöffnetes `life`-Fenster ohne sichtbaren narrativen Gebrauch (`none` in der Originaldiagnose). **Acht** Runner-Hinweise `new_world_content_in_closed_window` betreffen häufig **aktiv aufgesuchte Bauern, Händler und Wirte**; ohne Prüfung der tatsächlichen Such-/GO-Handlungen sind das **keine acht bewiesenen unerlaubten Spawns**.

**PULSE D bleibt offen:** Eine einzige Seed-/Figurenserie mit 44 Würfen, acht Fenstern und nur einer geeigneten Pause ist keine Basis für statistisch belastbare Parameter-, Cooldown- oder Dungeondichte-Entscheidungen. Keine Änderung an `rules.json` aus dieser Stichprobe ableiten.

## 7. P2-Objektintegrität: zwei Primer für einen bezahlten Kauf

**Quelle: T41/I82, T42/I83–I84 und T43/I85–I86.**

- T41 legt die freie Welt einen existierenden Primer in der Buchladenvitrine an: **`obj.t82.primer`**, noch am Shop-Ort.
- T42 bezahlt der Spieler **30 cp**; eine einzige `transaction.completed` und `coin.changed:-30` werden gebucht. Der Kaufpfad erstellt aber **`obj.t83.primer`** neu beim PC, statt die bereits angelegte Waren-ID zu übernehmen.
- T43 steckt Alaric laut Erzähler den gekauften Primer ein; die Extraktion bewegt jetzt zusätzlich den Vitrinenprimer **`obj.t82.primer`** zum PC. Die Narration sagt sogar, der Primer liege „beside its twin“.

**Nachweis:** Zwei physische Objekt-IDs für denselben einmal bezahlten Gegenstand, beide beim PC. Kein doppelter Münzabzug und keine nachgewiesene doppelte Lernwirkung. **P2** wegen realer Duplikation trotz formal gültigen States.

Beim älteren [Batch28-Hessa-/Hemd-Fall](../batch-20261103-171839Z/REVIEW.md#3-rüstungsidentität-153-übergabe-funktioniert-rückgabe-verliert-den-objektkontext) gab es ebenfalls doppelte Objektidentität nach einer erzählten Rückgabe; das ist ein verwandtes Symptom, aber nicht automatisch dieselbe Ursache. Diesen Kauf-/Objektübergang eng mit vorhandener ID, Angebotsauflösung, `object.created` und nachfolgendem `object.moved` nachstellen.

### 7.1 Geldledger: tatsächlich konsistent, obwohl das Modell sich irrt

```
Start                           50 cp
T5 Registrierungsgebühr        -20 cp = 30
T24 Gnasher-Gildenlohn         +40 cp = 70
T40 Pelzverkauf                +14 cp = 84
T42 Primer                     -30 cp = 54
T48 Verkauf zweier Fänge        +4 cp = 58
T55 Bett                        -3 cp = 55
Endstand                                  55 cp
```

Der Geldwechsler beschreibt T30 eine Auszahlung von Kupfer, **ohne** passende `coin.changed`-/`transaction.completed`-Buchung. Der LLM-Spieler vermutet danach, 95 cp und später die 14 cp aus dem Fellverkauf fehlten. Diese Vermutungen sind **durch das unabhängige Ledger widerlegt**: 7 Silber bedeuten 70 cp, 5 Silber 4 Kupfer bedeuten 54 cp, und der Fellverkauf ist gebucht. Es bleibt eine konkrete **freie Erzählung behauptet Geldwechsel ohne Enginebuchung**; nicht als fehlenden Verkaufserlös umdeuten.

## 8. Runnerverhalten, Spielgefühlgrenze und technische Kosten

Der Test-LLM-Spieler agiert weitgehend organisch: höfliche Gespräche, Verhandlung, Wunsch nach gemeinsamen Fahrten, unabhängige Questwahl und situative Reaktion auf Bedrohung. Die gemeinsame Mitfahrt ist **kein natürlicher Beleg für eine als Kampfgruppe angenommene Questparty**. Für den Auftrag „Freund oder Gegner nach eigenem Urteil“ gibt es positive Interaktionsvielfalt; das Modell muss keine Feindseligkeit erzwingen.

Der lange Handelsteil bindet viele Spielzüge. Das dauerbasierte Guideziel wurde erreicht, obwohl der erste Dungeonkampf noch offen ist. Ein `done` bei T70 ist deshalb **kein World-Clear**, sondern nur die erfolgreiche Runner-Stoppbedingung. Die 11 LLM-Spieler-JSON-Reparaturen sind von den 17 Planner-/12 Extractor-Reparaturen zu trennen; 304 dokumentierte Modellrequests belegen die realen Testkosten. Die technisch sichere Fortsetzung der Plannerfehler ist positiv, ein Run mit zahlreichen Repairs aber nicht „fehlerfrei“.

`player.jsonl` enthält eigene Beobachtungen zum vermeintlich stale HUD, zu Coinwerten und zur Clerk-Wiedererkennung. Diese sind **spontane LLM-Spielerbeobachtungen** und deshalb nützlich für UX/Spielerführung, jedoch nicht mit den unmittelbaren persönlichen Gefühlen des Nutzers zu vermischen. Nur der originalbelegte Verlauf und die gespeicherten Buchungen entscheiden technische Claims.

## 9. Empfohlene Reihenfolge (nur Analyse, keine Implementierungsfreigabe)

1. **P2 Thread-ID `t34.1` T36→T58:** Semantisch neue 40-Silber-Schuld an Hesse darf den Gnasher-Privatprämien-Thread nicht überschreiben. Den konkreten `.173`-R7-ID-/Parteienpfad prüfen; das Modell nennt hier die vorhandene ID ausdrücklich. Kein vorsorglich völlig neues Threadsystem.
2. **P2 Doppelprimer T41–43:** Korrekte Objektidentität beim bereits vorhandenen Vitrinenobjekt und nachfolgendem TAKE sicherstellen; zugehörige Transaktion weiterhin genau einmal.
3. **P2-Kandidat Peat-Carter T49/T60/T61:** Wiedererkennung/Entität-/Ortsbindung, abgewiesene Benennung „Torv“ und zusätzliches Thread-`who` gezielt prüfen.
4. **E2-A 0/3 Bearbeiter:** Pronomen-/Sprecher-/Anwesenheitserkennung anhand der drei konkreten abgewiesenen `handled_by`-Meldungen untersuchen, **konservative Firewall beibehalten**.
5. **E3 natürliche Nachprüfung:** Einen weiteren, weiterhin freien sozialen Lauf mit bewussteren späteren Begegnungen statt einer neuen langen Handelskarriere. Keine Anker künstlich injizieren.
6. **PULSE D separat:** Erst nach mehr natürlichen Dungeon- und Rastbelegen Parameter diskutieren; dieser Run belegt PULSE A, aber kaum PULSE C/B.
7. **Kleinere UX-Notizen:** Geldwechsler-Zusagen ohne tatsächliche Buchung und Runner-`done` mitten im Kampf bei nächster passender Arbeitsphase berücksichtigen, ohne aus einem Einzelrun ein neues Regelpaket abzuleiten.

**Gesamturteil:** Die neuen natürlichen Tests sind wertvoller als weitere reine Smoke-Wiederholungen: PULSE A wirkt sichtbar, während in formal integren Zuständen Vertrags-, Personen- und Objektidentitäten im freien Modellspiel auseinanderlaufen. Die Priorität liegt auf **engen Ursachenanalysen an echten Originalantworten** und danach einer E3-fokussierten Wiederbegegnungsprobe. Produktstand bleibt `.174`; dieser Commit dokumentiert ausschließlich Testquellen und Review.
