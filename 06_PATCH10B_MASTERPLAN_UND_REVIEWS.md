# Avereth Engine – Patch 10B: technische Langlauf-Stabilisierung und begrenzte F-Pacing-Kalibrierung

**Stand: 02.11.2026. 10B läuft noch; keine vorgezogene Freigabe der nächsten Roadmap.** Der aktuelle Produkt-, Test- und nächste Arbeitsstand steht ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md), verbindliche Spielregeln in [02](02_DESIGN_KANON.md), bewusst zurückgestellte Vorhaben in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), natürliche Originaldaten im [Runindex](testrun_10b/README.md). [Historische Indexfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) und [ursprüngliches Journal §§0–32](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) erhalten die Entstehungsgeschichte.

## 10B: ursprüngliche Absicht und tatsächlich entstandener Schwerpunkt

**Ursprünglich** war 10B als Balance-/Pacingpatch angelegt: F-Rang-Spielbarkeit, Kampf- und Gruppenrisiken, XP-/Leveltempo, Ausrüstung, Training und der F→E-Übergang sollten in natürlichen Runs geprüft und kalibriert werden. **Die langen natürlichen SillyTavern-Läufe änderten die praktische Aufgabe:** Wiederkehrende Planner-/Extractorfehler, falsche Handlungs- und Ortsauflösung, blockierte Käufe/Questabschlüsse, Save-/Hostfehler und Runnerabbrüche verhinderten oft erst einmal die verlässliche Beobachtung von Balance.

**10B ist deshalb inzwischen primär ein technischer Langlauf-, Integritäts- und Integrationsstabilisierungsblock** mit wenigen gezielten F-Pacing-/Trainingsverbesserungen. Der Titel bezeichnet die tatsächliche Arbeit und den aktuellen Abschlussmaßstab, nicht rückwirkend die ursprüngliche Planung. Bisherige Balanceentscheidungen bleiben gültig, soweit [02](02_DESIGN_KANON.md) sie festhält; ein vollständiges F-/E-Scaling oder die Gesamtbalance ist **nicht** damit abgeschlossen.

| In 10B tatsächlich dominierend | Begrenzter Balance-/QoL-Anteil |
|---|---|
| Erhalt von Spielhandlungen über viele Turns: Planner, Extractor, Fail-soft, semantische Ablehnungen und begrenzte Recovery | Experimentelles XP×5 zum Erreichen von F-Level 15, ohne andere Levelschwellen umzubauen |
| Autoritativer Zustand und Replay: Event-Fold, Save/Reload, Swipe/Edit, Host-/Runner-Lifecycle und überprüfte Persistenz | Gezielte Start-/Gear-/Kampfkalibrierungen; keine abschließende Klassen-, Monster- oder Wirtschaftsbalance |
| World-/Quest-/Gilden-/Handelsintegration: echte Ankunft, NPC-/Objektidentität, Geld-/Warenbuchung, Killcredit und Fortsetzung | Lern-/PP-Qualifikation, Skill-Evidenz und verständlichere Trainingsziele; **LP-Raten/-Kosten sowie PP-Mengen bleiben unverändert** |
| Originale natürliche Mehrklassen-Langläufe mit nachvollziehbaren Reviews, technischen Reproduktionen, Regressionen und ST-Smokes | Kleine freigegebene Combat-QoL-Entscheidungen (AoE, Gefahrenanzeige), nicht das gesamte spätere Kampfdesign |

Die umfangreiche Produktgeschichte unten dokumentiert die vielen nötigen Fixes; sie ist **kein Auftrag**, jede seltene Textabweichung oder hypothetische Finanzkante weiter zu perfektionieren.

## Aktuelle Zielsetzung: zuverlässige natürliche Kampagnen

**Vorrang hat die Fortsetzbarkeit echter Runs über viele unterschiedliche Spielhandlungen.** Technisch korrekter Geld-/Inventar-/Quest-/Kampfzustand soll gespeichert und nachgeladen werden können; ein Modellfehler darf nicht routinemäßig eine lange Kampagne beenden. Bereits korrekt abgewehrte Eingaben sind kein Defekt, dürfen aber nicht dauerhaft in derselben unbehebbaren Ablehnungsschleife festhängen.

