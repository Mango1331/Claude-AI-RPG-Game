# User04 – unabhängiger Review des natürlichen .159-Laufs

**Run: 06.11.2026, 07:26:40 · Review: 07.11.2026 · Produkt: `2089dccdb7fd3dc08c72c5737c6b111fb6512f56`, Build `4.3.0-c.6.6.159`.** Geprüft wurden der vollständige finale Spielerchat, Eventexport, tatsächliche ST-Requests/-Antworten, Originalfeedback und die betroffenen Produktpfade. Kein Produktcode geändert; keine Implementierungsfreigabe aus diesem Review ableiten. Quellen/Hashes im [Manifest](SOURCE_MANIFEST.md), Messwerte und Gegenproben in [PROBE_RESULTS.json](PROBE_RESULTS.json).

## 1. Urteil und Bedeutung des Spielerfeedbacks

**Ein technisch fortsetzbarer, deutlich besser spielbarer Lauf mit erfolgreichem Board-Repair und echter Progression. Gleichzeitig bestätigt er begrenzte Such-/NPC-Kontinuitätsfehler und eine starke Schere zwischen gefährlichem Einstieg und später fast widerstandslosen Einzelgegnern.** Kein bestätigter technischer Terminalabbruch, keine Geld-/XP-Doppelbuchung und kein beobachteter unerlaubter Etagenwechsel. Eine fehlerfreie Zustandsvalidierung beweist jedoch weder vollständige Absichtsabdeckung noch korrektes NPC-Wissen.

Das [Originalfeedback](originals/user_feedback.txt) sind laut Nutzer **spontane Gedanken während der jeweiligen Szene**, keine vorab durchdachte Fehlerliste oder automatisch abschließend beschlossenen Regeln. Dieser Review hält Wahrnehmung, mechanischen Befund und mögliche Konsequenz auseinander. „Das ist derzeit regelkonform“ widerlegt kein Gefühl von Langeweile, Übermacht oder fehlender Weltreaktion. Umgekehrt werden aus diesem Gefühl keine ungetesteten Zahlenänderungen oder umfangreichen neuen Systeme abgeleitet.

**Empfehlung:** Den vorhandenen Stand kann man weiterspielen; die Titanquest ist tatsächlich **1/1 erfüllt und abgabebereit**. Vor dem nächsten gezielten NPC-Abnahmelauf wären die unten belegten engen Kontinuitätslücken sinnvoll zu bearbeiten. Parallel ist eine konkrete Auswahl für PULSE und Balance gerechtfertigt; eine neue Pflicht-Batchserie ist dafür nicht nötig. Keine Freigabe für einen pauschalen Monsterbuff oder die automatische Rücknahme aller Startwerte auf 5 unterstellen.

## 2. Umfang und tatsächlich geprüfte Integrität

`I0` ist die erste sichtbare Nachricht; die JSONL-Metadatenzeile zählt nicht. User04 folgt auf den kurzen, im Projektstand/.159-Fixture dokumentierten User03 (.158); der fehlende eigene User03-Ordner wird hier nicht nachträglich erfunden.

| Merkmal | Tatsächlicher Befund |
|---|---|
| Finaler Export | **93 Nachrichten / 46 Userinputs / 38 Enginezüge / 634 Events in 78 Gruppen**, ausschließlich Build .159 in vorhandenen Records |
| Eingaben | Zwei Charaktererstellungsschritte, 36 weitere reguläre Züge; acht weitere Userinputs ohne neuen Enginezug: `#passives`, drei gültige `#assign`, drei fehlerhafte native Eingaben und eine geklärte Richtungsfrage |
| Verlauf | Mage L1→L8, vier gewonnene Kämpfe / sechs getötete Gegner; Floor-1-Clear, Gildenabgabe, Gasthausnacht und Titanjagd. Kein Tod; Export endet nach I92 bei der Suche am Titanlager, ohne protokollierten technischen Stopp |
| Endstand | HP **125/135**, MP **232/328**, STA 100/100; INT 32, AGI 14, PER 13, WIL 18; P1 auf allen drei Skills; Rare-Passive Bone-Set Grit. Maxima nach den zwei letzten Levelups/Statvergaben, keine kostenlose Auffüllung |
| Geld | 50 − 20 Registrierung + 90 Dungeonabgabe − 8 Zimmer = **112 cp**. Titanlohn 550 cp noch **nicht** ausgezahlt |
| Zeit | Minute 540→2095: **25 h 55 min Spielzeit**, Tag 1 09:00 bis Tag 2 10:55 |
| Originalabgleich | **78/78** Exportgruppen entsprechen den eingebetteten Chatevents; **93/93** Chatprefixe ohne Fold-/Validatorfehler; flacher Eventexport und Hostfold identischer Endzustand |
| Extraktionen | **36/36** gespeicherte Originalextraktionen auf aktuellem Produktcode erneut angewandt: persistierbare Events und Folgezustand jeweils exakt gleich, Validator leer. Zwei dieser finalen Antworten benötigten Repair (I16/I34) |
| E0 / tatsächliche Requests | **36/36** finale Narrator-Engineblöcke und ihre E0-Diagnosen exakt rekonstruiert und mit dem ursprünglichen ST-Request verglichen |
| Reloadprobe | Nach JSON-Serialisierung des Chats identischer Foldzustand. Kein physischer Windows-/ST-Speicherstresstest |

Die 38 Enginezüge umfassen die zwei Charaktererstellungsschritte. Der Hinweis „acht weitere Inputs“ bedeutet nicht acht technische Fehler: Die Klärung I39/I40 kostet keinen Zug; `#assign int 5 vit agi 3 per 2`, `#assing` und `#assignt` werden nachvollziehbar ohne Teilvergabe abgelehnt. Die jeweils folgenden gültigen Vergaben funktionieren.

**Prüfgrenzen:** Keine erneute vollständige Node-Suite, historische 2235-Fälle-Replayabnahme, ST-Host-Smokes oder neue natürliche Modellserie ausgeführt. Die Originalextraktionen wurden mit der Produktkonfiguration geprüft; der zusätzlich einschaltbare strenge Debug-Ownership-Assert wurde nicht aktiviert. Frühere .159-Abnahmezahlen stehen in der Produktpatchnote und werden hier nicht als neu selbst durchgeführt ausgegeben.

## 3. Boardfix .159: erstmals natürlicher positiver Nachweis

Bei I11/I12 entsteht ein vollständiges offizielles Board mit vier Jagden und einer Clearance. **Der erste Modellvorschlag ist erneut der ungeeignete einzelne L1-Boar. Der präzisierte Repair korrigiert jetzt auch den Anker:** Aus `boar` wird die L1-`serpent`-Population „mill-shed adder“. Danach werden alle fünf Aufträge gebucht. Originale Requests **12/13**, ST-Zeilen **3864/3965**; das zweite Tagesboard entsteht direkt mit Request **98**, Zeile **32930**.

