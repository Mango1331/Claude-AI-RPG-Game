"""For each archived X report with creature.new.across: the place the PC stood (last scene.moved up to that message,
including arrivals in it) and whether the rejection happened outside a dungeon (no dungeon id in the path)."""
import gzip, json, sys, re
from pathlib import Path
root = Path(sys.argv[1]); seen = set(); out = []
for f in sorted(root.rglob('*.jsonl*')):
    if not re.search(r'chat(-\d+)?\.jsonl(\.gz)?$|\.jsonl$', f.name) or 'chat-0' in f.name: continue
    try: raw = gzip.decompress(f.read_bytes()).decode() if f.suffix == '.gz' else f.read_text(encoding='utf-8')
    except Exception: continue
    at = None; dungeons = set()
    for i, line in enumerate(raw.splitlines()[1:]):
        try: m = json.loads(line)
        except Exception: continue
        a = (m.get('extra') or {}).get('avereth') or {}
        for e in a.get('events') or []:
            if e.get('t') == 'campaign.started':
                dungeons |= {p['id'] for p in e['d'].get('places', []) if p.get('dungeon')}
            if e.get('t') == 'scene.moved' and e['d'].get('at'): at = e['d']['at']
        x = (a.get('extraction') or {}).get('raw') or {}
        ds = [d for d in (x.get('deltas') or []) if isinstance(d, dict) and d.get('type') == 'creature.new' and d.get('across')]
        if not ds: continue
        ev = a.get('events') or []
        rej = sum(1 for e in ev if e.get('t') == 'delta.rejected' and e['d'].get('rule') == 'dungeon_sight')
        made = sum(1 for e in ev if e.get('t') == 'entity.created' and (e['d'].get('entity') or {}).get('kind') == 'creature')
        indungeon = any(at and (at == d or at.startswith(d + '.')) for d in dungeons)
        key = (f.parent.name, i, at)
        if key in seen: continue
        seen.add(key)
        out.append((f.parent.name, i, a.get('build'), at, 'dungeon' if indungeon else 'outside', rej, made, ds[0].get('species')))
for r in out: print(*r, sep=' | ')
