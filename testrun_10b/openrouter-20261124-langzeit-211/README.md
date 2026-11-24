# Natürliche Langzeitprüfung · Halloran und Alderwatch

Vier unabhängig fortgesetzte Spielverläufe in echten SillyTavern-1.19.0-Hosts. Halloran beginnt in beiden Versionen mit demselben Hofgespräch, Alderwatch mit derselben frisch registrierten Figur. Der Testspieler traf seine nächste Entscheidung anhand des angezeigten Textes und HUDs. Die beiden Ortsnamen bezeichnen jeweils zwei Geschichten mit gemeinsamem Ausgang, deren spätere Eingaben, NPCs und Wege auseinanderlaufen. [Fachbericht und Entscheidung](../../recherche/AVERETH_211_NATUERLICHER_LANGZEITVERGLEICH.md) · [Geprüfte Startgleichheit](startgleichheit.json) · [Reproduktionsanleitung](../../recherche/langzeittest_211/REPRODUKTION.md)

| Kampagne | Eingaben / vollständig nach Reload / davon mit angewandter Narration | Ende |
|---|---:|---|
| [PA · Halloran .210](halloran-210/) | 31 / 30 / 30 | Tam erholt sich, Sorrel kehrt zur Witwe zurück. Nach der Weiterempfehlung auf Green Street weist Wafer die Extractor-Reparatur zu Eingabe 31 ab. Die Teilgeschichte ist separat archiviert. |
| [HB · Halloran .211](halloran-211/) | 31 / 30 / 30 | Nach dem Besuch der Hebamme hilft Alaric am Ford und überbringt Tomens Entschuldigung. Eingabe 31 erreicht wegen der globalen Sperre keinen physischen Provider. |
| [GA · Alderwatch .210](alderwatch-210/) | 33 / 33 / 32 | Die Gilde quittiert Harl als Empfänger des Berichts. Alaric schildert seinen letzten persönlichen Kontakt mit Serra, der freiwillig abgebrochene Räumungsauftrag bleibt offen. |
| [GB · Alderwatch .211](alderwatch-211/) | 32 / 32 / 30 | Nach Kampf, Behandlung, Übernachtung und Wiedersehen mit Dellan trägt die Gilde die Teilbeobachtung ein. Der Spieler beansprucht weder Clearance noch Belohnung. |

Alle vier Bögen überschreiten im Weltzeitstand Mitternacht. Die festen Besitztümer, die vor dem Start bestehenden Questzustände sowie die volle Vorgeschichte sind Teil der Startchats. Der letzte **bestätigte** Chat steht unter `original-chat.jsonl.gz`. Unterbrochene spätere Zustände stehen zusätzlich unter `interrupted-*`. Zu jedem Host gehören die vollständigen physischen Requestbodies, Rohantworten, Usage, ST-Zeitlog, Entscheidungen vor der Narration, sichtbarer DOM-Text und HUD, Reloadzustände und lokale SHA-256-Manifeste. Bei Edit/Regenerate bewahren separate Chats auch Antworten, die im endgültigen Verlauf nicht mehr aktiv sind.

| Separater Versuch | Gegenstand |
|---|---|
| [Vorprüfung](vorpruefung/) und [Relace-Pilot](pilot-relace/) | Zwei beantwortete Verbindungsprüfungen je Route. Nur Wafer wurde für die vier Hauptkampagnen verwendet. Zwei vollständig gelesene HTTP-Zurückweisungen haben keine bestätigte Kostenangabe. |
| [Tor .211](tor-211/) und [Tor mit Formatänderung](tor-vertrag/) | Identischer Save und Spielertext wie PA3. Ein gescheiterter Weltabschluss bleibt als Fehler erhalten. |
| [Reiseformat am Hof](vertrag-hof/) | Elf bestätigte Folgeturns zur geänderten Planneranweisung. |
| [Versorgungssack auf .210](sack-210/) | Drei bestätigte neue Züge ab HB5. Der erste ist direkt mit HB6 und YB1 vergleichbar. |
| [Ölzeug](anzeige-furt/) und [Gildenurkunde](anzeige-urkunde/) | Acht und neun bestätigte Spielzüge auf dem unabhängigen Besitzkandidaten. |
| [Revision .210](revision-210/) und [Revision .211](revision-211/) | Je fünf native Revisionsoperationen und ein natürlicher Folgeturn am gleichen Halloran-Ausgangspunkt. |
| [Laufende Extraktion](revision-laufender-extractor/) | Zwei Revisionsoperationen in einer echten .211-Szene, einschließlich DOM-Prüfung während der physischen Extraktion. |
| [Zahlung und Rast](revision-zahlung-211/) | Separater .211-Klon der tatsächlich bezahlten Übernachtung aus GB26. |
| [Empfänger](empfaenger-teilvergleich/) und [Leihschlüssel](schluessel-teilvergleich/) | Je vier echte einzelne Extractorantworten in AB/BA-Reihenfolge. Die Gegenprüfung mit dem Parser, der Weltstufe und den verworfenen Katalogänderungen ist lokal. |

Die für jede relevante Diagnose nötigen Eingaben, Weltausschnitte und Vergleiche sind im [Szenenbericht](../../recherche/langzeittest_211/BEOBACHTUNGEN.md) referenziert. Die [Zugmessungen](messvergleich.json), [identischen Eingaben](gleiche-eingaben.json) und das [globale Kostenjournal in Zahlen](budget.json) lassen sich aus den Originalarchiven nachrechnen.
