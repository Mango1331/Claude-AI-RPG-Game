"""Ordered mock replies from the User17 ST console log (UTF-16), cross-checked against the chat.
Usage: python3 -I st_answers.py chat.jsonl st-log.txt  -> JSON {msgIndex: [{purpose, content}]}"""
import json, re, sys
from pathlib import Path
chat = [json.loads(l) for l in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()][1:]
log = Path(sys.argv[2]).read_bytes().decode("utf-16")
blocks = iter(log.split("Chat Completion request:")[1:])
def unquote(text):
    assert text[0] == text[-1] and text[0] in "'\"\x60"
    def esc(m):
        c = m[0][1:]
        if c[0] in "ux": return chr(int(c[1:], 16))
        return {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}.get(c, c)
    return re.sub(r"\\(?:u[\da-fA-F]{4}|x[\da-fA-F]{2}|.)", esc, text[1:-1], flags=re.S)
def response_text(r):
    m = re.search(r"^        content: (.+?)\r?\n      \}", r, re.M | re.S) or re.search(r"message: \{ role: 'assistant', content: (.*?) \},", r)
    v = "".join(unquote(p) for p in re.split(r" \+\r?\n\s*", m[1]))
    for enc in ("cp850", "cp437"):
        try: return v.encode(enc).decode("utf-8")
        except UnicodeError: continue
    return v
answers, count, narr_ok = {}, 0, 0
for i, msg in enumerate(chat):
    rec = msg.get("extra", {}).get("avereth", {})
    for role in ("plan", "board", "narration", "extraction"):
        st = rec.get(role)
        if not isinstance(st, dict): continue
        for call in st.get("llm") or ([{}] if role == "narration" else []):
            req, resp = next(blocks).split("Chat Completion response:", 1)
            count += 1
            if role == "narration":
                assert response_text(resp).strip() == msg["mes"].strip(), i
                narr_ok += 1
                continue
            assert int(re.search(r"prompt_tokens: (\d+)", resp)[1]) == call["prompt"], (i, role)
            answers.setdefault(i, []).append({"purpose": call["purpose"], "content": response_text(resp)})
rest = sum(1 for _ in blocks)
print(json.dumps({"answers": answers, "physical": count, "narration_matched": narr_ok, "unconsumed": rest}))
