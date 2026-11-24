"""Offline acceptance with synthetic route responses; no HTTP client or model account required."""
import json
import os
from pathlib import Path
import tempfile
import unittest

class TestProviderEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        route={"provider_name":"Relace","tag":"relace/fp4","model_id":"z-ai/glm-5.3-flash",
               "canonical_slug":"z-ai/glm-5.3-flash-20260826","context_length":1048576,"max_completion_tokens":131072,
               "pricing":{"prompt":"0.0000000356","completion":"0.0000000815"}}
        (Path(cls.tmp.name)/'route.json').write_text(json.dumps(route))
        os.environ.update(AVERETH_AB_DIR=cls.tmp.name,OPENROUTER_API_KEY="synthetic-test-token",OPENROUTER_API_BASE_URL="https://openrouter.ai/api/v1",OPENROUTER_MODEL=route["model_id"])
        import transport
        import proxy
        assert transport.ROUTE==proxy.ROUTE==route
        cls.transport=transport
        cls.packet={"id":"gen-test","model":route["canonical_slug"],"provider":"Relace","choices":[{"index":0,"message":{"content":"The road opens."},"finish_reason":"stop"}],"usage":{"prompt_tokens":19,"completion_tokens":4,"cost":0.0000009}}
    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()
    def test_regular_and_stream(self):
        p=self.packet.copy()
        self.assertEqual(self.transport.inspect_answer(json.dumps(p).encode(),False)["text"],"The road opens.")
        first={**p,"choices":[{"index":0,"delta":{"content":"The road opens."},"finish_reason":None}]}
        finish={**p,"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}
        def sse(packets):
            return b''.join(b'data: '+json.dumps(x).encode()+b'\n\n' for x in packets)
        body=sse([first,finish])+b'data: [DONE]\n\n'
        self.assertEqual(self.transport.inspect_answer(body,True)["text"],"The road opens.")
        for bad in [sse([first,finish]),body+sse([first]),b'data: {bad}\n\n'+body,sse([first])+b'event: error\ndata: {}\n\n'+body,sse([{**first,"provider":"Another"}])+body]:
            with self.assertRaises(ValueError): self.transport.inspect_answer(bad,True)
    def test_reservation_and_journal(self):
        import decimal
        t=self.transport
        self.assertEqual(t.reserve_for(4096),decimal.Decimal("0.0376631296"))
        self.assertLess(t.reserve_for(4096),t.CAP)
        self.assertEqual(t.read_history(),(0,decimal.Decimal(0)))
        (t.ROOT/'physical.jsonl').write_text(json.dumps({"kind":"start","id":1})+'\n')
        with self.assertRaises(RuntimeError):t.read_history()
        (t.ROOT/'physical.jsonl').unlink()
if __name__=='__main__':unittest.main()
