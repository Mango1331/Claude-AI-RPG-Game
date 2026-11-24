# Kontinuitätsvergleich reproduzieren

Alle Offlinebefehle beginnen an der Wurzel des Dokumentations-Checkouts. `A` und `B` sind zwei separate Checkouts mit dem Unterordner `avereth-engine`. Die Testskripte lesen die archivierten JSONL-/Gzip-Dateien. Für die Offlinebeispiele genügen Git, Node.js und die genannten Python-Abhängigkeiten. Die unten verwendeten vollständigen Git-Objekte müssen im Clone vorhanden sein. Bei einem Single-Branch-Clone können die beiden veröffentlichten Entwicklungsbranches `experiment/209-compact-action-hud` und `experiment/210-world-continuity` vorab gezielt gefetcht werden. Die Laufzeit benötigt keine Produktionsmigration. Reale Generierungen erfordern den im Versuchsprotokoll beschriebenen separaten ST-Host und ein eigenes Budget.

```bash
git worktree add --detach /tmp/avereth-reference-209 a854cd6759712571f078bff52e7fe439858b8454
git worktree add --detach /tmp/avereth-candidate-210 82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc
A=/tmp/avereth-reference-209
B=/tmp/avereth-candidate-210
D=recherche/kontinuitaet_210
R=testrun_10b/openrouter-20261124-trust-c-208
node "$D/archivreplay.mjs" "$R" "$A" "$B" /tmp/avereth-promptpaare.json.gz > /tmp/avereth-replay.json
U=testrun_10b/user-20261124-014928-208/originals
node recherche/user11_trust_208/vergleich.mjs "$A/avereth-engine" "$A/avereth-engine" "$U" A /tmp/avereth-orte-a.json.gz
node recherche/user11_trust_208/vergleich.mjs "$A/avereth-engine" "$B/avereth-engine" "$U" K /tmp/avereth-orte-k.json.gz
node "$D/objektgegenprobe.mjs" "$A/avereth-engine" > /tmp/avereth-objekte-a.jsonl
node "$D/objektgegenprobe.mjs" "$B/avereth-engine" > /tmp/avereth-objekte-k.jsonl
```

`archivreplay.mjs` erwartet die Wurzeln der Git-Checkouts, `objektgegenprobe.mjs` und der ältere Ortsvergleich dagegen jeweils den Unterordner `avereth-engine`. Im Ortsvergleich bezeichnet das vierte Argument den Vergleichsarm im Ergebnis. Die Rohdateien der beiden Läufe enthalten unter `cases`, `controls` und `accepted` die in [ortsreplays.json](ortsreplays.json) verdichteten Fallnamen und die jeweiligen `primary.hash`-Werte. Für beide Versionen wurden 27 Ausgangsfälle, 6 Absichtsgegenproben, 6 akzeptierte Ortswechsel und 13 Folgezüge wiedergefunden.

Der optionale fünfte Parameter von `archivreplay.mjs` addiert einen Offset zur lokalen ST-Zugnummer in `browserzeiten.json`. Für Fokusläufe muss der konkrete Unterordner **Szene/A** bzw. **Szene/B** mit seinen eigenen Dateien übergeben werden. Dass zwei Arme denselben Zugtag tragen, ist bei getrennten Armexporten beabsichtigt. Die physischen Request-IDs bleiben global eindeutig.

| Export | Offset | Erster lokaler Zug → physischer Zugtag |
|---|---:|---|
| Historisches B oder C, neue Kampagne A oder siebenteiliger .210-Pilot | 0 (Vorgabe) | 1 → 1 |
| Bren / Wagen / Wren | 100 / 200 / 300 | 1 → 101 / 201 / 301 |
| Grüne Tür / Tasche / Namenswissen | 400 / 500 / 600 | 1 → 401 / 501 / 601 |
| Endgültige B-Kampagne | 700 | 1 → 701 |
| Gesonderte Fortsetzung im Anschluss an den frischen C19/B-Zug | 900 | 1 → 901 |

Beispiel für Bren-B:

```bash
node "$D/archivreplay.mjs" testrun_10b/openrouter-20261124-kontinuitaet-fokus/bren/B "$A" "$B" /tmp/avereth-bren-prompts.json.gz 100 > /tmp/avereth-bren-replay.json
```