Damit ist genau die .158-Blockade aus User03 im natürlichen .159-Lauf überwunden. Die Schwierigkeitsgrenze wurde nicht aufgeweicht, ein defektes Teilboard nicht übernommen. Die Questauswahl über F hinweg wird vom Nutzer ausdrücklich positiv beurteilt. Der neue technische Ausfall-/Zeitplan-Guard wird in diesem Lauf **nicht negativ ausgelöst**, weil die Generierung gelingt; dafür bleibt der frühere gezielte .159-Nachweis maßgeblich.

**Zwei verbleibende Boardthemen:**

- I72 lässt den Crossbowman behaupten, Vess habe die gerade angebotene Catacombs-Quest schon übernommen. Das Board bleibt mechanisch korrekt verfügbar; der Text wird jedoch als freier `remark`-Fakt gespeichert (`f.t30.m72.d5_3.1`). Der vorhandene `board.taken`-Schutz greift bei diesem Faktpfad nicht. Das ist ein Erzähl-/Faktintegritätsproblem, keine tatsächliche Entnahme oder Doppelzahlung und kein Wiederauftreten des technischen .158-Boardfehlers.
- Am zweiten Tag wird dieselbe bereits geleerte Etage unter neuer Quest-ID erneut angeboten, obwohl der dreitägige Reset noch aussteht. Eine Gegenprobe nimmt diesen neuen Vertrag nur im Zustandsklon an: Danach verweigert `contractReady()` korrekt die Abgabe, weil der Clear **vor** Annahme stattfand. Kein reproduzierter Geldexploit. Das Angebot ist aber bis zur Erneuerung nicht sofort ausführbar; Listing/Eignungsanzeige und Readiness vor Annahme sind ein enger Prüfpunkt, kein Anlass für ein neues Questsystem.

**Startanzeige als eigener kleiner Befund:** I0 nennt noch Basiswerte 5, während das originale `campaign.started` bereits 7 speichert und I2/I4 korrekt 7 bzw. Favored 8 zeigen. Das ist eine veraltete Einleitungsanzeige im tatsächlich verwendeten Starttext; kein ungeklärter Statgewinn. Bei einer späteren Startwertentscheidung müssen Text und tatsächlicher Content übereinstimmen.

**Doppelte Auflistung:** Der Narrator kopiert insbesondere I72 nahezu die komplette technische Vertragsbeschreibung zusätzlich zu den Enginekarten. Der Nutzer hat mit dem Redundanzeindruck recht. Ein kompakter Atmosphärentext bei vorhandenen kanonischen Karten passt zu Q2/Q5; gemischte Gespräche/Reisen nicht pauschal abschalten. Vollständig Engine-only wäre ein eigener Umsetzungsschnitt und ist hier nicht implementiert.

## 4. Kämpfe, Initiative und Progressionsgefühl

| Kampf | Tatsächliche Gegner und Ablauf | Einordnung |
|---|---|---|
| I19–I23, erste Skelette | Drei normale Skelette **L5/L4/L3**, HP 54/48/42. PC L1, Initiative 10; A ebenfalls 10, geloster Vorrang vor PC. Zwei Waves und Basic Attack; PC **90→34→17 HP**, danach L4 | Ein echter gefährlicher Einstieg, **kein** durchgehend harmloser Run. Der Passive-Beleg „18 % HP“ ist die abgerundete Quote 17/90; nicht vier Gegner |
| I43, Gravekeeper | L4 normal, HP 48, MDEF 1, Initiative 9; Mage L4, INT 18, Initiative 15. Eine Flame Lance, **62 Schaden** | Gleichleveliger Gegner fällt sofort; nach dem anfänglichen Dreifach-Levelup schon starke Machtzunahme |
| I49/I51, Warden | Mechanischer **Floor-1-Guardian L7, Elite**, HP **116**, ATK 26, DEF 7, MDEF **1**, Initiative **12**. PC L4, INT 18, Initiative 15. Zwei Lances: **65 + 66**, 32 MP; Guardian schließt LONG→MEDIUM und stirbt ohne Treffer | Der als Boss erlebte Warden ist weder L4 noch der eigentliche Dungeon-Endboss. Das niedrige MDEF und die Reichweite erklären den leichten Sieg trotzdem überzeugend |
| I81–I85, Titan | L12 normal, `armored_beast`, HP **224**, ATK 41, DEF 18, MDEF **5**, Initiative **8**. PC L6 mit Initiative 18 / INT 25. Hinterhalt **127**, normale Lance **77**, Basic **39**. Nur eine gegnerische Annäherungsaktion; kein Treffer | Erfolgreiches Anschleichen, hohes Zaubertempo und niedrige magische Abwehr begünstigen den gewählten Mage stark; echte Balancebeobachtung statt fehlender Schadensbuchung |

### First Strike ist hier nicht mit Hinterhalt gleichzusetzen

I19, I43 und I49 eröffnen jeweils mit **First Strike ohne Critbonus**. Im C-Kampfpfad wird der deklarierte offene Erstangriff zuerst abgewickelt und verbraucht die eigene Aktion aus Runde 1. Die Initiativeposition wird dafür einmal übersprungen; es gibt keine zweite zusätzliche PC-Aktion in derselben Runde. Das gilt auch für einen tatsächlich gebuchten offenen NPC-Erstangriff. Der Run zeigt dennoch, wie oft der Spieler vor einer klar erzählten gegnerischen Attacke selbst eröffnet.

I18 erzählt herankommende, schneller werdende Skelette. Der Extractor meldet `hostile`; die Engine verwirft das als fehlendes unmittelbares Angriffscommitment. Bedrohliches Näherkommen allein ist im aktuellen Vertrag noch kein gebuchter Erstangriff. Das erklärt die beobachtete Lücke zwischen aggressivem Text und PC-Eröffnung; eine Änderung dieses Maßstabs wäre eine gezielte Kampfstart-/Designfrage.

Im ersten Kampf schlägt A nach dem Erstangriff einmal in Runde 1 und erneut zu Beginn von Runde 2, bevor der PC wieder dran ist. Der Nutzer hat diesen relativierenden Effekt selbst erkannt. **Der Titan ist die andere Situation:** I80 gewinnt der PC den echten Stealthcheck AGI 12 gegen Detection 5 (70,59 %, Wurf 16). I81 ist daher ein **zusätzliches Ambush Opening mit ×1,5**, anschließend wirkt Initiative normal. Nicht jeden schnellen Sieg unter „Gratis-First-Strike“ zusammenfassen.

