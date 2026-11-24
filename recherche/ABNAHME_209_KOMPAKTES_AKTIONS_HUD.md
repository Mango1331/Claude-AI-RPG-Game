# .209 · Kompakte Auswahl im Kampf

Der Patch ist für Spieler gedacht, die im laufenden Kampf gewöhnlich eine einzelne Aktion wählen und bei Bedarf eine zweite ausdrücklich hinzufügen. „Keine Nebenaktion“ ist die Vorgabe. Nach der Auswahl einer Nebenaktion erscheint „⇄ Tauschen“. Der Vorschautext nennt die erklärte Folge vor dem Senden. Eine einzelne Minor lässt sich weiterhin direkt ausführen. [Fachliche Entscheidung](GEGENREVIEW_209_KAMPF_HUD_CODEX.md)

## Was sich gegenüber .208 tatsächlich ändert

- Der vorhandene Action-Composer verwendet einen nativen Selektor und eine Tauschtaste. Eine eigene, dauernd sichtbare Reihenfolgenliste entfällt. Beim Entfernen der Minor oder Wechsel der Hauptaktion beginnt die nächste Kombination wieder in der Reihenfolge Hauptaktion → Nebenaktion. Wer nur die konkrete Minor ersetzt, behält die ausdrücklich gewählte Reihenfolge.
- Die Liste nennt Ausweichen „Distanzschutz“. Die ausführliche Auswahl beschreibt 25 % bis zum nächsten eigenen Zug. Der Kampfkern prüft beim Treffer die tatsächliche Entfernung und mögliche Deckungsdurchdringung. Ein Rückschritt ist eine eigene Wahl.
- Der bestehende Validator liefert das erreichbare Flächenband, die Treffergruppe und die Kosten einer Kombination. Der Composer zeigt die berechneten MP-/STA-Kosten jetzt auch für die einzelne gewählte Fähigkeit. Bei einer Mobility-Fähigkeit zeigt die Vorschau die gewählte Richtung. Ob ein Ziel fokussiert wurde oder die Bewegung ohne Fokus erfolgt, behält seine bisherige Bedeutung.
- Ein fehlendes Ziel oder eine ungültige Kombination bekommt einen Hinweis am Auswahlort. Der Spieler kann die Reihenfolge erneut umkehren, die Wahl korrigieren oder sie entfernen und seinen bereits eingegebenen Text frei senden. Das verhindert, dass die native Sendetaste bei einem unvollständigen HUD-Entwurf versehentlich nur den Begleittext sendet. Der bestehende Host speichert weiterhin die strukturierten Schritte; die sichtbare präzisere Beschriftung kann auch als automatisch eingesetzter Spielertext erscheinen.

Die Änderungen betreffen die Bedienung, drei Versionsangaben und die Browserprüfungen. Der Vergleichsmaßstab für Kampfentscheidungen bleibt der echte .208-Kampfkern. Dieselben Parser, Inventarbuchungen, Initiativ- und Speicherfunktionen verarbeiten den erklärten Zug. Die UI erzeugt beim Zusammenstellen der Auswahl keine Modellaufrufe.

## Platz und Bedienweg

User11 vor T13, drei Skelette auf ENGAGED, Arcane Wave und beim Paar „Ausweichen → Arcane Wave“. Beide echte Implementierungen wurden mit derselben ST-1.19.0-CSS-Datei, Chromium 156, gleicher Schrift und derselben gefalteten Welt in einem isolierten Browserrahmen gerendert. Gemessen wurde die Höhe des Composers einschließlich Zielwahl, Vorschau und Sendereihe. Das aktive Kampf-HUD steht darüber. [Reproduktionsskript](kampf_hud_209/vergleich.mjs) · [Browsermessung samt Auswahltext](kampf_hud_209/messung.json)

| Viewport · nutzbare Breite | Einzelaktion .208 → .209 | Umgekehrtes Paar .208 → .209 | Horizontales Überlaufen |
|---|---:|---:|---|
| 360 · 342 px | 445 → 389 px (−56) | 491 → 435 px (−56) | keines in beiden Armen |
| 800 · 782 px | 253 → 220 px (−33) | 304 → 271 px (−33) | keines in beiden Armen |

