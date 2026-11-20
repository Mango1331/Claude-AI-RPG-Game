"""Verify the preceding stopped attempt before staging a separate fresh journal. No generation."""
from decimal import Decimal
import json
import os
from pathlib import Path
import shutil
import sys
import httpx

def prepare(source, destination):
    rows=[json.loads(line) for line in (source/'physical.jsonl').read_text().splitlines()]
    carry_path=source/'earlier-attempts.json'
    settled=json.loads(carry_path.read_text()) if carry_path.exists() else []
    for start in (r for r in rows if r['kind']=='start'):
        request_id=start['id']
        ends=[r for r in rows if r['kind']=='end' and r.get('id')==request_id]
        if len(ends)!=1:
            raise ValueError("Preceding journal lacks a classification")
        end=ends[0]
        if end['ok'] and (end.get('usage') or {}).get('cost') is not None:
            row={'id':request_id,'attempt':source.name,'total_cost':end['usage']['cost'],'finish':end['finish']}
        else:
            ids={r['generationId'] for r in rows if r['kind']=='generation' and r.get('id')==request_id}
            if len(ids)!=1:
                raise ValueError("No unique provider generation ID")
            gen=ids.pop()
            res=httpx.get('https://openrouter.ai/api/v1/generation',params={'id':gen},
                          headers={'Authorization':'Bearer '+os.environ['OPENROUTER_API_KEY']})
            res.raise_for_status()
            data=res.json()['data']
            if data['id']!=gen or data['provider_name']!='Wafer' or not (data.get('finish_reason') or data.get('cancelled') is True):
                raise ValueError("Provider end unconfirmed")
            row={k:data.get(k) for k in ('id','total_cost','cancelled','finish_reason','native_tokens_prompt','native_tokens_completion')}
        cost=Decimal(str(row['total_cost']))
        if not cost.is_finite() or cost<0:
            raise ValueError("Invalid cost")
        settled.append(row)
    destination.mkdir()
    for name in ('route.json','prior-settlement.json','guild-seed.jsonl','combat-seed.jsonl'):
        shutil.copyfile(source/name,destination/name)
    (destination/'earlier-attempts.json').write_text(json.dumps(settled,indent=2))

if __name__=='__main__':
    prepare(*map(Path,sys.argv[1:]))
