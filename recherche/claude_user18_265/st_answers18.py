"""User18: map the 37 physical ST-log answers to chat messages (chat index without header).
Order per turn in the log: plan [board..], narration, extraction [repair]. Party helper decisions at #party messages.
M30 repeats the stored M29 record (same input hash, no new request). Checks prompt tokens and narration text."""
import json, re, sys
from pathlib import Path
chat = [json.loads(l) for l in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()][1:]
log = Path(sys.argv[2]).read_bytes().decode("utf-16")
blocks = [b.split("Chat Completion response:", 1) for b in log.split("Chat Completion request:")[1:]]
def unquote(t):
    def esc(m):
        c = m[0][1:]
        if c[0] in "ux": return chr(int(c[1:], 16))
        return {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}.get(c, c)
    return re.sub(r"\\(?:u[\da-fA-F]{4}|x[\da-fA-F]{2}|.)", esc, t[1:-1], flags=re.S)
def text(r):
    m = re.search(r"^        content: (.+?)\r?\n      \}", r, re.M | re.S) or re.search(r"message: \{ role: 'assistant', content: (.*?) \},", r)
    v = "".join(unquote(p) for p in re.split(r" \+\r?\n\s*", m[1]))
    for enc in ("cp850", "cp437"):
        try: return v.encode(enc).decode("utf-8")
        except UnicodeError: pass
    return v
it = iter(blocks); answers = {}; n = 0; seen = set()
for i, m in enumerate(chat):
    rec = m.get("extra", {}).get("avereth", {}) or {}
    key = json.dumps(rec.get("plan", {}).get("llm")) if m["is_user"] else None
    if m["is_user"] and i == 30: continue                      # duplicate stored record of M29
    order = []
    for role in ("plan", "board"):
        for c in (rec.get(role) or {}).get("llm") or []: order.append((role, c))
    if m["mes"].startswith("#party invite"): order.append(("party_decision", {}))
    if not m["is_user"] and isinstance(rec.get("narration"), dict): order.append(("narration", {}))
    for c in (rec.get("extraction") or {}).get("llm") or []: order.append(("extraction", c))
    for role, c in order:
        req, resp = next(it); n += 1
        t = text(resp)
        if role == "narration": assert t.strip() == m["mes"].strip(), i; continue
        if c.get("prompt"): assert int(re.search(r"prompt_tokens: (\d+)", resp)[1]) == c["prompt"], (i, role)
        answers.setdefault(i, []).append({"purpose": c.get("purpose") or role, "content": t})
assert next(it, None) is None
print(json.dumps({"answers": answers, "physical": n}))