Im zweiten Vergleich habe ich beide Extensions im vollständigen SillyTavern-Chat auf zwei frischen Datenwurzeln gestartet und dieselbe gespeicherte User11-Szene geladen. Der ST-Standardstil lässt durch Chatlayout und Innenabstände weniger Fläche für die Aktion. Deshalb fällt der Höhengewinn im echten Host teilweise kleiner aus als im Komponentenversuch. Der Hostvergleich verwendet null Modellgenerierungen. [Messung im vollständigen Chat](kampf_hud_209/st-layout.json) · [Ausführbarer Hostvergleich](kampf_hud_209/host.mjs)

| ST-Viewport · nutzbare Breite | Einzelaktion .208 → .209 | Umgekehrtes Paar .208 → .209 | Horizontales Überlaufen |
|---|---:|---:|---|
| 360 · 231 px | 544 → 511 px (−33) | 590 → 569 px (−21) | keines in beiden Armen |
| 800 · 671 px | 284 → 279 px (−5) | 335 → 302 px (−33) | keines in beiden Armen |

Nach der gemeinsamen Wahl von Skill und Band braucht die Soloaktion in beiden Oberflächen null zusätzliche Betätigungen. Für ein Paar in Standardreihenfolge ergeben sich zwei zusätzliche Mausbetätigungen (Liste öffnen, Minor wählen). Für das umgekehrte Paar sinkt der Weg von vier auf drei. Die neue Taste wurde zusätzlich mit Enter betätigt. Die Klickzahlen beschreiben den Bedienweg. Menschliche Reaktionszeit oder ein natürlicher Latenzgewinn wurden nicht gemessen. [Mobiler Vergleich .208](kampf_hud_209/mobil-208.png) · [Mobile Ansicht .209](kampf_hud_209/mobil-209.png)

## Gegenproben

| Fall | Erwartung und beobachteter Prüfpunkt |
|---|---|
| User11 T13, reine Wahl und Paar nachträglich bearbeiten | Nur Major, Major → Minor, Minor → Major, Wechsel Ausweichen → Rückzug, Entfernen und neue Annäherung. Die strukturierten Schritte stimmen mit der Reihenfolge überein. Die Vergleichsprobe reproduziert in .208 die verdeckt erhaltene Umkehr. |
| User11 T12, offener First Strike | Rückzug vor Wave gegen eine Gruppe auf SHORT zeigt das tatsächliche Angriffsband MEDIUM. Der User10-Originaltest führt beide Folgen ohne Planner aus, prüft acht Ziele, einmalige Kosten und dieselben Events nach Swipe, Regenerate und JSON-Roundtrip. |
| Kontrollierte Varianten von T13 | Auf MEDIUM lässt sich Wave vor dem Rückzug ausführen. Nach dem Tauschen liegt das Ziel auf LONG, der Grund erscheint, Senden entfällt. Erneutes Tauschen stellt die gültige Wahl her. Bei geteilten Bändern wechselt die tatsächliche Treffergruppe nach einer vorangestellten fokussierten Annäherung von Skelett A/B auf A/C. Bei 0 MP zeigt der Composer den Ressourcenfehler. Entfernen lässt den Freitext intakt. |
| Einzelne und zusätzliche Mobility | Auf einer lokalen Kopie wurden Blink, Quickstep und Evasive Step sowohl dem Blatt als auch den für die Begegnung festgeschriebenen Fähigkeiten zugewiesen. Die Auswahl funktioniert einzeln und mit Wave, für beide Richtungen und mit gültigem Ziel. Die absichtlich ergänzten Fähigkeiten gehören nicht zum originalen User11-Mage. |
| Textmodi und Weltabschluss | Die Originalregression prüft eine vereinbare Bewegung im freien Begleittext, einen echten Widerspruch, den unveränderten Eröffnungs- und Ambushpfad und die einmalige Buchung. Die ST-Prüfungen ergänzen native Eingabe, Speichern, Read-back und Reload. |

Im ST-Failsoft-Protokoll hat der reine HUD-Zug genau die Modellrollen Narrator und Extractor. Die sechs gemischten User05-Originaleingaben I42 bis I52 durchlaufen jeweils zusätzlich den Planner. Auswählen, Tauschen, Ersetzen und Entfernen lösen selbst keinen Request aus. Die Bedienzeit eines Menschen und die Wartezeit eines echten Providers bleiben offen.

## Technische Schlussabnahme

