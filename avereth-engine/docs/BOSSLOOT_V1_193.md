# Bossloot V1 – Build .193 mit U10-Nachtrag .194

Produktbasis: `e7dac41764486a93917b8d8aadc34377c6464869` (.192),
`claude/c-planner-prototype-2026-10-02-gpt-c666`.
Dokumentationsbasis: `main` `ae0a4c63d3fcebabbdc2888cf866b8c76b2f9c1c`.
Maßgeblich sind die dort beschlossenen U1–U11 vom 15.11.2026, nicht die abweichenden
Tabellen des ursprünglichen Fachplans. Zentrale Dokumentation auf main bleibt unverändert.

## Verhalten

Der bestehende `lootEvents`-Pfad bucht zusätzlich zur vollständigen normalen Beute:

| Kategorie | Hauptfund erstmals / wiederholt | Gear / Tränke / Material |
|---|---|---|
| expliziter Elite außerhalb Dungeon-Slots | 25 % / 25 % | 50 / 30 / 20 |
| Guardian (`slot.role=guard`) | 100 % / 35 % | 65 / 20 / 15 |
| Endboss (`slot.role=boss`) | 100 % / 60 % | erstmals 100 / 0 / 0; wiederholt 70 / 30 / 0 |

Gear-Qualität fine/superior/exceptional: Elite 90/10/0; erster Guardian 50/48/2,
wiederholter Guardian 75/25/0; erster Endboss 0/90/10, wiederholter Endboss 60/37/3.
Nach erfolgreichem Hauptfundwurf ersetzt ein Skill Stone diesen Fund mit 0 % für
Elite, 2/1 % für Guardian oder 6/3 % für Endboss. Ein Trankbündel umfasst zwei
einzeln nutzbare fine-Tränke, bei wiederholten Bossen drei fine/superior-Tränke.
Die erste eigene Endbossbezwingung gibt zusätzlich eine rein materielle Trophäe
(F-Richtwert 60 cp); Wiederholungen geben keine garantierte Trophäe.

Gear kommt zu 70 % aus dem Pool der Basisklasse, sonst aus einem kleinen festen
Körperplan-/Themenpool. Die Pools referenzieren ausschließlich unterstützte `gearBases`.
Gegnerrang und Belohnungsrang stimmen überein. Profile und Nutzbarkeit kommen aus
den bestehenden Itemfunktionen, insbesondere `balance:true` für F-Waffen/Foki und
`teaches:{source:'stone',fn,tags:[],aspects:[]}` für Skill Stones.
Material ist ein handelbares Ressourcenobjekt ohne Wirkung. Richtwerte sind keine
garantierten Verkaufspreise. Keine Passive Stones, keine frei erfundenen Effekte.

## Buchung, Historie und Darstellung

- Auswahl in `src/v4/special_rewards.js`, konfiguriert in `monsters.json loot.special`.
  Die normalen Material-, Münz-, Waffenbergungs- und Return-Stone-Schlüssel bleiben
  unverändert; Sonderwürfe lesen Seed und Slot-/Encounter-/Gegneridentität und
  verändern den RNG-Zähler nicht.
- Bestehende `object.created`-Events und der vorhandene `entity.updated {looted}`-
  Marker sind die Wahrheit. An diesem Marker wird `reward:{tier,first,solo,cycle}`
  ergänzt; es gibt keine zweite Inventar- oder Siegverwaltung.
- Erstbezwingung: Dungeon+Ebene+Rolle, aus früheren PC-Lootmarkern. Ältere Siege
  ohne Reward-Metadatum zählen; ein Zykluswechsel erneuert die Garantie nicht.
  Fremde `taken`-Slots geben keinen Sonderfund und sind kein eigener Sieg.
- Tote/geflüchtete PCs, geflohene/ergebene/lebende oder bereits geplünderte Gegner
  erhalten keine neue Beute. NPC-Verbündete mindern den bestehenden Loot-Credit
  nicht. V1 führt kein Solo-Bonus- oder Tatenbuchsystem ein.
