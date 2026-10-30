# Batch 16 – GPT-Originalreview des natürlichen .120-Batches

**30.10.2026. Nur Dokumentation, keine Engine-, Runner- oder Balanceänderung.**

**Originalnachweis:** Chatupload batch-20261030-002939Z.zip, 55.380.015 Bytes, 49 ZIP-Einträge, vollständiger CRC-Test ohne Fehler, SHA-256 **2afff5e2f0961e778891df747d604830bf142bd189e8b558f8b00f5c412571bc**. Das Original ist **nicht** auf GitHub. Alle drei run.json, evaluation.json, avereth-events.json, player.jsonl und chat.jsonl wurden eingesehen, dazu ausgewählte Einzelereignisse und Narratorantworten. Die 4.424 Engine-Events wurden statistisch ausgewertet; XP-/Level-Carryover und sämtliche Geldsalden unabhängig arithmetisch nachgerechnet. **Kein separat ausgeführter kompletter JavaScript-foldChat-/validateState-Replay**, kein neues npm test und kein neuer ST-Smoke durch diesen Review. Die Abnahmeberichte des Implementierers sind getrennte Nachweise.

## 1. Originalstand und Enden

Alle drei Kampagnen: echter GLM-5.3-Flash-Testspieler, SillyTavern, Ruleset 2 / V4-C, AoE-Starter, Build **4.3.0-c.6.6.120**, sauberer Produktcommit **[ca7a78f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece)**. Kein Stub, keine modifizierten Dateien, Profile unverändert, secretHits 0, keine PageErrors; alle letzten Engine-Statuszeilen mit **integrity: OK**.

| Lauf | Spielerinputs | Engine-Turns | Engineevents | Endlevel / Ende | Kampfbilanz | Guildabschlüsse | Kontostand |
|---|---:|---:|---:|---|---|---:|---:|
| Warrior | 29 | 28 | 418 | L1 / Kampftod | 1/2 Siege | 1 | 120 cp |
| Mage | 150 | 132 | 2.172 | L9 / Limit, lebt | 16/16 Siege | 8 | 995 cp |
| Rogue | 150 | 134 | 1.834 | L8 / Limit, lebt | 13/13 Siege | 6 | 626 cp |
| **Gesamt** | **329** | **294** | **4.424** | 1 Tod, 2 Limits | **30/31 Siege** | **15** | |

Der Wrapper meldet batch.status=completed, weil alle Prozesse ihre Endgründe erreichten, nicht weil Level 15 erreicht wurde. **Keine terminalen technischen Abbrüche.** Warrior und Rogue mit 0 sicheren Modell-Fail-soft-Fortsetzungen. Mage mit **zwei** sicher fortgesetzten Extractor-/World-Fehlern (Index 66, ungültiges place.reported; Index 294, ungültiges passage.to). Im Mage-Serverlog ein einzelner **internal_server_error** einer Chat-Completion-Anfrage, trotz anschließender Fortsetzung bis zum Inputlimit. Kein weiterer kausal belegter fataler Providerfehler. Reparierte oder abgewiesene Deltas dürfen nicht mit terminalen Fehlern gleichgesetzt werden.

## 2. XP, sinnvoller Spielfortschritt und Entwicklung

Alle XP-Auszahlungen nach den Originalereignissen addiert, sämtliche level.up-Übergänge und gespeicherte Rest-XP nachgerechnet: **keine Differenz** zur Schwelle 100 × aktuelles Level. Für Level 15 sind kumuliert 10.500 XP nötig.

| Lauf | Kampf-XP | Guild-XP | XP insgesamt | Level / Rest-XP | Input 100 |
|---|---:|---:|---:|---|---|
| Warrior | 24 | 46 | **70** (0,7 % von L15) | L1 / 70 | nicht erreicht |
| Mage | 1.914 | 2.028 | **3.942** (37,5 %) | L9 / 342 | L6, 513 cp |
| Rogue | 1.830 | 1.352 | **3.182** (30,3 %) | L8 / 382 | L7, 496 cp |

Mage bewältigt 16 Begegnungen und acht Guildaufträge, darunter den tatsächlichen Old-Crown-Catacombs-Floor-1-Clear. Die **810 Quest-XP** für den L9-Bog-Lurker sind die bestehende Dangerous-Questformel, nicht automatisch eine Fehlvergütung. Rogue erreicht mit 13 gewonnenen Encountern und sechs Guildabschlüssen L8, überwiegend mit Einzelgegnern. Warrior absolviert nur den Einstiegskampf und einen Vertragsabschluss vor dem Tod. Rohe Eingabezahl und gewonnene XP-Handlungen sind nicht gleichzusetzen: Reisen, Gespräche, Regeneration und Lernen sind auch ohne XP sinnvolle Spielerhandlungen. Eine lineare Level-15-Turnprognose aus den drei unterschiedlichen Verläufen wäre unzuverlässig.

