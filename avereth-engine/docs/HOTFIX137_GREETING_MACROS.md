# Hotfix .137 – Kampagnenstart mit SillyTavern-Makros

Build **`4.3.0-c.6.6.137`**, Basis `019c32b` (.136). Anlass: natürlicher Batch `batch-20261031-125921Z`, alle drei
Klassen im ersten Zug mit `CAMPAIGN START HIDDEN` gestoppt („no reply after the message“).

## Ursache (gegen .136 reproduziert)

SillyTavern 1.19 hält eine Begrüßung roh (`{{user}}`, `{{pick::…}}`), bis es den aufgelösten Text in `chat[0].mes`
schreibt: beim Rendern von Nachricht 0 (`messageFormatting`) und bei der ersten Generierung (`Generate`). Baut ST einen
noch ungespielten Chat aus der Karte neu (`createOrEditCharacter`, ausgelöst durch die Chat-Umbenennung des Runners),
meldet es die Begrüßung (`MESSAGE_RECEIVED 'first_message'`) **vor** dem Rendern. Die Engine startete die Kampagne auf
dem Rohtext: `text_hash 04f093fc` (exakt der Kartentext), Startort aus dem Seed (`466297664 % 3` → Ashbridge), weil die
`{{pick}}`-Zeile keinen Ort enthält. Danach löste ST den Text auf (Alderwatch), `messageEvents()` blendete den Record aus,
und die .131-Schutzregel blockierte korrekt jeden Zug. Bis .130 hatte die Engine stattdessen still neu gestartet.

## Korrektur (minimal, kein eigener Makrointerpreter)

- `index.js` `settleGreeting`: unmittelbar vor einem Kampagnenstart (Greeting-Ereignis und Interceptor) wird die
  Begrüßung einmal mit SillyTaverns eigenem `substituteParams` aufgelöst – derselbe Schritt, den ST beim Rendern bzw. bei
  der ersten Generierung ohnehin ausführt (`{{pick}}` ist pro Chat geseedet, also identisch zur Anzeige). Damit trägt der
  einzige `campaign.started`-Record den Hash des gespeicherten Textes und den angezeigten Startort.
- Nie, sobald ein Startrecord gespeichert ist: spätere echte Änderungen bleiben `hidden`, ein über ST gemeldeter Edit
  wird wie bisher gelesen, kein zweiter Start. Bestehende kaputte .136-Chats werden nicht repariert (neuen Chat starten).
- Runner (`tools/st_live/live`): `startRecordProblem` prüft vor dem ersten Spielerzug (nach Öffnen/Umbenennen) und nach
  Zug 1: genau ein Start, nicht verborgen, kein unaufgelöstes ST-Makro im Starttext, Startort = `Location:`-Zeile.
  Sonst Abbruch `integrity_failed` vor Zug 1.
- Keine Gameplay-, Balance- oder Protokolländerung.

## Nachweise

- Neue Regressionen `tests/v4/hotfix137_greeting_macros.test.js` (9) über den echten Hostablauf mit dem Original-
  Kartentext (`tests/v4/fixtures/greeting_macros_b1259.txt`): `{{pick}}` mit allen drei Orten, nur `{{user}}`, statische
  Begrüßung, Host ohne `substituteParams`, Klassenwahl im ersten Zug, Save/Reload/Swipe, spätere echte Änderung (hidden)
  und ST-Edit (gelesen), Original-Batchchat bleibt gesperrt, Runnerprüfung. **Auf .136: 5 rot, 3 Kontrollen grün** (vor
  Ergänzung der Runnerprüfung); danach 9/9.
- Volle Suite **2532/2532**; `npm run replay:check` **2235 Fälle, 190 exakt fingerprintgeprüfte Abweichungen, 0 offen**;
  Browser-Mock-Smoke OK; echter ST-Smoke Standard **24/24**, Failsoft **29/29** (keine PageErrors).
- **Echter ST-Starttest** `tools/st_live/run_greeting.mjs` (ST 1.19.0, Chromium 153, Mockprovider, Originalbegrüßung,
  Runner-Umbenennung): Warrior, Mage, Rogue je mit Klassen- **und Skillwahl** → **26/26**, Startorte Alderwatch/Ashbridge
  je wie angezeigt, Erstellung abgeschlossen (Modus `story`, 3 Skills), keine Hinweise, gespeicherte Chats konsistent.
  Erster Lauf 25/26 nur wegen einer ST-Konsolenmeldung `AbortError` (openai.js, abgebrochene Erzählergenerierung bei
  Erstellungs-Panels); unveränderter Wiederholungslauf 26/26. Derselbe Test auf .136: Startrecord `04f093fc`/Ashbridge bei
  angezeigtem Glassmere/Alderwatch, `CAMPAIGN START HIDDEN`, „no reply after the message“ – exakt das Batchsymptom.
- Mock-Host-Tests, kein natürlicher Lauf; der nächste natürliche Batch läuft lokal beim Nutzer.
