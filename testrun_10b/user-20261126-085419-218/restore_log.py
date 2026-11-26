"""Verify all four archived sources and optionally restore the redacted ST log outside the repo."""
import hashlib, gzip, json, pathlib, tempfile, sys
root=pathlib.Path(__file__).resolve().parent
for row in json.loads((root/'source_checksums.json').read_text(encoding='utf-8')):
    path=root/row['stored_path']; stored=path.read_bytes()
    assert hashlib.sha256(stored).hexdigest()==row['stored_sha256'], path
    raw=gzip.decompress(stored) if path.suffix=='.gz' else stored
    assert len(raw)==row['decoded_bytes'] and hashlib.sha256(raw).hexdigest()==row['decoded_sha256'], path
    print('PASS', row['stored_path'])
    if path.suffix=='.gz' and '--restore' in sys.argv:
        out=pathlib.Path(tempfile.mkdtemp(prefix='avereth-user15-'))/'ST_2026-11-26_08-53-39.redacted.txt'
        out.write_bytes(raw); print('Restored:',out)