### Warum der Titan langsam ist und was die Startwerte ändern würden

`npcgen.scaleCreature()` skaliert das jeweilige Ankerprofil. Auf **demselben L12**, normale Variante ohne zusätzliche Modifikatoren:

| Körperprofil | HP | ATK | DEF / MDEF | Initiative |
|---|---:|---:|---:|---:|
| Armored Beast (Titan) | 224 | 41 | 18 / 5 | **8** |
| Skeleton | 96 | 34 | 9 / 2 | 12 |
| Wolf / canid | 74 | 31 | 2 / 2 | **19** |
| Feline predator | 96 | 34 | 2 / 2 | **20** |

Die schnelleren Körperprofile würden den tatsächlichen L6-Mage mit Initiative 18 in der regulären Reihenfolge überholen. Der Titan ist physisch widerstandsfähig, aber kein magieresistenter Sprinter. Eine Angleichung aller Profile würde diese Unterschiede entfernen. Das allein löst aber nicht die beobachtete Dominanz einer starken Fernmagie gegen Nahkämpfer.

**Eigene Bewertung:** Das größere Signal ist das Zusammenspiel aus Dreifach-Levelup nach dem ersten Kampf, fünf freien Punkten plus Favored-Growth pro Level, fokussierter INT-Vergabe, sicherer langer Regeneration, hoher Lancerohwirkung, niedrigem MDEF und Annäherungszeit. Bone-Set Grit erklärt die späteren Siege nicht: Warden und Titan landen keinen Treffer. Die rohe XP-Summe beträgt **3290**, davon **450 Quest-XP**, kein unerklärter Gratislevel. Für eine Balanceentscheidung reichen gezielte Vergleiche dieser existierenden Situationen; kein globaler Koeffizientenumbau auf Verdacht.

Der Wunsch „Basiswerte wieder 5“, „Floorboss mindestens L10“ und stärkere Taten-/Lootbelohnungen bleibt als konkrete Spielerpräferenz erhalten. **Der bestehende Kanon setzt Basis 7.** Eine Rücknahme auf 5 erschwert auch den bereits bis 17 HP gefährlichen Start; ein Bossbuff und Startnerf gleichzeitig wären deshalb nicht ohne getrennte Prüfung sinnvoll. Der wirkliche Floor-2-Endboss ist in diesem Dungeon L23/Rank E und wurde nicht bekämpft. Die Vorschläge für Solo-Bosstaten und Lootboxen sind Zukunftskandidaten, keine hier nachgewiesen fehlgeschlagenen Belohnungen.

## 5. Dungeon, Suche, Knochen und Rast

**Etagenzugang:** Der abschüssige Weg aus I34 ist korrekt als kanonischer Floor 2 angelegt; dessen bloße Entdeckung ist kein Betreten. Alle tatsächlichen Dungeonankünfte bleiben auf Gate/Floor 1. Read-only-Gegenprobe vor dem Guardian: GO zum bekannten Floor-2-Weg wird mit `sealed` abgelehnt, ohne Bewegung. Nach dem Warden fällt die Sperre. Damit ist der gewünschte Schutz hier vorhanden. Der natürliche Lauf versucht den gesperrten Abstieg allerdings nicht selbst; kein vollständiger natürlicher Floor-2-Abnahmelauf.

I52/I60 beschreiben den Stein trotz erloschener Siegel weiter als verschlossen, I66 nennt die untere Ebene weiterhin „sealed“. Das kann dem Spieler einen weiterhin blockierten Zugang suggerieren, obwohl die Engine ihn freigibt. Hier eher **Erzähl-/Anzeigeverständlichkeit** als neuer Beleg einer mechanisch falschen Etage. Eine Treppe innerhalb einer Etage (etwa zum Wardenraum) ist nicht automatisch ein Floorwechsel.

**.158-Raumsuchfix positiv:** I59 „extra loot in the room“ wird als echte Raumsuche mit PER 10 gegen 6 ausgeführt; Wurf 68 scheitert. Die Leiche im Raum löst keine pauschale Lootsperre mehr aus. Auch I35/I45 sind echte Suchchecks; der erfolgreiche I45 führt zur konkreten Wardenkarte.

**P2 – gemischte Suche bleibt fehlerhaft (I91):** „corpse, pool and lair“ wird vom Planner als ein Searchvorhaben korrekt vollständig benannt. `commands.remainsSearch()` stuft es wegen `corpse` insgesamt als Leichenplündern ein. Ergebnis: `looted already`, kein PER-Check, kein Suchzeitbudget genutzt. I92 erzählt trotzdem neue Spuren/Lagerdetails. Gegenproben mit demselben Originalzustand: Nur Pool/Lair führt den Suchcheck aus; nur Corpse bleibt korrekt gesperrt. **Ursache ist die Reichweite der Shortcut-Entscheidung bei gemischtem Vorhaben**, nicht fehlender Loot und nicht ein allgemein kaputter .158-Raumfix. Bei einer Korrektur Auto-Loot/Wiederholungsschutz behalten und Umgebungssuche erhalten; keine anwachsende Wortliste für jedes Terrain.

**Knochen I35–I38:** Der erste PER-Check scheitert (53,85 %, Wurf 82). Daraus folgt nur „nichts Neues erkannt“, nicht „ein geheimer Bonus existierte und wäre bei Erfolg garantiert gewesen“. Das Objekt ist als gewöhnliches `item`/`tool` ohne hinterlegten Effekt angelegt; I37 wird als Basic-Attack-Worldanwendung zum Zermahlen verarbeitet. Es gibt weder neuen Skill noch Passive, Heilung, Ressourcenbonus oder magische Eigenschaft. Freie Prosa allein darf solche Wirkungen nicht schaffen. Was ein anderer erfolgreicher Suchwurf erzählt hätte, lässt sich aus diesem Original nicht beweisen.

**Zusätzliche konkrete Kontinuitätslücke:** Obwohl I38 das Zermahlen und Essen erzählt, bleibt `obj.t34.small_pale_thing_on_the_altar` unverändert auf dem Boden; auch das HUD zeigt es weiter an. Der Extractor liefert hier nur fünf Minuten Zeit, keinen Objektübergang. Das ist eine belegte fehlende physische Objektfortschreibung, keine nachgewiesen funktionslose versprochene Magiemechanik. Vor einer Korrektur das vorhandene TAKE/USE-/Worldobjektmodell gezielt prüfen; nicht daraus eine umfassende freie Alchemie ableiten.

