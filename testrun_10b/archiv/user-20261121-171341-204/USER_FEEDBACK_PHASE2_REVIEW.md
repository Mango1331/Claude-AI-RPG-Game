# User07 .204 – Spielgefühl-Fortsetzung Phase 2: Bewertung (21.11.2026)

**Originalworte unverändert:** [Userfeedback Spielgefühl(7).txt](ORIGINAL_USER_FEEDBACK_PHASE2.txt). Die spontane Wahrnehmung des Spielers bleibt als eigene Primärquelle erhalten. Diese Datei trennt sie von technischer Interpretation.

## Spielerposition

1. **Stealth:** Der angezeigte automatische „SUCCESS“-Check fühlte sich noch nicht ganz ausgereift an, obwohl die Geschichte funktionierte.
2. **Geschwindigkeit:** Normale Antworten erscheinen vergleichsweise erträglich, ohne teure Boardgenerierung. Der Spieler möchte keine bloße Verschiebung der Wartezeit ins Streaming, sondern tatsächlich früher wieder sicher eingeben können. Unverbindliches Wunschziel: einfacher Dialog ca. **20 s**, Dialog+Reise **30 s**, Kampf/Payment **40 s**, besonders komplexe Züge im Durchschnitt **unter 60 s**; Ausreißer erlaubt, solange der Mittelwert sinkt. Er fragt ausdrücklich, ob die Zahlen sinnvoll/realistisch sind.
3. **HUD:** Das Action HUD gefällt besser. Die Questboard-Buttons sind noch weiß/kontrastarm. Gewünschte Darstellung für HUD-Buttons: **schwarz hinterlegt, weiße Beschriftung, weißer Rand**.
4. **Lagerbeute:** Eine normale Suche in einem sichtbaren, bespielten Camp soll nicht wegen eines schlichten PER-Misserfolgs in absolut *keinem* Fund enden müssen. Verdeckte Funde dürfen gewürfelt werden; auch Qualität/Menge des Zusatzloot darf variieren. Die Beispielwerte „3 Silber“ versus „6 Silber und ein Schwert“ sind **nur illustrative Spielideen, keine festen Dropwerte**.

## Quellenprüfung und offene Designerwägung

- **Stealth:** Beim Verstecken war niemand aktuell präsent. `checks.js::stealthEvents` vergibt deshalb `automatic:true,success:true` ohne Wurf; später wird ein Goblin durch den Narrator als `unaware` etabliert und der Angriff erhält Ambush ×1,5. Das ist nach `.204` konsistent. Die offene Frage ist, wann neu eintretende Gegner eine eigene Entdeckungschance haben sollten, ohne Heimlichkeit bei jedem Geräusch neu zu würfeln.
- **Geschwindigkeit:** Bei **22 neuen Erzählzügen** ist die Median-Hostspanne bis Erzählende **33,46 s**, einschließlich X rechnerisch mindestens **62,61 s** (P90 **103,37 s**, Mittel **73,92 s**). Die Narratorphase allein hat Median **27,97 s**. Eine sofortige Umstellung auf harte 20/30/40/60-s-Abnahmelimits wäre damit unrealistisch für diese Providerroute; als langfristige UX-Wunschziele vernünftig. Fachlich mit Codex noch diskutieren.
- **Buttons:** Die Schaltfläche `button[data-avereth-quest]` in `src/hud.js` bekommt derzeit keine spezifische kontrastfeste CSS-Regel, anders als `.avereth-draft` und Action-Buttons. Der Nutzerwunsch ist eine konkrete kleine CSS-Aufgabe, ohne Engine-Logikänderung.
- **Camp:** Der Kampf hatte bereits automatisches Gegnerloot gebucht. Die separate Campsuche erzeugte einen **PER5-vs6**-Check (Chance **45,45 %**, Wurf **77**, Misserfolg), weshalb die Prosa *nichts Weiteres* fand. Für offensichtliche zugängliche Vorräte/Besitz der Lagerbewohner könnte die Unterscheidung „sichtbare normale Beute ohne Suchprüfung“ gegen „verborgene/zusätzliche Beute mit Prüfung“ sinnvoll sein. **Nicht** folgern, dass jedes Camp zwangsläufig Silber oder Waffen enthalten muss.

Zusätzliche im gespeicherten Lauf sichtbare Kontinuitätsrisiken (u. a. Dungeon-Raum-/Wegangebote) stammen aus dem [GPT-Review Phase 2](REVIEW_GPT_PHASE2_2026-11-21.md), nicht aus neuen Aussagen des Spielers.

**Keine Umsetzung:** Dieser Feedbacknachtrag ist Grundlage für eine spätere, unabhängige Patchentscheidung; keine Änderungen an Engine-/ST-Code.
