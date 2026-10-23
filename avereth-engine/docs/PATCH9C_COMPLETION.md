# Patch 9C-Abschluss (4.3.0-c.6.6.52): Organic Breakthroughs, Skill-Evolution, C2/C3, minimaler E-Rang, NPC-Signaturen

Grundlage: die verbindlichen Beschlüsse vom 23.10.2026 auf `main` (Datei 02 „Verbindliche Entscheidungen … Abschluss-Patch 9C“, Datei 04 „VERBINDLICHER ABSCHLUSS-PATCH 9C“), Basis `c2e5540` / `.51`. 9C-2d und 9C-3 sind **ein** Patch. 9D (Klassenidentität) folgt separat.

## 1. Grundsatz

Neue Skills, Evolutionen und Passives entstehen nur aus Belegen, die die Engine selbst gebucht hat:
- Kampfprotokolle, Proben und Training;
- nie aus Erzähltext und nie aus Extractor-Fakten.

Jede Entwicklung wird **einmal dezent angeboten**. Erst die ausdrückliche Annahme des Spielers bucht sie. Es gibt keinen Skillbaum: Eine Entwicklung ist immer **ein Schritt** aus einer geschlossenen Liste. Jeder Schritt ist ein Feature, das Validator und Kampfengine schon kennen.

Kein neuer Effekt, kein neues Statussystem, keine NPC-KI und kein zusätzlicher LLM-Aufruf in gewöhnlichen Zügen. Die Forge benennt nur, und nur zum Zeitpunkt eines Angebots.

## 2. Nutzungsbuch (`src/skills.js noteUse`, `src/v4/skill_growth.js`)

Während des Kampfs hält `noteUse` pro Skill fest, welche Muster seine Nutzung zeigte:

| Muster | Beobachtung im Engine-Protokoll | Entwicklungsschritt | Ausgeführtes Feature |
|---|---|---|---|
| `crowd` | Angriff traf, während ≥2 Gegner ENGAGED standen | Fläche um ihn (¾ Kraft je Ziel) | `area` (`caster_engaged`) |
| `closing` | Angriff mit Bandwechsel | ein Band mehr | `extra_band` |
| `cover` | Ziel in Teildeckung | Deckung ignorieren | `ignores_partial_cover` |
| `reach` | MEDIUM-Angriff auf volle Reichweite | LONG | `range.band LONG` |
| `riposte` | Gegner schlug vor seinem nächsten Zug zurück | DEF +2 nach dem Schlag | `post_attack_temp_def` |
| `layered` | Verteidigung ließ trotzdem Schaden durch | zweiter Schutz | IDR, `damage_reduction_next`, `temp_def` oder Barrier (nie Barrier + DEF-Bonus) |

Zusätzlich hält es fest, welche zwei eigenen Skills er direkt nacheinander benutzt hat.

Am Kampfende wird der Kampf nur gebucht (`growth.noted`), wenn er eine echte Herausforderung war (`proficiency.award.challenge`) und er weder starb noch floh. Pro Skill bleiben die letzten 8 Kämpfe gespeichert, jeder Kampf genau einmal.

## 3. Belege (`skillEvidence`, am Kampfende, `growth.evidence`)

- **Evolution:**
  - Ein Skill auf P5 zeigt ein Muster in **2** qualifizierenden Kämpfen, die schon auf P5 geführt wurden. Maßgeblich ist das Proficiency-Level, das im Kampf-Snapshot fixiert war.
  - Nach einer Evolution zählt der Nachfolger nur eigene Kämpfe, denn er hat eine neue ID.
  - Die Basic Attack evolviert nie.
- **Durchbruch:** Ein Muster der Basic Attack in **3** qualifizierenden Kämpfen ergibt eine neue Technik **neben** der Basic Attack. Die Basic Attack bleibt als Fallback.
- **Kombination:** Zwei eigene Skills, in **3** Kämpfen direkt nacheinander genutzt, ergeben einen davon mit dem, was der andere tat:
  - Schutz nach dem Schlag (`riposte`);
  - ein Band mehr nach Bewegung (`closing`);
  - zweiter Schutz (`layered`).

  Beide Skills bleiben erhalten.
- **Einmaligkeit:**
  - Kämpfe eines Belegs zählen nie für einen weiteren Beleg desselben Skills oder Paars.
  - Pro Skill und Art ist höchstens ein Beleg offen.
  - Entsteht aus einem Schritt eine Form, die er schon hat (gehaltene Skills, Abstammung, offene Angebote), wird kein Beleg angelegt.
- Ein Beleg erzeugt genau eine Art Entwicklung. Überleben wird zum Passive (Rare), ein Nutzungsmuster zu einem Skill.

## 4. Angebot und Entscheidung