**Rast:** Zwei volle 180-Minuten-Rasten im Dungeon werden ohne Unterbrechung gebucht, HP **17→51→85**, MP **68→158**, später **142→200**. Die zweite Rast füllt MP, aber nicht HP vollständig; erst die bezahlte Nacht heilt ganz. „Keine Folgen“ beschreibt daher fehlenden äußeren Druck, nicht fehlende Kosten oder eine kostenlose Vollheilung. PULSE fehlt weiterhin. Nach Kanon sind **Rastunterbrechungen W7 separat** und kein automatischer Teil des ersten nachrichtenbasierten PULSE-Fensters. Den Nutzerwunsch erhalten, diese Abhängigkeit aber korrekt darstellen.

## 6. NPC E0/E1: Diagnose und Auslieferung funktionieren, inhaltliche Kette hat Lücken

**Positiv:** Alle 36 tatsächlichen Enginekontexte und E0-Diagnosen stimmen exakt mit dem rekonstruierbaren Export überein. Kompakte NPC-Karten werden in diesem Lauf **nie wegen Budget verworfen**. Registrierung, bekannter Name und angenommene Catacombs-Quest stehen bei der Clerk-Karte I66 tatsächlich im Request. Keine neue Mera-/Brenna-Identität behaupten: Dieser Run hat keinen benannten Clerk, sondern bereits ab I6 die Sammelentität **`npc.npcguild_clerks` für zwei Angestellte**.

**P2 – persönliche Abgabe fehlt trotz .158-Nachtrag:** I64 wird autorisiert erreicht, die Clearance korrekt ausgezahlt, der Clerk liest READY-Siegel und verbucht die Abgabe. Der `completed_contract`-Fakt entsteht bei der bedingten Abgabe direkt nach Ankunft, **vor** dem nachfolgenden `enter` des Clerks. Die .158-Nachbezeugung prüft dann `guildParticipationEvidence()`. Hier scheitert sie am belegten Originalsatzbau („she … counted“, „she … took …“) statt eines vom engen Matcher geforderten direkten Labels wie „clerk counted“. Ein positiver Kontrollsatz mit derselben Clerk-Identität/90-cp-Abgabe erzeugt das fehlende `knowledge.gained` bei unverändertem Report. Die Folgekarte I66 liefert deshalb Annahme/Novice, aber kein strukturiert bezeugtes Completionwissen. Ein `verified`-Fakt und die jüngste Prosa erhalten Teile der Szene; **nicht** behaupten, die gesamte Episode sei gelöscht.

**P2 – erneute Rückkehr I72/Arbeit am Schalter:** Die Erzählung stellt beide bekannten Clerks und den bekannten Crossbowman tatsächlich wieder anwesend dar. Der originale Extractorreport enthält für sie kein `enter`, sondern nur für die neu relevante wiry woman. Im Endzustand fehlen die Clerks deshalb an dieser Szene. I74s kompakte Karte gilt folgerichtig dieser Frau; der erzählte auftragsbearbeitende Clerk erhält kein persönliches Annahmewissen. Das ist eine andere Ursache als Budgetverdrängung. Keine automatische Anwesenheit allein aus dem gespeicherten Arbeitsort erzwingen; die **tatsächlich erzählte** Anwesenheit gezielt zuverlässig verarbeiten und die zwei Clerks bei relevantem individuellem Umgang sauber unterscheiden.

Die Karte des bisherigen Innkeepers bei I72 ist zudem aus dem Zustand **vor** dem autorisierten GO aufgebaut; die Ziel-Clerks stehen im `KNOWN AT`-Hinweis. Das allein ist kein falscher Travel-/Presenceevent. Es zeigt aber, warum E1-Sofortkarten kein vollständiger Nachweis von Wiederbegegnungskontinuität sind. Die Rollen-/Sammelidentität und ausgelassene Ankunftsbeobachtungen dürfen nicht durch bloß höheres Kontextbudget kaschiert werden.

**Budget:** In **21/36** finalen Kontexten überschreiten verpflichtende Abschnitte das 1400er Budget; `budgetedTokens` reicht bis **1944** (Overflow 544). `relevant` fehlt in 30, `present` in 21, `features` in drei und der allgemeine `dungeon`-Abschnitt in drei Kontexten. Der lokale Dungeonabschnitt bleibt im Dungeon geschützt; die Dungeon-Drops liegen I14, I74 und I76. Das ist transparent gemessener Pflichtblocküberlauf, keine harte Modellkontextabschneidung. E0-Tokens sind Engine-Schätzwerte, keine Summe aller ST-/Lore-/Historytokens. Wiederholte Gilden-/Quest-/Hilfs-/Markttexte bieten einen konkreten Verdichtungskandidaten; nicht alle NPC-Volltexte unbeschränkt priorisieren.

## 7. Sämtliche spontanen Feedbackpunkte zugeordnet

| Nr. / Spielerwahrnehmung | Bewertung / Folge |
|---|---|
| 1. Questlisten doppelt, Narrator hier kaum nötig | Bestätigt, besonders I72; Q2/Q5, kompakter Atmosphärentext/kanonische Karten statt Wiederholung prüfen |
| 2. Häufig First Strike trotz anlaufender Gegner; eigene Unsicherheit zur Balance | Voll aufgenommen, kein fallengelassener Altpunkt. §4 trennt Bedrohung, tatsächlichen Kampfstart, eigene Runde-1-Aktion, echte Ambush-Eröffnung und schnelle Gegner |
| 3. Passive-Grund zunächst unsichtbar, nach `#passives` ausreichend | I26 zeigt den korrekten Grund und das Beispiel 17/90 HP; die vom Nutzer selbst relativierte Anregung nicht als neuen Pflicht-UI-Fix führen |
| 4. Dungeonrast ohne Konsequenzen | Natürlicher Befund bestätigt, Erholung nur teilweise; PULSE und separate Rastunterbrechungen unterscheiden |
| 5. Knochen ohne Reaktion: inhaltsleer oder freie Mechanik fehlt? | Keine belegte besondere Wirkung; fehlgeschlagene Wahrnehmung beweist keine verborgene Belohnung. Zusätzlich realer ungebuchter Verbrauch, §5 |
| 6. Ebene 2 erst nach Floorboss | In dieser Struktur bereits mechanisch geschützt; read-only vor/nach Guardian bestätigt. Natürlich kein Abstieg versucht, Prosa zum offenen Siegel teils widersprüchlich |
| 7. Basis 5, stärkerer Boss, Lootboxen/Bosstaten für Klassen | Warden L7-Elite konkret beantwortet. Balance-/Belohnungswunsch erhalten, aktuelle Basis 7 und gefährlichen Start berücksichtigen; keine automatische Kanonänderung |
| 8. Quests jetzt deutlich besser | Positives Ergebnis ausdrücklich erhalten: sinnvolle F-Spannen und Einzeltitan; erfolgreiche Annahmen/Clearance/Abgabe |
| 9. Monster nach einigen Leveln schwach, Titan langsam | Durch konkrete Werte und L12-Profilvergleich bestätigt/eingeordnet. Gezielte Progressions-/Fernkampfbetrachtung sinnvoll |
| 10. Nach Treffer „did not find him yet“, Engine aware | I82 tatsächlich widersprüchlich. Engine bleibt korrekt aware; Extractor-`unaware` wird abgewiesen. Optional enger Erzählerhinweis aus dem Kampfzustand, kein Awarenessumbau |
| 11. Wenig freie Weltmomente, Magie, Wunder, Banditen; PULSE höhere Priorität, zu leicht | Eigenständiges wichtiges Spielerlebnissignal, durch fehlende äußere Unterbrechungen plausibel. Atmosphärische Menschen und Vess-Hinweis existieren, ersetzen aber keine spielbaren freien Ereignisse. PULSE-Auswahl vor weiteren kosmetischen Memoryausbauten erwägen; Frequenz nicht aus einem Run festlegen |

