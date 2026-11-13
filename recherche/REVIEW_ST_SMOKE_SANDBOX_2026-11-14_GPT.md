# Avereth – unabhängiger Review der isolierten ST-Smoke-Testinfrastruktur

**14.11.2026 · GPT · reiner Quellcode-Gegenreview.** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` geprüft bei HEAD `3640384da58e7c03e4c2fb4309178e7cf4094174`; Basis `.186` `13824919`. **Änderung:** drei Testinfrastruktur-Commits `249ac93`, `3e9e666`, `3640384`, kein RPG-Produktbuild. [Technische Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3640384/avereth-engine/docs/ST_SMOKE_ISOLATED.md).

**Geprüft:** GitHub-Produktdiff und tatsächliche Quellen von `tools/st_live/isolated.mjs` (241 Zeilen), `sandbox.mjs` (102), `tests/unit/st_sandbox.test.js`, die Starts der bestehenden fünf Smoke-/Setup-Skripte, `package.json`, Dokumentation `01` und `06`. **Nicht selbst neu ausgeführt:** eine echte ST-Installation, Playwright-Host-Smoke, Unit-Suite, Failsoft. Die gemeldeten **224/224 Standard**, **229/229 Failsoft**, **25/25 Wiederholungsstart**, **5/5 Sandbox-Unit-Tests**, **0 PageErrors** und der Neuaufbau aus frischem Checkout sind Ausführungsbelege des Implementierers.

## 1. Urteil

**Ziel weitgehend erreicht:** `npm run smoke:st:isolated` installiert SillyTavern 1.19.0 (`7e8663c`) unter einem eigenen temporären Sandbox-Root, startet die vorhandenen `run_c.mjs`-Standard- und Failsoft-Szenarien mit Mockprovider und legt Berichte ab. Es wird keine ST-Installation in Git eingecheckt, der laufende natürliche Batch verwendet diese Sandbox nicht, Spiel-/Kampf-/Payment-/NPC-Code bleibt unverändert. Den echten, erfolgreichen Host-Abnahmelauf akzeptiere ich **als dokumentierten Opus-Testbeleg**, nicht als unabhängig reproduziert.

**Vor dem Einsatz als dauerhaft garantierten, auch bei Fehlkonfiguration sicheren Standard** sind drei schmale Schutzverbesserungen sinnvoll. Die beschriebenen Risiken betreffen ungewöhnliche Pfad-/Parallelfälle und widerlegen die normalen grünen Testläufe nicht. **Keine neue Smoke-Architektur und keine Wiederholung der gesamten 224+229 Prüfungen für diese reine Guardkorrektur nötig.**

## 2. Schutzlücken – nach Code belegt, nicht als Schaden reproduziert

### S1 – Sperrdatei nicht atomar (relevant bei parallelen Starts)

In `isolated.mjs` geschieht `lockHolder(root)` und erst danach `fs.writeFileSync(root/.lock, pid)`. Zwei nahezu gleichzeitige Prozesse können beide „nicht belegt“ lesen und anschließend gegenseitig die Sperrdatei überschreiben. Danach können beide `npm ci`, ST-Init oder Smoke gegen dasselbe `data/default-user` durchführen. Die vorhandenen Portchecks verhindern nicht jede Installations-/Initialisierungs-Race. Dies ist eine **Race aus der Codeabfolge**, keine im erfolgreichen Lauf beobachtete Parallelkorruption.

**Kleinster Fix:** Lock mittels exklusiver atomarer Dateierzeugung (`openSync('wx')`) sichern; bestehende lebende PID strikt respektieren, für verwaiste Sperren einen kontrollierten Recheck/Recovery mit erneutem exklusivem Erwerb. Zwei gleichzeitig gestartete `isolated`-Aufrufe als Test: nur einer darf aufbauen/laufen, der zweite endet vor jeder Änderung. `--clean` darf keinen laufenden Smoke entfernen.

### S2 – Markierter Root allein schützt nicht vor verknüpften Innenpfaden (hoch bei Fehlkonfiguration)

`sandbox.mjs` `sandboxRoot` realpath-normalisiert den Root und `assertSandbox` realpath-normalisiert `AVERETH_ST_DIR`; **das ist positiv** und verhindert die gewöhnliche direkte Übergabe eines persönlichen ST. Dennoch arbeitet `isolated.mjs` beim **Setup vor dem Direkt-Skript-Guard** mit `root/SillyTavern` und prüft nicht ausdrücklich, ob `SillyTavern` ein Symlink zu einer außerhalb liegenden Installation ist. `installSillyTavern()` kann an diesem Pfad `git`/ggf. `npm ci` ausführen; `initSillyTavern()` startet ggf. dort ST. Innerhalb einer normalen markierten ST-Sandbox könnten zudem `data`/`default-user` auf fremde Verzeichnisse verlinkt sein; das Direkt-Skript prüft diese Innenpfade nicht.

**Kleinster Fix:** Vor jeglicher schreibenden Setup-/Smoke-Operation den echten ST-Checkout und die schreibrelevanten Daten-/Profilpfade als Nachfahren der **echten** markierten Sandbox validieren; Symlinks aus dem Root hinaus fail-closed verwerfen, vor `npm ci` und Erststart sowie vor den direkten Skripten prüfen. Gegenfälle gezielt mit `SillyTavern`- und `data/default-user`-Symlink auf ein außerhalb liegendes Testverzeichnis, ohne persönliche Dateien zu benutzen.

### S3 – Sonderpfade sind nicht konsequent auf die Sandbox begrenzt

`sandboxRoot()` verbietet den Repository-Root und dessen **Vorfahren**, aber nicht einen **Kindordner innerhalb des Repositories**. Ein Nutzer kann damit einen leeren `AVERETH_ST_SANDBOX=<repo>/irgendein-unterordner` markieren und mit `--clean` rekursiv löschen. Die Anleitung verspricht dagegen eine Installation **außerhalb** des Repositories.

Die direkt gestarteten Skripte prüfen zwar `AVERETH_ST_DIR`, verwenden aber `AVERETH_ST_OUT` ungeprüft in `fs.mkdirSync` und weiteren Ergebnis-Schreiboperationen. Der reguläre `isolated.mjs`-Wrapper setzt den Ausgabepfad korrekt auf `<sandbox>/out`, direkte Aufrufe erlauben aber einen abweichenden Pfad.

**Kleinster Fix:** Repository-Innenpfade als Sandboxroot ebenfalls ablehnen; Ausgabepfade direkter Smoke-Aufrufe vor ihrem ersten Schreibzugriff auf den geprüften Root begrenzen oder deren sichere Ausgabe unter `root/out` erzwingen. Gegenfälle für Pfad im Repository, fremden Ausgabepfad und gültigen Sandbox-Ausgabepfad.

## 3. Kleine Nebenbemerkung

`smoke:st:check` blendet fehlendes Playwright/Chromium bewusst aus der Blockerliste aus, da der Hauptlauf beides installieren kann. Das ist praktikabel, doch „ready“ bezeichnet damit **bereit zum automatischen Aufbau**, nicht „alle Abhängigkeiten bereits vorhanden“. Für neue Chats im Ausgabe-/Readme-Wortlaut unterscheiden; keine technische Pflicht.

## 4. Empfehlung

1. **Ein einziger Guard-Hotfix für S1–S3:** nur `isolated.mjs`, `sandbox.mjs`, die minimal betroffenen direkten Skriptaufrufe, Unit-/Gegenfalltests und Anleitung ändern. **Kein RPG-Build-Inkrement, kein Replay, keine Node-Vollsuite erforderlich**; gezielte Unit- und ein Basis-Smoke genügen, wenn der Hostpfad verändert wird.
2. Die dokumentierten erfolgreichen Standard- und Failsoft-Läufe von `.186` bleiben echte Durchführungsbelege. Erst bei späterer Änderung des Host-/Extractorvertrags wieder das vollständige Paket starten.
3. Den laufenden natürlichen Dreierbatch nicht verändern; `main` lediglich als Quellenindex/aktuellen Infrastrukturstatus pflegen.

**Kein Produktcode geändert durch diesen Review.** Es wird weder ein realer Sicherheitsvorfall behauptet noch die funktionierende Smoke-Infrastruktur wegen theoretischer Randfälle als insgesamt defekt eingestuft.