**Zeitliche Abgrenzung:** Nach dem Export dieses .120-Batches wurde auf dem Produktbranch bereits **[Build .121 / 00fa7f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f11567067da59f8a89e94a49f4c2618464f)** mit **XP×5 statt ×2** umgesetzt. Die vorliegenden Events sind weiterhin .120 mit ×2. Rein rechnerisch würden dieselben unveränderten Auszahlungsereignisse unter ×5 Mage **9.855 XP / L14** und Rogue **7.955 XP / L13** ergeben; **kein** natürlicher .121-Beleg. Höhere Level verändern reale Questwahl, Gegnerkontakt und möglicherweise Wachstum, daher ist die Projektion kein simulierter Alternativrun.

## 3. .120-Gilde: kanonische Halle und doppelte Jagden

**Positiver natürlicher Gildenfall:** Der Rogue entdeckt eine zunächst nicht etablierte Gildenhalle in **Coldwell**. Beim ersten Aufsuchen ist board.read noch mit **no Guild board here** verweigert, bevor die Welt die Halle etabliert. Anschließend erhält **loc.coldwell.coldwell_guild_hall** per place.updated den Status visited und den funktionalen Tag **guild_hall** (Original-Chatindex **164**). Später folgen ein erfolgreiches **Coldwell-Novice-Board** (Index **195**), eine dortige Vertragsannahme (Index **197**) und zwei tatsächliche Turn-ins mit **getrennten Quest-IDs und einmaligen Transaktionen**: **180 cp** für Ridgeback Boars (Index **192**) und **150 cp** für Otterhounds (Index **254**), beide an derselben Coldwell-Gildenhalle. Das ist ein echtes natürliches Establishment- und Wiederverwendungsbeispiel, nicht nur ein Mock.

Alle insgesamt **15** registrierten quest.status=completed haben je eine eigene passende Guild-transaction.completed und Quest-XP. Kein T141-artiger Auszahlungsverlust und keine doppelte Zahlung derselben abgeschlossenen Quest beobachtet. Die nacheinander neu ausgeschriebenen Marten-, Serpent-, Sprout- und Otterhoundjagden sind **keine gleichzeitig aktiven identischen Jagden**. Der neue Schutz vor derartiger Überlappung und die Bestandsgültigkeit bereits früher angenommener Altverträge wurden durch diesen natürlichen Lauf **nicht gezielt als Negativ-/Legacyfall getestet**; dafür bestehen die separaten .120-Regressionsnachweise. Ein vor Einrichtung der Coldwell-Halle verweigertes Board ist nicht mit der später erfolgreich etablierten Halle zu verwechseln.

## 4. Geldintegrität und konkrete 17-cp-Verkaufslücke

Alle **30** coin.changed-Saldoübergänge ab 50 Start-cp (Warrior 3, Mage 17, Rogue 10) arithmetisch konsistent. Einmalige Gildenauszahlungen: Warrior insgesamt 40 cp, Mage **995 cp**, Rogue **710 cp**. Mage verkauft Loot drei Mal erfolgreich für **10 + 10 + 40 = 60 cp** und erwirbt einen Primer of Ward für 80 cp. Rogue kauft einen Primer of Mend für 80 cp. Keine doppelte Zahlungsverarbeitung festgestellt.

**P2 – narrativ bestätigter Rogue-Verkauf bleibt vollständig ungebucht.** Original **Engine-T36/37, Chatindex 77–80**: Der Rogue bietet der **anwesenden Gildenangestellten in Glassmere** vier Otterhoundfelle und neun Fangzähne an. Sie **selbst** benennt den konkreten Preis **8 + 9 = 17 cp** und erklärt ihn als ihren Schalterpreis. Der Extractor gibt eine bid-Extraktion mit der korrekten Käuferin, beiden Lots und price_cp=17 aus, aber die Engine verwirft diese mit **delta.rejected / offer: „third-party price advice is not this speaker’s bid“** (Index 78). Danach akzeptiert der Spieler ausdrücklich die 17 cp; der Planner interpretiert den **Gesamtpreis** als zwei getrennte sell-Commands mit **je min_cp=17**. Der Narrator beschreibt die Münz- und Warenübergabe, jedoch fehlen mangels akzeptierten Gebots eine matching Offerte und die gültigen Verkaufsnachweise: **sale_evidence abgewiesen; keine transaction.completed, keine coin.changed +17, kein belegter Warenabgang**.

Die Wallet ist **rechnerisch korrekt**, der beschriebene Handel jedoch **mechanisch nicht vollzogen**. Erstens den offensichtlich eigenen Preisvorschlag der handelnden Käuferin gegen den Third-party-Filter abgleichen; zweitens die Zerlegung eines gemeinsam verhandelten Paketpreises prüfen. Vor einem Fix die konkrete Originalsequenz gegen echte Drittanbieterberatung, erfundene Zustimmung und Mehrfachbuchung testen. **Kein automatischer Patchauftrag und keine generelle Lockerung von Geldbelegen.**

## 5. Kampf und Bedienung: Trennung von Spielerfehler und Enginefehler

