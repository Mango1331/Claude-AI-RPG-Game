# Patch 9C-2b: Skill Stones und Lernmaterial (4.3.0-c.6.6.46)

Basis `cdd610d` (.45). Zwei neue Erwerbswege neben dem Lehrer, auf demselben Kern: Composer, Forge, Validator, Inventar, Growth-Vorhaben und gemeinsamer Abschluss. Nur Regelstand 2 und der Planner-Pfad (C).

**Nicht Teil von 9C-2b:**
- neuer Passive-Erwerb, spontane Durchbrüche, Skill-Evolution;
- NPC-Signaturen, E-Rang;
- Burn/Slow, Balancing, Runner- oder Performance-Umbauten.

## 1. Quellenprofile (`src/v4/items.js skillSource`)

Ein Gegenstand wird nur dann zur Quelle, wenn beides zutrifft:

| Bedingung | Prüfung |
|---|---|
| Die Art ist erkennbar | Skill Stone über die Namenswörter in `rules.json growth.sources.stone_words`; Manual über `manual_words` oder `kind: document` |
| Das Gelehrte ist belegt | Die Geschichte oder das Angebot hat festgelegt, was er lehrt (`teaches`) |

**Profil** `{kind: 'skill_source', source: stone|manual, title, rank, fn, tags, aspects, value_cp}`:
- Es ist keine fertige Skilldefinition.
- `fn` nur, wenn es eine Composer-Funktion ist; sonst `null`. Ein solcher Gegenstand lehrt nichts.
- Tags und Aspekte nur, soweit die Technik sie unterstützt. Nicht unterstützte werden weggelassen, nichts wird ergänzt.
- Der Rang kommt aus dem Namen, sonst F.

**Wo es entsteht:** Das Profil wird einmal bei der Etablierung festgelegt und mit dem Objekt gespeichert. Die Wege sind die bestehenden:
- `object.new` des Extraktors (Fund, Geschenk);
- eine Angebotszeile; das Profil wird mit dem Angebot fixiert und beim Kauf auf das Objekt übernommen;
- Engine-eigene Objekte.

Spätere Erzählung ändert es nicht, weil Objekte nicht neu angelegt werden. Ein gewöhnlicher Stein, ein Return Stone, ein Bilderbuch oder ein Stein ohne belegte Lehre ist keine Quelle.

**Extraktor:** `extract-5.2`, `delta-1.1`.
- `object.new` und `offer_line` tragen `teaches: {source, fn, tags, aspects} | null`. Felder, die die Antwort nicht nennt, sind `null`.
- Neue Regel: Benutzen, Aktivieren, Studieren und Lesen sind Spielerhandlungen, nie ein Delta. Was er lernt, bucht die Engine.

**Anzeige:**
- Katalog: `OBJECTS … Skill Stone · F · holds Fire bolt`.
- `#bag` zeigt dieselbe Angabe.
- Inventarzeile im Narrator-Kontext.
- Der Preis wird gegen `value_cp` (Stone 400, Manual 120) geprüft; das ist nur ein Audit, keine Ablehnung.

## 2. Skill Stone (`use` und gemeinsamer Abschluss)

**Prüfung im `use`-Handler** (`stoneActivation` in `growth.js`):
- Regelstand 2 und Planner-Pfad;
- kein laufender oder zugesagter Kampf;
- der Gegenstand gehört ihm und ist noch da;
- Rang des Gegenstands (`rankRefusal`) und Rang der Technik (nur F);
- eine Technik ist benannt;
- die Technik ist noch nicht bekannt;
- je Gegenstand eine Aktivierung pro Nachricht.

Der Handler bucht dabei nichts. Er merkt die Aktivierung nur im Outcome vor (`booked.activations`, Schlüssel `stone:<objekt>:t<zug>`).

**Abschluss** (`withGrowth` und `finalizeGrowth`):
- Die Aktivierung läuft mit den bereiten Lehrer- und Material-Vorhaben durch dieselbe Forge (Name und Flavor, ein Aufruf pro Zug, eine Reparatur, Composer-Fallback).
- Auf einer privaten Kopie wird alles noch einmal geprüft.
- Dann wird gemeinsam gebucht:
  - `growth.opened` (das transiente Vorhaben, sofort bereit);
  - `skill.defined`;
  - `skill.learned`;
  - `growth.closed`;
  - `object.consumed` für genau eine Einheit.
- Keine Trainingszeit. Keine neuen Eventtypen.

**Fehlschlag** (zum Beispiel kein freier Name): Nichts wird gebucht, der Stein bleibt ganz. Der Narrator-Kontext erhält `NOT LEARNED — … The stone stays whole and his`, der System-Block `NOT LEARNED — …`.

**Gemeinsame Grant-Funktion:** Lehrerziele und Stones nutzen denselben Schritt aus Komposition, Forge-Name, Definition, Lernen und Abschluss. Die Effektbeschreibung der Engine nennt die Quelle: „taught by …“, „studied from …“ oder „drawn from a Skill Stone (…)“.

## 3. Lernmaterial (`learningActivity`)

**Planner:** `activity train/study` erhält das Argument `material` (Objekt-ID, Vokabular `cmd-1.2`), dazu Planner-Regeln mit einem Beispiel. Eine bloße Lektüre ist `use` und ergibt „READS …“: kein Skill, keine LP.

