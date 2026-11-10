# .179 — D5-Herkunft: verkaufte, wieder ausgestellte Ware ist Händlerware

**Basis:** `.178` (`c2ef94d`).

**Grundlage:** [GPT-Nachreview `.178`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/npc-20261109-160250Z/REVIEW_178_PRODUKTDIFF_GPT.md) §3.4; Entscheidung D5 des Implementierungsauftrags (unverändert).

**Abgrenzung:**
- kein Eigentums- oder Diebstahlsystem;
- keine Ausweitung auf Geschenke;
- `had_pc` behält seine Bedeutung („war jemals seins“) für Lieferung und Dungeonfunde;
- R1, P3 und alle übrigen Korrekturen sind unberührt;
- kein Kontext-, Vorgaben-, Balance- oder PULSE-Code;
- kein Modellaufruf.

## 1. Fehler `.178`

`wareOnSale` sah eine Sache als Alarics eigene an, wenn sie `had_pc` trug und an einem Ort lag. `had_pc` bedeutet aber nur „war jemals bei Alaric“. Damit ließ sich zurücknehmen, was er verkauft hatte:
1. Er verkauft dem Händler seine Pfeife (Gebot, `sell`).
2. Der Händler legt sie ins Regal und bietet sie an; das Angebot ist mit dem Objekt verknüpft.
3. Alarics `take` gelingt kostenlos.

Den Ablauf habe ich über den regulären Weg nachgestellt: `bid` in der Antwort, `sell` des Planners, `object.move` und `offer` in der Antwort, dann `take`.

Gefunden habe ich dabei einen zweiten, schon **vorbestehenden** D5-Fehler: Was Alaric aus dem Gepäck ablegt, entsteht als neues Objekt mit `source.how: 'dropped'` **ohne** `had_pc`. Neben einem offenen Angebot gleichen Namens war es deshalb gesperrt.

## 2. Korrektur

- **`src/v4/domain.js` (Reducer):** `laid_by_pc` hält fest, dass die **letzte** Bewegung seine eigene Ablage war.
  - **Gesetzt** wird es bei `object.moved` aus Alarics Hand an einen Ort (auch für den abgespaltenen Teil eines Stapels) und bei `object.created` dessen, was er aus dem Gepäck ablegt.
  - **Gelöscht** wird es bei jeder anderen Bewegung, etwa wenn der Händler die gekaufte Pfeife ins Regal stellt.
  - Es wird beim Falten aus den Events abgeleitet. Records, Events und Spielstände bleiben gleich, eine Migration ist nicht nötig.
- **`src/v4/trade.js`:**
  - `wareOnSale` prüft `laid_by_pc` statt `had_pc`.
  - `displayedWare` verknüpft keine Sache, die Alaric selbst abgelegt hat.
  - `laid_by_pc` zählt zur Stapelbuchhaltung (`STACK_BOOKKEEPING`).

## 3. Abnahme

| Prüfung | Ergebnis |
|---|---|
| Rot gegen `.178` | `pilot01_review_d5_provenance.test.js` **3 von 5 rot** (sauberer Arbeitsbaum auf `c2ef94d`): verkauft, ausgestellt, angeboten → `take` angenommen; dasselbe nach abgelehntem Angebot; aus dem Gepäck abgelegter Beutel neben offenem Angebot gesperrt |
| Grün | **5/5** |
| Gegenfälle | seine selbst abgelegte Pfeife neben offenem Angebot: frei (auf beiden Ständen grün) · Händler drückt ihm die gekaufte Pfeife zurück in die Hand (Geschenk): angenommen (beide grün) · `.48 purchase`, `.178`-Regressionen, K2: grün |
| Betroffene Suites | `pilot01_review_d5_provenance`, `pilot01_review_p2`, `pilot01_k2_purchase_object`, `patch9c2b_live`: **29/29** |
| `npm test` | **3050/3050** |
| Replay | **2235 Fälle, 0 geändert** gegenüber `.178`. Voller Korpuscheck: 1057 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet; Akzeptanzliste unverändert |
| ST1.19 Standard | `LIVE SILLYTAVERN SMOKE C: OK`, **172** wahr, 0 falsch (`.178`: 170). Ein erster Lauf hatte die zwei neuen Prüfungen falsch, weil das Smoke-Skript die Szene vor dem Gang in den Buchladen begann (der Händler war nicht da, sein Gebot wurde zu Recht verworfen); Skript korrigiert (erst T41), danach grün |
| ST1.19 Failsoft | `OK`, **177** wahr, 0 falsch (`.178`: 175) |
| Neue Smokeprüfungen | `pilot01_d5SoldWareNotTakenBack`, `pilot01_d5SoldWareSaveReload` (Buchladen: Pfeife per Gebot verkauft, ins Regal gelegt, angeboten; `take` abgelehnt; +4 cp einmal; Save/Reload) |

## 4. Grenzen

- Ausgestellte Ware, die nie angeboten wurde, bleibt frei, auch wenn Alaric sie zuvor verkauft hat. Es gibt kein allgemeines Ladeninventar-Eigentum (wie `.178`).
- „Von ihm abgelegt“ gilt für jede Bewegung aus seiner Hand an einen Ort, auch eine erzwungene. Nimmt dagegen erst jemand anderes die Sache an sich (ein Dieb) und legt sie danach ab, trägt sie das Merkmal nicht mehr. Ein offenes Angebot gleichen Namens am selben Ort sperrt sie dann. Das ist ein Randfall ohne Diebstahlsystem.
- Hinweis aus dem Nachreview, nicht geändert: Eine verknüpfte Ware eines geschlossenen Angebots gilt an jedem Ort, an dem sie liegt, weiter als Ware (§3.4, P3-Messpunkt). Ohne End-to-End-Gegenfall bleibt das bewusst so.