**Warrior:** Nach einem L1-Serpent-Sieg (24 XP), einer 46-XP-/40-cp-Gildenabgabe und 50 cp echtem Lootverkauf folgt die Jagd auf **zwei L7-Tusked-Orchard-Boars** (je 90 HP, ATK 26). Der Spieler versucht vor dem Kampf viermal vergeblich einen Angriff aus falscher Reichweite, weil Cleave und Basic Attack **ENGAGED** erfordern. Im eröffneten Kampf werden Basic Attack und **zweimal Cleave** tatsächlich ausgeführt; Cleave trifft beide Eber, der PC verliert aber gegen die starke Gegnergruppe und stirbt. Keine XP aus dem verlorenen Encounter, keine nachgewiesene falsche Schadenberechnung. Risiko-/Distanzentscheidungen dominieren diesen frühen Tod.

**Mage:** 12 Arcane-Bolt- und sieben Arcane-Wave-Aktionen mit 11 Wave-Einzeltreffern, davon drei Mehrzielaktionen; drei korrekt abgelehnte LONG-Angriffe bei MEDIUM-Skillreichweite. Der Old-Crown-Catacombs-Floor-1-Clear besitzt **credit:pc, pc:3, others:0** und wird korrekt abgeschlossen. Der später gemeldete Floor-2-Clear besitzt **credit:others** und erzeugt keine persönliche Floor-2-Belohnung. Gegen Ende zwei als **blocked** abgelehnte Passagenaktionen; zusammen mit der späten ungültigen passage.to-Extraktion ein möglicher enger Kontinuitätsprüffall, kein bewiesener globaler Dungeonfehler.

**Rogue:** 20 mechanisch ausgeführte Razor-Cut-Angriffe, vier Fan-of-Blades-Aktionen (fünf Treffer, davon eine Mehrzielaktion). **19** abgewiesene Kampfversuche wegen nicht erfüllter ENGAGED-/SHORT-Reichweite, darunter wiederholte LONG-Angriffe gegen Otterhound F. Die Ablehnungen sind regelkonform, aber echte Reibung beim LLM-Testspieler; nicht 19 vermeintliche Engine-Schadensbugs daraus machen. Razor Cut steigt auf **P2**, weitere PP für Razor Cut, Fan und Basic, kein neuer aktiver Skill. Die Primerkäufe bei Rogue/Mage sind real, eine neue Technik wird aus bloßem Sofortlesen aber nicht automatisch gelernt.

## 6. Gear und weitere Auffälligkeiten

**0 echte equipmentChanges und 0 automatische offer.gear-Angebote** in allen drei Kampagnen. Mage endet mit **995 cp**, Rogue mit **626 cp**; beide könnten rein finanziell die neuen F-Waffenangebote **Fine140 / Superior260 / Exceptional480 cp** bezahlen. Der Mage besucht zwar **Odo (Materialbroker)** und **Halvard (Pelzhändler)**, aber zum Verkauf und **nicht den im Text lediglich erwähnten Schmied**. Der Rogue sucht keinen geeigneten Fachhändler. Die implementierte .114-Offertenerzeugung verlangt einen passenden realen Standort und anwesenden NPC mit Fachhändlerrolle ([.114-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f/avereth-engine/docs/PATCH_F_BALANCE114.md), [items.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f/avereth-engine/src/v4/items.js)). Aus Nullbesuchen/Nullkäufen lässt sich **kein mechanisches Urteil** über Preis, Schaden oder Lootökonomie der Buff-Waffen ableiten.

**Technische Gesamtbewertung:** Beide 150er-Runs spielen trotz einzelner World-/Providerwarnungen weiter. 4 + 3 + 19 = **26** wegen Reichweite als illegal ausgewiesene Kampfaktionen bei Warrior/Mage/Rogue; sie sind überwiegend erklärbare Bedienhandlungen des Testspielers, nicht ein Anlass zur heimlichen Combat-Autoritätslockerung. Gilden-, XP- und Geldrechnungen konsistent. Der Rogue-Verkauf ist eine **separate semantische Buchungslücke**, kein arithmetischer Walletdefekt.

## 7. Ergebnis und nächste Arbeit

**.120 natürlich überwiegend stabil**, besonders die neu etablierte und mehrfach nutzbare **Coldwell-Gildenhalle**. 329 Eingaben, 30/31 Siege und 15 reguläre Guildabschlüsse ohne terminale technische Runabbrüche. **Ein enger P2-Fall**: falsche Verwerfung einer nachweislich eigenen 17-cp-Preisofferte und anschließend ungebuchte Verkaufserzählung. Keine vorsorglichen Mikrofixes aus wiederholten ungültigen Reichweitenangriffen. **Gear weiterhin nicht natürlich abgenommen**, weil kein passender Fachhändler aufgesucht wird.

**Zum Abgleich späterer Batches:** Der neue **.121-XP×5-Versuch** und der bereits separat implementierte **Warrior-Runner-Fachhändlerhinweis** gehören **nicht** zu diesem .120-Originalrun. Ihre natürliche Wirksamkeit bleibt offen. Hier **keine zusätzlichen XP-/Gear-/Runneränderungen**. Original-ZIP weiterhin nur im Chatupload, nicht in diesem Git-Unterordner.