## 8. ST-Log, Kosten und Grenzen der Statistik

Vollständiger Originalserverlog nun komprimiert und bytegenau archiviert; keine vollständigen Prompts in der Review dupliziert. **124 Request-/Responsepaare**, alle ohne Parserfehler, alle Antworten mit `finish_reason: stop`. Rollen: 36 Command-Planner, 5 Combat-/Intent-Planner, **38 Narrator**, **41 Extractor**, **3 Board**, 1 Passive-Namensgebung. Der Log enthält **zwei Narratorvarianten, die nicht im finalen Chat stehen** (Requests 51/67, andere Knochen-/Rastformulierungen). Deren Ursachen als Edit/Regenerate nicht ohne weiteren Nachweis behaupten; nicht als zwei zusätzliche finale Spielzüge oder technische Abbrüche zählen. Der Log enthält auch deren Extraktionen/Repair; daher nicht 41 durch 36 als finale Repairquote ausgeben.

Summierte Provider-Usage des **gesamten** Logs: **1.520.007 Prompttokens + 35.968 Completiontokens**, davon **825.898 gemeldete Cachetokens**, gemeldete Kosten **0,14687729 USD**. Das sind protokollierte Providerwerte einschließlich der nicht behaltenen Varianten, keine unabhängig abgerechneten Kontokosten. Narrator insgesamt 0,05499 USD, Extractor 0,04846 USD. Die zwei finalen Boardlesungen I12/I72 erzeugen zusammen 1304 Completiontokens laut Provider; deren rein redundantem Anteil wird kein erfundener exakter Sparbetrag zugeordnet. Keine neue Tokenmessungsarchitektur nötig, um den sichtbaren Dopplungsbedarf anzuerkennen.

Keine Treffer auf die gezielt gesuchten Logmarker für Fetch-/Chatpersistenzfehler, ENOENT, Abbruch wegen Längenlimit oder unhandled errors. Das ist kein allumfassender Infrastrukturbeweis. Vor Archivierung gezielter Schlüssel-/Bearer-/Private-Key-Musterscan ohne Treffer; Originalbytes nicht umgeschrieben.

## 9. Empfohlene nächste Entscheidung

1. **Engen Kontinuitätsschnitt bündeln:** I91 gemischte Umgebungssuche; I64 tatsächlicher Gildenzeuge; I72 tatsächlich erzählte Wiederanwesenheit und persönliche Clerk-Zuordnung; persistierter unzulässiger „Quest vergeben“-Remark. Knochenfortschreibung und Clearance-Angebot vor Reset gezielt im vorhandenen Modell prüfen. Keine blanket `no_go`-/Knowledge-/Lootfreigaben.
2. **Balance gezielt entscheiden:** bewusste Rolle von First Strike und unmittelbarem NPC-Commitment; Start 7/5; Machtkurve nach frühen Levelups; F-Guardian/MDEF und Fernkampf gegen Nahkampf. Nicht gleichzeitig alles erhöhen/abschwächen oder Rank-/Profileigenarten beseitigen. Für Gegenfälle gleiche Szenen, schnelleres Profil und gefährlichen L1-Gruppenstart verwenden.
3. **PULSE als nächstes Weltpaket konkret auswählen:** Auslöserprinzip ist bereits beschlossen; Spielerwunsch nach lebendiger Welt klar belegt. E2-Vollausbau ist keine zwingende Vorbedingung. Rastgefahr gesondert freigeben; freie Ereignisse dürfen auch friedlich sein.
4. **Natürlicher Anschluss möglich:** Titanquest abgeben, gegebenenfalls Vess aufsuchen, bekannte Personen wiedersehen; damit weitere echte NPC-Daten sammeln. Der aktuelle Export ist keine Abnahme persönlicher Langzeitbeziehungen oder des tatsächlichen Floor-2-Spiels. Keine neue große Batchserie als Voraussetzung.

## 10. Geprüfte Produktpfade

Die Aussagen beziehen sich auf den festen [Produktcommit `2089dcc`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/2089dccdb7fd3dc08c72c5737c6b111fb6512f56/avereth-engine): `src/host.js` (`foldChat`, `turnBlock`), `src/validate.js`, `src/v4/turn.js`, `src/combat.js` (`initEncounter`, `runCombat`), `src/npcgen.js` (`scaleCreature`), `src/v4/commands.js` (`activity`, `remainsSearch`, GO/Sperren), `src/v4/guild.js` (Board, `defeatTally`, `contractReady`, `acceptContract`), `src/v4/living.js` (`sealRefusal`, `clearDone`), `src/v4/world.js` (Ankunft, bedingte Abgabe, `enter`, Gildenzeuge, Faktpfad), `src/v4/narration_evidence.js` (`guildParticipationEvidence`), `src/context.js`, `src/derived.js` und `content/monsters.json`/`campaign_start.json`. Kanon/Roadmap nur in den relevanten Abschnitten herangezogen; keine neue Gesamtarchitekturprüfung.

**Keine Implementierung in diesem Auftrag.** Produkt-HEAD bleibt .159. Dieser Review dokumentiert Befunde und mögliche Prioritäten; der Nutzer entscheidet Patchumfang und Designänderungen.

---

## 11. Unabhängiger GPT-Gegenreview: Originalspiel und Spielerfeedback (07.11.2026)

**Status:** Ergänzende fachliche Gegenbewertung, **keine Produktimplementierung und kein zweiter Sol-Testbericht**. Die vorstehenden §§1–10 bleiben als Sols originale Analyse unverändert. Die folgenden Prioritäten sind eine unabhängige Empfehlung; Produktstand ist weiterhin .159.

