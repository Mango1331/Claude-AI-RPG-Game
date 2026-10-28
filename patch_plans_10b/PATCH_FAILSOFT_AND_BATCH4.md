# Fachplan: sichere Fortsetzung und Batch-4-Ursachen

**Stand: 28.10.2026. Analyse und Umsetzungsspezifikation. **Schritt 1 ist als .105 implementiert und technisch abgenommen; Schritt 2 bleibt offen.**** Basis: Produkt `.104`, `b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016`. Zwei Umsetzungsschritte innerhalb eines Fachvorhabens; kein neues NPC-, Quest-, Transaktions- oder Recovery-Framework. Combat Main/Minor bleibt ein separater Patch.

Umsetzungsnachweis: [Teil 1 / .105](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f44bebc2bf4a1245a2c8c4e8140e7a86f0b7a420/avereth-engine/docs/PATCH_FAILSOFT_CONTINUATION.md) — 2078/2078 Node, echter ST-Mock-Smoke Standard 22/22 und erweitert 27/27. Noch kein natürlicher .105-Lauf. Die folgenden Ursachen-/Planungsabschnitte dokumentieren die Grundlage auf .104.

Quellen: [Batch-4-Originalprüfung](../testrun_10b/batch-20261028-022553Z/SOL_COUNTERREVIEW.md), [GPT-Review](../testrun_10b/batch-20261028-022553Z/REVIEW.md), Nutzerfeedback `Chatgpt Feedback(20261028-042126).md`, aktuelle Produktquellen und vorhandene Batch-2-/Host-Regressionen. Das Batch-4-ZIP wurde zuvor vollständig auf CRC/Hash geprüft und für die Gegenreview ausgewertet; Originalrequests und Zustandsfaltungen sind Grundlage, Reviews allein kein Beweis.

## 1. Entscheidung und Grenzen

**Eine falsche Erzählung darf stehen bleiben, ohne als falscher Spielzustand übernommen zu werden.** Nicht jeder fehlgeschlagene Modellaufruf beendet die Kampagne. Geld, Besitz, HP, Ressourcen, Kampfhandlungen, bestätigter Aufenthaltsort, Zeitgrenzen, Questfortschritt und einmalige Belohnungen bleiben Engine-owned. Eine Nebenfigur wird spätestens als Verkäufer, Geber oder Gegner mechanisch relevant.

Zulässig bleiben ungespeicherte Nebenfiguren, ungenaue Beschreibungen und nicht bestätigte Angebote. Nicht zulässig werden erfundene Käufe, kostenlose Erholung, Phantomgegner oder Bewegung allein aus Prosa. Der Spieler erhält bei relevanter Nichtausführung eine kurze Systemmeldung; der nächste Narrator erhält den bestätigten Stand. Keine erneute Modellanfrage allein zur sprachlichen Glättung.

**GPTs Feedback wird mit zwei Präzisierungen übernommen:** Die bereits doppelt gesicherten semantischen Extractorprüfungen werden lokale Reparaturhinweise statt Gesamtfehler; die World-Schutzregeln bleiben. Fehler vor und nach dem Commit werden getrennt. Allerdings beweist ein erfülltes `saveChat()`-Promise in ST 1.19 keine Speicherung, und eine unbekannte Engine-Exception ist kein harmloser Modellfehler.

## 2. Nachgewiesene Ursachen

