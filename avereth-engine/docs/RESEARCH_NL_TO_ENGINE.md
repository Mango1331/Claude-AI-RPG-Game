# Recherche: freie Spielersprache → deterministische, autoritative Engine

Stand 02.10.2026. Begleitdokument zu `docs/ARCHITECTURE_REVIEW_GM_TOOLS.md` §16 (Auswertung S4a). Dieses Dokument trifft **keine** Architekturentscheidung, baut keinen Prototyp C und verändert keinen Branch. Es sammelt Belege, stellt Gegenargumente daneben und schlägt den nächsten Test vor (S4b, §7).

---

## 0. Forschungsfrage

> Welche bewährten Architekturen kombinieren die flexible semantische Interpretation natürlicher Sprache durch ein LLM mit einem deterministischen, autoritativen Simulator/Executor? Das Modell soll kreative und unvorhergesehene Spielerabsichten verstehen, darf aber Regeln, Zahlen, kanonischen Zustand und irreversible Aktionen nicht selbst erfinden.

Die Frage ist bewusst nicht „Avereth A gegen B“ gestellt. Gesucht wurde in:
- semantischem Parsen;
- Planner → Executor;
- neuro-symbolischen Systemen;
- Tool-Use und Kalibrierung;
- Dialogzustand;
- Spiel- und Robotik-Agenten;
- Event Sourcing und Durable Execution;
- Zustands- und Entitäts-Tracking;
- KI-Spielen.

Ausdrücklich gesucht wurde auch nach Gegenargumenten zur derzeitigen Tendenz eines separaten semantischen Planers (§3).

**Methode:**
- Primärquellen: Papers, offizielle Dokumentation, Herstellerbeiträge, mit Datum.
- Wo nur eine Sekundärquelle vorlag, steht das dabei.
- Zahlen stammen aus den Quellen, nicht aus Avereth. Avereths eigene Daten (S1, S4, S4a) stehen getrennt in §4 und im Review §15–§16.

---

## 1. Die Anforderung, neutral formuliert

**A. Autorität:** Die Engine allein entscheidet über:
- HP/MP, Schaden und Würfe, Kosten;
- Inventar, Quest-Zustand, Fortschritt;
- kanonisches NPC- und Weltwissen;
- reproduzierbare Mechanik.

Irreversible Festlegungen (zahlen, abgeben, angreifen, verkaufen) entstehen nur aus einer Absicht des Spielers.

**B. Freiheit:** Der Spieler formuliert so frei wie bei einem guten menschlichen oder LLM-GM:
- Aliase: `I Fire Lance Barkscorpion B`;
- Referenzen: „the wounded one“, „the left one“;
- kreative Nutzung: „burn through the rope“;
- Suche und Reise mitten im Geschehen.

Bei echter Mehrdeutigkeit fragt das System nach, statt still zu raten.

**Das Kernproblem** ist eine Abbildung von offener Sprache auf einen geschlossenen, versionierten Raum aus Handlungen und Affordanzen:
- Skills, Ziele, Story-Befehle;
- dazu ein offener, aber engine-geprüfter Kanal für kreative Nutzung;
- dazu eine Antwortklasse „Nachfrage“.

Wie A heute an genau dieser Abbildung scheitert, zeigt Review §16.10 am Code. Kurz: Was A exakt erkennt, löst es richtig; alles andere wird still zum Basisangriff, zur falschen Zielfrage oder zu bloßer Erzählung.

---

## 2. Muster aus Forschung und Praxis

Jedes Muster: Kern · Belege · Grenzen.

### M1 Semantisches Parsen in eine ausführbare Form

**Kern:** Das Modell übersetzt die Äußerung in ein Programm oder einen Befehl einer festen Sprache. Ein deterministischer Executor führt es aus.

