# Avereth Engine – unabhängiges Review des natürlichen Laufs auf Build .85

**Run-ID:** `20261025-113248Z-current_test`  
**Original-ZIP:** `20261025-113248Z-current_test.zip`  
**Produktstand:** `4.3.0-c.6.6.85`, Git `6b9ac65f4c2e` (reiner Testleitfaden-Commit nach Produktcommit `2bab566`).  
**Lauf:** natürliche neue Kampagne, kein Fixture, GLM-5.3-Flash, Mage mit Arcane Bolt und Flame Lance.  
**Originalintegrität:** 3.500.524 Bytes, ZIP-CRC ohne Fehler, SHA-256 `10edf1719366ca107f9f464014d88234f16189acab6f4ccc3b6b62e41e0946c9`.

## Gesamturteil

**Technisch fehlgeschlagen in Spielereingabe 22/100**, aber 21 bisherige Engine-Züge sind konsistent; **kein Charaktertod, kein Host-/Providerabbruch, keine PageErrors**. Ein `extractor_failed` nach einmaliger erfolgloser Reparatur verhindert die Übernahme der letzten Narrator-Antwort.

Vor dem Abbruch zeigt der Lauf einen vollständigen erfolgreichen Weg **Gildenbrett → Gildenregistrierung → Jagdannahme → drei echte Kills → READY**. Die Rückkehr zur Gilde und die Auszahlung wurden erzählt, jedoch **nicht gebucht**. Der eigentliche Turn-in-Abnahmeweg bleibt deshalb für `.85` natürlich ungetestet.

## Tatsächlicher Verlauf und positive Belege

- **T1–2:** neue Mage-Kampagne, Arcane Bolt/Flame Lance, `campaign.started.private_quests:false`.
- **T4/E7:** erstes Gildenbrett ohne Repair erfolgreich: **zwei Jagden, zwei Lieferungen, eine Räumung** („Clear Mossback Warrens Level 1“). Board-Commit und fünf `quest.created`. Dies ist ein natürlicher Positivnachweis für den Kernfix `.84`, nicht für alle Boardvarianten.
- **T5/E9:** Registrierung zum vorgesehenen Preis, 20 Kupfer vom Startguthaben 50 abgezogen; 30 Kupfer danach.
- **T6/E11:** Jagd auf drei Schnappschildkröten am Miller’s Fish Weirs offiziell angenommen, ohne Privatquest.
- **T11–13/E21–25:** eine Schildkröte regulär besiegt; 46 Kampf-XP, 18 PP Flame Lance.
- **T17–20/E33–40:** zwei weitere Schildkröten als tatsächlicher Gruppen-Encounter, beide besiegt; 72 XP, weitere 18 PP. Insgesamt **118 Kampf-XP**; Level 2 mit 18 verbleibenden XP. Die drei besiegten Ziele sind im Engine-Zustand belegbar; Jagd `READY` bei E40.
- **T21:** fünf freie Attributpunkte als INT+2, WIL+2, VIT+1 verteilt.
- **Auto-Loot:** vier Scale Plates und drei Claws befinden sich im Inventar; ihre erneute Erzählung in T22 darf keine zweite Beute anlegen.
- **Keine formalen Privatquests** aus NPC-Gesprächen oder Hilfeleistungen. Freie Geldbelohnungen wurden in diesem Lauf nicht tatsächlich gebucht und sind dadurch **nicht natürlich abgenommen**.
- 18 `extract.applied`-Events bis einschließlich T20; T21 ist ein Engine-Systemkommando; T22 ist der fehlgeschlagene Extraktionsversuch.

## P1 – Extraktion blockiert gesamten Weltcommit in T22

**Belege:** `chat-completions.jsonl` Calls 58/59, `chat.jsonl` Nachrichten 44/45, `avereth-events.json` E44 sowie `report.md`.

Spielerentscheidung: bereits kanonisch gehaltene Schildkrötenbeute zusammennehmen, mit dem Fischer nach Ashbridge zurückkehren und an der Gilde abgeben. Narrator: Marda überreicht Brot/Käse noch am Wehr; anschließend tatsächliche Ankunft in der Gildenhalle; der Clerk zählt erzählerisch 40 Kupfer aus.

