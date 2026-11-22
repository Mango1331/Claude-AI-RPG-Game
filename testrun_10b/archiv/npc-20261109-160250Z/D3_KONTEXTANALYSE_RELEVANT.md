# D3 – Kontextanalyse `relevant` (Pilot 01, Stand `.179`)

**10.11.2026, Claude · reine Messung, keine Produktänderung.**

**Anlass:**
- [GPT-Nachreview `.178`](REVIEW_178_PRODUKTDIFF_GPT.md) §4 („D3: `relevant`-Abruf bleibt gesondert offen“);
- [Patchnote `.176`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/596da8a30f479228b8af658de0349668b72da87f/avereth-engine/docs/PILOT01_176_CONTEXT_EVIDENCE.md) §1: nach K3 wird `relevant` in 2 von 65 Zügen geliefert;
- Entscheidung D3 des Implementierungsauftrags: keine Reserve und keine Budgeterhöhung ohne belegten Bedarf.

**Methode:**
- Erzählerblock jedes der 65 Spielerzüge des Piloten mit `outcome.recorded`, aus den Originalnachrichten über `turnBlock` neu gebildet.
- Produktvorgabe `budget` 1400 und `rulesBudget` 800 (`index.js` DEFAULTS).
- Grundlage ist eine Kopie der Engine `.179` im Arbeitsverzeichnis, deren Kontextcode seit `.176` unverändert ist. In der Kopie gibt die Diagnose zusätzlich die Priorität jedes Abschnitts aus, und Prioritäten lassen sich per Variante überschreiben.
- Ein Modell lief dafür nicht. Die Messung zeigt, was der Erzähler **bekommt**, nicht, was er daraus macht.

## 1. Wie gepackt wird

`buildContext` (`src/context.js`) gibt jedem Abschnitt eine Priorität:
- **Priorität 0** wird immer geliefert, auch über dem Budget. Dazu gehören:
  - `header`, `pc`, `help`, `creation`;
  - `npc_compact`, `npc_arrival`, `npc_continuity`;
  - `quests`, `resolved`, `guild_authority`, `facts`;
  - `combat`, `dungeon`, `gear_market`, `world_*`.
- **Danach** folgen Priorität 1 (`present`, `settlement`, `goals`, `features`), 2 (`relevant`, `named`) und 3 (`lore`). Jeder Abschnitt kommt **nur ganz oder gar nicht** und nur, wenn er noch ins Budget passt.
- **Eigene Zulagen** zählen nicht zum Budget: `envelope`, `report`, `corrections`, `chronicle`, `price_contract`.

## 2. Befunde

| Messgröße | Wert |
|---|---|
| Priorität 0 allein, Mittel je Zug | **1320** von 1400 Token |
| Züge, in denen Priorität 0 allein das Budget überschreitet | **18 von 65** (dort wird kein Abschnitt höherer Priorität geliefert) |
| Größte Priorität-0-Abschnitte, Mittel über alle Züge | `quests` **385** (in 58 Zügen; 387–451 in den Sozialzügen unten), `resolved` 216, `guild_authority` 160, `npc_compact` 112, `help` 106, `pc` 104, `header` 84 |
| Freier Platz nach Priorität 0 in den 47 Zügen ohne Überlauf | Mittel **195**, Minimum 5, Maximum 1019 Token |
| Ungenutztes Budget nach allem Gepackten (47 Züge) | Mittel **99**, Median **33** Token |
| `relevant` gebildet / geliefert | **62 / 2** Züge |
| `relevant`, Größe | Mittel **310** Token, 8,5 Einträge |
| Grund des Ausfalls in den 47 Zügen ohne Überlauf | 42-mal: kein Platz mehr nach den gelieferten Priorität-1-Abschnitten |
| Sozialzüge (mindestens eine Person im Fokus, `npc_compact`) | **46**, davon `relevant` geliefert: **2** |

**Kern:**
- `relevant` fällt nicht aus Zufall aus. Der Abschnitt ist größer (Ø 310) als der Platz, den Priorität 0 übrig lässt (Ø 195).
- In knapp einem Drittel der Züge ist das Budget allein durch Priorität 0 schon überschritten.
- `quests` ist der größte Einzelposten. In den Sozialzügen ist er oft größer als die Personenkarte (T58: `quests` 451, `npc_compact` 261).

## 3. Was eine Prioritätsänderung kostet

| Variante | `relevant` geliefert | `present` | `settlement` | `goals` | Züge mit Überlauf | Ø Token je Zug |
|---|---|---|---|---|---|---|
| Ist (`relevant` = 2) | 2 | 30 | 22 | 7 | 18 | 1590 |
| `relevant` = 1 | 2 | 30 | 22 | 7 | 18 | 1590 |
| `relevant` = 0 (immer) | **62** | **4** | **3** | **1** | **59** | **1841** |

**Bewertung:**
- **Priorität 1:** wirkt nicht. `relevant` steht dann hinter `present` und `settlement` und ist immer noch zu groß.
- **Priorität 0:** liefert den Abruf zwar überall, verdrängt aber fast alle Detailkarten anwesender Personen (`present` 30 → 4). Er treibt 59 von 65 Zügen über das Budget (+251 Token im Mittel). Das widerspricht dem Ziel der NPC-Kontinuität. **Nicht empfohlen.**

## 4. Teilweise Lieferung im vorhandenen Platz (Simulation)

Würde `relevant` statt ganz-oder-gar-nicht die vorderen Einträge liefern, die in den **heute ungenutzten** Platz passen, bei gleicher Priorität und gleichem Budget:

| Messgröße | Wert |
|---|---|
| Züge mit `relevant`-Ausfall und freiem Platz | 35 |
| davon mit mindestens einem gelieferten Eintrag | **27** (Sozialzüge: **18** von 25) |
| gelieferte Einträge je solchem Zug | Mittel **2,5** von 10 |
| Einträge insgesamt, die zusätzlich ankämen | 67 von 333 ausgefallenen (in diesen 35 Zügen) |
| davon schon wörtlich in gelieferten Abschnitten (grober Abgleich der ersten acht Wörter) | 4 (von 13 insgesamt) |

Das Budget würde dabei nicht überschritten, die Engine füllt nur den heute leeren Rest (Median 33, Mittel 99 Token). Der Inhalt ist kaum doppelt: Von diesen 333 ausgefallenen Einträgen stehen nur 13 schon anderswo im Block.

## 5. Inhaltsqualität des Abrufs

Von 530 gebildeten Einträgen über alle Züge sind:
- **95 (18 %)** wörtliche Spielernachrichten als Erinnerung, etwa „[Day 1, 12:22] … Alaric: "Big as a calf, near enough …"“;
- **29 (5 %)** Altlasten des K8-Fehlers („Wat Dodd name Alaric Red“). K8 verhindert neue, die Pilotrecords enthalten sie noch.

Wertvoll sind Beispiele wie diese:
- T46 die offene Muller-Schuld;
- T58 die Woolpack-Erinnerungen;
- T61 die offene Mitfahrabsprache.

| Zug | Fokus | Priorität 0 | `quests` | `resolved` | `npc_compact` | `present` | `relevant` (Einträge) | erste Einträge |
|---|---|---|---|---|---|---|---|---|
| T17 Fuhrmann | Dodd | 1356 | 387 | 309 | 137 | 65, ausgefallen | 313 (10) | offene Mitfahrt; Hessas Bericht; „Wat Dodd name Alaric Red“ |
| T24 Gilde | Dodd | 1574 (Überlauf 174) | 387 | 312 | 185 | 40, ausgefallen | 336 (11) | Dodds Aufenthalt; Gnasher tot; Alaric-Zitate |
| T33 Wechsler | Wechsler | 1426 (Überlauf 26) | 451 | 234 | 84 | 40, ausgefallen | 365 (11) | „does not break silver“; Gildenauftrag; Schreiberin-Fakten |
| T46 Woolpack | Muller, Bedienung | 1381 | 451 | 191 | 226 | 40, ausgefallen | 324 (9) | Mullers Stimmung; offene Kupferschuld |
| T58 Woolpack | Muller, Bedienung | 1326 | 451 | 107 | 261 | 40, geliefert | 356 (7) | Woolpack-Erinnerungen; offene Mitfahrt |
| T61 Hof | Muller | 1412 (Überlauf 12) | 451 | 309 | 185 | 171, ausgefallen | 358 (7) | offene Mitfahrt; Woolpack-Erinnerungen |

**Kontrolle zu T61:** Der Erzählerblock enthielt den Woolpack-Fuhrmann samt Mitfahrt über die Ankunftskarte (`npc_arrival`, Priorität 0). Die doppelte Fuhrmann-ID dieses Zugs (B6) entstand also nicht, weil dem **Erzähler** die Karte fehlte. Der Extractor hat einen eigenen Katalog.

## 6. Optionen zur Entscheidung (keine umgesetzt)

| Option | Inhalt | Wirkung laut Messung | Risiko |
|---|---|---|---|
| **A – Teillieferung** | `relevant` liefert die vorderen Einträge, die in den verbleibenden Platz passen; gleiche Priorität, gleiches Budget | +27 Züge mit Abruf (18 sozial), Ø 2,5 Einträge, kein Überlauf | gering. Die Rangfolge des Abrufs entscheidet, was ankommt; deshalb mit D sinnvoll |
| **B – `quests` verdichten** | aktive Aufträge außerhalb des Auftragsbezugs des Zugs kürzer (Titel, Status, Ort) | größter Hebel (Ø 385 Token Priorität 0); schafft Platz für `present` **und** `relevant` | höher. `quests` ist bindende Auftragsinformation; braucht eine Designentscheidung, was unverkürzt bleiben muss |
| **C – Priorität anheben** | `relevant` auf 1 oder 0 | 1: keine Wirkung; 0: `present` 30 → 4, Überlauf 18 → 59 | **nicht empfohlen** |
| **D – Abruf entrümpeln** | wörtliche Spielerzitate und Fakten mit Alarics Namen als NPC-Namen nicht als `relevant`-Einträge | entfernt rund 23 % der Einträge; macht A wirksamer | gering; reine Auswahl, kein Budget |
| **E – Budget erhöhen** | – | nach D3 ohne belegten Bedarf ausgeschlossen | – |

**Empfehlung:**
- Kein Budgetanstieg und keine Prioritätsänderung.
- Als kleiner, messbarer nächster Schritt **A zusammen mit D**: bei gleichem Budget und gleicher Priorität, mit Messung vorher und nachher auf denselben 65 Zügen.
- **B** ist der größere Hebel, braucht aber zuerst die Designentscheidung, welche Auftragsangaben in jedem Zug vollständig bleiben müssen.
- Ob mehr Abruf die Erzählqualität verbessert, zeigt erst ein natürlicher Lauf.

## 7. Grenzen der Messung

- Rekonstruktion aus den Originalnachrichten mit dem heutigen Code. Die Pilotrecords stammen von `.174`; Altlasten wie die K8-Fakten sind darin enthalten.
- Die Teillieferung ist simuliert: Einträge werden in der Reihenfolge des Abrufs gezählt, jeder mit `estimateTokens` + 1.
- Die Prüfung auf Doppelungen ist grob (erste acht Wörter, normalisiert).
- Nur ein Lauf (Pilot 01, 65 Züge). Ein zweiter natürlicher Lauf sollte die Zahlen bestätigen, bevor B entschieden wird.
