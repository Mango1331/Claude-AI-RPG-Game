# 10B-3 – Gildenboard-Wahrheit, echte Angebote und Quest-Zusagen
**Fachlich eigenständiger Implementierungsentwurf für Sol – NICHT implementiert oder als unbedingter Bauauftrag freigegeben.**

**Basis:** `.66`, Produkt `4cd9b338773783644a79a39f367629e6aaeead05`, aktueller Dev-HEAD neu prüfen. Gehört historisch zu **10B-3**, wird bewusst nicht mit Kampfeskalation, Narrator-Recovery oder Delivery-Refactoring vermischt. Der neu laufende natürliche `current_test` ist bis zur ZIP-Auswertung keine neue Evidenz.

## 1. Quellbefund und gewünschtes Spielverhalten

**Run 2 (.57), `testrun_10b/20261024-033325Z-current_test/REVIEW.md`:** `board.shown` E17 zeigte fünf echte Novice-Verträge. Nachdem einer erledigt war, erfand der Narrator in T23/E46 im Gespräch zwei angeblich neue **offizielle** Board-Listings („Rats in the grain cellars“, „Firewood for the temple alms-house“) außerhalb eines `board.refreshed`-/`quest.created`-Nachweises. `overreach.noted guild_listing` zeigte, dass die Engine die unerlaubte Behauptung erkannt hatte. Bei T24/E47 und T25/E49 wurden die vom Narrator präsentierten `quest.accept` folgerichtig als `no such contract` verweigert. Der PC verschwendete reale Entscheidungen auf erfundene Optionen; E50 endete in leerem Narrator (technisch getrennt, **keine** Beweisführung, die Boardfalschmeldung verursache Reasoning-Exhaustion).

**Run 4 (.57), `06` §15:** erneut offizielle Boardphatomträge / nachweislich erledigte und wiedererfundene Listings, ergänzt um Testspieler-Verwechslungen eigener Verträge. Die Engine kann tatsächlich korrekte Statuswerte buchen und dennoch unzutreffende Prosa/Memory anbieten. Der Fehler ist daher nicht primär, dass ein Phantom-`quest.accept` durchgeht – die Engine lehnt oft korrekt ab –, sondern dass **das dem Spieler präsentierte offizielle Angebot** von der autoritativen Engine-Liste abweicht.

**Verbindliches Design aus `02_DESIGN_KANON.md` §6:** freiwillige, konkrete Novice-Gildenquests, `board`-Tagesangebot bleibt für Spieler stabil; keine durch „andere Abenteurer“ heimlich entfernten heute sichtbaren Listen. Private NPC-Aufträge und spontane Entdeckungen **bleiben erlaubt**; lediglich deren Darstellung als gegenwärtige **offizielle Gilden-Board-Listings ohne Engine-Beleg** ist untersagt. Kein verpflichtender Beweispapier-/Trophäenbürokratismus.

## 2. Zu prüfende technische Stellen im aktuellen Code

- `src/v4/guild.js`: `boardNeed`, `listingSchema`, `boardRequest`, `generateBoard`, `listingsOf`, `boardKey`, `today`, `acceptContract`, `contractReady` und `board.shown`-/`board.refreshed`-Sichtbarkeit.
- `src/v4/runtime.js`: Planner-/Board-Generierung vor Narrator, erneutes Boardlesen am passenden Tag/Hall, `plannedTurn` und `prepareGenerationAsync` inkl. `retryBoard`; sicherstellen, dass `recovery`/Regenerate keinen zusätzlichen offiziellen Vertrag erzeugt.
- `src/context.js`: welche verifizierten Board-IDs/Titel/Status der Narrator als aktuelles Board sieht. Existierende `outcomeBlock`-/HUD-/World-Truth-Ausgabe nutzen statt neue automatische Questlisten zu erfinden.
- `src/v4/world.js` `case 'quest.offer'`, `case 'quest.detail'`, `case 'listing.gone'` und Firewall-`overreach`; `ownership.js` hält `guild.board` und formalen `quest.status` **Engine-owned**, während private `quests` World-owned sein dürfen.
- `src/v4/commands.js`, `src/v4/agency.js`: `quest.accept` und Gildenverträge nur nach authorisiertem Listing. Offenes Angebot am Gildenschalter und ein privates Gespräch sind **nicht** automatisch offizielle Boardgenerierung.

## 3. Vollständiger Fachpatch, kein pauschaler Narrator-Redesign

**Zielarchitektur:** Ein offizielles Angebot kann für den Spieler nur dann als *aktuell zur Annahme offener Gildenvertrag* präsentiert werden, wenn sein Contract-/Board-/Statusbeleg aus dem autoritativen Zustand hervorgeht. Ein Narrator darf legale Informationen zu einem **echten bereits autorisierten** Vertrag detaillieren, eine tatsächlich geänderte Tagesliste korrekt nennen oder private Arbeit frei anbieten. Widersprüche müssen dem Narrator als Engine-Korrektur und dem Runner als Reviewpunkt erkennbar sein – nicht bloß einen späteren `quest.accept` ablehnen.