| Befund | Tatsächlicher Übergang / Konsequenz |
|---|---|
| Batch 4 Warrior T137, C403/404 | `parsePlan()` scheitert zuerst an einer nicht verankerten Quote, dann an `amountErrors()`. `sell.min_cp` meint laut Vokabular einen **Gesamtmindestpreis**; die Prüfung summiert Geldwörter ohne `qty`. Vier Pelze zu zwei Kupfer ergeben acht, nicht zwei. Beide Originalfehler haben `tradeConflict:false`; deshalb greift der bisherige Clarify-Fallback nicht. Keine falsche Auszahlung im Original, sondern Runabbruch. |
| Mage T45/46, C129–131 | T45 hatte kein GO zum Gasthaus. World verweigert Ankunft und abhängige NPC-/Offer-Deltas korrekt. Die gespeicherten Korrekturen fehlen nachweislich im tatsächlichen C129-Kontext: `context.js` behandelt sie als verdrängbare Priorität 1. C130 hat eine **gültige globale Szene**, aber zwei ungültige `.at`-Referenzen und Chronologieprobleme. Repair C131 verschlechtert zusätzlich die globale Szene. Keine belegte Zahlung/Übernachtung. |
| Globale semantische Extractorfehler | `extract.js:parseExtraction()` macht NPC-Kontinuität und Verkaufsrichtung zu `errors`; `world.js` prüft beides nochmals. Funktionssonden mit Batch-2-Fixtures `004_24`, `005_26`, `005_121` bestätigen: World lehnt die problematischen Einträge ab und verarbeitet andere Ereignisse, während der Parser das ganze Ergebnis sperrt. |
| Host-Exception | Sonde mit `createWorldJobs()`: Exception vor Commit ergibt `changed:false`, Record bleibt `pending`, Job verschwindet. Exception im Save-Callback nach Commit ergibt ebenfalls `changed:false`, obwohl der Record bereits `applied` ist. Das sind verschiedene Fehler. |
| Speicherbestätigung | Geprüfter [ST-1.19-Quellstand](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/public/script.js): `saveChat()` (ab Zeile 7395) fängt Netzwerk-/HTTP-Fehler selbst ab; das als `ctx.saveChat` exportierte `saveChatConditional()` (ab 9412) kann ebenfalls ohne erfolgreichen Save zurückkehren. Der Runner entfernt Save-Requests bei `requestfinished` **und** `requestfailed` aus `pendingSaves`, ohne damit Erfolg nachzuweisen. Im Batch ist kein Datenverlust belegt; dies ist eine Codegrenze für die neue Fortsetzungsfreigabe. |
| Warrior T89/C253 | Das Manual existiert. Katalogtext `guard Primer of Guard …` wird zu `lines:["guard Primer of Guard"]`, obwohl die ID `guard` lautet. Richtige Kaufablehnung, danach falsche Narration „keine Manuals“. Kleiner Protokoll-/Feedbackfehler, keine neue Handelsarchitektur nötig. |
| Rogue T28/29 | Regelgerechter Gruppenbeitritt und Schaden gegen vier L6/7-Wölfe, dann Tod. Keine verlorene Flucht; gewählt waren Razor Cut und Feint, nicht Evasive Step. Kein Fehlertoleranzfall und kein Balancefix dieses Plans. |

Die beiden fatalen Batch-4-Modellantworten waren nicht leer und endeten mit `stop`. Mehr Reasoning-/Ausgabetokens lösen diese Ursachen nicht. Andere leere Antworten wurden im Batch bereits erfolgreich repariert.

## 3. Schritt 1 – vorhandene Schutzregeln einfacher und fehlertolerant nutzen

### 3.1 Semantik lokal ablehnen; Schema nicht erraten

**Dateien:** `src/v4/extract.js`, `src/v4/runtime.js`, gezielt vorhandene World-Tests; `world.js` nur bei nachgewiesener Lücke.

1. Die zwei bekannten semantischen Vorprüfungen aus `parseExtraction()` als strukturierte `issues` mit Index/seq/Grund ausgeben, nicht als Schemafehler. Die bestehende begrenzte Reparatur bleibt möglich. Wie bei heutigen `sceneIssues` bleibt eine schema-valide Antwort als Kandidat erhalten.
2. Scheitert Repair oder verschlechtert die Antwort, den bereits gültigen Kandidaten über `replyTurnV4()` verarbeiten. **Nicht** Elemente verschiedener Modellantworten zusammenkopieren. Beide Antwortvarianten und Ablehnungsgründe bleiben im Audit nachvollziehbar.
3. World entscheidet nochmals gegen den tatsächlich erreichten Zustand. NPC-Kontinuität einschließlich `blockedPeople`, Verkaufsrichtung einschließlich Gegenpartei, Szenenchronologie, Objektquellen und endgültige `depends_on`-Prüfung bleiben wirksam. Keine Umwandlung eines falschen `offer` in einen erfundenen `bid`.
4. Fehlerhaftes JSON, unbekannte IDs, falsche Place-Ref-Strukturen und nicht sicher isolierbare Schemafehler bleiben nach ausgeschöpfter Reparatur **nicht anwendbar**. Der Bericht endet kontrolliert; Schritt 3.2 ermöglicht die nächste Entscheidung. Keine allgemeine Filterung `deltas.filter(valid)` und keine neue heuristische Ergänzung verlorener JSON-Inhalte; die bestehenden rein syntaktischen `tolerantJson()`-Reparaturen bleiben erhalten.

