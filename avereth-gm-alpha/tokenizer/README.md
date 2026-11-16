# Local GLM tokenizer (Alpha 2)

Offline assets, no downloads at runtime, no provider tokenization request.

- Model: zai-org/GLM-5.3-Flash, Hugging Face revision `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.
- `tokenizer.json` and `chat_template.jinja`: unmodified official files, model card license MIT: https://huggingface.co/zai-org/GLM-5.3-Flash/tree/46a050bec13002ad29ee795c16e61cf4fa3c4a9c . Attribution: Z.ai / zai-org.
- `web-tokenizers.js`: @mlc-ai/web-tokenizers **0.1.6**, Apache-2.0, https://github.com/mlc-ai/tokenizers-cpp/tree/main/web . Bundled upstream UMD/WASM; only global export renamed from `tokenizers` to `averethGLMTokenizers` to avoid host collisions; line endings normalized and trailing whitespace removed. Copyright/licensing notices in bundle retained. The older ST @agnai 0.1.3 cannot read the original current tokenizer serialization.
- `budget.js` implements only the official template's system/user string path, Low, no native tools; other message forms are rejected. 107 independent Python-HF/Jinja reference vectors test the template and WASM counts, including German, CJK, emoji, combining characters, special tokens and random JSON-like text.

These counts describe the pinned local model template, not Featherless telemetry. Alpha reserves 4096 output tokens (including reasoning) and an additional 512 tokens for possible serving differences inside 32768. A different remote tokenizer/template can still differ. An over-budget request is stopped; memory is not cut. Assets must be served by ST; no separate browser installation is needed.