Wesentliche Befundklassen getrennt ausweisen:

- **Schwerer technischer Aussetzer/Stopper:** ungesicherte Persistenz oder fehlerhafte Buchung, ungültiger Fold/Zustand, verlorene gültige Handlung ohne sichere Fortsetzung, wiederholte unauflösbare Integrationsblockade oder technischer Host-/Planner-/Extractorabbruch. Ursache und Zuständigkeit benennen; externe Provider-/Windows-Probleme nicht als Engine-Ursache ausgeben, aber ihren Einfluss auf die Run-Zuverlässigkeit sichtbar lassen.
- **Fortsetzbarer technischer Vorfall:** nachweislich sichere Recovery, einzelne Repair-Runde oder klare lokale Nichtausführung ohne Folgeschaden. Nicht mit einem vorzeitig beendeten Run gleichsetzen; Häufung und verloren gegangene Spielzeit trotzdem beachten.
- **Regelgerechtes Gameplay:** Charaktertod, riskante Entscheidung, abgewiesener unzulässiger Kauf, abgeschlossener Meilenstein, reguläres Turn-Limit oder manueller Stopp sind für sich **keine technischen Fehler**. Ein kurzer Tod liefert allerdings wenig Langlaufabdeckung.
- **Balance-/Designbeobachtung:** langsamer Levelaufstieg, wenig Skillwachstum, Kampfschwierigkeit, Erzählqualität oder wenig interessante Aufträge getrennt von technischen Stopps bewerten. Keine großen Zahlenänderungen als Sofortmaßnahme gegen einen Integrationsfehler.

Technische Nachweise aus Node, Replay und echtem SillyTavern-Host mit Mockprovider bleiben notwendig, **ersetzen aber nicht** die Erfahrung natürlicher Modell-Langläufe. Ein Runner-Status „completed“ belegt nur ein Ende; Level 15 und E-Klassenannahme sind wichtige **Abdeckungs-/Gameplay-Meilensteine**, keine automatische Stabilitätsabnahme.

## Wann 10B endet und wir wieder eine Roadmap erstellen

**10B wird nicht bei einer fest vorgegebenen Buildnummer, einer bestimmten Anzahl Runs oder automatisch bei Level 15 geschlossen.** Über mehrere aktuelle natürliche Batches auf nachweisbar demselben Build ist zu prüfen, ob eine **für den Nutzer akzeptable Quote** ohne größere technische Aussetzer erreicht wird – **insbesondere ohne technisch erzwungene Runabbrüche**. Den nötigen Grenzwert und die endgültige Freigabe legt der Nutzer anhand der tatsächlichen Ergebnisse fest. Die folgenden Zahlen sind ausdrücklich unverbindliche Diskussionsbeispiele, keine beschlossene Hürde oder automatische Abschlussgarantie.

Für diese Entscheidung künftig je Batch knapp gegenüberstellen:

1. **Denominator und Ende:** gestartete/auswertbare Warrior-, Mage- und Rogue-Kampagnen, Spielerinputs und abgeschlossene Engine-Turns; tatsächlicher Endgrund (Tod, Ziel erreicht, Limit, manuell, Modell, Engine, Host, Provider, Infrastruktur). Keine manuell nicht gestarteten Profile mitzählen.
2. **Technische Erfolgsquote:** Kampagnen **ohne gravierenden technischen Aussetzer** und separat die Anzahl/Quote **ohne technisch erzwungenen Abbruch**. Fortsetzbare Recovery, Wiederholungsloops und eventuelle Folgeschäden extra vermerken; für die Quote auch externe Ausfälle kenntlich machen, statt sie still zu streichen.
3. **Abdeckung:** Neben Gesamtzahlen **substantielle Langläufe** getrennt betrachten: Kampf, Quest, Handel, Reisen, Lernen, Save/Reload sowie L15 und ausdrückliche E-Annahme, soweit natürlich erreicht. Eine Serie aus wenigen kurzen regelgerechten Toden kann die technische Langlaufzuverlässigkeit nicht allein belegen.
4. **Integrität:** Originalexport und Endgrund, Event-Fold/Validierung, Transaktionen, konkrete Fehlermeldungen und bestätigte Datenträgerpersistenz prüfen, soweit verfügbar. Offene ungesicherte Saves nicht nachträglich als „bestanden“ deklarieren.
5. **Trend und Restschwere:** Wiederholen sich gravierende Ursachen über aktuelle Batches? Können seltene, lokale und fortsetzbare Fehler bewusst toleriert werden, ohne echte Spieleraktionen zu verlieren? Neue gezielte Patches nur bei relevanten belegten Problemen.