**Bewusster kleinerer Zuschnitt:** Semantische Teilverarbeitung nutzt bereits vorhandene World-Logik. Beliebige schemafehlerhafte Deltas zu entfernen bräuchte zusätzlich eine verlässliche Sperrung impliziter Personen-, Objekt-, Orts- und Questabhängigkeiten. Das lohnt für diesen Patch nicht. Ein formal kaputter Nebenfiguren-Eintrag kann deshalb weiterhin die World-Übernahme dieses Replies kosten, künftig aber nicht automatisch die Kampagne. Das wird als Datenverlust ausgewiesen, nicht als erfolgreicher Zug.

### 3.2 Modellfehler abschließen, ohne Enginehandlungen zu wiederholen

**Dateien:** `src/v4/runtime.js`, `src/v4/world_jobs.js`, `index.js`, bei Bedarf `src/display.js`; bestehendes `setRec()/syncSwipe()` benutzen.

| Situation | Ergebnis |
|---|---|
| Planner nach bestehenden Versuchen ungültig/leer | Record mit `plan.failed` und **keinen Spielereignissen** behalten. Dauerhafte Engine-Antwort „NOT EXECUTED – Handlung nicht sicher verstanden; bitte erneut entscheiden“, aktuellen HUD zeigen. Kein Narratoraufruf mit ungeprüfter Spielerhandlung, keine Zeit/RNG-/Kampfrunde buchen. |
| Extractor liefert keinen anwendbaren Bericht | Vorhandenes `extractionFailedEvents()`/`status:failed` nutzen. Die bereits auf der Spielernachricht gebuchten Käufe, Kämpfe, Ressourcen und Questauszahlungen bleiben bestehen. Nur zusätzliche World-Übernahme fehlt. Sichtbar nennen, was unbestätigt blieb. |
| Unerwartete Engine-/Ownership-/Reducerexception vor World-Commit | Gesamtes lokale World-Ergebnis verwerfen. Pending-Record nur bei weiter gültiger Jobidentität terminal als Enginefehler schließen. **Keine automatische Runner-Fortsetzung.** Fehler sichtbar halten; kein Catch-and-continue mitten in `emit()`. |
| Fehler nach `setRec()` | Bereits geschriebene Events/`applied` nicht zurücksetzen und nicht neu extrahieren. Anzeige- und Speicherfehler getrennt melden. Ausschließlich dieselben Records speichern/anzeigen; kein Planner-, World- oder Kampf-Replay zur Reparatur. |
| Chat-/Swipe-/Textwechsel oder neuerer Turn | Alter Job schreibt und speichert nichts. Vorhandene Identitäts-, Hash-, Turn- und Abort-Sicherungen einschließlich `undefined/null → swipe 0` erhalten. |

Ein kleines **Record-Metadatum**, kein neues World-Event oder Save-Migrationssystem, kennzeichnet den Abschluss: beispielsweise `continuation: { kind: 'planner_not_executed' | 'world_not_applied', reason: 'schema' | 'empty' | 'transport' }`. Es wird nur in den ausdrücklich bekannten Modellfehlerpfaden gesetzt. Enginefehler, unklarer Commit, Abbruch durch veralteten Job und kaputte Folds erhalten keine Fortsetzungsfreigabe. Bestehende `recovery`-Felder für tatsächlich erfolgte Retry-Versuche nicht umdeuten.

Dabei `ask()` nicht ungeprüft vertrauen: dessen bisheriger Sammelname `transport` für unbekannte Exceptions ist kein Beweis für einen Providerfehler. Herkunft unterscheiden; Konfigurations-/Authentifizierungsfehler und unerwartete Programmfehler bleiben Stopps. Die Freigabe bezieht sich auf den abgewickelten Modellfehler, nicht auf einen beliebigen gefangenen Fehler.

Der aktuelle Hostweg `action:'panels'` versteckt die ursprüngliche Spielernachricht. Für die Nichtausführung eine kleine Abzweigung verwenden, die die Nachricht **sichtbar erhält**, die Engineantwort einmalig referenziert und keinen Spielzug auslöst. Regenerate derselben Eingabe darf erneut planen; die alte Hinweisanzeige darf dabei nicht doppelt anwachsen. Der Runner entscheidet anschließend neu und startet selbst kein Regenerate.

