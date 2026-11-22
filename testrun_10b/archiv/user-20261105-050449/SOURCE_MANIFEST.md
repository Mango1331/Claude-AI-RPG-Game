# Quellenmanifest – persönlicher User-Testrun 02 (.157)

**05.11.2026.** Natürlicher GLM-5.3-Flash-SillyTavern-Lauf. Die drei ursprünglichen Chat-/Event-/Feedback-Uploads und die nachgereichten Sol-Zwischennotizen sind **bytegenau auf main archiviert**; ihre Git-Blob-SHAs wurden direkt mit den Originalbytes verglichen. **Alle fünf** ursprünglichen Dateien einschließlich des großen Serverlogs sind außerdem in einem separat bereitgestellten ZIP zum Weitergeben an Sol enthalten. Dieser ZIP-Download befindet sich im begleitenden Chat, nicht im Git-Repository.

| Originaldatei | Bytes | SHA-256 | Archiv |
|---|---:|---|---|
| Avereth Engine Test v4 - 2026-11-05@05h04m49s246ms(1).jsonl | 1.036.402 | 4979fc7ee99a452fcdc9717092620253658fa429c310ac55bca516eb8d09e0da | [originals/chat.jsonl](originals/chat.jsonl) |
| avereth-events-Avereth Engine Test v4 - 2026-11-05@05h04m49s246ms(1).json | 354.145 | b513cdd647f013cb33df318cee3a6b6caee8c6993c1cf8e42f4802df0f700459 | [originals/events.json](originals/events.json) |
| user Feedback als 3 euinzelne Nachr(2).txt | 3.681 | 554e5e33ca073a53ce40e64b92de1e1c6d8527fd9f540882b585c55db5ba898a | [originals/user_feedback.txt](originals/user_feedback.txt) |
| Chatgpt Feedback(20261105-074659).md (unfertige Sol-Arbeitsnotizen) | 2.686 | a31188c02b0721b86b827f11904d00cf9016c094380f4d630f284948200204f2 | [originals/SOL_THINKING_NOTES.md](originals/SOL_THINKING_NOTES.md) |
| ST_2026-11-05_05-04-34(1).txt (UTF-16LE mit BOM) | 14.118.044 | 0be5ff18c075233a3d1c699fd175e2ee83ff34718ebfbb5bbb64959fc54aca6d | **Nicht auf Git**; Original im Userupload / vollständigem ZIP; [Audit](HOST_LOG_AUDIT.md) |

**Vollständiges ZIP im Chat:** `Avereth_User_Testrun_02_Originale_inkl_Serverlog.zip` (2.982.811 Bytes, SHA-256 `5f207608cdaa91980ce2a81a7313837be661b2c173656168ae18f8199042f081`; ZIP-Test mit sechs Einträgen erfolgreich). Bewusst **keinen** 14-MB-UTF-16-Serverlog als lose Git-Datei aufnehmen. Bei Sols erneutem Requestvergleich ist der vollständige ursprüngliche Log zu verwenden, keine aus einer Zusammenfassung neu erfundenen Prompts.

**Indexregel:** Eventexport `i` bezieht sich auf sichtbare Chatmessages ab I0, nicht auf die vorangestellte JSONL-Metadatenzeile. 69/69 Eventgruppen matchen byteunabhängig strukturell exakt zu den entsprechenden eingebetteten Chatevents.
