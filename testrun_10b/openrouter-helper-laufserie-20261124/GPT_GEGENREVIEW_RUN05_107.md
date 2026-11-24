# GPT-Gegenreview – Helferlauf 5 (107 Eingaben, .211)

25.11.2026 · Sammelphase, kein Patchauftrag. Original: `20261124-222535Z-natural_helper_progression.zip`, 22.026.087 Bytes, SHA-256 `81278a1b3f874e0a886ca9008e15a14015e5223c121a446b37b0e2ce60dd7a1d`. Alle 13 Dateien CRC-geprüft; Original nicht auf main. Ausgewertet: chat.jsonl, calls.json, run.json, evaluation.json, report.md, server.log; Ereignisse aus Chatrecords. Kein eigenständig ausgeführter Fold/Reload, kein neuer Modellaufruf. Runner meldet Profilschutz und Scan sauber; zusätzlicher einfacher Textscan nach OpenRouter-Key/Bearer-Mustern ohne Treffer, keine umfassende Freigabe personenbezogener Pfade.

## Setup und Ende

Sauberer Commit `1d3171d756f8`, Build `4.3.0-c.6.6.211`, Seed 1487494144, Mage mit Flame Lance/Arcane Ward; isolierte Startattribute alle 5→10, kein Balance-A/B. 107 Eingaben, Level 6, 47:40 Gesamt, 317 Engine-Requests (100 Plan +13 Repair; 91 Narrator; 90 X +20 Repair; 2 Board +1 Repair). 90 angewandte X-Abschlüsse, 0 endgültige X-Fails, 5 Plannerfehler sicher fortgesetzt laut Runner; 108 abgelehnte Einzeldeltas (keine Anzahl unabhängiger Ursachen). 1742 Events, exportierte Integrität OK. Alle Engine-Requests laut calls.json low/Wafer ohne Fallback; Lesepause nicht explizit exportiert. T107 Planner journey.continue, Narrator Nr.317 ohne Response; server.log HTTP 429 Wafer upstream. Runner-Ende UI/no reply, tatsächliche Providerursache getrennt. Keine pauschale Retries/Fallbacks freigeben.

## Originalbelege (T = Runner-Eingabe, JSONL-Index mit Metadatenzeile = 2*T für Spieler, 2*T+1 für Antwort; nullbasiert)

| T | Beleg | Bewertung |
|---|---|---|
| 39 | Spieler nimmt Bunk/Mahlzeit an; P commands:[]; X arrive drying shed, no_go: unfreiwillige Ursache nicht als Ortswechsel belegt; weitere scene_context | Plausible implizite Bewegung nicht gebucht; freiwillige Annahme nicht als Zwang umdeuten |
| 40 | Explizite Bitte, zum drying shed bunk getragen zu werden; P commands:[], travel_frame:stay; X arrive no_go, Folgeablehnungen | Starker Beleg für Fehlinterpretation/zu engen Vertrag, nicht bloß Modellprosa |
| 51 | quest.turn_in; coin.changed +60 cp, quest.status completed; evaluation +225 XP; zugleich object.move pc_inventory und desk_handler abgelehnt | Quest korrekt bezahlt; Ablehnungen einzeln bewerten |
| 57–65 | Mehrere Verkaufsanläufe; T65 akzeptiertes Angebot, coin.changed +80 für 3 Häute/5 Hauer, zusätzlicher coin.gift guild_payout abgelehnt | Handel tatsächlich erfolgreich, Reibung separat |
| 67 | Angebot l5: Spieler nennt elf Silber und ausdrücklich 48 cp Enginepreis; Repair agreed_cp:null; coin.changed −48, zusätzliche object.new abgelehnt | Preis/Consent und Narration prüfen; nicht ohne Originalvergleich als falsche Buchung behaupten |
| 69 | equip tatsächlich gebucht (DEF/MDEF je +3); Narrator lässt Spieler ungefragt auf Straße gehen; arrive no_go | Sinnvoller Schutz der Spielerhoheit, Gegenbeispiel für globale Lockerung |
| 79 | Flame Lance proficiency 1→2 laut coverage | Skillprogression belegt |
| 85 | quest.ready Event für Ottercats; später T106 erneut quest.ready, evaluation nennt Index 212 als letzten readiness-Beleg | Status-/Zählhistorie prüfen, nicht als zwei abgeschlossene Quests zählen |
| 89 | Explizite Annahme Schlafplatz/Porridge in Küche, coin.changed −1; arrive kitchen no_go, zwei scene_context | Bezahlte Dienstleistung, implizite lokale Bewegung nicht gebucht; Schlaf-/Heilwirkung separat prüfen |
| 99 | coin.changed +50 für 2 Pelze/4 Klauen/5 Fänge | Zweiter Verkauf tatsächlich gebucht |
| 106 | level.up 6; quest.ready erneut; kein gebuchter Abschluss der zweiten Quest | Fortschritt ja, keine erfundene Auszahlung |
| 107 | Narrator-Request 317 keine Response; HTTP 429 | Providerabbruch, nicht X oder Reisefirewall |

40 scene.moved aus Chatrecords, 32 unterschiedliche gebuchte Orte laut evaluation, 7 Kämpfe; 6 no_go und 30 scene_context (auch korrekte Ablehnungen). Die 108 Deltas enthalten ferner NPC-/Identitäts-, Quest-, Besitz- und andere Regeln. Nicht jede Folgeablehnung ist eigene Ursache. T39/40 und T89 sprechen für Untersuchung der impliziten, mitautorisierten Ortswechsel; T69 zwingendes Gegenbeispiel. T85/106 und nicht ausgezahlte zweite Quest nicht ohne Nachprüfung als Mechanikbug werten. Keine neue Engineänderung.

## Vergleich und Entscheidung

Erstmals in dieser Helferserie zwei Verkäufe (130 cp), ein Gearwechsel und eine Skill-Proficiency-Steigerung. Längster neuer Run (107 gegenüber 58); keine allgemeine Kontinuitäts-, Langzeit- oder Balancefreigabe. Historische 282–421er Runs und persönliche Tests bleiben Vergleichsreferenzen, unterschiedliche Startwerte/Modelle/Spieler beachten. Weitere Prüfung: tatsächliche Reiseautorisierung, no_go/passage/scene_context als Kaskade, Questzählung und Auszahlung, Handelsconsent sowie NPC-/Objektidentität. Bestehendes `--read-pause-ms 5000` als reine Runneroption kann Requests entzerren; es liegt nach player.decide vor driver.send, nicht zwischen P/N/X, garantiert keinen Schutz vor upstream 429. Keine Engine-/Spielerpromptänderung vor gebündeltem Review und persönlichem Test. Codex soll alle Originale unabhängig prüfen; fehlende ZIPs ausdrücklich als Beleglücke ausweisen.
