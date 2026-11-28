"""Verify archived User17 sources; --restore writes the redacted log to a temp directory.
The private unredacted log's hash in source_checksums.json is provenance only."""
import gzip
import hashlib
import json
import pathlib
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parent
manifest = json.loads((root / "source_checksums.json").read_text(encoding="utf-8"))
for f in manifest["files"]:
    data = (root / f["path"]).read_bytes()
    if f.get("verify") is False:
        print("UNVERIFIED (see note)", f["path"])
        continue
    assert len(data) == f["bytes"], f["path"]
    assert hashlib.sha256(data).hexdigest() == f["sha256"], f["path"]
    if "uncompressed_sha256" in f:
        raw = gzip.decompress(data)
        assert len(raw) == f["uncompressed_bytes"], f["path"]
        assert hashlib.sha256(raw).hexdigest() == f["uncompressed_sha256"], f["path"]
        assert raw.startswith(b"\xff\xfe")
        if "--restore" in sys.argv:
            dest = pathlib.Path(tempfile.mkdtemp(prefix="avereth-user17-")) / "st-log.txt"
            dest.write_bytes(raw)
            print("Restored redacted log:", dest)
    print("PASS", f["path"])