**Speicherung:** Ein zurückgekehrtes `saveChat()` allein darf keinen „sicher gespeichert“-Stempel erzeugen. Im seltenen Fortsetzungsfall nach Modellfehler zunächst normal speichern, dann über den vorhandenen ST-Leseweg den betreffenden Chat/Record zurücklesen und mit dem erwarteten Spieler-/Antwortrecord vergleichen. Identität, Text-Hash, Events und Abschlussstatus müssen passen; alle Await-Grenzen erneut auf Aktualität prüfen. Der `continuation`-Marker ist nur die fachliche Eignung, keine Save-Quittung: die Bestätigung gehört zum laufenden Hostauftrag; der Runner prüft den gespeicherten Record vor seiner Fortsetzung ebenfalls. Kein erneutes Speichern bloß um die Speicherbestätigung zu speichern. Das bestehende `Driver.reload()` zeigt den `/api/chats/get`-Weg. Kein Reload jedes Zuges, keine eigene Schreib-API, kein `force`-Overwrite. Bei fehlendem Nachweis stoppen; gegebenenfalls einmal nur dieselben Records erneut speichern, niemals erneut buchen. Normale erfolgreiche Züge erhalten keinen zusätzlichen Vollchat-Readback.

Im Runner Save-HTTP-Fehler/Netzwerkfehler des isolierten Testchats zusätzlich ausdrücklich erfassen: Ende eines Requests ist kein Erfolg. Ein Persistenzfehler ist weder `soft_continued` noch ein Anlass für eine neue Spielerhandlung. ST-Integritätsdialoge unverändert respektieren. Die eng begrenzte Readback-Lösung muss vor Freigabe in echtem ST 1.19 geprüft werden; unbekannte Hostversionen dürfen nicht still eine Bestätigung vortäuschen.

### 3.3 Den vorhandenen Korrekturrückkanal verbindlich zustellen

**Dateien:** `src/context.js:turnContext`, `src/host.js:turnBlock`, `src/v4/runtime.js:applyExtraction`; bestehende System-/HUD-Ausgabe.

- Kritische Korrekturen des unmittelbar vorangegangenen Replies bekommen einen kleinen geschützten Platz direkt vor der aktuellen Auflösung, analog zum vorhandenen Envelope/Chronicle. Sie dürfen bei Standardbudget 1.400 nicht vollständig verschwinden.
- Den Umfang deterministisch begrenzen: bestätigter Ort, Hinweis auf nicht übernommene World-Angaben und betroffene abgelehnte bzw. ungeklärte Handlungen. Vorhandene `corrections`, `resolutions` und `booked` nutzen; keine Prosa neu interpretieren und keinen neuen Memorydienst einführen. Längere Erläuterungen bleiben außerhalb des Pflichtteils kürzbar.
- Text unterscheidet **letzten Reply** und **aktuellen Zug**: „Im vorigen Reply wurden Gasthausankunft, Kauf und Schlaf nicht gebucht“ sperrt kein nun ausdrücklich autorisiertes GO. Eine zuvor erfolgreiche Kampf-/Geldbuchung darf nicht versehentlich durch „nichts geschehen“ dementiert werden.
- Nebenfigurenfehler ohne spielrelevante Folgen brauchen keine lange Warnung. Sobald Identität als Geldgeber/Verkäufer/Gegner benutzt würde, greifen die bestehenden Regeln weiter.

### 3.4 Runner beobachtet Fortsetzung, statt Fehler zu verstecken

**Dateien:** `tools/st_live/live/driver.mjs`, `evaluator.mjs`, `run_live.mjs`, bestehende Reportausgabe. Profile, Klassen, Level-15-Ziel und Spielstrategie bleiben unverändert.

