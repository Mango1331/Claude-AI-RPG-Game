"""Verify User14 sources and restore the complete redacted UTF-16 ST log."""
import hashlib
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parent / "originals"
sources = {
    "chat.jsonl": (400798, "7f927dbcb5a77b5dd8970f1934beb4be8fadcb84cc38d5444db49c27a1713f22"),
    "avereth-events.json": (139489, "1f62c25248efc780c8ecd46b92902d7d5917b9c54f16e92e08eea56690b16107"),
    "feedback.txt": (1144, "2d27de3fcec65f091ae3951dc5086c8e3c0e444579280f8e1ac1a61f714f8da6"),
}
for name, (size, digest) in sources.items():
    data = (root / name).read_bytes()
    if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"Invalid source: {name}")
parts = [
    "609a602110527c5116615cf9a2e12e763afcd305",
    "789d9565c5ca2bd9da5579f9dda7020e0d132e52",
    "be51c0e911c13e93bc645af6c93da7942c04919f",
    "ee41c6333e93dea0ffa83065b542ad47bda6b714",
    "f1447a972c06a43079db61a0ab5f54148dd1849b",
    "af03329930c14cb40729cbdc60d2f6e4862ac81a",
    "192ad706fee0130c3b088a269fc386a0bc67eda0",
    "4ce7b3f1bac3d47fe5a0ff026f8aae3608ad6dbb",
    "75dd30c5c5b07e33fe5dd9db1d128a97b124eed1",
    "95bc27227a78850f1cf8e7bdcbf702662ae2569f",
    "71fb5d14b8f8d954f210b8540262dc3fe0e1c6f8",
    "724eb073d639e572a7d36ff91a1078b6ea260673",
]
chunks = []
for i, expected in enumerate(parts, 1):
    data = (root / "st-log-parts" / f"{i:02d}.bin").read_bytes()
    digest = hashlib.sha1(f"blob {len(data)}".encode() + b"\0" + data).hexdigest()
    if digest != expected or len(data) != (400000 if i < 12 else 195776):
        raise ValueError(f"Invalid log part {i}")
    chunks.append(data)
log = b"".join(chunks)
if len(log) != 4595776 or hashlib.sha256(log).hexdigest() != "00fe6ff4e04c7f06895a33453a9615c5b7efa7f10a76c0c116f438f217fdaed1":
    raise ValueError("Invalid reassembled log")
dest = Path(tempfile.mkdtemp(prefix="avereth-user14-")) / "ST_2026-11-26_01-03-11.txt"
dest.write_bytes(log)
print(f"All four sources verified. Restored log: {dest}")
