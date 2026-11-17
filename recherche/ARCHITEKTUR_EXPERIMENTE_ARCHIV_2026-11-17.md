# Archivierte Architekturversuche – B/C1 und dynamische GM-Alpha

**Stand: 17.11.2026 · HISTORISCHE QUELLEN, NICHT MEHR GEPLANTER PRODUKTWEG.** Die alten Experimente und ihre Berichte bleiben auf GitHub zugänglich. Ihre technischen Erkenntnisse dürfen für die Weiterentwicklung von Build `.200` verwendet werden; ihre Architektur wird **nicht automatisch übernommen**. [Neues Zielbild](../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) · [Laufender Projektstatus](../03_AKTUELLER_PROJEKTSTAND.md).

## Versuch 1: Hybrid B / gemeinsame Narration und Weltentwurf C1

**Code/Quellen:** [Vergleichsbericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/experiment/dynamic-gm-model/recherche/ARCHITEKTUR_PROTOTYP_B_C1_VERGLEICH_2026-11-16.md), [Versuchscommit `80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c) und [Experimentskripte](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model/experiments/architecture201).

- **Positiv:** Bericht meldet 61/61 technische Prototyptests und 47/47 ausgewählte Engineprüfungen. Requeststeuerung, Journal-/Checkpointideen, idempotente Ausführung und Speichern vor Veröffentlichen ließen sich kontrolliert demonstrieren.
- **Offen/negativ:** C1 hatte belegte semantische Gegenfälle. Die erfolgreichen Weltentwürfe waren überwiegend aus bekannten Daten abgeleitet, nicht als natürliche kreative Modellleistung bewiesen. Keine Produktfreigabe.
- **Grundanlass für die Archivierung:** Der Ansatz optimierte vor allem Vermittlung/Sicherheit **bei weitgehend erhaltener Prüfstrenge**. Das traf das nun explizit geklärte Nutzerziel – die bestehende `.200` soll weniger bürokratisch sein – nicht ausreichend.
- **Weiter nützlich:** robuste Providerleases, Transaktions-/Persistenzgrenzen, Recovery-Semantik, auf identischen Fixtures messbarer Prompt-/Requestaufwand.

## Versuch 2: Dynamischer GM (Alpha 1/2 und Kurskorrektur)

**Code/Quellen:** [Experimentbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model), [Kurskorrektur `d8baa91`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d8baa91ffa595ecf6076266ceed9e04ef164778e), [unabhängige Neubewertung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/experiment/dynamic-gm-model/experiments/dynamic-gm/NEUBEWERTUNG_KURSKORREKTUR_NACH_ALPHA2_2026-11-16.md), [Mock-Abnahmebericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/experiment/dynamic-gm-model/experiments/dynamic-gm/KURSKORREKTUR_SPIELBOGEN_2026-11-16.md).

- **Ursprünglicher natürlicher Gildenfehler:** Das Modell erhielt einen irreführenden Werkzeugvertrag, schlug `go.to:{ref:"loc.alderwatch.guild_hall"}` statt einer zulässigen direkten Referenz vor. Die Engine wies das ab; Wiederaufnahme ohne wirksame fachliche Reparatur blieb hängen. Zusätzlich fehlten bekannte Kontextprojektionen und bewährte UI-/Recoveryfunktionen.
- **Technische Nachbesserung:** Der Bericht nach `d8baa91` nennt 57/57 Node-Tests, funktionierende ST-Host-/Mockproben und acht zusammenhängende, vorwiegend **synthetische** Spielzüge. Das bewies **nicht** natürliche GM-Kompetenz oder die Vollständigkeit des alten Produkts.
- **Erneuter persönlicher natürlicher Test, 17.11.2026:** GLM verstand den Gilden-GO korrekt. Die zweite API-Antwort erzählte plausibel Ankunft, Gildenhalle, neuen Angestellten und Dialog. Der Adapter lehnte jedoch `speech speaker not present` ab, obwohl der Sprecher im selben Vorschlag neu eingeführt werden sollte. Der dritte API-Request korrigierte die Darstellung, ein weiterer Format-/Referenzkonflikt verhinderte erneut den Weltabschluss. **Drei physische Modellrequests, 34.815 Input- und 1.146 Outputtokens, keine veröffentlichte Geschichte.** Die Original-ST-Logs stammen aus einem persönlichen Test und sind nicht öffentlich im Repository gespeichert.
- **Fachliche Konsequenz:** Den neuen Host-/Tool-Adapter und seine verlorene Bedienung nicht durch immer neue Spezialfixes zur neuen Produktbasis machen. Die vorhandene `.200` und ihre bereits produktiven Combat-, Progressions-, NPC-, Quest- und UI-Funktionen bleiben der Ausgangspunkt.
- **Weiter nützlich:** getrennte Request-Receipts und fachliche Abschlüsse, exakter Modell-/ST-Payload, Kapazitäts-/Timeoutschutz, dauerhafte Checkpoints, idempotentes Worldcommit, Schemafaktorisierung, Kontextprojektionen und der Nachweis, dass Mocktests keine natürliche Spielfähigkeit belegen.

## Alte Analysen: Erkenntnisse behalten, frühere Richtung nicht

Auf `main` erhalten bleiben:
- [Architekturaudit, technische Ursachen des `.200`-Wald-Fehllaufs und Vergleich B](ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md)
- [LLM-Spielleiter-Neubewertung und damalige Empfehlung für dynamischen GM](ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md)

Beide Berichte sind **historische Meinungen mit prüfbaren Quellen**, keine automatisch gültige neue Roadmap. Aus den zwei Prototypen folgt **nicht**, dass der bestehende Planner/Extractor immer nötig oder immer unnötig ist. Aus ihnen folgt auch nicht, dass alle alten strengen Guards erhalten bleiben sollten.

## Aktueller Beschluss / praktische Hinweise

- **Produktreferenz:** `.200` auf `claude/c-planner-prototype-2026-10-02-gpt-c666`, Commit [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b).
- **Aktiv:** finale Astra-Ultra-Analyse zur **vereinfachten, toleranteren bestehenden Engine**, danach GPT-Gegenreview und gemeinsame Nutzerentscheidung ([08](../08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md)).
- **Archiviert, nicht zu mergen:** Hybrid B/C1 und dynamische GM Alpha samt Berichten, Originalbelegen, Branch und Code. **Kein Archiv-Branch wird bei dieser Dokumentationspflege gelöscht.**
- **Ziel:** weniger sinnlose Reparaturrequests; spielergesteuerte HUD-/Bestätigungsoptionen, freieres Narratorverhalten und robuste Speicherung. Mechanischer Tod, HP/XP, doppelte Zahlungen, PC-Autorität und Swipe-/Reload-Korrektheit bleiben erkennbar risikobehaftete Bereiche, nicht automatische freie Buchungen.
