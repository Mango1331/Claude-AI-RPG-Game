# GPT-Gegenreview: User11 und Narrator-Trust B/C (.208)

**24.11.2026 – unabhängig anhand der veröffentlichten Berichte und Git-Diffs geprüft.** Keine selbst ausgeführten Node-, Replay-, ST- oder Provider-Tests. Keine Engineänderung.

Quellen: [Codex-Entscheidung](USER11_208_ENTSCHEIDUNG.md), [Firewallvergleich](USER11_208_FIREWALLVERGLEICH.md), [natürliche Spielqualität](user11_trust_208/NATUERLICHE_SPIELQUALITAET.md), [vierte Planner-Gegenprobe](user11_trust_208/VIERTE_OPTION.md), [Major-/Minor-Studie](CODEX_MAJOR_MINOR_USER11_208.md) und [Browserfehler](user11_trust_208/st-mock/README.md).

## Bewertung der Firewall-Experimente

**B und C sind unabhängige Änderungen auf Referenz .208** (cb1eb944); B bei 84a97c4, C bei dc72907. 20 natürliche B- und 21 natürliche C-Züge wurden situativ gespielt, die Spielabsichten vor der Antwort protokolliert, Save und Reload geprüft. Im kontrollierten Nachspiel mit identischen Eingaben und Antworten ergaben jedoch alle drei Regeln A, B und C bei 41/41 Fällen **dieselbe Welt**. Die natürlichen Serien liefern daher **keinen kausalen Beleg für einen Vorteil** der neuen Firewalls. Sie beweisen ebenso wenig, dass eine andere Erzählarchitektur insgesamt nutzlos wäre: Der Planner und Narrator hatten weiterhin die strengen bisherigen Vorgaben.

Der echte Bren-Fall zeigt einen Vorteil von B: die gewollte gemeinsame Reise mit einem verletzten NPC bewahrt am Cottage auch Personen und Versprechen. C bewahrt sie ebenfalls, nimmt in gezielten Gegenproben aber 3/5 Reisen an, die der Spieler nicht gewählt hat (keine gemessene natürliche Fehlerquote). **B und C daher vorerst nicht zum Default machen.**

**Mechanischer Grund der begrenzten Übertragbarkeit:** B prüft in bounded_arrival.js nur einen engen Einzelfall mit ansonsten leerem Plannerergebnis und einer einzigen lokalen Ankunft. Sobald wie bei Tam Warten und Arbeit bereits als Aktionen gebucht sind, greift die Ausnahme nicht. C hat in narration_evidence.js::opposesTravel eine zu grobe Prüfung für „wait here“, die später im selben Zug erklärtes Aufbrechen mit blockieren kann.

Die 26 alten Ortsablehnungen sind nicht vollständig reproduzierbar; nur acht besitzen hier ein vollständiges Originalpräfix. Sie können keine allgemeine Quote stützen.

## Planner als vierter Kandidat – ernst nehmen, nicht als erledigt ausgeben

Die wichtigsten drei Referenzfälle sind Bren (explizite begrenzte Hilfe und gemeinsames Gehen), Tam (erst warten/arbeiten, **danach** mitfahren) und Mother Wren (Reise für **heute** zusagen, aber **jetzt erst** Wegbeschreibung abwarten). Der Planner muss zeitliche Abhängigkeit und Reichweite der Zustimmung differenzieren.

Codex' lokale Gegenprobe beweist noch keinen End-to-End-Fix: Ein nachträglich eingefügtes GO verlangt bei Bren einen zusätzlichen Expected-Schlüssel, den die alte Extractorantwort nicht enthält; bei Tam beeinflusst das neue GO PULSE und die ausgewählte Extractorantwort. Deshalb nächste Experimentstufe mit zu den neuen Plannerkommandos passenden frischen Narrator-/Extractorantworten sowie vollständigem Read-back. Keine neue Reise-Parallelarchitektur und keine pauschalen Firewall-Ausnahmen.

## Major/Minor – echte UX-Entscheidung, Balance noch offen

Die kompakte Inline-Variante C des **HUD** (nicht Firewall C) ist durch den Komponententest am besten belegt: bei 360 px 491 auf 435 px für die umgekehrte Zweierkombination und eine Interaktion weniger als die ausklappbare Alternative. Das wurde nicht mit einem Menschen, Touch oder dem vollen Chatfenster geprüft. **Freigabefähig als separate UI-Erprobung**: nur relevante Minor-Optionen, „keine“ als Default, Umkehren nur bei zwei Aktionen und korrekte Reichweiten-/Kosten-/Ausweichen-Vorschau.

Zwei nicht wegzuwischende Balancebefunde: In der geprüften Szene mit drei Nahkämpfern auf SHORT siegt dauerhaftes Arcane-Wave-Kiten in 48/48 Seeds ohne Gegenschaden. Das ist ein möglicher Standardexploit, keine generelle Klassenbilanz. Blink kostet 8 MP, bringt in sechs simulierten Kampfgeometrien gegenüber dem normalen kostenlosen Schritt keinen nachgewiesenen Mehrwert. Beide Befunde erfordern eine bewusste Designentscheidung, nicht sofortige Nerfs oder neue Reaktionsmechaniken.

## Weitere Integritätsfälle und Abnahmevorbehalt

Ein vom Narrator abgehängter, aber von der Engine verfügbar gehaltener Guild-Aushang erzeugt widersprüchliche Fakten/Erinnerungen. B/C-Naturtests zeigen außerdem alte Gegenstandsreste im Inventar und doppelte NPC- bzw. Objektidentitäten. Diese Probleme werden durch das Lockern der Ortsfirewall nicht behoben und sind getrennt zu priorisieren.

B-ST-Smoke: Standard zunächst 372/373, unverändert wiederholt 373/373; Failsoft **378/379**, offener nativer Stale-Origin-Speicherfehler. Ursächlicher Bezug zu B nicht nachgewiesen (ähnlicher Befund auf .206), aber keine vollständig grüne Failsoft-Abnahme.

## Empfehlung

**A als Standard vorerst beibehalten.** Einen kleinen HUD-UX-Patch für .209 unabhängig umsetzen und nach Freigabe testen. Eine separate vierte Planner-/Reisezeitpunkt-Variante auf stabiler A-Basis erforschen; kein direkter Merge von Trust B/C. Für Kampf-Kiten und Blink vor einer Zahlenänderung zusätzliche gemischte Encounter- und Spielspaßprüfung. Der Produktbranch .200 und die Experimentbranches bleiben unverändert. Die Statusseite 03 wird wegen dieser Einzelanalyse nicht geändert.