- **Zeitpunkt:** Angebote entstehen im ersten regulären geplanten Zug außerhalb eines Kampfs (`runtime.js withGrowth`). Das kann auch der Zug sein, in dem der Kampf endet, genau wie bei 9C-2c. Es gibt keine Schlafpflicht.
- **Obergrenze:** Höchstens **3** offene Entwicklungen über alle Arten zusammen (Passives und Skills), davon höchstens **eine Evolution pro Skill**. Weitere Belege bleiben `pending` und gehen nicht verloren.
- **Angebot:** `decision.opened` mit Art `skill` und `growth.offered`. Name von der Forge (ein Aufruf, bei Regenerate wiederverwendet) oder als Fallback der Name des Schritts, etwa „Sweeping Heavy Slash“ oder „Sweeping Iron Strike“. Am Spieler ändert sich nichts.
- **Befehle (Vokabular `cmd-1.4`):**
  - generisches Paar `development.accept {offer, replace}` / `development.decline {offer}` für Passives und Skills;
  - `passive.accept`/`passive.decline` bleiben gültig. Mit der ID eines Skill-Angebots leiten sie auf das generische Paar weiter.
  - Ohne ID und bei mehreren offenen Angeboten fragt die Engine nach.
- **Annahme (`acceptSkill`):**
  - im Kampf abgelehnt;
  - auf einer privaten Kopie erneut geprüft, dann alles oder nichts;
  - Ereignisfolge: `skill.defined`, danach `skill.learned` (neue Technik, P1) **oder** `skill.evolved` (Nachfolger an Stelle des Vorgängers), anschließend `growth.decided` und `decision.closed`.
- **`skill.evolved`:**
  - Der Vorgänger verlässt `sheet.skills` und landet in `sheet.skill_history` (ID, Name, P-Stand, Nachfolger).
  - Der Nachfolger erhält **P5 / 0 PP**.
  - Die Definitionen bleiben unverändert erhalten.
- **Ablehnung:** Der Beleg ist endgültig entschieden. Eine neue Evolution braucht zwei **neue** Kämpfe.
- **Abstammung:**
  - Ein Skill, aus dem einer seiner Skills evolvierte, gilt für Lehrer, Stone und Manual als bekannt und wird nicht erneut erlernt. Das gilt auch für einen evolvierten Starter.
  - Verglichen wird nach Art, führender Disziplin und Aspekten; zurückgegeben wird der aktuelle Nachfolger.
  - Ein noch gehaltener Starter blockiert weiterhin nichts (wie in 9C-2a).

## 5. Composer, C2/C3 und E (`src/skill_composer.js developSkill`, `src/skills.js`)

- **Ein Schritt:**
  - Complexity +1; C3 ist das Ende innerhalb eines Rangs.
  - Rang und Skalierungsstats bleiben.
  - Zahlen aus der Kalibrierung der neuen Complexity (rund 85 % der Basis, 80 % der Koeffizienten), **nie unter dem Vorgänger**. Bei einer Fläche drei Viertel davon je Ziel.
  - Kosten +2 innerhalb der Kostenspanne.
  - Alle 47 Schritte über die Starter-Skills der drei Klassen ergeben gültige Definitionen.
- **Lehrer, Stones, Manuals** bleiben F/C1; C2/C3 entstehen nur durch Durchbruch und Evolution.
- **E-Rang (minimal):**
  - `skill_design.e_rank` mit provisorischen Werten (1: 18/2.0/8–14, 2: 24/2.5/12–22, 3: 27/2.7/16–30) und `effect_scale` 1.5 für Barrier- und Heilgrenzen;
  - Validator akzeptiert F und E; D–S werden abgelehnt, nie als F interpretiert;
  - `learnSkill` lehnt einen Skill über dem eigenen Rang ab (E ab Level 15);
  - kein Spielpfad komponiert E von selbst; eine Entwicklung behält den Rang ihres Skills. Es gibt keine automatische E-Hochstufung und keine künstlichen E-NPCs.

## 6. NPC-Signaturen (`signatureSkill`, `engine.js materialise`)

- **Wer:** trainierte Menschen (`training: 'trained'`) mit **vorhandenem Level ≥ 5**. Es gibt keine neue Erfahrungsstufe und kein Leveln über Rollenwörter.
- **Was:** höchstens eine Technik. Einer ihrer Starter-Skills, einen Schritt weiter entwickelt, F-Rang. Nie Fläche oder Mehrfachtreffer, nie Heal, Restore oder Blink.
- **Bestimmung:** deterministisch aus Seed und NPC-ID, ohne Würfel des Kampfs und ohne LLM. Der Name trägt den Vornamen des NPC, etwa „Bren's Rushing Quick Slash“.
- **Zeitpunkt:** `skill.defined` vor `entity.sheet_set`, also vor jedem Kampf-Snapshot.
- **Wiederbegegnung:** liest das Sheet und komponiert nichts neu.
- **Probelauf (`areaLegal`):** bucht nur auf seiner Kopie.
- **Kampf:** Die bestehende NPC-Logik wählt die Signatur als stärksten Einzelangriff bzw. als Verteidigung.
- **Grenze:** Die heutigen Templates haben Default-Level 1–3. Signaturen tauchen nur bei NPCs auf, deren Level die Engine schon höher führt. Das ist so beschlossen und als Einschränkung dokumentiert.