- `turnFailure()` diagnostiziert weiter den tatsächlichen Fehler. Neue Fortsetzungsentscheidung anhand des aktuellen Engine-Records, terminalem Status, konsistentem Fold/State und belegter Speicherung; nicht aus Fehlermeldungsworten oder allein `status:failed` ableiten. Alte Records ohne Kennzeichnung bleiben konservativ behandelt.
- Engine-Nichtausführung mit sichtbarer Antwort ist ein abgeschlossener Bedienvorgang, kein 20-Sekunden-Warten auf einen fehlenden Narratorreply. Ein Extractorfehler kann auch nach mechanischer Spielerhandlung fortsetzbar sein, **wenn deren Buchung unverändert erhalten ist**.
- Getrennt zählen: korrekt abgewickelte Handlungen; sichere Nichtausführungen/Fortsetzungen; fehlende World-Übernahme; bestätigte Integritäts-/Persistenzfehler. Ungeklärte `expected`-Aktionen nach seq ausweisen, nicht pauschal jede Erwähnung als „verlorene Spielerhandlung“ zählen. Vollständig unverständlicher Plannerinput: Anzahl unbekannt, ein betroffener Input.
- Fortschrittslose technische Fortsetzung begrenzen: Vorschlag drei unmittelbar aufeinanderfolgende, mechanisch nicht fortschreitende Modellfehler → `repeated_model_failure`. Panels und bloßer Zeit-/Turnzuwachs setzen die Folge nicht zurück. Keine Gesamtquote, die einen sonst guten langen Lauf wegen weit auseinanderliegender Fehler beendet. Reguläre Verweigerungen und freiwilliges Rollenspiel nicht als solche Fehler mitzählen.
- Tod, korrupter Fold, Engineexception, ungeklärte Persistenz, falscher Chat und fehlende UI bleiben Stopps. Kein Auto-Respawn und keine neue Erfolgssimulation.

## 4. Schritt 2 – verbleibende Batch-Ursachen an ihren Verträgen korrigieren

### 4.1 Ein Preisverständnis für Planner und Handel

**Dateien:** `src/v4/interpret.js:amountErrors`, `planner.js:parsePlan`, `trade.js:tradePrice/acceptanceWhy`, `content/commands.json`; vorhandene World-Preisprüfung weiterverwenden.

`buy.max_cp` und `sell.min_cp` bleiben Gesamtgrenzen für die ausgewählte Menge; `offer.accept.agreed_cp` bleibt vereinbarter Gesamtpreis. Keine Änderung historischer Events oder gespeicherter Preise.

1. Handelsbeträge nicht weiter mit ungewichteter `coinFromWords(gesamte Quote)` prüfen. Bestehendes `tradePrice()` als gemeinsame Auswertung für eindeutigen Einzelpreis, Stückpreis, Gebinde und Gesamtpreis nutzen. Nicht auf unabhängige Geldgeschenke/Zahlungen pauschal übertragen.
2. Die bestehende Stückpreisprüfung unterstützt `each/per/a`, aber noch nicht `apiece` (Sonde bestätigt). Diese reguläre Form ergänzen; Menge berücksichtigen. Währungsumrechnung weiterhin ausschließlich über `economy.js`.
3. Ein Command muss seine eigene Preis-/Warenklausel zitieren. Bei vier Pelzen zu zwei Kupfer erwartet der Validator acht Kupfer Gesamtminimum; bei neun Fängen zu einem Kupfer neun. Die ganze Nachricht mit zwei getrennten Preisen ist ohne eindeutige Zuordnung **unklar**, nicht drei Kupfer. Präzise Repair-Rückmeldung: betroffene seq, Menge, Einzel-/Gesamtbasis und benötigte exakte Klausel. Keine aus Teilstücken erfundene Quote.
4. Unklare Preise bleiben ungeklärt. Insbesondere Qualität, „matched sets“, Preisbereiche oder ein Paket ohne Positionspreise nicht automatisch ausrechnen/aufteilen. T136 liefert deshalb weiterhin keinen sicher belegten 17-cp-Bid. T137 darf ein gültiges Verkaufsminimum etablieren; **Geld gibt es erst bei passendem Käufer/Bid**, nicht aus der Spielerpreisnennung allein.
5. Nach gescheitertem Repair greift Schritt 1 ohne schwächeres Minimum, Kauf oder Warenabgang. Der alte Spezialfall `tradeConflict` muss keine beliebige Quote-/Schemalücke mehr als Handel klassifizieren, um den Lauf zu retten. Seine vorhandene präzise Rückfrage darf bleiben.

`amountErrors()` erhält hierfür die nötigen Katalog-/Mengendaten vom Aufrufer. Bei `qty:null` die bestehenden Auswahlregeln verwenden; ein ganzes gehaltenes Gebinde ist nicht automatisch eine Einheit. Ist die Menge für einen Stückpreis nicht eindeutig, Rückfrage statt stiller Annahme. Ruleset-1/Interpreter-A-Kontrollen und alte gespeicherte Preise bleiben ausdrücklich Teil der Abnahme.

