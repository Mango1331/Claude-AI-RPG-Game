"""Local wire-format checks for the completion gate. No network or real credential."""
import json
import os
import unittest
from unittest.mock import patch

with patch.dict(os.environ, FEATHERLESS_API_KEY="unused-local-test", AVERETH_AB_DIR="/tmp"):
    from proxy import MODEL, inspect_answer


def packet(chunk):
    return b"data: "+json.dumps(chunk).encode()+b"\r\n\r\n"


PART=packet({"model":MODEL,"choices":[{"index":0,"delta":{"content":"Rain."}}]})
END=packet({"model":MODEL,"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]})
DONE=b"data: [DONE]\r\n\r\n"


class CompletionTests(unittest.TestCase):
    def test_regular_buffered_and_streamed(self):
        buffered={"model":MODEL,"choices":[{"message":{"content":"Rain."},"finish_reason":"stop"}]}
        for body,stream in [(json.dumps(buffered).encode(),False),(PART+END+DONE,True)]:
            self.assertEqual(inspect_answer(body,stream)["text"],"Rain.")

    def test_incomplete_and_error_packets(self):
        for body in (PART,PART+END,PART+DONE, PART+packet({"error":{"message":"failed"}})+DONE,
                     PART+b"data: {broken\n\n"+END+DONE,PART+END+DONE+PART):
            with self.subTest(body=body), self.assertRaises(ValueError):
                inspect_answer(body,True)

    def test_other_model(self):
        with self.assertRaises(ValueError):
            inspect_answer(PART.replace(MODEL.encode(),b"another-model")+END+DONE,True)


if __name__=="__main__":
    unittest.main()
