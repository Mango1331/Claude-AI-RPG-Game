# User07 .204 – GPT-Review-Nachtrag nach Codex und neuer Board-Designentscheidung

**21.11.2026 · Dokumentations- und Diskussionsstand, kein Implementierungsbeschluss.**

Quellen: [Originale und Laufindex](README.md), [Codex' unabhängiger Gegenreview](CODEX_GEGENREVIEW.md), [Nutzerfeedback](USER_FEEDBACK.md), [vorheriger GPT-Diskussionsstand](GPT_DISKUSSIONSSTAND.md). Der folgende neue Designvorschlag wurde **erst nach** Codex' abgeschlossenem Blindreview im Gespräch mit dem Spieler entwickelt. Er ist **nicht** als Codex' eigene Empfehlung auszugeben. Die Originalbefunde des Codex-Berichts bleiben erhalten.

## 1. Neue Nutzerpräferenz und Abkehr von starren Board-Pflichtquoten

Der Nutzer fragt ausdrücklich, warum ein Gildenboard zwingend eine einfache Level-1-Quest haben muss. Sein gewünschter Sandbox-Ablauf: **Die Gilde veröffentlicht gültige Aufträge ihres F-Rangs; Alaric muss nicht jeden Tag eine für ihn passende Aufgabe finden.** Wenn alle Angebote zu schwierig sind, darf er außerhalb der Gilde jagen, anderweitig Erfahrung sammeln oder das Board am nächsten Tag wieder prüfen. Die Spielwelt soll nicht ständig die perfekte Progression für den aktuellen Spieler herstellen.

**Wichtig: aktueller Codekanon:** F/Novice umfasst **Level 1–14**, nicht 1–15. Level **15** beginnt E/Proven (siehe `avereth-engine/content/rules.json`, `guild.rank_levels`). Der beiläufige Nutzerbereich „1 bis 15“ ist eine ungefähre Umschreibung, **kein Auftrag zur Änderung der Ranggrenze**.

### Nachgewiesener Auslöser in User07

- Der *erste* GLM-Boardentwurf war strukturell gültig und enthielt fünf für das bestehende Profil sonst akzeptable Aufträge. Seine anfängliche Level-1-Wolfsjagd verlangte **drei Wölfe**, nicht den zwingend vorgeschriebenen **einen schwachen Einzelgegner**.
- `guild.js::boardQuotaError()` verwarf deshalb die **gesamte** Tafel wegen einer **globalen Zusammensetzungsregel**; kein Nachweis einer unmöglichen Jagd oder defekten Kampf-/Questbuchung. In `runtime.js::generateBoard()` wurde danach ein **vollständiger zweiter Boardrequest** nötig (56,168 s). Beide Boardrequests zusammen dauerten 118,118 s.
- Die zweite GLM-Antwort ersetzte ausschließlich Slot 1; die vier anderen Aufträge blieben identisch. Daraus folgt: **Ohne genau diese starre Einsteigerquote hätte die erste Tafel im archivierten Fall angenommen werden können**, sofern die anderen bestehenden Prüfungen unverändert gelten.
- Die 56,168 s sind **beobachtete Kosten dieses Repairs**, nicht die verlässlich künftig garantierte Ersparnis einer Lockerung. Der erste Boardrequest allein dauerte 61,950 s. Gesamtwartezeit, Providerlatenz und Extraktion bleiben gesonderte Themen.

[Ergebnisse und Gegenproben von Codex](CODEX_GEGENREVIEW.md) · [Board-Quoten](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b51e850bfa233b32f10ba01c563002ab26061c85/avereth-engine/src/v4/guild.js#L985-L991) · [Generator](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b51e850bfa233b32f10ba01c563002ab26061c85/avereth-engine/src/v4/guild.js#L802-L828) · [Retry](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b51e850bfa233b32f10ba01c563002ab26061c85/avereth-engine/src/v4/runtime.js#L611-L636).

## 2. Für den nächsten Patch bevorzugte Trennung: mechanisch gültig versus bevorzugt verteilt

| Klassifizierung | Für die nächste Entwurfs-/Abnahmephase |
|---|---|
| **Weiche Vorgabe statt globaler Ablehnung** | Mindestens eine Level-1-Einzeljagd, mindestens eine mittlere F-Jagd (L4–7), mindestens eine hohe F-Jagd (L8–14) sowie eine auf den Spieler abgestimmte Staffelung. Das Modell darf Vielfalt anbieten; deren Fehlen allein macht fünf sonst gültige Aufträge nicht ungültig. |
| **Verbindliche Mechanik beibehalten** | Ranggültigkeit Novice L1–14; konsistente Questziele, Anzahl und Zuordnung der gezählten Gegner/Populationen; passende Kreaturenanker und Habitat-/Levelprofile; echte bekannte Dungeonetage, wenn angeboten; eindeutige IDs/Orte; keine inkompatiblen Dubletten; gültige Auszahlung und Buchung; gültiges Ausgabe-/Datenformat. |
| **Gesondert zu entscheiden, nicht automatisch aufgehoben** | Starre **4 Jagden + 1 Dungeon** (wenn geeignet) bzw. der bisherige feste Questtypmix: womöglich ebenfalls nur Testprofil statt notwendiger Mechanik. Seine Lockerung könnte Abwechslung erhöhen, darf aber nicht ungeprüft alte, derzeit ausgesetzte Delivery-/Escort-Mechaniken freischalten. Anzahl fünf und täglicher Turnover bleiben vorerst wie implementiert. |
| **Nicht Ziel** | Quests passend zum aktuellen Level skalieren; Level-1-Einstieg garantieren; ungültige/unerfüllbare Verträge durchwinken; Quests mehrfach in derselben Gildentafel refreshen lassen; den Rangübergang auf Level 15 verschieben. |

Die bereits bestehende **Tagestafel-Mechanik** `boardFor()` erzeugt bei erneutem Lesen *am selben Tag* keine neue Tafel; bei der ersten Lektüre eines neuen Tages wird die Tafel erneuert, alte nicht angenommene Listings verfallen. Der Spieler kann daher warten, aber keine sofortigen kostenlosen Board-Rerolls erzwingen. Die Möglichkeit, dass am nächsten Tag wieder keine passende Quest vorhanden ist, gehört zur gewünschten Sandbox und darf nicht hinterrücks durch eine garantierte Einstiegsliste kompensiert werden.

### Spielqualitätsabwägung

**Pro:** glaubwürdige Welt ohne Spieler-Skalierung, echte Risikoabwägung, größere Varianz und weniger volle Modell-Reparaturen wegen kosmetischer Quoten. **Contra:** Mehrere zu schwere Tagesboards in Folge können den Einstieg frustrieren. Dieses Risiko wird bewusst zugunsten des Sandbox-Gefühls in Kauf genommen; Warnhinweise zu Level, Gruppenstärke, Dungeonrisiko und verfügbare alternative Aktivitäten sind wichtiger als eine garantierte leichte Quest.

**Wichtig:** „Weniger streng“ meint **nicht**, die Firewall für Buchungen, Kampf, Zahlung oder Ortswechsel allgemein zu lockern. Nur Pflichtverteilungen ohne technischen Sicherheits-/Konsistenzzweck sind hier gemeint.

## 3. Bewertung gegenüber der bisherigen Codex-Empfehlung

Im ursprünglichen [Codex-Gegenreview](CODEX_GEGENREVIEW.md#3-prioritäten-für-die-gemeinsame-entscheidung) war **Präzisierung des Erstprompts zur Pflicht-Einzeljagd** Maßnahme 1. **Das bleibt ein technisch nachvollziehbarer Rat innerhalb der damaligen starren Designvorgabe**, ist nach der neu formulierten Nutzerpräferenz für die *nächste Patchentscheidung* aber **nicht mehr die bevorzugte Richtung**.

Neue bevorzugte Reihenfolge zur Diskussion:
1. **Harte globale Boardverteilungsquoten gezielt entfernen oder zu weichen Empfehlungen machen**, ohne übrige mechanische Validierung zu schwächen. Zuerst den Single-Foe-Intro-/L1-Zwang und die gestaffelten F-Mindestgruppen. Das archivierte Original-Board offline mit unverändertem Zustand und neuer Regel prüfen, ohne Modellrequests.
2. **Messstein-Routine innerhalb der bereits bezahlten Registrierung** in der kanonischen Gildenhalle belassen, ohne scheinbare `no_go`-Ortswechsel; NPC-Präsenz und behauptete Clerk-Fakten weiterhin selektiv prüfen. Primär Qualitäts-/Kontinuitätsgewinn, **kein** ursächlicher Fix für 206,320 s Narratorphase.
3. Den bestehenden **4+1-Questtypzwang** nur dann als nächste Ausweitung anfassen, wenn die tatsächlichen Questmechaniken alle künftig zugelassenen Typen sicher tragen. Im Zweifel getrennte Entscheidung nach persönlichem Weiterlauf.

**Nicht priorisieren:** automatisches Handlungszitat aus Preiszitat (Codex-Gegenprobe zeigt unberechtigte Zahlung bei semantisch falscher Modellentscheidung), pauschales Narratorverbot für Boardwiedergabe, Globalverkürzung der Character Description, Streaming als Antwort auf gesperrte Folgeeingabe. Diese Punkte bleiben wie im Codex-Gegenreview bewertet.

## 4. Erfolgskriterien, Evidenzgrenzen, Status

- **Offline am realen User07-Erstboard:** Nach Entfernen der *reinen Pflichtverteilungsfehler* wird die ursprüngliche Tafel im selben Vorzustand durch unveränderte Einzelvertragsprüfungen akzeptiert und gebucht; keine neue zweite LLM-Anfrage nötig. Keine Vertragsmenge oder Population umetikettieren, um „passt“ zu erzwingen.
- **Bei ohnehin entstehenden Folgetafeln:** messen: gültige erste Antworten / alle Erstversuche, Zahl physischer Boardrequests und Repairs, fachlich erfüllbare Quests, sichtbare Gefahrhinweise und tatsächliche Vielfalt. Kein neuer kostenpflichtiger A/B-Lauf als Voraussetzung.
- **Regressionsschutz:** kein versehentlicher `Proven`-Auftrag auf Novice-Tafel, keine ungültigen Dungeonetagen, keine doppelten gezählten Populationen, keine falschen Completion-Kriterien und keine neu freigeschalteten Questtypen ohne Abnahme. Bestehender Tageswechsel und Bestands-/Save-Pfad bleiben erhalten.
- **Ungewiss:** natürliche Verteilung unter einem geänderten Prompt und tatsächlich durchschnittlich entfallende Repairzeit. Aus **einem** Board lässt sich keine generelle Erfolgsquote berechnen.

**Arbeitsstatus:** Diese neue Richtungsentscheidung wurde **nur dokumentiert**. Keine Dateien im `avereth-engine/`-Quellcode, Preset, Lorebook oder Narratorvertrag geändert; keine Patchfreigabe, keine PR, kein Merge. Für die nächste Patchplanung müssen die tatsächlichen Änderungen und ihr Umfang weiterhin ausdrücklich festgelegt werden.