Die **erste** Extraktorantwort enthielt bei Seq 3 ein formal gültiges `object.new` ohne `ref`, doch Seq 4 referenzierte die gerade erst entstandene Speise mit einer geratenen, im CATALOG nicht vorhandenen Zeichenfolge:

`{"type":"object.move","object":"obj.t30.heel_of_bread_and_hard_cheese","to":"pc"}`

Das ist **kein** zulässiger `object-ref` für eine neue Sache. Die Engine erwartet für ein Objekt aus `object.new` im selben Bericht die Referenz **`{"new":"heel of bread and hard cheese"}`**; `object.new` selbst hat **kein** `ref`-Feld.

Die Reparaturaufforderung benannte nur den `object.move`-Schemafehler. Das Modell deutete ihn falsch und fügte bei `object.new` ein unzulässiges `ref`-Feld hinzu, **ohne** die fehlerhafte `object.move`-Referenz zu ersetzen. Daher schlug auch die Reparatur fehl. Der finale `extract.failed` wurde korrekt gemeldet; die Engine verbuchte **keine** Weltänderungen aus T22.

**Root-Cause-Bewertung:** Ein reproduzierbarer LLM-Ausgabe-/Repair-Fehler an der Querverknüpfung `object.new` → `object.move`; das bestehende Schema und `world.js` stellen bereits einen zulässigen Verknüpfungsweg bereit. Nicht belegt ist ein Defekt im deterministischen Objekt-Resolver selbst. Der Recovery-Pfad bleibt beim konkreten Fehlertyp nicht robust genug, um die gültigen übrigen Vorgänge der Antwort zu sichern.

**Wichtige zweite Grenze:** Selbst eine schemaformal reparierte Antwort wäre noch nicht automatisch fachlich gültig. Das Geschenk geschieht *vor* der Rückreise am Wehr, während die Extraktion `scene` pauschal auf die Gildenhalle setzt und keine per-Delta-Szenen angibt. Außerdem beschreibt sie Marda als `present:false`, obwohl diese die Speise persönlich übergibt. Ein Fix darf weder falsche Präsenz noch einen nicht erreichten Ort stillschweigend genehmigen.

**Folgen:** Die erzählte Ankunft, das Geschenk sowie die nur bedingt autorisierte Gildenabgabe samt 40-Kupfer-Zahlung fehlen im kanonischen State. Es ist kein Nachweis für eine falsche Auszahlung durch die Gilde, sondern ein vorgeschalteter Totalabbruch des World-Commits.

## P2 – Wiederholter zeitlicher Szenenkonflikt in T16

**Belege:** T16/E32 und `delta.rejected`-Events.

Der Spieler kündigt eine längere Rast und Versorgung durch Marda an. Die Antwort verlegt ihn ohne dafür gebuchte Reisefreigabe in Mardas Drying Shed. Der Engine-Validator weist die nicht autorisierte Ankunft (`no_go`) korrekt zurück. Sechs davon abhängige Welt-Deltas mit fehlender/übernommener Szenenangabe (`scene_context`) werden nicht übernommen: Mardas Einführung, Versorgung, Brot-Käse-Geschenk, Übergabe, Thread und Fischer-Information.

**Bewertung:** Das ist derselbe fachliche Komplex wie die zeitliche Schauplatzannotation aus Run 13, hier kombiniert mit einer unerlaubten selbstständigen Ortsverlagerung. Die Engine darf das nicht durch pauschales Akzeptieren erzählter Reisen „reparieren“. Der Fehler ist aber für das Spielerlebnis spürbar, weil eine erzählte NPC-Hilfe und ein Geschenk kanonisch fehlen. Das T22-Problem sollte im Zusammenhang mit den zeitlichen Szenengrenzen untersucht, aber nicht als derselbe Fehler klassifiziert werden.

## Nebenbefunde und Nichtbefunde

