# Avereth Engine – GPT-Gegenreview der überarbeiteten Fachpläne A, B und C

**14.11.2026 – unabhängige Fach- und Codeprüfung.** Basis sind die vier Dokumente nach Opus' Selbstprüfung edf16c7 auf main sowie Produktcode .189 (4438241). Geprüft: vollständige Grundanalyse, Fachpläne A/B/C, Dokumentdiff und tatsächliche Orts-/Bewegungsstellen in catalog.js, place_refs.js, planner.js, extract.js, commands.js, world.js, dungeon.js, living.js, host.js und domain.js. Die von Opus berichteten natürlichen und Replay-Messungen wurden **nicht** unabhängig erneut ausgeführt.

**Gesamturteil:** Die fachliche Basis ist deutlich verbessert und stützt einen gezielten Umbau. **A2 gemeinsamer Orts-/Bewegungsvertrag grundsätzlich GO; B1 vereinheitlichte Dungeonprüfung und N2 sichtbare Fehlermeldung sinnvoll.** A4, B6, C3-a und der Ersatz von within sind jedoch noch nicht als unbedenkliche Implementierungsverträge freigabefähig. Keine Produkt- oder Kanonänderung durch diesen Review.

## 1. Was Opus bei der Selbstprüfung richtig nachgebessert hat

- Die großzügige Ortsnamenregel „enthält“ führte laut der an 65 natürlichen neuen GO-Formulierungen ausgeführten Probe zu vier falschen unter fünf eindeutigen Zuordnungen. Die enge Präfix-/Siedlungsregel ist wesentlich sicherer; der dokumentierte Effekt ist **nur ein** echter passender Fall. Kein Allheilmittel gegen NPC-/Ortsduplikate.
- Die Bewegungsstatistik ist jetzt 76 bekannte GO-Ziele + 52 neue GO-Ziele + 7 within + 9 Reise-Fortsetzungen = 144 autorisierte Bewegungen. Die 39 Prozent neuen Ziele beziehen sich auf 52 von 135 GOs, nicht auf alle Bewegungen. Der Nenner der separaten **65** Resolverproben sollte im Fachplan explizit definiert werden.
- Der alte Code bucht move als gültigen Distanzschritt auch **vor** dem Kampf; Opus hat diese wichtige Positivklasse wiederhergestellt.
- plan.notes stammt aus der Engine, nicht aus dem Planner-Modell: Ein vorgeschlagener, nicht ausgeführter Aufbruch wäre daher eine echte neue Planner-Form, nicht die Nutzung eines bestehenden Feldes.
- Das sichtbare menschliche Spielerpanel filtert in host.js tatsächlich ENGINE REFUSED heraus. Ein klarer NOT ARRIVED-Hinweis hat unmittelbaren praktischen Nutzen.
- Die bisherige freie Treppe nach unten und das offene Ende der Dungeon-Spur werden mit D1c/D1d jetzt ehrlich als mögliche **Spielregeländerungen** gekennzeichnet.
- Die 13 noch vorhandenen V3-/Ruleset-1-Testdateien zu alten Pfaden dürfen bei einer späteren Bereinigung nicht pauschal als wertlos entfernt werden; einige können weiterhin geteilte Sicherheitsmechanik prüfen.

## 2. Fachplan A: gemeinsames Ortsbuch und kleiner Bewegungsnachweis

**Grundrichtung GO.** Die Eventlog-Ortsdatenbank bleibt autoritativ, der werbende Katalog ist nicht länger die Gültigkeitsgrenze. Ein Resolver gibt existing / ambiguous / new / invalid zurück; der vorhandene GO-Autoritätsrecord wird zum kleinen, gemeinsam verwendeten Vertrag. A3 (vollständiger Plan) wäre eine zweite Reiseengine ohne belegten Zusatznutzen; A5 (pauschale Vorabankunft) bleibt aus gutem Grund verworfen.

