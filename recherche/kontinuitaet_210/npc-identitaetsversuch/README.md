# NPC-Identität beim Wiedersehen am Halloran-Hof

In Zug 8 erzeugte der natürliche Extractor die Bäuerin als `npc.marta_halloran` und ihren Sohn als `npc.tam`. In Zug 9 meldete er **vor Alarics Ortswechsel** für Marta, Tam und Dann jeweils `leave`. Diese Meldungen entfernen die drei aus der Anwesenheitsliste. Beim späteren Aufbruch kann die Engine für sie keinen letzten Standort mehr aus der bisherigen Szene übernehmen. Eine erhaltene Erinnerung an die Begegnung im Halloran-Haus belegt weiterhin, wo Alaric sie gesehen hatte. In Zug 20 zeigt die Prosa dieselbe Mutter mit der Decke an der Tür. Der Extractor verwendet diesmal `person.new`, den Namen „Marta“, die Rolle „farmer“ und die neue Referenz `npc.marta`. In Zug 21 hustet Tam hörbar und die Heilerin spricht ihn an. Im gespeicherten Extractorbericht fehlen sowohl ein Tam-`enter` als auch ein Tam-Eintrag unter `expected.go.met`. [Originale und Quellenmanifest](../../../testrun_10b/openrouter-20261124-trust-c-208/SOURCE_MANIFEST.md)

## Vergleich am Archivpräfix

Alle 21 Zellen verwenden den realen Weltverarbeiter von `.209` beim Eingang von Antwort T20. Die erste Zeile verwendet die unveränderte Prosa und die archivierte Extraktion. Die übrigen sechs Zeilen sind kontrollierte Varianten, die jeweils eine Identitätseigenschaft des Originals verändern. Sie dienen zur Prüfung der Regeln. Sie bilden weder sechs weitere natürliche Modellantworten noch sechs vollständige Spielzüge ab. Ausgangscommit ist `a854cd6759712571f078bff52e7fe439858b8454`. [Codebasis](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/a854cd6759712571f078bff52e7fe439858b8454)

| Fall | Bestehende Regel | Symmetrisch ablehnen¹ | Nach Ort und Rolle wiederverwenden² |
|---|---|---|---|
| T20 unverändert, bereits bekannte Marta | zweite Marta | Marta fehlt, gemeinsame Erinnerung verworfen | bewahrt erste Marta samt Erinnerung |
| Don bei bekannter Donna Bell | neuer Don | neuer Don | neuer Don |
| Marta bei bekannter Marta Halloran in einer anderen Stadt | neue Person möglich | gesperrt | neue Person möglich |
| Zwei bekannte Personen namens Marta mit verschiedenen Nachnamen | neue Person möglich, Ausgabe bleibt unaufgelöst | gesperrt | neue Person möglich, Ausgabe bleibt unaufgelöst |
| Marta Voss bei bekannter Marta Halloran | neue Person möglich | neue Person möglich | neue Person möglich |
| Eigenständige Marta ausdrücklich mit `distinct_from` gekennzeichnet | neue Person | neue Person | neue Person |
| Eigenständige gleichnamige Bäuerin am Hof, Prosa nennt Verwandtschaft, X lässt `distinct_from` leer | eigene Person | gesperrt | irrtümlich mit alter Marta verschmolzen |

¹ Die vorhandene Abwehr einer unkontrollierten Namensverlängerung wurde testweise auf verkürzte Namen gespiegelt. Don/Donna teilen kein ganzes Namenswort. ² Die Wiederverwendung erfordert einen einzigen Kandidaten mit passendem erstem Namenswort, gleicher gespeicherter Rolle und demselben eingegrenzten Ort oder eine dort gemeinsam mit dem PC belegte Begegnung im Haus bzw. seinem unmittelbaren übergeordneten Anwesen. Eine ausdrückliche Unterscheidung hat Vorrang. [Symmetrischer Versuch](symmetrisch.patch) · [Orts- und Rollenversuch](ort_rolle.patch)

**Beide Regeln erhalten ein NO-GO.** Bei der strengen Ablehnung verlieren Marta und Wren ihre gemeinsame gespeicherte Rückkehrerinnerung in T20. Die natürliche Aussage über den vor elf Jahren verstorbenen Vater wird in allen drei Armen durch dieselbe eigene Kampf-Faktenregel zurückgewiesen. Der Orts-/Rollenversuch löst T20, kann aber eine neu hinzukommende gleichnamige Person ihrer eigenen Erinnerungen und Identität berauben. Das Merkmal „einzige bisher *gespeicherte* Marta“ liefert dafür keine ausreichende Gewissheit. [Alle 21 Einzelresultate](ergebnis.json)

## Bezug zum Kontextversuch

Die Referenz A liefert beim Aufbau des Extractorrequests für T20 in der Liste abwesender bekannter Personen keinen Eintrag. Der Kontextkandidat liefert die vorhandenen IDs von Tam und Marta mit historischer Ortsangabe. In T21 führt der Kandidat Tam in der begrenzten Dreierliste. Bei unveränderten historischen Antworten bleibt das gebuchte Ergebnis in A und B identisch. Mit dem **kontrolliert geänderten** Bericht `enter npc.marta_halloran` samt tatsächlich erzählter Ankunft erhalten beide Arme die ursprüngliche Person. Ein ausdrücklich gemeldetes `enter npc.tam` mit dem wörtlichen Hustenbeleg reicht in T21 für die gespeicherte Anwesenheit. Die Reaktion eines neu generierenden Extractors bleibt gesondert zu beurteilen.

