"""Export a side-by-side evidence table for controlled original-prefix turns, retaining distinct physical items."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

root=Path(sys.argv[1])
def read(path):
    return json.loads(path.read_bytes())
def jsonlines(path):
    return [json.loads(line) for line in gzip.decompress(path.read_bytes()).splitlines()]
cases=['bren','wagen','wren','gruene-tuer','tasche','namenswissen']
data={}
for case in cases:
    folder=root/case
    meta=read(folder/'original-eingabe.json')
    scene={'source':meta,'arms':{}}
    for a in ('A','B'):
        d=folder/a
        if not (d/'messwerte.json').is_file():continue
        stats=read(d/'messwerte.json')
        original=jsonlines(d/'original-chat.jsonl.gz')
        world_records=jsonlines(d/'reload-welten.jsonl.gz')
        prefix,after=[x['state'] for x in world_records]
        player,reply=original[-2:]
        assert player['mes']==meta['text'] and player['is_user']
        engine=reply.get('extra',{}).get('avereth',{})
        result=engine.get('extraction',{}).get('raw',{})
        previous=prefix.get('objects',{});objects=after.get('objects',{})
        objects_snapshot={}
        for obj_id in sorted(previous.keys()|objects.keys()):
            pre=previous.get(obj_id,{});post=objects.get(obj_id,{})
            watched=case in ('wren','tasche') and ('bag' in obj_id or 'satchel' in obj_id)
            if watched or pre!=post:
                objects_snapshot[obj_id]={'name':post.get('name',pre.get('name')),'before':pre.get('holder'),'after':post.get('holder'),'new':obj_id not in previous}
        pe=player['extra'].get('avereth',{})
        marks=read(d/'browserzeiten.json')[0]['timing']['marks']
        events=pe.get('events',[])+engine.get('events',[])
        total_types={}
        for event in events:total_types[event['t']]=total_types.get(event['t'],0)+1
        scene['arms'][a]={
            'head':stats['candidate'],'terminal':'local-system' if reply.get('is_system') else 'narrator-world-save','start_world':read(d/'konfiguration.json')['initial']['world'],
            'reported_planner_commands':pe.get('interp',{}).get('commands'),
            'resolved_player_acts':pe.get('ir',{}).get('acts'),
            'from':prefix['scene']['at'],'to':after['scene']['at'],'previous_presence':prefix['scene']['present'],
            'present_after':after['scene']['present'],'raw_expected':result.get('expected'),
            'arrival_reports':[x for x in result.get('deltas',[]) if x.get('type')=='arrive'],
            'object_reports':[x for x in result.get('deltas',[]) if x.get('type','').startswith('object.')],
            'booked_moves':[x.get('d',{}) for x in events if x['t']=='scene.moved'],
            'object_holder_diff':objects_snapshot,
            'pc_coins':[prefix['entities']['pc']['sheet']['coin_cp'],after['entities']['pc']['sheet']['coin_cp']],
            'events':total_types,'rejected':engine.get('rejected',[]),'narration':reply['mes'],
            'provider_request_roles':stats['physical_roles'],'repairs':stats['repeat_role_requests'],'reported_cost':stats['provider_cost_usd'],
            'input':stats['provider_input'],'output':stats['provider_output'],'reasoning':stats['provider_reasoning'],'cache':stats['provider_cache'],
            'first_sentence_ms':round(marks['firstProse']-marks['click']) if marks.get('firstProse') is not None else None,
            'ready_ms':round(marks['ready']-marks['click']) if marks.get('ready') is not None else None,
            'reload':stats['all_reloads_match']}
    if len(scene['arms'])==2:assert scene['arms']['A']['start_world']==scene['arms']['B']['start_world']
    data[case]=scene
(root/'fokuskennzahlen.json.gz').write_bytes(gzip.compress((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode(),mtime=0))

files=[root/'fokuskennzahlen.json.gz']
for case in cases:
    base=root/case
    source=read(base/'original-eingabe.json')
    assert hashlib.sha256(gzip.decompress((base/'original-start.jsonl.gz').read_bytes())).hexdigest()==source['prefix_sha256']
    files.extend([base/'original-start.jsonl.gz',base/'original-eingabe.json'])
    files.extend(p for p in (base/'A/SOURCE_MANIFEST.md',base/'B/SOURCE_MANIFEST.md') if p.is_file())
manifest=['# Quellenmanifest für die gepaarten Originalpräfixe','',
          'SHA-256 über die veröffentlichten Dateibytes. Jeder Unterordner enthält den vollständigen Chatpräfix und den tatsächlichen Spielertext. Das Manifest jeder Armhälfte prüft Request-/Antwortjournal, die gespeicherten Chats, Events, Weltstände und Zeiten.','',
          '| Datei | Bytes | SHA-256 |','|---|---:|---|']
for f in sorted(files):
    data=f.read_bytes()
    manifest.append(f"| `{f.relative_to(root)}` | {len(data)} | `{hashlib.sha256(data).hexdigest()}` |")
(root/'SOURCE_MANIFEST.md').write_text('\n'.join(manifest)+'\n')