**Welches Material zählt:**
- das genannte Material;
- sonst, ohne Lehrer, das eine gehaltene Manual, das die genannte Technik lehrt;
- oder, ohne genannte Technik und ohne offenes Vorhaben, das eine gehaltene Manual.

Bei mehreren Kandidaten wird nicht geraten.

**Technik:** Sie kommt aus dem Profil. Widerspricht die Nennung des Spielers, wird abgelehnt („teaches guard (Defense), not bolt“).

**Vorhaben:**
- Die erste Session bindet das Material als Quelle: `source {kind: material, object, key: mat:<id>}`.
- Jede spätere Session ohne Lehrer verlangt, dass er dieses Material hält.
- Sessions zählen als Eigenstudium mit Tageskonto, Affinität und Tageskappe aus 9C-1 (`self`). Neue Ledger-Art und neue Rate gibt es nicht.
- Das Material wird nicht verbraucht. Ein Lehrer mit Zusage kann dasselbe Vorhaben weiter unterrichten.
- Die Fähigkeit entsteht erst über den gemeinsamen Abschluss.

## 4. Texte

- `content.10.r2`: drei Quellen. Fund, Untersuchung, Lesen und Aktivieren sind kein Erwerb, bis die Engine NEW SKILL nennt.
- Narrator-Vertrag v4, Revision **4.3.0-c.6.6.46**: Studium eines Manuals und Berührung eines Steins sind Mühe und Entdeckung, kein Erwerb. Ein Stein hält nur, was die Engine zeigt, und ist erst mit der Buchung verbraucht.
- Die persönliche ST-Karte muss aktualisiert werden; der Live-Runner übernimmt den Vertrag in sein isoliertes Profil.

## 5. Tests und Grenzen

`tests/v4/patch9c2b.test.js` (11):

| Nr. | Inhalt |
|---|---|
| Profile | Erkennung, Herkunft, nichts ergänzt |
| 1 | Stone aus einem Angebot der Erzählung: Kauf, Aktivierung, Forge, atomare Buchung, einmaliger Verbrauch, Kampfeinsatz |
| 2/3 | Primer als Geschenk der Erzählung; Studium über vier Tage mit Tageskappe; Primer bleibt; Guard erlernt und im Kampf genutzt |
| 2 | Gebundenes Material nötig; Bilderbuch keine Quelle; ohne Quelle Ablehnung; Material ohne genannte Technik; widersprechende Technik |
| 4 | Fremder Besitz (Guard `not_held`); keine benannte Technik; E-Rang; Stapel mit Dopplung; Kampf; Wunsch (`wish`) |
| 5 | Atomarer Fehlschlag |
| 6 | Forge-Fallback; Regenerate; Edit; Reload/Replay; echter Board-Retry mit Stone |
| 8 | Legacy |
| 9 | Erzählung und Fakten buchen nichts |

Die Lehrer-Tests aus 9C-1/9C-2a laufen unverändert weiter. Angepasst wurde nur die Meldung „a new technique needs a source“.

**Grenzen**
- Nur F/C1 und die fünf Composer-Funktionen.
- Quellen entstehen nur aus Erzählung, Angebot oder Engine-Objekten mit belegter Lehre. Engine-Loot oder Guild-Angebote für Stones gibt es noch nicht.
- Ein Studium ohne `learn`, `teacher` und `material` bleibt ein gewöhnliches Studium; der Planner muss das Material nennen.
- Material-Studium nutzt die Eigenrate (Abstimmung in 10B).
- Live-Ergebnisse liegen noch nicht vor.

## 6. Review-Korrektur (4.3.0-c.6.6.47)

Zwei Randfälle aus dem Git-Review von `.46`, beide mit Rot/Grün-Regressionen. Es gibt keine Architektur-, Forge-, Inventar- oder Growth-Umstrukturierung.

**R1 – Skill Stone ohne belegte Lehre.**
- Ein Gegenstand, der dem Namen nach ein Skill Stone ist, aber kein Quellenprofil hat (nie `teaches`), wurde vom allgemeinen `use` als Werkzeug behandelt („the story tells what it achieves“).
- Jetzt wird er auf dem Planner-Pfad unter Regelstand 2 ausdrücklich abgelehnt („what it holds was never established“). Der Stein bleibt ganz, nichts wird gebucht.
- Ein manualartig benannter Gegenstand ohne Profil wird mit „READS … teaches him nothing by itself“ gelesen.
- Erkennung nur über den Namen (`namedSource`), nie als Profil. Legacy bleibt unverändert.

**R2 – Quelle beim Abschluss.**
- Ein bereites Vorhaben, das aus einem Manual gelernt wurde, wird nur vergeben, solange er dieses Manual hält.
- Gibt er es im selben Zug weg, bleibt das Vorhaben mit seinen LP bereit. Narrator und System-Block melden in diesem Zug „NOT LEARNED YET … he needs … in hand“; in späteren Zügen schweigen sie.
- Sobald er das Manual wieder hält, vergibt der nächste reguläre Zug den Skill genau einmal.
- Solange es fehlt, entsteht kein Forge-Entwurf.
- Die Lernzeile eines vollständigen Vorhabens sagt jetzt bedingt: „he knows a new Skill only if the engine names it below“.

Tests: `tests/v4/patch9c2b.test.js` (13). Die beiden neuen Fälle sind mit den `.46`-Quellen rot und mit `.47` grün.
