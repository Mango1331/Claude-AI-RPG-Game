# .178 — Restkorrekturen aus dem Produktdiff-Review `.175`–`.177` (P2-R1, P2-R2, P3)

**Basis:** `.177` (`3658fbc`).

**Grundlage:** [GPT-Produktdiff-Review `.175`–`.177`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/REVIEW_175_177_PRODUKTDIFF_GPT.md) §3.1, §3.2, §5; Entscheidungen D1 und D5 des Implementierungsauftrags (unverändert).

**Abgrenzung:**
- K1, K3, K4, K6a, K7 und K8 sind nicht berührt.
- kein neues System, kein Diebstahl- oder Eigentumssystem;
- keine Textähnlichkeitsprüfung, keine NPC-Zusammenführung;
- keine Vorgaben-, Kontext-, Balance- oder PULSE-Änderung;
- kein Modellaufruf.

## 1. P2-R1 – Erledigung einer Absprache nur durch eindeutigen Bezug

**Fehler `.177`:** `namedIn` (`src/threads.js`) wertete den ersten Deskriptor einer Partei als Beleg. Das ist oft ein Rollenwort wie „clerk“ oder „carter“. Eine Erledigung per ID mit „The other clerk Bess settled a different debt“ erledigte so die Zusage der **abwesenden** anderen Schreiberin.

**Korrektur:** Ein Bericht nennt eine abwesende Partei,
- wenn er ihren Namen oder bekannten Namen enthält, **oder**
- wenn er ihr Rollenwort enthält und dieses Wort ihr allein gehört:
  - keine andere lebende Person des Records hat es als ersten Deskriptor oder Rolle;
  - der Bericht nennt keine andere Person beim Namen.

Unverändert bleiben:
- eine anwesende Partei genügt;
- ID und kopierte Parteiliste allein genügen nicht;
- eine Erledigung aus der Ferne mit Namen oder eindeutiger Rolle bleibt möglich.

**Pilotbeispiele:**
- „farmer“ ist zweideutig (Bren und Muller), „carter“ ebenfalls (drei Fuhrleute).
- Muller wird über seinen Namen erkannt.

## 2. P2-R2 – Ausgestellte Ware bleibt nach dem Angebot die des Händlers

**Fehler `.177`:**
- `wareOnSale` (`src/v4/trade.js`) schützte nur Ware **offener** Angebote.
- Kaufte Alaric eines von zwei gleichen ausgestellten Stücken, gab es nach K2 keine Verknüpfung. Der Kauf erzeugte ein neues Objekt und schloss das Angebot. Danach ließen sich beide ausgestellten Stücke kostenlos per `take` nehmen.
- Ebenso ging es mit dem Rest eines Stapels nach einem Teilkauf.

**Korrektur:** Ware gehört dem Händler auch nach Abschluss seines Angebots (`accepted`, `declined`, `expired`), wenn sie **im Laden liegt**: am Angebotsort, verknüpft (`line.object`) oder gleichnamig zu einer unverknüpften Warenzeile.
- `open` im Ergebnis unterscheidet die Texte: „… it becomes his by buying it (accepting the offer)“ bei offenem, „(a new offer from …)“ bei geschlossenem Angebot. In der World-Ablehnung `for_sale` steht der Angebotsstatus.
- Ein offenes Angebot geht einem geschlossenen vor.

Bewusst **nicht** geschützt:
- **Was der Händler nach Abschluss aus der Hand gibt:** Das ist sein Geschenk (bestehender Test `.48 purchase`, „Drossell a second one for free“). Ein offenes Angebot schützt die Ware in seiner Hand weiter wie in `.175`.
- **Was Alaric gehörte und dort liegt, wo er es ablegte** (`had_pc` und ein Ort): Das ist sein Eigentum, auch neben einem offenen Angebot gleichen Namens. Unter `.177` blockierte ein offenes Angebot seinen eigenen, abgelegten Quill (D5: „eigene Gegenstände nicht blockieren“). Ohne diese Ausnahme hätte die R2-Erweiterung das dauerhaft gemacht.
- **Alles, was kein Angebot nennt.**

## 3. P3 – eine ausgestellte Sache für höchstens eine Zeile desselben Angebots