## 7. Passives

- **Nichtkampf-Ordinary (`deedEvidence`):**
  - 3 erfolgreiche Proben desselben Core-Stats, die die Engine selbst gewürfelt hat (`check.recorded` mit `by: engine`, nicht trivial);
  - jede an einem anderen Feature: unschädlich gemacht, durch Suche gefunden oder einer Falle ausgewichen;
  - verteilt über mindestens 2 Spieltage.
  - Ein Feature zählt einmal; Fehlschläge, Erzähler-Proben und Suchen ohne Fund zählen nicht.
  - Das Probenbuch `state.deeds` gibt es nur in Regelstand 2.
  - Ergebnis: dasselbe Ordinary-Core-Stat-Passive wie beim Training.
- **Rare-Duplikatschutz (`trialEvidence`):**
  - Ein Kampf mit denselben Gegnerarten (Anchor bzw. Template) am selben Ort (Location) wie ein früherer Rare-Beleg wird als `similar` gebucht. Er erzeugt kein Angebot und keinen Würfel, unabhängig davon, was aus dem ersten wurde.
  - Andere Gegnerarten oder ein anderer Ort qualifizieren weiter.
- Keine Passive-Evolution, keine neue Legendary-Quelle, keine B+-Slots.

## 8. Texte, Anzeige, Planner

- **Anzeige:**
  - `#skills`: offene Skill-Angebote mit Mechanik und Ersatzfolge sowie die Evolutionen („- evolved: Heavy Slash → Sweeping Heavy Slash“);
  - `#skill X`: „Evolved from …“; ein evolvierter alter Skill verweist auf den Nachfolger;
  - Ergebnis-Zeilen POSSIBLE SKILL, EVOLVED und NEW SKILL.
- **Planner:**
  - Katalogzeile POSSIBLE SKILL;
  - eine Regel für beide Angebotsarten mit generischem Befehlspaar;
  - KNOWN SKILLS nennt „evolved from“, damit der alte Name auf den Nachfolger zeigt.
- **Erzähler und Regeltext:**
  - Erzähler-Kontext: Angebote „NOT his“, gebuchte Entwicklungen mit den Zahlen der Engine;
  - Narrator-Vertrag Revision **4.3.0-c.6.6.52**;
  - `content.10.r2` mit neuem Abschnitt SKILL DEVELOPMENT IN PLAY. Klassen-Evolution bleibt gesperrt.
- **Forge:** ein Satz zum Benennen von Nachfolgern; Zahlen und Mechanik liefert weiterhin allein die Engine.

## 9. Ownership, Replay, Validierung

- `growth.noted` und `skill.evolved` gehören zu `pc.progress`; `sheet.skill_history` ist Teil des Fingerprints.
- NPC-`skill.defined` entsteht nur in Engine-Schritten. Das Probenbuch hängt an `check.recorded` und liegt in keinem Ownership-Bereich.
- `validate.js` prüft:
  - Skill-Angebote stehen auf einem angebotenen Beleg;
  - angenommene Skill-Belege haben eine Definition;
  - ein evolvierter Skill wird nicht mehr gehalten, und sein Nachfolger ist definiert;
  - ein abgeschlossenes Lernziel darf auf einen inzwischen evolvierten Skill zeigen.
- Regenerate und Reload ergeben dieselben Angebote, die Forge wird dabei nicht erneut aufgerufen.

## 10. Tests

- `tests/v4/patch9c_completion.test.js` (11):
  - Composer, Ränge und E-Prüfung;
  - Evolution End-to-End mit Flächenwirkung im nächsten Kampf;
  - nur Kämpfe auf P5, Einmaligkeit, Ablehnung, Nachfolger mit eigenen Kämpfen, kein Beleg ohne Herausforderung;
  - Durchbruch und Kombination;
  - Obergrenze und Befehls-Aliase;
  - nicht im Kampf, Regenerate und Forge;
  - Abstammung;
  - Rare-Duplikatschutz;
  - Nichtkampf-Ordinary;
  - NPC-Signaturen mit Probelauf und Kampfeinsatz;
  - Legacy.
- **Angepasst:** `patch9b1` (4). E ist jetzt kalibriert; die Ablehnung prüft künftig D.

## 11. Bekannte Grenzen und Abnahme

- **Evolution live:** P5 braucht rund 17 qualifizierende Kämpfe oder Training. Ein kurzer Live-Lauf kann das nicht zeigen, ohne Zustand zu setzen. Laut Beschluss gibt es deshalb keinen vorgetäuschten P5-Livetest, sondern nur einen kleinen Provider-Smoketest. Der lange offene Test folgt nach 9D.
- **E-Rang** ist validiert und geprüft, im Spiel aber erst ab Level 15 erreichbar.
- **NPC-Signaturen** brauchen vorhandene NPC-Level ≥ 5 (siehe 6).
- Alle Zahlen sind provisorisch; das Balancing folgt in 10B.