### Mögliche Messgrenzen – ausdrücklich spekulativ

**[DISKUSSIONSVORSCHLAG, keine Abnahmevorgabe]** Statt eine einzige Quote zu verwenden, könnten wir die letzten etwa zehn natürlichen Runs auf demselben Produktbuild und vergleichbarer Konfiguration gemeinsam bewerten:

| Perspektive | Denkbare Größenordnung | Aussage und Grenze |
|---|---|---|
| Weitgehend störungsarme Runs | **8/10 ohne größeren technischen Aussetzer** | Kleine lokale Erzählfehler oder sichere automatische Recovery dürfen vorkommen; erhebliche Blockadeschleifen zählen weiterhin als Störung. |
| Fortsetzbarkeit | **9–10/10 ohne technisch erzwungenen Abbruch**, Ziel 10/10 | Strenger als „überwiegend spielbar“. Ein externer Einzelfall wird sichtbar eingeordnet; derselbe ungelöste Serienstopper spricht gegen den Abschluss. |
| Einzelne Handlungen | **95–98 % ohne technisch nötige erneute Spielereingabe** | Bezugsgröße sind handlungsbezogene Spielerinputs **einschließlich gescheiterter Versuche**, nicht nur erfolgreich abgeschlossene Engine-Turns. Automatische Repairs separat zählen; regelgerechte Ablehnungen sind keine Technikfehler. |
| Langlaufabdeckung | Beispielsweise **mindestens drei Runs mit jeweils 150–200 Inputs**, alle drei Klassen in der Serie vertreten | Kurze Tode können technisch korrekt sein, ersetzen aber keine Langlaufprüfung. Länge und Ergebnisse zusätzlich je Klasse ansehen. |

**Empfehlung für die spätere Diskussion:** 8/10 störungsarm **plus** möglichst vollständige Fortsetzbarkeit und echte Langlaufabdeckung ist brauchbarer als „80 % aller Turns funktionieren“. Letzteres ließe ungefähr jede fünfte Handlung scheitern; viele einfache erfolgreiche Turns könnten außerdem einen regelmäßig kaputten Kauf-/Abgabeweg verdecken. Wiederkehrende Probleme deshalb auch je Kernablauf betrachten, ohne neue Testbürokratie einzuführen.

Manuelle Stopps und reguläre Tode bewerten nur den beobachteten Abschnitt, niemals eine nicht gespielte Fortsetzung; ein manueller Stopp *wegen* einer Technikschleife verbirgt deren Ursache nicht. Provider-/Hostausfälle bleiben in der Gesamtsicht sichtbar. **Geld-/Zustandskorruption oder ungesicherte Saves nicht durch eine gute Durchschnittsquote wegmitteln.** Zehn Runs sind eine pragmatische Beobachtungsserie, kein statistischer Zuverlässigkeitsnachweis. Kein Punkt ist allein ein automatischer Blocker oder eine Freigabe; endgültige Gewichtung und tolerierte Restrisiken bleiben Nutzerentscheidung.

**Übergangskriterium:** Sobald die wiederholten aktuellen Naturtests insgesamt hinreichend stabil sind und keine wesentlichen serienmäßigen technischen Runstopper mehr zeigen, entscheiden wir ausdrücklich über das **Ende von 10B**. **Erst danach erarbeiten und priorisieren wir eine neue Roadmap** auf Basis des aktuellen Kanons, der offenen Ideen und der tatsächlich beobachteten Spielqualität. Sie wird nicht heute vorab als nächste Patchnummer oder als automatische Freigabe festgelegt.

