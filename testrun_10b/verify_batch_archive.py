#!/usr/bin/env python3
"""Verify archived original file bytes; optionally extract. Python standard library only."""
import argparse
import hashlib
import json
import pathlib
import shutil
import tarfile


def digest(stream):
    h = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=pathlib.Path)
    parser.add_argument('--extract', type=pathlib.Path, help='optional empty destination directory')
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    archive = args.manifest.parent / manifest['archive']['path']
    if archive.stat().st_size != manifest['archive']['size_bytes']:
        raise SystemExit('Archive size mismatch')
    with archive.open('rb') as stream:
        if digest(stream) != manifest['archive']['sha256']:
            raise SystemExit('Archive SHA-256 mismatch')
    expected = {f['path']: f for f in manifest['files']}
    with tarfile.open(archive, 'r:xz') as tar:
        members = tar.getmembers()
        if len(members) != len(expected) or {m.name for m in members} != set(expected):
            raise SystemExit('Archive member list differs from original ZIP manifest')
        for member in members:
            path = pathlib.PurePosixPath(member.name)
            if not member.isfile() or path.is_absolute() or '..' in path.parts:
                raise SystemExit('Unsafe archive entry')
            with tar.extractfile(member) as stream:
                if member.size != expected[member.name]['size_bytes'] or digest(stream) != expected[member.name]['sha256']:
                    raise SystemExit('Original file checksum mismatch: ' + member.name)
        if args.extract:
            root = args.extract.resolve()
            if root.exists() and any(root.iterdir()):
                raise SystemExit('Extraction destination must be empty')
            root.mkdir(parents=True, exist_ok=True)
            for member in members:
                target = root.joinpath(*pathlib.PurePosixPath(member.name).parts)
                if not target.resolve().is_relative_to(root):
                    raise SystemExit('Unsafe extraction path')
                target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as source, target.open('xb') as destination:
                    shutil.copyfileobj(source, destination)
    print(f"OK: {manifest['batch']}; {len(expected)} original files verified")


if __name__ == '__main__':
    main()
