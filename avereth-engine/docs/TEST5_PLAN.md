# Test 5: Plan

Test 5 prüft Runtime V3 ([RUNTIME_V3.md](RUNTIME_V3.md)) mit einem echten Modell. Vorher ändert sich an der Architektur nichts mehr.

**Messfrage:** Ist das Spiel mit ≈ 15.000 Prompt-Token, ohne Tracker-Output und mit Reasoning LOW schnell genug, und bleibt es genauso konsistent?

Dazu kommen zwei Beobachtungen, die sich nur mit einem echten Erzähler prüfen lassen:
1. **NPC-Persistenz:** Ein NPC hat eine bedeutsame Begegnung mit Alaric. Meldet der Erzähler Haltung, Agenda und Erinnerung? Hält die Engine sie fest? Tritt der NPC 5–10 Züge später genauso auf?
2. **Verlaufsfenster 4:** Nach einem markanten Satz eines NPCs passiert 6 Züge lang anderes, dann bezieht sich Alaric darauf. Reicht, was die Engine behalten hat?

Für beide ist die Engine-Seite schon geprüft: der Test „Test-5 scenario …“ in `tests/scenarios/runtime_v3.test.js` und der Live-Smoke in SillyTavern (Kests Karte nach dem Fenster). Offen ist nur, ob der Erzähler meldet und die Karte nutzt.

Vorlauf: Der Pre-Test-5-Diagnoselauf ([PRETEST5_DIAGNOSE.md](PRETEST5_DIAGNOSE.md)) hing in der Charaktererstellung fest. Seitdem beantwortet die Engine die Erstellung selbst. **Test 5 in einem frischen Chat starten.**

---

## 1. Vorbereitung

