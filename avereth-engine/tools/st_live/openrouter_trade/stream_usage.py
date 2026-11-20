"""Relay SSE. Normalize only the verified empty repeated primary stop in a final usage packet."""
import json
import re

DELIMITER = re.compile(br"\r\n\r\n|\n\n|\r\r")


class UsageFrames:
    def __init__(self):
        self.pending = b""
        self.last_stop = None
        self.normalized = 0

    def feed(self, chunk):
        self.pending += chunk
        while match := DELIMITER.search(self.pending):
            frame, separator = self.pending[:match.start()], match.group()
            self.pending = self.pending[match.end():]
            yield self.normalize(frame) + separator

    def normalize(self, frame):
        # Never discard a malformed frame, an error, an event type or new choice data.
        if not frame.startswith(b"data:") or b"\n" in frame or b"\r" in frame:
            self.last_stop = None
            return frame
        try:
            packet = json.loads(frame[5:])
        except (ValueError, UnicodeError):
            self.last_stop = None
            return frame
        choices = packet.get("choices") if isinstance(packet,dict) else None
        if not isinstance(choices,list) or len(choices)!=1 or not isinstance(choices[0],dict):
            self.last_stop = None
            return frame
        choice = choices[0]
        terminal = (
            "error" not in packet and choice.get("index")==0 and choice.get("finish_reason")=="stop"
            and choice.get("native_finish_reason")=="stop"
            and set(choice)=={"index","delta","finish_reason","native_finish_reason"}
            and isinstance(choice["delta"], dict)
            and all(packet.get(k) for k in ("id","model","provider"))
        )
        identity = (packet.get("id"),packet.get("model"),packet.get("provider"))
        empty_usage = terminal and choice["delta"] in ({"role":"assistant","content":""}, {"content":""}, {})
        if empty_usage and isinstance(packet.get("usage"),dict) and identity == self.last_stop:
            self.normalized += 1
            packet["choices"] = []
            self.last_stop = None
            return b"data: " + json.dumps(packet,ensure_ascii=False).encode()
        self.last_stop = identity if terminal and packet.get("usage") is None else None
        return frame
