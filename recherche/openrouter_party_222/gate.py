"""Single shared physical ledger. No completion retry after ambiguous delivery."""
import asyncio,fcntl,gzip,json,os,time,sys
from decimal import Decimal as D
from pathlib import Path
from email.utils import parsedate_to_datetime
from aiohttp import web
import httpx
root=Path(__file__).resolve().parent
base='https://openrouter.ai/api/v1'
model=os.environ.get('TEST_MODEL','z-ai/glm-5.3-flash')
assert model in ('z-ai/glm-5.3-flash','openai/gpt-4.1-mini')
secondary=model=='openai/gpt-4.1-mini'
provider='openai' if secondary else 'wafer/us'
key=os.environ['OPENROUTER_API_KEY']
route=next(e for e in json.loads((root/('secondary.json' if secondary else 'endpoints.json')).read_text())['data']['endpoints'] if e['tag']==provider)
prices={'prompt':D('0.000000045'),'completion':D('0.00000019')}
if secondary:prices={'prompt':D('0.0000004'),'completion':D('0.0000016')}
assert route['status']==0 and all(D(route['pricing'][k])<=v for k,v in prices.items())
assert set(route['pricing'])<={'discount','prompt','completion','input_cache_read','web_search'} and D(route['pricing']['input_cache_read'])<=prices['prompt']
lock=(root/'lock').open('a');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
serial=asyncio.Lock()
ledger=root/'physical.jsonl'
def record(e):
 e['at']=int(time.time()*1000)
 s=json.dumps(e,ensure_ascii=False);assert key not in s
 with ledger.open('a') as f:f.write(s+'\n');f.flush();os.fsync(f.fileno())
def balance():
 events=[json.loads(l) for l in ledger.open()] if ledger.exists() else []
 starts=[e['id'] for e in events if e['kind']=='start'];ends=[e for e in events if e['kind']=='end']
 if starts!=[e['id'] for e in ends] or any(e['cost'] is None for e in ends):raise RuntimeError('unsettled physical request')
 return len(starts),sum((D(str(e['cost'])) for e in ends),D(0))
def role(data):
 s=data['messages'][0]['content']
 return next((r for w,r in [('You are the intent planner','planner'),('You are the command interpreter','planner'),('You write the official contracts','board'),('You read one reply','extractor'),('You design','forge')] if s.startswith(w)),'narrator')
async def models(req):return web.json_response({'data':[{'id':model,'object':'model'}]})
async def chat(req):
 data=await req.json()
 async with serial:
  gate=json.loads((root/'gate.json').read_text())
  if not gate.get('arm') or data.get('model')!=model or data.get('n',1)!=1:raise web.HTTPConflict()
  if any(k in data for k in ('tools','plugins','web_search_options','modalities','audio','images')) or any(not isinstance(m.get('content'),str) for m in data['messages']):raise web.HTTPBadRequest(text='text only')
  maximum=data.get('max_tokens')
  if not isinstance(maximum,int) or not 0<maximum<=route['max_completion_tokens']:raise web.HTTPBadRequest()
  # Full provider context as input plus entire requested output, even if caches were cold.
  reserve=D(route['context_length'])*prices['prompt']+D(maximum)*prices['completion']
  data.pop('clear_thinking',None);data.pop('reasoning_effort',None)
  data.update(provider={'only':[provider],'allow_fallbacks':False,'max_price':{**{k:float(v*1000000) for k,v in prices.items()},'request':0,'image':0}})
  if secondary:data.pop('reasoning',None)
  else:data['reasoning']={'effort':'low'}
  if data.get('stream'):data['stream_options']={'include_usage':True}
  async with httpx.AsyncClient(timeout=240,follow_redirects=False) as client:
   for attempt in range(4):
    try:n,spent=balance()
    except RuntimeError:raise web.HTTPConflict(text='Cost reconciliation required')
    if spent+reserve>D('1.95'):raise web.HTTPConflict(text='Series budget reserve reached')
    tag={'arm':gate['arm'],'turn':gate['turn'],'id':n+1,'role':role(data)}
    record(dict(kind='start',**tag,reserveUSD=str(reserve),body=data,attempt=attempt))
    start=time.monotonic()
    try:r=await client.post(base+'/chat/completions',json=data,headers={'Authorization':'Bearer '+key})
    except httpx.HTTPError as ex:
     record(dict(kind='end',**tag,ok=False,cost=None,why=type(ex).__name__));raise web.HTTPBadGateway(text='Remote status unknown')
    raw=r.content;assert key.encode() not in raw
    name=f"{gate['arm']}/raw-{n+1}.gz";(root/name).write_bytes(gzip.compress(raw,mtime=0))
    frames=[json.loads(l[6:]) for l in r.text.splitlines() if l.startswith('data: ') and l[6:].strip()!='[DONE]'] if data.get('stream') and r.is_success else [r.json()]
    usage=next((f['usage'] for f in reversed(frames) if f.get('usage')),{});cost=usage.get('cost')
    gid=next((f['id'] for f in frames if f.get('id')),'')
    if gid and cost is None:
     for wait in [2,5,10]:
      await asyncio.sleep(wait);q=await client.get(base+'/generation',params={'id':gid},headers={'Authorization':'Bearer '+key})
      if q.is_success:
       cost=q.json()['data'].get('total_cost')
       if cost is not None:break
    # Only explicit pre-generation refusal without a generation id. Unknown errors remain locked.
    retry=not gid and r.status_code in (429,503) and frames[0].get('error') and cost is None
    if retry:cost=0
    record(dict(kind='end',**tag,ok=r.is_success and cost is not None,cost=cost,usage=usage,status=r.status_code,generationId=gid,elapsedMs=round((time.monotonic()-start)*1000),rawFile=name,retryAfter=r.headers.get('retry-after')))
    if retry and attempt<3:
     v=r.headers.get('retry-after') or '0'
     try:delay=float(v)
     except ValueError:delay=parsedate_to_datetime(v).timestamp()-time.time()
     await asyncio.sleep(max(delay,10*2**attempt));continue
    if cost is None:raise web.HTTPBadGateway(text='Cost unknown')
    return web.Response(status=r.status_code,body=raw,content_type='text/event-stream' if r.is_success and data.get('stream') else 'application/json')
app=web.Application(client_max_size=16*1024**2);app.router.add_get('/v1/models',models);app.router.add_post('/v1/chat/completions',chat)
web.run_app(app,host='127.0.0.1',port=18551,access_log=None)
