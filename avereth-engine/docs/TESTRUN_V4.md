# Testrun-4: Auswertung

**Quelle:** der dritte echte Lauf mit der Engine, Stand `e060629`: Lorebook v0.11 als Character Lore, Vertrag 3.1, max_tokens 8.192. 15 Züge:
- Charaktererstellung;
- Lumenford, Westtor;
- Gildenhalle mit Registrierung und Aushang;
- Malzhauskeller mit Kampf;
- Bezahlung beim Malzmeister, zurück zur Gilde.

Drei Artefakte:
- Chat-Export (JSONL, 31 Nachrichten mit `extra.avereth`);
- Event-Log-Export (29 Records, 163 Events);
- SillyTavern-Konsolen-Logger (16 Requests, 15 Responses).

**Logger:**
- **Zug 8 wurde neu generiert.** Der Chat behielt den zweiten Versuch. Der erste gab Alaric den falschen Auftrag (Wolfsjagd statt Ungeziefer) und liegt als `discarded_turn8` in der Fixture.
- **Zug 15 fehlt im Logger.** Der Logger endet mit dessen Request. Den Report baut die Fixture aus den gespeicherten Events und Ablehnungen nach (gleiche Schlüssel, Werte und Ablehnungen).

**Determinismus-Beleg:** Der Replay mit dem Code des Laufs reproduziert den Event-Log **exakt**: alle 29 Records, auch mit dem rekonstruierten Report.

## Setup

| Punkt | Wert |
|---|---|
| Modell | `zai-org/GLM-5.3-Flash`, reasoning high, max_tokens 8.192, temperature 0.9, kein Streaming |
| Host | Megumin-Preset mit `<Blocks>`-Trackern und einer Bann-Liste (darunter „Ledger“) |
| Avereth | Engine `e060629`, Vertrag 3.1, Lorebook v0.11 als Character Lore, „World lore“ = Auto |
| Prompt | 15,4k–26,4k Token gesamt; Engine-Block 1,1k–2,3k Token; World Info 600–1.830 Token |

Keine Antwort wurde abgeschnitten (alle `finish_reason: stop`). Die Einstellung aus Testrun 3 (8.192 statt 4.096 Token) wirkt.

## Verlauf

| Zug | Eingabe (gekürzt) | Engine | Befund |
|---|---|---|---|
| 1–2 | Ranger; Aimed Shot + Power Shot | Erstellung korrekt | sauber |
| 3 | geht zum Stadttor | zwei Torwachen per `new`, Fakt „Fußgänger frei“ | GLM lässt einen Fuhrmann „aus Ashbridge“ kommen. Der Name stammt aus einem Beispiel im Vertrag (**Fehler 9**). |
| 4 | geht hinein, sucht die Gildenhalle | – | **kein Report** (GLM plante ihn im Reasoning und ließ ihn dann weg). Serah, Maretta, Drennik und der Tempelwächter fehlen der Engine. |
| 5 | stellt sich vor: „Alaric no family name“ | Serah per `new` | Der Name „Alaric no family name“ wird ein **falscher Glaube** Serahs (**Fehler 7**) |
| 6 | 18, Ranger, zahlt 2 Silber, Hand auf die Tafel | Coin −20 cp, Marke als Item | Die Marke erscheint als `guild_registration_tag_lead_stamped_numbered` (**Fehler 8**) |
| 7 | geht zum F-Rang-Aushang | 5 Aufträge, alle Novice mit Level und Typ | Lorebook-Aushang greift: nur Aufträge des eigenen Rangs, kein Level im Text. Maretta nur im `memory` genannt, bleibt unbekannt (**Fehler 5**). |
| 8 | „I take the Vermin in the Malthouse Cellar Quest … then travel there“ | – | **kein Report** (zweiter Versuch). Der erste Versuch gab Alaric den Wolfsauftrag. Die Engine hätte beide Annahmen abgelehnt, weil das Muster „take the … quest“ nur **ein** Wort dazwischen erlaubte (**Fehler 1**). |
| 9 | „ill take a look“, steigt mit dem Bogen hinab | Kreatur per `new`, Angriff gemeldet; Kampf-Vorschau | Probe mit `actor: "Alaric"` statt Zahl abgelehnt (**Fehler 10**). Fennick, der Malzmeister, bleibt unbekannt. |
| 10 | „i aim and Power Shot at it“ | Biss verfehlt (77 > 75), Power Shot verfehlt (68 > 63), Biss trifft 3 | **kein Report** (kurze Kampfantwort ohne Report und Boxen). Fennick kommentiert von der Treppe (**Spielernotiz**). |
| 11 | „i kite backwards and Power Shot again“ | Power Shot verfehlt (65 > 63), Biss trifft 3 | **Der Rückschritt wird ignoriert** (**Fehler 6**) |
| 12 | Power Shot | verfehlt (91 > 63), Biss trifft 3 | dritter Fehlschuss in Folge |
| 13 | „jump backwards as i aimed shot at the second one“ | Aimed Shot trifft (37 ≤ 83), 24 Schaden, Ratte tot, +10 XP | `aware: fennick` abgelehnt, weil nie eingeführt (**Fehler 5**) |
| 14 | schleppt die Leiche hoch, zurück zur Gilde | Coin +36 cp **und** Item „silver“ ×3 | **Geld doppelt gebucht** (**Fehler 2**). Die tote Ratte „steht“ danach in der Gildenhalle (**Fehler 3**). Die Quest-Annahme aus Zug 8 wird als nicht autorisiert abgelehnt (Fehler 1). |
| 15 | „Partly one dead one fled“ | Coin −4 cp (Anteil der Gilde) | Serah hört zu, ist laut Engine aber abwesend (**Fehler 4**). Quest wieder abgelehnt, Ortswechsel zum Tresen abgelehnt. |