**Belege:**
- **SMCalFlow / Dataflow** (Andreas et al., TACL 2020): Dialog wird als Programm über einem Datenfluss-Graphen dargestellt. `refer` und `revise` lösen Referenzen und Korrekturen über frühere Äußerungen auf, statt sie in den Text zu legen. [TACL](https://aclanthology.org/2020.tacl-1.36.pdf)
- **Constrained LMs als Few-Shot-Parser** (Shin et al., EMNLP 2021): Das LM paraphrasiert in kanonische, grammatikbeschränkte Äußerungen; die Abbildung auf das Programm ist dann deterministisch. [arXiv 2104.08768](https://arxiv.org/pdf/2104.08768)
- **FIREBALL** (Zhu et al., ACL 2023): rund 25.000 echte D&D-Sitzungen auf Discord mit Avrae-Befehlen und Spielzustand. Die Aufgabe ist genau unsere: aus Spielersprache den Bot-Befehl erzeugen.
  - Zustandsinformation im Prompt verdreifacht den Erfolg beim feinabgestimmten Modell:
    - ausführbare Befehle (Pass Rate): 0,726 mit Zustand gegenüber 0,235 ohne;
    - Befehle mit dem gewünschten Zustandswechsel laut handgeschriebenen Unit-Tests: 0,65 gegenüber 0,234;
    - Few-Shot: 0,432 gegenüber 0,319 (Unit-Tests 0,429 gegenüber 0,25).
  - Stärken: Zauber-Substitution, verletzt/gesund unterscheiden.
  - Fehler: Gruppenziele („the casters“), Mengen („2 injured orcs“).
  - [arXiv 2305.01528](https://arxiv.org/abs/2305.01528)
  - Aus derselben Gruppe stammt **CALYPSO** (Zhu et al., AIIDE 2023): Das LLM ist dort Assistent des menschlichen Spielleiters, nicht selbst Spielleiter. [AAAI](https://ojs.aaai.org/index.php/AIIDE/article/view/27534)
- **LLM + Logikprogramm** (Yang, Ishay, Lee, Findings ACL 2023): Das LLM ist Few-Shot-Parser in ASP-Fakten; der Solver schließt. Das ist robuster als das LLM allein. [ACL Anthology](https://aclanthology.org/2023.findings-acl.321/)
- **LLM+P** (Liu et al. 2023): Das LLM übersetzt die Aufgabe nach PDDL; ein klassischer Planer löst sie. [arXiv 2304.11477](https://arxiv.org/abs/2304.11477)
- **Real-Time World Crafting** (Drake & Dong, Okt. 2025): Spieler beschreiben Zauber frei; ein LLM erzeugt eine eingeschränkte DSL, die das Spiel zur Laufzeit konfiguriert.
  - Few-Shot-Beispiele waren für komplexe DSL-Skripte unverzichtbar.
  - Chain-of-Thought verbesserte die Treue zur kreativen Absicht.
  - [arXiv 2510.16952](https://arxiv.org/abs/2510.16952)

**Grenzen:** Die Qualität hängt an der Zielsprache. Fehlt eine Form (bei uns: Fähigkeit auf die Welt, Nachfrage), kann der Parser sie nicht ausdrücken und weicht aus. Die Formsprache muss gepflegt und versioniert werden.

### M2 Rechnen auslagern: Das Modell zerlegt, ein Interpreter rechnet

- **PAL** (Gao et al., ICML 2023): Das LLM schreibt Programmschritte, Python rechnet. Damit ist es robuster gegen Zahlenkomplexität; korrekte Zerlegung, aber falsche Arithmetik verschwindet. [arXiv 2211.10435](https://arxiv.org/abs/2211.10435)
- **Code as Policies** (Liang et al. 2022): Sprache wird in Policy-Code übersetzt, der Wahrnehmungs- und Steuer-APIs parametrisiert. [arXiv 2209.07753](https://arxiv.org/abs/2209.07753)
- **Voyager** (Wang et al. 2023): Fähigkeiten als Code-Bibliothek, Ausführungsfeedback, Selbstprüfung. [arXiv 2305.16291](https://arxiv.org/abs/2305.16291)

**Für Avereth:** Das ist schon das Prinzip „Engine rechnet, LLM nie“. Neu ist nur die Bestätigung, dass Zahlen gar nicht erst im Modell entstehen sollen.

### M3 Erzeugen und extern prüfen (Generate-Test, „LLM-Modulo“)

- **LLM-Modulo** (Kambhampati et al., ICML 2024): LLMs planen allein unzuverlässig; laut Autoren sind autonom nur rund 12 % der Pläne fehlerfrei. Als Ideen- und Übersetzungsquelle in einer Schleife mit externen, soliden Prüfern sind sie wertvoll. [PMLR](https://proceedings.mlr.press/v235/kambhampati24a.html)
- **SayCan** (Ahn et al. 2022): Was das LLM für sinnvoll hält, wird mit dem multipliziert, was die Umgebung als ausführbar bewertet (Affordanzen). Ergebnis: 84 % richtige Skill-Sequenz, 74 % erfolgreiche Ausführung; die Verankerung verdoppelt grob die Leistung. [say-can.github.io](https://say-can.github.io/)
- **Inner Monologue** (Huang et al. 2022): Rückmeldungen aus der Umgebung (Erfolg, Szenenbeschreibung, Mensch) gehen geschlossen in die nächste Planung. [arXiv 2207.05608](https://arxiv.org/abs/2207.05608)
- **SayPlan** (Rana et al., CoRL 2023): Die Suche läuft in einem Szenengraphen; ein Simulator prüft den Plan und meldet nicht ausführbare Schritte zur Neuplanung zurück. [arXiv 2307.06135](https://arxiv.org/abs/2307.06135)
- **PANGeA** (Buongiorno et al., AIIDE 2024): Ein Validierungssystem prüft freie Spielereingaben gegen Spielregeln. Gemessen stieg die Ausrichtung bei Llama-3 8B von 28 % auf 98 %, bei GPT-4 von 71 % auf 99 %. [arXiv 2404.19721](https://arxiv.org/abs/2404.19721)

**Grenzen:**
- Prüfer gibt es nur für das, was formal beschrieben ist.
- Jede Prüfschleife kostet Aufrufe und Latenz.
- Der Prüfer fängt Ungültiges, aber keine gültige Fehldeutung: Ein gültiger, aber falscher Angriff auf B statt C passiert jeden Validator.

### M4 Die Engine zählt die legalen Optionen auf

- **DungeonBench** (Ismayilov et al., 2026): Die Engine (SRD 5.1, 561 Kämpfer, 229 Zauber) zählt alle aktuell legalen Optionen mit stabilen IDs auf; das Modell wählt nur unter ihnen.
  - Die Autoren tun das ausdrücklich, um taktisches Urteil von „Befehlssyntax und Gültigkeit“ zu trennen.
  - Ergebnis: Einzelkämpfe 68–83 % gewonnen, verkettete Tage mit Ressourcen 0–40 %.
  - [arXiv 2607.29577](https://arxiv.org/abs/2607.29577)
- **Inform 7:** Der Parser bewertet Kandidaten („Does the player mean“-Regeln) und fragt bei Gleichstand: „Which do you mean, …?“ Zarf (Andrew Plotkin) beschreibt, wie lästig zu viele solcher Fragen werden. [Zarf, Jan. 2024](https://blog.zarfhome.com/2024/01/parser-if-disambiguation)
- **SayCan** (M3): Affordanzwerte statt freier Aktionen.

**Für Avereth:**
- Am direktesten übertragbar sind:
  - die bekannten Skills des Charakters (Name, ID, Einzelziel, Fläche, Element);
  - die Gegner mit ihren Labels und HP-Zustand in Worten;
  - die Entfernungsbänder;
  - die bekannten Weltmerkmale.
- Das schließt erfundene IDs aus und macht Aliase lösbar („Fire Lance“ → der einzige Feuer-Skill auf Distanz).
- **Grenze:** Kreative Nutzung lässt sich nicht vollständig aufzählen. Sie braucht einen offenen Kanal, den die Engine danach prüft (M1/M3).

### M5 Der Hauptagent ruft Funktionen auf (Controller, „Tool Use“)

**Belege dafür:**
- **ReAct** (Yao et al. 2023): Denken und Handeln im Wechsel, mit Beobachtungen. [arXiv 2210.03629](https://arxiv.org/abs/2210.03629)
- **Labyrinth-GM mit Function Calling** (Song, Zhu, Callison-Burch, Wordplay @ ACL 2024): Spielspezifische Funktionen verbessern Erzählkohärenz und Zustandskonsistenz eines KI-Spielleiters (menschliche Bewertung und Unit-Tests). [arXiv 2409.06949](https://arxiv.org/abs/2409.06949)
- **Statischer gegen agentischer GM** (Jørgensen et al. 2025): ReAct-Multi-Agent-GM verbessert Modularität und Spielerlebnis gegenüber reinem Prompting. [arXiv 2502.19519](https://arxiv.org/abs/2502.19519)
- **Industrie:**
  - Microsoft hat die Planner in Semantic Kernel (Stepwise, Handlebars) zugunsten von Auto-Function-Calling abgekündigt. [Devblog](https://devblogs.microsoft.com/semantic-kernel/the-future-of-planners-in-semantic-kernel/), [Doku](https://learn.microsoft.com/en-us/semantic-kernel/concepts/planning)
  - Anthropic: zuerst die einfachste Lösung; Workflows (feste Abläufe mit Gates, Routing) vor Agenten. [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
  - OpenAI: mit einem Single-Agent beginnen und erst teilen, wenn die Komplexität es verlangt. Das PDF war nicht maschinenlesbar, der Wortlaut ist [über eine Zusammenfassung](https://www.maginative.com/article/how-to-build-ai-agents-a-detailed-practical-guide-from-openai/) belegt. [Guide](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

**Belege für die Grenzen (Zuverlässigkeit und Kalibrierung):**
- **τ-bench** (Yao et al. 2024): Selbst starke Modelle lösen unter 50 % der Aufgaben; die Konsistenz über 8 Wiederholungen (pass^8) liegt im Einzelhandels-Szenario unter 25 %. [arXiv 2406.12045](https://arxiv.org/abs/2406.12045)
- **When2Call** (Ross et al., NAACL 2025): Wann ein Tool aufrufen, wann nachfragen, wann ablehnen? Führende Modelle haben „significant room for improvement“; bisherige Benchmarks messen fast nur die Richtigkeit des Aufrufs. [ACL Anthology](https://aclanthology.org/2025.naacl-long.174/)
- **Calibration is the Bottleneck** (Zhao et al., Sept. 2026): Die Fehlkalibrierung der Aktionsklasse (TOOL_CALL / ASK / REFUSE / CONFIRM) ist ein eigener, großer Fehlermodus. Aggregierte Genauigkeit verdeckt ihn; dieselbe Kalibrierungsänderung bringt je nach Modellfamilie +11,5 bis −21 pp. [arXiv 2609.00949](https://arxiv.org/abs/2609.00949)
- **Learning to Ask** (Wang et al., EMNLP 2025): Agenten erfinden fehlende Argumente, statt nachzufragen („weather today?“ → „New York“). Fehlende Schlüsselinformation ist mit 56 % die häufigste Unklarheit; ein „Ask-when-Needed“-Prompt hilft deutlich. [ACL Anthology](https://aclanthology.org/2025.emnlp-main.1104/)
- **Anthropic, Writing effective tools for agents** (2025): Fehlermeldungen sollen konkret und handlungsleitend sein statt „opaque error codes“; wenige, zusammengefasste Werkzeuge statt vieler dünner Hüllen; eindeutige Parameternamen; Bewertung mit realistischen Aufgaben. [Anthropic Engineering](https://www.anthropic.com/engineering/writing-tools-for-agents)

### M6 Erst planen, dann ausführen

- **ReWOO** (Xu et al. 2023): Der Plan entsteht ohne Beobachtungen, Worker führen ihn aus, ein Solver fasst zusammen. Auf HotpotQA etwa 5-fach token-effizienter als verschachteltes ReAct. [arXiv 2305.18323](https://arxiv.org/abs/2305.18323)
- **LLMCompiler** (Kim et al., ICML 2024): Planer, Task-Fetcher und paralleler Executor. Gegenüber ReAct bis 3,7× schneller, bis 6,7× billiger und bis etwa 9 % genauer. [arXiv 2312.04511](https://arxiv.org/abs/2312.04511)

**Grenze:** Ein vorab gefasster Plan reagiert nicht auf Zwischenergebnisse („wenn er fällt, durchsuche ich ihn“), außer es gibt eine Neuplanung.

### M7 Dialogzustand, Schemata, Slots

- **Schema-Guided Dialogue** (Rastogi et al., AAAI 2020):
  - Ein Modell für alle Dienste; Intents und Slots kommen als Schema mit Beschreibungen in natürlicher Sprache herein.
  - Damit gelingt Zero-Shot auf unbekannte Dienste: 78 % der Testdaten stammen aus Diensten, die im Training nicht vorkamen.
  - [AAAI](https://cdn.aaai.org/ojs/6394/6394-13-9619-1-10-20200517.pdf)
- **FnCTOD** (Li et al. 2024): Dialogzustandsverfolgung als Function Calling; +5,6 % durchschnittliche Joint Goal Accuracy, GPT-4 +14 %. [arXiv 2402.10466](https://arxiv.org/abs/2402.10466)
- **Façade** (Mateas & Stern, 2003–2005):
  - Das historische Vorbild: Freie Texteingabe wird über Hunderte Regeln auf etwa 30 parametrisierte Diskursakte abgebildet (Lob, Kritik, Themenbezug …).
  - Ein Drama-Manager wählt darauf die Beats.
  - Die Trennung „Sprache verstehen → strukturierter Akt → deterministische Spiellogik“ ist 20 Jahre alt und trug ein ganzes Spiel.
  - [Mateas & Stern 2004](https://eis.ucsc.edu/papers/MateasSternTIDSE04.pdf)
- **Inworld Goals & Actions:** Intents und Trigger lösen Ziele aus, deren Aktionen der Client ausführt. [Inworld 2.0](https://inworld.ai/blog/goals-and-actions-2.0)

### M8 Nachfragen statt raten

- **CLAMBER** (Zhang et al., ACL 2024): rund 12.000 Fälle mit Taxonomie der Mehrdeutigkeit. LLMs erkennen und klären Mehrdeutigkeit noch schlecht. [ACL Anthology](https://aclanthology.org/2024.acl-long.578/)
- **When2Call, Learning to Ask, Calibration is the Bottleneck** (M5): Nachfragen ist eine eigene Aktionsklasse. Sie muss eigens gemessen und kalibriert werden.
- **Inform und Zarf** (M4): Bei echtem Gleichstand nachfragen, sonst Prioritätsregeln. Zu viele Nachfragen sind selbst ein Spielfehler.

**Für Avereth:** Es gibt zwei Fehlerarten mit unterschiedlichem Gewicht:
- **Stiller falscher Default** (Basic Attack statt Flame Lance): verletzt die Absicht und kostet echte Ressourcen;
- **unnötige Nachfrage:** stört den Fluss.

Beide müssen getrennt gemessen werden.

### M9 Autoritativer Zustand als Ereignislog

- **Deterministischer Lockstep** (Terrano & Bettner, Gamasutra 2001, Age of Empires): Jede Maschine führt dieselbe Simulation mit denselben Befehlen aus. Der Befehl ist das Protokoll, der Zustand eine reine Folge davon. [Game Developer](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond)
- **ESAA** (Santos Filho, Feb. 2026): Agenten senden nur strukturierte Absichten in validiertem JSON. Ein deterministischer Orchestrator validiert, schreibt Ereignisse in ein Append-only-Log, wendet Effekte an und projiziert einen prüfbaren Zustand. Das ist fast wörtlich Avereths Muster. [arXiv 2602.23193](https://arxiv.org/abs/2602.23193)
- **„The Log is the Agent“** (2026): Das Ereignislog ist die Wahrheit, Zustand eine deterministische Projektion. Damit sind Replay und Forks möglich. [arXiv 2605.21997](https://arxiv.org/abs/2605.21997)
- **Durable Execution (Temporal):** Die Koordination ist deterministisch und wiederholbar. LLM- und Tool-Aufrufe sind Activities, deren Ergebnisse protokolliert und beim Replay nicht neu ausgeführt werden. [Temporal-Blog](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal)
- **OpenAI Agents SDK, Guardrails:**
  - Tool-Guardrails prüfen „at the boundary where side effects occur“.
  - Sensible Aktionen pausieren für eine Freigabe (`needsApproval`).
  - [Doku](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)

**Für Avereth:** Das ist schon da (Event-Log, Fold, Firewall, Ownership). Bestätigt ist vor allem die Regel, die Modellantwort als protokollierte Eingabe zu behandeln. Ein Swipe ist dann ein neuer Aufruf mit neuem Ergebnis, Replay liest das gespeicherte.

### M10 Zustand, Gedächtnis, Entitätsidentität

- **Entity Tracking** (Kim & Schuster, ACL 2023): Zustandsänderungen von Entitäten verfolgt nur ein Modell, das stark auf Code vortrainiert ist (GPT-3.5). Mit wachsender Komplexität sinkt die Leistung. [ACL Anthology](https://aclanthology.org/2023.acl-long.213/)
- **Tang et al.** (Mai 2026): Transformer verfolgen Zustände nicht schrittweise, sondern sammeln die Information parallel an der Frage. Das Entfernen von Objekten ist ein fragiler globaler Mechanismus mit vorhersagbaren Fehlern. [arXiv 2605.30233](https://arxiv.org/abs/2605.30233)
- **LLMs als Weltsimulatoren** (Wang et al., ACL 2024): GPT-4 sagt Zustandsübergänge bei Handlungen in bis zu 77,1 % richtig voraus, bei Umgebungsdynamik in 49,7 % — „unreliable world simulator“. [ACL Anthology](https://aclanthology.org/2024.acl-short.1/)
- **RPGBench** (Yu et al., Feb. 2025): LLMs erzählen kreativ, setzen aber konsistente, prüfbare Mechanik vor allem in langen und komplexen Szenarien schlecht um. [arXiv 2502.00595](https://arxiv.org/abs/2502.00595)
- **Tsai et al.** (2023/2025): ChatGPT baut in Textspielen kein Weltmodell auf, weder durch Spielen noch durch das Handbuch. [arXiv 2304.02868](https://arxiv.org/abs/2304.02868)
- **DungeonBench, Day-Track** (M4): Über verkettete Begegnungen mit Ressourcen bricht die Leistung ein (0–40 %).
- **Generative Agents** (Park et al. 2023) und **MemGPT** (Packer et al. 2023): Gedächtnis als Retrieval über Text, nicht als kanonischer Zustand. Damit lässt sich erinnern, aber nichts autoritativ führen. [arXiv 2304.03442](https://arxiv.org/abs/2304.03442), [arXiv 2310.08560](https://arxiv.org/abs/2310.08560)
- **Hidden Door** (Produkt):
  - Strukturierte Weltrepräsentation, kuratierte Tropen, Karten als Zustand.
  - Ian Bicking (Aug. 2025) stellt fest: „There's no 'truth' behind the story.“
  - Freie Eingaben werden umgeschrieben oder abgewiesen, etwa „I summon an ancient demon“ → „I call upon a mythical creature“.
  - Moderation geht dort vor Spielerfreiheit.
  - [Bicking](https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game.html)

### M11 Gegenrichtung: das ganze Spiel neuronal

- **GameNGen** (Valevski et al. 2024): Doom läuft als Diffusionsmodell mit etwa 3 s Kontext.
  - Zustand überlebt nur, soweit er auf dem Bildschirm steht.
  - Heuristiken können falsch greifen: Wiederholtes Schießen kann einen Gegner „erzeugen“.
  - [arXiv 2408.14837](https://arxiv.org/abs/2408.14837)
- **Genie 3** (DeepMind, Aug. 2025): Welten bleiben einige Minuten konsistent, Gedächtnis für Veränderungen etwa eine Minute. [DeepMind](https://deepmind.google/models/genie/)

**Folgerung:** Für kanonischen Zustand über Stunden und Sitzungen ist das heute keine Option. Die Richtung bestätigt eher, dass Autorität außerhalb des Modells liegen muss.

### M12 Strukturierte Ausgabe

- **JSONSchemaBench** (Geng et al. 2025): 10.000 echte Schemata. Constrained Decoding erzwingt Syntax, die Frameworks unterscheiden sich aber stark darin, welche Schemata sie überhaupt unterstützen. [arXiv 2501.10868](https://arxiv.org/abs/2501.10868)
- **Chavan** (Sept. 2026), kleine Modelle 0,6–4B:
  - Constrained Decoding hebt die Schemavalidität von 78,6–92,9 % auf 100 %.
  - Semantische Fehler (fehlende Aufrufe, falsche Werte) bleiben: „token masking cannot inject task understanding“.
  - [arXiv 2609.23742](https://arxiv.org/abs/2609.23742)
- **„Let Me Speak Freely?“** (Tam et al. 2024): Strenge Formatvorgaben können das Schließen verschlechtern, helfen aber bei Klassifikation. Ein zweistufiges „erst frei, dann formatieren“ mildert das. [arXiv 2408.02442](https://arxiv.org/abs/2408.02442)

---

## 3. Gegenargumente zum separaten semantischen Planer

Die derzeitige Tendenz (Review §16.11) geht zu einem schlanken, spezialisierten LLM-Planer vor der Engine. Was dagegen spricht:

| # | Gegenargument | Beleg | Was Avereths Daten dazu sagen |
|---|---|---|---|
| G1 | Die Praxis bewegt sich von separaten Planern weg, hin zu nativem Function Calling im Hauptagenten | Semantic Kernel (M5); OpenAI „single agent first“; Anthropic „simplest solution“ | S4: Bs Tool-Schnittstelle (ohne Typliste) war das schwächste Glied (29,5 % Recall). S4a: Mit expliziter Schnittstelle liegt derselbe Kontext bei 78,7–88,5 %. **Nicht gemessen ist ein Tool-Aufruf mit guter, typisierter Schnittstelle.** Das muss S4b klären (Arm `fc`). |
| G2 | Pipelines pflanzen Fehler fort. Zwei Stufen lesen dieselbe Nachricht verschieden, die Prosa widerspricht dann der Buchung | SimpleTOD (Hosseini-Asl et al. 2020): ein Modell für alle Teilaufgaben statt Pipeline. [arXiv 2005.00796](https://arxiv.org/abs/2005.00796) | In A und C erzählt der Erzähler das Engine-Ergebnis, er liest nicht neu. Das Risiko liegt in Prosa, die über das Ergebnis hinausgeht; dafür gibt es Extraktor/Firewall. Messbar im Live-Paarlauf. |
| G3 | Ein Aufruf mehr je Zug, auch in den vielen reinen Gesprächszügen | Latenz-Kosten (M6) | S1: etwa 3 s p50 (8,2 s p90) vor jeder Prosa; S4a gm_rules 3,2 s bei 8k Prompt. **Gegenmittel:** Kaskade, deterministischer Schnellpfad zuerst (§7). |
| G4 | Ohne Erzählverlauf fehlen Referenzen („the one that stung me“, „the other two“) | FIREBALL: Zustand ist entscheidend; Verlauf ist etwas anderes | S4a: Der Erzählervertrag half bei Story-Befehlen nicht. **Der Verlauf ist aber ungemessen** → S4b-Arm `planner+history`. |
| G5 | Plan-first reagiert nicht auf Zwischenergebnisse | ReWOO-Grenze (M6) | Avereth löst einen Zug als Ganzes auf; Bedingungen („bis er fällt“) gibt es heute nicht. Klein, aber festhalten. |
| G6 | Zwei Prompts mit überlappender Semantik (Planer, Erzähler) müssen synchron gehalten werden | Wartung | Gilt heute schon für Interpreter + Extraktor + Erzähler (A). Ein Planer ersetzt eher eine Stufe, als eine hinzuzufügen. |
| G7 | Es gibt positive Belege für Function-Calling-GMs | Labyrinth, agentischer GM (M5) | Dort war der Vergleich „Tools gegen gar keine Struktur“, nicht „Tools gegen Planer + Engine“. |
| G8 | Kalibrierung ist bei jedem LLM-Entscheider das Problem, auch beim Planer | When2Call, Calibration is the Bottleneck | Trifft Planer und Tool-Controller gleich. Spricht für eine gemessene Nachfrage-Klasse und für deterministische Prüfungen danach, nicht für eine bestimmte Position. |

**Ehrliche Bilanz:**
- G1 und G4 sind die stärksten Gegenargumente. Beide sind empirisch offen und gehören in S4b.
- G3 ist real, aber durch eine Kaskade begrenzbar.
- G2, G5 und G6 sind Risiken, keine Widerlegungen.

---

## 4. Vor- und Nachteile speziell für Avereth

| Muster | Vorteil für Avereth | Nachteil / Risiko | heute |
|---|---|---|---|
| M1 Semantisches Parsen in Befehle | passt zum vorhandenen Vokabular und Validator; S1/S4a zeigen 88–93 % Ende-zu-Ende bei Story-Befehlen | Vokabular braucht neue Formen (Kampf mit Skill + Ziel, Welt-Fähigkeit, Nachfrage); Pflege und Versionierung | A: Interpreter für Story-Befehle; Kampf nur über Regex |
| M2 Rechnen auslagern | schon Kern der Engine | – | A und B |
| M3 Erzeugen + prüfen | Validator, Guard, Firewall existieren; typisierte Fehler + Reparatur sind billig | fängt keine gültige Fehldeutung; jede Schleife kostet Latenz | A (Guard, Reparatur), B (`invalid_commands`) |
| M4 Engine zählt Optionen auf | löst Aliase und erfundene IDs; „Skills: Flame Lance (Einzelziel, Feuer, LONG) · Arcane Burst (Fläche)“ im Kontext | kreative Nutzung lässt sich nicht aufzählen; Kontext wächst mit vielen Gegnern | teilweise: Kampf-Labels in der Anzeige, nicht als Planer-Kontext |
| M5 Function Calling im Erzähler | ein Aufruf weniger; Erzähler „ist“ der GM; Branchenrichtung | Kalibrierung (Zuständigkeit: 9 Fälle in S4 selbst erzählt statt gebucht); SillyTavern-Host-Komplexität (Review §5); Schnittstelle muss typisiert sein | B (Prototyp) |
| M6 Plan → Ausführen | ein kleiner Planer-Aufruf, dann Engine, dann Prosa; gut prüfbar | +1 Aufruf; keine Reaktion auf Zwischenergebnisse | C-Skizze (Review §7) |
| M7 Schema-geführter Dialog | Beschreibungen im Schema statt Beispiele pro Fall; Zero-Shot auf neue Befehle | Beschreibungen allein reichten in S4a (gm) nicht; Beispiele trugen die Formtreue | A (Befehlsliste mit Beschreibungen) |
| M8 Nachfragen | verhindert stillen Basisangriff; Inform-Erfahrung zeigt das Maß | zu viele Fragen nerven; Modelle sind schlecht kalibriert (M5) | A fragt deterministisch bei Zielgleichstand, nie bei Skill-Unklarheit |
| M9 Ereignislog | Replay, Swipe, Reload, Audit bereits gelöst; Modellantwort = protokollierte Eingabe | – | A und B |
| M10 Zustand außerhalb des Modells | bestätigt Avereths Grundentscheidung | Planer braucht eine gute Projektion des Zustands (Labels, HP in Worten, Bänder) | A und B |
| M11 Neuronale Welt | – | keine Persistenz | – |
| M12 Strukturierte Ausgabe | Constrained Decoding könnte die gm-Formfehler beseitigen (fehlendes `quote`) | über SillyTavern und GLM nicht garantiert verfügbar (S0); hilft nicht gegen Fehldeutung; kann Schließen verschlechtern | A: Plain-JSON + Reparatur (S0-Entscheid) |

---

## 5. Was die Belege zusammen nahelegen (Eigenschaften, keine Entscheidung)

Unabhängig davon, wo die Semantikstufe sitzt:
- als separater Planer;
- als Tool-Aufruf im Erzähler;
- als ein Aufruf mit Plan und Prosa.

Die Quellen und Avereths Messungen stimmen in diesen Eigenschaften überein:

1. **Ausführungsautorität strikt deterministisch.** Zahlen, Würfe, Kosten und Zustand nie im Modell (M2, M9, M10, M11). Das erfüllen A und B schon.
2. **Eine kleine, explizite, typisierte Schnittstelle mit Beispielen.**
   - Mit Typnamen, Argumentnamen und Referenzformen.
   - S4 gegen S4a zeigt: Die Schnittstelle entscheidet mehr als der Kontext.
   - Gestützt durch Anthropic Tools (M5), Real-Time World Crafting (M1) und SGD (M7).
3. **Engine-Affordanzen im Kontext der Semantikstufe.**
   - Bekannte Skills mit Eigenschaften;
   - Gegner mit Labels und HP in Worten;
   - Entfernungsbänder und bekannte Weltmerkmale.
   - Gestützt durch FIREBALL (Zustand verdreifacht den Erfolg), DungeonBench und SayCan.
4. **Nachfrage als eigene, gemessene Antwortklasse** und das Verbot stiller Defaults (M8). Das ist der direkteste Hebel gegen „unsichtbare Textknöpfe“.
5. **Kreative Nutzung als offener Kanal mit Engine-Prüfung.**
   - Die Form ist `ability.world {skill, Ziel in Worten, Absicht}`.
   - Die Engine bucht Kosten und Rohwirkung.
   - Dauerhafte Folgen laufen nur über Firewall und Ownership (M1, M3).
   - B hat dafür schon `useAbilityOnWorld`; A hat nichts.
6. **Typisierte, handlungsleitende Fehler und eine Reparatur.** Gestützt durch Anthropic Tools und die Harness-Lehre aus §16.6.
7. **Messung:**
   - Ende-zu-Ende;
   - Validität;
   - Nachfrage-Präzision und -Recall;
   - Rate stiller Fehlbuchungen;
   - Stabilität über k Läufe (τ-bench pass^k);
   - Latenz und Token.

**Offen bleibt:**
- **Wo die Semantikstufe sitzt:** separater Planer, Function Calling mit guter Schnittstelle, oder ein Aufruf mit Plan und Prosa.
- **Ob sie den Erzählverlauf braucht.**

Genau das soll S4b messen.

---

## 6. Offene Fragen, die nur Experimente beantworten

| # | Frage | warum offen | Experiment |
|---|---|---|---|
| Q1 | Löst ein LLM-Planer Skill-Aliase, Zielreferenzen und kreative Nutzung besser als As Regex, ohne mehr stille Fehlbuchungen? | S1/S4a enthalten keinen einzigen Kampf- oder Fähigkeitsfall | S4b |
| Q2 | Fragt er bei echter Mehrdeutigkeit nach und sonst nicht? | Kalibrierung ist laut Literatur der Hauptfehlermodus | S4b (Nachfrage-Präzision/-Recall) |
| Q3 | Braucht die Semantikstufe den Erzählverlauf („the one that stung me“) oder reicht ein Zustandsabbild? | G4; S4a maß nur den Vertrag, nicht den Verlauf | S4b-Arm `planner+history` |
| Q4 | Kostet Function Calling mit guter, typisierter Schnittstelle Genauigkeit gegenüber Plain-JSON? | G1; S4 hatte eine schlechte Schnittstelle | S4b-Arm `fc` |
| Q5 | Wie viele Züge kann ein deterministischer Schnellpfad ohne LLM sicher entscheiden (Kaskade)? | bestimmt Latenz und Kosten von C | S4b, offline abgeleitet |
| Q6 | Wie stabil sind die Entscheidungen über k Wiederholungen bei Produktionstemperatur? | τ-bench pass^k; S4a lief einmal bei t 0,1 | S4b-Teilmenge, k = 3 |
| Q7 | Wie verhalten sich Planen und Erzählen in einem Aufruf (Latenz, Treue, Prosa)? | in keinem Spike gemessen | nach S4b, Live-Paarlauf |
| Q8 | Wie oft bleiben dauerhafte Weltfolgen kreativer Nutzung uncommittet? | B-Risiko (Review §15.5); A hat die Form nicht | Live-Paarlauf mit Extraktor-Audit |
| Q9 | Wie viel Latenz fängt Prompt-Caching beim Planer ab? | ungemessen | Live-Messblatt |

---

## 7. Vorschlag: S4b, die Problemklasse selbst

### 7.1 Frage

Versteht eine LLM-Semantikstufe die eigentlichen Problemfälle so, dass:
- die Absicht ankommt (Alias, Referenz, kreative Nutzung, Suche/Reise);
- nichts still falsch gebucht wird;
- bei echter Mehrdeutigkeit nachgefragt wird?

Und welche Position und welcher Kontext tragen das am besten: deterministisch, Planer, Planer + Verlauf, Function Calling?

### 7.2 Korpus (≈ 75 Fälle, von Hand gelabelt)

**Szenen:** sechs, als Engine-Zustand gebaut (wie im Probe zu Review §16.10) und als Katalogtext gerendert.

| # | Szene | Inhalt |
|---|---|---|
| 1 | Mage gegen drei Barkscorpions | Labels A/B/C, B verwundet, Bänder SHORT/MEDIUM/MEDIUM; Flame Lance + Arcane Burst gelernt; Weltmerkmale: rissiger Boden, Loch, Seil |
| 2 | Ranger gegen ein Wolfsrudel | ein großes Tier; „the big one“ |
| 3 | Warrior gegen Banditen, Händler steht daneben | Unbeteiligter darf nicht Ziel werden, außer benannt |
| 4 | Höhle ohne Kampf, mit Weltmerkmalen | Geröll, Tür, Seilbrücke, Eis |
| 5 | Nach dem Kampf | zwei Gegner geflohen, Spur, Bau in der Nähe |
| 6 | Stadt, für Negativfälle | – |

**Kategorien** (je Fall: Text, Szene, akzeptierte Alternativen, verbotene Lesarten):

| Kat. | Inhalt | Fälle |
|---|---|---|
| K1 | Skill-Aliase und Tippfehler: „Fire Lance“, „flame-lance B“, „my fire spear“, „arcane blast“ | 10 |
| K2 | Zielreferenzen: Teil-Label „Barkscorpion B“, „B“, „the second one“, „the wounded one“, „the big one“, Pronomen bei einem Gegner, „the one that stung me“ (nur mit Verlauf lösbar) | 14 |
| K3 | Kreative Fähigkeit auf die Welt: Boden, Seil, Geröll, Tür, Loch, Eis | 10 |
| K4 | Kampf + Welt gemischt: „Arcane Burst the scorpions by the rope“; „Flame Lance the rope above B“ | 5 |
| K5 | Suche, Spur, Reise gegen Kampf: „I look for the other two“, „I follow the trail“, „I go back to the burrow“ | 10 |
| K6 | Echt mehrdeutig → Nachfrage: „I blast the left one“ (keine Positionen), „I attack“ bei drei Gegnern, „I use my spell on it“ bei zwei Zaubern | 10 |
| K7 | Unmöglich oder unbekannt → ablehnen oder nachfragen, nie still ersetzen: unbekannter Zauber „Fireball“, nicht gelernter Skill, Ziel nicht anwesend | 6 |
| K8 | Negativ: Rede, Drohung in Anführungszeichen, Frage („can I Flame Lance the floor?“), NPC-Handlung, „what does Arcane Burst do?“ | 10 |

**Disziplin:**
- Die Beispiele im Planer-Prompt stammen nicht aus S4b.
- Der Prompt wird vor dem Lauf eingefroren.
- Etwa 15 Fälle sind Entwicklungsfälle zum Prompt-Bau, die übrigen sind Testfälle.
- Was „ein guter GM würde hier nachfragen“ heißt, ist eine Produktentscheidung. Diese Labels sollte der Spieler setzen oder bestätigen. Strittige Fälle bekommen beide Lesarten als akzeptiert.

### 7.3 Gold: akzeptierte strukturierte Absichten

```json
{"kind": "combat.attack", "skill": "mage.flame_lance", "target": "mon.s2"}
{"kind": "ability.world", "skill": "mage.flame_lance", "feature": "/floor/i", "goal": "/open|break|blast/i"}
{"kind": "clarify", "about": "target|skill|intent", "candidates": ["mon.s1", "mon.s3"]}
{"kind": "story", "commands": [{"type": "activity", "kind": "search"}]}
{"kind": "refuse", "reason": "unknown_skill|not_present"}
{"kind": "none"}
```

**Je Fall:**
- `accept`: eine oder mehrere Alternativen; wo eine Nachfrage vertretbar ist, gehört `clarify` dazu.
- `forbid`: die gefährlichen Lesarten, etwa „Basic Attack“ bei einem Alias oder ein Unbeteiligter als Ziel.

### 7.4 Arme

| Arm | Was | Aufrufe |
|---|---|---|
| **A0** | deterministisch: `readTurn` / `parseIntent` auf dem Szenenzustand, offline. Abbildung: attack → `combat.attack`, ambiguous_target → `clarify`, narrative → `none` … | 0 |
| **P1** | spezialisierter Planer (wie S1/gm_rules): Rolle, Regeln, Beispiele, Katalog mit Affordanzen (Skills mit Eigenschaften, Gegner mit Labels, HP in Worten, Bänder, Weltmerkmale), erweitertes Vokabular inkl. `clarify` / `refuse` / `ability.world`, Plain-JSON, **typisierte** Reparatur (Produkt-Validator), Guard | 1 (+1) |
| **P1+H** | wie P1, zusätzlich die letzten zwei Erzähler-Antworten (beantwortet Q3) | 1 (+1) |
| **fc** | dieselbe Information als ein Tool `plan_turn` mit typisiertem Schema: Typ-Enum, Skill-IDs, Ziel-IDs als Enum (beantwortet Q4, ohne Prosa) | 1 (+1) |
| **A0→P1** | Kaskade, offline aus A0 und P1 abgeleitet: A0 entscheidet, wenn exakter Skill und exaktes Label erkannt sind, sonst P1 (beantwortet Q5) | – |

**Bewusst nicht dabei:**
- **Erzählervertrag als Kontext:** S4a hat dafür keinen Nutzen gefunden. P1+H prüft den Teil, der plausibel helfen könnte, den Verlauf.
- **Prosa:** Sie ist Sache des Live-Paarlaufs.

### 7.5 Kennzahlen

Primär, je Arm und Ende-zu-Ende über alle Fälle; ungültig = verpasst:
1. **Absicht richtig:** eine `accept`-Alternative getroffen.
2. **Stille Fehlbuchung:** eine Festlegung, die weder akzeptiert noch eine Nachfrage ist; `forbid` wiegt doppelt. Das ist die Kennzahl für „unsichtbare Textknöpfe“.
3. **Nachfrage-Recall auf K6 und Nachfrage-Präzision auf K1–K5.** Unnötige Nachfragen bei eindeutigen Fällen werden getrennt gezählt.

Sekundär:
- Validität im 1. Versuch und nach typisierter Reparatur;
- erfundene IDs vor der Validierung;
- Kategorien K1–K8 einzeln;
- Latenz p50/p90, Prompt- und Output-Token;
- **Stabilität:** 30 Fälle aus K1–K6, k = 3 bei Produktionstemperatur, pass^3.

**Statistik:**
- gepaarte Vorzeichentests auf den abweichenden Fällen, Wilson-Intervalle;
- dazu `tools/p0/compare.mjs` in einer Variante für S4b.

### 7.6 Auswertung, vor dem Lauf festzulegen (Vorschlag)

- **Die LLM-Semantikstufe lohnt sich für Kampf und Kreativität**, wenn alle drei gelten:
  - P1 trifft K1–K5 Ende-zu-Ende um ≥ 15 pp besser als A0;
  - stille Fehlbuchungen von P1 ≤ die von A0 und ≤ 5 % der Fälle;
  - Nachfrage-Recall auf K6 ≥ 70 % bei ≤ 15 % unnötigen Nachfragen.
- **P1+H gegen P1:** Steigt K2 um ≥ 3 Fälle (Verlaufsreferenzen), braucht die Semantikstufe Verlauf. Das spricht für eine Position nah am Erzähler-Kontext. Sonst reicht das Zustandsabbild.
- **fc gegen P1:** Innerhalb des Rauschens (p > 0,2, Abstand ≤ 3 Fälle) entscheiden Latenz und Integration über den Kanal. Ist fc signifikant schlechter, bleibt Plain-JSON.
- **Kaskade:** Bleibt A0→P1 innerhalb von 2 Fällen von P1, spart der Schnellpfad den Planer-Aufruf in diesem Anteil der Kampfzüge. Diesen Anteil zusammen mit der Latenz berichten.
- **Wenn P1 die Schwellen verfehlt:** Prüfen, ob die Fehler in Schnittstelle (ungültig), Kalibrierung (Nachfrage) oder Lesart (gültig, falsch) liegen, wie in S4a. Dann erst über Prompt oder Modell entscheiden.

### 7.7 Was S4b nicht beantwortet

- Prosaqualität und Treue der Erzählung zum Engine-Ergebnis;
- Persistenz der Weltfolgen (Q8);
- Host-Verhalten in SillyTavern (Swipe, Streaming);
- Gesamtlatenz eines Zuges mit Caching.

Das bleibt beim Live-Paarlauf (Review §11.3).

### 7.8 Aufwand

- **Neu, nach Freigabe:**
  - `tools/p0/s4b_intent.mjs`;
  - `tests/eval/s4b_cases.jsonl`;
  - `tests/eval/s4b_scenes.json`;
  - ein Szenen-Builder, der denselben Zustand für A0 baut und für die LLM-Arme rendert;
  - Mock-Tests wie S4a.
- **Wiederverwendet:** Provider, `structuredCall` (mit typisierter Reparatur), Guard und Scorer-Logik.
- **Größenordnung:** 75 Fälle × 3 LLM-Arme × etwa 3–4k Prompt-Token plus 90 Stabilitätsaufrufe, rund 1,1 M Prompt-Token.
- **Ausführung:** seriell, wie S4a (`--concurrency 1`), Key bleibt in SillyTavern.

---

## 8. Quellen

Alle Links wurden am 02.10.2026 aufgerufen. Wo nur eine Zusammenfassung vorlag, steht das in §2.

- Andreas et al. 2020, Task-Oriented Dialogue as Dataflow Synthesis (SMCalFlow) — https://aclanthology.org/2020.tacl-1.36.pdf
- Shin et al. 2021, Constrained Language Models Yield Few-Shot Semantic Parsers — https://arxiv.org/pdf/2104.08768
- Zhu et al. 2023, FIREBALL — https://arxiv.org/abs/2305.01528
- Zhu et al. 2023, CALYPSO: LLMs as Dungeon Masters' Assistants — https://ojs.aaai.org/index.php/AIIDE/article/view/27534
- Yang, Ishay, Lee 2023, Coupling LLMs with Logic Programming — https://aclanthology.org/2023.findings-acl.321/
- Liu et al. 2023, LLM+P — https://arxiv.org/abs/2304.11477
- Drake & Dong 2025, Real-Time World Crafting — https://arxiv.org/abs/2510.16952
- Gao et al. 2023, PAL — https://arxiv.org/abs/2211.10435
- Liang et al. 2022, Code as Policies — https://arxiv.org/abs/2209.07753
- Wang et al. 2023, Voyager — https://arxiv.org/abs/2305.16291
- Kambhampati et al. 2024, LLM-Modulo — https://proceedings.mlr.press/v235/kambhampati24a.html
- Ahn et al. 2022, SayCan — https://say-can.github.io/
- Huang et al. 2022, Inner Monologue — https://arxiv.org/abs/2207.05608
- Rana et al. 2023, SayPlan — https://arxiv.org/abs/2307.06135
- Buongiorno et al. 2024, PANGeA — https://arxiv.org/abs/2404.19721
- Ismayilov et al. 2026, DungeonBench — https://arxiv.org/abs/2607.29577
- Plotkin (Zarf) 2024, Parser IF disambiguation hassles — https://blog.zarfhome.com/2024/01/parser-if-disambiguation
- Yao et al. 2023, ReAct — https://arxiv.org/abs/2210.03629
- Song, Zhu, Callison-Burch 2024, Enhancing AI Game Masters with Function Calling — https://arxiv.org/abs/2409.06949
- Jørgensen et al. 2025, Static vs. Agentic Game Master AI — https://arxiv.org/abs/2502.19519
- Microsoft 2024, The future of Planners in Semantic Kernel — https://devblogs.microsoft.com/semantic-kernel/the-future-of-planners-in-semantic-kernel/ · https://learn.microsoft.com/en-us/semantic-kernel/concepts/planning
- Anthropic 2024, Building effective agents — https://www.anthropic.com/engineering/building-effective-agents
- Anthropic 2025, Writing effective tools for agents — https://www.anthropic.com/engineering/writing-tools-for-agents
- OpenAI 2025, A practical guide to building agents — https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf (Wortlaut über https://www.maginative.com/article/how-to-build-ai-agents-a-detailed-practical-guide-from-openai/)
- OpenAI, Guardrails and human review — https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- Yao et al. 2024, τ-bench — https://arxiv.org/abs/2406.12045
- Ross et al. 2025, When2Call — https://aclanthology.org/2025.naacl-long.174/
- Zhao et al. 2026, Calibration is the Bottleneck — https://arxiv.org/abs/2609.00949
- Wang et al. 2025, Learning to Ask — https://aclanthology.org/2025.emnlp-main.1104/
- Xu et al. 2023, ReWOO — https://arxiv.org/abs/2305.18323
- Kim et al. 2024, LLMCompiler — https://arxiv.org/abs/2312.04511
- Rastogi et al. 2020, Schema-Guided Dialogue — https://cdn.aaai.org/ojs/6394/6394-13-9619-1-10-20200517.pdf
- Li et al. 2024, FnCTOD — https://arxiv.org/abs/2402.10466
- Hosseini-Asl et al. 2020, SimpleTOD — https://arxiv.org/abs/2005.00796
- Mateas & Stern 2004, Natural Language Understanding in Façade — https://eis.ucsc.edu/papers/MateasSternTIDSE04.pdf
- Inworld, Goals and Actions 2.0 — https://inworld.ai/blog/goals-and-actions-2.0
- Zhang et al. 2024, CLAMBER — https://aclanthology.org/2024.acl-long.578/
- Terrano & Bettner 2001, 1500 Archers on a 28.8 — https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires-and-beyond
- Santos Filho 2026, ESAA — https://arxiv.org/abs/2602.23193
- The Log is the Agent, 2026 — https://arxiv.org/abs/2605.21997
- Temporal, Dynamic AI agents with Temporal — https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal
- Kim & Schuster 2023, Entity Tracking in Language Models — https://aclanthology.org/2023.acl-long.213/
- Tang et al. 2026, Do Language Models Track Entities Across State Changes? — https://arxiv.org/abs/2605.30233
- Wang et al. 2024, Can Language Models Serve as Text-Based World Simulators? — https://aclanthology.org/2024.acl-short.1/
- Yu et al. 2025, RPGBench — https://arxiv.org/abs/2502.00595
- Tsai et al. 2023, Can Large Language Models Play Text Games Well? — https://arxiv.org/abs/2304.02868
- Park et al. 2023, Generative Agents — https://arxiv.org/abs/2304.03442
- Packer et al. 2023, MemGPT — https://arxiv.org/abs/2310.08560
- Bicking 2025, Hidden Door at Launch — https://ianbicking.org/blog/2025/08/hidden-door-design-review-llm-driven-game.html
- Valevski et al. 2024, GameNGen — https://arxiv.org/abs/2408.14837
- Google DeepMind 2025, Genie 3 — https://deepmind.google/models/genie/
- Geng et al. 2025, JSONSchemaBench — https://arxiv.org/abs/2501.10868
- Chavan 2026, Constrained Decoding … Semantic Gap — https://arxiv.org/abs/2609.23742
- Tam et al. 2024, Let Me Speak Freely? — https://arxiv.org/abs/2408.02442