**GO für einen persönlichen UX-Test.** Entwicklungsbranch `experiment/209-compact-action-hud`, Remote-HEAD `a854cd6759712571f078bff52e7fe439858b8454`, direkter Elterncommit `cb1eb944a041b26be9210199d780be9ff740f74d`. Alle folgenden Prüfungen wurden selbst ausgeführt. Die vier Laufzeitdateien lassen sich anhand ihrer SHA-256 mit den vor dem Commit geprüften Dateien vergleichen. [Produktcode-Diff](https://github.com/Mango1331/Claude-AI-RPG-Game/compare/cb1eb944a041b26be9210199d780be9ff740f74d...a854cd6759712571f078bff52e7fe439858b8454) · [ST-Prüfergebnisse und Dateifingerprints](kampf_hud_209/st-abnahme.json)

| Prüfung | Ergebnis |
|---|---|
| Gezielte Node-Regressionen | 57/57 bestanden. Darunter beide Erstschlagreihenfolgen, Mischtext, Ressourcen, Swipe, Regenerate und einmalige Buchung. |
| Vollständige Node-Suite | 3.472/3.472 bestanden, null übersprungen. |
| Replay | 2.235 verglichen. Alle 1.192 bereits genehmigten Abweichungen zur historischen Langzeitbaseline entsprechen exakt ihrem Sollfingerprint. Null neue Abweichungen. |
| Isolierter ST-Standard-Smoke | 378/378, 351 lokale Mockrequests, null Browserfehler. |
| Isolierter ST-Failsoft-Smoke | 384/384, 358 lokale Mockrequests, null Browserfehler. |
| Zusammenhängender Spielpfad | 75/75, 71 lokale Mockrequests im gesamten Prüfmodul. Vierertafel, Questannahme, Reise, Hindernisse und Erstschlag liefen durch. Der gesicherte letzte Spielerzug führte zuerst die Bewegung, dann den Angriff aus. Narrator und Extractor liefen je einmal. Die Quest war aktiv, Alaric hatte 18 HP und 58 MP, der Weltabgleich war angewandt. Read-back und Reload-Prüfung bestanden. |

Ein früherer Standarddurchlauf mit 373/373 diente als Zwischenprüfung. Die endgültigen Zähler enthalten die fünf zusätzlichen HUD-Prüfungen. Die finale Einzel-Mobility-Auswahl bewahrt sowohl die freie Bewegung ohne Ziel als auch das im alten HUD explizit fokussierte Ziel, einschließlich Rückbewegung. Die Entscheidung für die persönliche Erprobung betrifft Auffindbarkeit, Lesbarkeit und Bedienkomfort. Touch-Bedienzeit, individuelle Themes und die langfristige Kampfbalance sind offen.

## Reproduktion

Die Skripte liegen neben den Messdateien. Sie verwenden getrennte Engine-Checkouts, den User11-Originalchat von main sowie lokales Chromium mit Playwright. Der vollständige Hostvergleich liest die Testkarte aus einer markierten ST-Sandbox mit vorausgegangenem Standard-Smoke und legt pro Arm eine frische Datenwurzel an. Ein eigener Browserpfad kann über `AVERETH_CHROMIUM_EXECUTABLE` angegeben werden.

```sh
node host.mjs "$ENGINE_208" "$ENGINE_209" "$MARKIERTE_ST_SANDBOX" "$USER11_CHAT" "$AUSGABE"
node vergleich.mjs "$ENGINE_208" "$ENGINE_209" "$ST_119" "$USER11_CHAT" "$AUSGABE"
```

Im .209-Verzeichnis `avereth-engine/` liefen die gezielten vier Testdateien `tests/v4/user10_phase208.test.js`, `action_input.test.js`, `action_persistence.test.js` und `action_request_control.test.js`. Vollprüfung mit `npm test`, `npm run replay:check` und dem markierten lokalen ST-Runner `tools/st_live/isolated.mjs`. Der isolierte Host nutzt ST-Commit `7e8663cd9c184a550b37238218bdd32c6efc68e9` und einen lokalen Mockprovider.

## Manueller Wechsel aus einer vorhandenen .208-Installation

Für ST im bestehenden Extension-Ordner die vier Laufzeitdateien `manifest.json`, `style.css`, `src/action_composer.js` und `src/util.js` ersetzen, dann ST bzw. die Browserseite neu laden und die Anzeige `4.3.0-c.6.6.209` prüfen. Wer den vollständigen Checkout synchronisiert, übernimmt zusätzlich die Buildangabe in `package.json`. Die beiden geänderten Dateien unter `tools/st_live/` gehören zur Testumgebung. Es gibt keinen Inhalt, den der Spieler als Charakter, Preset oder Lorebook importieren muss.
