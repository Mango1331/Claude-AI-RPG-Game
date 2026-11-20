"""Stream and budget classification without a credential, connection or real generation."""
import importlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from decimal import Decimal
from restart_budget import allowance
from test_stream_usage import packet,frame

class Restart(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ,AVERETH_AB_DIR=directory,OPENROUTER_API_KEY="offline"):
            Path(directory,'route.json').write_text(json.dumps({"pricing":{"prompt":"0.000000042","completion":"0.000000184"},"provider_name":"Wafer","canonical_slug":"z-ai/glm-5.3-flash"}))
            cls.proxy=importlib.import_module('proxy')

    def test_raw_and_normalized_stream(self):
        first=packet()
        stop=frame(first)
        usage=frame({**first,"usage":{"cost":0}})
        done=b'data: [DONE]\n\n'
        self.assertTrue(self.proxy.inspect_answer(stop+usage+done,True)["done"])
        extra=frame({**first,"choices":[{"index":0,"delta":{"content":"more"}}]})
        for bad in (stop+usage,done,stop+extra+done,stop+done[:-2],stop+b'event: error\ndata: {}\n\n'+done,
                    stop+b'data:\n\n'+done,stop+b'data: bad-json\n\n'+done,stop+usage+usage+done,stop+done+extra):
            with self.subTest(wire=bad), self.assertRaises(ValueError):
                self.proxy.inspect_answer(bad,True)

    def test_only_reviewed_explicit_rate_rejection_can_resume(self):
        denied=dict(id=31,status=429,reason="upstream_http_error",serviceError={"code":"429"})
        self.assertTrue(self.proxy.reviewed_rejection(denied,[31]))
        self.assertFalse(self.proxy.reviewed_rejection(denied,[]))
        for change in [dict(status=200),dict(reason="ClientConnectionResetError"),dict(serviceError={})]:
            self.assertFalse(self.proxy.reviewed_rejection({**denied,**change},[31]))

    def test_budget(self):
        record=dict(created_at='2026-11-20T00:02:17.700Z',model='z-ai/glm-5.3-flash',streamed=True,
                    provider_name='Wafer',id='gen-1795132937-y4K4TwwYrW4wGZzHAFzA',native_tokens_prompt=14778,cancelled=True,total_cost='0.0006')
        self.assertEqual(self.proxy.LIMIT,51)
        self.assertEqual(allowance(record),Decimal('0.453434876'))
        self.assertEqual(allowance({**record,'total_cost':'0.05'}),Decimal('0.448228732'))
        for bad in ({'cancelled':False},{'created_at':'2026-11-20T00:02:15Z'},{'id':'unrelated'}):
            with self.assertRaises(ValueError):
                allowance({**record,**bad})
