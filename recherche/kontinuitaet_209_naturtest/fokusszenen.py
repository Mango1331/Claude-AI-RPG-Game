"""Prepare independent original-prefix ST hosts. No HTTP calls, and no model answers in the played slot."""
import gzip
import json
import os
from pathlib import Path
import sys
from hashlib import sha256
import subprocess

root=Path(sys.argv[1]).resolve()
repo=Path(__file__).resolve().parents[2]
main_export=root/'tools'/'export_run.py'
baseline_export=subprocess.check_output(['git','-C',str(repo),'show','a277663a334f1bb501aeb79859aff4bffdb25e9d:recherche/user11_natural_tools/export_run.py'],text=True).replace("('B','C')","('A','B')")
s=baseline_export.replace("src=root/arm","offset=int(os.environ.get('FOCUS_OFFSET','0'))\nsrc=Path(os.environ.get('FOCUS_ROOT',root))/arm")
s=s.replace("if r.get('arm')==arm]","if r.get('arm')==arm and offset<r.get('turn',0)<=offset+22]")
s=s.replace("if e['turn']==i", "if e['turn']==offset+i")
# Preserve global physical IDs and the unmodified global turn tag in each subjournal.
protected="""    receipt=root/'B/raw-118.json.gz'
    if receipt.is_file():
        account=json.loads(gzip.decompress(receipt.read_bytes())).get('user_id','')
        if account: data=data.replace(account.encode(),b'<account-redacted>')
    return data"""
s=s.replace('    return data',protected,1)
main_export.write_text(s)
scenes=[
 ('bren','user-20261124-014928-208/originals/chat.jsonl',17,100,
  "Help the injured Bren with the part just agreed and the cart, including the nearby cottage if reached on that stretch. No new destination or whole-day escort."),
 ('wagen','openrouter-20261124-trust-b-208/original-chat.jsonl.gz',33,200,
  "Rest in the mill yard, then accompany Tam and the loaded cart down to Ashbridge when loading is finished. No separate destination or trade."),
 ('wren','openrouter-20261124-trust-c-208/original-chat.jsonl.gz',45,300,
  "Join Wren and the Halloran family in the house and hand back her carried medicine bag at Tam's bedside. No new care decision, payment or ownership of the bag."),
 ('gruene-tuer','openrouter-20261124-kontinuitaet-a-209/original-chat.jsonl.gz',27,400,
  "Reach the green door and ask to speak to Wren on Tam's behalf."),
 ('tasche','openrouter-20261124-trust-c-208/original-chat.jsonl.gz',41,500,
  "Take Wren's bag, agree to speak honestly, and travel with her to the Hallorans by a passable route, staying together."),
 ('namenswissen','openrouter-20261124-kontinuitaet-a-209/original-chat.jsonl.gz',43,600,
  "Decline a fee or formal thanks and ask Dann about the condition of the animals. Hear him out before deciding where to go.")]
def subst(txt,old,new):
    assert txt.count(old)==1,old
    return txt.replace(old,new)
for num,(key,rel,idx,offset,intent) in enumerate(scenes):
    group=root/'focus'/key
    for arm in ('A','B'):(group/arm).mkdir(exist_ok=True,parents=True)
    source=repo/'testrun_10b'/rel
    if key in ('gruene-tuer','namenswissen') and not source.is_file():source=root/'A/chat.jsonl'
    data=source.read_bytes()
    if source.suffix=='.gz':data=gzip.decompress(data)
    header,*messages=data.splitlines(keepends=True)
    player=json.loads(messages[idx]);assert player['is_user']
    prefix=header+b''.join(messages[:idx])
    saved=group/'start.jsonl'
    if saved.exists():
        frozen=saved.read_bytes()
        assert [json.loads(line) for line in frozen.splitlines()[1:]]==[json.loads(line) for line in prefix.splitlines()[1:]]
        prefix=frozen
    else:
        saved.write_bytes(prefix)
    (group/'original-eingabe.json').write_text(json.dumps({'archive':rel,'messageIndex':idx,'prefix_sha256':sha256(prefix).hexdigest(),'text':player['mes'],'intent':intent,'physical_turn_tag':offset+1},indent=2))
    s=(root/'tools/player.mjs').read_text()
    s=subst(s,'root=path.join(shared,arm)','root=path.join(shared,"focus",'+repr(key)+',arm)')
    s=subst(s,"path.join(shared,'start.jsonl')","path.join(shared,'focus',"+repr(key)+",'start.jsonl')")
    s=subst(s,"18641:18642",f"{18741+num*10}:{18742+num*10}")
    s=subst(s,"gate({arm,turn:n})",f"gate({{arm,turn:{offset}+n}})")
    s=subst(s,'e.turn!==n','e.turn!=='+str(offset)+'+n')
    s=subst(s,'n<22','n<1')
    s=subst(s,'writeConfig(inst,port);', '''writeConfig(inst,port);
if(process.env.ST_COMPILED_CACHE){
    const cache=path.resolve(process.env.ST_COMPILED_CACHE);
    assert.equal(path.basename(cache),'_webpack');
    fs.cpSync(cache,path.join(inst.data,'_webpack'),{recursive:true});
}''')
    # Failing boot / closing an idle focused host cannot close an active main host's gate.
    s=subst(s,"gate=v=>write(path.join(shared,'gate.json'),v);","gate=v=>{const f=path.join(shared,'gate.json');if(!v.arm && JSON.parse(fs.readFileSync(f)).turn!=="+str(offset+1)+")return;write(f,v);};")
    (group/'player.mjs').write_text(s)