1. **Megumin V10 Shura** nach [RUNTIME_V3.md §9](RUNTIME_V3.md#9-megumin-v10-shura-manuelle-änderungen) ändern. Vorher das Preset exportieren (Sicherung).
2. **Karte:**
   - Beschreibung = `content/narrator/Avereth_Narrator_Contract_v3.txt` (Stand 3.3).
   - Lorebook v0.11 als Character Lore verknüpft.
   - World Info: Scan Depth 2, Budget Cap 1.800, Recursive Scan aus.
3. **Avereth Engine 3.0.0:**
   - Einstellungen auf Standard: HUD Folded, History window 4, Remove tracker blocks an, Context budget 1.400.
   - Zusätzlich **„Show last engine block“ an**. Das Textfeld zeigt den Engine-Block der letzten Anfrage; es ist das Werkzeug für die Kontrollpunkte.
4. **API:**
   - Ein Modell für den ganzen Lauf. Vergleichswerte gibt es für GLM-5.3-Flash (Testrun 4) und für Qwen3.8-27B (Diagnoselauf, Abschnitt 4).
   - Reasoning effort **low**.
   - Max Response Length 4.096.
5. **Streaming aus für den gemessenen Lauf.**
   - Bei Streaming schreibt SillyTavern nur die Anfrage ins Server-Log. Die Antwort mit ihrer Token-Zählung fehlt dann, und es gibt keine Output-Messung.
   - Die Regex-Skripte aus `regex/` trotzdem importieren; ohne Streaming schaden sie nicht.
   - Streaming lässt sich danach in ein paar Zusatzzügen prüfen: Bleibt der Report während des Streamings unsichtbar?
6. **Server-Konsole mitschneiden**, wie in Testrun 2–4: die Zeilen „Chat Completion request:“ und „Chat Completion response:“.
7. **Neuen Chat starten.**

## 2. Ablauf (≈ 15–20 Züge)

Frei spielen, aber diese Stationen einbauen. Die Zugnummern der Kontrollpunkte notieren.

| Phase | Was | Worauf achten |
|---|---|---|
| A | Klasse und Skills | Die Engine antwortet sofort mit System-Panels, ohne Erzähler. Warrior-Pool: Heavy Slash, Guard, Power Strike, Quick Slash, Charge, Deflect. Nach der Wahl: HP 85/85, Starter Longsword [F] (ATK 6), Starter Heavy Armor [F] (DEF 6, MDEF 2); `#equipment` zeigt beides. |
| B | Stadt: ein beiläufiger NPC (Torwache, Händler), dann die Gilde | Welt-HUD: Ort, Anwesende. Der beiläufige NPC bekommt kein Dossier. |
| C | **Kontrollpunkt 1:** ein bedeutsames Gespräch mit einem NPC, der wiederkommen soll (z. B. der Veteran am Questbrett). Nach einem gefährlichen Auftrag fragen, eine Warnung oder ein Versprechen herauslocken. **Den markanten Satz wörtlich notieren.** | Im nächsten Zug im Engine-Block (Textfeld) auf der Karte des NPCs: `toward Alaric: … (last change: …)`, `last meaningful: …`, gegebenenfalls `agenda: …`. Außerdem `#npc <Name>` → „Shared moments“. |
| D | Registrieren (Coin), Quest annehmen | HUD-Coin und Quest stimmen mit der Erzählung überein |
| E | Mindestens 6 Züge woanders: Weg zum Auftrag, Kampf, Beute, Rast. Wenn möglich unbemerkt nähern und aus dem Hinterhalt angreifen. Nahkampf: aus SHORT mit „I creep up / sneak closer / step in and Power Strike …“; aus MEDIUM reicht ein Band nicht. | Kampf: kein erfundener Fehlschuss, `AMBUSH CRIT ×1.5` in der Opening Action, Kampfstille. HUD-Werte (HP, STA) gegen die Erzählung. |
| F | **Kontrollpunkt 2:** zurück zum NPC aus C und sich ausdrücklich auf den alten Satz beziehen („You said …“) | Engine-Block: Karte mit Haltung, Grund, Agenda und `last meaningful`. Erinnert sich der NPC? Tritt er konsistent auf, im Ton und in der Haltung? |
| G | Reise in eine andere Stadt, am besten ein anderes Reich | Welt-HUD zeigt den neuen Ort, niemand anwesend; die Erzählung kennt die neue Region |

## 3. Kontrollpunkt 2 auswerten

Wenn der NPC sich nicht erinnert oder anders auftritt, in dieser Reihenfolge prüfen:

1. **Hat der Erzähler es in Kontrollpunkt 1 gemeldet?**
   - Prüfen: Karte im Engine-Block des Folgezugs, `#npc <Name>` → „Shared moments“; zur Not das Event-Log (Button „Export event log“).
   - Nein → Problem von Report bzw. Vertrag (Abschnitt NPC CONTINUITY). Das Fenster zu vergrößern hilft hier nicht.
2. **Stand es beim Kontrollpunkt 2 im Engine-Block** (Karte oder RELEVANT)?
   - Nein → Problem der Engine. Event-Log exportieren und mitschicken.
3. **Stand es drin, der Erzähler hat es aber ignoriert** → Problem von Modell bzw. Gewichtung im Prompt.
4. **Nur der genaue Wortlaut fehlt, der Inhalt ist da** → die erwartete Folge des Fensters. Das Fenster zählt die aktuelle Spielernachricht plus die 3 Wechsel davor. Erst wenn das wirklich stört: ein Vergleichslauf mit History window 8, bei dem nur diese Einstellung geändert wird.

## 4. Messen

```
node tools/run_report.mjs <Server-Log> <Chat.jsonl>
```

Das Werkzeug ordnet jede Anfrage über die Spielernachricht ihrem Zug zu und zeigt:

- **Prompt je Anfrage** nach Kategorien: Preset, NPC-Dossier-Anweisungen, NPC-Bank, Tracker-Templates, Tracker-Blöcke im Verlauf, Vertrag, Lore, Engine-Block, Chat-Verlauf.
  - Nach der Megumin-Änderung müssen Dossier, NPC-Bank und beide Tracker-Spalten 0 sein. Steht dort etwas, ist die Checkliste unvollständig umgesetzt.
- **Output je Antwort:** Reasoning, Prosa, Report, Tracker. Tracker muss 0 sein.
- **Dauer je Antwort**, aus der Chat-Datei, mit Mittelwert und Median.

**Vergleichswerte Diagnoselauf** (Qwen3.8-27B, Reasoning low, Megumin nach Checkliste, nur Erstellungsmodus):
- Prompt 10.299–11.769 Token;
- Output im Mittel 1.404 Token, davon Reasoning 857 (61 %);
- Dauer Median 83 s bei ≈ 19 Token/s.

Das Reasoning ist der größte Hebel: 100 Token Reasoning kosten ≈ 5 s.

**Vergleichswerte Testrun 4** (GLM, Reasoning high, Megumin mit Dossier und Blöcken):
- Prompt 15.351–26.377 Token (Mittel 21.248);
- Output 2.304 Token (Reasoning 923, Prosa 539, Report 115, Tracker 727);
- Dauer Median 134 s.

**Erwartung Test 5:**
- Prompt ≈ 11.500–15.000 Token, auch nach vielen Zügen nicht mehr wachsend;
- Output ohne Tracker;
- mit Reasoning low deutlich weniger Reasoning.

## 5. Mitschicken

- Server-Log (Konsole) und Chat-Datei (`.jsonl`);
- Event-Log (Button „Export event log“);
- Notizen zu Kontrollpunkt 1 und 2: Zugnummern, der markante Satz, was beim Rückgriff passiert ist;
- Screenshots bei Auffälligkeiten (HUD gegen Erzählung, Kampfanzeige).

## 6. Entscheidung danach

| Ergebnis | Nächster Schritt |
|---|---|
| Schnell genug und konsistent | V3 steht, nur noch Feinschliff |
| Zu langsam | Nächster Kandidat ist die Megumin-Basis (≈ 5.800 Token Stil, Bannliste, Thinking) |
| Kontrollpunkt 2 scheitert | Ursache nach Abschnitt 3 zuordnen; das Fenster nur nach einer Messung ändern |
| Kampf fühlt sich falsch an | Monster-ATK (Oger, Hirsch, Pferd) und die Schadensvarianz nach Test 5 entscheiden ([RUNTIME_V3.md §1.9](RUNTIME_V3.md#19-monster-keine-neubalance-vor-test-5)) |
