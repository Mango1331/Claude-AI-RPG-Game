# User07 .204 – Nutzerfeedback / Präferenzen (ohne Technikdiagnose)

**21.11.2026 · vom Nutzer während und nach dem Spielen im Chat erläutert.** Hier steht die Sicht des Spielers, nicht der Beweis für eine technische Ursache.

## Direkte Spielerwahrnehmung

- Der Nutzer zählt „Nachrichten“ als **Erzählantworten**, nicht als sofortige Enginekarten, System- oder HUD-Meldungen. Das war eine ausdrücklich korrigierte Fehlinterpretation einer früheren GPT-Antwort.
- **Turn 5 / Zahlung und Gildenregistrierung:** Die letzte Geschichte lud außergewöhnlich lange (gefühlt ungefähr vier Minuten). Der Nutzer kann bis zum Ende der Verarbeitung keinen neuen Zug eingeben. Einschalten von Streaming alleine löst dieses Problem für ihn nicht.
- **Turn 6 / Questboard:** Die nächste Erzählantwort war ebenfalls relativ langsam, jedoch gefühlt etwas kürzer als Turn 5. Der Erzähler schrieb alle Questangebote zusätzlich zu den bereits von der Engine sichtbaren Boardkarten.
- **Wertung der Board-Dopplung (wichtige spätere Präzisierung):** Nicht schlimm, **solange sie nicht relevant Zeit kostet**. Die Engine hat ohnehin die Daten; ein pauschales Verbot für jede Nacherzählung oder Doppelanzeige wäre ohne nachgewiesenen Nutzen kein wichtiges Ziel.
- **Registrierungsroutine / Ortsbewegung:** Der Nutzer hat die Registrierung bewusst abgeschlossen, indem er Gebühr und Angaben übermittelt hat. Für die kurze narrativ geschilderte Messung innerhalb der Gildenhalle soll **kein unnötiger neuer persistenter Unterraum** nötig sein. Der kanonische Ort darf einfach **Gildenhalle** bleiben. Die Engine soll sich nicht an solchen Routinehandlungen festbeißen, aber bedeutsame Orts-/Kampf-/Spielerentscheidungen weiterhin korrekt absichern.
- **Character Description:** Der Nutzer fragte, warum das Beispiel zur Gildenregistrierung in einem prompt liegt, der wiederholt gesendet wird, und befürchtete eine hardcodierte Registrierung. Nach Erklärung: Das **Beispiel als Veranschaulichung der allgemeinen Regel ist nicht falsch**; er möchte es nicht pauschal streichen, wenn eine Einsparung nur marginal wäre.
- **Allgemeine Priorität:** Lange Wartezeit und unnatürliche technische Reibung beheben, **ohne** spielerische Freiheit/Qualität oder Kontinuität zu verlieren. Keine erneute Mikrooptimierung nur für ein paar Tokens; keine voreilige Implementierung vor gemeinsamem Verständnis.

## Wichtige Präzisierung zum Wortlaut

Die Archivnachricht in Turn 5 lautet wörtlich: `*i pay the 2 silver and say* Alaric Red as the name im 18 and a Mage and i have not been assessed yet`. Der Nutzer beschreibt diese Handlung im Gespräch sinngemäß als **„finish my registration“**; diese Worte stehen **nicht wörtlich** in der gespeicherten Spielereingabe. Codex soll Intent und Buchung aus den echten Quellen prüfen, nicht eine erfundene Textvariante testen.

## Feedback-Status

Das sind **erste spontane Eindrücke eines begonnenen persönlichen Runs**, nicht der Abschluss eines umfangreichen User-Tests. Individuelle Spielgefühl-Wertung des Nutzers nicht mit Codex-Spielerfeedback aus der 41-Züge-Kampagne in Glassmere vermischen.

## Nachträgliche Präzisierung zur Questboard-Philosophie (21.11.2026)

Nach dem Codex-Gegenreview stellte der Nutzer ausdrücklich folgende **neue Designpräferenz** zur Diskussion: Die Adventurers' Guild soll **nicht zwingend immer einen einfachen Level-1-Questauftrag** anbieten müssen. Es darf vorkommen, dass alle Aufträge eines F-/Novice-Boards für den aktuellen Spieler zu schwierig sind. Dieser entscheidet dann selbst, ob er eine Gefahr eingeht, außerhalb der Gilde jagt bzw. Erfahrungen sammelt oder **erst am nächsten Tag** erneut das Board liest. Ziel ist eine eigenständig wirkende Welt und weniger ganze Modell-Reparaturen wegen starrer, nicht mechanisch erforderlicher Verteilungsvorgaben.

Der Nutzer nannte umgangssprachlich F „Level 1 bis 15“; laut gültigem Code umfasst **Novice/F Level 1–14**, **Proven/E beginnt Level 15**. Es ist keine Änderung dieser Grenze gewünscht.

**Wichtige Grenze des Spielerwunsches:** Technisch ungültige, nicht erfüllbare oder nicht korrekt verbuchbare Quests sollen **nicht** akzeptiert werden. Nicht alle Engine-Sicherungen lockern, sondern unnötige Designquoten hinterfragen. Auch die feste 4+1-Zusammensetzung kann später diskutiert werden, ist noch nicht als aufgehoben beschlossen. Die doppelte Questboard-Erzählung und das kleine Registrierungsbeispiel in der Character Description bleiben aus Nutzersicht unkritisch, solange sie keinen relevanten Zeit-/Qualitätsverlust verursachen.

[Abgewogener GPT-Nachtrag mit technischer Trennung und späteren Testkriterien](REVIEW_GPT_NACHTRAG_2026-11-21.md).