**Fehler `.177`:** Beim Anlegen eines neuen Angebots wurde `displayedWare` je Zeile aufgerufen, bevor das Angebot gespeichert war. Zwei Zeilen „quill“ bei einem ausgestellten Quill erhielten beide `obj.test.quill_a`.

**Korrektur:** `displayedWare(…, { taken })`. Die erste passende Zeile nennt die Sache, weitere Zeilen desselben Angebots bleiben unverknüpft (bisheriger Kaufweg).

## 4. Benachbarte D1-Grenze (§3.1 des Reviews)

Gegenfall ergänzt, ohne Codeänderung:
- **Andere Partei:** Eine Meldung unter der ID einer Zusage als `debt` mit anderer Partei wird abgelehnt (bestehende Parteiregel).
- **Nur die eigene Partei, anwesend:** Eine verschobene Art wird nicht erkannt. Art und Wortlaut der Zusage bleiben, der Status wird `resolved`. Das bleibt die dokumentierte Grenze „gleiche Parteien, andere Sache“ und gilt **nicht** als gelöst.

## 5. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen `.177` | `pilot01_review_p2.test.js` **7 von 12 rot** (eigener sauberer Arbeitsbaum auf `3658fbc`): R1 „other clerk Bess“, „the clerk“ bei zwei Schreibern, andere Person beim Namen; R2 zwei Quills, Stapelrest; eigener abgelegter Quill neben offenem Angebot; P3 Doppelbindung |
| Grün | **12/12** |
| Gegenfälle (auf beiden Ständen grün) | **R1:** einzige Schreiberin per Rolle aus der Ferne; Name neben zweiter Schreiberin; anwesende Partei; nur ID → abgelehnt · **D1-Grenze** wie §4 · **R2:** nie angebotener Gegenstand im selben Laden bleibt frei |
| Gegenfall aus der Vollsuite | `patch9c2b_live` „.48 purchase“: Ein zusätzliches Stück, das der Händler nach dem bezahlten Kauf aus der Hand gibt, bleibt ein Geschenk. Diesen Test brach die erste R2-Fassung; daraufhin habe ich den Schutz auf liegende Ware beschränkt |
| Hostkette mit Originalantworten | Buchladen T41–T42 mit zweitem ausgestellten Primer: Angebot unverknüpft, Kauf erzeugt `obj.t83.primer`, −30 cp einmal. `take` des Primers im Kasten: `.178` abgelehnt („for sale“), `.177` angenommen |
| Betroffene Suites | `pilot01_*`, `npc_e2b*`, `patch9c2b_live`, alle `*trade*`-Suites, `planner_take_attempt`: **185/185** |
| `npm test` | **3045/3045** |
| Replay | **2235 Fälle, 0 geändert** gegenüber `.177`. Voller Korpuscheck: 1057 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet; Akzeptanzliste unverändert |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **170** wahr, 0 falsch (`.177`: 168) |
| ST1.19 Failsoft | `OK`, **175** wahr, 0 falsch (`.177`: 173) |
| Neue Smokeprüfungen | `pilot01_r2DisplayStaysOnSale`, `pilot01_r2SaveReload` (Buchladen mit zweitem Primer, Originalantworten T41/T42, danach `take` und Save/Reload) |
| Kontext, Vorgaben | unverändert |

## 6. Grenzen

- **R1:** Auch mit eindeutigem Bezug bleibt die Grenze „gleiche Partei, andere Sache“ offen (§4). Rollenwörter werden nur als ganze Wörter des ersten Deskriptors bzw. der Rolle verglichen; ein Beruf, der nur als Fakt (`occupation`) gespeichert ist, zählt nicht.
- **R2:**
  - Der Schutz liegender Ware hängt an einem Angebot des Händlers mit dieser Sache oder diesem Namen am Ort. Ausgestellte Ware, die nie angeboten wurde, bleibt frei wie bisher; es gibt kein allgemeines Eigentum von Ladeninventar.
  - Ein Verkauf an einen Käufer ohne Person bucht das Stück an den Ort; es gilt dann als Alarics abgelegte Sache (`had_pc`).
  - Der Status des Verkäufers (etwa tot) wird nicht geprüft.
- **P3:** Mehrere Zeilen und mehrere gleiche Stücke werden nicht einzeln zugeordnet: Die erste Zeile nennt eine Sache nur, wenn genau eine passt (K2).