- `rewardLines` und `rewards` sind strukturierte Präsentations-/Referenzdaten.
  `grantNames` werden ausschließlich aus tatsächlichen Inventarschreibvorgängen
  abgeleitet. Header, Wertevergleiche, Münztexte und Duplikate sind keine Gegenstände.
- HUD: separater `SPECIAL REWARD`-Abschnitt, tatsächliche Profile, Vergleich mit
  angelegter Ausrüstung, Nutzungshinweise/Rangsperre und unverbindlicher Richtwert.
  Der Narrator darf einen Fund/Hort beschreiben, keine weiteren Gegenstände,
  Eigenschaften, Räume oder Öffnungsaktionen erfinden. Gefundenes Gear muss nicht
  zuvor vom Gegner getragen worden sein. Kein zusätzlicher Loot-Modellaufruf.

## Gezielte Regressionen und Replayfreigaben

`tests/v4/bossloot193.test.js` prüft die Originale Gallery Warden (User04 vom
06.11., `enc.t22`, Nachricht 51) und Crystal Beetle/Glimmer Queen (`b17-rogue#213`),
Erst-/Wiederholungshistorie einschließlich Altbestand/taken, Ausschlüsse,
unverändertes normales Loot und RNG, stabile IDs/Regenerate/Reload/Einmaligkeit,
alle Gearbasen und Ränge, tatsächliches Anlegen/Tranknutzung/Stone-Lernen samt
Rangsperre und bekannter Technik, HUD/Narrator/Extractor-Firewall.
Die zwei ursprünglichen Pflichtproben wurden auf .192 rot ausgeführt.

Neue Liste: `tests/replay/accepted_bossloot193_vs_126.json`. Vier Records wurden
einzeln gegen .192 verglichen; alle anderen Fingerprints bleiben unverändert:

| Record | Begründete Änderung gegenüber .192 |
|---|---|
| `b17-mage#153` | Nur `2 cp` aus `booked.grants` entfernt; Geldbuchung und alle übrigen Felder/Events exakt gleich. |
| `b17-mage#167` | Nur `8 cp` und doppelte identische Knife-Namen aus `booked.grants` entfernt. Alle drei physischen Knife-Objekte bleiben gebucht. |
| `b17-mage#195` | Nur `6 cp` aus `booked.grants` entfernt; alle anderen Felder/Events exakt gleich. |
| `b17-rogue#213` | Superior F-Rank shortbow (ATK 18, Richtwert 252 cp), F-Rank Glimmer Queen Trophy (60 cp), Erstboss-Metadatum und getrennte Anzeige/Grantnamen. |

Für die Queen ergibt das Entfernen genau dieser beiden neuen Objekt-Events,
Reward-Metadaten und -Präsentation sowie der neuen Grantnamen wieder den exakten
.192-Record: drei Chitinplatten, Return Stone, Kampf, XP/Level-up, RNG und
Dungeon-Clear sind unverändert. Keine pauschale Neuberechnung alter Fingerprints.

## U10-Nachtrag – Build 4.3.0-c.6.6.194

