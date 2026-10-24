# Run 6 – 20261024-104654Z-current_test

**Review vom 24.10.2026.** Eigenständige Auswertung des Originalexports, **keine Implementierung, kein Regressionstest der Engine**. Aktueller Projekt-/Abnahmestand ausschließlich in [03](../../03_AKTUELLER_PROJEKTSTAND.md); 10B-Entscheidungen in [06](../../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Historische Einzelfunde sind keine Codefreigabe.

## 1. Originalquelle und Testaufbau

- **Original:** `20261024-104654Z-current_test.zip`, **5.424.566 Bytes**, SHA-256 `14b6570481917b575c035e361b59ef533d44a8917737513e19365ea6a0917de0`, Git-Blob-SHA1 `372c54f2730429663e74374df985560914a98636`; CRC aller ZIP-Einträge OK. **Wichtig: Das ZIP wurde im Chat bereitgestellt, nicht mit dieser REVIEW.md auf GitHub hochgeladen.** Binärarchivierung offen; keinen nicht vorhandenen Git-Link erzeugen.
- Echter automatisierter **SillyTavern 1.19.0 / GLM-5.3-Flash**, `stub:false`, `fixture:null`, freier `current_test`, Persona `pragmatic mercenary`. Engine **4.3.0-c.6.6.66**, aus Run protokollierter sauberer Git-SHA **`01636f32c46e`** auf Entwicklungsbranch (nach dem Produktcommit `4cd9b338`, vor weiteren Dokumentationscommits). Narrator-Vertrag in Statuszeile `current`; keine belegte Abweichung der laufenden Engineversion.
- **35 echte Spielerinputs**, 34 gebuchte Engine-Turns nach Charaktererstellung; **32 gültige natürliche Storyantworten mit 32 `extract.applied`**, 542 Engine-Events, `integrity: OK`. Ende **`defeat` in Spielerinput 35 / Engine-Turn 34**, nicht wegen eines technischen Timeouts.
- Gesamtdauer **27:11,9 Minuten (1.631.888 ms)**: Spiel-/Providerzeit 1.232.837 ms, LLM-Testspieler-Entscheidungen 334.433 ms; restliche Einrichtungs-/Runnerzeit gesondert. Kein volles 100-Input-Beobachtungsfenster. Originaldateien: `run.json`, `evaluation.json`, `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `player.jsonl`, `report.md`, `server.log` und Screenshots.

**Zählkonvention:** „Spielerinput“ meint den Runner-Zug einschließlich Charaktererstellung; `turn.begun` und die gespeicherten Engine-Turns sind nach der Erstellung um eins versetzt. Belegstellen bevorzugt als Spielerinput mit zugehörigem Event-/Chatindex angegeben.

## 2. Chronologie – tatsächlich gebuchte Mechanik

| Spielerinputs | Spielverlauf | Autoritativer Nachweis |
|---|---|---|
| 1–2 | Mage, Arcane Bolt + Flame Lance | Ruleset 2, Level 1, anfangs **80 HP / 72 MP**, 50 cp; zwei gewählte Skills + Basic |
| 3–6 | Alderwatch, Gildenbeitritt, Annahme „Cull the Burrow Hounds at Millbrook“ | `guild.registered`; Registrierungsgebühr **−20 cp** (50→30); `quest.status listed→active`; echter Slip |
| 7–9 | Reise nach Millbrook, Dorfbewohner, Spur/Den | Orts- und Questfortschritt; eigenes Suchen statt eingeblendeter Kills |
| 10 | Angriff auf nicht im aktiven Szenenzustand targetierbaren Hound | Engine meldet `ATTACK — TARGET NEEDED`; **keine** MP-/Würfel-/Kampfbuchung. Danach wird der Hound durch Annäherung tatsächlich sichtbar und als Entity etabliert |
| 12, 15, 16, 21 | Vier getrennte Flame-Lance-Siege über Hounds A–D | Encounter `enc.t11`, `enc.t14`, `enc.t15`, `enc.t20`; **4 × 12 = 48 XP**; je 16 MP, zuletzt **8/72 MP**. `entity.status dead`, individuelle Fight-Records, tatsächliches Auto-Loot |
| 21–27 | READY, Rückreise nach Alderwatch, abends noch kein Turn-in, günstiges Essen/Bett, Nacht und morgen Abgabe | `quest.ready` nach vier Kills, `transaction.completed` am Gasthaus **−5 cp** (30→25); `resource.changed` MP **8→72**; `proof.checked ok:true`, **einmalig +80 cp und +30 XP**, `quest.status active→completed`. **Endstand vor dem Dungeon 105 cp / 78 XP** |
| 28–30 | Tagesboard wechselt; offizieller Catacombs-Level-1-Vertrag angenommen, Reise zum Warden | Neues Board mit neuen IDs, Contract-Slip `active`; `dungeon.established` mit festen Ranks/Slots |
| 31 | Betritt Old Crown, trifft drei Restless Skeletons | `dungeon.slot`, drei echte Entity-IDs, gemeinsamer Encounter `enc.t30r`; Level **4/3/2** gegenüber Mage Level **1**; keine erfundene separate Dreiergruppe |
| 32–35 | Kampf, Tod nach zwei Skeleton-Kills | HP **80→45→25→4→0**, MP **72→56→40→24**; Skeleton A und B wirklich tot, C überlebt (**36 HP**); `encounter.ended:pc_dead=true,xp_awarded=0`, `entity.status pc=dead` |

**Detaillierte Todeskausalität:** Der Mage greift freiwillig drei höherlevelige Gegner an. Die Engine bucht pro Spieleraktion eine Kampfhandlung mit Gegnerreaktionen: im ersten Austausch 35 HP Schaden; danach 20, 21 und schließlich 8. Bei 4 HP versucht der Testspieler ausdrücklich Basic Attack gegen den fast toten Skeleton B und anschließend Flame Lance gegen C. Die Engine führt zunächst nur die gültige erste Aktion aus, B stirbt; C kommt an die Reihe und tötet den Mage. **Kein doppelter Spielerturn, kein freier Zweitangriff, keine XP-Auszahlung für den verlorenen Encounter.** Das ist mechanisch kohärent und aus freien Entscheidungen und der gefährlichen Levelverteilung erklärbar; kein Beweis eines überharten allgemeinen Nerf-Bedarfs.

## 3. Positiv nachgewiesen

1. **.66 behebt den akut sichtbaren .65-Hostblocker im natürlichen Providerlauf.** Die 32 nach Charaktererstellung behandelten Story-Replies endeten mit `extract.applied`; keine über 900 Sekunden stehen gebliebene `pending`-Extraktion, keine neue World-Host-Blockade. `pageErrors=[]`, `serverErrors=[]`, 0 Soft-Extractor-Fortsetzungen. Ein 100-Züge- oder vollständiger Swipe-/Reload-Stresstest ist das nicht.
2. **Quest-Autorität und Geldfluss funktionieren im geprüften vollständigen Hound-Zyklus:** Vertrag, vier eigenständige besiegte Targets, READY, Return, `proof.checked`, genau eine Auszahlung und Abschlussmarke am Guild-Slip. Keine Trophäenpflicht und keine Auszahlung aus bloß erzählten Taten. Nebenbei Bett/Mahlzeit als echte Transaktion und Schlaf-Regeneration.
3. **Dungeon-Gruppe / Combat / Tod korrekt:** drei reale Gegner im selben Encounter; Initiativen, MP-/HP-Kosten, zwei Kills und Tod persistent. 1-vs-3 ist nicht drei unverbundene Kämpfe; die Gegner erhalten tatsächlich ihre Kampfzüge.
4. **Narrator/Engine überwiegend gut gekoppelt:** F-Rang-Hound-Loot kommt als `object.created`/`object.added` an; notwendige Guild-Schritte werden nicht durch Prosa ersetzt. Der Testspieler reagiert auf verweigerten frühen Turn-in mit Rückreise und Rast.
5. **Providerstabilität:** 102 Requests, alle mit `finish_reason=stop`; **33 plan, 32 narrator, 34 extract (32 regulär + 2 Reparaturen), 3 board**. Keine leeren Planner-/Narrator-/Extractor-Antworten oder Transport-Recovery. Die zwei nötigen Extractor-Reparaturen betreffen Spielerinputs **20 und 22**; `extraction_repaired` in `evaluation.json`.

## 4. Konkrete Befunde und Gewichtung

**R6-1 – P2, bestätigte kleine Narrator-/Combat-Truth-Abweichung am Todesende.** Der letzte Storytext erklärt zunächst richtig, dass zwei Skelette zerstört und ein drittes noch aktiv ist und weggeht. Der Schluss beschreibt dann jedoch **„three heaps of bone“**, obwohl nur **zwei** Entity-Statuswechsel auf `dead` vorliegen und Skeleton C mit **36 HP** überlebt. *Narrative Kontradiktion*, nicht doppelte Engine-Tötung. In einem künftigen **10B-3 Combat/Chronik-Fachpatch** bei Rückbindung von Szenen-/Memorytext an Combat-Summary als Negativfall ergänzen; jetzt kein Einzel-Hotfix.

**R6-2 – P2/UX, Zielzustand und sichtbare Andeutung im Hound-Den.** In Spielerinput 10 will Alaric den Hound „at the den entrance“ beschießen. Der Erzähler hatte zuvor Schnüffeln/Bewegung aus dem versteckten Eingang beschrieben, aber **keinen eindeutig sichtbar freistehenden Gegner** materialisiert. Die Engine weist korrekt ohne Ressourcenverbrauch zurück; der Spieler muss anschließend annähern, erst dann wird Burrow Hound A als Ziel verfügbar. **Kein gesicherter Combat-Bug**; bei wiederholten Fällen prüfen, ob Hinweis und Szenenmaterialisierung für einen hörbaren, aber noch nicht sichtbaren Feind verständlicher werden müssen. Nicht aus versteckten Geräuschen automatisch gratis Zielbarkeit machen.

**R6-3 – Design-/Balancebeobachtung, keine Freigabe.** Der Novice-Level-1-Mage entscheidet sich nach einer erfolgreichen Vier-Hound-Quest für den hoch dotierten Catacombs-Clear (**120 cp**). Der erste Floor besitzt laut echter `dungeon.established`-Struktur **drei F-Rank-Minions Level 4/3/2**, während der Spieler Level 1 ist. Der Guild-Clerk und Watchman nennen Zielort/Level 1 und warnen vor unteren Etagen, kommunizieren aber die **konkrete Härte der oberen Ebene** nicht. Der LLM-Testspieler interpretiert den höheren Lohn als attraktiven Solo-Auftrag und kämpft statt Flucht; bei 4 HP ist die Niederlage vorhersehbar. Mögliches Thema: **Risiko-/Level-Transparenz** für Anfänger, nicht automatisches Monster-Level-Scaling, herabgesetzter Schaden oder Pflichtwarn-Popup. Für die Balancingfrage weitere Warrior-/Rogue-Läufe und Originalbelege vergleichen; keine alleinige Aussage „Mage zu schwach“.

**R6-4 – Beobachtung offizielles Board:** Auf Tag 2 ist ein neu generierter Old-Crown-Auftrag mit eigener ID enthalten, nachdem das erste Tagesangebot ablief. Das ist für sich **kein** Phantomauftrag und keine doppelte Auszahlung: Tag 1 `quest.clear_the_upper_galleries_of_the_old_crown_catacombs` wird `expired`, Tag 2 `quest.clear_the_upper_galleries_of_old_crown_catacombs` `active`. Bei späterem 10B-3-Guild-Review kontrollieren, dass Boardrotation und echte aktive/abgelaufene Verträge unabhängig und eindeutig bleiben.

**R6-5 – Performancebeobachtung, kein bewiesener JS-Slowdown:** Mediane pro Providerrolle: Planner **2,53 s** (33), Narrator **14,0 s** (32), Extractor **7,66 s** (34 einschließlich zwei Repairs), Board **14,66 s** (3). Auffällig: Extractor-Aufruf **90 / Zug 31 = 65,54 s** bei `stop` und korrekter späterer Buchung, Narrator-Aufruf **63 = 56,18 s**. Providerzeiten nicht mit `player.decideMs` (334 s insgesamt) oder Engine-Fold additiv verwechseln. Cache: Planner 270.994/330.518, Extractor 262.132/324.520, Narrator 156.116/360.003 Prompt-Tokens; unterschiedliche Rollen/Kontexte sind **keine** direkte Cacheoptimierungsfreigabe.

## 5. Was dieser Run ausdrücklich nicht abnimmt

- **Keine 100 echten Züge**, keine Langzeit-500/1000-Regression, kein Dungeon-Floor-Clear/Boss/Reset; erster Dungeon-Encounter endet mit Tod.
- Keine organische neue Skill-/Passive-/Klassenentwicklung, kein E-Rang, kein konkretes Gear-Upgrade, kein PvP, kein gezielter Chase-Test.
- Keine sichere Schlussfolgerung zur generellen Warrior/Mage/Rogue-Balance, obwohl die XP-/Level-Werte mechanisch nachvollziehbar sind.
- Keine erfolgreiche Narrator-Empty-Recovery (`10B-4d` ist im Spiel noch nicht implementiert); dieser Lauf benötigte sie gerade **nicht**. Ebenso keine globale Vollabnahme von Host-Swipe-Wechsel, Reload und verlorenen `swipe_info.extra`-Snapshots.
- Keine Verifikation aller früheren Delivery-/Combat-/Guild-Sonderfälle allein deshalb, weil dieser einzelne natürliche Questzyklus gelang.

## 6. Empfehlung und Regressionen – keine Codefreigabe

**Wertung:** Positiver echter .66-End-to-End-Nachweis für Host-Extraktion, Guild-Cull-Zyklus, Schlaf, Geld und zusammenhängenden Dungeon-Kampf. **Game Over regulär und mechanisch richtig**, aber vor 100 Zügen. Keine technische P0-Regression und daher kein Anlass für eine weitere pauschale .66-Hotfix-Schleife. Bei nächsten Runs weiter natürliche Spielbarkeit unter anderen Starterklassen beobachten.

Spätere gezielte Negativfälle für die zuständigen Fachpläne:
- Combat-Truth: Engine `defeated=[A,B]`, C überlebt → Narrator darf nicht `all three killed` oder drei Leichen als mechanische Tatsache persistieren.
- Szene/Ziel: hörbare, verdeckte Kreatur bleibt korrekt untargetierbar, wird nach echter Sicht-/Materialisierung erreichbar; kein stiller Angriff.
- Guild: ein aktiver Cull-Counter 0→4 und genau ein READY/Proof/Payout, Day-2-Board kein Re-Listing desselben abgelaufenen ID-Status als neuer aktiver Altvertrag.
- Tod und Kampfaktionen: Doppelwunsch „Basic Attack, then Flame Lance“ bucht keine zweite PC-Aktion bei nur einem Hauptzug; Gegner C darf den Mage mit 4 HP töten; vorherige zwei Gegner tot, keine erfundene Defeat-XP auf PC-Tod.
- Bei Bedarf Dungeon-Risikokommunikation vergleichen, **ohne** Level-Anpassung, Gratiswissen oder harte Neuregelung ohne Nutzerentscheid.

**Archivstatus:** REVIEW.md erstellt; **Original-ZIP muss als unveränderte Binärdatei separat nach GitHub hochgeladen werden**, anschließend Byteidentität über Größe/SHA-256 beziehungsweise Git-Blob-SHA1 prüfen. Kein Produkt-, Guide-, Balancing- oder Testcode wurde geändert.