### 11.1 Eigene Quellenprüfung und ihre Grenze

Ich habe die **archivierten, verlustfrei komprimierten Originale** `originals/chat.jsonl.gz` und `originals/events.json.gz` eigenständig dekomprimiert, den Original-Spielverlauf und relevante Eventgruppen einzeln betrachtet, dazu `originals/user_feedback.txt` vollständig gelesen und die betroffenen .159-Produktpfade (u. a. `content/campaign_start.json`, `content/rules.json`, `src/derived.js`, `src/combat.js`, `src/v4/commands.js`) im festen Produktcommit überprüft. Als zusätzlicher Abgleich dienten Sols `PROBE_RESULTS.json` und dessen dokumentierte ST-Requestzuordnungen.

**Nachweisgrenze:** Das 14,6-MB-ST-Serverlog wurde für diesen GPT-Nachtrag **nicht nochmals unabhängig vollständig ausgewertet**, die darin enthaltenen 124 Requests und 36 Narrator-Kontexte stammen insoweit aus Sols reproduzierter Messung. Ebenso habe ich keine Node-Suite, keine neuen Originalfold-/Replay-Skripte und keine natürlichen Modellaufrufe selbst durchgeführt. Die 93 Chatnachrichten, 78 Eventgruppen und die nachstehenden Einzelfakten sind unmittelbar an den beiden Originalarchiven nachgeprüft; daraus folgt keine eigenständige Neuzertifizierung aller von Sol ausgeführten 93/93- bzw. 36/36-Gegenproben.

### 11.2 Hauptbefund – die Schere zwischen lebensgefährlichem Einstieg und späterer Dominanz

Der konkrete Spielverlauf erklärt den Spielerwunsch besser als ein pauschales Urteil „alle Monster zu schwach“:

- **I18–I23:** Schon die ersten drei Skeletons sind L5/L4/L3 gegen den L1-Mage. Alaric sinkt von **90 auf 17 HP**. Für die drei besiegten Gegner erhält er **720 XP** und steigt unmittelbar **L1→L4**. Der gefährliche Einstieg ist real, aber der Progressionssprung ist ebenso real.
- **I43:** Der L4-Gravekeeper fällt gegen einen L4-Mage mit einem Flame Lance.
- **I49–I51:** Der Floor-1-Guardian ist **L7 Elite**, 116 HP, **MDEF 1**. Zwei Lances mit **65+66 Schaden** reichen; der Gegner trifft nicht. Er ist ein Guardian von Floor 1, nicht der E-Rang-Endboss der tieferen Ebene.
- **I81–I85:** Ein normaler L12-Armored-Beast-Titan hat 224 HP, MDEF 5 und Initiative **8**. Ein zuvor echt bestandener Stealthcheck ermöglicht **127 Ambush-Schaden**, danach folgen 77 durch Flame Lance und 39 durch Basic Attack. Der Titan erreicht den Mage nicht. Ein schnelleres Monsterprofil desselben Levels kann erheblich früher handeln; das Problem ist die Kombination aus Reichweite, Initiativdifferenz, Magieschaden und niedriger MDEF, nicht ein falscher Titan-Datensatz.
- Der Guardian gibt weitere **630 XP** und **L4→L6**, der Titan **1250 XP** und **L6→L8**. Zusammen mit 5 freien Punkten und 1 Favored-Punkt je Level ist **die frühe XP-/Attributkurve** ein mindestens ebenso wichtiger Balancehebel wie die Monsterwerte.

**Gegenbewertung:** Der Nutzer hat einen erkennbaren Anspruch an verdiente Stärke: Der Anfang darf gefährlich sein, aber ein besonderer Dungeon-Guardian und ein Level-12-Titan sollten nicht überwiegend aus sicherer Distanz abgeräumt werden. Dieses Ziel ernst nehmen. Weder globale Monster-Buffs noch ein pauschales Zurücknehmen von Fernkampfreichweite sind dafür ausreichend belegt. Die tatsächlichen Begegnungen mit Warrior/Rogue und schnelleren Profilen als Gegenprobe heranziehen.

### 11.3 Alle elf spontanen Feedbackpunkte – eigene Bewertung und konkrete Konsequenz

