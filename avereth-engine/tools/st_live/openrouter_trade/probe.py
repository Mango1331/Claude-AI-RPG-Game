"""Inspect only the OpenRouter event envelope, through the same journaled physical gate."""
import json
import os
from pathlib import Path
import httpx

root = Path(os.environ["AVERETH_AB_DIR"])
gate = root / "gate.json"

def set_gate(value):
    tmp = gate.with_suffix(".probe")
    tmp.write_text(json.dumps(value))
    tmp.replace(gate)

set_gate({"arm":"A","stage":"stream-envelope","turn":0})
try:
    body={"model":"z-ai/glm-5.3-flash","stream":True,"max_tokens":512,"temperature":0.9,"top_p":0.95,
          "messages":[{"role":"user","content":"Reply with one short sentence about rain."}]}
    frames=[]
    with httpx.stream("POST","http://127.0.0.1:18551/v1/chat/completions",json=body,timeout=180) as res:
        res.raise_for_status()
        for line in res.iter_lines():
            if not line.startswith("data:"): continue
            value=line[5:].strip()
            if value=="[DONE]":
                frames.append({"done":True})
                continue
            item=json.loads(value)
            choices=[{"index":c.get("index"),"delta":{k:len(str(v)) if v is not None else None for k,v in (c.get("delta") or {}).items()},"finish":c.get("finish_reason"),"keys":list(c)} for c in item.get("choices",[])]
            frames.append({"keys":list(item),"choices":choices,"usage":item.get("usage")})
    (root/"stream-envelope.json").write_text(json.dumps(frames,indent=2))
finally:
    set_gate({"arm":None,"stage":"closed","turn":0})