## Was funktioniert hat

- **Kampfmechanik:** alle Würfe nach Core #10/#11, siehe unten. Kampf-Vorschau vor dem ersten Wurf, Anzeige jeder Runde (Rückmeldung des Spielers: „Combat hat sich besser angefühlt“).
- **Lorebook:** Realm und Stadt in jedem Zug (Lore-Bridge). Gilden-Einträge nur in der Gilde, die Quest-Gerüste und der Aushang-Eintrag am Aushang. Die Tempel- und Pilgerszene passt zum Realm Ilyrion. Der Aushang hielt sich an den neuen Eintrag: fünf Aufträge des eigenen Rangs, kein Level im Text, Rang in der Anzeige (`QUEST OFFERED — … (Novice)`).
- **World-Info-Nachbau bestätigt:** In 14 von 15 Zügen aktiviert `tools/wi_sim.mjs` genau die Einträge, die im echten Prompt standen. Einmal passte beim echten Tokenizer ein Eintrag mehr ins Budget.
- **Quest-Ränge:** Alle fünf Aufträge kamen mit passendem Level im Novice-Band.
- **Coin:** Registrierung 50 → 30 cp, Lohn +36 cp, Anteil der Gilde −4 cp. Die Rechnung stimmt (bis auf die Doppelbuchung, Fehler 2).
- **Keine abgeschnittenen Antworten** mit 8.192 Token.

## Die Kampfrechnung (Spielernotiz „sehr viele Misses“)

Jeder Wurf nachgerechnet:

| Wert | Regel | Lauf |
|---|---|---|
| Alarics Trefferbasis | Core #10: 70 + PER × 0,5 = 70 + 3 | 73 % |
| Power Shot | Hit −10 (Content) | 63 %; Würfe 68, 65, 91: drei Fehlschüsse |
| Aimed Shot | Hit +10 | 83 %; Wurf 37: Treffer, 24 Schaden |
| Biss der Ratte | direkter Profilwert Hit 75, kein Ausweichen durch AGI (Core #10) | 75 %; 77 verfehlt, 63/46/16 treffen |
| Schaden des Bisses | Raw = ATK 6, max(6 − DEF 3, 0,6) × Varianz 0,96–1,01 → 3 | 3, 3, 3 |

**Der Würfel:**
- Bei 1.000.000 Würfen über 200 Seeds ist Chi² = 102 (95-%-Grenze bei 99 Freiheitsgraden: 123).
- Eine 63-%-Chance trifft in 63,1 % der Fälle.
- Die Autokorrelation zwischen aufeinanderfolgenden Würfen ist −0,002.

Drei Fehlschüsse in Folge bei 63 % haben eine Wahrscheinlichkeit von 0,37³ ≈ 5 %: Pech, kein Rechenfehler. Dazu kommt die Wahl: Power Shot trifft 20 Punkte seltener als Aimed Shot, und beide töten die Ratte mit einem Treffer (33,25 bzw. 26,5 Raw gegen 16 HP).

**Neu:** Vor jeder Entscheidung zeigt die Anzeige, womit Alaric gegen das nächste Ziel würfelt:
```
Alaric's attacks vs cellar vermin: Basic Attack 73% · Aimed Shot 83% · Power Shot 63%
```
Die Chance kommt aus derselben Rechnung wie der Wurf: Basis, Skill-Modifikator, Profizienz, vorbereitete Boni, Abwehreffekte und Deckung. Angriffe, die gerade nicht gehen, fehlen in der Zeile (Reichweite, Kosten, Pfeile).

## Notizen des Spielers

| Notiz | Befund | Umsetzung |
|---|---|---|
| Kampf fühlte sich besser an; Rechnung prüfen, sehr viele Misses | Rechnung korrekt (siehe oben), Würfel gleichverteilt | Trefferchancen aller Angriffe vor der Entscheidung sichtbar |
| NPC-Reden im Kampf hart unterbinden | Die Ausnahme stand im **eigenen** Engine-Block: „at most one short call per reply from someone with a direct stake“. GLMs Reasoning: „Fennick at top of stairs — one short call allowed (direct stake, owner)“. Dazu schreibt das Preset vor, Antworten mit Dialog zu eröffnen und NPCs „in multiple sentences per turn“ reden zu lassen. | **Kampfstille** statt Ausnahme, an drei Stellen: (1) im Kampfblock „Combat silence: nobody talks while the fight runs — neither combatants nor … (not fighting)“; (2) in der Schlusszeile der aufgelösten Schritte „no dialogue (combat silence; it overrides any habit of opening with speech)“; (3) im Vertrag (3.2). Einzige Ausnahme: ein Kämpfer, dessen Intent `surrender` oder `parley` ist, darf einen kurzen Satz sagen. Das ist Mechanik. **Durchsetzung:** Enthält eine Kampfantwort trotzdem wörtliche Rede, nennt der nächste Engine-Block das als Korrektur („Combat silence broken: 2 spoken lines …“). Nach dem Kampfende darf wieder geredet werden. |
| „Ledger“ ist ein KI-Lieblingswort | In unseren Texten kommt das Wort nicht vor (Engine, Vertrag, Lorebook). Es steht in der **Bann-Liste des Presets**, und GLM schrieb es trotzdem dreimal. Ein Wort in einem Verbot zu nennen, macht es eher wahrscheinlicher („Pink Elephant“). Logit Bias hilft hier nicht zuverlässig: SillyTavern berechnet die Token-IDs für „zai-org/GLM-5.3-Flash“ mit einem fremden Tokenizer. | Neue Einstellung **„Word replacements“** (Standard `ledger=register`). Die Engine ersetzt ganze Wörter in jeder Erzählerantwort, bevor sie gespeichert wird: Plural und Großschreibung bleiben, eigene Bearbeitungen des Spielers bleiben unberührt. So steht das Wort weder in der Anzeige noch im nächsten Prompt. Weitere Paare lassen sich anhängen: `ledger=register, tapestry=weave`. |

## Fehler, Ursachen, Behebung

| # | Fehler | Ursache | Behebung |
|---|---|---|---|
| 1 | Die angenommene Quest blieb „offered“, und die Korrekturen verlangten zweimal „report it as offered“ | (a) Das Annahme-Muster erlaubte nur ein Wort zwischen „take the“ und „quest“. (b) Die Antwort auf Zug 8 hatte keinen Report, und die Autorisierung galt nur für die aktuelle Nachricht. | (a) Eine Quest gilt als angenommen, wenn die Nachricht sie **beim Namen** nimmt: zwei ihrer Titelwörter plus take/accept/pick/choose/grab/claim/sign for. „take a look“ und Fragen zählen nicht. (b) Ein späterer Report darf die Quest aktiv setzen, wenn eine Spielernachricht seit dem Angebot genau diese Quest beim Namen genommen hat. Dafür hält der Zustand die letzten zwölf Eingaben (`state.inputs`). (c) Nimmt die aktuelle Nachricht Quests beim Namen, darf nur diese aktiv werden. Der verworfene erste Versuch („Wolves Near the Ashbridge Ford“) wird so abgelehnt. |
| 2 | Fennicks Bezahlung doppelt: Coin +36 cp **und** Item „silver“ ×3 | Geld als Item wurde nicht abgefangen | Geldwörter (copper/silver/gold, coins, money) sind nie ein Item. Die Ablehnung sagt: „report it once in coin“. |
| 3 | Die tote Ratte „stand“ nach dem Rückweg in der Gildenhalle | Der Report nannte `location: "Lumenford"` (dieselbe Stadt) plus einen neuen `place`. Der Zweig für Reisen behandelte das nicht als Ortswechsel, also blieb niemand zurück. | Die eigene Stadt noch einmal zu nennen, ist keine Reise. Der neue `place` gilt dann als Ortswechsel, und wer nicht mitkommt, bleibt zurück. |
| 4 | Serah hört in der Gildenhalle Alarics Bericht, ist laut Engine aber abwesend. Ihre Karte fehlt im Engine-Block. | Sie blieb in Zug 9 am Tresen zurück; bei der Rückkehr meldete der Report kein `enter` | Wem Alaric in dieser Antwort etwas erzählt (`learn` mit `how: told`, `from: pc`), der ist bei ihm und kommt in die Szene |
| 5 | Fennick und Maretta, zwei wiederkehrende Personen, blieben der Engine unbekannt. `aware: fennick` und `leave: Fennick` wurden abgelehnt, der Auftraggeber ließ sich nicht auflösen. | Die Antworten, die sie einführten (Züge 4 und 8), hatten keinen Report. Spätere Reports nannten sie nur noch, ohne `new`. | Ein Ref, den die Antwort nur als großgeschriebenen Namen schreibt, wird zu dieser Person (`named in the story: Fennick`). Das gilt für `aware`, `position`, `enter`, `leave`, `memory` und `learn`. Platziert der Report sie, ist sie in der Szene. Kleingeschriebene Wörter („the guard“) bleiben unbekannt. In Testrun 3 wird so Rennick bekannt, der mit der Laterne an der Kellertreppe stand. |
| 6 | „kite backwards and Power Shot“ und „jump backwards as i aimed shot“: Der Rückschritt fehlte | Die Angriffsaktion kannte nur das Heranrücken; „kite“, „backwards“ und „jump back“ fehlten im Muster | Core #12/#24: ein Bandwechsel plus eine Hauptaktion pro Zug, in beliebiger Reihenfolge. Nach dem Angriff tritt Alaric ein Band zurück, und die Anzeige zeigt `· then steps back (cellar vermin ENGAGED → SHORT)`. Die Ratte (Temperament *skittish*) weicht danach aus, statt zu beißen. So will es die bestehende, als PROPOSED markierte NPC-Regel. |
| 7 | „Alaric no family name“ als falscher Glaube Serahs („actually FALSE“ auf ihrer Karte) | Der Name wurde wörtlich mit „Alaric“ verglichen | Beim Namen zählt „no family name / no surname“ nicht mit: Serah kennt jetzt den Namen |
| 8 | Die Gildenmarke hieß `guild_registration_tag_lead_stamped_numbered` (Engine-Block, `#bag`, Anzeige) | Unbekannte Items bekamen nur eine ID | Das Item behält den Namen aus dem Report, ohne die Klammer: „Guild registration tag“ |
| 9 | Eine Stadt aus einem anderen Reich wurde Nachbarort von Lumenford (Flussstraße nach Ashbridge, „Ashbridge Ford“). Damit landeten Realm Duskreach und Ashbridge in 9 von 16 Prompts (≈ 400 Token World Info). | Beispiel im Vertrag: „I walk toward Ashbridge“ | Beispiel ohne Eigennamen („toward the city“), Vertrag 3.2 |
| 10 | Probe abgelehnt: `actor: "Alaric"` | Der Report-Text nannte `actor` und `opposition` ohne Typ | „actor:n, opposition:n (the two scores of Chance%)“ |
| 12 | „aimed shot at the second one“ traf die einzige Kämpferin (nachgereicht nach der fünften Review) | Fand die Engine keinen Namen, nahm sie das einzige gültige Ziel (Core #23/#29), auch wenn der Spieler ausdrücklich ein anderes meinte. Das zweite Tier war nur zu hören, nie Kämpfer. | Unterscheidet die Nachricht Ziele („the second one“, „the other one“, „the left one“, „at another one“) und passt keines, gibt es kein automatisches Ziel mehr: `Alaric's attack needs a target: "the second one" is not in the fight (nothing spent, nothing rolled)`, und Alaric bleibt am Zug. Pronomen, „the last one“ und „another one“ als zweiter Pfeil bleiben beim einzigen Ziel. |
| 13 | Die Registrierung setzte Alarics Entity-Status auf „registered guild member, rank f / novice“ (nachgereicht nach der fünften Review) | Jeder `status`-Fakt einer Person wurde zu ihrem Entity-Status | Der Entity-Status von Personen und Kreaturen ist nur `alive`/`dead`; alles andere bleibt ein normaler Fakt. Alarics Tod per Fakt wird abgelehnt: Sein Leben gehört der Engine (0 HP). |
| 11 | Drei von 13 Story-Antworten ohne Report (Züge 4, 8, 10) | GLM ließ ihn weg; einmal war er im Reasoning schon geplant. Die Kampfantwort war kurz, ohne Report und Boxen. | Die Kampf-Schlusszeile endet jetzt mit „Then write the fact report.“ Die Folgen fehlender Reports fangen die Fixes 1, 4 und 5 ab. |

**Belege:** `tests/testrun_v4/regression.test.js` spielt den echten Lauf ab (14 Tests). Mit dem Code des Laufs schlagen 13 fehl; nur die Rechenprüfung besteht, weil die Rechnung schon stimmte. Mit dem neuen Code bestehen alle. Der Replay zeigt:
- „ledger“ ist aus dem Chat verschwunden;
- die Quest wird in Zug 14 aktiv;
- der verworfene erste Versuch mit dem Wolfsauftrag wird abgelehnt;
- das Geld zählt einmal;
- die Ratte bleibt im Keller;
- Fennick und Maretta sind bekannt, Serah ist in Zug 15 anwesend;
- der Rückschritt steht in der Anzeige;
- der Engine-Block von Zug 11 nennt die gebrochene Kampfstille.

Dazu kommen:
- Unit-Tests für Grenzfälle: „take a look“, Fragen, ein einzelnes Titelwort, Geldwörter, kleingeschriebene Refs;
- der Lorebook-Test mit Testrun 4;
- der Browser-Smoke-Test mit Wortersatz und neuem Einstellungsfeld.

Testrun 3 ändert sich an zwei Stellen:
- Rennick ist jetzt im Keller anwesend und Zeuge.
- Der Engine-Block von Zug 13 wächst auf etwa 2.700 Token: Hesta und Rennick hatten die Kampfrunden durchkommentiert, das steht jetzt als Korrektur darin, und Rennicks Karte kommt dazu.

## Beobachtet, bewusst nicht geändert

- **Anderer Platz derselben Stätte** (Gemeinschaftsraum → Tresen der Gildenhalle): bleibt eine Bewegung, die die Entscheidung des Spielers braucht. Eine Lockerung über gemeinsame Wörter hätte in Testrun 3 Alarics ungefragten Gang durch den Tortunnel („West gate queue“ → „West gate tunnel“) durchgelassen. Kosten hier: eine Korrektur in Zug 15.
- **„he paid a bit under half“ als Zahlungsabsicht:** Die Zustimmung wird weiter pro Kategorie geprüft (siehe Review 2). Hier traf es den Anteil der Gilde, den der Vertrag der Registrierung festgelegt hatte, also inhaltlich richtig.
- **Leiche als „anwesend“:** Nach dem Kampf bleibt die tote Ratte in der Szene, bis Alaric den Ort verlässt. Harmlos.
- **Tracker-Zeit:** Die Megumin-Uhr sprang einmal zurück (10:10 → 09:44), als GLM sich wieder nach der Engine-Uhr richtete. Die Engine-Uhr ist verbindlich; der fehlende Report von Zug 8 kostete sie 15 Minuten.

## Setup-Hinweise für den nächsten Lauf

1. Extension aktualisieren.
2. **Kartenbeschreibung** durch `content/narrator/Avereth_Narrator_Contract_v3.txt` ersetzen (Stand 3.2: Kampfstille, Beispiel ohne Stadtnamen).
3. **„Word replacements“** in den Avereth-Einstellungen prüfen (Standard `ledger=register`, eigene Paare anhängbar). Den Eintrag „Ledger“ in der Bann-Liste des Presets kann man entfernen; die Engine ersetzt das Wort so oder so.
4. Lorebook v0.11 bleibt; nichts neu importieren.
5. Beobachten:
   - Hält GLM die Kampfstille? Taucht „Combat silence broken“ im Engine-Block auf?
   - Reports in allen Antworten, besonders in kurzen Kampfantworten?
   - Kommen neue Personen mit `new` oder erst über den Namen?