### 4.2 Place-Ref-Reparatur präzisieren, keine Ortslockerung

**Dateien:** `src/v4/extract.js:extractorRequest/parseExtraction/placeRef`, gegebenenfalls ein kleiner Diagnostikhelfer im selben Modul.

- Bei Place-Ref-Fehlern nicht nur „matches none of anyOf“ liefern: konkrete Feldpfade und die bestehende zulässige Form `{"new":{"name":"…","kind":"interior","parent":…}}` nennen. Aus dem Schema ableiten; keine zweite Referenzsyntax.
- Bereits valide Root-Szene/Expected-Felder im Repair ausdrücklich erhalten lassen. Die gültige C130-Root-Szene nicht zum Fehler erklären. Ungültige Reparaturen trotzdem normal validieren; keine stillschweigende Zusammenführung mit altem Inhalt.
- Chronologie bleibt Reparaturhinweis und World-Prüfung. Keine automatische Umordnung aller Ankünfte nach vorn, keine Erfindung eines GO, kein Ableiten einer bestätigten Ankunft aus `scene`.
- Original C130/131 dürfen nach Schritt 1 kontrolliert ohne World-Übernahme enden. Eine valide Kontrollantwort muss weiterhin die unautorisierten Gasthaus-, Personen-, Kauf- und Schlafbehauptungen zurückweisen. Künftiger Erfolg bedeutet entweder korrekte Reparatur **oder sichtbare sichere Fortsetzung**, nicht erzwungene Übernachtung.

### 4.3 Manual-Katalog: ID und Bezeichnung lesbar trennen

**Dateien:** `src/v4/interpret.js:catalogText`, `commands.js:offer.accept`; vorhandene `pickLines()`-Prüfung erhalten.

- Angebotstext klar als `line_id="guard"; item="Primer of Guard"; price=120 cp` ausgeben, ebenso bei anderen Positionen. Kein Sonderfall für diesen Manualnamen.
- Bei ungültiger Zeilenwahl gültige Positionen dieses offenen Angebots in der bestehenden Nichtkaufmeldung nennen. Derselbe Hinweis gelangt über Schritt 1 an den Narrator. Keine Namensunschärfe als Kaufberechtigung und keine automatische Auswahl der ähnlichsten Ware.
- Händlerpräsenz, Ortsprüfung, Mengen, Budget und tatsächliche Buchung unverändert. Andere unabhängig autorisierte Handlungen bleiben nach vorhandenen `needs`-Regeln möglich.

## 5. Gemeinsame Regressionen und Abnahme