**A-Sicherheitslücke 1: Scope ist noch kein Reiseziel.** A2 erlaubt im Wortlaut einen neuen Ort, wenn er innerhalb des Zielumfangs liegt. Bei einem breiten Siedlungs-/Reichsscope könnte das Modell damit einen anderen als den gewählten Ort innerhalb desselben Umfangs als erreicht behaupten. Der kleine Bewegungsnachweis muss auch **Spielerintention, tatsächlich erlaubte Wegetappe, Hindernisse und belegte erzählte Ankunft** binden. Keine zweite Topologieprüfung behalten, aber die bisherige Schutzfunktion im einen Pfad nachweisen.

**A-Sicherheitslücke 2: Ankunft und geplanter Weg bleiben getrennt.** A4 entfernt später das arrive-Delta zugunsten einer expected-Schrittantwort mit Position. Auch die Position ist vom Modell gemeldet, kein objektiver Nachweis. Ein arrived:true ohne im Text stattfindende Ankunft, falsche seq-Folge oder eine aus unerreichtem Ort abgeleitete Aussage darf nicht kanonisch werden. Vor Entfernen des Doppelbelegs den tatsächlichen Prosa-/Chronologiebeleg am Original prüfen; die frühere O1-Absicherung für nicht erreichte Szenen bleibt.

**A-Kontinuität:** knownAt darf bekannte Figuren in **Kindräumen** benennen, sie aber nicht am Elternort als physisch anwesend oder interaktionsbereit verbuchen. Eine NPC-Identität wird nicht allein aus ähnlichem Namen zusammengelegt.

**Zwei problematische Positivfälle:** Der Name „Grotto mouth“ darf an das Dungeon-Gate gebunden werden, aber eine Gate-Ankunft ist **nicht automatisch** eine bereits erfolgte Einreise in den ersten Innenraum. Ein als interior gemeldetes Wachhaus mit unzulässigem offenen-Reich-Elternort darf nicht bloß für einen grünen Test heimlich in eine site verwandelt werden. Beide Fälle benötigen eindeutigen Ziel- und Elternbeleg oder sichere Klärung.

**Freigabe:** A1/A2 für spezifizierten Vertrag und Schattenmodus. A4 erst nach eigenem Sicherheits-/Wirkungsbeleg. Beim Altpfadabbau alle betroffenen Tests einzeln klassifizieren: portieren, historisch behalten oder mit begründeter Nicht-Erreichbarkeit entfernen.

## 3. Fachplan B: ein Dungeonmodell, aber noch kein B6-Automatismus

**Starker Kernbefund:** Der narrator-gebundene Raumgraph und die Engine-Pace-/Slotspur treffen derzeit unvereinbare Entscheidungen. B1 als gemeinsam gültige Topologie kann die belegten Mage-Fehler schon bei begrenztem Risiko adressieren.

**B6 vs. B5 bleibt eine echte Spielqualitätsentscheidung.** B6 erzeugt einen Hauptgang mit Seitenkammern als Baum: keine Schleifen, keine alternativen Routen und keine unvorbereiteten Geheimgänge mehr. Die Treppe auf unversiegelten Ebenen ist nun nicht mehr jederzeit verfügbar; nach der Hauptspur folgen nur noch 1–2 ruhige Teile. Das ist weniger frei als bisher. B5 (nur Spur, ohne Graph) ist eine ernsthaft einfachere Nullhypothese und nicht nur eine Unterversion von B6. Die Seitenkammer-Chance (25–35 Prozent), ein Drittel verborgen, Treppenlage im mittleren Drittel sowie 1–2 Zusatzteile sind **nicht gemessene Designwerte**. Bitte vor ihrer Einführung eigenständig entscheiden, ob ihre Spielqualität den zusätzlichem Graphzustand rechtfertigt.

**Ungeklärter Erzeugungszeitpunkt:** B §5.2 erzeugt bei GO „weiter“ den neuen Raum, Link, Slot und Seitenraum **vor der Narration**, während die Ankunft erst nach der Narration bestätigt wird. Nach Abbruch, Unterbrechung oder fehlgeschlagener Extraktion kann also ein erzeugter, nie besuchter Raum bestehen bleiben. Zwei saubere Konzepte sind möglich: deterministischer Vorschau-/Reservierungsrecord und Weltanlegung erst nach bestätigter Ankunft; oder bewusst vorab persistierter **unbesuchter** Raum mit eindeutiger Sichtbarkeits- und Resetregel. Die Aussage „erst beim Betreten erzeugt“ trifft auf den beschriebenen GO-Handler sonst nicht zu. dungeon.part/Slotmaterialisierung müssen an tatsächliches Erreichen gebunden bleiben.

