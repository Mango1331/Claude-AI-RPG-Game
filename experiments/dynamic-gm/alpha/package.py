"""Reproducible install ZIP; run build.mjs first. No credentials or ST data."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[3]
source=root/'avereth-gm-alpha'
assert json.loads((source/'package.json').read_text())['version']=='4.3.0-gm.alpha.2'
archive=root/'releases/Avereth-GM-Alpha-2.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(source.rglob('*')):
  if p.is_symlink():raise ValueError('Symlink in package')
  if not p.is_file():continue
  i=zipfile.ZipInfo('avereth-gm-alpha/'+p.relative_to(source).as_posix(),(2026,11,16,0,0,0))
  i.create_system=3;i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_DEFLATED
  z.writestr(i,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{sha}  {archive.name}\n')
print(archive.name,archive.stat().st_size,sha)