| Nr. | Spielerfeedback / Originalbeleg | GPT-Gegenbewertung und Handlungsentscheidung |
|---|---|---|
| **1** | **Doppelte Questlisten**, besonders I72: Der Narrator wiederholt weitgehend die bereits eingeblendeten mechanischen Boardangaben. | **Bestätigtes QoL-Problem; kurze Änderung früh einplanen.** Wenn die Engine die kanonischen Karten bereits ausgibt, soll der Narrator **Stimmung, NPC-Reaktion und Umfeld** erzählen und nicht den vollständigen Katalog erneut abtippen. Darstellung ohne verlorene Spielerauswahl testen. Dies spart zumindest die sichtbare redundante Ausgabe; genaue Tokenersparnis nicht erfinden. |
| **2** | **First Strike** trotz erkennbar herankommender Gegner (I18/I19; auch I43/I49). | **Wichtige Designfrage, nicht bloß Nebenbemerkung.** Code `src/combat.js`: Ein offener Erstangriff darf zuerst abgewickelt werden, **verbraucht aber die eigene Runde-1-Aktion**; es ist keine kostenlose Extra-Runde. Gegner mit höherer Initiative können dadurch vor der zweiten PC-Aktion zweimal zum Zug kommen. Das eigentliche Reibungsfeld ist, dass erzählte aggressive Annäherung (I18) vom Extractor noch nicht als **unmittelbar begonnener NPC-Angriff** bestätigt wird. Eine erkennbare Angriffshandlung muss verlässlich in den Kampfstart gelangen; bloßes Näherkommen darf aber nicht willkürlich als Treffer oder Engagement gelten. Erst danach über Änderung der First-Strike-Regel entscheiden. |
| **3** | Passive-Angebot anfangs ohne sichtbare Begründung, bei `#passives` dann erklärt (I26). | **Keine Pflichtänderung:** Die Systemabfrage nennt konkret den L5-Gegner, den Sieg und 18 % Rest-HP. Der Nutzer relativiert den eigenen Wunsch ausdrücklich. Eine doppelte Begründung in jeder UI wäre eher neuer Ballast. |
| **4** | Zwei dreistündige **Dungeonrasten ohne äußere Folgen** (I31/I47). | **Spielgefühl bestätigt.** Die Erholung ist nicht kostenlos (Zeit verstreicht, HP regenerieren nicht sofort vollständig), aber es entsteht praktisch kein Weltdruck. Das beschlossene PULSE-Fenster für **Stadt/Reise/Wildnis** löst Dungeonrast **nicht automatisch**; hierfür ist **W7 Rastunterbrechungen** gesondert zu entwerfen. Das Feedback muss ausdrücklich für W7 erhalten bleiben. |
| **5** | Der Knochen am Altar wird zermahlen und gegessen (I37/I38), ohne Effekt. | **Zwei Fragen trennen.** (a) Kein versteckter magischer Bonus ist aus dem gescheiterten PER-Check oder dem bloßen Gegenstand ableitbar; fehlende freie Alchemie ist kein belegter Defekt. (b) **Echter Kontinuitätsfehler:** Der Text verbraucht den Knochen, aber `obj.t34.small_pale_thing_on_the_altar` bleibt als Bodenobjekt erhalten. Das bestehende Worldobjekt-/TAKE-/USE-Modell gezielt korrigieren; einen Effekt nicht nachträglich erfinden. |
| **6** | **Floor 2 erst nach Guardian**. | Die vorhandene mechanische Sperre arbeitet: Entdeckung ist kein Eintritt, vor dem Sieg ist der Weg verschlossen; danach wird er freigegeben. Aber die spätere Prosa in I52/I60/I66 vermittelt teils weiterhin „sealed“. **Kleine narrative Zustandsklarstellung** sinnvoll, keine zweite Dungeon-Sperrmechanik. |
| **7** | **Basiswerte wieder 5, stärkere Floor-Guardians, Solo-Bosstaten und bessere Loot-/Bossbelohnungen.** | **Nicht auf „später vielleicht“ vertagen:** Der Wunsch nach Basis **5** ist eine klare, gut abgrenzbare Änderung für neue Kampagnen; siehe §11.4. Warden ist **L7 Elite**, nicht Level 4; ein Minimum L10 ist als gewünschte neue Designregel denkbar, aber löst die niedrige MDEF/Distanzdominanz nicht automatisch. Solo-Guardian-/Boss-Taten nach Levelabstand sind ein sinnvoller **Tatenbuch-/Klassenentwicklungs-Kandidat**; kein sofortiger Powerbuff. Auch die Belohnungsqualität ist ein eigenes Thema: Warden-Autoloot ist **ein F-Rang-Bone mit Wert 1 cp**, Titan-Autoloot sind **zwei Scale Plates mit 4 cp je Stück**; die offiziellen Questzahlungen sind hiervon zu unterscheiden (90 cp bereits ausgezahlt; Titan 550 cp noch offen). Das macht den Wunsch nach erinnerungswürdiger Bossbeute nachvollziehbar. |
| **8** | **Quests sind viel besser**, einschließlich einzelner höherleveliger F-Gegner. | **Wichtiger positiver Beleg:** .159 repariert den Intro-Anker im natürlichen Modelllauf; das Board bietet mehrere F-Stufen, Clearance und Titanjagd. Dieses funktionierende Profil **nicht** bei einer Balancekorrektur wieder auf eintönige L1-Culls zurückdrehen. |
| **9** | **Monster wirken nach wenigen Leveln zu schwach; Titan zu langsam**. | **Bestätigter relativer Befund:** Ein Armored Beast L12 hat Initiative 8, während schnelle Profile desselben Levels (Wolf 19, Feline 20) regulär vor dem getesteten Mage (18) handeln könnten. Eine harte Standardisierung aller Monster würde die Profilidentität zerstören. Vergleich mit schnellen Gegnern, resistenteren Gegnern, mehreren Aktionspartnern und gleichen Spielerwerten testen, nicht einfach jeden Titan beschleunigen. |
| **10** | Nach dem Titan-Treffer suggeriert I82, der Titan habe Alaric **noch nicht gefunden**; die Engine setzt korrekt `aware`. | **Klarer Erzählerwiderspruch, kein Awareness-Buchungsfehler.** Der Extraktorversuch `unaware` wurde verweigert. Eine sehr kleine Erzähler-Klarstellung aus dem aktiven Kampfzustand ist plausibel, ohne Awareness-/Stealthmechanik umzubauen. |
| **11** | **Zu wenige unabhängige Ereignisse, Begegnungen, Banditenverstecke, Wunder und Magie**; PULSE soll höher priorisiert werden. | **Höchste Erlebnispriorität neben Balance.** Das originale Spiel geht faktisch von Quest zu Quest; Straßenbilder und Dialoge sind lebendig geschrieben, aber sie erzeugen kaum eigene spielbare Situationen. PULSE deshalb **vor großem E2/E3-Vollausbau** konkretisieren: Stadt + Reise/Wildnis, höchstens ein gemeinsames Fenster pro geeignetem regulären Spielerzug, auch friedliche oder folgenlose Situationen, Ursache/Ort/Tag plausibel, keine Questabhängigkeit. Keine willkürlichen Hinterhalte in jedem Zug und kein verpflichtendes Ereignis pro Zeitstunde. |

### 11.4 Startwerte 5 statt 7 – eine kleine Umsetzung mit realer Balancewirkung

Der Originalstartbildschirm **I0 zeigt bereits alle sechs Basiswerte mit 5** an. Der reale `campaign.started`-Event I0 startet jedoch mit **7 in STR/VIT/AGI/INT/PER/WIL**; auch `content/campaign_start.json` legt 7 fest. In `content/rules.json` ist die allgemeine menschliche Baseline bereits 5, aber die konkrete PC-Startvorlage ist ein eigener Wert. Der verbindliche Kanon in `02_DESIGN_KANON.md` nennt derzeit 7: dieser Text ist **nach tatsächlicher Implementierung** anzupassen, nicht vorher stillschweigend als schon geändert zu deklarieren.

**Fachliche Empfehlung: dem expliziten Spielerwunsch folgen und für neue Kampagnen alle sechs PC-Startwerte auf 5 setzen.** Kein allgemeiner Eingriff in Statformeln und kein rückwirkendes Umschreiben vorhandener Spielstände. Das ist ein kleiner isolierbarer Content-/Regressionstest-Schritt und muss nicht auf den gesamten Balance-/PULSE-Ausbau warten.

Die echte Wirkung ist allerdings mehr als Kosmetik: Bei L1 Mage nach Favored +1 auf INT/WIL sind es dann **STR/VIT/AGI/PER 5, INT/WIL 6** (aktuell 7 bzw. 8). Nach den bestehenden `deriveCharacter`-Formeln folgen **80 statt 90 HP**, **72 statt 96 MP**, **Initiative 7 statt 10**. Die magische Skalierung fällt ebenfalls niedriger aus. Der erste Dreier-Skelettkampf endete schon mit 17/90 HP; mit schwächerem Start und identischem Spielverhalten kann er tödlich werden. **Kein Grund, den Benutzerwunsch zu ignorieren**, sondern ein konkreter Grund, genau diesen Fall **und andere Starterklassen** als Regression zu prüfen. Nicht zugleich pauschal Guardian-/Monsterwerte, XP und First Strike ändern; sonst ist die Ursache späterer Balanceänderungen untrennbar.

