"""Read the ordered mock replies from the archived User16 console log and cross-check its narrator answers."""
import gzip
import json
import re
from pathlib import Path

sources = Path(__file__).resolve().parents[1] / "originals"
chat = [json.loads(line) for line in (sources / "chat.jsonl").read_text(encoding="utf-8").splitlines()][1:]
log = gzip.decompress((sources / "st-log.txt.gz").read_bytes()).decode("utf-16")
blocks = iter(log.split("Chat Completion request:")[1:])

def unquote(text):
    assert text[0] == text[-1] and text[0] in "'\"\x60"
    def escape(match):
        code = match[0][1:]
        if code[0] in "ux":
            return chr(int(code[1:], 16))
        return {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}.get(code, code)
    return re.sub(r"\\(?:u[\da-fA-F]{4}|x[\da-fA-F]{2}|.)", escape, text[1:-1], flags=re.S)

def response_text(response):
    match = re.search(r"^        content: (.+?)\r?\n      \}", response, re.M | re.S)
    if not match:
        match = re.search(r"message: \{ role: 'assistant', content: (.*?) \},", response)
    value = "".join(unquote(part) for part in re.split(r" \+\r?\n\s*", match[1]))
    for encoding in ("cp850", "cp437"):
        try:
            return value.encode(encoding).decode("utf-8")
        except UnicodeError:
            continue
    return value

answers = {}
count = 0
for index, message in enumerate(chat):
    record = message.get("extra", {}).get("avereth", {})
    for role in ("plan", "board", "narration", "extraction"):
        stage = record.get(role)
        if not isinstance(stage, dict):
            continue
        for call in stage.get("llm") or ([{}] if role == "narration" else []):
            request, response = next(blocks).split("Chat Completion response:", 1)
            count += 1
            if role == "narration":
                assert "AVERETH NARRATOR" in request.split("content: ", 1)[1][:40]
                assert response_text(response).strip() == message["mes"].strip(), index
                continue
            assert int(re.search(r"prompt_tokens: (\d+)", response)[1]) == call["prompt"]
            answers.setdefault(index, []).append({"purpose": call["purpose"], "content": response_text(response)})
assert count == 42 and next(blocks, None) is None
print(json.dumps(answers))
