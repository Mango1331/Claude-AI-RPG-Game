"""Verify archived User16 sources; --restore writes redacted log to a temp directory."""
import hashlib
import gzip
import json
import pathlib
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parent
manifest = json.loads((root / "source_checksums.json").read_text(encoding="utf-8"))
for f in manifest["files"]:
    data = (root / f["path"]).read_bytes()
    assert len(data) == f["bytes"], f["path"]
    assert hashlib.sha256(data).hexdigest() == f["sha256"], f["path"]
    if "uncompressed_sha256" in f:
        raw = gzip.decompress(data)
        assert len(raw) == f["uncompressed_bytes"], f["path"]
        assert hashlib.sha256(raw).hexdigest() == f["uncompressed_sha256"], f["path"]
        assert raw.startswith(b"\xff\xfe")
        if "--restore" in sys.argv:
            dest = pathlib.Path(tempfile.mkdtemp(prefix="avereth-user16-")) / "st-log.txt"
            dest.write_bytes(raw)
            print("Restored redacted log:", dest)
    print("PASS", f["path"])
print("The private unredacted log's hash is provenance only.")