**Implementierung erst nach Ursachenprüfung:** Herausfinden, ob der Narrator falsche Angebote trotz vorhandenem offiziellen Statecontext erfindet, ob Kontext einen veralteten Board-Snapshot enthält oder ob Extractor/Memory falsche offizielle Listings als World-Notiz verewigen. Dann den **nachgewiesenen** Consumer (Context/World-/Board-Overreach) enger festlegen. Vorhandenes `overreach.noted` als Signal verwerten; ggf. etablierte `board`-Truth strukturiert sichtbar machen. **Keine** allgemeine Unterdrückung spontaner Jobs und keine reflexhafte globale „Narrator darf keine Quests“ Anweisung.

### Testmatrix – vor Implementierung als Rot-/Grün-Kontrollen

1. E17-ähnliches reales Board mit fünf autorisierten Novice-Listings. Narrator nennt dieselben echten, in der richtigen Branch/Rang/Tagesgeneration – **positiv**.
2. Spätere NPC-Konversation zeigt **zwei ausgedachte offizielle** Board-Aufträge, ohne `board.refreshed`/gültigen Contract → werden nicht als aktuell auswählbare Gildenangebote persistiert/gegenüber PC behauptet; es gibt klare Korrektur/Review. Kein phantomhaftes `quest.accept`.
3. Ein echter aktiver Vertrag wird bei Rückkehr nach Turn-in als **completed**, nicht wieder als `listed` dargestellt; kein zweiter Slip und keine doppelte Belohnung.
4. Gültiges **bereits gesehenes** Tagesangebot bleibt offen, auch wenn Narrator meint „ein anderer Abenteurer hat es genommen“, solange die Engine kein gültiges `listing.gone` gebucht hat.
5. Echte Board-Erneuerung **am späteren Tag** darf neue autorisierte Listings ergänzen, ohne vorhandene heutige Aufträge durch einen zufälligen Reroll zu ersetzen; Branch-, Rang- und Day-Key korrekt.
6. Private Pflege-/Escort-/Courier-Arbeit von Heilerin oder Bauer → kann als `quest.offer` (nicht `guild_contract`) angeboten/angenommen werden. Kein unnötiger Boardzugang oder Warten auf Gilde.
7. NPC **redet über** einen möglichen Auftrag einer anderen Gilde / Hörensagen → darf dies als Aussage/Unsicherheit tun, aber kein offizielles, sofort auswählbares Boardangebot damit autorisieren.
8. Spieler fragt gezielt nach einem echten gelisteten Vertrag → Narrator und Engine erlauben Annahme nur wenn Boardzustand aktuell, PC vor Ort und alle bestehenden Engine-Gates erfüllt sind.
9. Rejected phantom `quest.accept` darf weder Geld/XP/Queststatus/Slip verändern noch der Spielerfigur neue freiwillige Zustimmung unterstellen; sachliche Klärung statt „war inzwischen weg“ ohne Beleg.
10. Regenerate/Swipe, `board_recovery`, Save/Reload und Event-Replay → keine neuen Contract-IDs, Statusdoppelungen, verlorenen Tageslisten oder zweite Auszahlung.
11. Sowohl erfolgreiche Delivery-/Cull-/Escort-Verträge als auch tatsächliche Realm-/Guild-Rank-Limits bleiben korrekt; neu gebuchte Privatjobs beeinflussen Boardangebot nicht fälschlich.
12. Inverse Kontrolle: Engine-berechtigtes neues Boardlisting darf nicht durch einen zu aggressiven Free-text-/Quest-Filter verschwinden.

## 4. Abnahme/Arbeitsweise

- Livequellen Run 2/Run 4 getrennt und quellengenau prüfen, Mockreports **nicht** als Originalevents deklarieren. Ursprüngliches `overreach.noted` im tatsächlichen .66-Code zunächst finden und genaue Auslöse-/Consumerkette identifizieren.
- Redtests gegen unveränderte .66, danach **ein zusammenhängender Guild-Authority-Fachpatch**. Test-Dateien in `tests/v4/`, keine neue Registry für eigentliche Questwahrheit, keine pauschale Resetmechanik.
- Angrenzende Board, world, ownership, replay, delivery und Runner-Fälle zusammen ausführen; `npm test` vollständig, **realer** `smoke:st:c` inkl. Browser-Event-/Save-Beleg. **100-Züge-`current_test`** erst nach technischer Abnahme und unabhängigem Gegenreview; neue .66-Laufdaten vorher prüfen.
- Regulierter Vertrag/No-op/Fehlmeldung im HUD muss erklären können, welche Angebote heute wirklich existieren; wenn dafür zusätzliche UI/Promptänderungen nötig sind, minimal und separat im Diff begründen.

## 5. Grenzen und offene Fragen

Keine automatische Großänderung an Quest-Typen, Tagesgröße, Reward-Scaling, Nachfrage/Ökonomie, Skillaufstieg oder spontanen privaten NPC-Jobs. Keine „Gildenboard ist allein der ganze Questmarkt“ Einschränkung. Der Run-4-Gedächtnisfehler des Testspielers ist **nicht zwingend Engine-Persistenzkorruption**; Observer-/Memory-Signale separat verifizieren.

**Status:** spezifiziert, weder Sol-Implementierung noch Build-Erhöhung noch Tests erfolgt. Entscheidung, ob dieser Fachpatch vor oder nach Combat 10B-3 kommt, vom neuen natürlichen .66-Run abhängig.
