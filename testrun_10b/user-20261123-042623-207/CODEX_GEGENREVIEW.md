# User09 · Gegenreview der persönlichen Kampagne auf .207

**Entscheidung.** Zwei verlorene Proben kosten Alaric zusammen 22 seiner 80 HP. Beide Verluste fehlen als Änderung in der sichtbaren Systemkarte. Die zweite Probe führt zu einer gelungenen improvisierten Überquerung. Beides lässt sich getrennt verbessern beziehungsweise bewahren. Das Todesergebnis rechtfertigt keine Änderung an Schaden, Monsterwerten oder PULSE.

## Originale und Verfahren

Chat und Eventexport des Laufs 04:26 stimmen bytegenau mit beiden SHA-256 im Quellenmanifest überein. 27 Chatnachrichten nach der Metadatenzeile, 13 Spielereingaben, 25 Eventgruppen mit 235 Events. Alle exportierten Gruppen stimmen mit den Events der jeweiligen Chatnachricht überein. M bezeichnet den nullbasierten Nachrichtenindex ohne JSONL-Kopf, T die laufende Spielereingabe einschließlich der zwei lokalen Erstellungsschritte. Geprüft wurden aktive Texte, gespeichertes `display_text`, Planner-/Extractorrecords sowie Folds und lokale Nachspiele auf dem festgepinnten Code. Der PowerShell-Originalstand von User09 war für diese Nachprüfung nicht verfügbar. [Chat](originals/chat.jsonl) · [Eventexport](originals/events.json) · [Manifest](SOURCE_MANIFEST.md) · [Code .207](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine)

| Originalfall | Würfel und Buchung | Sichtbare Folge und Urteil |
|---|---|---|
| T9, Furt, M17/18 | AGI 5 gegen 10, 33,33 %, W100 61. HP 80 → 66. | Der Spieler wird gewarnt und versucht es ausdrücklich. Alaric fällt, kehrt ans Ausgangsufer zurück und behält den Stab. Die Karte zeigt CHECK/FAILURE, der Charakter-HUD den neuen Stand. Die Höhe des Verlusts ist als eigene Meldung nötig. |
| T11, morsche Brücke, M21/22 | AGI 5 gegen 6, 45,45 %, W100 70. HP 66 → 58. | Er verletzt das Schienbein, zieht sich am Geländer auf die andere Seite und läuft zum erklärten Ziel. Nach M21 ist er noch an der Brücke, nach M22 am Dungeonroot. Die Brücke ist dann tatsächlich als zerstört gespeichert. Kein übersprungener Dungeoneintritt. |
| T12/T13, Dungeon und Kampf | Eintritt in den ersten Abschnitt. Arcane Wave trifft drei Scouts, alle überleben. First Strike verbraucht Alarics Zug in Runde 1. Gegenangriffe 17, 13, 10 und in Runde 2 nochmals 19. HP 58 → 41 → 28 → 18 → 0. | Die letzte nominelle Schadenssumme übersteigt die verbleibenden HP um eins. Die Reihenfolge erklärt den vierten Treffer vor einer weiteren Spielerentscheidung. Kein nachgewiesener doppelter Gegnerzug. |

**Eigene lokale Gegenprobe.** M17, M21 und M25 jeweils bis unmittelbar vor die Originaleingabe falten, deren Engine-Record entfernen und `prepareGenerationAsync` mit der archivierten Plannerantwort bzw. dem reinen HUD ausführen. Je ein lokaler Plannerabruf an Furt/Brücke, null beim Kampf. Nach Ausklammern der Interpretationszeit stimmen die Buchungen mit dem Original überein. Die vier Zustände vor/nach den beiden Narrationen wurden separat gefaltet. Das ist ein Nachspiel der gespeicherten Eingaben, keine erneute Browser- oder Save-Abnahme. [Eingabepfad](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/v4/runtime.js)

## Unabhängiger Abgleich

