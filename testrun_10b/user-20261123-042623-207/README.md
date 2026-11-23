# User09 – kurzer persönlicher Test auf Avereth .207

**23.11.2026 · `.207` auf `experiment/207-trade-hud` / `609380b3` · neuer Mage Alaric in Ashbridge.** 13 Engineeingaben, 11 Erzählzüge; Ende nach dem ersten Dungeon-Kampf. 

[GPT-Erstreview mit korrigiertem Spielerfeedback](REVIEW.md) · [Messdaten je Zug](MESSWERTE_USER09_207.json) · [Quellenmanifest der drei Originaluploads](SOURCE_MANIFEST.md).

**Wichtige Befunde:** Bei zwei Hindernisfehlschlägen waren 14 und 8 HP korrekt gebucht, aber nicht als eigenständige Schadensmeldung im sichtbaren Engine-Systempanel dargestellt. Ein `attempt` mit `success:false` wurde bei der morschen Brücke als erfüllte `needs`-Bedingung des folgenden GO behandelt, weshalb der Narrator trotz misslungener Überquerung das Weitergehen bis zum Dungeon erzählte und der Extractor es buchte. Nur ein offener PULSE-Wurf; die zweite Brücke ist eine narrative Folgegefahr. 36/36 vollständige physische Requests/Responses. Noch **kein** unabhängiger Codex-Gegenreview oder implementierter Patch.

**Originale sind noch nicht als Git-Blobs archiviert** und werden hier nicht fälschlich als verfügbar verlinkt; ihre Byte-SHAs und Uploadnamen stehen im Manifest. Keine alten Runs geändert.

[Übersicht](../README.md) · [Durchschnittsmessungen](../durchschnittsmessungen/README.md)