**Ungeklärte Benennung:** Im Produkt-Extractorvertrag content/deltas.json ist **kein Typ place.named** definiert; es gibt person.named, place.reported und passage. Das Event place.updated existiert in domain.js und könnte eine verifizierte Namensänderung speichern. Dazu aber braucht es einen exakt definierten neuen oder geänderten Extractor-Vertrag: Erster Beleg, feste ID, spätere Umbenennung, Swipe, aktuelle NPC-/Ortsreferenzen. „Kein neues Eventformat“ ist möglich, „keine Vertragsänderung“ nicht.

**Spieländerung bei normalen Höhlen/Gebäuden:** Das Streichen der Raum-für-Raum-Navigation außerhalb echter Living Dungeons entfernt nicht nur fehleranfällige Wegchecks; damit verschwinden auch reale alternative Türen, Schlösser und räumliche Zugangsunterschiede in Nicht-Dungeons. Es verlangt eine bewusste **D1b-Designentscheidung**, auch wenn der ursprüngliche Rogue-Pseudodungeon ein Fehler war. Eine verschlossene Hinterkammer muss weiterhin mechanisch vor unautorisiertem Betreten geschützt bleiben.

**Migration:** „Der am weitesten erreichte Raum ist der letzte Hauptgangteil; andere sind Seitenräume“ lässt sich nicht ohne weiteres aus einem historisch gewachsenen Raumgraphen beweisen. Vor der Migration echte Links, einseitige Wege, Raum-/Objekt-/NPC-Orte und alte Begegnungs-Slots kontrollieren. Ggf. Bestandskampagnen vorerst über alten Graphpfad fertig spielen lassen; kein stilles Neuinterpretieren ihrer Welt.

## 4. Fachplan C: hoher Sofortnutzen, C3-a zu weit formuliert

**GO für N2**, weil ein Spieler einen falschen erzählten Ortswechsel bislang nicht sieht. **N1 frühe WHERE/TRAVEL/NOT HERE-Karte** und **N4 Markierung des alten falschen Narratortexts im *Prompt* statt im gespeicherten Chat** sind als begrenzte Experimente vernünftig. host.js projectPromptHistory arbeitet bereits auf einer Promptprojektion; nur korrekt aus abgelehnten Ankünften gewonnene Markierungen verwenden. Menschliche Spieler und autonome Runner müssen dieselbe wesentliche Wahrheit erfahren.

**C3-a ist ohne zusätzliche Bedingung nicht sicher.** Die aktuelle Form erlaubt ein arrive **ohne GO**, wenn es räumlich im selben complexOf liegt, kein Kampf/Stealth läuft und kein gesperrter Weg bekannt ist. Das beantwortet **nicht**, ob der Spieler den Nebenraum betreten wollte. Der Erzähler könnte den Spieler nach einer bloßen Brotbestellung hinter den Tresen setzen; geografische Nähe autorisiert keine freiwillige Bewegung. Nach dem geplanten B5-Verzicht fehlen zudem teils mechanische Wegdaten zur Prüfung des Zugangs. C3-a benötigt den **belegten unmittelbaren Bezug zur gewählten Spielerhandlung** plus gültigen Zugang und die strenge Unterscheidung privater Zimmer, Lager, verschlossener Nebenräume und frei gewählter Teilbewegung. **D3 ist eine Designfrage, nicht automatisch ein Schritt ohne neue Spielregel.**

**C4-Feld within:** In commands.js verlangt within ein aktives Populationshabitat als Vorfahren und stellt klar, dass das neue Teilgebiet **keine unabhängige Population** erzeugt. Das ist relevant für Jagdcredit und Abstammung. Die Syntax darf entfallen, aber diese **fachliche Unterscheidung** muss im neuen Orts-/GO-Vertrag nachweislich wieder auftauchen. Ein pauschaler Scope allein genügt nicht immer, um unabhängige Stätten von Unterhabitaten zu trennen.

