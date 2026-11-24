"""Materialise the pinned ST player and global OpenRouter gate in a fresh disposable study directory."""
from pathlib import Path
from hashlib import sha256
import gzip, json, subprocess, sys

doc = Path(__file__).resolve().parents[2]
root = Path(sys.argv[1]).resolve()
root.mkdir(parents=True,exist_ok=True)
assert not (root/'physical.jsonl').exists() and not (root/'historical-go').exists()
A='82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc'
B='c2ddc780d4c57b219f9cd7a1d134efceca7e459d'
source='28f0af45f937d5b7622e7d94f17f96bbb50aa1e0'
arms=['HA','HB','GA','GB','PA','PB','RA','RB','XA','XB','YA','YB','K1','K2','K3','K4','QE']
def get(p):return subprocess.check_output(['git','-C',str(doc),'show',source+':'+p])
def template(f):return get('recherche/user11_natural_tools/'+f).decode()
def save(p,content):p.write_text(content)
def patch(s,a,b):
    assert s.count(a)==1,a
    return s.replace(a,b)
tools=root/'tools';tools.mkdir(exist_ok=True)
ports={19441+i:v for i,v in enumerate(arms)}
for arm in arms:(root/arm).mkdir(exist_ok=True)
for name,file,lines,expected in [
 ('halloran','testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz',20,'81111f6f1d3ebc38e8a710b384dd57bb3d230ac7e1586a2255249b8864901ce1'),
 ('alderwatch','testrun_10b/user-20261124-014928-208/originals/chat.jsonl',12,'33c35de7372522761c0911b7625688e0aa38a6cba8c0bef15a3f64c3c95d7e17')]:
    raw=get(file);raw=gzip.decompress(raw) if file.endswith('.gz') else raw
    prefix=b''.join(raw.splitlines(keepends=True)[:lines]);assert sha256(prefix).hexdigest()==expected
    (root/(name+'.jsonl')).write_bytes(prefix)
s=template('transport.py')
s=patch(s,'220, Decimal("1.50")','1600, Decimal("5.00")')
s=patch(s,'{18551: "B", 18552: "C"}',repr(ports))
s=patch(s,'result.update(status=upstream.status_code,headersAt=clock())','result.update(status=upstream.status_code,headersAt=clock(),retryAfter=upstream.headers.get("retry-after"))')
save(tools/'transport.py',s)
s=template('player.mjs')
s=patch(s,"['B','C'].includes(arm)",json.dumps(arms)+'.includes(arm)')
s=patch(s,"'cb1eb944a041b26be9210199d780be9ff740f74d'",repr(A))
s=patch(s,"assert.equal(git(eng,'rev-parse',head+'^'),baseline);","git(eng,'merge-base','--is-ancestor',baseline,head);")
s=patch(s,"path.join(process.env.AVERETH_MAIN,'testrun_10b/user-20261123-042623-207/originals/chat.jsonl')","process.env.ST_START")
s=patch(s,".slice(1,6).map(JSON.parse)",".slice(1).map(JSON.parse)")
s=patch(s,"arm==='B'?18541:18542, proxyPort=arm==='B'?18551:18552",json.dumps(dict((a,19421+i) for i,a in enumerate(arms)))+"[arm], proxyPort="+json.dumps(dict((a,k) for k,a in ports.items()))+"[arm]")
s=patch(s,"const boot=await start('boot');","if(process.env.ST_COMPILED_CACHE)fs.cpSync(process.env.ST_COMPILED_CACHE,path.join(inst.data,'_webpack'),{recursive:true});\nconst boot=await start('boot');")
s=patch(s,"assert(runtimeFiles.length>0,'Expected an independently modified playable engine');","runtimeFiles.push('index.js','src/host.js','src/v4/world.js','src/v4/firewall.js');")
s=patch(s,'n<25','n<100')
s=patch(s,'back:n===0?4:0','back:n===0?1:0')
s=patch(s,"save('visible.json',{messages:v.messages,hud:v.hud,controls,toasts:v.toasts});","const view={messages:v.messages,hud:v.hud,controls,toasts:v.toasts};save('visible.json',view);save('visible-'+n+'.json',view);")
s=patch(s,"fs.copyFileSync(actual,file('chat.jsonl'));","fs.copyFileSync(actual,file('chat.jsonl'));fs.copyFileSync(actual,file('chat-'+n+'.jsonl'));")
s=patch(s,"before.errors,[]","before.errors,[]");s=s.replace("const ev=ch.map", "assert.deepEqual(before.failures||[],[]);const ev=ch.map")
save(tools/'player.mjs',s)
revision=(Path(__file__).parent/'revisionen.mjs').read_text().rstrip()+'\n'
marker="            assert(!blocked && cmd.op==='play'"
save(tools/'clone-player.mjs',patch(s,marker,revision+marker))
for fname in ('export_run.py','action.py'):
    save(tools/fname,template(fname).replace("('B','C')",repr(tuple(arms))))
save(tools/'test_transport.py',template('test_transport.py'))
save(root/'gate.json','{"arm":null}')
e=json.loads(Path(sys.argv[2]).read_bytes())['data']
route=next(x for x in e['endpoints'] if x['tag']=='relace/fp4')
assert route['status']==0 and {'temperature','top_p','max_tokens','reasoning'}.issubset(route['supported_parameters'])
route.update(model_id=e['id'],canonical_slug=sys.argv[3])
assert route['canonical_slug'].startswith(e['id']+'-')
save(root/'route.json',json.dumps(route,indent=2))
