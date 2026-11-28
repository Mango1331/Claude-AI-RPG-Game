"""Verify the archived User18 sources (final campaign state). --restore writes the redacted UTF-16 log to a temp dir.
The private unredacted log hash is provenance only; earlier ST logs are byte prefixes of the private original."""
import gzip, hashlib, json, pathlib, sys, tempfile
root = pathlib.Path(__file__).resolve().parent
manifest = json.loads((root / "source_checksums.json").read_text(encoding="utf-8"))
for f in manifest["files"]:
    data = (root / f["path"]).read_bytes()
    assert len(data) == f["bytes"] and hashlib.sha256(data).hexdigest() == f["sha256"], f["path"]
    raw = gzip.decompress(data)
    assert len(raw) == f["uncompressed_bytes"] and hashlib.sha256(raw).hexdigest() == f["uncompressed_sha256"], f["path"]
    if "original_sha256" in f: assert hashlib.sha256(raw).hexdigest() == f["original_sha256"], f["path"]
    if f["path"].endswith("st-log.txt.gz"):
        assert raw.startswith(b"\xff\xfe")
        if "--restore" in sys.argv:
            dest = pathlib.Path(tempfile.mkdtemp(prefix="avereth-user18-")) / "st-log.txt"
            dest.write_bytes(raw); print("Restored redacted log:", dest)
    print("PASS", f["path"])