- **17 verworfene Deltas:** 7 `world_rule` (überwiegend rechtmäßig gegen erfundene Positionen/Zustände im laufenden Kampf), 6 `scene_context`, 2 `ambient`, 1 `no_go`, 1 `guild_canon`. Die Zahl 17 ist **nicht** die Zahl realer Enginefehler.
- **Player-Agency/Turn-in:** Die in T22 erzählte Gildenabgabe beruht auf einem bedingten `quest.turn_in` des Planners zum Spielertext „planning to turn in the contract“, gekoppelt an die Ankunft. Deren tatsächliche Ausführung ist wegen des Extraktionsabbruchs nicht bewertet. Keine Aussage über fehlende oder doppelte Gildenbelohnungen ableiten.
- **NPC-Kontinuität `.85`:** Nicht belastbar abgenommen. Die Brast-Konstellation tritt nicht erneut auf; es gibt keinen Nachweis der doppelten Rettung oder Identität, aber auch keinen vollständigen natürlichen Rückkehrtest.
- **Skills/Ausrüstung:** Flame Lance erhält echte PP; der Spieler hat noch keine Beute verkauft, keine Ausrüstung gekauft/angelegt und keinen neuen Skill freigeschaltet. Die entsprechenden Leitfadenziele blieben allein durch den frühen Abbruch unerreicht.
- **Narrator-Vertrag:** Der Runner ersetzte laut Export die Charakterbeschreibung aus dem persönlichen Profil (dort noch Revision `.49`) für seinen isolierten Lauf durch den Vertrag des aktuellen Builds `.85`. Der Run selbst nutzt damit `.85`; die **persönliche** SillyTavern-Karte ist laut Profil-Metadaten **noch nicht auf `.85` aktualisiert** und sollte unabhängig vom Fix aktualisiert werden.
- **Integrität:** Kein PageError, kein Serverfehler, keine in der ZIP erkannten Secrets; originaler Export ist unverändert.

## Empfehlung: Eine gezielte Recovery-Korrektur vor dem nächsten Langlauf

1. **Zuerst gegen `.85` reproduzieren:** beide unbearbeiteten Extractor-Antworten aus Calls 58 und 59, vollständiges Schema, generierte Repair-Nachricht, erwartete `object.new`/`object.move`-Verknüpfung. Prüfen, warum das Modell den generischen Fehler falsch deutet, obwohl `{"new":"name"}` im Schema existiert.
2. **Kleinster geeigneter Patch:** für diesen bekannten Fehlertyp präzise, schemabezogene Repair-Hilfe beziehungsweise einen bewährten, deterministisch sicheren Recovery-Schritt für referenzierbare neue Objekte erwägen. **Kein** pauschales Erlauben von erfundenen Objekt-IDs, kein globales Aufweichen des Validators und keine automatische Neuerzeugung aus unbekannten Strings.
3. **Gegenproben:** unbekannte Objekt-ID bleibt ungültig; echtes `{new:name}` verweist auf genau das unmittelbar angelegte Objekt; Kauf, Guild-Objekte und Auto-Loot bleiben einmalig; Replay/Swipe und Legacy unverändert.
4. **Im selben Testfall fachliche Szenenlage prüfen:** Geschenk am Wehr vor Fahrt zur Gilde, tatsächliche NPC-Präsenz und anschließend bedingte Guild-Abgabe. Keine verfrühte Zahlung oder Ortsverlagerung buchen.
5. **Eigene P2-Entscheidung:** frühere Szene T16 (illegaler Schuppenbesuch) getrennt dokumentieren; nur anfassen, wenn belastbare gemeinsame Ursache vorliegt und die Änderung klein bleibt.
6. Anschließend `npm test`, angrenzende Regressionen und realer ST-Smoke; **erst danach** ein neuer natürlicher Langlauf. Kein genereller Umbau der Quests, Kämpfe oder Dungeon-Engine.

**Status:** Review, keine Engine-Implementierung und keine Änderungen am Repository. Frühere Run-13-Reviews und die ursprüngliche ZIP bleiben unberührt.
