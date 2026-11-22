# Run 15 – Gegenprüfung des Gear-Stapel-Fixes, Build .90

**Stand:** 25.10.2026  
**Produkt:** `4.3.0-c.6.6.90`, [Commit b47d857](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b47d85743d6fdb3644e975f826843efe73ab77ae), Parent Build .89 / `05696b4`.  
**Anlass:** Die im [Patch-B-Gegenreview](PATCH_B_CHATGPT_REVIEW.md) als P2 benannte Möglichkeit, beim Anlegen eines Gear-Stapels alle Stücke zu verbrauchen.  
**Prüfumfang:** Vollständiger Produkt-Diff, die drei ergänzten Regressionen in `tests/v4/patch_run15_gear.test.js`, `commands.js:equip/unequip`, `domain.js:object.moved/object.consumed`, `items.js:profileOf`, `content.js` und die ergänzte Fachpatchnote. **Statische Repositoryprüfung**, keine unabhängige Ausführung von Node-/ST-Tests.

## 1. Hauptbefund

**P2-Fix für die nachgewiesene Konstellation bestätigt; fachlich eng und sachgerecht.** Die neuen acht Zeilen in `commands.js:equip` werden erst nach erfolgreicher Eigentums-, Profil-, Rang- und Slotprüfung ausgeführt. Bei `qty>1` und physischem Objekt wird ein einziges Stück über den vorhandenen Eventtyp

```json
{ "t": "object.moved", "d": { "id": "<Stapel-ID>", "qty": 1, "split": "<freie separate Objekt-ID>", "to": { "consumed": "equipped" } } }
```

abgetrennt. Die Restmenge bleibt bei der ursprünglichen Objekt-ID und weiterhin in der Inventarspiegelung. Bei eigenem Profil (`own`) verweist das Item im Rüstungsslot auf die abgetrennte Objekt-ID. `unequip` bzw. Gearwechsel geben gerade dieses Stück zurück. Ein Einzelstück nutzt unverändert den bisherigen `object.consumed`-Pfad; Template-Inventar verwendet weiter `item.changed`.

Der Reducer `domain.js:object.moved` unterstützt diese Aufteilung bereits seit früheren Versionen; kein neuer Eventtyp, keine Migration, keine neuen Slots und kein dauerhaftes Register.

## 2. Prüfbarkeit und Tests

Drei neue Tests wurden dem bestehenden Gear-Testmodul hinzugefügt:

1. Kauf von zwei gleichen Chainmails, Anlegen einer Einheit, Ablegen, erneutes Anlegen, Event-Replay, JSON-Reload und reproduzierbare alternative Auflösung.
2. Bereits gehaltener Dreierstapel, absichtlich vorbesetzte `_equipped`-ID, anschließender Wechsel und Erhaltung sämtlicher Mengen.
3. Falscher Equipment-Slot oder zu hoher Rang: keine Stapelaufteilung und kein Verbrauch.

Die Fachpatchnote berichtet auf .89 **2 rot / 1 grüne Kontrolle**, auf .90 **22/22 Gear**, **337/337 angrenzende** und **1768/1768 vollständige Node-Tests**. Diese Ergebnisse sind anhand der Repository-Unterlagen nachvollziehbar, **nicht selbst ausgeführt**. Ein neuer ST-Smoke fand nicht statt; laut Diff keine Host-, Prompt- oder Vokabularänderung. Der abschließende erfolgreiche **21/21-ST-Smoke belegt .89**, nicht automatisch eine erneute Ausführung auf .90.

## 3. Enger offener Kompatibilitätsrandfall – Template-Fallback

Die Behauptung „ein physischer Gearstapel funktioniert immer“ ist durch die vorliegenden neuen Tests **noch nicht für alle historischen Datenformen** belegt.

Die neue Verzweigung `else if ((o.qty ?? 1) > 1)` trennt jede physische Objektmenge ab, unabhängig davon, ob `own` existiert. Die neue ID wird nur bei `if (own) Object.assign(item, {id, object:id})` in den ausgerüsteten Gegenstand übertragen.

**Statische Gegenprobe zur Reproduktion:** Ein historisch gespeicherter, physisch gehaltener `objects`-Stapel `qty:2`, `template` nicht gesetzt, `profile` nicht gesetzt, aber mit `name` oder `source.item`, das einem vorhandenen `content.items`-Ausrüstungstemplate entspricht. In `equip` ist dann `own=null`, während `tpl` gültig ist. Der neue Code erzeugt dennoch per `object.moved` ein abgetrenntes physisches Stück mit `holder:{consumed:"equipped"}`; `item.equipped` legt jedoch **den Template-String** statt der Objekt-ID an. `unequip` gibt in diesem Fall `item.changed` für das Template aus, statt das abgetrennte Objekt zurückzubewegen. Die Inventaridentität und gegebenenfalls die Menge würden auseinanderlaufen.

**Status:** aus Codekontrolle abgeleitete, eng begrenzte Hypothese; **kein ausgeführter roter Test, kein Fehler des natürlichen Run 15**. Die .90-Tests verwenden profilierte Gearobjekte und berühren diesen Legacy-Fallback nicht. Relevanz hängt davon ab, ob solche physischen unprofilierten Template-Stapel in historischen oder künftigen Spielständen auftreten. Eine einzige gezielte Regression mit echtem Template-Namen und korrekter Gegenkontrolle ist zur Klärung ausreichend. **Kein Architekturumbau und kein vorsorglicher großer Fix empfohlen.**

## 4. Empfehlung

**Build .90 ist für den nächsten natürlichen GLM-Langlauf freigegeben.** Die bestätigte P2-Hauptursache wird mit vorhandenen Mechanismen behoben, und die normale Gear-/Handelsfunktion bleibt unangetastet. Der schmale Template-Fallback-Randfall kann separat nachgetestet werden; er rechtfertigt derzeit keinen zusätzlichen Entwicklungszyklus vor dem Langlauf.

Die erwogene Architekturtrennung „Engine-eigene Angebotslisten statt erneut erzählter Kaufangebote“ ist weiterhin ein **offener Designvorschlag**, nicht Teil von .90. Gildenboard, Shopgenerator, Delivery, XP, Kampf und Narrator-Vertrag wurden mit diesem Commit nicht geändert.
