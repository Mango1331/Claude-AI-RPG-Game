#!/usr/bin/env python3
"""Dump a testrun chat: per turn player text, planner commands, actions, prose, extractor raw, rejected."""
import gzip, json, sys, os

def load(path):
    with gzip.open(path, 'rt', encoding='utf8') as f:
        return [json.loads(l) for l in f.read().splitlines() if l.strip()]

def main():
    run = sys.argv[1]
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    full = '--full' in sys.argv
    noprose = '--noprose' in sys.argv
    chat = load(os.path.join(run, 'chat.jsonl.gz'))
    for i, m in enumerate(chat[1:], 1):
        if i < start:
            continue
        ex = m.get('extra', {})
        av = ex.get('avereth') or {}
        if m.get('is_user'):
            print(f"\n===== [{i}] USER: {m.get('mes','')[:600]}")
            if av.get('route'): print(f"  route={av.get('route')}")
            interp = av.get('interp') or {}
            if interp:
                print(f"  interp failed={interp.get('failed')} repaired={interp.get('repaired')} source={interp.get('source')}")
                for c in interp.get('commands') or []:
                    print('   CMD', json.dumps(c)[:400])
            plan = av.get('plan') or {}
            if plan:
                for c in (plan.get('llm') or []):
                    print('   PCALL', json.dumps(c)[:200])
            for e in av.get('events') or []:
                if e.get('t') == 'outcome.recorded':
                    o = e['d']['outcome']
                    for a in o.get('actions') or []:
                        print('   ACT', a[:400])
                    for r in o.get('resolutions') or []:
                        print('   RES', json.dumps(r)[:300])
                    if o.get('dropped'): print('   DROPPED', o['dropped'])
            cmd = av.get('command')
            if cmd and cmd.get('panels'):
                for p in cmd['panels']: print('   PANEL', p[:400].replace('\n', ' | '))
        else:
            if not av:
                if ex.get('avereth_panel'): print(f"  [{i}] panel msg: {m.get('mes','')[:300]}")
                continue
            mes = m.get('mes', '')
            if not noprose:
                print(f"--- [{i}] NARRATOR ({len(mes)} chars): {mes if full else mes[:1500]}")
            x = av.get('extraction') or {}
            print(f"  extraction status={x.get('status')} repaired={x.get('repaired')} deltas={x.get('deltas')} missing={x.get('missing')} error={x.get('error')}")
            for c in x.get('llm') or []:
                print('   XCALL', json.dumps(c)[:200])
            raw = x.get('raw')
            if raw:
                print('   X.scene', raw.get('scene'))
                print('   X.expected', json.dumps(raw.get('expected'))[:1200])
                for d in raw.get('deltas') or []:
                    print('   X.delta', json.dumps(d)[:500])
            for r in av.get('rejected') or []:
                print('   REJ', json.dumps(r)[:500])
            for c in av.get('corrections') or []:
                print('   CORR', c[:300])
            for s in av.get('system') or []:
                print('   SYS', str(s)[:300])

if __name__ == '__main__':
    main()