Mögliche Roadmap-Themen sind späteres F-/E-Scaling und Content, Engine-Shops, Main/Minor, NPC-/Monster-Design, Weltentwicklung und weitere Spieler-QoL. Diese bleiben bis zu gesonderten Entscheidungen **offen**; sie sind keine zusätzlichen 10B-Abnahmepflichten und keine Einladung zu einem weiteren umfassenden Finanz-/Architektur-Audit. Ein neuer schwerer technischer Blocker kann selbstverständlich weiterhin innerhalb 10B korrigiert werden.

## Quellenwegweiser für bisherige 10B-Arbeit

## Fachpläne: fachlich umgesetzt oder ausdrücklich offen

| Bereich | Stand / maßgebliche Quelle |
|---|---|
| Architektur A → B1 → C → D | **Implementiert bis Build .136**, Code- und Replaynachweise sowie ST-Host-Smokes in [03](03_AKTUELLER_PROJEKTSTAND.md), [ursprüngliche Umsetzungsspezifikation](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). Produktkommits: [A .127](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/167e2e9), [B1 .130](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59e1305), [B1-Startschutz .131](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc71256), [C .132](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8908850), [D .133](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bc44df1), [D-Reviewabschluss .136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926). |
| Start mit Makros | **Behoben in [.137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373)**: Start auf aufgelöster ST-Begrüßung mit korrektem Ort; echter ST-Makro-Start 26/26, Fullsuite und Replay grün laut Implementierung. Der ursprüngliche .136-Batch ist als abgebrochener Beleg erhalten. [03](03_AKTUELLER_PROJEKTSTAND.md). |
| Finanzarchitektur / Vereinfachung | **S1/S2 umgesetzt in [.144](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f00e598/avereth-engine/docs/FIX144_FINANCE_SIMPLIFICATION.md)**, echte Zahlungsquellen-/Hostintegrität gesichert in [.145](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0a2beca/avereth-engine/docs/FIX145_PAYMENT_PERSISTENCE.md). Maßgeblicher [Fachplan](patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md); historisch [Audit](patch_plans_10b/PAYMENT_SYSTEM_AUDIT.md), [Konsolidierung](patch_plans_10b/PATCH_PAYMENT_CONSOLIDATION.md), [.142-Stoppregel](patch_plans_10b/PATCH_FINANCE_REVIEW142.md). Laufender Stand ausschließlich [03](03_AKTUELLER_PROJEKTSTAND.md). |
| Handels-/World-Integration nach Batch21 | **Umgesetzt in [.146 / 9136f8f](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9136f8ff664ad12e29fc74190f5d8a0909e3d4eb/avereth-engine/docs/FIX146_BATCH21_TRADE_BOARD.md)**: Händler-Präsenzrepair, Sheet-Item-Gebote, etablierte Gegenparteibezeichnung und kanonische Art-Singular/Plural. [Originalreview](testrun_10b/batch-20261101-152756Z/REVIEW.md), aktueller Stand in [03](03_AKTUELLER_PROJEKTSTAND.md). Ein späterer [Engine-Shop](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#handel--engine-shop-fallback) bleibt ein **nicht freigegebener Roadmap-Kandidat**, kein 10B-Stabilitätsblocker. |
| Batch22-Technik und Design | [.147 Speicher-/Auswahlfix](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/a9f00b4/avereth-engine/docs/FIX147_BATCH22_SAVE_SELECTION.md); umgesetzt: [.148 Combat-QoL](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/130ea266e29d1daee53b14ae20e46adc0bc53ed0/avereth-engine/docs/DESIGN148_COMBAT_QOL.md) und [.149 organisches Skillwachstum](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b7b30d0b763a4142a821d335e250dfbc4c3c8b4a/avereth-engine/docs/DESIGN149_SKILL_GROWTH.md). [Designgrundlage](patch_plans_10b/DESIGN_BATCH22_COMBAT_PROGRESS_SHOPS.md); Engine-Shops weiter offen, keine Freigabe daraus ableiten. Abnahme in [03](03_AKTUELLER_PROJEKTSTAND.md). |
| Natürliche Langläufe / Paket F | [Runner](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6cc09cd/avereth-engine/docs/LIVE_RUNNER.md), [Runindex](testrun_10b/README.md). Aktueller Produkt- und Batchfreigabestand in [03](03_AKTUELLER_PROJEKTSTAND.md). |
| B2 / E | **Nicht begonnen und nicht Voraussetzung für F.** B2 entfernt rein historische formale Privatquestreste; E den größeren ungenutzten V3/V4-A/Ruleset1-Pfad nach Nutzungskarte. [Fachplan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). |
| Main/Minor | Beschlossener, **noch nicht implementierter** [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md). Vor der Umsetzung alte Kompatibilitätsstellen aktualisieren. |
| F-/E-Scaling, Monster, NPC-Langzeitwissen, Questfreiheit | **Spätere Themen ohne aktuelle Freigabe.** [Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). |

## Produktgeschichte – nur Commitwegweiser

Keine erneuten Patchdetails oder historischen Testzahlen in diesem Index; Implementierung und ursprüngliche Abnahme beim jeweiligen Commit beziehungsweise in der dortigen Fachpatchnote.

| Builds | Ergebnis / Commit |
|---|---|
| .58–.87 | Delivery-/Guard- und Dungeon-/Gildenmechanik, organische Entwicklung, World-/NPC-Kontinuität: [altes 10B-Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [.66](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cd9b33), [.85](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2bab566), [.87](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1584dd7). |
| .88–.113 | Frühere Handel-/Ort-/Händlerregeln, Recovery, Failsoft, Registrierungs- und Dungeon-UI: [.96](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f50ca4e), [.103](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/48bdf5d), [.105–.110](patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md), [.113](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/55c547f). |
| .114–.120 | F-Balanceversuch, Band-AoE, Gildenfilialen, vorläufiger Doppeljagdschutz: [.114](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/89aaf08), [.116](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/41a17fc), [.117](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9a76eb), [.120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f). |
| .121–.126 | XP×5, false-refusal-Fixes, PP/Gear-Testpreise, Gebiets-/Populationskohärenz: [.121](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f1), [.122](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/013e0dc), [.123](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c300f3d), [.124](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/97d0976), [.126](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b8d2af4). |
| .127–.136 | Architektur A/B1/C/D: [oben](#fachpläne-fachlich-umgesetzt-oder-ausdrücklich-offen), [D-Fachpatchnote samt Host-Smokes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). |
| .137–.145 | [.137](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373) Makro-Start, [.142](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f84e6e5)/[.143](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d2a292a) Finanzgrenzen, [.144](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f00e598) S1/S2-Vereinfachung, [.145](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0a2beca) Edit-/Fold-/Host-Abnahme. Details in den verlinkten Fachpatchnotes. |
| .146–.149 | [.146](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/9136f8f) Handels-/Boardintegration; [.147](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9f00b4) Save-Recovery und Kaufartikelauswahl; [.148](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/130ea26) AoE-/Gefahren-QoL; [.149](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b7b30d0) eng begrenzte Skill-PP-/Evidenzkalibrierung. Details oben und in Fachpatchnotes. |

## Natürliche Originalbelege

Natürliche Batches 1–22 und Gegenreviews sind im [Runindex](testrun_10b/README.md) verzeichnet; die älteren ZIPs im [Originalarchiv](testrun_10b/ARCHIV_BATCHES.md). [Batch20](testrun_10b/batch-20261031-140346Z/REVIEW.md) belegt nach .137 einen natürlichen Warrior-Langlauf, [Batch21](testrun_10b/batch-20261101-152756Z/REVIEW.md) auf .145 die konkreten Handels-/Board-Integrationsprobleme bei intakter Finanzbilanz. [Batch22](testrun_10b/batch-20261101-174704Z/REVIEW.md) samt [Originalarchiv](testrun_10b/batch-20261101-174704Z/ARCHIVE.md) begründet die folgenden Technik- und Designpatches. Keine Zweitauswertung hier; aktueller Handlungsbedarf in [03](03_AKTUELLER_PROJEKTSTAND.md).

**Pflege:** Jeder neue Naturbatch erhält seinen Originalreview und eine kurze Indexzeile. Die rollierende Zuverlässigkeitsbewertung und die nächste Aktion gehören nach 03, keine parallele zweite Quote in 06. Neue Fachquellen/Abschlüsse hier nur verlinken; die historische Patchkette nicht neu erzählen. 10B und die künftige Roadmap werden ausschließlich durch ausdrückliche Nutzerentscheidung abgeschlossen bzw. gestartet.
