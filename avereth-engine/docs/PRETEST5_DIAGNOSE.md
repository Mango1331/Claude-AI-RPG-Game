# Pre-Test-5-Diagnoselauf (24.09.2026)

Dieser Lauf diente nur der Diagnose. Test 5 startet danach in einem frischen Chat.

**Grundlage:** Chat-Datei (15 Nachrichten), Server-Log (8 Anfragen mit Antwort), Event-Export.

**Aufbau des Laufs:**
- Modell Qwen/Qwen3.8-27B, Reasoning effort low, Max Response Length 4.096, Streaming aus.
- Megumin nach der Checkliste geändert.
- Start vor Ashbridge.

**Messung:** `node tools/run_report.mjs <Server-Log> <Chat.jsonl>`.

## 1. Warrior ohne Starter-Gear: Ursache

Der Pfad in der Engine (`creation.completed` → Events → `fold()` → Zustand → HUD, `#equipment`, Engine-Block) war nicht die Ursache. Mit echten Warrior-Skills ergibt er HP 85/85, Starter Longsword [F] (ATK 6) und Starter Heavy Armor [F] (DEF 6, MDEF 2); das zeigen Test und Live-Lauf.

Die Erstellung wurde in diesem Lauf nie abgeschlossen:

| Zug | Engine (Event-Log, Engine-Block) | Erzähler (Antwort) |
|---|---|---|
| 1 „Warrior“ | `creation.class_selected`. Der Engine-Block listet den echten Pool (Heavy Slash, Guard, Power Strike, Quick Slash, Charge, Deflect) „with these exact values“. | Präsentiert einen **erfundenen** Pool: Cleave, Iron Guard, War Step, Shield Bash, Battle Cry. Kein Report. |
| 2 „Cleave + Iron Guard“ | `creation.invalid` („Select exactly 2 distinct Skills.“, erkannt wurde nur Guard). Der Engine-Block sagt: „not a valid creation choice … Repeat the current creation step“. | Erzählt trotzdem „Cleave — CONFIRMED … CHARACTER CREATION COMPLETE … No weapon.“. Der Report `{"new": {"class": …}}` wird abgelehnt. |
| 3–6 (Tor, Registrierung, Gilde) | Jede Eingabe wird `creation.invalid` („no Skill from the pool named“). Die Spielzeit steht, nichts wird festgehalten. | Erzählt die Geschichte weiter, ohne Report. |

**Ursache:** Die Menüschritte der Erstellung liefen über den Erzähler. Ein Modell, das den vorgegebenen Pool ersetzt und die Ablehnung der Engine übergeht, lässt die Kampagne unsichtbar in Schritt 2 stehen. Der Spieler hat die Ablehnung nie gesehen: Es gab kein System-Panel dafür, nur Text für den Erzähler.

**Fix:** Die Engine beantwortet die Erstellung selbst, auf demselben Weg wie `#`-Befehle.
- Es gibt ein System-Panel und keinen Erzähler-Aufruf; die Zeile wird aus späteren Prompts ausgeblendet.
- Das Panel zeigt den echten Pool mit Werten, das Starter-Gear im Voraus, den Grund einer Ablehnung und die erkannten Skills („Recognized: Guard“). Zum Abschluss zeigt es den fertigen Bogen.
- Eine Story-Nachricht vor dem Abschluss bekommt sofort das Panel „The story begins once character creation is complete.“ statt eines stillen Hängers.
- Der erste Story-Zug sagt dem Erzähler, dass die Erstellung abgeschlossen ist und das Menü der Begrüßung nicht mehr gilt.
- Ein alter, hängender Chat erholt sich: Die nächste Nachricht bekommt das Panel, eine echte Wahl schließt die Erstellung ab.

## 2. HP während der Erstellung

- 80/85 („lightly wounded“) stand nur im Zwischenschritt zwischen Klassenwahl (VIT +1 → Max HP 85) und Skill-Wahl.
- `creation.completed` setzt HP/MP/STA auf Maximum: 85/85 (unhurt), geprüft in Test und Live-Lauf.
- Nicht geändert. Das Panel des Zwischenschritts nennt jetzt nur die Maximalwerte.

## 3. Befehle sind sofort da

- `#equipment` erzeugte keine Anfrage im Server-Log (8 Anfragen bei 9 Eingaben inklusive Swipes) und stand in derselben Sekunde im Chat.
- Zwischen Spielernachricht und Generierungsstart (`gen_started`) vergehen Millisekunden.
- Der feste Anteil jeder Anfrage liegt bei ≈ 4,5 s (Abschnitt 4). Darin stecken Prompt-Verarbeitung, Netz und Engine zusammen, für die Engine bleibt also praktisch nichts.
- Die Erstellung läuft jetzt ebenso schnell. In diesem Lauf kosteten ihre zwei Erzähler-Aufrufe 91 s.

## 4. Latenz normaler Züge