Ausgangscommit dieses Nachtrags ist `a6a9ad68c1368de66487d9406c7c19dcd16d33d0`
auf `codex/bossloot-v1` (PR #15). Der unabhängige Review bestätigte den V1-Kern;
der historische U10-Beleg `solo` fehlte noch in den Reward-Metadaten.

`solo` wird ausschließlich aus `enc.combatants` abgeleitet: kein weiterer
Teilnehmer mit Seite `ally` oder `pc` bedeutet `true`, andernfalls `false`.
Auch ein inzwischen besiegter, geflohener oder kapitulierter Verbündeter zählt
als Teilnehmer dieses Kampfes. Neutrale, Gegner und Personen, die nur in der
Szene oder Erzählung vorkommen, begründen keine verbündete Kampfbeteiligung.

Der Boolean wird am vorhandenen historischen `entity.updated`-Reward-Marker
und in `outcome.rewards` gespeichert. Er wird nicht für Würfe, Beuteauswahl,
XP, Kampfregeln oder eine Tatenbuchmechanik verwendet. Historische .193-Records
werden nicht nachträglich umgeschrieben oder aus ihrer Prosa ergänzt.

Vier neue gezielte Regressionen prüfen Solo-Persistenz, NPC-/Kreaturenverbündete
auf beiden Seitenbezeichnungen einschließlich ausgeschiedener Teilnehmer,
negative Prosa-/Begleiter-/Neutral-/Gegnerfälle und identische übrige
Lootausgaben/RNG über Elite-, Guardian- und Bossfälle.

Replay-Nachtrag: ausschließlich `b17-rogue#213` erhält einen neuen Fingerprint.
Der Vergleich gegen `a6a9ad6` belegt genau zwei zusätzliche Felder `solo:true`
(Entity-Reward und Outcome-Reward). Entfernen dieser beiden Booleans ergibt
den exakten bisherigen Record; alle übrigen Fingerprints bleiben unverändert.

Selbst ausgeführte Abnahme des Nachtrags am 15.11.2026:

| Prüfung | Ergebnis .194 |
|---|---|
| Gezielte Bossloot-/U10-Suite | **25/25**, 0 fehlgeschlagen/übersprungen |
| Vollständiges `npm test` | **3275/3275**, 0 fehlgeschlagen/übersprungen |
| Vollständiger Replay | **2235 Fälle**, 1094 exakt akzeptierte Abweichungen gegen .126, **0 offen, 0 veraltet** |

Die vier neuen U10-Proben wurden vor der Korrektur rot und danach grün ausgeführt.
Für diesen Nachtrag wurden auf ausdrücklichen Auftrag weder ST-Smokes noch
natürliche Modellläufe ausgeführt; die folgenden ST-Zahlen gelten nur für .193.

## Abnahme des ursprünglichen Builds .193

Selbst ausgeführt am 15.11.2026 auf dem anschließend unverändert committeten
Produktcode (Node 24.22.1, SillyTavern 1.19.0 `7e8663c`, Chromium 151.0.7922.34):

| Prüfung | Ergebnis |
|---|---|
| Gezielte Bossloot-Suite | **21/21**, 0 fehlgeschlagen/übersprungen |
| Vollständiges `npm test` | **3271/3271**, 0 fehlgeschlagen/übersprungen |
| `npm run replay:check` | **2235 Fälle**, 1094 Abweichungen gegen .126 exakt begründet/fingerprintgeprüft, **0 offen, 0 veraltet** |
| `npm run smoke:st:check` | bestanden |
| Isolierter ST-Standard | **231/231**, **0 PageErrors** |
| Isolierter ST-Failsoft | **236/236**, **0 PageErrors** |

ST-Bericht dieses Laufs: `/workspace/avereth-setup/st-sandbox/out/2026-11-15T17-02-23-818Z/`.
Standard/Failsoft enthalten jeweils die sechs zusätzlichen Bossloot-Hostprüfungen.
Die Node-Suite enthält auch alle bisherigen .192-Regressionen. Keine natürlichen
LLM-Aufrufe. Der ST-Runner enthält zusätzlich `bossloot193_smoke.mjs`: Original-
Warden im echten ST-Hostpfad mit Mockprovider, tatsächlicher HUD-Text, Narrator-
Vertrag, echte Grantnamen, Extractor-Weitergabe und Save/Reload ohne Duplikat.
Er läuft in Standard und Failsoft; persönliche ST-Daten werden nie benutzt.

Keine Änderungen an Attributwachstum, Bosswerten, XP, Gildenauszahlung,
Klassenevolution, Main/Minor, Dungeonräumen oder F/E-Gearkalibrierung. Der bekannte
Konflikt F-exceptional ATK/MATK 22 > E-exceptional 20 bleibt separat zu entscheiden.
Kein natürlicher Modelllauf und kein GO für den persönlichen Spieltest; der
unabhängige Produktdiff-Review folgt getrennt.