Der dazu passende Mini-Schnitt: `campaign_start.json` plus Tests für neue Charaktererstellung, Ableitung, Save/Reload und alte unveränderte Campaign-Events; falls nötig Startertext konsistent halten. **Dieser GPT-Review implementiert den Schnitt noch nicht.**

### 11.5 Zusätzliche Integritätsprobleme direkt aus den Originalen

- **I91/92 – gemischte Suche:** Die Spielereingabe fragt nach „corpse, pool and lair“. Der Planner erzeugt korrekt **einen Suchbefehl mit allen drei Bereichen**; `remainsSearch()` prüft jedoch nur das Vorkommen von „corpse“ und blockiert **die gesamte Suche** als `looted already`. Keine Zeit, kein PER-Wurf. I92 beschreibt trotzdem neue Spuren und Ortsdetails. **Nicht** Auto-Loot wieder öffnen; gemischte Suchziele müssen ihren unabhängigen Umgebungsanteil behalten. Diese tatsächliche Spielerhandlung ist funktional wichtiger als zusätzliche kosmetische NPC-Karten.
- **I64 – persönlicher Gildenzeuge:** Die Abgabe ist korrekt gebucht und ausgezahlt. Die Clerks gehören aber zur **Sammelidentität für zwei Personen**, und der persönliche Wissensnachtrag scheitert an der tatsächlichen pronomenbasierten Szene. Das ist eine **Erfassungs-/Identitätskette**, nicht fehlende Enginekontext-Auslieferung.
- **I72/74 – Wiederanwesenheit und Wissen:** Beide Clerks und der Crossbowman erscheinen ausdrücklich im Text, aber die Rückkehrer fehlen im Extractor-`enter`; die neuen Karten bilden die tatsächlich dort arbeitenden Personen nicht vollständig ab. Das muss anhand der erzählten Präsenz und eindeutiger Einzelidentitäten verbessert werden, **ohne** NPCs allein aus dem bekannten Arbeitsort automatisch herbeizuteleportieren.
- **I72 – „Vess hat den Vertrag genommen“:** Eine Äußerung des Crossbowman wird als `remark` gespeichert, obwohl der betreffende offizielle Vertrag im selben Engineboard noch verfügbar ist. **Wichtig für eine lebendige Welt:** NPCs dürfen sich irren, spekulieren oder lügen. Die Engine darf ihre Aussage aber nicht als wahrheitsgleiche Änderung des offiziellen Boardzustands lesen. Sprechergebundene Behauptung/Bewertung von autoritativer Questverfügbarkeit trennen; nicht pauschal NPC-Gerüchte verbieten.
- **I72 – wieder angebotener bereits geleerter Floor 1:** Das zweite Tagesboard listet dieselbe Clearance vor Ablauf des dreitägigen Dungeonresets. Sols **Read-only-Gegenprobe** belegt, dass eine erst jetzt angenommene Clearance nicht aus einem früheren Clear als erledigt abgebbar wäre. Kein nachgewiesener Auszahlungs-Exploit, aber ein für den Spieler **derzeit nicht sinnvoll erfüllbares Angebot**. Vor dem Anbieten Reset-/Verfügbarkeitseignung prüfen, ohne generische „es darf nur neue Quests geben“-Sperre.
- **E0/E1:** Die von Sol reproduzierten 36/36 Narratorblöcke belegen tatsächliche Kontextauslieferung. Kein kompaktes NPC-Profil ging budgetbedingt verloren. Der dokumentierte Pflichtblock-Overflow in 21/36 Kontexten (bis 1944/1400) und ausgelassene optionale Abschnitte bleiben dennoch ein Kosten-/Priorisierungsproblem. Mehr NPC-Text allein repariert weder falsche Sammelidentitäten noch fehlende Witness-/Enter-Events.

### 11.6 Empfohlene fachliche Reihenfolge – die Spielererfahrung wieder stärker gewichten

**A – Kleine, klar umrissene Änderungen früh bündeln, nicht hinter einem Großaudit verstecken:**

1. **Startwerte 5** für neue Kampagnen mit Starter-/Kampf-Regressionen und anschließender Kanonkorrektur; dieser Wunsch ist inhaltlich bereits klar.
2. **Keine gedoppelten Questlisten** bei vorhandener offizieller Engine-Boardkarte; Narrator behält Stimmung und selbstständige NPC-Reaktionen.
3. **Kleine Erzählhinweise für bekannte Enginezustände** (etwa tatsächliche Awareness nach getroffenem Titan und freigegebenes Guardian-Siegel), nur soweit gezielt belegbar.

**B – Enger technisch zusammenhängender Kontinuitätsfix:** I91 gemischte Suche; I37/38 sichtbarer Objektverbrauch; I64 persönliche Abgabe/Wissensbezeugung; I72 Wiederanwesenheit/individuelle Clerks und echte statt behauptete Questvergabe; zweite Floor-1-Clearance vor Reset. In der Umsetzung fallbezogene rote Gegenproben und Nebenwirkungsschutz statt vollständigem Systemeumbau. Einzelpunkte können nach Ursache zusammengefasst werden, aber der Patch muss nicht jedes Thema der Roadmap lösen.

**C – Spielerlebnis als nächstes eigenständiges Designpaket:** PULSE **vor umfassendem NPC E2/E3**, plus eine begrenzte Balancevergleichsmatrix (L1-Skelette, L7-Guardian, L12-Titan, je ein schneller Gegner und andere Starterklasse). First Strike mit explizitem NPC-Angriffscommitment beurteilen. Floor-Guardian-Schwelle, XP-/Statkurve und Fernmagie gezielt abstimmen. **W7 Dungeonrast** separat; Bossbeute und abgestufte Solotaten im Tatenbuch später als eigenständige Belohnungs-/Entwicklungsentscheidungen konkretisieren.

**Gesamturteil:** User04 ist ein erfolgreicher **technischer Fortschrittslauf**, aber gerade die nun stabilere Engine zeigt deutlichere **Spielgefühlprobleme**. Das Feedback zu Startwerten, wiederholter Questdarstellung, Stärkeentwicklung und eigenständiger Welt sollte nicht hinter NPC-E0/E1-Metriken verschwinden. **Keine Produktänderung durch diesen Review; seine Umsetzungsvorschläge sind fachliche Entscheidungen für den nächsten Auftrag.**