| Anfrage | Prompt | Output | davon Reasoning | Prosa | Dauer | Token/s |
|---|---:|---:|---:|---:|---:|---:|
| 1 Warrior | 10.299 | 669 | 389 (58 %) | 280 | 41,0 s | 16,3 |
| 2 Cleave + Iron Guard | 10.613 | 906 | 483 (53 %) | 349 | 50,2 s | 18,1 |
| 3 zum Tor | 10.817 | 1.864 | 1.130 (61 %) | 734 | 105,7 s | 17,6 |
| 4 Registrierung | 11.769 | 1.732 | 1.310 (76 %) | 422 | 97,5 s | 17,8 |
| 5 Registrierung (Swipe) | 11.769 | 1.055 | 864 (82 %) | 191 | 60,6 s | 17,4 |
| 6 Nachbardorf | 11.032 | 1.216 | 634 (52 %) | 582 | 68,2 s | 17,8 |
| 7 Gildenhalle | 11.557 | 1.925 | 1.195 (62 %) | 730 | 104,3 s | 18,5 |
| 8 Gildenhalle (Swipe) | 11.557 | 1.864 | 850 (46 %) | 1.014 | 100,4 s | 18,6 |

- **Dauer = 4,5 s + 52,7 s je 1.000 Output-Token** (R² 0,995), also ≈ 19 Token/s.
  - Der feste Anteil (Prompt verarbeiten, Netz) liegt bei ≈ 4,5 s.
  - Der Rest ist reine Ausgabe.
- **Reasoning ist trotz „low“ 61 % des Outputs**: 6.855 von 11.231 Token, also ≈ 361 von 628 s Generierung.
- `cached_tokens` war immer 0. Bei 4,5 s festem Anteil würde Caching wenig bringen.
- **Der Prompt ist sauber.** Dossier, NPC-Bank, `<Blocks>`-Templates und Tracker im Verlauf stehen überall auf 0; die Megumin-Checkliste greift. Das Verlaufsfenster hält 4 Spielernachrichten.
  - 10,3–11,8k Token: Megumin-Basis ≈ 5,2k, Vertrag ≈ 3,8k, Lore 0,6–0,8k, Verlauf 0,4–1,6k.
  - Der Engine-Block war hier klein (0,25–0,46k), weil die Kampagne in der Erstellung hing. Im Story-Modus sind es ≈ 1,1–1,5k, das sind ≈ 1 s mehr.
- **Einordnung:** Die Wartezeit liegt vollständig im LLM/API-Pfad (Ausgabegeschwindigkeit × Ausgabelänge). Einen vermeidbaren Fehler im Prompt gibt es nicht.
  - Größter Hebel: das Reasoning. Ohne Reasoning wären es bei ≈ 540 Token statt 1.400 etwa 33 s statt 78 s pro Zug. Das geht nur über Modell- bzw. API-Einstellungen, nicht über die Engine.
  - Danach kommt die Prosalänge (Megumin `<config>`: „up to 700 words“).

## 5. Weitere Befunde

| Befund | Beleg | Umgang |
|---|---|---|
| Der Erzähler schrieb in keinem Zug einen `<avereth>`-Report | Event-Log: `report.missing` in allen Antworten außer Zug 2 | Alle Züge liefen im Erstellungsmodus (Anweisung `{}`). Für den Story-Modus gibt es mit diesem Modell noch keinen Beleg; das ist Kontrollpunkt 1 in Test 5 ([TEST5_PLAN.md](TEST5_PLAN.md)). |
| `content_version: "2.0.0"` im Export bei Engine 3.0.0 | Event-Log `campaign.started` | Content-Manifest auf 3.0.0 gesetzt; der Content wurde mit V3 geändert. Nur Metadaten. |
| „creep up“, „sneak closer“, „get closer“ zählten nicht als Annäherung | beim Aufbau des Warrior-Live-Tests gefunden, nicht in den Artefakten | Ein Nahkampf-Hinterhalt aus SHORT war mit diesen Worten unzulässig. Die Bewegungsliste ist um diese Formulierungen erweitert, mit Test. „get up“ und „get in position“ zählen bewusst nicht. |
| Kampfzeile „Arrows 0“ beim Warrior | Live-Lauf (Warrior-Hinterhalt) | Pfeile erscheinen nur noch bei Köcher oder vorhandenen Pfeilen. |

## 6. Tests und Live-Lauf

- `tests/scenarios/creation_panel.test.js` spielt die Eingaben dieses Laufs nach:
  - Warrior-Pool;
  - „Cleave + Iron Guard“;
  - Story-Nachricht zu früh;
  - echte Wahl;
  - `#equipment`;
  - erster Story-Zug;
  - Erholung eines hängenden Chats.
- Weitere neue Tests: Annäherung im Nahkampf-Hinterhalt (`intent.test.js`), keine Pfeilanzeige ohne Köcher (`display.test.js`).
- Die Replay-Tests von Testrun 1–4 sind angepasst: Erstellungszüge liefern jetzt Panels statt Engine-Blöcke.
- **181 Tests grün.**
- **Browser-Smoke (Mock): OK**, neu `step2`, `creation` und `firstStory`.
- **Live-Smoke in SillyTavern 1.19.0: OK, 16/16.** Neu:
  - `creationBySystem`: Warrior, „Cleave + Iron Guard“, zu frühe Story-Nachricht, „Heavy Slash + Guard“, `#equipment`, alles als Panels.
  - `noLlmForCreation`: keine Anfrage für die Erstellung; die erste Anfrage ist im Story-Modus mit dem Hinweis „creation complete“.
  - `warriorHud`: HP 85/85, Starter Longsword · Starter Heavy Armor, ATK 6 · DEF 7 · MDEF 3.
  - Hinterhalt mit „I creep up and Heavy Slash the rat“: 39 Schaden, AMBUSH CRIT ×1,5.
