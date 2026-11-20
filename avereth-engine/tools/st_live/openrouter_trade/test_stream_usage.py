import copy
import json
import unittest
from stream_usage import UsageFrames

def frame(p):
    return b"data: "+json.dumps(p).encode()+b"\n\n"

def packet():
    return {"id":"gen-x","model":"z-ai/glm-5.3-flash","provider":"Wafer","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":"stop","native_finish_reason":"stop"}]}

class StreamUsageTests(unittest.TestCase):
    def test_usage_and_done(self):
        first=packet()
        last={**first,"usage":{"cost":0.01}}
        wire=frame(first)+frame(last)+b"data: [DONE]\n\n"
        adapter=UsageFrames()
        out=b"".join(piece for b in wire for piece in adapter.feed(bytes([b])))
        self.assertEqual(out,frame(first)+frame({**last,"choices":[]})+b"data: [DONE]\n\n")
        self.assertEqual(adapter.normalized,1)

    def test_wafer_null_reasoning_on_first_stop(self):
        first=packet()
        first["choices"][0]["delta"]["reasoning"]=None
        usage={**packet(),"usage":{"cost":0.01}}
        self.assertEqual(b"".join(UsageFrames().feed(frame(first)+frame(usage))),frame(first)+frame({**usage,"choices":[]}))

    def test_first_stop_can_carry_text(self):
        first=packet()
        first["choices"][0]["delta"]["content"]="last word"
        usage={**packet(),"usage":{"cost":0.01}}
        wire=frame(first)+frame(usage)
        self.assertEqual(b"".join(UsageFrames().feed(wire)),frame(first)+frame({**usage,"choices":[]}))

    def test_keep_anomalies(self):
        first=packet()
        for mutation in [lambda p:p.update(error="bad"),lambda p:p.update(id="other"),lambda p:p.update(provider="other"),
                         lambda p:p["choices"][0]["delta"].update(content="more"),lambda p:p["choices"][0]["delta"].update(reasoning="more"),
                         lambda p:p["choices"][0].update(finish_reason="length"),lambda p:p.pop("usage"),lambda p:p["choices"].append({})]:
            last=copy.deepcopy(first)
            last["usage"]={"cost":0}
            mutation(last)
            wire=frame(first)+frame(last)+b"data: invalid\n\n"
            adapter=UsageFrames()
            self.assertEqual(b"".join(adapter.feed(wire)),wire)
            self.assertEqual(adapter.normalized,0)

if __name__=="__main__":
    unittest.main()