| Gruppe | Rote Zielfälle / positive und negative Kontrollen |
|---|---|
| Semantik | Batch-2-Originalfixtures: semantisch falsche NPC-/Offer-Deltas verlangen höchstens vorhandenes Repair, verhindern aber keine unabhängige gültige Ankunft. Kein Teleportieren/zweite Identität, keine rückwärts gebuchte Zahlung. Neue echte NPC-Ankunft, korrekter Bid und bewusster Kauf bleiben möglich. Bestehende Tests, die `valid:false` für Semantik verlangen, gezielt auf neue Diagnostik **und denselben Schutz im Endzustand** umstellen. |
| Abhängigkeiten | Verweigerte Ankunft sperrt lokale Personen/Angebote/Objekte/Questbelege; verworfener Geber kann kein Geschenk auslösen. `depends_on` darf keine später abgewiesene Quelle verwenden. Gültige unabhängige Weltänderungen bleiben möglich. Kein generischer Schema-Salvage-Test mit heimlich geratenen Referenzen. |
| Fehlerabschluss | Plannerfailure: sichtbare einmalige Nichtausführung, keine Spielerevents/Zeit/RNG. Extractorfailure nach bereits gebuchtem Kampf/Kauf: diese Events exakt erhalten; keine zweite Ausführung. Engineexception nach lokaler Mutation: Originalzustand unverändert, terminaler Enginefehler, harter Runnerstopp. |
| Host/Persistenz | ST-Reihenfolge `MESSAGE_RECEIVED → swipe_id=0`, echte Swipes, Edit/Chatwechsel während Modellaufruf und Save. Savefehler nach Commit erhält `applied`; Retry speichert nur. HTTP 500/Netzabbruch trotz erfülltem ST-Promise verhindert Fortsetzung. Reload/Readback zeigt genau dieselben Events. Rerenderfehler darf Save nicht verhindern. |
| Kontext | Mage C129 mit Originalchat/Standardbudget: kritische Hinweise nicht mehr in `dropped`, korrekter Standort/kein Kauf/kein Schlaf sichtbar. Nächster echter GO bleibt autorisierbar. Kein Widerspruch zu bereits gebuchtem Kampf oder Geldzugang. |
| Preis | Original C403/404 enden sicher ohne Verkauf. Kontrollantworten mit exakt belegten Gesamtminima 8/9 gültig; Unterminima 2/1 abgelehnt. Mehrere Preise in voller Quote nicht als Summe 3 übernehmen. Einzelware, Gebinde, gemischte Währung, Paketgesamtpreis, Teilmenge ohne Teilpreis, Preisbereich/Qualitätsbedingung, Kaufbudget und Käuferwechsel prüfen. |
| Extractorformat | C130: Root gültig, genau die defekten `.at`-Pfade diagnostizieren; C131 ungültig. Valide Reparatur darf keinen unautorisierten Gasthausaufenthalt erzeugen. Bekannte IDs sowie ein-/zweistufig gültige neue Orte unverändert. |
| Katalog | C253 mit verknüpftem ID+Label bleibt Nichtkauf mit hilfreichen Optionen; `guard` kauft nur bei erfüllten bisherigen Voraussetzungen. Keine 120-cp-Abbuchung bei falscher ID, abwesendem Verkäufer oder zu wenig Geld. |
| Runner | Beide Batch-4-Abbrüche werden als sichere Fortsetzungen erkennbar, nicht zu fiktiven Erfolgen. Drei erfolglose technische Wiederholungen stoppen. Intermittierende Fehler, bewusste Gespräche und Panels nicht verwechseln. Rogue-Tod bleibt Tod. |

Neue Zielfälle zunächst gegen unveränderte `.104` ausführen; bereits funktionierende Schutzfälle als Kontrollen kennzeichnen. Nach Schritt 1 und Schritt 2 jeweils passende angrenzende Suiten; abschließend vollständiges `npm test`. Wegen Host-/Kontext-/Protokolländerungen **echter ST-1.19-Smoke verpflichtend**, einschließlich HTTP-Savefehler und nächster Spielerentscheidung. Ein Mock-Smoke ist kein natürlicher GLM-Beweis. Danach neuer natürlicher Dreiklassen-Batch mit getrennten Fehler-/Fortsetzungskennzahlen, ohne parallele Combat-/Balanceänderung.

## 6. Aufwand, Reihenfolge und bewusster Verzicht

- **Schritt 1: mittel bis erhöht**, hauptsächlich sauberer Hostabschluss, belegte Speicherung und sichtbare Fortsetzung; lokale Semantik- und Kontextänderungen klein. Dieser Schritt erhält auch bei künftig unbekannten Modellfehlern die Spielbarkeit, behebt aber nicht jede verlorene Aktion.
- **Schritt 2: mittel**, vorhandene Preislogik zusammenführen sowie Repair-/Katalogdiagnostik verbessern. Er reduziert die konkret beobachteten Fehlhandlungen, statt sie nur häufiger zu tolerieren.
- Zuerst Schritt 1 technisch abnehmen, dann Schritt 2 auf derselben Basis. Keine Serie einzelner Wortlaut-Hotfixes. Die spätere Umsetzung dokumentiert tatsächliche Tests/Commits einmal je Fachschritt; dieser Plan behauptet keine Implementierungsergebnisse.
- Kein höheres Tokenbudget, kein neuer NPC-Wichtigkeitsmodus, keine allgemeine Prosa-Reparatur, keine Wiederbelebung, keine Auto-Ankunft, keine automatische Rohtext-Narration nach Plannerfehler. Keine neuen Gearslots, Werte, XP-, Quest-, Dungeon- oder Combatregeln.

**Untersuchung dieses Plans:** Quellenprüfung und gezielte zustandsisolierte Funktionssonden am unveränderten Produktcode; keine neuen Produktdateien/Tests und keine vollständige Node-/ST-Abnahme ausgeführt. Die Speichergrenze ist am echten Hostcode nachgewiesen, nicht als im Batch beobachteter Geld- oder Saveverlust auszugeben.