Die lokale erste Eingabe im Fokus entspricht oft einer viel späteren Originalchatnachricht. Ihr präziser Index und ihr Tag stehen pro Szene in `original-eingabe.json`. Beim finalen B-Journal zählt die protokollierte HTTP-429-Ablehnung von Request 118 zur physischen Bilanz. Dieser Versuch hat keine Modellantwort für die bestätigte Fortsetzung geliefert. Das Replay weist ihn als `outsideRevision` aus. Jede Spieler- und jede Antwortnachricht wird auf ihrem **eigenen Originalpräfix** geprüft. Das spielt sämtliche aufgezeichneten physischen P-/X-Antworten einschließlich Repairs auf beide Produkteingänge. ST-spezifische Metadaten, Swipes und frühere Events bleiben erhalten. Fehlende oder zusätzliche Aufrufe werden sichtbar. Der gespeicherte Vergleich umfasst Weltzustand und komplette dedizierte Engineausgabe mit Ereignissen, Ablehnungen, Korrekturen und Extraktionsstatus. Die vom bestehenden Replay normalisierten Zeit-/Versionsdiagnosen zählen nicht als Spielunterschied. Bei der Extraktion ist die aktive, gespeicherte Originalprosa die Eingabe. Eine über mehrere Züge simulierte freie Modellerzählung entsteht ausschließlich in den neuen Spielserien.

Das optionale vierte Ausgabeziel enthält P-/X-Requestarrays. Mit `tokenizers`, `jinja2` und den in `promptkosten.py` geprüften GLM-Tokenizer- und Template-SHA-256 lassen sich deren **lokale** Tokenkosten bestimmen. Die beiden Umgebungsvariablen `AVERETH_GLM_TOKENIZER` und `AVERETH_GLM_TEMPLATE` müssen auf bereits lokal verfügbare Originaldateien verweisen. Es sind `tokenizer.json` und `chat_template.jinja` aus Modellrevision `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`. Jedes Zählskript prüft die Dateihashes. Der Wiederholungslauf verwendete Python 3.12.14, `tokenizers` 0.22.2 und `jinja2` 3.1.6. [Gepinnte Modellrevision](https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c) Die Gleichheit zur tatsächlich gesendeten Nachrichtenliste wird pro Rolle gezählt. Die Gegenrechnung tatsächlicher Providerkosten nutzt dagegen ausschließlich abgeschlossenes Journal und Provider-Usage, einschließlich Reasoning und Cache.

```bash
python "$D/promptkosten.py" /tmp/avereth-promptpaare.json.gz
node "$D/archivreplay.mjs" testrun_10b/openrouter-20261124-trust-b-208 "$A" "$B" /tmp/avereth-prompts-historisch-b.json.gz > /tmp/avereth-replay-historisch-b.json
python "$D/promptkosten.py" /tmp/avereth-prompts-historisch-b.json.gz /tmp/avereth-promptpaare.json.gz > /tmp/avereth-kosten-41.json
cmp "$D/tokenkosten_41_alt.json" /tmp/avereth-kosten-41.json
python "$D/naturkosten.py" testrun_10b/openrouter-20261124-kontinuitaet-a-209/provider-journal.jsonl.gz
cd "$B/avereth-engine"
node --test tests/v4/continuity210*.test.js tests/v4/npc209_reference_recall.test.js
npm test
npm run replay:check
npm run smoke:st:isolated
```

Für die Zahlentabelle mit **41** historischen Zügen sind beide historischen Promptdateien nötig (20 B plus 21 C). `promptkosten.py` nimmt beide Dateien in einem Aufruf entgegen. Sie dürfen nicht durch die 17 neuen A-Züge oder durch die Pilotzüge ersetzt werden. [Historische Paarergebnisse](tokenkosten_41_alt.json)

Die Node-Suite und Replays können ohne Provider ausgeführt werden. Der isolierte ST-Smoke kann beim ersten Einrichten ST und Browserabhängigkeiten herunterladen. Für vollständig netzlosen Betrieb muss die markierte Sandbox bereits vorbereitet sein. Der Mock-Provider benötigt keinen Schlüssel. [ST-Smoke-Anleitung am geprüften Codestand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc/avereth-engine/docs/ST_SMOKE_ISOLATED.md)

Für zwei sichere Wiederholungen des natürlichen Vergleichs sind frische, getrennte ST-Datenwurzeln nötig. Die im Test verwendete ST-Version ist 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Die preis- und abschlussgesicherte gemeinsame Steuerung, die aktiven Revisionen und die lokalen Browserzeitpunkte sind im [Naturtestprotokoll](../kontinuitaet_209_naturtest/VERSUCHSPROTOKOLL.md) und in den einzelnen Laufverzeichnissen nachvollziehbar.
