# Avereth Engine – historisches Brancharchiv und Sicherungsregel

**Historischer Stand 22.10.2026; nicht der heutige Branchstatus.** Aktuelle Versionsstände in [03](03_AKTUELLER_PROJEKTSTAND.md). [Vollständige alte Bewertung mit 18-Branch-Inventar, Git-Vorfahren und allen 13 redundanten Branch-HEADs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) bleibt in der Git-Historie erhalten.

## Ergebnis der damaligen Prüfung

Damals gab es main, einen aktiven Entwicklungsbranch und 16 alte Branches. **13** waren im damaligen Entwicklungs-HEAD [ef4a819](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ef4a819d5b1be76b4229745268172d0da5ce5dd5) vollständig enthalten, also historisch redundant. **Drei** besaßen eigenständige Commits und mussten vor jeder eventuellen Branch-Ref-Löschung unabhängig gesichert werden:

| Historischer Sonderbranch | HEAD und Inhalt | Damalige Einordnung |
|---|---|---|
| chatgpt/narrator-gm-tools-2026-10-02 | [717e2f7](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/717e2f7a12c5d2d11963aa7cc50a497ca6bad751), 30 eigene Commits | Architektur-B-/GM-Tools-Versuche und Forschung zu Architektur C. **Nicht** als Narrator-Function-Calling-System mergen; C bleibt Produktpfad. |
| claude/c-planner-prototype-2026-10-02-gpt-no-temperament | [4e84f5e](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4e84f5e4285c9036e1da2ade2b4e91266becf4cc), vier eigene Commits | Kausalere Kampfentscheidungen ohne harte Temperamentvorschriften. **Kein** pauschaler Ersatz der Engine oder Monsterprofile. |
| Testrun-v1 | [06b5357](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/06b53578e6bd9548540704e858b03a96d5acf102), ein eigener Commit | Alte SillyTavern-Logs und Testartefakte; als Codepfad überholt, als Rohquelle möglich. |

**Sicherheit:** Ein URL-Verweis auf einen Commit oder diese Markdown-Datei sichert einen nur über einen abweichenden Branch erreichbaren Git-Commit **nicht dauerhaft**. Vor der Löschung eines der drei Zweige dessen aktuelles HEAD erneut verifizieren, einen dauerhaft erreichbaren Tag/Ref darauf anlegen und die Remote-Erreichbarkeit prüfen. Die vorgeschlagenen damaligen Archivtags stehen im [vollständigen Original](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md). Kein Löschvorgang wird durch dieses Dokument ausgelöst oder behauptet.

## Nicht erneut beginnen

- Kein Zurückwechseln von C auf Narrator-als-GM-Function-Tools; nur bei eigenständig belegtem Nutzen und explizitem Neuauftrag.
- Keine autonome Temperament-/Chase-/Monster-KI-Architektur nur aufgrund dieser historischen Experimente.
- Keine alten Branch-Entscheidungen in [02](02_DESIGN_KANON.md) übernehmen, wenn sie nicht längst Bestandteil des aktuellen Kanons oder der Engine sind.
- Die 13 seinerzeit redundant geprüften Branches sind in der [alten Tabelle](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md#3-die-13-vollständig-übernommenen-und-als-branch-redundanten-stände) mit sämtlichen SHAs dokumentiert; **vor tatsächlicher Aufräumarbeit aktuelle Branchliste und Vorfahrrelation neu prüfen**.

**Jetzt vorrangig:** technische GLM-/Runner-Stabilität und F→E-Scaling gemäß [03](03_AKTUELLER_PROJEKTSTAND.md). Diese Datei ist nur ein historischer Sicherheitsvermerk.