Über alle 21 rekonstruierten ersten Extractoraufträge des natürlichen C-Runs änderte sich der Katalogumfang achtmal. Mit dem gepinnten lokalen GLM-Tokenizer ergaben sich insgesamt **728 zusätzliche Nutzertokens** für den Katalog und **105 zusätzliche Systemtokens** für den präzisierten bestehenden NPC-Satz. T20 benötigt im Katalog 1.639 statt 1.522 Inhaltstokens, T21 1.813 statt 1.852. Dies misst geänderte **Promptinhalte**, separat für System- und Nutzernachricht, ohne Generation, Chattemplate, Cache, Repair oder Laufzeitmessung.

## Reproduktion

Die beiden Änderungen unten sind inaktive Versuchspatches für temporäre Checkouts. `MAIN` bezeichnet den Dokumentationscheckout mit dem archivierten Run und dieser Datei. `LAB` ist ein neues lokales Arbeitsverzeichnis. Der komprimierte Originalchat hat SHA-256 `3c7102630087199eb568e6a8f510f46f067d370c86855ef3d43a25f5b6058cc0`.

```sh
MAIN="$(git rev-parse --show-toplevel)"
LAB="$(mktemp -d)"
BASE=a854cd6759712571f078bff52e7fe439858b8454
FOLDER="$MAIN/recherche/kontinuitaet_210/npc-identitaetsversuch"
git -C "$MAIN" worktree add --detach "$LAB/base" "$BASE"
git -C "$MAIN" worktree add --detach "$LAB/strict" "$BASE"
git -C "$MAIN" worktree add --detach "$LAB/local" "$BASE"
git -C "$LAB/strict" apply "$FOLDER/symmetrisch.patch"
git -C "$LAB/local" apply "$FOLDER/ort_rolle.patch"
node "$FOLDER/vergleich.mjs" "$MAIN" "$LAB/base" "$LAB/strict" "$LAB/local" > "$LAB/ergebnis.json"
cmp "$FOLDER/ergebnis.json" "$LAB/ergebnis.json"
```

Die lokale Tokenmessung verwendet den isolierten NPC-Laufzeitdiff in `recall.patch`. Der Laborbezeichner `5e87779df0a0e7510a6ccc7c56581c74e5f1730c` dokumentiert seine Herkunft. Die Reproduktion benötigt ausschließlich den veröffentlichten .209-Commit und den mit diesem Bericht archivierten Patch. Verwende für den Katalog Python mit `tokenizers`, für die Narratorauswertung zusätzlich `jinja2`. Die beiden lokal bereitzustellenden Modellartefakte und ihre Revision sind in der [übergreifenden Anleitung](../REPRODUKTION.md) angegeben. Der Zähler prüft deren SHA-256. Die Pipeline liest ausschließlich gespeicherte Antworten, stellt für jede Revision den passenden Anfangszustand wieder her und gibt die Zahlen komponentenweise aus. `catalog` ist in `user` bereits enthalten. [Promptrekonstruktion](katalog.mjs) · [Zähler](tokens.py) · [Ergebnis](katalogtokens.json)

```sh
git -C "$MAIN" worktree add --detach "$LAB/npc" "$BASE"
git -C "$LAB/npc" apply "$FOLDER/recall.patch"
node "$FOLDER/katalog.mjs" "$MAIN" "$LAB/base" "$LAB/npc" | python "$FOLDER/tokens.py" "$AVERETH_GLM_TOKENIZER" > "$LAB/katalogtokens.json"
cmp "$FOLDER/katalogtokens.json" "$LAB/katalogtokens.json"
```

## Wirkung auf den Narrator

Die Referenzprojektion des Engine-Blocks unmittelbar vor jeder Antwort stimmt in **21/21 Fällen bytegenau** mit dem Systemblock im physischen ST-Narratorrequest überein. Jede archivierte Nachrichtenfolge enthält genau einen solchen Block. Für die Gegenprobe wurden Charakter, aktive Lore, Verlauf, übrige Systemmeldungen und deren Reihenfolge beibehalten. Die Projektion des NPC-Kandidaten ändert sieben Blöcke. In T12 und T16 kommt die historische Referenz auf Tam hinzu, in T14 verschiebt sie sich innerhalb der Liste. In T17–19 wird Marta Halloran genannt. In T21 erhält Tam den Listenplatz, den zuvor Pell belegte. Der Textvergleich der sieben Blöcke zeigt keine Verdrängung einer anderen Kontextkategorie.

Mit dem gepinnten GLM-Chattemplate und Tokenizer steigt der Gesamtinput der **vollständigen** 21 offline gerenderten Nachrichtenarrays von **249.323 auf 249.708 Tokens** (+385, rund +0,15 %). Die Kandidatenarrays beschreiben denselben gespeicherten Verlauf; natürliche Antworten auf diese Narratorvarianten und reale Providerkosten sind daraus nicht ableitbar. [Einzelergebnisse mit Hashes](narratortokens.json) · [Engineprojektion](narrator.mjs) · [Zähler](narratortokens.py)

```sh
node "$FOLDER/narrator.mjs" "$MAIN" "$LAB/base" "$LAB/npc" | python "$FOLDER/narratortokens.py" "$AVERETH_GLM_TOKENIZER" "$AVERETH_GLM_TEMPLATE" > "$LAB/narratortokens.json"
cmp "$FOLDER/narratortokens.json" "$LAB/narratortokens.json"
```
