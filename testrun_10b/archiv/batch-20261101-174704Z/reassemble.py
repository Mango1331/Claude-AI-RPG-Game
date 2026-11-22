"""Reassemble and verify the byte-identical uploaded Batch 22 ZIP; no extraction."""
import hashlib
import json
from pathlib import Path
import zipfile


def main():
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))
    archive = manifest["archive"]
    output = root / archive["name"]
    parts = []
    for part in archive["parts"]:
        path = root / part["path"]
        data = path.read_bytes()
        if len(data) != part["bytes"] or hashlib.sha256(data).hexdigest() != part["sha256"]:
            raise SystemExit(f"Invalid or incomplete archive part: {path.name}")
        parts.append(path)
    digest = hashlib.sha256()
    size = 0
    with output.open("xb") as target:
        for path in parts:
            with path.open("rb") as source:
                for data in iter(lambda: source.read(1024 * 1024), b""):
                    target.write(data)
                    digest.update(data)
                    size += len(data)
    if size != archive["bytes"] or digest.hexdigest() != archive["sha256"]:
        raise SystemExit(f"Archive verification failed: {output}")
    with zipfile.ZipFile(output) as original:
        failed = original.testzip()
        if failed is not None:
            raise SystemExit(f"ZIP CRC failed: {failed}")
    print(f"Verified: {output.name}, {size} bytes, SHA-256 {digest.hexdigest()}")


if __name__ == "__main__":
    main()
