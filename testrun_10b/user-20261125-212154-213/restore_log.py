"""Restore and verify User13's archived sources, without modifying the repository."""
import hashlib
from pathlib import Path
import tempfile

root = Path(__file__).resolve().parent / "originals"
sources = {
    "chat.jsonl": (359367, "fb43b0468c72d9028289dcda806968079bda35d0978afa2d17b5ff5afb3346e3"),
    "avereth-events.json": (144766, "351f99c534db6e1b6f0264bb4ff963abbaaeb85e2ee5ce4ef8dd8737421d801e"),
    "feedback.txt": (341, "3c707ed9d987b94d721a5f4f548359e6ec122bad8b25a0419f0f389fd60df0bd"),
}
for name, (size, digest) in sources.items():
    data = (root / name).read_bytes()
    if len(data) != size or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"Invalid source: {name}")
parts = [
    "2f81d186647a466e27091e69014eb2abb9325ba9",
    "3d1ba13fb6ce34fb9ac79fbb01f692898dece088",
    "111fb50a84f7b8646e018a666f44b7c97bf9423d",
    "b6fca360a45fb34d96069e1aff0482e01c8030dd",
    "bb71bea17d3970c7e5a3017ebf8bccc5c025a6b0",
    "e4d444189e70a3e1dedab6bec9a1a8fa5089fdc4",
    "684a2dbba3eefdeee830650d9cb8459359a5a154",
    "241cdf7ac2ce776c7f97967176480a924fec4bd6",
    "2b4921b3fb4d7126c6e1e6dfa9f4c9127dd2f063",
]
chunks = []
for i, expected in enumerate(parts, 1):
    data = (root / "st-log-parts" / f"{i:02d}.bin").read_bytes()
    digest = hashlib.sha1(f"blob {len(data)}".encode() + b"\0" + data).hexdigest()
    if digest != expected or len(data) != (400000 if i < 9 else 8730):
        raise ValueError(f"Invalid log part {i}")
    chunks.append(data)
log = b"".join(chunks)
if len(log) != 3208730 or hashlib.sha256(log).hexdigest() != "2e738bdd11dd0c2c30cec90d060ad207e2fa29be5b2f2c220d75791376799caf":
    raise ValueError("Invalid reassembled log")
dest = Path(tempfile.mkdtemp(prefix="avereth-user13-")) / "ST_2026-11-25_21-06-33.txt"
dest.write_bytes(log)
print(f"All four sources verified. Restored log: {dest}")