- **GPT bestätigt für die Anzeige.** `harmEvents` berechnet und bucht den wirklichen Endwert. `attemptStep` reicht die Würfelzeile an die Oberfläche. `worldPanel` liest für spätere Änderungen die Antwortevents. Der Schaden liegt schon im Eingaberecord. In M18/M22 enthält der gespeicherte Systemblock die Probe, während die HP-Zahl im Charakterbereich steht. Einen tatsächlichen Screenshot oder die Lesezeit des Spielers liefert das Archiv nicht. [Hindernisse](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/v4/features.js) · [Schrittausgabe](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/v4/commands.js) · [Anzeige](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/609380b308d89d14c289e9ca1c4e26ed29174789/avereth-engine/src/display.js)
- **GPT präzisiert für die Brücke.** Der Spieler erklärte zwei Schritte. `needs:1` fand eine aufgelöste Probe, obwohl der Versuch scheiterte. Gleichzeitig wies die Engine an „He does not get past it“. Der Extractor setzte sogar `expected["2"].arrived:false`, meldete aber eine separate `arrive`-Folge zum autorisierten Ziel. Im Fold sind Ankunft und Zerstörung belegt. Das Spielerziel ist der plausible Weiterweg unter Kosten. Ein globales Umschalten von `needs` auf Erfolg würde diesen Fall verschlechtern. „Diese Art der Überquerung misslingt“ ist für ein gewöhnliches Hindernis treffender. Gesicherte Türen, unzulässige Routen und nicht erklärte Weiterreisen brauchen ihren bestehenden Schutz.
- **Weitere Beobachtungen.** T5 verwechselte der erste Planner 2 Silber mit 200 cp. Die Reparatur lieferte 20 cp. Das spricht für den bestehenden Preis- und Zustimmungsschutz. T3 dichtet „He asked once“ einen kleinen Gesprächsschritt hinzu. Dafür ist keine zusätzliche Reparaturanfrage gerechtfertigt. Von sieben PULSE-Würfen öffnete einer die Furt (50,75 %, Wurf 40,81). Die später über die Umleitung erreichte Fußbrücke ist eine eigene erzählte Gefahr. Aus zwei riskanten Wegen folgt keine belastbare Häufigkeit tödlicher Reisen. Beide HUD-Aktionen T7/T13 kamen ohne Planner aus. Der Handelsdialog wurde hier nicht als Einkaufstest benutzt. [GPT-Erstreview](REVIEW.md)

## Messung

Die gespeicherten P-/B-/X-Aufrufrecords liefern für 25 Aufrufe je Zweck, Usage und Dauer. Elf weitere Narratorgenerationen haben je einen aktiven Antworttext und eine Enginezeit. Für deren einzelne Usage-Felder bleibt die CSV leer. Die frühere Hostlog-Auswertung weist für N insgesamt 121.890 Input- und 4.477 Outputtokens aus. Zusammen ergeben sich 36 Aufrufe, 446.632 Input- und 10.075 Outputtokens. Die dort gemeldeten 36 gepufferten Antworten und null Cachetokens stammen aus der früheren Logprüfung. Aus dem Chat unabhängig summiert wurden P 10 (125.112/723), B 1 (2.524/1.117) und X 14 (197.106/3.758). [Einzelrekonstruktion](CODEX_AUFRUFREKONSTRUKTION.csv) · [Archivierte Logaggregate](MESSWERTE_USER09_207.json)

Zeiten in Sekunden. P steht für Planner, B für Board, N für Narrator und X für Extractor. Stern bedeutet Reparatur. Host reicht von ST-Generierungsbeginn bis Narratorende und enthält P/B/N. Host + X ist eine Untergrenze bis zur sicheren Folgeeingabe.

| T | Abfolge | P | B | N | X | Host | Host + X |
|---:|---|---:|---:|---:|---:|---:|---:|
| 3 | P,N,X | 50,094 | 0,000 | 31,841 | 16,198 | 82,137 | 98,335 |
| 4 | P,N,X,X* | 3,982 | 0,000 | 17,573 | 24,508 | 21,740 | 46,248 |
| 5 | P,P*,N,X | 11,898 | 0,000 | 22,564 | 6,285 | 34,655 | 40,940 |
| 6 | P,B,N,X | 6,675 | 61,000 | 24,405 | 4,205 | 92,318 | 96,523 |
| 7 | N,X,X* | 0,000 | 0,000 | 20,477 | 25,719 | 20,731 | 46,450 |
| 8 | P,N,X | 4,504 | 0,000 | 26,163 | 45,767 | 30,886 | 76,653 |
| 9 | P,N,X | 6,842 | 0,000 | 23,984 | 6,933 | 31,054 | 37,987 |
| 10 | P,N,X | 10,494 | 0,000 | 25,559 | 12,614 | 36,275 | 48,889 |
| 11 | P,N,X,X* | 7,631 | 0,000 | 29,744 | 36,410 | 37,610 | 74,020 |
| 12 | P,N,X | 4,839 | 0,000 | 27,891 | 37,757 | 32,973 | 70,730 |
| 13 | N,X | 0,000 | 0,000 | 20,718 | 29,547 | 21,041 | 50,588 |

Summe der elf Untergrenzen **687,363 s**, Mittel **62,488 s**, Median **50,588 s**. P-Repair T5 kostet 5,270 s, X-Repairs T4/T7/T11 kosten 10,604/10,282/14,880 s. Der teuerste Zug T3 braucht allein 50,094 s im Planner ohne Repair. Der gültige Board-Erstentwurf T6 kostet 61,000 s. Eine neue Schadenszeile verspricht Lesbarkeit, keine Modellzeitersparnis. Es fehlen Browserzeitpunkte für erste lesbare Prosa und bestätigte nächste Eingabe nach Read-back. Die anders zusammengesetzten Läufe User08 und User10 sind keine A/B-Kontrollen.

**Empfehlung.** Anzeige und widersprüchlichen Hinderniswortlaut im ersten Paket gemeinsam prüfen. PULSE-Rate, Schadentabelle, Dungeongebühren und Kampfwerte beibehalten. [Gemeinsamer Fachplan .208](../../patch_plans_10b/FACHPLAN_208_TAGESBOARD_UND_KAMPFAKTIONEN.md)