**Move-Reparatur:** Die Beibehaltung lokaler Bandschritte vor einem Kampf ist richtig. Ein völlig wirkungsloser move darf optional eine **einmalige begrenzte Planner-Reparatur** auslösen; Mehrfachbefehle dürfen dadurch nicht teilausgeführt, doppelt gebucht oder still zu einer anderen Reiseintention umgedeutet werden. Modellkosten und Erfolgsquote messen.

**C1-b vorgeschlagene Reise:** Neues proposed-Plannertype ist eine echte Schema-/Prompt-Erweiterung. Nach Opus' Daten seltene Auslöser; als Möglichkeit testen, nicht ohne Wirkungsmessung dauerhaft neue Vertragskomplexität hinzufügen. Eine Frage bleibt eine Frage.

## 5. Gesamtintegration und Umsetzungsfreigabe

Die Pläne sind **konzeptionell kombinierbar**, aber noch nicht vollständig semantisch geschlossen. Die eine Engine-Orts- und Bewegungsautorität muss für geplante Bewegungen tatsächlich alle Schutzfunktionen der entfernten Pfade übernehmen. Die Kaskade, die Inhalte unerreichter Szenen verwirft, bleibt aus gutem Grund.

**Fehler in der Klassifizierung „Schritte 1–7 ohne neue Spielregel“:** Schritt 4 B5-Verzicht ändert die Raum-Navigation außerhalb echter Dungeons; Schritt 7 C3-a erlaubt neue freiwillige Teilbewegung ohne GO. Beide brauchen explizite Designfreigabe. Die C1-b-Plannertype und die within-Ablösung sind zumindest neue Fach-/Vertragsregeln. Die Pläne nennen einzelne Bestätigungen selbst, dürfen aber im Abschluss nicht pauschal von designneutralen Schritten sprechen.

**Zahlen:** Die geschätzte Nettozeilenrechnung 400–650 entfallend minus 200–340 neu ergibt insgesamt eine **Bandbreite von 60–450**, nicht garantierte 200–300. ±2 Prozent Tokens und reduzierte Latenz sind ohne Implementierung unbestätigt. Die zusätzlichen 65 Resolverproben und die 52 autorisierten neuen GO-Ziele sollten mit explizitem Nenner getrennt beschrieben werden, ehe aus ihnen eine allgemeine Trefferquote abgeleitet wird.

**Empfohlene Etappen:** (1) Messwerkzeug und sichtbar lokaler Fehlerhinweis N2; (2) einheitliches Ortsbuch mit sicheren Sichten und scharfem Resolver; (3) kleiner A2-Bewegungsnachweis im Schattenmodus, danach echte Ablösung der redundanten Prüfungen; (4) B1 auf derselben Topologie und N1/N4 als Modellprobe; (5) gesonderte Designentscheidung B5 versus B6 mit geklärtem Raum-Erzeugungs-/Benennungsvertrag sowie D1a/D1b/D1c/D1d; (6) A4 nur nach eigener Ankunftsevidenzprüfung, C3-a nur nach belegtem Handlungsbezug, within-Ersatz nur mit Habitatintegrität. Kein generelles Vorabbuchen aller Reisen und keine unbeschränkte automatische Neuerzeugung.

**Urteil:** Der Umbau lohnt sich wahrscheinlich zur Beseitigung der mehrfachen Ortsentscheidungen und dauerhaften Drift, **nicht aufgrund einer bereits bewiesenen Tokenersparnis**. Der größte Mehrwert von A2 ist **weniger widersprüchliche Autorität**. B6 darf eine bewusste spielerische Entscheidung bleiben, statt als vermeintlich einzig logischer technischer Schluss aus den Mage-Dungeonfehlern vorausgesetzt zu werden.

**Keine Produkt-, Runner-, Test- oder Kanonänderung durch diesen Gegenreview.**
