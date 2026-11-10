# GPT-Kontrollreview – Claudes Gegenreview und Fachplan zu NPC/PULSE-Pilot 01

**10.11.2026 · nur Review, keine Produktfreigabe.** Ausgangsquellen: [Originalreview](REVIEW.md), [unabhängiger Claude-Gegenreview](GEGENREVIEW_CLAUDE.md), [Fachplan K1–K8](FACHPLAN_PILOT01_KORREKTUREN.md), [Design-Kanon](../../02_DESIGN_KANON.md). Geprüfte Produktbasis: [`2a8b54e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2a8b54e45a48ef525b69d62edb826fd3a2b77cbc), Engine `.174`; `main` beim Einstieg `6f906b4`.

**Prüfgrenze:** Ich habe Gegenreview und Fachplan vollständig gelesen und die maßgeblichen aktuellen Codeabschnitte (`pulse.js`, `world.js`/Envelope und `person.new`, `context.js`, `threads.js`, `trade.js`, `narration_evidence.js`) mit den behaupteten Ursachen abgeglichen. Die Originaldaten und Sols 63-Zug-Kontextdiagnose wurden in diesem Durchgang **nicht erneut vollständig gefaltet oder nachgemessen**; deren Laufzahlen sind von Claude unabhängig erhobene und auf `main` abgelegte Belege, keine neu von GPT ausgeführte 63/63-Probe. Keine Node-/ST-/Modelltests und keine Produktänderung.

## 1. Ergebnis

**Der Gegenreview verbessert die Fehlerdiagnose wesentlich. Der technische Fachplan ist als Grundlage tragfähig, aber nicht unverändert zur Implementierung freizugeben.** Drei Punkte bedürfen enger Ergänzung: (A) beim K3-Kontextfilter muss der **erste** Ausrüstungshändler-/Angebotsdialog funktionieren, (B) K5b schützt bisher nur den gespeicherten Ursprungstext, nicht gegen falsche ID-Bindung/Parteien/Erledigung, und (C) K2 braucht Nachweise für Mengen und unterschiedliche Ausrüstung gleichen Namens. Dafür ist kein neuer Gesamtaudit und keine neue Architektur erforderlich.

### 1.1 Befunde, die ich übernehme

- **K1/B1 Dungeoneintritt, P2 hoch:** `pulseBegin()` setzt `governs:false` nur bei bereits im Dungeon befindlichem PC. Der aktuelle `world.js`-Zweig `pulse.governs && bornHere` kann deshalb erstmals in derselben Antwort gebuchte Dungeon-Slotgegner unberechtigt als PULSE-Angreifer ablehnen. Das ist ein plausibler und durch die Originalevents konkret belegter Widerspruch zwischen Dungeon-Autorisierung und Firewall. Die Ausnahme muss **ausschließlich** den dieser Antwort rechtmäßig zugeordneten Slotgegnern gelten, nie einem beliebigen neuen Monster im Dungeoneingang.
- **K2/B5 Objektduplikat, P2:** `bookPurchase()` erzeugt für jede gekaufte Goods-Zeile ein neues `object.created`. Ein bereits ausgestelltes Objekt wird dabei bisher nicht verknüpft. Das erklärt zusammen mit einem späteren zulässigen `take` die zwei Primer nach einmaliger Bezahlung. Meine frühere Zuschreibung des zweiten Schritts an den Extractor war falsch; Sol belegt den Planner-`take`.
- **K3/B2 Kontext, P2:** Der aktuelle `gear_market`-Schalter verwendet **`input + lastReply`** und eine breite Wortliste; er wird mit Priorität 0 gepackt. Der Mechanismus kann relevante NPC-Karten und Abrufabschnitte verdrängen. Sols Messung von 27/63 Überläufen und 60/63 gebildeten, nicht ausgelieferten `relevant`-Abschnitten ist ein gewichtiger Originalbefund, kein Anlass, das Budget anzuheben.
- **K4/B8 Evidenz, P2:** `narratedEvent()` verlangt eine zusammenhängende wörtliche Stelle in einem Satz. Mehrteilige Extractorevidenz kann trotz passendem Originalteil scheitern; eine enge Teilstückprüfung **mit denselben Negations-/Hörensagen-/Personenschutzprüfungen** ist vertretbar. Ein neues freies Fuzzy-Matching wäre dagegen falsch.
- **K5/B3–B4 Absprachen:** `threadEvents()` verwendet bei bekannter ID die ID, ersetzt bei offenem Status den Text und vereinigt die gemeldeten Parteien. Eine andere Schuld kann so einen alten Thread überschreiben; der Prompt `however it is worded now` ist hier zu unbestimmt. Die tatsächliche Zahlung einer ursprünglichen Schuld muss als mögliches Thread-`resolved` vom Extractor erkannt werden, nicht aus einem unbelegten Weltretcon erschlossen werden.
- **K6a/K7:** Der zeitlich früh gebildete falsche Ortskorrekturtext und die rein technische Geldablehnung ohne Börse/Fehlbetrag sind eng eingegrenzte Informationsprobleme. Der 10:1-Münzkanon darf nicht durch freie Wechselkurse ersetzt werden.
- **B10:** Erzählt bezahltes, mechanisch nicht gebuchtes Abendessen bleibt korrekt ein **getrennter Finanzfall**. Kein Nebeneffektfix beim Thread- oder PULSE-Patch.
- **E3/PULSE D:** Null gespeicherte E3-Anker und fehlende Dungeon-/Rast-/Wanderer-Abdeckung sind keine Widerlegung dieser Mechanismen. Kein PULSE-Parameterpatch aus einer Seed-Serie.

## 2. Notwendige fachliche Präzisierungen

### A – K3: Ausrüstungskontext auch beim ersten echten Händlerkontakt

Die geplante Bedingung „Handelswort in **Spielereingabe** und **anwesende Person mit offenem Angebot**“ greift **zu spät**, wenn ein Spieler erstmals bei einem Schmied nach einer Waffe oder einem Schild fragt. Gerade zur Erzeugung des ersten korrekten Angebots braucht der Narrator seine Ausrüstungs- und Profilregeln; es besteht dann noch kein `offer` in `state.offers`. Die behauptete unveränderte Abdeckung für „I want to buy a shield“ ist daher nicht ohne eigenes Vor-Angebot-Fixture belegt.

**Auflage an K3:** Ein gezielter, eindeutig als Händlergespräch erkannter **Erstangebotzug ohne vorhandenes Angebot** muss `gear_market` behalten. Zulässige erkennbare Grundlage sollte die vorhandene legitime Händler-/Interaktionsinformation des Zugs sein, nicht wieder jedes `armor`/`shield` aus der vorherigen Prosa. Regression: erster Einkauf beim Schmied **vor** einem Angebot; danach derselbe Weg **mit** Angebot; bloße Ausrüstungsnennung auf Reise darf keinen Katalog ziehen. Das tatsächliche Kontextbudget auf allen drei Wegen messen. Keine pauschale Prioritätserhöhung.

### B – K5b: Originaltext sperren reicht nicht gegen falsche Identität

Die geplante K5b-Variante speichert den alten Text und legt den neuen Text als `latest` ab. Gleichzeitig führt der aktuelle `threadEvents()`-Pfad weiterhin bei gleicher ID die neuen Parteien zusammen; auch eine unzutreffende `resolved`-Meldung würde denselben Thread erledigen. Beispiel Pilot: Der Kupfertext könnte richtig bleiben, während die fremde Hesse-Schuld als `latest` und Alarics falsche Parteibindung bestehen bleiben. **Das ist keine vollständige Sicherung gegen fremde ID-Updates**; als Vollfix des P2-Identitätsproblems darf es nicht berichtet werden.

**Auflage an K5:** K5a (präzisierter Extractorvertrag: **dieselbe Absprache, dieselben Parteien/Verpflichtung**, andere Sache → neue ID; Hearsay ≠ Versprechen; tatsächliche Einlösung melden) kann separat und messbar umgesetzt werden. **D-1** ist zu trennen in „Ursprungstext bleibt stabil“ (sinnvoll) und „ungeprüfter Text `latest` darf als Fortsetzung oder gültige neue Partei gelten“ (nicht freigeben). Bestehende R7-/Eindeutigkeitsguards dürfen nicht aufgeweicht werden. Wenn eine deterministische Sachidentitätsprüfung nicht zuverlässig möglich ist, die ursprüngliche ID nicht allein wegen vermeintlicher `latest`-Felder als semantisch repariert deklarieren; natürliche Wirkung des Vorgabenfixes messen und Fehlbindungen gesondert dokumentieren. Kein neuer universeller Textähnlichkeits-Algorithmus auf Verdacht.

### C – K2: physische Mengen-/Variantenidentität

Das Verknüpfen einer Warenzeile allein über **gleichen normalisierten Namen und eindeutigen Fundort** ist eine vertretbare Minimalbasis für das konkrete Primer-Einzelexemplar. Der Plan muss vor Auslieferung klar nachweisen, dass eine Teilmenge aus einem ausgestellten Stack weder den gesamten Stack verschenkt noch kostenlos kopiert und dass gleichnamiges, aber profilmäßig **abweichendes** Equipment nicht dem falschen Angebot zugeordnet wird. Bei Unsicherheit nicht verknüpfen; die bisherige Neuerzeugung bleibt der Fallback, ohne falsches `object.moved`. Ergänze Rot-/Grün-Gegenfälle für Teilmenge und Variantenprofil. Das ist keine neue Inventararchitektur.

### D – K1 und K4: Sicherheitsgrenzen als Prüfpflicht

Bei K1 muss die Slotautorisierung **aus genau diesem DUNGEON-AHEAD-Zug** stammen, nicht aus irgendeiner noch am NPC gespeicherten Slotinformation. Die bestehende Prüfung `mayOpenFight` einschließlich Angriffsabsicht, Reichweite und Gruppe bleibt. Bei K4 darf das Zerlegen von Zitaten nicht Erinnerung, reine Rede, Zukunft oder Negation in „geschehene Handlung“ verwandeln; die vollständige ursprüngliche Satzrahmung muss bei jedem Teilstück überprüft werden.

## 3. Empfehlung zu den sechs offenen Designfragen (noch Nutzerentscheidungen)

| Frage | Empfehlung für die Entscheidung |
|---|---|
| **D-1 Threadtext / `latest`** | **Ursprungstext stabil: ja.** Keine ungeprüfte `latest`-Aussage als autoritative Fortschreibung und keine falschen zusätzlichen Parteien oder Resolutionen. K5a zuerst, K5b erst mit sauberer Tragweite. |
| **D-2 Bearbeiterwortschatz** | **Eng erweitern:** `checked`, `pressed`, `sealed`, `pulled` nur bei dokumentiertem Schalter-/Belegobjekt und identifiziertem handelndem NPC; `tray` allein zu unscharf. Nach Ablehnung eines nur beobachtenden NPC keine Bearbeiterbuchung. |
| **D-3 `relevant` reservieren** | **Zurückstellen**, erst K3-Vorher-/Nachhermessung; weder pauschale Tokenreserve noch neues Budget jetzt. |
| **D-4 Wiedererkennung über offenen Thread** | **Noch keine automatische Personenverschmelzung.** Derselbe Beruf + ein offener Thread kann zwei unterschiedliche Fuhrleute derselben Stadt betreffen; erst enge Promptkorrektur und neue natürliche Fälle. |
| **D-5 Ladenware per `take`** | **Kein kostenloser regulärer TAKE ausgestellter Verkaufsware.** Ein möglicher bewusster Diebstahl mit Risiko/Consequences ist ein getrennter Entwurf, nicht die stille automatische Entnahme beim Einpacken. Nutzerentscheidung erforderlich. |
| **D-6 Rudel/Gruppe** | Eine zusammengehörige Gruppe soll nicht allein durch die **Extractor-Aufteilung** künstlich in mehrere Gegnergruppen zerfallen. Mechanische Zusammengehörigkeit aber nur aus belegter Gruppe/Slot/Population ableiten, nicht rein aus Formulierungen. Vorerst ohne neue Regeländerung beobachten. |

## 4. Sinnvolle Reihenfolge und Freigabegrenze

1. **Zuerst deterministische Integrität:** K1 Dungeon-Slot/PULSE und K2 Kauf-/Objektidentität mit den zusätzlichen Gegenfällen; Rot gegen tatsächlichen Produktstand `2a8b54e`, dann Grün.
2. **Danach die im Alltag wirksame Kontinuität:** K3 **mit Erstangebotregression** und K4 **ohne Evidenzaufweichung**; K7 transparenter Geldfehlbetrag als enger UI-/Ergebnisfix. Kontextbudget unverändert.
3. **Dann modellabhängige NPC-Fortschreibung:** K5a und enge K6a-/K6b(a)-Vorgaben; die Frage nach K5b-Engine-Änderung und K6b(b)-Automerge nicht als bereits beschlossene Schutzmaßnahmen behandeln.
4. **K8/P3 und Finanzfolgeprüfung separat**, nach belegtem Bedarf; das Abendessen nicht als „durch K7 erledigt“ werten.
5. Erst dann ein neuer **natürlicher** Lauf, der u. a. echte wiederkehrende Personen und E3-Anker beobachten kann, ohne Anker künstlich zu erzwingen.

**Status:** Sols Fachplan ist eine brauchbare technische Grundlage, mit den genannten Auflagen. Diese Notiz trifft **keine Nutzerdesignentscheidung** und erteilt **keine Implementierungsfreigabe**. Änderungen wurden ausschließlich als unabhängiger Review auf `main` dokumentiert; Produktbranch bleibt unverändert.
